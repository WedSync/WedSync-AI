# TEAM B - ROUND 1: WS-324 - Timeline Builder Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and database systems for wedding timeline builder with vendor coordination
**FEATURE ID:** WS-324 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Wedding timelines and events
CREATE TABLE wedding_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  timeline_date DATE NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  vendor_assignments JSONB DEFAULT '{}',
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline events and activities
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES wedding_timelines(id),
  event_title VARCHAR(255) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  description TEXT,
  vendor_ids JSONB DEFAULT '[]',
  event_type VARCHAR(100),
  buffer_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. TIMELINE BUILDER ENDPOINTS
```typescript
// GET /api/timeline-builder/timelines
// POST /api/timeline-builder/timelines
// PUT /api/timeline-builder/timelines/[id]
// GET /api/timeline-builder/events
// POST /api/timeline-builder/events
// PUT /api/timeline-builder/events/[id]
```

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/timeline-builder/
- **Services:** $WS_ROOT/wedsync/src/lib/services/timeline-builder/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/

---

**EXECUTE IMMEDIATELY - Build the timeline builder backend for wedding day coordination!**