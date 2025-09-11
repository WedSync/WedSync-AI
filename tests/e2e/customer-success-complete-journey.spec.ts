/**
 * WS-142: Complete Customer Success Journey E2E Tests
 * Comprehensive testing of all customer success features with team integrations
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createTestUser, cleanupTestData } from '../helpers/test-utils';
import { mockMLPredictions } from '../helpers/ml-mocks';

test.describe('Customer Success Complete Journey', () => {
  let page: Page;
  let context: BrowserContext;
  let testUserId: string;
  let testSupplierId: string;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Create test user and supplier
    const testData = await createTestUser('supplier');
    testUserId = testData.userId;
    testSupplierId = testData.supplierId;
    
    // Login as test user
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', testData.email);
    await page.fill('[data-testid="password"]', testData.password);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test.afterEach(async () => {
    await cleanupTestData(testUserId);
    await context.close();
  });

  test('Complete onboarding flow with milestone tracking', async () => {
    await test.step('Start onboarding journey', async () => {
      await page.goto('/onboarding');
      
      // Should show welcome screen
      await expect(page.getByText('Welcome to WedSync!')).toBeVisible();
      await expect(page.getByTestId('onboarding-progress')).toHaveText('0%');
      
      // Start onboarding
      await page.click('[data-testid="start-onboarding"]');
    });

    await test.step('Complete profile setup milestone', async () => {
      // Fill profile information
      await page.fill('[data-testid="business-name"]', 'Test Wedding Services');
      await page.fill('[data-testid="phone"]', '+1234567890');
      await page.selectOption('[data-testid="service-type"]', 'photography');
      await page.setInputFiles('[data-testid="avatar-upload"]', 'tests/fixtures/avatar.jpg');
      
      await page.click('[data-testid="save-profile"]');
      
      // Should trigger milestone achievement
      await expect(page.getByText('🎉 Milestone Achieved: Profile Complete!')).toBeVisible();
      await expect(page.getByTestId('onboarding-progress')).toHaveText('25%');
      
      // Check health score update
      await expect(page.getByTestId('health-score')).toContainText('60');
    });

    await test.step('Add first client milestone', async () => {
      await page.goto('/clients');
      await page.click('[data-testid="add-client"]');
      
      await page.fill('[data-testid="client-name"]', 'John & Jane Doe');
      await page.fill('[data-testid="wedding-date"]', '2025-06-15');
      await page.fill('[data-testid="venue"]', 'Grand Hotel');
      
      await page.click('[data-testid="save-client"]');
      
      // Should trigger milestone
      await expect(page.getByText('🚀 Milestone Achieved: First Client Added!')).toBeVisible();
      await expect(page.getByTestId('health-score')).toContainText('75');
    });

    await test.step('Complete first week milestone', async () => {
      // Simulate 7 days of activity
      for (let i = 0; i < 7; i++) {
        await page.evaluate(() => {
          // Mock date progression
          const mockDate = new Date();
          mockDate.setDate(mockDate.getDate() + 1);
          window.__mockDate = mockDate;
        });
        
        // Perform daily activity
        await page.goto('/dashboard');
        await page.waitForTimeout(100);
      }
      
      // Should trigger weekly milestone
      await expect(page.getByText('🌟 Milestone Achieved: First Week Complete!')).toBeVisible();
      await expect(page.getByTestId('engagement-level')).toContainText('high');
    });
  });

  test('Health scoring with viral activity integration', async () => {
    await test.step('Check initial health score', async () => {
      await page.goto('/dashboard');
      
      const healthScore = await page.getByTestId('health-score').textContent();
      expect(parseInt(healthScore!)).toBeGreaterThan(40);
      
      // Should show health components
      await page.click('[data-testid="health-details"]');
      await expect(page.getByText('Onboarding Progress')).toBeVisible();
      await expect(page.getByText('Feature Adoption')).toBeVisible();
      await expect(page.getByText('Engagement Level')).toBeVisible();
    });

    await test.step('Viral activity boosts health score', async () => {
      // Generate referral link
      await page.goto('/referrals');
      await page.click('[data-testid="generate-referral-link"]');
      
      const referralLink = await page.getByTestId('referral-link').textContent();
      
      // Simulate successful referral
      const newContext = await context.browser()?.newContext();
      const newPage = await newContext!.newPage();
      await newPage.goto(referralLink!);
      await newPage.fill('[data-testid="email"]', 'referred@example.com');
      await newPage.click('[data-testid="sign-up"]');
      await newContext!.close();
      
      // Check health score boost
      await page.reload();
      await expect(page.getByTestId('health-score')).toContainText('85');
      await expect(page.getByTestId('viral-health-boost')).toContainText('+10');
      
      // Should show in success events
      await page.goto('/success/events');
      await expect(page.getByText('Viral activity boosted health score')).toBeVisible();
    });
  });

  test('ML churn prediction and intervention flow', async () => {
    await test.step('Simulate declining engagement', async () => {
      // Mock declining health metrics
      await page.evaluate(() => {
        window.localStorage.setItem('mock_health_decline', 'true');
      });
      
      // Trigger low engagement behaviors
      await page.goto('/dashboard');
      
      // Don't interact for simulated days
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          const mockDate = new Date();
          mockDate.setDate(mockDate.getDate() + 1);
          window.__mockDate = mockDate;
        });
      }
      
      await page.reload();
    });

    await test.step('Churn prediction triggers', async () => {
      // Mock ML prediction
      await mockMLPredictions(page, {
        churnProbability: 0.73,
        riskLevel: 'high',
        factors: ['low_engagement', 'incomplete_onboarding']
      });
      
      // Should show churn risk indicator
      await expect(page.getByTestId('churn-risk-badge')).toBeVisible();
      await expect(page.getByText('Churn Risk: High (73%)')).toBeVisible();
      
      // Should show risk factors
      await page.click('[data-testid="risk-details"]');
      await expect(page.getByText('Low engagement detected')).toBeVisible();
      await expect(page.getByText('Incomplete onboarding')).toBeVisible();
    });

    await test.step('Automated intervention sent', async () => {
      // Wait for intervention to trigger
      await page.waitForTimeout(2000);
      
      // Should show intervention notification
      await expect(page.getByText('Success coach reaching out...')).toBeVisible();
      
      // Check intervention was logged
      await page.goto('/admin/interventions');
      await expect(page.getByText('ML-triggered intervention sent')).toBeVisible();
      await expect(page.getByText('Channel: multi-channel')).toBeVisible();
      await expect(page.getByText('Type: churn_prevention')).toBeVisible();
    });

    await test.step('Intervention response tracking', async () => {
      // Simulate user responding to intervention
      await page.goto('/messages');
      await expect(page.getByText('Hi! We noticed you haven\'t been active')).toBeVisible();
      
      // Click intervention CTA
      await page.click('[data-testid="intervention-cta"]');
      
      // Should track response
      await expect(page.getByText('Thanks for responding!')).toBeVisible();
      
      // Health score should improve
      await page.goto('/dashboard');
      await expect(page.getByTestId('health-score')).toContainText('65');
      await expect(page.getByTestId('churn-risk-badge')).toHaveClass(/warning/);
    });
  });

  test('Marketing automation integration with success events', async () => {
    await test.step('Milestone triggers marketing campaign', async () => {
      // Achieve a significant milestone
      await page.goto('/portfolio');
      
      // Upload 10 portfolio items (milestone trigger)
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="add-portfolio-item"]');
        await page.setInputFiles('[data-testid="portfolio-image"]', `tests/fixtures/sample${i}.jpg`);
        await page.fill('[data-testid="portfolio-title"]', `Wedding ${i}`);
        await page.click('[data-testid="save-portfolio-item"]');
      }
      
      // Should trigger milestone
      await expect(page.getByText('🎨 Milestone Achieved: Portfolio Complete!')).toBeVisible();
    });

    await test.step('Marketing event created from success', async () => {
      // Check marketing automation
      await page.goto('/admin/marketing/events');
      
      // Should show success-triggered event
      await expect(page.getByText('success_milestone_achieved')).toBeVisible();
      await expect(page.getByText('Trigger: portfolio_complete')).toBeVisible();
      
      // Should trigger celebration campaign
      await expect(page.getByText('Campaign: milestone_celebration')).toBeVisible();
      await expect(page.getByText('Status: sent')).toBeVisible();
    });

    await test.step('Success champion triggers referral campaign', async () => {
      // Simulate becoming a success champion
      await page.evaluate(() => {
        window.localStorage.setItem('mock_success_champion', 'true');
      });
      
      await page.goto('/dashboard');
      await page.reload();
      
      // Should show champion badge
      await expect(page.getByTestId('champion-badge')).toBeVisible();
      await expect(page.getByText('You are a Success Champion!')).toBeVisible();
      
      // Check referral campaign triggered
      await page.goto('/admin/marketing/campaigns');
      await expect(page.getByText('Referral Campaign: Success Champion')).toBeVisible();
      await expect(page.getByText('Incentive: Double Points')).toBeVisible();
    });
  });

  test('Multi-channel intervention coordination', async () => {
    await test.step('Setup intervention scenario', async () => {
      // Mock at-risk status
      await mockMLPredictions(page, {
        churnProbability: 0.85,
        riskLevel: 'critical'
      });
      
      await page.goto('/admin/success/interventions');
    });

    await test.step('Coordinated intervention strategy', async () => {
      // Should show intervention plan
      await expect(page.getByText('Intervention Strategy')).toBeVisible();
      await expect(page.getByText('1. Email sent')).toBeVisible();
      await expect(page.getByText('2. In-app coaching (if no response in 24h)')).toBeVisible();
      await expect(page.getByText('3. SMS follow-up (if no response in 48h)')).toBeVisible();
      await expect(page.getByText('4. Phone call (if no response in 72h)')).toBeVisible();
    });

    await test.step('Intervention deduplication', async () => {
      // Trigger multiple risk signals
      await page.evaluate(() => {
        window.__triggerMultipleRisks = true;
      });
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should show smart coordination
      const interventionCount = await page.getByTestId('intervention-count').textContent();
      expect(parseInt(interventionCount!)).toBeLessThan(5);
      
      // Should show coordination message
      await expect(page.getByText('Interventions coordinated to avoid fatigue')).toBeVisible();
    });
  });

  test('Offline success tracking and sync', async () => {
    await test.step('Enable offline mode', async () => {
      await context.setOffline(true);
      await page.reload();
      
      // Should show offline indicator
      await expect(page.getByText('Offline Mode')).toBeVisible();
      await expect(page.getByTestId('offline-icon')).toBeVisible();
    });

    await test.step('Complete milestone offline', async () => {
      // Navigate to tasks
      await page.goto('/tasks');
      
      // Complete a task offline
      await page.click('[data-testid="task-checkbox-1"]');
      await expect(page.getByText('Task completed (will sync when online)')).toBeVisible();
      
      // Achieve milestone offline
      await page.click('[data-testid="complete-all-tasks"]');
      await expect(page.getByText('Milestone queued for sync')).toBeVisible();
      
      // Check offline queue
      await page.goto('/settings/offline');
      await expect(page.getByText('1 milestone pending sync')).toBeVisible();
      await expect(page.getByText('3 events pending sync')).toBeVisible();
    });

    await test.step('Sync when reconnected', async () => {
      // Come back online
      await context.setOffline(false);
      await page.reload();
      
      // Should start syncing
      await expect(page.getByText('Syncing offline data...')).toBeVisible();
      
      // Wait for sync to complete
      await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
      
      // Should show success
      await expect(page.getByText('Success data synced')).toBeVisible();
      await expect(page.getByText('Milestone achieved: Task Master!')).toBeVisible();
      
      // Health score should be updated
      await expect(page.getByTestId('health-score')).not.toContainText('--');
    });

    await test.step('Conflict resolution', async () => {
      // Simulate conflict scenario
      await page.evaluate(() => {
        window.localStorage.setItem('mock_sync_conflict', 'true');
      });
      
      await context.setOffline(true);
      
      // Make offline change
      await page.goto('/profile');
      await page.fill('[data-testid="business-name"]', 'Offline Name');
      await page.click('[data-testid="save"]');
      
      // Come back online with conflict
      await context.setOffline(false);
      await page.reload();
      
      // Should show conflict resolution
      await expect(page.getByText('Sync conflict detected')).toBeVisible();
      await expect(page.getByText('Server version: Online Name')).toBeVisible();
      await expect(page.getByText('Local version: Offline Name')).toBeVisible();
      
      // Resolve conflict
      await page.click('[data-testid="keep-server-version"]');
      await expect(page.getByText('Conflict resolved')).toBeVisible();
    });
  });

  test('Real-time dashboard updates', async () => {
    await test.step('Open dashboard', async () => {
      await page.goto('/dashboard');
      
      // Should show real-time indicator
      await expect(page.getByTestId('realtime-status')).toHaveClass(/connected/);
    });

    await test.step('Health score updates in real-time', async () => {
      // Open another tab
      const page2 = await context.newPage();
      await page2.goto('/dashboard');
      
      // Complete action in first tab
      await page.goto('/forms');
      await page.click('[data-testid="create-form"]');
      await page.fill('[data-testid="form-name"]', 'Test Form');
      await page.click('[data-testid="save-form"]');
      
      // Check real-time update in second tab
      await page2.waitForSelector('[data-testid="health-score-updated"]');
      await expect(page2.getByTestId('health-score')).not.toContainText('50');
      await expect(page2.getByText('Health score improved!')).toBeVisible();
      
      await page2.close();
    });

    await test.step('Success events stream in real-time', async () => {
      // Open events dashboard
      await page.goto('/success/events');
      
      // Should show event stream
      await expect(page.getByText('Live Events')).toBeVisible();
      
      // Trigger an event
      await page.goto('/milestones');
      await page.click('[data-testid="claim-milestone"]');
      
      // Go back to events
      await page.goto('/success/events');
      
      // Should show new event immediately
      await expect(page.getByText('milestone_achieved (just now)')).toBeVisible();
    });
  });

  test('Business intelligence and ROI tracking', async () => {
    await test.step('Access BI dashboard', async () => {
      await page.goto('/admin/success/analytics');
      
      // Should show key metrics
      await expect(page.getByTestId('total-roi')).toBeVisible();
      await expect(page.getByTestId('churn-reduction')).toBeVisible();
      await expect(page.getByTestId('ltv-increase')).toBeVisible();
      await expect(page.getByTestId('intervention-success')).toBeVisible();
    });

    await test.step('ROI calculation and reporting', async () => {
      // Generate ROI report
      await page.click('[data-testid="generate-roi-report"]');
      await page.selectOption('[data-testid="report-period"]', 'last_quarter');
      await page.click('[data-testid="generate"]');
      
      // Wait for report
      await page.waitForSelector('[data-testid="roi-report-complete"]');
      
      // Should show comprehensive metrics
      await expect(page.getByText('Total ROI: 347%')).toBeVisible();
      await expect(page.getByText('Churn Reduction: 67%')).toBeVisible();
      await expect(page.getByText('Customer LTV Increase: $2,340')).toBeVisible();
      await expect(page.getByText('Prevented Churns: 234')).toBeVisible();
    });

    await test.step('Optimization recommendations', async () => {
      // Should show AI-generated recommendations
      await page.click('[data-testid="view-recommendations"]');
      
      await expect(page.getByText('Top Recommendations')).toBeVisible();
      await expect(page.getByText('1. Improve ML model accuracy')).toBeVisible();
      await expect(page.getByText('Estimated Impact: +$50K revenue')).toBeVisible();
      
      await expect(page.getByText('2. Optimize intervention timing')).toBeVisible();
      await expect(page.getByText('Estimated Impact: 10% churn reduction')).toBeVisible();
    });
  });

  test('Privacy and GDPR compliance', async () => {
    await test.step('Data access request', async () => {
      await page.goto('/settings/privacy');
      
      // Request data export
      await page.click('[data-testid="request-data-export"]');
      await expect(page.getByText('Data export requested')).toBeVisible();
      
      // Wait for export
      await page.waitForSelector('[data-testid="export-ready"]', { timeout: 30000 });
      
      // Download export
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-export"]')
      ]);
      
      expect(download.suggestedFilename()).toContain('success_data_export');
    });

    await test.step('Consent management', async () => {
      // Revoke ML analysis consent
      await page.goto('/settings/consent');
      
      await page.uncheck('[data-testid="consent-ml-analysis"]');
      await page.click('[data-testid="save-consent"]');
      
      await expect(page.getByText('Consent updated')).toBeVisible();
      
      // Check ML features disabled
      await page.goto('/dashboard');
      await expect(page.getByTestId('churn-prediction')).toHaveClass(/disabled/);
      await expect(page.getByText('ML features disabled per your consent')).toBeVisible();
    });

    await test.step('Data anonymization request', async () => {
      await page.goto('/settings/privacy');
      
      // Request anonymization
      await page.click('[data-testid="anonymize-data"]');
      await page.click('[data-testid="confirm-anonymize"]');
      
      await expect(page.getByText('Anonymization in progress')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="anonymization-complete"]');
      
      await expect(page.getByText('Your data has been anonymized')).toBeVisible();
      await expect(page.getByText('Analytics data retained in anonymous form')).toBeVisible();
    });
  });

  test('Production health monitoring', async () => {
    await test.step('View system health', async () => {
      await page.goto('/admin/success/health');
      
      // Should show health status
      await expect(page.getByTestId('system-status')).toBeVisible();
      
      // Check component health
      await expect(page.getByText('Churn Prediction: Healthy')).toBeVisible();
      await expect(page.getByText('Intervention System: Healthy')).toBeVisible();
      await expect(page.getByText('Integrations: 4/4 Online')).toBeVisible();
      await expect(page.getByText('Data Quality: 96%')).toBeVisible();
    });

    await test.step('Performance metrics', async () => {
      // Check response times
      await expect(page.getByText('Health Score Calculation: 87ms')).toBeVisible();
      await expect(page.getByText('Churn Prediction: 156ms')).toBeVisible();
      await expect(page.getByText('Event Processing: 42ms')).toBeVisible();
      
      // All should be under target
      await expect(page.getByTestId('performance-status')).toHaveClass(/healthy/);
    });

    await test.step('Alert simulation', async () => {
      // Simulate system degradation
      await page.evaluate(() => {
        window.__simulateSystemDegradation = true;
      });
      
      await page.click('[data-testid="refresh-health"]');
      
      // Should show warning
      await expect(page.getByTestId('system-status')).toHaveClass(/warning/);
      await expect(page.getByText('System Degraded')).toBeVisible();
      
      // Should show alert
      await expect(page.getByText('Alert: High error rate detected')).toBeVisible();
      await expect(page.getByText('Action: Engineering team notified')).toBeVisible();
    });
  });

  test('Complete success journey validation', async () => {
    await test.step('Verify all integrations working', async () => {
      await page.goto('/admin/success/validation');
      
      await page.click('[data-testid="run-validation"]');
      
      // Wait for all checks
      await page.waitForSelector('[data-testid="validation-complete"]', { timeout: 30000 });
      
      // All should pass
      await expect(page.getByText('✅ Viral Integration: Working')).toBeVisible();
      await expect(page.getByText('✅ Marketing Integration: Working')).toBeVisible();
      await expect(page.getByText('✅ Dashboard Updates: Real-time')).toBeVisible();
      await expect(page.getByText('✅ Offline Sync: Functional')).toBeVisible();
      await expect(page.getByText('✅ ML Predictions: Accurate (87.3%)')).toBeVisible();
      await expect(page.getByText('✅ Interventions: Effective (73.2%)')).toBeVisible();
      await expect(page.getByText('✅ Privacy Controls: Compliant')).toBeVisible();
      await expect(page.getByText('✅ Performance: Within targets')).toBeVisible();
    });

    await test.step('Business metrics validation', async () => {
      // Check business impact
      await expect(page.getByText('Monthly Churn: 2.7% (Target: <3%)')).toBeVisible();
      await expect(page.getByText('Customer Satisfaction: 96.4%')).toBeVisible();
      await expect(page.getByText('System ROI: 347%')).toBeVisible();
      await expect(page.getByText('Avg Response Time: 142ms')).toBeVisible();
      
      // Overall status
      await expect(page.getByTestId('production-ready')).toHaveText('✅ Production Ready');
    });
  });
});

// Helper function to simulate various user behaviors
async function simulateUserActivity(page: Page, activityType: string) {
  switch (activityType) {
    case 'high_engagement':
      await page.goto('/dashboard');
      await page.click('[data-testid="quick-action-1"]');
      await page.goto('/clients');
      await page.goto('/calendar');
      break;
      
    case 'low_engagement':
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      break;
      
    case 'feature_adoption':
      await page.goto('/features/new');
      await page.click('[data-testid="try-feature"]');
      break;
  }
}

// Helper to verify real-time updates
async function verifyRealtimeUpdate(page: Page, expectedUpdate: string) {
  await page.waitForSelector(`[data-testid="${expectedUpdate}"]`, {
    timeout: 5000
  });
  await expect(page.getByTestId(expectedUpdate)).toBeVisible();
}