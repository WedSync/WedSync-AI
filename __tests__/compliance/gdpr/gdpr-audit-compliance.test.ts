import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import { createMockSupabaseClient } from '../../utils/supabase-mock';
import { AuditTestFramework } from '../../audit/framework/AuditTestFramework';

describe('GDPR Compliance for Audit Logging', () => {
  let auditLogger: AuditLogger;
  let mockSupabase: any;
  let testFramework: AuditTestFramework;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    auditLogger = new AuditLogger(mockSupabase);
    testFramework = new AuditTestFramework();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Article 5 - Principles of Processing (Lawfulness, Fairness, Transparency)', () => {
    it('should only log audit data for lawful purposes', async () => {
      const lawfulPurposes = [
        'legitimate_business_interest',
        'contract_performance',
        'legal_obligation',
        'vital_interests',
        'public_task',
        'consent'
      ];

      for (const purpose of lawfulPurposes) {
        await auditLogger.logAction({
          userId: 'user-123',
          action: 'wedding.guest.add',
          resourceId: 'guest-456',
          details: { guestName: 'John Doe', email: 'john@example.com' },
          gdprContext: {
            lawfulBasis: purpose,
            purpose: 'Wedding planning and management',
            dataSubject: 'wedding guest'
          }
        });

        const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
        expect(insertCall.gdpr_lawful_basis).toBe(purpose);
        expect(insertCall.gdpr_purpose).toBeDefined();
      }
    });

    it('should ensure data minimization in audit logs', async () => {
      const excessiveData = {
        guestName: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        address: '123 Main St, City, State',
        birthDate: '1985-06-15',
        socialSecurityNumber: '123-45-6789', // Should be filtered
        medicalConditions: 'Diabetes', // Should be filtered
        politicalViews: 'Independent', // Should be filtered
        religiousBeliefs: 'Christian', // Should be filtered
        sexualOrientation: 'Heterosexual' // Should be filtered
      };

      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.guest.add',
        resourceId: 'guest-456',
        details: excessiveData,
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Wedding guest management',
          dataMinimization: true
        }
      });

      const insertCall = mockSupabase.from('audit_logs').insert.mock.calls[0][0];
      
      // Should retain necessary data
      expect(insertCall.details.guestName).toBe('John Doe');
      expect(insertCall.details.email).toBe('john@example.com');
      
      // Should filter sensitive data
      expect(insertCall.details.socialSecurityNumber).toBeUndefined();
      expect(insertCall.details.medicalConditions).toBeUndefined();
      expect(insertCall.details.politicalViews).toBeUndefined();
      expect(insertCall.details.religiousBeliefs).toBeUndefined();
      expect(insertCall.details.sexualOrientation).toBeUndefined();
    });

    it('should maintain data accuracy and keep records up to date', async () => {
      // Initial guest creation
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.guest.add',
        resourceId: 'guest-456',
        details: {
          guestName: 'John Doe',
          email: 'john.old@example.com',
          rsvpStatus: 'pending'
        },
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Wedding guest management',
          accuracyMaintenance: true
        }
      });

      // Update with corrected information
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.guest.update',
        resourceId: 'guest-456',
        details: {
          guestName: 'John Doe',
          email: 'john.new@example.com', // Corrected email
          rsvpStatus: 'attending',
          dataCorrection: true,
          previousEmail: 'john.old@example.com'
        },
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Data accuracy maintenance',
          accuracyMaintenance: true
        }
      });

      const updateCall = mockSupabase.from('audit_logs').insert.mock.calls[1][0];
      expect(updateCall.details.dataCorrection).toBeTruthy();
      expect(updateCall.gdpr_accuracy_maintained).toBeTruthy();
    });
  });

  describe('Article 6 - Lawfulness of Processing', () => {
    it('should verify lawful basis for each audit log entry', async () => {
      const lawfulBasisTests = [
        {
          basis: 'consent',
          action: 'wedding.photo.share',
          requiredFields: ['consentGiven', 'consentDate', 'consentMethod']
        },
        {
          basis: 'contract',
          action: 'wedding.vendor.payment',
          requiredFields: ['contractId', 'contractClause']
        },
        {
          basis: 'legal_obligation',
          action: 'wedding.tax.report',
          requiredFields: ['legalRequirement', 'jurisdiction']
        },
        {
          basis: 'legitimate_interests',
          action: 'wedding.security.log',
          requiredFields: ['legitimateInterest', 'balancingTest']
        }
      ];

      for (const test of lawfulBasisTests) {
        const gdprContext: any = {
          lawfulBasis: test.basis,
          purpose: 'Wedding management'
        };

        // Add required fields based on basis
        test.requiredFields.forEach(field => {
          gdprContext[field] = `test-${field}-value`;
        });

        await auditLogger.logAction({
          userId: 'user-123',
          action: test.action,
          resourceId: 'resource-456',
          details: { test: 'data' },
          gdprContext
        });

        const insertCall = mockSupabase.from('audit_logs').insert.mock.calls.slice(-1)[0][0];
        expect(insertCall.gdpr_lawful_basis).toBe(test.basis);

        // Verify required fields are present
        test.requiredFields.forEach(field => {
          expect(insertCall.gdpr_context[field]).toBeDefined();
        });
      }
    });
  });

  describe('Article 7 - Conditions for Consent', () => {
    it('should track consent for audit logging where applicable', async () => {
      const consentData = {
        consentGiven: true,
        consentDate: new Date().toISOString(),
        consentMethod: 'explicit_checkbox',
        consentVersion: '1.2',
        canWithdraw: true,
        granularity: {
          photoSharing: true,
          emailMarketing: false,
          dataAnalytics: true
        }
      };

      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.photo.process',
        resourceId: 'photo-789',
        details: {
          photoId: 'photo-789',
          processingType: 'enhancement'
        },
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Photo processing and sharing',
          consent: consentData
        }
      });

      const insertCall = mockSupabase.from('audit_logs').insert.mock.calls[0][0];
      expect(insertCall.gdpr_consent_given).toBeTruthy();
      expect(insertCall.gdpr_consent_date).toBeDefined();
      expect(insertCall.gdpr_consent_withdrawable).toBeTruthy();
      expect(insertCall.gdpr_consent_granular).toBeTruthy();
    });

    it('should handle consent withdrawal for audit logs', async () => {
      // Initial consent-based action
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.marketing.send',
        resourceId: 'campaign-456',
        details: { campaignType: 'newsletter' },
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Marketing communications',
          consent: {
            consentGiven: true,
            consentDate: new Date().toISOString()
          }
        }
      });

      // Consent withdrawal
      await auditLogger.handleConsentWithdrawal({
        userId: 'user-123',
        consentType: 'marketing',
        withdrawalDate: new Date().toISOString(),
        withdrawalMethod: 'user_portal'
      });

      // Attempt action after withdrawal should fail
      await expect(
        auditLogger.logAction({
          userId: 'user-123',
          action: 'wedding.marketing.send',
          resourceId: 'campaign-789',
          details: { campaignType: 'promotional' },
          gdprContext: {
            lawfulBasis: 'consent',
            purpose: 'Marketing communications'
          }
        })
      ).rejects.toThrow(/Consent withdrawn/);
    });
  });

  describe('Article 12-14 - Transparent Information and Communication', () => {
    it('should provide transparent audit logging information', async () => {
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.data.process',
        resourceId: 'data-456',
        details: { processType: 'analytics' },
        gdprContext: {
          lawfulBasis: 'legitimate_interests',
          purpose: 'Wedding planning optimization',
          transparentInfo: {
            dataController: 'WedSync Ltd',
            controllerContact: 'privacy@wedsync.com',
            dpoContact: 'dpo@wedsync.com',
            processingPurpose: 'Improving wedding planning experience',
            dataCategories: ['usage_data', 'preference_data'],
            retentionPeriod: 730, // 2 years in days
            recipientCategories: ['analytics_team', 'product_team'],
            automatedDecisionMaking: false
          }
        }
      });

      const insertCall = mockSupabase.from('audit_logs').insert.mock.calls[0][0];
      expect(insertCall.gdpr_transparent_info).toBeDefined();
      expect(insertCall.gdpr_controller).toBe('WedSync Ltd');
      expect(insertCall.gdpr_retention_period).toBe(730);
    });
  });

  describe('Article 15 - Right of Access by the Data Subject', () => {
    it('should enable data subject access to their audit logs', async () => {
      const userId = 'user-123';
      
      // Create multiple audit entries for the user
      const auditActions = [
        { action: 'wedding.create', resourceId: 'wedding-001', details: { name: 'Smith Wedding' } },
        { action: 'wedding.guest.add', resourceId: 'guest-001', details: { guestName: 'John Doe' } },
        { action: 'wedding.vendor.contact', resourceId: 'vendor-001', details: { vendorType: 'catering' } }
      ];

      for (const auditAction of auditActions) {
        await auditLogger.logAction({
          userId,
          ...auditAction,
          gdprContext: {
            lawfulBasis: 'contract',
            purpose: 'Wedding planning'
          }
        });
      }

      // Request data subject access
      const accessRequest = await auditLogger.handleDataSubjectAccessRequest({
        dataSubjectId: userId,
        requestDate: new Date().toISOString(),
        requestMethod: 'user_portal',
        includeAuditLogs: true
      });

      expect(accessRequest.auditLogs).toHaveLength(3);
      expect(accessRequest.dataExported).toBeTruthy();
      expect(accessRequest.format).toBe('structured_json');
      expect(accessRequest.personalDataIncluded).toBeTruthy();
    });

    it('should provide portable audit data format', async () => {
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.budget.update',
        resourceId: 'budget-456',
        details: {
          category: 'catering',
          amount: 5000,
          notes: 'Updated after vendor meeting'
        },
        gdprContext: {
          lawfulBasis: 'contract',
          purpose: 'Wedding budget management'
        }
      });

      const portableData = await auditLogger.exportPortableData('user-123');
      
      expect(portableData.format).toBe('json');
      expect(portableData.machineReadable).toBeTruthy();
      expect(portableData.structured).toBeTruthy();
      expect(portableData.auditLogs[0]).toMatchObject({
        userId: 'user-123',
        action: 'wedding.budget.update',
        timestamp: expect.any(String),
        details: expect.any(Object),
        gdprContext: expect.any(Object)
      });
    });
  });

  describe('Article 16 - Right to Rectification', () => {
    it('should handle data rectification in audit logs', async () => {
      // Original (incorrect) audit entry
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.guest.add',
        resourceId: 'guest-456',
        details: {
          guestName: 'John Doe',
          email: 'wrong@example.com', // Incorrect email
          rsvpStatus: 'pending'
        }
      });

      // Rectification request
      const rectification = await auditLogger.handleRectificationRequest({
        userId: 'user-123',
        resourceId: 'guest-456',
        fieldToCorrect: 'email',
        incorrectValue: 'wrong@example.com',
        correctValue: 'correct@example.com',
        requestDate: new Date().toISOString(),
        requestMethod: 'user_portal'
      });

      expect(rectification.corrected).toBeTruthy();
      expect(rectification.auditTrail).toBeDefined();
      expect(rectification.originalValuePreserved).toBeTruthy(); // For audit purposes
    });
  });

  describe('Article 17 - Right to Erasure (Right to be Forgotten)', () => {
    it('should handle erasure requests while maintaining audit integrity', async () => {
      // Create audit entries that may need erasure
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.personal.update',
        resourceId: 'profile-456',
        details: {
          personalInfo: 'Sensitive personal data',
          preferences: 'User preferences'
        },
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Profile management'
        }
      });

      // Handle erasure request
      const erasureResult = await auditLogger.handleErasureRequest({
        userId: 'user-123',
        resourceId: 'profile-456',
        requestDate: new Date().toISOString(),
        erasureGrounds: 'consent_withdrawn',
        preserveAuditIntegrity: true
      });

      expect(erasureResult.personalDataErased).toBeTruthy();
      expect(erasureResult.auditIntegrityMaintained).toBeTruthy();
      expect(erasureResult.pseudonymizedRecord).toBeTruthy();
    });

    it('should handle erasure conflicts with legal obligations', async () => {
      // Create audit entry with legal obligation
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.tax.calculation',
        resourceId: 'tax-456',
        details: { taxAmount: 500 },
        gdprContext: {
          lawfulBasis: 'legal_obligation',
          purpose: 'Tax compliance',
          legalRequirement: 'Tax Code Section 123'
        }
      });

      // Attempt erasure
      const erasureResult = await auditLogger.handleErasureRequest({
        userId: 'user-123',
        resourceId: 'tax-456',
        requestDate: new Date().toISOString(),
        erasureGrounds: 'no_longer_necessary'
      });

      expect(erasureResult.erasureRefused).toBeTruthy();
      expect(erasureResult.refusalReason).toBe('legal_obligation');
      expect(erasureResult.legalBasis).toBe('Tax Code Section 123');
    });
  });

  describe('Article 18 - Right to Restriction of Processing', () => {
    it('should handle processing restriction requests', async () => {
      // Create audit entry that may need restriction
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.marketing.target',
        resourceId: 'campaign-456',
        details: { targetingCriteria: 'location, preferences' },
        gdprContext: {
          lawfulBasis: 'legitimate_interests',
          purpose: 'Personalized marketing'
        }
      });

      // Request processing restriction
      const restrictionResult = await auditLogger.handleProcessingRestriction({
        userId: 'user-123',
        resourceType: 'marketing',
        restrictionReason: 'accuracy_contested',
        restrictionDate: new Date().toISOString()
      });

      expect(restrictionResult.restricted).toBeTruthy();
      expect(restrictionResult.processingLimited).toBeTruthy();
      
      // Verify that similar processing is now restricted
      await expect(
        auditLogger.logAction({
          userId: 'user-123',
          action: 'wedding.marketing.target',
          resourceId: 'campaign-789',
          details: { targetingCriteria: 'location, preferences' }
        })
      ).rejects.toThrow(/Processing restricted/);
    });
  });

  describe('Article 20 - Right to Data Portability', () => {
    it('should provide portable audit data in structured format', async () => {
      const auditEntries = [
        {
          action: 'wedding.create',
          resourceId: 'wedding-001',
          details: { weddingDate: '2024-06-15', venue: 'Garden Hall' }
        },
        {
          action: 'wedding.guest.add',
          resourceId: 'guest-001',
          details: { guestName: 'Alice Smith', email: 'alice@example.com' }
        }
      ];

      for (const entry of auditEntries) {
        await auditLogger.logAction({
          userId: 'user-123',
          ...entry,
          gdprContext: {
            lawfulBasis: 'contract',
            purpose: 'Wedding planning'
          }
        });
      }

      const portableData = await auditLogger.generatePortableData({
        dataSubjectId: 'user-123',
        format: 'json',
        includeMetadata: true,
        structuredFormat: true
      });

      expect(portableData.format).toBe('json');
      expect(portableData.machineReadable).toBeTruthy();
      expect(portableData.interoperable).toBeTruthy();
      expect(portableData.auditLogs).toHaveLength(2);
      expect(portableData.metadata.exportDate).toBeDefined();
      expect(portableData.metadata.dataController).toBe('WedSync Ltd');
    });
  });

  describe('Article 25 - Data Protection by Design and by Default', () => {
    it('should implement privacy by design in audit logging', async () => {
      const privacyByDesignFeatures = {
        dataMinimization: true,
        purposeLimitation: true,
        storageMinimization: true,
        accessControl: true,
        encryption: true,
        pseudonymization: true,
        transparentProcessing: true
      };

      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.data.collect',
        resourceId: 'collection-456',
        details: {
          collectedData: 'Guest preferences',
          collectionMethod: 'form_submission'
        },
        gdprContext: {
          lawfulBasis: 'consent',
          purpose: 'Wedding planning optimization',
          privacyByDesign: privacyByDesignFeatures
        }
      });

      const insertCall = mockSupabase.from('audit_logs').insert.mock.calls[0][0];
      expect(insertCall.privacy_by_design).toBeTruthy();
      expect(insertCall.data_minimized).toBeTruthy();
      expect(insertCall.purpose_limited).toBeTruthy();
      expect(insertCall.encrypted).toBeTruthy();
    });
  });

  describe('Article 30 - Records of Processing Activities', () => {
    it('should maintain comprehensive processing records', async () => {
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.data.process',
        resourceId: 'processing-456',
        details: { processingType: 'analysis' },
        gdprContext: {
          lawfulBasis: 'legitimate_interests',
          purpose: 'Service improvement',
          processingRecord: {
            controllerName: 'WedSync Ltd',
            controllerContact: 'privacy@wedsync.com',
            processingPurposes: ['service_improvement', 'user_experience'],
            dataCategories: ['usage_data', 'performance_metrics'],
            recipientCategories: ['internal_analytics_team'],
            retentionPeriod: 365,
            internationalTransfers: false,
            securityMeasures: ['encryption', 'access_control', 'audit_logging']
          }
        }
      });

      const processingRecord = await auditLogger.getProcessingRecord('processing-456');
      
      expect(processingRecord.controllerDetails).toBeDefined();
      expect(processingRecord.lawfulBasis).toBe('legitimate_interests');
      expect(processingRecord.purposes).toContain('service_improvement');
      expect(processingRecord.securityMeasures).toContain('encryption');
      expect(processingRecord.retentionPeriod).toBe(365);
    });
  });

  describe('Article 33-34 - Breach Notification', () => {
    it('should handle data breach notification in audit system', async () => {
      // Simulate a data breach scenario
      const breachIncident = {
        incidentId: 'breach-2024-001',
        detectionDate: new Date().toISOString(),
        breachType: 'unauthorized_access',
        affectedRecords: 150,
        personalDataInvolved: true,
        highRisk: false,
        containmentMeasures: ['access_revoked', 'security_patch_applied'],
        affectedDataSubjects: ['user-123', 'user-456', 'user-789']
      };

      const breachResponse = await auditLogger.handleDataBreach(breachIncident);

      expect(breachResponse.supervisoryAuthorityNotified).toBeTruthy();
      expect(breachResponse.notificationWithin72Hours).toBeTruthy();
      expect(breachResponse.dataSubjectsNotified).toBe(false); // Low risk
      expect(breachResponse.auditTrailCreated).toBeTruthy();
    });
  });

  describe('Data Retention and Deletion', () => {
    it('should implement GDPR-compliant data retention policies', async () => {
      // Create audit entries with different retention requirements
      const retentionTests = [
        {
          action: 'wedding.contract.sign',
          retentionPeriod: 2555, // 7 years for financial records
          retentionReason: 'legal_obligation'
        },
        {
          action: 'wedding.marketing.consent',
          retentionPeriod: 730, // 2 years for marketing
          retentionReason: 'legitimate_interest'
        },
        {
          action: 'wedding.session.analytics',
          retentionPeriod: 365, // 1 year for analytics
          retentionReason: 'legitimate_interest'
        }
      ];

      for (const test of retentionTests) {
        await auditLogger.logAction({
          userId: 'user-123',
          action: test.action,
          resourceId: `resource-${test.action}`,
          details: { testData: true },
          gdprContext: {
            lawfulBasis: 'legitimate_interests',
            purpose: 'Testing retention',
            retentionPeriod: test.retentionPeriod,
            retentionReason: test.retentionReason
          }
        });
      }

      // Test automated retention policy application
      const retentionResult = await auditLogger.applyRetentionPolicies({
        dryRun: false,
        respectLegalHolds: true
      });

      expect(retentionResult.policiesApplied).toBeGreaterThan(0);
      expect(retentionResult.recordsReviewed).toBeGreaterThan(0);
      expect(retentionResult.legalHoldsRespected).toBeTruthy();
    });
  });

  describe('Cross-Border Data Transfers', () => {
    it('should handle international data transfers with GDPR safeguards', async () => {
      await auditLogger.logAction({
        userId: 'user-123',
        action: 'wedding.data.transfer',
        resourceId: 'transfer-456',
        details: {
          transferType: 'international',
          destinationCountry: 'US',
          vendor: 'US Analytics Provider'
        },
        gdprContext: {
          lawfulBasis: 'contract',
          purpose: 'International wedding planning',
          internationalTransfer: {
            adequacyDecision: false,
            safeguards: 'standard_contractual_clauses',
            safeguardReference: 'SCC-2021-001',
            recipientCountry: 'US',
            transferMechanism: 'SCCs'
          }
        }
      });

      const insertCall = mockSupabase.from('audit_logs').insert.mock.calls[0][0];
      expect(insertCall.international_transfer).toBeTruthy();
      expect(insertCall.transfer_safeguards).toBe('standard_contractual_clauses');
      expect(insertCall.adequacy_decision).toBe(false);
    });
  });
});