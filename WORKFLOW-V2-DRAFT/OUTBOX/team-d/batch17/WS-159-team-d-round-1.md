# TEAM D - ROUND 1: WS-159 - Task Tracking - WedMe Mobile Integration

**Date:** 2025-01-25  
**Feature ID:** WS-159 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build mobile-optimized task tracking interface for WedMe couple platform  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple monitoring task completion on mobile devices
**I want to:** Track task progress with status updates and completion confirmations from helpers through WedMe app
**So that:** I can ensure all wedding preparations are on track while on-the-go, receiving instant notifications

**Real Wedding Problem This Solves:**
Wedding couples are often away from their computers during the busy planning period, but need to monitor whether their assigned helpers (bridesmaids, family, friends) have completed their tasks like "Order flowers," "Book transportation," or "Confirm guest count." This mobile-optimized interface ensures couples can track progress from anywhere, with touch-friendly controls and push notifications for status changes.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build mobile-first task tracking dashboard for WedMe
- Touch-optimized status update interfaces
- Push notification integration for mobile
- Offline-first task status caching
- Photo evidence capture and upload from mobile
- Mobile-specific progress visualization

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Mobile: PWA optimization, touch gestures
- Offline: Service Worker for offline functionality
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- WS-156 Task Creation: Uses existing task structure for WedMe
- WS-157 Helper Assignment: Uses helper assignments in mobile context
- Team A: Desktop UI patterns adapted for mobile
- Team B: Status update APIs optimized for mobile
- Team C: Push notification delivery for mobile
- Database: task_assignments, wedding_tasks, wedding_helpers tables

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
// 1. LOAD CORRECT UI STYLE GUIDE (WedMe mobile-specific):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next pwa service-workers latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss mobile-first responsive touch latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase realtime mobile offline latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing WedMe patterns:
await mcp__serena__find_symbol("WedMeLayout", "", true);
await mcp__serena__get_symbols_overview("/src/app/wedme/");
await mcp__serena__find_symbol("TouchOptimized", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Mobile task tracking coordination"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Mobile-first UI components and touch interactions"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "PWA and mobile optimization"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-device-testing --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant WedMe mobile files first
- Understand existing mobile-first patterns
- Check PWA configuration and touch optimization
- Review similar mobile task interfaces
- Continue until you FULLY understand the WedMe mobile architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed mobile-first UI plan for task tracking
- Write test cases FIRST (TDD) including touch interactions
- Plan offline-first data synchronization
- Consider mobile performance patterns
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation including mobile-specific tests
- Build mobile TaskTrackingDashboard for WedMe
- Create touch-optimized TaskStatusCard components
- Implement swipe gestures for status updates
- Build mobile photo capture and upload
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including mobile device testing
- Verify PWA functionality
- Test touch interactions on multiple screen sizes
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Mobile-First Task Tracking):
- [ ] WedMe TaskTrackingMobileDashboard component
- [ ] Touch-optimized TaskStatusCard with swipe gestures
- [ ] Mobile StatusUpdateModal with large touch targets
- [ ] Photo capture interface for mobile evidence upload
- [ ] Offline-first status sync with service worker
- [ ] Push notification handling for mobile
- [ ] Unit tests with >80% coverage
- [ ] Mobile device testing with Playwright

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Desktop UI component specifications - Required for mobile adaptation
- FROM Team B: Mobile-optimized API contracts - Dependency for offline functionality
- FROM Team C: Push notification payload formats - Required for mobile notifications

### What other teams NEED from you:
- TO Team A: Mobile interaction patterns - They need this for responsive design
- TO Team E: Mobile UI components - Blocking their testing implementation
- TO ALL: Mobile accessibility standards - Required for compliance

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY MOBILE SECURITY IMPLEMENTATION

**Mobile-specific security considerations:**

```typescript
// ✅ MOBILE SECURITY PATTERN:
import { validateMobileSession } from '@/lib/security/mobile-validation';
import { secureOfflineStorage } from '@/lib/security/offline-security';

// Secure offline storage for mobile
const secureStorage = {
  setItem: (key: string, value: string) => {
    const encrypted = secureOfflineStorage.encrypt(value);
    localStorage.setItem(key, encrypted);
  },
  getItem: (key: string) => {
    const encrypted = localStorage.getItem(key);
    return encrypted ? secureOfflineStorage.decrypt(encrypted) : null;
  }
};

// Mobile session validation
export async function validateMobileTaskAccess(taskId: string) {
  const session = await validateMobileSession();
  if (!session.user) {
    throw new Error('Mobile authentication required');
  }
  
  // Verify mobile user can access this task
  const hasAccess = await verifyMobileTaskPermission(taskId, session.user.id);
  if (!hasAccess) {
    throw new Error('Mobile access denied');
  }
}
```

### MOBILE SECURITY CHECKLIST

- [ ] **Mobile Session Security**: Implement secure mobile session handling
- [ ] **Offline Data Encryption**: Encrypt all locally stored task data
- [ ] **Touch Security**: Implement touch-based authentication patterns
- [ ] **Photo Upload Security**: Validate and sanitize mobile photo uploads
- [ ] **Network Security**: Handle poor mobile network conditions securely
- [ ] **App Store Compliance**: Ensure mobile security meets app store requirements

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 MOBILE-FIRST TESTING WITH DEVICE EMULATION:**

```javascript
// MOBILE DEVICE TESTING APPROACH

// 1. MULTI-DEVICE TESTING
const devices = [
  {name: 'iPhone 13', width: 390, height: 844},
  {name: 'Samsung Galaxy S21', width: 384, height: 854},
  {name: 'iPad Air', width: 820, height: 1180}
];

for (const device of devices) {
  await mcp__playwright__browser_resize({width: device.width, height: device.height});
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tasks/tracking"});
  
  // Test touch interactions
  await mcp__playwright__browser_click({element: "Task Status Card", ref: "[data-testid=mobile-task-card]"});
  await mcp__playwright__browser_drag({
    startElement: "Task Card", startRef: "[data-testid=task-card]",
    endElement: "Complete Zone", endRef: "[data-testid=complete-zone]"
  });
  
  // Take device-specific screenshots
  await mcp__playwright__browser_take_screenshot({filename: `${device.name.replace(' ', '-')}-task-tracking.png`});
}

// 2. OFFLINE FUNCTIONALITY TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate offline condition
    navigator.serviceWorker.ready.then(registration => {
      // Test offline task status updates
      return fetch('/api/tasks/test-uuid/status', {
        method: 'POST',
        body: JSON.stringify({status: 'completed', offline: true})
      });
    });
  }`
});

// 3. TOUCH GESTURE TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{clientX: 100, clientY: 200}]
    });
    document.querySelector('[data-testid=swipe-card]').dispatchEvent(touchEvent);
  }`
});
```

**REQUIRED MOBILE TEST COVERAGE:**
- [ ] Multiple device sizes (phone, tablet)
- [ ] Touch interactions (tap, swipe, drag)
- [ ] Offline functionality working
- [ ] PWA installation and features
- [ ] Photo capture and upload from mobile
- [ ] Push notifications on mobile devices


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

**You CANNOT claim completion unless:**

### Mobile Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Mobile device testing completed on 3+ screen sizes
- [ ] Touch interactions working correctly
- [ ] Zero TypeScript errors

### Mobile Performance & UX:
- [ ] Mobile page load <2s on 3G network
- [ ] Touch targets minimum 44px (accessibility)
- [ ] PWA functionality verified
- [ ] Offline sync working
- [ ] Push notifications delivering

### Evidence Package Required:
- [ ] Multi-device screenshot proof
- [ ] Touch interaction test results
- [ ] Offline functionality demonstration
- [ ] PWA installation proof
- [ ] Mobile performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- WedMe Mobile: `/wedsync/src/app/wedme/tasks/`
- Mobile Components: `/wedsync/src/components/wedme/mobile/`
- PWA Config: `/wedsync/public/`
- Tests: `/wedsync/tests/wedme/mobile/`
- Types: `/wedsync/src/types/mobile-tasks.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch17/WS-159-team-d-round-1-complete.md`
- **Include:** Feature ID (WS-159) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-159 | ROUND_1_COMPLETE | team-d | batch17" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip mobile device testing
- Do NOT ignore touch accessibility requirements
- Do NOT claim completion without device testing evidence
- REMEMBER: All 5 teams work in PARALLEL - coordinate through dependencies

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Mobile tests written and passing
- [ ] Multi-device testing completed
- [ ] Touch interactions verified
- [ ] PWA functionality working
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY