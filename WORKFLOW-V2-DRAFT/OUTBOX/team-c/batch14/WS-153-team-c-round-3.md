# TEAM C - ROUND 3: WS-153 - Photo Groups Management - Production Database & Monitoring

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Finalize database for production with monitoring, backup, and disaster recovery  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete for final feature delivery.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Bulletproof database reliability that never loses my photo group data
**So that:** My wedding day photo planning is preserved and accessible even if disasters occur

**Real Wedding Problem This Solves:**
On wedding day, the database must be indestructible - handling photographer app crashes, venue network failures, massive concurrent access, and even server failures without losing a single photo group or guest assignment.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification & Previous Rounds:**
- Production-ready database with comprehensive monitoring
- Automated backup and disaster recovery procedures  
- Database performance monitoring and alerting
- Complete integration testing with all team outputs
- Database documentation and maintenance procedures
- Scalability testing and optimization for high load

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Monitoring: Supabase Dashboard, Custom monitoring functions
- Backup: Supabase automated backups + custom procedures

**Integration Points:**
- **All Teams**: Complete database integration with A, B, D, E outputs
- **Production**: Monitoring, alerting, and backup systems
- **Disaster Recovery**: Automated recovery procedures
- **Documentation**: Complete database documentation

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");  
await mcp__context7__get-library-docs("/supabase/supabase", "production monitoring backup", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database-monitoring performance", 3000);
await mcp__context7__get-library-docs("/postgresql/postgresql", "production-optimization monitoring", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW all database implementations from rounds 1-2:
await mcp__serena__search_for_pattern("CREATE.*FUNCTION.*photo_groups", "", false, true);
await mcp__serena__list_dir("supabase/migrations", false);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Production database finalization"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Production monitoring and backup" 
3. **wedding-domain-expert** --think-ultra-hard --production-wedding-scenarios "Wedding day database reliability" 
4. **security-compliance-officer** --think-ultra-hard --production-database-security
5. **test-automation-architect** --comprehensive-database-testing --disaster-recovery-testing
6. **performance-optimization-expert** --production-database-optimization --scalability-testing
7. **devops-sre-engineer** --database-monitoring --production-deployment

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Production Database & Monitoring):
- [ ] **Production Monitoring Dashboard** - Real-time database health monitoring
- [ ] **Automated Backup Procedures** - Beyond Supabase defaults, custom backup strategy
- [ ] **Disaster Recovery Plan** - Complete disaster recovery procedures and testing
- [ ] **Performance Optimization** - Final performance tuning for production load
- [ ] **Database Documentation** - Complete database schema and procedures documentation
- [ ] **Health Check Functions** - Database health monitoring functions
- [ ] **Load Testing Results** - Verified performance under production load
- [ ] **Integration Validation** - Complete integration testing with all teams

### Production-Ready Features:
- [ ] Automated database health monitoring with alerts
- [ ] Point-in-time recovery capabilities
- [ ] Connection pooling optimization for high load
- [ ] Database maintenance automation
- [ ] Performance metrics collection and reporting
- [ ] Automated backup verification procedures
- [ ] Database scaling procedures for growth
- [ ] Complete database security audit

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (Rounds 1-2 Complete):
- FROM Team A: Final UI data requirements for optimization - **READY**
- FROM Team B: Complete API patterns for database optimization - **READY**
- FROM Team D: WedMe platform database requirements - **READY**
- FROM Team E: Load testing results and performance requirements - **READY**

### What other teams NEED from you:
- TO All Teams: Production-ready database with monitoring and documentation
- TO Production: Complete database infrastructure ready for deployment

---

## 🔒 SECURITY REQUIREMENTS (PRODUCTION DATABASE SECURITY)

### Production Database Security Audit:
- [ ] **Encryption**: Verify all sensitive data encrypted at rest and in transit
- [ ] **Access Controls**: Review and audit all database access permissions
- [ ] **Audit Logging**: Complete audit logging for all database changes
- [ ] **Backup Security**: Encrypted backups with secure access controls
- [ ] **Network Security**: Database network security and firewall rules
- [ ] **Compliance**: GDPR/CCPA compliance for photo group data

---

## 🗄️ PRODUCTION DATABASE FEATURES (ROUND 3)

```sql
-- FILE: /wedsync/supabase/migrations/[timestamp]_photo_groups_production_round3.sql

-- Production monitoring and health check functions
CREATE OR REPLACE FUNCTION photo_groups_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_status JSONB;
  total_groups INTEGER;
  scheduled_groups INTEGER;
  recent_activity INTEGER;
  avg_response_time NUMERIC;
  connection_count INTEGER;
  storage_usage NUMERIC;
BEGIN
  -- Basic metrics
  SELECT 
    count(*) as total,
    count(CASE WHEN scheduled_start IS NOT NULL THEN 1 END) as scheduled
  INTO total_groups, scheduled_groups
  FROM photo_groups;
  
  -- Recent activity (last 24 hours)
  SELECT count(*)
  INTO recent_activity
  FROM photo_groups
  WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';
  
  -- Database connection metrics
  SELECT count(*)
  INTO connection_count
  FROM pg_stat_activity
  WHERE state = 'active';
  
  -- Storage usage (approximate)
  SELECT pg_total_relation_size('photo_groups')::NUMERIC / 1024 / 1024 as mb
  INTO storage_usage;
  
  health_status := jsonb_build_object(
    'status', 'healthy',
    'timestamp', CURRENT_TIMESTAMP,
    'metrics', jsonb_build_object(
      'total_groups', total_groups,
      'scheduled_groups', scheduled_groups,
      'recent_activity_24h', recent_activity,
      'active_connections', connection_count,
      'storage_usage_mb', storage_usage
    ),
    'alerts', CASE
      WHEN connection_count > 80 THEN jsonb_build_array('High connection count detected')
      WHEN storage_usage > 1000 THEN jsonb_build_array('High storage usage detected')
      ELSE jsonb_build_array()
    END
  );
  
  -- Log health check
  INSERT INTO system_health_log (service, status, metrics, timestamp)
  VALUES ('photo_groups_db', 'healthy', health_status->'metrics', CURRENT_TIMESTAMP)
  ON CONFLICT (service) DO UPDATE SET
    status = EXCLUDED.status,
    metrics = EXCLUDED.metrics,
    timestamp = EXCLUDED.timestamp,
    last_check = CURRENT_TIMESTAMP;
  
  RETURN health_status;
END;
$$;

-- Performance monitoring function
CREATE OR REPLACE FUNCTION get_photo_groups_performance_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  perf_stats JSONB;
  avg_conflict_detection_time NUMERIC;
  avg_scheduling_optimization_time NUMERIC;
  index_usage_stats JSONB;
BEGIN
  -- Query performance metrics from pg_stat_statements if available
  SELECT jsonb_agg(
    jsonb_build_object(
      'query_type', 
      CASE 
        WHEN query ILIKE '%detect_advanced_conflicts%' THEN 'conflict_detection'
        WHEN query ILIKE '%optimize_photo_group_scheduling%' THEN 'scheduling_optimization'
        WHEN query ILIKE '%photo_groups%INSERT%' THEN 'insert_group'
        WHEN query ILIKE '%photo_groups%SELECT%' THEN 'select_group'
        ELSE 'other'
      END,
      'avg_time_ms', mean_exec_time,
      'total_calls', calls,
      'total_time_ms', total_exec_time
    )
  )
  INTO perf_stats
  FROM pg_stat_statements
  WHERE query ILIKE '%photo_group%'
  AND calls > 0;
  
  -- Index usage statistics
  SELECT jsonb_agg(
    jsonb_build_object(
      'index_name', indexrelname,
      'table_name', relname,
      'scans', idx_scan,
      'tuples_read', idx_tup_read,
      'tuples_fetched', idx_tup_fetch
    )
  )
  INTO index_usage_stats
  FROM pg_stat_user_indexes
  WHERE relname IN ('photo_groups', 'photo_group_members');
  
  RETURN jsonb_build_object(
    'query_performance', COALESCE(perf_stats, '[]'::jsonb),
    'index_usage', COALESCE(index_usage_stats, '[]'::jsonb),
    'last_updated', CURRENT_TIMESTAMP
  );
END;
$$;

-- Automated backup verification function
CREATE OR REPLACE FUNCTION verify_photo_groups_backup_integrity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_status JSONB;
  total_groups INTEGER;
  total_members INTEGER;
  data_consistency_check BOOLEAN := true;
  orphaned_members INTEGER;
BEGIN
  -- Basic data counts
  SELECT count(*) INTO total_groups FROM photo_groups;
  SELECT count(*) INTO total_members FROM photo_group_members;
  
  -- Data consistency checks
  SELECT count(*)
  INTO orphaned_members
  FROM photo_group_members pgm
  LEFT JOIN photo_groups pg ON pgm.photo_group_id = pg.id
  WHERE pg.id IS NULL;
  
  IF orphaned_members > 0 THEN
    data_consistency_check := false;
  END IF;
  
  backup_status := jsonb_build_object(
    'backup_verified', true,
    'verification_timestamp', CURRENT_TIMESTAMP,
    'data_counts', jsonb_build_object(
      'total_groups', total_groups,
      'total_members', total_members
    ),
    'consistency_check', data_consistency_check,
    'issues', CASE
      WHEN orphaned_members > 0 THEN 
        jsonb_build_array('Found ' || orphaned_members || ' orphaned photo group members')
      ELSE jsonb_build_array()
    END
  );
  
  -- Log backup verification
  INSERT INTO backup_verification_log (service, status, details, timestamp)
  VALUES ('photo_groups', data_consistency_check, backup_status, CURRENT_TIMESTAMP);
  
  RETURN backup_status;
END;
$$;

-- Database maintenance function
CREATE OR REPLACE FUNCTION maintain_photo_groups_database()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_result JSONB;
  deleted_orphans INTEGER := 0;
  updated_stats BOOLEAN := false;
BEGIN
  -- Clean up orphaned photo group members
  WITH deleted AS (
    DELETE FROM photo_group_members pgm
    WHERE NOT EXISTS (
      SELECT 1 FROM photo_groups pg WHERE pg.id = pgm.photo_group_id
    )
    RETURNING *
  )
  SELECT count(*) INTO deleted_orphans FROM deleted;
  
  -- Update table statistics
  ANALYZE photo_groups;
  ANALYZE photo_group_members;
  updated_stats := true;
  
  -- Reindex if needed (only if tables are small enough)
  IF (SELECT pg_total_relation_size('photo_groups')) < 100 * 1024 * 1024 THEN -- 100MB
    REINDEX TABLE CONCURRENTLY photo_groups;
    REINDEX TABLE CONCURRENTLY photo_group_members;
  END IF;
  
  maintenance_result := jsonb_build_object(
    'maintenance_completed', true,
    'timestamp', CURRENT_TIMESTAMP,
    'actions_taken', jsonb_build_object(
      'orphaned_members_deleted', deleted_orphans,
      'statistics_updated', updated_stats,
      'reindex_performed', (SELECT pg_total_relation_size('photo_groups')) < 100 * 1024 * 1024
    )
  );
  
  -- Log maintenance activity
  INSERT INTO maintenance_log (service, actions, timestamp)
  VALUES ('photo_groups_db', maintenance_result->'actions_taken', CURRENT_TIMESTAMP);
  
  RETURN maintenance_result;
END;
$$;

-- Create system tables for monitoring
CREATE TABLE IF NOT EXISTS system_health_log (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,
  metrics JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  last_check TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_verification_log (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  status BOOLEAN NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_log (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  actions JSONB,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Automated monitoring triggers
CREATE OR REPLACE FUNCTION trigger_health_monitoring()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trigger health check every 100 operations
  IF (SELECT count(*) FROM photo_groups) % 100 = 0 THEN
    PERFORM photo_groups_health_check();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'auto_health_monitoring_trigger') THEN
    CREATE TRIGGER auto_health_monitoring_trigger
      AFTER INSERT OR UPDATE OR DELETE ON photo_groups
      FOR EACH STATEMENT
      EXECUTE FUNCTION trigger_health_monitoring();
  END IF;
END;
$$;

-- Performance optimization views
CREATE OR REPLACE VIEW photo_groups_performance_summary AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  count(*) as groups_created,
  avg(estimated_duration) as avg_duration,
  count(CASE WHEN scheduled_start IS NOT NULL THEN 1 END) as scheduled_count,
  count(DISTINCT couple_id) as unique_couples
FROM photo_groups
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Send migration request to SQL Expert
-- Create file: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153-round3.md
```

---

## 🎭 PRODUCTION DATABASE TESTING (ROUND 3)

```javascript
// DISASTER RECOVERY TESTING
describe('Photo Groups Disaster Recovery', () => {
  test('Database health check functions correctly', async () => {
    const { data: health, error } = await supabase.rpc('photo_groups_health_check');
    
    expect(error).toBeNull();
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.metrics).toBeDefined();
    expect(health.metrics.total_groups).toBeGreaterThanOrEqual(0);
    expect(health.timestamp).toBeDefined();
  });
  
  test('Backup verification detects data integrity issues', async () => {
    // Create test data with potential integrity issues
    const { data: group } = await supabase
      .from('photo_groups')
      .insert({ couple_id: testCoupleId, name: 'Test Group' })
      .select()
      .single();
    
    // Add member to group
    await supabase
      .from('photo_group_members')
      .insert({ photo_group_id: group.id, guest_id: testGuestId });
    
    // Run backup verification (should pass)
    let { data: verification } = await supabase.rpc('verify_photo_groups_backup_integrity');
    expect(verification.consistency_check).toBe(true);
    expect(verification.issues.length).toBe(0);
    
    // Create orphaned member (simulate data corruption)
    await supabase
      .from('photo_group_members')
      .insert({ photo_group_id: '00000000-0000-0000-0000-000000000000', guest_id: testGuestId });
    
    // Run backup verification again (should detect issue)
    ({ data: verification } = await supabase.rpc('verify_photo_groups_backup_integrity'));
    expect(verification.consistency_check).toBe(false);
    expect(verification.issues.length).toBeGreaterThan(0);
  });
  
  test('Database maintenance cleans up data issues', async () => {
    // Create orphaned data
    await supabase
      .from('photo_group_members')
      .insert({ photo_group_id: '00000000-0000-0000-0000-000000000000', guest_id: testGuestId });
    
    // Run maintenance
    const { data: maintenance, error } = await supabase.rpc('maintain_photo_groups_database');
    
    expect(error).toBeNull();
    expect(maintenance.maintenance_completed).toBe(true);
    expect(maintenance.actions_taken.orphaned_members_deleted).toBeGreaterThan(0);
    
    // Verify cleanup worked
    const { data: orphans } = await supabase
      .from('photo_group_members')
      .select('*')
      .eq('photo_group_id', '00000000-0000-0000-0000-000000000000');
    
    expect(orphans.length).toBe(0);
  });
});

// PRODUCTION LOAD TESTING
describe('Photo Groups Production Load', () => {
  test('Database handles high concurrent load', async () => {
    const concurrentOperations = 100;
    const promises = [];
    
    // Concurrent group creation
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(
        supabase
          .from('photo_groups')
          .insert({
            couple_id: testCoupleId,
            name: `Load Test Group ${i}`,
            estimated_duration: 15 + (i % 30)
          })
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error);
    const failed = results.filter(r => r.status === 'rejected' || r.value.error);
    
    // Expect at least 95% success rate
    expect(successful.length / concurrentOperations).toBeGreaterThan(0.95);
    
    // Total operation time should be reasonable
    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    
    console.log(`Load test: ${successful.length}/${concurrentOperations} successful in ${endTime - startTime}ms`);
  });
  
  test('Complex queries perform well under load', async () => {
    // Create realistic test data
    await createRealisticPhotoGroupData(50, 200); // 50 groups, 200 guests
    
    const concurrentQueries = 20;
    const promises = [];
    
    // Concurrent complex queries
    for (let i = 0; i < concurrentQueries; i++) {
      promises.push(
        supabase.rpc('detect_advanced_conflicts', { p_couple_id: testCoupleId })
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // All queries should succeed
    results.forEach(result => {
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
    
    // Average query time should be acceptable
    const avgTime = (endTime - startTime) / concurrentQueries;
    expect(avgTime).toBeLessThan(500); // Less than 500ms average
    
    console.log(`Complex query load test: ${concurrentQueries} queries, avg ${avgTime}ms`);
  });
});
```

---

## ✅ SUCCESS CRITERIA (PRODUCTION DATABASE)

### Technical Implementation:
- [ ] All production monitoring functions operational
- [ ] Automated backup verification working
- [ ] Database maintenance automation complete
- [ ] Health check functions provide accurate metrics
- [ ] Performance optimization verified under load
- [ ] Complete integration with all team outputs

### Production Readiness:
- [ ] Database handles 100+ concurrent operations with 95%+ success rate
- [ ] Complex queries execute in < 500ms under load
- [ ] Health monitoring provides real-time alerts
- [ ] Backup integrity verification automated
- [ ] Disaster recovery procedures tested and documented
- [ ] Database maintenance automated and non-disruptive

### Evidence Package Required:
- [ ] Load testing results documentation
- [ ] Database performance monitoring dashboard
- [ ] Disaster recovery test results
- [ ] Database security audit report
- [ ] Complete database documentation

---

## 💾 WHERE TO SAVE YOUR WORK

### Database Files:
- Migration: `/wedsync/supabase/migrations/[timestamp]_photo_groups_production_round3.sql`
- Documentation: `/wedsync/docs/database/photo-groups-schema.md`
- Monitoring: Document all monitoring functions in migration
- Tests: `/wedsync/src/__tests__/database/photo-groups-production.test.ts`

### SQL Expert Handover:
- **Create:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153-round3.md`
- **Include:** Final migration, monitoring setup, production requirements

### CRITICAL - Final Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch14/WS-153-team-c-round-3-complete.md`
- **Production Evidence:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch14/WS-153-database-production-evidence.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_3_COMPLETE | team-c | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | PRODUCTION_READY | team-c | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 🏁 FINAL ROUND COMPLETION CHECKLIST
- [ ] All production database features complete
- [ ] Monitoring and alerting operational
- [ ] Backup and disaster recovery tested
- [ ] Load testing passed successfully
- [ ] Integration with all teams verified
- [ ] Database documentation complete
- [ ] Production deployment ready

---

END OF FINAL ROUND PROMPT - EXECUTE IMMEDIATELY