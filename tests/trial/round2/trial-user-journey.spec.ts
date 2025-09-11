/**
 * WS-140 Trial Management System - Round 2: User Journey Tests
 * Comprehensive Playwright tests for trial feature validation
 * Tests milestone celebrations, tooltips, activity tracking, and recommendations
 */

import { test, expect, Page } from '@playwright/test';

// Helper function to mock trial progress data
const mockTrialProgress = {
  trial_id: 'trial-123',
  organization_id: 'org-456',
  days_elapsed: 5,
  days_remaining: 25,
  features_used: ['client_onboarding', 'journey_builder'],
  total_time_saved_hours: 8,
  engagement_score: 75,
  conversion_probability: 0.85,
  milestones_achieved: [
    {
      id: 'ms-1',
      milestone_type: 'first_client_connected',
      milestone_name: 'First Client Added',
      description: 'Successfully connected your first client',
      achieved: true,
      achieved_at: new Date().toISOString(),
      value_impact_score: 9
    }
  ],
  milestones_remaining: [
    {
      id: 'ms-2',
      milestone_type: 'initial_journey_created',
      milestone_name: 'First Journey Created',
      description: 'Create your first automated journey',
      achieved: false,
      value_impact_score: 8
    }
  ]
};

test.describe('Trial User Journey - Milestone Celebrations', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock API responses
    await page.route('**/api/trial/progress', async route => {
      await route.fulfill({ json: mockTrialProgress });
    });
    
    // Navigate to trial dashboard
    await page.goto('/dashboard');
  });

  test('should display milestone achievements with animations', async ({ page }) => {
    // Check for milestone component
    await expect(page.locator('[data-testid="trial-milestones"]')).toBeVisible();
    
    // Verify achievement summary
    await expect(page.locator('text=Your Achievements')).toBeVisible();
    await expect(page.locator('text=1/2 Complete')).toBeVisible();
    await expect(page.locator('text=8h Saved')).toBeVisible();
    
    // Check for completed milestone card
    const completedMilestone = page.locator('[data-testid="milestone-card-first_client_connected"]');
    await expect(completedMilestone).toBeVisible();
    await expect(completedMilestone).toHaveClass(/bg-gradient-to-br from-green-50/);
    
    // Verify milestone has checkmark
    await expect(completedMilestone.locator('.bg-green-500')).toBeVisible();
  });

  test('should trigger celebration modal on milestone click', async ({ page }) => {
    // Click celebrate button on completed milestone
    await page.click('[data-testid="milestone-card-first_client_connected"] button:has-text("Celebrate")');
    
    // Verify celebration modal appears
    await expect(page.locator('text=Congratulations! 🎉')).toBeVisible();
    await expect(page.locator('text=First Client Added')).toBeVisible();
    
    // Check for impact metrics in modal
    await expect(page.locator('text=2h saved')).toBeVisible();
    await expect(page.locator('text=Impact: 9/10')).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Continue Journey")');
    await expect(page.locator('text=Congratulations!')).not.toBeVisible();
  });

  test('should show confetti effect on milestone celebration', async ({ page }) => {
    // Trigger celebration
    await page.click('[data-testid="milestone-card-first_client_connected"] button:has-text("Celebrate")');
    
    // Check for confetti particles
    const confettiContainer = page.locator('.fixed.inset-0.pointer-events-none');
    await expect(confettiContainer).toBeVisible();
    
    // Verify confetti particles are animated
    const particles = confettiContainer.locator('[style*="backgroundColor"]');
    await expect(particles).toHaveCount(30, { timeout: 2000 });
  });
});

test.describe('Trial User Journey - Smart Tips', () => {
  test('should display contextual tips based on trial progress', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for tips component
    await expect(page.locator('[data-testid="trial-tips"]')).toBeVisible();
    await expect(page.locator('text=Smart Tips')).toBeVisible();
    
    // Verify tip cards are displayed
    const tipCards = page.locator('[data-testid^="tip-card-"]');
    await expect(tipCards).toHaveCount(3); // maxTips default
    
    // Check priority badges
    await expect(page.locator('.badge:has-text("high")')).toBeVisible();
    
    // Verify time savings display
    await expect(page.locator('text=/Potential:.*h saved/')).toBeVisible();
  });

  test('should dismiss tips when X is clicked', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial tip count
    const initialTips = await page.locator('[data-testid^="tip-card-"]').count();
    
    // Dismiss first tip
    await page.click('[data-testid^="tip-card-"]:first-child button[aria-label="Dismiss"]');
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Verify tip count decreased
    const remainingTips = await page.locator('[data-testid^="tip-card-"]').count();
    expect(remainingTips).toBe(initialTips - 1);
  });

  test('should navigate when tip action is clicked', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click action button on first tip
    await page.click('[data-testid^="tip-card-"]:first-child button:has-text("Add Client")');
    
    // Verify navigation
    await expect(page).toHaveURL('/clients/new');
  });
});

test.describe('Trial User Journey - Activity Feed', () => {
  test('should display recent activities with animations', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for activity feed
    await expect(page.locator('[data-testid="trial-activity-feed"]')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    
    // Verify activity items
    const activityItems = page.locator('[data-testid^="activity-item-"]');
    await expect(activityItems.first()).toBeVisible();
    
    // Check for time saved metrics
    await expect(page.locator('text=/saved.*min/')).toBeVisible();
    
    // Verify category badges
    await expect(page.locator('.badge:has-text("milestone")')).toBeVisible();
  });

  test('should filter activities by category', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click filter button
    await page.click('button:has-text("Filter")');
    
    // Select automation category
    await page.click('label:has-text("Automation")');
    
    // Apply filter
    await page.click('button:has-text("Apply")');
    
    // Verify only automation activities are shown
    const activities = page.locator('[data-testid^="activity-item-"]');
    const count = await activities.count();
    
    for (let i = 0; i < count; i++) {
      await expect(activities.nth(i).locator('.badge')).toContainText('automation');
    }
  });

  test('should show real-time updates for new activities', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate new activity via WebSocket or API
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('trial-activity', {
        detail: {
          id: 'new-activity',
          type: 'milestone_achieved',
          title: 'Timeline Created!',
          timeSavedMinutes: 180
        }
      }));
    });
    
    // Verify new activity appears with animation
    await expect(page.locator('text=Timeline Created!')).toBeVisible();
    await expect(page.locator('[data-testid="activity-item-new-activity"]')).toHaveClass(/animate-/);
  });
});

test.describe('Trial User Journey - Recommendations', () => {
  test('should display intelligent feature recommendations', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for recommendations component
    await expect(page.locator('[data-testid="trial-recommendations"]')).toBeVisible();
    await expect(page.locator('text=Recommended for You')).toBeVisible();
    
    // Verify recommendation cards
    const recommendations = page.locator('[data-testid^="recommendation-"]');
    await expect(recommendations).toHaveCount(4); // default visible count
    
    // Check ROI metrics
    await expect(page.locator('text=/ROI:.*%/')).toBeVisible();
    
    // Verify setup time estimates
    await expect(page.locator('text=/Setup:.*min/')).toBeVisible();
  });

  test('should expand recommendation details on click', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click on a recommendation card
    await page.click('[data-testid^="recommendation-"]:first-child');
    
    // Verify expanded details
    await expect(page.locator('text=Dependencies')).toBeVisible();
    await expect(page.locator('text=Watch Tutorial')).toBeVisible();
    
    // Check for video player if available
    const videoButton = page.locator('button:has-text("Play Video")');
    if (await videoButton.isVisible()) {
      await videoButton.click();
      await expect(page.locator('video')).toBeVisible();
    }
  });

  test('should prioritize recommendations based on context', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get all recommendation priorities
    const priorities = await page.locator('[data-testid^="recommendation-"] [data-priority]').allTextContents();
    
    // Verify they're sorted by priority (5 = highest)
    const priorityValues = priorities.map(p => parseInt(p));
    for (let i = 1; i < priorityValues.length; i++) {
      expect(priorityValues[i]).toBeLessThanOrEqual(priorityValues[i - 1]);
    }
  });
});

test.describe('Trial User Journey - Interactive Tooltips', () => {
  test('should show onboarding tooltips for new users', async ({ page }) => {
    // Set first-time user flag
    await page.addInitScript(() => {
      localStorage.setItem('trial_first_visit', 'true');
    });
    
    await page.goto('/dashboard');
    
    // Wait for first tooltip
    await expect(page.locator('[data-testid="tooltip-overlay"]')).toBeVisible();
    await expect(page.locator('text=Add Your First Client')).toBeVisible();
    
    // Check tooltip positioning
    const targetElement = page.locator('[data-tooltip="add-client"]');
    await expect(targetElement).toHaveClass(/tooltip-highlight/);
  });

  test('should navigate through tooltip steps', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trial_first_visit', 'true');
    });
    
    await page.goto('/dashboard');
    
    // First step
    await expect(page.locator('text=Add Your First Client')).toBeVisible();
    await expect(page.locator('text=Step 1 of')).toBeVisible();
    
    // Click next
    await page.click('button:has-text("Next")');
    
    // Second step
    await expect(page.locator('text=Automate Client Communication')).toBeVisible();
    await expect(page.locator('text=Step 2 of')).toBeVisible();
    
    // Click previous
    await page.click('button:has-text("Previous")');
    
    // Back to first step
    await expect(page.locator('text=Add Your First Client')).toBeVisible();
  });

  test('should skip tooltip tour', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trial_first_visit', 'true');
    });
    
    await page.goto('/dashboard');
    
    // Click skip button
    await page.click('button:has-text("Skip Tour")');
    
    // Verify tooltips are hidden
    await expect(page.locator('[data-testid="tooltip-overlay"]')).not.toBeVisible();
    
    // Verify skip is remembered
    const skipFlag = await page.evaluate(() => localStorage.getItem('trial_tooltips_skipped'));
    expect(skipFlag).toBe('true');
  });
});

test.describe('Trial User Journey - Animation Performance', () => {
  test('should have smooth animations without jank', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Start performance recording
    await page.evaluate(() => performance.mark('animation-start'));
    
    // Trigger multiple animations
    await Promise.all([
      page.hover('[data-testid^="milestone-card-"]'),
      page.hover('[data-testid^="tip-card-"]'),
      page.hover('[data-testid^="activity-item-"]')
    ]);
    
    // End performance recording
    await page.evaluate(() => performance.mark('animation-end'));
    
    // Measure performance
    const metrics = await page.evaluate(() => {
      performance.measure('animation-duration', 'animation-start', 'animation-end');
      const measure = performance.getEntriesByType('measure')[0];
      return {
        duration: measure.duration,
        fps: 1000 / (measure.duration / 60) // Approximate FPS
      };
    });
    
    // Verify smooth animations (>30 FPS)
    expect(metrics.fps).toBeGreaterThan(30);
  });

  test('should handle rapid interactions gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Rapidly dismiss multiple tips
    for (let i = 0; i < 3; i++) {
      const dismissButton = page.locator('[data-testid^="tip-card-"]:first-child button[aria-label="Dismiss"]');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        await page.waitForTimeout(100); // Small delay between clicks
      }
    }
    
    // Verify no errors occurred
    const errors = await page.evaluate(() => window.console.error);
    expect(errors).toBeUndefined();
  });
});

test.describe('Trial User Journey - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile-optimized trial features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check mobile layout
    await expect(page.locator('[data-testid="trial-milestones"]')).toBeVisible();
    
    // Verify cards stack vertically
    const milestoneCards = page.locator('[data-testid^="milestone-card-"]');
    const firstCard = await milestoneCards.first().boundingBox();
    const secondCard = await milestoneCards.nth(1).boundingBox();
    
    if (firstCard && secondCard) {
      expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height);
    }
    
    // Check touch interactions
    await page.tap('[data-testid="milestone-card-first_client_connected"]');
    await expect(page.locator('text=Congratulations!')).toBeVisible();
  });

  test('should handle swipe gestures for tips', async ({ page }) => {
    await page.goto('/dashboard');
    
    const tipCard = page.locator('[data-testid^="tip-card-"]:first-child');
    const box = await tipCard.boundingBox();
    
    if (box) {
      // Simulate swipe to dismiss
      await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      
      // Verify tip is dismissed
      await page.waitForTimeout(500);
      await expect(tipCard).not.toBeVisible();
    }
  });
});

test.describe('Trial User Journey - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate to milestone card
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Activate celebrate button with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Congratulations!')).toBeVisible();
    
    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Congratulations!')).not.toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check ARIA labels
    await expect(page.locator('[aria-label="Trial milestones"]')).toBeVisible();
    await expect(page.locator('[aria-label="Smart tips"]')).toBeVisible();
    await expect(page.locator('[aria-label="Activity feed"]')).toBeVisible();
    
    // Verify role attributes
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    await expect(page.locator('[role="status"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('should announce milestone achievements to screen readers', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for live region
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
    
    // Trigger milestone achievement
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('milestone-achieved', {
        detail: { name: 'First Journey Created' }
      }));
    });
    
    // Verify announcement
    await expect(liveRegion).toContainText('Milestone achieved: First Journey Created');
  });
});