import { test, expect, devices } from '@playwright/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';

test.describe('WS-132 Round 3: Performance & Regression Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start');
    });
  });
  test('Trial Dashboard Performance Benchmarks', async ({ page }) => {
    // Navigate to trial intelligence dashboard
    const startTime = Date.now();
    await page.goto('/trial-intelligence', { waitUntil: 'networkidle' });
    const initialLoadTime = Date.now() - startTime;
    // Verify initial load time meets requirements (<3 seconds)
    expect(initialLoadTime).toBeLessThan(3000);
    // Test Core Web Vitals using Playwright's built-in metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry: any) => {
            switch (entry.name) {
              case 'largest-contentful-paint':
                vitals.lcp = entry.value;
                break;
              case 'first-input-delay':
                vitals.fid = entry.value;
              case 'cumulative-layout-shift':
                vitals.cls = entry.value;
            }
          });
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    console.log('Core Web Vitals:', metrics);
    // Verify LCP (Largest Contentful Paint) < 2.5s
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
    // Verify FID (First Input Delay) < 100ms  
    if (metrics.fid) {
      expect(metrics.fid).toBeLessThan(100);
    // Verify CLS (Cumulative Layout Shift) < 0.1
    if (metrics.cls) {
      expect(metrics.cls).toBeLessThan(0.1);
    await page.screenshot({ 
      path: `screenshots/performance-dashboard-${Date.now()}.png`,
      fullPage: true 
  test('Chart Rendering Performance', async ({ page }) => {
    await page.goto('/trial-intelligence');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="trial-bi-dashboard"]');
    // Measure chart rendering times
    const chartPerformance = await page.evaluate(() => {
      performance.mark('charts-start');
        const checkCharts = () => {
          const charts = [
            document.querySelector('[data-testid="conversion-funnel-chart"]'),
            document.querySelector('[data-testid="cross-team-roi-chart"]'),
            document.querySelector('[data-testid="trial-progression-chart"]'),
            document.querySelector('[data-testid="ml-prediction-chart"]')
          ];
          if (charts.every(chart => chart && chart.querySelector('svg'))) {
            performance.mark('charts-end');
            performance.measure('chart-rendering', 'charts-start', 'charts-end');
            
            const measure = performance.getEntriesByName('chart-rendering')[0];
            resolve(measure.duration);
          } else {
            setTimeout(checkCharts, 100);
          }
        };
        checkCharts();
    // Verify chart rendering completes within 2 seconds
    expect(chartPerformance).toBeLessThan(2000);
    console.log(`Chart rendering time: ${chartPerformance}ms`);
  test('Data Refresh Performance', async ({ page }) => {
    // Test timeframe filter performance
    const timeframes = ['7d', '30d', '90d', '1y'];
    for (const timeframe of timeframes) {
      const filterButton = page.locator(`button:has-text("${timeframe}")`);
      
      if (await filterButton.isVisible()) {
        const refreshStart = Date.now();
        await filterButton.click();
        // Wait for data to refresh
        await page.waitForFunction(() => {
          const elements = document.querySelectorAll('[data-testid*="chart"]');
          return Array.from(elements).every(el => el.querySelector('svg'));
        }, { timeout: 5000 });
        const refreshTime = Date.now() - refreshStart;
        // Verify refresh completes within 1 second
        expect(refreshTime).toBeLessThan(1000);
        console.log(`${timeframe} filter refresh: ${refreshTime}ms`);
      }
  test('Memory Usage Monitoring', async ({ page }) => {
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as unknown).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
      return null;
    if (initialMemory) {
      console.log('Initial memory usage:', initialMemory);
      // Perform intensive operations (simulate user interactions)
      const timeframes = ['7d', '30d', '90d', '1y'];
      for (const timeframe of timeframes) {
        const filterButton = page.locator(`button:has-text("${timeframe}")`);
        if (await filterButton.isVisible()) {
          await filterButton.click();
          await page.waitForTimeout(1000);
        }
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          const memory = (performance as unknown).memory;
          return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          };
        return null;
      if (finalMemory) {
        console.log('Final memory usage:', finalMemory);
        // Check for memory leaks (memory increase should be reasonable)
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const increasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        console.log(`Memory increase: ${memoryIncrease} bytes (${increasePercentage.toFixed(2)}%)`);
        // Memory increase should be less than 50% of initial usage
        expect(increasePercentage).toBeLessThan(50);
  test('Cross-Device Performance', async ({ browser }) => {
    const deviceConfigs = [
      { name: 'Desktop', ...devices['Desktop Chrome'] },
      { name: 'Tablet', ...devices['iPad Pro'] },
      { name: 'Mobile', ...devices['iPhone 13'] }
    ];
    for (const deviceConfig of deviceConfigs) {
      const context = await browser.newContext(deviceConfig);
      const page = await context.newPage();
      try {
        const startTime = Date.now();
        await page.goto('/trial-intelligence', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        console.log(`${deviceConfig.name} load time: ${loadTime}ms`);
        // Device-specific performance thresholds
        let threshold = 5000; // Default 5 seconds
        if (deviceConfig.name === 'Mobile') {
          threshold = 8000; // 8 seconds for mobile
        } else if (deviceConfig.name === 'Tablet') {
          threshold = 6000; // 6 seconds for tablet
        expect(loadTime).toBeLessThan(threshold);
        // Verify dashboard is fully functional on device
        await page.waitForSelector('[data-testid="trial-bi-dashboard"]');
        await expect(page.locator('text="Trial Business Intelligence"')).toBeVisible();
        // Take device-specific screenshot
        await page.screenshot({ 
          path: `screenshots/performance-${deviceConfig.name.toLowerCase()}-${Date.now()}.png`,
          fullPage: true 
      } finally {
        await context.close();
  test('Network Throttling Performance', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      // Add artificial delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    // Should still load within reasonable time on slow network
    await page.waitForSelector('[data-testid="trial-bi-dashboard"]', { timeout: 15000 });
    const loadTime = Date.now() - startTime;
    console.log(`Slow network load time: ${loadTime}ms`);
    // Even on slow network, should load within 15 seconds
    expect(loadTime).toBeLessThan(15000);
    // Verify essential content is visible
    await expect(page.locator('text="Trial Conversion Rate"')).toBeVisible();
    await expect(page.locator('text="Cross-Team ROI"')).toBeVisible();
  test('Large Dataset Performance', async ({ page }) => {
    // Mock large dataset response
    await page.route('/api/trial/business-intelligence', async (route) => {
      const largeDataset = {
        totalTrialUsers: 50000,
        conversionFunnel: Array.from({ length: 1000 }, (_, i) => ({
          stage: `Stage ${i}`,
          value: Math.floor(Math.random() * 10000)
        })),
        teamBreakdown: Array.from({ length: 100 }, (_, i) => ({
          team: `Team ${i}`,
          roi: Math.floor(Math.random() * 100000),
          conversions: Math.floor(Math.random() * 1000),
          engagement: Math.floor(Math.random() * 100)
        }))
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset)
    const processingTime = Date.now() - startTime;
    console.log(`Large dataset processing time: ${processingTime}ms`);
    // Should handle large datasets within 5 seconds
    expect(processingTime).toBeLessThan(5000);
    // Verify charts still render correctly
    await page.waitForSelector('[data-testid="conversion-funnel-chart"] svg');
    await page.waitForSelector('[data-testid="cross-team-roi-chart"] svg');
  test('Concurrent User Simulation', async ({ browser }) => {
    const numConcurrentUsers = 5;
    const contexts = [];
    const pages = [];
    // Create multiple browser contexts to simulate concurrent users
    for (let i = 0; i < numConcurrentUsers; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      pages.push(page);
    try {
      // Navigate all users simultaneously
      const startTime = Date.now();
      const navigationPromises = pages.map(page => 
        page.goto('/trial-intelligence', { waitUntil: 'networkidle' })
      );
      await Promise.all(navigationPromises);
      const concurrentLoadTime = Date.now() - startTime;
      console.log(`Concurrent users load time: ${concurrentLoadTime}ms`);
      // Should handle concurrent users within 8 seconds
      expect(concurrentLoadTime).toBeLessThan(8000);
      // Verify all pages loaded successfully
      for (const page of pages) {
    } finally {
      // Clean up contexts
      for (const context of contexts) {
  test('Resource Loading Optimization', async ({ page }) => {
    // Monitor resource loading
    const resourceMetrics: any = [];
    page.on('response', response => {
      resourceMetrics.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'],
        size: response.headers()['content-length'],
        timing: response.timing()
    // Analyze resource loading
    const criticalResources = resourceMetrics.filter((resource: any) => 
      resource.url.includes('/trial-intelligence') ||
      resource.url.includes('.js') ||
      resource.url.includes('.css')
    );
    console.log(`Loaded ${resourceMetrics.length} resources`);
    console.log(`Critical resources: ${criticalResources.length}`);
    // Check for efficient resource loading
    const failedResources = resourceMetrics.filter((resource: any) => 
      resource.status >= 400
    expect(failedResources.length).toBe(0);
    // Verify no excessive resource loading
    expect(criticalResources.length).toBeLessThan(50);
  test('API Response Time Validation', async ({ page }) => {
    const apiMetrics: any = {};
    // Monitor API calls
      if (response.url().includes('/api/')) {
        const endpoint = response.url().split('/api/')[1];
        apiMetrics[endpoint] = {
          status: response.status(),
          timing: response.timing()
    // Verify API performance
    Object.entries(apiMetrics).forEach(([endpoint, metrics]: [string, any]) => {
      console.log(`${endpoint}: ${metrics.timing?.responseEnd - metrics.timing?.requestStart}ms`);
      // API responses should complete within 2 seconds
      const responseTime = metrics.timing?.responseEnd - metrics.timing?.requestStart;
      expect(responseTime).toBeLessThan(2000);
  test('Browser Compatibility Testing', async ({ browserName, page }) => {
    console.log(`Testing on ${browserName}`);
    // Verify basic functionality works across browsers
    await expect(page.locator('text="Trial Business Intelligence"')).toBeVisible();
    // Test interactive elements
    const timeframeButton = page.locator('button:has-text("30d")');
    if (await timeframeButton.isVisible()) {
      await timeframeButton.click();
      await page.waitForTimeout(1000);
    // Verify charts render correctly in all browsers
    const charts = await page.locator('[data-testid*="chart"] svg').count();
    expect(charts).toBeGreaterThan(0);
      path: `screenshots/browser-compatibility-${browserName}-${Date.now()}.png`,
  test('Regression Testing: Critical User Journeys', async ({ page }) => {
    // Test complete user journey from trial signup to intelligence dashboard
    await page.goto('/trial/setup');
    // Mock trial setup
    await page.evaluate(() => {
      localStorage.setItem('trial-session', JSON.stringify({
        trialId: 'regression-test-trial',
        startDate: new Date().toISOString(),
        supplier_type: 'photographer',
        business_size: 'medium'
      }));
    // Navigate to intelligence dashboard
    // Verify all critical elements are present (regression check)
    await expect(page.locator('text="Active Trial Users"')).toBeVisible();
    await expect(page.locator('text="AI Service Engagement"')).toBeVisible();
    // Test filtering functionality
    const filterButton = page.locator('button:has-text("7d")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    // Test chart interactions
    const funnelChart = page.locator('[data-testid="conversion-funnel-chart"]');
    if (await funnelChart.isVisible()) {
      await funnelChart.hover();
      await page.waitForTimeout(500);
    // Verify no JavaScript errors occurred
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(2000);
    expect(jsErrors.length).toBe(0);
      path: `screenshots/regression-test-complete-${Date.now()}.png`,
  test.afterEach(async ({ page }) => {
    // Generate performance report
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      return {
        domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadCompleteTime: navigation.loadEventEnd - navigation.navigationStart,
        timeToFirstByte: navigation.responseStart - navigation.navigationStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart
    console.log('Performance Metrics:', performanceMetrics);
    // Clean up
      localStorage.clear();
      sessionStorage.clear();
});
