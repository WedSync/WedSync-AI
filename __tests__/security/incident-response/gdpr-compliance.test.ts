/**
 * WS-190 Team E: GDPR Compliance Validation Test Suite
 * 
 * Comprehensive testing for GDPR compliance automation, breach notification,
 * and regulatory compliance validation for wedding industry data protection.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { GDPRComplianceManager } from '@/lib/security/gdpr-compliance';
import { BreachNotificationService } from '@/lib/security/breach-notification';
import { DataProtectionOfficer } from '@/lib/security/dpo';
import { ConsentManager } from '@/lib/security/consent-manager';

// Mock dependencies
vi.mock('@/lib/security/breach-notification');
vi.mock('@/lib/security/dpo');
vi.mock('@/lib/security/consent-manager');

describe('WS-190: GDPR Compliance Validation', () => {
  let gdprManager: GDPRComplianceManager;
  let mockBreachNotification: any;
  let mockDPO: any;
  let mockConsentManager: any;

  beforeEach(() => {
    mockBreachNotification = {
      assessBreachRisk: vi.fn(),
      notifyRegulators: vi.fn(),
      notifyDataSubjects: vi.fn(),
      documentBreach: vi.fn(),
      trackNotificationDeadlines: vi.fn(),
    };

    mockDPO = {
      validateLegalBasis: vi.fn(),
      conductPrivacyImpactAssessment: vi.fn(),
      reviewDataProcessing: vi.fn(),
      auditCompliance: vi.fn(),
    };

    mockConsentManager = {
      validateConsent: vi.fn(),
      withdrawConsent: vi.fn(),
      updateConsentPreferences: vi.fn(),
      generateConsentReport: vi.fn(),
    };

    (BreachNotificationService as any).mockImplementation(() => mockBreachNotification);
    (DataProtectionOfficer as any).mockImplementation(() => mockDPO);
    (ConsentManager as any).mockImplementation(() => mockConsentManager);

    gdprManager = new GDPRComplianceManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Personal Data Breach Scenarios', () => {
    test('should automatically assess breach risk within 72 hours', async () => {
      const personalDataBreach = {
        id: 'breach-gdpr-001',
        type: 'unauthorized_access',
        detectedAt: new Date(),
        affectedRecords: 500,
        dataCategories: [
          'personal_identifiers', // Names, addresses
          'contact_details', // Email, phone
          'special_categories', // Dietary requirements, accessibility needs
        ],
        affectedDataSubjects: [
          { type: 'wedding_guests', count: 350 },
          { type: 'wedding_couples', count: 25 },
          { type: 'vendors', count: 125 }
        ],
        riskFactors: {
          likelihood: 'HIGH',
          severity: 'HIGH',
          impactOnRights: 'SIGNIFICANT'
        }
      };

      const riskAssessment = await gdprManager.assessBreachRisk(personalDataBreach);

      expect(riskAssessment.requiresRegulatorNotification).toBe(true);
      expect(riskAssessment.requiresDataSubjectNotification).toBe(true);
      expect(riskAssessment.notificationDeadline).toBeInstanceOf(Date);
      expect(mockBreachNotification.assessBreachRisk).toHaveBeenCalledWith({
        breach: personalDataBreach,
        deadline: expect.any(Date), // 72 hours from detection
      });

      // Verify 72-hour deadline
      const deadline = riskAssessment.notificationDeadline;
      const expectedDeadline = new Date(personalDataBreach.detectedAt.getTime() + (72 * 60 * 60 * 1000));
      expect(Math.abs(deadline.getTime() - expectedDeadline.getTime())).toBeLessThan(1000);
    });

    test('should handle wedding guest data breaches with special categories', async () => {
      const specialCategoryBreach = {
        id: 'breach-special-001',
        type: 'data_exposure',
        affectedRecords: 200,
        dataCategories: [
          'dietary_requirements', // Special category (health-related)
          'accessibility_needs', // Special category (health-related)
          'religious_preferences', // Special category (religious beliefs)
        ],
        weddingContext: {
          upcomingWeddings: ['wedding-this-weekend', 'wedding-next-week'],
          seasonalPeak: true,
          vendorTypes: ['caterers', 'venues', 'photographers']
        }
      };

      const complianceCheck = await gdprManager.handleSpecialCategoryBreach(specialCategoryBreach);

      expect(complianceCheck.heightenedProtection).toBe(true);
      expect(complianceCheck.expeditedNotification).toBe(true);
      expect(complianceCheck.additionalMeasures).toContain('enhanced_monitoring');
      expect(mockBreachNotification.notifyDataSubjects).toHaveBeenCalledWith({
        subjects: expect.any(Array),
        template: 'SPECIAL_CATEGORY_BREACH',
        urgency: 'HIGH'
      });
    });

    test('should validate lawful basis for emergency wedding data processing', async () => {
      const emergencyProcessing = {
        scenario: 'wedding_day_emergency',
        dataTypes: ['guest_contact_details', 'vendor_information'],
        purpose: 'emergency_coordination',
        urgency: 'CRITICAL',
        weddingDate: new Date(), // Today
        justification: 'Legitimate interest - wedding day emergency requires immediate coordination'
      };

      const lawfulnessValidation = await gdprManager.validateEmergencyProcessing(emergencyProcessing);

      expect(lawfulnessValidation.isLawful).toBe(true);
      expect(lawfulnessValidation.lawfulBasis).toBe('legitimate_interest');
      expect(lawfulnessValidation.balancingTest.passed).toBe(true);
      expect(mockDPO.validateLegalBasis).toHaveBeenCalledWith({
        processing: emergencyProcessing,
        emergencyOverride: true
      });
    });

    test('should handle cross-border wedding data transfers', async () => {
      const internationalWeddingData = {
        sourceCountry: 'UK',
        destinationCountries: ['USA', 'FRANCE', 'AUSTRALIA'],
        dataTypes: ['guest_information', 'vendor_contracts'],
        transferMechanism: 'standard_contractual_clauses',
        weddingLocation: 'DESTINATION_WEDDING_ITALY',
        adequacyDecision: {
          UK_to_EU: false, // Post-Brexit
          adequacyStatus: 'REQUIRES_SAFEGUARDS'
        }
      };

      const transferValidation = await gdprManager.validateInternationalTransfer(internationalWeddingData);

      expect(transferValidation.transferPermitted).toBe(true);
      expect(transferValidation.safeguardsRequired).toBe(true);
      expect(transferValidation.additionalMeasures).toContain('encryption_in_transit');
      expect(transferValidation.additionalMeasures).toContain('access_controls');
    });
  });

  describe('Automated Compliance Monitoring', () => {
    test('should monitor consent status for wedding communications', async () => {
      const weddingCommunicationConsent = {
        weddingId: 'wedding-123',
        guestConsents: [
          { guestId: 'guest-001', emailConsent: true, smsConsent: false, updatedAt: new Date() },
          { guestId: 'guest-002', emailConsent: true, smsConsent: true, updatedAt: new Date() },
          { guestId: 'guest-003', emailConsent: false, smsConsent: false, updatedAt: new Date() }
        ],
        marketingConsents: [
          { userId: 'vendor-456', consent: true, purposes: ['wedding_updates', 'promotional_offers'] }
        ]
      };

      const consentValidation = await gdprManager.validateWeddingConsents(weddingCommunicationConsent);

      expect(consentValidation.validConsents).toHaveLength(2);
      expect(consentValidation.invalidConsents).toHaveLength(1);
      expect(consentValidation.restrictions).toContain({
        guestId: 'guest-003',
        restrictedChannels: ['email', 'sms']
      });
      expect(mockConsentManager.validateConsent).toHaveBeenCalled();
    });

    test('should track data retention periods for wedding records', async () => {
      const weddingDataRetention = {
        weddingId: 'wedding-completed-2022',
        weddingDate: new Date('2022-06-15'),
        dataCategories: {
          guest_data: { retentionPeriod: '2_years', legalBasis: 'contract_fulfillment' },
          payment_records: { retentionPeriod: '7_years', legalBasis: 'legal_obligation' },
          photos_videos: { retentionPeriod: '5_years', legalBasis: 'legitimate_interest' },
          vendor_communications: { retentionPeriod: '3_years', legalBasis: 'contract_fulfillment' }
        },
        currentDate: new Date('2024-07-01')
      };

      const retentionCompliance = await gdprManager.validateDataRetention(weddingDataRetention);

      expect(retentionCompliance.expiredData).toContain('guest_data');
      expect(retentionCompliance.expiredData).not.toContain('payment_records');
      expect(retentionCompliance.scheduledDeletion).toBeDefined();
      expect(retentionCompliance.deletionDate).toBeInstanceOf(Date);
    });

    test('should generate privacy impact assessments for new features', async () => {
      const newFeaturePIA = {
        featureName: 'AI_Wedding_Recommendations',
        dataProcessing: {
          personalDataTypes: ['preferences', 'budget_information', 'guest_count'],
          specialCategories: false,
          processingPurposes: ['personalized_recommendations', 'vendor_matching'],
          dataFlows: ['collection', 'analysis', 'recommendation_generation'],
          thirdPartySharing: ['recommended_vendors']
        },
        riskFactors: {
          automatedDecisionMaking: true,
          profiling: true,
          largescaleProcessing: false,
          vulnerableDataSubjects: false
        }
      };

      const piaResult = await gdprManager.conductPIA(newFeaturePIA);

      expect(piaResult.requiresPIA).toBe(true);
      expect(piaResult.riskLevel).toBe('MEDIUM');
      expect(piaResult.mitigationMeasures).toContain('transparent_algorithm');
      expect(piaResult.mitigationMeasures).toContain('right_to_explanation');
      expect(mockDPO.conductPrivacyImpactAssessment).toHaveBeenCalled();
    });
  });

  describe('Data Subject Rights Automation', () => {
    test('should handle automated data subject access requests', async () => {
      const accessRequest = {
        requestId: 'dsar-001',
        requestType: 'ACCESS_REQUEST',
        dataSubjectId: 'guest-12345',
        requestDate: new Date(),
        weddingAssociations: ['wedding-abc', 'wedding-def'],
        requestedData: 'ALL_PERSONAL_DATA',
        identityVerified: true
      };

      const dsarResponse = await gdprManager.processAccessRequest(accessRequest);

      expect(dsarResponse.responseDeadline).toBeInstanceOf(Date);
      expect(dsarResponse.estimatedDataVolume).toBeGreaterThan(0);
      expect(dsarResponse.dataCategories).toContain('guest_profile');
      expect(dsarResponse.dataCategories).toContain('wedding_participation');
      expect(dsarResponse.format).toBe('MACHINE_READABLE_JSON');
      
      // Verify 30-day response deadline
      const deadline = dsarResponse.responseDeadline;
      const expectedDeadline = new Date(accessRequest.requestDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      expect(Math.abs(deadline.getTime() - expectedDeadline.getTime())).toBeLessThan(1000);
    });

    test('should process data portability requests for wedding data', async () => {
      const portabilityRequest = {
        requestId: 'portability-001',
        dataSubjectType: 'WEDDING_COUPLE',
        coupleId: 'couple-789',
        requestedWeddingData: [
          'guest_list',
          'vendor_contracts',
          'timeline_details',
          'budget_information',
          'communication_history'
        ],
        targetPlatform: 'competing_wedding_platform'
      };

      const portabilityResponse = await gdprManager.processPortabilityRequest(portabilityRequest);

      expect(portabilityResponse.exportFormat).toBe('STRUCTURED_JSON');
      expect(portabilityResponse.includesMetadata).toBe(true);
      expect(portabilityResponse.dataIntegrityVerified).toBe(true);
      expect(portabilityResponse.exportPackage.size).toBeGreaterThan(0);
      expect(portabilityResponse.transferInstructions).toBeDefined();
    });

    test('should handle rectification requests for wedding guest data', async () => {
      const rectificationRequest = {
        requestId: 'rectify-001',
        dataSubjectId: 'guest-555',
        incorrectData: {
          field: 'dietary_requirements',
          currentValue: 'vegetarian',
          requestedValue: 'vegan_gluten_free'
        },
        weddingContext: {
          weddingId: 'wedding-next-month',
          weddingDate: new Date('2024-08-15'),
          cateringDeadline: new Date('2024-08-01')
        }
      };

      const rectificationResponse = await gdprManager.processRectificationRequest(rectificationRequest);

      expect(rectificationResponse.dataUpdated).toBe(true);
      expect(rectificationResponse.downstreamNotifications).toContain('caterer');
      expect(rectificationResponse.downstreamNotifications).toContain('venue');
      expect(rectificationResponse.urgencyFlag).toBe(true); // Due to catering deadline
    });

    test('should process erasure requests with legal basis validation', async () => {
      const erasureRequest = {
        requestId: 'erasure-001',
        dataSubjectId: 'guest-to-delete',
        erasureReason: 'WITHDRAWAL_OF_CONSENT',
        affectedWeddings: ['wedding-completed', 'wedding-cancelled'],
        requestDate: new Date(),
        legalObligationCheck: {
          paymentRecords: true, // Must retain for tax purposes
          contractualObligations: false
        }
      };

      const erasureResponse = await gdprManager.processErasureRequest(erasureRequest);

      expect(erasureResponse.fullyErased).toBe(false);
      expect(erasureResponse.partialErasure).toBe(true);
      expect(erasureResponse.retainedDataTypes).toContain('payment_records');
      expect(erasureResponse.retainedDataJustification).toContain('legal_obligation');
      expect(erasureResponse.pseudonymized).toBe(true);
    });
  });

  describe('Breach Notification Automation', () => {
    test('should automatically notify ICO within 72 hours for high-risk breaches', async () => {
      const highRiskBreach = {
        id: 'breach-ico-001',
        type: 'unauthorized_disclosure',
        affectedRecords: 1000,
        riskLevel: 'HIGH',
        likelyToResultInRisk: true,
        dataCategories: ['personal_identifiers', 'financial_data'],
        detectedAt: new Date(),
        regulatoryJurisdiction: 'UK'
      };

      const notificationResult = await gdprManager.notifyRegulators(highRiskBreach);

      expect(notificationResult.notificationSent).toBe(true);
      expect(notificationResult.regulatorNotified).toBe('ICO_UK');
      expect(notificationResult.referenceNumber).toBeDefined();
      expect(notificationResult.followUpRequired).toBe(true);
      expect(mockBreachNotification.notifyRegulators).toHaveBeenCalledWith({
        breach: highRiskBreach,
        deadline: expect.any(Date),
        authority: 'ICO_UK'
      });
    });

    test('should determine when data subject notification is required', async () => {
      const dataSubjectNotificationScenarios = [
        {
          breach: { riskLevel: 'HIGH', likelyToResultInRisk: true },
          expected: { notificationRequired: true }
        },
        {
          breach: { riskLevel: 'LOW', technicalMeasures: 'ENCRYPTION', effectivenessMeasures: true },
          expected: { notificationRequired: false }
        },
        {
          breach: { riskLevel: 'MEDIUM', publicDisclosure: true },
          expected: { notificationRequired: true }
        }
      ];

      for (const scenario of dataSubjectNotificationScenarios) {
        const result = await gdprManager.assessDataSubjectNotificationRequirement(scenario.breach);
        expect(result.notificationRequired).toBe(scenario.expected.notificationRequired);
      }
    });

    test('should handle concurrent breach notifications during wedding season', async () => {
      const concurrentBreaches = [
        { id: 'breach-001', severity: 'HIGH', affectedWeddings: 5 },
        { id: 'breach-002', severity: 'MEDIUM', affectedWeddings: 3 },
        { id: 'breach-003', severity: 'LOW', affectedWeddings: 1 }
      ];

      const startTime = Date.now();
      
      const results = await Promise.all(
        concurrentBreaches.map(breach => 
          gdprManager.processBreachNotification(breach)
        )
      );
      
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(60000); // All notifications within 1 minute
      expect(results.every(r => r.processed)).toBe(true);
    });
  });

  describe('Wedding Industry Specific Compliance', () => {
    test('should handle venue-specific data processing requirements', async () => {
      const venueDataProcessing = {
        venueType: 'HISTORIC_VENUE',
        additionalRequirements: ['FIRE_SAFETY_RECORDS', 'ACCESSIBILITY_ACCOMMODATIONS'],
        guestDataSharing: {
          emergencyServices: true,
          insurance: true,
          localAuthorities: true
        },
        retentionRequirements: {
          emergencyContacts: '2_years',
          accessibilityNeeds: '1_year',
          dietaryRequirements: '1_month_post_wedding'
        }
      };

      const venueCompliance = await gdprManager.validateVenueCompliance(venueDataProcessing);

      expect(venueCompliance.compliant).toBe(true);
      expect(venueCompliance.lawfulBasisDocumented).toBe(true);
      expect(venueCompliance.dataSharingAgreements).toBeDefined();
    });

    test('should validate photographer data processing consent', async () => {
      const photographerDataUse = {
        photographerId: 'photographer-123',
        serviceType: 'WEDDING_PHOTOGRAPHY',
        imageProcessing: {
          purposes: ['WEDDING_ALBUM', 'PORTFOLIO_USE', 'MARKETING'],
          facialRecognition: false,
          clouddStorage: true,
          thirdPartyEditing: true
        },
        consentTypes: {
          imageCapture: 'EXPLICIT_CONSENT',
          portfolioUse: 'EXPLICIT_CONSENT',
          marketingUse: 'SEPARATE_CONSENT_REQUIRED'
        }
      };

      const photographerCompliance = await gdprManager.validatePhotographerCompliance(photographerDataUse);

      expect(photographerCompliance.validConsents).toContain('imageCapture');
      expect(photographerCompliance.validConsents).toContain('portfolioUse');
      expect(photographerCompliance.separateMarketingConsent).toBe(true);
      expect(photographerCompliance.biometricDataProcessing).toBe(false);
    });
  });

  describe('Performance and Audit Requirements', () => {
    test('should maintain performance during compliance checks', async () => {
      const largescaleComplianceCheck = {
        recordCount: 10000,
        dataSubjects: 50000,
        weddingCount: 1000,
        timeframe: 'ANNUAL_AUDIT'
      };

      const startTime = Date.now();
      
      const auditResult = await gdprManager.performLargescaleAudit(largescaleComplianceCheck);
      
      const auditTime = Date.now() - startTime;
      
      expect(auditTime).toBeLessThan(300000); // Less than 5 minutes
      expect(auditResult.complianceScore).toBeGreaterThan(95);
      expect(auditResult.violationCount).toBeLessThan(10);
    });

    test('should generate comprehensive compliance reports', async () => {
      const reportingPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        scope: 'FULL_PLATFORM_AUDIT'
      };

      const complianceReport = await gdprManager.generateAnnualComplianceReport(reportingPeriod);

      expect(complianceReport.sections).toContain('BREACH_SUMMARY');
      expect(complianceReport.sections).toContain('DSAR_STATISTICS');
      expect(complianceReport.sections).toContain('CONSENT_MANAGEMENT');
      expect(complianceReport.sections).toContain('DATA_RETENTION');
      expect(complianceReport.ready_for_regulator).toBe(true);
    });
  });
});