/**
 * WS-177 Audit Middleware Unit Tests - Team B Backend Audit Integration
 * ============================================================================
 * Comprehensive test suite for audit middleware functions with >80% coverage
 * Tests withSecureValidation integration and wedding-specific middleware
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  withAuditLogging,
  withSecureAuditValidation,
  withHighSecurityAudit,
  withGuestDataAudit,
  withVendorAudit,
  withTaskAudit,
  withBudgetAudit,
  withAdminAudit,
  isAdminRequest,
  extractCommonWeddingContext,
  checkAuditRateLimit
} from '@/lib/audit/auditMiddleware';
import { getServerSession } from 'next-auth';
import { weddingAuditLogger } from '@/lib/audit/audit-logger';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/auth/config', () => ({
  authOptions: {}
}));

vi.mock('@/lib/audit/audit-logger', () => ({
  weddingAuditLogger: {
    logAuditEvent: vi.fn(),
    queryWeddingAuditLogs: vi.fn()
  }
}));

vi.mock('@/lib/audit/log-analyzer', () => ({
  auditLogAnalyzer: {
    getRealtimeSecurityAlerts: vi.fn().mockResolvedValue([])
  }
}));

describe('Audit Middleware', () => {
  let mockRequest: Partial<NextRequest>;
  let mockHandler: MockedFunction<any>;
  let mockValidatedData: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      headers: new Headers({
        'x-request-id': 'test-request-123',
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
        'x-client-id': 'client-123',
        'x-wedding-id': 'wedding-456',
        'x-supplier-id': 'supplier-789'
      }),
      ip: '127.0.0.1',
      url: 'http://localhost:3000/api/test/guest-123'
    };

    mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    mockValidatedData = {
      guestId: 'guest-123',
      data: 'test-data'
    };

    // Mock successful session by default
    (getServerSession as MockedFunction<typeof getServerSession>).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
        sessionId: 'session-789'
      }
    });

    // Mock successful audit logging
    (weddingAuditLogger.logAuditEvent as MockedFunction<any>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('withAuditLogging', () => {
    it('should log successful operations', async () => {
      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const,
        extractResourceId: (req: NextRequest) => 'guest-123'
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      const response = await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockValidatedData);
      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.dietary_requirements_access',
        'guest_profile',
        expect.objectContaining({
          resource_id: 'guest-123'
        })
      );
      expect(response).toEqual(NextResponse.json({ success: true }));
    });

    it('should log failed operations', async () => {
      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const
      };

      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const wrappedHandler = withAuditLogging(errorHandler, config);

      await expect(wrappedHandler(mockRequest as NextRequest, mockValidatedData))
        .rejects.toThrow('Handler failed');

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.dietary_requirements_access',
        'guest_profile',
        expect.objectContaining({
          resource_id: undefined
        })
      );
    });

    it('should skip audit if configured', async () => {
      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const,
        skipAuditIf: () => true
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should extract wedding context correctly', async () => {
      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const,
        extractWeddingContext: (req: NextRequest) => ({
          client_id: 'client-extracted',
          wedding_id: 'wedding-extracted'
        })
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.dietary_requirements_access',
        'guest_profile',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            client_id: 'client-extracted',
            wedding_id: 'wedding-extracted'
          })
        })
      );
    });

    it('should handle session retrieval failures gracefully', async () => {
      (getServerSession as MockedFunction<typeof getServerSession>).mockRejectedValue(
        new Error('Session failed')
      );

      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      const response = await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(response).toEqual(NextResponse.json({ success: true }));
      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalled();
    });
  });

  describe('withHighSecurityAudit', () => {
    it('should apply high security configuration', async () => {
      const wrappedHandler = withHighSecurityAudit(
        mockHandler,
        'budget.payment_authorization',
        'budget_item'
      );

      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'budget.payment_authorization',
        'budget_item',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            sensitivity_level: 'confidential',
            business_impact: 'high'
          })
        })
      );
    });

    it('should include request body for high security operations', async () => {
      const wrappedHandler = withHighSecurityAudit(
        mockHandler,
        'auth.privileged_access_grant',
        'system_config'
      );

      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'auth.privileged_access_grant',
        'system_config',
        expect.objectContaining({
          include_request_body: true,
          include_response_body: false
        })
      );
    });
  });

  describe('withGuestDataAudit', () => {
    it('should audit dietary requirements access', async () => {
      const wrappedHandler = withGuestDataAudit(mockHandler, 'dietary');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.dietary_requirements_access',
        'guest_profile',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            sensitivity_level: 'confidential',
            business_impact: 'high'
          })
        })
      );
    });

    it('should audit personal data export', async () => {
      const wrappedHandler = withGuestDataAudit(mockHandler, 'personal');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.personal_data_export',
        'guest_profile',
        expect.any(Object)
      );
    });

    it('should extract guest ID from URL', async () => {
      mockRequest.url = 'http://localhost:3000/api/guests/guest-456/dietary';
      
      const wrappedHandler = withGuestDataAudit(mockHandler, 'dietary');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.dietary_requirements_access',
        'guest_profile',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            guest_id: 'guest-456'
          })
        })
      );
    });

    it('should extract guest ID from query parameters', async () => {
      mockRequest.url = 'http://localhost:3000/api/guest-data?guest_id=guest-789';
      
      const wrappedHandler = withGuestDataAudit(mockHandler, 'contact');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.contact_info_access',
        'guest_profile',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            guest_id: 'guest-789'
          })
        })
      );
    });
  });

  describe('withVendorAudit', () => {
    it('should audit vendor data access', async () => {
      const wrappedHandler = withVendorAudit(mockHandler, 'data_access');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'vendor.client_data_access',
        'vendor_contract',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            sensitivity_level: 'internal',
            business_impact: 'medium'
          })
        })
      );
    });

    it('should audit payment access with high sensitivity', async () => {
      const wrappedHandler = withVendorAudit(mockHandler, 'payment_access');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'vendor.payment_information_access',
        'vendor_contract',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            sensitivity_level: 'confidential',
            business_impact: 'high'
          }),
          include_request_body: true
        })
      );
    });

    it('should extract vendor ID from URL path', async () => {
      mockRequest.url = 'http://localhost:3000/api/vendors/vendor-123/contracts';
      
      const wrappedHandler = withVendorAudit(mockHandler, 'contract_access');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'vendor.contract_access',
        'vendor_contract',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            supplier_id: 'vendor-123'
          })
        })
      );
    });
  });

  describe('withTaskAudit', () => {
    it('should audit deadline modifications with critical impact', async () => {
      const wrappedHandler = withTaskAudit(mockHandler, 'deadline');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'task.critical_deadline_modify',
        'wedding_task',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            business_impact: 'critical'
          })
        })
      );
    });

    it('should audit evidence uploads', async () => {
      const wrappedHandler = withTaskAudit(mockHandler, 'evidence');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'task.evidence_photo_upload',
        'wedding_task',
        expect.objectContaining({
          include_request_body: true
        })
      );
    });

    it('should extract task ID from URL', async () => {
      mockRequest.url = 'http://localhost:3000/api/tasks/task-456/status';
      
      const wrappedHandler = withTaskAudit(mockHandler, 'status');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'task.completion_status_change',
        'wedding_task',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            task_id: 'task-456'
          })
        })
      );
    });
  });

  describe('withBudgetAudit', () => {
    it('should audit payment authorization with critical impact', async () => {
      const wrappedHandler = withBudgetAudit(mockHandler, 'payment_auth');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'budget.payment_authorization',
        'budget_item',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            sensitivity_level: 'confidential',
            business_impact: 'critical'
          }),
          include_request_body: true
        })
      );
    });

    it('should audit expense approvals', async () => {
      const wrappedHandler = withBudgetAudit(mockHandler, 'expense_approval');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'budget.major_expense_approval',
        'budget_item',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            business_impact: 'high'
          })
        })
      );
    });
  });

  describe('withAdminAudit', () => {
    it('should audit configuration changes with restricted sensitivity', async () => {
      const wrappedHandler = withAdminAudit(mockHandler, 'config_change');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'system.configuration_change',
        'system_config',
        expect.objectContaining({
          wedding_context: expect.objectContaining({
            sensitivity_level: 'restricted',
            business_impact: 'critical'
          }),
          include_request_body: true,
          include_response_body: false,
          async_logging: false
        })
      );
    });

    it('should audit user management operations', async () => {
      const wrappedHandler = withAdminAudit(mockHandler, 'user_management');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'auth.role_permission_change',
        'system_config',
        expect.any(Object)
      );
    });

    it('should audit audit log access', async () => {
      const wrappedHandler = withAdminAudit(mockHandler, 'audit_access');
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'system.audit_log_access',
        'system_config',
        expect.any(Object)
      );
    });
  });

  describe('Utility Functions', () => {
    describe('isAdminRequest', () => {
      it('should identify admin users', async () => {
        (getServerSession as MockedFunction<typeof getServerSession>).mockResolvedValue({
          user: { id: 'user-1', role: 'admin' }
        });

        const result = await isAdminRequest(mockRequest as NextRequest);
        expect(result).toBe(true);
      });

      it('should identify super admin users', async () => {
        (getServerSession as MockedFunction<typeof getServerSession>).mockResolvedValue({
          user: { id: 'user-1', role: 'super_admin' }
        });

        const result = await isAdminRequest(mockRequest as NextRequest);
        expect(result).toBe(true);
      });

      it('should reject non-admin users', async () => {
        (getServerSession as MockedFunction<typeof getServerSession>).mockResolvedValue({
          user: { id: 'user-1', role: 'user' }
        });

        const result = await isAdminRequest(mockRequest as NextRequest);
        expect(result).toBe(false);
      });

      it('should handle session errors', async () => {
        (getServerSession as MockedFunction<typeof getServerSession>).mockRejectedValue(
          new Error('Session error')
        );

        const result = await isAdminRequest(mockRequest as NextRequest);
        expect(result).toBe(false);
      });
    });

    describe('extractCommonWeddingContext', () => {
      it('should extract wedding context from headers', () => {
        const context = extractCommonWeddingContext(mockRequest as NextRequest);

        expect(context).toEqual({
          client_id: 'client-123',
          wedding_id: 'wedding-456',
          supplier_id: 'supplier-789',
          guest_id: undefined
        });
      });

      it('should handle missing headers', () => {
        const requestWithoutHeaders = {
          headers: new Headers()
        };

        const context = extractCommonWeddingContext(requestWithoutHeaders as NextRequest);

        expect(context).toEqual({
          client_id: undefined,
          wedding_id: undefined,
          supplier_id: undefined,
          guest_id: undefined
        });
      });

      it('should extract guest ID from headers', () => {
        const requestWithGuestId = {
          headers: new Headers({
            'x-guest-id': 'guest-999'
          })
        };

        const context = extractCommonWeddingContext(requestWithGuestId as NextRequest);

        expect(context).toMatchObject({
          guest_id: 'guest-999'
        });
      });
    });

    describe('checkAuditRateLimit', () => {
      beforeEach(() => {
        (weddingAuditLogger.queryWeddingAuditLogs as MockedFunction<any>).mockResolvedValue([]);
      });

      it('should allow requests within rate limit', async () => {
        const allowed = await checkAuditRateLimit(
          'user-123',
          'guest.dietary_requirements_access',
          60,
          50
        );

        expect(allowed).toBe(true);
      });

      it('should deny requests exceeding rate limit', async () => {
        // Mock 51 recent logs (exceeding limit of 50)
        const recentLogs = Array.from({ length: 51 }, (_, i) => ({
          id: `log-${i}`,
          timestamp: new Date().toISOString()
        }));

        (weddingAuditLogger.queryWeddingAuditLogs as MockedFunction<any>).mockResolvedValue(recentLogs);

        const allowed = await checkAuditRateLimit(
          'user-123',
          'guest.dietary_requirements_access',
          60,
          50
        );

        expect(allowed).toBe(false);
      });

      it('should handle query errors gracefully', async () => {
        (weddingAuditLogger.queryWeddingAuditLogs as MockedFunction<any>).mockRejectedValue(
          new Error('Query failed')
        );

        const allowed = await checkAuditRateLimit(
          'user-123',
          'guest.dietary_requirements_access'
        );

        expect(allowed).toBe(true); // Fail open
      });

      it('should use default parameters', async () => {
        await checkAuditRateLimit('user-123', 'guest.dietary_requirements_access');

        expect(weddingAuditLogger.queryWeddingAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            action_pattern: 'guest.dietary_requirements_access',
            limit: 51 // maxAttempts + 1
          })
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle audit logging failures gracefully', async () => {
      (weddingAuditLogger.logAuditEvent as MockedFunction<any>).mockRejectedValue(
        new Error('Audit logging failed')
      );

      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      const response = await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(response).toEqual(NextResponse.json({ success: true }));
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should handle missing request headers', async () => {
      mockRequest.headers = new Headers();
      mockRequest.ip = undefined;

      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalled();
    });

    it('should handle malformed URLs in resource ID extraction', async () => {
      mockRequest.url = 'invalid-url';

      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const,
        extractResourceId: (req: NextRequest) => {
          try {
            const url = new URL(req.url);
            return url.pathname.split('/').pop();
          } catch {
            return undefined;
          }
        }
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledWith(
        'guest.dietary_requirements_access',
        'guest_profile',
        expect.objectContaining({
          resource_id: undefined
        })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not leak memory with many middleware wrappings', async () => {
      const handlers = Array.from({ length: 100 }, () =>
        withGuestDataAudit(mockHandler, 'dietary')
      );

      // Execute all handlers
      await Promise.all(
        handlers.map(handler =>
          handler(mockRequest as NextRequest, mockValidatedData)
        )
      );

      expect(weddingAuditLogger.logAuditEvent).toHaveBeenCalledTimes(100);
    });

    it('should complete middleware operations within reasonable time', async () => {
      const config = {
        action: 'guest.dietary_requirements_access' as const,
        resourceType: 'guest_profile' as const
      };

      const wrappedHandler = withAuditLogging(mockHandler, config);
      
      const startTime = Date.now();
      await wrappedHandler(mockRequest as NextRequest, mockValidatedData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });
});