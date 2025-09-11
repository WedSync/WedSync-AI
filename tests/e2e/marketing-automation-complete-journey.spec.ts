import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Marketing Automation Complete Journey with All Team Integrations', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Login as marketing admin
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'marketing@wedsync.com');
    await page.fill('[data-testid="password"]', 'test-password-123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('Complete marketing automation with all team integrations', async () => {
    // Test 1: AI-powered campaign creation and optimization
    await test.step('AI campaign creation with real-time optimization', async () => {
      await page.goto('/dashboard/marketing/campaigns');
      
      // Create AI-optimized campaign
      await page.click('[data-testid="create-ai-campaign"]');
      await page.selectOption('[data-testid="campaign-type"]', 'viral_referral');
      await page.selectOption('[data-testid="target-segment"]', 'super_connectors');
      
      // AI generates subject lines
      await page.click('[data-testid="generate-ai-content"]');
      await expect(page.getByText('AI generated 5 subject line variants')).toBeVisible({ timeout: 10000 });
      
      // Select best performing variant
      const bestVariant = await page.getByTestId('ai-recommended-variant');
      await expect(bestVariant).toContainText('Recommended');
      await bestVariant.click();
      
      await page.click('[data-testid="launch-campaign"]');
      await expect(page.getByText('Campaign launched with AI optimization')).toBeVisible();
    });
    
    // Test 2: Viral attribution with marketing enhancement
    await test.step('Viral attribution enhanced by marketing campaigns', async () => {
      await page.goto('/dashboard/viral/attribution');
      
      // Should show marketing-enhanced attribution
      await expect(page.getByText(/Marketing-assisted viral coefficient: 1\.\d+/)).toBeVisible();
      
      // Check attribution path visualization
      const attributionPath = page.getByTestId('attribution-path');
      await expect(attributionPath).toContainText('→');
      await expect(attributionPath).toContainText('marketing_campaign');
    });
    
    // Test 3: Customer success integration
    await test.step('Marketing campaigns triggered by customer success events', async () => {
      // Simulate health score decline
      await simulateHealthScoreChange(page, 'critical');
      
      // Should trigger churn prevention campaign
      await page.goto('/admin/marketing/campaigns');
      await expect(page.getByText('Churn prevention campaign: Auto-triggered')).toBeVisible();
      
      // AI-generated retention content
      await expect(page.getByText('AI-personalized retention email sent')).toBeVisible();
    });
    
    // Test 4: Advanced attribution tracking
    await test.step('Multi-touch attribution across all channels', async () => {
      await page.goto('/admin/marketing/attribution');
      
      // Should show complete attribution analysis
      await expect(page.getByText(/Attribution Model: Multi-touch/)).toBeVisible();
      await expect(page.getByText(/Conversion paths analyzed: \d+/)).toBeVisible();
      
      // Revenue attribution breakdown
      const revenueAttribution = page.getByTestId('revenue-attribution');
      await expect(revenueAttribution).toHaveText(/\$[\d,]+/);
    });
    
    // Test 5: Offline marketing sync
    await test.step('Marketing campaigns work offline', async () => {
      // Go offline
      await context.setOffline(true);
      await expect(page.getByText('Offline Mode')).toBeVisible();
      
      // Campaign engagement should queue
      await page.click('[data-testid="campaign-cta-offline"]');
      await expect(page.getByText('Engagement tracked offline')).toBeVisible();
      
      // Come back online
      await context.setOffline(false);
      await expect(page.getByText('Marketing data synced')).toBeVisible();
      
      // Attribution should be updated
      await page.goto('/dashboard/attribution');
      await expect(page.getByText('Offline engagement attributed')).toBeVisible();
    });
    
    // Test 6: Business intelligence and ROI
    await test.step('Marketing BI shows comprehensive ROI', async () => {
      await page.goto('/admin/marketing/business-intelligence');
      
      // Should show comprehensive ROI dashboard
      await expect(page.getByText(/Overall Marketing ROI: \d+%/)).toBeVisible();
      await expect(page.getByText(/Viral Coefficient: 1\.\d+/)).toBeVisible();
      await expect(page.getByText(/Customer LTV: \$[\d,]+/)).toBeVisible();
      
      // Predictive insights
      await expect(page.getByText('Predictive recommendations:')).toBeVisible();
      const recommendations = page.getByTestId('ai-recommendations');
      await expect(recommendations).toContainText('optimize');
    });
  });

  test('AI content generation with personalization', async () => {
    await test.step('Generate AI-optimized email content', async () => {
      await page.goto('/dashboard/marketing/ai-content');
      
      // Input campaign parameters
      await page.fill('[data-testid="campaign-goal"]', 'Increase referrals for summer weddings');
      await page.selectOption('[data-testid="tone"]', 'friendly_professional');
      await page.selectOption('[data-testid="audience"]', 'engaged_couples');
      
      // Generate content
      await page.click('[data-testid="generate-content"]');
      await expect(page.getByText('Generating AI content...')).toBeVisible();
      
      // Check generated variants
      await expect(page.locator('[data-testid="content-variant"]')).toHaveCount(5, { timeout: 15000 });
      
      // Each variant should have performance prediction
      const variants = await page.locator('[data-testid="content-variant"]').all();
      for (const variant of variants) {
        await expect(variant.getByTestId('predicted-ctr')).toBeVisible();
        await expect(variant.getByTestId('predicted-conversion')).toBeVisible();
      }
      
      // Select and test best variant
      await page.click('[data-testid="select-best-variant"]');
      await expect(page.getByText('Variant selected for campaign')).toBeVisible();
    });
  });

  test('Viral coefficient optimization with super-connectors', async () => {
    await test.step('Identify and target super-connectors', async () => {
      await page.goto('/dashboard/viral/super-connectors');
      
      // Should show super-connector identification
      await expect(page.getByText('Super-Connectors Identified')).toBeVisible();
      const connectorCount = page.getByTestId('super-connector-count');
      await expect(connectorCount).toHaveText(/\d+/);
      
      // Create targeted campaign for super-connectors
      await page.click('[data-testid="create-super-connector-campaign"]');
      await page.fill('[data-testid="incentive-multiplier"]', '2.5');
      await page.fill('[data-testid="referral-target"]', '10');
      
      await page.click('[data-testid="launch-super-campaign"]');
      await expect(page.getByText('Super-connector campaign launched')).toBeVisible();
      
      // Check viral coefficient impact
      await page.goto('/dashboard/viral/metrics');
      const viralCoefficient = page.getByTestId('viral-coefficient');
      await expect(viralCoefficient).toHaveText(/1\.[2-9]\d*/); // Should be > 1.2
    });
  });

  test('Marketing performance monitoring and alerts', async () => {
    await test.step('Monitor real-time marketing performance', async () => {
      await page.goto('/admin/marketing/monitoring');
      
      // Check system health metrics
      await expect(page.getByTestId('system-health-status')).toBeVisible();
      
      // Campaign delivery health
      const deliveryHealth = page.getByTestId('campaign-delivery-health');
      await expect(deliveryHealth).toContainText(/Delivery rate: \d+%/);
      
      // AI content generation health
      const aiHealth = page.getByTestId('ai-content-health');
      await expect(aiHealth).toContainText(/Success rate: \d+%/);
      
      // Attribution accuracy
      const attributionHealth = page.getByTestId('attribution-health');
      await expect(attributionHealth).toContainText(/Accuracy: \d+%/);
      
      // Test alert system
      await page.click('[data-testid="simulate-critical-alert"]');
      await expect(page.getByText('Critical alert triggered')).toBeVisible();
      await expect(page.getByTestId('alert-notification')).toBeVisible();
    });
  });

  test('Complete attribution journey with revenue tracking', async () => {
    await test.step('Track complete conversion path with attribution', async () => {
      // Create a test user journey
      const testUserId = 'test_user_' + Date.now();
      
      // Simulate first touchpoint - Email
      await page.goto('/test/simulate-touchpoint');
      await page.fill('[data-testid="user-id"]', testUserId);
      await page.selectOption('[data-testid="touchpoint-type"]', 'email');
      await page.fill('[data-testid="campaign-id"]', 'summer_campaign_001');
      await page.click('[data-testid="submit-touchpoint"]');
      
      // Simulate second touchpoint - Viral
      await page.selectOption('[data-testid="touchpoint-type"]', 'viral');
      await page.fill('[data-testid="referrer-id"]', 'super_connector_123');
      await page.click('[data-testid="submit-touchpoint"]');
      
      // Simulate conversion
      await page.selectOption('[data-testid="touchpoint-type"]', 'conversion');
      await page.fill('[data-testid="conversion-value"]', '5000');
      await page.click('[data-testid="submit-touchpoint"]');
      
      // Check attribution analysis
      await page.goto('/dashboard/attribution/analysis');
      await page.fill('[data-testid="search-user"]', testUserId);
      await page.click('[data-testid="search-button"]');
      
      // Verify attribution path
      const attributionPath = page.getByTestId('user-attribution-path');
      await expect(attributionPath).toContainText('Email → Viral → Conversion');
      
      // Verify revenue attribution
      const revenueBreakdown = page.getByTestId('revenue-breakdown');
      await expect(revenueBreakdown).toContainText('$5,000');
      await expect(revenueBreakdown).toContainText('Email: $');
      await expect(revenueBreakdown).toContainText('Viral: $');
    });
  });

  test('Marketing automation at scale performance test', async () => {
    await test.step('Test campaign performance at scale', async () => {
      await page.goto('/admin/marketing/performance-test');
      
      // Configure scale test
      await page.fill('[data-testid="concurrent-campaigns"]', '10000');
      await page.fill('[data-testid="recipients-per-campaign"]', '1000');
      await page.fill('[data-testid="test-duration"]', '60'); // seconds
      
      // Start performance test
      await page.click('[data-testid="start-performance-test"]');
      await expect(page.getByText('Performance test started')).toBeVisible();
      
      // Monitor performance metrics
      await page.waitForTimeout(5000); // Wait for initial metrics
      
      // Check delivery performance
      const deliveryTime = page.getByTestId('avg-delivery-time');
      await expect(deliveryTime).toHaveText(/\d+ms/);
      const deliveryTimeValue = await deliveryTime.textContent();
      expect(parseInt(deliveryTimeValue!.replace('ms', ''))).toBeLessThan(200);
      
      // Check AI generation performance
      const aiGenTime = page.getByTestId('ai-generation-time');
      await expect(aiGenTime).toHaveText(/\d+s/);
      const aiGenTimeValue = await aiGenTime.textContent();
      expect(parseFloat(aiGenTimeValue!.replace('s', ''))).toBeLessThan(2);
      
      // Check attribution calculation performance
      const attrCalcTime = page.getByTestId('attribution-calc-time');
      await expect(attrCalcTime).toHaveText(/\d+ms/);
      const attrCalcTimeValue = await attrCalcTime.textContent();
      expect(parseInt(attrCalcTimeValue!.replace('ms', ''))).toBeLessThan(500);
    });
  });

  test('Integration with all teams complete workflow', async () => {
    await test.step('Verify all team integrations working together', async () => {
      await page.goto('/admin/marketing/integrations');
      
      // Team A - Frontend components
      const teamAStatus = page.getByTestId('team-a-integration-status');
      await expect(teamAStatus).toContainText('Connected');
      await expect(teamAStatus).toContainText('CampaignBuilder: Active');
      await expect(teamAStatus).toContainText('ViralTracker: Active');
      await expect(teamAStatus).toContainText('MarketingDashboard: Active');
      
      // Team B - Viral integration
      const teamBStatus = page.getByTestId('team-b-integration-status');
      await expect(teamBStatus).toContainText('Connected');
      await expect(teamBStatus).toContainText('Viral events syncing');
      
      // Team C - Customer Success integration
      const teamCStatus = page.getByTestId('team-c-integration-status');
      await expect(teamCStatus).toContainText('Connected');
      await expect(teamCStatus).toContainText('Health score triggers active');
      
      // Team E - Offline integration
      const teamEStatus = page.getByTestId('team-e-integration-status');
      await expect(teamEStatus).toContainText('Connected');
      await expect(teamEStatus).toContainText('Offline queue ready');
      
      // Test cross-team data flow
      await page.click('[data-testid="test-cross-team-flow"]');
      await expect(page.getByText('Cross-team data flow test passed')).toBeVisible({ timeout: 30000 });
    });
  });
});

// Helper function to simulate health score change
async function simulateHealthScoreChange(page: Page, level: 'healthy' | 'warning' | 'critical') {
  await page.goto('/test/simulate-health-score');
  await page.selectOption('[data-testid="health-level"]', level);
  await page.click('[data-testid="apply-health-score"]');
  await expect(page.getByText(`Health score set to ${level}`)).toBeVisible();
}