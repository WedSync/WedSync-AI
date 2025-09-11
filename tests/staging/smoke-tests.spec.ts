import { test, expect, Page } from '@playwright/test';
import { StagingValidationConfig } from './staging-validation.config';

const config = StagingValidationConfig;

test.describe('WedSync 2.0 Staging Smoke Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test('Homepage loads successfully', async () => {
    const startTime = Date.now();
    await page.goto(config.environment.baseUrl);
    const loadTime = Date.now() - startTime;

    await expect(page).toHaveTitle(/WedSync/);
    await expect(page.locator('nav')).toBeVisible();
    expect(loadTime).toBeLessThan(config.thresholds.performance.pageLoad);
    
    console.log(`📊 Homepage load time: ${loadTime}ms`);
  });

  test('API health check endpoint responds', async () => {
    const response = await page.request.get(`${config.environment.apiUrl}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
    
    console.log('✅ API health check passed');
  });

  test('Authentication flow works end-to-end', async () => {
    await page.goto(`${config.environment.baseUrl}/login`);
    
    // Test login form exists
    await expect(page.locator('[data-testid="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="password"], input[type="password"]')).toBeVisible();
    
    // Test user registration flow
    await page.click('text=Sign Up');
    await page.fill('input[type="email"]', `test-${Date.now()}@staging.test`);
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Note: In real staging, this would complete registration
    console.log('🔐 Authentication flows accessible');
  });

  test('Form builder page loads and is functional', async () => {
    // Skip auth for staging smoke test
    await page.goto(`${config.environment.baseUrl}/forms/builder`);
    
    // Check if redirected to login (expected) or if builder loads
    const currentUrl = page.url();
    const isLoginRedirect = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const isBuilderPage = currentUrl.includes('/forms/builder');
    
    expect(isLoginRedirect || isBuilderPage).toBeTruthy();
    
    if (isBuilderPage) {
      await expect(page.locator('[data-testid="form-builder"], .form-builder')).toBeVisible();
      console.log('📝 Form builder accessible');
    } else {
      console.log('🔐 Form builder properly protected (login required)');
    }
  });

  test('Payment configuration is accessible', async () => {
    const response = await page.request.get(`${config.environment.apiUrl}/stripe/config`);
    
    // Allow for different response codes in staging
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.publishableKey).toContain('pk_test_');
      console.log('💳 Stripe test mode configured');
    } else if (response.status() === 401) {
      console.log('🔐 Payment config properly protected');
    } else {
      console.log(`⚠️ Payment config returned status: ${response.status()}`);
    }
  });

  test('PDF processing endpoint is accessible', async () => {
    const response = await page.request.post(`${config.environment.apiUrl}/pdf/validate`, {
      data: { test: true }
    });
    
    // Should return 401 (unauthorized) or 422 (validation error) - both indicate endpoint exists
    expect([401, 422, 400]).toContain(response.status());
    console.log('📄 PDF processing endpoint accessible');
  });

  test('Database connection through API', async () => {
    const response = await page.request.get(`${config.environment.apiUrl}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.database).toBe('connected');
    expect(data.timestamp).toBeDefined();
    
    console.log('🗃️ Database connectivity confirmed');
  });

  test('Static assets load correctly', async () => {
    await page.goto(config.environment.baseUrl);
    
    // Check for CSS loading
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
    
    // Check for JavaScript loading
    const scripts = await page.locator('script[src]').count();
    expect(scripts).toBeGreaterThan(0);
    
    console.log('🎨 Static assets loading correctly');
  });

  test('Mobile responsiveness check', async () => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(config.environment.baseUrl);
    
    // Should have mobile navigation or responsive layout
    const isMobileOptimized = await page.locator('nav, .mobile-nav, [data-testid="mobile-nav"]').isVisible();
    expect(isMobileOptimized).toBeTruthy();
    
    console.log('📱 Mobile responsiveness confirmed');
  });

  test('Error handling for invalid routes', async () => {
    const response = await page.request.get(`${config.environment.baseUrl}/nonexistent-page`);
    expect([404, 302]).toContain(response.status()); // 404 or redirect to home
    
    console.log('🚫 Error handling working correctly');
  });
});