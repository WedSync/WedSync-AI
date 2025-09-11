// /tests/utils/PerformanceTester.ts
export class PerformanceTester {
  async measureWebVitals(page: any): Promise<{ lcp: number; fid: number; cls: number }> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const webVitals = { lcp: 0, fid: 0, cls: 0 };
        
        // Measure Largest Contentful Paint
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          webVitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Measure First Input Delay
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            webVitals.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });
        
        // Measure Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          webVitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Wait for measurements to stabilize
        setTimeout(() => resolve(webVitals), 3000);
      });
    });
  }

  async loginAsPhotographer(page: any): Promise<void> {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@test.com');
    await page.fill('[data-testid="password"]', 'test123456');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  }

  async createTestImage(width: number = 2048, height: number = 1536): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    const sharp = require('sharp');
    
    const testImagePath = path.join(__dirname, `../fixtures/perf-test-${width}x${height}.jpg`);
    
    // Create a realistic sized test image
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 128, g: 128, b: 128 }
      }
    })
    .jpeg({ quality: 80 })
    .toFile(testImagePath);
    
    return testImagePath;
  }

  async measurePageLoad(page: any): Promise<{ loadTime: number; domContentLoaded: number; firstPaint: number }> {
    const performanceTiming = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
      };
    });
    
    return performanceTiming;
  }

  async getMemoryUsage(page: any): Promise<{ usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }> {
    return await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
    });
  }

  async loadLargePhotoGallery(page: any, photoCount: number): Promise<void> {
    await page.goto('/photos');
    
    // Simulate loading a large gallery
    for (let i = 0; i < photoCount; i++) {
      await page.evaluate((index) => {
        const img = document.createElement('img');
        img.src = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`;
        img.style.width = '200px';
        img.style.height = '150px';
        img.setAttribute('data-testid', `photo-${index}`);
        document.body.appendChild(img);
      }, i);
      
      // Small delay to simulate progressive loading
      await page.waitForTimeout(10);
    }
  }

  async measureNetworkPerformance(page: any): Promise<{ totalRequests: number; totalSize: number; averageResponseTime: number }> {
    const networkMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const totalRequests = entries.length;
      const totalSize = entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
      const averageResponseTime = entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;
      
      return {
        totalRequests,
        totalSize,
        averageResponseTime
      };
    });
    
    return networkMetrics;
  }

  async simulateSlowNetwork(page: any, latency: number = 200): Promise<void> {
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, latency));
      await route.continue();
    });
  }

  async measureBundleSize(page: any): Promise<{ jsSize: number; cssSize: number; imageSize: number }> {
    return await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      
      let jsSize = 0;
      let cssSize = 0;
      let imageSize = 0;
      
      entries.forEach((entry) => {
        const url = entry.name;
        const size = entry.transferSize || 0;
        
        if (url.includes('.js')) {
          jsSize += size;
        } else if (url.includes('.css')) {
          cssSize += size;
        } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          imageSize += size;
        }
      });
      
      return { jsSize, cssSize, imageSize };
    });
  }

  async checkCacheEffectiveness(page: any): Promise<{ cacheHitRate: number; cachedResources: number; totalResources: number }> {
    return await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      let cachedResources = 0;
      
      entries.forEach((entry) => {
        // Resources loaded from cache typically have very small or zero duration
        if (entry.duration < 10 || entry.transferSize === 0) {
          cachedResources++;
        }
      });
      
      const cacheHitRate = (cachedResources / entries.length) * 100;
      
      return {
        cacheHitRate,
        cachedResources,
        totalResources: entries.length
      };
    });
  }
}