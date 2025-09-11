# TEAM B - ROUND 1: WS-302 - WedSync Supplier Platform Main Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build the robust backend API infrastructure and data management system for the WedSync Supplier Platform with enterprise-grade security and performance
**FEATURE ID:** WS-302 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about API security, data integrity, and wedding vendor business logic

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/supplier-platform
cat $WS_ROOT/wedsync/src/app/api/supplier-platform/overview/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/supplier-platform
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

// Query specific areas relevant to API and data management
await mcp__serena__search_for_pattern("route.ts API handler POST GET");
await mcp__serena__find_symbol("withSecureValidation middleware", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api");
```

### B. SECURITY PATTERNS & VALIDATION SYSTEM (MANDATORY FOR ALL API WORK)
```typescript
// CRITICAL: Load existing API security patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__search_for_pattern("withSecureValidation withValidation");

// Analyze existing API route patterns for consistency
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");
```

**🚨 CRITICAL BACKEND TECHNOLOGY STACK:**
- **Next.js 15 API Routes**: App Router with TypeScript
- **Supabase PostgreSQL**: Database with RLS policies
- **Zod Validation**: Input validation and type safety
- **Authentication**: Supabase Auth with JWT tokens
- **Rate Limiting**: Built-in protection against abuse

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to supplier platform backend
# Use Ref MCP to search for:
# - "Next.js API routes validation middleware"
# - "Supabase PostgreSQL database functions RLS"
# - "Zod schema validation techniques"
# - "Wedding vendor business logic patterns"
# - "Authentication JWT token handling"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing API patterns
await mcp__serena__find_referencing_symbols("withSecureValidation secureStringSchema");
await mcp__serena__search_for_pattern("getServerSession authentication");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: API Security & Validation Strategy
```typescript
// Before implementing API endpoints
mcp__sequential-thinking__sequential_thinking({
  thought: "Supplier platform API endpoints need: GET /api/supplier-platform/overview (dashboard data), GET /api/supplier-platform/navigation (menu items), POST /api/supplier-platform/preferences (user settings), GET /api/supplier-platform/kpis (metrics). Each handles different data sensitivity levels and permission requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security analysis: Dashboard overview exposes business metrics (revenue, bookings), navigation reveals available features (subscription tier dependent), user preferences contain personal settings, KPIs show sensitive financial data. Need authentication on all endpoints, input validation with Zod, rate limiting for expensive queries, role-based data filtering.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Validation requirements: User preferences must validate subscription tier access, dashboard queries need date range validation, navigation items require permission checking, KPI queries need business context validation. Use secureStringSchema for all text inputs, strict enum validation for preferences, numeric validation for metrics.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation pattern: Use withSecureValidation middleware for all routes, implement subscription tier verification, create reusable validation schemas for supplier data, add comprehensive error handling that doesn't leak business data, include audit logging for sensitive operations like KPI access.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down API development work, track security implementation, identify data flow blockers
   - **Sequential Thinking Usage**: Complex API architecture breakdown, security requirement analysis

2. **postgresql-database-expert** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture  
   - Mission: Use Serena to analyze existing database patterns, design supplier platform queries
   - **Sequential Thinking Usage**: Database optimization decisions, query performance analysis, RLS policy design

3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Trace API data flow, identify vulnerabilities using Serena, enforce validation patterns
   - **Sequential Thinking Usage**: Security threat modeling, validation strategy, audit logging requirements

4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality  
   - Mission: Ensure API routes match existing security patterns found by Serena
   - **Sequential Thinking Usage**: Code review decisions, security pattern compliance, error handling standards

5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write API tests BEFORE code, verify security with test coverage
   - **Sequential Thinking Usage**: Test strategy planning, security test cases, performance benchmarks

6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document API endpoints with actual code snippets and security evidence
   - **Sequential Thinking Usage**: API documentation strategy, security requirement documentation

**AGENT COORDINATION:** Agents work in parallel but share Serena insights AND Sequential Thinking analysis results

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
Use Serena to understand existing API and security patterns BEFORE writing any code:
```typescript
// Find all related API routes and their security patterns
await mcp__serena__find_symbol("withSecureValidation middleware", "", true);
// Understand existing validation patterns  
await mcp__serena__search_for_pattern("secureStringSchema validation");
// Analyze integration points with authentication
await mcp__serena__find_referencing_symbols("getServerSession supabase auth");
```
- [ ] Identified existing API security patterns to follow
- [ ] Found all validation integration points
- [ ] Understood authentication flow requirements
- [ ] Located similar supplier-focused implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed plan:
- [ ] Architecture decisions based on existing API patterns
- [ ] Test cases written FIRST (TDD) for all endpoints
- [ ] Security measures identified from code analysis
- [ ] Performance considerations for wedding vendor queries

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use API patterns discovered by Serena
- [ ] Maintain consistency with existing validation middleware
- [ ] Include comprehensive error handling
- [ ] Test security continuously during development

## 📋 TECHNICAL SPECIFICATION

Based on `/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-302-wedsync-supplier-platform-main-overview-technical.md`:

### Core API Requirements:
- **Dashboard Overview API**: Revenue, bookings, client metrics for supplier dashboard
- **Navigation API**: Role-based menu items and feature availability
- **User Preferences API**: Settings storage and retrieval with validation
- **KPI Metrics API**: Business performance indicators with security controls
- **Real-time Updates**: WebSocket support for live dashboard updates

### Key Endpoints to Build:
1. **GET /api/supplier-platform/overview**: Dashboard data aggregation
2. **GET /api/supplier-platform/navigation**: Role-based navigation items  
3. **POST /api/supplier-platform/preferences**: User settings management
4. **GET /api/supplier-platform/kpis**: Business metrics with date filtering
5. **GET /api/supplier-platform/activity**: Recent activity feed

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Dashboard Overview API** (`$WS_ROOT/wedsync/src/app/api/supplier-platform/overview/route.ts`)
  - Aggregate supplier business metrics securely
  - Subscription tier-based data filtering
  - Performance optimization for dashboard loading
  - Evidence: API response times <200ms, proper role-based filtering

- [ ] **Navigation API** (`$WS_ROOT/wedsync/src/app/api/supplier-platform/navigation/route.ts`)
  - Role-based navigation menu generation
  - Feature availability based on subscription tier
  - Caching strategy for navigation items
  - Evidence: Navigation items respect subscription limits

- [ ] **User Preferences API** (`$WS_ROOT/wedsync/src/app/api/supplier-platform/preferences/route.ts`)
  - Secure user settings storage and retrieval
  - Validation of preference values against business rules
  - Subscription tier validation for premium features
  - Evidence: Preferences validation prevents unauthorized access

- [ ] **KPI Metrics API** (`$WS_ROOT/wedsync/src/app/api/supplier-platform/kpis/route.ts`)
  - Business performance metrics with date filtering
  - Revenue, booking, and client satisfaction data
  - Rate limiting for expensive metric queries
  - Evidence: Query optimization results, proper data aggregation

- [ ] **Database Query Optimization**
  - Efficient queries for dashboard data aggregation
  - Proper indexing strategy for supplier metrics
  - Database migration for any new supplier platform tables
  - Evidence: Query performance under load, proper indexing

## 🔗 DEPENDENCIES

### What you need from other teams:
- **Team A**: Component interfaces and data requirements
- **Team C**: Real-time update requirements and webhook specifications
- **Team D**: Mobile platform API requirements and PWA considerations

### What others need from you:
- **Team A**: API endpoint specifications and response formats
- **Team C**: Database schema and integration points
- **Team E**: API documentation and testing interfaces

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() on expensive operations
- [ ] **SQL injection prevention** - secureStringSchema for all string inputs
- [ ] **Business data protection** - Filter sensitive data based on subscription tier
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/business logic errors
- [ ] **Audit logging** - Log access to sensitive supplier data

### REQUIRED SECURITY FILES:
```typescript
// These MUST exist and be used:
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { secureStringSchema, emailSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { getServerSession } from 'next-auth';
```

### VALIDATION PATTERN (COPY THIS!):
```typescript
const overviewQuerySchema = z.object({
  // Date range validation for metrics
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  // Metric type validation
  metrics: z.array(z.enum(['revenue', 'bookings', 'clients', 'satisfaction'])).optional(),
  // Pagination validation
  page: z.number().min(1).max(100).optional().default(1),
  limit: z.number().min(1).max(50).optional().default(20)
});

export const GET = withSecureValidation(overviewQuerySchema, handler);
```

### BUSINESS LOGIC SECURITY:
```typescript
// Subscription tier validation pattern
const validateSupplierAccess = async (userId: string, feature: string) => {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, features')
    .eq('user_id', userId)
    .single();
    
  if (!subscription?.features.includes(feature)) {
    throw new Error('Feature not available in current subscription');
  }
  
  return subscription;
};

// Revenue data filtering based on subscription
const getSupplierRevenue = async (userId: string, subscription: Subscription) => {
  const baseQuery = supabase
    .from('bookings')
    .select('total, created_at')
    .eq('supplier_id', userId);
    
  // Free tier: only current month
  if (subscription.tier === 'free') {
    baseQuery.gte('created_at', startOfMonth(new Date()).toISOString());
  }
  // Professional+: full historical data
  
  return baseQuery;
};
```

## 🎭 POSTGRESQL MCP TESTING

Advanced database testing with direct PostgreSQL access:

```javascript
// POSTGRESQL MCP TESTING FOR SUPPLIER PLATFORM APIS

// 1. DATABASE QUERY PERFORMANCE TESTING
await mcp__supabase__execute_sql({
  query: `
    EXPLAIN ANALYZE 
    SELECT 
      COUNT(*) as total_bookings,
      SUM(total_amount) as total_revenue,
      AVG(client_satisfaction_score) as avg_satisfaction
    FROM bookings b
    JOIN clients c ON b.client_id = c.id  
    WHERE b.supplier_id = $1 
    AND b.created_at >= $2
    AND b.created_at <= $3;
  `
});

// 2. SUBSCRIPTION TIER VALIDATION TESTING  
await mcp__supabase__execute_sql({
  query: `
    SELECT tier, features, usage_limits
    FROM user_subscriptions 
    WHERE user_id = $1 AND status = 'active';
  `
});

// 3. ROLE-BASED ACCESS CONTROL TESTING
await mcp__supabase__execute_sql({
  query: `
    SELECT navigation_item, required_permission
    FROM supplier_navigation_items
    WHERE tier_requirement <= (
      SELECT tier_level FROM user_subscriptions 
      WHERE user_id = $1
    );
  `
});

// 4. DATA AGGREGATION PERFORMANCE TESTING
await mcp__supabase__execute_sql({
  query: `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as bookings,
      SUM(total_amount) as revenue
    FROM bookings 
    WHERE supplier_id = $1 
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
    LIMIT 12;
  `
});

// 5. RLS POLICY VALIDATION
await mcp__supabase__execute_sql({
  query: `
    -- Test that suppliers can only see their own data
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims TO '{"sub": "test-supplier-id", "role": "authenticated"}';
    
    SELECT * FROM supplier_kpis WHERE supplier_id != 'test-supplier-id';
    -- Should return no results due to RLS
  `
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All API routes complete WITH EVIDENCE (show endpoint responses)
- [ ] Tests written FIRST and passing (show TDD commit history)
- [ ] Security patterns followed (list validation patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero SQL injection vulnerabilities (show parameterized queries)

### Code Quality Evidence:
```typescript
// Include actual API route showing security compliance
// Example from your implementation:
export const GET = withSecureValidation(
  supplierOverviewSchema,
  async (request, validatedQuery) => {
    // Following pattern from existing-secure-api.ts:32-54
    // Serena confirmed this matches 15 other protected endpoints
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate subscription tier access
    const subscription = await validateSupplierAccess(session.user.id, 'dashboard_metrics');
    
    // Filter data based on subscription tier
    const metrics = await getSupplierMetrics(session.user.id, subscription, validatedQuery);
    
    return NextResponse.json(metrics);
  }
);
```

### Integration Evidence:
- [ ] Show how APIs connect to database with proper RLS
- [ ] Include Serena analysis of existing API integration patterns
- [ ] Demonstrate subscription tier filtering works correctly
- [ ] Prove authentication flow integrates properly

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const apiMetrics = {
  overviewEndpoint: "145ms",    // Target: <200ms
  navigationEndpoint: "67ms",   // Target: <100ms  
  kpisEndpoint: "189ms",       // Target: <200ms
  preferencesEndpoint: "45ms", // Target: <100ms
  databaseQueryTime: "23ms",   // Target: <50ms
}
```

## 💾 WHERE TO SAVE

### API Route Files:
- `$WS_ROOT/wedsync/src/app/api/supplier-platform/overview/route.ts`
- `$WS_ROOT/wedsync/src/app/api/supplier-platform/navigation/route.ts`
- `$WS_ROOT/wedsync/src/app/api/supplier-platform/preferences/route.ts`
- `$WS_ROOT/wedsync/src/app/api/supplier-platform/kpis/route.ts`
- `$WS_ROOT/wedsync/src/app/api/supplier-platform/activity/route.ts`

### Validation Schema Files:
- `$WS_ROOT/wedsync/src/lib/validation/supplier-platform-schemas.ts`

### Business Logic Files:
- `$WS_ROOT/wedsync/src/lib/services/supplier-platform-service.ts`
- `$WS_ROOT/wedsync/src/lib/services/supplier-metrics-service.ts`

### Test Files:
- `$WS_ROOT/wedsync/tests/api/supplier-platform/overview.test.ts`
- `$WS_ROOT/wedsync/tests/api/supplier-platform/security.test.ts`

### Database Migration Files:
- `$WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_supplier_platform_tables.sql`

## ⚠️ CRITICAL WARNINGS

### Things that will break the wedding vendor business:
- **Exposing competitor data** - Strict RLS policies prevent cross-supplier data access
- **Slow dashboard loading** - Vendors check metrics frequently, <2s load time required
- **Inaccurate financial data** - Wedding vendors rely on revenue metrics for business decisions
- **Subscription bypassing** - Strict tier validation prevents unauthorized feature access
- **Data leaks in errors** - Error messages must not reveal sensitive business information

### Security Failures to Avoid:
- **Missing authentication** - Every supplier endpoint must verify user session
- **SQL injection** - All string inputs must use secureStringSchema validation
- **Rate limit bypassing** - Expensive metrics queries need protection
- **Cross-tenant data** - RLS policies must prevent supplier A seeing supplier B's data
- **Subscription escalation** - Feature access must be strictly validated against tier

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### API Security Verification:
```bash
# Verify ALL API routes have validation
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/supplier-platform/
# Should show validation on EVERY route.ts file

# Check for direct request.json() usage (FORBIDDEN!)
grep -r "request\.json()" $WS_ROOT/wedsync/src/app/api/supplier-platform/ | grep -v "validatedData"
# Should return NOTHING (all should be validated)

# Verify authentication checks
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/supplier-platform/
# Should be present in ALL protected routes

# Check rate limiting on expensive operations
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/supplier-platform/
# Should be applied to KPI and metrics endpoints

# Verify subscription tier validation
grep -r "validateSupplierAccess\|subscription.*tier" $WS_ROOT/wedsync/src/app/api/supplier-platform/
# Should show tier validation in business logic
```

### Final Security Checklist:
- [ ] NO direct `request.json()` without validation
- [ ] ALL strings use secureStringSchema  
- [ ] ALL routes have proper error handling that doesn't leak sensitive data
- [ ] NO business data exposed without subscription tier validation
- [ ] Authentication verified on ALL protected routes
- [ ] Rate limiting applied to expensive metrics queries
- [ ] TypeScript compiles with NO errors
- [ ] API tests pass including security and subscription tier tests

### Database Integration Checklist:
- [ ] All queries use parameterized statements (no SQL injection)
- [ ] RLS policies prevent cross-supplier data access
- [ ] Database queries optimized for supplier platform performance
- [ ] Proper indexing on supplier-related tables
- [ ] Migration scripts created for any new supplier platform tables

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**🚨 CRITICAL: You MUST update the project dashboard immediately after completing this feature!**

### STEP 1: Update Feature Status JSON
**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-302 and update:
```json
{
  "id": "WS-302-supplier-platform-main-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25", 
  "testing_status": "needs-testing",
  "team": "Team B",
  "notes": "Supplier platform API infrastructure completed. All endpoints secured with validation, authentication, and subscription tier checks."
}
```

### STEP 2: Create Completion Report
**Location**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`
**Filename**: `WS-302-supplier-platform-main-overview-team-b-round1-complete.md`

Use the standard completion report template with supplier platform API specific evidence including:
- API endpoint response examples
- Security validation code snippets
- Database query performance metrics
- Subscription tier filtering evidence

---

**WedSync Supplier Platform APIs - Secure, Fast, and Wedding Vendor Optimized! 🔒⚡📊**