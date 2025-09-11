-- Migration: WS-151 Guest List Builder - Team D Implementation
-- Date: 2025-08-25
-- Team: Team D - Database Schema, Performance Optimization, Data Integrity
-- Features: Advanced performance optimization for 1000+ guests, enhanced data integrity

-- ========================================
-- TEAM D FOCUS: PERFORMANCE OPTIMIZATION
-- ========================================

-- Advanced composite indexes for complex guest queries
CREATE INDEX IF NOT EXISTS idx_guests_couple_category_rsvp 
  ON guests(couple_id, category, rsvp_status) 
  WHERE rsvp_status != 'pending';

CREATE INDEX IF NOT EXISTS idx_guests_couple_side_age 
  ON guests(couple_id, side, age_group);

CREATE INDEX IF NOT EXISTS idx_guests_couple_household_category 
  ON guests(couple_id, household_id, category) 
  WHERE household_id IS NOT NULL;

-- Partial indexes for performance on large datasets
CREATE INDEX IF NOT EXISTS idx_guests_attending_only 
  ON guests(couple_id, first_name, last_name) 
  WHERE rsvp_status = 'attending';

CREATE INDEX IF NOT EXISTS idx_guests_with_plus_ones 
  ON guests(couple_id, plus_one_name) 
  WHERE plus_one = true AND plus_one_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_with_dietary 
  ON guests(couple_id, dietary_restrictions) 
  WHERE dietary_restrictions IS NOT NULL AND dietary_restrictions != '';

CREATE INDEX IF NOT EXISTS idx_guests_with_special_needs 
  ON guests(couple_id, special_needs) 
  WHERE special_needs IS NOT NULL AND special_needs != '';

-- Household optimization indexes
CREATE INDEX IF NOT EXISTS idx_households_couple_members 
  ON households(couple_id, total_members DESC);

CREATE INDEX IF NOT EXISTS idx_households_invitation_status 
  ON households(couple_id, invitation_sent, invitation_sent_date) 
  WHERE invitation_sent = true;

-- ========================================
-- TEAM D FOCUS: BULK OPERATIONS OPTIMIZATION
-- ========================================

-- Enhanced bulk import function for 1000+ guests with performance monitoring
CREATE OR REPLACE FUNCTION bulk_import_guests_optimized(
    import_session_id UUID,
    guest_data JSONB[],
    batch_size INTEGER DEFAULT 100,
    enable_monitoring BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    imported_count INTEGER,
    failed_count INTEGER,
    processing_time_ms BIGINT,
    average_per_record_ms DECIMAL
) AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    batch_start INTEGER;
    batch_end INTEGER;
    current_batch JSONB[];
    imported_total INTEGER := 0;
    failed_total INTEGER := 0;
    couple_id_val UUID;
    processing_duration INTERVAL;
    performance_data JSONB := '{}';
BEGIN
    start_time := clock_timestamp();
    
    -- Get couple_id from import session
    SELECT couple_id INTO couple_id_val 
    FROM guest_import_sessions 
    WHERE id = import_session_id;
    
    IF couple_id_val IS NULL THEN
        RAISE EXCEPTION 'Import session not found: %', import_session_id;
    END IF;
    
    -- Update session to show batch processing started
    UPDATE guest_import_sessions 
    SET 
        batch_processing = true,
        batch_size = bulk_import_guests_optimized.batch_size,
        status = 'processing'
    WHERE id = import_session_id;
    
    -- Process in batches for optimal performance
    FOR batch_start IN 1..array_length(guest_data, 1) BY batch_size LOOP
        batch_end := LEAST(batch_start + batch_size - 1, array_length(guest_data, 1));
        current_batch := guest_data[batch_start:batch_end];
        
        -- Insert batch with error handling
        BEGIN
            WITH batch_insert AS (
                INSERT INTO guests (
                    couple_id, first_name, last_name, email, phone,
                    category, side, age_group, plus_one, plus_one_name,
                    dietary_restrictions, special_needs, notes, tags
                )
                SELECT 
                    couple_id_val,
                    (guest_row->>'first_name')::VARCHAR(100),
                    (guest_row->>'last_name')::VARCHAR(100),
                    NULLIF(guest_row->>'email', '')::VARCHAR(255),
                    NULLIF(guest_row->>'phone', '')::VARCHAR(20),
                    COALESCE((guest_row->>'category')::VARCHAR(20), 'family'),
                    COALESCE((guest_row->>'side')::VARCHAR(20), 'mutual'),
                    COALESCE((guest_row->>'age_group')::VARCHAR(20), 'adult'),
                    COALESCE((guest_row->>'plus_one')::BOOLEAN, false),
                    NULLIF(guest_row->>'plus_one_name', '')::VARCHAR(100),
                    NULLIF(guest_row->>'dietary_restrictions', ''),
                    NULLIF(guest_row->>'special_needs', ''),
                    NULLIF(guest_row->>'notes', ''),
                    COALESCE(
                        CASE 
                            WHEN guest_row->>'tags' IS NOT NULL 
                            THEN (guest_row->>'tags')::TEXT[]
                            ELSE '{}'::TEXT[]
                        END, 
                        '{}'::TEXT[]
                    )
                FROM unnest(current_batch) AS guest_row
                WHERE guest_row->>'first_name' IS NOT NULL 
                  AND guest_row->>'last_name' IS NOT NULL
                RETURNING id
            )
            SELECT COUNT(*) INTO imported_total FROM batch_insert;
            
            imported_total := imported_total + imported_total;
            
        EXCEPTION WHEN OTHERS THEN
            failed_total := failed_total + array_length(current_batch, 1);
            
            -- Log the error for this batch
            INSERT INTO guest_import_history (
                import_session_id, action, error_message, original_data
            ) VALUES (
                import_session_id, 'error', SQLERRM, 
                json_build_object('batch', current_batch)::JSONB
            );
        END;
    END LOOP;
    
    end_time := clock_timestamp();
    processing_duration := end_time - start_time;
    
    -- Update performance metrics
    performance_data := json_build_object(
        'start_time', start_time,
        'end_time', end_time,
        'duration_ms', EXTRACT(EPOCH FROM processing_duration) * 1000,
        'records_per_second', 
            CASE 
                WHEN EXTRACT(EPOCH FROM processing_duration) > 0 
                THEN array_length(guest_data, 1) / EXTRACT(EPOCH FROM processing_duration)
                ELSE 0 
            END,
        'batch_size_used', batch_size,
        'total_batches', CEIL(array_length(guest_data, 1)::DECIMAL / batch_size)
    );
    
    -- Update import session with results
    UPDATE guest_import_sessions 
    SET 
        processed_rows = array_length(guest_data, 1),
        successful_imports = imported_total,
        failed_imports = failed_total,
        status = CASE WHEN failed_total = 0 THEN 'completed' ELSE 'completed' END,
        performance_metrics = performance_data,
        processing_speed_per_second = (performance_data->>'records_per_second')::DECIMAL,
        completed_at = end_time
    WHERE id = import_session_id;
    
    -- Return results
    RETURN QUERY SELECT 
        imported_total,
        failed_total,
        (EXTRACT(EPOCH FROM processing_duration) * 1000)::BIGINT,
        CASE 
            WHEN imported_total > 0 THEN 
                (EXTRACT(EPOCH FROM processing_duration) * 1000 / imported_total)::DECIMAL
            ELSE 0::DECIMAL
        END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TEAM D FOCUS: REAL-TIME OPTIMIZED QUERIES
-- ========================================

-- Materialized view for fast guest counts and statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS guest_statistics_mv AS
SELECT 
    couple_id,
    COUNT(*) as total_guests,
    COUNT(*) FILTER (WHERE age_group = 'adult') as adults,
    COUNT(*) FILTER (WHERE age_group = 'child') as children,
    COUNT(*) FILTER (WHERE age_group = 'infant') as infants,
    COUNT(*) FILTER (WHERE rsvp_status = 'attending') as attending,
    COUNT(*) FILTER (WHERE rsvp_status = 'declined') as declined,
    COUNT(*) FILTER (WHERE rsvp_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE rsvp_status = 'maybe') as maybe,
    COUNT(*) FILTER (WHERE category = 'family') as family,
    COUNT(*) FILTER (WHERE category = 'friends') as friends,
    COUNT(*) FILTER (WHERE category = 'work') as work,
    COUNT(*) FILTER (WHERE side = 'partner1') as partner1_side,
    COUNT(*) FILTER (WHERE side = 'partner2') as partner2_side,
    COUNT(*) FILTER (WHERE plus_one = true) as with_plus_ones,
    COUNT(*) FILTER (WHERE dietary_restrictions IS NOT NULL AND dietary_restrictions != '') as with_dietary,
    COUNT(DISTINCT household_id) as households,
    ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT household_id), 0), 2) as avg_household_size,
    MAX(updated_at) as last_updated
FROM guests
GROUP BY couple_id;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_statistics_mv_couple_id 
ON guest_statistics_mv(couple_id);

-- Function to refresh statistics efficiently
CREATE OR REPLACE FUNCTION refresh_guest_statistics(couple_id_param UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF couple_id_param IS NOT NULL THEN
        -- Refresh for specific couple (not directly supported, so full refresh)
        REFRESH MATERIALIZED VIEW CONCURRENTLY guest_statistics_mv;
    ELSE
        -- Full refresh
        REFRESH MATERIALIZED VIEW CONCURRENTLY guest_statistics_mv;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TEAM D FOCUS: DATA INTEGRITY CONSTRAINTS
-- ========================================

-- Enhanced validation constraints
ALTER TABLE guests 
ADD CONSTRAINT chk_guest_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE guests 
ADD CONSTRAINT chk_guest_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+?[\d\s\-\(\)]{10,}$');

ALTER TABLE guests 
ADD CONSTRAINT chk_guest_names_not_empty 
CHECK (trim(first_name) != '' AND trim(last_name) != '');

ALTER TABLE households 
ADD CONSTRAINT chk_household_member_counts 
CHECK (total_members = adults + children + infants AND total_members > 0);

-- ========================================
-- TEAM D FOCUS: AUDIT TRAIL SYSTEM
-- ========================================

-- Create audit log table for comprehensive change tracking
CREATE TABLE IF NOT EXISTS guest_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID,
    session_info JSONB,
    change_context VARCHAR(100), -- 'manual', 'import', 'api', etc.
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_couple_id ON guest_audit_log(couple_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON guest_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON guest_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON guest_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON guest_audit_log(user_id);

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := '{}';
    current_user_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Determine old and new data
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Find changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(old_data) old_field
        WHERE old_field.value IS DISTINCT FROM (new_data->old_field.key);
    END IF;
    
    -- Insert audit record
    INSERT INTO guest_audit_log (
        couple_id, table_name, record_id, operation,
        old_values, new_values, changed_fields,
        user_id, change_context
    ) VALUES (
        COALESCE(NEW.couple_id, OLD.couple_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        current_user_id,
        'manual'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to guest-related tables
CREATE TRIGGER audit_guests_trigger
    AFTER INSERT OR UPDATE OR DELETE ON guests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_households_trigger
    AFTER INSERT OR UPDATE OR DELETE ON households
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_dietary_requirements_trigger
    AFTER INSERT OR UPDATE OR DELETE ON dietary_requirements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ========================================
-- TEAM D FOCUS: PERFORMANCE VALIDATION
-- ========================================

-- Function to validate database performance for large guest lists
CREATE OR REPLACE FUNCTION validate_guest_performance(couple_id_param UUID)
RETURNS TABLE(
    test_name TEXT,
    execution_time_ms BIGINT,
    record_count INTEGER,
    performance_rating VARCHAR(10),
    recommendations TEXT
) AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    guest_count INTEGER;
    execution_ms BIGINT;
BEGIN
    -- Get guest count
    SELECT COUNT(*) INTO guest_count FROM guests WHERE couple_id = couple_id_param;
    
    -- Test 1: Basic guest retrieval
    start_time := clock_timestamp();
    PERFORM * FROM guests WHERE couple_id = couple_id_param ORDER BY last_name, first_name;
    end_time := clock_timestamp();
    execution_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Basic Guest Retrieval'::TEXT,
        execution_ms,
        guest_count,
        CASE 
            WHEN execution_ms < 100 THEN 'EXCELLENT'::VARCHAR(10)
            WHEN execution_ms < 500 THEN 'GOOD'::VARCHAR(10)
            WHEN execution_ms < 1000 THEN 'FAIR'::VARCHAR(10)
            ELSE 'POOR'::VARCHAR(10)
        END,
        CASE 
            WHEN execution_ms > 1000 THEN 'Consider adding more specific indexes'
            ELSE 'Performance is acceptable'
        END::TEXT;
    
    -- Test 2: Filtered guest search
    start_time := clock_timestamp();
    PERFORM * FROM guests 
    WHERE couple_id = couple_id_param 
      AND rsvp_status = 'attending' 
      AND category = 'family';
    end_time := clock_timestamp();
    execution_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Filtered Guest Search'::TEXT,
        execution_ms,
        guest_count,
        CASE 
            WHEN execution_ms < 50 THEN 'EXCELLENT'::VARCHAR(10)
            WHEN execution_ms < 200 THEN 'GOOD'::VARCHAR(10)
            WHEN execution_ms < 500 THEN 'FAIR'::VARCHAR(10)
            ELSE 'POOR'::VARCHAR(10)
        END,
        CASE 
            WHEN execution_ms > 500 THEN 'Composite indexes may need optimization'
            ELSE 'Filtering performance is good'
        END::TEXT;
    
    -- Test 3: Statistics calculation
    start_time := clock_timestamp();
    PERFORM * FROM guest_statistics_mv WHERE couple_id = couple_id_param;
    end_time := clock_timestamp();
    execution_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Statistics Retrieval'::TEXT,
        execution_ms,
        guest_count,
        CASE 
            WHEN execution_ms < 10 THEN 'EXCELLENT'::VARCHAR(10)
            WHEN execution_ms < 50 THEN 'GOOD'::VARCHAR(10)
            WHEN execution_ms < 100 THEN 'FAIR'::VARCHAR(10)
            ELSE 'POOR'::VARCHAR(10)
        END,
        CASE 
            WHEN execution_ms > 100 THEN 'Materialized view may need refresh'
            ELSE 'Statistics performance is excellent'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TEAM D FOCUS: CASCADE DELETION OPTIMIZATION
-- ========================================

-- Enhanced cascade deletion with performance optimization
CREATE OR REPLACE FUNCTION cascade_delete_couple_guests(couple_id_param UUID)
RETURNS TABLE(
    deleted_guests INTEGER,
    deleted_households INTEGER,
    deleted_dietary INTEGER,
    deleted_audit_records INTEGER,
    execution_time_ms BIGINT
) AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    guest_del_count INTEGER;
    household_del_count INTEGER;
    dietary_del_count INTEGER;
    audit_del_count INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- Delete in optimal order for performance
    WITH deleted_dietary AS (
        DELETE FROM dietary_requirements 
        WHERE guest_id IN (SELECT id FROM guests WHERE couple_id = couple_id_param)
        RETURNING 1
    )
    SELECT COUNT(*) INTO dietary_del_count FROM deleted_dietary;
    
    WITH deleted_guests AS (
        DELETE FROM guests WHERE couple_id = couple_id_param
        RETURNING 1
    )
    SELECT COUNT(*) INTO guest_del_count FROM deleted_guests;
    
    WITH deleted_households AS (
        DELETE FROM households WHERE couple_id = couple_id_param
        RETURNING 1
    )
    SELECT COUNT(*) INTO household_del_count FROM deleted_households;
    
    WITH deleted_audit AS (
        DELETE FROM guest_audit_log WHERE couple_id = couple_id_param
        RETURNING 1
    )
    SELECT COUNT(*) INTO audit_del_count FROM deleted_audit;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        guest_del_count,
        household_del_count,
        dietary_del_count,
        audit_del_count,
        (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ENABLE RLS AND FINAL OPTIMIZATIONS
-- ========================================

-- Enable RLS on audit table
ALTER TABLE guest_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit log
CREATE POLICY "Users can view audit logs for their couples"
  ON guest_audit_log FOR SELECT
  USING (
    couple_id IN (
      SELECT c.id FROM clients c
      JOIN user_profiles up ON c.organization_id = up.organization_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Auto-refresh materialized view on guest changes
CREATE OR REPLACE FUNCTION trigger_refresh_guest_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh statistics asynchronously for better performance
    PERFORM pg_notify('refresh_statistics', NEW.couple_id::TEXT);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_stats_on_guest_change
    AFTER INSERT OR UPDATE OR DELETE ON guests
    FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_guest_statistics();

-- Final performance hint: Update table statistics
ANALYZE guests;
ANALYZE households;
ANALYZE dietary_requirements;
ANALYZE guest_import_sessions;
ANALYZE guest_audit_log;

-- Comments for migration tracking
COMMENT ON TABLE guest_audit_log IS 'Comprehensive audit trail for guest changes - WS-151 Team D';
COMMENT ON MATERIALIZED VIEW guest_statistics_mv IS 'Optimized real-time guest statistics - WS-151 Team D';
COMMENT ON FUNCTION bulk_import_guests_optimized IS 'High-performance bulk import for 1000+ guests - WS-151 Team D';
COMMENT ON FUNCTION validate_guest_performance IS 'Performance validation tool for large guest lists - WS-151 Team D';