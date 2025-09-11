# TEAM C - ROUND 1: WS-153 - Photo Groups Management - Database Schema & Integration

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Create database schema, migrations, and integration logic for photo group management system  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Create photo groups from my guest list for efficient photography organization
**So that:** My photographer can efficiently capture all desired group combinations without confusion

**Real Wedding Problem This Solves:**
A couple currently creates handwritten lists like "Family photos: Mom's side, Dad's side, siblings only" leading to missed shots. With this feature, they create groups like "Smith Family (8 people): John Sr., Mary, John Jr., Sarah..." with automatic conflict detection if someone is in overlapping photos scheduled simultaneously.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Database schema for photo groups and group memberships
- Migration files for new table structures
- Integration with existing guest management system (WS-151)
- Row Level Security (RLS) policies for data protection
- Database functions for conflict detection
- Indexes for performance optimization

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Migration: Supabase CLI

**Integration Points:**
- **Existing Guest System**: Connects to WS-151 guests table
- **Database**: New photo_groups and photo_group_members tables
- **Team Dependencies**: API endpoints from Team B, UI components from Team A

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");  // Get correct library ID first
await mcp__context7__get-library-docs("/supabase/supabase", "database migrations rls-policies", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "postgresql functions triggers", 3000);
await mcp__context7__get-library-docs("/postgresql/postgresql", "indexes constraints", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("migration", "supabase/migrations", true);
await mcp__serena__get_symbols_overview("supabase/migrations");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Supabase changes frequently!)
- Serena shows existing migration patterns to follow
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Photo group database implementation"
2. **database-mcp-specialist** --think-hard --use-loaded-docs "Schema design and migrations" 
3. **postgresql-database-expert** --think-ultra-hard --follow-existing-patterns "Database optimization" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **integration-specialist** --integration-focus --system-connections
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing migration files in `/supabase/migrations/` first
- Understand current database schema and patterns
- Check existing guest management tables (WS-151)
- Review RLS policies and security patterns
- Continue until you FULLY understand the database structure

### **PLAN PHASE (THINK HARD!)**
- Design photo group schema with relationships
- Plan migration strategy and dependencies
- Design RLS policies for security
- Consider performance indexes
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write migration files following existing patterns
- Create RLS policies
- Write database functions
- Test with sample data
- Focus on correctness and security

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Test migrations in development
- Verify RLS policies work
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Database Implementation):
- [ ] **Migration file**: Create photo_groups table with constraints
- [ ] **Migration file**: Create photo_group_members junction table
- [ ] **RLS Policies**: Row Level Security for data protection
- [ ] **Database Functions**: Conflict detection and validation
- [ ] **Indexes**: Performance optimization for queries
- [ ] **Sample Data**: Test data for development
- [ ] **Migration Tests**: Verify schema correctness

### Database Schema Design:
```sql
-- Main photo groups table
CREATE TABLE IF NOT EXISTS photo_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  shot_type VARCHAR(50) CHECK (shot_type IN ('formal', 'candid', 'posed', 'lifestyle')),
  estimated_duration INTEGER DEFAULT 5, -- minutes
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  location_preference VARCHAR(255),
  photographer_notes TEXT,
  scheduled_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for group members
CREATE TABLE IF NOT EXISTS photo_group_members (
  photo_group_id UUID REFERENCES photo_groups(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (photo_group_id, guest_id)
);
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: API requirements for database operations
- FROM Team A: UI requirements for data structure

### What other teams NEED from you:
- TO Team B: Database schema and table specifications
- TO Team A: Data structure and relationship information
- TO Team D: Database integration patterns
- TO Team E: Test database setup and sample data

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**MANDATORY ROW LEVEL SECURITY (RLS) POLICIES:**

```sql
-- Enable RLS on photo groups
ALTER TABLE photo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own photo groups
CREATE POLICY "Users can manage their photo groups" ON photo_groups
  FOR ALL 
  TO authenticated 
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can only manage their own group members
CREATE POLICY "Users can manage their group members" ON photo_group_members
  FOR ALL 
  TO authenticated 
  USING (
    photo_group_id IN (
      SELECT id FROM photo_groups 
      WHERE couple_id IN (
        SELECT id FROM couples 
        WHERE user_id = auth.uid()
      )
    )
  );
```

**SECURITY CHECKLIST:**
- [ ] **RLS Enabled**: All tables have Row Level Security enabled
- [ ] **Authentication Required**: No public access to photo groups
- [ ] **Ownership Validation**: Users can only access their own data
- [ ] **Foreign Key Constraints**: Proper relationships maintained
- [ ] **Data Validation**: Check constraints for valid values
- [ ] **Audit Trail**: Created/updated timestamps on all records

⚠️ **DATABASE MIGRATIONS:**
- CREATE migration files but DO NOT APPLY them
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153.md`
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 DATABASE INTEGRATION TESTING:**

```javascript
// REVOLUTIONARY DATABASE TESTING APPROACH!

// 1. MIGRATION VALIDATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/admin/db-status"});
const migrationStatus = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test migration was applied correctly
    const { data } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['photo_groups', 'photo_group_members']);
    return data;
  }`
});

// 2. RLS POLICY TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test RLS prevents unauthorized access
    const { data, error } = await supabase
      .from('photo_groups')
      .select('*')
      .eq('couple_id', 'unauthorized-id');
    
    return { hasData: data?.length > 0, error: error?.message };
  }`
});

// 3. FOREIGN KEY CONSTRAINT TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test foreign key constraints work
    const { error } = await supabase
      .from('photo_group_members')
      .insert({
        photo_group_id: 'invalid-uuid',
        guest_id: 'invalid-uuid'
      });
    
    return error?.message; // Should be foreign key violation
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Migration files apply without errors
- [ ] All tables created with correct structure
- [ ] RLS policies prevent unauthorized access
- [ ] Foreign key constraints work properly
- [ ] Indexes improve query performance

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All migration files created and validated
- [ ] Database schema matches specification exactly
- [ ] RLS policies tested and working
- [ ] All constraints and indexes in place
- [ ] Sample data loaded for testing

### Integration & Performance:
- [ ] Integration with existing guest system (WS-151) working
- [ ] Database queries optimized with proper indexes
- [ ] Security policies fully implemented
- [ ] Foreign key relationships maintained
- [ ] Performance targets met (<50ms for basic queries)

### Evidence Package Required:
- [ ] Database schema documentation
- [ ] Migration test results
- [ ] RLS policy test results
- [ ] Performance benchmark results
- [ ] Integration test results with guest system

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Migrations: `/wedsync/supabase/migrations/20250825000001_photo_groups_system.sql`
- Functions: `/wedsync/supabase/functions/photo_group_functions.sql`
- RLS Policies: Part of migration file above
- Sample Data: `/wedsync/supabase/seed/photo_groups_sample_data.sql`
- Tests: `/wedsync/src/__tests__/integration/photo-groups-db.test.ts`
- Documentation: `/wedsync/docs/database/photo-groups-schema.md`

### CRITICAL - Migration Request:
- **Send to SQL Expert:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153.md`
```markdown
# Migration Request: WS-153 Photo Groups System

**Migration Files Created:**
- 20250825000001_photo_groups_system.sql

**Dependencies:** 
- Requires existing guests table from WS-151
- Requires existing couples table

**Testing Status:**
- Schema validated in development
- RLS policies tested
- Performance indexes verified

**Special Notes:**
- Contains foreign key references to guests table
- Includes complex RLS policies
- Has check constraints for data validation
```

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch14/WS-153-team-c-round-1-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_1_COMPLETE | team-c | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT apply migrations yourself - send to SQL Expert
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip RLS policies - security is non-negotiable
- Do NOT ignore foreign key constraints
- REMEMBER: All 5 teams work in PARALLEL - coordinate schema changes
- WAIT: Do not start Round 2 until ALL teams complete Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All migration files complete
- [ ] RLS policies implemented
- [ ] SQL Expert migration request sent
- [ ] Integration points documented
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY