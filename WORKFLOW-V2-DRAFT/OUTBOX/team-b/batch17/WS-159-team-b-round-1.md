# TEAM B - ROUND 1: WS-159 - Task Tracking - Backend API & Business Logic

**Date:** 2025-01-25  
**Feature ID:** WS-159 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build robust task status tracking APIs and business logic for wedding couples to monitor helper progress  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple monitoring task completion
**I want to:** Track task progress with status updates and completion confirmations from helpers
**So that:** I can ensure all wedding preparations are on track and identify bottlenecks early

**Real Wedding Problem This Solves:**
Wedding couples currently struggle to track whether their assigned helpers (bridesmaids, family, friends) have completed their tasks like "Order flowers," "Book transportation," or "Confirm guest count." This leads to last-minute panic when couples discover critical tasks weren't completed. This system provides real-time visibility into task progress with status updates and photo evidence of completion.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build task status update API endpoints with validation
- Implement status history tracking system  
- Progress percentage calculation logic
- Photo evidence storage and validation
- Automated notification triggers for status changes
- Completion rate analytics

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Real-time: Supabase Realtime for status updates

**Integration Points:**
- WS-156 Task Creation: Extends existing task structure
- WS-157 Helper Assignment: Uses helper assignments data
- Database: task_assignments, wedding_tasks, wedding_helpers tables
- Authentication: Current user auth system

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
await mcp__Ref__ref_search_documentation({query: "next route-handlers api-routes server-actions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database functions rls realtime latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions typescript latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("POST", "/src/app/api/", true);
await mcp__serena__get_symbols_overview("/src/app/api/tasks/");
await mcp__serena__find_symbol("taskService", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Task tracking API coordination"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "API routes and server actions expertise"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Database operations and realtime"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --check-patterns --match-codebase-style
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant task API files first
- Understand existing task assignment database patterns
- Check helper management integration points
- Review similar API implementations
- Continue until you FULLY understand the backend system

### **PLAN PHASE (THINK HARD!)**
- Create detailed API architecture for task status tracking
- Write test cases FIRST (TDD)
- Plan database schema extensions
- Consider real-time update patterns
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Build task status update API routes
- Create status history tracking service
- Implement progress calculation logic
- Build photo evidence upload API
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Create database migrations
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core API & Business Logic):
- [ ] `/api/tasks/[id]/status` - Update task status API
- [ ] `/api/tasks/[id]/progress` - Progress tracking API
- [ ] Status history tracking service
- [ ] Progress percentage calculation logic
- [ ] Photo evidence storage API
- [ ] Database migration for task_status_history table
- [ ] Unit tests with >80% coverage
- [ ] API integration tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI component interfaces - Required for API contract design
- FROM Team C: Notification specifications - Dependency for status change triggers

### What other teams NEED from you:
- TO Team A: API endpoint contracts - They need this for frontend integration
- TO Team C: Status change events - Blocking their notification system
- TO Team D: API documentation - Required for WedMe integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

**EVERY API route MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('task_assignments').update(body); // DIRECT UPDATE!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { taskStatusSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  taskStatusSchema.extend({
    assignment_id: z.string().uuid(),
    new_status: z.enum(['pending', 'accepted', 'in_progress', 'completed', 'blocked']),
    progress_percentage: z.number().min(0).max(100),
    notes: z.string().optional(),
    completion_photos: z.array(z.string().url()).optional()
  }),
  async (request: NextRequest, validatedData) => {
    // Verify user owns this task assignment
    const userId = request.headers.get('x-user-id');
    const assignment = await verifyTaskAssignmentOwnership(validatedData.assignment_id, userId);
    
    // validatedData is now safe and typed
    await updateTaskStatus(validatedData);
  }
);
```

### SECURITY CHECKLIST FOR EVERY API ROUTE

Teams MUST implement ALL of these:

- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **Rate Limiting**: Already implemented in middleware - DO NOT bypass
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **XSS Prevention**: Sanitize ALL user input - see `/src/lib/security/input-validation.ts`
- [ ] **Authorization**: Verify user can access/modify requested resources
- [ ] **File Upload Security**: Use `/src/lib/validation/middleware.ts` withFileValidation

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files but DO NOT APPLY them
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-159.md`
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 API TESTING WITH REAL REQUEST VALIDATION:**

```javascript
// API TESTING APPROACH - Comprehensive Validation!

// 1. API ENDPOINT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/tasks/test-id/status"});
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/tasks/test-uuid/status', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      assignment_id: 'test-uuid',
      new_status: 'in_progress',
      progress_percentage: 50,
      notes: 'Making good progress'
    })
  }).then(r => r.json())`
});

// 2. SECURITY VALIDATION TESTING
const securityTests = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test without auth token
    return fetch('/api/tasks/test-uuid/status', {
      method: 'POST',
      body: JSON.stringify({invalid: 'data'})
    }).then(r => ({status: r.status, auth_required: r.status === 401}));
  }`
});

// 3. ERROR HANDLING VALIDATION
const errorHandling = await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/tasks/invalid-uuid/status', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({})
  }).then(r => r.json())`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] All API endpoints returning correct status codes
- [ ] Authentication required for protected routes
- [ ] Input validation rejecting invalid data
- [ ] Error handling returning proper error messages
- [ ] Database operations working correctly
- [ ] Real-time updates triggering properly


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

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] API tests validating all endpoints
- [ ] Zero TypeScript errors
- [ ] Security validation implemented

### Integration & Performance:
- [ ] Database operations optimized
- [ ] API response times <200ms
- [ ] Security requirements met
- [ ] Migration files created (not applied)
- [ ] Real-time updates working

### Evidence Package Required:
- [ ] API testing results
- [ ] Security validation proof
- [ ] Performance metrics
- [ ] Database migration files
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/app/api/tasks/`
- Services: `/wedsync/src/lib/services/taskTrackingService.ts`
- Tests: `/wedsync/tests/api/tasks/`
- Types: `/wedsync/src/types/tasks.ts`
- Migrations: `/wedsync/supabase/migrations/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch17/WS-159-team-b-round-1-complete.md`
- **Include:** Feature ID (WS-159) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-159 | ROUND_1_COMPLETE | team-b | batch17" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- Do NOT apply migrations yourself - send to SQL Expert
- REMEMBER: All 5 teams work in PARALLEL - coordinate through dependencies

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Migration files created
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY