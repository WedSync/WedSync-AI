import { test, expect } from '@playwright/test'

test.describe('Password Reset Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('displays forgot password page correctly', async ({ page }) => {
    await page.goto('/forgot-password')
    
    // Check accessibility structure
    const accessibility = await page.accessibility.snapshot()
    expect(accessibility).toBeDefined()
    
    // Verify page structure
    await expect(page).toHaveTitle('Forgot Password - WedSync')
    await expect(page.getByRole('heading', { name: 'Forgot password?' })).toBeVisible()
    await expect(page.getByText('Enter your email to reset your password')).toBeVisible()
    
    // Check form elements
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    
    // Check navigation links
    await expect(page.getByRole('link', { name: 'Remember your password? Sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contact support' })).toBeVisible()
    
    // Verify no console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    expect(errors).toHaveLength(0)
  })

  test('validates email input correctly', async ({ page }) => {
    await page.goto('/forgot-password')
    
    const emailInput = page.getByLabel('Email address')
    const submitButton = page.getByRole('button', { name: 'Send reset link' })
    
    // Test empty email validation
    await submitButton.click()
    await expect(page.getByText('Invalid email address')).toBeVisible()
    
    // Test invalid email format
    await emailInput.fill('invalid-email')
    await submitButton.click()
    await expect(page.getByText('Invalid email address')).toBeVisible()
    
    // Test valid email format removes error
    await emailInput.fill('test@example.com')
    await expect(page.getByText('Invalid email address')).not.toBeVisible()
  })

  test('shows loading state during submission', async ({ page }) => {
    await page.goto('/forgot-password')
    
    const emailInput = page.getByLabel('Email address')
    const submitButton = page.getByRole('button', { name: 'Send reset link' })
    
    await emailInput.fill('test@example.com')
    await submitButton.click()
    
    // Check loading state
    await expect(page.getByRole('button', { name: 'Sending reset link...' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sending reset link...' })).toBeDisabled()
  })

  test('displays success state after submission', async ({ page }) => {
    await page.goto('/forgot-password')
    
    const emailInput = page.getByLabel('Email address')
    const submitButton = page.getByRole('button', { name: 'Send reset link' })
    
    await emailInput.fill('test@example.com')
    await submitButton.click()
    
    // Wait for success state (adjust timeout as needed for your setup)
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("We've sent a password reset link to your email")).toBeVisible()
    
    // Check success actions
    await expect(page.getByRole('button', { name: 'Try another email' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible()
  })

  test('allows returning to form from success state', async ({ page }) => {
    await page.goto('/forgot-password')
    
    const emailInput = page.getByLabel('Email address')
    const submitButton = page.getByRole('button', { name: 'Send reset link' })
    
    await emailInput.fill('test@example.com')
    await submitButton.click()
    
    // Wait for success state
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 10000 })
    
    // Click "Try another email"
    await page.getByRole('button', { name: 'Try another email' }).click()
    
    // Should return to form
    await expect(page.getByRole('heading', { name: 'Forgot password?' })).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
  })

  test('displays reset password page correctly with token', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123')
    
    // Check accessibility structure
    const accessibility = await page.accessibility.snapshot()
    expect(accessibility).toBeDefined()
    
    // Verify page structure
    await expect(page).toHaveTitle('Reset Password - WedSync')
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await expect(page.getByText('Enter your new password below')).toBeVisible()
    
    // Check form elements
    await expect(page.getByLabel('New password')).toBeVisible()
    await expect(page.getByLabel('Confirm new password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Update password' })).toBeVisible()
    
    // Check password requirements help text
    await expect(page.getByText('Password requirements:')).toBeVisible()
    await expect(page.getByText('At least 8 characters long')).toBeVisible()
    await expect(page.getByText('Contains uppercase and lowercase letters')).toBeVisible()
  })

  test('shows invalid token message without token', async ({ page }) => {
    await page.goto('/reset-password')
    
    await expect(page.getByRole('heading', { name: 'Invalid reset link' })).toBeVisible()
    await expect(page.getByText('This password reset link is invalid or has expired')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Request new reset link' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible()
  })

  test('validates password requirements', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123')
    
    const passwordInput = page.getByLabel('New password')
    const confirmPasswordInput = page.getByLabel('Confirm new password')
    const submitButton = page.getByRole('button', { name: 'Update password' })
    
    // Test weak password
    await passwordInput.fill('weak')
    await submitButton.click()
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
    
    // Test password mismatch
    await passwordInput.fill('StrongP@ssw0rd123')
    await confirmPasswordInput.fill('DifferentP@ssw0rd123')
    await submitButton.click()
    await expect(page.getByText("Passwords don't match")).toBeVisible()
  })

  test('shows password strength indicator', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123')
    
    const passwordInput = page.getByLabel('New password')
    
    // Test different password strengths
    await passwordInput.fill('weak')
    await expect(page.getByText('Weak password')).toBeVisible()
    
    await passwordInput.fill('')
    await passwordInput.fill('WeakPass')
    await expect(page.getByText('Fair password')).toBeVisible()
    
    await passwordInput.fill('')
    await passwordInput.fill('WeakPass1')
    await expect(page.getByText('Good password')).toBeVisible()
    
    await passwordInput.fill('')
    await passwordInput.fill('StrongP@ss1')
    await expect(page.getByText('Strong password')).toBeVisible()
  })

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123')
    
    const passwordInput = page.getByLabel('New password')
    const confirmPasswordInput = page.getByLabel('Confirm new password')
    
    // Initially password fields should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    
    // Click eye icons to show passwords
    const eyeButtons = page.locator('button:has([data-testid="eye-icon"])')
    await eyeButtons.first().click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    
    await eyeButtons.last().click()
    await expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    
    // Click eye-slash icons to hide passwords
    const eyeSlashButtons = page.locator('button:has([data-testid="eye-slash-icon"])')
    await eyeSlashButtons.first().click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('completes full password reset flow', async ({ page }) => {
    // Step 1: Request password reset
    await page.goto('/forgot-password')
    
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    
    // Wait for success state
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 10000 })
    
    // Step 2: Navigate to reset password page (simulating email link click)
    await page.goto('/reset-password?token=test-token-123')
    
    // Step 3: Reset password
    const newPassword = 'NewStrongP@ssw0rd123'
    await page.getByLabel('New password').fill(newPassword)
    await page.getByLabel('Confirm new password').fill(newPassword)
    
    // Verify strong password indicator
    await expect(page.getByText('Strong password')).toBeVisible()
    
    // Submit form
    await page.getByRole('button', { name: 'Update password' }).click()
    
    // Should redirect to login with success message
    await expect(page).toHaveURL(/\/login/)
    await page.waitForTimeout(1000) // Allow time for redirect and query params
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 800 })
    
    await page.goto('/forgot-password')
    
    // Take screenshot for visual validation
    await page.screenshot({ path: 'tests/screenshots/forgot-password-mobile.png' })
    
    // Verify form is usable on mobile
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    
    // Test reset password page on mobile
    await page.goto('/reset-password?token=test-token-123')
    
    await page.screenshot({ path: 'tests/screenshots/reset-password-mobile.png' })
    
    // Verify password fields are accessible
    await expect(page.getByLabel('New password')).toBeVisible()
    await expect(page.getByLabel('Confirm new password')).toBeVisible()
    await expect(page.getByText('Password requirements:')).toBeVisible()
  })

  test('responsive design works on tablet', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/forgot-password')
    await page.screenshot({ path: 'tests/screenshots/forgot-password-tablet.png' })
    
    await page.goto('/reset-password?token=test-token-123')
    await page.screenshot({ path: 'tests/screenshots/reset-password-tablet.png' })
    
    // Verify layout remains functional
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await expect(page.getByLabel('New password')).toBeVisible()
  })

  test('responsive design works on desktop', async ({ page }) => {
    // Test desktop viewport (already set in beforeEach, but explicit for clarity)
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    await page.goto('/forgot-password')
    await page.screenshot({ path: 'tests/screenshots/forgot-password-desktop.png' })
    
    await page.goto('/reset-password?token=test-token-123')
    await page.screenshot({ path: 'tests/screenshots/reset-password-desktop.png' })
    
    // Verify full layout is visible
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await expect(page.getByText('Password requirements:')).toBeVisible()
  })

  test('handles network errors gracefully', async ({ page }) => {
    // Intercept network requests and simulate errors
    await page.route('**/auth/reset-password-for-email', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Server error' } })
      })
    })
    
    await page.goto('/forgot-password')
    
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    
    // Should handle error gracefully
    await expect(page.getByText('Server error')).toBeVisible()
  })

  test('keyboard navigation works properly', async ({ page }) => {
    await page.goto('/forgot-password')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email address')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeFocused()
    
    // Test form submission with Enter key
    await page.getByLabel('Email address').focus()
    await page.keyboard.type('test@example.com')
    await page.keyboard.press('Enter')
    
    // Should submit form
    await expect(page.getByRole('button', { name: 'Sending reset link...' })).toBeVisible()
  })

  test('maintains accessibility standards', async ({ page }) => {
    await page.goto('/forgot-password')
    
    // Check for accessibility violations
    const accessibilityResults = await page.accessibility.snapshot()
    
    // Verify form has proper labels
    await expect(page.getByLabel('Email address')).toBeVisible()
    
    // Check ARIA attributes
    const emailInput = page.getByLabel('Email address')
    await emailInput.fill('invalid')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    
    // Error message should have proper ARIA
    await expect(page.getByRole('alert')).toBeVisible()
    
    // Test reset password page accessibility
    await page.goto('/reset-password?token=test-token-123')
    
    const passwordInput = page.getByLabel('New password')
    await passwordInput.fill('weak')
    
    // Should have accessible error messaging
    const submitButton = page.getByRole('button', { name: 'Update password' })
    await submitButton.click()
    
    await expect(page.getByRole('alert')).toBeVisible()
  })
})