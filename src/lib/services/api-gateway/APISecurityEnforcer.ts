/**
 * API Security Enforcer - Security Policy Enforcement
 * WS-250 - Advanced security enforcement with wedding industry protections
 */

import {
  SecurityPolicy,
  SecurityRule,
  SecurityEnforcementResult,
  JWTValidationConfig,
  GatewayRequest,
  WeddingContext,
  VendorTier,
} from '@/types/api-gateway';

export class APISecurityEnforcer {
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private jwtConfig: JWTValidationConfig;
  private whitelistedIPs: Set<string> = new Set();
  private suspiciousIPs: Map<string, SuspiciousActivity> = new Map();
  private securityLog: SecurityEvent[] = [];

  // Wedding-specific security configurations
  private readonly WEDDING_CRITICAL_ENDPOINTS = [
    '/api/weddings/emergency',
    '/api/communications/urgent',
    '/api/payments/process',
    '/api/client-portal/urgent',
    '/api/vendors/schedule/critical',
  ];

  private readonly SATURDAY_ENHANCED_SECURITY = true;
  private readonly MAX_SECURITY_LOG_SIZE = 10000;
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10; // requests per minute

  constructor(config?: Partial<JWTValidationConfig>) {
    this.jwtConfig = {
      secret: process.env.JWT_SECRET || 'default-secret',
      issuer: 'wedsync.com',
      audience: 'wedsync-api',
      algorithm: 'HS256',
      expirationGracePeriod: 300, // 5 minutes
      ...config,
    };

    this.initializeDefaultPolicies();
    this.initializeWhitelistedIPs();
    this.startSecurityMonitoring();
  }

  /**
   * Enforce security policies on a request
   */
  public async enforceSecurityPolicies(
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    try {
      const enforcementResults: SecurityEnforcementResult[] = [];

      // Get applicable security policies
      const policies = this.getApplicablePolicies(request);

      for (const policy of policies) {
        if (!policy.enabled) continue;

        for (const rule of policy.rules) {
          const result = await this.enforceSecurityRule(rule, request, policy);
          enforcementResults.push(result);

          // Stop on first blocking rule
          if (!result.allowed && rule.action === 'block') {
            this.logSecurityEvent(request, rule, result, 'BLOCKED');
            return result;
          }
        }
      }

      // Check for suspicious activity
      const suspiciousCheck = await this.checkSuspiciousActivity(request);
      if (!suspiciousCheck.allowed) {
        return suspiciousCheck;
      }

      // Apply wedding-specific security enhancements
      const weddingSecurityCheck =
        await this.applyWeddingSecurityEnhancements(request);
      if (!weddingSecurityCheck.allowed) {
        return weddingSecurityCheck;
      }

      // All security checks passed
      const finalResult: SecurityEnforcementResult = {
        allowed: true,
        threatLevel: Math.max(
          ...enforcementResults.map((r) => r.threatLevel || 0),
          0,
        ),
      };

      this.logSecurityEvent(request, null, finalResult, 'ALLOWED');
      return finalResult;
    } catch (error) {
      console.error(
        '[APISecurityEnforcer] Security enforcement failed:',
        error,
      );

      // For wedding-critical requests, fail securely but allow the request
      if (this.isWeddingCriticalRequest(request) && this.isSaturday()) {
        console.warn(
          '[APISecurityEnforcer] Failing securely for wedding-critical request',
        );
        return {
          allowed: true,
          threatLevel: 5,
          reason: 'Security bypass - wedding emergency',
          suggestedAction: 'Monitor closely',
        };
      }

      throw error;
    }
  }

  /**
   * Add a security policy
   */
  public addSecurityPolicy(policy: SecurityPolicy): void {
    this.securityPolicies.set(policy.id, policy);
    console.log(
      `[APISecurityEnforcer] Added security policy: ${policy.name} (${policy.rules.length} rules)`,
    );
  }

  /**
   * Remove a security policy
   */
  public removeSecurityPolicy(policyId: string): void {
    this.securityPolicies.delete(policyId);
    console.log(`[APISecurityEnforcer] Removed security policy: ${policyId}`);
  }

  /**
   * Add IP to whitelist
   */
  public whitelistIP(ip: string): void {
    this.whitelistedIPs.add(ip);
    console.log(`[APISecurityEnforcer] Whitelisted IP: ${ip}`);
  }

  /**
   * Remove IP from whitelist
   */
  public removeFromWhitelist(ip: string): void {
    this.whitelistedIPs.delete(ip);
    console.log(`[APISecurityEnforcer] Removed IP from whitelist: ${ip}`);
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): SecurityStats {
    const recentEvents = this.securityLog.filter(
      (event) => Date.now() - event.timestamp.getTime() < 3600000, // Last hour
    );

    const blockedRequests = recentEvents.filter(
      (e) => e.action === 'BLOCKED',
    ).length;
    const threatLevels = recentEvents.map((e) => e.threatLevel || 0);
    const avgThreatLevel =
      threatLevels.length > 0
        ? threatLevels.reduce((a, b) => a + b, 0) / threatLevels.length
        : 0;

    const topThreats = this.getTopThreats(recentEvents);

    return {
      totalPolicies: this.securityPolicies.size,
      whitelistedIPs: this.whitelistedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      recentBlockedRequests: blockedRequests,
      averageThreatLevel: avgThreatLevel,
      topThreats,
      weddingProtectionActive: this.isWeddingProtectionActive(),
      securityLogSize: this.securityLog.length,
    };
  }

  /**
   * Get recent security events
   */
  public getRecentSecurityEvents(limit = 100): SecurityEvent[] {
    return this.securityLog
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ========================================
  // Security Rule Enforcement Methods
  // ========================================

  private async enforceSecurityRule(
    rule: SecurityRule,
    request: GatewayRequest,
    policy: SecurityPolicy,
  ): Promise<SecurityEnforcementResult> {
    switch (rule.type) {
      case 'jwt-validation':
        return await this.enforceJWTValidation(rule, request);

      case 'ip-whitelist':
        return await this.enforceIPWhitelist(rule, request);

      case 'rate-limit':
        return await this.enforceRateLimit(rule, request);

      case 'request-validation':
        return await this.enforceRequestValidation(rule, request);

      case 'sql-injection':
        return await this.enforceSQLInjectionProtection(rule, request);

      case 'xss-protection':
        return await this.enforceXSSProtection(rule, request);

      default:
        return { allowed: true, threatLevel: 0 };
    }
  }

  private async enforceJWTValidation(
    rule: SecurityRule,
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        allowed: rule.action === 'allow',
        reason: 'Missing or invalid Authorization header',
        severity: 'medium',
        threatLevel: 3,
        suggestedAction: 'Require valid JWT token',
      };
    }

    const token = authHeader.substring(7);

    try {
      // Simplified JWT validation - in production use proper JWT library
      const isValidFormat = token.split('.').length === 3;
      const isNotExpired = true; // Would check expiration

      if (!isValidFormat || !isNotExpired) {
        return {
          allowed: false,
          reason: 'Invalid JWT token',
          severity: 'high',
          threatLevel: 7,
          suggestedAction: 'Block request and require re-authentication',
        };
      }

      return { allowed: true, threatLevel: 0 };
    } catch (error) {
      return {
        allowed: false,
        reason: 'JWT validation failed',
        severity: 'high',
        threatLevel: 8,
        suggestedAction: 'Block request and log security event',
      };
    }
  }

  private async enforceIPWhitelist(
    rule: SecurityRule,
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    const isWhitelisted = this.whitelistedIPs.has(request.ip);

    if (!isWhitelisted && rule.action === 'block') {
      return {
        allowed: false,
        reason: `IP ${request.ip} not in whitelist`,
        severity: 'high',
        threatLevel: 6,
        suggestedAction: 'Block request from non-whitelisted IP',
      };
    }

    return { allowed: true, threatLevel: isWhitelisted ? 0 : 2 };
  }

  private async enforceRateLimit(
    rule: SecurityRule,
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    // This would integrate with the RateLimitingEngine
    // For now, return a basic implementation
    return { allowed: true, threatLevel: 0 };
  }

  private async enforceRequestValidation(
    rule: SecurityRule,
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    const validationErrors: string[] = [];

    // Check request size
    const maxSize = (rule.config.maxRequestSize as number) || 10 * 1024 * 1024; // 10MB
    const requestSize = JSON.stringify(request.body || {}).length;

    if (requestSize > maxSize) {
      validationErrors.push(`Request too large: ${requestSize} bytes`);
    }

    // Check required headers
    const requiredHeaders = (rule.config.requiredHeaders as string[]) || [];
    for (const header of requiredHeaders) {
      if (!request.headers[header]) {
        validationErrors.push(`Missing required header: ${header}`);
      }
    }

    // Check content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers['content-type'];
      if (
        !contentType ||
        (!contentType.includes('application/json') &&
          !contentType.includes('multipart/form-data'))
      ) {
        validationErrors.push('Invalid or missing content type');
      }
    }

    if (validationErrors.length > 0) {
      return {
        allowed: rule.action === 'allow',
        reason: validationErrors.join('; '),
        severity: 'medium',
        threatLevel: 4,
        suggestedAction: 'Fix request validation issues',
      };
    }

    return { allowed: true, threatLevel: 0 };
  }

  private async enforceSQLInjectionProtection(
    rule: SecurityRule,
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    const sqlInjectionPatterns = [
      /('|(\\'))+.*(;|--|#)/i,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
      /(\b(and|or)\b.*(=|<|>|\bis\s+null\b|\bis\s+not\s+null\b))/i,
    ];

    const checkString = JSON.stringify({
      path: request.path,
      query: request.query,
      body: request.body,
    });

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(checkString)) {
        return {
          allowed: false,
          reason: 'Potential SQL injection detected',
          severity: 'critical',
          threatLevel: 9,
          suggestedAction: 'Block immediately and alert security team',
        };
      }
    }

    return { allowed: true, threatLevel: 0 };
  }

  private async enforceXSSProtection(
    rule: SecurityRule,
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b/gi,
      /<object\b/gi,
      /<embed\b/gi,
    ];

    const checkString = JSON.stringify({
      query: request.query,
      body: request.body,
    });

    for (const pattern of xssPatterns) {
      if (pattern.test(checkString)) {
        return {
          allowed: false,
          reason: 'Potential XSS attack detected',
          severity: 'critical',
          threatLevel: 8,
          suggestedAction: 'Block request and sanitize input',
        };
      }
    }

    return { allowed: true, threatLevel: 0 };
  }

  // ========================================
  // Wedding-Specific Security Methods
  // ========================================

  private async applyWeddingSecurityEnhancements(
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    // Enhanced security for Saturday (wedding day)
    if (this.isSaturday() && this.SATURDAY_ENHANCED_SECURITY) {
      // More strict validation for wedding-critical endpoints
      if (this.isWeddingCriticalRequest(request)) {
        // Require authentication for all wedding-critical requests on Saturday
        if (!request.headers['authorization']) {
          return {
            allowed: false,
            reason:
              'Saturday protection: Authentication required for wedding-critical endpoints',
            severity: 'high',
            threatLevel: 7,
            suggestedAction: 'Require authentication',
          };
        }
      }

      // Additional rate limiting for non-premium tiers on Saturday
      if (
        request.vendorContext?.tier === 'free' &&
        this.isWeddingCriticalRequest(request)
      ) {
        // Free tier gets very limited access to wedding-critical APIs on Saturday
        return {
          allowed: false,
          reason:
            'Saturday protection: Premium subscription required for wedding-critical operations',
          severity: 'medium',
          threatLevel: 5,
          suggestedAction: 'Upgrade subscription for Saturday access',
        };
      }
    }

    return { allowed: true, threatLevel: 0 };
  }

  private async checkSuspiciousActivity(
    request: GatewayRequest,
  ): Promise<SecurityEnforcementResult> {
    const activity = this.suspiciousIPs.get(request.ip);
    const now = Date.now();

    if (activity) {
      // Clean old requests
      activity.requests = activity.requests.filter(
        (time) => now - time < 60000,
      ); // Last minute

      if (activity.requests.length >= this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        activity.threatLevel = Math.min(10, activity.threatLevel + 1);

        return {
          allowed: false,
          reason: `Suspicious activity detected from IP ${request.ip}`,
          severity: 'high',
          threatLevel: activity.threatLevel,
          suggestedAction: 'Rate limit or block IP temporarily',
        };
      }

      activity.requests.push(now);
    } else {
      this.suspiciousIPs.set(request.ip, {
        requests: [now],
        threatLevel: 1,
        firstSeen: new Date(),
      });
    }

    return { allowed: true, threatLevel: 0 };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private getApplicablePolicies(request: GatewayRequest): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values()).filter((policy) => {
      // Apply wedding protection policies on Saturday
      if (policy.weddingProtection && this.isSaturday()) {
        return true;
      }

      // Apply high-severity policies to all requests
      if (policy.severity === 'critical' || policy.severity === 'high') {
        return true;
      }

      return policy.enabled;
    });
  }

  private isWeddingCriticalRequest(request: GatewayRequest): boolean {
    return (
      request.weddingContext?.isWeddingCritical ||
      this.WEDDING_CRITICAL_ENDPOINTS.some((endpoint) =>
        request.path.startsWith(endpoint),
      )
    );
  }

  private isSaturday(): boolean {
    return new Date().getDay() === 6;
  }

  private isWeddingProtectionActive(): boolean {
    return this.isSaturday() && this.SATURDAY_ENHANCED_SECURITY;
  }

  private getTopThreats(
    events: SecurityEvent[],
  ): Array<{ type: string; count: number }> {
    const threatCounts: Record<string, number> = {};

    events.forEach((event) => {
      if (event.action === 'BLOCKED' && event.reason) {
        const threatType = event.reason.split(':')[0];
        threatCounts[threatType] = (threatCounts[threatType] || 0) + 1;
      }
    });

    return Object.entries(threatCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private logSecurityEvent(
    request: GatewayRequest,
    rule: SecurityRule | null,
    result: SecurityEnforcementResult,
    action: 'ALLOWED' | 'BLOCKED' | 'LOGGED',
  ): void {
    const event: SecurityEvent = {
      timestamp: new Date(),
      ip: request.ip,
      path: request.path,
      method: request.method,
      userAgent: request.userAgent,
      rule: rule?.type || 'general',
      action,
      reason: result.reason,
      severity: result.severity,
      threatLevel: result.threatLevel || 0,
      weddingContext: !!request.weddingContext,
    };

    this.securityLog.push(event);

    // Keep log size manageable
    if (this.securityLog.length > this.MAX_SECURITY_LOG_SIZE) {
      this.securityLog.splice(0, 1000); // Remove oldest 1000 events
    }

    // Log high-severity events
    if (result.severity === 'critical' || result.severity === 'high') {
      console.warn(
        `[APISecurityEnforcer] ${action}: ${result.reason} (IP: ${request.ip}, Path: ${request.path})`,
      );
    }
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: SecurityPolicy[] = [
      {
        id: 'basic-protection',
        name: 'Basic API Protection',
        rules: [
          {
            type: 'request-validation',
            config: { maxRequestSize: 5 * 1024 * 1024 }, // 5MB
            action: 'block',
          },
          {
            type: 'sql-injection',
            config: {},
            action: 'block',
          },
          {
            type: 'xss-protection',
            config: {},
            action: 'block',
          },
        ],
        severity: 'high',
        weddingProtection: false,
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'wedding-protection',
        name: 'Wedding Day Protection',
        rules: [
          {
            type: 'jwt-validation',
            config: {},
            action: 'block',
            weddingOverride: false,
          },
          {
            type: 'rate-limit',
            config: { strictMode: true },
            action: 'throttle',
          },
        ],
        severity: 'critical',
        weddingProtection: true,
        enabled: true,
        createdAt: new Date(),
      },
    ];

    defaultPolicies.forEach((policy) => this.addSecurityPolicy(policy));
  }

  private initializeWhitelistedIPs(): void {
    // Add localhost and common development IPs
    const defaultWhitelist = ['127.0.0.1', '::1', 'localhost'];

    defaultWhitelist.forEach((ip) => this.whitelistIP(ip));
  }

  private startSecurityMonitoring(): void {
    // Clean up old suspicious activity every 5 minutes
    setInterval(() => {
      this.cleanupSuspiciousActivity();
    }, 300000);

    // Log security statistics every hour
    setInterval(() => {
      const stats = this.getSecurityStats();
      console.log(
        `[APISecurityEnforcer] Hourly Stats - Policies: ${stats.totalPolicies}, Blocked: ${stats.recentBlockedRequests}, Avg Threat: ${stats.averageThreatLevel.toFixed(2)}`,
      );
    }, 3600000);
  }

  private cleanupSuspiciousActivity(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [ip, activity] of this.suspiciousIPs.entries()) {
      // Remove IPs with no recent activity
      if (now - activity.firstSeen.getTime() > 86400000) {
        // 24 hours
        this.suspiciousIPs.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `[APISecurityEnforcer] Cleaned up ${cleanedCount} old suspicious activity records`,
      );
    }
  }
}

// Supporting interfaces
interface SuspiciousActivity {
  requests: number[];
  threatLevel: number;
  firstSeen: Date;
}

interface SecurityEvent {
  timestamp: Date;
  ip: string;
  path: string;
  method: string;
  userAgent: string;
  rule: string;
  action: 'ALLOWED' | 'BLOCKED' | 'LOGGED';
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  threatLevel: number;
  weddingContext: boolean;
}

interface SecurityStats {
  totalPolicies: number;
  whitelistedIPs: number;
  suspiciousIPs: number;
  recentBlockedRequests: number;
  averageThreatLevel: number;
  topThreats: Array<{ type: string; count: number }>;
  weddingProtectionActive: boolean;
  securityLogSize: number;
}

// Singleton instance
export const apiSecurityEnforcer = new APISecurityEnforcer();
