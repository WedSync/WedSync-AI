-- Migration: 20250822000083_budget_tracking_round2_enhancements.sql
-- Description: WS-083 Round 2 Budget Tracking Enhancements - Real-time calculations, alerts, reporting
-- Author: Team D - Senior Dev
-- Date: 2025-08-22
-- Feature ID: WS-083

BEGIN;

-- =====================================================
-- ROUND 2: BUDGET TRACKING ENHANCEMENTS
-- =====================================================

-- 1. Budget Master Table for Overall Wedding Budget
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    total_budget DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_allocated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_spent DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_remaining DECIMAL(12,2) GENERATED ALWAYS AS (total_budget - total_spent) STORED,
    buffer_amount DECIMAL(12,2) DEFAULT 0.00,
    currency_code VARCHAR(3) DEFAULT 'USD',
    wedding_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT budget_master_total_positive CHECK (total_budget >= 0),
    CONSTRAINT budget_master_allocated_not_exceed CHECK (total_allocated <= total_budget + buffer_amount)
);

-- 2. Budget Alerts Configuration Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
        'overspend', 'threshold_80', 'threshold_90', 'threshold_100',
        'upcoming_payment', 'payment_due', 'budget_review'
    )),
    threshold_percentage INTEGER DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    notification_channels TEXT[] DEFAULT '{"email", "in_app"}',
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT budget_alerts_threshold_valid CHECK (threshold_percentage BETWEEN 0 AND 100)
);

-- 3. Budget Payment Milestones (Integration with Contracts)
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_payment_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    milestone_name VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'scheduled', 'paid', 'overdue', 'cancelled'
    )),
    paid_date DATE,
    payment_method VARCHAR(50),
    confirmation_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT budget_payment_milestones_amount_positive CHECK (amount > 0)
);

-- 4. Budget Reallocation History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_reallocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    to_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    reallocation_date TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT budget_reallocations_amount_positive CHECK (amount > 0),
    CONSTRAINT budget_reallocations_different_categories CHECK (from_category_id != to_category_id)
);

-- 5. Budget Reports Configuration Table
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN (
        'summary', 'detailed', 'category_breakdown', 'vendor_spending',
        'monthly_trend', 'payment_schedule', 'variance_analysis'
    )),
    filters JSONB DEFAULT '{}',
    schedule_frequency VARCHAR(20) CHECK (schedule_frequency IN (
        'daily', 'weekly', 'monthly', 'quarterly', NULL
    )),
    last_generated_at TIMESTAMPTZ,
    export_format VARCHAR(10) DEFAULT 'pdf' CHECK (export_format IN ('pdf', 'csv', 'excel')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Budget Analytics Cache Table (for performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    
    CONSTRAINT budget_analytics_cache_unique UNIQUE(user_id, metric_type)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_budget_master_user_id ON budget_master(user_id);
CREATE INDEX idx_budget_alerts_user_category ON budget_alerts(user_id, category_id);
CREATE INDEX idx_budget_alerts_active ON budget_alerts(is_active, alert_type);
CREATE INDEX idx_budget_payment_milestones_due ON budget_payment_milestones(due_date, payment_status);
CREATE INDEX idx_budget_payment_milestones_user ON budget_payment_milestones(user_id, payment_status);
CREATE INDEX idx_budget_reallocations_user ON budget_reallocations(user_id, reallocation_date DESC);
CREATE INDEX idx_budget_reports_user ON budget_reports(user_id, report_type);
CREATE INDEX idx_budget_analytics_cache_expires ON budget_analytics_cache(expires_at);

-- =====================================================
-- REAL-TIME CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate total budget statistics
CREATE OR REPLACE FUNCTION calculate_budget_totals(p_user_id UUID)
RETURNS TABLE (
    total_budget DECIMAL(12,2),
    total_allocated DECIMAL(12,2),
    total_spent DECIMAL(12,2),
    total_remaining DECIMAL(12,2),
    allocation_percentage DECIMAL(5,2),
    spending_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(bm.total_budget, 0.00) as total_budget,
        COALESCE(SUM(bc.allocated_amount), 0.00) as total_allocated,
        COALESCE(SUM(bc.spent_amount), 0.00) as total_spent,
        COALESCE(bm.total_budget - SUM(bc.spent_amount), 0.00) as total_remaining,
        CASE 
            WHEN bm.total_budget > 0 THEN 
                ROUND((SUM(bc.allocated_amount) / bm.total_budget * 100)::DECIMAL, 2)
            ELSE 0.00
        END as allocation_percentage,
        CASE 
            WHEN bm.total_budget > 0 THEN 
                ROUND((SUM(bc.spent_amount) / bm.total_budget * 100)::DECIMAL, 2)
            ELSE 0.00
        END as spending_percentage
    FROM budget_master bm
    LEFT JOIN budget_categories bc ON bc.user_id = bm.user_id AND bc.is_active = true
    WHERE bm.user_id = p_user_id
    GROUP BY bm.total_budget;
END;
$$ LANGUAGE plpgsql;

-- Function to check and trigger budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    v_percentage DECIMAL(5,2);
    v_alert RECORD;
BEGIN
    -- Calculate spending percentage for the category
    SELECT 
        CASE 
            WHEN allocated_amount > 0 THEN 
                ROUND((spent_amount / allocated_amount * 100)::DECIMAL, 2)
            ELSE 0
        END INTO v_percentage
    FROM budget_categories 
    WHERE id = NEW.category_id;
    
    -- Check for applicable alerts
    FOR v_alert IN 
        SELECT * FROM budget_alerts 
        WHERE category_id = NEW.category_id 
        AND is_active = true
    LOOP
        -- Check if threshold is exceeded
        IF v_percentage >= v_alert.threshold_percentage THEN
            -- Update alert trigger information
            UPDATE budget_alerts 
            SET 
                last_triggered_at = NOW(),
                trigger_count = trigger_count + 1
            WHERE id = v_alert.id;
            
            -- Insert notification (assuming notifications table exists)
            INSERT INTO notifications (
                user_id, 
                type, 
                title, 
                message, 
                data
            ) VALUES (
                NEW.user_id,
                'budget_alert',
                'Budget Alert: ' || v_alert.alert_type,
                'Category spending at ' || v_percentage || '% of allocated budget',
                jsonb_build_object(
                    'category_id', NEW.category_id,
                    'percentage', v_percentage,
                    'alert_type', v_alert.alert_type
                )
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for budget alert checks
CREATE TRIGGER trigger_check_budget_alerts
    AFTER INSERT OR UPDATE ON budget_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'expense')
    EXECUTE FUNCTION check_budget_alerts();

-- Function to reallocate budget between categories
CREATE OR REPLACE FUNCTION reallocate_budget(
    p_user_id UUID,
    p_from_category_id UUID,
    p_to_category_id UUID,
    p_amount DECIMAL(12,2),
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_available DECIMAL(12,2);
BEGIN
    -- Check available amount in source category
    SELECT (allocated_amount - spent_amount) INTO v_available
    FROM budget_categories
    WHERE id = p_from_category_id AND user_id = p_user_id;
    
    IF v_available < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds in source category. Available: %', v_available;
    END IF;
    
    -- Perform reallocation
    UPDATE budget_categories 
    SET allocated_amount = allocated_amount - p_amount
    WHERE id = p_from_category_id;
    
    UPDATE budget_categories 
    SET allocated_amount = allocated_amount + p_amount
    WHERE id = p_to_category_id;
    
    -- Record reallocation history
    INSERT INTO budget_reallocations (
        user_id, from_category_id, to_category_id, amount, reason
    ) VALUES (
        p_user_id, p_from_category_id, p_to_category_id, p_amount, p_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to generate budget summary report
CREATE OR REPLACE FUNCTION generate_budget_summary(p_user_id UUID)
RETURNS TABLE (
    category_name VARCHAR(100),
    allocated DECIMAL(12,2),
    spent DECIMAL(12,2),
    remaining DECIMAL(12,2),
    percentage_used DECIMAL(5,2),
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bc.name as category_name,
        bc.allocated_amount as allocated,
        bc.spent_amount as spent,
        bc.remaining_amount as remaining,
        CASE 
            WHEN bc.allocated_amount > 0 THEN 
                ROUND((bc.spent_amount / bc.allocated_amount * 100)::DECIMAL, 2)
            ELSE 0.00
        END as percentage_used,
        CASE 
            WHEN bc.spent_amount > bc.allocated_amount THEN 'over_budget'
            WHEN bc.spent_amount / NULLIF(bc.allocated_amount, 0) > 0.9 THEN 'warning'
            WHEN bc.spent_amount / NULLIF(bc.allocated_amount, 0) > 0.8 THEN 'caution'
            ELSE 'on_track'
        END::VARCHAR(20) as status
    FROM budget_categories bc
    WHERE bc.user_id = p_user_id
    AND bc.is_active = true
    ORDER BY bc.sort_order, bc.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE budget_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_reallocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Budget Master Policies
CREATE POLICY "Users can manage own budget master" ON budget_master
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Budget Alerts Policies
CREATE POLICY "Users can manage own budget alerts" ON budget_alerts
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Budget Payment Milestones Policies
CREATE POLICY "Users can manage own payment milestones" ON budget_payment_milestones
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Budget Reallocations Policies
CREATE POLICY "Users can view own reallocations" ON budget_reallocations
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Budget Reports Policies
CREATE POLICY "Users can manage own reports" ON budget_reports
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Budget Analytics Cache Policies
CREATE POLICY "Users can access own analytics cache" ON budget_analytics_cache
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- =====================================================
-- DEFAULT DATA & SAMPLE CATEGORIES
-- =====================================================

-- Function to create default budget categories for new users
CREATE OR REPLACE FUNCTION create_default_budget_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default wedding budget categories
    INSERT INTO budget_categories (user_id, organization_id, name, icon, color, sort_order)
    VALUES 
        (NEW.id, NEW.organization_id, 'Venue', 'building', '#8B5CF6', 1),
        (NEW.id, NEW.organization_id, 'Photography & Video', 'camera', '#EC4899', 2),
        (NEW.id, NEW.organization_id, 'Catering', 'utensils', '#F59E0B', 3),
        (NEW.id, NEW.organization_id, 'Flowers & Decor', 'flower', '#10B981', 4),
        (NEW.id, NEW.organization_id, 'Music & Entertainment', 'music', '#3B82F6', 5),
        (NEW.id, NEW.organization_id, 'Attire', 'shirt', '#6366F1', 6),
        (NEW.id, NEW.organization_id, 'Rings & Jewelry', 'gem', '#F43F5E', 7),
        (NEW.id, NEW.organization_id, 'Beauty & Spa', 'sparkles', '#A78BFA', 8),
        (NEW.id, NEW.organization_id, 'Transportation', 'car', '#14B8A6', 9),
        (NEW.id, NEW.organization_id, 'Stationery', 'mail', '#F97316', 10),
        (NEW.id, NEW.organization_id, 'Favors & Gifts', 'gift', '#EF4444', 11),
        (NEW.id, NEW.organization_id, 'Miscellaneous', 'dots-horizontal', '#6B7280', 12);
    
    -- Create budget master record with default $45,000 budget
    INSERT INTO budget_master (user_id, organization_id, total_budget, buffer_amount)
    VALUES (NEW.id, NEW.organization_id, 45000.00, 2000.00);
    
    -- Create default budget alerts
    INSERT INTO budget_alerts (user_id, alert_type, threshold_percentage, is_active)
    VALUES 
        (NEW.id, 'threshold_80', 80, true),
        (NEW.id, 'threshold_90', 90, true),
        (NEW.id, 'overspend', 100, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger would be created on user creation, not in this migration
-- This is just for reference
-- CREATE TRIGGER trigger_create_default_budget
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_default_budget_categories();

COMMIT;