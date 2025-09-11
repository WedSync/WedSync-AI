import { test, expect, Browser, BrowserContext } from '@playwright/test';

// Load testing configuration
const LOAD_TEST_CONFIG = {
  concurrentUsers: {
    small: 10,
    medium: 50,
    large: 100,
    stress: 500
  },
  operationsPerUser: 20,
  rampUpTime: 5000, // ms
  testDuration: 60000, // ms (1 minute)
  thresholds: {
    responseTime: {
      p50: 200,  // 50th percentile
      p95: 500,  // 95th percentile
      p99: 1000  // 99th percentile
    },
    errorRate: 0.01, // 1% maximum error rate
    throughput: 100   // requests per second
  }
};

test.describe('Production Load Testing', () => {
  test.describe.configure({ mode: 'parallel' });
  
  // Increase timeout for load tests
  test.setTimeout(300000); // 5 minutes

  test.describe('Concurrent User Load', () => {
    test('should handle small concurrent load (10 users)', async ({ browser }) => {
      const results = await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.small);
      
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.thresholds.errorRate);
      expect(results.p50ResponseTime).toBeLessThan(LOAD_TEST_CONFIG.thresholds.responseTime.p50);
      expect(results.p95ResponseTime).toBeLessThan(LOAD_TEST_CONFIG.thresholds.responseTime.p95);
      
      console.log(`Small load test results:`, results);
    });

    test('should handle medium concurrent load (50 users)', async ({ browser }) => {
      const results = await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.medium);
      
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.thresholds.errorRate);
      expect(results.p95ResponseTime).toBeLessThan(LOAD_TEST_CONFIG.thresholds.responseTime.p95 * 1.5);
      
      console.log(`Medium load test results:`, results);
    });

    test('should handle large concurrent load (100 users)', async ({ browser }) => {
      const results = await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.large);
      
      expect(results.errorRate).toBeLessThan(LOAD_TEST_CONFIG.thresholds.errorRate * 2);
      expect(results.p99ResponseTime).toBeLessThan(LOAD_TEST_CONFIG.thresholds.responseTime.p99 * 2);
      
      console.log(`Large load test results:`, results);
    });
  });

  test.describe('Task Creation Load', () => {
    test('should handle bulk task creation under load', async ({ browser }) => {
      const users = 20;
      const tasksPerUser = 10;
      const results: any[] = [];
      
      const contexts = await createUserContexts(browser, users);
      
      const startTime = Date.now();
      
      // Each user creates multiple tasks
      const operations = contexts.map(async (context, userIndex) => {
        const page = await context.newPage();
        await loginUser(page, userIndex);
        
        const userResults = [];
        
        for (let i = 0; i < tasksPerUser; i++) {
          const opStart = Date.now();
          
          try {
            await page.goto('/tasks/create');
            await page.fill('[data-testid="task-title"]', `Load test task ${userIndex}-${i}`);
            await page.fill('[data-testid="task-description"]', 'Created during load test');
            await page.click('[data-testid="category-select"]');
            await page.click(`[data-testid="category-${getRandomCategory()}"]`);
            await page.click('[data-testid="save-task"]');
            await page.waitForSelector('[data-testid="task-created-toast"]', { timeout: 5000 });
            
            userResults.push({
              success: true,
              duration: Date.now() - opStart
            });
          } catch (error) {
            userResults.push({
              success: false,
              duration: Date.now() - opStart,
              error: error.message
            });
          }
        }
        
        await context.close();
        return userResults;
      });
      
      const allResults = (await Promise.all(operations)).flat();
      const totalDuration = Date.now() - startTime;
      
      // Calculate metrics
      const successCount = allResults.filter(r => r.success).length;
      const errorRate = 1 - (successCount / allResults.length);
      const throughput = (allResults.length / totalDuration) * 1000;
      
      expect(errorRate).toBeLessThan(0.05); // Less than 5% errors
      expect(throughput).toBeGreaterThan(1); // At least 1 task per second
      
      console.log(`Bulk task creation: ${successCount}/${allResults.length} successful`);
      console.log(`Throughput: ${throughput.toFixed(2)} tasks/second`);
    });
  });

  test.describe('Category Operations Load', () => {
    test('should handle concurrent category updates', async ({ browser }) => {
      const users = 30;
      const contexts = await createUserContexts(browser, users);
      
      const results = await Promise.all(
        contexts.map(async (context, index) => {
          const page = await context.newPage();
          await loginUser(page, index);
          
          const operationResults = [];
          
          // Each user performs category operations
          for (let i = 0; i < 5; i++) {
            const start = Date.now();
            
            try {
              await page.goto('/tasks');
              
              // Filter by different categories
              const category = getRandomCategory();
              await page.click(`[data-testid="filter-${category}"]`);
              await page.waitForSelector('[data-testid="filtered-results"]', { timeout: 3000 });
              
              // Update a task's category
              const taskItem = page.locator('[data-testid="task-item"]').first();
              if (await taskItem.isVisible()) {
                await taskItem.click();
                await page.click('[data-testid="edit-category"]');
                await page.click(`[data-testid="category-${getRandomCategory()}"]`);
                await page.click('[data-testid="save-changes"]');
                await page.waitForSelector('[data-testid="update-success-toast"]', { timeout: 3000 });
              }
              
              operationResults.push({
                success: true,
                duration: Date.now() - start
              });
            } catch (error) {
              operationResults.push({
                success: false,
                duration: Date.now() - start
              });
            }
          }
          
          await context.close();
          return operationResults;
        })
      );
      
      const flatResults = results.flat();
      const successRate = flatResults.filter(r => r.success).length / flatResults.length;
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      
      console.log(`Category operations success rate: ${(successRate * 100).toFixed(1)}%`);
    });
  });

  test.describe('Real-time Updates Load', () => {
    test('should maintain real-time sync under load', async ({ browser }) => {
      const publishers = 10;
      const subscribers = 20;
      
      // Create subscriber contexts
      const subscriberContexts = await createUserContexts(browser, subscribers);
      const subscriberPages = await Promise.all(
        subscriberContexts.map(async (context, index) => {
          const page = await context.newPage();
          await loginUser(page, index);
          await page.goto('/tasks');
          return page;
        })
      );
      
      // Create publisher contexts
      const publisherContexts = await createUserContexts(browser, publishers);
      
      const updateResults = [];
      const startTime = Date.now();
      
      // Publishers create tasks
      await Promise.all(
        publisherContexts.map(async (context, index) => {
          const page = await context.newPage();
          await loginUser(page, publishers + index);
          
          for (let i = 0; i < 3; i++) {
            const taskTitle = `Real-time test ${index}-${i}`;
            
            await page.goto('/tasks/create');
            await page.fill('[data-testid="task-title"]', taskTitle);
            await page.click('[data-testid="category-select"]');
            await page.click(`[data-testid="category-${getRandomCategory()}"]`);
            await page.click('[data-testid="save-task"]');
            
            // Check how many subscribers received the update
            const receivedCount = await countSubscribersWithTask(subscriberPages, taskTitle);
            
            updateResults.push({
              taskTitle,
              subscribersNotified: receivedCount,
              totalSubscribers: subscribers
            });
            
            await page.waitForTimeout(1000); // Brief pause between creates
          }
          
          await context.close();
        })
      );
      
      // Calculate real-time sync rate
      const avgSyncRate = updateResults.reduce((acc, r) => 
        acc + (r.subscribersNotified / r.totalSubscribers), 0
      ) / updateResults.length;
      
      expect(avgSyncRate).toBeGreaterThan(0.8); // 80% real-time sync
      
      console.log(`Real-time sync rate: ${(avgSyncRate * 100).toFixed(1)}%`);
      
      // Clean up
      await Promise.all(subscriberContexts.map(c => c.close()));
    });
  });

  test.describe('Database Connection Pool', () => {
    test('should handle connection pool exhaustion gracefully', async ({ browser }) => {
      const simultaneousUsers = 100;
      const contexts = [];
      
      // Create all contexts at once to stress connection pool
      for (let i = 0; i < simultaneousUsers; i++) {
        contexts.push(await browser.newContext());
      }
      
      // All users try to query database simultaneously
      const results = await Promise.all(
        contexts.map(async (context, index) => {
          const page = await context.newPage();
          const start = Date.now();
          
          try {
            await loginUser(page, index);
            await page.goto('/dashboard/analytics');
            await page.waitForSelector('[data-testid="category-distribution-chart"]', { timeout: 10000 });
            
            return {
              success: true,
              duration: Date.now() - start
            };
          } catch (error) {
            return {
              success: false,
              duration: Date.now() - start,
              error: error.message
            };
          }
        })
      );
      
      const successRate = results.filter(r => r.success).length / results.length;
      const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
      
      expect(successRate).toBeGreaterThan(0.9); // 90% should succeed
      expect(avgDuration).toBeLessThan(5000); // Average under 5 seconds
      
      console.log(`Connection pool test - Success: ${(successRate * 100).toFixed(1)}%, Avg time: ${avgDuration.toFixed(0)}ms`);
      
      // Clean up
      await Promise.all(contexts.map(c => c.close()));
    });
  });

  test.describe('API Rate Limiting', () => {
    test('should handle API rate limits appropriately', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      const results = [];
      
      // Hammer the API
      for (let i = 0; i < 200; i++) {
        const start = Date.now();
        
        const response = await page.evaluate(async () => {
          const res = await fetch('/api/tasks', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          return { status: res.status, ok: res.ok };
        });
        
        results.push({
          iteration: i,
          status: response.status,
          duration: Date.now() - start,
          rateLimited: response.status === 429
        });
        
        // If rate limited, wait before continuing
        if (response.status === 429) {
          await page.waitForTimeout(1000);
        }
      }
      
      const rateLimitedCount = results.filter(r => r.rateLimited).length;
      const successCount = results.filter(r => r.status === 200).length;
      
      // Should implement rate limiting
      expect(rateLimitedCount).toBeGreaterThan(0);
      // But should also allow legitimate traffic
      expect(successCount).toBeGreaterThan(50);
      
      console.log(`Rate limiting: ${rateLimitedCount} requests limited, ${successCount} successful`);
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('should not leak memory during extended operations', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      const memorySnapshots = [];
      
      // Take initial memory snapshot
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      memorySnapshots.push({ time: 0, memory: initialMemory });
      
      // Perform intensive operations for 30 seconds
      const testDuration = 30000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration) {
        // Navigate between pages
        await page.goto('/tasks');
        await page.click('[data-testid="filter-ceremony"]');
        await page.goto('/dashboard/analytics');
        await page.goto('/helpers');
        
        // Take memory snapshot every 5 seconds
        if ((Date.now() - startTime) % 5000 < 100) {
          const currentMemory = await page.evaluate(() => {
            if ('memory' in performance) {
              return (performance as any).memory.usedJSHeapSize;
            }
            return 0;
          });
          
          memorySnapshots.push({
            time: Date.now() - startTime,
            memory: currentMemory
          });
        }
      }
      
      // Calculate memory growth rate
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].memory - initialMemory;
      const growthRateMBPerMinute = (memoryGrowth / 1024 / 1024) * (60000 / testDuration);
      
      // Should not grow more than 10MB per minute
      expect(growthRateMBPerMinute).toBeLessThan(10);
      
      console.log(`Memory growth rate: ${growthRateMBPerMinute.toFixed(2)} MB/minute`);
    });
  });

  test.describe('Stress Testing', () => {
    test.skip('should handle stress load (500 users)', async ({ browser }) => {
      // Skip by default as this is very resource intensive
      const results = await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.stress);
      
      // More lenient thresholds for stress test
      expect(results.errorRate).toBeLessThan(0.1); // 10% error rate acceptable under stress
      expect(results.p99ResponseTime).toBeLessThan(LOAD_TEST_CONFIG.thresholds.responseTime.p99 * 5);
      
      console.log(`Stress test results:`, results);
    });
  });
});

// Helper functions
async function runLoadTest(browser: Browser, userCount: number) {
  const contexts = await createUserContexts(browser, userCount);
  const results: any[] = [];
  const startTime = Date.now();
  
  // Simulate user operations
  const userOperations = contexts.map(async (context, index) => {
    const page = await context.newPage();
    await loginUser(page, index);
    
    const userResults = [];
    
    for (let i = 0; i < LOAD_TEST_CONFIG.operationsPerUser; i++) {
      const operationStart = Date.now();
      let success = true;
      
      try {
        // Random operation
        const operation = Math.random();
        
        if (operation < 0.3) {
          // View tasks
          await page.goto('/tasks');
          await page.waitForSelector('[data-testid="tasks-container"]', { timeout: 5000 });
        } else if (operation < 0.6) {
          // Filter by category
          await page.goto('/tasks');
          const category = getRandomCategory();
          await page.click(`[data-testid="filter-${category}"]`);
          await page.waitForSelector('[data-testid="filtered-results"]', { timeout: 5000 });
        } else {
          // View analytics
          await page.goto('/dashboard/analytics');
          await page.waitForSelector('[data-testid="category-distribution-chart"]', { timeout: 5000 });
        }
      } catch (error) {
        success = false;
      }
      
      userResults.push({
        success,
        duration: Date.now() - operationStart
      });
      
      // Random delay between operations
      await page.waitForTimeout(Math.random() * 2000);
    }
    
    await context.close();
    return userResults;
  });
  
  const allResults = (await Promise.all(userOperations)).flat();
  const durations = allResults.map(r => r.duration).sort((a, b) => a - b);
  
  return {
    totalOperations: allResults.length,
    successfulOperations: allResults.filter(r => r.success).length,
    errorRate: allResults.filter(r => !r.success).length / allResults.length,
    p50ResponseTime: durations[Math.floor(durations.length * 0.5)],
    p95ResponseTime: durations[Math.floor(durations.length * 0.95)],
    p99ResponseTime: durations[Math.floor(durations.length * 0.99)],
    totalDuration: Date.now() - startTime,
    throughput: (allResults.length / ((Date.now() - startTime) / 1000))
  };
}

async function createUserContexts(browser: Browser, count: number): Promise<BrowserContext[]> {
  const contexts = [];
  for (let i = 0; i < count; i++) {
    contexts.push(await browser.newContext());
  }
  return contexts;
}

async function loginUser(page: any, userIndex: number) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', `user${userIndex}@wedding.com`);
  await page.fill('[data-testid="password-input"]', 'testpassword123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

function getRandomCategory() {
  const categories = ['setup', 'ceremony', 'reception', 'breakdown'];
  return categories[Math.floor(Math.random() * categories.length)];
}

async function countSubscribersWithTask(pages: any[], taskTitle: string): Promise<number> {
  let count = 0;
  
  for (const page of pages) {
    try {
      const hasTask = await page.locator(`text="${taskTitle}"`).isVisible({ timeout: 2000 });
      if (hasTask) count++;
    } catch {
      // Task not visible on this page
    }
  }
  
  return count;
}