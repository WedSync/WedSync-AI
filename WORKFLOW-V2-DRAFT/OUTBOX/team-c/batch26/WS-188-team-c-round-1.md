# TEAM C - ROUND 1: WS-188 - Offline Functionality - Service Worker Integration

**Date:** 2025-08-26  
**Feature ID:** WS-188 (Track all work with this ID)  
**Priority:** P1 - Critical PWA integration  
**Mission:** Build service worker enhancements for offline functionality and background sync  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding professional's mobile device running WedSync as a PWA
**I want to:** Automatically cache critical wedding data in the background and sync changes when connectivity improves
**So that:** The wedding professional can work seamlessly regardless of network conditions, with transparent background synchronization

**Real Wedding Problem This Solves:**
A wedding planner's phone automatically caches tomorrow's wedding timeline before they leave for the venue. During setup at a remote location with no signal, they can access all vendor contact info, timeline details, and task lists. When they get signal back, all their notes and updates sync automatically without any user action required.

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Enhanced service worker with offline-first caching
- [ ] Background sync registration and handling
- [ ] PWA configuration updates for offline functionality
- [ ] IndexedDB integration with service worker
- [ ] Cache invalidation and update strategies
- [ ] Unit tests for service worker functionality
- [ ] PWA manifest updates



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

### Core Service Worker Features:
```javascript
// /wedsync/public/sw.js enhancements

// 1. Offline-first caching strategy
self.addEventListener('fetch', (event) => {
  if (isWeddingDataRequest(event.request)) {
    event.respondWith(cacheFirstWithUpdate(event.request));
  }
});

// 2. Background sync for offline changes  
self.addEventListener('sync', (event) => {
  if (event.tag === 'wedding-data-sync') {
    event.waitUntil(syncWeddingData());
  }
});

// 3. Critical data pre-caching
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_WEDDING_DAY') {
    event.waitUntil(cacheWeddingDayData(event.data.weddingId));
  }
});
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
- FROM Team A: UI component offline state requirements
- FROM Team B: Background sync API endpoints and data formats

### What other teams NEED from you:
- TO Team A: Service worker messaging APIs for offline status
- TO Team B: Background sync trigger specifications
- TO Team D: Cache optimization strategies

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Service Worker: `/wedsync/public/sw.js` (enhance existing)
- PWA Config: `/wedsync/next.config.ts` (update PWA settings)
- Worker Utils: `/wedsync/src/workers/background-sync.js`
- Tests: `/wedsync/src/__tests__/unit/workers/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch26/WS-188-team-c-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY