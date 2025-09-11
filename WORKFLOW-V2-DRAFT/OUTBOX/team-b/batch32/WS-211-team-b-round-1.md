# TEAM B - ROUND 1: WS-211 - Client Dashboard Templates - Backend APIs & Database

**Date:** 2025-08-28  
**Feature ID:** WS-211 (Track all work with this ID)  
**Priority:** P1 (High value for supplier efficiency)  
**Mission:** Build robust backend APIs and database schema for dashboard template management  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer managing 30+ active clients with different packages  
**I want to:** Create reusable dashboard templates for each service tier that automatically apply to new clients  
**So that:** I save 2 hours per client on dashboard setup and ensure consistent experiences, saving 60+ hours monthly  

**Real Wedding Problem This Solves:**  
Backend systems need to efficiently store, retrieve, and manage thousands of template configurations. When a photographer books 20 weddings in peak season, template assignment must be instant and reliable, with complex visibility rules and section configurations processed efficiently.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Database schema for templates, sections, and assignments
- Template CRUD APIs with validation
- Auto-assignment rules engine
- Template cloning and inheritance
- Section configuration management
- Performance optimization for template queries

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes, Supabase Edge Functions
- Database: PostgreSQL 15 with advanced JSONB queries
- Authentication: Supabase Auth with Row Level Security
- Validation: Zod schemas with comprehensive validation
- Testing: Vitest for API testing

**Integration Points:**
- Database: Template storage with JSONB section configurations
- Authentication: Supplier isolation and permissions
- Real-time: Template updates with Supabase realtime
- File Storage: Template assets and section media

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. Load backend development documentation:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 API routes database CRUD patterns"});
await mcp__Ref__ref_search_documentation({query: "Supabase PostgreSQL JSONB queries advanced"});
await mcp__Ref__ref_search_documentation({query: "Zod validation schemas API routes Next.js"});
await mcp__Ref__ref_search_documentation({query: "Row Level Security policies Supabase"});

// 2. Check existing database schema patterns:
await Task({
  description: "Analyze existing database schema",
  prompt: "Use PostgreSQL MCP to: 1) List all existing tables and their relationships, 2) Identify patterns for JSONB storage, 3) Check existing RLS policies for supplier isolation",
  subagent_type: "postgresql-database-expert"
});

// 3. Review existing API patterns:
await Grep({
  pattern: "dashboard|template|client.*assignment",
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api",
  output_mode: "files_with_matches"
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Build template management APIs and database schema"
2. **nextjs-fullstack-developer** --think-hard "Create robust API routes with validation"
3. **postgresql-database-expert** --think-ultra-hard "Design template database schema with JSONB"
4. **supabase-specialist** --think-ultra-hard "Implement RLS policies and realtime features"
5. **security-compliance-officer** --think-ultra-hard "Ensure data isolation and validation"
6. **test-automation-architect** --api-testing "Create comprehensive API test suite"
7. **performance-optimization-expert** --database-performance "Optimize template queries"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE**
- Analyze template data structure requirements
- Review existing client and supplier relationships
- Check current dashboard section implementations
- Understand template assignment rule complexity

### **PLAN PHASE**
- Design database schema with proper relationships
- Plan API endpoints with comprehensive validation
- Design template assignment automation
- Create performance optimization strategy

### **CODE PHASE**
- Create database migrations for template tables
- Implement template CRUD API endpoints
- Build template assignment rule engine
- Add validation and security layers

### **COMMIT PHASE**
- Test all API endpoints thoroughly
- Validate database performance
- Ensure data isolation and security
- Create API documentation

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database schema and migrations for template system
- [ ] Template CRUD API endpoints (/api/dashboard/templates)
- [ ] Section configuration API (/api/dashboard/sections)
- [ ] Template assignment API (/api/dashboard/templates/assign)
- [ ] Template cloning endpoint (/api/dashboard/templates/:id/clone)
- [ ] Validation schemas for all template operations

### Database Schema to Create:
```sql
-- /wedsync/supabase/migrations/[timestamp]_dashboard_templates.sql
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('default', 'package', 'venue', 'custom')),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout TEXT CHECK (layout IN ('single_column', 'sidebar', 'grid')) DEFAULT 'single_column',
  branding JSONB DEFAULT '{}'::jsonb,
  visibility_rules JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  parent_template_id UUID REFERENCES dashboard_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, name)
);

CREATE TABLE IF NOT EXISTS template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  assignment_rule TEXT,
  overrides JSONB DEFAULT '{}'::jsonb,
  UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS template_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  rule_type TEXT CHECK (rule_type IN ('package', 'venue', 'tag', 'custom')),
  conditions JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_templates_supplier ON dashboard_templates(supplier_id);
CREATE INDEX idx_templates_default ON dashboard_templates(supplier_id, is_default);
CREATE INDEX idx_assignments_client ON template_assignments(client_id);
CREATE INDEX idx_assignment_rules_supplier ON template_assignment_rules(supplier_id);

-- Row Level Security
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Templates isolated by supplier" ON dashboard_templates
  FOR ALL USING (supplier_id = auth.uid() OR supplier_id IN (
    SELECT id FROM suppliers WHERE auth.uid() = ANY(team_members)
  ));
```

### API Endpoints to Create:
```typescript
// /wedsync/src/app/api/dashboard/templates/route.ts
export async function GET(request: NextRequest) {
  // List templates with filtering and pagination
  // Include usage analytics and performance metrics
}

export async function POST(request: NextRequest) {
  // Create new template with comprehensive validation
  // Handle section configuration and branding options
}

// /wedsync/src/app/api/dashboard/templates/[id]/route.ts
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // Update template with version control
  // Validate all changes and maintain consistency
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // Delete template with dependency checking
  // Handle cascade operations safely
}

// /wedsync/src/app/api/dashboard/templates/[id]/clone/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Clone template with modifications
  // Handle inheritance and customization
}

// /wedsync/src/lib/validations/dashboard-templates.ts
import { z } from 'zod';

export const templateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['default', 'package', 'venue', 'custom']),
  sections: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    config: z.record(z.any()),
    visibility: z.record(z.any())
  })),
  layout: z.enum(['single_column', 'sidebar', 'grid']),
  branding: z.record(z.any()),
  isDefault: z.boolean().optional()
});
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Template data structure and component requirements
- FROM Team C: Client assignment logic requirements

### What other teams NEED from you:
- TO Team A: Template API endpoints and data structures
- TO Team C: Template assignment APIs for integration
- TO Team D: Mobile-optimized API responses
- TO Team E: API testing endpoints and mock data

---

## ⚠️ DATABASE MIGRATIONS

**CRITICAL DATABASE PROTOCOL:**
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-211.md`
- Include: migration file path, dependencies, testing requirements
- SQL Expert will validate, apply safely, and resolve conflicts

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### API Security:
- [ ] All template endpoints require authentication
- [ ] Templates isolated per supplier (no data leakage)
- [ ] Template assignment validates client ownership
- [ ] Section configurations sanitized for XSS
- [ ] Rate limiting on template operations

### Database Security:
- [ ] Row Level Security enforces supplier isolation
- [ ] JSONB validation prevents malformed data
- [ ] Foreign key constraints maintain data integrity
- [ ] Audit logging for template modifications
- [ ] Backup and recovery procedures

### Validation Security:
- [ ] All inputs validated with Zod schemas
- [ ] Template names and descriptions sanitized
- [ ] Section configurations validated recursively
- [ ] File uploads validated and scanned
- [ ] Assignment rules validated for safety

---

## 🎭 COMPREHENSIVE API TESTING

```javascript
// Template CRUD testing
describe('Template API Endpoints', () => {
  test('Create template with validation', async () => {
    const templateData = {
      name: 'Premium Wedding Dashboard',
      description: 'Dashboard for premium clients',
      category: 'package',
      sections: [
        {
          id: 'welcome',
          type: 'welcome',
          title: 'Welcome',
          config: { showGreeting: true },
          visibility: { always: true }
        }
      ],
      layout: 'single_column',
      branding: { primaryColor: '#blue' }
    };

    const response = await fetch('/api/dashboard/templates', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify(templateData)
    });

    expect(response.status).toBe(201);
    const template = await response.json();
    expect(template.name).toBe(templateData.name);
    expect(template.supplier_id).toBe(testSupplierId);
  });

  test('Template auto-assignment rules', async () => {
    // Test package-based assignment
    const client = { package: 'luxury', venue: null };
    const response = await fetch('/api/dashboard/templates/assign', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({ clientId: testClientId })
    });

    expect(response.status).toBe(200);
    const assignment = await response.json();
    expect(assignment.template.name).toBe('Luxury Experience Dashboard');
  });

  test('Template cloning with modifications', async () => {
    const modifications = {
      name: 'Customized Premium Dashboard',
      branding: { primaryColor: '#green' }
    };

    const response = await fetch(`/api/dashboard/templates/${templateId}/clone`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify(modifications)
    });

    expect(response.status).toBe(201);
    const clonedTemplate = await response.json();
    expect(clonedTemplate.name).toBe(modifications.name);
    expect(clonedTemplate.parent_template_id).toBe(templateId);
  });
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Database Implementation:
- [ ] All template tables created with proper relationships
- [ ] JSONB section configurations working efficiently
- [ ] Row Level Security policies enforcing supplier isolation
- [ ] Indexes optimized for template queries
- [ ] Migration files ready for SQL Expert review

### API Implementation:
- [ ] All CRUD operations working with comprehensive validation
- [ ] Template assignment automation functional
- [ ] Template cloning with inheritance working
- [ ] Error handling comprehensive and informative
- [ ] API performance under load tested

### Security & Data Integrity:
- [ ] No data leakage between suppliers
- [ ] All inputs validated and sanitized
- [ ] Authentication required for all endpoints
- [ ] Template assignments validate client ownership
- [ ] Audit logging captures all template changes

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- APIs: `/wedsync/src/app/api/dashboard/templates/`
- Validation: `/wedsync/src/lib/validations/dashboard-templates.ts`
- Services: `/wedsync/src/lib/services/template-manager.ts`
- Migrations: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/tests/api/dashboard/templates/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch32/WS-211-team-b-round-1-complete.md`

**Evidence Package Required:**
- API endpoint testing results
- Database schema validation report
- Performance benchmarks for template queries
- Security validation test results
- Migration request sent to SQL Expert

---

## 🏁 ROUND COMPLETION CHECKLIST

- [ ] Database schema designed and migration files created
- [ ] All template CRUD APIs implemented and tested
- [ ] Template assignment automation working
- [ ] Validation schemas comprehensive and secure
- [ ] Performance optimized for expected load
- [ ] Security measures implemented and verified
- [ ] Migration request sent to SQL Expert
- [ ] API documentation complete
- [ ] Evidence package created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY