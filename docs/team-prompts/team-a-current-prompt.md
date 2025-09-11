# TEAM A - BATCH 12 - ROUND 1 PROMPT
**WS-145: Performance Optimization Targets Implementation**
**Generated:** 2025-01-24 | **Team:** A | **Batch:** 12 | **Round:** 1/3

## MISSION STATEMENT
You are Team A, Frontend Performance Specialists. Your mission is to implement comprehensive performance optimization targets for WedSync, ensuring the platform loads instantly and responds seamlessly across all devices. This implementation focuses on Core Web Vitals optimization, bundle analysis, and real-time performance monitoring to deliver a premium user experience that wedding professionals depend on during critical events.

## WEDDING CONTEXT USER STORY - REAL WEDDING SCENARIO

### Sarah's Wedding Day Crisis Prevention
**The Story:** Sarah Martinez, a professional wedding photographer in Austin, is shooting Elena and Marcus's vineyard wedding. During the cocktail hour, she needs to quickly reference the timeline to confirm when formal portraits begin, but the venue's WiFi is slow and unreliable. She opens WedSync on her iPhone, and within 1.8 seconds, the dashboard loads completely with cached timeline data. When she updates the couple's photo preferences, the optimistic UI updates immediately while syncing in the background. No waiting, no frustration, just professional efficiency.

**Technical Reality:** This scenario requires:
- LCP (Largest Contentful Paint) under 2.5 seconds on 3G networks
- Bundle size optimization with main bundle under 200KB
- Service worker caching for offline-first timeline access
- Optimistic UI updates for seamless UX during poor connectivity

### Madison's Form Building Speed Test
**The Story:** Madison Chen, a wedding planner, is customizing intake forms for three new clients during her lunch break. She needs the form builder to feel instant and responsive. Opening the form builder loads in 1.2 seconds, drag-and-drop elements respond without lag, and auto-save triggers within 500ms of any change. Even with complex multi-page forms, the interface never stutters or delays her workflow.

**Performance Requirements:**
- Form builder interactive in under 1.5 seconds
- 60fps drag-and-drop performance with React optimization
- Debounced auto-save with local-first data persistence
- Virtual scrolling for forms with 50+ fields

## TECHNICAL REQUIREMENTS - BATCH 12 SPECIFICATIONS

### Core Implementation Focus - Round 1
Based on WS-145 technical specifications, implement:

1. **Next.js Performance Configuration**
   - Webpack bundle optimization with size budgets
   - Image optimization with WebP/AVIF support
   - Code splitting with dynamic imports
   - Performance budgets enforced at build time

2. **Core Web Vitals Monitoring**
   - Real-time LCP, FID, CLS tracking
   - Performance monitoring dashboard component
   - Automated performance CI/CD pipeline
   - Resource timing analysis

3. **Bundle Analysis Infrastructure**
   - Webpack bundle analyzer integration
   - Bundle size monitoring and alerts
   - Tree shaking optimization
   - Vendor bundle splitting strategy

### Code Examples from Technical Specifications

```typescript
// Performance budget configuration (from WS-145 spec)
const PERFORMANCE_TARGETS = {
  LCP: {
    good: 2500,    // Largest Contentful Paint < 2.5s
    poor: 4000,    // > 4s is poor
    mobile: 3000   // Slightly relaxed for mobile
  },
  FID: {
    good: 100,     // First Input Delay < 100ms
    poor: 300,     // > 300ms is poor
    mobile: 100    // Same for mobile
  },
  CLS: {
    good: 0.1,     // Cumulative Layout Shift < 0.1
    poor: 0.25,    // > 0.25 is poor
    mobile: 0.1    // Same for mobile
  }
} as const;

// Bundle size targets
const BUNDLE_TARGETS = {
  main: 200000,      // 200KB main bundle
  vendor: 300000,    // 300KB vendor bundle
  forms: 150000,     // 150KB forms module
  dashboard: 180000, // 180KB dashboard module
  total: 800000      // 800KB total JS
} as const;
```

### Implementation Priorities - Round 1
1. **Core Web Vitals Infrastructure** (Days 1-2)
   - Set up web-vitals library integration
   - Create PerformanceMonitor class
   - Implement real-time metrics collection

2. **Next.js Configuration Optimization** (Days 3-4)
   - Configure webpack performance budgets
   - Set up bundle analyzer
   - Implement image optimization

3. **Performance Dashboard** (Days 5-6)
   - Build performance monitoring UI
   - Create metrics visualization
   - Add threshold alerting

## MCP SERVER INTEGRATION REQUIREMENTS

### Context7 Documentation Queries
```typescript
// REQUIRED: Load these documentation resources
await mcp__context7__get-library-docs("/vercel/next.js", "performance optimization webpack configuration", 3000);
await mcp__context7__get-library-docs("/react/react", "performance optimization memoization hooks", 2000);
await mcp__context7__get-library-docs("/web-vitals/web-vitals", "core web vitals measurement", 1500);
```

### Supabase Performance Tracking
```sql
-- Create performance metrics table for tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  lcp_score NUMERIC,
  fid_score NUMERIC,
  cls_score NUMERIC,
  load_time_ms INTEGER,
  bundle_size INTEGER,
  device_type TEXT,
  connection_type TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## SECURITY REQUIREMENTS

### Performance Security Considerations
1. **Bundle Analysis Security**
   - Ensure no sensitive data in bundle analyzer reports
   - Secure performance API endpoints with rate limiting
   - Validate performance metrics before storage

2. **Monitoring Data Protection**
   - Encrypt performance metrics containing user behavior
   - Apply data retention policies to performance logs
   - Secure dashboard access with role-based permissions

### Implementation Security Checklist
- [ ] Performance API endpoints protected with authentication
- [ ] No sensitive config exposed in client bundles
- [ ] Rate limiting on performance metrics collection
- [ ] Performance dashboard requires admin role

## TEAM DEPENDENCIES & COORDINATION

### Batch 12 Team Coordination
- **Team B** (WS-146 App Store): Your performance scores directly feed into app store requirements
- **Team C** (WS-147 Authentication): Performance monitoring includes auth flow timing
- **Team D** (WS-148 Encryption): Bundle size impacts include encryption libraries
- **Team E** (WS-149 GDPR): Performance metrics collection must be GDPR compliant

### Cross-Team Integration Points
1. **Performance Budget Impact**
   - Encryption libraries affect bundle size (Team D coordination)
   - Authentication flows impact LCP metrics (Team C coordination)
   - App store requirements driven by performance scores (Team B dependency)

2. **Shared Infrastructure**
   - Performance monitoring dashboard shared with all teams
   - Bundle analysis affects all feature implementations
   - CI/CD performance gates block all team deployments

## PLAYWRIGHT TESTING REQUIREMENTS

### Core Web Vitals Testing
```typescript
// Performance testing with Playwright MCP
describe('WS-145 Performance Targets', () => {
  test('Dashboard meets Core Web Vitals thresholds', async () => {
    await mcp__playwright__browser_navigate({url: '/dashboard'});
    
    const metrics = await mcp__playwright__browser_evaluate({
      function: `() => {
        return new Promise((resolve) => {
          import('web-vitals').then(({ onLCP, onFID, onCLS }) => {
            const vitals = {};
            onLCP(metric => vitals.lcp = metric.value);
            onFID(metric => vitals.fid = metric.value);
            onCLS(metric => vitals.cls = metric.value);
            setTimeout(() => resolve(vitals), 5000);
          });
        });
      }`
    });
    
    expect(metrics.lcp).toBeLessThan(2500);
    expect(metrics.fid).toBeLessThan(100);
    expect(metrics.cls).toBeLessThan(0.1);
  });

  test('Form builder loads under 1.5 seconds', async () => {
    const start = Date.now();
    await mcp__playwright__browser_navigate({url: '/forms/new'});
    await mcp__playwright__browser_wait_for({text: 'Form Builder Ready'});
    const loadTime = Date.now() - start;
    
    expect(loadTime).toBeLessThan(1500);
  });

  test('Mobile performance on slow 3G', async () => {
    // Simulate slow 3G network
    await mcp__playwright__browser_evaluate({
      function: `() => {
        // Network throttling simulation
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          Object.defineProperty(connection, 'effectiveType', { value: 'slow-2g' });
        }
      }`
    });
    
    const start = Date.now();
    await mcp__playwright__browser_navigate({url: '/dashboard'});
    await mcp__playwright__browser_wait_for({text: 'Dashboard Loaded'});
    const loadTime = Date.now() - start;
    
    expect(loadTime).toBeLessThan(5000); // 5s limit for slow networks
  });
});
```

### Bundle Size Validation Testing
```typescript
test('Bundle sizes meet targets', async () => {
  await mcp__playwright__browser_navigate({url: '/'});
  
  const bundleStats = await mcp__playwright__browser_evaluate({
    function: `() => {
      return window.__BUNDLE_STATS__ || {
        main: performance.getEntriesByType('resource')
          .filter(r => r.name.includes('main') && r.name.endsWith('.js'))
          .reduce((total, r) => total + r.transferSize, 0),
        vendor: performance.getEntriesByType('resource')
          .filter(r => r.name.includes('vendor') && r.name.endsWith('.js'))
          .reduce((total, r) => total + r.transferSize, 0)
      };
    }`
  });
  
  expect(bundleStats.main).toBeLessThan(200000); // 200KB limit
  expect(bundleStats.vendor).toBeLessThan(300000); // 300KB limit
});
```

## SPECIFIC IMPLEMENTATION TASKS - ROUND 1

### Day 1: Performance Infrastructure Setup
1. **Install Performance Dependencies**
   ```bash
   npm install web-vitals @next/bundle-analyzer webpack-bundle-analyzer
   npm install --save-dev lighthouse @lhci/cli
   ```

2. **Create Performance Monitor Service**
   - Implement PerformanceMonitor class from WS-145 spec
   - Set up Core Web Vitals tracking
   - Create performance metrics collection API

3. **Next.js Configuration Enhancement**
   - Update next.config.js with performance budgets
   - Configure bundle analyzer
   - Set up webpack optimization rules

### Day 2: Core Web Vitals Implementation
1. **Web Vitals Integration**
   - Implement LCP, FID, CLS measurement
   - Create performance analytics service
   - Set up metrics storage in Supabase

2. **Performance Dashboard Component**
   - Build real-time metrics display
   - Create performance alerts system
   - Add threshold monitoring

### Day 3: Bundle Optimization
1. **Webpack Configuration**
   - Implement code splitting strategy
   - Configure vendor bundle separation
   - Add performance budget enforcement

2. **Bundle Analysis Tools**
   - Set up automated bundle size reporting
   - Create bundle visualization dashboard
   - Implement size regression detection

### Day 4: Mobile Performance Focus
1. **Mobile Optimization**
   - Implement responsive loading strategies
   - Add mobile-specific performance targets
   - Create mobile performance testing suite

2. **Network Resilience**
   - Add slow connection handling
   - Implement progressive loading
   - Create offline performance metrics

### Day 5: CI/CD Performance Integration
1. **Lighthouse CI Setup**
   - Configure performance CI/CD pipeline
   - Set up automated performance testing
   - Create performance regression alerts

2. **Performance Monitoring Dashboard**
   - Complete performance dashboard UI
   - Add real-time performance tracking
   - Implement performance trend analysis

### Day 6: Testing & Validation
1. **Performance Testing Suite**
   - Create comprehensive Playwright tests
   - Validate Core Web Vitals compliance
   - Test bundle size enforcement

2. **Integration Testing**
   - Verify cross-team performance impact
   - Test with authentication flows (Team C)
   - Validate app store performance requirements (Team B)

## ACCEPTANCE CRITERIA - ROUND 1

### Core Web Vitals Compliance
- [ ] Dashboard LCP score consistently under 2.5 seconds
- [ ] Form builder FID under 100ms on desktop and mobile
- [ ] CLS score under 0.1 across all pages
- [ ] Performance monitoring active and collecting metrics

### Bundle Performance
- [ ] Main bundle size under 200KB
- [ ] Vendor bundle under 300KB
- [ ] Total JavaScript payload under 800KB
- [ ] Bundle analysis integrated into CI/CD

### Mobile Performance
- [ ] Mobile LCP under 3 seconds on slow 3G
- [ ] Touch interaction response under 50ms
- [ ] Form builder functional on slower devices
- [ ] Progressive loading implemented

### Monitoring & Alerting
- [ ] Real-time performance dashboard functional
- [ ] Performance regression alerts working
- [ ] Team coordination dashboard updated
- [ ] Performance CI/CD pipeline blocking poor performance

## SUCCESS METRICS - ROUND 1
- **Technical:** 90+ Lighthouse performance scores on all key pages
- **User Experience:** Sub-2 second perceived load times
- **Developer Experience:** Performance feedback integrated into development workflow
- **Business Impact:** Foundation for app store submission requirements

## ROUND 1 DELIVERABLES
1. **Performance Infrastructure**
   - PerformanceMonitor service implementation
   - Core Web Vitals tracking system
   - Performance metrics collection API

2. **Optimization Implementation**
   - Next.js performance configuration
   - Bundle optimization and analysis
   - Mobile performance enhancements

3. **Monitoring Dashboard**
   - Real-time performance metrics display
   - Performance trend analysis
   - Team coordination integration

4. **Testing Suite**
   - Comprehensive Playwright performance tests
   - CI/CD performance validation
   - Mobile performance testing

**TEAM A - READY TO OPTIMIZE PERFORMANCE. MAKE WEDSYNC BLAZINGLY FAST! 🚀**