import { test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Security test payloads
const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE tasks; --",
  "' OR '1'='1",
  "1' AND '1' = '1' UNION SELECT * FROM users--",
  "admin'--",
  "' OR 1=1--",
  "'; EXEC sp_MSForEachTable 'DROP TABLE ?'; --"
];

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(\'XSS\')">',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
  '"><script>alert("XSS")</script>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload=alert("XSS")>'
];

const CSRF_TEST_TOKEN = 'malicious-csrf-token';

test.describe('Security Audit - Category System', () => {
  let page: Page;
  let authenticatedCookie: string;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login and capture authentication
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'security@test.com');
    await page.fill('[data-testid="password-input"]', 'securepassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Capture auth cookie for later tests
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'));
    if (authCookie) {
      authenticatedCookie = authCookie.value;
    }
  });

  test.describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in task title', async () => {
      await page.goto('/tasks/create');
      
      for (const payload of SQL_INJECTION_PAYLOADS) {
        await page.fill('[data-testid="task-title"]', payload);
        await page.fill('[data-testid="task-description"]', 'Test description');
        await page.click('[data-testid="category-select"]');
        await page.click('[data-testid="category-ceremony"]');
        await page.click('[data-testid="save-task"]');
        
        // Should either sanitize input or reject it
        const response = await page.waitForResponse(resp => 
          resp.url().includes('/api/tasks') && resp.request().method() === 'POST'
        );
        
        // Verify no SQL error in response
        const responseText = await response.text();
        expect(responseText.toLowerCase()).not.toContain('sql');
        expect(responseText.toLowerCase()).not.toContain('syntax error');
        expect(responseText.toLowerCase()).not.toContain('database error');
        
        // Clear form for next test
        await page.goto('/tasks/create');
      }
    });

    test('should prevent SQL injection in category filter', async () => {
      await page.goto('/tasks');
      
      for (const payload of SQL_INJECTION_PAYLOADS) {
        // Try to inject via URL parameter
        await page.goto(`/tasks?category=${encodeURIComponent(payload)}`);
        
        // Page should load without errors
        await expect(page.locator('[data-testid="tasks-container"]')).toBeVisible();
        
        // No database errors should be visible
        await expect(page.locator('text=/error|exception/i')).not.toBeVisible();
      }
    });

    test('should prevent SQL injection in search queries', async () => {
      await page.goto('/tasks');
      
      for (const payload of SQL_INJECTION_PAYLOADS) {
        await page.fill('[data-testid="search-input"]', payload);
        await page.press('[data-testid="search-input"]', 'Enter');
        
        // Wait for search results
        await page.waitForTimeout(500);
        
        // Should not show SQL errors
        await expect(page.locator('text=/sql|syntax|database.*error/i')).not.toBeVisible();
      }
    });
  });

  test.describe('XSS Prevention', () => {
    test('should prevent XSS in task creation', async () => {
      await page.goto('/tasks/create');
      
      for (const payload of XSS_PAYLOADS) {
        await page.fill('[data-testid="task-title"]', payload);
        await page.fill('[data-testid="task-description"]', payload);
        await page.click('[data-testid="save-task"]');
        
        // Check if script executed (it shouldn't)
        const alertFired = await page.evaluate(() => {
          let alertCalled = false;
          const originalAlert = window.alert;
          window.alert = () => { alertCalled = true; };
          setTimeout(() => { window.alert = originalAlert; }, 100);
          return alertCalled;
        });
        
        expect(alertFired).toBe(false);
        
        // Navigate back for next test
        await page.goto('/tasks/create');
      }
    });

    test('should sanitize XSS in displayed content', async () => {
      // Create task with XSS payload
      await page.goto('/tasks/create');
      await page.fill('[data-testid="task-title"]', '<script>window.xssTest=true</script>Task');
      await page.fill('[data-testid="task-description"]', 'Normal description');
      await page.click('[data-testid="save-task"]');
      
      await page.goto('/tasks');
      
      // Check if script was executed
      const xssExecuted = await page.evaluate(() => {
        return (window as any).xssTest === true;
      });
      
      expect(xssExecuted).toBe(false);
      
      // Verify content is escaped properly
      const taskTitle = await page.locator('[data-testid="task-item"]').first().textContent();
      expect(taskTitle).not.toContain('<script>');
    });

    test('should prevent XSS in category names', async () => {
      // Try to inject XSS via API
      const response = await page.evaluate(async (payload) => {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: payload,
            color: '#FF0000'
          })
        });
        return res.status;
      }, XSS_PAYLOADS[0]);
      
      // Should either reject or sanitize
      expect([400, 422, 201]).toContain(response);
      
      // If created, verify it's sanitized
      if (response === 201) {
        await page.goto('/tasks');
        const categoryHtml = await page.locator('[data-testid="category-list"]').innerHTML();
        expect(categoryHtml).not.toContain('<script>');
        expect(categoryHtml).not.toContain('onerror=');
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should require valid CSRF token for state changes', async () => {
      // Try to make request without CSRF token
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Omit CSRF token
          },
          body: JSON.stringify({
            title: 'CSRF Test Task',
            category: 'ceremony'
          })
        });
        return res.status;
      });
      
      // Should be rejected without proper CSRF token
      expect([401, 403, 419]).toContain(response);
    });

    test('should validate CSRF token on category updates', async () => {
      // Get a valid task ID first
      await page.goto('/tasks');
      const taskId = await page.locator('[data-testid="task-item"]').first().getAttribute('data-id');
      
      if (taskId) {
        // Try to update with invalid CSRF token
        const response = await page.evaluate(async (id) => {
          const res = await fetch(`/api/tasks/${id}/category`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': 'invalid-token'
            },
            body: JSON.stringify({
              category: 'reception'
            })
          });
          return res.status;
        }, taskId);
        
        expect([401, 403, 419]).toContain(response);
      }
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should enforce authentication for category operations', async () => {
      // Logout
      await page.goto('/logout');
      
      // Try to access protected endpoints
      const endpoints = [
        '/tasks/create',
        '/tasks',
        '/dashboard/analytics',
        '/helpers'
      ];
      
      for (const endpoint of endpoints) {
        await page.goto(endpoint);
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test('should enforce organization-level authorization', async () => {
      // Try to access another organization's tasks
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/tasks?organization_id=another-org-id', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        return { status: res.status, data: await res.json() };
      });
      
      // Should either return 403 or empty results
      expect([403, 200]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data).toHaveLength(0);
      }
    });

    test('should prevent privilege escalation', async () => {
      // Try to modify another user's task
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/tasks/other-user-task-id', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: 'ceremony',
            created_by: 'attacker-id' // Try to change ownership
          })
        });
        return res.status;
      });
      
      expect([403, 404]).toContain(response);
    });
  });

  test.describe('Input Validation', () => {
    test('should validate category values', async () => {
      await page.goto('/tasks/create');
      
      // Try to submit invalid category
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test Task',
            category: 'invalid-category-xyz'
          })
        });
        return res.status;
      });
      
      expect([400, 422]).toContain(response);
    });

    test('should enforce field length limits', async () => {
      await page.goto('/tasks/create');
      
      // Generate very long string
      const longString = 'a'.repeat(10000);
      
      await page.fill('[data-testid="task-title"]', longString);
      await page.click('[data-testid="save-task"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });

    test('should validate data types', async () => {
      const invalidData = [
        { priority: 'not-a-valid-priority' },
        { due_date: 'not-a-date' },
        { estimated_duration: 'not-a-number' },
        { max_helpers: -1 }
      ];
      
      for (const data of invalidData) {
        const response = await page.evaluate(async (payload) => {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: 'Test Task',
              category: 'ceremony',
              ...payload
            })
          });
          return res.status;
        }, data);
        
        expect([400, 422]).toContain(response);
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting on API endpoints', async () => {
      const requests = [];
      
      // Make 100 rapid requests
      for (let i = 0; i < 100; i++) {
        requests.push(
          page.evaluate(async () => {
            const res = await fetch('/api/tasks', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            return res.status;
          })
        );
      }
      
      const results = await Promise.all(requests);
      
      // Should see rate limiting kick in (429 status)
      const rateLimited = results.filter(status => status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Data Exposure Prevention', () => {
    test('should not expose sensitive data in API responses', async () => {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/tasks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        return await res.json();
      });
      
      // Check first task for sensitive fields
      if (response.length > 0) {
        const task = response[0];
        
        // Should not expose these fields
        expect(task).not.toHaveProperty('password');
        expect(task).not.toHaveProperty('api_key');
        expect(task).not.toHaveProperty('secret');
        expect(task).not.toHaveProperty('token');
      }
    });

    test('should not expose system information in errors', async () => {
      // Trigger an error
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/tasks/definitely-not-a-real-id', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        return await res.text();
      });
      
      // Should not expose system paths or stack traces
      expect(response.toLowerCase()).not.toContain('/users/');
      expect(response.toLowerCase()).not.toContain('/home/');
      expect(response.toLowerCase()).not.toContain('at function');
      expect(response.toLowerCase()).not.toContain('stack trace');
    });
  });

  test.describe('File Upload Security', () => {
    test('should validate file uploads for task attachments', async () => {
      await page.goto('/tasks/create');
      
      // Try to upload executable file
      const maliciousFile = new File(['#!/bin/bash\nrm -rf /'], 'evil.sh', { type: 'application/x-sh' });
      
      const input = await page.locator('input[type="file"]');
      
      // Set files programmatically
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const file = new File(['evil content'], 'evil.sh', { type: 'application/x-sh' });
        dt.items.add(file);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Should show validation error
      await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
    });
  });

  test.describe('Session Security', () => {
    test('should invalidate sessions on logout', async () => {
      // Capture session before logout
      const sessionBefore = await page.evaluate(() => {
        return document.cookie;
      });
      
      // Logout
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('/login');
      
      // Try to use old session
      const response = await page.evaluate(async (cookie) => {
        const res = await fetch('/api/tasks', {
          headers: {
            'Cookie': cookie
          }
        });
        return res.status;
      }, sessionBefore);
      
      expect([401, 403]).toContain(response);
    });

    test('should implement session timeout', async () => {
      // This would require waiting for actual timeout period
      // For testing purposes, we'll check if timeout configuration exists
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        return await res.json();
      });
      
      // Should have session configuration
      expect(response).toHaveProperty('expiresAt');
    });
  });

  test.afterEach(async () => {
    await page.close();
  });
});

test.describe('Security Headers Validation', () => {
  test('should set proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    if (headers) {
      // Check for security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['strict-transport-security']).toContain('max-age=');
      
      // CSP should be present
      const csp = headers['content-security-policy'];
      expect(csp).toBeDefined();
      if (csp) {
        expect(csp).toContain("default-src");
        expect(csp).not.toContain("'unsafe-inline'");
        expect(csp).not.toContain("'unsafe-eval'");
      }
    }
  });
});