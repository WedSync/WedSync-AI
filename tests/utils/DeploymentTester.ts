// /tests/utils/DeploymentTester.ts
export class DeploymentTester {
  async waitForDeploymentReady(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch('/api/health/deployment');
        const health = await response.json();
        
        if (health.success && health.data.services.database === 'connected') {
          console.log('✅ Deployment is ready');
          return;
        }
      } catch (error) {
        console.log('⏳ Waiting for deployment...');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Deployment readiness timeout');
  }

  async loginAsPhotographer(page: any): Promise<void> {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@test.com');
    await page.fill('[data-testid="password"]', 'test123456');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  }

  async createTestImage(width: number = 800, height: number = 600): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    const sharp = require('sharp');
    
    const testImagePath = path.join(__dirname, '../fixtures/test-upload.jpg');
    
    // Create a test image using sharp
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .jpeg()
    .toFile(testImagePath);
    
    return testImagePath;
  }

  async checkServiceHealth(serviceName: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/health/${serviceName}`);
      const health = await response.json();
      return health.success;
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error);
      return false;
    }
  }

  async triggerTimelineUpdate(): Promise<void> {
    // Simulate server-side timeline update
    try {
      await fetch('/api/timeline/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ceremony-update',
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to trigger timeline update:', error);
    }
  }

  async measureLoadTime(page: any, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async validateAPIEndpoint(endpoint: string, expectedStatus: number = 200): Promise<boolean> {
    try {
      const response = await fetch(endpoint);
      return response.status === expectedStatus;
    } catch (error) {
      console.error(`API endpoint validation failed for ${endpoint}:`, error);
      return false;
    }
  }

  async simulateDatabaseError(): Promise<void> {
    // Mock database error by setting a test flag
    try {
      await fetch('/api/test/database-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate: true })
      });
    } catch (error) {
      console.error('Failed to simulate database error:', error);
    }
  }

  async checkErrorBoundary(page: any): Promise<boolean> {
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    return await errorBoundary.isVisible();
  }
}