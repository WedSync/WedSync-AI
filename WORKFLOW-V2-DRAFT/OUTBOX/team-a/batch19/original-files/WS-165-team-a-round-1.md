# TEAM A - ROUND 1: WS-165 - Payment Calendar - Frontend React Components

**Date:** 2025-08-25  
**Feature ID:** WS-165 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the core payment calendar React component with visual calendar and payment list view
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**Real Wedding Problem This Solves:**
Couples currently track wedding payments in spreadsheets and phone notes, missing critical deadlines like venue final payments or photographer deposits. This feature creates a visual payment calendar that automatically reminds couples of upcoming deadlines and helps them plan their wedding budget cash flow throughout the planning period.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Visual calendar showing payment due dates
- Payment status tracking (upcoming/due/overdue/paid)
- Integration with budget categories for cash flow planning
- Mark payments as paid functionality
- Responsive calendar interface

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Calendar Library: React Big Calendar or shadcn/ui Calendar

**Integration Points:**
- Budget Categories System: Calendar must show payments by budget category
- Payment Schedule API: Connect to backend payment tracking
- Database: payment_schedule, payment_reminders tables

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
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
  // Get correct library ID first
await mcp__Ref__ref_search_documentation({query: "next app-router components latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database client latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss calendar-styles responsive latest documentation"});

// For calendar components:
await mcp__Ref__ref_search_documentation({query: "ui calendar components latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Calendar", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Payment calendar frontend development"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Calendar component expertise"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "React 19 components" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing calendar components in the codebase
- Understand existing budget/payment patterns
- Check integration points with payment APIs
- Review similar date picker implementations
- Continue until you FULLY understand the codebase patterns

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for payment calendar
- Write test cases FIRST (TDD)
- Plan error handling for payment data
- Consider responsive breakpoints
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing component patterns
- Use Ref MCP calendar examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] PaymentCalendar React component with calendar grid view
- [ ] PaymentList component showing upcoming payments
- [ ] PaymentItem component for individual payment display
- [ ] Integration with payment_schedule database table
- [ ] Basic mark-as-paid functionality
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for calendar interaction

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
- FROM Team B: Payment schedule API endpoints - Required for fetching payment data
- FROM Team C: Budget category integration - Dependency for payment categorization

### What other teams NEED from you:
- TO Team D: PaymentCalendar component export - They need this for WedMe mobile view
- TO Team E: Component interface definitions - Blocking their testing framework

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API CALLS

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { paymentSchema } from '@/lib/validation/schemas';

// For payment data fetching
const fetchPayments = async (coupleId: string) => {
  const response = await fetch(`/api/payments/${coupleId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': await getCsrfToken(),
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }
  
  return await response.json();
};
```

### SECURITY CHECKLIST FOR EVERY API CALL:
- [ ] **Authentication Check**: Verify user session
- [ ] **Input Validation**: Validate all payment IDs and amounts
- [ ] **CSRF Protection**: Include CSRF tokens in state-changing operations
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **XSS Prevention**: Sanitize payment descriptions and notes

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. ACCESSIBILITY SNAPSHOT ANALYSIS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/payments/calendar"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. CALENDAR INTERACTION TESTING
await mcp__playwright__browser_click({
  element: "Next month button",
  ref: "[data-testid='calendar-next-month']"
});

await mcp__playwright__browser_wait_for({text: "February 2025"});

// 3. PAYMENT MARKING WORKFLOW
await mcp__playwright__browser_click({
  element: "Mark as paid button",
  ref: "[data-payment-id='test-payment-1']"
});

await mcp__playwright__browser_wait_for({text: "Payment marked as paid"});

// 4. RESPONSIVE VALIDATION
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `payment-calendar-${width}px.png`});
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
- [ ] Payment calendar displays correctly with all upcoming payments
- [ ] Calendar navigation works (month/year switching)
- [ ] Mark-as-paid functionality updates UI immediately
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating calendar interactions
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Calendar loads payment data from API successfully
- [ ] Performance targets met (<1s calendar load, <200ms interactions)
- [ ] Accessibility validation passed (keyboard navigation)
- [ ] Works on all breakpoints (375px, 768px, 1920px)

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/payments/PaymentCalendar.tsx`
- Frontend: `/wedsync/src/components/payments/PaymentList.tsx`
- Frontend: `/wedsync/src/components/payments/PaymentItem.tsx`
- Tests: `/wedsync/tests/components/payment-calendar.test.ts`
- Types: `/wedsync/src/types/payments.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch19/WS-165-team-a-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY