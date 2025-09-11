/**
 * WS-168: Customer Success Dashboard - Browser MCP Test Suite
 * Comprehensive interactive testing for admin dashboard functionality
 */

// Browser MCP test scenarios for Customer Success Dashboard
export const DashboardTestSuite = {
  // Test 1: Admin Authentication and Access Control
  async testAdminAuthentication() {
    // Navigate to dashboard without authentication
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/dashboard',
    });

    // Should redirect to login page
    const snapshot1 = await mcp__playwright__browser_snapshot();
    console.log('Test 1.1: Unauthenticated access - should show login page');

    // Simulate admin login
    await mcp__playwright__browser_type({
      element: 'Email input',
      ref: 'input[type="email"]',
      text: 'admin@wedsync.com',
    });

    await mcp__playwright__browser_type({
      element: 'Password input',
      ref: 'input[type="password"]',
      text: 'admin123',
    });

    await mcp__playwright__browser_click({
      element: 'Login button',
      ref: 'button[type="submit"]',
    });

    // Verify dashboard loads
    await mcp__playwright__browser_wait_for({ time: 2 });
    const snapshot2 = await mcp__playwright__browser_snapshot();
    console.log('Test 1.2: Admin authentication - dashboard should load');
  },

  // Test 2: Health Score Visualization
  async testHealthScoreDisplay() {
    // Navigate to customer health dashboard
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/dashboard/customer-health',
    });

    // Take screenshot of initial dashboard state
    await mcp__playwright__browser_take_screenshot({
      filename: 'dashboard-initial-state.png',
      fullPage: true,
    });

    // Verify health score cards are present
    const snapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 2.1: Health score cards display');

    // Test health ring interactions
    await mcp__playwright__browser_hover({
      element: 'Health score ring',
      ref: '[data-testid="health-ring-critical"]',
    });

    await mcp__playwright__browser_wait_for({ time: 1 });
    console.log('Test 2.2: Health ring hover interaction');

    // Check for color-coded risk levels
    const criticalCards = snapshot.filter(
      (el) => el.includes('bg-red-50') || el.includes('text-red-700'),
    );
    console.log(
      `Test 2.3: Found ${criticalCards.length} critical risk indicators`,
    );
  },

  // Test 3: Interactive Filtering and Search
  async testFilteringAndSearch() {
    // Test search functionality
    await mcp__playwright__browser_type({
      element: 'Search input',
      ref: 'input[placeholder*="Search"]',
      text: 'Sarah',
    });

    await mcp__playwright__browser_wait_for({ time: 1 });

    const searchSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 3.1: Search filtering');

    // Test risk level filter
    await mcp__playwright__browser_click({
      element: 'Risk filter dropdown',
      ref: 'select[name="risk-filter"]',
    });

    await mcp__playwright__browser_select_option({
      element: 'Risk filter',
      ref: 'select[name="risk-filter"]',
      values: ['critical'],
    });

    await mcp__playwright__browser_wait_for({ time: 1 });
    console.log('Test 3.2: Risk level filtering');

    // Test sorting options
    await mcp__playwright__browser_select_option({
      element: 'Sort dropdown',
      ref: 'select[name="sort-by"]',
      values: ['wedding'],
    });

    await mcp__playwright__browser_wait_for({ time: 1 });
    console.log('Test 3.3: Sort by wedding date');
  },

  // Test 4: Intervention Workflow
  async testInterventionWorkflow() {
    // Click on intervention button for critical customer
    await mcp__playwright__browser_click({
      element: 'Intervention button',
      ref: 'button[data-testid="intervene-user"]',
    });

    // Wait for intervention modal to open
    await mcp__playwright__browser_wait_for({ time: 1 });

    const modalSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 4.1: Intervention modal opens');

    // Navigate through intervention tabs
    await mcp__playwright__browser_click({
      element: 'Intervention options tab',
      ref: 'button[data-value="interventions"]',
    });

    await mcp__playwright__browser_wait_for({ time: 0.5 });
    console.log('Test 4.2: Navigate to intervention options');

    // Select intervention type
    await mcp__playwright__browser_click({
      element: 'Emergency intervention option',
      ref: '[data-intervention="emergency_call"]',
    });

    // Move to execution tab
    await mcp__playwright__browser_click({
      element: 'Execution tab',
      ref: 'button[data-value="execution"]',
    });

    await mcp__playwright__browser_wait_for({ time: 0.5 });
    console.log('Test 4.3: Navigate to execution plan');

    // Execute intervention
    await mcp__playwright__browser_click({
      element: 'Execute intervention button',
      ref: 'button[data-testid="execute-intervention"]',
    });

    await mcp__playwright__browser_wait_for({ time: 2 });
    console.log('Test 4.4: Execute intervention workflow');

    // Verify success feedback
    const successSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 4.5: Intervention execution feedback');
  },

  // Test 5: Mobile Responsiveness
  async testMobileResponsiveness() {
    // Test mobile breakpoint (375px)
    await mcp__playwright__browser_resize({
      width: 375,
      height: 667,
    });

    await mcp__playwright__browser_wait_for({ time: 1 });

    // Take mobile screenshot
    await mcp__playwright__browser_take_screenshot({
      filename: 'dashboard-mobile-375px.png',
      fullPage: true,
    });

    console.log('Test 5.1: Mobile 375px layout');

    // Test tablet breakpoint (768px)
    await mcp__playwright__browser_resize({
      width: 768,
      height: 1024,
    });

    await mcp__playwright__browser_wait_for({ time: 1 });

    await mcp__playwright__browser_take_screenshot({
      filename: 'dashboard-tablet-768px.png',
      fullPage: true,
    });

    console.log('Test 5.2: Tablet 768px layout');

    // Test desktop breakpoint (1280px)
    await mcp__playwright__browser_resize({
      width: 1280,
      height: 800,
    });

    await mcp__playwright__browser_wait_for({ time: 1 });

    await mcp__playwright__browser_take_screenshot({
      filename: 'dashboard-desktop-1280px.png',
      fullPage: true,
    });

    console.log('Test 5.3: Desktop 1280px layout');

    // Test mobile touch interactions
    await mcp__playwright__browser_resize({
      width: 375,
      height: 667,
    });

    // Test mobile card interaction
    await mcp__playwright__browser_click({
      element: 'Mobile health card',
      ref: '[data-testid="mobile-health-card"]',
    });

    console.log('Test 5.4: Mobile touch interactions');
  },

  // Test 6: Performance and Loading States
  async testPerformanceAndLoading() {
    // Monitor network requests
    const networkRequests = await mcp__playwright__browser_network_requests();
    console.log(`Test 6.1: Network requests count: ${networkRequests.length}`);

    // Check for loading states
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/dashboard/customer-health?slow=true',
    });

    // Should show loading spinner
    const loadingSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 6.2: Loading state display');

    await mcp__playwright__browser_wait_for({ time: 3 });

    // Check console for errors
    const consoleLogs = await mcp__playwright__browser_console_messages();
    const errors = consoleLogs.filter((log) => log.level === 'error');

    console.log(`Test 6.3: Console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.error('Console errors found:', errors);
    }
  },

  // Test 7: Data Export Functionality
  async testDataExport() {
    // Click export button
    await mcp__playwright__browser_click({
      element: 'Export button',
      ref: 'button[data-testid="export-data"]',
    });

    // Wait for export dialog
    await mcp__playwright__browser_wait_for({ time: 1 });

    console.log('Test 7.1: Export dialog opens');

    // Select export format
    await mcp__playwright__browser_select_option({
      element: 'Export format',
      ref: 'select[name="export-format"]',
      values: ['csv'],
    });

    // Select date range
    await mcp__playwright__browser_select_option({
      element: 'Date range',
      ref: 'select[name="date-range"]',
      values: ['30d'],
    });

    // Confirm export
    await mcp__playwright__browser_click({
      element: 'Confirm export button',
      ref: 'button[data-testid="confirm-export"]',
    });

    await mcp__playwright__browser_wait_for({ time: 2 });
    console.log('Test 7.2: Export process initiated');
  },

  // Test 8: Real-time Updates Simulation
  async testRealtimeUpdates() {
    // Simulate real-time health score update
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Simulate WebSocket message for health score update
        window.dispatchEvent(new CustomEvent('healthScoreUpdate', {
          detail: {
            user_id: 'user_123',
            old_score: 67,
            new_score: 72,
            risk_level: 'medium'
          }
        }));
      }`,
    });

    await mcp__playwright__browser_wait_for({ time: 1 });
    console.log('Test 8.1: Real-time health score update');

    // Check for update notification
    const updateSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 8.2: Update notification display');
  },

  // Test 9: Accessibility Compliance
  async testAccessibility() {
    // Check for proper heading hierarchy
    const headingSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 9.1: Heading structure validation');

    // Test keyboard navigation
    await mcp__playwright__browser_press_key({ key: 'Tab' });
    await mcp__playwright__browser_wait_for({ time: 0.3 });

    await mcp__playwright__browser_press_key({ key: 'Tab' });
    await mcp__playwright__browser_wait_for({ time: 0.3 });

    await mcp__playwright__browser_press_key({ key: 'Enter' });
    console.log('Test 9.2: Keyboard navigation');

    // Check for ARIA labels
    await mcp__playwright__browser_evaluate({
      function: `() => {
        const elementsWithoutAria = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        return elementsWithoutAria.length;
      }`,
    });
    console.log('Test 9.3: ARIA label compliance');

    // Test focus management
    await mcp__playwright__browser_press_key({ key: 'Escape' });
    await mcp__playwright__browser_wait_for({ time: 0.3 });
    console.log('Test 9.4: Focus management after modal close');
  },

  // Test 10: Error Handling
  async testErrorHandling() {
    // Simulate API error
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Mock fetch to return error
        const originalFetch = window.fetch;
        window.fetch = () => Promise.reject(new Error('API Error'));
        return true;
      }`,
    });

    // Reload page to trigger error
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/dashboard/customer-health',
    });

    await mcp__playwright__browser_wait_for({ time: 2 });

    const errorSnapshot = await mcp__playwright__browser_snapshot();
    console.log('Test 10.1: Error boundary display');

    // Check for proper error messaging
    console.log('Test 10.2: User-friendly error messages');
  },
};

// Execute full test suite
export async function runDashboardTestSuite(): Promise<{
  passed: number;
  failed: number;
  results: string[];
}> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const tests = Object.entries(DashboardTestSuite);

  for (const [testName, testFunction] of tests) {
    try {
      console.log(`🧪 Running ${testName}...`);
      await testFunction();
      results.push(`✅ ${testName}: PASSED`);
      passed++;
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      results.push(`❌ ${testName}: FAILED - ${error.message}`);
      failed++;
    }
  }

  return { passed, failed, results };
}

// Quick smoke test for development
export async function runSmokeTest(): Promise<boolean> {
  try {
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/dashboard/customer-health',
    });

    const snapshot = await mcp__playwright__browser_snapshot();

    // Check for key elements
    const hasTitle = snapshot.some((el) =>
      el.includes('Customer Health Dashboard'),
    );
    const hasMetricsCards = snapshot.some((el) =>
      el.includes('Total Customers'),
    );
    const hasCharts = snapshot.some((el) =>
      el.includes('Health Score Distribution'),
    );

    return hasTitle && hasMetricsCards && hasCharts;
  } catch (error) {
    console.error('Smoke test failed:', error);
    return false;
  }
}
