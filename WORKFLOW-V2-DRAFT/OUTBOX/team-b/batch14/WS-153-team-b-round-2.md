# TEAM B - ROUND 2: WS-153 - Photo Groups Management - Advanced API Features & Real-time

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Implement advanced API features, real-time capabilities, and complex business logic  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Advanced API functionality for scheduling, conflict detection, and real-time collaboration
**So that:** Multiple people can coordinate photo group planning simultaneously without conflicts

**Real Wedding Problem This Solves:**
Building on Round 1's CRUD operations, the wedding couple, maid of honor, and photographer can now collaborate in real-time to schedule photo sessions, with automatic conflict detection preventing double-booking guests and intelligent scheduling suggestions.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification & Round 1 Foundation:**
- Real-time API endpoints for collaborative editing
- Advanced conflict detection algorithms
- Scheduling optimization business logic
- Batch operations for large guest lists
- Photo group analytics and reporting APIs
- Integration with external calendar systems

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Real-time: Supabase Realtime channels
- API: Next.js App Router API routes with streaming

**Integration Points:**
- **Team A UI**: Provide APIs for advanced scheduling features
- **Team C Database**: Use optimized queries and functions
- **Real-time**: Supabase channels for live collaboration
- **External**: Calendar API integrations (Google, Outlook)

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");  
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes streaming server-actions", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime channels edge-functions", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database functions triggers", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW Round 1 API implementation:
await mcp__serena__find_symbol("photo-groups", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api/photo-groups");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Advanced API development"
2. **api-architect** --think-hard --use-loaded-docs "Real-time collaboration APIs" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Photo session business logic" 
4. **security-compliance-officer** --think-ultra-hard --api-security-advanced
5. **test-automation-architect** --api-testing --load-testing-approach
6. **performance-optimization-expert** --api-performance --database-optimization
7. **database-mcp-specialist** --advanced-queries --real-time-optimization

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced API Features):
- [ ] **Real-time Collaboration API** - `/api/photo-groups/realtime/[id]`
- [ ] **Conflict Detection API** - `/api/photo-groups/conflicts/detect`
- [ ] **Scheduling Optimization API** - `/api/photo-groups/schedule/optimize`
- [ ] **Batch Operations API** - `/api/photo-groups/batch` (bulk create/update/delete)
- [ ] **Analytics API** - `/api/photo-groups/analytics/[coupleId]`
- [ ] **Calendar Integration API** - `/api/photo-groups/calendar/sync`
- [ ] **Edge Functions** - Supabase Edge Functions for complex calculations
- [ ] **Webhook Handlers** - External calendar sync webhooks

### Advanced Business Logic:
- [ ] Smart conflict detection (person in multiple groups at same time)
- [ ] Optimal scheduling algorithm (minimize downtime, maximize efficiency)
- [ ] Guest availability tracking and validation
- [ ] Photographer workload balancing
- [ ] Location-based scheduling optimization
- [ ] Priority-based group ordering logic

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (Round 1 Complete):
- FROM Team C: Optimized database functions and triggers - **READY**
- FROM Team A: UI component requirements for advanced features - **NEW REQUESTS**

### What other teams NEED from you:
- TO Team A: Real-time API endpoints for live updates
- TO Team D: Calendar sync APIs for WedMe platform
- TO Team E: Performance-optimized APIs for testing

---

## 🔒 SECURITY REQUIREMENTS (ADVANCED API SECURITY)

### Advanced API Security:
- [ ] **Rate Limiting**: Advanced rate limiting for real-time APIs
- [ ] **Real-time Authentication**: Secure WebSocket connections
- [ ] **Batch Operation Security**: Validate bulk operations permissions
- [ ] **Calendar Integration Security**: OAuth token management
- [ ] **Webhook Security**: Verify external webhook signatures

```typescript
// Real-time API security example
export async function POST(request: NextRequest) {
  // Validate WebSocket upgrade and user permissions
  const upgradeHeader = request.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }
  
  const userId = await validateUserSession(request);
  const coupleId = await getCoupleId(userId);
  
  // Create secure channel with user isolation
  const channel = `photo_groups:${coupleId}`;
  
  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });
}
```

### 🗄️ DATABASE MIGRATION REQUIREMENTS

```typescript
// Create migration for Round 2 advanced features
// FILE: /wedsync/supabase/migrations/[timestamp]_photo_groups_advanced_features.sql

CREATE OR REPLACE FUNCTION detect_photo_group_conflicts(
  couple_id UUID,
  group_id UUID DEFAULT NULL
) RETURNS TABLE (
  conflict_type VARCHAR(50),
  conflicting_groups UUID[],
  affected_guests UUID[],
  conflict_details JSONB
) AS $$
BEGIN
  -- Advanced conflict detection logic
  RETURN QUERY
  SELECT 
    'time_overlap'::VARCHAR(50),
    array_agg(DISTINCT pg.id),
    array_agg(DISTINCT pgm.guest_id),
    jsonb_build_object(
      'start_time', min(pg.scheduled_start),
      'end_time', max(pg.scheduled_end),
      'overlap_duration', interval '15 minutes'
    )
  FROM photo_groups pg
  JOIN photo_group_members pgm ON pg.id = pgm.photo_group_id
  WHERE pg.couple_id = couple_id
  AND (group_id IS NULL OR pg.id != group_id)
  GROUP BY pg.scheduled_start, pg.scheduled_end
  HAVING count(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send to SQL Expert for application
```

---

## 🎭 ADVANCED API TESTING (ROUND 2)

```javascript
// REAL-TIME COLLABORATION TESTING
describe('Photo Groups Real-time API', () => {
  test('Multiple users can collaborate simultaneously', async () => {
    // Create WebSocket connections for multiple users
    const user1Connection = await createRealtimeConnection('user1');
    const user2Connection = await createRealtimeConnection('user2');
    
    // User 1 creates a photo group
    await user1Connection.send({
      type: 'CREATE_GROUP',
      data: { name: 'Family Photos', guests: ['guest1', 'guest2'] }
    });
    
    // Verify User 2 receives real-time update
    const user2Update = await user2Connection.waitForMessage();
    expect(user2Update.type).toBe('GROUP_CREATED');
    expect(user2Update.data.name).toBe('Family Photos');
    
    // Test conflict detection in real-time
    await user2Connection.send({
      type: 'SCHEDULE_GROUP', 
      data: { groupId: 'family-photos', time: '2:00 PM' }
    });
    
    await user1Connection.send({
      type: 'SCHEDULE_GROUP',
      data: { groupId: 'friends-photos', time: '2:15 PM', guests: ['guest1'] }
    });
    
    // Both users should receive conflict warning
    const conflict1 = await user1Connection.waitForMessage();
    const conflict2 = await user2Connection.waitForMessage();
    
    expect(conflict1.type).toBe('CONFLICT_DETECTED');
    expect(conflict2.type).toBe('CONFLICT_DETECTED');
  });
});

// PERFORMANCE TESTING
describe('Photo Groups Performance', () => {
  test('Handles large guest lists efficiently', async () => {
    const startTime = Date.now();
    
    // Create photo group with 100 guests
    const response = await fetch('/api/photo-groups/batch', {
      method: 'POST',
      body: JSON.stringify({
        groups: [{
          name: 'Large Family',
          guests: Array.from({length: 100}, (_, i) => `guest-${i}`)
        }]
      })
    });
    
    const endTime = Date.now();
    
    expect(response.ok).toBe(true);
    expect(endTime - startTime).toBeLessThan(2000); // Under 2 seconds
  });
});
```

---

## ✅ SUCCESS CRITERIA (ADVANCED API FEATURES)

### Technical Implementation:
- [ ] All Round 2 API endpoints complete and tested
- [ ] Real-time collaboration working smoothly
- [ ] Conflict detection accurate and performant
- [ ] Batch operations handle large datasets efficiently
- [ ] Calendar integration functional
- [ ] Edge functions deployed and optimized

### Performance & Reliability:
- [ ] API response times < 200ms for simple operations
- [ ] Real-time updates delivered within 100ms
- [ ] Batch operations handle 1000+ guests without timeout
- [ ] Zero data loss during concurrent operations
- [ ] 99.9% uptime for real-time connections

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- APIs: `/wedsync/src/app/api/photo-groups/realtime/[id]/route.ts`
- APIs: `/wedsync/src/app/api/photo-groups/conflicts/detect/route.ts`
- APIs: `/wedsync/src/app/api/photo-groups/schedule/optimize/route.ts`
- APIs: `/wedsync/src/app/api/photo-groups/batch/route.ts`
- Edge Functions: `/wedsync/supabase/functions/photo-group-optimizer/`
- Services: `/wedsync/src/lib/services/photoGroupRealtimeService.ts`
- Tests: `/wedsync/src/__tests__/api/photo-groups-advanced.test.ts`

### Migrations:
- **Create:** `/wedsync/supabase/migrations/[timestamp]_photo_groups_advanced_features.sql`
- **Send to SQL Expert:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153-round2.md`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch14/WS-153-team-b-round-2-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_2_COMPLETE | team-b | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All advanced API features implemented
- [ ] Real-time collaboration tested and working
- [ ] Database functions created and migration sent to SQL Expert
- [ ] Performance targets met
- [ ] Security measures implemented
- [ ] Integration points ready for other teams

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY