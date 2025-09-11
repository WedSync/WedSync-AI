# TEAM B - ROUND 1: WS-156 - Task Creation System - Backend API & Database

**Date:** 2025-01-25  
**Feature ID:** WS-156 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build the task creation backend APIs with real-time conflict detection and database operations  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple preparing for their big day
**I want to:** Create detailed tasks for my wedding helpers with specific timing, locations, and instructions
**So that:** My helpers know exactly what to do, when to do it, and where to be, eliminating confusion and ensuring smooth execution

**Real Wedding Problem This Solves:**
A couple typically creates a "day-of timeline" in a Word document that gets lost or outdated. With this feature, they create tasks like "Set up ceremony chairs (2pm-2:30pm at Garden Pavilion, need 100 white chairs from storage)" that get assigned to specific helpers. This eliminates the chaos of people asking "what should I be doing now?" throughout the wedding day.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Database schema for wedding_tasks and task_templates tables
- REST API endpoints for CRUD operations on tasks
- Real-time timing conflict detection via RPC functions
- Bulk task creation from templates
- Task validation and business logic implementation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- API: Next.js API Routes with Edge Runtime

**Integration Points:**
- Frontend Components: Interfaces for Team A components
- Timeline Service: Conflict detection algorithms
- Notification Service: Task assignment notifications
- Database: Direct Supabase connections with RLS policies

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (Not needed for backend but read for context):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes edge-runtime", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database functions rls", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "rpc-functions edge-functions", 3000);
await mcp__context7__get-library-docs("/postgresql/postgresql", "jsonb performance", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("taskService", "", true);
await mcp__serena__get_symbols_overview("/src/app/api/tasks");
await mcp__serena__get_symbols_overview("/src/lib/services");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Supabase updates frequently!)
- Serena shows existing patterns to follow (consistent API structure!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Track task API backend development"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "Build task management APIs with Edge Runtime"
3. **database-mcp-specialist** --think-ultra-hard --follow-existing-patterns "Design task database schema and RPC functions" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --think-hard --rest-design-patterns "Design task management API contracts"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing patterns and conventions
- Check integration points
- Review similar implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling
- Consider edge cases
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database migration for wedding_tasks and task_templates tables
- [ ] API endpoint: POST /api/tasks (create task)
- [ ] API endpoint: GET /api/tasks (list tasks by couple)
- [ ] API endpoint: GET /api/tasks/templates (template library)
- [ ] API endpoint: POST /api/tasks/validate-timing (conflict detection)
- [ ] Task service with business logic in `/src/lib/services/taskService.ts`
- [ ] Unit tests with >80% coverage
- [ ] Basic API testing with validated responses

### Round 2 (Enhancement & Polish):
- [ ] Bulk task creation API endpoints
- [ ] Advanced timing conflict algorithms
- [ ] Task dependency validation
- [ ] Template customization and import
- [ ] Performance optimization for large task sets

### Round 3 (Integration & Finalization):
- [ ] Full integration with frontend components
- [ ] Complete API testing scenarios
- [ ] Database performance optimization
- [ ] Security audit and RLS policy validation
- [ ] Production deployment readiness

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Component interfaces and data contracts - Required for API design
- FROM Team C: Integration requirements for notifications - Dependency for task assignments

### What other teams NEED from you:
- TO Team A: API contracts and response schemas - They need this for frontend integration
- TO Team C: Task service interfaces - Blocking their integration features

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

**EVERY API route MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('wedding_tasks').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { taskCreationSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  taskCreationSchema, // Zod schema validation
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    const { title, description, category, timing_value, couple_id } = validatedData;
    
    // Check authorization - user can only create tasks for their own wedding
    const session = await getServerSession(request);
    if (session.user.couple_id !== couple_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Business logic with validated data
    const task = await taskService.createTask(validatedData);
    return NextResponse.json({ success: true, data: task });
  }
);
```

### SECURITY CHECKLIST FOR EVERY API ENDPOINT

Teams MUST implement ALL of these for EVERY API route:

- [ ] **Authentication Check**: Use existing middleware from `/src/middleware/auth.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **Authorization**: Verify couple_id ownership for all task operations
- [ ] **Rate Limiting**: Already implemented in middleware - DO NOT bypass
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **XSS Prevention**: Sanitize ALL user input - see `/src/lib/security/input-validation.ts`
- [ ] **Error Handling**: NEVER expose stack traces or sensitive errors to users

### SPECIFIC SECURITY PATTERNS FOR TASK APIs

```typescript
// Task Creation Security Pattern
export const POST = withSecureValidation(
  taskCreationSchema.extend({
    couple_id: z.string().uuid(),
    timing_value: z.string().min(1),
    estimated_duration: z.number().min(1).max(1440) // Max 24 hours
  }),
  async (request, validatedData) => {
    // Verify couple ownership
    const session = await getServerSession(request);
    if (session.user.couple_id !== validatedData.couple_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Sanitize timing input
    const safeTiming = sanitizeTimeString(validatedData.timing_value);
    
    // Business logic implementation
    const task = await taskService.createTask({
      ...validatedData,
      timing_value: safeTiming
    });
    
    return NextResponse.json({ success: true, data: task });
  }
);

// Task Query Security Pattern  
export const GET = async (request: NextRequest) => {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const coupleId = url.searchParams.get('couple_id');
  
  // Verify user can only access their own tasks
  if (session.user.couple_id !== coupleId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const tasks = await taskService.getTasksByCouple(coupleId);
  return NextResponse.json({ success: true, data: tasks });
};
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 API-FIRST VALIDATION (Beyond Simple HTTP Testing!):**

```javascript
// REVOLUTIONARY API TESTING APPROACH!

// 1. COMPREHENSIVE API CONTRACT VALIDATION
test('Task creation API contract validation', async () => {
  const createTaskPayload = {
    title: 'Set up ceremony chairs',
    description: 'Arrange 100 white chairs in rows of 10',
    category: 'setup',
    priority: 'high',
    timing_value: '14:00',
    location: 'Garden Pavilion',
    estimated_duration: 30,
    couple_id: 'test-couple-id'
  };
  
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createTaskPayload)
  });
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data).toMatchObject({
    id: expect.any(String),
    title: 'Set up ceremony chairs',
    category: 'setup'
  });
});

// 2. TIMING CONFLICT DETECTION VALIDATION
test('Timing conflict detection accuracy', async () => {
  // Create first task
  await createTask({ timing_value: '14:00', estimated_duration: 60 });
  
  // Try to create overlapping task
  const conflictResponse = await fetch('/api/tasks/validate-timing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timing_value: '14:30',
      estimated_duration: 60,
      couple_id: 'test-couple-id'
    })
  });
  
  const conflictData = await conflictResponse.json();
  expect(conflictData.conflicts).toHaveLength(1);
  expect(conflictData.conflicts[0]).toContain('overlap detected');
});

// 3. PERFORMANCE AND LOAD TESTING
test('API performance under load', async () => {
  const startTime = Date.now();
  
  const promises = Array(50).fill().map((_, i) => 
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Task ${i}`,
        category: 'setup',
        timing_value: `${14 + Math.floor(i/10)}:${String(i % 60).padStart(2, '0')}`,
        couple_id: 'load-test-couple'
      })
    })
  );
  
  await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  // Should handle 50 tasks in under 5 seconds
  expect(totalTime).toBeLessThan(5000);
});

// 4. SECURITY PENETRATION TESTING
test('Security validation for unauthorized access', async () => {
  // Try to access other couple's tasks
  const unauthorizedResponse = await fetch('/api/tasks?couple_id=other-couple-id', {
    headers: { 'Authorization': 'Bearer valid-token-for-different-couple' }
  });
  
  expect(unauthorizedResponse.status).toBe(403);
  
  // Try SQL injection
  const sqlInjectionResponse = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "'; DROP TABLE wedding_tasks; --",
      category: 'setup',
      couple_id: 'test-couple-id'
    })
  });
  
  expect(sqlInjectionResponse.status).toBe(400); // Should be rejected by validation
});
```

**REQUIRED TEST COVERAGE:**
- [ ] API contract validation for all endpoints
- [ ] Timing conflict detection accuracy
- [ ] Performance under concurrent load (50+ requests)
- [ ] Security penetration testing
- [ ] Database constraint validation
- [ ] Error handling for malformed requests
- [ ] RLS policy enforcement validation

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] API contract tests validating all endpoints
- [ ] Zero TypeScript errors
- [ ] Zero database constraint violations

### Integration & Performance:
- [ ] API endpoints responding correctly
- [ ] Performance targets met (<200ms API response, <1s conflict detection)
- [ ] Security requirements met and tested
- [ ] Database migrations tested and documented
- [ ] RLS policies validated and working

### Evidence Package Required:
- [ ] API testing results with response samples
- [ ] Performance benchmarks
- [ ] Security test results
- [ ] Database migration success proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend APIs: `/wedsync/src/app/api/tasks/`
- Services: `/wedsync/src/lib/services/taskService.ts`
- Tests: `/wedsync/tests/api/tasks/`
- Types: `/wedsync/src/types/tasks.ts`
- Migrations: `/wedsync/supabase/migrations/`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-156.md
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch16/WS-156-team-b-round-1-complete.md`
- **Include:** Feature ID (WS-156) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch16)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-156 | ROUND_1_COMPLETE | team-b | batch16" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

Use the standard team output template in `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md`
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch16/WS-156-team-b-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY