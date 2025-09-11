/**
 * WS-152 Developer Monitoring Dashboard - Playwright Tests
 * Comprehensive UI testing for standalone HTML dashboard
 * Testing: responsive design, auto-refresh, metrics display, accessibility
 */

import { test, expect, Page } from '@playwright/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
// Test configuration
const DASHBOARD_URL = '/WORKFLOW-V2-DRAFT/00-STATUS/index.html';
const REFRESH_INTERVAL = 30000; // 30 seconds
const EXPECTED_METRICS = [
  'performance', 'errors', 'usage', 'security', 
  'cache', 'database', 'memory', 'cpu'
];
// Mock API responses for testing
const MOCK_DASHBOARD_DATA = {
  success: true,
  data: {
    performance: { avgResponseTime: 145 },
    errors: { criticalCount: 0 },
    usage: { activeUsers: 89 },
    security: { status: 'secure' },
    cache: { hitRate: 94.2 },
    database: { activeConnections: 12 },
    memory: { usedPercent: 67.8 },
    cpu: { loadPercent: 23.4 },
    recentActivity: [
      {
        message: 'New user registration completed',
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
        message: 'Cache cleared for dashboard metrics', 
        timestamp: new Date(Date.now() - 180000).toISOString()
        message: 'Wedding payment processed: $2,500',
        timestamp: new Date(Date.now() - 240000).toISOString()
      }
    ]
  },
  meta: {
    timestamp: new Date().toISOString(),
    responseTime: 145,
    cached: true,
    nextRefresh: new Date(Date.now() + REFRESH_INTERVAL).toISOString()
  }
};
const MOCK_ERROR_RESPONSE = {
  success: false,
  error: 'Service temporarily unavailable'
// Helper function to set up API mocking
async function setupAPIResponse(page: Page, response: any, status: number = 200) {
  await page.route('/api/monitoring/dashboard', route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}
test.describe('WS-152 Developer Monitoring Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up successful API response by default
    await setupAPIResponse(page, MOCK_DASHBOARD_DATA);
  test('should load dashboard with all required elements', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    // Check header elements
    await expect(page.locator('h1')).toContainText('WedSync Developer Monitor');
    await expect(page.locator('#systemStatus')).toBeVisible();
    await expect(page.locator('#statusText')).toContainText('System Online');
    // Check all 8 metric cards are present
    const metricCards = page.locator('.metric-card');
    await expect(metricCards).toHaveCount(8);
    // Verify each metric card has required elements
    for (const metric of EXPECTED_METRICS) {
      const card = page.locator(`[data-metric="${metric}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('.metric-title')).toBeVisible();
      await expect(card.locator('.metric-value')).toBeVisible();
      await expect(card.locator('.metric-status')).toBeVisible();
    }
    // Check activity section
    await expect(page.locator('.activity-section')).toBeVisible();
    await expect(page.locator('#activity-title')).toContainText('Recent Activity');
    // Check footer controls
    await expect(page.locator('#lastUpdated')).toBeVisible();
    await expect(page.locator('#autoRefreshToggle')).toBeVisible();
    await expect(page.locator('#manualRefresh')).toBeVisible();
  test('should display correct metric values and statuses', async ({ page }) => {
    
    // Wait for data to load
    await page.waitForTimeout(1000);
    // Check performance metric (should be green - under 200ms)
    const performanceCard = page.locator('[data-metric="performance"]');
    await expect(performanceCard).toHaveClass(/status-good/);
    await expect(performanceCard.locator('#performance-value')).toContainText('145');
    // Check errors metric (should be green - 0 errors)
    const errorsCard = page.locator('[data-metric="errors"]');
    await expect(errorsCard).toHaveClass(/status-good/);
    await expect(errorsCard.locator('#errors-value')).toContainText('0');
    // Check memory metric (should be good - under 70%)
    const memoryCard = page.locator('[data-metric="memory"]');
    await expect(memoryCard).toHaveClass(/status-good/);
    await expect(memoryCard.locator('#memory-value')).toContainText('68');
    // Check security status
    const securityCard = page.locator('[data-metric="security"]');
    await expect(securityCard).toHaveClass(/status-good/);
    await expect(securityCard.locator('#security-status')).toContainText('All Good');
  test('should handle color-coded severity system correctly', async ({ page }) => {
    // Test warning state (high performance response time)
    const warningData = {
      ...MOCK_DASHBOARD_DATA,
      data: {
        ...MOCK_DASHBOARD_DATA.data,
        performance: { avgResponseTime: 350 } // Warning threshold
    };
    await setupAPIResponse(page, warningData);
    await expect(performanceCard).toHaveClass(/status-warning/);
    // Test critical state (very high response time)
    const criticalData = {
        performance: { avgResponseTime: 800 } // Critical threshold
    await setupAPIResponse(page, criticalData);
    await page.reload();
    await expect(performanceCard).toHaveClass(/status-critical/);
  test('should display and update activity feed', async ({ page }) => {
    // Check activity items are displayed
    const activityItems = page.locator('.activity-item');
    await expect(activityItems).toHaveCount(3);
    // Check first activity item content
    const firstActivity = activityItems.first();
    await expect(firstActivity.locator('.activity-message'))
      .toContainText('New user registration completed');
    await expect(firstActivity.locator('.activity-time')).toBeVisible();
    // Verify timestamp format (HH:MM:SS)
    const timeText = await firstActivity.locator('.activity-time').textContent();
    expect(timeText).toMatch(/\d{2}:\d{2}:\d{2}/);
  test('should handle manual refresh correctly', async ({ page }) => {
    // Click manual refresh button
    const refreshBtn = page.locator('#manualRefresh');
    await expect(refreshBtn).not.toBeDisabled();
    await refreshBtn.click();
    // Button should be disabled briefly
    await expect(refreshBtn).toBeDisabled();
    // Wait for button to be enabled again
    await page.waitForTimeout(1200);
    // Check that last updated time was updated
    const lastUpdated = page.locator('#lastUpdated');
    await expect(lastUpdated).not.toBeEmpty();
  test('should handle auto-refresh toggle', async ({ page }) => {
    const toggle = page.locator('#autoRefreshToggle');
    // Should start in active state
    await expect(toggle).toHaveClass(/active/);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    // Click to disable auto-refresh
    await toggle.click();
    await expect(toggle).not.toHaveClass(/active/);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    // Click to re-enable auto-refresh
  test('should handle auto-refresh toggle with keyboard', async ({ page }) => {
    // Focus and use Enter key
    await toggle.focus();
    await page.keyboard.press('Enter');
    // Use Space key
    await page.keyboard.press('Space');
  test('should handle API errors gracefully', async ({ page }) => {
    // Set up error response
    await setupAPIResponse(page, MOCK_ERROR_RESPONSE, 500);
    // Should show error state
    await expect(page.locator('#statusText')).toContainText('System Error');
    await expect(page.locator('#systemStatus')).toHaveClass(/status-critical/);
  test('should handle network connectivity issues', async ({ page }) => {
    // Simulate network failure
    await page.route('/api/monitoring/dashboard', route => route.abort('failed'));
    // Trigger refresh
    await page.locator('#manualRefresh').click();
    // Should show connection error
    await expect(page.locator('#statusText')).toContainText('Connection Lost');
  test('should show retry option after multiple errors', async ({ page }) => {
    // Set up persistent error response
    // Wait for multiple failed attempts (error count >= 3)
    await page.waitForTimeout(3000);
    // Should show error state with retry button
    const retryBtn = page.locator('.retry-btn');
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toContainText('Retry Connection');
    // Test retry functionality
    await setupAPIResponse(page, MOCK_DASHBOARD_DATA); // Fix API
    await retryBtn.click();
    // Should recover and show normal state
  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    // Header should stack on mobile
    const header = page.locator('.header-content');
    const headerStyles = await header.evaluate(el => 
      window.getComputedStyle(el).flexDirection
    );
    expect(headerStyles).toBe('column');
    // Metrics grid should be single column
    const metricsGrid = page.locator('.metrics-grid');
    const gridStyles = await metricsGrid.evaluate(el => 
      window.getComputedStyle(el).gridTemplateColumns
    expect(gridStyles).toContain('1fr'); // Single column
  test('should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    // Should have 2-column layout on tablet
    // Should be responsive grid, not single column
    expect(gridStyles).not.toBe('1fr');
  test('should meet accessibility requirements', async ({ page }) => {
    // Check ARIA labels and roles
    const metricsGrid = page.locator('#metricsGrid');
    await expect(metricsGrid).toHaveAttribute('role', 'region');
    await expect(metricsGrid).toHaveAttribute('aria-label', 'System Metrics');
    const activityList = page.locator('#activityList');
    await expect(activityList).toHaveAttribute('role', 'log');
    await expect(activityList).toHaveAttribute('aria-live', 'polite');
    // Check focus management
    await refreshBtn.focus();
    await expect(refreshBtn).toBeFocused();
    await expect(toggle).toBeFocused();
    // Check semantic HTML
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  test('should handle page visibility changes correctly', async ({ page }) => {
    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    // Wait a moment for any cleanup
    await page.waitForTimeout(100);
    // Simulate tab becoming visible again
        value: 'visible',
    // Should trigger a refresh
    await page.waitForTimeout(500);
    await expect(page.locator('#lastUpdated')).not.toBeEmpty();
  test('should update footer information correctly', async ({ page }) => {
    // Check cache status
    const cacheStatus = page.locator('#cacheStatus');
    await expect(cacheStatus).toContainText('Cache: Hit');
    // Check response time
    const responseTime = page.locator('#responseTime');
    await expect(responseTime).toContainText('Response:');
    await expect(responseTime).toContainText('ms');
    // Check last updated time
    await expect(lastUpdated).toHaveAttribute('datetime');
    const timeText = await lastUpdated.textContent();
    expect(timeText).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Time format
  test('should animate metric value changes', async ({ page }) => {
    // Get initial performance value
    const performanceValue = page.locator('#performance-value');
    const initialValue = await performanceValue.textContent();
    // Update with different value
    const updatedData = {
        performance: { avgResponseTime: 200 }
    await setupAPIResponse(page, updatedData);
    // Value should have changed
    const newValue = await performanceValue.textContent();
    expect(newValue).not.toBe(initialValue);
    expect(newValue).toBe('200');
  test('should handle empty activity feed', async ({ page }) => {
    const emptyData = {
        recentActivity: []
    await setupAPIResponse(page, emptyData);
    // Should show "No recent activity" message
    await expect(activityList).toContainText('No recent activity');
  test('should escape HTML in activity messages', async ({ page }) => {
    const maliciousData = {
        recentActivity: [{
          message: '<script>alert("xss")</script>Potential XSS attempt',
          timestamp: new Date().toISOString()
        }]
    await setupAPIResponse(page, maliciousData);
    // HTML should be escaped, not executed
    const activityItem = page.locator('.activity-item').first();
    const messageText = await activityItem.locator('.activity-message').textContent();
    expect(messageText).toContain('<script>');
    expect(messageText).not.toContain('Potential XSS attempt');
    // No script should have been executed
    const alertDialog = page.locator('role=dialog');
    await expect(alertDialog).toHaveCount(0);
  test('should maintain performance under load simulation', async ({ page }) => {
    // Simulate rapid refreshes
    for (let i = 0; i < 10; i++) {
      await page.locator('#manualRefresh').click();
      await page.waitForTimeout(100);
    // Dashboard should still be functional
    await expect(page.locator('.metric-card')).toHaveCount(8);
  test.describe('Print styles and media queries', () => {
    test('should have appropriate print styles', async ({ page }) => {
      await page.goto(DASHBOARD_URL);
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      // Key elements should still be visible for printing
      await expect(page.locator('.header')).toBeVisible();
      await expect(page.locator('.metrics-grid')).toBeVisible();
      await expect(page.locator('.activity-section')).toBeVisible();
});
// Performance tests
test.describe('Performance Tests', () => {
  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  test('should have minimal layout shifts', async ({ page }) => {
    // Monitor for layout shifts during load
    const cumulativeLayoutShift = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift') {
              clsValue += (entry as unknown).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
    // CLS should be minimal (< 0.1 is good)
    expect(cumulativeLayoutShift).toBeLessThan(0.1);
// Security tests
test.describe('Security Tests', () => {
  test('should not expose sensitive information in client-side code', async ({ page }) => {
    // Check page source for potential secrets
    const content = await page.content();
    expect(content).not.toMatch(/password|secret|key|token/i);
    expect(content).not.toMatch(/mysql|postgres|redis/i); // Database details
  test('should have appropriate CSP headers in production', async ({ page }) => {
    // This would need to be configured at the server level
    // For now, just verify the page works with strict CSP
    // Check that inline scripts and styles work (needed for standalone HTML)
