import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';

// Performance thresholds for production
const PERFORMANCE_THRESHOLDS = {
  taskCreation: 500,        // ms
  categoryUpdate: 300,      // ms
  bulkOperations: 2000,     // ms
  pageLoad: 1500,           // ms
  apiResponse: 200,         // ms
  realtimeUpdate: 100,      // ms
  databaseQuery: 50,        // ms
  searchOperation: 300      // ms
};

test.describe('Production Performance Benchmarking', () => {
  // Set production-like conditions
  test.use({
    viewport: { width: 1920, height: 1080 },
    // Simulate production network conditions
    offline: false,
    launchOptions: {
      args: ['--disable-dev-shm-usage']
    }
  });

  test.describe('Task Creation Performance', () => {
    test('should create single task within performance threshold', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Navigate to task creation
      await page.goto('/tasks/create');

      // Measure task creation time
      const startTime = performance.now();
      
      await page.fill('[data-testid="task-title"]', 'Performance test task');
      await page.fill('[data-testid="task-description"]', 'Testing creation speed');
      await page.click('[data-testid="category-select"]');
      await page.click('[data-testid="category-ceremony"]');
      await page.click('[data-testid="save-task"]');
      
      await page.waitForSelector('[data-testid="task-created-toast"]');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.taskCreation);
      
      // Log performance metric
      console.log(`Task creation time: ${duration.toFixed(2)}ms`);
    });

    test('should handle bulk task creation efficiently', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/tasks/bulk-create');

      const startTime = performance.now();

      // Create 50 tasks in bulk
      const bulkTasks = Array.from({ length: 50 }, (_, i) => ({
        title: `Bulk task ${i + 1}`,
        category: ['setup', 'ceremony', 'reception', 'breakdown'][i % 4],
        priority: ['low', 'medium', 'high', 'critical'][i % 4]
      }));

      // Paste bulk data
      await page.fill('[data-testid="bulk-input"]', JSON.stringify(bulkTasks));
      await page.click('[data-testid="bulk-create-button"]');
      
      await page.waitForSelector('[data-testid="bulk-success-toast"]');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperations);
      
      console.log(`Bulk creation (50 tasks) time: ${duration.toFixed(2)}ms`);
    });
  });

  test.describe('Category Operations Performance', () => {
    test('should update category quickly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/tasks');
      
      // Select first task
      await page.click('[data-testid="task-item"]:first-child');
      
      const startTime = performance.now();
      
      await page.click('[data-testid="edit-category"]');
      await page.click('[data-testid="category-reception"]');
      await page.click('[data-testid="save-changes"]');
      
      await page.waitForSelector('[data-testid="update-success-toast"]');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.categoryUpdate);
      
      console.log(`Category update time: ${duration.toFixed(2)}ms`);
    });

    test('should filter by category efficiently', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/tasks');
      
      const startTime = performance.now();
      
      await page.click('[data-testid="filter-ceremony"]');
      await page.waitForSelector('[data-testid="filtered-results"]');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.searchOperation);
      
      console.log(`Category filter time: ${duration.toFixed(2)}ms`);
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load task dashboard within threshold', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      const startTime = performance.now();
      
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
      
      console.log(`Task dashboard load time: ${duration.toFixed(2)}ms`);
    });

    test('should load category analytics quickly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      const startTime = performance.now();
      
      await page.goto('/dashboard/analytics');
      await page.waitForSelector('[data-testid="category-distribution-chart"]');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
      
      console.log(`Analytics page load time: ${duration.toFixed(2)}ms`);
    });
  });

  test.describe('API Response Performance', () => {
    test('should fetch tasks API quickly', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Intercept API calls to measure response time
      let apiDuration = 0;
      
      page.on('response', async response => {
        if (response.url().includes('/api/tasks')) {
          const timing = response.timing();
          if (timing) {
            apiDuration = timing.responseEnd;
          }
        }
      });

      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');

      expect(apiDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      
      console.log(`Tasks API response time: ${apiDuration.toFixed(2)}ms`);
    });

    test('should handle category API operations efficiently', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      let apiDuration = 0;
      
      page.on('response', async response => {
        if (response.url().includes('/api/categories')) {
          const timing = response.timing();
          if (timing) {
            apiDuration = timing.responseEnd;
          }
        }
      });

      await page.goto('/tasks');
      await page.click('[data-testid="category-filter"]');
      await page.waitForSelector('[data-testid="category-options"]');

      expect(apiDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
      
      console.log(`Categories API response time: ${apiDuration.toFixed(2)}ms`);
    });
  });

  test.describe('Real-time Performance', () => {
    test('should receive real-time updates quickly', async ({ page, context }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Open two pages to simulate real-time
      const page2 = await context.newPage();
      await page2.goto('/login');
      await page2.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page2.fill('[data-testid="password-input"]', 'testpassword123');
      await page2.click('[data-testid="login-button"]');
      await page2.waitForURL('/dashboard');

      await page.goto('/tasks');
      await page2.goto('/tasks');

      // Measure real-time update latency
      const startTime = performance.now();
      
      // Create task in page 1
      await page.click('[data-testid="quick-add-task"]');
      await page.fill('[data-testid="quick-task-title"]', 'Real-time test');
      await page.press('[data-testid="quick-task-title"]', 'Enter');

      // Wait for it to appear in page 2
      await page2.waitForSelector('text=Real-time test');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.realtimeUpdate * 5); // Allow some network delay
      
      console.log(`Real-time update latency: ${duration.toFixed(2)}ms`);
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during extended use', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Get initial memory usage
      const initialMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Perform intensive operations
      for (let i = 0; i < 10; i++) {
        await page.goto('/tasks');
        await page.click('[data-testid="filter-ceremony"]');
        await page.click('[data-testid="filter-setup"]');
        await page.click('[data-testid="filter-reception"]');
        await page.click('[data-testid="filter-breakdown"]');
      }

      // Get final memory usage
      const finalMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Memory should not increase by more than 50MB
      const memoryIncrease = (finalMetrics - initialMetrics) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(50);
      
      console.log(`Memory increase after intensive use: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  test.describe('Concurrent User Simulation', () => {
    test('should handle multiple concurrent users', async ({ browser }) => {
      const userCount = 10;
      const pages = [];

      // Create multiple browser contexts
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        pages.push(page);
      }

      const startTime = performance.now();

      // Simulate concurrent actions
      const actions = pages.map(async (page, index) => {
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', `user${index}@wedding.com`);
        await page.fill('[data-testid="password-input"]', 'testpassword123');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/dashboard');
        
        await page.goto('/tasks');
        await page.click('[data-testid="filter-ceremony"]');
        
        return true;
      });

      const results = await Promise.all(actions);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.every(r => r === true)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperations * 2);
      
      console.log(`${userCount} concurrent users handled in: ${duration.toFixed(2)}ms`);

      // Clean up
      for (const page of pages) {
        await page.close();
      }
    });
  });

  test.describe('Database Performance', () => {
    test('should execute complex queries efficiently', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // Navigate to analytics which runs complex queries
      const startTime = performance.now();
      
      await page.goto('/dashboard/analytics');
      
      // Wait for all data to load
      await Promise.all([
        page.waitForSelector('[data-testid="category-distribution-chart"]'),
        page.waitForSelector('[data-testid="completion-metrics"]'),
        page.waitForSelector('[data-testid="helper-performance"]'),
        page.waitForSelector('[data-testid="timeline-overview"]')
      ]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkOperations);
      
      console.log(`Complex analytics queries time: ${duration.toFixed(2)}ms`);
    });
  });

  test.describe('Cache Performance', () => {
    test('should leverage caching for repeated operations', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@wedding.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // First load - cold cache
      const coldStartTime = performance.now();
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      const coldEndTime = performance.now();
      const coldDuration = coldEndTime - coldStartTime;

      // Second load - warm cache
      const warmStartTime = performance.now();
      await page.goto('/dashboard');
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      const warmEndTime = performance.now();
      const warmDuration = warmEndTime - warmStartTime;

      // Warm cache should be at least 30% faster
      expect(warmDuration).toBeLessThan(coldDuration * 0.7);
      
      console.log(`Cold cache load: ${coldDuration.toFixed(2)}ms`);
      console.log(`Warm cache load: ${warmDuration.toFixed(2)}ms`);
      console.log(`Cache improvement: ${((1 - warmDuration/coldDuration) * 100).toFixed(1)}%`);
    });
  });
});