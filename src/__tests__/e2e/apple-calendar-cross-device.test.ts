/**
 * Apple Calendar Cross-Device E2E Testing Suite
 * Team E Implementation - WS-218
 * Visual testing across iPhone, iPad, Mac, and Apple Watch viewports
 */

import { test, expect, devices } from '@playwright/test';
import type { Page, Browser } from '@playwright/test';

// Device configurations for Apple ecosystem testing
const APPLE_DEVICES = {
  iPhone_SE: {
    ...devices['iPhone SE'],
    viewport: { width: 375, height: 667 },
    userAgent: devices['iPhone SE'].userAgent,
    deviceScaleFactor: 2,
  },
  iPhone_14: {
    ...devices['iPhone 13 Pro'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  },
  iPhone_14_Pro_Max: {
    ...devices['iPhone 13 Pro Max'],
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
  },
  iPad_Air: {
    ...devices['iPad Pro'],
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
  },
  iPad_Pro_12_9: {
    ...devices['iPad Pro landscape'],
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
  },
  Mac_Desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  Apple_Watch_Simulator: {
    viewport: { width: 396, height: 484 }, // Apple Watch Series 8 (45mm) simulator
    deviceScaleFactor: 2,
    isMobile: true,
  },
};

// Wedding scenarios for realistic testing
const WEDDING_TEST_SCENARIOS = {
  photographer: {
    role: 'photographer',
    events: [
      { time: '10:00', title: 'Bride Prep Photos', location: 'Bridal Suite' },
      { time: '14:00', title: 'First Look', location: 'Garden Pavilion' },
      { time: '16:00', title: 'Ceremony', location: 'Main Chapel' },
      { time: '17:30', title: 'Family Photos', location: 'Rose Garden' },
      { time: '19:00', title: 'Reception', location: 'Grand Ballroom' },
    ],
  },
  venue: {
    role: 'venue_coordinator',
    events: [
      { time: '08:00', title: 'Setup Begin', location: 'All Areas' },
      {
        time: '12:00',
        title: 'Vendor Arrival Window',
        location: 'Service Entrance',
      },
      { time: '15:30', title: 'Guest Arrival', location: 'Main Entrance' },
      { time: '23:00', title: 'Breakdown Begin', location: 'All Areas' },
    ],
  },
  couple: {
    role: 'couple',
    events: [
      { time: '09:00', title: 'Hair & Makeup', location: 'Bridal Suite' },
      {
        time: '13:30',
        title: 'Getting Ready Photos',
        location: 'Bridal Suite',
      },
      { time: '16:00', title: 'Wedding Ceremony', location: 'Main Chapel' },
      {
        time: '19:00',
        title: 'Reception & Dinner',
        location: 'Grand Ballroom',
      },
    ],
  },
};

// Test data for Apple Calendar integration
const APPLE_CALENDAR_TEST_DATA = {
  validCredentials: {
    appleId: 'test.photographer@icloud.com',
    appSpecificPassword: 'test-test-test-test', // Mock format
    calendarName: 'Wedding Schedule 2024',
  },
  weddingEvents: [
    {
      title: 'Sarah & Mike Wedding - Ceremony',
      startTime: '2024-06-15T16:00:00',
      endTime: '2024-06-15T16:30:00',
      location: 'Sunset Gardens Chapel',
      attendees: ['photographer@studio.com', 'officiant@chapel.com'],
      notes: 'Outdoor ceremony, backup plan in main chapel if rain',
    },
    {
      title: 'Sarah & Mike Wedding - Reception',
      startTime: '2024-06-15T19:00:00',
      endTime: '2024-06-15T23:00:00',
      location: 'Sunset Gardens Ballroom',
      attendees: ['dj@music.com', 'catering@delicious.com'],
      notes: 'First dance at 8 PM, cake cutting at 9:30 PM',
    },
  ],
};

// Cross-device test suite
for (const [deviceName, deviceConfig] of Object.entries(APPLE_DEVICES)) {
  test.describe(`Apple Calendar Integration - ${deviceName}`, () => {
    test.use(deviceConfig);

    test.beforeEach(async ({ page }) => {
      // Mock Apple Calendar API responses
      await page.route('**/api/apple-calendar/**', async (route) => {
        const url = route.request().url();

        if (url.includes('/validate-credentials')) {
          await route.fulfill({
            json: {
              success: true,
              calendars: ['Personal', 'Wedding Schedule 2024', 'Work'],
            },
          });
        } else if (url.includes('/sync-events')) {
          await route.fulfill({
            json: {
              success: true,
              events: APPLE_CALENDAR_TEST_DATA.weddingEvents,
              syncedCount: 2,
            },
          });
        } else {
          await route.continue();
        }
      });

      // Navigate to Apple Calendar integration page
      await page.goto('/settings/integrations/apple-calendar');
    });

    test('should display Apple Calendar setup form correctly', async ({
      page,
    }) => {
      // Verify form elements are visible and properly sized
      await expect(
        page.locator('[data-testid="apple-id-input"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="app-password-input"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="connect-button"]'),
      ).toBeVisible();

      // Take screenshot for visual regression testing
      await page.screenshot({
        path: `test-results/apple-calendar-setup-${deviceName}.png`,
        fullPage: true,
      });

      // Verify responsive design elements
      if (deviceName.includes('iPhone')) {
        // Mobile-specific tests
        await expect(
          page.locator('[data-testid="mobile-setup-guide"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="qr-code-helper"]'),
        ).toBeVisible();
      } else if (deviceName.includes('iPad')) {
        // Tablet-specific tests
        await expect(
          page.locator('[data-testid="tablet-layout"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="side-by-side-guide"]'),
        ).toBeVisible();
      } else if (deviceName.includes('Mac')) {
        // Desktop-specific tests
        await expect(
          page.locator('[data-testid="desktop-advanced-options"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="keyboard-shortcuts-info"]'),
        ).toBeVisible();
      }
    });

    test('should handle Apple ID and app-specific password input', async ({
      page,
    }) => {
      // Fill in Apple ID
      await page.fill(
        '[data-testid="apple-id-input"]',
        APPLE_CALENDAR_TEST_DATA.validCredentials.appleId,
      );

      // Verify Apple ID validation feedback
      await expect(
        page.locator('[data-testid="apple-id-validation"]'),
      ).toHaveText('✓ Valid Apple ID format');

      // Fill in app-specific password
      await page.fill(
        '[data-testid="app-password-input"]',
        APPLE_CALENDAR_TEST_DATA.validCredentials.appSpecificPassword,
      );

      // Verify password format validation
      await expect(
        page.locator('[data-testid="password-validation"]'),
      ).toHaveText('✓ Valid app-specific password format');

      // Test input masking on mobile devices
      if (deviceName.includes('iPhone') || deviceName.includes('iPad')) {
        const passwordInput = page.locator(
          '[data-testid="app-password-input"]',
        );
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Test show/hide password toggle
        await page.click('[data-testid="toggle-password-visibility"]');
        await expect(passwordInput).toHaveAttribute('type', 'text');
      }

      // Take screenshot of filled form
      await page.screenshot({
        path: `test-results/apple-calendar-filled-form-${deviceName}.png`,
      });
    });

    test('should successfully connect to Apple Calendar', async ({ page }) => {
      // Fill in credentials
      await page.fill(
        '[data-testid="apple-id-input"]',
        APPLE_CALENDAR_TEST_DATA.validCredentials.appleId,
      );
      await page.fill(
        '[data-testid="app-password-input"]',
        APPLE_CALENDAR_TEST_DATA.validCredentials.appSpecificPassword,
      );

      // Click connect button
      await page.click('[data-testid="connect-button"]');

      // Wait for connection to complete
      await expect(
        page.locator('[data-testid="connection-status"]'),
      ).toHaveText('Connected successfully!', { timeout: 10000 });

      // Verify calendar selection appears
      await expect(
        page.locator('[data-testid="calendar-selector"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="calendar-option"]')).toHaveCount(
        3,
      ); // Personal, Wedding Schedule, Work

      // Select wedding calendar
      await page.selectOption(
        '[data-testid="calendar-selector"]',
        'Wedding Schedule 2024',
      );

      // Verify sync options appear
      await expect(page.locator('[data-testid="sync-options"]')).toBeVisible();

      // Take screenshot of successful connection
      await page.screenshot({
        path: `test-results/apple-calendar-connected-${deviceName}.png`,
      });
    });

    test('should display wedding events correctly', async ({ page }) => {
      // Setup connection (using previous test steps)
      await page.fill(
        '[data-testid="apple-id-input"]',
        APPLE_CALENDAR_TEST_DATA.validCredentials.appleId,
      );
      await page.fill(
        '[data-testid="app-password-input"]',
        APPLE_CALENDAR_TEST_DATA.validCredentials.appSpecificPassword,
      );
      await page.click('[data-testid="connect-button"]');
      await expect(
        page.locator('[data-testid="connection-status"]'),
      ).toHaveText('Connected successfully!');

      // Select calendar and trigger sync
      await page.selectOption(
        '[data-testid="calendar-selector"]',
        'Wedding Schedule 2024',
      );
      await page.click('[data-testid="sync-now-button"]');

      // Wait for events to load
      await expect(page.locator('[data-testid="wedding-event"]')).toHaveCount(
        2,
      );

      // Verify event details are displayed correctly
      const ceremonyEvent = page
        .locator('[data-testid="wedding-event"]')
        .first();
      await expect(
        ceremonyEvent.locator('[data-testid="event-title"]'),
      ).toHaveText('Sarah & Mike Wedding - Ceremony');
      await expect(
        ceremonyEvent.locator('[data-testid="event-time"]'),
      ).toHaveText('4:00 PM - 4:30 PM');
      await expect(
        ceremonyEvent.locator('[data-testid="event-location"]'),
      ).toHaveText('Sunset Gardens Chapel');

      // Test responsive event layout
      if (deviceName.includes('iPhone')) {
        // Mobile: Events should stack vertically
        await expect(
          page.locator('[data-testid="events-container"]'),
        ).toHaveClass(/flex-col/);
      } else if (deviceName.includes('iPad')) {
        // Tablet: Events should be in 2-column grid
        await expect(
          page.locator('[data-testid="events-container"]'),
        ).toHaveClass(/grid-cols-2/);
      } else if (deviceName.includes('Mac')) {
        // Desktop: Events should be in 3-column grid
        await expect(
          page.locator('[data-testid="events-container"]'),
        ).toHaveClass(/grid-cols-3/);
      }

      // Take screenshot of events display
      await page.screenshot({
        path: `test-results/apple-calendar-events-${deviceName}.png`,
        fullPage: true,
      });
    });

    test('should handle error states gracefully', async ({ page }) => {
      // Test invalid Apple ID
      await page.fill('[data-testid="apple-id-input"]', 'invalid-email');
      await page.fill('[data-testid="app-password-input"]', 'invalid-password');

      await page.click('[data-testid="connect-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Invalid credentials',
      );

      // Error should be visible on all screen sizes
      const errorElement = page.locator('[data-testid="error-message"]');
      await expect(errorElement).toBeInViewport();

      // Take screenshot of error state
      await page.screenshot({
        path: `test-results/apple-calendar-error-${deviceName}.png`,
      });
    });

    test('should support offline mode gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.setOffline(true);

      await page.reload();

      // Should show offline message
      await expect(
        page.locator('[data-testid="offline-message"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="offline-message"]'),
      ).toContainText("You're currently offline");

      // Connection form should be disabled
      await expect(
        page.locator('[data-testid="connect-button"]'),
      ).toBeDisabled();

      // Should show cached events if any
      await expect(
        page.locator('[data-testid="cached-events-notice"]'),
      ).toBeVisible();

      // Take screenshot of offline state
      await page.screenshot({
        path: `test-results/apple-calendar-offline-${deviceName}.png`,
      });

      // Restore online state
      await page.setOffline(false);
    });
  });
}

// Wedding scenario-specific tests
test.describe('Wedding Professional Workflows', () => {
  test.use(APPLE_DEVICES.iPhone_14); // Most common photographer device

  for (const [scenarioName, scenario] of Object.entries(
    WEDDING_TEST_SCENARIOS,
  )) {
    test(`should handle ${scenarioName} workflow`, async ({ page }) => {
      // Navigate to role-specific dashboard
      await page.goto(`/dashboard/${scenario.role}`);

      // Setup Apple Calendar integration
      await page.click('[data-testid="integrations-link"]');
      await page.click('[data-testid="apple-calendar-setup"]');

      // Quick setup for testing
      await page.fill(
        '[data-testid="apple-id-input"]',
        `${scenario.role}@test.com`,
      );
      await page.fill(
        '[data-testid="app-password-input"]',
        'test-test-test-test',
      );
      await page.click('[data-testid="connect-button"]');

      await expect(
        page.locator('[data-testid="connection-status"]'),
      ).toHaveText('Connected successfully!');

      // Verify role-specific events are displayed
      for (const event of scenario.events) {
        await expect(
          page.locator(
            `[data-testid="event-${event.title.replace(/\s+/g, '-').toLowerCase()}"]`,
          ),
        ).toBeVisible();
      }

      // Test event interaction based on role
      if (scenarioName === 'photographer') {
        // Photographers should see photo scheduling options
        await expect(
          page.locator('[data-testid="photo-timeline-view"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="equipment-checklist"]'),
        ).toBeVisible();
      } else if (scenarioName === 'venue') {
        // Venue coordinators should see setup/breakdown times
        await expect(
          page.locator('[data-testid="setup-timeline"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="vendor-coordination"]'),
        ).toBeVisible();
      } else if (scenarioName === 'couple') {
        // Couples should see simplified timeline
        await expect(
          page.locator('[data-testid="couple-timeline"]'),
        ).toBeVisible();
        await expect(page.locator('[data-testid="guest-info"]')).toBeVisible();
      }

      // Take screenshot of role-specific interface
      await page.screenshot({
        path: `test-results/apple-calendar-${scenarioName}-workflow.png`,
        fullPage: true,
      });
    });
  }
});

// Performance testing across devices
test.describe('Performance Testing', () => {
  for (const [deviceName, deviceConfig] of Object.entries(APPLE_DEVICES)) {
    test(`should load quickly on ${deviceName}`, async ({ page }) => {
      test.use(deviceConfig);

      const startTime = Date.now();
      await page.goto('/settings/integrations/apple-calendar');

      // Wait for key elements to be visible
      await expect(
        page.locator('[data-testid="apple-calendar-form"]'),
      ).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Performance expectations based on device type
      let maxLoadTime = 5000; // Default 5 seconds

      if (deviceName.includes('iPhone')) {
        maxLoadTime = 3000; // Mobile should be faster due to simpler layout
      } else if (deviceName.includes('Mac')) {
        maxLoadTime = 2000; // Desktop should be fastest
      }

      expect(loadTime).toBeLessThan(maxLoadTime);

      // Log performance metrics
      console.log(`${deviceName} load time: ${loadTime}ms`);
    });
  }
});

// Accessibility testing
test.describe('Accessibility Testing', () => {
  test.use(APPLE_DEVICES.iPhone_SE); // Test on smallest screen for accessibility

  test('should meet WCAG accessibility standards', async ({ page }) => {
    await page.goto('/settings/integrations/apple-calendar');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="apple-id-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      page.locator('[data-testid="app-password-input"]'),
    ).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="connect-button"]')).toBeFocused();

    // Test screen reader compatibility
    await expect(
      page.locator('[data-testid="apple-id-input"]'),
    ).toHaveAttribute('aria-label');
    await expect(
      page.locator('[data-testid="app-password-input"]'),
    ).toHaveAttribute('aria-label');

    // Test color contrast (basic check)
    const connectButton = page.locator('[data-testid="connect-button"]');
    const buttonStyles = await connectButton.evaluate((el) => {
      const styles = getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    // Ensure button has sufficient contrast (this is a basic check)
    expect(buttonStyles.backgroundColor).not.toBe(buttonStyles.color);
  });
});

// Security testing in browser context
test.describe('Browser Security Testing', () => {
  test.use(APPLE_DEVICES.Mac_Desktop);

  test('should not expose sensitive data in browser', async ({ page }) => {
    // Monitor console for any credential leaks
    const consoleMessages: string[] = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    await page.goto('/settings/integrations/apple-calendar');

    // Fill in test credentials
    await page.fill('[data-testid="apple-id-input"]', 'sensitive@test.com');
    await page.fill(
      '[data-testid="app-password-input"]',
      'secret-password-here',
    );

    // Check that sensitive data is not logged
    const sensitiveData = ['sensitive@test.com', 'secret-password-here'];
    for (const sensitive of sensitiveData) {
      const foundInConsole = consoleMessages.some((msg) =>
        msg.includes(sensitive),
      );
      expect(foundInConsole).toBe(false);
    }

    // Verify input masking
    const passwordInput = page.locator('[data-testid="app-password-input"]');
    const inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');

    // Verify no sensitive data in page source
    const pageContent = await page.content();
    for (const sensitive of sensitiveData) {
      expect(pageContent).not.toContain(sensitive);
    }
  });
});

export { APPLE_DEVICES, WEDDING_TEST_SCENARIOS, APPLE_CALENDAR_TEST_DATA };
