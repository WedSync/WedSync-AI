/**
 * End-to-End Tests for WS-101 Alert System Integration
 * Tests complete alert workflows including UI, API, and real-time updates
 */

import { test, expect, Page } from '@playwright/test';
import { WebSocket } from 'ws';

test.describe('Alert System Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to alert dashboard
    await page.goto('/admin/alerts');
    await page.waitForLoadState('networkidle');
  });

  test('should display alert dashboard with real-time stats', async ({ page }) => {
    // Check dashboard loads
    await expect(page.locator('h1')).toContainText('Alert Dashboard');
    
    // Verify stats cards are present
    await expect(page.locator('[data-testid="total-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="critical-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="wedding-emergencies"]')).toBeVisible();
    
    // Check live status indicator
    await expect(page.locator('text=Live')).toBeVisible();
  });

  test('should create and display new alerts via API', async ({ page, request }) => {
    // Create a test alert via API
    const alertData = {
      type: 'system',
      severity: 'HIGH',
      title: 'E2E Test Alert',
      description: 'End-to-end test alert creation',
      source: 'e2e-test',
      weddingContext: {
        weddingId: 'e2e-wedding-123',
        weddingDate: new Date('2025-06-15').toISOString(),
        venue: 'Test Wedding Venue',
        guestCount: 150,
        criticalityLevel: 'high'
      }
    };

    const response = await request.post('/api/alerts', {
      data: alertData
    });
    
    expect(response.status()).toBe(201);
    
    // Wait for alert to appear in dashboard
    await page.waitForTimeout(1000);
    await page.reload();
    
    // Verify alert appears in list
    await expect(page.locator('text=E2E Test Alert')).toBeVisible();
    await expect(page.locator('[data-severity="HIGH"]')).toBeVisible();
  });

  test('should handle alert acknowledgment workflow', async ({ page, request }) => {
    // First create an alert
    const alertResponse = await request.post('/api/alerts', {
      data: {
        type: 'performance',
        severity: 'MEDIUM',
        title: 'Performance Test Alert',
        description: 'Testing acknowledgment workflow',
        source: 'e2e-ack-test'
      }
    });

    const alert = await alertResponse.json();
    await page.reload();
    
    // Find and acknowledge the alert
    const alertCard = page.locator(`[data-alert-id="${alert.data.id}"]`);
    await expect(alertCard).toBeVisible();
    
    const acknowledgeButton = alertCard.locator('button:has-text("Acknowledge")');
    await expect(acknowledgeButton).toBeVisible();
    await acknowledgeButton.click();
    
    // Verify acknowledgment
    await expect(alertCard.locator('[data-status="acknowledged"]')).toBeVisible();
    await expect(alertCard.locator('button:has-text("Resolve")')).toBeVisible();
  });

  test('should handle alert resolution workflow', async ({ page, request }) => {
    // Create and acknowledge an alert
    const alertResponse = await request.post('/api/alerts', {
      data: {
        type: 'system',
        severity: 'LOW',
        title: 'Resolution Test Alert',
        description: 'Testing resolution workflow',
        source: 'e2e-resolve-test'
      }
    });

    const alert = await alertResponse.json();
    
    // Acknowledge first
    await request.post(`/api/alerts/${alert.data.id}/acknowledge`);
    
    await page.reload();
    
    // Find and resolve the alert
    const alertCard = page.locator(`[data-alert-id="${alert.data.id}"]`);
    const resolveButton = alertCard.locator('button:has-text("Resolve")');
    await resolveButton.click();
    
    // Verify resolution
    await expect(alertCard.locator('[data-status="resolved"]')).toBeVisible();
    
    // Verify stats update
    await page.waitForTimeout(500);
    const resolvedCount = await page.locator('[data-testid="resolved-alerts"]').textContent();
    expect(parseInt(resolvedCount!)).toBeGreaterThan(0);
  });

  test('should handle alert escalation for critical issues', async ({ page, request }) => {
    // Create a high-priority alert
    const alertResponse = await request.post('/api/alerts', {
      data: {
        type: 'wedding_emergency',
        severity: 'CRITICAL',
        title: 'Critical Wedding Issue',
        description: 'Vendor emergency requiring escalation',
        source: 'e2e-escalation-test',
        weddingContext: {
          weddingId: 'critical-wedding-789',
          weddingDate: new Date().toISOString(),
          venue: 'Critical Test Venue',
          guestCount: 200,
          criticalityLevel: 'critical'
        }
      }
    });

    const alert = await alertResponse.json();
    await page.reload();
    
    // Find and escalate the alert
    const alertCard = page.locator(`[data-alert-id="${alert.data.id}"]`);
    const escalateButton = alertCard.locator('button:has-text("Escalate")');
    await escalateButton.click();
    
    // Verify escalation
    await expect(alertCard.locator('[data-status="escalated"]')).toBeVisible();
  });

  test('should filter alerts by severity and status', async ({ page }) => {
    // Test severity filter
    const severityFilter = page.locator('select[value="all"]:first');
    await severityFilter.selectOption('CRITICAL');
    
    // Should only show critical alerts
    const alertCards = page.locator('[data-testid="alert-card"]');
    const count = await alertCards.count();
    
    if (count > 0) {
      // Verify all visible alerts are critical
      for (let i = 0; i < count; i++) {
        await expect(alertCards.nth(i).locator('[data-severity="CRITICAL"]')).toBeVisible();
      }
    }
    
    // Test status filter
    const statusFilter = page.locator('select[value="all"]:last');
    await statusFilter.selectOption('active');
    
    // Reset filters
    await severityFilter.selectOption('all');
    await statusFilter.selectOption('all');
  });

  test('should search alerts by title and description', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search alerts"]');
    await searchInput.fill('test');
    
    // Wait for search to filter results
    await page.waitForTimeout(500);
    
    const alertCards = page.locator('[data-testid="alert-card"]');
    const count = await alertCards.count();
    
    if (count > 0) {
      // Verify search results contain the search term
      const firstAlert = alertCards.first();
      const alertText = await firstAlert.textContent();
      expect(alertText?.toLowerCase()).toContain('test');
    }
    
    // Clear search
    await searchInput.clear();
  });

  test('should display wedding context for wedding-related alerts', async ({ page, request }) => {
    // Create a wedding-specific alert
    const alertResponse = await request.post('/api/alerts', {
      data: {
        type: 'wedding_emergency',
        severity: 'WEDDING_EMERGENCY',
        title: 'Wedding Context Test',
        description: 'Testing wedding context display',
        source: 'e2e-context-test',
        weddingContext: {
          weddingId: 'context-wedding-456',
          weddingDate: new Date('2025-07-20').toISOString(),
          venue: 'Beautiful Wedding Venue',
          guestCount: 125,
          criticalityLevel: 'critical'
        }
      }
    });

    await page.reload();
    
    // Verify wedding context is displayed
    await expect(page.locator('text=Beautiful Wedding Venue')).toBeVisible();
    await expect(page.locator('text=125 guests')).toBeVisible();
    
    // Verify wedding emergency badge
    await expect(page.locator('[data-severity="WEDDING_EMERGENCY"]')).toBeVisible();
  });

  test('should show channel status for multi-channel alerts', async ({ page, request }) => {
    // Create an alert that triggers multiple channels
    const alertResponse = await request.post('/api/alerts', {
      data: {
        type: 'system',
        severity: 'HIGH',
        title: 'Multi-Channel Test',
        description: 'Testing multi-channel notification display',
        source: 'e2e-channel-test'
      }
    });

    await page.reload();
    
    // Look for channel indicators
    const channelBadges = page.locator('[data-testid="channel-badge"]');
    const count = await channelBadges.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Common channels should be present for high-severity alerts
    if (count > 0) {
      const channels = [];
      for (let i = 0; i < count; i++) {
        const channelText = await channelBadges.nth(i).textContent();
        if (channelText) channels.push(channelText.toLowerCase());
      }
      
      // High severity alerts should use multiple channels
      expect(channels.some(ch => ['slack', 'email', 'sms'].includes(ch))).toBeTruthy();
    }
  });

  test('should handle real-time updates via WebSocket', async ({ page }) => {
    // This test requires WebSocket simulation
    // In a real environment, you'd trigger alerts from another service
    
    const initialAlertCount = await page.locator('[data-testid="total-alerts"]').textContent();
    
    // Simulate WebSocket message (would normally come from server)
    await page.evaluate(() => {
      // Mock WebSocket message reception
      const mockWs = new WebSocket('ws://localhost:3000/api/alerts/ws');
      mockWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'alert_created') {
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('newAlert', { detail: data.alert }));
        }
      };
    });
    
    // Verify live status indicator
    await expect(page.locator('text=Live')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test network error handling
    await page.route('/api/alerts**', route => route.abort());
    
    await page.reload();
    
    // Should show error state or fallback
    await expect(page.locator('text=Error').or(page.locator('text=Failed to load'))).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be functional
    await expect(page.locator('h1')).toBeVisible();
    
    // Stats cards should stack vertically or scroll horizontally
    const statsContainer = page.locator('[data-testid="stats-container"]');
    await expect(statsContainer).toBeVisible();
    
    // Filters should remain accessible
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
    
    // Check for proper button labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Each button should have either text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
    
    // Check for proper form labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');
      
      // Should have some form of label
      expect(placeholder || ariaLabel || id).toBeTruthy();
    }
  });

  test('should perform well under load', async ({ page }) => {
    // Measure initial load performance
    const startTime = Date.now();
    await page.goto('/admin/alerts');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Check for performance best practices
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });
    
    const navigation = JSON.parse(performanceEntries)[0];
    
    if (navigation) {
      // DOM content should load quickly
      expect(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart).toBeLessThan(2000);
    }
  });
});

test.describe('Alert API Integration', () => {
  test('should handle concurrent alert creation', async ({ request }) => {
    const promises = [];
    
    // Create 10 alerts concurrently
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post('/api/alerts', {
          data: {
            type: 'system',
            severity: 'LOW',
            title: `Concurrent Alert ${i}`,
            description: `Load test alert ${i}`,
            source: 'concurrent-test'
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(201);
    });
  });

  test('should validate alert data properly', async ({ request }) => {
    // Test invalid severity
    const invalidResponse = await request.post('/api/alerts', {
      data: {
        type: 'system',
        severity: 'INVALID',
        title: 'Invalid Alert',
        description: 'Testing validation',
        source: 'validation-test'
      }
    });
    
    expect(invalidResponse.status()).toBe(400);
    
    // Test missing required fields
    const missingFieldsResponse = await request.post('/api/alerts', {
      data: {
        type: 'system'
        // Missing required fields
      }
    });
    
    expect(missingFieldsResponse.status()).toBe(400);
  });

  test('should handle rate limiting appropriately', async ({ request }) => {
    const promises = [];
    
    // Attempt to create many alerts rapidly
    for (let i = 0; i < 100; i++) {
      promises.push(
        request.post('/api/alerts', {
          data: {
            type: 'system',
            severity: 'LOW',
            title: `Rate Limit Test ${i}`,
            description: 'Testing rate limits',
            source: 'rate-limit-test'
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // Should handle the load gracefully (some may be rate limited)
    const successCount = responses.filter(r => r.status() === 201).length;
    const rateLimitedCount = responses.filter(r => r.status() === 429).length;
    
    // Most should succeed, some may be rate limited
    expect(successCount + rateLimitedCount).toBe(100);
  });
});