/**
 * WS-154: Lighthouse CI Configuration for Database & Performance Monitoring
 * Team D - Round 1 - Automated performance testing configuration
 *
 * This configuration sets up comprehensive performance monitoring with Lighthouse CI
 * including database performance impact tracking and Core Web Vitals monitoring
 */

module.exports = {
  ci: {
    collect: {
      // Performance monitoring URLs to test
      url: [
        // Main application pages
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/clients',
        // Admin performance monitoring pages
        'http://localhost:3000/admin/monitoring',
        'http://localhost:3000/admin/performance',
        // API endpoints for performance testing
        'http://localhost:3000/api/monitoring/health',
        'http://localhost:3000/api/monitoring/performance'
      ],

      // Test configuration
      numberOfRuns: 3, // Run 3 times to get consistent results

      // Lighthouse settings
      settings: {
        // Performance monitoring specific settings
        onlyCategories: ['performance', 'accessibility', 'best-practices'],

        // Wedding-critical performance budgets
        budgets: [
          {
            path: '/*',
            timings: [
              {
                metric: 'first-contentful-paint',
                budget: 1800, // 1.8s target for wedding-critical content
              },
              {
                metric: 'largest-contentful-paint',
                budget: 2500, // 2.5s for main content visibility
              },
              {
                metric: 'cumulative-layout-shift',
                budget: 0.1, // Minimal layout shift for professional feel
              },
              {
                metric: 'first-input-delay',
                budget: 100, // Quick interaction response
              },
              {
                metric: 'interactive',
                budget: 3500, // Full interactivity within 3.5s
              }
            ],
            resourceSizes: [
              {
                resourceType: 'document',
                budget: 300, // 300KB HTML budget
              },
              {
                resourceType: 'stylesheet',
                budget: 150, // 150KB CSS budget
              },
              {
                resourceType: 'script',
                budget: 500, // 500KB JS budget
              },
              {
                resourceType: 'image',
                budget: 800, // 800KB image budget
              },
              {
                resourceType: 'total',
                budget: 2000, // 2MB total page weight
              }
            ],
            resourceCounts: [
              {
                resourceType: 'third-party',
                budget: 10, // Limit third-party requests
              },
              {
                resourceType: 'total',
                budget: 50, // Total request limit
              }
            ]
          }
        ],

        // Emulate mobile-first (60% of wedding traffic)
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 10240,
          uploadThroughputKbps: 750
        },

        // Skip certain audits that are not relevant
        skipAudits: [
          'canonical',
          'meta-description',
          'screenshot-thumbnails'
        ],

        // Include performance monitoring metrics
        additionalTraceCategories: 'loading,blink.user_timing,disabled-by-default-blink.debug.layout',

        // Disable storage reset for database performance consistency
        disableStorageReset: true,

        // Form factor specific settings
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        }
      },

      // Database performance monitoring headers
      settings: {
        extraHeaders: {
          // Add monitoring headers to track database impact
          'X-Performance-Test': 'lighthouse-ci',
          'X-Monitoring-Source': 'automated-testing'
        }
      },

      // Chromium flags for consistent testing
      chromePath: undefined,
      puppeteerScript: './scripts/lighthouse-auth-setup.js', // For authenticated pages
      puppeteerLaunchOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    },

    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: 'lighthouse-%%DATETIME%%-%%URL_SLUG%%.%%EXTENSION%%'
    },

    server: {
      // Use existing development server
      port: 3000,
      // Lighthouse will connect to running server instead of starting one
      command: undefined
    },

    assert: {
      assertions: {
        // Performance assertions for database monitoring
        'categories:performance': ['error', { minScore: 0.8 }], // 80% performance score
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95% accessibility
        'categories:best-practices': ['error', { minScore: 0.9 }], // 90% best practices

        // Core Web Vitals assertions
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'interactive': ['error', { maxNumericValue: 3500 }],

        // Database performance related metrics
        'server-response-time': ['warn', { maxNumericValue: 600 }], // 600ms server response
        'bootup-time': ['warn', { maxNumericValue: 3000 }], // JS execution time
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }], // Main thread work

        // Resource optimization assertions
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }], // 2MB total
        'unused-javascript': ['warn', { maxNumericValue: 40000 }], // 40KB unused JS
        'unused-css-rules': ['warn', { maxNumericValue: 20000 }], // 20KB unused CSS

        // Database-specific performance indicators
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],
        'unminified-css': ['error', { maxNumericValue: 0 }],
        'unminified-javascript': ['error', { maxNumericValue: 0 }],

        // Wedding industry specific optimizations
        'efficient-animated-content': ['warn', { maxNumericValue: 5000 }], // Animated content optimization
        'legacy-javascript': ['warn', { maxNumericValue: 20000 }], // Modern JS for performance
      }
    },

    // Performance monitoring wizardry
    wizard: {
      // Enable automated optimization suggestions
      enabled: true,

      // Database performance monitoring integration
      performanceMetrics: {
        // Track database query performance impact on Core Web Vitals
        trackDatabaseImpact: true,

        // Monitor API response times during performance tests
        trackApiPerformance: true,

        // Wedding-specific performance patterns
        weddingOptimization: {
          // Critical wedding features that must load fast
          criticalFeatures: [
            '/dashboard', // Wedding dashboard
            '/clients', // Client management
            '/api/monitoring/performance' // Monitoring API
          ],

          // GUARDIAN FIX: Ultra-strict performance budgets for wedding day operations
          budgets: {
            guestListLoad: 500,  // Guest list must load in 500ms (was 1000ms - too slow for coordinators)
            timelineView: 750,   // Timeline view in 750ms (was 1500ms - critical for wedding day)
            vendorSearch: 400,   // Vendor search in 400ms (was 800ms - vendors need instant results)
            rsvpForm: 600,       // RSVP form in 600ms (was 1200ms - guests expect instant response)
            photoGallery: 800,   // Photo gallery in 800ms (critical for photographers)
            paymentProcess: 1000, // Payment processing in 1s (revenue critical)
            emergencyContact: 300 // Emergency contact in 300ms (wedding day emergencies)
          }
        }
      }
    }
  },

  // Custom performance monitoring integration
  extends: [
    // Base configuration
    'lighthouse:default'
  ],

  // Database performance monitoring plugin
  plugins: [
    // Custom plugin for database performance tracking
    './lighthouse-plugins/database-performance-plugin.js'
  ],

  // Performance monitoring categories
  categories: {
    // Enhanced performance category
    performance: {
      title: 'Performance (Database Monitoring Enhanced)',
      description: 'Performance metrics with database impact analysis',
      auditRefs: [
        { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
        { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
        { id: 'first-input-delay', weight: 10, group: 'metrics' },
        { id: 'cumulative-layout-shift', weight: 25, group: 'metrics' },
        { id: 'speed-index', weight: 10, group: 'metrics' },
        { id: 'interactive', weight: 10, group: 'metrics' },
        { id: 'max-potential-fid', weight: 10, group: 'metrics' },

        // Database performance specific audits
        { id: 'server-response-time', weight: 5, group: 'load-opportunities' },
        { id: 'render-blocking-resources', weight: 5, group: 'load-opportunities' },
        { id: 'unused-javascript', weight: 5, group: 'load-opportunities' },
        { id: 'unused-css-rules', weight: 5, group: 'load-opportunities' }
      ]
    }
  },

  // Groups for audit organization
  groups: {
    'database-performance': {
      title: 'Database Performance Impact',
      description: 'How database operations affect Core Web Vitals'
    },
    'wedding-critical': {
      title: 'Wedding-Critical Performance',
      description: 'Performance of features critical during wedding events'
    }
  },

  // Wedding industry performance thresholds
  settings: {
    // Mobile-first for wedding industry (60% mobile usage)
    formFactor: 'mobile',

    // Wedding event timing simulation
    throttling: {
      // Simulate conditions during high-traffic wedding periods
      rttMs: 40,
      throughputKbps: 10240,
      requestLatencyMs: 0,
      downloadThroughputKbps: 10240,
      uploadThroughputKbps: 750,
      cpuSlowdownMultiplier: 1
    },

    // Database connection simulation
    blockedUrlPatterns: [], // Don't block database connections
    extraHeaders: {
      'X-Performance-Context': 'wedding-critical-timing',
      'X-Database-Monitoring': 'lighthouse-ci-active'
    }
  }
};

/**
 * Performance Monitoring Integration Notes:
 *
 * 1. This configuration tests both frontend performance and database impact
 * 2. Wedding-specific budgets ensure critical features load quickly during events
 * 3. Mobile-first approach matches wedding industry usage patterns (60% mobile)
 * 4. Database performance is tracked through API response times and server metrics
 * 5. Automated reports help identify performance regressions before they impact weddings
 *
 * Usage:
 * - Development: npm run lighthouse
 * - CI/CD: Integrated into GitHub Actions workflow
 * - Monitoring: Reports feed into database monitoring dashboard
 */
