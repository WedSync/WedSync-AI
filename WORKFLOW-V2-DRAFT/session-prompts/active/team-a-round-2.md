# TEAM A - ROUND 2: WS-001 - Enhanced Client Portal - Real-time Features & Integration

**Date:** 2025-01-21  
**Feature ID:** WS-001 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Implement real-time WebSocket features and vendor integration for the client portal with seamless updates  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding client (bride/groom)
**I want to:** See real-time updates when vendors make changes or planners update my timeline
**So that:** I'm always informed about my wedding progress without constantly refreshing or asking for updates

**Real Wedding Problem This Solves:**
Couples miss critical updates because they're buried in email. A vendor changes arrival time, planner adjusts timeline, photographer confirms location - all these updates happen in real-time during wedding planning. This feature ensures couples see changes instantly, reducing anxiety and miscommunication.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- WebSocket implementation for real-time updates
- Real-time vendor communication interface
- Live timeline synchronization
- Instant notification display in portal
- Presence indicators for online vendors/planners
- Real-time document status updates
- Live budget tracking as expenses update
- Activity feed with instant updates

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Components: Untitled UI + Magic UI (NO Radix/shadcn!)
- Backend: Supabase Realtime subscriptions
- Testing: Playwright MCP, Vitest
- WebSocket: Supabase Realtime or Socket.io

**Integration Points:**
- [Team B Round 1]: Timeline optimization engine for live updates
- [Team E Round 1]: Notification engine for alert delivery
- [Team C Round 1]: Secure WebSocket authentication
- [Database]: Real-time subscriptions to portal_activities

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This dashboard uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "app-router streaming ssr", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime-subscriptions presence", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "animation transitions", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("useRealtime", "", true);
await mcp__serena__find_symbol("WebSocket", "", true);
await mcp__serena__search_for_pattern("subscription|realtime|live");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Implement real-time features for client portal"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Add real-time UI updates with Untitled UI + Magic UI"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Configure realtime subscriptions"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --test-realtime-features
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read Team A Round 1 implementation
- Understand WebSocket patterns in codebase
- Review Supabase Realtime documentation
- Check existing notification integration
- Continue until you FULLY understand the realtime architecture

### **PLAN PHASE (THINK HARD!)**
- Design WebSocket connection management
- Plan state synchronization strategy
- Design optimistic UI updates
- Plan error recovery for connection loss
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests for realtime features first
- Implement WebSocket connection handling
- Add real-time UI components
- Create activity feed with live updates
- Focus on smooth, flicker-free updates

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including realtime scenarios
- Test connection loss and recovery
- Verify with Playwright
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Real-time Enhancement):
- [ ] WebSocket connection management with auto-reconnect
- [ ] Real-time timeline updates component
- [ ] Live vendor status and presence indicators
- [ ] Activity feed with instant updates
- [ ] Real-time document status tracking
- [ ] Live budget updates as expenses change
- [ ] Integration tests for all realtime features

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B Round 1: Timeline data structure for updates
- FROM Team E Round 1: Notification delivery events
- FROM Team C Round 1: Secure WebSocket authentication

### What other teams NEED from you:
- TO Team A Round 3: Real-time infrastructure for analytics
- TO All Teams: WebSocket patterns for their features

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] WebSocket connections use WSS (secure)
- [ ] Authentication tokens refresh properly
- [ ] No sensitive data in WebSocket messages
- [ ] Rate limiting on real-time events
- [ ] Presence data respects privacy settings

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 REAL-TIME TESTING APPROACH:**

```javascript
// REAL-TIME FEATURE TESTING

// 1. TEST WEBSOCKET CONNECTION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
await mcp__playwright__browser_wait_for({text: "Connected", time: 5});

// 2. SIMULATE REAL-TIME UPDATES
// Open two tabs to test real-time sync
await mcp__playwright__browser_tab_new({url: "/dashboard"});              // Tab 1: Client view
await mcp__playwright__browser_tab_new({url: "/vendor/dashboard"});       // Tab 2: Vendor view

// Make change in vendor tab
await mcp__playwright__browser_tab_select({index: 1});
await mcp__playwright__browser_click({
  element: "Update timeline button", ref: "button[data-testid='update-timeline']"
});

// Switch to client tab and verify update appears
await mcp__playwright__browser_tab_select({index: 0});
await mcp__playwright__browser_wait_for({text: "Timeline updated", time: 2});

// 3. TEST CONNECTION RECOVERY
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate connection loss
    window.dispatchEvent(new Event('offline'));
  }`
});
await mcp__playwright__browser_wait_for({text: "Reconnecting..."});

await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate connection recovery
    window.dispatchEvent(new Event('online'));
  }`
});
await mcp__playwright__browser_wait_for({text: "Connected"});

// 4. PERFORMANCE VALIDATION
const realtimeMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    messageLatency: window.__realtimeMetrics?.latency || 0,
    messagesReceived: window.__realtimeMetrics?.count || 0,
    reconnectCount: window.__realtimeMetrics?.reconnects || 0
  })`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] WebSocket connection establishment and recovery
- [ ] Real-time updates appear within 2 seconds
- [ ] Multi-tab synchronization works correctly
- [ ] Connection loss handled gracefully
- [ ] No memory leaks during long sessions
- [ ] Presence indicators update correctly

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] WebSocket connections stable and auto-reconnect
- [ ] Real-time updates work across all components
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating real-time flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Updates appear within 2 seconds
- [ ] Connection recovery within 5 seconds
- [ ] Memory usage stable over time
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Video proof of real-time updates working
- [ ] Playwright test results
- [ ] Performance metrics showing latency
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/dashboard/realtime/`
- Hooks: `/wedsync/src/hooks/useRealtime.ts`
- WebSocket: `/wedsync/src/lib/websocket/`
- Tests: `/wedsync/__tests__/components/dashboard/realtime/`
- Types: `/wedsync/src/types/realtime.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-001-round-2-complete.md`
- **Include:** Feature ID (WS-001) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-001-round-2-complete.md`

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