/**
 * Security Integration Tests
 * Tests end-to-end security measures working together
 */

import { test, expect } from '@playwright/test';

test.describe('End-to-End Security Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/');
  });

  test.describe('Form Submission Security Flow', () => {
    test('should successfully submit a secure form with all validations', async ({ page }) => {
      // Navigate to form creation
      await page.goto('/forms/create');
      
      // Create a simple form
      await page.fill('[data-testid="form-title"]', 'Security Test Form');
      await page.fill('[data-testid="form-description"]', 'A form to test security measures');
      
      // Add form fields
      await page.click('[data-testid="add-text-field"]');
      await page.fill('[data-testid="field-label"]', 'Full Name');
      await page.check('[data-testid="field-required"]');
      
      await page.click('[data-testid="add-email-field"]');
      await page.fill('[data-testid="field-label"]', 'Email Address');
      
      // Save form
      await page.click('[data-testid="save-form"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Navigate to form preview/submission
      await page.click('[data-testid="preview-form"]');
      
      // Submit the form with valid data
      await page.fill('[data-testid="field-full-name"]', 'John Doe');
      await page.fill('[data-testid="field-email"]', 'john.doe@example.com');
      
      await page.click('[data-testid="submit-form"]');
      
      // Verify successful submission
      await expect(page.locator('[data-testid="form-success"]')).toBeVisible();
    });

    test('should prevent XSS attacks in form submissions', async ({ page }) => {
      await page.goto('/forms/create');
      
      // Try to inject XSS in form title
      const xssPayload = '<script>window.xssTest = true;</script>Malicious Title';
      await page.fill('[data-testid="form-title"]', xssPayload);
      
      // Try to inject XSS in form description
      await page.fill('[data-testid="form-description"]', 'Description with <img src="x" onerror="alert(1)">');
      
      await page.click('[data-testid="save-form"]');
      
      // Verify XSS payload was sanitized
      const titleText = await page.textContent('[data-testid="form-title-display"]');
      expect(titleText).not.toContain('<script>');
      expect(titleText).toContain('Malicious Title');
      
      // Verify no XSS execution occurred
      const xssExecuted = await page.evaluate(() => (window as any).xssTest);
      expect(xssExecuted).toBeUndefined();
    });

    test('should reject form submissions without CSRF tokens', async ({ page, context }) => {
      // Intercept and modify requests to remove CSRF tokens
      await page.route('**/api/forms/**', async (route, request) => {
        if (request.method() === 'POST') {
          const headers = await request.allHeaders();
          delete headers['x-csrf-token'];
          
          await route.continue({
            headers
          });
        } else {
          await route.continue();
        }
      });
      
      await page.goto('/forms/create');
      await page.fill('[data-testid="form-title"]', 'CSRF Test Form');
      
      // Attempt to save without CSRF token
      await page.click('[data-testid="save-form"]');
      
      // Should see CSRF error
      await expect(page.locator('[data-testid="csrf-error"]')).toBeVisible();
    });

    test('should enforce rate limiting on form submissions', async ({ page }) => {
      await page.goto('/forms/test-form');
      
      // Rapidly submit multiple forms
      const submissions = [];
      for (let i = 0; i < 25; i++) {
        submissions.push(
          page.fill('[data-testid="field-name"]', `User ${i}`)
            .then(() => page.click('[data-testid="submit-form"]'))
        );
      }
      
      await Promise.all(submissions);
      
      // Should eventually see rate limit error
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    });
  });

  test.describe('File Upload Security Flow', () => {
    test('should upload valid files successfully', async ({ page }) => {
      await page.goto('/forms/create');
      
      // Add file upload field
      await page.click('[data-testid="add-file-field"]');
      await page.fill('[data-testid="field-label"]', 'Upload Document');
      
      await page.click('[data-testid="save-form"]');
      await page.click('[data-testid="preview-form"]');
      
      // Upload a valid PDF file
      const fileInput = page.locator('[data-testid="file-upload"]');
      await fileInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\nValid PDF content')
      });
      
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    });

    test('should reject malicious files', async ({ page }) => {
      await page.goto('/forms/test-form-with-upload');
      
      // Try to upload a file with malicious content
      const fileInput = page.locator('[data-testid="file-upload"]');
      await fileInput.setInputFiles({
        name: 'malicious.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('<script>alert("XSS")</script>')
      });
      
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-error"]')).toContainText('malicious content');
    });

    test('should reject oversized files', async ({ page }) => {
      await page.goto('/forms/test-form-with-upload');
      
      // Create a large file (simulate 100MB)
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024, 'a');
      
      const fileInput = page.locator('[data-testid="file-upload"]');
      await fileInput.setInputFiles({
        name: 'large.txt',
        mimeType: 'text/plain',
        buffer: largeBuffer
      });
      
      await expect(page.locator('[data-testid="size-error"]')).toBeVisible();
    });

    test('should reject files with dangerous extensions', async ({ page }) => {
      await page.goto('/forms/test-form-with-upload');
      
      const fileInput = page.locator('[data-testid="file-upload"]');
      await fileInput.setInputFiles({
        name: 'malware.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('MZ\x90\x00') // PE header
      });
      
      await expect(page.locator('[data-testid="type-error"]')).toBeVisible();
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require authentication for form creation', async ({ page }) => {
      // Try to access form creation without login
      await page.goto('/forms/create');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should prevent access to other users forms', async ({ page }) => {
      // Login as user 1
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'user1@example.com');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Try to access another user's form directly
      await page.goto('/forms/other-user-form-id/edit');
      
      // Should see unauthorized error or redirect
      await expect(page.locator('[data-testid="unauthorized-error"]')).toBeVisible();
    });
  });

  test.describe('Content Security Policy', () => {
    test('should block inline scripts', async ({ page }) => {
      let cspViolation = false;
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
          cspViolation = true;
        }
      });
      
      await page.goto('/forms/create');
      
      // Try to execute inline script
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = 'window.inlineScript = true;';
        document.body.appendChild(script);
      });
      
      // Check if CSP blocked the script
      const scriptExecuted = await page.evaluate(() => (window as any).inlineScript);
      expect(scriptExecuted).toBeUndefined();
    });

    test('should allow safe external resources', async ({ page }) => {
      await page.goto('/forms/create');
      
      // Verify that legitimate external resources load
      const googleFonts = await page.evaluate(() => {
        const links = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
        return links.length > 0;
      });
      
      // Should allow safe external fonts
      expect(googleFonts).toBeTruthy();
    });
  });

  test.describe('Data Validation & Sanitization', () => {
    test('should sanitize form data on submission', async ({ page }) => {
      await page.goto('/forms/test-form');
      
      // Submit form with potentially dangerous data
      await page.fill('[data-testid="field-name"]', 'John<script>alert("XSS")</script>Doe');
      await page.fill('[data-testid="field-email"]', 'john@example.com<img src="x" onerror="alert(1)">');
      
      await page.click('[data-testid="submit-form"]');
      
      // Verify submission was sanitized and accepted
      await expect(page.locator('[data-testid="form-success"]')).toBeVisible();
      
      // Check that dangerous scripts were removed
      const submittedData = await page.textContent('[data-testid="submitted-data"]');
      expect(submittedData).toContain('JohnDoe');
      expect(submittedData).not.toContain('<script>');
      expect(submittedData).not.toContain('<img');
    });

    test('should validate email formats strictly', async ({ page }) => {
      await page.goto('/forms/test-form');
      
      const invalidEmails = [
        'notanemail',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example',
        'test@.com'
      ];
      
      for (const email of invalidEmails) {
        await page.fill('[data-testid="field-email"]', email);
        await page.click('[data-testid="submit-form"]');
        
        await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible();
        
        // Clear the field for next test
        await page.fill('[data-testid="field-email"]', '');
      }
    });

    test('should enforce field length limits', async ({ page }) => {
      await page.goto('/forms/test-form');
      
      // Try to submit overly long text
      const longText = 'a'.repeat(1000);
      await page.fill('[data-testid="field-name"]', longText);
      
      await page.click('[data-testid="submit-form"]');
      
      await expect(page.locator('[data-testid="length-validation-error"]')).toBeVisible();
    });
  });

  test.describe('Session Security', () => {
    test('should invalidate session after logout', async ({ page, context }) => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'user@example.com');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Access protected resource
      await page.goto('/forms/create');
      await expect(page.locator('[data-testid="form-builder"]')).toBeVisible();
      
      // Logout
      await page.click('[data-testid="logout-button"]');
      
      // Try to access protected resource again
      await page.goto('/forms/create');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle session timeout', async ({ page }) => {
      // This would require mocking session expiration
      // For now, verify session handling exists
      await page.goto('/forms/create');
      
      // Simulate expired session by manipulating cookies
      await page.evaluate(() => {
        document.cookie = 'supabase-auth-token=expired; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      });
      
      // Try to perform authenticated action
      await page.reload();
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Error Handling Security', () => {
    test('should not leak sensitive information in error messages', async ({ page }) => {
      // Intercept network requests to simulate server errors
      await page.route('**/api/forms/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error',
            message: 'Something went wrong'
          })
        });
      });
      
      await page.goto('/forms/create');
      await page.fill('[data-testid="form-title"]', 'Test Form');
      await page.click('[data-testid="save-form"]');
      
      // Error message should be generic
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('sql');
      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('token');
    });

    test('should handle malformed requests gracefully', async ({ page }) => {
      await page.route('**/api/forms', async route => {
        // Send malformed JSON
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: '{"error": "Bad Request"}'
        });
      });
      
      await page.goto('/forms/create');
      await page.fill('[data-testid="form-title"]', 'Test Form');
      await page.click('[data-testid="save-form"]');
      
      // Should handle error gracefully without crashing
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Performance Security', () => {
    test('should prevent DOS attacks through large payloads', async ({ page }) => {
      await page.goto('/forms/create');
      
      // Try to submit extremely large form data
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      await page.fill('[data-testid="form-description"]', largePayload);
      await page.click('[data-testid="save-form"]');
      
      // Should reject large payload
      await expect(page.locator('[data-testid="payload-size-error"]')).toBeVisible();
    });

    test('should enforce reasonable timeout limits', async ({ page }) => {
      // Mock slow response
      await page.route('**/api/forms/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // 35 second delay
        await route.continue();
      });
      
      await page.goto('/forms/create');
      await page.fill('[data-testid="form-title"]', 'Test Form');
      
      // Set shorter timeout for this test
      page.setDefaultTimeout(30000);
      
      await expect(page.click('[data-testid="save-form"]')).rejects.toThrow();
    });
  });

  test.describe('Browser Security Features', () => {
    test('should set secure response headers', async ({ page }) => {
      const response = await page.goto('/forms/create');
      
      const headers = response?.headers();
      expect(headers?.['x-frame-options']).toBe('DENY');
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['x-xss-protection']).toBe('1; mode=block');
      expect(headers?.['strict-transport-security']).toContain('max-age');
      expect(headers?.['content-security-policy']).toBeTruthy();
    });

    test('should prevent clickjacking with frame options', async ({ page }) => {
      // This test would be more comprehensive in a real browser security test
      const response = await page.goto('/forms/create');
      const headers = response?.headers();
      
      expect(headers?.['x-frame-options']).toBe('DENY');
    });
  });
});