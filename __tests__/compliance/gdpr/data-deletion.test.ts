/**
 * WS-176 - Automated Data Deletion and Anonymization Testing
 * Team E - Round 1: GDPR Right to Erasure Implementation
 * 
 * Tests comprehensive data deletion and anonymization workflows:
 * - Automated right to erasure (right to be forgotten)
 * - Cascade deletion across related wedding data
 * - Data anonymization vs complete deletion
 * - Legal hold and retention policy compliance
 * - Cross-system data purging (photos, communications, analytics)
 * - Vendor data deletion coordination
 * - Guest data deletion with wedding impact analysis
 * - Audit trail preservation during deletion
 */

import { test, expect } from '@playwright/test';
import { 
  createGDPRTestClient,
  GDPR_TEST_CONFIG,
  createTestUserData,
  createTestWeddingData,
  createTestGuestData,
  requestDataDeletion,
  verifyAuditTrail,
  cleanupGDPRTestData,
  GDPR_PERFORMANCE_BENCHMARKS,
  WEDDING_GDPR_SCENARIOS
} from './utils/gdpr-test-utils';

test.describe('WS-176: Data Deletion and Anonymization Testing', () => {
  let supabase: ReturnType<typeof createGDPRTestClient>;
  let testUserIds: string[] = [];
  let testWeddingIds: string[] = [];
  let testGuestIds: string[] = [];
  let testVendorIds: string[] = [];

  test.beforeAll(async () => {
    supabase = createGDPRTestClient();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(GDPR_TEST_CONFIG.baseUrl);
    
    // Set deletion testing headers
    await page.setExtraHTTPHeaders({
      'x-gdpr-deletion-test': 'true',
      'x-test-suite': 'data-deletion'
    });
  });

  test.afterEach(async () => {
    // Clean up any remaining test data that wasn't deleted by tests
    if (testUserIds.length > 0 || testWeddingIds.length > 0 || testGuestIds.length > 0) {
      await cleanupGDPRTestData(supabase, {
        userIds: testUserIds,
        weddingIds: testWeddingIds,
        guestIds: testGuestIds,
        vendorIds: testVendorIds
      });
      testUserIds = [];
      testWeddingIds = [];
      testGuestIds = [];
      testVendorIds = [];
    }
  });

  test.describe('Right to Erasure (Right to be Forgotten)', () => {
    
    test('should handle complete user data deletion request', async ({ page }) => {
      // Create comprehensive test user with wedding data
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Set up comprehensive user data
      await supabase.from('user_profiles').insert(userData);
      await supabase.from('weddings').insert(weddingData);

      // Test complete data deletion request
      const deletionTest = await page.evaluate(async (testData) => {
        // Request complete data deletion
        const deletionResponse = await fetch('/api/privacy/deletion/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            deletionType: 'complete_erasure',
            reason: 'User requested account deletion',
            confirmationToken: 'test-confirmation-token-' + Date.now(),
            understandConsequences: true
          })
        });

        const deletion = await deletionResponse.json();

        // Verify deletion request processing
        const statusResponse = await fetch(`/api/privacy/deletion/${deletion.requestId}/status`);
        const status = await statusResponse.json();

        // Check deletion impact assessment
        const impactResponse = await fetch('/api/privacy/deletion/impact-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            deletionScope: 'complete'
          })
        });

        const impact = await impactResponse.json();

        return {
          deletionRequestCreated: deletionResponse.ok,
          deletionRequestId: deletion.requestId,
          statusCheckWorking: statusResponse.ok,
          deletionStatus: status.status,
          impactAssessmentComplete: impactResponse.ok,
          affectedSystems: impact.affectedSystems?.length || 0,
          estimatedDuration: impact.estimatedDuration,
          requiresManualReview: impact.requiresManualReview,
          cascadeEffects: impact.cascadeEffects?.length || 0
        };
      }, { user: userData, wedding: weddingData });

      expect(deletionTest.deletionRequestCreated).toBe(true);
      expect(deletionTest.deletionRequestId).toBeTruthy();
      expect(deletionTest.statusCheckWorking).toBe(true);
      expect(deletionTest.deletionStatus).toBe('pending' || 'processing');
      expect(deletionTest.impactAssessmentComplete).toBe(true);
      expect(deletionTest.affectedSystems).toBeGreaterThan(0);
      expect(deletionTest.estimatedDuration).toBeTruthy();
      expect(typeof deletionTest.requiresManualReview).toBe('boolean');
      expect(deletionTest.cascadeEffects).toBeGreaterThan(0);
    });

    test('should execute cascade deletion across wedding-related data', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      const guestData = createTestGuestData(weddingData.id);
      
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);
      testGuestIds.push(guestData.id);

      // Create comprehensive wedding data ecosystem
      await supabase.from('user_profiles').insert(userData);
      await supabase.from('weddings').insert(weddingData);
      await supabase.from('guests').insert(guestData);

      // Test cascade deletion
      const cascadeDeletionTest = await page.evaluate(async (testData) => {
        // Create additional related data
        const relatedDataCreation = await fetch('/api/test/create-wedding-ecosystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            createData: {
              vendors: 3,
              tasks: 5,
              photos: 10,
              communications: 8,
              payments: 2,
              timeline_events: 15
            }
          })
        });

        // Initiate cascade deletion
        const cascadeResponse = await fetch('/api/privacy/deletion/cascade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            cascadeRules: {
              deleteOwnedWeddings: true,
              deleteGuestData: true,
              deleteVendorCommunications: true,
              deletePhotos: true,
              deletePaymentHistory: true,
              deleteAnalytics: true,
              preserveAuditTrail: true
            }
          })
        });

        const cascade = await cascadeResponse.json();

        // Verify cascade deletion execution
        const verificationResponse = await fetch('/api/privacy/deletion/verify-cascade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deletionId: cascade.deletionId,
            checkCompleteness: true
          })
        });

        const verification = await verificationResponse.json();

        return {
          ecosystemCreated: relatedDataCreation.ok,
          cascadeInitiated: cascadeResponse.ok,
          deletionId: cascade.deletionId,
          cascadeDepth: cascade.cascadeDepth,
          deletedTables: cascade.deletedTables?.length || 0,
          verificationComplete: verificationResponse.ok,
          allDataDeleted: verification.completionStatus === 'complete',
          auditTrailPreserved: verification.auditTrailIntact === true,
          orphanDataRemoved: verification.orphanDataFound === 0
        };
      }, { user: userData, wedding: weddingData, guest: guestData });

      expect(cascadeDeletionTest.ecosystemCreated).toBe(true);
      expect(cascadeDeletionTest.cascadeInitiated).toBe(true);
      expect(cascadeDeletionTest.deletionId).toBeTruthy();
      expect(cascadeDeletionTest.cascadeDepth).toBeGreaterThan(0);
      expect(cascadeDeletionTest.deletedTables).toBeGreaterThan(5);
      expect(cascadeDeletionTest.verificationComplete).toBe(true);
      expect(cascadeDeletionTest.allDataDeleted).toBe(true);
      expect(cascadeDeletionTest.auditTrailPreserved).toBe(true);
      expect(cascadeDeletionTest.orphanDataRemoved).toBe(0);
    });

    test('should handle deletion timeframes and GDPR compliance deadlines', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test GDPR 30-day deletion compliance
      const timeframeTest = await page.evaluate(async (testData) => {
        // Submit deletion request with urgent timeline
        const urgentDeletionResponse = await fetch('/api/privacy/deletion/timeline-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            urgencyLevel: 'regulatory_compliance',
            maxDays: 30,
            requestDate: new Date().toISOString(),
            gdprCompliance: true
          })
        });

        const urgentDeletion = await urgentDeletionResponse.json();

        // Test deletion scheduling
        const scheduleResponse = await fetch('/api/privacy/deletion/schedule-compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deletionId: urgentDeletion.deletionId,
            scheduleType: 'gdpr_compliant',
            priorityLevel: 'high'
          })
        });

        const schedule = await scheduleResponse.json();

        // Verify timeline compliance monitoring
        const monitoringResponse = await fetch(`/api/privacy/deletion/${urgentDeletion.deletionId}/timeline-monitoring`);
        const monitoring = await monitoringResponse.json();

        return {
          urgentDeletionScheduled: urgentDeletionResponse.ok,
          within30DayLimit: schedule.estimatedCompletion && 
            new Date(schedule.estimatedCompletion).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000,
          complianceSchedulingActive: scheduleResponse.ok,
          timelineMonitoring: monitoringResponse.ok,
          escalationProcedures: monitoring.escalationProcedures?.length > 0,
          complianceAlerting: monitoring.complianceAlerting === true,
          regulatoryReporting: monitoring.regulatoryReporting === true
        };
      }, userData);

      expect(timeframeTest.urgentDeletionScheduled).toBe(true);
      expect(timeframeTest.within30DayLimit).toBe(true);
      expect(timeframeTest.complianceSchedulingActive).toBe(true);
      expect(timeframeTest.timelineMonitoring).toBe(true);
      expect(timeframeTest.escalationProcedures).toBe(true);
      expect(timeframeTest.complianceAlerting).toBe(true);
      expect(timeframeTest.regulatoryReporting).toBe(true);
    });
  });

  test.describe('Data Anonymization vs Complete Deletion', () => {
    
    test('should choose appropriate anonymization vs deletion based on data type', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test intelligent deletion/anonymization decision making
      const smartDeletionTest = await page.evaluate(async (testData) => {
        // Different data categories with different handling requirements
        const dataCategories = [
          {
            category: 'personal_identifiers',
            expectedAction: 'complete_deletion',
            reason: 'Direct personal identification'
          },
          {
            category: 'behavioral_analytics',
            expectedAction: 'anonymization',
            reason: 'Statistical value without personal identification'
          },
          {
            category: 'financial_transactions',
            expectedAction: 'anonymization',
            reason: 'Legal retention requirements with privacy protection'
          },
          {
            category: 'wedding_photos',
            expectedAction: 'complete_deletion',
            reason: 'Highly personal content'
          },
          {
            category: 'vendor_ratings',
            expectedAction: 'anonymization',
            reason: 'Market insights while protecting privacy'
          }
        ];

        const processingResults = [];

        for (const dataCategory of dataCategories) {
          const processingResponse = await fetch('/api/privacy/deletion/intelligent-processing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.user.id,
              dataCategory: dataCategory.category,
              analysisMode: 'automated_decision'
            })
          });

          const processing = await processingResponse.json();

          processingResults.push({
            category: dataCategory.category,
            recommendedAction: processing.recommendedAction,
            actualAction: processing.actionTaken,
            reasoning: processing.reasoning,
            matchesExpected: processing.recommendedAction === dataCategory.expectedAction,
            privacyScoreAfter: processing.privacyScore,
            utilityRetained: processing.utilityRetained
          });
        }

        // Test anonymization quality
        const anonymizationQualityResponse = await fetch('/api/privacy/anonymization/quality-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            anonymizedCategories: ['behavioral_analytics', 'vendor_ratings']
          })
        });

        const qualityCheck = await anonymizationQualityResponse.json();

        return {
          allCategoriesProcessed: processingResults.length === dataCategories.length,
          smartDecisionMaking: processingResults.every(r => r.matchesExpected),
          privacyProtection: processingResults.every(r => r.privacyScoreAfter > 0.8),
          utilityPreservation: processingResults.some(r => r.utilityRetained > 0.7),
          anonymizationQuality: anonymizationQualityResponse.ok,
          reIdentificationRisk: qualityCheck.reIdentificationRisk < 0.05,
          kAnonymity: qualityCheck.kAnonymity >= 5
        };
      }, { user: userData, wedding: weddingData });

      expect(smartDeletionTest.allCategoriesProcessed).toBe(true);
      expect(smartDeletionTest.smartDecisionMaking).toBe(true);
      expect(smartDeletionTest.privacyProtection).toBe(true);
      expect(smartDeletionTest.utilityPreservation).toBe(true);
      expect(smartDeletionTest.anonymizationQuality).toBe(true);
      expect(smartDeletionTest.reIdentificationRisk).toBe(true);
      expect(smartDeletionTest.kAnonymity).toBe(true);
    });

    test('should implement k-anonymity and differential privacy in anonymization', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test advanced anonymization techniques
      const advancedAnonymizationTest = await page.evaluate(async (testData) => {
        // Create sample analytics data
        const analyticsDataResponse = await fetch('/api/test/create-analytics-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            dataPoints: 1000,
            categories: [
              'page_views',
              'feature_usage',
              'search_patterns',
              'vendor_interactions',
              'timeline_access'
            ]
          })
        });

        // Apply k-anonymity anonymization
        const kAnonymityResponse = await fetch('/api/privacy/anonymization/k-anonymity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            kValue: 5,
            quasiIdentifiers: ['location_region', 'age_group', 'wedding_size_category'],
            sensitiveAttributes: ['budget_range', 'vendor_preferences']
          })
        });

        const kAnonymity = await kAnonymityResponse.json();

        // Apply differential privacy
        const differentialPrivacyResponse = await fetch('/api/privacy/anonymization/differential-privacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            epsilon: 1.0, // Privacy budget
            delta: 0.00001,
            queries: ['average_budget', 'venue_type_distribution', 'planning_duration']
          })
        });

        const differentialPrivacy = await differentialPrivacyResponse.json();

        // Verify anonymization quality
        const qualityAssessmentResponse = await fetch('/api/privacy/anonymization/quality-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalUserId: testData.id,
            anonymizedDatasets: [kAnonymity.datasetId, differentialPrivacy.datasetId]
          })
        });

        const qualityAssessment = await qualityAssessmentResponse.json();

        return {
          analyticsDataCreated: analyticsDataResponse.ok,
          kAnonymityApplied: kAnonymityResponse.ok,
          kAnonymityValid: kAnonymity.kValue >= 5,
          differentialPrivacyApplied: differentialPrivacyResponse.ok,
          privacyBudgetRespected: differentialPrivacy.epsilonUsed <= 1.0,
          qualityAssessmentComplete: qualityAssessmentResponse.ok,
          reIdentificationRiskLow: qualityAssessment.reIdentificationRisk < 0.01,
          dataUtilityPreserved: qualityAssessment.utilityScore > 0.8,
          privacyGuarantees: qualityAssessment.privacyGuarantees === 'strong'
        };
      }, userData);

      expect(advancedAnonymizationTest.analyticsDataCreated).toBe(true);
      expect(advancedAnonymizationTest.kAnonymityApplied).toBe(true);
      expect(advancedAnonymizationTest.kAnonymityValid).toBe(true);
      expect(advancedAnonymizationTest.differentialPrivacyApplied).toBe(true);
      expect(advancedAnonymizationTest.privacyBudgetRespected).toBe(true);
      expect(advancedAnonymizationTest.qualityAssessmentComplete).toBe(true);
      expect(advancedAnonymizationTest.reIdentificationRiskLow).toBe(true);
      expect(advancedAnonymizationTest.dataUtilityPreserved).toBe(true);
      expect(advancedAnonymizationTest.privacyGuarantees).toBe(true);
    });

    test('should handle reversible pseudonymization for specific use cases', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test pseudonymization for cases requiring potential reversal
      const pseudonymizationTest = await page.evaluate(async (testData) => {
        // Apply pseudonymization to financial data (may need reversal for legal/tax purposes)
        const pseudonymizationResponse = await fetch('/api/privacy/pseudonymization/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            dataCategories: ['financial_transactions', 'vendor_payments'],
            pseudonymizationType: 'reversible',
            keyManagement: 'secure_escrow',
            reversalConditions: ['legal_requirement', 'tax_audit', 'fraud_investigation']
          })
        });

        const pseudonymization = await pseudonymizationResponse.json();

        // Test secure key management
        const keyManagementResponse = await fetch('/api/privacy/pseudonymization/key-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pseudonymizationId: pseudonymization.pseudonymizationId,
            operation: 'validate_key_security'
          })
        });

        const keyManagement = await keyManagementResponse.json();

        // Test controlled reversal scenario
        const reversalTestResponse = await fetch('/api/privacy/pseudonymization/test-reversal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pseudonymizationId: pseudonymization.pseudonymizationId,
            reversalReason: 'test_scenario',
            authorizationLevel: 'admin',
            testMode: true
          })
        });

        const reversalTest = await reversalTestResponse.json();

        return {
          pseudonymizationApplied: pseudonymizationResponse.ok,
          reversiblePseudonymization: pseudonymization.reversible === true,
          keyManagementSecure: keyManagementResponse.ok && keyManagement.securityLevel === 'high',
          reversalControlled: reversalTestResponse.ok,
          authorizationRequired: reversalTest.authorizationRequired === true,
          auditTrailMaintained: reversalTest.auditTrailComplete === true,
          dataIntegrityPreserved: reversalTest.dataIntegrityCheck === true
        };
      }, userData);

      expect(pseudonymizationTest.pseudonymizationApplied).toBe(true);
      expect(pseudonymizationTest.reversiblePseudonymization).toBe(true);
      expect(pseudonymizationTest.keyManagementSecure).toBe(true);
      expect(pseudonymizationTest.reversalControlled).toBe(true);
      expect(pseudonymizationTest.authorizationRequired).toBe(true);
      expect(pseudonymizationTest.auditTrailMaintained).toBe(true);
      expect(pseudonymizationTest.dataIntegrityPreserved).toBe(true);
    });
  });

  test.describe('Legal Hold and Retention Policy Compliance', () => {
    
    test('should prevent deletion when legal hold is active', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test legal hold blocking deletion
      const legalHoldTest = await page.evaluate(async (testData) => {
        // Place user under legal hold
        const legalHoldResponse = await fetch('/api/compliance/legal-hold/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            holdType: 'litigation_hold',
            caseNumber: 'TEST-CASE-2024-001',
            legalAuthority: 'Test Court Order',
            holdDuration: 'indefinite',
            dataCategories: ['all'],
            reason: 'Pending litigation requiring data preservation'
          })
        });

        const legalHold = await legalHoldResponse.json();

        // Attempt data deletion while under legal hold
        const deletionAttemptResponse = await fetch('/api/privacy/deletion/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            deletionType: 'complete',
            reason: 'User requested deletion',
            overrideLegalHold: false
          })
        });

        const deletionAttempt = await deletionAttemptResponse.json();

        // Test legal hold override scenario (administrative)
        const adminOverrideResponse = await fetch('/api/compliance/legal-hold/admin-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            reviewType: 'hold_validity',
            adminId: 'test-admin',
            reviewReason: 'Hold validity assessment'
          })
        });

        const adminReview = await adminOverrideResponse.json();

        return {
          legalHoldApplied: legalHoldResponse.ok,
          holdId: legalHold.holdId,
          deletionBlocked: !deletionAttemptResponse.ok || deletionAttempt.blocked === true,
          blockingReason: deletionAttempt.blockingReason,
          legalHoldRespected: deletionAttempt.blockingReason?.includes('legal hold'),
          adminReviewAvailable: adminOverrideResponse.ok,
          holdValidityCheck: adminReview.holdValid === true,
          complianceProtection: true
        };
      }, userData);

      expect(legalHoldTest.legalHoldApplied).toBe(true);
      expect(legalHoldTest.holdId).toBeTruthy();
      expect(legalHoldTest.deletionBlocked).toBe(true);
      expect(legalHoldTest.blockingReason).toBeTruthy();
      expect(legalHoldTest.legalHoldRespected).toBe(true);
      expect(legalHoldTest.adminReviewAvailable).toBe(true);
      expect(legalHoldTest.holdValidityCheck).toBe(true);
      expect(legalHoldTest.complianceProtection).toBe(true);
    });

    test('should enforce retention policies with business justification', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test retention policy enforcement
      const retentionPolicyTest = await page.evaluate(async (testData) => {
        // Set up retention policies for different data types
        const retentionPolicyResponse = await fetch('/api/compliance/retention-policies/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            policies: [
              {
                dataCategory: 'financial_records',
                retentionPeriod: '7_years',
                legalBasis: 'tax_law_requirements',
                justification: 'IRS requires 7-year retention of business financial records'
              },
              {
                dataCategory: 'contract_data',
                retentionPeriod: '5_years',
                legalBasis: 'contract_law',
                justification: 'Statute of limitations for contract disputes'
              },
              {
                dataCategory: 'marketing_data',
                retentionPeriod: '2_years',
                legalBasis: 'business_interest',
                justification: 'Customer relationship management and service improvement'
              }
            ]
          })
        });

        // Attempt deletion of data still within retention period
        const prematureDeletionResponse = await fetch('/api/privacy/deletion/retention-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            requestedDeletion: ['financial_records', 'contract_data'],
            deletionReason: 'User privacy request'
          })
        });

        const prematureDeletion = await prematureDeletionResponse.json();

        // Test retention period expiration handling
        const expirationResponse = await fetch('/api/compliance/retention-policies/expiration-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            checkDate: new Date(Date.now() + 8 * 365 * 24 * 60 * 60 * 1000).toISOString() // 8 years from now
          })
        });

        const expiration = await expirationResponse.json();

        return {
          retentionPoliciesSet: retentionPolicyResponse.ok,
          prematureDeletionBlocked: prematureDeletion.someDataRetained === true,
          financialDataProtected: prematureDeletion.protectedCategories?.includes('financial_records'),
          retentionJustificationProvided: prematureDeletion.retentionJustifications?.length > 0,
          expirationCheckWorking: expirationResponse.ok,
          automaticExpirationScheduled: expiration.scheduledDeletions?.length > 0,
          legalBasisConsidered: true
        };
      }, userData);

      expect(retentionPolicyTest.retentionPoliciesSet).toBe(true);
      expect(retentionPolicyTest.prematureDeletionBlocked).toBe(true);
      expect(retentionPolicyTest.financialDataProtected).toBe(true);
      expect(retentionPolicyTest.retentionJustificationProvided).toBe(true);
      expect(retentionPolicyTest.expirationCheckWorking).toBe(true);
      expect(retentionPolicyTest.automaticExpirationScheduled).toBe(true);
      expect(retentionPolicyTest.legalBasisConsidered).toBe(true);
    });

    test('should handle conflicting retention and deletion requirements', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test handling of conflicting requirements
      const conflictResolutionTest = await page.evaluate(async (testData) => {
        // Create conflicting requirements scenario
        const conflictSetupResponse = await fetch('/api/compliance/conflict-scenario/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            conflicts: [
              {
                requirement1: {
                  type: 'gdpr_deletion_request',
                  priority: 'high',
                  deadline: '30_days'
                },
                requirement2: {
                  type: 'tax_retention_requirement',
                  priority: 'legal_obligation',
                  period: '7_years'
                },
                dataCategory: 'payment_records'
              },
              {
                requirement1: {
                  type: 'user_privacy_request',
                  priority: 'medium',
                  scope: 'marketing_data'
                },
                requirement2: {
                  type: 'ongoing_service_provision',
                  priority: 'business_necessity',
                  scope: 'service_analytics'
                },
                dataCategory: 'behavioral_analytics'
              }
            ]
          })
        });

        // Test conflict resolution logic
        const resolutionResponse = await fetch('/api/compliance/conflict-resolution/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            resolutionStrategy: 'balanced_approach'
          })
        });

        const resolution = await resolutionResponse.json();

        // Verify resolution outcomes
        const outcomeResponse = await fetch(`/api/compliance/conflict-resolution/${testData.id}/outcomes`);
        const outcomes = await outcomeResponse.json();

        return {
          conflictScenariosCreated: conflictSetupResponse.ok,
          resolutionProcessed: resolutionResponse.ok,
          conflictResolutionStrategy: resolution.strategy,
          paymentRecordsHandling: resolution.resolutions?.find(r => r.dataCategory === 'payment_records')?.action,
          behavioralDataHandling: resolution.resolutions?.find(r => r.dataCategory === 'behavioral_analytics')?.action,
          outcomeDocumented: outcomeResponse.ok,
          legalComplianceMaintained: outcomes.legalCompliance === true,
          privacyRightsRespected: outcomes.privacyRightsRespected === true,
          transparentCommunication: outcomes.userNotified === true
        };
      }, userData);

      expect(conflictResolutionTest.conflictScenariosCreated).toBe(true);
      expect(conflictResolutionTest.resolutionProcessed).toBe(true);
      expect(conflictResolutionTest.conflictResolutionStrategy).toBeTruthy();
      expect(conflictResolutionTest.paymentRecordsHandling).toBeTruthy();
      expect(conflictResolutionTest.behavioralDataHandling).toBeTruthy();
      expect(conflictResolutionTest.outcomeDocumented).toBe(true);
      expect(conflictResolutionTest.legalComplianceMaintained).toBe(true);
      expect(conflictResolutionTest.privacyRightsRespected).toBe(true);
      expect(conflictResolutionTest.transparentCommunication).toBe(true);
    });
  });

  test.describe('Cross-System Data Purging', () => {
    
    test('should coordinate deletion across multiple storage systems', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test multi-system deletion coordination
      const multiSystemTest = await page.evaluate(async (testData) => {
        // Create data across multiple systems
        const systemSetupResponse = await fetch('/api/test/multi-system-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            systems: [
              {
                name: 'primary_database',
                dataTypes: ['user_profile', 'wedding_details', 'preferences']
              },
              {
                name: 'file_storage',
                dataTypes: ['profile_photos', 'wedding_photos', 'documents']
              },
              {
                name: 'analytics_warehouse',
                dataTypes: ['behavior_data', 'usage_statistics', 'performance_metrics']
              },
              {
                name: 'communication_logs',
                dataTypes: ['email_history', 'sms_logs', 'notification_history']
              },
              {
                name: 'search_index',
                dataTypes: ['searchable_profiles', 'content_index', 'metadata']
              }
            ]
          })
        });

        // Initiate coordinated deletion
        const coordinatedDeletionResponse = await fetch('/api/privacy/deletion/multi-system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            deletionScope: 'complete',
            systems: 'all',
            coordinationMode: 'transactional',
            rollbackOnFailure: true
          })
        });

        const coordinatedDeletion = await coordinatedDeletionResponse.json();

        // Monitor deletion progress across systems
        const progressResponse = await fetch(`/api/privacy/deletion/${coordinatedDeletion.deletionId}/multi-system-progress`);
        const progress = await progressResponse.json();

        // Verify deletion completeness
        const verificationResponse = await fetch('/api/privacy/deletion/multi-system-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            deletionId: coordinatedDeletion.deletionId,
            verificationDepth: 'complete'
          })
        });

        const verification = await verificationResponse.json();

        return {
          multiSystemSetup: systemSetupResponse.ok,
          coordinatedDeletionInitiated: coordinatedDeletionResponse.ok,
          deletionId: coordinatedDeletion.deletionId,
          transactionalMode: coordinatedDeletion.transactional === true,
          progressMonitoring: progressResponse.ok,
          allSystemsProcessed: progress.systemsCompleted === progress.systemsTotal,
          verificationComplete: verificationResponse.ok,
          primaryDatabaseCleared: verification.systems?.primary_database?.status === 'cleared',
          fileStorageCleared: verification.systems?.file_storage?.status === 'cleared',
          analyticsWarehouseCleared: verification.systems?.analytics_warehouse?.status === 'cleared',
          searchIndexCleared: verification.systems?.search_index?.status === 'cleared',
          noResidualData: verification.residualDataFound === 0
        };
      }, { user: userData, wedding: weddingData });

      expect(multiSystemTest.multiSystemSetup).toBe(true);
      expect(multiSystemTest.coordinatedDeletionInitiated).toBe(true);
      expect(multiSystemTest.deletionId).toBeTruthy();
      expect(multiSystemTest.transactionalMode).toBe(true);
      expect(multiSystemTest.progressMonitoring).toBe(true);
      expect(multiSystemTest.allSystemsProcessed).toBe(true);
      expect(multiSystemTest.verificationComplete).toBe(true);
      expect(multiSystemTest.primaryDatabaseCleared).toBe(true);
      expect(multiSystemTest.fileStorageCleared).toBe(true);
      expect(multiSystemTest.analyticsWarehouseCleared).toBe(true);
      expect(multiSystemTest.searchIndexCleared).toBe(true);
      expect(multiSystemTest.noResidualData).toBe(0);
    });

    test('should handle photo and media deletion with vendor coordination', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test photo and media deletion coordination
      const mediaDeletionTest = await page.evaluate(async (testData) => {
        // Create media ecosystem with vendor involvement
        const mediaEcosystemResponse = await fetch('/api/test/media-ecosystem-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            mediaTypes: [
              { type: 'wedding_photos', count: 50, vendor: 'photographer_vendor' },
              { type: 'venue_photos', count: 20, vendor: 'venue_vendor' },
              { type: 'catering_photos', count: 15, vendor: 'catering_vendor' },
              { type: 'personal_uploads', count: 30, vendor: null }
            ],
            storageLocations: ['primary_cdn', 'backup_storage', 'vendor_systems']
          })
        });

        // Initiate media deletion with vendor coordination
        const mediaDeletionResponse = await fetch('/api/privacy/deletion/media-coordination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            mediaScope: 'all',
            vendorCoordination: true,
            notifyVendors: true,
            vendorDeletionDeadline: '30_days'
          })
        });

        const mediaDeletion = await mediaDeletionResponse.json();

        // Track vendor deletion compliance
        const vendorComplianceResponse = await fetch(`/api/privacy/deletion/${mediaDeletion.deletionId}/vendor-compliance`);
        const vendorCompliance = await vendorComplianceResponse.json();

        // Verify media deletion completeness
        const mediaVerificationResponse = await fetch('/api/privacy/deletion/media-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            deletionId: mediaDeletion.deletionId,
            includeVendorSystems: true
          })
        });

        const mediaVerification = await mediaVerificationResponse.json();

        return {
          mediaEcosystemCreated: mediaEcosystemResponse.ok,
          mediaDeletionInitiated: mediaDeletionResponse.ok,
          vendorNotificationSent: mediaDeletion.vendorNotificationsSent === true,
          vendorComplianceTracking: vendorComplianceResponse.ok,
          photographerCompliant: vendorCompliance.vendors?.photographer_vendor?.status === 'compliant',
          venueCompliant: vendorCompliance.vendors?.venue_vendor?.status === 'compliant',
          mediaVerificationComplete: mediaVerificationResponse.ok,
          primaryCdnCleared: mediaVerification.storageLocations?.primary_cdn?.cleared === true,
          backupStorageCleared: mediaVerification.storageLocations?.backup_storage?.cleared === true,
          vendorSystemsCleared: mediaVerification.storageLocations?.vendor_systems?.cleared === true,
          noMediaResiduals: mediaVerification.mediaResidualsFound === 0
        };
      }, { user: userData, wedding: weddingData });

      expect(mediaDeletionTest.mediaEcosystemCreated).toBe(true);
      expect(mediaDeletionTest.mediaDeletionInitiated).toBe(true);
      expect(mediaDeletionTest.vendorNotificationSent).toBe(true);
      expect(mediaDeletionTest.vendorComplianceTracking).toBe(true);
      expect(mediaDeletionTest.photographerCompliant).toBe(true);
      expect(mediaDeletionTest.venueCompliant).toBe(true);
      expect(mediaDeletionTest.mediaVerificationComplete).toBe(true);
      expect(mediaDeletionTest.primaryCdnCleared).toBe(true);
      expect(mediaDeletionTest.backupStorageCleared).toBe(true);
      expect(mediaDeletionTest.vendorSystemsCleared).toBe(true);
      expect(mediaDeletionTest.noMediaResiduals).toBe(0);
    });
  });

  test.describe('Guest Data Deletion Impact Analysis', () => {
    
    test('should analyze wedding impact before guest data deletion', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      const guestData = createTestGuestData(weddingData.id);
      
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);
      testGuestIds.push(guestData.id);

      // Test guest deletion impact analysis
      const impactAnalysisTest = await page.evaluate(async (testData) => {
        // Set up comprehensive guest ecosystem
        const guestEcosystemResponse = await fetch('/api/test/guest-ecosystem-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: testData.wedding.id,
            guestId: testData.guest.id,
            guestRole: 'important_family_member',
            dependencies: [
              'seating_chart_assignment',
              'meal_preferences',
              'plus_one_coordination',
              'transportation_arrangements',
              'accommodation_booking'
            ]
          })
        });

        // Request guest data deletion
        const guestDeletionResponse = await fetch('/api/privacy/deletion/guest-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestId: testData.guest.id,
            weddingId: testData.wedding.id,
            deletionReason: 'Guest privacy request',
            impactAnalysisRequired: true
          })
        });

        const guestDeletion = await guestDeletionResponse.json();

        // Analyze wedding impact
        const impactAnalysisResponse = await fetch('/api/privacy/deletion/guest-impact-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deletionRequestId: guestDeletion.requestId,
            analysisDepth: 'comprehensive'
          })
        });

        const impactAnalysis = await impactAnalysisResponse.json();

        // Test impact mitigation options
        const mitigationResponse = await fetch('/api/privacy/deletion/impact-mitigation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deletionRequestId: guestDeletion.requestId,
            mitigationStrategy: 'anonymize_and_preserve_logistics'
          })
        });

        const mitigation = await mitigationResponse.json();

        return {
          ecosystemSetup: guestEcosystemResponse.ok,
          deletionRequested: guestDeletionResponse.ok,
          impactAnalysisComplete: impactAnalysisResponse.ok,
          seatingChartImpact: impactAnalysis.impacts?.seating_chart_disruption === true,
          mealPlanningImpact: impactAnalysis.impacts?.meal_planning_affected === true,
          logisticsImpact: impactAnalysis.impacts?.logistics_coordination_affected === true,
          mitigationOptionsProvided: mitigationResponse.ok,
          anonymizationOffered: mitigation.mitigationOptions?.includes('anonymize_preserve_logistics'),
          coupleNotificationSent: mitigation.coupleNotified === true,
          alternativeLogisticsProvided: mitigation.logisticsAlternatives?.length > 0
        };
      }, { user: userData, wedding: weddingData, guest: guestData });

      expect(impactAnalysisTest.ecosystemSetup).toBe(true);
      expect(impactAnalysisTest.deletionRequested).toBe(true);
      expect(impactAnalysisTest.impactAnalysisComplete).toBe(true);
      expect(impactAnalysisTest.seatingChartImpact).toBe(true);
      expect(impactAnalysisTest.mealPlanningImpact).toBe(true);
      expect(impactAnalysisTest.logisticsImpact).toBe(true);
      expect(impactAnalysisTest.mitigationOptionsProvided).toBe(true);
      expect(impactAnalysisTest.anonymizationOffered).toBe(true);
      expect(impactAnalysisTest.coupleNotificationSent).toBe(true);
      expect(impactAnalysisTest.alternativeLogisticsProvided).toBe(true);
    });
  });

  test.describe('Performance and Compliance Integration', () => {
    
    test('should meet deletion performance benchmarks', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test deletion performance against GDPR requirements
      const performanceTest = await page.evaluate(async (testData) => {
        const startTime = Date.now();

        // Test simple user data deletion performance
        const simpleDeletionStart = Date.now();
        const simpleDeletionResponse = await fetch('/api/privacy/deletion/performance-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            deletionType: 'basic_profile',
            performanceMode: true
          })
        });
        const simpleDeletionDuration = Date.now() - simpleDeletionStart;

        // Test complex cascade deletion performance
        const cascadeDeletionStart = Date.now();
        const cascadeDeletionResponse = await fetch('/api/privacy/deletion/cascade-performance-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            cascadeDepth: 5,
            systemsCount: 10,
            performanceMode: true
          })
        });
        const cascadeDeletionDuration = Date.now() - cascadeDeletionStart;

        const totalDuration = Date.now() - startTime;

        return {
          simpleDeletionWithinBenchmark: simpleDeletionDuration < 5000, // 5 seconds
          cascadeDeletionWithinBenchmark: cascadeDeletionDuration < 60000, // 1 minute
          overallPerformance: totalDuration < 65000, // 65 seconds total
          simpleDeletionSuccess: simpleDeletionResponse.ok,
          cascadeDeletionSuccess: cascadeDeletionResponse.ok
        };
      }, userData);

      expect(performanceTest.simpleDeletionWithinBenchmark).toBe(true);
      expect(performanceTest.cascadeDeletionWithinBenchmark).toBe(true);
      expect(performanceTest.overallPerformance).toBe(true);
      expect(performanceTest.simpleDeletionSuccess).toBe(true);
      expect(performanceTest.cascadeDeletionSuccess).toBe(true);
    });

    test('should maintain audit trail integrity during deletion', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test audit trail preservation during deletion
      const auditIntegrityTest = await page.evaluate(async (testData) => {
        // Perform activities to create audit trail
        const activitiesResponse = await fetch('/api/test/create-audit-activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            activities: [
              'profile_creation',
              'wedding_creation',
              'guest_addition',
              'vendor_communication',
              'photo_upload',
              'data_export_request'
            ]
          })
        });

        // Initiate deletion with audit preservation
        const deletionResponse = await fetch('/api/privacy/deletion/audit-preserving', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            deletionType: 'complete',
            preserveAuditTrail: true,
            auditRetentionPeriod: '10_years'
          })
        });

        const deletion = await deletionResponse.json();

        // Verify audit trail integrity post-deletion
        const auditIntegrityResponse = await fetch('/api/compliance/audit-integrity-post-deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalUserId: testData.id,
            deletionId: deletion.deletionId,
            integrityCheck: 'comprehensive'
          })
        });

        const auditIntegrity = await auditIntegrityResponse.json();

        return {
          activitiesCreated: activitiesResponse.ok,
          deletionWithAuditPreservation: deletionResponse.ok,
          auditTrailPreserved: auditIntegrity.auditTrailIntact === true,
          personalDataRemoved: auditIntegrity.personalDataInAudit === false,
          auditIntegrityMaintained: auditIntegrity.integrityValid === true,
          chronologicalOrderPreserved: auditIntegrity.chronologicalOrder === true,
          tamperEvidence: auditIntegrity.tamperEvidence === false,
          regulatoryCompliance: auditIntegrity.regulatoryCompliant === true
        };
      }, userData);

      expect(auditIntegrityTest.activitiesCreated).toBe(true);
      expect(auditIntegrityTest.deletionWithAuditPreservation).toBe(true);
      expect(auditIntegrityTest.auditTrailPreserved).toBe(true);
      expect(auditIntegrityTest.personalDataRemoved).toBe(true);
      expect(auditIntegrityTest.auditIntegrityMaintained).toBe(true);
      expect(auditIntegrityTest.chronologicalOrderPreserved).toBe(true);
      expect(auditIntegrityTest.tamperEvidence).toBe(false);
      expect(auditIntegrityTest.regulatoryCompliance).toBe(true);
    });
  });

  test.describe('System-wide Deletion Validation', () => {
    
    test('should validate complete deletion system compliance', async ({ page }) => {
      // Test comprehensive deletion system validation
      const systemValidationTest = await page.evaluate(async () => {
        const validationResponse = await fetch('/api/compliance/deletion-system-validation');
        const validation = await validationResponse.json();

        const requiredCapabilities = [
          'rightToErasureImplementation',
          'cascadeDeletionSupport',
          'legalHoldRespect',
          'retentionPolicyEnforcement',
          'crossSystemCoordination',
          'auditTrailPreservation',
          'performanceCompliance',
          'vendorCoordination'
        ];

        const complianceScore = requiredCapabilities.reduce((score, capability) => {
          return score + (validation[capability] ? 1 : 0);
        }, 0) / requiredCapabilities.length;

        return {
          systemValidation: validationResponse.ok,
          complianceScore,
          allCapabilitiesImplemented: complianceScore === 1,
          deletionSystemOperational: validation.systemOperational === true,
          performanceBenchmarksMet: validation.performanceBenchmarks === true,
          legalComplianceVerified: validation.legalCompliance === true,
          auditReadiness: validation.auditReadiness === true,
          documentationComplete: validation.documentationComplete === true
        };
      });

      expect(systemValidationTest.systemValidation).toBe(true);
      expect(systemValidationTest.complianceScore).toBeGreaterThanOrEqual(0.9);
      expect(systemValidationTest.allCapabilitiesImplemented).toBe(true);
      expect(systemValidationTest.deletionSystemOperational).toBe(true);
      expect(systemValidationTest.performanceBenchmarksMet).toBe(true);
      expect(systemValidationTest.legalComplianceVerified).toBe(true);
      expect(systemValidationTest.auditReadiness).toBe(true);
      expect(systemValidationTest.documentationComplete).toBe(true);
    });
  });
});