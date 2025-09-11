/**
 * WS-342: Advanced Form Builder Engine - End-to-End Tests
 * Team B - Backend Implementation Round 1
 *
 * Complete E2E testing of the advanced form builder including:
 * - Form creation workflow
 * - Real-time validation
 * - Conditional logic interactions
 * - Form submission process
 * - Mobile responsiveness
 * - Performance requirements (<2s load, <500ms interactions)
 * - Wedding industry specific workflows
 */

import { test, expect, Page } from '@playwright/test';
import { FormBuilderPageObject } from '../page-objects/form-builder.page';
import { WeddingFormWorkflow } from '../workflows/wedding-form.workflow';

// Test configuration
test.describe.configure({ mode: 'parallel' });

// Test data
const testFormData = {
  title: 'Wedding Photography Client Form',
  description: 'Comprehensive intake form for wedding photography clients',
  fields: [
    {
      type: 'date',
      label: 'Wedding Date',
      required: true,
      id: 'wedding-date',
    },
    {
      type: 'select',
      label: 'Wedding Type',
      required: true,
      id: 'wedding-type',
      options: ['Indoor', 'Outdoor', 'Destination'],
    },
    {
      type: 'number',
      label: 'Guest Count',
      required: true,
      id: 'guest-count',
      min: 1,
      max: 1000,
    },
    {
      type: 'checkbox',
      label: 'Weather Backup Plan',
      required: false,
      id: 'weather-backup',
    },
  ],
};

test.describe('WS-342 Advanced Form Builder Engine - E2E Tests', () => {
  let formBuilderPage: FormBuilderPageObject;
  let weddingWorkflow: WeddingFormWorkflow;

  test.beforeEach(async ({ page }) => {
    formBuilderPage = new FormBuilderPageObject(page);
    weddingWorkflow = new WeddingFormWorkflow(page);

    // Navigate to form builder
    await page.goto('/forms/builder');
    await expect(
      page.locator('[data-testid="form-builder-canvas"]'),
    ).toBeVisible();
  });

  test.describe('Form Creation and Builder Interface', () => {
    test('should create advanced form with drag-and-drop fields', async ({
      page,
    }) => {
      // Start performance timing
      const startTime = Date.now();

      // Create new form
      await formBuilderPage.clickCreateNewForm();
      await formBuilderPage.fillFormBasics({
        title: testFormData.title,
        description: testFormData.description,
      });

      // Drag and drop fields
      for (const field of testFormData.fields) {
        await formBuilderPage.dragFieldToCanvas(field.type, field.label);
        await formBuilderPage.configureField(field.id, {
          label: field.label,
          required: field.required,
          ...field,
        });
      }

      // Verify form creation performance
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(2000); // <2s requirement

      // Verify all fields are present
      for (const field of testFormData.fields) {
        await expect(
          page.locator(`[data-field-id="${field.id}"]`),
        ).toBeVisible();
      }

      // Save form
      await formBuilderPage.saveForm();
      await expect(
        page.locator('[data-testid="form-saved-success"]'),
      ).toBeVisible();
    });

    test('should set up conditional logic rules', async ({ page }) => {
      await formBuilderPage.clickCreateNewForm();
      await formBuilderPage.fillFormBasics(testFormData);

      // Add fields first
      await formBuilderPage.dragFieldToCanvas('select', 'Wedding Type');
      await formBuilderPage.dragFieldToCanvas(
        'checkbox',
        'Weather Backup Plan',
      );

      // Set up conditional logic: Show weather backup for outdoor weddings
      await formBuilderPage.openConditionalLogicPanel();
      await formBuilderPage.createConditionalRule({
        name: 'Show weather backup for outdoor weddings',
        condition: {
          sourceField: 'wedding-type',
          operator: 'equals',
          value: 'Outdoor',
        },
        action: {
          type: 'show_field',
          targetField: 'weather-backup',
        },
      });

      // Test conditional logic immediately
      await formBuilderPage.selectPreviewMode();

      // Initially, weather backup should be hidden
      await expect(
        page.locator('[data-field-id="weather-backup"]'),
      ).toBeHidden();

      // Select outdoor wedding type
      await page.selectOption('[data-field-id="wedding-type"]', 'Outdoor');

      // Weather backup should appear with animation
      await expect(
        page.locator('[data-field-id="weather-backup"]'),
      ).toBeVisible({ timeout: 1000 });

      // Change to indoor - should hide again
      await page.selectOption('[data-field-id="wedding-type"]', 'Indoor');
      await expect(
        page.locator('[data-field-id="weather-backup"]'),
      ).toBeHidden();
    });

    test('should validate real-time field validation performance', async ({
      page,
    }) => {
      await formBuilderPage.clickCreateNewForm();
      await formBuilderPage.fillFormBasics(testFormData);

      // Add email field with validation
      await formBuilderPage.dragFieldToCanvas('email', 'Client Email');
      await formBuilderPage.configureField('client-email', {
        label: 'Client Email',
        required: true,
        validation: {
          pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
        },
      });

      await formBuilderPage.selectPreviewMode();

      // Test real-time validation performance
      const emailField = page.locator('[data-field-id="client-email"]');

      // Type invalid email
      const validationStartTime = Date.now();
      await emailField.fill('invalid-email');

      // Should show validation error quickly
      await expect(
        page.locator('[data-testid="field-validation-error"]'),
      ).toBeVisible({ timeout: 100 });
      const validationTime = Date.now() - validationStartTime;
      expect(validationTime).toBeLessThan(50); // <50ms requirement

      // Type valid email - error should disappear
      await emailField.fill('client@example.com');
      await expect(
        page.locator('[data-testid="field-validation-error"]'),
      ).toBeHidden();
    });

    test('should handle form with 50+ fields without performance degradation', async ({
      page,
    }) => {
      await formBuilderPage.clickCreateNewForm();
      await formBuilderPage.fillFormBasics({
        title: 'Large Wedding Questionnaire',
        description: 'Comprehensive form with many fields',
      });

      const startTime = Date.now();

      // Add 50+ fields of various types
      const fieldTypes = [
        'text',
        'email',
        'tel',
        'number',
        'select',
        'radio',
        'checkbox',
        'textarea',
        'date',
      ];

      for (let i = 0; i < 55; i++) {
        const fieldType = fieldTypes[i % fieldTypes.length];
        await formBuilderPage.dragFieldToCanvas(fieldType, `Field ${i + 1}`);
      }

      const builderTime = Date.now() - startTime;
      expect(builderTime).toBeLessThan(5000); // Should handle large forms

      // Test form rendering performance
      const renderStartTime = Date.now();
      await formBuilderPage.selectPreviewMode();
      await expect(page.locator('[data-field-id]').first()).toBeVisible();

      const renderTime = Date.now() - renderStartTime;
      expect(renderTime).toBeLessThan(1000); // Should render quickly

      // Verify all fields are present
      const fieldCount = await page.locator('[data-field-id]').count();
      expect(fieldCount).toBe(55);
    });
  });

  test.describe('Wedding Industry Specific Workflows', () => {
    test('should handle complete wedding photography intake workflow', async ({
      page,
    }) => {
      await weddingWorkflow.createWeddingPhotographyForm();

      // Verify wedding-specific field types are available
      await expect(
        page.locator('[data-field-type="guest-list"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-field-type="seating-chart"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-field-type="timeline-builder"]'),
      ).toBeVisible();

      // Add wedding photography specific fields
      await formBuilderPage.dragFieldToCanvas(
        'guest-list',
        'Wedding Guest List',
      );
      await formBuilderPage.dragFieldToCanvas(
        'timeline-builder',
        'Wedding Day Timeline',
      );
      await formBuilderPage.dragFieldToCanvas(
        'budget-calculator',
        'Photography Budget',
      );

      // Configure budget calculator with wedding-specific ranges
      await formBuilderPage.configureField('photography-budget', {
        label: 'Photography Budget',
        min: 1000,
        max: 50000,
        step: 500,
        weddingContext: {
          category: 'photography',
          priority: 'critical',
        },
      });

      // Set up wedding date validation
      await formBuilderPage.configureField('wedding-date', {
        label: 'Wedding Date',
        validation: {
          dateRange: {
            min: new Date().toISOString().split('T')[0], // Today
            max: '2026-12-31',
          },
          customValidation: 'no_saturday_weddings_during_blackout',
        },
      });

      await formBuilderPage.saveForm();
      await expect(
        page.locator('[data-testid="wedding-form-saved"]'),
      ).toBeVisible();
    });

    test('should enforce wedding day protection (no edits on Saturdays)', async ({
      page,
    }) => {
      // Mock current date as Saturday
      await page.addInitScript(() => {
        const originalDate = Date;
        // @ts-ignore
        global.Date = class extends originalDate {
          constructor(...args) {
            if (args.length === 0) {
              super('2024-06-15T10:00:00Z'); // Saturday
            } else {
              super(...args);
            }
          }
        };
      });

      await page.goto('/forms/builder');

      // Should show Saturday warning
      await expect(
        page.locator('[data-testid="saturday-warning"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="saturday-warning"]'),
      ).toContainText('Wedding day protection active');

      // Form builder should be in read-only mode
      await expect(
        page.locator('[data-testid="form-builder-canvas"]'),
      ).toHaveAttribute('data-readonly', 'true');

      // Drag and drop should be disabled
      const dragResult = await formBuilderPage.attemptDragFieldToCanvas(
        'text',
        'Test Field',
      );
      expect(dragResult).toBe(false); // Should fail on Saturday
    });

    test('should handle venue-specific form configurations', async ({
      page,
    }) => {
      await weddingWorkflow.createVenueIntakeForm();

      // Add venue-specific fields
      await formBuilderPage.dragFieldToCanvas(
        'location-picker',
        'Ceremony Location',
      );
      await formBuilderPage.dragFieldToCanvas(
        'seating-chart',
        'Reception Seating',
      );
      await formBuilderPage.dragFieldToCanvas(
        'multi-select',
        'Venue Services Needed',
      );

      // Configure venue services with conditional pricing
      await formBuilderPage.configureField('venue-services', {
        label: 'Venue Services Needed',
        options: [
          { label: 'Catering', value: 'catering', price: 5000 },
          { label: 'Bar Service', value: 'bar', price: 2000 },
          { label: 'DJ/Music', value: 'dj', price: 1500 },
          { label: 'Decorations', value: 'decorations', price: 3000 },
        ],
      });

      // Set up automatic pricing calculation
      await formBuilderPage.createConditionalRule({
        name: 'Calculate venue total',
        condition: {
          sourceField: 'venue-services',
          operator: 'is_not_empty',
          value: null,
        },
        action: {
          type: 'calculate_value',
          targetField: 'venue-total',
          value: 'sum_selected_options(venue-services)',
        },
      });

      await formBuilderPage.saveForm();
    });
  });

  test.describe('Form Submission and Data Processing', () => {
    test('should complete full form submission workflow with wedding data', async ({
      page,
    }) => {
      // Create and publish form
      await weddingWorkflow.createWeddingPhotographyForm();
      await formBuilderPage.publishForm();

      // Navigate to public form
      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Fill out form with wedding data
      await page.fill('[data-field-id="client-name"]', 'John & Jane Smith');
      await page.fill(
        '[data-field-id="client-email"]',
        'john.jane@example.com',
      );
      await page.fill('[data-field-id="wedding-date"]', '2024-06-15');
      await page.selectOption('[data-field-id="wedding-type"]', 'Outdoor');

      // Should trigger conditional logic to show weather backup
      await expect(
        page.locator('[data-field-id="weather-backup"]'),
      ).toBeVisible();
      await page.check('[data-field-id="weather-backup"]');

      await page.fill('[data-field-id="guest-count"]', '150');
      await page.fill('[data-field-id="budget"]', '25000');

      // Upload wedding inspiration photos
      const fileInput = page.locator(
        '[data-field-id="inspiration-photos"] input[type="file"]',
      );
      await fileInput.setInputFiles([
        'test-files/wedding-inspiration-1.jpg',
        'test-files/wedding-inspiration-2.jpg',
      ]);

      // Verify file upload progress
      await expect(
        page.locator('[data-testid="upload-progress"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible(
        { timeout: 10000 },
      );

      // Submit form
      const submitStartTime = Date.now();
      await page.click('[data-testid="submit-form-button"]');

      // Should show success message quickly
      await expect(
        page.locator('[data-testid="form-success-message"]'),
      ).toBeVisible({ timeout: 2000 });
      const submitTime = Date.now() - submitStartTime;
      expect(submitTime).toBeLessThan(1000); // <1s submission requirement

      // Verify confirmation details
      await expect(
        page.locator('[data-testid="confirmation-code"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="wedding-date-confirmation"]'),
      ).toContainText('June 15, 2024');
    });

    test('should handle form validation errors gracefully', async ({
      page,
    }) => {
      await weddingWorkflow.createWeddingPhotographyForm();
      await formBuilderPage.publishForm();

      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Try to submit form without required fields
      await page.click('[data-testid="submit-form-button"]');

      // Should show validation errors
      await expect(
        page.locator('[data-testid="validation-errors"]'),
      ).toBeVisible();

      // Should highlight missing required fields
      await expect(
        page.locator('[data-field-id="client-name"][data-error="true"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-field-id="wedding-date"][data-error="true"]'),
      ).toBeVisible();

      // Fill one field and verify others still show errors
      await page.fill('[data-field-id="client-name"]', 'John Smith');
      await page.blur('[data-field-id="client-name"]');

      // This field should clear its error
      await expect(
        page.locator('[data-field-id="client-name"][data-error="true"]'),
      ).not.toBeVisible();

      // Others should still have errors
      await expect(
        page.locator('[data-field-id="wedding-date"][data-error="true"]'),
      ).toBeVisible();
    });

    test('should auto-save form progress during completion', async ({
      page,
    }) => {
      await weddingWorkflow.createWeddingPhotographyForm();

      // Enable auto-save feature
      await formBuilderPage.configureFormSettings({
        autoSave: true,
        autoSaveInterval: 5, // 5 seconds
      });

      await formBuilderPage.publishForm();

      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Start filling form
      await page.fill('[data-field-id="client-name"]', 'John Smith');

      // Wait for auto-save
      await expect(
        page.locator('[data-testid="auto-save-indicator"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="auto-save-complete"]'),
      ).toBeVisible({ timeout: 6000 });

      // Refresh page - data should persist
      await page.reload();
      await expect(page.locator('[data-field-id="client-name"]')).toHaveValue(
        'John Smith',
      );
    });
  });

  test.describe('Mobile Responsiveness and Accessibility', () => {
    test('should work perfectly on mobile devices', async ({
      page,
      isMobile,
    }) => {
      // Set mobile viewport if not already mobile
      if (!isMobile) {
        await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      }

      await weddingWorkflow.createWeddingPhotographyForm();
      await formBuilderPage.publishForm();

      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Verify mobile-optimized form layout
      await expect(
        page.locator('[data-testid="mobile-form-container"]'),
      ).toBeVisible();

      // Fields should stack vertically on mobile
      const fields = page.locator('[data-field-id]');
      const fieldCount = await fields.count();

      for (let i = 0; i < fieldCount; i++) {
        const field = fields.nth(i);
        const boundingBox = await field.boundingBox();
        expect(boundingBox?.width).toBeLessThan(400); // Should fit in mobile width
      }

      // Touch interactions should work
      await page.tap('[data-field-id="wedding-type"]');
      await expect(
        page.locator('[data-field-id="wedding-type"] [role="listbox"]'),
      ).toBeVisible();

      // Date picker should work on mobile
      await page.tap('[data-field-id="wedding-date"]');
      await expect(
        page.locator('[data-testid="mobile-date-picker"]'),
      ).toBeVisible();

      // Submit button should be easily tappable (48px minimum)
      const submitButton = page.locator('[data-testid="submit-form-button"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(48);
      expect(buttonBox?.width).toBeGreaterThanOrEqual(48);
    });

    test('should meet WCAG accessibility standards', async ({ page }) => {
      await weddingWorkflow.createWeddingPhotographyForm();
      await formBuilderPage.publishForm();

      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Check form has proper semantic structure
      await expect(page.locator('form[role="form"]')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible(); // Form title

      // All form fields should have labels
      const fields = page.locator('input, select, textarea');
      const fieldCount = await fields.count();

      for (let i = 0; i < fieldCount; i++) {
        const field = fields.nth(i);
        const fieldId = await field.getAttribute('id');

        // Should have associated label
        const label = page.locator(`label[for="${fieldId}"]`);
        await expect(label).toBeVisible();
      }

      // Required fields should be marked
      const requiredFields = page.locator(
        'input[required], select[required], textarea[required]',
      );
      const requiredCount = await requiredFields.count();

      for (let i = 0; i < requiredCount; i++) {
        const field = requiredFields.nth(i);
        await expect(field).toHaveAttribute('aria-required', 'true');
      }

      // Error messages should be properly associated
      await page.click('[data-testid="submit-form-button"]'); // Trigger validation errors

      const errorFields = page.locator('[data-error="true"]');
      const errorCount = await errorFields.count();

      for (let i = 0; i < errorCount; i++) {
        const field = errorFields.nth(i);
        const ariaDescribedBy = await field.getAttribute('aria-describedby');
        expect(ariaDescribedBy).toBeTruthy();

        // Error message should exist
        const errorMessage = page.locator(`#${ariaDescribedBy}`);
        await expect(errorMessage).toBeVisible();
      }

      // Form should be keyboard navigable
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should work offline with service worker', async ({ page }) => {
      await weddingWorkflow.createWeddingPhotographyForm();
      await formBuilderPage.publishForm();

      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Verify service worker is registered
      const swRegistration = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(swRegistration).toBe(true);

      // Fill form partially
      await page.fill('[data-field-id="client-name"]', 'John Smith');
      await page.fill('[data-field-id="wedding-date"]', '2024-06-15');

      // Simulate going offline
      await page.setOfflineMode(true);

      // Should show offline indicator
      await expect(
        page.locator('[data-testid="offline-indicator"]'),
      ).toBeVisible();

      // Form should still be usable
      await page.fill('[data-field-id="guest-count"]', '150');

      // Try to submit - should queue for later
      await page.click('[data-testid="submit-form-button"]');
      await expect(
        page.locator('[data-testid="offline-queued-message"]'),
      ).toBeVisible();

      // Go back online
      await page.setOfflineMode(false);

      // Should auto-submit queued form
      await expect(
        page.locator('[data-testid="form-success-message"]'),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent form submissions', async ({
      browser,
    }) => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);

      const pages = await Promise.all(
        contexts.map((context) => context.newPage()),
      );

      // Set up form once
      const setupPage = pages[0];
      const formBuilderPage = new FormBuilderPageObject(setupPage);
      const weddingWorkflow = new WeddingFormWorkflow(setupPage);

      await setupPage.goto('/forms/builder');
      await weddingWorkflow.createWeddingPhotographyForm();
      await formBuilderPage.publishForm();
      const formUrl = await formBuilderPage.getPublicFormUrl();

      // Submit forms concurrently
      const submissionPromises = pages.map(async (page, index) => {
        await page.goto(formUrl);

        await page.fill('[data-field-id="client-name"]', `Client ${index + 1}`);
        await page.fill(
          '[data-field-id="client-email"]',
          `client${index + 1}@example.com`,
        );
        await page.fill('[data-field-id="wedding-date"]', '2024-06-15');
        await page.selectOption('[data-field-id="wedding-type"]', 'Outdoor');
        await page.fill('[data-field-id="guest-count"]', '150');

        const startTime = Date.now();
        await page.click('[data-testid="submit-form-button"]');
        await expect(
          page.locator('[data-testid="form-success-message"]'),
        ).toBeVisible();

        return Date.now() - startTime;
      });

      const submissionTimes = await Promise.all(submissionPromises);

      // All submissions should complete within reasonable time
      submissionTimes.forEach((time) => {
        expect(time).toBeLessThan(3000); // <3s even under load
      });

      // Average response time should be good
      const avgTime =
        submissionTimes.reduce((a, b) => a + b, 0) / submissionTimes.length;
      expect(avgTime).toBeLessThan(1500);

      // Cleanup
      await Promise.all(contexts.map((context) => context.close()));
    });

    test('should maintain performance with large forms (100+ fields)', async ({
      page,
    }) => {
      await formBuilderPage.clickCreateNewForm();
      await formBuilderPage.fillFormBasics({
        title: 'Enterprise Wedding Questionnaire',
        description: 'Comprehensive form with 100+ fields',
      });

      // Create form with 100+ fields
      const fieldTypes = [
        'text',
        'email',
        'tel',
        'number',
        'select',
        'checkbox',
        'textarea',
        'date',
        'time',
      ];

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const fieldType = fieldTypes[i % fieldTypes.length];
        await formBuilderPage.dragFieldToCanvas(fieldType, `Field ${i + 1}`);

        // Add some conditional logic to make it realistic
        if (i % 10 === 0 && i > 0) {
          await formBuilderPage.createConditionalRule({
            name: `Rule ${i / 10}`,
            condition: {
              sourceField: `field-${i - 9}`,
              operator: 'is_not_empty',
              value: null,
            },
            action: {
              type: 'show_field',
              targetField: `field-${i}`,
            },
          });
        }
      }

      const buildTime = Date.now() - startTime;
      expect(buildTime).toBeLessThan(30000); // Should build large form in <30s

      // Save and publish
      await formBuilderPage.saveForm();
      await formBuilderPage.publishForm();

      // Test form loading performance
      const formUrl = await formBuilderPage.getPublicFormUrl();

      const loadStartTime = Date.now();
      await page.goto(formUrl);
      await expect(page.locator('[data-field-id]').first()).toBeVisible();

      const loadTime = Date.now() - loadStartTime;
      expect(loadTime).toBeLessThan(3000); // Large form should load in <3s

      // Test form interaction performance
      const field = page.locator('[data-field-id="field-1"]');

      const interactionStartTime = Date.now();
      await field.fill('Test value');
      await field.blur();

      const interactionTime = Date.now() - interactionStartTime;
      expect(interactionTime).toBeLessThan(100); // Interactions should be fast
    });

    test('should handle file uploads efficiently', async ({ page }) => {
      await weddingWorkflow.createWeddingPhotographyForm();

      // Add multiple file upload fields
      await formBuilderPage.dragFieldToCanvas(
        'image-upload',
        'Engagement Photos',
      );
      await formBuilderPage.dragFieldToCanvas(
        'document-upload',
        'Wedding Contracts',
      );
      await formBuilderPage.dragFieldToCanvas('video-upload', 'Wedding Videos');

      await formBuilderPage.publishForm();

      const formUrl = await formBuilderPage.getPublicFormUrl();
      await page.goto(formUrl);

      // Upload multiple files concurrently
      const uploadPromises = [
        page
          .locator('[data-field-id="engagement-photos"] input[type="file"]')
          .setInputFiles([
            'test-files/photo1.jpg',
            'test-files/photo2.jpg',
            'test-files/photo3.jpg',
          ]),
        page
          .locator('[data-field-id="wedding-contracts"] input[type="file"]')
          .setInputFiles(['test-files/contract.pdf']),
        page
          .locator('[data-field-id="wedding-videos"] input[type="file"]')
          .setInputFiles(['test-files/video.mp4']),
      ];

      const uploadStartTime = Date.now();
      await Promise.all(uploadPromises);

      // Wait for all uploads to complete
      await expect(
        page.locator('[data-testid="all-uploads-complete"]'),
      ).toBeVisible({ timeout: 30000 });

      const uploadTime = Date.now() - uploadStartTime;
      expect(uploadTime).toBeLessThan(25000); // Multiple uploads should complete in <25s

      // Verify virus scanning completed
      await expect(
        page.locator('[data-testid="virus-scan-complete"]'),
      ).toBeVisible();
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up any test data
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }
    });
  });
});
