/**
 * WedSync E2E Realtime Integration Tests
 * WS-202: Complete realtime workflow testing with Playwright
 * 
 * Wedding Industry Context: End-to-end testing of realtime coordination
 * between photographers, venues, couples, and vendors during actual wedding
 * scenarios including network interruptions and mobile device usage.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import type { Database } from '@/types/supabase';

// Test configuration for wedding scenarios
test.describe.configure({ mode: 'parallel' });

test.describe('Wedding Realtime Coordination E2E', () => {
  let photographerContext: BrowserContext;
  let coupleContext: BrowserContext;
  let venueCoordinatorContext: BrowserContext;
  let photographerPage: Page;
  let couplePage: Page;
  let venueCoordinatorPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for each user type
    photographerContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    coupleContext = await browser.newContext({
      viewport: { width: 375, height: 667 } // Mobile viewport for couple
    });
    
    venueCoordinatorContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    photographerPage = await photographerContext.newPage();
    couplePage = await coupleContext.newPage();
    venueCoordinatorPage = await venueCoordinatorContext.newPage();

    // Setup authentication for each user type
    await setupWeddingTestData();
  });

  test.afterAll(async () => {
    await photographerContext.close();
    await coupleContext.close();
    await venueCoordinatorContext.close();
  });

  async function setupWeddingTestData() {
    // Login as photographer
    await photographerPage.goto('/login');
    await photographerPage.fill('[data-testid="email"]', 'photographer@wedsync-test.com');
    await photographerPage.fill('[data-testid="password"]', 'TestPhoto123!');
    await photographerPage.click('[data-testid="login-button"]');
    await expect(photographerPage.locator('[data-testid="dashboard"]')).toBeVisible();

    // Login as couple on mobile
    await couplePage.goto('/login');
    await couplePage.fill('[data-testid="email"]', 'couple@wedsync-test.com');
    await couplePage.fill('[data-testid="password"]', 'TestCouple123!');
    await couplePage.click('[data-testid="login-button"]');
    await expect(couplePage.locator('[data-testid="couple-dashboard"]')).toBeVisible();

    // Login as venue coordinator
    await venueCoordinatorPage.goto('/login');
    await venueCoordinatorPage.fill('[data-testid="email"]', 'venue@wedsync-test.com');
    await venueCoordinatorPage.fill('[data-testid="password"]', 'TestVenue123!');
    await venueCoordinatorPage.click('[data-testid="login-button"]');
    await expect(venueCoordinatorPage.locator('[data-testid="venue-dashboard"]')).toBeVisible();
  }

  test('Complete wedding day coordination workflow', async () => {
    // Navigate all users to the wedding day dashboard
    await Promise.all([
      photographerPage.goto('/wedding/2025-06-15/dashboard'),
      couplePage.goto('/wedding/2025-06-15/mobile'),
      venueCoordinatorPage.goto('/wedding/2025-06-15/coordination')
    ]);

    // Verify all dashboards loaded with realtime connection
    await Promise.all([
      expect(photographerPage.locator('[data-testid="realtime-status"]')).toHaveText('Connected'),
      expect(couplePage.locator('[data-testid="realtime-indicator"]')).toHaveClass(/connected/),
      expect(venueCoordinatorPage.locator('[data-testid="realtime-status"]')).toHaveText('Connected')
    ]);

    // Step 1: Venue coordinator updates ceremony start time
    await venueCoordinatorPage.click('[data-testid="edit-timeline"]');
    await venueCoordinatorPage.fill('[data-testid="ceremony-start-time"]', '15:30');
    await venueCoordinatorPage.fill('[data-testid="change-reason"]', 'Photography setup needs additional 30 minutes');
    await venueCoordinatorPage.click('[data-testid="update-timeline"]');

    // Verify realtime notifications appear on all connected users
    await Promise.all([
      expect(photographerPage.locator('[data-testid="realtime-notification"]'))
        .toContainText('Ceremony time updated to 15:30'),
      expect(couplePage.locator('[data-testid="timeline-update-alert"]'))
        .toContainText('Ceremony delayed by 30 minutes'),
      expect(venueCoordinatorPage.locator('[data-testid="update-confirmation"]'))
        .toContainText('Timeline updated - all vendors notified')
    ]);

    // Step 2: Photographer acknowledges timeline change and reports setup progress
    await photographerPage.click('[data-testid="acknowledge-timeline-change"]');
    await photographerPage.click('[data-testid="update-status"]');
    await photographerPage.selectOption('[data-testid="vendor-status"]', 'setup_in_progress');
    await photographerPage.fill('[data-testid="status-message"]', 'Setting up equipment with extra time - ceremony will be perfect!');
    await photographerPage.click('[data-testid="send-status-update"]');

    // Verify status updates appear in couple dashboard
    await expect(couplePage.locator('[data-testid="vendor-status-photographer"]'))
      .toContainText('Setting up equipment');
    
    await expect(venueCoordinatorPage.locator('[data-testid="vendor-status-list"]'))
      .toContainText('Photographer: Setup in progress');

    // Step 3: Couple updates guest count last minute (mobile interaction)
    await couplePage.click('[data-testid="guest-count-section"]');
    await couplePage.fill('[data-testid="final-guest-count"]', '142'); // Changed from 140
    await couplePage.click('[data-testid="add-plus-ones-reason"]');
    await couplePage.fill('[data-testid="change-reason"]', 'Two unexpected plus-ones confirmed this morning');
    await couplePage.click('[data-testid="update-guest-count"]');

    // Verify guest count changes trigger realtime updates to photographer (affects group photo planning)
    await expect(photographerPage.locator('[data-testid="guest-count-update"]'))
      .toContainText('Guest count updated: 142 guests');
    
    await expect(photographerPage.locator('[data-testid="photo-planning-alert"]'))
      .toContainText('Update group photo arrangements for 142 guests');

    // Step 4: Emergency scenario - vendor issue requiring coordination
    await photographerPage.click('[data-testid="emergency-alert"]');
    await photographerPage.selectOption('[data-testid="emergency-type"]', 'equipment_issue');
    await photographerPage.fill('[data-testid="emergency-description"]', 'Backup camera malfunction - need 10 minutes to switch to secondary backup');
    await photographerPage.selectOption('[data-testid="emergency-severity"]', 'medium');
    await photographerPage.click('[data-testid="send-emergency-alert"]');

    // Verify emergency alerts reach all stakeholders immediately
    await Promise.all([
      expect(couplePage.locator('[data-testid="emergency-notification"]'))
        .toContainText('Photography equipment issue'),
      expect(venueCoordinatorPage.locator('[data-testid="vendor-emergency"]'))
        .toContainText('Photographer equipment issue - 10 minute delay')
    ]);

    // Venue coordinator responds to emergency
    await venueCoordinatorPage.click('[data-testid="handle-emergency"]');
    await venueCoordinatorPage.fill('[data-testid="coordinator-response"]', 'Adjusting ceremony start to 15:40. Notifying officiant and music coordinator.');
    await venueCoordinatorPage.click('[data-testid="send-coordination-update"]');

    // Step 5: Resolution and status updates
    await photographerPage.click('[data-testid="resolve-emergency"]');
    await photographerPage.selectOption('[data-testid="vendor-status"]', 'ready');
    await photographerPage.fill('[data-testid="status-message"]', 'All equipment operational - ready for ceremony at 15:40');
    await photographerPage.click('[data-testid="send-status-update"]');

    // Final verification - all users see resolved status
    await Promise.all([
      expect(couplePage.locator('[data-testid="all-vendors-ready"]'))
        .toContainText('All vendors ready'),
      expect(venueCoordinatorPage.locator('[data-testid="ceremony-status"]'))
        .toContainText('Ceremony ready to proceed'),
      expect(photographerPage.locator('[data-testid="vendor-status-indicator"]'))
        .toHaveClass(/status-ready/)
    ]);
  });

  test('Network resilience and connection recovery', async () => {
    await photographerPage.goto('/wedding/2025-06-15/dashboard');
    
    // Verify initial connection
    await expect(photographerPage.locator('[data-testid="realtime-status"]')).toHaveText('Connected');

    // Simulate poor venue WiFi - intermittent connectivity
    await photographerPage.evaluate(() => {
      // Override WebSocket to simulate connection issues
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          
          // Simulate connection drops every 10 seconds
          setTimeout(() => {
            this.close(1006, 'Connection lost');
          }, 10000);
        }
      } as any;
    });

    // Wait for connection drop
    await expect(photographerPage.locator('[data-testid="realtime-status"]'))
      .toHaveText('Reconnecting...', { timeout: 15000 });

    // Verify auto-reconnection kicks in
    await expect(photographerPage.locator('[data-testid="realtime-status"]'))
      .toHaveText('Connected', { timeout: 20000 });

    // Test message buffering during disconnection
    await photographerPage.evaluate(() => {
      // Simulate network interruption
      (window.navigator as any).connection = { effectiveType: 'none' };
    });

    // Send message while "offline"
    await photographerPage.click('[data-testid="update-status"]');
    await photographerPage.fill('[data-testid="status-message"]', 'Message sent while offline - should be buffered');
    await photographerPage.click('[data-testid="send-status-update"]');

    // Verify message is in pending queue
    await expect(photographerPage.locator('[data-testid="pending-messages-count"]'))
      .toContainText('1');

    // Simulate connection recovery
    await photographerPage.evaluate(() => {
      (window.navigator as any).connection = { effectiveType: '4g' };
      window.dispatchEvent(new Event('online'));
    });

    // Verify buffered message is sent after reconnection
    await expect(photographerPage.locator('[data-testid="pending-messages-count"]'))
      .toContainText('0', { timeout: 10000 });

    await expect(photographerPage.locator('[data-testid="message-sent-confirmation"]'))
      .toContainText('Status updated successfully');
  });

  test('Multi-device synchronization and mobile responsiveness', async () => {
    // Test with couple using mobile device
    await couplePage.goto('/wedding/2025-06-15/mobile');
    
    // Verify mobile-optimized interface
    await expect(couplePage.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    await expect(couplePage.locator('[data-testid="realtime-indicator"]')).toBeVisible();

    // Test touch interactions for RSVP changes
    await couplePage.click('[data-testid="guest-management"]');
    await couplePage.click('[data-testid="guest-list"]');
    
    // Find guest and change RSVP (touch-friendly UI)
    await couplePage.click('[data-testid="guest-item-1"]');
    await couplePage.click('[data-testid="change-rsvp"]');
    await couplePage.click('[data-testid="rsvp-declined"]');
    await couplePage.fill('[data-testid="decline-reason"]', 'Family emergency - cannot attend');
    await couplePage.click('[data-testid="confirm-rsvp-change"]');

    // Verify change appears on photographer desktop dashboard
    await expect(photographerPage.locator('[data-testid="guest-count-change"]'))
      .toContainText('Guest declined - updated count: 141');

    // Test mobile photo upload from venue
    await couplePage.click('[data-testid="share-moment"]');
    
    // Simulate mobile photo upload
    await couplePage.setInputFiles(
      '[data-testid="photo-upload"]',
      'test-fixtures/wedding-setup-photo.jpg'
    );
    
    await couplePage.fill('[data-testid="photo-caption"]', 'Beautiful venue setup! So excited! 💍');
    await couplePage.click('[data-testid="share-photo"]');

    // Verify photo appears in photographer feed
    await expect(photographerPage.locator('[data-testid="client-photo-feed"]'))
      .toContainText('Beautiful venue setup!');

    await expect(photographerPage.locator('[data-testid="client-shared-photo"]'))
      .toBeVisible();
  });

  test('Performance under high-frequency updates', async () => {
    // Navigate to performance test dashboard
    await photographerPage.goto('/wedding/2025-06-15/dashboard');
    
    // Monitor initial performance metrics
    const initialMetrics = await photographerPage.evaluate(() => ({
      memory: (performance as any).memory?.usedJSHeapSize || 0,
      timing: performance.now()
    }));

    // Simulate high-frequency updates (multiple vendors updating simultaneously)
    await photographerPage.evaluate(async () => {
      // Send 50 rapid updates to simulate busy wedding day
      const updates = Array.from({ length: 50 }, (_, i) => ({
        type: 'vendor_status',
        vendor: `vendor_${i % 5}`, // 5 different vendors
        status: i % 3 === 0 ? 'setup' : i % 3 === 1 ? 'ready' : 'in_progress',
        message: `Automated status update ${i + 1}`,
        timestamp: new Date().toISOString()
      }));

      for (const update of updates) {
        // Simulate realtime event
        window.dispatchEvent(new CustomEvent('realtime:update', { detail: update }));
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms between updates
      }
    });

    // Wait for all updates to be processed
    await photographerPage.waitForTimeout(5000);

    // Verify UI remains responsive
    await expect(photographerPage.locator('[data-testid="realtime-status"]')).toHaveText('Connected');

    // Check performance metrics haven't degraded significantly
    const finalMetrics = await photographerPage.evaluate(() => ({
      memory: (performance as any).memory?.usedJSHeapSize || 0,
      timing: performance.now()
    }));

    // Memory increase should be reasonable (<50MB)
    const memoryIncrease = finalMetrics.memory - initialMetrics.memory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

    // UI should still be responsive (can click elements quickly)
    const clickStartTime = await photographerPage.evaluate(() => performance.now());
    await photographerPage.click('[data-testid="refresh-dashboard"]');
    await expect(photographerPage.locator('[data-testid="dashboard-loading"]')).not.toBeVisible({ timeout: 2000 });
    
    const clickEndTime = await photographerPage.evaluate(() => performance.now());
    const responseTime = clickEndTime - clickStartTime;
    
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });

  test('Saturday wedding day stress testing', async () => {
    // Set context to Saturday (wedding day)
    await photographerPage.evaluate(() => {
      // Mock current date to Saturday
      const mockDate = new Date('2025-06-14T10:00:00Z'); // Saturday
      Date.now = () => mockDate.getTime();
    });

    await photographerPage.goto('/wedding/2025-06-14/dashboard');
    
    // Verify Saturday special mode is active
    await expect(photographerPage.locator('[data-testid="wedding-day-mode"]')).toBeVisible();
    await expect(photographerPage.locator('[data-testid="enhanced-monitoring"]')).toHaveText('Active');

    // Test rapid-fire critical updates
    const criticalUpdates = [
      { type: 'timeline_change', priority: 'critical', delay: '10 minutes' },
      { type: 'vendor_emergency', priority: 'critical', issue: 'equipment_failure' },
      { type: 'weather_alert', priority: 'high', condition: 'rain_starting' },
      { type: 'guest_emergency', priority: 'high', situation: 'medical_assistance' }
    ];

    for (const update of criticalUpdates) {
      await photographerPage.evaluate((updateData) => {
        window.dispatchEvent(new CustomEvent('realtime:critical', { detail: updateData }));
      }, update);
      
      // Verify immediate notification (Saturday mode has faster processing)
      await expect(photographerPage.locator('[data-testid="critical-alert"]'))
        .toBeVisible({ timeout: 500 });
      
      await photographerPage.click('[data-testid="acknowledge-alert"]');
    }

    // Verify no alerts were missed
    await expect(photographerPage.locator('[data-testid="missed-alerts-count"]'))
      .toContainText('0');

    // Test backup communication system activation
    await photographerPage.evaluate(() => {
      // Simulate total WebSocket failure
      window.dispatchEvent(new CustomEvent('realtime:connection_failed'));
    });

    // Verify fallback systems activate
    await expect(photographerPage.locator('[data-testid="backup-mode-active"]')).toBeVisible();
    await expect(photographerPage.locator('[data-testid="sms-backup-enabled"]')).toContainText('SMS notifications active');
  });

  test('Accessibility and screen reader compatibility', async () => {
    await photographerPage.goto('/wedding/2025-06-15/dashboard');

    // Test keyboard navigation through realtime notifications
    await photographerPage.keyboard.press('Tab');
    await expect(photographerPage.locator('[data-testid="realtime-status"]')).toBeFocused();

    await photographerPage.keyboard.press('Tab');
    await expect(photographerPage.locator('[data-testid="notification-list"]')).toBeFocused();

    // Verify ARIA labels and screen reader support
    const realtimeStatus = photographerPage.locator('[data-testid="realtime-status"]');
    await expect(realtimeStatus).toHaveAttribute('aria-label', 'Realtime connection status');
    await expect(realtimeStatus).toHaveAttribute('role', 'status');

    // Test high contrast mode compatibility
    await photographerPage.evaluate(() => {
      document.body.classList.add('high-contrast');
    });

    // Verify realtime indicators are still visible in high contrast
    await expect(photographerPage.locator('[data-testid="realtime-indicator"]')).toBeVisible();
    
    // Check color contrast meets WCAG standards
    const indicatorStyles = await photographerPage.locator('[data-testid="realtime-indicator"]').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });

    expect(indicatorStyles).toBeDefined();
  });

  test('Data consistency during concurrent operations', async () => {
    // Set up concurrent operations from multiple users
    await Promise.all([
      photographerPage.goto('/wedding/2025-06-15/dashboard'),
      couplePage.goto('/wedding/2025-06-15/mobile'),
      venueCoordinatorPage.goto('/wedding/2025-06-15/coordination')
    ]);

    // Simultaneously update different aspects of the wedding
    const concurrentOperations = [
      // Photographer updates status
      photographerPage.evaluate(() => {
        return fetch('/api/vendor-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'ready',
            message: 'Equipment setup complete'
          })
        });
      }),
      
      // Couple changes guest count
      couplePage.evaluate(() => {
        return fetch('/api/guest-count', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: 143,
            reason: 'Additional plus-one confirmed'
          })
        });
      }),
      
      // Venue coordinator updates timeline
      venueCoordinatorPage.evaluate(() => {
        return fetch('/api/timeline', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ceremony_start: '15:45',
            reason: 'Final coordination adjustment'
          })
        });
      })
    ];

    // Execute all operations simultaneously
    const results = await Promise.allSettled(concurrentOperations);
    
    // Verify all operations succeeded
    results.forEach((result, index) => {
      expect(result.status).toBe('fulfilled');
    });

    // Wait for realtime updates to propagate
    await photographerPage.waitForTimeout(2000);

    // Verify data consistency across all clients
    const photographerData = await photographerPage.evaluate(() => ({
      guestCount: document.querySelector('[data-testid="guest-count"]')?.textContent,
      ceremonyTime: document.querySelector('[data-testid="ceremony-time"]')?.textContent,
      vendorStatus: document.querySelector('[data-testid="photographer-status"]')?.textContent
    }));

    const coupleData = await couplePage.evaluate(() => ({
      guestCount: document.querySelector('[data-testid="guest-count"]')?.textContent,
      ceremonyTime: document.querySelector('[data-testid="ceremony-time"]')?.textContent
    }));

    const venueData = await venueCoordinatorPage.evaluate(() => ({
      guestCount: document.querySelector('[data-testid="guest-count"]')?.textContent,
      ceremonyTime: document.querySelector('[data-testid="ceremony-time"]')?.textContent,
      photographerStatus: document.querySelector('[data-testid="photographer-status"]')?.textContent
    }));

    // All clients should show consistent data
    expect(photographerData.guestCount).toBe('143');
    expect(coupleData.guestCount).toBe('143');
    expect(venueData.guestCount).toBe('143');

    expect(photographerData.ceremonyTime).toBe('15:45');
    expect(coupleData.ceremonyTime).toBe('15:45');
    expect(venueData.ceremonyTime).toBe('15:45');

    expect(photographerData.vendorStatus).toContain('ready');
    expect(venueData.photographerStatus).toContain('ready');
  });
});