import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for WS-057 Round 2 RSVP Testing
 * Optimized for comprehensive E2E testing with visual regression support
 */

export default defineConfig({
  testDir: './tests/e2e/rsvp-round2',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter configuration for comprehensive test reporting */
  reporter: [
    ['html', { outputFolder: 'playwright-report/rsvp-round2' }],
    ['json', { outputFile: 'test-results/rsvp-round2-results.json' }],
    ['junit', { outputFile: 'test-results/rsvp-round2-junit.xml' }],
    ['github'] // For GitHub Actions integration
  ],
  
  /* Shared settings for all tests */
  use: {
    /* Base URL for testing */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure for debugging */
    screenshot: 'only-on-failure',
    
    /* Video recording for critical test failures */
    video: 'retain-on-failure',
    
    /* Ignore HTTPS errors for local testing */
    ignoreHTTPSErrors: true,
    
    /* Extended timeout for performance testing */
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  
  /* Configure test timeout and expect timeout */
  timeout: 120000, // 2 minutes for complex RSVP flows
  expect: {
    timeout: 15000, // 15 seconds for assertions
    toHaveScreenshot: {
      mode: 'strict',
      threshold: 0.3,
      maxDiffPixels: 1000
    }
  },
  
  /* Configure projects for major browsers and devices */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance testing requires Chrome DevTools
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* Mobile device testing for responsive design */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    /* Tablet testing */
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
    
    /* High DPI testing for visual regression */
    {
      name: 'chromium-hidpi',
      use: { 
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1920, height: 1080 }
      },
    }
  ],
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  
  /* Web server configuration for local development */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  
  /* Metadata for test organization */
  metadata: {
    project: 'WS-057 Round 2 RSVP Management',
    version: '2.0.0',
    testSuite: 'Advanced Features & Analytics',
    priority: 'P0-P1 Critical Path'
  },
  
  /* Test file patterns */
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  
  /* Test file ignore patterns */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ]
});