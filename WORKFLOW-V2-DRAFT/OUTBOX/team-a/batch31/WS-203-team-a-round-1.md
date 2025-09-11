# TEAM A - ROUND 1: WS-203 - WebSocket Channels - Frontend Channel Management Components

**Date:** 2025-08-28  
**Feature ID:** WS-203 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build frontend channel management components for multi-channel real-time communication system  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier working with multiple couples simultaneously
**I want to:** Have organized real-time communication channels for each wedding I'm managing
**So that:** Updates from different weddings don't get mixed up and I can collaborate efficiently, preventing 5+ hours of confusion per month

**Real Wedding Problem This Solves:**
A photographer manages 8 weddings this month. Sarah's wedding updates her timeline, while simultaneously, Mike's wedding changes the venue. With proper channel separation, the photographer sees Sarah's timeline update in her dedicated channel and Mike's venue change in his channel. Without this, all updates would flood a single feed, causing critical information to be missed and requiring constant clarification calls.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Build frontend components for WebSocket channel management including:
- ChannelManager for handling multiple channel subscriptions
- ChannelIndicator showing connection status and unread counts
- MessageQueue for offline message handling
- Channel switching and isolation UI

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Real-time: Supabase Realtime channels with broadcast
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Backend API: Channel creation and subscription endpoints (Team B responsibility)
- Database: websocket_channels and channel_subscriptions tables (Team D responsibility)
- Real-time: Supabase channel subscriptions and event handling

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Supabase realtime channels broadcast"
// - "React useEffect cleanup patterns"
// - "Next.js real-time WebSocket patterns"

// For this specific feature, also search:
// - "React multi-channel subscription management"
// - "WebSocket connection status indicators"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("RealtimeProvider", "", true);
await mcp__serena__get_symbols_overview("/src/components/providers");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "WebSocket channel management frontend"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Real-time communication components"
3. **ui-ux-designer** --think-ultra-hard --follow-existing-patterns "Multi-channel interface design" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs from Step 1. Follow Serena patterns for real-time features."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] ChannelManager component with subscription handling
- [ ] ChannelIndicator component with status and unread counts
- [ ] MessageQueue component for offline message display
- [ ] useChannelSubscription hook for React integration
- [ ] Channel naming convention implementation (`scope:entity:id`)
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for channel switching

### What other teams NEED from you:
- TO Team B: Frontend requirements for channel API endpoints
- TO Team D: Database query requirements for channel management

### What you NEED from other teams:
- FROM Team B: Channel creation and subscription API endpoints
- FROM Team D: Database schema for websocket_channels table

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ ALWAYS validate channel access permissions
const validateChannelAccess = async (channelName: string, userId: string) => {
  // Verify user has permission to subscribe to this channel
  const hasAccess = await checkChannelPermission(channelName, userId);
  if (!hasAccess) {
    throw new Error('Unauthorized channel access');
  }
};

// ✅ ALWAYS sanitize channel data
import { sanitizeString } from '@/lib/security/input-validation';

const processChannelMessage = (message: any) => {
  return {
    ...message,
    content: sanitizeString(message.content),
    metadata: sanitizeChannelMetadata(message.metadata)
  };
};
```

**SECURITY CHECKLIST:**
- [ ] **Channel Access Control**: Verify user permissions before subscription
- [ ] **Input Validation**: Sanitize all channel messages and metadata
- [ ] **Rate Limiting**: Prevent channel subscription abuse
- [ ] **XSS Prevention**: Sanitize message content before display
- [ ] **Error Handling**: Never expose channel subscription errors to unauthorized users

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Multi-channel subscription testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/supplier/dashboard"});

// Test channel indicator display
const channelIndicators = await mcp__playwright__browser_snapshot();

// Test channel switching
await mcp__playwright__browser_click({
  element: "channel selector",
  ref: "[data-testid='channel-sarah-wedding']"
});

await mcp__playwright__browser_wait_for({text: "Sarah's Wedding Channel"});

// 2. Offline message queue testing
await mcp__playwright__browser_evaluate({
  function: '() => { window.dispatchEvent(new Event("offline")); }'
});

// Verify queue indicator appears
await mcp__playwright__browser_snapshot();

// 3. Real-time message testing with multi-tab
await mcp__playwright__browser_tabs({action: "new"});
await mcp__playwright__browser_navigate({url: "http://localhost:3000/couple/dashboard"});
// Send message from couple tab, verify supplier receives it
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete and tested
- [ ] Channel subscription management working with 3+ concurrent channels
- [ ] Offline message queuing functional
- [ ] Channel switching responsive (<200ms)
- [ ] Zero TypeScript errors and console errors

### Integration & Performance:
- [ ] Components integrate with existing RealtimeProvider
- [ ] Channel indicators update in real-time
- [ ] Message queue persists during offline/online cycles
- [ ] Responsive design on all screen sizes
- [ ] Accessibility validation passed

### Evidence Package Required:
- [ ] Screenshots of working channel management interface
- [ ] Playwright test results for multi-channel scenarios
- [ ] Performance metrics for channel switching
- [ ] Console error-free proof
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/websocket/`
- Hooks: `/wedsync/src/hooks/useChannelSubscription.ts`
- Tests: `/wedsync/tests/websocket/channel-management/`
- Types: `/wedsync/src/types/websocket.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch31/WS-203-team-a-round-1-complete.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-203 | ROUND_1_COMPLETE | team-a | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT create backend API endpoints (Team B responsibility)
- Do NOT modify database schema (Team D responsibility)
- Do NOT skip tests - write them FIRST
- REMEMBER: All 5 teams work in PARALLEL on this feature

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] Core channel management components built
- [ ] Real-time subscription handling implemented
- [ ] Offline queue functionality working
- [ ] Security validated and tested
- [ ] Performance targets met
- [ ] Comprehensive documentation created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY