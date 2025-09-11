# TEAM B - ROUND 1: WS-001 - Client List Views - Backend/API & Database

**Date:** 2025-08-29  
**Feature ID:** WS-001 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Create robust API endpoints for client list data with advanced filtering, pagination, and caching  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/clients/
ls -la $WS_ROOT/wedsync/supabase/migrations/
cat $WS_ROOT/wedsync/src/app/api/clients/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/app/api/clients
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## <¯ USER STORY & WEDDING CONTEXT

**As a:** Wedding photographer managing 50+ couples annually
**I want to:** Quickly retrieve and filter client data through efficient API endpoints
**So that:** My client list views load in under 200ms and can handle 500+ clients without performance issues

**Real Wedding Problem This Solves:**
A photographer managing 40 weddings per year currently waits 5+ seconds for client data to load from their current system. With optimized API endpoints and caching, they get instant access to filtered client lists, saving 30+ minutes daily on admin tasks and improving customer service response times.

---

## =Ú STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

**  CRITICAL: Load navigation and security requirements from centralized templates:**

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");

// This contains:
// - Navigation Integration Requirements (MANDATORY for all UI features)
// - Security Requirements (MANDATORY for all API routes)  
// - UI Technology Stack requirements
// - All centralized checklists
```

## >à STEP 2A: SEQUENTIAL THINKING FOR API SECURITY & PERFORMANCE

### Backend-Specific Sequential Thinking Analysis

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Client list API needs multiple endpoints: GET /api/clients (list with filtering), PATCH /api/clients/preferences (view settings), potentially GET /api/clients/stats (dashboard metrics). Each endpoint handles sensitive client data and needs proper security validation, pagination for performance, and caching for frequent requests.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security requirements analysis: Client data contains PII (names, wedding dates, venue info), API needs authentication on all endpoints, input validation with Zod for all parameters, rate limiting to prevent abuse, audit logging for data access, proper error handling that doesn't leak sensitive information.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance optimization needs: Pagination is essential for 500+ clients, database indexes on supplier_id and wedding_date, caching layer for frequent queries, efficient JOIN operations, response compression, optimized SQL queries to prevent N+1 problems.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database design: client_list_cache table optimized for read performance, user_view_preferences for personalization, proper indexes and constraints, Row Level Security for multi-tenant data isolation, migration scripts with rollback capability.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## =Ú STEP 2B: ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA API PATTERN DISCOVERY
```typescript
// Activate Serena for semantic code understanding
await mcp__serena__activate_project("wedsync");

// Find existing API patterns
await mcp__serena__search_for_pattern("route.ts POST GET handler");
await mcp__serena__find_symbol("route handler middleware", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");

// CRITICAL: Analyze security patterns (MANDATORY!)
await mcp__serena__search_for_pattern("withSecureValidation withValidation");
await mcp__serena__find_symbol("secureStringSchema emailSchema", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
```

### B. BACKEND DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "Supabase database-functions rls pagination"
# - "Next.js route-handlers streaming"
# - "Supabase auth-jwt server-side"
# - "Zod schema-validation refinements"
```

## <¯ SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] GET /api/clients route with filtering, pagination, search
- [ ] PATCH /api/clients/preferences route for view settings
- [ ] Database schema migrations (client_list_cache, user_view_preferences)
- [ ] TypeScript interfaces for API contracts
- [ ] Validation schemas with Zod
- [ ] Unit tests with >80% coverage
- [ ] Evidence package proving completion

### API Specifications:
- [ ] **GET /api/clients**: Pagination, search, filtering, sorting with security validation
- [ ] **PATCH /api/clients/preferences**: User view preferences with authentication
- [ ] **Database Migration**: Optimized tables with indexes and RLS policies
- [ ] **Validation Middleware**: Secure input validation for all endpoints
- [ ] **Error Handling**: Proper error responses without data leakage

## = DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Frontend interface requirements (ClientListItem type structure) - Required for API contract
- FROM Team C: Integration points for real-time updates - Optional for this round

### What other teams NEED from you:
- TO Team A: API endpoints and TypeScript interfaces - Blocking their data fetching
- TO Team E: API documentation and test endpoints - Needed for their testing
- TO SQL Expert: Database migration files for review and application

## = MANDATORY SECURITY IMPLEMENTATION (NON-NEGOTIABLE!)

### EVERY API ROUTE MUST USE THIS PATTERN:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';

const getClientsSchema = z.object({
  page: z.coerce.number().min(1).max(1000).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: secureStringSchema.optional(),
  filters: z.object({
    status: z.array(z.enum(['active', 'past', 'upcoming', 'draft'])).optional(),
    dateRange: z.object({
      start: z.string().date().optional(),
      end: z.string().date().optional()
    }).optional(),
    tags: z.array(secureStringSchema).max(10).optional(),
    wedmeStatus: z.array(z.enum(['connected', 'invited', 'not_connected'])).optional()
  }).optional(),
  sortBy: secureStringSchema.regex(/^[a-z_]+$/).default('wedding_date'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const GET = withSecureValidation(
  getClientsSchema,
  async (request, validatedParams) => {
    // Check authentication FIRST
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Apply rate limiting
    const rateLimitResult = await rateLimitService.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    // Now use validated, type-safe parameters
    const clients = await fetchClientList(session.user.id, validatedParams);
    
    return NextResponse.json({
      success: true,
      data: clients
    });
  }
);
```

### Required Security Checklist:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - Parameterized queries only
- [ ] **XSS prevention** - secureStringSchema for all strings
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log all data access with user context

## =¾ WHERE TO SAVE YOUR WORK

### Code Files:
- API Routes: `$WS_ROOT/wedsync/src/app/api/clients/route.ts`
- Preferences API: `$WS_ROOT/wedsync/src/app/api/clients/preferences/route.ts`
- Types: `$WS_ROOT/wedsync/src/types/client.ts`
- Validation: `$WS_ROOT/wedsync/src/lib/validation/client-schemas.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/api/clients/`
- Migrations: `$WS_ROOT/wedsync/supabase/migrations/[timestamp]_client_list_views.sql`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-001-client-list-views-team-b-round-1-complete.md`
- **Update tracker:** Add entry to `$WS_ROOT/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

### Database Migration Handover:
- **File:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-001.md`

## =Ä DATABASE MIGRATION REQUIREMENTS

Create migration file with this structure:
```sql
-- Migration: Client List Views Optimization
-- WS-001: Client list views with filtering and caching

-- Client list optimized view
CREATE TABLE IF NOT EXISTS client_list_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  couple_names TEXT NOT NULL,
  wedding_date DATE,
  venue_name TEXT,
  status TEXT CHECK (status IN ('active', 'past', 'upcoming', 'draft')),
  last_activity TIMESTAMP DEFAULT NOW(),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  wedme_status TEXT CHECK (wedme_status IN ('connected', 'invited', 'not_connected')),
  tags TEXT[],
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_client_list_supplier_id ON client_list_cache(supplier_id);
CREATE INDEX IF NOT EXISTS idx_client_list_wedding_date ON client_list_cache(wedding_date);
CREATE INDEX IF NOT EXISTS idx_client_list_status ON client_list_cache(status);
CREATE INDEX IF NOT EXISTS idx_client_list_names ON client_list_cache USING gin(to_tsvector('english', couple_names));

-- User view preferences
CREATE TABLE IF NOT EXISTS user_view_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  view_type TEXT DEFAULT 'list' CHECK (view_type IN ('list', 'grid', 'calendar', 'kanban')),
  sort_by TEXT DEFAULT 'wedding_date',
  sort_order TEXT DEFAULT 'asc' CHECK (sort_order IN ('asc', 'desc')),
  filters JSONB DEFAULT '{}',
  columns_visible TEXT[] DEFAULT ARRAY['couple_names', 'wedding_date', 'venue', 'status', 'last_activity'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Row Level Security
ALTER TABLE client_list_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_view_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own client data" ON client_list_cache
  FOR ALL USING (supplier_id = auth.uid());

CREATE POLICY "Users can only access their own preferences" ON user_view_preferences
  FOR ALL USING (user_id = auth.uid());
```

## =Ê API PERFORMANCE REQUIREMENTS

### Required Performance Metrics:
- [ ] GET /api/clients response time: < 200ms for 500+ records
- [ ] Pagination efficiency: Support up to 1000 pages
- [ ] Search performance: < 150ms for text search queries
- [ ] Database query optimization: < 50ms query execution
- [ ] Memory usage: < 100MB per request

### Caching Strategy:
```typescript
// Implement caching for frequent queries
import { Redis } from 'ioredis';

const CACHE_TTL = 300; // 5 minutes

export async function getCachedClientList(cacheKey: string, fetchFn: () => Promise<any>) {
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fetchFn();
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  return data;
}
```

##  SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All API endpoints respond in < 200ms (show timing measurements)
- [ ] Pagination handles 500+ clients efficiently (show performance metrics)
- [ ] Search returns results in < 150ms (show query timing)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] All security validations implemented (show validation code)
- [ ] Database migration files created (show file listing)

### Security Evidence:
```bash
# Verify ALL API routes have validation
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/clients/
# Should show validation on EVERY route.ts file

# Check for direct request.json() usage (FORBIDDEN!)
grep -r "request\.json()" $WS_ROOT/wedsync/src/app/api/clients/ | grep -v "validatedData"
# Should return NOTHING (all should be validated)

# Verify authentication checks
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/clients/
# Should be present in ALL routes
```

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const apiMetrics = {
  getClientsResponse: "< 180ms",  // Target: <200ms
  searchResponse: "< 140ms",      // Target: <150ms
  databaseQuery: "< 45ms",        // Target: <50ms
  memoryUsage: "< 80MB",          // Target: <100MB
  cacheHitRatio: "> 70%"          // Target: >60%
}
```

## =Ê MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-001 and update:
```json
{
  "id": "WS-001-client-list-views", 
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-08-29",
  "testing_status": "needs-testing",
  "team": "Team B",
  "notes": "Backend API endpoints and database schema completed in Round 1. All security validation implemented."
}
```

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY