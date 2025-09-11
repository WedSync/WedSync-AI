/**
 * WS-145: Lighthouse CI Configuration
 * Performance testing configuration for CI/CD pipeline
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test in CI
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/clients',
        'http://localhost:3000/dashboard/communications',
        'http://localhost:3000/forms/new',
        'http://localhost:3000/dashboard/timeline'
      ],
      // Performance testing settings
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      // Lighthouse settings
      settings: {
        // Throttling settings for consistent results
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        // Device emulation
        emulatedFormFactor: 'mobile',
        // Skip PWA audit in CI for speed
        skipAudits: ['uses-http2', 'redirects-http']
      }
    },
    assert: {
      // WS-145: Performance budget assertions
      assertions: {
        // Core Web Vitals thresholds
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        
        // Bundle size budgets
        'total-byte-weight': ['error', { maxNumericValue: 800000 }], // 800KB total
        'unused-javascript': ['warn', { maxNumericValue: 200000 }], // 200KB unused JS
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],
        'unminified-javascript': ['error', { maxNumericValue: 0 }],
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }],
        
        // Performance scores
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        
        // Mobile-specific assertions
        'uses-responsive-images': 'error',
        'offscreen-images': 'warn',
        'uses-webp-images': 'warn',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        
        // JavaScript optimization
        'uses-text-compression': 'error',
        'efficient-animated-content': 'warn',
        'legacy-javascript': 'warn'
      }
    },
    upload: {
      // Upload results to temporary server for CI analysis
      target: 'temporary-public-storage',
      // Store results for 30 days
      lifetimeInDays: 30
    }
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  module.exports.ci.collect.settings.throttling.cpuSlowdownMultiplier = 1;
  module.exports.ci.assert.assertions['categories:performance'][1].minScore = 0.8;
}

// Production environment with stricter thresholds
if (process.env.NODE_ENV === 'production') {
  module.exports.ci.assert.assertions = {
    ...module.exports.ci.assert.assertions,
    // Stricter mobile performance for production
    'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
    'first-input-delay': ['error', { maxNumericValue: 80 }],
    'categories:performance': ['error', { minScore: 0.95 }]
  };
}

// Wedding day specific URLs that need extra performance validation
if (process.env.WEDDING_DAY_TEST === 'true') {
  module.exports.ci.collect.url.push(
    'http://localhost:3000/dashboard/wedding-day',
    'http://localhost:3000/dashboard/timeline?wedding-day=true',
    'http://localhost:3000/dashboard/clients?wedding-day=true'
  );
  
  // Even stricter thresholds for wedding day
  module.exports.ci.assert.assertions = {
    ...module.exports.ci.assert.assertions,
    'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
    'first-input-delay': ['error', { maxNumericValue: 50 }],
    'total-blocking-time': ['error', { maxNumericValue: 150 }],
    'categories:performance': ['error', { minScore: 0.98 }]
  };
}