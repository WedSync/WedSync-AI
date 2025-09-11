import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WorkflowPrivacyManager,
  workflowPrivacyManager,
  withWorkflowPrivacy,
  type PrivacyWorkflowHook,
  type WorkflowPrivacyContext
} from '../../../src/lib/integrations/gdpr/workflow-privacy';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null })
                }))
              }))
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      }))
    }))
  }))
}));

describe('WorkflowPrivacyManager', () => {
  let manager: WorkflowPrivacyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WorkflowPrivacyManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerWorkflowPrivacyHook', () => {
    it('should register a valid privacy hook', () => {
      const hook: PrivacyWorkflowHook = {
        operation: 'create',
        entityType: 'guest_info',
        dataFields: ['email', 'name'],
        requiresConsent: true,
        retentionPeriod: 365,
        purpose: 'wedding_planning'
      };

      expect(() => {
        manager.registerWorkflowPrivacyHook('wedding_workflow', hook);
      }).not.toThrow();
    });

    it('should validate hook schema and reject invalid hooks', () => {
      const invalidHook = {
        operation: 'invalid_operation',
        entityType: 'guest_info',
        dataFields: ['email'],
        requiresConsent: true,
        purpose: 'wedding_planning'
      } as any;

      expect(() => {
        manager.registerWorkflowPrivacyHook('wedding_workflow', invalidHook);
      }).toThrow();
    });

    it('should allow multiple hooks for the same workflow', () => {
      const hook1: PrivacyWorkflowHook = {
        operation: 'create',
        entityType: 'guest_info',
        dataFields: ['email'],
        requiresConsent: true,
        purpose: 'wedding_planning'
      };

      const hook2: PrivacyWorkflowHook = {
        operation: 'update',
        entityType: 'guest_info',
        dataFields: ['phone'],
        requiresConsent: false,
        purpose: 'contact_updates'
      };

      manager.registerWorkflowPrivacyHook('wedding_workflow', hook1);
      manager.registerWorkflowPrivacyHook('wedding_workflow', hook2);

      expect(manager['privacyHooks'].get('wedding_workflow')).toHaveLength(2);
    });
  });

  describe('validatePrivacyCompliance', () => {
    beforeEach(() => {
      const hook: PrivacyWorkflowHook = {
        operation: 'create',
        entityType: 'guest_info',
        dataFields: ['email', 'name'],
        requiresConsent: true,
        purpose: 'wedding_planning'
      };
      manager.registerWorkflowPrivacyHook('wedding_workflow', hook);
    });

    it('should pass compliance when user has valid consent', async () => {
      const context: WorkflowPrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        userRole: 'couple',
        consentStatus: {
          hasDataProcessingConsent: true,
          hasMarketingConsent: false,
          hasPhotoSharingConsent: false,
          consentTimestamp: new Date(),
          consentVersion: '1.0'
        }
      };

      mockSupabaseClient.from().select().eq().eq().eq().order().limit().single.mockResolvedValue({
        data: { hasConsent: true, consentDate: new Date() }
      });

      const result = await manager.validatePrivacyCompliance(
        'wedding_workflow',
        'create',
        context,
        { email: 'test@example.com', name: 'Test User' }
      );

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail compliance when user lacks required consent', async () => {
      const context: WorkflowPrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        userRole: 'couple',
        consentStatus: {
          hasDataProcessingConsent: false,
          hasMarketingConsent: false,
          hasPhotoSharingConsent: false,
          consentTimestamp: new Date(),
          consentVersion: '1.0'
        }
      };

      const result = await manager.validatePrivacyCompliance(
        'wedding_workflow',
        'create',
        context,
        { email: 'test@example.com' }
      );

      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.requiresConsent).toBe(true);
    });

    it('should handle workflows with no registered hooks', async () => {
      const context: WorkflowPrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        userRole: 'couple',
        consentStatus: {
          hasDataProcessingConsent: true,
          hasMarketingConsent: false,
          hasPhotoSharingConsent: false,
          consentTimestamp: new Date(),
          consentVersion: '1.0'
        }
      };

      const result = await manager.validatePrivacyCompliance(
        'unknown_workflow',
        'create',
        context,
        {}
      );

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('integratePastWorkflowStep', () => {
    beforeEach(() => {
      const hook: PrivacyWorkflowHook = {
        operation: 'create',
        entityType: 'guest_info',
        dataFields: ['email', 'phone'],
        requiresConsent: true,
        purpose: 'wedding_coordination'
      };
      manager.registerWorkflowPrivacyHook('wedding_workflow', hook);
    });

    it('should allow step execution with valid consent', async () => {
      const context: WorkflowPrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        userRole: 'couple',
        consentStatus: {
          hasDataProcessingConsent: true,
          hasMarketingConsent: false,
          hasPhotoSharingConsent: false,
          consentTimestamp: new Date(),
          consentVersion: '1.0'
        }
      };

      const result = await manager.integratePastWorkflowStep(
        'wedding_workflow',
        'step1',
        context,
        { email: 'test@example.com', phone: '+1234567890' }
      );

      expect(result.allowed).toBe(true);
      expect(result.consentRequired).toHaveLength(0);
      expect(result.privacyNotices.length).toBeGreaterThan(0);
    });

    it('should block step execution without required consent', async () => {
      const context: WorkflowPrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        userRole: 'couple',
        consentStatus: {
          hasDataProcessingConsent: false,
          hasMarketingConsent: false,
          hasPhotoSharingConsent: false,
          consentTimestamp: new Date(),
          consentVersion: '1.0'
        }
      };

      const result = await manager.integratePastWorkflowStep(
        'wedding_workflow',
        'step1',
        context,
        { email: 'test@example.com' }
      );

      expect(result.allowed).toBe(false);
      expect(result.consentRequired.length).toBeGreaterThan(0);
    });

    it('should log privacy workflow events', async () => {
      const context: WorkflowPrivacyContext = {
        userId: 'user123',
        sessionId: 'session123',
        userRole: 'couple',
        consentStatus: {
          hasDataProcessingConsent: true,
          hasMarketingConsent: false,
          hasPhotoSharingConsent: false,
          consentTimestamp: new Date(),
          consentVersion: '1.0'
        }
      };

      await manager.integratePastWorkflowStep(
        'wedding_workflow',
        'step1',
        context,
        { email: 'test@example.com' }
      );

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('privacy_workflow_events');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalled();
    });
  });

  describe('automaticPrivacyCleanup', () => {
    beforeEach(() => {
      const hook: PrivacyWorkflowHook = {
        operation: 'create',
        entityType: 'temp_data',
        dataFields: ['temp_field'],
        requiresConsent: false,
        retentionPeriod: 30,
        purpose: 'temporary_processing'
      };
      manager.registerWorkflowPrivacyHook('cleanup_workflow', hook);
    });

    it('should delete expired data based on retention policies', async () => {
      await manager.automaticPrivacyCleanup('cleanup_workflow');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('privacy_workflow_events');
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });

    it('should handle workflows without retention policies', async () => {
      const hook: PrivacyWorkflowHook = {
        operation: 'create',
        entityType: 'permanent_data',
        dataFields: ['field'],
        requiresConsent: false,
        purpose: 'permanent_storage'
      };
      manager.registerWorkflowPrivacyHook('permanent_workflow', hook);

      await manager.automaticPrivacyCleanup('permanent_workflow');

      // Should not attempt to delete anything
      expect(mockSupabaseClient.from().delete).not.toHaveBeenCalled();
    });
  });

  describe('getWorkflowPrivacyReport', () => {
    it('should generate comprehensive privacy report', async () => {
      const mockEvents = [
        {
          workflow_id: 'workflow1',
          data_processed: ['email', 'name'],
          created_at: new Date().toISOString()
        }
      ];

      const mockConsent = {
        hasDataProcessingConsent: true,
        hasMarketingConsent: false,
        hasPhotoSharingConsent: true,
        consentTimestamp: new Date(),
        consentVersion: '1.0'
      };

      mockSupabaseClient.from().select().eq().eq.mockResolvedValue({ data: mockEvents });
      mockSupabaseClient.from().select().eq().order().limit().single.mockResolvedValue({ data: mockConsent });

      const report = await manager.getWorkflowPrivacyReport('workflow1', 'user123');

      expect(report).toHaveProperty('dataProcessed');
      expect(report).toHaveProperty('consentStatus');
      expect(report).toHaveProperty('privacyEvents');
      expect(report).toHaveProperty('retentionPolicies');
      expect(report.privacyEvents).toEqual(mockEvents);
    });

    it('should handle missing consent data gracefully', async () => {
      mockSupabaseClient.from().select().eq().eq.mockResolvedValue({ data: [] });
      mockSupabaseClient.from().select().eq().order().limit().single.mockResolvedValue({ data: null });

      const report = await manager.getWorkflowPrivacyReport('workflow1', 'user123');

      expect(report.consentStatus).toEqual({
        hasDataProcessingConsent: false,
        hasMarketingConsent: false,
        hasPhotoSharingConsent: false,
        consentTimestamp: expect.any(Date),
        consentVersion: '1.0'
      });
    });
  });

  describe('Private helper methods', () => {
    describe('isPersonalData', () => {
      it('should identify personal data fields correctly', () => {
        const testData = { email: 'test@example.com', age: 25, id: '123' };
        
        expect(manager['isPersonalData']('email', testData)).toBe(true);
        expect(manager['isPersonalData']('phone', testData)).toBe(false);
        expect(manager['isPersonalData']('age', testData)).toBe(false);
      });

      it('should handle various personal data patterns', () => {
        const testData = { 
          user_name: 'John',
          personal_info: 'sensitive',
          contact_email: 'john@example.com'
        };

        expect(manager['isPersonalData']('user_name', testData)).toBe(true);
        expect(manager['isPersonalData']('personal_info', testData)).toBe(true);
        expect(manager['isPersonalData']('contact_email', testData)).toBe(true);
      });
    });

    describe('containsPersonalData', () => {
      it('should detect personal data in field arrays', () => {
        const data = { email: 'test@example.com', name: 'John', id: '123' };
        const fields = ['email', 'name'];

        expect(manager['containsPersonalData'](data, fields)).toBe(true);
      });

      it('should return false when no personal data is present', () => {
        const data = { id: '123', timestamp: '2024-01-01' };
        const fields = ['id', 'timestamp'];

        expect(manager['containsPersonalData'](data, fields)).toBe(false);
      });
    });
  });
});

describe('withWorkflowPrivacy Higher-Order Function', () => {
  const mockContext: WorkflowPrivacyContext = {
    userId: 'user123',
    sessionId: 'session123',
    userRole: 'couple',
    consentStatus: {
      hasDataProcessingConsent: true,
      hasMarketingConsent: false,
      hasPhotoSharingConsent: false,
      consentTimestamp: new Date(),
      consentVersion: '1.0'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute operation and log success', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success result');

    const result = await withWorkflowPrivacy(
      'test_workflow',
      mockContext,
      mockOperation
    );

    expect(result).toBe('success result');
    expect(mockOperation).toHaveBeenCalled();
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_id: 'test_workflow',
        user_id: 'user123',
        operation: 'workflow_execution',
        status: 'success'
      })
    );
  });

  it('should log errors and re-throw them', async () => {
    const testError = new Error('Test error');
    const mockOperation = vi.fn().mockRejectedValue(testError);

    await expect(withWorkflowPrivacy(
      'test_workflow',
      mockContext,
      mockOperation
    )).rejects.toThrow('Test error');

    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_id: 'test_workflow',
        status: 'error',
        error_message: 'Test error'
      })
    );
  });

  it('should measure execution duration', async () => {
    const mockOperation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('result'), 100))
    );

    await withWorkflowPrivacy(
      'test_workflow',
      mockContext,
      mockOperation
    );

    const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
    expect(insertCall.duration_ms).toBeGreaterThan(0);
  });

  it('should handle unknown error types gracefully', async () => {
    const mockOperation = vi.fn().mockRejectedValue('string error');

    await expect(withWorkflowPrivacy(
      'test_workflow',
      mockContext,
      mockOperation
    )).rejects.toBe('string error');

    expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        error_message: 'Unknown error'
      })
    );
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complex workflow scenarios', async () => {
    const manager = new WorkflowPrivacyManager();

    // Register multiple hooks for a complex wedding workflow
    const guestInfoHook: PrivacyWorkflowHook = {
      operation: 'create',
      entityType: 'guest_info',
      dataFields: ['email', 'name', 'phone'],
      requiresConsent: true,
      retentionPeriod: 1095, // 3 years
      purpose: 'wedding_planning'
    };

    const photoSharingHook: PrivacyWorkflowHook = {
      operation: 'share',
      entityType: 'photos',
      dataFields: ['photo_url', 'guest_tags'],
      requiresConsent: true,
      purpose: 'photo_sharing'
    };

    manager.registerWorkflowPrivacyHook('complex_wedding_workflow', guestInfoHook);
    manager.registerWorkflowPrivacyHook('complex_wedding_workflow', photoSharingHook);

    const context: WorkflowPrivacyContext = {
      userId: 'user123',
      weddingId: 'wedding456',
      sessionId: 'session789',
      userRole: 'couple',
      consentStatus: {
        hasDataProcessingConsent: true,
        hasMarketingConsent: false,
        hasPhotoSharingConsent: true,
        consentTimestamp: new Date(),
        consentVersion: '2.0'
      }
    };

    // Test guest info creation
    const guestCreationResult = await manager.validatePrivacyCompliance(
      'complex_wedding_workflow',
      'create',
      context,
      { email: 'guest@example.com', name: 'Guest Name', phone: '+1234567890' }
    );

    expect(guestCreationResult.compliant).toBe(true);

    // Test photo sharing
    const photoSharingResult = await manager.integratePastWorkflowStep(
      'complex_wedding_workflow',
      'photo_sharing_step',
      context,
      { photo_url: 'https://example.com/photo.jpg', guest_tags: ['guest@example.com'] }
    );

    expect(photoSharingResult.allowed).toBe(true);
    expect(photoSharingResult.privacyNotices.length).toBeGreaterThan(0);
  });

  it('should maintain data consistency across multiple operations', async () => {
    const manager = new WorkflowPrivacyManager();
    const operations = [];

    for (let i = 0; i < 5; i++) {
      const operation = withWorkflowPrivacy(
        'test_workflow',
        {
          userId: `user${i}`,
          sessionId: `session${i}`,
          userRole: 'couple',
          consentStatus: {
            hasDataProcessingConsent: true,
            hasMarketingConsent: false,
            hasPhotoSharingConsent: false,
            consentTimestamp: new Date(),
            consentVersion: '1.0'
          }
        },
        async () => `result${i}`
      );
      operations.push(operation);
    }

    const results = await Promise.all(operations);
    
    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result).toBe(`result${index}`);
    });

    // Verify all operations were logged
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(5);
  });
});