import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/backup/emergency-restore/route';
import { GET } from '@/app/api/backup/status/route';

// Mock dependencies
vi.mock('@supabase/auth-helpers-nextjs');
vi.mock('@/lib/ratelimit');
vi.mock('@/lib/backup/backup-engine');

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(() => ({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: {
            id: 'test-user-id',
            role: 'admin',
            emergency_restore_authorized: true,
          },
          error: null,
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'recovery-operation-id' },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: { id: 'updated-id' },
          error: null,
        })),
      })),
    })),
  })),
  rpc: vi.fn(() => ({
    data: {
      total_backups: 10,
      successful_backups: 9,
      failed_backups: 1,
      total_data_backed_up_gb: 5.2,
      last_successful_backup: '2025-01-22T10:00:00Z',
      upcoming_weddings_protected: 3,
    },
    error: null,
  })),
};

const mockRateLimit = {
  limit: vi.fn(() => Promise.resolve({ success: true })),
};

// Mock modules
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabaseClient,
}));

vi.mock('@/lib/ratelimit', () => ({
  ratelimit: mockRateLimit,
}));

describe('Backup API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/backup/emergency-restore', () => {
    const validRequestBody = {
      backupId: '123e4567-e89b-12d3-a456-426614174000',
      recoveryScope: 'wedding-only' as const,
      weddingIds: ['wedding-123'],
      confirmationToken: 'valid-confirmation-token-12345',
    };

    function createMockRequest(body: any): NextRequest {
      return new NextRequest(
        'http://localhost:3000/api/backup/emergency-restore',
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    it('should successfully initiate emergency restore with valid data', async () => {
      // Mock backup snapshot exists
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'snapshot-id',
            backup_job_id: validRequestBody.backupId,
            validation_status: 'valid',
            wedding_count: 1,
            guest_count: 50,
            photo_count: 100,
            timeline_event_count: 20,
            backup_jobs: { id: validRequestBody.backupId },
          },
          error: null,
        });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.operationId).toBeDefined();
      expect(responseData.message).toContain(
        'Emergency restore completed successfully',
      );
      expect(responseData.restoredData).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      mockSupabaseClient.auth.getUser.mockReturnValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toContain('Authentication required');
    });

    it('should reject request from unauthorized user', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          // User profile lookup
          data: {
            id: 'test-user-id',
            role: 'user', // Not admin
            emergency_restore_authorized: false, // Not authorized
          },
          error: null,
        });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toContain('Insufficient permissions');
    });

    it('should validate request schema', async () => {
      const invalidRequest = {
        backupId: 'invalid-uuid',
        recoveryScope: 'invalid-scope',
        weddingIds: ['not-a-uuid'],
        confirmationToken: 'short', // Too short
      };

      const request = createMockRequest(invalidRequest);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request data');
      expect(responseData.details).toBeDefined();
    });

    it('should enforce rate limiting', async () => {
      mockRateLimit.limit.mockResolvedValueOnce({ success: false });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.error).toContain('Rate limit exceeded');
    });

    it('should handle corrupted backup gracefully', async () => {
      // Mock corrupted backup snapshot
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'snapshot-id',
            backup_job_id: validRequestBody.backupId,
            validation_status: 'corrupted', // Corrupted backup
            backup_jobs: { id: validRequestBody.backupId },
          },
          error: null,
        });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain(
        'Cannot restore from corrupted backup',
      );
    });

    it('should handle missing backup snapshot', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: null,
          error: new Error('Snapshot not found'),
        });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toContain('Backup snapshot not found');
    });

    it('should handle selective restore correctly', async () => {
      const selectiveRequest = {
        ...validRequestBody,
        recoveryScope: 'selective' as const,
        dataTypes: ['guests', 'timeline'],
      };

      // Mock backup snapshot
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'snapshot-id',
            backup_job_id: selectiveRequest.backupId,
            validation_status: 'valid',
            backup_jobs: { id: selectiveRequest.backupId },
          },
          error: null,
        });

      const request = createMockRequest(selectiveRequest);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('Selective restore completed');
    });

    it('should handle complete system restore', async () => {
      const completeRequest = {
        ...validRequestBody,
        recoveryScope: 'complete' as const,
      };

      // Mock backup snapshot
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'snapshot-id',
            backup_job_id: completeRequest.backupId,
            validation_status: 'valid',
            wedding_count: 5,
            guest_count: 250,
            photo_count: 500,
            timeline_event_count: 100,
            backup_jobs: { id: completeRequest.backupId },
          },
          error: null,
        });

      const request = createMockRequest(completeRequest);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain(
        'Complete system restore completed',
      );
      expect(responseData.restoredData.weddings).toBe(5);
    });

    it('should create pre-restore snapshot', async () => {
      // Mock backup snapshot
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'snapshot-id',
            backup_job_id: validRequestBody.backupId,
            validation_status: 'valid',
            backup_jobs: { id: validRequestBody.backupId },
          },
          error: null,
        });

      const request = createMockRequest(validRequestBody);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.preRestoreSnapshotId).toBeDefined();
    });

    it('should log recovery operations for audit', async () => {
      // Mock backup snapshot
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'snapshot-id',
            backup_job_id: validRequestBody.backupId,
            validation_status: 'valid',
            backup_jobs: { id: validRequestBody.backupId },
          },
          error: null,
        });

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const request = createMockRequest(validRequestBody);
      await POST(request);

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_type: 'selective-restore',
          initiated_by: 'test-user-id',
          status: 'in-progress',
        }),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('GET /api/backup/status', () => {
    function createMockGetRequest(): NextRequest {
      return new NextRequest('http://localhost:3000/api/backup/status', {
        method: 'GET',
      });
    }

    it('should return backup system status successfully', async () => {
      // Mock backup jobs
      mockSupabaseClient
        .from()
        .select()
        .order()
        .limit.mockReturnValueOnce({
          data: [
            {
              id: 'job-1',
              job_type: 'full',
              status: 'completed',
              created_at: '2025-01-22T10:00:00Z',
              backup_snapshots: [],
            },
            {
              id: 'job-2',
              job_type: 'incremental',
              status: 'failed',
              created_at: '2025-01-22T09:00:00Z',
              backup_snapshots: [],
            },
          ],
          error: null,
        });

      // Mock active recovery operations
      mockSupabaseClient
        .from()
        .select()
        .in()
        .order.mockReturnValueOnce({
          data: [
            {
              id: 'recovery-1',
              operation_type: 'emergency-restore',
              status: 'in-progress',
              started_at: '2025-01-22T11:00:00Z',
            },
          ],
          error: null,
        });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.recentBackups).toHaveLength(2);
      expect(responseData.data.systemStats).toBeDefined();
      expect(responseData.data.activeRecoveries).toHaveLength(1);
      expect(responseData.data.systemHealth).toBeDefined();
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockReturnValueOnce({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Authentication required');
    });

    it('should calculate system health correctly', async () => {
      // Mock mostly successful backup jobs
      mockSupabaseClient
        .from()
        .select()
        .order()
        .limit.mockReturnValueOnce({
          data: [
            { id: 'job-1', status: 'completed' },
            { id: 'job-2', status: 'completed' },
            { id: 'job-3', status: 'completed' },
            { id: 'job-4', status: 'completed' },
            { id: 'job-5', status: 'failed' },
          ],
          error: null,
        });

      // Mock system stats with recent successful backup
      mockSupabaseClient.rpc.mockReturnValueOnce({
        data: {
          total_backups: 100,
          successful_backups: 95,
          failed_backups: 5,
          total_data_backed_up_gb: 50.5,
          last_successful_backup: new Date(
            Date.now() - 2 * 60 * 60 * 1000,
          ).toISOString(), // 2 hours ago
          upcoming_weddings_protected: 5,
        },
        error: null,
      });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.systemHealth.status).toBe('good'); // 80% success rate
      expect(responseData.data.systemHealth.successRate).toBe(80);
      expect(responseData.data.systemHealth.lastBackupAge).toContain(
        'hours ago',
      );
    });

    it('should handle poor system health', async () => {
      // Mock many failed backup jobs
      mockSupabaseClient
        .from()
        .select()
        .order()
        .limit.mockReturnValueOnce({
          data: [
            { id: 'job-1', status: 'failed' },
            { id: 'job-2', status: 'failed' },
            { id: 'job-3', status: 'completed' },
            { id: 'job-4', status: 'failed' },
            { id: 'job-5', status: 'failed' },
          ],
          error: null,
        });

      // Mock system stats with old successful backup
      mockSupabaseClient.rpc.mockReturnValueOnce({
        data: {
          total_backups: 100,
          successful_backups: 60,
          failed_backups: 40,
          last_successful_backup: new Date(
            Date.now() - 30 * 60 * 60 * 1000,
          ).toISOString(), // 30 hours ago
          upcoming_weddings_protected: 0,
        },
        error: null,
      });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.systemHealth.status).toBe('poor');
      expect(responseData.data.systemHealth.successRate).toBe(20); // Only 1 of 5 recent jobs successful
      expect(responseData.data.systemHealth.recommendations).toContain(
        'Review failed backup jobs and address underlying issues',
      );
      expect(responseData.data.systemHealth.recommendations).toContain(
        'Schedule immediate backup - last successful backup is over 25 hours old',
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient
        .from()
        .select()
        .order()
        .limit.mockReturnValueOnce({
          data: null,
          error: new Error('Database connection failed'),
        });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch backup status');
    });

    it('should return empty arrays when no data exists', async () => {
      // Mock empty responses
      mockSupabaseClient.from().select().order().limit.mockReturnValue({
        data: [],
        error: null,
      });

      mockSupabaseClient.rpc.mockReturnValueOnce({
        data: {
          total_backups: 0,
          successful_backups: 0,
          failed_backups: 0,
          total_data_backed_up_gb: 0,
          last_successful_backup: null,
          upcoming_weddings_protected: 0,
        },
        error: null,
      });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.recentBackups).toHaveLength(0);
      expect(responseData.data.activeRecoveries).toHaveLength(0);
      expect(responseData.data.systemHealth.status).toBe('excellent'); // No failures = excellent
    });

    it('should provide helpful recommendations', async () => {
      // Mock system with various issues
      mockSupabaseClient
        .from()
        .select()
        .order()
        .limit.mockReturnValueOnce({
          data: [
            { id: 'job-1', status: 'completed' },
            { id: 'job-2', status: 'failed' },
            { id: 'job-3', status: 'failed' },
          ],
          error: null,
        });

      mockSupabaseClient.rpc.mockReturnValueOnce({
        data: {
          total_backups: 10,
          successful_backups: 7,
          failed_backups: 3,
          last_successful_backup: new Date(
            Date.now() - 26 * 60 * 60 * 1000,
          ).toISOString(), // 26 hours ago
          upcoming_weddings_protected: 2, // Less than 5
        },
        error: null,
      });

      const request = createMockGetRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      const recommendations = responseData.data.systemHealth.recommendations;
      expect(recommendations).toContain(
        'Review failed backup jobs and address underlying issues',
      );
      expect(recommendations).toContain(
        'Schedule immediate backup - last successful backup is over 25 hours old',
      );
      expect(recommendations).toContain(
        'Ensure upcoming weddings have proper backup coverage',
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in POST request', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/backup/emergency-restore',
        {
          method: 'POST',
          body: 'invalid json {',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockRejectedValueOnce(new Error('Network timeout'));

      const validRequest = {
        backupId: '123e4567-e89b-12d3-a456-426614174000',
        recoveryScope: 'wedding-only' as const,
        confirmationToken: 'valid-token-12345',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/backup/emergency-restore',
        {
          method: 'POST',
          body: JSON.stringify(validRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toContain(
        'Emergency restore operation failed',
      );
    });

    it('should handle concurrent restore operations', async () => {
      const validRequest = {
        backupId: '123e4567-e89b-12d3-a456-426614174000',
        recoveryScope: 'wedding-only' as const,
        weddingIds: ['wedding-123'],
        confirmationToken: 'valid-token-12345',
      };

      // Mock backup snapshot exists
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockReturnValue({
          data: {
            id: 'snapshot-id',
            backup_job_id: validRequest.backupId,
            validation_status: 'valid',
            backup_jobs: { id: validRequest.backupId },
          },
          error: null,
        });

      const requests = Array.from(
        { length: 3 },
        () =>
          new NextRequest(
            'http://localhost:3000/api/backup/emergency-restore',
            {
              method: 'POST',
              body: JSON.stringify(validRequest),
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      );

      const responses = await Promise.all(
        requests.map((request) => POST(request)),
      );

      // All should succeed (in real implementation, you might want to prevent concurrent restores)
      responses.forEach(async (response) => {
        const data = await response.json();
        expect([200, 429]).toContain(response.status); // Success or rate limited
      });
    });
  });
});
