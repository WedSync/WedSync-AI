import { test, expect } from '@playwright/test';

/**
 * Critical User Journeys E2E Testing Suite
 * Tests complete user flows from registration to journey execution
 */

test.describe('Critical User Journeys', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Mock authentication for consistent testing
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          user: { 
            id: 'test-user-e2e', 
            email: 'test-e2e@wedsync.com',
            role: 'supplier' 
          } 
        })
      });
    });
  });

  test('Complete Client Onboarding Journey', async ({ page }) => {
    // Step 1: Navigate to client registration
    await page.goto('/clients/new');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Fill client registration form
    await page.fill('[data-testid="client-name"]', 'Test Client E2E');
    await page.fill('[data-testid="client-email"]', 'client-e2e@example.com');
    await page.fill('[data-testid="client-phone"]', '+1234567890');
    await page.fill('[data-testid="wedding-date"]', '2024-12-31');
    await page.selectOption('[data-testid="wedding-type"]', 'traditional');
    
    // Step 3: Submit registration
    await page.click('[data-testid="submit-registration"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify registration success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-id"]')).toBeVisible();
    
    // Step 5: Navigate to client dashboard
    const clientId = await page.locator('[data-testid="client-id"]').textContent();
    await page.goto(`/clients/${clientId}`);
    
    // Step 6: Verify client profile is created
    await expect(page.locator('[data-testid="client-profile"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Test Client E2E');
  });

  test('End-to-End Form Submission and Journey Trigger', async ({ page }) => {
    // Mock form submission endpoint
    await page.route('**/api/forms/*/submit', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          submissionId: 'sub-test-e2e-123',
          triggeredJourneys: ['journey-welcome-e2e']
        })
      });
    });

    // Mock journey execution endpoint
    await page.route('**/api/journeys/execute', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          executionId: 'exec-test-e2e-456',
          status: 'initiated',
          steps: [
            { id: 'email-welcome', status: 'queued', type: 'email' }
          ]
        })
      });
    });

    // Step 1: Navigate to public form
    await page.goto('/forms/wedding-inquiry');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Fill form fields
    await page.fill('[data-testid="form-field-name"]', 'Jane & John Doe');
    await page.fill('[data-testid="form-field-email"]', 'jane.john@example.com');
    await page.fill('[data-testid="form-field-date"]', '2024-08-15');
    await page.fill('[data-testid="form-field-guests"]', '150');
    await page.selectOption('[data-testid="form-field-venue"]', 'outdoor');
    
    // Step 3: Submit form
    await page.click('[data-testid="submit-form"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify submission success
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="submission-id"]')).toContainText('sub-test-e2e-123');
    
    // Step 5: Navigate to journey execution tracking
    await page.goto('/journeys/execution/exec-test-e2e-456');
    
    // Step 6: Verify journey was triggered
    await expect(page.locator('[data-testid="execution-status"]')).toContainText('initiated');
    await expect(page.locator('[data-testid="journey-steps"]')).toBeVisible();
  });

  test('Email Service Integration Journey', async ({ page }) => {
    // Mock SendGrid API calls
    await page.route('**/api/email/send', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          messageId: 'msg-sendgrid-e2e-789',
          status: 'queued',
          to: 'test-recipient@example.com'
        })
      });
    });

    // Step 1: Navigate to email composition
    await page.goto('/communications/email/compose');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Compose email
    await page.fill('[data-testid="email-to"]', 'test-recipient@example.com');
    await page.fill('[data-testid="email-subject"]', 'E2E Test Email');
    await page.selectOption('[data-testid="email-template"]', 'welcome');
    
    // Step 3: Send email
    await page.click('[data-testid="send-email"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify send confirmation
    await expect(page.locator('[data-testid="send-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-id"]')).toContainText('msg-sendgrid-e2e-789');
    
    // Step 5: Check email status tracking
    await page.goto('/communications/tracking');
    await expect(page.locator('[data-testid="email-status"]')).toContainText('queued');
  });

  test('SMS Service Integration Journey', async ({ page }) => {
    // Mock Twilio API calls
    await page.route('**/api/sms/send', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          sid: 'sms-twilio-e2e-abc',
          status: 'queued',
          to: '+1234567890'
        })
      });
    });

    // Step 1: Navigate to SMS composition
    await page.goto('/communications/sms/compose');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Compose SMS
    await page.fill('[data-testid="sms-to"]', '+1234567890');
    await page.fill('[data-testid="sms-message"]', 'E2E Test SMS Message');
    
    // Step 3: Send SMS
    await page.click('[data-testid="send-sms"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify send confirmation
    await expect(page.locator('[data-testid="sms-send-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="sms-sid"]')).toContainText('sms-twilio-e2e-abc');
  });

  test('Complete Journey Builder Workflow', async ({ page }) => {
    // Step 1: Navigate to Journey Builder
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    // Step 3: Add nodes to canvas (drag and drop simulation)
    // Add trigger node
    await page.dragAndDrop(
      '[data-testid="node-form-submit"]',
      '.react-flow',
      { targetPosition: { x: 200, y: 100 } }
    );
    
    // Add email action node
    await page.dragAndDrop(
      '[data-testid="node-send-email"]',
      '.react-flow',
      { targetPosition: { x: 400, y: 100 } }
    );
    
    // Add delay node
    await page.dragAndDrop(
      '[data-testid="node-delay"]',
      '.react-flow',
      { targetPosition: { x: 600, y: 100 } }
    );
    
    // Step 4: Connect nodes
    await page.hover('.react-flow__node[data-id="1"] .react-flow__handle-right');
    await page.mouse.down();
    await page.hover('.react-flow__node[data-id="2"] .react-flow__handle-left');
    await page.mouse.up();
    
    // Step 5: Configure nodes
    await page.click('.react-flow__node[data-id="2"]');
    await page.waitForSelector('[data-testid="node-config-panel"]');
    await page.selectOption('[data-testid="email-template"]', 'welcome');
    await page.click('[data-testid="save-node-config"]');
    
    // Step 6: Save journey
    await page.click('[data-testid="save-journey"]');
    await page.waitForLoadState('networkidle');
    
    // Step 7: Publish journey
    await page.click('[data-testid="publish-journey"]');
    await page.waitForLoadState('networkidle');
    
    // Step 8: Verify journey is active
    await expect(page.locator('[data-testid="journey-status"]')).toContainText('Active');
  });

  test('PDF Processing and Field Mapping', async ({ page }) => {
    // Mock PDF upload and processing
    await page.route('**/api/pdf/upload', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          pdfId: 'pdf-e2e-test-123',
          fields: [
            { name: 'client_name', x: 100, y: 100, width: 200, height: 30 },
            { name: 'wedding_date', x: 100, y: 150, width: 200, height: 30 }
          ]
        })
      });
    });

    // Step 1: Navigate to PDF upload
    await page.goto('/pdf/upload');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Upload PDF file
    const fileInput = page.locator('[data-testid="pdf-file-input"]');
    await fileInput.setInputFiles('tests/fixtures/sample-contract.pdf');
    
    // Step 3: Process PDF
    await page.click('[data-testid="process-pdf"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify field detection
    await expect(page.locator('[data-testid="detected-fields"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-client_name"]')).toBeVisible();
    
    // Step 5: Map fields to form data
    await page.selectOption('[data-testid="field-mapping-client_name"]', 'form.client_name');
    await page.selectOption('[data-testid="field-mapping-wedding_date"]', 'form.wedding_date');
    
    // Step 6: Save field mapping
    await page.click('[data-testid="save-field-mapping"]');
    await expect(page.locator('[data-testid="mapping-success"]')).toBeVisible();
  });

  test('Analytics Dashboard Data Flow', async ({ page }) => {
    // Mock analytics data
    await page.route('**/api/analytics/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalClients: 245,
            totalJourneys: 12,
            activeJourneys: 8,
            emailsSent: 1520,
            smsSent: 340,
            conversionRate: 85.2
          },
          chartData: [
            { date: '2024-01-01', clients: 50, conversions: 42 },
            { date: '2024-01-02', clients: 75, conversions: 64 },
            { date: '2024-01-03', clients: 120, conversions: 102 }
          ]
        })
      });
    });

    // Step 1: Navigate to analytics dashboard
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Verify key metrics display
    await expect(page.locator('[data-testid="metric-total-clients"]')).toContainText('245');
    await expect(page.locator('[data-testid="metric-conversion-rate"]')).toContainText('85.2%');
    
    // Step 3: Verify charts render
    await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible();
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
    
    // Step 4: Test date range filtering
    await page.selectOption('[data-testid="date-range"]', 'last-30-days');
    await page.waitForLoadState('networkidle');
    
    // Step 5: Verify data updates
    await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible();
  });

  test('Cross-Browser Form Submission', async ({ page, browserName }) => {
    // Test form submission across different browsers
    await page.goto('/forms/contact');
    await page.waitForLoadState('networkidle');
    
    // Fill form with browser-specific test data
    await page.fill('[data-testid="contact-name"]', `Test User ${browserName}`);
    await page.fill('[data-testid="contact-email"]', `test-${browserName}@example.com`);
    await page.fill('[data-testid="contact-message"]', `E2E test from ${browserName}`);
    
    // Submit form
    await page.click('[data-testid="submit-contact"]');
    await page.waitForLoadState('networkidle');
    
    // Verify submission works across browsers
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
    
    // Take browser-specific screenshot
    await page.screenshot({ 
      path: `test-results/form-submission-${browserName}.png`,
      fullPage: true 
    });
  });

  test('Mobile Responsive Journey Management', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Step 1: Navigate to journeys on mobile
    await page.goto('/journeys');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Step 3: Test journey creation on mobile
    await page.click('[data-testid="create-journey-mobile"]');
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify mobile Journey Builder loads
    await expect(page.locator('.react-flow')).toBeVisible();
    
    // Step 5: Test touch interactions
    await page.tap('[data-testid="node-palette-toggle"]');
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible();
    
    // Step 6: Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-journey-builder.png',
      fullPage: true 
    });
  });
});