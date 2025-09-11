# TEAM C - ROUND 2: WS-205 - Broadcast Events System - Advanced Event Filtering & Smart Delivery

**Date:** 2025-08-28  
**Feature ID:** WS-205 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Enhance broadcast system with intelligent filtering, user preference management, and delivery optimization  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding venue coordinator managing complex vendor relationships
**I want to:** Smart broadcast filtering that learns my preferences and delivers the right information at the right time
**So that:** I only receive urgent notifications during peak coordination hours while less critical updates are batched for my review time

**Real Wedding Problem This Solves:**
The venue coordinator is in critical setup mode 2 hours before ceremony start. The system recognizes this context and: immediately pushes urgent alerts (weather warning, vendor delay), queues medium-priority updates (contract renewals, new features) for after the ceremony, and completely filters out promotional content. During normal hours, all content flows through with smart grouping by relevance. This prevents information overload during critical moments while ensuring nothing important is missed.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Enhance Round 1 broadcast system with:
- Intelligent event filtering based on user context
- User preference management and learning algorithms
- Smart delivery timing optimization
- Event bundling and batching logic
- Context-aware notification prioritization

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions, Event-driven architecture
- Real-time: Supabase Broadcast channels
- Integration: Email, SMS, Push notifications
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Enhanced WebSocket Channels: Smart broadcast routing
- Presence System: Context-aware delivery timing
- AI System: Machine learning for preference optimization
- User Analytics: Behavior-based filtering improvements

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Event-driven architecture patterns"
// - "Smart notification filtering algorithms"
// - "User preference machine learning"

// For this specific feature, also search:
// - "Contextual notification systems"
// - "Event bundling and batching strategies"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Round 1 broadcast system:
await mcp__serena__find_symbol("BroadcastEventDispatcher", "", true);
await mcp__serena__get_symbols_overview("/src/lib/broadcast");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Intelligent broadcast filtering system"
2. **integration-specialist** --think-hard --use-loaded-docs "Smart notification delivery"
3. **ai-ml-engineer** --think-ultra-hard --follow-existing-patterns "User preference learning algorithms" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **performance-optimization-expert** --notification-performance --delivery-optimization
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Build intelligent filtering on top of Round 1 broadcast foundation. Focus on user experience and context awareness."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Filtering & Smart Delivery):
- [ ] BroadcastFilter component with ML-based preference learning
- [ ] UserPreferenceManager for storing and updating filter preferences
- [ ] ContextAwareDelivery system recognizing user activity patterns
- [ ] EventBundler for intelligent message grouping
- [ ] SmartTimingEngine for optimal delivery scheduling
- [ ] Enhanced integration testing with realistic user scenarios
- [ ] Performance optimization for high-volume broadcast handling

### What other teams NEED from you:
- TO Team A: Smart filtering requirements for frontend displays
- TO Team D: User behavior data for AI preference optimization

### What you NEED from other teams:
- FROM Team B: User presence context for delivery timing
- FROM Team D: AI insights for preference learning algorithms

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ ALWAYS validate broadcast content before filtering
const validateBroadcastContent = (event: BroadcastEvent) => {
  const sanitizedContent = {
    ...event,
    title: sanitizeString(event.title),
    content: sanitizeHTML(event.content),
    metadata: sanitizeObject(event.metadata)
  };
  
  if (containsSensitiveData(sanitizedContent)) {
    throw new SecurityError('Broadcast contains sensitive information');
  }
  
  return sanitizedContent;
};

// ✅ ALWAYS protect user preference data
const encryptUserPreferences = (preferences: UserPreferences) => {
  return {
    ...preferences,
    filterSettings: encryptSensitiveData(preferences.filterSettings),
    behaviorHistory: anonymizeUserData(preferences.behaviorHistory)
  };
};

// ✅ ALWAYS rate limit preference updates
const preferenceUpdateLimiter = createRateLimiter({
  max: 20, // 20 preference updates per hour
  windowMs: 3600000
});
```

**SECURITY CHECKLIST:**
- [ ] **Content Validation**: Sanitize all broadcast content before processing
- [ ] **Preference Privacy**: Encrypt and protect user preference data
- [ ] **Rate Limiting**: Prevent preference manipulation and system abuse
- [ ] **Data Anonymization**: Anonymize behavior data used for learning
- [ ] **Access Control**: Verify permissions for preference management

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Intelligent filtering behavior testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/supplier/dashboard"});

// Set user in "critical setup" context
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.setUserContext('critical_wedding_setup', {
      weddingId: 'sarah-wedding-123',
      timeUntilEvent: 120, // 2 hours
      role: 'venue_coordinator'
    });
  }`
});

// Send mixed priority broadcasts
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Urgent: weather alert
    await window.sendTestBroadcast({
      priority: 'urgent',
      content: 'Weather Alert: Rain expected during ceremony',
      category: 'weather'
    });
    
    // Medium: contract renewal
    await window.sendTestBroadcast({
      priority: 'medium', 
      content: 'Contract renewal available',
      category: 'business'
    });
    
    // Low: promotional content
    await window.sendTestBroadcast({
      priority: 'low',
      content: 'New premium features available',
      category: 'promotional'
    });
  }`
});

// Verify only urgent message appears immediately
await mcp__playwright__browser_wait_for({text: "Weather Alert"});
await mcp__playwright__browser_snapshot();

// Verify medium/low messages are queued
const queuedMessages = await mcp__playwright__browser_evaluate({
  function: '() => window.getQueuedBroadcasts()'
});

expect(queuedMessages.length).toBe(2);
expect(queuedMessages.find(m => m.category === 'promotional')).toBeDefined();

// 2. User preference learning test
// Simulate user dismissing promotional content repeatedly
for (let i = 0; i < 5; i++) {
  await mcp__playwright__browser_evaluate({
    function: `() => window.dismissBroadcast('promotional', 'not_interested')`
  });
}

// Send new promotional broadcast
await mcp__playwright__browser_evaluate({
  function: `() => window.sendTestBroadcast({
    priority: 'medium',
    content: 'Special offer for photographers',
    category: 'promotional'
  })`
});

// Verify system learned preference and filtered it
await new Promise(resolve => setTimeout(resolve, 1000));
const visibleBroadcasts = await mcp__playwright__browser_evaluate({
  function: '() => window.getVisibleBroadcasts()'
});

expect(visibleBroadcasts.find(b => b.content.includes('Special offer'))).toBeUndefined();

// 3. Smart delivery timing test
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Change context to normal working hours
    window.setUserContext('normal_work', {
      activityLevel: 'moderate',
      availabilityStatus: 'available'
    });
  }`
});

// Verify queued messages are now delivered
await mcp__playwright__browser_wait_for({text: "Contract renewal available"});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Intelligent filtering correctly prioritizes based on user context
- [ ] User preference learning demonstrates measurable improvement over time
- [ ] Context-aware delivery respects user activity patterns
- [ ] Event bundling reduces notification fatigue by 60%+
- [ ] Smart timing engine optimizes delivery for user engagement

### Integration & Performance:
- [ ] Seamless enhancement of Round 1 broadcast system
- [ ] Filtering decisions made in <50ms for real-time broadcasts
- [ ] Preference learning algorithms update efficiently without lag
- [ ] System handles 10,000+ broadcasts per hour with smart filtering
- [ ] Integration with presence and channel systems working flawlessly

### Evidence Package Required:
- [ ] Screenshots demonstrating context-aware filtering
- [ ] Analytics showing improved user engagement with smart delivery
- [ ] Performance metrics for filtering and preference updates
- [ ] User preference learning accuracy measurements
- [ ] Test coverage report >85%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Filtering: `/wedsync/src/lib/broadcast/smart-filter.ts`
- Preferences: `/wedsync/src/lib/broadcast/user-preference-manager.ts`
- Context Engine: `/wedsync/src/lib/broadcast/context-aware-delivery.ts`
- Bundling: `/wedsync/src/lib/broadcast/event-bundler.ts`
- ML Components: `/wedsync/src/lib/ai/preference-learning.ts`
- Tests: `/wedsync/tests/broadcast/intelligent-filtering/`

### Database Migrations:
- **CRITICAL**: Create migration file but DO NOT APPLY
- **Send to SQL Expert**: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-205.md`
- Migration file: `/wedsync/supabase/migrations/[timestamp]_broadcast_preferences_tables.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch31/WS-205-team-c-round-2-complete.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-205 | ROUND_2_COMPLETE | team-c | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Build UPON Round 1 broadcast system, don't recreate it
- Machine learning must be privacy-compliant with user data
- Context awareness must not compromise user privacy
- Performance is critical for real-time broadcast filtering
- Do NOT apply database migrations yourself (SQL Expert responsibility)

## 🏁 ROUND 2 COMPLETION CHECKLIST
- [ ] Intelligent filtering system implemented
- [ ] User preference learning working
- [ ] Context-aware delivery functional
- [ ] Performance optimizations complete
- [ ] Integration testing successful
- [ ] Migration request sent to SQL Expert

---

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY