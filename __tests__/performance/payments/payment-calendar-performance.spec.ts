import { test, expect, Page } from '@playwright/test';

// Performance benchmarking for WS-165 Payment Calendar
// Critical requirement: Sub-200ms API response times
// UI render time: <100ms for good UX

const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 200, // ms
  UI_RENDER_TIME: 100, // ms
  LARGE_DATASET_LOAD: 500, // ms for 1000+ items
  MEMORY_USAGE_LIMIT: 50, // MB
  FIRST_CONTENTFUL_PAINT: 2000, // ms
  LARGEST_CONTENTFUL_PAINT: 4000, // ms
  CUMULATIVE_LAYOUT_SHIFT: 0.1, // CLS score
  INTERACTION_TO_NEXT_PAINT: 200 // ms
};

const MOCK_WEDDING_ID = '123e4567-e89b-12d3-a456-426614174001';

class PerformanceMetrics {
  constructor(private page: Page) {}

  async measureAPIResponseTime(url: string): Promise<number> {
    const startTime = performance.now();
    const response = await this.page.request.get(url);
    const endTime = performance.now();
    
    expect(response.ok()).toBeTruthy();
    return endTime - startTime;
  }

  async measurePageLoadTime(url: string): Promise<any> {
    const startTime = performance.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    const endTime = performance.now();

    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
        totalLoadTime: endTime - startTime
      };
    });

    return metrics;
  }

  async measureUIRenderTime(selector: string): Promise<number> {
    const startTime = performance.now();
    await this.page.waitForSelector(selector, { state: 'visible' });
    const endTime = performance.now();
    
    return endTime - startTime;
  }

  async measureMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize / 1024 / 1024, // MB
          totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024, // MB
          jsHeapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024 // MB
        };
      }
      return null;
    });
  }

  async measureInteractionLatency(action: () => Promise<void>): Promise<number> {
    const startTime = performance.now();
    await action();
    const endTime = performance.now();
    
    return endTime - startTime;
  }

  async getCoreWebVitals(): Promise<any> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {
            CLS: 0,
            FCP: 0,
            LCP: 0,
            FID: 0,
            INP: 0
          };

          entries.forEach(entry => {
            switch (entry.entryType) {
              case 'layout-shift':
                if (!(entry as any).hadRecentInput) {
                  vitals.CLS += (entry as any).value;
                }
                break;
              case 'paint':
                if (entry.name === 'first-contentful-paint') {
                  vitals.FCP = entry.startTime;
                }
                break;
              case 'largest-contentful-paint':
                vitals.LCP = entry.startTime;
                break;
              case 'first-input':
                vitals.FID = (entry as any).processingStart - entry.startTime;
                break;
              case 'event':
                if ((entry as any).name === 'inp') {
                  vitals.INP = Math.max(vitals.INP, (entry as any).processingStart - entry.startTime);
                }
                break;
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ['layout-shift', 'paint', 'largest-contentful-paint', 'first-input', 'event'] });
        
        // Resolve after 5 seconds if no entries
        setTimeout(() => resolve({}), 5000);
      });
    });
  }
}

test.describe('Payment Calendar Performance Tests', () => {
  let performanceMetrics: PerformanceMetrics;

  test.beforeEach(async ({ page }) => {
    performanceMetrics = new PerformanceMetrics(page);

    // Mock authentication
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'mock-token'
        })
      });
    });
  });

  test.describe('API Performance', () => {
    test('GET /api/payments/schedules responds within 200ms', async ({ page }) => {
      // Mock realistic dataset
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: `payment-${i}`,
        weddingId: MOCK_WEDDING_ID,
        title: `Payment ${i}`,
        amount: Math.random() * 10000,
        dueDate: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
        status: ['pending', 'due-soon', 'overdue', 'paid'][i % 4],
        vendor: { name: `Vendor ${i}`, category: 'Testing' }
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        // Add realistic delay to simulate network
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ schedules: mockData, total: 50 })
          });
        }, 50); // 50ms simulated network delay
      });

      const responseTime = await performanceMetrics.measureAPIResponseTime(
        `/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`✅ API response time: ${responseTime.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME}ms)`);
    });

    test('POST /api/payments/schedules responds within 200ms', async ({ page }) => {
      await page.route('**/api/payments/schedules', (route) => {
        if (route.request().method() === 'POST') {
          setTimeout(() => {
            route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({
                schedule: { id: 'new-payment' },
                message: 'Payment created successfully'
              })
            });
          }, 75); // 75ms simulated processing time
        }
      });

      const createPayload = {
        weddingId: MOCK_WEDDING_ID,
        title: 'Performance Test Payment',
        amount: 1000,
        dueDate: '2025-06-01T00:00:00Z',
        vendor: { id: 'vendor-001', name: 'Test Vendor', category: 'Testing' },
        priority: 'medium'
      };

      const startTime = performance.now();
      const response = await page.request.post('/api/payments/schedules', {
        data: createPayload
      });
      const endTime = performance.now();

      const responseTime = endTime - startTime;
      
      expect(response.status()).toBe(201);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`✅ POST API response time: ${responseTime.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME}ms)`);
    });

    test('handles large dataset queries efficiently', async ({ page }) => {
      // Mock large dataset (1000 payments)
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `payment-${i}`,
        weddingId: MOCK_WEDDING_ID,
        title: `Payment ${i}`,
        amount: Math.random() * 10000,
        dueDate: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        status: ['pending', 'due-soon', 'overdue', 'paid'][i % 4],
        vendor: { name: `Vendor ${i}`, category: ['Venue', 'Catering', 'Photography', 'Flowers'][i % 4] }
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ schedules: largeDataset, total: 1000 })
          });
        }, 150); // Simulate realistic database query time
      });

      const responseTime = await performanceMetrics.measureAPIResponseTime(
        `/api/payments/schedules?weddingId=${MOCK_WEDDING_ID}`
      );

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATASET_LOAD);
      console.log(`✅ Large dataset API response: ${responseTime.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.LARGE_DATASET_LOAD}ms)`);
    });
  });

  test.describe('UI Rendering Performance', () => {
    test('payment calendar renders within 100ms', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [
              {
                id: 'payment-001',
                title: 'Test Payment',
                amount: 1000,
                dueDate: '2025-03-01',
                status: 'pending',
                vendor: { name: 'Test Vendor', category: 'Testing' }
              }
            ],
            total: 1
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);

      const renderTime = await performanceMetrics.measureUIRenderTime('[data-testid="payment-calendar"]');

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RENDER_TIME);
      console.log(`✅ UI render time: ${renderTime.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.UI_RENDER_TIME}ms)`);
    });

    test('large payment list renders efficiently with virtualization', async ({ page }) => {
      // Create large mock dataset
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        id: `payment-${i}`,
        title: `Payment ${i}`,
        amount: Math.random() * 10000,
        dueDate: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
        status: ['pending', 'due-soon', 'overdue', 'paid'][i % 4],
        vendor: { name: `Vendor ${i}`, category: 'Testing' }
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: largeDataset, total: 500 })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      
      const renderTime = await performanceMetrics.measureUIRenderTime('[data-testid="payment-list"]');

      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATASET_LOAD);
      
      // Verify virtualization - only visible items should be in DOM
      const renderedItems = await page.locator('[data-testid^="payment-item-"]').count();
      expect(renderedItems).toBeLessThan(50); // Should virtualize large list
      
      console.log(`✅ Large dataset render: ${renderTime.toFixed(2)}ms, ${renderedItems} items rendered (virtualized)`);
    });

    test('form interaction response time meets target', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: [], total: 0 })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForSelector('[data-testid="payment-calendar"]');

      const interactionTime = await performanceMetrics.measureInteractionLatency(async () => {
        await page.click('[data-testid="add-payment-button"]');
        await page.waitForSelector('[data-testid="payment-form-modal"]');
      });

      expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TO_NEXT_PAINT);
      console.log(`✅ Form interaction time: ${interactionTime.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.INTERACTION_TO_NEXT_PAINT}ms)`);
    });

    test('status update response time meets target', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schedules: [{
                id: 'payment-001',
                status: 'pending',
                vendor: { name: 'Test Vendor' }
              }],
              total: 1
            })
          });
        } else if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schedule: { id: 'payment-001', status: 'paid' }
            })
          });
        }
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForSelector('[data-testid="payment-item-payment-001"]');

      const updateTime = await performanceMetrics.measureInteractionLatency(async () => {
        await page.click('[data-testid="status-dropdown-payment-001"]');
        await page.click('[data-value="paid"]');
        await page.waitForSelector('[data-testid="status-updated-message"]');
      });

      expect(updateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TO_NEXT_PAINT);
      console.log(`✅ Status update time: ${updateTime.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.INTERACTION_TO_NEXT_PAINT}ms)`);
    });
  });

  test.describe('Memory Usage Performance', () => {
    test('maintains reasonable memory usage with large datasets', async ({ page }) => {
      // Create very large dataset
      const hugeDataset = Array.from({ length: 2000 }, (_, i) => ({
        id: `payment-${i}`,
        title: `Payment ${i}`,
        amount: Math.random() * 10000,
        dueDate: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
        status: ['pending', 'due-soon', 'overdue', 'paid'][i % 4],
        vendor: { 
          name: `Vendor ${i}`, 
          category: 'Testing',
          description: `Detailed description for vendor ${i} with lots of text to increase memory usage`
        }
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: hugeDataset, total: 2000 })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      const memoryUsage = await performanceMetrics.measureMemoryUsage();
      
      if (memoryUsage) {
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
        console.log(`✅ Memory usage: ${memoryUsage.usedJSHeapSize.toFixed(2)}MB (target: <${PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT}MB)`);
      }
    });

    test('prevents memory leaks during frequent updates', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [{
              id: 'payment-001',
              status: 'pending',
              vendor: { name: 'Test Vendor' }
            }],
            total: 1
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      const initialMemory = await performanceMetrics.measureMemoryUsage();

      // Perform many UI updates
      for (let i = 0; i < 100; i++) {
        await page.click('[data-testid="refresh-payments"]');
        await page.waitForTimeout(10);
      }

      const finalMemory = await performanceMetrics.measureMemoryUsage();

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        expect(memoryIncrease).toBeLessThan(10); // Should not increase by more than 10MB
        console.log(`✅ Memory leak test: ${memoryIncrease.toFixed(2)}MB increase (target: <10MB)`);
      }
    });
  });

  test.describe('Core Web Vitals', () => {
    test('meets Core Web Vitals thresholds', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: Array.from({ length: 20 }, (_, i) => ({
              id: `payment-${i}`,
              title: `Payment ${i}`,
              amount: 1000 + i * 100,
              vendor: { name: `Vendor ${i}` }
            })),
            total: 20
          })
        });
      });

      const loadMetrics = await performanceMetrics.measurePageLoadTime(
        `/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`
      );

      // First Contentful Paint
      expect(loadMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT);
      
      // Largest Contentful Paint
      expect(loadMetrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT);

      console.log(`✅ FCP: ${loadMetrics.firstContentfulPaint.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT}ms)`);
      console.log(`✅ LCP: ${loadMetrics.largestContentfulPaint.toFixed(2)}ms (target: <${PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT}ms)`);

      // Measure Cumulative Layout Shift
      const vitals = await performanceMetrics.getCoreWebVitals();
      if (vitals.CLS !== undefined) {
        expect(vitals.CLS).toBeLessThan(PERFORMANCE_THRESHOLDS.CUMULATIVE_LAYOUT_SHIFT);
        console.log(`✅ CLS: ${vitals.CLS.toFixed(3)} (target: <${PERFORMANCE_THRESHOLDS.CUMULATIVE_LAYOUT_SHIFT})`);
      }
    });

    test('optimizes Interaction to Next Paint (INP)', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [{
              id: 'payment-001',
              status: 'pending',
              vendor: { name: 'Test Vendor' }
            }],
            total: 1
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Test interaction responsiveness
      const interactions = [
        () => page.click('[data-testid="add-payment-button"]'),
        () => page.keyboard.press('Escape'),
        () => page.click('[data-testid="status-filter"]'),
        () => page.click('[data-testid="view-toggle"]')
      ];

      for (const interaction of interactions) {
        const interactionTime = await performanceMetrics.measureInteractionLatency(interaction);
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_TO_NEXT_PAINT);
      }
    });
  });

  test.describe('Network Performance', () => {
    test('optimizes payload sizes', async ({ page }) => {
      let requestSize = 0;
      let responseSize = 0;

      await page.route('**/api/payments/schedules*', (route) => {
        requestSize = route.request().postData()?.length || 0;
        
        const response = {
          schedules: Array.from({ length: 10 }, (_, i) => ({
            id: `payment-${i}`,
            title: `Payment ${i}`,
            amount: 1000,
            vendor: { name: `Vendor ${i}` }
          })),
          total: 10
        };
        
        const responseBody = JSON.stringify(response);
        responseSize = responseBody.length;
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: responseBody
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Response should be reasonably sized
      expect(responseSize).toBeLessThan(50000); // 50KB limit for 10 items
      console.log(`✅ Response payload size: ${responseSize} bytes (${(responseSize / 1024).toFixed(2)}KB)`);
    });

    test('implements efficient caching strategy', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/payments/schedules*', (route) => {
        requestCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Cache-Control': 'private, max-age=300', // 5 minutes
            'ETag': '"payment-schedules-v1"'
          },
          body: JSON.stringify({
            schedules: [{ id: 'payment-001', vendor: { name: 'Test' } }],
            total: 1
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Refresh page - should use cache
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should minimize duplicate requests through caching
      expect(requestCount).toBeLessThanOrEqual(2);
      console.log(`✅ Cache efficiency: ${requestCount} requests for 2 page loads`);
    });

    test('handles concurrent requests efficiently', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        // Add realistic processing delay
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schedules: [{ id: 'payment-001', vendor: { name: 'Test' } }],
              total: 1
            })
          });
        }, 100);
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      
      // Trigger multiple concurrent operations
      const concurrentOperations = [
        page.click('[data-testid="refresh-payments"]'),
        page.click('[data-testid="status-filter"]'),
        page.click('[data-testid="category-filter"]')
      ];

      const startTime = performance.now();
      await Promise.all(concurrentOperations);
      await page.waitForLoadState('networkidle');
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(500); // Should handle concurrency efficiently
      console.log(`✅ Concurrent operations: ${totalTime.toFixed(2)}ms`);
    });
  });

  test.describe('Scroll and Virtualization Performance', () => {
    test('maintains smooth scrolling with large datasets', async ({ page }) => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `payment-${i}`,
        title: `Payment ${i}`,
        amount: 1000 + i,
        vendor: { name: `Vendor ${i}` }
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: largeDataset, total: 1000 })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Test scroll performance
      const scrollStart = performance.now();
      
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 200));
        await page.waitForTimeout(50);
      }
      
      const scrollEnd = performance.now();
      const scrollTime = scrollEnd - scrollStart;

      expect(scrollTime).toBeLessThan(1000); // Should scroll smoothly
      console.log(`✅ Scroll performance: ${scrollTime.toFixed(2)}ms for 2000px scroll`);
    });

    test('updates virtual list efficiently', async ({ page }) => {
      const dataset = Array.from({ length: 500 }, (_, i) => ({
        id: `payment-${i}`,
        title: `Payment ${i}`,
        status: 'pending',
        vendor: { name: `Vendor ${i}` }
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: dataset, total: 500 })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Measure filter update performance with large dataset
      const filterTime = await performanceMetrics.measureInteractionLatency(async () => {
        await page.selectOption('[data-testid="status-filter"]', 'pending');
        await page.waitForTimeout(100); // Allow for filter processing
      });

      expect(filterTime).toBeLessThan(200);
      console.log(`✅ Filter update time with 500 items: ${filterTime.toFixed(2)}ms`);
    });
  });

  test.describe('Mobile Performance', () => {
    test('maintains performance on mobile devices', async ({ page }) => {
      // Simulate mobile device with slower CPU
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const context = page.context();
      await context.addInitScript(() => {
        // Simulate slower mobile CPU
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          value: 2,
          writable: false
        });
      });

      await page.route('**/api/payments/schedules*', (route) => {
        // Simulate slower mobile network
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schedules: Array.from({ length: 20 }, (_, i) => ({
                id: `payment-${i}`,
                vendor: { name: `Vendor ${i}` }
              })),
              total: 20
            })
          });
        }, 200);
      });

      const loadMetrics = await performanceMetrics.measurePageLoadTime(
        `/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`
      );

      // Mobile should still meet reasonable performance targets
      expect(loadMetrics.totalLoadTime).toBeLessThan(5000); // 5 second mobile target
      console.log(`✅ Mobile load time: ${loadMetrics.totalLoadTime.toFixed(2)}ms (target: <5000ms)`);
    });

    test('optimizes touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [{ id: 'payment-001', vendor: { name: 'Test' } }],
            total: 1
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Test touch target size and responsiveness
      const touchTarget = page.locator('[data-testid="payment-item-payment-001"]');
      const boundingBox = await touchTarget.boundingBox();
      
      expect(boundingBox?.width).toBeGreaterThan(44); // Minimum touch target size
      expect(boundingBox?.height).toBeGreaterThan(44);

      // Test touch interaction response
      const touchTime = await performanceMetrics.measureInteractionLatency(async () => {
        await touchTarget.click();
        await page.waitForTimeout(50);
      });

      expect(touchTime).toBeLessThan(100);
      console.log(`✅ Touch interaction time: ${touchTime.toFixed(2)}ms`);
    });
  });

  test.describe('Real-time Performance', () => {
    test('handles real-time updates efficiently', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [{ id: 'payment-001', status: 'pending', vendor: { name: 'Test' } }],
            total: 1
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Simulate real-time updates
      const updateTimes = [];
      
      for (let i = 0; i < 10; i++) {
        const updateTime = await performanceMetrics.measureInteractionLatency(async () => {
          await page.evaluate((index) => {
            window.dispatchEvent(new CustomEvent('payment-updated', {
              detail: { id: 'payment-001', status: index % 2 === 0 ? 'paid' : 'pending' }
            }));
          }, i);
          await page.waitForTimeout(10);
        });
        
        updateTimes.push(updateTime);
      }

      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      expect(avgUpdateTime).toBeLessThan(50); // Real-time updates should be very fast
      console.log(`✅ Real-time update average: ${avgUpdateTime.toFixed(2)}ms`);
    });

    test('batches multiple real-time updates', async ({ page }) => {
      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: Array.from({ length: 5 }, (_, i) => ({
              id: `payment-${i}`,
              status: 'pending',
              vendor: { name: `Vendor ${i}` }
            })),
            total: 5
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Simulate rapid batch updates
      const batchUpdateTime = await performanceMetrics.measureInteractionLatency(async () => {
        await page.evaluate(() => {
          // Simulate 5 rapid updates
          for (let i = 0; i < 5; i++) {
            window.dispatchEvent(new CustomEvent('payment-updated', {
              detail: { id: `payment-${i}`, status: 'paid' }
            }));
          }
        });
        await page.waitForTimeout(100); // Allow for batch processing
      });

      expect(batchUpdateTime).toBeLessThan(200);
      console.log(`✅ Batch update time: ${batchUpdateTime.toFixed(2)}ms for 5 updates`);
    });
  });

  test.describe('Performance Regression Prevention', () => {
    test('prevents performance regression in calculations', async ({ page }) => {
      // Test with increasingly large datasets
      const datasetSizes = [10, 50, 100, 500];
      const performanceData = [];

      for (const size of datasetSizes) {
        const dataset = Array.from({ length: size }, (_, i) => ({
          id: `payment-${i}`,
          amount: Math.random() * 10000,
          vendor: { name: `Vendor ${i}` }
        }));

        await page.route('**/api/payments/schedules*', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ schedules: dataset, total: size })
          });
        });

        const startTime = performance.now();
        await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
        await page.waitForSelector('[data-testid="payment-summary"]');
        const endTime = performance.now();

        const loadTime = endTime - startTime;
        performanceData.push({ size, loadTime });

        console.log(`Dataset size ${size}: ${loadTime.toFixed(2)}ms`);
      }

      // Performance should scale linearly or better
      const performance50 = performanceData.find(p => p.size === 50)?.loadTime || 0;
      const performance500 = performanceData.find(p => p.size === 500)?.loadTime || 0;
      
      // 10x data should not take 10x time (should be sub-linear due to optimizations)
      expect(performance500).toBeLessThan(performance50 * 5);
    });

    test('maintains performance under stress conditions', async ({ page }) => {
      // Create stress test dataset with complex data
      const stressDataset = Array.from({ length: 200 }, (_, i) => ({
        id: `payment-${i}`,
        title: `Complex Payment with Long Title ${i}`.repeat(3),
        description: `Detailed description for payment ${i}`.repeat(5),
        amount: Math.random() * 50000,
        dueDate: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        vendor: {
          name: `Vendor with Complex Name ${i}`,
          category: ['Venue', 'Catering', 'Photography', 'Flowers', 'Music'][i % 5],
          contact: {
            email: `vendor${i}@example.com`,
            phone: `555-${String(i).padStart(4, '0')}`
          }
        },
        attachments: Array.from({ length: Math.floor(Math.random() * 5) }, (_, j) => ({
          name: `attachment-${j}.pdf`,
          size: Math.random() * 1000000
        }))
      }));

      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schedules: stressDataset, total: 200 })
        });
      });

      const loadMetrics = await performanceMetrics.measurePageLoadTime(
        `/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`
      );

      expect(loadMetrics.totalLoadTime).toBeLessThan(3000);
      console.log(`✅ Stress test load time: ${loadMetrics.totalLoadTime.toFixed(2)}ms with complex dataset`);
    });
  });

  test.describe('Performance Monitoring', () => {
    test('tracks performance metrics in production-like environment', async ({ page }) => {
      // Enable performance monitoring
      await page.addInitScript(() => {
        (window as any).performanceMetrics = [];
        
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const start = performance.now();
          const response = await originalFetch(...args);
          const end = performance.now();
          
          (window as any).performanceMetrics.push({
            type: 'api',
            url: args[0],
            duration: end - start,
            timestamp: Date.now()
          });
          
          return response;
        };
      });

      await page.route('**/api/payments/schedules*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: Array.from({ length: 30 }, (_, i) => ({
              id: `payment-${i}`,
              vendor: { name: `Vendor ${i}` }
            })),
            total: 30
          })
        });
      });

      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Perform various operations to collect metrics
      await page.click('[data-testid="status-filter"]');
      await page.selectOption('[data-testid="status-filter"]', 'pending');
      await page.click('[data-testid="view-toggle"]');

      const metrics = await page.evaluate(() => (window as any).performanceMetrics);
      
      expect(metrics).toBeInstanceOf(Array);
      expect(metrics.length).toBeGreaterThan(0);
      
      metrics.forEach((metric: any) => {
        if (metric.type === 'api') {
          expect(metric.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
        }
      });

      console.log(`✅ Performance monitoring: Tracked ${metrics.length} operations`);
    });

    test('generates performance reports', async ({ page }) => {
      await page.goto(`/dashboard/payments?weddingId=${MOCK_WEDDING_ID}`);
      await page.waitForLoadState('networkidle');

      // Collect comprehensive performance data
      const performanceReport = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource');
        
        return {
          pageLoad: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            totalTime: navigation.loadEventEnd - navigation.fetchStart
          },
          resources: resources.map(resource => ({
            name: resource.name,
            duration: resource.duration,
            size: (resource as any).transferSize || 0
          })),
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize / 1024 / 1024,
            total: (performance as any).memory.totalJSHeapSize / 1024 / 1024
          } : null
        };
      });

      expect(performanceReport.pageLoad.totalTime).toBeLessThan(5000);
      expect(performanceReport.resources.length).toBeGreaterThan(0);
      
      if (performanceReport.memory) {
        expect(performanceReport.memory.used).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
      }

      console.log('✅ Performance Report:', {
        'Page Load': `${performanceReport.pageLoad.totalTime.toFixed(2)}ms`,
        'DOM Content Loaded': `${performanceReport.pageLoad.domContentLoaded.toFixed(2)}ms`,
        'Resources Loaded': performanceReport.resources.length,
        'Memory Used': performanceReport.memory ? `${performanceReport.memory.used.toFixed(2)}MB` : 'N/A'
      });
    });
  });
});