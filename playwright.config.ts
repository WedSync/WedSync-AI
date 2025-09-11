import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WedSync 2.0 E2E testing
 */
export default defineConfig({
  testDir: './tests',
  // Include all Playwright test directories
  testMatch: [
    'tests/e2e/**/*.spec.ts',
    'tests/visual/**/*.spec.ts', 
    'tests/staging/**/*.spec.ts',
    'tests/payments/**/*.spec.ts',
    'tests/playwright/**/*.spec.ts',
    'tests/security/**/*.spec.ts',
    'tests/deployment/**/*.test.ts',
    '__tests__/e2e/**/*.spec.ts',
    '__tests__/accessibility/**/*.spec.ts',
    '__tests__/playwright/**/*.spec.ts',
    'src/__tests__/playwright/**/*.spec.ts',
    // WS-254 Integration Tests
    'src/__tests__/integration/**/*.spec.ts',
    'src/__tests__/integration/catering/**/*.spec.ts'
  ],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit-results.xml' }],
    ['list'],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Maximum time each action can take */
    actionTimeout: 15000,
    
    /* Test timeout */
    navigationTimeout: 30000,
  },

  /* Visual regression testing settings */
  expect: {
    /* Threshold for visual comparison */
    toHaveScreenshot: { 
      threshold: 0.2,
      animations: 'disabled',
    },
    /* Match screenshot options */
    toMatchSnapshot: { 
      threshold: 0.3,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports - WS-153 Mobile Photo Groups */
    {
      name: 'iPhone SE',
      use: { 
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true
      },
    },
    {
      name: 'iPhone 12 Pro',
      use: { 
        ...devices['iPhone 12 Pro'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      },
    },
    {
      name: 'iPhone 14 Pro Max',
      use: { 
        ...devices['iPhone 14 Pro Max'],
        viewport: { width: 428, height: 926 },
        isMobile: true,
        hasTouch: true
      },
    },
    {
      name: 'Pixel 7',
      use: { 
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true
      },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    /* AI Photography Features - Accessibility Testing */
    {
      name: 'accessibility-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        // forcedColors: 'active' // Not supported in this Playwright version
      },
    },

    /* AI Photography Features - Performance Testing */
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Throttle CPU and network for performance testing
        launchOptions: {
          args: ['--cpu-throttling-rate=4', '--network-throttling']
        }
      },
    },

    /* Mobile Performance Testing - WS-153 */
    {
      name: 'mobile-performance-3G',
      use: {
        ...devices['iPhone 12 Pro'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: [
            '--cpu-throttling-rate=4',
            '--network-throttling',
            '--force-device-scale-factor=2'
          ]
        }
      },
    },
    {
      name: 'mobile-performance-slow-3G',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: [
            '--cpu-throttling-rate=6',
            '--network-throttling',
            '--force-device-scale-factor=2'
          ]
        }
      },
    },

    /* Screen Reader Testing */
    {
      name: 'screen-reader',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--force-prefers-reduced-motion']
        }
      },
    },

    /* Deployment Testing - WS-255 Team E */
    {
      name: 'deployment-verification',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.DEPLOYMENT_URL || process.env.TEST_URL || 'http://localhost:3000',
        testDir: './tests/deployment',
        testMatch: ['**/deployment-verification.test.ts'],
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },
    {
      name: 'security-validation',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.DEPLOYMENT_URL || process.env.TEST_URL || 'http://localhost:3000',
        testDir: './tests/deployment',
        testMatch: ['**/security-validation.test.ts'],
        actionTimeout: 30000,
      },
    },
    {
      name: 'wedding-day-critical',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.DEPLOYMENT_URL || process.env.TEST_URL || 'http://localhost:3000',
        testDir: './tests/deployment',
        testMatch: ['**/wedding-day-critical-paths.test.ts'],
        actionTimeout: 60000,
        navigationTimeout: 120000,
      },
    },
    {
      name: 'mobile-deployment-performance',
      use: {
        ...devices['iPhone SE'],
        baseURL: process.env.DEPLOYMENT_URL || process.env.TEST_URL || 'http://localhost:3000',
        testDir: './tests/deployment',
        testMatch: ['**/mobile-performance.test.ts'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        actionTimeout: 45000,
      },
    },
    {
      name: 'rollback-scenarios',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.DEPLOYMENT_URL || process.env.TEST_URL || 'http://localhost:3000',
        testDir: './tests/deployment',
        testMatch: ['**/rollback-scenarios.test.ts'],
        actionTimeout: 90000,
        navigationTimeout: 120000,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 120 * 1000,
  },
});