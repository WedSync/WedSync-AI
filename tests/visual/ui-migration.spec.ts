import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing Suite for Session A & B UI Migrations
 * Testing all migrated components for visual consistency
 */

test.describe('UI Migration Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for all tests
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Mock authentication for consistent testing
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' } })
      });
    });
  });

  test('Dashboard Layout - Desktop View', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic content for consistent screenshots
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="last-updated"],
        .animate-pulse { 
          visibility: hidden !important; 
        }
      `
    });
    
    await expect(page).toHaveScreenshot('dashboard-desktop.png');
  });

  test('Dashboard Layout - Mobile View', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="last-updated"],
        .animate-pulse { 
          visibility: hidden !important; 
        }
      `
    });
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png');
  });

  test('Client Management Page', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="client-table"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('clients-page.png');
  });

  test('Vendor Management Page', async ({ page }) => {
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="vendor-grid"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('vendors-page.png');
  });

  test('Form Builder Interface', async ({ page }) => {
    await page.goto('/forms/builder');
    await page.waitForLoadState('networkidle');
    
    // Wait for form builder to initialize
    await page.waitForSelector('[data-testid="form-canvas"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="field-palette"]', { timeout: 15000 });
    
    await expect(page).toHaveScreenshot('form-builder.png');
  });

  test('Journey Builder Canvas', async ({ page }) => {
    await page.goto('/journeys');
    await page.waitForLoadState('networkidle');
    
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection {
          transition: none !important;
          animation: none !important;
        }
      `
    });
    
    await expect(page).toHaveScreenshot('journey-builder.png');
  });

  test('PDF Field Mapping Interface', async ({ page }) => {
    // Mock PDF data for consistent testing
    await page.route('**/api/pdf/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: [
            { name: 'client_name', type: 'text', x: 100, y: 100, width: 200, height: 30 },
            { name: 'wedding_date', type: 'date', x: 100, y: 150, width: 200, height: 30 }
          ]
        })
      });
    });
    
    await page.goto('/pdf/mapping');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="pdf-canvas"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('pdf-mapping.png');
  });

  test('Navigation Components - Header', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('header');
    await expect(header).toHaveScreenshot('navigation-header.png');
  });

  test('Navigation Components - Sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toHaveScreenshot('navigation-sidebar.png');
  });

  test('Mobile Navigation Menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await page.waitForSelector('[data-testid="mobile-nav"]', { state: 'visible' });
    
    await expect(page.locator('[data-testid="mobile-nav"]')).toHaveScreenshot('mobile-navigation.png');
  });

  test('Form Components - Field Palette', async ({ page }) => {
    await page.goto('/forms/builder');
    await page.waitForLoadState('networkidle');
    
    const palette = page.locator('[data-testid="field-palette"]');
    await expect(palette).toHaveScreenshot('field-palette.png');
  });

  test('Form Components - Canvas Empty State', async ({ page }) => {
    await page.goto('/forms/builder');
    await page.waitForLoadState('networkidle');
    
    const canvas = page.locator('[data-testid="form-canvas"]');
    await expect(canvas).toHaveScreenshot('form-canvas-empty.png');
  });

  test('UI Components - Buttons and Controls', async ({ page }) => {
    await page.goto('/components/demo'); // Assuming a component demo page exists
    await page.waitForLoadState('networkidle');
    
    // If demo page doesn't exist, test buttons on dashboard
    if (await page.locator('text=Not Found').count() > 0) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    }
    
    await expect(page).toHaveScreenshot('ui-components.png');
  });

  test('Analytics Dashboard Components', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    // Mock analytics data for consistent visuals
    await page.route('**/api/analytics/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalClients: 150,
            totalVendors: 75,
            activeJourneys: 25,
            completionRate: 85
          }
        })
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('analytics-dashboard.png');
  });

  test('Error States and Loading States', async ({ page }) => {
    // Test loading state
    await page.route('**/api/clients', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }, 5000);
    });
    
    await page.goto('/clients');
    
    // Capture loading state
    await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 5000 });
    await expect(page).toHaveScreenshot('loading-state.png');
  });

  test('Form Validation States', async ({ page }) => {
    await page.goto('/forms/builder');
    await page.waitForLoadState('networkidle');
    
    // Add a form field and trigger validation
    await page.click('[data-testid="add-text-field"]');
    await page.click('[data-testid="save-form"]');
    
    // Wait for validation errors to appear
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    
    await expect(page).toHaveScreenshot('form-validation-errors.png');
  });

  test('Cross-browser Consistency - Chrome vs Firefox', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.addStyleTag({
      content: `
        [data-testid="current-time"],
        [data-testid="last-updated"],
        .animate-pulse { 
          visibility: hidden !important; 
        }
      `
    });
    
    await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`);
  });

  test('Theme Consistency Check', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test both light and dark themes if supported
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForTimeout(500); // Wait for theme transition
    
    await expect(page).toHaveScreenshot('dashboard-dark-theme.png');
  });

  test('Responsive Breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 1920, height: 1080, name: 'desktop-xl' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await page.addStyleTag({
        content: `
          [data-testid="current-time"],
          [data-testid="last-updated"],
          .animate-pulse { 
            visibility: hidden !important; 
          }
        `
      });
      
      await expect(page).toHaveScreenshot(`dashboard-${breakpoint.name}.png`);
    }
  });
});