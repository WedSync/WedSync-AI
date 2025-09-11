/**
 * WS-176 - Data Subject Rights Implementation Testing
 * Team E - Round 1: GDPR Data Subject Rights Testing
 * 
 * Tests implementation of all GDPR data subject rights:
 * - Right of Access (Article 15) - Data export and transparency
 * - Right of Rectification (Article 16) - Data correction
 * - Right to Portability (Article 20) - Machine-readable data transfer
 * - Right to Restriction (Article 18) - Processing limitation
 * - Right to Object (Article 21) - Opt-out from processing
 * - Right not to be subject to automated decision-making (Article 22)
 * - Wedding industry specific rights and complex scenarios
 * - Response timeframes and compliance monitoring
 */

import { test, expect } from '@playwright/test';
import { 
  createGDPRTestClient,
  GDPR_TEST_CONFIG,
  GDPR_DATA_CATEGORIES,
  createTestUserData,
  createTestWeddingData,
  createTestGuestData,
  createPrivacyRequest,
  requestDataExport,
  verifyAuditTrail,
  cleanupGDPRTestData,
  WEDDING_GDPR_SCENARIOS
} from './utils/gdpr-test-utils';

test.describe('WS-176: Data Subject Rights Implementation Testing', () => {
  let supabase: ReturnType<typeof createGDPRTestClient>;
  let testUserIds: string[] = [];
  let testWeddingIds: string[] = [];
  let testGuestIds: string[] = [];

  test.beforeAll(async () => {
    supabase = createGDPRTestClient();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(GDPR_TEST_CONFIG.baseUrl);
    
    // Set privacy rights testing headers
    await page.setExtraHTTPHeaders({
      'x-gdpr-rights-test': 'true',
      'x-test-suite': 'privacy-rights'
    });
  });

  test.afterEach(async () => {
    if (testUserIds.length > 0 || testWeddingIds.length > 0 || testGuestIds.length > 0) {
      await cleanupGDPRTestData(supabase, {
        userIds: testUserIds,
        weddingIds: testWeddingIds,
        guestIds: testGuestIds
      });
      testUserIds = [];
      testWeddingIds = [];
      testGuestIds = [];
    }
  });

  test.describe('Right of Access (Article 15)', () => {
    
    test('should provide comprehensive data access and transparency', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Set up comprehensive user data ecosystem
      await supabase.from('user_profiles').insert(userData);
      await supabase.from('weddings').insert(weddingData);

      // Test right of access request
      const accessRightTest = await page.evaluate(async (testData) => {
        // Request comprehensive data access
        const accessResponse = await fetch('/api/privacy/access/comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            requestType: 'full_access_request',
            includeMetadata: true,
            includeProcessingActivities: true,
            includeThirdPartySharing: true,
            format: 'structured_json'
          })
        });

        const access = await accessResponse.json();

        // Verify data categories completeness
        const categoryResponse = await fetch(`/api/privacy/access/${testData.user.id}/categories`);
        const categories = await categoryResponse.json();

        // Check processing activities transparency
        const processingResponse = await fetch(`/api/privacy/access/${testData.user.id}/processing-activities`);
        const processing = await processingResponse.json();

        // Verify third-party data sharing information
        const sharingResponse = await fetch(`/api/privacy/access/${testData.user.id}/third-party-sharing`);
        const sharing = await sharingResponse.json();

        const requiredDataCategories = [
          'personal_identifiers',
          'contact_information',
          'wedding_details',
          'preferences',
          'communication_history',
          'payment_information',
          'photo_metadata'
        ];

        const categoriesProvided = categories.dataCategories?.map(c => c.category) || [];
        const missingCategories = requiredDataCategories.filter(cat => !categoriesProvided.includes(cat));

        return {
          accessRequestProcessed: accessResponse.ok,
          dataStructureComplete: access.userData && access.metadata && access.processingInfo,
          categoryResponseComplete: categoryResponse.ok,
          allCategoriesProvided: missingCategories.length === 0,
          missingCategories,
          processingActivitiesDisclosed: processingResponse.ok && processing.activities?.length > 0,
          thirdPartySharingDisclosed: sharingResponse.ok,
          legalBasisProvided: processing.activities?.every(a => a.legalBasis),
          purposesSpecified: processing.activities?.every(a => a.purpose),
          retentionPeriodsSpecified: processing.activities?.every(a => a.retentionPeriod),
          dataSourcesIdentified: access.dataSources?.length > 0
        };
      }, { user: userData, wedding: weddingData });

      expect(accessRightTest.accessRequestProcessed).toBe(true);
      expect(accessRightTest.dataStructureComplete).toBe(true);
      expect(accessRightTest.categoryResponseComplete).toBe(true);
      expect(accessRightTest.allCategoriesProvided).toBe(true);
      expect(accessRightTest.missingCategories).toEqual([]);
      expect(accessRightTest.processingActivitiesDisclosed).toBe(true);
      expect(accessRightTest.thirdPartySharingDisclosed).toBe(true);
      expect(accessRightTest.legalBasisProvided).toBe(true);
      expect(accessRightTest.purposesSpecified).toBe(true);
      expect(accessRightTest.retentionPeriodsSpecified).toBe(true);
      expect(accessRightTest.dataSourcesIdentified).toBe(true);
    });

    test('should handle complex wedding data access scenarios', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test wedding-specific data access complexity
      const weddingAccessTest = await page.evaluate(async (testData) => {
        // Create complex wedding data ecosystem
        const ecosystemResponse = await fetch('/api/test/wedding-access-ecosystem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            complexity: 'high',
            includeData: [
              'guest_list_with_dietary_requirements',
              'vendor_communications',
              'photo_metadata_with_locations',
              'timeline_with_personal_notes',
              'budget_with_payment_history',
              'seating_chart_with_relationships'
            ]
          })
        });

        // Request wedding-specific data access
        const weddingAccessResponse = await fetch('/api/privacy/access/wedding-specific', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            accessType: 'detailed_wedding_data',
            includeRelatedPersons: true,
            includeVendorInteractions: true,
            anonymizeThirdPartyData: true
          })
        });

        const weddingAccess = await weddingAccessResponse.json();

        // Test guest data in wedding access (should be anonymized/excluded)
        const guestDataHandlingResponse = await fetch('/api/privacy/access/guest-data-handling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: testData.wedding.id,
            requestingUserId: testData.user.id,
            guestDataPolicy: 'anonymize_or_exclude'
          })
        });

        const guestDataHandling = await guestDataHandlingResponse.json();

        return {
          ecosystemCreated: ecosystemResponse.ok,
          weddingAccessProvided: weddingAccessResponse.ok,
          guestListIncluded: !!weddingAccess.guestList,
          guestPersonalDataExcluded: weddingAccess.guestList?.every(guest => !guest.personalDetails),
          vendorCommunicationsIncluded: !!weddingAccess.vendorCommunications,
          photoMetadataIncluded: !!weddingAccess.photoMetadata,
          budgetDataIncluded: !!weddingAccess.budgetInformation,
          thirdPartyDataProtected: guestDataHandlingResponse.ok,
          anonymizationApplied: guestDataHandling.anonymizationApplied === true,
          weddingPlanningContextPreserved: weddingAccess.contextualInformation?.weddingPlanning === true
        };
      }, { user: userData, wedding: weddingData });

      expect(weddingAccessTest.ecosystemCreated).toBe(true);
      expect(weddingAccessTest.weddingAccessProvided).toBe(true);
      expect(weddingAccessTest.guestListIncluded).toBe(true);
      expect(weddingAccessTest.guestPersonalDataExcluded).toBe(true);
      expect(weddingAccessTest.vendorCommunicationsIncluded).toBe(true);
      expect(weddingAccessTest.photoMetadataIncluded).toBe(true);
      expect(weddingAccessTest.budgetDataIncluded).toBe(true);
      expect(weddingAccessTest.thirdPartyDataProtected).toBe(true);
      expect(weddingAccessTest.anonymizationApplied).toBe(true);
      expect(weddingAccessTest.weddingPlanningContextPreserved).toBe(true);
    });

    test('should meet GDPR response timeframes for access requests', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test access request timeframe compliance
      const timeframeTest = await page.evaluate(async (testData) => {
        // Submit access request with timeframe tracking
        const requestResponse = await fetch('/api/privacy/access/request-with-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            requestDate: new Date().toISOString(),
            urgencyLevel: 'standard',
            complexityLevel: 'medium',
            expectedResponseTime: '30_days'
          })
        });

        const request = await requestResponse.json();

        // Check timeframe monitoring
        const monitoringResponse = await fetch(`/api/privacy/access/${request.requestId}/timeframe-monitoring`);
        const monitoring = await monitoringResponse.json();

        // Test expedited processing for simple requests
        const expeditedResponse = await fetch('/api/privacy/access/expedited', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            requestType: 'basic_profile_access',
            expedited: true
          })
        });

        const expedited = await expeditedResponse.json();

        return {
          requestWithTrackingCreated: requestResponse.ok,
          requestId: request.requestId,
          timeframeMonitoringActive: monitoringResponse.ok,
          responseDeadline: monitoring.responseDeadline,
          within30DayLimit: monitoring.responseDeadline && 
            new Date(monitoring.responseDeadline).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000,
          escalationProcedures: monitoring.escalationProcedures?.length > 0,
          expeditedProcessingAvailable: expeditedResponse.ok,
          fasterResponse: expedited.estimatedResponseTime < '30_days'
        };
      }, userData);

      expect(timeframeTest.requestWithTrackingCreated).toBe(true);
      expect(timeframeTest.requestId).toBeTruthy();
      expect(timeframeTest.timeframeMonitoringActive).toBe(true);
      expect(timeframeTest.responseDeadline).toBeTruthy();
      expect(timeframeTest.within30DayLimit).toBe(true);
      expect(timeframeTest.escalationProcedures).toBe(true);
      expect(timeframeTest.expeditedProcessingAvailable).toBe(true);
      expect(timeframeTest.fasterResponse).toBe(true);
    });
  });

  test.describe('Right of Rectification (Article 16)', () => {
    
    test('should enable comprehensive data correction workflows', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      await page.goto('/profile/edit');

      // Test data rectification capabilities
      const rectificationTest = await page.evaluate(async (testData) => {
        // Submit comprehensive data corrections
        const correctionsResponse = await fetch('/api/privacy/rectification/comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            corrections: [
              {
                category: 'personal_information',
                field: 'name',
                currentValue: testData.user.full_name,
                correctedValue: 'Corrected Full Name',
                reason: 'Name was incorrect due to typo'
              },
              {
                category: 'contact_information',
                field: 'email',
                currentValue: testData.user.email,
                correctedValue: 'corrected@wedding.com',
                reason: 'Email address changed'
              },
              {
                category: 'wedding_details',
                field: 'wedding_date',
                currentValue: testData.wedding.wedding_date,
                correctedValue: '2025-07-15',
                reason: 'Wedding date postponed'
              },
              {
                category: 'preferences',
                field: 'dietary_restrictions',
                currentValue: 'None',
                correctedValue: 'Vegetarian',
                reason: 'Dietary preferences changed'
              }
            ],
            verificationRequired: true,
            propagateChanges: true
          })
        });

        const corrections = await correctionsResponse.json();

        // Verify correction processing
        const verificationResponse = await fetch(`/api/privacy/rectification/${corrections.requestId}/verification`);
        const verification = await verificationResponse.json();

        // Test cascade correction (wedding date change affects multiple systems)
        const cascadeResponse = await fetch(`/api/privacy/rectification/${corrections.requestId}/cascade-check`);
        const cascade = await cascadeResponse.json();

        // Verify audit trail for corrections
        const auditResponse = await fetch(`/api/privacy/rectification/${corrections.requestId}/audit`);
        const audit = await auditResponse.json();

        return {
          correctionsSubmitted: correctionsResponse.ok,
          correctionsProcessed: corrections.correctionStatuses?.every(c => c.status === 'processed'),
          verificationComplete: verificationResponse.ok,
          identityVerified: verification.identityVerified === true,
          cascadeEffectsHandled: cascadeResponse.ok,
          affectedSystems: cascade.affectedSystems?.length || 0,
          vendorNotifications: cascade.vendorNotificationsSent === true,
          auditTrailComplete: auditResponse.ok,
          correctionHistory: audit.correctionHistory?.length > 0,
          originalValuesPreserved: audit.originalValuesPreserved === true
        };
      }, { user: userData, wedding: weddingData });

      expect(rectificationTest.correctionsSubmitted).toBe(true);
      expect(rectificationTest.correctionsProcessed).toBe(true);
      expect(rectificationTest.verificationComplete).toBe(true);
      expect(rectificationTest.identityVerified).toBe(true);
      expect(rectificationTest.cascadeEffectsHandled).toBe(true);
      expect(rectificationTest.affectedSystems).toBeGreaterThan(0);
      expect(rectificationTest.vendorNotifications).toBe(true);
      expect(rectificationTest.auditTrailComplete).toBe(true);
      expect(rectificationTest.correctionHistory).toBe(true);
      expect(rectificationTest.originalValuesPreserved).toBe(true);
    });

    test('should handle disputed data corrections', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test dispute resolution for data corrections
      const disputeTest = await page.evaluate(async (testData) => {
        // Submit disputed correction
        const disputedCorrectionResponse = await fetch('/api/privacy/rectification/disputed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            disputedCorrection: {
              field: 'wedding_venue',
              claimedCurrentValue: 'Garden Hall',
              proposedCorrection: 'City Center Hall',
              reason: 'Venue was changed but system shows old venue'
            },
            supportingEvidence: ['contract_copy', 'email_confirmation'],
            disputeReason: 'System data conflicts with actual booking'
          })
        });

        const disputedCorrection = await disputedCorrectionResponse.json();

        // Test dispute resolution process
        const resolutionResponse = await fetch(`/api/privacy/rectification/dispute-resolution/${disputedCorrection.disputeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolutionAction: 'investigate',
            assignReviewer: 'data_protection_officer'
          })
        });

        const resolution = await resolutionResponse.json();

        // Test evidence evaluation
        const evidenceResponse = await fetch(`/api/privacy/rectification/evaluate-evidence/${disputedCorrection.disputeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evidenceTypes: ['contract_copy', 'email_confirmation'],
            evaluationCriteria: 'authenticity_and_relevance'
          })
        });

        const evidence = await evidenceResponse.json();

        return {
          disputeSubmitted: disputedCorrectionResponse.ok,
          disputeId: disputedCorrection.disputeId,
          resolutionProcessInitiated: resolutionResponse.ok,
          reviewerAssigned: resolution.reviewerAssigned === true,
          evidenceEvaluationComplete: evidenceResponse.ok,
          evidenceAuthenticity: evidence.authenticityScore > 0.8,
          disputeResolutionTimeline: resolution.estimatedResolutionTime,
          userNotifiedOfProcess: resolution.userNotified === true
        };
      }, userData);

      expect(disputeTest.disputeSubmitted).toBe(true);
      expect(disputeTest.disputeId).toBeTruthy();
      expect(disputeTest.resolutionProcessInitiated).toBe(true);
      expect(disputeTest.reviewerAssigned).toBe(true);
      expect(disputeTest.evidenceEvaluationComplete).toBe(true);
      expect(disputeTest.evidenceAuthenticity).toBe(true);
      expect(disputeTest.disputeResolutionTimeline).toBeTruthy();
      expect(disputeTest.userNotifiedOfProcess).toBe(true);
    });
  });

  test.describe('Right to Portability (Article 20)', () => {
    
    test('should enable machine-readable data export in multiple formats', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test comprehensive data portability
      const portabilityTest = await page.evaluate(async (testData) => {
        // Request data in multiple machine-readable formats
        const formats = ['json', 'csv', 'xml', 'yaml'];
        const formatResults = [];

        for (const format of formats) {
          const exportResponse = await fetch('/api/privacy/portability/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.user.id,
              exportFormat: format,
              includeMetadata: true,
              dataCategories: 'all',
              structuredOutput: true
            })
          });

          const exportResult = await exportResponse.json();

          formatResults.push({
            format,
            exportSuccess: exportResponse.ok,
            downloadReady: !!exportResult.downloadUrl,
            machineReadable: exportResult.machineReadable === true,
            structuredData: exportResult.structured === true,
            fileSize: exportResult.fileSizeBytes,
            estimatedRecords: exportResult.recordCount
          });
        }

        // Test data schema and structure compliance
        const schemaResponse = await fetch('/api/privacy/portability/schema-validation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            validateFormats: formats
          })
        });

        const schema = await schemaResponse.json();

        // Test interoperability with other systems
        const interoperabilityResponse = await fetch('/api/privacy/portability/interoperability-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            targetSystems: ['generic_wedding_planner', 'calendar_systems', 'contact_management']
          })
        });

        const interoperability = await interoperabilityResponse.json();

        return {
          allFormatsSupported: formatResults.every(f => f.exportSuccess),
          machineReadableCompliance: formatResults.every(f => f.machineReadable),
          structuredDataProvided: formatResults.every(f => f.structuredData),
          downloadUrlsGenerated: formatResults.every(f => f.downloadReady),
          reasonableFileSizes: formatResults.every(f => f.fileSize > 0 && f.fileSize < 100 * 1024 * 1024), // < 100MB
          schemaValidationPassed: schemaResponse.ok && schema.allFormatsValid === true,
          interoperabilityTested: interoperabilityResponse.ok,
          crossSystemCompatibility: interoperability.compatibilityScore > 0.8,
          standardCompliance: schema.standardsCompliance?.includes('GDPR_Article_20')
        };
      }, { user: userData, wedding: weddingData });

      expect(portabilityTest.allFormatsSupported).toBe(true);
      expect(portabilityTest.machineReadableCompliance).toBe(true);
      expect(portabilityTest.structuredDataProvided).toBe(true);
      expect(portabilityTest.downloadUrlsGenerated).toBe(true);
      expect(portabilityTest.reasonableFileSizes).toBe(true);
      expect(portabilityTest.schemaValidationPassed).toBe(true);
      expect(portabilityTest.interoperabilityTested).toBe(true);
      expect(portabilityTest.crossSystemCompatibility).toBe(true);
      expect(portabilityTest.standardCompliance).toBe(true);
    });

    test('should handle direct data transfer between systems', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test direct system-to-system data transfer
      const directTransferTest = await page.evaluate(async (testData) => {
        // Initiate direct transfer to another wedding planning system
        const transferResponse = await fetch('/api/privacy/portability/direct-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            targetSystem: {
              name: 'Alternative Wedding Planner',
              apiEndpoint: 'https://api.test-wedding-system.com/import',
              authenticationMethod: 'oauth2',
              dataFormat: 'json',
              supportedCategories: ['profiles', 'weddings', 'vendors', 'guests']
            },
            transferCategories: ['user_profile', 'wedding_details', 'vendor_list'],
            userConsent: true,
            encryptionRequired: true
          })
        });

        const transfer = await transferResponse.json();

        // Test transfer progress monitoring
        const progressResponse = await fetch(`/api/privacy/portability/transfer-progress/${transfer.transferId}`);
        const progress = await progressResponse.json();

        // Test transfer verification
        const verificationResponse = await fetch('/api/privacy/portability/transfer-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transferId: transfer.transferId,
            verifyIntegrity: true,
            verifyCompleteness: true
          })
        });

        const verification = await verificationResponse.json();

        return {
          directTransferInitiated: transferResponse.ok,
          transferId: transfer.transferId,
          encryptionApplied: transfer.encrypted === true,
          consentVerified: transfer.consentVerified === true,
          progressMonitoring: progressResponse.ok,
          transferComplete: progress.status === 'completed',
          verificationPassed: verificationResponse.ok,
          dataIntegrityMaintained: verification.integrityCheck === true,
          completenessVerified: verification.completenessCheck === true,
          targetSystemConfirmed: verification.targetSystemConfirmed === true
        };
      }, userData);

      expect(directTransferTest.directTransferInitiated).toBe(true);
      expect(directTransferTest.transferId).toBeTruthy();
      expect(directTransferTest.encryptionApplied).toBe(true);
      expect(directTransferTest.consentVerified).toBe(true);
      expect(directTransferTest.progressMonitoring).toBe(true);
      expect(directTransferTest.transferComplete).toBe(true);
      expect(directTransferTest.verificationPassed).toBe(true);
      expect(directTransferTest.dataIntegrityMaintained).toBe(true);
      expect(directTransferTest.completenessVerified).toBe(true);
      expect(directTransferTest.targetSystemConfirmed).toBe(true);
    });
  });

  test.describe('Right to Restriction (Article 18)', () => {
    
    test('should implement processing restriction controls', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test processing restriction implementation
      const restrictionTest = await page.evaluate(async (testData) => {
        // Request processing restriction for specific data categories
        const restrictionResponse = await fetch('/api/privacy/restriction/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            restrictionRequests: [
              {
                dataCategory: 'marketing_data',
                reason: 'disputing_accuracy',
                restrictionType: 'full_processing_stop',
                duration: 'until_resolution'
              },
              {
                dataCategory: 'behavioral_analytics',
                reason: 'objection_to_processing',
                restrictionType: 'analysis_only',
                duration: 'indefinite'
              },
              {
                dataCategory: 'photo_metadata',
                reason: 'pending_rectification',
                restrictionType: 'automated_processing_stop',
                duration: '30_days'
              }
            ],
            preserveData: true,
            notifyThirdParties: true
          })
        });

        const restriction = await restrictionResponse.json();

        // Test restriction enforcement
        const enforcementResponse = await fetch('/api/privacy/restriction/enforcement-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            restrictionId: restriction.restrictionId
          })
        });

        const enforcement = await enforcementResponse.json();

        // Test attempt to process restricted data (should fail)
        const processingAttemptResponse = await fetch('/api/marketing/campaign-processing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            dataCategory: 'marketing_data',
            processingType: 'campaign_targeting'
          })
        });

        // Test data preservation during restriction
        const preservationResponse = await fetch(`/api/privacy/restriction/${restriction.restrictionId}/data-preservation`);
        const preservation = await preservationResponse.json();

        return {
          restrictionRequestProcessed: restrictionResponse.ok,
          restrictionId: restriction.restrictionId,
          enforcementActive: enforcementResponse.ok && enforcement.enforced === true,
          processingPrevented: !processingAttemptResponse.ok || processingAttemptResponse.status === 403,
          dataPreserved: preservationResponse.ok && preservation.dataPreserved === true,
          marketingDataRestricted: enforcement.restrictions?.marketing_data?.status === 'restricted',
          analyticsDataRestricted: enforcement.restrictions?.behavioral_analytics?.status === 'restricted',
          thirdPartyNotificationSent: restriction.thirdPartyNotificationsSent === true,
          restrictionDurationsRespected: enforcement.restrictions && 
            Object.values(enforcement.restrictions).every(r => r.expirationDate || r.duration === 'indefinite')
        };
      }, { user: userData, wedding: weddingData });

      expect(restrictionTest.restrictionRequestProcessed).toBe(true);
      expect(restrictionTest.restrictionId).toBeTruthy();
      expect(restrictionTest.enforcementActive).toBe(true);
      expect(restrictionTest.processingPrevented).toBe(true);
      expect(restrictionTest.dataPreserved).toBe(true);
      expect(restrictionTest.marketingDataRestricted).toBe(true);
      expect(restrictionTest.analyticsDataRestricted).toBe(true);
      expect(restrictionTest.thirdPartyNotificationSent).toBe(true);
      expect(restrictionTest.restrictionDurationsRespected).toBe(true);
    });

    test('should handle restriction lifting and resumption of processing', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test restriction lifting process
      const liftingTest = await page.evaluate(async (testData) => {
        // First apply restriction
        const applyRestrictionResponse = await fetch('/api/privacy/restriction/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            restrictionRequests: [{
              dataCategory: 'communication_history',
              reason: 'disputing_accuracy',
              restrictionType: 'full_processing_stop',
              duration: 'until_resolution'
            }]
          })
        });

        const restriction = await applyRestrictionResponse.json();

        // Resolve the dispute (simulate)
        const disputeResolutionResponse = await fetch('/api/privacy/restriction/resolve-dispute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restrictionId: restriction.restrictionId,
            resolutionOutcome: 'dispute_resolved_in_favor_of_user',
            correctiveActions: ['data_corrected', 'process_updated']
          })
        });

        // Lift restriction
        const liftRestrictionResponse = await fetch('/api/privacy/restriction/lift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restrictionId: restriction.restrictionId,
            liftingReason: 'dispute_resolved',
            userConsent: true,
            resumeProcessing: true
          })
        });

        const lifting = await liftRestrictionResponse.json();

        // Verify processing resumption
        const processingResumptionResponse = await fetch('/api/privacy/restriction/processing-resumption-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            dataCategory: 'communication_history'
          })
        });

        const resumption = await processingResumptionResponse.json();

        return {
          restrictionApplied: applyRestrictionResponse.ok,
          disputeResolved: disputeResolutionResponse.ok,
          restrictionLifted: liftRestrictionResponse.ok,
          liftingDocumented: lifting.liftingReason === 'dispute_resolved',
          processingResumed: processingResumptionResponse.ok && resumption.processingActive === true,
          auditTrailComplete: lifting.auditTrailUpdated === true,
          userNotified: lifting.userNotified === true,
          dataIntegrityMaintained: resumption.dataIntegrityCheck === true
        };
      }, userData);

      expect(liftingTest.restrictionApplied).toBe(true);
      expect(liftingTest.disputeResolved).toBe(true);
      expect(liftingTest.restrictionLifted).toBe(true);
      expect(liftingTest.liftingDocumented).toBe(true);
      expect(liftingTest.processingResumed).toBe(true);
      expect(liftingTest.auditTrailComplete).toBe(true);
      expect(liftingTest.userNotified).toBe(true);
      expect(liftingTest.dataIntegrityMaintained).toBe(true);
    });
  });

  test.describe('Right to Object (Article 21)', () => {
    
    test('should enable objection to processing with legitimate interests basis', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test right to object implementation
      const objectionTest = await page.evaluate(async (testData) => {
        // Object to processing based on legitimate interests
        const objectionResponse = await fetch('/api/privacy/objection/legitimate-interests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            objectionRequests: [
              {
                processingActivity: 'vendor_recommendation_algorithm',
                legalBasis: 'legitimate_interests',
                objectionReason: 'personal_situation_specific',
                specificConcerns: 'Algorithm suggests vendors I specifically want to avoid',
                requestedAction: 'stop_processing'
              },
              {
                processingActivity: 'behavioral_profiling',
                legalBasis: 'legitimate_interests',
                objectionReason: 'privacy_preferences',
                specificConcerns: 'Do not want behavioral tracking for advertising',
                requestedAction: 'opt_out_completely'
              }
            ],
            effectiveDate: 'immediate'
          })
        });

        const objection = await objectionResponse.json();

        // Test legitimate interests assessment
        const assessmentResponse = await fetch('/api/privacy/objection/legitimate-interests-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectionId: objection.objectionId,
            balancingTest: true,
            considerCompellingLegitimateGrounds: true
          })
        });

        const assessment = await assessmentResponse.json();

        // Test objection outcome
        const outcomeResponse = await fetch(`/api/privacy/objection/${objection.objectionId}/outcome`);
        const outcome = await outcomeResponse.json();

        return {
          objectionSubmitted: objectionResponse.ok,
          objectionId: objection.objectionId,
          assessmentConducted: assessmentResponse.ok,
          balancingTestPerformed: assessment.balancingTest?.performed === true,
          vendorRecommendationStopped: outcome.processingChanges?.vendor_recommendation_algorithm === 'stopped',
          behavioralProfilingStopped: outcome.processingChanges?.behavioral_profiling === 'stopped',
          legitimateInterestsOverridden: assessment.balancingTest?.outcome === 'objection_upheld',
          userRightsRespected: outcome.objectionUpheld === true,
          noCompellingGrounds: assessment.balancingTest?.compellingLegitimateGrounds === false
        };
      }, userData);

      expect(objectionTest.objectionSubmitted).toBe(true);
      expect(objectionTest.objectionId).toBeTruthy();
      expect(objectionTest.assessmentConducted).toBe(true);
      expect(objectionTest.balancingTestPerformed).toBe(true);
      expect(objectionTest.vendorRecommendationStopped).toBe(true);
      expect(objectionTest.behavioralProfilingStopped).toBe(true);
      expect(objectionTest.legitimateInterestsOverridden).toBe(true);
      expect(objectionTest.userRightsRespected).toBe(true);
      expect(objectionTest.noCompellingGrounds).toBe(true);
    });

    test('should handle objections to direct marketing', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test objection to direct marketing (absolute right)
      const marketingObjectionTest = await page.evaluate(async (testData) => {
        // Object to direct marketing (no balancing test required)
        const marketingObjectionResponse = await fetch('/api/privacy/objection/direct-marketing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            objectionScope: 'all_direct_marketing',
            marketingChannels: ['email', 'sms', 'postal_mail', 'phone'],
            effectiveDate: 'immediate',
            optOutFromProfiling: true
          })
        });

        const marketingObjection = await marketingObjectionResponse.json();

        // Test immediate cessation of marketing
        const cessationResponse = await fetch(`/api/privacy/objection/${marketingObjection.objectionId}/marketing-cessation-check`);
        const cessation = await cessationResponse.json();

        // Attempt to send marketing (should fail)
        const marketingAttemptResponse = await fetch('/api/marketing/send-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            campaignType: 'wedding_vendor_promotion',
            channel: 'email'
          })
        });

        // Test profiling cessation for marketing purposes
        const profilingResponse = await fetch('/api/privacy/objection/profiling-cessation-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            profilingPurpose: 'marketing'
          })
        });

        const profiling = await profilingResponse.json();

        return {
          marketingObjectionAccepted: marketingObjectionResponse.ok,
          immediateEffective: marketingObjection.effectiveDate === 'immediate',
          marketingCessationVerified: cessationResponse.ok && cessation.marketingCeased === true,
          emailMarketingStopped: cessation.channels?.email === 'stopped',
          smsMarketingStopped: cessation.channels?.sms === 'stopped',
          marketingAttemptBlocked: !marketingAttemptResponse.ok || marketingAttemptResponse.status === 403,
          profilingForMarketingStopped: profilingResponse.ok && profiling.profilingForMarketingStopped === true,
          absoluteRightRespected: marketingObjection.balancingTestRequired === false
        };
      }, userData);

      expect(marketingObjectionTest.marketingObjectionAccepted).toBe(true);
      expect(marketingObjectionTest.immediateEffective).toBe(true);
      expect(marketingObjectionTest.marketingCessationVerified).toBe(true);
      expect(marketingObjectionTest.emailMarketingStopped).toBe(true);
      expect(marketingObjectionTest.smsMarketingStopped).toBe(true);
      expect(marketingObjectionTest.marketingAttemptBlocked).toBe(true);
      expect(marketingObjectionTest.profilingForMarketingStopped).toBe(true);
      expect(marketingObjectionTest.absoluteRightRespected).toBe(true);
    });
  });

  test.describe('Right Against Automated Decision-Making (Article 22)', () => {
    
    test('should provide human intervention for automated decisions', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test automated decision-making controls
      const automatedDecisionTest = await page.evaluate(async (testData) => {
        // Create scenario with automated decision-making
        const automatedSystemResponse = await fetch('/api/test/setup-automated-decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            automatedSystems: [
              {
                name: 'vendor_matching_algorithm',
                decision: 'vendor_recommendations',
                legalEffect: 'significant',
                humanReviewAvailable: true
              },
              {
                name: 'budget_credit_assessment',
                decision: 'payment_plan_eligibility',
                legalEffect: 'significant',
                humanReviewRequired: true
              },
              {
                name: 'guest_seating_optimization',
                decision: 'seating_arrangements',
                legalEffect: 'minimal',
                humanReviewAvailable: false
              }
            ]
          })
        });

        // Request human intervention for automated decisions
        const humanInterventionResponse = await fetch('/api/privacy/automated-decisions/human-intervention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            interventionRequests: [
              {
                automatedSystem: 'vendor_matching_algorithm',
                decisionId: 'vendor_rec_001',
                interventionReason: 'disagree_with_recommendations',
                requestType: 'manual_review'
              },
              {
                automatedSystem: 'budget_credit_assessment',
                decisionId: 'credit_assess_001',
                interventionReason: 'contest_decision',
                requestType: 'human_decision_maker'
              }
            ]
          })
        });

        const humanIntervention = await humanInterventionResponse.json();

        // Test explanation provision for automated decisions
        const explanationResponse = await fetch('/api/privacy/automated-decisions/explanations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            decisionIds: ['vendor_rec_001', 'credit_assess_001']
          })
        });

        const explanations = await explanationResponse.json();

        // Test opt-out from automated decision-making
        const optOutResponse = await fetch('/api/privacy/automated-decisions/opt-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            optOutSystems: ['vendor_matching_algorithm'],
            alternativeProcess: 'manual_curation'
          })
        });

        const optOut = await optOutResponse.json();

        return {
          automatedSystemsSetup: automatedSystemResponse.ok,
          humanInterventionRequested: humanInterventionResponse.ok,
          vendorMatchingReviewScheduled: humanIntervention.interventions?.vendor_matching_algorithm?.status === 'scheduled',
          creditAssessmentHumanReview: humanIntervention.interventions?.budget_credit_assessment?.status === 'scheduled',
          explanationsProvided: explanationResponse.ok,
          vendorRecommendationExplained: explanations.explanations?.vendor_rec_001?.explained === true,
          creditAssessmentExplained: explanations.explanations?.credit_assess_001?.explained === true,
          optOutProcessed: optOutResponse.ok,
          alternativeProcessActivated: optOut.alternativeProcesses?.vendor_matching_algorithm === 'manual_curation',
          rightToHumanInterventionRespected: true
        };
      }, { user: userData, wedding: weddingData });

      expect(automatedDecisionTest.automatedSystemsSetup).toBe(true);
      expect(automatedDecisionTest.humanInterventionRequested).toBe(true);
      expect(automatedDecisionTest.vendorMatchingReviewScheduled).toBe(true);
      expect(automatedDecisionTest.creditAssessmentHumanReview).toBe(true);
      expect(automatedDecisionTest.explanationsProvided).toBe(true);
      expect(automatedDecisionTest.vendorRecommendationExplained).toBe(true);
      expect(automatedDecisionTest.creditAssessmentExplained).toBe(true);
      expect(automatedDecisionTest.optOutProcessed).toBe(true);
      expect(automatedDecisionTest.alternativeProcessActivated).toBe(true);
      expect(automatedDecisionTest.rightToHumanInterventionRespected).toBe(true);
    });
  });

  test.describe('Wedding Industry Specific Rights Scenarios', () => {
    
    test('should handle complex multi-party wedding rights scenarios', async ({ page }) => {
      // Test WEDDING_GDPR_SCENARIOS complex wedding data rights
      const multiPartyRightsTest = await page.evaluate(async () => {
        // Scenario: Bride and groom sharing wedding account with separate data rights
        const sharedAccountResponse = await fetch('/api/test/setup-shared-wedding-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            primaryUser: {
              email: 'bride@wedding.de',
              role: 'bride',
              country: 'Germany'
            },
            secondaryUser: {
              email: 'groom@wedding.de',
              role: 'groom',
              country: 'Germany'
            },
            sharedWedding: {
              weddingDate: '2025-06-15',
              sharedResponsibilities: ['guest_management', 'vendor_coordination'],
              separateData: ['personal_communications', 'family_contacts']
            }
          })
        });

        const sharedAccount = await sharedAccountResponse.json();

        // Bride requests data export - should get shared + personal data
        const brideExportResponse = await fetch('/api/privacy/rights/multi-party-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestingUserId: sharedAccount.brideId,
            accountType: 'shared_wedding',
            dataScope: 'personal_and_shared',
            respectPartnerPrivacy: true
          })
        });

        const brideExport = await brideExportResponse.json();

        // Groom requests deletion - should only affect his personal data
        const groomDeletionResponse = await fetch('/api/privacy/rights/multi-party-deletion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestingUserId: sharedAccount.groomId,
            accountType: 'shared_wedding',
            deletionScope: 'personal_only',
            preserveSharedWeddingData: true,
            notifyPartner: true
          })
        });

        const groomDeletion = await groomDeletionResponse.json();

        return {
          sharedAccountSetup: sharedAccountResponse.ok,
          brideExportProcessed: brideExportResponse.ok,
          sharedDataIncluded: brideExport.dataCategories?.includes('shared_wedding_data'),
          partnerPrivacyRespected: brideExport.partnerPersonalDataExcluded === true,
          groomDeletionProcessed: groomDeletionResponse.ok,
          sharedWeddingDataPreserved: groomDeletion.sharedDataPreserved === true,
          partnerNotified: groomDeletion.partnerNotified === true,
          complexScenarioHandled: true
        };
      });

      expect(multiPartyRightsTest.sharedAccountSetup).toBe(true);
      expect(multiPartyRightsTest.brideExportProcessed).toBe(true);
      expect(multiPartyRightsTest.sharedDataIncluded).toBe(true);
      expect(multiPartyRightsTest.partnerPrivacyRespected).toBe(true);
      expect(multiPartyRightsTest.groomDeletionProcessed).toBe(true);
      expect(multiPartyRightsTest.sharedWeddingDataPreserved).toBe(true);
      expect(multiPartyRightsTest.partnerNotified).toBe(true);
      expect(multiPartyRightsTest.complexScenarioHandled).toBe(true);
    });
  });

  test.describe('Performance and Integration Testing', () => {
    
    test('should meet GDPR response time requirements for all rights', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test response time compliance for all data subject rights
      const responseTimeTest = await page.evaluate(async (testData) => {
        const startTime = Date.now();
        const rightRequests = [];

        // Test all major rights response times
        const rights = [
          { right: 'access', endpoint: '/api/privacy/access/request' },
          { right: 'rectification', endpoint: '/api/privacy/rectification/request' },
          { right: 'portability', endpoint: '/api/privacy/portability/request' },
          { right: 'restriction', endpoint: '/api/privacy/restriction/request' },
          { right: 'objection', endpoint: '/api/privacy/objection/request' }
        ];

        for (const right of rights) {
          const requestStart = Date.now();
          
          const response = await fetch(right.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.id,
              rightType: right.right,
              requestDate: new Date().toISOString()
            })
          });

          const requestDuration = Date.now() - requestStart;
          const result = await response.json();

          rightRequests.push({
            right: right.right,
            responseTime: requestDuration,
            requestSuccess: response.ok,
            requestId: result.requestId,
            estimatedCompletion: result.estimatedCompletion
          });
        }

        const totalDuration = Date.now() - startTime;

        // Verify all requests are within 30-day completion estimates
        const within30Days = rightRequests.every(req => {
          if (!req.estimatedCompletion) return false;
          const completionDate = new Date(req.estimatedCompletion);
          const requestDate = new Date();
          const daysDiff = (completionDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30;
        });

        return {
          allRightsRequestsProcessed: rightRequests.every(r => r.requestSuccess),
          allResponseTimesReasonable: rightRequests.every(r => r.responseTime < 5000), // 5 seconds
          within30DayCompliance: within30Days,
          overallPerformance: totalDuration < 30000, // 30 seconds total
          averageResponseTime: rightRequests.reduce((sum, r) => sum + r.responseTime, 0) / rightRequests.length,
          requestIds: rightRequests.map(r => r.requestId).filter(Boolean)
        };
      }, userData);

      expect(responseTimeTest.allRightsRequestsProcessed).toBe(true);
      expect(responseTimeTest.allResponseTimesReasonable).toBe(true);
      expect(responseTimeTest.within30DayCompliance).toBe(true);
      expect(responseTimeTest.overallPerformance).toBe(true);
      expect(responseTimeTest.averageResponseTime).toBeLessThan(3000); // 3 seconds average
      expect(responseTimeTest.requestIds.length).toBe(5);
    });
  });

  test.describe('System-wide Data Subject Rights Validation', () => {
    
    test('should validate comprehensive data subject rights implementation', async ({ page }) => {
      // Test system-wide validation of all data subject rights
      const systemValidationTest = await page.evaluate(async () => {
        const validationResponse = await fetch('/api/compliance/data-subject-rights-validation');
        const validation = await validationResponse.json();

        const requiredRights = [
          'rightOfAccess',
          'rightOfRectification', 
          'rightToPortability',
          'rightToRestriction',
          'rightToObject',
          'rightsRelatedToAutomatedDecisionMaking'
        ];

        const implementationScore = requiredRights.reduce((score, right) => {
          return score + (validation[right]?.implemented ? 1 : 0);
        }, 0) / requiredRights.length;

        return {
          systemValidation: validationResponse.ok,
          implementationScore,
          allRightsImplemented: implementationScore === 1,
          responseTimeCompliance: validation.responseTimeCompliance === true,
          weddingIndustryCompliance: validation.weddingIndustryCompliance === true,
          multiPartyScenarioSupport: validation.multiPartyScenarioSupport === true,
          auditReadiness: validation.auditReadiness === true,
          performanceBenchmarks: validation.performanceBenchmarks === true,
          documentationComplete: validation.documentationComplete === true,
          legalComplianceVerified: validation.legalCompliance === true
        };
      });

      expect(systemValidationTest.systemValidation).toBe(true);
      expect(systemValidationTest.implementationScore).toBeGreaterThanOrEqual(0.95);
      expect(systemValidationTest.allRightsImplemented).toBe(true);
      expect(systemValidationTest.responseTimeCompliance).toBe(true);
      expect(systemValidationTest.weddingIndustryCompliance).toBe(true);
      expect(systemValidationTest.multiPartyScenarioSupport).toBe(true);
      expect(systemValidationTest.auditReadiness).toBe(true);
      expect(systemValidationTest.performanceBenchmarks).toBe(true);
      expect(systemValidationTest.documentationComplete).toBe(true);
      expect(systemValidationTest.legalComplianceVerified).toBe(true);
    });
  });
});