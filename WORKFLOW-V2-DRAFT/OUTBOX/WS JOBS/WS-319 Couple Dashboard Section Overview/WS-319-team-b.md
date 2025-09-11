# TEAM B - ROUND 1: WS-319 - Couple Dashboard Section Overview  
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and data aggregation systems for couples' centralized wedding dashboard
**FEATURE ID:** WS-319 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about real-time data synchronization, wedding timeline calculations, and multi-vendor data aggregation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/couples/dashboard/
cat $WS_ROOT/wedsync/src/app/api/couples/dashboard/overview/route.ts | head -20
```

2. **DATABASE MIGRATION RESULTS:**
```bash
npx supabase migration list --linked
# MUST show WS-319 couple dashboard migration applied
```

3. **API ENDPOINT TESTING:**
```bash
curl -X GET "http://localhost:3000/api/couples/dashboard/overview" -H "Authorization: Bearer [token]"
# MUST return couple dashboard data
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- API endpoints with withSecureValidation middleware for couple authentication
- Database aggregation queries for multi-vendor wedding data
- Real-time data synchronization for vendor updates and task changes
- Wedding timeline calculation engine with milestone tracking
- Performance-optimized queries for dashboard data loading
- Caching strategies for frequently accessed couple information
- Data privacy controls for couple-vendor information sharing
- Integration APIs for vendor data feeding into couple dashboard

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Query existing couple and dashboard patterns
await mcp__serena__search_for_pattern("couple|client|dashboard|wedding.*timeline");
await mcp__serena__find_symbol("CoupleAuth", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. REF MCP CURRENT DOCS
```typescript
ref_search_documentation("Next.js 15 API routes dashboard data aggregation real-time");
ref_search_documentation("Supabase real-time subscriptions wedding timeline database queries");
ref_search_documentation("PostgreSQL aggregation queries performance optimization");
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Couple authentication** - Verify couple identity via JWT tokens
- [ ] **Wedding access control** - Ensure couples only access their wedding data
- [ ] **Vendor data privacy** - Protect sensitive vendor information and pricing
- [ ] **Guest information security** - Secure personal guest data and preferences
- [ ] **Photo access validation** - Verify couple permissions for vendor-shared photos
- [ ] **Communication privacy** - Protect couple-vendor message exchanges
- [ ] **Budget data encryption** - Secure financial information and payment details
- [ ] **Rate limiting applied** - Prevent dashboard API abuse (20 requests/minute)

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Couple dashboard configuration and preferences
CREATE TABLE couple_dashboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  layout_config JSONB DEFAULT '{}',
  widget_preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding timeline milestones and progress tracking
CREATE TABLE wedding_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completion_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 0,
  assigned_vendor_id UUID REFERENCES organizations(id),
  priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
  dependencies JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor update notifications for couples
CREATE TABLE vendor_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  vendor_id UUID REFERENCES organizations(id),
  update_type TEXT NOT NULL CHECK (update_type IN ('message', 'photo', 'timeline_update', 'task_completion', 'payment_request')),
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Couple task management and delegation
CREATE TABLE couple_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  due_date DATE,
  assigned_to TEXT, -- Could be 'bride', 'groom', 'both', or external person
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  vendor_related BOOLEAN DEFAULT FALSE,
  vendor_id UUID REFERENCES organizations(id),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding photo gallery shared by vendors
CREATE TABLE couple_photo_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  vendor_id UUID REFERENCES organizations(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  photo_category TEXT,
  event_date DATE,
  is_favorite BOOLEAN DEFAULT FALSE,
  sharing_permissions JSONB DEFAULT '{"public": false, "family": true, "wedding_party": true}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. DASHBOARD DATA ENDPOINTS
```typescript
// GET /api/couples/dashboard/overview
// Comprehensive dashboard data aggregation
// GET /api/couples/dashboard/timeline
// Wedding timeline with milestones and progress
// GET /api/couples/dashboard/vendors
// All vendor status and communication summary
// GET /api/couples/dashboard/tasks
// Task list with assignments and due dates
```

### 2. REAL-TIME UPDATE ENDPOINTS
```typescript
// GET /api/couples/dashboard/updates
// Recent vendor updates and notifications
// POST /api/couples/dashboard/updates/mark-read
// Mark notifications as read
// GET /api/couples/dashboard/real-time
// WebSocket endpoint for live updates
```

### 3. DASHBOARD CONFIGURATION ENDPOINTS  
```typescript
// GET /api/couples/dashboard/config
// Dashboard layout and preferences
// PUT /api/couples/dashboard/config
// Update dashboard configuration
// POST /api/couples/dashboard/widgets/reorder
// Reorder dashboard widgets
```

### 4. WEDDING PROGRESS ENDPOINTS
```typescript
// GET /api/couples/dashboard/progress
// Overall wedding planning progress
// PUT /api/couples/dashboard/milestones/[id]
// Update milestone completion
// GET /api/couples/dashboard/calendar
// Wedding calendar with all important dates
```

## 📊 DATA AGGREGATION LOGIC

### Dashboard Data Aggregator
```typescript
// Comprehensive dashboard data service
export class CoupleDashboardService {
  async getDashboardOverview(coupleId: string): Promise<DashboardOverview> {
    // 1. Wedding timeline progress calculation
    // 2. Vendor status aggregation
    // 3. Task completion statistics
    // 4. Budget overview compilation
    // 5. Recent photo gallery updates
    // 6. Upcoming milestone deadlines
    // 7. Guest RSVP summary
    // 8. Weather forecast for wedding day
  }
  
  async calculateWeddingProgress(coupleId: string): Promise<ProgressData> {
    // 1. Count completed vs. total milestones
    // 2. Weight milestones by importance and complexity
    // 3. Factor in vendor readiness status
    // 4. Calculate days remaining to wedding
    // 5. Identify critical path bottlenecks
  }
}
```

### Real-time Update System
```typescript
// Real-time dashboard updates via Supabase
export class DashboardRealtimeService {
  async subscribeToVendorUpdates(coupleId: string): Promise<void> {
    // 1. Subscribe to vendor communication changes
    // 2. Listen for task completion notifications
    // 3. Monitor timeline milestone updates
    // 4. Track new photo uploads from vendors
    // 5. Watch for budget and payment changes
  }
  
  async broadcastUpdateToCouple(coupleId: string, update: DashboardUpdate): Promise<void> {
    // 1. Send real-time update to couple's dashboard
    // 2. Update relevant widget data
    // 3. Show notification badges for new items
    // 4. Trigger mobile push notifications if enabled
  }
}
```

## 🏗️ BUSINESS LOGIC REQUIREMENTS

### Core Services to Implement:
- **TimelineCalculator** - Wedding milestone scheduling and dependency management
- **ProgressTracker** - Overall wedding planning completion analysis
- **VendorAggregator** - Collect and summarize data from all wedding vendors
- **TaskManager** - Couple task assignment and completion tracking
- **NotificationEngine** - Smart notification delivery based on couple preferences
- **PhotoGalleryManager** - Vendor photo sharing and couple gallery curation

## ⚡ PERFORMANCE OPTIMIZATION

### Caching Strategy
```typescript
// Redis caching for dashboard performance
export class DashboardCacheService {
  async cacheDashboardData(coupleId: string, data: DashboardData): Promise<void> {
    // 1. Cache expensive aggregation queries
    // 2. Store frequently accessed vendor data
    // 3. Cache wedding timeline calculations
    // 4. Store photo gallery metadata
    // TTL: 5 minutes for real-time data, 1 hour for static data
  }
  
  async invalidateCache(coupleId: string, dataType: string): Promise<void> {
    // 1. Clear specific cache segments when data changes
    // 2. Trigger cache refresh for affected dashboard widgets
    // 3. Update real-time subscriptions with fresh data
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### DATABASE & MIGRATIONS:
- [ ] Create WS-319 migration with all couple dashboard tables
- [ ] Add performance indexes for couple_id, wedding_date, vendor_id
- [ ] Implement Row Level Security for couple data protection
- [ ] Create database views for complex dashboard aggregations

### API ENDPOINTS:
- [ ] Implement all 12 core couple dashboard API routes
- [ ] Add comprehensive Zod validation for couple authentication
- [ ] Implement rate limiting (20 requests/minute per couple)
- [ ] Create real-time WebSocket endpoints for live updates

### DATA SERVICES:
- [ ] Build CoupleDashboardService with data aggregation logic
- [ ] Implement TimelineCalculator for wedding milestone management
- [ ] Create VendorAggregator for multi-vendor data compilation
- [ ] Build ProgressTracker for wedding completion analysis

### REAL-TIME FEATURES:
- [ ] Implement Supabase real-time subscriptions for vendor updates
- [ ] Create notification broadcasting system for couples
- [ ] Build cache invalidation system for data consistency
- [ ] Add WebSocket management for live dashboard updates

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/couples/dashboard/
- **Services:** $WS_ROOT/wedsync/src/lib/services/couple-dashboard/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/
- **Types:** $WS_ROOT/wedsync/src/types/couple-dashboard.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/api/couples/dashboard/

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] All 12 API endpoints implemented with security validation
- [ ] Data aggregation services operational for dashboard overview
- [ ] Real-time update system functional via Supabase subscriptions
- [ ] Wedding timeline calculation engine working correctly
- [ ] Vendor data aggregation providing accurate status summaries
- [ ] Task management system integrated with couple assignments
- [ ] Photo gallery API serving vendor-shared images securely
- [ ] Performance optimization with caching implemented
- [ ] Rate limiting and authentication enforced on all endpoints
- [ ] Comprehensive test suite passing (>90% coverage)
- [ ] Evidence package prepared with API documentation and performance metrics

---

**EXECUTE IMMEDIATELY - Build the data backbone that powers couples' complete wedding coordination experience!**