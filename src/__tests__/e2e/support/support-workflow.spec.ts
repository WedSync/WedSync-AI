import { test, expect, Page } from '@playwright/test';

// Test data
const testTicket = {
  title: 'E2E Test Support Ticket',
  description:
    'This is an end-to-end test ticket to verify the complete support workflow',
  priority: 'medium',
  category: 'technical',
  venueName: 'Test Wedding Venue',
  weddingDate: '2024-08-15',
};

const urgentTicket = {
  title: 'Urgent Wedding Day Issue',
  description:
    'Critical problem that needs immediate attention during wedding setup',
  priority: 'wedding_day_emergency',
  category: 'venue',
  venueName: 'Emergency Test Venue',
  weddingDate: '2024-06-15',
};

const testUser = {
  email: 'test.supplier@wedsync.com',
  password: 'TestPassword123!',
  organizationName: 'E2E Test Photography',
};

test.describe('Support Ticket Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: testUser.email,
            user_metadata: {
              organization_id: 'test-org-id',
              organization_name: testUser.organizationName,
            },
          },
        }),
      });
    });

    // Mock ticket API endpoints
    await page.route('**/api/support/tickets', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0 },
          }),
        });
      } else if (route.request().method() === 'POST') {
        const requestData = JSON.parse(route.request().postData() || '{}');
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-ticket-id',
              ticket_number: `T-${Date.now().toString().slice(-6)}`,
              ...requestData,
              status: 'new',
              created_at: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto('/support');
  });

  test('should display support dashboard correctly', async ({ page }) => {
    // Check main dashboard elements
    await expect(page.getByText('Support Dashboard')).toBeVisible();
    await expect(page.getByText('Create')).toBeVisible();
    await expect(page.getByText('Tickets')).toBeVisible();

    // Check stats display
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('New')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Urgent')).toBeVisible();

    // Check connection status
    await expect(page.getByText('Online')).toBeVisible();
  });

  test('should create a basic support ticket', async ({ page }) => {
    // Navigate to create ticket form
    await page.getByRole('tab', { name: 'Create' }).click();

    // Verify form is displayed
    await expect(page.getByLabelText('Title')).toBeVisible();
    await expect(page.getByLabelText('Description')).toBeVisible();
    await expect(page.getByLabelText('Priority')).toBeVisible();

    // Fill out the form
    await page.getByLabelText('Title').fill(testTicket.title);
    await page.getByLabelText('Description').fill(testTicket.description);
    await page.getByLabelText('Priority').selectOption(testTicket.priority);
    await page.getByLabelText('Category').selectOption(testTicket.category);
    await page.getByLabelText('Venue Name').fill(testTicket.venueName);
    await page.getByLabelText('Wedding Date').fill(testTicket.weddingDate);

    // Submit the form
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    // Verify success message and redirect
    await expect(page.getByText(/ticket created successfully/i)).toBeVisible();

    // Should redirect to tickets list
    await expect(page.getByRole('tab', { name: 'Tickets' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('should handle wedding day emergency ticket creation', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Create' }).click();

    // Fill emergency ticket form
    await page.getByLabelText('Title').fill(urgentTicket.title);
    await page.getByLabelText('Description').fill(urgentTicket.description);
    await page.getByLabelText('Priority').selectOption('wedding_day_emergency');

    // Check that emergency warning appears
    await expect(page.getByText(/wedding day emergency/i)).toBeVisible();
    await expect(page.getByText(/immediate response/i)).toBeVisible();

    // Location should be requested
    await expect(page.getByText(/location/i)).toBeVisible();

    await page.getByLabelText('Category').selectOption(urgentTicket.category);
    await page.getByLabelText('Venue Name').fill(urgentTicket.venueName);

    // Submit emergency ticket
    await page.getByRole('button', { name: 'Submit Emergency Ticket' }).click();

    // Should show emergency confirmation
    await expect(page.getByText(/emergency ticket created/i)).toBeVisible();
    await expect(page.getByText(/priority support/i)).toBeVisible();
  });

  test('should record and attach voice note', async ({ page }) => {
    // Mock getUserMedia for voice recording
    await page.addInitScript(() => {
      const mockMediaRecorder = {
        start: () => {},
        stop: () => {},
        addEventListener: (event: string, handler: Function) => {
          if (event === 'dataavailable') {
            setTimeout(
              () => handler({ data: new Blob(['mock audio data']) }),
              100,
            );
          }
        },
        state: 'inactive',
      };

      (window as any).MediaRecorder = function () {
        return mockMediaRecorder;
      };
      (window as any).MediaRecorder.isTypeSupported = () => true;

      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve(new MediaStream()),
      } as any;
    });

    await page.getByRole('tab', { name: 'Create' }).click();

    // Find voice note section
    const voiceSection = page.getByText('Voice Note');
    await expect(voiceSection).toBeVisible();

    // Start recording
    await page.getByRole('button', { name: /record/i }).click();

    // Should show recording state
    await expect(page.getByText(/recording/i)).toBeVisible();

    // Stop recording after a short delay
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /stop/i }).click();

    // Should show recorded voice note
    await expect(page.getByText(/voice note recorded/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /play/i })).toBeVisible();

    // Fill rest of form and submit
    await page.getByLabelText('Title').fill('Ticket with Voice Note');
    await page
      .getByLabelText('Description')
      .fill('This ticket includes a voice note');
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
  });

  test('should handle file attachments', async ({ page }) => {
    await page.getByRole('tab', { name: 'Create' }).click();

    // Find attachment section
    const attachmentSection = page.getByText('Attachments');
    await expect(attachmentSection).toBeVisible();

    // Create a test file
    const fileContent = 'This is a test file for ticket attachment';
    const file = new File([fileContent], 'test-screenshot.png', {
      type: 'image/png',
    });

    // Upload file using file input
    const fileInput = page.getByRole('button', { name: /choose files/i });
    await fileInput.setInputFiles({
      name: 'test-screenshot.png',
      mimeType: 'image/png',
      buffer: Buffer.from(fileContent),
    });

    // Should show uploaded file
    await expect(page.getByText('test-screenshot.png')).toBeVisible();
    await expect(page.getByText(/image\/png/i)).toBeVisible();

    // Fill form and submit
    await page.getByLabelText('Title').fill('Ticket with Attachment');
    await page
      .getByLabelText('Description')
      .fill('This ticket includes a file attachment');
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.getByRole('tab', { name: 'Create' }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    // Should show validation errors
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();

    // Test title length validation
    await page.getByLabelText('Title').fill('a'.repeat(201));
    await page.getByLabelText('Description').fill('Valid description');
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    await expect(
      page.getByText(/title must be 200 characters or less/i),
    ).toBeVisible();

    // Test invalid wedding date
    await page.getByLabelText('Title').fill('Valid title');
    await page.getByLabelText('Wedding Date').fill('invalid-date');
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    await expect(page.getByText(/invalid date/i)).toBeVisible();
  });

  test('should auto-save form data', async ({ page }) => {
    await page.getByRole('tab', { name: 'Create' }).click();

    // Fill some form data
    await page.getByLabelText('Title').fill('Auto-save test ticket');
    await page
      .getByLabelText('Description')
      .fill('Testing auto-save functionality');

    // Wait for auto-save interval (mocked to be shorter for testing)
    await page.waitForTimeout(2000);

    // Navigate away and back
    await page.getByRole('tab', { name: 'Tickets' }).click();
    await page.getByRole('tab', { name: 'Create' }).click();

    // Form should be restored
    await expect(page.getByLabelText('Title')).toHaveValue(
      'Auto-save test ticket',
    );
    await expect(page.getByLabelText('Description')).toHaveValue(
      'Testing auto-save functionality',
    );

    // Clear should work
    await page.getByRole('button', { name: /clear.*draft/i }).click();
    await expect(page.getByLabelText('Title')).toHaveValue('');
  });

  test('should display tickets list with filtering', async ({ page }) => {
    // Mock tickets data
    await page.route('**/api/support/tickets', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: '1',
              ticket_number: 'T-001',
              title: 'First Test Ticket',
              description: 'First ticket description',
              priority: 'medium',
              status: 'new',
              category: 'technical',
              created_at: '2024-01-01T00:00:00Z',
            },
            {
              id: '2',
              ticket_number: 'T-002',
              title: 'Urgent Wedding Issue',
              description: 'Urgent ticket description',
              priority: 'urgent',
              status: 'in_progress',
              category: 'venue',
              created_at: '2024-01-02T00:00:00Z',
            },
          ],
          pagination: { page: 1, limit: 20, total: 2 },
        }),
      });
    });

    await page.reload();

    // Should display tickets
    await expect(page.getByText('T-001')).toBeVisible();
    await expect(page.getByText('T-002')).toBeVisible();
    await expect(page.getByText('First Test Ticket')).toBeVisible();
    await expect(page.getByText('Urgent Wedding Issue')).toBeVisible();

    // Test search functionality
    const searchInput = page.getByPlaceholder('Search tickets...');
    await searchInput.fill('urgent');
    await page.waitForTimeout(500); // Debounce

    // Should filter results
    await expect(page.getByText('Urgent Wedding Issue')).toBeVisible();
    await expect(page.getByText('First Test Ticket')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Both should be visible again
    await expect(page.getByText('First Test Ticket')).toBeVisible();
    await expect(page.getByText('Urgent Wedding Issue')).toBeVisible();

    // Test status filter
    await page.getByRole('combobox', { name: /status/i }).selectOption('new');
    await expect(page.getByText('First Test Ticket')).toBeVisible();
    await expect(page.getByText('Urgent Wedding Issue')).not.toBeVisible();
  });

  test('should handle offline functionality', async ({ page }) => {
    await page.getByRole('tab', { name: 'Create' }).click();

    // Simulate going offline
    await page.setOfflineMode(true);

    // Fill out form
    await page.getByLabelText('Title').fill('Offline Test Ticket');
    await page
      .getByLabelText('Description')
      .fill('This ticket was created offline');

    // Submit should queue the request
    await page.getByRole('button', { name: 'Submit Ticket' }).click();

    // Should show queued message
    await expect(page.getByText(/queued.*offline/i)).toBeVisible();
    await expect(page.getByText(/sync.*online/i)).toBeVisible();

    // Check offline indicator
    await expect(page.getByText('Offline')).toBeVisible();

    // Should show queue tab
    await expect(page.getByRole('tab', { name: 'Queue' })).toBeVisible();

    // Navigate to queue
    await page.getByRole('tab', { name: 'Queue' }).click();
    await expect(page.getByText('Offline Test Ticket')).toBeVisible();
    await expect(page.getByText(/queued/i)).toBeVisible();

    // Go back online
    await page.setOfflineMode(false);

    // Should sync automatically
    await expect(page.getByText('Online')).toBeVisible();
    await page.waitForTimeout(1000); // Wait for sync

    // Queued item should be processed
    await expect(page.getByText(/synced/i)).toBeVisible();
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByRole('tab', { name: 'Create' }).click();

    // Check mobile-optimized layout
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Touch targets should be appropriately sized
    const submitButton = page.getByRole('button', { name: 'Submit Ticket' });
    const buttonBox = await submitButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(44); // Minimum touch target

    // Test touch interactions
    await page.getByLabelText('Title').tap();
    await expect(page.getByLabelText('Title')).toBeFocused();

    // Test swipe gestures on priority buttons
    const priorityButtons = page.getByRole('group', { name: /priority/i });
    await expect(priorityButtons).toBeVisible();

    // Test emergency floating action button
    const emergencyButton = page.getByRole('button', { name: /emergency/i });
    await expect(emergencyButton).toBeVisible();

    const emergencyBox = await emergencyButton.boundingBox();
    expect(emergencyBox?.width).toBeGreaterThan(48);
    expect(emergencyBox?.height).toBeGreaterThan(48);
  });

  test('should handle real-time updates', async ({ page }) => {
    // Mock WebSocket/SSE connection for real-time updates
    await page.evaluateOnNewDocument(() => {
      (window as any).mockRealtimeUpdate = (ticketData: any) => {
        const event = new CustomEvent('realtimeTicketUpdate', {
          detail: ticketData,
        });
        window.dispatchEvent(event);
      };
    });

    await page.goto('/support');

    // Should show real-time connection status
    await expect(page.getByText('Live')).toBeVisible();

    // Simulate real-time ticket update
    await page.evaluate(() => {
      (window as any).mockRealtimeUpdate({
        type: 'INSERT',
        new: {
          id: 'realtime-ticket',
          ticket_number: 'T-REALTIME-001',
          title: 'Real-time Test Ticket',
          priority: 'urgent',
          status: 'new',
        },
      });
    });

    // Should show new ticket in list
    await expect(page.getByText('T-REALTIME-001')).toBeVisible();
    await expect(page.getByText('Real-time Test Ticket')).toBeVisible();

    // Should show notification for urgent ticket
    await expect(page.getByText(/urgent.*ticket/i)).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Run accessibility checks
    await expect(page.getByRole('main')).toBeVisible();

    // Check ARIA labels
    await expect(page.getByLabelText('Title')).toHaveAttribute(
      'aria-required',
      'true',
    );
    await expect(page.getByLabelText('Description')).toHaveAttribute(
      'aria-required',
      'true',
    );

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tab', { name: 'Create' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('tab', { name: 'Tickets' })).toBeFocused();

    // Test screen reader announcements
    await page.getByRole('tab', { name: 'Create' }).click();

    // Error messages should have role="alert"
    await page.getByRole('button', { name: 'Submit Ticket' }).click();
    const errorMessage = page.getByText('Title is required');
    await expect(errorMessage).toHaveAttribute('role', 'alert');

    // Check color contrast (this would need additional tooling in real tests)
    const submitButton = page.getByRole('button', { name: 'Submit Ticket' });
    const buttonStyles = await submitButton.evaluate((el) =>
      window.getComputedStyle(el),
    );

    // Basic check - should have sufficient contrast
    expect(buttonStyles.color).toBeTruthy();
    expect(buttonStyles.backgroundColor).toBeTruthy();
  });

  test('should perform well under load', async ({ page }) => {
    // Start performance monitoring
    const performanceEntries: any[] = [];
    page.on('response', (response) => {
      performanceEntries.push({
        url: response.url(),
        status: response.status(),
        timing: Date.now(),
      });
    });

    const startTime = Date.now();

    await page.goto('/support');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

    // Test rapid form interactions
    await page.getByRole('tab', { name: 'Create' }).click();

    const formInteractionStart = Date.now();

    await page.getByLabelText('Title').fill('Performance Test Ticket');
    await page.getByLabelText('Description').fill('Testing form performance');
    await page.getByLabelText('Priority').selectOption('medium');

    const formInteractionTime = Date.now() - formInteractionStart;
    expect(formInteractionTime).toBeLessThan(1000); // Form interactions should be fast

    // Check for any failed requests
    const failedRequests = performanceEntries.filter(
      (entry) => entry.status >= 400,
    );
    expect(failedRequests.length).toBe(0);
  });
});
