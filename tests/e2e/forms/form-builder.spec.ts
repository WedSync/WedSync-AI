/**
 * WS-342 Advanced Form Builder Engine - E2E Tests with Playwright MCP
 * Team E - QA & Documentation Comprehensive Testing
 * 
 * Tests cover:
 * - Complete form creation workflow with drag-and-drop
 * - Form submission from couple perspective  
 * - Conditional logic workflows
 * - Mobile responsiveness (375px - 1920px)
 * - File uploads for wedding photos/contracts
 * - Visual screenshots at critical steps for evidence
 * - Wedding-specific scenarios (photographer intake, venue forms)
 * - Cross-browser compatibility testing
 */

import { test, expect } from '@playwright/test';

// Wedding-specific test data
const photographerFormData = {
  formName: 'Wedding Photography Intake Form',
  fields: [
    {
      type: 'text',
      label: 'Primary Contact Name',
      name: 'primary_contact',
      required: true
    },
    {
      type: 'email',
      label: 'Email Address',
      name: 'email',
      required: true
    },
    {
      type: 'date',
      label: 'Wedding Date',
      name: 'wedding_date',
      required: true
    },
    {
      type: 'select',
      label: 'Wedding Type',
      name: 'wedding_type',
      options: [
        { value: 'local', label: 'Local Wedding' },
        { value: 'destination', label: 'Destination Wedding' }
      ]
    },
    {
      type: 'textarea',
      label: 'Travel Requirements',
      name: 'travel_details',
      conditionalLogic: {
        showWhen: {
          field: 'wedding_type',
          equals: 'destination'
        }
      }
    }
  ]
};

const venueFormData = {
  formName: 'Venue Booking Questionnaire',
  fields: [
    {
      type: 'date',
      label: 'Preferred Wedding Date',
      name: 'event_date',
      required: true
    },
    {
      type: 'number',
      label: 'Guest Count',
      name: 'guest_count',
      required: true,
      validation: {
        min: 1,
        max: 500
      }
    },
    {
      type: 'select',
      label: 'Ceremony Type',
      name: 'ceremony_type',
      options: [
        { value: 'religious', label: 'Religious Ceremony' },
        { value: 'secular', label: 'Secular Ceremony' },
        { value: 'outdoor', label: 'Outdoor Ceremony' }
      ]
    },
    {
      type: 'file',
      label: 'Inspiration Images',
      name: 'inspiration_photos',
      accept: 'image/*',
      multiple: true
    }
  ]
};

// Custom test fixtures for wedding scenarios
test.describe('Advanced Form Builder E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to form builder
    await page.goto('http://localhost:3000/supplier/forms/new');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Form Builder Interface', () => {
    
    test('should display form builder with all field types available', async ({ page }) => {
      // Take initial screenshot of form builder
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-builder-initial.png',
        fullPage: true
      });

      // Verify form builder components are visible
      await expect(page.getByTestId('form-builder')).toBeVisible();
      await expect(page.getByTestId('field-palette')).toBeVisible();
      await expect(page.getByTestId('form-canvas')).toBeVisible();

      // Verify all 15+ field types are available
      const fieldTypes = [
        'text', 'email', 'phone', 'date', 'file', 'signature',
        'select', 'radio', 'checkbox', 'textarea', 'number',
        'payment', 'address', 'wedding-date', 'guest-count'
      ];

      for (const fieldType of fieldTypes) {
        await expect(page.getByTestId(`field-type-${fieldType}`)).toBeVisible();
      }

      // Take screenshot showing all field types
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-builder-field-types.png',
        clip: { x: 0, y: 0, width: 300, height: 600 }
      });
    });

    test('should create photographer intake form with drag-and-drop', async ({ page }) => {
      // Set form name
      await page.fill('[data-testid="form-name-input"]', photographerFormData.formName);
      
      // Take screenshot after naming
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-named.png'
      });

      // Add fields by clicking (simulating drag-and-drop)
      for (const field of photographerFormData.fields) {
        await page.click(`[data-testid="field-type-${field.type}"]`);
        
        // Configure field properties
        await page.fill('[data-testid="field-label-input"]', field.label);
        await page.fill('[data-testid="field-name-input"]', field.name);
        
        if (field.required) {
          await page.check('[data-testid="field-required-checkbox"]');
        }
        
        // Handle select field options
        if (field.type === 'select' && field.options) {
          for (const option of field.options) {
            await page.click('[data-testid="add-option-button"]');
            await page.fill('[data-testid="option-value-input"]:last-child', option.value);
            await page.fill('[data-testid="option-label-input"]:last-child', option.label);
          }
        }
        
        // Handle conditional logic
        if (field.conditionalLogic) {
          await page.click('[data-testid="add-conditional-logic"]');
          await page.selectOption('[data-testid="condition-field"]', field.conditionalLogic.showWhen.field);
          await page.selectOption('[data-testid="condition-operator"]', 'equals');
          await page.fill('[data-testid="condition-value"]', field.conditionalLogic.showWhen.equals);
        }
        
        await page.click('[data-testid="save-field"]');
      }

      // Take screenshot of completed form builder
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/photographer-form-built.png',
        fullPage: true
      });

      // Verify all fields were added
      for (const field of photographerFormData.fields) {
        await expect(page.getByText(field.label)).toBeVisible();
      }
    });

    test('should preview photographer intake form', async ({ page }) => {
      // Build the form first (simplified version for speed)
      await page.fill('[data-testid="form-name-input"]', photographerFormData.formName);
      
      // Add basic fields quickly
      await page.click('[data-testid="field-type-text"]');
      await page.fill('[data-testid="field-label-input"]', 'Primary Contact Name');
      await page.click('[data-testid="save-field"]');
      
      await page.click('[data-testid="field-type-email"]');
      await page.fill('[data-testid="field-label-input"]', 'Email Address');
      await page.click('[data-testid="save-field"]');

      // Click preview button
      await page.click('[data-testid="preview-form"]');

      // Wait for preview to load
      await page.waitForSelector('[data-testid="form-preview"]');

      // Take screenshot of form preview
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/photographer-form-preview.png',
        fullPage: true
      });

      // Verify preview shows form fields
      await expect(page.getByLabel('Primary Contact Name')).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeVisible();
    });
  });

  test.describe('Form Submission Flow', () => {
    
    test('should handle complete form submission from couple perspective', async ({ page }) => {
      // Navigate to a published form (mock URL)
      await page.goto('http://localhost:3000/forms/photographer-intake-123');
      
      // Take screenshot of form as couple would see it
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/couple-view-form.png',
        fullPage: true
      });

      // Fill out the form
      await page.fill('[name="primary_contact"]', 'Sarah & Michael Johnson');
      await page.fill('[name="email"]', 'sarah.johnson@example.com');
      await page.fill('[name="phone"]', '+1-555-0123');
      await page.fill('[name="wedding_date"]', '2024-08-15');
      await page.selectOption('[name="wedding_type"]', 'local');
      await page.fill('[name="guest_count"]', '150');
      await page.fill('[name="venue"]', 'Sunset Gardens');
      await page.fill('[name="photography_budget"]', '3500');

      // Take screenshot of filled form
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-filled-out.png',
        fullPage: true
      });

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for success message
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });

      // Take screenshot of success page
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-submission-success.png'
      });

      // Verify success message
      await expect(page.getByTestId('success-message')).toContainText('Form submitted successfully');
    });

    test('should handle form validation errors', async ({ page }) => {
      await page.goto('http://localhost:3000/forms/photographer-intake-123');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Wait for validation errors
      await page.waitForSelector('[data-testid="validation-error"]');

      // Take screenshot of validation errors
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-validation-errors.png',
        fullPage: true
      });

      // Verify required field errors are shown
      await expect(page.getByText('Primary Contact Name is required')).toBeVisible();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Wedding Date is required')).toBeVisible();
    });
  });

  test.describe('Conditional Logic Testing', () => {
    
    test('should show/hide fields based on conditional logic', async ({ page }) => {
      await page.goto('http://localhost:3000/forms/photographer-intake-123');

      // Initial state - travel details should be hidden
      await expect(page.getByLabel('Travel Requirements')).not.toBeVisible();

      // Take screenshot of initial state
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/conditional-initial-state.png'
      });

      // Select destination wedding
      await page.selectOption('[name="wedding_type"]', 'destination');

      // Wait for conditional field to appear
      await page.waitForSelector('[name="travel_details"]', { state: 'visible' });

      // Take screenshot showing conditional field
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/conditional-field-shown.png'
      });

      // Verify travel details field is now visible
      await expect(page.getByLabel('Travel Requirements')).toBeVisible();

      // Change back to local wedding
      await page.selectOption('[name="wedding_type"]', 'local');

      // Verify travel details field is hidden again
      await expect(page.getByLabel('Travel Requirements')).not.toBeVisible();

      // Take screenshot of field hidden again
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/conditional-field-hidden.png'
      });
    });
  });

  test.describe('File Upload Testing', () => {
    
    test('should handle wedding photo uploads', async ({ page }) => {
      await page.goto('http://localhost:3000/forms/venue-booking-456');

      // Create a mock file for testing
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-testid="file-upload-inspiration-photos"]');
      const fileChooser = await fileChooserPromise;

      // Simulate selecting wedding photos
      await fileChooser.setFiles([
        {
          name: 'wedding-inspiration-1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-data')
        },
        {
          name: 'wedding-inspiration-2.jpg', 
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-data-2')
        }
      ]);

      // Wait for file upload progress
      await page.waitForSelector('[data-testid="upload-progress"]');

      // Take screenshot of file upload in progress
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/file-upload-progress.png'
      });

      // Wait for upload completion
      await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 15000 });

      // Take screenshot of completed upload
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/file-upload-complete.png'
      });

      // Verify files were uploaded
      await expect(page.getByText('wedding-inspiration-1.jpg')).toBeVisible();
      await expect(page.getByText('wedding-inspiration-2.jpg')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness Testing', () => {
    
    test('should display correctly on mobile devices (375px width)', async ({ page }) => {
      // Set mobile viewport (iPhone SE size)
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('http://localhost:3000/supplier/forms/new');

      // Take mobile screenshot of form builder
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-builder-mobile-375px.png',
        fullPage: true
      });

      // Verify mobile menu button is visible
      await expect(page.getByTestId('mobile-menu-button')).toBeVisible();

      // Verify field palette is accessible on mobile
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.getByTestId('field-palette')).toBeVisible();

      // Test adding a field on mobile
      await page.click('[data-testid="field-type-text"]');
      
      // Take screenshot of field configuration on mobile
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/mobile-field-config.png'
      });
    });

    test('should display correctly on tablet devices (768px width)', async ({ page }) => {
      // Set tablet viewport (iPad size)
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('http://localhost:3000/supplier/forms/new');

      // Take tablet screenshot
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-builder-tablet-768px.png',
        fullPage: true
      });

      // Verify tablet layout shows both palette and canvas
      await expect(page.getByTestId('field-palette')).toBeVisible();
      await expect(page.getByTestId('form-canvas')).toBeVisible();
    });

    test('should display correctly on desktop (1920px width)', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('http://localhost:3000/supplier/forms/new');

      // Take desktop screenshot
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/form-builder-desktop-1920px.png',
        fullPage: true
      });

      // Verify desktop layout with full width
      await expect(page.getByTestId('field-palette')).toBeVisible();
      await expect(page.getByTestId('form-canvas')).toBeVisible();
      await expect(page.getByTestId('form-properties-panel')).toBeVisible();
    });

    test('should handle touch interactions on mobile form submission', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/forms/photographer-intake-123');

      // Test touch scrolling and form filling
      await page.fill('[name="primary_contact"]', 'Mobile Test Couple');
      
      // Scroll to bottom using touch
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Take screenshot of mobile form bottom
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/mobile-form-bottom.png'
      });

      // Test mobile form submission
      await page.tap('button[type="submit"]');

      // Verify mobile success message
      await page.waitForSelector('[data-testid="mobile-success-message"]');
      
      // Take screenshot of mobile success
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/mobile-submission-success.png'
      });
    });
  });

  test.describe('Performance Testing', () => {
    
    test('should load form builder within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000/supplier/forms/new');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Take screenshot for performance evidence
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/performance-test-loaded.png'
      });

      // Verify page loads within performance requirements
      expect(loadTime).toBeLessThan(2000); // 2 seconds max
    });

    test('should handle 50+ field form without performance degradation', async ({ page }) => {
      await page.goto('http://localhost:3000/supplier/forms/new');
      
      const startTime = Date.now();

      // Add 50 fields programmatically (simulate drag-and-drop)
      for (let i = 0; i < 50; i++) {
        await page.click('[data-testid="field-type-text"]');
        await page.fill('[data-testid="field-label-input"]', `Field ${i + 1}`);
        await page.click('[data-testid="save-field"]');
        
        // Check performance periodically
        if (i % 10 === 0) {
          const currentTime = Date.now() - startTime;
          expect(currentTime).toBeLessThan(10000); // 10 seconds max for 50 fields
        }
      }

      const totalTime = Date.now() - startTime;

      // Take screenshot of large form
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/50-field-form.png',
        fullPage: true
      });

      // Test preview render performance
      const previewStartTime = Date.now();
      await page.click('[data-testid="preview-form"]');
      await page.waitForSelector('[data-testid="form-preview"]');
      const previewTime = Date.now() - previewStartTime;

      // Take screenshot of large form preview
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/50-field-form-preview.png',
        fullPage: true
      });

      // Verify performance requirements
      expect(totalTime).toBeLessThan(15000); // 15 seconds max for 50 fields
      expect(previewTime).toBeLessThan(3000); // 3 seconds max for preview
    });
  });

  test.describe('Wedding Industry Specific Scenarios', () => {
    
    test('should handle venue capacity-based conditional logic', async ({ page }) => {
      await page.goto('http://localhost:3000/forms/venue-booking-456');

      // Fill initial fields
      await page.fill('[name="event_date"]', '2024-08-17'); // Saturday
      
      // Test guest count trigger for venue capacity
      await page.fill('[name="guest_count"]', '200');

      // Wait for capacity-related fields to appear
      await page.waitForSelector('[name="catering_options"]', { state: 'visible' });

      // Take screenshot showing conditional venue fields
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/venue-capacity-conditional.png'
      });

      // Verify large wedding specific fields appear
      await expect(page.getByLabel('Catering Options')).toBeVisible();
      await expect(page.getByLabel('Additional Staff Required')).toBeVisible();
    });

    test('should handle multi-vendor coordination workflow', async ({ page }) => {
      await page.goto('http://localhost:3000/forms/wedding-coordination-789');

      // Select multiple vendor types
      await page.check('[name="vendors[]"][value="photographer"]');
      await page.check('[name="vendors[]"][value="florist"]');  
      await page.check('[name="vendors[]"][value="catering"]');

      // Take screenshot of vendor selection
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/multi-vendor-selection.png'
      });

      // Fill coordination details
      await page.fill('[name="timeline_changes"]', 'Moved ceremony start time to 4:30 PM');
      await page.fill('[name="special_instructions"]', 'Outdoor ceremony - weather backup plan needed');

      // Submit coordination form
      await page.click('button[type="submit"]');

      // Wait for vendor notification confirmation
      await page.waitForSelector('[data-testid="vendor-notifications-sent"]');

      // Take screenshot of coordination success
      await page.screenshot({
        path: 'wedsync/tests/e2e/screenshots/vendor-coordination-success.png'
      });

      // Verify multiple vendors were notified
      await expect(page.getByText('3 vendors have been notified')).toBeVisible();
    });

    test('should handle wedding day emergency form (Saturday protection)', async ({ page }) => {
      // Simulate Saturday wedding day scenario
      const today = new Date();
      const isSaturday = today.getDay() === 6;
      
      await page.goto('http://localhost:3000/forms/emergency-contact-update');

      if (isSaturday) {
        // Verify read-only mode on Saturday
        await expect(page.getByText('Read-only mode: Wedding day protection')).toBeVisible();
        
        // Take screenshot of Saturday protection
        await page.screenshot({
          path: 'wedsync/tests/e2e/screenshots/saturday-wedding-protection.png'
        });
      } else {
        // Normal operation on non-Saturday
        await page.fill('[name="emergency_contact"]', 'Updated emergency contact');
        await page.click('button[type="submit"]');
        
        // Take screenshot of normal form submission
        await page.screenshot({
          path: 'wedsync/tests/e2e/screenshots/emergency-form-updated.png'
        });
      }
    });
  });
});

// Cross-browser testing setup
test.describe('Cross-Browser Compatibility', () => {
  
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `This test is only for ${browserName}`);
      
      await page.goto('http://localhost:3000/supplier/forms/new');
      
      // Basic functionality test
      await page.fill('[data-testid="form-name-input"]', `Test Form - ${browserName}`);
      await page.click('[data-testid="field-type-text"]');
      
      // Take browser-specific screenshot
      await page.screenshot({
        path: `wedsync/tests/e2e/screenshots/form-builder-${browserName}.png`
      });
      
      // Verify basic functionality works
      await expect(page.getByTestId('form-canvas')).toBeVisible();
    });
  });
});

export { photographerFormData, venueFormData };