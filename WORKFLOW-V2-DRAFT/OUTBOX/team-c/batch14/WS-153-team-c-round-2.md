# TEAM C - ROUND 2: WS-153 - Photo Groups Management - Advanced Database Features

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Implement advanced database features, optimization, and real-time capabilities  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Fast, reliable database operations that support complex photo group scenarios
**So that:** The system can handle large guest lists, complex scheduling, and real-time collaboration without performance issues

**Real Wedding Problem This Solves:**
Building on Round 1's basic schema, weddings with 200+ guests need advanced database features: fast conflict detection, optimized queries for large datasets, real-time triggers for collaboration, and efficient guest-to-group relationships.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification & Round 1 Foundation:**
- Advanced database functions for conflict detection
- Optimized queries and indexes for performance
- Real-time triggers and subscriptions
- Complex join operations for guest-group relationships
- Database-level validation and constraints
- Performance monitoring and analytics

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Database: Advanced PostgreSQL features, PL/pgSQL functions

**Integration Points:**
- **Team A UI**: Provide optimized data structures for complex operations
- **Team B APIs**: Support advanced API features with database functions
- **Real-time**: Database triggers for live collaboration
- **Performance**: Optimized queries for large datasets

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");  
await mcp__context7__get-library-docs("/supabase/supabase", "database functions triggers rls", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime subscriptions postgres", 3000);
await mcp__context7__get-library-docs("/postgresql/postgresql", "advanced-queries indexes performance", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW Round 1 database schema:
await mcp__serena__search_for_pattern("CREATE TABLE.*photo_groups", "", false, true);
await mcp__serena__list_dir("supabase/migrations", false);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Advanced database development"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Complex queries and optimization" 
3. **wedding-domain-expert** --think-ultra-hard --follow-existing-patterns "Large wedding data scenarios" 
4. **security-compliance-officer** --think-ultra-hard --database-security-advanced
5. **test-automation-architect** --database-testing --performance-testing
6. **performance-optimization-expert** --database-optimization --query-performance
7. **database-mcp-specialist** --advanced-features --real-time-triggers

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced Database Features):
- [ ] **Advanced Database Functions** - Conflict detection, scheduling optimization
- [ ] **Performance Indexes** - Optimized indexes for complex queries
- [ ] **Real-time Triggers** - Database triggers for live updates
- [ ] **Data Validation** - Advanced constraints and validation rules
- [ ] **Analytics Views** - Database views for reporting and analytics
- [ ] **Backup Procedures** - Automated backup and recovery procedures
- [ ] **Performance Monitoring** - Database performance metrics and alerts
- [ ] **Load Testing** - Database performance under high load

### Advanced Database Features:
- [ ] Smart conflict detection function with multiple conflict types
- [ ] Optimal guest-to-group assignment algorithm
- [ ] Efficient guest availability checking
- [ ] Priority-based scheduling functions
- [ ] Location-based grouping optimization
- [ ] Real-time change triggers for collaboration
- [ ] Data integrity validation functions

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (Round 1 Complete):
- FROM Team A: UI requirements for complex data operations - **READY FOR REQUESTS**
- FROM Team B: API patterns that require database optimization - **READY**

### What other teams NEED from you:
- TO Team A: Optimized data structures for UI performance
- TO Team B: Advanced database functions for API features
- TO Team D: Efficient queries for WedMe platform
- TO Team E: Performance benchmarks for testing

---

## 🔒 SECURITY REQUIREMENTS (ADVANCED DATABASE SECURITY)

### Advanced Database Security:
- [ ] **Row Level Security**: Advanced RLS policies for complex scenarios
- [ ] **Function Security**: Secure database functions with proper permissions
- [ ] **Data Encryption**: Encrypt sensitive photo group data
- [ ] **Audit Logging**: Database-level audit logging for changes
- [ ] **Backup Security**: Encrypted backups with access controls

---

## 🗄️ ADVANCED DATABASE MIGRATIONS (ROUND 2)

```sql
-- FILE: /wedsync/supabase/migrations/[timestamp]_photo_groups_advanced_round2.sql

-- Advanced conflict detection function
CREATE OR REPLACE FUNCTION detect_advanced_conflicts(
  p_couple_id UUID,
  p_group_id UUID DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  conflict_type VARCHAR(50),
  conflicting_groups UUID[],
  affected_guests UUID[],
  conflict_details JSONB,
  severity INTEGER,
  suggested_resolution TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_record RECORD;
BEGIN
  -- Time overlap conflicts
  FOR conflict_record IN
    SELECT 
      pg1.id as group1_id,
      pg2.id as group2_id,
      array_agg(DISTINCT pgm1.guest_id) as shared_guests,
      pg1.scheduled_start,
      pg1.scheduled_end,
      pg2.scheduled_start, 
      pg2.scheduled_end
    FROM photo_groups pg1
    JOIN photo_group_members pgm1 ON pg1.id = pgm1.photo_group_id
    JOIN photo_group_members pgm2 ON pgm1.guest_id = pgm2.guest_id
    JOIN photo_groups pg2 ON pg2.id = pgm2.photo_group_id
    WHERE pg1.couple_id = p_couple_id
    AND pg2.couple_id = p_couple_id
    AND pg1.id < pg2.id  -- Avoid duplicates
    AND (p_group_id IS NULL OR pg1.id = p_group_id OR pg2.id = p_group_id)
    AND pg1.scheduled_start < pg2.scheduled_end
    AND pg2.scheduled_start < pg1.scheduled_end
    GROUP BY pg1.id, pg2.id, pg1.scheduled_start, pg1.scheduled_end, pg2.scheduled_start, pg2.scheduled_end
    HAVING count(DISTINCT pgm1.guest_id) > 0
  LOOP
    conflict_type := 'guest_time_overlap';
    conflicting_groups := ARRAY[conflict_record.group1_id, conflict_record.group2_id];
    affected_guests := conflict_record.shared_guests;
    
    conflict_details := jsonb_build_object(
      'overlap_start', GREATEST(conflict_record.scheduled_start, conflict_record.scheduled_start),
      'overlap_end', LEAST(conflict_record.scheduled_end, conflict_record.scheduled_end),
      'overlap_duration', LEAST(conflict_record.scheduled_end, conflict_record.scheduled_end) - 
                          GREATEST(conflict_record.scheduled_start, conflict_record.scheduled_start),
      'group1_details', jsonb_build_object('id', conflict_record.group1_id, 'start', conflict_record.scheduled_start, 'end', conflict_record.scheduled_end),
      'group2_details', jsonb_build_object('id', conflict_record.group2_id, 'start', conflict_record.scheduled_start, 'end', conflict_record.scheduled_end)
    );
    
    -- Calculate severity (1-10 scale)
    severity := CASE
      WHEN array_length(conflict_record.shared_guests, 1) > 5 THEN 9  -- High severity for many shared guests
      WHEN array_length(conflict_record.shared_guests, 1) > 2 THEN 6  -- Medium severity
      ELSE 3  -- Low severity for few shared guests
    END;
    
    suggested_resolution := CASE
      WHEN array_length(conflict_record.shared_guests, 1) = 1 THEN 
        'Consider removing the shared guest from one group or adjusting timing by 15 minutes'
      ELSE 
        'Significant overlap detected. Consider rescheduling one group or splitting into smaller groups'
    END;
    
    RETURN NEXT;
  END LOOP;

  -- Location conflicts (same location, overlapping times)
  FOR conflict_record IN
    SELECT 
      pg1.id as group1_id,
      pg2.id as group2_id,
      pg1.location_preference,
      pg1.scheduled_start,
      pg1.scheduled_end,
      pg2.scheduled_start,
      pg2.scheduled_end
    FROM photo_groups pg1
    JOIN photo_groups pg2 ON pg1.location_preference = pg2.location_preference
    WHERE pg1.couple_id = p_couple_id
    AND pg2.couple_id = p_couple_id
    AND pg1.id < pg2.id
    AND pg1.location_preference IS NOT NULL
    AND pg2.location_preference IS NOT NULL
    AND pg1.scheduled_start < pg2.scheduled_end
    AND pg2.scheduled_start < pg1.scheduled_end
  LOOP
    conflict_type := 'location_time_overlap';
    conflicting_groups := ARRAY[conflict_record.group1_id, conflict_record.group2_id];
    affected_guests := ARRAY[]::UUID[];  -- No specific guests affected
    
    conflict_details := jsonb_build_object(
      'location', conflict_record.location_preference,
      'overlap_start', GREATEST(conflict_record.scheduled_start, conflict_record.scheduled_start),
      'overlap_end', LEAST(conflict_record.scheduled_end, conflict_record.scheduled_end)
    );
    
    severity := 5;  -- Medium severity for location conflicts
    suggested_resolution := format('Two groups scheduled at "%s" have overlapping times. Consider different locations or timing.', conflict_record.location_preference);
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Optimize guest assignment function
CREATE OR REPLACE FUNCTION optimize_photo_group_scheduling(
  p_couple_id UUID,
  p_target_date DATE,
  p_available_hours INTEGER DEFAULT 8
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_groups INTEGER;
  total_duration INTEGER;
  optimization_result JSONB;
  suggested_schedule JSONB[];
  current_time TIME := '09:00:00';
  group_record RECORD;
BEGIN
  -- Get all unscheduled groups for the couple
  SELECT count(*), sum(estimated_duration)
  INTO total_groups, total_duration
  FROM photo_groups
  WHERE couple_id = p_couple_id
  AND (scheduled_start IS NULL OR DATE(scheduled_start) != p_target_date);
  
  -- Check if scheduling is feasible
  IF total_duration > (p_available_hours * 60) THEN
    optimization_result := jsonb_build_object(
      'feasible', false,
      'reason', 'Insufficient time: ' || total_duration || ' minutes needed, ' || (p_available_hours * 60) || ' minutes available',
      'suggestion', 'Consider splitting across multiple days or reducing group sizes'
    );
    RETURN optimization_result;
  END IF;
  
  -- Generate optimal schedule (priority-based)
  suggested_schedule := ARRAY[]::JSONB[];
  
  FOR group_record IN
    SELECT id, name, estimated_duration, priority, location_preference
    FROM photo_groups
    WHERE couple_id = p_couple_id
    AND (scheduled_start IS NULL OR DATE(scheduled_start) != p_target_date)
    ORDER BY priority DESC, estimated_duration ASC
  LOOP
    suggested_schedule := suggested_schedule || jsonb_build_object(
      'group_id', group_record.id,
      'group_name', group_record.name,
      'suggested_start', current_time,
      'suggested_end', current_time + (group_record.estimated_duration || ' minutes')::INTERVAL,
      'location', group_record.location_preference,
      'priority', group_record.priority
    );
    
    -- Add buffer time between groups (5 minutes)
    current_time := current_time + (group_record.estimated_duration + 5 || ' minutes')::INTERVAL;
  END LOOP;
  
  optimization_result := jsonb_build_object(
    'feasible', true,
    'total_groups', total_groups,
    'total_duration_minutes', total_duration,
    'suggested_schedule', suggested_schedule,
    'end_time', current_time,
    'buffer_time_remaining', (p_available_hours * 60) - total_duration
  );
  
  RETURN optimization_result;
END;
$$;

-- Performance indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_couple_scheduled 
ON photo_groups(couple_id, scheduled_start, scheduled_end) 
WHERE scheduled_start IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_location_time 
ON photo_groups(location_preference, scheduled_start, scheduled_end) 
WHERE location_preference IS NOT NULL AND scheduled_start IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_group_members_guest 
ON photo_group_members(guest_id);

-- Composite index for conflict detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_conflict_detection 
ON photo_groups(couple_id, scheduled_start, scheduled_end, priority) 
WHERE scheduled_start IS NOT NULL;

-- Real-time triggers for collaboration
CREATE OR REPLACE FUNCTION notify_photo_group_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify real-time subscribers of changes
  PERFORM pg_notify(
    'photo_group_changes',
    json_build_object(
      'operation', TG_OP,
      'couple_id', COALESCE(NEW.couple_id, OLD.couple_id),
      'group_id', COALESCE(NEW.id, OLD.id),
      'table', TG_TABLE_NAME,
      'timestamp', CURRENT_TIMESTAMP
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for real-time updates
DROP TRIGGER IF EXISTS photo_groups_change_trigger ON photo_groups;
CREATE TRIGGER photo_groups_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON photo_groups
  FOR EACH ROW
  EXECUTE FUNCTION notify_photo_group_change();

DROP TRIGGER IF EXISTS photo_group_members_change_trigger ON photo_group_members;
CREATE TRIGGER photo_group_members_change_trigger
  AFTER INSERT OR DELETE ON photo_group_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_photo_group_change();

-- Advanced Row Level Security policies
CREATE POLICY "photo_groups_advanced_select" ON photo_groups
FOR SELECT TO authenticated
USING (
  -- Users can see their own couple's groups
  couple_id IN (
    SELECT c.id FROM couples c 
    WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
  )
  OR
  -- Photographers can see groups for couples they're working with
  couple_id IN (
    SELECT DISTINCT pg.couple_id FROM photo_groups pg
    JOIN contracts co ON co.couple_id = pg.couple_id
    JOIN suppliers s ON s.id = co.supplier_id
    WHERE s.user_id = auth.uid() AND s.category = 'photography'
  )
);

-- Analytics view for performance monitoring
CREATE OR REPLACE VIEW photo_groups_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  count(*) as groups_created,
  avg(estimated_duration) as avg_duration,
  count(CASE WHEN scheduled_start IS NOT NULL THEN 1 END) as scheduled_groups,
  count(DISTINCT couple_id) as active_couples
FROM photo_groups
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Performance monitoring function
CREATE OR REPLACE FUNCTION get_photo_groups_performance_metrics()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_groups', count(*),
    'scheduled_groups', count(CASE WHEN scheduled_start IS NOT NULL THEN 1 END),
    'avg_group_size', avg((
      SELECT count(*) FROM photo_group_members pgm WHERE pgm.photo_group_id = pg.id
    )),
    'conflicts_detected', (
      SELECT count(*) FROM detect_advanced_conflicts(pg.couple_id) WHERE severity > 5
    ),
    'last_updated', CURRENT_TIMESTAMP
  )
  FROM photo_groups pg;
$$;

-- Send migration request to SQL Expert
-- Create file: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153-round2.md
```

---

## 🎭 ADVANCED DATABASE TESTING (ROUND 2)

```javascript
// DATABASE PERFORMANCE TESTING
describe('Photo Groups Database Performance', () => {
  test('Conflict detection performs well with large datasets', async () => {
    // Create test data: 100 groups, 1000 guests
    await createTestGroups(100);
    await createTestGuests(1000);
    await assignGuestsToGroups();
    
    const startTime = Date.now();
    
    // Run conflict detection
    const { data: conflicts } = await supabase.rpc('detect_advanced_conflicts', {
      p_couple_id: testCoupleId
    });
    
    const endTime = Date.now();
    
    // Should complete within 500ms even with large dataset
    expect(endTime - startTime).toBeLessThan(500);
    expect(conflicts).toBeDefined();
    expect(Array.isArray(conflicts)).toBe(true);
  });
  
  test('Scheduling optimization handles complex scenarios', async () => {
    // Create 50 groups with various priorities and durations
    const groups = await createComplexTestSchedule();
    
    const startTime = Date.now();
    
    const { data: optimization } = await supabase.rpc('optimize_photo_group_scheduling', {
      p_couple_id: testCoupleId,
      p_target_date: '2024-06-15',
      p_available_hours: 8
    });
    
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(1000);
    expect(optimization.feasible).toBeDefined();
    expect(optimization.suggested_schedule).toBeDefined();
    
    if (optimization.feasible) {
      expect(optimization.suggested_schedule.length).toBe(groups.length);
      
      // Verify no time overlaps in suggested schedule
      const schedule = optimization.suggested_schedule;
      for (let i = 0; i < schedule.length - 1; i++) {
        const current = schedule[i];
        const next = schedule[i + 1];
        expect(new Date(current.suggested_end)).toBeLessThanOrEqual(new Date(next.suggested_start));
      }
    }
  });
});

// REAL-TIME TRIGGERS TESTING
describe('Real-time Database Triggers', () => {
  test('Photo group changes trigger real-time notifications', async () => {
    const notifications = [];
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('test-photo-groups')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'photo_groups'
      }, (payload) => {
        notifications.push(payload);
      })
      .subscribe();
    
    // Wait for subscription to be ready
    await waitForSubscription(subscription);
    
    // Create a photo group
    const { data: newGroup } = await supabase
      .from('photo_groups')
      .insert({
        couple_id: testCoupleId,
        name: 'Test Group',
        estimated_duration: 30
      })
      .select()
      .single();
    
    // Update the group
    await supabase
      .from('photo_groups')
      .update({ name: 'Updated Test Group' })
      .eq('id', newGroup.id);
    
    // Wait for notifications
    await waitFor(() => notifications.length >= 2, 2000);
    
    expect(notifications.length).toBeGreaterThanOrEqual(2);
    expect(notifications[0].eventType).toBe('INSERT');
    expect(notifications[1].eventType).toBe('UPDATE');
    
    subscription.unsubscribe();
  });
});
```

---

## ✅ SUCCESS CRITERIA (ADVANCED DATABASE FEATURES)

### Technical Implementation:
- [ ] Advanced database functions working correctly
- [ ] Performance indexes created and optimized
- [ ] Real-time triggers functioning properly
- [ ] Complex queries execute within performance targets
- [ ] Data validation and constraints enforced
- [ ] Analytics views provide meaningful insights

### Performance & Reliability:
- [ ] Conflict detection completes in < 500ms for large datasets
- [ ] Scheduling optimization handles 50+ groups efficiently
- [ ] Real-time notifications delivered within 100ms
- [ ] Database queries optimized with proper indexes
- [ ] No performance degradation under load

---

## 💾 WHERE TO SAVE YOUR WORK

### Database Files:
- Migration: `/wedsync/supabase/migrations/[timestamp]_photo_groups_advanced_round2.sql`
- Functions: Document all functions in migration file
- Tests: `/wedsync/src/__tests__/database/photo-groups-advanced.test.ts`

### SQL Expert Handover:
- **Create:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153-round2.md`
- **Include:** Migration file path, testing requirements, performance expectations

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch14/WS-153-team-c-round-2-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_2_COMPLETE | team-c | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All advanced database functions implemented
- [ ] Performance indexes created and tested
- [ ] Real-time triggers working correctly
- [ ] Migration file sent to SQL Expert
- [ ] Database testing completed successfully
- [ ] Performance benchmarks met

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY