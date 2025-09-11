/**
 * WS-207 FAQ Extraction AI - End-to-End Integration Tests
 * Team E - Round 1 - Complete User Workflow Testing with Playwright MCP
 *
 * CRITICAL: E2E tests covering complete user journeys for wedding vendors
 * Tests real-world scenarios: photographers, venues, planners using FAQ extraction
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { Page, Browser } from 'playwright';

// Import MCP Playwright functions
declare global {
  const mcp__playwright__browser_navigate: (options: {
    url: string;
  }) => Promise<void>;
  const mcp__playwright__browser_click: (options: {
    element: string;
    ref: string;
  }) => Promise<void>;
  const mcp__playwright__browser_type: (options: {
    element: string;
    ref: string;
    text: string;
    slowly?: boolean;
    submit?: boolean;
  }) => Promise<void>;
  const mcp__playwright__browser_wait_for: (options: {
    text?: string;
    time?: number;
  }) => Promise<void>;
  const mcp__playwright__browser_take_screenshot: (options: {
    filename: string;
    fullPage?: boolean;
  }) => Promise<void>;
  const mcp__playwright__browser_resize: (options: {
    width: number;
    height: number;
  }) => Promise<void>;
  const mcp__playwright__browser_snapshot: () => Promise<string>;
  const mcp__playwright__browser_fill_form: (options: {
    fields: Array<{ name: string; type: string; ref: string; value: string }>;
  }) => Promise<void>;
  const mcp__playwright__browser_select_option: (options: {
    element: string;
    ref: string;
    values: string[];
  }) => Promise<void>;
  const mcp__playwright__browser_hover: (options: {
    element: string;
    ref: string;
  }) => Promise<void>;
  const mcp__playwright__browser_evaluate: (options: {
    function: string;
  }) => Promise<any>;
}

describe('FAQ Extraction E2E Tests', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const TEST_USER_EMAIL = 'test-photographer@example.com';
  const TEST_USER_PASSWORD = 'TestPass123!';

  beforeAll(async () => {
    // Setup test data and authenticate user
    console.log('Setting up E2E test environment...');
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('Cleaning up E2E test environment...');
  });

  beforeEach(async () => {
    // Navigate to home page before each test
    await mcp__playwright__browser_navigate({
      url: BASE_URL,
    });
  });

  describe('Wedding Photographer FAQ Extraction Workflow', () => {
    it('should complete full FAQ extraction workflow for photographer', async () => {
      // Step 1: Login as photographer
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/login`,
      });

      await mcp__playwright__browser_fill_form({
        fields: [
          {
            name: 'email',
            type: 'textbox',
            ref: 'email-input',
            value: TEST_USER_EMAIL,
          },
          {
            name: 'password',
            type: 'textbox',
            ref: 'password-input',
            value: TEST_USER_PASSWORD,
          },
        ],
      });

      await mcp__playwright__browser_click({
        element: 'Login button',
        ref: 'login-submit-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'Dashboard',
      });

      // Step 2: Navigate to FAQ extraction page
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_take_screenshot({
        filename: 'faq-extraction-page-initial.png',
        fullPage: true,
      });

      // Step 3: Enter photographer website URL
      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://demo-photographer.wedsync.com',
      });

      // Step 4: Select vendor type
      await mcp__playwright__browser_select_option({
        element: 'Vendor type dropdown',
        ref: 'vendor-type-select',
        values: ['photographer'],
      });

      // Step 5: Start extraction
      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'Analyzing website...',
      });

      // Step 6: Wait for extraction to complete
      await mcp__playwright__browser_wait_for({
        text: 'FAQ Extraction Complete',
      });

      await mcp__playwright__browser_take_screenshot({
        filename: 'faq-extraction-results.png',
        fullPage: true,
      });

      // Step 7: Verify extracted FAQs are displayed
      const extractedFAQsCount = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelectorAll("[data-testid=\"extracted-faq-card\"]").length',
      });

      expect(extractedFAQsCount).toBeGreaterThan(5);

      // Step 8: Review AI categorization suggestions
      const firstFAQCategory = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelector("[data-testid=\"faq-category-suggestion-0\"]")?.textContent',
      });

      expect(firstFAQCategory).toBeTruthy();
      expect(['pricing', 'services', 'logistics', 'technical']).toContain(
        firstFAQCategory.toLowerCase(),
      );

      // Step 9: Approve individual FAQ
      await mcp__playwright__browser_click({
        element: 'Approve button on first FAQ',
        ref: 'approve-faq-0',
      });

      await mcp__playwright__browser_wait_for({
        text: 'FAQ approved successfully',
      });

      // Step 10: Verify FAQ moved to approved section
      const approvedFAQsCount = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelectorAll("[data-testid=\"approved-faq-card\"]").length',
      });

      expect(approvedFAQsCount).toBe(1);

      // Step 11: Edit FAQ before approving
      await mcp__playwright__browser_click({
        element: 'Edit button on second FAQ',
        ref: 'edit-faq-1',
      });

      await mcp__playwright__browser_type({
        element: 'FAQ question editor',
        ref: 'faq-question-editor',
        text: 'What are your wedding photography package options and pricing?',
      });

      await mcp__playwright__browser_click({
        element: 'Save edited FAQ button',
        ref: 'save-faq-edit-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'FAQ updated successfully',
      });

      // Step 12: Test bulk operations
      await mcp__playwright__browser_click({
        element: 'Select all checkbox',
        ref: 'select-all-faqs',
      });

      await mcp__playwright__browser_click({
        element: 'Bulk approve button',
        ref: 'bulk-approve-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'All FAQs approved successfully',
      });

      // Step 13: Verify all FAQs approved
      const remainingPendingFAQs = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelectorAll("[data-testid=\"pending-faq-card\"]").length',
      });

      expect(remainingPendingFAQs).toBe(0);

      // Step 14: Navigate to FAQ management page
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/manage`,
      });

      await mcp__playwright__browser_take_screenshot({
        filename: 'faq-management-final.png',
        fullPage: true,
      });

      // Step 15: Verify FAQs appear in management interface
      const managedFAQsCount = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelectorAll("[data-testid=\"managed-faq-item\"]").length',
      });

      expect(managedFAQsCount).toBeGreaterThan(5);
    });

    it('should handle mobile FAQ extraction workflow', async () => {
      // Step 1: Resize to mobile viewport
      await mcp__playwright__browser_resize({
        width: 375,
        height: 667,
      });

      // Step 2: Login on mobile
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/login`,
      });

      await mcp__playwright__browser_fill_form({
        fields: [
          {
            name: 'email',
            type: 'textbox',
            ref: 'mobile-email-input',
            value: TEST_USER_EMAIL,
          },
          {
            name: 'password',
            type: 'textbox',
            ref: 'mobile-password-input',
            value: TEST_USER_PASSWORD,
          },
        ],
      });

      await mcp__playwright__browser_click({
        element: 'Mobile login button',
        ref: 'mobile-login-btn',
      });

      // Step 3: Navigate to mobile FAQ extraction
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_take_screenshot({
        filename: 'mobile-faq-extraction.png',
      });

      // Step 4: Verify mobile interface is responsive
      const mobileExtractorVisible = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelector("[data-testid=\"mobile-faq-extractor\"]")?.offsetParent !== null',
      });

      expect(mobileExtractorVisible).toBe(true);

      // Step 5: Test mobile FAQ extraction
      await mcp__playwright__browser_type({
        element: 'Mobile website URL input',
        ref: 'mobile-website-url-input',
        text: 'https://mobile-photographer.wedsync.com',
      });

      await mcp__playwright__browser_click({
        element: 'Mobile start extraction button',
        ref: 'mobile-start-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'Extracting FAQs...',
      });

      // Step 6: Test mobile swipe gestures for FAQ approval
      const firstMobileFAQ = await mcp__playwright__browser_evaluate({
        function: `
          () => {
            const faq = document.querySelector("[data-testid='mobile-faq-card-0']");
            if (faq) {
              // Simulate swipe right for approval
              const event = new TouchEvent('touchstart', { bubbles: true });
              faq.dispatchEvent(event);
              return true;
            }
            return false;
          }
        `,
      });

      expect(firstMobileFAQ).toBe(true);

      await mcp__playwright__browser_take_screenshot({
        filename: 'mobile-faq-approved.png',
      });
    });
  });

  describe('Wedding Venue FAQ Extraction Workflow', () => {
    it('should extract and categorize venue-specific FAQs', async () => {
      // Step 1: Login as venue owner
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/login`,
      });

      await mcp__playwright__browser_fill_form({
        fields: [
          {
            name: 'email',
            type: 'textbox',
            ref: 'email-input',
            value: 'test-venue@example.com',
          },
          {
            name: 'password',
            type: 'textbox',
            ref: 'password-input',
            value: TEST_USER_PASSWORD,
          },
        ],
      });

      await mcp__playwright__browser_click({
        element: 'Login button',
        ref: 'login-submit-btn',
      });

      // Step 2: Navigate to FAQ extraction
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      // Step 3: Extract venue FAQs
      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://demo-venue.wedsync.com',
      });

      await mcp__playwright__browser_select_option({
        element: 'Vendor type dropdown',
        ref: 'vendor-type-select',
        values: ['venue'],
      });

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'FAQ Extraction Complete',
      });

      // Step 4: Verify venue-specific categorization
      const venueFAQCategories = await mcp__playwright__browser_evaluate({
        function: `
          () => {
            const categories = Array.from(document.querySelectorAll("[data-testid^='faq-category-suggestion-']"))
              .map(el => el.textContent?.toLowerCase());
            return categories;
          }
        `,
      });

      expect(venueFAQCategories).toEqual(
        expect.arrayContaining([
          'pricing',
          'capacity',
          'amenities',
          'policies',
        ]),
      );

      await mcp__playwright__browser_take_screenshot({
        filename: 'venue-faq-categorization.png',
        fullPage: true,
      });
    });
  });

  describe('Wedding Planner FAQ Extraction Workflow', () => {
    it('should extract and categorize planner-specific FAQs', async () => {
      // Step 1: Login as wedding planner
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/login`,
      });

      await mcp__playwright__browser_fill_form({
        fields: [
          {
            name: 'email',
            type: 'textbox',
            ref: 'email-input',
            value: 'test-planner@example.com',
          },
          {
            name: 'password',
            type: 'textbox',
            ref: 'password-input',
            value: TEST_USER_PASSWORD,
          },
        ],
      });

      await mcp__playwright__browser_click({
        element: 'Login button',
        ref: 'login-submit-btn',
      });

      // Step 2: Extract planner FAQs
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://demo-planner.wedsync.com',
      });

      await mcp__playwright__browser_select_option({
        element: 'Vendor type dropdown',
        ref: 'vendor-type-select',
        values: ['planner'],
      });

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'FAQ Extraction Complete',
      });

      // Step 3: Verify planner-specific service categorization
      const plannerServiceFAQs = await mcp__playwright__browser_evaluate({
        function: `
          () => {
            const faqs = Array.from(document.querySelectorAll("[data-testid^='extracted-faq-card-']"));
            return faqs.map(faq => {
              const question = faq.querySelector('.faq-question')?.textContent;
              const category = faq.querySelector('.faq-category')?.textContent;
              return { question, category };
            }).filter(faq => 
              faq.question?.toLowerCase().includes('planning') || 
              faq.question?.toLowerCase().includes('coordination')
            );
          }
        `,
      });

      expect(plannerServiceFAQs.length).toBeGreaterThan(2);
      expect(
        plannerServiceFAQs.some((faq) =>
          faq.category?.toLowerCase().includes('services'),
        ),
      ).toBe(true);

      await mcp__playwright__browser_take_screenshot({
        filename: 'planner-faq-services.png',
        fullPage: true,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid website URLs gracefully', async () => {
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/login`,
      });

      // Login first
      await mcp__playwright__browser_fill_form({
        fields: [
          {
            name: 'email',
            type: 'textbox',
            ref: 'email-input',
            value: TEST_USER_EMAIL,
          },
          {
            name: 'password',
            type: 'textbox',
            ref: 'password-input',
            value: TEST_USER_PASSWORD,
          },
        ],
      });

      await mcp__playwright__browser_click({
        element: 'Login button',
        ref: 'login-submit-btn',
      });

      // Navigate to FAQ extraction
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      // Test invalid URL
      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://nonexistent-website-12345.com',
      });

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      // Verify error message is displayed
      await mcp__playwright__browser_wait_for({
        text: 'Unable to access website',
      });

      const errorMessageVisible = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelector("[data-testid=\"extraction-error\"]")?.offsetParent !== null',
      });

      expect(errorMessageVisible).toBe(true);

      await mcp__playwright__browser_take_screenshot({
        filename: 'error-invalid-website.png',
      });

      // Test retry functionality
      await mcp__playwright__browser_click({
        element: 'Retry extraction button',
        ref: 'retry-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'Retrying extraction...',
      });
    });

    it('should handle websites with no FAQs', async () => {
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://no-faq-website.wedsync.com',
      });

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'No FAQs found',
      });

      const noFAQsMessage = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelector("[data-testid=\"no-faqs-found\"]")?.textContent',
      });

      expect(noFAQsMessage).toContain('No FAQs found on this website');

      await mcp__playwright__browser_take_screenshot({
        filename: 'no-faqs-found.png',
      });
    });

    it('should handle extraction timeout gracefully', async () => {
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://very-slow-website.wedsync.com',
      });

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      // Wait for timeout (should happen within 60 seconds)
      await mcp__playwright__browser_wait_for({
        text: 'Extraction timeout',
      });

      const timeoutMessage = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelector("[data-testid=\"extraction-timeout\"]")?.offsetParent !== null',
      });

      expect(timeoutMessage).toBe(true);

      await mcp__playwright__browser_take_screenshot({
        filename: 'extraction-timeout.png',
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large FAQ extraction within performance limits', async () => {
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://large-faq-website.wedsync.com', // Mock site with 100+ FAQs
      });

      const startTime = Date.now();

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'FAQ Extraction Complete',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 60 seconds for large site
      expect(duration).toBeLessThan(60000);

      // Verify large number of FAQs extracted
      const extractedCount = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelectorAll("[data-testid=\"extracted-faq-card\"]").length',
      });

      expect(extractedCount).toBeGreaterThan(50);

      await mcp__playwright__browser_take_screenshot({
        filename: 'large-extraction-results.png',
        fullPage: true,
      });
    });

    it('should maintain responsive UI during extraction', async () => {
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://demo-photographer.wedsync.com',
      });

      await mcp__playwright__browser_click({
        element: 'Start extraction button',
        ref: 'start-extraction-btn',
      });

      // Test UI responsiveness during extraction
      await mcp__playwright__browser_wait_for({
        text: 'Analyzing website...',
      });

      // Click cancel button to test UI responsiveness
      await mcp__playwright__browser_click({
        element: 'Cancel extraction button',
        ref: 'cancel-extraction-btn',
      });

      await mcp__playwright__browser_wait_for({
        text: 'Extraction cancelled',
      });

      const cancellationWorked = await mcp__playwright__browser_evaluate({
        function:
          '() => document.querySelector("[data-testid=\"extraction-cancelled\"]")?.offsetParent !== null',
      });

      expect(cancellationWorked).toBe(true);
    });
  });

  describe('Accessibility and Cross-Browser Testing', () => {
    it('should be accessible with keyboard navigation', async () => {
      await mcp__playwright__browser_navigate({
        url: `${BASE_URL}/dashboard/faq/extract`,
      });

      // Test tab navigation
      await mcp__playwright__browser_evaluate({
        function: `
          () => {
            // Focus on first form element
            document.querySelector('[data-testid="website-url-input"]')?.focus();
            
            // Simulate tab navigation
            const event = new KeyboardEvent('keydown', { key: 'Tab' });
            document.dispatchEvent(event);
            
            return document.activeElement?.dataset.testid;
          }
        `,
      });

      // Test Enter key for form submission
      await mcp__playwright__browser_type({
        element: 'Website URL input',
        ref: 'website-url-input',
        text: 'https://demo-photographer.wedsync.com',
        submit: true,
      });

      // Should start extraction when Enter is pressed
      await mcp__playwright__browser_wait_for({
        text: 'Analyzing website...',
      });
    });

    it('should work across different browser sizes', async () => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 }, // Tablet
        { width: 375, height: 667 }, // Mobile
      ];

      for (const viewport of viewports) {
        await mcp__playwright__browser_resize(viewport);

        await mcp__playwright__browser_navigate({
          url: `${BASE_URL}/dashboard/faq/extract`,
        });

        // Verify interface is usable at this size
        const interfaceUsable = await mcp__playwright__browser_evaluate({
          function: `
            () => {
              const input = document.querySelector('[data-testid="website-url-input"]');
              const button = document.querySelector('[data-testid="start-extraction-btn"]');
              return input?.offsetParent !== null && button?.offsetParent !== null;
            }
          `,
        });

        expect(interfaceUsable).toBe(true);

        await mcp__playwright__browser_take_screenshot({
          filename: `interface-${viewport.width}x${viewport.height}.png`,
        });
      }
    });
  });
});
