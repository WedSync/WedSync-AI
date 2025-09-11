-- Migration: Guest Management Functions (WS-056)
-- Date: 2025-08-22
-- Features: Advanced functions for guest list management

-- Function for smart household grouping
CREATE OR REPLACE FUNCTION create_household_from_guests(
    guest_ids UUID[], 
    household_name VARCHAR(200)
)
RETURNS UUID AS $$
DECLARE
    new_household_id UUID;
    guest_couple_id UUID;
    primary_guest_id UUID;
    guest_address JSONB;
    adult_count INTEGER;
    child_count INTEGER;
    infant_count INTEGER;
BEGIN
    -- Get couple_id and primary contact from first guest
    SELECT couple_id, id, address INTO guest_couple_id, primary_guest_id, guest_address
    FROM guests WHERE id = guest_ids[1];
    
    -- Count age groups
    SELECT 
        COUNT(CASE WHEN age_group = 'adult' THEN 1 END),
        COUNT(CASE WHEN age_group = 'child' THEN 1 END),
        COUNT(CASE WHEN age_group = 'infant' THEN 1 END)
    INTO adult_count, child_count, infant_count
    FROM guests WHERE id = ANY(guest_ids);
    
    -- Create household
    INSERT INTO households (
        couple_id, name, primary_contact_id, address,
        total_members, adults, children, infants
    ) VALUES (
        guest_couple_id, household_name, guest_address,
        array_length(guest_ids, 1), adult_count, child_count, infant_count
    ) RETURNING id INTO new_household_id;
    
    -- Update guests to reference household
    UPDATE guests SET household_id = new_household_id WHERE id = ANY(guest_ids);
    
    -- Set primary contact after household is created
    UPDATE households SET primary_contact_id = primary_guest_id WHERE id = new_household_id;
    
    RETURN new_household_id;
END;
$$ LANGUAGE plpgsql;

-- Function for bulk guest operations
CREATE OR REPLACE FUNCTION bulk_update_guests(
    guest_ids UUID[],
    updates JSONB
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE guests SET
            category = COALESCE((updates->>'category')::VARCHAR(20), category),
            side = COALESCE((updates->>'side')::VARCHAR(20), side),
            table_number = COALESCE((updates->>'table_number')::INTEGER, table_number),
            rsvp_status = COALESCE((updates->>'rsvp_status')::VARCHAR(20), rsvp_status),
            tags = COALESCE(
                CASE 
                    WHEN updates->>'tags' IS NOT NULL THEN 
                        (SELECT array_agg(DISTINCT elem) FROM unnest(tags || (updates->>'tags')::TEXT[]) elem)
                    ELSE tags
                END, 
                tags
            ),
            dietary_restrictions = COALESCE(updates->>'dietary_restrictions', dietary_restrictions),
            special_needs = COALESCE(updates->>'special_needs', special_needs),
            helper_role = COALESCE(updates->>'helper_role', helper_role),
            updated_at = NOW()
        WHERE id = ANY(guest_ids)
        RETURNING 1
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function for duplicate detection with fuzzy matching
CREATE OR REPLACE FUNCTION find_duplicate_guests(
    couple_id_param UUID,
    email_param VARCHAR(255) DEFAULT NULL,
    first_name_param VARCHAR(100) DEFAULT NULL,
    last_name_param VARCHAR(100) DEFAULT NULL,
    phone_param VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    guest_id UUID,
    match_score INTEGER,
    match_fields TEXT[],
    guest_name TEXT,
    guest_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as guest_id,
        (
            CASE WHEN g.email = email_param AND email_param IS NOT NULL THEN 40 ELSE 0 END +
            CASE WHEN g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL THEN 20 ELSE 0 END +
            CASE WHEN g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL THEN 20 ELSE 0 END +
            CASE WHEN g.phone = phone_param AND phone_param IS NOT NULL THEN 20 ELSE 0 END +
            -- Fuzzy matching bonuses
            CASE WHEN similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8 THEN 10 ELSE 0 END +
            CASE WHEN similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8 THEN 10 ELSE 0 END
        ) as match_score,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN g.email = email_param AND email_param IS NOT NULL THEN 'email' END,
            CASE WHEN g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL THEN 'first_name' END,
            CASE WHEN g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL THEN 'last_name' END,
            CASE WHEN g.phone = phone_param AND phone_param IS NOT NULL THEN 'phone' END,
            CASE WHEN similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8 THEN 'fuzzy_first_name' END,
            CASE WHEN similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8 THEN 'fuzzy_last_name' END
        ], NULL)::TEXT[] as match_fields,
        (g.first_name || ' ' || g.last_name) as guest_name,
        g.email as guest_email
    FROM guests g
    WHERE g.couple_id = couple_id_param
    AND (
        (g.email = email_param AND email_param IS NOT NULL) OR
        (g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL) OR
        (g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL) OR
        (g.phone = phone_param AND phone_param IS NOT NULL) OR
        (similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8) OR
        (similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8)
    )
    HAVING (
        CASE WHEN g.email = email_param AND email_param IS NOT NULL THEN 40 ELSE 0 END +
        CASE WHEN g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN g.phone = phone_param AND phone_param IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8 THEN 10 ELSE 0 END +
        CASE WHEN similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8 THEN 10 ELSE 0 END
    ) >= 20
    ORDER BY match_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function for intelligent household name generation
CREATE OR REPLACE FUNCTION generate_household_name(guest_ids UUID[])
RETURNS VARCHAR(200) AS $$
DECLARE
    guest_names TEXT[];
    last_names TEXT[];
    household_name VARCHAR(200);
BEGIN
    -- Get all guest names and last names
    SELECT 
        array_agg(first_name ORDER BY first_name),
        array_agg(DISTINCT last_name ORDER BY last_name)
    INTO guest_names, last_names
    FROM guests 
    WHERE id = ANY(guest_ids);
    
    -- Generate household name based on patterns
    IF array_length(last_names, 1) = 1 THEN
        -- Single family name
        IF array_length(guest_names, 1) <= 2 THEN
            household_name := array_to_string(guest_names, ' & ') || ' ' || last_names[1];
        ELSE
            household_name := guest_names[1] || ' ' || last_names[1] || ' Family';
        END IF;
    ELSE
        -- Multiple family names
        household_name := guest_names[1] || ' ' || last_names[1] || ' & ' || guest_names[2] || ' ' || last_names[2];
    END IF;
    
    RETURN COALESCE(household_name, 'Household');
END;
$$ LANGUAGE plpgsql;

-- Function for advanced guest search with filters
CREATE OR REPLACE FUNCTION search_guests(
    couple_id_param UUID,
    search_query TEXT DEFAULT NULL,
    category_filter VARCHAR(20) DEFAULT NULL,
    rsvp_filter VARCHAR(20) DEFAULT NULL,
    age_group_filter VARCHAR(20) DEFAULT NULL,
    side_filter VARCHAR(20) DEFAULT NULL,
    has_dietary_restrictions BOOLEAN DEFAULT NULL,
    has_plus_one BOOLEAN DEFAULT NULL,
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    guest_id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    category VARCHAR(20),
    rsvp_status VARCHAR(20),
    age_group VARCHAR(20),
    side VARCHAR(20),
    plus_one BOOLEAN,
    plus_one_name VARCHAR(100),
    table_number INTEGER,
    household_id UUID,
    household_name VARCHAR(200),
    tags TEXT[],
    dietary_restrictions TEXT,
    special_needs TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as guest_id,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        g.category,
        g.rsvp_status,
        g.age_group,
        g.side,
        g.plus_one,
        g.plus_one_name,
        g.table_number,
        g.household_id,
        h.name as household_name,
        g.tags,
        g.dietary_restrictions,
        g.special_needs,
        g.created_at,
        CASE 
            WHEN search_query IS NOT NULL THEN
                ts_rank(
                    to_tsvector('english', g.first_name || ' ' || g.last_name || ' ' || COALESCE(g.email, '') || ' ' || COALESCE(g.notes, '')),
                    plainto_tsquery('english', search_query)
                )
            ELSE 0
        END as rank
    FROM guests g
    LEFT JOIN households h ON g.household_id = h.id
    WHERE g.couple_id = couple_id_param
        AND (category_filter IS NULL OR g.category = category_filter)
        AND (rsvp_filter IS NULL OR g.rsvp_status = rsvp_filter)
        AND (age_group_filter IS NULL OR g.age_group = age_group_filter)
        AND (side_filter IS NULL OR g.side = side_filter)
        AND (has_dietary_restrictions IS NULL OR (g.dietary_restrictions IS NOT NULL AND g.dietary_restrictions != '') = has_dietary_restrictions)
        AND (has_plus_one IS NULL OR g.plus_one = has_plus_one)
        AND (
            search_query IS NULL OR
            to_tsvector('english', g.first_name || ' ' || g.last_name || ' ' || COALESCE(g.email, '') || ' ' || COALESCE(g.notes, ''))
            @@ plainto_tsquery('english', search_query)
        )
    ORDER BY 
        CASE WHEN search_query IS NOT NULL THEN rank END DESC,
        g.last_name, g.first_name
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Function for guest statistics and analytics
CREATE OR REPLACE FUNCTION get_guest_analytics(couple_id_param UUID)
RETURNS TABLE(
    total_guests INTEGER,
    adults INTEGER,
    children INTEGER,
    infants INTEGER,
    attending INTEGER,
    declined INTEGER,
    pending INTEGER,
    maybe INTEGER,
    family INTEGER,
    friends INTEGER,
    work INTEGER,
    other INTEGER,
    partner1_side INTEGER,
    partner2_side INTEGER,
    mutual_side INTEGER,
    with_plus_ones INTEGER,
    with_dietary_restrictions INTEGER,
    with_special_needs INTEGER,
    households INTEGER,
    avg_household_size NUMERIC,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(g.id)::INTEGER as total_guests,
        COUNT(CASE WHEN g.age_group = 'adult' THEN 1 END)::INTEGER as adults,
        COUNT(CASE WHEN g.age_group = 'child' THEN 1 END)::INTEGER as children,
        COUNT(CASE WHEN g.age_group = 'infant' THEN 1 END)::INTEGER as infants,
        COUNT(CASE WHEN g.rsvp_status = 'attending' THEN 1 END)::INTEGER as attending,
        COUNT(CASE WHEN g.rsvp_status = 'declined' THEN 1 END)::INTEGER as declined,
        COUNT(CASE WHEN g.rsvp_status = 'pending' THEN 1 END)::INTEGER as pending,
        COUNT(CASE WHEN g.rsvp_status = 'maybe' THEN 1 END)::INTEGER as maybe,
        COUNT(CASE WHEN g.category = 'family' THEN 1 END)::INTEGER as family,
        COUNT(CASE WHEN g.category = 'friends' THEN 1 END)::INTEGER as friends,
        COUNT(CASE WHEN g.category = 'work' THEN 1 END)::INTEGER as work,
        COUNT(CASE WHEN g.category = 'other' THEN 1 END)::INTEGER as other,
        COUNT(CASE WHEN g.side = 'partner1' THEN 1 END)::INTEGER as partner1_side,
        COUNT(CASE WHEN g.side = 'partner2' THEN 1 END)::INTEGER as partner2_side,
        COUNT(CASE WHEN g.side = 'mutual' THEN 1 END)::INTEGER as mutual_side,
        COUNT(CASE WHEN g.plus_one = true THEN 1 END)::INTEGER as with_plus_ones,
        COUNT(CASE WHEN g.dietary_restrictions IS NOT NULL AND g.dietary_restrictions != '' THEN 1 END)::INTEGER as with_dietary_restrictions,
        COUNT(CASE WHEN g.special_needs IS NOT NULL AND g.special_needs != '' THEN 1 END)::INTEGER as with_special_needs,
        COUNT(DISTINCT g.household_id)::INTEGER as households,
        ROUND(COUNT(g.id)::NUMERIC / NULLIF(COUNT(DISTINCT g.household_id), 0), 2) as avg_household_size,
        MAX(g.updated_at) as last_updated
    FROM guests g
    WHERE g.couple_id = couple_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback import session
CREATE OR REPLACE FUNCTION rollback_import_session(session_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    couple_id_val UUID;
BEGIN
    -- Get couple_id for verification
    SELECT couple_id INTO couple_id_val FROM guest_import_sessions WHERE id = session_id_param;
    
    IF couple_id_val IS NULL THEN
        RAISE EXCEPTION 'Import session not found';
    END IF;
    
    -- Delete guests created in this import session
    WITH deleted AS (
        DELETE FROM guests 
        WHERE id IN (
            SELECT guest_id FROM guest_import_history 
            WHERE import_session_id = session_id_param 
            AND action = 'created'
            AND guest_id IS NOT NULL
        )
        RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Update import session status
    UPDATE guest_import_sessions 
    SET status = 'cancelled', completed_at = NOW()
    WHERE id = session_id_param;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for fuzzy matching if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;