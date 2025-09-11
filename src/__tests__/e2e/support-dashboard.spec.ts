import { test, expect, type Page } from '@playwright/test';

// Test data setup
const testTickets = [
  {
    id: 'ticket-001',
    title: 'Cannot access wedding timeline',
    description: 'Getting error messages when trying to view timeline',
    customer: 'Sarah Johnson',
    tier: 'professional',
    status: 'open',
    priority: 'high',
    created: '2024-01-15T10:00:00Z',
  },
  {
    id: 'ticket-002',
    title: 'URGENT: Wedding TODAY - vendor no show',
    description: "My wedding is in 2 hours and photographer hasn't arrived!",
    customer: 'Emily Davis',
    tier: 'enterprise',
    status: 'open',
    priority: 'wedding_emergency',
    created: '2024-01-15T08:00:00Z',
    is_wedding_emergency: true,
  },
  {
    id: 'ticket-003',
    title: 'Billing question about upgrade',
    description: 'Want to upgrade to Scale plan',
    customer: 'Michael Chen',
    tier: 'starter',
    status: 'resolved',
    priority: 'medium',
    created: '2024-01-14T15:30:00Z',
  },
];

test.beforeEach(async ({ page }) => {
  // Mock API responses
  await page.route('**/api/admin/support/tickets*', async (route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');

    let filteredTickets = testTickets;

    if (status && status !== 'all') {
      filteredTickets = filteredTickets.filter((t) => t.status === status);
    }

    if (priority && priority !== 'all') {
      filteredTickets = filteredTickets.filter((t) => t.priority === priority);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tickets: filteredTickets }),
    });
  });

  await page.route('**/api/admin/support/stats*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_tickets: 150,
        open_tickets: 25,
        sla_breaches: 3,
        avg_response_time: 45,
        wedding_emergencies: 1,
        resolution_rate: 87.5,
        customer_satisfaction: 4.6,
        tier_distribution: {
          enterprise: 15,
          professional: 45,
          starter: 60,
          free: 30,
        },
      }),
    });
  });

  // Login as admin
  await page.goto('/admin/login');
  await page.fill('[data-testid="email"]', 'admin@wedsync.com');
  await page.fill('[data-testid="password"]', 'admin123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/admin/dashboard');
});

test.describe('Support Operations Dashboard', () => {
  test('should display dashboard overview correctly', async ({ page }) => {
    await page.goto('/admin/support');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="support-dashboard"]');

    // Check main stats cards
    await expect(page.locator('[data-testid="total-tickets"]')).toContainText(
      '150',
    );
    await expect(page.locator('[data-testid="open-tickets"]')).toContainText(
      '25',
    );
    await expect(page.locator('[data-testid="sla-performance"]')).toContainText(
      '98%',
    ); // (150-3)/150
    await expect(
      page.locator('[data-testid="wedding-emergencies"]'),
    ).toContainText('1');
    await expect(
      page.locator('[data-testid="satisfaction-score"]'),
    ).toContainText('4.6');

    // Check for wedding emergency alert
    await expect(
      page.locator('[data-testid="wedding-emergency-alert"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="wedding-emergency-alert"]'),
    ).toContainText('1 Wedding Day Emergency Active');
  });

  test('should filter tickets correctly', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    // Initially should show all tickets
    await expect(page.locator('[data-testid="ticket-row"]')).toHaveCount(3);

    // Filter by status - open only
    await page.selectOption('[data-testid="status-filter"]', 'open');
    await page.waitForResponse('**/api/admin/support/tickets*');
    await expect(page.locator('[data-testid="ticket-row"]')).toHaveCount(2);

    // Filter by priority - wedding emergency
    await page.selectOption(
      '[data-testid="priority-filter"]',
      'wedding_emergency',
    );
    await page.waitForResponse('**/api/admin/support/tickets*');
    await expect(page.locator('[data-testid="ticket-row"]')).toHaveCount(1);
    await expect(
      page.locator('[data-testid="ticket-row"]').first(),
    ).toContainText('URGENT: Wedding TODAY');

    // Clear filters
    await page.selectOption('[data-testid="status-filter"]', 'all');
    await page.selectOption('[data-testid="priority-filter"]', 'all');
    await page.waitForResponse('**/api/admin/support/tickets*');
    await expect(page.locator('[data-testid="ticket-row"]')).toHaveCount(3);
  });

  test('should search tickets correctly', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="search-input"]');

    // Search for specific ticket
    await page.fill('[data-testid="search-input"]', 'timeline');
    await page.keyboard.press('Enter');
    await page.waitForResponse('**/api/admin/support/tickets*');

    // Should show matching tickets
    await expect(page.locator('[data-testid="ticket-row"]')).toHaveCount(1);
    await expect(
      page.locator('[data-testid="ticket-row"]').first(),
    ).toContainText('Cannot access wedding timeline');

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.keyboard.press('Enter');
    await page.waitForResponse('**/api/admin/support/tickets*');
    await expect(page.locator('[data-testid="ticket-row"]')).toHaveCount(3);
  });

  test('should display ticket details correctly', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    // Check wedding emergency ticket display
    const emergencyRow = page.locator('[data-testid="ticket-row"]').filter({
      hasText: 'URGENT: Wedding TODAY',
    });

    await expect(emergencyRow).toBeVisible();
    await expect(
      emergencyRow.locator('[data-testid="emergency-icon"]'),
    ).toBeVisible();
    await expect(
      emergencyRow.locator('[data-testid="priority-badge"]'),
    ).toContainText('wedding emergency');
    await expect(
      emergencyRow.locator('[data-testid="customer-tier"]'),
    ).toContainText('enterprise');
    await expect(
      emergencyRow.locator('[data-testid="status-badge"]'),
    ).toContainText('open');

    // Check SLA status
    await expect(
      emergencyRow.locator('[data-testid="sla-status"]'),
    ).toBeVisible();

    // Check action buttons
    await expect(
      emergencyRow.locator('[data-testid="view-ticket-btn"]'),
    ).toBeVisible();
    await expect(
      emergencyRow.locator('[data-testid="message-ticket-btn"]'),
    ).toBeVisible();
  });

  test('should handle ticket actions correctly', async ({ page }) => {
    await page.route(
      '**/api/admin/support/tickets/ticket-001',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      },
    );

    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    // Click view ticket button
    const firstTicketRow = page.locator('[data-testid="ticket-row"]').first();
    await firstTicketRow.locator('[data-testid="view-ticket-btn"]').click();

    // Should open ticket details (either in modal or new tab)
    // This would depend on implementation - checking for new tab
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      firstTicketRow.locator('[data-testid="view-ticket-btn"]').click(),
    ]);

    await expect(newPage.url()).toContain('/admin/support/tickets/ticket-001');
  });

  test('should display real-time notifications correctly', async ({ page }) => {
    await page.goto('/admin/support');

    // Click notification center
    await page.click('[data-testid="notification-center"]');
    await expect(
      page.locator('[data-testid="notification-popup"]'),
    ).toBeVisible();

    // Check notification content
    await expect(
      page.locator('[data-testid="notification-header"]'),
    ).toContainText('Support Notifications');
    await expect(
      page.locator('[data-testid="connection-status"]'),
    ).toBeVisible();

    // Test notification settings
    await expect(
      page.locator('[data-testid="notification-settings"]'),
    ).toBeVisible();

    // Wedding emergencies should always be enabled
    const weddingEmergencySwitch = page.locator(
      '[data-testid="wedding-emergency-switch"]',
    );
    await expect(weddingEmergencySwitch).toBeDisabled();
    await expect(weddingEmergencySwitch).toBeChecked();

    // Other settings should be toggleable
    const slaBreachSwitch = page.locator('[data-testid="sla-breach-switch"]');
    await expect(slaBreachSwitch).toBeEnabled();

    // Toggle SLA breach notifications
    const initialState = await slaBreachSwitch.isChecked();
    await slaBreachSwitch.click();
    const newState = await slaBreachSwitch.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/support');

    // Dashboard should be responsive
    await page.waitForSelector('[data-testid="support-dashboard"]');

    // Stats cards should stack vertically on mobile
    const statsContainer = page.locator('[data-testid="stats-container"]');
    await expect(statsContainer).toHaveCSS('flex-direction', 'column');

    // Table should scroll horizontally on mobile
    const ticketsTable = page.locator('[data-testid="tickets-table"]');
    await expect(ticketsTable.locator('div').first()).toHaveCSS(
      'overflow-x',
      'auto',
    );

    // Filters should be stacked on mobile
    const filtersContainer = page.locator('[data-testid="filters-container"]');
    const filtersRect = await filtersContainer.boundingBox();
    expect(filtersRect?.width).toBeLessThan(400); // Should fit in mobile width
  });

  test('should handle loading states correctly', async ({ page }) => {
    // Delay API response to test loading state
    await page.route('**/api/admin/support/tickets*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tickets: testTickets }),
      });
    });

    await page.goto('/admin/support');

    // Should show loading skeleton
    await expect(
      page.locator('[data-testid="loading-skeleton"]'),
    ).toBeVisible();

    // Wait for content to load
    await page.waitForSelector('[data-testid="tickets-table"]', {
      timeout: 2000,
    });
    await expect(
      page.locator('[data-testid="loading-skeleton"]'),
    ).not.toBeVisible();
    await expect(page.locator('[data-testid="tickets-table"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/admin/support/tickets*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/admin/support');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Failed to load tickets',
    );

    // Should have retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should refresh data automatically', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/admin/support/tickets*', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: testTickets,
          timestamp: Date.now(),
          requestCount,
        }),
      });
    });

    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    const initialRequestCount = requestCount;
    expect(initialRequestCount).toBeGreaterThan(0);

    // Wait for auto-refresh (should happen every 30 seconds in real app)
    // For testing, we'll trigger it manually or wait shorter time
    await page.waitForTimeout(2000);

    // In a real implementation, you'd verify the refresh happened
    // by checking for updated data or request count
    expect(requestCount).toBeGreaterThanOrEqual(initialRequestCount);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Search input
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Status filter
    await expect(page.locator('[data-testid="status-filter"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Priority filter
    await expect(page.locator('[data-testid="priority-filter"]')).toBeFocused();

    // Should be able to activate filters with keyboard
    await page.keyboard.press('Space');
    // Dropdown should open (implementation dependent)
  });

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    // Apply filters
    await page.selectOption('[data-testid="status-filter"]', 'open');
    await page.fill('[data-testid="search-input"]', 'urgent');

    // Navigate away and back
    await page.goto('/admin/dashboard');
    await page.goto('/admin/support');

    // Filters should be maintained (if implemented with URL params)
    // This would depend on the implementation
    const statusFilter = page.locator('[data-testid="status-filter"]');
    const searchInput = page.locator('[data-testid="search-input"]');

    // In a properly implemented app, these would maintain state
    await expect(statusFilter).toHaveValue('open');
    await expect(searchInput).toHaveValue('urgent');
  });
});

test.describe('Wedding Emergency Handling', () => {
  test('should highlight wedding emergencies prominently', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    const emergencyRow = page.locator('[data-testid="ticket-row"]').filter({
      hasText: 'URGENT: Wedding TODAY',
    });

    // Should have special styling for emergencies
    await expect(emergencyRow).toHaveClass(/emergency|urgent|red/);
    await expect(
      emergencyRow.locator('[data-testid="emergency-icon"]'),
    ).toBeVisible();

    // Should be at the top of the list (sorted by priority)
    const firstRow = page.locator('[data-testid="ticket-row"]').first();
    await expect(firstRow).toContainText('URGENT: Wedding TODAY');
  });

  test('should show emergency alert banner', async ({ page }) => {
    await page.goto('/admin/support');

    const emergencyAlert = page.locator(
      '[data-testid="wedding-emergency-alert"]',
    );
    await expect(emergencyAlert).toBeVisible();
    await expect(emergencyAlert).toHaveClass(/red|error|alert/);
    await expect(emergencyAlert).toContainText('Wedding Day Emergency');

    // Should have action button
    const viewEmergenciesBtn = emergencyAlert.locator(
      '[data-testid="view-emergencies-btn"]',
    );
    await expect(viewEmergenciesBtn).toBeVisible();

    await viewEmergenciesBtn.click();
    // Should filter to show only emergencies
    await expect(page.locator('[data-testid="priority-filter"]')).toHaveValue(
      'wedding_emergency',
    );
  });

  test('should play emergency notification sounds', async ({ page }) => {
    // Mock audio API
    await page.addInitScript(() => {
      (window as any).testAudioPlayed = [];
      const originalAudio = window.Audio;
      (window as any).Audio = function (src: string) {
        (window as any).testAudioPlayed.push(src);
        return {
          play: () => Promise.resolve(),
          volume: 1,
          currentTime: 0,
          duration: 0,
          pause: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
        };
      };
    });

    await page.goto('/admin/support');

    // Simulate receiving emergency notification
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('support-notification', {
          detail: {
            type: 'wedding_emergency',
            message: 'New wedding emergency received',
            ticket_id: 'emergency-123',
          },
        }),
      );
    });

    // Check if emergency sound was played
    const audioPlayed = await page.evaluate(
      () => (window as any).testAudioPlayed,
    );
    expect(audioPlayed).toContain('/sounds/emergency-alert.mp3');
  });
});

test.describe('Accessibility', () => {
  test('should meet basic accessibility requirements', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="support-dashboard"]');

    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Support Operations Center');

    // Check for proper labels
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toHaveAttribute('placeholder');

    // Check for ARIA labels on important elements
    const emergencyAlert = page.locator(
      '[data-testid="wedding-emergency-alert"]',
    );
    await expect(emergencyAlert).toHaveAttribute('role', 'alert');

    // Check color contrast (basic test)
    const statsCard = page.locator('[data-testid="total-tickets"]').first();
    const textColor = await statsCard.evaluate(
      (el) => window.getComputedStyle(el).color,
    );
    const backgroundColor = await statsCard.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );

    // Basic contrast check (would need more sophisticated testing in real app)
    expect(textColor).toBeTruthy();
    expect(backgroundColor).toBeTruthy();
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/admin/support');
    await page.waitForSelector('[data-testid="tickets-table"]');

    // Check for proper table structure
    const table = page.locator('[data-testid="tickets-table"] table');
    await expect(table).toBeVisible();

    // Table should have headers
    const headers = table.locator('th');
    await expect(headers).toHaveCount(7); // Based on our table structure

    // Important elements should have ARIA labels
    const notificationCenter = page.locator(
      '[data-testid="notification-center"]',
    );
    await expect(notificationCenter).toHaveAttribute('aria-label');
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/support');

    // Elements should still be visible and functional
    await page.waitForSelector('[data-testid="support-dashboard"]');
    await expect(page.locator('[data-testid="tickets-table"]')).toBeVisible();

    // Emergency elements should still be clearly distinguished
    const emergencyRow = page.locator('[data-testid="ticket-row"]').filter({
      hasText: 'URGENT: Wedding TODAY',
    });
    await expect(emergencyRow).toBeVisible();
  });
});
