# 03-e2e-tests.md

# End-to-End Tests Implementation

## What to Build

Implement comprehensive end-to-end tests using Playwright to test complete user journeys across WedSync supplier platform and WedMe couple platform. Tests should validate critical business flows from a real browser perspective.

## Tech Stack

```json
{
  "test-framework": "@playwright/test",
  "browsers": ["chromium", "firefox", "webkit"],
  "devices": ["Desktop", "iPhone 13", "Pixel 5"],
  "reporting": "html-reporter, junit-reporter"
}
```

## Playwright Configuration

```
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  retries: [process.env.CI](http://process.env.CI) ? 2 : 0,
  workers: [process.env.CI](http://process.env.CI) ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || '[http://localhost:3000](http://localhost:3000)',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: ![process.env.CI](http://process.env.CI),
  },
})
```

## Page Object Pattern

```
// tests/e2e/pages/SupplierDashboard.ts
import { Page, Locator } from '@playwright/test'

export class SupplierDashboard {
  readonly page: Page
  readonly clientsTab: Locator
  readonly addClientButton: Locator
  readonly formBuilder: Locator
  
  constructor(page: Page) {
    [this.page](http://this.page) = page
    this.clientsTab = page.getByTestId('nav-clients')
    this.addClientButton = page.getByTestId('add-client-btn')
    this.formBuilder = page.getByTestId('form-builder-canvas')
  }
  
  async goto() {
    await [this.page](http://this.page).goto('/supplier/dashboard')
    await [this.page](http://this.page).waitForLoadState('networkidle')
  }
  
  async addClient(name: string, email: string, weddingDate: string) {
    await [this.clientsTab.click](http://this.clientsTab.click)()
    await [this.addClientButton.click](http://this.addClientButton.click)()
    await [this.page](http://this.page).fill('[data-testid="client-name"]', name)
    await [this.page](http://this.page).fill('[data-testid="client-email"]', email)
    await [this.page](http://this.page).fill('[data-testid="wedding-date"]', weddingDate)
    await [this.page.click](http://this.page.click)('[data-testid="save-client"]')
    await [this.page](http://this.page).waitForSelector(`text="${name}"`)
  }
  
  async createForm(formName: string) {
    await [this.page](http://this.page).goto('/forms/new')
    await [this.page](http://this.page).fill('[data-testid="form-name"]', formName)
    // Drag and drop fields
    const textField = [this.page](http://this.page).getByTestId('field-text')
    const canvas = [this.page](http://this.page).getByTestId('form-canvas')
    await textField.dragTo(canvas)
    await [this.page.click](http://this.page.click)('[data-testid="save-form"]')
  }
}
```

## Critical User Journey Tests

```
// tests/e2e/supplier-onboarding.spec.ts
import { test, expect } from '@playwright/test'
import { SupplierSignup } from './pages/SupplierSignup'

test.describe('Supplier Onboarding Flow', () => {
  test('photographer completes full onboarding', async ({ page }) => {
    const signup = new SupplierSignup(page)
    
    // Start signup
    await signup.goto()
    await signup.selectVendorType('photographer')
    
    // Complete account creation
    await signup.fillAccountDetails({
      email: '[test@photo.com](mailto:test@photo.com)',
      password: 'Test123!@#',
      businessName: 'Test Photography'
    })
    
    // Import clients
    await page.setInputFiles(
      '[data-testid="csv-upload"]',
      'tests/fixtures/clients.csv'
    )
    await expect(page.getByText('127 clients imported')).toBeVisible()
    
    // Create first form
    await [page.click](http://page.click)('[data-testid="create-first-form"]')
    await expect(page).toHaveURL('/forms/builder')
    
    // Verify dashboard
    await page.goto('/dashboard')
    await expect(page.getByTestId('welcome-message')).toContainText('Test Photography')
  })
})
```

## Core Fields Auto-Population Test

```
// tests/e2e/core-fields.spec.ts
test('core fields auto-populate across forms', async ({ page }) => {
  // Couple fills data in WedMe
  await page.goto('/wedme/onboarding')
  await page.fill('[data-testid="wedding-date"]', '2025-06-15')
  await page.fill('[data-testid="venue-name"]', 'The Barn at Grimsby')
  await page.fill('[data-testid="guest-count"]', '120')
  await [page.click](http://page.click)('[data-testid="save-core-fields"]')
  
  // Navigate to supplier form
  await page.goto('/supplier/form/photography-questionnaire')
  
  // Verify fields are pre-filled
  await expect(page.getByTestId('field-wedding-date')).toHaveValue('2025-06-15')
  await expect(page.getByTestId('field-venue')).toHaveValue('The Barn at Grimsby')
  await expect(page.getByTestId('field-guests')).toHaveValue('120')
})
```

## Customer Journey Automation Test

```
// tests/e2e/customer-journey.spec.ts
test('automated journey triggers correctly', async ({ page }) => {
  // Set up journey
  await page.goto('/journeys/builder')
  await [page.click](http://page.click)('[data-testid="new-journey"]')
  
  // Add trigger node
  await page.dragAndDrop(
    '[data-testid="trigger-client-added"]',
    '[data-testid="journey-canvas"]'
  )
  
  // Add email node
  await page.dragAndDrop(
    '[data-testid="action-send-email"]',
    '[data-testid="journey-canvas"]'
  )
  
  // Connect nodes
  await [page.click](http://page.click)('[data-testid="node-output-0"]')
  await [page.click](http://page.click)('[data-testid="node-input-1"]')
  
  // Activate journey
  await [page.click](http://page.click)('[data-testid="activate-journey"]')
  
  // Add client to trigger journey
  await page.goto('/clients')
  await [page.click](http://page.click)('[data-testid="add-client"]')
  await page.fill('[data-testid="client-email"]', '[journey@test.com](mailto:journey@test.com)')
  await [page.click](http://page.click)('[data-testid="save-client"]')
  
  // Verify email was queued
  await page.goto('/communications/sent')
  await expect(page.getByText('[journey@test.com](mailto:journey@test.com)')).toBeVisible()
})
```

## Mobile Responsiveness Test

```
// tests/e2e/mobile.spec.ts
test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('supplier can access key features on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check mobile navigation
    await [page.click](http://page.click)('[data-testid="mobile-menu"]')
    await expect(page.getByTestId('mobile-nav')).toBeVisible()
    
    // Navigate to clients
    await [page.click](http://page.click)('[data-testid="mobile-nav-clients"]')
    await expect(page).toHaveURL('/clients')
    
    // Check form is mobile optimized
    await page.goto('/forms/wedding-questionnaire')
    const formWidth = await page.getByTestId('form-container').boundingBox()
    expect(formWidth?.width).toBeLessThanOrEqual(375)
  })
})
```

## Running Tests

```
# Run all e2e tests
npm run test:e2e

# Run in headed mode for debugging
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e supplier-onboarding.spec.ts

# Run only on mobile
npm run test:e2e -- --project=mobile

# Generate and view report
npm run test:e2e
npx playwright show-report
```

## Critical Implementation Notes

- Use data-testid attributes for reliable element selection
- Test critical business flows, not implementation details
- Include tests for both happy path and error scenarios
- Test across different viewport sizes and devices
- Mock external APIs (Stripe, OpenAI) for consistency
- Use fixtures for test data setup and teardown
- Implement retry logic for flaky network operations
- Capture screenshots and videos on test failures