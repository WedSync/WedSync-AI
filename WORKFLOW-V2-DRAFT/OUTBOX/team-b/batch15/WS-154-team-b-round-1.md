# TEAM B - ROUND 1: WS-154 - Seating Arrangements - Backend API & Optimization Engine

**Date:** 2025-08-25  
**Feature ID:** WS-154 (Track all work with this ID)
**Priority:** P1 - Guest Management Core Feature  
**Mission:** Build seating optimization algorithms and API endpoints for table assignment logic  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple planning reception seating
**I want to:** Automatically optimize table assignments based on guest relationships and preferences
**So that:** The system suggests ideal seating arrangements that maximize guest happiness

**Real Wedding Problem This Solves:**
Couples spend hours manually figuring out who should sit together, often missing optimal combinations. This optimization engine analyzes guest relationships and suggests arrangements that minimize conflicts while maximizing compatible groupings.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Seating optimization algorithm considering guest relationships
- API endpoints for table management and guest assignment
- Conflict detection logic for incompatible guests
- Performance optimization for large guest lists (200+ guests)

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes, Supabase Edge Functions
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Algorithms: Graph theory for relationship optimization
- Testing: Vitest for algorithm testing
- Performance: Caching layer for optimization results

**Integration Points:**
- Guest Management: Query existing guest and relationship data
- Frontend UI: Provide optimization results to Team A's interface
- Conflict Detection: Supply validation logic to Team C

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load latest docs for API development:
await mcp__context7__resolve_library_id("next.js");
await mcp__context7__get_library_docs("/vercel/next.js", "api-routes edge-functions", 5000);
await mcp__context7__get_library_docs("/supabase/supabase", "database functions rls", 5000);
await mcp__context7__get_library_docs("/supabase/supabase", "edge-functions typescript", 3000);
await mcp__context7__get_library_docs("/postgresql/postgresql", "query-optimization indexing", 2000);

// 2. SERENA MCP - Initialize codebase:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing API patterns:
await mcp__serena__find_symbol("apiHandler", "", true);
await mcp__serena__get_symbols_overview("src/app/api/guests");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --algorithm-optimization --api-performance
2. **nextjs-fullstack-developer** --api-architecture --edge-functions
3. **database-mcp-specialist** --query-optimization --relationship-modeling
4. **security-compliance-officer** --api-security --data-validation
5. **performance-optimization-expert** --algorithm-efficiency --caching-strategy
6. **test-automation-architect** --algorithm-testing --api-integration-tests

---

## 📋 STEP 3: ROUND 1 DELIVERABLES (Core Implementation)

### **API ENDPOINTS:**
- [ ] **POST /api/seating/optimize** - Generate optimal seating arrangement
- [ ] **GET /api/seating/arrangements/[id]** - Retrieve saved arrangements
- [ ] **PUT /api/seating/arrangements/[id]** - Update seating arrangement
- [ ] **DELETE /api/seating/arrangements/[id]** - Remove arrangement
- [ ] **POST /api/seating/validate** - Check for relationship conflicts

### **OPTIMIZATION ENGINE:**
- [ ] **Relationship Graph Builder** - Model guest relationships as weighted graph
- [ ] **Seating Algorithm Core** - Optimize table assignments using constraint satisfaction
- [ ] **Conflict Detection Logic** - Identify incompatible guest pairings
- [ ] **Performance Optimization** - Cache results and optimize for large guest lists
- [ ] **Preference Scoring** - Weight relationships by preference strength

### **DATABASE OPERATIONS:**
- [ ] **Table Management Queries** - CRUD operations for reception tables
- [ ] **Guest Relationship Queries** - Efficient relationship lookups
- [ ] **Arrangement Persistence** - Save/load seating configurations
- [ ] **Conflict Logging** - Track and resolve seating conflicts

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team E: Database schema for tables and relationships - Required for queries
- FROM Team C: Integration requirements for conflict validation
- FROM Team A: API contract specification for frontend integration

### What other teams NEED from you:
- TO Team A: Optimization API endpoints with response schemas
- TO Team C: Conflict detection algorithms for validation service
- TO Team D: Lightweight API responses optimized for mobile

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

```typescript
// REQUIRED: Secure API implementation
import { withSecureValidation } from '@/lib/validation/middleware';
import { seatingOptimizationSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  seatingOptimizationSchema.extend({
    guest_count: z.number().min(1).max(500), // Prevent abuse
    table_count: z.number().min(1).max(50),
    couple_id: z.string().uuid()
  }),
  async (request, validatedData) => {
    // Verify couple ownership of guest data
    const { couple_id } = validatedData;
    await verifyCoupleAccess(request, couple_id);
    
    // Process optimization with validated data
  }
);
```

**Security Checklist:**
- [ ] Validate all optimization requests against couple ownership
- [ ] Implement rate limiting for optimization endpoints (max 10/minute)
- [ ] Sanitize all guest data inputs for SQL injection prevention
- [ ] Encrypt sensitive relationship data in database

---

## 🔄 DATABASE MIGRATION REQUIREMENTS

**⚠️ CRITICAL: Create migration file but DO NOT APPLY**

```sql
-- File: /wedsync/supabase/migrations/[timestamp]_seating_optimization_system.sql
CREATE TABLE IF NOT EXISTS reception_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id),
  table_number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 8,
  table_shape VARCHAR(20) CHECK (table_shape IN ('round', 'rectangular', 'square')),
  location_notes TEXT,
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seating_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id),
  arrangement_name VARCHAR(255),
  arrangement_data JSONB,
  optimization_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reception_tables_couple ON reception_tables(couple_id);
CREATE INDEX idx_seating_arrangements_couple ON seating_arrangements(couple_id);
```

**SEND TO SQL EXPERT:**
Create `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-154.md` with migration details.

---

## 🧪 TESTING REQUIREMENTS

```typescript
// ALGORITHM TESTING - Write tests FIRST
describe('Seating Optimization Algorithm', () => {
  test('optimizes seating for family groups', async () => {
    const guests = generateTestGuests(20);
    const relationships = generateFamilyRelationships(guests);
    const result = await optimizeSeating(guests, relationships, 3);
    
    expect(result.conflicts).toBe(0);
    expect(result.optimization_score).toBeGreaterThan(0.8);
  });

  test('handles large guest lists efficiently', async () => {
    const guests = generateTestGuests(200);
    const startTime = Date.now();
    await optimizeSeating(guests, [], 25);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // 5 second max
  });
});
```

---

## ✅ SUCCESS CRITERIA (Round 1)

**You CANNOT claim completion unless:**
- [ ] All optimization API endpoints implemented and tested
- [ ] Seating algorithm handling 200+ guests in <5 seconds
- [ ] Conflict detection logic with 100% accuracy on test data
- [ ] Database migration file created (NOT applied)
- [ ] Unit tests written FIRST and passing (>85% coverage)
- [ ] API integration tests validating all endpoints
- [ ] Zero TypeScript errors in API routes
- [ ] Performance benchmarks documented
- [ ] Security validation on all endpoints

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/app/api/seating/`
- Algorithms: `/wedsync/src/lib/algorithms/seating-optimization.ts`
- Database: `/wedsync/src/lib/database/seating-queries.ts`
- Tests: `/wedsync/tests/seating/api/`
- Migration: `/wedsync/supabase/migrations/[timestamp]_seating_optimization_system.sql`

### CRITICAL - Team Output:
**Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch15/WS-154-team-b-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify frontend components (Team A's responsibility)
- Do NOT apply database migrations (SQL Expert handles this)
- Do NOT skip performance testing for large guest lists
- REMEMBER: Teams A, C, D, E depend on your API contracts

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY