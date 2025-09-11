/**
 * WS-193 Mobile Performance Tests Suite - Team D
 * Lighthouse CI Performance Testing for Wedding Workflows
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { test, expect } from '@playwright/test';

interface PerformanceTest {
  url: string;
  name: string;
  device: 'mobile' | 'desktop';
  throttling: '3G' | '4G' | 'none';
}

const weddingWorkflowTests: PerformanceTest[] = [
  { url: '/supplier/forms/create', name: 'Supplier Form Creation', device: 'mobile', throttling: '3G' },
  { url: '/couple/dashboard', name: 'Couple Dashboard', device: 'mobile', throttling: '4G' },
  { url: '/forms/intake/photo-upload', name: 'Photo Upload Form', device: 'mobile', throttling: '4G' },
  { url: '/wedding/timeline', name: 'Wedding Timeline', device: 'mobile', throttling: '3G' },
  { url: '/dashboard/tasks', name: 'Task Management', device: 'mobile', throttling: '4G' },
  { url: '/emergency/coordination', name: 'Emergency Coordination', device: 'mobile', throttling: '3G' },
];

function getThrottlingConfig(type: string) {
  const configs = {
    '3G': {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      requestLatencyMs: 150 * 3.75,
      downloadThroughputKbps: 1.6 * 1024,
      uploadThroughputKbps: 750,
      cpuSlowdownMultiplier: 4,
    },
    '4G': {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      requestLatencyMs: 40 * 3.75,
      downloadThroughputKbps: 10 * 1024,
      uploadThroughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
    none: undefined,
  };
  return configs[type as keyof typeof configs];
}

function getScreenConfig(device: string) {
  return device === 'mobile' ? {
    mobile: true,
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    disabled: false,
  } : {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  };
}

test.describe('Mobile Performance Audits - WS-193 Team D', () => {
  let chrome: any;

  test.beforeAll(async () => {
    chrome = await chromeLauncher.launch({ 
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
    });
  });

  test.afterAll(async () => {
    if (chrome) {
      await chrome.kill();
    }
  });

  weddingWorkflowTests.forEach(({ url, name, device, throttling }) => {
    test(`should meet performance benchmarks for ${name} on ${device} with ${throttling}`, async () => {
      const options = {
        logLevel: 'error' as const,
        output: 'json' as const,
        onlyCategories: ['performance'],
        port: chrome.port,
        throttlingMethod: 'simulate',
        throttling: getThrottlingConfig(throttling),
        formFactor: device,
        screenEmulation: getScreenConfig(device),
      };

      const runnerResult = await lighthouse(`http://localhost:3000${url}`, options);
      
      if (!runnerResult) {
        throw new Error(`Lighthouse failed to run for ${url}`);
      }

      const { lhr } = runnerResult;
      const metrics = lhr.audits;
      
      console.log(`\n🎯 Performance Results for ${name} (${device}, ${throttling}):`);
      console.log(`   FCP: ${Math.round(metrics['first-contentful-paint'].numericValue || 0)}ms`);
      console.log(`   LCP: ${Math.round(metrics['largest-contentful-paint'].numericValue || 0)}ms`);
      console.log(`   CLS: ${(metrics['cumulative-layout-shift'].numericValue || 0).toFixed(3)}`);
      console.log(`   Speed Index: ${Math.round(metrics['speed-index'].numericValue || 0)}ms`);
      console.log(`   Performance Score: ${Math.round((lhr.categories.performance.score || 0) * 100)}`);

      // Core Web Vitals thresholds for wedding workflows
      
      // Largest Contentful Paint - Critical for mobile users at venues
      const lcpValue = metrics['largest-contentful-paint'].numericValue || 0;
      if (throttling === '3G') {
        expect(lcpValue).toBeLessThan(4000); // Relaxed for 3G
      } else if (throttling === '4G') {
        expect(lcpValue).toBeLessThan(2500); // Standard threshold
      } else {
        expect(lcpValue).toBeLessThan(2000); // Fast connection
      }
      
      // First Input Delay - Important for form interactions
      const fidValue = metrics['max-potential-fid'] ? metrics['max-potential-fid'].numericValue || 0 : 0;
      expect(fidValue).toBeLessThan(300); // Wedding day tolerance
      
      // Cumulative Layout Shift - Critical for form filling
      const clsValue = metrics['cumulative-layout-shift'].numericValue || 0;
      expect(clsValue).toBeLessThan(0.1);
      
      // Overall performance score - Should be reasonable for wedding workflows
      const performanceScore = (lhr.categories.performance.score || 0) * 100;
      if (throttling === '3G') {
        expect(performanceScore).toBeGreaterThan(70); // Relaxed for 3G
      } else {
        expect(performanceScore).toBeGreaterThan(85); // Higher standard for 4G+
      }
      
      // Wedding-specific metrics
      const speedIndex = metrics['speed-index'].numericValue || 0;
      const interactive = metrics['interactive'].numericValue || 0;
      
      if (throttling === '3G') {
        expect(speedIndex).toBeLessThan(6000); // Visual completion on 3G
        expect(interactive).toBeLessThan(8000); // Interactivity on 3G
      } else {
        expect(speedIndex).toBeLessThan(3500); // Fast visual completion
        expect(interactive).toBeLessThan(4000); // Quick interactivity
      }

      // Emergency coordination requires faster performance
      if (name === 'Emergency Coordination') {
        expect(lcpValue).toBeLessThan(2000); // Emergency = faster required
        expect(performanceScore).toBeGreaterThan(90);
      }

      // Photo upload forms need special consideration
      if (name === 'Photo Upload Form') {
        const totalBlockingTime = metrics['total-blocking-time'].numericValue || 0;
        expect(totalBlockingTime).toBeLessThan(600); // Keep responsive during uploads
      }

    }, 60000); // 60 second timeout for lighthouse tests
  });

  test('PWA performance validation', async () => {
    const options = {
      logLevel: 'error' as const,
      output: 'json' as const,
      onlyCategories: ['pwa'],
      port: chrome.port,
      formFactor: 'mobile',
      screenEmulation: getScreenConfig('mobile'),
    };

    const runnerResult = await lighthouse('http://localhost:3000', options);
    
    if (!runnerResult) {
      throw new Error('PWA Lighthouse audit failed');
    }

    const { lhr } = runnerResult;
    const pwaScore = (lhr.categories.pwa.score || 0) * 100;
    
    console.log(`\n📱 PWA Performance Score: ${Math.round(pwaScore)}`);
    
    // PWA requirements for wedding platform
    expect(pwaScore).toBeGreaterThan(80);
    
    // Check specific PWA audits
    const audits = lhr.audits;
    
    // Service worker should be registered
    expect(audits['service-worker'].score).toBe(1);
    
    // Should work offline (critical for wedding venues)
    expect(audits['works-offline'].score).toBe(1);
    
    // Should be installable
    expect(audits['installable-manifest'].score).toBe(1);
    
    // Should have proper splash screen
    expect(audits['splash-screen'].score).toBe(1);
    
    // Should have themed omnibox
    expect(audits['themed-omnibox'].score).toBe(1);

    console.log('✅ PWA requirements validated for wedding workflows');
  });

  test('Wedding day performance stress test', async () => {
    // Simulate peak wedding day conditions
    const options = {
      logLevel: 'error' as const,
      output: 'json' as const,
      onlyCategories: ['performance'],
      port: chrome.port,
      throttlingMethod: 'simulate',
      throttling: {
        rttMs: 300, // High latency venue WiFi
        throughputKbps: 512, // Limited bandwidth
        requestLatencyMs: 300 * 3.75,
        downloadThroughputKbps: 512,
        uploadThroughputKbps: 256,
        cpuSlowdownMultiplier: 6, // Stressed device
      },
      formFactor: 'mobile',
      screenEmulation: getScreenConfig('mobile'),
    };

    // Test critical wedding day pages
    const weddingDayUrls = [
      '/wedding/coordination/live',
      '/emergency/alerts',
      '/tasks/wedding-day',
      '/timeline/live-updates'
    ];

    for (const url of weddingDayUrls) {
      console.log(`\n🎪 Testing wedding day performance for: ${url}`);
      
      const runnerResult = await lighthouse(`http://localhost:3000${url}`, options);
      
      if (!runnerResult) {
        console.warn(`⚠️ Failed to audit ${url}`);
        continue;
      }

      const { lhr } = runnerResult;
      const metrics = lhr.audits;
      
      // Even under stress, wedding day pages must load
      const fcp = metrics['first-contentful-paint'].numericValue || 0;
      const lcp = metrics['largest-contentful-paint'].numericValue || 0;
      
      console.log(`   FCP: ${Math.round(fcp)}ms`);
      console.log(`   LCP: ${Math.round(lcp)}ms`);
      
      // Wedding day emergency thresholds
      expect(fcp).toBeLessThan(5000); // 5s max for first content
      expect(lcp).toBeLessThan(8000); // 8s max for main content
      
      // Performance score should still be functional
      const performanceScore = (lhr.categories.performance.score || 0) * 100;
      expect(performanceScore).toBeGreaterThan(60); // Minimum viable performance
      
      console.log(`   Score: ${Math.round(performanceScore)}/100 ✅`);
    }

    console.log('\n🎉 Wedding day stress test completed successfully');
  });

  test('Accessibility performance intersection', async () => {
    // Test that performance optimizations don't hurt accessibility
    const options = {
      logLevel: 'error' as const,
      output: 'json' as const,
      onlyCategories: ['performance', 'accessibility'],
      port: chrome.port,
      throttlingMethod: 'simulate',
      throttling: getThrottlingConfig('3G'),
      formFactor: 'mobile',
      screenEmulation: getScreenConfig('mobile'),
    };

    const runnerResult = await lighthouse('http://localhost:3000/dashboard', options);
    
    if (!runnerResult) {
      throw new Error('Accessibility performance audit failed');
    }

    const { lhr } = runnerResult;
    
    const performanceScore = (lhr.categories.performance.score || 0) * 100;
    const accessibilityScore = (lhr.categories.accessibility.score || 0) * 100;
    
    console.log(`\n♿ Performance: ${Math.round(performanceScore)}/100`);
    console.log(`   Accessibility: ${Math.round(accessibilityScore)}/100`);
    
    // Both scores should be high - wedding platform serves diverse users
    expect(performanceScore).toBeGreaterThan(80);
    expect(accessibilityScore).toBeGreaterThan(90);
    
    // Check that performance optimizations haven't broken accessibility
    const accessibilityAudits = lhr.audits;
    
    // Critical accessibility checks
    expect(accessibilityAudits['color-contrast'].score).toBe(1);
    expect(accessibilityAudits['button-name'].score).toBe(1);
    expect(accessibilityAudits['link-name'].score).toBe(1);
    
    console.log('✅ Performance and accessibility requirements both met');
  });

});