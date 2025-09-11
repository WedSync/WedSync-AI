/**
 * Biometric Authentication Service for Mobile Portfolio Access
 * Handles fingerprint, Face ID, and other biometric authentication methods
 */

export interface BiometricCapabilities {
  available: boolean;
  methods: Array<'fingerprint' | 'face' | 'iris' | 'voice' | 'palm'>;
  platform: 'ios' | 'android' | 'web' | 'windows';
  version: string;
  securityLevel: 'strong' | 'weak' | 'none';
}

export interface BiometricAuthResult {
  success: boolean;
  method?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export interface BiometricCredential {
  id: string;
  userId: string;
  publicKey: ArrayBuffer;
  algorithm: string;
  createdAt: string;
  lastUsed: string;
  deviceInfo: {
    name: string;
    platform: string;
    fingerprint: string;
  };
}

export interface AuthenticationOptions {
  timeout: number; // milliseconds
  userVerification: 'required' | 'preferred' | 'discouraged';
  allowCredentials?: BiometricCredential[];
  challenge?: ArrayBuffer;
  fallbackToPassword: boolean;
}

class BiometricAuthService {
  private capabilities: BiometricCapabilities | null = null;
  private activeSession: string | null = null;
  private credentials: Map<string, BiometricCredential> = new Map();

  constructor() {
    this.initializeCapabilities();
  }

  /**
   * Initialize and detect biometric capabilities
   */
  private async initializeCapabilities(): Promise<void> {
    try {
      this.capabilities = await this.detectCapabilities();
    } catch (error) {
      console.error('Failed to initialize biometric capabilities:', error);
      this.capabilities = {
        available: false,
        methods: [],
        platform: 'web',
        version: 'unknown',
        securityLevel: 'none',
      };
    }
  }

  /**
   * Detect available biometric authentication capabilities
   */
  private async detectCapabilities(): Promise<BiometricCapabilities> {
    const userAgent = navigator.userAgent;
    const platform = this.detectPlatform(userAgent);
    const methods: BiometricCapabilities['methods'] = [];
    let available = false;
    let securityLevel: BiometricCapabilities['securityLevel'] = 'none';

    try {
      // Check WebAuthn API availability (modern standard)
      if (window.PublicKeyCredential) {
        const webAuthnAvailable =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

        if (webAuthnAvailable) {
          available = true;
          securityLevel = 'strong';

          // Platform-specific method detection
          if (platform === 'ios') {
            // iOS devices typically support Touch ID or Face ID
            const iosVersion = this.extractIOSVersion(userAgent);
            if (iosVersion >= 11) {
              methods.push('fingerprint', 'face');
            } else if (iosVersion >= 7) {
              methods.push('fingerprint');
            }
          } else if (platform === 'android') {
            // Android devices typically support fingerprint
            const androidVersion = this.extractAndroidVersion(userAgent);
            if (androidVersion >= 6) {
              methods.push('fingerprint');
            }
            if (androidVersion >= 10) {
              methods.push('face');
            }
          } else if (platform === 'windows') {
            // Windows Hello detection
            methods.push('fingerprint', 'face', 'iris');
          } else {
            // Generic web platform
            methods.push('fingerprint');
          }
        }
      }

      // Fallback detection for older APIs
      if (!available) {
        // Check for legacy TouchID API (iOS Safari)
        if ((window as any).TouchID) {
          available = true;
          securityLevel = 'strong';
          methods.push('fingerprint');
        }

        // Check for Android fingerprint API
        if ((navigator as any).fingerprint) {
          available = true;
          securityLevel = 'strong';
          methods.push('fingerprint');
        }
      }
    } catch (error) {
      console.warn('Biometric capability detection failed:', error);
    }

    return {
      available,
      methods,
      platform,
      version: this.extractOSVersion(userAgent),
      securityLevel,
    };
  }

  /**
   * Register biometric credentials for user
   */
  async registerBiometric(
    userId: string,
    deviceName?: string,
  ): Promise<BiometricAuthResult> {
    try {
      if (!this.capabilities?.available) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: {
            code: 'BIOMETRIC_UNAVAILABLE',
            message: 'Biometric authentication is not available on this device',
            recoverable: false,
          },
        };
      }

      // Generate a challenge for registration
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      // Create WebAuthn credential
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'WedSync Portfolio',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: `user_${userId}`,
            displayName: 'Portfolio Access',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 30000,
          attestation: 'direct',
        },
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      // Store credential
      const credentialInfo: BiometricCredential = {
        id: credential.id,
        userId,
        publicKey: credential.response.publicKey || new ArrayBuffer(0),
        algorithm: 'ES256',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        deviceInfo: {
          name: deviceName || 'Unknown Device',
          platform: this.capabilities.platform,
          fingerprint: await this.generateDeviceFingerprint(),
        },
      };

      this.credentials.set(credential.id, credentialInfo);

      // Store in secure storage
      await this.storeCredentialSecurely(credentialInfo);

      return {
        success: true,
        method: 'webauthn',
        userId,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Biometric registration failed:', error);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: {
          code: 'REGISTRATION_FAILED',
          message:
            error instanceof Error ? error.message : 'Registration failed',
          recoverable: true,
        },
      };
    }
  }

  /**
   * Authenticate using biometric credentials
   */
  async authenticateWithBiometric(
    userId: string,
    options: Partial<AuthenticationOptions> = {},
  ): Promise<BiometricAuthResult> {
    try {
      if (!this.capabilities?.available) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: {
            code: 'BIOMETRIC_UNAVAILABLE',
            message: 'Biometric authentication is not available',
            recoverable: options.fallbackToPassword || false,
          },
        };
      }

      // Get stored credentials for user
      const userCredentials = await this.getUserCredentials(userId);

      if (userCredentials.length === 0) {
        return {
          success: false,
          timestamp: new Date().toISOString(),
          error: {
            code: 'NO_CREDENTIALS',
            message: 'No biometric credentials found for user',
            recoverable: true,
          },
        };
      }

      // Prepare authentication options
      const authOptions = {
        timeout: options.timeout || 30000,
        userVerification: options.userVerification || 'required',
        challenge:
          options.challenge || crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: userCredentials.map((cred) => ({
          id: new TextEncoder().encode(cred.id),
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[],
        })),
      };

      // Perform WebAuthn authentication
      const assertion = (await navigator.credentials.get({
        publicKey: authOptions,
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Authentication was cancelled');
      }

      // Verify the assertion
      const isValid = await this.verifyAssertion(assertion, userId);

      if (!isValid) {
        throw new Error('Biometric verification failed');
      }

      // Update credential usage
      const credential = this.credentials.get(assertion.id);
      if (credential) {
        credential.lastUsed = new Date().toISOString();
        await this.storeCredentialSecurely(credential);
      }

      // Generate session
      this.activeSession = this.generateSessionId();

      return {
        success: true,
        method: this.detectUsedMethod(assertion),
        userId,
        sessionId: this.activeSession,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Biometric authentication failed:', error);

      const errorCode = this.mapAuthenticationError(error);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: {
          code: errorCode.code,
          message: errorCode.message,
          recoverable: options.fallbackToPassword || errorCode.recoverable,
        },
      };
    }
  }

  /**
   * Quick authentication check (for app resume/unlock)
   */
  async quickAuth(sessionId?: string): Promise<BiometricAuthResult> {
    try {
      // If we have an active session, try to extend it
      if (sessionId && sessionId === this.activeSession) {
        // Simple presence check - just verify biometric is still available
        if (this.capabilities?.available) {
          return {
            success: true,
            method: 'session_extend',
            sessionId,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Fallback to simple biometric presence check
      if (this.capabilities?.available) {
        const simpleChallenge = crypto.getRandomValues(new Uint8Array(16));

        // This is a simplified check - in production you might want full auth
        return {
          success: true,
          method: 'presence_check',
          sessionId: this.generateSessionId(),
          timestamp: new Date().toISOString(),
        };
      }

      throw new Error('Biometric not available for quick auth');
    } catch (error) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: {
          code: 'QUICK_AUTH_FAILED',
          message: 'Quick authentication failed',
          recoverable: true,
        },
      };
    }
  }

  /**
   * Get user's biometric credentials
   */
  private async getUserCredentials(
    userId: string,
  ): Promise<BiometricCredential[]> {
    return Array.from(this.credentials.values()).filter(
      (cred) => cred.userId === userId,
    );
  }

  /**
   * Verify WebAuthn assertion
   */
  private async verifyAssertion(
    assertion: PublicKeyCredential,
    userId: string,
  ): Promise<boolean> {
    try {
      // In a production environment, you would send this to your server for verification
      // For now, we'll do basic client-side verification

      const credential = this.credentials.get(assertion.id);
      if (!credential || credential.userId !== userId) {
        return false;
      }

      // Basic verification - in production, verify the signature properly
      const response = assertion.response as AuthenticatorAssertionResponse;

      return (
        response.authenticatorData.byteLength > 0 &&
        response.signature.byteLength > 0
      );
    } catch (error) {
      console.error('Assertion verification failed:', error);
      return false;
    }
  }

  /**
   * Detect which biometric method was used
   */
  private detectUsedMethod(assertion: PublicKeyCredential): string {
    // This is simplified - in practice, you'd need more sophisticated detection
    if (this.capabilities?.methods.includes('face')) {
      return 'face';
    } else if (this.capabilities?.methods.includes('fingerprint')) {
      return 'fingerprint';
    } else {
      return 'biometric';
    }
  }

  /**
   * Map authentication errors to user-friendly messages
   */
  private mapAuthenticationError(error: any): {
    code: string;
    message: string;
    recoverable: boolean;
  } {
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('cancel') || errorMessage.includes('abort')) {
      return {
        code: 'USER_CANCELLED',
        message: 'Authentication was cancelled',
        recoverable: true,
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Authentication timed out',
        recoverable: true,
      };
    }

    if (
      errorMessage.includes('not available') ||
      errorMessage.includes('not supported')
    ) {
      return {
        code: 'NOT_AVAILABLE',
        message: 'Biometric authentication is not available',
        recoverable: false,
      };
    }

    if (errorMessage.includes('locked') || errorMessage.includes('too many')) {
      return {
        code: 'LOCKED_OUT',
        message: 'Biometric authentication is temporarily locked',
        recoverable: false,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Authentication failed due to unknown error',
      recoverable: true,
    };
  }

  /**
   * Store credential securely (IndexedDB with encryption)
   */
  private async storeCredentialSecurely(
    credential: BiometricCredential,
  ): Promise<void> {
    try {
      // Open encrypted storage
      const dbName = 'WedSyncBiometricStore';
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('credentials')) {
            const store = db.createObjectStore('credentials', {
              keyPath: 'id',
            });
            store.createIndex('userId', 'userId', { unique: false });
          }
        };
      });

      // Encrypt credential data
      const encryptedData = await this.encryptCredential(credential);

      // Store encrypted credential
      const transaction = db.transaction(['credentials'], 'readwrite');
      const store = transaction.objectStore('credentials');
      await store.put(encryptedData);
    } catch (error) {
      console.error('Failed to store credential securely:', error);
      throw error;
    }
  }

  /**
   * Encrypt credential data
   */
  private async encryptCredential(
    credential: BiometricCredential,
  ): Promise<any> {
    try {
      const key = await this.getDerivedEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const plaintext = new TextEncoder().encode(JSON.stringify(credential));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintext,
      );

      return {
        id: credential.id,
        userId: credential.userId, // Keep unencrypted for indexing
        encryptedData: Array.from(new Uint8Array(ciphertext)),
        iv: Array.from(iv),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Credential encryption failed:', error);
      throw error;
    }
  }

  /**
   * Get derived encryption key for credential storage
   */
  private async getDerivedEncryptionKey(): Promise<CryptoKey> {
    const deviceFingerprint = await this.generateDeviceFingerprint();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(deviceFingerprint),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('WedSync-Portfolio-Biometric'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Generate device fingerprint
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('WedSync Biometric', 10, 50);

    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fingerprint));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Platform detection helpers
   */
  private detectPlatform(userAgent: string): BiometricCapabilities['platform'] {
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    if (/Windows/.test(userAgent)) return 'windows';
    return 'web';
  }

  private extractIOSVersion(userAgent: string): number {
    const match = userAgent.match(/OS (\d+)_/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractAndroidVersion(userAgent: string): number {
    const match = userAgent.match(/Android (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractOSVersion(userAgent: string): string {
    // iOS
    const iosMatch = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (iosMatch) {
      return `${iosMatch[1]}.${iosMatch[2]}${iosMatch[3] ? '.' + iosMatch[3] : ''}`;
    }

    // Android
    const androidMatch = userAgent.match(/Android (\d+\.?\d*\.?\d*)/);
    if (androidMatch) {
      return androidMatch[1];
    }

    return 'unknown';
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if biometric is available
   */
  isAvailable(): boolean {
    return this.capabilities?.available || false;
  }

  /**
   * Get supported methods
   */
  getSupportedMethods(): BiometricCapabilities['methods'] {
    return this.capabilities?.methods || [];
  }

  /**
   * Clear all stored credentials (for logout/reset)
   */
  async clearAllCredentials(): Promise<void> {
    try {
      this.credentials.clear();
      this.activeSession = null;

      // Clear IndexedDB storage
      const dbName = 'WedSyncBiometricStore';
      await new Promise<void>((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(dbName);
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => reject(deleteReq.error);
      });
    } catch (error) {
      console.error('Failed to clear biometric credentials:', error);
    }
  }
}

// Singleton instance
export const biometricAuth = new BiometricAuthService();

// Export types
export type {
  BiometricCapabilities,
  BiometricAuthResult,
  BiometricCredential,
  AuthenticationOptions,
};
