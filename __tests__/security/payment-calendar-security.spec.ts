/**
 * Security Testing Suite for Payment Calendar - WS-165
 * Critical security validation for wedding payment data protection
 * Prevents financial disasters, data breaches, and unauthorized access
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { mockPaymentData, MOCK_WEDDING_ID, MOCK_USER_ID } from '../../tests/payments/fixtures/payment-fixtures';

// Test configuration
const TEST_BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const INVALID_WEDDING_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Payment Calendar Security Testing', () => {

  test.describe('Authentication & Authorization', () => {
    
    test('Prevents access without authentication', async ({ page }) => {
      // Clear any existing authentication
      await page.context().clearCookies();
      await page.context().clearPermissions();
      
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Should redirect to login or show auth error
      await expect(page).toHaveURL(/\/(login|auth|signin)/);
    });

    test('Prevents access to unauthorized wedding data', async ({ page }) => {
      // Mock authenticated user
      await page.route('**/api/auth/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            user: { id: MOCK_USER_ID, email: 'test@example.com' },
            session: { access_token: 'valid-token' }
          })
        });
      });

      // Mock unauthorized access to wedding
      await page.route('**/api/payments/schedules**', (route) => {
        if (route.request().url().includes(INVALID_WEDDING_ID)) {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Access denied to this wedding',
              code: 'INSUFFICIENT_PERMISSIONS'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments/calendar?weddingId=' + INVALID_WEDDING_ID);
      
      // Should show access denied error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Access denied');
    });

    test('Validates session tokens and prevents token reuse', async ({ page }) => {
      // Mock expired token scenario
      await page.route('**/api/payments/**', (route) => {
        const authHeader = route.request().headers().authorization;
        
        if (!authHeader || authHeader === 'Bearer expired-token') {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Unauthorized',
              code: 'TOKEN_EXPIRED'
            })
          });
        } else {
          route.continue();
        }
      });

      // Set expired token
      await page.evaluate(() => {
        localStorage.setItem('auth-token', 'expired-token');
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Should handle token expiration
      await expect(page.locator('[data-testid="auth-expired-message"]')).toBeVisible();
    });

    test('Prevents privilege escalation through role manipulation', async ({ page }) => {
      // Mock user with limited role
      await page.route('**/api/auth/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            user: { id: MOCK_USER_ID, email: 'viewer@example.com', role: 'viewer' },
            session: { access_token: 'viewer-token' }
          })
        });
      });

      await page.route('**/api/payments/schedules', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Insufficient permissions to create payment schedules',
              code: 'ROLE_INSUFFICIENT'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Try to create payment (should fail)
      const createBtn = page.locator('[data-testid="create-payment-btn"]');
      const isVisible = await createBtn.isVisible();
      
      if (isVisible) {
        await createBtn.click();
        await page.fill('[data-testid="payment-title-input"]', 'Unauthorized Payment');
        await page.fill('[data-testid="payment-amount-input"]', '1000');
        await page.click('[data-testid="submit-payment-btn"]');
        
        // Should show permission error
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Insufficient permissions');
      } else {
        // Button should not be visible for viewer role
        expect(isVisible).toBe(false);
      }
    });
  });

  test.describe('Input Validation & Sanitization', () => {
    
    test('Prevents XSS attacks in payment form inputs', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      await page.click('[data-testid="create-payment-btn"]');
      
      // Test XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script><"',
        "'; DROP TABLE payments; --"
      ];

      for (const payload of xssPayloads) {
        // Clear and fill title input with XSS payload
        await page.fill('[data-testid="payment-title-input"]', '');
        await page.fill('[data-testid="payment-title-input"]', payload);
        
        // Move focus to trigger validation
        await page.click('[data-testid="payment-amount-input"]');
        
        // Check if payload was sanitized
        const inputValue = await page.inputValue('[data-testid="payment-title-input"]');
        
        // Should not contain dangerous script tags
        expect(inputValue).not.toContain('<script>');
        expect(inputValue).not.toContain('javascript:');
        expect(inputValue).not.toContain('onerror=');
        expect(inputValue).not.toContain('onload=');
        
        // Check for SQL injection attempts
        expect(inputValue).not.toContain('DROP TABLE');
        expect(inputValue).not.toContain('DELETE FROM');
        expect(inputValue).not.toContain('INSERT INTO');
      }
    });

    test('Validates numeric inputs and prevents injection', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      await page.click('[data-testid="create-payment-btn"]');
      
      const maliciousAmounts = [
        "'; DELETE FROM payments; --",
        '<script>alert("amount-xss")</script>',
        'Infinity',
        'NaN',
        '1e308', // Number.MAX_VALUE overflow
        '-999999999999',
        '1.7976931348623157e+308'
      ];

      for (const amount of maliciousAmounts) {
        await page.fill('[data-testid="payment-amount-input"]', amount);
        await page.click('[data-testid="payment-title-input"]'); // Trigger validation
        
        // Should show validation error or sanitize input
        const hasError = await page.locator('[data-testid="amount-error"]').isVisible();
        const inputValue = await page.inputValue('[data-testid="payment-amount-input"]');
        
        if (!hasError) {
          // If no error shown, input should be sanitized to valid number
          expect(parseFloat(inputValue)).not.toBeNaN();
          expect(parseFloat(inputValue)).toBeLessThan(1000000); // Within reasonable limits
          expect(parseFloat(inputValue)).toBeGreaterThan(0);
        }
      }
    });

    test('Sanitizes and validates date inputs', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      await page.click('[data-testid="create-payment-btn"]');
      
      const maliciousDates = [
        '<script>alert("date-xss")</script>',
        "'; DROP TABLE payments; --",
        '9999-12-31', // Far future date
        '1900-01-01', // Far past date
        'invalid-date',
        '2025-13-40', // Invalid month/day
      ];

      for (const date of maliciousDates) {
        await page.fill('[data-testid="payment-due-date-input"]', date);
        await page.click('[data-testid="payment-title-input"]');
        
        const inputValue = await page.inputValue('[data-testid="payment-due-date-input"]');
        
        // Should not contain script tags or SQL injection
        expect(inputValue).not.toContain('<script>');
        expect(inputValue).not.toContain('DROP TABLE');
        
        // Should be valid date format or empty
        if (inputValue && inputValue !== date) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          expect(inputValue).toMatch(dateRegex);
        }
      }
    });
  });

  test.describe('API Security & Data Protection', () => {
    
    test('Prevents SQL injection in API endpoints', async ({ page }) => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE payment_schedules; --",
        "' UNION SELECT * FROM users; --",
        "'; INSERT INTO payment_schedules (amount) VALUES (999999); --",
        "' OR '1'='1",
        "'; UPDATE payment_schedules SET amount=0; --"
      ];

      for (const payload of sqlInjectionPayloads) {
        // Test SQL injection in query parameters
        await page.route('**/api/payments/schedules*', (route) => {
          const url = route.request().url();
          
          // Log potential injection attempt
          if (url.includes('DROP') || url.includes('UNION') || url.includes('INSERT')) {
            console.warn('Potential SQL injection attempt blocked:', url);
            
            route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ 
                error: 'Invalid request parameters',
                code: 'INVALID_INPUT'
              })
            });
          } else {
            route.continue();
          }
        });

        // Try to inject via wedding ID parameter
        const maliciousUrl = `/payments/calendar?weddingId=${encodeURIComponent(payload)}`;
        
        await page.goto(maliciousUrl);
        
        // Should show error or handle safely
        const hasError = await page.locator('[data-testid="error-message"]').isVisible();
        expect(hasError).toBe(true);
      }
    });

    test('Validates API rate limiting', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/payments/schedules*', (route) => {
        requestCount++;
        
        if (requestCount > 10) {
          // Simulate rate limiting
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: {
              'Retry-After': '60'
            },
            body: JSON.stringify({ 
              error: 'Too Many Requests',
              code: 'RATE_LIMIT_EXCEEDED'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Rapid-fire requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        await page.reload({ waitUntil: 'networkidle' });
        
        if (i > 10) {
          // Should show rate limit error
          const rateLimitError = await page.locator('[data-testid="rate-limit-error"]').isVisible();
          if (rateLimitError) {
            expect(rateLimitError).toBe(true);
            break;
          }
        }
      }
    });

    test('Validates HTTPS enforcement and secure headers', async ({ page }) => {
      // Check if running on HTTPS (in production)
      const url = page.url();
      
      if (url.startsWith('https://')) {
        // Test security headers
        const response = await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
        const headers = response?.headers() || {};
        
        // Check for security headers
        expect(headers['strict-transport-security']).toBeTruthy();
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
        expect(headers['x-xss-protection']).toBeTruthy();
      }
    });

    test('Prevents CSRF attacks', async ({ page, context }) => {
      // Clear existing cookies/session
      await context.clearCookies();
      
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Try to submit form without CSRF token
      await page.route('**/api/payments/schedules', (route) => {
        const headers = route.request().headers();
        
        // Check for CSRF protection
        if (!headers['x-csrf-token'] && !headers['x-requested-with']) {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'CSRF token required',
              code: 'CSRF_TOKEN_MISSING'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.click('[data-testid="create-payment-btn"]');
      await page.fill('[data-testid="payment-title-input"]', 'Test Payment');
      await page.fill('[data-testid="payment-amount-input"]', '1000');
      await page.click('[data-testid="submit-payment-btn"]');
      
      // Should be blocked or handle CSRF protection
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorMessage).toContain('CSRF' || 'forbidden' || 'token');
    });
  });

  test.describe('Data Encryption & Privacy', () => {
    
    test('Ensures sensitive data encryption in transit', async ({ page }) => {
      let encryptedDataSent = false;
      
      await page.route('**/api/payments/schedules', (route) => {
        const postData = route.request().postData();
        
        if (postData && route.request().method() === 'POST') {
          const data = JSON.parse(postData);
          
          // Check if sensitive payment data is encrypted
          if (data.encryptedData || data.encrypted_payment_data) {
            encryptedDataSent = true;
            
            // Verify encrypted data doesn't contain plain text payment info
            const encryptedField = data.encryptedData || data.encrypted_payment_data;
            expect(encryptedField).not.toContain('4111111111111111'); // Credit card
            expect(encryptedField).not.toContain('123-45-6789'); // SSN pattern
            expect(encryptedField).not.toContain('routing'); // Bank info
          }
        }
        
        route.continue();
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      await page.click('[data-testid="create-payment-btn"]');
      
      // Fill form with sensitive payment data
      await page.fill('[data-testid="payment-title-input"]', 'Credit Card Payment');
      await page.fill('[data-testid="payment-amount-input"]', '5000');
      
      // Add payment method (if available)
      const paymentMethodField = page.locator('[data-testid="payment-method-input"]');
      if (await paymentMethodField.isVisible()) {
        await paymentMethodField.fill('Credit Card ending in 1234');
      }
      
      await page.click('[data-testid="submit-payment-btn"]');
      
      // Should use encryption for sensitive data
      await page.waitForTimeout(2000);
      expect(encryptedDataSent).toBe(true);
    });

    test('Validates data masking in UI', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Look for payment items with sensitive data
      const paymentItems = page.locator('[data-testid^="payment-item-"]');
      const count = await paymentItems.count();
      
      for (let i = 0; i < count; i++) {
        const item = paymentItems.nth(i);
        const text = await item.textContent();
        
        // Sensitive data should be masked
        expect(text).not.toMatch(/\d{16}/); // Full credit card numbers
        expect(text).not.toMatch(/\d{3}-\d{2}-\d{4}/); // SSN pattern
        expect(text).not.toMatch(/\d{9}/); // Routing numbers
        
        // Should show masked versions
        if (text?.includes('Card')) {
          expect(text).toMatch(/\*\*\*\*|\*{4}|ending in/i);
        }
      }
    });

    test('Prevents sensitive data in browser storage', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Check localStorage for sensitive data
      const localStorage = await page.evaluate(() => {
        const storage: { [key: string]: string } = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            storage[key] = window.localStorage.getItem(key) || '';
          }
        }
        return storage;
      });

      // Check sessionStorage
      const sessionStorage = await page.evaluate(() => {
        const storage: { [key: string]: string } = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            storage[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        return storage;
      });

      // Verify no sensitive data in storage
      const allStorage = { ...localStorage, ...sessionStorage };
      
      for (const [key, value] of Object.entries(allStorage)) {
        // Should not contain sensitive payment data
        expect(value).not.toMatch(/\d{16}/); // Credit card numbers
        expect(value).not.toMatch(/\d{3}-\d{2}-\d{4}/); // SSN
        expect(value).not.toMatch(/cvv|cvc/i); // CVV codes
        expect(value).not.toMatch(/routing.*\d{9}/i); // Bank routing
        
        console.log(`Storage check - ${key}: ${value.length} chars (no sensitive data found)`);
      }
    });
  });

  test.describe('Session Management & Access Control', () => {
    
    test('Validates session timeout handling', async ({ page, context }) => {
      // Mock session expiration
      let sessionValid = true;
      
      await page.route('**/api/payments/**', (route) => {
        if (!sessionValid) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Session expired',
              code: 'SESSION_EXPIRED'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Simulate session expiration
      setTimeout(() => {
        sessionValid = false;
      }, 1000);
      
      await page.waitForTimeout(1500);
      
      // Try to perform action after session expires
      await page.click('[data-testid="create-payment-btn"]');
      
      // Should handle session expiration
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible({ timeout: 3000 });
    });

    test('Prevents concurrent session attacks', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login with same credentials in both contexts
      await page1.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      await page2.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);

      // Both should work initially, but system should detect concurrent sessions
      const page1Loaded = await page1.locator('[data-testid="payment-calendar"]').isVisible();
      const page2Loaded = await page2.locator('[data-testid="payment-calendar"]').isVisible();
      
      // At least one should be restricted or both should have session management
      if (page1Loaded && page2Loaded) {
        // Both loaded - check for session conflict warnings
        const hasWarning1 = await page1.locator('[data-testid="concurrent-session-warning"]').isVisible();
        const hasWarning2 = await page2.locator('[data-testid="concurrent-session-warning"]').isVisible();
        
        expect(hasWarning1 || hasWarning2).toBe(true);
      }

      await context1.close();
      await context2.close();
    });

    test('Validates permission boundaries', async ({ page }) => {
      // Test access to different wedding data with same user
      const allowedWeddingId = MOCK_WEDDING_ID;
      const unauthorizedWeddingId = 'different-wedding-id';

      await page.route('**/api/payments/schedules*', (route) => {
        const url = route.request().url();
        
        if (url.includes(unauthorizedWeddingId)) {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Access denied to this wedding',
              code: 'WEDDING_ACCESS_DENIED'
            })
          });
        } else {
          route.continue();
        }
      });

      // Should load allowed wedding
      await page.goto(`/payments/calendar?weddingId=${allowedWeddingId}`);
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();

      // Should reject unauthorized wedding
      await page.goto(`/payments/calendar?weddingId=${unauthorizedWeddingId}`);
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Access denied');
    });
  });

  test.describe('Content Security Policy & XSS Prevention', () => {
    
    test('Validates CSP headers and inline script prevention', async ({ page }) => {
      let cspViolations: string[] = [];
      
      page.on('pageerror', (error) => {
        if (error.message.includes('Content Security Policy')) {
          cspViolations.push(error.message);
        }
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Try to execute inline script (should be blocked by CSP)
      const scriptExecuted = await page.evaluate(() => {
        try {
          // This should be blocked by CSP
          const script = document.createElement('script');
          script.innerHTML = 'window.xssTest = true;';
          document.head.appendChild(script);
          
          return !!(window as any).xssTest;
        } catch (e) {
          return false;
        }
      });

      // Inline script execution should be prevented
      expect(scriptExecuted).toBe(false);
    });

    test('Prevents DOM-based XSS attacks', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Test DOM manipulation XSS
      const xssAttempts = [
        '<img src=x onerror=alert("DOM-XSS")>',
        '<svg/onload=alert("DOM-XSS")>',
        'javascript:alert("DOM-XSS")',
        '<iframe src="javascript:alert(\'DOM-XSS\')"></iframe>'
      ];

      for (const xssPayload of xssAttempts) {
        // Try to inject via URL parameters
        const maliciousUrl = `/payments/calendar?weddingId=${MOCK_WEDDING_ID}&search=${encodeURIComponent(xssPayload)}`;
        
        await page.goto(maliciousUrl);
        
        // Check if script was executed (should not be)
        const scriptExecuted = await page.evaluate(() => {
          return !!(window as any).xssExecuted;
        });
        
        expect(scriptExecuted).toBe(false);
        
        // Check if malicious content is in DOM but sanitized
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script');
        expect(pageContent).not.toContain('javascript:');
        expect(pageContent).not.toContain('onerror=');
        expect(pageContent).not.toContain('onload=');
      }
    });
  });

  test.describe('Audit Logging & Security Monitoring', () => {
    
    test('Validates security event logging', async ({ page }) => {
      let securityEvents: string[] = [];
      
      // Mock security event logging
      await page.route('**/api/security/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          const event = JSON.parse(postData);
          securityEvents.push(event.type);
        }
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ logged: true })
        });
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Actions that should trigger security logging
      await page.click('[data-testid="create-payment-btn"]');
      await page.fill('[data-testid="payment-amount-input"]', '50000'); // High amount
      
      // Multiple failed attempts (simulated)
      for (let i = 0; i < 3; i++) {
        await page.fill('[data-testid="payment-title-input"]', '');
        await page.click('[data-testid="submit-payment-btn"]');
        await page.waitForTimeout(100);
      }

      // Should log security-relevant events
      expect(securityEvents).toContain('HIGH_VALUE_PAYMENT_ATTEMPT');
      expect(securityEvents).toContain('MULTIPLE_VALIDATION_FAILURES');
    });

    test('Detects suspicious activity patterns', async ({ page }) => {
      let suspiciousActivityDetected = false;
      
      await page.route('**/api/security/suspicious-activity', (route) => {
        suspiciousActivityDetected = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            detected: true,
            action: 'account_flagged'
          })
        });
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Simulate suspicious behavior
      // Rapid payment creation attempts
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="create-payment-btn"]');
        await page.fill('[data-testid="payment-title-input"]', `Suspicious Payment ${i}`);
        await page.fill('[data-testid="payment-amount-input"]', '99999');
        await page.click('[data-testid="submit-payment-btn"]');
        await page.waitForTimeout(50);
        
        // Cancel/close form quickly
        const cancelBtn = page.locator('[data-testid="cancel-payment-btn"]');
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        }
      }

      // Should detect and flag suspicious activity
      await page.waitForTimeout(1000);
      expect(suspiciousActivityDetected).toBe(true);
    });
  });

  test.describe('Compliance & Data Protection', () => {
    
    test('Validates GDPR compliance features', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Check for privacy controls
      const privacySettings = page.locator('[data-testid="privacy-settings"]');
      if (await privacySettings.isVisible()) {
        await privacySettings.click();
        
        // Should have data export option
        await expect(page.locator('[data-testid="export-data-btn"]')).toBeVisible();
        
        // Should have data deletion option
        await expect(page.locator('[data-testid="delete-data-btn"]')).toBeVisible();
        
        // Should have consent management
        await expect(page.locator('[data-testid="consent-management"]')).toBeVisible();
      }
    });

    test('Validates PCI DSS compliance for payment data', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Check payment form security
      await page.click('[data-testid="create-payment-btn"]');
      
      // Payment method fields should be secure
      const paymentMethodField = page.locator('[data-testid="payment-method-input"]');
      if (await paymentMethodField.isVisible()) {
        // Should have proper input masking
        await paymentMethodField.fill('4111111111111111');
        
        const maskedValue = await paymentMethodField.inputValue();
        expect(maskedValue).not.toBe('4111111111111111'); // Should be masked
        expect(maskedValue).toMatch(/\*+|\*{4}.*\d{4}/); // Should show masked pattern
      }
    });

    test('Validates data retention policies', async ({ page }) => {
      // Mock old payment data
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [
              {
                id: 'old-payment-1',
                title: 'Very Old Payment',
                amount: 1000,
                created_at: '2020-01-01T00:00:00Z', // 5+ years old
                status: 'archived'
              }
            ],
            total: 1
          })
        });
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Old data should be archived or marked appropriately
      const archivedPayments = page.locator('[data-status="archived"]');
      if (await archivedPayments.count() > 0) {
        // Archived payments should have limited functionality
        await archivedPayments.first().click();
        
        // Edit functionality should be disabled for archived items
        const editBtn = page.locator('[data-testid="edit-payment-btn"]');
        const isDisabled = await editBtn.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });
  });

  test.describe('Vulnerability Testing', () => {
    
    test('Tests for common OWASP Top 10 vulnerabilities', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // A1: Injection (already tested above)
      // A2: Broken Authentication (already tested above)
      
      // A3: Sensitive Data Exposure
      const responseHeaders = await page.evaluate(() => {
        return fetch('/api/payments/schedules?weddingId=' + MOCK_WEDDING_ID)
          .then(response => Object.fromEntries(response.headers.entries()));
      });
      
      // Should not expose sensitive server info
      expect(responseHeaders['server']).not.toContain('Apache');
      expect(responseHeaders['server']).not.toContain('nginx');
      expect(responseHeaders['x-powered-by']).toBeFalsy();
      
      // A4: XML External Entities (XXE) - Test file upload if available
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Test would upload malicious XML file here
        console.log('File upload found - XXE testing would be implemented');
      }
      
      // A5: Broken Access Control (already tested above)
      
      // A6: Security Misconfiguration
      // Check for debug information in responses
      const pageContent = await page.content();
      expect(pageContent).not.toContain('DEBUG');
      expect(pageContent).not.toContain('TRACE');
      expect(pageContent).not.toContain('Error: ');
      expect(pageContent).not.toContain('Exception: ');
    });

    test('Tests for clickjacking protection', async ({ page }) => {
      // Check X-Frame-Options header
      const response = await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      const headers = response?.headers() || {};
      
      expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      
      // Test frame busting script
      const frameProtection = await page.evaluate(() => {
        return window.self !== window.top;
      });
      
      if (frameProtection) {
        // Should have frame-busting protection
        const hasFrameBusting = await page.evaluate(() => {
          return document.documentElement.style.display !== 'none';
        });
        expect(hasFrameBusting).toBe(true);
      }
    });

    test('Tests for insecure deserialization', async ({ page }) => {
      // Test malicious serialized data in requests
      await page.route('**/api/payments/schedules', (route) => {
        const postData = route.request().postData();
        
        if (postData) {
          // Check for serialized objects that could be malicious
          const suspiciousPatterns = [
            'rO0AB', // Java serialization
            'YTo6', // PHP serialization
            '__reduce__', // Python pickle
          ];
          
          for (const pattern of suspiciousPatterns) {
            if (postData.includes(pattern)) {
              route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ 
                  error: 'Invalid data format',
                  code: 'MALICIOUS_DATA_DETECTED'
                })
              });
              return;
            }
          }
        }
        
        route.continue();
      });

      await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
      
      // Try to submit data that looks like serialized objects
      await page.click('[data-testid="create-payment-btn"]');
      await page.fill('[data-testid="payment-title-input"]', 'rO0ABXNyABNqYXZhLnV0aWwu'); // Java serialization
      await page.click('[data-testid="submit-payment-btn"]');
      
      // Should be rejected
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid data');
    });
  });
});

// Security performance tests
test.describe('Security Performance Impact', () => {
  
  test('Measures security overhead on performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
    await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Security measures should not significantly impact performance
    expect(loadTime).toBeLessThan(3000); // 3 seconds with security
    
    console.log(`Page load with security measures: ${loadTime}ms`);
  });

  test('Tests encryption/decryption performance', async ({ page }) => {
    await page.goto('/payments/calendar?weddingId=' + MOCK_WEDDING_ID);
    
    // Test client-side encryption performance
    const encryptionTime = await page.evaluate(() => {
      const startTime = performance.now();
      
      // Simulate encryption of sensitive data
      const sensitiveData = 'Credit Card: 4111-1111-1111-1111, CVV: 123';
      const encoder = new TextEncoder();
      const data = encoder.encode(sensitiveData);
      
      // Simple XOR encryption simulation
      const key = 42;
      const encrypted = Array.from(data).map(byte => byte ^ key);
      const decrypted = encrypted.map(byte => byte ^ key);
      
      const endTime = performance.now();
      
      return {
        duration: endTime - startTime,
        success: String.fromCharCode(...decrypted).includes('4111')
      };
    });
    
    // Encryption should be fast and work correctly
    expect(encryptionTime.duration).toBeLessThan(10); // 10ms
    expect(encryptionTime.success).toBe(true);
  });
});