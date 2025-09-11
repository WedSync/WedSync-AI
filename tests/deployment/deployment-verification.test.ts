// /tests/deployment/deployment-verification.test.ts
import { test, expect } from '@playwright/test';
import { DeploymentTester } from '../utils/DeploymentTester';

const deploymentTester = new DeploymentTester();

test.describe('Production Deployment Verification', () => {
  test.beforeAll(async () => {
    // Wait for deployment to be fully ready
    await deploymentTester.waitForDeploymentReady();
  });

  test('should have healthy deployment status', async ({ page }) => {
    await page.goto('/api/health/deployment');
    
    const response = await page.textContent('pre');
    const healthData = JSON.parse(response);
    
    expect(healthData.success).toBe(true);
    expect(healthData.data.services.database).toBe('connected');
    expect(healthData.data.services.redis).toBe('connected');
    expect(healthData.data.services.external_apis).toBe('connected');
    
    console.log('✅ All services healthy:', healthData);
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Must load in <3s
    
    // Verify critical elements are present
    await expect(page.locator('[data-testid="wedding-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    
    console.log(`✅ Dashboard loaded in ${loadTime}ms`);
  });

  test('should handle photo upload workflow', async ({ page }) => {
    await page.goto('/photos/upload');
    await page.waitForLoadState('networkidle');
    
    // Create test image
    const testImagePath = await deploymentTester.createTestImage();
    
    // Upload photo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    // Wait for upload completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 30000
    });
    
    console.log('✅ Photo upload workflow functional');
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Login
    await deploymentTester.loginAsPhotographer(page);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    const initialUserName = await page.textContent('[data-testid="user-name"]');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify session maintained
    const reloadedUserName = await page.textContent('[data-testid="user-name"]');
    expect(reloadedUserName).toBe(initialUserName);
    
    console.log('✅ Session persistence working');
  });

  test('should handle database connectivity issues gracefully', async ({ page }) => {
    // This would require mocking database failures
    // For now, test error boundaries exist
    
    await page.goto('/dashboard');
    
    // Inject database error simulation
    await page.evaluate(() => {
      window.__simulateDatabaseError = true;
    });
    
    // Trigger action that would hit database
    await page.click('[data-testid="refresh-timeline"]');
    
    // Should show error boundary, not crash
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible({
      timeout: 10000
    });
    
    console.log('✅ Database error handling works');
  });

  test('should support real-time updates', async ({ page }) => {
    await deploymentTester.loginAsPhotographer(page);
    
    // Open timeline page
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    
    // Simulate real-time update from another user
    await deploymentTester.triggerTimelineUpdate();
    
    // Should see update without refresh
    await expect(page.locator('[data-testid="timeline-updated"]')).toBeVisible({
      timeout: 15000
    });
    
    console.log('✅ Real-time updates working');
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check mobile navigation is visible
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Check touch-friendly button sizes
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(48); // 48px minimum touch target
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
    }
    
    console.log('✅ Mobile viewport handling correct');
  });
});