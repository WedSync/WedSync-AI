# TEAM B - ROUND 1: WS-162 - Helper Schedules - Backend API & Database

**Date:** 2025-08-25  
**Feature ID:** WS-162 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the backend API and database schema for helper schedule management  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

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
- Database schema for helper_schedule_notifications
- API endpoints for schedule retrieval and updates
- Schedule version tracking for changes
- Delivery method tracking (email/SMS)
- Schedule acceptance recording

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- API: Next.js Route Handlers with streaming support

**Integration Points:**
- [Wedding Tasks]: Join with wedding_tasks table
- [Task Assignments]: Join with task_assignments table
- [Wedding Helpers]: Reference wedding_helpers table
- [Notifications]: Trigger schedule updates

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
  
await mcp__Ref__ref_search_documentation({query: "supabase database functions rls latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions typescript latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next route-handlers streaming latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("api", "", true);
await mcp__serena__get_symbols_overview("/src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Build helper schedule backend"
2. **supabase-specialist** --think-hard --use-loaded-docs "Create database schema and RLS"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "API routes" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **postgresql-database-expert** --optimization-focus --complex-queries
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing API route patterns
- Understand task assignment schema
- Check helper management tables
- Review notification patterns
- Continue until you FULLY understand the database

### **PLAN PHASE (THINK HARD!)**
- Design database schema with proper indexes
- Plan API route structure
- Create migration file
- Plan RLS policies for security
- Consider query optimization

### **CODE PHASE (PARALLEL AGENTS!)**
- Write migration SQL first
- Create API route handlers
- Implement schedule generation logic
- Add database functions for complex queries
- Focus on performance optimization

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify database migrations
- Test API endpoints with Postman/curl
- Generate performance metrics
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database migration for helper_schedule_notifications table
- [ ] GET /api/schedules/[helperId] endpoint
- [ ] POST /api/schedules/[helperId]/accept endpoint
- [ ] Database functions for schedule generation
- [ ] RLS policies for helper data access
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
- FROM Team A: Component interface requirements for data structure
- FROM Team C: Notification system integration points

### What other teams NEED from you:
- TO Team A: API endpoints and data contracts
- TO Team C: Database schema for notification tracking
- TO Team D: Mobile-optimized API responses

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES**

```typescript
// ❌ NEVER DO THIS:
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('table').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS:
import { withSecureValidation } from '@/lib/validation/middleware';
import { helperScheduleSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  helperScheduleSchema, // Zod schema validation
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    // Your implementation here
  }
);
```

### SECURITY CHECKLIST
- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas
- [ ] **RLS Policies**: Helper can only see their own schedules
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **Rate Limiting**: Already implemented in middleware

⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-162.md

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// API ENDPOINT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/schedules/test-helper-id"});
const apiResponse = await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/schedules/test-helper-id').then(r => r.json())`
});

// Verify response structure
expect(apiResponse).toHaveProperty('assignments');
expect(apiResponse.assignments).toBeArray();

// Test schedule acceptance
const acceptResponse = await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/schedules/test-helper-id/accept', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({accepted: true})
  }).then(r => r.json())`
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
- [ ] Database migration complete and valid
- [ ] API endpoints working with proper validation
- [ ] RLS policies enforcing data access
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript errors
- [ ] Zero SQL injection vulnerabilities

### Evidence Package Required:
- [ ] Migration file created
- [ ] API response examples
- [ ] Database query performance metrics
- [ ] Security validation passed

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Migration: `/wedsync/supabase/migrations/[timestamp]_helper_schedules.sql`
- API Routes: `/wedsync/src/app/api/schedules/[helperId]/route.ts`
- Validation: `/wedsync/src/lib/validation/schedules.ts`
- Service: `/wedsync/src/lib/services/scheduleService.ts`
- Tests: `/wedsync/tests/api/schedules.test.ts`

### Migration Request:
- Create: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-162.md`
- Include: migration file path, dependencies, testing status

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch18/WS-162-team-b-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT apply migrations directly - send to SQL Expert
- Do NOT create API routes without validation middleware
- Do NOT skip RLS policies
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL on same feature

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY