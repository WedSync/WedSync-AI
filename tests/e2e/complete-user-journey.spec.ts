import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * Complete User Journey E2E Test
 * Tests the entire flow from signup to paid subscription
 */

test.describe('Complete Wedding Vendor Journey', () => {
  let page: Page;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const vendorName = 'Test Photography Studio';

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Complete journey: Signup → PDF Upload → Form Creation → Client Submission → Payment', async () => {
    // Step 1: Sign up as a new vendor
    await test.step('Sign up as vendor', async () => {
      await page.goto('/auth/signup');
      
      // Take screenshot of signup page
      await page.screenshot({ path: 'screenshots/01-signup-page.png' });
      
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="companyName"]', vendorName);
      await page.selectOption('select[name="vendorType"]', 'photography');
      
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Verify welcome message
      await expect(page.locator('text=Welcome to WedSync')).toBeVisible();
      
      // Take screenshot of dashboard
      await page.screenshot({ path: 'screenshots/02-dashboard-welcome.png' });
    });

    // Step 2: Upload a PDF and process with OCR
    await test.step('Upload PDF for OCR processing', async () => {
      await page.goto('/forms/import');
      
      // Take screenshot of import page
      await page.screenshot({ path: 'screenshots/03-pdf-import-page.png' });
      
      // Upload test PDF
      const fileInput = await page.locator('input[type="file"]');
      const testPdfPath = path.join(__dirname, '../fixtures/wedding-contract.pdf');
      await fileInput.setInputFiles(testPdfPath);
      
      // Wait for upload and processing
      await expect(page.locator('text=Processing PDF...')).toBeVisible();
      await expect(page.locator('text=PDF processed successfully')).toBeVisible({ timeout: 30000 });
      
      // Take screenshot of processed PDF
      await page.screenshot({ path: 'screenshots/04-pdf-processed.png' });
      
      // Verify extracted fields are displayed
      await expect(page.locator('text=Extracted Fields')).toBeVisible();
      await expect(page.locator('[data-testid="field-name"]')).toHaveCount({ minimum: 1 });
    });

    // Step 3: Edit and customize the generated form
    await test.step('Edit generated form', async () => {
      // Click to edit form
      await page.click('button:has-text("Edit Form")');
      
      // Wait for form builder to load
      await page.waitForSelector('[data-testid="form-builder"]');
      
      // Take screenshot of form builder
      await page.screenshot({ path: 'screenshots/05-form-builder.png' });
      
      // Edit form title
      await page.fill('input[name="formTitle"]', 'Wedding Photography Booking Form');
      
      // Add a new field
      await page.click('button:has-text("Add Field")');
      await page.selectOption('select[name="fieldType"]', 'date');
      await page.fill('input[name="fieldLabel"]', 'Wedding Date');
      await page.check('input[name="required"]');
      
      // Save form
      await page.click('button:has-text("Save Form")');
      
      // Wait for save confirmation
      await expect(page.locator('text=Form saved successfully')).toBeVisible();
      
      // Take screenshot of saved form
      await page.screenshot({ path: 'screenshots/06-form-saved.png' });
    });

    // Step 4: Preview and publish the form
    await test.step('Preview and publish form', async () => {
      // Click preview button
      await page.click('button:has-text("Preview")');
      
      // Wait for preview modal
      await page.waitForSelector('[data-testid="form-preview"]');
      
      // Take screenshot of preview
      await page.screenshot({ path: 'screenshots/07-form-preview.png' });
      
      // Close preview
      await page.click('button[aria-label="Close preview"]');
      
      // Publish form
      await page.click('button:has-text("Publish")');
      
      // Confirm publish
      await page.click('button:has-text("Confirm Publish")');
      
      // Get shareable link
      const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
      expect(shareLink).toContain('/forms/submit/');
      
      // Take screenshot of published form
      await page.screenshot({ path: 'screenshots/08-form-published.png' });
    });

    // Step 5: Submit form as a client
    await test.step('Submit form as client', async () => {
      // Open form in new incognito context
      const context = await page.context().browser()?.newContext();
      if (!context) throw new Error('Failed to create new context');
      
      const clientPage = await context.newPage();
      const shareLink = await page.locator('[data-testid="share-link"]').inputValue();
      
      await clientPage.goto(shareLink);
      
      // Take screenshot of public form
      await clientPage.screenshot({ path: 'screenshots/09-public-form.png' });
      
      // Fill out form
      await clientPage.fill('input[name="name"]', 'John Doe');
      await clientPage.fill('input[name="email"]', 'john@example.com');
      await clientPage.fill('input[name="phone"]', '+1234567890');
      await clientPage.fill('input[name="weddingDate"]', '2025-12-25');
      await clientPage.fill('textarea[name="message"]', 'Looking forward to working with you!');
      
      // Submit form
      await clientPage.click('button[type="submit"]');
      
      // Wait for success message
      await expect(clientPage.locator('text=Thank you for your submission')).toBeVisible();
      
      // Take screenshot of submission confirmation
      await clientPage.screenshot({ path: 'screenshots/10-submission-confirmed.png' });
      
      await clientPage.close();
      await context.close();
    });

    // Step 6: View submission in dashboard
    await test.step('View submission in vendor dashboard', async () => {
      await page.goto('/dashboard/forms/submissions');
      
      // Wait for submissions to load
      await page.waitForSelector('[data-testid="submission-list"]');
      
      // Verify new submission appears
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=john@example.com')).toBeVisible();
      
      // Take screenshot of submissions
      await page.screenshot({ path: 'screenshots/11-submissions-list.png' });
      
      // Click to view submission details
      await page.click('[data-testid="submission-row"]:has-text("John Doe")');
      
      // Take screenshot of submission details
      await page.screenshot({ path: 'screenshots/12-submission-details.png' });
    });

    // Step 7: Upgrade to Pro plan
    await test.step('Upgrade to Pro subscription', async () => {
      await page.goto('/pricing');
      
      // Take screenshot of pricing page
      await page.screenshot({ path: 'screenshots/13-pricing-page.png' });
      
      // Click Pro plan
      await page.click('[data-testid="plan-pro"] button:has-text("Choose Pro")');
      
      // Wait for Stripe checkout to load
      await page.waitForSelector('iframe[name*="stripe"]', { timeout: 10000 });
      
      // Fill in test card details in Stripe iframe
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
      await stripeFrame.locator('[placeholder="CVC"]').fill('123');
      await stripeFrame.locator('[placeholder="ZIP"]').fill('12345');
      
      // Submit payment
      await page.click('button:has-text("Subscribe")');
      
      // Wait for payment confirmation
      await page.waitForURL('**/dashboard?payment=success', { timeout: 20000 });
      
      // Verify Pro features are unlocked
      await expect(page.locator('text=Pro Plan Active')).toBeVisible();
      
      // Take screenshot of Pro dashboard
      await page.screenshot({ path: 'screenshots/14-pro-plan-active.png' });
    });

    // Step 8: Verify Pro features
    await test.step('Verify Pro features unlocked', async () => {
      await page.goto('/dashboard');
      
      // Check increased limits
      await expect(page.locator('text=Unlimited Forms')).toBeVisible();
      await expect(page.locator('text=Unlimited Submissions')).toBeVisible();
      
      // Check advanced features
      await page.goto('/forms/new');
      await expect(page.locator('[data-testid="advanced-features"]')).toBeVisible();
      
      // Take screenshot of Pro features
      await page.screenshot({ path: 'screenshots/15-pro-features.png' });
    });
  });

  test('PDF import creates form automatically with field mapping', async () => {
    // Quick test for PDF → Form creation
    await page.goto('/forms/import');
    
    // Upload PDF
    const fileInput = await page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, '../fixtures/guest-list.pdf');
    await fileInput.setInputFiles(testPdfPath);
    
    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Form created successfully')).toBeVisible({ timeout: 10000 });
    
    // Verify fields were mapped correctly
    const fields = await page.locator('[data-testid="form-field"]').all();
    expect(fields.length).toBeGreaterThan(0);
    
    // Take visual regression screenshot
    await page.screenshot({ 
      path: 'screenshots/pdf-form-mapping.png',
      fullPage: true 
    });
  });

  test('Form submission triggers email notification', async () => {
    // This test verifies email integration
    await page.goto('/forms/demo');
    
    // Fill and submit form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');
    
    // Check for email confirmation message
    await expect(page.locator('text=Email notification sent')).toBeVisible();
    
    // Verify in email logs (would check actual email in production)
    await page.goto('/dashboard/settings/email-logs');
    await expect(page.locator('text=test@example.com')).toBeVisible();
    await expect(page.locator('text=Sent')).toBeVisible();
  });

  test('Performance: Page loads under 1 second', async () => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000);
    
    // Test dashboard load time
    const dashboardStart = Date.now();
    await page.goto('/dashboard');
    const dashboardLoadTime = Date.now() - dashboardStart;
    
    expect(dashboardLoadTime).toBeLessThan(1000);
  });

  test('Mobile responsiveness', async ({ browser }) => {
    // Test on mobile viewport
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('/');
    
    // Check mobile menu
    await expect(mobilePage.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Take mobile screenshots
    await mobilePage.screenshot({ path: 'screenshots/mobile-home.png' });
    
    await mobilePage.goto('/forms/new');
    await mobilePage.screenshot({ path: 'screenshots/mobile-form-builder.png' });
    
    await mobilePage.close();
    await mobileContext.close();
  });

  test('Accessibility compliance', async () => {
    // Install axe-core for accessibility testing
    await page.goto('/');
    
    // Inject axe-core
    await page.addScriptTag({ 
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' 
    });
    
    // Run accessibility checks
    const violations = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        window.axe.run((err, results) => {
          if (err) throw err;
          resolve(results.violations);
        });
      });
    });
    
    // Check for critical violations
    expect(violations).toHaveLength(0);
  });
});

test.describe('Visual Regression Tests', () => {
  test('Homepage visual consistency', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', { 
      maxDiffPixels: 100,
      fullPage: true 
    });
  });

  test('Dashboard visual consistency', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'demo@example.com');
    await page.fill('input[name="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveScreenshot('dashboard.png', { 
      maxDiffPixels: 100,
      fullPage: true 
    });
  });

  test('Form builder visual consistency', async ({ page }) => {
    await page.goto('/forms/builder-demo');
    await expect(page).toHaveScreenshot('form-builder.png', { 
      maxDiffPixels: 100,
      fullPage: true 
    });
  });

  test('Dark mode visual consistency', async ({ page }) => {
    await page.goto('/');
    
    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]');
    
    await expect(page).toHaveScreenshot('homepage-dark.png', { 
      maxDiffPixels: 100,
      fullPage: true 
    });
  });
});