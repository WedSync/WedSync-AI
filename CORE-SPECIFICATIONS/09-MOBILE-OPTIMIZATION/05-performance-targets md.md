# 05-performance-targets.md

# Performance Targets for WedSync/WedMe

## Executive Summary

Performance directly impacts conversion rates and user satisfaction. Wedding professionals need instant access during events, and couples expect consumer-grade app responsiveness. These targets ensure optimal experience across all devices and network conditions.

## Core Web Vitals Targets

### Primary Metrics

```tsx
// Performance budget configuration
const PERFORMANCE_BUDGET = {
  // Core Web Vitals (must achieve for SEO)
  LCP: 2500,    // Largest Contentful Paint: < 2.5s (Good)
  FID: 100,     // First Input Delay: < 100ms (Good)
  CLS: 0.1,     // Cumulative Layout Shift: < 0.1 (Good)

  // Additional targets
  FCP: 1800,    // First Contentful Paint: < 1.8s
  TTFB: 600,    // Time to First Byte: < 600ms
  TTI: 3800,    // Time to Interactive: < 3.8s

  // Mobile-specific (slower networks)
  mobile: {
    LCP: 3000,
    FID: 100,
    CLS: 0.1,
    FCP: 2500,
    TTFB: 800,
    TTI: 5000
  }
};

```

### Page-Specific Targets

```tsx
interface PagePerformanceTargets {
  // Critical paths
  dashboard: {
    initialLoad: 2000,      // First meaningful paint
    fullyInteractive: 3500, // All widgets loaded
    dataFetch: 1000        // API response time
  },

  // Forms need to be instant
  formBuilder: {
    initialLoad: 1500,
    dragDropReady: 2000,
    autoSave: 500          // Debounced save
  },

  // Wedding day mode (offline-capable)
  weddingDay: {
    coldStart: 1000,       // From tap to usable
    offlineReady: 2000,    // All data cached
    syncTime: 5000         // Background sync when online
  },

  // Directory search
  directory: {
    searchResponse: 800,
    imageLoad: 2000,       // Above-fold images
    infiniteScroll: 500    // Next page load
  }
}

```

## Bundle Size Targets

### JavaScript Budget

```jsx
// webpack.config.js bundle analyzer configuration
module.exports = {
  performance: {
    maxAssetSize: 250000,      // 250kb per asset
    maxEntrypointSize: 400000, // 400kb per entry
    hints: 'error',

    // Specific bundle targets
    budgets: [
      {
        type: 'bundle',
        name: 'main',
        maximumSize: 200000     // 200kb main bundle
      },
      {
        type: 'bundle',
        name: 'vendor',
        maximumSize: 300000     // 300kb vendor bundle
      },
      {
        type: 'bundle',
        name: 'forms',
        maximumSize: 150000     // 150kb forms module
      }
    ]
  }
};

```

### Code Splitting Strategy

```tsx
// Route-based code splitting
const routes = {
  dashboard: lazy(() => import('./pages/Dashboard')),
  forms: lazy(() => import('./pages/Forms')),
  journey: lazy(() => import('./pages/JourneyBuilder')),
  directory: lazy(() => import('./pages/Directory')),

  // Heavy features loaded on-demand
  aiChat: lazy(() => import('./features/AIChat')),
  analytics: lazy(() => import('./features/Analytics')),
  marketplace: lazy(() => import('./features/Marketplace'))
};

// Component-level splitting for large features
const FormBuilder = lazy(() =>
  import(/* webpackChunkName: "form-builder" */ './components/FormBuilder')
);

const JourneyCanvas = lazy(() =>
  import(/* webpackChunkName: "journey-canvas" */ './components/JourneyCanvas')
);

```

## Network Performance Targets

### API Response Times

```tsx
// Supabase query optimization targets
const API_PERFORMANCE_SLA = {
  // Read operations
  auth: {
    login: 800,
    tokenRefresh: 400,
    sessionCheck: 200
  },

  queries: {
    dashboardData: 600,
    clientList: 400,      // First 50 items
    formResponses: 500,
    journeyStatus: 300
  },

  // Write operations (can be slower)
  mutations: {
    saveForm: 1000,
    updateClient: 800,
    publishJourney: 1500
  },

  // Real-time
  subscriptions: {
    connectionTime: 1000,
    messageLatency: 100   // After connection
  }
};

```

### Image Optimization Requirements

```tsx
// Next.js image optimization config
const imageConfig = {
  // Responsive image breakpoints
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256],

  // Format requirements
  formats: ['image/webp', 'image/avif'],

  // Size limits
  limits: {
    hero: 150,       // KB for hero images
    thumbnail: 30,   // KB for thumbnails
    gallery: 80,     // KB for gallery images
    avatar: 20       // KB for user avatars
  },

  // Lazy loading strategy
  loading: {
    eager: ['hero', 'above-fold'],
    lazy: ['gallery', 'below-fold'],
    priority: ['wedding-day-mode']
  }
};

```

## Mobile-Specific Targets

### 3G Network Performance

```tsx
// Performance on slow 3G (1.6 Mbps down, 750ms RTT)
const SLOW_3G_TARGETS = {
  criticalPath: {
    HTML: 14,          // KB
    CSS: 20,           // KB inline critical
    JS: 50,            // KB initial bundle
    totalInitial: 84   // KB total
  },

  timing: {
    firstPaint: 3500,
    interactive: 7000,
    fullyLoaded: 15000
  },

  strategies: [
    'inline_critical_css',
    'defer_non_critical_js',
    'lazy_load_images',
    'service_worker_cache',
    'data_prefetching'
  ]
};

```

### Offline Performance

```tsx
// Service Worker caching strategy
const OFFLINE_TARGETS = {
  cacheSize: {
    total: 50,          // MB total cache
    forms: 10,          // MB for form data
    images: 20,         // MB for images
    appShell: 5,       // MB for app shell
    clientData: 15      // MB for client data
  },

  syncTiming: {
    immediate: ['form_submissions', 'critical_updates'],
    batched: ['analytics', 'non_critical'],
    background: ['image_uploads', 'large_files']
  },

  availability: {
    dashboard: '100%',
    forms: '100%',
    timeline: '100%',
    contacts: '100%',
    journeyView: '90%'  // Some features need connection
  }
};

```

## Database Query Performance

### Supabase Query Optimization

```sql
-- Indexed query targets
-- All queries should execute under 100ms

-- Dashboard query (complex join)
EXPLAIN ANALYZE
SELECT
  c.id, c.couple_names, c.wedding_date,
  COUNT(DISTINCT f.id) as form_count,
  COUNT(DISTINCT cf.id) as completed_fields
FROM clients c
LEFT JOIN forms f ON f.client_id = c.id
LEFT JOIN core_fields cf ON cf.client_id = c.id
WHERE c.supplier_id = $1
  AND c.wedding_date > NOW()
GROUP BY c.id
LIMIT 10;
-- Target: < 50ms

-- Form responses query
EXPLAIN ANALYZE
SELECT * FROM form_responses
WHERE form_id = $1
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;
-- Target: < 30ms

```

### Indexing Strategy

```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_clients_supplier_wedding
  ON clients(supplier_id, wedding_date DESC);

CREATE INDEX CONCURRENTLY idx_forms_client_status
  ON forms(client_id, status);

CREATE INDEX CONCURRENTLY idx_journey_nodes_journey_status
  ON journey_nodes(journey_id, status, scheduled_for);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_active_clients
  ON clients(supplier_id)
  WHERE wedding_date > NOW();

```

## Rendering Performance

### React Optimization Targets

```tsx
// Component render budgets
const RENDER_BUDGET = {
  // Maximum render time per component
  dashboard: 16,        // ms (one frame at 60fps)
  formBuilder: 32,      // ms (complex interactions ok)
  list: 8,             // ms per item
  input: 4,            // ms (must feel instant)

  // Re-render frequency
  maxRerenders: {
    perSecond: 10,
    perInteraction: 3,
    perDataUpdate: 1
  }
};

// Optimization techniques required
const optimizations = [
  'React.memo for pure components',
  'useMemo for expensive calculations',
  'useCallback for stable references',
  'Virtual scrolling for long lists',
  'Debounced inputs for forms',
  'Optimistic UI updates'
];

```

### Animation Performance

```css
/* Only animate GPU-accelerated properties */
.optimized-animation {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU layer */
}

/* Targets: 60fps for all animations */
.smooth-transition {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

```

## Monitoring & Alerts

### Real User Monitoring (RUM)

```tsx
// Performance monitoring setup
const performanceMonitoring = {
  // Metrics to track
  metrics: [
    'web-vitals',
    'api-timing',
    'js-errors',
    'resource-timing'
  ],

  // Alert thresholds
  alerts: {
    p95_LCP: 4000,      // Alert if 95th percentile > 4s
    p95_FID: 200,       // Alert if 95th percentile > 200ms
    errorRate: 0.01,    // Alert if >1% error rate
    apiTimeout: 0.05    // Alert if >5% API timeouts
  },

  // Sampling rates
  sampling: {
    production: 0.1,    // 10% of users
    staging: 1.0,       // 100% in staging
    development: 0      // Disabled in dev
  }
};

```

### Performance Testing Pipeline

```yaml
# GitHub Actions performance testing
name: Performance Tests
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.wedsync.app
            https://staging.wedme.app
          budgetPath: ./performance-budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Check Performance Budget
        run: |
          if [ "$LIGHTHOUSE_SCORE" -lt 90 ]; then
            echo "Performance score below 90"
            exit 1
          fi

```

## Optimization Strategies

### Critical Path Optimization

1. Inline critical CSS (above-fold styles)
2. Preload key resources (fonts, hero images)
3. Defer non-critical JavaScript
4. Use resource hints (dns-prefetch, preconnect)

### Progressive Enhancement

1. Server-side render critical content
2. Hydrate interactive components progressively
3. Load heavy features on user interaction
4. Implement skeleton screens for perceived performance

### Network Optimization

1. Enable HTTP/2 push for critical resources
2. Implement aggressive caching strategies
3. Use CDN for static assets
4. Compress all text resources (Brotli/Gzip)

## Success Criteria

### Must-Have Performance

- Dashboard loads in <2s on 4G
- Forms are interactive in <1.5s
- Zero layout shift after initial paint
- Offline mode works for wedding day features
- 90+ Lighthouse score on all core pages

### Nice-to-Have Performance

- Instant page transitions (<100ms)
- Background sync for all data
- Predictive prefetching based on user behavior
- Edge caching for global performance