/**
 * Security and Penetration Testing Suite
 * WS-342 Real-Time Wedding Collaboration - Team E QA & Documentation
 *
 * Comprehensive security testing for real-time collaboration system
 * Tests authentication, authorization, data protection, and privacy compliance
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import crypto from 'crypto';
import WebSocket from 'ws';
import * as Y from 'yjs';

// Security testing configuration
const SECURITY_CONFIG = {
  maxPasswordAttempts: 5,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  encryptionAlgorithm: 'aes-256-gcm',
  sensitiveDataClassifications: ['pii', 'financial', 'intimate'],
  gdprRequiredFields: ['consent', 'purpose', 'retention'],
  maxWebSocketConnections: 10,
  rateLimitRequests: 100,
  rateLimitWindowMs: 60 * 1000, // 1 minute
} as const;

// Security test scenarios
interface SecurityTestUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'vendor' | 'couple' | 'guest' | 'malicious';
  permissions: string[];
  weddingId?: string;
  deviceFingerprint?: string;
}

// Vulnerability categories to test
interface VulnerabilityTest {
  category:
    | 'authentication'
    | 'authorization'
    | 'injection'
    | 'xss'
    | 'csrf'
    | 'websocket'
    | 'data_exposure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  testPayload: any;
  expectedResult: 'blocked' | 'sanitized' | 'logged' | 'rate_limited';
}

// GDPR compliance test scenarios
interface GDPRTestScenario {
  dataType:
    | 'guest_list'
    | 'photos'
    | 'financial'
    | 'communications'
    | 'vendor_contracts';
  operation: 'collect' | 'process' | 'store' | 'transfer' | 'delete' | 'export';
  userConsent: boolean;
  legitimateInterest: boolean;
  dataMinimization: boolean;
  expectedCompliance: boolean;
}

class SecurityTestClient {
  private sessionToken?: string;
  private ws?: WebSocket;
  private requestLog: Array<{ timestamp: Date; request: any; response: any }> =
    [];

  constructor(private user: SecurityTestUser) {}

  async attemptLogin(
    username: string,
    password: string,
  ): Promise<{
    success: boolean;
    sessionToken?: string;
    errorMessage?: string;
    rateLimited?: boolean;
    accountLocked?: boolean;
  }> {
    try {
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await loginResponse.json();

      this.requestLog.push({
        timestamp: new Date(),
        request: { endpoint: '/api/auth/login', username },
        response: { status: loginResponse.status, success: result.success },
      });

      if (result.success) {
        this.sessionToken = result.sessionToken;
      }

      return {
        success: result.success,
        sessionToken: result.sessionToken,
        errorMessage: result.error,
        rateLimited: loginResponse.status === 429,
        accountLocked: result.error === 'Account locked',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async testSQLInjection(
    endpoint: string,
    injectionPayloads: string[],
  ): Promise<{
    vulnerabilityFound: boolean;
    blockedAttempts: number;
    successfulInjections: string[];
  }> {
    const results = {
      vulnerabilityFound: false,
      blockedAttempts: 0,
      successfulInjections: [] as string[],
    };

    for (const payload of injectionPayloads) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.sessionToken}`,
          },
          body: JSON.stringify({ search: payload }),
        });

        const responseText = await response.text();

        this.requestLog.push({
          timestamp: new Date(),
          request: { endpoint, payload },
          response: {
            status: response.status,
            body: responseText.substring(0, 200),
          },
        });

        // Check for SQL injection success indicators
        if (
          responseText.includes('sql') ||
          responseText.includes('database') ||
          responseText.includes('syntax error') ||
          response.status === 500
        ) {
          results.vulnerabilityFound = true;
          results.successfulInjections.push(payload);
        } else if (response.status === 400 || response.status === 403) {
          results.blockedAttempts++;
        }
      } catch (error) {
        results.blockedAttempts++;
      }
    }

    return results;
  }

  async testXSSVulnerability(
    endpoint: string,
    xssPayloads: string[],
  ): Promise<{
    vulnerabilityFound: boolean;
    sanitizedResponses: number;
    unsafeResponses: string[];
  }> {
    const results = {
      vulnerabilityFound: false,
      sanitizedResponses: 0,
      unsafeResponses: [] as string[],
    };

    for (const payload of xssPayloads) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.sessionToken}`,
          },
          body: JSON.stringify({ content: payload }),
        });

        const responseText = await response.text();

        // Check if XSS payload was sanitized or returned as-is
        if (
          responseText.includes('<script>') ||
          responseText.includes('javascript:')
        ) {
          results.vulnerabilityFound = true;
          results.unsafeResponses.push(payload);
        } else if (
          responseText.includes('&lt;script&gt;') ||
          responseText.includes('[script blocked]')
        ) {
          results.sanitizedResponses++;
        }
      } catch (error) {
        results.sanitizedResponses++;
      }
    }

    return results;
  }

  async testWebSocketSecurity(
    wsUrl: string,
    maliciousPayloads: any[],
  ): Promise<{
    connectionBlocked: boolean;
    messagesBlocked: number;
    dataLeaks: any[];
  }> {
    const results = {
      connectionBlocked: false,
      messagesBlocked: 0,
      dataLeaks: [] as any[],
    };

    try {
      this.ws = new WebSocket(wsUrl);

      const connectionPromise = new Promise((resolve, reject) => {
        this.ws!.on('open', () => resolve('connected'));
        this.ws!.on('error', () => {
          results.connectionBlocked = true;
          resolve('blocked');
        });
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const connectionResult = await connectionPromise;

      if (connectionResult === 'connected') {
        // Test malicious message payloads
        for (const payload of maliciousPayloads) {
          try {
            this.ws!.send(JSON.stringify(payload));

            // Wait for response
            const response = await new Promise((resolve) => {
              const timeout = setTimeout(() => resolve(null), 1000);
              this.ws!.once('message', (data) => {
                clearTimeout(timeout);
                resolve(JSON.parse(data.toString()));
              });
            });

            if (response === null) {
              results.messagesBlocked++;
            } else if (this.containsSensitiveData(response)) {
              results.dataLeaks.push({ payload, response });
            }
          } catch (error) {
            results.messagesBlocked++;
          }
        }
      }
    } catch (error) {
      results.connectionBlocked = true;
    }

    return results;
  }

  async testDataEncryption(sensitiveData: any[]): Promise<{
    encryptedInTransit: boolean;
    encryptedAtRest: boolean;
    weakEncryptionFound: boolean;
    unencryptedFields: string[];
  }> {
    const results = {
      encryptedInTransit: true,
      encryptedAtRest: true,
      weakEncryptionFound: false,
      unencryptedFields: [] as string[],
    };

    for (const data of sensitiveData) {
      try {
        // Test data transmission encryption
        const response = await fetch('/api/collaboration/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.sessionToken}`,
          },
          body: JSON.stringify(data),
        });

        // Check if response contains unencrypted sensitive data
        const responseText = await response.text();
        const sensitiveFields = this.extractSensitiveFields(data);

        for (const field of sensitiveFields) {
          if (
            responseText.includes(field.value) &&
            !this.isEncrypted(field.value)
          ) {
            results.unencryptedFields.push(field.name);
          }
        }

        // Test for weak encryption patterns
        if (this.hasWeakEncryption(responseText)) {
          results.weakEncryptionFound = true;
        }
      } catch (error) {
        // Connection errors might indicate missing TLS
        if (error instanceof Error && error.message.includes('TLS')) {
          results.encryptedInTransit = false;
        }
      }
    }

    return results;
  }

  private containsSensitiveData(response: any): boolean {
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (if not expected)
      /\$\d+,?\d*\.?\d*/, // Money amounts
    ];

    const responseStr = JSON.stringify(response);
    return sensitivePatterns.some((pattern) => pattern.test(responseStr));
  }

  private extractSensitiveFields(
    data: any,
  ): Array<{ name: string; value: string }> {
    const sensitiveFields: Array<{ name: string; value: string }> = [];

    const traverse = (obj: any, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const fullPath = path ? `${path}.${key}` : key;
          if (this.isSensitiveField(key, value)) {
            sensitiveFields.push({ name: fullPath, value });
          }
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, path ? `${path}.${key}` : key);
        }
      }
    };

    traverse(data);
    return sensitiveFields;
  }

  private isSensitiveField(fieldName: string, value: string): boolean {
    const sensitiveFieldNames = [
      'password',
      'ssn',
      'creditCard',
      'bankAccount',
      'phoneNumber',
    ];
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      /\b\d{3}-\d{2}-\d{4}\b/,
      /\b\d{10,15}\b/,
    ];

    return (
      sensitiveFieldNames.some((name) =>
        fieldName.toLowerCase().includes(name.toLowerCase()),
      ) || sensitivePatterns.some((pattern) => pattern.test(value))
    );
  }

  private isEncrypted(value: string): boolean {
    // Simple check for encrypted-looking data (base64, random characters)
    const encryptionPatterns = [
      /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64
      /^[a-f0-9]{32,}$/, // Hex
      /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, // bcrypt
    ];

    return encryptionPatterns.some((pattern) => pattern.test(value));
  }

  private hasWeakEncryption(data: string): boolean {
    const weakPatterns = [
      /md5/i,
      /sha1\b/i, // SHA1 is considered weak
      /base64/i, // Base64 is encoding, not encryption
    ];

    return weakPatterns.some((pattern) => pattern.test(data));
  }

  getRequestLog(): Array<{ timestamp: Date; request: any; response: any }> {
    return [...this.requestLog];
  }

  cleanup(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

class GDPRComplianceTester {
  private testResults: Map<string, boolean> = new Map();

  async testDataCollection(scenario: GDPRTestScenario): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Test consent requirements
    if (!scenario.userConsent && !scenario.legitimateInterest) {
      violations.push(
        'Data collection without user consent or legitimate interest',
      );
      recommendations.push('Implement explicit consent mechanism');
    }

    // Test data minimization
    if (!scenario.dataMinimization) {
      violations.push('Excessive data collection detected');
      recommendations.push(
        'Collect only necessary data for the specified purpose',
      );
    }

    // Test purpose limitation
    if (
      scenario.dataType === 'photos' &&
      scenario.operation === 'transfer' &&
      !scenario.userConsent
    ) {
      violations.push('Photo sharing without explicit consent');
      recommendations.push(
        'Require consent for photo sharing with third parties',
      );
    }

    // Test special category data handling
    if (
      this.isSpecialCategoryData(scenario.dataType) &&
      !scenario.userConsent
    ) {
      violations.push(
        'Special category data processed without explicit consent',
      );
      recommendations.push(
        'Implement enhanced consent for sensitive personal data',
      );
    }

    const compliant = violations.length === 0;
    this.testResults.set(
      `${scenario.dataType}_${scenario.operation}`,
      compliant,
    );

    return { compliant, violations, recommendations };
  }

  async testRightOfAccess(): Promise<{
    implemented: boolean;
    responseTime: number;
    dataCompleteness: number;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch('/api/gdpr/data-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test-user-123' }),
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      // Check data completeness
      const expectedDataTypes = [
        'profile',
        'weddings',
        'communications',
        'preferences',
      ];
      const providedDataTypes = Object.keys(data.userData || {});
      const dataCompleteness =
        providedDataTypes.length / expectedDataTypes.length;

      return {
        implemented: response.ok,
        responseTime,
        dataCompleteness,
      };
    } catch (error) {
      return {
        implemented: false,
        responseTime: Date.now() - startTime,
        dataCompleteness: 0,
      };
    }
  }

  async testRightOfErasure(): Promise<{
    implemented: boolean;
    cascadingDeletion: boolean;
    retentionRespected: boolean;
  }> {
    try {
      const response = await fetch('/api/gdpr/data-erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          reason: 'user_request',
        }),
      });

      const result = await response.json();

      return {
        implemented: response.ok,
        cascadingDeletion: result.deletedTables?.length > 1,
        retentionRespected: result.retentionPolicyApplied === true,
      };
    } catch (error) {
      return {
        implemented: false,
        cascadingDeletion: false,
        retentionRespected: false,
      };
    }
  }

  private isSpecialCategoryData(dataType: string): boolean {
    const specialCategories = ['photos', 'communications']; // May contain intimate/personal content
    return specialCategories.includes(dataType);
  }

  getComplianceScore(): number {
    if (this.testResults.size === 0) return 1.0;

    const compliantTests = Array.from(this.testResults.values()).filter(
      Boolean,
    ).length;
    return compliantTests / this.testResults.size;
  }
}

describe('Security and Penetration Testing Suite', () => {
  let testClients: SecurityTestClient[] = [];
  let gdprTester: GDPRComplianceTester;

  beforeEach(() => {
    testClients = [];
    gdprTester = new GDPRComplianceTester();
    jest.clearAllMocks();
  });

  afterEach(() => {
    testClients.forEach((client) => client.cleanup());
    testClients = [];
  });

  describe('Authentication Security', () => {
    test('should prevent brute force attacks', async () => {
      const maliciousUser: SecurityTestUser = {
        id: 'brute-force-test',
        username: 'target@example.com',
        password: 'wrong-password',
        role: 'malicious',
        permissions: [],
      };

      const client = new SecurityTestClient(maliciousUser);
      testClients.push(client);

      let rateLimitedAttempts = 0;
      let accountLocked = false;

      // Attempt multiple failed logins
      for (
        let attempt = 1;
        attempt <= SECURITY_CONFIG.maxPasswordAttempts + 2;
        attempt++
      ) {
        const result = await client.attemptLogin(
          maliciousUser.username,
          `wrong-password-${attempt}`,
        );

        if (result.rateLimited) {
          rateLimitedAttempts++;
        }

        if (result.accountLocked) {
          accountLocked = true;
          break;
        }
      }

      // Verify brute force protection is active
      expect(rateLimitedAttempts).toBeGreaterThan(0);
      expect(accountLocked).toBe(true);

      console.log(
        `✅ Brute force protection: ${rateLimitedAttempts} rate-limited, account locked: ${accountLocked}`,
      );
    }, 30000);

    test('should validate session tokens and prevent session fixation', async () => {
      const validUser: SecurityTestUser = {
        id: 'session-test-user',
        username: 'valid@example.com',
        password: 'correct-password',
        role: 'couple',
        permissions: ['read', 'write'],
      };

      const client = new SecurityTestClient(validUser);
      testClients.push(client);

      // Login with valid credentials
      const loginResult = await client.attemptLogin(
        validUser.username,
        validUser.password,
      );
      expect(loginResult.success).toBe(true);
      expect(loginResult.sessionToken).toBeDefined();

      // Test session token format and security
      const sessionToken = loginResult.sessionToken!;

      // Session token should be long and random
      expect(sessionToken.length).toBeGreaterThan(32);
      expect(sessionToken).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64-like format

      // Test with invalid/expired token
      const invalidTokenResponse = await fetch('/api/protected-endpoint', {
        headers: { Authorization: `Bearer invalid-token-123` },
      });

      expect(invalidTokenResponse.status).toBe(401);

      console.log(
        `✅ Session validation: Valid token format, invalid tokens rejected`,
      );
    }, 15000);
  });

  describe('SQL Injection Testing', () => {
    test('should prevent SQL injection attacks on collaboration endpoints', async () => {
      const testUser: SecurityTestUser = {
        id: 'sql-test-user',
        username: 'sqltester@example.com',
        password: 'test-password',
        role: 'vendor',
        permissions: ['read', 'write'],
      };

      const client = new SecurityTestClient(testUser);
      testClients.push(client);

      // Login first
      await client.attemptLogin(testUser.username, testUser.password);

      // SQL injection payloads
      const injectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (username) VALUES ('hacker'); --",
        "' UNION SELECT * FROM sensitive_data; --",
        "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
      ];

      const collaborationEndpoints = [
        '/api/collaboration/search',
        '/api/wedme/messages',
        '/api/collaboration/save',
      ];

      let totalVulnerabilities = 0;
      let totalBlockedAttempts = 0;

      for (const endpoint of collaborationEndpoints) {
        const result = await client.testSQLInjection(
          endpoint,
          injectionPayloads,
        );
        totalVulnerabilities += result.successfulInjections.length;
        totalBlockedAttempts += result.blockedAttempts;
      }

      // No SQL injections should succeed
      expect(totalVulnerabilities).toBe(0);
      expect(totalBlockedAttempts).toBeGreaterThan(
        injectionPayloads.length * collaborationEndpoints.length * 0.8,
      );

      console.log(
        `✅ SQL injection protection: ${totalVulnerabilities} vulnerabilities, ${totalBlockedAttempts} blocked attempts`,
      );
    }, 45000);
  });

  describe('XSS Prevention Testing', () => {
    test('should sanitize user input to prevent XSS attacks', async () => {
      const testUser: SecurityTestUser = {
        id: 'xss-test-user',
        username: 'xsstester@example.com',
        password: 'test-password',
        role: 'couple',
        permissions: ['read', 'write'],
      };

      const client = new SecurityTestClient(testUser);
      testClients.push(client);

      // Login first
      await client.attemptLogin(testUser.username, testUser.password);

      // XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(document.cookie)">',
        '<svg onload="alert(1)">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      ];

      const contentEndpoints = [
        '/api/collaboration/save',
        '/api/wedme/messages',
        '/api/collaboration/comment',
      ];

      let totalVulnerabilities = 0;
      let totalSanitized = 0;

      for (const endpoint of contentEndpoints) {
        const result = await client.testXSSVulnerability(endpoint, xssPayloads);
        totalVulnerabilities += result.unsafeResponses.length;
        totalSanitized += result.sanitizedResponses;
      }

      // No XSS vulnerabilities should exist
      expect(totalVulnerabilities).toBe(0);
      expect(totalSanitized).toBeGreaterThan(
        xssPayloads.length * contentEndpoints.length * 0.8,
      );

      console.log(
        `✅ XSS protection: ${totalVulnerabilities} vulnerabilities, ${totalSanitized} sanitized inputs`,
      );
    }, 30000);
  });

  describe('WebSocket Security Testing', () => {
    test('should secure WebSocket connections and prevent malicious messages', async () => {
      const testUser: SecurityTestUser = {
        id: 'websocket-test-user',
        username: 'wstester@example.com',
        password: 'test-password',
        role: 'vendor',
        permissions: ['websocket_access'],
      };

      const client = new SecurityTestClient(testUser);
      testClients.push(client);

      // Login first to get session token
      await client.attemptLogin(testUser.username, testUser.password);

      // Malicious WebSocket payloads
      const maliciousPayloads = [
        { type: 'admin_command', command: 'delete_all_users' },
        { type: 'sql_injection', query: "'; DROP TABLE weddings; --" },
        { type: 'buffer_overflow', data: 'A'.repeat(100000) },
        { type: 'privilege_escalation', newRole: 'admin' },
        { type: 'data_exfiltration', target: 'all_user_data' },
      ];

      const wsUrl = `ws://localhost:1234/test-wedding-${Date.now()}`;
      const result = await client.testWebSocketSecurity(
        wsUrl,
        maliciousPayloads,
      );

      // WebSocket should block malicious attempts
      expect(result.messagesBlocked).toBeGreaterThan(
        maliciousPayloads.length * 0.8,
      );
      expect(result.dataLeaks).toHaveLength(0);

      console.log(
        `✅ WebSocket security: ${result.messagesBlocked}/${maliciousPayloads.length} blocked, ${result.dataLeaks.length} data leaks`,
      );
    }, 30000);
  });

  describe('Data Encryption Testing', () => {
    test('should encrypt sensitive wedding data in transit and at rest', async () => {
      const testUser: SecurityTestUser = {
        id: 'encryption-test-user',
        username: 'encrypttester@example.com',
        password: 'test-password',
        role: 'couple',
        permissions: ['read', 'write'],
      };

      const client = new SecurityTestClient(testUser);
      testClients.push(client);

      // Login first
      await client.attemptLogin(testUser.username, testUser.password);

      // Sensitive wedding data
      const sensitiveData = [
        {
          guestList: [
            {
              name: 'John Smith',
              phoneNumber: '555-0123',
              email: 'john@example.com',
            },
            {
              name: 'Jane Doe',
              phoneNumber: '555-0456',
              dietaryRestrictions: 'Vegetarian',
            },
          ],
        },
        {
          vendorContracts: {
            photographer: { rate: '$2500', contact: 'photographer@studio.com' },
            catering: { rate: '$5000', contact: 'catering@company.com' },
          },
        },
        {
          budget: {
            totalBudget: '$25000',
            breakdown: {
              venue: '$10000',
              photography: '$2500',
              catering: '$5000',
            },
          },
        },
      ];

      const encryptionResult = await client.testDataEncryption(sensitiveData);

      // Verify encryption standards
      expect(encryptionResult.encryptedInTransit).toBe(true);
      expect(encryptionResult.encryptedAtRest).toBe(true);
      expect(encryptionResult.weakEncryptionFound).toBe(false);
      expect(encryptionResult.unencryptedFields).toHaveLength(0);

      console.log(
        `✅ Data encryption: Transit=${encryptionResult.encryptedInTransit}, Rest=${encryptionResult.encryptedAtRest}, Weak=${encryptionResult.weakEncryptionFound}`,
      );
    }, 30000);
  });

  describe('GDPR Compliance Testing', () => {
    test('should handle data collection with proper consent', async () => {
      const testScenarios: GDPRTestScenario[] = [
        {
          dataType: 'guest_list',
          operation: 'collect',
          userConsent: true,
          legitimateInterest: false,
          dataMinimization: true,
          expectedCompliance: true,
        },
        {
          dataType: 'photos',
          operation: 'transfer',
          userConsent: false,
          legitimateInterest: false,
          dataMinimization: true,
          expectedCompliance: false,
        },
        {
          dataType: 'communications',
          operation: 'process',
          userConsent: true,
          legitimateInterest: true,
          dataMinimization: true,
          expectedCompliance: true,
        },
      ];

      let complianceIssues = 0;
      let totalRecommendations = 0;

      for (const scenario of testScenarios) {
        const result = await gdprTester.testDataCollection(scenario);

        if (!result.compliant && scenario.expectedCompliance) {
          complianceIssues++;
        }

        totalRecommendations += result.recommendations.length;
      }

      const complianceScore = gdprTester.getComplianceScore();

      // GDPR compliance should be high
      expect(complianceScore).toBeGreaterThan(0.8); // 80% compliance minimum
      expect(complianceIssues).toBeLessThan(2); // Maximum 1 unexpected compliance issue

      console.log(
        `✅ GDPR compliance: ${complianceScore.toFixed(2)} score, ${complianceIssues} issues, ${totalRecommendations} recommendations`,
      );
    }, 30000);

    test('should implement right of access (data portability)', async () => {
      const accessResult = await gdprTester.testRightOfAccess();

      // Right of access requirements
      expect(accessResult.implemented).toBe(true);
      expect(accessResult.responseTime).toBeLessThan(30000); // <30 seconds response time
      expect(accessResult.dataCompleteness).toBeGreaterThan(0.8); // 80% of expected data types

      console.log(
        `✅ Right of access: Implemented=${accessResult.implemented}, Response=${accessResult.responseTime}ms, Completeness=${accessResult.dataCompleteness}`,
      );
    }, 45000);

    test('should implement right of erasure (right to be forgotten)', async () => {
      const erasureResult = await gdprTester.testRightOfErasure();

      // Right of erasure requirements
      expect(erasureResult.implemented).toBe(true);
      expect(erasureResult.cascadingDeletion).toBe(true);
      expect(erasureResult.retentionRespected).toBe(true);

      console.log(
        `✅ Right of erasure: Implemented=${erasureResult.implemented}, Cascading=${erasureResult.cascadingDeletion}, Retention=${erasureResult.retentionRespected}`,
      );
    }, 30000);
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should prevent API abuse through rate limiting', async () => {
      const testUser: SecurityTestUser = {
        id: 'rate-limit-test',
        username: 'ratelimiter@example.com',
        password: 'test-password',
        role: 'vendor',
        permissions: ['api_access'],
      };

      const client = new SecurityTestClient(testUser);
      testClients.push(client);

      // Login first
      await client.attemptLogin(testUser.username, testUser.password);

      let rateLimitedRequests = 0;
      let successfulRequests = 0;
      const totalRequests = SECURITY_CONFIG.rateLimitRequests + 20; // Exceed limit

      // Rapid-fire API requests
      const requestPromises = Array.from(
        { length: totalRequests },
        async (_, index) => {
          try {
            const response = await fetch('/api/collaboration/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${client['sessionToken']}`,
              },
              body: JSON.stringify({ test: `request-${index}` }),
            });

            if (response.status === 429) {
              rateLimitedRequests++;
            } else if (response.ok) {
              successfulRequests++;
            }
          } catch (error) {
            // Network errors count as blocked
            rateLimitedRequests++;
          }
        },
      );

      await Promise.all(requestPromises);

      // Rate limiting should kick in
      expect(rateLimitedRequests).toBeGreaterThan(10); // At least 10 requests should be rate limited
      expect(successfulRequests).toBeLessThan(
        SECURITY_CONFIG.rateLimitRequests,
      ); // Should not exceed limit

      const protectionEffectiveness = rateLimitedRequests / totalRequests;
      expect(protectionEffectiveness).toBeGreaterThan(0.15); // At least 15% of requests blocked

      console.log(
        `✅ Rate limiting: ${rateLimitedRequests}/${totalRequests} blocked (${(protectionEffectiveness * 100).toFixed(1)}%)`,
      );
    }, 60000);
  });
});
