/**
 * End-to-End Tests for Meeting Scheduler Booking Workflow
 * WS-064: Meeting Scheduler - Complete Workflow Testing
 * 
 * Tests the complete booking flow from booking page creation to confirmation
 * Uses Playwright MCP for visual testing and performance validation
 */

import { test, expect } from '@playwright/test';

test.describe('Meeting Scheduler - Complete Booking Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Mock API responses for consistent testing
    await page.route('**/api/calendar/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, eventId: 'mock-event-123' })
      });
    });

    await page.route('**/api/bookings/**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            bookingId: 'BOOK-' + Math.random().toString(36).substr(2, 8).toUpperCase()
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/clients/lookup', (route) => {
      const email = new URL(route.request().url()).searchParams.get('email');
      if (email === 'existing@client.com') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'client-123',
            name: 'John & Jane Smith',
            email: 'existing@client.com',
            phone: '+44 7123 456789',
            wedding_date: '2024-06-15',
            partner_name: 'Jane Smith',
            venue_name: 'The Grand Hotel',
            guest_count: 100,
            wedding_style: 'Classic'
          })
        });
      } else {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Client not found' })
        });
      }
    });
  });

  test('Complete Supplier Booking Page Setup Flow', async ({ page }) => {
    // Navigate to booking page builder
    await page.goto('/scheduling/setup');
    
    await test.step('Create new booking page', async () => {
      // Should show booking page builder
      await expect(page.getByText('Create Booking Page')).toBeVisible();
      
      // Fill basic information
      await page.getByLabel('Page Title').fill('Wedding Planning Consultations');
      await page.getByLabel('URL Slug').fill('wedding-consultations');
      await page.getByLabel('Description').fill('Book a personalized consultation to discuss your wedding plans');
      
      // Verify live preview updates
      await expect(page.getByText('Wedding Planning Consultations')).toBeVisible();
    });

    await test.step('Configure meeting types', async () => {
      // Switch to meetings tab
      await page.getByRole('tab', { name: 'Meetings' }).click();
      
      // Default meeting type should be present
      await expect(page.getByDisplayValue('Initial Consultation')).toBeVisible();
      
      // Add custom meeting type
      await page.getByText('Add Meeting Type').click();
      await page.getByLabel('Name').nth(1).fill('Venue Visit');
      await page.getByLabel('Duration (minutes)').nth(1).fill('60');
      await page.getByLabel('Location').nth(1).fill('Client Location');
    });

    await test.step('Set availability schedule', async () => {
      // Switch to schedule tab
      await page.getByRole('tab', { name: 'Schedule' }).click();
      
      // Verify weekly availability is shown
      await expect(page.getByText('Monday')).toBeVisible();
      await expect(page.getByText('Tuesday')).toBeVisible();
      
      // Enable weekend availability
      await page.locator('[data-day="saturday"] input[type="checkbox"]').check();
      await page.locator('[data-time="start"][data-day="saturday"]').fill('10:00');
      await page.locator('[data-time="end"][data-day="saturday"]').fill('16:00');
    });

    await test.step('Configure branding', async () => {
      // Switch to branding tab
      await page.getByRole('tab', { name: 'Brand' }).click();
      
      // Set custom brand color
      await page.getByLabel('Brand Color').fill('#8B5CF6');
      
      // Verify preview updates with new color
      const previewHeader = page.locator('[data-testid="preview-header"]');
      await expect(previewHeader).toHaveCSS('background-color', 'rgb(139, 92, 246)');
    });

    await test.step('Save booking page', async () => {
      // Save the booking page
      await page.getByText('Save Page').click();
      
      // Should show success message
      await expect(page.getByText('Booking page saved successfully')).toBeVisible({ timeout: 5000 });
      
      // Preview URL should be available
      await expect(page.getByText('/book/wedding-consultations')).toBeVisible();
    });
  });

  test('Complete Client Booking Flow - Existing Client', async ({ page }) => {
    // Start the performance measurement
    await page.addInitScript(() => {
      window.performance.mark('booking-flow-start');
    });

    await test.step('Access booking page', async () => {
      await page.goto('/book/wedding-consultations');
      
      // Should show booking page with branding
      await expect(page.getByText('Wedding Planning Consultations')).toBeVisible();
      await expect(page.getByText('Book a personalized consultation')).toBeVisible();
      
      // Should show available meeting types
      await expect(page.getByText('Initial Consultation')).toBeVisible();
      await expect(page.getByText('30 minutes')).toBeVisible();
    });

    await test.step('Select meeting type and time slot', async () => {
      // Select meeting type
      await page.getByRole('button', { name: 'Initial Consultation' }).click();
      
      // Calendar should be visible
      await expect(page.locator('.rbc-calendar')).toBeVisible();
      
      // Wait for available slots to load
      await page.waitForSelector('[data-testid="available-slot"]', { timeout: 5000 });
      
      // Select an available time slot
      await page.locator('[data-testid="available-slot"]').first().click();
      
      // Should show slot selection confirmation
      await expect(page.getByText('Time slot selected')).toBeVisible();
      
      // Proceed to booking form
      await page.getByText('Book This Slot').click();
    });

    await test.step('Client verification - existing client', async () => {
      // Should be on client verification step
      await expect(page.getByText('Client Verification')).toBeVisible();
      await expect(page.getByText('This booking system is for existing clients only')).toBeVisible();
      
      // Enter existing client email
      await page.getByLabel('Email Address').fill('existing@client.com');
      
      // Should auto-verify and show success
      await expect(page.getByText('Client Account Verified')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('Welcome back, John & Jane Smith!')).toBeVisible();
      
      // Form should be pre-filled
      await expect(page.getByDisplayValue('John & Jane Smith')).toBeVisible();
      await expect(page.getByDisplayValue('+44 7123 456789')).toBeVisible();
      
      // Continue to next step
      await page.getByText('Continue').click();
    });

    await test.step('Wedding details - pre-filled from client data', async () => {
      // Should be on wedding details step
      await expect(page.getByText('Wedding Details')).toBeVisible();
      
      // Fields should be pre-filled from client verification
      await expect(page.getByDisplayValue('2024-06-15')).toBeVisible();
      await expect(page.getByDisplayValue('Jane Smith')).toBeVisible();
      await expect(page.getByDisplayValue('The Grand Hotel')).toBeVisible();
      
      // Select wedding style
      await page.getByLabel('Wedding Style').click();
      await page.getByRole('option', { name: 'Romantic' }).click();
      
      // Continue
      await page.getByText('Continue').click();
    });

    await test.step('Meeting preferences', async () => {
      // Should be on preferences step
      await expect(page.getByText('Meeting Preferences')).toBeVisible();
      
      // Add special requirements
      await page.getByLabel('Special Requirements or Notes').fill('Please provide parking information and accessibility details');
      
      // Select preferred contact method
      await page.getByLabel('Preferred Contact Method').click();
      await page.getByRole('option', { name: 'Email' }).click();
      
      // Continue
      await page.getByText('Continue').click();
    });

    await test.step('Questionnaire responses', async () => {
      // Should be on questionnaire step
      await expect(page.getByText('Additional Questions')).toBeVisible();
      
      // Answer required questions
      await page.getByLabel('What is your wedding date?').fill('June 15th, 2024');
      
      // Select dropdown question
      await page.getByLabel('How many guests are you expecting?').click();
      await page.getByRole('option', { name: '101-150' }).click();
      
      // Optional textarea
      await page.getByLabel('Tell us about your wedding vision').fill('We envision a romantic garden wedding with lots of fairy lights and natural flowers');
      
      // Continue
      await page.getByText('Continue').click();
    });

    await test.step('Review and confirm booking', async () => {
      // Should be on review step
      await expect(page.getByText('Review & Confirm')).toBeVisible();
      await expect(page.getByText('Booking Summary')).toBeVisible();
      
      // Verify all information is displayed
      await expect(page.getByText('John & Jane Smith')).toBeVisible();
      await expect(page.getByText('existing@client.com')).toBeVisible();
      await expect(page.getByText('Initial Consultation (30 minutes)')).toBeVisible();
      await expect(page.getByText('Please provide parking information')).toBeVisible();
      
      // Accept terms and conditions
      await page.getByLabel('I accept the terms and conditions').check();
      await page.getByLabel('I accept the privacy policy').check();
      
      // Measure booking confirmation performance
      await page.addInitScript(() => {
        window.performance.mark('booking-confirm-start');
      });
      
      // Confirm booking
      await page.getByText('Confirm Booking').click();
      
      // Wait for confirmation with performance measurement
      await expect(page.getByText('Booking Confirmed!')).toBeVisible({ timeout: 5000 });
      
      // Measure performance
      const confirmationTime = await page.evaluate(() => {
        window.performance.mark('booking-confirm-end');
        const measure = window.performance.measure('booking-confirmation', 'booking-confirm-start', 'booking-confirm-end');
        return measure.duration;
      });
      
      // Verify performance requirement (<500ms)
      expect(confirmationTime).toBeLessThan(500);
    });

    await test.step('Booking confirmation details', async () => {
      // Should show booking confirmation with reference
      await expect(page.getByText('Your meeting has been successfully scheduled')).toBeVisible();
      
      // Should show booking reference
      await expect(page.locator('[data-testid="booking-reference"]')).toBeVisible();
      
      // Should show meeting details
      await expect(page.getByText('Initial Consultation')).toBeVisible();
      await expect(page.getByText('30 minutes')).toBeVisible();
      await expect(page.getByText('Video Call')).toBeVisible();
      
      // Should show confirmation email notice
      await expect(page.getByText('A confirmation email has been sent')).toBeVisible();
      
      // Should show next action buttons
      await expect(page.getByText('Go to Dashboard')).toBeVisible();
      await expect(page.getByText('Book Another Meeting')).toBeVisible();
    });
  });

  test('Client Verification Security - Block Non-Existing Clients', async ({ page }) => {
    await test.step('Access booking page and attempt non-client booking', async () => {
      await page.goto('/book/wedding-consultations');
      
      // Select meeting type and slot
      await page.getByRole('button', { name: 'Initial Consultation' }).click();
      await page.waitForSelector('[data-testid="available-slot"]');
      await page.locator('[data-testid="available-slot"]').first().click();
      await page.getByText('Book This Slot').click();
      
      // Try to verify with non-existing client
      await page.getByLabel('Email Address').fill('nonexisting@client.com');
      
      // Should show error message
      await expect(page.getByText('Email not found. This booking system is for existing clients only')).toBeVisible({ timeout: 3000 });
      
      // Fill other required fields
      await page.getByLabel('Full Name').fill('New Client');
      await page.getByLabel('Phone Number').fill('+44 7999 999999');
      
      // Try to continue - should be blocked
      await page.getByText('Continue').click();
      
      // Should still be on verification step with error
      await expect(page.getByText('Please verify your client account first')).toBeVisible();
      await expect(page.getByText('Client Verification')).toHaveClass(/text-gray-900/);
    });
  });

  test('Calendar Integration - Event Creation Validation', async ({ page }) => {
    await test.step('Complete booking and verify calendar integration', async () => {
      // Mock calendar API to capture event creation
      let calendarEventCreated = false;
      let eventData = null;

      await page.route('**/api/calendar/google/events', (route) => {
        calendarEventCreated = true;
        const requestBody = JSON.parse(route.request().postData() || '{}');
        eventData = requestBody;
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'google-event-123', status: 'confirmed' })
        });
      });

      await page.goto('/book/wedding-consultations');
      
      // Quick booking flow
      await page.getByRole('button', { name: 'Initial Consultation' }).click();
      await page.waitForSelector('[data-testid="available-slot"]');
      await page.locator('[data-testid="available-slot"]').first().click();
      await page.getByText('Book This Slot').click();
      
      // Client verification
      await page.getByLabel('Email Address').fill('existing@client.com');
      await page.waitForSelector('text=Client Account Verified');
      await page.getByText('Continue').click();
      
      // Skip through steps quickly
      await page.getByText('Continue').click(); // Wedding details (pre-filled)
      await page.getByText('Continue').click(); // Preferences
      
      // Answer questionnaire quickly
      await page.getByLabel('What is your wedding date?').fill('June 15th, 2024');
      await page.getByLabel('How many guests are you expecting?').click();
      await page.getByRole('option', { name: '101-150' }).click();
      await page.getByText('Continue').click();
      
      // Accept terms and confirm
      await page.getByLabel('I accept the terms and conditions').check();
      await page.getByLabel('I accept the privacy policy').check();
      await page.getByText('Confirm Booking').click();
      
      // Wait for confirmation
      await expect(page.getByText('Booking Confirmed!')).toBeVisible();
      
      // Verify calendar integration was called
      expect(calendarEventCreated).toBe(true);
      expect(eventData).toBeTruthy();
      expect(eventData?.summary).toContain('John & Jane Smith');
      expect(eventData?.description).toContain('Initial Consultation');
      expect(eventData?.attendees?.[0]?.email).toBe('existing@client.com');
    });
  });

  test('Responsive Design - Mobile Booking Flow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await test.step('Mobile booking page access', async () => {
      await page.goto('/book/wedding-consultations');
      
      // Should adapt to mobile layout
      await expect(page.getByText('Wedding Planning Consultations')).toBeVisible();
      
      // Mobile-optimized touch targets
      const meetingButton = page.getByRole('button', { name: 'Initial Consultation' });
      const buttonBox = await meetingButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS touch target minimum
    });

    await test.step('Mobile calendar interaction', async () => {
      await page.getByRole('button', { name: 'Initial Consultation' }).click();
      
      // Calendar should be responsive
      await expect(page.locator('.rbc-calendar')).toBeVisible();
      
      // Time slots should be touch-friendly
      await page.waitForSelector('[data-testid="available-slot"]');
      const slot = page.locator('[data-testid="available-slot"]').first();
      const slotBox = await slot.boundingBox();
      expect(slotBox?.height).toBeGreaterThanOrEqual(44);
    });

    await test.step('Mobile form completion', async () => {
      await page.locator('[data-testid="available-slot"]').first().click();
      await page.getByText('Book This Slot').click();
      
      // Form inputs should be touch-optimized
      const emailInput = page.getByLabel('Email Address');
      const inputBox = await emailInput.boundingBox();
      expect(inputBox?.height).toBeGreaterThanOrEqual(44);
      
      // Complete flow quickly
      await emailInput.fill('existing@client.com');
      await page.waitForSelector('text=Client Account Verified');
      await page.getByText('Continue').click();
      
      // Multi-step form should work on mobile
      await expect(page.getByText('Wedding Details')).toBeVisible();
    });
  });

  test('Accessibility - Screen Reader and Keyboard Navigation', async ({ page }) => {
    await test.step('Keyboard navigation support', async () => {
      await page.goto('/book/wedding-consultations');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Initial Consultation' })).toBeFocused();
      
      // Activate with keyboard
      await page.keyboard.press('Enter');
      await expect(page.locator('.rbc-calendar')).toBeVisible();
    });

    await test.step('ARIA labels and descriptions', async () => {
      await page.locator('[data-testid="available-slot"]').first().click();
      await page.getByText('Book This Slot').click();
      
      // Form fields should have proper ARIA attributes
      const emailInput = page.getByLabel('Email Address');
      await expect(emailInput).toHaveAttribute('aria-required', 'true');
      
      // Error messages should be announced
      await page.getByText('Continue').click();
      const emailError = page.getByText('Email address is required');
      await expect(emailError).toHaveAttribute('role', 'alert');
    });

    await test.step('Focus management in multi-step form', async () => {
      // Complete client verification
      await page.getByLabel('Email Address').fill('existing@client.com');
      await page.getByLabel('Full Name').fill('John Smith');
      await page.getByLabel('Phone Number').fill('+44 7123 456789');
      await page.waitForSelector('text=Client Account Verified');
      await page.getByText('Continue').click();
      
      // Focus should move to first field of next step
      await expect(page.getByLabel('Wedding Date')).toBeFocused();
    });
  });

  test('Performance Monitoring - Booking Confirmation Under 500ms', async ({ page }) => {
    await test.step('Measure complete booking performance', async () => {
      await page.goto('/book/wedding-consultations');
      
      // Start performance measurement
      await page.addInitScript(() => {
        window.performanceMetrics = {
          availabilityLoadTime: 0,
          bookingConfirmationTime: 0,
          calendarSyncTime: 0
        };
        
        // Mark availability load start
        window.performance.mark('availability-load-start');
      });
      
      // Select meeting and measure availability loading
      await page.getByRole('button', { name: 'Initial Consultation' }).click();
      
      await page.evaluate(() => {
        window.performance.mark('availability-load-end');
        const measure = window.performance.measure('availability-load', 'availability-load-start', 'availability-load-end');
        (window as any).performanceMetrics.availabilityLoadTime = measure.duration;
      });
      
      // Complete booking flow rapidly
      await page.waitForSelector('[data-testid="available-slot"]');
      await page.locator('[data-testid="available-slot"]').first().click();
      await page.getByText('Book This Slot').click();
      
      // Speed through form
      await page.getByLabel('Email Address').fill('existing@client.com');
      await page.waitForSelector('text=Client Account Verified');
      await page.getByText('Continue').click();
      await page.getByText('Continue').click(); // Pre-filled wedding details
      await page.getByText('Continue').click(); // Empty preferences
      
      // Quick questionnaire
      await page.getByLabel('What is your wedding date?').fill('June 15th, 2024');
      await page.getByLabel('How many guests are you expecting?').click();
      await page.getByRole('option', { name: '101-150' }).click();
      await page.getByText('Continue').click();
      
      // Accept terms
      await page.getByLabel('I accept the terms and conditions').check();
      await page.getByLabel('I accept the privacy policy').check();
      
      // Measure booking confirmation time
      await page.evaluate(() => {
        window.performance.mark('booking-confirm-start');
      });
      
      await page.getByText('Confirm Booking').click();
      await expect(page.getByText('Booking Confirmed!')).toBeVisible();
      
      // Measure final performance
      const metrics = await page.evaluate(() => {
        window.performance.mark('booking-confirm-end');
        const confirmMeasure = window.performance.measure('booking-confirm', 'booking-confirm-start', 'booking-confirm-end');
        (window as any).performanceMetrics.bookingConfirmationTime = confirmMeasure.duration;
        
        return (window as any).performanceMetrics;
      });
      
      // Verify performance requirements
      expect(metrics.bookingConfirmationTime).toBeLessThan(500);
      expect(metrics.availabilityLoadTime).toBeLessThan(1000);
      
      console.log('Performance Metrics:', {
        availabilityLoad: `${metrics.availabilityLoadTime.toFixed(2)}ms`,
        bookingConfirmation: `${metrics.bookingConfirmationTime.toFixed(2)}ms`
      });
    });
  });
});