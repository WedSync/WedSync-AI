import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createMockSupabaseClient } from '../../__mocks__/supabase';

// Mock the services
vi.mock('@/lib/services/backup/AutomatedBackupOrchestrator');
vi.mock('@/lib/services/backup/DisasterRecoveryEngine');
vi.mock('@/lib/services/backup/BackupValidationService');
vi.mock('@/lib/services/backup/BackupEncryptionService');

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    getAll: () => [],
    setAll: () => {},
    set: () => {},
  }),
}));

describe('Backup API Endpoints', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('/api/backup/automated', () => {
    it('should successfully schedule an automated backup', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/automated/route');

      const request = new NextRequest('http://localhost:3000/api/backup/automated', {
        method: 'POST',
        body: JSON.stringify({
          schedule: 'DAILY',
          organizationId: 'test-org-id',
          backupType: 'FULL',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.backupId).toBeDefined();
      expect(responseData.scheduledAt).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const { POST } = await import('@/app/api/backup/automated/route');

      const request = new NextRequest('http://localhost:3000/api/backup/automated', {
        method: 'POST',
        body: JSON.stringify({
          schedule: 'DAILY',
          organizationId: 'test-org-id',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/automated/route');

      const request = new NextRequest('http://localhost:3000/api/backup/automated', {
        method: 'POST',
        body: JSON.stringify({
          schedule: 'DAILY',
          // Missing organizationId
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('required');
    });

    it('should successfully get scheduled backups', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/automated/route');

      const request = new NextRequest('http://localhost:3000/api/backup/automated?organizationId=test-org-id');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.schedules).toBeDefined();
    });
  });

  describe('/api/backup/manual', () => {
    it('should successfully create a manual backup', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/manual/route');

      const request = new NextRequest('http://localhost:3000/api/backup/manual', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org-id',
          backupType: 'FULL',
          includeMediaFiles: true,
          description: 'Test manual backup',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.backupId).toBeDefined();
      expect(responseData.status).toBe('INITIATED');
    });

    it('should handle wedding-specific manual backups', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/manual/route');

      const request = new NextRequest('http://localhost:3000/api/backup/manual', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'test-org-id',
          weddingId: 'test-wedding-id',
          backupType: 'FULL',
          includeMediaFiles: true,
          description: 'Wedding-specific backup',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.priority).toBeDefined();
    });

    it('should get manual backup history', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/manual/route');

      const request = new NextRequest('http://localhost:3000/api/backup/manual?organizationId=test-org-id&limit=10');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.backups).toBeDefined();
    });
  });

  describe('/api/recovery/restore', () => {
    it('should successfully initiate a data restore', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/recovery/restore/route');

      const request = new NextRequest('http://localhost:3000/api/recovery/restore', {
        method: 'POST',
        body: JSON.stringify({
          backupId: 'test-backup-id',
          organizationId: 'test-org-id',
          restoreType: 'FULL',
          targetTables: ['weddings', 'clients'],
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.restoreId).toBeDefined();
      expect(responseData.status).toBe('INITIATED');
    });

    it('should handle emergency restore requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/recovery/restore/route');

      const request = new NextRequest('http://localhost:3000/api/recovery/restore', {
        method: 'POST',
        body: JSON.stringify({
          backupId: 'test-backup-id',
          organizationId: 'test-org-id',
          restoreType: 'FULL',
          isEmergencyRestore: true,
          confirmationToken: 'emergency-token-123',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.status).toBe('EMERGENCY_RESTORE_INITIATED');
      expect(responseData.priority).toBe('CRITICAL');
    });

    it('should get restore status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/recovery/restore/route');

      const request = new NextRequest('http://localhost:3000/api/recovery/restore?restoreId=test-restore-id');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.restore).toBeDefined();
    });

    it('should cancel restore operation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { DELETE } = await import('@/app/api/recovery/restore/route');

      const request = new NextRequest('http://localhost:3000/api/recovery/restore?restoreId=test-restore-id');

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('cancelled');
    });
  });

  describe('/api/backup/status', () => {
    it('should get backup status for specific backup', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/status/route');

      const request = new NextRequest('http://localhost:3000/api/backup/status?backupId=test-backup-id');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.backup).toBeDefined();
    });

    it('should get detailed backup status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/status/route');

      const request = new NextRequest('http://localhost:3000/api/backup/status?backupId=test-backup-id&detailed=true');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.backup).toBeDefined();
    });

    it('should get organization backup overview', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/status/route');

      const request = new NextRequest('http://localhost:3000/api/backup/status?organizationId=test-org-id');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.overview).toBeDefined();
    });

    it('should update backup status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/status/route');

      const request = new NextRequest('http://localhost:3000/api/backup/status', {
        method: 'POST',
        body: JSON.stringify({
          backupId: 'test-backup-id',
          status: 'RUNNING',
          progress: 50,
          metadata: { currentTable: 'weddings' },
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('updated');
    });
  });

  describe('/api/backup/validation', () => {
    it('should validate a backup successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/validation/route');

      const request = new NextRequest('http://localhost:3000/api/backup/validation', {
        method: 'POST',
        body: JSON.stringify({
          backupId: 'test-backup-id',
          validationType: 'FULL',
          includeIntegrityCheck: true,
          includeEncryptionValidation: true,
          includeDataConsistencyCheck: true,
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.validation).toBeDefined();
      expect(responseData.validation.backupId).toBe('test-backup-id');
    });

    it('should get validation history for backup', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/validation/route');

      const request = new NextRequest('http://localhost:3000/api/backup/validation?backupId=test-backup-id');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.validations).toBeDefined();
    });

    it('should get organization validation summary', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { GET } = await import('@/app/api/backup/validation/route');

      const request = new NextRequest('http://localhost:3000/api/backup/validation?organizationId=test-org-id');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.summary).toBeDefined();
    });

    it('should schedule automated validation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { PUT } = await import('@/app/api/backup/validation/route');

      const request = new NextRequest('http://localhost:3000/api/backup/validation', {
        method: 'PUT',
        body: JSON.stringify({
          organizationId: 'test-org-id',
          validationSchedule: 'DAILY',
        }),
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.scheduledValidation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Mock service to throw error
      vi.doMock('@/lib/services/backup/AutomatedBackupOrchestrator', () => ({
        AutomatedBackupOrchestrator: class {
          constructor() {}
          async scheduleBackup() {
            throw new Error('Service unavailable');
          }
        },
      }));

      const { POST } = await import('@/app/api/backup/automated/route');

      const request = new NextRequest('http://localhost:3000/api/backup/automated', {
        method: 'POST',
        body: JSON.stringify({
          schedule: 'DAILY',
          organizationId: 'test-org-id',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should validate request parameters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      const { POST } = await import('@/app/api/backup/validation/route');

      const request = new NextRequest('http://localhost:3000/api/backup/validation', {
        method: 'POST',
        body: JSON.stringify({}), // Missing backupId
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('required');
    });
  });

  describe('Wedding-Critical Backup Logic', () => {
    it('should prioritize critical weddings in backup scheduling', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });

      // Mock critical wedding scenario
      vi.doMock('@/lib/services/backup/WeddingDateBackupPriority', () => ({
        WeddingDateBackupPriority: class {
          async calculateOrganizationPriority() {
            return 'CRITICAL';
          }
        },
      }));

      const { POST } = await import('@/app/api/backup/automated/route');

      const request = new NextRequest('http://localhost:3000/api/backup/automated', {
        method: 'POST',
        body: JSON.stringify({
          schedule: 'DAILY',
          organizationId: 'test-org-id',
          backupType: 'FULL',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.priority).toBeDefined();
    });
  });
});

describe('Backup Service Integration Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('AutomatedBackupOrchestrator', () => {
    it('should schedule backups with correct priority', async () => {
      const { AutomatedBackupOrchestrator } = await import('@/lib/services/backup/AutomatedBackupOrchestrator');
      const orchestrator = new AutomatedBackupOrchestrator(mockSupabase);

      const config = {
        organizationId: 'test-org-id',
        schedule: 'DAILY' as const,
        backupType: 'FULL' as const,
        priority: 'HIGH' as const,
        userId: 'test-user-id',
      };

      const result = await orchestrator.scheduleBackup(config);

      expect(result.backupId).toBeDefined();
      expect(result.scheduledAt).toBeInstanceOf(Date);
      expect(result.status).toBe('SCHEDULED');
    });
  });

  describe('DisasterRecoveryEngine', () => {
    it('should create manual backups with proper configuration', async () => {
      const { DisasterRecoveryEngine } = await import('@/lib/services/backup/DisasterRecoveryEngine');
      const engine = new DisasterRecoveryEngine(mockSupabase);

      const config = {
        organizationId: 'test-org-id',
        backupType: 'FULL' as const,
        priority: 'HIGH' as const,
        includeMediaFiles: true,
        encryption: 'AES-256' as const,
        userId: 'test-user-id',
        description: 'Test manual backup',
        createdAt: new Date(),
      };

      const result = await engine.createManualBackup(config);

      expect(result.backupId).toBeDefined();
      expect(result.status).toBe('INITIATED');
      expect(result.priority).toBe('HIGH');
    });
  });

  describe('BackupValidationService', () => {
    it('should validate backups and return comprehensive results', async () => {
      const { BackupValidationService } = await import('@/lib/services/backup/BackupValidationService');
      const validator = new BackupValidationService(mockSupabase);

      const result = await validator.validateBackup('test-backup-id');

      expect(result.validationId).toBeDefined();
      expect(result.validationScore).toBeGreaterThanOrEqual(0);
      expect(result.validationScore).toBeLessThanOrEqual(100);
      expect(result.completedChecks).toBeInstanceOf(Array);
    });
  });
});