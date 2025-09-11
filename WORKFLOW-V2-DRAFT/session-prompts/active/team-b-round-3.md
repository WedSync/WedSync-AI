# TEAM B - ROUND 3: WS-005 - Task Automation - Workflow Engine

**Date:** 2025-01-21  
**Feature ID:** WS-005 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build intelligent task automation engine that creates and manages wedding planning workflows with ML-enhanced timeline optimization  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding planner
**I want to:** Automatically generate task sequences for different wedding types, track progress, and get intelligent recommendations for next steps
**So that:** I never miss critical tasks and can efficiently manage multiple weddings with confidence

**Real Wedding Problem This Solves:**
Planners forget critical tasks like "order flowers 6 weeks before" or "confirm final headcount 1 week before." Different wedding types (garden, church, destination) have different task sequences. This automation engine ensures no critical tasks are missed and sequences them optimally based on the ML timeline optimization from Round 2.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Automated workflow generation based on wedding type
- Task dependency mapping and sequencing
- Progress tracking with milestone detection
- Intelligent task recommendations
- Integration with timeline optimization
- Deadline calculation and alerts
- Template-based workflow creation
- Multi-stakeholder task assignment

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Components: Untitled UI + Magic UI (NO Radix/shadcn!)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Workflow: Enhanced with Round 1 & 2 timeline optimization
- ML: Integration with Round 2 ML models
- Testing: Playwright MCP, Vitest
- Queue: Background task processing

**Integration Points:**
- [Team B Round 1 & 2]: Timeline optimization engine for task sequencing
- [Team E Round 1]: Notifications for task deadlines
- [Team A Round 3]: Analytics dashboard for workflow insights
- [Database]: workflows, tasks, task_dependencies, automation_rules

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "cron-jobs background-tasks queue", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database-functions triggers workflows", 3000);
await mcp__context7__get-library-docs("/workflow-engines/docs", "task-automation dependency-resolution", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Team B Round 1 & 2 implementations:
await mcp__serena__find_symbol("TimelineOptimization", "", true);
await mcp__serena__find_symbol("MLEngine", "", true);
await mcp__serena__search_for_pattern("workflow|automation|task");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (workflow patterns change!)
- Serena shows existing timeline and ML patterns to leverage
- Agents work with full context of previous rounds

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build task automation with ML timeline integration"
2. **workflow-automation-specialist** --think-hard --use-loaded-docs "Create intelligent wedding workflow engine"
3. **ai-ml-engineer** --think-ultra-hard --integrate-existing-ml "Enhance workflows with ML predictions"
4. **postgresql-database-expert** --think-ultra-hard --optimize-workflow-queries
5. **test-automation-architect** --tdd-approach --test-complex-workflows
6. **playwright-visual-testing-specialist** --accessibility-first --test-task-flows
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use Context7 docs and integrate with Team B Round 1 & 2 timeline optimization and ML."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Study Team B Round 1 & 2 implementations thoroughly
- Understand existing timeline and ML integration points
- Research workflow automation patterns
- Check task management requirements
- Continue until you FULLY understand workflow automation needs

### **PLAN PHASE (THINK HARD!)**
- Design workflow engine architecture
- Plan task dependency resolution
- Design ML integration for intelligent recommendations
- Plan automation rules and triggers
- Don't rush - this integrates complex previous work

### **CODE PHASE (PARALLEL AGENTS!)**
- Write comprehensive workflow tests FIRST
- Implement workflow engine with ML integration
- Build task automation and sequencing
- Create intelligent recommendation system
- Focus on reliability and ML integration

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Test complex multi-stakeholder workflows
- Validate ML-enhanced recommendations
- Verify with Playwright
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Workflow Automation):
- [ ] Intelligent workflow generation engine
- [ ] Task dependency resolution system
- [ ] ML-enhanced task recommendations
- [ ] Automated deadline calculation using timeline optimization
- [ ] Multi-stakeholder task assignment
- [ ] Progress tracking with milestone detection
- [ ] Workflow template management
- [ ] Integration tests with Round 1 & 2 systems

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B Round 1: Timeline optimization engine (CRITICAL)
- FROM Team B Round 2: ML prediction models (CRITICAL)
- FROM Team E Round 1: Notification system for task alerts
- FROM Team A Round 3: Analytics for workflow insights

### What other teams NEED from you:
- TO All Teams: Complete automated workflow foundation
- TO Management: Full task automation platform

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Task assignment authorization
- [ ] Workflow modification audit logs
- [ ] Secure automation rule execution
- [ ] Task data access controls
- [ ] Stakeholder permission validation

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 WORKFLOW AUTOMATION TESTING:**

```javascript
// COMPREHENSIVE WORKFLOW TESTING

// 1. TEST AUTOMATED WORKFLOW GENERATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/workflows/create"});

// Create complex wedding scenario
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.__testWedding = {
      type: 'garden-wedding',
      date: '2025-06-15',
      guestCount: 150,
      vendors: ['photographer', 'catering', 'flowers', 'music'],
      complexity: 'high'
    };
  }`
});

// Generate workflow
await mcp__playwright__browser_click({
  element: "Generate workflow", ref: "button[data-testid='generate-workflow']"
});

await mcp__playwright__browser_wait_for({text: "Workflow generated", time: 10});

// Verify ML-enhanced recommendations
const workflowResult = await mcp__playwright__browser_evaluate({
  function: `() => {
    const tasks = document.querySelectorAll('[data-testid^="task-"]');
    return {
      taskCount: tasks.length,
      hasMLRecommendations: document.querySelector('[data-testid="ml-recommendation"]') !== null,
      hasDependencies: document.querySelector('[data-testid="task-dependency"]') !== null
    };
  }`
});

// 2. TEST TASK DEPENDENCY RESOLUTION
await mcp__playwright__browser_click({
  element: "Task dependencies view", ref: "button[data-testid='view-dependencies']"
});

const dependencyValidation = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test that dependent tasks are properly sequenced
    return fetch('/api/workflows/validate-dependencies', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(window.__testWedding)
    }).then(r => r.json()).then(result => ({
      validSequence: result.valid,
      circularDependencies: result.circularDependencies || [],
      criticalPath: result.criticalPath || []
    }));
  }`
});

// 3. TEST ML INTEGRATION
await mcp__playwright__browser_click({
  element: "Get ML recommendations", ref: "button[data-testid='ml-recommendations']"
});

const mlIntegration = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/workflows/ml-enhance', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(window.__testWedding)
    }).then(r => r.json()).then(recommendations => ({
      recommendationCount: recommendations.length,
      highPriorityCount: recommendations.filter(r => r.priority === 'high').length,
      timelineOptimized: recommendations.some(r => r.source === 'timeline-ml')
    }));
  }`
});

// 4. TEST MULTI-STAKEHOLDER ASSIGNMENT
const stakeholderTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    const assignmentData = {
      workflow: window.__testWedding,
      stakeholders: [
        {id: 'planner', role: 'lead', permissions: ['all']},
        {id: 'couple', role: 'client', permissions: ['view', 'approve']},
        {id: 'vendor-photo', role: 'vendor', permissions: ['view', 'update-own']}
      ]
    };
    
    return fetch('/api/workflows/assign-tasks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(assignmentData)
    }).then(r => r.json()).then(result => ({
      tasksAssigned: result.assignments.length,
      permissionsValid: result.permissionsValid,
      notificationsSent: result.notificationsSent
    }));
  }`
});

// 5. TEST AUTOMATION PERFORMANCE
const automationPerformance = await mcp__playwright__browser_evaluate({
  function: `() => {
    const startTime = performance.now();
    
    // Test with large workflow (50 tasks, 10 stakeholders)
    const largeWorkflow = {
      tasks: Array.from({length: 50}, (_, i) => ({
        id: 'task-' + i,
        dependencies: i > 0 ? ['task-' + (i-1)] : [],
        stakeholder: 'stakeholder-' + (i % 10)
      }))
    };
    
    return fetch('/api/workflows/automate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(largeWorkflow)
    }).then(r => r.json()).then(result => ({
      processingTime: performance.now() - startTime,
      automationRulesApplied: result.rulesApplied,
      optimizationsFound: result.optimizations.length
    }));
  }`
});

// 6. TEST REAL-TIME PROGRESS TRACKING
await mcp__playwright__browser_tab_new({url: "/workflows/track"});
await mcp__playwright__browser_tab_select({index: 1});

// Mark task complete in second tab
await mcp__playwright__browser_click({
  element: "Complete task", ref: "button[data-testid='complete-task-1']"
});

// Switch back and verify real-time update
await mcp__playwright__browser_tab_select({index: 0});
await mcp__playwright__browser_wait_for({text: "Task completed", time: 3});
```

**REQUIRED TEST COVERAGE:**
- [ ] Workflow generation creates valid task sequences
- [ ] Task dependencies resolve without circular references
- [ ] ML recommendations integrate with timeline optimization
- [ ] Multi-stakeholder assignments respect permissions
- [ ] Automation rules execute correctly
- [ ] Real-time progress updates work across tabs

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Workflow Implementation:
- [ ] Intelligent workflow generation operational
- [ ] Task dependency resolution working
- [ ] ML integration enhances recommendations
- [ ] Tests written FIRST and passing (>85% coverage)
- [ ] Playwright tests validating complex workflows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Workflow generation in <5 seconds for 50 tasks
- [ ] ML recommendations improve task sequencing
- [ ] Multi-stakeholder assignments work correctly
- [ ] Security requirements met
- [ ] Real-time updates functional

### Evidence Package Required:
- [ ] Complex workflow generation proof
- [ ] ML integration validation
- [ ] Multi-stakeholder workflow test
- [ ] Performance metrics with large workflows
- [ ] Integration test results with Round 1 & 2

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Workflow Engine: `/wedsync/src/lib/workflows/automation/`
- ML Integration: `/wedsync/src/lib/workflows/ml/`
- API: `/wedsync/src/app/api/workflows/`
- Tests: `/wedsync/__tests__/lib/workflows/`
- Types: `/wedsync/src/types/workflows.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-005-round-3-complete.md`
- **Include:** Feature ID (WS-005) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-005-round-3-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip integration with Round 1 & 2 work
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: This integrates ALL Team B work - must be complete
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Integration with Round 1 & 2 verified
- [ ] Tests written and passing
- [ ] ML enhancement validated
- [ ] Multi-stakeholder workflows tested
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY