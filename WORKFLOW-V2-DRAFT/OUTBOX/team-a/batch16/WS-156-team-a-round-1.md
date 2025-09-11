# TEAM A - ROUND 1: WS-156 - Task Creation System - Frontend Components & UI

**Date:** 2025-01-25  
**Feature ID:** WS-156 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build the task creation frontend components with real-time validation and rich editing capabilities  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

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
- Rich task creation form with title, description, category, priority, timing, location
- Real-time timing conflict detection and validation
- Task template library with pre-built wedding scenarios  
- Visual timeline view showing task overlaps
- Photo attachment support for task instructions
- Duration estimation and dependency management

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- UI Components: shadcn/ui with task-specific customizations

**Integration Points:**
- Task Service API: POST/GET/PUT endpoints for task management
- Timeline Service: Integration for conflict detection
- Notification Service: For helper task assignments
- Database: wedding_tasks, task_templates tables

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "app-router server-actions", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "client-side-auth", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "forms responsive", 2000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "validation schemas", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("TaskCreator", "", true);
await mcp__serena__get_symbols_overview("/src/components/tasks");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Track task creation frontend development"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Build task creation components with validation"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Create task management pages with App Router" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
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
- [ ] TaskCreator component with full form validation
- [ ] TaskTemplateLibrary component for pre-built templates
- [ ] TaskTimingValidator component with conflict detection
- [ ] Main task management page `/src/app/(dashboard)/tasks/page.tsx`
- [ ] Task types and interfaces in `/src/types/tasks.ts`
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for form interactions

### Round 2 (Enhancement & Polish):
- [ ] Real-time conflict detection integration
- [ ] Photo attachment upload functionality  
- [ ] Drag-and-drop task reordering
- [ ] Task template customization
- [ ] Advanced validation and error handling

### Round 3 (Integration & Finalization):
- [ ] Full integration with backend APIs
- [ ] Complete E2E testing scenarios
- [ ] Performance optimization
- [ ] Accessibility compliance
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Task service APIs and database schema - Required for data operations
- FROM Team C: Integration endpoints for timeline conflicts - Dependency for validation

### What other teams NEED from you:
- TO Team B: Component interfaces and prop types - They need this for API integration
- TO Team D: Task component exports - Blocking their helper assignment features

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

**EVERY API route MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('table').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { taskSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  taskSchema, // Zod schema validation
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    // Your implementation here
  }
);
```

### SECURITY CHECKLIST FOR EVERY TEAM PROMPT

Teams MUST implement ALL of these for frontend forms and API calls:

- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **XSS Prevention**: Sanitize ALL user input - see `/src/lib/security/input-validation.ts`
- [ ] **CSRF Protection**: Use Next.js built-in CSRF tokens
- [ ] **File Upload Security**: Validate file types and sizes for photo attachments
- [ ] **Form Validation**: Client-side AND server-side validation required
- [ ] **Error Handling**: NEVER expose stack traces or sensitive errors to users
- [ ] **Authentication Check**: Verify user session before task operations

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/tasks"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. TASK CREATION FORM TESTING (COMPREHENSIVE!)
await mcp__playwright__browser_click({
  element: "Create New Task button",
  ref: "button[data-testid='create-task']"
});

await mcp__playwright__browser_type({
  element: "Task title input",
  ref: "input[name='title']",
  text: "Set up ceremony chairs"
});

// 3. TIMING CONFLICT VALIDATION
await mcp__playwright__browser_type({
  element: "Timing input", 
  ref: "input[name='timing_value']",
  text: "14:00"
});

await mcp__playwright__browser_wait_for({text: "Timing Conflicts Detected"});

// 4. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    formValidationTime: window.taskFormMetrics?.validationTime || 0
  })`
});

// 5. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-task-creation.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Task creation form workflows
- [ ] Real-time validation feedback  
- [ ] Template selection and customization
- [ ] Scientific performance (form submission <1s)
- [ ] Zero console errors (verified)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration points working
- [ ] Performance targets met (<1s form submission, <200ms validation)
- [ ] Accessibility validation passed
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working task creation form
- [ ] Playwright test results
- [ ] Performance metrics
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/tasks/`
- Pages: `/wedsync/src/app/(dashboard)/tasks/`
- Tests: `/wedsync/tests/tasks/`
- Types: `/wedsync/src/types/tasks.ts`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-156.md
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch16/WS-156-team-a-round-1-complete.md`
- **Include:** Feature ID (WS-156) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch16)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-156 | ROUND_1_COMPLETE | team-a | batch16" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

Use the standard team output template in `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md`
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch16/WS-156-team-a-round-1-complete.md`

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