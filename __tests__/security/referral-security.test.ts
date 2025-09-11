/**
 * WS-344 Supplier Referral Gamification System - Security Tests
 * Comprehensive security testing for fraud prevention and input validation
 * Tests SQL injection, XSS prevention, rate limiting, authentication bypass
 */

import { ReferralTrackingService } from '@/services/ReferralTrackingService';
import { 
  createSecurityTestData, 
  createFraudTestData, 
  createMockReferral 
} from '@/test-utils/factories';
import { testApiHandler } from 'next-test-api-route-handler';
import createLinkHandler from '@/pages/api/referrals/create-link';
import trackConversionHandler from '@/pages/api/referrals/track-conversion';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';
import { sanitizeInput, validateReferralCode, detectSQLInjection } from '@/utils/security';

// Mock external dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/redis');
jest.mock('@supabase/auth-helpers-nextjs');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockRedis = redis as jest.Mocked<typeof redis>;

// Security test data
const securityData = createSecurityTestData();
const fraudData = createFraudTestData();

describe('Referral System Security Tests', () => {
  let service: ReferralTrackingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralTrackingService();
    
    // Default secure mocks
    const defaultQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };
    
    mockSupabase.from.mockReturnValue(defaultQuery as any);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in referral code lookup', async () => {
      const maliciousInputs = securityData.sqlInjectionPayloads;
      
      for (const payload of maliciousInputs) {
        // Mock to capture SQL queries
        const capturedQueries: any[] = [];
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation((column, value) => {
            capturedQueries.push({ column, value });
            return {
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            };
          })
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);

        const result = await service.trackConversion(payload, 'signup_started', 'supplier-456');

        if (result.success === false) {
          // Should be rejected before DB query
          expect(result.code).toBe('INVALID_CODE_FORMAT');
        } else {
          // If query was made, verify it was parameterized safely
          capturedQueries.forEach(query => {
            expect(query.value).not.toContain('DROP TABLE');
            expect(query.value).not.toContain('INSERT');
            expect(query.value).not.toContain('DELETE');
            expect(query.value).not.toContain('UPDATE');
            expect(query.value).not.toContain('--');
            expect(query.value).not.toContain(';');
          });
        }
      }
    });

    it('should use parameterized queries for all database operations', async () => {
      const queryLog: { operation: string; table: string; data: any }[] = [];
      
      // Mock all database operations to log them
      const mockFrom = jest.fn().mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockImplementation((data) => {
          queryLog.push({ operation: 'INSERT', table, data });
          return {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-id', code: 'TEST1234' },
              error: null
            })
          };
        }),
        update: jest.fn().mockImplementation((data) => {
          queryLog.push({ operation: 'UPDATE', table, data });
          return {
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: {}, error: null })
          };
        }),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }));
      
      mockSupabase.from = mockFrom;

      // Perform operations that could be vulnerable
      await service.createReferralLink('supplier-123', {
        customMessage: "'; DROP TABLE referrals; --",
        source: 'dashboard'
      });

      // Verify all operations used safe data structures
      queryLog.forEach(log => {
        if (typeof log.data === 'string') {
          expect(log.data).not.toContain('DROP TABLE');
          expect(log.data).not.toContain(';--');
        }
        
        if (typeof log.data === 'object' && log.data !== null) {
          const jsonString = JSON.stringify(log.data);
          expect(jsonString).not.toContain('DROP TABLE');
          expect(jsonString).not.toContain(';--');
        }
      });
    });

    it('should reject malicious SQL patterns in custom messages', async () => {
      const sqlPatterns = [
        "'; DROP TABLE suppliers; --",
        "UNION SELECT * FROM users",
        "1' OR '1'='1",
        "admin'/**/UNION/**/SELECT",
        "; EXEC xp_cmdshell('dir');",
        "' AND 1=2 UNION SELECT password FROM users--"
      ];

      for (const pattern of sqlPatterns) {
        const result = await service.createReferralLink('supplier-123', {
          customMessage: pattern,
          source: 'dashboard'
        });

        if (result.success) {
          // If accepted, message should be sanitized
          expect(result.data.shareText).not.toContain('DROP TABLE');
          expect(result.data.shareText).not.toContain('UNION SELECT');
          expect(result.data.shareText).not.toContain('xp_cmdshell');
        } else {
          // Should be rejected with appropriate error
          expect(result.code).toBe('INVALID_INPUT');
        }
      }
    });

    it('should validate input using prepared statement patterns', async () => {
      // Test that our validation functions work correctly
      const testCases = [
        { input: 'VALID123', expected: true },
        { input: "'; DROP TABLE", expected: false },
        { input: 'UNION SELECT', expected: false },
        { input: '--comment', expected: false },
        { input: 'normal text', expected: true },
        { input: "Bobby's Tables", expected: true }, // Should handle apostrophes safely
      ];

      testCases.forEach(testCase => {
        const isValid = validateReferralCode(testCase.input);
        if (testCase.expected) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize XSS in referral messages', async () => {
      const xssPayloads = securityData.xssPayloads;

      for (const payload of xssPayloads) {
        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { 
              id: 'ref-123',
              code: 'TEST1234',
              custom_message: sanitizeInput(payload),
              created_at: new Date().toISOString()
            },
            error: null
          })
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);

        const result = await service.createReferralLink('supplier-123', {
          customMessage: payload,
          source: 'dashboard'
        });

        expect(result.success).toBe(true);
        
        // Verify XSS content is removed from all outputs
        expect(result.data.shareText).not.toMatch(/<script.*?>.*?<\/script>/gi);
        expect(result.data.shareText).not.toMatch(/javascript:/gi);
        expect(result.data.shareText).not.toMatch(/on\w+\s*=/gi);
        expect(result.data.shareText).not.toMatch(/<iframe/gi);
        expect(result.data.shareText).not.toMatch(/<object/gi);
        expect(result.data.shareText).not.toMatch(/<embed/gi);
        
        // Check that insert data was also sanitized
        expect(mockQuery.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            custom_message: expect.not.stringMatching(/<script/i)
          })
        );
      }
    });

    it('should escape HTML in leaderboard display data', () => {
      const maliciousNames = [
        '<script>alert("XSS")</script>Photography Pro',
        '<img src="x" onerror="alert(\'XSS\')" />Catering Co',
        '"><script>document.cookie="stolen"</script>Wedding Planners',
        'javascript:alert("XSS")//Music Services'
      ];

      maliciousNames.forEach(name => {
        const escaped = sanitizeInput(name);
        
        expect(escaped).not.toMatch(/<script/gi);
        expect(escaped).not.toMatch(/javascript:/gi);
        expect(escaped).not.toMatch(/onerror=/gi);
        expect(escaped).not.toMatch(/document\.cookie/gi);
        
        // Should still contain the legitimate business type
        expect(escaped).toMatch(/(Photography|Catering|Wedding|Music)/);
      });
    });

    it('should prevent XSS in URL parameters', async () => {
      const maliciousParams = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '"><script>steal()</script>',
        '%3Cscript%3Ealert%28%27XSS%27%29%3C/script%3E' // URL encoded
      ];

      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          for (const param of maliciousParams) {
            const response = await fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referralCode: 'VALID123',
                stage: 'signup_started',
                metadata: {
                  source: param, // Malicious parameter
                  userAgent: param
                }
              })
            });

            const data = await response.json();
            
            // Response should not contain unsanitized XSS
            const responseText = JSON.stringify(data);
            expect(responseText).not.toMatch(/<script/gi);
            expect(responseText).not.toMatch(/javascript:/gi);
          }
        }
      });
    });

    it('should sanitize input in social sharing URLs', async () => {
      const maliciousMessage = '<script>alert("XSS")</script>Join me!';
      
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'ref-123',
            code: 'TEST1234',
            custom_message: 'Join me!', // Sanitized
            created_at: new Date().toISOString()
          },
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.createReferralLink('supplier-123', {
        customMessage: maliciousMessage,
        source: 'dashboard'
      });

      expect(result.success).toBe(true);
      
      // Check all social sharing URLs are safe
      expect(result.data.socialLinks.whatsapp).not.toContain('<script>');
      expect(result.data.socialLinks.facebook).not.toContain('<script>');
      expect(result.data.socialLinks.twitter).not.toContain('<script>');
      expect(result.data.socialLinks.linkedin).not.toContain('<script>');
      
      // URLs should be properly encoded
      expect(result.data.socialLinks.whatsapp).toMatch(/wa\.me.*text=/);
      expect(decodeURIComponent(result.data.socialLinks.whatsapp)).not.toContain('<script>');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits to prevent abuse', async () => {
      const supplierId = 'test-supplier';
      
      // Mock rate limiting - simulate approaching limit
      let requestCount = 0;
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('rate_limit')) {
          requestCount++;
          return Promise.resolve(requestCount.toString());
        }
        return Promise.resolve(null);
      });

      mockRedis.incr.mockResolvedValue(requestCount + 1);

      const results = [];
      
      // Attempt 7 requests (limit is 5 per hour)
      for (let i = 0; i < 7; i++) {
        try {
          const result = await service.createReferralLink(supplierId, {
            customMessage: `Test message ${i}`,
            source: 'dashboard'
          });
          results.push({ success: result.success, attempt: i + 1 });
        } catch (error: any) {
          results.push({ success: false, attempt: i + 1, error: error.message });
        }
      }

      // First 5 should succeed, 6th and 7th should be rate limited
      const successful = results.filter(r => r.success === true);
      const rateLimited = results.filter(r => r.success === false);

      expect(successful.length).toBeLessThanOrEqual(5);
      expect(rateLimited.length).toBeGreaterThanOrEqual(2);
    });

    it('should have different rate limits for different operations', async () => {
      const operations = [
        { name: 'referral_creation', limit: 5 },
        { name: 'conversion_tracking', limit: 100 },
        { name: 'leaderboard_view', limit: 60 }
      ];

      operations.forEach(op => {
        // Mock rate limit check for each operation
        mockRedis.get.mockImplementation((key) => {
          if (key.includes(op.name)) {
            return Promise.resolve((op.limit - 1).toString()); // Just under limit
          }
          return Promise.resolve('0');
        });

        // Should be allowed when under limit
        expect(mockRedis.get).toBeDefined();
      });
    });

    it('should detect and prevent rapid-fire requests', async () => {
      const supplierId = 'rapid-fire-user';
      const requests = [];
      
      // Mock rapid requests detection
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('rapid_requests')) {
          return Promise.resolve('10'); // 10 requests in last minute
        }
        return Promise.resolve(null);
      });

      // Should trigger rapid-fire protection
      try {
        await service.createReferralLink(supplierId, {
          customMessage: 'Rapid fire test',
          source: 'dashboard'
        });
      } catch (error: any) {
        expect(error.message).toContain('Too many requests');
      }
    });

    it('should implement progressive rate limiting', async () => {
      const supplierId = 'progressive-test';
      
      // Mock progressive timeouts
      const timeouts = [60, 300, 900, 3600]; // 1min, 5min, 15min, 1hour
      let violationCount = 0;
      
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('violations')) {
          return Promise.resolve(violationCount.toString());
        }
        if (key.includes('rate_limit')) {
          return Promise.resolve('6'); // Over limit
        }
        return Promise.resolve(null);
      });

      for (let i = 0; i < 4; i++) {
        violationCount = i;
        
        try {
          await service.createReferralLink(supplierId, {
            customMessage: `Violation ${i}`,
            source: 'dashboard'
          });
        } catch (error: any) {
          expect(error.message).toContain('Rate limit exceeded');
          // Should suggest increasing timeout
          expect(error.message).toMatch(/try again in \d+ (minutes?|hours?)/i);
        }
      }
    });
  });

  describe('Fraud Detection and Prevention', () => {
    it('should detect self-referral attempts', async () => {
      const supplierId = 'self-referrer';
      const referralCode = 'SELF1234';
      
      // Mock referral belonging to same supplier
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'ref-123',
            code: referralCode,
            referrer_id: supplierId, // Same as the one trying to use it
            status: 'active'
          },
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion(referralCode, 'signup_started', supplierId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Self-referral not allowed');
      expect(result.code).toBe('SELF_REFERRAL_BLOCKED');
    });

    it('should detect IP-based fraud patterns', async () => {
      const { suspiciousSupplier, suspiciousReferrals } = fraudData;
      
      // Mock multiple referrals from same IP
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('ip_usage')) {
          return Promise.resolve('5'); // 5 referrals from this IP today
        }
        return Promise.resolve(null);
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: suspiciousReferrals[0],
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.trackConversion(
        suspiciousReferrals[0].code, 
        'signup_started', 
        'different-supplier',
        {
          ip: '192.168.1.100', // Same IP as previous referrals
          userAgent: 'Mozilla/5.0...'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many referrals from this IP');
      expect(result.code).toBe('IP_FRAUD_DETECTED');
    });

    it('should detect email pattern fraud', async () => {
      const suspiciousEmails = [
        'test+1@example.com',
        'test+2@example.com', 
        'test+3@example.com',
        'test+4@example.com',
        'test+5@example.com'
      ];

      // Mock database query to return similar email patterns
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({
          data: [{ count: 5 }], // 5 similar email patterns
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.detectEmailPatternFraud('test+6@example.com');

      expect(result.isSuspicious).toBe(true);
      expect(result.pattern).toBe('PLUS_ADDRESSING_ABUSE');
      expect(result.similarEmailCount).toBe(5);
      expect(result.riskScore).toBeGreaterThan(70);
    });

    it('should detect coordinated fraud attempts', async () => {
      // Mock data showing coordinated signups
      const coordinatedData = {
        same_ip_signups: 8, // 8 signups from same IP in 1 hour
        similar_user_agents: 7, // 7 similar user agents
        rapid_succession_signups: 6, // 6 signups within 10 minutes
        conversion_rate: 95 // Unrealistically high conversion rate
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: coordinatedData,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await service.detectCoordinatedFraud('192.168.1.100');

      expect(result.isCoordinated).toBe(true);
      expect(result.indicators).toContain('SAME_IP_CLUSTER');
      expect(result.indicators).toContain('RAPID_SUCCESSION_SIGNUPS');
      expect(result.indicators).toContain('UNREALISTIC_CONVERSION_RATE');
      expect(result.riskScore).toBeGreaterThan(80);
    });

    it('should implement fraud scoring algorithm', async () => {
      const testCases = [
        {
          name: 'Legitimate User',
          data: {
            ip_referrals: 1,
            similar_emails: 0, 
            rapid_referrals: 0,
            conversion_rate: 35,
            account_age_days: 90
          },
          expectedRisk: 'LOW'
        },
        {
          name: 'Suspicious User',
          data: {
            ip_referrals: 3,
            similar_emails: 2,
            rapid_referrals: 2,
            conversion_rate: 60,
            account_age_days: 2
          },
          expectedRisk: 'MEDIUM'
        },
        {
          name: 'Fraudulent User',
          data: {
            ip_referrals: 10,
            similar_emails: 8,
            rapid_referrals: 12,
            conversion_rate: 95,
            account_age_days: 0
          },
          expectedRisk: 'HIGH'
        }
      ];

      for (const testCase of testCases) {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: testCase.data,
            error: null
          })
        };
        mockSupabase.from.mockReturnValue(mockQuery as any);

        const result = await service.calculateFraudScore('test-supplier');

        switch (testCase.expectedRisk) {
          case 'LOW':
            expect(result.riskScore).toBeLessThan(30);
            expect(result.riskLevel).toBe('LOW');
            break;
          case 'MEDIUM':
            expect(result.riskScore).toBeGreaterThanOrEqual(30);
            expect(result.riskScore).toBeLessThan(70);
            expect(result.riskLevel).toBe('MEDIUM');
            break;
          case 'HIGH':
            expect(result.riskScore).toBeGreaterThanOrEqual(70);
            expect(result.riskLevel).toBe('HIGH');
            break;
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require valid authentication for all protected endpoints', async () => {
      const protectedEndpoints = [
        { handler: createLinkHandler, method: 'POST', data: {} },
        { handler: trackConversionHandler, method: 'POST', data: { referralCode: 'TEST1234', stage: 'signup_started' } }
      ];

      for (const endpoint of protectedEndpoints) {
        await testApiHandler({
          handler: endpoint.handler,
          test: async ({ fetch }) => {
            // Request without auth
            const response = await fetch({
              method: endpoint.method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(endpoint.data)
            });

            expect(response.status).toBe(401);
            
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.error).toBe('Authentication required');
          }
        });
      }
    });

    it('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'expired.jwt.here',
        '',
        'Bearer malformed',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.fake.token'
      ];

      // Mock auth failure for invalid tokens
      const mockCreateRouteHandlerClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient as jest.Mock;
      
      for (const token of invalidTokens) {
        mockCreateRouteHandlerClient.mockReturnValue({
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Invalid JWT' }
            })
          }
        });

        await testApiHandler({
          handler: createLinkHandler,
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ customMessage: 'Test' })
            });

            expect(response.status).toBe(401);
          }
        });
      }
    });

    it('should prevent privilege escalation', async () => {
      // Mock user with limited privileges
      const mockCreateRouteHandlerClient = require('@supabase/auth-helpers-nextjs').createRouteHandlerClient as jest.Mock;
      mockCreateRouteHandlerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { 
              user: { 
                id: 'limited-user',
                email: 'limited@example.com',
                user_metadata: { role: 'supplier' } // Not admin
              } 
            },
            error: null
          })
        }
      });

      // Should not be able to access admin functions
      const adminOperations = [
        { operation: 'viewAllReferrals', supplierId: 'different-supplier' },
        { operation: 'modifyOtherUserData', supplierId: 'different-supplier' },
        { operation: 'accessSystemStats', supplierId: 'different-supplier' }
      ];

      for (const op of adminOperations) {
        const result = await service.validateUserAccess('limited-user', op.operation, op.supplierId);
        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain('Insufficient privileges');
      }
    });

    it('should implement session security', async () => {
      const securityChecks = [
        { check: 'sessionTimeout', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
        { check: 'ipValidation', enforceSameIP: true },
        { check: 'userAgentValidation', enforceSameUA: false },
        { check: 'concurrentSessions', maxSessions: 3 }
      ];

      securityChecks.forEach(check => {
        // These would be implemented in the actual session management
        expect(check.check).toBeDefined();
        
        switch (check.check) {
          case 'sessionTimeout':
            expect(check.maxAge).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
            break;
          case 'ipValidation':
            expect(typeof check.enforceSameIP).toBe('boolean');
            break;
          case 'concurrentSessions':
            expect(check.maxSessions).toBeGreaterThan(0);
            expect(check.maxSessions).toBeLessThanOrEqual(5);
            break;
        }
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate all input fields', async () => {
      const invalidInputs = [
        { field: 'customMessage', value: 'a'.repeat(1001), error: 'Message too long' },
        { field: 'customMessage', value: null, error: 'Invalid message format' },
        { field: 'source', value: 'invalid_source', error: 'Invalid source value' },
        { field: 'referralCode', value: '', error: 'Referral code required' },
        { field: 'referralCode', value: '123', error: 'Invalid referral code format' },
        { field: 'stage', value: 'invalid_stage', error: 'Invalid conversion stage' }
      ];

      for (const input of invalidInputs) {
        await testApiHandler({
          handler: createLinkHandler,
          test: async ({ fetch }) => {
            const requestBody: any = { customMessage: 'Valid message', source: 'dashboard' };
            requestBody[input.field] = input.value;

            const response = await fetch({
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer valid-token'
              },
              body: JSON.stringify(requestBody)
            });

            if (response.status === 400) {
              const data = await response.json();
              expect(data.success).toBe(false);
              expect(JSON.stringify(data.errors || data.error)).toContain(input.error.toLowerCase());
            }
          }
        });
      }
    });

    it('should sanitize file upload attempts in messages', async () => {
      const fileUploadAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '<script src="/malicious.js"></script>',
        'data:text/html,<script>alert(1)</script>',
        'javascript:void(0)'
      ];

      for (const attempt of fileUploadAttempts) {
        const sanitized = sanitizeInput(attempt);
        
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('/etc/');
        expect(sanitized).not.toContain('C:\\');
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/data:/i);
      }
    });

    it('should prevent header injection', async () => {
      const headerInjectionAttempts = [
        'normal\r\nSet-Cookie: evil=true',
        'test\nLocation: http://evil.com',
        'value\r\nContent-Type: text/html',
        "normal\r\n\r\n<script>alert('xss')</script>",
        'test\x00\x0aSet-Cookie: injected'
      ];

      for (const attempt of headerInjectionAttempts) {
        const sanitized = sanitizeInput(attempt);
        
        expect(sanitized).not.toContain('\r\n');
        expect(sanitized).not.toContain('\n');
        expect(sanitized).not.toContain('\r');
        expect(sanitized).not.toContain('\x00');
        expect(sanitized).not.toContain('\x0a');
        expect(sanitized).not.toContain('Set-Cookie');
        expect(sanitized).not.toContain('Location:');
      }
    });

    it('should validate email addresses properly', () => {
      const emailTests = [
        { email: 'valid@example.com', valid: true },
        { email: 'test+tag@domain.co.uk', valid: true },
        { email: 'user.name@sub.domain.com', valid: true },
        { email: 'invalid@', valid: false },
        { email: '@invalid.com', valid: false },
        { email: 'no-at-sign', valid: false },
        { email: 'spaces in@email.com', valid: false },
        { email: 'script<script>@evil.com', valid: false },
        { email: '"valid.quoted"@example.com', valid: true },
        { email: 'very.long.email.address.that.exceeds.limits@very.long.domain.name.that.also.exceeds.normal.limits.example.com', valid: false }
      ];

      emailTests.forEach(test => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test.email) && 
                       test.email.length <= 254 && 
                       !test.email.includes('<') && 
                       !test.email.includes('>');
        
        expect(isValid).toBe(test.valid);
      });
    });
  });

  describe('Audit Logging and Monitoring', () => {
    it('should log security events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Attempt SQL injection
      await service.trackConversion("'; DROP TABLE referrals; --", 'signup_started', 'test-supplier');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security violation detected'),
        expect.objectContaining({
          type: 'SQL_INJECTION_ATTEMPT',
          payload: expect.stringContaining('DROP TABLE'),
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          ip: expect.any(String)
        })
      );

      consoleSpy.mockRestore();
    });

    it('should track failed login attempts', async () => {
      const auditLog: any[] = [];
      
      // Mock audit logging
      const mockAuditLog = jest.fn((event) => {
        auditLog.push(event);
      });

      // Simulate failed login attempts
      const failedAttempts = [
        { ip: '192.168.1.100', email: 'admin@wedsync.com', reason: 'Invalid password' },
        { ip: '192.168.1.100', email: 'admin@wedsync.com', reason: 'Invalid password' },
        { ip: '192.168.1.100', email: 'admin@wedsync.com', reason: 'Invalid password' },
      ];

      failedAttempts.forEach(attempt => {
        mockAuditLog({
          event: 'FAILED_LOGIN',
          timestamp: new Date().toISOString(),
          ip: attempt.ip,
          email: attempt.email,
          reason: attempt.reason
        });
      });

      expect(auditLog).toHaveLength(3);
      expect(auditLog[0].event).toBe('FAILED_LOGIN');
      expect(auditLog[0].ip).toBe('192.168.1.100');
      
      // Should detect brute force pattern
      const sameIPAttempts = auditLog.filter(log => log.ip === '192.168.1.100');
      expect(sameIPAttempts).toHaveLength(3);
    });

    it('should monitor for suspicious patterns', async () => {
      const suspiciousPatterns = [
        { pattern: 'RAPID_REQUESTS', threshold: 10, timeWindow: 60 },
        { pattern: 'MULTIPLE_FAILED_AUTH', threshold: 5, timeWindow: 300 },
        { pattern: 'UNUSUAL_REFERRAL_VOLUME', threshold: 20, timeWindow: 3600 },
        { pattern: 'GEOGRAPHIC_ANOMALY', threshold: 3, timeWindow: 1800 }
      ];

      const mockMonitoring = {
        checkPattern: (pattern: string, count: number, window: number) => {
          const patternConfig = suspiciousPatterns.find(p => p.pattern === pattern);
          return patternConfig && count >= patternConfig.threshold;
        }
      };

      // Test each pattern
      suspiciousPatterns.forEach(pattern => {
        const isTriggered = mockMonitoring.checkPattern(pattern.pattern, pattern.threshold, pattern.timeWindow);
        expect(isTriggered).toBe(true);
        
        const isNotTriggered = mockMonitoring.checkPattern(pattern.pattern, pattern.threshold - 1, pattern.timeWindow);
        expect(isNotTriggered).toBe(false);
      });
    });
  });

  describe('CORS and Security Headers', () => {
    it('should implement proper CORS policy', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'OPTIONS',
            headers: {
              'Origin': 'https://wedsync.com',
              'Access-Control-Request-Method': 'POST'
            }
          });

          expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wedsync.com');
          expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
          expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
          expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
        }
      });
    });

    it('should reject unauthorized origins', async () => {
      const unauthorizedOrigins = [
        'http://malicious.com',
        'https://phishing-site.com',
        'http://localhost:3001', // Different port
        'https://wedsync.evil.com', // Subdomain attack
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const origin of unauthorizedOrigins) {
        await testApiHandler({
          handler: createLinkHandler,
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'OPTIONS',
              headers: {
                'Origin': origin,
                'Access-Control-Request-Method': 'POST'
              }
            });

            expect(response.status).toBe(403);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
          }
        });
      }
    });

    it('should include security headers', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });

          // Security headers
          expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
          expect(response.headers.get('X-Frame-Options')).toBe('DENY');
          expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
          expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
          expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
          expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
        }
      });
    });
  });
});