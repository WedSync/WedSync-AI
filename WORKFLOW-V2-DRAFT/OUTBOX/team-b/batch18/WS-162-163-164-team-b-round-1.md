# TEAM B - ROUND 1: WS-162/163/164 - Helper Schedules, Budget Categories & Manual Tracking - Backend API & Database Implementation

**Date:** 2025-08-25  
**Feature IDs:** WS-162, WS-163, WS-164 (Combined batch development)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive backend infrastructure for helper scheduling, budget management, and manual expense tracking
**Context:** You are Team B working in parallel with 4 other teams. Combined backend systems for efficient development.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**WS-162 - Helper Schedules Backend:**
**As a:** Wedding helper receiving task assignments
**I want to:** View my personalized wedding day schedule with all assigned tasks and timing
**So that:** I know exactly when and where to be for my responsibilities

**WS-163 - Budget Categories Backend:**
**As a:** Wedding couple managing their wedding budget
**I want to:** Create customizable budget categories with visual spending tracking and overspend warnings
**So that:** I can allocate my wedding budget effectively, track expenses by category, and avoid going over budget

**WS-164 - Manual Budget Tracking Backend:**
**As a:** Wedding couple tracking expenses across multiple categories
**I want to:** Manually log wedding expenses with receipts and payment status
**So that:** I can see exactly where my money is going and stay within budget for each category

**Real Wedding Problems These Solve:**
1. **Helper Schedules**: Wedding helpers receive fragmented information via texts/emails. This creates a single source of truth for personalized timelines.
2. **Budget Categories**: Couples need systematic tracking like "Photography: $3,200 of $4,000 (80% used)" with overspend alerts.
3. **Manual Tracking**: Couples keep receipts in shoeboxes and track in spreadsheets. This allows photographing receipts and automatic budget updates.

---

## 🎯 TECHNICAL REQUIREMENTS - BACKEND FOCUS

**Backend Architecture Requirements:**

**WS-162 - Helper Schedules:**
- Database schema for helper assignments and schedules
- API endpoints for CRUD operations on helper tasks
- Real-time notification system for schedule updates
- Integration with user management and wedding data

**WS-163 - Budget Categories:**
- Database schema for budget categories and allocations
- API endpoints for budget management and tracking
- Calculation engine for spending percentages and alerts
- Integration with expense tracking and financial data

**WS-164 - Manual Budget Tracking:**
- Database schema for expenses, receipts, and payments
- File upload API for receipt images and documents
- Payment status tracking and reconciliation
- Integration with budget categories for automatic updates

**Technology Stack (Backend Focus):**
- Database: PostgreSQL 15 via MCP Server (✅ CONNECTED)
- Backend: Supabase Edge Functions, Node.js APIs
- Storage: Supabase Storage for receipt uploads
- Authentication: Supabase Auth with RLS policies
- Real-time: Supabase Realtime for live updates
- File Processing: Sharp for image optimization

---

## 🧠 SEQUENTIAL THINKING MCP FOR BACKEND ARCHITECTURE

### When to Use Sequential Thinking for Backend Development

Before building backend systems, use Sequential Thinking MCP when facing:

- **Database Schema Design**: Complex relationships between helpers, budgets, and expenses
- **API Architecture Planning**: RESTful endpoints serving multiple frontend teams
- **Integration Challenges**: Connecting helper schedules with budget tracking systems
- **Performance Optimization**: Handling concurrent users and large datasets
- **Security Implementation**: Protecting financial data and personal information

#### Pattern 1: Database Schema Analysis
```typescript
// Complex database relationship planning
mcp__sequential-thinking__sequential_thinking({
  thought: "The combined system needs tables for helpers (users), helper_assignments (schedules), budget_categories, expenses, and receipts. Relationships: weddings -> helpers -> assignments, weddings -> budget_categories -> expenses -> receipts.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Schema relationships: helper_assignments references helpers and tasks, expenses reference budget_categories, receipts reference expenses. Need foreign keys, indexes for performance, and RLS policies for security.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: API Design Strategy
```typescript
// RESTful API planning for multiple features
mcp__sequential-thinking__sequential_thinking({
  thought: "API endpoints needed: /api/helpers/schedules for Team A frontend, /api/budget/categories and /api/expenses for budget management, /api/receipts/upload for file handling. Each needs CRUD operations with proper validation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API architecture: Use Next.js API routes for consistency, implement middleware for authentication and validation, create reusable database utilities, ensure proper error handling and logging.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

---

## 📚 STEP 1: LOAD BACKEND DOCUMENTATION (MANDATORY!)

```typescript
// 1. Load backend-specific documentation:
await mcp__Ref__ref_search_documentation({query: "Next.js API routes middleware authentication latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase Edge Functions database RLS latest documentation"});
await mcp__Ref__ref_search_documentation({query: "PostgreSQL schema design relationships indexes latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase Storage file upload API latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Node.js file processing Sharp image optimization latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase Realtime subscriptions API latest"});

// 2. SERENA MCP - Review existing backend patterns:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__find_symbol("api", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api");
await mcp__serena__find_symbol("supabase", "", true);
```

---

## 🚀 STEP 2: LAUNCH BACKEND SPECIALISTS

1. **postgresql-database-expert** --schema-design --complex-relationships --performance-optimization
2. **supabase-specialist** --edge-functions --rls-policies --realtime-subscriptions
3. **api-architect** --rest-design --validation-middleware --error-handling
4. **security-compliance-officer** --financial-data --file-uploads --authentication
5. **performance-optimization-expert** --database-queries --api-caching --concurrent-users
6. **integration-specialist** --file-processing --payment-apis --notification-systems

**AGENT INSTRUCTIONS:** "Focus on backend infrastructure. Create scalable, secure APIs that serve Team A's frontend components efficiently."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Backend Infrastructure (Combined Features):

**WS-162 - Helper Schedules Backend:**
- [ ] Database schema: helpers, helper_assignments, helper_tasks tables
- [ ] API endpoints: GET/POST/PUT/DELETE `/api/helpers/schedules`
- [ ] Authentication middleware for helper access control
- [ ] Real-time subscriptions for schedule updates
- [ ] Integration with existing user management system

**WS-163 - Budget Categories Backend:**
- [ ] Database schema: budget_categories, budget_allocations tables  
- [ ] API endpoints: GET/POST/PUT/DELETE `/api/budget/categories`
- [ ] Budget calculation engine with spending percentages
- [ ] Alert system for budget overspending
- [ ] Integration with wedding financial data

**WS-164 - Manual Budget Tracking Backend:**
- [ ] Database schema: expenses, receipts, payment_status tables
- [ ] API endpoints: GET/POST/PUT/DELETE `/api/expenses`
- [ ] File upload API: POST `/api/receipts/upload`
- [ ] Receipt processing with image optimization
- [ ] Payment reconciliation and status tracking

**Cross-Feature Backend Integration:**
- [ ] Unified authentication and authorization
- [ ] Shared database utilities and connection pooling
- [ ] Common error handling and logging patterns
- [ ] Performance monitoring and metrics collection
- [ ] Comprehensive API documentation

---

## 💾 DATABASE SCHEMA DESIGN

### Core Tables for Combined Features:

```sql
-- WS-162: Helper Schedules Tables
CREATE TABLE helper_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    helper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_title TEXT NOT NULL,
    task_description TEXT,
    scheduled_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WS-163: Budget Categories Tables  
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    allocated_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    spent_amount DECIMAL(10,2) DEFAULT 0,
    category_color TEXT DEFAULT '#3B82F6',
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wedding_id, category_name)
);

-- WS-164: Manual Budget Tracking Tables
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    vendor_name TEXT,
    expense_description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
    payment_method TEXT,
    receipt_urls TEXT[], -- Array of receipt image URLs
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_helper_assignments_wedding_helper ON helper_assignments(wedding_id, helper_id);
CREATE INDEX idx_helper_assignments_scheduled_time ON helper_assignments(scheduled_time);
CREATE INDEX idx_budget_categories_wedding ON budget_categories(wedding_id);
CREATE INDEX idx_expenses_wedding_category ON expenses(wedding_id, budget_category_id);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);

-- Row Level Security Policies
ALTER TABLE helper_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;  
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Helper Assignments
CREATE POLICY "Users can view their own helper assignments" ON helper_assignments
    FOR SELECT USING (helper_id = auth.uid());

CREATE POLICY "Wedding couples can manage all helper assignments" ON helper_assignments  
    FOR ALL USING (
        wedding_id IN (
            SELECT id FROM weddings WHERE couple_id = auth.uid()
        )
    );

-- RLS Policies for Budget Categories
CREATE POLICY "Wedding couples can manage their budget categories" ON budget_categories
    FOR ALL USING (
        wedding_id IN (
            SELECT id FROM weddings WHERE couple_id = auth.uid()
        )
    );

-- RLS Policies for Expenses  
CREATE POLICY "Wedding couples can manage their expenses" ON expenses
    FOR ALL USING (
        wedding_id IN (
            SELECT id FROM weddings WHERE couple_id = auth.uid()
        )
    );
```

---

## 🔗 API ENDPOINT SPECIFICATIONS

### RESTful API Design for Combined Features:

```typescript
// WS-162: Helper Schedules API
// GET /api/helpers/schedules/[weddingId] - Get all helper assignments for wedding
// POST /api/helpers/schedules - Create new helper assignment
// PUT /api/helpers/schedules/[assignmentId] - Update helper assignment  
// DELETE /api/helpers/schedules/[assignmentId] - Delete helper assignment

// WS-163: Budget Categories API
// GET /api/budget/categories/[weddingId] - Get all budget categories for wedding
// POST /api/budget/categories - Create new budget category
// PUT /api/budget/categories/[categoryId] - Update budget category
// DELETE /api/budget/categories/[categoryId] - Delete budget category
// GET /api/budget/summary/[weddingId] - Get budget overview with spending percentages

// WS-164: Manual Budget Tracking API  
// GET /api/expenses/[weddingId] - Get all expenses for wedding
// POST /api/expenses - Create new expense
// PUT /api/expenses/[expenseId] - Update expense
// DELETE /api/expenses/[expenseId] - Delete expense
// POST /api/receipts/upload - Upload receipt images
// GET /api/receipts/[expenseId] - Get receipt URLs for expense

// Shared Utility APIs
// GET /api/weddings/[weddingId]/dashboard - Get combined dashboard data
// POST /api/notifications/send - Send real-time notifications
// GET /api/health/backend - Health check for all backend services
```

---

## 🔒 SECURITY REQUIREMENTS (BACKEND FOCUS)

### Mandatory Backend Security Implementation:

```typescript
// ✅ AUTHENTICATION MIDDLEWARE
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function authenticateRequest(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res: new Response() });
  
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('Authentication required');
  }

  return { user: session.user, supabase };
}

// ✅ INPUT VALIDATION MIDDLEWARE
import { z } from 'zod';

const helperAssignmentSchema = z.object({
  wedding_id: z.string().uuid(),
  helper_id: z.string().uuid(),
  task_title: z.string().min(1).max(200),
  scheduled_time: z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(1440)
});

export async function validateHelperAssignment(data: unknown) {
  return helperAssignmentSchema.parse(data);
}

// ✅ FILE UPLOAD SECURITY
import { NextRequest } from 'next/server';

export async function validateReceiptUpload(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('receipt') as File;
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and PDF allowed.');
  }
  
  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size too large. Maximum 5MB allowed.');
  }
  
  return file;
}

// ✅ DATABASE SECURITY
export async function enforceWeddingAccess(weddingId: string, userId: string, supabase: any) {
  const { data: wedding, error } = await supabase
    .from('weddings')
    .select('couple_id')
    .eq('id', weddingId)
    .single();
    
  if (error || !wedding || wedding.couple_id !== userId) {
    throw new Error('Unauthorized access to wedding data');
  }
  
  return wedding;
}
```

### Backend Security Checklist:
- [ ] **Authentication**: All API endpoints require valid Supabase session
- [ ] **Authorization**: RLS policies enforce wedding-specific access control
- [ ] **Input Validation**: Zod schemas validate all incoming data
- [ ] **File Upload Security**: Validate file types, sizes, and scan for malware
- [ ] **SQL Injection Prevention**: Use Supabase client with parameterized queries
- [ ] **Rate Limiting**: Implement per-user API rate limits
- [ ] **Audit Logging**: Log all financial data access and modifications
- [ ] **Data Encryption**: Encrypt sensitive data at rest and in transit

---

## ✅ SUCCESS CRITERIA FOR ROUND 1

### Backend Implementation Requirements:
- [ ] All database tables created with proper indexes and RLS policies
- [ ] API endpoints implemented with authentication and validation
- [ ] File upload system working with receipt processing
- [ ] Real-time subscriptions configured for live updates
- [ ] Error handling and logging implemented across all endpoints
- [ ] Unit tests for all API endpoints with >80% coverage
- [ ] Integration tests for database operations
- [ ] Performance benchmarks: <200ms API response times

### Team Integration Requirements:
- [ ] API documentation provided to Team A for frontend integration
- [ ] Database schemas shared with Team C for notification integration
- [ ] File upload URLs ready for Team A's receipt upload UI
- [ ] Real-time subscription channels configured for Team C
- [ ] Error response formats standardized across all endpoints

---

## 💾 WHERE TO SAVE YOUR BACKEND WORK

### Backend Code Files:

**Database & Migrations:**
- Schema: `/wedsync/supabase/migrations/[timestamp]_helper_budget_tracking_system.sql`
- Seed Data: `/wedsync/supabase/seed-data/budget-categories.sql`

**API Endpoints:**
- Helper Schedules: `/wedsync/src/app/api/helpers/schedules/route.ts`
- Budget Categories: `/wedsync/src/app/api/budget/categories/route.ts`
- Expenses: `/wedsync/src/app/api/expenses/route.ts`
- Receipt Upload: `/wedsync/src/app/api/receipts/upload/route.ts`

**Backend Utilities:**
- Database Utils: `/wedsync/src/lib/database/helpers.ts`
- Validation: `/wedsync/src/lib/validation/backend-schemas.ts`
- File Processing: `/wedsync/src/lib/storage/receipt-processing.ts`

**Testing:**
- API Tests: `/wedsync/tests/api/helpers-budget-tracking.test.ts`
- Database Tests: `/wedsync/tests/database/schema-validation.test.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch18/WS-162-163-164-team-b-round-1-complete.md`

---

## ⚠️ CRITICAL BACKEND WARNINGS
- Do NOT expose internal database IDs in API responses without proper validation
- Do NOT skip RLS policy implementation - financial data security is critical
- Do NOT allow file uploads without proper validation and scanning
- Do NOT implement APIs without rate limiting and authentication
- ENSURE: All financial calculations are precise with proper decimal handling
- VERIFY: Database migrations are reversible and tested
- VALIDATE: All API endpoints handle edge cases and errors gracefully

---

END OF ROUND 1 PROMPT - BUILD SOLID BACKEND FOUNDATION