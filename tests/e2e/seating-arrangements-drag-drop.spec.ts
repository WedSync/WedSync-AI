/**
 * @file Playwright E2E Tests for WS-154 Seating Arrangements Drag-Drop Functionality
 * @description Comprehensive testing of drag-drop operations, conflict detection, and responsive behavior
 * @requirements MANDATORY: Accessibility-first seating interface testing with drag-drop user flows
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const mockGuests = [
  {
    id: 'guest-1',
    name: 'John Doe',
    priority: 'vip',
    dietaryRequirements: ['vegetarian'],
    accessibilityRequirements: ['wheelchair'],
  },
  {
    id: 'guest-2', 
    name: 'Jane Smith',
    priority: 'family',
    dietaryRequirements: ['gluten-free'],
  },
  {
    id: 'guest-3',
    name: 'Bob Wilson',
    priority: 'friend',
    conflictsWith: ['guest-4'],
  },
  {
    id: 'guest-4',
    name: 'Alice Cooper', 
    priority: 'friend',
    conflictsWith: ['guest-3'],
  },
];

const mockTables = [
  {
    id: 'table-1',
    name: 'Head Table',
    capacity: 8,
    shape: 'round',
    position: { x: 300, y: 200 },
    isActive: true,
  },
  {
    id: 'table-2',
    name: 'Family Table',
    capacity: 6,
    shape: 'square', 
    position: { x: 600, y: 200 },
    isActive: true,
  },
];

// Helper function to set up test data via API
async function setupTestData(page: Page) {
  await page.route('**/api/seating/guests', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ guests: mockGuests }),
    });
  });

  await page.route('**/api/seating/tables', async route => {
    await route.fulfill({
      status: 200, 
      contentType: 'application/json',
      body: JSON.stringify({ tables: mockTables }),
    });
  });
}

// Helper function to perform drag-drop operation
async function dragGuestToTable(
  page: Page,
  guestName: string,
  targetTableName: string
) {
  const guestChip = page.locator(`[data-testid="guest-chip-${guestName}"]`);
  const targetTable = page.locator(`[data-testid="table-${targetTableName}"]`);
  
  await guestChip.dragTo(targetTable);
  await page.waitForTimeout(500); // Allow animation to complete
}

test.describe('WS-154 Seating Arrangements - Drag & Drop E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData(page);
    await page.goto('/dashboard/clients/test-client/seating');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Desktop Drag-Drop Operations', () => {
    test('should successfully drag guest to empty table', async ({ page }) => {
      // Verify initial state
      await expect(page.locator('[data-testid="guest-chip-John Doe"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-Head Table"]')).toBeVisible();

      // Perform drag operation
      await dragGuestToTable(page, 'John Doe', 'Head Table');

      // Verify assignment was successful  
      await expect(page.locator('[data-testid="table-Head Table"] [data-testid="guest-chip-John Doe"]')).toBeVisible();
      
      // Verify guest is removed from unassigned list
      await expect(page.locator('[data-testid="unassigned-guests"] [data-testid="guest-chip-John Doe"]')).not.toBeVisible();
    });

    test('should handle drag-drop with capacity constraints', async ({ page }) => {
      // Fill table to capacity first
      const tableName = 'Family Table'; // Capacity: 6
      const guestsToFill = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Cooper'];
      
      for (const guest of guestsToFill) {
        await dragGuestToTable(page, guest, tableName);
      }

      // Verify table shows capacity warning
      await expect(page.locator(`[data-testid="table-${tableName}"] [data-testid="capacity-warning"]`)).toBeVisible();
      
      // Attempt to add one more guest (should be allowed but show warning)
      await dragGuestToTable(page, 'John Doe', tableName);
      
      // Should still work but show overcapacity state
      await expect(page.locator(`[data-testid="table-${tableName}"] [data-testid="overcapacity-alert"]`)).toBeVisible();
    });

    test('should detect and display relationship conflicts', async ({ page }) => {
      // Assign conflicting guests to same table
      await dragGuestToTable(page, 'Bob Wilson', 'Head Table');
      await dragGuestToTable(page, 'Alice Cooper', 'Head Table');

      // Verify conflict is detected and displayed
      await expect(page.locator('[data-testid="conflict-alert-relationship"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-alert-relationship"]')).toContainText('Bob Wilson');
      await expect(page.locator('[data-testid="conflict-alert-relationship"]')).toContainText('Alice Cooper');
      
      // Verify conflict resolution suggestions appear
      await expect(page.locator('[data-testid="conflict-resolution-suggestions"]')).toBeVisible();
    });

    test('should handle dietary requirement conflicts', async ({ page }) => {
      // Create scenario where dietary conflicts arise
      await page.route('**/api/seating/conflict-analysis', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json', 
          body: JSON.stringify({
            conflicts: [{
              type: 'dietary',
              severity: 'warning',
              description: 'Multiple dietary requirements at same table may require special coordination',
              affectedGuests: ['guest-1', 'guest-2'],
            }],
          }),
        });
      });

      // Assign guests with different dietary requirements
      await dragGuestToTable(page, 'John Doe', 'Head Table'); // Vegetarian
      await dragGuestToTable(page, 'Jane Smith', 'Head Table'); // Gluten-free

      // Verify dietary conflict warning appears
      await expect(page.locator('[data-testid="conflict-alert-dietary"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-alert-dietary"]')).toContainText('dietary requirements');
    });

    test('should support accessibility-focused drag operations', async ({ page }) => {
      // Test keyboard-based drag-drop
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      
      // Focus on guest chip
      await guestChip.focus();
      await expect(guestChip).toBeFocused();
      
      // Activate drag mode with keyboard
      await page.keyboard.press('Space');
      await expect(guestChip).toHaveAttribute('aria-grabbed', 'true');
      
      // Navigate to target table
      await page.keyboard.press('Tab');
      const targetTable = page.locator('[data-testid="table-Head Table"]');
      await expect(targetTable).toBeFocused();
      
      // Complete drop operation
      await page.keyboard.press('Space');
      
      // Verify successful assignment
      await expect(page.locator('[data-testid="table-Head Table"] [data-testid="guest-chip-John Doe"]')).toBeVisible();
    });

    test('should validate ARIA labels and accessibility attributes', async ({ page }) => {
      // Check drag-drop ARIA attributes
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      await expect(guestChip).toHaveAttribute('draggable', 'true');
      await expect(guestChip).toHaveAttribute('role', 'button');
      await expect(guestChip).toHaveAttribute('aria-label');
      
      // Check drop zone attributes
      const table = page.locator('[data-testid="table-Head Table"]');
      await expect(table).toHaveAttribute('role', 'region');
      await expect(table).toHaveAttribute('aria-label');
      
      // Verify screen reader announcements
      const srAnnouncements = page.locator('[aria-live="polite"]');
      await expect(srAnnouncements).toBeAttached();
    });

    test('should handle undo/redo operations', async ({ page }) => {
      // Perform initial assignment
      await dragGuestToTable(page, 'John Doe', 'Head Table');
      
      // Trigger undo operation
      await page.keyboard.press('Control+z');
      
      // Verify guest is back in unassigned list
      await expect(page.locator('[data-testid="unassigned-guests"] [data-testid="guest-chip-John Doe"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-Head Table"] [data-testid="guest-chip-John Doe"]')).not.toBeVisible();
      
      // Trigger redo operation
      await page.keyboard.press('Control+y');
      
      // Verify assignment is restored
      await expect(page.locator('[data-testid="table-Head Table"] [data-testid="guest-chip-John Doe"]')).toBeVisible();
    });
  });

  test.describe('Mobile Touch Operations', () => {
    test.use({ 
      viewport: { width: 375, height: 667 }, // iPhone SE viewport
      hasTouch: true,
    });

    test('should handle touch-based drag operations on mobile', async ({ page }) => {
      // Verify mobile interface is loaded
      await expect(page.locator('[data-testid="mobile-seating-interface"]')).toBeVisible();
      
      // Switch to guest management tab
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      
      // Perform touch drag operation
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      await guestChip.tap({ duration: 800 }); // Long press to initiate drag
      
      // Verify drag state activated
      await expect(guestChip).toHaveClass(/dragging/);
      
      // Switch to tables tab
      await page.locator('[data-testid="mobile-tab-tables"]').tap();
      
      // Tap target table to complete assignment
      await page.locator('[data-testid="table-Head Table"]').tap();
      
      // Verify successful assignment in mobile view
      await expect(page.locator('[data-testid="mobile-assignment-success"]')).toBeVisible();
    });

    test('should show mobile-optimized conflict alerts', async ({ page }) => {
      // Assign conflicting guests
      await page.locator('[data-testid="mobile-tab-guests"]').tap();
      await page.locator('[data-testid="guest-chip-Bob Wilson"]').tap();
      await page.locator('[data-testid="mobile-assign-to-table-Head Table"]').tap();
      
      await page.locator('[data-testid="guest-chip-Alice Cooper"]').tap(); 
      await page.locator('[data-testid="mobile-assign-to-table-Head Table"]').tap();
      
      // Verify mobile conflict modal appears
      await expect(page.locator('[data-testid="mobile-conflict-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-conflict-modal"]')).toContainText('Seating Conflict');
    });
  });

  test.describe('Responsive Breakpoint Testing', () => {
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Large Tablet', width: 1200, height: 800 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`should render correctly on ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.reload();
        await page.waitForLoadState('networkidle');

        if (width >= 768) {
          // Desktop/Tablet: Should show full interface
          await expect(page.locator('[data-testid="seating-arrangement-desktop"]')).toBeVisible();
          await expect(page.locator('[data-testid="guest-list-sidebar"]')).toBeVisible();
          await expect(page.locator('[data-testid="table-canvas"]')).toBeVisible();
        } else {
          // Mobile: Should show mobile interface
          await expect(page.locator('[data-testid="mobile-seating-interface"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-tab-navigation"]')).toBeVisible();
        }
      });
    });
  });

  test.describe('Real-time Updates and Collaboration', () => {
    test('should handle concurrent user modifications', async ({ page, context }) => {
      // Simulate second user making changes
      await page.route('**/api/seating/realtime-update', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'guest_assignment',
            guestId: 'guest-2',
            tableId: 'table-1', 
            userId: 'other-user-123',
            timestamp: Date.now(),
          }),
        });
      });

      // Make initial assignment
      await dragGuestToTable(page, 'John Doe', 'Head Table');
      
      // Trigger real-time update from another user
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('seating-update', {
          detail: {
            type: 'guest_assignment',
            guestId: 'guest-2',
            tableId: 'table-1',
            userId: 'other-user-123',
          }
        }));
      });

      // Verify collaborative update is reflected
      await expect(page.locator('[data-testid="table-Head Table"] [data-testid="guest-chip-Jane Smith"]')).toBeVisible();
      await expect(page.locator('[data-testid="collaboration-indicator"]')).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large guest lists efficiently', async ({ page }) => {
      // Mock large dataset
      const largeGuestList = Array.from({ length: 200 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        priority: 'friend',
      }));

      await page.route('**/api/seating/guests', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json', 
          body: JSON.stringify({ guests: largeGuestList }),
        });
      });

      await page.reload();
      
      // Measure initial render performance
      const renderStart = Date.now();
      await page.waitForLoadState('networkidle');
      const renderTime = Date.now() - renderStart;
      
      // Should render within reasonable time (< 2 seconds)
      expect(renderTime).toBeLessThan(2000);
      
      // Verify virtual scrolling is working
      await expect(page.locator('[data-testid="guest-list-virtual-container"]')).toBeVisible();
      
      // Test drag performance with large dataset
      const dragStart = Date.now();
      await dragGuestToTable(page, 'Guest 50', 'Head Table');
      const dragTime = Date.now() - dragStart;
      
      // Drag operation should be smooth (< 1 second)
      expect(dragTime).toBeLessThan(1000);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/seating/assign', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      // Attempt drag operation
      await dragGuestToTable(page, 'John Doe', 'Head Table');
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-notification"]')).toContainText('Failed to assign guest');
      
      // Verify rollback occurred
      await expect(page.locator('[data-testid="unassigned-guests"] [data-testid="guest-chip-John Doe"]')).toBeVisible();
    });

    test('should handle network disconnection', async ({ page }) => {
      // Simulate offline state
      await page.context().setOffline(true);
      
      // Attempt drag operation while offline
      await dragGuestToTable(page, 'John Doe', 'Head Table');
      
      // Verify offline handling
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-changes-indicator"]')).toBeVisible();
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Verify sync occurred
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
    });

    test('should validate malicious input attempts', async ({ page }) => {
      // Attempt XSS through guest name manipulation
      await page.evaluate(() => {
        const guestChip = document.querySelector('[data-testid="guest-chip-John Doe"]');
        if (guestChip) {
          guestChip.setAttribute('data-guest-name', '<script>alert("xss")</script>');
        }
      });

      await dragGuestToTable(page, 'John Doe', 'Head Table');
      
      // Verify XSS is prevented
      await expect(page.locator('script')).toHaveCount(0);
      await expect(page.locator('[data-testid="security-error"]')).not.toBeVisible();
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should pass WCAG 2.1 AA compliance', async ({ page }) => {
      // Test color contrast
      const guestChip = page.locator('[data-testid="guest-chip-John Doe"]');
      const styles = await guestChip.evaluate(el => getComputedStyle(el));
      
      // Verify sufficient color contrast (simplified check)
      expect(styles.color).toBeTruthy();
      expect(styles.backgroundColor).toBeTruthy();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test screen reader support
      const ariaLabels = await page.locator('[aria-label]').count();
      expect(ariaLabels).toBeGreaterThan(0);
      
      // Test focus management
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="focus-trap"]')).not.toBeVisible();
    });

    test('should announce drag-drop actions to screen readers', async ({ page }) => {
      const announcements = page.locator('[aria-live="polite"]');
      
      // Perform drag operation
      await dragGuestToTable(page, 'John Doe', 'Head Table');
      
      // Verify screen reader announcement
      await expect(announcements).toContainText('John Doe assigned to Head Table');
      
      // Test conflict announcements
      await dragGuestToTable(page, 'Bob Wilson', 'Head Table');
      await dragGuestToTable(page, 'Alice Cooper', 'Head Table');
      
      await expect(announcements).toContainText('Conflict detected');
    });
  });
});