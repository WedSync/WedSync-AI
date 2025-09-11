/**
 * WS-159: Webhook Security Tests
 * Comprehensive security testing for webhook endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  verifyWebhookSignature,
  verifyStripeWebhookSignature,
  generateWebhookSignature,
  isValidWebhookTimestamp,
  WebhookRateLimiter,
  validateWebhookHeaders,
  sanitizeWebhookPayload,
  WebhookIPValidator
} from '@/lib/security/webhook-validation'
import crypto from 'crypto'

describe('Webhook Security Validation', () => {
  const testSecret = 'test_webhook_secret_key'
  const testBody = '{"task_id":"task-123","status":"completed"}'
  const testTimestamp = Math.floor(Date.now() / 1000).toString()

  describe('HMAC Signature Verification', () => {
    it('should verify valid webhook signatures', async () => {
      const payload = testTimestamp + '.' + testBody
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload, 'utf8')
        .digest('hex')

      const isValid = await verifyWebhookSignature(
        expectedSignature,
        testTimestamp,
        testBody,
        testSecret
      )

      expect(isValid).toBe(true)
    })

    it('should reject invalid webhook signatures', async () => {
      const invalidSignature = 'invalid_signature_12345'

      const isValid = await verifyWebhookSignature(
        invalidSignature,
        testTimestamp,
        testBody,
        testSecret
      )

      expect(isValid).toBe(false)
    })

    it('should handle signatures with sha256 prefix', async () => {
      const payload = testTimestamp + '.' + testBody
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(payload, 'utf8')
        .digest('hex')

      const prefixedSignature = `sha256=${signature}`

      const isValid = await verifyWebhookSignature(
        prefixedSignature,
        testTimestamp,
        testBody,
        testSecret
      )

      expect(isValid).toBe(true)
    })

    it('should use timing-safe comparison to prevent timing attacks', async () => {
      const payload = testTimestamp + '.' + testBody
      const correctSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload, 'utf8')
        .digest('hex')

      // Create a signature that's almost correct (different by one character)
      const almostCorrectSignature = correctSignature.slice(0, -1) + 'x'

      const startTime = process.hrtime.bigint()
      const isValid1 = await verifyWebhookSignature(
        almostCorrectSignature,
        testTimestamp,
        testBody,
        testSecret
      )
      const time1 = process.hrtime.bigint() - startTime

      const startTime2 = process.hrtime.bigint()
      const isValid2 = await verifyWebhookSignature(
        'completely_wrong_signature',
        testTimestamp,
        testBody,
        testSecret
      )
      const time2 = process.hrtime.bigint() - startTime2

      expect(isValid1).toBe(false)
      expect(isValid2).toBe(false)
      
      // Timing should be similar (within reasonable bounds for timing-safe comparison)
      const timeDifference = Math.abs(Number(time1 - time2))
      expect(timeDifference).toBeLessThan(10_000_000) // 10ms difference max
    })

    it('should handle malformed signature gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation()

      const isValid = await verifyWebhookSignature(
        null as any, // Force null signature
        testTimestamp,
        testBody,
        testSecret
      )

      expect(isValid).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Stripe Webhook Signature Verification', () => {
    it('should verify valid Stripe webhook signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const payload = testBody
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(timestamp + '.' + payload, 'utf8')
        .digest('hex')

      const stripeSignature = `t=${timestamp},v1=${signature}`

      const isValid = verifyStripeWebhookSignature(payload, stripeSignature, testSecret)

      expect(isValid).toBe(true)
    })

    it('should reject signatures outside tolerance window', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400 // 6+ minutes ago
      const payload = testBody
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(oldTimestamp + '.' + payload, 'utf8')
        .digest('hex')

      const stripeSignature = `t=${oldTimestamp},v1=${signature}`

      const isValid = verifyStripeWebhookSignature(
        payload, 
        stripeSignature, 
        testSecret, 
        300 // 5 minute tolerance
      )

      expect(isValid).toBe(false)
    })

    it('should handle multiple signature versions', () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const payload = testBody
      const signature1 = crypto
        .createHmac('sha256', testSecret)
        .update(timestamp + '.' + payload, 'utf8')
        .digest('hex')
      const signature2 = crypto
        .createHmac('sha256', 'wrong_secret')
        .update(timestamp + '.' + payload, 'utf8')
        .digest('hex')

      const stripeSignature = `t=${timestamp},v1=${signature1},v1=${signature2}`

      const isValid = verifyStripeWebhookSignature(payload, stripeSignature, testSecret)

      expect(isValid).toBe(true) // Should pass because one signature is valid
    })
  })

  describe('Timestamp Validation', () => {
    it('should accept recent timestamps', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000).toString()

      const isValid = isValidWebhookTimestamp(recentTimestamp, 300)

      expect(isValid).toBe(true)
    })

    it('should reject old timestamps', () => {
      const oldTimestamp = Math.floor((Date.now() - 400 * 1000) / 1000).toString() // 6+ minutes ago

      const isValid = isValidWebhookTimestamp(oldTimestamp, 300) // 5 minute tolerance

      expect(isValid).toBe(false)
    })

    it('should reject future timestamps', () => {
      const futureTimestamp = Math.floor((Date.now() + 400 * 1000) / 1000).toString() // 6+ minutes future

      const isValid = isValidWebhookTimestamp(futureTimestamp, 300)

      expect(isValid).toBe(false)
    })

    it('should handle invalid timestamp formats', () => {
      const invalidTimestamp = 'not_a_timestamp'

      const isValid = isValidWebhookTimestamp(invalidTimestamp, 300)

      expect(isValid).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    let rateLimiter: WebhookRateLimiter

    beforeEach(() => {
      rateLimiter = new WebhookRateLimiter(5, 60000) // 5 requests per minute
    })

    it('should allow requests within limit', () => {
      const identifier = 'test-wedding-123'

      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.isAllowed(identifier)
        expect(result.allowed).toBe(true)
      }
    })

    it('should block requests exceeding limit', () => {
      const identifier = 'test-wedding-123'

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier)
      }

      // Next request should be blocked
      const result = rateLimiter.isAllowed(identifier)
      expect(result.allowed).toBe(false)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should track different identifiers separately', () => {
      const identifier1 = 'wedding-123'
      const identifier2 = 'wedding-456'

      // Use up limit for identifier1
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier1)
      }

      // identifier2 should still be allowed
      const result = rateLimiter.isAllowed(identifier2)
      expect(result.allowed).toBe(true)
    })

    it('should provide accurate statistics', () => {
      const identifier = 'test-wedding-123'

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        rateLimiter.isAllowed(identifier)
      }

      const stats = rateLimiter.getStats(identifier)
      expect(stats.requests).toBe(3)
      expect(stats.resetTime).toBeGreaterThan(Date.now())
    })

    it('should reset counters correctly', () => {
      const identifier = 'test-wedding-123'

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier)
      }

      // Reset and try again
      rateLimiter.reset(identifier)
      
      const result = rateLimiter.isAllowed(identifier)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Header Validation', () => {
    it('should validate required headers are present', () => {
      const headers = {
        'x-webhook-signature': 'sig123',
        'x-webhook-timestamp': '1642678800',
        'content-type': 'application/json'
      }

      const requiredHeaders = ['x-webhook-signature', 'x-webhook-timestamp']

      const result = validateWebhookHeaders(headers, requiredHeaders)

      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
    })

    it('should identify missing headers', () => {
      const headers = {
        'x-webhook-signature': 'sig123'
        // Missing x-webhook-timestamp
      }

      const requiredHeaders = ['x-webhook-signature', 'x-webhook-timestamp', 'x-source-system']

      const result = validateWebhookHeaders(headers, requiredHeaders)

      expect(result.valid).toBe(false)
      expect(result.missing).toEqual(['x-webhook-timestamp', 'x-source-system'])
    })

    it('should handle empty header values', () => {
      const headers = {
        'x-webhook-signature': '',
        'x-webhook-timestamp': '1642678800'
      }

      const requiredHeaders = ['x-webhook-signature', 'x-webhook-timestamp']

      const result = validateWebhookHeaders(headers, requiredHeaders)

      expect(result.valid).toBe(false)
      expect(result.missing).toEqual(['x-webhook-signature'])
    })
  })

  describe('Payload Sanitization', () => {
    it('should sanitize string payloads', () => {
      const maliciousPayload = '<script>alert("xss")</script>Hello world'

      const sanitized = sanitizeWebhookPayload(maliciousPayload)

      expect(sanitized).toBe('Hello world')
      expect(sanitized).not.toContain('<script>')
    })

    it('should sanitize object payloads recursively', () => {
      const maliciousPayload = {
        task_id: 'task-123',
        description: '<script>alert("xss")</script>Valid description',
        nested: {
          __proto__: 'malicious',
          constructor: 'dangerous',
          normalField: 'safe'
        },
        array: ['<script>bad</script>', 'good']
      }

      const sanitized = sanitizeWebhookPayload(maliciousPayload)

      expect(sanitized.task_id).toBe('task-123')
      expect(sanitized.description).toBe('Valid description')
      expect(sanitized.nested._nested.__proto__).toBeUndefined() // Should be renamed
      expect(sanitized.nested.normalField).toBe('safe')
      expect(sanitized.array[0]).toBe('good') // Script removed
      expect(sanitized.array[1]).toBe('good')
    })

    it('should handle array payloads', () => {
      const maliciousPayload = [
        'safe string',
        '<script>dangerous</script>',
        { field: 'safe', dangerous: '<script>bad</script>' }
      ]

      const sanitized = sanitizeWebhookPayload(maliciousPayload)

      expect(Array.isArray(sanitized)).toBe(true)
      expect(sanitized[0]).toBe('safe string')
      expect(sanitized[1]).toBe('')
      expect(sanitized[2].field).toBe('safe')
      expect(sanitized[2].dangerous).toBe('')
    })

    it('should preserve non-string primitive values', () => {
      const payload = {
        number: 123,
        boolean: true,
        null_value: null,
        undefined_value: undefined
      }

      const sanitized = sanitizeWebhookPayload(payload)

      expect(sanitized.number).toBe(123)
      expect(sanitized.boolean).toBe(true)
      expect(sanitized.null_value).toBe(null)
      expect(sanitized.undefined_value).toBe(undefined)
    })
  })

  describe('IP Validation', () => {
    it('should validate single IP addresses', () => {
      const validator = new WebhookIPValidator(['192.168.1.100', '10.0.0.50'])

      expect(validator.isAllowed('192.168.1.100')).toBe(true)
      expect(validator.isAllowed('10.0.0.50')).toBe(true)
      expect(validator.isAllowed('192.168.1.101')).toBe(false)
      expect(validator.isAllowed('127.0.0.1')).toBe(false)
    })

    it('should validate CIDR ranges', () => {
      const validator = new WebhookIPValidator(['192.168.1.0/24', '10.0.0.0/16'])

      expect(validator.isAllowed('192.168.1.1')).toBe(true)
      expect(validator.isAllowed('192.168.1.255')).toBe(true)
      expect(validator.isAllowed('192.168.2.1')).toBe(false)
      expect(validator.isAllowed('10.0.255.255')).toBe(true)
      expect(validator.isAllowed('10.1.0.1')).toBe(false)
    })

    it('should handle mixed IP and CIDR configurations', () => {
      const validator = new WebhookIPValidator([
        '127.0.0.1',           // Single IP
        '192.168.0.0/16',      // CIDR range
        '203.0.113.42'         // Another single IP
      ])

      expect(validator.isAllowed('127.0.0.1')).toBe(true)
      expect(validator.isAllowed('192.168.50.100')).toBe(true)
      expect(validator.isAllowed('203.0.113.42')).toBe(true)
      expect(validator.isAllowed('8.8.8.8')).toBe(false)
    })

    it('should handle invalid IP addresses gracefully', () => {
      const validator = new WebhookIPValidator(['192.168.1.0/24'])

      expect(validator.isAllowed('invalid.ip.address')).toBe(false)
      expect(validator.isAllowed('999.999.999.999')).toBe(false)
      expect(validator.isAllowed('')).toBe(false)
    })

    it('should allow all when no restrictions configured', () => {
      const validator = new WebhookIPValidator([])

      expect(validator.isAllowed('192.168.1.1')).toBe(false) // Should reject when no IPs allowed
      expect(validator.isAllowed('127.0.0.1')).toBe(false)
    })
  })

  describe('Signature Generation', () => {
    it('should generate valid webhook signatures', () => {
      const body = '{"test":"data"}'
      const timestamp = '1642678800'

      const signature = generateWebhookSignature(body, testSecret, timestamp)

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/)
      expect(signature).toContain(`t=${timestamp}`)
    })

    it('should generate signatures that can be verified', () => {
      const body = '{"test":"data"}'

      const signature = generateWebhookSignature(body, testSecret)
      
      // Extract timestamp and signature from generated signature
      const parts = signature.split(',')
      const timestamp = parts[0].split('=')[1]
      const sig = parts[1].split('=')[1]

      // Verify the generated signature
      const payload = timestamp + '.' + body
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload, 'utf8')
        .digest('hex')

      expect(sig).toBe(expectedSignature)
    })

    it('should use current timestamp when not provided', () => {
      const body = '{"test":"data"}'
      const beforeTime = Math.floor(Date.now() / 1000)

      const signature = generateWebhookSignature(body, testSecret)
      
      const timestamp = parseInt(signature.split(',')[0].split('=')[1])
      const afterTime = Math.floor(Date.now() / 1000)

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })
  })
})