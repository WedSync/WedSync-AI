// /tests/deployment/security-validation.test.ts
import { test, expect } from '@playwright/test';
import { SecurityTester } from '../utils/SecurityTester';

const securityTester = new SecurityTester();

test.describe('Deployment Security Validation', () => {
  test('should have secure headers on all pages', async ({ page }) => {
    const criticalPages = [
      '/',
      '/dashboard',
      '/timeline',
      '/photos/upload',
      '/admin/deployment'
    ];

    for (const pagePath of criticalPages) {
      await page.goto(pagePath);
      
      const response = await page.waitForResponse(response => 
        response.url().includes(pagePath) && response.status() === 200
      );

      const headers = response.headers();
      
      // Verify security headers
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['strict-transport-security']).toContain('max-age=31536000');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      
      console.log(`✅ Security headers verified for ${pagePath}`);
    }
  });

  test('should protect admin endpoints from unauthorized access', async ({ page }) => {
    const adminEndpoints = [
      '/api/admin/deployment/rollback',
      '/api/admin/deployment/health',
      '/admin/deployment'
    ];

    for (const endpoint of adminEndpoints) {
      const response = await page.request.get(endpoint);
      
      // Should return 401 or 403 without authentication
      expect([401, 403]).toContain(response.status());
      
      console.log(`✅ Admin endpoint protected: ${endpoint}`);
    }
  });

  test('should validate webhook signature verification', async ({ page }) => {
    const webhookUrl = '/api/webhooks/vercel';
    
    // Test without signature
    const noSigResponse = await page.request.post(webhookUrl, {
      data: { type: 'deployment.succeeded', data: { deploymentId: 'test123' } }
    });
    expect(noSigResponse.status()).toBe(400);

    // Test with invalid signature
    const invalidSigResponse = await page.request.post(webhookUrl, {
      headers: { 'X-Vercel-Signature': 'invalid_signature' },
      data: { type: 'deployment.succeeded', data: { deploymentId: 'test123' } }
    });
    expect(invalidSigResponse.status()).toBe(400);

    console.log('✅ Webhook signature validation working');
  });

  test('should enforce rate limits on deployment endpoints', async ({ page }) => {
    const deploymentEndpoint = '/api/health/deployment';
    const requests = [];
    
    // Make rapid requests to test rate limiting
    for (let i = 0; i < 70; i++) {
      requests.push(page.request.get(deploymentEndpoint));
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
    console.log('✅ Rate limiting enforced');
  });
});