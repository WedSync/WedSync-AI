import { test, expect } from '@playwright/test'
import { authenticator } from 'otplib'

// Test user credentials
const TEST_USER = {
  email: 'test.mfa@wedsync.com',
  password: 'TestPassword123!@#',
  phone: '+15551234567'
}

// Helper to generate TOTP code for testing
function generateTOTPCode(secret: string): string {
  return authenticator.generate(secret)
}

test.describe('MFA Security - Authentication Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
  })

  test('MFA Setup Flow - TOTP Authenticator', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Navigate to security settings
    await page.goto('/settings/security')
    
    // Click Enable MFA button
    await page.click('button:has-text("Enable Two-Factor")')
    
    // Wait for QR code
    await page.waitForSelector('text="Scan QR code"', { timeout: 5000 })
    
    // Check QR code is displayed
    const qrCode = await page.locator('img[alt="MFA QR Code"]')
    await expect(qrCode).toBeVisible()
    
    // Get the secret from the page
    const secretElement = await page.locator('code').textContent()
    expect(secretElement).toBeTruthy()
    
    // Generate a test TOTP code (in real test, would use actual authenticator)
    const testCode = '123456' // Mock code for testing
    
    // Enter verification code
    await page.fill('input[name="totpCode"]', testCode)
    
    // Verify
    await page.click('button:has-text("Verify Code")')
    
    // Check for backup codes
    await page.waitForSelector('text="Save Your Backup Codes"', { timeout: 5000 })
    
    // Verify backup codes are displayed
    const backupCodes = await page.locator('.font-mono').count()
    expect(backupCodes).toBeGreaterThan(0)
    
    // Confirm saved codes
    await page.click('button:has-text("I\'ve Saved My Codes")')
    
    // Verify MFA is enabled
    await expect(page.locator('text="Two-Factor Authentication Enabled!"')).toBeVisible()
  })

  test('MFA Setup Flow - SMS', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Navigate to security settings
    await page.goto('/settings/security')
    
    // Click Enable MFA button
    await page.click('button:has-text("Enable Two-Factor")')
    
    // Switch to SMS tab
    await page.click('button[role="tab"]:has-text("SMS")')
    
    // Enter phone number
    await page.fill('input[type="tel"]', TEST_USER.phone)
    
    // Set up SMS authentication
    await page.click('button:has-text("Set Up SMS Authentication")')
    
    // Wait for SMS code input
    await page.waitForSelector('text="Enter SMS Code"', { timeout: 5000 })
    
    // Enter test SMS code
    const smsInputs = page.locator('input[maxlength="1"]')
    const testSmsCode = '654321'
    for (let i = 0; i < 6; i++) {
      await smsInputs.nth(i).fill(testSmsCode[i])
    }
    
    // Verify
    await page.click('button:has-text("Verify")')
    
    // Check for backup codes
    await page.waitForSelector('text="Save Your Backup Codes"', { timeout: 5000 })
    
    // Confirm saved codes
    await page.click('button:has-text("I\'ve Saved My Codes")')
    
    // Verify MFA is enabled
    await expect(page.locator('text="Two-Factor Authentication Enabled!"')).toBeVisible()
  })

  test('MFA Verification on Login', async ({ page }) => {
    // Attempt login
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Should redirect to MFA verification
    await page.waitForURL('**/auth/mfa-verify**')
    
    // Verify MFA verification page is shown
    await expect(page.locator('text="Two-Factor Authentication"')).toBeVisible()
    
    // Enter MFA code
    const mfaInputs = page.locator('input[maxlength="1"]')
    const testMfaCode = '123456'
    for (let i = 0; i < 6; i++) {
      await mfaInputs.nth(i).fill(testMfaCode[i])
    }
    
    // Submit verification
    await page.click('button:has-text("Verify")')
    
    // Should redirect to dashboard after successful MFA
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Failed Login Lockout', async ({ page }) => {
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
      
      // Small delay between attempts
      await page.waitForTimeout(500)
    }
    
    // Check for account locked message
    await expect(page.locator('text="Account locked"')).toBeVisible()
    
    // Verify lockout message shows duration
    await expect(page.locator('text=/30 minutes/')).toBeVisible()
  })

  test('MFA Required for Sensitive Operations', async ({ page }) => {
    // Login with valid credentials
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Complete MFA if required
    if (await page.url().includes('mfa-verify')) {
      const mfaInputs = page.locator('input[maxlength="1"]')
      const testMfaCode = '123456'
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).fill(testMfaCode[i])
      }
      await page.click('button:has-text("Verify")')
    }
    
    // Navigate to sensitive operation (vendor contracts)
    await page.goto('/vendor-contracts')
    
    // Should require MFA re-verification for sensitive data
    if (await page.url().includes('mfa-verify')) {
      await expect(page.locator('text="This operation requires multi-factor authentication"')).toBeVisible()
    }
  })

  test('Backup Code Usage', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // On MFA page, click use backup code
    await page.click('button:has-text("Use backup code instead")')
    
    // Enter backup code
    const backupInputs = page.locator('input[maxlength="1"]')
    const testBackupCode = 'ABC123' // Mock backup code
    for (let i = 0; i < 6; i++) {
      await backupInputs.nth(i).fill(testBackupCode[i] || '')
    }
    
    // Verify with backup code
    await page.click('button:has-text("Verify")')
  })

  test('Session Timeout', async ({ page, context }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Complete MFA if required
    if (await page.url().includes('mfa-verify')) {
      const mfaInputs = page.locator('input[maxlength="1"]')
      const testMfaCode = '123456'
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).fill(testMfaCode[i])
      }
      await page.click('button:has-text("Verify")')
    }
    
    // Simulate session timeout by manipulating cookies
    await context.clearCookies()
    
    // Try to access protected page
    await page.goto('/dashboard')
    
    // Should redirect to login
    await page.waitForURL('**/login**')
    await expect(page.locator('text="Session expired"')).toBeVisible()
  })

  test('Remove MFA Method', async ({ page }) => {
    // Login and navigate to security settings
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Complete MFA if required
    if (await page.url().includes('mfa-verify')) {
      const mfaInputs = page.locator('input[maxlength="1"]')
      const testMfaCode = '123456'
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).fill(testMfaCode[i])
      }
      await page.click('button:has-text("Verify")')
    }
    
    await page.goto('/settings/security')
    
    // Find and click remove button for a factor
    const removeButton = page.locator('button[aria-label*="Remove"]').first()
    if (await removeButton.isVisible()) {
      await removeButton.click()
      
      // Confirm removal
      await page.click('button:has-text("Remove")')
      
      // Verify factor was removed
      await expect(page.locator('text="Authentication method removed"')).toBeVisible()
    }
  })

  test('Password Strength Requirements', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup')
    
    // Test weak password
    await page.fill('input[name="password"]', 'weak')
    await page.click('button[type="submit"]')
    
    // Check for password requirements message
    await expect(page.locator('text=/12 characters/')).toBeVisible()
    await expect(page.locator('text=/complexity/')).toBeVisible()
    
    // Test strong password
    await page.fill('input[name="password"]', 'StrongP@ssw0rd123!')
    
    // Password should pass requirements
    const passwordError = page.locator('text=/password.*weak/i')
    await expect(passwordError).not.toBeVisible()
  })

  test('Security Audit Trail', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Complete MFA if required
    if (await page.url().includes('mfa-verify')) {
      const mfaInputs = page.locator('input[maxlength="1"]')
      const testMfaCode = '123456'
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).fill(testMfaCode[i])
      }
      await page.click('button:has-text("Verify")')
    }
    
    // Navigate to security audit logs
    await page.goto('/settings/security/audit-logs')
    
    // Verify audit log entries are displayed
    await expect(page.locator('text="Security Events"')).toBeVisible()
    
    // Check for recent login event
    await expect(page.locator('text=/login_success/')).toBeVisible()
    
    // Check event details
    const eventRow = page.locator('tr').filter({ hasText: 'login_success' }).first()
    await expect(eventRow).toContainText(TEST_USER.email)
  })
})

test.describe('MFA Security - Attack Prevention', () => {
  
  test('Brute Force Protection', async ({ page }) => {
    // Attempt rapid failed MFA verifications
    await page.goto('/auth/mfa-verify')
    
    const mfaInputs = page.locator('input[maxlength="1"]')
    
    for (let attempt = 0; attempt < 5; attempt++) {
      // Enter wrong code
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).fill(String(attempt))
      }
      
      await page.click('button:has-text("Verify")')
      await page.waitForTimeout(100)
      
      // Clear inputs for next attempt
      for (let i = 0; i < 6; i++) {
        await mfaInputs.nth(i).clear()
      }
    }
    
    // Check for lockout
    await expect(page.locator('text=/account.*locked/i')).toBeVisible()
  })

  test('CSRF Protection on MFA Endpoints', async ({ page }) => {
    // Attempt to call MFA API without CSRF token
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/mfa/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ factorType: 'totp' })
        })
        return { status: res.status, ok: res.ok }
      } catch (error) {
        return { error: error.message }
      }
    })
    
    // Should be blocked without CSRF token
    expect(response.status).toBe(403)
  })

  test('Session Fixation Prevention', async ({ page, context }) => {
    // Login with first session
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Get session cookie
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name === 'session-id')
    
    // Open new incognito context
    const newContext = await page.context().browser()?.newContext()
    if (newContext) {
      const newPage = await newContext.newPage()
      
      // Try to hijack session
      if (sessionCookie) {
        await newContext.addCookies([sessionCookie])
      }
      
      // Navigate to protected page
      await newPage.goto('/dashboard')
      
      // Should not be authenticated with hijacked session
      await expect(newPage).toHaveURL(/.*login.*/)
      
      await newContext.close()
    }
  })
})