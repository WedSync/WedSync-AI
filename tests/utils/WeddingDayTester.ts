// /tests/utils/WeddingDayTester.ts
export class WeddingDayTester {
  async simulatePhotoUpload(page: any, count: number): Promise<void> {
    await page.goto('/photos/upload');
    
    for (let i = 0; i < count; i++) {
      const testImagePath = await this.createTestImage();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 30000
      });
      
      // Small delay between uploads
      await page.waitForTimeout(100);
    }
  }

  async simulateTimelineUpdate(page: any): Promise<void> {
    await page.goto('/timeline');
    await page.click('[data-testid="edit-ceremony"]');
    await page.fill('[data-testid="event-time"]', '15:30');
    await page.click('[data-testid="save-changes"]');
    
    await page.waitForSelector('[data-testid="save-success"]');
  }

  async simulateVenueStatusUpdate(page: any): Promise<void> {
    await page.goto('/venue/status');
    await page.click('[data-testid="update-setup-status"]');
    await page.selectOption('[data-testid="status-select"]', 'ready');
    await page.click('[data-testid="confirm-status"]');
  }

  async simulateCoupleCheckin(page: any): Promise<void> {
    await page.goto('/couple/timeline');
    await page.click('[data-testid="refresh-timeline"]');
    await page.waitForLoadState('networkidle');
  }

  async simulatePhotoViewing(page: any): Promise<void> {
    await page.goto('/photos/gallery');
    
    // Browse through photos
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="next-photo"]');
      await page.waitForTimeout(500);
    }
  }

  async loginAsPhotographer(page: any): Promise<void> {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@test.com');
    await page.fill('[data-testid="password"]', 'test123456');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  }

  async loginAsCoordinator(page: any): Promise<void> {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'coordinator@test.com');
    await page.fill('[data-testid="password"]', 'test123456');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  }

  async loginAsAdmin(page: any): Promise<void> {
    await page.goto('/admin/login');
    await page.fill('[data-testid="admin-email"]', 'admin@wedsync.com');
    await page.fill('[data-testid="admin-password"]', 'admin123456');
    await page.click('[data-testid="admin-login-button"]');
    await page.waitForURL('/admin/dashboard');
  }

  async createTestImage(): Promise<string> {
    // Create a test image file
    const fs = require('fs');
    const path = require('path');
    
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal JPEG file for testing
      const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD//gAyQ29tcHJlc3NlZCBieSBqcGVnLXJlY29tcHJlc3MAKIO...', 'base64');
      fs.writeFileSync(testImagePath, jpeg);
    }
    
    return testImagePath;
  }
}