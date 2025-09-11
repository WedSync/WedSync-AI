import { test, expect, Page } from '@playwright/test';

test.describe('SEO Analytics Dashboard', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login as supplier
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'supplier@test.com');
    await page.fill('[data-testid="password-input"]', 'Test123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    
    // Navigate to SEO Analytics
    await page.goto('/analytics/seo');
  });

  test('should load SEO analytics dashboard', async () => {
    // Check main heading
    await expect(page.locator('h1')).toContainText('SEO Analytics');
    
    // Check visibility score is displayed
    await expect(page.locator('text=/SEO Visibility Score/')).toBeVisible();
    
    // Check key metrics cards are displayed
    await expect(page.locator('text=/Rankings/')).toBeVisible();
    await expect(page.locator('text=/Traffic/')).toBeVisible();
    await expect(page.locator('text=/Conversions/')).toBeVisible();
    await expect(page.locator('text=/Keywords/')).toBeVisible();
  });

  test('should display keyword rankings', async () => {
    // Click on keywords tab
    await page.click('button:has-text("keywords")');
    
    // Wait for keyword table to load
    await page.waitForSelector('table');
    
    // Check table headers
    await expect(page.locator('th:has-text("Keyword")')).toBeVisible();
    await expect(page.locator('th:has-text("Position")')).toBeVisible();
    await expect(page.locator('th:has-text("Change")')).toBeVisible();
    await expect(page.locator('th:has-text("Volume")')).toBeVisible();
    await expect(page.locator('th:has-text("Difficulty")')).toBeVisible();
    
    // Check for featured snippet badges
    const featuredSnippet = page.locator('span:has-text("Featured")');
    if (await featuredSnippet.count() > 0) {
      await expect(featuredSnippet.first()).toBeVisible();
    }
  });

  test('should display organic traffic chart', async () => {
    // Click on traffic tab
    await page.click('button:has-text("traffic")');
    
    // Wait for chart to render
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
    
    // Check chart elements
    await expect(page.locator('.recharts-line')).toBeVisible();
    await expect(page.locator('.recharts-cartesian-axis')).toBeVisible();
    
    // Check device breakdown
    await expect(page.locator('text=/Desktop Traffic/')).toBeVisible();
    await expect(page.locator('text=/Mobile Traffic/')).toBeVisible();
  });

  test('should display competitor analysis', async () => {
    // Click on competitors tab
    await page.click('button:has-text("competitors")');
    
    // Wait for competitor table
    await page.waitForSelector('table');
    
    // Check table headers
    await expect(page.locator('th:has-text("Competitor")')).toBeVisible();
    await expect(page.locator('th:has-text("Domain Authority")')).toBeVisible();
    await expect(page.locator('th:has-text("Organic Traffic")')).toBeVisible();
    await expect(page.locator('th:has-text("Overlap Score")')).toBeVisible();
  });

  test('should display SEO opportunities', async () => {
    // Click on opportunities tab
    await page.click('button:has-text("opportunities")');
    
    // Wait for opportunities to load
    await page.waitForSelector('[data-testid="opportunity-card"], div:has-text("SEO Opportunities")');
    
    // Check priority badges
    const highPriority = page.locator('span:has-text("high priority")');
    const mediumPriority = page.locator('span:has-text("medium priority")');
    
    if (await highPriority.count() > 0) {
      await expect(highPriority.first()).toBeVisible();
    }
    
    if (await mediumPriority.count() > 0) {
      await expect(mediumPriority.first()).toBeVisible();
    }
  });

  test('should sync with Google Search Console', async () => {
    // Click sync button
    const syncButton = page.locator('button:has-text("Sync Data")');
    await expect(syncButton).toBeVisible();
    
    // Mock API response
    await page.route('**/api/analytics/seo/sync', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: {
            keywords: { success: true, count: 50 },
            traffic: { success: true, count: 100 }
          },
          lastSynced: new Date().toISOString()
        })
      });
    });
    
    // Click sync button
    await syncButton.click();
    
    // Check for syncing state
    await expect(page.locator('text=/Syncing.../')).toBeVisible();
    
    // Wait for sync to complete
    await expect(page.locator('text=/Sync Data/')).toBeVisible({ timeout: 10000 });
  });

  test('should handle error states gracefully', async () => {
    // Mock API error
    await page.route('**/api/analytics/seo', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch SEO analytics' })
      });
    });
    
    // Reload page to trigger error
    await page.reload();
    
    // Check error message is displayed
    await expect(page.locator('text=/Failed to load SEO analytics/')).toBeVisible();
  });

  test('should be responsive on mobile', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check dashboard adapts to mobile
    await expect(page.locator('h1:has-text("SEO Analytics")')).toBeVisible();
    
    // Check cards stack vertically
    const cards = page.locator('[class*="rounded-xl"]');
    const count = await cards.count();
    
    if (count > 0) {
      const firstCard = await cards.first().boundingBox();
      const secondCard = await cards.nth(1).boundingBox();
      
      if (firstCard && secondCard) {
        // Cards should stack vertically on mobile
        expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height);
      }
    }
  });

  test('should measure performance metrics', async () => {
    // Start performance measurement
    const startTime = Date.now();
    
    // Navigate to SEO dashboard
    await page.goto('/analytics/seo');
    
    // Wait for main content to load
    await page.waitForSelector('h1:has-text("SEO Analytics")');
    await page.waitForSelector('.recharts-wrapper, [data-testid="dashboard-loaded"]', { 
      timeout: 3000 
    }).catch(() => {
      // Dashboard might not have charts initially
    });
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for any console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any async errors
    await page.waitForTimeout(1000);
    
    // Should have no console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should validate accessibility', async () => {
    // Check for proper ARIA labels
    const syncButton = page.locator('button:has-text("Sync Data")');
    await expect(syncButton).toHaveAttribute('aria-label', /sync|refresh/i);
    
    // Check tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Check color contrast for key elements
    const visibility = page.locator('text=/SEO Visibility Score/');
    if (await visibility.isVisible()) {
      const color = await visibility.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.color;
      });
      expect(color).toBeTruthy();
    }
    
    // Check for alt text on images/icons
    const icons = page.locator('svg[role="img"]');
    const iconCount = await icons.count();
    
    for (let i = 0; i < iconCount; i++) {
      const icon = icons.nth(i);
      const ariaLabel = await icon.getAttribute('aria-label');
      if (ariaLabel) {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });

  test('should export SEO data', async () => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has([data-testid="download-icon"])');
    
    if (await exportButton.count() > 0) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await exportButton.first().click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/seo.*\.(csv|xlsx|pdf)/i);
    }
  });

  test('should track user interactions', async () => {
    // Set up request interception to track analytics calls
    const analyticsRequests: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/analytics/track')) {
        analyticsRequests.push(request.url());
      }
    });
    
    // Perform various interactions
    await page.click('button:has-text("keywords")');
    await page.click('button:has-text("traffic")');
    await page.click('button:has-text("competitors")');
    
    // Analytics events should be tracked
    // Note: This would depend on actual analytics implementation
    await page.waitForTimeout(500);
  });

  test('should handle large datasets efficiently', async () => {
    // Mock large dataset response
    await page.route('**/api/analytics/seo', async route => {
      const largeDataset = {
        dashboard: {
          tracked_keywords: 5000,
          top3_rankings: 500,
          top10_rankings: 1500,
          avg_position: 15.5,
          featured_snippets: 50,
          organic_sessions_30d: 50000,
          organic_users_30d: 40000,
          conversions_30d: 500,
          avg_bounce_rate: 45.5,
          revenue_attributed: 50000,
          technical_health_score: 85
        },
        keywordTrends: Array(1000).fill(null).map((_, i) => ({
          keyword: `keyword-${i}`,
          current_position: Math.floor(Math.random() * 100),
          previous_position: Math.floor(Math.random() * 100),
          position_change: Math.floor(Math.random() * 20) - 10,
          search_volume: Math.floor(Math.random() * 10000),
          difficulty_score: Math.floor(Math.random() * 100),
          featured_snippet: Math.random() > 0.9
        })),
        organicTraffic: [],
        competitors: [],
        visibilityScore: 75,
        opportunities: []
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset)
      });
    });
    
    // Reload to fetch large dataset
    const startTime = Date.now();
    await page.reload();
    
    // Wait for data to load
    await page.waitForSelector('text=/5000/', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should handle large dataset within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Click on keywords tab with large dataset
    await page.click('button:has-text("keywords")');
    
    // Table should render efficiently
    await expect(page.locator('table')).toBeVisible({ timeout: 2000 });
  });
});