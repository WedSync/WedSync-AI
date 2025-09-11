// WS-342: Real-Time Wedding Collaboration - Session Manager
// Team B Backend Development - Batch 1 Round 1

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { supabase } from '@/lib/supabase';

interface SessionConfig {
  sessionTTL: number; // in seconds
  extendOnActivity: boolean;
  maxSessionsPerUser: number;
  secureCookies: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  cleanupInterval: number; // in seconds
  inactivityTimeout: number; // in seconds
  sessionRotationInterval: number; // in seconds
}

interface CollaborationSession {
  id: string;
  userId: string;
  weddingId: string;
  sessionToken: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  permissions: WeddingPermissions;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
  metadata: {
    role: 'couple' | 'vendor' | 'planner' | 'guest' | 'admin';
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    location?: string;
    timezone?: string;
  };
}

interface WeddingPermissions {
  canEditTimeline: boolean;
  canEditBudget: boolean;
  canEditGuests: boolean;
  canEditVendors: boolean;
  canViewFinancials: boolean;
  canManageFiles: boolean;
  canInviteUsers: boolean;
  isOwner: boolean;
  restrictedSections: string[];
  customPermissions: Record<string, boolean>;
}

interface SessionMetrics {
  activeSessions: number;
  totalSessions: number;
  expiredSessions: number;
  revokedSessions: number;
  concurrentUsers: number;
  avgSessionDuration: number;
  sessionRotations: number;
  suspiciousActivity: number;
  lastCleanup: Date;
  lastUpdated: Date;
}

interface SessionValidationResult {
  valid: boolean;
  session?: CollaborationSession;
  needsRotation?: boolean;
  error?: string;
  riskScore?: number;
}

export class SessionManager extends EventEmitter {
  private config: SessionConfig;
  private sessions: Map<string, CollaborationSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> session IDs
  private weddingSessions: Map<string, Set<string>> = new Map(); // weddingId -> session IDs
  private metrics: SessionMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    super();

    this.config = {
      sessionTTL: 24 * 60 * 60, // 24 hours
      extendOnActivity: true,
      maxSessionsPerUser: 5,
      secureCookies: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      cleanupInterval: 300, // 5 minutes
      inactivityTimeout: 30 * 60, // 30 minutes
      sessionRotationInterval: 4 * 60 * 60, // 4 hours
      ...config,
    };

    this.metrics = {
      activeSessions: 0,
      totalSessions: 0,
      expiredSessions: 0,
      revokedSessions: 0,
      concurrentUsers: 0,
      avgSessionDuration: 0,
      sessionRotations: 0,
      suspiciousActivity: 0,
      lastCleanup: new Date(),
      lastUpdated: new Date(),
    };

    this.startBackgroundTasks();
  }

  // Wedding collaboration session creation
  async createCollaborationSession(
    userId: string,
    weddingId: string,
    request: any,
  ): Promise<{
    session: CollaborationSession;
    sessionToken: string;
    cookie: string;
  }> {
    // Check user session limit
    await this.enforceSessionLimit(userId);

    // Get user permissions for this wedding
    const permissions = await this.getWeddingPermissions(userId, weddingId);

    // Extract device and browser info
    const deviceInfo = this.extractDeviceInfo(request);

    const sessionId = crypto.randomUUID();
    const sessionToken = this.generateSessionToken();
    const now = Date.now();

    const session: CollaborationSession = {
      id: sessionId,
      userId,
      weddingId,
      sessionToken,
      deviceId: deviceInfo.deviceId,
      userAgent: request?.headers?.['user-agent'],
      ipAddress: this.extractIP(request),
      permissions,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.sessionTTL * 1000,
      isActive: true,
      metadata: {
        role: await this.getUserRole(userId, weddingId),
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        location: deviceInfo.location,
        timezone: request?.headers?.['x-timezone'],
      },
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Update tracking maps
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    if (!this.weddingSessions.has(weddingId)) {
      this.weddingSessions.set(weddingId, new Set());
    }
    this.weddingSessions.get(weddingId)!.add(sessionId);

    // Store in database for persistence
    await this.persistSession(session);

    // Update metrics
    this.metrics.activeSessions++;
    this.metrics.totalSessions++;
    this.updateConcurrentUsers();

    // Create secure cookie
    const cookie = this.createSessionCookie(sessionToken);

    this.emit('session_created', {
      sessionId,
      userId,
      weddingId,
      deviceType: session.metadata.deviceType,
      role: session.metadata.role,
    });

    return {
      session,
      sessionToken,
      cookie,
    };
  }

  // Session validation
  async validateSession(
    sessionToken: string,
    request?: any,
  ): Promise<SessionValidationResult> {
    // Find session by token
    const session = Array.from(this.sessions.values()).find(
      (s) => s.sessionToken === sessionToken,
    );

    if (!session) {
      return {
        valid: false,
        error: 'Session not found',
        riskScore: 8,
      };
    }

    // Check if session is active
    if (!session.isActive) {
      return {
        valid: false,
        error: 'Session is inactive',
        riskScore: 5,
      };
    }

    // Check expiration
    const now = Date.now();
    if (now > session.expiresAt) {
      await this.revokeSession(session.id);
      return {
        valid: false,
        error: 'Session expired',
        riskScore: 3,
      };
    }

    // Check inactivity timeout
    if (now - session.lastActivity > this.config.inactivityTimeout * 1000) {
      await this.revokeSession(session.id);
      return {
        valid: false,
        error: 'Session inactive too long',
        riskScore: 4,
      };
    }

    // Security checks
    let riskScore = 0;
    const currentIP = this.extractIP(request);
    const currentUserAgent = request?.headers?.['user-agent'];

    // Check IP address consistency
    if (session.ipAddress && currentIP && session.ipAddress !== currentIP) {
      riskScore += 4;
    }

    // Check User-Agent consistency
    if (
      session.userAgent &&
      currentUserAgent &&
      session.userAgent !== currentUserAgent
    ) {
      riskScore += 3;
    }

    // Check if session needs rotation
    const needsRotation =
      now - session.createdAt > this.config.sessionRotationInterval * 1000;

    // Update activity
    if (this.config.extendOnActivity) {
      await this.updateSessionActivity(session.id);
    }

    if (riskScore > 5) {
      this.metrics.suspiciousActivity++;
      this.emit('suspicious_session_activity', {
        sessionId: session.id,
        userId: session.userId,
        riskScore,
        reasons: {
          ipChanged: session.ipAddress !== currentIP,
          userAgentChanged: session.userAgent !== currentUserAgent,
        },
      });
    }

    return {
      valid: true,
      session,
      needsRotation,
      riskScore,
    };
  }

  // Session activity update
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = Date.now();
    session.lastActivity = now;

    // Extend expiration if configured
    if (this.config.extendOnActivity) {
      session.expiresAt = now + this.config.sessionTTL * 1000;
    }

    // Update in database
    await this.updateSessionInDB(sessionId, {
      last_activity: new Date(session.lastActivity),
      expires_at: new Date(session.expiresAt),
    });

    return true;
  }

  // Session rotation
  async rotateSession(sessionId: string): Promise<{
    newSessionToken: string;
    cookie: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newSessionToken = this.generateSessionToken();
    session.sessionToken = newSessionToken;
    session.lastActivity = Date.now();

    // Update in database
    await this.updateSessionInDB(sessionId, {
      session_token: newSessionToken,
      last_activity: new Date(session.lastActivity),
    });

    this.metrics.sessionRotations++;

    this.emit('session_rotated', {
      sessionId,
      userId: session.userId,
      weddingId: session.weddingId,
    });

    return {
      newSessionToken,
      cookie: this.createSessionCookie(newSessionToken),
    };
  }

  // Session revocation
  async revokeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Mark as inactive
    session.isActive = false;

    // Remove from tracking maps
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    const weddingSessionSet = this.weddingSessions.get(session.weddingId);
    if (weddingSessionSet) {
      weddingSessionSet.delete(sessionId);
      if (weddingSessionSet.size === 0) {
        this.weddingSessions.delete(session.weddingId);
      }
    }

    // Remove from memory
    this.sessions.delete(sessionId);

    // Update in database
    await this.updateSessionInDB(sessionId, {
      is_active: false,
      revoked_at: new Date(),
    });

    this.metrics.activeSessions--;
    this.metrics.revokedSessions++;
    this.updateConcurrentUsers();

    this.emit('session_revoked', {
      sessionId,
      userId: session.userId,
      weddingId: session.weddingId,
      reason: 'manual_revocation',
    });

    return true;
  }

  // User session management
  async revokeUserSessions(
    userId: string,
    excludeSessionId?: string,
  ): Promise<number> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) return 0;

    let revokedCount = 0;
    const sessionIds = Array.from(userSessionSet);

    for (const sessionId of sessionIds) {
      if (sessionId !== excludeSessionId) {
        if (await this.revokeSession(sessionId)) {
          revokedCount++;
        }
      }
    }

    this.emit('user_sessions_revoked', { userId, count: revokedCount });
    return revokedCount;
  }

  // Wedding session management
  async revokeWeddingSessions(weddingId: string): Promise<number> {
    const weddingSessionSet = this.weddingSessions.get(weddingId);
    if (!weddingSessionSet) return 0;

    let revokedCount = 0;
    const sessionIds = Array.from(weddingSessionSet);

    for (const sessionId of sessionIds) {
      if (await this.revokeSession(sessionId)) {
        revokedCount++;
      }
    }

    this.emit('wedding_sessions_revoked', { weddingId, count: revokedCount });
    return revokedCount;
  }

  // Session querying
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.isActive,
    );
  }

  getUserSessions(userId: string): CollaborationSession[] {
    const userSessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(userSessionIds)
      .map((id) => this.sessions.get(id))
      .filter(
        (session) => session && session.isActive,
      ) as CollaborationSession[];
  }

  getWeddingSessions(weddingId: string): CollaborationSession[] {
    const weddingSessionIds = this.weddingSessions.get(weddingId) || new Set();
    return Array.from(weddingSessionIds)
      .map((id) => this.sessions.get(id))
      .filter(
        (session) => session && session.isActive,
      ) as CollaborationSession[];
  }

  // Helper methods
  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessions = this.getUserSessions(userId);

    if (userSessions.length >= this.config.maxSessionsPerUser) {
      // Revoke oldest session
      const oldestSession = userSessions.sort(
        (a, b) => a.lastActivity - b.lastActivity,
      )[0];

      if (oldestSession) {
        await this.revokeSession(oldestSession.id);
      }
    }
  }

  private async getWeddingPermissions(
    userId: string,
    weddingId: string,
  ): Promise<WeddingPermissions> {
    // Query database for user permissions in this wedding
    const { data: permissions } = await supabase
      .from('wedding_collaborators')
      .select('permissions, role')
      .eq('user_id', userId)
      .eq('wedding_id', weddingId)
      .single();

    if (!permissions) {
      // Default permissions for non-collaborators
      return {
        canEditTimeline: false,
        canEditBudget: false,
        canEditGuests: false,
        canEditVendors: false,
        canViewFinancials: false,
        canManageFiles: false,
        canInviteUsers: false,
        isOwner: false,
        restrictedSections: [],
        customPermissions: {},
      };
    }

    return permissions.permissions || {};
  }

  private async getUserRole(
    userId: string,
    weddingId: string,
  ): Promise<'couple' | 'vendor' | 'planner' | 'guest' | 'admin'> {
    const { data: collaborator } = await supabase
      .from('wedding_collaborators')
      .select('role')
      .eq('user_id', userId)
      .eq('wedding_id', weddingId)
      .single();

    return collaborator?.role || 'guest';
  }

  private extractDeviceInfo(request: any): {
    deviceId: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    location?: string;
  } {
    const userAgent = request?.headers?.['user-agent'] || '';

    // Simple device detection
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPad/.test(userAgent)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'mobile';
      }
    } else if (/Mozilla|Chrome|Safari|Firefox/.test(userAgent)) {
      deviceType = 'desktop';
    }

    // Simple browser detection
    let browser = 'unknown';
    if (/Chrome/.test(userAgent)) browser = 'chrome';
    else if (/Safari/.test(userAgent)) browser = 'safari';
    else if (/Firefox/.test(userAgent)) browser = 'firefox';
    else if (/Edge/.test(userAgent)) browser = 'edge';

    return {
      deviceId: crypto
        .createHash('sha256')
        .update(userAgent + (request?.headers?.['x-forwarded-for'] || ''))
        .digest('hex')
        .substring(0, 16),
      deviceType,
      browser,
      location: request?.headers?.['cf-ipcountry'],
    };
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

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private createSessionCookie(sessionToken: string): string {
    const expires = new Date(
      Date.now() + this.config.sessionTTL * 1000,
    ).toUTCString();

    let cookie = `wedsync-session=${sessionToken}; `;
    cookie += `Expires=${expires}; `;
    cookie += `Path=/; `;
    cookie += `SameSite=${this.config.sameSite}; `;
    cookie += 'HttpOnly; ';

    if (this.config.secureCookies) {
      cookie += 'Secure; ';
    }

    return cookie;
  }

  private updateConcurrentUsers(): void {
    const uniqueUsers = new Set();
    for (const session of this.sessions.values()) {
      if (session.isActive) {
        uniqueUsers.add(session.userId);
      }
    }
    this.metrics.concurrentUsers = uniqueUsers.size;
  }

  // Database operations
  private async persistSession(session: CollaborationSession): Promise<void> {
    await supabase.from('collaboration_sessions').insert({
      id: session.id,
      user_id: session.userId,
      wedding_id: session.weddingId,
      session_token: session.sessionToken,
      device_id: session.deviceId,
      user_agent: session.userAgent,
      ip_address: session.ipAddress,
      permissions: session.permissions,
      created_at: new Date(session.createdAt),
      last_activity: new Date(session.lastActivity),
      expires_at: new Date(session.expiresAt),
      is_active: session.isActive,
      metadata: session.metadata,
    });
  }

  private async updateSessionInDB(
    sessionId: string,
    updates: any,
  ): Promise<void> {
    await supabase
      .from('collaboration_sessions')
      .update(updates)
      .eq('id', sessionId);
  }

  // Background tasks
  private startBackgroundTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval * 1000);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isActive || now > session.expiresAt) {
        await this.revokeSession(sessionId);
        cleaned++;
      }
    }

    this.metrics.lastCleanup = new Date();

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
      this.emit('sessions_cleaned', { count: cleaned });
    }
  }

  // Metrics and monitoring
  getMetrics(): SessionMetrics {
    this.updateConcurrentUsers();
    return { ...this.metrics };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const metrics = this.getMetrics();

    // Check for too many active sessions (potential memory leak)
    if (metrics.activeSessions > 10000) {
      return {
        status: 'unhealthy',
        details: {
          error: 'Too many active sessions',
          activeSessions: metrics.activeSessions,
        },
      };
    }

    // Check for high suspicious activity
    const totalSessions = metrics.totalSessions;
    const suspiciousRate =
      totalSessions > 0 ? metrics.suspiciousActivity / totalSessions : 0;

    if (suspiciousRate > 0.1) {
      // 10% threshold
      return {
        status: 'degraded',
        details: { warning: 'High suspicious activity rate', suspiciousRate },
      };
    }

    return {
      status: 'healthy',
      details: { metrics },
    };
  }

  // Shutdown
  async shutdown(): Promise<void> {
    console.log('Shutting down session manager...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Revoke all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId);
    }

    console.log('Session manager shutdown complete');
  }
}
