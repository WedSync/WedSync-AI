# TEAM B - ROUND 1: WS-323 - Supplier Hub Section Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive backend APIs and database systems for supplier hub with vendor coordination
**FEATURE ID:** WS-323 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round

## 🗄️ DATABASE SCHEMA REQUIREMENTS

### REQUIRED TABLES (Create Migration):
```sql
-- Supplier connections and vendor network
CREATE TABLE supplier_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  supplier_id UUID REFERENCES user_profiles(id),
  vendor_type VARCHAR(100) NOT NULL,
  connection_status VARCHAR(50) DEFAULT 'active',
  shared_permissions JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor messaging system
CREATE TABLE vendor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  from_vendor_id UUID REFERENCES user_profiles(id),
  to_vendor_id UUID REFERENCES user_profiles(id),
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'direct',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 API ENDPOINTS TO BUILD

### 1. SUPPLIER HUB ENDPOINTS
```typescript
// GET /api/supplier-hub/vendors
// POST /api/supplier-hub/vendors/connect
// PUT /api/supplier-hub/vendors/[id]/permissions
// GET /api/supplier-hub/messages
// POST /api/supplier-hub/messages
```

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes:** $WS_ROOT/wedsync/src/app/api/supplier-hub/
- **Services:** $WS_ROOT/wedsync/src/lib/services/supplier-hub/
- **Database Migration:** $WS_ROOT/wedsync/supabase/migrations/

---

**EXECUTE IMMEDIATELY - Build the supplier hub backend for vendor coordination!**