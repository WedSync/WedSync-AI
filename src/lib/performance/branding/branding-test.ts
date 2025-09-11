/**
 * WS-221 Team D - Branding Performance System Test
 * Isolated test to verify branding system TypeScript compilation
 */

import {
  AssetOptimizer,
  BrandingPerformanceMonitor,
  BrandAssetCache,
  LoadTestingSystem,
  BrandingSystem,
  type BrandAsset,
  type PerformanceMetric,
} from './index';

// Test TypeScript compilation and basic functionality
export function testBrandingSystem(): void {
  console.log('Testing WS-221 Team D Branding Performance System...');

  // Test AssetOptimizer
  const optimizer = AssetOptimizer.getInstance();
  console.log('✅ AssetOptimizer instantiated');

  // Test BrandingPerformanceMonitor
  const monitor = BrandingPerformanceMonitor.getInstance();
  console.log('✅ BrandingPerformanceMonitor instantiated');

  // Test BrandAssetCache
  const cache = BrandAssetCache.getInstance();
  console.log('✅ BrandAssetCache instantiated');

  // Test LoadTestingSystem
  const loadTest = LoadTestingSystem.getInstance();
  console.log('✅ LoadTestingSystem instantiated');

  // Test BrandingSystem
  const brandingSystem = BrandingSystem.getInstance();
  console.log('✅ BrandingSystem instantiated');

  // Test type definitions
  const testAsset: BrandAsset = {
    id: 'test-asset',
    type: 'logo',
    originalUrl: 'https://example.com/logo.png',
    optimizedUrls: {
      mobile: 'https://example.com/logo-mobile.webp',
      tablet: 'https://example.com/logo-tablet.webp',
      desktop: 'https://example.com/logo-desktop.webp',
      thumbnail: 'https://example.com/logo-thumb.webp',
    },
    metadata: {
      size: 1024000,
      dimensions: { width: 1200, height: 800 },
      format: 'image/png',
      optimizedAt: new Date(),
      compressionRatio: 0.7,
    },
  };

  const testMetric: PerformanceMetric = {
    id: 'test-metric',
    timestamp: new Date(),
    metricType: 'load_time',
    value: 1500,
    metadata: { test: true },
    deviceType: 'mobile',
    networkType: '4g',
  };

  console.log('✅ TypeScript types validated');
  console.log('✅ All WS-221 Team D systems are properly typed and compiled');
}

// Export for testing
if (typeof window !== 'undefined') {
  (window as any).testBrandingSystem = testBrandingSystem;
}
