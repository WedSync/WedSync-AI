# TEAM B - ROUND 1: WS-037 - Main Dashboard Layout
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Build secure, high-performance backend API endpoints for dashboard data aggregation, real-time subscriptions, and widget preferences with intelligent caching
**FEATURE ID:** WS-037 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about dashboard performance optimization and real-time data consistency for wedding professionals

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **API ENDPOINTS EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/dashboard/
cat $WS_ROOT/wedsync/src/app/api/dashboard/data/route.ts | head -30
ls -la $WS_ROOT/wedsync/src/app/api/dashboard/preferences/route.ts
cat $WS_ROOT/wedsync/src/app/api/dashboard/search/route.ts | head -20
```

2. **DATABASE MIGRATION PROOF:**
```bash
ls -la $WS_ROOT/wedsync/supabase/migrations/ | grep dashboard
cat $WS_ROOT/wedsync/supabase/migrations/*_dashboard_tables.sql | head -20
```

3. **API SECURITY VERIFICATION:**
```bash
npm run test:security -- dashboard
# MUST show: "All dashboard API security tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧭 CRITICAL: SECURITY ARCHITECTURE REQUIREMENTS (MANDATORY FOR API FEATURES)

**❌ FORBIDDEN: Unprotected dashboard endpoints exposing cross-supplier data**
**✅ MANDATORY: All dashboard APIs must use withSecureValidation middleware**

### SECURITY ARCHITECTURE CHECKLIST
- [ ] withSecureValidation middleware on all dashboard endpoints
- [ ] Supplier-scoped data filtering using RLS policies
- [ ] Input validation using Zod schemas for all requests
- [ ] Rate limiting (10 requests/minute for dashboard data)
- [ ] Authentication verification for all API calls
- [ ] Audit logging for dashboard preference changes
- [ ] Secure caching with supplier isolation

### SECURITY MIDDLEWARE PATTERN:
```typescript
// File: $WS_ROOT/wedsync/src/app/api/dashboard/data/route.ts
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/middleware/security';

const getDashboardDataSchema = z.object({
  timeRange: z.enum(['today', 'week', 'month']).default('today'),
  includeMetrics: z.boolean().default(true)
});

export const GET = withSecureValidation(
  getDashboardDataSchema,
  async (request, { user, validatedData }) => {
    // Secure dashboard data logic
  }
);
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & DATABASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. DATABASE ARCHITECTURE ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Understand existing database patterns
await mcp__postgresql__list_tables();
await mcp__postgresql__execute_sql("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name LIKE '%dashboard%' OR table_name LIKE '%supplier%';");
await mcp__serena__search_for_pattern("database schema migration dashboard");
```

### B. SECURITY MIDDLEWARE REQUIREMENTS (MANDATORY FOR ALL API WORK)
```typescript
// CRITICAL: Load security patterns and validation schemas
await mcp__serena__find_symbol("withSecureValidation secureStringSchema", "", true);
await mcp__ref__ref_search_documentation("Next.js API routes middleware patterns");
await mcp__ref__ref_search_documentation("Supabase Row Level Security RLS policies");
```

**🚨 CRITICAL API SECURITY TECHNOLOGY STACK:**
- **withSecureValidation**: Mandatory middleware for all endpoints
- **Zod**: Schema validation for all requests and responses
- **Supabase RLS**: Row-level security for data isolation
- **Redis**: Secure caching with TTL and supplier scoping
- **Rate Limiting**: Token bucket algorithm for API protection

**❌ DO NOT USE:**
- Unvalidated request parameters
- Cross-supplier data leakage
- Unprotected caching without supplier isolation

### C. REF MCP API DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to dashboard API development
# Use Ref MCP to search for:
# - "Next.js 15 API routes performance optimization"
# - "Supabase real-time subscriptions server-side"
# - "Redis caching strategies Node.js"
# - "PostgreSQL query optimization dashboard aggregation"
# - "Zod schema validation API middleware"
# - "JWT authentication Next.js API routes"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR DASHBOARD API ARCHITECTURE

### Backend-Specific Sequential Thinking for Dashboard APIs

```typescript
// Complex dashboard API architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Dashboard API architecture needs: data aggregation endpoints for metrics calculation, widget preferences CRUD operations, real-time subscription setup for live updates, search endpoint with fuzzy matching, caching layer for performance optimization, and audit logging for preference changes. All with supplier-level data isolation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance requirements: Dashboard data must load <3 seconds on first visit, real-time updates without blocking UI, metrics calculations cached for 5 minutes, search results <200ms response time, widget preferences updated optimistically. Need intelligent caching strategy with Redis and database query optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Database design complexity: dashboard_preferences for widget layout persistence, quick_action_usage for personalization tracking, dashboard_metrics_cache for performance optimization. Need proper indexes, foreign key relationships, and RLS policies for supplier isolation. Audit trail for preference changes.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time data architecture: Supabase subscriptions for live activity feed, presence tracking for multi-user scenarios, broadcast channels for widget updates, optimistic UI coordination. Must handle connection drops gracefully and avoid data inconsistency during high load.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security considerations: All endpoints must validate supplier authentication, prevent data leakage between suppliers, rate limit dashboard requests, sanitize search queries, audit widget preference changes, and cache data with proper supplier scoping. Wedding data is highly sensitive.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Create database migration with proper indexes, build secure API endpoints with withSecureValidation middleware, implement intelligent caching with Redis, set up real-time subscriptions with cleanup, create search optimization with PostgreSQL full-text search, and add comprehensive error handling and monitoring.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH API SECURITY FOCUS

Launch these agents with comprehensive backend API requirements:

1. **postgresql-database-expert** --dashboard-schema --performance-optimization --rls-policies
   - Mission: Design optimal database schema with proper indexing and security
   
2. **security-compliance-officer** --api-security --data-isolation --authentication-middleware
   - Mission: Ensure all dashboard APIs meet enterprise security standards
   
3. **performance-optimization-expert** --api-performance --caching-strategies --query-optimization
   - Mission: Optimize dashboard data loading and real-time performance
   
4. **test-automation-architect** --api-testing --security-testing --performance-benchmarks
   - Mission: Create comprehensive API test suite with security validation
   
5. **integration-specialist** --supabase-realtime --redis-caching --webhook-integration
   - Mission: Build robust real-time data synchronization and caching
   
6. **documentation-chronicler** --api-documentation --schema-documentation --security-guidelines
   - Mission: Document all API endpoints with security requirements and examples

## 🎯 TECHNICAL SPECIFICATION

**Core Backend Requirements from WS-037:**
- Secure dashboard data aggregation API with supplier isolation
- Widget preferences CRUD operations with optimistic updates
- Real-time subscription infrastructure for live data
- Global search API with fuzzy matching and categorization
- Intelligent caching layer with Redis for performance
- Audit logging for dashboard preference changes
- Rate limiting and comprehensive security validation

## 🗄️ DATABASE IMPLEMENTATION REQUIREMENTS

### Database Migration to Create:

**Migration: `[timestamp]_create_dashboard_tables.sql`**
```sql
-- Dashboard widget preferences with supplier isolation
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL CHECK (length(widget_id) <= 50),
  position INTEGER NOT NULL CHECK (position >= 0),
  size TEXT CHECK (size IN ('small', 'medium', 'large')) DEFAULT 'medium',
  visible BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, widget_id)
);

-- Quick actions usage tracking for personalization
CREATE TABLE IF NOT EXISTS quick_action_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL CHECK (length(action_id) <= 50),
  usage_count INTEGER DEFAULT 1 CHECK (usage_count >= 0),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, action_id)
);

-- Dashboard metrics cache for performance optimization
CREATE TABLE IF NOT EXISTS dashboard_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (length(metric_type) <= 50),
  metric_value JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(supplier_id, metric_type)
);

-- Dashboard preference change audit log
CREATE TABLE IF NOT EXISTS dashboard_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('widget_moved', 'widget_resized', 'widget_hidden', 'widget_shown')),
  widget_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_supplier_id ON dashboard_preferences(supplier_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_position ON dashboard_preferences(supplier_id, position);
CREATE INDEX IF NOT EXISTS idx_quick_action_usage_supplier_usage ON quick_action_usage(supplier_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_cache_expires ON dashboard_metrics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_log_supplier_created ON dashboard_audit_log(supplier_id, created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_action_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier data isolation
CREATE POLICY "Suppliers can only access their dashboard preferences" 
  ON dashboard_preferences FOR ALL 
  USING (supplier_id = auth.uid()::uuid);

CREATE POLICY "Suppliers can only access their quick action usage" 
  ON quick_action_usage FOR ALL 
  USING (supplier_id = auth.uid()::uuid);

CREATE POLICY "Suppliers can only access their metrics cache" 
  ON dashboard_metrics_cache FOR ALL 
  USING (supplier_id = auth.uid()::uuid);

CREATE POLICY "Suppliers can only access their audit log" 
  ON dashboard_audit_log FOR ALL 
  USING (supplier_id = auth.uid()::uuid);
```

## 🔌 API IMPLEMENTATION REQUIREMENTS

### Core API Endpoints to Build:

**1. Dashboard Data Aggregation API**
```typescript
// File: /src/app/api/dashboard/data/route.ts
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/middleware/security';
import { DashboardService } from '$WS_ROOT/wedsync/src/lib/services/dashboardService';

const getDashboardDataSchema = z.object({
  timeRange: z.enum(['today', 'week', 'month']).default('today'),
  includeMetrics: z.boolean().default(true),
  refreshCache: z.boolean().default(false)
});

export const GET = withSecureValidation(
  getDashboardDataSchema,
  async (request, { user, validatedData }) => {
    const dashboardService = new DashboardService(user.id);
    
    const dashboardData = await dashboardService.getDashboardData({
      timeRange: validatedData.timeRange,
      includeMetrics: validatedData.includeMetrics,
      forceRefresh: validatedData.refreshCache
    });
    
    return NextResponse.json({
      success: true,
      data: dashboardData,
      cachedAt: new Date().toISOString()
    });
  }
);

interface DashboardDataResponse {
  quickActions: QuickAction[];
  todaysFocus: FocusItem[];
  recentActivity: ActivityItem[];
  metrics: DashboardMetrics;
  widgets: DashboardWidget[];
  lastUpdated: string;
}
```

**2. Widget Preferences API**
```typescript
// File: /src/app/api/dashboard/preferences/route.ts
const updatePreferencesSchema = z.object({
  widgets: z.array(z.object({
    id: z.string().min(1).max(50),
    position: z.number().int().min(0),
    size: z.enum(['small', 'medium', 'large']),
    visible: z.boolean(),
    settings: z.record(z.any()).optional()
  }))
});

export const PUT = withSecureValidation(
  updatePreferencesSchema,
  async (request, { user, validatedData }) => {
    const dashboardService = new DashboardService(user.id);
    
    await dashboardService.updateWidgetPreferences(
      validatedData.widgets,
      {
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientIP(request)
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Widget preferences updated successfully'
    });
  }
);

export const GET = withSecureValidation(
  z.object({}),
  async (request, { user }) => {
    const dashboardService = new DashboardService(user.id);
    const preferences = await dashboardService.getWidgetPreferences();
    
    return NextResponse.json({
      success: true,
      data: preferences
    });
  }
);
```

**3. Dashboard Search API**
```typescript
// File: /src/app/api/dashboard/search/route.ts
const searchDashboardSchema = z.object({
  query: secureStringSchema.min(2).max(100),
  type: z.enum(['clients', 'forms', 'all']).default('all'),
  limit: z.number().int().min(1).max(20).default(10)
});

export const GET = withSecureValidation(
  searchDashboardSchema,
  async (request, { user, validatedData }) => {
    const searchService = new DashboardSearchService(user.id);
    
    const results = await searchService.search({
      query: validatedData.query,
      type: validatedData.type,
      limit: validatedData.limit
    });
    
    return NextResponse.json({
      success: true,
      data: {
        results,
        query: validatedData.query,
        totalCount: results.length
      }
    });
  }
);
```

**4. Quick Actions Tracking API**
```typescript
// File: /src/app/api/dashboard/quick-action/route.ts
const logQuickActionSchema = z.object({
  actionId: z.string().min(1).max(50)
});

export const POST = withSecureValidation(
  logQuickActionSchema,
  async (request, { user, validatedData }) => {
    const dashboardService = new DashboardService(user.id);
    
    await dashboardService.logQuickActionUsage(validatedData.actionId);
    
    return NextResponse.json({
      success: true,
      message: 'Quick action usage logged'
    });
  }
);
```

## 🏗️ SERVICE LAYER IMPLEMENTATION

### Core Dashboard Service:

**File: `/src/lib/services/dashboardService.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';

export class DashboardService {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  private redis = new Redis(process.env.REDIS_URL!);
  private supplierId: string;
  
  constructor(supplierId: string) {
    this.supplierId = supplierId;
  }
  
  async getDashboardData(options: {
    timeRange: 'today' | 'week' | 'month';
    includeMetrics: boolean;
    forceRefresh?: boolean;
  }): Promise<DashboardDataResponse> {
    const cacheKey = `dashboard:${this.supplierId}:${options.timeRange}`;
    
    if (!options.forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
    
    const [
      quickActions,
      todaysFocus,
      recentActivity,
      metrics,
      widgets
    ] = await Promise.all([
      this.getQuickActions(),
      this.getTodaysFocus(options.timeRange),
      this.getRecentActivity(options.timeRange),
      options.includeMetrics ? this.getMetrics(options.timeRange) : Promise.resolve({}),
      this.getWidgetPreferences()
    ]);
    
    const dashboardData = {
      quickActions,
      todaysFocus,
      recentActivity,
      metrics,
      widgets,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(dashboardData));
    
    return dashboardData;
  }
  
  async getTodaysFocus(timeRange: string): Promise<FocusItem[]> {
    const now = new Date();
    const timeFilter = this.getTimeFilter(timeRange);
    
    // Smart priority algorithm for wedding professionals
    const { data: urgentWeddings } = await this.supabase
      .from('clients')
      .select(`
        id, name, wedding_date, timeline_confirmed,
        form_responses(id, created_at, reviewed)
      `)
      .eq('supplier_id', this.supplierId)
      .gte('wedding_date', now.toISOString())
      .lte('wedding_date', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('timeline_confirmed', false);
    
    const { data: overdueResponses } = await this.supabase
      .from('form_responses')
      .select(`
        id, created_at, form_title,
        clients(id, name, wedding_date)
      `)
      .eq('supplier_id', this.supplierId)
      .lte('created_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())
      .eq('reviewed', false);
    
    return this.prioritizeItems([...urgentWeddings || [], ...overdueResponses || []]);
  }
  
  async updateWidgetPreferences(
    widgets: DashboardWidget[],
    auditInfo: { userAgent?: string; ipAddress?: string }
  ): Promise<void> {
    const updates = widgets.map(widget => ({
      supplier_id: this.supplierId,
      widget_id: widget.id,
      position: widget.position,
      size: widget.size,
      visible: widget.visible,
      settings: widget.settings || {},
      updated_at: new Date().toISOString()
    }));
    
    // Update preferences
    await this.supabase
      .from('dashboard_preferences')
      .upsert(updates, { onConflict: 'supplier_id,widget_id' });
    
    // Log audit trail
    const auditEntries = widgets.map(widget => ({
      supplier_id: this.supplierId,
      action_type: 'widget_moved',
      widget_id: widget.id,
      new_value: {
        position: widget.position,
        size: widget.size,
        visible: widget.visible
      },
      user_agent: auditInfo.userAgent,
      ip_address: auditInfo.ipAddress
    }));
    
    await this.supabase
      .from('dashboard_audit_log')
      .insert(auditEntries);
    
    // Invalidate cache
    const pattern = `dashboard:${this.supplierId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  private prioritizeItems(items: any[]): FocusItem[] {
    // Smart priority algorithm considering wedding dates, response times, etc.
    return items
      .map(item => this.calculatePriority(item))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  }
  
  private calculatePriority(item: any): FocusItem & { priority: number } {
    let priority = 0;
    
    if (item.wedding_date) {
      const daysUntilWedding = Math.ceil((new Date(item.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilWedding <= 7) priority += 50;
      if (daysUntilWedding <= 3) priority += 30;
    }
    
    if (item.created_at) {
      const daysOverdue = Math.ceil((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue >= 2) priority += 40;
      if (daysOverdue >= 5) priority += 20;
    }
    
    return {
      id: item.id,
      type: item.wedding_date ? 'urgent_wedding' : 'overdue_response',
      title: item.name || item.form_title,
      description: this.generateDescription(item),
      priority: priority > 70 ? 'high' : priority > 40 ? 'medium' : 'low',
      dueDate: item.wedding_date ? new Date(item.wedding_date) : undefined,
      clientName: item.name || item.clients?.name,
      weddingDate: item.wedding_date ? new Date(item.wedding_date) : undefined,
      priority: priority
    };
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Database migration with dashboard tables and proper RLS policies
- [ ] Secure dashboard data aggregation API with caching
- [ ] Widget preferences CRUD API with audit logging
- [ ] Global search API with fuzzy matching
- [ ] Quick actions tracking API for personalization
- [ ] Real-time subscription setup for live updates
- [ ] Redis caching layer with supplier isolation
- [ ] Comprehensive API security validation

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```typescript
// 1. API ENDPOINT TESTING
test('Dashboard data API returns correct structure', async ({ request }) => {
  const response = await request.get('/api/dashboard/data', {
    headers: { 'Authorization': `Bearer ${testToken}` }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data).toHaveProperty('quickActions');
  expect(data.data).toHaveProperty('todaysFocus');
  expect(data.data).toHaveProperty('metrics');
});

// 2. WIDGET PREFERENCES API TESTING
test('Widget preferences update and persist', async ({ request }) => {
  const updatePayload = {
    widgets: [
      { id: 'todays-focus', position: 0, size: 'large', visible: true },
      { id: 'activity-feed', position: 1, size: 'medium', visible: true }
    ]
  };
  
  const updateResponse = await request.put('/api/dashboard/preferences', {
    headers: { 'Authorization': `Bearer ${testToken}` },
    data: updatePayload
  });
  
  expect(updateResponse.ok()).toBeTruthy();
  
  // Verify persistence
  const getResponse = await request.get('/api/dashboard/preferences', {
    headers: { 'Authorization': `Bearer ${testToken}` }
  });
  
  const preferences = await getResponse.json();
  expect(preferences.data.widgets).toHaveLength(2);
});

// 3. SEARCH API TESTING
test('Dashboard search returns relevant results', async ({ request }) => {
  const response = await request.get('/api/dashboard/search?query=sarah&type=clients', {
    headers: { 'Authorization': `Bearer ${testToken}` }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(Array.isArray(data.data.results)).toBe(true);
});

// 4. SECURITY TESTING
test('Dashboard APIs reject unauthorized requests', async ({ request }) => {
  const response = await request.get('/api/dashboard/data');
  expect(response.status()).toBe(401);
});

test('Dashboard APIs prevent data leakage between suppliers', async ({ request }) => {
  // Test with different supplier tokens
  // Verify data isolation
});
```

## 💾 WHERE TO SAVE YOUR WORK

- **API Routes**: `$WS_ROOT/wedsync/src/app/api/dashboard/`
  - `data/route.ts`
  - `preferences/route.ts`
  - `search/route.ts`
  - `quick-action/route.ts`
- **Services**: `$WS_ROOT/wedsync/src/lib/services/`
  - `dashboardService.ts`
  - `dashboardSearchService.ts`
- **Database**: `$WS_ROOT/wedsync/supabase/migrations/`
  - `[timestamp]_create_dashboard_tables.sql`
- **Tests**: `$WS_ROOT/wedsync/tests/api/dashboard/`
- **Types**: `$WS_ROOT/wedsync/src/types/dashboard.ts`

## 🏁 COMPLETION CHECKLIST

### Backend Implementation:
- [ ] Database migration with proper indexes and RLS policies
- [ ] All API endpoints secured with withSecureValidation middleware
- [ ] Intelligent caching with Redis and TTL management
- [ ] Real-time subscriptions for live data updates
- [ ] Audit logging for dashboard preference changes
- [ ] Rate limiting and comprehensive input validation

### Performance & Security:
- [ ] Dashboard data loads in <3 seconds with caching
- [ ] Search API responds in <200ms
- [ ] All APIs pass security testing suite
- [ ] Supplier data isolation verified
- [ ] Query optimization with proper indexing

### Integration Points:
- [ ] APIs ready for Team A frontend integration
- [ ] Real-time subscriptions prepared for Team C
- [ ] Mobile API optimization for Team D
- [ ] Comprehensive test data for Team E

### Evidence Package:
- [ ] API endpoint documentation with examples
- [ ] Database schema documentation
- [ ] Security testing results
- [ ] Performance benchmark results
- [ ] Caching strategy documentation

---

**EXECUTE IMMEDIATELY - This is a comprehensive backend API prompt with all security requirements!**