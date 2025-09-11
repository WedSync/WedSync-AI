# TEAM A - ROUND 1: WS-006 - Advanced Journey Execution Engine - React Dashboard

**Date:** 2025-01-23  
**Feature ID:** WS-006 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build React dashboard components for the advanced journey execution engine with real-time monitoring, analytics, and performance optimization  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer with 50+ couples per year
**I want to:** Monitor automated journey execution in real-time, see performance metrics, and quickly troubleshoot any failed automations
**So that:** I can ensure all my couples receive timely communications and nothing falls through the cracks

**Real Wedding Problem This Solves:**
Photographers currently send timeline reminders manually 2 weeks before each wedding. With 50+ couples, that's checking spreadsheets weekly and risking missing someone. This journey engine automates the entire process while providing a dashboard to monitor that everything is running smoothly.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:** WS-006
- Real-time journey execution monitoring dashboard
- Performance analytics and optimization metrics
- Advanced error handling and recovery systems
- Multi-step journey visualization
- Execution status tracking with live updates
- Performance bottleneck identification

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Real-time: Supabase Realtime subscriptions
- State Management: Zustand

**Integration Points:**
- [WS-008 Notification Engine]: Journey completion notifications
- [WS-011 Document Management]: Journey-triggered document generation
- [Database]: journey_executions, journey_steps, journey_analytics tables

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "app-router server-components", 5000);
await mcp__context7__get-library-docs("/pmndrs/zustand", "state-management typescript", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "dashboard-layouts responsive", 2000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime-subscriptions", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("JourneyEngine", "", true);
await mcp__serena__search_for_pattern("journey|execution|automation");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard "Build journey execution dashboard with real-time monitoring"
2. **react-ui-specialist** --think-hard "Create journey visualization and analytics dashboard"
3. **supabase-specialist** --think-ultra-hard "Set up journey execution realtime subscriptions"
4. **security-compliance-officer** --think-ultra-hard "Secure journey execution monitoring"
5. **test-automation-architect** --tdd-approach "Test journey execution flows"
6. **playwright-visual-testing-specialist** --accessibility-first "Test dashboard interactions"

---

## 📋 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Journey execution monitoring dashboard component
- [ ] Real-time execution status visualization
- [ ] Performance metrics display widgets
- [ ] Error handling and recovery interface
- [ ] Journey step progress tracking
- [ ] Analytics dashboard for execution insights
- [ ] Unit tests with >80% coverage
- [ ] Playwright tests for monitoring workflows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Journey execution backend API
- FROM Team C: Authentication wrapper for dashboard

### What other teams NEED from you:
- TO Team B: Dashboard requirements for API design
- TO Team D: Journey metrics for analytics integration

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Journey execution dashboard renders correctly
- [ ] Real-time status updates via WebSockets
- [ ] Performance metrics display accurately
- [ ] Error recovery interface functional
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript/console errors

### Integration & Performance:
- [ ] Dashboard loads in <2 seconds
- [ ] Real-time updates appear within 500ms
- [ ] Analytics calculations complete in <1 second
- [ ] Works on all breakpoints (375px, 768px, 1920px)

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/journey-engine/`
- Pages: `/wedsync/src/app/(dashboard)/journeys/`
- Tests: `/wedsync/__tests__/components/journey-engine/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-006-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY