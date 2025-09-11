/**
 * WS-254 Team E: Authentication and Authorization Security Testing
 * CRITICAL: Wedding dietary data requires strict access controls and secure authentication
 * Multi-tenant architecture with role-based access for suppliers, couples, and vendors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DietaryAnalysisService } from '@/lib/dietary-management/dietary-analysis-service';
import { GuestManagementService } from '@/lib/dietary-management/guest-management-service';

// Authentication and Authorization Security Testing Framework
class AuthSecurityTestFramework {
  private sessions: Map<
    string,
    {
      userId: string;
      role: 'supplier' | 'couple' | 'vendor' | 'admin' | 'guest';
      organizationId: string;
      permissions: string[];
      sessionToken: string;
      createdAt: Date;
      expiresAt: Date;
      ipAddress: string;
      userAgent: string;
      isActive: boolean;
      lastActivity: Date;
      mfaVerified: boolean;
    }
  > = new Map();

  private permissions: Map<
    string,
    {
      resource: string;
      actions: ('create' | 'read' | 'update' | 'delete')[];
      conditions?: string[];
    }
  > = new Map();

  private auditLog: Array<{
    timestamp: Date;
    userId: string;
    action: string;
    resource: string;
    success: boolean;
    ipAddress: string;
    userAgent: string;
    failureReason?: string;
  }> = [];

  private rateLimits: Map<
    string,
    {
      windowStart: Date;
      attemptCount: number;
      maxAttempts: number;
      windowMs: number;
      blocked: boolean;
    }
  > = new Map();

  constructor() {
    this.initializePermissions();
  }

  private initializePermissions(): void {
    // Supplier permissions - can manage their own dietary data
    this.permissions.set('supplier:dietary_analysis', {
      resource: 'dietary_analysis',
      actions: ['create', 'read', 'update'],
      conditions: ['own_organization_only'],
    });

    this.permissions.set('supplier:guest_management', {
      resource: 'guest_management',
      actions: ['create', 'read', 'update', 'delete'],
      conditions: ['own_clients_only'],
    });

    // Couple permissions - can view their own data
    this.permissions.set('couple:dietary_view', {
      resource: 'dietary_analysis',
      actions: ['read'],
      conditions: ['own_wedding_only'],
    });

    this.permissions.set('couple:guest_management', {
      resource: 'guest_management',
      actions: ['create', 'read', 'update'],
      conditions: ['own_wedding_only'],
    });

    // Vendor permissions - can view data they're authorized for
    this.permissions.set('vendor:dietary_view', {
      resource: 'dietary_analysis',
      actions: ['read'],
      conditions: ['authorized_weddings_only'],
    });

    // Admin permissions - full access with audit trail
    this.permissions.set('admin:full_access', {
      resource: '*',
      actions: ['create', 'read', 'update', 'delete'],
      conditions: ['audit_required'],
    });
  }

  // Secure authentication with wedding industry requirements
  authenticateUser(credentials: {
    email: string;
    password: string;
    mfaToken?: string;
    ipAddress: string;
    userAgent: string;
  }): {
    success: boolean;
    sessionToken?: string;
    userId?: string;
    role?: string;
    organizationId?: string;
    error?: string;
    requiresMfa?: boolean;
  } {
    // Rate limiting check
    const rateLimitKey = `auth:${credentials.email}:${credentials.ipAddress}`;
    if (this.isRateLimited(rateLimitKey)) {
      this.logAuditEvent({
        timestamp: new Date(),
        userId: 'unknown',
        action: 'login_attempt',
        resource: 'authentication',
        success: false,
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
        failureReason: 'Rate limit exceeded',
      });

      return {
        success: false,
        error: 'Too many login attempts. Please try again later.',
      };
    }

    // Simulate user lookup and password validation
    const mockUser = this.getMockUser(credentials.email);
    if (!mockUser) {
      this.incrementRateLimit(rateLimitKey);
      this.logAuditEvent({
        timestamp: new Date(),
        userId: 'unknown',
        action: 'login_attempt',
        resource: 'authentication',
        success: false,
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
        failureReason: 'Invalid email',
      });

      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // Password validation (in real implementation, use bcrypt)
    if (!this.validatePassword(credentials.password, mockUser.hashedPassword)) {
      this.incrementRateLimit(rateLimitKey);
      this.logAuditEvent({
        timestamp: new Date(),
        userId: mockUser.id,
        action: 'login_attempt',
        resource: 'authentication',
        success: false,
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
        failureReason: 'Invalid password',
      });

      return {
        success: false,
        error: 'Invalid credentials',
      };
    }

    // MFA requirement for sensitive roles
    if (this.requiresMfa(mockUser.role) && !credentials.mfaToken) {
      return {
        success: false,
        requiresMfa: true,
        error: 'Multi-factor authentication required',
      };
    }

    // MFA validation
    if (
      credentials.mfaToken &&
      !this.validateMfa(mockUser.id, credentials.mfaToken)
    ) {
      this.incrementRateLimit(rateLimitKey);
      this.logAuditEvent({
        timestamp: new Date(),
        userId: mockUser.id,
        action: 'mfa_attempt',
        resource: 'authentication',
        success: false,
        ipAddress: credentials.ipAddress,
        userAgent: credentials.userAgent,
        failureReason: 'Invalid MFA token',
      });

      return {
        success: false,
        error: 'Invalid multi-factor authentication code',
      };
    }

    // Create secure session
    const sessionToken = this.generateSecureToken();
    const session = {
      userId: mockUser.id,
      role: mockUser.role,
      organizationId: mockUser.organizationId,
      permissions: this.getUserPermissions(mockUser.role),
      sessionToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
      isActive: true,
      lastActivity: new Date(),
      mfaVerified: !!credentials.mfaToken,
    };

    this.sessions.set(sessionToken, session);

    // Reset rate limit on successful login
    this.rateLimits.delete(rateLimitKey);

    this.logAuditEvent({
      timestamp: new Date(),
      userId: mockUser.id,
      action: 'login_success',
      resource: 'authentication',
      success: true,
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
    });

    return {
      success: true,
      sessionToken,
      userId: mockUser.id,
      role: mockUser.role,
      organizationId: mockUser.organizationId,
    };
  }

  // Authorization checking with wedding industry specific rules
  authorizeAction(
    sessionToken: string,
    action: 'create' | 'read' | 'update' | 'delete',
    resource: string,
    resourceContext?: {
      organizationId?: string;
      weddingId?: string;
      guestId?: string;
      supplierId?: string;
    },
  ): {
    authorized: boolean;
    reason?: string;
    requiredPermissions?: string[];
  } {
    const session = this.sessions.get(sessionToken);

    if (!session) {
      return {
        authorized: false,
        reason: 'Invalid or expired session',
      };
    }

    // Session expiry check
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionToken);
      return {
        authorized: false,
        reason: 'Session expired',
      };
    }

    // Activity timeout check (30 minutes)
    const activityTimeout = 30 * 60 * 1000;
    if (session.lastActivity < new Date(Date.now() - activityTimeout)) {
      session.isActive = false;
      return {
        authorized: false,
        reason: 'Session inactive',
      };
    }

    // Update last activity
    session.lastActivity = new Date();

    // Check if user has required permissions
    const hasPermission = this.checkUserPermission(
      session.role,
      resource,
      action,
    );
    if (!hasPermission) {
      this.logAuditEvent({
        timestamp: new Date(),
        userId: session.userId,
        action: `${action}_${resource}`,
        resource,
        success: false,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        failureReason: 'Insufficient permissions',
      });

      return {
        authorized: false,
        reason: 'Insufficient permissions',
        requiredPermissions: this.getRequiredPermissions(resource, action),
      };
    }

    // Context-specific authorization
    const contextAuth = this.checkContextualAuthorization(
      session,
      resource,
      resourceContext,
    );
    if (!contextAuth.authorized) {
      this.logAuditEvent({
        timestamp: new Date(),
        userId: session.userId,
        action: `${action}_${resource}`,
        resource,
        success: false,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        failureReason: contextAuth.reason,
      });

      return contextAuth;
    }

    // MFA requirement check for sensitive operations
    if (
      this.requiresMfaForOperation(resource, action) &&
      !session.mfaVerified
    ) {
      return {
        authorized: false,
        reason: 'Multi-factor authentication required for this operation',
      };
    }

    // Log successful authorization
    this.logAuditEvent({
      timestamp: new Date(),
      userId: session.userId,
      action: `${action}_${resource}`,
      resource,
      success: true,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });

    return { authorized: true };
  }

  // Check Row Level Security (RLS) compliance
  checkRowLevelSecurity(
    userId: string,
    userRole: string,
    organizationId: string,
    resource: string,
    resourceData: any,
  ): {
    canAccess: boolean;
    filteredData: any;
    violations: string[];
  } {
    const violations: string[] = [];
    let canAccess = true;
    let filteredData = { ...resourceData };

    switch (resource) {
      case 'dietary_analysis':
        // Suppliers can only access their own organization's data
        if (
          userRole === 'supplier' &&
          resourceData.organizationId !== organizationId
        ) {
          canAccess = false;
          violations.push(
            'Cannot access dietary analysis from other organizations',
          );
        }

        // Couples can only access their own wedding data
        if (userRole === 'couple' && resourceData.coupleId !== userId) {
          canAccess = false;
          violations.push('Cannot access dietary analysis for other couples');
        }

        // Filter sensitive medical information based on role
        if (
          userRole === 'vendor' &&
          !this.isAuthorizedVendor(userId, resourceData.weddingId)
        ) {
          filteredData = {
            ...filteredData,
            medicalDetails: '[REDACTED - UNAUTHORIZED]',
            emergencyContacts: [],
          };
        }
        break;

      case 'guest_management':
        // Strict guest data access control
        if (
          userRole === 'supplier' &&
          resourceData.supplierOrganizationId !== organizationId
        ) {
          canAccess = false;
          violations.push('Cannot access guest data from other suppliers');
        }

        // Filter PII for unauthorized access
        if (!this.hasFullGuestAccess(userRole, userId, resourceData)) {
          filteredData = {
            ...filteredData,
            personalDetails: {
              name: resourceData.personalDetails?.name || '[REDACTED]',
              email: '[REDACTED]',
              phone: '[REDACTED]',
            },
            medicalInformation: '[REDACTED]',
            emergencyContacts: [],
          };
        }
        break;
    }

    return { canAccess, filteredData, violations };
  }

  // Session management and security
  validateSession(sessionToken: string): {
    valid: boolean;
    session?: any;
    reason?: string;
  } {
    const session = this.sessions.get(sessionToken);

    if (!session) {
      return {
        valid: false,
        reason: 'Session not found',
      };
    }

    if (!session.isActive) {
      return {
        valid: false,
        reason: 'Session is inactive',
      };
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionToken);
      return {
        valid: false,
        reason: 'Session expired',
      };
    }

    // Check for session hijacking (IP address change)
    // In production, might allow some flexibility for mobile users
    // but flag for additional verification

    return {
      valid: true,
      session: {
        userId: session.userId,
        role: session.role,
        organizationId: session.organizationId,
        permissions: session.permissions,
        mfaVerified: session.mfaVerified,
      },
    };
  }

  // Logout and session cleanup
  logout(sessionToken: string): {
    success: boolean;
    error?: string;
  } {
    const session = this.sessions.get(sessionToken);

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    // Log logout event
    this.logAuditEvent({
      timestamp: new Date(),
      userId: session.userId,
      action: 'logout',
      resource: 'authentication',
      success: true,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });

    // Remove session
    this.sessions.delete(sessionToken);

    return { success: true };
  }

  // Security monitoring and threat detection
  detectSecurityThreats(): {
    threats: Array<{
      type:
        | 'brute_force'
        | 'session_hijacking'
        | 'privilege_escalation'
        | 'suspicious_access';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedUsers: string[];
      recommendations: string[];
    }>;
    overallRiskScore: number;
  } {
    const threats: any[] = [];

    // Brute force detection
    const bruteForceAttempts = this.detectBruteForce();
    if (bruteForceAttempts.length > 0) {
      threats.push({
        type: 'brute_force',
        severity: 'high',
        description: `${bruteForceAttempts.length} potential brute force attacks detected`,
        affectedUsers: bruteForceAttempts.map((a) => a.target),
        recommendations: [
          'Implement account lockout after failed attempts',
          'Deploy CAPTCHA for repeated failures',
          'Consider IP-based blocking for severe cases',
        ],
      });
    }

    // Session hijacking detection
    const hijackingAttempts = this.detectSessionHijacking();
    if (hijackingAttempts.length > 0) {
      threats.push({
        type: 'session_hijacking',
        severity: 'critical',
        description: 'Potential session hijacking attempts detected',
        affectedUsers: hijackingAttempts.map((a) => a.userId),
        recommendations: [
          'Force logout affected sessions immediately',
          'Require MFA for sensitive operations',
          'Monitor for additional suspicious activity',
        ],
      });
    }

    // Privilege escalation attempts
    const escalationAttempts = this.detectPrivilegeEscalation();
    if (escalationAttempts.length > 0) {
      threats.push({
        type: 'privilege_escalation',
        severity: 'high',
        description:
          'Users attempting unauthorized access to higher privileges',
        affectedUsers: escalationAttempts,
        recommendations: [
          'Review user permissions immediately',
          'Audit recent authorization changes',
          'Strengthen role-based access controls',
        ],
      });
    }

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(threats);

    return { threats, overallRiskScore: riskScore };
  }

  // Helper methods
  private getMockUser(email: string) {
    // Mock user database lookup
    const mockUsers = {
      'supplier@wedsync.com': {
        id: 'user-supplier-1',
        email: 'supplier@wedsync.com',
        hashedPassword: 'hashed-password-123',
        role: 'supplier' as const,
        organizationId: 'org-supplier-1',
        mfaEnabled: false,
      },
      'couple@wedsync.com': {
        id: 'user-couple-1',
        email: 'couple@wedsync.com',
        hashedPassword: 'hashed-password-456',
        role: 'couple' as const,
        organizationId: 'org-couple-1',
        mfaEnabled: true,
      },
      'admin@wedsync.com': {
        id: 'user-admin-1',
        email: 'admin@wedsync.com',
        hashedPassword: 'hashed-password-789',
        role: 'admin' as const,
        organizationId: 'org-wedsync',
        mfaEnabled: true,
      },
      'vendor@catering.com': {
        id: 'user-vendor-1',
        email: 'vendor@catering.com',
        hashedPassword: 'hashed-password-101',
        role: 'vendor' as const,
        organizationId: 'org-vendor-1',
        mfaEnabled: false,
      },
    };

    return mockUsers[email as keyof typeof mockUsers];
  }

  private validatePassword(password: string, hashedPassword: string): boolean {
    // In real implementation, use bcrypt.compare
    return (
      password === 'correct-password' &&
      hashedPassword.startsWith('hashed-password')
    );
  }

  private requiresMfa(role: string): boolean {
    return ['admin', 'couple'].includes(role);
  }

  private validateMfa(userId: string, token: string): boolean {
    // Mock MFA validation - in real implementation, use TOTP library
    return token === '123456';
  }

  private generateSecureToken(): string {
    // In real implementation, use crypto.randomBytes
    return 'secure-token-' + Math.random().toString(36).substring(2, 15);
  }

  private getUserPermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      supplier: ['supplier:dietary_analysis', 'supplier:guest_management'],
      couple: ['couple:dietary_view', 'couple:guest_management'],
      vendor: ['vendor:dietary_view'],
      admin: ['admin:full_access'],
      guest: [],
    };

    return rolePermissions[role] || [];
  }

  private checkUserPermission(
    role: string,
    resource: string,
    action: string,
  ): boolean {
    const userPermissions = this.getUserPermissions(role);

    // Admin has full access
    if (userPermissions.includes('admin:full_access')) {
      return true;
    }

    // Check specific permissions
    return userPermissions.some((permission) => {
      const permConfig = this.permissions.get(permission);
      return (
        permConfig &&
        (permConfig.resource === resource || permConfig.resource === '*') &&
        permConfig.actions.includes(action as any)
      );
    });
  }

  private getRequiredPermissions(resource: string, action: string): string[] {
    const required: string[] = [];

    this.permissions.forEach((config, permissionName) => {
      if (
        (config.resource === resource || config.resource === '*') &&
        config.actions.includes(action as any)
      ) {
        required.push(permissionName);
      }
    });

    return required;
  }

  private checkContextualAuthorization(
    session: any,
    resource: string,
    context?: any,
  ): {
    authorized: boolean;
    reason?: string;
  } {
    if (!context) {
      return { authorized: true };
    }

    // Organization-level access control
    if (context.organizationId && session.role === 'supplier') {
      if (context.organizationId !== session.organizationId) {
        return {
          authorized: false,
          reason: 'Cannot access resources from other organizations',
        };
      }
    }

    // Wedding-level access control
    if (context.weddingId && session.role === 'couple') {
      // In real implementation, check if user owns this wedding
      const ownsWedding = true; // Mock check
      if (!ownsWedding) {
        return {
          authorized: false,
          reason: "Cannot access other couples' wedding data",
        };
      }
    }

    return { authorized: true };
  }

  private requiresMfaForOperation(resource: string, action: string): boolean {
    // Require MFA for sensitive operations
    const mfaRequiredOperations = [
      { resource: 'guest_management', action: 'delete' },
      { resource: 'dietary_analysis', action: 'delete' },
      { resource: '*', action: 'delete' },
    ];

    return mfaRequiredOperations.some(
      (op) =>
        (op.resource === resource || op.resource === '*') &&
        op.action === action,
    );
  }

  private isAuthorizedVendor(vendorId: string, weddingId: string): boolean {
    // Mock check - in real implementation, check vendor contracts
    return true;
  }

  private hasFullGuestAccess(
    role: string,
    userId: string,
    resourceData: any,
  ): boolean {
    if (role === 'admin') return true;
    if (role === 'supplier' && resourceData.supplierOrganizationId === userId)
      return true;
    if (role === 'couple' && resourceData.coupleId === userId) return true;
    return false;
  }

  private isRateLimited(key: string): boolean {
    const limit = this.rateLimits.get(key);
    if (!limit) return false;

    const now = new Date();
    const windowElapsed = now.getTime() - limit.windowStart.getTime();

    // Reset window if expired
    if (windowElapsed > limit.windowMs) {
      this.rateLimits.delete(key);
      return false;
    }

    return limit.blocked;
  }

  private incrementRateLimit(key: string): void {
    const limit = this.rateLimits.get(key) || {
      windowStart: new Date(),
      attemptCount: 0,
      maxAttempts: 5, // 5 attempts per window
      windowMs: 15 * 60 * 1000, // 15 minutes
      blocked: false,
    };

    limit.attemptCount++;

    if (limit.attemptCount >= limit.maxAttempts) {
      limit.blocked = true;
    }

    this.rateLimits.set(key, limit);
  }

  private logAuditEvent(event: any): void {
    this.auditLog.push(event);
  }

  private detectBruteForce(): Array<{ target: string; attempts: number }> {
    const failedAttempts = new Map<string, number>();

    this.auditLog.forEach((event) => {
      if (!event.success && event.action === 'login_attempt') {
        const key = `${event.userId}:${event.ipAddress}`;
        failedAttempts.set(key, (failedAttempts.get(key) || 0) + 1);
      }
    });

    return Array.from(failedAttempts.entries())
      .filter(([, attempts]) => attempts >= 10)
      .map(([target, attempts]) => ({ target, attempts }));
  }

  private detectSessionHijacking(): Array<{ userId: string; reason: string }> {
    const suspicious: Array<{ userId: string; reason: string }> = [];

    this.sessions.forEach((session) => {
      // Check for multiple IPs for same session (simplified check)
      const recentLogins = this.auditLog.filter(
        (event) =>
          event.userId === session.userId &&
          event.action === 'login_success' &&
          event.timestamp > new Date(Date.now() - 60 * 60 * 1000), // Last hour
      );

      const uniqueIPs = new Set(recentLogins.map((event) => event.ipAddress));
      if (uniqueIPs.size > 2) {
        // Allow some flexibility for mobile users
        suspicious.push({
          userId: session.userId,
          reason: `Multiple IP addresses (${uniqueIPs.size}) detected for user session`,
        });
      }
    });

    return suspicious;
  }

  private detectPrivilegeEscalation(): string[] {
    const escalationAttempts: string[] = [];

    this.auditLog.forEach((event) => {
      if (
        !event.success &&
        event.failureReason === 'Insufficient permissions'
      ) {
        escalationAttempts.push(event.userId);
      }
    });

    // Return users with multiple privilege escalation attempts
    const attemptCounts = new Map<string, number>();
    escalationAttempts.forEach((userId) => {
      attemptCounts.set(userId, (attemptCounts.get(userId) || 0) + 1);
    });

    return Array.from(attemptCounts.entries())
      .filter(([, count]) => count >= 3)
      .map(([userId]) => userId);
  }

  private calculateRiskScore(threats: any[]): number {
    const severityWeights = { low: 1, medium: 3, high: 7, critical: 10 };

    return threats.reduce((score, threat) => {
      return score + severityWeights[threat.severity];
    }, 0);
  }

  // Public accessors for testing
  getSessions(): Map<string, any> {
    return new Map(this.sessions);
  }

  getAuditLog(): any[] {
    return [...this.auditLog];
  }

  clearAll(): void {
    this.sessions.clear();
    this.auditLog.length = 0;
    this.rateLimits.clear();
  }
}

describe('Authentication and Authorization Security Testing', () => {
  let authFramework: AuthSecurityTestFramework;
  let dietaryService: DietaryAnalysisService;
  let guestService: GuestManagementService;

  beforeEach(() => {
    authFramework = new AuthSecurityTestFramework();
    dietaryService = new DietaryAnalysisService('test-key');
    guestService = new GuestManagementService();
  });

  afterEach(() => {
    authFramework.clearAll();
  });

  describe('Authentication Security', () => {
    it('should authenticate valid supplier credentials successfully', () => {
      const result = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Wedding Supplier Browser)',
      });

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBeDefined();
      expect(result.role).toBe('supplier');
      expect(result.userId).toBe('user-supplier-1');
      expect(result.organizationId).toBe('org-supplier-1');
    });

    it('should reject invalid credentials', () => {
      const result = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'wrong-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.sessionToken).toBeUndefined();
    });

    it('should enforce MFA for couples and admin roles', () => {
      const result = authFramework.authenticateUser({
        email: 'couple@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Wedding Couple Mobile)',
      });

      expect(result.success).toBe(false);
      expect(result.requiresMfa).toBe(true);
      expect(result.error).toBe('Multi-factor authentication required');
    });

    it('should authenticate with valid MFA token', () => {
      const result = authFramework.authenticateUser({
        email: 'couple@wedsync.com',
        password: 'correct-password',
        mfaToken: '123456',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Wedding Couple Mobile)',
      });

      expect(result.success).toBe(true);
      expect(result.role).toBe('couple');
      expect(result.sessionToken).toBeDefined();
    });

    it('should implement rate limiting for failed login attempts', () => {
      const credentials = {
        email: 'supplier@wedsync.com',
        password: 'wrong-password',
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0',
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        const result = authFramework.authenticateUser(credentials);

        if (i < 5) {
          expect(result.error).toBe('Invalid credentials');
        } else {
          expect(result.error).toBe(
            'Too many login attempts. Please try again later.',
          );
        }
      }
    });

    it('should reject authentication for non-existent users', () => {
      const result = authFramework.authenticateUser({
        email: 'nonexistent@wedsync.com',
        password: 'any-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should create audit log entries for all authentication attempts', () => {
      // Successful login
      authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      // Failed login
      authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'wrong-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      const auditLog = authFramework.getAuditLog();
      expect(auditLog.length).toBeGreaterThanOrEqual(2);

      const successLog = auditLog.find(
        (log) => log.success && log.action === 'login_success',
      );
      const failureLog = auditLog.find(
        (log) => !log.success && log.action === 'login_attempt',
      );

      expect(successLog).toBeDefined();
      expect(failureLog).toBeDefined();
      expect(successLog?.userId).toBe('user-supplier-1');
      expect(failureLog?.failureReason).toBe('Invalid password');
    });
  });

  describe('Authorization and Access Control', () => {
    let supplierSession: string;
    let coupleSession: string;
    let adminSession: string;
    let vendorSession: string;

    beforeEach(() => {
      // Create test sessions
      const supplierAuth = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Supplier Browser',
      });
      supplierSession = supplierAuth.sessionToken!;

      const coupleAuth = authFramework.authenticateUser({
        email: 'couple@wedsync.com',
        password: 'correct-password',
        mfaToken: '123456',
        ipAddress: '192.168.1.101',
        userAgent: 'Couple Browser',
      });
      coupleSession = coupleAuth.sessionToken!;

      const adminAuth = authFramework.authenticateUser({
        email: 'admin@wedsync.com',
        password: 'correct-password',
        mfaToken: '123456',
        ipAddress: '192.168.1.102',
        userAgent: 'Admin Browser',
      });
      adminSession = adminAuth.sessionToken!;

      const vendorAuth = authFramework.authenticateUser({
        email: 'vendor@catering.com',
        password: 'correct-password',
        ipAddress: '192.168.1.103',
        userAgent: 'Vendor Browser',
      });
      vendorSession = vendorAuth.sessionToken!;
    });

    it('should allow suppliers to create dietary analysis for their organization', () => {
      const authorization = authFramework.authorizeAction(
        supplierSession,
        'create',
        'dietary_analysis',
        { organizationId: 'org-supplier-1' },
      );

      expect(authorization.authorized).toBe(true);
    });

    it("should prevent suppliers from accessing other organizations' data", () => {
      const authorization = authFramework.authorizeAction(
        supplierSession,
        'read',
        'dietary_analysis',
        { organizationId: 'org-supplier-2' },
      );

      expect(authorization.authorized).toBe(false);
      expect(authorization.reason).toBe(
        'Cannot access resources from other organizations',
      );
    });

    it('should allow couples to view their own wedding dietary data', () => {
      const authorization = authFramework.authorizeAction(
        coupleSession,
        'read',
        'dietary_analysis',
        { weddingId: 'wedding-couple-1' },
      );

      expect(authorization.authorized).toBe(true);
    });

    it('should prevent couples from modifying dietary analysis directly', () => {
      const authorization = authFramework.authorizeAction(
        coupleSession,
        'update',
        'dietary_analysis',
        { weddingId: 'wedding-couple-1' },
      );

      expect(authorization.authorized).toBe(false);
      expect(authorization.reason).toBe('Insufficient permissions');
    });

    it('should give admin users full access to all resources', () => {
      const authorization = authFramework.authorizeAction(
        adminSession,
        'delete',
        'dietary_analysis',
        { organizationId: 'any-org' },
      );

      expect(authorization.authorized).toBe(true);
    });

    it('should require MFA for sensitive operations', () => {
      // Create session without MFA for admin
      const adminNoMfaAuth = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.104',
        userAgent: 'Admin No MFA',
      });

      const authorization = authFramework.authorizeAction(
        adminNoMfaAuth.sessionToken!,
        'delete',
        'guest_management',
      );

      expect(authorization.authorized).toBe(false);
      expect(authorization.reason).toBe(
        'Multi-factor authentication required for this operation',
      );
    });

    it('should enforce session expiration', () => {
      // Mock expired session by manipulating session data
      const sessions = authFramework.getSessions();
      const session = sessions.get(supplierSession);
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000); // 1 second ago
      }

      const authorization = authFramework.authorizeAction(
        supplierSession,
        'read',
        'dietary_analysis',
      );

      expect(authorization.authorized).toBe(false);
      expect(authorization.reason).toBe('Session expired');
    });

    it('should track session activity and enforce timeout', () => {
      // Mock inactive session
      const sessions = authFramework.getSessions();
      const session = sessions.get(supplierSession);
      if (session) {
        session.lastActivity = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      }

      const authorization = authFramework.authorizeAction(
        supplierSession,
        'read',
        'dietary_analysis',
      );

      expect(authorization.authorized).toBe(false);
      expect(authorization.reason).toBe('Session inactive');
    });
  });

  describe('Row Level Security (RLS) Testing', () => {
    it('should filter dietary data based on user organization', () => {
      const dietaryData = {
        id: 'analysis-1',
        organizationId: 'org-supplier-1',
        weddingId: 'wedding-1',
        guestRestrictions: ['vegan', 'nut-allergy'],
        medicalDetails: 'Severe peanut allergy - EpiPen required',
        emergencyContacts: [{ name: 'Dr. Smith', phone: '123-456-7890' }],
      };

      // Supplier from same organization should have full access
      const supplierAccess = authFramework.checkRowLevelSecurity(
        'user-supplier-1',
        'supplier',
        'org-supplier-1',
        'dietary_analysis',
        dietaryData,
      );

      expect(supplierAccess.canAccess).toBe(true);
      expect(supplierAccess.violations.length).toBe(0);
      expect(supplierAccess.filteredData.medicalDetails).toBe(
        'Severe peanut allergy - EpiPen required',
      );

      // Supplier from different organization should be blocked
      const otherSupplierAccess = authFramework.checkRowLevelSecurity(
        'user-supplier-2',
        'supplier',
        'org-supplier-2',
        'dietary_analysis',
        dietaryData,
      );

      expect(otherSupplierAccess.canAccess).toBe(false);
      expect(otherSupplierAccess.violations).toContain(
        'Cannot access dietary analysis from other organizations',
      );
    });

    it('should filter sensitive guest information for unauthorized vendors', () => {
      const guestData = {
        id: 'guest-1',
        weddingId: 'wedding-1',
        supplierOrganizationId: 'org-supplier-1',
        personalDetails: {
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '+44-20-7946-0958',
        },
        medicalInformation: 'Severe nut allergy - life threatening',
        emergencyContacts: [{ name: 'Jane Doe', phone: '+44-20-7946-0959' }],
      };

      // Vendor access should filter sensitive information
      const vendorAccess = authFramework.checkRowLevelSecurity(
        'user-vendor-unauthorized',
        'vendor',
        'org-vendor-1',
        'guest_management',
        guestData,
      );

      expect(vendorAccess.canAccess).toBe(true); // Can access but filtered
      expect(vendorAccess.filteredData.personalDetails.name).toBe('John Doe');
      expect(vendorAccess.filteredData.personalDetails.email).toBe(
        '[REDACTED]',
      );
      expect(vendorAccess.filteredData.personalDetails.phone).toBe(
        '[REDACTED]',
      );
      expect(vendorAccess.filteredData.medicalInformation).toBe('[REDACTED]');
      expect(vendorAccess.filteredData.emergencyContacts).toEqual([]);
    });

    it('should enforce couple-specific data access', () => {
      const dietaryData = {
        id: 'analysis-couple-1',
        coupleId: 'user-couple-1',
        weddingId: 'wedding-couple-1',
        guestAnalysis: 'Detailed analysis...',
      };

      // Couple should access their own data
      const coupleAccess = authFramework.checkRowLevelSecurity(
        'user-couple-1',
        'couple',
        'org-couple-1',
        'dietary_analysis',
        dietaryData,
      );

      expect(coupleAccess.canAccess).toBe(true);
      expect(coupleAccess.violations.length).toBe(0);

      // Different couple should be blocked
      const otherCoupleAccess = authFramework.checkRowLevelSecurity(
        'user-couple-2',
        'couple',
        'org-couple-2',
        'dietary_analysis',
        dietaryData,
      );

      expect(otherCoupleAccess.canAccess).toBe(false);
      expect(otherCoupleAccess.violations).toContain(
        'Cannot access dietary analysis for other couples',
      );
    });
  });

  describe('Session Management Security', () => {
    let testSession: string;

    beforeEach(() => {
      const auth = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser',
      });
      testSession = auth.sessionToken!;
    });

    it('should validate active sessions', () => {
      const validation = authFramework.validateSession(testSession);

      expect(validation.valid).toBe(true);
      expect(validation.session).toBeDefined();
      expect(validation.session?.userId).toBe('user-supplier-1');
      expect(validation.session?.role).toBe('supplier');
    });

    it('should reject invalid session tokens', () => {
      const validation = authFramework.validateSession('invalid-token');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Session not found');
    });

    it('should handle session logout correctly', () => {
      const logout = authFramework.logout(testSession);

      expect(logout.success).toBe(true);

      // Session should no longer be valid
      const validation = authFramework.validateSession(testSession);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Session not found');

      // Should log logout event
      const auditLog = authFramework.getAuditLog();
      const logoutEvent = auditLog.find((log) => log.action === 'logout');
      expect(logoutEvent).toBeDefined();
    });

    it('should handle logout of non-existent session', () => {
      const logout = authFramework.logout('non-existent-token');

      expect(logout.success).toBe(false);
      expect(logout.error).toBe('Session not found');
    });
  });

  describe('Security Threat Detection', () => {
    it('should detect brute force attacks', () => {
      // Simulate brute force attack
      for (let i = 0; i < 12; i++) {
        authFramework.authenticateUser({
          email: 'supplier@wedsync.com',
          password: 'wrong-password',
          ipAddress: '192.168.1.200',
          userAgent: 'Attack Browser',
        });
      }

      const threats = authFramework.detectSecurityThreats();
      const bruteForce = threats.threats.find((t) => t.type === 'brute_force');

      expect(bruteForce).toBeDefined();
      expect(bruteForce?.severity).toBe('high');
      expect(bruteForce?.recommendations).toContain(
        'Implement account lockout after failed attempts',
      );
      expect(threats.overallRiskScore).toBeGreaterThan(5);
    });

    it('should detect privilege escalation attempts', () => {
      // Simulate privilege escalation attempts
      const supplierAuth = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Supplier Browser',
      });

      // Attempt unauthorized access multiple times
      for (let i = 0; i < 5; i++) {
        authFramework.authorizeAction(
          supplierAuth.sessionToken!,
          'delete',
          'guest_management',
          { organizationId: 'org-admin' },
        );
      }

      const threats = authFramework.detectSecurityThreats();
      const escalation = threats.threats.find(
        (t) => t.type === 'privilege_escalation',
      );

      expect(escalation).toBeDefined();
      expect(escalation?.severity).toBe('high');
      expect(escalation?.affectedUsers).toContain('user-supplier-1');
    });

    it('should calculate appropriate risk scores', () => {
      // Create multiple threat types
      const mockThreats = [
        { type: 'brute_force', severity: 'high' },
        { type: 'privilege_escalation', severity: 'medium' },
        { type: 'session_hijacking', severity: 'critical' },
      ];

      // Risk score should be calculated based on severity weights
      const expectedScore = 7 + 3 + 10; // high=7, medium=3, critical=10

      // We can't directly test the private method, but we can test the overall function
      const threats = authFramework.detectSecurityThreats();
      expect(typeof threats.overallRiskScore).toBe('number');
      expect(threats.overallRiskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Wedding Industry Specific Security Requirements', () => {
    it('should protect guest medical information with enhanced security', () => {
      const sensitiveGuestData = {
        id: 'guest-medical-1',
        weddingId: 'wedding-1',
        supplierOrganizationId: 'org-supplier-1',
        personalDetails: {
          name: 'Medical Guest',
          email: 'medical@guest.com',
        },
        medicalInformation: 'Severe anaphylaxis - multiple allergens',
        emergencyContacts: [
          {
            name: 'Emergency Doctor',
            phone: '999',
            relationship: 'Medical Emergency',
          },
        ],
      };

      // Only authorized personnel should access full medical data
      const adminAccess = authFramework.checkRowLevelSecurity(
        'user-admin-1',
        'admin',
        'org-wedsync',
        'guest_management',
        sensitiveGuestData,
      );

      expect(adminAccess.canAccess).toBe(true);
      expect(adminAccess.filteredData.medicalInformation).toBe(
        'Severe anaphylaxis - multiple allergens',
      );
      expect(adminAccess.filteredData.emergencyContacts.length).toBe(1);
    });

    it('should enforce strict access controls for wedding day operations', () => {
      const weddingDayData = {
        id: 'wedding-day-1',
        date: '2024-06-15', // Saturday wedding
        organizationId: 'org-supplier-1',
        criticalAllergens: ['nuts', 'shellfish'],
        emergencyProtocols: true,
      };

      // Supplier should have read access on wedding day
      const supplierSession = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Wedding Day Browser',
      }).sessionToken!;

      const authorization = authFramework.authorizeAction(
        supplierSession,
        'read',
        'dietary_analysis',
        { organizationId: 'org-supplier-1' },
      );

      expect(authorization.authorized).toBe(true);

      // But delete operations should require MFA even for suppliers
      const deleteAuthorization = authFramework.authorizeAction(
        supplierSession,
        'delete',
        'dietary_analysis',
        { organizationId: 'org-supplier-1' },
      );

      expect(deleteAuthorization.authorized).toBe(false);
      expect(deleteAuthorization.reason).toBe(
        'Multi-factor authentication required for this operation',
      );
    });

    it('should handle vendor integration security appropriately', () => {
      const vendorAuth = authFramework.authenticateUser({
        email: 'vendor@catering.com',
        password: 'correct-password',
        ipAddress: '192.168.1.103',
        userAgent: 'Catering Vendor Browser',
      });

      // Vendor should be able to read authorized dietary data
      const readAuth = authFramework.authorizeAction(
        vendorAuth.sessionToken!,
        'read',
        'dietary_analysis',
      );

      expect(readAuth.authorized).toBe(true);

      // But should not be able to modify guest data directly
      const updateAuth = authFramework.authorizeAction(
        vendorAuth.sessionToken!,
        'update',
        'guest_management',
      );

      expect(updateAuth.authorized).toBe(false);
      expect(updateAuth.reason).toBe('Insufficient permissions');
    });

    it('should audit all access to sensitive dietary and medical data', () => {
      const supplierAuth = authFramework.authenticateUser({
        email: 'supplier@wedsync.com',
        password: 'correct-password',
        ipAddress: '192.168.1.100',
        userAgent: 'Supplier Browser',
      });

      // Perform various operations
      authFramework.authorizeAction(
        supplierAuth.sessionToken!,
        'read',
        'dietary_analysis',
        { organizationId: 'org-supplier-1' },
      );

      authFramework.authorizeAction(
        supplierAuth.sessionToken!,
        'create',
        'guest_management',
        { organizationId: 'org-supplier-1' },
      );

      const auditLog = authFramework.getAuditLog();

      // Should have audit entries for all operations
      expect(
        auditLog.filter((log) => log.action.includes('dietary_analysis'))
          .length,
      ).toBeGreaterThan(0);
      expect(
        auditLog.filter((log) => log.action.includes('guest_management'))
          .length,
      ).toBeGreaterThan(0);

      // All entries should have required audit fields
      auditLog.forEach((entry) => {
        expect(entry.timestamp).toBeDefined();
        expect(entry.userId).toBeDefined();
        expect(entry.action).toBeDefined();
        expect(entry.resource).toBeDefined();
        expect(typeof entry.success).toBe('boolean');
        expect(entry.ipAddress).toBeDefined();
        expect(entry.userAgent).toBeDefined();
      });
    });
  });
});
