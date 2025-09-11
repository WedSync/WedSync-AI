/**
 * WS-145: Forms page-specific Lighthouse CI Configuration
 * Team A - Batch 12 - Round 3
 */

const baseConfig = require('./lighthouserc.js');

module.exports = {
  ...baseConfig,
  ci: {
    ...baseConfig.ci,
    collect: {
      ...baseConfig.ci.collect,
      url: ['http://localhost:3000/forms/new'],
      numberOfRuns: 3,
    },
    assert: {
      ...baseConfig.ci.assert,
      assertions: {
        ...baseConfig.ci.assert.assertions,
        // Forms page thresholds - needs to be fast for UX
        'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'first-input-delay': ['error', { maxNumericValue: 50 }], // Very strict for forms
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.03 }], // Forms must be stable
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.98 }], // Critical for form accessibility
        
        // Form-specific optimizations
        'label': 'error', // All form fields must have labels
        'color-contrast': 'error',
        'focus-traps': 'error',
        'focusable-controls': 'error',
        'interactive': ['error', { maxNumericValue: 2800 }], // Forms need to be interactive fast
        'total-blocking-time': ['error', { maxNumericValue: 100 }],
        'total-byte-weight': ['error', { maxNumericValue: 600000 }], // 600KB for forms
      }
    }
  }
};