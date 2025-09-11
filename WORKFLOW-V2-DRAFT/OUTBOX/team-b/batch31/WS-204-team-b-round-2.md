# TEAM B - ROUND 2: WS-204 - Presence Tracking System - Advanced Backend Features & Activity Analytics

**Date:** 2025-08-28  
**Feature ID:** WS-204 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Enhance presence tracking with advanced analytics, custom status management, and performance optimization  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding planning team member managing complex coordination
**I want to:** Advanced presence features like custom status, activity analytics, and team availability insights
**So that:** I can make informed decisions about when to reach out to specific vendors and track team engagement patterns

**Real Wedding Problem This Solves:**
The venue coordinator notices the photographer has been "Active in Timeline" for 20 minutes (detailed activity tracking), the florist set a custom status "At venue until 3pm" (custom status), and analytics show the catering team is most responsive on weekday mornings (activity analytics). She schedules her most important coordination calls during these optimal times, reducing response delays from hours to minutes.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Enhance Round 1 backend with:
- Custom status management system
- Activity analytics and insights generation
- Team availability pattern analysis
- Advanced presence privacy controls
- Performance optimization for high-frequency updates

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions, Realtime Presence
- Real-time: Supabase Presence API
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Frontend: Enhanced presence components from Team A Round 2
- Database: Analytics tables and custom status storage
- Real-time: Advanced presence broadcasting with Team C

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Supabase Edge Functions analytics"
// - "PostgreSQL window functions analytics"
// - "Real-time data aggregation patterns"

// For this specific feature, also search:
// - "Time series analysis PostgreSQL"
// - "User activity tracking analytics"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Round 1 presence backend:
await mcp__serena__find_symbol("PresenceManager", "", true);
await mcp__serena__get_symbols_overview("/src/lib/presence");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Advanced presence backend analytics"
2. **database-mcp-specialist** --think-hard --use-loaded-docs "Presence analytics schema design"
3. **performance-optimization-expert** --think-ultra-hard --follow-existing-patterns "High-frequency presence updates" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **postgresql-database-expert** --analytics-optimization --performance-tuning
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Build advanced analytics on top of Round 1 presence foundation."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Backend Features):
- [ ] Custom status management API endpoints
- [ ] Activity analytics generation system
- [ ] Team availability pattern analysis
- [ ] Enhanced presence privacy controls API
- [ ] Performance-optimized presence update handling
- [ ] Advanced database analytics functions
- [ ] Comprehensive API testing with realistic data

### What other teams NEED from you:
- TO Team A: Enhanced presence API with analytics endpoints
- TO Team C: Activity metrics for broadcast system integration

### What you NEED from other teams:
- FROM Team A: Frontend requirements for custom status display
- FROM Team D: Database schema for analytics storage

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ ALWAYS validate custom status content
const validateCustomStatus = (status: string, emoji: string) => {
  const sanitizedStatus = sanitizeString(status, { maxLength: 100 });
  const validatedEmoji = validateEmoji(emoji);
  
  if (containsProfanity(sanitizedStatus)) {
    throw new ValidationError('Custom status contains inappropriate content');
  }
  
  return { status: sanitizedStatus, emoji: validatedEmoji };
};

// ✅ ALWAYS protect analytics data
const getAnalyticsWithPrivacy = async (userId: string, requesterId: string) => {
  const privacySettings = await getPrivacySettings(userId);
  
  if (!canViewAnalytics(requesterId, userId, privacySettings)) {
    return getPublicAnalyticsOnly(userId);
  }
  
  return getDetailedAnalytics(userId);
};

// ✅ ALWAYS rate limit presence updates
const presenceUpdateLimiter = createRateLimiter({
  max: 30, // 30 updates per minute per user
  windowMs: 60000
});
```

**SECURITY CHECKLIST:**
- [ ] **Custom Status Validation**: Sanitize and validate all custom status content
- [ ] **Analytics Privacy**: Respect user privacy settings in analytics data
- [ ] **Rate Limiting**: Prevent presence update spam and abuse
- [ ] **Data Access Control**: Verify permissions for analytics data access
- [ ] **Activity Tracking**: Only track necessary data with user consent

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Custom status management testing
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api-test-dashboard"});

// Test custom status API
const statusResponse = await mcp__playwright__browser_evaluate({
  function: `async () => {
    return await fetch('/api/presence/status', {
      method: 'POST',
      body: JSON.stringify({
        status: 'At venue until 3pm',
        emoji: '📍'
      })
    }).then(r => r.json());
  }`
});

expect(statusResponse.success).toBe(true);

// 2. Activity analytics testing
const analyticsResponse = await mcp__playwright__browser_evaluate({
  function: `async () => {
    return await fetch('/api/presence/analytics/weekly', {
      method: 'GET'
    }).then(r => r.json());
  }`
});

expect(analyticsResponse.data.averageResponseTime).toBeDefined();
expect(analyticsResponse.data.peakActivityHours).toBeArray();

// 3. Performance testing with high-frequency updates
const startTime = Date.now();

await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Simulate rapid presence updates
    for (let i = 0; i < 100; i++) {
      await fetch('/api/presence/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ timestamp: Date.now() })
      });
    }
  }`
});

const endTime = Date.now();
const totalTime = endTime - startTime;

// Should handle 100 updates in under 5 seconds
expect(totalTime).toBeLessThan(5000);

// 4. Privacy controls testing
const publicAnalytics = await mcp__playwright__browser_evaluate({
  function: `async () => {
    return await fetch('/api/presence/analytics/user/public-user-id', {
      method: 'GET'
    }).then(r => r.json());
  }`
});

// Should only return public metrics
expect(publicAnalytics.data.detailedActivity).toBeUndefined();
expect(publicAnalytics.data.generalAvailability).toBeDefined();
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Custom status API supports 100+ character status with emoji
- [ ] Activity analytics generate meaningful insights from presence data
- [ ] Team availability patterns identified with statistical accuracy
- [ ] Privacy controls properly filter analytics data access
- [ ] Presence updates handle 1000+ users with <100ms response time

### Integration & Performance:
- [ ] Enhanced API integrates seamlessly with Round 1 presence system
- [ ] Analytics queries execute in <500ms for typical team sizes
- [ ] Custom status propagates to all connected clients in real-time
- [ ] Privacy settings respected across all analytics endpoints
- [ ] Performance optimizations maintain system responsiveness

### Evidence Package Required:
- [ ] API documentation with all new endpoints
- [ ] Performance benchmarks for high-frequency updates
- [ ] Analytics accuracy validation with test data
- [ ] Privacy control verification results
- [ ] Load testing results for presence system

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API Routes: `/wedsync/src/app/api/presence/` (enhance existing)
- Analytics: `/wedsync/src/app/api/presence/analytics/`
- Custom Status: `/wedsync/src/app/api/presence/status/`
- Backend Logic: `/wedsync/src/lib/presence/` (enhance existing)
- Database Functions: `/wedsync/supabase/functions/presence-analytics/`
- Tests: `/wedsync/tests/presence/backend-advanced/`

### Database Migrations:
- **CRITICAL**: Create migration file but DO NOT APPLY
- **Send to SQL Expert**: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-204.md`
- Migration file: `/wedsync/supabase/migrations/[timestamp]_presence_analytics_tables.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch31/WS-204-team-b-round-2-complete.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-204 | ROUND_2_COMPLETE | team-b | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Build UPON Round 1 presence system, don't recreate it
- Custom status must be properly validated for security
- Analytics must respect user privacy settings
- Performance is critical - presence updates are high-frequency
- Do NOT apply database migrations yourself (SQL Expert responsibility)

## 🏁 ROUND 2 COMPLETION CHECKLIST
- [ ] Advanced presence analytics implemented
- [ ] Custom status management working
- [ ] Privacy controls functional
- [ ] Performance optimizations complete
- [ ] API documentation updated
- [ ] Migration request sent to SQL Expert

---

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY