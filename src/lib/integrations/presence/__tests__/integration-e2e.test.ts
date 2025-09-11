import { test, expect } from '@playwright/test';

/**
 * End-to-End Integration Tests for WS-204 Presence Tracking System
 * Tests the complete presence integration workflow with real browser automation
 */

test.describe('WS-204 Presence Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/settings/integrations');

    // Mock authentication for testing
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'test-user',
        JSON.stringify({
          id: 'test-user-123',
          email: 'photographer@wedsync.com',
          role: 'photographer',
        }),
      );
    });
  });

  test.describe('Calendar Integration Workflow', () => {
    test('should connect Google Calendar and trigger presence updates', async ({
      page,
    }) => {
      // Navigate to integrations page
      await page.goto('/settings/integrations');

      // Check if integration setup section exists
      await expect(
        page.locator('[data-testid="integration-setup"]'),
      ).toBeVisible();

      // Click Google Calendar integration button
      const calendarButton = page.locator(
        '[data-testid="connect-google-calendar"]',
      );
      await expect(calendarButton).toBeVisible();
      await calendarButton.click();

      // Mock OAuth flow for testing
      await page.route('**/auth/callback/google', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            integration: 'google_calendar',
            status: 'connected',
          }),
        });
      });

      // Verify connection success
      await expect(
        page.locator('[data-testid="calendar-integration-status"]'),
      ).toContainText('Connected');

      // Navigate to dashboard to verify presence updates
      await page.goto('/dashboard');

      // Verify presence status indicator exists
      await expect(
        page.locator('[data-testid="my-presence-status"]'),
      ).toBeVisible();
    });

    test('should process calendar webhook and update presence automatically', async ({
      page,
    }) => {
      // Setup: Mock calendar integration as already connected
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'calendar-integration',
          JSON.stringify({
            provider: 'google',
            status: 'connected',
            lastSync: new Date().toISOString(),
          }),
        );
      });

      // Navigate to dashboard
      await page.goto('/dashboard');

      // Initial presence should be online
      const presenceStatus = page.locator('[data-testid="my-presence-status"]');
      await expect(presenceStatus).toBeVisible();

      // Mock calendar webhook for wedding meeting
      await page.evaluate(() => {
        // Simulate webhook processing via service worker or API call
        fetch('/api/webhooks/calendar-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify({
            eventType: 'meeting_started',
            eventId: 'test-wedding-event-123',
            summary: 'Sarah & Mike - Final Timeline Review',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            location: 'Wedding Venue',
            signature: 'test-signature',
          }),
        });
      });

      // Wait for presence to update
      await page.waitForTimeout(2000);

      // Verify presence updated to busy with custom message
      await expect(presenceStatus).toContainText('busy');
      await expect(presenceStatus).toContainText('Final Timeline Review');
    });
  });

  test.describe('Slack Integration Workflow', () => {
    test('should connect Slack and synchronize status bidirectionally', async ({
      page,
    }) => {
      await page.goto('/settings/integrations');

      // Connect Slack integration
      const slackButton = page.locator('[data-testid="connect-slack"]');
      await expect(slackButton).toBeVisible();
      await slackButton.click();

      // Mock Slack OAuth flow
      await page.route('**/auth/callback/slack', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            integration: 'slack',
            status: 'connected',
          }),
        });
      });

      // Verify Slack connection
      await expect(
        page.locator('[data-testid="slack-integration-status"]'),
      ).toContainText('Connected');

      // Navigate to dashboard
      await page.goto('/dashboard');

      // Update presence status manually
      await page.click('[data-testid="set-custom-status"]');
      await page.fill(
        '[data-testid="status-message"]',
        'At venue - ceremony setup',
      );
      await page.selectOption('[data-testid="status-emoji"]', '🏰');
      await page.click('[data-testid="update-status"]');

      // Verify status updated locally
      const presenceStatus = page.locator('[data-testid="my-presence-status"]');
      await expect(presenceStatus).toContainText('At venue - ceremony setup');
      await expect(presenceStatus).toContainText('🏰');

      // Mock Slack API call verification
      await page.waitForFunction(() => {
        return window.performance
          .getEntriesByType('resource')
          .some(
            (entry) =>
              entry.name.includes('slack') && entry.name.includes('profile'),
          );
      });
    });

    test('should receive Slack status updates and update WedSync presence', async ({
      page,
    }) => {
      // Setup: Mock Slack integration as connected
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'slack-integration',
          JSON.stringify({
            status: 'connected',
            teamId: 'test-team-123',
          }),
        );
      });

      await page.goto('/dashboard');

      // Mock incoming Slack webhook
      await page.evaluate(() => {
        fetch('/api/webhooks/slack-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Slack-Signature': 'test-signature',
            'X-Slack-Request-Timestamp': Math.floor(
              Date.now() / 1000,
            ).toString(),
          },
          body: JSON.stringify({
            token: 'test-token',
            team_id: 'test-team-123',
            type: 'event_callback',
            event: {
              type: 'presence_change',
              user: 'test-slack-user',
              presence: 'away',
            },
          }),
        });
      });

      // Wait for presence update
      await page.waitForTimeout(2000);

      // Verify presence reflected Slack status change
      const presenceStatus = page.locator('[data-testid="my-presence-status"]');
      await expect(presenceStatus).toContainText('away');
    });
  });

  test.describe('Video Conference Integration', () => {
    test('should update presence during Zoom meetings', async ({ page }) => {
      await page.goto('/dashboard');

      // Initial presence should be online
      const presenceStatus = page.locator('[data-testid="my-presence-status"]');
      await expect(presenceStatus).toContainText('online');

      // Mock Zoom meeting started webhook
      await page.evaluate(() => {
        fetch('/api/webhooks/zoom-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'meeting.started',
            payload: {
              object: {
                uuid: 'zoom-meeting-123',
                id: 12345,
                host_id: 'test-zoom-host',
                topic: 'Wedding Planning - Sarah & Mike',
                start_time: new Date().toISOString(),
                duration: 60,
                participants: [
                  {
                    user_id: 'test-zoom-user',
                    user_name: 'Test Photographer',
                    join_time: new Date().toISOString(),
                  },
                ],
              },
            },
          }),
        });
      });

      // Wait for presence update
      await page.waitForTimeout(2000);

      // Verify presence updated to busy with meeting context
      await expect(presenceStatus).toContainText('busy');
      await expect(presenceStatus).toContainText('📹');
      await expect(presenceStatus).toContainText('wedding planning call');
    });

    test('should revert presence when meeting ends', async ({ page }) => {
      // Setup: Start with meeting in progress
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'current-meeting',
          JSON.stringify({
            platform: 'zoom',
            meetingId: 'zoom-meeting-456',
            status: 'in_progress',
            isWeddingRelated: true,
          }),
        );
      });

      await page.goto('/dashboard');

      // Verify initial busy status
      const presenceStatus = page.locator('[data-testid="my-presence-status"]');
      await expect(presenceStatus).toContainText('busy');

      // Mock meeting ended webhook
      await page.evaluate(() => {
        fetch('/api/webhooks/zoom-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'meeting.ended',
            payload: {
              object: {
                uuid: 'zoom-meeting-456',
                id: 67890,
                host_id: 'test-zoom-host',
                topic: 'Wedding Planning - Sarah & Mike',
                start_time: new Date(Date.now() - 3600000).toISOString(), // Started 1 hour ago
                duration: 60,
              },
            },
          }),
        });
      });

      // Wait for presence update
      await page.waitForTimeout(2000);

      // Verify presence reverted to online
      await expect(presenceStatus).toContainText('online');
      await expect(presenceStatus).not.toContainText('📹');
    });
  });

  test.describe('Presence-Aware Notifications', () => {
    test('should filter notifications based on recipient presence', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // Setup multiple users with different presence states
      await page.addInitScript(() => {
        window.mockUsers = {
          'online-user': {
            status: 'online',
            lastActivity: new Date().toISOString(),
          },
          'busy-user': {
            status: 'busy',
            customStatus: 'In client meeting',
            lastActivity: new Date().toISOString(),
          },
          'away-user': {
            status: 'away',
            lastActivity: new Date(Date.now() - 600000).toISOString(),
          },
        };
      });

      // Send a medium urgency notification
      await page.click('[data-testid="send-notification"]');
      await page.fill('[data-testid="notification-title"]', 'Timeline Update');
      await page.fill(
        '[data-testid="notification-message"]',
        'Wedding timeline has been updated',
      );
      await page.selectOption('[data-testid="notification-urgency"]', 'medium');
      await page.check('[data-testid="defer-if-busy"]');

      // Select all test recipients
      await page.check('[data-testid="recipient-online-user"]');
      await page.check('[data-testid="recipient-busy-user"]');
      await page.check('[data-testid="recipient-away-user"]');

      await page.click('[data-testid="send-notification-button"]');

      // Verify notification was sent immediately to online user only
      await expect(
        page.locator('[data-testid="immediate-recipients"]'),
      ).toContainText('online-user');
      await expect(
        page.locator('[data-testid="immediate-recipients"]'),
      ).not.toContainText('busy-user');

      // Verify deferred notifications were scheduled
      await expect(
        page.locator('[data-testid="deferred-recipients"]'),
      ).toContainText('busy-user');
      await expect(
        page.locator('[data-testid="deferred-recipients"]'),
      ).toContainText('away-user');
    });

    test('should override presence rules for urgent wedding coordination', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // Set wedding day context
      await page.addInitScript(() => {
        window.weddingContext = {
          weddingId: 'wedding-789',
          isWeddingDay: true,
          priorityLevel: 'critical',
          role: 'photographer',
          venueLocation: 'Grand Ballroom',
        };

        window.mockUsers = {
          'busy-photographer': {
            status: 'busy',
            customStatus: 'do not disturb - ceremony prep',
            lastActivity: new Date().toISOString(),
          },
        };
      });

      // Send urgent wedding coordination notification
      await page.click('[data-testid="send-notification"]');
      await page.fill(
        '[data-testid="notification-title"]',
        'URGENT: Ceremony Delay',
      );
      await page.fill(
        '[data-testid="notification-message"]',
        'Ceremony delayed 15 minutes - adjust schedule',
      );
      await page.selectOption('[data-testid="notification-urgency"]', 'urgent');

      await page.check('[data-testid="recipient-busy-photographer"]');
      await page.click('[data-testid="send-notification-button"]');

      // Verify urgent notification bypassed all presence rules
      await expect(
        page.locator('[data-testid="immediate-recipients"]'),
      ).toContainText('busy-photographer');
      await expect(
        page.locator('[data-testid="deferred-recipients"]'),
      ).not.toContainText('busy-photographer');

      // Verify wedding context was preserved
      await expect(
        page.locator('[data-testid="notification-context"]'),
      ).toContainText('Wedding Day Emergency');
    });
  });

  test.describe('Integration Health Monitoring', () => {
    test('should display integration health dashboard', async ({ page }) => {
      await page.goto('/settings/integrations/health');

      // Verify health dashboard elements
      await expect(
        page.locator('[data-testid="integration-health-dashboard"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="total-integrations"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="healthy-integrations"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="failed-integrations"]'),
      ).toBeVisible();

      // Check individual integration status
      await expect(
        page.locator('[data-testid="calendar-health-status"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="slack-health-status"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="video-conference-health-status"]'),
      ).toBeVisible();
    });

    test('should handle integration failure recovery', async ({ page }) => {
      await page.goto('/settings/integrations/health');

      // Mock a failed integration
      await page.evaluate(() => {
        // Simulate integration failure
        fetch('/api/integrations/health/simulate-failure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integration: 'calendar',
            error: 'Token expired',
          }),
        });
      });

      // Wait for health check update
      await page.waitForTimeout(3000);

      // Verify failure is displayed
      await expect(
        page.locator('[data-testid="calendar-health-status"]'),
      ).toContainText('failed');
      await expect(
        page.locator('[data-testid="integration-error-message"]'),
      ).toContainText('Token expired');

      // Click recovery button
      await page.click('[data-testid="attempt-recovery-calendar"]');

      // Verify recovery attempt notification
      await expect(
        page.locator('[data-testid="recovery-status"]'),
      ).toContainText('Attempting recovery');

      // Wait for recovery completion
      await page.waitForTimeout(5000);

      // Verify integration recovered
      await expect(
        page.locator('[data-testid="calendar-health-status"]'),
      ).toContainText('healthy');
    });
  });

  test.describe('Wedding Context Intelligence', () => {
    test('should classify wedding events and generate appropriate presence', async ({
      page,
    }) => {
      // Mock calendar event data
      await page.addInitScript(() => {
        window.mockCalendarEvent = {
          id: 'wedding-ceremony-event',
          summary: 'Sarah & Mike Wedding Ceremony - Photography',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours
          location: 'Sunrise Manor Gardens',
          attendees: ['photographer@wedsync.com', 'bride@example.com'],
        };
      });

      await page.goto('/dashboard');

      // Trigger calendar event processing
      await page.evaluate(() => {
        fetch('/api/webhooks/calendar-presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify({
            eventType: 'meeting_started',
            ...window.mockCalendarEvent,
            signature: 'test-signature',
          }),
        });
      });

      await page.waitForTimeout(2000);

      // Verify wedding-specific presence status
      const presenceStatus = page.locator('[data-testid="my-presence-status"]');
      await expect(presenceStatus).toContainText('📸 Ceremony prep');
      await expect(presenceStatus).toContainText('Sunrise Manor Gardens');
      await expect(presenceStatus).toContainText('busy');

      // Verify presence context shows wedding details
      await page.hover('[data-testid="my-presence-status"]');
      await expect(
        page.locator('[data-testid="presence-tooltip"]'),
      ).toContainText('Wedding ceremony in progress');
      await expect(
        page.locator('[data-testid="presence-tooltip"]'),
      ).toContainText('Available for urgent coordination only');
    });
  });
});
