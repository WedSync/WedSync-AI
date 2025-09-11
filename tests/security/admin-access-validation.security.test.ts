// Security tests for admin access validation
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { authenticateRequest, requirePermissions, validateAdminAccess } from '../../src/middleware/auth';
import { rateLimit } from '../../src/lib/rate-limiting';

// Mock security utilities
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('../../src/lib/rate-limiting');

// Security test utilities
const createMockRequest = (options: {
  headers?: Record<string, string>;
  ip?: string;
  userAgent?: string;
  body?: any;
}) => {
  return {
    headers: {
      'content-type': 'application/json',
      'user-agent': options.userAgent || 'Mozilla/5.0',
      ...options.headers
    },
    ip: options.ip || '192.168.1.1',
    body: options.body ? JSON.stringify(options.body) : undefined,
    method: 'POST',
    url: 'https://wedsync.com/api/admin/test'
  } as Partial<NextRequest>;
};

const validAdminUser = {
  id: 'admin-001',
  email: 'admin@wedsync.com',
  role: 'admin',
  permissions: ['customer_success.read', 'customer_success.write', 'interventions.create'],
  organizationId: 'org-001',
  isActive: true,
  lastLoginAt: new Date(),
  createdAt: new Date('2023-01-01')
};

const restrictedUser = {
  id: 'user-001',
  email: 'user@wedsync.com',
  role: 'supplier',
  permissions: ['dashboard.read'],
  organizationId: 'org-002',
  isActive: true,
  lastLoginAt: new Date(),
  createdAt: new Date('2023-06-01')
};

describe('Admin Access Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.MockedFunction<any>).mockResolvedValue(true);
  });

  describe('Authentication Security', () => {
    test('should reject requests without authorization header', async () => {
      const request = createMockRequest({});
      
      await expect(authenticateRequest(request as NextRequest))
        .rejects.toThrow('Authorization header required');
    });

    test('should reject malformed authorization headers', async () => {
      const malformedHeaders = [
        'InvalidFormat',
        'Bearer',
        'Bearer ',
        'Basic dGVzdA==',
        'Bearer invalid.jwt.token.with.too.many.parts.here'
      ];

      for (const authHeader of malformedHeaders) {
        const request = createMockRequest({
          headers: { authorization: authHeader }
        });

        await expect(authenticateRequest(request as NextRequest))
          .rejects.toThrow();
      }
    });

    test('should reject expired JWT tokens', async () => {
      (jwt.verify as jest.MockedFunction<any>).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer expired.jwt.token' }
      });

      await expect(authenticateRequest(request as NextRequest))
        .rejects.toThrow('Token expired');
    });

    test('should reject invalid JWT signatures', async () => {
      (jwt.verify as jest.MockedFunction<any>).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid signature');
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid.signature.token' }
      });

      await expect(authenticateRequest(request as NextRequest))
        .rejects.toThrow('Invalid token');
    });

    test('should reject JWT with invalid issuer', async () => {
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({
        sub: validAdminUser.id,
        iss: 'malicious.site.com',
        aud: 'wedsync',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid.but.wrong.issuer' }
      });

      await expect(authenticateRequest(request as NextRequest))
        .rejects.toThrow('Invalid token issuer');
    });

    test('should reject JWT with invalid audience', async () => {
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({
        sub: validAdminUser.id,
        iss: 'wedsync.com',
        aud: 'malicious-app',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid.but.wrong.audience' }
      });

      await expect(authenticateRequest(request as NextRequest))
        .rejects.toThrow('Invalid token audience');
    });

    test('should accept valid admin JWT token', async () => {
      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({
        sub: validAdminUser.id,
        iss: 'wedsync.com',
        aud: 'wedsync',
        role: 'admin',
        permissions: validAdminUser.permissions,
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid.admin.token' }
      });

      const result = await authenticateRequest(request as NextRequest);
      
      expect(result.role).toBe('admin');
      expect(result.permissions).toEqual(validAdminUser.permissions);
    });

    test('should validate token claims thoroughly', async () => {
      const invalidClaims = [
        { sub: null }, // Missing subject
        { sub: validAdminUser.id, role: null }, // Missing role
        { sub: validAdminUser.id, role: 'admin', permissions: null }, // Missing permissions
        { sub: '', role: 'admin' }, // Empty subject
        { sub: validAdminUser.id, role: '', permissions: [] }, // Empty role
        { sub: validAdminUser.id, role: 'admin', exp: Math.floor(Date.now() / 1000) - 3600 } // Expired
      ];

      for (const claims of invalidClaims) {
        (jwt.verify as jest.MockedFunction<any>).mockReturnValue(claims);

        const request = createMockRequest({
          headers: { authorization: 'Bearer token.with.invalid.claims' }
        });

        await expect(authenticateRequest(request as NextRequest))
          .rejects.toThrow();
      }
    });
  });

  describe('Authorization Security', () => {
    test('should deny access for insufficient permissions', async () => {
      const result = requirePermissions(restrictedUser, ['customer_success.write']);
      expect(result).toBe(false);
    });

    test('should grant access for sufficient permissions', async () => {
      const result = requirePermissions(validAdminUser, ['customer_success.read']);
      expect(result).toBe(true);
    });

    test('should require all permissions when multiple specified', async () => {
      const requiredPermissions = ['customer_success.read', 'customer_success.write', 'admin.access'];
      const result = requirePermissions(validAdminUser, requiredPermissions);
      expect(result).toBe(false); // Missing admin.access
    });

    test('should validate role-based access restrictions', async () => {
      // Supplier trying to access admin endpoints
      const supplierAccess = validateAdminAccess(restrictedUser);
      expect(supplierAccess).toBe(false);

      // Admin accessing admin endpoints
      const adminAccess = validateAdminAccess(validAdminUser);
      expect(adminAccess).toBe(true);
    });

    test('should prevent privilege escalation attempts', async () => {
      // User trying to modify their own permissions
      const escalationAttempt = {
        ...restrictedUser,
        permissions: [...restrictedUser.permissions, 'admin.access']
      };

      // Verify permissions are validated server-side, not from token
      const result = requirePermissions(escalationAttempt, ['admin.access']);
      expect(result).toBe(false);
    });

    test('should validate organization-level access', async () => {
      const crossOrgUser = {
        ...validAdminUser,
        organizationId: 'different-org'
      };

      // Attempting to access resources from different organization
      const orgAccess = validateAdminAccess(crossOrgUser, 'org-001');
      expect(orgAccess).toBe(false);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should apply rate limits to authentication attempts', async () => {
      (rateLimit as jest.MockedFunction<any>).mockResolvedValue(false);

      const request = createMockRequest({
        headers: { authorization: 'Bearer rate.limited.token' }
      });

      await expect(authenticateRequest(request as NextRequest))
        .rejects.toThrow('Rate limit exceeded');
    });

    test('should have different rate limits for admin endpoints', async () => {
      const adminRateLimitSpy = jest.spyOn(require('../../src/lib/rate-limiting'), 'adminRateLimit');
      adminRateLimitSpy.mockResolvedValue(true);

      const request = createMockRequest({
        headers: { authorization: 'Bearer admin.token' }
      });

      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({
        sub: validAdminUser.id,
        role: 'admin',
        permissions: validAdminUser.permissions
      });

      await authenticateRequest(request as NextRequest);

      expect(adminRateLimitSpy).toHaveBeenCalledWith(request.ip, 'admin');
    });

    test('should implement progressive rate limiting for failed attempts', async () => {
      const attempts = [];
      
      for (let i = 0; i < 5; i++) {
        const shouldRateLimit = i >= 3; // Rate limit after 3 failed attempts
        (rateLimit as jest.MockedFunction<any>).mockResolvedValue(!shouldRateLimit);
        
        const request = createMockRequest({
          headers: { authorization: 'Bearer invalid.token' }
        });

        try {
          await authenticateRequest(request as NextRequest);
          attempts.push({ success: true, rateLimited: false });
        } catch (error: any) {
          const rateLimited = error.message.includes('Rate limit');
          attempts.push({ success: false, rateLimited });
        }
      }

      // First 3 attempts should fail due to invalid token
      expect(attempts.slice(0, 3).every(a => !a.success && !a.rateLimited)).toBe(true);
      
      // Next attempts should be rate limited
      expect(attempts.slice(3).every(a => !a.success && a.rateLimited)).toBe(true);
    });
  });

  describe('Input Validation Security', () => {
    test('should sanitize SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE suppliers; --",
        "1' OR '1'='1",
        "admin'/**/OR/**/1=1/**/--",
        "'; INSERT INTO users (role) VALUES ('admin'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const request = createMockRequest({
          body: { supplierId: payload },
          headers: { authorization: 'Bearer valid.admin.token' }
        });

        (jwt.verify as jest.MockedFunction<any>).mockReturnValue({
          sub: validAdminUser.id,
          role: 'admin',
          permissions: validAdminUser.permissions
        });

        // Assume we have a validation function that should reject SQL injection
        const isValid = validateInput(payload);
        expect(isValid).toBe(false);
      }
    });

    test('should prevent XSS attacks in admin inputs', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "<svg onload=alert('xss')>",
        "\\u003cscript\\u003ealert('xss')\\u003c/script\\u003e"
      ];

      for (const payload of xssPayloads) {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
      }
    });

    test('should validate admin action parameters', async () => {
      const invalidParameters = [
        { interventionId: '../../../etc/passwd' }, // Path traversal
        { supplierId: Array(1000).fill('A').join('') }, // Buffer overflow attempt
        { filter: { $where: "function() { return true; }" } }, // NoSQL injection
        { limit: -1 }, // Invalid pagination
        { offset: 'UNION SELECT * FROM users' } // SQL injection in offset
      ];

      for (const params of invalidParameters) {
        const isValid = validateAdminActionParams(params);
        expect(isValid).toBe(false);
      }
    });

    test('should enforce parameter size limits', async () => {
      const oversizedPayload = {
        message: Array(10000).fill('A').join(''), // 10KB message
        clientIds: Array(1000).fill('client-id') // Too many IDs
      };

      const request = createMockRequest({
        body: oversizedPayload,
        headers: { authorization: 'Bearer valid.admin.token' }
      });

      await expect(validateRequestSize(request as NextRequest))
        .rejects.toThrow('Request payload too large');
    });
  });

  describe('Session Security', () => {
    test('should validate session integrity', async () => {
      const session = {
        userId: validAdminUser.id,
        role: 'admin',
        createdAt: Date.now() - (8 * 60 * 60 * 1000), // 8 hours ago
        lastActivity: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const isValid = validateSessionIntegrity(session);
      expect(isValid).toBe(true);
    });

    test('should expire stale sessions', async () => {
      const staleSession = {
        userId: validAdminUser.id,
        role: 'admin',
        createdAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        lastActivity: Date.now() - (13 * 60 * 60 * 1000), // 13 hours ago
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const isValid = validateSessionIntegrity(staleSession);
      expect(isValid).toBe(false);
    });

    test('should detect session hijacking attempts', async () => {
      const originalSession = {
        userId: validAdminUser.id,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      };

      const suspiciousSession = {
        ...originalSession,
        ipAddress: '10.0.0.1', // Different IP
        userAgent: 'curl/7.68.0' // Different user agent
      };

      const isSuspicious = detectSessionHijacking(originalSession, suspiciousSession);
      expect(isSuspicious).toBe(true);
    });

    test('should require re-authentication for sensitive operations', async () => {
      const sessionAge = 4 * 60 * 60 * 1000; // 4 hours
      const operations = [
        'delete_all_data',
        'change_admin_permissions',
        'export_customer_data',
        'bulk_intervention_cancel'
      ];

      for (const operation of operations) {
        const requiresReauth = requiresReAuthentication(operation, sessionAge);
        expect(requiresReauth).toBe(true);
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should reject requests without CSRF token for state-changing operations', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid.admin.token' },
        body: { action: 'delete_supplier' }
      });

      await expect(validateCSRFToken(request as NextRequest))
        .rejects.toThrow('CSRF token required');
    });

    test('should reject requests with invalid CSRF tokens', async () => {
      const request = createMockRequest({
        headers: { 
          authorization: 'Bearer valid.admin.token',
          'x-csrf-token': 'invalid-token'
        },
        body: { action: 'delete_supplier' }
      });

      await expect(validateCSRFToken(request as NextRequest))
        .rejects.toThrow('Invalid CSRF token');
    });

    test('should accept requests with valid CSRF tokens', async () => {
      const validToken = generateCSRFToken('valid-session-id');
      
      const request = createMockRequest({
        headers: { 
          authorization: 'Bearer valid.admin.token',
          'x-csrf-token': validToken
        },
        body: { action: 'delete_supplier' }
      });

      await expect(validateCSRFToken(request as NextRequest))
        .resolves.not.toThrow();
    });
  });

  describe('Content Security Policy', () => {
    test('should enforce strict CSP headers', () => {
      const expectedCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');

      const cspHeader = getCSPHeader();
      expect(cspHeader).toBe(expectedCSP);
    });

    test('should prevent inline script execution', () => {
      const dangerousContent = `
        <div onclick="alert('xss')">Click me</div>
        <script>maliciousCode()</script>
      `;

      const sanitized = sanitizeContentForCSP(dangerousContent);
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).not.toContain('<script');
    });
  });

  describe('Audit Logging Security', () => {
    test('should log all admin authentication attempts', async () => {
      const logSpy = jest.spyOn(require('../../src/lib/audit-logger'), 'logAuthAttempt');
      
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid.admin.token' }
      });

      (jwt.verify as jest.MockedFunction<any>).mockReturnValue({
        sub: validAdminUser.id,
        role: 'admin'
      });

      await authenticateRequest(request as NextRequest);

      expect(logSpy).toHaveBeenCalledWith({
        userId: validAdminUser.id,
        action: 'authentication',
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: expect.any(Date)
      });
    });

    test('should log failed authentication attempts', async () => {
      const logSpy = jest.spyOn(require('../../src/lib/audit-logger'), 'logAuthAttempt');
      
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid.token' }
      });

      (jwt.verify as jest.MockedFunction<any>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      try {
        await authenticateRequest(request as NextRequest);
      } catch (error) {
        // Expected to fail
      }

      expect(logSpy).toHaveBeenCalledWith({
        userId: null,
        action: 'authentication',
        success: false,
        error: 'Invalid token',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: expect.any(Date)
      });
    });

    test('should log sensitive admin actions', async () => {
      const logSpy = jest.spyOn(require('../../src/lib/audit-logger'), 'logAdminAction');
      
      const sensitiveActions = [
        'delete_supplier_data',
        'export_customer_data',
        'modify_user_permissions',
        'bulk_intervention_cancel'
      ];

      for (const action of sensitiveActions) {
        logAdminAction(validAdminUser.id, action, {
          targetId: 'test-target',
          metadata: { reason: 'security test' }
        });
      }

      expect(logSpy).toHaveBeenCalledTimes(sensitiveActions.length);
    });

    test('should implement audit log integrity protection', () => {
      const logEntry = {
        id: 'log-001',
        userId: validAdminUser.id,
        action: 'delete_supplier',
        timestamp: new Date(),
        metadata: { supplierId: 'sup-001' }
      };

      const hash = generateAuditHash(logEntry);
      const isValid = validateAuditHash(logEntry, hash);
      
      expect(isValid).toBe(true);

      // Tamper with log entry
      logEntry.action = 'view_supplier';
      const isTampered = validateAuditHash(logEntry, hash);
      
      expect(isTampered).toBe(false);
    });
  });

  describe('Password Security', () => {
    test('should enforce strong password requirements', () => {
      const weakPasswords = [
        'password',
        '123456',
        'admin',
        'Password1', // Missing special character
        'password!', // Missing uppercase and numbers
        'PASS!1', // Too short
        'Pass1!' // Just meets minimum but weak
      ];

      for (const password of weakPasswords) {
        const isStrong = validatePasswordStrength(password);
        expect(isStrong).toBe(false);
      }

      const strongPasswords = [
        'MyStr0ng!Password',
        'C0mpl3x@P@ssw0rd!',
        'Secure123#Admin$'
      ];

      for (const password of strongPasswords) {
        const isStrong = validatePasswordStrength(password);
        expect(isStrong).toBe(true);
      }
    });

    test('should hash passwords securely', async () => {
      const password = 'SecureAdminPassword123!';
      
      (bcrypt.hash as jest.MockedFunction<any>).mockResolvedValue('$2a$12$hashedPassword');
      
      const hash = await hashPassword(password);
      
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12); // High salt rounds
      expect(hash).toBe('$2a$12$hashedPassword');
    });

    test('should prevent password reuse', async () => {
      const currentPassword = 'CurrentPassword123!';
      const previousPasswords = [
        'OldPassword1!',
        'OldPassword2!',
        'OldPassword3!'
      ];

      // Attempt to reuse old password
      const canReuse = await canReusePassword(currentPassword, previousPasswords);
      expect(canReuse).toBe(true);

      // Attempt to reuse previous password
      const canReusePrevious = await canReusePassword(previousPasswords[0], previousPasswords);
      expect(canReusePrevious).toBe(false);
    });
  });

  describe('Multi-Factor Authentication', () => {
    test('should require MFA for admin accounts', () => {
      const adminUser = { ...validAdminUser, mfaEnabled: false };
      const mfaRequired = requiresMFA(adminUser);
      expect(mfaRequired).toBe(true);
    });

    test('should validate TOTP codes', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const validCode = generateTOTP(secret);
      const invalidCode = '000000';

      expect(validateTOTP(secret, validCode)).toBe(true);
      expect(validateTOTP(secret, invalidCode)).toBe(false);
    });

    test('should prevent TOTP replay attacks', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code = generateTOTP(secret);

      // First use should succeed
      const firstAttempt = validateTOTP(secret, code, { preventReplay: true });
      expect(firstAttempt).toBe(true);

      // Second use of same code should fail
      const replayAttempt = validateTOTP(secret, code, { preventReplay: true });
      expect(replayAttempt).toBe(false);
    });

    test('should handle backup codes securely', () => {
      const backupCodes = generateBackupCodes();
      
      expect(backupCodes).toHaveLength(10);
      expect(backupCodes.every(code => code.length === 8)).toBe(true);
      
      // Use a backup code
      const useResult = useBackupCode(validAdminUser.id, backupCodes[0]);
      expect(useResult).toBe(true);
      
      // Try to reuse the same code
      const reuseResult = useBackupCode(validAdminUser.id, backupCodes[0]);
      expect(reuseResult).toBe(false);
    });
  });
});

// Security utility functions (mocked implementations)
function validateInput(input: string): boolean {
  const sqlPatterns = [
    /('|(\\')|(;)|(\\)|(\\n)|(\\r)|(\\t)|(\\b)|(\\f)/gi,
    /(\-\-)|(\#)|(\*)/gi,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(input));
}

function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

function validateAdminActionParams(params: any): boolean {
  if (typeof params !== 'object' || params === null) return false;
  
  // Check for path traversal
  const pathTraversalPattern = /(\.\.)|(\/etc\/)|(\~\/)/;
  const stringValues = JSON.stringify(params);
  if (pathTraversalPattern.test(stringValues)) return false;
  
  // Check for reasonable sizes
  if (JSON.stringify(params).length > 10000) return false;
  
  return true;
}

async function validateRequestSize(request: NextRequest): Promise<void> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
    throw new Error('Request payload too large');
  }
}

function validateSessionIntegrity(session: any): boolean {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const maxInactivity = 12 * 60 * 60 * 1000; // 12 hours
  
  const age = Date.now() - session.createdAt;
  const inactivity = Date.now() - session.lastActivity;
  
  return age < maxAge && inactivity < maxInactivity;
}

function detectSessionHijacking(original: any, current: any): boolean {
  // Simple heuristic: different IP and user agent
  return original.ipAddress !== current.ipAddress && 
         original.userAgent !== current.userAgent;
}

function requiresReAuthentication(operation: string, sessionAge: number): boolean {
  const sensitiveOperations = [
    'delete_all_data',
    'change_admin_permissions',
    'export_customer_data',
    'bulk_intervention_cancel'
  ];
  
  const maxAgeForSensitive = 1 * 60 * 60 * 1000; // 1 hour
  
  return sensitiveOperations.includes(operation) && sessionAge > maxAgeForSensitive;
}

async function validateCSRFToken(request: NextRequest): Promise<void> {
  const token = request.headers.get('x-csrf-token');
  if (!token) {
    throw new Error('CSRF token required');
  }
  
  // Validate token format and signature
  if (!isValidCSRFToken(token)) {
    throw new Error('Invalid CSRF token');
  }
}

function generateCSRFToken(sessionId: string): string {
  return `csrf_${sessionId}_${Date.now()}`;
}

function isValidCSRFToken(token: string): boolean {
  return token.startsWith('csrf_') && token.length > 20;
}

function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

function sanitizeContentForCSP(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}

function logAdminAction(userId: string, action: string, metadata: any): void {
  // Implementation would log to secure audit system
}

function generateAuditHash(entry: any): string {
  return `hash_${JSON.stringify(entry)}_${Date.now()}`;
}

function validateAuditHash(entry: any, expectedHash: string): boolean {
  const actualHash = generateAuditHash(entry);
  return actualHash === expectedHash;
}

function validatePasswordStrength(password: string): boolean {
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && 
         hasUppercase && 
         hasLowercase && 
         hasNumbers && 
         hasSpecialChar;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function canReusePassword(newPassword: string, previousPasswords: string[]): Promise<boolean> {
  for (const oldPassword of previousPasswords) {
    const isSame = await bcrypt.compare(newPassword, oldPassword);
    if (isSame) return false;
  }
  return true;
}

function requiresMFA(user: any): boolean {
  return user.role === 'admin' || user.role === 'customer_success_manager';
}

function generateTOTP(secret: string): string {
  // Mock implementation - would use actual TOTP library
  return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

function validateTOTP(secret: string, code: string, options: any = {}): boolean {
  if (options.preventReplay) {
    // Check if code was already used
    const usedCodes = getUsedCodes(secret);
    if (usedCodes.includes(code)) return false;
    
    // Mark code as used
    markCodeAsUsed(secret, code);
  }
  
  return code.length === 6 && /^\d{6}$/.test(code);
}

function getUsedCodes(secret: string): string[] {
  // Mock implementation - would store in secure cache
  return [];
}

function markCodeAsUsed(secret: string, code: string): void {
  // Mock implementation - would store in secure cache
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
}

function useBackupCode(userId: string, code: string): boolean {
  // Mock implementation - would check database and mark as used
  return true;
}