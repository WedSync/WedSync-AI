/**
 * Mobile Device Security and Encryption Service
 * Handles device security verification, encryption requirements, and remote security controls
 */

export interface DeviceSecurityInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  securityLevel: 'high' | 'medium' | 'low';
  encryptionSupported: boolean;
  biometricAvailable: boolean;
  screenLockEnabled: boolean;
  jailbroken: boolean;
  osVersion: string;
  lastSecurityCheck: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  level: DeviceSecurityInfo['securityLevel'];
  warnings: Array<{
    type:
      | 'encryption'
      | 'screenlock'
      | 'jailbreak'
      | 'outdated'
      | 'insecure_network';
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  requirements: {
    encryptionRequired: boolean;
    screenLockRequired: boolean;
    biometricPreferred: boolean;
    secureNetworkRequired: boolean;
  };
}

export interface RemoteWipeConfig {
  enabled: boolean;
  triggeredBy: 'admin' | 'user' | 'policy';
  timestamp: string;
  scope: 'full_device' | 'app_data' | 'portfolio_cache';
  confirmationRequired: boolean;
}

class DeviceSecurityService {
  private deviceInfo: DeviceSecurityInfo | null = null;
  private securityPolicies: Map<string, any> = new Map();
  private remoteWipeEnabled: boolean = false;

  constructor() {
    this.initializeSecurityPolicies();
  }

  /**
   * Initialize security policies
   */
  private initializeSecurityPolicies(): void {
    const policies = {
      minimum_os_versions: {
        ios: '14.0',
        android: '10.0',
      },
      encryption_requirements: {
        portfolio_cache: true,
        client_data: true,
        location_data: true,
        session_tokens: true,
      },
      session_security: {
        max_session_duration: 24 * 60 * 60 * 1000, // 24 hours
        idle_timeout: 30 * 60 * 1000, // 30 minutes
        concurrent_sessions_limit: 3,
      },
      network_security: {
        allow_public_wifi: false,
        require_vpn: true,
        min_tls_version: '1.3',
      },
    };

    Object.entries(policies).forEach(([key, value]) => {
      this.securityPolicies.set(key, value);
    });
  }

  /**
   * Perform comprehensive device security check
   */
  async performSecurityCheck(): Promise<SecurityCheckResult> {
    try {
      this.deviceInfo = await this.collectDeviceInfo();

      const warnings: SecurityCheckResult['warnings'] = [];
      let securityLevel: DeviceSecurityInfo['securityLevel'] = 'high';

      // Check OS version
      if (!this.isOSVersionSupported(this.deviceInfo)) {
        warnings.push({
          type: 'outdated',
          message: 'Device OS version is outdated',
          severity: 'high',
          recommendation:
            'Update your device OS to the latest version for security',
        });
        securityLevel = 'medium';
      }

      // Check encryption support
      if (!this.deviceInfo.encryptionSupported) {
        warnings.push({
          type: 'encryption',
          message: 'Device encryption is not available',
          severity: 'critical',
          recommendation: 'Use a device that supports full-disk encryption',
        });
        securityLevel = 'low';
      }

      // Check screen lock
      if (!this.deviceInfo.screenLockEnabled) {
        warnings.push({
          type: 'screenlock',
          message: 'Screen lock is not enabled',
          severity: 'high',
          recommendation:
            'Enable screen lock with PIN, pattern, or biometric authentication',
        });
        securityLevel = Math.min(securityLevel, 'medium') as any;
      }

      // Check for jailbreak/root
      if (this.deviceInfo.jailbroken) {
        warnings.push({
          type: 'jailbreak',
          message: 'Device appears to be jailbroken/rooted',
          severity: 'critical',
          recommendation:
            'Use a non-jailbroken device for accessing sensitive wedding data',
        });
        securityLevel = 'low';
      }

      // Check network security
      const networkSecurity = await this.checkNetworkSecurity();
      if (!networkSecurity.secure) {
        warnings.push({
          type: 'insecure_network',
          message: 'Connected to potentially insecure network',
          severity: 'medium',
          recommendation:
            'Connect to a secure network or enable VPN protection',
        });
      }

      const passed =
        securityLevel !== 'low' &&
        warnings.filter((w) => w.severity === 'critical').length === 0;

      return {
        passed,
        level: securityLevel,
        warnings,
        requirements: {
          encryptionRequired: true,
          screenLockRequired: true,
          biometricPreferred: true,
          secureNetworkRequired: !networkSecurity.secure,
        },
      };
    } catch (error) {
      console.error('Security check failed:', error);

      return {
        passed: false,
        level: 'low',
        warnings: [
          {
            type: 'encryption',
            message: 'Unable to verify device security',
            severity: 'critical',
            recommendation: 'Ensure device supports security verification APIs',
          },
        ],
        requirements: {
          encryptionRequired: true,
          screenLockRequired: true,
          biometricPreferred: true,
          secureNetworkRequired: true,
        },
      };
    }
  }

  /**
   * Collect device information for security assessment
   */
  private async collectDeviceInfo(): Promise<DeviceSecurityInfo> {
    const userAgent = navigator.userAgent;
    const platform = this.detectPlatform(userAgent);
    const deviceId = await this.generateDeviceFingerprint();

    return {
      deviceId,
      platform,
      securityLevel: 'medium', // Will be determined by security check
      encryptionSupported: await this.checkEncryptionSupport(),
      biometricAvailable: await this.checkBiometricAvailability(),
      screenLockEnabled: await this.checkScreenLockStatus(),
      jailbroken: this.detectJailbreak(userAgent),
      osVersion: this.extractOSVersion(userAgent),
      lastSecurityCheck: new Date().toISOString(),
    };
  }

  /**
   * Detect device platform
   */
  private detectPlatform(userAgent: string): DeviceSecurityInfo['platform'] {
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return 'ios';
    } else if (/Android/.test(userAgent)) {
      return 'android';
    } else {
      return 'web';
    }
  }

  /**
   * Generate device fingerprint for identification
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('WedSync Security Check', 10, 50);
    const canvasFingerprint = canvas.toDataURL();

    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      canvas: canvasFingerprint,
      webgl: this.getWebGLFingerprint(),
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fingerprint));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32);
  }

  /**
   * Get WebGL fingerprint for device identification
   */
  private getWebGLFingerprint(): string {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'no-webgl';

    return [
      gl.getParameter(gl.VENDOR),
      gl.getParameter(gl.RENDERER),
      gl.getParameter(gl.VERSION),
    ].join('|');
  }

  /**
   * Check if device supports encryption
   */
  private async checkEncryptionSupport(): Promise<boolean> {
    try {
      // Check if Web Crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        return false;
      }

      // Test crypto operations
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      const testData = new TextEncoder().encode('test');
      const iv = crypto.getRandomValues(new Uint8Array(12));

      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, testData);

      return true;
    } catch (error) {
      console.warn('Encryption support check failed:', error);
      return false;
    }
  }

  /**
   * Check biometric availability
   */
  private async checkBiometricAvailability(): Promise<boolean> {
    try {
      // Check for WebAuthn API (modern biometric authentication)
      if (window.PublicKeyCredential) {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      }

      // Fallback checks for mobile platforms
      const userAgent = navigator.userAgent;

      // iOS Touch ID / Face ID detection
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        return /OS (11_|12_|13_|14_|15_|16_|17_|18_)/.test(userAgent);
      }

      // Android fingerprint detection
      if (/Android/.test(userAgent)) {
        return /Android [6-9]|Android 1[0-9]/.test(userAgent);
      }

      return false;
    } catch (error) {
      console.warn('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Check screen lock status (limited detection)
   */
  private async checkScreenLockStatus(): Promise<boolean> {
    try {
      // This is limited in web environment, but we can make educated guesses

      // Check if user gesture is required (indication of security)
      const hasUserGesture =
        document.hasStoredUserActivation ||
        document.userActivation?.hasBeenActive;

      // Check for secure context (HTTPS required for security features)
      const isSecureContext = window.isSecureContext;

      // Basic assumption: secure context + user gesture suggests security measures
      return isSecureContext && hasUserGesture !== false;
    } catch (error) {
      console.warn('Screen lock check failed:', error);
      return false; // Conservative assumption
    }
  }

  /**
   * Detect jailbreak/root (basic detection)
   */
  private detectJailbreak(userAgent: string): boolean {
    // Basic user agent based detection (not foolproof)
    const jailbreakIndicators = [
      /Cydia/i,
      /substrate/i,
      /root/i,
      /mobile substrate/i,
    ];

    return jailbreakIndicators.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Extract OS version from user agent
   */
  private extractOSVersion(userAgent: string): string {
    let version = 'unknown';

    // iOS version extraction
    const iosMatch = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (iosMatch) {
      version = `${iosMatch[1]}.${iosMatch[2]}${iosMatch[3] ? '.' + iosMatch[3] : ''}`;
    }

    // Android version extraction
    const androidMatch = userAgent.match(/Android (\d+\.?\d*\.?\d*)/);
    if (androidMatch) {
      version = androidMatch[1];
    }

    return version;
  }

  /**
   * Check if OS version meets minimum requirements
   */
  private isOSVersionSupported(deviceInfo: DeviceSecurityInfo): boolean {
    const minVersions = this.securityPolicies.get('minimum_os_versions');

    if (!minVersions) return true;

    const minVersion = minVersions[deviceInfo.platform];
    if (!minVersion) return true;

    return this.compareVersions(deviceInfo.osVersion, minVersion) >= 0;
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    const maxLength = Math.max(v1parts.length, v2parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }

    return 0;
  }

  /**
   * Check network security
   */
  private async checkNetworkSecurity(): Promise<{
    secure: boolean;
    details: any;
  }> {
    try {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      const details = {
        https: window.location.protocol === 'https:',
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || null,
      };

      // Basic security check
      const secure =
        details.https &&
        (details.connectionType !== 'wifi' ||
          details.connectionType === 'cellular');

      return { secure, details };
    } catch (error) {
      console.warn('Network security check failed:', error);
      return {
        secure: window.location.protocol === 'https:',
        details: { https: window.location.protocol === 'https:' },
      };
    }
  }

  /**
   * Enable remote wipe capability
   */
  async enableRemoteWipe(
    config: Partial<RemoteWipeConfig> = {},
  ): Promise<boolean> {
    try {
      const wipeConfig: RemoteWipeConfig = {
        enabled: true,
        triggeredBy: config.triggeredBy || 'admin',
        timestamp: new Date().toISOString(),
        scope: config.scope || 'app_data',
        confirmationRequired: config.confirmationRequired ?? true,
        ...config,
      };

      // Store configuration securely
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.postMessage({
          type: 'CONFIGURE_REMOTE_WIPE',
          config: wipeConfig,
        });
      }

      this.remoteWipeEnabled = true;
      return true;
    } catch (error) {
      console.error('Failed to enable remote wipe:', error);
      return false;
    }
  }

  /**
   * Execute remote wipe
   */
  async executeRemoteWipe(
    scope: RemoteWipeConfig['scope'] = 'app_data',
  ): Promise<boolean> {
    try {
      if (!this.remoteWipeEnabled) {
        throw new Error('Remote wipe is not enabled');
      }

      switch (scope) {
        case 'portfolio_cache':
          await this.wipePortfolioCache();
          break;
        case 'app_data':
          await this.wipeAppData();
          break;
        case 'full_device':
          // This cannot be implemented in web context
          console.warn('Full device wipe not available in web context');
          await this.wipeAppData();
          break;
      }

      // Log the wipe action
      console.log(
        `Remote wipe executed: ${scope} at ${new Date().toISOString()}`,
      );
      return true;
    } catch (error) {
      console.error('Remote wipe failed:', error);
      return false;
    }
  }

  /**
   * Wipe portfolio cache
   */
  private async wipePortfolioCache(): Promise<void> {
    try {
      // Clear IndexedDB portfolio data
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name?.includes('portfolio') || db.name?.includes('wedsync')) {
          const deleteReq = indexedDB.deleteDatabase(db.name);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve(void 0);
            deleteReq.onerror = () => reject(deleteReq.error);
          });
        }
      }

      // Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(
              (name) => name.includes('portfolio') || name.includes('wedsync'),
            )
            .map((name) => caches.delete(name)),
        );
      }

      // Clear relevant localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('portfolio') || key.includes('wedsync'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to wipe portfolio cache:', error);
      throw error;
    }
  }

  /**
   * Wipe all app data
   */
  private async wipeAppData(): Promise<void> {
    try {
      // Clear all IndexedDB
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          const deleteReq = indexedDB.deleteDatabase(db.name);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve(void 0);
            deleteReq.onerror = () => reject(deleteReq.error);
          });
        }
      }

      // Clear all cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
      }
    } catch (error) {
      console.error('Failed to wipe app data:', error);
      throw error;
    }
  }

  /**
   * Get current device security info
   */
  getDeviceInfo(): DeviceSecurityInfo | null {
    return this.deviceInfo;
  }

  /**
   * Check if remote wipe is enabled
   */
  isRemoteWipeEnabled(): boolean {
    return this.remoteWipeEnabled;
  }
}

// Singleton instance
export const deviceSecurityService = new DeviceSecurityService();

// Export types
export type { DeviceSecurityInfo, SecurityCheckResult, RemoteWipeConfig };
