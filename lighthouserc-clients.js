/**
 * WS-145: Clients page-specific Lighthouse CI Configuration
 * Team A - Batch 12 - Round 3
 */

const baseConfig = require('./lighthouserc.js');

module.exports = {
  ...baseConfig,
  ci: {
    ...baseConfig.ci,
    collect: {
      ...baseConfig.ci.collect,
      url: ['http://localhost:3000/clients'],
      numberOfRuns: 3,
    },
    assert: {
      ...baseConfig.ci.assert,
      assertions: {
        ...baseConfig.ci.assert.assertions,
        // Clients page thresholds
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'first-input-delay': ['error', { maxNumericValue: 80 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.08 }],
        'categories:performance': ['error', { minScore: 0.93 }],
        'categories:accessibility': ['error', { minScore: 0.98 }],
        
        // Client list specific optimizations
        'uses-passive-event-listeners': 'warn',
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        'total-byte-weight': ['error', { maxNumericValue: 750000 }],
      }
    }
  }
};