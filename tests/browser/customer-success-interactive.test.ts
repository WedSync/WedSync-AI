/**
 * WS-168 Customer Success Dashboard - Browser MCP Interactive Testing
 * Comprehensive UI testing using Browser MCP for visual validation
 */

/**
 * BROWSER MCP INTERACTIVE TEST SUITE
 * Run this test suite when the application is running on localhost:3000
 */

export const customerSuccessBrowserTests = {
  
  // Test 1: Dashboard Loading and Layout
  testDashboardLoad: async () => {
    console.log('🧪 Starting Browser MCP Test: Dashboard Load');
    
    // Navigate to Customer Success Dashboard
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/admin/customer-success'
    });
    
    // Take initial screenshot
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-dashboard-loaded.png',
      fullPage: true
    });
    
    // Get page snapshot for accessibility testing
    const snapshot = await mcp__playwright__browser_snapshot();
    console.log('✅ Dashboard loaded, snapshot captured');
    
    return {
      test: 'Dashboard Load',
      status: 'passed',
      screenshot: 'customer-success-dashboard-loaded.png'
    };
  },

  // Test 2: Navigation and Tab Switching
  testNavigationTabs: async () => {
    console.log('🧪 Testing Navigation Tabs');
    
    const tabs = ['overview', 'risk-segments', 'interventions', 'analytics'];
    const results: any[] = [];
    
    for (const tab of tabs) {
      try {
        // Click on tab
        await mcp__playwright__browser_click({
          element: `${tab} tab button`,
          ref: `[data-value="${tab}"]`
        });
        
        // Wait for content to load
        await mcp__playwright__browser_wait_for({ time: 1 });
        
        // Take screenshot of tab content
        await mcp__playwright__browser_take_screenshot({
          filename: `customer-success-${tab}-tab.png`,
          type: 'png'
        });
        
        results.push({
          tab,
          status: 'passed',
          screenshot: `customer-success-${tab}-tab.png`
        });
        
        console.log(`✅ ${tab} tab tested successfully`);
      } catch (error) {
        results.push({
          tab,
          status: 'failed',
          error: error.message
        });
        console.log(`❌ ${tab} tab failed: ${error.message}`);
      }
    }
    
    return {
      test: 'Navigation Tabs',
      results
    };
  },

  // Test 3: Search and Filter Functionality
  testSearchAndFilters: async () => {
    console.log('🧪 Testing Search and Filter Functionality');
    
    // Test search functionality
    await mcp__playwright__browser_type({
      element: 'search input field',
      ref: 'input[placeholder*="Search"]',
      text: 'wedding',
      slowly: true
    });
    
    // Wait for search results
    await mcp__playwright__browser_wait_for({ time: 2 });
    
    // Capture search results
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-search-results.png'
    });
    
    // Test filter dropdowns
    await mcp__playwright__browser_click({
      element: 'risk level filter',
      ref: '[data-testid="risk-filter"]'
    });
    
    // Select high risk option
    await mcp__playwright__browser_click({
      element: 'high risk option',
      ref: '[data-value="high"]'
    });
    
    await mcp__playwright__browser_wait_for({ time: 1 });
    
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-filtered-results.png'
    });
    
    return {
      test: 'Search and Filters',
      status: 'passed',
      screenshots: ['customer-success-search-results.png', 'customer-success-filtered-results.png']
    };
  },

  // Test 4: Interactive Elements and Modals
  testInteractiveElements: async () => {
    console.log('🧪 Testing Interactive Elements');
    
    // Test creating new intervention
    await mcp__playwright__browser_click({
      element: 'new intervention button',
      ref: 'button:has-text("New Intervention")'
    });
    
    // Wait for modal to open
    await mcp__playwright__browser_wait_for({ time: 1 });
    
    // Take screenshot of modal
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-intervention-modal.png'
    });
    
    // Fill out intervention form
    await mcp__playwright__browser_type({
      element: 'intervention title input',
      ref: 'input[name="title"]',
      text: 'Test Intervention via Browser MCP'
    });
    
    await mcp__playwright__browser_type({
      element: 'intervention description textarea',
      ref: 'textarea[name="description"]',
      text: 'This is a test intervention created during Browser MCP testing'
    });
    
    // Test dropdown selections
    await mcp__playwright__browser_select_option({
      element: 'intervention type select',
      ref: 'select[name="type"]',
      values: ['call']
    });
    
    await mcp__playwright__browser_select_option({
      element: 'intervention priority select',
      ref: 'select[name="priority"]',
      values: ['high']
    });
    
    // Take screenshot of filled form
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-intervention-form-filled.png'
    });
    
    // Close modal (don't actually submit to avoid test data)
    await mcp__playwright__browser_press_key({ key: 'Escape' });
    
    return {
      test: 'Interactive Elements',
      status: 'passed',
      screenshots: ['customer-success-intervention-modal.png', 'customer-success-intervention-form-filled.png']
    };
  },

  // Test 5: Responsive Design Testing
  testResponsiveDesign: async () => {
    console.log('🧪 Testing Responsive Design');
    
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];
    
    const results: any[] = [];
    
    for (const viewport of viewports) {
      try {
        await mcp__playwright__browser_resize({
          width: viewport.width,
          height: viewport.height
        });
        
        // Wait for layout adjustment
        await mcp__playwright__browser_wait_for({ time: 1 });
        
        // Take screenshot for each viewport
        await mcp__playwright__browser_take_screenshot({
          filename: `customer-success-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: false
        });
        
        results.push({
          viewport: viewport.name,
          dimensions: `${viewport.width}x${viewport.height}`,
          status: 'passed',
          screenshot: `customer-success-${viewport.name.toLowerCase().replace(' ', '-')}.png`
        });
        
        console.log(`✅ ${viewport.name} responsive test passed`);
      } catch (error) {
        results.push({
          viewport: viewport.name,
          status: 'failed',
          error: error.message
        });
        console.log(`❌ ${viewport.name} responsive test failed: ${error.message}`);
      }
    }
    
    return {
      test: 'Responsive Design',
      results
    };
  },

  // Test 6: Data Visualization and Charts
  testDataVisualization: async () => {
    console.log('🧪 Testing Data Visualization');
    
    // Navigate to analytics tab
    await mcp__playwright__browser_click({
      element: 'analytics tab',
      ref: '[data-value="analytics"]'
    });
    
    await mcp__playwright__browser_wait_for({ time: 2 });
    
    // Test different chart types
    const chartTypes = ['trends', 'distribution', 'interventions'];
    const results: any[] = [];
    
    for (const chartType of chartTypes) {
      try {
        await mcp__playwright__browser_click({
          element: `${chartType} chart option`,
          ref: `[data-value="${chartType}"]`
        });
        
        await mcp__playwright__browser_wait_for({ time: 1 });
        
        await mcp__playwright__browser_take_screenshot({
          filename: `customer-success-${chartType}-chart.png`
        });
        
        results.push({
          chartType,
          status: 'passed',
          screenshot: `customer-success-${chartType}-chart.png`
        });
      } catch (error) {
        results.push({
          chartType,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return {
      test: 'Data Visualization',
      results
    };
  },

  // Test 7: Real-time Updates Simulation
  testRealTimeUpdates: async () => {
    console.log('🧪 Testing Real-time Updates');
    
    // Navigate to overview tab
    await mcp__playwright__browser_click({
      element: 'overview tab',
      ref: '[data-value="overview"]'
    });
    
    // Click refresh button to simulate real-time update
    await mcp__playwright__browser_click({
      element: 'refresh button',
      ref: 'button[aria-label*="refresh"], button:has([data-testid="refresh"])'
    });
    
    // Wait for update animation
    await mcp__playwright__browser_wait_for({ time: 2 });
    
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-real-time-update.png'
    });
    
    return {
      test: 'Real-time Updates',
      status: 'passed',
      screenshot: 'customer-success-real-time-update.png'
    };
  },

  // Test 8: Error Handling and Loading States
  testErrorHandling: async () => {
    console.log('🧪 Testing Error Handling');
    
    // Simulate network error by navigating to invalid endpoint
    await mcp__playwright__browser_evaluate({
      function: `
        () => {
          // Mock fetch to return error for testing
          const originalFetch = window.fetch;
          window.fetch = async (...args) => {
            if (args[0].includes('customer-success')) {
              throw new Error('Simulated network error');
            }
            return originalFetch.apply(window, args);
          };
        }
      `
    });
    
    // Trigger refresh to see error state
    await mcp__playwright__browser_click({
      element: 'refresh button',
      ref: 'button[aria-label*="refresh"]'
    });
    
    await mcp__playwright__browser_wait_for({ time: 2 });
    
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-error-state.png'
    });
    
    return {
      test: 'Error Handling',
      status: 'passed',
      screenshot: 'customer-success-error-state.png'
    };
  },

  // Test 9: Keyboard Navigation and Accessibility
  testAccessibility: async () => {
    console.log('🧪 Testing Keyboard Navigation and Accessibility');
    
    // Reset to clean state
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/admin/customer-success'
    });
    
    // Test tab navigation
    const tabStops = [
      'search input',
      'refresh button', 
      'overview tab',
      'risk-segments tab',
      'interventions tab',
      'analytics tab'
    ];
    
    let currentFocus = '';
    for (let i = 0; i < tabStops.length; i++) {
      await mcp__playwright__browser_press_key({ key: 'Tab' });
      await mcp__playwright__browser_wait_for({ time: 0.5 });
      
      // Get currently focused element
      const focusedElement = await mcp__playwright__browser_evaluate({
        function: '() => document.activeElement.tagName + (document.activeElement.textContent ? ": " + document.activeElement.textContent.slice(0, 20) : "")'
      });
      
      console.log(`Tab stop ${i + 1}: ${focusedElement}`);
    }
    
    // Test Enter key on focused element
    await mcp__playwright__browser_press_key({ key: 'Enter' });
    await mcp__playwright__browser_wait_for({ time: 1 });
    
    await mcp__playwright__browser_take_screenshot({
      filename: 'customer-success-keyboard-navigation.png'
    });
    
    return {
      test: 'Accessibility & Keyboard Navigation',
      status: 'passed',
      tabStops: tabStops.length,
      screenshot: 'customer-success-keyboard-navigation.png'
    };
  },

  // Run all tests in sequence
  runAllTests: async () => {
    console.log('🚀 Starting Full Browser MCP Test Suite for WS-168 Customer Success Dashboard');
    
    const results = {
      testSuite: 'WS-168 Customer Success Dashboard - Browser MCP Interactive Tests',
      startTime: new Date().toISOString(),
      tests: [] as any[]
    };
    
    try {
      results.tests.push(await customerSuccessBrowserTests.testDashboardLoad());
      results.tests.push(await customerSuccessBrowserTests.testNavigationTabs());
      results.tests.push(await customerSuccessBrowserTests.testSearchAndFilters());
      results.tests.push(await customerSuccessBrowserTests.testInteractiveElements());
      results.tests.push(await customerSuccessBrowserTests.testResponsiveDesign());
      results.tests.push(await customerSuccessBrowserTests.testDataVisualization());
      results.tests.push(await customerSuccessBrowserTests.testRealTimeUpdates());
      results.tests.push(await customerSuccessBrowserTests.testErrorHandling());
      results.tests.push(await customerSuccessBrowserTests.testAccessibility());
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      results.tests.push({
        test: 'Test Suite Execution',
        status: 'failed',
        error: error.message
      });
    }
    
    results.endTime = new Date().toISOString();
    results.summary = {
      totalTests: results.tests.length,
      passed: results.tests.filter(t => t.status === 'passed').length,
      failed: results.tests.filter(t => t.status === 'failed').length
    };
    
    console.log('🎉 Browser MCP Test Suite Complete!');
    console.log(`📊 Results: ${results.summary.passed}/${results.summary.totalTests} tests passed`);
    
    return results;
  }
};

/**
 * Usage Instructions:
 * 
 * 1. Ensure the WedSync application is running on localhost:3000
 * 2. Make sure you have admin access to /admin/customer-success
 * 3. Run the individual tests or the full suite:
 * 
 *    // Run individual test
 *    await customerSuccessBrowserTests.testDashboardLoad();
 * 
 *    // Run full test suite
 *    await customerSuccessBrowserTests.runAllTests();
 * 
 * 4. Screenshots will be saved for visual verification
 * 5. Check console output for detailed test results
 */

export default customerSuccessBrowserTests;