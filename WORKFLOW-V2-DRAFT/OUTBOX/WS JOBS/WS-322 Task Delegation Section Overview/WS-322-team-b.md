# TEAM B - ROUND 1: WS-322 - Task Delegation Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and database systems for wedding task delegation with helper coordination
**FEATURE ID:** WS-322 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about task assignment workflows, helper permissions, and real-time task status synchronization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/task-delegation/
cat $WS_ROOT/wedsync/src/app/api/task-delegation/tasks/route.ts | head -20
```

2. **DATABASE MIGRATION RESULTS:**
```bash
npx supabase migration list --linked
# MUST show WS-322 task delegation migration applied
```

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Wedding tasks and assignments
CREATE TABLE wedding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category VARCHAR(50) DEFAULT 'general',
  estimated_hours INTEGER,
  actual_hours INTEGER,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding helpers and permissions
CREATE TABLE wedding_helpers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  user_id UUID REFERENCES auth.users(id),
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  relationship VARCHAR(100),
  role VARCHAR(50) DEFAULT 'helper',
  permissions JSONB DEFAULT '[]',
  invitation_status VARCHAR(20) DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task comments and updates
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES wedding_tasks(id),
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. TASK MANAGEMENT ENDPOINTS
```typescript
// GET /api/task-delegation/tasks
// POST /api/task-delegation/tasks
// PUT /api/task-delegation/tasks/[id]
// DELETE /api/task-delegation/tasks/[id]
```

### 2. HELPER MANAGEMENT ENDPOINTS
```typescript
// GET /api/task-delegation/helpers
// POST /api/task-delegation/helpers/invite
// PUT /api/task-delegation/helpers/[id]/permissions
// DELETE /api/task-delegation/helpers/[id]
```

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/task-delegation/
- **Services:** $WS_ROOT/wedsync/src/lib/services/task-delegation/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/
- **Types:** $WS_ROOT/wedsync/src/types/task-delegation.ts

---

**EXECUTE IMMEDIATELY - Build the task delegation backend that coordinates wedding helpers efficiently!**