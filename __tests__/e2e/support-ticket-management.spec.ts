/**
 * Support Ticket Management E2E Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * End-to-end tests covering complete ticket management workflows
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

// Test data generators
const generateTestCustomer = () => ({
  id: randomUUID(),
  email: `test.customer.${Date.now()}@example.com`,
  name: `Test Customer ${Date.now()}`,
  tier: 'professional',
  user_type: 'supplier'
});

const generateTestAgent = () => ({
  id: randomUUID(),
  email: `test.agent.${Date.now()}@example.com`,
  name: `Test Agent ${Date.now()}`,
  specializations: ['professional', 'scale'],
  max_concurrent_tickets: 5
});

// Test setup helpers
test.beforeEach(async ({ page }) => {
  // Clear any existing test data
  await page.goto('/api/test/cleanup');
  
  // Set up authentication
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'test.admin@wedsync.com');
  await page.fill('[data-testid="password-input"]', 'test-password-123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for authentication to complete
  await page.waitForURL('/dashboard');
});

test.describe('Customer Ticket Submission Flow', () => {
  test('should allow customer to submit a new support ticket', async ({ page }) => {
    const customer = generateTestCustomer();
    
    // Navigate to ticket submission page
    await page.goto('/support/new-ticket');
    
    // Fill out the ticket form
    await page.fill('[data-testid="subject-input"]', 'Payment processing issue');
    await page.fill('[data-testid="description-textarea"]', 
      'I am unable to process payments for my wedding clients. The checkout page shows an error when they try to pay.'
    );
    
    // Select category and priority
    await page.selectOption('[data-testid="category-select"]', 'billing');
    await page.selectOption('[data-testid="type-select"]', 'bug');
    
    // Add customer context
    await page.fill('[data-testid="customer-email"]', customer.email);
    await page.selectOption('[data-testid="user-tier"]', customer.tier);
    
    // Submit the ticket
    await page.click('[data-testid="submit-ticket-button"]');
    
    // Verify ticket creation success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Ticket submitted successfully');
    
    // Verify ticket ID is generated
    const ticketId = await page.textContent('[data-testid="ticket-id"]');
    expect(ticketId).toMatch(/WS-\d+/);
    
    // Verify ticket appears in customer's ticket list
    await page.goto('/support/my-tickets');
    await expect(page.locator(`[data-testid="ticket-${ticketId}"]`)).toBeVisible();
  });

  test('should auto-classify urgent wedding day tickets', async ({ page }) => {
    // Navigate to ticket submission
    await page.goto('/support/new-ticket');
    
    // Submit urgent wedding day ticket
    await page.fill('[data-testid="subject-input"]', 'URGENT: Wedding ceremony today, forms not working');
    await page.fill('[data-testid="description-textarea"]', 
      'My wedding is today and my RSVP forms are not working. Guests cannot respond and this is causing major issues.'
    );
    
    await page.click('[data-testid="submit-ticket-button"]');
    
    // Verify automatic classification
    await expect(page.locator('[data-testid="priority-badge"]')).toContainText('Critical');
    await expect(page.locator('[data-testid="wedding-emergency-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="sla-response-time"]')).toContainText('15 minutes');
  });

  test('should handle file attachments correctly', async ({ page }) => {
    await page.goto('/support/new-ticket');
    
    // Fill basic ticket info
    await page.fill('[data-testid="subject-input"]', 'Form layout issue');
    await page.fill('[data-testid="description-textarea"]', 'My form layout is broken. See attached screenshot.');
    
    // Upload file attachment
    const fileInput = page.locator('[data-testid="file-upload"]');
    await fileInput.setInputFiles('./test-files/screenshot.png');
    
    // Verify file appears in upload list
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText('screenshot.png');
    
    // Submit ticket
    await page.click('[data-testid="submit-ticket-button"]');
    
    // Verify attachment is included
    const ticketId = await page.textContent('[data-testid="ticket-id"]');
    await page.goto(`/support/tickets/${ticketId}`);
    await expect(page.locator('[data-testid="attachment-link"]')).toContainText('screenshot.png');
  });
});

test.describe('Agent Ticket Management Workflow', () => {
  test('should allow agent to claim and resolve tickets', async ({ page }) => {
    // Create a test ticket first
    await page.goto('/api/test/create-ticket', {
      method: 'POST',
      data: {
        subject: 'Test billing issue',
        description: 'Customer cannot access billing page',
        category: 'billing',
        type: 'bug',
        priority: 'high'
      }
    });
    
    // Navigate to agent dashboard
    await page.goto('/support/dashboard');
    
    // Verify ticket appears in queue
    await expect(page.locator('[data-testid="unassigned-tickets"]')).toContainText('Test billing issue');
    
    // Claim the ticket
    await page.click('[data-testid="claim-ticket-button"]');
    
    // Verify ticket moves to agent's active queue
    await expect(page.locator('[data-testid="my-active-tickets"]')).toContainText('Test billing issue');
    
    // Open ticket detail view
    await page.click('[data-testid="ticket-link"]');
    
    // Add response to customer
    await page.fill('[data-testid="response-textarea"]', 
      'Hi! I\'ve identified the issue with your billing page. Let me walk you through the fix.'
    );
    
    // Select template (optional)
    await page.click('[data-testid="use-template-button"]');
    await page.click('[data-testid="template-billing-help"]');
    
    // Send response
    await page.click('[data-testid="send-response-button"]');
    
    // Verify response appears in conversation thread
    await expect(page.locator('[data-testid="conversation-thread"]')).toContainText('I\'ve identified the issue');
    
    // Mark ticket as resolved
    await page.selectOption('[data-testid="status-select"]', 'resolved');
    await page.fill('[data-testid="resolution-notes"]', 'Guided customer through billing page reset process');
    await page.click('[data-testid="update-status-button"]');
    
    // Verify ticket is marked resolved
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Resolved');
  });

  test('should handle ticket escalation workflow', async ({ page }) => {
    // Create high-priority ticket
    await page.goto('/api/test/create-ticket', {
      method: 'POST',
      data: {
        subject: 'Data loss - all client information gone',
        description: 'All my client data has disappeared from the system',
        category: 'data_loss',
        type: 'bug',
        priority: 'critical'
      }
    });
    
    await page.goto('/support/dashboard');
    
    // Claim the critical ticket
    await page.click('[data-testid="claim-ticket-button"]');
    await page.click('[data-testid="ticket-link"]');
    
    // Escalate to senior agent
    await page.click('[data-testid="escalate-button"]');
    await page.selectOption('[data-testid="escalate-to"]', 'senior-agent');
    await page.fill('[data-testid="escalation-reason"]', 'Requires immediate database recovery expertise');
    await page.click('[data-testid="confirm-escalation"]');
    
    // Verify escalation notification
    await expect(page.locator('[data-testid="escalation-alert"]')).toContainText('Escalated to senior agent');
    
    // Verify ticket priority upgraded
    await expect(page.locator('[data-testid="priority-badge"]')).toContainText('Critical');
  });

  test('should track and enforce SLA compliance', async ({ page }) => {
    // Create ticket with specific SLA requirements
    await page.goto('/api/test/create-ticket', {
      method: 'POST',
      data: {
        subject: 'Enterprise feature request',
        description: 'Need custom integration for enterprise workflow',
        category: 'feature_request',
        type: 'question',
        priority: 'medium',
        customer_tier: 'enterprise'
      }
    });
    
    await page.goto('/support/dashboard');
    await page.click('[data-testid="ticket-link"]');
    
    // Verify SLA information is displayed
    await expect(page.locator('[data-testid="sla-response-time"]')).toContainText('15 minutes');
    await expect(page.locator('[data-testid="sla-resolution-time"]')).toContainText('2 hours');
    
    // Check SLA status indicator
    const slaIndicator = page.locator('[data-testid="sla-status"]');
    await expect(slaIndicator).toHaveClass(/bg-green/); // Within SLA
    
    // Verify time remaining countdown
    await expect(page.locator('[data-testid="time-remaining"]')).toBeVisible();
    
    // Simulate SLA warning (would need to manipulate time in real test)
    await page.evaluate(() => {
      // Mock time progression for testing
      window.testSLAWarning = true;
    });
    
    await page.reload();
    await expect(page.locator('[data-testid="sla-warning"]')).toContainText('SLA deadline approaching');
  });
});

test.describe('Template Management Workflow', () => {
  test('should allow agents to create and use custom templates', async ({ page }) => {
    // Navigate to template management
    await page.goto('/support/templates');
    
    // Create new template
    await page.click('[data-testid="create-template-button"]');
    
    // Fill template details
    await page.fill('[data-testid="template-name"]', 'Wedding Day Emergency Response');
    await page.selectOption('[data-testid="template-category"]', 'emergency');
    await page.fill('[data-testid="template-subject"]', 'Immediate Wedding Day Support - Priority Response');
    await page.fill('[data-testid="template-content"]', 
      `Hi {{customer_name}},
      
      I understand your wedding is {{wedding_date}} and this is urgent. Our emergency response team has been notified and we're prioritizing your case.
      
      I'm personally handling your request and will have this resolved within the next 15 minutes.
      
      Wedding Day Emergency Hotline: {{emergency_phone}}
      
      Best regards,
      {{agent_name}}`
    );
    
    // Add template variables
    await page.click('[data-testid="add-variable-button"]');
    await page.fill('[data-testid="variable-name"]', 'customer_name');
    await page.click('[data-testid="add-variable-button"]');
    await page.fill('[data-testid="variable-name-1"]', 'wedding_date');
    
    // Set access permissions
    await page.check('[data-testid="tier-enterprise"]');
    await page.check('[data-testid="tier-professional"]');
    
    // Save template
    await page.click('[data-testid="save-template-button"]');
    
    // Verify template appears in list
    await expect(page.locator('[data-testid="template-list"]')).toContainText('Wedding Day Emergency Response');
    
    // Test using the template in a ticket
    await page.goto('/support/dashboard');
    await page.click('[data-testid="ticket-link"]'); // Open any ticket
    
    // Apply the new template
    await page.click('[data-testid="use-template-button"]');
    await page.click('[data-testid="template-wedding-day-emergency"]');
    
    // Fill variable values
    await page.fill('[data-testid="var-customer_name"]', 'Sarah Johnson');
    await page.fill('[data-testid="var-wedding_date"]', 'today');
    
    // Apply template
    await page.click('[data-testid="apply-template"]');
    
    // Verify template content is populated
    await expect(page.locator('[data-testid="response-textarea"]')).toContainText('Hi Sarah Johnson');
    await expect(page.locator('[data-testid="response-textarea"]')).toContainText('your wedding is today');
  });

  test('should suggest relevant templates based on ticket content', async ({ page }) => {
    // Create ticket with payment-related content
    await page.goto('/api/test/create-ticket', {
      method: 'POST',
      data: {
        subject: 'Stripe payment not working',
        description: 'My customers cannot complete payments, getting error on checkout',
        category: 'billing',
        type: 'bug'
      }
    });
    
    await page.goto('/support/dashboard');
    await page.click('[data-testid="ticket-link"]');
    
    // Verify suggested templates appear
    await expect(page.locator('[data-testid="suggested-templates"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-payment-troubleshooting"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-billing-help"]')).toBeVisible();
    
    // Templates should be ranked by relevance
    const firstSuggestion = page.locator('[data-testid="suggested-templates"] .template-item').first();
    await expect(firstSuggestion).toContainText('Payment');
  });
});

test.describe('Metrics Dashboard Workflow', () => {
  test('should display real-time agent performance metrics', async ({ page }) => {
    // Navigate to metrics dashboard
    await page.goto('/support/metrics');
    
    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-tickets"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="sla-compliance-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="customer-satisfaction"]')).toBeVisible();
    
    // Verify agent performance table
    await expect(page.locator('[data-testid="agent-performance-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-row"]')).toHaveCount({ min: 1 });
    
    // Check sorting functionality
    await page.click('[data-testid="sort-response-time"]');
    
    // Verify table sorts by response time
    const firstRow = page.locator('[data-testid="agent-row"]').first();
    const lastRow = page.locator('[data-testid="agent-row"]').last();
    
    const firstTime = await firstRow.locator('[data-testid="response-time"]').textContent();
    const lastTime = await lastRow.locator('[data-testid="response-time"]').textContent();
    
    // Response times should be in ascending order after sort
    expect(parseFloat(firstTime!)).toBeLessThanOrEqual(parseFloat(lastTime!));
  });

  test('should update metrics in real-time', async ({ page }) => {
    await page.goto('/support/metrics');
    
    // Record initial metrics
    const initialTicketCount = await page.textContent('[data-testid="total-tickets"]');
    
    // Create a new ticket in another browser context to simulate real-time
    const context2 = await page.context().browser()!.newContext();
    const page2 = await context2.newPage();
    
    await page2.goto('/api/test/create-ticket', {
      method: 'POST',
      data: {
        subject: 'Real-time test ticket',
        description: 'Testing real-time metrics update'
      }
    });
    
    // Wait for metrics to update on original page
    await page.waitForFunction(
      (initialCount) => {
        const currentCount = document.querySelector('[data-testid="total-tickets"]')?.textContent;
        return currentCount !== initialCount;
      },
      initialTicketCount,
      { timeout: 10000 }
    );
    
    // Verify metrics updated
    const updatedTicketCount = await page.textContent('[data-testid="total-tickets"]');
    expect(parseInt(updatedTicketCount!)).toBeGreaterThan(parseInt(initialTicketCount!));
    
    await context2.close();
  });

  test('should export metrics data correctly', async ({ page }) => {
    await page.goto('/support/metrics');
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('[data-testid="export-csv-button"]');
    
    // Verify download starts
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/support-metrics-\d{4}-\d{2}-\d{2}\.csv/);
    
    // Save and verify file content
    const path = `/tmp/${download.suggestedFilename()}`;
    await download.saveAs(path);
    
    // Basic verification that CSV contains expected headers
    const fs = require('fs');
    const csvContent = fs.readFileSync(path, 'utf8');
    expect(csvContent).toContain('Agent Name,Tickets Handled,Avg Response Time');
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size
  
  test('should work correctly on mobile devices', async ({ page }) => {
    // Test mobile ticket submission
    await page.goto('/support/new-ticket');
    
    // Verify mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-form-layout"]')).toBeVisible();
    
    // Fill form on mobile
    await page.fill('[data-testid="subject-input"]', 'Mobile test ticket');
    await page.fill('[data-testid="description-textarea"]', 'Testing mobile ticket submission');
    
    // Use mobile-friendly dropdowns
    await page.click('[data-testid="category-mobile-select"]');
    await page.click('[data-testid="category-option-technical"]');
    
    // Submit ticket
    await page.click('[data-testid="submit-mobile-button"]');
    
    // Verify success on mobile
    await expect(page.locator('[data-testid="mobile-success-message"]')).toBeVisible();
  });
  
  test('should have mobile-friendly agent dashboard', async ({ page }) => {
    await page.goto('/support/dashboard');
    
    // Verify mobile layout adaptations
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-cards"]')).toBeVisible(); // Card layout instead of table
    
    // Test ticket interaction on mobile
    await page.click('[data-testid="ticket-card"]');
    await expect(page.locator('[data-testid="mobile-ticket-detail"]')).toBeVisible();
  });
});

test.describe('Performance and Load Testing', () => {
  test('should handle concurrent ticket submissions', async ({ page }) => {
    // Create multiple tickets simultaneously
    const ticketPromises = Array.from({ length: 10 }, (_, i) => 
      page.goto('/api/test/create-ticket', {
        method: 'POST',
        data: {
          subject: `Load test ticket ${i}`,
          description: `Performance testing ticket number ${i}`,
          category: 'technical'
        }
      })
    );
    
    // Wait for all tickets to be created
    await Promise.all(ticketPromises);
    
    // Verify system handled the load
    await page.goto('/support/dashboard');
    await expect(page.locator('[data-testid="ticket-count"]')).toContainText('10');
  });
  
  test('should maintain performance with large datasets', async ({ page }) => {
    // Navigate to metrics dashboard with large dataset
    await page.goto('/support/metrics?dataset=large');
    
    // Measure load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="metrics-loaded"]');
    const loadTime = Date.now() - startTime;
    
    // Should load within acceptable time
    expect(loadTime).toBeLessThan(3000); // 3 seconds
    
    // Verify functionality still works with large dataset
    await page.click('[data-testid="sort-response-time"]');
    await expect(page.locator('[data-testid="agent-row"]').first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Error Handling and Recovery', () => {
  test('should handle network failures gracefully', async ({ page }) => {
    await page.goto('/support/dashboard');
    
    // Simulate network failure
    await page.route('**/api/support/**', route => route.abort());
    
    // Attempt to load tickets
    await page.reload();
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load tickets');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/support/**');
    await page.click('[data-testid="retry-button"]');
    
    // Verify recovery
    await expect(page.locator('[data-testid="ticket-list"]')).toBeVisible();
  });
  
  test('should recover from session timeouts', async ({ page }) => {
    await page.goto('/support/dashboard');
    
    // Simulate session timeout
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
      sessionStorage.clear();
    });
    
    // Attempt to perform authenticated action
    await page.click('[data-testid="create-ticket-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Login again
    await page.fill('[data-testid="email-input"]', 'test.admin@wedsync.com');
    await page.fill('[data-testid="password-input"]', 'test-password-123');
    await page.click('[data-testid="login-button"]');
    
    // Should return to dashboard
    await expect(page).toHaveURL(/\/support\/dashboard/);
  });
});

test.afterEach(async ({ page }) => {
  // Clean up test data
  await page.goto('/api/test/cleanup');
});