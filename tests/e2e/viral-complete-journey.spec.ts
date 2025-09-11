import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to create test users
async function createTestUser(email: string, role: 'supplier' | 'couple') {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Test123456!',
    options: {
      data: { role, test_user: true }
    }
  });
  return { user: data?.user, error };
}

// Helper to clean up test data
async function cleanupTestData() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await supabase.from('viral_events_stream')
    .delete()
    .eq('metadata->test_user', true);
}

test.describe('Complete Viral Optimization Journey', () => {
  let superConnectorPage: Page;
  let recipientContext: BrowserContext;
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Clean up any existing test data
    await cleanupTestData();
    
    // Create test users
    await createTestUser('superconnector@test.com', 'supplier');
    await createTestUser('recipient@test.com', 'couple');
    await createTestUser('admin@test.com', 'supplier');
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('Complete viral optimization journey with all integrations', async ({ browser, context }) => {
    // Test 1: Super-connector invitation flow with A/B testing
    await test.step('Super-connector sends optimized invitation', async () => {
      superConnectorPage = await context.newPage();
      await superConnectorPage.goto(`${BASE_URL}/auth/login`);
      
      // Login as super-connector
      await superConnectorPage.fill('[data-testid="email"]', 'superconnector@test.com');
      await superConnectorPage.fill('[data-testid="password"]', 'Test123456!');
      await superConnectorPage.click('[data-testid="login-button"]');
      
      // Navigate to viral dashboard
      await superConnectorPage.goto(`${BASE_URL}/dashboard/viral`);
      
      // Verify super-connector status is displayed
      await expect(superConnectorPage.getByText('Super-Connector: Gold Tier')).toBeVisible();
      
      // Send invitation with A/B testing
      await superConnectorPage.click('[data-testid="invite-past-clients"]');
      await superConnectorPage.fill('[data-testid="recipient-email"]', 'newclient@example.com');
      await superConnectorPage.selectOption('[data-testid="relationship"]', 'past_client');
      await superConnectorPage.fill('[data-testid="personal-message"]', 'Join me on WedSync!');
      await superConnectorPage.click('[data-testid="send-invitation"]');
      
      // Verify A/B test variant assigned
      await expect(superConnectorPage.getByText(/Template variant: (control|variant_[abc])/)).toBeVisible();
      
      // Check real-time metrics update
      const viralCoefficientBefore = await superConnectorPage.getByTestId('viral-coefficient').textContent();
      await superConnectorPage.waitForTimeout(2000); // Wait for real-time update
      const viralCoefficientAfter = await superConnectorPage.getByTestId('viral-coefficient').textContent();
      
      // Coefficient should update in real-time
      expect(viralCoefficientBefore).not.toBe(viralCoefficientAfter);
    });

    // Test 2: Recipient acceptance and attribution tracking
    await test.step('Invitation recipient accepts and attribution tracks', async () => {
      // Open invitation in new context (different user)
      recipientContext = await browser.newContext();
      const recipientPage = await recipientContext.newPage();
      
      // Simulate clicking invitation link
      await recipientPage.goto(`${BASE_URL}/invite/test-invitation-code`);
      
      // Accept invitation
      await recipientPage.click('[data-testid="accept-invitation"]');
      await recipientPage.fill('[data-testid="signup-name"]', 'New Client');
      await recipientPage.fill('[data-testid="signup-email"]', 'newclient@example.com');
      await recipientPage.fill('[data-testid="signup-password"]', 'Test123456!');
      await recipientPage.click('[data-testid="complete-signup"]');
      
      // Verify attribution tracked
      await recipientPage.goto(`${BASE_URL}/dashboard/attribution`);
      await expect(recipientPage.getByText('Referred by: Gold Tier Super-Connector')).toBeVisible();
      
      // Check viral chain visualization
      await expect(recipientPage.getByTestId('viral-chain-depth')).toContainText('1');
      
      await recipientPage.close();
    });

    // Test 3: Marketing automation integration
    await test.step('Viral data feeds marketing automation', async () => {
      adminPage = await context.newPage();
      await adminPage.goto(`${BASE_URL}/auth/login`);
      
      // Login as admin
      await adminPage.fill('[data-testid="email"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password"]', 'Test123456!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Navigate to marketing dashboard
      await adminPage.goto(`${BASE_URL}/admin/marketing`);
      
      // Verify viral segments populated
      await expect(adminPage.getByText(/Super-Connectors \(\d+ users\)/)).toBeVisible();
      await expect(adminPage.getByText(/High Viral Activity \(\d+ users\)/)).toBeVisible();
      
      // Check attribution reporting
      await adminPage.click('[data-testid="attribution-report"]');
      await expect(adminPage.getByText(/Referred Revenue: \$\d{3,}/)).toBeVisible();
      
      // Verify marketing automation campaigns using viral data
      await adminPage.goto(`${BASE_URL}/admin/marketing/campaigns`);
      await expect(adminPage.getByText('Super-Connector Reward Campaign')).toBeVisible();
      await expect(adminPage.getByText('Viral Growth Acceleration')).toBeVisible();
    });

    // Test 4: Offline functionality integration
    await test.step('Viral tracking works offline', async () => {
      const offlinePage = await context.newPage();
      await offlinePage.goto(`${BASE_URL}/dashboard/viral`);
      
      // Simulate offline mode
      await context.setOffline(true);
      
      // Should show offline indicator
      await expect(offlinePage.getByText('Offline Mode')).toBeVisible({ timeout: 5000 });
      
      // Send invitation while offline
      await offlinePage.click('[data-testid="invite-offline"]');
      await offlinePage.fill('[data-testid="offline-recipient"]', 'offline@example.com');
      await offlinePage.selectOption('[data-testid="relationship"]', 'colleague');
      await offlinePage.click('[data-testid="send-offline-invitation"]');
      
      // Should queue invitation
      await expect(offlinePage.getByText('Invitation queued for sync')).toBeVisible();
      
      // Check offline queue status
      await expect(offlinePage.getByText(/Offline queue: \d+ pending/)).toBeVisible();
      
      // Come back online
      await context.setOffline(false);
      
      // Wait for automatic sync
      await offlinePage.waitForTimeout(3000);
      
      // Should sync automatically
      await expect(offlinePage.getByText('Sync complete')).toBeVisible({ timeout: 10000 });
      await expect(offlinePage.getByText('Offline queue: 0 pending')).toBeVisible();
      
      await offlinePage.close();
    });

    // Test 5: Real-time event streaming across teams
    await test.step('Real-time viral events stream to all teams', async () => {
      // Open multiple dashboard views
      const dashboardPage = await context.newPage();
      await dashboardPage.goto(`${BASE_URL}/dashboard/viral`);
      
      const analyticsPage = await context.newPage();
      await analyticsPage.goto(`${BASE_URL}/dashboard/analytics`);
      
      // Send a new invitation from super-connector page
      await superConnectorPage.goto(`${BASE_URL}/dashboard/viral`);
      await superConnectorPage.click('[data-testid="invite-past-clients"]');
      await superConnectorPage.fill('[data-testid="recipient-email"]', 'realtime@example.com');
      await superConnectorPage.selectOption('[data-testid="relationship"]', 'past_client');
      await superConnectorPage.click('[data-testid="send-invitation"]');
      
      // Verify real-time updates across all dashboards
      await expect(dashboardPage.getByText(/Last hour invites: \d+/)).toBeVisible();
      await expect(analyticsPage.getByText(/New viral event/)).toBeVisible({ timeout: 5000 });
      
      // Check WebSocket connection status
      await expect(dashboardPage.getByTestId('websocket-status')).toHaveClass(/connected/);
      
      await dashboardPage.close();
      await analyticsPage.close();
    });

    // Test 6: Security and fraud detection
    await test.step('Security measures prevent fraud', async () => {
      const fraudPage = await context.newPage();
      await fraudPage.goto(`${BASE_URL}/dashboard/viral`);
      
      // Try to send bulk suspicious invitations
      await fraudPage.click('[data-testid="invite-past-clients"]');
      
      // Switch to bulk mode
      await fraudPage.click('button:has-text("Bulk Invitations")');
      
      // Add suspicious emails
      const suspiciousEmails = [
        'test1@10minutemail.com',
        'test2@10minutemail.com',
        'bot123@tempmail.com',
        'spam456@guerrillamail.com'
      ].join('\n');
      
      await fraudPage.fill('[data-testid="offline-recipient"]', suspiciousEmails);
      await fraudPage.click('[data-testid="send-invitation"]');
      
      // Should detect fraud
      await expect(fraudPage.getByText(/Suspicious email patterns detected/)).toBeVisible();
      
      // Try rapid succession invitations (rate limiting)
      for (let i = 0; i < 6; i++) {
        await fraudPage.click('[data-testid="send-invitation"]');
        await fraudPage.waitForTimeout(100);
      }
      
      // Should hit rate limit
      await expect(fraudPage.getByText(/Rate limit exceeded/)).toBeVisible();
      
      await fraudPage.close();
    });

    // Test 7: Performance under load
    await test.step('System performs under load', async () => {
      const perfPage = await context.newPage();
      await perfPage.goto(`${BASE_URL}/dashboard/viral`);
      
      // Measure API response times
      const startTime = Date.now();
      
      // Load viral coefficient
      await perfPage.reload();
      await expect(perfPage.getByTestId('viral-coefficient')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within performance target
      expect(loadTime).toBeLessThan(200); // Target: <200ms
      
      // Check performance metrics
      await perfPage.goto(`${BASE_URL}/admin/performance`);
      await expect(perfPage.getByText(/API Response Time: \d+ms/)).toBeVisible();
      await expect(perfPage.getByText(/Cache Hit Rate: \d+%/)).toBeVisible();
      await expect(perfPage.getByText(/Concurrent Users: \d+/)).toBeVisible();
      
      // Verify all metrics are within targets
      const apiTime = await perfPage.getByTestId('api-response-time').textContent();
      expect(parseInt(apiTime || '0')).toBeLessThan(200);
      
      const cacheRate = await perfPage.getByTestId('cache-hit-rate').textContent();
      expect(parseInt(cacheRate || '0')).toBeGreaterThan(90);
      
      await perfPage.close();
    });

    // Test 8: Complete attribution chain
    await test.step('Complete multi-level attribution chain', async () => {
      const chainPage = await context.newPage();
      await chainPage.goto(`${BASE_URL}/dashboard/viral/attribution`);
      
      // View referral chains
      await chainPage.click('[data-testid="view-chains"]');
      
      // Verify chain visualization
      await expect(chainPage.getByText('Chain 1 (Depth: 3)')).toBeVisible();
      
      // Check attribution details
      await chainPage.click('[data-testid="chain-details"]');
      await expect(chainPage.getByText(/Total Revenue: \$\d+/)).toBeVisible();
      await expect(chainPage.getByText(/Conversion Rate: \d+%/)).toBeVisible();
      
      // Export attribution data
      await chainPage.click('[data-testid="export-attribution"]');
      const download = await chainPage.waitForEvent('download');
      expect(download.suggestedFilename()).toContain('attribution-report');
      
      await chainPage.close();
    });

    // Test 9: Viral coefficient achievement
    await test.step('Viral coefficient target achieved', async () => {
      const metricsPage = await context.newPage();
      await metricsPage.goto(`${BASE_URL}/dashboard/viral`);
      
      // Check viral coefficient
      const coefficient = await metricsPage.getByTestId('viral-coefficient').textContent();
      const coefficientValue = parseFloat(coefficient || '0');
      
      // Should meet or exceed target
      expect(coefficientValue).toBeGreaterThanOrEqual(1.2);
      
      // Verify achievement badge
      await expect(metricsPage.getByText('Target Achieved!')).toBeVisible();
      
      // Check celebration notification
      await expect(metricsPage.getByText(/Viral milestone reached/)).toBeVisible();
      
      await metricsPage.close();
    });
  });

  test('Load test with concurrent users', async ({ browser }) => {
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const concurrentUsers = 10; // Scaled down for test environment
    
    try {
      // Create multiple concurrent users
      for (let i = 0; i < concurrentUsers; i++) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        contexts.push(ctx);
        pages.push(page);
      }
      
      // All users access viral dashboard simultaneously
      const loadPromises = pages.map(async (page, index) => {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}/dashboard/viral`);
        await expect(page.getByTestId('viral-coefficient')).toBeVisible();
        return Date.now() - startTime;
      });
      
      const loadTimes = await Promise.all(loadPromises);
      
      // Calculate performance metrics
      const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);
      
      // Performance assertions
      expect(avgLoadTime).toBeLessThan(500); // Average should be under 500ms
      expect(maxLoadTime).toBeLessThan(1000); // Max should be under 1s
      
      // Verify no errors occurred
      for (const page of pages) {
        await expect(page.getByText('Error')).not.toBeVisible();
      }
    } finally {
      // Clean up
      for (const ctx of contexts) {
        await ctx.close();
      }
    }
  });
});

// Performance benchmarks test
test.describe('Performance Benchmarks', () => {
  test('API endpoints meet performance targets', async ({ request }) => {
    const endpoints = [
      { path: '/api/viral/coefficient', target: 100 },
      { path: '/api/viral/invitations/send', target: 150 },
      { path: '/api/viral/super-connectors', target: 500 },
      { path: '/api/viral/ab-testing/select', target: 25 },
      { path: '/api/viral/analytics', target: 200 },
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}${endpoint.path}`);
      const responseTime = Date.now() - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(endpoint.target);
      
      console.log(`${endpoint.path}: ${responseTime}ms (target: <${endpoint.target}ms)`);
    }
  });
  
  test('Database queries perform within limits', async ({ request }) => {
    // Test materialized view performance
    const response = await request.post(`${BASE_URL}/api/viral/test/performance`, {
      data: {
        query: 'viral_coefficient_cache',
        expectedTime: 100
      }
    });
    
    const data = await response.json();
    expect(data.queryTime).toBeLessThan(100);
    expect(data.cacheHit).toBeTruthy();
  });
});