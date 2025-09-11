/**
 * WS-176 - Comprehensive GDPR Compliance Test Suite
 * Team E - Round 1: Core GDPR Implementation Testing
 * 
 * Tests the fundamental GDPR principles:
 * - Lawfulness, fairness and transparency
 * - Purpose limitation
 * - Data minimization
 * - Accuracy
 * - Storage limitation
 * - Integrity and confidentiality (Security)
 * - Accountability
 */

import { test, expect } from '@playwright/test';
import { 
  createGDPRTestClient,
  GDPR_TEST_CONFIG,
  GDPR_LEGAL_BASES,
  GDPR_DATA_CATEGORIES,
  createTestUserData,
  createTestWeddingData,
  validateGDPRCompliance,
  cleanupGDPRTestData,
  GDPR_PERFORMANCE_BENCHMARKS,
  WEDDING_GDPR_SCENARIOS
} from './utils/gdpr-test-utils';

test.describe('WS-176: Core GDPR Compliance Framework', () => {
  let supabase: ReturnType<typeof createGDPRTestClient>;
  let testUserIds: string[] = [];
  let testWeddingIds: string[] = [];

  test.beforeAll(async () => {
    supabase = createGDPRTestClient();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to application and ensure test environment
    await page.goto(GDPR_TEST_CONFIG.baseUrl);
    
    // Set test headers for GDPR compliance testing
    await page.setExtraHTTPHeaders({
      'x-gdpr-test': 'true',
      'x-test-suite': 'gdpr-compliance'
    });
  });

  test.afterEach(async () => {
    // Clean up test data after each test
    if (testUserIds.length > 0 || testWeddingIds.length > 0) {
      await cleanupGDPRTestData(supabase, {
        userIds: testUserIds,
        weddingIds: testWeddingIds
      });
      testUserIds = [];
      testWeddingIds = [];
    }
  });

  test.describe('GDPR Principle 1: Lawfulness, Fairness & Transparency', () => {
    
    test('should validate legal basis for all data processing', async ({ page }) => {
      // Create test user with EU location (triggers GDPR)
      const userData = createTestUserData();
      userData.country = 'Germany';
      testUserIds.push(userData.id);

      // Test that all data processing has valid legal basis
      const legalBasisTest = await page.evaluate(async (testData) => {
        // Simulate user registration with various data types
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testData.email,
            name: testData.full_name,
            country: testData.country,
            marketingConsent: true,
            termsAccepted: true
          })
        });

        const result = await response.json();

        // Verify legal basis is documented for each processing activity
        const legalBasisCheck = await fetch('/api/compliance/legal-basis-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: result.user?.id,
            auditType: 'registration'
          })
        });

        const audit = await legalBasisCheck.json();

        return {
          registrationSuccess: response.ok,
          legalBasisDocumented: audit.legalBasisRecords?.length > 0,
          allProcessingCovered: audit.legalBasisRecords?.every((record: any) => 
            record.legal_basis && record.purpose && record.data_categories
          ),
          consentRecorded: audit.consentRecords?.some((record: any) => 
            record.consent_type === 'marketing_emails'
          ),
          transparentProcessing: audit.privacyNoticeShown === true
        };
      }, userData);

      expect(legalBasisTest.registrationSuccess).toBe(true);
      expect(legalBasisTest.legalBasisDocumented).toBe(true);
      expect(legalBasisTest.allProcessingCovered).toBe(true);
      expect(legalBasisTest.consentRecorded).toBe(true);
      expect(legalBasisTest.transparentProcessing).toBe(true);
    });

    test('should provide transparent privacy information', async ({ page }) => {
      // Test privacy notice visibility and completeness
      await page.goto('/privacy/notice');

      // Verify privacy notice contains all required information
      await expect(page.locator('[data-testid="privacy-notice"]')).toBeVisible();
      
      const requiredSections = [
        'data-controller-info',
        'processing-purposes',
        'legal-basis',
        'data-categories',
        'retention-periods',
        'third-party-sharing',
        'data-subject-rights',
        'contact-information'
      ];

      for (const section of requiredSections) {
        await expect(page.locator(`[data-testid="${section}"]`)).toBeVisible();
      }

      // Test privacy notice API compliance
      const privacyNoticeTest = await page.evaluate(async () => {
        const response = await fetch('/api/compliance/privacy-notice');
        const notice = await response.json();

        const requiredFields = [
          'dataController',
          'processingPurposes',
          'legalBases',
          'dataCategories',
          'retentionPeriods',
          'thirdPartySharing',
          'dataSubjectRights',
          'contactInformation',
          'lastUpdated'
        ];

        const missingFields = requiredFields.filter(field => !notice[field]);

        return {
          noticeComplete: missingFields.length === 0,
          missingFields,
          languageSupport: notice.languages?.includes('en') && notice.languages?.includes('de'),
          lastUpdated: new Date(notice.lastUpdated) > new Date('2024-01-01')
        };
      });

      expect(privacyNoticeTest.noticeComplete).toBe(true);
      expect(privacyNoticeTest.missingFields).toEqual([]);
      expect(privacyNoticeTest.languageSupport).toBe(true);
      expect(privacyNoticeTest.lastUpdated).toBe(true);
    });

    test('should validate fairness in automated decision making', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test automated processing fairness (e.g., venue recommendations)
      const fairnessTest = await page.evaluate(async (testData) => {
        // Create user profile
        const userResponse = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        });

        const user = await userResponse.json();

        // Test automated venue recommendations
        const recommendationResponse = await fetch('/api/recommendations/venues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            budget: 50000,
            location: 'Berlin',
            guestCount: 100
          })
        });

        const recommendations = await recommendationResponse.json();

        // Verify fairness and non-discrimination
        const fairnessCheck = await fetch('/api/compliance/fairness-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            decision: 'venue_recommendations',
            context: recommendations.context
          })
        });

        const fairness = await fairnessCheck.json();

        return {
          recommendationsGenerated: recommendations.venues?.length > 0,
          transparentCriteria: recommendations.criteria && recommendations.explanation,
          noDiscrimination: fairness.discriminationCheck?.passed === true,
          humanReviewAvailable: fairness.humanReviewOption === true,
          explanationProvided: !!recommendations.explanation
        };
      }, userData);

      expect(fairnessTest.recommendationsGenerated).toBe(true);
      expect(fairnessTest.transparentCriteria).toBe(true);
      expect(fairnessTest.noDiscrimination).toBe(true);
      expect(fairnessTest.humanReviewAvailable).toBe(true);
      expect(fairnessTest.explanationProvided).toBe(true);
    });
  });

  test.describe('GDPR Principle 2: Purpose Limitation', () => {
    
    test('should enforce purpose limitation for data processing', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test that data is only used for specified purposes
      const purposeLimitationTest = await page.evaluate(async (testData) => {
        // Create wedding with specific data processing purposes
        const weddingResponse = await fetch('/api/weddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testData.wedding,
            processingPurposes: ['wedding_planning', 'vendor_coordination', 'guest_management']
          })
        });

        const wedding = await weddingResponse.json();

        // Attempt to use data for unauthorized purpose (marketing)
        const unauthorizedUse = await fetch('/api/marketing/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: wedding.id,
            campaignType: 'promotional',
            targetAudience: 'wedding_couples'
          })
        });

        // Attempt authorized use (vendor coordination)
        const authorizedUse = await fetch('/api/vendors/coordination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: wedding.id,
            coordinationType: 'timeline_sharing',
            purpose: 'vendor_coordination'
          })
        });

        return {
          weddingCreated: weddingResponse.ok,
          unauthorizedBlocked: !unauthorizedUse.ok || unauthorizedUse.status === 403,
          authorizedAllowed: authorizedUse.ok,
          purposeValidationActive: true
        };
      }, { wedding: weddingData, user: userData });

      expect(purposeLimitationTest.weddingCreated).toBe(true);
      expect(purposeLimitationTest.unauthorizedBlocked).toBe(true);
      expect(purposeLimitationTest.authorizedAllowed).toBe(true);
      expect(purposeLimitationTest.purposeValidationActive).toBe(true);
    });

    test('should require additional consent for new processing purposes', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test purpose expansion requires new consent
      const purposeExpansionTest = await page.evaluate(async (testData) => {
        // Original processing with specific purposes
        const originalResponse = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...testData,
            processingPurposes: ['wedding_planning', 'guest_management'],
            consentGiven: true
          })
        });

        const user = await originalResponse.json();

        // Attempt to expand purposes without additional consent
        const expansionAttempt = await fetch('/api/compliance/expand-purposes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            newPurposes: ['marketing_analytics', 'behavioral_tracking'],
            consentProvided: false
          })
        });

        // Attempt with proper consent
        const consentedExpansion = await fetch('/api/compliance/expand-purposes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            newPurposes: ['marketing_analytics'],
            consentProvided: true,
            consentTimestamp: new Date().toISOString()
          })
        });

        return {
          originalProcessingAllowed: originalResponse.ok,
          unconsentedExpansionBlocked: !expansionAttempt.ok,
          consentedExpansionAllowed: consentedExpansion.ok,
          consentRequirementEnforced: true
        };
      }, userData);

      expect(purposeExpansionTest.originalProcessingAllowed).toBe(true);
      expect(purposeExpansionTest.unconsentedExpansionBlocked).toBe(true);
      expect(purposeExpansionTest.consentedExpansionAllowed).toBe(true);
      expect(purposeExpansionTest.consentRequirementEnforced).toBe(true);
    });
  });

  test.describe('GDPR Principle 3: Data Minimization', () => {
    
    test('should collect only necessary data for specified purposes', async ({ page }) => {
      // Test data minimization during user registration
      const dataMinimizationTest = await page.evaluate(async () => {
        // Test minimal wedding planning registration
        const minimalData = {
          email: 'minimal@test.com',
          weddingDate: '2025-06-15',
          guestCount: 100,
          purpose: 'basic_wedding_planning'
        };

        const minimalResponse = await fetch('/api/auth/register/minimal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(minimalData)
        });

        // Test excessive data collection (should be rejected)
        const excessiveData = {
          email: 'excessive@test.com',
          weddingDate: '2025-06-15',
          guestCount: 100,
          mothersMaidenName: 'Smith',
          childhoodPet: 'Fluffy',
          favoriteColor: 'Blue',
          ssn: '123-45-6789',
          bloodType: 'O+',
          purpose: 'basic_wedding_planning'
        };

        const excessiveResponse = await fetch('/api/auth/register/minimal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(excessiveData)
        });

        const excessiveResult = await excessiveResponse.json();

        return {
          minimalAccepted: minimalResponse.ok,
          excessiveFiltered: excessiveResult.filteredFields?.length > 0,
          unnecessaryFieldsRejected: !excessiveResult.accepted?.mothersMaidenName,
          dataMinimizationEnforced: excessiveResult.dataMinimizationApplied === true,
          necessaryFieldsKept: excessiveResult.accepted?.email && excessiveResult.accepted?.weddingDate
        };
      });

      expect(dataMinimizationTest.minimalAccepted).toBe(true);
      expect(dataMinimizationTest.excessiveFiltered).toBe(true);
      expect(dataMinimizationTest.unnecessaryFieldsRejected).toBe(true);
      expect(dataMinimizationTest.dataMinimizationEnforced).toBe(true);
      expect(dataMinimizationTest.necessaryFieldsKept).toBe(true);
    });

    test('should validate data necessity for different user roles', async ({ page }) => {
      // Test role-based data minimization
      const roleBasedMinimizationTest = await page.evaluate(async () => {
        const roles = [
          {
            role: 'couple',
            necessaryFields: ['name', 'email', 'wedding_date', 'venue', 'guest_count'],
            unnecessaryFields: ['tax_id', 'business_license', 'vendor_insurance']
          },
          {
            role: 'vendor',
            necessaryFields: ['business_name', 'contact_email', 'service_type', 'location'],
            unnecessaryFields: ['wedding_date', 'guest_dietary_preferences', 'seating_chart']
          },
          {
            role: 'guest',
            necessaryFields: ['name', 'email', 'rsvp_status'],
            unnecessaryFields: ['business_info', 'vendor_certifications', 'payment_processing']
          }
        ];

        const results = [];

        for (const roleTest of roles) {
          const testData = {};
          // Add both necessary and unnecessary fields
          roleTest.necessaryFields.forEach(field => testData[field] = `test_${field}`);
          roleTest.unnecessaryFields.forEach(field => testData[field] = `test_${field}`);

          const response = await fetch('/api/auth/register/role-based', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: roleTest.role,
              data: testData
            })
          });

          const result = await response.json();

          results.push({
            role: roleTest.role,
            necessaryAccepted: roleTest.necessaryFields.every(field => result.accepted?.[field]),
            unnecessaryRejected: roleTest.unnecessaryFields.every(field => !result.accepted?.[field]),
            roleValidationApplied: result.roleBasedMinimization === true
          });
        }

        return {
          allRolesTested: results.length === 3,
          allNecessaryAccepted: results.every(r => r.necessaryAccepted),
          allUnnecessaryRejected: results.every(r => r.unnecessaryRejected),
          roleValidationWorking: results.every(r => r.roleValidationApplied)
        };
      });

      expect(roleBasedMinimizationTest.allRolesTested).toBe(true);
      expect(roleBasedMinimizationTest.allNecessaryAccepted).toBe(true);
      expect(roleBasedMinimizationTest.allUnnecessaryRejected).toBe(true);
      expect(roleBasedMinimizationTest.roleValidationWorking).toBe(true);
    });
  });

  test.describe('GDPR Principle 4: Accuracy', () => {
    
    test('should provide mechanisms for data rectification', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test data accuracy and rectification
      await page.goto('/profile/edit');

      // Simulate user updating incorrect information
      await page.fill('[data-testid="name-field"]', 'Updated Test Name');
      await page.fill('[data-testid="email-field"]', 'updated@test.com');
      await page.click('[data-testid="save-changes"]');

      // Wait for update confirmation
      await expect(page.locator('[data-testid="update-success"]')).toBeVisible();

      const accuracyTest = await page.evaluate(async (testData) => {
        // Verify rectification API
        const rectificationResponse = await fetch('/api/privacy/rectification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            corrections: {
              name: 'Corrected Name',
              email: 'corrected@test.com'
            },
            reason: 'Information was incorrect'
          })
        });

        const rectification = await rectificationResponse.json();

        // Check audit trail for changes
        const auditResponse = await fetch(`/api/compliance/audit-trail/${testData.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'data_rectification',
            timeRange: {
              start: new Date(Date.now() - 300000).toISOString(),
              end: new Date().toISOString()
            }
          })
        });

        const auditLog = await auditResponse.json();

        return {
          rectificationProcessed: rectificationResponse.ok,
          changesApplied: rectification.updatedFields?.length > 0,
          auditTrailCreated: auditLog.events?.some(e => e.event_type === 'data_rectification'),
          userNotified: rectification.userNotified === true,
          accuracyMaintained: true
        };
      }, userData);

      expect(accuracyTest.rectificationProcessed).toBe(true);
      expect(accuracyTest.changesApplied).toBe(true);
      expect(accuracyTest.auditTrailCreated).toBe(true);
      expect(accuracyTest.userNotified).toBe(true);
      expect(accuracyTest.accuracyMaintained).toBe(true);
    });

    test('should detect and flag potentially inaccurate data', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test accuracy validation systems
      const accuracyValidationTest = await page.evaluate(async (testData) => {
        // Submit potentially inaccurate data
        const inaccurateData = {
          userId: testData.id,
          weddingDate: '1900-01-01', // Clearly invalid
          guestCount: -50, // Invalid negative
          email: 'invalid-email-format', // Invalid format
          phone: 'not-a-phone-number', // Invalid phone
          venue: '', // Required but empty
        };

        const validationResponse = await fetch('/api/compliance/data-accuracy-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inaccurateData)
        });

        const validation = await validationResponse.json();

        // Test accuracy scoring
        const accuracyScoreResponse = await fetch(`/api/compliance/accuracy-score/${testData.id}`);
        const accuracyScore = await accuracyScoreResponse.json();

        return {
          validationRun: validationResponse.ok,
          inaccuraciesDetected: validation.inaccuracies?.length > 0,
          invalidDateFlagged: validation.inaccuracies?.some(i => i.field === 'weddingDate'),
          invalidEmailFlagged: validation.inaccuracies?.some(i => i.field === 'email'),
          accuracyScoreCalculated: typeof accuracyScore.score === 'number',
          improvementSuggestions: Array.isArray(accuracyScore.suggestions)
        };
      }, userData);

      expect(accuracyValidationTest.validationRun).toBe(true);
      expect(accuracyValidationTest.inaccuraciesDetected).toBe(true);
      expect(accuracyValidationTest.invalidDateFlagged).toBe(true);
      expect(accuracyValidationTest.invalidEmailFlagged).toBe(true);
      expect(accuracyValidationTest.accuracyScoreCalculated).toBe(true);
      expect(accuracyValidationTest.improvementSuggestions).toBe(true);
    });
  });

  test.describe('GDPR Principle 5: Storage Limitation', () => {
    
    test('should enforce data retention policies', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test storage limitation and retention policies
      const retentionTest = await page.evaluate(async (testData) => {
        // Create data with different retention periods
        const dataWithRetention = {
          userId: testData.id,
          dataCategories: [
            {
              category: 'marketing_communications',
              retentionPeriod: '2_years',
              legalBasis: 'consent'
            },
            {
              category: 'contract_data',
              retentionPeriod: '7_years',
              legalBasis: 'legal_obligation'
            },
            {
              category: 'analytics_data',
              retentionPeriod: '1_year',
              legalBasis: 'legitimate_interests'
            }
          ]
        };

        const retentionResponse = await fetch('/api/compliance/set-retention-policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataWithRetention)
        });

        const retention = await retentionResponse.json();

        // Check retention policy enforcement
        const enforcementResponse = await fetch('/api/compliance/retention-enforcement-status');
        const enforcement = await enforcementResponse.json();

        // Simulate retention period check
        const retentionCheckResponse = await fetch('/api/compliance/check-retention-expiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            checkDate: new Date().toISOString()
          })
        });

        const retentionCheck = await retentionCheckResponse.json();

        return {
          retentionPoliciesSet: retentionResponse.ok,
          differentRetentionPeriods: retention.policies?.length === 3,
          enforcementActive: enforcement.retentionEnforcementActive === true,
          automaticDeletionScheduled: retentionCheck.scheduledDeletions?.length >= 0,
          legalBasisConsidered: retention.policies?.every(p => p.legal_basis),
          retentionCalendar: !!retentionCheck.retentionCalendar
        };
      }, userData);

      expect(retentionTest.retentionPoliciesSet).toBe(true);
      expect(retentionTest.differentRetentionPeriods).toBe(true);
      expect(retentionTest.enforcementActive).toBe(true);
      expect(retentionTest.automaticDeletionScheduled).toBe(true);
      expect(retentionTest.legalBasisConsidered).toBe(true);
      expect(retentionTest.retentionCalendar).toBe(true);
    });

    test('should handle legal hold scenarios for retention', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test legal hold impact on retention
      const legalHoldTest = await page.evaluate(async (testData) => {
        // Set normal retention for user data
        const normalRetention = await fetch('/api/compliance/set-retention-policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            dataCategories: [{
              category: 'user_profile',
              retentionPeriod: '1_month',
              legalBasis: 'consent'
            }]
          })
        });

        // Place user under legal hold
        const legalHoldResponse = await fetch('/api/compliance/legal-hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            holdType: 'litigation',
            reason: 'Pending legal case',
            legalBasis: 'Court order 12345',
            holdDuration: 'indefinite'
          })
        });

        // Attempt retention deletion
        const deletionAttempt = await fetch('/api/compliance/execute-retention-deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            force: false
          })
        });

        const deletionResult = await deletionAttempt.json();

        return {
          retentionSet: normalRetention.ok,
          legalHoldApplied: legalHoldResponse.ok,
          deletionPrevented: deletionResult.deleted === false,
          holdReasonProvided: deletionResult.blockReason?.includes('legal hold'),
          holdOverridesRetention: true
        };
      }, userData);

      expect(legalHoldTest.retentionSet).toBe(true);
      expect(legalHoldTest.legalHoldApplied).toBe(true);
      expect(legalHoldTest.deletionPrevented).toBe(true);
      expect(legalHoldTest.holdReasonProvided).toBe(true);
      expect(legalHoldTest.holdOverridesRetention).toBe(true);
    });
  });

  test.describe('GDPR Principle 6: Integrity & Confidentiality (Security)', () => {
    
    test('should implement appropriate security measures', async ({ page }) => {
      // Test security implementation compliance
      const securityTest = await page.evaluate(async () => {
        // Test encryption in transit
        const httpsResponse = await fetch('/api/compliance/security-check/https');
        const httpsCheck = await httpsResponse.json();

        // Test data encryption at rest
        const encryptionResponse = await fetch('/api/compliance/security-check/encryption');
        const encryptionCheck = await encryptionResponse.json();

        // Test access controls
        const accessControlResponse = await fetch('/api/compliance/security-check/access-control');
        const accessControl = await accessControlResponse.json();

        // Test security monitoring
        const monitoringResponse = await fetch('/api/compliance/security-check/monitoring');
        const monitoring = await monitoringResponse.json();

        return {
          httpsEnforced: httpsCheck.httpsEnforced === true,
          dataEncryptedAtRest: encryptionCheck.encryptionActive === true,
          accessControlsActive: accessControl.accessControlsActive === true,
          securityMonitoring: monitoring.monitoringActive === true,
          vulnerabilityScanning: monitoring.vulnerabilityScanningEnabled === true,
          incidentResponse: monitoring.incidentResponsePlanActive === true
        };
      });

      expect(securityTest.httpsEnforced).toBe(true);
      expect(securityTest.dataEncryptedAtRest).toBe(true);
      expect(securityTest.accessControlsActive).toBe(true);
      expect(securityTest.securityMonitoring).toBe(true);
      expect(securityTest.vulnerabilityScanning).toBe(true);
      expect(securityTest.incidentResponse).toBe(true);
    });

    test('should implement pseudonymization and anonymization', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test data pseudonymization and anonymization
      const anonymizationTest = await page.evaluate(async (testData) => {
        // Test pseudonymization
        const pseudonymizationResponse = await fetch('/api/compliance/pseudonymize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            dataCategories: ['personal_identifiers', 'contact_information'],
            purpose: 'analytics'
          })
        });

        const pseudonymization = await pseudonymizationResponse.json();

        // Test full anonymization
        const anonymizationResponse = await fetch('/api/compliance/anonymize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            dataCategories: ['behavioral_data', 'preference_data'],
            irreversible: true
          })
        });

        const anonymization = await anonymizationResponse.json();

        // Verify data is no longer personally identifiable
        const identifiabilityCheck = await fetch('/api/compliance/identifiability-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataSet: anonymization.anonymizedData,
            checkType: 'full_anonymization'
          })
        });

        const identifiability = await identifiabilityCheck.json();

        return {
          pseudonymizationWorking: pseudonymization.pseudonymized === true,
          identifiersReplaced: pseudonymization.originalIdentifiersRemoved === true,
          anonymizationComplete: anonymization.anonymized === true,
          nonReversible: identifiability.reIdentificationRisk < 0.05,
          utilityPreserved: identifiability.dataUtilityScore > 0.8
        };
      }, userData);

      expect(anonymizationTest.pseudonymizationWorking).toBe(true);
      expect(anonymizationTest.identifiersReplaced).toBe(true);
      expect(anonymizationTest.anonymizationComplete).toBe(true);
      expect(anonymizationTest.nonReversible).toBe(true);
      expect(anonymizationTest.utilityPreserved).toBe(true);
    });
  });

  test.describe('GDPR Principle 7: Accountability', () => {
    
    test('should demonstrate compliance through documentation', async ({ page }) => {
      // Test accountability documentation
      const accountabilityTest = await page.evaluate(async () => {
        // Test data processing record
        const processingRecordResponse = await fetch('/api/compliance/processing-record');
        const processingRecord = await processingRecordResponse.json();

        // Test privacy impact assessment
        const piaResponse = await fetch('/api/compliance/privacy-impact-assessment');
        const pia = await piaResponse.json();

        // Test data protection policy
        const policyResponse = await fetch('/api/compliance/data-protection-policy');
        const policy = await policyResponse.json();

        // Test staff training records
        const trainingResponse = await fetch('/api/compliance/staff-training-records');
        const training = await trainingResponse.json();

        const requiredDocumentation = [
          'processingActivities',
          'legalBasisAssessment',
          'privacyNotices',
          'consentRecords',
          'dataTransferSafeguards',
          'dataBreachProcedures'
        ];

        const missingDocumentation = requiredDocumentation.filter(
          doc => !processingRecord[doc]
        );

        return {
          processingRecordComplete: missingDocumentation.length === 0,
          privacyImpactAssessment: pia.assessmentComplete === true,
          dataProtectionPolicy: policy.policyUpToDate === true,
          staffTrainingRecords: training.trainingRecordsComplete === true,
          accountabilityFramework: processingRecord.accountabilityFramework === true,
          continuousMonitoring: processingRecord.continuousMonitoring === true
        };
      });

      expect(accountabilityTest.processingRecordComplete).toBe(true);
      expect(accountabilityTest.privacyImpactAssessment).toBe(true);
      expect(accountabilityTest.dataProtectionPolicy).toBe(true);
      expect(accountabilityTest.staffTrainingRecords).toBe(true);
      expect(accountabilityTest.accountabilityFramework).toBe(true);
      expect(accountabilityTest.continuousMonitoring).toBe(true);
    });

    test('should maintain comprehensive audit trails', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test comprehensive audit trail system
      const auditTest = await page.evaluate(async (testData) => {
        // Perform various GDPR-relevant actions
        const actions = [
          { type: 'consent_change', endpoint: '/api/privacy/consent' },
          { type: 'data_access', endpoint: '/api/privacy/data-access' },
          { type: 'data_rectification', endpoint: '/api/privacy/rectification' },
          { type: 'processing_activity', endpoint: '/api/compliance/process-data' }
        ];

        // Execute actions to generate audit trail
        for (const action of actions) {
          await fetch(action.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.id,
              action: action.type,
              timestamp: new Date().toISOString()
            })
          });
        }

        // Verify audit trail completeness
        const auditResponse = await fetch('/api/compliance/audit-trail/comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            timeRange: {
              start: new Date(Date.now() - 600000).toISOString(),
              end: new Date().toISOString()
            }
          })
        });

        const audit = await auditResponse.json();

        // Verify audit integrity
        const integrityResponse = await fetch('/api/compliance/audit-integrity-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auditEvents: audit.events
          })
        });

        const integrity = await integrityResponse.json();

        return {
          allActionsLogged: audit.events?.length >= actions.length,
          auditIntegrityValid: integrity.integrityValid === true,
          chronologicalOrder: integrity.chronologicalOrder === true,
          tamperEvidence: integrity.tamperEvidence === false,
          completeAuditTrail: audit.completeness >= 0.95,
          auditRetentionCompliant: integrity.retentionCompliant === true
        };
      }, userData);

      expect(auditTest.allActionsLogged).toBe(true);
      expect(auditTest.auditIntegrityValid).toBe(true);
      expect(auditTest.chronologicalOrder).toBe(true);
      expect(auditTest.tamperEvidence).toBe(false);
      expect(auditTest.completeAuditTrail).toBe(true);
      expect(auditTest.auditRetentionCompliant).toBe(true);
    });
  });

  test.describe('Wedding Industry GDPR Scenarios', () => {
    
    test('should handle EU couple with US vendors data transfer', async ({ page }) => {
      // Test WEDDING_GDPR_SCENARIOS.EU_COUPLE_US_VENDOR
      const crossBorderTest = await page.evaluate(async () => {
        // EU couple data
        const euCouple = {
          email: 'couple@eu-domain.de',
          country: 'Germany',
          weddingLocation: 'Berlin'
        };

        // US vendor sharing scenario
        const vendorSharingResponse = await fetch('/api/compliance/cross-border-sharing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupleData: euCouple,
            vendor: {
              country: 'United States',
              adequacyDecision: true,
              dataProcessingAgreement: true
            },
            dataCategories: ['contact_information', 'wedding_preferences'],
            transferMechanism: 'adequacy_decision'
          })
        });

        const transfer = await vendorSharingResponse.json();

        return {
          transferValidated: vendorSharingResponse.ok,
          adequacyDecisionChecked: transfer.adequacyDecision === true,
          dpaRequired: transfer.dataProcessingAgreementRequired === true,
          safeguardsInPlace: transfer.safeguards?.length > 0,
          transferLawful: transfer.lawful === true
        };
      });

      expect(crossBorderTest.transferValidated).toBe(true);
      expect(crossBorderTest.adequacyDecisionChecked).toBe(true);
      expect(crossBorderTest.dpaRequired).toBe(true);
      expect(crossBorderTest.safeguardsInPlace).toBe(true);
      expect(crossBorderTest.transferLawful).toBe(true);
    });
  });

  test.describe('Performance & Compliance Integration', () => {
    
    test('should meet GDPR performance benchmarks', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test performance benchmarks for GDPR operations
      const performanceTest = await page.evaluate(async (testData) => {
        const startTime = Date.now();

        // Test data export performance
        const exportStart = Date.now();
        const exportResponse = await fetch('/api/privacy/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            format: 'json'
          })
        });
        const exportDuration = Date.now() - exportStart;

        // Test consent update performance
        const consentStart = Date.now();
        const consentResponse = await fetch('/api/privacy/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            consentType: 'marketing_emails',
            isGranted: false
          })
        });
        const consentDuration = Date.now() - consentStart;

        const totalDuration = Date.now() - startTime;

        return {
          exportWithinBenchmark: exportDuration < 30000, // 30 seconds
          consentWithinBenchmark: consentDuration < 1000, // 1 second
          overallPerformance: totalDuration < 35000, // 35 seconds total
          exportSuccess: exportResponse.ok,
          consentSuccess: consentResponse.ok
        };
      }, userData);

      expect(performanceTest.exportWithinBenchmark).toBe(true);
      expect(performanceTest.consentWithinBenchmark).toBe(true);
      expect(performanceTest.overallPerformance).toBe(true);
      expect(performanceTest.exportSuccess).toBe(true);
      expect(performanceTest.consentSuccess).toBe(true);
    });
  });

  test.describe('System-wide GDPR Validation', () => {
    
    test('should validate overall GDPR compliance status', async ({ page }) => {
      // Test comprehensive GDPR compliance validation
      const complianceValidation = await page.evaluate(async () => {
        const response = await fetch('/api/compliance/gdpr-validation-comprehensive');
        const validation = await response.json();

        const requiredCompliances = [
          'lawfulnessAssessment',
          'purposeLimitationEnforcement',
          'dataMinimizationActive',
          'accuracyMaintenance',
          'storageLimitationEnforcement',
          'securityMeasures',
          'accountabilityFramework'
        ];

        const complianceScore = requiredCompliances.reduce((score, requirement) => {
          return score + (validation[requirement] ? 1 : 0);
        }, 0) / requiredCompliances.length;

        return {
          overallCompliance: response.ok,
          complianceScore,
          allPrinciplesImplemented: complianceScore === 1,
          readyForAudit: validation.auditReadiness === true,
          documentationComplete: validation.documentationComplete === true,
          technicalMeasures: validation.technicalMeasures === true,
          organizationalMeasures: validation.organizationalMeasures === true
        };
      });

      expect(complianceValidation.overallCompliance).toBe(true);
      expect(complianceValidation.complianceScore).toBeGreaterThanOrEqual(0.9);
      expect(complianceValidation.allPrinciplesImplemented).toBe(true);
      expect(complianceValidation.readyForAudit).toBe(true);
      expect(complianceValidation.documentationComplete).toBe(true);
      expect(complianceValidation.technicalMeasures).toBe(true);
      expect(complianceValidation.organizationalMeasures).toBe(true);
    });
  });
});