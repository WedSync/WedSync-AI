/**
 * WS-168: Customer Success Dashboard - Browser MCP End-to-End Intervention Workflow Tests
 * Tests customer health interventions, alerts, and admin workflows using real browser automation
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { BrowserTestHarness } from '../fixtures/browser-test-harness';
describe('WS-168: Customer Success Intervention Workflows - Browser Tests', () => {
  let browser: BrowserTestHarness;
  beforeAll(async () => {
    browser = new BrowserTestHarness();
    await browser.setup();
  });
  afterAll(async () => {
    await browser.teardown();
  describe('Admin Dashboard Access and Navigation', () => {
    test('should authenticate admin user and access customer success dashboard', async () => {
      await browser.navigate('/login');
      
      // Take screenshot of login page
      await browser.screenshot('01-login-page.png');
      // Login as admin user
      await browser.fill('#email', 'admin@wedsync.local');
      await browser.fill('#password', 'admin123');
      await browser.click('button[type="submit"]');
      // Wait for dashboard to load
      await browser.waitForSelector('[data-testid="admin-dashboard"]');
      await browser.screenshot('02-admin-dashboard.png');
      // Navigate to customer success section
      await browser.click('[data-testid="nav-customer-success"]');
      await browser.waitForSelector('[data-testid="customer-success-dashboard"]');
      // Verify dashboard components are visible
      expect(await browser.isVisible('[data-testid="health-metrics-cards"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="intervention-actions-panel"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="supplier-health-table"]')).toBe(true);
      await browser.screenshot('03-customer-success-dashboard.png');
    }, 60000);
    test('should display real-time health metrics and intervention alerts', async () => {
      // Verify key metrics are displayed
      const totalSuppliers = await browser.textContent('[data-testid="total-suppliers-count"]');
      const avgHealthScore = await browser.textContent('[data-testid="avg-health-score"]');
      const criticalActions = await browser.textContent('[data-testid="critical-actions-count"]');
      expect(totalSuppliers).toBeTruthy();
      expect(avgHealthScore).toBeTruthy();
      expect(criticalActions).toBeTruthy();
      // Verify metrics are numeric
      expect(parseInt(totalSuppliers || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(avgHealthScore || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(criticalActions || '0')).toBeGreaterThanOrEqual(0);
      await browser.screenshot('04-health-metrics-validation.png');
    });
  describe('Intervention Workflow Testing', () => {
    test('should identify at-risk suppliers and display intervention recommendations', async () => {
      // Look for suppliers with low health scores (red risk level)
      const atRiskSuppliers = await browser.locator('[data-testid="supplier-row"][data-risk-level="red"]');
      const atRiskCount = await atRiskSuppliers.count();
      if (atRiskCount > 0) {
        // Click on first at-risk supplier
        await atRiskSuppliers.first().click();
        await browser.waitForSelector('[data-testid="supplier-details-modal"]');
        
        // Verify intervention recommendations are shown
        expect(await browser.isVisible('[data-testid="intervention-recommendations"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="recommended-actions-list"]')).toBe(true);
        await browser.screenshot('05-at-risk-supplier-details.png');
        // Close modal
        await browser.click('[data-testid="close-supplier-details"]');
      } else {
        console.log('No at-risk suppliers found in test data');
        await browser.screenshot('05-no-at-risk-suppliers.png');
      }
    test('should execute intervention actions and track results', async () => {
      // Navigate to intervention actions panel
      await browser.click('[data-testid="intervention-actions-tab"]');
      await browser.waitForSelector('[data-testid="pending-interventions-list"]');
      // Check for pending interventions
      const pendingInterventions = await browser.locator('[data-testid="intervention-item"]');
      const interventionCount = await pendingInterventions.count();
      if (interventionCount > 0) {
        // Click on first intervention
        await pendingInterventions.first().click();
        await browser.waitForSelector('[data-testid="intervention-action-modal"]');
        // Verify intervention options are available
        expect(await browser.isVisible('[data-testid="send-email-action"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="schedule-call-action"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="assign-success-manager-action"]')).toBe(true);
        await browser.screenshot('06-intervention-actions-modal.png');
        // Test email intervention workflow
        await browser.click('[data-testid="send-email-action"]');
        await browser.waitForSelector('[data-testid="email-template-selector"]');
        // Select email template
        await browser.selectOption('[data-testid="email-template-selector"]', 'engagement_boost');
        // Customize email content
        await browser.fill('[data-testid="email-subject"]', 'WedSync Platform Usage - Let\'s Boost Your Success!');
        await browser.fill('[data-testid="email-content"]', 'Hi there! We\'ve noticed you haven\'t been as active lately. Let\'s schedule a quick call to help you get the most from WedSync.');
        await browser.screenshot('07-email-intervention-setup.png');
        // Send intervention email
        await browser.click('[data-testid="send-intervention-email"]');
        // Verify success notification
        await browser.waitForSelector('[data-testid="intervention-success-notification"]');
        const successMessage = await browser.textContent('[data-testid="intervention-success-notification"]');
        expect(successMessage).toContain('Intervention email sent successfully');
        await browser.screenshot('08-intervention-email-sent.png');
        // Close modals
        await browser.click('[data-testid="close-intervention-modal"]');
        console.log('No pending interventions found');
        await browser.screenshot('06-no-pending-interventions.png');
    test('should track intervention outcomes and update health scores', async () => {
      // Navigate to intervention history
      await browser.click('[data-testid="intervention-history-tab"]');
      await browser.waitForSelector('[data-testid="intervention-history-table"]');
      // Verify intervention tracking columns
      expect(await browser.isVisible('[data-testid="intervention-date-column"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="intervention-type-column"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="intervention-status-column"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="intervention-outcome-column"]')).toBe(true);
      await browser.screenshot('09-intervention-history-tracking.png');
      // Check for completed interventions
      const completedInterventions = await browser.locator('[data-testid="intervention-row"][data-status="completed"]');
      const completedCount = await completedInterventions.count();
      if (completedCount > 0) {
        // Click on completed intervention to view outcome
        await completedInterventions.first().click();
        await browser.waitForSelector('[data-testid="intervention-outcome-details"]');
        // Verify outcome tracking data
        expect(await browser.isVisible('[data-testid="health-score-before"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="health-score-after"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="engagement-change"]')).toBe(true);
        await browser.screenshot('10-intervention-outcome-details.png');
        // Close details modal
        await browser.click('[data-testid="close-outcome-details"]');
  describe('Real-time Alert System Testing', () => {
    test('should display and manage health score alerts', async () => {
      // Navigate to alerts panel
      await browser.click('[data-testid="alerts-tab"]');
      await browser.waitForSelector('[data-testid="health-alerts-panel"]');
      // Check for active alerts
      const activeAlerts = await browser.locator('[data-testid="health-alert"][data-status="active"]');
      const alertCount = await activeAlerts.count();
      await browser.screenshot('11-health-alerts-panel.png');
      if (alertCount > 0) {
        // Test alert management
        await activeAlerts.first().click();
        await browser.waitForSelector('[data-testid="alert-details-modal"]');
        // Verify alert information
        expect(await browser.isVisible('[data-testid="alert-severity"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="alert-description"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="alert-recommendations"]')).toBe(true);
        await browser.screenshot('12-alert-details-modal.png');
        // Test alert actions
        if (await browser.isVisible('[data-testid="acknowledge-alert"]')) {
          await browser.click('[data-testid="acknowledge-alert"]');
          await browser.waitForSelector('[data-testid="alert-acknowledged-confirmation"]');
          
          const confirmMessage = await browser.textContent('[data-testid="alert-acknowledged-confirmation"]');
          expect(confirmMessage).toContain('Alert acknowledged');
          await browser.screenshot('13-alert-acknowledged.png');
        }
        await browser.click('[data-testid="close-alert-details"]');
    test('should test automated intervention triggers', async () => {
      // Navigate to automation settings
      await browser.click('[data-testid="automation-settings-tab"]');
      await browser.waitForSelector('[data-testid="automation-rules-panel"]');
      // Verify automation rules are configured
      expect(await browser.isVisible('[data-testid="health-score-threshold-rules"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="engagement-drop-rules"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="inactivity-rules"]')).toBe(true);
      await browser.screenshot('14-automation-rules-panel.png');
      // Test rule configuration
      const automationRules = await browser.locator('[data-testid="automation-rule"]');
      const ruleCount = await automationRules.count();
      if (ruleCount > 0) {
        // Click on first rule to edit
        await automationRules.first().click();
        await browser.waitForSelector('[data-testid="rule-editor-modal"]');
        // Verify rule editor components
        expect(await browser.isVisible('[data-testid="rule-conditions"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="rule-actions"]')).toBe(true);
        expect(await browser.isVisible('[data-testid="rule-frequency"]')).toBe(true);
        await browser.screenshot('15-automation-rule-editor.png');
        // Close rule editor
        await browser.click('[data-testid="close-rule-editor"]');
  describe('Performance and Responsiveness Testing', () => {
    test('should handle dashboard loading performance', async () => {
      const startTime = Date.now();
      // Refresh dashboard and measure load time
      await browser.reload();
      const loadTime = Date.now() - startTime;
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`Dashboard load time: ${loadTime}ms`);
      // Verify all critical components loaded
      await browser.screenshot('16-performance-dashboard-loaded.png');
    test('should test mobile responsive design', async () => {
      // Test mobile viewport
      await browser.setViewportSize({ width: 375, height: 667 });
      // Verify mobile layout
      expect(await browser.isVisible('[data-testid="mobile-nav-menu"]')).toBe(true);
      await browser.screenshot('17-mobile-dashboard.png');
      // Test tablet viewport
      await browser.setViewportSize({ width: 768, height: 1024 });
      await browser.screenshot('18-tablet-dashboard.png');
      // Restore desktop viewport
      await browser.setViewportSize({ width: 1440, height: 900 });
      await browser.screenshot('19-desktop-dashboard-restored.png');
  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network offline condition
      await browser.setOffline(true);
      // Try to perform an intervention action
      // Should show offline message or graceful degradation
      await browser.waitForSelector('[data-testid="offline-notification"]', { timeout: 5000 });
      expect(await browser.isVisible('[data-testid="offline-notification"]')).toBe(true);
      await browser.screenshot('20-offline-handling.png');
      // Restore network connection
      await browser.setOffline(false);
      // Wait for reconnection
      await browser.waitForSelector('[data-testid="online-notification"]', { timeout: 10000 });
      await browser.screenshot('21-online-restored.png');
    test('should validate form inputs and show appropriate errors', async () => {
      // Navigate to create intervention form
      await browser.click('[data-testid="create-intervention-button"]');
      await browser.waitForSelector('[data-testid="create-intervention-modal"]');
      // Try to submit empty form
      await browser.click('[data-testid="save-intervention"]');
      // Should show validation errors
      expect(await browser.isVisible('[data-testid="supplier-selection-error"]')).toBe(true);
      expect(await browser.isVisible('[data-testid="intervention-type-error"]')).toBe(true);
      await browser.screenshot('22-form-validation-errors.png');
      // Fill out form correctly
      await browser.selectOption('[data-testid="supplier-selector"]', 'supplier-123');
      await browser.selectOption('[data-testid="intervention-type-selector"]', 'engagement_boost');
      await browser.fill('[data-testid="intervention-notes"]', 'Follow up on recent inactivity');
      // Submit form
      // Should succeed
      await browser.waitForSelector('[data-testid="intervention-created-success"]');
      expect(await browser.textContent('[data-testid="intervention-created-success"]')).toContain('Intervention created successfully');
      await browser.screenshot('23-intervention-created-success.png');
      await browser.click('[data-testid="close-create-intervention"]');
});
