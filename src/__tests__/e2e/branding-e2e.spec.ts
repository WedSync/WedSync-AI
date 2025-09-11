/**
 * End-to-End Tests for Branding Customization Workflows
 *
 * Tests cover:
 * - Complete branding customization user workflows
 * - File upload and brand preview testing
 * - Mobile device branding interface testing
 * - Cross-browser branding display compatibility
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const testBrand = {
  name: 'E2E Test Brand',
  primaryColor: '#FF5733',
  secondaryColor: '#33FF57',
  accentColor: '#3357FF',
  fontFamily: 'Roboto',
  customCss: '.e2e-test { color: #FF5733; }',
  brandGuidelines: 'This is an E2E test brand for automated testing',
};

const testUser = {
  email: 'test@wedsync.com',
  password: 'testpassword123',
};

// Test utilities
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

async function navigateToBranding(page: Page) {
  await page.goto('/dashboard/branding');
  await page.waitForLoadState('networkidle');
}

async function fillBrandForm(page: Page, brand = testBrand) {
  // Fill brand name
  const nameInput = page.locator('[data-testid="brand-name-input"]');
  await nameInput.clear();
  await nameInput.fill(brand.name);

  // Set primary color
  const primaryColorInput = page.locator('[data-testid="primary-color-input"]');
  await primaryColorInput.clear();
  await primaryColorInput.fill(brand.primaryColor);

  // Set secondary color
  const secondaryColorInput = page.locator(
    '[data-testid="secondary-color-input"]',
  );
  await secondaryColorInput.clear();
  await secondaryColorInput.fill(brand.secondaryColor);

  // Set accent color
  const accentColorInput = page.locator('[data-testid="accent-color-input"]');
  await accentColorInput.clear();
  await accentColorInput.fill(brand.accentColor);

  // Select font family
  await page.selectOption(
    '[data-testid="font-family-select"]',
    brand.fontFamily,
  );

  // Add custom CSS
  if (brand.customCss) {
    await page.fill('[data-testid="custom-css-textarea"]', brand.customCss);
  }

  // Add brand guidelines
  if (brand.brandGuidelines) {
    await page.fill(
      '[data-testid="brand-guidelines-textarea"]',
      brand.brandGuidelines,
    );
  }
}

test.describe('Branding Customization E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login user and navigate to branding page
    await loginUser(page);
    await navigateToBranding(page);
  });

  test.describe('Complete Branding Customization Workflows', () => {
    test('creates a new brand with full customization', async ({ page }) => {
      // Check if we're on the branding page
      await expect(
        page.locator('[data-testid="branding-customizer"]'),
      ).toBeVisible();

      // Fill the brand form
      await fillBrandForm(page);

      // Verify live preview updates
      const previewTitle = page.locator('[data-testid="brand-preview-title"]');
      await expect(previewTitle).toContainText(testBrand.name);

      // Verify color preview updates
      const primaryColorPreview = page.locator(
        '[data-testid="primary-color-preview"]',
      );
      await expect(primaryColorPreview).toHaveCSS(
        'background-color',
        'rgb(255, 87, 51)',
      ); // #FF5733

      // Submit the form
      await page.click('[data-testid="save-brand-button"]');

      // Wait for success feedback
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible(
        {
          timeout: 10000,
        },
      );

      // Verify brand was created by checking if it appears in the brand list
      await page.reload();
      await expect(page.locator(`text=${testBrand.name}`)).toBeVisible();
    });

    test('updates an existing brand', async ({ page }) => {
      // First create a brand (assuming one exists or create one)
      await fillBrandForm(page);
      await page.click('[data-testid="save-brand-button"]');
      await page.waitForSelector('[data-testid="success-message"]');

      // Now update it
      const updatedName = 'Updated E2E Brand';
      const nameInput = page.locator('[data-testid="brand-name-input"]');
      await nameInput.clear();
      await nameInput.fill(updatedName);

      // Change primary color
      const primaryColorInput = page.locator(
        '[data-testid="primary-color-input"]',
      );
      await primaryColorInput.clear();
      await primaryColorInput.fill('#00FF00');

      // Submit update
      await page.click('[data-testid="save-brand-button"]');

      // Verify update success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible(
        {
          timeout: 10000,
        },
      );

      // Verify preview reflects changes
      const previewTitle = page.locator('[data-testid="brand-preview-title"]');
      await expect(previewTitle).toContainText(updatedName);
    });

    test('validates required fields and shows errors', async ({ page }) => {
      // Try to submit without required fields
      await page.click('[data-testid="save-brand-button"]');

      // Verify validation errors appear
      await expect(page.locator('[data-testid="name-error"]')).toContainText(
        'Brand name is required',
      );

      // Fix the error and verify it disappears
      await page.fill('[data-testid="brand-name-input"]', 'Test Brand');
      await expect(
        page.locator('[data-testid="name-error"]'),
      ).not.toBeVisible();
    });

    test('validates color format and shows appropriate errors', async ({
      page,
    }) => {
      // Fill name first
      await page.fill('[data-testid="brand-name-input"]', 'Test Brand');

      // Enter invalid color
      const primaryColorInput = page.locator(
        '[data-testid="primary-color-input"]',
      );
      await primaryColorInput.clear();
      await primaryColorInput.fill('invalid-color');

      // Submit form
      await page.click('[data-testid="save-brand-button"]');

      // Verify color validation error
      await expect(
        page.locator('[data-testid="primary-color-error"]'),
      ).toContainText('Invalid hex color format');

      // Fix the color
      await primaryColorInput.clear();
      await primaryColorInput.fill('#FF5733');

      // Verify error disappears
      await expect(
        page.locator('[data-testid="primary-color-error"]'),
      ).not.toBeVisible();
    });
  });

  test.describe('File Upload and Brand Preview Testing', () => {
    test('uploads brand logo successfully', async ({ page }) => {
      // Fill basic brand info first
      await fillBrandForm(page);

      // Prepare a test image file
      const fileInput = page.locator('[data-testid="logo-file-input"]');

      // Create a test image (using a 1x1 PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x37, 0x6e, 0xf9, 0x24, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      // Upload the file
      await fileInput.setInputFiles({
        name: 'test-logo.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      });

      // Wait for upload to complete
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
        timeout: 15000,
      });

      // Verify logo appears in preview
      const logoPreview = page.locator('[data-testid="logo-preview"]');
      await expect(logoPreview).toBeVisible();
    });

    test('validates file upload constraints', async ({ page }) => {
      const fileInput = page.locator('[data-testid="logo-file-input"]');

      // Test file size validation (simulate large file)
      const largeFileBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      await fileInput.setInputFiles({
        name: 'large-file.png',
        mimeType: 'image/png',
        buffer: largeFileBuffer,
      });

      // Verify size error appears
      await expect(
        page.locator('[data-testid="file-size-error"]'),
      ).toContainText('File size must be less than 5MB');
    });

    test('shows real-time brand preview updates', async ({ page }) => {
      // Test live preview updates as user types
      const nameInput = page.locator('[data-testid="brand-name-input"]');
      const previewTitle = page.locator('[data-testid="brand-preview-title"]');

      // Type name character by character and verify preview updates
      await nameInput.clear();
      await nameInput.type('Live Preview Test', { delay: 100 });

      await expect(previewTitle).toContainText('Live Preview Test');

      // Test color preview updates
      const primaryColorInput = page.locator(
        '[data-testid="primary-color-input"]',
      );
      const primaryButton = page.locator(
        '[data-testid="preview-primary-button"]',
      );

      await primaryColorInput.clear();
      await primaryColorInput.fill('#FF0000');

      await expect(primaryButton).toHaveCSS(
        'background-color',
        'rgb(255, 0, 0)',
      );
    });

    test('displays color palette preview correctly', async ({ page }) => {
      // Set all colors
      await page.fill('[data-testid="primary-color-input"]', '#FF5733');
      await page.fill('[data-testid="secondary-color-input"]', '#33FF57');
      await page.fill('[data-testid="accent-color-input"]', '#3357FF');

      // Verify color palette preview
      const primarySwatch = page.locator(
        '[data-testid="primary-color-swatch"]',
      );
      const secondarySwatch = page.locator(
        '[data-testid="secondary-color-swatch"]',
      );
      const accentSwatch = page.locator('[data-testid="accent-color-swatch"]');

      await expect(primarySwatch).toHaveCSS(
        'background-color',
        'rgb(255, 87, 51)',
      );
      await expect(secondarySwatch).toHaveCSS(
        'background-color',
        'rgb(51, 255, 87)',
      );
      await expect(accentSwatch).toHaveCSS(
        'background-color',
        'rgb(51, 87, 255)',
      );
    });
  });

  test.describe('Mobile Device Branding Interface Testing', () => {
    test('renders mobile-optimized branding interface', async ({
      page,
      browserName,
    }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify mobile layout
      const brandingCustomizer = page.locator(
        '[data-testid="branding-customizer"]',
      );
      await expect(brandingCustomizer).toBeVisible();

      // Check that form elements are properly sized for mobile
      const nameInput = page.locator('[data-testid="brand-name-input"]');
      const inputBox = await nameInput.boundingBox();

      // Verify input is not too wide for mobile screen
      expect(inputBox?.width).toBeLessThanOrEqual(375);

      // Test mobile-friendly color picker
      const colorPicker = page.locator('[data-testid="primary-color-picker"]');
      await colorPicker.click();

      // Verify color picker works on mobile
      await expect(colorPicker).toBeVisible();
    });

    test('handles touch interactions properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const colorInput = page.locator('[data-testid="primary-color-input"]');

      // Simulate touch interaction
      await colorInput.tap();
      await colorInput.clear();
      await colorInput.type('#FF5733');

      // Verify the value was set correctly
      await expect(colorInput).toHaveValue('#FF5733');

      // Test mobile file upload
      const uploadButton = page.locator('[data-testid="upload-logo-button"]');
      await uploadButton.tap();

      // Verify upload interface opens
      const fileInput = page.locator('[data-testid="logo-file-input"]');
      await expect(fileInput).toBeVisible();
    });

    test('scrolls properly on mobile with long forms', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Fill form to ensure content extends beyond viewport
      await fillBrandForm(page);

      // Scroll to bottom of form
      const submitButton = page.locator('[data-testid="save-brand-button"]');
      await submitButton.scrollIntoViewIfNeeded();

      // Verify button is visible after scroll
      await expect(submitButton).toBeVisible();

      // Scroll back to top
      const titleElement = page.locator('h2:has-text("Brand Customization")');
      await titleElement.scrollIntoViewIfNeeded();

      await expect(titleElement).toBeVisible();
    });
  });

  test.describe('Cross-browser Branding Display Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach((browserType) => {
      test(`renders correctly in ${browserType}`, async ({ page }) => {
        // Fill form with test data
        await fillBrandForm(page);

        // Verify core elements render correctly
        const brandingCustomizer = page.locator(
          '[data-testid="branding-customizer"]',
        );
        await expect(brandingCustomizer).toBeVisible();

        const previewSection = page.locator('[data-testid="brand-preview"]');
        await expect(previewSection).toBeVisible();

        // Test color input rendering
        const primaryColorInput = page.locator(
          '[data-testid="primary-color-input"]',
        );
        await expect(primaryColorInput).toHaveValue(testBrand.primaryColor);

        // Test CSS custom properties work across browsers
        const previewTitle = page.locator(
          '[data-testid="brand-preview-title"]',
        );
        const styles = await previewTitle.evaluate((el) => {
          const computedStyle = window.getComputedStyle(el);
          return {
            fontFamily: computedStyle.fontFamily,
            color: computedStyle.color,
          };
        });

        // Verify styles are applied correctly
        expect(styles.fontFamily).toContain('Roboto');
      });
    });

    test('handles CSS custom properties consistently across browsers', async ({
      page,
      browserName,
    }) => {
      await fillBrandForm(page);

      // Add custom CSS that uses CSS custom properties
      await page.fill(
        '[data-testid="custom-css-textarea"]',
        `
        .brand-preview {
          --brand-primary: ${testBrand.primaryColor};
          --brand-secondary: ${testBrand.secondaryColor};
          color: var(--brand-primary);
          border-color: var(--brand-secondary);
        }
      `,
      );

      // Verify CSS custom properties work
      const previewElement = page.locator('[data-testid="brand-preview"]');

      // Check computed styles
      const computedColor = await previewElement.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Should have the primary color applied
      expect(computedColor).toBe('rgb(255, 87, 51)'); // #FF5733 in rgb
    });

    test('file uploads work consistently across browsers', async ({
      page,
      browserName,
    }) => {
      const fileInput = page.locator('[data-testid="logo-file-input"]');

      // Create a simple test image
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x37, 0x6e, 0xf9, 0x24, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      await fileInput.setInputFiles({
        name: 'cross-browser-test.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      });

      // Verify upload works in current browser
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
        timeout: 15000,
      });

      // Verify preview shows uploaded image
      const logoPreview = page.locator('[data-testid="logo-preview"]');
      await expect(logoPreview).toBeVisible();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('meets accessibility standards', async ({ page }) => {
      // Fill form to ensure all elements are present
      await fillBrandForm(page);

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      const nameInput = page.locator('[data-testid="brand-name-input"]');
      await expect(nameInput).toBeFocused();

      // Continue tabbing through form elements
      await page.keyboard.press('Tab');
      const primaryColorInput = page.locator(
        '[data-testid="primary-color-input"]',
      );
      await expect(primaryColorInput).toBeFocused();

      // Test screen reader labels
      const nameLabel = page.locator('label[for="brand-name"]');
      await expect(nameLabel).toContainText('Brand Name');

      // Test ARIA attributes
      const submitButton = page.locator('[data-testid="save-brand-button"]');
      const ariaLabel = await submitButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('loads within acceptable performance thresholds', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now();
      await navigateToBranding(page);
      const loadTime = Date.now() - startTime;

      // Verify page loads within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Measure form interaction responsiveness
      const interactionStart = Date.now();
      await page.fill('[data-testid="brand-name-input"]', 'Performance Test');
      const interactionTime = Date.now() - interactionStart;

      // Verify form interactions are responsive (< 100ms)
      expect(interactionTime).toBeLessThan(100);
    });

    test('handles large preview updates efficiently', async ({ page }) => {
      // Fill form with complex data
      await fillBrandForm(page);
      await page.fill(
        '[data-testid="custom-css-textarea"]',
        `
        /* Complex CSS with many rules */
        .brand-preview { background: linear-gradient(45deg, #FF5733, #33FF57); }
        .brand-header { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .brand-button { transition: all 0.3s ease; }
        .brand-card { border-radius: 8px; padding: 16px; margin: 8px; }
      `,
      );

      // Measure preview update performance
      const updateStart = Date.now();
      await page.fill('[data-testid="primary-color-input"]', '#00FF00');

      // Wait for preview to update
      const previewButton = page.locator(
        '[data-testid="preview-primary-button"]',
      );
      await expect(previewButton).toHaveCSS(
        'background-color',
        'rgb(0, 255, 0)',
      );

      const updateTime = Date.now() - updateStart;

      // Verify preview updates efficiently (< 500ms)
      expect(updateTime).toBeLessThan(500);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Fill form
      await fillBrandForm(page);

      // Simulate network failure
      await page.route('/api/branding', (route) => route.abort());

      // Submit form
      await page.click('[data-testid="save-brand-button"]');

      // Verify error message appears
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Failed to save brand',
      );

      // Verify form data is preserved
      const nameInput = page.locator('[data-testid="brand-name-input"]');
      await expect(nameInput).toHaveValue(testBrand.name);
    });

    test('recovers from interrupted workflows', async ({ page }) => {
      // Start filling form
      await page.fill('[data-testid="brand-name-input"]', 'Interrupted Brand');
      await page.fill('[data-testid="primary-color-input"]', '#FF5733');

      // Simulate page refresh/interruption
      await page.reload();

      // Verify we can continue the workflow
      const nameInput = page.locator('[data-testid="brand-name-input"]');
      await nameInput.fill('Recovered Brand');

      await page.click('[data-testid="save-brand-button"]');

      // Should be able to complete successfully
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible(
        {
          timeout: 10000,
        },
      );
    });

    test('validates extreme input values', async ({ page }) => {
      // Test very long brand name
      const longName = 'A'.repeat(1000);
      await page.fill('[data-testid="brand-name-input"]', longName);

      await page.click('[data-testid="save-brand-button"]');

      // Should show appropriate validation error
      await expect(page.locator('[data-testid="name-error"]')).toContainText(
        'Brand name is too long',
      );

      // Test edge case colors
      await page.fill('[data-testid="primary-color-input"]', '#000000');
      await page.fill('[data-testid="secondary-color-input"]', '#FFFFFF');

      // Should accept valid edge case colors
      const primaryInput = page.locator('[data-testid="primary-color-input"]');
      await expect(primaryInput).toHaveValue('#000000');
    });
  });
});
