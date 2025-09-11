# TEAM C - ROUND 1: WS-173 - Performance Optimization Targets - CDN & Bundle Integration

**Date:** 2025-01-26  
**Feature ID:** WS-173 (Track all work with this ID)  
**Priority:** P0 (Critical for mobile usage)  
**Mission:** Integrate CDN delivery, optimize bundle splitting, and implement edge caching  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync on mobile at venues  
**I want to:** Fast loading pages even on slow 3G connections  
**So that:** I can quickly access client information during time-sensitive wedding coordination  

**Real Wedding Problem This Solves:**  
Wedding venues often have limited connectivity. Suppliers need assets (photos, documents, vendor lists) to load instantly from edge locations. A florist setting up at a remote barn venue can't wait for images to load from a distant server.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- CDN configuration for global asset delivery
- Bundle splitting by route and component
- Edge caching for static and dynamic content
- Service Worker for offline asset caching
- Prefetching strategy for likely next pages

**Technology Stack (VERIFIED):**
- CDN: Vercel Edge Network / Cloudflare
- Bundling: Webpack 5 with optimization plugins
- Service Workers: Workbox for PWA caching
- Analytics: Bundle size tracking

**Integration Points:**
- Team A's components: Bundle splitting boundaries
- Team B's APIs: Edge function deployment
- Build Pipeline: Webpack configuration

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
// 1. Ref MCP - Load CDN and bundling docs:
await Task({
  description: "Load CDN and bundling documentation",
  prompt: "Use Ref MCP to get docs for: Next.js 15 bundle optimization, Vercel Edge Network, Service Workers with Workbox, webpack bundle analyzer, dynamic imports and code splitting",
  subagent_type: "Ref MCP-documentation-specialist"
});

// 2. Analyze current bundle:
await Bash({
  command: "cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run build && npm run analyze",
  description: "Build and analyze current bundle sizes"
});

// 3. Review webpack config:
await Read({
  file_path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/next.config.ts"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Configure CDN and optimize bundles"
2. **integration-specialist** --think-hard "Integrate CDN with build pipeline"
3. **performance-optimization-expert** --think-ultra-hard "Implement bundle splitting strategy"
4. **devops-sre-engineer** --think-hard "Configure edge caching and CDN rules"
5. **test-automation-architect** --bundle-testing "Validate bundle sizes and splitting"
6. **security-compliance-officer** --cdn-security "Ensure CDN doesn't expose sensitive data"


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

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Analyze current bundle composition
- Identify largest dependencies
- Review route-based splitting opportunities
- Check current CDN configuration

### **PLAN PHASE**
- Design chunk splitting strategy
- Plan CDN cache rules
- Define prefetch priorities
- Create service worker strategy

### **CODE PHASE**
- Implement bundle analyzer integration
- Configure webpack optimizations
- Set up CDN headers and rules
- Create service worker with Workbox

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Bundle analyzer configuration and report
- [ ] Webpack optimization with code splitting
- [ ] CDN configuration for static assets
- [ ] Service Worker implementation
- [ ] Prefetch strategy for critical routes
- [ ] Edge caching rules

### Code Files to Create:
```typescript
// /wedsync/src/lib/performance/bundle-analyzer.ts
export class BundleAnalyzer {
  async analyzeBuild() {
    // Analyze bundle composition
  }
  
  async suggestSplitPoints() {
    // Identify optimal splitting boundaries
  }
}

// /wedsync/next.config.ts updates
const config = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns']
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365
  }
};

// /wedsync/public/service-worker.js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.precaching.precacheAndRoute([
  // Critical assets for offline
]);

// /wedsync/src/lib/performance/prefetch-manager.ts
export class PrefetchManager {
  prefetchRoute(route: string) {
    // Intelligently prefetch likely next pages
  }
}
```

### CDN Configuration:
```json
// /wedsync/vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
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
- FROM Team A: Component boundaries for splitting
- FROM Team B: API endpoints for edge functions
- FROM Team D: Mobile-specific bundle requirements

### What other teams NEED from you:
- TO Team A: Bundle split points for dynamic imports
- TO Team B: CDN invalidation triggers
- TO Team D: Service Worker for offline support
- TO Team E: Bundle size reports for testing

---

## 🔒 SECURITY REQUIREMENTS

- [ ] CDN doesn't cache authenticated responses
- [ ] Proper CORS headers on CDN
- [ ] No sensitive data in public bundles
- [ ] Service Worker respects authentication
- [ ] Bundle doesn't expose API keys

---

## 🎭 PLAYWRIGHT MCP TESTING

```javascript
// Test bundle loading and caching
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});

// Check service worker registration
const swStatus = await mcp__playwright__browser_evaluate({
  function: `() => {
    return navigator.serviceWorker.ready.then(() => 'active');
  }`
});

// Measure bundle load times
const bundleMetrics = await mcp__playwright__browser_evaluate({
  function: `() => {
    const resources = performance.getEntriesByType('resource');
    return resources
      .filter(r => r.name.includes('.js') || r.name.includes('.css'))
      .map(r => ({
        name: r.name.split('/').pop(),
        size: r.transferSize,
        duration: r.duration
      }));
  }`
});

// Validate bundle sizes
bundleMetrics.forEach(bundle => {
  console.assert(bundle.size < 50000, `Bundle ${bundle.name} exceeds 50KB`);
});
```

---

## ✅ SUCCESS CRITERIA

- [ ] Initial JS bundle < 100KB gzipped
- [ ] CSS bundle < 50KB gzipped
- [ ] All assets served from CDN
- [ ] Service Worker caches critical assets
- [ ] Bundle analyzer integrated in build
- [ ] Prefetching reduces navigation latency

---

## 💾 WHERE TO SAVE YOUR WORK

- Config: `/wedsync/next.config.ts`, `/wedsync/vercel.json`
- Service Worker: `/wedsync/public/service-worker.js`
- Bundle Tools: `/wedsync/src/lib/performance/bundle-analyzer.ts`
- Tests: `/wedsync/tests/performance/bundle/`

### Team Report Output:
- `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch22/WS-173-team-c-round-1-complete.md`

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] Bundle analyzer configured
- [ ] Webpack optimizations applied
- [ ] CDN rules configured
- [ ] Service Worker implemented
- [ ] Bundle size targets met
- [ ] Performance report generated

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY