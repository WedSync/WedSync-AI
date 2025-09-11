import { test, expect } from '@playwright/test';

/**
 * WS-057 Round 2: Reminder Automation & Escalation System Tests
 * Focused testing for the automated reminder system with email/SMS escalation
 */

test.describe('Reminder Automation & Escalation System', () => {
  let testEventId: string;
  let testInvitationId: string;

  test.beforeEach(async ({ page }) => {
    // Login and setup test event
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'vendor@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to test event
    testEventId = process.env.TEST_EVENT_ID || 'test-event-id';
    await page.goto(`/dashboard/events/${testEventId}`);
  });

  test.describe('Reminder Creation & Configuration', () => {
    test('should create reminder with 4-level escalation system', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders`);
      
      // Create new reminder
      await page.click('[data-testid="create-reminder-button"]');
      
      // Fill reminder details
      await page.fill('[data-testid="reminder-title"]', 'Wedding RSVP Reminder - Auto Escalation');
      await page.fill('[data-testid="reminder-message"]', 'Please respond to our wedding invitation by {deadline}');
      await page.fill('[data-testid="days-before-event"]', '14');
      
      // Configure escalation levels
      await page.check('[data-testid="enable-escalation"]');
      
      // Level 1: Email only
      await page.selectOption('[data-testid="escalation-level-1-method"]', 'email');
      await page.fill('[data-testid="escalation-level-1-delay"]', '3');
      
      // Level 2: SMS only
      await page.selectOption('[data-testid="escalation-level-2-method"]', 'sms');
      await page.fill('[data-testid="escalation-level-2-delay"]', '3');
      
      // Level 3: Both email and SMS
      await page.selectOption('[data-testid="escalation-level-3-method"]', 'both');
      await page.fill('[data-testid="escalation-level-3-delay"]', '3');
      
      // Level 4: Personal contact flag
      await page.selectOption('[data-testid="escalation-level-4-method"]', 'personal');
      await page.fill('[data-testid="escalation-level-4-delay"]', '2');
      
      // Save reminder
      await page.click('[data-testid="save-reminder"]');
      
      // Verify creation
      await expect(page.locator('[data-testid="reminder-list"]')).toContainText('Wedding RSVP Reminder');
      await expect(page.locator('[data-testid="escalation-enabled-badge"]')).toBeVisible();
    });

    test('should validate reminder configuration requirements', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders/new`);
      
      // Test required fields validation
      await page.click('[data-testid="save-reminder"]');
      await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required');
      
      // Test escalation validation
      await page.fill('[data-testid="reminder-title"]', 'Test Reminder');
      await page.check('[data-testid="enable-escalation"]');
      await page.fill('[data-testid="escalation-level-1-delay"]', '0');
      await page.click('[data-testid="save-reminder"]');
      await expect(page.locator('[data-testid="escalation-delay-error"]')).toContainText('Delay must be at least 1 day');
    });
  });

  test.describe('Reminder Processing & Escalation Flow', () => {
    test('should process pending reminders with escalation logic', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders`);
      
      // Create test invitation that needs reminding
      await page.click('[data-testid="add-test-invitation"]');
      await page.fill('[data-testid="guest-name"]', 'John Doe');
      await page.fill('[data-testid="guest-email"]', 'john@test.com');
      await page.fill('[data-testid="guest-phone"]', '+1234567890');
      await page.click('[data-testid="save-invitation"]');
      
      // Process reminders manually (simulate cron job)
      await page.click('[data-testid="process-reminders-now"]');
      
      // Wait for processing to complete
      await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 10000 });
      
      // Verify escalation tracking
      await page.click('[data-testid="view-escalation-log"]');
      await expect(page.locator('[data-testid="escalation-entry"]').first()).toBeVisible();
      
      // Verify level 1 (email) was processed
      const firstEscalation = page.locator('[data-testid="escalation-entry"]').first();
      await expect(firstEscalation.locator('[data-testid="escalation-level"]')).toContainText('1');
      await expect(firstEscalation.locator('[data-testid="escalation-method"]')).toContainText('email');
      await expect(firstEscalation.locator('[data-testid="escalation-status"]')).toContainText('sent');
    });

    test('should escalate to next level after specified delay', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders/escalation-log`);
      
      // Simulate time passage for escalation
      await page.click('[data-testid="simulate-time-passage"]');
      await page.selectOption('[data-testid="simulate-days"]', '3');
      await page.click('[data-testid="apply-time-simulation"]');
      
      // Process escalations
      await page.click('[data-testid="process-escalations"]');
      await page.waitForSelector('[data-testid="escalation-processed"]');
      
      // Verify level 2 escalation occurred
      const escalationEntries = await page.locator('[data-testid="escalation-entry"]').all();
      expect(escalationEntries.length).toBeGreaterThanOrEqual(2);
      
      // Check second escalation is SMS
      const secondEscalation = escalationEntries[1];
      await expect(secondEscalation.locator('[data-testid="escalation-level"]')).toContainText('2');
      await expect(secondEscalation.locator('[data-testid="escalation-method"]')).toContainText('sms');
    });

    test('should stop escalation when guest responds', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/responses`);
      
      // Simulate guest response
      await page.click('[data-testid="simulate-response"]');
      await page.selectOption('[data-testid="response-guest"]', 'john@test.com');
      await page.selectOption('[data-testid="response-status"]', 'attending');
      await page.click('[data-testid="submit-response"]');
      
      // Process escalations again
      await page.goto(`/dashboard/events/${testEventId}/reminders`);
      await page.click('[data-testid="process-reminders-now"]');
      
      // Verify escalation was stopped
      await page.click('[data-testid="view-escalation-log"]');
      const stoppedEscalation = page.locator('[data-testid="escalation-stopped"]');
      await expect(stoppedEscalation).toBeVisible();
      await expect(stoppedEscalation).toContainText('Guest responded');
    });
  });

  test.describe('Reminder Analytics & Reporting', () => {
    test('should display comprehensive reminder analytics', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders/analytics`);
      
      // Verify analytics dashboard components
      await expect(page.locator('[data-testid="total-reminders-sent"]')).toBeVisible();
      await expect(page.locator('[data-testid="escalation-effectiveness"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-rate-by-level"]')).toBeVisible();
      await expect(page.locator('[data-testid="delivery-success-rate"]')).toBeVisible();
      
      // Verify escalation level breakdown
      const escalationChart = page.locator('[data-testid="escalation-level-chart"]');
      await expect(escalationChart).toBeVisible();
      
      // Check for each escalation level
      for (let level = 1; level <= 4; level++) {
        await expect(page.locator(`[data-testid="level-${level}-stats"]`)).toBeVisible();
      }
    });

    test('should show real-time reminder delivery status', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders/delivery`);
      
      // Verify delivery status indicators
      await expect(page.locator('[data-testid="delivery-status-dashboard"]')).toBeVisible();
      
      // Check delivery status types
      const statusTypes = ['pending', 'sent', 'delivered', 'failed', 'bounced'];
      for (const status of statusTypes) {
        await expect(page.locator(`[data-testid="status-${status}-count"]`)).toBeVisible();
      }
      
      // Test real-time updates
      const initialPendingCount = await page.textContent('[data-testid="status-pending-count"]');
      
      await page.click('[data-testid="refresh-delivery-status"]');
      await page.waitForTimeout(1000);
      
      // Verify the count updated (may be same if no changes)
      await expect(page.locator('[data-testid="status-pending-count"]')).toBeVisible();
    });

    test('should generate reminder performance reports', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders/reports`);
      
      // Generate performance report
      await page.selectOption('[data-testid="report-period"]', '30');
      await page.click('[data-testid="generate-report"]');
      
      // Wait for report generation
      await page.waitForSelector('[data-testid="report-ready"]');
      
      // Verify report components
      await expect(page.locator('[data-testid="escalation-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="effectiveness-metrics"]')).toBeVisible();
      
      // Test report export
      await page.click('[data-testid="export-report"]');
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('reminder-report');
    });
  });

  test.describe('Integration Testing', () => {
    test('should integrate with SMS service for escalations', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/settings/integrations`);
      
      // Verify SMS service configuration
      await expect(page.locator('[data-testid="sms-service-status"]')).toContainText('Connected');
      
      // Test SMS sending capability
      await page.click('[data-testid="test-sms-sending"]');
      await page.fill('[data-testid="test-phone"]', '+1234567890');
      await page.click('[data-testid="send-test-sms"]');
      
      await page.waitForSelector('[data-testid="sms-test-result"]');
      await expect(page.locator('[data-testid="sms-test-result"]')).toContainText('SMS sent successfully');
    });

    test('should integrate with email service for escalations', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/settings/integrations`);
      
      // Verify email service configuration
      await expect(page.locator('[data-testid="email-service-status"]')).toContainText('Connected');
      
      // Test email sending capability
      await page.click('[data-testid="test-email-sending"]');
      await page.fill('[data-testid="test-email"]', 'test@example.com');
      await page.click('[data-testid="send-test-email"]');
      
      await page.waitForSelector('[data-testid="email-test-result"]');
      await expect(page.locator('[data-testid="email-test-result"]')).toContainText('Email sent successfully');
    });

    test('should handle service failures gracefully', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders`);
      
      // Simulate service failure
      await page.click('[data-testid="simulate-service-failure"]');
      await page.selectOption('[data-testid="failure-type"]', 'sms');
      await page.click('[data-testid="apply-failure"]');
      
      // Process reminders with failure
      await page.click('[data-testid="process-reminders-now"]');
      
      // Verify failure handling
      await page.waitForSelector('[data-testid="failure-notification"]');
      await expect(page.locator('[data-testid="failure-notification"]')).toContainText('SMS service unavailable');
      
      // Verify fallback to email only
      await page.click('[data-testid="view-escalation-log"]');
      const failedEscalation = page.locator('[data-testid="escalation-failed"]').first();
      await expect(failedEscalation).toContainText('SMS failed, sent email instead');
    });
  });

  test.describe('Performance & Load Testing', () => {
    test('should handle bulk reminder processing efficiently', async ({ page }) => {
      await page.goto(`/dashboard/events/${testEventId}/reminders/bulk`);
      
      // Create bulk test invitations
      await page.click('[data-testid="create-bulk-invitations"]');
      await page.fill('[data-testid="bulk-count"]', '100');
      await page.click('[data-testid="generate-bulk"]');
      
      await page.waitForSelector('[data-testid="bulk-creation-complete"]');
      
      // Process bulk reminders
      const startTime = Date.now();
      await page.click('[data-testid="process-bulk-reminders"]');
      await page.waitForSelector('[data-testid="bulk-processing-complete"]');
      const processingTime = Date.now() - startTime;
      
      // Verify reasonable processing time (adjust threshold as needed)
      expect(processingTime).toBeLessThan(30000); // 30 seconds for 100 reminders
      
      // Verify success rate
      const successRate = await page.textContent('[data-testid="bulk-success-rate"]');
      const rate = parseInt(successRate?.replace('%', '') || '0');
      expect(rate).toBeGreaterThanOrEqual(95); // 95% success rate minimum
    });
  });
});