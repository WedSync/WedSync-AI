/**
 * CRM Integration Visual Regression Tests - WS-343 Team E
 * Comprehensive visual regression testing for UI consistency
 */

import { test, expect } from '@playwright/test';

test.describe('CRM Integration Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated user
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'photographer@example.com',
          user_metadata: { business_name: 'Sarah Johnson Photography' }
        }
      }));
    });

    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard layout consistency', async ({ page }) => {
    // Test empty state
    await expect(page).toHaveScreenshot('crm-dashboard-empty.png');

    // Test with integrations
    await page.evaluate(() => {
      window.localStorage.setItem('crm-integrations', JSON.stringify({
        tave: { status: 'connected', provider: 'tave', last_sync: '2024-01-31T10:00:00Z' },
        honeybook: { status: 'disconnected', provider: 'honeybook', error: 'API key expired' }
      }));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('crm-dashboard-with-integrations.png');
  });

  test('Provider selection wizard', async ({ page }) => {
    await page.click('[data-testid="add-integration-button"]');
    await expect(page).toHaveScreenshot('provider-wizard-main.png');

    // Test provider cards hover states
    await page.hover('[data-testid="provider-tave"]');
    await expect(page).toHaveScreenshot('provider-card-hover.png');
  });

  test('Field mapping interface', async ({ page }) => {
    // Setup connected Tave integration
    await page.evaluate(() => {
      window.localStorage.setItem('crm-integrations', JSON.stringify({
        tave: { status: 'connected', provider: 'tave' }
      }));
    });
    
    await page.reload();
    await page.click('[data-testid="tave-settings-button"]');
    await page.click('[data-testid="field-mapping-tab"]');
    
    await expect(page).toHaveScreenshot('field-mapping-default.png');

    // Test custom mapping configuration
    await page.selectOption('[data-testid="field-client_name"]', 'display_name');
    await page.selectOption('[data-testid="field-shoot_date"]', 'wedding_date');
    await expect(page).toHaveScreenshot('field-mapping-configured.png');
  });

  test('Sync progress indicators', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('crm-integrations', JSON.stringify({
        tave: { status: 'connected', provider: 'tave' }
      }));
    });
    
    await page.reload();
    await page.click('[data-testid="tave-sync-button"]');
    
    // Mock in-progress sync
    await page.route('**/api/crm/import**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          imported: 45,
          total: 200,
          partial: true,
          progress: 22.5
        })
      });
    });
    
    await page.click('[data-testid="start-import-button"]');
    await page.waitForSelector('[data-testid="import-progress"]');
    
    await expect(page).toHaveScreenshot('sync-progress-indicator.png');
  });

  test('Error states visual consistency', async ({ page }) => {
    // Test connection error
    await page.click('[data-testid="add-integration-button"]');
    await page.click('[data-testid="provider-lightblue"]');
    
    await page.route('**/api/crm/test-connection', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid API key',
          message: 'The provided API key is not valid'
        })
      });
    });
    
    await page.fill('[data-testid="api-key-input"]', 'invalid-key');
    await page.click('[data-testid="test-connection-button"]');
    
    await expect(page).toHaveScreenshot('connection-error-state.png');

    // Test rate limit error
    await page.route('**/api/crm/test-connection', route => {
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '60' },
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retry_after: 60
        })
      });
    });
    
    await page.click('[data-testid="test-connection-button"]');
    await expect(page).toHaveScreenshot('rate-limit-error-state.png');
  });

  test('Mobile responsive layouts', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await expect(page).toHaveScreenshot('mobile-dashboard.png');
    
    await page.click('[data-testid="add-integration-button"]');
    await expect(page).toHaveScreenshot('mobile-provider-selection.png');
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await expect(page).toHaveScreenshot('tablet-provider-selection.png');
  });

  test('Dark mode consistency', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page).toHaveScreenshot('dark-mode-dashboard.png');
    
    await page.click('[data-testid="add-integration-button"]');
    await expect(page).toHaveScreenshot('dark-mode-provider-selection.png');
  });

  test('High contrast mode', async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.classList.add('high-contrast');
    });
    
    await expect(page).toHaveScreenshot('high-contrast-dashboard.png');
    
    await page.click('[data-testid="add-integration-button"]');
    await expect(page).toHaveScreenshot('high-contrast-providers.png');
  });
});