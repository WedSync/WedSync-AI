# TEAM B - ROUND 1: WS-165 - Payment Calendar - Backend API & Database Implementation

**Date:** 2025-08-25  
**Feature ID:** WS-165 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the payment calendar backend APIs, database migrations, and business logic
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**Real Wedding Problem This Solves:**
Couples currently track wedding payments in spreadsheets and phone notes, missing critical deadlines like venue final payments or photographer deposits. This backend system provides the data infrastructure and business logic to automatically track payment schedules, send reminders, and maintain payment status across all wedding services.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Database schema for payment_schedule and payment_reminders tables
- API endpoints for payment CRUD operations
- Payment status tracking logic (upcoming/due/overdue/paid)
- Integration with budget categories
- Automatic reminder system infrastructure

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Database Migration System: Supabase migrations

**Integration Points:**
- Budget Categories System: payment_schedule links to budget_categories table
- User Authentication: payments scoped to authenticated couples
- Database: Create payment_schedule, payment_reminders tables and indexes

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
  
await mcp__Ref__ref_search_documentation({query: "next api-routes server-actions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database functions rls latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions typescript latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("POST", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Payment calendar backend development"
2. **supabase-specialist** --think-hard --use-loaded-docs "Database schema and RLS expertise"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "API routes and server actions" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **postgresql-database-expert** --database-design --migration-best-practices
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing API route patterns in /src/app/api/
- Understand existing authentication middleware
- Check database migration patterns
- Review similar payment/budget implementations
- Continue until you FULLY understand the codebase patterns

### **PLAN PHASE (THINK HARD!)**
- Create detailed database migration plan
- Write API test cases FIRST (TDD)
- Plan error handling for payment operations
- Consider data validation and sanitization
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing API route patterns
- Use Ref MCP Supabase examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database migration creating payment_schedule table
- [ ] Database migration creating payment_reminders table
- [ ] API endpoint: GET /api/payments/[coupleId] (list payments)
- [ ] API endpoint: POST /api/payments (create payment)
- [ ] API endpoint: PATCH /api/payments/[id] (mark as paid)
- [ ] Row Level Security policies for payment tables
- [ ] Unit tests with >80% coverage
- [ ] Basic API integration tests

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
- FROM Team C: Budget category integration patterns - Required for payment categorization
- FROM Team A: Component interface requirements - Needed for API response structure

### What other teams NEED from you:
- TO Team A: Payment API endpoints - Blocking their frontend implementation
- TO Team D: Payment data schema - They need this for WedMe mobile API integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { paymentSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  paymentSchema.extend({
    couple_id: z.string().uuid(),
    amount: z.number().positive(),
    due_date: z.string().datetime()
  }),
  async (request: NextRequest, validatedData) => {
    // Verify user can access this couple's data
    const session = await getSession(request);
    if (validatedData.couple_id !== session.user.couple_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Safe database operations with validated data
    const { data, error } = await supabase
      .from('payment_schedule')
      .insert(validatedData);
    
    if (error) {
      console.error('Payment creation failed:', error);
      return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  }
);
```

### SECURITY CHECKLIST FOR EVERY API ROUTE:
- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **Authorization**: Verify user can access specific couple's payment data
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **Rate Limiting**: Already implemented in middleware - DO NOT bypass
- [ ] **Error Handling**: NEVER expose stack traces or sensitive errors to users

---

## 🗄️ DATABASE MIGRATION PROTOCOL

**⚠️ DATABASE MIGRATION PROTOCOL:**
1. CREATE migration files but DO NOT APPLY them
2. Migration files go to: /wedsync/supabase/migrations/[timestamp]_payment_calendar_system.sql
3. MUST send migration request to SQL Expert inbox
4. SQL Expert handles ALL migration application and conflict resolution

**Add to migration request:**
```markdown
⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-165.md
- SQL Expert will handle application and conflict resolution
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. API ENDPOINT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});

// Test payment creation API
const paymentData = {
  couple_id: 'test-couple-id',
  payment_title: 'Venue Final Payment',
  amount: 5000.00,
  due_date: '2025-12-01'
};

await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(${JSON.stringify(paymentData)})
    });
    return { status: response.status, ok: response.ok };
  }`
});

// Test payment listing API
await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/payments/test-couple-id');
    const data = await response.json();
    return { status: response.status, count: data.length };
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
- [ ] All database migrations created (payment_schedule, payment_reminders)
- [ ] All API endpoints working (GET, POST, PATCH for payments)
- [ ] Row Level Security policies protecting payment data
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] API integration tests validating all endpoints
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] APIs respond within performance targets (<200ms)
- [ ] Database queries optimized with proper indexes
- [ ] Security validation working on all endpoints
- [ ] Error handling provides meaningful user feedback

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/app/api/payments/route.ts`
- Backend: `/wedsync/src/app/api/payments/[id]/route.ts`
- Backend: `/wedsync/src/app/api/payments/[coupleId]/route.ts`
- Tests: `/wedsync/tests/api/payments.test.ts`
- Types: `/wedsync/src/types/payments.ts`
- Migrations: `/wedsync/supabase/migrations/[timestamp]_payment_calendar_system.sql`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch19/WS-165-team-b-round-1-complete.md`

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