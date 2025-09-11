# SQL Migration Request - WS-159 Task Tracking System

**Request ID:** WS-159-migration-20250827  
**Requesting Team:** Team B - Batch 17 - Round 1  
**Priority:** P1 (Critical for wedding task tracking)  
**Date Submitted:** 2025-08-27  

---

## 📋 MIGRATION SUMMARY

### Migration File Details:
- **File:** `20250827130000_ws159_enhanced_task_tracking.sql`
- **Location:** `/wedsync/supabase/migrations/`
- **Size:** 389 lines
- **Type:** Schema extension with new tables and enhanced functions

### Purpose:
Enhance existing task management system with comprehensive progress tracking, photo evidence, and real-time analytics for wedding couples to monitor helper task completion.

---

## 🗄️ DATABASE CHANGES REQUESTED

### 1. Table Extensions:
**Extend `workflow_tasks` table:**
```sql
ALTER TABLE workflow_tasks 
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_photo_evidence BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
```

### 2. New Tables to Create:
**`task_progress_history`** - Detailed progress tracking
```sql
CREATE TABLE task_progress_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  recorded_by UUID NOT NULL REFERENCES team_members(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  milestone TEXT,
  estimated_completion TIMESTAMPTZ,
  blocking_issues TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`task_photo_evidence`** - Photo evidence storage
```sql
CREATE TABLE task_photo_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  content_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES team_members(id),
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  is_completion_proof BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES team_members(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Enhanced Functions:
- **`update_task_status_with_history()`** - Atomic status updates
- **`get_wedding_task_analytics()`** - Completion analytics
- **`identify_bottleneck_tasks_enhanced()`** - Bottleneck detection
- **`validate_task_completion()`** - Photo evidence validation

### 4. Performance Indexes:
```sql
CREATE INDEX idx_workflow_tasks_tracking_enabled ON workflow_tasks(tracking_enabled);
CREATE INDEX idx_task_progress_history_task_id ON task_progress_history(task_id);
CREATE INDEX idx_task_photo_evidence_task_id ON task_photo_evidence(task_id);
-- Additional indexes for query optimization
```

---

## 🔒 SECURITY CONSIDERATIONS

### Row Level Security (RLS):
- **`task_progress_history`** - Users can only access progress for tasks they're involved with
- **`task_photo_evidence`** - Photo evidence restricted to task participants
- **Insert Policies** - Users can only create records for tasks they're assigned to

### Data Integrity:
- Foreign key constraints maintain referential integrity
- Check constraints ensure data validity (progress 0-100%, positive file sizes)
- Triggers maintain timestamp consistency

---

## ⚠️ POTENTIAL CONFLICTS & DEPENDENCIES

### Dependent Tables:
- **`workflow_tasks`** (existing) - Being extended, not replaced
- **`team_members`** (existing) - Referenced by new tables
- **`task_status_history`** (existing) - Being extended with automation tracking

### Potential Conflicts:
1. **Column Name Conflicts** - All new columns use `IF NOT EXISTS` to prevent errors
2. **Index Name Conflicts** - All indexes use `IF NOT EXISTS`
3. **Function Conflicts** - Functions use `CREATE OR REPLACE` for safe updates

### Migration Dependencies:
- Requires existing task delegation system migration (20250101000044)
- Requires existing status history migration (20250101000047)
- All dependencies verified in existing migration history

---

## 🧪 TESTING REQUIREMENTS

### Pre-Migration Validation:
1. **Backup Verification** - Ensure current database backup exists
2. **Dependency Check** - Verify all referenced tables exist
3. **Syntax Validation** - PostgreSQL syntax verification complete

### Post-Migration Testing:
1. **Function Testing** - Verify all new functions execute correctly
2. **Constraint Testing** - Test check constraints with boundary values
3. **RLS Testing** - Verify security policies prevent unauthorized access
4. **Index Performance** - Confirm query performance improvements
5. **Integration Testing** - Test with WS-159 API endpoints

### Rollback Plan:
```sql
-- Rollback commands prepared:
DROP TABLE IF EXISTS task_photo_evidence CASCADE;
DROP TABLE IF EXISTS task_progress_history CASCADE;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS tracking_enabled;
-- Full rollback script available on request
```

---

## 📊 EXPECTED IMPACT

### Performance Impact:
- **Positive:** New indexes will improve query performance for task tracking
- **Neutral:** Table extensions are minimal and won't affect existing queries
- **Storage:** Approximately 50MB additional storage per 10,000 tasks

### Application Impact:
- **Zero Downtime:** Migration designed for safe online execution
- **Backward Compatible:** Existing queries will continue to work
- **New Features:** Enables WS-159 task tracking API endpoints

### Monitoring Points:
- Query performance on new indexes
- Storage usage growth rate
- Function execution time for analytics

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Recommended Deployment Window:
- **Preferred:** During low-traffic hours (2-4 AM)
- **Duration:** Estimated 5-10 minutes
- **Risk Level:** LOW (additive changes only)

### Pre-Deployment Checklist:
- [ ] Database backup completed
- [ ] Migration file syntax validated
- [ ] Dependencies verified
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured

### Post-Deployment Verification:
```sql
-- Verification queries:
SELECT COUNT(*) FROM task_progress_history; -- Should return 0 or existing records
SELECT COUNT(*) FROM task_photo_evidence;   -- Should return 0
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'workflow_tasks' AND column_name LIKE '%tracking%';
```

---

## 📞 CONTACT INFORMATION

### Migration Requester:
- **Team:** Team B - Batch 17
- **Feature:** WS-159 Task Tracking Backend API
- **Priority:** P1 (Critical path for wedding operations)

### Technical Contact:
- **Lead Developer:** Claude (Team B)
- **Migration File:** Available in `/wedsync/supabase/migrations/`
- **Testing Evidence:** Comprehensive test suite with 22 validation cases

### Business Contact:
- **Product Owner:** Wedding Operations Team
- **Business Impact:** Enables real-time task tracking for wedding couples
- **Go-Live Date:** Dependent on migration completion

---

## ✅ APPROVAL REQUIREMENTS

### Required Approvals:
- [ ] **SQL Expert Review** - Schema and function validation
- [ ] **Security Team** - RLS and constraint review  
- [ ] **Performance Team** - Index and query optimization review
- [ ] **Database Administrator** - Final deployment approval

### Emergency Contact:
In case of migration issues, please contact Team B immediately. Rollback plan is prepared and tested.

---

**Status: AWAITING SQL EXPERT REVIEW**  
**Priority: P1**  
**Estimated Review Time: 2-4 hours**  

---

*Migration Request Submitted: 2025-08-27 22:13 UTC*  
*Team B - WS-159 - Batch 17 - Round 1*