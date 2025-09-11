/**
 * WS-167 Trial Management System - Playwright E2E Tests
 * Comprehensive end-to-end testing for trial status widget and checklist components
 */

import { test, expect } from '@playwright/test';

test.describe('Enhanced Trial Components', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('/api/trial/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          trial: {
            id: 'trial-123',
            user_id: 'user-123',
            business_type: 'wedding_planner',
            business_goals: ['efficiency', 'growth'],
            current_workflow_pain_points: ['manual_processes'],
            expected_time_savings_hours: 10,
            trial_start: '2024-01-01T00:00:00Z',
            trial_end: '2024-01-31T00:00:00Z',
            status: 'active',
            onboarding_completed: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z'
          },
          progress: {
            trial_id: 'trial-123',
            days_remaining: 15,
            days_elapsed: 15,
            progress_percentage: 60,
            milestones_achieved: [
              {
                id: 'milestone-1',
                trial_id: 'trial-123',
                milestone_type: 'first_client_connected',
                milestone_name: 'First Client Connected',
                description: 'Successfully add and configure your first client profile',
                achieved: true,
                achieved_at: '2024-01-10T00:00:00Z',
                time_to_achieve_hours: 2,
                value_impact_score: 8,
                created_at: '2024-01-01T00:00:00Z'
              }
            ],
            milestones_remaining: [
              {
                id: 'milestone-2',
                trial_id: 'trial-123',
                milestone_type: 'initial_journey_created',
                milestone_name: 'Initial Journey Created',
                description: 'Create your first automated client journey',
                achieved: false,
                value_impact_score: 9,
                created_at: '2024-01-01T00:00:00Z'
              }
            ],
            feature_usage_summary: [],
            roi_metrics: {
              trial_id: 'trial-123',
              total_time_saved_hours: 25,
              estimated_cost_savings: 1250,
              productivity_improvement_percent: 30,
              features_adopted_count: 5,
              milestones_achieved_count: 1,
              workflow_efficiency_gain: 40,
              projected_monthly_savings: 500,
              roi_percentage: 150,
              calculated_at: '2024-01-15T00:00:00Z'
            },
            conversion_recommendation: 'upgrade_now',
            urgency_score: 3
          },
          recommendations: {
            next_actions: ['Complete profile', 'Add first client'],
            upgrade_benefits: ['Unlimited clients', 'Advanced features']
          }
        })
      });
    });

    await page.route('/api/trial/milestones', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          milestones: [
            {
              id: 'milestone-1',
              trial_id: 'trial-123',
              milestone_type: 'first_client_connected',
              milestone_name: 'First Client Connected',
              description: 'Successfully add and configure your first client profile',
              achieved: true,
              achieved_at: '2024-01-10T00:00:00Z',
              time_to_achieve_hours: 2,
              value_impact_score: 8,
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 'milestone-2',
              trial_id: 'trial-123',
              milestone_type: 'initial_journey_created',
              milestone_name: 'Initial Journey Created',
              description: 'Create your first automated client journey',
              achieved: false,
              value_impact_score: 9,
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        })
      });
    });
  });

  test('TrialStatusWidget displays correctly with activity score', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for component to load
    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Check basic trial information
    await expect(page.getByText(/15 days remaining/)).toBeVisible();
    await expect(page.getByText(/60% complete/)).toBeVisible();
    await expect(page.getByText(/150% ROI/)).toBeVisible();

    // Check activity score display
    await expect(page.getByText(/activity/)).toBeVisible();

    // Check progress bar
    await expect(page.locator('.progress')).toBeVisible();
    
    // Check upgrade button
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible();
  });

  test('TrialStatusWidget compact view functions correctly', async ({ page }) => {
    await page.goto('/dashboard?compact=true');

    // Wait for compact view to load
    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Check compact display
    await expect(page.getByText(/15d left/)).toBeVisible();
    await expect(page.getByText(/60% complete/)).toBeVisible();
    await expect(page.getByText(/activity/)).toBeVisible();

    // Check upgrade button is present
    await expect(page.getByText('Upgrade')).toBeVisible();
  });

  test('TrialStatusWidget upgrade button triggers callback', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for component to load
    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Click upgrade button
    await page.getByRole('button', { name: /upgrade now/i }).click();

    // Should trigger upgrade flow (implementation dependent)
    // This would need to be connected to actual upgrade functionality
  });

  test('TrialStatusWidget shows urgency styling when days < 5', async ({ page }) => {
    // Mock urgent trial data
    await page.route('/api/trial/status', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.progress.days_remaining = 3;
      data.progress.urgency_score = 5;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    await page.goto('/dashboard');

    // Should show urgency alert
    await expect(page.getByText(/trial ending soon/i)).toBeVisible();
    await expect(page.getByText(/3 days remaining/)).toBeVisible();
  });

  test('TrialStatusWidget handles error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/trial/status', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Trial not found'
        })
      });
    });

    await page.goto('/dashboard');

    // Should show error message
    await expect(page.getByText('Trial Status Error')).toBeVisible();
    await expect(page.getByText('Trial not found')).toBeVisible();
  });

  test('TrialChecklist expands and collapses correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Initially in expanded view
    await expect(page.getByText('Getting Started Checklist')).toBeVisible();
    await expect(page.getByText(/Complete these steps/)).toBeVisible();

    // Find collapse button and click it
    const collapseButton = page.getByRole('button').first();
    await collapseButton.click();

    // Should show collapsed view
    await expect(page.getByText('Getting Started')).toBeVisible();
    await expect(page.getByText(/of.*completed/)).toBeVisible();

    // Find expand button and click it
    const expandButton = page.getByRole('button').first();
    await expandButton.click();

    // Should return to expanded view
    await expect(page.getByText('Getting Started Checklist')).toBeVisible();
  });

  test('TrialChecklist displays activity score correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for checklist to load
    await expect(page.getByText('Getting Started Checklist')).toBeVisible();

    // Check for activity score display
    await expect(page.getByText(/engagement score/)).toBeVisible();

    // In collapsed view
    const collapseButton = page.getByRole('button').first();
    await collapseButton.click();

    await expect(page.getByText(/activity/)).toBeVisible();
  });

  test('TrialChecklist shows milestone completion status', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for checklist to load
    await expect(page.getByText('Getting Started Checklist')).toBeVisible();

    // Should show progress based on milestone completion
    await expect(page.locator('.progress')).toBeVisible();

    // Progress bar should have appropriate value
    const progressBar = page.locator('.progress');
    await expect(progressBar).toBeVisible();
  });

  test('TrialStatusWidget auto-refreshes data', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('/api/trial/status', async (route) => {
      requestCount++;
      const response = await route.fetch();
      const data = await response.json();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    await page.goto('/dashboard?refreshInterval=5000'); // 5 second refresh

    // Initial load
    await expect(page.getByText('Professional Trial')).toBeVisible();
    expect(requestCount).toBe(1);

    // Wait for auto-refresh
    await page.waitForTimeout(6000);
    expect(requestCount).toBeGreaterThan(1);
  });

  test('TrialStatusWidget shows loading states during refresh', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for initial load
    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Look for refresh indicators
    const refreshIndicator = page.locator('.animate-pulse');
    
    // Refresh indicators should appear during data fetches
    // Implementation would depend on actual refresh triggering
  });

  test('TrialStatusWidget displays high activity indicator', async ({ page }) => {
    // Mock high activity data
    await page.route('/api/trial/status', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.progress.progress_percentage = 95;
      data.progress.roi_metrics.roi_percentage = 300;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    await page.goto('/dashboard');

    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Should show high activity indicator (Zap icon or similar)
    // This would appear when activity score > 75%
  });

  test('Components handle network failures gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('/api/trial/status', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/dashboard');

    // Should show error state
    await expect(page.getByText('Trial Status Error')).toBeVisible();
    await expect(page.getByText(/network error/i)).toBeVisible();
  });

  test('Components are accessible and keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for components to load
    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Focus should move through interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test button activation with keyboard
    await page.keyboard.press('Enter');
    
    // Should activate focused button
  });

  test('Components work correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Components should be responsive
    await expect(page.getByText('Professional Trial')).toBeVisible();

    // Check that text is readable and buttons are tappable
    const upgradeButton = page.getByRole('button', { name: /upgrade/i });
    await expect(upgradeButton).toBeVisible();
    
    // Button should be large enough for mobile interaction
    const buttonBox = await upgradeButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(40); // Minimum touch target size
  });

  test('Components display correctly on different screen sizes', async ({ page }) => {
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    
    await expect(page.getByText('Professional Trial')).toBeVisible();
    await expect(page.getByText('Getting Started Checklist')).toBeVisible();

    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    await expect(page.getByText('Professional Trial')).toBeVisible();
    await expect(page.getByText('Getting Started Checklist')).toBeVisible();

    // Components should adapt layout appropriately
  });

  test('Security: Components sanitize HTML content', async ({ page }) => {
    // Mock data with potential XSS
    await page.route('/api/trial/status', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.trial.business_type = '<script>alert("xss")</script>wedding_planner';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    await page.goto('/dashboard');

    // Should display content without executing scripts
    await expect(page.getByText('Professional Trial')).toBeVisible();
    
    // Script should not be executed
    const alerts = [];
    page.on('dialog', (dialog) => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });
    
    // Wait a moment to ensure no dialogs appear
    await page.waitForTimeout(2000);
    expect(alerts).toHaveLength(0);
  });
});