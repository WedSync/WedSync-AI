-- Migration: 20250828090001_ws_162_163_164_team_a_round2_enhancements.sql
-- Description: WS-162/163/164 Round 2 Team A Features - Budget Analytics, Receipt OCR, Realtime Scheduling
-- Author: Team A - Round 2 Implementation 
-- Date: 2025-08-28
-- Feature IDs: WS-162, WS-163, WS-164

BEGIN;

-- =====================================================
-- TEAM A ROUND 2: ENHANCED FEATURES
-- =====================================================

-- 1. Receipt Processing Enhancement
-- =====================================================

-- Add OCR processing metadata to budget transactions
ALTER TABLE budget_transactions 
ADD COLUMN IF NOT EXISTS ocr_metadata JSONB DEFAULT '{}';

-- Add receipt image storage references
ALTER TABLE budget_transactions 
ADD COLUMN IF NOT EXISTS receipt_image_path TEXT;

-- Add receipt processing status
ALTER TABLE budget_transactions 
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'manual' 
    CHECK (processing_status IN ('manual', 'ocr_pending', 'ocr_processed', 'ocr_failed', 'verified'));

-- Add confidence score for automated categorization
ALTER TABLE budget_transactions 
ADD COLUMN IF NOT EXISTS categorization_confidence INTEGER DEFAULT 100
    CHECK (categorization_confidence BETWEEN 0 AND 100);

-- Create receipt processing logs table
CREATE TABLE IF NOT EXISTS receipt_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES budget_transactions(id) ON DELETE CASCADE,
    wedding_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    processing_status VARCHAR(20) DEFAULT 'pending',
    ocr_results JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    CONSTRAINT receipt_logs_status_valid CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed', 'timeout'
    ))
);

-- 2. Helper Schedules Enhancement
-- =====================================================

-- Add sort_order column if not exists (for drag-and-drop reordering)
ALTER TABLE helper_schedules 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add duration for better scheduling
ALTER TABLE helper_schedules 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60
    CHECK (duration_minutes > 0 AND duration_minutes <= 1440); -- Max 24 hours

-- Add real-time collaboration fields
ALTER TABLE helper_schedules 
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

ALTER TABLE helper_schedules 
ADD COLUMN IF NOT EXISTS modification_notes TEXT;

-- Create index for efficient reordering
CREATE INDEX IF NOT EXISTS idx_helper_schedules_sort_order 
ON helper_schedules(wedding_id, sort_order, scheduled_start);

-- 3. Budget Analytics Cache Tables
-- =====================================================

-- Create analytics cache for better performance
CREATE TABLE IF NOT EXISTS budget_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL,
    cache_key VARCHAR(100) NOT NULL,
    cache_data JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(wedding_id, cache_key)
);

-- Create index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_budget_analytics_cache_lookup 
ON budget_analytics_cache(wedding_id, cache_key, expires_at);

-- Create forecast data storage
CREATE TABLE IF NOT EXISTS budget_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    forecast_method VARCHAR(20) DEFAULT 'linear' 
        CHECK (forecast_method IN ('linear', 'exponential', 'seasonal')),
    horizon_months INTEGER DEFAULT 12 
        CHECK (horizon_months BETWEEN 1 AND 24),
    forecast_data JSONB NOT NULL DEFAULT '{}',
    confidence_score INTEGER DEFAULT 75 
        CHECK (confidence_score BETWEEN 0 AND 100),
    projected_total DECIMAL(12,2),
    variance_amount DECIMAL(12,2),
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Create index for forecast retrieval
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_lookup 
ON budget_forecasts(wedding_id, created_at DESC, valid_until);

-- 4. Enhanced Budget Categories
-- =====================================================

-- Add analytics metadata to budget categories
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS analytics_metadata JSONB DEFAULT '{}';

-- Add trend tracking
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS spending_trend VARCHAR(20) DEFAULT 'stable'
    CHECK (spending_trend IN ('increasing', 'decreasing', 'stable', 'volatile'));

-- Add performance metrics
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 100
    CHECK (performance_score BETWEEN 0 AND 100);

-- 5. Security and RLS Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE receipt_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS policies for receipt processing logs
CREATE POLICY "Users can view their receipt processing logs" ON receipt_processing_logs
FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() OR
    wedding_id IN (
        SELECT wedding_id FROM wedding_team_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their receipt processing logs" ON receipt_processing_logs
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- RLS policies for budget analytics cache
CREATE POLICY "Users can access wedding analytics cache" ON budget_analytics_cache
FOR ALL TO authenticated 
USING (
    wedding_id IN (
        SELECT wedding_id FROM wedding_team_members 
        WHERE user_id = auth.uid()
    )
);

-- RLS policies for budget forecasts
CREATE POLICY "Users can manage wedding budget forecasts" ON budget_forecasts
FOR ALL TO authenticated 
USING (
    user_id = auth.uid() OR
    wedding_id IN (
        SELECT wedding_id FROM wedding_team_members 
        WHERE user_id = auth.uid()
    )
);

-- 6. Analytics Functions
-- =====================================================

-- Function to calculate budget analytics
CREATE OR REPLACE FUNCTION calculate_budget_analytics(
    p_wedding_id UUID,
    p_time_range VARCHAR DEFAULT '30d'
) RETURNS JSONB AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_analytics JSONB;
    v_categories JSONB;
    v_trends JSONB;
BEGIN
    -- Calculate date range
    CASE p_time_range
        WHEN '7d' THEN v_start_date := NOW() - INTERVAL '7 days';
        WHEN '30d' THEN v_start_date := NOW() - INTERVAL '30 days';
        WHEN '90d' THEN v_start_date := NOW() - INTERVAL '90 days';
        ELSE v_start_date := '2020-01-01'::TIMESTAMPTZ;
    END CASE;
    
    -- Get category breakdown
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', name,
            'amount', COALESCE(spent_amount, 0),
            'budgeted', COALESCE(budgeted_amount, 0),
            'percentage', CASE 
                WHEN COALESCE(budgeted_amount, 0) > 0 
                THEN ROUND((COALESCE(spent_amount, 0) / budgeted_amount) * 100)
                ELSE 0 
            END,
            'color', COALESCE(color, '#8884d8')
        )
    ) INTO v_categories
    FROM budget_categories 
    WHERE wedding_id = p_wedding_id 
        AND is_active = true
        AND COALESCE(spent_amount, 0) > 0;
    
    -- Build analytics object
    v_analytics := jsonb_build_object(
        'categoryBreakdown', COALESCE(v_categories, '[]'::jsonb),
        'timeRange', p_time_range,
        'generatedAt', NOW(),
        'summary', jsonb_build_object(
            'totalCategories', (
                SELECT COUNT(*) FROM budget_categories 
                WHERE wedding_id = p_wedding_id AND is_active = true
            ),
            'categoriesWithSpending', (
                SELECT COUNT(*) FROM budget_categories 
                WHERE wedding_id = p_wedding_id 
                    AND is_active = true 
                    AND COALESCE(spent_amount, 0) > 0
            )
        )
    );
    
    RETURN v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate analytics cache
CREATE OR REPLACE FUNCTION invalidate_budget_cache(p_wedding_id UUID) RETURNS VOID AS $$
BEGIN
    DELETE FROM budget_analytics_cache 
    WHERE wedding_id = p_wedding_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Triggers for Cache Invalidation
-- =====================================================

-- Function to trigger cache invalidation
CREATE OR REPLACE FUNCTION trigger_cache_invalidation() RETURNS TRIGGER AS $$
BEGIN
    -- Invalidate cache when budget data changes
    IF TG_TABLE_NAME IN ('budget_categories', 'budget_transactions') THEN
        PERFORM invalidate_budget_cache(COALESCE(NEW.wedding_id, OLD.wedding_id));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS budget_categories_cache_invalidation ON budget_categories;
CREATE TRIGGER budget_categories_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON budget_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_cache_invalidation();

DROP TRIGGER IF EXISTS budget_transactions_cache_invalidation ON budget_transactions;
CREATE TRIGGER budget_transactions_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON budget_transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_cache_invalidation();

-- 8. Performance Indexes
-- =====================================================

-- Index for receipt processing queries
CREATE INDEX IF NOT EXISTS idx_receipt_processing_lookup 
ON receipt_processing_logs(wedding_id, processing_status, created_at DESC);

-- Index for transaction OCR metadata searches
CREATE INDEX IF NOT EXISTS idx_transactions_ocr_metadata 
ON budget_transactions USING GIN(ocr_metadata) WHERE processing_status = 'ocr_processed';

-- Index for analytics time-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_analytics_date 
ON budget_transactions(wedding_id, transaction_date DESC, created_at DESC);

-- Index for category performance tracking
CREATE INDEX IF NOT EXISTS idx_categories_performance 
ON budget_categories(wedding_id, performance_score DESC, spending_trend);

-- 9. Helper Schedule Functions
-- =====================================================

-- Function to reorder schedule items
CREATE OR REPLACE FUNCTION reorder_helper_schedule(
    p_schedule_id UUID,
    p_new_order INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_wedding_id UUID;
    v_current_order INTEGER;
BEGIN
    -- Get current order and wedding_id
    SELECT sort_order, wedding_id INTO v_current_order, v_wedding_id
    FROM helper_schedules 
    WHERE id = p_schedule_id;
    
    IF v_wedding_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update sort orders for affected items
    IF p_new_order > v_current_order THEN
        -- Moving down: shift items up
        UPDATE helper_schedules 
        SET sort_order = sort_order - 1
        WHERE wedding_id = v_wedding_id 
            AND sort_order > v_current_order 
            AND sort_order <= p_new_order;
    ELSE
        -- Moving up: shift items down
        UPDATE helper_schedules 
        SET sort_order = sort_order + 1
        WHERE wedding_id = v_wedding_id 
            AND sort_order >= p_new_order 
            AND sort_order < v_current_order;
    END IF;
    
    -- Update the moved item
    UPDATE helper_schedules 
    SET sort_order = p_new_order, updated_at = NOW()
    WHERE id = p_schedule_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Data Quality and Constraints
-- =====================================================

-- Add constraint to ensure helper schedules don't overlap for same helper
CREATE OR REPLACE FUNCTION check_schedule_overlap() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM helper_schedules 
        WHERE helper_user_id = NEW.helper_user_id 
            AND wedding_id = NEW.wedding_id
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
            AND status NOT IN ('CANCELLED', 'COMPLETED')
            AND (
                (NEW.scheduled_start, NEW.scheduled_end) OVERLAPS 
                (scheduled_start, scheduled_end)
            )
    ) THEN
        RAISE EXCEPTION 'Helper already has a conflicting schedule during this time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schedule overlap checking
DROP TRIGGER IF EXISTS check_helper_schedule_overlap ON helper_schedules;
CREATE TRIGGER check_helper_schedule_overlap
    BEFORE INSERT OR UPDATE ON helper_schedules
    FOR EACH ROW EXECUTE FUNCTION check_schedule_overlap();

-- 11. Cleanup and Maintenance
-- =====================================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM budget_analytics_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old receipt processing logs
CREATE OR REPLACE FUNCTION cleanup_old_receipt_logs() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM receipt_processing_logs 
    WHERE created_at < NOW() - INTERVAL '90 days'
        AND processing_status IN ('completed', 'failed');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Performance Monitoring Views
-- =====================================================

-- View for budget analytics performance
CREATE OR REPLACE VIEW budget_analytics_performance AS
SELECT 
    wedding_id,
    COUNT(*) as cache_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
    MAX(created_at) as last_cached,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_cache_duration
FROM budget_analytics_cache 
GROUP BY wedding_id;

-- View for receipt processing metrics
CREATE OR REPLACE VIEW receipt_processing_metrics AS
SELECT 
    wedding_id,
    COUNT(*) as total_receipts,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as successful,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed,
    AVG(processing_time_ms) as avg_processing_time,
    AVG(file_size) as avg_file_size
FROM receipt_processing_logs
GROUP BY wedding_id;

COMMIT;