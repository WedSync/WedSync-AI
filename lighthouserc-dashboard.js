/**
 * WS-145: Dashboard-specific Lighthouse CI Configuration
 * Team A - Batch 12 - Round 3
 */

const baseConfig = require('./lighthouserc.js');

module.exports = {
  ...baseConfig,
  ci: {
    ...baseConfig.ci,
    collect: {
      ...baseConfig.ci.collect,
      url: ['http://localhost:3000/dashboard'],
      numberOfRuns: 5, // More runs for critical dashboard page
    },
    assert: {
      ...baseConfig.ci.assert,
      assertions: {
        ...baseConfig.ci.assert.assertions,
        // Stricter thresholds for dashboard
        'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'first-input-delay': ['error', { maxNumericValue: 75 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['error', { maxNumericValue: 150 }],
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.98 }],
        
        // Dashboard-specific metrics
        'interactive': ['error', { maxNumericValue: 3000 }],
        'speed-index': ['error', { maxNumericValue: 2800 }],
        'total-byte-weight': ['error', { maxNumericValue: 700000 }], // 700KB for dashboard
      }
    }
  }
};