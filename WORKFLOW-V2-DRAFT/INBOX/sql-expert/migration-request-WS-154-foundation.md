# SQL EXPERT HANDOVER: WS-154 Seating System Foundation Migration

**Date:** 2025-08-26  
**Feature ID:** WS-154  
**Team:** E - Database Schema & Data Management  
**Priority:** P1 - Critical Guest Management Feature  
**Mission:** Apply comprehensive seating arrangements database migration

---

## 🎯 MIGRATION OVERVIEW

This migration creates the complete database foundation for WedSync's seating arrangements system, designed to handle 200+ guest weddings with complex relationship constraints and real-time optimization.

### **Migration File Location:**
```
/wedsync/supabase/migrations/20250826174536_ws154_seating_system_foundation.sql
```

### **Tables Created:**
- `reception_tables` - Physical tables at venues with capacity and layout
- `guest_relationships` - Bidirectional guest relationships with seating preferences  
- `seating_arrangements` - Saved seating configurations
- `seating_assignments` - Individual guest-to-table-to-seat assignments
- `seating_optimization_rules` - Configurable optimization rules
- `relationship_access_log` - Audit trail for sensitive relationship data

### **Performance Features:**
- 13 optimized indexes for sub-500ms queries
- Materialized view for optimization algorithms
- Composite indexes for conflict detection
- Partial indexes for active arrangements

---

## ⚡ CRITICAL PERFORMANCE REQUIREMENTS

**MUST MEET THESE PERFORMANCE TARGETS:**
- All relationship queries: < 500ms for 200+ guests
- Conflict detection queries: < 300ms
- Seating validation: < 1000ms for full arrangement
- Bulk assignment operations: < 2000ms for 200 guests

**Verification Commands After Migration:**
```sql
-- Test relationship query performance
EXPLAIN ANALYZE SELECT * FROM guest_relationships gr
JOIN guests g1 ON gr.guest1_id = g1.id  
JOIN guests g2 ON gr.guest2_id = g2.id
WHERE gr.seating_preference IN ('must_separate', 'incompatible');

-- Verify indexes are being used
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('reception_tables', 'guest_relationships', 'seating_arrangements');
```

---

## 🔒 SECURITY REQUIREMENTS (MANDATORY)

### **Row Level Security Policies Created:**
1. **reception_tables** - Couples can only manage their own tables
2. **guest_relationships** - Couples can only manage relationships for their guests  
3. **seating_arrangements** - Couples can only access their own arrangements
4. **seating_assignments** - Restricted to assignments within couple's arrangements
5. **relationship_access_log** - Couples can view only their audit logs

### **Security Validation After Migration:**
```sql
-- Test RLS is working (should return 0 rows without proper auth context)
SELECT COUNT(*) FROM reception_tables;
SELECT COUNT(*) FROM guest_relationships; 
SELECT COUNT(*) FROM seating_arrangements;

-- Verify audit logging trigger is active
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgrelid = 'guest_relationships'::regclass;
```

---

## 🗄️ DATABASE FUNCTIONS & TRIGGERS

### **Stored Functions Created:**
1. `calculate_seating_score(p_arrangement_id UUID)` - Returns optimization score
2. `validate_seating_arrangement(p_arrangement_id UUID)` - Returns validation results
3. `get_relationship_conflicts(p_couple_id UUID)` - Returns conflict analysis
4. `refresh_seating_optimization_view()` - Refreshes materialized view

### **Trigger Functions:**
1. `ensure_single_active_arrangement()` - Only one active arrangement per couple
2. `create_bidirectional_relationship()` - Ensures guest1_id < guest2_id ordering
3. `update_updated_at_column()` - Auto-updates timestamps
4. `trigger_refresh_seating_view()` - Auto-refreshes optimization view

### **Materialized View:**
- `seating_optimization_view` - Aggregated guest and relationship data for fast algorithms

---

## 📊 DATA VALIDATION CHECKS

**CRITICAL: Run these validation queries after migration:**

```sql
-- 1. Verify all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'reception_tables', 'guest_relationships', 'seating_arrangements', 
  'seating_assignments', 'seating_optimization_rules', 'relationship_access_log'
);

-- 2. Verify all indexes were created  
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('reception_tables', 'guest_relationships', 'seating_arrangements')
ORDER BY tablename, indexname;

-- 3. Verify constraints are active
SELECT conname, contype FROM pg_constraint 
WHERE conrelid IN (
  'reception_tables'::regclass,
  'guest_relationships'::regclass, 
  'seating_assignments'::regclass
);

-- 4. Test unique constraints work
INSERT INTO reception_tables (couple_id, table_number, capacity, table_shape) 
VALUES ('00000000-0000-0000-0000-000000000001', 1, 8, 'round');
INSERT INTO reception_tables (couple_id, table_number, capacity, table_shape) 
VALUES ('00000000-0000-0000-0000-000000000001', 1, 8, 'square'); -- Should fail

-- 5. Verify functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'calculate_seating%' 
OR proname LIKE 'validate_seating%' OR proname LIKE 'get_relationship%';
```

---

## 🧪 MIGRATION TESTING PROTOCOL

### **Pre-Migration Backup:**
```bash
# Create backup before migration
pg_dump -h [host] -U [user] -d [database] --schema=public > ws154_pre_migration_backup.sql
```

### **Test Data for Validation:**
```sql
-- Insert test couple
INSERT INTO clients (id, first_name, last_name, email) 
VALUES ('test-couple-id', 'Test', 'Couple', 'test@example.com');

-- Insert test guests
INSERT INTO guests (couple_id, first_name, last_name, rsvp_status) VALUES
('test-couple-id', 'John', 'Doe', 'attending'),
('test-couple-id', 'Jane', 'Smith', 'attending'),
('test-couple-id', 'Bob', 'Johnson', 'attending');

-- Test table creation
INSERT INTO reception_tables (couple_id, table_number, capacity, table_shape) 
VALUES ('test-couple-id', 1, 8, 'round');

-- Test relationship creation  
INSERT INTO guest_relationships (guest1_id, guest2_id, relationship_type, seating_preference, created_by)
SELECT g1.id, g2.id, 'close_friends', 'prefer_together', 'test-couple-id'
FROM guests g1, guests g2 
WHERE g1.couple_id = 'test-couple-id' AND g2.couple_id = 'test-couple-id' 
AND g1.id < g2.id LIMIT 1;

-- Test arrangement creation
INSERT INTO seating_arrangements (couple_id, name, created_by) 
VALUES ('test-couple-id', 'Test Arrangement', 'test-couple-id');
```

### **Performance Testing:**
```sql
-- Generate performance test data (run after migration)
SELECT 'Performance test data created' 
FROM generate_series(1, 200) i 
WHERE EXISTS (
  INSERT INTO guests (couple_id, first_name, last_name, rsvp_status)
  VALUES ('test-couple-id', 'Guest' || i, 'Test' || i, 'attending')
  ON CONFLICT DO NOTHING
);

-- Test query performance (should be under 500ms)
\timing on
SELECT COUNT(*) FROM guest_relationships gr 
JOIN guests g1 ON gr.guest1_id = g1.id 
JOIN guests g2 ON gr.guest2_id = g2.id 
WHERE gr.created_by = 'test-couple-id';
\timing off
```

---

## 🔧 ROLLBACK PLAN

**If migration fails, use this rollback:**

```sql
-- Drop tables in reverse dependency order
DROP MATERIALIZED VIEW IF EXISTS seating_optimization_view CASCADE;
DROP TABLE IF EXISTS relationship_access_log CASCADE;
DROP TABLE IF EXISTS seating_assignments CASCADE;  
DROP TABLE IF EXISTS seating_optimization_rules CASCADE;
DROP TABLE IF EXISTS seating_arrangements CASCADE;
DROP TABLE IF EXISTS guest_relationships CASCADE;
DROP TABLE IF EXISTS reception_tables CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_seating_score(UUID);
DROP FUNCTION IF EXISTS validate_seating_arrangement(UUID);
DROP FUNCTION IF EXISTS get_relationship_conflicts(UUID);
DROP FUNCTION IF EXISTS refresh_seating_optimization_view();
DROP FUNCTION IF EXISTS ensure_single_active_arrangement();
DROP FUNCTION IF EXISTS create_bidirectional_relationship();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS trigger_refresh_seating_view();

-- Restore from backup
\i ws154_pre_migration_backup.sql
```

---

## ⚠️ CRITICAL WARNINGS & DEPENDENCIES

### **BLOCKING DEPENDENCIES:**
- ✅ `clients` table must exist (couple_id foreign keys)
- ✅ `guests` table must exist (guest_id foreign keys)  
- ✅ `auth.users` table must exist (audit logging)

### **MIGRATION WARNINGS:**
- 🔥 **HIGH MEMORY USAGE**: Creating 13+ indexes may consume significant memory
- 🔥 **LONG EXECUTION TIME**: Allow 5-10 minutes for large datasets
- 🔥 **LOCK CONFLICTS**: Schedule during low-traffic period
- 🔥 **FOREIGN KEY CHECKS**: Ensure referenced tables have proper data

### **Post-Migration Requirements:**
1. **MANDATORY**: Refresh materialized view after guest/relationship data changes
2. **MANDATORY**: Monitor query performance with `pg_stat_statements`
3. **MANDATORY**: Validate RLS policies are active
4. **MANDATORY**: Test audit logging is working
5. **MANDATORY**: Run performance benchmarks

---

## 📈 MONITORING & ALERTING

**Set up monitoring for these metrics:**

```sql
-- Query performance monitoring  
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%guest_relationships%' 
OR query LIKE '%reception_tables%'
ORDER BY mean_time DESC;

-- Index usage monitoring
SELECT schemaname, tablename, indexname, 
       idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename LIKE '%seating%' OR tablename LIKE '%guest_relationships%'
ORDER BY idx_scan DESC;

-- Table size monitoring
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('reception_tables', 'guest_relationships', 'seating_arrangements')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📝 COMPLETION CHECKLIST

**SQL Expert must verify ALL items before marking complete:**

### **Migration Execution:**
- [ ] Pre-migration backup created and verified
- [ ] Migration executed without errors
- [ ] All 6 tables created successfully
- [ ] All 13+ indexes created successfully  
- [ ] All 8 stored functions created successfully
- [ ] All 8+ triggers created successfully
- [ ] Materialized view created successfully

### **Security Validation:**
- [ ] All RLS policies active and tested
- [ ] Audit logging triggers functional
- [ ] Foreign key constraints working
- [ ] Unique constraints preventing duplicates
- [ ] Check constraints validating data

### **Performance Validation:**
- [ ] Relationship queries under 500ms for 200+ guests
- [ ] Conflict detection queries under 300ms
- [ ] Bulk operations under 2000ms
- [ ] Indexes being used by query planner
- [ ] No table scans on large datasets

### **Data Integrity:**
- [ ] Test data inserted successfully  
- [ ] Triggers preventing invalid data
- [ ] Cascade deletes working correctly
- [ ] Bidirectional relationships enforced
- [ ] Single active arrangement enforced

### **Integration Readiness:**
- [ ] TypeScript types match database schema
- [ ] Query functions ready for application use
- [ ] Performance benchmarks passing
- [ ] Monitoring queries working
- [ ] Documentation updated

---

## 🎯 SUCCESS CRITERIA

**Migration is successful ONLY when:**

1. ✅ All tables, indexes, functions, and triggers created without errors
2. ✅ Performance benchmarks meet targets (< 500ms for key queries)  
3. ✅ Security policies prevent unauthorized data access
4. ✅ Test data can be inserted and queried successfully
5. ✅ Application integration tests pass
6. ✅ No production data corruption or loss

**FAILURE CONDITIONS (requires rollback):**
- ❌ Any performance target missed by >50%
- ❌ Security breach or unauthorized data access
- ❌ Data corruption or referential integrity violations  
- ❌ Application unable to connect or query
- ❌ Migration takes >15 minutes to complete

---

## 📞 SUPPORT & ESCALATION

**Team E Contact:** Available for database schema questions
**SQL Expert Escalation:** Critical issues requiring immediate rollback
**Production Guardian:** Must approve before any production deployment

**Post-Migration Validation Scripts:**
- Database tests: `/wedsync/tests/src/__tests__/database/seating-database.test.ts`
- Performance benchmarks: `/wedsync/benchmarks/seating-queries.ts`  
- Application integration: Run full test suite

---

**END OF HANDOVER - EXECUTE WITH CAUTION**

This migration is critical for WedSync's seating management capabilities. The database foundation must be rock-solid before Team B (optimization), Team C (real-time), and Team A (frontend) can build upon it.

**Review Requirements:** SQL Expert must validate ALL checklist items and performance benchmarks before confirming migration success.