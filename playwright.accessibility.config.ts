import { defineConfig, devices } from '@playwright/test';

/**
 * Accessibility Testing Configuration
 * WCAG 2.1 AA compliance testing for timeline interface
 */
export default defineConfig({
  testDir: './tests/accessibility',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for consistency
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Single worker for accessibility tests to avoid interference */
  workers: 1,
  
  /* Timeout for each test - accessibility tests can be slower */
  timeout: 45 * 1000,
  
  /* Global test timeout */
  globalTimeout: 15 * 60 * 1000, // 15 minutes
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-accessibility-report' }],
    ['json', { outputFile: 'test-results/accessibility-results.json' }],
    ['junit', { outputFile: 'test-results/accessibility-junit.xml' }],
    ['./tests/accessibility/accessibility-reporter.ts']
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video for accessibility review */
    video: 'retain-on-failure',
    
    /* Action timeout - longer for accessibility interactions */
    actionTimeout: 15 * 1000,
    navigationTimeout: 15 * 1000,
    
    /* Force reduced motion for consistent testing */
    launchOptions: {
      args: ['--force-prefers-reduced-motion']
    },
  },

  /* Configure projects for different accessibility scenarios */
  projects: [
    {
      name: 'accessibility-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Accessibility-specific browser args
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--enable-features=AccessibilityExposeARIAAnnotations',
            '--force-color-profile=srgb'
          ]
        }
      },
      metadata: {
        testType: 'accessibility',
        platform: 'desktop'
      }
    },

    {
      name: 'accessibility-high-contrast',
      use: { 
        ...devices['Desktop Chrome'],
        // High contrast mode simulation
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--force-dark-mode',
            '--enable-features=AccessibilityExposeARIAAnnotations'
          ]
        },
        // Inject high contrast CSS
        extraHTTPHeaders: {
          'Sec-CH-Prefers-Color-Scheme': 'dark'
        }
      },
      metadata: {
        testType: 'accessibility',
        platform: 'high-contrast'
      }
    },

    {
      name: 'accessibility-mobile',
      use: { 
        ...devices['iPhone 12'],
        // Mobile accessibility settings
        hasTouch: true,
        isMobile: true
      },
      metadata: {
        testType: 'accessibility',
        platform: 'mobile'
      }
    },

    {
      name: 'accessibility-keyboard-only',
      use: { 
        ...devices['Desktop Chrome'],
        // Simulate keyboard-only navigation
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--simulate-keyboard-only'
          ]
        }
      },
      metadata: {
        testType: 'accessibility',
        platform: 'keyboard-only'
      }
    },

    {
      name: 'accessibility-screen-reader',
      use: { 
        ...devices['Desktop Chrome'],
        // Screen reader simulation
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--enable-features=AccessibilityExposeARIAAnnotations,AccessibilityExposeDisplayNone'
          ]
        }
      },
      metadata: {
        testType: 'accessibility',
        platform: 'screen-reader'
      }
    }
  ],

  /* Test match patterns */
  testMatch: [
    '**/accessibility/**/*.spec.ts',
    '**/accessibility/**/*.test.ts'
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/accessibility/accessibility-setup.ts'),
  globalTeardown: require.resolve('./tests/accessibility/accessibility-teardown.ts'),

  /* Output directory for test artifacts */
  outputDir: 'test-results/accessibility/',
  
  /* Expect configuration */
  expect: {
    /* Timeout for expect() calls */
    timeout: 10 * 1000,
    
    /* Accessibility-specific screenshot comparison */
    toHaveScreenshot: {
      threshold: 0.4 // Higher threshold for accessibility variations
    }
  },

  /* Web server configuration */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});