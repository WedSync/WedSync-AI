/**
 * WS-140 Trial Management System - Trial Widget Interactions E2E Tests
 * Comprehensive Playwright tests for TrialStatusWidget, TrialProgressBar, TrialBanner, and TrialChecklist components
 */

import { test, expect } from '@playwright/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
test.describe('WS-140: Trial Management Widget Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful trial API response
    await page.route('/api/trial/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          trial: {
            id: 'trial-123',
            user_id: 'user-123',
            business_type: 'wedding_planner',
            business_goals: ['save_time', 'grow_business'],
            current_workflow_pain_points: ['manual_tasks', 'communication'],
            expected_time_savings_hours: 10,
            hourly_rate: 75,
            trial_start: '2025-01-01T00:00:00Z',
            trial_end: '2025-01-31T00:00:00Z',
            status: 'active',
            onboarding_completed: true,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          },
          progress: {
            trial_id: 'trial-123',
            days_remaining: 15,
            days_elapsed: 15,
            progress_percentage: 50,
            milestones_achieved: [
              {
                id: 'milestone-1',
                trial_id: 'trial-123',
                milestone_type: 'first_client_connected',
                milestone_name: 'First Client Connected',
                description: 'Successfully add and configure your first client profile',
                achieved: true,
                achieved_at: '2025-01-10T00:00:00Z',
                time_to_achieve_hours: 2,
                value_impact_score: 8,
                created_at: '2025-01-01T00:00:00Z'
              }
            ],
            milestones_remaining: [
                id: 'milestone-2',
                milestone_type: 'initial_journey_created',
                milestone_name: 'Initial Journey Created',
                description: 'Create your first automated client journey',
                achieved: false,
                value_impact_score: 9,
            feature_usage_summary: [],
            roi_metrics: {
              trial_id: 'trial-123',
              total_time_saved_hours: 3.5,
              estimated_cost_savings: 262.5,
              productivity_improvement_percent: 25,
              features_adopted_count: 4,
              milestones_achieved_count: 1,
              workflow_efficiency_gain: 30,
              projected_monthly_savings: 500,
              roi_percentage: 125,
              calculated_at: '2025-01-15T00:00:00Z'
            },
            conversion_recommendation: 'Strong candidate for conversion',
            urgency_score: 3
          recommendations: {
            next_actions: ['Create your first journey', 'Add a vendor partner'],
            upgrade_benefits: ['Unlimited clients', 'Advanced automation'],
            urgency_message: '15 days remaining to continue your progress'
          }
        })
      });
    });
    // Mock feature usage and milestones endpoints for hooks
    await page.route('/api/trial/feature-usage', route => {
        body: JSON.stringify([
          {
            id: 'usage-1',
            feature_key: 'client_onboarding',
            feature_name: 'Client Onboarding',
            usage_count: 5,
            time_saved_minutes: 150,
            last_used_at: '2025-01-15T00:00:00Z',
            created_at: '2025-01-10T00:00:00Z'
        ])
    await page.route('/api/trial/milestones', route => {
            id: 'milestone-1',
            milestone_type: 'first_client_connected',
            milestone_name: 'First Client Connected',
            description: 'Successfully add your first client',
            achieved: true,
            achieved_at: '2025-01-10T00:00:00Z',
            time_to_achieve_hours: 2,
            value_impact_score: 8,
            created_at: '2025-01-01T00:00:00Z'
    // Set up test page with trial widgets
    await page.goto('/trial/dashboard');
    await page.waitForLoadState('networkidle');
  });
  test.describe('TrialStatusWidget Component', () => {
    test('displays trial status information correctly', async ({ page }) => {
      // Wait for widget to load
      await page.waitForSelector('[data-testid=trial-status-widget]', { timeout: 10000 });
      
      // Verify basic trial information
      await expect(page.locator('text="Professional Trial"')).toBeVisible();
      await expect(page.locator('text="Day 15 of 30"')).toBeVisible();
      await expect(page.locator('text="15 days remaining"')).toBeVisible();
      // Verify progress bar
      await expect(page.locator('[data-testid=trial-progress-bar]')).toBeVisible();
      await expect(page.locator('text="50%"')).toBeVisible();
      // Verify ROI metrics
      await expect(page.locator('text="125%"')).toBeVisible(); // ROI percentage
      await expect(page.locator('text="4h"')).toBeVisible(); // Time saved (rounded from 3.5)
      // Verify milestone completion
      await expect(page.locator('text="1/2"')).toBeVisible(); // Milestones ratio
      await page.screenshot({
        path: `screenshots/trial-status-widget-${Date.now()}.png`,
        fullPage: true
    test('renders compact mode correctly', async ({ page }) => {
      // Navigate to page with compact widget
      await page.goto('/trial/dashboard?compact=true');
      await page.waitForSelector('[data-testid=trial-status-widget-compact]', { timeout: 10000 });
      // Verify compact layout
      await expect(page.locator('text="15d left"')).toBeVisible();
      await expect(page.locator('text="50% complete"')).toBeVisible();
      await expect(page.locator('text="125% ROI"')).toBeVisible();
      // Verify upgrade button
      const upgradeButton = page.locator('[data-testid=compact-upgrade-button]');
      await expect(upgradeButton).toBeVisible();
      await expect(upgradeButton).toContainText('Upgrade');
    test('handles urgent trial state correctly', async ({ page }) => {
      // Mock urgent trial data
      await page.route('/api/trial/status', route => {
        const originalData = JSON.parse(route.request().postData() || '{}');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...originalData,
            progress: {
              ...originalData.progress,
              days_remaining: 3,
              urgency_score: 5
            }
          })
        });
      await page.reload();
      await page.waitForSelector('[data-testid=trial-status-widget]');
      // Verify urgency alert
      await expect(page.locator('text="Trial ending soon! Upgrade to continue your progress."')).toBeVisible();
      await expect(page.locator('text="3 days remaining"')).toBeVisible();
    test('upgrade button functionality', async ({ page }) => {
      // Mock upgrade endpoint
      await page.route('/api/billing/upgrade', route => {
          body: JSON.stringify({ success: true, redirect_url: '/billing/success' })
      const upgradeButton = page.locator('[data-testid=upgrade-button]');
      await upgradeButton.click();
      // Should navigate to upgrade flow or show modal
      await page.waitForTimeout(1000); // Allow for navigation or modal
      // Verify upgrade action was triggered
      const currentUrl = page.url();
      expect(currentUrl).toContain('upgrade');
  test.describe('TrialProgressBar Component', () => {
    test('displays milestone progress correctly', async ({ page }) => {
      await page.waitForSelector('[data-testid=trial-progress-bar]', { timeout: 10000 });
      // Verify progress header
      await expect(page.locator('text="Trial Progress"')).toBeVisible();
      await expect(page.locator('text="1 of 2 milestones completed"')).toBeVisible();
      await expect(page.locator('text="15 days left"')).toBeVisible();
      // Verify milestone markers
      const milestoneMarkers = page.locator('[data-testid^=milestone-marker]');
      await expect(milestoneMarkers).toHaveCount(2);
      // Test achieved milestone marker
      const achievedMarker = page.locator('[data-testid=milestone-marker-first-client-connected]');
      await expect(achievedMarker).toBeVisible();
      await expect(achievedMarker).toHaveClass(/achieved/);
    test('milestone hover tooltips work correctly', async ({ page }) => {
      await page.waitForSelector('[data-testid=trial-progress-bar]');
      // Test achieved milestone tooltip
      await achievedMarker.hover();
      await page.waitForSelector('[data-testid=milestone-tooltip]', { timeout: 2000 });
      await expect(page.locator('text="First Client Connected"')).toBeVisible();
      await expect(page.locator('text="Successfully add and configure your first client profile"')).toBeVisible();
      await expect(page.locator('text="Completed 1/10/2025"')).toBeVisible();
      // Test unachieved milestone tooltip
      const unachievedMarker = page.locator('[data-testid=milestone-marker-initial-journey-created]');
      await unachievedMarker.hover();
      await expect(page.locator('text="Initial Journey Created"')).toBeVisible();
      await expect(page.locator('text="Click for instructions"')).toBeVisible();
    test('next milestone CTA works correctly', async ({ page }) => {
      // Verify next milestone section
      await expect(page.locator('text="Next Milestone: Initial Journey Created"')).toBeVisible();
      await expect(page.locator('text="Create your first automated client journey"')).toBeVisible();
      await expect(page.locator('text="Est. 5h saved"')).toBeVisible(); // From MILESTONE_DEFINITIONS
      // Test CTA button
      const ctaButton = page.locator('[data-testid=next-milestone-cta]');
      await expect(ctaButton).toBeVisible();
      await ctaButton.click();
      // Should show instructions panel
      await page.waitForSelector('[data-testid=milestone-instructions-panel]', { timeout: 2000 });
      await expect(page.locator('text="How to complete:"')).toBeVisible();
    test('milestone instructions panel functionality', async ({ page }) => {
      // Click on unachieved milestone
      await unachievedMarker.click();
      // Verify instructions panel opens
      await page.waitForSelector('[data-testid=milestone-instructions-panel]');
      await expect(page.locator('text="Navigate to Journey Builder"')).toBeVisible();
      await expect(page.locator('text="Choose a template or start from scratch"')).toBeVisible();
      // Test get started button
      const getStartedButton = page.locator('[data-testid=get-started-button]');
      await expect(getStartedButton).toBeVisible();
      // Test close button
      const closeButton = page.locator('[data-testid=close-instructions]');
      await closeButton.click();
      await expect(page.locator('[data-testid=milestone-instructions-panel]')).not.toBeVisible();
    test('milestone list functionality', async ({ page }) => {
      // Verify milestone list
      await expect(page.locator('text="All Milestones"')).toBeVisible();
      // Check achieved milestone item
      const achievedItem = page.locator('[data-testid=milestone-item-first-client-connected]');
      await expect(achievedItem).toBeVisible();
      await expect(achievedItem.locator('text="Completed"')).toBeVisible();
      // Check unachieved milestone item
      const unachievedItem = page.locator('[data-testid=milestone-item-initial-journey-created]');
      await expect(unachievedItem).toBeVisible();
      const startButton = unachievedItem.locator('[data-testid=start-button]');
      await expect(startButton).toBeVisible();
      await startButton.click();
      // Should open instructions panel
  test.describe('TrialBanner Component', () => {
    test('renders standard banner correctly', async ({ page }) => {
      // Navigate to page with banner
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid=trial-banner]', { timeout: 10000 });
      // Verify banner content
      await expect(page.locator('text="You\'re doing great! 50% through your trial with amazing results."')).toBeVisible();
      await expect(page.locator('[data-testid=banner-upgrade-button]')).toBeVisible();
      // Verify countdown timer
      await expect(page.locator('[data-testid=mini-countdown]')).toBeVisible();
      // Test banner positioning
      const banner = page.locator('[data-testid=trial-banner]');
      const bannerBox = await banner.boundingBox();
      expect(bannerBox?.y).toBe(0); // Should be at top
    test('urgent variant displays correctly', async ({ page }) => {
            success: true,
            trial: {
              // ... trial data
              status: 'active'
              // ... progress data
              days_remaining: 2,
      await page.waitForSelector('[data-testid=trial-banner-urgent]');
      // Verify urgent styling and content
      await expect(page.locator('text="Trial Ending Soon!"')).toBeVisible();
      await expect(page.locator('text="Don\'t lose your progress. Upgrade now to continue with all your data and settings."')).toBeVisible();
      // Verify full countdown timer
      await expect(page.locator('[data-testid=urgent-countdown]')).toBeVisible();
      await expect(page.locator('text="days"')).toBeVisible();
      await expect(page.locator('text="hours"')).toBeVisible();
      await expect(page.locator('text="min"')).toBeVisible();
      await expect(page.locator('text="sec"')).toBeVisible();
      // Verify animated upgrade button
      const upgradeButton = page.locator('[data-testid=urgent-upgrade-button]');
      await expect(upgradeButton).toHaveClass(/animate-pulse/);
    test('banner dismissal functionality', async ({ page }) => {
      await page.waitForSelector('[data-testid=trial-banner]');
      // Test dismiss button
      const dismissButton = page.locator('[data-testid=banner-dismiss]');
      await expect(dismissButton).toBeVisible();
      await dismissButton.click();
      // Banner should disappear
      await expect(page.locator('[data-testid=trial-banner]')).not.toBeVisible();
      // Verify localStorage is set
      const dismissedState = await page.evaluate(() => {
        return localStorage.getItem('trialBannerDismissed');
      expect(dismissedState).toBe('true');
      // Reload page and verify banner stays hidden
      await page.waitForLoadState('networkidle');
    test('banner upgrade button click tracking', async ({ page }) => {
      let upgradeClicked = false;
        upgradeClicked = true;
          body: JSON.stringify({ success: true })
      const upgradeButton = page.locator('[data-testid=banner-upgrade-button]');
      expect(upgradeClicked).toBeTruthy();
    test('countdown timer updates in real-time', async ({ page }) => {
      // Set trial end to be 1 hour from now for visible countdown
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
              // ... other trial data
              trial_end: oneHourFromNow.toISOString(),
              // ... other progress data
              days_remaining: 1,
      // Get initial countdown values
      const initialMinutes = await page.locator('[data-testid=countdown-minutes]').textContent();
      const initialSeconds = await page.locator('[data-testid=countdown-seconds]').textContent();
      // Wait 2 seconds
      await page.waitForTimeout(2000);
      // Verify countdown has updated
      const newSeconds = await page.locator('[data-testid=countdown-seconds]').textContent();
      expect(newSeconds).not.toBe(initialSeconds);
  test.describe('TrialChecklist Component', () => {
    test('displays onboarding checklist correctly', async ({ page }) => {
      await page.goto('/trial/onboarding');
      await page.waitForSelector('[data-testid=trial-checklist]', { timeout: 10000 });
      // Verify checklist header
      await expect(page.locator('text="Get Started with Your Trial"')).toBeVisible();
      await expect(page.locator('text="Complete these tasks to maximize your trial experience"')).toBeVisible();
      // Verify progress indicator
      await expect(page.locator('[data-testid=checklist-progress]')).toBeVisible();
      // Verify checklist items
      const checklistItems = page.locator('[data-testid^=checklist-item]');
      await expect(checklistItems).toHaveCount(6); // Should have 6 predefined tasks
      // Test specific checklist items
      await expect(page.locator('text="Complete Your Business Profile"')).toBeVisible();
      await expect(page.locator('text="Add Your First Client"')).toBeVisible();
      await expect(page.locator('text="Import Guest List"')).toBeVisible();
    test('checklist item expansion and interaction', async ({ page }) => {
      await page.waitForSelector('[data-testid=trial-checklist]');
      // Test expanding first checklist item
      const firstItem = page.locator('[data-testid=checklist-item-business-profile]');
      await firstItem.click();
      // Should expand to show details
      await page.waitForSelector('[data-testid=checklist-item-expanded]');
      await expect(page.locator('text="Set up your business information"')).toBeVisible();
      // Test "Start" button
      const startButton = page.locator('[data-testid=checklist-start-button]');
      // Should navigate to business profile setup
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('profile');
    test('checklist completion tracking', async ({ page }) => {
      // Mock completion endpoint
      await page.route('/api/trial/complete-task', route => {
      // Mark first item as completed
      const firstItemCheckbox = page.locator('[data-testid=checklist-checkbox-business-profile]');
      await firstItemCheckbox.check();
      // Verify completion state
      await expect(firstItemCheckbox).toBeChecked();
      // Verify progress updates
      const progressText = page.locator('[data-testid=checklist-progress-text]');
      await expect(progressText).toContainText('1 of 6 completed');
    test('category filtering functionality', async ({ page }) => {
      // Test category filters
      const setupFilter = page.locator('[data-testid=category-filter-setup]');
      const clientsFilter = page.locator('[data-testid=category-filter-clients]');
      // Click setup filter
      await setupFilter.click();
      // Should show only setup-related items
      const visibleItems = page.locator('[data-testid^=checklist-item]:visible');
      const itemCount = await visibleItems.count();
      expect(itemCount).toBeLessThan(6); // Should filter out some items
      // Click clients filter
      await clientsFilter.click();
      // Should show different items
    test('progress visualization updates correctly', async ({ page }) => {
      // Initial progress should be 0%
      const progressBar = page.locator('[data-testid=checklist-progress-bar]');
      let progressValue = await progressBar.getAttribute('aria-valuenow');
      expect(progressValue).toBe('0');
      // Complete one task
      const firstCheckbox = page.locator('[data-testid=checklist-checkbox-business-profile]');
      await firstCheckbox.check();
      // Progress should update to ~17% (1 of 6)
      await page.waitForTimeout(500); // Allow for state update
      progressValue = await progressBar.getAttribute('aria-valuenow');
      expect(parseInt(progressValue || '0')).toBeGreaterThan(15);
      expect(parseInt(progressValue || '0')).toBeLessThan(20);
  test.describe('Cross-Widget Integration', () => {
    test('widgets update consistently across page', async ({ page }) => {
      await page.goto('/trial/dashboard');
      // Wait for multiple widgets to load
      // Verify consistent data display
      const statusWidgetROI = await page.locator('[data-testid=status-widget-roi]').textContent();
      const progressBarDays = await page.locator('[data-testid=progress-bar-days]').textContent();
      expect(statusWidgetROI).toContain('125%');
      expect(progressBarDays).toContain('15 days');
      // Test that achieving a milestone updates both widgets
      const milestoneButton = page.locator('[data-testid=milestone-marker-initial-journey-created]');
      await milestoneButton.click();
      // Simulate milestone completion
      await page.route('/api/trial/achieve-milestone', route => {
      await getStartedButton.click();
      // Both widgets should reflect the update
      await page.waitForTimeout(1000); // Allow for API call and state update
      // Check that progress bar shows updated milestone count
      await expect(page.locator('text="2 of 2 milestones completed"')).toBeVisible();
    test('responsive behavior across all widgets', async ({ page }) => {
      const devices = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      for (const device of devices) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/trial/dashboard');
        
        // Wait for widgets to load
        await page.waitForSelector('[data-testid=trial-status-widget]');
        // Verify widgets are visible and properly sized
        const statusWidget = page.locator('[data-testid=trial-status-widget]');
        const widgetBox = await statusWidget.boundingBox();
        if (widgetBox) {
          expect(widgetBox.width).toBeLessThanOrEqual(device.width);
        }
        // Test mobile-specific adaptations
        if (device.name === 'mobile') {
          // Banner should be responsive
          const banner = page.locator('[data-testid=trial-banner]');
          if (await banner.isVisible()) {
            const bannerBox = await banner.boundingBox();
            if (bannerBox) {
              expect(bannerBox.width).toBeLessThanOrEqual(device.width);
          
          // Progress bar should be scrollable or stacked
          const progressBar = page.locator('[data-testid=trial-progress-bar]');
          const progressBox = await progressBar.boundingBox();
          if (progressBox) {
            expect(progressBox.width).toBeLessThanOrEqual(device.width);
        await page.screenshot({
          path: `screenshots/trial-widgets-responsive-${device.name}-${Date.now()}.png`,
          fullPage: true
      }
  test.describe('Accessibility and Keyboard Navigation', () => {
    test('widgets are keyboard accessible', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      // Should focus on first interactive element
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
      // Continue tabbing through interactive elements
      // Test Enter key on upgrade button
      const upgradeButton = page.locator('[data-testid=upgrade-button]:focus');
      if (await upgradeButton.isVisible()) {
        await page.keyboard.press('Enter');
        // Should trigger upgrade action
        await page.waitForTimeout(1000);
      // Test Space key on checkboxes
      await firstCheckbox.focus();
      await page.keyboard.press('Space');
      await expect(firstCheckbox).toBeChecked();
    test('widgets have proper ARIA labels and roles', async ({ page }) => {
      // Test progress bars have proper ARIA attributes
      const progressBar = page.locator('[data-testid=trial-progress-bar] [role=progressbar]');
      await expect(progressBar).toHaveAttribute('aria-valuenow');
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      // Test buttons have proper labels
      const buttonLabel = await upgradeButton.getAttribute('aria-label');
      expect(buttonLabel).toBeTruthy();
      // Test milestone markers have proper labels
      const milestoneMarker = page.locator('[data-testid=milestone-marker-first-client-connected]');
      const markerLabel = await milestoneMarker.getAttribute('aria-label');
      expect(markerLabel).toContain('First Client Connected');
    test('widgets work with screen reader announcements', async ({ page }) => {
      // Test live regions for dynamic updates
      const liveRegion = page.locator('[aria-live="polite"]');
      if (await liveRegion.isVisible()) {
        await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      // Test that completing a checklist item announces the change
      // Should update any live regions with completion status
      await page.waitForTimeout(500);
  test.describe('Performance and Load Testing', () => {
    test('widgets load within performance requirements', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/trial/dashboard', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      // Verify page loads within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      // Test widget-specific load times
      const widgetStartTime = Date.now();
      const widgetLoadTime = Date.now() - widgetStartTime;
      // Widgets should load within 1 second
      expect(widgetLoadTime).toBeLessThan(1000);
    test('widgets handle API delays gracefully', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/trial/status', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            trial: { /* ... trial data */ },
            progress: { /* ... progress data */ }
      // Should show loading states
      await expect(page.locator('[data-testid=loading-spinner]')).toBeVisible();
      // Eventually show loaded content
      await page.waitForSelector('[data-testid=trial-status-widget]', { timeout: 5000 });
      await expect(page.locator('[data-testid=loading-spinner]')).not.toBeVisible();
  test.afterEach(async ({ page }) => {
    // Clean up any test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
});
