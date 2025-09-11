# TEAM C - ROUND 1: WS-205 - Broadcast Events System - Integration & Event Management

**Date:** 2025-08-28  
**Feature ID:** WS-205 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build broadcast event integration layer with priority queuing and notification management  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer managing 15 active weddings
**I want to:** Receive system-wide updates and wedding-specific notifications in an organized way
**So that:** I never miss critical updates like payment deadlines or wedding timeline changes, preventing disasters and saving 4+ hours weekly on checking for updates

**Real Wedding Problem This Solves:**
A photographer needs to know immediately when: the platform has scheduled maintenance during a busy weekend, their subscription is about to expire, a couple has changed the ceremony time for tomorrow's wedding, or a new feature launches that could save them hours. Without organized broadcasts, they'd need to constantly check emails, dashboard alerts, and individual wedding pages. With this system, critical updates appear instantly while less urgent ones are batched appropriately.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Build broadcast event integration system including:
- Event dispatcher for different priority levels
- Priority queue management for message ordering
- Integration with existing notification systems
- Cross-channel event coordination
- System-wide and targeted broadcast handling

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions, Event-driven architecture
- Real-time: Supabase Broadcast channels
- Integration: Email, SMS, Push notifications
- Testing: Playwright MCP, Vitest

**Integration Points:**
- WebSocket Channels: Broadcasting to specific channels (WS-203)
- Presence System: User availability for immediate delivery (WS-204)
- Notification System: Email/SMS fallback for offline users
- Frontend: Toast notifications and broadcast center (Team A responsibility)

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Event-driven architecture patterns"
// - "Priority queue implementation Node.js"
// - "Supabase broadcast channels integration"

// For this specific feature, also search:
// - "Real-time event dispatching patterns"
// - "Notification priority queue systems"
// - "WebSocket event broadcasting"

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns:
await mcp__serena__find_symbol("EventDispatcher", "", true);
await mcp__serena__get_symbols_overview("/src/lib/events");
await mcp__serena__get_symbols_overview("/src/lib/notifications");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Broadcast events integration system"
2. **integration-specialist** --think-hard --use-loaded-docs "Event-driven architecture and messaging"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "Event queue and priority management" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **nextjs-fullstack-developer** --think-hard --event-driven-systems
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Focus on integration between real-time systems and notification delivery."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] BroadcastEventDispatcher service with priority handling
- [ ] PriorityQueue implementation for message ordering
- [ ] Event classification system (critical/high/medium/low priority)
- [ ] Integration layer between WebSocket channels and broadcast system
- [ ] Notification fallback system for offline users
- [ ] Event persistence for reliable delivery
- [ ] Unit tests with >80% coverage
- [ ] Integration tests with mock channels

### What other teams NEED from you:
- TO Team A: Event format specifications and broadcast APIs
- TO Team B: Integration patterns for presence-aware broadcasting

### What you NEED from other teams:
- FROM Team A: Frontend event handling requirements
- FROM Team B: Presence data for smart delivery decisions
- FROM Team D: Database schema for event persistence

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ MANDATORY SECURITY PATTERN for event broadcasting:
import { validateBroadcastPermission } from '@/lib/security/permissions';
import { sanitizeBroadcastData } from '@/lib/security/input-validation';

export class SecureBroadcastDispatcher {
  async dispatchEvent(
    eventType: string,
    payload: any,
    targetUsers: string[],
    senderId: string
  ) {
    // 1. Validate sender permissions
    const hasPermission = await validateBroadcastPermission(senderId, eventType);
    if (!hasPermission) {
      throw new Error('Unauthorized broadcast attempt');
    }
    
    // 2. Sanitize payload data
    const sanitizedPayload = sanitizeBroadcastData(payload);
    
    // 3. Validate target users
    const authorizedTargets = await validateTargetUsers(targetUsers, senderId);
    
    // 4. Dispatch with audit logging
    await this.logBroadcastAttempt(senderId, eventType, authorizedTargets.length);
    return await this.sendBroadcast(eventType, sanitizedPayload, authorizedTargets);
  }
}

// ✅ ALWAYS validate broadcast content
const validateBroadcastContent = (payload: any) => {
  // Check for malicious content
  // Validate data structure
  // Ensure no sensitive data exposure
  return sanitizedPayload;
};
```

**SECURITY CHECKLIST:**
- [ ] **Authorization**: Verify sender permissions for broadcast type
- [ ] **Content Validation**: Sanitize all broadcast payload data
- [ ] **Target Validation**: Ensure sender can broadcast to target users
- [ ] **Rate Limiting**: Prevent broadcast spam (max 50 broadcasts/hour per user)
- [ ] **Audit Logging**: Log all broadcast attempts with sender/target info
- [ ] **Data Sanitization**: Remove sensitive data from broadcast payloads

---

## 💾 DATABASE MIGRATION REQUIREMENTS

**⚠️ CRITICAL: CREATE MIGRATION REQUEST FOR TEAM D**

Create file: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-205.md`

```markdown
# Migration Request: WS-205 Broadcast Events System

**Tables Required:**
- broadcast_events (event persistence and delivery tracking)
- broadcast_subscriptions (user notification preferences)
- broadcast_queue (priority queue for reliable delivery)

**Key Requirements:**
- Priority-based indexing for queue processing
- Delivery status tracking
- Event expiration handling

**Dependencies:** Requires websocket_channels from WS-203
**Testing Status:** Will be tested after integration implementation
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Priority queue event ordering
test('Events dispatch in correct priority order', async () => {
  // Send low priority event
  await sendBroadcast('low', { message: 'Low priority' });
  
  // Send critical priority event  
  await sendBroadcast('critical', { message: 'Critical!' });
  
  // Verify critical event processed first
  const events = await getProcessedEvents();
  expect(events[0].priority).toBe('critical');
});

// 2. Cross-channel event coordination
test('Broadcasts reach all subscribed channels', async () => {
  // Setup multiple channel subscriptions
  const channels = ['supplier:dashboard:123', 'collaboration:456'];
  
  // Send system-wide broadcast
  await sendSystemBroadcast({
    type: 'maintenance',
    message: 'System maintenance in 1 hour'
  });
  
  // Verify all channels receive the broadcast
  for (const channel of channels) {
    const messages = await getChannelMessages(channel);
    expect(messages.some(m => m.type === 'maintenance')).toBe(true);
  }
});

// 3. Offline user fallback handling
test('Offline users receive notifications via fallback methods', async () => {
  // Mark user as offline
  await setUserPresence('user123', 'offline');
  
  // Send critical broadcast
  await sendBroadcast('critical', {
    message: 'Urgent wedding update',
    targetUsers: ['user123']
  });
  
  // Verify email/SMS fallback triggered
  const notifications = await getQueuedNotifications('user123');
  expect(notifications.length).toBeGreaterThan(0);
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete and tested
- [ ] Priority queue processes 1000+ events/minute
- [ ] Event classification correctly prioritizes critical updates
- [ ] Integration with WebSocket channels functional
- [ ] Offline fallback system working reliably

### Integration & Performance:
- [ ] Events dispatch within 100ms for critical priority
- [ ] Priority queue maintains order under load
- [ ] Cross-channel broadcasting works seamlessly
- [ ] Fallback notifications trigger for offline users
- [ ] Event persistence prevents message loss

### Evidence Package Required:
- [ ] Integration test results showing event flow
- [ ] Performance metrics for priority queue processing
- [ ] Cross-channel broadcast validation
- [ ] Offline fallback test results
- [ ] Security validation for broadcast permissions

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Services: `/wedsync/src/lib/broadcast/`
- Integration: `/wedsync/src/lib/events/`
- Queue: `/wedsync/src/lib/queue/`
- Tests: `/wedsync/tests/integration/broadcast/`
- Types: `/wedsync/src/types/broadcast.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch31/WS-205-team-c-round-1-complete.md`
- **Migration request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-205.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-205 | ROUND_1_COMPLETE | team-c | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT create frontend components (Team A responsibility)
- Do NOT implement database schema directly (Team D responsibility)
- Do NOT skip security validation for broadcast permissions
- REMEMBER: Integration layer must work with WS-203 and WS-204

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] Event dispatch system built with priority queue
- [ ] Integration with existing real-time systems
- [ ] Security permissions and validation implemented
- [ ] Offline fallback system functional
- [ ] Performance targets met for event processing
- [ ] Migration request sent to Team D

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY