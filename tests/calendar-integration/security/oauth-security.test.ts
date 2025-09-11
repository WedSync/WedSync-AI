/**
 * WS-336 Calendar Integration System - Security Tests
 * Comprehensive security testing for OAuth flows and API endpoints
 * 
 * WEDDING CONTEXT: Security is critical - wedding vendor data is highly sensitive
 * Any breach could expose private client information and ruin vendor reputation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as GoogleOAuthHandler } from '@/app/api/calendar/oauth/google/route'
import { POST as WebhookHandler } from '@/app/api/calendar/webhooks/google/route'
import { GET as CalendarEventsHandler } from '@/app/api/calendar/events/route'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

// Security test constants
const SECURITY_TEST_VECTORS = {
  // XSS Attack Payloads
  xssPayloads: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(\'xss\')">',
    '"><script>alert("xss")</script>',
    '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>'
  ],
  
  // SQL Injection Payloads
  sqlInjectionPayloads: [
    "'; DROP TABLE calendar_connections; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM user_profiles --",
    "'; DELETE FROM weddings; --",
    "' OR 1=1 --",
    "admin'--",
    "admin'/*",
    "' OR 'x'='x"
  ],
  
  // Path Traversal Payloads
  pathTraversalPayloads: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '../../../var/log/auth.log',
    '../../../../etc/shadow',
    '..\\..\\..\\boot.ini'
  ],
  
  // Command Injection Payloads
  commandInjectionPayloads: [
    '; cat /etc/passwd',
    '& ping -c 10 127.0.0.1 &',
    '| whoami',
    '`whoami`',
    '$(whoami)',
    '; ls -la /',
    '& dir &'
  ],

  // OAuth State Parameter Attacks
  maliciousStateParams: [
    'vendor_../../../admin/override',
    'vendor_<script>alert("xss")</script>',
    'vendor_; DROP TABLE users;--',
    'admin_system_access',
    'vendor_' + 'a'.repeat(10000), // Buffer overflow attempt
    'vendor_%00admin', // Null byte injection
    'vendor_\r\n\r\nHTTP/1.1 200 OK\r\n\r\n<html>Injected</html>' // HTTP Response Splitting
  ]
}

describe('Calendar Integration Security Tests', () => {
  let testVendorId: string
  let validOAuthCode: string
  let webhookSecret: string

  beforeEach(() => {
    testVendorId = `security-test-vendor-${Date.now()}`
    validOAuthCode = 'valid_oauth_code_12345'
    webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET || 'test-webhook-secret'
    
    // Setup clean test state
    jest.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up test data
    await supabase.from('calendar_connections').delete().eq('vendor_id', testVendorId)
    await supabase.from('user_profiles').delete().eq('id', testVendorId)
  })

  describe('OAuth Flow Security', () => {
    describe('State Parameter Validation', () => {
      it('should reject malicious state parameter injections', async () => {
        for (const maliciousState of SECURITY_TEST_VECTORS.maliciousStateParams) {
          const request = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
            method: 'POST',
            body: JSON.stringify({
              code: validOAuthCode,
              state: maliciousState
            }),
            headers: { 'Content-Type': 'application/json' }
          })

          const response = await GoogleOAuthHandler(request)
          const result = await response.json()

          // All malicious state parameters should be rejected
          expect(response.status).toBeGreaterThanOrEqual(400)
          expect(result.success).toBe(false)
          expect(result.error).toMatch(/Invalid state parameter|Unauthorized|Security violation/)
          
          // Ensure no database side effects
          const { data: connections } = await supabase
            .from('calendar_connections')
            .select('*')
            .eq('vendor_id', maliciousState.includes('vendor_') ? maliciousState.split('_')[1] : 'invalid')
          
          expect(connections).toHaveLength(0)
        }
      })

      it('should prevent state parameter length attacks', async () => {
        const longStateParam = 'vendor_' + 'a'.repeat(100000) // 100KB state parameter

        const request = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
          method: 'POST',
          body: JSON.stringify({
            code: validOAuthCode,
            state: longStateParam
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await GoogleOAuthHandler(request)

        expect(response.status).toBe(413) // Payload too large or 400 Bad Request
      })

      it('should validate state parameter format strictly', async () => {
        const invalidFormats = [
          '', // Empty
          'invalid_format', // Missing vendor_ prefix
          'vendor_', // Empty vendor ID
          'vendor_' + 'x'.repeat(1000), // Too long vendor ID
          'vendor_123@invalid', // Invalid characters
          'vendor_123\n\radmin', // Newline injection
          'VENDOR_123', // Case sensitivity test
        ]

        for (const invalidState of invalidFormats) {
          const request = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
            method: 'POST',
            body: JSON.stringify({
              code: validOAuthCode,
              state: invalidState
            })
          })

          const response = await GoogleOAuthHandler(request)
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      })
    })

    describe('Authorization Code Validation', () => {
      it('should reject malicious OAuth authorization codes', async () => {
        const maliciousCodes = [
          ...SECURITY_TEST_VECTORS.xssPayloads,
          ...SECURITY_TEST_VECTORS.sqlInjectionPayloads,
          ...SECURITY_TEST_VECTORS.pathTraversalPayloads,
          ...SECURITY_TEST_VECTORS.commandInjectionPayloads,
          'a'.repeat(100000), // Very long code
          '', // Empty code
          'code\nwith\nnewlines',
          'code with spaces',
          'code;with;semicolons',
          '../../../etc/passwd'
        ]

        for (const maliciousCode of maliciousCodes) {
          const request = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
            method: 'POST',
            body: JSON.stringify({
              code: maliciousCode,
              state: `vendor_${testVendorId}`
            })
          })

          const response = await GoogleOAuthHandler(request)
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      })

      it('should prevent code replay attacks', async () => {
        // First, use a valid OAuth code
        const usedCode = 'used_oauth_code_once'
        
        const firstRequest = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
          method: 'POST',
          body: JSON.stringify({
            code: usedCode,
            state: `vendor_${testVendorId}`
          })
        })

        // Mock successful first use
        jest.spyOn(global, 'fetch').mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'first_access_token',
            refresh_token: 'first_refresh_token',
            expires_in: 3600
          })
        } as Response)

        const firstResponse = await GoogleOAuthHandler(firstRequest)
        // Assume first request succeeds or fails - either way code is consumed

        // Attempt to reuse the same code
        const replayRequest = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
          method: 'POST',
          body: JSON.stringify({
            code: usedCode,
            state: `vendor_${testVendorId}`
          })
        })

        const replayResponse = await GoogleOAuthHandler(replayRequest)
        
        // Replay should be rejected
        expect(replayResponse.status).toBe(400)
        const replayResult = await replayResponse.json()
        expect(replayResult.error).toMatch(/invalid_grant|already used|expired/)
      })
    })

    describe('Token Security', () => {
      it('should store tokens with strong encryption', async () => {
        // Create test vendor first
        await supabase.from('user_profiles').insert({
          id: testVendorId,
          email: 'security-test@wedsync.com',
          business_name: 'Security Test Business',
          user_type: 'vendor'
        })

        const request = new NextRequest('http://localhost:3000/api/calendar/oauth/google', {
          method: 'POST',
          body: JSON.stringify({
            code: validOAuthCode,
            state: `vendor_${testVendorId}`
          })
        })

        // Mock successful OAuth response
        jest.spyOn(global, 'fetch').mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test_access_token_12345',
            refresh_token: 'test_refresh_token_67890',
            expires_in: 3600
          })
        } as Response)

        const response = await GoogleOAuthHandler(request)
        expect(response.status).toBe(200)

        // Verify tokens are encrypted in database
        const { data: connection } = await supabase
          .from('calendar_connections')
          .select('encrypted_access_token, encrypted_refresh_token')
          .eq('vendor_id', testVendorId)
          .single()

        expect(connection).toBeTruthy()
        // Tokens should not be stored in plaintext
        expect(connection.encrypted_access_token).not.toBe('test_access_token_12345')
        expect(connection.encrypted_refresh_token).not.toBe('test_refresh_token_67890')
        // Should look like encrypted data (base64 encoded)
        expect(connection.encrypted_access_token).toMatch(/^[A-Za-z0-9+/=]+$/)
        expect(connection.encrypted_refresh_token).toMatch(/^[A-Za-z0-9+/=]+$/)
      })

      it('should not expose tokens in API responses', async () => {
        // Create test vendor and connection
        await setupTestVendorWithConnection(testVendorId)

        const request = new NextRequest('http://localhost:3000/api/calendar/connections', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${testVendorId}` }
        })

        const response = await CalendarEventsHandler(request)
        const result = await response.json()

        // Response should not contain sensitive token data
        const responseText = JSON.stringify(result)
        expect(responseText).not.toContain('access_token')
        expect(responseText).not.toContain('refresh_token')
        expect(responseText).not.toContain('encrypted_access_token')
        expect(responseText).not.toContain('encrypted_refresh_token')
      })

      it('should implement secure token refresh mechanism', async () => {
        await setupTestVendorWithConnection(testVendorId, true) // Expired token

        const request = new NextRequest('http://localhost:3000/api/calendar/events', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${testVendorId}` }
        })

        // Mock successful token refresh
        jest.spyOn(global, 'fetch').mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'new_refreshed_token',
            expires_in: 3600
          })
        } as Response)

        const response = await CalendarEventsHandler(request)
        
        // Should handle token refresh transparently
        expect(response.status).toBeLessThan(500) // No server error

        // Verify new token is stored encrypted
        const { data: connection } = await supabase
          .from('calendar_connections')
          .select('encrypted_access_token, expires_at')
          .eq('vendor_id', testVendorId)
          .single()

        expect(connection.encrypted_access_token).not.toBe('new_refreshed_token')
        expect(new Date(connection.expires_at).getTime()).toBeGreaterThan(Date.now())
      })
    })
  })

  describe('Webhook Security', () => {
    describe('Signature Validation', () => {
      it('should reject webhooks with invalid signatures', async () => {
        const webhookPayload = {
          kind: 'api#channel',
          id: 'security-test-channel',
          resourceId: 'security-test-resource'
        }

        const invalidSignatures = [
          'invalid_signature',
          'sha256=wrong_signature',
          '',
          'sha256=' + 'a'.repeat(64), // Wrong signature but correct format
          'md5=different_algorithm',
          'sha256=../../../etc/passwd', // Path traversal attempt
          'sha256=<script>alert("xss")</script>',
          'sha256=' + crypto.randomBytes(32).toString('hex') // Random but wrong signature
        ]

        for (const invalidSignature of invalidSignatures) {
          const request = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
            method: 'POST',
            headers: {
              'X-Hub-Signature': invalidSignature,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
          })

          const response = await WebhookHandler(request)
          expect(response.status).toBe(401) // Unauthorized
          
          const result = await response.json()
          expect(result.error).toMatch(/Invalid.*signature|Unauthorized/)
        }
      })

      it('should validate webhook signatures using constant-time comparison', async () => {
        const webhookPayload = {
          kind: 'api#channel',
          id: 'timing-attack-test',
          resourceId: 'timing-test'
        }

        const validSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(webhookPayload))
          .digest('hex')

        // Test with correct signature (should be fast)
        const validRequest = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
          method: 'POST',
          headers: {
            'X-Hub-Signature': `sha256=${validSignature}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        })

        const validStartTime = performance.now()
        const validResponse = await WebhookHandler(validRequest)
        const validDuration = performance.now() - validStartTime

        // Test with incorrect signature (should take similar time)
        const invalidSignature = crypto.randomBytes(32).toString('hex')
        const invalidRequest = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
          method: 'POST',
          headers: {
            'X-Hub-Signature': `sha256=${invalidSignature}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        })

        const invalidStartTime = performance.now()
        const invalidResponse = await WebhookHandler(invalidRequest)
        const invalidDuration = performance.now() - invalidStartTime

        // Timing should be similar (within 50% difference) to prevent timing attacks
        const timingRatio = Math.abs(validDuration - invalidDuration) / Math.max(validDuration, invalidDuration)
        expect(timingRatio).toBeLessThan(0.5)

        expect(validResponse.status).toBe(200)
        expect(invalidResponse.status).toBe(401)
      })

      it('should prevent webhook signature bypass attempts', async () => {
        const maliciousPayload = {
          malicious: 'payload',
          admin: true,
          escalate_privileges: 'yes'
        }

        const bypassAttempts = [
          { 'X-Hub-Signature': 'sha256=', body: JSON.stringify(maliciousPayload) },
          { 'X-Hub-Signature-256': 'valid_signature', body: JSON.stringify(maliciousPayload) },
          { 'x-hub-signature': 'sha256=case_test', body: JSON.stringify(maliciousPayload) },
          { 'X-Hub-Signature': null, body: JSON.stringify(maliciousPayload) },
          { 'Authorization': 'Bearer fake_token', body: JSON.stringify(maliciousPayload) }
        ]

        for (const attempt of bypassAttempts) {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...Object.fromEntries(
              Object.entries(attempt).filter(([k, v]) => k !== 'body' && v !== null)
            )
          }

          const request = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
            method: 'POST',
            headers,
            body: attempt.body
          })

          const response = await WebhookHandler(request)
          expect(response.status).toBe(401) // All bypass attempts should fail
        }
      })
    })

    describe('Rate Limiting and DoS Protection', () => {
      it('should rate limit webhook requests per IP', async () => {
        const webhookPayload = {
          kind: 'api#channel',
          id: 'rate-limit-test'
        }

        const validSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(webhookPayload))
          .digest('hex')

        // Send many requests rapidly
        const rapidRequests = Array(30).fill(null).map(() => 
          new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
            method: 'POST',
            headers: {
              'X-Hub-Signature': `sha256=${validSignature}`,
              'X-Forwarded-For': '192.168.1.100', // Simulate same IP
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
          })
        )

        const responses = await Promise.all(
          rapidRequests.map(req => WebhookHandler(req))
        )

        // Some requests should be rate limited
        const successfulRequests = responses.filter(r => r.status === 200)
        const rateLimitedRequests = responses.filter(r => r.status === 429)

        expect(rateLimitedRequests.length).toBeGreaterThan(10) // Should rate limit excess requests
        expect(successfulRequests.length).toBeLessThan(20) // Not all should succeed
      })

      it('should prevent webhook payload size attacks', async () => {
        const oversizedPayload = {
          kind: 'api#channel',
          malicious_data: 'x'.repeat(10 * 1024 * 1024) // 10MB payload
        }

        const signature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(oversizedPayload))
          .digest('hex')

        const request = new NextRequest('http://localhost:3000/api/calendar/webhooks/google', {
          method: 'POST',
          headers: {
            'X-Hub-Signature': `sha256=${signature}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(oversizedPayload)
        })

        const response = await WebhookHandler(request)
        expect(response.status).toBe(413) // Payload too large
      })
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should sanitize calendar event data for XSS prevention', async () => {
      await setupTestVendorWithConnection(testVendorId)

      for (const xssPayload of SECURITY_TEST_VECTORS.xssPayloads) {
        const maliciousEvent = {
          title: xssPayload,
          description: `Event description with ${xssPayload}`,
          location: `Venue${xssPayload}`,
          attendees: [`evil${xssPayload}@example.com`]
        }

        const request = new NextRequest('http://localhost:3000/api/calendar/events', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${testVendorId}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(maliciousEvent)
        })

        const response = await CalendarEventsHandler(request)
        
        if (response.status === 200) {
          const result = await response.json()
          
          // XSS payload should be sanitized or escaped
          expect(result.event?.title).not.toContain('<script>')
          expect(result.event?.description).not.toContain('javascript:')
          expect(result.event?.location).not.toContain('onerror=')
        } else {
          // Or the request should be rejected entirely
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    it('should prevent SQL injection through API parameters', async () => {
      await setupTestVendorWithConnection(testVendorId)

      for (const sqlPayload of SECURITY_TEST_VECTORS.sqlInjectionPayloads) {
        const request = new NextRequest(`http://localhost:3000/api/calendar/events?search=${encodeURIComponent(sqlPayload)}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${testVendorId}` }
        })

        const response = await CalendarEventsHandler(request)
        
        // Should not cause database errors or return unauthorized data
        expect(response.status).not.toBe(500) // No internal server error
        
        if (response.status === 200) {
          const result = await response.json()
          // Should not return data from other tables or users
          expect(JSON.stringify(result)).not.toContain('password')
          expect(JSON.stringify(result)).not.toContain('email')
          expect(JSON.stringify(result)).not.toContain('admin')
        }
      }
    })

    it('should validate and sanitize file upload paths', async () => {
      const maliciousPaths = [
        ...SECURITY_TEST_VECTORS.pathTraversalPayloads,
        'calendar-export.csv../../../etc/passwd',
        'export\\..\\..\\windows\\system32\\config\\sam.csv',
        'normal_file.csv\0.exe', // Null byte injection
        'file.csv;rm -rf /', // Command injection attempt
      ]

      for (const maliciousPath of maliciousPaths) {
        const request = new NextRequest('http://localhost:3000/api/calendar/export', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${testVendorId}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: maliciousPath,
            format: 'csv'
          })
        })

        const response = await CalendarEventsHandler(request)
        
        // Should reject malicious paths
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('Access Control and Authorization', () => {
    it('should enforce vendor isolation for calendar data', async () => {
      // Setup two different vendors
      const vendor1 = `security-vendor-1-${Date.now()}`
      const vendor2 = `security-vendor-2-${Date.now()}`
      
      await setupTestVendorWithConnection(vendor1)
      await setupTestVendorWithConnection(vendor2)

      // Vendor 1 tries to access Vendor 2's calendar events
      const request = new NextRequest(`http://localhost:3000/api/calendar/events?vendor_id=${vendor2}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${vendor1}` }
      })

      const response = await CalendarEventsHandler(request)
      
      // Should be denied access to other vendor's data
      expect(response.status).toBe(403) // Forbidden
      
      const result = await response.json()
      expect(result.error).toMatch(/Unauthorized|Forbidden|Access denied/)

      // Clean up
      await supabase.from('calendar_connections').delete().eq('vendor_id', vendor1)
      await supabase.from('calendar_connections').delete().eq('vendor_id', vendor2)
      await supabase.from('user_profiles').delete().eq('id', vendor1)
      await supabase.from('user_profiles').delete().eq('id', vendor2)
    })

    it('should validate JWT tokens and prevent tampering', async () => {
      const tamperedTokens = [
        'invalid.jwt.token',
        '',
        'Bearer fake_token',
        `Bearer ${testVendorId}..malicious_suffix`,
        'Bearer admin_override_token',
        `Bearer ${testVendorId.replace(/.$/, 'x')}`, // Changed last character
        'Bearer ' + Buffer.from('malicious payload').toString('base64')
      ]

      for (const tamperedToken of tamperedTokens) {
        const request = new NextRequest('http://localhost:3000/api/calendar/events', {
          method: 'GET',
          headers: { 'Authorization': tamperedToken }
        })

        const response = await CalendarEventsHandler(request)
        expect(response.status).toBe(401) // Unauthorized
      }
    })

    it('should implement proper session management', async () => {
      await setupTestVendorWithConnection(testVendorId)

      // Test session expiration
      const expiredSessionRequest = new NextRequest('http://localhost:3000/api/calendar/events', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${testVendorId}`,
          'X-Session-Expired': 'true' // Simulate expired session
        }
      })

      const expiredResponse = await CalendarEventsHandler(expiredSessionRequest)
      
      // Should require re-authentication
      if (expiredResponse.status === 401) {
        const result = await expiredResponse.json()
        expect(result.error).toMatch(/Session expired|Re-authentication required/)
      }
    })
  })

  // Helper functions
  async function setupTestVendorWithConnection(vendorId: string, expiredToken: boolean = false) {
    // Create test vendor
    await supabase.from('user_profiles').upsert({
      id: vendorId,
      email: `${vendorId}@security-test.com`,
      business_name: 'Security Test Business',
      user_type: 'vendor'
    })

    // Create calendar connection
    await supabase.from('calendar_connections').upsert({
      vendor_id: vendorId,
      provider: 'google',
      encrypted_access_token: 'encrypted_test_access_token',
      encrypted_refresh_token: 'encrypted_test_refresh_token',
      expires_at: expiredToken 
        ? new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        : new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      user_email: `${vendorId}@gmail.com`,
      connection_status: 'active'
    })
  }
})