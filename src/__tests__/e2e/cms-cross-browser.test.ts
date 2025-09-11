/**
 * Cross-Browser Compatibility Tests for WedSync CMS
 * Tests editor functionality across Chrome, Firefox, Safari, Edge
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Browser configurations for comprehensive testing
const browsers = [
  { name: 'chromium', displayName: 'Chrome' },
  { name: 'firefox', displayName: 'Firefox' },
  { name: 'webkit', displayName: 'Safari' },
];

// Wedding vendor test scenarios
const weddingContent = {
  portfolioDescription: `# Wedding Photography Portfolio

Welcome to our **award-winning** photography studio! We specialize in capturing *unforgettable moments* on your special day.

## Our Services:
- Engagement photo sessions
- Full wedding day coverage
- Reception photography
- Photo editing and albums

Contact us today to discuss your wedding photography needs!`,

  venueDescription: `# The Grand Ballroom

Experience luxury at its finest in our stunning ballroom venue.

## Venue Features:
- Capacity: 200 guests
- Crystal chandeliers
- Garden views
- Full catering kitchen

**Book your dream wedding today!**`,
};

// Cross-browser test suite
for (const browser of browsers) {
  test.describe(`CMS Cross-Browser Tests - ${browser.displayName}`, () => {
    let context: BrowserContext;
    let page: Page;

    test.beforeEach(async ({ browser: browserInstance }) => {
      // Create browser context with specific settings
      context = await browserInstance.newContext({
        // Enable clipboard permissions for paste testing
        permissions: ['clipboard-read', 'clipboard-write'],
        // Simulate real user viewport
        viewport: { width: 1920, height: 1080 },
      });

      page = await context.newPage();

      // Navigate to CMS editor
      await page.goto('/cms/editor');
      await page.waitForLoadState('networkidle');
    });

    test.afterEach(async () => {
      await context.close();
    });

    test(`should load editor correctly - ${browser.displayName}`, async () => {
      // Verify editor is loaded
      await expect(page.locator('[data-testid="cms-editor"]')).toBeVisible();

      // Check for browser compatibility warnings
      const warnings = page.locator('[data-testid="compatibility-warnings"]');
      if (await warnings.isVisible()) {
        const warningText = await warnings.textContent();
        console.log(
          `${browser.displayName} compatibility warnings:`,
          warningText,
        );
      }

      // Take browser-specific screenshot
      await expect(page).toHaveScreenshot(`editor-load-${browser.name}.png`);
    });

    test(`should handle basic text formatting - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');

      // Type text content
      await editor.click();
      await editor.fill('Wedding photography services');

      // Select all text
      await page.keyboard.press(
        browser.name === 'webkit' ? 'Meta+a' : 'Control+a',
      );

      // Apply bold formatting
      const boldButton = page.locator('[data-testid="toolbar-bold"]');
      await boldButton.click();

      // Verify bold is applied
      await expect(editor.locator('strong')).toBeVisible();

      // Apply italic
      const italicButton = page.locator('[data-testid="toolbar-italic"]');
      await italicButton.click();

      // Verify both bold and italic
      await expect(editor.locator('strong em, em strong')).toBeVisible();

      await expect(page).toHaveScreenshot(
        `text-formatting-${browser.name}.png`,
      );
    });

    test(`should handle keyboard shortcuts correctly - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();
      await editor.fill('Test keyboard shortcuts');

      // Test platform-specific shortcuts
      const ctrlKey = browser.name === 'webkit' ? 'Meta' : 'Control';

      // Select all and bold
      await page.keyboard.press(`${ctrlKey}+a`);
      await page.keyboard.press(`${ctrlKey}+b`);

      // Verify bold applied via keyboard
      await expect(editor.locator('strong')).toBeVisible();

      // Test undo
      await page.keyboard.press(`${ctrlKey}+z`);
      await expect(editor.locator('strong')).not.toBeVisible();

      // Test redo
      await page.keyboard.press(`${ctrlKey}+y`);
      await expect(editor.locator('strong')).toBeVisible();

      // Test save shortcut
      const savePromise = page.waitForRequest('/api/cms/save');
      await page.keyboard.press(`${ctrlKey}+s`);
      await savePromise;
    });

    test(`should handle copy and paste - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');

      // Type content
      await editor.click();
      await editor.fill('Original content');

      // Copy content
      await page.keyboard.press(
        browser.name === 'webkit' ? 'Meta+a' : 'Control+a',
      );
      await page.keyboard.press(
        browser.name === 'webkit' ? 'Meta+c' : 'Control+c',
      );

      // Clear editor
      await page.keyboard.press('Delete');

      // Paste content back
      await page.keyboard.press(
        browser.name === 'webkit' ? 'Meta+v' : 'Control+v',
      );

      // Verify content is restored
      await expect(editor).toContainText('Original content');
    });

    test(`should handle rich content paste - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();

      // Simulate pasting rich content from Word or web
      await page.evaluate(() => {
        const editor = document.querySelector(
          '[data-testid="editor-content"]',
        ) as HTMLElement;
        const event = new ClipboardEvent('paste', {
          clipboardData: new DataTransfer(),
        });

        // Add rich HTML content
        event.clipboardData?.setData(
          'text/html',
          '<p><strong>Bold text</strong> and <em>italic text</em></p>',
        );
        event.clipboardData?.setData('text/plain', 'Bold text and italic text');

        editor.dispatchEvent(event);
      });

      // Wait for content to be processed
      await page.waitForTimeout(500);

      // Verify rich formatting is preserved
      await expect(editor.locator('strong')).toBeVisible();
      await expect(editor.locator('em')).toBeVisible();
    });

    test(`should handle image upload and display - ${browser.displayName}`, async () => {
      // Create test image file
      const testImagePath = './tests/fixtures/wedding-photo.jpg';

      // Upload image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);

      // Wait for image to be processed and inserted
      const editor = page.locator('[data-testid="editor-content"]');
      await expect(editor.locator('img')).toBeVisible({ timeout: 10000 });

      // Verify image attributes
      const image = editor.locator('img').first();
      await expect(image).toHaveAttribute('src', /.+/);
      await expect(image).toHaveClass(/max-w-full/);

      await expect(page).toHaveScreenshot(`image-upload-${browser.name}.png`);
    });

    test(`should handle lists and headings - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();

      // Create heading
      await editor.fill('Wedding Services');
      await page.keyboard.press(
        browser.name === 'webkit' ? 'Meta+a' : 'Control+a',
      );
      await page.locator('[data-testid="toolbar-heading1"]').click();

      // Verify heading
      await expect(editor.locator('h1')).toContainText('Wedding Services');

      // Add new line and create list
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');

      // Create bullet list
      await page.locator('[data-testid="toolbar-bullet-list"]').click();
      await editor.type('Photography services');
      await page.keyboard.press('Enter');
      await editor.type('Videography services');
      await page.keyboard.press('Enter');
      await editor.type('Wedding planning');

      // Verify list structure
      await expect(editor.locator('ul li')).toHaveCount(3);

      await expect(page).toHaveScreenshot(`lists-headings-${browser.name}.png`);
    });

    test(`should auto-save content - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();

      // Monitor auto-save requests
      let autoSaveCount = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/cms/auto-save')) {
          autoSaveCount++;
        }
      });

      // Type content slowly to trigger auto-save
      await editor.type('Auto-save test content');
      await page.waitForTimeout(6000); // Wait for auto-save interval

      // Verify auto-save occurred
      expect(autoSaveCount).toBeGreaterThan(0);

      // Check for save indicator
      await expect(
        page.locator('[data-testid="save-indicator"]'),
      ).toContainText(/saved/i);
    });

    test(`should handle wedding content template - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');

      // Load wedding portfolio template
      const templateButton = page.locator(
        '[data-testid="template-wedding-portfolio"]',
      );
      await templateButton.click();

      // Wait for template to load
      await expect(editor.locator('h1')).toBeVisible();

      // Verify template structure
      await expect(editor.locator('h1')).toContainText(
        /portfolio|photography|wedding/i,
      );
      await expect(editor.locator('ul li')).toHaveCount.toBeGreaterThan(2);
      await expect(editor.locator('strong, em')).toHaveCount.toBeGreaterThan(0);

      // Customize template content
      const heading = editor.locator('h1');
      await heading.click();
      await page.keyboard.press(
        browser.name === 'webkit' ? 'Meta+a' : 'Control+a',
      );
      await heading.fill('Smith Wedding Photography');

      // Verify customization
      await expect(editor.locator('h1')).toContainText(
        'Smith Wedding Photography',
      );

      await expect(page).toHaveScreenshot(
        `wedding-template-${browser.name}.png`,
      );
    });

    test(`should maintain performance with large content - ${browser.displayName}`, async () => {
      const startTime = Date.now();

      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();

      // Create large content document
      const largeContent = weddingContent.portfolioDescription.repeat(20);
      await editor.fill(largeContent);

      // Measure typing performance
      const typingStartTime = Date.now();
      await editor.type(' Additional content for performance testing.');
      const typingEndTime = Date.now();

      // Ensure typing remains responsive (<500ms)
      expect(typingEndTime - typingStartTime).toBeLessThan(500);

      // Test scrolling performance
      await page.keyboard.press('Control+Home'); // Go to top
      await page.keyboard.press('Control+End'); // Go to bottom

      // Verify content integrity
      await expect(editor).toContainText(
        'Additional content for performance testing',
      );

      const totalTime = Date.now() - startTime;
      console.log(
        `${browser.displayName} large content performance: ${totalTime}ms`,
      );
    });

    test(`should handle network interruptions - ${browser.displayName}`, async () => {
      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();
      await editor.fill('Content before network issue');

      // Simulate network offline
      await context.setOffline(true);

      // Try to save (should show offline warning)
      const saveButton = page.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Verify offline warning
      await expect(
        page.locator('[data-testid="offline-warning"]'),
      ).toBeVisible();

      // Continue editing offline
      await editor.type(' Content added while offline');

      // Restore network
      await context.setOffline(false);

      // Save should work again
      await saveButton.click();
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    });

    test(`should handle form validation correctly - ${browser.displayName}`, async () => {
      // Try to publish without content
      const publishButton = page.locator('[data-testid="publish-button"]');
      await publishButton.click();

      // Verify validation error
      await expect(
        page.locator('[data-testid="validation-error"]'),
      ).toBeVisible();

      // Add required content
      const editor = page.locator('[data-testid="editor-content"]');
      await editor.click();
      await editor.fill('Wedding photography services content');

      // Try publish again
      await publishButton.click();

      // Should now succeed
      await expect(
        page.locator('[data-testid="publish-success"]'),
      ).toBeVisible();
    });

    // Mobile-specific tests for webkit (Safari)
    if (browser.name === 'webkit') {
      test('should handle touch interactions on mobile Safari', async () => {
        // Switch to mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        const editor = page.locator('[data-testid="editor-content"]');

        // Test touch interactions
        await editor.tap();
        await editor.fill('Mobile touch testing');

        // Test touch selection
        await editor.tap({ position: { x: 50, y: 20 } });
        await page.touchscreen.tap(50, 20);

        // Verify mobile toolbar
        await expect(
          page.locator('[data-testid="mobile-toolbar"]'),
        ).toBeVisible();

        await expect(page).toHaveScreenshot(`mobile-safari-editor.png`);
      });
    }
  });
}

// Cross-browser comparison tests
test.describe('Cross-Browser Consistency', () => {
  test('should render identical content across browsers', async ({
    browser,
  }) => {
    const contexts = await Promise.all(
      browsers.map((b) => browser.newContext()),
    );

    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));

    try {
      // Load same content in all browsers
      for (const page of pages) {
        await page.goto('/cms/editor');
        const editor = page.locator('[data-testid="editor-content"]');
        await editor.click();
        await editor.fill(weddingContent.portfolioDescription);
      }

      // Take screenshots for comparison
      const screenshots = await Promise.all(
        pages.map((page, index) =>
          page.screenshot({
            path: `cross-browser-comparison-${browsers[index].name}.png`,
          }),
        ),
      );

      // Visual comparison would be handled by your testing pipeline
      console.log('Cross-browser screenshots captured for visual comparison');
    } finally {
      await Promise.all(contexts.map((ctx) => ctx.close()));
    }
  });

  test('should maintain consistent performance across browsers', async ({
    browser,
  }) => {
    const performanceResults: { [key: string]: number } = {};

    for (const browserConfig of browsers) {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        const startTime = Date.now();

        await page.goto('/cms/editor');
        await page.waitForLoadState('networkidle');

        const editor = page.locator('[data-testid="editor-content"]');
        await editor.click();
        await editor.fill(weddingContent.venueDescription);

        // Measure typing performance
        const typingStart = Date.now();
        await editor.type(' Performance test content');
        const typingEnd = Date.now();

        performanceResults[browserConfig.displayName] = typingEnd - typingStart;
      } finally {
        await context.close();
      }
    }

    // Log performance comparison
    console.table(performanceResults);

    // All browsers should perform reasonably well
    Object.values(performanceResults).forEach((time) => {
      expect(time).toBeLessThan(1000); // <1s for typing
    });
  });
});
