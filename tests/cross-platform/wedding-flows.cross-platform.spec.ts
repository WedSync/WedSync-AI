// Cross-platform wedding flow testing
// Tests critical wedding workflows across all device types and browsers
// Ensures consistent user experience regardless of platform

import { test, expect, Browser, Page } from '@playwright/test';
import { buildCapabilities, CROSS_PLATFORM_TEST_DATA, BROWSERSTACK_CONFIG } from './browserstack.config';

// Test configuration for cross-platform scenarios
const PLATFORM_SCENARIOS = [
  {
    name: 'desktop-wedding-planning',
    description: 'Complete wedding planning flow on desktop browsers',
    platforms: buildCapabilities('desktop-only'),
    flow: 'full-planning'
  },
  {
    name: 'mobile-rsvp-management', 
    description: 'RSVP and guest management on mobile devices',
    platforms: buildCapabilities('mobile-only'),
    flow: 'rsvp-guest'
  },
  {
    name: 'tablet-vendor-discovery',
    description: 'Vendor search and booking on tablet devices', 
    platforms: buildCapabilities('tablet-only'),
    flow: 'vendor-booking'
  },
  {
    name: 'ios-photo-sharing',
    description: 'Photo upload and gallery management on iOS devices',
    platforms: buildCapabilities('ios-only'),
    flow: 'photo-management'
  },
  {
    name: 'android-timeline-updates',
    description: 'Wedding timeline management on Android devices',
    platforms: buildCapabilities('android-only'), 
    flow: 'timeline-management'
  }
];

// Cross-platform test suite for wedding workflows
test.describe('Cross-Platform Wedding Flows', () => {
  
  PLATFORM_SCENARIOS.forEach(scenario => {
    test.describe(scenario.name, () => {
      
      scenario.platforms.forEach((platform, index) => {
        const platformName = platform.deviceName || `${platform.browserName}-${platform.os}`;
        
        test(`${scenario.description} - ${platformName}`, async ({ browser }) => {
          // Create isolated browser context for each platform test
          const context = await browser.newContext({
            viewport: platform.deviceName ? 
              { width: 390, height: 844 } : // Mobile viewport
              { width: 1920, height: 1080 }, // Desktop viewport
            userAgent: platform.deviceName ? 
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' :
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            hasTouch: !!platform.deviceName,
            isMobile: !!platform.deviceName,
          });
          
          const page = await context.newPage();
          
          // Set wedding test data
          const testData = CROSS_PLATFORM_TEST_DATA.couples[index % CROSS_PLATFORM_TEST_DATA.couples.length];
          
          try {
            // Execute platform-specific wedding flow
            switch (scenario.flow) {
              case 'full-planning':
                await executeFullPlanningFlow(page, testData, platform);
                break;
              case 'rsvp-guest':
                await executeRSVPGuestFlow(page, testData, platform);
                break;
              case 'vendor-booking':
                await executeVendorBookingFlow(page, testData, platform);
                break;
              case 'photo-management':
                await executePhotoManagementFlow(page, testData, platform);
                break;
              case 'timeline-management':
                await executeTimelineManagementFlow(page, testData, platform);
                break;
            }
          } finally {
            await context.close();
          }
        });
      });
    });
  });
});

// Full wedding planning flow (desktop-optimized)
async function executeFullPlanningFlow(page: Page, testData: any, platform: any) {
  console.log(`Testing full planning flow on ${platform.browserName || platform.deviceName}`);
  
  // Navigate to wedding dashboard
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Verify dashboard loads correctly across platforms
  await expect(page.locator('[data-testid="wedding-dashboard"]')).toBeVisible();
  
  // Test responsive navigation
  if (platform.deviceName) {
    // Mobile: Check hamburger menu
    await page.locator('[data-testid="mobile-menu-toggle"]').click();
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
  } else {
    // Desktop: Check full navigation
    await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
  }
  
  // Create new wedding
  await page.click('[data-testid="create-wedding-btn"]');
  await page.fill('[data-testid="bride-name"]', testData.bride);
  await page.fill('[data-testid="groom-name"]', testData.groom);
  await page.fill('[data-testid="wedding-date"]', testData.weddingDate);
  await page.fill('[data-testid="guest-count"]', testData.guestCount.toString());
  await page.fill('[data-testid="budget"]', testData.budget.toString());
  
  // Platform-specific form submission
  if (platform.deviceName) {
    // Mobile: Scroll to submit button
    await page.locator('[data-testid="create-wedding-submit"]').scrollIntoViewIfNeeded();
  }
  
  await page.click('[data-testid="create-wedding-submit"]');
  
  // Verify wedding creation success across platforms
  await expect(page.locator('[data-testid="wedding-created-success"]')).toBeVisible({ timeout: 10000 });
  
  // Test budget management
  await page.click('[data-testid="budget-tab"]');
  await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
  
  // Add budget categories (responsive design test)
  await page.click('[data-testid="add-budget-category"]');
  await page.fill('[data-testid="category-name"]', 'Photography');
  await page.fill('[data-testid="category-budget"]', '3500');
  
  if (platform.deviceName) {
    // Mobile: Use touch interactions
    await page.touchscreen.tap(100, 100); // Tap to focus
  }
  
  await page.click('[data-testid="save-category"]');
  await expect(page.locator('[data-testid="category-Photography"]')).toBeVisible();
  
  // Verify responsive design elements
  if (platform.deviceName) {
    // Mobile: Check collapsible sections
    await expect(page.locator('[data-testid="mobile-budget-summary"]')).toBeVisible();
  } else {
    // Desktop: Check side-by-side layout
    await expect(page.locator('[data-testid="desktop-budget-layout"]')).toBeVisible();
  }
  
  console.log(`✅ Full planning flow completed successfully on ${platform.browserName || platform.deviceName}`);
}

// RSVP and guest management flow (mobile-optimized)
async function executeRSVPGuestFlow(page: Page, testData: any, platform: any) {
  console.log(`Testing RSVP guest flow on ${platform.deviceName || platform.browserName}`);
  
  // Navigate to RSVP page
  await page.goto('/rsvp');
  await page.waitForLoadState('networkidle');
  
  // Test mobile RSVP form
  await expect(page.locator('[data-testid="rsvp-form"]')).toBeVisible();
  
  // Mobile-specific interactions
  if (platform.deviceName) {
    // Test touch scrolling
    await page.touchscreen.tap(200, 300);
    await page.locator('[data-testid="guest-name"]').scrollIntoViewIfNeeded();
  }
  
  // Fill RSVP form
  await page.fill('[data-testid="guest-name"]', CROSS_PLATFORM_TEST_DATA.guests[0].name);
  await page.fill('[data-testid="guest-email"]', CROSS_PLATFORM_TEST_DATA.guests[0].email);
  
  // Mobile-friendly radio button selection
  await page.check('[data-testid="rsvp-yes"]');
  
  // Test dietary restrictions (mobile keyboard)
  await page.fill('[data-testid="dietary-restrictions"]', 'Vegetarian');
  
  // Mobile: Check form validation
  if (platform.deviceName) {
    await page.locator('[data-testid="submit-rsvp"]').scrollIntoViewIfNeeded();
  }
  
  await page.click('[data-testid="submit-rsvp"]');
  
  // Verify RSVP submission across platforms
  await expect(page.locator('[data-testid="rsvp-success"]')).toBeVisible({ timeout: 10000 });
  
  // Test guest list management
  await page.goto('/admin/guests');
  await expect(page.locator('[data-testid="guest-list"]')).toBeVisible();
  
  // Mobile: Test swipe actions
  if (platform.deviceName) {
    const guestRow = page.locator('[data-testid="guest-row-0"]');
    await guestRow.hover();
    await page.touchscreen.tap(100, 200);
  }
  
  // Verify guest appears in admin list
  await expect(page.locator(`text=${CROSS_PLATFORM_TEST_DATA.guests[0].name}`)).toBeVisible();
  
  console.log(`✅ RSVP guest flow completed successfully on ${platform.deviceName || platform.browserName}`);
}

// Vendor booking flow (tablet-optimized)
async function executeVendorBookingFlow(page: Page, testData: any, platform: any) {
  console.log(`Testing vendor booking flow on ${platform.deviceName || platform.browserName}`);
  
  // Navigate to vendor directory
  await page.goto('/vendors');
  await page.waitForLoadState('networkidle');
  
  // Test vendor search and filtering
  await expect(page.locator('[data-testid="vendor-directory"]')).toBeVisible();
  
  // Tablet: Test enhanced search experience
  if (platform.deviceName && platform.deviceName.includes('iPad')) {
    await expect(page.locator('[data-testid="tablet-vendor-grid"]')).toBeVisible();
  }
  
  // Search for photographer
  await page.fill('[data-testid="vendor-search"]', 'photographer');
  await page.keyboard.press('Enter');
  
  // Filter by rating
  await page.click('[data-testid="filter-rating-4plus"]');
  
  // Select vendor
  const vendorCard = page.locator('[data-testid="vendor-card"]').first();
  await vendorCard.click();
  
  // Test vendor profile page
  await expect(page.locator('[data-testid="vendor-profile"]')).toBeVisible();
  
  // Tablet: Test image gallery
  if (platform.deviceName && platform.deviceName.includes('Tab')) {
    await page.click('[data-testid="vendor-portfolio"]');
    await expect(page.locator('[data-testid="portfolio-gallery"]')).toBeVisible();
  }
  
  // Send inquiry
  await page.click('[data-testid="contact-vendor"]');
  await page.fill('[data-testid="inquiry-message"]', 'Interested in photography services for wedding');
  await page.fill('[data-testid="preferred-date"]', testData.weddingDate);
  
  await page.click('[data-testid="send-inquiry"]');
  
  // Verify inquiry sent
  await expect(page.locator('[data-testid="inquiry-success"]')).toBeVisible({ timeout: 10000 });
  
  console.log(`✅ Vendor booking flow completed successfully on ${platform.deviceName || platform.browserName}`);
}

// Photo management flow (iOS-optimized)
async function executePhotoManagementFlow(page: Page, testData: any, platform: any) {
  console.log(`Testing photo management flow on ${platform.deviceName || platform.browserName}`);
  
  // Navigate to photo gallery
  await page.goto('/photos');
  await page.waitForLoadState('networkidle');
  
  await expect(page.locator('[data-testid="photo-gallery"]')).toBeVisible();
  
  // iOS: Test native-like photo interactions
  if (platform.deviceName && platform.deviceName.includes('iPhone')) {
    // Test pinch-to-zoom simulation
    await page.locator('[data-testid="photo-item-0"]').click();
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
    
    // Test swipe navigation
    await page.touchscreen.tap(300, 400);
  }
  
  // Create new photo album
  await page.click('[data-testid="create-album"]');
  await page.fill('[data-testid="album-name"]', 'Engagement Photos');
  await page.click('[data-testid="save-album"]');
  
  // Verify album creation
  await expect(page.locator('[data-testid="album-engagement-photos"]')).toBeVisible();
  
  // iOS: Test photo sharing
  if (platform.deviceName && platform.deviceName.includes('iPhone')) {
    await page.click('[data-testid="share-album"]');
    await expect(page.locator('[data-testid="sharing-options"]')).toBeVisible();
  }
  
  console.log(`✅ Photo management flow completed successfully on ${platform.deviceName || platform.browserName}`);
}

// Timeline management flow (Android-optimized)
async function executeTimelineManagementFlow(page: Page, testData: any, platform: any) {
  console.log(`Testing timeline management flow on ${platform.deviceName || platform.browserName}`);
  
  // Navigate to wedding timeline
  await page.goto('/timeline');
  await page.waitForLoadState('networkidle');
  
  await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible();
  
  // Android: Test material design interactions
  if (platform.deviceName && (platform.deviceName.includes('Galaxy') || platform.deviceName.includes('Pixel'))) {
    await expect(page.locator('[data-testid="material-timeline"]')).toBeVisible();
  }
  
  // Add timeline event
  await page.click('[data-testid="add-timeline-event"]');
  await page.fill('[data-testid="event-name"]', 'Ceremony');
  await page.fill('[data-testid="event-time"]', '15:30');
  await page.fill('[data-testid="event-location"]', testData.venue);
  
  // Android: Test drag-and-drop reordering
  if (platform.deviceName && platform.deviceName.includes('Galaxy')) {
    const eventItem = page.locator('[data-testid="timeline-event-0"]');
    await eventItem.hover();
    // Simulate drag gesture
    await page.mouse.down();
    await page.mouse.move(100, 50);
    await page.mouse.up();
  }
  
  await page.click('[data-testid="save-event"]');
  
  // Verify event added
  await expect(page.locator('[data-testid="event-ceremony"]')).toBeVisible();
  
  // Test timeline sharing
  await page.click('[data-testid="share-timeline"]');
  await expect(page.locator('[data-testid="share-timeline-modal"]')).toBeVisible();
  
  console.log(`✅ Timeline management flow completed successfully on ${platform.deviceName || platform.browserName}`);
}

// Performance and visual consistency tests
test.describe('Cross-Platform Performance & Consistency', () => {
  
  test('Visual consistency across all platforms', async ({ page }) => {
    // Test key pages for visual consistency
    const keyPages = ['/dashboard', '/vendors', '/timeline', '/photos'];
    
    for (const pagePath of keyPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot(`${pagePath.replace('/', '')}-cross-platform.png`);
    }
  });
  
  test('Performance metrics across platforms', async ({ page }) => {
    // Test Core Web Vitals on different viewports
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 390, height: 844, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      await page.goto('/dashboard');
      
      // Measure performance
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve({
              fcp: entries.find(entry => entry.name === 'first-contentful-paint')?.startTime,
              lcp: entries.find(entry => entry.entryType === 'largest-contentful-paint')?.startTime,
              cls: entries.find(entry => entry.entryType === 'layout-shift')?.value,
            });
          }).observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift'] });
        });
      });
      
      console.log(`Performance metrics for ${viewport.name}:`, performanceMetrics);
    }
  });
});

// Utility function for taking device-specific screenshots
export async function takeDeviceScreenshot(page: Page, name: string, platform: any) {
  const deviceName = platform.deviceName || `${platform.browserName}-${platform.os}`;
  const screenshotPath = `screenshots/cross-platform/${deviceName}/${name}.png`;
  
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  
  return screenshotPath;
}