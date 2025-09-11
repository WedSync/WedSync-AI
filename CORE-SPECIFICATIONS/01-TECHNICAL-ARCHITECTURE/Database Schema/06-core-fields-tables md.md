# 06-core-fields-tables.md

````markdown
# Core Fields Tables

## core_fields Table
```sql
CREATE TABLE core_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) UNIQUE,
  
  -- Essential Information (Always Required)
  wedding_date DATE,
  ceremony_venue_name TEXT,
  ceremony_venue_address TEXT,
  guest_count INTEGER,
  
  -- Venue Details
  reception_venue_name TEXT,
  reception_venue_address TEXT,
  ceremony_time TIME,
  reception_time TIME,
  
  -- Contact Information
  partner1_email TEXT,
  partner1_phone TEXT,
  partner2_email TEXT,
  partner2_phone TEXT,
  
  -- Additional Details (JSONB for flexibility)
  wedding_party JSONB, -- [{name, role, contact}]
  dietary_requirements JSONB,
  special_requests TEXT,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  completion_percentage INTEGER DEFAULT 0
);`

## Field States System

sql

`CREATE TYPE field_state AS ENUM (
  'complete',    *-- ✅ Fully filled*
  'partial',     *-- 🟡 Some info present*  
  'pending',     *-- ⚪ Not yet filled*
  'not_applicable' *-- ❌ Not needed*
);`

## Critical Implementation

- Auto-calculate completion_percentage on update
- Broadcast updates via Realtime to connected suppliers
- Version history for audit trail
- Field-level permissions per supplier