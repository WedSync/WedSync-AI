# TEAM B - ROUND 1: WS-320 - Core Fields Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and database systems for core wedding fields with vendor synchronization
**FEATURE ID:** WS-320 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data integrity, vendor notification systems, and real-time synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/wedding-fields/
cat $WS_ROOT/wedsync/src/app/api/wedding-fields/core/route.ts | head -20
```

2. **DATABASE MIGRATION RESULTS:**
```bash
npx supabase migration list --linked
# MUST show WS-320 core wedding fields migration applied
```

3. **API VALIDATION TEST:**
```bash
curl -X PUT "http://localhost:3000/api/wedding-fields/core" -H "Content-Type: application/json" -d '{"wedding_date": "2025-06-15"}'
# MUST return success with validation
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- API endpoints with withSecureValidation middleware for wedding data
- Database schema for core wedding fields with proper relationships
- Real-time vendor notification system for data changes
- Wedding field validation and business logic
- Auto-sync mechanisms with vendor systems
- Data versioning and change tracking
- Performance optimization for frequent wedding updates

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// Query existing wedding data and API patterns
await mcp__serena__search_for_pattern("wedding.*field|core.*data|api.*route");
await mcp__serena__find_symbol("WeddingFieldsAPI", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. REF MCP CURRENT DOCS
```typescript
ref_search_documentation("Next.js 15 API routes wedding data validation Zod");
ref_search_documentation("Supabase real-time subscriptions wedding field notifications");
ref_search_documentation("PostgreSQL wedding database schema vendor synchronization");
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Couple authentication** - Verify couple ownership of wedding data
- [ ] **Wedding data privacy** - Protect sensitive wedding information
- [ ] **Vendor access controls** - Limit vendor access to relevant fields only
- [ ] **Change audit logging** - Log all wedding field modifications
- [ ] **Rate limiting applied** - Prevent wedding data abuse (30 req/min)
- [ ] **Input sanitization** - Clean all wedding field inputs
- [ ] **Date validation** - Prevent invalid wedding dates and conflicts

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Core wedding information
CREATE TABLE core_wedding_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id) UNIQUE,
  wedding_date DATE NOT NULL,
  ceremony_time TIME,
  reception_time TIME,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  venue_capacity INTEGER,
  guest_count INTEGER NOT NULL DEFAULT 0,
  wedding_style TEXT,
  ceremony_type TEXT,
  reception_type TEXT,
  budget_range TEXT,
  special_requirements TEXT,
  dietary_restrictions JSONB DEFAULT '[]',
  accessibility_needs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact information
CREATE TABLE wedding_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  contact_type TEXT NOT NULL CHECK (contact_type IN ('bride', 'groom', 'partner1', 'partner2', 'emergency', 'parent', 'wedding_party')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding timeline milestones
CREATE TABLE wedding_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  milestone_name TEXT NOT NULL,
  milestone_date DATE,
  milestone_time TIME,
  location TEXT,
  description TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  vendor_dependencies JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field change tracking
CREATE TABLE wedding_field_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  vendors_notified JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. CORE WEDDING FIELDS ENDPOINTS
```typescript
// GET /api/wedding-fields/core
// Retrieve all core wedding information
// PUT /api/wedding-fields/core
// Update core wedding fields with validation
// GET /api/wedding-fields/validation-schema
// Get validation schema for frontend
```

### 2. TIMELINE MANAGEMENT ENDPOINTS
```typescript
// GET /api/wedding-fields/timeline
// Get wedding timeline milestones
// POST /api/wedding-fields/timeline
// Create new timeline milestone
// PUT /api/wedding-fields/timeline/[id]
// Update timeline milestone
```

### 3. CONTACT MANAGEMENT ENDPOINTS
```typescript
// GET /api/wedding-fields/contacts
// Get all wedding contacts
// POST /api/wedding-fields/contacts
// Add new wedding contact
// PUT /api/wedding-fields/contacts/[id]
// Update contact information
```

### 4. VENDOR SYNC ENDPOINTS
```typescript
// POST /api/wedding-fields/sync-vendors
// Trigger manual vendor synchronization
// GET /api/wedding-fields/sync-status
// Check vendor synchronization status
// POST /api/wedding-fields/notify-vendors
// Send specific field changes to vendors
```

## 🔄 VENDOR SYNCHRONIZATION LOGIC

### Wedding Field Sync Service
```typescript
// Core wedding field synchronization with vendors
export class WeddingFieldSyncService {
  async syncFieldChanges(coupleId: string, changedFields: string[]): Promise<SyncResult> {
    // 1. Get all vendors for the couple
    // 2. Determine which fields each vendor needs
    // 3. Prepare vendor-specific data packages
    // 4. Send notifications to relevant vendors
    // 5. Track synchronization status and failures
    // 6. Retry failed synchronizations with exponential backoff
  }
  
  async notifyVendorsOfChanges(coupleId: string, changes: FieldChange[]): Promise<void> {
    // 1. Filter changes by vendor relevance
    // 2. Send real-time notifications to vendor systems
    // 3. Update vendor dashboard with new wedding information
    // 4. Log all vendor notifications for audit
  }
}
```

### Wedding Data Validation Service
```typescript
// Comprehensive wedding field validation
export class WeddingFieldValidator {
  async validateCoreFields(fields: CoreWeddingFields): Promise<ValidationResult> {
    // 1. Validate wedding date is in future (with reasonable limits)
    // 2. Check venue capacity vs. guest count
    // 3. Validate timeline milestone dependencies
    // 4. Check for scheduling conflicts
    // 5. Verify contact information completeness
    // 6. Validate budget range and vendor requirements
  }
  
  async validateTimelineConsistency(timeline: WeddingMilestone[]): Promise<ValidationResult> {
    // 1. Check milestone date dependencies
    // 2. Validate vendor availability for scheduled items
    // 3. Identify potential timeline conflicts
    // 4. Suggest optimal scheduling adjustments
  }
}
```

## 🏗️ BUSINESS LOGIC REQUIREMENTS

### Core Services to Implement:
- **WeddingFieldsService** - CRUD operations for all wedding fields
- **TimelineManager** - Wedding milestone scheduling and dependency tracking
- **ContactManager** - Wedding contact management and validation
- **ChangeTracker** - Track all wedding field modifications with audit
- **VendorNotificationService** - Smart vendor notifications for relevant changes
- **ValidationEngine** - Comprehensive wedding data validation

## ⚡ PERFORMANCE OPTIMIZATION

### Wedding Data Caching
```typescript
// Redis caching for frequently accessed wedding data
export class WeddingFieldsCacheService {
  async cacheWeddingFields(coupleId: string, fields: CoreWeddingFields): Promise<void> {
    // 1. Cache core wedding information (TTL: 1 hour)
    // 2. Store timeline milestones (TTL: 30 minutes)
    // 3. Cache contact information (TTL: 2 hours)
    // 4. Store vendor sync status (TTL: 5 minutes)
  }
  
  async invalidateFieldCache(coupleId: string, fieldNames: string[]): Promise<void> {
    // 1. Clear specific field caches when data changes
    // 2. Trigger cache refresh for affected vendor systems
    // 3. Update real-time subscriptions with fresh data
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### DATABASE & MIGRATIONS:
- [ ] Create WS-320 migration with all core wedding field tables
- [ ] Add performance indexes for couple_id, wedding_date, vendor queries
- [ ] Implement Row Level Security for wedding data protection
- [ ] Create database triggers for automatic change tracking

### API ENDPOINTS:
- [ ] Implement all 8 core wedding field API routes
- [ ] Add comprehensive Zod validation for all wedding inputs
- [ ] Implement rate limiting (30 requests/minute per couple)
- [ ] Create real-time endpoints for wedding field updates

### BUSINESS LOGIC:
- [ ] Build WeddingFieldSyncService with vendor notification system
- [ ] Implement WeddingFieldValidator with comprehensive validation rules
- [ ] Create TimelineManager for milestone dependency tracking
- [ ] Build ContactManager with relationship validation

### VENDOR INTEGRATION:
- [ ] Implement vendor notification system for field changes
- [ ] Create vendor-specific data filtering and formatting
- [ ] Add vendor synchronization status tracking
- [ ] Build retry mechanisms for failed vendor updates

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/wedding-fields/
- **Services:** $WS_ROOT/wedsync/src/lib/services/wedding-fields/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/
- **Validation:** $WS_ROOT/wedsync/src/lib/validation/wedding-fields.ts
- **Types:** $WS_ROOT/wedsync/src/types/wedding-fields.ts
- **Tests:** $WS_ROOT/wedsync/src/__tests__/api/wedding-fields/

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] All 8 API endpoints implemented with security validation
- [ ] Wedding field validation engine operational with comprehensive rules
- [ ] Vendor synchronization system functional with notification tracking
- [ ] Timeline milestone management with dependency validation
- [ ] Contact management system with relationship tracking
- [ ] Change tracking system logging all wedding field modifications
- [ ] Performance optimization with caching implemented
- [ ] Rate limiting and authentication enforced on all endpoints
- [ ] Comprehensive test suite passing (>90% coverage)
- [ ] Evidence package prepared with API documentation and sync status

---

**EXECUTE IMMEDIATELY - Build the wedding data backbone that keeps all vendors synchronized with the latest wedding information!**