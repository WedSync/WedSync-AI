/**
 * WS-140 Trial Management System - Round 2: Engagement Features Tests
 * Tests for gamification, progressive disclosure, and engagement tools
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Trial Engagement - Gamification Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display achievement badges with animations', async ({ page }) => {
    // Check for achievement system
    await expect(page.locator('[data-testid="achievement-badges"]')).toBeVisible();
    
    // Verify badge animations on hover
    const badge = page.locator('[data-testid="badge-early-adopter"]');
    await expect(badge).toBeVisible();
    
    // Hover to trigger animation
    await badge.hover();
    await expect(badge).toHaveCSS('transform', /scale/);
    
    // Check for progress bars
    const progress = page.locator('[data-testid="achievement-progress"]');
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute('aria-valuenow');
  });

  test('should show streak counter for daily usage', async ({ page }) => {
    // Check streak display
    await expect(page.locator('[data-testid="usage-streak"]')).toBeVisible();
    await expect(page.locator('text=/[0-9]+ day streak/')).toBeVisible();
    
    // Verify streak fire animation
    const streakIcon = page.locator('[data-testid="streak-icon"]');
    await expect(streakIcon).toHaveClass(/animate-pulse/);
  });

  test('should display leaderboard position', async ({ page }) => {
    // Navigate to trial dashboard
    await page.click('[data-testid="trial-stats-button"]');
    
    // Check leaderboard
    await expect(page.locator('[data-testid="trial-leaderboard"]')).toBeVisible();
    await expect(page.locator('text=/Top [0-9]+%/')).toBeVisible();
    
    // Verify comparison metrics
    await expect(page.locator('text=vs. similar businesses')).toBeVisible();
  });

  test('should unlock features progressively', async ({ page }) => {
    // Check locked features
    const lockedFeature = page.locator('[data-testid="feature-locked"]');
    await expect(lockedFeature).toBeVisible();
    await expect(lockedFeature).toHaveClass(/opacity-50/);
    
    // Hover to show unlock requirements
    await lockedFeature.hover();
    await expect(page.locator('text=Complete 2 more milestones to unlock')).toBeVisible();
    
    // Simulate milestone completion
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('milestone-complete', {
        detail: { count: 2 }
      }));
    });
    
    // Verify feature unlocked with animation
    await expect(lockedFeature).not.toHaveClass(/opacity-50/);
    await expect(page.locator('[data-testid="unlock-celebration"]')).toBeVisible();
  });
});

test.describe('Trial Engagement - Smart Notifications', () => {
  test('should show contextual engagement notifications', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for idle time to trigger engagement notification
    await page.waitForTimeout(5000);
    
    // Check for smart notification
    await expect(page.locator('[data-testid="engagement-notification"]')).toBeVisible();
    await expect(page.locator('text=Ready to save more time?')).toBeVisible();
    
    // Verify notification has action button
    const actionButton = page.locator('[data-testid="notification-action"]');
    await expect(actionButton).toBeVisible();
    await expect(actionButton).toHaveText(/Try|Start|Explore/);
  });

  test('should schedule notifications based on usage patterns', async ({ page }) => {
    // Mock user activity pattern
    await page.evaluate(() => {
      localStorage.setItem('trial_usage_pattern', JSON.stringify({
        peakHours: [9, 10, 11, 14, 15],
        lastActive: new Date().toISOString(),
        preferredFeatures: ['timeline', 'guests']
      }));
    });
    
    await page.goto('/dashboard');
    
    // Verify personalized notification timing
    const notification = await page.waitForSelector('[data-testid="scheduled-notification"]', {
      timeout: 10000
    });
    
    await expect(notification).toContainText(/timeline|guest/i);
  });

  test('should not overwhelm with too many notifications', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Trigger multiple notification events
    for (let i = 0; i < 5; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('trial-notification', {
          detail: { id: `notif-${index}`, priority: 'low' }
        }));
      }, i);
    }
    
    // Check notification queue
    const visibleNotifications = page.locator('[data-testid^="notification-"]');
    const count = await visibleNotifications.count();
    
    // Should limit to max 2 notifications at once
    expect(count).toBeLessThanOrEqual(2);
  });
});

test.describe('Trial Engagement - Interactive Onboarding', () => {
  test('should show interactive product tour', async ({ page }) => {
    // Start as new user
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/dashboard?tour=true');
    
    // Check tour overlay
    await expect(page.locator('[data-testid="tour-overlay"]')).toBeVisible();
    await expect(page.locator('text=Welcome to WedSync!')).toBeVisible();
    
    // Verify interactive elements
    const tourStep = page.locator('[data-testid="tour-step-1"]');
    await expect(tourStep).toBeVisible();
    
    // Check spotlight effect
    await expect(page.locator('[data-testid="tour-spotlight"]')).toBeVisible();
    await expect(page.locator('[data-testid="tour-spotlight"]')).toHaveCSS('pointer-events', 'none');
  });

  test('should track onboarding progress', async ({ page }) => {
    await page.goto('/dashboard?tour=true');
    
    // Complete first step
    await page.click('[data-testid="tour-next"]');
    
    // Check progress indicator
    await expect(page.locator('[data-testid="tour-progress"]')).toBeVisible();
    await expect(page.locator('text=2 of 5')).toBeVisible();
    
    // Verify progress bar animation
    const progressBar = page.locator('[data-testid="tour-progress-bar"]');
    await expect(progressBar).toHaveCSS('width', /40%/);
  });

  test('should provide interactive challenges', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for challenge widget
    await expect(page.locator('[data-testid="trial-challenge"]')).toBeVisible();
    await expect(page.locator('text=Today\'s Challenge')).toBeVisible();
    
    // Start challenge
    await page.click('[data-testid="start-challenge"]');
    
    // Verify challenge steps
    await expect(page.locator('[data-testid="challenge-step-1"]')).toBeVisible();
    await expect(page.locator('text=Add 3 clients')).toBeVisible();
    
    // Complete a step
    await page.click('[data-testid="complete-step-1"]');
    
    // Check reward animation
    await expect(page.locator('[data-testid="reward-animation"]')).toBeVisible();
    await expect(page.locator('text=+50 points')).toBeVisible();
  });
});

test.describe('Trial Engagement - Time-Saving Visualizations', () => {
  test('should display animated time savings counter', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check counter display
    const counter = page.locator('[data-testid="time-saved-counter"]');
    await expect(counter).toBeVisible();
    
    // Verify counter animation
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('time-saved', {
        detail: { minutes: 30 }
      }));
    });
    
    // Check if counter increments with animation
    await expect(counter).toContainText(/[0-9]+h [0-9]+m/);
    
    // Verify celebration at milestones
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('time-saved', {
        detail: { minutes: 60 }
      }));
    });
    
    await expect(page.locator('[data-testid="hour-saved-celebration"]')).toBeVisible();
  });

  test('should show ROI calculator with live updates', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open ROI calculator
    await page.click('[data-testid="roi-calculator-button"]');
    
    // Check calculator display
    await expect(page.locator('[data-testid="roi-calculator"]')).toBeVisible();
    
    // Input values
    await page.fill('[data-testid="hourly-rate"]', '50');
    await page.fill('[data-testid="weddings-per-month"]', '10');
    
    // Verify live calculation
    await expect(page.locator('[data-testid="monthly-savings"]')).toContainText('$');
    await expect(page.locator('[data-testid="annual-roi"]')).toContainText('%');
    
    // Check visualization chart
    await expect(page.locator('[data-testid="roi-chart"]')).toBeVisible();
  });

  test('should display feature impact scores', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check impact score displays
    const impactScores = page.locator('[data-testid^="impact-score-"]');
    await expect(impactScores.first()).toBeVisible();
    
    // Hover for detailed breakdown
    await impactScores.first().hover();
    
    // Verify tooltip with details
    await expect(page.locator('[data-testid="impact-tooltip"]')).toBeVisible();
    await expect(page.locator('text=Time saved:')).toBeVisible();
    await expect(page.locator('text=Efficiency gain:')).toBeVisible();
    await expect(page.locator('text=Client satisfaction:')).toBeVisible();
  });
});

test.describe('Trial Engagement - Social Proof', () => {
  test('should display success stories carousel', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for success stories section
    await expect(page.locator('[data-testid="success-stories"]')).toBeVisible();
    
    // Verify carousel functionality
    const story1 = page.locator('text="Saved 10 hours per week"');
    await expect(story1).toBeVisible();
    
    // Navigate to next story
    await page.click('[data-testid="story-next"]');
    
    // Check transition animation
    await expect(story1).not.toBeVisible();
    await expect(page.locator('text="Doubled our bookings"')).toBeVisible();
  });

  test('should show similar business comparisons', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check comparison widget
    await expect(page.locator('[data-testid="business-comparison"]')).toBeVisible();
    await expect(page.locator('text=Businesses like yours')).toBeVisible();
    
    // Verify metrics comparison
    await expect(page.locator('[data-testid="comparison-metric-efficiency"]')).toBeVisible();
    await expect(page.locator('text=/[0-9]+% above average/')).toBeVisible();
    
    // Check comparison chart
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
  });

  test('should display testimonial popups at key moments', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Complete a milestone to trigger testimonial
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('milestone-achieved', {
        detail: { type: 'first_journey_created' }
      }));
    });
    
    // Wait for testimonial popup
    await expect(page.locator('[data-testid="testimonial-popup"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="This feature changed everything"')).toBeVisible();
    
    // Verify testimonial has attribution
    await expect(page.locator('[data-testid="testimonial-author"]')).toBeVisible();
    await expect(page.locator('[data-testid="testimonial-role"]')).toBeVisible();
  });
});

test.describe('Trial Engagement - Urgency and Scarcity', () => {
  test('should display countdown timer for trial end', async ({ page }) => {
    // Set trial with 5 days remaining
    await page.addInitScript(() => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 5);
      localStorage.setItem('trial_end_date', trialEnd.toISOString());
    });
    
    await page.goto('/dashboard');
    
    // Check countdown display
    await expect(page.locator('[data-testid="trial-countdown"]')).toBeVisible();
    await expect(page.locator('text=/[0-9]+ days remaining/')).toBeVisible();
    
    // Verify urgency styling for last 5 days
    await expect(page.locator('[data-testid="trial-countdown"]')).toHaveClass(/text-amber/);
  });

  test('should show limited-time offers', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for offer banner
    await expect(page.locator('[data-testid="limited-offer"]')).toBeVisible();
    await expect(page.locator('text=/[0-9]+% off/')).toBeVisible();
    
    // Verify countdown timer
    await expect(page.locator('[data-testid="offer-timer"]')).toBeVisible();
    await expect(page.locator('text=/Expires in [0-9]+:[0-9]+:[0-9]+/')).toBeVisible();
  });

  test('should highlight features being removed after trial', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to premium feature
    await page.click('[data-testid="premium-feature-automation"]');
    
    // Check trial-only badge
    await expect(page.locator('[data-testid="trial-only-badge"]')).toBeVisible();
    await expect(page.locator('text=Available during trial')).toBeVisible();
    
    // Hover for more info
    await page.hover('[data-testid="trial-only-badge"]');
    await expect(page.locator('text=Upgrade to keep using')).toBeVisible();
  });
});

test.describe('Trial Engagement - Personalization', () => {
  test('should adapt UI based on business type', async ({ page }) => {
    // Set business type
    await page.addInitScript(() => {
      localStorage.setItem('business_type', 'wedding_planner');
    });
    
    await page.goto('/dashboard');
    
    // Check for planner-specific features
    await expect(page.locator('text=Vendor Network')).toBeVisible();
    await expect(page.locator('text=Timeline Templates')).toBeVisible();
    
    // Change business type
    await page.evaluate(() => {
      localStorage.setItem('business_type', 'venue');
    });
    
    await page.reload();
    
    // Check for venue-specific features
    await expect(page.locator('text=Availability Calendar')).toBeVisible();
    await expect(page.locator('text=Floor Plans')).toBeVisible();
  });

  test('should remember user preferences', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Dismiss a tip
    await page.click('[data-testid="tip-dismiss-button"]');
    
    // Collapse a section
    await page.click('[data-testid="section-toggle-milestones"]');
    
    // Reload page
    await page.reload();
    
    // Verify preferences are remembered
    const dismissedTip = page.locator('[data-testid="tip-first-client"]');
    await expect(dismissedTip).not.toBeVisible();
    
    const collapsedSection = page.locator('[data-testid="milestones-content"]');
    await expect(collapsedSection).not.toBeVisible();
  });

  test('should provide personalized recommendations', async ({ page }) => {
    // Set usage history
    await page.addInitScript(() => {
      localStorage.setItem('feature_usage', JSON.stringify({
        most_used: ['timeline', 'guests'],
        never_used: ['automation', 'analytics']
      }));
    });
    
    await page.goto('/dashboard');
    
    // Check personalized recommendations
    const recommendations = page.locator('[data-testid^="personalized-rec-"]');
    const firstRec = await recommendations.first().textContent();
    
    // Should recommend unused but valuable features
    expect(firstRec).toContain('automation');
  });
});