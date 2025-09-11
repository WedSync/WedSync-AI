import { test, expect } from '@playwright/test';
import { BroadcastTestHelper } from '../../helpers/broadcast-test-helper';
import { WeddingDataFactory } from '../../factories/wedding-data-factory';

describe('WS-205 Broadcast System E2E Tests', () => {
  let broadcastHelper: BroadcastTestHelper;

  beforeAll(async () => {
    broadcastHelper = new BroadcastTestHelper();
    await broadcastHelper.initialize();
  });

  describe('Priority Broadcast Handling', () => {
    test('critical broadcasts show immediately and require acknowledgment', async ({
      page,
    }) => {
      // Setup wedding context
      const wedding = WeddingDataFactory.createUpcomingWedding();
      const coordinator = WeddingDataFactory.createCoordinator(wedding.id);
      const photographer = WeddingDataFactory.createPhotographer(wedding.id);

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        // Mock user as coordinator
        window.localStorage.setItem('user', JSON.stringify(coordinator));
      });

      // Send critical broadcast (wedding emergency)
      const criticalBroadcast = {
        type: 'wedding.emergency',
        priority: 'critical' as const,
        title: 'URGENT: Venue flooding - ceremony location changed',
        message:
          'Heavy rain has caused flooding at the original venue. Ceremony moved to backup location: Grand Ballroom. All vendors please confirm receipt.',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'View New Location Details',
          url: `/weddings/${wedding.id}/venue-change`,
        },
      };

      await broadcastHelper.sendBroadcast(criticalBroadcast, [
        coordinator.id,
        photographer.id,
      ]);

      // Verify critical broadcast appears immediately
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 5000,
      });

      // Verify critical styling and behavior
      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toHaveClass(/bg-gradient-to-r from-red-600/);
      await expect(toast.locator('.animate-pulse')).toBeVisible();

      // Verify acknowledgment is required
      await expect(toast.locator('text=Acknowledge')).toBeVisible();

      // Verify no auto-hide (critical broadcasts persist)
      await page.waitForTimeout(10000);
      await expect(toast).toBeVisible();

      // Test acknowledgment flow
      await toast.locator('text=Acknowledge').click();

      // Should show confirmation for critical dismiss
      await expect(
        page.locator('text=Are you sure you want to dismiss'),
      ).toBeVisible();
      await page.locator('button:text("OK")').click();

      // Verify toast is dismissed after acknowledgment
      await expect(toast).not.toBeVisible({ timeout: 3000 });

      // Verify acknowledgment is tracked
      const deliveryStatus = await broadcastHelper.getDeliveryStatus(
        criticalBroadcast.id || 'test-broadcast',
        coordinator.id,
      );
      expect(deliveryStatus.acknowledgedAt).toBeTruthy();
    });

    test('high priority broadcasts auto-hide after 10 seconds', async ({
      page,
    }) => {
      const wedding = WeddingDataFactory.createUpcomingWedding();
      const photographer = WeddingDataFactory.createPhotographer(wedding.id);

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(photographer));
      });

      const highPriorityBroadcast = {
        type: 'timeline.changed',
        priority: 'high' as const,
        title: 'Timeline Update: Ceremony delayed by 30 minutes',
        message:
          'Due to traffic delays, the ceremony start time has been moved from 3:00 PM to 3:30 PM.',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
      };

      const startTime = Date.now();
      await broadcastHelper.sendBroadcast(highPriorityBroadcast, [
        photographer.id,
      ]);

      // Verify broadcast appears
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible();

      // Verify high priority styling
      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toHaveClass(/bg-gradient-to-r from-amber-500/);

      // Verify progress bar is present
      await expect(toast.locator('[data-progress-bar]')).toBeVisible();

      // Wait for auto-hide (10 seconds + buffer)
      await page.waitForTimeout(11000);
      const endTime = Date.now();

      // Verify toast is gone
      await expect(toast).not.toBeVisible();

      // Verify timing (should auto-hide around 10 seconds)
      const elapsedTime = endTime - startTime;
      expect(elapsedTime).toBeGreaterThan(9000);
      expect(elapsedTime).toBeLessThan(12000);
    });

    test('normal broadcasts auto-hide after 5 seconds', async ({ page }) => {
      const user = WeddingDataFactory.createUser();

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(user));
      });

      const normalBroadcast = {
        type: 'feature.released',
        priority: 'normal' as const,
        title: 'New Feature: Photo Gallery Sharing',
        message:
          'You can now share your wedding photos directly with guests through secure links.',
      };

      const startTime = Date.now();
      await broadcastHelper.sendBroadcast(normalBroadcast, [user.id]);

      await expect(page.locator('[data-broadcast-toast]')).toBeVisible();

      // Verify normal priority styling
      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toHaveClass(/bg-gradient-to-r from-blue-600/);

      // Wait for auto-hide
      await page.waitForTimeout(6000);
      const endTime = Date.now();

      await expect(toast).not.toBeVisible();

      // Verify 5-second timing
      const elapsedTime = endTime - startTime;
      expect(elapsedTime).toBeGreaterThan(4000);
      expect(elapsedTime).toBeLessThan(7000);
    });
  });

  describe('Wedding Context Privacy', () => {
    test('users only see broadcasts for their weddings', async ({ page }) => {
      // Create two separate weddings
      const wedding1 = WeddingDataFactory.createUpcomingWedding();
      const wedding2 = WeddingDataFactory.createUpcomingWedding();

      const photographer1 = WeddingDataFactory.createPhotographer(wedding1.id);
      const photographer2 = WeddingDataFactory.createPhotographer(wedding2.id);

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(photographer1));
      });

      // Send wedding-specific broadcast to wedding2 (photographer1 should NOT see this)
      const wedding2Broadcast = {
        type: 'timeline.changed',
        priority: 'high' as const,
        title: 'Wedding 2: Ceremony time changed',
        message: 'Ceremony moved to 4 PM',
        weddingContext: {
          weddingId: wedding2.id,
          coupleName: wedding2.coupleName,
          weddingDate: wedding2.date,
        },
        targeting: {
          weddingIds: [wedding2.id],
        },
      };

      await broadcastHelper.sendBroadcast(wedding2Broadcast, [
        photographer2.id,
      ]);

      // Wait to ensure broadcast would have appeared if visible
      await page.waitForTimeout(3000);

      // Verify photographer1 does not see wedding2 broadcast
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send broadcast for wedding1 (photographer1 SHOULD see this)
      const wedding1Broadcast = {
        type: 'timeline.changed',
        priority: 'high' as const,
        title: 'Wedding 1: Ceremony time changed',
        message: 'Ceremony moved to 5 PM',
        weddingContext: {
          weddingId: wedding1.id,
          coupleName: wedding1.coupleName,
          weddingDate: wedding1.date,
        },
        targeting: {
          weddingIds: [wedding1.id],
        },
      };

      await broadcastHelper.sendBroadcast(wedding1Broadcast, [
        photographer1.id,
      ]);

      // Verify photographer1 sees their wedding's broadcast
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 5000,
      });

      const toast = page.locator('[data-broadcast-toast]');
      await expect(
        toast.locator('text=Wedding 1: Ceremony time changed'),
      ).toBeVisible();
    });

    test('coordinator handoff scenarios work correctly', async ({ page }) => {
      const wedding = WeddingDataFactory.createUpcomingWedding();
      const primaryCoordinator = WeddingDataFactory.createCoordinator(
        wedding.id,
      );
      const backupCoordinator = WeddingDataFactory.createCoordinator(
        wedding.id,
      );
      const photographer = WeddingDataFactory.createPhotographer(wedding.id);

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(backupCoordinator));
      });

      // Simulate emergency coordinator handoff
      const handoffBroadcast = {
        type: 'coordinator.handoff',
        priority: 'critical' as const,
        title: 'URGENT: Coordinator Handoff Required',
        message: `${primaryCoordinator.name} is unavailable. ${backupCoordinator.name}, please take over coordination for ${wedding.coupleName}'s wedding immediately.`,
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'Accept Coordination Role',
          url: `/weddings/${wedding.id}/accept-handoff`,
        },
        targeting: {
          userIds: [backupCoordinator.id],
          weddingIds: [wedding.id],
        },
      };

      await broadcastHelper.sendBroadcast(handoffBroadcast, [
        backupCoordinator.id,
        photographer.id,
      ]);

      // Verify backup coordinator sees handoff broadcast
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 5000,
      });

      const toast = page.locator('[data-broadcast-toast]');
      await expect(
        toast.locator('text=URGENT: Coordinator Handoff Required'),
      ).toBeVisible();
      await expect(
        toast.locator('text=Accept Coordination Role'),
      ).toBeVisible();

      // Test accepting handoff
      await toast.locator('text=Accept Coordination Role').click();

      // Should navigate to handoff acceptance page
      await expect(page).toHaveURL(`/weddings/${wedding.id}/accept-handoff`);

      // Acknowledge the handoff broadcast
      await page.goBack();
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible();
      await page
        .locator('[data-broadcast-toast] button:text("Acknowledge")')
        .click();
      await page.locator('button:text("OK")').click(); // Confirm critical dismiss

      // Verify handoff is tracked
      const deliveryStatus = await broadcastHelper.getDeliveryStatus(
        handoffBroadcast.id || 'test-broadcast',
        backupCoordinator.id,
      );
      expect(deliveryStatus.acknowledgedAt).toBeTruthy();
      expect(deliveryStatus.actionClicked).toBeTruthy();
    });
  });

  describe('Broadcast Inbox Management', () => {
    test('inbox shows broadcast history with filtering', async ({ page }) => {
      const user = WeddingDataFactory.createUser();
      const wedding = WeddingDataFactory.createUpcomingWedding();

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(user));
      });

      // Create test broadcasts with different priorities
      const testBroadcasts = [
        {
          type: 'feature.released',
          priority: 'normal' as const,
          title: 'Normal Priority Test',
          message: 'This is a normal priority broadcast',
        },
        {
          type: 'payment.required',
          priority: 'high' as const,
          title: 'High Priority Test',
          message: 'This is a high priority broadcast',
        },
        {
          type: 'wedding.emergency',
          priority: 'critical' as const,
          title: 'Critical Priority Test',
          message: 'This is a critical priority broadcast',
        },
      ];

      // Send all test broadcasts
      for (const broadcast of testBroadcasts) {
        await broadcastHelper.sendBroadcast(broadcast, [user.id]);
        await page.waitForTimeout(1000); // Ensure different timestamps
      }

      // Navigate to broadcast inbox
      await page.locator('[data-broadcast-badge]').click();
      await expect(page.locator('[data-broadcast-inbox]')).toBeVisible();

      // Verify all broadcasts appear in inbox
      for (const broadcast of testBroadcasts) {
        await expect(page.locator(`text=${broadcast.title}`)).toBeVisible();
      }

      // Test priority filtering
      await page.locator('[data-filter-dropdown]').click();
      await page.locator('text=Critical Only').click();

      // Should only show critical broadcast
      await expect(page.locator('text=Critical Priority Test')).toBeVisible();
      await expect(page.locator('text=Normal Priority Test')).not.toBeVisible();
      await expect(page.locator('text=High Priority Test')).not.toBeVisible();

      // Reset filter and test search
      await page.locator('[data-filter-dropdown]').click();
      await page.locator('text=All Priorities').click();

      await page.locator('[data-search-input]').fill('payment');
      await expect(page.locator('text=High Priority Test')).toBeVisible();
      await expect(page.locator('text=Normal Priority Test')).not.toBeVisible();

      // Test bulk actions
      await page.locator('[data-search-input]').fill(''); // Clear search

      // Select multiple broadcasts
      await page
        .locator('[data-broadcast-item="0"] input[type="checkbox"]')
        .check();
      await page
        .locator('[data-broadcast-item="1"] input[type="checkbox"]')
        .check();

      // Mark as read
      await page.locator('button:text("Mark Read (2)")').click();

      // Verify read status
      const readItems = page.locator('[data-broadcast-item].read');
      await expect(readItems).toHaveCount(2);
    });

    test('unread count updates correctly', async ({ page }) => {
      const user = WeddingDataFactory.createUser();

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(user));
      });

      // Initially should show 0 unread
      const badge = page.locator('[data-broadcast-badge]');
      await expect(badge.locator('[data-unread-count]')).not.toBeVisible();

      // Send a broadcast
      const broadcast = {
        type: 'feature.released',
        priority: 'normal' as const,
        title: 'Test Unread Count',
        message: 'Testing unread counter',
      };

      await broadcastHelper.sendBroadcast(broadcast, [user.id]);
      await page.waitForTimeout(2000);

      // Should show 1 unread
      await expect(badge.locator('[data-unread-count]')).toBeVisible();
      await expect(badge.locator('[data-unread-count]')).toHaveText('1');

      // Send another broadcast
      await broadcastHelper.sendBroadcast(
        {
          ...broadcast,
          title: 'Second Broadcast',
        },
        [user.id],
      );
      await page.waitForTimeout(2000);

      // Should show 2 unread
      await expect(badge.locator('[data-unread-count]')).toHaveText('2');

      // Open inbox and mark one as read
      await badge.click();
      await page
        .locator('[data-broadcast-item="0"] button:text("Mark Read")')
        .click();

      // Should show 1 unread
      await expect(badge.locator('[data-unread-count]')).toHaveText('1');
    });
  });

  describe('User Preferences', () => {
    test('quiet hours prevent non-critical broadcasts', async ({ page }) => {
      const user = WeddingDataFactory.createUser();

      await page.goto('/dashboard');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(user));
      });

      // Set quiet hours preferences
      await page.goto('/settings/notifications');
      await page.locator('input[name="quietHoursEnabled"]').check();
      await page.locator('select[name="quietStart"]').selectOption('22:00');
      await page.locator('select[name="quietEnd"]').selectOption('08:00');
      await page.locator('button:text("Save Preferences")').click();

      // Mock current time to be within quiet hours (11 PM)
      await page.addInitScript(() => {
        const mockDate = new Date();
        mockDate.setHours(23, 0, 0, 0); // 11 PM
        Date.now = () => mockDate.getTime();
        Date.prototype.getHours = () => 23;
      });

      await page.goto('/dashboard');

      // Send normal broadcast during quiet hours (should be suppressed)
      const normalBroadcast = {
        type: 'feature.released',
        priority: 'normal' as const,
        title: 'Normal During Quiet Hours',
        message: 'This should be suppressed',
      };

      await broadcastHelper.sendBroadcast(normalBroadcast, [user.id]);
      await page.waitForTimeout(3000);

      // Should not appear as toast
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send critical broadcast during quiet hours (should still appear)
      const criticalBroadcast = {
        type: 'wedding.emergency',
        priority: 'critical' as const,
        title: 'Critical During Quiet Hours',
        message: 'This should still appear',
      };

      await broadcastHelper.sendBroadcast(criticalBroadcast, [user.id]);
      await page.waitForTimeout(2000);

      // Critical should still appear
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible();
      await expect(
        page.locator('text=Critical During Quiet Hours'),
      ).toBeVisible();
    });

    test('role-based recommendations work correctly', async ({ page }) => {
      const photographer = WeddingDataFactory.createPhotographer();

      await page.goto('/settings/notifications');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(photographer));
      });

      await page.reload();

      // Verify photographer-specific recommendations appear
      await expect(
        page.locator('text=Wedding Photographer Settings'),
      ).toBeVisible();
      await expect(
        page.locator('text=Enable timeline and payment broadcasts'),
      ).toBeVisible();
      await expect(
        page.locator(
          'text=Critical alerts help avoid missing important updates',
        ),
      ).toBeVisible();

      // Test recommended settings for photographers
      const timelineBroadcasts = page.locator(
        'input[name="collaborationBroadcasts"]',
      );
      const paymentBroadcasts = page.locator(
        'input[name="businessBroadcasts"]',
      );

      await expect(timelineBroadcasts).toBeChecked(); // Should be enabled by default
      await expect(paymentBroadcasts).toBeChecked();
    });
  });

  afterAll(async () => {
    await broadcastHelper.cleanup();
  });
});
