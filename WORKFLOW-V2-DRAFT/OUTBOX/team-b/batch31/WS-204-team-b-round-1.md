# TEAM B - ROUND 1: WS-204 - Presence Tracking System - Backend Service & API

**Date:** 2025-08-28  
**Feature ID:** WS-204 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build backend presence tracking service with real-time status updates and API endpoints  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding venue coordinator working with multiple suppliers
**I want to:** See when photographers, caterers, and florists are online and actively viewing wedding details
**So that:** I can coordinate in real-time and get immediate responses, saving 3-4 hours per wedding on phone tag

**Real Wedding Problem This Solves:**
The venue coordinator needs to confirm final setup details 2 days before the wedding. She sees the photographer is online and viewing the timeline, the florist is idle but was active 5 minutes ago, and the caterer is offline. She messages the photographer knowing they'll see it immediately, sends a quick note to the florist who will likely see it soon, and schedules an email for the caterer. Without presence tracking, she'd call all three, likely reaching voicemail and playing phone tag for hours.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Build backend presence tracking system including:
- Presence state management using Supabase Realtime
- API endpoints for presence settings and last seen data
- Activity tracking and heartbeat management
- Privacy controls and visibility settings
- Real-time presence broadcast system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions, Realtime Presence
- Real-time: Supabase Presence API
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Frontend: Presence indicators and status components (Team A responsibility)
- Database: presence_settings and user_last_seen tables (Team D responsibility)
- Real-time: WebSocket channels integration (depends on WS-203)

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (not needed for backend-only work)

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Supabase presence API realtime"
// - "Next.js API routes middleware"
// - "Supabase edge functions TypeScript"

// For this specific feature, also search:
// - "Real-time presence heartbeat patterns"
// - "WebSocket presence tracking implementation"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("RealtimeProvider", "", true);
await mcp__serena__get_symbols_overview("/src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Presence tracking backend service"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "API routes and Edge Functions"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Realtime presence implementation" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --think-hard --rest-api-design
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use Ref MCP docs from Step 1. Follow Serena patterns for API design."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] PresenceManager service class with heartbeat functionality
- [ ] API endpoint `/api/presence/status` for presence updates
- [ ] API endpoint `/api/presence/settings` for privacy controls
- [ ] Supabase Edge Function for presence state management
- [ ] Activity tracking service with idle detection
- [ ] Database migration requests for presence tables
- [ ] Unit tests with >80% coverage
- [ ] Basic API integration tests

### What other teams NEED from you:
- TO Team A: API contracts and presence data format specifications
- TO Team D: Database schema requirements for presence tracking

### What you NEED from other teams:
- FROM Team D: Database schema implementation for presence tables
- FROM Team A: Frontend presence state requirements and UI needs

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ MANDATORY SECURITY PATTERN for ALL API routes:
import { withSecureValidation } from '@/lib/validation/middleware';
import { presenceSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  presenceSchema,
  async (request: NextRequest, validatedData) => {
    // Verify user can update this presence state
    const userId = request.headers.get('x-user-id');
    if (validatedData.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Your implementation here
  }
);

// ✅ ALWAYS validate presence visibility permissions
const validatePresenceAccess = async (viewerId: string, targetUserId: string) => {
  const settings = await getPresenceSettings(targetUserId);
  
  switch (settings.visibility) {
    case 'nobody':
      return false;
    case 'team':
      return await areTeamMembers(viewerId, targetUserId);
    case 'contacts':
      return await areConnected(viewerId, targetUserId);
    case 'everyone':
      return true;
    default:
      return false;
  }
};
```

**SECURITY CHECKLIST:**
- [ ] **Authentication Required**: All presence endpoints require valid session
- [ ] **Privacy Controls**: Respect user visibility settings (nobody/team/contacts/everyone)
- [ ] **Input Validation**: Validate all presence data with Zod schemas
- [ ] **Rate Limiting**: Prevent presence spam (max 10 updates/minute per user)
- [ ] **Data Sanitization**: Sanitize custom status messages and activity data
- [ ] **Permission Checks**: Users can only update their own presence

---

## 💾 DATABASE MIGRATION REQUIREMENTS

**⚠️ CRITICAL: CREATE MIGRATION REQUEST FOR TEAM D**

Create file: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-204.md`

```markdown
# Migration Request: WS-204 Presence Tracking System

**Tables Required:**
- presence_settings (user privacy and visibility settings)
- user_last_seen (persistent last seen timestamps)

**Key Requirements:**
- RLS policies for privacy control
- Indexes for real-time presence queries
- GDPR compliance for presence data

**Dependencies:** Requires auth.users table
**Testing Status:** Will be tested after API implementation
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. API endpoint testing
test('Presence API endpoints work correctly', async () => {
  // Test presence status updates
  const response = await fetch('/api/presence/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'online',
      activity: 'viewing_timeline',
      currentPage: '/wedding/123'
    })
  });
  
  expect(response.status).toBe(200);
});

// 2. Real-time presence broadcasting
test('Presence updates broadcast to connected users', async () => {
  // Setup WebSocket connection
  // Update presence status
  // Verify other users receive the update
});

// 3. Privacy controls testing
test('Presence visibility respects privacy settings', async () => {
  // Set user visibility to 'team'
  // Verify non-team members cannot see presence
  // Verify team members can see presence
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete and tested
- [ ] Presence API endpoints respond within 100ms
- [ ] Real-time presence updates work via Supabase Presence
- [ ] Privacy controls properly implemented
- [ ] Zero TypeScript errors in API code

### Integration & Performance:
- [ ] Heartbeat mechanism maintains presence state
- [ ] Activity tracking updates user status automatically
- [ ] Offline detection works within 30 seconds
- [ ] Rate limiting prevents abuse
- [ ] Database queries optimized for real-time performance

### Evidence Package Required:
- [ ] API documentation with endpoint specifications
- [ ] Test results showing all presence scenarios work
- [ ] Performance metrics for presence updates
- [ ] Security validation report
- [ ] Migration request sent to Team D

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API Routes: `/wedsync/src/app/api/presence/`
- Edge Functions: `/wedsync/supabase/functions/presence-manager/`
- Services: `/wedsync/src/lib/presence/`
- Tests: `/wedsync/tests/api/presence/`
- Types: `/wedsync/src/types/presence.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch31/WS-204-team-b-round-1-complete.md`
- **Migration request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-204.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-204 | ROUND_1_COMPLETE | team-b | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT create frontend components (Team A responsibility)
- Do NOT apply database migrations yourself (Team D responsibility)
- Do NOT skip input validation - use Zod schemas
- REMEMBER: All 5 teams work in PARALLEL on presence tracking

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] Core presence API endpoints built
- [ ] Real-time broadcasting implemented
- [ ] Privacy and security validated
- [ ] Performance targets met
- [ ] Migration request sent to Team D
- [ ] Comprehensive API documentation created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY