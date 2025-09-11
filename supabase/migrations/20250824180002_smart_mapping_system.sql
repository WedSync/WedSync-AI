-- WS-123: Smart Mapping System Migration
-- AI-Powered Intelligent Field Mapping for Data Processing
-- This migration creates all tables and functions needed for the smart mapping system

-- ===============================================
-- SMART MAPPING SESSIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS smart_mapping_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_schema_id TEXT NOT NULL,
    mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
    accuracy DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    processing_time INTEGER,
    options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- MAPPING TEMPLATES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS mapping_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    source_schema TEXT NOT NULL,
    target_schema TEXT NOT NULL,
    mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
    accuracy DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique template names per user
    UNIQUE(name, created_by)
);

-- ===============================================
-- MAPPING LEARNING PATTERNS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS mapping_learning_patterns (
    pattern_key TEXT PRIMARY KEY,
    pattern_type TEXT NOT NULL,
    source_pattern TEXT NOT NULL,
    target_pattern TEXT NOT NULL,
    success_rate DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    sample_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- MAPPING CORRECTIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS mapping_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapping_id TEXT NOT NULL,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_field_id TEXT NOT NULL,
    correct_target_field_id TEXT NOT NULL,
    feedback TEXT NOT NULL CHECK (feedback IN ('correct', 'incorrect', 'partial')),
    user_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- MAPPING CORRECTION DETAILS TABLE (For Analytics)
-- ===============================================
CREATE TABLE IF NOT EXISTS mapping_correction_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapping_id TEXT NOT NULL,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_field_id TEXT NOT NULL,
    correct_target_field_id TEXT NOT NULL,
    feedback TEXT NOT NULL,
    user_confidence DECIMAL(3,2) NOT NULL,
    notes TEXT,
    session_timestamp TIMESTAMPTZ NOT NULL,
    impact_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- APPLIED MAPPINGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS applied_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
    success_rate DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    applied_data JSONB DEFAULT '{}'::jsonb,
    validation_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- TEMPLATE METADATA TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS template_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES mapping_templates(id) ON DELETE CASCADE,
    category TEXT,
    quality_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    reusability_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    source_session_id UUID,
    source_document_id UUID,
    privacy_preserved BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- TEMPLATE TAGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS template_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES mapping_templates(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, tag)
);

-- ===============================================
-- TEMPLATE USAGE STATS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS template_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES mapping_templates(id) ON DELETE CASCADE,
    last_used TIMESTAMPTZ,
    success_rate DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_applications INTEGER NOT NULL DEFAULT 0,
    quality_score DECIMAL(5,2) DEFAULT 0.00,
    reusability_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- TEMPLATE RATINGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES mapping_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, user_id)
);

-- ===============================================
-- USER MAPPING CONTRIBUTIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS user_mapping_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_corrections INTEGER NOT NULL DEFAULT 0,
    contribution_score INTEGER NOT NULL DEFAULT 0,
    last_contribution TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- USER ACHIEVEMENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_type)
);

-- ===============================================
-- MAPPING IMPROVEMENT SUGGESTIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS mapping_improvement_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('pattern', 'semantic', 'context', 'validation')),
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    affected_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'implemented', 'rejected')),
    implementation_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- CLIENT DATA EXTRACTED TABLE (For Applied Mappings)
-- ===============================================
CREATE TABLE IF NOT EXISTS client_data_extracted (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_document_id UUID NOT NULL,
    bride_name TEXT,
    groom_name TEXT,
    wedding_date DATE,
    venue_name TEXT,
    venue_address TEXT,
    primary_email TEXT,
    primary_phone TEXT,
    guest_count INTEGER,
    budget DECIMAL(12,2),
    ceremony_time TIME,
    extraction_accuracy DECIMAL(3,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Smart mapping sessions indexes
CREATE INDEX IF NOT EXISTS idx_smart_mapping_sessions_document_id ON smart_mapping_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_smart_mapping_sessions_user_id ON smart_mapping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_mapping_sessions_created_at ON smart_mapping_sessions(created_at);

-- Mapping templates indexes
CREATE INDEX IF NOT EXISTS idx_mapping_templates_target_schema ON mapping_templates(target_schema);
CREATE INDEX IF NOT EXISTS idx_mapping_templates_is_public ON mapping_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_mapping_templates_created_by ON mapping_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_mapping_templates_usage_count ON mapping_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_mapping_templates_accuracy ON mapping_templates(accuracy DESC);

-- Learning patterns indexes
CREATE INDEX IF NOT EXISTS idx_mapping_learning_patterns_pattern_type ON mapping_learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_mapping_learning_patterns_success_rate ON mapping_learning_patterns(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_mapping_learning_patterns_sample_size ON mapping_learning_patterns(sample_size DESC);

-- Corrections indexes
CREATE INDEX IF NOT EXISTS idx_mapping_corrections_user_id ON mapping_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_mapping_corrections_document_id ON mapping_corrections(document_id);
CREATE INDEX IF NOT EXISTS idx_mapping_corrections_feedback ON mapping_corrections(feedback);
CREATE INDEX IF NOT EXISTS idx_mapping_corrections_created_at ON mapping_corrections(created_at);

-- Applied mappings indexes
CREATE INDEX IF NOT EXISTS idx_applied_mappings_document_id ON applied_mappings(document_id);
CREATE INDEX IF NOT EXISTS idx_applied_mappings_user_id ON applied_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_applied_mappings_success_rate ON applied_mappings(success_rate DESC);

-- Template usage stats indexes
CREATE INDEX IF NOT EXISTS idx_template_usage_stats_template_id ON template_usage_stats(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_stats_last_used ON template_usage_stats(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_stats_total_applications ON template_usage_stats(total_applications DESC);

-- Client data extracted indexes
CREATE INDEX IF NOT EXISTS idx_client_data_extracted_user_id ON client_data_extracted(user_id);
CREATE INDEX IF NOT EXISTS idx_client_data_extracted_source_document ON client_data_extracted(source_document_id);
CREATE INDEX IF NOT EXISTS idx_client_data_extracted_wedding_date ON client_data_extracted(wedding_date);

-- ===============================================
-- ROW LEVEL SECURITY POLICIES
-- ===============================================

-- Smart mapping sessions - users can only access their own sessions
ALTER TABLE smart_mapping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mapping sessions"
ON smart_mapping_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own mapping sessions"
ON smart_mapping_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mapping sessions"
ON smart_mapping_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Mapping templates - users can see public templates and their own private ones
ALTER TABLE mapping_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates and their own private templates"
ON mapping_templates FOR SELECT
TO authenticated
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
ON mapping_templates FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
ON mapping_templates FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
ON mapping_templates FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Mapping corrections - users can only access their own corrections
ALTER TABLE mapping_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mapping corrections"
ON mapping_corrections FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own mapping corrections"
ON mapping_corrections FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Applied mappings - users can only access their own applied mappings
ALTER TABLE applied_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applied mappings"
ON applied_mappings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own applied mappings"
ON applied_mappings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Client data extracted - users can only access their own extracted data
ALTER TABLE client_data_extracted ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extracted client data"
ON client_data_extracted FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own extracted client data"
ON client_data_extracted FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own extracted client data"
ON client_data_extracted FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Template ratings - users can rate any public template
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all template ratings"
ON template_ratings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can rate templates"
ON template_ratings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings"
ON template_ratings FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- User contributions and achievements - users can only see their own
ALTER TABLE user_mapping_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contributions"
ON user_mapping_contributions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own contributions"
ON user_mapping_contributions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own contributions"
ON user_mapping_contributions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
ON user_achievements FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can earn achievements"
ON user_achievements FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ===============================================
-- FUNCTIONS FOR SMART MAPPING OPERATIONS
-- ===============================================

-- Function to increment user template count
CREATE OR REPLACE FUNCTION increment_user_template_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_mapping_contributions (user_id, total_corrections, contribution_score)
    VALUES (user_id, 0, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET updated_at = NOW();
END;
$$;

-- Function to calculate mapping accuracy
CREATE OR REPLACE FUNCTION calculate_mapping_accuracy(mappings JSONB)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    total_confidence DECIMAL := 0;
    mapping_count INTEGER := 0;
    mapping JSONB;
BEGIN
    -- Sum up all confidence scores
    FOR mapping IN SELECT * FROM jsonb_array_elements(mappings)
    LOOP
        total_confidence := total_confidence + (mapping->>'confidence')::DECIMAL;
        mapping_count := mapping_count + 1;
    END LOOP;
    
    -- Return average confidence
    IF mapping_count > 0 THEN
        RETURN ROUND(total_confidence / mapping_count, 2);
    ELSE
        RETURN 0.00;
    END IF;
END;
$$;

-- Function to get mapping statistics
CREATE OR REPLACE FUNCTION get_mapping_statistics(user_id_param UUID DEFAULT NULL)
RETURNS TABLE(
    total_sessions INTEGER,
    total_templates INTEGER,
    total_corrections INTEGER,
    avg_accuracy DECIMAL(3,2),
    most_used_template_id UUID,
    most_used_template_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Filter by user if specified, otherwise global stats
    IF user_id_param IS NOT NULL THEN
        SELECT 
            COUNT(DISTINCT sms.id)::INTEGER,
            COUNT(DISTINCT mt.id)::INTEGER,
            COUNT(DISTINCT mc.id)::INTEGER,
            ROUND(AVG(sms.accuracy), 2),
            mt_most_used.id,
            mt_most_used.name
        INTO total_sessions, total_templates, total_corrections, avg_accuracy, most_used_template_id, most_used_template_name
        FROM smart_mapping_sessions sms
        FULL OUTER JOIN mapping_templates mt ON mt.created_by = user_id_param
        FULL OUTER JOIN mapping_corrections mc ON mc.user_id = user_id_param
        LEFT JOIN mapping_templates mt_most_used ON mt_most_used.created_by = user_id_param
        WHERE sms.user_id = user_id_param OR sms.user_id IS NULL
        ORDER BY mt_most_used.usage_count DESC
        LIMIT 1;
    ELSE
        SELECT 
            COUNT(DISTINCT sms.id)::INTEGER,
            COUNT(DISTINCT mt.id)::INTEGER,
            COUNT(DISTINCT mc.id)::INTEGER,
            ROUND(AVG(sms.accuracy), 2),
            mt_most_used.id,
            mt_most_used.name
        INTO total_sessions, total_templates, total_corrections, avg_accuracy, most_used_template_id, most_used_template_name
        FROM smart_mapping_sessions sms
        FULL OUTER JOIN mapping_templates mt ON true
        FULL OUTER JOIN mapping_corrections mc ON true
        LEFT JOIN mapping_templates mt_most_used ON true
        ORDER BY mt_most_used.usage_count DESC
        LIMIT 1;
    END IF;
    
    RETURN NEXT;
END;
$$;

-- Function to update template usage stats
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update usage count and last used timestamp
    UPDATE template_usage_stats 
    SET 
        total_applications = total_applications + 1,
        last_used = NOW(),
        updated_at = NOW()
    WHERE template_id = NEW.template_id;
    
    -- Insert if not exists
    INSERT INTO template_usage_stats (template_id, total_applications, last_used)
    VALUES (NEW.template_id, 1, NOW())
    ON CONFLICT (template_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- ===============================================
-- TRIGGERS
-- ===============================================

-- Trigger to update template usage when applied
CREATE TRIGGER update_template_usage_on_apply
    AFTER INSERT ON applied_mappings
    FOR EACH ROW
    WHEN (NEW.mappings ? 'templateId')
    EXECUTE FUNCTION update_template_usage_stats();

-- Trigger to update mapping templates updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mapping_templates_updated_at
    BEFORE UPDATE ON mapping_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_mapping_sessions_updated_at
    BEFORE UPDATE ON smart_mapping_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mapping_learning_patterns_updated_at
    BEFORE UPDATE ON mapping_learning_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- VIEWS FOR ANALYTICS
-- ===============================================

-- View for template performance analytics
CREATE OR REPLACE VIEW template_performance_analytics AS
SELECT 
    mt.id,
    mt.name,
    mt.accuracy,
    mt.usage_count,
    mt.is_public,
    mt.created_by,
    mt.created_at,
    COALESCE(tus.success_rate, mt.accuracy) as current_success_rate,
    COALESCE(tus.total_applications, 0) as total_applications,
    COALESCE(tus.last_used, mt.created_at) as last_used,
    COALESCE(tm.quality_score, 0) as quality_score,
    COALESCE(tm.reusability_score, 0) as reusability_score,
    COALESCE(AVG(tr.rating), 0) as average_rating,
    COUNT(tr.rating) as rating_count
FROM mapping_templates mt
LEFT JOIN template_usage_stats tus ON mt.id = tus.template_id
LEFT JOIN template_metadata tm ON mt.id = tm.template_id
LEFT JOIN template_ratings tr ON mt.id = tr.template_id
GROUP BY mt.id, mt.name, mt.accuracy, mt.usage_count, mt.is_public, 
         mt.created_by, mt.created_at, tus.success_rate, tus.total_applications,
         tus.last_used, tm.quality_score, tm.reusability_score;

-- View for user mapping statistics
CREATE OR REPLACE VIEW user_mapping_statistics AS
SELECT 
    u.id as user_id,
    u.email,
    COALESCE(umc.total_corrections, 0) as total_corrections,
    COALESCE(umc.contribution_score, 0) as contribution_score,
    COALESCE(umc.last_contribution, u.created_at) as last_contribution,
    COUNT(DISTINCT mt.id) as templates_created,
    COUNT(DISTINCT sms.id) as mapping_sessions,
    ROUND(AVG(sms.accuracy), 2) as avg_mapping_accuracy,
    COUNT(DISTINCT ua.achievement_type) as achievements_earned
FROM auth.users u
LEFT JOIN user_mapping_contributions umc ON u.id = umc.user_id
LEFT JOIN mapping_templates mt ON u.id = mt.created_by
LEFT JOIN smart_mapping_sessions sms ON u.id = sms.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
GROUP BY u.id, u.email, umc.total_corrections, umc.contribution_score, umc.last_contribution;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON smart_mapping_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mapping_templates TO authenticated;
GRANT SELECT, INSERT ON mapping_corrections TO authenticated;
GRANT SELECT, INSERT ON applied_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON client_data_extracted TO authenticated;
GRANT SELECT, INSERT ON template_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_mapping_contributions TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT, INSERT ON mapping_improvement_suggestions TO authenticated;

-- Grant access to views
GRANT SELECT ON template_performance_analytics TO authenticated;
GRANT SELECT ON user_mapping_statistics TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION increment_user_template_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_mapping_accuracy(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mapping_statistics(UUID) TO authenticated;

-- ===============================================
-- SAMPLE DATA FOR TESTING
-- ===============================================

-- Insert default wedding schema patterns
INSERT INTO mapping_learning_patterns (pattern_key, pattern_type, source_pattern, target_pattern, success_rate, sample_size)
VALUES 
    ('bride_bride_name', 'semantic', 'bride', 'bride_name', 0.95, 50),
    ('groom_groom_name', 'semantic', 'groom', 'groom_name', 0.95, 50),
    ('email_primary_email', 'pattern', 'email', 'primary_email', 0.90, 30),
    ('phone_primary_phone', 'pattern', 'phone', 'primary_phone', 0.90, 30),
    ('date_wedding_date', 'pattern', 'date', 'wedding_date', 0.85, 25),
    ('venue_venue_name', 'semantic', 'venue', 'venue_name', 0.80, 20),
    ('budget_budget', 'semantic', 'budget', 'budget', 0.85, 15)
ON CONFLICT (pattern_key) DO NOTHING;

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON TABLE smart_mapping_sessions IS 'Records of AI-powered field mapping sessions with results and accuracy metrics';
COMMENT ON TABLE mapping_templates IS 'Reusable mapping templates created from successful mapping sessions';
COMMENT ON TABLE mapping_learning_patterns IS 'Machine learning patterns that improve mapping accuracy over time';
COMMENT ON TABLE mapping_corrections IS 'User feedback and corrections to improve the AI mapping system';
COMMENT ON TABLE applied_mappings IS 'Final applied mappings that created structured data from documents';
COMMENT ON TABLE template_metadata IS 'Additional metadata and analytics for mapping templates';
COMMENT ON TABLE template_usage_stats IS 'Usage statistics and performance metrics for mapping templates';
COMMENT ON TABLE template_ratings IS 'User ratings and reviews for public mapping templates';
COMMENT ON TABLE user_mapping_contributions IS 'Tracks user contributions to the mapping learning system';
COMMENT ON TABLE user_achievements IS 'Achievement system for users who contribute to mapping improvements';
COMMENT ON TABLE client_data_extracted IS 'Structured client data extracted from documents using smart mapping';

COMMENT ON FUNCTION calculate_mapping_accuracy(JSONB) IS 'Calculates average confidence score for a set of mappings';
COMMENT ON FUNCTION get_mapping_statistics(UUID) IS 'Returns comprehensive mapping statistics for a user or globally';
COMMENT ON FUNCTION increment_user_template_count(UUID) IS 'Increments user template creation count for contribution tracking';

COMMENT ON VIEW template_performance_analytics IS 'Comprehensive analytics view for mapping template performance and usage';
COMMENT ON VIEW user_mapping_statistics IS 'User statistics view showing mapping activity and contributions';