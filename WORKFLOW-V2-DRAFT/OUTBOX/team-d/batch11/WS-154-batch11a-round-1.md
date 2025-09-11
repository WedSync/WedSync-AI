# TEAM D - ROUND 1: WS-154 - Database & Performance Monitoring
## 2025-01-25 - Round 1 (Security & Monitoring Focus)

**YOUR MISSION:** Implement database monitoring views and performance tracking infrastructure
**FEATURE ID:** WS-154 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about preventing database performance issues during critical wedding moments

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier with 50+ couples' weddings in my database
**I want to:** Monitor database performance and query health to prevent slowdowns
**So that:** When vendors access guest lists or timelines 30 minutes before ceremony, the system responds instantly

**Real Wedding Problem This Solves:**
Database slowdowns during peak wedding periods can be catastrophic. When a caterer tries to pull the guest count for final headcount at 5 PM before a 6 PM ceremony, a 10-second delay becomes wedding chaos. This database monitoring system tracks slow queries, connection health, and table performance to prevent these disasters through proactive optimization.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Create database monitoring views for slow queries, connections, table health, RLS status
- Build performance tracking API endpoints
- Set up Lighthouse CI configuration
- Monitor query optimization and connection pool health
- Track queries slower than 100ms
- Include RLS policy verification

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL 15 via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Performance: Lighthouse CI, Web Vitals API
- Database Views: PostgreSQL system views and pg_stat_statements

**Integration Points:**
- Supabase Database: Direct access to PostgreSQL system tables
- Performance API: Connect to Web Vitals and Core Performance metrics
- Monitoring Dashboard: Provide data for Team B and Team C dashboards
- Alert System: Feed performance data to Team E alerting

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL SaaS monitoring features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for database monitoring:
await mcp__context7__resolve-library-id("postgresql");
await mcp__context7__get-library-docs("/postgresql/postgresql", "monitoring views pg_stat_statements", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database-functions rls-policies", 4000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes performance-monitoring", 3000);
await mcp__context7__get-library-docs("/web-platform/web-vitals", "core-web-vitals performance-api", 3000);
await mcp__context7__get-library-docs("/googlechrome/lighthouse", "lighthouse-ci automation", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing database and performance patterns:
await mcp__serena__search_for_pattern("database migration performance query");
await mcp__serena__find_symbol("supabase", "/src/lib/database", true);
await mcp__serena__get_symbols_overview("supabase/migrations");
await mcp__serena__find_referencing_symbols("performance monitoring api");
```

**WHY THIS ORDER MATTERS:**
- Context7 provides latest PostgreSQL monitoring and Lighthouse CI patterns
- Serena shows existing database structure and migration patterns
- Agents work with current knowledge for optimal database monitoring

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Implement database performance monitoring"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Create PostgreSQL monitoring views"
3. **performance-optimization-expert** --think-ultra-hard --follow-existing-patterns "Build performance tracking API" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure database monitoring access"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Test database monitoring queries"
6. **api-architect** --accessibility-first --multi-tab "Design performance API endpoints"

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for database operations."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing database migration files first
- Understand current database schema and performance patterns
- Check existing API route structures for performance endpoints
- Review similar monitoring implementations
- Continue until you FULLY understand the database architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed database monitoring migration plan
- Write database tests FIRST (TDD)
- Plan performance API structure and response formats
- Consider database security and RLS policy impacts
- Don't rush - proper database monitoring prevents production issues

### **CODE PHASE (PARALLEL AGENTS!)**
- Create database migration with all monitoring views
- Build performance tracking API endpoints
- Set up Lighthouse CI configuration
- Implement query optimization monitoring
- Focus on minimal performance overhead and security

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all database monitoring tests
- Verify with Playwright that performance APIs work
- Create database monitoring evidence package
- Generate performance reports
- Only mark complete when database monitoring is ACTUALLY working

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Database Monitoring Implementation):
- [ ] Database migration with 5 monitoring views:
  - `monitoring_slow_queries` - Track queries > 100ms
  - `monitoring_connections` - Connection pool status  
  - `monitoring_table_health` - Table sizes and dead rows
  - `monitoring_rls_status` - RLS policy verification
  - `monitoring_events` table - Store monitoring events
- [ ] Performance API endpoint at `/api/monitoring/performance`
- [ ] Lighthouse CI configuration for automated performance testing
- [ ] Query optimization monitoring for wedding-critical paths
- [ ] Unit tests with >80% coverage for database monitoring
- [ ] Basic Playwright tests validating performance API responses

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Monitoring services setup - Required for performance metric collection
- FROM Team B: Dashboard API structure - Dependency for data format consistency

### What other teams NEED from you:
- TO Team C: Database health metrics - They need this for admin dashboard display
- TO Team E: Performance threshold data - Required for automated performance alerts

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR DATABASE MONITORING

**ALL database monitoring MUST enforce strict access controls:**

```typescript
// ❌ NEVER DO THIS (FOUND IN DATABASE ROUTES):
export async function GET(request: Request) {
  const slowQueries = await supabase
    .from('monitoring_slow_queries')
    .select('*'); // NO ACCESS CONTROL!
  return NextResponse.json(slowQueries.data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { performanceQuerySchema } from '@/lib/validation/schemas';
import { getServerSession } from 'next-auth';

export const GET = withSecureValidation(
  performanceQuerySchema, // Validate query parameters
  async (request: NextRequest, validatedData) => {
    // MANDATORY: Admin-only access for database monitoring
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['admin', 'developer'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Sanitize and limit monitoring data exposure
    const performanceData = await getPerformanceMetrics(validatedData);
    const sanitizedData = sanitizeDbMonitoringData(performanceData);
    
    return NextResponse.json(sanitizedData);
  }
);
```

### SECURITY CHECKLIST FOR DATABASE MONITORING

Teams MUST implement ALL of these for database monitoring features:

- [ ] **Admin/Developer Access Only**: Database monitoring restricted to authorized roles
- [ ] **Input Validation**: MANDATORY Zod schemas for all monitoring queries
- [ ] **Query Parameter Sanitization**: Prevent SQL injection in monitoring filters
- [ ] **Data Sanitization**: Remove sensitive system information from responses
- [ ] **Rate Limiting**: Prevent database monitoring endpoint abuse
- [ ] **Connection Pool Security**: Monitor connections without exposing credentials
- [ ] **RLS Policy Verification**: Ensure monitoring doesn't bypass RLS
- [ ] **Audit Logging**: Log all database monitoring access

### DATABASE MONITORING SPECIFIC SECURITY PATTERNS

**1. Database Monitoring Views (SQL Security):**
```sql
-- CRITICAL: All monitoring views must respect RLS and access controls
CREATE VIEW monitoring_slow_queries AS
SELECT 
  query_start,
  -- SANITIZE: Don't expose full queries with potential sensitive data
  LEFT(query, 100) as query_preview,
  total_time,
  mean_time,
  calls,
  -- SECURITY: Only expose non-sensitive performance metrics
  rows,
  state
FROM pg_stat_activity 
WHERE 
  -- CRITICAL: Exclude system/admin queries from monitoring exposure
  datname = current_database()
  AND state = 'active'
  AND query NOT LIKE '%pg_stat%'
  AND query NOT LIKE '%information_schema%'
  -- Only show queries longer than 100ms
  AND (now() - query_start) > interval '100 milliseconds';

-- MANDATORY: Set appropriate permissions
GRANT SELECT ON monitoring_slow_queries TO authenticated;
REVOKE ALL ON monitoring_slow_queries FROM anon;
```

**2. Performance API Security:**
```typescript
export const GET = withSecureValidation(
  performanceMetricsSchema.extend({
    // Limit time ranges to prevent excessive data exposure
    time_range: z.enum(['1h', '6h', '24h']).default('1h'),
    // Limit query types to prevent system info leakage
    query_type: z.enum(['slow', 'connections', 'tables', 'rls']).optional()
  }),
  async (request, validatedData) => {
    // SECURITY: Verify admin or developer role
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdminOrDeveloper) {
      return NextResponse.json({ error: 'Database monitoring requires admin access' }, { status: 403 });
    }
    
    // SECURITY: Rate limiting for database queries
    const rateLimitResult = await rateLimitService.checkRateLimit(request, {
      max: 30, // 30 requests per minute for database monitoring
      windowMs: 60000
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // SECURITY: Sanitize database monitoring response
    const performanceMetrics = await getDatabasePerformanceMetrics(validatedData);
    const sanitizedMetrics = sanitizeDatabaseMetrics(performanceMetrics);
    
    return NextResponse.json(sanitizedMetrics);
  }
);
```

**3. Database Migration Security:**
```sql
-- CRITICAL: Create monitoring tables with proper RLS
CREATE TABLE monitoring_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- SECURITY: Associate with user for RLS
  user_id UUID REFERENCES auth.users(id),
  -- SECURITY: Track source for audit trail
  source_ip INET,
  user_agent TEXT
);

-- MANDATORY: Enable RLS on monitoring table
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- SECURITY: Only allow admin/developer access to monitoring events
CREATE POLICY "monitoring_events_admin_access" ON monitoring_events
FOR ALL USING (
  auth.jwt() ->> 'role' IN ('admin', 'developer')
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY DATABASE MONITORING TESTING APPROACH!

// 1. DATABASE PERFORMANCE API TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});

// Test performance API endpoints
const performanceApiTests = [
  '/api/monitoring/performance',
  '/api/monitoring/performance?time_range=1h',
  '/api/monitoring/performance?query_type=slow'
];

for (const endpoint of performanceApiTests) {
  const response = await mcp__playwright__browser_evaluate({
    function: `async () => {
      const response = await fetch('${endpoint}', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('admin-token') }
      });
      return {
        status: response.status,
        data: response.ok ? await response.json() : null,
        responseTime: performance.now() - startTime
      };
    }`
  });
  
  // Verify API performance < 200ms
  if (response.responseTime > 200) {
    throw new Error(`Performance API too slow: ${response.responseTime}ms`);
  }
}

// 2. WEB VITALS MONITORING VALIDATION
const webVitalsMetrics = await mcp__playwright__browser_evaluate({
  function: `() => new Promise((resolve) => {
    // Collect Core Web Vitals
    const vitals = {};
    
    // LCP (Largest Contentful Paint)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      vitals.lcp = entries[entries.length - 1].startTime;
    }).observe({entryTypes: ['largest-contentful-paint']});
    
    // FID (First Input Delay) - simulate user interaction
    document.addEventListener('click', () => {
      vitals.fid = performance.now();
    }, { once: true });
    
    // CLS (Cumulative Layout Shift)
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      vitals.cls = clsValue;
    }).observe({entryTypes: ['layout-shift']});
    
    // Return metrics after 3 seconds
    setTimeout(() => resolve(vitals), 3000);
  })`
});

// 3. DATABASE CONNECTION MONITORING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/monitoring"});

// Verify database monitoring displays
await mcp__playwright__browser_wait_for({text: "Database Connections", timeout: 5000});

// Check for slow query alerts
const slowQueryAlert = await mcp__playwright__browser_snapshot();
// Should show any queries > 100ms threshold

// 4. LIGHTHOUSE CI INTEGRATION TESTING
// This would run as part of CI/CD pipeline
const lighthouseMetrics = {
  performance: 90, // Target score
  accessibility: 95,
  'best-practices': 90,
  seo: 85
};

// 5. DATABASE MONITORING VIEW TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test database monitoring API with admin access
    const monitoringData = await fetch('/api/monitoring/database', {
      headers: { 'Authorization': 'Bearer ' + window.adminToken }
    }).then(r => r.json());
    
    return {
      slowQueries: monitoringData.slowQueries?.length || 0,
      connections: monitoringData.connections?.active || 0,
      tableHealth: monitoringData.tableHealth?.status || 'unknown'
    };
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Database performance API responding < 200ms
- [ ] All monitoring views returning valid data
- [ ] Web Vitals collection functioning
- [ ] Slow query detection working (> 100ms threshold)
- [ ] Connection pool monitoring active
- [ ] RLS policy verification in monitoring data
- [ ] Lighthouse CI configuration generating reports

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Database migration applied with all 5 monitoring views
- [ ] Performance API endpoints returning real data
- [ ] Lighthouse CI configured and generating reports
- [ ] Query optimization monitoring detecting slow queries
- [ ] Database monitoring views performant (< 50ms)
- [ ] Zero TypeScript errors in performance monitoring code
- [ ] Zero database errors from monitoring queries

### Integration & Performance:
- [ ] Performance API responses < 200ms
- [ ] Database monitoring overhead < 1% of query performance
- [ ] RLS policies verified and enforced
- [ ] Connection pool health monitoring active
- [ ] Security requirements met for all database endpoints
- [ ] Integration points working for other teams' dashboards

### Evidence Package Required:
- [ ] Database migration applied successfully (show migration status)
- [ ] Performance API response examples with real metrics
- [ ] Lighthouse CI reports generated automatically
- [ ] Database monitoring query performance benchmarks
- [ ] Security validation evidence (admin-only access confirmed)

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Database Migration: `/wedsync/supabase/migrations/[timestamp]_database_monitoring_views.sql`
- Performance API: `/wedsync/src/app/api/monitoring/performance/route.ts`
- Lighthouse Config: `/wedsync/lighthouse.config.js`
- Tests: `/wedsync/src/__tests__/monitoring/database-performance.test.ts`
- Types: `/wedsync/src/types/database-monitoring.ts`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-154.md`
- SQL Expert will handle application and conflict resolution

**CRITICAL: Migration Handover Required**
```markdown
File: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-154.md

# MIGRATION REQUEST - WS-154 - Database & Performance Monitoring
## Team: D
## Round: 1

### Migration Files Created:
- `/wedsync/supabase/migrations/[timestamp]_database_monitoring_views.sql`

### Purpose:
Creates 5 database monitoring views and monitoring_events table for comprehensive database performance tracking

### Dependencies:
- Requires pg_stat_statements extension enabled
- Requires access to pg_stat_activity for connection monitoring
- Creates monitoring_events table with RLS policies

### Testing Done:
- [ ] Syntax validated locally
- [ ] Views created and queried successfully in development
- [ ] RLS policies tested with different user roles
- [ ] Performance impact measured (< 1% overhead)

### Special Notes:
- All views are read-only for security
- monitoring_events table has admin-only RLS policy
- Views exclude sensitive system queries from exposure
```

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch11a/WS-154-round-1-complete.md`
- **Include:** Feature ID (WS-154) in all filenames
- **Save in:** batch11a folder for proper organization
- **After completion:** Run `./route-messages.sh`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT run database migrations directly - send to SQL Expert for review and application
- Do NOT expose sensitive database system information in monitoring APIs
- Do NOT skip security validation on database monitoring endpoints
- Do NOT create database views that bypass RLS policies
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Database monitoring migration created and sent for expert review
- [ ] Performance API endpoints secured and functional
- [ ] Lighthouse CI configured for automated testing
- [ ] Database monitoring views performant and secure
- [ ] Dependencies provided to other teams (performance metrics)
- [ ] Code committed with evidence
- [ ] Comprehensive database monitoring report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY