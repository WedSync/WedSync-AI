# TEAM B - ROUND 1: WS-301 - Database Implementation - Couples Tables
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build comprehensive PostgreSQL database schema and API endpoints for couples data management
**FEATURE ID:** WS-301 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data integrity, security, and performance at scale

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/supabase/migrations/
cat $WS_ROOT/wedsync/src/lib/database/couples.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test database/couples
# MUST show: "All tests passing"
```

4. **DATABASE MIGRATION PROOF:**
```bash
# Show migration file exists and is valid
ls -la $WS_ROOT/wedsync/supabase/migrations/$(date +%Y%m%d)*_couples_tables.sql
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query database patterns and existing implementations
await mcp__serena__search_for_pattern("database supabase schema migration");
await mcp__serena__find_symbol("createClient SupabaseClient", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/database/");
```

### B. DATABASE SECURITY PATTERNS (MANDATORY)
```typescript
// CRITICAL: Load existing security patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
await mcp__serena__search_for_pattern("RLS Row Level Security");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Use Ref MCP to search for:
ref_search_documentation("Supabase PostgreSQL schema design RLS policies")
ref_search_documentation("Supabase database migrations triggers functions")
ref_search_documentation("Next.js API routes validation middleware")
ref_search_documentation("PostgreSQL performance indexing optimization")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX DATABASE ARCHITECTURE

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: Wedding Database Architecture Analysis
```typescript
// Before implementing couples database schema
mcp__sequential-thinking__sequential_thinking({
  thought: "Couples database needs 10 interconnected tables: couples (main account), couple_core_fields (auto-populate data), couple_suppliers (connections), couple_guests (RSVP management), couple_tasks (delegation), plus supporting tables for timeline, budget, website settings. Each table needs RLS policies, proper relationships, and performance optimization.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security analysis: Couples data is highly sensitive - wedding budgets, guest personal info, private family details. Need bulletproof RLS policies: couples see only their data, connected suppliers see limited permitted data, no cross-couple data leakage. Guest data needs GDPR compliance for EU guests.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance considerations: Guest lists can reach 500+ people, task lists grow during planning, core fields update frequently and trigger supplier notifications. Need proper indexing on couple_id, guest search fields, task status, supplier connections. Real-time updates must be efficient.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding business logic: Guest RSVP flows, task assignment to helpers, core fields auto-population across suppliers, budget privacy enforcement, helper permission levels. Each requires specific validation rules and triggers for data consistency.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API security requirements: All couple endpoints need authentication, guest data requires permission checks, budget endpoints need extra security, file uploads (photos) need validation. Use withSecureValidation for every route, implement rate limiting, audit logging for sensitive operations.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Create migration with all 10 tables, comprehensive RLS policies, performance indexes, completion percentage triggers, real-time subscription setup. Build TypeScript database client with full type safety, comprehensive validation, error handling, and integration testing.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track database schema dependencies and API endpoint relationships
2. **postgresql-database-expert** - Use Serena for database pattern optimization and performance
3. **security-compliance-officer** - Ensure RLS policies and API security meet wedding data standards
4. **code-quality-guardian** - Maintain database consistency and API patterns
5. **test-automation-architect** - Comprehensive database and API testing
6. **documentation-chronicler** - Database schema and API endpoint documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### DATABASE SECURITY CHECKLIST:
- [ ] **Row Level Security enabled** on ALL couples tables
- [ ] **RLS policies implemented** - couples see only their data
- [ ] **Supplier permission policies** - limited data access based on connections
- [ ] **Guest data protection** - GDPR compliant with consent tracking
- [ ] **Budget data encryption** - sensitive financial information protected
- [ ] **Audit logging triggers** - track all sensitive data changes
- [ ] **Soft delete policies** - 30-day recovery period for all deletions

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log critical operations with user context

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { secureStringSchema, emailSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- PostgreSQL schema with comprehensive relationships and constraints
- API endpoints with bulletproof security validation
- withSecureValidation middleware required on all routes
- Authentication and rate limiting implementation
- Error handling and audit logging systems
- Real-time subscriptions for live updates
- Database performance optimization with proper indexing

## 📋 TECHNICAL SPECIFICATION

**Database Schema Implementation:**

### 1. Main Couples Table
```sql
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Partner information
  partner1_first_name TEXT NOT NULL,
  partner1_last_name TEXT,
  partner1_email TEXT UNIQUE NOT NULL,
  partner1_phone TEXT,
  partner1_pronouns TEXT,
  partner2_first_name TEXT,
  partner2_last_name TEXT,
  partner2_email TEXT,
  partner2_phone TEXT,
  partner2_pronouns TEXT,
  
  -- Display preferences
  couple_display_name TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'sms', 'whatsapp', 'phone')),
  preferred_contact_person TEXT CHECK (preferred_contact_person IN ('partner1', 'partner2', 'both')),
  
  -- Account status and security
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'cancelled')),
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- Profile customization
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  wedding_hashtag TEXT,
  
  -- Localization
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en-US',
  currency TEXT DEFAULT 'GBP',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_email CHECK (partner1_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
```

### 2. Core Wedding Fields (Auto-Population)
```sql
CREATE TABLE couple_core_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID UNIQUE REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Wedding basics
  wedding_date DATE,
  wedding_date_is_flexible BOOLEAN DEFAULT false,
  
  -- Venue details
  ceremony_venue_name TEXT,
  ceremony_venue_id UUID REFERENCES venues(id),
  ceremony_address_line1 TEXT,
  ceremony_city TEXT,
  ceremony_postcode TEXT,
  ceremony_time TIME,
  
  reception_same_as_ceremony BOOLEAN DEFAULT true,
  reception_venue_name TEXT,
  reception_address_line1 TEXT,
  reception_city TEXT,
  reception_postcode TEXT,
  reception_time TIME,
  
  -- Guest information
  guest_count_estimated INTEGER,
  guest_count_adults INTEGER,
  guest_count_children INTEGER,
  
  -- Wedding style
  wedding_style TEXT[],
  color_scheme TEXT[],
  
  -- Budget (private)
  budget_total DECIMAL(10, 2),
  budget_currency TEXT DEFAULT 'GBP',
  
  -- Completion tracking
  completion_percentage INTEGER DEFAULT 0,
  last_updated_field TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Flexible data
  custom_fields JSONB DEFAULT '{}'::jsonb
);
```

### 3. Couple-Supplier Connections
```sql
CREATE TABLE couple_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Connection details
  connection_status TEXT DEFAULT 'invited' CHECK (connection_status IN (
    'invited', 'connected', 'declined', 'disconnected', 'blocked'
  )),
  service_type TEXT NOT NULL,
  package_name TEXT,
  
  -- Permissions
  can_view_guests BOOLEAN DEFAULT false,
  can_view_budget BOOLEAN DEFAULT false,
  can_view_other_suppliers BOOLEAN DEFAULT true,
  can_edit_timeline BOOLEAN DEFAULT false,
  
  -- Important dates
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  contract_signed_date DATE,
  
  -- Communication
  preferred_contact_method TEXT,
  primary_contact_person TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT unique_couple_supplier UNIQUE(couple_id, supplier_id)
);
```

### 4. Guest Management
```sql
CREATE TABLE couple_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Guest information
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Categorization
  guest_side TEXT CHECK (guest_side IN ('partner1', 'partner2', 'both', 'neutral')),
  guest_type TEXT DEFAULT 'guest' CHECK (guest_type IN (
    'guest', 'wedding_party', 'family', 'vip', 'vendor', 'child'
  )),
  relationship TEXT,
  
  -- RSVP tracking
  invitation_sent BOOLEAN DEFAULT false,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN (
    'pending', 'yes', 'no', 'maybe', 'no_response'
  )),
  rsvp_date DATE,
  attending_ceremony BOOLEAN,
  attending_reception BOOLEAN,
  
  -- Guest details
  plus_one_allowed BOOLEAN DEFAULT false,
  plus_one_name TEXT,
  dietary_requirements TEXT[],
  dietary_notes TEXT,
  accessibility_needs TEXT,
  
  -- Photo groups
  photo_groups TEXT[],
  
  -- Task delegation
  is_helper BOOLEAN DEFAULT false,
  helper_role TEXT,
  can_receive_tasks BOOLEAN DEFAULT false,
  
  -- Communication
  mailing_address TEXT,
  thank_you_sent BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

### 5. Task Delegation System
```sql
CREATE TABLE couple_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Task details
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_category TEXT CHECK (task_category IN (
    'setup', 'guest_management', 'supplier_liaison', 'personal_support',
    'emergency', 'reception', 'cleanup', 'other'
  )),
  
  -- Assignment
  assigned_to_guest_id UUID REFERENCES couple_guests(id),
  assigned_to_name TEXT,
  assigned_to_role TEXT,
  
  -- Timing
  task_timing TEXT CHECK (task_timing IN (
    'before_ceremony', 'during_ceremony', 'after_ceremony',
    'cocktail_hour', 'during_reception', 'end_of_night', 'next_day'
  )),
  specific_time TIME,
  duration_minutes INTEGER,
  
  -- Status and priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
  )),
  
  -- Tracking
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🏗️ API ENDPOINTS TO BUILD

### 1. Couple Profile Management
```typescript
// POST /api/couples/profile - Create couple profile
export const POST = withSecureValidation(
  createCoupleSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorizedResponse();
    
    // Implementation with audit logging
  }
);

// GET /api/couples/profile - Get couple profile
// PUT /api/couples/profile - Update couple profile
// DELETE /api/couples/profile - Soft delete couple profile
```

### 2. Core Wedding Fields API
```typescript
// GET /api/couples/core-fields - Get core wedding data
// PUT /api/couples/core-fields - Update core fields (triggers supplier notifications)
// POST /api/couples/core-fields/auto-populate - Trigger auto-population
```

### 3. Guest Management API
```typescript
// GET /api/couples/guests - List guests with filtering
// POST /api/couples/guests - Add new guest
// PUT /api/couples/guests/[id] - Update guest info
// POST /api/couples/guests/[id]/rsvp - Update RSVP status
// DELETE /api/couples/guests/[id] - Remove guest
```

### 4. Supplier Connections API
```typescript
// GET /api/couples/suppliers - List connected suppliers
// POST /api/couples/suppliers/connect - Connect new supplier
// PUT /api/couples/suppliers/[id]/permissions - Update supplier permissions
// DELETE /api/couples/suppliers/[id] - Disconnect supplier
```

### 5. Task Delegation API
```typescript
// GET /api/couples/tasks - List tasks
// POST /api/couples/tasks - Create new task
// PUT /api/couples/tasks/[id] - Update task
// POST /api/couples/tasks/[id]/assign - Assign task to helper
// PUT /api/couples/tasks/[id]/status - Update task status
```

## 🔐 ROW LEVEL SECURITY POLICIES

### Couples Table RLS
```sql
-- Couples can access their own data
CREATE POLICY couples_own_data ON couples FOR ALL USING (auth.uid() = auth_user_id);

-- Suppliers can see connected couple data
CREATE POLICY suppliers_see_connected_couples ON couples FOR SELECT USING (
  id IN (
    SELECT couple_id FROM couple_suppliers
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE auth_user_id = auth.uid()
    )
    AND connection_status = 'connected'
  )
);
```

### Core Fields RLS
```sql
-- Couples can manage their core fields
CREATE POLICY core_fields_own_data ON couple_core_fields FOR ALL USING (
  couple_id IN (
    SELECT id FROM couples WHERE auth_user_id = auth.uid()
  )
);

-- Connected suppliers can view (but not edit) core fields
CREATE POLICY suppliers_view_core_fields ON couple_core_fields FOR SELECT USING (
  couple_id IN (
    SELECT couple_id FROM couple_suppliers
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE auth_user_id = auth.uid()
    )
    AND connection_status = 'connected'
  )
);
```

## 📊 PERFORMANCE OPTIMIZATION

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_couples_auth_user ON couples(auth_user_id);
CREATE INDEX idx_couples_emails ON couples(partner1_email, partner2_email);
CREATE INDEX idx_core_fields_couple ON couple_core_fields(couple_id);
CREATE INDEX idx_guests_couple_rsvp ON couple_guests(couple_id, rsvp_status);
CREATE INDEX idx_tasks_couple_status ON couple_tasks(couple_id, status);
CREATE INDEX idx_suppliers_couple_status ON couple_suppliers(couple_id, connection_status);
```

### Database Functions and Triggers
```sql
-- Completion percentage calculation trigger
CREATE OR REPLACE FUNCTION calculate_core_fields_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_fields INTEGER := 15;
  completed_fields INTEGER := 0;
BEGIN
  -- Count completed fields
  IF NEW.wedding_date IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.ceremony_venue_name IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  IF NEW.guest_count_estimated IS NOT NULL THEN completed_fields := completed_fields + 1; END IF;
  -- Add more field checks
  
  NEW.completion_percentage := (completed_fields * 100) / total_fields;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_completion_trigger
  BEFORE INSERT OR UPDATE ON couple_core_fields
  FOR EACH ROW EXECUTE FUNCTION calculate_core_fields_completion();
```

## 💾 WHERE TO SAVE YOUR WORK
- Migration: $WS_ROOT/wedsync/supabase/migrations/$(date +%Y%m%d%H%M%S)_couples_tables.sql
- Database Client: $WS_ROOT/wedsync/src/lib/database/couples.ts
- API Routes: $WS_ROOT/wedsync/src/app/api/couples/
- Types: $WS_ROOT/wedsync/src/types/couples.ts
- Tests: $WS_ROOT/wedsync/tests/database/couples.test.ts

## 🧪 TESTING REQUIREMENTS

### 1. Database Testing
```typescript
describe('Couples Database Schema', () => {
  it('should create couple with valid data', async () => {
    const couple = await couplesDb.createCouple({
      partner1_first_name: 'Emma',
      partner1_email: 'emma@example.com',
      partner2_first_name: 'James'
    });
    expect(couple.id).toBeDefined();
  });

  it('should enforce RLS policies', async () => {
    // Test that couples can only see their own data
  });

  it('should handle guest list operations', async () => {
    // Test RSVP updates, dietary requirements, etc.
  });
});
```

### 2. API Endpoint Testing
```typescript
describe('Couples API Endpoints', () => {
  it('should require authentication', async () => {
    const response = await fetch('/api/couples/profile');
    expect(response.status).toBe(401);
  });

  it('should validate input with Zod', async () => {
    const response = await fetch('/api/couples/profile', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    });
    expect(response.status).toBe(400);
  });
});
```

## ✅ COMPLETION CHECKLIST

### Database Implementation:
- [ ] All 5 couples tables created with proper schema
- [ ] RLS policies implemented and tested
- [ ] Performance indexes created
- [ ] Completion percentage triggers working
- [ ] Migration file created and tested locally
- [ ] Soft delete functionality implemented

### API Endpoints:
- [ ] All 15+ API endpoints created with proper security
- [ ] withSecureValidation middleware used everywhere
- [ ] Authentication checks on all protected routes
- [ ] Rate limiting implemented on public endpoints
- [ ] Comprehensive error handling with audit logging
- [ ] Input validation with Zod schemas

### TypeScript Integration:
- [ ] Database client with full type safety
- [ ] TypeScript interfaces for all data types
- [ ] Type-safe API responses
- [ ] Validation schemas with proper types

### Security Verification:
- [ ] No direct request.json() without validation
- [ ] All strings use secureStringSchema
- [ ] Budget data properly protected
- [ ] Guest data GDPR compliant
- [ ] Supplier permission boundaries enforced

## 🗄️ DATABASE MIGRATION HANDOVER

**CRITICAL: Send migration to SQL Expert for review and application**

Create file: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-301.md`

```markdown
# MIGRATION REQUEST - WS-301 - Database Implementation Couples Tables
## Team: B
## Round: 1

### Migration Files Created:
- `$WS_ROOT/wedsync/supabase/migrations/$(date +%Y%m%d%H%M%S)_couples_tables.sql`

### Purpose:
Creates comprehensive couples database schema with 5 main tables, RLS policies, performance indexes, and triggers for wedding coordination data management.

### Dependencies:
- Requires: suppliers table (from WS-300)
- Requires: venues table (from core schema)
- Requires: auth.users table (Supabase auth)

### Tables Created:
1. couples - Main couple accounts
2. couple_core_fields - Auto-population wedding data
3. couple_suppliers - Supplier connections with permissions
4. couple_guests - Guest management and RSVP
5. couple_tasks - Task delegation system

### Special Features:
- Comprehensive RLS policies for data privacy
- Completion percentage calculation triggers
- Performance optimization indexes
- Soft delete with audit trails
- GDPR compliant guest data handling

### Testing Done:
- [ ] Migration syntax validated
- [ ] Applied locally without errors
- [ ] RLS policies tested
- [ ] Rollback script tested
- [ ] Performance tested with sample data
```

---

**EXECUTE IMMEDIATELY - This is the core database architecture for wedding couples data management!**