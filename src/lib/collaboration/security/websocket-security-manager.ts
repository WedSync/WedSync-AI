// WS-342: Real-Time Wedding Collaboration - WebSocket Security Manager
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import crypto from 'crypto';

interface SecurityConfig {
  jwtSecret: string;
  tokenExpiryTime: number; // seconds
  maxConnectionsPerUser: number;
  maxConnectionsPerIP: number;
  rateLimitWindow: number; // seconds
  rateLimitMaxRequests: number;
  bruteForceMaxAttempts: number;
  bruteForceWindow: number; // seconds
  enableDDoSProtection: boolean;
  enableCSRFProtection: boolean;
  allowedOrigins: string[];
  blockedIPs: string[];
  requireSSL: boolean;
}

interface AuthenticationToken {
  userId: string;
  weddingId: string;
  sessionId: string;
  permissions: WeddingPermissions;
  role: string;
  expiresAt: number;
  issued: number;
}

interface WeddingPermissions {
  can_edit_timeline: boolean;
  can_edit_budget: boolean;
  can_assign_vendors: boolean;
  can_manage_guests: boolean;
  can_edit_documents: boolean;
  can_upload_photos: boolean;
  can_manage_tasks: boolean;
  can_send_messages: boolean;
  can_moderate: boolean;
}

interface SecurityContext {
  connectionId: string;
  userId: string;
  weddingId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  permissions: WeddingPermissions;
  role: string;
  isAuthenticated: boolean;
  lastActivity: Date;
  riskScore: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface SecurityEvent {
  id: string;
  type:
    | 'auth_success'
    | 'auth_failure'
    | 'rate_limit_exceeded'
    | 'suspicious_activity'
    | 'ddos_detected';
  userId?: string;
  ipAddress: string;
  timestamp: Date;
  details: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class WebSocketSecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private ipConnectionCount: Map<string, number> = new Map();
  private userConnectionCount: Map<string, number> = new Map();
  private authFailures: Map<string, number> = new Map();
  private blockedConnections: Set<string> = new Set();
  private securityContexts: Map<string, SecurityContext> = new Map();
  private securityEvents: SecurityEvent[] = [];

  // Security monitoring intervals
  private cleanupInterval: NodeJS.Timeout | null = null;
  private securityScanInterval: NodeJS.Timeout | null = null;

  constructor(config: SecurityConfig) {
    super();
    
    // 🔒 SECURITY: Validate JWT_SECRET before starting websocket security
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      const errorMsg = '🚨 CRITICAL SECURITY ERROR: JWT_SECRET not configured for websocket security manager';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    this.config = {
      jwtSecret: jwtSecret,
      tokenExpiryTime: 24 * 60 * 60, // 24 hours
      maxConnectionsPerUser: 5,
      maxConnectionsPerIP: 20,
      rateLimitWindow: 60, // 1 minute
      rateLimitMaxRequests: 30,
      bruteForceMaxAttempts: 5,
      bruteForceWindow: 300, // 5 minutes
      enableDDoSProtection: true,
      enableCSRFProtection: true,
      allowedOrigins: [
        'https://app.wedsync.com',
        'https://staging.wedsync.com',
      ],
      blockedIPs: [],
      requireSSL: true,
      ...config,
    };

    this.startSecurityMonitoring();
  }

  // Authenticate WebSocket connection
  async authenticateConnection(
    socket: WebSocket,
    request: any,
    token?: string,
  ): Promise<{
    success: boolean;
    context?: SecurityContext;
    error?: string;
    closeCode?: number;
  }> {
    try {
      const ipAddress = this.extractIPAddress(request);
      const userAgent = request.headers['user-agent'] || 'unknown';
      const origin = request.headers['origin'];

      // Security pre-checks
      const preCheckResult = this.performSecurityPreChecks(ipAddress, origin);
      if (!preCheckResult.allowed) {
        this.recordSecurityEvent(
          'auth_failure',
          undefined,
          ipAddress,
          {
            reason: preCheckResult.reason,
            userAgent,
          },
          'high',
        );

        return {
          success: false,
          error: preCheckResult.reason,
          closeCode: 1008, // Policy Violation
        };
      }

      // Extract and validate token
      const authToken = token || this.extractTokenFromRequest(request);
      if (!authToken) {
        this.incrementAuthFailures(ipAddress);
        return {
          success: false,
          error: 'No authentication token provided',
          closeCode: 1008,
        };
      }

      // Verify JWT token
      const tokenVerification = await this.verifyAuthToken(authToken);
      if (!tokenVerification.valid || !tokenVerification.payload) {
        this.incrementAuthFailures(ipAddress);
        this.recordSecurityEvent(
          'auth_failure',
          undefined,
          ipAddress,
          {
            reason: 'Invalid token',
            token: authToken.substring(0, 20) + '...',
          },
          'medium',
        );

        return {
          success: false,
          error: tokenVerification.error || 'Invalid token',
          closeCode: 1008,
        };
      }

      const payload = tokenVerification.payload as AuthenticationToken;

      // Check connection limits
      const connectionLimitCheck = this.checkConnectionLimits(
        payload.userId,
        ipAddress,
      );
      if (!connectionLimitCheck.allowed) {
        return {
          success: false,
          error: connectionLimitCheck.reason,
          closeCode: 1013, // Try Again Later
        };
      }

      // Validate permissions for wedding access
      const permissionCheck = await this.validateWeddingPermissions(
        payload.userId,
        payload.weddingId,
        payload.permissions,
      );
      if (!permissionCheck.valid) {
        return {
          success: false,
          error: permissionCheck.error,
          closeCode: 1008,
        };
      }

      // Generate connection ID
      const connectionId = this.generateSecureConnectionId();

      // Create security context
      const securityContext: SecurityContext = {
        connectionId,
        userId: payload.userId,
        weddingId: payload.weddingId,
        sessionId: payload.sessionId,
        ipAddress,
        userAgent,
        permissions: payload.permissions,
        role: payload.role,
        isAuthenticated: true,
        lastActivity: new Date(),
        riskScore: this.calculateRiskScore(ipAddress, payload.userId),
      };

      // Store security context
      this.securityContexts.set(connectionId, securityContext);

      // Update connection counts
      this.incrementConnectionCounts(payload.userId, ipAddress);

      // Record successful authentication
      this.recordSecurityEvent(
        'auth_success',
        payload.userId,
        ipAddress,
        {
          weddingId: payload.weddingId,
          role: payload.role,
          sessionId: payload.sessionId,
        },
        'low',
      );

      // Clear auth failures for this IP
      this.authFailures.delete(ipAddress);

      return { success: true, context: securityContext };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
        closeCode: 1011, // Internal Error
      };
    }
  }

  // Validate message permissions before processing
  async validateMessagePermissions(
    connectionId: string,
    messageType: string,
    messageData: any,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const context = this.securityContexts.get(connectionId);
      if (!context || !context.isAuthenticated) {
        return { allowed: false, reason: 'Not authenticated' };
      }

      // Update last activity
      context.lastActivity = new Date();

      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(context.ipAddress);
      if (!rateLimitResult.allowed) {
        this.recordSecurityEvent(
          'rate_limit_exceeded',
          context.userId,
          context.ipAddress,
          {
            messageType,
            attempts: rateLimitResult.attempts,
          },
          'medium',
        );

        return { allowed: false, reason: 'Rate limit exceeded' };
      }

      // Validate message type permissions
      const permissionResult = this.checkMessageTypePermissions(
        messageType,
        context.permissions,
        context.role,
      );
      if (!permissionResult.allowed) {
        return { allowed: false, reason: permissionResult.reason };
      }

      // Additional security checks for sensitive operations
      if (this.isSensitiveOperation(messageType)) {
        const sensitiveCheckResult = await this.performSensitiveOperationChecks(
          context,
          messageType,
          messageData,
        );
        if (!sensitiveCheckResult.allowed) {
          return { allowed: false, reason: sensitiveCheckResult.reason };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Permission validation error:', error);
      return { allowed: false, reason: 'Permission validation failed' };
    }
  }

  // Handle connection closure and cleanup
  async handleConnectionClosure(connectionId: string): Promise<void> {
    try {
      const context = this.securityContexts.get(connectionId);
      if (context) {
        // Decrement connection counts
        this.decrementConnectionCounts(context.userId, context.ipAddress);

        // Remove security context
        this.securityContexts.delete(connectionId);

        // Log disconnection
        this.recordSecurityEvent(
          'auth_success',
          context.userId,
          context.ipAddress,
          {
            event: 'disconnection',
            sessionDuration: Date.now() - context.lastActivity.getTime(),
          },
          'low',
        );
      }
    } catch (error) {
      console.error('Error handling connection closure:', error);
    }
  }

  // Check if IP or user should be blocked
  async checkSecurityStatus(
    ipAddress: string,
    userId?: string,
  ): Promise<{
    blocked: boolean;
    reason?: string;
    blockedUntil?: Date;
  }> {
    // Check IP blocks
    if (
      this.config.blockedIPs.includes(ipAddress) ||
      this.blockedConnections.has(ipAddress)
    ) {
      return {
        blocked: true,
        reason: 'IP address blocked',
      };
    }

    // Check brute force protection
    const authFailureCount = this.authFailures.get(ipAddress) || 0;
    if (authFailureCount >= this.config.bruteForceMaxAttempts) {
      const blockedUntil = new Date(
        Date.now() + this.config.bruteForceWindow * 1000,
      );
      return {
        blocked: true,
        reason: 'Too many failed authentication attempts',
        blockedUntil,
      };
    }

    // Check if user has suspicious activity
    if (userId) {
      const userContexts = Array.from(this.securityContexts.values()).filter(
        (ctx) => ctx.userId === userId,
      );

      const avgRiskScore =
        userContexts.reduce((sum, ctx) => sum + ctx.riskScore, 0) /
        userContexts.length;
      if (avgRiskScore > 0.8) {
        return {
          blocked: true,
          reason: 'Suspicious activity detected',
        };
      }
    }

    return { blocked: false };
  }

  // Generate secure session token
  generateSessionToken(
    userId: string,
    weddingId: string,
    permissions: WeddingPermissions,
    role: string,
  ): { token: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.tokenExpiryTime;

    const payload: AuthenticationToken = {
      userId,
      weddingId,
      sessionId: crypto.randomUUID(),
      permissions,
      role,
      expiresAt,
      issued: now,
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.tokenExpiryTime,
    });

    return {
      token,
      expiresAt: new Date(expiresAt * 1000),
    };
  }

  // Get security metrics and status
  getSecurityMetrics(): {
    activeConnections: number;
    totalUsers: number;
    blockedIPs: number;
    recentSecurityEvents: SecurityEvent[];
    riskDistribution: { low: number; medium: number; high: number };
  } {
    const activeConnections = this.securityContexts.size;
    const totalUsers = new Set(
      Array.from(this.securityContexts.values()).map((ctx) => ctx.userId),
    ).size;
    const blockedIPs =
      this.blockedConnections.size + this.config.blockedIPs.length;

    const recentEvents = this.securityEvents
      .filter(
        (event) => Date.now() - event.timestamp.getTime() < 60 * 60 * 1000,
      ) // Last hour
      .slice(-50); // Last 50 events

    const contexts = Array.from(this.securityContexts.values());
    const riskDistribution = contexts.reduce(
      (acc, ctx) => {
        if (ctx.riskScore < 0.3) acc.low++;
        else if (ctx.riskScore < 0.7) acc.medium++;
        else acc.high++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 },
    );

    return {
      activeConnections,
      totalUsers,
      blockedIPs,
      recentSecurityEvents: recentEvents,
      riskDistribution,
    };
  }

  // Block IP address
  async blockIP(
    ipAddress: string,
    reason: string,
    duration?: number,
  ): Promise<void> {
    this.blockedConnections.add(ipAddress);

    // If duration specified, schedule unblock
    if (duration) {
      setTimeout(() => {
        this.blockedConnections.delete(ipAddress);
        this.emit('ip_unblocked', { ipAddress });
      }, duration * 1000);
    }

    this.recordSecurityEvent(
      'suspicious_activity',
      undefined,
      ipAddress,
      {
        action: 'ip_blocked',
        reason,
        duration,
      },
      'high',
    );

    // Close existing connections from this IP
    for (const [connectionId, context] of this.securityContexts.entries()) {
      if (context.ipAddress === ipAddress) {
        this.emit('force_disconnect', { connectionId, reason: 'IP blocked' });
      }
    }

    this.emit('ip_blocked', { ipAddress, reason, duration });
  }

  // Shutdown security manager
  async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket security manager...');

    // Clear intervals
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.securityScanInterval) clearInterval(this.securityScanInterval);

    // Clear all maps
    this.rateLimitMap.clear();
    this.ipConnectionCount.clear();
    this.userConnectionCount.clear();
    this.authFailures.clear();
    this.securityContexts.clear();

    console.log('WebSocket security manager shutdown complete');
  }

  // Private helper methods
  private startSecurityMonitoring(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredEntries();
      },
      5 * 60 * 1000,
    );

    // Security scan every minute
    this.securityScanInterval = setInterval(() => {
      this.performSecurityScan();
    }, 60 * 1000);
  }

  private extractIPAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      '0.0.0.0'
    );
  }

  private extractTokenFromRequest(request: any): string | null {
    // Check URL parameters
    const url = new URL(request.url, 'ws://localhost');
    let token = url.searchParams.get('token');

    if (!token) {
      // Check headers
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    return token;
  }

  private performSecurityPreChecks(
    ipAddress: string,
    origin?: string,
  ): { allowed: boolean; reason?: string } {
    // Check SSL requirement
    if (this.config.requireSSL && origin && !origin.startsWith('https://')) {
      return { allowed: false, reason: 'SSL required' };
    }

    // Check allowed origins
    if (origin && this.config.allowedOrigins.length > 0) {
      if (!this.config.allowedOrigins.includes(origin)) {
        return { allowed: false, reason: 'Origin not allowed' };
      }
    }

    // Check blocked IPs
    if (
      this.config.blockedIPs.includes(ipAddress) ||
      this.blockedConnections.has(ipAddress)
    ) {
      return { allowed: false, reason: 'IP address blocked' };
    }

    // Check DDoS protection
    if (this.config.enableDDoSProtection) {
      const ipConnections = this.ipConnectionCount.get(ipAddress) || 0;
      if (ipConnections >= this.config.maxConnectionsPerIP) {
        return { allowed: false, reason: 'Too many connections from IP' };
      }
    }

    return { allowed: true };
  }

  private async verifyAuthToken(
    token: string,
  ): Promise<{ valid: boolean; payload?: any; error?: string }> {
    try {
      const payload = jwt.verify(
        token,
        this.config.jwtSecret,
      ) as AuthenticationToken;

      // Check expiration
      if (payload.expiresAt < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      } else if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      } else {
        return { valid: false, error: 'Token verification failed' };
      }
    }
  }

  private checkConnectionLimits(
    userId: string,
    ipAddress: string,
  ): { allowed: boolean; reason?: string } {
    const userConnections = this.userConnectionCount.get(userId) || 0;
    if (userConnections >= this.config.maxConnectionsPerUser) {
      return {
        allowed: false,
        reason: 'Maximum connections per user exceeded',
      };
    }

    const ipConnections = this.ipConnectionCount.get(ipAddress) || 0;
    if (ipConnections >= this.config.maxConnectionsPerIP) {
      return { allowed: false, reason: 'Maximum connections per IP exceeded' };
    }

    return { allowed: true };
  }

  private async validateWeddingPermissions(
    userId: string,
    weddingId: string,
    permissions: WeddingPermissions,
  ): Promise<{ valid: boolean; error?: string }> {
    // In a real implementation, this would validate against the database
    // For now, assume permissions are valid if they exist
    if (!permissions) {
      return { valid: false, error: 'No permissions provided' };
    }

    return { valid: true };
  }

  private generateSecureConnectionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private calculateRiskScore(ipAddress: string, userId: string): number {
    let riskScore = 0;

    // Check auth failures
    const authFailures = this.authFailures.get(ipAddress) || 0;
    riskScore += Math.min(authFailures * 0.2, 0.5);

    // Check connection frequency
    const userConnections = this.userConnectionCount.get(userId) || 0;
    if (userConnections > this.config.maxConnectionsPerUser * 0.8) {
      riskScore += 0.3;
    }

    // Geographic anomalies (simplified)
    // In a real implementation, this would check against user's typical locations
    if (this.isUnusualIPPattern(ipAddress)) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0);
  }

  private checkRateLimit(ipAddress: string): {
    allowed: boolean;
    attempts?: number;
  } {
    const now = Date.now();
    const entry = this.rateLimitMap.get(ipAddress);

    if (!entry) {
      this.rateLimitMap.set(ipAddress, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow * 1000,
        blocked: false,
      });
      return { allowed: true };
    }

    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.config.rateLimitWindow * 1000;
      entry.blocked = false;
      return { allowed: true };
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.config.rateLimitMaxRequests) {
      entry.blocked = true;
      return { allowed: false, attempts: entry.count };
    }

    return { allowed: true, attempts: entry.count };
  }

  private checkMessageTypePermissions(
    messageType: string,
    permissions: WeddingPermissions,
    role: string,
  ): { allowed: boolean; reason?: string } {
    const permissionMap: { [key: string]: keyof WeddingPermissions } = {
      timeline_update: 'can_edit_timeline',
      budget_change: 'can_edit_budget',
      vendor_assignment: 'can_assign_vendors',
      guest_update: 'can_manage_guests',
      document_edit: 'can_edit_documents',
      photo_upload: 'can_upload_photos',
      task_completion: 'can_manage_tasks',
      message_sent: 'can_send_messages',
      permission_update: 'can_moderate',
    };

    const requiredPermission = permissionMap[messageType];

    if (requiredPermission && !permissions[requiredPermission]) {
      return {
        allowed: false,
        reason: `Insufficient permissions for ${messageType}`,
      };
    }

    return { allowed: true };
  }

  private isSensitiveOperation(messageType: string): boolean {
    const sensitiveOps = [
      'permission_update',
      'user_role_change',
      'financial_data_update',
      'vendor_assignment',
      'guest_data_export',
    ];
    return sensitiveOps.includes(messageType);
  }

  private async performSensitiveOperationChecks(
    context: SecurityContext,
    messageType: string,
    messageData: any,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check risk score for sensitive operations
    if (context.riskScore > 0.5) {
      return {
        allowed: false,
        reason: 'Risk score too high for sensitive operation',
      };
    }

    // Check for recent activity pattern
    const timeSinceLastActivity = Date.now() - context.lastActivity.getTime();
    if (timeSinceLastActivity > 30 * 60 * 1000) {
      // 30 minutes
      return {
        allowed: false,
        reason: 'Session inactive too long for sensitive operation',
      };
    }

    return { allowed: true };
  }

  private incrementConnectionCounts(userId: string, ipAddress: string): void {
    this.userConnectionCount.set(
      userId,
      (this.userConnectionCount.get(userId) || 0) + 1,
    );
    this.ipConnectionCount.set(
      ipAddress,
      (this.ipConnectionCount.get(ipAddress) || 0) + 1,
    );
  }

  private decrementConnectionCounts(userId: string, ipAddress: string): void {
    const userCount = this.userConnectionCount.get(userId) || 0;
    if (userCount <= 1) {
      this.userConnectionCount.delete(userId);
    } else {
      this.userConnectionCount.set(userId, userCount - 1);
    }

    const ipCount = this.ipConnectionCount.get(ipAddress) || 0;
    if (ipCount <= 1) {
      this.ipConnectionCount.delete(ipAddress);
    } else {
      this.ipConnectionCount.set(ipAddress, ipCount - 1);
    }
  }

  private incrementAuthFailures(ipAddress: string): void {
    const failures = this.authFailures.get(ipAddress) || 0;
    this.authFailures.set(ipAddress, failures + 1);

    // Auto-block if too many failures
    if (failures + 1 >= this.config.bruteForceMaxAttempts) {
      this.blockIP(
        ipAddress,
        'Brute force protection',
        this.config.bruteForceWindow,
      );
    }
  }

  private recordSecurityEvent(
    type: SecurityEvent['type'],
    userId: string | undefined,
    ipAddress: string,
    details: any,
    riskLevel: SecurityEvent['riskLevel'],
  ): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      userId,
      ipAddress,
      timestamp: new Date(),
      details,
      riskLevel,
    };

    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    this.emit('security_event', event);
  }

  private isUnusualIPPattern(ipAddress: string): boolean {
    // Simplified check - in reality would use GeoIP and user history
    return false;
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    // Clean rate limit entries
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(ip);
      }
    }

    // Clean auth failures
    for (const [ip, count] of this.authFailures.entries()) {
      const lastFailureTime = now - this.config.bruteForceWindow * 1000;
      if (count === 0 || now > lastFailureTime) {
        this.authFailures.delete(ip);
      }
    }

    // Clean old security events
    const cutoff = new Date(now - 24 * 60 * 60 * 1000); // 24 hours
    this.securityEvents = this.securityEvents.filter(
      (event) => event.timestamp > cutoff,
    );
  }

  private performSecurityScan(): void {
    // Check for DDoS patterns
    if (this.config.enableDDoSProtection) {
      this.detectDDoSPatterns();
    }

    // Check for suspicious user behavior
    this.detectSuspiciousActivity();

    // Check for connection anomalies
    this.detectConnectionAnomalies();
  }

  private detectDDoSPatterns(): void {
    const ipCounts = Array.from(this.ipConnectionCount.entries());
    const suspiciousIPs = ipCounts.filter(
      ([ip, count]) => count > this.config.maxConnectionsPerIP * 0.8,
    );

    for (const [ip, count] of suspiciousIPs) {
      this.recordSecurityEvent(
        'ddos_detected',
        undefined,
        ip,
        {
          connectionCount: count,
          threshold: this.config.maxConnectionsPerIP,
        },
        'high',
      );
    }
  }

  private detectSuspiciousActivity(): void {
    for (const context of this.securityContexts.values()) {
      if (context.riskScore > 0.8) {
        this.recordSecurityEvent(
          'suspicious_activity',
          context.userId,
          context.ipAddress,
          {
            riskScore: context.riskScore,
            lastActivity: context.lastActivity,
          },
          'medium',
        );
      }
    }
  }

  private detectConnectionAnomalies(): void {
    const totalConnections = this.securityContexts.size;
    const averageConnections =
      totalConnections / Math.max(this.ipConnectionCount.size, 1);

    // Alert if average connections per IP is unusually high
    if (averageConnections > 10) {
      this.emit('connection_anomaly', {
        totalConnections,
        uniqueIPs: this.ipConnectionCount.size,
        averagePerIP: averageConnections,
      });
    }
  }
}
