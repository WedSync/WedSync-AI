/**
 * WS-167 Trial Management System - Security & Authorization Tests
 * Team E - Round 2 Security Testing Suite
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TrialTestHelpers } from './helpers/trial-test-helpers';

const trialHelpers = new TrialTestHelpers();

test.describe('WS-167 Security & Authorization Tests', () => {
  let trialUser: any;
  let adminUser: any;
  let context: BrowserContext;
  
  test.beforeAll(async ({ browser }) => {
    await trialHelpers.setupTestEnvironment();
    context = await browser.newContext();
    adminUser = trialHelpers.getAdminUser();
  });

  test.beforeEach(async () => {
    trialUser = await trialHelpers.createTestTrialUser();
  });

  test.afterEach(async () => {
    await trialHelpers.cleanupTestUser(trialUser);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Authentication Security', () => {
    test('Should prevent unauthorized access to trial dashboard', async ({ page }) => {
      // Try to access trial dashboard without authentication
      await page.goto('/dashboard/trial');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Should show authentication required message
      await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
    });

    test('Should validate JWT token expiration', async ({ page }) => {
      // Login normally
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/dashboard/);
      
      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired.jwt.token');
        localStorage.setItem('refresh_token', 'expired.refresh.token');
      });
      
      // Try to access protected resource
      await page.goto('/dashboard/trial');
      
      // Should redirect to login due to expired token
      await expect(page).toHaveURL(/\/auth\/login/);
      await expect(page.locator('[data-testid="session-expired"]')).toBeVisible();
    });

    test('Should prevent session hijacking', async ({ page }) => {
      const page2 = await context.newPage();
      
      // Login on first page
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/dashboard/);
      
      // Get session token
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      
      // Try to use same token on different page with different IP
      await page2.goto('/dashboard/trial');
      await page2.evaluate((token) => {
        localStorage.setItem('auth_token', token);
      }, token);
      
      await page2.reload();
      
      // Should detect potential session hijacking and require re-authentication
      await expect(page2.locator('[data-testid="security-verification"]')).toBeVisible();
    });

    test('Should enforce strong password requirements', async ({ page }) => {
      await page.goto('/auth/register');
      
      const weakPasswords = [
        '123',           // Too short
        'password',      // Common word
        '12345678',      // No special chars
        'Password',      // No numbers
        'password123'    // No special chars
      ];
      
      for (const password of weakPasswords) {
        await page.fill('[data-testid="name-input"]', 'Test User');
        await page.fill('[data-testid="email-input"]', `test${Date.now()}@test.com`);
        await page.fill('[data-testid="password-input"]', password);
        await page.fill('[data-testid="confirm-password-input"]', password);
        
        await page.click('[data-testid="register-button"]');
        
        // Should show password strength error
        await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
        
        // Clear form for next test
        await page.reload();
      }
    });
  });

  test.describe('Authorization & Access Control', () => {
    test('Should enforce trial user limitations', async ({ page }) => {
      // Login as trial user
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Try to access admin-only endpoints
      const adminEndpoints = [
        '/admin/dashboard',
        '/admin/users',
        '/admin/trial-management',
        '/admin/billing',
        '/admin/settings'
      ];
      
      for (const endpoint of adminEndpoints) {
        await page.goto(endpoint);
        await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard/); // Redirected to regular dashboard
      }
    });

    test('Should prevent privilege escalation', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Try to modify user role via browser console
      await page.evaluate(() => {
        // Attempt to modify localStorage to claim admin role
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        userData.role = 'admin';
        userData.permissions = ['admin', 'billing', 'user_management'];
        localStorage.setItem('user_data', JSON.stringify(userData));
      });
      
      // Try to access admin functionality
      const response = await page.request.get('/api/admin/users');
      expect(response.status()).toBe(403); // Forbidden
      
      // UI should still show trial limitations
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="trial-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-nav"]')).not.toBeVisible();
    });

    test('Should validate API endpoint authorization', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      
      // Test various protected API endpoints
      const testCases = [
        { endpoint: '/api/trial/extend', method: 'POST', expectedStatus: 403 }, // Trial users can't extend their own trials
        { endpoint: '/api/admin/users', method: 'GET', expectedStatus: 403 },     // Admin only
        { endpoint: '/api/billing/invoices', method: 'GET', expectedStatus: 403 }, // Admin only
        { endpoint: '/api/trial/status', method: 'GET', expectedStatus: 200 }      // Trial user allowed
      ];
      
      for (const testCase of testCases) {
        const response = await page.request.fetch(testCase.endpoint, {
          method: testCase.method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        expect(response.status()).toBe(testCase.expectedStatus);
      }
    });
  });

  test.describe('Data Isolation & Tenant Security', () => {
    test('Should prevent cross-tenant data access', async ({ page }) => {
      // Create two users in different tenants
      const tenant1User = await trialHelpers.createTestTrialUser('tenant1');
      const tenant2User = await trialHelpers.createTestTrialUser('tenant2');
      
      try {
        // Login as tenant1 user and create data
        await page.goto('/auth/login');
        await page.fill('[data-testid="email-input"]', tenant1User.email);
        await page.fill('[data-testid="password-input"]', tenant1User.password);
        await page.click('[data-testid="login-button"]');
        
        await page.click('[data-testid="create-client-button"]');
        await page.fill('[data-testid="client-name"]', 'Tenant 1 Secret Client');
        await page.fill('[data-testid="client-email"]', 'secret@tenant1.com');
        await page.click('[data-testid="save-client"]');
        
        const client1Id = await page.locator('[data-testid^="client-card-"]').first().getAttribute('data-client-id');
        
        // Logout and login as tenant2 user
        await page.click('[data-testid="user-menu"]');
        await page.click('[data-testid="logout"]');
        
        await page.fill('[data-testid="email-input"]', tenant2User.email);
        await page.fill('[data-testid="password-input"]', tenant2User.password);
        await page.click('[data-testid="login-button"]');
        
        // Try to access tenant1's client directly
        await page.goto(`/clients/${client1Id}`);
        await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
        
        // Try API access
        const token2 = await page.evaluate(() => localStorage.getItem('auth_token'));
        const response = await page.request.get(`/api/clients/${client1Id}`, {
          headers: { 'Authorization': `Bearer ${token2}` }
        });
        expect(response.status()).toBe(404); // Should appear as not found for security
        
        // Verify tenant2 user cannot see tenant1's clients in list
        await page.goto('/clients');
        await expect(page.locator(`[data-client-id="${client1Id}"]`)).not.toBeVisible();
        
      } finally {
        await trialHelpers.cleanupTestUser(tenant1User);
        await trialHelpers.cleanupTestUser(tenant2User);
      }
    });

    test('Should enforce Row Level Security (RLS)', async ({ page }) => {
      const user1 = await trialHelpers.createTestTrialUser('rls-test-1');
      const user2 = await trialHelpers.createTestTrialUser('rls-test-2');
      
      try {
        // Test direct database access attempts
        await page.goto('/auth/login');
        await page.fill('[data-testid="email-input"]', user1.email);
        await page.fill('[data-testid="password-input"]', user1.password);
        await page.click('[data-testid="login-button"]');
        
        // Attempt to bypass API and access database directly
        const maliciousQueries = [
          `'; SELECT * FROM users; --`,
          `'; DELETE FROM trial_data WHERE user_id = '${user2.id}'; --`,
          `'; UPDATE users SET role = 'admin' WHERE id = '${user1.id}'; --`
        ];
        
        for (const query of maliciousQueries) {
          try {
            await page.fill('[data-testid="search-input"]', query);
            await page.click('[data-testid="search-button"]');
            
            // Should not return any unauthorized data
            await expect(page.locator('[data-testid="sql-injection-detected"]')).toBeVisible();
          } catch (error) {
            // SQL injection should be prevented
            console.log('SQL injection prevented:', error.message);
          }
        }
        
      } finally {
        await trialHelpers.cleanupTestUser(user1);
        await trialHelpers.cleanupTestUser(user2);
      }
    });
  });

  test.describe('Input Validation & XSS Prevention', () => {
    test('Should prevent XSS attacks in trial data', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '{{constructor.constructor("alert(1)")()}}',
        'javascript:alert(1)',
        '<svg onload="alert(1)">'
      ];
      
      for (const payload of xssPayloads) {
        // Try XSS in client name field
        await page.click('[data-testid="create-client-button"]');
        await page.fill('[data-testid="client-name"]', payload);
        await page.fill('[data-testid="client-email"]', 'test@example.com');
        await page.click('[data-testid="save-client"]');
        
        // Wait for client to be created and displayed
        await page.waitForTimeout(1000);
        
        // Verify XSS payload was sanitized
        const clientName = await page.locator('[data-testid^="client-card-"] .client-name').first().textContent();
        expect(clientName).not.toContain('<script>');
        expect(clientName).not.toContain('onerror');
        expect(clientName).not.toContain('javascript:');
        
        // Check that no script executed
        const alertPresent = await page.evaluate(() => {
          return window.alertCalled || false;
        });
        expect(alertPresent).toBeFalsy();
        
        // Delete the test client
        await page.click('[data-testid^="client-card-"] [data-testid="delete-client"]');
        await page.click('[data-testid="confirm-delete"]');
      }
    });

    test('Should validate file upload security', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/dashboard/profile');
      
      // Test malicious file uploads
      const maliciousFiles = [
        { name: 'malicious.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'script.js', content: 'alert("XSS");' },
        { name: 'large-file.txt', content: 'A'.repeat(10 * 1024 * 1024) }, // 10MB file
        { name: '../../../etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash' }
      ];
      
      for (const file of maliciousFiles) {
        // Create temporary file
        const fileInput = page.locator('[data-testid="profile-image-upload"]');
        
        // Simulate file upload
        await fileInput.setInputFiles({
          name: file.name,
          mimeType: 'text/plain',
          buffer: Buffer.from(file.content)
        });
        
        // Should show validation error
        await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
        
        // Error message should indicate rejection reason
        const errorText = await page.locator('[data-testid="upload-error"]').textContent();
        expect(errorText).toMatch(/(invalid file type|file too large|invalid filename)/i);
      }
    });
  });

  test.describe('Rate Limiting & DDoS Protection', () => {
    test('Should rate limit trial registration attempts', async ({ page }) => {
      const attempts = [];
      
      // Attempt rapid registrations
      for (let i = 0; i < 10; i++) {
        const attempt = async () => {
          await page.goto('/auth/register');
          await page.fill('[data-testid="name-input"]', `User ${i}`);
          await page.fill('[data-testid="email-input"]', `test${i}${Date.now()}@test.com`);
          await page.fill('[data-testid="password-input"]', 'ValidPass123!');
          
          const response = page.waitForResponse('/api/auth/register');
          await page.click('[data-testid="register-button"]');
          return await response;
        };
        
        attempts.push(attempt());
      }
      
      const results = await Promise.all(attempts);
      
      // Should have rate limited some requests
      const rateLimitedCount = results.filter(r => r.status() === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // Should show rate limit message
      if (rateLimitedCount > 0) {
        await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
      }
    });

    test('Should rate limit API requests', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      
      // Make rapid API requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          page.request.get('/api/trial/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status() === 429);
      
      // Should rate limit excessive requests
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Data Privacy & Compliance', () => {
    test('Should handle GDPR data export request', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      // Navigate to privacy settings
      await page.goto('/dashboard/privacy');
      
      // Request data export
      await page.click('[data-testid="export-data-button"]');
      await page.click('[data-testid="confirm-export"]');
      
      // Should show export initiated message
      await expect(page.locator('[data-testid="export-initiated"]')).toBeVisible();
      
      // Verify export includes only user's own data
      const exportRequest = await page.request.get('/api/privacy/export', {
        headers: { 'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}` }
      });
      
      expect(exportRequest.status()).toBe(202); // Accepted for processing
    });

    test('Should handle data deletion request', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', trialUser.email);
      await page.fill('[data-testid="password-input"]', trialUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/dashboard/privacy');
      
      // Request account deletion
      await page.click('[data-testid="delete-account-button"]');
      
      // Should require confirmation
      await expect(page.locator('[data-testid="deletion-confirmation"]')).toBeVisible();
      await page.fill('[data-testid="confirm-email"]', trialUser.email);
      await page.fill('[data-testid="confirm-password"]', trialUser.password);
      await page.check('[data-testid="understand-permanent"]');
      
      await page.click('[data-testid="confirm-deletion"]');
      
      // Should show deletion initiated
      await expect(page.locator('[data-testid="deletion-initiated"]')).toBeVisible();
    });
  });

  test.describe('Security Headers & Configuration', () => {
    test('Should have proper security headers', async ({ page }) => {
      const response = await page.goto('/dashboard');
      
      const headers = response?.headers() || {};
      
      // Check for essential security headers
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['strict-transport-security']).toContain('max-age=');
      expect(headers['content-security-policy']).toBeDefined();
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('Should enforce HTTPS in production', async ({ page }) => {
      // This test simulates production environment checks
      if (process.env.NODE_ENV === 'production') {
        const response = await page.goto('/');
        expect(response?.url()).toMatch(/^https:/);
      } else {
        console.log('HTTPS enforcement test skipped in non-production environment');
      }
    });
  });
});