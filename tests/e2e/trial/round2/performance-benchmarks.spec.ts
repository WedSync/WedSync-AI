/**
 * WS-167 Trial Management System - Performance Benchmarks
 * Team E - Round 2 Performance Testing Suite
 */

import { test, expect, Page } from '@playwright/test';
import { TrialTestHelpers } from './helpers/trial-test-helpers';

const trialHelpers = new TrialTestHelpers();

test.describe('WS-167 Trial Performance Benchmarks', () => {
  let testUser: any;
  
  test.beforeAll(async () => {
    await trialHelpers.setupTestEnvironment();
  });

  test.beforeEach(async ({ page }) => {
    testUser = await trialHelpers.createTestTrialUser();
    
    // Login for performance tests
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/dashboard/);
  });

  test.afterEach(async () => {
    await trialHelpers.cleanupTestUser(testUser);
  });

  test('Trial Dashboard Load Performance', async ({ page }) => {
    await test.step('Measure initial page load', async () => {
      // Clear cache for consistent testing
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      const startTime = Date.now();
      await page.goto('/dashboard/trial');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Assert load time is under 2 seconds
      expect(loadTime).toBeLessThan(2000);
      console.log(`Trial dashboard load time: ${loadTime}ms`);
    });

    await test.step('Measure Core Web Vitals', async () => {
      const vitals = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const metrics: any = {};
          
          // Largest Contentful Paint
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay (simulated)
          metrics.fid = 0; // Would be measured on actual user interaction
          
          // Cumulative Layout Shift
          let clsScore = 0;
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsScore += (entry as any).value;
              }
            }
            metrics.cls = clsScore;
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(metrics), 3000);
        });
      });
      
      console.log('Core Web Vitals:', vitals);
      
      // Assert Core Web Vitals thresholds
      expect(vitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
      expect(vitals.cls).toBeLessThan(0.1);  // CLS should be < 0.1
    });

    await test.step('Measure JavaScript bundle size impact', async () => {
      const bundleMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const jsEntries = entries.filter(entry => 
          entry.name.includes('.js') && entry.name.includes('/_next/')
        );
        
        return {
          totalJSSize: jsEntries.reduce((total, entry) => total + (entry.transferSize || 0), 0),
          jsFileCount: jsEntries.length,
          largestJS: Math.max(...jsEntries.map(entry => entry.transferSize || 0))
        };
      });
      
      console.log('JavaScript Bundle Metrics:', bundleMetrics);
      
      // Assert reasonable bundle sizes
      expect(bundleMetrics.totalJSSize).toBeLessThan(1024 * 1024); // < 1MB total
      expect(bundleMetrics.largestJS).toBeLessThan(512 * 1024);   // < 512KB largest file
    });
  });

  test('Trial API Performance Benchmarks', async ({ page }) => {
    await test.step('Measure trial status API response time', async () => {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        const [response] = await Promise.all([
          page.waitForResponse('/api/trial/status'),
          page.reload()
        ]);
        
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
        
        expect(response.status()).toBe(200);
      }
      
      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);
      
      console.log(`Trial status API - Avg: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
      
      // Assert API performance thresholds
      expect(avgResponseTime).toBeLessThan(500);
      expect(maxResponseTime).toBeLessThan(1000);
    });

    await test.step('Test concurrent API requests', async () => {
      const concurrentRequests = 10;
      const promises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          fetch('/api/trial/status', {
            headers: {
              'Authorization': `Bearer ${testUser.token}`
            }
          }).then(res => ({ status: res.status, time: Date.now() - startTime }))
        );
      }
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      console.log(`Concurrent API requests completed in: ${totalTime}ms`);
      
      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
      });
      
      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(3000);
    });
  });

  test('Database Query Performance', async ({ page }) => {
    await test.step('Measure client creation performance', async () => {
      const clientCreationTimes = [];
      
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="create-client-button"]');
        await page.fill('[data-testid="client-name"]', `Performance Test Client ${i}`);
        await page.fill('[data-testid="client-email"]', `perf${i}@test.com`);
        
        const startTime = Date.now();
        
        const [response] = await Promise.all([
          page.waitForResponse('/api/clients'),
          page.click('[data-testid="save-client"]')
        ]);
        
        const creationTime = Date.now() - startTime;
        clientCreationTimes.push(creationTime);
        
        expect(response.status()).toBe(201);
        await page.waitForSelector(`[data-testid="client-card-${i}"]`);
      }
      
      const avgCreationTime = clientCreationTimes.reduce((a, b) => a + b, 0) / clientCreationTimes.length;
      console.log(`Client creation - Avg: ${avgCreationTime}ms`);
      
      expect(avgCreationTime).toBeLessThan(800);
    });

    await test.step('Measure trial analytics query performance', async () => {
      // Simulate high engagement first
      await trialHelpers.simulateHighEngagement(page, testUser.id);
      
      await page.goto('/dashboard/trial/analytics');
      
      const startTime = Date.now();
      
      const [response] = await Promise.all([
        page.waitForResponse('/api/trial/analytics'),
        page.waitForSelector('[data-testid="analytics-loaded"]')
      ]);
      
      const queryTime = Date.now() - startTime;
      
      console.log(`Trial analytics query time: ${queryTime}ms`);
      
      expect(response.status()).toBe(200);
      expect(queryTime).toBeLessThan(1500);
    });
  });

  test('Memory Usage and Resource Management', async ({ page }) => {
    await test.step('Monitor memory usage during trial activities', async () => {
      const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Perform various trial activities
      const activities = [
        async () => {
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');
        },
        async () => {
          await page.goto('/clients');
          await page.waitForLoadState('networkidle');
        },
        async () => {
          await page.goto('/journey-builder');
          await page.waitForLoadState('networkidle');
        },
        async () => {
          await page.goto('/reports');
          await page.waitForLoadState('networkidle');
        }
      ];
      
      for (const activity of activities) {
        await activity();
        await page.waitForTimeout(1000); // Allow for cleanup
      }
      
      const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory usage - Initial: ${initialMemory}, Final: ${finalMemory}, Increase: ${memoryIncrease}`);
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    await test.step('Test for memory leaks', async () => {
      const measurements = [];
      
      // Perform the same action multiple times
      for (let i = 0; i < 10; i++) {
        await page.goto('/dashboard/trial');
        await page.waitForLoadState('networkidle');
        
        const memory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
        measurements.push(memory);
      }
      
      // Check if memory usage is growing significantly
      const firstHalf = measurements.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const secondHalf = measurements.slice(5).reduce((a, b) => a + b, 0) / 5;
      const growthPercentage = ((secondHalf - firstHalf) / firstHalf) * 100;
      
      console.log(`Memory growth: ${growthPercentage}%`);
      
      // Memory growth should be minimal (less than 20%)
      expect(growthPercentage).toBeLessThan(20);
    });
  });

  test('Network Request Optimization', async ({ page }) => {
    await test.step('Analyze network requests for trial dashboard', async () => {
      const requests: any[] = [];
      
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        });
      });
      
      await page.goto('/dashboard/trial');
      await page.waitForLoadState('networkidle');
      
      const apiRequests = requests.filter(r => r.url.includes('/api/'));
      const staticRequests = requests.filter(r => ['stylesheet', 'script', 'image'].includes(r.resourceType));
      
      console.log(`Network requests - API: ${apiRequests.length}, Static: ${staticRequests.length}, Total: ${requests.length}`);
      
      // Should have reasonable number of requests
      expect(apiRequests.length).toBeLessThan(10);  // Not too many API calls
      expect(requests.length).toBeLessThan(50);     // Not too many total requests
    });

    await test.step('Verify response caching', async () => {
      await page.goto('/dashboard/trial');
      await page.waitForLoadState('networkidle');
      
      // First load
      const firstLoadTime = await page.evaluate(async () => {
        const start = performance.now();
        await fetch('/api/trial/status');
        return performance.now() - start;
      });
      
      // Second load (should be faster due to caching)
      const secondLoadTime = await page.evaluate(async () => {
        const start = performance.now();
        await fetch('/api/trial/status');
        return performance.now() - start;
      });
      
      console.log(`Cache test - First: ${firstLoadTime}ms, Second: ${secondLoadTime}ms`);
      
      // Second request should be significantly faster (cached)
      expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8);
    });
  });

  test('Scalability Stress Testing', async ({ page, context }) => {
    await test.step('Simulate multiple concurrent trial users', async () => {
      const userCount = 5;
      const userPages = [];
      
      // Create multiple users and pages
      for (let i = 0; i < userCount; i++) {
        const user = await trialHelpers.createTestTrialUser(`stress-test-${i}`);
        const userPage = await context.newPage();
        
        await userPage.goto('/auth/login');
        await userPage.fill('[data-testid="email-input"]', user.email);
        await userPage.fill('[data-testid="password-input"]', user.password);
        await userPage.click('[data-testid="login-button"]');
        
        userPages.push({ page: userPage, user });
      }
      
      // Simulate concurrent activity
      const startTime = Date.now();
      
      const activities = userPages.map(({ page: userPage, user }, index) => 
        Promise.all([
          userPage.goto('/dashboard/trial'),
          userPage.waitForLoadState('networkidle'),
          trialHelpers.performActivity(userPage, {
            type: 'create_client',
            data: { name: `Stress Test Client ${index}` }
          })
        ])
      );
      
      await Promise.all(activities);
      
      const totalTime = Date.now() - startTime;
      console.log(`${userCount} concurrent users completed in: ${totalTime}ms`);
      
      // Should handle concurrent users reasonably
      expect(totalTime).toBeLessThan(10000); // Less than 10 seconds
      
      // Cleanup
      for (const { page: userPage, user } of userPages) {
        await userPage.close();
        await trialHelpers.cleanupTestUser(user);
      }
    });
  });

  test('Performance Regression Detection', async ({ page }) => {
    await test.step('Benchmark key user flows', async () => {
      const benchmarks: Record<string, number> = {};
      
      // Benchmark trial registration flow
      const registrationStart = Date.now();
      await page.goto('/auth/register');
      await page.waitForLoadState('networkidle');
      benchmarks.registrationPageLoad = Date.now() - registrationStart;
      
      // Benchmark dashboard load
      const dashboardStart = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      benchmarks.dashboardLoad = Date.now() - dashboardStart;
      
      // Benchmark client creation
      const clientCreationStart = Date.now();
      await page.click('[data-testid="create-client-button"]');
      await page.waitForSelector('[data-testid="client-modal"]');
      benchmarks.clientModalOpen = Date.now() - clientCreationStart;
      
      console.log('Performance Benchmarks:', benchmarks);
      
      // Store benchmarks for regression comparison
      await page.evaluate((benchmarks) => {
        localStorage.setItem('performance_benchmarks', JSON.stringify({
          ...benchmarks,
          timestamp: Date.now(),
          version: process.env.CI_COMMIT_SHA || 'local'
        }));
      }, benchmarks);
      
      // Assert reasonable performance
      expect(benchmarks.registrationPageLoad).toBeLessThan(2000);
      expect(benchmarks.dashboardLoad).toBeLessThan(1500);
      expect(benchmarks.clientModalOpen).toBeLessThan(300);
    });
  });
});