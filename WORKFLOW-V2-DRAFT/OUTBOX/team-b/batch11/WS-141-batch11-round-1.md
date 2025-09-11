# TEAM B - ROUND 1: WS-141 - Viral Optimization Engine - Core Backend Implementation

**Date:** 2025-08-24  
**Feature ID:** WS-141 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Implement viral coefficient tracking and invitation optimization system  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding florist with 50 happy couples
**I want to:** Easily invite my past couples to join WedSync and refer their engaged friends
**So that:** I can grow my business through referrals and my couples can help their friends find trusted vendors

**Real Wedding Problem This Solves:**
A florist sends personalized invites to past couples. One couple shares with their engaged friend who's struggling to coordinate 8 vendors. The friend signs up, invites all vendors including a new florist, creating a network effect. The original florist gets referral credit and premium features.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-141:**
- Viral coefficient calculation accurate to 2 decimal places
- Invitation funnel tracks all 5 stages (sent, opened, clicked, signed up, activated)
- A/B testing randomly assigns variants and tracks performance
- Super-connectors identified based on network connections
- Multi-channel invitations (email, WhatsApp, SMS) supported
- Referral rewards tracked and applied automatically

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Analytics: Custom event tracking

**Integration Points:**
- Analytics: Feed viral metrics to dashboard
- Email: Integration with marketing automation
- Customer Success: Health scoring based on referrals
- Billing: Referral rewards and premium unlocks

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 2. SECURITY PATTERN ANALYSIS (MANDATORY FOR ALL API WORK):
await mcp__serena__read_file("/src/lib/validation/middleware.ts");
await mcp__serena__read_file("/src/lib/validation/schemas.ts");
await mcp__serena__search_for_pattern("withSecureValidation");
await mcp__serena__find_symbol("secureStringSchema", "", true);

// 3. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "database functions analytics", 3000);
await mcp__context7__get-library-docs("/colinhacks/zod", "schema validation", 2000);
await mcp__context7__get-library-docs("/vercel/next.js", "route handlers", 2000);

// 4. REVIEW existing API patterns:
await mcp__serena__get_symbols_overview("/src/app/api");
await mcp__serena__search_for_pattern("route.ts POST GET");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Track viral optimization API development"
2. **backend-api-specialist** --think-ultra-hard "Viral metrics and invitation APIs"
3. **security-compliance-officer** --think-ultra-hard "API validation and security"
4. **database-architect** --think-hard "Viral tracking database design"
5. **test-automation-architect** --tdd-approach "API testing with MCP"
6. **code-quality-guardian** --match-codebase-style "Security pattern compliance"

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Backend APIs:

#### 1. Viral Metrics API
- [ ] **GET /api/viral/metrics**: Calculate and return viral coefficient
- [ ] **Schema**: ViralMetricsResponse with coefficient, trends, suggestions
- [ ] **Security**: Rate limiting for analytics endpoints
- [ ] **Performance**: Metrics calculation under 500ms

#### 2. Invitation Tracking API
- [ ] **POST /api/viral/invite**: Send optimized invitation with A/B testing
- [ ] **Schema**: TrackInviteRequest with strict validation
- [ ] **Features**: Template selection, channel optimization
- [ ] **Security**: Prevent invitation spam, validate recipients

#### 3. Attribution Tracking API
- [ ] **POST /api/viral/attribution**: Track referral chains
- [ ] **GET /api/viral/attribution/[userId]**: Get user's viral chain
- [ ] **Security**: User can only access their own attribution data
- [ ] **Performance**: Complex queries optimized with indexes

#### 4. Database Schema Implementation
- [ ] **Viral metrics tracking table** with proper indexes
- [ ] **Invitation funnel tracking** for 5-stage analysis
- [ ] **Network connections** for super-connector identification
- [ ] **Attribution chains** for multi-generation tracking

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - Prevent spam invitations and metrics abuse
- [ ] **SQL injection prevention** - secureStringSchema for email addresses
- [ ] **XSS prevention** - Sanitize all invitation content
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Invitation limits** - Max 100 invites per day per user
- [ ] **Email validation** - Strict RFC-compliant email schemas

### REQUIRED SECURITY PATTERN:
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '@/lib/validation/schemas';

const inviteSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: secureStringSchema.max(100).optional(),
  relationship: z.enum(['past_client', 'vendor', 'friend']),
  personalizedMessage: secureStringSchema.max(500).optional(),
  weddingContext: z.object({
    weddingDate: z.string().date().optional(),
    venue: secureStringSchema.max(200).optional()
  }).optional()
});

export const POST = withSecureValidation(
  inviteSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check invitation rate limits
    const rateLimitResult = await rateLimitService.checkInvitationLimit(session.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Daily invitation limit reached' }, { status: 429 });
    }
    
    // Process validated invitation
    const result = await processViralInvitation(validatedData, session.user.id);
    return NextResponse.json(result);
  }
);
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI component interfaces for viral dashboard
- FROM Team C: Email template system for invitations

### What other teams NEED from you:
- TO Team A: API endpoints and response schemas
- TO Team C: Invitation data structure for templates
- TO Team D: Attribution data for marketing automation

---

## 🎭 MCP SERVER USAGE

### Required MCP Servers:
- [ ] **PostgreSQL MCP**: Execute viral coefficient calculations and metrics queries
- [ ] **Supabase MCP**: Apply database migrations for viral tracking tables
- [ ] **Context7 MCP**: Load current Supabase and Zod documentation

### PostgreSQL Queries Needed:
```sql
-- Viral coefficient calculation (COPY THIS PATTERN):
WITH user_invites AS (
  SELECT 
    sender_id,
    COUNT(*) as invites_sent,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as invites_accepted
  FROM viral_actions 
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY sender_id
),
viral_metrics AS (
  SELECT 
    COUNT(DISTINCT sender_id) as users_who_invited,
    SUM(invites_sent) as total_invites_sent,
    SUM(invites_accepted) as total_invites_accepted
  FROM user_invites
)
SELECT 
  COALESCE(
    CASE 
      WHEN users_who_invited > 0 
      THEN ROUND((total_invites_accepted::decimal / users_who_invited), 2)
      ELSE 0 
    END, 0
  ) as viral_coefficient
FROM viral_metrics;
```

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API Routes: `/wedsync/src/app/api/viral/`
- Services: `/wedsync/src/lib/services/viral-optimization-service.ts`
- Database: `/wedsync/supabase/migrations/20250824000005_viral_optimization_system.sql`
- Tests: `/wedsync/src/__tests__/integration/viral-api.test.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch11/WS-141-round-1-complete.md`

---

## 🏁 ACCEPTANCE CRITERIA & EVIDENCE

### Technical Implementation Evidence:
- [ ] **API routes created** - Show `ls -la src/app/api/viral/` output
- [ ] **Security validation** - Grep shows `withSecureValidation` in every route
- [ ] **TypeScript compilation** - Run `npm run typecheck` with zero errors
- [ ] **Database queries tested** - Show PostgreSQL MCP query results
- [ ] **Rate limiting works** - Test invitation limit enforcement

### Performance Requirements:
- [ ] **Viral coefficient calculation** - Under 500ms response time
- [ ] **Invitation processing** - Under 200ms per invitation
- [ ] **Attribution queries** - Complex chains resolved under 1s

### Code Quality Evidence:
```typescript
// Show actual security pattern compliance:
// File: src/app/api/viral/invite/route.ts:15-45
export const POST = withSecureValidation(
  inviteSchema, // Serena confirmed: matches security pattern from 15+ other routes
  async (request, validatedData) => {
    // Authentication check following pattern from api/auth/:23
    const session = await getServerSession(authOptions);
    // ... rest of secure implementation
  }
);
```

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY