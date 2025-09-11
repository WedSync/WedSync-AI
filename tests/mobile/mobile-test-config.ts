import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/mobile/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/mobile-html-report' }],
    ['json', { outputFile: 'test-results/mobile-test-results.json' }],
    ['junit', { outputFile: 'test-results/mobile-junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    // Mobile-specific settings
    hasTouch: true,
    isMobile: true,
  },
  projects: [
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { 
        ...require('@playwright/test').devices['Pixel 5'],
        channel: 'chrome'
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...require('@playwright/test').devices['iPhone 12'],
        browserName: 'webkit'
      },
    },
    {
      name: 'Mobile Edge',
      use: { 
        ...require('@playwright/test').devices['Samsung Galaxy S21'],
        channel: 'msedge'
      },
    },
    // Tablet testing
    {
      name: 'iPad',
      use: { 
        ...require('@playwright/test').devices['iPad Mini'],
        browserName: 'webkit'
      },
    },
    {
      name: 'Android Tablet',
      use: { 
        ...require('@playwright/test').devices['Samsung Galaxy Tab S4'],
        browserName: 'chromium'
      },
    },
    // Performance testing with slow devices
    {
      name: 'Slow Mobile',
      use: {
        ...require('@playwright/test').devices['iPhone SE'],
        launchOptions: {
          slowMo: 100,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});