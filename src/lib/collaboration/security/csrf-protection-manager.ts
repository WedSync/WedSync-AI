// WS-342: Real-Time Wedding Collaboration - CSRF Protection Manager
// Team B Backend Development - Batch 1 Round 1

import crypto from 'crypto';
import { EventEmitter } from 'events';

interface CSRFConfig {
  tokenLength: number;
  tokenTTL: number; // in seconds
  cookieName: string;
  headerName: string;
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
  maxTokensPerUser: number;
  cleanupInterval: number; // in seconds
}

interface CSRFToken {
  token: string;
  userId: string;
  weddingId?: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  userAgent?: string;
  ipAddress?: string;
  purpose: 'collaboration' | 'api' | 'form' | 'websocket';
}

interface CSRFMetrics {
  tokensGenerated: number;
  tokensValidated: number;
  tokensRejected: number;
  tokensExpired: number;
  suspiciousActivity: number;
  lastCleanup: Date;
  lastUpdated: Date;
}

interface ValidationResult {
  valid: boolean;
  token?: CSRFToken;
  error?: string;
  reason?: string;
  riskScore?: number;
}

export class CSRFProtectionManager extends EventEmitter {
  private config: CSRFConfig;
  private tokens: Map<string, CSRFToken> = new Map();
  private userTokens: Map<string, Set<string>> = new Map(); // userId -> token set
  private metrics: CSRFMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CSRFConfig> = {}) {
    super();

    this.config = {
      tokenLength: 32,
      tokenTTL: 3600, // 1 hour
      cookieName: 'wedsync-csrf-token',
      headerName: 'X-CSRF-Token',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxTokensPerUser: 10,
      cleanupInterval: 300, // 5 minutes
      ...config,
    };

    this.metrics = {
      tokensGenerated: 0,
      tokensValidated: 0,
      tokensRejected: 0,
      tokensExpired: 0,
      suspiciousActivity: 0,
      lastCleanup: new Date(),
      lastUpdated: new Date(),
    };

    this.startCleanupProcess();
  }

  // Wedding collaboration specific CSRF protection
  async generateCollaborationToken(
    userId: string,
    weddingId: string,
    request?: any,
  ): Promise<{
    token: string;
    cookie: string;
    expiresAt: number;
  }> {
    const tokenData = await this.generateToken(userId, {
      weddingId,
      purpose: 'collaboration',
      userAgent: request?.headers?.['user-agent'],
      ipAddress: this.extractIP(request),
    });

    const cookie = this.createCookie(tokenData.token, tokenData.expiresAt);

    this.emit('collaboration_token_generated', {
      userId,
      weddingId,
      tokenId: tokenData.token.substring(0, 8) + '...',
      expiresAt: tokenData.expiresAt,
    });

    return {
      token: tokenData.token,
      cookie,
      expiresAt: tokenData.expiresAt,
    };
  }

  async validateCollaborationToken(
    token: string,
    userId: string,
    weddingId: string,
    request?: any,
  ): Promise<ValidationResult> {
    const result = await this.validateToken(token, userId, {
      weddingId,
      purpose: 'collaboration',
      userAgent: request?.headers?.['user-agent'],
      ipAddress: this.extractIP(request),
    });

    if (result.valid) {
      this.emit('collaboration_token_validated', {
        userId,
        weddingId,
        tokenId: token.substring(0, 8) + '...',
      });
    } else {
      this.emit('collaboration_token_rejected', {
        userId,
        weddingId,
        reason: result.reason,
        riskScore: result.riskScore,
      });
    }

    return result;
  }

  // WebSocket CSRF protection
  async generateWebSocketToken(
    userId: string,
    weddingId: string,
    connectionId: string,
  ): Promise<string> {
    const tokenData = await this.generateToken(userId, {
      weddingId,
      purpose: 'websocket',
      metadata: { connectionId },
    });

    this.emit('websocket_token_generated', {
      userId,
      weddingId,
      connectionId,
      tokenId: tokenData.token.substring(0, 8) + '...',
    });

    return tokenData.token;
  }

  async validateWebSocketToken(
    token: string,
    userId: string,
    weddingId: string,
    connectionId: string,
  ): Promise<ValidationResult> {
    return this.validateToken(token, userId, {
      weddingId,
      purpose: 'websocket',
      metadata: { connectionId },
    });
  }

  // Core token methods
  private async generateToken(
    userId: string,
    options: {
      weddingId?: string;
      purpose: 'collaboration' | 'api' | 'form' | 'websocket';
      userAgent?: string;
      ipAddress?: string;
      metadata?: any;
    },
  ): Promise<CSRFToken> {
    // Check user token limit
    const userTokenSet = this.userTokens.get(userId) || new Set();
    if (userTokenSet.size >= this.config.maxTokensPerUser) {
      // Remove oldest token
      const oldestToken = Array.from(userTokenSet)[0];
      this.revokeToken(oldestToken);
    }

    const token = this.generateSecureToken();
    const now = Date.now();
    const expiresAt = now + this.config.tokenTTL * 1000;

    const tokenData: CSRFToken = {
      token,
      userId,
      weddingId: options.weddingId,
      createdAt: now,
      expiresAt,
      used: false,
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
      purpose: options.purpose,
    };

    // Store token
    this.tokens.set(token, tokenData);

    // Update user token tracking
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, new Set());
    }
    this.userTokens.get(userId)!.add(token);

    this.metrics.tokensGenerated++;
    this.metrics.lastUpdated = new Date();

    return tokenData;
  }

  private async validateToken(
    token: string,
    userId: string,
    options: {
      weddingId?: string;
      purpose: 'collaboration' | 'api' | 'form' | 'websocket';
      userAgent?: string;
      ipAddress?: string;
      metadata?: any;
    },
  ): Promise<ValidationResult> {
    const tokenData = this.tokens.get(token);

    if (!tokenData) {
      this.metrics.tokensRejected++;
      return {
        valid: false,
        error: 'Token not found',
        reason: 'invalid_token',
        riskScore: 8,
      };
    }

    // Check expiration
    if (Date.now() > tokenData.expiresAt) {
      this.revokeToken(token);
      this.metrics.tokensExpired++;
      return {
        valid: false,
        error: 'Token expired',
        reason: 'expired_token',
        riskScore: 3,
      };
    }

    // Check if already used (single-use tokens)
    if (tokenData.used && options.purpose !== 'websocket') {
      this.metrics.tokensRejected++;
      return {
        valid: false,
        error: 'Token already used',
        reason: 'used_token',
        riskScore: 6,
      };
    }

    // Validate user ID
    if (tokenData.userId !== userId) {
      this.metrics.tokensRejected++;
      this.metrics.suspiciousActivity++;
      return {
        valid: false,
        error: 'Token user mismatch',
        reason: 'user_mismatch',
        riskScore: 9,
      };
    }

    // Validate wedding ID if provided
    if (options.weddingId && tokenData.weddingId !== options.weddingId) {
      this.metrics.tokensRejected++;
      return {
        valid: false,
        error: 'Wedding ID mismatch',
        reason: 'wedding_mismatch',
        riskScore: 7,
      };
    }

    // Validate purpose
    if (tokenData.purpose !== options.purpose) {
      this.metrics.tokensRejected++;
      return {
        valid: false,
        error: 'Token purpose mismatch',
        reason: 'purpose_mismatch',
        riskScore: 5,
      };
    }

    // Additional security checks
    let riskScore = 0;

    // Check User-Agent consistency
    if (tokenData.userAgent && options.userAgent) {
      if (tokenData.userAgent !== options.userAgent) {
        riskScore += 2;
      }
    }

    // Check IP address consistency
    if (tokenData.ipAddress && options.ipAddress) {
      if (tokenData.ipAddress !== options.ipAddress) {
        riskScore += 3;
      }
    }

    // Risk assessment
    if (riskScore > 5) {
      this.metrics.suspiciousActivity++;
      this.emit('suspicious_csrf_activity', {
        userId,
        token: token.substring(0, 8) + '...',
        riskScore,
        reason: 'High risk validation',
      });
    }

    // Mark token as used (except for WebSocket tokens which can be reused)
    if (options.purpose !== 'websocket') {
      tokenData.used = true;
    }

    this.metrics.tokensValidated++;
    this.metrics.lastUpdated = new Date();

    return {
      valid: true,
      token: tokenData,
      riskScore,
    };
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString('hex');
  }

  private createCookie(token: string, expiresAt: number): string {
    const expires = new Date(expiresAt).toUTCString();

    let cookie = `${this.config.cookieName}=${token}; `;
    cookie += `Expires=${expires}; `;
    cookie += `Path=/; `;
    cookie += `SameSite=${this.config.sameSite}; `;
    cookie += 'HttpOnly; ';

    if (this.config.secure) {
      cookie += 'Secure; ';
    }

    return cookie;
  }

  private extractIP(request: any): string | undefined {
    if (!request?.headers) return undefined;

    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }

  // Token management
  revokeToken(token: string): boolean {
    const tokenData = this.tokens.get(token);
    if (!tokenData) return false;

    // Remove from tokens map
    this.tokens.delete(token);

    // Remove from user tokens
    const userTokenSet = this.userTokens.get(tokenData.userId);
    if (userTokenSet) {
      userTokenSet.delete(token);
      if (userTokenSet.size === 0) {
        this.userTokens.delete(tokenData.userId);
      }
    }

    this.emit('token_revoked', {
      userId: tokenData.userId,
      tokenId: token.substring(0, 8) + '...',
      purpose: tokenData.purpose,
    });

    return true;
  }

  revokeUserTokens(userId: string): number {
    const userTokenSet = this.userTokens.get(userId);
    if (!userTokenSet) return 0;

    let revoked = 0;
    for (const token of userTokenSet) {
      if (this.tokens.delete(token)) {
        revoked++;
      }
    }

    this.userTokens.delete(userId);

    this.emit('user_tokens_revoked', { userId, count: revoked });
    return revoked;
  }

  // Wedding-specific token management
  revokeWeddingTokens(weddingId: string): number {
    let revoked = 0;

    for (const [token, tokenData] of this.tokens.entries()) {
      if (tokenData.weddingId === weddingId) {
        this.revokeToken(token);
        revoked++;
      }
    }

    this.emit('wedding_tokens_revoked', { weddingId, count: revoked });
    return revoked;
  }

  // Cleanup and maintenance
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.config.cleanupInterval * 1000);
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.revokeToken(token);
        cleaned++;
      }
    }

    this.metrics.lastCleanup = new Date();

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired CSRF tokens`);
      this.emit('tokens_cleaned', { count: cleaned });
    }
  }

  // Metrics and monitoring
  getMetrics(): CSRFMetrics {
    return { ...this.metrics };
  }

  getTokenStats(): {
    total: number;
    byPurpose: Record<string, number>;
    byUser: Record<string, number>;
    expired: number;
  } {
    const stats = {
      total: this.tokens.size,
      byPurpose: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      expired: 0,
    };

    const now = Date.now();

    for (const tokenData of this.tokens.values()) {
      // Count by purpose
      stats.byPurpose[tokenData.purpose] =
        (stats.byPurpose[tokenData.purpose] || 0) + 1;

      // Count by user
      stats.byUser[tokenData.userId] =
        (stats.byUser[tokenData.userId] || 0) + 1;

      // Count expired
      if (now > tokenData.expiresAt) {
        stats.expired++;
      }
    }

    return stats;
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const metrics = this.getMetrics();
    const stats = this.getTokenStats();

    // Check for excessive expired tokens
    if (stats.expired > stats.total * 0.1) {
      return {
        status: 'degraded',
        details: {
          warning: 'High number of expired tokens',
          expired: stats.expired,
          total: stats.total,
        },
      };
    }

    // Check for high rejection rate
    const totalValidations = metrics.tokensValidated + metrics.tokensRejected;
    const rejectionRate =
      totalValidations > 0 ? metrics.tokensRejected / totalValidations : 0;

    if (rejectionRate > 0.1) {
      // 10% rejection rate threshold
      return {
        status: 'degraded',
        details: {
          warning: 'High token rejection rate',
          rejectionRate,
          totalValidations,
        },
      };
    }

    // Check for suspicious activity
    if (
      metrics.suspiciousActivity > 0 &&
      metrics.suspiciousActivity > totalValidations * 0.05
    ) {
      return {
        status: 'degraded',
        details: {
          warning: 'High suspicious activity',
          suspiciousActivity: metrics.suspiciousActivity,
          totalValidations,
        },
      };
    }

    return {
      status: 'healthy',
      details: {
        metrics,
        stats,
        rejectionRate,
        lastCleanup: metrics.lastCleanup,
      },
    };
  }

  // Shutdown
  async shutdown(): Promise<void> {
    console.log('Shutting down CSRF protection manager...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all tokens
    this.tokens.clear();
    this.userTokens.clear();

    console.log('CSRF protection manager shutdown complete');
  }
}
