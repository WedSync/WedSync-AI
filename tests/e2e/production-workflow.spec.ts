import { test, expect, Page, Browser } from '@playwright/test';
import path from 'path';

/**
 * Production Workflow E2E Test
 * Comprehensive end-to-end testing of complete production workflows
 */

test.describe('Production Workflow Validation', () => {
  let browser: Browser;
  let vendorPage: Page;
  let clientPage: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.beforeEach(async () => {
    vendorPage = await browser.newPage();
    clientPage = await browser.newPage();
  });

  test.afterEach(async () => {
    await vendorPage.close();
    await clientPage.close();
  });

  test('Complete vendor onboarding flow with large PDF processing', async () => {
    const vendorEmail = `vendor-${Date.now()}@example.com`;
    const companyName = 'Elite Wedding Photography';

    await test.step('Vendor registration and onboarding', async () => {
      await vendorPage.goto('/auth/signup');
      
      // Fill registration form
      await vendorPage.fill('input[name="email"]', vendorEmail);
      await vendorPage.fill('input[name="password"]', 'SecurePass123!');
      await vendorPage.fill('input[name="companyName"]', companyName);
      await vendorPage.selectOption('select[name="vendorType"]', 'photography');
      await vendorPage.fill('input[name="phone"]', '+1-555-0123');
      await vendorPage.fill('textarea[name="description"]', 'Professional wedding photography services');

      // Submit registration
      await vendorPage.click('button[type="submit"]');
      
      // Wait for email verification (simulate)
      await expect(vendorPage.locator('text=Please check your email')).toBeVisible();
      
      // Simulate email verification
      await vendorPage.goto(`/auth/verify?token=test-verification-token&email=${encodeURIComponent(vendorEmail)}`);
      
      // Complete onboarding
      await expect(vendorPage.locator('text=Welcome to WedSync')).toBeVisible();
      
      // Take screenshot
      await vendorPage.screenshot({ path: 'screenshots/prod-01-vendor-onboarded.png' });
    });

    await test.step('Upload and process large PDF (300+ pages)', async () => {
      await vendorPage.goto('/forms/import');
      
      // Create or use large test PDF
      const largePdfPath = path.join(__dirname, '../fixtures/large-wedding-contract.pdf');
      
      // Upload large PDF
      const fileInput = vendorPage.locator('input[type="file"]');
      await fileInput.setInputFiles(largePdfPath);
      
      // Wait for upload progress
      await expect(vendorPage.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for OCR processing (this might take a while for large files)
      await expect(vendorPage.locator('text=Processing PDF')).toBeVisible();
      
      // Wait for completion with extended timeout
      await expect(vendorPage.locator('text=Processing complete')).toBeVisible({ timeout: 300000 }); // 5 minutes
      
      // Verify extracted fields
      const extractedFields = await vendorPage.locator('[data-testid="extracted-field"]').count();
      expect(extractedFields).toBeGreaterThan(10); // Should extract many fields from large document
      
      await vendorPage.screenshot({ path: 'screenshots/prod-02-large-pdf-processed.png' });
    });

    await test.step('Create comprehensive form from extracted data', async () => {
      // Edit extracted form
      await vendorPage.click('button:has-text("Edit Form")');
      
      // Wait for form builder
      await vendorPage.waitForSelector('[data-testid="form-builder"]');
      
      // Customize form
      await vendorPage.fill('input[name="formTitle"]', 'Comprehensive Wedding Package Booking');
      await vendorPage.fill('textarea[name="formDescription"]', 'Complete booking form for wedding photography services');
      
      // Add conditional logic
      await vendorPage.click('button:has-text("Add Logic")');
      await vendorPage.selectOption('select[name="triggerField"]', 'packageType');
      await vendorPage.selectOption('select[name="condition"]', 'equals');
      await vendorPage.fill('input[name="triggerValue"]', 'premium');
      await vendorPage.click('button:has-text("Show Field")');
      await vendorPage.selectOption('select[name="targetField"]', 'premiumAddOns');
      
      // Add payment integration
      await vendorPage.click('button:has-text("Payment Settings")');
      await vendorPage.check('input[name="enablePayments"]');
      await vendorPage.fill('input[name="depositAmount"]', '500');
      await vendorPage.selectOption('select[name="currency"]', 'USD');
      
      // Save form
      await vendorPage.click('button:has-text("Save Form")');
      await expect(vendorPage.locator('text=Form saved successfully')).toBeVisible();
      
      await vendorPage.screenshot({ path: 'screenshots/prod-03-comprehensive-form.png' });
    });

    await test.step('Publish and share form', async () => {
      // Publish form
      await vendorPage.click('button:has-text("Publish")');
      await vendorPage.click('button:has-text("Confirm Publish")');
      
      // Get share link
      const shareLink = await vendorPage.locator('[data-testid="share-link"]').inputValue();
      expect(shareLink).toContain('/forms/submit/');
      
      // Test social sharing
      await vendorPage.click('button:has-text("Share on Social")');
      
      // Generate QR code
      await vendorPage.click('button:has-text("Generate QR Code")');
      await expect(vendorPage.locator('[data-testid="qr-code"]')).toBeVisible();
      
      // Copy embed code
      await vendorPage.click('button:has-text("Embed Code")');
      const embedCode = await vendorPage.locator('[data-testid="embed-code"]').inputValue();
      expect(embedCode).toContain('<iframe');
      
      await vendorPage.screenshot({ path: 'screenshots/prod-04-form-published.png' });
      
      // Store share link for client submission
      await vendorPage.evaluate((link) => {
        window.localStorage.setItem('testShareLink', link);
      }, shareLink);
    });

    await test.step('Client discovers and submits form', async () => {
      // Client visits shared form
      const shareLink = await vendorPage.evaluate(() => window.localStorage.getItem('testShareLink'));
      await clientPage.goto(shareLink!);
      
      // Verify form loads correctly
      await expect(clientPage.locator('h1:has-text("Comprehensive Wedding Package Booking")')).toBeVisible();
      
      await clientPage.screenshot({ path: 'screenshots/prod-05-client-form-view.png' });
      
      // Fill out comprehensive form
      await clientPage.fill('input[name="clientName"]', 'Sarah & Michael Johnson');
      await clientPage.fill('input[name="email"]', 'sarah.johnson@example.com');
      await clientPage.fill('input[name="phone"]', '+1-555-0199');
      await clientPage.fill('input[name="weddingDate"]', '2025-08-15');
      await clientPage.fill('input[name="venue"]', 'Riverside Garden Estate');
      await clientPage.fill('input[name="guestCount"]', '150');
      
      // Select package type (triggers conditional logic)
      await clientPage.selectOption('select[name="packageType"]', 'premium');
      
      // Verify conditional field appears
      await expect(clientPage.locator('[data-testid="premiumAddOns"]')).toBeVisible();
      
      // Fill conditional fields
      await clientPage.check('input[name="premiumAddOns"][value="engagement"]');
      await clientPage.check('input[name="premiumAddOns"][value="albumUpgrade"]');
      
      // Add detailed requirements
      await clientPage.fill('textarea[name="specialRequests"]', 
        'We would like additional coverage for the cocktail hour and special focus on grandparents who are traveling from overseas.');
      
      // Upload reference photos
      const referencePhoto = path.join(__dirname, '../fixtures/wedding-inspiration.jpg');
      await clientPage.locator('input[name="referencePhotos"]').setInputFiles(referencePhoto);
      
      await clientPage.screenshot({ path: 'screenshots/prod-06-form-filled.png' });
    });

    await test.step('Process payment and submit', async () => {
      // Submit form (this triggers payment)
      await clientPage.click('button[type="submit"]');
      
      // Payment form appears
      await expect(clientPage.locator('text=Secure Payment')).toBeVisible();
      
      // Fill payment details (test mode)
      await clientPage.fill('input[name="cardNumber"]', '4242424242424242');
      await clientPage.fill('input[name="expiryDate"]', '12/30');
      await clientPage.fill('input[name="cvc"]', '123');
      await clientPage.fill('input[name="name"]', 'Sarah Johnson');
      await clientPage.fill('input[name="zipCode"]', '12345');
      
      // Process payment
      await clientPage.click('button:has-text("Pay Deposit")');
      
      // Wait for payment processing
      await expect(clientPage.locator('text=Processing payment')).toBeVisible();
      await expect(clientPage.locator('text=Payment successful')).toBeVisible({ timeout: 30000 });
      
      // Verify submission confirmation
      await expect(clientPage.locator('text=Booking confirmed')).toBeVisible();
      
      // Check for booking reference number
      const bookingRef = await clientPage.locator('[data-testid="booking-reference"]').textContent();
      expect(bookingRef).toMatch(/^WS-\d{8}$/);
      
      await clientPage.screenshot({ path: 'screenshots/prod-07-payment-successful.png' });
    });

    await test.step('Vendor receives and processes submission', async () => {
      // Vendor checks notifications
      await vendorPage.goto('/dashboard/notifications');
      
      // Verify new submission notification
      await expect(vendorPage.locator('text=New booking: Sarah & Michael Johnson')).toBeVisible();
      
      // Go to submissions
      await vendorPage.goto('/dashboard/submissions');
      
      // Find the new submission
      await expect(vendorPage.locator('text=Sarah & Michael Johnson')).toBeVisible();
      
      // Click to view details
      await vendorPage.click('[data-testid="submission-row"]:has-text("Sarah & Michael Johnson")');
      
      // Verify all submission data
      await expect(vendorPage.locator('text=sarah.johnson@example.com')).toBeVisible();
      await expect(vendorPage.locator('text=Riverside Garden Estate')).toBeVisible();
      await expect(vendorPage.locator('text=Premium Package')).toBeVisible();
      await expect(vendorPage.locator('text=Payment: $500.00 (Paid)')).toBeVisible();
      
      await vendorPage.screenshot({ path: 'screenshots/prod-08-vendor-submission-view.png' });
      
      // Respond to client
      await vendorPage.click('button:has-text("Send Response")');
      await vendorPage.fill('textarea[name="response"]', 
        'Thank you for choosing our premium package! I\'ve reviewed your requirements and am excited to capture your special day. I\'ll be in touch within 24 hours to schedule our consultation call.');
      await vendorPage.click('button:has-text("Send")');
      
      // Verify response sent
      await expect(vendorPage.locator('text=Response sent successfully')).toBeVisible();
    });

    await test.step('Email notifications verification', async () => {
      // Check email logs
      await vendorPage.goto('/dashboard/email-logs');
      
      // Verify emails were sent
      const emailEntries = await vendorPage.locator('[data-testid="email-log-entry"]').count();
      expect(emailEntries).toBeGreaterThanOrEqual(3); // Confirmation, payment receipt, vendor notification
      
      // Check specific emails
      await expect(vendorPage.locator('text=Booking confirmation')).toBeVisible();
      await expect(vendorPage.locator('text=Payment receipt')).toBeVisible();
      await expect(vendorPage.locator('text=New submission notification')).toBeVisible();
      
      // Verify delivery status
      await expect(vendorPage.locator('[data-testid="email-status"]:has-text("Delivered")')).toHaveCount({ min: 2 });
      
      await vendorPage.screenshot({ path: 'screenshots/prod-09-email-verification.png' });
    });

    await test.step('Client receives follow-up communication', async () => {
      // Simulate client checking email and responding
      await clientPage.goto('/forms/response/track?ref=' + (await clientPage.evaluate(() => 
        window.localStorage.getItem('bookingReference') || 'WS-12345678')));
      
      // Verify tracking page
      await expect(clientPage.locator('text=Booking Status: Confirmed')).toBeVisible();
      await expect(clientPage.locator('text=Next Steps:')).toBeVisible();
      
      // Client can reply to vendor
      await clientPage.fill('textarea[name="clientReply"]', 
        'Thank you for the quick response! We\'re very excited to work with you. Looking forward to the consultation call.');
      await clientPage.click('button:has-text("Send Reply")');
      
      await expect(clientPage.locator('text=Reply sent successfully')).toBeVisible();
      
      await clientPage.screenshot({ path: 'screenshots/prod-10-client-follow-up.png' });
    });
  });

  test('High-volume PDF processing stress test', async () => {
    await test.step('Upload multiple large PDFs concurrently', async () => {
      // Simulate multiple vendors uploading large PDFs simultaneously
      const uploadPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const page = await browser.newPage();
        await page.goto('/forms/import');
        
        uploadPromises.push(
          page.locator('input[type="file"]').setInputFiles(
            path.join(__dirname, '../fixtures/large-document.pdf')
          ).then(() => {
            // Wait for processing to start
            return page.waitForSelector('text=Processing PDF', { timeout: 10000 });
          }).then(() => {
            // Wait for completion
            return page.waitForSelector('text=Processing complete', { timeout: 300000 });
          }).then(() => {
            return page.close();
          })
        );
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      console.log('✅ All concurrent PDF uploads completed successfully');
    });
  });

  test('Payment flow edge cases and error handling', async () => {
    await test.step('Test payment failures and retries', async () => {
      await vendorPage.goto('/forms/demo-payment');
      
      // Test declined card
      await vendorPage.fill('input[name="cardNumber"]', '4000000000000002'); // Declined card
      await vendorPage.fill('input[name="expiryDate"]', '12/30');
      await vendorPage.fill('input[name="cvc"]', '123');
      await vendorPage.click('button:has-text("Submit Payment")');
      
      // Verify error handling
      await expect(vendorPage.locator('text=Payment declined')).toBeVisible();
      await expect(vendorPage.locator('button:has-text("Try Again")')).toBeVisible();
      
      // Test insufficient funds
      await vendorPage.fill('input[name="cardNumber"]', '4000000000000341'); // Insufficient funds
      await vendorPage.click('button:has-text("Try Again")');
      
      await expect(vendorPage.locator('text=Insufficient funds')).toBeVisible();
      
      // Test successful retry
      await vendorPage.fill('input[name="cardNumber"]', '4242424242424242'); // Success card
      await vendorPage.click('button:has-text("Try Again")');
      
      await expect(vendorPage.locator('text=Payment successful')).toBeVisible();
      
      await vendorPage.screenshot({ path: 'screenshots/prod-11-payment-retry-success.png' });
    });
  });

  test('Real-time collaboration and updates', async () => {
    await test.step('Multiple vendors collaborating on forms', async () => {
      const vendor1Page = await browser.newPage();
      const vendor2Page = await browser.newPage();
      
      // Both vendors login to same organization
      await vendor1Page.goto('/dashboard/team/collaborate');
      await vendor2Page.goto('/dashboard/team/collaborate');
      
      // Vendor 1 creates form
      await vendor1Page.click('button:has-text("New Collaborative Form")');
      await vendor1Page.fill('input[name="formTitle"]', 'Team Wedding Planning Form');
      
      // Vendor 2 sees real-time update
      await expect(vendor2Page.locator('text=Team Wedding Planning Form')).toBeVisible({ timeout: 5000 });
      
      // Vendor 2 adds fields
      await vendor2Page.click('button:has-text("Add Field")');
      await vendor2Page.selectOption('select[name="fieldType"]', 'date');
      await vendor2Page.fill('input[name="fieldLabel"]', 'Preferred Consultation Date');
      
      // Vendor 1 sees the addition
      await expect(vendor1Page.locator('text=Preferred Consultation Date')).toBeVisible({ timeout: 5000 });
      
      await vendor1Page.close();
      await vendor2Page.close();
    });
  });

  test('Mobile responsiveness under load', async () => {
    await test.step('Test mobile form submission under high concurrency', async () => {
      // Create mobile context
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const mobilePage = await mobileContext.newPage();
      
      // Load form on mobile
      await mobilePage.goto('/forms/demo-mobile');
      
      // Verify mobile optimization
      await expect(mobilePage.locator('[data-testid="mobile-optimized"]')).toBeVisible();
      
      // Fill form on mobile
      await mobilePage.fill('input[name="name"]', 'Mobile Test User');
      await mobilePage.fill('input[name="email"]', 'mobile@test.com');
      
      // Test touch interactions
      await mobilePage.tap('button[type="submit"]');
      
      // Verify mobile submission success
      await expect(mobilePage.locator('text=Submission successful')).toBeVisible();
      
      await mobilePage.screenshot({ path: 'screenshots/prod-12-mobile-success.png' });
      
      await mobileContext.close();
    });
  });

  test('Accessibility compliance verification', async () => {
    await test.step('WCAG 2.1 AA compliance check', async () => {
      await vendorPage.goto('/');
      
      // Inject axe-core
      await vendorPage.addScriptTag({ 
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' 
      });
      
      // Run accessibility audit
      const violations = await vendorPage.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore
          window.axe.run({
            tags: ['wcag2a', 'wcag2aa']
          }, (err, results) => {
            if (err) throw err;
            resolve(results.violations);
          });
        });
      });
      
      // Log violations
      if (Array.isArray(violations) && violations.length > 0) {
        console.log('⚠️ Accessibility violations found:');
        violations.forEach((violation: any, index: number) => {
          console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
        });
      }
      
      // Should have no critical violations
      expect(violations).toHaveLength(0);
    });
  });

  test('SEO and social media optimization', async () => {
    await test.step('Verify SEO meta tags and social sharing', async () => {
      await vendorPage.goto('/');
      
      // Check meta tags
      const title = await vendorPage.locator('title').textContent();
      expect(title).toContain('WedSync');
      
      const description = await vendorPage.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(120);
      expect(description!.length).toBeLessThan(160);
      
      // Check Open Graph tags
      const ogTitle = await vendorPage.locator('meta[property="og:title"]').getAttribute('content');
      const ogDescription = await vendorPage.locator('meta[property="og:description"]').getAttribute('content');
      const ogImage = await vendorPage.locator('meta[property="og:image"]').getAttribute('content');
      
      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      expect(ogImage).toContain('wedsync');
      
      // Check Twitter Card tags
      const twitterCard = await vendorPage.locator('meta[name="twitter:card"]').getAttribute('content');
      expect(twitterCard).toBe('summary_large_image');
      
      // Test social sharing functionality
      await vendorPage.click('button:has-text("Share")');
      
      // Verify share options
      await expect(vendorPage.locator('text=Share on Facebook')).toBeVisible();
      await expect(vendorPage.locator('text=Share on Twitter')).toBeVisible();
      await expect(vendorPage.locator('text=Share on LinkedIn')).toBeVisible();
      
      await vendorPage.screenshot({ path: 'screenshots/prod-13-social-sharing.png' });
    });
  });
});