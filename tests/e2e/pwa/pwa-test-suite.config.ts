/**
 * PWA Test Suite Configuration - WS-171
 * Comprehensive configuration for PWA E2E testing across all browsers and devices
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/pwa',
  
  // Test execution configuration
  timeout: 60000, // 60 seconds per test
  expect: { timeout: 10000 }, // 10 seconds for assertions
  fullyParallel: false, // Run tests in sequence for PWA state consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1, // Limited workers for PWA testing stability

  // Global test configuration
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // PWA-specific settings
    serviceWorkers: 'allow',
    permissions: ['notifications', 'background-sync', 'geolocation'],
    
    // Navigation and timing
    navigationTimeout: 30000,
    actionTimeout: 10000,
    
    // Context options for PWA testing
    ignoreHTTPSErrors: true,
    acceptDownloads: true
  },

  // Browser and device configurations
  projects: [
    {
      name: 'Desktop Chrome - PWA Core',
      testMatch: [
        '**/browser-support/chrome-pwa.spec.ts',
        '**/service-worker/**/*.spec.ts',
        '**/performance/**/*.spec.ts',
        '**/compliance/**/*.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 }
      }
    },
    
    {
      name: 'Desktop Firefox - PWA Core',
      testMatch: [
        '**/browser-support/firefox-pwa.spec.ts',
        '**/performance/cross-browser-performance.spec.ts',
        '**/compliance/**/*.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    
    {
      name: 'Desktop Safari - PWA Core',
      testMatch: [
        '**/browser-support/safari-pwa.spec.ts',
        '**/performance/cross-browser-performance.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      }
    },

    {
      name: 'Mobile Chrome Android - PWA Mobile',
      testMatch: [
        '**/mobile/**/*.spec.ts',
        '**/installation/**/*.spec.ts',
        '**/offline/**/*.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Pixel 5'],
        channel: 'chrome'
      }
    },

    {
      name: 'Mobile Safari iOS - PWA Mobile',
      testMatch: [
        '**/mobile/**/*.spec.ts',
        '**/installation/install-prompt-testing.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['iPhone 12']
      }
    },

    {
      name: 'Tablet iPad - PWA Tablet',
      testMatch: [
        '**/mobile/**/*.spec.ts',
        '**/performance/**/*.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['iPad Pro']
      }
    },

    // Network condition testing
    {
      name: 'PWA Offline Testing',
      testMatch: [
        '**/offline/**/*.spec.ts',
        '**/service-worker/background-sync-lifecycle.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        offline: false, // We'll control offline state in tests
        channel: 'chrome'
      }
    },

    // Performance focused testing
    {
      name: 'PWA Performance Benchmarks',
      testMatch: [
        '**/performance/**/*.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome',
        // Disable some features for accurate performance measurement
        video: 'off',
        screenshot: 'off'
      }
    },

    // Installation and user journey testing
    {
      name: 'PWA Installation Flows',
      testMatch: [
        '**/installation/**/*.spec.ts',
        '**/compliance/manifest-validation.spec.ts'
      ],
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome',
        permissions: ['notifications', 'background-sync']
      }
    }
  ],

  // Test reporting
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report/pwa-tests',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/pwa-test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/pwa-junit-results.xml' 
    }],
    ['list'],
    // Custom PWA test reporter
    ['./tests/e2e/pwa/utils/pwa-custom-reporter.ts']
  ],

  // Global setup and teardown
  globalSetup: './tests/e2e/pwa/utils/global-setup.ts',
  globalTeardown: './tests/e2e/pwa/utils/global-teardown.ts',

  // Output directories
  outputDir: 'test-results/pwa-artifacts',
  
  // Web server configuration for testing
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});