import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-Browser Timeline Testing Configuration
 * Tests timeline functionality across Chrome, Firefox, and Safari
 */
export default defineConfig({
  testDir: './tests/cross-browser',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Timeout for each test */
  timeout: 60 * 1000, // 60 seconds per test
  
  /* Global test timeout */
  globalTimeout: 20 * 60 * 1000, // 20 minutes total
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-cross-browser-report' }],
    ['json', { outputFile: 'test-results/cross-browser-results.json' }],
    ['junit', { outputFile: 'test-results/cross-browser-junit.xml' }],
    ['./tests/cross-browser/cross-browser-reporter.ts']
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global test setup */
    actionTimeout: 30 * 1000, // 30 seconds for actions
    navigationTimeout: 30 * 1000, // 30 seconds for navigation
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings
        launchOptions: {
          args: [
            '--enable-features=TouchEventFeatureDetection',
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        }
      },
      metadata: {
        browserName: 'chromium',
        platform: 'desktop',
        dragDropDelay: 100
      }
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.events.asyncClipboard.readText': true,
            'dom.events.testing.asyncClipboard': true
          }
        }
      },
      metadata: {
        browserName: 'firefox',
        platform: 'desktop',
        dragDropDelay: 150
      }
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        // Safari/WebKit-specific settings
        launchOptions: {
          args: ['--enable-features=TouchEvents']
        }
      },
      metadata: {
        browserName: 'webkit',
        platform: 'desktop',
        dragDropDelay: 200
      }
    },

    /* Mobile browsers for responsive testing */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
      metadata: {
        browserName: 'chromium',
        platform: 'mobile',
        dragDropDelay: 150
      }
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
      metadata: {
        browserName: 'webkit',
        platform: 'mobile',
        dragDropDelay: 250
      }
    },

    /* Tablet testing */
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        // Override to use Chromium on iPad Pro size
        ...devices['Desktop Chrome'],
        viewport: devices['iPad Pro'].viewport
      },
      metadata: {
        browserName: 'chromium',
        platform: 'tablet',
        dragDropDelay: 120
      }
    },

    /* Legacy browser support testing */
    {
      name: 'edge-legacy',
      use: {
        channel: 'msedge',
        ...devices['Desktop Edge'],
        launchOptions: {
          args: ['--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection']
        }
      },
      metadata: {
        browserName: 'chromium',
        platform: 'desktop',
        dragDropDelay: 100
      }
    }
  ],

  /* Test directory structure */
  testMatch: [
    '**/cross-browser/**/*.spec.ts',
    '**/cross-browser/**/*.test.ts'
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/cross-browser/global-setup.ts'),
  globalTeardown: require.resolve('./tests/cross-browser/global-teardown.ts'),

  /* Output directory for test artifacts */
  outputDir: 'test-results/cross-browser/',
  
  /* Expect configuration */
  expect: {
    /* Timeout for expect() calls */
    timeout: 10 * 1000, // 10 seconds
    
    /* Visual comparison threshold */
    toHaveScreenshot: {
      threshold: 0.3 // Allow 30% pixel difference for cross-browser screenshots
    },
    
    /* Custom matchers timeout */
    toMatchSnapshot: {
      threshold: 0.2
    }
  },

  /* Web server configuration for local development */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start server
  },
});