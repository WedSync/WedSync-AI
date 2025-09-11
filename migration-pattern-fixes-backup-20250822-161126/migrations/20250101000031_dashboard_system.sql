-- Dashboard System Tables and Views
-- Feature: WS-037 - Main Dashboard Layout - Backend Services & API
-- Author: Team B - Round 2
-- Date: 2025-08-21

-- Enable RLS by default
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Dashboard widgets configuration table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL CHECK (widget_type IN ('summary', 'upcoming_weddings', 'recent_activity', 'tasks', 'messages', 'revenue')),
    widget_config JSONB NOT NULL DEFAULT '{}',
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1,
    height INTEGER NOT NULL DEFAULT 1,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard data cache table for performance
CREATE TABLE IF NOT EXISTS dashboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    cache_key VARCHAR(100) NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard activity log for real-time updates
CREATE TABLE IF NOT EXISTS dashboard_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_supplier_id ON dashboard_widgets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_enabled ON dashboard_widgets(supplier_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_supplier_key ON dashboard_cache(supplier_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_widget_type ON dashboard_cache(widget_type);

CREATE INDEX IF NOT EXISTS idx_dashboard_activity_supplier_id ON dashboard_activity(supplier_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_activity_created_at ON dashboard_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_activity_type ON dashboard_activity(activity_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_composite ON dashboard_widgets(supplier_id, is_enabled, widget_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_composite ON dashboard_cache(supplier_id, widget_type, expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboard_widgets
CREATE POLICY "Users can view their own dashboard widgets" ON dashboard_widgets
    FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Users can insert their own dashboard widgets" ON dashboard_widgets
    FOR INSERT WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Users can update their own dashboard widgets" ON dashboard_widgets
    FOR UPDATE USING (supplier_id = auth.uid());

CREATE POLICY "Users can delete their own dashboard widgets" ON dashboard_widgets
    FOR DELETE USING (supplier_id = auth.uid());

-- RLS Policies for dashboard_cache
CREATE POLICY "Users can view their own dashboard cache" ON dashboard_cache
    FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Service role can manage dashboard cache" ON dashboard_cache
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for dashboard_activity
CREATE POLICY "Users can view their own dashboard activity" ON dashboard_activity
    FOR SELECT USING (supplier_id = auth.uid());

CREATE POLICY "Users can insert their own dashboard activity" ON dashboard_activity
    FOR INSERT WITH CHECK (supplier_id = auth.uid());

-- Updated_at trigger for dashboard_widgets
CREATE OR REPLACE FUNCTION update_dashboard_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER dashboard_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_widgets_updated_at();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_dashboard_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM dashboard_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard summary view for performance
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    w.id,
    w.supplier_id,
    w.company_name,
    w.contact_name,
    w.email,
    w.phone,
    w.status,
    w.created_at as wedding_date,
    w.budget,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_tasks,
    COUNT(m.id) as unread_messages,
    COALESCE(SUM(p.amount), 0) as total_revenue
FROM weddings w
LEFT JOIN tasks t ON w.id = t.wedding_id
LEFT JOIN messages m ON w.id = m.wedding_id AND m.is_read = false
LEFT JOIN payments p ON w.id = p.wedding_id AND p.status = 'completed'
GROUP BY w.id, w.supplier_id, w.company_name, w.contact_name, w.email, w.phone, w.status, w.created_at, w.budget;

-- Dashboard widgets default configuration
CREATE OR REPLACE FUNCTION setup_default_dashboard_widgets(p_supplier_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default widget configuration if none exists
    IF NOT EXISTS (SELECT 1 FROM dashboard_widgets WHERE supplier_id = p_supplier_id) THEN
        INSERT INTO dashboard_widgets (supplier_id, widget_type, position_x, position_y, width, height, widget_config) VALUES
        (p_supplier_id, 'summary', 0, 0, 2, 1, '{"title": "Summary", "showMetrics": ["total_weddings", "active_weddings", "total_revenue"]}'),
        (p_supplier_id, 'upcoming_weddings', 2, 0, 2, 2, '{"title": "Upcoming Weddings", "limit": 5, "daysAhead": 30}'),
        (p_supplier_id, 'recent_activity', 0, 1, 2, 2, '{"title": "Recent Activity", "limit": 10}'),
        (p_supplier_id, 'tasks', 4, 0, 2, 1, '{"title": "Tasks Overview", "showTypes": ["overdue", "due_today", "upcoming"]}'),
        (p_supplier_id, 'messages', 4, 1, 2, 1, '{"title": "Recent Messages", "limit": 5, "unreadOnly": true}'),
        (p_supplier_id, 'revenue', 0, 3, 4, 1, '{"title": "Revenue Chart", "period": "month", "showComparison": true}');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Real-time functions for dashboard updates
CREATE OR REPLACE FUNCTION notify_dashboard_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'dashboard_update',
        json_build_object(
            'supplier_id', COALESCE(NEW.supplier_id, OLD.supplier_id),
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', extract(epoch from now())
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for real-time dashboard updates
CREATE OR REPLACE TRIGGER dashboard_realtime_weddings
    AFTER INSERT OR UPDATE OR DELETE ON weddings
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

CREATE OR REPLACE TRIGGER dashboard_realtime_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

CREATE OR REPLACE TRIGGER dashboard_realtime_messages
    AFTER INSERT OR UPDATE OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

-- Performance optimization: Materialized view for dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
SELECT 
    supplier_id,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_weddings,
    COUNT(*) as total_weddings,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_weddings_30d,
    AVG(budget) as avg_budget,
    SUM(CASE WHEN status = 'completed' THEN budget ELSE 0 END) as completed_revenue,
    MAX(created_at) as last_wedding_date,
    current_timestamp as last_updated
FROM weddings
GROUP BY supplier_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_supplier ON dashboard_metrics(supplier_id);

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON dashboard_widgets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON dashboard_widgets TO authenticated;
GRANT SELECT ON dashboard_cache TO authenticated;
GRANT SELECT, INSERT ON dashboard_activity TO authenticated;
GRANT SELECT ON dashboard_summary TO authenticated;
GRANT SELECT ON dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION setup_default_dashboard_widgets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_dashboard_cache() TO service_role;
GRANT EXECUTE ON FUNCTION refresh_dashboard_metrics() TO service_role;

-- Comments for documentation
COMMENT ON TABLE dashboard_widgets IS 'Stores user-configurable dashboard widget settings and positions';
COMMENT ON TABLE dashboard_cache IS 'High-performance cache for dashboard data with TTL support';
COMMENT ON TABLE dashboard_activity IS 'Activity log for real-time dashboard updates and notifications';
COMMENT ON VIEW dashboard_summary IS 'Optimized view for dashboard overview data aggregation';
COMMENT ON MATERIALIZED VIEW dashboard_metrics IS 'Pre-calculated metrics for dashboard performance optimization';
COMMENT ON FUNCTION setup_default_dashboard_widgets(UUID) IS 'Sets up default dashboard layout for new suppliers';
COMMENT ON FUNCTION clean_expired_dashboard_cache() IS 'Removes expired cache entries to maintain performance';
COMMENT ON FUNCTION refresh_dashboard_metrics() IS 'Refreshes materialized view for dashboard metrics';