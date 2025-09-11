# TEAM B - ROUND 1: WS-312 - Client Dashboard Builder Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build the backend API endpoints and database schema for dashboard template management with secure storage and client portal access
**FEATURE ID:** WS-312 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about secure template storage, efficient data retrieval, and scalable client portal generation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/dashboard-templates/
cat $WS_ROOT/wedsync/src/app/api/dashboard-templates/route.ts | head -20
ls -la $WS_ROOT/wedsync/supabase/migrations/
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **DATABASE MIGRATION RESULTS:**
```bash
# MUST show successful migration application
npx supabase migration up --linked
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query API patterns and database schema
await mcp__serena__search_for_pattern("api.*route|database.*schema|template.*storage");
await mcp__serena__find_symbol("route", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to backend API development
mcp__Ref__ref_search_documentation("Next.js 15 App Router API routes PostgreSQL Supabase");
mcp__Ref__ref_search_documentation("Supabase database migrations schema design best practices");
mcp__Ref__ref_search_documentation("API authentication JWT middleware security validation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Dashboard template backend needs: 1) Database schema for storing template configurations with JSONB for flexible sections, 2) API endpoints for CRUD operations with proper authentication, 3) Template sharing system for client portal access, 4) Performance optimization for template rendering, 5) Security validation for template data sanitization.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API development and database design
2. **postgresql-database-expert** - Focus on schema design and query optimization
3. **security-compliance-officer** - Ensure API security and data validation
4. **code-quality-guardian** - Maintain API architecture standards
5. **test-automation-architect** - API integration testing and performance validation
6. **documentation-chronicler** - API documentation and schema documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all template operations
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all template data
- [ ] **XSS prevention** - Sanitize HTML in template configurations
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Template access control** - Only supplier can modify their templates
- [ ] **Client portal security** - Read-only access with proper validation
- [ ] **Audit logging** - Log template operations with user context

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**SPECIFIC RESPONSIBILITIES:**
- API endpoints with comprehensive security validation
- Database schema design and migration creation
- withSecureValidation middleware implementation
- Authentication and authorization logic
- Business logic for template management
- Error handling and logging systems
- Performance optimization for template queries
- Integration with Supabase features

## 📋 TECHNICAL SPECIFICATION REQUIREMENTS

### USER STORY CONTEXT
**As a:** Wedding photographer who wants to provide each couple with a personalized client portal
**I want to:** Secure backend storage and API access for dashboard templates with proper client portal generation
**So that:** Template data is protected, performant, and couples can access their personalized portals reliably

### DATABASE SCHEMA TO IMPLEMENT

#### 1. Client Dashboard Templates Table
```sql
-- Migration: WS-312 Dashboard Template Storage
CREATE TABLE IF NOT EXISTS client_dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sections JSONB DEFAULT '[]' NOT NULL,
  branding JSONB DEFAULT '{}' NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_sections CHECK (jsonb_typeof(sections) = 'array'),
  CONSTRAINT valid_branding CHECK (jsonb_typeof(branding) = 'object'),
  CONSTRAINT unique_default_per_supplier UNIQUE (supplier_id, is_default) WHERE is_default = TRUE
);

-- Indexes for performance
CREATE INDEX idx_dashboard_templates_supplier ON client_dashboard_templates(supplier_id);
CREATE INDEX idx_dashboard_templates_active ON client_dashboard_templates(supplier_id, is_active);
```

#### 2. Client Portal Assignments Table
```sql
CREATE TABLE IF NOT EXISTS client_portal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES client_dashboard_templates(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES user_profiles(id),
  
  -- Constraints
  CONSTRAINT unique_client_assignment UNIQUE (client_id)
);

CREATE INDEX idx_portal_assignments_client ON client_portal_assignments(client_id);
CREATE INDEX idx_portal_assignments_template ON client_portal_assignments(template_id);
```

### API ENDPOINTS TO IMPLEMENT

#### 1. Template Management API
```typescript
// GET /api/dashboard-templates
// POST /api/dashboard-templates
// PUT /api/dashboard-templates/[id]
// DELETE /api/dashboard-templates/[id]

interface DashboardTemplateRequest {
  name: string;
  description?: string;
  sections: DashboardSection[];
  branding: BrandingConfig;
  isDefault?: boolean;
}

interface DashboardSection {
  id: string;
  type: 'timeline' | 'photos' | 'forms' | 'vendors' | 'documents' | 'payments' | 'guests' | 'planning';
  title: string;
  config: Record<string, any>;
  order: number;
  isVisible: boolean;
}

interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  customCss?: string;
}
```

#### 2. Client Portal API
```typescript
// GET /api/client-portal/[clientId]
// POST /api/client-portal/assign
// PUT /api/client-portal/[clientId]/sections

interface ClientPortalData {
  template: DashboardTemplate;
  clientData: ClientWeddingData;
  sections: PopulatedSection[];
  branding: BrandingConfig;
}
```

### BUSINESS LOGIC REQUIREMENTS

#### Template Validation
```typescript
const templateValidationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sections: z.array(z.object({
    id: z.string(),
    type: z.enum(['timeline', 'photos', 'forms', 'vendors', 'documents', 'payments', 'guests', 'planning']),
    title: z.string().min(1).max(100),
    config: z.record(z.any()),
    order: z.number().min(0),
    isVisible: z.boolean()
  })),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    logoUrl: z.string().url().optional(),
    fontFamily: z.string().max(50).optional(),
    customCss: z.string().max(5000).optional()
  }),
  isDefault: z.boolean().optional()
});
```

#### Security Middleware
```typescript
// withSecureValidation wrapper for all template endpoints
export const withTemplateAccess = (handler: APIHandler) =>
  withSecureValidation(
    templateValidationSchema,
    async (req, res, validatedData) => {
      // Verify supplier owns template or has permission
      const { userId } = await getServerSession();
      const template = await getTemplate(req.query.id);
      
      if (template.supplier_id !== userId) {
        return new Response('Unauthorized', { status: 403 });
      }
      
      return handler(req, res, validatedData);
    }
  );
```

### PERFORMANCE OPTIMIZATION
- Implement JSONB indexing for section queries
- Cache template rendering for client portals
- Optimize template assignment queries
- Implement pagination for template lists
- Use database views for complex template data

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Database migration with template schema
- [ ] CRUD API endpoints with authentication
- [ ] Template validation and security middleware
- [ ] Client portal assignment system
- [ ] Performance indexing and optimization
- [ ] Error handling and logging
- [ ] API integration tests
- [ ] Documentation for API usage

## 💾 WHERE TO SAVE YOUR WORK
- Migration: `$WS_ROOT/wedsync/supabase/migrations/ws-312_dashboard_templates.sql`
- API Routes: `$WS_ROOT/wedsync/src/app/api/dashboard-templates/route.ts`
- Template API: `$WS_ROOT/wedsync/src/app/api/dashboard-templates/[id]/route.ts`
- Portal API: `$WS_ROOT/wedsync/src/app/api/client-portal/[clientId]/route.ts`
- Validation: `$WS_ROOT/wedsync/src/lib/validations/template-schema.ts`
- Types: `$WS_ROOT/wedsync/src/types/dashboard-template.ts`
- Tests: `$WS_ROOT/wedsync/src/__tests__/api/dashboard-templates/`

## 🏁 COMPLETION CHECKLIST
- [ ] Database migration created and applied successfully
- [ ] All API endpoints implemented with proper authentication
- [ ] TypeScript compilation successful (no errors)
- [ ] Security validation and rate limiting implemented
- [ ] Template CRUD operations working correctly
- [ ] Client portal assignment system functional
- [ ] Performance indexing applied to database
- [ ] Integration tests written and passing (>90% coverage)
- [ ] API documentation created
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

## 🚨 WEDDING INDUSTRY CONTEXT
Remember: This backend powers the client dashboard builder that helps wedding suppliers eliminate scattered email communication. The API must be secure, performant, and reliable because couples depend on these portals for critical wedding information. Think about suppliers managing multiple client portals simultaneously and couples accessing their wedding details frequently.

---

**EXECUTE IMMEDIATELY - Build bulletproof backend infrastructure for wedding platform success!**