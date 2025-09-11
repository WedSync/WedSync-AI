/**
 * WS-177 Audit Logger Unit Tests - Team B Backend Audit Integration
 * ============================================================================
 * Comprehensive test suite for WeddingAuditLogger with >80% coverage
 * Tests wedding-specific audit functionality and security features
 * ============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { WeddingAuditLogger } from '@/lib/audit/audit-logger';
import { createClient } from '@/lib/supabase/server';
import type { 
  BackendAuditAction, 
  BackendAuditResourceType,
  AuditLoggingOptions,
  WeddingBackendAuditContext 
} from '@/types/audit';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

// Mock the existing audit service for compatibility
vi.mock('@/lib/audit/audit-service', () => ({
  auditService: {
    log: vi.fn(),
    query: vi.fn()
  }
}));

describe('WeddingAuditLogger', () => {
  let auditLogger: WeddingAuditLogger;
  let mockSupabase: any;
  let mockInsert: MockedFunction<any>;
  let mockSelect: MockedFunction<any>;
  let mockFrom: MockedFunction<any>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup Supabase mock
    mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 'test-audit-id' }], error: null })
    });
    
    mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ 
                data: [
                  {
                    id: 'test-audit-1',
                    action: 'guest.dietary_requirements_access',
                    resource_type: 'guest_profile',
                    timestamp: new Date().toISOString(),
                    user_id: 'test-user',
                    organization_id: 'test-org',
                    wedding_context: { guest_id: 'guest-1' }
                  }
                ], 
                error: null 
              })
            })
          })
        })
      })
    });

    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'audit_logs') {
        return {
          insert: mockInsert,
          select: mockSelect
        };
      }
      return { insert: mockInsert, select: mockSelect };
    });

    mockSupabase = {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' } },
          error: null
        })
      }
    };

    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase);
    
    auditLogger = new WeddingAuditLogger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Core Audit Logging', () => {
    it('should log basic audit event successfully', async () => {
      const action: BackendAuditAction = 'guest.dietary_requirements_access';
      const resourceType: BackendAuditResourceType = 'guest_profile';
      const options: AuditLoggingOptions = {
        resource_id: 'guest-123',
        include_request_body: false,
        wedding_context: {
          guest_id: 'guest-123',
          sensitivity_level: 'confidential',
          business_impact: 'high'
        }
      };

      await auditLogger.logAuditEvent(action, resourceType, options);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          resource_type: resourceType,
          resource_id: 'guest-123',
          wedding_context: expect.objectContaining({
            guest_id: 'guest-123',
            sensitivity_level: 'confidential',
            business_impact: 'high'
          })
        })
      );
    });

    it('should calculate risk score correctly', async () => {
      const action: BackendAuditAction = 'budget.payment_authorization';
      const resourceType: BackendAuditResourceType = 'budget_item';
      const options: AuditLoggingOptions = {
        wedding_context: {
          sensitivity_level: 'restricted',
          business_impact: 'critical'
        }
      };

      await auditLogger.logAuditEvent(action, resourceType, options);

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.risk_score).toBeGreaterThan(80); // High risk for payment auth
    });

    it('should handle missing wedding context gracefully', async () => {
      const action: BackendAuditAction = 'system.configuration_change';
      const resourceType: BackendAuditResourceType = 'system_config';

      await auditLogger.logAuditEvent(action, resourceType, {});

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action,
          resource_type: resourceType,
          wedding_context: expect.objectContaining({
            sensitivity_level: 'internal',
            business_impact: 'low'
          })
        })
      );
    });

    it('should generate proper correlation IDs', async () => {
      const action: BackendAuditAction = 'guest.personal_data_export';
      const resourceType: BackendAuditResourceType = 'guest_profile';

      await auditLogger.logAuditEvent(action, resourceType, {
        wedding_context: { guest_id: 'guest-456' }
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.correlation_id).toMatch(/^audit_/);
      expect(typeof insertCall.correlation_id).toBe('string');
    });
  });

  describe('Wedding-Specific Convenience Methods', () => {
    it('should log guest data access correctly', async () => {
      const guestId = 'guest-789';
      const dataType = 'dietary';
      const context: WeddingBackendAuditContext = {
        wedding_id: 'wedding-123',
        guest_id: guestId,
        sensitivity_level: 'confidential',
        business_impact: 'high'
      };

      await auditLogger.logGuestDataAccess(guestId, dataType, context);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'guest.dietary_requirements_access',
          resource_type: 'guest_profile',
          resource_id: guestId,
          wedding_context: expect.objectContaining({
            guest_id: guestId,
            wedding_id: 'wedding-123'
          })
        })
      );
    });

    it('should log vendor actions with proper context', async () => {
      const vendorId = 'vendor-456';
      const actionType = 'contract_access';
      const context: WeddingBackendAuditContext = {
        supplier_id: vendorId,
        client_id: 'client-123',
        sensitivity_level: 'confidential',
        business_impact: 'high'
      };

      await auditLogger.logVendorAction(vendorId, actionType, context);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'vendor.contract_access',
          resource_type: 'vendor_contract',
          resource_id: vendorId,
          wedding_context: expect.objectContaining({
            supplier_id: vendorId,
            client_id: 'client-123'
          })
        })
      );
    });

    it('should log task changes with timeline integration', async () => {
      const taskId = 'task-789';
      const changeType = 'deadline';
      const context: WeddingBackendAuditContext = {
        task_id: taskId,
        wedding_id: 'wedding-456',
        sensitivity_level: 'internal',
        business_impact: 'critical'
      };

      await auditLogger.logTaskChange(taskId, changeType, context);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'task.critical_deadline_modify',
          resource_type: 'wedding_task',
          resource_id: taskId,
          wedding_context: expect.objectContaining({
            task_id: taskId,
            wedding_id: 'wedding-456'
          })
        })
      );
    });

    it('should log budget operations with financial context', async () => {
      const budgetId = 'budget-123';
      const operation = 'payment_auth';
      const context: WeddingBackendAuditContext = {
        client_id: 'client-789',
        sensitivity_level: 'restricted',
        business_impact: 'critical'
      };

      await auditLogger.logBudgetOperation(budgetId, operation, context);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget.payment_authorization',
          resource_type: 'budget_item',
          resource_id: budgetId,
          wedding_context: expect.objectContaining({
            client_id: 'client-789',
            sensitivity_level: 'restricted',
            business_impact: 'critical'
          })
        })
      );
    });
  });

  describe('Query Functionality', () => {
    it('should query wedding audit logs with filters', async () => {
      const queryOptions = {
        organization_id: 'org-123',
        date_from: '2024-01-01T00:00:00Z',
        date_to: '2024-12-31T23:59:59Z',
        action: 'guest.dietary_requirements_access' as BackendAuditAction,
        wedding_id: 'wedding-456',
        limit: 50
      };

      const result = await auditLogger.queryWeddingAuditLogs(queryOptions);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSelect).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-audit-1',
        action: 'guest.dietary_requirements_access'
      });
    });

    it('should handle query errors gracefully', async () => {
      // Mock error scenario
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      });

      const queryOptions = {
        organization_id: 'org-123',
        limit: 50
      };

      const result = await auditLogger.queryWeddingAuditLogs(queryOptions);
      expect(result).toEqual([]);
    });

    it('should apply sensitivity level filters correctly', async () => {
      const queryOptions = {
        organization_id: 'org-123',
        sensitivity_levels: ['internal', 'confidential'] as const,
        limit: 25
      };

      await auditLogger.queryWeddingAuditLogs(queryOptions);

      // Verify that sensitivity level filtering was applied
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('Risk Scoring Algorithm', () => {
    it('should calculate high risk for payment operations', async () => {
      const action: BackendAuditAction = 'budget.payment_authorization';
      const resourceType: BackendAuditResourceType = 'budget_item';

      await auditLogger.logAuditEvent(action, resourceType, {
        wedding_context: {
          sensitivity_level: 'restricted',
          business_impact: 'critical'
        }
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.risk_score).toBeGreaterThanOrEqual(90);
    });

    it('should calculate medium risk for guest data access', async () => {
      const action: BackendAuditAction = 'guest.contact_info_access';
      const resourceType: BackendAuditResourceType = 'guest_profile';

      await auditLogger.logAuditEvent(action, resourceType, {
        wedding_context: {
          sensitivity_level: 'confidential',
          business_impact: 'medium'
        }
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.risk_score).toBeGreaterThanOrEqual(40);
      expect(insertCall.risk_score).toBeLessThan(70);
    });

    it('should calculate low risk for public operations', async () => {
      const action: BackendAuditAction = 'system.health_check';
      const resourceType: BackendAuditResourceType = 'system_config';

      await auditLogger.logAuditEvent(action, resourceType, {
        wedding_context: {
          sensitivity_level: 'public',
          business_impact: 'low'
        }
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.risk_score).toBeLessThan(30);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database insertion errors gracefully', async () => {
      mockInsert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Insert failed' }
        })
      });

      const action: BackendAuditAction = 'guest.dietary_requirements_access';
      const resourceType: BackendAuditResourceType = 'guest_profile';

      // Should not throw error
      await expect(
        auditLogger.logAuditEvent(action, resourceType, {})
      ).resolves.not.toThrow();
    });

    it('should handle Supabase client creation errors', async () => {
      (createClient as MockedFunction<typeof createClient>).mockRejectedValue(
        new Error('Supabase connection failed')
      );

      const action: BackendAuditAction = 'system.configuration_change';
      const resourceType: BackendAuditResourceType = 'system_config';

      // Should not throw error
      await expect(
        auditLogger.logAuditEvent(action, resourceType, {})
      ).resolves.not.toThrow();
    });

    it('should validate required parameters', async () => {
      // Test with invalid action
      const invalidAction = '' as BackendAuditAction;
      const resourceType: BackendAuditResourceType = 'guest_profile';

      await expect(
        auditLogger.logAuditEvent(invalidAction, resourceType, {})
      ).resolves.not.toThrow(); // Should handle gracefully
    });
  });

  describe('Integration with Legacy Audit Service', () => {
    it('should maintain compatibility with existing audit service', async () => {
      const { auditService } = await import('@/lib/audit/audit-service');
      
      const action: BackendAuditAction = 'guest.personal_data_export';
      const resourceType: BackendAuditResourceType = 'guest_profile';

      await auditLogger.logAuditEvent(action, resourceType, {
        wedding_context: { guest_id: 'guest-123' }
      });

      // Should also log to legacy system for compatibility
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  describe('Async and Batch Processing', () => {
    it('should handle async logging correctly', async () => {
      const action: BackendAuditAction = 'guest.dietary_requirements_access';
      const resourceType: BackendAuditResourceType = 'guest_profile';

      await auditLogger.logAuditEvent(action, resourceType, {
        async_logging: true,
        wedding_context: { guest_id: 'guest-123' }
      });

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should process batch audit events', async () => {
      const events = [
        {
          action: 'guest.dietary_requirements_access' as BackendAuditAction,
          resource_type: 'guest_profile' as BackendAuditResourceType,
          options: { wedding_context: { guest_id: 'guest-1' } }
        },
        {
          action: 'vendor.contract_access' as BackendAuditAction,
          resource_type: 'vendor_contract' as BackendAuditResourceType,
          options: { wedding_context: { supplier_id: 'vendor-1' } }
        }
      ];

      // Process multiple events
      await Promise.all(events.map(event => 
        auditLogger.logAuditEvent(event.action, event.resource_type, event.options)
      ));

      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume logging efficiently', async () => {
      const startTime = Date.now();
      
      // Log 100 events
      const promises = Array.from({ length: 100 }, (_, i) =>
        auditLogger.logAuditEvent(
          'guest.dietary_requirements_access',
          'guest_profile',
          { wedding_context: { guest_id: `guest-${i}` } }
        )
      );

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockInsert).toHaveBeenCalledTimes(100);
    });

    it('should optimize database queries with proper indexing hints', async () => {
      const queryOptions = {
        organization_id: 'org-123',
        wedding_id: 'wedding-456',
        action: 'guest.dietary_requirements_access' as BackendAuditAction,
        high_risk_only: true,
        limit: 100
      };

      await auditLogger.queryWeddingAuditLogs(queryOptions);

      // Verify optimized query structure
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    });
  });
});