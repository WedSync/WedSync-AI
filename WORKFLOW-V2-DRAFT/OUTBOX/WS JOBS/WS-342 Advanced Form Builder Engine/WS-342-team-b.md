# TEAM B - ROUND 1: WS-342 - Advanced Form Builder Engine Backend
## 2025-01-31 - Development Round 1

**YOUR MISSION:** Build the robust backend API and database infrastructure for the Advanced Form Builder Engine with complex validation, conditional logic processing, and enterprise-grade form submission handling
**FEATURE ID:** WS-342 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about making form data management bulletproof and scalable for wedding suppliers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **DATABASE MIGRATION PROOF:**
```bash
ls -la $WS_ROOT/wedsync/supabase/migrations/ | grep form_builder
npx supabase migration up --linked
# MUST show: "All migrations applied successfully"
```

2. **API ENDPOINT PROOF:**
```bash
curl -X POST http://localhost:3000/api/forms/create -H "Content-Type: application/json"
# MUST return: Valid API response structure
```

3. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API and database patterns
await mcp__serena__search_for_pattern("api.*route|database.*migration|form.*api");
await mcp__serena__find_symbol("api", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api/");
```

### B. DATABASE & API TECHNOLOGY STACK (MANDATORY FOR BACKEND WORK)
```typescript
// CRITICAL: Load database and API configurations
await mcp__serena__read_file("$WS_ROOT/supabase/config.toml");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/supabase.ts");
```

**🚨 CRITICAL BACKEND TECHNOLOGY STACK:**
- **Next.js 15.4.3**: App Router with API routes (MANDATORY)
- **Supabase 2.55.0**: PostgreSQL database with RLS (MANDATORY)
- **TypeScript 5.9.2**: Strict mode for all backend code (MANDATORY)
- **Zod 4.0.17**: Schema validation and type inference
- **@supabase/ssr**: Server-side auth handling
- **Bull/Redis**: Background job processing for form submissions

**❌ DO NOT USE:**
- Any other database ORM or query builder
- Express.js or other HTTP frameworks

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load form processing and validation documentation
mcp__Ref__ref_search_documentation("Next.js API routes Supabase database design form validation");
mcp__Ref__ref_search_documentation("PostgreSQL JSON queries conditional logic processing Zod validation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX BACKEND ARCHITECTURE

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "This Advanced Form Builder backend needs to handle complex form schemas with 15+ field types, nested conditional logic, multi-step workflows, file uploads, and real-time validation. The database schema must be flexible enough to store arbitrary form configurations while maintaining query performance for form submissions and analytics.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints and database migrations
2. **supabase-specialist** - Use Supabase best practices for form data storage
3. **postgresql-database-expert** - Design optimized database schema for form builder
4. **api-architect** - Create RESTful API design for form operations
5. **security-compliance-officer** - Ensure secure form data handling
6. **test-automation-architect** - Comprehensive API and database testing

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### BACKEND SECURITY CHECKLIST:
- [ ] **Row Level Security** - All form tables have RLS policies
- [ ] **Input validation** - Zod schemas for all API endpoints
- [ ] **SQL injection prevention** - Parameterized queries only
- [ ] **XSS prevention** - Sanitize all user inputs before storage
- [ ] **CSRF protection** - Verify CSRF tokens on all mutations
- [ ] **Authentication** - Verify user identity on all form operations
- [ ] **Authorization** - Check tier limits and form ownership
- [ ] **Audit logging** - Log all form creation and modification

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- Next.js API routes with proper error handling
- Supabase database operations with RLS
- TypeScript interfaces for all data structures
- Zod validation schemas matching frontend forms
- Comprehensive error handling and logging
- Background job processing for form submissions
- Database optimization for complex queries

## 📋 DETAILED TECHNICAL SPECIFICATION

### Real Wedding Scenario Backend Context
**User:** Sarah creates a 3-step client intake form with conditional logic
**Backend Requirements:** Store flexible form schema, validate submissions, process file uploads
**Success:** Handle 1000+ concurrent form submissions during wedding season peak

### Core Database Schema Implementation

#### 1. Forms Table (Enhanced)
```sql
-- Main forms table with comprehensive configuration
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    form_name TEXT NOT NULL,
    form_description TEXT,
    form_type TEXT NOT NULL CHECK (form_type IN 
        ('intake', 'questionnaire', 'booking', 'contract', 'payment', 'feedback')),
    
    -- Form configuration
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    requires_authentication BOOLEAN DEFAULT false,
    max_submissions INTEGER, -- NULL for unlimited
    submission_count INTEGER DEFAULT 0,
    
    -- Multi-step configuration
    is_multi_step BOOLEAN DEFAULT false,
    step_count INTEGER DEFAULT 1,
    step_configuration JSONB DEFAULT '[]', -- Step metadata
    
    -- Design and behavior
    theme_id UUID REFERENCES form_themes(id),
    custom_css TEXT,
    completion_redirect_url TEXT,
    thank_you_message TEXT,
    
    -- Advanced settings
    allows_multiple_submissions BOOLEAN DEFAULT false,
    auto_save_progress BOOLEAN DEFAULT true,
    submission_deadline TIMESTAMPTZ,
    notification_emails TEXT[], -- Multiple email recipients
    
    -- Integration settings
    webhook_url TEXT,
    crm_integration_config JSONB DEFAULT '{}',
    email_integration_config JSONB DEFAULT '{}',
    
    -- Analytics and optimization
    analytics_enabled BOOLEAN DEFAULT true,
    ab_test_config JSONB DEFAULT '{}',
    
    -- SEO and sharing
    meta_title TEXT,
    meta_description TEXT,
    social_image_url TEXT,
    custom_slug TEXT UNIQUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT forms_supplier_id_idx PRIMARY KEY (supplier_id, id),
    INDEX (supplier_id, is_active),
    INDEX (form_type, is_active),
    INDEX (custom_slug) WHERE custom_slug IS NOT NULL
);
```

#### 2. Form Fields Table (Enhanced)
```sql
-- Form fields with advanced configuration and conditional logic
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    step_number INTEGER DEFAULT 1, -- For multi-step forms
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN 
        ('text', 'textarea', 'email', 'phone', 'number', 'date', 'time', 'datetime',
         'select', 'multiselect', 'radio', 'checkbox', 'file_upload', 'signature',
         'address', 'payment', 'rating', 'slider', 'matrix', 'section_break',
         'wedding_date', 'guest_count', 'venue_info', 'dietary_requirements')),
    
    -- Field configuration
    is_required BOOLEAN DEFAULT false,
    placeholder_text TEXT,
    help_text TEXT,
    default_value TEXT,
    
    -- Field constraints
    min_length INTEGER,
    max_length INTEGER,
    min_value NUMERIC,
    max_value NUMERIC,
    validation_pattern TEXT, -- Regex pattern
    validation_message TEXT,
    custom_validation_rules JSONB DEFAULT '[]', -- Advanced validation
    
    -- Field options for select/radio/checkbox
    field_options JSONB DEFAULT '[]', -- [{value, label, color, icon, conditional_logic}]
    allow_other_option BOOLEAN DEFAULT false,
    option_randomization BOOLEAN DEFAULT false,
    
    -- File upload specific
    accepted_file_types TEXT[], -- ['jpg', 'png', 'pdf']
    max_file_size_mb INTEGER DEFAULT 10,
    max_file_count INTEGER DEFAULT 1,
    file_storage_path TEXT,
    
    -- Layout and display
    field_order INTEGER NOT NULL,
    field_width TEXT DEFAULT 'full' CHECK (field_width IN ('full', 'half', 'third', 'quarter')),
    is_hidden BOOLEAN DEFAULT false,
    css_classes TEXT,
    
    -- Conditional logic (Enhanced)
    conditional_logic JSONB DEFAULT '{}', -- {show_if: [], hide_if: [], require_if: []}
    logic_operator TEXT DEFAULT 'AND' CHECK (logic_operator IN ('AND', 'OR')),
    
    -- Integration mappings
    crm_field_mapping TEXT,
    calendar_field_mapping TEXT,
    webhook_field_mapping TEXT,
    
    -- Analytics
    track_analytics BOOLEAN DEFAULT true,
    analytics_config JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX (form_id, step_number, field_order),
    INDEX (form_id, is_required),
    INDEX (field_type)
);
```

#### 3. Form Submissions Table
```sql
-- Form submissions with comprehensive tracking
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES user_profiles(id), -- NULL for anonymous
    supplier_id UUID REFERENCES user_profiles(id) NOT NULL,
    
    -- Submission data
    submission_data JSONB NOT NULL DEFAULT '{}',
    partial_data JSONB DEFAULT '{}', -- For multi-step forms
    current_step INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    
    -- File attachments
    file_attachments JSONB DEFAULT '[]', -- [{field_id, file_url, file_name, file_size}]
    
    -- Submission metadata
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    submission_source TEXT DEFAULT 'web', -- web, mobile, api
    
    -- Processing status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN 
        ('pending', 'processing', 'completed', 'failed', 'requires_review')),
    processing_errors JSONB DEFAULT '[]',
    
    -- Integration status
    crm_sync_status TEXT DEFAULT 'pending',
    crm_sync_at TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,
    webhook_sent_at TIMESTAMPTZ,
    
    -- Analytics
    time_to_complete INTEGER, -- seconds
    field_completion_times JSONB DEFAULT '{}', -- {field_id: seconds}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    INDEX (form_id, created_at),
    INDEX (supplier_id, created_at),
    INDEX (client_id, created_at) WHERE client_id IS NOT NULL,
    INDEX (processing_status),
    INDEX (is_completed, created_at)
);
```

### Core API Endpoints Implementation

#### 1. Form Management API
```typescript
// POST /api/forms/create
interface CreateFormRequest {
  form_name: string;
  form_description?: string;
  form_type: FormType;
  is_multi_step?: boolean;
  fields: FormFieldConfig[];
  settings: FormSettings;
}

// PUT /api/forms/[id]/update
interface UpdateFormRequest {
  form_name?: string;
  fields?: FormFieldConfig[];
  settings?: Partial<FormSettings>;
}

// GET /api/forms/[id]
interface GetFormResponse {
  form: FormConfiguration;
  fields: FormFieldConfig[];
  analytics?: FormAnalytics;
}
```

#### 2. Form Submission API
```typescript
// POST /api/forms/[id]/submit
interface SubmitFormRequest {
  step?: number; // For multi-step forms
  submission_data: Record<string, any>;
  files?: FileUpload[];
  partial_save?: boolean;
}

// GET /api/forms/[id]/submissions
interface GetSubmissionsResponse {
  submissions: FormSubmission[];
  pagination: PaginationInfo;
  analytics: SubmissionAnalytics;
}
```

#### 3. Form Validation API
```typescript
// POST /api/forms/[id]/validate
interface ValidateFormRequest {
  field_id: string;
  value: any;
  context?: Record<string, any>; // For conditional validation
}

interface ValidateFormResponse {
  is_valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Database Schema (PRIORITY 1)
- [ ] Complete forms table with advanced configuration options
- [ ] Form fields table with conditional logic support
- [ ] Form submissions table with file attachment handling
- [ ] Form analytics table for performance tracking
- [ ] Row Level Security policies for all tables

### API Endpoints (PRIORITY 2) 
- [ ] Form CRUD operations with comprehensive validation
- [ ] Form submission processing with file upload support
- [ ] Real-time validation API for form building
- [ ] Conditional logic evaluation engine
- [ ] Form analytics aggregation API

### Business Logic (PRIORITY 3)
- [ ] Conditional logic processing engine
- [ ] File upload and storage management
- [ ] Form submission workflow automation
- [ ] Email notification system integration
- [ ] CRM synchronization background jobs

### Integration Layer (PRIORITY 4)
- [ ] Webhook delivery system for form submissions
- [ ] Email automation trigger system
- [ ] Calendar integration for appointment booking
- [ ] Analytics data collection and processing
- [ ] Background job queue for heavy operations

## 💾 WHERE TO SAVE YOUR WORK

**Migration Files:**
- `$WS_ROOT/wedsync/supabase/migrations/[timestamp]_form_builder_schema.sql`
- `$WS_ROOT/wedsync/supabase/migrations/[timestamp]_form_builder_rls.sql`

**API Route Files:**
- `$WS_ROOT/wedsync/src/app/api/forms/create/route.ts`
- `$WS_ROOT/wedsync/src/app/api/forms/[id]/route.ts`
- `$WS_ROOT/wedsync/src/app/api/forms/[id]/submit/route.ts`
- `$WS_ROOT/wedsync/src/app/api/forms/[id]/validate/route.ts`

**Service Layer:**
- `$WS_ROOT/wedsync/src/lib/services/FormBuilderService.ts`
- `$WS_ROOT/wedsync/src/lib/services/FormSubmissionService.ts`
- `$WS_ROOT/wedsync/src/lib/services/ConditionalLogicEngine.ts`

**Type Definitions:**
- `$WS_ROOT/wedsync/src/types/form-builder-api.ts`

**Validation Schemas:**
- `$WS_ROOT/wedsync/src/lib/validations/form-builder-schemas.ts`

## 🧪 TESTING REQUIREMENTS

### Unit Tests Required
```bash
# Test files to create:
$WS_ROOT/wedsync/__tests__/api/forms/create.test.ts
$WS_ROOT/wedsync/__tests__/api/forms/submit.test.ts
$WS_ROOT/wedsync/__tests__/services/FormBuilderService.test.ts
$WS_ROOT/wedsync/__tests__/services/ConditionalLogicEngine.test.ts
```

### Testing Scenarios
- [ ] Form creation with all field types
- [ ] Form submission with file uploads
- [ ] Conditional logic evaluation accuracy
- [ ] Multi-step form progression
- [ ] Validation schema enforcement
- [ ] RLS policy enforcement
- [ ] Background job processing

## 🏁 COMPLETION CHECKLIST

### Technical Implementation
- [ ] All database migrations created and tested
- [ ] All API endpoints implemented with proper error handling
- [ ] TypeScript interfaces match database schema exactly
- [ ] Zod validation schemas comprehensive and tested
- [ ] Background job processing working reliably

### Security & Performance
- [ ] RLS policies prevent unauthorized access
- [ ] Input validation prevents injection attacks
- [ ] File upload security measures implemented
- [ ] Database queries optimized with proper indexes
- [ ] API rate limiting implemented

### Wedding Context
- [ ] Form submission processing handles wedding-specific data
- [ ] Integration with existing wedding workflow systems
- [ ] Analytics capture wedding industry metrics
- [ ] Email notifications use wedding terminology
- [ ] CRM sync preserves wedding client relationships

### Testing & Evidence
- [ ] Unit tests covering all API endpoints
- [ ] Integration tests for form submission workflows
- [ ] Load tests for concurrent form submissions
- [ ] Security tests for input validation
- [ ] Database performance benchmarks met

---

**EXECUTE IMMEDIATELY - Build the Advanced Form Builder backend that powers sophisticated wedding forms with enterprise reliability!**