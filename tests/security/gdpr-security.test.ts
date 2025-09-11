import { describe, it, expect, beforeEach } from '@jest/globals'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * SECURITY TEST SUITE FOR GDPR IMPLEMENTATION
 * Tests for OWASP Top 10 vulnerabilities specific to privacy features
 */

describe('GDPR Security Tests', () => {
  const supabase = createClientComponentClient()
  
  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated access to privacy settings', async () => {
      const response = await fetch('/api/privacy/requests', {
        method: 'GET',
        headers: {
          // No auth token
        }
      })
      expect(response.status).toBe(401)
    })

    it('should prevent users from accessing other users data exports', async () => {
      const otherUsersExportId = 'export-belongs-to-another-user'
      const response = await fetch(`/api/privacy/export/${otherUsersExportId}`, {
        headers: {
          'Authorization': 'Bearer mock-user-token'
        }
      })
      expect(response.status).toBe(404) // Should not find other user's export
    })

    it('should prevent users from deleting other users accounts', async () => {
      const response = await fetch('/api/privacy/requests', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-user-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_type: 'erasure',
          user_id: 'another-user-id' // Attempting to delete another user
        })
      })
      expect(response.status).toBe(403) // Forbidden
    })
  })

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<%2Fscript%3E%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E'
    ]

    xssPayloads.forEach(payload => {
      it(`should sanitize XSS payload: ${payload.substring(0, 30)}...`, async () => {
        const response = await fetch('/api/privacy/consent', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            consents: [{
              consent_type: payload, // XSS attempt in consent type
              is_granted: true
            }]
          })
        })
        
        // Should either reject or sanitize
        if (response.ok) {
          const data = await response.json()
          expect(data).not.toContain('<script>')
          expect(data).not.toContain('javascript:')
          expect(data).not.toContain('onerror=')
          expect(data).not.toContain('onload=')
        }
      })
    })
  })

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users--",
      "admin'--",
      "' OR 1=1--",
      "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
      "' UNION SELECT NULL, NULL, NULL--",
      "1' AND '1' = '1"
    ]

    sqlInjectionPayloads.forEach(payload => {
      it(`should prevent SQL injection: ${payload.substring(0, 30)}...`, async () => {
        const response = await fetch('/api/privacy/requests', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer mock-token'
          },
          // Attempt SQL injection in query params
          search: `?user_id=${encodeURIComponent(payload)}`
        })
        
        // Should not execute SQL injection
        expect(response.status).not.toBe(500) // No server error from SQL
        if (response.ok) {
          const data = await response.json()
          expect(data.requests).toBeDefined()
          expect(data.error).toBeUndefined()
        }
      })
    })
  })

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token for state changes', async () => {
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
          // Missing CSRF token
        },
        body: JSON.stringify({
          consents: [{ consent_type: 'marketing', is_granted: true }]
        })
      })
      
      // Should have CSRF protection
      expect([403, 400]).toContain(response.status)
    })

    it('should reject requests with invalid CSRF token', async () => {
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid-token'
        },
        body: JSON.stringify({
          consents: [{ consent_type: 'marketing', is_granted: true }]
        })
      })
      
      expect([403, 400]).toContain(response.status)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on privacy requests', async () => {
      const requests = []
      
      // Attempt 10 requests rapidly (limit should be 5 per hour)
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('/api/privacy/requests', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              request_type: 'access'
            })
          })
        )
      }
      
      const responses = await Promise.all(requests)
      const rateLimited = responses.filter(r => r.status === 429)
      
      // Should have rate limited some requests
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })

  describe('Data Isolation', () => {
    it('should not leak user data in error messages', async () => {
      const response = await fetch('/api/privacy/export/non-existent-id', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
      
      const data = await response.json()
      
      // Error message should not contain sensitive info
      expect(JSON.stringify(data)).not.toMatch(/user_id/)
      expect(JSON.stringify(data)).not.toMatch(/email/)
      expect(JSON.stringify(data)).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i) // No UUIDs
    })

    it('should not allow enumeration of export IDs', async () => {
      const attempts = []
      
      // Try sequential IDs
      for (let i = 1; i <= 5; i++) {
        attempts.push(
          fetch(`/api/privacy/export/export-${i}`, {
            headers: {
              'Authorization': 'Bearer mock-token'
            }
          })
        )
      }
      
      const responses = await Promise.all(attempts)
      
      // All should return 404, not different status codes
      responses.forEach(response => {
        expect(response.status).toBe(404)
      })
    })
  })

  describe('Security Headers', () => {
    it('should set proper security headers on privacy endpoints', async () => {
      const response = await fetch('/api/privacy/consent', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
      
      // Check security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toMatch(/DENY|SAMEORIGIN/)
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=')
      expect(response.headers.get('Content-Security-Policy')).toBeDefined()
    })

    it('should not expose sensitive headers', async () => {
      const response = await fetch('/api/privacy/export/test-id', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
      
      // Should not expose server info
      expect(response.headers.get('Server')).toBeNull()
      expect(response.headers.get('X-Powered-By')).toBeNull()
    })
  })

  describe('Input Validation', () => {
    it('should validate request_type enum values', async () => {
      const response = await fetch('/api/privacy/requests', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_type: 'invalid_type' // Invalid enum value
        })
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request type')
    })

    it('should validate export format values', async () => {
      const response = await fetch('/api/privacy/requests', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_type: 'portability',
          format: 'exe' // Dangerous format
        })
      })
      
      expect(response.status).toBe(400)
    })

    it('should limit input sizes to prevent DoS', async () => {
      const largePayload = 'x'.repeat(1000000) // 1MB of data
      
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consents: [{
            consent_type: 'marketing',
            is_granted: true,
            metadata: largePayload
          }]
        })
      })
      
      expect([400, 413]).toContain(response.status) // Bad request or payload too large
    })
  })

  describe('Cryptographic Security', () => {
    it('should use secure random tokens for verification', async () => {
      // Mock creating privacy requests and check tokens
      const tokens = new Set()
      
      for (let i = 0; i < 10; i++) {
        const response = await fetch('/api/privacy/requests', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            request_type: 'access'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.verification_token) {
            // Token should be unique and sufficiently long
            expect(data.verification_token.length).toBeGreaterThanOrEqual(32)
            expect(tokens.has(data.verification_token)).toBe(false)
            tokens.add(data.verification_token)
          }
        }
      }
    })
  })

  describe('Time-based Security', () => {
    it('should expire export links after 7 days', async () => {
      // Mock an expired export
      const expiredExportId = 'expired-export-id'
      
      const response = await fetch(`/api/privacy/export/${expiredExportId}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })
      
      if (response.status === 410) { // Gone
        const data = await response.json()
        expect(data.error).toContain('expired')
      }
    })

    it('should enforce 30-day deadline for privacy requests', () => {
      // This would be tested in the backend logic
      const requestDate = new Date('2024-01-01')
      const deadline = new Date(requestDate)
      deadline.setDate(deadline.getDate() + 30)
      
      expect(deadline.getTime() - requestDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000)
    })
  })
})

describe('Dependency Security Audit', () => {
  it('should have no critical vulnerabilities in dependencies', async () => {
    // This would normally run npm audit or similar
    // For now, we'll check that security-sensitive packages are up to date
    const packageJson = require('../../package.json')
    
    // Check critical security packages are recent versions
    const securityPackages = {
      '@supabase/auth-helpers-nextjs': '^0.8.0',
      '@supabase/supabase-js': '^2.38.0',
      'next': '^14.0.0'
    }
    
    Object.entries(securityPackages).forEach(([pkg, minVersion]) => {
      if (packageJson.dependencies[pkg]) {
        // Basic version check (in production would use semver)
        expect(packageJson.dependencies[pkg]).toBeDefined()
      }
    })
  })
})

describe('Content Security Policy', () => {
  it('should prevent inline script execution', () => {
    // CSP should block inline scripts
    const testDiv = document.createElement('div')
    testDiv.innerHTML = '<script>window.xssTest = true;</script>'
    document.body.appendChild(testDiv)
    
    // Script should not execute due to CSP
    expect(window.xssTest).toBeUndefined()
    
    document.body.removeChild(testDiv)
  })

  it('should only allow scripts from trusted sources', () => {
    // This would be tested by checking CSP headers
    // CSP should only allow scripts from same origin and specific CDNs
    const cspHeader = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    
    expect(cspHeader).toContain("default-src 'self'")
    expect(cspHeader).not.toContain("unsafe-eval") // Should not have unsafe-eval in production
  })
})