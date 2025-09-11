/**
 * MobileTokenSecurityManager - Secure Token Handling for Mobile Enterprise SSO
 *
 * Handles secure storage, rotation, and management of authentication tokens
 * for WedSync's enterprise SSO system with mobile-first security.
 *
 * Wedding Industry Context:
 * - Wedding data requires high security (personal, financial, vendor info)
 * - Tokens must work offline during venue operations
 * - Emergency token access for wedding day issues
 * - Multi-device team coordination requires secure token sharing
 *
 * @author WedSync Security Team
 * @version 2.0.0
 */

// Types and Interfaces
interface SecureToken {
  tokenId: string;
  type: 'access' | 'refresh' | 'emergency' | 'temporary';
  value: string;
  userId: string;
  organizationId: string;
  deviceId: string;
  issuedAt: Date;
  expiresAt: Date;
  scopes: string[];
  weddingContext?: WeddingTokenContext;
  encrypted: boolean;
  rotationCount: number;
  lastUsed: Date;
}

interface WeddingTokenContext {
  weddingId: string;
  weddingDate: Date;
  isWeddingDay: boolean;
  emergencyAccess: boolean;
  venueId?: string;
  teamRole: string;
}

interface TokenStorage {
  encryptedTokens: Map<string, ArrayBuffer>;
  tokenMetadata: Map<string, Omit<SecureToken, 'value'>>;
  encryptionKey: CryptoKey | null;
  keyDerivationSalt: Uint8Array;
}

interface TokenRotationPolicy {
  accessTokenLifetimeMs: number;
  refreshTokenLifetimeMs: number;
  emergencyTokenLifetimeMs: number;
  rotationIntervalMs: number;
  maxRotationAttempts: number;
  weddingDayExtensionMs: number;
  gracePeriodMs: number;
}

interface TokenValidationResult {
  valid: boolean;
  token?: SecureToken;
  reason?: string;
  needsRotation: boolean;
  rotationAvailable: boolean;
}

interface TokenSecurityEvent {
  eventId: string;
  type:
    | 'token_created'
    | 'token_rotated'
    | 'token_revoked'
    | 'token_expired'
    | 'security_violation';
  tokenId: string;
  userId: string;
  deviceId: string;
  timestamp: Date;
  metadata: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class MobileTokenSecurityManager {
  private storage: TokenStorage;
  private rotationPolicy: TokenRotationPolicy;
  private secureStorage: IDBDatabase | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private keyDerivationIterations = 100000;
  private encryptionAlgorithm = 'AES-GCM';

  constructor(policy?: Partial<TokenRotationPolicy>) {
    this.rotationPolicy = {
      accessTokenLifetimeMs: 60 * 60 * 1000, // 1 hour
      refreshTokenLifetimeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      emergencyTokenLifetimeMs: 4 * 60 * 60 * 1000, // 4 hours
      rotationIntervalMs: 15 * 60 * 1000, // 15 minutes
      maxRotationAttempts: 3,
      weddingDayExtensionMs: 8 * 60 * 60 * 1000, // 8 hours extension for wedding days
      gracePeriodMs: 5 * 60 * 1000, // 5 minutes grace period
      ...policy,
    };

    this.storage = {
      encryptedTokens: new Map(),
      tokenMetadata: new Map(),
      encryptionKey: null,
      keyDerivationSalt: crypto.getRandomValues(new Uint8Array(16)),
    };

    this.initializeManager();
  }

  /**
   * Initialize the token security manager
   */
  private async initializeManager(): Promise<void> {
    try {
      await this.initializeSecureStorage();
      await this.initializeEncryption();
      await this.loadStoredTokens();
      this.startTokenRotationScheduler();

      console.log('🔐 MobileTokenSecurityManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MobileTokenSecurityManager:', error);
      throw error;
    }
  }

  /**
   * Initialize secure storage (IndexedDB)
   */
  private async initializeSecureStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncTokenSecurity', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.secureStorage = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Token storage
        if (!db.objectStoreNames.contains('tokens')) {
          const tokenStore = db.createObjectStore('tokens', {
            keyPath: 'tokenId',
          });
          tokenStore.createIndex('userId', 'userId', { unique: false });
          tokenStore.createIndex('type', 'type', { unique: false });
          tokenStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          tokenStore.createIndex('deviceId', 'deviceId', { unique: false });
        }

        // Security events
        if (!db.objectStoreNames.contains('security_events')) {
          const eventStore = db.createObjectStore('security_events', {
            keyPath: 'eventId',
          });
          eventStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventStore.createIndex('type', 'type', { unique: false });
          eventStore.createIndex('severity', 'severity', { unique: false });
          eventStore.createIndex('userId', 'userId', { unique: false });
        }

        // Encryption keys (metadata only, not the actual keys)
        if (!db.objectStoreNames.contains('encryption_metadata')) {
          db.createObjectStore('encryption_metadata', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Initialize encryption system
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Try to retrieve existing key
      const existingKey = await this.getStoredEncryptionKey();

      if (existingKey) {
        this.storage.encryptionKey = existingKey.key;
        this.storage.keyDerivationSalt = existingKey.salt;
      } else {
        // Generate new encryption key
        const { key, salt } = await this.generateEncryptionKey();
        this.storage.encryptionKey = key;
        this.storage.keyDerivationSalt = salt;

        // Store key metadata (not the actual key)
        await this.storeEncryptionKeyMetadata(salt);
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Generate device-specific encryption key
   */
  private async generateEncryptionKey(): Promise<{
    key: CryptoKey;
    salt: Uint8Array;
  }> {
    try {
      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // Create device fingerprint for consistent key generation
      const deviceFingerprint = await this.generateDeviceFingerprint();

      // Import password material
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(deviceFingerprint),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey'],
      );

      // Derive encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.keyDerivationIterations,
          hash: 'SHA-256',
        },
        passwordKey,
        { name: this.encryptionAlgorithm, length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );

      return { key, salt };
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw error;
    }
  }

  /**
   * Generate device fingerprint for encryption
   */
  private async generateDeviceFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx!.textBaseline = 'top';
      ctx!.font = '14px Arial';
      ctx!.fillText('WedSync Token Security', 2, 2);

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || 0,
        'wedsync-token-security-v2',
      ].join('|');

      // Hash the fingerprint
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprint);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Fingerprint generation failed, using fallback');
      return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Store encryption key metadata (not the actual key)
   */
  private async storeEncryptionKeyMetadata(salt: Uint8Array): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['encryption_metadata'],
        'readwrite',
      );
      const store = transaction.objectStore('encryption_metadata');

      await store.put({
        id: 'master-key',
        salt: Array.from(salt),
        created: new Date().toISOString(),
        algorithm: this.encryptionAlgorithm,
        iterations: this.keyDerivationIterations,
      });
    } catch (error) {
      console.error('Failed to store encryption metadata:', error);
    }
  }

  /**
   * Retrieve stored encryption key
   */
  private async getStoredEncryptionKey(): Promise<{
    key: CryptoKey;
    salt: Uint8Array;
  } | null> {
    if (!this.secureStorage) return null;

    try {
      const transaction = this.secureStorage.transaction(
        ['encryption_metadata'],
        'readonly',
      );
      const store = transaction.objectStore('encryption_metadata');

      return new Promise((resolve, reject) => {
        const request = store.get('master-key');
        request.onsuccess = async () => {
          if (request.result) {
            try {
              const metadata = request.result;
              const salt = new Uint8Array(metadata.salt);
              const deviceFingerprint = await this.generateDeviceFingerprint();

              // Recreate key using stored salt
              const passwordKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(deviceFingerprint),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey'],
              );

              const key = await crypto.subtle.deriveKey(
                {
                  name: 'PBKDF2',
                  salt: salt,
                  iterations: metadata.iterations,
                  hash: 'SHA-256',
                },
                passwordKey,
                { name: this.encryptionAlgorithm, length: 256 },
                false,
                ['encrypt', 'decrypt'],
              );

              resolve({ key, salt });
            } catch (error) {
              reject(error);
            }
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to retrieve stored encryption key:', error);
      return null;
    }
  }

  /**
   * Encrypt token value
   */
  private async encryptToken(tokenValue: string): Promise<ArrayBuffer> {
    if (!this.storage.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(tokenValue);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.encryptionAlgorithm,
          iv: iv,
        },
        this.storage.encryptionKey,
        data,
      );

      // Prepend IV to encrypted data
      const result = new ArrayBuffer(iv.length + encrypted.byteLength);
      const resultView = new Uint8Array(result);
      resultView.set(iv);
      resultView.set(new Uint8Array(encrypted), iv.length);

      return result;
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt token value
   */
  private async decryptToken(encryptedData: ArrayBuffer): Promise<string> {
    if (!this.storage.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      const encryptedView = new Uint8Array(encryptedData);
      const iv = encryptedView.slice(0, 12);
      const encrypted = encryptedView.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.encryptionAlgorithm,
          iv: iv,
        },
        this.storage.encryptionKey,
        encrypted,
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw error;
    }
  }

  /**
   * Store secure token
   */
  public async storeToken(
    tokenValue: string,
    type: SecureToken['type'],
    userId: string,
    organizationId: string,
    deviceId: string,
    scopes: string[] = [],
    weddingContext?: WeddingTokenContext,
  ): Promise<SecureToken> {
    try {
      const now = new Date();
      let expiresAt: Date;

      // Set expiration based on token type and wedding context
      switch (type) {
        case 'access':
          expiresAt = new Date(
            now.getTime() + this.rotationPolicy.accessTokenLifetimeMs,
          );
          if (weddingContext?.isWeddingDay) {
            expiresAt = new Date(
              expiresAt.getTime() + this.rotationPolicy.weddingDayExtensionMs,
            );
          }
          break;
        case 'refresh':
          expiresAt = new Date(
            now.getTime() + this.rotationPolicy.refreshTokenLifetimeMs,
          );
          break;
        case 'emergency':
          expiresAt = new Date(
            now.getTime() + this.rotationPolicy.emergencyTokenLifetimeMs,
          );
          break;
        case 'temporary':
          expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
          break;
        default:
          expiresAt = new Date(
            now.getTime() + this.rotationPolicy.accessTokenLifetimeMs,
          );
      }

      const tokenId = await this.generateTokenId();
      const encryptedValue = await this.encryptToken(tokenValue);

      const token: SecureToken = {
        tokenId,
        type,
        value: tokenValue,
        userId,
        organizationId,
        deviceId,
        issuedAt: now,
        expiresAt,
        scopes,
        weddingContext,
        encrypted: true,
        rotationCount: 0,
        lastUsed: now,
      };

      // Store encrypted token
      this.storage.encryptedTokens.set(tokenId, encryptedValue);

      // Store metadata (without the actual token value)
      const { value, ...metadata } = token;
      this.storage.tokenMetadata.set(tokenId, metadata);

      // Persist to IndexedDB
      await this.persistToken(token, encryptedValue);

      // Log token creation
      await this.logSecurityEvent({
        eventId: await this.generateEventId(),
        type: 'token_created',
        tokenId,
        userId,
        deviceId,
        timestamp: now,
        metadata: { type, scopes, weddingContext },
        severity: 'low',
      });

      console.log(`🔐 Token stored: ${tokenId} (${type}) for user ${userId}`);
      return token;
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Retrieve and validate token
   */
  public async getToken(tokenId: string): Promise<TokenValidationResult> {
    try {
      const metadata = this.storage.tokenMetadata.get(tokenId);
      const encryptedValue = this.storage.encryptedTokens.get(tokenId);

      if (!metadata || !encryptedValue) {
        return {
          valid: false,
          reason: 'Token not found',
          needsRotation: false,
          rotationAvailable: false,
        };
      }

      // Check expiration
      const now = new Date();
      if (metadata.expiresAt < now) {
        // Check if we're in grace period for wedding day operations
        const gracePeriodEnd = new Date(
          metadata.expiresAt.getTime() + this.rotationPolicy.gracePeriodMs,
        );
        const isWeddingDay = metadata.weddingContext?.isWeddingDay;

        if (now > gracePeriodEnd || !isWeddingDay) {
          return {
            valid: false,
            reason: 'Token expired',
            needsRotation: true,
            rotationAvailable:
              metadata.type === 'access' || metadata.type === 'refresh',
          };
        }
      }

      // Decrypt token value
      const tokenValue = await this.decryptToken(encryptedValue);

      const token: SecureToken = {
        ...metadata,
        value: tokenValue,
      };

      // Update last used timestamp
      metadata.lastUsed = now;
      await this.updateTokenMetadata(tokenId, metadata);

      // Check if rotation is needed
      const rotationNeeded = this.shouldRotateToken(token);

      return {
        valid: true,
        token,
        needsRotation: rotationNeeded,
        rotationAvailable: token.type === 'access' || token.type === 'refresh',
      };
    } catch (error) {
      console.error('Failed to get token:', error);
      return {
        valid: false,
        reason: 'Token validation failed',
        needsRotation: false,
        rotationAvailable: false,
      };
    }
  }

  /**
   * Rotate token
   */
  public async rotateToken(
    tokenId: string,
    newTokenValue: string,
  ): Promise<SecureToken | null> {
    try {
      const validationResult = await this.getToken(tokenId);

      if (!validationResult.valid || !validationResult.token) {
        throw new Error('Cannot rotate invalid token');
      }

      const oldToken = validationResult.token;

      if (oldToken.rotationCount >= this.rotationPolicy.maxRotationAttempts) {
        throw new Error('Maximum rotation attempts exceeded');
      }

      // Create new token with updated values
      const now = new Date();
      const newExpiresAt = new Date(
        now.getTime() +
          this.getTokenLifetime(oldToken.type, oldToken.weddingContext),
      );
      const newEncryptedValue = await this.encryptToken(newTokenValue);

      const newToken: SecureToken = {
        ...oldToken,
        value: newTokenValue,
        issuedAt: now,
        expiresAt: newExpiresAt,
        rotationCount: oldToken.rotationCount + 1,
        lastUsed: now,
      };

      // Update storage
      this.storage.encryptedTokens.set(tokenId, newEncryptedValue);
      const { value, ...metadata } = newToken;
      this.storage.tokenMetadata.set(tokenId, metadata);

      // Persist to IndexedDB
      await this.persistToken(newToken, newEncryptedValue);

      // Log rotation
      await this.logSecurityEvent({
        eventId: await this.generateEventId(),
        type: 'token_rotated',
        tokenId,
        userId: oldToken.userId,
        deviceId: oldToken.deviceId,
        timestamp: now,
        metadata: { rotationCount: newToken.rotationCount },
        severity: 'low',
      });

      console.log(
        `🔄 Token rotated: ${tokenId} (rotation ${newToken.rotationCount})`,
      );
      return newToken;
    } catch (error) {
      console.error('Failed to rotate token:', error);
      return null;
    }
  }

  /**
   * Revoke token
   */
  public async revokeToken(
    tokenId: string,
    reason: string = 'user_requested',
  ): Promise<boolean> {
    try {
      const metadata = this.storage.tokenMetadata.get(tokenId);

      if (!metadata) {
        return false;
      }

      // Remove from storage
      this.storage.encryptedTokens.delete(tokenId);
      this.storage.tokenMetadata.delete(tokenId);

      // Remove from IndexedDB
      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['tokens'],
          'readwrite',
        );
        const store = transaction.objectStore('tokens');
        await store.delete(tokenId);
      }

      // Log revocation
      await this.logSecurityEvent({
        eventId: await this.generateEventId(),
        type: 'token_revoked',
        tokenId,
        userId: metadata.userId,
        deviceId: metadata.deviceId,
        timestamp: new Date(),
        metadata: { reason },
        severity: 'medium',
      });

      console.log(`🚫 Token revoked: ${tokenId} (${reason})`);
      return true;
    } catch (error) {
      console.error('Failed to revoke token:', error);
      return false;
    }
  }

  /**
   * Get all tokens for a user
   */
  public async getUserTokens(userId: string): Promise<SecureToken[]> {
    const userTokens: SecureToken[] = [];

    try {
      for (const [tokenId, metadata] of this.storage.tokenMetadata.entries()) {
        if (metadata.userId === userId && metadata.expiresAt > new Date()) {
          const encryptedValue = this.storage.encryptedTokens.get(tokenId);
          if (encryptedValue) {
            const tokenValue = await this.decryptToken(encryptedValue);
            userTokens.push({
              ...metadata,
              value: tokenValue,
            });
          }
        }
      }

      return userTokens;
    } catch (error) {
      console.error('Failed to get user tokens:', error);
      return [];
    }
  }

  /**
   * Create emergency token for wedding day access
   */
  public async createEmergencyToken(
    userId: string,
    organizationId: string,
    deviceId: string,
    weddingId: string,
    weddingDate: Date,
    teamRole: string,
  ): Promise<SecureToken | null> {
    try {
      // Generate emergency token value
      const emergencyValue = await this.generateEmergencyTokenValue(
        weddingId,
        userId,
      );

      const weddingContext: WeddingTokenContext = {
        weddingId,
        weddingDate,
        isWeddingDay: this.isWeddingDay(weddingDate),
        emergencyAccess: true,
        teamRole,
      };

      const emergencyToken = await this.storeToken(
        emergencyValue,
        'emergency',
        userId,
        organizationId,
        deviceId,
        ['emergency_access', 'wedding_read', 'wedding_write'],
        weddingContext,
      );

      // Log emergency token creation
      await this.logSecurityEvent({
        eventId: await this.generateEventId(),
        type: 'token_created',
        tokenId: emergencyToken.tokenId,
        userId,
        deviceId,
        timestamp: new Date(),
        metadata: { emergency: true, weddingId, teamRole },
        severity: 'high',
      });

      console.log(`🚨 Emergency token created for wedding ${weddingId}`);
      return emergencyToken;
    } catch (error) {
      console.error('Failed to create emergency token:', error);
      return null;
    }
  }

  /**
   * Load stored tokens from IndexedDB
   */
  private async loadStoredTokens(): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['tokens'],
        'readonly',
      );
      const store = transaction.objectStore('tokens');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = async () => {
          try {
            const storedTokens = request.result;
            let loadedCount = 0;

            for (const stored of storedTokens) {
              // Only load non-expired tokens
              if (new Date(stored.expiresAt) > new Date()) {
                this.storage.encryptedTokens.set(
                  stored.tokenId,
                  stored.encryptedValue,
                );

                const { encryptedValue, ...metadata } = stored;
                this.storage.tokenMetadata.set(stored.tokenId, {
                  ...metadata,
                  issuedAt: new Date(metadata.issuedAt),
                  expiresAt: new Date(metadata.expiresAt),
                  lastUsed: new Date(metadata.lastUsed),
                  weddingContext: metadata.weddingContext
                    ? {
                        ...metadata.weddingContext,
                        weddingDate: new Date(
                          metadata.weddingContext.weddingDate,
                        ),
                      }
                    : undefined,
                });

                loadedCount++;
              }
            }

            console.log(`🔐 Loaded ${loadedCount} stored tokens`);
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  /**
   * Persist token to IndexedDB
   */
  private async persistToken(
    token: SecureToken,
    encryptedValue: ArrayBuffer,
  ): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['tokens'],
        'readwrite',
      );
      const store = transaction.objectStore('tokens');

      const storedToken = {
        tokenId: token.tokenId,
        type: token.type,
        userId: token.userId,
        organizationId: token.organizationId,
        deviceId: token.deviceId,
        issuedAt: token.issuedAt.toISOString(),
        expiresAt: token.expiresAt.toISOString(),
        lastUsed: token.lastUsed.toISOString(),
        scopes: token.scopes,
        weddingContext: token.weddingContext
          ? {
              ...token.weddingContext,
              weddingDate: token.weddingContext.weddingDate.toISOString(),
            }
          : undefined,
        encrypted: token.encrypted,
        rotationCount: token.rotationCount,
        encryptedValue,
      };

      await store.put(storedToken);
    } catch (error) {
      console.error('Failed to persist token:', error);
    }
  }

  /**
   * Update token metadata
   */
  private async updateTokenMetadata(
    tokenId: string,
    metadata: Omit<SecureToken, 'value'>,
  ): Promise<void> {
    this.storage.tokenMetadata.set(tokenId, metadata);

    if (this.secureStorage) {
      try {
        const transaction = this.secureStorage.transaction(
          ['tokens'],
          'readwrite',
        );
        const store = transaction.objectStore('tokens');

        const request = store.get(tokenId);
        request.onsuccess = () => {
          if (request.result) {
            const updated = {
              ...request.result,
              lastUsed: metadata.lastUsed.toISOString(),
              rotationCount: metadata.rotationCount,
            };
            store.put(updated);
          }
        };
      } catch (error) {
        console.error('Failed to update token metadata:', error);
      }
    }
  }

  /**
   * Start automatic token rotation scheduler
   */
  private startTokenRotationScheduler(): void {
    this.rotationTimer = setInterval(async () => {
      try {
        await this.performScheduledRotation();
        await this.cleanupExpiredTokens();
      } catch (error) {
        console.error('Scheduled token operations failed:', error);
      }
    }, this.rotationPolicy.rotationIntervalMs);
  }

  /**
   * Perform scheduled token rotation
   */
  private async performScheduledRotation(): Promise<void> {
    const now = new Date();
    const rotationThreshold = new Date(
      now.getTime() - this.rotationPolicy.accessTokenLifetimeMs * 0.8,
    );

    for (const [tokenId, metadata] of this.storage.tokenMetadata.entries()) {
      if (this.shouldRotateToken({ ...metadata, value: '' })) {
        // In a real implementation, you'd get a new token from the auth server
        console.log(`🔄 Token ${tokenId} needs rotation`);
        // await this.rotateToken(tokenId, newTokenFromServer);
      }
    }
  }

  /**
   * Clean up expired tokens
   */
  private async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    const expiredTokens: string[] = [];

    for (const [tokenId, metadata] of this.storage.tokenMetadata.entries()) {
      if (metadata.expiresAt < now) {
        expiredTokens.push(tokenId);
      }
    }

    for (const tokenId of expiredTokens) {
      const metadata = this.storage.tokenMetadata.get(tokenId);
      if (metadata) {
        await this.logSecurityEvent({
          eventId: await this.generateEventId(),
          type: 'token_expired',
          tokenId,
          userId: metadata.userId,
          deviceId: metadata.deviceId,
          timestamp: now,
          metadata: { type: metadata.type },
          severity: 'low',
        });
      }

      this.storage.encryptedTokens.delete(tokenId);
      this.storage.tokenMetadata.delete(tokenId);
    }

    if (expiredTokens.length > 0) {
      console.log(`🧹 Cleaned up ${expiredTokens.length} expired tokens`);
    }
  }

  /**
   * Check if token should be rotated
   */
  private shouldRotateToken(token: SecureToken): boolean {
    if (token.type !== 'access' && token.type !== 'refresh') {
      return false;
    }

    const now = new Date();
    const rotationThreshold = new Date(
      token.issuedAt.getTime() +
        this.getTokenLifetime(token.type, token.weddingContext) * 0.8,
    );

    return now > rotationThreshold;
  }

  /**
   * Get token lifetime based on type and context
   */
  private getTokenLifetime(
    type: SecureToken['type'],
    weddingContext?: WeddingTokenContext,
  ): number {
    let baseLifetime: number;

    switch (type) {
      case 'access':
        baseLifetime = this.rotationPolicy.accessTokenLifetimeMs;
        break;
      case 'refresh':
        baseLifetime = this.rotationPolicy.refreshTokenLifetimeMs;
        break;
      case 'emergency':
        baseLifetime = this.rotationPolicy.emergencyTokenLifetimeMs;
        break;
      case 'temporary':
        baseLifetime = 2 * 60 * 60 * 1000; // 2 hours
        break;
      default:
        baseLifetime = this.rotationPolicy.accessTokenLifetimeMs;
    }

    // Extend lifetime for wedding day operations
    if (weddingContext?.isWeddingDay && type === 'access') {
      baseLifetime += this.rotationPolicy.weddingDayExtensionMs;
    }

    return baseLifetime;
  }

  /**
   * Check if date is a wedding day (today)
   */
  private isWeddingDay(weddingDate: Date): boolean {
    const today = new Date();
    return weddingDate.toDateString() === today.toDateString();
  }

  /**
   * Generate secure token ID
   */
  private async generateTokenId(): Promise<string> {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `wedsync_token_${hex}`;
  }

  /**
   * Generate emergency token value
   */
  private async generateEmergencyTokenValue(
    weddingId: string,
    userId: string,
  ): Promise<string> {
    const data = [
      'emergency',
      weddingId,
      userId,
      Date.now().toString(),
      crypto.getRandomValues(new Uint8Array(8)).join(''),
    ].join('|');

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(data),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `wedsync_emergency_${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Generate security event ID
   */
  private async generateEventId(): Promise<string> {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `event_${hex}`;
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: TokenSecurityEvent): Promise<void> {
    try {
      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['security_events'],
          'readwrite',
        );
        const store = transaction.objectStore('security_events');

        const storedEvent = {
          ...event,
          timestamp: event.timestamp.toISOString(),
        };

        await store.add(storedEvent);
      }

      // Log to console for development
      console.log(
        `🔐 Token Security Event [${event.severity.toUpperCase()}]:`,
        {
          type: event.type,
          tokenId: event.tokenId,
          userId: event.userId,
          timestamp: event.timestamp,
        },
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get token security statistics
   */
  public getSecurityStats(): {
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    emergencyTokens: number;
    rotationCount: number;
  } {
    const now = new Date();
    let activeTokens = 0;
    let expiredTokens = 0;
    let emergencyTokens = 0;
    let totalRotations = 0;

    for (const metadata of this.storage.tokenMetadata.values()) {
      if (metadata.expiresAt > now) {
        activeTokens++;
        if (metadata.type === 'emergency') {
          emergencyTokens++;
        }
      } else {
        expiredTokens++;
      }
      totalRotations += metadata.rotationCount;
    }

    return {
      totalTokens: this.storage.tokenMetadata.size,
      activeTokens,
      expiredTokens,
      emergencyTokens,
      rotationCount: totalRotations,
    };
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.rotationTimer) {
        clearInterval(this.rotationTimer);
        this.rotationTimer = null;
      }

      // Clear sensitive data from memory
      this.storage.encryptedTokens.clear();
      this.storage.tokenMetadata.clear();

      if (this.secureStorage) {
        this.secureStorage.close();
        this.secureStorage = null;
      }

      console.log('🔐 MobileTokenSecurityManager shutdown complete');
    } catch (error) {
      console.error('Error during token manager shutdown:', error);
    }
  }
}

export default MobileTokenSecurityManager;
export type {
  SecureToken,
  WeddingTokenContext,
  TokenStorage,
  TokenRotationPolicy,
  TokenValidationResult,
  TokenSecurityEvent,
};
