'use client';

/**
 * Mobile Offline Security Service
 * Handles encryption, biometric authentication, and secure storage for mobile offline functionality
 */

export interface BiometricOptions {
  reason?: string;
  fallbackTitle?: string;
  deviceCredentialAllowed?: boolean;
}

export interface EncryptionKey {
  key: CryptoKey;
  iv: Uint8Array;
  salt: Uint8Array;
}

export interface SecureStorageItem {
  id: string;
  data: any;
  timestamp: Date;
  encrypted: boolean;
}

export class MobileOfflineSecurity {
  private static instance: MobileOfflineSecurity;
  private masterKey: CryptoKey | null = null;
  private biometricSupported = false;
  private deviceLockEnabled = false;

  private constructor() {
    this.initializeSecurity();
  }

  static getInstance(): MobileOfflineSecurity {
    if (!MobileOfflineSecurity.instance) {
      MobileOfflineSecurity.instance = new MobileOfflineSecurity();
    }
    return MobileOfflineSecurity.instance;
  }

  private async initializeSecurity(): Promise<void> {
    // Check for biometric support
    this.biometricSupported = await this.checkBiometricSupport();

    // Initialize master encryption key
    await this.initializeMasterKey();

    // Check device security settings
    this.deviceLockEnabled = await this.checkDeviceLock();
  }

  // Biometric Authentication
  private async checkBiometricSupport(): Promise<boolean> {
    try {
      // Check for WebAuthn support (closest to biometrics on web)
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        return true;
      }

      // Check for Touch ID/Face ID on iOS Safari
      if (
        'ontouchstart' in window &&
        /iPad|iPhone|iPod/.test(navigator.userAgent)
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Biometric check failed:', error);
      return false;
    }
  }

  async authenticateWithBiometric(
    options: BiometricOptions = {},
  ): Promise<boolean> {
    if (!this.biometricSupported) {
      throw new Error('Biometric authentication not supported');
    }

    try {
      // Use WebAuthn for biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'WedSync',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode('user'),
            name: 'user@wedsync.com',
            displayName: 'WedSync User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      });

      if (credential) {
        // Store biometric credential reference
        localStorage.setItem('biometric_credential_id', credential.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Biometric authentication failed:', error);

      // Fallback to device credentials if allowed
      if (options.deviceCredentialAllowed) {
        return await this.authenticateWithDeviceCredentials();
      }

      throw error;
    }
  }

  private async authenticateWithDeviceCredentials(): Promise<boolean> {
    try {
      // Mock device credential authentication
      // In a real implementation, this would integrate with device-specific APIs
      const result = confirm(
        'Please verify your identity using your device PIN, pattern, or password.',
      );
      return result;
    } catch (error) {
      console.error('Device credential authentication failed:', error);
      return false;
    }
  }

  async verifyBiometric(): Promise<boolean> {
    const credentialId = localStorage.getItem('biometric_credential_id');
    if (!credentialId) {
      return false;
    }

    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [
            {
              id: new TextEncoder().encode(credentialId),
              type: 'public-key',
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      return credential !== null;
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return false;
    }
  }

  // Encryption/Decryption
  private async initializeMasterKey(): Promise<void> {
    try {
      // Try to load existing key
      const storedKey = localStorage.getItem('master_key_material');
      if (storedKey) {
        this.masterKey = await this.importKey(storedKey);
      } else {
        // Generate new master key
        this.masterKey = await this.generateMasterKey();
        const exportedKey = await this.exportKey(this.masterKey);
        localStorage.setItem('master_key_material', exportedKey);
      }
    } catch (error) {
      console.error('Master key initialization failed:', error);
      // Generate a new key as fallback
      this.masterKey = await this.generateMasterKey();
    }
  }

  private async generateMasterKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt'],
    );
  }

  private async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  private async importKey(keyMaterial: string): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(
      atob(keyMaterial)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );

    return await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async encryptData(
    data: any,
  ): Promise<{ encrypted: string; iv: string; tag: string }> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));

    try {
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.masterKey,
        dataBytes,
      );

      const encryptedArray = new Uint8Array(encrypted);
      const tag = encryptedArray.slice(-16);
      const ciphertext = encryptedArray.slice(0, -16);

      return {
        encrypted: btoa(String.fromCharCode(...ciphertext)),
        iv: btoa(String.fromCharCode(...iv)),
        tag: btoa(String.fromCharCode(...tag)),
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decryptData(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
  }): Promise<any> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    try {
      const ciphertext = new Uint8Array(
        atob(encryptedData.encrypted)
          .split('')
          .map((c) => c.charCodeAt(0)),
      );
      const iv = new Uint8Array(
        atob(encryptedData.iv)
          .split('')
          .map((c) => c.charCodeAt(0)),
      );
      const tag = new Uint8Array(
        atob(encryptedData.tag)
          .split('')
          .map((c) => c.charCodeAt(0)),
      );

      // Combine ciphertext and tag for AES-GCM
      const combined = new Uint8Array(ciphertext.length + tag.length);
      combined.set(ciphertext);
      combined.set(tag, ciphertext.length);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.masterKey,
        combined,
      );

      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Secure Storage
  async storeSecureData(key: string, data: any): Promise<void> {
    try {
      const encrypted = await this.encryptData(data);
      const secureItem: SecureStorageItem = {
        id: key,
        data: encrypted,
        timestamp: new Date(),
        encrypted: true,
      };

      localStorage.setItem(`secure_${key}`, JSON.stringify(secureItem));
    } catch (error) {
      console.error('Secure storage failed:', error);
      throw new Error('Failed to store secure data');
    }
  }

  async retrieveSecureData(key: string): Promise<any> {
    try {
      const storedItem = localStorage.getItem(`secure_${key}`);
      if (!storedItem) {
        return null;
      }

      const secureItem: SecureStorageItem = JSON.parse(storedItem);

      if (secureItem.encrypted) {
        return await this.decryptData(secureItem.data);
      } else {
        return secureItem.data;
      }
    } catch (error) {
      console.error('Secure retrieval failed:', error);
      throw new Error('Failed to retrieve secure data');
    }
  }

  async deleteSecureData(key: string): Promise<void> {
    localStorage.removeItem(`secure_${key}`);
  }

  async clearAllSecureData(): Promise<void> {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('secure_'),
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }

  // Device Security
  private async checkDeviceLock(): Promise<boolean> {
    try {
      // Check if device has screen lock enabled
      // This is a limited check on web platforms
      return 'credentials' in navigator && 'create' in navigator.credentials;
    } catch (error) {
      return false;
    }
  }

  async requireDeviceLock(): Promise<boolean> {
    if (!this.deviceLockEnabled) {
      throw new Error(
        'Device lock not enabled. Please enable screen lock in device settings.',
      );
    }
    return true;
  }

  // Session Management
  private sessionTimeout = 15 * 60 * 1000; // 15 minutes
  private lastActivity = Date.now();

  updateActivity(): void {
    this.lastActivity = Date.now();
  }

  isSessionExpired(): boolean {
    return Date.now() - this.lastActivity > this.sessionTimeout;
  }

  async requireActiveSession(): Promise<boolean> {
    if (this.isSessionExpired()) {
      // Require re-authentication
      if (this.biometricSupported) {
        return await this.verifyBiometric();
      } else {
        return await this.authenticateWithDeviceCredentials();
      }
    }
    return true;
  }

  setSessionTimeout(minutes: number): void {
    this.sessionTimeout = minutes * 60 * 1000;
  }

  // Data Integrity
  async hashData(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyDataIntegrity(data: any, expectedHash: string): Promise<boolean> {
    const actualHash = await this.hashData(data);
    return actualHash === expectedHash;
  }

  // Privacy Controls
  async wipeSensitiveData(): Promise<void> {
    // Clear all encrypted data
    await this.clearAllSecureData();

    // Clear biometric credentials
    localStorage.removeItem('biometric_credential_id');

    // Clear master key
    localStorage.removeItem('master_key_material');
    this.masterKey = null;

    // Clear any cached wedding data
    const weddingKeys = Object.keys(localStorage).filter(
      (key) => key.includes('wedding_') || key.includes('offline_'),
    );
    weddingKeys.forEach((key) => localStorage.removeItem(key));

    console.log('Sensitive data wiped successfully');
  }

  // Utility Methods
  isBiometricSupported(): boolean {
    return this.biometricSupported;
  }

  isDeviceLockEnabled(): boolean {
    return this.deviceLockEnabled;
  }

  getSecurityLevel(): 'low' | 'medium' | 'high' {
    if (this.biometricSupported && this.deviceLockEnabled) {
      return 'high';
    } else if (this.deviceLockEnabled) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Export singleton instance
export const mobileOfflineSecurity = MobileOfflineSecurity.getInstance();
