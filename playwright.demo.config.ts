import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for WedSync Demo Mode testing
 * Optimized for testing demo functionality across devices
 */

export default defineConfig({
  testDir: './src/__tests__/demo',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-demo-report' }],
    ['json', { outputFile: 'playwright-demo-results.json' }],
    ['list']
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Demo mode environment variables */
    extraHTTPHeaders: {
      'X-Demo-Mode': 'true'
    },

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshots on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Set demo mode environment */
    // Note: This sets it for browser context, not Node.js process
    contextOptions: {
      // @ts-ignore
      extraHTTPHeaders: {
        'X-Demo-Mode': 'true'
      }
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    /* Mobile testing */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Tablet testing */
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad Pro'] },
    },

    /* Screenshot mode specific testing */
    {
      name: 'screenshot-mode-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Add screenshot mode URL parameter to all tests in this project
        extraHTTPHeaders: {
          'X-Demo-Mode': 'true',
          'X-Screenshot-Mode': 'true'
        }
      },
      testMatch: ['**/demo-mode.spec.ts'],
      grep: /@screenshot-mode/
    },

    /* High contrast accessibility testing */
    {
      name: 'accessibility-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        extraHTTPHeaders: {
          'X-Demo-Mode': 'true'
        }
      },
      testMatch: ['**/demo-accessibility.spec.ts']
    }
  ],

  /* Global setup for demo tests */
  globalSetup: './src/__tests__/demo/global-setup.ts',
  globalTeardown: './src/__tests__/demo/global-teardown.ts',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'NEXT_PUBLIC_DEMO_MODE=true npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_DEMO_MODE: 'true'
    }
  },

  /* Test timeout */
  timeout: 30 * 1000, // 30 seconds

  /* Global test timeout */
  globalTimeout: 10 * 60 * 1000, // 10 minutes

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds
  },

  /* Maximum failures */
  maxFailures: process.env.CI ? 10 : undefined,
});