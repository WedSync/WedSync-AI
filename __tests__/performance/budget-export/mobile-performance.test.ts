import { performance } from 'perf_hooks';
import { chromium, Page, Browser } from '@playwright/test';
import { expect, test, describe } from '@jest/globals';

interface PerformanceMetrics {
  renderTime: number;
  exportGenerationTime: number;
  fileDownloadTime: number;
  memoryUsage: number;
  batteryImpact: number;
  networkUsage: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

interface DeviceCapabilities {
  viewport: { width: number; height: number };
  userAgent: string;
  deviceMemory: number;
  connectionType: 'wifi' | '4g' | '3g' | 'slow';
}

const MOBILE_DEVICES: Record<string, DeviceCapabilities> = {
  'iPhone 12': {
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    deviceMemory: 4,
    connectionType: 'wifi'
  },
  'Samsung Galaxy S21': {
    viewport: { width: 384, height: 854 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
    deviceMemory: 8,
    connectionType: '4g'
  },
  'Budget Android': {
    viewport: { width: 360, height: 640 },
    userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-A105F)',
    deviceMemory: 2,
    connectionType: '3g'
  }
};

const PERFORMANCE_TARGETS = {
  exportDialogRender: 300, // ms
  csvExportComplete: 2000, // ms
  pdfExportComplete: 15000, // ms
  fileDownloadInit: 500, // ms
  exportHistoryLoad: 1000, // ms
  memoryUsageMax: 50, // MB
  cpuUsageMax: 30, // %
  batteryImpactMax: 2, // %
  firstContentfulPaint: 800, // ms
  largestContentfulPaint: 2500 // ms
};

describe('WS-166 Mobile Budget Export Performance Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ]
    });
  });

  afterAll(async () => {
    await browser?.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    await page.goto('http://localhost:3000/test-budget-export', {
      waitUntil: 'networkidle'
    });
  });

  afterEach(async () => {
    await page?.close();
  });

  describe('Mobile Device Performance', () => {
    Object.entries(MOBILE_DEVICES).forEach(([deviceName, deviceConfig]) => {
      test(`${deviceName} - Export Dialog Render Performance`, async () => {
        await page.setViewportSize(deviceConfig.viewport);
        await page.setUserAgent(deviceConfig.userAgent);

        const startTime = performance.now();
        
        await page.click('[data-testid="export-button"]');
        await page.waitForSelector('[data-testid="export-dialog"]', {
          state: 'visible'
        });

        const renderTime = performance.now() - startTime;
        
        expect(renderTime).toBeLessThan(PERFORMANCE_TARGETS.exportDialogRender);
        
        console.log(`${deviceName} Export Dialog Render: ${renderTime}ms (Target: <${PERFORMANCE_TARGETS.exportDialogRender}ms)`);
      });

      test(`${deviceName} - CSV Export Performance`, async () => {
        await page.setViewportSize(deviceConfig.viewport);
        await page.setUserAgent(deviceConfig.userAgent);

        await page.click('[data-testid="export-button"]');
        await page.waitForSelector('[data-testid="export-dialog"]');

        const startTime = performance.now();
        
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="csv-export-button"]');
        
        const download = await downloadPromise;
        const exportTime = performance.now() - startTime;

        expect(exportTime).toBeLessThan(PERFORMANCE_TARGETS.csvExportComplete);
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
        
        console.log(`${deviceName} CSV Export: ${exportTime}ms (Target: <${PERFORMANCE_TARGETS.csvExportComplete}ms)`);
      });

      test(`${deviceName} - Memory Usage During Large Export`, async () => {
        await page.setViewportSize(deviceConfig.viewport);
        await page.setUserAgent(deviceConfig.userAgent);

        const initialMemory = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        await page.click('[data-testid="export-button"]');
        await page.click('[data-testid="large-pdf-export"]');
        
        await page.waitForTimeout(5000);
        
        const peakMemory = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        const memoryIncreaseMB = (peakMemory - initialMemory) / (1024 * 1024);
        
        expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_TARGETS.memoryUsageMax);
        
        console.log(`${deviceName} Memory Usage: ${memoryIncreaseMB.toFixed(2)}MB (Target: <${PERFORMANCE_TARGETS.memoryUsageMax}MB)`);
      });
    });
  });

  describe('Touch Interface Performance', () => {
    test('Touch Target Response Time', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const touchTargets = await page.$$('[data-testid*="touch-target"]');
      
      for (const target of touchTargets) {
        const boundingBox = await target.boundingBox();
        expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox?.height).toBeGreaterThanOrEqual(44);

        const startTime = performance.now();
        await target.tap();
        
        await page.waitForFunction(() => {
          return document.querySelector('[data-testid="touch-feedback"]');
        });
        
        const responseTime = performance.now() - startTime;
        expect(responseTime).toBeLessThan(100);
      }
    });

    test('Swipe Gesture Performance', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const exportHistory = page.locator('[data-testid="export-history-list"]');
      await exportHistory.waitFor({ state: 'visible' });

      const startTime = performance.now();
      
      await exportHistory.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();
      
      await page.waitForSelector('[data-testid="swipe-action"]', {
        state: 'visible'
      });
      
      const swipeTime = performance.now() - startTime;
      expect(swipeTime).toBeLessThan(200);
    });
  });

  describe('Network Performance Optimization', () => {
    test('Slow Network Export Queue', async () => {
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000);
      });
      
      await page.setViewportSize({ width: 375, height: 812 });
      
      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="csv-export-button"]');
      
      const queueIndicator = page.locator('[data-testid="offline-queue-indicator"]');
      await queueIndicator.waitFor({ state: 'visible' });
      
      const queueText = await queueIndicator.textContent();
      expect(queueText).toContain('1 export queued');
    });

    test('Network-Aware Export Optimization', async () => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'connection', {
          value: {
            effectiveType: '3g',
            downlink: 0.5,
            rtt: 300
          },
          writable: false
        });
      });

      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="pdf-export-button"]');
      
      const optimizationNotice = page.locator('[data-testid="optimization-notice"]');
      await optimizationNotice.waitFor({ state: 'visible' });
      
      const noticeText = await optimizationNotice.textContent();
      expect(noticeText).toContain('Optimized for slow connection');
    });
  });

  describe('Core Web Vitals', () => {
    test('First Contentful Paint (FCP)', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const navigationPromise = page.waitForNavigation();
      await page.goto('http://localhost:3000/wedme/budget/export');
      await navigationPromise;

      const fcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntriesByName('first-contentful-paint');
            if (entries.length > 0) {
              resolve(entries[0].startTime);
            }
          }).observe({ entryTypes: ['paint'] });
        });
      });

      expect(fcp).toBeLessThan(PERFORMANCE_TARGETS.firstContentfulPaint);
      console.log(`FCP: ${fcp}ms (Target: <${PERFORMANCE_TARGETS.firstContentfulPaint}ms)`);
    });

    test('Largest Contentful Paint (LCP)', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      await page.goto('http://localhost:3000/wedme/budget/export');

      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
      });

      expect(lcp).toBeLessThan(PERFORMANCE_TARGETS.largestContentfulPaint);
      console.log(`LCP: ${lcp}ms (Target: <${PERFORMANCE_TARGETS.largestContentfulPaint}ms)`);
    });

    test('Cumulative Layout Shift (CLS)', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      await page.goto('http://localhost:3000/wedme/budget/export');
      await page.waitForTimeout(3000);

      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            resolve(clsValue);
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(clsValue), 2000);
        });
      });

      expect(cls).toBeLessThan(0.1);
      console.log(`CLS: ${cls} (Target: <0.1)`);
    });
  });

  describe('Battery and Resource Optimization', () => {
    test('CPU Usage During Export Generation', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      await page.evaluate(() => {
        (window as any).startCpuMonitoring = () => {
          const startTime = performance.now();
          let iterations = 0;
          
          const monitor = () => {
            const currentTime = performance.now();
            iterations++;
            
            if (currentTime - startTime < 5000) {
              requestAnimationFrame(monitor);
            } else {
              (window as any).cpuUsage = (iterations / 5000) * 100;
            }
          };
          
          requestAnimationFrame(monitor);
        };
      });

      await page.evaluate(() => (window as any).startCpuMonitoring());
      
      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="large-pdf-export"]');
      
      await page.waitForTimeout(5000);
      
      const cpuUsage = await page.evaluate(() => (window as any).cpuUsage || 0);
      
      expect(cpuUsage).toBeLessThan(PERFORMANCE_TARGETS.cpuUsageMax);
      console.log(`CPU Usage: ${cpuUsage}% (Target: <${PERFORMANCE_TARGETS.cpuUsageMax}%)`);
    });
  });

  describe('Progressive Loading Performance', () => {
    test('Chunked Data Loading', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const loadingSteps = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/budget/export/data')) {
          loadingSteps.push({
            url: response.url(),
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="large-dataset-export"]');
      
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 20000 });
      
      expect(loadingSteps.length).toBeGreaterThan(1);
      
      const timeDiffs = loadingSteps.slice(1).map((step, index) => 
        step.timestamp - loadingSteps[index].timestamp
      );
      
      const avgChunkTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      expect(avgChunkTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility Performance', () => {
    test('Screen Reader Navigation Performance', async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      await page.addInitScript(() => {
        (window as any).screenReaderTimings = [];
        
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'aria-live') {
              (window as any).screenReaderTimings.push(performance.now());
            }
          });
        });
        
        observer.observe(document, {
          subtree: true,
          attributes: true,
          attributeFilter: ['aria-live']
        });
      });

      await page.click('[data-testid="export-button"]');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      const timings = await page.evaluate(() => (window as any).screenReaderTimings);
      
      if (timings.length > 1) {
        const navigationTime = timings[timings.length - 1] - timings[0];
        expect(navigationTime).toBeLessThan(500);
      }
    });
  });
});

export { PERFORMANCE_TARGETS, MOBILE_DEVICES, type PerformanceMetrics, type DeviceCapabilities };