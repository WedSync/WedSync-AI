# TEAM B - ROUND 1: WS-001 - Client List Views
## 2025-09-01 - Development Round 1

**YOUR MISSION:** Build secure API endpoints and database operations for client list data with optimized queries and caching
**FEATURE ID:** WS-001 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about database performance with 500+ client records and complex filtering

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/clients/
cat $WS_ROOT/wedsync/src/app/api/clients/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/clients
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and database schemas
await mcp__serena__search_for_pattern("api.*route|database.*query|supabase.*select");
await mcp__serena__find_symbol("apiHandler", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to API development and database optimization
ref_search_documentation("Next.js 15 API routes authentication middleware validation")
ref_search_documentation("Supabase PostgreSQL optimization indexing RLS policies")
ref_search_documentation("Zod validation schema TypeScript security")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Database Architecture
```typescript
// Use for analyzing optimal database structure and API design
mcp__sequential-thinking__sequentialthinking({
  thought: "I need to design the database schema and API endpoints for client list views. Key considerations: 1) Optimized queries for filtering by status/date/tags, 2) Pagination for large datasets (500+ clients), 3) Caching strategy for frequently accessed data, 4) Security with RLS policies, 5) Search performance with proper indexing.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints and database operations
2. **supabase-specialist** - Use Serena for database consistency  
3. **security-compliance-officer** - Implement secure validation middleware
4. **code-quality-guardian** - Maintain API code standards
5. **test-automation-architect** - API testing with integration tests
6. **documentation-chronicler** - Evidence-based API documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() (5 req/min)
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log critical operations with user context

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**YOUR CORE RESPONSIBILITIES:**
- API endpoints with security validation
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 TECHNICAL SPECIFICATION

### FEATURE CONTEXT (from WS-001-client-list-views-technical.md):
**Database Requirements:** Optimized client_list_cache table with proper indexing for filtering by supplier_id, wedding_date, status. User view preferences storage for personalization.

**API Requirements:** GET /api/clients with complex filtering, sorting, pagination, and search. PATCH /api/clients/preferences for saving user view settings.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY API ENDPOINTS TO BUILD:

1. **GET /api/clients** - `/src/app/api/clients/route.ts`
   - Complex filtering (status, date range, tags, WedMe status)
   - Full-text search on couple names and venue names
   - Sorting by any column with ASC/DESC
   - Pagination with page and limit parameters
   - Returns structured ClientListItem array with metadata

2. **PATCH /api/clients/preferences** - `/src/app/api/clients/preferences/route.ts`
   - Update user view preferences (view type, filters, sorting)
   - Validation with Zod schemas
   - User-specific preference storage

### DATABASE SCHEMA TO IMPLEMENT:

```sql
-- Client list optimized view
CREATE TABLE IF NOT EXISTS client_list_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  couple_names TEXT NOT NULL,
  wedding_date DATE,
  venue_name TEXT,
  status TEXT CHECK (status IN ('active', 'past', 'upcoming', 'draft')),
  last_activity TIMESTAMP,
  completion_percentage INTEGER DEFAULT 0,
  wedme_status TEXT CHECK (wedme_status IN ('connected', 'invited', 'not_connected')),
  tags TEXT[],
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Critical indexes for performance
CREATE INDEX idx_client_list_supplier_id ON client_list_cache(supplier_id);
CREATE INDEX idx_client_list_wedding_date ON client_list_cache(wedding_date);
CREATE INDEX idx_client_list_status ON client_list_cache(status);
CREATE INDEX idx_client_list_search ON client_list_cache USING gin(to_tsvector('english', couple_names || ' ' || COALESCE(venue_name, '')));

-- User view preferences
CREATE TABLE IF NOT EXISTS user_view_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  view_type TEXT DEFAULT 'list' CHECK (view_type IN ('list', 'grid', 'calendar', 'kanban')),
  sort_by TEXT DEFAULT 'wedding_date',
  sort_order TEXT DEFAULT 'asc',
  filters JSONB DEFAULT '{}',
  columns_visible TEXT[] DEFAULT ARRAY['couple_names', 'wedding_date', 'venue', 'status', 'last_activity'],
  PRIMARY KEY (user_id)
);
```

### KEY TECHNICAL REQUIREMENTS:

1. **Query Optimization Strategy:**
   ```typescript
   // Use prepared statements with parameter binding
   // Implement proper indexing for all filter columns
   // Use LIMIT/OFFSET for pagination
   // Cache frequently accessed data in Redis
   ```

2. **Security Implementation:**
   ```typescript
   // withSecureValidation middleware on all endpoints
   // RLS policies to ensure users only see their clients
   // Input sanitization with Zod schemas
   // Rate limiting per user/IP
   ```

3. **Performance Targets:**
   - API response time: <200ms for 100 results
   - Database query time: <50ms with proper indexes
   - Memory usage: <100MB for 1000 client query
   - Concurrent requests: Handle 50 simultaneous users

### EXAMPLE API IMPLEMENTATION:

```typescript
// ACTUAL CODE PATTERN TO FOLLOW:
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { withSecureValidation } from '@/lib/security/validation';
import { rateLimitService } from '@/lib/security/rate-limit';

const GetClientsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  search: z.string().optional(),
  filters: z.object({
    status: z.array(z.enum(['active', 'past', 'upcoming', 'draft'])).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    tags: z.array(z.string()).optional(),
    wedmeStatus: z.array(z.enum(['connected', 'invited', 'not_connected'])).optional()
  }).optional(),
  sortBy: z.string().default('wedding_date'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export async function GET(request: NextRequest) {
  return withSecureValidation(request, GetClientsSchema, async (validatedData, session) => {
    // Step 1: Rate limiting
    await rateLimitService.checkRateLimit(session.user.id, 'clients_list', 60, 30);
    
    // Step 2: Build optimized query
    let query = supabase
      .from('client_list_cache')
      .select('*', { count: 'exact' })
      .eq('supplier_id', session.user.id);
    
    // Step 3: Apply filters with proper indexing
    if (validatedData.search) {
      query = query.textSearch('search_vector', validatedData.search);
    }
    
    if (validatedData.filters?.status?.length) {
      query = query.in('status', validatedData.filters.status);
    }
    
    // Step 4: Apply pagination and sorting
    const offset = (validatedData.page - 1) * validatedData.limit;
    query = query
      .order(validatedData.sortBy, { ascending: validatedData.sortOrder === 'asc' })
      .range(offset, offset + validatedData.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error('Database query failed');
    }
    
    return Response.json({
      success: true,
      data: {
        clients: data,
        pagination: {
          page: validatedData.page,
          limit: validatedData.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / validatedData.limit)
        }
      }
    });
  });
}
```

## 💾 WHERE TO SAVE YOUR WORK
- API routes: `$WS_ROOT/wedsync/src/app/api/clients/`
- Database migrations: `$WS_ROOT/wedsync/supabase/migrations/`
- Security middleware: `$WS_ROOT/wedsync/src/lib/security/`
- Types: `$WS_ROOT/wedsync/src/types/api.ts`
- Tests: `$WS_ROOT/wedsync/src/app/api/clients/__tests__/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied
- [ ] All API endpoints implemented with security validation
- [ ] TypeScript compilation successful with strict mode
- [ ] RLS policies implemented and tested
- [ ] Rate limiting applied and functional
- [ ] Query performance tested with 500+ records
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Integration tests with database complete
- [ ] Evidence package prepared with query performance metrics
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - Build robust, secure APIs that handle wedding photographers' client data with enterprise-level performance!**