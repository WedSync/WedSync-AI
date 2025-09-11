/**
 * Cross-Team Integration Compatibility Tests
 * Validates that all team outputs work together seamlessly
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

test.describe('Cross-Team Integration Tests', () => {
  let page: Page;
  let testUserId: string;
  let testOrgId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Create test user and organization
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'integration-test@wedsync.com',
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    testUserId = user.user!.id;
    
    // Create test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'Integration Test Org',
        owner_id: testUserId,
        subscription_status: 'active'
      })
      .select()
      .single();
      
    testOrgId = org.id;
  });

  test.afterAll(async () => {
    // Cleanup test data
    await supabase.auth.admin.deleteUser(testUserId);
    await supabase.from('organizations').delete().eq('id', testOrgId);
    await page.close();
  });

  test('Team A + Team B Integration: Authentication → Journey Creation', async () => {
    // Team A: Authentication flow
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'integration-test@wedsync.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Verify successful login
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Team B: Journey creation flow
    await page.goto('/journeys');
    await page.click('[data-testid="create-journey"]');
    
    // Fill journey details
    await page.fill('[data-testid="journey-name"]', 'Integration Test Journey');
    await page.fill('[data-testid="journey-description"]', 'Testing cross-team integration');
    
    // Add journey steps (Team B functionality)
    await page.click('[data-testid="add-step"]');
    await page.selectOption('[data-testid="step-type"]', 'email');
    await page.fill('[data-testid="step-content"]', 'Welcome to our service!');
    
    await page.click('[data-testid="save-journey"]');
    
    // Verify journey was created
    await expect(page.locator('[data-testid="journey-success"]')).toBeVisible();
  });

  test('Team B + Team C Integration: Journey Execution → Communication Delivery', async () => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'integration-test@wedsync.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Create a journey (Team B)
    await page.goto('/journeys/builder');
    
    // Build a communication journey
    await page.fill('[data-testid="journey-name"]', 'Communication Test');
    
    // Add email step
    await page.click('[data-testid="add-email-step"]');
    await page.fill('[data-testid="email-subject"]', 'Test Communication');
    await page.fill('[data-testid="email-content"]', 'This is a test message');
    
    // Add delay step
    await page.click('[data-testid="add-delay-step"]');
    await page.fill('[data-testid="delay-duration"]', '5');
    
    // Add SMS step
    await page.click('[data-testid="add-sms-step"]');
    await page.fill('[data-testid="sms-content"]', 'Follow-up SMS message');
    
    await page.click('[data-testid="save-journey"]');
    
    // Execute journey (Team B → Team C handoff)
    await page.click('[data-testid="execute-journey"]');
    
    // Verify execution started
    await expect(page.locator('[data-testid="execution-started"]')).toBeVisible();
    
    // Team C: Check communication delivery
    await page.goto('/communications/activity-feed');
    
    // Verify communication was logged
    await expect(page.locator('[data-testid="activity-email"]')).toBeVisible();
  });

  test('Team C + Team D Integration: Communication → Database Optimization', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'integration-test@wedsync.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Test bulk communication (Team C)
    await page.goto('/communications');
    await page.click('[data-testid="bulk-message"]');
    
    // Select multiple recipients
    await page.check('[data-testid="recipient-1"]');
    await page.check('[data-testid="recipient-2"]');
    await page.check('[data-testid="recipient-3"]');
    
    await page.fill('[data-testid="bulk-subject"]', 'Bulk Test Message');
    await page.fill('[data-testid="bulk-content"]', 'Testing database performance with bulk operations');
    
    await page.click('[data-testid="send-bulk"]');
    
    // Verify bulk operation completed
    await expect(page.locator('[data-testid="bulk-success"]')).toBeVisible();
    
    // Team D: Check database performance metrics
    await page.goto('/admin-dashboard');
    
    // Verify database optimization handled the load
    const dbMetrics = page.locator('[data-testid="db-metrics"]');
    await expect(dbMetrics).toBeVisible();
    
    // Check query performance
    const queryTime = await page.textContent('[data-testid="avg-query-time"]');
    expect(parseFloat(queryTime!)).toBeLessThan(100); // Less than 100ms
  });

  test('All Teams Integration: Complete User Journey Flow', async () => {
    // Team A: User registration
    await page.goto('/signup');
    
    const testEmail = `complete-test-${Date.now()}@wedsync.com`;
    await page.fill('[data-testid="signup-email"]', testEmail);
    await page.fill('[data-testid="signup-password"]', 'CompleteTest123!');
    await page.fill('[data-testid="signup-name"]', 'Complete Test User');
    
    await page.click('[data-testid="signup-submit"]');
    
    // Verify account creation
    await expect(page).toHaveURL(/\/onboarding/);
    
    // Complete onboarding
    await page.selectOption('[data-testid="vendor-type"]', 'photographer');
    await page.fill('[data-testid="business-name"]', 'Test Photography');
    await page.click('[data-testid="complete-onboarding"]');
    
    // Team B: Create automated journey
    await page.goto('/journeys/builder');
    await page.fill('[data-testid="journey-name"]', 'Client Onboarding');
    
    // Add welcome email
    await page.click('[data-testid="add-email-step"]');
    await page.fill('[data-testid="email-subject"]', 'Welcome to our service!');
    
    // Add follow-up sequence
    await page.click('[data-testid="add-delay-step"]');
    await page.fill('[data-testid="delay-duration"]', '24');
    
    await page.click('[data-testid="add-email-step"]');
    await page.fill('[data-testid="email-subject"]', 'Getting started guide');
    
    await page.click('[data-testid="save-journey"]');
    
    // Team C: Create client and test communication
    await page.goto('/clients');
    await page.click('[data-testid="add-client"]');
    
    await page.fill('[data-testid="client-name"]', 'John & Jane Doe');
    await page.fill('[data-testid="client-email"]', 'johnjane@example.com');
    await page.fill('[data-testid="wedding-date"]', '2024-08-15');
    
    await page.click('[data-testid="save-client"]');
    
    // Trigger journey for client
    await page.click('[data-testid="start-journey"]');
    await page.selectOption('[data-testid="journey-select"]', 'Client Onboarding');
    await page.click('[data-testid="execute-journey"]');
    
    // Team D: Verify data integrity and performance
    await page.goto('/admin-dashboard');
    
    // Check that all data was properly stored
    const clientCount = await page.textContent('[data-testid="total-clients"]');
    expect(parseInt(clientCount!)).toBeGreaterThan(0);
    
    const journeyCount = await page.textContent('[data-testid="active-journeys"]');
    expect(parseInt(journeyCount!)).toBeGreaterThan(0);
    
    // Verify system performance under load
    const systemHealth = await page.textContent('[data-testid="system-health"]');
    expect(systemHealth).toBe('Healthy');
  });

  test('API Integration: All Team Endpoints Working Together', async () => {
    // Test API integration between teams
    const apiTests = [
      // Team A: Auth API
      {
        url: '/api/auth/session',
        method: 'GET',
        expectedStatus: 200
      },
      // Team B: Journeys API
      {
        url: '/api/journeys',
        method: 'GET', 
        expectedStatus: 200
      },
      // Team C: Communications API
      {
        url: '/api/communications/messages',
        method: 'GET',
        expectedStatus: 401 // Unauthorized without session
      },
      // Team D: System health
      {
        url: '/api/health',
        method: 'GET',
        expectedStatus: 200
      }
    ];

    for (const apiTest of apiTests) {
      const response = await page.request.fetch(apiTest.url, {
        method: apiTest.method
      });
      
      expect(response.status()).toBe(apiTest.expectedStatus);
    }
  });

  test('Performance Integration: All Teams Under Load', async () => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'integration-test@wedsync.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Measure page load performance across all team areas
    const performanceTests = [
      { path: '/dashboard', teamOwner: 'A', maxLoadTime: 2000 },
      { path: '/journeys', teamOwner: 'B', maxLoadTime: 3000 },
      { path: '/communications', teamOwner: 'C', maxLoadTime: 2500 },
      { path: '/admin-dashboard', teamOwner: 'D', maxLoadTime: 3000 }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      
      await page.goto(test.path);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Team ${test.teamOwner} (${test.path}): ${loadTime}ms`);
      expect(loadTime).toBeLessThan(test.maxLoadTime);
    }
  });

  test('Data Consistency: Cross-Team Data Integrity', async () => {
    // Verify data consistency across team boundaries
    
    // Create data through Team A (auth)
    const { data: testUser } = await supabase.auth.admin.createUser({
      email: 'data-test@wedsync.com',
      password: 'DataTest123!',
      email_confirm: true
    });

    // Create journey through Team B
    const { data: journey } = await supabase
      .from('journey_canvases')
      .insert({
        name: 'Data Consistency Test',
        canvas_data: { nodes: [], edges: [] },
        created_by: testUser.user!.id,
        status: 'active'
      })
      .select()
      .single();

    // Create conversation through Team C
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        client_id: testUser.user!.id,
        vendor_id: testUserId,
        organization_id: testOrgId,
        status: 'active'
      })
      .select()
      .single();

    // Verify all data exists and is consistent
    const { data: userData } = await supabase.auth.admin.getUserById(testUser.user!.id);
    expect(userData.user).toBeTruthy();

    const { data: journeyData } = await supabase
      .from('journey_canvases')
      .select()
      .eq('id', journey.id)
      .single();
    expect(journeyData).toBeTruthy();

    const { data: conversationData } = await supabase
      .from('conversations')
      .select()
      .eq('id', conversation.id)
      .single();
    expect(conversationData).toBeTruthy();

    // Cleanup
    await supabase.auth.admin.deleteUser(testUser.user!.id);
  });

  test('Error Handling: Cross-Team Error Recovery', async () => {
    // Test that errors in one team don't cascade to others
    
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'integration-test@wedsync.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Simulate error in Team B (journey creation with invalid data)
    await page.goto('/journeys/builder');
    await page.fill('[data-testid="journey-name"]', ''); // Invalid: empty name
    await page.click('[data-testid="save-journey"]');

    // Verify error is contained and doesn't break navigation
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Verify other team features still work
    await page.goto('/communications');
    await expect(page.locator('[data-testid="communications-header"]')).toBeVisible();

    await page.goto('/admin-dashboard');  
    await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
  });
});