# TEAM A - ROUND 2: WS-203 - WebSocket Channels - Advanced Channel Management & Error Handling

**Date:** 2025-08-28  
**Feature ID:** WS-203 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Enhance channel management with advanced features, error handling, and offline synchronization  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier managing multiple concurrent weddings
**I want to:** Reliable channel switching, message persistence during connectivity issues, and clear error feedback
**So that:** I never lose critical wedding updates and can work confidently even with poor network conditions

**Real Wedding Problem This Solves:**
During venue setup, the photographer's phone connection drops while reviewing timeline changes in Sarah's wedding channel. When reconnected, all missed messages appear in proper order, with clear indicators of what was missed. The florist switches between 3 wedding channels rapidly, and each switch is instant with proper loading states. The caterer sees clear error messages when trying to access a completed wedding's archived channel.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Enhance Round 1 components with:
- Advanced error handling and retry logic
- Offline message persistence and sync
- Channel state management optimizations
- Connection recovery mechanisms
- Message deduplication and ordering

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Real-time: Supabase Realtime channels with broadcast
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Backend API: Enhanced channel endpoints from Team B Round 2
- Database: Message persistence tables from Team D Round 2
- Real-time: Connection state management with Team C components

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "React error boundary patterns"
// - "IndexedDB offline storage React"
// - "WebSocket reconnection strategies"

// For this specific feature, also search:
// - "React Suspense error handling"
// - "Service worker message queuing"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Round 1 implementations:
await mcp__serena__find_symbol("ChannelManager", "", true);
await mcp__serena__get_symbols_overview("/src/components/websocket");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Advanced channel error handling"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Offline-capable React components"
3. **performance-optimization-expert** --think-ultra-hard --follow-existing-patterns "Channel switching optimization" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --error-scenarios
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Build on Round 1 components. Focus on reliability and offline capability."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Error Handling):
- [ ] Enhanced ChannelManager with connection state tracking
- [ ] ChannelErrorBoundary component for graceful error handling
- [ ] OfflineMessageSync component for message persistence
- [ ] ConnectionStatusIndicator showing real-time connectivity
- [ ] Message deduplication and ordering logic
- [ ] Advanced Playwright tests for error scenarios
- [ ] Performance optimization for rapid channel switching

### What other teams NEED from you:
- TO Team B: Error handling requirements for API endpoints
- TO Team C: Connection state sharing interfaces

### What you NEED from other teams:
- FROM Team B: Enhanced channel API with error codes
- FROM Team D: Message persistence and sync endpoints

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ ALWAYS validate reconnection authenticity
const validateReconnection = async (channelName: string, lastMessageId: string) => {
  const token = await getValidAuthToken();
  return await verifyChannelAccess(channelName, token, lastMessageId);
};

// ✅ ALWAYS sanitize persisted messages
const sanitizePersistedMessage = (message: any) => {
  return {
    ...message,
    content: sanitizeString(message.content),
    timestamp: new Date(message.timestamp).toISOString()
  };
};

// ✅ ALWAYS rate limit channel operations
const channelOperationLimiter = createRateLimiter({
  max: 10,
  windowMs: 1000
});
```

**SECURITY CHECKLIST:**
- [ ] **Reconnection Security**: Verify user still has channel access after reconnection
- [ ] **Message Integrity**: Validate message authenticity during sync
- [ ] **Rate Limiting**: Prevent rapid channel switching abuse
- [ ] **Local Storage Security**: Encrypt sensitive offline data
- [ ] **Error Information**: Never expose channel internals in errors

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Connection loss and recovery testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/supplier/dashboard"});

// Simulate connection loss
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.dispatchEvent(new Event("offline"));
    // Simulate WebSocket close
    window.mockWebSocketClose();
  }`
});

// Verify offline indicator appears
await mcp__playwright__browser_snapshot();
await mcp__playwright__browser_wait_for({text: "Connection lost"});

// Restore connection and verify sync
await mcp__playwright__browser_evaluate({
  function: '() => { window.dispatchEvent(new Event("online")); }'
});

await mcp__playwright__browser_wait_for({text: "Reconnected"});

// 2. Rapid channel switching performance test
const switchingStartTime = Date.now();
for (let i = 0; i < 5; i++) {
  await mcp__playwright__browser_click({
    element: `channel-${i}`,
    ref: `[data-testid='channel-${i}']`
  });
  await mcp__playwright__browser_wait_for({text: `Channel ${i} active`});
}
const switchingEndTime = Date.now();

// Verify switching is under 200ms per channel
expect(switchingEndTime - switchingStartTime).toBeLessThan(1000);

// 3. Error boundary testing
await mcp__playwright__browser_evaluate({
  function: '() => { window.triggerChannelError("invalid-channel"); }'
});

await mcp__playwright__browser_snapshot();
await mcp__playwright__browser_wait_for({text: "Channel temporarily unavailable"});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Connection state tracking with visual indicators
- [ ] Offline message persistence working across page reloads
- [ ] Error boundaries prevent app crashes from channel issues
- [ ] Channel switching optimized to <200ms response time
- [ ] Message deduplication prevents duplicates after reconnection

### Integration & Performance:
- [ ] Seamless integration with Round 1 components
- [ ] Error handling provides clear user feedback
- [ ] Offline functionality tested with real network conditions
- [ ] Performance optimizations maintain 60fps during switching
- [ ] Connection recovery automatic and transparent

### Evidence Package Required:
- [ ] Screenshots of error states and recovery
- [ ] Playwright test results for offline scenarios
- [ ] Performance metrics for channel operations
- [ ] Network failure recovery demonstration
- [ ] Test coverage report >85%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/websocket/` (enhance existing)
- Error Handling: `/wedsync/src/components/websocket/ChannelErrorBoundary.tsx`
- Offline Sync: `/wedsync/src/components/websocket/OfflineMessageSync.tsx`
- Connection Status: `/wedsync/src/components/websocket/ConnectionStatusIndicator.tsx`
- Tests: `/wedsync/tests/websocket/channel-management/` (add error scenarios)

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch31/WS-203-team-a-round-2-complete.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-203 | ROUND_2_COMPLETE | team-a | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Build UPON Round 1 components, don't recreate them
- Test offline scenarios with real network disconnection
- Do NOT modify backend endpoints (Team B responsibility)
- REMEMBER: All 5 teams work in PARALLEL on this feature

## 🏁 ROUND 2 COMPLETION CHECKLIST
- [ ] Enhanced error handling implemented
- [ ] Offline capabilities working
- [ ] Performance optimizations complete
- [ ] Security validation passed
- [ ] Integration testing successful
- [ ] Documentation updated

---

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY