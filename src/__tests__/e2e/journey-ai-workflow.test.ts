import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_URLS = {
  login: '/login',
  dashboard: '/dashboard',
  journeyBuilder: '/dashboard/journeys',
  journeyEditor: '/dashboard/journeys/builder',
  journeyAnalytics: '/dashboard/journeys/analytics',
};

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// Mock data for consistent testing
const MOCK_VENDOR_DATA = {
  photographer: {
    type: 'photography',
    name: 'Emma Photography',
    email: 'test.photographer@wedsync.test',
    password: 'TestPassword123!',
  },
  venue: {
    type: 'venue',
    name: 'Elegant Manor',
    email: 'test.venue@wedsync.test',
    password: 'TestPassword123!',
  },
};

const MOCK_AI_RESPONSES = {
  journeyGeneration: {
    touchpoints: [
      {
        id: '1',
        title: 'Initial Consultation',
        description: 'Schedule the first meeting to discuss wedding vision',
        timing: 'immediately',
        type: 'email',
        template: 'consultation_invite',
      },
      {
        id: '2',
        title: 'Contract & Booking',
        description: 'Send contract and secure booking with deposit',
        timing: '24_hours',
        type: 'email',
        template: 'contract_booking',
      },
      {
        id: '3',
        title: 'Pre-Wedding Planning',
        description: 'Detailed planning session for wedding day logistics',
        timing: '30_days_before',
        type: 'email',
        template: 'planning_session',
      },
    ],
    estimatedDuration: '90 days',
    conversionRate: '85%',
  },
};

// Test utilities
class JourneyWorkflowHelper {
  constructor(private page: Page) {}

  async loginAsVendor(vendorType: 'photographer' | 'venue' = 'photographer') {
    const vendor = MOCK_VENDOR_DATA[vendorType];

    await this.page.goto(TEST_URLS.login);
    await this.page.fill('[data-testid="email-input"]', vendor.email);
    await this.page.fill('[data-testid="password-input"]', vendor.password);
    await this.page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await this.page.waitForURL(TEST_URLS.dashboard);
    await this.page.waitForSelector('[data-testid="dashboard-content"]');
  }

  async navigateToJourneyBuilder() {
    await this.page.click('[data-testid="journeys-nav-link"]');
    await this.page.waitForURL(TEST_URLS.journeyBuilder);
    await this.page.waitForSelector(
      '[data-testid="journey-builder-container"]',
    );
  }

  async mockAIResponses() {
    await this.page.route('**/api/ai/journey/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          journey: MOCK_AI_RESPONSES.journeyGeneration,
        }),
      });
    });

    await this.page.route('**/api/openai/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(MOCK_AI_RESPONSES.journeyGeneration),
              },
            },
          ],
        }),
      });
    });
  }

  async mockEmailService() {
    await this.page.route('**/api/email/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          messageId: 'test-message-id',
        }),
      });
    });
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}

// Test Suite: AI Journey Workflow
test.describe('AI Journey Workflow E2E Tests', () => {
  let helper: JourneyWorkflowHelper;

  test.beforeEach(async ({ page }) => {
    helper = new JourneyWorkflowHelper(page);

    // Setup API mocking
    await helper.mockAIResponses();
    await helper.mockEmailService();
  });

  test.describe('Complete Journey Generation Workflow', () => {
    test('should create complete AI-generated photography journey', async ({
      page,
    }) => {
      const startTime = Date.now();

      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      // Start journey creation
      await page.click('[data-testid="create-journey-button"]');
      await page.waitForSelector('[data-testid="journey-type-selector"]');

      // Select photography vendor type
      await page.click('[data-testid="vendor-type-photography"]');
      await page.waitForSelector('[data-testid="ai-generation-form"]');

      // Fill journey details
      await page.fill(
        '[data-testid="journey-name-input"]',
        'Wedding Photography Journey',
      );
      await page.fill(
        '[data-testid="journey-description-input"]',
        'Complete photography workflow from booking to delivery',
      );

      // Generate AI journey
      const aiGenerationStart = Date.now();
      await page.click('[data-testid="generate-ai-journey-button"]');

      // Wait for AI generation (should complete within 5 seconds)
      await page.waitForSelector(
        '[data-testid="journey-touchpoints-container"]',
        { timeout: 5000 },
      );
      const aiGenerationTime = Date.now() - aiGenerationStart;

      // Verify AI generation performance
      expect(aiGenerationTime).toBeLessThan(5000);

      // Verify generated touchpoints
      const touchpoints = await page
        .locator('[data-testid="touchpoint-card"]')
        .all();
      expect(touchpoints.length).toBeGreaterThanOrEqual(3);

      // Verify touchpoint content
      await expect(
        page.locator('[data-testid="touchpoint-title"]').first(),
      ).toContainText('Initial Consultation');

      // Customize journey
      await page.click('[data-testid="customize-journey-button"]');
      await page.waitForSelector('[data-testid="journey-editor"]');

      // Add custom touchpoint
      await page.click('[data-testid="add-touchpoint-button"]');
      await page.fill(
        '[data-testid="new-touchpoint-title"]',
        'Final Gallery Delivery',
      );
      await page.fill(
        '[data-testid="new-touchpoint-description"]',
        'Deliver final edited photos to couple',
      );
      await page.selectOption(
        '[data-testid="touchpoint-timing-select"]',
        '7_days_after',
      );
      await page.click('[data-testid="save-touchpoint-button"]');

      // Save journey
      await page.click('[data-testid="save-journey-button"]');
      await page.waitForSelector('[data-testid="journey-saved-confirmation"]');

      // Verify journey appears in list
      await helper.navigateToJourneyBuilder();
      await expect(page.locator('[data-testid="journey-card"]')).toContainText(
        'Wedding Photography Journey',
      );

      // Performance assertion
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(30000); // Complete workflow under 30 seconds

      await helper.takeScreenshot('journey-generation-complete');
    });

    test('should handle different vendor types with appropriate touchpoints', async ({
      page,
    }) => {
      const vendorTypes = ['photography', 'venue', 'catering', 'dj', 'florist'];

      for (const vendorType of vendorTypes) {
        await helper.loginAsVendor('photographer');
        await helper.navigateToJourneyBuilder();

        await page.click('[data-testid="create-journey-button"]');
        await page.click(`[data-testid="vendor-type-${vendorType}"]`);

        await page.fill(
          '[data-testid="journey-name-input"]',
          `${vendorType} Journey Test`,
        );
        await page.click('[data-testid="generate-ai-journey-button"]');

        await page.waitForSelector(
          '[data-testid="journey-touchpoints-container"]',
        );

        // Verify vendor-specific touchpoints are generated
        const touchpoints = await page
          .locator('[data-testid="touchpoint-card"]')
          .all();
        expect(touchpoints.length).toBeGreaterThanOrEqual(2);

        await helper.takeScreenshot(`journey-${vendorType}-generated`);

        // Cleanup
        await page.goto(TEST_URLS.dashboard);
      }
    });
  });

  test.describe('Mobile Journey AI Interface', () => {
    test('should work perfectly on mobile devices', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);

      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      // Test mobile navigation
      await expect(
        page.locator('[data-testid="mobile-nav-toggle"]'),
      ).toBeVisible();
      await page.click('[data-testid="mobile-nav-toggle"]');
      await expect(
        page.locator('[data-testid="mobile-nav-menu"]'),
      ).toBeVisible();

      // Test journey creation on mobile
      await page.click('[data-testid="create-journey-button"]');
      await expect(
        page.locator('[data-testid="journey-type-selector"]'),
      ).toBeVisible();

      // Verify touch interactions work
      await page.tap('[data-testid="vendor-type-photography"]');
      await page.waitForSelector('[data-testid="ai-generation-form"]');

      // Test form inputs on mobile
      await page.fill(
        '[data-testid="journey-name-input"]',
        'Mobile Photography Journey',
      );
      await page.tap('[data-testid="generate-ai-journey-button"]');

      await page.waitForSelector(
        '[data-testid="journey-touchpoints-container"]',
      );

      // Test drag-and-drop on mobile (touch events)
      const firstTouchpoint = page
        .locator('[data-testid="touchpoint-card"]')
        .first();
      const secondTouchpoint = page
        .locator('[data-testid="touchpoint-card"]')
        .nth(1);

      await firstTouchpoint.hover();
      await page.mouse.down();
      await secondTouchpoint.hover();
      await page.mouse.up();

      // Verify responsive design
      await expect(
        page.locator('[data-testid="journey-editor"]'),
      ).toBeVisible();

      await helper.takeScreenshot('mobile-journey-test');
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
      test(`should work correctly in ${browserName}`, async ({ page }) => {
        await helper.loginAsVendor('photographer');
        await helper.navigateToJourneyBuilder();

        // Test core functionality across browsers
        await page.click('[data-testid="create-journey-button"]');
        await page.click('[data-testid="vendor-type-photography"]');

        await page.fill(
          '[data-testid="journey-name-input"]',
          `${browserName} Test Journey`,
        );
        await page.click('[data-testid="generate-ai-journey-button"]');

        await page.waitForSelector(
          '[data-testid="journey-touchpoints-container"]',
        );

        // Verify browser-specific behaviors
        const touchpoints = await page
          .locator('[data-testid="touchpoint-card"]')
          .all();
        expect(touchpoints.length).toBeGreaterThanOrEqual(3);

        await helper.takeScreenshot(`cross-browser-${browserName}`);
      });
    });
  });

  test.describe('Performance Benchmarking', () => {
    test('should meet performance requirements', async ({ page }) => {
      // Track navigation performance
      const navigationStart = Date.now();
      await helper.loginAsVendor('photographer');
      const loginTime = Date.now() - navigationStart;

      expect(loginTime).toBeLessThan(3000); // Login under 3 seconds

      // Track page load performance
      const pageLoadStart = Date.now();
      await helper.navigateToJourneyBuilder();
      const pageLoadTime = Date.now() - pageLoadStart;

      expect(pageLoadTime).toBeLessThan(2000); // Page load under 2 seconds

      // Track AI generation performance
      await page.click('[data-testid="create-journey-button"]');
      await page.click('[data-testid="vendor-type-photography"]');
      await page.fill(
        '[data-testid="journey-name-input"]',
        'Performance Test Journey',
      );

      const aiStart = Date.now();
      await page.click('[data-testid="generate-ai-journey-button"]');
      await page.waitForSelector(
        '[data-testid="journey-touchpoints-container"]',
      );
      const aiTime = Date.now() - aiStart;

      expect(aiTime).toBeLessThan(5000); // AI generation under 5 seconds
    });
  });

  test.describe('Error Handling & Resilience', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      // Mock AI API failure
      await page.route('**/api/ai/journey/generate', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'AI service temporarily unavailable',
          }),
        });
      });

      await page.click('[data-testid="create-journey-button"]');
      await page.click('[data-testid="vendor-type-photography"]');
      await page.fill(
        '[data-testid="journey-name-input"]',
        'Error Test Journey',
      );
      await page.click('[data-testid="generate-ai-journey-button"]');

      // Verify error handling
      await page.waitForSelector('[data-testid="error-message"]');
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'AI service temporarily unavailable',
      );

      // Verify retry mechanism
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      await helper.takeScreenshot('api-error-handling');
    });

    test('should handle offline scenarios', async ({ page, context }) => {
      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      // Create journey first
      await page.click('[data-testid="create-journey-button"]');
      await page.click('[data-testid="vendor-type-photography"]');
      await page.fill(
        '[data-testid="journey-name-input"]',
        'Offline Test Journey',
      );

      // Simulate offline
      await context.setOffline(true);

      await page.click('[data-testid="generate-ai-journey-button"]');

      // Verify offline handling
      await page.waitForSelector('[data-testid="offline-indicator"]');
      await expect(
        page.locator('[data-testid="offline-message"]'),
      ).toContainText('You are currently offline');

      // Verify data persists locally
      await expect(
        page.locator('[data-testid="journey-name-input"]'),
      ).toHaveValue('Offline Test Journey');

      // Go back online
      await context.setOffline(false);

      // Verify reconnection
      await page.waitForSelector('[data-testid="online-indicator"]');

      await helper.takeScreenshot('offline-handling');
    });
  });

  test.describe('Real-time Features', () => {
    test('should auto-save journey progress', async ({ page }) => {
      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      await page.click('[data-testid="create-journey-button"]');
      await page.click('[data-testid="vendor-type-photography"]');

      // Fill form and verify auto-save
      await page.fill('[data-testid="journey-name-input"]', 'Auto-save Test');

      // Wait for auto-save indicator
      await page.waitForSelector('[data-testid="auto-save-indicator"]', {
        timeout: 3000,
      });
      await expect(
        page.locator('[data-testid="auto-save-status"]'),
      ).toContainText('Saved');

      // Verify data persists after page reload
      await page.reload();
      await page.waitForSelector('[data-testid="journey-name-input"]');
      await expect(
        page.locator('[data-testid="journey-name-input"]'),
      ).toHaveValue('Auto-save Test');

      await helper.takeScreenshot('auto-save-functionality');
    });
  });

  test.describe('Accessibility & Usability', () => {
    test('should be fully accessible', async ({ page }) => {
      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should activate create journey button

      await page.waitForSelector('[data-testid="journey-type-selector"]');

      // Test screen reader support
      const createButton = page.locator(
        '[data-testid="create-journey-button"]',
      );
      await expect(createButton).toHaveAttribute('aria-label');

      // Test color contrast and visibility
      const journeyTitle = page.locator(
        '[data-testid="journey-builder-title"]',
      );
      await expect(journeyTitle).toBeVisible();

      await helper.takeScreenshot('accessibility-test');
    });

    test('should provide clear user feedback', async ({ page }) => {
      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();

      // Test loading states
      await page.click('[data-testid="create-journey-button"]');
      await page.click('[data-testid="vendor-type-photography"]');
      await page.fill(
        '[data-testid="journey-name-input"]',
        'Feedback Test Journey',
      );

      await page.click('[data-testid="generate-ai-journey-button"]');

      // Verify loading indicator
      await expect(
        page.locator('[data-testid="loading-spinner"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="loading-text"]')).toContainText(
        'Generating your journey',
      );

      await page.waitForSelector(
        '[data-testid="journey-touchpoints-container"]',
      );

      // Verify success feedback
      await expect(
        page.locator('[data-testid="success-message"]'),
      ).toContainText('Journey generated successfully');

      await helper.takeScreenshot('user-feedback-test');
    });
  });

  // Visual Regression Tests
  test.describe('Visual Regression Tests', () => {
    test('should match baseline screenshots', async ({ page }) => {
      await helper.mockAIResponses();
      await helper.mockEmailService();

      // Desktop journey builder
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await helper.loginAsVendor('photographer');
      await helper.navigateToJourneyBuilder();
      await expect(page).toHaveScreenshot('desktop-journey-builder.png');

      // Mobile journey builder
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.reload();
      await page.waitForSelector('[data-testid="journey-builder-container"]');
      await expect(page).toHaveScreenshot('mobile-journey-builder.png');

      // Journey creation flow
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await page.click('[data-testid="create-journey-button"]');
      await expect(page).toHaveScreenshot('journey-creation-modal.png');

      await page.click('[data-testid="vendor-type-photography"]');
      await expect(page).toHaveScreenshot('journey-generation-form.png');
    });
  });

  // Performance Tests
  test.describe('Performance Tests', () => {
    test('should meet core web vitals', async ({ page }) => {
      await page.goto('/dashboard/journeys');

      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: any = {};

            entries.forEach((entry: any) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.value;
              }
              if (entry.entryType === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
            });

            resolve(vitals);
          }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        });
      });

      // Core Web Vitals assertions
      expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s
      expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
    });
  });
});
