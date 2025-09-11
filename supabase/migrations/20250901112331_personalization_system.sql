-- WS-209: AI Content Personalization System Database Schema
-- Team B - Database migration for personalization system
-- Created: 2025-01-20

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- PERSONALIZATIONS TABLE - Core personalization records
-- ====================================================================

CREATE TABLE IF NOT EXISTS personalizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  batch_id UUID NULL, -- References personalization_batches for batch operations
  original_content TEXT NOT NULL,
  personalized_content TEXT NOT NULL,
  context_type VARCHAR(50) NOT NULL CHECK (context_type IN (
    'email', 'sms', 'proposal', 'contract', 'invoice', 'timeline',
    'checklist', 'questionnaire', 'website', 'social_media'
  )),
  tone VARCHAR(50) NOT NULL CHECK (tone IN (
    'romantic', 'elegant', 'playful', 'sophisticated', 'warm', 'professional',
    'intimate', 'celebratory', 'nostalgic', 'joyful', 'formal', 'casual'
  )),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_time_ms INTEGER NOT NULL CHECK (processing_time_ms >= 0),
  tokens_used INTEGER NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  variables_used JSONB NOT NULL DEFAULT '{}',
  wedding_context JSONB DEFAULT '{}',
  personalization_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for personalizations table
CREATE INDEX idx_personalizations_supplier_id ON personalizations(supplier_id);
CREATE INDEX idx_personalizations_batch_id ON personalizations(batch_id);
CREATE INDEX idx_personalizations_context_type ON personalizations(context_type);
CREATE INDEX idx_personalizations_created_at ON personalizations(created_at);
CREATE INDEX idx_personalizations_confidence_score ON personalizations(confidence_score);

-- ====================================================================
-- PERSONALIZATION_BATCHES TABLE - Batch processing management  
-- ====================================================================

CREATE TABLE IF NOT EXISTS personalization_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  batch_name VARCHAR(200) NOT NULL,
  total_items INTEGER NOT NULL CHECK (total_items > 0),
  processed_items INTEGER NOT NULL DEFAULT 0 CHECK (processed_items >= 0),
  failed_items INTEGER NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'partial_success', 'cancelled'
  )),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  total_tokens INTEGER DEFAULT 0 CHECK (total_tokens >= 0),
  average_confidence DECIMAL(3,2) CHECK (average_confidence >= 0 AND average_confidence <= 1),
  processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for personalization_batches table
CREATE INDEX idx_personalization_batches_supplier_id ON personalization_batches(supplier_id);
CREATE INDEX idx_personalization_batches_status ON personalization_batches(status);
CREATE INDEX idx_personalization_batches_created_at ON personalization_batches(created_at);
CREATE INDEX idx_personalization_batches_priority ON personalization_batches(priority);

-- ====================================================================
-- PERSONALIZATION_PERFORMANCE TABLE - Performance tracking and ML improvement
-- ====================================================================

CREATE TABLE IF NOT EXISTS personalization_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  personalization_id UUID REFERENCES personalizations(id) ON DELETE CASCADE,
  processing_time_ms INTEGER NOT NULL CHECK (processing_time_ms >= 0),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  context_type VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  success BOOLEAN NOT NULL DEFAULT true,
  error_type VARCHAR(100),
  user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5), -- 1-5 star rating
  effectiveness_score DECIMAL(3,2) CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for personalization_performance table
CREATE INDEX idx_personalization_performance_supplier_id ON personalization_performance(supplier_id);
CREATE INDEX idx_personalization_performance_context_type ON personalization_performance(context_type);
CREATE INDEX idx_personalization_performance_created_at ON personalization_performance(created_at);
CREATE INDEX idx_personalization_performance_success ON personalization_performance(success);

-- ====================================================================
-- CONTEXT_PATTERNS TABLE - ML pattern recognition for improved personalization
-- ====================================================================

CREATE TABLE IF NOT EXISTS context_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of the pattern
  pattern_text TEXT NOT NULL,
  context_type VARCHAR(50) NOT NULL,
  wedding_style VARCHAR(50),
  effectiveness_score DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
  usage_count INTEGER NOT NULL DEFAULT 1 CHECK (usage_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for context_patterns table
CREATE INDEX idx_context_patterns_hash ON context_patterns(pattern_hash);
CREATE INDEX idx_context_patterns_context_type ON context_patterns(context_type);
CREATE INDEX idx_context_patterns_effectiveness_score ON context_patterns(effectiveness_score);
CREATE INDEX idx_context_patterns_usage_count ON context_patterns(usage_count);
CREATE INDEX idx_context_patterns_last_used ON context_patterns(last_used);

-- ====================================================================
-- PERSONALIZATION_TEMPLATES TABLE - Reusable personalization templates
-- ====================================================================

CREATE TABLE IF NOT EXISTS personalization_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE, -- NULL for system templates
  template_name VARCHAR(200) NOT NULL,
  template_content TEXT NOT NULL,
  context_type VARCHAR(50) NOT NULL,
  tone VARCHAR(50) NOT NULL,
  wedding_style VARCHAR(50),
  variables JSONB NOT NULL DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  effectiveness_score DECIMAL(3,2) DEFAULT 0.5 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for personalization_templates table
CREATE INDEX idx_personalization_templates_supplier_id ON personalization_templates(supplier_id);
CREATE INDEX idx_personalization_templates_context_type ON personalization_templates(context_type);
CREATE INDEX idx_personalization_templates_tone ON personalization_templates(tone);
CREATE INDEX idx_personalization_templates_is_public ON personalization_templates(is_public);
CREATE INDEX idx_personalization_templates_is_active ON personalization_templates(is_active);
CREATE INDEX idx_personalization_templates_effectiveness_score ON personalization_templates(effectiveness_score);

-- ====================================================================
-- PERSONALIZATION_FEEDBACK TABLE - User feedback for continuous improvement
-- ====================================================================

CREATE TABLE IF NOT EXISTS personalization_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personalization_id UUID NOT NULL REFERENCES personalizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  feedback_text TEXT,
  feedback_type VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (feedback_type IN (
    'general', 'tone', 'accuracy', 'relevance', 'creativity', 'bug_report'
  )),
  would_use_again BOOLEAN,
  suggestions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for personalization_feedback table
CREATE INDEX idx_personalization_feedback_personalization_id ON personalization_feedback(personalization_id);
CREATE INDEX idx_personalization_feedback_supplier_id ON personalization_feedback(supplier_id);
CREATE INDEX idx_personalization_feedback_rating ON personalization_feedback(rating);
CREATE INDEX idx_personalization_feedback_feedback_type ON personalization_feedback(feedback_type);

-- ====================================================================
-- UPDATE TRIGGERS FOR AUTOMATIC TIMESTAMP MANAGEMENT
-- ====================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_personalizations_updated_at
    BEFORE UPDATE ON personalizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalization_batches_updated_at
    BEFORE UPDATE ON personalization_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_patterns_updated_at
    BEFORE UPDATE ON context_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalization_templates_updated_at
    BEFORE UPDATE ON personalization_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_feedback ENABLE ROW LEVEL SECURITY;

-- Personalizations policies
CREATE POLICY "Suppliers can view their own personalizations" ON personalizations
    FOR SELECT USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can insert their own personalizations" ON personalizations
    FOR INSERT WITH CHECK (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can update their own personalizations" ON personalizations
    FOR UPDATE USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- Batch policies
CREATE POLICY "Suppliers can view their own batches" ON personalization_batches
    FOR SELECT USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can insert their own batches" ON personalization_batches
    FOR INSERT WITH CHECK (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can update their own batches" ON personalization_batches
    FOR UPDATE USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- Performance policies
CREATE POLICY "Suppliers can view their own performance data" ON personalization_performance
    FOR SELECT USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can insert their own performance data" ON personalization_performance
    FOR INSERT WITH CHECK (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- Context patterns policies (read-only for suppliers, system managed)
CREATE POLICY "Suppliers can view context patterns" ON context_patterns
    FOR SELECT USING (true);

-- Templates policies
CREATE POLICY "Suppliers can view public and their own templates" ON personalization_templates
    FOR SELECT USING (
        is_public = true OR 
        supplier_id IN (
            SELECT id FROM suppliers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Suppliers can insert their own templates" ON personalization_templates
    FOR INSERT WITH CHECK (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can update their own templates" ON personalization_templates
    FOR UPDATE USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- Feedback policies
CREATE POLICY "Suppliers can view their own feedback" ON personalization_feedback
    FOR SELECT USING (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Suppliers can insert their own feedback" ON personalization_feedback
    FOR INSERT WITH CHECK (supplier_id IN (
        SELECT id FROM suppliers WHERE user_id = auth.uid()
    ));

-- ====================================================================
-- INITIAL DATA SEEDING
-- ====================================================================

-- Insert system-wide personalization templates
INSERT INTO personalization_templates (
    template_name, template_content, context_type, tone, wedding_style, variables, is_public, tags
) VALUES 
(
    'Professional Email Introduction',
    'Dear {couple_names},\n\nCongratulations on your upcoming {wedding_season} wedding! I''m thrilled that you''re considering my {service_type} services for your {wedding_style} celebration at {venue_name}.\n\nI would love to discuss how I can help make your {wedding_date} absolutely perfect.\n\nBest regards,\n{company_name}',
    'email',
    'professional',
    NULL,
    '{"couple_names": "required", "wedding_season": "auto", "service_type": "required", "wedding_style": "auto", "venue_name": "auto", "wedding_date": "auto", "company_name": "required"}',
    true,
    ARRAY['introduction', 'professional', 'wedding', 'inquiry']
),
(
    'Warm Wedding Congratulations',
    'Dear {partner1_name} and {partner2_name},\n\nWhat an exciting time for you both! Your {wedding_style} wedding at {venue_name} sounds absolutely magical.\n\nI can''t wait to be part of your special day and capture all those beautiful {style_adjectives} moments you''re planning.\n\nWith love and excitement,\n{company_name} 💕',
    'email',
    'warm',
    NULL,
    '{"partner1_name": "required", "partner2_name": "required", "wedding_style": "auto", "venue_name": "auto", "style_adjectives": "auto", "company_name": "required"}',
    true,
    ARRAY['congratulations', 'warm', 'personal', 'booking']
),
(
    'Contract Reminder',
    'Hi {couple_names}!\n\nJust a friendly reminder that your contract for {service_details} is ready for review.\n\nYour {wedding_size} {wedding_style} wedding is going to be incredible, and I want to make sure we have everything finalized well before {wedding_date}.\n\nPlease let me know if you have any questions!\n\nBest,\n{company_name}',
    'email',
    'friendly',
    NULL,
    '{"couple_names": "required", "service_details": "required", "wedding_size": "auto", "wedding_style": "auto", "wedding_date": "auto", "company_name": "required"}',
    true,
    ARRAY['reminder', 'contract', 'business', 'deadline']
);

-- ====================================================================
-- PERFORMANCE OPTIMIZATION
-- ====================================================================

-- Create composite indexes for common query patterns
CREATE INDEX idx_personalizations_supplier_context_date ON personalizations(supplier_id, context_type, created_at);
CREATE INDEX idx_performance_supplier_success ON personalization_performance(supplier_id, success, created_at);
CREATE INDEX idx_templates_public_context_tone ON personalization_templates(is_public, context_type, tone) WHERE is_active = true;

-- Add materialized view for analytics (can be refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS personalization_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    context_type,
    tone,
    COUNT(*) as total_personalizations,
    AVG(confidence_score) as avg_confidence,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(tokens_used) as total_tokens,
    COUNT(DISTINCT supplier_id) as unique_suppliers
FROM personalizations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), context_type, tone
ORDER BY date DESC, total_personalizations DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_personalization_analytics_unique ON personalization_analytics(date, context_type, tone);

-- ====================================================================
-- USEFUL FUNCTIONS FOR THE APPLICATION
-- ====================================================================

-- Function to get supplier personalization stats
CREATE OR REPLACE FUNCTION get_supplier_personalization_stats(supplier_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_personalizations', COUNT(*),
        'avg_confidence', ROUND(AVG(confidence_score)::numeric, 2),
        'total_tokens_used', SUM(tokens_used),
        'contexts_used', json_agg(DISTINCT context_type),
        'favorite_tone', (
            SELECT tone 
            FROM personalizations p2 
            WHERE p2.supplier_id = supplier_uuid 
            GROUP BY tone 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ),
        'last_30_days', (
            SELECT COUNT(*) 
            FROM personalizations p3 
            WHERE p3.supplier_id = supplier_uuid 
            AND p3.created_at >= NOW() - INTERVAL '30 days'
        )
    )
    INTO result
    FROM personalizations
    WHERE supplier_id = supplier_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update pattern effectiveness
CREATE OR REPLACE FUNCTION update_pattern_effectiveness(pattern_hash_param VARCHAR(64), success_param BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO context_patterns (pattern_hash, pattern_text, context_type, usage_count, success_count, failure_count)
    VALUES (pattern_hash_param, '', 'unknown', 1, 
            CASE WHEN success_param THEN 1 ELSE 0 END,
            CASE WHEN success_param THEN 0 ELSE 1 END)
    ON CONFLICT (pattern_hash) 
    DO UPDATE SET
        usage_count = context_patterns.usage_count + 1,
        success_count = context_patterns.success_count + CASE WHEN success_param THEN 1 ELSE 0 END,
        failure_count = context_patterns.failure_count + CASE WHEN success_param THEN 0 ELSE 1 END,
        effectiveness_score = CASE 
            WHEN (context_patterns.usage_count + 1) > 0 
            THEN (context_patterns.success_count + CASE WHEN success_param THEN 1 ELSE 0 END)::DECIMAL / (context_patterns.usage_count + 1)
            ELSE 0.5 
        END,
        last_used = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON personalizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON personalization_batches TO authenticated;
GRANT SELECT, INSERT ON personalization_performance TO authenticated;
GRANT SELECT ON context_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON personalization_templates TO authenticated;
GRANT SELECT, INSERT ON personalization_feedback TO authenticated;
GRANT SELECT ON personalization_analytics TO authenticated;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION get_supplier_personalization_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_pattern_effectiveness(VARCHAR(64), BOOLEAN) TO authenticated;

-- ====================================================================
-- MIGRATION COMPLETION
-- ====================================================================

-- Create a record of this migration
INSERT INTO migrations_applied (migration_name, applied_at) 
VALUES ('20250901112331_personalization_system', NOW())
ON CONFLICT (migration_name) DO NOTHING;