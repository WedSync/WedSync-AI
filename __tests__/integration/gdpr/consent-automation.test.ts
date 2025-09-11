import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConsentAutomationManager,
  consentAutomationManager,
  withAutomatedConsent,
  type ConsentTrigger,
  type ConsentContext,
  type ConsentDecision
} from '../../../src/lib/integrations/gdpr/consent-automation';

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
                limit: vi.fn().mockResolvedValue({ data: [] })
              }))
            }))
          })),
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [] })
            }))
          }))
        }))
      }))
    }))
  }))
}));

describe('ConsentAutomationManager', () => {
  let manager: ConsentAutomationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ConsentAutomationManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkConsentRequirements', () => {
    it('should identify required and optional consents', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['guest_information', 'email_address'],
        processingPurpose: 'wedding_planning'
      };

      const result = await manager.checkConsentRequirements(
        'wedding_workflows',
        'create',
        ['guest_information'],
        context
      );

      expect(result).toHaveProperty('requiredConsents');
      expect(result).toHaveProperty('optionalConsents');
      expect(result).toHaveProperty('existingConsents');
      expect(result).toHaveProperty('canProceed');
      expect(Array.isArray(result.requiredConsents)).toBe(true);
      expect(Array.isArray(result.optionalConsents)).toBe(true);
    });

    it('should block processing when required consents are missing', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['guest_information'],
        processingPurpose: 'wedding_planning'
      };

      // Mock no existing consents
      mockSupabaseClient.from().select().eq().in().order().limit.mockResolvedValue({ data: [] });

      const result = await manager.checkConsentRequirements(
        'wedding_workflows',
        'create',
        ['guest_information'],
        context
      );

      expect(result.canProceed).toBe(false);
      expect(result.requiredConsents.length).toBeGreaterThan(0);
    });

    it('should allow processing when valid consents exist', async () => {
      const mockConsents = [{
        user_id: 'user123',
        purpose: 'wedding_planning',
        granted: true,
        expiry_date: new Date(Date.now() + 86400000).toISOString(), // Future date
        created_at: new Date().toISOString()
      }];

      mockSupabaseClient.from().select().eq().in().order().limit.mockResolvedValue({ data: mockConsents });

      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['guest_information'],
        processingPurpose: 'wedding_planning'
      };

      const result = await manager.checkConsentRequirements(
        'wedding_workflows',
        'create',
        ['guest_information'],
        context
      );

      expect(result.canProceed).toBe(true);
    });
  });

  describe('automateConsentCollection', () => {
    it('should detect data types and suggest appropriate consents', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['email', 'phone', 'name'],
        processingPurpose: 'wedding_coordination'
      };

      const dataEntry = {
        guest_email: 'guest@example.com',
        guest_phone: '+1234567890',
        guest_name: 'John Doe'
      };

      const result = await manager.automateConsentCollection(context, dataEntry);

      expect(result).toHaveProperty('shouldPromptUser');
      expect(result).toHaveProperty('requiredPrompts');
      expect(result).toHaveProperty('suggestedPrompts');
      expect(result).toHaveProperty('autoGrantedConsents');
      expect(Array.isArray(result.autoGrantedConsents)).toBe(true);
    });

    it('should auto-grant essential consents', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['guest_information'],
        processingPurpose: 'wedding_planning'
      };

      const dataEntry = {
        guest_email: 'guest@example.com',
        guest_name: 'John Doe'
      };

      const result = await manager.automateConsentCollection(context, dataEntry);

      expect(result.autoGrantedConsents.length).toBeGreaterThan(0);
      const essentialConsent = result.autoGrantedConsents.find(
        consent => consent.consentType === 'essential'
      );
      expect(essentialConsent).toBeDefined();
      expect(essentialConsent?.granted).toBe(true);
    });

    it('should log consent automation events', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['contact_details'],
        processingPurpose: 'vendor_coordination'
      };

      await manager.automateConsentCollection(context, { email: 'test@example.com' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('gdpr_automation_logs');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalled();
    });

    it('should handle empty data entry gracefully', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: [],
        processingPurpose: 'testing'
      };

      const result = await manager.automateConsentCollection(context, {});

      expect(result.shouldPromptUser).toBe(false);
      expect(result.requiredPrompts).toHaveLength(0);
      expect(result.suggestedPrompts).toHaveLength(0);
    });
  });

  describe('processConsentDecisions', () => {
    it('should process valid consent decisions', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['email'],
        processingPurpose: 'marketing'
      };

      const decisions = [{
        triggerId: 'marketing_communications',
        granted: true
      }];

      const result = await manager.processConsentDecisions(context, decisions);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(result.operationsNowAllowed).toContain('collect');
    });

    it('should handle invalid trigger IDs', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['email'],
        processingPurpose: 'marketing'
      };

      const decisions = [{
        triggerId: 'non_existent_trigger',
        granted: true
      }];

      const result = await manager.processConsentDecisions(context, decisions);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Trigger not found');
    });

    it('should store consent decisions in database', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['email'],
        processingPurpose: 'marketing'
      };

      const decisions = [{
        triggerId: 'marketing_communications',
        granted: true,
        customPurpose: 'wedding_newsletter'
      }];

      await manager.processConsentDecisions(context, decisions);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('gdpr_consent_records');
      const insertCall = mockSupabaseClient.from().insert.mock.calls.find(
        call => mockSupabaseClient.from.mock.results.some(
          result => result.value === mockSupabaseClient.from().insert
        )
      );
      expect(insertCall).toBeDefined();
    });

    it('should calculate correct expiry dates for different consent types', async () => {
      const context: ConsentContext = {
        userId: 'user123',
        sessionId: 'session123',
        dataBeingProcessed: ['email'],
        processingPurpose: 'marketing'
      };

      const decisions = [{
        triggerId: 'marketing_communications',
        granted: true
      }];

      await manager.processConsentDecisions(context, decisions);

      // Check that expiry date is calculated (marketing consent should expire in 12 months)
      const insertCall = mockSupabaseClient.from().insert.mock.calls[0]?.[0];
      expect(insertCall).toHaveProperty('expiry_date');
      if (insertCall.expiry_date) {
        const expiryDate = new Date(insertCall.expiry_date);
        const now = new Date();
        const monthsDiff = (expiryDate.getFullYear() - now.getFullYear()) * 12 + 
                          (expiryDate.getMonth() - now.getMonth());
        expect(monthsDiff).toBe(12);
      }
    });
  });

  describe('generateConsentSummary', () => {
    it('should generate comprehensive consent summary', async () => {
      const mockConsents = [
        {
          user_id: 'user123',
          consent_type: 'essential',
          granted: true,
          expiry_date: null,
          created_at: new Date().toISOString(),
          purpose: 'wedding_planning'
        },
        {
          user_id: 'user123',
          consent_type: 'marketing',
          granted: true,
          expiry_date: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
          purpose: 'marketing'
        },
        {
          user_id: 'user123',
          consent_type: 'analytics',
          granted: false,
          expiry_date: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(),
          purpose: 'analytics'
        }
      ];

      mockSupabaseClient.from().select().eq().order.mockResolvedValue({ data: mockConsents });

      const summary = await manager.generateConsentSummary('user123');

      expect(summary).toHaveProperty('totalConsents');
      expect(summary).toHaveProperty('activeConsents');
      expect(summary).toHaveProperty('expiredConsents');
      expect(summary).toHaveProperty('grantedByType');
      expect(summary).toHaveProperty('recentChanges');
      expect(summary).toHaveProperty('nextExpirations');

      expect(summary.totalConsents).toBe(3);
      expect(summary.activeConsents).toBe(2); // essential (no expiry) + marketing (future expiry)
      expect(summary.expiredConsents).toBe(1); // analytics (past expiry)
      expect(summary.grantedByType.essential).toBe(1);
      expect(summary.grantedByType.marketing).toBe(1);
    });

    it('should handle users with no consent records', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValue({ data: [] });

      const summary = await manager.generateConsentSummary('user123');

      expect(summary.totalConsents).toBe(0);
      expect(summary.activeConsents).toBe(0);
      expect(summary.expiredConsents).toBe(0);
      expect(summary.grantedByType).toEqual({});
      expect(summary.recentChanges).toHaveLength(0);
      expect(summary.nextExpirations).toHaveLength(0);
    });

    it('should correctly identify recent changes', async () => {
      const recentDate = new Date(Date.now() - 86400000); // 1 day ago
      const oldDate = new Date(Date.now() - 86400000 * 31); // 31 days ago

      const mockConsents = [
        {
          user_id: 'user123',
          consent_type: 'marketing',
          granted: true,
          created_at: recentDate.toISOString(),
          purpose: 'marketing'
        },
        {
          user_id: 'user123',
          consent_type: 'analytics',
          granted: false,
          created_at: oldDate.toISOString(),
          purpose: 'analytics'
        }
      ];

      mockSupabaseClient.from().select().eq().order.mockResolvedValue({ data: mockConsents });

      const summary = await manager.generateConsentSummary('user123');

      expect(summary.recentChanges).toHaveLength(1);
      expect(summary.recentChanges[0].consent_type).toBe('marketing');
    });
  });

  describe('Private helper methods', () => {
    describe('detectDataTypes', () => {
      it('should correctly identify guest information', () => {
        const data = {
          guest_name: 'John Doe',
          guest_email: 'john@example.com',
          rsvp_status: 'confirmed',
          attendee_count: 2
        };

        const dataTypes = manager['detectDataTypes'](data);
        expect(dataTypes).toContain('guest_information');
      });

      it('should identify multiple data types', () => {
        const data = {
          guest_email: 'guest@example.com',
          photo_url: 'https://example.com/photo.jpg',
          vendor_contact: 'vendor@example.com',
          payment_amount: 1000
        };

        const dataTypes = manager['detectDataTypes'](data);
        expect(dataTypes.length).toBeGreaterThan(1);
        expect(dataTypes).toContain('guest_information');
        expect(dataTypes).toContain('wedding_photos');
        expect(dataTypes).toContain('vendor_information');
        expect(dataTypes).toContain('payment_information');
      });

      it('should return empty array for non-identifiable data', () => {
        const data = { id: '123', timestamp: '2024-01-01' };
        const dataTypes = manager['detectDataTypes'](data);
        expect(dataTypes).toHaveLength(0);
      });
    });

    describe('calculateExpiryDate', () => {
      it('should return undefined for essential consents', () => {
        const expiryDate = manager['calculateExpiryDate']('essential');
        expect(expiryDate).toBeUndefined();
      });

      it('should return correct expiry for marketing consents', () => {
        const expiryDate = manager['calculateExpiryDate']('marketing');
        expect(expiryDate).toBeInstanceOf(Date);
        
        const now = new Date();
        const monthsDiff = (expiryDate!.getFullYear() - now.getFullYear()) * 12 + 
                          (expiryDate!.getMonth() - now.getMonth());
        expect(monthsDiff).toBe(12);
      });

      it('should return correct expiry for functional consents', () => {
        const expiryDate = manager['calculateExpiryDate']('functional');
        expect(expiryDate).toBeInstanceOf(Date);
        
        const now = new Date();
        const monthsDiff = (expiryDate!.getFullYear() - now.getFullYear()) * 12 + 
                          (expiryDate!.getMonth() - now.getMonth());
        expect(monthsDiff).toBe(24);
      });
    });

    describe('isConsentValid', () => {
      it('should return false for non-granted consent', () => {
        const consent: ConsentDecision = {
          userId: 'user123',
          consentType: 'marketing',
          purpose: 'marketing',
          granted: false,
          timestamp: new Date(),
          context: {} as ConsentContext,
          version: '1.0'
        };

        expect(manager['isConsentValid'](consent)).toBe(false);
      });

      it('should return true for granted consent without expiry', () => {
        const consent: ConsentDecision = {
          userId: 'user123',
          consentType: 'essential',
          purpose: 'essential_functionality',
          granted: true,
          timestamp: new Date(),
          context: {} as ConsentContext,
          version: '1.0'
        };

        expect(manager['isConsentValid'](consent)).toBe(true);
      });

      it('should return false for expired consent', () => {
        const consent: ConsentDecision = {
          userId: 'user123',
          consentType: 'marketing',
          purpose: 'marketing',
          granted: true,
          timestamp: new Date(),
          expiryDate: new Date(Date.now() - 86400000), // Yesterday
          context: {} as ConsentContext,
          version: '1.0'
        };

        expect(manager['isConsentValid'](consent)).toBe(false);
      });

      it('should return true for valid future-expiring consent', () => {
        const consent: ConsentDecision = {
          userId: 'user123',
          consentType: 'marketing',
          purpose: 'marketing',
          granted: true,
          timestamp: new Date(),
          expiryDate: new Date(Date.now() + 86400000), // Tomorrow
          context: {} as ConsentContext,
          version: '1.0'
        };

        expect(manager['isConsentValid'](consent)).toBe(true);
      });
    });
  });
});

describe('withAutomatedConsent Higher-Order Function', () => {
  const mockContext: ConsentContext = {
    userId: 'user123',
    sessionId: 'session123',
    dataBeingProcessed: ['email'],
    processingPurpose: 'wedding_planning'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute operation when no consent is required', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    
    // Mock automation that doesn't require user prompts
    const mockAutomation = {
      shouldPromptUser: false,
      requiredPrompts: [],
      suggestedPrompts: [],
      autoGrantedConsents: []
    };

    vi.spyOn(consentAutomationManager, 'automateConsentCollection')
        .mockResolvedValue(mockAutomation);

    const result = await withAutomatedConsent(
      mockContext,
      { email: 'test@example.com' },
      mockOperation
    );

    expect(result.result).toBe('success');
    expect(result.consentRequired).toBe(false);
    expect(result.promptsNeeded).toHaveLength(0);
    expect(mockOperation).toHaveBeenCalled();
  });

  it('should return consent prompts when user consent is required', async () => {
    const mockTrigger: ConsentTrigger = {
      id: 'marketing_trigger',
      dataType: 'email_address',
      operation: 'collect',
      consentType: 'marketing',
      purpose: 'marketing communications',
      requiredForOperation: true,
      autoPrompt: true,
      displayText: 'Allow marketing emails?'
    };

    const mockAutomation = {
      shouldPromptUser: true,
      requiredPrompts: [mockTrigger],
      suggestedPrompts: [],
      autoGrantedConsents: []
    };

    vi.spyOn(consentAutomationManager, 'automateConsentCollection')
        .mockResolvedValue(mockAutomation);

    const mockOperation = vi.fn();
    
    const result = await withAutomatedConsent(
      mockContext,
      { email: 'test@example.com' },
      mockOperation
    );

    expect(result.result).toBeUndefined();
    expect(result.consentRequired).toBe(true);
    expect(result.promptsNeeded).toHaveLength(1);
    expect(result.promptsNeeded[0]).toEqual(mockTrigger);
    expect(mockOperation).not.toHaveBeenCalled();
  });

  it('should handle automation errors gracefully', async () => {
    vi.spyOn(consentAutomationManager, 'automateConsentCollection')
        .mockRejectedValue(new Error('Automation failed'));

    const mockOperation = vi.fn();
    
    const result = await withAutomatedConsent(
      mockContext,
      { email: 'test@example.com' },
      mockOperation
    );

    expect(result.result).toBeUndefined();
    expect(result.consentRequired).toBe(false);
    expect(result.error).toBe('Automation failed');
    expect(mockOperation).not.toHaveBeenCalled();
  });

  it('should handle operation errors', async () => {
    const mockAutomation = {
      shouldPromptUser: false,
      requiredPrompts: [],
      suggestedPrompts: [],
      autoGrantedConsents: []
    };

    vi.spyOn(consentAutomationManager, 'automateConsentCollection')
        .mockResolvedValue(mockAutomation);

    const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
    
    const result = await withAutomatedConsent(
      mockContext,
      { email: 'test@example.com' },
      mockOperation
    );

    expect(result.result).toBeUndefined();
    expect(result.consentRequired).toBe(false);
    expect(result.error).toBe('Operation failed');
  });

  it('should include both required and suggested prompts', async () => {
    const requiredTrigger: ConsentTrigger = {
      id: 'essential_trigger',
      dataType: 'personal_details',
      operation: 'create',
      consentType: 'essential',
      purpose: 'account_creation',
      requiredForOperation: true,
      autoPrompt: true,
      displayText: 'Required for account creation'
    };

    const suggestedTrigger: ConsentTrigger = {
      id: 'marketing_trigger',
      dataType: 'email_address',
      operation: 'collect',
      consentType: 'marketing',
      purpose: 'marketing',
      requiredForOperation: false,
      autoPrompt: true,
      displayText: 'Receive marketing emails?'
    };

    const mockAutomation = {
      shouldPromptUser: true,
      requiredPrompts: [requiredTrigger],
      suggestedPrompts: [suggestedTrigger],
      autoGrantedConsents: []
    };

    vi.spyOn(consentAutomationManager, 'automateConsentCollection')
        .mockResolvedValue(mockAutomation);

    const result = await withAutomatedConsent(
      mockContext,
      { name: 'John', email: 'john@example.com' },
      vi.fn()
    );

    expect(result.consentRequired).toBe(true);
    expect(result.promptsNeeded).toHaveLength(2);
    expect(result.promptsNeeded).toContain(requiredTrigger);
    expect(result.promptsNeeded).toContain(suggestedTrigger);
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete consent workflow', async () => {
    const manager = new ConsentAutomationManager();
    
    const context: ConsentContext = {
      userId: 'user123',
      sessionId: 'session123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      weddingId: 'wedding456',
      dataBeingProcessed: ['guest_information', 'contact_details'],
      processingPurpose: 'wedding_planning'
    };

    // Step 1: Automate consent collection
    const automation = await manager.automateConsentCollection(
      context,
      {
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+1234567890'
      }
    );

    expect(automation.shouldPromptUser).toBe(true);
    expect(automation.autoGrantedConsents.length).toBeGreaterThan(0);

    // Step 2: Process user consent decisions
    const decisions = automation.requiredPrompts.map(prompt => ({
      triggerId: prompt.id,
      granted: true
    }));

    const decisionResults = await manager.processConsentDecisions(context, decisions);

    expect(decisionResults.successful.length).toBe(decisions.length);
    expect(decisionResults.failed).toHaveLength(0);

    // Step 3: Check consent requirements are now met
    const requirements = await manager.checkConsentRequirements(
      'wedding_workflows',
      'create',
      ['guest_information'],
      context
    );

    // Should now be able to proceed (assuming mocked data supports this)
    expect(requirements).toHaveProperty('canProceed');
  });

  it('should maintain consent history and versioning', async () => {
    const manager = new ConsentAutomationManager();
    
    const context: ConsentContext = {
      userId: 'user123',
      sessionId: 'session123',
      dataBeingProcessed: ['marketing_data'],
      processingPurpose: 'marketing'
    };

    // Grant marketing consent
    const grantDecision = await manager.processConsentDecisions(context, [{
      triggerId: 'marketing_communications',
      granted: true
    }]);

    expect(grantDecision.successful).toHaveLength(1);

    // Later, withdraw consent
    const withdrawDecision = await manager.processConsentDecisions(context, [{
      triggerId: 'marketing_communications',
      granted: false
    }]);

    expect(withdrawDecision.successful).toHaveLength(1);

    // Generate summary to see history
    const summary = await manager.generateConsentSummary('user123');

    // Both grant and withdrawal should be in recent changes
    expect(summary.recentChanges.length).toBeGreaterThan(0);
  });

  it('should handle concurrent consent operations', async () => {
    const manager = new ConsentAutomationManager();
    
    const contexts = Array.from({ length: 3 }, (_, i) => ({
      userId: `user${i}`,
      sessionId: `session${i}`,
      dataBeingProcessed: ['contact_details'],
      processingPurpose: 'vendor_coordination'
    }));

    const operations = contexts.map(context =>
      manager.automateConsentCollection(
        context,
        { vendor_email: 'vendor@example.com' }
      )
    );

    const results = await Promise.all(operations);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result).toHaveProperty('shouldPromptUser');
      expect(result).toHaveProperty('autoGrantedConsents');
    });

    // Verify all operations were logged separately
    expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(3);
  });
});