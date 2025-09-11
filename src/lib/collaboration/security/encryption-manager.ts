// WS-342: Real-Time Wedding Collaboration - Encryption Manager
// Team B Backend Development - Batch 1 Round 1

import crypto from 'crypto';
import { EventEmitter } from 'events';

interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  tagSize: number;
  rotationInterval: number; // in hours
  maxKeyAge: number; // in hours
}

interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  keyId: string;
  timestamp: number;
}

interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: number;
  lastUsed: number;
  rotations: number;
}

interface EncryptionMetrics {
  totalEncryptions: number;
  totalDecryptions: number;
  keyRotations: number;
  failedOperations: number;
  avgEncryptionTime: number;
  avgDecryptionTime: number;
  lastUpdated: Date;
}

export class EncryptionManager extends EventEmitter {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string = '';
  private metrics: EncryptionMetrics;
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<EncryptionConfig> = {}) {
    super();

    this.config = {
      algorithm: 'aes-256-gcm',
      keySize: 32, // 256 bits
      ivSize: 16, // 128 bits
      tagSize: 16, // 128 bits
      rotationInterval: 24, // 24 hours
      maxKeyAge: 168, // 7 days
      ...config,
    };

    this.metrics = {
      totalEncryptions: 0,
      totalDecryptions: 0,
      keyRotations: 0,
      failedOperations: 0,
      avgEncryptionTime: 0,
      avgDecryptionTime: 0,
      lastUpdated: new Date(),
    };

    this.initializeKeyManagement();
  }

  // Wedding collaboration specific encryption
  async encryptCollaborationData(
    data: any,
    weddingId: string,
    userId: string,
  ): Promise<EncryptedData> {
    const startTime = Date.now();

    try {
      const payload = {
        data,
        weddingId,
        userId,
        timestamp: Date.now(),
        version: '1.0',
      };

      const serialized = JSON.stringify(payload);
      const encrypted = await this.encrypt(serialized);

      this.recordMetric('encryption', Date.now() - startTime);
      this.emit('collaboration_data_encrypted', {
        weddingId,
        userId,
        size: serialized.length,
      });

      return encrypted;
    } catch (error) {
      this.metrics.failedOperations++;
      console.error('Collaboration encryption error:', error);
      throw new Error('Failed to encrypt collaboration data');
    }
  }

  async decryptCollaborationData(encryptedData: EncryptedData): Promise<{
    data: any;
    weddingId: string;
    userId: string;
    timestamp: number;
  }> {
    const startTime = Date.now();

    try {
      const decrypted = await this.decrypt(encryptedData);
      const payload = JSON.parse(decrypted);

      // Validate payload structure
      if (!payload.data || !payload.weddingId || !payload.userId) {
        throw new Error('Invalid payload structure');
      }

      // Check timestamp freshness (prevent replay attacks)
      const age = Date.now() - payload.timestamp;
      if (age > 5 * 60 * 1000) {
        // 5 minutes
        throw new Error('Payload too old');
      }

      this.recordMetric('decryption', Date.now() - startTime);
      this.emit('collaboration_data_decrypted', {
        weddingId: payload.weddingId,
        userId: payload.userId,
      });

      return {
        data: payload.data,
        weddingId: payload.weddingId,
        userId: payload.userId,
        timestamp: payload.timestamp,
      };
    } catch (error) {
      this.metrics.failedOperations++;
      console.error('Collaboration decryption error:', error);
      throw new Error('Failed to decrypt collaboration data');
    }
  }

  // Core encryption methods
  async encrypt(plaintext: string): Promise<EncryptedData> {
    const key = this.getCurrentKey();
    const iv = crypto.randomBytes(this.config.ivSize);

    try {
      const cipher = crypto.createCipher(this.config.algorithm, key.key);
      cipher.setAAD(Buffer.from(key.id)); // Additional authenticated data

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      key.lastUsed = Date.now();
      this.metrics.totalEncryptions++;

      return {
        data: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        keyId: key.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const key = this.keys.get(encryptedData.keyId);
    if (!key) {
      throw new Error('Encryption key not found');
    }

    try {
      const decipher = crypto.createDecipher(this.config.algorithm, key.key);
      decipher.setAAD(Buffer.from(key.id));

      if (encryptedData.tag) {
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      }

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      key.lastUsed = Date.now();
      this.metrics.totalDecryptions++;

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  // Key management
  private initializeKeyManagement(): void {
    // Generate initial key
    this.rotateKey();

    // Start automatic key rotation
    this.rotationTimer = setInterval(
      () => {
        this.rotateKey();
      },
      this.config.rotationInterval * 60 * 60 * 1000,
    );

    // Cleanup old keys periodically
    setInterval(
      () => {
        this.cleanupOldKeys();
      },
      60 * 60 * 1000,
    ); // Every hour
  }

  private rotateKey(): void {
    const keyId = this.generateKeyId();
    const key = crypto.randomBytes(this.config.keySize);

    const keyData: EncryptionKey = {
      id: keyId,
      key,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      rotations: 0,
    };

    this.keys.set(keyId, keyData);
    this.currentKeyId = keyId;
    this.metrics.keyRotations++;

    console.log(`Encryption key rotated: ${keyId}`);
    this.emit('key_rotated', { keyId, totalKeys: this.keys.size });
  }

  private getCurrentKey(): EncryptionKey {
    const key = this.keys.get(this.currentKeyId);
    if (!key) {
      throw new Error('No encryption key available');
    }
    return key;
  }

  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `key_${timestamp}_${random}`;
  }

  private cleanupOldKeys(): void {
    const maxAge = this.config.maxKeyAge * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    for (const [keyId, key] of this.keys.entries()) {
      if (now - key.createdAt > maxAge && keyId !== this.currentKeyId) {
        this.keys.delete(keyId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old encryption keys`);
      this.emit('keys_cleaned', { count: cleaned, remaining: this.keys.size });
    }
  }

  // Wedding-specific encryption helpers
  async encryptWeddingTimeline(
    timeline: any,
    weddingId: string,
  ): Promise<string> {
    const encrypted = await this.encryptCollaborationData(
      { type: 'timeline', content: timeline },
      weddingId,
      'system',
    );
    return JSON.stringify(encrypted);
  }

  async encryptVendorData(vendorData: any, weddingId: string): Promise<string> {
    const encrypted = await this.encryptCollaborationData(
      { type: 'vendor', content: vendorData },
      weddingId,
      'system',
    );
    return JSON.stringify(encrypted);
  }

  async encryptGuestList(guestList: any, weddingId: string): Promise<string> {
    const encrypted = await this.encryptCollaborationData(
      { type: 'guests', content: guestList },
      weddingId,
      'system',
    );
    return JSON.stringify(encrypted);
  }

  // Metrics and monitoring
  private recordMetric(
    operation: 'encryption' | 'decryption',
    duration: number,
  ): void {
    if (operation === 'encryption') {
      this.metrics.avgEncryptionTime =
        (this.metrics.avgEncryptionTime * this.metrics.totalEncryptions +
          duration) /
        (this.metrics.totalEncryptions + 1);
    } else {
      this.metrics.avgDecryptionTime =
        (this.metrics.avgDecryptionTime * this.metrics.totalDecryptions +
          duration) /
        (this.metrics.totalDecryptions + 1);
    }

    this.metrics.lastUpdated = new Date();
  }

  getMetrics(): EncryptionMetrics {
    return { ...this.metrics };
  }

  getKeyInfo(): { total: number; current: string; oldest: Date; newest: Date } {
    let oldest = Date.now();
    let newest = 0;

    for (const key of this.keys.values()) {
      oldest = Math.min(oldest, key.createdAt);
      newest = Math.max(newest, key.createdAt);
    }

    return {
      total: this.keys.size,
      current: this.currentKeyId,
      oldest: new Date(oldest),
      newest: new Date(newest),
    };
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const keyInfo = this.getKeyInfo();
    const metrics = this.getMetrics();

    // Check if we have a current key
    if (!this.currentKeyId || !this.keys.has(this.currentKeyId)) {
      return {
        status: 'unhealthy',
        details: { error: 'No current encryption key available' },
      };
    }

    // Check key age
    const currentKey = this.keys.get(this.currentKeyId)!;
    const keyAge = (Date.now() - currentKey.createdAt) / (1000 * 60 * 60);

    if (keyAge > this.config.rotationInterval * 1.5) {
      return {
        status: 'degraded',
        details: { warning: 'Current key is overdue for rotation', keyAge },
      };
    }

    // Check failure rate
    const totalOps = metrics.totalEncryptions + metrics.totalDecryptions;
    const failureRate = totalOps > 0 ? metrics.failedOperations / totalOps : 0;

    if (failureRate > 0.01) {
      // 1% failure rate threshold
      return {
        status: 'degraded',
        details: { warning: 'High encryption failure rate', failureRate },
      };
    }

    return {
      status: 'healthy',
      details: {
        keyInfo,
        metrics: {
          totalOperations: totalOps,
          failureRate,
          avgEncryptionTime: metrics.avgEncryptionTime,
          avgDecryptionTime: metrics.avgDecryptionTime,
        },
      },
    };
  }

  // Cleanup
  async shutdown(): Promise<void> {
    console.log('Shutting down encryption manager...');

    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Securely clear keys from memory
    for (const key of this.keys.values()) {
      key.key.fill(0);
    }
    this.keys.clear();

    console.log('Encryption manager shutdown complete');
  }
}
