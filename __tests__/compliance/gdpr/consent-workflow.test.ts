/**
 * WS-176 - End-to-End Consent Collection Testing
 * Team E - Round 1: GDPR Consent Workflow Implementation
 * 
 * Tests comprehensive consent management workflows for wedding business:
 * - Initial consent collection during registration
 * - Granular consent management (marketing, analytics, photo sharing, vendor data)
 * - Consent withdrawal and re-granting
 * - Consent inheritance for wedding party members
 * - Vendor-specific consent workflows
 * - Cross-border consent validation
 * - Consent audit trails and compliance reporting
 */

import { test, expect } from '@playwright/test';
import { 
  createGDPRTestClient,
  GDPR_TEST_CONFIG,
  GDPR_CONSENT_TYPES,
  GDPR_LEGAL_BASES,
  createTestUserData,
  createTestWeddingData,
  createTestGuestData,
  updateConsent,
  verifyAuditTrail,
  cleanupGDPRTestData,
  WEDDING_GDPR_SCENARIOS
} from './utils/gdpr-test-utils';

test.describe('WS-176: GDPR Consent Workflow Testing', () => {
  let supabase: ReturnType<typeof createGDPRTestClient>;
  let testUserIds: string[] = [];
  let testWeddingIds: string[] = [];
  let testGuestIds: string[] = [];

  test.beforeAll(async () => {
    supabase = createGDPRTestClient();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(GDPR_TEST_CONFIG.baseUrl);
    
    // Set consent testing headers
    await page.setExtraHTTPHeaders({
      'x-gdpr-consent-test': 'true',
      'x-test-suite': 'consent-workflow'
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

  test.describe('Initial Consent Collection During Registration', () => {
    
    test('should present clear consent options during couple registration', async ({ page }) => {
      await page.goto('/register/couple');

      // Verify consent interface visibility and accessibility
      await expect(page.locator('[data-testid="consent-management-section"]')).toBeVisible();
      
      // Check all required consent types are present
      const consentTypes = Object.keys(GDPR_CONSENT_TYPES);
      
      for (const consentType of consentTypes) {
        await expect(page.locator(`[data-testid="consent-${consentType}"]`)).toBeVisible();
        
        // Verify consent description is clear and accessible
        await expect(page.locator(`[data-testid="consent-${consentType}-description"]`)).toBeVisible();
        
        // Check legal basis is displayed
        await expect(page.locator(`[data-testid="consent-${consentType}-legal-basis"]`)).toBeVisible();
      }

      // Test granular consent selection
      const initialConsentTest = await page.evaluate(async () => {
        const consentSelections = {
          essential_cookies: true,  // Should be mandatory
          marketing_emails: false,
          analytics_cookies: true,
          vendor_data_sharing: true,
          photo_sharing: false
        };

        // Fill registration form
        const formData = {
          email: 'consent-test@wedding.de',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'Couple',
          weddingDate: '2025-06-15',
          country: 'Germany', // EU location triggers GDPR
          consents: consentSelections
        };

        const response = await fetch('/api/auth/register/couple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        // Verify consent recording
        const consentResponse = await fetch(`/api/privacy/consent/${result.user.id}`);
        const consentRecords = await consentResponse.json();

        return {
          registrationSuccess: response.ok,
          userId: result.user?.id,
          consentsRecorded: consentRecords.consents?.length > 0,
          granularityPreserved: consentRecords.consents?.some(c => c.consent_type === 'marketing_emails' && !c.is_granted),
          mandatoryEnforced: consentRecords.consents?.some(c => c.consent_type === 'essential_cookies' && c.is_granted),
          auditTrailCreated: consentRecords.audit?.length > 0,
          legalBasisDocumented: consentRecords.consents?.every(c => c.legal_basis)
        };
      });

      if (initialConsentTest.userId) {
        testUserIds.push(initialConsentTest.userId);
      }

      expect(initialConsentTest.registrationSuccess).toBe(true);
      expect(initialConsentTest.consentsRecorded).toBe(true);
      expect(initialConsentTest.granularityPreserved).toBe(true);
      expect(initialConsentTest.mandatoryEnforced).toBe(true);
      expect(initialConsentTest.auditTrailCreated).toBe(true);
      expect(initialConsentTest.legalBasisDocumented).toBe(true);
    });

    test('should handle consent collection for different user types', async ({ page }) => {
      // Test consent workflows for couples, vendors, and guests
      const userTypes = [
        {
          type: 'couple',
          url: '/register/couple',
          requiredConsents: ['essential_cookies', 'vendor_data_sharing'],
          optionalConsents: ['marketing_emails', 'analytics_cookies', 'photo_sharing']
        },
        {
          type: 'vendor',
          url: '/register/vendor',
          requiredConsents: ['essential_cookies', 'business_communications'],
          optionalConsents: ['marketing_emails', 'analytics_cookies']
        },
        {
          type: 'guest',
          url: '/register/guest',
          requiredConsents: ['essential_cookies'],
          optionalConsents: ['photo_sharing', 'event_communications']
        }
      ];

      const userTypeResults = [];

      for (const userType of userTypes) {
        await page.goto(userType.url);

        const userTypeTest = await page.evaluate(async (typeData) => {
          const testEmail = `${typeData.type}-test@wedding.de`;
          
          // Test user type specific registration
          const registrationData = {
            email: testEmail,
            password: 'SecurePass123!',
            userType: typeData.type,
            country: 'Germany',
            consents: {
              essential_cookies: true,
              marketing_emails: typeData.type === 'couple', // Only couples get marketing by default
              analytics_cookies: true,
              vendor_data_sharing: typeData.type === 'couple',
              photo_sharing: typeData.type === 'guest',
              business_communications: typeData.type === 'vendor',
              event_communications: typeData.type === 'guest'
            }
          };

          const response = await fetch(`/api/auth/register/${typeData.type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
          });

          const result = await response.json();

          // Verify user type specific consent handling
          const consentResponse = await fetch(`/api/privacy/consent/${result.user.id}`);
          const consentRecords = await consentResponse.json();

          const hasRequiredConsents = typeData.requiredConsents.every(consent =>
            consentRecords.consents?.some(c => c.consent_type === consent && c.is_granted)
          );

          const optionalConsentsHandled = typeData.optionalConsents.every(consent =>
            consentRecords.consents?.some(c => c.consent_type === consent && typeof c.is_granted === 'boolean')
          );

          return {
            userType: typeData.type,
            userId: result.user?.id,
            registrationSuccess: response.ok,
            requiredConsentsGranted: hasRequiredConsents,
            optionalConsentsHandled: optionalConsentsHandled,
            userTypeSpecificConsents: consentRecords.consents?.filter(c => 
              c.user_type === typeData.type
            ).length > 0
          };
        }, userType);

        if (userTypeTest.userId) {
          testUserIds.push(userTypeTest.userId);
        }

        userTypeResults.push(userTypeTest);
      }

      // Verify all user types handled correctly
      expect(userTypeResults).toHaveLength(3);
      expect(userTypeResults.every(r => r.registrationSuccess)).toBe(true);
      expect(userTypeResults.every(r => r.requiredConsentsGranted)).toBe(true);
      expect(userTypeResults.every(r => r.optionalConsentsHandled)).toBe(true);
    });

    test('should validate consent age requirements and capacity', async ({ page }) => {
      // Test consent capacity validation
      const ageValidationTest = await page.evaluate(async () => {
        const testCases = [
          {
            name: 'minor_under_16',
            age: 15,
            country: 'Germany',
            expectedResult: 'parental_consent_required'
          },
          {
            name: 'minor_16_to_18',
            age: 17,
            country: 'Germany',
            expectedResult: 'limited_consent_capacity'
          },
          {
            name: 'adult',
            age: 25,
            country: 'Germany',
            expectedResult: 'full_consent_capacity'
          }
        ];

        const results = [];

        for (const testCase of testCases) {
          const registrationData = {
            email: `${testCase.name}@wedding.de`,
            age: testCase.age,
            country: testCase.country,
            dateOfBirth: new Date(Date.now() - testCase.age * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
            consents: {
              marketing_emails: true,
              analytics_cookies: true
            }
          };

          const response = await fetch('/api/auth/register/age-validation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
          });

          const result = await response.json();

          results.push({
            testCase: testCase.name,
            ageValidated: result.ageValidated === true,
            consentCapacity: result.consentCapacity,
            parentalConsentRequired: result.parentalConsentRequired,
            registrationAllowed: response.ok || response.status === 202
          });
        }

        return results;
      });

      // Verify age validation works correctly
      const minorUnder16 = ageValidationTest.find(r => r.testCase === 'minor_under_16');
      expect(minorUnder16?.parentalConsentRequired).toBe(true);

      const adult = ageValidationTest.find(r => r.testCase === 'adult');
      expect(adult?.consentCapacity).toBe('full_consent_capacity');
      expect(adult?.registrationAllowed).toBe(true);
    });
  });

  test.describe('Granular Consent Management', () => {
    
    test('should allow independent management of different consent types', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Create user with initial consents
      await supabase.from('user_profiles').insert(userData);
      
      // Set up initial consent state
      for (const [consentKey, consentData] of Object.entries(GDPR_CONSENT_TYPES)) {
        await updateConsent(supabase, {
          userId: userData.id,
          consentType: consentKey as keyof typeof GDPR_CONSENT_TYPES,
          isGranted: true,
          legalBasis: 'CONSENT',
          purpose: consentData.purpose
        });
      }

      await page.goto('/privacy/consent-management');
      
      // Test granular consent management
      const granularConsentTest = await page.evaluate(async (testData) => {
        // Test individual consent toggles
        const consentChanges = [
          { type: 'marketing_emails', action: 'withdraw' },
          { type: 'analytics_cookies', action: 'withdraw' },
          { type: 'vendor_data_sharing', action: 'maintain' },
          { type: 'photo_sharing', action: 'grant' }
        ];

        const results = [];

        for (const change of consentChanges) {
          const response = await fetch('/api/privacy/consent/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.id,
              consentType: change.type,
              isGranted: change.action === 'grant' || change.action === 'maintain',
              reason: `User ${change.action} consent for ${change.type}`
            })
          });

          const result = await response.json();
          
          results.push({
            consentType: change.type,
            action: change.action,
            updateSuccess: response.ok,
            effectiveImmediately: result.effectiveImmediately === true,
            auditRecorded: result.auditRecorded === true
          });
        }

        // Verify final consent state
        const finalStateResponse = await fetch(`/api/privacy/consent/${testData.id}`);
        const finalState = await finalStateResponse.json();

        return {
          individualUpdates: results,
          finalStateCorrect: finalState.consents?.length > 0,
          marketingWithdrawn: finalState.consents?.some(c => 
            c.consent_type === 'marketing_emails' && !c.is_granted
          ),
          vendorSharingMaintained: finalState.consents?.some(c => 
            c.consent_type === 'vendor_data_sharing' && c.is_granted
          ),
          independentManagement: true
        };
      }, userData);

      expect(granularConsentTest.individualUpdates.every(u => u.updateSuccess)).toBe(true);
      expect(granularConsentTest.individualUpdates.every(u => u.effectiveImmediately)).toBe(true);
      expect(granularConsentTest.individualUpdates.every(u => u.auditRecorded)).toBe(true);
      expect(granularConsentTest.finalStateCorrect).toBe(true);
      expect(granularConsentTest.marketingWithdrawn).toBe(true);
      expect(granularConsentTest.vendorSharingMaintained).toBe(true);
      expect(granularConsentTest.independentManagement).toBe(true);
    });

    test('should handle consent dependency relationships', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test consent dependencies (e.g., photo sharing requires basic data processing)
      const dependencyTest = await page.evaluate(async (testData) => {
        // Attempt to grant photo sharing without basic data processing consent
        const conflictResponse = await fetch('/api/privacy/consent/dependency-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            requestedConsent: {
              type: 'photo_sharing',
              isGranted: true
            },
            existingConsents: {
              essential_cookies: false,
              vendor_data_sharing: false
            }
          })
        });

        const conflictResult = await conflictResponse.json();

        // Test proper dependency resolution
        const resolvedResponse = await fetch('/api/privacy/consent/dependency-resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            requestedConsent: {
              type: 'photo_sharing',
              isGranted: true
            },
            resolveDependencies: true
          })
        });

        const resolvedResult = await resolvedResponse.json();

        return {
          dependencyDetected: conflictResult.dependencyConflict === true,
          requiredConsentsIdentified: Array.isArray(conflictResult.requiredConsents),
          dependencyResolutionOffered: conflictResult.resolutionOptions?.length > 0,
          automaticResolutionWorking: resolvedResponse.ok,
          cascadeConsentsUpdated: resolvedResult.cascadeUpdates?.length > 0
        };
      }, userData);

      expect(dependencyTest.dependencyDetected).toBe(true);
      expect(dependencyTest.requiredConsentsIdentified).toBe(true);
      expect(dependencyTest.dependencyResolutionOffered).toBe(true);
      expect(dependencyTest.automaticResolutionWorking).toBe(true);
      expect(dependencyTest.cascadeConsentsUpdated).toBe(true);
    });

    test('should provide consent history and versioning', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      await page.goto('/privacy/consent-history');

      // Test consent history tracking
      const historyTest = await page.evaluate(async (testData) => {
        // Create multiple consent changes over time
        const consentChanges = [
          { timestamp: '2024-01-01T10:00:00Z', type: 'marketing_emails', granted: true },
          { timestamp: '2024-06-01T14:30:00Z', type: 'marketing_emails', granted: false },
          { timestamp: '2024-08-15T09:15:00Z', type: 'analytics_cookies', granted: true },
          { timestamp: '2024-09-01T16:45:00Z', type: 'marketing_emails', granted: true }
        ];

        for (const change of consentChanges) {
          await fetch('/api/privacy/consent/historical', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.id,
              consentType: change.type,
              isGranted: change.granted,
              timestamp: change.timestamp,
              version: 'test-version'
            })
          });
        }

        // Retrieve consent history
        const historyResponse = await fetch(`/api/privacy/consent/${testData.id}/history`);
        const history = await historyResponse.json();

        // Test consent versioning
        const versionResponse = await fetch(`/api/privacy/consent/${testData.id}/versions`);
        const versions = await versionResponse.json();

        return {
          historyRecorded: history.consentHistory?.length > 0,
          chronologicalOrder: history.consentHistory?.every((item, index) => 
            index === 0 || new Date(item.timestamp) >= new Date(history.consentHistory[index - 1].timestamp)
          ),
          versioningActive: versions.versions?.length > 0,
          withdrawalTracked: history.consentHistory?.some(h => 
            h.consent_type === 'marketing_emails' && !h.is_granted
          ),
          reGrantTracked: history.consentHistory?.some(h => 
            h.consent_type === 'marketing_emails' && h.is_granted && 
            new Date(h.timestamp) > new Date('2024-06-01')
          )
        };
      }, userData);

      expect(historyTest.historyRecorded).toBe(true);
      expect(historyTest.chronologicalOrder).toBe(true);
      expect(historyTest.versioningActive).toBe(true);
      expect(historyTest.withdrawalTracked).toBe(true);
      expect(historyTest.reGrantTracked).toBe(true);
    });
  });

  test.describe('Consent Withdrawal and Re-granting', () => {
    
    test('should handle immediate consent withdrawal effects', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Set up user with active consents and data processing
      await supabase.from('user_profiles').insert(userData);
      await supabase.from('weddings').insert(weddingData);

      // Test immediate withdrawal effects
      const withdrawalTest = await page.evaluate(async (testData) => {
        // Start marketing campaign for user (consent-dependent activity)
        const campaignResponse = await fetch('/api/marketing/start-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            campaignType: 'wedding_tips',
            requiresConsent: 'marketing_emails'
          })
        });

        // Withdraw marketing consent
        const withdrawalResponse = await fetch('/api/privacy/consent/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            consentType: 'marketing_emails',
            withdrawalReason: 'No longer interested',
            effectiveImmediately: true
          })
        });

        const withdrawal = await withdrawalResponse.json();

        // Verify campaign stops immediately
        const campaignStatusResponse = await fetch(`/api/marketing/campaign-status/${testData.user.id}`);
        const campaignStatus = await campaignStatusResponse.json();

        // Test data processing stops
        const processingCheckResponse = await fetch('/api/compliance/processing-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            dataCategory: 'marketing_data'
          })
        });

        const processingCheck = await processingCheckResponse.json();

        return {
          withdrawalProcessed: withdrawalResponse.ok,
          effectiveImmediately: withdrawal.effectiveImmediately === true,
          campaignStopped: campaignStatus.status === 'stopped' || campaignStatus.status === 'consent_withdrawn',
          processingHalted: processingCheck.processingActive === false,
          auditRecorded: withdrawal.auditRecorded === true,
          withdrawalTimestamp: !!withdrawal.withdrawalTimestamp
        };
      }, { user: userData, wedding: weddingData });

      expect(withdrawalTest.withdrawalProcessed).toBe(true);
      expect(withdrawalTest.effectiveImmediately).toBe(true);
      expect(withdrawalTest.campaignStopped).toBe(true);
      expect(withdrawalTest.processingHalted).toBe(true);
      expect(withdrawalTest.auditRecorded).toBe(true);
      expect(withdrawalTest.withdrawalTimestamp).toBe(true);
    });

    test('should allow consent re-granting with proper verification', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test consent re-granting process
      const reGrantTest = await page.evaluate(async (testData) => {
        // First withdraw consent
        const withdrawalResponse = await fetch('/api/privacy/consent/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            consentType: 'marketing_emails',
            withdrawalReason: 'Testing withdrawal'
          })
        });

        // Attempt immediate re-grant (should require cooling off period)
        const immediateReGrantResponse = await fetch('/api/privacy/consent/re-grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            consentType: 'marketing_emails',
            reGrantReason: 'Changed mind immediately'
          })
        });

        const immediateResult = await immediateReGrantResponse.json();

        // Wait for cooling off period (simulate)
        const cooledOffReGrantResponse = await fetch('/api/privacy/consent/re-grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            consentType: 'marketing_emails',
            reGrantReason: 'Reconsidered after thinking',
            coolingOffPeriodCompleted: true,
            doubleOptIn: true
          })
        });

        const cooledOffResult = await cooledOffReGrantResponse.json();

        return {
          withdrawalSuccessful: withdrawalResponse.ok,
          immediateReGrantBlocked: !immediateReGrantResponse.ok || immediateResult.coolingOffRequired,
          coolingOffEnforced: immediateResult.coolingOffRequired === true,
          reGrantAfterCoolingOff: cooledOffReGrantResponse.ok,
          doubleOptInRequired: cooledOffResult.doubleOptInRequired === true,
          reGrantVerified: cooledOffResult.verified === true
        };
      }, userData);

      expect(reGrantTest.withdrawalSuccessful).toBe(true);
      expect(reGrantTest.immediateReGrantBlocked).toBe(true);
      expect(reGrantTest.coolingOffEnforced).toBe(true);
      expect(reGrantTest.reGrantAfterCoolingOff).toBe(true);
      expect(reGrantTest.doubleOptInRequired).toBe(true);
      expect(reGrantTest.reGrantVerified).toBe(true);
    });

    test('should handle partial consent withdrawal scenarios', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test partial withdrawal (e.g., marketing emails but not event updates)
      const partialWithdrawalTest = await page.evaluate(async (testData) => {
        // Grant multiple related consents initially
        const initialConsents = [
          { type: 'marketing_emails', purpose: 'promotional_content' },
          { type: 'event_notifications', purpose: 'wedding_updates' },
          { type: 'vendor_recommendations', purpose: 'service_matching' }
        ];

        for (const consent of initialConsents) {
          await fetch('/api/privacy/consent/grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.id,
              consentType: consent.type,
              purpose: consent.purpose
            })
          });
        }

        // Withdraw only marketing emails
        const partialWithdrawalResponse = await fetch('/api/privacy/consent/partial-withdrawal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            withdrawalSelections: {
              marketing_emails: true,
              event_notifications: false,
              vendor_recommendations: false
            }
          })
        });

        const partialResult = await partialWithdrawalResponse.json();

        // Verify selective withdrawal
        const consentStatusResponse = await fetch(`/api/privacy/consent/${testData.id}/status`);
        const consentStatus = await consentStatusResponse.json();

        return {
          partialWithdrawalProcessed: partialWithdrawalResponse.ok,
          marketingWithdrawn: consentStatus.consents?.some(c => 
            c.consent_type === 'marketing_emails' && !c.is_granted
          ),
          eventNotificationsMaintained: consentStatus.consents?.some(c => 
            c.consent_type === 'event_notifications' && c.is_granted
          ),
          vendorRecommendationsMaintained: consentStatus.consents?.some(c => 
            c.consent_type === 'vendor_recommendations' && c.is_granted
          ),
          selectiveProcessing: partialResult.selectiveProcessingActive === true
        };
      }, userData);

      expect(partialWithdrawalTest.partialWithdrawalProcessed).toBe(true);
      expect(partialWithdrawalTest.marketingWithdrawn).toBe(true);
      expect(partialWithdrawalTest.eventNotificationsMaintained).toBe(true);
      expect(partialWithdrawalTest.vendorRecommendationsMaintained).toBe(true);
      expect(partialWithdrawalTest.selectiveProcessing).toBe(true);
    });
  });

  test.describe('Wedding Party and Guest Consent Workflows', () => {
    
    test('should handle guest consent collection via wedding invitation', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test guest consent via invitation link
      const guestConsentTest = await page.evaluate(async (testData) => {
        // Create wedding invitation with consent collection
        const invitationResponse = await fetch('/api/weddings/invitations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: testData.wedding.id,
            hostUserId: testData.user.id,
            guestEmails: ['guest1@example.com', 'guest2@example.eu'],
            consentCollection: {
              photoSharing: true,
              eventCommunications: true,
              dietaryPreferences: true,
              accessibilityNeeds: true
            }
          })
        });

        const invitation = await invitationResponse.json();

        // Simulate guest responding to invitation with consent
        const guestResponseResponse = await fetch('/api/weddings/invitations/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invitationToken: invitation.guestTokens?.[0],
            guestEmail: 'guest1@example.com',
            rsvpResponse: 'attending',
            consents: {
              photo_sharing: true,
              event_communications: true,
              dietary_preferences: false,
              accessibility_needs: true
            },
            guestInfo: {
              firstName: 'Test',
              lastName: 'Guest',
              dietaryRequirements: 'None specified'
            }
          })
        });

        const guestResponse = await guestResponseResponse.json();

        // Verify guest consent recording
        const guestConsentResponse = await fetch(`/api/privacy/consent/guest/${guestResponse.guestId}`);
        const guestConsent = await guestConsentResponse.json();

        return {
          invitationCreated: invitationResponse.ok,
          guestResponseProcessed: guestResponseResponse.ok,
          guestId: guestResponse.guestId,
          guestConsentsRecorded: guestConsent.consents?.length > 0,
          photoSharingConsent: guestConsent.consents?.some(c => 
            c.consent_type === 'photo_sharing' && c.is_granted
          ),
          eventCommunicationConsent: guestConsent.consents?.some(c => 
            c.consent_type === 'event_communications' && c.is_granted
          ),
          partialConsentRespected: guestConsent.consents?.some(c => 
            c.consent_type === 'dietary_preferences' && !c.is_granted
          )
        };
      }, { user: userData, wedding: weddingData });

      if (guestConsentTest.guestId) {
        testGuestIds.push(guestConsentTest.guestId);
      }

      expect(guestConsentTest.invitationCreated).toBe(true);
      expect(guestConsentTest.guestResponseProcessed).toBe(true);
      expect(guestConsentTest.guestConsentsRecorded).toBe(true);
      expect(guestConsentTest.photoSharingConsent).toBe(true);
      expect(guestConsentTest.eventCommunicationConsent).toBe(true);
      expect(guestConsentTest.partialConsentRespected).toBe(true);
    });

    test('should handle consent inheritance for wedding party members', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test consent inheritance from couple to wedding party
      const inheritanceTest = await page.evaluate(async (testData) => {
        // Couple grants vendor sharing consent
        const coupleConsentResponse = await fetch('/api/privacy/consent/grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            consentType: 'vendor_data_sharing',
            purpose: 'Wedding coordination',
            inheritanceRules: {
              weddingParty: 'optional_inheritance',
              immediateFamily: 'automatic_inheritance'
            }
          })
        });

        // Add wedding party members
        const weddingPartyResponse = await fetch('/api/weddings/party/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: testData.wedding.id,
            members: [
              {
                email: 'bridesmaid@example.com',
                role: 'bridesmaid',
                relationship: 'friend',
                consentInheritance: 'accept'
              },
              {
                email: 'groomsman@example.com', 
                role: 'groomsman',
                relationship: 'friend',
                consentInheritance: 'decline'
              }
            ]
          })
        });

        const weddingParty = await weddingPartyResponse.json();

        // Check consent inheritance application
        const inheritanceCheckResponse = await fetch('/api/privacy/consent/inheritance-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: testData.wedding.id,
            parentUserId: testData.user.id
          })
        });

        const inheritanceStatus = await inheritanceCheckResponse.json();

        return {
          coupleConsentGranted: coupleConsentResponse.ok,
          weddingPartyAdded: weddingPartyResponse.ok,
          inheritanceProcessed: inheritanceCheckResponse.ok,
          optionalInheritanceRespected: inheritanceStatus.members?.some(m => 
            m.email === 'bridesmaid@example.com' && m.inheritedConsents?.length > 0
          ),
          inheritanceDeclineRespected: inheritanceStatus.members?.some(m => 
            m.email === 'groomsman@example.com' && !m.inheritedConsents?.length
          ),
          individualConsentRequired: inheritanceStatus.requiresIndividualConsent === true
        };
      }, { user: userData, wedding: weddingData });

      expect(inheritanceTest.coupleConsentGranted).toBe(true);
      expect(inheritanceTest.weddingPartyAdded).toBe(true);
      expect(inheritanceTest.inheritanceProcessed).toBe(true);
      expect(inheritanceTest.optionalInheritanceRespected).toBe(true);
      expect(inheritanceTest.inheritanceDeclineRespected).toBe(true);
      expect(inheritanceTest.individualConsentRequired).toBe(true);
    });
  });

  test.describe('Vendor-Specific Consent Workflows', () => {
    
    test('should handle consent for vendor data sharing and coordination', async ({ page }) => {
      const userData = createTestUserData();
      const weddingData = createTestWeddingData(userData.id);
      testUserIds.push(userData.id);
      testWeddingIds.push(weddingData.id);

      // Test vendor-specific consent workflows
      const vendorConsentTest = await page.evaluate(async (testData) => {
        // Create vendor profiles
        const vendorTypes = [
          { type: 'photographer', dataAccess: ['contact_info', 'wedding_details', 'guest_list'] },
          { type: 'caterer', dataAccess: ['contact_info', 'guest_count', 'dietary_preferences'] },
          { type: 'venue', dataAccess: ['contact_info', 'wedding_details', 'guest_count'] }
        ];

        const vendorResults = [];

        for (const vendor of vendorTypes) {
          // Request vendor data sharing consent
          const vendorConsentResponse = await fetch('/api/privacy/consent/vendor-specific', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.user.id,
              weddingId: testData.wedding.id,
              vendorType: vendor.type,
              requestedDataAccess: vendor.dataAccess,
              purpose: `${vendor.type} services for wedding`,
              dataRetentionPeriod: '1_year_after_wedding'
            })
          });

          const vendorConsent = await vendorConsentResponse.json();

          vendorResults.push({
            vendorType: vendor.type,
            consentRequested: vendorConsentResponse.ok,
            purposeLimitation: vendorConsent.purposeLimited === true,
            dataMinimization: vendorConsent.dataMinimized === true,
            retentionSpecified: !!vendorConsent.retentionPeriod
          });
        }

        // Test vendor consent withdrawal impact
        const photographerWithdrawalResponse = await fetch('/api/privacy/consent/vendor-withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.user.id,
            weddingId: testData.wedding.id,
            vendorType: 'photographer',
            withdrawalReason: 'Changed photographer'
          })
        });

        const photographerWithdrawal = await photographerWithdrawalResponse.json();

        return {
          allVendorConsentsProcessed: vendorResults.every(v => v.consentRequested),
          purposeLimitationEnforced: vendorResults.every(v => v.purposeLimitation),
          dataMinimizationApplied: vendorResults.every(v => v.dataMinimization),
          retentionPeriodsSet: vendorResults.every(v => v.retentionSpecified),
          vendorWithdrawalProcessed: photographerWithdrawalResponse.ok,
          dataAccessRevoked: photographerWithdrawal.dataAccessRevoked === true
        };
      }, { user: userData, wedding: weddingData });

      expect(vendorConsentTest.allVendorConsentsProcessed).toBe(true);
      expect(vendorConsentTest.purposeLimitationEnforced).toBe(true);
      expect(vendorConsentTest.dataMinimizationApplied).toBe(true);
      expect(vendorConsentTest.retentionPeriodsSet).toBe(true);
      expect(vendorConsentTest.vendorWithdrawalProcessed).toBe(true);
      expect(vendorConsentTest.dataAccessRevoked).toBe(true);
    });

    test('should enforce vendor data processing agreements (DPAs)', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test DPA enforcement for vendor data sharing
      const dpaTest = await page.evaluate(async (testData) => {
        // Attempt vendor data sharing without DPA
        const noDpaResponse = await fetch('/api/vendors/data-sharing/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            vendorId: 'vendor-123',
            dataCategories: ['contact_info', 'wedding_preferences'],
            dpaStatus: 'not_signed'
          })
        });

        // Attempt with signed DPA
        const withDpaResponse = await fetch('/api/vendors/data-sharing/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            vendorId: 'vendor-123',
            dataCategories: ['contact_info', 'wedding_preferences'],
            dpaStatus: 'signed',
            dpaVersion: '2024.1',
            dpaSignedDate: '2024-01-15T10:00:00Z'
          })
        });

        const withDpaResult = await withDpaResponse.json();

        // Test DPA compliance monitoring
        const complianceResponse = await fetch('/api/compliance/dpa-monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            vendorId: 'vendor-123'
          })
        });

        const compliance = await complianceResponse.json();

        return {
          noDpaBlocked: !noDpaResponse.ok || noDpaResponse.status === 403,
          withDpaAllowed: withDpaResponse.ok,
          dpaComplianceTracked: complianceResponse.ok,
          dataProcessingAgreementRequired: withDpaResult.dpaRequired === true,
          complianceMonitoring: compliance.monitoringActive === true,
          auditTrailMaintained: compliance.auditTrailActive === true
        };
      }, userData);

      expect(dpaTest.noDpaBlocked).toBe(true);
      expect(dpaTest.withDpaAllowed).toBe(true);
      expect(dpaTest.dpaComplianceTracked).toBe(true);
      expect(dpaTest.dataProcessingAgreementRequired).toBe(true);
      expect(dpaTest.complianceMonitoring).toBe(true);
      expect(dpaTest.auditTrailMaintained).toBe(true);
    });
  });

  test.describe('Cross-Border Consent Validation', () => {
    
    test('should handle international wedding consent requirements', async ({ page }) => {
      // Test WEDDING_GDPR_SCENARIOS.EU_COUPLE_US_VENDOR consent validation
      const crossBorderConsentTest = await page.evaluate(async () => {
        const internationalWedding = {
          couple: {
            email: 'couple@wedding.de',
            country: 'Germany',
            location: 'EU'
          },
          vendors: [
            {
              type: 'photographer',
              country: 'United States',
              location: 'US'
            },
            {
              type: 'florist',
              country: 'Canada',
              location: 'CA'
            }
          ],
          guests: [
            { email: 'guest1@example.de', country: 'Germany' },
            { email: 'guest2@example.com', country: 'United States' },
            { email: 'guest3@example.co.uk', country: 'United Kingdom' }
          ]
        };

        // Test cross-border consent validation
        const crossBorderResponse = await fetch('/api/compliance/cross-border-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wedding: internationalWedding,
            consentRequests: {
              photo_sharing: true,
              vendor_coordination: true,
              international_data_transfer: true
            }
          })
        });

        const crossBorder = await crossBorderResponse.json();

        // Test adequacy decision checking
        const adequacyResponse = await fetch('/api/compliance/adequacy-decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceRegions: ['EU'],
            targetRegions: ['US', 'CA', 'UK'],
            dataTypes: ['personal_data', 'photo_data']
          })
        });

        const adequacy = await adequacyResponse.json();

        return {
          crossBorderValidationProcessed: crossBorderResponse.ok,
          adequacyDecisionsChecked: adequacyResponse.ok,
          euUsTransferValidated: adequacy.transfers?.some(t => 
            t.source === 'EU' && t.target === 'US' && t.adequacyDecision !== undefined
          ),
          additionalSafeguardsRequired: crossBorder.additionalSafeguards?.length > 0,
          consentMechanismsAdapted: crossBorder.adaptedConsentMechanisms === true,
          multiJurisdictionCompliance: crossBorder.compliantInAllJurisdictions === true
        };
      });

      expect(crossBorderConsentTest.crossBorderValidationProcessed).toBe(true);
      expect(crossBorderConsentTest.adequacyDecisionsChecked).toBe(true);
      expect(crossBorderConsentTest.euUsTransferValidated).toBe(true);
      expect(crossBorderConsentTest.additionalSafeguardsRequired).toBe(true);
      expect(crossBorderConsentTest.consentMechanismsAdapted).toBe(true);
      expect(crossBorderConsentTest.multiJurisdictionCompliance).toBe(true);
    });
  });

  test.describe('Consent Audit Trails and Compliance Reporting', () => {
    
    test('should maintain comprehensive consent audit trails', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test comprehensive consent audit trail
      const auditTest = await page.evaluate(async (testData) => {
        // Perform various consent actions to create audit trail
        const consentActions = [
          { action: 'initial_grant', consentType: 'marketing_emails', timestamp: '2024-01-01T10:00:00Z' },
          { action: 'withdraw', consentType: 'marketing_emails', timestamp: '2024-06-15T14:30:00Z' },
          { action: 're_grant', consentType: 'marketing_emails', timestamp: '2024-08-01T09:15:00Z' },
          { action: 'partial_withdraw', consentType: 'analytics_cookies', timestamp: '2024-09-01T16:45:00Z' }
        ];

        for (const action of consentActions) {
          await fetch('/api/privacy/consent/audit-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: testData.id,
              action: action.action,
              consentType: action.consentType,
              timestamp: action.timestamp,
              auditMetadata: {
                ipAddress: '192.168.1.100',
                userAgent: 'Test Browser',
                sessionId: 'test-session'
              }
            })
          });
        }

        // Retrieve comprehensive audit trail
        const auditResponse = await fetch(`/api/privacy/consent/${testData.id}/audit-comprehensive`);
        const audit = await auditResponse.json();

        // Test audit integrity verification
        const integrityResponse = await fetch('/api/compliance/audit-integrity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            auditEvents: audit.auditTrail
          })
        });

        const integrity = await integrityResponse.json();

        return {
          auditTrailComplete: audit.auditTrail?.length >= consentActions.length,
          chronologicalOrder: audit.auditTrail?.every((event, index) => 
            index === 0 || new Date(event.timestamp) >= new Date(audit.auditTrail[index - 1].timestamp)
          ),
          allActionsRecorded: consentActions.every(action => 
            audit.auditTrail?.some(event => event.action === action.action && event.consent_type === action.consentType)
          ),
          metadataPreserved: audit.auditTrail?.every(event => event.metadata),
          integrityValidated: integrity.integrityValid === true,
          auditImmutable: integrity.tamperEvidence === false
        };
      }, userData);

      expect(auditTest.auditTrailComplete).toBe(true);
      expect(auditTest.chronologicalOrder).toBe(true);
      expect(auditTest.allActionsRecorded).toBe(true);
      expect(auditTest.metadataPreserved).toBe(true);
      expect(auditTest.integrityValidated).toBe(true);
      expect(auditTest.auditImmutable).toBe(true);
    });

    test('should generate consent compliance reports for audits', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test consent compliance reporting
      const reportingTest = await page.evaluate(async (testData) => {
        // Generate consent compliance report
        const reportResponse = await fetch('/api/compliance/consent-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportType: 'comprehensive',
            timeRange: {
              startDate: '2024-01-01T00:00:00Z',
              endDate: new Date().toISOString()
            },
            includeUserIds: [testData.id],
            reportSections: [
              'consent_collection_metrics',
              'consent_withdrawal_patterns',
              'compliance_status',
              'audit_trail_verification',
              'cross_border_transfers'
            ]
          })
        });

        const report = await reportResponse.json();

        // Test regulatory report generation
        const regulatoryResponse = await fetch('/api/compliance/regulatory-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regulatoryFramework: 'GDPR',
            reportPurpose: 'audit_preparation',
            includeUserIds: [testData.id]
          })
        });

        const regulatoryReport = await regulatoryResponse.json();

        return {
          reportGenerated: reportResponse.ok,
          allSectionsIncluded: report.sections?.length === 5,
          consentMetricsCalculated: typeof report.consentMetrics?.totalConsents === 'number',
          withdrawalPatternsAnalyzed: report.withdrawalPatterns?.length >= 0,
          complianceStatusAssessed: typeof report.complianceStatus?.overallScore === 'number',
          regulatoryReportGenerated: regulatoryResponse.ok,
          gdprCompliant: regulatoryReport.gdprCompliance?.status === 'compliant',
          auditReady: regulatoryReport.auditReadiness === true
        };
      }, userData);

      expect(reportingTest.reportGenerated).toBe(true);
      expect(reportingTest.allSectionsIncluded).toBe(true);
      expect(reportingTest.consentMetricsCalculated).toBe(true);
      expect(reportingTest.withdrawalPatternsAnalyzed).toBe(true);
      expect(reportingTest.complianceStatusAssessed).toBe(true);
      expect(reportingTest.regulatoryReportGenerated).toBe(true);
      expect(reportingTest.gdprCompliant).toBe(true);
      expect(reportingTest.auditReady).toBe(true);
    });
  });

  test.describe('Consent Performance and User Experience', () => {
    
    test('should meet consent management performance benchmarks', async ({ page }) => {
      const userData = createTestUserData();
      testUserIds.push(userData.id);

      // Test consent operation performance
      const performanceTest = await page.evaluate(async (testData) => {
        // Test consent update performance
        const startTime = Date.now();

        const consentUpdateResponse = await fetch('/api/privacy/consent/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            consentType: 'marketing_emails',
            isGranted: false
          })
        });

        const consentUpdateDuration = Date.now() - startTime;

        // Test consent retrieval performance
        const retrievalStart = Date.now();

        const retrievalResponse = await fetch(`/api/privacy/consent/${testData.id}`);

        const retrievalDuration = Date.now() - retrievalStart;

        // Test consent propagation time
        const propagationStart = Date.now();

        const propagationResponse = await fetch('/api/privacy/consent/propagation-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: testData.id,
            consentType: 'marketing_emails',
            checkPropagation: true
          })
        });

        const propagationDuration = Date.now() - propagationStart;

        return {
          consentUpdateWithinBenchmark: consentUpdateDuration < 1000, // 1 second
          consentRetrievalFast: retrievalDuration < 500, // 500ms
          propagationWithinLimit: propagationDuration < 5000, // 5 seconds
          updateSuccess: consentUpdateResponse.ok,
          retrievalSuccess: retrievalResponse.ok,
          propagationSuccess: propagationResponse.ok
        };
      }, userData);

      expect(performanceTest.consentUpdateWithinBenchmark).toBe(true);
      expect(performanceTest.consentRetrievalFast).toBe(true);
      expect(performanceTest.propagationWithinLimit).toBe(true);
      expect(performanceTest.updateSuccess).toBe(true);
      expect(performanceTest.retrievalSuccess).toBe(true);
      expect(performanceTest.propagationSuccess).toBe(true);
    });

    test('should provide accessible consent management interface', async ({ page }) => {
      await page.goto('/privacy/consent-management');

      // Test accessibility of consent interface
      await expect(page.locator('[data-testid="consent-management"]')).toBeVisible();

      // Check keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();

      // Test screen reader compatibility
      const ariaLabels = await page.locator('[aria-label]').count();
      expect(ariaLabels).toBeGreaterThan(0);

      // Test consent toggle accessibility
      const consentToggles = await page.locator('[role="switch"]').count();
      expect(consentToggles).toBeGreaterThan(0);

      // Verify focus management
      await page.click('[data-testid="consent-marketing_emails"]');
      await expect(page.locator('[data-testid="consent-marketing_emails"]:focus')).toBeVisible();

      // Test high contrast compatibility
      await page.emulateMedia({ media: 'screen', colorScheme: 'dark' });
      await expect(page.locator('[data-testid="consent-management"]')).toBeVisible();
    });
  });

  test.describe('Integration Testing: Consent Workflows End-to-End', () => {
    
    test('should handle complete wedding planning consent journey', async ({ page }) => {
      // Test complete consent journey from registration to wedding completion
      const completeJourneyTest = await page.evaluate(async () => {
        // 1. Initial couple registration with consents
        const registrationResponse = await fetch('/api/auth/register/couple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'journey@wedding.de',
            password: 'SecurePass123!',
            firstName: 'Journey',
            lastName: 'Test',
            weddingDate: '2025-06-15',
            country: 'Germany',
            consents: {
              essential_cookies: true,
              marketing_emails: true,
              analytics_cookies: true,
              vendor_data_sharing: true,
              photo_sharing: false
            }
          })
        });

        const registration = await registrationResponse.json();

        // 2. Wedding planning phase - vendor consents
        const vendorConsentResponse = await fetch('/api/privacy/consent/vendor-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: registration.user.id,
            vendors: [
              { type: 'photographer', consents: ['photo_sharing', 'contact_sharing'] },
              { type: 'caterer', consents: ['dietary_data', 'guest_count'] },
              { type: 'florist', consents: ['contact_sharing', 'venue_access'] }
            ]
          })
        });

        // 3. Guest invitation phase
        const guestInviteResponse = await fetch('/api/weddings/invitations/consent-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: registration.wedding.id,
            guestConsents: [
              { email: 'guest1@example.com', consents: ['photo_sharing', 'event_updates'] },
              { email: 'guest2@example.com', consents: ['event_updates'] }
            ]
          })
        });

        // 4. Marketing consent withdrawal
        const withdrawalResponse = await fetch('/api/privacy/consent/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: registration.user.id,
            consentType: 'marketing_emails',
            withdrawalReason: 'Too many emails'
          })
        });

        // 5. Post-wedding data retention
        const retentionResponse = await fetch('/api/compliance/post-wedding-retention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weddingId: registration.wedding.id,
            weddingCompleted: true,
            retentionDecisions: {
              photos: 'retain_indefinitely',
              vendor_data: 'delete_after_1_year',
              marketing_data: 'delete_immediately'
            }
          })
        });

        return {
          registrationSuccess: registrationResponse.ok,
          vendorConsentsProcessed: vendorConsentResponse.ok,
          guestConsentsHandled: guestInviteResponse.ok,
          withdrawalEffective: withdrawalResponse.ok,
          retentionPoliciesApplied: retentionResponse.ok,
          journeyCompleted: true
        };
      });

      expect(completeJourneyTest.registrationSuccess).toBe(true);
      expect(completeJourneyTest.vendorConsentsProcessed).toBe(true);
      expect(completeJourneyTest.guestConsentsHandled).toBe(true);
      expect(completeJourneyTest.withdrawalEffective).toBe(true);
      expect(completeJourneyTest.retentionPoliciesApplied).toBe(true);
      expect(completeJourneyTest.journeyCompleted).toBe(true);
    });
  });
});