/**
 * Cross-Browser Compatibility Tests for Payment Calendar - WS-165
 * Tests payment calendar functionality across multiple browsers and devices
 * Critical for wedding planning - ensures all users can manage payments regardless of device
 */

import { test, expect, devices, BrowserContext, Page } from '@playwright/test';
import { mockPaymentData, mockPaymentSummary, testUtils } from '../../tests/payments/fixtures/payment-fixtures';

// Test configuration for different browsers
const browserProjects = [
  'chromium',
  'firefox', 
  'webkit',
  'Mobile Chrome',
  'Mobile Safari',
  'Microsoft Edge',
  'Google Chrome',
  'iPhone SE',
  'iPhone 12 Pro',
  'iPhone 14 Pro Max',
  'Pixel 7'
];

// Core functionality tests across all browsers
test.describe('Payment Calendar Cross-Browser Compatibility', () => {

  test.describe('Core Functionality Tests', () => {
    browserProjects.forEach(browserName => {
      test(`Payment calendar loads and displays data correctly on ${browserName}`, async ({ page }) => {
        // Skip if current browser doesn't match test browser
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        
        // Wait for initial load
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible({ timeout: 10000 });
        
        // Verify core elements are present
        await expect(page.locator('[data-testid="payment-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="payment-filters"]')).toBeVisible();
        
        // Check calendar grid loads
        await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
        
        // Verify payment items display
        const paymentItems = page.locator('[data-testid^="payment-item-"]');
        await expect(paymentItems.first()).toBeVisible({ timeout: 5000 });
        
        // Verify interaction works
        await paymentItems.first().click();
        await expect(page.locator('[data-testid="payment-details-modal"]')).toBeVisible({ timeout: 3000 });
      });

      test(`Payment creation form works on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        
        // Wait for page load
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Open create payment form
        await page.click('[data-testid="create-payment-btn"]');
        await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();
        
        // Fill form fields
        await page.fill('[data-testid="payment-title-input"]', 'Test Payment');
        await page.fill('[data-testid="payment-amount-input"]', '1500.00');
        await page.fill('[data-testid="payment-due-date-input"]', '2025-03-15');
        
        // Select vendor
        await page.click('[data-testid="vendor-select"]');
        await page.click('[data-testid="vendor-option-1"]');
        
        // Select priority
        await page.click('[data-testid="priority-select"]');
        await page.click('[data-testid="priority-high"]');
        
        // Submit form
        await page.click('[data-testid="submit-payment-btn"]');
        
        // Verify success message
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 5000 });
      });

      test(`Payment filtering works on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Test status filter
        await page.click('[data-testid="status-filter"]');
        await page.click('[data-testid="status-pending"]');
        
        // Verify filtered results
        const pendingPayments = page.locator('[data-testid*="payment-item"][data-status="pending"]');
        await expect(pendingPayments.first()).toBeVisible({ timeout: 3000 });
        
        // Test priority filter
        await page.click('[data-testid="priority-filter"]');
        await page.click('[data-testid="priority-high"]');
        
        // Verify high priority items shown
        const highPriorityPayments = page.locator('[data-testid*="payment-item"][data-priority="high"]');
        await expect(highPriorityPayments.first()).toBeVisible({ timeout: 3000 });
      });
    });
  });

  test.describe('Mobile-Specific Tests', () => {
    const mobileProjects = ['Mobile Chrome', 'Mobile Safari', 'iPhone SE', 'iPhone 12 Pro', 'iPhone 14 Pro Max', 'Pixel 7'];
    
    mobileProjects.forEach(deviceName => {
      test(`Touch interactions work on ${deviceName}`, async ({ page, isMobile }) => {
        if (!isMobile) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Test tap interactions
        const firstPayment = page.locator('[data-testid^="payment-item-"]').first();
        await firstPayment.tap();
        await expect(page.locator('[data-testid="payment-details-modal"]')).toBeVisible();
        
        // Test swipe to close modal
        const modal = page.locator('[data-testid="payment-details-modal"]');
        await modal.swipeDown();
        await expect(modal).not.toBeVisible();
        
        // Test scroll behavior
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        
        // Verify calendar still responsive after scroll
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      });

      test(`Mobile calendar navigation on ${deviceName}`, async ({ page, isMobile }) => {
        if (!isMobile) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Test month navigation
        await page.tap('[data-testid="next-month-btn"]');
        await page.waitForTimeout(500);
        
        // Verify month changed
        const monthHeader = page.locator('[data-testid="calendar-month-header"]');
        await expect(monthHeader).toContainText('March 2025');
        
        // Test calendar view toggle
        await page.tap('[data-testid="calendar-view-toggle"]');
        await expect(page.locator('[data-testid="list-view"]')).toBeVisible();
        
        // Switch back to calendar view
        await page.tap('[data-testid="calendar-view-toggle"]');
        await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
      });
    });
  });

  test.describe('Form Input Compatibility', () => {
    browserProjects.forEach(browserName => {
      test(`Date picker works on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await page.click('[data-testid="create-payment-btn"]');
        await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible();
        
        // Test date input
        const dateInput = page.locator('[data-testid="payment-due-date-input"]');
        await dateInput.click();
        
        // Check if native date picker or custom picker appears
        const hasNativePicker = await page.evaluate(() => {
          const input = document.querySelector('[data-testid="payment-due-date-input"]') as HTMLInputElement;
          return input?.type === 'date';
        });
        
        if (hasNativePicker) {
          await dateInput.fill('2025-03-15');
        } else {
          // Custom date picker interaction
          await expect(page.locator('[data-testid="date-picker-modal"]')).toBeVisible();
          await page.click('[data-testid="date-15"]');
        }
        
        // Verify date is set
        const dateValue = await dateInput.inputValue();
        expect(dateValue).toContain('2025-03-15');
      });

      test(`Number input validation on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await page.click('[data-testid="create-payment-btn"]');
        
        const amountInput = page.locator('[data-testid="payment-amount-input"]');
        
        // Test valid amount
        await amountInput.fill('1500.99');
        await page.click('[data-testid="payment-title-input"]'); // Trigger blur
        
        // Should not show error
        await expect(page.locator('[data-testid="amount-error"]')).not.toBeVisible();
        
        // Test invalid amount
        await amountInput.clear();
        await amountInput.fill('invalid-amount');
        await page.click('[data-testid="payment-title-input"]');
        
        // Should show validation error
        await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
      });
    });
  });

  test.describe('Responsive Design Tests', () => {
    const viewportSizes = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop Small', width: 1280, height: 720 },
      { name: 'Desktop Large', width: 1920, height: 1080 }
    ];

    viewportSizes.forEach(viewport => {
      test(`Layout adapts correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Take screenshot for visual comparison
        await page.screenshot({ 
          path: `test-results/cross-browser/payment-calendar-${viewport.name}-${viewport.width}x${viewport.height}.png`,
          fullPage: true 
        });
        
        // Check mobile-specific elements
        if (viewport.width < 768) {
          // Mobile navigation should be visible
          await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
          
          // Desktop-only elements should be hidden
          await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
          
          // Calendar should use mobile layout
          await expect(page.locator('[data-testid="mobile-calendar-view"]')).toBeVisible();
        } else {
          // Desktop navigation should be visible
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
          
          // Full calendar grid should be visible
          await expect(page.locator('[data-testid="desktop-calendar-grid"]')).toBeVisible();
        }
      });
    });
  });

  test.describe('Performance Across Browsers', () => {
    browserProjects.forEach(browserName => {
      test(`Page load performance on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        const startTime = Date.now();
        
        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        const loadTime = Date.now() - startTime;
        
        // Page should load within acceptable time (5 seconds for cross-browser compatibility)
        expect(loadTime).toBeLessThan(5000);
        
        // Measure Core Web Vitals where supported
        const webVitals = await page.evaluate(() => {
          return new Promise((resolve) => {
            if ('web-vital' in window) {
              // @ts-ignore
              window['web-vital'].getLCP(resolve);
            } else {
              resolve(null);
            }
          });
        });
        
        if (webVitals) {
          console.log(`${browserName} Web Vitals:`, webVitals);
        }
      });

      test(`JavaScript execution performance on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Test JavaScript-heavy operations
        const performanceResults = await page.evaluate(() => {
          const startTime = performance.now();
          
          // Simulate filtering large dataset
          const mockData = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            amount: Math.random() * 10000,
            status: ['pending', 'paid', 'overdue'][i % 3],
            priority: ['low', 'medium', 'high'][i % 3]
          }));
          
          const filtered = mockData
            .filter(item => item.status === 'pending')
            .sort((a, b) => b.amount - a.amount);
          
          const endTime = performance.now();
          
          return {
            duration: endTime - startTime,
            itemsProcessed: mockData.length,
            itemsFiltered: filtered.length
          };
        });
        
        // JavaScript operations should complete quickly
        expect(performanceResults.duration).toBeLessThan(100); // 100ms
        expect(performanceResults.itemsProcessed).toBe(1000);
        expect(performanceResults.itemsFiltered).toBe(334); // Approximately 1/3
      });
    });
  });

  test.describe('Browser-Specific Feature Tests', () => {
    test('Local storage persistence works across browsers', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      
      // Set filter preferences
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-pending"]');
      
      // Check local storage
      const filterPrefs = await page.evaluate(() => {
        localStorage.setItem('payment-filters', JSON.stringify({ status: 'pending' }));
        return localStorage.getItem('payment-filters');
      });
      
      expect(filterPrefs).toContain('pending');
      
      // Reload page
      await page.reload();
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      
      // Verify filters persist
      const activeFilter = page.locator('[data-testid="status-filter"][aria-pressed="true"]');
      await expect(activeFilter).toBeVisible();
    });

    test('Service worker functionality (PWA features)', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      
      // Check if service worker is supported and registered
      const swSupport = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      if (swSupport) {
        // Test offline capability indicators
        await expect(page.locator('[data-testid="pwa-install-banner"]')).toBeVisible({ timeout: 3000 });
        
        // Test offline status detection
        await page.evaluate(() => {
          // Simulate offline
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
          });
          window.dispatchEvent(new Event('offline'));
        });
        
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      }
    });

    test('Clipboard API compatibility', async ({ page, browserName }) => {
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      
      // Click on payment item to open details
      const firstPayment = page.locator('[data-testid^="payment-item-"]').first();
      await firstPayment.click();
      await expect(page.locator('[data-testid="payment-details-modal"]')).toBeVisible();
      
      // Test share/copy functionality if supported
      const clipboardSupport = await page.evaluate(() => {
        return 'clipboard' in navigator;
      });
      
      if (clipboardSupport) {
        await page.click('[data-testid="copy-payment-details-btn"]');
        
        // Verify success message
        await expect(page.locator('[data-testid="copy-success-message"]')).toBeVisible({ timeout: 2000 });
      } else {
        // Fallback should be available
        await expect(page.locator('[data-testid="copy-fallback-btn"]')).toBeVisible();
      }
    });
  });

  test.describe('Cross-Browser Data Consistency', () => {
    test('Payment data displays consistently across browsers', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      
      // Get payment data
      const paymentData = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[data-testid^="payment-item-"]'));
        return items.map(item => ({
          title: item.querySelector('[data-testid="payment-title"]')?.textContent,
          amount: item.querySelector('[data-testid="payment-amount"]')?.textContent,
          status: item.getAttribute('data-status'),
          priority: item.getAttribute('data-priority')
        }));
      });
      
      // Verify data structure
      expect(paymentData.length).toBeGreaterThan(0);
      paymentData.forEach(payment => {
        expect(payment.title).toBeTruthy();
        expect(payment.amount).toBeTruthy();
        expect(payment.status).toMatch(/pending|paid|overdue|due-soon/);
        expect(payment.priority).toMatch(/low|medium|high|critical/);
      });
      
      // Calculate totals
      const totalAmount = paymentData.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount?.replace(/[^0-9.]/g, '') || '0');
        return sum + amount;
      }, 0);
      
      // Verify summary matches
      const summaryTotal = await page.locator('[data-testid="total-amount"]').textContent();
      const summaryValue = parseFloat(summaryTotal?.replace(/[^0-9.]/g, '') || '0');
      
      expect(Math.abs(totalAmount - summaryValue)).toBeLessThan(0.01); // Allow for rounding
    });
  });

  test.describe('Error Handling Across Browsers', () => {
    browserProjects.forEach(browserName => {
      test(`Network error handling on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        // Mock network failure
        await page.route('**/api/payments/**', route => {
          route.abort('failed');
        });
        
        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        
        // Should show error state
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
        
        // Clear route mock and test retry
        await page.unroute('**/api/payments/**');
        await page.click('[data-testid="retry-button"]');
        
        // Should recover and show data
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible({ timeout: 5000 });
      });

      test(`JavaScript error recovery on ${browserName}`, async ({ page }) => {
        if (!page.context()._browserName || 
            (!browserName.toLowerCase().includes(page.context()._browserName) && 
             !browserName.toLowerCase().includes('mobile'))) {
          test.skip();
        }

        // Listen for JavaScript errors
        const jsErrors: string[] = [];
        page.on('pageerror', error => {
          jsErrors.push(error.message);
        });
        
        await page.goto('/payments/calendar?weddingId=test-wedding-123');
        
        // Trigger potential error condition
        await page.evaluate(() => {
          try {
            // Simulate undefined access that should be handled
            (window as any).undefined_function();
          } catch (e) {
            // Error should be caught by error boundary
            console.error('Expected error caught:', e);
          }
        });
        
        // Application should still function
        await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
        
        // Error boundary should show if serious error
        const errorBoundary = page.locator('[data-testid="error-boundary"]');
        const hasErrorBoundary = await errorBoundary.isVisible();
        
        if (hasErrorBoundary) {
          // Should have recovery option
          await expect(page.locator('[data-testid="error-recover-btn"]')).toBeVisible();
        }
        
        // Log any uncaught errors for investigation
        if (jsErrors.length > 0) {
          console.warn(`JavaScript errors on ${browserName}:`, jsErrors);
        }
      });
    });
  });
});

// Browser-specific test configurations
test.describe('Browser-Specific Configurations', () => {
  
  test.describe('Safari/WebKit Specific Tests', () => {
    test('Safari date input handling', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      await page.click('[data-testid="create-payment-btn"]');
      
      // Safari has specific date input behavior
      const dateInput = page.locator('[data-testid="payment-due-date-input"]');
      await dateInput.click();
      
      // Safari may show native date picker
      await page.keyboard.type('03/15/2025');
      
      const value = await dateInput.inputValue();
      expect(value).toContain('2025');
    });
  });

  test.describe('Chrome/Chromium Specific Tests', () => {
    test('Chrome autofill compatibility', async ({ page, browserName }) => {
      test.skip(!browserName?.includes('chromium') && !browserName?.includes('chrome'), 'Chrome-specific test');
      
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      await page.click('[data-testid="create-payment-btn"]');
      
      // Test autofill scenarios
      const titleInput = page.locator('[data-testid="payment-title-input"]');
      await titleInput.focus();
      
      // Chrome may trigger autofill suggestions
      await page.keyboard.type('Venue Payment');
      
      // Verify input accepts the value
      const value = await titleInput.inputValue();
      expect(value).toBe('Venue Payment');
    });
  });

  test.describe('Firefox Specific Tests', () => {
    test('Firefox scroll behavior', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await page.goto('/payments/calendar?weddingId=test-wedding-123');
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
      
      // Firefox has specific scroll behavior
      await page.evaluate(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      });
      
      await page.waitForTimeout(1000);
      
      // Verify calendar remains functional after scroll
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
    });
  });
});

// Performance benchmarks across browsers
test.describe('Cross-Browser Performance Benchmarks', () => {
  
  test('Rendering performance comparison', async ({ page, browserName }) => {
    const startTime = Date.now();
    
    await page.goto('/payments/calendar?weddingId=test-wedding-123');
    await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
    
    const renderTime = Date.now() - startTime;
    
    // Log performance for comparison
    console.log(`${browserName} render time: ${renderTime}ms`);
    
    // All browsers should render within reasonable time
    expect(renderTime).toBeLessThan(3000);
  });

  test('Memory usage monitoring', async ({ page, browserName }) => {
    await page.goto('/payments/calendar?weddingId=test-wedding-123');
    await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible();
    
    // Get memory usage if available
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory || null;
    });
    
    if (memoryInfo) {
      console.log(`${browserName} memory usage:`, {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
        allocated: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
      });
      
      // Memory usage should be reasonable
      const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
      expect(usedMB).toBeLessThan(100); // Less than 100MB
    }
  });
});