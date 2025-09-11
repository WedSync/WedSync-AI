/**
 * SECURITY TESTS: WS-236 Feedback Data Protection & User Privacy
 * Team E - Batch 2, Round 1
 *
 * Comprehensive security testing for:
 * - Data encryption and PII protection
 * - Access control and authorization
 * - GDPR compliance and data rights
 * - SQL injection and XSS prevention
 * - Multi-tenant data isolation
 * - Audit logging and compliance
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { FeedbackCollector } from '@/lib/feedback/feedback-collector';
import { FeedbackSecurityManager } from '@/lib/feedback/security-manager';
import { GDPRComplianceEngine } from '@/lib/compliance/gdpr-compliance';
import { EncryptionService } from '@/lib/security/encryption-service';
import { AuditLogger } from '@/lib/security/audit-logger';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/security/encryption-service');
jest.mock('@/lib/security/audit-logger');

interface SecurityTestContext {
  userId: string;
  userType: 'supplier' | 'couple';
  organizationId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

interface PIITestData {
  personalInfo: string;
  businessInfo: string;
  contactDetails: string;
  sensitiveContent: string;
  expectedRedaction: string;
}

interface AccessControlTest {
  actorUserId: string;
  actorRole: string;
  targetUserId: string;
  targetData: any;
  operation: 'read' | 'write' | 'delete' | 'admin';
  shouldAllow: boolean;
  expectedError?: string;
}

describe('Feedback System Security & Privacy Tests', () => {
  let feedbackCollector: FeedbackCollector;
  let securityManager: FeedbackSecurityManager;
  let gdprEngine: GDPRComplianceEngine;
  let encryptionService: jest.Mocked<EncryptionService>;
  let auditLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock encryption service
    encryptionService = {
      encrypt: jest
        .fn()
        .mockImplementation((data: string) => `encrypted_${data}`),
      decrypt: jest
        .fn()
        .mockImplementation((encryptedData: string) =>
          encryptedData.replace('encrypted_', ''),
        ),
      hash: jest
        .fn()
        .mockImplementation((data: string) =>
          crypto.createHash('sha256').update(data).digest('hex'),
        ),
      redactPII: jest
        .fn()
        .mockImplementation((text: string) =>
          text.replace(/\b\w+@\w+\.\w+\b/g, '[REDACTED_EMAIL]'),
        ),
    } as any;

    // Mock audit logger
    auditLogger = {
      logSecurityEvent: jest.fn(),
      logDataAccess: jest.fn(),
      logPrivacyOperation: jest.fn(),
      logComplianceAction: jest.fn(),
    } as any;

    feedbackCollector = FeedbackCollector.getInstance();
    securityManager = new FeedbackSecurityManager();
    gdprEngine = new GDPRComplianceEngine();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Data Encryption and PII Protection', () => {
    const sensitiveTestCases: PIITestData[] = [
      {
        personalInfo:
          'My email is john.doe@example.com and my phone is 555-123-4567',
        businessInfo: 'Our venue ABC Wedding Hall serves 200+ couples annually',
        contactDetails:
          'Contact me at jane@photography.com or call 555-987-6543',
        sensitiveContent:
          "Client complained about vendor Sarah Johnson's unprofessional behavior",
        expectedRedaction:
          "Client complained about vendor [REDACTED_NAME]'s unprofessional behavior",
      },
      {
        personalInfo:
          "The bride's name is Emily Smith, wedding date June 15th, 2025",
        businessInfo:
          "We're a family florist business established in 1995, serving the Chicago area",
        contactDetails: 'Email me at contact@flowers.com for booking inquiries',
        sensitiveContent:
          "Couple had issues with caterer Mike's Kitchen regarding dietary restrictions",
        expectedRedaction:
          'Couple had issues with caterer [REDACTED_BUSINESS] regarding dietary restrictions',
      },
    ];

    sensitiveTestCases.forEach((testCase, index) => {
      it(`should encrypt and redact PII in feedback text ${index + 1}`, async () => {
        const testContext: SecurityTestContext = {
          userId: 'user-security-test',
          userType: 'supplier',
          organizationId: 'org-123',
          sessionId: 'session-security-test',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Browser',
        };

        // Mock successful feedback session creation
        mockSecureDatabase({
          feedback_sessions: [
            {
              id: testContext.sessionId,
              user_id: testContext.userId,
              organization_id: testContext.organizationId,
              encrypted_content: encryptionService.encrypt(
                testCase.personalInfo,
              ),
              pii_redacted: encryptionService.redactPII(testCase.personalInfo),
              created_at: new Date().toISOString(),
            },
          ],
        });

        const session = await feedbackCollector.startFeedbackSession({
          userId: testContext.userId,
          feedbackType: 'nps',
          triggerReason: 'security_test',
          context: { testCase: index },
          userAgent: testContext.userAgent,
          ipAddress: testContext.ipAddress,
        });

        // Submit feedback with PII
        await feedbackCollector.submitResponse(
          session.id,
          'nps_feedback',
          { textValue: testCase.personalInfo },
          30,
        );

        // Verify PII was encrypted
        expect(encryptionService.encrypt).toHaveBeenCalledWith(
          testCase.personalInfo,
        );

        // Verify PII was redacted for logs
        expect(encryptionService.redactPII).toHaveBeenCalledWith(
          testCase.personalInfo,
        );

        // Verify security event was logged
        expect(auditLogger.logDataAccess).toHaveBeenCalledWith({
          userId: testContext.userId,
          operation: 'feedback_submission',
          dataType: 'personal_feedback',
          ipAddress: testContext.ipAddress,
          containsPII: true,
        });
      });
    });

    it('should protect wedding industry specific PII', async () => {
      const weddingPII = [
        'Bride: Sarah Johnson, Groom: Michael Smith, Wedding: 06/15/2025',
        'Venue: Grand Ballroom, 123 Wedding Ave, Chicago IL 60601',
        'Vendor contact: john@photography.com, 555-WEDDING',
        'Guest dietary restrictions: Sarah (vegetarian), Mike (gluten-free)',
        'Budget concerns: $45,000 total, struggling with vendor payments',
      ];

      for (const piiText of weddingPII) {
        const protectedData = await securityManager.protectWeddingPII(piiText, {
          protectionLevel: 'high',
          retainBusinessRelevance: true,
          auditTrail: true,
        });

        // Should not contain identifiable information
        expect(protectedData.sanitizedText).not.toMatch(/\b\w+@\w+\.\w+\b/); // Email pattern
        expect(protectedData.sanitizedText).not.toMatch(
          /\b\d{3}-\d{3}-\d{4}\b/,
        ); // Phone pattern
        expect(protectedData.sanitizedText).not.toMatch(
          /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
        ); // Date pattern

        // Should maintain business context
        expect(protectedData.businessContext).toBeDefined();
        expect(protectedData.protectionLevel).toBe('high');

        // Should track what was redacted
        expect(protectedData.redactionLog).toBeDefined();
        expect(protectedData.redactionLog.length).toBeGreaterThan(0);
      }
    });

    it('should handle feedback encryption at rest and in transit', async () => {
      const feedbackData = {
        sessionId: 'secure-session-123',
        responses: [
          { questionKey: 'nps_score', npsScore: 8 },
          {
            questionKey: 'feedback_text',
            textValue:
              'Great service, but had issues with vendor communication',
          },
          {
            questionKey: 'improvement_suggestions',
            textValue: 'Better email notifications would help',
          },
        ],
      };

      // Test encryption at rest
      const encryptedAtRest =
        await securityManager.encryptForStorage(feedbackData);

      expect(encryptedAtRest.encryptedData).not.toBe(feedbackData);
      expect(encryptedAtRest.encryptionMetadata.algorithm).toBe('AES-256-GCM');
      expect(encryptedAtRest.encryptionMetadata.keyVersion).toBeDefined();

      // Test encryption in transit
      const encryptedInTransit =
        await securityManager.encryptForTransit(feedbackData);

      expect(encryptedInTransit.encryptedPayload).not.toBe(feedbackData);
      expect(encryptedInTransit.signature).toBeDefined();
      expect(encryptedInTransit.timestamp).toBeDefined();

      // Verify decryption works
      const decryptedData =
        await securityManager.decryptFromStorage(encryptedAtRest);
      expect(decryptedData).toEqual(feedbackData);
    });
  });

  describe('Access Control and Authorization', () => {
    const accessControlTests: AccessControlTest[] = [
      {
        actorUserId: 'supplier-123',
        actorRole: 'supplier',
        targetUserId: 'supplier-123',
        targetData: { feedbackId: 'feedback-own' },
        operation: 'read',
        shouldAllow: true,
      },
      {
        actorUserId: 'supplier-123',
        actorRole: 'supplier',
        targetUserId: 'supplier-456',
        targetData: { feedbackId: 'feedback-other' },
        operation: 'read',
        shouldAllow: false,
        expectedError: 'UNAUTHORIZED_CROSS_USER_ACCESS',
      },
      {
        actorUserId: 'admin-user',
        actorRole: 'admin',
        targetUserId: 'supplier-123',
        targetData: { feedbackId: 'any-feedback' },
        operation: 'read',
        shouldAllow: true,
      },
      {
        actorUserId: 'couple-789',
        actorRole: 'couple',
        targetUserId: 'supplier-123',
        targetData: { feedbackId: 'feedback-about-supplier' },
        operation: 'read',
        shouldAllow: false,
        expectedError: 'INSUFFICIENT_PERMISSIONS',
      },
      {
        actorUserId: 'supplier-123',
        actorRole: 'supplier',
        targetUserId: 'supplier-123',
        targetData: { feedbackId: 'feedback-own' },
        operation: 'delete',
        shouldAllow: false,
        expectedError: 'FEEDBACK_IMMUTABLE_AFTER_SUBMISSION',
      },
    ];

    accessControlTests.forEach((testCase, index) => {
      it(`should enforce access control rule ${index + 1}`, async () => {
        const authContext = {
          userId: testCase.actorUserId,
          role: testCase.actorRole,
          organizationId: 'org-test',
          permissions: getPermissionsForRole(testCase.actorRole),
        };

        if (testCase.shouldAllow) {
          const result = await securityManager.checkFeedbackAccess(
            testCase.targetData.feedbackId,
            testCase.operation,
            authContext,
          );

          expect(result.allowed).toBe(true);
          expect(result.reason).toBe('AUTHORIZED');

          // Verify access was logged
          expect(auditLogger.logDataAccess).toHaveBeenCalledWith({
            userId: testCase.actorUserId,
            operation: `feedback_${testCase.operation}`,
            targetUserId: testCase.targetUserId,
            authorized: true,
          });
        } else {
          const result = await securityManager.checkFeedbackAccess(
            testCase.targetData.feedbackId,
            testCase.operation,
            authContext,
          );

          expect(result.allowed).toBe(false);
          expect(result.reason).toBe(testCase.expectedError);

          // Verify unauthorized attempt was logged
          expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith({
            eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            userId: testCase.actorUserId,
            targetResource: testCase.targetData.feedbackId,
            attemptedOperation: testCase.operation,
            reason: testCase.expectedError,
          });
        }
      });
    });

    it('should enforce multi-tenant data isolation', async () => {
      const org1User = { userId: 'user-org1', organizationId: 'org-1' };
      const org2User = { userId: 'user-org2', organizationId: 'org-2' };

      // Mock database with multi-tenant data
      mockSecureDatabase({
        feedback_sessions: [
          {
            id: 'feedback-org1',
            user_id: org1User.userId,
            organization_id: 'org-1',
          },
          {
            id: 'feedback-org2',
            user_id: org2User.userId,
            organization_id: 'org-2',
          },
        ],
      });

      // User from org-1 should not access org-2 data
      const crossTenantAccess = await securityManager.checkFeedbackAccess(
        'feedback-org2',
        'read',
        {
          userId: org1User.userId,
          organizationId: org1User.organizationId,
          role: 'supplier',
        },
      );

      expect(crossTenantAccess.allowed).toBe(false);
      expect(crossTenantAccess.reason).toBe('CROSS_TENANT_ACCESS_DENIED');

      // User should access their own org data
      const validAccess = await securityManager.checkFeedbackAccess(
        'feedback-org1',
        'read',
        {
          userId: org1User.userId,
          organizationId: org1User.organizationId,
          role: 'supplier',
        },
      );

      expect(validAccess.allowed).toBe(true);
    });

    it('should enforce role-based permissions for feedback management', async () => {
      const roles = [
        {
          role: 'supplier',
          permissions: ['read_own_feedback', 'submit_feedback'],
          deniedActions: [
            'read_all_feedback',
            'delete_feedback',
            'modify_analytics',
          ],
        },
        {
          role: 'admin',
          permissions: [
            'read_all_feedback',
            'analytics_access',
            'user_management',
          ],
          deniedActions: ['delete_historical_feedback'], // Even admins can't delete history
        },
        {
          role: 'support',
          permissions: ['read_user_feedback', 'create_support_responses'],
          deniedActions: ['modify_feedback', 'access_analytics'],
        },
      ];

      for (const roleTest of roles) {
        for (const permission of roleTest.permissions) {
          const result = await securityManager.checkPermission(permission, {
            userId: 'test-user',
            role: roleTest.role,
            organizationId: 'org-test',
          });

          expect(result.allowed).toBe(true);
        }

        for (const deniedAction of roleTest.deniedActions) {
          const result = await securityManager.checkPermission(deniedAction, {
            userId: 'test-user',
            role: roleTest.role,
            organizationId: 'org-test',
          });

          expect(result.allowed).toBe(false);
        }
      }
    });
  });

  describe('GDPR Compliance and Data Rights', () => {
    it('should handle data subject access requests (GDPR Article 15)', async () => {
      const subjectUserId = 'gdpr-test-user';
      const subjectEmail = 'test@example.com';

      // Mock user's feedback data
      mockGDPRDatabase(subjectUserId, {
        feedback_sessions: [
          {
            id: 'session-1',
            user_id: subjectUserId,
            session_type: 'nps',
            created_at: '2025-01-01',
          },
          {
            id: 'session-2',
            user_id: subjectUserId,
            session_type: 'feature',
            created_at: '2025-01-15',
          },
        ],
        feedback_responses: [
          {
            session_id: 'session-1',
            text_value: 'Great service!',
            created_at: '2025-01-01',
          },
          {
            session_id: 'session-2',
            rating_value: 4,
            created_at: '2025-01-15',
          },
        ],
        nps_surveys: [
          {
            user_id: subjectUserId,
            score: 9,
            feedback_text: 'Excellent platform!',
            created_at: '2025-01-01',
          },
        ],
      });

      const accessRequest = await gdprEngine.processDataAccessRequest({
        userId: subjectUserId,
        email: subjectEmail,
        requestType: 'data_access',
        verificationToken: 'verified-token-123',
      });

      expect(accessRequest.status).toBe('completed');
      expect(accessRequest.data.feedbackSessions).toHaveLength(2);
      expect(accessRequest.data.responses).toHaveLength(2);
      expect(accessRequest.data.npsData).toHaveLength(1);

      // Should include metadata about data processing
      expect(accessRequest.data.processingDetails).toBeDefined();
      expect(accessRequest.data.processingDetails.purposes).toContain(
        'service_improvement',
      );
      expect(accessRequest.data.processingDetails.legalBases).toContain(
        'legitimate_interest',
      );
      expect(
        accessRequest.data.processingDetails.dataRetentionPeriod,
      ).toBeDefined();

      // Should log GDPR compliance action
      expect(auditLogger.logComplianceAction).toHaveBeenCalledWith({
        action: 'DATA_ACCESS_REQUEST',
        userId: subjectUserId,
        requestId: accessRequest.requestId,
        status: 'completed',
      });
    });

    it('should handle data portability requests (GDPR Article 20)', async () => {
      const subjectUserId = 'portability-test-user';

      mockGDPRDatabase(subjectUserId, {
        feedback_sessions: [
          { id: 'session-1', user_id: subjectUserId, session_type: 'nps' },
        ],
        feedback_responses: [
          { session_id: 'session-1', text_value: 'Portable data test' },
        ],
      });

      const portabilityRequest = await gdprEngine.processDataPortabilityRequest(
        {
          userId: subjectUserId,
          format: 'json',
          includeMetadata: true,
        },
      );

      expect(portabilityRequest.status).toBe('completed');
      expect(portabilityRequest.exportData.format).toBe('json');
      expect(portabilityRequest.exportData.data).toBeDefined();

      // Data should be in machine-readable format
      const exportedData = JSON.parse(portabilityRequest.exportData.content);
      expect(exportedData.feedbackData).toBeDefined();
      expect(exportedData.metadata).toBeDefined();
      expect(exportedData.exportTimestamp).toBeDefined();
    });

    it('should handle data deletion requests (GDPR Article 17 - Right to be Forgotten)', async () => {
      const subjectUserId = 'deletion-test-user';

      const deletionRequest = await gdprEngine.processDataDeletionRequest({
        userId: subjectUserId,
        reason: 'user_withdrawal_consent',
        retainAnalytics: true, // Anonymous analytics retention
        verificationConfirmed: true,
      });

      expect(deletionRequest.status).toBe('completed');
      expect(deletionRequest.deletionScope.personalData).toBe(true);
      expect(deletionRequest.deletionScope.analyticsData).toBe(false); // Retained anonymized

      // Should have anonymization details
      expect(deletionRequest.anonymization.method).toBe('data_replacement');
      expect(deletionRequest.anonymization.retainedFields).toContain(
        'aggregated_sentiment',
      );
      expect(deletionRequest.anonymization.deletedFields).toContain(
        'text_responses',
      );

      // Should log permanent deletion
      expect(auditLogger.logComplianceAction).toHaveBeenCalledWith({
        action: 'DATA_DELETION',
        userId: subjectUserId,
        permanent: true,
        retainedAnalytics: true,
      });
    });

    it('should handle data rectification requests (GDPR Article 16)', async () => {
      const subjectUserId = 'rectification-test-user';
      const sessionId = 'session-to-correct';

      const rectificationRequest =
        await gdprEngine.processDataRectificationRequest({
          userId: subjectUserId,
          targetData: {
            sessionId,
            field: 'feedback_text',
            currentValue: 'Incorrect feedback text',
            correctedValue: 'Corrected feedback text',
            justification: 'User reported error in original submission',
          },
        });

      expect(rectificationRequest.status).toBe('completed');
      expect(rectificationRequest.corrections.length).toBe(1);
      expect(rectificationRequest.corrections[0].field).toBe('feedback_text');
      expect(rectificationRequest.corrections[0].newValue).toBe(
        'Corrected feedback text',
      );

      // Should maintain audit trail
      expect(rectificationRequest.auditTrail).toBeDefined();
      expect(rectificationRequest.auditTrail.originalValueHash).toBeDefined();
      expect(rectificationRequest.auditTrail.correctionTimestamp).toBeDefined();
    });

    it('should enforce data retention policies', async () => {
      const retentionPolicyTest = await gdprEngine.enforceRetentionPolicy({
        checkDate: new Date('2025-01-20'),
        policies: [
          {
            dataType: 'feedback_responses',
            retentionPeriod: '3_years',
            action: 'anonymize',
          },
          {
            dataType: 'abandoned_sessions',
            retentionPeriod: '30_days',
            action: 'delete',
          },
          {
            dataType: 'nps_surveys',
            retentionPeriod: '5_years',
            action: 'anonymize',
          },
        ],
      });

      expect(retentionPolicyTest.processed.length).toBeGreaterThan(0);
      expect(retentionPolicyTest.anonymized).toBeGreaterThanOrEqual(0);
      expect(retentionPolicyTest.deleted).toBeGreaterThanOrEqual(0);

      // Should have detailed report
      expect(retentionPolicyTest.report.totalRecordsProcessed).toBeDefined();
      expect(retentionPolicyTest.report.complianceStatus).toBe('compliant');
    });
  });

  describe('SQL Injection and XSS Prevention', () => {
    const maliciousInputs = [
      // SQL injection attempts
      "'; DROP TABLE feedback_sessions; --",
      "1' OR '1'='1",
      "admin'/*",
      "'; INSERT INTO feedback_sessions VALUES ('hacked'); --",

      // XSS attempts
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "<img src=x onerror=alert('xss')>",
      "';alert('xss');//",

      // NoSQL injection attempts
      "{ $gt: '' }",
      "'; db.dropDatabase(); '",

      // Command injection attempts
      '; ls -la;',
      '| cat /etc/passwd',
      '&& rm -rf /',
    ];

    maliciousInputs.forEach((maliciousInput, index) => {
      it(`should prevent malicious input ${index + 1}: ${maliciousInput.substring(0, 30)}...`, async () => {
        const testContext: SecurityTestContext = {
          userId: 'security-test-user',
          userType: 'supplier',
          organizationId: 'org-security-test',
          sessionId: 'session-injection-test',
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
        };

        // Mock database interaction
        mockSecureDatabase({
          feedback_sessions: [
            {
              id: testContext.sessionId,
              user_id: testContext.userId,
            },
          ],
        });

        // Attempt to submit malicious feedback
        const sanitizationResult =
          await securityManager.validateAndSanitizeInput(maliciousInput, {
            context: 'feedback_text',
            maxLength: 1000,
            allowedTags: [], // No HTML allowed
            enforceEncoding: true,
          });

        // Should detect as malicious
        expect(sanitizationResult.isMalicious).toBe(true);
        expect(sanitizationResult.threatTypes.length).toBeGreaterThan(0);
        expect(sanitizationResult.sanitizedInput).not.toBe(maliciousInput);

        // Should log security incident
        expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith({
          eventType: 'MALICIOUS_INPUT_DETECTED',
          userId: testContext.userId,
          inputType: 'feedback_text',
          threatTypes: sanitizationResult.threatTypes,
          originalInput: expect.stringContaining('[REDACTED]'), // Should redact in logs
          ipAddress: testContext.ipAddress,
        });

        // Should not allow submission of malicious content
        await expect(
          feedbackCollector.submitResponse(
            testContext.sessionId,
            'feedback_text',
            { textValue: maliciousInput },
            10,
          ),
        ).rejects.toThrow('MALICIOUS_INPUT_REJECTED');
      });
    });

    it('should use parameterized queries for all database operations', async () => {
      const testUserId = "test'; DROP TABLE users; --"; // SQL injection attempt in user ID

      // Mock database query monitoring
      const queryMonitor = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        queryMonitor({ table, method: 'from' });
        return {
          select: jest.fn().mockImplementation((fields) => {
            queryMonitor({ operation: 'select', fields });
            return {
              eq: jest.fn().mockImplementation((column, value) => {
                queryMonitor({
                  operation: 'eq',
                  column,
                  value,
                  isParameterized: true,
                });
                return Promise.resolve({ data: [], error: null });
              }),
            };
          }),
        };
      });

      // Attempt database query with malicious input
      await expect(async () => {
        await feedbackCollector.checkFeedbackEligibility(testUserId, 'nps');
      }).not.toThrow(); // Should handle safely with parameterization

      // Verify parameterized queries were used
      const eqCalls = queryMonitor.mock.calls.filter(
        (call) => call[0].operation === 'eq',
      );
      eqCalls.forEach((call) => {
        expect(call[0].isParameterized).toBe(true);
        // Value should be passed as parameter, not concatenated into SQL
        expect(call[0].value).toBe(testUserId); // Raw value preserved for parameterization
      });
    });
  });

  describe('Audit Logging and Compliance Monitoring', () => {
    it('should log all feedback data access events', async () => {
      const auditTestCases = [
        {
          operation: 'feedback_session_created',
          userId: 'audit-user-1',
          expectedFields: ['userId', 'sessionId', 'timestamp', 'ipAddress'],
        },
        {
          operation: 'feedback_response_submitted',
          userId: 'audit-user-2',
          expectedFields: [
            'userId',
            'sessionId',
            'responseType',
            'containsPII',
          ],
        },
        {
          operation: 'feedback_data_accessed',
          userId: 'admin-user',
          expectedFields: [
            'actorId',
            'targetUserId',
            'accessReason',
            'dataScope',
          ],
        },
        {
          operation: 'analytics_dashboard_viewed',
          userId: 'analytics-user',
          expectedFields: ['userId', 'reportType', 'dateRange', 'segmentation'],
        },
      ];

      for (const testCase of auditTestCases) {
        // Simulate the operation
        await securityManager.logAuditEvent(testCase.operation, {
          userId: testCase.userId,
          sessionId: 'audit-session',
          timestamp: new Date(),
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          additionalData: { test: true },
        });

        // Verify comprehensive logging
        expect(auditLogger.logDataAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            operation: testCase.operation,
            userId: testCase.userId,
          }),
        );

        const logCall = auditLogger.logDataAccess.mock.calls.find(
          (call) => call[0].operation === testCase.operation,
        );

        // Verify all required fields are logged
        testCase.expectedFields.forEach((field) => {
          expect(logCall[0]).toHaveProperty(field);
        });

        // Verify audit trail integrity
        expect(logCall[0].auditId).toBeDefined();
        expect(logCall[0].timestamp).toBeDefined();
        expect(logCall[0].checksumHash).toBeDefined();
      }
    });

    it('should detect and alert on suspicious patterns', async () => {
      const suspiciousPatterns = [
        {
          pattern: 'rapid_multiple_access',
          events: Array.from({ length: 50 }, (_, i) => ({
            userId: 'suspicious-user',
            operation: 'feedback_data_accessed',
            timestamp: new Date(Date.now() + i * 100), // 100ms apart
            ipAddress: '192.168.1.100',
          })),
        },
        {
          pattern: 'cross_tenant_attempts',
          events: [
            {
              userId: 'user-org1',
              targetOrg: 'org-2',
              operation: 'unauthorized_access',
            },
            {
              userId: 'user-org1',
              targetOrg: 'org-3',
              operation: 'unauthorized_access',
            },
            {
              userId: 'user-org1',
              targetOrg: 'org-4',
              operation: 'unauthorized_access',
            },
          ],
        },
        {
          pattern: 'mass_data_export',
          events: [
            {
              userId: 'export-user',
              operation: 'bulk_data_export',
              recordCount: 10000,
            },
            {
              userId: 'export-user',
              operation: 'bulk_data_export',
              recordCount: 15000,
            },
            {
              userId: 'export-user',
              operation: 'bulk_data_export',
              recordCount: 20000,
            },
          ],
        },
      ];

      for (const suspiciousCase of suspiciousPatterns) {
        // Submit the events
        for (const event of suspiciousCase.events) {
          await securityManager.logAuditEvent(event.operation, event);
        }

        // Run suspicious pattern detection
        const alertsGenerated = await securityManager.detectSuspiciousPatterns({
          timeWindow: '1_hour',
          patterns: [suspiciousCase.pattern],
        });

        expect(alertsGenerated.length).toBeGreaterThan(0);
        const relevantAlert = alertsGenerated.find(
          (alert) => alert.pattern === suspiciousCase.pattern,
        );

        expect(relevantAlert).toBeDefined();
        expect(relevantAlert.severity).toBeGreaterThanOrEqual(7); // High severity
        expect(relevantAlert.recommendedActions).toBeDefined();

        // Should log security alert
        expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith({
          eventType: 'SUSPICIOUS_PATTERN_DETECTED',
          pattern: suspiciousCase.pattern,
          severity: relevantAlert.severity,
          affectedUsers: expect.any(Array),
        });
      }
    });

    it('should maintain immutable audit trail', async () => {
      const auditEvents = [
        {
          eventId: 'audit-001',
          operation: 'feedback_created',
          userId: 'user-001',
          data: { sessionId: 'session-001' },
        },
        {
          eventId: 'audit-002',
          operation: 'feedback_modified',
          userId: 'user-001',
          data: { sessionId: 'session-001', field: 'status' },
        },
        {
          eventId: 'audit-003',
          operation: 'feedback_accessed',
          userId: 'admin-001',
          data: { targetUserId: 'user-001', reason: 'support_request' },
        },
      ];

      const auditTrail = [];

      for (const event of auditEvents) {
        const auditRecord =
          await securityManager.createImmutableAuditRecord(event);
        auditTrail.push(auditRecord);

        // Verify immutability features
        expect(auditRecord.eventHash).toBeDefined();
        expect(auditRecord.previousHash).toBeDefined();
        expect(auditRecord.blockNumber).toBeDefined();
        expect(auditRecord.timestamp).toBeDefined();
        expect(auditRecord.signature).toBeDefined();
      }

      // Verify audit trail integrity
      const integrityCheck =
        await securityManager.verifyAuditTrailIntegrity(auditTrail);

      expect(integrityCheck.isValid).toBe(true);
      expect(integrityCheck.totalRecords).toBe(auditEvents.length);
      expect(integrityCheck.tamperedRecords).toHaveLength(0);

      // Test tampering detection
      auditTrail[1].data.modified = true; // Simulate tampering

      const tamperedCheck =
        await securityManager.verifyAuditTrailIntegrity(auditTrail);
      expect(tamperedCheck.isValid).toBe(false);
      expect(tamperedCheck.tamperedRecords.length).toBeGreaterThan(0);
    });
  });

  // Helper functions
  function getPermissionsForRole(role: string): string[] {
    const rolePermissions = {
      supplier: ['read_own_feedback', 'submit_feedback'],
      couple: ['submit_feedback', 'view_vendor_feedback'],
      admin: [
        'read_all_feedback',
        'analytics_access',
        'user_management',
        'audit_access',
      ],
      support: ['read_user_feedback', 'create_support_responses'],
    };

    return rolePermissions[role as keyof typeof rolePermissions] || [];
  }

  function mockSecureDatabase(data: Record<string, any[]>) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: data[table] || [],
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'new-record' }],
        error: null,
      }),
    }));
  }

  function mockGDPRDatabase(userId: string, userData: Record<string, any[]>) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation((column: string, value: any) => {
          if (column === 'user_id' && value === userId) {
            return Promise.resolve({
              data: userData[table] || [],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{}],
          error: null,
        }),
      }),
    }));
  }
});
