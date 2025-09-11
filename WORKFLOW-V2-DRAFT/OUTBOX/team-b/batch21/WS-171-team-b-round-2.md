# TEAM B — BATCH 21 — ROUND 2 — WS-171: Mobile PWA Configuration - Service Worker Backend

**Date:** 2025-08-26  
**Feature ID:** WS-171 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build service worker configuration and PWA tracking APIs  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before Round 3.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier working on-site at wedding venues
**I want to:** Access WedSync as a mobile app that works offline and installs on my phone
**So that:** I can manage timelines, check vendor status, and update couples without needing internet at remote venues

**Real Wedding Problem This Solves:**
A wedding coordinator at a countryside venue with poor WiFi can install WedSync as a PWA, access offline timeline views, check vendor arrival status, and sync changes when connection returns. This prevents 3+ hours of delays from communication gaps.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-171:**
- Configure service worker with Next.js integration
- Build PWA installation tracking APIs
- Implement offline caching strategies
- Create background sync for critical data
- Build PWA performance monitoring

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- PWA: Workbox, Service Worker API
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- Team A Frontend: Install button integration
- Team C Integration: Manifest configuration coordination  
- Team D Caching: Offline data management
- Database: pwa_installations, offline_usage tables

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
// 1. Ref MCP - Load latest PWA docs:
await mcp__Ref__ref_search_documentation({query: "workbox service-worker next-js latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next service-worker configuration latest documentation"});
await mcp__Ref__ref_search_documentation({query: "service worker background-sync latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW existing patterns:
await mcp__serena__find_symbol("serviceWorker", "", true);
await mcp__serena__get_symbols_overview("/public/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "PWA service worker development"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "service worker integration"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "PWA tracking APIs"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **performance-optimization-expert** --caching-strategies --offline-performance
7. **code-quality-guardian** --check-patterns --match-codebase-style

**⚠️ DATABASE MIGRATIONS:**
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-171.md

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Service Worker & APIs):
- [ ] Service worker configuration with Workbox
- [ ] PWA installation tracking API (/api/pwa/track-install)
- [ ] Offline usage analytics API (/api/pwa/usage)
- [ ] Background sync configuration for critical data
- [ ] Caching strategies for app shell and data
- [ ] Database migration for PWA tracking tables
- [ ] Unit tests with >80% coverage
- [ ] Service worker integration tests

**Objective:** Complete PWA backend infrastructure with robust offline support
**Scope In:** Service worker, caching, background sync, tracking APIs
**Scope Out:** Frontend install components, UI indicators, client-side hooks
**Affected Paths:** /public/sw.js, /src/app/api/pwa/, /wedsync/supabase/migrations/
**Dependencies:** Team A install components, Team C manifest configuration
**Acceptance Criteria:**
- Service worker installs and updates correctly
- Background sync queues and processes data
- Caching strategies optimize offline performance
- PWA tracking APIs capture usage metrics
- All security requirements met

**NFRs:** Service worker loads in <100ms, offline performance maintained
**Test Plan:** Service worker tests, API integration tests, offline scenarios
**Risk/Mitigation:** Service worker caching conflicts - implement versioning
**Handoff Notes:** Export caching interfaces for Team D coordination
**Overlap Guard:** Team B handles backend only, not frontend PWA components

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
- FROM Team A: Install event interfaces - Required for tracking integration
- FROM Team C: Manifest configuration - Needed for service worker setup

### What other teams NEED from you:
- TO Team A: PWA tracking API contracts - They need this for install analytics
- TO Team D: Caching strategy interfaces - Required for offline data coordination

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### SERVICE WORKER SECURITY

```typescript
// ✅ SECURE SERVICE WORKER CONFIGURATION:
// File: /public/sw.js

const CACHE_NAME = 'wedsync-v' + self.registration.scope.split('/').pop();
const ALLOWED_ORIGINS = [
  self.location.origin,
  'https://wedsync.com',
  'https://api.wedsync.com'
];

// Secure cache handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only cache same-origin requests
  if (!ALLOWED_ORIGINS.includes(url.origin)) {
    return;
  }
  
  // Never cache sensitive endpoints
  if (url.pathname.includes('/api/auth/') || 
      url.pathname.includes('/api/admin/')) {
    return;
  }
  
  event.respondWith(handleSecureFetch(event.request));
});

// Secure background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'secure-form-sync') {
    event.waitUntil(syncWithValidation());
  }
});
```

### PWA TRACKING API SECURITY

```typescript
// ✅ SECURE PWA TRACKING:
import { withSecureValidation } from '@/lib/validation/middleware';

export const POST = withSecureValidation(
  z.object({
    deviceInfo: z.object({
      userAgent: z.string().max(500),
      platform: z.string().max(50),
      standalone: z.boolean()
    }),
    installTime: z.string().datetime()
  }),
  async (request: NextRequest, validatedData) => {
    const userId = request.headers.get('x-user-id');
    
    // Sanitize device info (remove PII)
    const sanitizedInfo = sanitizeDeviceInfo(validatedData.deviceInfo);
    
    await supabase
      .from('pwa_installations')
      .insert({
        user_id: userId,
        device_type: sanitizedInfo.platform,
        browser: sanitizedInfo.browserFamily, // Parsed, not raw UA
        installed_at: validatedData.installTime
      });
    
    return NextResponse.json({ tracked: true });
  }
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// SERVICE WORKER AND PWA API TESTING

// 1. SERVICE WORKER REGISTRATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});

const swTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return {
        registered: !!registration,
        scope: registration.scope,
        state: registration.installing?.state || 'active'
      };
    }
    return { registered: false };
  }`
});

// 2. BACKGROUND SYNC TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Simulate offline form submission
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('secure-form-sync');
    return { syncRegistered: true };
  }`
});

// 3. CACHING STRATEGY VALIDATION
const cacheTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const cacheNames = await caches.keys();
    const cache = await caches.open(cacheNames[0]);
    const cachedRequests = await cache.keys();
    
    return {
      cacheExists: cacheNames.length > 0,
      cachedCount: cachedRequests.length,
      hasDashboard: cachedRequests.some(req => req.url.includes('/dashboard'))
    };
  }`
});

// 4. PWA TRACKING API TEST
const trackingTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/pwa/track-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          standalone: window.matchMedia('(display-mode: standalone)').matches
        },
        installTime: new Date().toISOString()
      })
    });
    
    return {
      status: response.status,
      tracked: response.ok
    };
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Service worker registers and activates correctly
- [ ] Background sync queues data when offline
- [ ] Caching strategies work for critical resources
- [ ] PWA tracking APIs capture install events
- [ ] Security validation prevents unauthorized access
- [ ] Service worker updates handle versioning


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

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Service worker configured with Workbox integration
- [ ] PWA tracking APIs complete and secure
- [ ] Background sync operational for critical data
- [ ] Caching strategies optimized for performance
- [ ] Database migrations created (NOT applied)
- [ ] Tests written FIRST and passing (>80% coverage)

### Integration & Performance:
- [ ] Service worker loads in <100ms
- [ ] Offline functionality works seamlessly
- [ ] Background sync processes data correctly
- [ ] APIs integrate with Team A components
- [ ] Security requirements fully implemented

### Evidence Package Required:
- [ ] Service worker registration test results
- [ ] Background sync functionality proof
- [ ] API testing with Playwright results
- [ ] Caching performance metrics
- [ ] Security validation screenshots

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Service Worker: `/wedsync/public/sw.js`
- APIs: `/wedsync/src/app/api/pwa/`
- Migrations: `/wedsync/supabase/migrations/[timestamp]_pwa_tracking_system.sql`
- Tests: `/wedsync/tests/pwa/`
- Config: `/wedsync/next.config.ts` (PWA plugin configuration)

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch21/WS-171-team-b-round-2-complete.md`
- **Migration Request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-171.md`

---

## ⚠️ CRITICAL WARNINGS
- Service worker must handle versioning correctly
- Never cache sensitive authentication endpoints
- Test offline/online transitions thoroughly
- Coordinate caching strategies with Team D
- Ensure PWA tracking respects user privacy

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY