-- Test migration with common problematic patterns
-- This will demonstrate the pattern fixes

BEGIN;

-- Problem 1: Custom auth function (will be fixed)
CREATE POLICY "org_members_only" ON test_table
FOR ALL USING (
  organization_id = (SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid()) LIMIT 1)
);

-- Problem 2: Role check function (will be fixed)  
CREATE POLICY "admin_only" ON test_table
FOR INSERT WITH CHECK (
  (SELECT role IN ('ADMIN', 'OWNER') FROM user_profiles WHERE user_id = (SELECT auth.uid()) LIMIT 1) = true
);

-- Problem 3: Wrong table reference (will be fixed)
CREATE POLICY "user_access" ON test_table
FOR SELECT USING (
  user_id IN (SELECT id FROM user_profiles WHERE active = true)
);

-- Problem 4: GIST constraint with UUID (will be fixed)
CREATE TABLE booking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_constraint UNIQUE (supplier_id, scheduled_at)
);

-- Problem 5: Table that might be a view (will be fixed)
DROP VIEW IF EXISTS security_incidents CASCADE;
CREATE TABLE security_incidents (
  id SERIAL PRIMARY KEY,
  incident_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;