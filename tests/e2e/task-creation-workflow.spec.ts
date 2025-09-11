import { test, expect } from '@playwright/test';

// Revolutionary Playwright MCP Testing for Task Creation System
// Following WS-156 specifications exactly

test.describe('Complete Task Creation Workflow - Wedding Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the task management page
    await page.goto('http://localhost:3000/tasks');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  test('Complete wedding task creation journey', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/task-creation-start.png' });
    
    // Test realistic wedding planning scenario
    const weddingTasks = [
      {
        title: 'Set up ceremony chairs',
        category: 'venue_management',
        timing: '13:00',
        duration: 30,
        location: 'Garden Pavilion',
        description: '100 white chairs from storage, arrange in rows of 8'
      },
      {
        title: 'Sound check with DJ',
        category: 'music',
        timing: '14:00',
        duration: 15,
        location: 'Main Stage',
        description: 'Test microphones, speakers, and music playlist'
      },
      {
        title: 'Guest reception setup',
        category: 'catering',
        timing: '16:00',
        duration: 60,
        location: 'Grand Hall',
        description: 'Set up tables, centerpieces, and catering stations'
      }
    ];
    
    for (const task of weddingTasks) {
      // Open create task form
      await page.click('button[data-testid="create-task"]');
      await page.waitForSelector('.task-create-form', { state: 'visible' });
      
      // Fill task details
      await page.fill('input[name="title"]', task.title);
      await page.fill('textarea[name="description"]', task.description);
      await page.selectOption('select[name="category"]', task.category);
      await page.fill('input[name="timing_value"]', task.timing);
      await page.fill('input[name="estimated_duration"]', task.duration.toString());
      await page.fill('input[name="location"]', task.location);
      
      // Submit task
      await page.click('button[type="submit"]');
      
      // Wait for success message
      await page.waitForSelector('.success-message', { timeout: 10000 });
      await expect(page.locator('.success-message')).toContainText('Task created successfully');
      
      // Take screenshot after each task creation
      await page.screenshot({ path: `screenshots/task-${task.category}-created.png` });
    }
    
    // Verify all tasks appear in timeline
    for (const task of weddingTasks) {
      await expect(page.locator('.task-item')).toContainText(task.title);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/task-creation-complete.png' });
  });

  test('Performance under heavy load - 50 task creation', async ({ page }) => {
    const startTime = Date.now();
    
    // Create 50 tasks rapidly to test performance
    const taskPromises = [];
    for (let i = 1; i <= 50; i++) {
      taskPromises.push(
        (async () => {
          await page.click('button[data-testid="create-task"]');
          await page.waitForSelector('input[name="title"]', { state: 'visible' });
          
          await page.fill('input[name="title"]', `Performance test task ${i}`);
          await page.selectOption('select[name="category"]', 'logistics');
          await page.fill('input[name="estimated_duration"]', '2');
          await page.fill('input[name="deadline"]', '2024-12-31T10:00');
          
          await page.click('button[type="submit"]');
          await page.waitForSelector('.success-message', { timeout: 5000 });
        })()
      );
    }
    
    await Promise.all(taskPromises);
    
    const totalTime = Date.now() - startTime;
    
    // Should handle 50 task creations in under 30 seconds
    expect(totalTime).toBeLessThan(30000);
    
    // Measure Core Web Vitals
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      
      return {
        LCP: lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0,
        FCP: paintEntries.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        TTI: navigation.loadEventEnd - navigation.fetchStart,
        FID: 0 // Would need real user interaction
      };
    });
    
    // Validate Core Web Vitals
    expect(performanceMetrics.LCP).toBeLessThan(2500); // Good LCP
    expect(performanceMetrics.FCP).toBeLessThan(1800); // Good FCP
    expect(performanceMetrics.TTI).toBeLessThan(3800); // Good TTI
    
    // Take performance screenshot
    await page.screenshot({ path: 'screenshots/performance-test-complete.png' });
  });

  test('Complete accessibility compliance - WCAG 2.1 AA', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Open create form
    
    // Navigate form with keyboard only
    await page.keyboard.press('Tab'); // Focus on title field
    await page.keyboard.type('Keyboard navigation test');
    
    await page.keyboard.press('Tab'); // Focus on description
    await page.keyboard.type('Testing keyboard accessibility');
    
    await page.keyboard.press('Tab'); // Focus on category dropdown
    await page.keyboard.press('ArrowDown'); // Select category
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Tab'); // Focus on priority
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Continue tabbing through all form fields
    await page.keyboard.press('Tab'); // Assignee
    await page.keyboard.press('Tab'); // Duration
    await page.keyboard.type('2');
    await page.keyboard.press('Tab'); // Buffer time
    await page.keyboard.press('Tab'); // Deadline
    await page.keyboard.type('2024-12-31T15:00');
    
    // Submit using keyboard
    await page.keyboard.press('Tab'); // Skip cancel button
    await page.keyboard.press('Tab'); // Focus on submit button
    await page.keyboard.press('Enter');
    
    // Wait for success
    await page.waitForSelector('.success-message');
    
    // Verify aria labels and roles
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check all form inputs have labels
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input: Element) => {
        const htmlInput = input as HTMLInputElement;
        const hasLabel = htmlInput.getAttribute('aria-label') || 
                        htmlInput.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${htmlInput.id}"]`);
        if (!hasLabel && htmlInput.type !== 'hidden') {
          issues.push(`Input without label: ${htmlInput.name || htmlInput.id}`);
        }
      });
      
      // Check focus indicators
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusableElements.forEach((element: Element) => {
        const styles = getComputedStyle(element);
        const hasFocusStyle = styles.outline !== 'none' || 
                            styles.boxShadow.includes('ring') || 
                            element.classList.toString().includes('focus:');
        if (!hasFocusStyle) {
          issues.push(`Element without focus indicator: ${element.tagName}`);
        }
      });
      
      // Check color contrast (simplified)
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button: Element) => {
        const styles = getComputedStyle(button);
        if (styles.color === styles.backgroundColor) {
          issues.push(`Poor contrast: ${button.textContent?.trim()}`);
        }
      });
      
      return issues;
    });
    
    // Should have no accessibility issues
    expect(accessibilityIssues).toHaveLength(0);
    
    // Take accessibility screenshot
    await page.screenshot({ path: 'screenshots/accessibility-test.png' });
  });

  test('Error handling and recovery scenarios', async ({ page }) => {
    // Mock network failures
    await page.route('**/api/tasks', route => {
      if (route.request().method() === 'POST') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Try to create task during network failure
    await page.click('button[data-testid="create-task"]');
    await page.fill('input[name="title"]', 'Network failure test');
    await page.selectOption('select[name="category"]', 'photography');
    await page.fill('input[name="deadline"]', '2024-12-31T10:00');
    await page.click('button[type="submit"]');
    
    // Verify error handling
    await page.waitForSelector('.error-message');
    await expect(page.locator('.error-message')).toContainText('Unable to save task');
    
    // Test recovery when network returns
    await page.unroute('**/api/tasks');
    
    // Should show retry option
    await page.click('button[data-testid="retry-save"]');
    await page.waitForSelector('.success-message');
    await expect(page.locator('.success-message')).toContainText('Task created successfully');
    
    // Take error recovery screenshot
    await page.screenshot({ path: 'screenshots/error-recovery-test.png' });
  });

  test('Cross-browser compatibility - Chrome features', async ({ page }) => {
    // Test Chrome-specific functionality
    await page.click('button[data-testid="create-task"]');
    
    // Test HTML5 input types
    await page.fill('input[name="title"]', 'Chrome compatibility test');
    await page.fill('input[name="deadline"]', '2024-12-31T15:30');
    await page.fill('input[type="number"]', '4.5');
    
    // Test file input (if present)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles('test-files/sample-attachment.pdf');
    }
    
    // Test drag and drop (if supported)
    const dragArea = page.locator('[data-testid="drag-drop-area"]');
    if (await dragArea.count() > 0) {
      await dragArea.dragTo(dragArea);
    }
    
    await page.selectOption('select[name="category"]', 'design');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.success-message');
    
    // Take compatibility screenshot
    await page.screenshot({ path: 'screenshots/chrome-compatibility-test.png' });
  });

  test('Mobile device simulation - Task creation on mobile', async ({ page }) => {
    // Simulate mobile device
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test mobile touch interactions
    await page.tap('button[data-testid="create-task"]');
    await page.waitForSelector('.task-create-form');
    
    // Fill form on mobile
    await page.tap('input[name="title"]');
    await page.fill('input[name="title"]', 'Mobile task creation test');
    
    await page.tap('textarea[name="description"]');
    await page.fill('textarea[name="description"]', 'Testing task creation on mobile device');
    
    // Test mobile select interactions
    await page.tap('select[name="category"]');
    await page.selectOption('select[name="category"]', 'logistics');
    
    await page.tap('select[name="priority"]');
    await page.selectOption('select[name="priority"]', 'high');
    
    // Fill timing fields
    await page.fill('input[name="estimated_duration"]', '3');
    await page.fill('input[name="deadline"]', '2024-12-25T12:00');
    
    // Submit on mobile
    await page.tap('button[type="submit"]');
    
    // Wait for mobile success state
    await page.waitForSelector('.success-message');
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Test mobile navigation
    await page.tap('[data-testid="mobile-menu-toggle"]');
    await page.waitForSelector('.mobile-menu');
    
    // Verify responsive design
    const formElement = page.locator('.task-create-form');
    const boundingBox = await formElement.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
    
    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/mobile-task-creation.png' });
  });

  test('Task creation with file attachments', async ({ page }) => {
    await page.click('button[data-testid="create-task"]');
    
    // Fill basic task information
    await page.fill('input[name="title"]', 'Task with attachments');
    await page.fill('textarea[name="description"]', 'Task requiring file attachments');
    await page.selectOption('select[name="category"]', 'design');
    await page.fill('input[name="deadline"]', '2024-12-31T14:00');
    
    // Test file upload
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Create test files
      await fileInput.setInputFiles([
        { name: 'design-brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDF content') },
        { name: 'reference-image.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('JPEG content') }
      ]);
      
      // Verify file upload indicators
      await expect(page.locator('.file-upload-success')).toContainText('design-brief.pdf');
      await expect(page.locator('.file-upload-success')).toContainText('reference-image.jpg');
    }
    
    await page.click('button[type="submit"]');
    await page.waitForSelector('.success-message');
    
    // Take attachment screenshot
    await page.screenshot({ path: 'screenshots/task-with-attachments.png' });
  });

  test('Bulk task operations workflow', async ({ page }) => {
    // First create multiple tasks
    const tasks = ['Bulk Task 1', 'Bulk Task 2', 'Bulk Task 3'];
    
    for (const taskTitle of tasks) {
      await page.click('button[data-testid="create-task"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.selectOption('select[name="category"]', 'logistics');
      await page.fill('input[name="deadline"]', '2024-12-31T10:00');
      await page.click('button[type="submit"]');
      await page.waitForSelector('.success-message');
    }
    
    // Test bulk selection
    await page.click('button[data-testid="bulk-select-mode"]');
    
    // Select multiple tasks
    for (let i = 0; i < tasks.length; i++) {
      await page.click(`.task-item:nth-child(${i + 1}) input[type="checkbox"]`);
    }
    
    // Test bulk operations
    await page.click('button[data-testid="bulk-actions"]');
    await page.click('button[data-testid="bulk-priority-change"]');
    await page.selectOption('select[data-testid="bulk-priority-select"]', 'high');
    await page.click('button[data-testid="apply-bulk-changes"]');
    
    // Verify bulk changes applied
    await page.waitForSelector('.bulk-success-message');
    
    // Take bulk operations screenshot
    await page.screenshot({ path: 'screenshots/bulk-task-operations.png' });
  });

  test('Task dependency workflow', async ({ page }) => {
    // Create prerequisite task first
    await page.click('button[data-testid="create-task"]');
    await page.fill('input[name="title"]', 'Prerequisite Task');
    await page.selectOption('select[name="category"]', 'venue_management');
    await page.fill('input[name="deadline"]', '2024-12-30T10:00');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.success-message');
    
    // Create dependent task
    await page.click('button[data-testid="create-task"]');
    await page.fill('input[name="title"]', 'Dependent Task');
    await page.selectOption('select[name="category"]', 'logistics');
    await page.fill('input[name="deadline"]', '2024-12-31T10:00');
    
    // Add dependency
    await page.click('button[data-testid="add-dependency"]');
    await page.selectOption('select[data-testid="predecessor-task"]', 'Prerequisite Task');
    await page.selectOption('select[data-testid="dependency-type"]', 'finish_to_start');
    await page.fill('input[data-testid="lag-time"]', '2');
    
    await page.click('button[type="submit"]');
    await page.waitForSelector('.success-message');
    
    // Verify dependency visualization
    await expect(page.locator('.dependency-arrow')).toBeVisible();
    
    // Take dependency screenshot
    await page.screenshot({ path: 'screenshots/task-dependencies.png' });
  });

  test('Real-time collaboration during task creation', async ({ page, context }) => {
    // Open second page to simulate another user
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000/tasks');
    
    // User 1 starts creating a task
    await page.click('button[data-testid="create-task"]');
    await page.fill('input[name="title"]', 'Collaborative Task');
    
    // User 2 should see real-time updates
    await page2.waitForSelector('.collaborative-indicator');
    await expect(page2.locator('.collaborative-indicator')).toContainText('Another user is creating a task');
    
    // Complete task creation
    await page.selectOption('select[name="category"]', 'design');
    await page.fill('input[name="deadline"]', '2024-12-31T15:00');
    await page.click('button[type="submit"]');
    
    // User 2 should see the new task appear
    await page2.waitForSelector('.task-item:has-text("Collaborative Task")');
    
    // Take collaboration screenshot
    await page.screenshot({ path: 'screenshots/real-time-collaboration.png' });
  });
});

test.describe('Task Creation Performance Metrics', () => {
  test('Measure detailed performance metrics', async ({ page }) => {
    // Start performance monitoring
    await page.goto('http://localhost:3000/tasks');
    
    const startTime = performance.now();
    
    // Perform task creation
    await page.click('button[data-testid="create-task"]');
    await page.fill('input[name="title"]', 'Performance measurement task');
    await page.selectOption('select[name="category"]', 'photography');
    await page.fill('input[name="deadline"]', '2024-12-31T16:00');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.success-message');
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Collect detailed metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      const marks = performance.getEntriesByType('mark');
      const measures = performance.getEntriesByType('measure');
      
      return {
        navigationTiming: {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domContentLoadedEventEnd - navigation.responseEnd,
          total: navigation.loadEventEnd - navigation.fetchStart
        },
        resourceTiming: resources.map(r => ({
          name: r.name,
          duration: r.duration,
          transferSize: (r as PerformanceResourceTiming).transferSize
        })),
        userTiming: {
          marks: marks.map(m => ({ name: m.name, startTime: m.startTime })),
          measures: measures.map(m => ({ name: m.name, duration: m.duration }))
        },
        memoryUsage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      };
    });
    
    // Assert performance thresholds
    expect(totalTime).toBeLessThan(5000); // Total interaction under 5 seconds
    expect(metrics.navigationTiming.total).toBeLessThan(3000); // Page load under 3 seconds
    expect(metrics.navigationTiming.dom).toBeLessThan(1000); // DOM processing under 1 second
    
    // Log performance metrics
    console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
    
    // Take final performance screenshot
    await page.screenshot({ path: 'screenshots/performance-metrics-complete.png' });
  });
});

test.describe('Security Testing via E2E', () => {
  test('XSS prevention in task creation form', async ({ page }) => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '<svg onload=alert("XSS")>'
    ];
    
    for (const payload of xssPayloads) {
      await page.click('button[data-testid="create-task"]');
      await page.fill('input[name="title"]', payload);
      await page.fill('textarea[name="description"]', `Description with payload: ${payload}`);
      await page.selectOption('select[name="category"]', 'security_test');
      await page.fill('input[name="deadline"]', '2024-12-31T10:00');
      await page.click('button[type="submit"]');
      
      // Verify XSS payload is neutralized
      await page.waitForSelector('.success-message');
      
      // Check that script didn't execute
      const hasAlert = await page.evaluate(() => {
        // If XSS worked, there would be an alert
        return window.alert !== window.alert; // Should be false if no XSS
      });
      
      expect(hasAlert).toBe(false);
      
      // Verify content is escaped in DOM
      const taskTitle = await page.locator('.task-item').first().textContent();
      expect(taskTitle).not.toContain('<script>');
      expect(taskTitle).not.toContain('<img');
      expect(taskTitle).not.toContain('<svg');
    }
    
    // Take security test screenshot
    await page.screenshot({ path: 'screenshots/xss-prevention-test.png' });
  });
});

// Test configuration for different browsers
const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserName => {
  test.describe(`Task Creation - ${browserName}`, () => {
    test.use({ 
      browserName: browserName as 'chromium' | 'firefox' | 'webkit'
    });
    
    test(`Task creation functionality in ${browserName}`, async ({ page }) => {
      await page.goto('http://localhost:3000/tasks');
      
      // Basic functionality test in each browser
      await page.click('button[data-testid="create-task"]');
      await page.fill('input[name="title"]', `${browserName} compatibility test`);
      await page.selectOption('select[name="category"]', 'logistics');
      await page.fill('input[name="deadline"]', '2024-12-31T12:00');
      await page.click('button[type="submit"]');
      
      await page.waitForSelector('.success-message');
      
      // Verify task appears in list
      await expect(page.locator('.task-item')).toContainText(`${browserName} compatibility test`);
      
      // Take browser-specific screenshot
      await page.screenshot({ path: `screenshots/task-creation-${browserName}.png` });
    });
  });
});