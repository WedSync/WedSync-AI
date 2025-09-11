// Guardian fixes applied
const DEFAULT_LIMIT = 10;

const HALF_PERCENTAGE = 50;

const MAX_PERCENTAGE = 100;

const SECONDS_PER_MINUTE = 60;

const MONTHS_PER_YEAR = 12;

/**
 * WS-177 Audit Logs API Route Tests - Team B Backend Audit Integration
 * ============================================================================
 * Comprehensive test suite for enhanced audit logs API with >80% coverage
 * Tests both legacy (v1) and enhanced (v2) functionality
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/audit/logs/route';
import { createClient } from '@/lib/supabase/server';
import { weddingAuditLogger } from '@/lib/audit/audit-logger';
import { auditLogAnalyzer } from '@/lib/audit/log-analyzer';
import { auditService } from '@/lib/audit/audit-service';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

vi.mock('@/lib/audit/audit-logger', () => ({
  weddingAuditLogger: {
    logAuditEvent: vi.fn(),
    queryWeddingAuditLogs: vi.fn()
  }
}));

vi.mock('@/lib/audit/log-analyzer', () => ({
  auditLogAnalyzer: {
    analyzeSuspiciousPatterns: vi.fn(),
    detectAnomalies: vi.fn(),
    getRealtimeSecurityAlerts: vi.fn(),
    generateRiskAssessmentReport: vi.fn()
  }
}));

vi.mock('@/lib/audit/audit-service', () => ({
  auditService: {
    log: vi.fn(),
    logSecurityEvent: vi.fn(),
    query: vi.fn()
  }
}));

describe('Audit Logs API Route', () => {
  let mockSupabase: any;
  let mockRequest: Partial<NextRequest>;

  const mockUserProfile = {
    organization_id: 'org-123',
    role: 'admin'
  };

  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com'
  };

  const mockAuditLogs = [
    {
      id: 'log-1',
      action: 'guest.dietary_requirements_access',
      resource_type: 'guest_profile',
      user_id: 'user-123',
      organization_id: 'org-123',
      timestamp: new Date().toISOString(),
      risk_score: 65,
      wedding_context: { guest_id: 'guest-1', sensitivity_level: 'confidential' }
    },
    {
      id: 'log-2',
      action: 'budget.payment_authorization',
      resource_type: 'budget_item',
      user_id: 'user-123',
      organization_id: 'org-123',
      timestamp: new Date().toISOString(),
      risk_score: 95,
      wedding_context: { client_id: 'client-1', sensitivity_level: 'restricted' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserProfile,
              error: null
            })
          })
        })
      })
    };

    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase);

    // Mock audit logger
    (weddingAuditLogger.queryWeddingAuditLogs as MockedFunction<any>).mockResolvedValue(mockAuditLogs);
    (weddingAuditLogger.logAuditEvent as MockedFunction<any>).mockResolvedValue(undefined);

    // Mock legacy audit service
    (auditService.query as MockedFunction<any>).mockResolvedValue(mockAuditLogs);
    (auditService.log as MockedFunction<any>).mockResolvedValue(undefined);
    (auditService.logSecurityEvent as MockedFunction<any>).mockResolvedValue(undefined);

    // Mock log analyzer
    (auditLogAnalyzer.analyzeSuspiciousPatterns as MockedFunction<any>).mockResolvedValue([
      {
        pattern_type: 'rapid_guest_access',
        severity: 'high',
        confidence_score: 85,
        event_count: 5
      }
    ]);

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams()
      },
      headers: new Headers(),
      url: 'http://localhost:3000/api/audit/logs'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/audit/logs', () => {
    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'No user' }
        });

        const request = new Request('http://localhost:3000/api/audit/logs');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Authentication required');
      });

      it('should require manager+ role for access', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'user' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs');
        const response = await GET(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe('Insufficient permissions');
      });

      it('should log unauthorized access attempts', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'user' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs');
        await GET(request);

        expect(auditService.logSecurityEvent).toHaveBeenCalled();
        expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
          'auth.privileged_access_denied',
          'audit_system',
          expect.any(Object)
        );
      });
    });

    describe('API Version Handling', () => {
      it('should default to v1 (legacy) API', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.metadata.api_version).toBe('v1');
        expect(body.success).toBe(true);
        expect(auditService.query).toHaveBeenCalled();
      });

      it('should handle v2 (enhanced) API', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs?api_version=v2');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.metadata.api_version).toBe('v2');
        expect(body.audit_logs).toBeDefined();
        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalled();
      });

      it('should apply role-based sensitivity filtering in v2', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs?api_version=v2');
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            sensitivity_levels: ['public', 'internal', 'confidential', 'restricted']
          })
        );
      });

      it('should restrict sensitivity levels for non-admin users', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'manager' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs?api_version=v2');
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            sensitivity_levels: ['public', 'internal', 'confidential']
          })
        );
      });
    });

    describe('Query Parameter Validation and Filtering', () => {
      it('should validate and apply date filters', async () => {
        const dateFrom = '2024-01-01T00:00:00Z';
        const dateTo = '2024-MONTHS_PER_YEAR-31T23:59:59Z';
        
        const request = new Request(
          `http://localhost:3000/api/audit/logs?api_version=v2&date_from=${dateFrom}&date_to=${dateTo}`
        );
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            date_from: dateFrom,
            date_to: dateTo
          })
        );
      });

      it('should validate and apply wedding context filters', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&wedding_id=wedding-123&guest_id=guest-456'
        );
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            wedding_id: 'wedding-123',
            guest_id: 'guest-456'
          })
        );
      });

      it('should apply pagination parameters', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&page=2&limit=25'
        );
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
            limit: 25
          })
        );
      });

      it('should apply search and filtering options', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&high_risk_only=true&security_events_only=true'
        );
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            high_risk_only: true,
            security_events_only: true
          })
        );
      });

      it('should enforce maximum limit constraints', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&limit=2000'
        );
        await GET(request);

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: MAX_PERCENTAGE // Should be capped at MAX_PERCENTAGE
          })
        );
      });

      it('should handle invalid date formats gracefully', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&date_from=invalid-date'
        );
        const response = await GET(request);

        expect(response.status).toBe(400);
      });
    });

    describe('Legacy API (v1) Compatibility', () => {
      it('should handle legacy parameter names', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?start_date=2024-01-01T00:00:00Z&end_date=2024-MONTHS_PER_YEAR-31T23:59:59Z&limit=HALF_PERCENTAGE'
        );
        await GET(request);

        expect(auditService.query).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 50,
            offset: 0
          })
        );
      });

      it('should apply legacy date range validation', async () => {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + MAX_PERCENTAGE * 24 * SECONDS_PER_MINUTE * SECONDS_PER_MINUTE * 1000); // MAX_PERCENTAGE days later

        const request = new Request(
          `http://localhost:3000/api/audit/logs?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
        );
        const response = await GET(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Date range cannot exceed 90 days');
      });

      it('should apply legacy text search', async () => {
        (auditService.query as MockedFunction<any>).mockResolvedValue([
          {
            id: 'log-1',
            action: 'guest access',
            event_type: 'DATA_READ',
            user_email: 'test@example.com'
          }
        ]);

        const request = new Request(
          'http://localhost:3000/api/audit/logs?search=guest'
        );
        const response = await GET(request);
        const body = await response.json();

        expect(body.data).toHaveLength(1);
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'Audit logs queried (legacy)'
          }),
          expect.any(Object)
        );
      });
    });

    describe('Organization Access Control', () => {
      it('should restrict access to organization data', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&organization_id=different-org'
        );
        const response = await GET(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe('Access denied to other organization data');
      });

      it('should allow super admins to access other organizations', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'super_admin' },
                error: null
              })
            })
          })
        });

        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&organization_id=different-org'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
      });
    });

    describe('Response Format and Metadata', () => {
      it('should return enhanced metadata in v2', async () => {
        const request = new Request(
          'http://localhost:3000/api/audit/logs?api_version=v2&limit=DEFAULT_LIMIT'
        );
        const response = await GET(request);
        const body = await response.json();

        expect(body.metadata).toMatchObject({
          total_returned: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          has_more: expect.any(Boolean),
          query_timestamp: expect.any(String),
          api_version: 'v2',
          access_level: 'admin',
          organization_id: 'org-123',
          allowed_sensitivity_levels: expect.any(Array)
        });
      });

      it('should maintain legacy response format in v1', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs');
        const response = await GET(request);
        const body = await response.json();

        expect(body).toMatchObject({
          success: true,
          data: expect.any(Array),
          metadata: expect.objectContaining({
            api_version: 'v1'
          })
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        (weddingAuditLogger.queryWeddingAuditLogs as MockedFunction<any>).mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = new Request('http://localhost:3000/api/audit/logs?api_version=v2');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error).toBe('Failed to retrieve audit logs');
        expect(body.timestamp).toBeDefined();
      });

      it('should handle missing user profile', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs');
        const response = await GET(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('No organization found');
      });
    });

    describe('Audit Logging of API Access', () => {
      it('should log API access in v2', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs?api_version=v2');
        await GET(request);

        expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
          'system.audit_log_access',
          'audit_system',
          expect.objectContaining({
            wedding_context: expect.objectContaining({
              query_parameters: expect.any(Object)
            })
          })
        );
      });

      it('should log API access in v1 legacy mode', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs');
        await GET(request);

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'Audit logs queried (legacy)'
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe('POST /api/audit/logs', () => {
    describe('Security Analysis Requests (WS-177)', () => {
      const securityAnalysisRequest = {
        analysis_type: 'patterns',
        time_window_hours: 24,
        include_details: true
      };

      it('should perform pattern analysis', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(securityAnalysisRequest),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toMatchObject({
          analysis_type: 'patterns',
          organization_id: 'org-123',
          time_window_hours: 24,
          generated_at: expect.any(String),
          results: expect.any(Array)
        });

        expect(auditLogAnalyzer.analyzeSuspiciousPatterns).toHaveBeenCalledWith('org-123', 24);
      });

      it('should require admin role for security analysis', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'manager' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(securityAnalysisRequest),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(403);

        const body = await response.json();
        expect(body.error).toBe('Security analysis requires administrator privileges');
      });

      it('should handle anomaly detection', async () => {
        (auditLogAnalyzer.detectAnomalies as MockedFunction<any>).mockResolvedValue({
          anomalies_detected: [
            { anomaly_type: 'volume', risk_level: 'high' }
          ]
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            analysis_type: 'anomalies',
            time_window_hours: MONTHS_PER_YEAR
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        expect(auditLogAnalyzer.detectAnomalies).toHaveBeenCalledWith('org-123', 12);
      });

      it('should handle real-time alerts', async () => {
        (auditLogAnalyzer.getRealtimeSecurityAlerts as MockedFunction<any>).mockResolvedValue([
          { alert_level: 'critical', pattern_type: 'failed_auth_spike' }
        ]);

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            analysis_type: 'alerts',
            include_details: true
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        expect(auditLogAnalyzer.getRealtimeSecurityAlerts).toHaveBeenCalledWith('org-123');
      });

      it('should handle risk assessment reports', async () => {
        (auditLogAnalyzer.generateRiskAssessmentReport as MockedFunction<any>).mockResolvedValue({
          overall_risk_score: 75,
          risk_breakdown: {
            authentication_risk: 60,
            data_access_risk: 70,
            financial_risk: 90,
            operational_risk: HALF_PERCENTAGE
          }
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            analysis_type: 'risk_assessment',
            time_window_hours: 48
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        expect(auditLogAnalyzer.generateRiskAssessmentReport).toHaveBeenCalledWith('org-123', 48);
      });

      it('should log security analysis requests', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(securityAnalysisRequest),
          headers: { 'Content-Type': 'application/json' }
        });

        await POST(request);

        expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
          'system.security_analysis_requested',
          'audit_system',
          expect.objectContaining({
            wedding_context: expect.objectContaining({
              analysis_type: 'patterns',
              time_window_hours: 24
            })
          })
        );
      });
    });

    describe('Manual Audit Entry Creation (WS-150 Legacy)', () => {
      const manualAuditEntry = {
        event_type: 'DATA_ACCESS',
        severity: 'INFO',
        action: 'Manual test entry',
        details: { test: true },
        resource_type: 'test_resource'
      };

      it('should create manual audit entries for system admins', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'system_admin' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(manualAuditEntry),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.message).toBe('Enhanced audit entry created successfully');

        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: 'DATA_ACCESS',
            severity: 'INFO',
            action: 'Manual test entry',
            details: expect.objectContaining({
              test: true,
              manual_entry: true,
              ws177_enhanced: true
            })
          }),
          expect.any(Object)
        );
      });

      it('should deny manual entry creation for non-system admins', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(manualAuditEntry),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(403);

        expect(auditService.logSecurityEvent).toHaveBeenCalled();
        expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
          'auth.manual_audit_creation_denied',
          'audit_system',
          expect.any(Object)
        );
      });

      it('should log manual entry creation events', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'system_admin' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(manualAuditEntry),
          headers: { 'Content-Type': 'application/json' }
        });

        await POST(request);

        expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
          'system.manual_audit_entry_created',
          'audit_system',
          expect.objectContaining({
            wedding_context: expect.objectContaining({
              manual_entry: true,
              created_by_system_admin: true
            })
          })
        );
      });
    });

    describe('Input Validation', () => {
      it('should validate security analysis request schema', async () => {
        const invalidRequest = {
          analysis_type: 'invalid_type',
          time_window_hours: -1
        };

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should validate time window limits', async () => {
        const invalidRequest = {
          analysis_type: 'patterns',
          time_window_hours: 200 // Exceeds 168 hour limit
        };

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });

      it('should handle malformed JSON', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: 'invalid-json',
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      });
    });

    describe('Error Handling', () => {
      it('should handle security analysis failures', async () => {
        (auditLogAnalyzer.analyzeSuspiciousPatterns as MockedFunction<any>).mockRejectedValue(
          new Error('Analysis failed')
        );

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            analysis_type: 'patterns',
            time_window_hours: 24
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(500);

        const body = await response.json();
        expect(body.error).toBe('Security analysis failed');
      });

      it('should handle audit service failures gracefully', async () => {
        (auditService.log as MockedFunction<any>).mockRejectedValue(
          new Error('Audit service failed')
        );

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'system_admin' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            event_type: 'DATA_ACCESS',
            severity: 'INFO',
            action: 'Test entry'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
      });
    });

    describe('Organization Scope Validation', () => {
      it('should restrict security analysis to user organization', async () => {
        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            analysis_type: 'patterns',
            organization_id: 'different-org',
            time_window_hours: 24
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(403);

        const body = await response.json();
        expect(body.error).toBe('Access denied to other organization security analysis');
      });

      it('should allow super admins cross-organization analysis', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockUserProfile, role: 'super_admin' },
                error: null
              })
            })
          })
        });

        const request = new Request('http://localhost:3000/api/audit/logs', {
          method: 'POST',
          body: JSON.stringify({
            analysis_type: 'patterns',
            organization_id: 'different-org',
            time_window_hours: 24
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should apply withSecureValidation security checks', async () => {
      // Mock bot user agent
      const botRequest = new Request('http://localhost:3000/api/audit/logs', {
        method: 'POST',
        body: JSON.stringify({
          analysis_type: 'patterns',
          time_window_hours: 24
        }),
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'bot crawler spider'
        }
      });

      const response = await POST(botRequest);
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('Automated requests not allowed');
    });

    it('should validate CORS for state-changing operations', async () => {
      const invalidOriginRequest = new Request('http://localhost:3000/api/audit/logs', {
        method: 'POST',
        body: JSON.stringify({
          analysis_type: 'patterns',
          time_window_hours: 24
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'http://malicious-site.com',
          'Host': 'localhost:3000'
        }
      });

      const response = await POST(invalidOriginRequest);
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('Cross-origin requests not allowed');
    });
  });
});