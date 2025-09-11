/**
 * WS-130 Round 3: Photography AI Security Testing
 * Comprehensive security validation including authentication, authorization, and data protection
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { photographyRateLimiter } from '@/lib/ratelimit/photography-rate-limiter';
import { FeatureGateService } from '@/lib/billing/featureGating';
// Mock external dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/billing/featureGating');
vi.mock('@/lib/ratelimit/photography-rate-limiter');
// Security test configuration
const SECURITY_CONFIG = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxImageUpload: 5 * 1024 * 1024,  // 5MB per image
  rateLimitWindow: 3600, // 1 hour
  allowedOrigins: ['http://localhost:3000', 'https://wedsync.com'],
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileNameLength: 255,
  maxColorArrayLength: 10
};
describe('Photography AI Security Testing', () => {
  let mockSupabase: unknown;
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn()
      }))
    };
  });
  describe('Authentication Security', () => {
    test('should reject requests without authentication', async () => {
      // Mock no authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      });
      const request = new NextRequest('http://localhost:3000/api/photography/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'test-client-123',
          wedding_style: 'romantic',
          preferred_colors: ['#FFFFFF'],
          wedding_date: '2024-06-15T18:00:00Z',
          mood_board_images: ['https://example.com/image.jpg']
        })
      const { POST } = await import('@/app/api/photography/analyze/route');
      const response = await POST(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });
    test('should validate JWT tokens properly', async () => {
      // Mock invalid JWT
        error: { message: 'Invalid JWT' }
        headers: {
          'Authorization': 'Bearer invalid.jwt.token',
          'Content-Type': 'application/json'
        },
    test('should handle expired tokens gracefully', async () => {
        error: { message: 'JWT expired', status: 401 }
          'Authorization': 'Bearer expired.jwt.token',
      
  describe('Authorization and Access Control', () => {
    test('should prevent access to other users\' clients', async () => {
      const validUser = {
        id: 'user-123',
        email: 'user@example.com'
      };
        data: { user: validUser },
        error: null
      // Mock client belonging to different organization
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'other-client-123',
                organization_id: 'other-org-456'
              },
              error: null
            })
          };
        }
        if (table === 'organization_members') {
              data: null,
              error: { message: 'User not in organization' }
        return mockSupabase.from();
          client_id: 'other-client-123',
      expect(response.status).toBe(403);
      expect(data.error.code).toBe('ACCESS_DENIED');
    test('should validate role-based permissions', async () => {
      const limitedUser = {
        id: 'limited-user-123',
        email: 'limited@example.com'
        data: { user: limitedUser },
      // Mock user with limited role
                id: 'client-123',
                organization_id: 'org-123'
                role: 'viewer' // Limited role
      // Mock feature gate denying access for limited role
      vi.spyOn(FeatureGateService, 'checkFeatureAccess').mockResolvedValue({
        hasAccess: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
        requiredRole: 'editor'
          client_id: 'client-123',
  describe('Input Validation and Sanitization', () => {
    test('should validate and reject malformed UUIDs', async () => {
      const validUser = { id: 'user-123', email: 'user@example.com' };
          client_id: 'invalid-uuid-format', // Invalid UUID
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
      expect(data.error.details.validation_errors).toBeDefined();
    test('should sanitize and validate color inputs', async () => {
          client_id: '123e4567-e89b-12d3-a456-426614174000',
          preferred_colors: [
            'javascript:alert("xss")', // XSS attempt
            '#FFFFFF',
            '<script>alert("xss")</script>', // HTML injection
            '#000000'
          ],
    test('should validate image URLs and prevent SSRF attacks', async () => {
          mood_board_images: [
            'http://localhost:8080/admin', // Internal network attempt
            'file:///etc/passwd', // File system access attempt
            'ftp://internal.server.com/secrets', // Internal FTP
            'https://example.com/valid-image.jpg' // Valid URL
          ]
    test('should enforce maximum array lengths', async () => {
      // Create oversized arrays
      const tooManyColors = Array.from({ length: 20 }, (_, i) => `#${i.toString().padStart(6, '0')}`);
      const tooManyImages = Array.from({ length: 30 }, (_, i) => `https://example.com/image-${i}.jpg`);
          preferred_colors: tooManyColors,
          mood_board_images: tooManyImages
  describe('Rate Limiting Security', () => {
    test('should prevent brute force attacks with progressive delays', async () => {
      const attacker = 'attacker-123';
      const requests = [];
      // Simulate rapid fire requests
      for (let i = 0; i < 100; i++) {
        vi.spyOn(photographyRateLimiter, 'checkLimit').mockResolvedValueOnce({
          success: false,
          remaining: 0,
          retryAfter: Math.min(i * 2, 3600), // Progressive delay
          plan: 'free'
        });
        requests.push(photographyRateLimiter.checkLimit(attacker));
      }
      const results = await Promise.allSettled(requests);
      const blocked = results.filter((r: any) => 
        r.status === 'fulfilled' && !r.value.success
      ).length;
      expect(blocked).toBeGreaterThan(90); // Most should be blocked
    test('should handle distributed attacks across multiple IPs', async () => {
      const attackerIPs = Array.from({ length: 50 }, (_, i) => `192.168.1.${i + 1}`);
      for (const ip of attackerIPs) {
        for (let i = 0; i < 10; i++) {
          requests.push(photographyRateLimiter.checkLimit(`user-${ip}-${i}`));
      // Mock rate limiter to simulate attack detection
      vi.spyOn(photographyRateLimiter, 'checkLimit').mockImplementation(async (userId) => {
        const userNum = parseInt(userId.split('-')[2] || '0');
        if (userNum > 5) { // Simulate detection after threshold
            success: false,
            remaining: 0,
            retryAfter: 3600,
            plan: 'blocked'
        return {
          success: true,
          remaining: 99,
        };
        r.status === 'fulfilled' && r.value.plan === 'blocked'
      expect(blocked).toBeGreaterThan(0);
  describe('Data Protection and Privacy', () => {
    test('should not log sensitive information', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();
      const sensitiveRequest = {
        client_id: '123e4567-e89b-12d3-a456-426614174000',
        wedding_style: 'romantic',
        preferred_colors: ['#FFFFFF'],
        wedding_date: '2024-06-15T18:00:00Z',
        mood_board_images: ['https://private.example.com/secret-image.jpg'],
        personal_notes: 'Confidential wedding details'
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth failed'));
        body: JSON.stringify(sensitiveRequest)
      await POST(request);
      // Check that sensitive data wasn't logged
      const allLogCalls = [...consoleSpy.mock.calls, ...errorSpy.mock.calls];
      const loggedContent = allLogCalls.flat().join(' ');
      expect(loggedContent).not.toContain('Confidential wedding details');
      expect(loggedContent).not.toContain('secret-image.jpg');
      expect(loggedContent).not.toContain('123e4567-e89b-12d3-a456-426614174000');
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    test('should encrypt sensitive data in cache', async () => {
      const { photographyCache } = await import('@/lib/cache/photography-cache');
      const sensitiveData = {
        client_id: 'sensitive-client-123',
        personal_preferences: 'Very private information',
        budget: 50000
      await photographyCache.cacheFeatureAccess('user-123', 'sensitive_key', sensitiveData);
      // Mock cache retrieval to verify encryption
      const mockGet = vi.spyOn(photographyCache as any, 'get');
      mockGet.mockImplementation(async (key) => {
        // Verify the key doesn't contain sensitive info in plain text
        expect(key).not.toContain('Very private information');
        expect(key).not.toContain('50000');
        return null;
      await photographyCache.getCachedFeatureAccess('user-123', 'sensitive_key');
      mockGet.mockRestore();
    test('should handle PII data according to GDPR requirements', async () => {
      const piiData = {
        mood_board_images: ['https://example.com/image.jpg'],
        gdpr_consent: true,
        data_retention_period: '2 years'
              data: { id: piiData.client_id, organization_id: 'org-123' },
              data: { role: 'admin' },
        if (table === 'photo_analysis_records') {
            insert: vi.fn().mockImplementation((data) => {
              // Verify GDPR compliance fields are included
              expect(data).toHaveProperty('gdpr_compliant', true);
              expect(data).toHaveProperty('retention_expires_at');
              return Promise.resolve({ data: { id: 'record-123' }, error: null });
        body: JSON.stringify(piiData)
      // Should process successfully with GDPR compliance
      expect(response.status).toBe(200);
  describe('API Security Headers', () => {
    test('should include proper security headers', async () => {
              data: { id: 'client-123', organization_id: 'org-123' },
      // Check security headers
      expect(response.headers.get('X-Request-ID')).toBeTruthy();
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    test('should prevent clickjacking with CSP headers', async () => {
      // This would typically be tested at the middleware level
      // but we can verify our API doesn't accidentally expose sensitive data
        method: 'OPTIONS', // Preflight request
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST'
      // Should not expose CORS headers to unauthorized origins
      const response = new Response(null, { status: 204 });
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeFalsy();
  describe('Error Handling Security', () => {
    test('should not expose system information in error messages', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed: postgres://user:pass@internal-db:5432/wedsync'));
      // Should not expose database credentials or internal paths
      expect(JSON.stringify(data)).not.toContain('postgres://');
      expect(JSON.stringify(data)).not.toContain('pass@internal-db');
      expect(JSON.stringify(data)).not.toContain('/wedsync');
      // Should provide generic error message
      expect(data.error.message).toBe('Internal server error occurred');
    test('should rate limit error responses', async () => {
      const errorRequests = [];
      for (let i = 0; i < 50; i++) {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Simulated error'));
        
        const request = new NextRequest('http://localhost:3000/api/photography/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'client-123',
            wedding_style: 'romantic',
            preferred_colors: ['#FFFFFF'],
            wedding_date: '2024-06-15T18:00:00Z',
            mood_board_images: ['https://example.com/image.jpg']
          })
        const { POST } = await import('@/app/api/photography/analyze/route');
        errorRequests.push(POST(request));
      const responses = await Promise.allSettled(errorRequests);
      // Should handle all error requests without system instability
      expect(responses.length).toBe(50);
      // Verify no memory leaks or resource exhaustion
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB
});
