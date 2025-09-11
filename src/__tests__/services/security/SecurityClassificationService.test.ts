import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { SecurityClassificationService } from '@/lib/services/security/SecurityClassificationService';
import { TestFramework, TestEnvironment } from '@/lib/testing/TestFramework';

describe('SecurityClassificationService', () => {
  let testFramework: TestFramework;
  let testEnv: TestEnvironment;
  let service: SecurityClassificationService;

  beforeAll(async () => {
    testFramework = new TestFramework();
    testEnv = await testFramework.initializeTestEnvironment();
    service = new SecurityClassificationService();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Classification Level Validation', () => {
    test('should validate classification levels 0-10', async () => {
      // Valid levels
      for (let level = 0; level <= 10; level++) {
        const result = await service.validateClassificationLevel(level);
        expect(result.valid).toBe(true);
        expect(result.level_name).toBeDefined();
      }
    });

    test('should reject invalid classification levels', async () => {
      const invalidLevels = [-1, 11, 15, 100, -5];

      for (const level of invalidLevels) {
        const result = await service.validateClassificationLevel(level);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid classification level');
      }
    });

    test('should handle string classification levels', async () => {
      const result = await service.validateClassificationLevel('5' as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a number');
    });
  });

  describe('Classification Level Descriptions', () => {
    test('should return correct descriptions for each level', async () => {
      const expectedDescriptions = [
        { level: 0, name: 'PUBLIC', description: 'Public information' },
        { level: 1, name: 'INTERNAL', description: 'Internal use only' },
        { level: 2, name: 'RESTRICTED', description: 'Restricted access' },
        {
          level: 3,
          name: 'CONFIDENTIAL',
          description: 'Confidential information',
        },
        { level: 4, name: 'SECRET', description: 'Secret information' },
        { level: 5, name: 'TOP_SECRET', description: 'Top secret information' },
        {
          level: 6,
          name: 'BUSINESS_CRITICAL',
          description: 'Business critical systems',
        },
        {
          level: 7,
          name: 'PAYMENT_SENSITIVE',
          description: 'Payment and financial data',
        },
        {
          level: 8,
          name: 'PERSONAL_DATA',
          description: 'Personal and private data',
        },
        {
          level: 9,
          name: 'WEDDING_CRITICAL',
          description: 'Wedding day critical systems',
        },
        {
          level: 10,
          name: 'EMERGENCY_ONLY',
          description: 'Emergency access only',
        },
      ];

      for (const expected of expectedDescriptions) {
        const result = await service.getClassificationInfo(expected.level);
        expect(result.level_name).toBe(expected.name);
        expect(result.description).toContain(expected.description);
      }
    });
  });

  describe('Access Control Matrix', () => {
    test('should enforce proper access control for classification levels', async () => {
      const testCases = [
        { userLevel: 0, dataLevel: 0, shouldAccess: true },
        { userLevel: 0, dataLevel: 5, shouldAccess: false },
        { userLevel: 5, dataLevel: 3, shouldAccess: true },
        { userLevel: 5, dataLevel: 8, shouldAccess: false },
        { userLevel: 10, dataLevel: 10, shouldAccess: true },
      ];

      for (const testCase of testCases) {
        const result = await service.checkAccessPermission(
          testCase.userLevel,
          testCase.dataLevel,
        );
        expect(result.allowed).toBe(testCase.shouldAccess);

        if (!testCase.shouldAccess) {
          expect(result.reason).toContain('Insufficient clearance level');
        }
      }
    });
  });

  describe('Wedding Day Classification', () => {
    test('should handle wedding critical variables correctly', async () => {
      const weddingCriticalData = {
        classification_level: 9,
        wedding_critical: true,
        change_window_restriction: true,
      };

      const result = await service.validateWeddingCritical(weddingCriticalData);
      expect(result.valid).toBe(true);
      expect(result.restrictions.change_window_active).toBe(true);
      expect(result.restrictions.emergency_override_required).toBe(true);
    });

    test('should reject Saturday changes for wedding critical variables', async () => {
      // Mock Saturday
      const originalDate = Date;
      const mockSaturday = new Date('2024-06-01'); // Saturday
      mockSaturday.getDay = () => 6;
      global.Date = jest.fn(() => mockSaturday) as any;

      const result = await service.validateWeddingDayAccess({
        classification_level: 9,
        wedding_critical: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Wedding day protection active');
      expect(result.requires_emergency_override).toBe(true);

      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('Security Audit Logs', () => {
    test('should create audit logs for classification changes', async () => {
      const changeRequest = {
        organization_id: testEnv.testOrganizationId,
        variable_id: 'test-var-123',
        old_classification: 3,
        new_classification: 7,
        user_id: testEnv.testUserId,
        justification:
          'Upgrading to payment sensitive due to Stripe integration',
      };

      const result = await service.requestClassificationChange(changeRequest);
      expect(result.success).toBe(true);
      expect(result.audit_entry_id).toBeDefined();
      expect(result.requires_approval).toBe(true); // Level 3→7 requires approval
    });

    test('should track all security events', async () => {
      const eventData = {
        organization_id: testEnv.testOrganizationId,
        event_type: 'classification_violation_attempt',
        user_id: testEnv.testUserId,
        classification_attempted: 10,
        user_clearance_level: 5,
        variable_id: 'test-var-456',
      };

      const result = await service.logSecurityEvent(eventData);
      expect(result.success).toBe(true);
      expect(result.event_id).toBeDefined();
      expect(result.escalation_required).toBe(true); // Level 10 attempt with level 5 clearance
    });
  });

  describe('Performance Tests', () => {
    test('should handle classification checks efficiently', async () => {
      const { metrics } = await testFramework.measurePerformance(async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(
            service.checkAccessPermission(5, Math.floor(Math.random() * 11)),
          );
        }
        await Promise.all(promises);
      }, 'bulk classification checks');

      expect(metrics.response_time_ms).toBeLessThan(1000); // < 1 second for 100 checks
    });

    test('should cache classification info effectively', async () => {
      // First call - cache miss
      const { metrics: firstCall } = await testFramework.measurePerformance(
        () => service.getClassificationInfo(5),
        'first classification info call',
      );

      // Second call - cache hit
      const { metrics: secondCall } = await testFramework.measurePerformance(
        () => service.getClassificationInfo(5),
        'cached classification info call',
      );

      expect(secondCall.response_time_ms).toBeLessThan(
        firstCall.response_time_ms * 0.5,
      ); // 50% faster
    });
  });

  describe('Compliance Requirements', () => {
    test('should generate GDPR compliance report', async () => {
      const result = await service.generateComplianceReport(
        testEnv.testOrganizationId,
        {
          report_type: 'gdpr',
          include_personal_data_classification: true,
        },
      );

      expect(result.success).toBe(true);
      expect(
        result.report.personal_data_variables_count,
      ).toBeGreaterThanOrEqual(0);
      expect(result.report.compliance_status).toBeDefined();
      expect(result.report.recommendations).toBeDefined();
    });

    test('should identify potential compliance violations', async () => {
      const result = await service.scanForComplianceViolations(
        testEnv.testOrganizationId,
        {
          check_gdpr: true,
          check_pci: true,
          check_sox: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.violations).toBeDefined();
      expect(result.risk_score).toBeGreaterThanOrEqual(0);
      expect(result.risk_score).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid organization access', async () => {
      const fakeOrgId = 'fake-org-id';
      const result = await service.checkAccessPermission(5, 5, fakeOrgId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Organization access denied');
    });

    test('should handle database connection errors gracefully', async () => {
      // Mock database failure
      const originalSupabase = service.supabase;
      service.supabase = {
        from: () => {
          throw new Error('Database connection failed');
        },
      } as any;

      const result = await service.validateClassificationLevel(5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Database connection failed');

      // Restore
      service.supabase = originalSupabase;
    });
  });

  describe('Integration Tests', () => {
    test('should integrate with RBAC service properly', async () => {
      const integrationResult = await service.validateWithRBAC({
        organization_id: testEnv.testOrganizationId,
        user_id: testEnv.testUserId,
        requested_classification: 7,
        action: 'read',
      });

      expect(integrationResult.validation_passed).toBeDefined();
      expect(integrationResult.rbac_check_passed).toBeDefined();
      expect(integrationResult.final_decision).toBeDefined();
    });

    test('should handle emergency override scenarios', async () => {
      const emergencyResult = await service.handleEmergencyOverride({
        organization_id: testEnv.testOrganizationId,
        user_id: testEnv.testUserId,
        override_reason: 'Wedding day emergency - payment system failure',
        requested_classification: 10,
        emergency_contact_id: testEnv.emergencyContactId,
      });

      expect(emergencyResult.override_granted).toBeDefined();
      expect(emergencyResult.audit_trail_created).toBe(true);
      expect(emergencyResult.notifications_sent).toBe(true);
    });
  });

  describe('Security Hardening', () => {
    test('should prevent classification level tampering', async () => {
      const tamperingAttempt = {
        organization_id: testEnv.testOrganizationId,
        user_id: testEnv.testUserId,
        attempted_level: 10,
        user_max_level: 3,
        bypass_attempt: true,
      };

      const result =
        await service.detectClassificationTampering(tamperingAttempt);
      expect(result.tampering_detected).toBe(true);
      expect(result.security_incident_created).toBe(true);
      expect(result.user_flagged_for_review).toBe(true);
    });

    test('should implement rate limiting for classification requests', async () => {
      const requests = [];

      // Attempt 20 rapid classification checks
      for (let i = 0; i < 20; i++) {
        requests.push(service.checkAccessPermission(5, 5));
      }

      const results = await Promise.all(requests);

      // Should have some rate limited responses
      const rateLimited = results.filter((r) => r.rate_limited);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
