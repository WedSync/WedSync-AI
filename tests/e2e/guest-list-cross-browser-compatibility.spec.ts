import { test, expect, BrowserName } from '@playwright/test';

const BROWSERS: BrowserName[] = ['chromium', 'firefox', 'webkit'];
const VIEWPORT_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 375, height: 812 }, // iPhone X
];

// Cross-browser compatibility tests for WS-151 Guest List Builder
for (const browserName of BROWSERS) {
  test.describe(`Guest List Builder - ${browserName}`, () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/clients/test-client/guests');
      await page.waitForLoadState('networkidle');
    });

    test(`should load guest list builder correctly on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      // Verify page loads
      await expect(page).toHaveTitle(/WedSync/);
      
      // Check main components are visible
      await expect(page.locator('[data-testid="guest-list-builder"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-guests-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="guest-search"]')).toBeVisible();
      
      // Verify responsive design
      for (const viewport of VIEWPORT_SIZES) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500); // Allow layout to adjust
        
        if (viewport.width < 768) {
          // Mobile view checks
          await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
        } else {
          // Desktop view checks
          await expect(page.locator('[data-testid="guest-table"]')).toBeVisible();
        }
      }
    });

    test(`file upload should work consistently on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      await page.locator('[data-testid="import-guests-button"]').click();
      
      // Test file upload input
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
      
      // Create a test CSV file
      const csvContent = `First Name,Last Name,Email
John,Doe,john@example.com
Jane,Smith,jane@example.com`;
      
      await fileInput.setInputFiles({
        name: 'test-guests.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      // Verify upload feedback
      await expect(page.locator('[data-testid="upload-status"]')).toContainText('File uploaded');
      
      // Test drag and drop (if supported)
      if (browserName !== 'webkit') { // Safari has limited drag/drop support
        const dropZone = page.locator('[data-testid="file-drop-zone"]');
        await expect(dropZone).toBeVisible();
        
        // Simulate drag and drop events
        await dropZone.dispatchEvent('dragenter', { dataTransfer: { files: [] } });
        await dropZone.dispatchEvent('dragover', { dataTransfer: { files: [] } });
        await dropZone.dispatchEvent('drop', { 
          dataTransfer: { 
            files: [new File([csvContent], 'drag-test.csv', { type: 'text/csv' })]
          }
        });
      }
    });

    test(`form interactions should be consistent on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      // Test form field interactions
      await page.locator('[data-testid="add-guest-button"]').click();
      
      const firstNameInput = page.locator('[data-testid="first-name-input"]');
      const lastNameInput = page.locator('[data-testid="last-name-input"]');
      const emailInput = page.locator('[data-testid="email-input"]');
      
      await firstNameInput.fill('Test');
      await lastNameInput.fill('User');
      await emailInput.fill('test@example.com');
      
      // Verify form validation works consistently
      await emailInput.clear();
      await emailInput.fill('invalid-email');
      await page.locator('[data-testid="save-guest-button"]').click();
      
      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
      
      // Fix email and save
      await emailInput.clear();
      await emailInput.fill('test@example.com');
      await page.locator('[data-testid="save-guest-button"]').click();
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test(`search and filtering should work on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      // Test search functionality
      const searchInput = page.locator('[data-testid="guest-search"]');
      await searchInput.fill('John');
      await page.waitForTimeout(300); // Debounce delay
      
      // Verify search results
      const guestRows = page.locator('[data-testid="guest-row"]');
      await expect(guestRows).toHaveCount(1);
      await expect(guestRows.first()).toContainText('John');
      
      // Test filter dropdown
      await page.locator('[data-testid="status-filter"]').click();
      await page.locator('[data-testid="status-invited"]').click();
      
      // Verify filtering
      await expect(page.locator('[data-testid="filter-badge"]')).toContainText('Invited');
      
      // Clear filters
      await page.locator('[data-testid="clear-filters"]').click();
      await expect(page.locator('[data-testid="filter-badge"]')).not.toBeVisible();
    });

    test(`bulk operations should work on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      // Select multiple guests
      await page.locator('[data-testid="select-all-checkbox"]').check();
      
      // Verify bulk actions appear
      await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
      
      // Test bulk status update
      await page.locator('[data-testid="bulk-status-button"]').click();
      await page.locator('[data-testid="status-confirmed"]').click();
      await page.locator('[data-testid="confirm-bulk-update"]').click();
      
      // Verify success message
      await expect(page.locator('[data-testid="bulk-success-message"]')).toBeVisible();
      
      // Test bulk delete
      await page.locator('[data-testid="select-all-checkbox"]').check();
      await page.locator('[data-testid="bulk-delete-button"]').click();
      await page.locator('[data-testid="confirm-delete"]').click();
      
      await expect(page.locator('[data-testid="delete-success-message"]')).toBeVisible();
    });

    test(`keyboard navigation should work on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="import-guests-button"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="guest-search"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="add-guest-button"]')).toBeFocused();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="guest-form-modal"]')).toBeVisible();
      
      // Test Escape key
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="guest-form-modal"]')).not.toBeVisible();
    });

    test(`performance should be acceptable on ${browserName}`, async ({ page, browserName: browser }) => {
      test.skip(browser !== browserName, `Test only for ${browserName}`);
      
      // Measure page load time
      const startTime = Date.now();
      await page.goto('/dashboard/clients/test-client/guests');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3 second load time threshold
      
      // Measure search performance
      const searchStart = Date.now();
      await page.locator('[data-testid="guest-search"]').fill('performance test');
      await page.waitForTimeout(500); // Wait for search debounce
      const searchTime = Date.now() - searchStart;
      
      expect(searchTime).toBeLessThan(1000); // 1 second search response
      
      // Test scroll performance with large dataset
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(100);
      }
      
      // Verify smooth scrolling (no layout thrashing)
      const scrollMetrics = await page.evaluate(() => {
        return {
          scrollTop: window.scrollY,
          clientHeight: document.documentElement.clientHeight
        };
      });
      
      expect(scrollMetrics.scrollTop).toBeGreaterThan(0);
    });

    for (const viewport of VIEWPORT_SIZES) {
      test(`responsive design should work at ${viewport.width}x${viewport.height} on ${browserName}`, async ({ page, browserName: browser }) => {
        test.skip(browser !== browserName, `Test only for ${browserName}`);
        
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        if (viewport.width < 768) {
          // Mobile-specific tests
          await expect(page.locator('[data-testid="mobile-guest-card"]')).toBeVisible();
          await expect(page.locator('[data-testid="desktop-table"]')).not.toBeVisible();
          
          // Test mobile navigation
          await page.locator('[data-testid="mobile-menu-toggle"]').click();
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
          
        } else if (viewport.width < 1024) {
          // Tablet-specific tests
          await expect(page.locator('[data-testid="tablet-view"]')).toBeVisible();
          
        } else {
          // Desktop-specific tests
          await expect(page.locator('[data-testid="desktop-table"]')).toBeVisible();
          await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
        }
        
        // Test touch interactions on mobile
        if (viewport.width < 768) {
          const guestCard = page.locator('[data-testid="mobile-guest-card"]').first();
          
          // Test swipe gestures (if supported)
          const box = await guestCard.boundingBox();
          if (box) {
            await page.mouse.move(box.x + 10, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
            await page.mouse.up();
            
            // Verify swipe action worked
            await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible();
          }
        }
      });
    }
  });
}

// Browser-specific feature tests
test.describe('Browser-Specific Features', () => {
  
  test('Safari-specific tests', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-only tests');
    
    // Test Safari-specific form behaviors
    await page.goto('/dashboard/clients/test-client/guests');
    
    // Test date inputs (Safari handles differently)
    await page.locator('[data-testid="add-guest-button"]').click();
    const dateInput = page.locator('[data-testid="wedding-date-input"]');
    
    await dateInput.focus();
    await dateInput.fill('2024-12-25');
    
    const dateValue = await dateInput.inputValue();
    expect(dateValue).toBe('2024-12-25');
    
    // Test Safari file upload limitations
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.csv,.xlsx,.xls');
  });

  test('Firefox-specific tests', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-only tests');
    
    await page.goto('/dashboard/clients/test-client/guests');
    
    // Test Firefox scrollbar behavior
    await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).scrollbarWidth;
    });
    
    // Test Firefox-specific CSS features
    const guestTable = page.locator('[data-testid="guest-table"]');
    await expect(guestTable).toBeVisible();
    
    // Verify Firefox handles CSS Grid properly
    const gridStyles = await guestTable.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        gridTemplateColumns: styles.gridTemplateColumns
      };
    });
    
    expect(gridStyles.display).toBe('grid');
  });

  test('Chrome-specific tests', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only tests');
    
    await page.goto('/dashboard/clients/test-client/guests');
    
    // Test Chrome DevTools Performance API
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation').length;
    });
    
    expect(performanceEntries).toBeGreaterThan(0);
    
    // Test Chrome-specific drag and drop
    const dragSource = page.locator('[data-testid="guest-row"]').first();
    const dropTarget = page.locator('[data-testid="table-group-area"]');
    
    await dragSource.dragTo(dropTarget);
    await expect(page.locator('[data-testid="drag-success-message"]')).toBeVisible();
  });
});

// Cross-browser data consistency tests
test.describe('Cross-Browser Data Consistency', () => {
  
  test('form data should persist consistently across browsers', async ({ page }) => {
    await page.goto('/dashboard/clients/test-client/guests');
    
    // Add guest data
    await page.locator('[data-testid="add-guest-button"]').click();
    await page.locator('[data-testid="first-name-input"]').fill('Consistency');
    await page.locator('[data-testid="last-name-input"]').fill('Test');
    await page.locator('[data-testid="email-input"]').fill('consistency@test.com');
    await page.locator('[data-testid="save-guest-button"]').click();
    
    // Verify data appears in table
    await expect(page.locator('[data-testid="guest-row"]')).toContainText('Consistency Test');
    
    // Refresh page and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('[data-testid="guest-row"]')).toContainText('Consistency Test');
  });

  test('CSV export should work consistently across browsers', async ({ page }) => {
    await page.goto('/dashboard/clients/test-client/guests');
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    await page.locator('[data-testid="export-button"]').click();
    await page.locator('[data-testid="export-csv"]').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/guest-list.*\.csv$/);
    
    // Verify file content
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});