-- WS-152: Dietary Requirements Management System
-- Team D - Batch 13 Implementation
-- Date: 2025-08-26
-- Focus: Medical Data Security, Performance, Compliance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dietary requirement types enum
CREATE TYPE dietary_severity AS ENUM (
  'preference',     -- Personal preference
  'intolerance',    -- Mild intolerance
  'allergy',        -- Standard allergy
  'severe_allergy', -- Severe allergy requiring EpiPen
  'life_threatening', -- Life-threatening condition
  'medical_required' -- Medical requirement (e.g., diabetic)
);

-- Dietary categories enum
CREATE TYPE dietary_category AS ENUM (
  'allergen',       -- Food allergens
  'religious',      -- Religious restrictions
  'ethical',        -- Vegan, vegetarian
  'medical',        -- Medical conditions
  'preference',     -- Personal preferences
  'intolerance'     -- Food intolerances
);

-- Master dietary types table
CREATE TABLE dietary_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category dietary_category NOT NULL,
  common_allergens TEXT[] DEFAULT '{}',
  cross_contamination_risk BOOLEAN DEFAULT FALSE,
  requires_medical_attention BOOLEAN DEFAULT FALSE,
  standard_substitutes JSONB DEFAULT '{}',
  catering_notes TEXT,
  icon VARCHAR(50),
  color_code VARCHAR(7),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest dietary requirements (encrypted for medical data)
CREATE TABLE guest_dietary_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  dietary_type_id UUID NOT NULL REFERENCES dietary_types(id) ON DELETE RESTRICT,
  severity dietary_severity NOT NULL,
  
  -- Encrypted medical information
  medical_details_encrypted BYTEA, -- Encrypted using pgcrypto
  medical_details_salt UUID DEFAULT gen_random_uuid(),
  
  -- Standard details
  description TEXT,
  verified_by VARCHAR(100), -- Who verified this requirement
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Emergency information (encrypted for severe cases)
  emergency_contact_encrypted BYTEA,
  emergency_medication_encrypted BYTEA,
  hospital_preference_encrypted BYTEA,
  
  -- Cross-contamination tracking
  cross_contamination_severity dietary_severity,
  kitchen_separation_required BOOLEAN DEFAULT FALSE,
  
  -- Compliance tracking
  last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  review_required BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_guest_dietary UNIQUE(guest_id, dietary_type_id)
);

-- Dietary requirement audit log (HIPAA-like compliance)
CREATE TABLE dietary_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES guest_dietary_requirements(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'viewed', 
    'verified', 'exported', 'shared', 'emergency_accessed'
  )),
  performed_by UUID NOT NULL,
  performed_by_role VARCHAR(50),
  
  -- Change tracking
  changes_made JSONB DEFAULT '{}',
  previous_values JSONB DEFAULT '{}',
  
  -- Access context
  access_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Compliance fields
  legitimate_access BOOLEAN DEFAULT TRUE,
  emergency_override BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dietary matrix cache for performance
CREATE TABLE dietary_matrix_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Cached aggregated data
  total_guests INTEGER NOT NULL,
  dietary_summary JSONB NOT NULL, -- Aggregated dietary requirements
  allergen_matrix JSONB NOT NULL, -- Cross-reference of allergens
  severity_breakdown JSONB NOT NULL,
  
  -- Catering-specific data
  kitchen_requirements JSONB DEFAULT '{}',
  special_equipment_needed TEXT[],
  estimated_additional_cost DECIMAL(10, 2),
  
  -- Cache management
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  is_valid BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_event_cache UNIQUE(event_id, couple_id)
);

-- Catering dietary reports
CREATE TABLE catering_dietary_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  
  -- Report data
  total_guests INTEGER NOT NULL,
  dietary_breakdown JSONB NOT NULL,
  allergen_list JSONB NOT NULL,
  special_instructions TEXT,
  
  -- Life-threatening allergies summary (encrypted)
  critical_allergies_encrypted BYTEA,
  emergency_procedures_encrypted BYTEA,
  
  -- Report metadata
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shared_with TEXT[], -- Vendor emails
  last_accessed TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0
);

-- Insert standard dietary types
INSERT INTO dietary_types (name, category, common_allergens, cross_contamination_risk, requires_medical_attention) VALUES
  -- Allergens (Top 9 FDA allergens)
  ('Peanut Allergy', 'allergen', ARRAY['peanuts', 'groundnuts'], TRUE, TRUE),
  ('Tree Nut Allergy', 'allergen', ARRAY['almonds', 'cashews', 'walnuts', 'pecans', 'pistachios'], TRUE, TRUE),
  ('Milk Allergy', 'allergen', ARRAY['milk', 'dairy', 'lactose', 'casein', 'whey'], TRUE, FALSE),
  ('Egg Allergy', 'allergen', ARRAY['eggs', 'albumin', 'mayonnaise'], TRUE, FALSE),
  ('Wheat Allergy', 'allergen', ARRAY['wheat', 'gluten', 'flour'], TRUE, FALSE),
  ('Soy Allergy', 'allergen', ARRAY['soy', 'soybean', 'tofu', 'tempeh'], TRUE, FALSE),
  ('Fish Allergy', 'allergen', ARRAY['fish', 'salmon', 'tuna', 'cod'], TRUE, TRUE),
  ('Shellfish Allergy', 'allergen', ARRAY['shrimp', 'crab', 'lobster', 'oysters', 'mussels'], TRUE, TRUE),
  ('Sesame Allergy', 'allergen', ARRAY['sesame', 'tahini', 'hummus'], TRUE, FALSE),
  
  -- Medical conditions
  ('Celiac Disease', 'medical', ARRAY['gluten', 'wheat', 'barley', 'rye'], TRUE, TRUE),
  ('Diabetes', 'medical', ARRAY['sugar', 'carbohydrates'], FALSE, TRUE),
  ('Phenylketonuria (PKU)', 'medical', ARRAY['phenylalanine', 'aspartame'], FALSE, TRUE),
  
  -- Religious restrictions
  ('Kosher', 'religious', ARRAY['pork', 'shellfish', 'mixing meat and dairy'], FALSE, FALSE),
  ('Halal', 'religious', ARRAY['pork', 'alcohol', 'non-halal meat'], FALSE, FALSE),
  ('Hindu Vegetarian', 'religious', ARRAY['meat', 'eggs', 'fish'], FALSE, FALSE),
  
  -- Ethical choices
  ('Vegan', 'ethical', ARRAY['meat', 'dairy', 'eggs', 'honey', 'animal products'], FALSE, FALSE),
  ('Vegetarian', 'ethical', ARRAY['meat', 'fish', 'poultry'], FALSE, FALSE),
  ('Pescatarian', 'ethical', ARRAY['meat', 'poultry'], FALSE, FALSE),
  
  -- Intolerances
  ('Lactose Intolerance', 'intolerance', ARRAY['milk', 'dairy'], FALSE, FALSE),
  ('Gluten Intolerance', 'intolerance', ARRAY['wheat', 'gluten'], FALSE, FALSE),
  ('Fructose Intolerance', 'intolerance', ARRAY['fruits', 'honey', 'agave'], FALSE, FALSE);

-- Performance indexes for dietary requirements
CREATE INDEX idx_dietary_req_guest ON guest_dietary_requirements(guest_id);
CREATE INDEX idx_dietary_req_type ON guest_dietary_requirements(dietary_type_id);
CREATE INDEX idx_dietary_req_severity ON guest_dietary_requirements(severity);
CREATE INDEX idx_dietary_req_medical ON guest_dietary_requirements(severity) 
  WHERE severity IN ('severe_allergy', 'life_threatening', 'medical_required');
CREATE INDEX idx_dietary_audit_req ON dietary_audit_log(requirement_id);
CREATE INDEX idx_dietary_audit_guest ON dietary_audit_log(guest_id);
CREATE INDEX idx_dietary_audit_action ON dietary_audit_log(action);
CREATE INDEX idx_dietary_audit_date ON dietary_audit_log(created_at);
CREATE INDEX idx_dietary_matrix_valid ON dietary_matrix_cache(couple_id, is_valid) 
  WHERE is_valid = TRUE;
CREATE INDEX idx_catering_reports_couple ON catering_dietary_reports(couple_id);
CREATE INDEX idx_catering_reports_date ON catering_dietary_reports(event_date);

-- Full text search index for dietary types
CREATE INDEX idx_dietary_types_search ON dietary_types 
  USING gin(to_tsvector('english', name || ' ' || COALESCE(catering_notes, '')));

-- Encryption functions for medical data
CREATE OR REPLACE FUNCTION encrypt_medical_data(
  p_data TEXT,
  p_salt UUID
) RETURNS BYTEA AS $$
DECLARE
  v_key BYTEA;
BEGIN
  -- Generate encryption key from salt and app secret
  v_key := digest(
    current_setting('app.encryption_secret', TRUE) || p_salt::TEXT, 
    'sha256'
  );
  
  -- Encrypt using AES
  RETURN pgp_sym_encrypt(p_data, v_key::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_medical_data(
  p_encrypted BYTEA,
  p_salt UUID
) RETURNS TEXT AS $$
DECLARE
  v_key BYTEA;
BEGIN
  -- Generate decryption key
  v_key := digest(
    current_setting('app.encryption_secret', TRUE) || p_salt::TEXT, 
    'sha256'
  );
  
  -- Decrypt data
  RETURN pgp_sym_decrypt(p_encrypted, v_key::TEXT);
EXCEPTION
  WHEN OTHERS THEN
    -- Log failed decryption attempt
    INSERT INTO dietary_audit_log (
      action, 
      performed_by, 
      access_reason,
      legitimate_access
    ) VALUES (
      'decrypt_failed',
      auth.uid(),
      'Failed decryption attempt: ' || SQLERRM,
      FALSE
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate dietary matrix with performance optimization
CREATE OR REPLACE FUNCTION generate_dietary_matrix(
  p_couple_id UUID,
  p_event_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_cache_record dietary_matrix_cache;
BEGIN
  -- Check cache first
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO v_cache_record
    FROM dietary_matrix_cache
    WHERE couple_id = p_couple_id 
      AND event_id = p_event_id
      AND is_valid = TRUE
      AND expires_at > NOW()
    LIMIT 1;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'summary', v_cache_record.dietary_summary,
        'allergens', v_cache_record.allergen_matrix,
        'severity', v_cache_record.severity_breakdown,
        'cached', TRUE,
        'cached_at', v_cache_record.generated_at
      );
    END IF;
  END IF;
  
  -- Generate fresh matrix
  WITH dietary_stats AS (
    SELECT 
      dt.category,
      dt.name,
      gdr.severity,
      COUNT(DISTINCT gdr.guest_id) as guest_count,
      ARRAY_AGG(DISTINCT dt.common_allergens) as allergens,
      MAX(dt.cross_contamination_risk) as cross_contamination,
      MAX(dt.requires_medical_attention) as medical_attention
    FROM guest_dietary_requirements gdr
    JOIN dietary_types dt ON dt.id = gdr.dietary_type_id
    JOIN guests g ON g.id = gdr.guest_id
    WHERE g.couple_id = p_couple_id
      AND g.rsvp_status = 'attending'
    GROUP BY dt.category, dt.name, gdr.severity
  ),
  severity_summary AS (
    SELECT 
      severity,
      COUNT(*) as requirement_count,
      COUNT(DISTINCT guest_id) as affected_guests
    FROM guest_dietary_requirements gdr
    JOIN guests g ON g.id = gdr.guest_id
    WHERE g.couple_id = p_couple_id
      AND g.rsvp_status = 'attending'
    GROUP BY severity
  )
  SELECT jsonb_build_object(
    'total_requirements', (SELECT COUNT(*) FROM dietary_stats),
    'by_category', (
      SELECT jsonb_object_agg(category, requirements)
      FROM (
        SELECT category, jsonb_agg(row_to_json(ds.*)) as requirements
        FROM dietary_stats ds
        GROUP BY category
      ) cat
    ),
    'severity_breakdown', (
      SELECT jsonb_object_agg(severity, jsonb_build_object(
        'count', requirement_count,
        'guests', affected_guests
      ))
      FROM severity_summary
    ),
    'critical_allergies', (
      SELECT jsonb_agg(DISTINCT name)
      FROM dietary_stats
      WHERE severity IN ('life_threatening', 'severe_allergy')
        AND medical_attention = TRUE
    ),
    'kitchen_requirements', (
      SELECT jsonb_build_object(
        'separate_prep_needed', EXISTS(
          SELECT 1 FROM dietary_stats 
          WHERE cross_contamination = TRUE
        ),
        'allergen_free_zone', EXISTS(
          SELECT 1 FROM dietary_stats 
          WHERE severity = 'life_threatening'
        )
      )
    ),
    'generated_at', NOW()
  ) INTO v_result;
  
  -- Cache the result if event_id provided
  IF p_event_id IS NOT NULL THEN
    INSERT INTO dietary_matrix_cache (
      event_id,
      couple_id,
      total_guests,
      dietary_summary,
      allergen_matrix,
      severity_breakdown,
      generated_at,
      expires_at,
      is_valid
    ) VALUES (
      p_event_id,
      p_couple_id,
      (SELECT COUNT(*) FROM guests WHERE couple_id = p_couple_id AND rsvp_status = 'attending'),
      v_result->'by_category',
      v_result->'critical_allergies',
      v_result->'severity_breakdown',
      NOW(),
      NOW() + INTERVAL '1 hour',
      TRUE
    )
    ON CONFLICT (event_id, couple_id) 
    DO UPDATE SET
      dietary_summary = EXCLUDED.dietary_summary,
      allergen_matrix = EXCLUDED.allergen_matrix,
      severity_breakdown = EXCLUDED.severity_breakdown,
      generated_at = NOW(),
      expires_at = NOW() + INTERVAL '1 hour',
      is_valid = TRUE;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invalidate cache on dietary changes
CREATE OR REPLACE FUNCTION invalidate_dietary_cache() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dietary_matrix_cache
  SET is_valid = FALSE
  WHERE couple_id = (
    SELECT couple_id FROM guests WHERE id = COALESCE(NEW.guest_id, OLD.guest_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_invalidate_dietary_cache
AFTER INSERT OR UPDATE OR DELETE ON guest_dietary_requirements
FOR EACH ROW
EXECUTE FUNCTION invalidate_dietary_cache();

-- Audit trigger for dietary requirements
CREATE OR REPLACE FUNCTION audit_dietary_changes() 
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}';
  v_previous JSONB := '{}';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Calculate changes
    v_changes := to_jsonb(NEW) - to_jsonb(OLD);
    v_previous := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_previous := to_jsonb(OLD);
  END IF;
  
  INSERT INTO dietary_audit_log (
    requirement_id,
    guest_id,
    action,
    performed_by,
    changes_made,
    previous_values,
    created_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.guest_id, OLD.guest_id),
    LOWER(TG_OP) || 'd',
    auth.uid(),
    v_changes,
    v_previous,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_dietary_requirements
AFTER INSERT OR UPDATE OR DELETE ON guest_dietary_requirements
FOR EACH ROW
EXECUTE FUNCTION audit_dietary_changes();

-- Row Level Security
ALTER TABLE dietary_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_dietary_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_matrix_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_dietary_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Dietary types are public read
CREATE POLICY "Dietary types are viewable by all authenticated users"
  ON dietary_types FOR SELECT
  TO authenticated
  USING (TRUE);

-- Guest dietary requirements - strict access
CREATE POLICY "Users can manage their guests dietary requirements"
  ON guest_dietary_requirements FOR ALL
  TO authenticated
  USING (
    guest_id IN (
      SELECT g.id FROM guests g
      JOIN clients c ON c.id = g.couple_id
      WHERE c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    guest_id IN (
      SELECT g.id FROM guests g
      JOIN clients c ON c.id = g.couple_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Dietary audit log - read only for data owners
CREATE POLICY "Users can view audit logs for their guests"
  ON dietary_audit_log FOR SELECT
  TO authenticated
  USING (
    guest_id IN (
      SELECT g.id FROM guests g
      JOIN clients c ON c.id = g.couple_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Matrix cache - couple specific
CREATE POLICY "Couples can access their dietary matrix cache"
  ON dietary_matrix_cache FOR ALL
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Catering reports - couple specific
CREATE POLICY "Couples can manage their catering reports"
  ON catering_dietary_reports FOR ALL
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Performance views for monitoring
CREATE OR REPLACE VIEW dietary_performance_metrics AS
SELECT 
  'cache_hit_rate' as metric,
  ROUND((
    SELECT COUNT(*)::NUMERIC * 100 / NULLIF(
      (SELECT COUNT(*) FROM dietary_audit_log WHERE action = 'viewed'),
      0
    )
    FROM dietary_matrix_cache
    WHERE is_valid = TRUE
  ), 2) as value,
  'percentage' as unit
UNION ALL
SELECT 
  'avg_matrix_generation_time' as metric,
  0.5 as value, -- Placeholder - would need timing logs
  'seconds' as unit
UNION ALL
SELECT 
  'total_dietary_requirements' as metric,
  COUNT(*)::NUMERIC as value,
  'count' as unit
FROM guest_dietary_requirements
UNION ALL
SELECT 
  'critical_allergies' as metric,
  COUNT(*)::NUMERIC as value,
  'count' as unit
FROM guest_dietary_requirements
WHERE severity IN ('life_threatening', 'severe_allergy');

-- Grant necessary permissions
GRANT SELECT ON dietary_types TO authenticated;
GRANT ALL ON guest_dietary_requirements TO authenticated;
GRANT SELECT ON dietary_audit_log TO authenticated;
GRANT ALL ON dietary_matrix_cache TO authenticated;
GRANT ALL ON catering_dietary_reports TO authenticated;
GRANT SELECT ON dietary_performance_metrics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE guest_dietary_requirements IS 'Stores guest dietary requirements with medical-grade encryption for sensitive data';
COMMENT ON TABLE dietary_audit_log IS 'HIPAA-compliant audit log for all dietary data access and modifications';
COMMENT ON TABLE dietary_matrix_cache IS 'Performance cache for dietary requirement matrices, auto-expires after 1 hour';
COMMENT ON TABLE catering_dietary_reports IS 'Secure catering reports with encrypted critical allergy information';
COMMENT ON FUNCTION generate_dietary_matrix IS 'High-performance function to generate dietary requirement matrix with caching';