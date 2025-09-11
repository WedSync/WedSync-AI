/**
 * WS-145: Photos Gallery-specific Lighthouse CI Configuration
 * Team A - Batch 12 - Round 3
 */

const baseConfig = require('./lighthouserc.js');

module.exports = {
  ...baseConfig,
  ci: {
    ...baseConfig.ci,
    collect: {
      ...baseConfig.ci.collect,
      url: ['http://localhost:3000/photos/gallery'],
      numberOfRuns: 3,
      settings: {
        ...baseConfig.ci.collect.settings,
        // Longer timeout for image-heavy gallery
        maxWaitForLoad: 45000,
      }
    },
    assert: {
      ...baseConfig.ci.assert,
      assertions: {
        ...baseConfig.ci.assert.assertions,
        // Gallery page thresholds - image-heavy but must be performant
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // Slightly relaxed for images
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // Allow for image loading
        'categories:performance': ['error', { minScore: 0.90 }], // Slightly relaxed for gallery
        'categories:accessibility': ['error', { minScore: 0.98 }],
        
        // Image-specific optimizations - critical for gallery
        'uses-webp-images': 'error', // Must use WebP for gallery
        'uses-optimized-images': 'error',
        'modern-image-formats': 'error',
        'offscreen-images': 'error', // Lazy loading required
        'uses-responsive-images': 'error',
        'properly-size-images': 'error',
        'efficient-animated-content': 'error',
        
        // Gallery performance budgets
        'total-byte-weight': ['warn', { maxNumericValue: 1200000 }], // 1.2MB for gallery (images)
        'unused-javascript': ['warn', { maxNumericValue: 150000 }],
        'dom-size': ['warn', { maxNumericValue: 800 }], // Virtualized gallery
      }
    }
  }
};