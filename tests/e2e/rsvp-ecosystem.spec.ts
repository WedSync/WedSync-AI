/**
 * WS-057 RSVP Management System - Complete E2E Ecosystem Tests
 * Tests full integration with all teams using Playwright MCP
 */

import { test, expect } from '@playwright/test';

test.describe('WS-057 RSVP Ecosystem Integration', () => {
  const testClientId = 'test-client-' + Date.now();
  const testGuestId = 'test-guest-' + Date.now();
  const rsvpToken = 'test-token-' + Date.now();
  
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.goto('http://localhost:3000');
    // Login or setup test environment as needed
  });

  test('FULL RSVP JOURNEY WITH ALL INTEGRATIONS', async ({ page }) => {
    // 1. Navigate to guest list (Team A)
    await page.goto('http://localhost:3000/wedme/guests');
    
    // Verify initial guest count
    const initialGuestCount = await page.locator('[data-guest-id]').count();
    console.log(`Initial guest count: ${initialGuestCount}`);
    
    // 2. Submit RSVP response
    await page.goto(`http://localhost:3000/rsvp/${rsvpToken}`);
    
    // Fill RSVP form
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.fill('[data-testid="plus-one-count"]', '1');
    await page.selectOption('[data-testid="meal-preference"]', 'vegetarian');
    await page.fill('[data-testid="dietary-restrictions"]', 'gluten-free');
    await page.fill('[data-testid="notes"]', 'Looking forward to celebrating!');
    
    // Submit RSVP
    await page.click('[data-testid="submit-rsvp"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="rsvp-success"]')).toBeVisible();
    
    // 3. VERIFY TEAM A INTEGRATION - Guest List Update
    await page.goto('http://localhost:3000/wedme/guests');
    await page.waitForTimeout(1000); // Allow time for sync
    
    // Check for RSVP status update
    await expect(page.locator(`[data-guest-id="${testGuestId}"] .rsvp-status`))
      .toContainText('Confirmed');
    
    // 4. VERIFY TEAM C INTEGRATION - Task Creation
    await page.goto('http://localhost:3000/wedme/tasks');
    
    // Look for auto-created tasks
    await expect(page.locator('[data-testid="task-list"]'))
      .toContainText('Update seating arrangement');
    
    await expect(page.locator('[data-testid="task-list"]'))
      .toContainText('Special dietary requirements');
    
    // 5. VERIFY TEAM D INTEGRATION - Budget Update
    await page.goto('http://localhost:3000/wedme/budget');
    
    // Check for budget impact
    const cateringTotal = await page.locator('[data-testid="catering-total"]').textContent();
    expect(cateringTotal).toBeTruthy();
    
    // Verify per-guest calculation appears
    await expect(page.locator('[data-testid="guest-count-impact"]'))
      .toContainText('Guest Count Impact');
    
    // 6. VERIFY TEAM E INTEGRATION - Website Widget
    await page.goto('http://localhost:3000/wedding-website-preview');
    
    // Check widget displays updated count
    const widgetGuestCount = await page.locator('[data-testid="widget-guest-count"]').textContent();
    expect(widgetGuestCount).toContain('attending');
    
    // 7. TEST REAL-TIME SYNC ACROSS TABS
    // Open dashboard in new tab
    const dashboardPage = await page.context().newPage();
    await dashboardPage.goto('http://localhost:3000/wedme/rsvp-dashboard');
    
    // Submit another RSVP in original tab
    await page.goto(`http://localhost:3000/rsvp/another-${rsvpToken}`);
    await page.selectOption('[data-testid="rsvp-response"]', 'declined');
    await page.click('[data-testid="submit-rsvp"]');
    
    // Check dashboard updates in real-time
    await dashboardPage.waitForTimeout(1000);
    await expect(dashboardPage.locator('[data-testid="declined-count"]'))
      .not.toHaveText('0');
    
    // 8. TEST VENDOR REPORTING
    await page.goto('http://localhost:3000/wedme/vendor-report');
    
    // Generate catering report
    await page.selectOption('[data-testid="vendor-type"]', 'catering');
    await page.click('[data-testid="generate-report"]');
    
    // Verify report contains dietary restrictions
    await expect(page.locator('[data-testid="report-content"]'))
      .toContainText('gluten-free');
    
    // 9. TEST MILESTONE TRIGGERS
    // Submit RSVP with plus-one to trigger milestone
    await page.goto(`http://localhost:3000/rsvp/milestone-${rsvpToken}`);
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.fill('[data-testid="plus-one-count"]', '2');
    await page.click('[data-testid="submit-rsvp"]');
    
    // Check for plus-one milestone task
    await page.goto('http://localhost:3000/wedme/tasks');
    await expect(page.locator('[data-testid="task-list"]'))
      .toContainText('Accommodate additional guest');
    
    // Close second tab
    await dashboardPage.close();
  });

  test('LOAD TEST - 50 CONCURRENT RSVP SUBMISSIONS', async ({ page }) => {
    await page.goto('http://localhost:3000/wedme/rsvp-dashboard');
    
    // Execute load test via browser
    const loadTestResult = await page.evaluate(async () => {
      const promises = [];
      const startTime = performance.now();
      
      // Submit 50 concurrent RSVP requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          fetch('/api/rsvp/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guestId: `load-test-guest-${i}`,
              clientId: 'load-test-client',
              attending: Math.random() > 0.3, // 70% attending
              plusOneCount: Math.floor(Math.random() * 2),
              mealPreference: ['standard', 'vegetarian', 'vegan'][Math.floor(Math.random() * 3)]
            })
          })
        );
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return {
        totalTime: endTime - startTime,
        successful,
        failed,
        averageTime: (endTime - startTime) / 50
      };
    });
    
    console.log('Load Test Results:', loadTestResult);
    
    // Verify performance requirements
    expect(loadTestResult.successful).toBeGreaterThan(45); // >90% success rate
    expect(loadTestResult.averageTime).toBeLessThan(2000); // <2 seconds average
  });

  test('INTEGRATION ROLLBACK TEST', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/integration-test');
    
    // Trigger a failing integration scenario
    await page.click('[data-testid="trigger-rollback-test"]');
    
    // Verify rollback occurred
    await expect(page.locator('[data-testid="rollback-status"]'))
      .toContainText('Rollback completed successfully');
    
    // Check data consistency after rollback
    await page.goto('http://localhost:3000/wedme/guests');
    const guestStatus = await page.locator('[data-testid="test-guest-status"]').textContent();
    expect(guestStatus).toBe('pending'); // Should be reverted to original state
  });

  test('WIDGET REAL-TIME UPDATES', async ({ page }) => {
    // Open widget in iframe
    await page.goto('http://localhost:3000/widget-test');
    
    const widgetFrame = page.frameLocator('#rsvp-widget-frame');
    
    // Check initial state
    const initialCount = await widgetFrame.locator('[data-testid="attending-count"]').textContent();
    
    // Submit RSVP in another tab
    const rsvpPage = await page.context().newPage();
    await rsvpPage.goto(`http://localhost:3000/rsvp/widget-test-${rsvpToken}`);
    await rsvpPage.selectOption('[data-testid="rsvp-response"]', 'attending');
    await rsvpPage.click('[data-testid="submit-rsvp"]');
    
    // Verify widget updates in real-time
    await page.waitForTimeout(1500);
    const updatedCount = await widgetFrame.locator('[data-testid="attending-count"]').textContent();
    expect(parseInt(updatedCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
    
    await rsvpPage.close();
  });

  test('BUDGET CALCULATION ACCURACY', async ({ page }) => {
    await page.goto('http://localhost:3000/wedme/budget');
    
    // Get initial budget
    const initialBudget = await page.locator('[data-testid="total-budget"]').textContent();
    const initialAmount = parseFloat(initialBudget?.replace(/[^0-9.]/g, '') || '0');
    
    // Submit RSVP with known cost impact
    await page.goto(`http://localhost:3000/rsvp/budget-test-${rsvpToken}`);
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.fill('[data-testid="plus-one-count"]', '1'); // 2 guests total
    await page.selectOption('[data-testid="meal-preference"]', 'standard'); // $120 per guest
    await page.click('[data-testid="submit-rsvp"]');
    
    // Check budget update
    await page.goto('http://localhost:3000/wedme/budget');
    await page.waitForTimeout(1000);
    
    const updatedBudget = await page.locator('[data-testid="total-budget"]').textContent();
    const updatedAmount = parseFloat(updatedBudget?.replace(/[^0-9.]/g, '') || '0');
    
    // Expected increase: 2 guests * ($85 venue + $120 catering + $45 bar + $15 favors) = $530
    const expectedIncrease = 530;
    expect(updatedAmount - initialAmount).toBeCloseTo(expectedIncrease, 1);
  });

  test('SECURITY - AUTHENTICATION REQUIRED', async ({ page }) => {
    // Test unauthorized access
    const response = await page.request.post('/api/rsvp/process', {
      data: {
        guestId: 'unauthorized-guest',
        clientId: 'unauthorized-client',
        attending: true
      }
    });
    
    expect(response.status()).toBe(401); // Unauthorized
  });

  test('SECURITY - SQL INJECTION PREVENTION', async ({ page }) => {
    await page.goto(`http://localhost:3000/rsvp/security-${rsvpToken}`);
    
    // Attempt SQL injection in notes field
    await page.fill('[data-testid="notes"]', "'; DROP TABLE rsvp_responses; --");
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.click('[data-testid="submit-rsvp"]');
    
    // Verify safe handling
    await expect(page.locator('[data-testid="rsvp-success"]')).toBeVisible();
    
    // Check database integrity
    await page.goto('http://localhost:3000/wedme/rsvp-dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('MOBILE RESPONSIVENESS', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`http://localhost:3000/rsvp/${rsvpToken}`);
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="rsvp-form"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="rsvp-response"]');
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.tap('[data-testid="submit-rsvp"]');
    
    await expect(page.locator('[data-testid="rsvp-success"]')).toBeVisible();
  });

  test('ACCESSIBILITY COMPLIANCE', async ({ page }) => {
    await page.goto(`http://localhost:3000/rsvp/${rsvpToken}`);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Select attending
    
    // Verify ARIA labels
    const submitButton = page.locator('[data-testid="submit-rsvp"]');
    await expect(submitButton).toHaveAttribute('aria-label');
    
    // Test screen reader announcements
    const ariaLive = page.locator('[aria-live="polite"]');
    await expect(ariaLive).toBeAttached();
  });
});

test.describe('Production Monitoring', () => {
  test('SYSTEM HEALTH CHECK', async ({ page }) => {
    const response = await page.request.get('/api/rsvp/status');
    const status = await response.json();
    
    expect(status.systemStatus.database.healthy).toBe(true);
    expect(status.systemStatus.database.latency).toBeLessThan(100);
    expect(status.healthScore).toBeGreaterThan(90);
  });
  
  test('ERROR RECOVERY MECHANISMS', async ({ page }) => {
    // Simulate database connection failure
    await page.goto('http://localhost:3000/admin/simulate-failure');
    await page.click('[data-testid="simulate-db-failure"]');
    
    // Submit RSVP during failure
    await page.goto(`http://localhost:3000/rsvp/recovery-${Date.now()}`);
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.click('[data-testid="submit-rsvp"]');
    
    // Should show graceful error
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('temporarily unavailable');
    
    // Restore connection
    await page.goto('http://localhost:3000/admin/simulate-failure');
    await page.click('[data-testid="restore-db-connection"]');
    
    // Retry should succeed
    await page.goto(`http://localhost:3000/rsvp/recovery-${Date.now()}`);
    await page.selectOption('[data-testid="rsvp-response"]', 'attending');
    await page.click('[data-testid="submit-rsvp"]');
    await expect(page.locator('[data-testid="rsvp-success"]')).toBeVisible();
  });
});