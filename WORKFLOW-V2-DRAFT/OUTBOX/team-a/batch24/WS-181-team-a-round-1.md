# TEAM A — BATCH 24 — ROUND 1 — WS-181 — Cohort Analysis Dashboard

**Date:** 2025-01-26  
**Feature ID:** WS-181 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive cohort analysis dashboard for supplier retention tracking  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync administrator managing supplier growth and retention
**I want to:** Track supplier cohort performance by signup month showing retention, revenue, and expansion patterns
**So that:** I can identify successful onboarding periods, predict churn, and optimize supplier acquisition strategies to improve business sustainability

**Real Wedding Problem This Solves:**
WedSync admins need to understand which monthly cohorts of wedding suppliers (photographers, venues, florists) have the highest lifetime value and retention rates. Currently, they can't identify whether the 50 photographers who joined in January 2024 are more valuable than those who joined in June 2024, making it impossible to optimize marketing spend or predict future revenue from supplier subscriptions.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Cohort heatmap visualization with color-coded performance
- Metric selector for retention, revenue, LTV analysis  
- Time range controls for different analysis periods
- Automated insights generation for business decisions

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Visualization: Chart.js or D3.js for cohort heatmaps

**Integration Points:**
- Team B Analytics Engine: Receives cohort calculation data via API
- Team C Data Pipeline: Consumes processed cohort metrics
- Team E Performance Optimization: Provides performance requirements


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

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next app-router components latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database client latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss dashboard layouts latest documentation"});

// 3. For data visualization:
await mcp__Ref__ref_search_documentation({query: "chart heatmap charts latest documentation"});

// 4. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 5. REVIEW existing admin dashboard patterns:
await mcp__serena__find_symbol("AdminDashboard", "", true);
await mcp__serena__get_symbols_overview("/src/components/admin");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --dashboard-focus --admin-ui-patterns
2. **react-ui-specialist** --data-visualization --heatmap-components
3. **nextjs-fullstack-developer** --admin-routes --dashboard-layouts
4. **security-compliance-officer** --admin-only-access --data-protection
5. **test-automation-architect** --dashboard-testing --visual-validation
6. **playwright-visual-testing-specialist** --admin-workflows --multi-chart-testing --use-browser-mcp
7. **code-quality-guardian** --component-patterns --dashboard-standards

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow existing admin dashboard patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing admin dashboard components
- Understand cohort analysis requirements from WS-181 spec
- Review data visualization patterns in codebase
- Check admin authentication and access controls

### **PLAN PHASE (THINK HARD!)**
- Design cohort heatmap component architecture
- Plan state management for time ranges and metrics
- Design responsive dashboard layout for different screen sizes
- Create component hierarchy for reusability

### **CODE PHASE (PARALLEL AGENTS!)**
- Build CohortAnalysis main dashboard component
- Create CohortHeatmap visualization component
- Implement MetricSelector and TimeRangeControls
- Add automated insights display component

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Test with mock cohort data
- Verify responsive design on all breakpoints
- Run admin access control tests
- Generate evidence package

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Dashboard Implementation):
- [ ] CohortAnalysis main dashboard component
- [ ] CohortHeatmap with color-coded performance visualization
- [ ] MetricSelector (retention/revenue/LTV switching)
- [ ] TimeRangeControls for analysis periods
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright admin workflow tests

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
- FROM Team B: Cohort calculation API endpoints - Required for data display
- FROM Team E: Performance requirements - For optimization targets

### What other teams NEED from you:
- TO Team B: UI requirements and data format specifications
- TO Team C: Dashboard integration requirements

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL ADMIN ROUTES

```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { adminOnlySchema } from '@/lib/validation/schemas';

// Admin dashboard routes MUST verify admin role
export const GET = withSecureValidation(
  adminOnlySchema,
  async (request: NextRequest, validatedData) => {
    // Verify admin role before showing cohort data
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Dashboard implementation
  }
);
```

---

## 🎭 PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// Admin dashboard accessibility testing
test('Cohort analysis dashboard accessibility', async () => {
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/cohorts"});
  const accessibilityStructure = await mcp__playwright__browser_snapshot();
  
  // Test cohort heatmap interactions
  await mcp__playwright__browser_click({
    element: "Time range selector",
    ref: "[data-testid='time-range-90d']"
  });
  
  // Verify heatmap updates
  await mcp__playwright__browser_wait_for({text: "90 days"});
  
  // Performance measurement
  const metrics = await mcp__playwright__browser_evaluate({
    function: `() => ({
      LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      dashboard_load: Date.now() - window.dashboardStartTime
    })`
  });
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Cohort heatmap renders with proper color coding
- [ ] Metric switching works smoothly (retention/revenue/LTV)
- [ ] Time range controls update data correctly
- [ ] Admin authentication enforced on all routes
- [ ] Zero TypeScript errors

### Performance & Accessibility:
- [ ] Dashboard loads in <2 seconds
- [ ] Responsive design works on 375px, 768px, 1920px
- [ ] Screen reader compatible
- [ ] All interactive elements keyboard accessible

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/admin/CohortAnalysis.tsx`
- Additional: `/wedsync/src/components/admin/CohortHeatmap.tsx`
- Types: `/wedsync/src/types/cohort-analysis.ts`
- Tests: `/wedsync/tests/admin/cohort-analysis.test.tsx`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch24/WS-181-team-a-round-1-complete.md`

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY