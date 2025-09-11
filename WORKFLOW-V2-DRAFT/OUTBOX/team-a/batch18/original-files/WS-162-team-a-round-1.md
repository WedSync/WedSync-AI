# TEAM A - ROUND 1: WS-162 - Helper Schedules - Frontend Components & UI

**Date:** 2025-08-25  
**Feature ID:** WS-162 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the helper schedule interface components for viewing and managing wedding day task assignments  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

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
- Personalized helper schedules with assigned tasks only
- Mobile-friendly timeline view for wedding day access
- Email/SMS schedule delivery with updates
- Helper confirmation system for schedule acceptance
- Integration with master timeline changes

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- UI Components: Responsive mobile-first design

**Integration Points:**
- [Master Timeline]: Pulls tasks from wedding_tasks table
- [Helper Assignment]: Links to task_assignments table
- [Notification System]: Triggers schedule updates
- [Database]: helper_schedule_notifications table

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
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For General SaaS components (THIS FEATURE):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
  
await mcp__Ref__ref_search_documentation({query: "next app-router server-components latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase realtime subscriptions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss mobile-responsive timeline latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Timeline", "", true);
await mcp__serena__get_symbols_overview("/src/components/timeline");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Build helper schedule UI components"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create mobile-first timeline views"
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Helper task management" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant timeline components first
- Understand existing helper management patterns
- Check wedding_helpers and task_assignments tables
- Review similar schedule implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Design component hierarchy for helper schedules
- Plan responsive mobile layout
- Create test cases FIRST (TDD)
- Plan state management for schedule updates
- Consider offline access needs

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Create HelperSchedule component
- Build timeline view components
- Implement schedule acceptance UI
- Focus on mobile responsiveness

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright on mobile viewports
- Create evidence package with screenshots
- Generate accessibility reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] HelperSchedule main component with timeline view
- [ ] ScheduleEvent component for individual tasks
- [ ] ScheduleAcceptance component for confirmation
- [ ] MobileScheduleView optimized for phones
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for mobile UI

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
- FROM Team B: Database schema and API endpoints for helper schedules
- FROM Team D: Mobile optimization patterns for WedMe integration

### What other teams NEED from you:
- TO Team B: Component interfaces for schedule data
- TO Team C: UI components ready for notification integration
- TO Team E: Testable components with proper data-testid attributes

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION

**EVERY component MUST validate props:**

```typescript
// ✅ ALWAYS DO THIS:
import { z } from 'zod';

const HelperScheduleProps = z.object({
  helperId: z.string().uuid(),
  assignments: z.array(taskAssignmentSchema),
  readOnly: z.boolean().optional()
});

export function HelperSchedule(props: z.infer<typeof HelperScheduleProps>) {
  const validated = HelperScheduleProps.parse(props);
  // Component implementation
}
```

### SECURITY CHECKLIST
- [ ] **Input Validation**: Zod schemas for all props
- [ ] **XSS Prevention**: Sanitize all user-generated content
- [ ] **Data Scoping**: Only show helper's own assignments
- [ ] **Authentication**: Verify helper identity before showing schedule
- [ ] **Rate Limiting**: Prevent rapid schedule refresh attempts

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// ACCESSIBILITY-FIRST MOBILE TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/helper-schedule"});

// Test mobile viewport
await mcp__playwright__browser_resize({width: 375, height: 667});
const mobileSnapshot = await mcp__playwright__browser_snapshot();

// Test timeline interaction
await mcp__playwright__browser_click({
  element: "First schedule event",
  ref: "[data-testid='schedule-event-0']"
});

// Verify schedule acceptance flow
await mcp__playwright__browser_click({
  element: "Accept schedule button",
  ref: "[data-testid='accept-schedule']"
});

await mcp__playwright__browser_wait_for({text: "Schedule accepted"});

// Test responsive at all breakpoints
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_take_screenshot({
    filename: `helper-schedule-${width}px.png`
  });
}
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
- [ ] HelperSchedule component complete with timeline view
- [ ] Mobile-first responsive design working
- [ ] Schedule acceptance flow implemented
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Evidence Package Required:
- [ ] Screenshots of mobile schedule view
- [ ] Playwright test results for all viewports
- [ ] Performance metrics (<1s load time)
- [ ] Accessibility validation passed

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/schedules/HelperSchedule.tsx`
- Components: `/wedsync/src/components/schedules/ScheduleEvent.tsx`
- Mobile: `/wedsync/src/components/schedules/MobileScheduleView.tsx`
- Tests: `/wedsync/tests/schedules/helper-schedule.test.tsx`
- Types: `/wedsync/src/types/schedules.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch18/WS-162-team-a-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams
- Do NOT skip tests - write them FIRST
- Do NOT ignore mobile responsiveness
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL on same feature

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY