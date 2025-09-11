# TEAM E - ROUND 1: WS-154 - Seating Arrangements - Database Schema & Data Management

**Date:** 2025-08-25  
**Feature ID:** WS-154 (Track all work with this ID)
**Priority:** P1 - Guest Management Core Feature  
**Mission:** Build database foundation for seating arrangements with optimization for relationship queries  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple with complex guest relationships and seating requirements
**I want to:** Have my guest relationships and table preferences stored securely with fast access
**So that:** The seating system can quickly process arrangements and detect conflicts for 200+ guests

**Real Wedding Problem This Solves:**
Large weddings with complex family dynamics require efficient relationship storage. Without proper database design, seating optimization becomes slow and unreliable. This foundation ensures 200+ guest weddings can be processed in seconds, not minutes.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Database schema for reception tables, guest relationships, and seating arrangements
- Optimized queries for relationship conflict detection
- Data migration and schema evolution strategy
- Performance optimization for large guest lists

**Technology Stack (VERIFIED):**
- Database: PostgreSQL 15 via Supabase and MCP Server (✅ CONNECTED)
- ORM: Native SQL with type-safe query builders
- Migration: Supabase migration system
- Testing: Database testing with seed data
- Performance: Indexing and query optimization

**Integration Points:**
- Guest Management: Extend existing guest tables with relationship data
- Optimization Engine: Provide fast relationship queries to Team B
- Real-time Validation: Support Team C's conflict detection with efficient queries

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. CONTEXT7 MCP - Load database optimization docs:
await mcp__context7__resolve_library_id("postgresql");
await mcp__context7__get_library_docs("/postgresql/postgresql", "indexing query-optimization", 5000);
await mcp__context7__get_library_docs("/supabase/supabase", "database functions rls", 5000);
await mcp__context7__get_library_docs("/supabase/supabase", "migration-management", 3000);
await mcp__context7__get_library_docs("/typescript/typescript", "database-types", 2000);

// 2. SERENA MCP - Initialize codebase:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing database patterns:
await mcp__serena__find_symbol("createClient", "", true);
await mcp__serena__get_symbols_overview("supabase/migrations");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --database-focus --performance-optimization
2. **database-mcp-specialist** --schema-design --query-optimization
3. **postgresql-database-expert** --indexing-strategy --relationship-modeling
4. **performance-optimization-expert** --query-performance --large-dataset-handling
5. **security-compliance-officer** --data-privacy --row-level-security
6. **test-automation-architect** --database-testing --data-validation

---

## 📋 STEP 3: ROUND 1 DELIVERABLES (Core Implementation)

### **DATABASE SCHEMA CREATION:**
- [ ] **reception_tables** - Table definitions with capacity and layout
- [ ] **guest_relationships** - Guest-to-guest relationship mapping
- [ ] **seating_arrangements** - Saved arrangement configurations
- [ ] **seating_assignments** - Individual guest-to-table assignments
- [ ] **relationship_types** - Configurable relationship categories

### **PERFORMANCE OPTIMIZATION:**
- [ ] **Relationship Query Indexes** - Optimized for conflict detection
- [ ] **Composite Indexes** - Multi-column indexes for complex queries
- [ ] **Partial Indexes** - Conditional indexes for active arrangements
- [ ] **Query Performance Analysis** - Benchmark critical seating queries
- [ ] **Connection Pooling** - Optimize database connections for seating operations

### **DATA INTEGRITY & CONSTRAINTS:**
- [ ] **Foreign Key Constraints** - Maintain referential integrity
- [ ] **Check Constraints** - Validate data at database level
- [ ] **Unique Constraints** - Prevent duplicate relationships
- [ ] **Trigger Functions** - Automated data validation and updates
- [ ] **Row Level Security** - Ensure couples only access their data

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Query requirements for optimization algorithms
- FROM Team C: Conflict detection query patterns and performance needs
- FROM Team A: Frontend data requirements and display preferences

### What other teams NEED from you:
- TO Team B: Efficient relationship query functions for optimization
- TO Team C: Real-time data access patterns for conflict detection
- TO Team A: TypeScript types and data access helpers
- TO Team D: Mobile-optimized query responses with reduced payload

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

```sql
-- REQUIRED: Row Level Security for all seating tables
ALTER TABLE reception_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_arrangements ENABLE ROW LEVEL SECURITY;

-- Policy: Couples can only access their own seating data
CREATE POLICY couple_seating_access ON reception_tables
FOR ALL USING (couple_id = auth.uid()::uuid);

CREATE POLICY couple_relationships_access ON guest_relationships
FOR ALL USING (
  guest1_id IN (
    SELECT id FROM guests WHERE couple_id = auth.uid()::uuid
  )
);

-- Audit logging for sensitive relationship data access
CREATE TABLE relationship_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL,
  relationship_id UUID NOT NULL,
  access_type VARCHAR(50) NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);
```

**Security Checklist:**
- [ ] Row Level Security policies for all seating tables
- [ ] Audit logging for relationship data access
- [ ] Encryption at rest for sensitive relationship notes
- [ ] Secure backup procedures for relationship data
- [ ] GDPR compliance for relationship data storage and deletion

---

## 📊 DATABASE MIGRATION STRATEGY

**CRITICAL: Create comprehensive migration file**

```sql
-- File: /wedsync/supabase/migrations/[timestamp]_seating_system_foundation.sql

-- Reception Tables
CREATE TABLE IF NOT EXISTS reception_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 8 CHECK (capacity > 0 AND capacity <= 20),
  table_shape VARCHAR(20) CHECK (table_shape IN ('round', 'rectangular', 'square', 'long')),
  location_notes TEXT,
  special_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(couple_id, table_number)
);

-- Guest Relationships (bidirectional)
CREATE TABLE IF NOT EXISTS guest_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest1_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  guest2_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) CHECK (
    relationship_type IN ('prefer_together', 'avoid', 'incompatible', 'family', 'couple', 'close_friends', 'acquaintances')
  ),
  relationship_strength INTEGER DEFAULT 1 CHECK (relationship_strength BETWEEN 1 AND 5),
  notes TEXT,
  created_by UUID REFERENCES couples(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (guest1_id != guest2_id),
  UNIQUE(guest1_id, guest2_id)
);

-- Performance Indexes
CREATE INDEX idx_reception_tables_couple ON reception_tables(couple_id);
CREATE INDEX idx_reception_tables_active ON reception_tables(couple_id, is_active) WHERE is_active = true;
CREATE INDEX idx_guest_relationships_guest1 ON guest_relationships(guest1_id);
CREATE INDEX idx_guest_relationships_guest2 ON guest_relationships(guest2_id);
CREATE INDEX idx_guest_relationships_type ON guest_relationships(relationship_type);
CREATE INDEX idx_guest_relationships_couple ON guest_relationships(created_by);

-- Composite index for conflict detection queries
CREATE INDEX idx_relationships_conflict_detection 
ON guest_relationships(guest1_id, guest2_id, relationship_type) 
WHERE relationship_type IN ('avoid', 'incompatible');
```

**SEND TO SQL EXPERT:**
Create `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-154-foundation.md`

---

## 🧪 DATABASE TESTING REQUIREMENTS

```typescript
// DATABASE TESTING - Test with realistic data volumes
describe('Seating Database Performance', () => {
  test('relationship queries perform under load', async () => {
    // Create test data: 200 guests, 400 relationships
    const testData = await generateLargeWeddingData(200, 400);
    await seedDatabase(testData);
    
    // Test critical query performance
    const startTime = Date.now();
    const conflicts = await findConflictingRelationships(testData.guests);
    const queryTime = Date.now() - startTime;
    
    expect(queryTime).toBeLessThan(500); // 500ms max
    expect(conflicts).toBeDefined();
  });

  test('concurrent seating operations maintain data integrity', async () => {
    const couple1 = await createTestCouple();
    const couple2 = await createTestCouple();
    
    // Concurrent operations shouldn't interfere
    await Promise.all([
      createSeatingArrangement(couple1.id),
      createSeatingArrangement(couple2.id)
    ]);
    
    const arrangements = await getSeatingArrangements([couple1.id, couple2.id]);
    expect(arrangements).toHaveLength(2);
    
    // Verify no data leakage between couples
    await verifyDataIsolation(couple1.id, couple2.id);
  });
});
```

---

## ✅ SUCCESS CRITERIA (Round 1)

**You CANNOT claim completion unless:**
- [ ] All database tables created with proper constraints and indexes
- [ ] Row Level Security policies implemented and tested
- [ ] Query performance benchmarked for 200+ guest scenarios
- [ ] Migration file created (ready for SQL Expert application)
- [ ] TypeScript types generated for all seating tables
- [ ] Database tests written FIRST and passing (>90% coverage)
- [ ] Performance tests showing <500ms for conflict queries
- [ ] Data integrity constraints preventing invalid relationships
- [ ] Audit logging implemented for relationship data access
- [ ] GDPR compliance validated for relationship data handling

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Migration: `/wedsync/supabase/migrations/[timestamp]_seating_system_foundation.sql`
- Types: `/wedsync/src/types/database/seating.ts`
- Queries: `/wedsync/src/lib/database/seating-queries.ts`
- Tests: `/wedsync/tests/database/seating/`
- Performance: `/wedsync/benchmarks/seating-queries.ts`

### CRITICAL - Team Output:
**Save to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch15/WS-154-team-e-round-1-complete.md`

### SQL Expert Handover:
**Create:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-154-foundation.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT apply migrations yourself (SQL Expert handles this)
- Do NOT create frontend components (Team A's responsibility)
- Do NOT implement business logic (Team B's responsibility)
- Do NOT skip performance testing for large datasets
- REMEMBER: Database foundation must support all other teams' requirements
- PRIVACY: Relationship data is extremely sensitive - implement strict security

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY