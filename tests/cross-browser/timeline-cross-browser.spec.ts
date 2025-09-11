import { test, expect, devices, Browser, BrowserContext, Page } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'] as const;
type BrowserName = typeof browsers[number];

// Cross-browser timeline testing configuration
const BROWSER_CONFIGS = {
  chromium: {
    name: 'Chrome/Chromium',
    device: devices['Desktop Chrome'],
    dragDropDelay: 100,
    scrollBehavior: 'smooth' as const
  },
  firefox: {
    name: 'Firefox',
    device: devices['Desktop Firefox'],
    dragDropDelay: 150,
    scrollBehavior: 'auto' as const
  },
  webkit: {
    name: 'Safari/WebKit',
    device: devices['Desktop Safari'],
    dragDropDelay: 200,
    scrollBehavior: 'smooth' as const
  }
};

// Timeline test data
const TEST_TIMELINE_EVENTS = [
  { id: 'event-1', title: 'Photography', start: '09:00', duration: 120, type: 'photo' },
  { id: 'event-2', title: 'Ceremony', start: '11:00', duration: 60, type: 'ceremony' },
  { id: 'event-3', title: 'Reception', start: '13:00', duration: 180, type: 'reception' }
];

class CrossBrowserTimelinePage {
  constructor(public page: Page, public browserName: BrowserName) {}

  async navigateToTimeline() {
    await this.page.goto('/timeline');
    await this.page.waitForSelector('[data-testid="timeline-container"]', { 
      timeout: 10000 
    });
  }

  async dragEventWithBrowserCompat(
    sourceSelector: string, 
    targetSelector: string,
    options: { offset?: { x: number; y: number } } = {}
  ) {
    const config = BROWSER_CONFIGS[this.browserName];
    
    // Browser-specific drag implementation
    if (this.browserName === 'webkit') {
      // Safari requires special handling for drag events
      await this.page.evaluate(({ source, target, offset }) => {
        const sourceEl = document.querySelector(source) as HTMLElement;
        const targetEl = document.querySelector(target) as HTMLElement;
        
        if (!sourceEl || !targetEl) return false;
        
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        
        // Simulate drag events for Safari
        const dragStart = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        
        const dragOver = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true
        });
        
        const drop = new DragEvent('drop', {
          bubbles: true,
          cancelable: true
        });
        
        sourceEl.dispatchEvent(dragStart);
        targetEl.dispatchEvent(dragOver);
        targetEl.dispatchEvent(drop);
        
        return true;
      }, { 
        source: sourceSelector, 
        target: targetSelector, 
        offset: options.offset 
      });
      
      await this.page.waitForTimeout(config.dragDropDelay);
    } else {
      // Standard drag for Chrome/Firefox
      await this.page.dragAndDrop(sourceSelector, targetSelector, {
        delay: config.dragDropDelay,
        ...options
      });
    }
  }

  async getTimelineEvents() {
    return await this.page.evaluate(() => {
      const events = Array.from(document.querySelectorAll('[data-testid^="timeline-event-"]'));
      return events.map(el => ({
        id: el.getAttribute('data-testid'),
        position: el.getBoundingClientRect(),
        style: window.getComputedStyle(el),
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      }));
    });
  }

  async validateTimelineLayout() {
    const isLayoutValid = await this.page.evaluate(() => {
      const container = document.querySelector('[data-testid="timeline-container"]') as HTMLElement;
      if (!container) return false;
      
      const events = Array.from(container.querySelectorAll('[data-testid^="timeline-event-"]')) as HTMLElement[];
      
      // Check if events are properly positioned
      for (let i = 0; i < events.length - 1; i++) {
        const current = events[i].getBoundingClientRect();
        const next = events[i + 1].getBoundingClientRect();
        
        // Events should not completely overlap
        if (current.left === next.left && current.width === next.width) {
          return false;
        }
      }
      
      return true;
    });
    
    return isLayoutValid;
  }

  async captureTimelineScreenshot(name: string) {
    const config = BROWSER_CONFIGS[this.browserName];
    await this.page.screenshot({
      path: `test-results/cross-browser/${config.name.toLowerCase().replace('/', '-')}-${name}.png`,
      fullPage: true
    });
  }
}

// Cross-browser test suite
browsers.forEach(browserName => {
  test.describe(`Timeline Cross-Browser: ${BROWSER_CONFIGS[browserName].name}`, () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let timelinePage: CrossBrowserTimelinePage;

    test.beforeAll(async ({ playwright }) => {
      browser = await playwright[browserName].launch();
      context = await browser.newContext(BROWSER_CONFIGS[browserName].device);
      page = await context.newPage();
      timelinePage = new CrossBrowserTimelinePage(page, browserName);
    });

    test.afterAll(async () => {
      await browser.close();
    });

    test(`should render timeline correctly in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      await timelinePage.navigateToTimeline();
      
      // Verify timeline container exists
      await expect(page.locator('[data-testid="timeline-container"]')).toBeVisible();
      
      // Verify timeline events are rendered
      const events = await page.locator('[data-testid^="timeline-event-"]').count();
      expect(events).toBeGreaterThan(0);
      
      // Validate layout
      const isLayoutValid = await timelinePage.validateTimelineLayout();
      expect(isLayoutValid).toBe(true);
      
      // Capture screenshot
      await timelinePage.captureTimelineScreenshot('initial-render');
    });

    test(`should support drag and drop in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      await timelinePage.navigateToTimeline();
      
      // Wait for timeline to load
      await page.waitForSelector('[data-testid="timeline-event-1"]');
      
      const initialPosition = await page.locator('[data-testid="timeline-event-1"]').boundingBox();
      expect(initialPosition).not.toBeNull();
      
      // Perform browser-compatible drag
      await timelinePage.dragEventWithBrowserCompat(
        '[data-testid="timeline-event-1"]',
        '[data-testid="timeline-slot-2"]'
      );
      
      // Verify position changed
      await page.waitForTimeout(500);
      const finalPosition = await page.locator('[data-testid="timeline-event-1"]').boundingBox();
      expect(finalPosition).not.toBeNull();
      expect(finalPosition!.x).not.toBe(initialPosition!.x);
      
      await timelinePage.captureTimelineScreenshot('after-drag-drop');
    });

    test(`should handle viewport changes in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      await timelinePage.navigateToTimeline();
      
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1024, height: 768, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        // Verify timeline is responsive
        const container = page.locator('[data-testid="timeline-container"]');
        await expect(container).toBeVisible();
        
        // Check if timeline adapts to viewport
        const containerWidth = await container.evaluate(el => el.getBoundingClientRect().width);
        expect(containerWidth).toBeLessThanOrEqual(viewport.width);
        
        await timelinePage.captureTimelineScreenshot(`viewport-${viewport.name}`);
      }
    });

    test(`should maintain performance in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      await timelinePage.navigateToTimeline();
      
      // Measure timeline rendering performance
      const performanceMetrics = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // Simulate timeline interactions
        const container = document.querySelector('[data-testid="timeline-container"]');
        if (container) {
          container.scrollLeft = 100;
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        
        const endTime = performance.now();
        
        return {
          renderTime: endTime - startTime,
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null
        };
      });
      
      // Performance should be reasonable across browsers
      expect(performanceMetrics.renderTime).toBeLessThan(1000);
      
      console.log(`${BROWSER_CONFIGS[browserName].name} Performance:`, performanceMetrics);
    });

    test(`should handle CSS animations consistently in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      await timelinePage.navigateToTimeline();
      
      // Test CSS transitions and animations
      const animationTest = await page.evaluate(() => {
        const event = document.querySelector('[data-testid="timeline-event-1"]') as HTMLElement;
        if (!event) return false;
        
        // Check if CSS transitions are supported
        const computedStyle = window.getComputedStyle(event);
        const hasTransition = computedStyle.transition !== 'none' && computedStyle.transition !== '';
        
        // Test hover effects
        event.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        
        return {
          supportsTransitions: hasTransition,
          hasHoverEffects: true
        };
      });
      
      expect(animationTest.supportsTransitions).toBe(true);
      await timelinePage.captureTimelineScreenshot('css-animations');
    });

    test(`should support keyboard navigation in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      await timelinePage.navigateToTimeline();
      
      const firstEvent = page.locator('[data-testid="timeline-event-1"]');
      await firstEvent.focus();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      
      // Verify keyboard interaction worked
      const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(activeElement).toBeTruthy();
    });

    test(`should handle touch events in ${BROWSER_CONFIGS[browserName].name}`, async () => {
      // Only test touch on webkit (Safari) as it's most relevant for mobile
      if (browserName !== 'webkit') {
        test.skip();
        return;
      }
      
      await timelinePage.navigateToTimeline();
      
      const event = page.locator('[data-testid="timeline-event-1"]');
      
      // Simulate touch interactions
      await event.dispatchEvent('touchstart');
      await event.dispatchEvent('touchmove');
      await event.dispatchEvent('touchend');
      
      await timelinePage.captureTimelineScreenshot('touch-interaction');
    });
  });
});

// Browser compatibility summary test
test.describe('Cross-Browser Compatibility Summary', () => {
  test('should generate browser compatibility report', async ({ playwright }) => {
    const compatibilityReport = {
      browsers: [] as any[],
      features: {
        dragDrop: { supported: 0, total: 0 },
        cssAnimations: { supported: 0, total: 0 },
        keyboardNav: { supported: 0, total: 0 },
        touchEvents: { supported: 0, total: 0 },
        responsiveDesign: { supported: 0, total: 0 }
      },
      performance: {} as Record<string, any>,
      recommendations: [] as string[]
    };

    // This would be populated by the actual test results
    // For now, we'll create a template report
    
    browsers.forEach(browserName => {
      compatibilityReport.browsers.push({
        name: BROWSER_CONFIGS[browserName].name,
        status: 'tested',
        issues: [] // Would be populated with actual issues found
      });
    });

    console.log('Cross-Browser Compatibility Report:', JSON.stringify(compatibilityReport, null, 2));
    
    // Save report to file
    const fs = require('fs');
    const path = require('path');
    
    const reportPath = path.join(process.cwd(), 'test-results', 'cross-browser-compatibility-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(compatibilityReport, null, 2));
  });
});