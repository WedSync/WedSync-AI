import { test, expect } from '@playwright/test';
import { BroadcastTestHelper } from '../../helpers/broadcast-test-helper';
import { WeddingDataFactory } from '../../factories/wedding-data-factory';

describe('Wedding Privacy Boundary E2E Tests', () => {
  let broadcastHelper: BroadcastTestHelper;

  beforeAll(async () => {
    broadcastHelper = new BroadcastTestHelper();
    await broadcastHelper.initialize();
  });

  describe('Cross-Wedding Data Isolation', () => {
    test('photographers only see broadcasts for their assigned weddings', async ({
      page,
    }) => {
      // Create multiple weddings
      const wedding1 = WeddingDataFactory.createUpcomingWedding({
        coupleName: 'Alice & Bob Wedding',
      });
      const wedding2 = WeddingDataFactory.createUpcomingWedding({
        coupleName: 'Carol & David Wedding',
      });
      const wedding3 = WeddingDataFactory.createUpcomingWedding({
        coupleName: 'Emma & Frank Wedding',
      });

      // Create photographer assigned to only wedding1 and wedding3
      const photographer = WeddingDataFactory.createPhotographer(undefined, {
        name: 'Multi-Wedding Photographer',
        weddingIds: [wedding1.id, wedding3.id],
      });

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, photographer.id);

      // Send broadcast for wedding2 (photographer should NOT see this)
      const wedding2Broadcast = {
        type: 'timeline.changed',
        priority: 'high' as const,
        title: 'Wedding 2: Timeline Update',
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

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding2Broadcast);

      // Wait to ensure broadcast would appear if visible
      await page.waitForTimeout(3000);
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send broadcast for wedding1 (photographer SHOULD see this)
      const wedding1Broadcast = {
        type: 'timeline.changed',
        priority: 'high' as const,
        title: 'Wedding 1: Timeline Update',
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

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding1Broadcast);

      // Should see wedding1 broadcast
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('text=Wedding 1: Timeline Update'),
      ).toBeVisible();
      await expect(page.locator('text=Alice & Bob Wedding')).toBeVisible();

      // Dismiss first broadcast
      await page
        .locator('[data-broadcast-toast] [data-dismiss-button]')
        .click();

      // Send broadcast for wedding3 (photographer SHOULD see this)
      const wedding3Broadcast = {
        type: 'payment.received',
        priority: 'normal' as const,
        title: 'Wedding 3: Payment Confirmed',
        message: 'Final payment received for photography services',
        weddingContext: {
          weddingId: wedding3.id,
          coupleName: wedding3.coupleName,
          weddingDate: wedding3.date,
        },
        targeting: {
          weddingIds: [wedding3.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding3Broadcast);

      // Should see wedding3 broadcast
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('text=Wedding 3: Payment Confirmed'),
      ).toBeVisible();
      await expect(page.locator('text=Emma & Frank Wedding')).toBeVisible();
    });

    test('venue managers only access their venue weddings', async ({
      page,
    }) => {
      // Create weddings at different venues
      const venueAWedding1 = WeddingDataFactory.createUpcomingWedding({
        venue: 'Grand Ballroom Venue A',
      });
      const venueAWedding2 = WeddingDataFactory.createUpcomingWedding({
        venue: 'Grand Ballroom Venue A',
      });
      const venueBWedding = WeddingDataFactory.createUpcomingWedding({
        venue: 'Elegant Gardens Venue B',
      });

      // Venue manager only manages Venue A
      const venueManager = WeddingDataFactory.createVenueManager(undefined, {
        name: 'Venue A Manager',
        weddingIds: [venueAWedding1.id, venueAWedding2.id],
        organizationId: 'venue-a-org',
      });

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, venueManager.id);

      // Send broadcast for Venue B (manager should NOT see this)
      const venueBBroadcast = {
        type: 'venue.setup_complete',
        priority: 'normal' as const,
        title: 'Venue B: Setup Complete',
        message: 'All decorations and seating arranged',
        weddingContext: {
          weddingId: venueBWedding.id,
          coupleName: venueBWedding.coupleName,
          weddingDate: venueBWedding.date,
        },
        targeting: {
          organizationIds: ['venue-b-org'],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, venueBBroadcast);
      await page.waitForTimeout(3000);
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send broadcast for Venue A Wedding 1 (manager SHOULD see this)
      const venueABroadcast = {
        type: 'venue.catering_arrived',
        priority: 'high' as const,
        title: 'Venue A: Catering Team Arrived',
        message: 'Kitchen setup in progress for evening reception',
        weddingContext: {
          weddingId: venueAWedding1.id,
          coupleName: venueAWedding1.coupleName,
          weddingDate: venueAWedding1.date,
        },
        targeting: {
          organizationIds: ['venue-a-org'],
          weddingIds: [venueAWedding1.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, venueABroadcast);

      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('text=Venue A: Catering Team Arrived'),
      ).toBeVisible();
    });

    test('couples only see broadcasts for their own wedding', async ({
      page,
    }) => {
      const wedding1 = WeddingDataFactory.createUpcomingWedding({
        coupleName: 'John & Jane Smith',
      });
      const wedding2 = WeddingDataFactory.createUpcomingWedding({
        coupleName: 'Mike & Sarah Johnson',
      });

      // Couple from wedding1
      const couple1 = WeddingDataFactory.createCouple(wedding1.id, {
        name: 'John Smith',
        email: 'john@smithwedding.com',
      });

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, couple1.id);

      // Send broadcast for wedding2 (couple1 should NOT see this)
      const wedding2Broadcast = {
        type: 'photo.gallery_updated',
        priority: 'normal' as const,
        title: 'New Photos Available',
        message: 'Your photographer has uploaded 50 new photos',
        weddingContext: {
          weddingId: wedding2.id,
          coupleName: wedding2.coupleName,
          weddingDate: wedding2.date,
        },
        targeting: {
          roles: ['couple'],
          weddingIds: [wedding2.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding2Broadcast);
      await page.waitForTimeout(3000);
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send broadcast for wedding1 (couple1 SHOULD see this)
      const wedding1Broadcast = {
        type: 'timeline.final_confirmed',
        priority: 'high' as const,
        title: 'Final Wedding Timeline Confirmed',
        message:
          'Your wedding day timeline has been finalized. Please review the schedule.',
        weddingContext: {
          weddingId: wedding1.id,
          coupleName: wedding1.coupleName,
          weddingDate: wedding1.date,
        },
        targeting: {
          roles: ['couple'],
          weddingIds: [wedding1.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding1Broadcast);

      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('text=Final Wedding Timeline Confirmed'),
      ).toBeVisible();
      await expect(page.locator('text=John & Jane Smith')).toBeVisible();
    });
  });

  describe('Role-Based Access Control', () => {
    test('coordinator broadcasts reach only wedding team members', async ({
      page,
    }) => {
      const wedding = WeddingDataFactory.createUpcomingWedding();
      const weddingTeam = WeddingDataFactory.createWeddingTeam(wedding.id);
      const coordinator = weddingTeam.find((u) => u.role === 'coordinator')!;
      const photographer = weddingTeam.find((u) => u.role === 'photographer')!;

      // Create unrelated user (different wedding)
      const otherWedding = WeddingDataFactory.createUpcomingWedding();
      const unrelatedUser = WeddingDataFactory.createPhotographer(
        otherWedding.id,
      );

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, photographer.id);

      // Send coordinator broadcast to wedding team
      const teamBroadcast = {
        type: 'coordinator.team_meeting',
        priority: 'high' as const,
        title: 'Team Meeting: 2 Hours Before Ceremony',
        message:
          'All vendors meet at venue entrance at 1:00 PM for final coordination',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        targeting: {
          roles: ['photographer', 'florist', 'venue_manager'],
          weddingIds: [wedding.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, teamBroadcast);

      // Wedding team member should see broadcast
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('text=Team Meeting: 2 Hours Before Ceremony'),
      ).toBeVisible();

      // Verify unrelated user would not receive this (simulated check)
      const unrelatedUserHistory = await broadcastHelper.getBroadcastHistory(
        unrelatedUser.id,
      );
      const teamBroadcastReceived = unrelatedUserHistory.some(
        (b) => b.broadcast.title === 'Team Meeting: 2 Hours Before Ceremony',
      );
      expect(teamBroadcastReceived).toBe(false);
    });

    test('vendor-specific broadcasts maintain privacy boundaries', async ({
      page,
    }) => {
      const wedding = WeddingDataFactory.createUpcomingWedding();
      const photographer = WeddingDataFactory.createPhotographer(wedding.id);
      const florist = WeddingDataFactory.createFlorist(wedding.id);

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, photographer.id);

      // Send florist-specific broadcast (photographer should NOT see)
      const floristBroadcast = {
        type: 'vendor.delivery_update',
        priority: 'normal' as const,
        title: 'Florist: Flowers Delivered Early',
        message:
          'Bridal bouquet and centerpieces have arrived ahead of schedule',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        targeting: {
          roles: ['florist', 'coordinator'],
          weddingIds: [wedding.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, floristBroadcast);
      await page.waitForTimeout(3000);
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send photographer-specific broadcast (photographer SHOULD see)
      const photographerBroadcast = {
        type: 'vendor.equipment_check',
        priority: 'high' as const,
        title: 'Photography: Equipment Check Required',
        message:
          'Please confirm all camera equipment and backup batteries are ready',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        targeting: {
          roles: ['photographer'],
          weddingIds: [wedding.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(
        page,
        photographerBroadcast,
      );

      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('text=Photography: Equipment Check Required'),
      ).toBeVisible();
    });
  });

  describe('Multi-Wedding Scenario Privacy', () => {
    test('busy photographer handles multiple wedding broadcasts correctly', async ({
      page,
    }) => {
      // Create June wedding season scenario
      const { weddings, suppliers } =
        WeddingDataFactory.createJuneWeddingSeasonData();
      const busyPhotographer = suppliers.find((s) =>
        s.name?.includes('Photographer 1'),
      )!;

      // Get first 3 weddings that photographer is assigned to
      const assignedWeddings = weddings
        .filter((w) => busyPhotographer.weddingIds.includes(w.id))
        .slice(0, 3);

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(
        page,
        busyPhotographer.id,
      );

      // Send broadcasts for all assigned weddings rapidly
      const broadcasts = assignedWeddings.map((wedding, index) => ({
        type: 'timeline.reminder',
        priority: 'high' as const,
        title: `Wedding ${index + 1}: Photo Session Starting Soon`,
        message: `${wedding.coupleName} photo session begins in 30 minutes`,
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
      }));

      // Send first broadcast
      await broadcastHelper.triggerRealtimeBroadcast(page, broadcasts[0]);
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });

      // Should show wedding context clearly
      await expect(
        page.locator(`text=${assignedWeddings[0].coupleName}`),
      ).toBeVisible();

      // Acknowledge first broadcast
      await page
        .locator('[data-broadcast-toast] [data-dismiss-button]')
        .click();

      // Send second broadcast - should appear independently
      await broadcastHelper.triggerRealtimeBroadcast(page, broadcasts[1]);
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator(`text=${assignedWeddings[1].coupleName}`),
      ).toBeVisible();

      // Should not show content from first wedding
      await expect(
        page.locator(`text=${assignedWeddings[0].coupleName}`),
      ).not.toBeVisible();
    });

    test('coordinator handoff maintains wedding boundaries', async ({
      page,
    }) => {
      const wedding1 = WeddingDataFactory.createUpcomingWedding();
      const wedding2 = WeddingDataFactory.createUpcomingWedding();

      const coordinator1 = WeddingDataFactory.createCoordinator(wedding1.id, {
        name: 'Coordinator Wedding 1',
      });
      const coordinator2 = WeddingDataFactory.createCoordinator(wedding2.id, {
        name: 'Coordinator Wedding 2',
      });
      const backupCoordinator = WeddingDataFactory.createCoordinator(
        undefined,
        {
          name: 'Backup Coordinator',
          weddingIds: [], // Not yet assigned to any wedding
        },
      );

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(
        page,
        backupCoordinator.id,
      );

      // Send handoff for wedding1 only
      const handoffBroadcast = {
        type: 'coordinator.handoff_request',
        priority: 'critical' as const,
        title: 'Coordination Handoff Request - Wedding 1',
        message: `${coordinator1.name} needs backup for ${wedding1.coupleName}'s wedding. Can you take over?`,
        weddingContext: {
          weddingId: wedding1.id,
          coupleName: wedding1.coupleName,
          weddingDate: wedding1.date,
        },
        action: {
          label: 'Accept Wedding 1 Handoff',
          url: `/handoff/${wedding1.id}/accept`,
        },
        targeting: {
          userIds: [backupCoordinator.id],
          weddingIds: [wedding1.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, handoffBroadcast);

      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 3000,
      });

      // Should clearly identify which wedding
      await expect(page.locator('text=Wedding 1')).toBeVisible();
      await expect(page.locator(`text=${wedding1.coupleName}`)).toBeVisible();

      // Should not show any reference to wedding2
      await expect(
        page.locator(`text=${wedding2.coupleName}`),
      ).not.toBeVisible();

      // Accept handoff
      await page.locator('text=Accept Wedding 1 Handoff').click();
      await expect(page).toHaveURL(`/handoff/${wedding1.id}/accept`);
    });

    test('emergency broadcasts respect wedding boundaries even in crisis', async ({
      page,
    }) => {
      const wedding1 = WeddingDataFactory.createUpcomingWedding({
        venue: 'Riverside Venue',
      });
      const wedding2 = WeddingDataFactory.createUpcomingWedding({
        venue: 'Mountain View Venue',
      });

      const photographer = WeddingDataFactory.createPhotographer(wedding1.id);

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, photographer.id);

      // Send emergency broadcast for wedding2 (different venue)
      const wedding2Emergency = {
        type: 'venue.emergency',
        priority: 'critical' as const,
        title: 'VENUE EMERGENCY - Mountain View Venue',
        message:
          'Power outage at Mountain View Venue. Backup generators activated.',
        weddingContext: {
          weddingId: wedding2.id,
          coupleName: wedding2.coupleName,
          weddingDate: wedding2.date,
        },
        targeting: {
          weddingIds: [wedding2.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding2Emergency);
      await page.waitForTimeout(5000); // Even critical broadcasts respect privacy
      await expect(page.locator('[data-broadcast-toast]')).not.toBeVisible();

      // Send emergency broadcast for wedding1 (photographer's venue)
      const wedding1Emergency = {
        type: 'venue.emergency',
        priority: 'critical' as const,
        title: 'VENUE EMERGENCY - Riverside Venue',
        message:
          'Severe weather alert. All outdoor activities moved indoors immediately.',
        weddingContext: {
          weddingId: wedding1.id,
          coupleName: wedding1.coupleName,
          weddingDate: wedding1.date,
        },
        targeting: {
          weddingIds: [wedding1.id],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, wedding1Emergency);

      // Should receive emergency broadcast for their assigned wedding
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 2000,
      });
      await expect(page.locator('text=Riverside Venue')).toBeVisible();
      await expect(page.locator(`text=${wedding1.coupleName}`)).toBeVisible();
    });
  });

  describe('Data Audit and Compliance', () => {
    test('broadcast history respects wedding boundaries', async ({ page }) => {
      const wedding1 = WeddingDataFactory.createUpcomingWedding();
      const wedding2 = WeddingDataFactory.createUpcomingWedding();
      const photographer = WeddingDataFactory.createPhotographer(wedding1.id);

      // Send broadcasts to both weddings
      await broadcastHelper.sendBroadcast(
        {
          type: 'timeline.changed',
          priority: 'high' as const,
          title: 'Wedding 1 Timeline Update',
          message: 'Timeline changed for wedding 1',
          weddingContext: {
            weddingId: wedding1.id,
            coupleName: wedding1.coupleName,
            weddingDate: wedding1.date,
          },
        },
        [photographer.id],
      );

      // This broadcast should not appear in photographer's history
      const otherPhotographer = WeddingDataFactory.createPhotographer(
        wedding2.id,
      );
      await broadcastHelper.sendBroadcast(
        {
          type: 'timeline.changed',
          priority: 'high' as const,
          title: 'Wedding 2 Timeline Update',
          message: 'Timeline changed for wedding 2',
          weddingContext: {
            weddingId: wedding2.id,
            coupleName: wedding2.coupleName,
            weddingDate: wedding2.date,
          },
        },
        [otherPhotographer.id],
      );

      // Check photographer's broadcast history
      const photographerHistory = await broadcastHelper.getBroadcastHistory(
        photographer.id,
      );

      // Should only see their wedding's broadcasts
      expect(photographerHistory.length).toBeGreaterThan(0);

      const wedding1Broadcasts = photographerHistory.filter(
        (b) => b.broadcast.wedding_context?.weddingId === wedding1.id,
      );
      const wedding2Broadcasts = photographerHistory.filter(
        (b) => b.broadcast.wedding_context?.weddingId === wedding2.id,
      );

      expect(wedding1Broadcasts.length).toBeGreaterThan(0);
      expect(wedding2Broadcasts.length).toBe(0);
    });

    test('user preferences isolated by wedding context', async ({ page }) => {
      const wedding1 = WeddingDataFactory.createUpcomingWedding();
      const wedding2 = WeddingDataFactory.createUpcomingWedding();
      const photographer = WeddingDataFactory.createPhotographer(undefined, {
        weddingIds: [wedding1.id, wedding2.id], // Assigned to both weddings
      });

      await page.goto('/settings/notifications');
      await page.context().addInitScript(() => {
        window.localStorage.setItem('user', JSON.stringify(photographer));
      });

      // Should be able to set different preferences per wedding
      await expect(page.locator('[data-wedding-selector]')).toBeVisible();

      // Select wedding1 and set preferences
      await page.locator('[data-wedding-selector]').selectOption(wedding1.id);
      await page.locator('input[name="timelineBroadcasts"]').check();
      await page.locator('input[name="paymentBroadcasts"]').uncheck();
      await page.locator('button:text("Save for This Wedding")').click();

      // Select wedding2 and set different preferences
      await page.locator('[data-wedding-selector]').selectOption(wedding2.id);
      await page.locator('input[name="timelineBroadcasts"]').uncheck();
      await page.locator('input[name="paymentBroadcasts"]').check();
      await page.locator('button:text("Save for This Wedding")').click();

      // Verify preferences are saved per wedding
      await page.locator('[data-wedding-selector]').selectOption(wedding1.id);
      await expect(
        page.locator('input[name="timelineBroadcasts"]'),
      ).toBeChecked();
      await expect(
        page.locator('input[name="paymentBroadcasts"]'),
      ).not.toBeChecked();

      await page.locator('[data-wedding-selector]').selectOption(wedding2.id);
      await expect(
        page.locator('input[name="timelineBroadcasts"]'),
      ).not.toBeChecked();
      await expect(
        page.locator('input[name="paymentBroadcasts"]'),
      ).toBeChecked();
    });
  });

  afterAll(async () => {
    await broadcastHelper.cleanup();
    WeddingDataFactory.reset();
  });
});
