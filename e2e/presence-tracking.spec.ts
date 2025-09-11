import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data for wedding context
const TEST_WEDDING = {
  id: 'test-wedding-123',
  name: 'Sarah & Mike Wedding',
  date: new Date('2024-06-15'),
  venue: 'Garden Manor'
};

const TEST_USERS = {
  coordinator: {
    email: 'coordinator@venue.test',
    password: 'test123',
    name: 'Emma Coordinator',
    role: 'venue_coordinator'
  },
  photographer: {
    email: 'photographer@studio.test', 
    password: 'test123',
    name: 'Alex Photography',
    role: 'photographer'
  },
  florist: {
    email: 'florist@flowers.test',
    password: 'test123',
    name: 'Rose Florist',
    role: 'vendor'
  }
};

test.describe('WS-204: Real-Time Presence Tracking', () => {
  let coordinatorContext: BrowserContext;
  let photographerContext: BrowserContext;
  let coordinatorPage: Page;
  let photographerPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for multi-user testing
    coordinatorContext = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    });
    photographerContext = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    });
    
    coordinatorPage = await coordinatorContext.newPage();
    photographerPage = await photographerContext.newPage();
  });

  test.afterAll(async () => {
    await coordinatorContext.close();
    await photographerContext.close();
  });

  test('Multi-User Real-Time Presence Updates', async () => {
    // Login as venue coordinator
    await coordinatorPage.goto('/login');
    await coordinatorPage.fill('[data-testid="login-email"]', TEST_USERS.coordinator.email);
    await coordinatorPage.fill('[data-testid="login-password"]', TEST_USERS.coordinator.password);
    await coordinatorPage.click('[data-testid="login-submit"]');
    await coordinatorPage.waitForURL('/dashboard');

    // Navigate to wedding team view
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    await coordinatorPage.waitForSelector('[data-testid="presence-list"]');

    // Login as photographer in separate context
    await photographerPage.goto('/login');
    await photographerPage.fill('[data-testid="login-email"]', TEST_USERS.photographer.email);
    await photographerPage.fill('[data-testid="login-password"]', TEST_USERS.photographer.password);
    await photographerPage.click('[data-testid="login-submit"]');
    await photographerPage.waitForURL('/dashboard');

    // Navigate to same wedding
    await photographerPage.goto(`/wedding/${TEST_WEDDING.id}/dashboard`);

    // Wait for presence system to initialize
    await coordinatorPage.waitForTimeout(2000);

    // Verify coordinator sees photographer as online
    const photographerPresence = coordinatorPage.locator('[data-testid="photographer-presence"]');
    await expect(photographerPresence).toBeVisible();
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-green/);
    
    // Take screenshot for evidence
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-multi-user-online.png',
      fullPage: true 
    });

    // Photographer goes idle (simulate by making page hidden)
    await photographerPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for idle status to propagate
    await coordinatorPage.waitForTimeout(3000);

    // Verify coordinator sees photographer as idle
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-yellow/, { timeout: 5000 });
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-multi-user-idle.png' 
    });

    // Photographer returns (make page visible)
    await photographerPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify coordinator sees photographer back online
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-green/, { timeout: 5000 });
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-multi-user-back-online.png' 
    });
  });

  test('Privacy Settings Enforcement', async () => {
    // Setup: photographer logged in
    await photographerPage.goto(`/settings/presence`);
    await photographerPage.waitForSelector('[data-testid="presence-settings"]');

    // Set privacy to "appear offline"
    await photographerPage.click('[data-testid="appear-offline-toggle"]');
    await photographerPage.click('[data-testid="save-settings"]');
    await photographerPage.waitForSelector('[data-testid="settings-saved"]');

    // Coordinator should see photographer as offline despite being online
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    await coordinatorPage.waitForTimeout(2000);

    const photographerPresence = coordinatorPage.locator('[data-testid="photographer-presence"]');
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-gray/);
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-privacy-appear-offline.png' 
    });

    // Change to team members only
    await photographerPage.goto('/settings/presence');
    await photographerPage.click('[data-testid="appear-offline-toggle"]'); // Turn off appear offline
    await photographerPage.selectOption('[data-testid="visibility-select"]', 'team');
    await photographerPage.click('[data-testid="save-settings"]');
    
    // Coordinator (team member) should now see real status
    await coordinatorPage.reload();
    await coordinatorPage.waitForTimeout(2000);
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-green/);
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-privacy-team-only.png' 
    });
  });

  test('Activity Tracking Status Transitions', async () => {
    // Start with photographer active
    await photographerPage.goto(`/wedding/${TEST_WEDDING.id}/dashboard`);
    
    // Verify online status
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    const photographerPresence = coordinatorPage.locator('[data-testid="photographer-presence"]');
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-green/);

    // Simulate 2 minutes of inactivity for idle status
    await photographerPage.evaluate(() => {
      // Mock Date.now() to simulate time passing
      const originalNow = Date.now;
      const startTime = originalNow();
      Date.now = () => startTime + 2 * 60 * 1000; // +2 minutes
      
      // Trigger idle timeout
      window.dispatchEvent(new Event('test-idle-timeout'));
    });

    // Wait for idle status
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-yellow/, { timeout: 5000 });
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-activity-idle.png' 
    });

    // Simulate 10 minutes for away status
    await photographerPage.evaluate(() => {
      const originalNow = Date.now;
      const startTime = originalNow();
      Date.now = () => startTime + 10 * 60 * 1000; // +10 minutes
      
      window.dispatchEvent(new Event('test-away-timeout'));
    });

    // Wait for away status
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-gray/, { timeout: 5000 });
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-activity-away.png' 
    });

    // Return to activity
    await photographerPage.click('body'); // Simulate user activity
    await photographerPage.evaluate(() => {
      // Reset Date.now()
      Date.now = Date.prototype.constructor.now;
      window.dispatchEvent(new Event('mousemove'));
    });

    // Should return to online
    await expect(photographerPresence.locator('.status-dot')).toHaveClass(/bg-green/, { timeout: 5000 });
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-activity-back-online.png' 
    });
  });

  test('Typing Indicators', async () => {
    // Navigate both users to communication interface
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/messages`);
    await photographerPage.goto(`/wedding/${TEST_WEDDING.id}/messages`);

    const coordinatorMessageInput = coordinatorPage.locator('[data-testid="message-input"]');
    const photographerTypingIndicator = photographerPage.locator('[data-testid="typing-indicator"]');

    // Coordinator starts typing
    await coordinatorMessageInput.type('Confirming timeline changes...');
    
    // Photographer should see typing indicator
    await expect(photographerTypingIndicator).toBeVisible({ timeout: 3000 });
    await expect(photographerTypingIndicator).toContainText('typing');
    await expect(photographerTypingIndicator.locator('.animate-pulse')).toBeVisible();
    
    await photographerPage.screenshot({ 
      path: 'test-evidence/presence-typing-indicator-active.png' 
    });

    // Coordinator stops typing
    await coordinatorMessageInput.clear();
    await coordinatorPage.waitForTimeout(3000); // Typing timeout

    // Typing indicator should disappear
    await expect(photographerTypingIndicator).not.toBeVisible({ timeout: 5000 });
    
    await photographerPage.screenshot({ 
      path: 'test-evidence/presence-typing-indicator-gone.png' 
    });
  });

  test('Wedding Coordination Context', async () => {
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    await coordinatorPage.waitForSelector('[data-testid="presence-list"]');

    // Verify wedding context elements
    await expect(coordinatorPage.locator('[data-testid="wedding-title"]')).toContainText(TEST_WEDDING.name);
    
    // Check role-based grouping
    const photographySection = coordinatorPage.locator('[data-testid="role-section-photography"]');
    await expect(photographySection).toBeVisible();
    await expect(photographySection.locator('[data-testid="photographer-presence"]')).toBeVisible();

    // Test custom status for wedding context
    await photographerPage.goto('/settings/presence');
    await photographerPage.fill('[data-testid="custom-status-input"]', 'At venue - ceremony prep');
    await photographerPage.fill('[data-testid="custom-emoji-input"]', '📸');
    await photographerPage.click('[data-testid="save-custom-status"]');

    // Coordinator should see custom wedding status
    await coordinatorPage.reload();
    await coordinatorPage.waitForTimeout(2000);
    
    const customStatus = coordinatorPage.locator('[data-testid="photographer-custom-status"]');
    await expect(customStatus).toContainText('📸 At venue - ceremony prep');
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-wedding-context.png' 
    });

    // Test wedding status templates
    const statusTemplates = coordinatorPage.locator('[data-testid="wedding-status-templates"]');
    await expect(statusTemplates).toBeVisible();
    
    // Verify wedding-specific templates exist
    await expect(statusTemplates.locator('text="📸 At venue - ceremony prep"')).toBeVisible();
    await expect(statusTemplates.locator('text="🌸 Flower delivery in progress"')).toBeVisible();
    await expect(statusTemplates.locator('text="🎵 Sound check complete"')).toBeVisible();
  });

  test('Performance and Responsiveness', async () => {
    const startTime = Date.now();
    
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    await coordinatorPage.waitForSelector('[data-testid="presence-list"]', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Page load within 3 seconds

    // Test presence update responsiveness
    const updateStartTime = Date.now();
    
    await photographerPage.evaluate(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    
    // Wait for presence update to appear
    await coordinatorPage.waitForFunction(() => {
      const statusDot = document.querySelector('[data-testid="photographer-presence"] .status-dot');
      return statusDot?.classList.contains('bg-green-500');
    }, {}, { timeout: 2000 });
    
    const updateTime = Date.now() - updateStartTime;
    expect(updateTime).toBeLessThan(2000); // Updates within 2 seconds (requirement)

    // Test component render performance
    const renderStartTime = performance.now();
    
    await coordinatorPage.evaluate(() => {
      // Force re-render of presence components
      const presenceList = document.querySelector('[data-testid="presence-list"]');
      if (presenceList) {
        presenceList.style.display = 'none';
        presenceList.offsetHeight; // Force reflow
        presenceList.style.display = '';
      }
    });
    
    const renderTime = performance.now() - renderStartTime;
    expect(renderTime).toBeLessThan(100); // Render within 100ms requirement
  });

  test('Accessibility Validation', async () => {
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    
    // Test ARIA labels and live regions
    const presenceList = coordinatorPage.locator('[data-testid="presence-list"]');
    await expect(presenceList).toHaveAttribute('aria-live', 'polite');
    
    const photographerPresence = coordinatorPage.locator('[data-testid="photographer-presence"]');
    await expect(photographerPresence).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await coordinatorPage.keyboard.press('Tab');
    await expect(photographerPresence).toBeFocused();
    
    // Test screen reader announcements
    await photographerPage.evaluate(() => {
      window.dispatchEvent(new Event('mousemove')); // Trigger status change
    });
    
    // Verify ARIA live region updates
    await coordinatorPage.waitForFunction(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      return liveRegion?.textContent?.includes('online');
    });

    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-accessibility-validation.png' 
    });
  });

  test('Mobile Responsive Presence Display', async () => {
    // Test mobile viewport
    await coordinatorPage.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await coordinatorPage.goto(`/wedding/${TEST_WEDDING.id}/team`);
    
    // Verify mobile-optimized presence list
    const presenceList = coordinatorPage.locator('[data-testid="presence-list"]');
    await expect(presenceList).toBeVisible();
    
    // Check mobile-specific layout adjustments
    const statusDots = presenceList.locator('.status-dot');
    await expect(statusDots.first()).toBeVisible();
    
    // Verify touch targets are adequate (>48px)
    const touchTargets = presenceList.locator('[role="button"]');
    const boundingBox = await touchTargets.first().boundingBox();
    expect(boundingBox?.width).toBeGreaterThanOrEqual(48);
    expect(boundingBox?.height).toBeGreaterThanOrEqual(48);
    
    await coordinatorPage.screenshot({ 
      path: 'test-evidence/presence-mobile-responsive.png',
      fullPage: true 
    });
  });
});