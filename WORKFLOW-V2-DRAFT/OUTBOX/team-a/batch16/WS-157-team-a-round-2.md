# TEAM A - ROUND 2: WS-157 - Helper Assignment - Advanced Frontend Features

**Date:** 2025-01-25  
**Feature ID:** WS-157 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build advanced helper assignment UI with smart suggestions, conflict resolution, and bulk operations  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple delegating tasks to family and friends
**I want to:** Assign specific wedding tasks to helpers with clear instructions and timing
**So that:** Everyone knows their responsibilities and can execute tasks without confusion on the wedding day

**Real Wedding Problem This Solves:**
A couple currently creates handwritten task lists like "Mom - handle gifts table" without clear timing or instructions. With this feature, they assign "Mary Johnson - Gift table setup (5:00pm-5:30pm) - Set up gift table in foyer, arrange card box, ensure gift security" with automatic notifications and check-in reminders.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification (Round 2 Focus):**
- Smart helper assignment suggestions based on skills and availability
- Visual conflict resolution interface with drag-and-drop solutions
- Bulk assignment operations for multiple tasks
- Real-time workload balancing visualization
- Advanced helper directory with search and filtering
- Integration with guest list for automatic helper import

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- UI Enhancements: Chart.js for workload visualization, React DnD

**Integration Points:**
- Task Creation System (WS-156): Task data and interfaces
- Guest List System: Helper contact information
- Timeline Service: Conflict detection and resolution
- Notification Service: Assignment notifications

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs:
await mcp__context7__get-library-docs("/vercel/next.js", "app-router server-actions", 5000);
await mcp__context7__get-library-docs("/react/react", "advanced-patterns hooks", 3000);
await mcp__context7__get-library-docs("/chartjs/chart.js", "react-integration", 2000);
await mcp__context7__get-library-docs("/react-dnd/react-dnd", "drag-drop patterns", 2000);

// 3. SERENA MCP - Initialize:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing Round 1 work:
await mcp__serena__find_symbol("HelperAssignment", "", true);
await mcp__serena__get_symbols_overview("/src/components/tasks");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --build-on-round-1 "Track advanced helper assignment features"
2. **react-ui-specialist** --advanced-patterns "Build smart suggestion and bulk operation interfaces"
3. **nextjs-fullstack-developer** --integration-focus "Enhance helper assignment with advanced features"
4. **security-compliance-officer** --validate-enhancements
5. **test-automation-architect** --extend-test-coverage
6. **playwright-visual-testing-specialist** --advanced-interactions
7. **code-quality-guardian** --polish-and-optimize

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Polish):
- [ ] Smart assignment suggestion engine with scoring algorithm
- [ ] Visual conflict resolution interface with timeline view
- [ ] Bulk assignment operations (assign multiple tasks to helpers)
- [ ] Helper workload visualization dashboard
- [ ] Advanced helper directory with search/filter capabilities
- [ ] Guest list integration for automatic helper import
- [ ] Drag-and-drop task reassignment interface
- [ ] Real-time collaboration for multiple planners

---

## 🔗 DEPENDENCIES

### Building on Round 1 Work:
- EXTEND: TaskCreator component with assignment integration
- ENHANCE: Basic helper assignment with advanced features
- INTEGRATE: Task validation with helper availability

### What you NEED from other teams:
- FROM Team B: Enhanced helper service APIs - Required for smart suggestions
- FROM Team C: Real-time conflict detection - Dependency for live updates

### What other teams NEED from you:
- TO Team B: Advanced UI requirements - They need this for API enhancements
- TO Team D: Bulk operation interfaces - Blocking their mobile optimization

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Smart suggestions generate within 2 seconds
- [ ] Drag-and-drop operations complete smoothly
- [ ] Bulk operations handle 20+ tasks efficiently
- [ ] Real-time updates work across multiple sessions
- [ ] Visual conflict resolution prevents overlaps

### Evidence Package Required:
- [ ] Screenshots of smart suggestion interface
- [ ] Demonstration of bulk assignment workflow
- [ ] Conflict resolution video walkthrough
- [ ] Performance metrics for advanced features

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Enhanced Components: `/wedsync/src/components/tasks/helpers/`
- Advanced Features: `/wedsync/src/components/tasks/bulk/`
- Visualization: `/wedsync/src/components/charts/helper-workload/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch16/WS-157-team-a-round-2-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY