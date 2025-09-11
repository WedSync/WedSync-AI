# TEAM E - ROUND 1: WS-173 - Performance Optimization Targets - Testing & Monitoring

**Date:** 2025-01-26  
**Feature ID:** WS-173 (Track all work with this ID)  
**Priority:** P0 (Critical for mobile usage)  
**Mission:** Create comprehensive performance testing suite and monitoring dashboards  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync on mobile at venues  
**I want to:** Fast loading pages even on slow 3G connections  
**So that:** I can quickly access client information during time-sensitive wedding coordination  

**Real Wedding Problem This Solves:**  
Performance issues during a wedding can be catastrophic. If the system slows down when 10 vendors access it simultaneously during setup, or when guests are checking in, it disrupts the entire event. We need continuous monitoring to prevent this.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Automated performance testing in CI/CD
- Real-time performance monitoring dashboard
- Lighthouse CI integration
- Load testing for concurrent users
- Performance regression detection

**Technology Stack (VERIFIED):**
- Testing: Playwright MCP, Browser MCP, Lighthouse CI, K6 load testing
- Monitoring: Web Vitals, Custom metrics
- Dashboard: Real-time performance visualization
- Alerts: Threshold-based notifications

**Integration Points:**
- CI/CD: GitHub Actions integration
- Monitoring: Sentry performance tracking
- Dashboard: Admin panel integration


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. Load performance testing docs:
await Task({
  description: "Load performance testing documentation",
  prompt: "Use Ref MCP for: Lighthouse CI setup, Playwright performance testing, K6 load testing, Web Vitals monitoring, performance budgets",
  subagent_type: "Ref MCP-documentation-specialist"
});

// 2. Check existing test infrastructure:
await Grep({
  pattern: "performance|lighthouse|vitals|metric",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/tests",
  output_mode: "files_with_matches"
});

// 3. Review CI/CD configuration:
await Read({
  file_path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/.github/workflows/ci.yml"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build performance testing and monitoring suite"
2. **test-automation-architect** --performance-focus "Create comprehensive performance tests"
3. **monitoring** --real-time-metrics "Build performance dashboard"
4. **devops-sre-engineer** --ci-integration "Integrate performance tests in CI/CD"
5. **playwright-visual-testing-specialist** --performance-validation "Implement visual regression tests" --use-browser-mcp
6. **data-analytics-engineer** --metrics-analysis "Design performance analytics"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Review existing performance tests
- Identify critical user journeys
- Check current monitoring setup
- Analyze performance bottlenecks

### **PLAN PHASE**
- Design test scenarios
- Define performance budgets
- Plan monitoring strategy
- Create alert thresholds

### **CODE PHASE**
- Implement Lighthouse CI
- Create load testing suite
- Build monitoring dashboard
- Set up automated alerts

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Lighthouse CI configuration and tests
- [ ] K6 load testing scripts
- [ ] Performance monitoring dashboard
- [ ] Automated performance regression tests
- [ ] Real-time metrics collection
- [ ] Alert system for threshold violations

### Code Files to Create:
```typescript
// /wedsync/lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/dashboard'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 4,
          downloadThroughputKbps: 1638, // 3G
          uploadThroughputKbps: 675
        }
      }
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['error', {maxNumericValue: 2500}],
        'largest-contentful-paint': ['error', {maxNumericValue: 4000}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        'total-blocking-time': ['error', {maxNumericValue: 300}]
      }
    }
  }
};

// /wedsync/tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'], // 99% of requests under 200ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  }
};

export default function() {
  const res = http.get('http://localhost:3000/api/clients');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}

// /wedsync/src/lib/monitoring/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Check thresholds
    this.checkThresholds(name, value);
  }
  
  async sendToMonitoring() {
    // Send to monitoring service
  }
}

// /wedsync/src/app/admin/performance/page.tsx
export default function PerformanceDashboard() {
  // Real-time performance metrics dashboard
}
```

### GitHub Actions Integration:
```yaml
# /wedsync/.github/workflows/performance.yml
name: Performance Testing
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
      
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run K6 Load Tests
        run: |
          docker run -i grafana/k6 run - <tests/performance/load-test.js
```

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Performance metrics from components
- FROM Team B: API performance endpoints
- FROM Team C: Bundle size reports
- FROM Team D: Mobile performance data

### What other teams NEED from you:
- TO ALL Teams: Performance test results and reports
- TO Team B: Load test results for capacity planning
- TO DevOps: Performance monitoring dashboards

---

## 🔒 SECURITY REQUIREMENTS

- [ ] Performance tests don't expose sensitive data
- [ ] Load tests use test data only
- [ ] Monitoring respects user privacy
- [ ] Dashboard requires authentication

---

## 🎭 PLAYWRIGHT MCP TESTING

```javascript
// Comprehensive performance test suite
async function runPerformanceTests() {
  // Test different network conditions
  const conditions = [
    { name: '3G', download: 1.6, upload: 0.75, latency: 150 },
    { name: '4G', download: 12, upload: 3, latency: 70 },
    { name: 'WiFi', download: 30, upload: 15, latency: 20 }
  ];
  
  for (const condition of conditions) {
    console.log(`Testing on ${condition.name}`);
    
    // Navigate and measure
    await mcp__playwright__browser_navigate({url: "http://localhost:3000"});
    
    const metrics = await mcp__playwright__browser_evaluate({
      function: `() => {
        return new Promise((resolve) => {
          // Collect all performance metrics
          const observer = new PerformanceObserver((list) => {
            const entries = {};
            for (const entry of list.getEntries()) {
              entries[entry.entryType] = entry;
            }
            resolve(entries);
          });
          
          observer.observe({ 
            entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] 
          });
          
          setTimeout(() => resolve({}), 5000);
        });
      }`
    });
    
    // Validate against budgets
    validateMetrics(condition.name, metrics);
  }
}
```

---

## ✅ SUCCESS CRITERIA

- [ ] Lighthouse CI running in GitHub Actions
- [ ] Load tests validate 100 concurrent users
- [ ] Performance dashboard shows real-time metrics
- [ ] Automated alerts for regressions
- [ ] All performance budgets enforced
- [ ] Test coverage for critical paths

---

## 💾 WHERE TO SAVE YOUR WORK

- Tests: `/wedsync/tests/performance/`
- Monitoring: `/wedsync/src/lib/monitoring/`
- Dashboard: `/wedsync/src/app/admin/performance/`
- CI/CD: `/wedsync/.github/workflows/performance.yml`
- Config: `/wedsync/lighthouse.config.js`

### Team Report Output:
- `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch22/WS-173-team-e-round-1-complete.md`

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] Lighthouse CI configured
- [ ] Load tests implemented
- [ ] Performance dashboard created
- [ ] CI/CD integration complete
- [ ] Monitoring active
- [ ] Documentation updated

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY