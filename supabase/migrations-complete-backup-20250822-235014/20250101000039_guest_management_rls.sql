-- Migration: Guest Management RLS Policies (WS-056)
-- Date: 2025-08-22
-- Features: Row Level Security for guest management system

-- Policies for guests
CREATE POLICY "Users can view guests for their clients" ON guests
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can insert guests for their clients" ON guests
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update guests for their clients" ON guests
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can delete guests for their clients" ON guests
  FOR DELETE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Policies for households (same pattern)
CREATE POLICY "Users can view households for their clients" ON households
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can insert households for their clients" ON households
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update households for their clients" ON households
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can delete households for their clients" ON households
  FOR DELETE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Policies for import sessions
CREATE POLICY "Users can view import sessions for their clients" ON guest_import_sessions
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can insert import sessions for their clients" ON guest_import_sessions
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update import sessions for their clients" ON guest_import_sessions
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Policies for import history
CREATE POLICY "Users can view import history for their clients" ON guest_import_history
  FOR SELECT USING (
    import_session_id IN (
      SELECT id FROM guest_import_sessions WHERE couple_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
        )
      )
    )
  );

CREATE POLICY "Users can insert import history for their clients" ON guest_import_history
  FOR INSERT WITH CHECK (
    import_session_id IN (
      SELECT id FROM guest_import_sessions WHERE couple_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
        )
      )
    )
  );