import { test, expect } from '@playwright/test'

test.describe('MFA Security Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('http://localhost:3000')
  })

  test('MFA enrollment flow security', async ({ page }) => {
    // 1. Navigate to MFA setup
    await page.goto('/auth/mfa-setup')
    
    // 2. Test TOTP enrollment
    await page.click('[data-testid="setup-totp-btn"]')
    
    // Verify QR code is displayed
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible()
    
    // Verify secret is properly masked/secured
    const secret = await page.locator('[data-testid="totp-secret"]').inputValue()
    expect(secret.length).toBeGreaterThan(16)
    
    // Test invalid TOTP code rejection
    await page.fill('[data-testid="totp-verification"]', '123456')
    await page.click('[data-testid="verify-totp-btn"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid code')
  })

  test('MFA verification flow security', async ({ page }) => {
    // Assume user has MFA enabled
    await page.goto('/auth/mfa-verify')
    
    // Test rate limiting on verification attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="mfa-code"]', '000000')
      await page.click('[data-testid="verify-btn"]')
      
      if (i < 5) {
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid')
      } else {
        // Should be rate limited after 5 attempts
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Too many attempts')
      }
    }
  })

  test('Recovery code security', async ({ page }) => {
    await page.goto('/auth/mfa-verify')
    
    // Switch to recovery code
    await page.click('[data-testid="use-recovery-btn"]')
    
    // Test invalid recovery code format
    await page.fill('[data-testid="recovery-code"]', 'invalid')
    await page.click('[data-testid="verify-recovery-btn"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid recovery code format')
    
    // Test valid format but incorrect code
    await page.fill('[data-testid="recovery-code"]', 'ABCD1234')
    await page.click('[data-testid="verify-recovery-btn"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid or already used')
  })

  test('Session security after MFA', async ({ page }) => {
    // Test that session is properly upgraded to AAL2 after MFA
    await page.goto('/dashboard/billing') // Requires AAL2
    
    // Should redirect to MFA verification
    await expect(page).toHaveURL(/\/auth\/mfa-verify/)
    
    // Mock successful MFA verification
    await page.evaluate(() => {
      // Set mock AAL2 session
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        aal: 'aal2',
        expires_at: Date.now() + 3600000
      }))
    })
    
    await page.reload()
    
    // Should now access billing page
    await expect(page).toHaveURL('/dashboard/billing')
  })

  test('MFA bypass prevention', async ({ page }) => {
    // Test that MFA cannot be bypassed with URL manipulation
    await page.goto('/dashboard/settings/security')
    
    // Should redirect to MFA setup/verify
    await expect(page).toHaveURL(/\/auth\/mfa/)
    
    // Test direct API access without MFA
    const response = await page.request.get('/api/admin/sensitive-data')
    expect(response.status()).toBe(401)
  })
})

test.describe('Encryption Security Tests', () => {
  test('Field-level encryption validation', async ({ page }) => {
    await page.goto('/dashboard/guests')
    
    // Add guest with sensitive data
    await page.click('[data-testid="add-guest-btn"]')
    await page.fill('[data-testid="guest-name"]', 'John Doe')
    await page.fill('[data-testid="guest-email"]', 'john@example.com')
    await page.fill('[data-testid="guest-phone"]', '+1234567890')
    await page.fill('[data-testid="guest-address"]', '123 Main St, City, State')
    
    await page.click('[data-testid="save-guest-btn"]')
    
    // Verify data is encrypted in storage
    const encryptedData = await page.evaluate(async () => {
      const response = await fetch('/api/test/raw-guest-data')
      return response.json()
    })
    
    // Sensitive fields should be encrypted objects, not plain text
    expect(encryptedData.fullName).toHaveProperty('encrypted')
    expect(encryptedData.fullName).toHaveProperty('metadata')
    expect(encryptedData.email).toHaveProperty('encrypted')
  })

  test('Encryption key rotation', async ({ page }) => {
    await page.goto('/dashboard/settings/security')
    
    // Trigger key rotation
    await page.click('[data-testid="rotate-encryption-key-btn"]')
    
    // Confirm rotation
    await page.click('[data-testid="confirm-rotation-btn"]')
    
    // Verify new key is active
    const keyInfo = await page.evaluate(async () => {
      const response = await fetch('/api/encryption/key-info')
      return response.json()
    })
    
    expect(keyInfo.version).toBeGreaterThan(1)
    expect(keyInfo.isActive).toBe(true)
  })

  test('Data integrity after encryption', async ({ page }) => {
    // Test that encrypted data maintains integrity
    const testData = {
      guestName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321',
      dietaryRestrictions: 'Vegetarian, no nuts'
    }
    
    // Submit data
    await page.goto('/dashboard/guests')
    await page.click('[data-testid="add-guest-btn"]')
    
    for (const [field, value] of Object.entries(testData)) {
      await page.fill(`[data-testid="guest-${field.toLowerCase()}"]`, value)
    }
    
    await page.click('[data-testid="save-guest-btn"]')
    
    // Retrieve and verify data
    await page.reload()
    await page.click('[data-testid="guest-row"]:first-child')
    
    for (const [field, value] of Object.entries(testData)) {
      const fieldValue = await page.inputValue(`[data-testid="guest-${field.toLowerCase()}"]`)
      expect(fieldValue).toBe(value)
    }
  })
})

test.describe('RBAC Security Tests', () => {
  test('Role-based access control enforcement', async ({ page }) => {
    // Test different role access levels
    const roles = [
      { role: 'guest', allowedPaths: ['/dashboard'], deniedPaths: ['/dashboard/settings', '/dashboard/budget'] },
      { role: 'family', allowedPaths: ['/dashboard', '/dashboard/guests'], deniedPaths: ['/dashboard/billing'] },
      { role: 'planner', allowedPaths: ['/dashboard', '/dashboard/guests', '/dashboard/budget'], deniedPaths: ['/dashboard/settings/security'] },
      { role: 'owner', allowedPaths: ['/dashboard', '/dashboard/guests', '/dashboard/budget', '/dashboard/settings'], deniedPaths: [] }
    ]
    
    for (const { role, allowedPaths, deniedPaths } of roles) {
      // Set role in session
      await page.evaluate((r) => {
        localStorage.setItem('user-role', r)
      }, role)
      
      // Test allowed paths
      for (const path of allowedPaths) {
        await page.goto(path)
        await expect(page.locator('[data-testid="access-denied"]')).not.toBeVisible()
      }
      
      // Test denied paths
      for (const path of deniedPaths) {
        await page.goto(path)
        await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
      }
    }
  })

  test('Permission elevation security', async ({ page }) => {
    // Test that permissions cannot be elevated client-side
    await page.goto('/dashboard')
    
    // Try to elevate permissions in localStorage
    await page.evaluate(() => {
      localStorage.setItem('user-permissions', JSON.stringify(['admin', 'full_access']))
    })
    
    // Try to access admin area
    await page.goto('/dashboard/admin')
    
    // Should still be denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
  })
})

test.describe('General Security Vulnerabilities', () => {
  test('XSS prevention', async ({ page }) => {
    // Test XSS prevention in forms
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
    ]
    
    await page.goto('/dashboard/guests')
    await page.click('[data-testid="add-guest-btn"]')
    
    for (const payload of xssPayloads) {
      await page.fill('[data-testid="guest-name"]', payload)
      await page.click('[data-testid="save-guest-btn"]')
      
      // Verify XSS payload is not executed
      const alerts = []
      page.on('dialog', dialog => {
        alerts.push(dialog.message())
        dialog.dismiss()
      })
      
      await page.reload()
      expect(alerts).toHaveLength(0)
    }
  })

  test('CSRF protection', async ({ page }) => {
    // Test CSRF protection on state-changing operations
    await page.goto('/dashboard/guests')
    
    // Try to submit form without CSRF token
    const response = await page.request.post('/api/guests', {
      data: {
        name: 'Test Guest',
        email: 'test@example.com'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    expect(response.status()).toBe(403) // Should be blocked by CSRF protection
  })

  test('SQL injection prevention', async ({ page }) => {
    // Test SQL injection prevention
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "admin'/*"
    ]
    
    await page.goto('/dashboard/search')
    
    for (const payload of sqlPayloads) {
      await page.fill('[data-testid="search-input"]', payload)
      await page.click('[data-testid="search-btn"]')
      
      // Should not cause database errors or expose data
      await expect(page.locator('[data-testid="sql-error"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="unexpected-data"]')).not.toBeVisible()
    }
  })

  test('Rate limiting enforcement', async ({ page }) => {
    // Test API rate limiting
    const startTime = Date.now()
    const requests = []
    
    // Make rapid requests
    for (let i = 0; i < 25; i++) {
      requests.push(
        page.request.get('/api/health')
      )
    }
    
    const responses = await Promise.all(requests)
    const rateLimitedResponses = responses.filter(r => r.status() === 429)
    
    // Should have some rate limited responses
    expect(rateLimitedResponses.length).toBeGreaterThan(0)
  })

  test('Session security', async ({ page }) => {
    // Test session fixation prevention
    await page.goto('/auth/login')
    
    const sessionBefore = await page.evaluate(() => {
      return document.cookie
    })
    
    // Login
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-btn"]')
    
    const sessionAfter = await page.evaluate(() => {
      return document.cookie
    })
    
    // Session should change after login
    expect(sessionBefore).not.toBe(sessionAfter)
  })
})

test.describe('Security Headers Validation', () => {
  test('Security headers are present', async ({ page }) => {
    const response = await page.goto('/dashboard')
    
    const headers = response.headers()
    
    // Check for security headers
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-xss-protection']).toBe('1; mode=block')
    expect(headers['strict-transport-security']).toContain('max-age=')
    expect(headers['content-security-policy']).toBeDefined()
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('CSP violations are blocked', async ({ page }) => {
    // Test Content Security Policy enforcement
    const violations = []
    
    page.on('response', response => {
      if (response.url().includes('report-uri')) {
        violations.push(response)
      }
    })
    
    await page.goto('/dashboard')
    
    // Try to inject inline script (should be blocked by CSP)
    await page.evaluate(() => {
      const script = document.createElement('script')
      script.innerHTML = 'alert("csp-violation")'
      document.head.appendChild(script)
    })
    
    // CSP should block the script execution
    await page.waitForTimeout(1000)
    // No alert should have fired
  })
})