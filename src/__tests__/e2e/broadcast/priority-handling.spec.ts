import { test, expect } from '@playwright/test';
import { BroadcastTestHelper } from '../../helpers/broadcast-test-helper';
import { WeddingDataFactory } from '../../factories/wedding-data-factory';

describe('Broadcast Priority Handling E2E Tests', () => {
  let broadcastHelper: BroadcastTestHelper;

  beforeAll(async () => {
    broadcastHelper = new BroadcastTestHelper();
    await broadcastHelper.initialize();
  });

  describe('Critical Priority Emergency Scenarios', () => {
    test('venue evacuation broadcast - immediate display and persistent until acknowledged', async ({
      page,
    }) => {
      const { wedding, team } = WeddingDataFactory.createEmergencyScenario();
      const coordinator = team.find((u) => u.role === 'coordinator')!;
      const photographer = team.find((u) => u.role === 'photographer')!;

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, coordinator.id);

      const evacuationBroadcast = {
        type: 'venue.evacuation',
        priority: 'critical' as const,
        title: '🚨 IMMEDIATE EVACUATION REQUIRED',
        message:
          'FIRE ALARM ACTIVATED - All guests and vendors must evacuate immediately via nearest exit. Report to parking area for headcount.',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'Confirm Safe Evacuation',
          url: `/emergency/${wedding.id}/evacuation-check`,
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, evacuationBroadcast);

      // Critical broadcast should appear within 2 seconds
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible({
        timeout: 2000,
      });

      const toast = page.locator('[data-broadcast-toast]');

      // Verify emergency styling
      await expect(toast).toHaveClass(/bg-red-600|emergency-toast/);
      await expect(toast.locator('.emergency-icon')).toBeVisible();

      // Should have pulsing animation for urgency
      await expect(toast.locator('.animate-pulse')).toBeVisible();

      // Should play emergency sound (audio element)
      await expect(page.locator('audio[data-emergency-sound]')).toBeVisible();

      // Should persist for at least 30 seconds without acknowledgment
      await page.waitForTimeout(30000);
      await expect(toast).toBeVisible();

      // Should require explicit acknowledgment
      const ackButton = toast.locator('button:text("Acknowledge Emergency")');
      await expect(ackButton).toBeVisible();

      // Should show double confirmation for critical dismissal
      await ackButton.click();
      await expect(
        page.locator('text=CONFIRM: I have safely evacuated'),
      ).toBeVisible();

      await page.locator('button:text("YES - I AM SAFE")').click();

      // Only then should toast be dismissed
      await expect(toast).not.toBeVisible({ timeout: 3000 });
    });

    test('coordinator handoff during ceremony - seamless transition flow', async ({
      page,
    }) => {
      const wedding = WeddingDataFactory.createTodayWedding();
      const primaryCoordinator = WeddingDataFactory.createCoordinator(
        wedding.id,
        {
          name: 'Sarah Primary',
        },
      );
      const backupCoordinator = WeddingDataFactory.createCoordinator(
        wedding.id,
        {
          name: 'Mike Backup',
        },
      );

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(
        page,
        backupCoordinator.id,
      );

      const handoffBroadcast = {
        type: 'coordinator.emergency_handoff',
        priority: 'critical' as const,
        title: '⚠️ URGENT: Wedding Coordination Handoff',
        message: `${primaryCoordinator.name} has a family emergency and cannot continue. ${backupCoordinator.name}, please assume coordination duties IMMEDIATELY for ${wedding.coupleName}'s ceremony.`,
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'Accept Coordination (30 sec timeout)',
          url: `/handoff/${wedding.id}/accept`,
        },
        metadata: {
          timeoutSeconds: 30,
          primaryCoordinatorId: primaryCoordinator.id,
          ceremonyStatus: 'in_progress',
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, handoffBroadcast);

      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toBeVisible({ timeout: 2000 });

      // Should show countdown timer
      await expect(toast.locator('[data-countdown-timer]')).toBeVisible();

      // Should escalate urgency as time runs out
      await page.waitForTimeout(15000); // Wait 15 seconds
      await expect(toast).toHaveClass(/bg-red-700|urgency-escalated/);

      // Should show current ceremony details
      await expect(toast.locator('text=Ceremony In Progress')).toBeVisible();

      // Accept handoff with one click (no double confirm for time-critical)
      await toast.locator('text=Accept Coordination').click();

      // Should immediately navigate to coordination dashboard
      await expect(page).toHaveURL(`/weddings/${wedding.id}/coordination`);

      // Should show handoff confirmation
      await expect(
        page.locator('text=You are now the primary coordinator'),
      ).toBeVisible();

      // Should automatically notify all wedding team members
      const notificationBanner = page.locator('[data-team-notification]');
      await expect(notificationBanner).toBeVisible();
      await expect(
        notificationBanner.locator('text=Coordination handoff completed'),
      ).toBeVisible();
    });

    test('severe weather alert - multi-channel emergency broadcast', async ({
      page,
    }) => {
      const wedding = WeddingDataFactory.createTodayWedding({
        venue: 'Outdoor Garden Venue',
      });
      const weddingTeam = WeddingDataFactory.createWeddingTeam(wedding.id);

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(
        page,
        weddingTeam[0].id,
      );

      const weatherBroadcast = {
        type: 'weather.severe_warning',
        priority: 'critical' as const,
        title: '🌪️ SEVERE WEATHER WARNING',
        message:
          'Tornado warning issued for venue area. All outdoor activities must move inside IMMEDIATELY. Reception moved to indoor ballroom.',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'View Indoor Backup Plan',
          url: `/weddings/${wedding.id}/weather-backup`,
        },
        metadata: {
          weatherSeverity: 'tornado_warning',
          affectedAreas: ['ceremony', 'cocktail_hour', 'reception'],
          backupLocation: 'Grand Ballroom',
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, weatherBroadcast);

      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toBeVisible({ timeout: 2000 });

      // Should have weather-specific styling and icon
      await expect(toast.locator('.weather-warning-icon')).toBeVisible();
      await expect(toast).toHaveClass(/weather-emergency/);

      // Should show affected areas clearly
      await expect(
        toast.locator('text=Ceremony, Cocktail Hour, Reception'),
      ).toBeVisible();

      // Should show backup location prominently
      await expect(toast.locator('text=Grand Ballroom')).toBeVisible();

      // Should not auto-hide during severe weather
      await page.waitForTimeout(20000);
      await expect(toast).toBeVisible();

      // Should track acknowledgment for safety compliance
      await toast.locator('button:text("Acknowledge Weather Alert")').click();
      await page.locator('button:text("Confirm Safety Measures")').click();

      const deliveryStatus = await broadcastHelper.getDeliveryStatus(
        weatherBroadcast.id || 'weather-broadcast',
        weddingTeam[0].id,
      );
      expect(deliveryStatus.acknowledgedAt).toBeTruthy();
    });
  });

  describe('High Priority Timeline Changes', () => {
    test('ceremony delay during active wedding day', async ({ page }) => {
      const wedding = WeddingDataFactory.createTodayWedding();
      const photographer = WeddingDataFactory.createPhotographer(wedding.id);
      const florist = WeddingDataFactory.createFlorist(wedding.id);

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, photographer.id);

      const delayBroadcast = {
        type: 'timeline.ceremony_delay',
        priority: 'high' as const,
        title: '⏰ Ceremony Delayed - Updated Timeline',
        message:
          'Ceremony start delayed by 45 minutes due to traffic. New start time: 4:15 PM. All vendors please adjust schedules accordingly.',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'View Updated Schedule',
          url: `/weddings/${wedding.id}/timeline`,
        },
        metadata: {
          originalTime: '3:30 PM',
          newTime: '4:15 PM',
          delayMinutes: 45,
          affectedEvents: ['ceremony', 'cocktail_hour', 'reception'],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, delayBroadcast);

      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // High priority styling (amber/orange)
      await expect(toast).toHaveClass(/bg-amber-500|bg-orange-500/);

      // Should show timeline comparison
      await expect(toast.locator('text=3:30 PM → 4:15 PM')).toBeVisible();

      // Should show delay duration prominently
      await expect(toast.locator('text=45 minutes')).toBeVisible();

      // Should list affected events
      await expect(
        toast.locator('text=Ceremony, Cocktail Hour, Reception'),
      ).toBeVisible();

      // Should auto-hide after 10 seconds for high priority
      const startTime = Date.now();
      await page.waitForTimeout(11000);
      await expect(toast).not.toBeVisible();

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThan(9000);
      expect(elapsedTime).toBeLessThan(12000);
    });

    test('vendor substitution during wedding day', async ({ page }) => {
      const wedding = WeddingDataFactory.createTodayWedding();
      const weddingTeam = WeddingDataFactory.createWeddingTeam(wedding.id);
      const coordinator = weddingTeam.find((u) => u.role === 'coordinator')!;

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, coordinator.id);

      const substitutionBroadcast = {
        type: 'vendor.substitution',
        priority: 'high' as const,
        title: '🔄 Vendor Change: DJ Replacement',
        message:
          'Original DJ unavailable due to illness. Replacement DJ (Mark Stevens) will arrive at 5:00 PM for equipment setup. Same playlist confirmed.',
        weddingContext: {
          weddingId: wedding.id,
          coupleName: wedding.coupleName,
          weddingDate: wedding.date,
        },
        action: {
          label: 'View New Contact Details',
          url: `/weddings/${wedding.id}/vendors/dj-replacement`,
        },
        metadata: {
          originalVendor: 'Mike Johnson DJ Services',
          replacementVendor: 'Mark Stevens Entertainment',
          contactNumber: '+1-555-0199',
          arrivalTime: '5:00 PM',
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(
        page,
        substitutionBroadcast,
      );

      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Should highlight vendor change clearly
      await expect(toast.locator('text=DJ Replacement')).toBeVisible();

      // Should show new contact info
      await expect(toast.locator('text=Mark Stevens')).toBeVisible();
      await expect(toast.locator('text=5:00 PM')).toBeVisible();

      // Should provide reassurance (same playlist)
      await expect(toast.locator('text=Same playlist confirmed')).toBeVisible();

      // Should have progress bar for 10-second auto-hide
      await expect(toast.locator('[data-progress-bar]')).toBeVisible();

      // Can be manually dismissed before auto-hide
      await toast.locator('[data-dismiss-button]').click();
      await expect(toast).not.toBeVisible({ timeout: 1000 });
    });
  });

  describe('Normal Priority Feature Updates', () => {
    test('new feature announcement with gradual rollout', async ({ page }) => {
      const user = WeddingDataFactory.createUser('photographer');

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, user.id);

      const featureBroadcast = {
        type: 'feature.released',
        priority: 'normal' as const,
        title: '✨ New Feature: AI Photo Tagging',
        message:
          'Our new AI system can automatically tag guests in your wedding photos. Enable in your photo gallery settings.',
        action: {
          label: 'Try AI Tagging',
          url: '/features/ai-photo-tagging',
        },
        metadata: {
          featureFlag: 'ai_photo_tagging_beta',
          rolloutPercentage: 25,
          targetRoles: ['photographer', 'couple'],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, featureBroadcast);

      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Normal priority styling (blue)
      await expect(toast).toHaveClass(/bg-blue-600|bg-blue-500/);

      // Should show feature icon
      await expect(toast.locator('.feature-icon')).toBeVisible();

      // Should show "Beta" badge
      await expect(toast.locator('text=Beta')).toBeVisible();

      // Should auto-hide after 5 seconds
      const startTime = Date.now();
      await page.waitForTimeout(6000);
      await expect(toast).not.toBeVisible();

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThan(4000);
      expect(elapsedTime).toBeLessThan(7000);
    });

    test('system maintenance notification', async ({ page }) => {
      const user = WeddingDataFactory.createUser('coordinator');

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, user.id);

      const maintenanceBroadcast = {
        type: 'system.maintenance',
        priority: 'normal' as const,
        title: '🔧 Scheduled Maintenance Window',
        message:
          'System maintenance scheduled for Sunday 2:00-4:00 AM EST. Brief interruptions possible. All wedding day services unaffected.',
        action: {
          label: 'View Maintenance Schedule',
          url: '/system/maintenance-schedule',
        },
        metadata: {
          maintenanceStart: '2024-06-09T02:00:00Z',
          maintenanceEnd: '2024-06-09T04:00:00Z',
          expectedDowntime: '5-10 minutes',
          affectedServices: ['photo_sync', 'email_notifications'],
        },
      };

      await broadcastHelper.triggerRealtimeBroadcast(
        page,
        maintenanceBroadcast,
      );

      const toast = page.locator('[data-broadcast-toast]');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Should show maintenance icon
      await expect(toast.locator('.maintenance-icon')).toBeVisible();

      // Should show time window clearly
      await expect(toast.locator('text=Sunday 2:00-4:00 AM')).toBeVisible();

      // Should reassure about wedding day services
      await expect(
        toast.locator('text=wedding day services unaffected'),
      ).toBeVisible();

      // Should be dismissible immediately
      await toast.locator('[data-dismiss-button]').click();
      await expect(toast).not.toBeVisible({ timeout: 1000 });
    });
  });

  describe('Priority Queue Testing', () => {
    test('critical broadcasts interrupt normal broadcasts', async ({
      page,
    }) => {
      const user = WeddingDataFactory.createUser('coordinator');

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, user.id);

      // Send normal broadcast first
      const normalBroadcast = {
        type: 'feature.released',
        priority: 'normal' as const,
        title: 'Normal Priority Broadcast',
        message: 'This should be interrupted by critical broadcast',
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, normalBroadcast);
      await expect(page.locator('[data-broadcast-toast]')).toBeVisible();

      // Wait 2 seconds, then send critical broadcast
      await page.waitForTimeout(2000);

      const criticalBroadcast = {
        type: 'wedding.emergency',
        priority: 'critical' as const,
        title: 'CRITICAL: Emergency Broadcast',
        message: 'This should interrupt and replace the normal broadcast',
      };

      await broadcastHelper.triggerRealtimeBroadcast(page, criticalBroadcast);

      // Critical broadcast should replace normal broadcast
      await expect(
        page.locator('text=CRITICAL: Emergency Broadcast'),
      ).toBeVisible({ timeout: 2000 });
      await expect(
        page.locator('text=Normal Priority Broadcast'),
      ).not.toBeVisible();

      // Should show interruption indicator
      await expect(page.locator('[data-interruption-indicator]')).toBeVisible();
    });

    test('multiple broadcasts queue correctly by priority', async ({
      page,
    }) => {
      const user = WeddingDataFactory.createUser('coordinator');

      await page.goto('/dashboard');
      await broadcastHelper.simulateWebSocketConnection(page, user.id);

      // Send multiple broadcasts rapidly
      const broadcasts = [
        { priority: 'normal' as const, title: 'Normal 1', order: 3 },
        { priority: 'critical' as const, title: 'Critical 1', order: 1 },
        { priority: 'high' as const, title: 'High 1', order: 2 },
        { priority: 'normal' as const, title: 'Normal 2', order: 4 },
      ];

      for (const broadcast of broadcasts) {
        await broadcastHelper.triggerRealtimeBroadcast(page, {
          type: 'test.priority_queue',
          priority: broadcast.priority,
          title: broadcast.title,
          message: `Priority ${broadcast.priority} broadcast`,
        });
        await page.waitForTimeout(100); // Small delay between sends
      }

      // Should show critical first
      await expect(page.locator('text=Critical 1')).toBeVisible({
        timeout: 2000,
      });

      // Wait for critical to be acknowledged/dismissed
      await page.locator('[data-broadcast-toast] button').first().click();

      // Should show high priority next
      await expect(page.locator('text=High 1')).toBeVisible({ timeout: 2000 });
    });
  });

  afterAll(async () => {
    await broadcastHelper.cleanup();
  });
});
