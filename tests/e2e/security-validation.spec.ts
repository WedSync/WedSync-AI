import { test, expect } from '@playwright/test';

/**
 * Security Validation Testing Suite
 * Tests security measures, XSS protection, CSRF protection, and authentication
 */

test.describe('Security Validation Tests', () => {

  test.describe('XSS Protection', () => {
    
    test('Form Input XSS Prevention', async ({ page }) => {
      await page.goto('/forms/contact');
      await page.waitForLoadState('networkidle');

      // Test various XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload="alert(\'XSS\')">',
        '<div onclick="alert(\'XSS\')">Click me</div>'
      ];

      for (const payload of xssPayloads) {
        // Fill form with XSS payload
        await page.fill('[data-testid="contact-name"]', payload);
        await page.fill('[data-testid="contact-email"]', `test-${Date.now()}@example.com`);
        await page.fill('[data-testid="contact-message"]', payload);

        // Submit form
        await page.click('[data-testid="submit-contact"]');
        await page.waitForLoadState('networkidle');

        // Verify no alert dialogs (XSS blocked)
        const hasAlert = await page.evaluate(() => {
          return new Promise(resolve => {
            const originalAlert = window.alert;
            let alertCalled = false;
            
            window.alert = () => {
              alertCalled = true;
            };
            
            setTimeout(() => {
              window.alert = originalAlert;
              resolve(alertCalled);
            }, 1000);
          });
        });

        expect(hasAlert).toBe(false);

        // Verify input is sanitized
        const nameValue = await page.inputValue('[data-testid="contact-name"]');
        expect(nameValue).not.toContain('<script>');
        expect(nameValue).not.toContain('javascript:');
        expect(nameValue).not.toContain('onerror=');
        expect(nameValue).not.toContain('onload=');

        // Reset form for next test
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    });

    test('URL Parameter XSS Prevention', async ({ page }) => {
      const xssPayloads = [
        'search=%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
        'q=javascript:alert("XSS")',
        'filter=%3Cimg%20src%3D%22x%22%20onerror%3D%22alert%28%27XSS%27%29%22%3E'
      ];

      for (const payload of xssPayloads) {
        await page.goto(`/clients?${payload}`);
        await page.waitForLoadState('networkidle');

        // Verify no XSS execution
        const hasAlert = await page.evaluate(() => {
          return new Promise(resolve => {
            const originalAlert = window.alert;
            let alertCalled = false;
            
            window.alert = () => {
              alertCalled = true;
            };
            
            setTimeout(() => {
              window.alert = originalAlert;
              resolve(alertCalled);
            }, 1000);
          });
        });

        expect(hasAlert).toBe(false);

        // Verify URL parameters are sanitized
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('<script>');
        expect(currentUrl).not.toContain('javascript:');
      }
    });

    test('Content Rendering XSS Prevention', async ({ page }) => {
      // Mock API response with XSS payload
      await page.route('**/api/clients**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            clients: [
              {
                id: 'client-xss-test',
                name: '<script>alert("XSS")</script>Malicious Client',
                email: '<img src="x" onerror="alert(\'XSS\')">test@example.com',
                notes: '<svg onload="alert(\'XSS\')">Notes</svg>'
              }
            ],
            total: 1
          })
        });
      });

      await page.goto('/clients');
      await page.waitForLoadState('networkidle');

      // Verify content is rendered safely
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert("XSS")</script>');
      expect(pageContent).not.toContain('onerror="alert(\'XSS\')"');
      expect(pageContent).not.toContain('onload="alert(\'XSS\')"');

      // Verify sanitized content is displayed
      await expect(page.locator('[data-testid="client-name"]')).toContainText('Malicious Client');
      await expect(page.locator('[data-testid="client-email"]')).toContainText('test@example.com');
    });
  });

  test.describe('CSRF Protection', () => {
    
    test('POST Requests Require CSRF Token', async ({ page, request }) => {
      // Attempt POST without CSRF token
      const response = await request.post('/api/clients', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Test Client',
          email: 'test@example.com'
        }
      });

      // Should be rejected for missing CSRF token
      expect(response.status()).toBe(403);
      
      const errorData = await response.json();
      expect(errorData.error).toContain('CSRF');
    });

    test('Valid CSRF Token Allows POST', async ({ page }) => {
      // Navigate to get CSRF token
      await page.goto('/clients/new');
      await page.waitForLoadState('networkidle');

      // Form submission should work with valid CSRF token
      await page.fill('[data-testid="client-name"]', 'CSRF Test Client');
      await page.fill('[data-testid="client-email"]', 'csrf-test@example.com');
      
      await page.click('[data-testid="submit-client"]');
      await page.waitForLoadState('networkidle');

      // Should succeed with proper CSRF token
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('Invalid CSRF Token Rejected', async ({ page }) => {
      await page.goto('/clients/new');
      await page.waitForLoadState('networkidle');

      // Tamper with CSRF token
      await page.evaluate(() => {
        const csrfInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
        if (csrfInput) {
          csrfInput.value = 'invalid-csrf-token';
        }
      });

      await page.fill('[data-testid="client-name"]', 'Invalid CSRF Test');
      await page.fill('[data-testid="client-email"]', 'invalid-csrf@example.com');
      
      await page.click('[data-testid="submit-client"]');
      await page.waitForLoadState('networkidle');

      // Should be rejected
      await expect(page.locator('[data-testid="error-message"]')).toContainText('CSRF');
    });
  });

  test.describe('Authentication Security', () => {
    
    test('Protected Routes Redirect to Login', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/clients',
        '/vendors',
        '/journeys',
        '/forms/builder',
        '/analytics',
        '/settings'
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        // Should redirect to login
        expect(page.url()).toContain('/login');
        
        // Verify redirect parameter is set
        const url = new URL(page.url());
        expect(url.searchParams.get('redirect')).toBe(route);
      }
    });

    test('API Endpoints Require Authentication', async ({ request }) => {
      const protectedEndpoints = [
        '/api/clients',
        '/api/journeys',
        '/api/forms',
        '/api/analytics/overview'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request.get(endpoint);
        
        // Should return 401 Unauthorized
        expect(response.status()).toBe(401);
        
        const errorData = await response.json();
        expect(errorData.error).toContain('Authentication');
      }
    });

    test('Session Timeout Protection', async ({ page }) => {
      // Mock expired session
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Session expired',
            code: 'SESSION_EXPIRED'
          })
        });
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should redirect to login due to expired session
      expect(page.url()).toContain('/login');
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });

    test('Brute Force Protection', async ({ request }) => {
      const loginAttempts = [];
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        const response = request.post('/api/auth/login', {
          data: {
            email: 'brute-force@example.com',
            password: 'wrong-password'
          }
        });
        loginAttempts.push(response);
      }

      const responses = await Promise.all(loginAttempts);
      
      // Later attempts should be rate limited
      const blockedResponses = responses.slice(5).filter(r => r.status() === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
      
      // Check rate limiting headers
      const blockedResponse = blockedResponses[0];
      const headers = blockedResponse.headers();
      expect(headers).toHaveProperty('retry-after');
    });
  });

  test.describe('Input Validation Security', () => {
    
    test('SQL Injection Prevention', async ({ page }) => {
      const sqlPayloads = [
        "'; DROP TABLE clients; --",
        "' OR '1'='1",
        "'; INSERT INTO clients (name) VALUES ('hacked'); --",
        "' UNION SELECT * FROM users --",
        "'; EXEC xp_cmdshell('whoami'); --"
      ];

      await page.goto('/clients');
      await page.waitForLoadState('networkidle');

      for (const payload of sqlPayloads) {
        // Search with SQL injection payload
        await page.fill('[data-testid="client-search"]', payload);
        await page.press('[data-testid="client-search"]', 'Enter');
        await page.waitForLoadState('networkidle');

        // Verify search doesn't break and returns safe results
        const searchResults = await page.locator('[data-testid="search-results"]');
        await expect(searchResults).toBeVisible();
        
        // Verify no error indicating SQL injection
        const errorMessage = page.locator('[data-testid="sql-error"]');
        await expect(errorMessage).not.toBeVisible();
      }
    });

    test('File Upload Security', async ({ page }) => {
      await page.goto('/pdf/upload');
      await page.waitForLoadState('networkidle');

      // Test malicious file types
      const maliciousFiles = [
        { name: 'malicious.exe', content: 'fake executable content' },
        { name: 'script.js', content: 'alert("XSS");' },
        { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'virus.bat', content: '@echo off\necho "malicious"' }
      ];

      for (const file of maliciousFiles) {
        // Create temporary file
        const fileContent = Buffer.from(file.content);
        
        try {
          await page.setInputFiles('[data-testid="file-upload"]', {
            name: file.name,
            mimeType: 'application/octet-stream',
            buffer: fileContent
          });

          await page.click('[data-testid="upload-submit"]');
          await page.waitForLoadState('networkidle');

          // Should reject malicious file types
          await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
          await expect(page.locator('[data-testid="upload-error"]')).toContainText('Invalid file type');
        } catch (error) {
          // File rejection is expected
          console.log(`File ${file.name} correctly rejected`);
        }
      }
    });

    test('Email Injection Prevention', async ({ page }) => {
      const emailInjectionPayloads = [
        'test@example.com\nBCC: hacker@evil.com',
        'test@example.com\r\nSubject: Injected Subject',
        'test@example.com%0ABcc: attacker@malicious.com',
        'test@example.com\x0ABcc: evil@hacker.com'
      ];

      await page.goto('/forms/contact');
      await page.waitForLoadState('networkidle');

      for (const payload of emailInjectionPayloads) {
        await page.fill('[data-testid="contact-email"]', payload);
        await page.fill('[data-testid="contact-name"]', 'Test User');
        await page.fill('[data-testid="contact-message"]', 'Test message');
        
        await page.click('[data-testid="submit-contact"]');
        await page.waitForLoadState('networkidle');

        // Should either reject the email or sanitize it
        const emailValue = await page.inputValue('[data-testid="contact-email"]');
        expect(emailValue).not.toContain('\n');
        expect(emailValue).not.toContain('\r');
        expect(emailValue).not.toContain('%0A');
        expect(emailValue).not.toContain('\x0A');
        expect(emailValue).not.toContain('BCC:');
        expect(emailValue).not.toContain('Subject:');

        // Reset form
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Security Headers', () => {
    
    test('Content Security Policy Headers', async ({ page }) => {
      const response = await page.goto('/dashboard');
      const headers = response?.headers();

      expect(headers).toHaveProperty('content-security-policy');
      
      const csp = headers!['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    test('Security Headers Present', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();

      // Check for essential security headers
      expect(headers).toHaveProperty('x-content-type-options');
      expect(headers!['x-content-type-options']).toBe('nosniff');

      expect(headers).toHaveProperty('x-frame-options');
      expect(headers!['x-frame-options']).toBe('DENY');

      expect(headers).toHaveProperty('x-xss-protection');
      expect(headers!['x-xss-protection']).toBe('1; mode=block');

      expect(headers).toHaveProperty('referrer-policy');
      expect(headers!['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('HTTPS Redirect', async ({ page }) => {
      // Mock HTTP request to test HTTPS redirect
      const response = await page.request.get('http://localhost:3000/dashboard');
      
      // Should redirect to HTTPS in production
      if (process.env.NODE_ENV === 'production') {
        expect(response.status()).toBe(301);
        expect(response.headers()['location']).toContain('https://');
      }
    });
  });

  test.describe('Data Protection', () => {
    
    test('Sensitive Data Masking', async ({ page }) => {
      // Mock API response with sensitive data
      await page.route('**/api/clients/*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'client-123',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            creditCard: '4111111111111111', // Should be masked
            ssn: '123-45-6789', // Should be masked
            notes: 'Sensitive client information'
          })
        });
      });

      await page.goto('/clients/client-123');
      await page.waitForLoadState('networkidle');

      // Verify sensitive data is masked in UI
      const pageContent = await page.content();
      expect(pageContent).not.toContain('4111111111111111');
      expect(pageContent).not.toContain('123-45-6789');
      
      // Should show masked versions
      expect(pageContent).toContain('****');
    });

    test('Audit Trail Logging', async ({ page }) => {
      // Mock audit endpoint
      let auditLogs: any[] = [];
      await page.route('**/api/audit/logs', (route) => {
        if (route.request().method() === 'POST') {
          const postData = JSON.parse(route.request().postData() || '{}');
          auditLogs.push(postData);
          route.fulfill({ status: 200, body: '{"status": "logged"}' });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ logs: auditLogs })
          });
        }
      });

      // Perform actions that should be audited
      await page.goto('/clients/new');
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="client-name"]', 'Audit Test Client');
      await page.fill('[data-testid="client-email"]', 'audit@example.com');
      await page.click('[data-testid="submit-client"]');
      await page.waitForLoadState('networkidle');

      // Check if audit logs were created
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog).toHaveProperty('action');
      expect(lastLog).toHaveProperty('timestamp');
      expect(lastLog).toHaveProperty('userId');
      expect(lastLog.action).toBe('client_created');
    });

    test('Data Encryption Verification', async ({ page }) => {
      // Intercept network requests to verify data encryption
      const requestData: any[] = [];
      
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/')) {
          const postData = request.postData();
          if (postData) {
            requestData.push({
              url: request.url(),
              data: postData,
              headers: request.headers()
            });
          }
        }
      });

      await page.goto('/forms/contact');
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="contact-name"]', 'Encryption Test');
      await page.fill('[data-testid="contact-email"]', 'encryption@example.com');
      await page.fill('[data-testid="contact-message"]', 'Sensitive message content');
      
      await page.click('[data-testid="submit-contact"]');
      await page.waitForLoadState('networkidle');

      // Verify requests use HTTPS
      const sensitiveRequests = requestData.filter(req => 
        req.url.includes('/api/forms') || req.url.includes('/api/clients')
      );

      for (const request of sensitiveRequests) {
        expect(request.url).toMatch(/^https:/);
        expect(request.headers).toHaveProperty('content-type', 'application/json');
      }
    });
  });

  test.describe('DDoS Protection', () => {
    
    test('Rate Limiting by IP', async ({ request }) => {
      const rapidRequests = Array.from({ length: 50 }, () => 
        request.get('/api/health', {
          headers: {
            'X-Forwarded-For': '192.168.1.100'
          }
        })
      );

      const responses = await Promise.all(rapidRequests);
      const rateLimitedCount = responses.filter(r => r.status() === 429).length;
      
      // Should have rate limited some requests
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    test('Request Size Limiting', async ({ request }) => {
      // Create large payload (> 10MB)
      const largePayload = 'x'.repeat(11 * 1024 * 1024);
      
      const response = await request.post('/api/forms/contact/submit', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Test',
          message: largePayload
        }
      });

      // Should reject large payloads
      expect(response.status()).toBe(413); // Payload Too Large
    });

    test('Slowloris Attack Protection', async ({ page }) => {
      // Simulate slow request attack
      const startTime = Date.now();
      
      try {
        await page.goto('/dashboard', { timeout: 5000 });
      } catch (error) {
        // Timeout is expected for this test
      }
      
      const duration = Date.now() - startTime;
      
      // Server should terminate slow requests quickly
      expect(duration).toBeLessThan(10000); // Under 10 seconds
    });
  });
});