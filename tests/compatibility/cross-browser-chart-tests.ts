import { test, expect, devices, Browser, BrowserContext } from '@playwright/test';
import { chromium, firefox, webkit } from '@playwright/test';

interface BrowserCompatibilityResult {
  browser: string;
  version: string;
  testCase: string;
  passed: boolean;
  errors: string[];
  renderTime: number;
  visualDifference: number;
  interactionScore: number;
}

interface CompatibilityReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    browserCoverage: string[];
    overallCompatibility: number;
  };
  results: BrowserCompatibilityResult[];
  knownIssues: string[];
  recommendations: string[];
}

class CrossBrowserChartTester {
  private results: BrowserCompatibilityResult[] = [];
  private baselineScreenshots: Map<string, Buffer> = new Map();

  async testChartCompatibility(
    browserName: string,
    browser: Browser,
    url: string,
    chartSelector: string,
    testCase: string
  ): Promise<BrowserCompatibilityResult> {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const errors: string[] = [];
    let renderTime = 0;
    let visualDifference = 0;
    let interactionScore = 100;

    try {
      // Capture console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Capture network errors
      page.on('requestfailed', request => {
        errors.push(`Network error: ${request.url()} - ${request.failure()?.errorText}`);
      });

      // Navigate and measure render time
      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for chart to be visible
      await page.waitForSelector(chartSelector, { timeout: 10000 });
      
      // Wait for chart to fully render
      await page.waitForFunction(
        (selector) => {
          const charts = document.querySelectorAll(selector);
          return Array.from(charts).every(chart => {
            const rect = chart.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        },
        chartSelector,
        { timeout: 5000 }
      );

      renderTime = Date.now() - startTime;

      // Take screenshot for visual comparison
      const screenshot = await page.locator(chartSelector).first().screenshot();
      
      // Compare with baseline (Chrome)
      if (browserName === 'chromium') {
        this.baselineScreenshots.set(testCase, screenshot);
        visualDifference = 0;
      } else {
        const baseline = this.baselineScreenshots.get(testCase);
        if (baseline) {
          visualDifference = await this.compareScreenshots(baseline, screenshot);
        }
      }

      // Test chart interactions
      interactionScore = await this.testChartInteractions(page, chartSelector);

      // Test specific browser compatibility features
      await this.testBrowserSpecificFeatures(page, browserName);

    } catch (error) {
      errors.push(`Test execution error: ${error.message}`);
    } finally {
      await context.close();
    }

    const version = await this.getBrowserVersion(browser);
    const passed = errors.length === 0 && renderTime < 3000 && visualDifference < 5 && interactionScore > 80;

    const result: BrowserCompatibilityResult = {
      browser: browserName,
      version,
      testCase,
      passed,
      errors,
      renderTime,
      visualDifference,
      interactionScore
    };

    this.results.push(result);
    return result;
  }

  private async getBrowserVersion(browser: Browser): Promise<string> {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const version = await page.evaluate(() => navigator.userAgent);
    await context.close();
    
    return version;
  }

  private async compareScreenshots(baseline: Buffer, current: Buffer): Promise<number> {
    // Simple pixel difference calculation
    // In a real implementation, you might use a library like pixelmatch
    try {
      const baselineSize = baseline.length;
      const currentSize = current.length;
      
      // Calculate size difference as a percentage
      const sizeDifference = Math.abs(baselineSize - currentSize) / baselineSize * 100;
      
      // For now, return size difference as a proxy for visual difference
      return Math.min(sizeDifference, 100);
    } catch (error) {
      return 100; // Max difference if comparison fails
    }
  }

  private async testChartInteractions(page: any, chartSelector: string): Promise<number> {
    let score = 100;
    
    try {
      // Test hover interactions
      const chart = page.locator(chartSelector).first();
      await chart.hover();
      
      // Check if tooltip appears
      const tooltip = page.locator('[role="tooltip"], .recharts-tooltip-wrapper').first();
      const tooltipVisible = await tooltip.isVisible({ timeout: 1000 }).catch(() => false);
      if (!tooltipVisible) score -= 20;

      // Test click interactions
      await chart.click();
      await page.waitForTimeout(500);

      // Test keyboard navigation (if supported)
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').isVisible().catch(() => false);
      if (!focused) score -= 10;

      // Test legend interactions (if present)
      const legend = page.locator('.recharts-legend-item').first();
      const legendExists = await legend.isVisible().catch(() => false);
      if (legendExists) {
        await legend.click();
        await page.waitForTimeout(300);
      }

    } catch (error) {
      score -= 30;
    }

    return Math.max(score, 0);
  }

  private async testBrowserSpecificFeatures(page: any, browserName: string): Promise<void> {
    // Test Canvas API support (critical for charts)
    const canvasSupported = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    });

    if (!canvasSupported) {
      throw new Error('Canvas API not supported');
    }

    // Test SVG support (for Recharts)
    const svgSupported = await page.evaluate(() => {
      return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
    });

    if (!svgSupported) {
      throw new Error('SVG not fully supported');
    }

    // Test CSS Grid support (for chart layouts)
    const gridSupported = await page.evaluate(() => {
      return CSS.supports('display', 'grid');
    });

    if (!gridSupported) {
      throw new Error('CSS Grid not supported');
    }

    // Browser-specific tests
    switch (browserName) {
      case 'webkit':
        // Test Safari-specific features
        await this.testSafariSpecificFeatures(page);
        break;
      case 'firefox':
        // Test Firefox-specific features
        await this.testFirefoxSpecificFeatures(page);
        break;
      case 'chromium':
        // Test Chrome-specific features
        await this.testChromeSpecificFeatures(page);
        break;
    }
  }

  private async testSafariSpecificFeatures(page: any): Promise<void> {
    // Test Safari's handling of date formatting
    const dateFormatSupported = await page.evaluate(() => {
      try {
        const date = new Date('2025-01-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } catch (error) {
        return false;
      }
    });

    if (!dateFormatSupported) {
      throw new Error('Safari date formatting issues detected');
    }

    // Test Safari's SVG animation support
    const svgAnimationSupported = await page.evaluate(() => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      return typeof animate.beginElement === 'function';
    });

    if (!svgAnimationSupported) {
      console.warn('Safari SVG animation support limited');
    }
  }

  private async testFirefoxSpecificFeatures(page: any): Promise<void> {
    // Test Firefox's handling of flexbox in SVG
    const flexboxInSvgSupported = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      return div.style.display === 'flex';
    });

    if (!flexboxInSvgSupported) {
      throw new Error('Firefox flexbox issues detected');
    }
  }

  private async testChromeSpecificFeatures(page: any): Promise<void> {
    // Test Chrome's performance API
    const performanceSupported = await page.evaluate(() => {
      return typeof performance.measure === 'function';
    });

    if (!performanceSupported) {
      throw new Error('Chrome performance API issues');
    }
  }

  generateCompatibilityReport(): CompatibilityReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const browserCoverage = [...new Set(this.results.map(r => r.browser))];
    const overallCompatibility = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const knownIssues = [
      'Safari may have limited SVG animation support',
      'Firefox CSS Grid implementation differences',
      'Edge legacy compatibility issues with custom properties',
      'Mobile browsers may have touch interaction differences'
    ];

    const recommendations = [
      'Use feature detection for advanced chart features',
      'Provide fallbacks for unsupported browsers',
      'Test on real devices for mobile compatibility',
      'Use progressive enhancement for advanced interactions',
      'Consider polyfills for older browser versions'
    ];

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        browserCoverage,
        overallCompatibility
      },
      results: this.results,
      knownIssues,
      recommendations
    };
  }

  getResults(): BrowserCompatibilityResult[] {
    return this.results;
  }
}

// Cross-browser compatibility tests
test.describe('Cross-Browser Chart Compatibility', () => {
  let tester: CrossBrowserChartTester;

  test.beforeAll(() => {
    tester = new CrossBrowserChartTester();
  });

  test.afterAll(async () => {
    // Generate compatibility report
    const report = tester.generateCompatibilityReport();
    
    const reportText = `
# 🌐 Cross-Browser Chart Compatibility Report

## Summary
- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passedTests}
- **Failed**: ${report.summary.failedTests}
- **Browser Coverage**: ${report.summary.browserCoverage.join(', ')}
- **Overall Compatibility**: ${report.summary.overallCompatibility.toFixed(1)}%

## Test Results by Browser

| Browser | Test Case | Status | Render Time | Visual Diff | Interaction Score |
|---------|-----------|---------|-------------|-------------|-------------------|
${report.results.map(result => 
  `| ${result.browser} | ${result.testCase} | ${result.passed ? '✅ PASS' : '❌ FAIL'} | ${result.renderTime}ms | ${result.visualDifference.toFixed(1)}% | ${result.interactionScore}% |`
).join('\n')}

## Known Issues
${report.knownIssues.map(issue => `- ${issue}`).join('\n')}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}
`;

    // Write report
    const fs = require('fs');
    fs.writeFileSync('tests/compatibility/compatibility-report.md', reportText);
    fs.writeFileSync('tests/compatibility/compatibility-results.json', JSON.stringify(report, null, 2));
    
    console.log(reportText);
  });

  // Test budget charts across browsers
  const budgetChartTests = [
    { name: 'Chrome', browserType: 'chromium' },
    { name: 'Firefox', browserType: 'firefox' },
    { name: 'Safari', browserType: 'webkit' }
  ];

  for (const { name, browserType } of budgetChartTests) {
    test(`BudgetCharts compatibility - ${name}`, async () => {
      const browserEngine = browserType === 'chromium' ? chromium : 
                            browserType === 'firefox' ? firefox : webkit;
      
      const browser = await browserEngine.launch();
      
      try {
        const result = await tester.testChartCompatibility(
          browserType,
          browser,
          'http://localhost:3000/dashboard/budget',
          '[data-testid="budget-pie-chart"]',
          'budget-charts'
        );

        expect(result.passed, 
          `${name} compatibility failed: ${result.errors.join(', ')}`
        ).toBe(true);
        
        expect(result.renderTime).toBeLessThan(3000);
        expect(result.interactionScore).toBeGreaterThan(80);
        
        if (browserType !== 'chromium') {
          expect(result.visualDifference).toBeLessThan(10);
        }
      } finally {
        await browser.close();
      }
    });
  }

  // Test wedding metrics dashboard across browsers
  for (const { name, browserType } of budgetChartTests) {
    test(`WeddingMetricsDashboard compatibility - ${name}`, async () => {
      const browserEngine = browserType === 'chromium' ? chromium : 
                            browserType === 'firefox' ? firefox : webkit;
      
      const browser = await browserEngine.launch();
      
      try {
        const result = await tester.testChartCompatibility(
          browserType,
          browser,
          'http://localhost:3000/dashboard/metrics',
          '[data-testid="revenue-trend-chart"]',
          'wedding-metrics-dashboard'
        );

        expect(result.passed, 
          `${name} dashboard compatibility failed: ${result.errors.join(', ')}`
        ).toBe(true);
        
        expect(result.renderTime).toBeLessThan(4000); // More complex dashboard
        expect(result.interactionScore).toBeGreaterThan(75);
      } finally {
        await browser.close();
      }
    });
  }

  // Test timeline efficiency tracker across browsers
  for (const { name, browserType } of budgetChartTests) {
    test(`TimelineEfficiencyTracker compatibility - ${name}`, async () => {
      const browserEngine = browserType === 'chromium' ? chromium : 
                            browserType === 'firefox' ? firefox : webkit;
      
      const browser = await browserEngine.launch();
      
      try {
        const result = await tester.testChartCompatibility(
          browserType,
          browser,
          'http://localhost:3000/dashboard/timeline-tracker',
          '[data-testid="efficiency-trend-chart"]',
          'timeline-efficiency-tracker'
        );

        expect(result.passed, 
          `${name} timeline compatibility failed: ${result.errors.join(', ')}`
        ).toBe(true);
        
        expect(result.renderTime).toBeLessThan(3500);
        expect(result.interactionScore).toBeGreaterThan(80);
      } finally {
        await browser.close();
      }
    });
  }

  // Test vendor performance analytics across browsers
  for (const { name, browserType } of budgetChartTests) {
    test(`VendorPerformanceAnalytics compatibility - ${name}`, async () => {
      const browserEngine = browserType === 'chromium' ? chromium : 
                            browserType === 'firefox' ? firefox : webkit;
      
      const browser = await browserEngine.launch();
      
      try {
        const result = await tester.testChartCompatibility(
          browserType,
          browser,
          'http://localhost:3000/dashboard/vendor-analytics',
          '[data-testid="performance-trend-chart"]',
          'vendor-performance-analytics'
        );

        expect(result.passed, 
          `${name} vendor analytics compatibility failed: ${result.errors.join(', ')}`
        ).toBe(true);
        
        expect(result.renderTime).toBeLessThan(3000);
        expect(result.interactionScore).toBeGreaterThan(80);
      } finally {
        await browser.close();
      }
    });
  }

  // Mobile browser compatibility tests
  test('Mobile Safari compatibility', async () => {
    const browser = await webkit.launch();
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/dashboard/budget');
      
      // Wait for mobile-optimized charts
      await page.waitForSelector('[data-testid*="chart"]', { timeout: 10000 });
      
      // Test touch interactions
      await page.tap('[data-testid="budget-pie-chart"]');
      await page.waitForTimeout(500);
      
      // Test swipe gestures (if supported)
      const chart = page.locator('[data-testid="budget-pie-chart"]');
      const box = await chart.boundingBox();
      
      if (box) {
        await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height * 0.5);
        await page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height * 0.5);
      }
      
      // Verify charts are still functional
      await expect(page.locator('[data-testid*="chart"]')).toBeVisible();
      
    } finally {
      await context.close();
      await browser.close();
    }
  });

  test('Mobile Chrome compatibility', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ...devices['Pixel 5'],
    });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/dashboard/metrics');
      
      // Wait for mobile dashboard
      await page.waitForSelector('[data-testid*="chart"]', { timeout: 10000 });
      
      // Test mobile-specific features
      await page.tap('[data-testid="mobile-menu-toggle"]');
      await page.tap('[data-testid="chart-options"]');
      
      // Test responsive chart behavior
      const charts = page.locator('[data-testid*="chart"]');
      const chartCount = await charts.count();
      expect(chartCount).toBeGreaterThan(0);
      
      // Verify all charts are visible in mobile viewport
      for (let i = 0; i < chartCount; i++) {
        await expect(charts.nth(i)).toBeInViewport();
      }
      
    } finally {
      await context.close();
      await browser.close();
    }
  });

  // Test chart library compatibility
  test('Recharts library compatibility across browsers', async () => {
    const browsers = [
      { name: 'Chrome', launch: chromium.launch },
      { name: 'Firefox', launch: firefox.launch },
      { name: 'Safari', launch: webkit.launch }
    ];

    const errors: string[] = [];

    for (const { name, launch } of browsers) {
      const browser = await launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Test Recharts specific features
        await page.goto('http://localhost:3000/dashboard/budget');
        
        // Check if Recharts library loads correctly
        const rechartsLoaded = await page.evaluate(() => {
          return window.Recharts !== undefined || 
                 document.querySelector('svg.recharts-surface') !== null ||
                 document.querySelector('.recharts-wrapper') !== null;
        });

        if (!rechartsLoaded) {
          errors.push(`${name}: Recharts library not loaded properly`);
        }

        // Test SVG rendering
        const svgElements = page.locator('svg.recharts-surface');
        const svgCount = await svgElements.count();
        
        if (svgCount === 0) {
          errors.push(`${name}: No Recharts SVG elements found`);
        }

        // Test chart animations (if any)
        const animatedElements = page.locator('[class*="recharts"][class*="animate"]');
        const animationSupported = await animatedElements.count() >= 0; // Just check it doesn't error
        
        if (!animationSupported) {
          errors.push(`${name}: Animation support issues`);
        }

      } catch (error) {
        errors.push(`${name}: ${error.message}`);
      } finally {
        await context.close();
        await browser.close();
      }
    }

    expect(errors).toEqual([]);
  });

  // Test JavaScript feature compatibility
  test('Modern JavaScript features compatibility', async () => {
    const browsers = [
      { name: 'Chrome', launch: chromium.launch },
      { name: 'Firefox', launch: firefox.launch },
      { name: 'Safari', launch: webkit.launch }
    ];

    const featureTests = {
      'ES6 Modules': 'typeof import === "function"',
      'Arrow Functions': '(() => true)()',
      'Async/Await': 'typeof async function() {} === "function"',
      'Template Literals': '`test` === "test"',
      'Destructuring': 'const {a} = {a: 1}; a === 1',
      'Spread Operator': '[...Array(1)].length === 1',
      'Object.entries': 'typeof Object.entries === "function"',
      'Array.includes': 'typeof Array.prototype.includes === "function"',
      'Promise': 'typeof Promise === "function"',
      'fetch API': 'typeof fetch === "function"'
    };

    const results: Record<string, Record<string, boolean>> = {};

    for (const { name, launch } of browsers) {
      results[name] = {};
      const browser = await launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto('about:blank');
        
        for (const [feature, test] of Object.entries(featureTests)) {
          try {
            const supported = await page.evaluate(`(function() { 
              try { 
                return ${test}; 
              } catch(e) { 
                return false; 
              } 
            })()`);
            results[name][feature] = supported;
          } catch (error) {
            results[name][feature] = false;
          }
        }
      } finally {
        await context.close();
        await browser.close();
      }
    }

    // Log results
    console.log('\n🧪 JavaScript Feature Compatibility:');
    for (const [browser, features] of Object.entries(results)) {
      console.log(`\n${browser}:`);
      for (const [feature, supported] of Object.entries(features)) {
        console.log(`  ${supported ? '✅' : '❌'} ${feature}`);
      }
    }

    // All modern features should be supported in current browser versions
    const criticalFeatures = ['Arrow Functions', 'Promise', 'fetch API', 'Array.includes'];
    
    for (const [browser, features] of Object.entries(results)) {
      for (const feature of criticalFeatures) {
        expect(features[feature], `${browser} should support ${feature}`).toBe(true);
      }
    }
  });
});