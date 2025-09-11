# TEAM C - ROUND 1: WS-058 - Task Delegation System - Core Implementation

**Date:** 2025-08-22  
**Feature ID:** WS-058 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive task delegation system for wedding planning coordination  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Bride overwhelmed with 47 wedding tasks
**I want to:** Delegate specific tasks to my bridal party and family
**So that:** I reduce stress and ensure nothing falls through the cracks

**Real Wedding Problem This Solves:**
Sarah assigns "Pick up centerpieces Friday 2pm" to her sister Kate, "Coordinate morning hair appointments" to her maid of honor Lisa, and "Set up guest book table" to her dad. Each person gets notifications and can mark tasks complete. Sarah sees everything in one dashboard and sleeps better knowing her team is handling details.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Task assignment with email notifications to delegates
- Progress tracking with status updates
- Deadline reminders and overdue alerts
- Task categories and priority levels
- File attachments for task instructions
- Comment system for task updates
- Mobile-friendly task management
- Integration with guest list for assignments
- Bulk task operations
- Task templates for common wedding tasks

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Email: SendGrid for task notifications
- File Storage: Supabase Storage for attachments
- Real-time: Live status updates
- Mobile: PWA-ready task interface

**Integration Points:**
- Guest Database: Assign tasks to guests from Team A
- Delegated Tasks: New table for task management
- Notification System: Email and push notifications
- File System: Task attachments and documents

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
// Think hard about what documentation you need for task delegation
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "forms server-actions validation", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database rls permissions", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "responsive components", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/supabase/supabase", "storage file-upload", 2000);
await mcp__context7__get-library-docs("/sendgrid/sendgrid", "email-templates", 2000);
await mcp__context7__get-library-docs("/date-fns/date-fns", "date-formatting", 1500);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns and Team A's work:
await mcp__serena__find_symbol("guests", "", true);
await mcp__serena__get_symbols_overview("src/components");
await mcp__serena__search_for_pattern("task|assignment|delegate", true);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build task delegation system with notifications"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create task management UI components"
3. **database-mcp-specialist** --think-ultra-hard --follow-existing-patterns "Design task schema with assignments" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure task permissions"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **integration-specialist** --email-focus "Task notification system"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for components."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read Team A's guest management patterns
- Understand existing notification systems
- Check file upload implementations
- Review similar task management UIs
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Design task delegation database schema per specification
- Plan notification trigger system
- Design task status workflow
- Plan file attachment handling
- Consider edge cases (duplicate assignments, permissions)

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing UI patterns from SAAS-UI-STYLE-GUIDE.md
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright (task creation, assignment, status updates)
- Test email notifications
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database schema implementation (delegated_tasks table per spec)
- [ ] Task creation UI at `/src/components/wedme/tasks/TaskCreator.tsx`
- [ ] Task assignment interface with guest selection
- [ ] Task list dashboard with status filtering
- [ ] Email notification system for assignments
- [ ] API endpoints for CRUD operations
- [ ] Status update functionality (assigned/in_progress/completed)
- [ ] Basic file attachment support
- [ ] Mobile-responsive task interface
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for task flow

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Guest data structure for assignments (WS-056)

### What other teams NEED from you:
- TO Team A: Task assignment data for guest profiles
- TO Team B: Task creation triggers from RSVP milestones
- TO Team D: Task budget impact calculations
- TO Team E: Task display widgets for website

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Task permissions by couple ownership
- [ ] Email validation for assignments
- [ ] File upload restrictions (type, size)
- [ ] XSS prevention in task descriptions
- [ ] SQL injection prevention
- [ ] CSRF protection on forms
- [ ] Access control for task viewing
- [ ] Audit logging for assignments

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tasks"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for task interface - zero ambiguity!

// 2. TASK CREATION FLOW
await mcp__playwright__browser_click({
  element: "Create Task button",
  ref: "[data-testid='create-task-btn']"
});
await mcp__playwright__browser_type({
  element: "Task title input",
  ref: "[data-testid='task-title']",
  text: "Pick up wedding flowers"
});
await mcp__playwright__browser_type({
  element: "Task description",
  ref: "[data-testid='task-description']",
  text: "Pick up bridal bouquet and centerpieces from florist at 2pm Friday"
});

// 3. GUEST ASSIGNMENT TEST
await mcp__playwright__browser_click({
  element: "Assign to guest",
  ref: "[data-testid='assign-guest']"
});
await mcp__playwright__browser_type({
  element: "Guest search",
  ref: "[data-testid='guest-search']",
  text: "Kate Smith"
});
await mcp__playwright__browser_click({
  element: "Kate Smith option",
  ref: "[data-guest-id='kate-smith']"
});

// 4. DEADLINE AND PRIORITY
await mcp__playwright__browser_type({
  element: "Due date",
  ref: "[data-testid='due-date']",
  text: "2025-10-11"
});
await mcp__playwright__browser_select_option({
  element: "Priority dropdown",
  ref: "[data-testid='priority']",
  values: ["high"]
});

// 5. TASK SUBMISSION AND NOTIFICATION
await mcp__playwright__browser_click({
  element: "Create Task",
  ref: "[data-testid='submit-task']"
});
await mcp__playwright__browser_wait_for({text: "Task assigned to Kate Smith"});

// Verify email notification queued
const emailQueued = await mcp__playwright__browser_evaluate({
  function: `() => window.emailNotifications?.length > 0`
});

// 6. STATUS UPDATE TEST
await mcp__playwright__browser_click({
  element: "Task status dropdown",
  ref: "[data-testid='task-status-kate-smith']"
});
await mcp__playwright__browser_select_option({
  element: "Status options",
  ref: "[data-testid='status-select']",
  values: ["in_progress"]
});
await mcp__playwright__browser_wait_for({text: "Status updated"});

// 7. FILE ATTACHMENT TEST
await mcp__playwright__browser_file_upload({
  paths: ["/test-data/florist-instructions.pdf"]
});
await mcp__playwright__browser_wait_for({text: "File attached"});

// 8. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `tasks-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Task creation with all fields
- [ ] Guest assignment from dropdown
- [ ] Status updates and tracking
- [ ] Email notification triggers
- [ ] File attachment uploads
- [ ] Mobile responsive interface

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for Round 1 complete
- [ ] Task creation and assignment working
- [ ] Email notifications sending
- [ ] Status updates functional
- [ ] File attachments working
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integrates with Team A's guest data
- [ ] Task creation <500ms response time
- [ ] Email sending reliable
- [ ] File upload handling secure
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot of task creation flow
- [ ] Screenshot of task dashboard
- [ ] Screenshot of guest assignment
- [ ] Email notification examples
- [ ] Test results and coverage
- [ ] Performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Task Creator: `/wedsync/src/components/wedme/tasks/TaskCreator.tsx`
- Task List: `/wedsync/src/components/wedme/tasks/TaskList.tsx`
- Task Card: `/wedsync/src/components/wedme/tasks/TaskCard.tsx`
- Guest Selector: `/wedsync/src/components/wedme/tasks/GuestSelector.tsx`
- API Routes: `/wedsync/src/app/api/tasks/route.ts`
- Status API: `/wedsync/src/app/api/tasks/[id]/status/route.ts`
- Database: `/wedsync/supabase/migrations/XXX_task_delegation.sql`
- Email Service: `/wedsync/src/lib/services/task-notification-service.ts`
- Tests: `/wedsync/tests/wedme/tasks/`
- Types: `/wedsync/src/types/tasks.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch4/WS-058-batch4-round-1-complete.md`
- **Include:** Feature ID (WS-058) in all filenames
- **Save in:** batch4 folder (NOT in CORRECT folder)
- **After completion:** Update senior dev that Round 1 is complete

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch4/WS-058-batch4-round-1-complete.md`

Must include:
1. Summary of task delegation system built
2. Files created/modified list
3. Test results and coverage
4. Screenshots/evidence
5. Integration points ready
6. Any blockers or issues

---

## ⚠️ CRITICAL WARNINGS
- Do NOT build guest list UI (Team A's WS-056)
- Do NOT implement RSVP system (Team B's WS-057)
- Do NOT build budget features (Team D's WS-059)
- Do NOT create website builder (Team E's WS-060)
- FOCUS ONLY on task delegation system
- REMEMBER: All 5 teams work in PARALLEL - no overlapping work

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Task creation UI functional
- [ ] Guest assignment working
- [ ] Email notifications operational
- [ ] Status tracking implemented
- [ ] File attachments supported
- [ ] All tests passing
- [ ] Security validated
- [ ] Performance targets met
- [ ] Code committed
- [ ] Report created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY