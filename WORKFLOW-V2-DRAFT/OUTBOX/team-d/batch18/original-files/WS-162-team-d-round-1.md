# TEAM D - ROUND 1: WS-162 - Helper Schedules - Mobile & WedMe Integration

**Date:** 2025-08-25  
**Feature ID:** WS-162 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Optimize helper schedules for mobile devices and integrate with WedMe app  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding helper receiving task assignments
**I want to:** View my personalized wedding day schedule with all assigned tasks and timing
**So that:** I know exactly when and where to be for my responsibilities

**Real Wedding Problem This Solves:**
Currently, wedding helpers (bridesmaids, groomsmen, family) receive fragmented information via texts, emails, or verbal instructions. They often miss tasks or arrive late because they don't have a clear schedule. This feature creates a single source of truth for each helper's personalized timeline.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Mobile-friendly timeline view for wedding day access
- Offline capability for schedules
- Push notification support
- Quick access from WedMe home screen
- Gesture-based interactions

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- PWA: Service Workers, IndexedDB
- Mobile: Touch optimization, viewport handling
- Testing: Playwright MCP, Browser MCP, Vitest
- WedMe: Progressive Web App features

**Integration Points:**
- [WedMe App]: Add to home screen capability
- [Offline Storage]: IndexedDB for schedule caching
- [Push Notifications]: Web Push API
- [Service Worker]: Background sync

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

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
// Library ID resolution no longer needed with Ref MCP
  
await mcp__Ref__ref_search_documentation({query: "next pwa service-workers latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss touch-responsive latest documentation"});
await mcp__Ref__ref_search_documentation({query: "workbox offline-caching latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("WedMe", "", true);
await mcp__serena__find_symbol("offline", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Mobile-optimize helper schedules"
2. **touch-optimization** --think-hard --use-loaded-docs "Create touch-friendly UI"
3. **offline-functionality** --think-ultra-hard --follow-existing-patterns "Offline schedule access" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --mobile-viewports --touch-testing --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read WedMe app structure
- Understand PWA configuration
- Check offline storage patterns
- Review mobile optimization techniques
- Continue until you FULLY understand mobile requirements

### **PLAN PHASE (THINK HARD!)**
- Design mobile-first UI layouts
- Plan offline storage strategy
- Create touch interaction patterns
- Plan service worker caching
- Consider battery optimization

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Create mobile-optimized components
- Implement offline storage
- Set up service worker
- Add touch gestures

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests on mobile viewports
- Verify offline functionality
- Test touch interactions
- Validate PWA installation
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] MobileHelperSchedule component with touch optimization
- [ ] Offline storage implementation with IndexedDB
- [ ] Service worker for schedule caching
- [ ] PWA manifest updates for WedMe
- [ ] Touch gesture support (swipe, pinch)
- [ ] Unit tests with >80% coverage

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
- FROM Team A: Base schedule components to optimize
- FROM Team B: API response structure for caching
- FROM Team C: Push notification integration points

### What other teams NEED from you:
- TO Team A: Mobile-specific component variants
- TO Team C: Push notification registration
- TO Team E: Mobile test scenarios

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION

```typescript
// ✅ SECURE OFFLINE STORAGE:
import { encryptData, decryptData } from '@/lib/security/encryption';

class SecureOfflineStorage {
  async saveSchedule(helperId: string, schedule: HelperSchedule) {
    // Encrypt sensitive data before storing
    const encrypted = await encryptData(schedule);
    
    // Store in IndexedDB with expiration
    await idb.put('schedules', {
      id: helperId,
      data: encrypted,
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      version: schedule.version
    });
  }
  
  async getSchedule(helperId: string): Promise<HelperSchedule | null> {
    const stored = await idb.get('schedules', helperId);
    
    // Check expiration
    if (stored && stored.expires > Date.now()) {
      return await decryptData(stored.data);
    }
    
    // Clear expired data
    await idb.delete('schedules', helperId);
    return null;
  }
}
```

### SECURITY CHECKLIST
- [ ] **Offline Data Encryption**: Encrypt cached schedules
- [ ] **Storage Limits**: Enforce size limits on cached data
- [ ] **Expiration Policy**: Auto-clear old cached data
- [ ] **Device Security**: Require authentication for sensitive data
- [ ] **Network Security**: Validate data integrity after sync

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// MOBILE & OFFLINE TESTING
// Test on iPhone viewport
await mcp__playwright__browser_resize({width: 375, height: 812});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/helper-schedule"});

// Test touch interactions
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate touch swipe
    const element = document.querySelector('[data-testid="schedule-timeline"]');
    const touchStart = new TouchEvent('touchstart', {
      touches: [new Touch({identifier: 1, target: element, pageX: 200, pageY: 300})]
    });
    const touchEnd = new TouchEvent('touchend', {
      touches: [new Touch({identifier: 1, target: element, pageX: 50, pageY: 300})]
    });
    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchEnd);
  }`
});

// Test offline mode
await mcp__playwright__browser_evaluate({
  function: `() => navigator.serviceWorker.controller.postMessage({type: 'OFFLINE_MODE'})`
});

// Verify offline data access
const offlineData = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const db = await idb.open('schedule-cache');
    return await db.getAll('schedules');
  }`
});

// Test PWA installation
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.dispatchEvent(new Event('beforeinstallprompt'));
    return navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  }`
});
```


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
- [ ] Mobile UI working on all viewport sizes
- [ ] Offline access fully functional
- [ ] Touch gestures implemented
- [ ] PWA installable on devices
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Performance: <2s load time on 3G

### Evidence Package Required:
- [ ] Screenshots on mobile viewports
- [ ] Offline functionality demo
- [ ] PWA installation proof
- [ ] Touch interaction recordings

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Mobile: `/wedsync/src/components/schedules/mobile/MobileHelperSchedule.tsx`
- Offline: `/wedsync/src/lib/offline/scheduleStorage.ts`
- Worker: `/wedsync/public/sw-schedule.js`
- PWA: `/wedsync/public/manifest.json` (updates)
- Tests: `/wedsync/tests/mobile/schedule-mobile.test.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch18/WS-162-team-d-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT skip mobile viewport testing
- Do NOT ignore offline functionality
- Do NOT forget touch optimization
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL on same feature

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY