/**
 * WS-155: Alert System UI Verification Tests
 * Playwright end-to-end tests for alert system UI components
 * 
 * Verifies that alerts fire correctly in the UI and display properly
 */

import { test, expect, type Page } from '@playwright/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { createClient } from '@supabase/supabase-js';
test.describe('WS-155: Alert System UI Integration', () => {
  let page: Page;
  let supabaseAdmin: ReturnType<typeof createClient>;
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    // Setup admin Supabase client for test data
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });
  test.beforeEach(async () => {
    // Login as admin user
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'admin@wedsync.test');
    await page.fill('[data-testid="password"]', 'test123456');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
  test.describe('Health Check Alert UI', () => {
    test('should display critical health alert in dashboard', async () => {
      // Trigger a critical health alert via API
      const alertResponse = await page.request.post('/api/monitoring/trigger-test-alert', {
        data: {
          type: 'database_critical',
          severity: 'critical',
          title: 'Database Connection Failed',
          description: 'Primary database connection pool exhausted'
        },
        headers: {
          'x-admin-signature': await generateTestHMAC('database_critical_alert')
        }
      });
      expect(alertResponse.ok()).toBeTruthy();
      // Check that alert appears in dashboard
      await page.waitForSelector('[data-testid="critical-alert-banner"]', { timeout: 5000 });
      
      const alertBanner = page.locator('[data-testid="critical-alert-banner"]');
      await expect(alertBanner).toBeVisible();
      await expect(alertBanner).toContainText('Database Connection Failed');
      await expect(alertBanner).toHaveClass(/bg-red-600|bg-error/); // Critical alert styling
    });
    test('should show alert details in modal when clicked', async () => {
      // Trigger alert
      await triggerTestAlert('api_degraded', 'high');
      // Wait for alert notification and click it
      await page.waitForSelector('[data-testid="alert-notification"]');
      await page.click('[data-testid="alert-notification"]');
      // Verify alert modal opens
      const modal = page.locator('[data-testid="alert-detail-modal"]');
      await expect(modal).toBeVisible();
      // Check modal content
      await expect(modal.locator('[data-testid="alert-title"]')).toContainText('API Performance Degraded');
      await expect(modal.locator('[data-testid="alert-severity"]')).toContainText('High');
      await expect(modal.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      await expect(modal.locator('[data-testid="alert-description"]')).toContainText('API response times');
      // Check action buttons
      await expect(modal.locator('[data-testid="acknowledge-alert-btn"]')).toBeVisible();
      await expect(modal.locator('[data-testid="view-metrics-btn"]')).toBeVisible();
    test('should auto-refresh health status every 5 minutes', async () => {
      await page.goto('/dashboard/monitoring');
      // Get initial health check timestamp
      const initialTimestamp = await page.locator('[data-testid="last-health-check"]').textContent();
      // Wait for next auto-refresh (mock faster refresh for testing)
      await page.evaluate(() => {
        // Mock the auto-refresh to trigger after 1 second for testing
        window.__TEST_ACCELERATE_HEALTH_REFRESH__ = true;
      // Wait for timestamp to update
      await page.waitForFunction(
        (initial) => {
          const current = document.querySelector('[data-testid="last-health-check"]')?.textContent;
          return current !== initial;
        initialTimestamp,
        { timeout: 10000 }
      );
      const newTimestamp = await page.locator('[data-testid="last-health-check"]').textContent();
      expect(newTimestamp).not.toBe(initialTimestamp);
  test.describe('Wedding Context Alert UI', () => {
    test('should escalate alert urgency for wedding day events', async () => {
      // Setup wedding happening today
      const today = new Date().toISOString().split('T')[0];
      await setupTestWedding('wedding_ui_test', today);
      // Trigger vendor alert for wedding happening today
      await triggerWeddingAlert('vendor_unavailable', 'medium', 'wedding_ui_test');
      // Alert should be escalated to critical with special wedding day styling
      await page.waitForSelector('[data-testid="wedding-critical-alert"]');
      const weddingAlert = page.locator('[data-testid="wedding-critical-alert"]');
      await expect(weddingAlert).toBeVisible();
      await expect(weddingAlert).toContainText('WEDDING DAY URGENT');
      await expect(weddingAlert).toHaveClass(/border-red-500.*ring-red/); // Emergency styling
      // Should show wedding context
      await expect(weddingAlert.locator('[data-testid="wedding-context"]')).toContainText('Today');
      await expect(weddingAlert.locator('[data-testid="vendor-type"]')).toContainText('Photographer');
    test('should display wedding timeline urgency indicators', async () => {
      // Setup weddings at different timeline stages
      const testWeddings = [
        { id: 'wedding_30d', days: 30, expectedClass: 'low-urgency' },
        { id: 'wedding_7d', days: 7, expectedClass: 'medium-urgency' },
        { id: 'wedding_1d', days: 1, expectedClass: 'high-urgency' },
        { id: 'wedding_0d', days: 0, expectedClass: 'critical-urgency' }
      ];
      for (const wedding of testWeddings) {
        const eventDate = new Date(Date.now() + wedding.days * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        
        await setupTestWedding(wedding.id, eventDate);
        await triggerWeddingAlert('vendor_delay', 'medium', wedding.id);
      }
      await page.goto('/dashboard/weddings/alerts');
      // Verify urgency indicators for each wedding
        const alertCard = page.locator(`[data-testid="alert-${wedding.id}"]`);
        await expect(alertCard).toHaveClass(new RegExp(wedding.expectedClass));
        // Check urgency icon
        const urgencyIcon = alertCard.locator('[data-testid="urgency-indicator"]');
        await expect(urgencyIcon).toBeVisible();
        if (wedding.days === 0) {
          await expect(urgencyIcon).toHaveClass(/text-red.*animate-pulse/);
  test.describe('Multi-Channel Alert Notifications', () => {
    test('should show delivery status for each notification channel', async () => {
      // Trigger alert that uses multiple channels
      await triggerMultiChannelAlert('payment_failed', 'high', ['email', 'slack', 'sms']);
      await page.goto('/dashboard/alerts/delivery-status');
      // Wait for delivery status to load
      await page.waitForSelector('[data-testid="delivery-status-panel"]');
      // Check delivery status for each channel
      const emailStatus = page.locator('[data-testid="email-delivery-status"]');
      const slackStatus = page.locator('[data-testid="slack-delivery-status"]');
      const smsStatus = page.locator('[data-testid="sms-delivery-status"]');
      await expect(emailStatus).toBeVisible();
      await expect(slackStatus).toBeVisible();
      await expect(smsStatus).toBeVisible();
      // Verify status indicators (should be success, pending, or failed)
      await expect(emailStatus.locator('[data-testid="status-icon"]')).toHaveClass(/success|pending|failed/);
      await expect(slackStatus.locator('[data-testid="status-icon"]')).toHaveClass(/success|pending|failed/);
      await expect(smsStatus.locator('[data-testid="status-icon"]')).toHaveClass(/success|pending|failed/);
    test('should show failover when primary channel fails', async () => {
      // Mock Slack failure and trigger alert
      await mockChannelFailure('slack');
      await triggerMultiChannelAlert('system_critical', 'critical', ['slack', 'email']);
      await page.waitForSelector('[data-testid="failover-notification"]');
      // Should show failover message
      const failoverNotice = page.locator('[data-testid="failover-notification"]');
      await expect(failoverNotice).toBeVisible();
      await expect(failoverNotice).toContainText('Primary channel (Slack) failed');
      await expect(failoverNotice).toContainText('Alert delivered via Email');
      // Should show delivery time was still fast (< 100ms)
      const deliveryTime = await failoverNotice.locator('[data-testid="delivery-time"]').textContent();
      const timeMs = parseInt(deliveryTime?.match(/\d+/)?.[0] || '0');
      expect(timeMs).toBeLessThan(100);
  test.describe('Admin Dashboard Integration', () => {
    test('should display comprehensive system health dashboard', async () => {
      await page.goto('/dashboard/admin/system-health');
      // Wait for all health metrics to load
      await Promise.all([
        page.waitForSelector('[data-testid="database-health-panel"]'),
        page.waitForSelector('[data-testid="api-health-panel"]'),
        page.waitForSelector('[data-testid="notification-health-panel"]'),
        page.waitForSelector('[data-testid="webhook-health-panel"]')
      ]);
      // Verify health status displays
      const healthPanels = [
        { testid: 'database-health-panel', title: 'Database' },
        { testid: 'api-health-panel', title: 'API Services' },
        { testid: 'notification-health-panel', title: 'Notifications' },
        { testid: 'webhook-health-panel', title: 'Webhooks' }
      for (const panel of healthPanels) {
        const panelElement = page.locator(`[data-testid="${panel.testid}"]`);
        await expect(panelElement.locator('[data-testid="panel-title"]')).toContainText(panel.title);
        await expect(panelElement.locator('[data-testid="status-indicator"]')).toBeVisible();
        await expect(panelElement.locator('[data-testid="response-time"]')).toBeVisible();
        await expect(panelElement.locator('[data-testid="last-check"]')).toBeVisible();
      // Check overall system status
      const overallStatus = page.locator('[data-testid="overall-system-status"]');
      await expect(overallStatus).toBeVisible();
      await expect(overallStatus).toHaveClass(/healthy|degraded|critical/);
    test('should allow manual health check trigger', async () => {
      // Click manual refresh button
      await page.click('[data-testid="manual-health-check-btn"]');
      // Should show loading state
      await expect(page.locator('[data-testid="health-check-loading"]')).toBeVisible();
      // Wait for refresh to complete
          const loading = document.querySelector('[data-testid="health-check-loading"]');
          const timestamp = document.querySelector('[data-testid="last-health-check"]')?.textContent;
          return !loading && timestamp !== initial;
      // Verify timestamp updated
    test('should display alert metrics and analytics', async () => {
      await page.goto('/dashboard/admin/alert-analytics');
      // Wait for analytics to load
      await page.waitForSelector('[data-testid="alert-metrics-panel"]');
      // Check key metrics are displayed
      const metricsToCheck = [
        'total-alerts-sent',
        'average-delivery-time',
        'delivery-success-rate',
        'alerts-by-severity',
        'alerts-by-channel',
        'wedding-context-alerts'
      for (const metric of metricsToCheck) {
        const metricElement = page.locator(`[data-testid="${metric}"]`);
        await expect(metricElement).toBeVisible();
        await expect(metricElement.locator('[data-testid="metric-value"]')).toContainText(/\d+/);
      // Check performance requirements are met in UI
      const avgDeliveryTime = page.locator('[data-testid="average-delivery-time"] [data-testid="metric-value"]');
      const deliveryTimeText = await avgDeliveryTime.textContent();
      const deliveryMs = parseInt(deliveryTimeText?.match(/\d+/)?.[0] || '999');
      expect(deliveryMs).toBeLessThan(100); // Sub-100ms requirement displayed
  test.describe('Real-time Alert Updates', () => {
    test('should receive real-time alert updates via WebSocket', async () => {
      await page.goto('/dashboard');
      // Listen for WebSocket connections
      let wsConnected = false;
      page.on('websocket', ws => {
        if (ws.url().includes('/realtime')) {
          wsConnected = true;
      // Wait for WebSocket connection
      await page.waitForFunction(() => wsConnected, { timeout: 5000 });
      // Trigger alert from another session/system
      await triggerAlertFromExternalSystem('realtime_test', 'high');
      // Should receive real-time update
      await page.waitForSelector('[data-testid="realtime-alert-toast"]', { timeout: 5000 });
      const alertToast = page.locator('[data-testid="realtime-alert-toast"]');
      await expect(alertToast).toBeVisible();
      await expect(alertToast).toContainText('New Alert Received');
      await expect(alertToast).toHaveClass(/animate-slide-in|animate-fade-in/);
    test('should update alert status in real-time when acknowledged', async () => {
      // Create alert
      const alertId = await createTestAlert('status_update_test', 'medium');
      await page.goto(`/dashboard/alerts/${alertId}`);
      // Verify initial status
      await expect(page.locator('[data-testid="alert-status"]')).toContainText('Active');
      // Acknowledge alert from external system
      await acknowledgeAlertExternally(alertId);
      // Should update in real-time
        () => document.querySelector('[data-testid="alert-status"]')?.textContent?.includes('Acknowledged'),
        { timeout: 5000 }
      await expect(page.locator('[data-testid="alert-status"]')).toContainText('Acknowledged');
      await expect(page.locator('[data-testid="acknowledged-by"]')).toBeVisible();
  // Helper functions
  async function generateTestHMAC(payload: string): Promise<string> {
    const secret = process.env.ADMIN_WEBHOOK_SECRET!;
    const crypto = await import('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
  async function triggerTestAlert(type: string, severity: string): Promise<void> {
    await page.request.post('/api/monitoring/trigger-test-alert', {
      data: { type, severity, title: `${type} Alert`, description: 'Test alert description' },
      headers: { 'x-admin-signature': await generateTestHMAC(`${type}_${severity}`) }
  async function setupTestWedding(weddingId: string, eventDate: string): Promise<void> {
    await supabaseAdmin.from('weddings').upsert({
      id: weddingId,
      event_date: eventDate,
      status: 'active',
      created_at: new Date().toISOString()
  async function triggerWeddingAlert(type: string, severity: string, weddingId: string): Promise<void> {
    await page.request.post('/api/monitoring/wedding-alert', {
      data: { type, severity, weddingId, vendorType: 'photographer' },
      headers: { 'x-admin-signature': await generateTestHMAC(`${type}_${weddingId}`) }
  async function triggerMultiChannelAlert(type: string, severity: string, channels: string[]): Promise<void> {
    await page.request.post('/api/monitoring/multi-channel-alert', {
      data: { type, severity, channels, title: `${type} Multi-Channel Alert` },
      headers: { 'x-admin-signature': await generateTestHMAC(`${type}_multi`) }
  async function mockChannelFailure(channel: string): Promise<void> {
    await page.request.post('/api/monitoring/mock-channel-failure', {
      data: { channel },
      headers: { 'x-admin-signature': await generateTestHMAC(`mock_failure_${channel}`) }
  async function triggerAlertFromExternalSystem(type: string, severity: string): Promise<void> {
    await page.request.post('/api/monitoring/external-alert', {
      data: { type, severity, source: 'external_system' },
      headers: { 'x-admin-signature': await generateTestHMAC(`external_${type}`) }
  async function createTestAlert(type: string, severity: string): Promise<string> {
    const response = await page.request.post('/api/monitoring/create-test-alert', {
      data: { type, severity, title: `${type} Test Alert` },
      headers: { 'x-admin-signature': await generateTestHMAC(`create_${type}`) }
    const data = await response.json();
    return data.alertId;
  async function acknowledgeAlertExternally(alertId: string): Promise<void> {
    await page.request.post(`/api/monitoring/acknowledge-alert/${alertId}`, {
      data: { acknowledgedBy: 'external_system', timestamp: new Date().toISOString() },
      headers: { 'x-admin-signature': await generateTestHMAC(`ack_${alertId}`) }
});
