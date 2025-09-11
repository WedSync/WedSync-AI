# TEAM D - ROUND 1: WS-193 - Performance Tests Suite
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create comprehensive mobile performance testing framework that validates PWA performance, cross-device optimization, and mobile-specific wedding workflow performance under real-world conditions
**FEATURE ID:** WS-193 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about mobile performance during wedding scenarios, PWA optimization, and cross-platform performance consistency

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/performance/mobile/
cat $WS_ROOT/wedsync/tests/performance/mobile/lighthouse-tests.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm run test:performance:mobile
# MUST show: "All mobile performance tests passing with benchmarks met"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query mobile performance patterns and PWA configuration
await mcp__serena__search_for_pattern("mobile viewport responsive performance");
await mcp__serena__find_symbol("service-worker pwa manifest", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/public/");
```

### B. MOBILE PERFORMANCE PATTERNS (MANDATORY FOR MOBILE PERFORMANCE)
```typescript
// Load mobile performance testing documentation
# Use Ref MCP to search for:
# - "Lighthouse CI performance testing"
# - "Mobile web performance optimization"
# - "PWA performance benchmarking"
# - "Cross-device performance testing strategies"
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to mobile performance testing
# Use Ref MCP to search for relevant documentation
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE PERFORMANCE TESTING

### Use Sequential Thinking MCP for Mobile Performance Strategy
```typescript
// Use for comprehensive mobile performance analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile performance testing for wedding workflows requires: real device testing across iOS/Android, network condition simulation (3G/4G/WiFi), PWA performance validation, touch interaction responsiveness, and battery usage optimization. Wedding suppliers and couples use mobile devices in venues with poor connectivity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Critical mobile wedding scenarios: Couples filling forms during venue visits, suppliers updating tasks from wedding locations, photo uploads from mobile cameras at venues, real-time coordination during wedding day setup, GPS-based vendor coordination. Each requires different performance optimization strategies.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "PWA performance considerations: Service worker caching effectiveness, offline functionality performance, app shell loading times, push notification performance, home screen installation impact. Wedding coordination needs reliable offline capability for venue visits.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile performance benchmarks: Initial page load <2s on 3G, form submission <1s on good network, photo upload with progress indication, touch response <100ms, PWA app shell <1s, offline sync <5s after reconnect. Must meet Google Core Web Vitals.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Cross-platform testing requirements: iOS Safari quirks, Android Chrome variations, tablet form factors, desktop fallback performance. Different devices have different performance characteristics - need comprehensive device matrix testing with real performance data.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down mobile performance testing requirements across devices
2. **performance-optimization-expert** - Design mobile performance benchmarking strategies
3. **playwright-visual-testing-specialist** - Create cross-device performance validation
4. **code-quality-guardian** - Maintain mobile performance testing standards
5. **documentation-chronicler** - Document mobile performance procedures and benchmarks

## 🔒 SECURITY REQUIREMENTS FOR MOBILE PERFORMANCE TESTING (NON-NEGOTIABLE!)

### MOBILE PERFORMANCE TEST SECURITY CHECKLIST:
- [ ] **Device isolation** - Test devices don't store production credentials
- [ ] **Network simulation security** - Simulated networks don't expose real traffic
- [ ] **Photo upload testing** - Use test images, not sensitive wedding photos
- [ ] **Location testing** - Mock GPS without exposing real venue locations
- [ ] **Push notification security** - Test notifications with dummy data only
- [ ] **PWA security** - Service worker tests don't cache sensitive data
- [ ] **Performance monitoring privacy** - No user tracking in performance tests

## 🎯 TEAM D SPECIALIZATION: PLATFORM/MOBILE PERFORMANCE FOCUS

**MOBILE & PWA PERFORMANCE FOCUS:**
- Mobile-first performance optimization and testing
- PWA performance validation and service worker optimization
- Cross-device performance consistency testing
- Network condition simulation and optimization
- Touch interaction performance and responsiveness
- Battery usage optimization and testing
- Mobile-specific wedding workflow performance validation

## 📋 TECHNICAL SPECIFICATION

**Mobile Performance Test Requirements:**
- Test performance across device types: iPhone SE, iPad, Android phones/tablets
- Validate network performance: 3G, 4G, WiFi, offline scenarios
- Test PWA functionality: service worker, offline sync, push notifications
- Measure Core Web Vitals: LCP, FID, CLS across all critical pages
- Test touch interaction responsiveness and gesture handling
- Validate photo upload performance from mobile cameras
- Test cross-device real-time synchronization performance

**Mobile Performance Benchmarks:**
- Largest Contentful Paint (LCP): <2.5s on 3G networks
- First Input Delay (FID): <100ms for all touch interactions
- Cumulative Layout Shift (CLS): <0.1 for form pages
- PWA app shell load: <1s on repeat visits
- Photo upload: Progress indication, <30s for 5MB image on 4G
- Offline sync: <5s sync time after reconnection

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Comprehensive mobile performance testing framework
- [ ] Lighthouse CI integration for automated performance auditing
- [ ] Cross-device performance validation suite
- [ ] Network condition simulation testing
- [ ] PWA performance benchmarking tests
- [ ] Mobile battery usage optimization tests
- [ ] Touch interaction performance validation

## 💾 WHERE TO SAVE YOUR WORK
- Mobile Performance Tests: $WS_ROOT/wedsync/tests/performance/mobile/
- Lighthouse Config: $WS_ROOT/wedsync/.lighthouserc.js
- Performance Scripts: $WS_ROOT/wedsync/scripts/performance/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/

## 🏁 COMPLETION CHECKLIST
- [ ] Mobile performance test files created and verified to exist
- [ ] TypeScript compilation successful for all mobile tests
- [ ] All mobile performance tests passing benchmarks
- [ ] Lighthouse CI configured and running successfully
- [ ] Cross-device performance validation working
- [ ] PWA performance tests meeting Core Web Vitals
- [ ] Mobile performance documentation complete
- [ ] Senior dev review prompt created

## 📱 MOBILE PERFORMANCE TESTING PATTERNS

### Lighthouse CI Performance Testing
```typescript
// tests/performance/mobile/lighthouse-tests.ts
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

interface PerformanceTest {
  url: string;
  name: string;
  device: 'mobile' | 'desktop';
  throttling: '3G' | '4G' | 'none';
}

const weddingWorkflowTests: PerformanceTest[] = [
  { url: '/supplier/forms/create', name: 'Supplier Form Creation', device: 'mobile', throttling: '3G' },
  { url: '/couple/dashboard', name: 'Couple Dashboard', device: 'mobile', throttling: '4G' },
  { url: '/forms/intake/photo-upload', name: 'Photo Upload Form', device: 'mobile', throttling: '4G' },
  { url: '/wedding/timeline', name: 'Wedding Timeline', device: 'mobile', throttling: '3G' },
];

describe('Mobile Performance Audits', () => {
  let chrome: any;

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  });

  afterAll(async () => {
    await chrome.kill();
  });

  weddingWorkflowTests.forEach(({ url, name, device, throttling }) => {
    it(`should meet performance benchmarks for ${name} on ${device} with ${throttling}`, async () => {
      const options = {
        logLevel: 'error' as const,
        output: 'json' as const,
        onlyCategories: ['performance'],
        port: chrome.port,
        throttlingMethod: 'simulate',
        throttling: getThrottlingConfig(throttling),
        formFactor: device,
        screenEmulation: getScreenConfig(device),
      };

      const runnerResult = await lighthouse(`http://localhost:3000${url}`, options);
      const { lhr } = runnerResult;

      // Core Web Vitals thresholds for wedding workflows
      const metrics = lhr.audits;
      
      // Largest Contentful Paint - Critical for mobile users at venues
      expect(metrics['largest-contentful-paint'].numericValue).toBeLessThan(2500);
      
      // First Input Delay - Important for form interactions
      expect(metrics['max-potential-fid'].numericValue).toBeLessThan(100);
      
      // Cumulative Layout Shift - Critical for form filling
      expect(metrics['cumulative-layout-shift'].numericValue).toBeLessThan(0.1);
      
      // Overall performance score - Should be > 90 for wedding workflows
      expect(lhr.categories.performance.score * 100).toBeGreaterThan(90);
      
      // Wedding-specific metrics
      expect(metrics['speed-index'].numericValue).toBeLessThan(3000); // Fast visual completion
      expect(metrics['interactive'].numericValue).toBeLessThan(3500); // Quick interactivity
    }, 30000);
  });
});

function getThrottlingConfig(type: string) {
  const configs = {
    '3G': {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      requestLatencyMs: 150 * 3.75,
      downloadThroughputKbps: 1.6 * 1024,
      uploadThroughputKbps: 750,
      cpuSlowdownMultiplier: 4,
    },
    '4G': {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      requestLatencyMs: 40 * 3.75,
      downloadThroughputKbps: 10 * 1024,
      uploadThroughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
    none: undefined,
  };
  return configs[type as keyof typeof configs];
}
```

### PWA Performance Testing
```typescript
// tests/performance/mobile/pwa-performance.test.ts
describe('PWA Performance Testing', () => {
  it('should load app shell quickly on repeat visits', async () => {
    // First visit to cache app shell
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clear network cache but keep service worker cache
    await page.context().clearCookies();
    
    // Second visit should use cached app shell
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-shell"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000); // App shell loads under 1s
  });

  it('should handle offline form submission gracefully', async () => {
    await page.goto('/supplier/forms/create');
    
    // Fill form while online
    await page.fill('[data-testid="form-title"]', 'Wedding Photography Package');
    await page.fill('[data-testid="form-description"]', 'Professional wedding photography services');
    
    // Go offline before submission
    await page.context().setOffline(true);
    
    const submitStart = Date.now();
    await page.click('[data-testid="submit-form"]');
    
    // Should show offline indicator and queue submission
    await page.waitForSelector('[data-testid="offline-indicator"]');
    await page.waitForSelector('[data-testid="submission-queued"]');
    
    const offlineHandlingTime = Date.now() - submitStart;
    expect(offlineHandlingTime).toBeLessThan(500); // Quick offline handling
    
    // Come back online and verify sync
    await page.context().setOffline(false);
    
    const syncStart = Date.now();
    await page.waitForSelector('[data-testid="submission-synced"]');
    const syncTime = Date.now() - syncStart;
    
    expect(syncTime).toBeLessThan(5000); // Sync completes under 5s
  });

  it('should handle photo uploads with progress indication', async () => {
    await page.goto('/forms/wedding-photos/upload');
    
    // Simulate mobile camera photo upload
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(__dirname, '../fixtures/test-wedding-photo.jpg');
    
    const uploadStart = Date.now();
    await fileInput.setInputFiles(testImagePath);
    
    // Should show progress indication immediately
    await page.waitForSelector('[data-testid="upload-progress"]', { timeout: 1000 });
    
    // Progress should update during upload
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    
    // Wait for upload completion
    await page.waitForSelector('[data-testid="upload-complete"]');
    const uploadTime = Date.now() - uploadStart;
    
    // Should complete within reasonable time on 4G
    expect(uploadTime).toBeLessThan(30000); // Under 30s for 5MB photo
  });
});
```

### Cross-Device Performance Testing
```typescript
// tests/performance/mobile/cross-device-performance.test.ts
const deviceConfigs = [
  { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
  { name: 'iPhone 12', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
  { name: 'iPad', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
  { name: 'Samsung Galaxy S21', width: 384, height: 854, deviceScaleFactor: 2.75, isMobile: true },
];

describe('Cross-Device Performance Consistency', () => {
  deviceConfigs.forEach((device) => {
    describe(`${device.name} Performance`, () => {
      beforeEach(async () => {
        await page.setViewportSize({
          width: device.width,
          height: device.height,
        });
      });

      it('should maintain consistent performance across devices', async () => {
        const testUrl = '/supplier/dashboard';
        
        // Measure page load performance
        const startTime = Date.now();
        await page.goto(testUrl);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Device-specific performance expectations
        const maxLoadTime = device.isMobile ? 3000 : 2000;
        expect(loadTime).toBeLessThan(maxLoadTime);
        
        // Test touch interaction responsiveness on mobile
        if (device.isMobile) {
          const touchStart = Date.now();
          await page.tap('[data-testid="main-menu-button"]');
          await page.waitForSelector('[data-testid="menu-opened"]');
          const touchResponseTime = Date.now() - touchStart;
          
          expect(touchResponseTime).toBeLessThan(100);
        }
        
        // Test form interaction performance
        const formInteractionStart = Date.now();
        await page.click('[data-testid="create-form-button"]');
        await page.waitForSelector('[data-testid="form-builder"]');
        const formLoadTime = Date.now() - formInteractionStart;
        
        expect(formLoadTime).toBeLessThan(2000);
      });
    });
  });
});
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive mobile performance testing prompt with real-world wedding scenarios!**