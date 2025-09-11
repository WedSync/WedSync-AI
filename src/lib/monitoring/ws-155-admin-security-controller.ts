/**
 * WS-155: Admin Security Controller
 * HMAC-based security for admin endpoints with rate limiting and audit logging
 * Integrates with existing webhook HMAC verification patterns
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export interface AdminRequest {
  action: string;
  timestamp: number;
  metadata?: Record<string, any>;
  userId?: string;
  clientInfo?: {
    ip: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export interface AdminRequestResult {
  success: boolean;
  data?: any;
  error?: string;
  rateLimited?: boolean;
  executionTime?: number;
}

export interface AdminVerificationResult {
  valid: boolean;
  userId?: string;
  error?: string;
  timestamp?: Date;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  blockDurationMinutes: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  userId?: string;
  clientIp: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  executionTime: number;
  timestamp: Date;
  hmacVerified: boolean;
}

export type AdminPrivilegeLevel =
  | 'viewer'
  | 'operator'
  | 'admin'
  | 'super_admin';

interface AdminPermissions {
  [key: string]: AdminPrivilegeLevel[];
}

/**
 * Admin Security Controller
 * Handles HMAC verification, rate limiting, and audit logging for admin operations
 */
export class AdminSecurityController {
  private supabase: ReturnType<typeof createClient>;
  private rateLimitTracker = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private blockedIPs = new Map<string, number>(); // IP -> unblock time
  private readonly hmacAlgorithm = 'sha256';
  private readonly requestTimeoutMs = 5 * 60 * 1000; // 5 minutes

  // Rate limiting configuration
  private readonly rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100,
    blockDurationMinutes: 15,
  };

  // Admin permissions mapping
  private readonly adminPermissions: AdminPermissions = {
    // Viewer permissions
    get_system_metrics: ['viewer', 'operator', 'admin', 'super_admin'],
    get_health_status: ['viewer', 'operator', 'admin', 'super_admin'],
    get_alert_history: ['viewer', 'operator', 'admin', 'super_admin'],
    get_system_logs: ['viewer', 'operator', 'admin', 'super_admin'],

    // Operator permissions
    force_health_check: ['operator', 'admin', 'super_admin'],
    acknowledge_alert: ['operator', 'admin', 'super_admin'],
    reset_circuit_breaker: ['operator', 'admin', 'super_admin'],
    trigger_test_alert: ['operator', 'admin', 'super_admin'],

    // Admin permissions
    update_alert_config: ['admin', 'super_admin'],
    manage_notification_channels: ['admin', 'super_admin'],
    access_audit_logs: ['admin', 'super_admin'],
    manage_admin_users: ['admin', 'super_admin'],

    // Super Admin permissions
    system_shutdown: ['super_admin'],
    emergency_override: ['super_admin'],
    modify_security_settings: ['super_admin'],
    delete_audit_logs: ['super_admin'],
  };

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Generate HMAC signature for payload
   */
  generateHMAC(payload: string, secret: string): string {
    return crypto
      .createHmac(this.hmacAlgorithm, secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify HMAC signature using the same pattern as existing webhook manager
   */
  async verifyAdminRequest(
    payload: string,
    signature: string,
  ): Promise<AdminVerificationResult> {
    try {
      const secret = process.env.ADMIN_WEBHOOK_SECRET;
      if (!secret) {
        return {
          valid: false,
          error: 'Admin webhook secret not configured',
        };
      }

      // Generate expected signature
      const expectedSignature = this.generateHMAC(payload, secret);

      // Use timing-safe comparison (same as webhook manager)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid HMAC signature',
        };
      }

      // Parse payload to get request details
      let request: AdminRequest;
      try {
        request = JSON.parse(payload);
      } catch {
        return {
          valid: false,
          error: 'Invalid JSON payload',
        };
      }

      // Validate request timestamp to prevent replay attacks
      const timestampValidation = await this.validateRequestTimestamp(request);
      if (!timestampValidation.valid) {
        return timestampValidation;
      }

      return {
        valid: true,
        userId: request.userId,
        timestamp: new Date(request.timestamp),
      };
    } catch (error) {
      console.error('HMAC verification error:', error);
      return {
        valid: false,
        error: 'HMAC verification failed',
      };
    }
  }

  /**
   * Validate request timestamp to prevent replay attacks
   */
  async validateRequestTimestamp(
    request: AdminRequest,
  ): Promise<AdminVerificationResult> {
    const now = Date.now();
    const requestTime = request.timestamp;

    // Check if timestamp is within acceptable window
    if (Math.abs(now - requestTime) > this.requestTimeoutMs) {
      return {
        valid: false,
        error: 'Request timestamp outside acceptable window',
      };
    }

    // Check if this timestamp has been used before (replay attack prevention)
    const timestampHash = crypto
      .createHash('sha256')
      .update(
        `${requestTime}_${request.action}_${request.userId || 'anonymous'}`,
      )
      .digest('hex');

    const { data: existingRequest } = await this.supabase
      .from('admin_request_timestamps')
      .select('id')
      .eq('timestamp_hash', timestampHash)
      .single();

    if (existingRequest) {
      return {
        valid: false,
        error: 'Request timestamp already used (replay attack detected)',
      };
    }

    // Store timestamp hash to prevent replay
    await this.supabase.from('admin_request_timestamps').insert({
      timestamp_hash: timestampHash,
      timestamp: new Date(requestTime).toISOString(),
      action: request.action,
      user_id: request.userId,
      created_at: new Date().toISOString(),
    });

    return { valid: true };
  }

  /**
   * Check if client IP is rate limited
   */
  private isRateLimited(clientIp: string): boolean {
    const now = Date.now();

    // Check if IP is currently blocked
    const blockedUntil = this.blockedIPs.get(clientIp);
    if (blockedUntil && now < blockedUntil) {
      return true;
    }

    // Remove expired blocks
    if (blockedUntil && now >= blockedUntil) {
      this.blockedIPs.delete(clientIp);
    }

    // Check rate limit
    const rateLimit = this.rateLimitTracker.get(clientIp);
    if (!rateLimit) return false;

    // Reset counters if time window has passed
    if (now >= rateLimit.resetTime) {
      this.rateLimitTracker.delete(clientIp);
      return false;
    }

    return rateLimit.count >= this.rateLimitConfig.maxRequestsPerMinute;
  }

  /**
   * Record request for rate limiting
   */
  private recordRequest(clientIp: string): void {
    const now = Date.now();
    const resetTime = now + 60 * 1000; // 1 minute window

    const rateLimit = this.rateLimitTracker.get(clientIp);
    if (!rateLimit || now >= rateLimit.resetTime) {
      this.rateLimitTracker.set(clientIp, { count: 1, resetTime });
    } else {
      rateLimit.count++;

      // Block IP if rate limit exceeded
      if (rateLimit.count >= this.rateLimitConfig.maxRequestsPerMinute) {
        const blockUntil =
          now + this.rateLimitConfig.blockDurationMinutes * 60 * 1000;
        this.blockedIPs.set(clientIp, blockUntil);
        console.warn(
          `🚫 IP ${clientIp} blocked for ${this.rateLimitConfig.blockDurationMinutes} minutes (rate limit exceeded)`,
        );
      }
    }
  }

  /**
   * Check admin permissions for specific action
   */
  checkAdminPermission(
    userLevel: AdminPrivilegeLevel,
    action: string,
  ): boolean {
    const allowedLevels = this.adminPermissions[action];
    if (!allowedLevels) {
      console.warn(`Unknown admin action: ${action}`);
      return false;
    }

    return allowedLevels.includes(userLevel);
  }

  /**
   * Get user privilege level from database
   */
  private async getUserPrivilegeLevel(
    userId: string,
  ): Promise<AdminPrivilegeLevel> {
    try {
      const { data: user } = await this.supabase
        .from('admin_users')
        .select('privilege_level')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      return (user?.privilege_level as AdminPrivilegeLevel) || 'viewer';
    } catch (error) {
      console.error('Error fetching user privilege level:', error);
      return 'viewer'; // Default to lowest privilege
    }
  }

  /**
   * Handle admin request with full security pipeline
   */
  async handleAdminRequest(
    request: AdminRequest,
    clientIp: string,
    signature?: string,
  ): Promise<AdminRequestResult> {
    const startTime = Date.now();

    try {
      // Check rate limiting first
      if (this.isRateLimited(clientIp)) {
        await this.logAdminRequest({
          action: request.action,
          userId: request.userId,
          clientIp,
          success: false,
          error: 'Rate limit exceeded',
          executionTime: Date.now() - startTime,
          hmacVerified: false,
        });

        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rateLimited: true,
          executionTime: Date.now() - startTime,
        };
      }

      // Record request for rate limiting
      this.recordRequest(clientIp);

      // Verify HMAC signature if provided
      let hmacVerified = false;
      if (signature) {
        const verification = await this.verifyAdminRequest(
          JSON.stringify(request),
          signature,
        );
        if (!verification.valid) {
          await this.logAdminRequest({
            action: request.action,
            userId: request.userId,
            clientIp,
            success: false,
            error: verification.error || 'HMAC verification failed',
            executionTime: Date.now() - startTime,
            hmacVerified: false,
          });

          return {
            success: false,
            error: verification.error || 'Authentication failed',
            executionTime: Date.now() - startTime,
          };
        }
        hmacVerified = true;
      }

      // Check user permissions
      if (request.userId) {
        const userLevel = await this.getUserPrivilegeLevel(request.userId);
        if (!this.checkAdminPermission(userLevel, request.action)) {
          await this.logAdminRequest({
            action: request.action,
            userId: request.userId,
            clientIp,
            success: false,
            error: 'Insufficient privileges',
            executionTime: Date.now() - startTime,
            hmacVerified,
          });

          return {
            success: false,
            error: 'Insufficient privileges for this action',
            executionTime: Date.now() - startTime,
          };
        }
      }

      // Execute the admin action
      const result = await this.executeAdminAction(request);

      // Log successful request
      await this.logAdminRequest({
        action: request.action,
        userId: request.userId,
        clientIp,
        success: true,
        requestData: request.metadata,
        responseData: result.data,
        executionTime: Date.now() - startTime,
        hmacVerified,
      });

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.logAdminRequest({
        action: request.action,
        userId: request.userId,
        clientIp,
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        hmacVerified: false,
      });

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute admin action based on request type
   */
  private async executeAdminAction(
    request: AdminRequest,
  ): Promise<AdminRequestResult> {
    // Import required modules dynamically to avoid circular dependencies
    const { automatedHealthMonitor } = await import(
      './ws-155-automated-health-monitor'
    );
    const { serviceIntegrationHub } = await import(
      './ws-155-service-integration-hub'
    );

    switch (request.action) {
      case 'get_system_metrics':
        const metrics = await serviceIntegrationHub.getAggregatedMetrics({
          timeRange: '1h',
        });
        return { success: true, data: metrics };

      case 'get_health_status':
        const healthReport = automatedHealthMonitor.getLatestHealthReport();
        return { success: true, data: healthReport };

      case 'force_health_check':
        const newHealthReport = await automatedHealthMonitor.forceHealthCheck();
        return { success: true, data: newHealthReport };

      case 'get_alert_history':
        const alertHistory = await this.getAlertHistory(
          request.metadata?.limit || 50,
        );
        return { success: true, data: alertHistory };

      case 'acknowledge_alert':
        if (!request.metadata?.alertId) {
          return { success: false, error: 'Alert ID required' };
        }
        const ackResult = await this.acknowledgeAlert(
          request.metadata.alertId,
          request.userId,
        );
        return { success: true, data: ackResult };

      case 'reset_circuit_breaker':
        if (!request.metadata?.checkType) {
          return { success: false, error: 'Check type required' };
        }
        const resetResult = automatedHealthMonitor.resetCircuitBreaker(
          request.metadata.checkType,
        );
        return { success: true, data: { reset: resetResult } };

      case 'trigger_test_alert':
        await this.triggerTestAlert(request.metadata);
        return { success: true, data: { message: 'Test alert triggered' } };

      case 'get_system_logs':
        const logs = await this.getSystemLogs(request.metadata);
        return { success: true, data: logs };

      case 'access_audit_logs':
        const auditLogs = await this.getAuditLogs(request.metadata);
        return { success: true, data: auditLogs };

      default:
        return {
          success: false,
          error: `Unknown admin action: ${request.action}`,
        };
    }
  }

  /**
   * Log admin request for audit purposes
   */
  private async logAdminRequest(
    logEntry: Omit<AdminAuditLog, 'id' | 'timestamp'>,
  ): Promise<void> {
    try {
      await this.supabase.from('admin_audit_logs').insert({
        action: logEntry.action,
        user_id: logEntry.userId,
        client_ip: logEntry.clientIp,
        user_agent: logEntry.userAgent,
        success: logEntry.success,
        error: logEntry.error,
        request_data: logEntry.requestData,
        response_data: logEntry.responseData,
        execution_time: logEntry.executionTime,
        hmac_verified: logEntry.hmacVerified,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log admin request:', error);
    }
  }

  /**
   * Get alert history
   */
  private async getAlertHistory(limit: number = 50): Promise<any[]> {
    const { data } = await this.supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Acknowledge alert
   */
  private async acknowledgeAlert(
    alertId: string,
    userId?: string,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('alerts')
      .update({
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }

    return data;
  }

  /**
   * Trigger test alert
   */
  private async triggerTestAlert(
    metadata?: Record<string, any>,
  ): Promise<void> {
    const { automatedHealthMonitor } = await import(
      './ws-155-automated-health-monitor'
    );

    await automatedHealthMonitor.processHealthIssue({
      type: metadata?.type || 'test_alert',
      severity: metadata?.severity || 'medium',
      details: {
        source: 'admin_test',
        triggeredBy: metadata?.userId || 'admin',
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Get system logs
   */
  private async getSystemLogs(metadata?: Record<string, any>): Promise<any[]> {
    const limit = metadata?.limit || 100;
    const level = metadata?.level || 'info';

    const { data } = await this.supabase
      .from('system_logs')
      .select('*')
      .gte('level', level)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get audit logs (admin only)
   */
  private async getAuditLogs(
    metadata?: Record<string, any>,
  ): Promise<AdminAuditLog[]> {
    const limit = metadata?.limit || 100;
    const userId = metadata?.userId;
    const action = metadata?.action;

    let query = this.supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    const { data } = await query;
    return data || [];
  }

  /**
   * Get rate limit status for debugging
   */
  getRateLimitStatus(clientIp: string): {
    isLimited: boolean;
    requestCount: number;
    resetTime?: Date;
    blockedUntil?: Date;
  } {
    const rateLimit = this.rateLimitTracker.get(clientIp);
    const blockedUntil = this.blockedIPs.get(clientIp);

    return {
      isLimited: this.isRateLimited(clientIp),
      requestCount: rateLimit?.count || 0,
      resetTime: rateLimit ? new Date(rateLimit.resetTime) : undefined,
      blockedUntil: blockedUntil ? new Date(blockedUntil) : undefined,
    };
  }

  /**
   * Clear rate limit for IP (emergency override)
   */
  clearRateLimit(clientIp: string): void {
    this.rateLimitTracker.delete(clientIp);
    this.blockedIPs.delete(clientIp);
    console.log(`🔓 Rate limit cleared for IP: ${clientIp}`);
  }

  /**
   * Get admin security status
   */
  getSecurityStatus(): {
    rateLimitConfig: RateLimitConfig;
    activeBlocks: number;
    activeRateLimits: number;
    hmacConfigured: boolean;
  } {
    return {
      rateLimitConfig: this.rateLimitConfig,
      activeBlocks: this.blockedIPs.size,
      activeRateLimits: this.rateLimitTracker.size,
      hmacConfigured: !!process.env.ADMIN_WEBHOOK_SECRET,
    };
  }
}

// Export singleton instance
export const adminSecurityController = new AdminSecurityController();
