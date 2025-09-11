/**
 * DeviceComplianceValidator - Mobile Device Security Validation
 *
 * Validates mobile device compliance with enterprise security standards
 * for WedSync's enterprise SSO system with wedding industry requirements.
 *
 * Wedding Industry Context:
 * - Wedding venues often have challenging network conditions
 * - Devices must work reliably during critical Saturday operations
 * - Multiple team members may share devices during events
 * - Emergency access needed while maintaining security standards
 *
 * @author WedSync Security Team
 * @version 2.0.0
 */

// Types and Interfaces
interface DeviceFingerprint {
  deviceId: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  model: string;
  osVersion: string;
  appVersion: string;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  canvasFingerprint: string;
  audioFingerprint?: string;
}

interface ComplianceValidation {
  validationId: string;
  deviceFingerprint: DeviceFingerprint;
  timestamp: Date;
  checks: ComplianceCheck[];
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  weddingDayContext: boolean;
  passed: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

interface ComplianceCheck {
  checkId: string;
  name: string;
  category:
    | 'security'
    | 'privacy'
    | 'performance'
    | 'compatibility'
    | 'wedding_specific';
  status: 'pass' | 'warn' | 'fail' | 'skip';
  score: number;
  maxScore: number;
  details: string;
  weddingDayRelaxed: boolean;
  remediation?: string;
  criticalForWedding: boolean;
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ComplianceCheck['category'];
  validator: (
    device: DeviceFingerprint,
    context: ValidationContext,
  ) => Promise<ComplianceCheck>;
  weight: number;
  mandatory: boolean;
  weddingDayRelaxed: boolean;
  criticalForWedding: boolean;
}

interface ValidationContext {
  isWeddingDay: boolean;
  venueId?: string;
  weddingId?: string;
  userRole: string;
  organizationId: string;
  emergencyMode: boolean;
  offlineMode: boolean;
  teamMember: boolean;
}

interface ThreatDetection {
  threatId: string;
  type:
    | 'jailbreak'
    | 'root'
    | 'emulator'
    | 'debugging'
    | 'man_in_middle'
    | 'malware';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: boolean;
  confidence: number; // 0-1
  details: string;
  timestamp: Date;
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  storageUsage: number;
  batteryLevel?: number;
}

class DeviceComplianceValidator {
  private validationRules: Map<string, ValidationRule> = new Map();
  private validationHistory: Map<string, ComplianceValidation[]> = new Map();
  private threatDetections: Map<string, ThreatDetection[]> = new Map();
  private secureStorage: IDBDatabase | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.initializeValidator();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize device compliance validator
   */
  private async initializeValidator(): Promise<void> {
    try {
      await this.initializeSecureStorage();
      await this.setupValidationRules();
      console.log('🛡️ DeviceComplianceValidator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DeviceComplianceValidator:', error);
      throw error;
    }
  }

  /**
   * Initialize secure storage
   */
  private async initializeSecureStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncDeviceCompliance', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.secureStorage = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Validation results store
        if (!db.objectStoreNames.contains('validations')) {
          const validationStore = db.createObjectStore('validations', {
            keyPath: 'validationId',
          });
          validationStore.createIndex(
            'deviceId',
            'deviceFingerprint.deviceId',
            { unique: false },
          );
          validationStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
          validationStore.createIndex('passed', 'passed', { unique: false });
          validationStore.createIndex('riskLevel', 'riskLevel', {
            unique: false,
          });
        }

        // Threat detections store
        if (!db.objectStoreNames.contains('threats')) {
          const threatStore = db.createObjectStore('threats', {
            keyPath: 'threatId',
          });
          threatStore.createIndex('type', 'type', { unique: false });
          threatStore.createIndex('severity', 'severity', { unique: false });
          threatStore.createIndex('timestamp', 'timestamp', { unique: false });
          threatStore.createIndex('detected', 'detected', { unique: false });
        }

        // Device fingerprints store
        if (!db.objectStoreNames.contains('fingerprints')) {
          const fingerprintStore = db.createObjectStore('fingerprints', {
            keyPath: 'deviceId',
          });
          fingerprintStore.createIndex('platform', 'platform', {
            unique: false,
          });
        }
      };
    });
  }

  /**
   * Setup validation rules
   */
  private async setupValidationRules(): Promise<void> {
    // Security Rules
    this.addValidationRule({
      id: 'device-encryption',
      name: 'Device Encryption Check',
      description:
        'Validates that the device supports and has encryption enabled',
      category: 'security',
      validator: this.validateDeviceEncryption.bind(this),
      weight: 20,
      mandatory: true,
      weddingDayRelaxed: false, // Never relaxed due to sensitive data
      criticalForWedding: true,
    });

    this.addValidationRule({
      id: 'jailbreak-detection',
      name: 'Jailbreak/Root Detection',
      description: 'Detects if the device is jailbroken or rooted',
      category: 'security',
      validator: this.validateJailbreakRoot.bind(this),
      weight: 25,
      mandatory: true,
      weddingDayRelaxed: true,
      criticalForWedding: false,
    });

    this.addValidationRule({
      id: 'screen-lock',
      name: 'Screen Lock Validation',
      description: 'Ensures device has screen lock enabled',
      category: 'security',
      validator: this.validateScreenLock.bind(this),
      weight: 15,
      mandatory: true,
      weddingDayRelaxed: true,
      criticalForWedding: false,
    });

    this.addValidationRule({
      id: 'app-integrity',
      name: 'Application Integrity Check',
      description: 'Validates the application has not been tampered with',
      category: 'security',
      validator: this.validateAppIntegrity.bind(this),
      weight: 20,
      mandatory: true,
      weddingDayRelaxed: false,
      criticalForWedding: true,
    });

    // Wedding-Specific Rules
    this.addValidationRule({
      id: 'venue-compatibility',
      name: 'Venue Compatibility Check',
      description:
        'Ensures device works well in typical wedding venue conditions',
      category: 'wedding_specific',
      validator: this.validateVenueCompatibility.bind(this),
      weight: 10,
      mandatory: false,
      weddingDayRelaxed: false,
      criticalForWedding: true,
    });

    this.addValidationRule({
      id: 'offline-capability',
      name: 'Offline Capability Check',
      description:
        'Validates device can function offline for wedding day scenarios',
      category: 'wedding_specific',
      validator: this.validateOfflineCapability.bind(this),
      weight: 15,
      mandatory: false,
      weddingDayRelaxed: false,
      criticalForWedding: true,
    });

    // Performance Rules
    this.addValidationRule({
      id: 'performance-benchmark',
      name: 'Performance Benchmark',
      description: 'Ensures device meets minimum performance requirements',
      category: 'performance',
      validator: this.validatePerformance.bind(this),
      weight: 10,
      mandatory: false,
      weddingDayRelaxed: true,
      criticalForWedding: false,
    });

    console.log(`📋 Initialized ${this.validationRules.size} validation rules`);
  }

  /**
   * Add validation rule
   */
  private addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  /**
   * Generate device fingerprint
   */
  public async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Generate canvas fingerprint
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('WedSync Device Fingerprint 🎩', 2, 2);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Wedding Security Check', 4, 17);
      }

      const canvasFingerprint = canvas.toDataURL();

      // Generate audio fingerprint if available
      let audioFingerprint: string | undefined;
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const analyser = audioContext.createAnalyser();
        const gainNode = audioContext.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.value = 10000;
        gainNode.gain.value = 0.05;

        oscillator.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
        audioFingerprint = Array.from(frequencyData).join(',');
      } catch {
        // Audio fingerprinting not supported
      }

      const fingerprint: DeviceFingerprint = {
        deviceId: await this.generateDeviceId(),
        platform: this.detectPlatform(),
        model: this.detectDeviceModel(),
        osVersion: this.detectOSVersion(),
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        canvasFingerprint,
        audioFingerprint,
      };

      // Store fingerprint
      await this.storeFingerprint(fingerprint);

      return fingerprint;
    } catch (error) {
      console.error('Failed to generate device fingerprint:', error);
      throw error;
    }
  }

  /**
   * Validate device compliance
   */
  public async validateCompliance(
    context: ValidationContext,
  ): Promise<ComplianceValidation> {
    try {
      const deviceFingerprint = await this.generateDeviceFingerprint();
      const validationId = await this.generateValidationId();
      const checks: ComplianceCheck[] = [];

      console.log('🔍 Starting device compliance validation...');

      // Run all validation rules
      for (const rule of this.validationRules.values()) {
        try {
          const check = await rule.validator(deviceFingerprint, context);
          checks.push(check);

          console.log(
            `${check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'} ${rule.name}: ${check.status}`,
          );
        } catch (error) {
          console.error(`Validation rule ${rule.id} failed:`, error);

          // Create failed check
          const failedCheck: ComplianceCheck = {
            checkId: await this.generateCheckId(),
            name: rule.name,
            category: rule.category,
            status: 'fail',
            score: 0,
            maxScore: rule.weight,
            details: `Validation failed: ${error}`,
            weddingDayRelaxed: rule.weddingDayRelaxed,
            criticalForWedding: rule.criticalForWedding,
            remediation: 'Contact system administrator',
          };

          checks.push(failedCheck);
        }
      }

      // Calculate overall score
      const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
      const maxTotalScore = checks.reduce(
        (sum, check) => sum + check.maxScore,
        0,
      );
      const overallScore =
        maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(overallScore, checks, context);

      // Check if validation passed
      const criticalFailures = checks.filter(
        (check) =>
          check.status === 'fail' &&
          check.criticalForWedding &&
          !(context.isWeddingDay && check.weddingDayRelaxed),
      );

      const passed = criticalFailures.length === 0 && overallScore >= 70;

      // Generate warnings, errors, and recommendations
      const warnings: string[] = [];
      const errors: string[] = [];
      const recommendations: string[] = [];

      for (const check of checks) {
        if (check.status === 'warn') {
          warnings.push(`${check.name}: ${check.details}`);
          if (check.remediation) {
            recommendations.push(check.remediation);
          }
        } else if (check.status === 'fail') {
          errors.push(`${check.name}: ${check.details}`);
          if (check.remediation) {
            recommendations.push(check.remediation);
          }
        }
      }

      // Wedding day special handling
      if (context.isWeddingDay && errors.length > 0) {
        const relaxableErrors = errors.filter((_, index) => {
          const failedCheck = checks.filter((c) => c.status === 'fail')[index];
          return failedCheck?.weddingDayRelaxed;
        });

        if (relaxableErrors.length > 0) {
          warnings.push(
            'Some security requirements relaxed for wedding day operations',
          );
        }
      }

      const validation: ComplianceValidation = {
        validationId,
        deviceFingerprint,
        timestamp: new Date(),
        checks,
        overallScore,
        riskLevel,
        weddingDayContext: context.isWeddingDay,
        passed,
        warnings,
        errors,
        recommendations,
      };

      // Store validation result
      await this.storeValidation(validation);

      // Update validation history
      const deviceHistory =
        this.validationHistory.get(deviceFingerprint.deviceId) || [];
      deviceHistory.push(validation);
      this.validationHistory.set(deviceFingerprint.deviceId, deviceHistory);

      console.log(
        `🛡️ Device compliance validation complete: ${passed ? 'PASSED' : 'FAILED'} (Score: ${overallScore}/100, Risk: ${riskLevel})`,
      );

      return validation;
    } catch (error) {
      console.error('Device compliance validation failed:', error);
      throw error;
    }
  }

  /**
   * Device encryption validation
   */
  private async validateDeviceEncryption(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      // Check if Web Crypto API is available and functioning
      const cryptoAvailable = !!(window.crypto && window.crypto.subtle);

      if (!cryptoAvailable) {
        return {
          checkId: await this.generateCheckId(),
          name: 'Device Encryption Check',
          category: 'security',
          status: 'fail',
          score: 0,
          maxScore: 20,
          details:
            'Web Crypto API not available - device may not support encryption',
          weddingDayRelaxed: false,
          criticalForWedding: true,
          remediation: 'Use a device with encryption support',
        };
      }

      // Test encryption capability
      try {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt'],
        );

        const testData = new TextEncoder().encode('WedSync encryption test');
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          testData,
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          encrypted,
        );

        const decryptedText = new TextDecoder().decode(decrypted);
        const encryptionWorks = decryptedText === 'WedSync encryption test';

        return {
          checkId: await this.generateCheckId(),
          name: 'Device Encryption Check',
          category: 'security',
          status: encryptionWorks ? 'pass' : 'fail',
          score: encryptionWorks ? 20 : 0,
          maxScore: 20,
          details: encryptionWorks
            ? 'Device encryption capabilities verified'
            : 'Device encryption test failed',
          weddingDayRelaxed: false,
          criticalForWedding: true,
          remediation: encryptionWorks
            ? undefined
            : 'Check device security settings',
        };
      } catch (error) {
        return {
          checkId: await this.generateCheckId(),
          name: 'Device Encryption Check',
          category: 'security',
          status: 'fail',
          score: 0,
          maxScore: 20,
          details: `Encryption test failed: ${error}`,
          weddingDayRelaxed: false,
          criticalForWedding: true,
          remediation: 'Enable device encryption in settings',
        };
      }
    } catch (error) {
      throw new Error(`Device encryption validation failed: ${error}`);
    }
  }

  /**
   * Jailbreak/root detection validation
   */
  private async validateJailbreakRoot(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      const threats: ThreatDetection[] = [];
      let jailbrokenOrRooted = false;

      // iOS Jailbreak detection
      if (device.platform === 'ios') {
        try {
          // Check for common jailbreak URL schemes
          const jailbreakSchemes = [
            'cydia://',
            'sileo://',
            'zbra://',
            'installer://',
          ];

          for (const scheme of jailbreakSchemes) {
            try {
              const link = document.createElement('a');
              link.href = scheme;
              if (link.protocol === scheme.replace('://', ':')) {
                jailbrokenOrRooted = true;
                threats.push({
                  threatId: await this.generateThreatId(),
                  type: 'jailbreak',
                  severity: 'high',
                  detected: true,
                  confidence: 0.8,
                  details: `Jailbreak app detected: ${scheme}`,
                  timestamp: new Date(),
                });
                break;
              }
            } catch {
              // Expected for non-jailbroken devices
            }
          }

          // Check for suspicious user agent patterns
          if (
            device.userAgent.includes('Cydia') ||
            device.userAgent.includes('Sileo')
          ) {
            jailbrokenOrRooted = true;
            threats.push({
              threatId: await this.generateThreatId(),
              type: 'jailbreak',
              severity: 'high',
              detected: true,
              confidence: 0.9,
              details: 'Jailbreak indicators in user agent',
              timestamp: new Date(),
            });
          }
        } catch {
          // Detection failed, assume not jailbroken
        }
      }

      // Android root detection
      if (device.platform === 'android') {
        try {
          // Check for common root indicators in user agent
          const rootIndicators = [
            'su',
            'busybox',
            'superuser',
            'kingroot',
            'magisk',
          ];

          for (const indicator of rootIndicators) {
            if (device.userAgent.toLowerCase().includes(indicator)) {
              jailbrokenOrRooted = true;
              threats.push({
                threatId: await this.generateThreatId(),
                type: 'root',
                severity: 'high',
                detected: true,
                confidence: 0.7,
                details: `Root indicator detected: ${indicator}`,
                timestamp: new Date(),
              });
              break;
            }
          }
        } catch {
          // Detection failed, assume not rooted
        }
      }

      // Store threat detections
      if (threats.length > 0) {
        const deviceThreats = this.threatDetections.get(device.deviceId) || [];
        deviceThreats.push(...threats);
        this.threatDetections.set(device.deviceId, deviceThreats);

        // Store in IndexedDB
        for (const threat of threats) {
          await this.storeThreat(threat);
        }
      }

      const status = jailbrokenOrRooted
        ? context.isWeddingDay
          ? 'warn'
          : 'fail'
        : 'pass';

      const score = jailbrokenOrRooted ? (context.isWeddingDay ? 15 : 0) : 25;

      return {
        checkId: await this.generateCheckId(),
        name: 'Jailbreak/Root Detection',
        category: 'security',
        status,
        score,
        maxScore: 25,
        details: jailbrokenOrRooted
          ? `Device appears to be ${device.platform === 'ios' ? 'jailbroken' : 'rooted'}`
          : 'No jailbreak/root indicators detected',
        weddingDayRelaxed: true,
        criticalForWedding: false,
        remediation: jailbrokenOrRooted
          ? 'Use a non-jailbroken/non-rooted device for enhanced security'
          : undefined,
      };
    } catch (error) {
      throw new Error(`Jailbreak/root detection failed: ${error}`);
    }
  }

  /**
   * Screen lock validation
   */
  private async validateScreenLock(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      // In web environment, we can check for credential management API
      const credentialsSupported = !!navigator.credentials;
      const webAuthnSupported = !!window.PublicKeyCredential;

      let screenLockLikely = false;
      let details = '';

      if (credentialsSupported && webAuthnSupported) {
        try {
          // Check if platform authenticator is available
          const platformAuthAvailable =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

          if (platformAuthAvailable) {
            screenLockLikely = true;
            details =
              'Platform authenticator available - screen lock likely enabled';
          } else {
            details =
              'Platform authenticator not available - screen lock status unknown';
          }
        } catch {
          details = 'Unable to determine screen lock status';
        }
      } else {
        details =
          'Credential management not supported - cannot verify screen lock';
      }

      const status = screenLockLikely
        ? 'pass'
        : context.isWeddingDay
          ? 'warn'
          : 'fail';

      const score = screenLockLikely ? 15 : context.isWeddingDay ? 10 : 0;

      return {
        checkId: await this.generateCheckId(),
        name: 'Screen Lock Validation',
        category: 'security',
        status,
        score,
        maxScore: 15,
        details,
        weddingDayRelaxed: true,
        criticalForWedding: false,
        remediation: screenLockLikely
          ? undefined
          : 'Enable screen lock with PIN, password, or biometrics',
      };
    } catch (error) {
      throw new Error(`Screen lock validation failed: ${error}`);
    }
  }

  /**
   * Application integrity validation
   */
  private async validateAppIntegrity(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      // Check application version
      const expectedVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
      const versionMatch = device.appVersion === expectedVersion;

      // Check for development/debug indicators
      const isDevelopment = process.env.NODE_ENV === 'development';
      const hasDebugger = !!(window as any).console?.debug;

      // Check for tampering indicators
      let tamperingDetected = false;
      const tamperingIndicators: string[] = [];

      // Check for common debugging tools
      if ((window as any).chrome && (window as any).chrome.runtime) {
        tamperingIndicators.push('Browser extension environment detected');
      }

      // Check for development tools
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        tamperingIndicators.push('React DevTools detected');
      }

      if (tamperingIndicators.length > 0 && !isDevelopment) {
        tamperingDetected = true;
      }

      const integrityScore = versionMatch ? 20 : 0;
      const tamperingPenalty = tamperingDetected ? 10 : 0;
      const finalScore = Math.max(0, integrityScore - tamperingPenalty);

      const status =
        versionMatch && !tamperingDetected
          ? 'pass'
          : tamperingDetected
            ? 'fail'
            : 'warn';

      return {
        checkId: await this.generateCheckId(),
        name: 'Application Integrity Check',
        category: 'security',
        status,
        score: finalScore,
        maxScore: 20,
        details: [
          versionMatch
            ? 'Application version verified'
            : `Version mismatch: expected ${expectedVersion}, got ${device.appVersion}`,
          tamperingDetected
            ? `Tampering indicators: ${tamperingIndicators.join(', ')}`
            : 'No tampering detected',
        ].join('; '),
        weddingDayRelaxed: false,
        criticalForWedding: true,
        remediation:
          !versionMatch || tamperingDetected
            ? 'Update to the latest version and restart the application'
            : undefined,
      };
    } catch (error) {
      throw new Error(`Application integrity validation failed: ${error}`);
    }
  }

  /**
   * Venue compatibility validation
   */
  private async validateVenueCompatibility(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      const compatibility: string[] = [];
      let score = 0;

      // Check screen size (wedding apps need readable interfaces)
      const screenWidth = parseInt(device.screenResolution.split('x')[0]);
      const screenHeight = parseInt(device.screenResolution.split('x')[1]);

      if (screenWidth >= 375 && screenHeight >= 667) {
        // iPhone SE minimum
        compatibility.push('Screen size adequate for wedding operations');
        score += 3;
      } else {
        compatibility.push('Screen may be too small for optimal wedding use');
      }

      // Check touch capabilities
      if (device.maxTouchPoints && device.maxTouchPoints > 0) {
        compatibility.push('Touch interface available');
        score += 2;
      }

      // Check hardware capabilities
      if (device.hardwareConcurrency && device.hardwareConcurrency >= 2) {
        compatibility.push('Sufficient processing power');
        score += 2;
      }

      // Check for camera API (important for wedding documentation)
      const mediaSupported = !!navigator.mediaDevices?.getUserMedia;
      if (mediaSupported) {
        compatibility.push('Camera access supported');
        score += 3;
      } else {
        compatibility.push('Camera access may be limited');
      }

      const status = score >= 7 ? 'pass' : score >= 5 ? 'warn' : 'fail';

      return {
        checkId: await this.generateCheckId(),
        name: 'Venue Compatibility Check',
        category: 'wedding_specific',
        status,
        score,
        maxScore: 10,
        details: compatibility.join('; '),
        weddingDayRelaxed: false,
        criticalForWedding: true,
        remediation:
          score < 7
            ? 'Consider using a device with better specifications for wedding operations'
            : undefined,
      };
    } catch (error) {
      throw new Error(`Venue compatibility validation failed: ${error}`);
    }
  }

  /**
   * Offline capability validation
   */
  private async validateOfflineCapability(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      const capabilities: string[] = [];
      let score = 0;

      // Check Service Worker support
      const serviceWorkerSupported = 'serviceWorker' in navigator;
      if (serviceWorkerSupported) {
        capabilities.push('Service Worker supported');
        score += 5;
      } else {
        capabilities.push(
          'Service Worker not supported - limited offline capability',
        );
      }

      // Check IndexedDB support
      const indexedDBSupported = 'indexedDB' in window;
      if (indexedDBSupported) {
        capabilities.push('Local database supported');
        score += 3;
      } else {
        capabilities.push('Local database not supported');
      }

      // Check LocalStorage support
      const localStorageSupported = 'localStorage' in window;
      if (localStorageSupported) {
        capabilities.push('Local storage available');
        score += 2;
      }

      // Check Cache API support
      const cacheSupported = 'caches' in window;
      if (cacheSupported) {
        capabilities.push('Cache API supported');
        score += 3;
      }

      // Check Background Sync support
      const backgroundSyncSupported =
        'serviceWorker' in navigator &&
        'sync' in window.ServiceWorkerRegistration.prototype;
      if (backgroundSyncSupported) {
        capabilities.push('Background sync supported');
        score += 2;
      }

      const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';

      return {
        checkId: await this.generateCheckId(),
        name: 'Offline Capability Check',
        category: 'wedding_specific',
        status,
        score,
        maxScore: 15,
        details: capabilities.join('; '),
        weddingDayRelaxed: false,
        criticalForWedding: true,
        remediation:
          score < 12
            ? 'Update browser or use a device with better offline capabilities'
            : undefined,
      };
    } catch (error) {
      throw new Error(`Offline capability validation failed: ${error}`);
    }
  }

  /**
   * Performance validation
   */
  private async validatePerformance(
    device: DeviceFingerprint,
    context: ValidationContext,
  ): Promise<ComplianceCheck> {
    try {
      const metrics = await this.measurePerformance();
      const performance: string[] = [];
      let score = 0;

      // Check memory usage
      if (metrics.memoryUsage < 100 * 1024 * 1024) {
        // 100MB
        performance.push('Memory usage acceptable');
        score += 3;
      } else {
        performance.push('High memory usage detected');
      }

      // Check load time
      if (metrics.loadTime < 3000) {
        // 3 seconds
        performance.push('Fast load time');
        score += 3;
      } else {
        performance.push('Slow load time detected');
      }

      // Check render time
      if (metrics.renderTime < 1000) {
        // 1 second
        performance.push('Fast rendering');
        score += 2;
      }

      // Check hardware concurrency
      if (device.hardwareConcurrency && device.hardwareConcurrency >= 4) {
        performance.push('Multi-core processor available');
        score += 2;
      }

      const status = score >= 7 ? 'pass' : score >= 5 ? 'warn' : 'fail';

      return {
        checkId: await this.generateCheckId(),
        name: 'Performance Benchmark',
        category: 'performance',
        status,
        score,
        maxScore: 10,
        details: performance.join('; '),
        weddingDayRelaxed: true,
        criticalForWedding: false,
        remediation:
          score < 7
            ? 'Close other applications and ensure device has sufficient resources'
            : undefined,
      };
    } catch (error) {
      throw new Error(`Performance validation failed: ${error}`);
    }
  }

  /**
   * Helper methods
   */

  private async generateDeviceId(): Promise<string> {
    // Use existing fingerprint if available
    const stored = localStorage.getItem('wedSyncDeviceId');
    if (stored) return stored;

    // Generate new device ID
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const deviceId =
      'wedsync_device_' +
      Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');

    localStorage.setItem('wedSyncDeviceId', deviceId);
    return deviceId;
  }

  private detectPlatform(): DeviceFingerprint['platform'] {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    } else if (userAgent.includes('android')) {
      return 'android';
    } else {
      return 'web';
    }
  }

  private detectDeviceModel(): string {
    const userAgent = navigator.userAgent;

    // iOS device model detection
    if (/iPhone/.test(userAgent)) {
      return userAgent.match(/iPhone[^;]*/)?.[0] || 'iPhone';
    } else if (/iPad/.test(userAgent)) {
      return userAgent.match(/iPad[^;]*/)?.[0] || 'iPad';
    } else if (/Android/.test(userAgent)) {
      return userAgent.match(/Android[^;]*/)?.[0] || 'Android Device';
    }

    return 'Web Browser';
  }

  private detectOSVersion(): string {
    const userAgent = navigator.userAgent;

    // iOS version
    const iosMatch = userAgent.match(/OS (\d+_\d+)/);
    if (iosMatch) {
      return iosMatch[1].replace('_', '.');
    }

    // Android version
    const androidMatch = userAgent.match(/Android (\d+\.?\d*)/);
    if (androidMatch) {
      return androidMatch[1];
    }

    return 'Unknown';
  }

  private calculateRiskLevel(
    score: number,
    checks: ComplianceCheck[],
    context: ValidationContext,
  ): ComplianceValidation['riskLevel'] {
    const criticalFailures = checks.filter(
      (c) => c.status === 'fail' && c.category === 'security',
    ).length;

    if (criticalFailures > 2 || score < 40) {
      return 'critical';
    } else if (criticalFailures > 0 || score < 60) {
      return 'high';
    } else if (score < 80) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async measurePerformance(): Promise<PerformanceMetrics> {
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    // Get memory info if available
    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize || 0;
    }

    return {
      loadTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
      renderTime:
        navigation?.domContentLoadedEventEnd -
          navigation?.domContentLoadedEventStart || 0,
      memoryUsage,
      cpuUsage: 0, // Not available in web
      networkLatency: navigation?.responseStart - navigation?.requestStart || 0,
      storageUsage: 0, // Would need to calculate
      batteryLevel: await this.getBatteryLevel(),
    };
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      // Battery API not available
    }
    return undefined;
  }

  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          // Process performance entries for ongoing monitoring
        });

        this.performanceObserver.observe({
          entryTypes: ['navigation', 'measure', 'mark'],
        });
      } catch {
        // Performance Observer not supported
      }
    }
  }

  private async generateValidationId(): Promise<string> {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return (
      'validation_' +
      Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    );
  }

  private async generateCheckId(): Promise<string> {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    return (
      'check_' +
      Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    );
  }

  private async generateThreatId(): Promise<string> {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    return (
      'threat_' +
      Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    );
  }

  private async storeFingerprint(
    fingerprint: DeviceFingerprint,
  ): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['fingerprints'],
        'readwrite',
      );
      const store = transaction.objectStore('fingerprints');
      await store.put(fingerprint);
    } catch (error) {
      console.error('Failed to store fingerprint:', error);
    }
  }

  private async storeValidation(
    validation: ComplianceValidation,
  ): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['validations'],
        'readwrite',
      );
      const store = transaction.objectStore('validations');
      await store.put({
        ...validation,
        timestamp: validation.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Failed to store validation:', error);
    }
  }

  private async storeThreat(threat: ThreatDetection): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['threats'],
        'readwrite',
      );
      const store = transaction.objectStore('threats');
      await store.put({
        ...threat,
        timestamp: threat.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Failed to store threat:', error);
    }
  }

  /**
   * Public API methods
   */

  public getValidationHistory(deviceId: string): ComplianceValidation[] {
    return this.validationHistory.get(deviceId) || [];
  }

  public getThreatHistory(deviceId: string): ThreatDetection[] {
    return this.threatDetections.get(deviceId) || [];
  }

  public async getStoredValidations(
    limit = 10,
  ): Promise<ComplianceValidation[]> {
    if (!this.secureStorage) return [];

    try {
      const transaction = this.secureStorage.transaction(
        ['validations'],
        'readonly',
      );
      const store = transaction.objectStore('validations');
      const index = store.index('timestamp');

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev');
        const results: ComplianceValidation[] = [];
        let count = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && count < limit) {
            const validation = {
              ...cursor.value,
              timestamp: new Date(cursor.value.timestamp),
            };
            results.push(validation);
            count++;
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get stored validations:', error);
      return [];
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.performanceObserver) {
        this.performanceObserver.disconnect();
        this.performanceObserver = null;
      }

      this.validationHistory.clear();
      this.threatDetections.clear();

      if (this.secureStorage) {
        this.secureStorage.close();
        this.secureStorage = null;
      }

      console.log('🛡️ DeviceComplianceValidator cleanup complete');
    } catch (error) {
      console.error('Error during validator cleanup:', error);
    }
  }
}

export default DeviceComplianceValidator;
export type {
  DeviceFingerprint,
  ComplianceValidation,
  ComplianceCheck,
  ValidationRule,
  ValidationContext,
  ThreatDetection,
  PerformanceMetrics,
};
