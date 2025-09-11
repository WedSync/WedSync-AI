/**
 * Lighthouse CI Configuration - WS-193 Mobile Performance Tests Suite
 * Team D - Mobile & PWA Performance Focus
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test - focus on critical wedding workflows
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/supplier/forms/create',
        'http://localhost:3000/couple/dashboard',
        'http://localhost:3000/forms/intake/photo-upload',
        'http://localhost:3000/wedding/timeline',
        'http://localhost:3000/emergency/coordination',
        'http://localhost:3000/tasks/wedding-day',
      ],
      
      // Test configurations for different conditions
      settings: {
        // Mobile-first testing (primary focus)
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        },
        
        // Wedding venue network conditions simulation
        throttling: {
          rttMs: 150,
          throughputKbps: 1.6 * 1024, // 3G connection typical at venues
          requestLatencyMs: 150 * 3.75,
          downloadThroughputKbps: 1.6 * 1024,
          uploadThroughputKbps: 750,
          cpuSlowdownMultiplier: 4,
        },
        
        // Focus on critical categories for wedding workflows
        onlyCategories: ['performance', 'pwa', 'accessibility'],
        
        // Skip non-essential audits to speed up CI
        skipAudits: [
          'canonical',
          'robots-txt',
          'hreflang',
          'is-crawlable',
        ],
        
        // Wedding-specific performance budgets
        budgets: [
          {
            path: '/*',
            timings: [
              { metric: 'first-contentful-paint', budget: 2000 }, // 2s max FCP
              { metric: 'largest-contentful-paint', budget: 3000 }, // 3s max LCP on 3G
              { metric: 'cumulative-layout-shift', budget: 0.1 },  // Minimal layout shift
              { metric: 'total-blocking-time', budget: 600 },      // Keep interactive
            ],
            resourceSizes: [
              { resourceType: 'script', budget: 500 },    // 500KB JS budget
              { resourceType: 'stylesheet', budget: 100 }, // 100KB CSS budget
              { resourceType: 'image', budget: 1000 },     // 1MB image budget
              { resourceType: 'total', budget: 2000 },     // 2MB total budget
            ],
            resourceCounts: [
              { resourceType: 'script', budget: 15 },      // Limit JS files
              { resourceType: 'stylesheet', budget: 5 },   // Limit CSS files
              { resourceType: 'image', budget: 20 },       // Reasonable image count
              { resourceType: 'total', budget: 100 },      // Total resource limit
            ],
          },
        ],
      },
      
      // Number of runs for statistical significance
      numberOfRuns: 3,
      
      // Start server automatically for CI
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
    },
    
    assert: {
      // Wedding-specific performance assertions
      assertions: {
        // Core Web Vitals - critical for mobile wedding workflows
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:pwa': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        
        // Specific metrics for wedding day reliability
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 600 }],
        'speed-index': ['error', { maxNumericValue: 3500 }],
        
        // PWA requirements - critical for wedding venues
        'service-worker': 'error',
        'works-offline': 'error',
        'installable-manifest': 'error',
        'splash-screen': 'warn',
        'themed-omnibox': 'warn',
        'content-width': 'error',
        
        // Accessibility - wedding platform serves diverse users
        'color-contrast': 'error',
        'button-name': 'error',
        'link-name': 'error',
        'tap-targets': 'warn',
        
        // Performance optimizations
        'render-blocking-resources': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'efficient-animated-content': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'uses-responsive-images': 'warn',
      },
    },
    
    upload: {
      // Store results for trend analysis
      target: 'temporary-public-storage',
      
      // GitHub integration for PR comments
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      githubApiHost: 'api.github.com',
      githubStatusContextSuffix: '/wedding-performance',
    },
  },
  
  // Custom configurations for different scenarios
  scenarios: {
    // Fast WiFi scenario (premium venue)
    'wifi-fast': {
      collect: {
        settings: {
          throttling: {
            rttMs: 20,
            throughputKbps: 50 * 1024,
            requestLatencyMs: 20 * 3.75,
            downloadThroughputKbps: 50 * 1024,
            uploadThroughputKbps: 20 * 1024,
            cpuSlowdownMultiplier: 1,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.9 }],
          'first-contentful-paint': ['error', { maxNumericValue: 1200 }],
          'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        },
      },
    },
    
    // Poor venue connection scenario
    'venue-poor': {
      collect: {
        settings: {
          throttling: {
            rttMs: 300,
            throughputKbps: 512,
            requestLatencyMs: 300 * 3.75,
            downloadThroughputKbps: 512,
            uploadThroughputKbps: 256,
            cpuSlowdownMultiplier: 6,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['warn', { minScore: 0.7 }], // Relaxed for poor conditions
          'first-contentful-paint': ['error', { maxNumericValue: 5000 }],
          'largest-contentful-paint': ['error', { maxNumericValue: 8000 }],
        },
      },
    },
    
    // Desktop fallback scenario
    'desktop': {
      collect: {
        settings: {
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
          throttling: {
            rttMs: 40,
            throughputKbps: 10 * 1024,
            requestLatencyMs: 40 * 3.75,
            downloadThroughputKbps: 10 * 1024,
            uploadThroughputKbps: 10 * 1024,
            cpuSlowdownMultiplier: 1,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.9 }],
          'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
          'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        },
      },
    },
  },
};