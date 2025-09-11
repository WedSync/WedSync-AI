/**
 * WS-251: Biometric Authentication Validation Testing Suite
 * Team E - Round 1
 * 
 * Comprehensive testing for biometric authentication integration
 * Testing fingerprint, face recognition, voice authentication, and wedding day security scenarios
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  BiometricAuthenticationService,
  FingerprintAuthenticator,
  FaceRecognitionAuthenticator,
  VoiceAuthenticator,
  IrisAuthenticator,
  BiometricDeviceManager,
  BiometricTemplateManager
} from '@/lib/auth/biometric';
import {
  MobileBiometricIntegration,
  WebAuthnBiometricHandler,
  BiometricFallbackManager,
  BiometricSecurityPolicy
} from '@/lib/auth/biometric-integration';
import {
  WeddingDayBiometricSecurity,
  VenueBiometricAccess,
  EmergencyBiometricOverride,
  ClientPrivacyBiometricManager
} from '@/lib/auth/wedding-biometric-security';

describe('Enterprise Biometric Authentication Integration', () => {
  let biometricService: BiometricAuthenticationService;
  let deviceManager: BiometricDeviceManager;
  let templateManager: BiometricTemplateManager;

  beforeEach(async () => {
    biometricService = new BiometricAuthenticationService({
      encryptionLevel: 'AES-256',
      templateStorage: 'secure_enclave',
      privacyMode: 'gdpr_compliant',
      fallbackEnabled: true
    });

    deviceManager = new BiometricDeviceManager();
    templateManager = new BiometricTemplateManager();

    // Setup mock biometric devices
    await setupMockBiometricDevices();
  });

  afterEach(async () => {
    await cleanupBiometricData();
  });

  describe('Multi-Modal Biometric Authentication for Wedding Professionals', () => {
    test('should enroll wedding staff with multiple biometric modalities', async () => {
      const weddingStaffEnrollment = {
        userId: 'wedding-planner-sarah',
        userRole: 'senior_wedding_planner',
        biometricModalities: [
          {
            type: 'fingerprint',
            fingers: ['right_thumb', 'right_index', 'left_thumb'],
            deviceId: 'fingerprint-scanner-venue-1',
            quality: 'high'
          },
          {
            type: 'face_recognition',
            samples: 5, // Multiple angles
            deviceId: 'face-camera-mobile-app',
            livenessDetection: true
          },
          {
            type: 'voice_recognition',
            passphrase: 'Welcome to our wedding celebration',
            samples: 3,
            deviceId: 'voice-microphone-mobile',
            noiseReduction: true
          }
        ],
        privacyConsent: true,
        complianceLevel: 'enterprise'
      };

      const enrollmentResult = await biometricService.enrollUser(weddingStaffEnrollment);

      expect(enrollmentResult.modalitiesEnrolled).toBe(3);
      expect(enrollmentResult.fingerprintTemplatesCreated).toBe(3);
      expect(enrollmentResult.faceTemplateCreated).toBe(true);
      expect(enrollmentResult.voiceTemplateCreated).toBe(true);
      expect(enrollmentResult.encryptionApplied).toBe(true);
      expect(enrollmentResult.gdprCompliant).toBe(true);
      expect(enrollmentResult.templateIds).toHaveLength(3);

      // Verify template security
      const templateSecurity = await templateManager.validateTemplateSecurity(enrollmentResult.templateIds);
      expect(templateSecurity.encrypted).toBe(true);
      expect(templateSecurity.irreversible).toBe(true);
      expect(templateSecurity.biometricDataNotStored).toBe(true);
    });

    test('should authenticate wedding staff using primary and fallback biometrics', async () => {
      await enrollWeddingStaff('venue-coordinator-mike', ['fingerprint', 'face']);

      // Primary authentication attempt - fingerprint
      const primaryAuthAttempt = {
        userId: 'venue-coordinator-mike',
        biometricType: 'fingerprint',
        biometricData: 'mock-fingerprint-data-right-thumb',
        deviceId: 'fingerprint-scanner-venue-1',
        location: 'grand-ballroom-entrance',
        timestamp: new Date().toISOString()
      };

      const primaryAuthResult = await biometricService.authenticate(primaryAuthAttempt);

      expect(primaryAuthResult.authenticated).toBe(true);
      expect(primaryAuthResult.confidence).toBeGreaterThan(0.95);
      expect(primaryAuthResult.modalityUsed).toBe('fingerprint');
      expect(primaryAuthResult.fallbackRequired).toBe(false);

      // Simulate primary biometric failure (injured finger)
      const fallbackAuthAttempt = {
        userId: 'venue-coordinator-mike',
        biometricType: 'face',
        biometricData: 'mock-face-data-frontal-view',
        primaryAttemptFailed: true,
        deviceId: 'face-camera-mobile-app',
        location: 'grand-ballroom-entrance'
      };

      const fallbackAuthResult = await biometricService.authenticate(fallbackAuthAttempt);

      expect(fallbackAuthResult.authenticated).toBe(true);
      expect(fallbackAuthResult.modalityUsed).toBe('face');
      expect(fallbackAuthResult.fallbackUsed).toBe(true);
      expect(fallbackAuthResult.auditTrailUpdated).toBe(true);
    });

    test('should implement biometric template aging and quality degradation handling', async () => {
      const agingStaffMember = {
        userId: 'senior-planner-jennifer',
        enrollmentDate: new Date('2020-01-15'), // 4+ years ago
        lastSuccessfulAuth: new Date('2024-01-15'),
        ageRange: '55-65', // Biometric characteristics may change with age
        biometricHistory: {
          fingerprintQualityDegradation: 15, // 15% degradation over time
          faceRecognitionChanges: ['glasses_now_worn', 'slight_weight_change'],
          voiceChanges: ['seasonal_allergies_affecting_voice']
        }
      };

      const templateAging = await templateManager.assessTemplateAging(agingStaffMember);

      expect(templateAging.reenrollmentRecommended).toBe(true);
      expect(templateAging.qualityDegradation).toBe(15);
      expect(templateAging.confidenceThresholdAdjusted).toBe(true);
      expect(templateAging.adaptiveAuthenticationEnabled).toBe(true);

      // Test adaptive authentication with lower confidence threshold
      const adaptiveAuth = await biometricService.authenticate({
        userId: 'senior-planner-jennifer',
        biometricType: 'fingerprint',
        biometricData: 'mock-aged-fingerprint-data',
        adaptiveMode: true,
        confidenceThreshold: 0.85 // Lowered from default 0.95
      });

      expect(adaptiveAuth.authenticated).toBe(true);
      expect(adaptiveAuth.adaptiveThresholdUsed).toBe(true);
      expect(adaptiveAuth.reenrollmentScheduled).toBe(true);
    });
  });

  describe('Mobile Biometric Integration for Wedding Professionals', () => {
    let mobileBiometric: MobileBiometricIntegration;
    let webauthnHandler: WebAuthnBiometricHandler;

    beforeEach(() => {
      mobileBiometric = new MobileBiometricIntegration();
      webauthnHandler = new WebAuthnBiometricHandler();
    });

    test('should integrate with iOS/Android biometric systems for wedding app', async () => {
      const mobileIntegrationConfig = {
        platforms: ['iOS', 'Android'],
        biometricTypes: {
          iOS: ['touchId', 'faceId'],
          Android: ['fingerprint', 'face', 'iris']
        },
        weddingAppIntegration: {
          quickAccess: true,
          weddingDayMode: true,
          offlineAuthentication: true,
          emergencyOverride: true
        }
      };

      const mobileSetup = await mobileBiometric.configurePlatformIntegration(mobileIntegrationConfig);

      expect(mobileSetup.platformsConfigured).toBe(2);
      expect(mobileSetup.biometricAPIsIntegrated).toBe(true);
      expect(mobileSetup.secureEnclaveUtilized).toBe(true);
      expect(mobileSetup.weddingSpecificFeaturesEnabled).toBe(true);

      // Test iOS TouchID integration
      const iOSTouchIDAuth = await mobileBiometric.authenticateWithTouchID({
        userId: 'planner-mobile-123',
        weddingContext: {
          weddingId: 'wedding-456',
          weddingDate: '2024-06-22',
          isWeddingDay: true
        }
      });

      expect(iOSTouchIDAuth.authenticated).toBe(true);
      expect(iOSTouchIDAuth.secureEnclaveUsed).toBe(true);
      expect(iOSTouchIDAuth.weddingDayModeActivated).toBe(true);

      // Test Android Face authentication
      const androidFaceAuth = await mobileBiometric.authenticateWithFace({
        userId: 'coordinator-android-456',
        livenessDetection: true,
        weddingVenue: 'outdoor-garden-venue'
      });

      expect(androidFaceAuth.authenticated).toBe(true);
      expect(androidFaceAuth.livenessConfirmed).toBe(true);
      expect(androidFaceAuth.antiSpoofingPassed).toBe(true);
    });

    test('should implement WebAuthn biometric authentication for web platform', async () => {
      const webauthnConfig = {
        relyingParty: {
          id: 'wedsync.com',
          name: 'WedSync Wedding Management Platform'
        },
        user: {
          id: 'planner-web-789',
          name: 'sarah.planner@luxuryweddings.com',
          displayName: 'Sarah Wedding Planner'
        },
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Built-in biometrics
          userVerification: 'required',
          residentKey: 'preferred'
        },
        attestation: 'direct'
      };

      const webauthnRegistration = await webauthnHandler.registerBiometric(webauthnConfig);

      expect(webauthnRegistration.credentialId).toBeDefined();
      expect(webauthnRegistration.attestationValid).toBe(true);
      expect(webauthnRegistration.biometricEnabled).toBe(true);
      expect(webauthnRegistration.platformAuthenticator).toBe(true);

      // Test WebAuthn biometric authentication
      const webauthnAuth = await webauthnHandler.authenticateWithBiometric({
        credentialId: webauthnRegistration.credentialId,
        challenge: 'random-challenge-wedding-login-456',
        userHandle: 'planner-web-789'
      });

      expect(webauthnAuth.verified).toBe(true);
      expect(webauthnAuth.userPresent).toBe(true);
      expect(webauthnAuth.userVerified).toBe(true);
      expect(webauthnAuth.signatureValid).toBe(true);
    });

    test('should handle biometric authentication in poor network conditions at venues', async () => {
      const offlineConfig = {
        userId: 'venue-coordinator-offline',
        offlineMode: true,
        lastSyncDate: new Date(Date.now() - 3600000), // 1 hour ago
        cachedTemplates: true,
        fallbackMethods: ['PIN', 'pattern', 'emergency_override']
      };

      // Simulate poor network at wedding venue
      const networkSimulation = await simulatePoorVenueNetwork();
      expect(networkSimulation.online).toBe(false);
      expect(networkSimulation.signalStrength).toBe('weak');

      const offlineAuth = await mobileBiometric.authenticateOffline(offlineConfig);

      expect(offlineAuth.authenticated).toBe(true);
      expect(offlineAuth.offlineModeUsed).toBe(true);
      expect(offlineAuth.cachedTemplateUsed).toBe(true);
      expect(offlineAuth.syncPendingOnReconnection).toBe(true);

      // Test sync when network restored
      const networkRestoration = await simulateNetworkRestore();
      const syncResult = await mobileBiometric.syncOfflineAuthentications();

      expect(syncResult.authenticationsUploaded).toBe(1);
      expect(syncResult.auditTrailUpdated).toBe(true);
      expect(syncResult.securityValidationPassed).toBe(true);
    });
  });

  describe('Wedding Day Biometric Security Scenarios', () => {
    let weddingDaySecurity: WeddingDayBiometricSecurity;
    let venueAccess: VenueBiometricAccess;
    let emergencyOverride: EmergencyBiometricOverride;

    beforeEach(() => {
      weddingDaySecurity = new WeddingDayBiometricSecurity();
      venueAccess = new VenueBiometricAccess();
      emergencyOverride = new EmergencyBiometricOverride();
    });

    test('should implement enhanced biometric security for high-profile weddings', async () => {
      const highProfileWedding = {
        weddingId: 'celebrity-wedding-789',
        securityLevel: 'maximum',
        guestCount: 150,
        mediaRestrictions: 'strict',
        vipGuests: true,
        biometricRequirements: {
          staffMultiModalRequired: true,
          vendorBiometricMandatory: true,
          guestBiometricOptional: false,
          mediaPersonnelBanned: true
        }
      };

      const securitySetup = await weddingDaySecurity.configureHighProfileSecurity(highProfileWedding);

      expect(securitySetup.biometricZonesCreated).toBe(4); // Ceremony, reception, VIP, service areas
      expect(securitySetup.staffMultiModalEnabled).toBe(true);
      expect(securitySetup.vendorBiometricEnrollmentRequired).toBe(true);
      expect(securitySetup.continuousMonitoringActivated).toBe(true);
      expect(securitySetup.antiSpoofingEnhanced).toBe(true);

      // Test staff authentication in high-security mode
      const highSecurityAuth = await weddingDaySecurity.authenticateStaff({
        userId: 'security-coordinator-vip',
        requiredModalities: ['fingerprint', 'face'],
        location: 'vip-area-entrance',
        securityLevel: 'maximum'
      });

      expect(highSecurityAuth.multiModalSuccess).toBe(true);
      expect(highSecurityAuth.confidenceScore).toBeGreaterThan(0.98);
      expect(highSecurityAuth.livenessVerified).toBe(true);
      expect(highSecurityAuth.continuousMonitoringActivated).toBe(true);
    });

    test('should manage venue access zones with graduated biometric requirements', async () => {
      const venueAccessZones = {
        'public-areas': {
          biometricRequired: false,
          accessLevel: 'public'
        },
        'ceremony-space': {
          biometricRequired: true,
          authorizedRoles: ['wedding_planner', 'venue_coordinator', 'photographer'],
          biometricType: 'any_single_modality'
        },
        'bridal-preparation': {
          biometricRequired: true,
          authorizedRoles: ['wedding_planner', 'bridal_attendant'],
          biometricType: 'dual_modality',
          privacyLevel: 'maximum'
        },
        'service-areas': {
          biometricRequired: true,
          authorizedRoles: ['catering_staff', 'venue_coordinator', 'cleaning_crew'],
          biometricType: 'single_modality',
          timeRestrictions: 'service_hours_only'
        }
      };

      const zoneConfiguration = await venueAccess.configureAccessZones(venueAccessZones);

      expect(zoneConfiguration.zonesConfigured).toBe(4);
      expect(zoneConfiguration.biometricReadersDeployed).toBe(3);
      expect(zoneConfiguration.privacyControlsImplemented).toBe(true);

      // Test graduated access control
      const bridalAreaAccess = await venueAccess.validateZoneAccess({
        userId: 'bridal-attendant-mary',
        targetZone: 'bridal-preparation',
        biometricData: {
          fingerprint: 'mock-fingerprint-data',
          face: 'mock-face-data'
        },
        timestamp: new Date().toISOString()
      });

      expect(bridalAreaAccess.accessGranted).toBe(true);
      expect(bridalAreaAccess.dualModalityVerified).toBe(true);
      expect(bridalAreaAccess.privacyLoggingMinimized).toBe(true);
      expect(bridalAreaAccess.auditTrailSecure).toBe(true);
    });

    test('should handle emergency biometric override during wedding crises', async () => {
      const weddingEmergency = {
        emergencyType: 'medical_emergency',
        location: 'ceremony_space',
        weddingId: 'wedding-emergency-123',
        reportedBy: 'venue-coordinator-urgent',
        timestamp: new Date().toISOString(),
        responseTeam: ['paramedic', 'venue_manager', 'wedding_planner'],
        accessRequired: ['medical_storage', 'emergency_exits', 'communication_room']
      };

      const emergencyOverrideResult = await emergencyOverride.activateEmergencyAccess(weddingEmergency);

      expect(emergencyOverrideResult.overrideActivated).toBe(true);
      expect(emergencyOverrideResult.temporaryAccessGranted).toHaveLength(3);
      expect(emergencyOverrideResult.emergencyTeamNotified).toBe(true);
      expect(emergencyOverrideResult.biometricRequirementsRelaxed).toBe(true);
      expect(emergencyOverrideResult.auditTrailMaintained).toBe(true);

      // Test emergency team member access
      const emergencyAccess = await emergencyOverride.authenticateEmergencyPersonnel({
        emergencyId: emergencyOverrideResult.emergencyId,
        personnelType: 'paramedic',
        requiredAccess: ['medical_storage'],
        biometricAvailable: false, // Emergency personnel may not be enrolled
        alternativeAuth: 'supervisor_verification'
      });

      expect(emergencyAccess.accessGranted).toBe(true);
      expect(emergencyAccess.emergencyOverrideUsed).toBe(true);
      expect(emergencyAccess.supervisorVerificationRequired).toBe(true);
      expect(emergencyAccess.temporaryAccessExpiry).toBeDefined();
    });

    test('should protect client privacy during biometric operations', async () => {
      const clientPrivacyManager = new ClientPrivacyBiometricManager();

      const privacyRequirements = {
        weddingId: 'privacy-conscious-wedding-456',
        clientConsent: {
          biometricDataProcessing: false, // Clients opted out
          photographyRestrictions: true,
          guestDataMinimization: true
        },
        complianceRequirements: ['GDPR', 'CCPA'],
        staffBiometricPolicy: {
          clientAreaRestrictions: true,
          dataMinimization: true,
          purposeLimitation: 'access_control_only'
        }
      };

      const privacyConfiguration = await clientPrivacyManager.configurePrivacyProtections(privacyRequirements);

      expect(privacyConfiguration.clientOptOutRespected).toBe(true);
      expect(privacyConfiguration.staffBiometricLimited).toBe(true);
      expect(privacyConfiguration.dataMinimizationEnforced).toBe(true);
      expect(privacyConfiguration.gdprCompliant).toBe(true);

      // Test privacy-compliant staff authentication
      const privacyCompliantAuth = await clientPrivacyManager.authenticateWithPrivacyControls({
        userId: 'staff-in-client-area',
        biometricType: 'fingerprint',
        location: 'client_interaction_space',
        privacyMode: 'maximum_protection'
      });

      expect(privacyCompliantAuth.authenticated).toBe(true);
      expect(privacyCompliantAuth.biometricDataMinimized).toBe(true);
      expect(privacyCompliantAuth.logRetentionLimited).toBe(true);
      expect(privacyCompliantAuth.clientPrivacyProtected).toBe(true);
    });
  });

  describe('Biometric Security Policy and Compliance', () => {
    let securityPolicy: BiometricSecurityPolicy;
    let fallbackManager: BiometricFallbackManager;

    beforeEach(() => {
      securityPolicy = new BiometricSecurityPolicy();
      fallbackManager = new BiometricFallbackManager();
    });

    test('should enforce enterprise biometric security policies', async () => {
      const enterprisePolicy = {
        templateEncryption: 'AES-256-GCM',
        templateStorage: 'secure_hardware_enclave',
        falseAcceptanceRate: 0.0001, // 1 in 10,000
        falseRejectionRate: 0.01, // 1 in 100
        livenessDetection: 'mandatory',
        antiSpoofing: 'advanced',
        templateAging: {
          maxAge: '2_years',
          qualityDegradationThreshold: 20, // 20% degradation triggers re-enrollment
        },
        auditRequirements: {
          logAllAttempts: true,
          retentionPeriod: '7_years',
          complianceStandards: ['SOC2', 'GDPR', 'HIPAA']
        }
      };

      const policyImplementation = await securityPolicy.implementEnterprisePolicy(enterprisePolicy);

      expect(policyImplementation.policyEnforced).toBe(true);
      expect(policyImplementation.securityControlsActive).toBe(12);
      expect(policyImplementation.complianceRequirementsMet).toBe(true);
      expect(policyImplementation.auditFrameworkConfigured).toBe(true);
    });

    test('should implement comprehensive fallback authentication strategies', async () => {
      const fallbackStrategies = {
        primary: 'biometric_multi_modal',
        fallback1: 'biometric_single_modal',
        fallback2: 'smart_card_plus_pin',
        fallback3: 'mobile_push_notification',
        emergency: 'supervisor_override_with_audit',
        policies: {
          maxFallbackAttempts: 3,
          fallbackCooldown: 300, // 5 minutes
          emergencyEscalation: true,
          auditAllFallbacks: true
        }
      };

      const fallbackConfig = await fallbackManager.configureFallbackStrategies(fallbackStrategies);

      expect(fallbackConfig.strategiesConfigured).toBe(5);
      expect(fallbackConfig.cascadingFallbackEnabled).toBe(true);
      expect(fallbackConfig.emergencyOverrideConfigured).toBe(true);

      // Test fallback cascade
      const fallbackAttempt = await fallbackManager.processFallbackAuthentication({
        userId: 'staff-with-biometric-failure',
        primaryFailureReason: 'fingerprint_sensor_malfunction',
        attemptedFallbacks: ['face_recognition_failed'],
        currentFallbackLevel: 2 // Smart card + PIN
      });

      expect(fallbackAttempt.fallbackUsed).toBe('smart_card_plus_pin');
      expect(fallbackAttempt.authenticated).toBe(true);
      expect(fallbackAttempt.auditTrailUpdated).toBe(true);
      expect(fallbackAttempt.securityAlertGenerated).toBe(true);
    });

    test('should validate biometric system compliance with wedding industry standards', async () => {
      const industryCompliance = {
        weddingIndustryStandards: [
          'PCI_DSS', // Payment card industry
          'GDPR', // EU data protection
          'CCPA', // California privacy
          'Wedding_Vendor_Security_Framework'
        ],
        biometricSpecificRequirements: {
          templateIrreversibility: true,
          biometricDataNonStorage: true,
          consentManagement: true,
          dataMinimization: true,
          rightToBeForgotten: true
        }
      };

      const complianceValidation = await securityPolicy.validateIndustryCompliance(industryCompliance);

      expect(complianceValidation.overallCompliance).toBeGreaterThan(0.95);
      expect(complianceValidation.pciDssCompliant).toBe(true);
      expect(complianceValidation.gdprCompliant).toBe(true);
      expect(complianceValidation.biometricDataProtectionCompliant).toBe(true);
      expect(complianceValidation.weddingIndustryRequirementsMet).toBe(true);

      // Verify specific wedding industry requirements
      expect(complianceValidation.weddingSpecificControls).toContain('client_privacy_protection');
      expect(complianceValidation.weddingSpecificControls).toContain('vendor_access_isolation');
      expect(complianceValidation.weddingSpecificControls).toContain('wedding_day_emergency_access');
    });
  });
});

// Helper functions and mock implementations
async function setupMockBiometricDevices() {
  return {
    fingerprintScanners: 3,
    faceCameras: 2,
    voiceMicrophones: 1,
    irisScanner: 1
  };
}

async function cleanupBiometricData() {
  // Mock cleanup ensuring no biometric data remains
  return { 
    templatesDeleted: true,
    biometricDataPurged: true,
    complianceVerified: true 
  };
}

async function enrollWeddingStaff(userId: string, modalities: string[]) {
  return {
    userId,
    modalitiesEnrolled: modalities.length,
    templatesCreated: modalities.length,
    enrollmentCompleted: true
  };
}

async function simulatePoorVenueNetwork() {
  return {
    online: false,
    signalStrength: 'weak',
    connectivity: 'intermittent'
  };
}

async function simulateNetworkRestore() {
  return {
    online: true,
    signalStrength: 'strong',
    connectivity: 'stable'
  };
}