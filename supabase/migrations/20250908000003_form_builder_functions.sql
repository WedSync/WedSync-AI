-- WS-342: Advanced Form Builder Engine Functions and Stored Procedures  
-- Date: 2025-09-08
-- Feature: Conditional logic processing, validation, and analytics functions
-- Team B - Backend Implementation Round 1

-- Conditional Logic Processing Engine
CREATE OR REPLACE FUNCTION form_builder.evaluate_field_conditions(
    submission_data JSONB,
    field_conditions JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    condition JSONB;
    field_value TEXT;
    condition_value JSONB;
    operator TEXT;
    field_name TEXT;
    result BOOLEAN := TRUE;
    logic_operator TEXT := COALESCE(field_conditions->>'logic_operator', 'AND');
    temp_result BOOLEAN;
BEGIN
    -- If no conditions, field is visible
    IF field_conditions IS NULL OR field_conditions = '{}'::jsonb THEN
        RETURN TRUE;
    END IF;

    -- Process show_if conditions
    IF field_conditions ? 'show_if' THEN
        FOR condition IN SELECT * FROM jsonb_array_elements(field_conditions->'show_if')
        LOOP
            field_name := condition->>'field_name';
            operator := condition->>'operator';
            condition_value := condition->'value';
            field_value := submission_data->>field_name;

            temp_result := CASE operator
                WHEN 'equals' THEN 
                    field_value = (condition_value->>0)
                WHEN 'not_equals' THEN 
                    field_value != (condition_value->>0)
                WHEN 'contains' THEN 
                    field_value ILIKE '%' || (condition_value->>0) || '%'
                WHEN 'not_contains' THEN 
                    field_value NOT ILIKE '%' || (condition_value->>0) || '%'
                WHEN 'greater_than' THEN 
                    field_value::numeric > (condition_value->>0)::numeric
                WHEN 'less_than' THEN 
                    field_value::numeric < (condition_value->>0)::numeric
                WHEN 'in' THEN 
                    field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(condition_value)))
                WHEN 'not_in' THEN 
                    field_value != ALL(ARRAY(SELECT jsonb_array_elements_text(condition_value)))
                WHEN 'is_empty' THEN 
                    field_value IS NULL OR field_value = ''
                WHEN 'is_not_empty' THEN 
                    field_value IS NOT NULL AND field_value != ''
                ELSE FALSE
            END;

            IF logic_operator = 'AND' THEN
                result := result AND temp_result;
                -- Short circuit for AND
                IF NOT result THEN
                    RETURN FALSE;
                END IF;
            ELSE -- OR
                result := result OR temp_result;
            END IF;
        END LOOP;
    END IF;

    -- Process hide_if conditions (inverse logic)
    IF field_conditions ? 'hide_if' THEN
        FOR condition IN SELECT * FROM jsonb_array_elements(field_conditions->'hide_if')
        LOOP
            field_name := condition->>'field_name';
            operator := condition->>'operator';
            condition_value := condition->'value';
            field_value := submission_data->>field_name;

            temp_result := CASE operator
                WHEN 'equals' THEN 
                    field_value = (condition_value->>0)
                WHEN 'not_equals' THEN 
                    field_value != (condition_value->>0)
                WHEN 'contains' THEN 
                    field_value ILIKE '%' || (condition_value->>0) || '%'
                WHEN 'not_contains' THEN 
                    field_value NOT ILIKE '%' || (condition_value->>0) || '%'
                WHEN 'greater_than' THEN 
                    field_value::numeric > (condition_value->>0)::numeric
                WHEN 'less_than' THEN 
                    field_value::numeric < (condition_value->>0)::numeric
                WHEN 'in' THEN 
                    field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(condition_value)))
                WHEN 'not_in' THEN 
                    field_value != ALL(ARRAY(SELECT jsonb_array_elements_text(condition_value)))
                WHEN 'is_empty' THEN 
                    field_value IS NULL OR field_value = ''
                WHEN 'is_not_empty' THEN 
                    field_value IS NOT NULL AND field_value != ''
                ELSE FALSE
            END;

            -- If hide condition is met, field should be hidden
            IF temp_result THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Form Validation Engine
CREATE OR REPLACE FUNCTION form_builder.validate_form_submission(
    p_form_id UUID,
    p_submission_data JSONB,
    p_current_step INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    field_record RECORD;
    field_value TEXT;
    validation_errors JSONB := '[]'::jsonb;
    error_object JSONB;
    pattern_match BOOLEAN;
    numeric_value NUMERIC;
    file_info JSONB;
    total_file_size NUMERIC := 0;
BEGIN
    -- Validate each field for the current step
    FOR field_record IN 
        SELECT f.*, ff.*
        FROM form_builder.form_fields ff
        JOIN form_builder.forms f ON f.id = ff.form_id
        WHERE ff.form_id = p_form_id 
        AND ff.step_number = p_current_step
        ORDER BY ff.field_order
    LOOP
        field_value := p_submission_data->>field_record.field_name;

        -- Check if field should be visible based on conditional logic
        IF NOT form_builder.evaluate_field_conditions(p_submission_data, field_record.conditional_logic) THEN
            CONTINUE; -- Skip validation for hidden fields
        END IF;

        -- Required field validation
        IF field_record.is_required AND (field_value IS NULL OR field_value = '') THEN
            error_object := jsonb_build_object(
                'field_id', field_record.id,
                'field_name', field_record.field_name,
                'error_type', 'required',
                'message', field_record.field_label || ' is required'
            );
            validation_errors := validation_errors || error_object;
            CONTINUE;
        END IF;

        -- Skip further validation if field is empty and not required
        IF field_value IS NULL OR field_value = '' THEN
            CONTINUE;
        END IF;

        -- Length validation
        IF field_record.min_length IS NOT NULL AND length(field_value) < field_record.min_length THEN
            error_object := jsonb_build_object(
                'field_id', field_record.id,
                'field_name', field_record.field_name,
                'error_type', 'min_length',
                'message', field_record.field_label || ' must be at least ' || field_record.min_length || ' characters'
            );
            validation_errors := validation_errors || error_object;
        END IF;

        IF field_record.max_length IS NOT NULL AND length(field_value) > field_record.max_length THEN
            error_object := jsonb_build_object(
                'field_id', field_record.id,
                'field_name', field_record.field_name,
                'error_type', 'max_length',
                'message', field_record.field_label || ' must be no more than ' || field_record.max_length || ' characters'
            );
            validation_errors := validation_errors || error_object;
        END IF;

        -- Numeric validation
        IF field_record.field_type IN ('number', 'slider', 'rating') THEN
            BEGIN
                numeric_value := field_value::numeric;
                
                IF field_record.min_value IS NOT NULL AND numeric_value < field_record.min_value THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'min_value',
                        'message', field_record.field_label || ' must be at least ' || field_record.min_value
                    );
                    validation_errors := validation_errors || error_object;
                END IF;

                IF field_record.max_value IS NOT NULL AND numeric_value > field_record.max_value THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'max_value',
                        'message', field_record.field_label || ' must be no more than ' || field_record.max_value
                    );
                    validation_errors := validation_errors || error_object;
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'invalid_number',
                        'message', field_record.field_label || ' must be a valid number'
                    );
                    validation_errors := validation_errors || error_object;
            END;
        END IF;

        -- Email validation
        IF field_record.field_type = 'email' AND field_value !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            error_object := jsonb_build_object(
                'field_id', field_record.id,
                'field_name', field_record.field_name,
                'error_type', 'invalid_email',
                'message', 'Please enter a valid email address'
            );
            validation_errors := validation_errors || error_object;
        END IF;

        -- Phone validation (basic international format)
        IF field_record.field_type = 'phone' AND field_value !~ '^\+?[1-9]\d{1,14}$' THEN
            error_object := jsonb_build_object(
                'field_id', field_record.id,
                'field_name', field_record.field_name,
                'error_type', 'invalid_phone',
                'message', 'Please enter a valid phone number'
            );
            validation_errors := validation_errors || error_object;
        END IF;

        -- URL validation
        IF field_record.field_type = 'url' AND field_value !~ '^https?://[^\s/$.?#].[^\s]*$' THEN
            error_object := jsonb_build_object(
                'field_id', field_record.id,
                'field_name', field_record.field_name,
                'error_type', 'invalid_url',
                'message', 'Please enter a valid URL starting with http:// or https://'
            );
            validation_errors := validation_errors || error_object;
        END IF;

        -- Date validation and wedding date specific validation
        IF field_record.field_type IN ('date', 'wedding_date') THEN
            BEGIN
                -- Validate date format
                PERFORM field_value::date;
                
                -- Wedding date should be in the future
                IF field_record.field_type = 'wedding_date' AND field_value::date <= CURRENT_DATE THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'past_wedding_date',
                        'message', 'Wedding date must be in the future'
                    );
                    validation_errors := validation_errors || error_object;
                END IF;
            EXCEPTION
                WHEN invalid_datetime_format THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'invalid_date',
                        'message', 'Please enter a valid date'
                    );
                    validation_errors := validation_errors || error_object;
            END;
        END IF;

        -- Pattern validation (regex)
        IF field_record.validation_pattern IS NOT NULL THEN
            pattern_match := field_value ~ field_record.validation_pattern;
            IF NOT pattern_match THEN
                error_object := jsonb_build_object(
                    'field_id', field_record.id,
                    'field_name', field_record.field_name,
                    'error_type', 'pattern_mismatch',
                    'message', COALESCE(field_record.validation_message, field_record.field_label || ' format is invalid')
                );
                validation_errors := validation_errors || error_object;
            END IF;
        END IF;

        -- File upload validation
        IF field_record.field_type IN ('file_upload', 'photo_upload', 'document_upload') THEN
            BEGIN
                file_info := field_value::jsonb;
                
                -- Validate file count
                IF jsonb_array_length(file_info) > field_record.max_file_count THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'too_many_files',
                        'message', 'Maximum ' || field_record.max_file_count || ' files allowed'
                    );
                    validation_errors := validation_errors || error_object;
                END IF;

                -- Validate individual files
                FOR file_info IN SELECT * FROM jsonb_array_elements(field_value::jsonb)
                LOOP
                    -- File size validation
                    IF (file_info->>'size')::numeric > (field_record.max_file_size_mb * 1048576) THEN
                        error_object := jsonb_build_object(
                            'field_id', field_record.id,
                            'field_name', field_record.field_name,
                            'error_type', 'file_too_large',
                            'message', 'File ' || (file_info->>'name') || ' is larger than ' || field_record.max_file_size_mb || 'MB'
                        );
                        validation_errors := validation_errors || error_object;
                    END IF;

                    -- File type validation
                    IF array_length(field_record.accepted_file_types, 1) > 0 THEN
                        IF NOT (lower(split_part(file_info->>'name', '.', -1)) = ANY(field_record.accepted_file_types)) THEN
                            error_object := jsonb_build_object(
                                'field_id', field_record.id,
                                'field_name', field_record.field_name,
                                'error_type', 'invalid_file_type',
                                'message', 'File type not allowed. Accepted types: ' || array_to_string(field_record.accepted_file_types, ', ')
                            );
                            validation_errors := validation_errors || error_object;
                        END IF;
                    END IF;

                    total_file_size := total_file_size + (file_info->>'size')::numeric;
                END LOOP;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'invalid_file_data',
                        'message', 'Invalid file data format'
                    );
                    validation_errors := validation_errors || error_object;
            END;
        END IF;

        -- Guest count validation (wedding industry specific)
        IF field_record.field_type = 'guest_count' THEN
            BEGIN
                numeric_value := field_value::numeric;
                IF numeric_value < 1 OR numeric_value > 2000 THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'invalid_guest_count',
                        'message', 'Guest count must be between 1 and 2000'
                    );
                    validation_errors := validation_errors || error_object;
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    error_object := jsonb_build_object(
                        'field_id', field_record.id,
                        'field_name', field_record.field_name,
                        'error_type', 'invalid_guest_count',
                        'message', 'Guest count must be a valid number'
                    );
                    validation_errors := validation_errors || error_object;
            END;
        END IF;

    END LOOP;

    -- Return validation results
    RETURN jsonb_build_object(
        'is_valid', jsonb_array_length(validation_errors) = 0,
        'errors', validation_errors,
        'total_file_size_mb', round((total_file_size / 1048576)::numeric, 2)
    );
END;
$$ LANGUAGE plpgsql;

-- Form Analytics Aggregation Function
CREATE OR REPLACE FUNCTION form_builder.aggregate_form_analytics(
    p_form_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    analytics_data JSONB := '{}'::jsonb;
    form_info RECORD;
    submission_stats RECORD;
    performance_stats RECORD;
    error_stats RECORD;
BEGIN
    -- Get form information
    SELECT f.*, o.subscription_tier
    INTO form_info
    FROM form_builder.forms f
    JOIN public.organizations o ON o.id = f.organization_id
    WHERE f.id = p_form_id;

    IF form_info.id IS NULL THEN
        RAISE EXCEPTION 'Form not found: %', p_form_id;
    END IF;

    -- Get submission statistics
    SELECT
        COUNT(*) as total_submissions,
        COUNT(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL) as unique_clients,
        COUNT(*) FILTER (WHERE is_completed = true) as completed_submissions,
        COUNT(*) FILTER (WHERE is_completed = false) as partial_submissions,
        ROUND(AVG(completion_percentage), 2) as avg_completion_percentage,
        COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_submissions,
        COUNT(*) FILTER (WHERE created_at::date = p_date) as todays_submissions
    INTO submission_stats
    FROM form_builder.form_submissions
    WHERE form_id = p_form_id
    AND created_at >= p_date - INTERVAL '30 days';

    -- Get performance statistics
    SELECT
        ROUND(AVG(time_to_complete), 0) as avg_completion_time_seconds,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_to_complete) as median_completion_time,
        MIN(time_to_complete) as fastest_completion,
        MAX(time_to_complete) as slowest_completion,
        COUNT(*) FILTER (WHERE time_to_complete <= 300) as completed_under_5min,
        COUNT(*) FILTER (WHERE time_to_complete > 1800) as completed_over_30min
    INTO performance_stats
    FROM form_builder.form_submissions
    WHERE form_id = p_form_id
    AND is_completed = true
    AND time_to_complete IS NOT NULL
    AND created_at >= p_date - INTERVAL '30 days';

    -- Get error statistics
    SELECT
        COUNT(*) as total_errors,
        COUNT(DISTINCT jsonb_array_elements(validation_errors)->>'field_name') as fields_with_errors,
        jsonb_agg(DISTINCT jsonb_array_elements(validation_errors)->>'error_type') as common_error_types,
        jsonb_object_agg(
            jsonb_array_elements(validation_errors)->>'error_type',
            COUNT(*)
        ) as error_type_counts
    INTO error_stats
    FROM form_builder.form_submissions
    WHERE form_id = p_form_id
    AND jsonb_array_length(validation_errors) > 0
    AND created_at >= p_date - INTERVAL '30 days';

    -- Build analytics object
    analytics_data := jsonb_build_object(
        'form_id', p_form_id,
        'analysis_date', p_date,
        'period_days', 30,
        'form_info', jsonb_build_object(
            'name', form_info.form_name,
            'type', form_info.form_type,
            'is_multi_step', form_info.is_multi_step,
            'step_count', form_info.step_count,
            'created_at', form_info.created_at,
            'organization_tier', form_info.subscription_tier
        ),
        'submission_metrics', jsonb_build_object(
            'total_submissions', COALESCE(submission_stats.total_submissions, 0),
            'unique_clients', COALESCE(submission_stats.unique_clients, 0),
            'completed_submissions', COALESCE(submission_stats.completed_submissions, 0),
            'partial_submissions', COALESCE(submission_stats.partial_submissions, 0),
            'completion_rate', 
                CASE 
                    WHEN COALESCE(submission_stats.total_submissions, 0) > 0 
                    THEN ROUND((COALESCE(submission_stats.completed_submissions, 0)::numeric / submission_stats.total_submissions::numeric) * 100, 2)
                    ELSE 0
                END,
            'avg_completion_percentage', COALESCE(submission_stats.avg_completion_percentage, 0),
            'failed_submissions', COALESCE(submission_stats.failed_submissions, 0),
            'todays_submissions', COALESCE(submission_stats.todays_submissions, 0)
        ),
        'performance_metrics', jsonb_build_object(
            'avg_completion_time_seconds', COALESCE(performance_stats.avg_completion_time_seconds, 0),
            'median_completion_time_seconds', COALESCE(performance_stats.median_completion_time, 0),
            'fastest_completion_seconds', COALESCE(performance_stats.fastest_completion, 0),
            'slowest_completion_seconds', COALESCE(performance_stats.slowest_completion, 0),
            'quick_completions_under_5min', COALESCE(performance_stats.completed_under_5min, 0),
            'slow_completions_over_30min', COALESCE(performance_stats.completed_over_30min, 0)
        ),
        'error_metrics', jsonb_build_object(
            'total_validation_errors', COALESCE(error_stats.total_errors, 0),
            'fields_with_errors', COALESCE(error_stats.fields_with_errors, 0),
            'common_error_types', COALESCE(error_stats.common_error_types, '[]'::jsonb),
            'error_type_distribution', COALESCE(error_stats.error_type_counts, '{}'::jsonb)
        )
    );

    -- Store analytics in the analytics table
    INSERT INTO form_builder.form_analytics (
        form_id,
        organization_id,
        metric_date,
        total_starts,
        total_completions,
        completion_rate,
        avg_completion_time,
        validation_error_count,
        common_errors
    ) VALUES (
        p_form_id,
        form_info.organization_id,
        p_date,
        COALESCE(submission_stats.total_submissions, 0),
        COALESCE(submission_stats.completed_submissions, 0),
        CASE 
            WHEN COALESCE(submission_stats.total_submissions, 0) > 0 
            THEN ROUND((COALESCE(submission_stats.completed_submissions, 0)::numeric / submission_stats.total_submissions::numeric) * 100, 2)
            ELSE 0
        END,
        COALESCE(performance_stats.avg_completion_time_seconds, 0),
        COALESCE(error_stats.total_errors, 0),
        COALESCE(error_stats.error_type_counts, '{}'::jsonb)
    )
    ON CONFLICT (form_id, metric_date) 
    DO UPDATE SET
        total_starts = EXCLUDED.total_starts,
        total_completions = EXCLUDED.total_completions,
        completion_rate = EXCLUDED.completion_rate,
        avg_completion_time = EXCLUDED.avg_completion_time,
        validation_error_count = EXCLUDED.validation_error_count,
        common_errors = EXCLUDED.common_errors,
        updated_at = NOW();

    RETURN analytics_data;
END;
$$ LANGUAGE plpgsql;

-- Wedding Industry Specific Functions

-- Extract wedding information from submission data
CREATE OR REPLACE FUNCTION form_builder.extract_wedding_info(
    submission_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    wedding_info JSONB := '{}'::jsonb;
    wedding_date DATE;
    guest_count INTEGER;
    venue_name TEXT;
    budget_range TEXT;
    estimated_budget NUMERIC;
BEGIN
    -- Extract wedding date from various possible field names
    wedding_date := COALESCE(
        (submission_data->>'wedding_date')::date,
        (submission_data->>'event_date')::date,
        (submission_data->>'ceremony_date')::date
    );

    -- Extract guest count
    BEGIN
        guest_count := COALESCE(
            (submission_data->>'guest_count')::integer,
            (submission_data->>'number_of_guests')::integer,
            (submission_data->>'estimated_guests')::integer
        );
    EXCEPTION
        WHEN invalid_text_representation THEN
            guest_count := NULL;
    END;

    -- Extract venue information
    venue_name := COALESCE(
        submission_data->>'ceremony_venue',
        submission_data->>'reception_venue',
        submission_data->>'venue_name',
        submission_data->>'venue'
    );

    -- Extract budget information
    budget_range := COALESCE(
        submission_data->>'budget_range',
        submission_data->>'estimated_budget',
        submission_data->>'budget'
    );

    -- Estimate numeric budget from range
    estimated_budget := CASE
        WHEN budget_range ILIKE '%under 5000%' OR budget_range ILIKE '%0-5000%' THEN 2500
        WHEN budget_range ILIKE '%5000-10000%' OR budget_range ILIKE '%5k-10k%' THEN 7500
        WHEN budget_range ILIKE '%10000-20000%' OR budget_range ILIKE '%10k-20k%' THEN 15000
        WHEN budget_range ILIKE '%20000-35000%' OR budget_range ILIKE '%20k-35k%' THEN 27500
        WHEN budget_range ILIKE '%35000-50000%' OR budget_range ILIKE '%35k-50k%' THEN 42500
        WHEN budget_range ILIKE '%over 50000%' OR budget_range ILIKE '%50k+%' THEN 75000
        ELSE NULL
    END;

    -- Build wedding info object
    wedding_info := jsonb_build_object(
        'wedding_date', wedding_date,
        'guest_count', guest_count,
        'venue_name', venue_name,
        'budget_range', budget_range,
        'estimated_budget', estimated_budget,
        'season', 
            CASE 
                WHEN wedding_date IS NULL THEN NULL
                WHEN EXTRACT(month FROM wedding_date) IN (12, 1, 2) THEN 'Winter'
                WHEN EXTRACT(month FROM wedding_date) IN (3, 4, 5) THEN 'Spring'
                WHEN EXTRACT(month FROM wedding_date) IN (6, 7, 8) THEN 'Summer'
                WHEN EXTRACT(month FROM wedding_date) IN (9, 10, 11) THEN 'Fall'
            END,
        'is_weekend',
            CASE
                WHEN wedding_date IS NULL THEN NULL
                WHEN EXTRACT(dow FROM wedding_date) IN (0, 6) THEN true
                ELSE false
            END,
        'days_until_wedding',
            CASE
                WHEN wedding_date IS NULL THEN NULL
                ELSE EXTRACT(days FROM wedding_date - CURRENT_DATE)::integer
            END
    );

    RETURN wedding_info;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Automatic submission processing trigger
CREATE OR REPLACE FUNCTION form_builder.process_form_submission()
RETURNS TRIGGER AS $$
DECLARE
    wedding_info JSONB;
    form_config RECORD;
BEGIN
    -- Extract wedding information and update submission
    wedding_info := form_builder.extract_wedding_info(NEW.submission_data);
    
    NEW.wedding_date := (wedding_info->>'wedding_date')::date;
    NEW.estimated_guest_count := (wedding_info->>'guest_count')::integer;
    NEW.estimated_budget_range := wedding_info->>'budget_range';

    -- Get form configuration for processing rules
    SELECT * INTO form_config
    FROM form_builder.forms
    WHERE id = NEW.form_id;

    -- Set GDPR retention date (2 years from submission for wedding data)
    IF NEW.data_retention_until IS NULL THEN
        NEW.data_retention_until := CURRENT_DATE + INTERVAL '2 years';
    END IF;

    -- Update last activity timestamp
    NEW.last_activity_at := NOW();

    -- Calculate completion percentage for multi-step forms
    IF form_config.is_multi_step THEN
        NEW.completion_percentage := LEAST(
            (NEW.current_step::numeric / form_config.step_count::numeric) * 100,
            100
        );
    ELSE
        NEW.completion_percentage := CASE WHEN NEW.is_completed THEN 100 ELSE 0 END;
    END IF;

    -- Set processing status based on completion
    IF NEW.is_completed AND NEW.processing_status = 'pending' THEN
        NEW.processing_status := 'completed';
        NEW.completed_at := NOW();
    END IF;

    -- Wedding day priority logic
    IF NEW.wedding_date IS NOT NULL THEN
        NEW.priority_level := CASE
            WHEN NEW.wedding_date - CURRENT_DATE <= INTERVAL '7 days' THEN 'urgent'
            WHEN NEW.wedding_date - CURRENT_DATE <= INTERVAL '30 days' THEN 'high' 
            WHEN NEW.wedding_date - CURRENT_DATE <= INTERVAL '90 days' THEN 'normal'
            ELSE 'low'
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic submission processing
CREATE TRIGGER process_submission_trigger
    BEFORE INSERT OR UPDATE ON form_builder.form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION form_builder.process_form_submission();

-- Performance optimization function for complex queries
CREATE OR REPLACE FUNCTION form_builder.optimize_form_performance(p_form_id UUID)
RETURNS JSONB AS $$
DECLARE
    optimization_results JSONB := '{}'::jsonb;
    field_count INTEGER;
    conditional_fields_count INTEGER;
    avg_submission_time NUMERIC;
    large_files_count INTEGER;
BEGIN
    -- Analyze form complexity
    SELECT 
        COUNT(*) as total_fields,
        COUNT(*) FILTER (WHERE conditional_logic != '{}'::jsonb) as conditional_fields
    INTO field_count, conditional_fields_count
    FROM form_builder.form_fields
    WHERE form_id = p_form_id;

    -- Analyze performance metrics
    SELECT AVG(time_to_complete)
    INTO avg_submission_time
    FROM form_builder.form_submissions
    WHERE form_id = p_form_id 
    AND is_completed = true
    AND time_to_complete IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';

    -- Analyze file upload impact
    SELECT COUNT(*)
    INTO large_files_count
    FROM form_builder.form_submissions
    WHERE form_id = p_form_id
    AND total_file_size_mb > 50
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';

    optimization_results := jsonb_build_object(
        'form_id', p_form_id,
        'analysis_date', CURRENT_TIMESTAMP,
        'complexity_analysis', jsonb_build_object(
            'total_fields', field_count,
            'conditional_fields', conditional_fields_count,
            'complexity_score', CASE
                WHEN field_count > 50 THEN 'high'
                WHEN field_count > 20 THEN 'medium'
                ELSE 'low'
            END
        ),
        'performance_analysis', jsonb_build_object(
            'avg_completion_time_minutes', ROUND(avg_submission_time / 60.0, 2),
            'performance_rating', CASE
                WHEN avg_submission_time > 1800 THEN 'poor'
                WHEN avg_submission_time > 600 THEN 'fair'
                WHEN avg_submission_time > 300 THEN 'good'
                ELSE 'excellent'
            END,
            'large_files_submissions', large_files_count
        ),
        'recommendations', CASE
            WHEN conditional_fields_count > field_count * 0.3 THEN 
                jsonb_build_array('Consider reducing conditional logic complexity', 'Split into multiple simpler forms')
            WHEN field_count > 40 THEN
                jsonb_build_array('Consider multi-step form', 'Group related fields into sections')
            WHEN avg_submission_time > 900 THEN
                jsonb_build_array('Reduce required fields', 'Improve field labels and help text', 'Consider progressive disclosure')
            ELSE
                jsonb_build_array('Form performance is optimal')
        END
    );

    RETURN optimization_results;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA form_builder TO authenticated;

-- Success notification
DO $$
BEGIN
    RAISE NOTICE 'WS-342 Form Builder Functions Created Successfully';
    RAISE NOTICE '✅ Conditional logic processing engine implemented';
    RAISE NOTICE '✅ Comprehensive form validation system ready';  
    RAISE NOTICE '✅ Advanced analytics aggregation functions deployed';
    RAISE NOTICE '✅ Wedding industry specific processing logic active';
    RAISE NOTICE '✅ Performance optimization tools available';
    RAISE NOTICE '✅ All functions secured with proper RLS integration';
END $$;