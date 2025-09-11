# TEAM B - ROUND 1: WS-305 - Client Management Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build secure client management APIs with activity tracking, aggregation queries, and real-time management settings
**FEATURE ID:** WS-305 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about client data security, wedding vendor business intelligence, and scalable API performance

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **API ENDPOINT VERIFICATION:**
```bash
curl -X GET $WS_ROOT/api/clients/management/overview \
  -H "Authorization: Bearer $TOKEN" | jq .
# MUST show: Client statistics with proper structure
```

2. **SECURITY VALIDATION:**
```bash
grep -r "getServerSession\|authenticate" $WS_ROOT/wedsync/src/app/api/clients/management/
# MUST show: Authentication on ALL endpoints
```

3. **DATABASE FUNCTION VERIFICATION:**
```bash
psql -d wedsync -c "SELECT * FROM get_client_management_overview(uuid_generate_v4());"
# MUST show: Proper aggregation results
```

## 🧠 SEQUENTIAL THINKING FOR CLIENT MANAGEMENT APIs

```typescript
// Client management API complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Client management APIs need: GET /api/clients/management/overview (statistics aggregation), PUT /api/clients/management/settings (user preferences), POST /api/clients/activities (activity tracking), GET /api/clients/search (filtered queries). Each handles different data types, security contexts, and performance requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor data patterns: Photographers manage 10-50 couples annually, venues handle 100+ events, florists track seasonal peaks. APIs must aggregate real-time statistics, handle complex filtering (date ranges, status, location), support bulk operations, and maintain audit trails for business analysis.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Security and validation requirements: Client data is highly sensitive (wedding dates, personal details, financial info), must implement RLS policies, validate all inputs with Zod schemas, prevent data leakage between suppliers, rate limit aggregation queries, audit all management actions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Performance optimization strategy: Client overview queries hit multiple tables, need efficient aggregation functions, implement caching for statistics, optimize for mobile API calls, handle concurrent access during wedding season peaks, monitor query performance.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA API PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing API patterns to maintain consistency
await mcp__serena__search_for_pattern("api route auth getServerSession");
await mcp__serena__find_symbol("NextRequest NextResponse", "$WS_ROOT/wedsync/src/app/api/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/clients/");

// Study existing client-related endpoints
await mcp__serena__find_referencing_symbols("clients table database");
```

### B. API DOCUMENTATION LOADING
```typescript
// Load Next.js 15 API Route documentation
// Use Ref MCP to search for:
# - "Next.js 15 API routes app router patterns"
# - "PostgreSQL aggregation functions complex queries"
# - "Supabase RLS policies API security"

// Load security and validation patterns
# Use Ref MCP to search for:
# - "Zod schema validation API endpoints"
# - "Rate limiting Next.js API routes"
# - "Database connection pooling PostgreSQL"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Client Management Overview API** (`$WS_ROOT/wedsync/src/app/api/clients/management/overview/route.ts`)
  - Secure endpoint returning aggregated client statistics
  - Real-time activity feed integration
  - Performance optimized queries with caching
  - Evidence: API returns accurate counts and statistics within 200ms

- [ ] **Management Settings API** (`$WS_ROOT/wedsync/src/app/api/clients/management/settings/route.ts`)
  - GET/PUT endpoints for user preferences
  - Validation with Zod schemas
  - Upsert operations for settings persistence
  - Evidence: Settings saved and retrieved correctly across sessions

- [ ] **Client Activity Tracking API** (`$WS_ROOT/wedsync/src/app/api/clients/activities/route.ts`)
  - POST endpoint for activity logging
  - Real-time activity feed updates
  - Efficient pagination for large activity histories
  - Evidence: Activities logged and retrieved in correct chronological order

- [ ] **Database Aggregation Functions** (`$WS_ROOT/wedsync/supabase/migrations/XXX_client_management_functions.sql`)
  - PostgreSQL functions for complex client statistics
  - Optimized queries with proper indexing
  - Wedding vendor specific business logic
  - Evidence: Functions execute in <50ms with 1000+ client records

- [ ] **API Security Implementation** (`$WS_ROOT/wedsync/src/lib/api/auth-middleware.ts`)
  - Authentication middleware for all client management endpoints
  - RLS policy enforcement
  - Input validation and sanitization
  - Evidence: Unauthorized requests blocked, data isolated per supplier

## 🔐 SECURITY REQUIREMENTS (MANDATORY)

### API Authentication Pattern
```typescript
// EVERY endpoint must follow this pattern:
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withSecureValidation } from "@/lib/api/security";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.supplier_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // All inputs MUST be validated
  const validatedData = await withSecureValidation(request, schema);
  
  // RLS policies ensure data isolation
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('supplier_id', session.user.supplier_id); // CRITICAL: Filter by supplier
    
  return NextResponse.json({ data });
}
```

### Required Validation Schemas
```typescript
// Define in: $WS_ROOT/wedsync/src/lib/validation/client-management-schemas.ts

export const clientManagementOverviewSchema = z.object({
  date_range: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  include_inactive: z.boolean().optional()
});

export const clientManagementSettingsSchema = z.object({
  default_view: z.enum(['grid', 'list', 'timeline']),
  items_per_page: z.number().min(6).max(100),
  sort_preference: z.string().min(1).max(50),
  filter_preferences: z.record(z.any())
});

export const clientActivitySchema = z.object({
  client_id: z.string().uuid(),
  activity_type: z.enum(['email', 'call', 'meeting', 'task_update', 'payment']),
  description: z.string().min(1).max(500),
  metadata: z.record(z.any()).optional()
});
```

## 🗄️ DATABASE SCHEMA IMPLEMENTATION

### Migration File Required
```sql
-- File: $WS_ROOT/wedsync/supabase/migrations/XXX_client_management_system.sql

-- Extend clients table for management
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS management_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_level VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0;

-- Client management settings table
CREATE TABLE IF NOT EXISTS client_management_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  default_view VARCHAR(20) DEFAULT 'grid',
  items_per_page INTEGER DEFAULT 12,
  sort_preference VARCHAR(50) DEFAULT 'wedding_date_asc',
  filter_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id)
);

-- Client activities tracking
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE client_management_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can manage their own settings" ON client_management_settings
  FOR ALL USING (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can manage their client activities" ON client_activities
  FOR ALL USING (auth.uid() = supplier_id);

-- Optimized function for client overview
CREATE OR REPLACE FUNCTION get_client_management_overview(supplier_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_clients', 
    (SELECT COUNT(*) FROM clients WHERE supplier_id = supplier_uuid),
    'active_clients', 
    (SELECT COUNT(*) FROM clients WHERE supplier_id = supplier_uuid AND management_status = 'active'),
    'upcoming_weddings',
    (SELECT COUNT(*) FROM clients WHERE supplier_id = supplier_uuid AND wedding_date > CURRENT_DATE AND wedding_date <= CURRENT_DATE + INTERVAL '30 days'),
    'pending_tasks',
    (SELECT COUNT(*) FROM tasks t JOIN clients c ON t.client_id = c.id WHERE c.supplier_id = supplier_uuid AND t.status != 'completed'),
    'recent_activities',
    (SELECT COALESCE(json_agg(
      json_build_object(
        'id', ca.id,
        'client_name', c.name,
        'activity_type', ca.activity_type,
        'description', ca.description,
        'created_at', ca.created_at
      ) ORDER BY ca.created_at DESC
    ), '[]'::json)
    FROM client_activities ca 
    JOIN clients c ON ca.client_id = c.id 
    WHERE ca.supplier_id = supplier_uuid 
    LIMIT 10)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📊 PERFORMANCE REQUIREMENTS

### API Response Time Targets
- **Overview API**: <200ms (with 500+ clients)
- **Settings API**: <100ms (simple CRUD)
- **Activity Tracking**: <150ms (with logging)
- **Search/Filter**: <300ms (complex queries)

### Required Indexing
```sql
-- Add to migration file
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_supplier_management 
ON clients(supplier_id, management_status, wedding_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_activities_recent 
ON client_activities(supplier_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_upcoming_weddings 
ON clients(supplier_id, wedding_date) 
WHERE wedding_date > CURRENT_DATE;
```

## 🔄 REAL-TIME INTEGRATION

### Activity Tracking Implementation
```typescript
// File: $WS_ROOT/wedsync/src/lib/services/activity-tracker.ts

export class ActivityTracker {
  static async logClientActivity(
    clientId: string,
    supplierId: string,
    activityType: string,
    description: string,
    metadata?: Record<string, any>
  ) {
    const { error } = await supabase
      .from('client_activities')
      .insert({
        client_id: clientId,
        supplier_id: supplierId,
        activity_type: activityType,
        description,
        metadata: metadata || {}
      });

    if (!error) {
      // Update client's last activity timestamp
      await supabase
        .from('clients')
        .update({ 
          last_activity_at: new Date().toISOString(),
          total_interactions: supabase.sql`total_interactions + 1`
        })
        .eq('id', clientId);
    }

    return { success: !error, error };
  }

  static async getRecentActivities(supplierId: string, limit = 10) {
    const { data, error } = await supabase
      .from('client_activities')
      .select(`
        *,
        clients!inner(name, wedding_date)
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { activities: data || [], error };
  }
}
```

## 🧪 REQUIRED TESTING

### API Endpoint Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/api/clients/management/overview.test.ts

describe('/api/clients/management/overview', () => {
  it('should return client statistics for authenticated supplier', async () => {
    const response = await request(app)
      .get('/api/clients/management/overview')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('total_clients');
    expect(response.body).toHaveProperty('active_clients');
    expect(response.body).toHaveProperty('upcoming_weddings');
    expect(response.body.recent_activities).toBeInstanceOf(Array);
  });

  it('should reject unauthorized requests', async () => {
    await request(app)
      .get('/api/clients/management/overview')
      .expect(401);
  });

  it('should complete within performance target', async () => {
    const start = Date.now();
    await request(app)
      .get('/api/clients/management/overview')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

### Database Function Testing
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/database/client-management-functions.test.ts

describe('get_client_management_overview function', () => {
  it('should return accurate client statistics', async () => {
    const supplierId = 'test-supplier-id';
    const { data } = await supabase
      .rpc('get_client_management_overview', { supplier_uuid: supplierId });

    expect(data.total_clients).toBeGreaterThanOrEqual(0);
    expect(data.active_clients).toBeLessThanOrEqual(data.total_clients);
    expect(data.recent_activities).toBeInstanceOf(Array);
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-305-client-management-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team B",
  "notes": "Client management APIs completed. Secure endpoints, activity tracking, performance optimized aggregation queries."
}
```

---

**WedSync Client Management APIs - Secure, Fast, Wedding-Optimized! 🔐📊💼**