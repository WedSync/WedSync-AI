-- WARNING: This migration references tables that may not exist: journey_executions, journey_alert_rules
-- Ensure these tables are created first

-- Journey Execution Engine Database Schema
-- Enhanced journey execution system with scheduling, recovery, and performance tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Journey Executions Table (Enhanced)
CREATE TABLE IF NOT EXISTS journey_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    participant_data JSONB NOT NULL DEFAULT '{}',
    current_node_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    next_execution_at TIMESTAMPTZ,
    execution_history JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled Executions Table
CREATE TABLE IF NOT EXISTS scheduled_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES journey_executions(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    node_id TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    data JSONB NOT NULL DEFAULT '{}',
    executed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Execution Logs Table
CREATE TABLE IF NOT EXISTS journey_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    instance_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Performance Metrics Table
CREATE TABLE IF NOT EXISTS journey_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    journey_id UUID,
    node_id TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Alert Rules Table
CREATE TABLE IF NOT EXISTS journey_alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('gt', 'gte', 'lt', 'lte', 'eq')),
    threshold NUMERIC NOT NULL,
    window_minutes INTEGER NOT NULL DEFAULT 5,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Alerts Table
CREATE TABLE IF NOT EXISTS journey_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES journey_alert_rules(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    threshold NUMERIC NOT NULL,
    actual_value NUMERIC NOT NULL,
    severity TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    journey_id UUID,
    node_id TEXT,
    user_id UUID,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual Intervention Tasks Table
CREATE TABLE IF NOT EXISTS manual_intervention_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'manual_intervention_required',
    priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    participant_id UUID NOT NULL,
    wedding_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID,
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Escalations Table
CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    participant_id UUID NOT NULL,
    wedding_date TIMESTAMPTZ,
    failure_reason TEXT NOT NULL,
    business_impact TEXT NOT NULL DEFAULT 'medium' CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID,
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wedding Timeline Milestones Table
CREATE TABLE IF NOT EXISTS wedding_timeline_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
    milestone_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    days_before_wedding INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('planning', 'confirmation', 'final_details', 'post_wedding')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'delayed', 'cancelled')),
    dependencies TEXT[] NOT NULL DEFAULT '{}',
    vendor_type TEXT,
    business_days_only BOOLEAN NOT NULL DEFAULT false,
    allow_weekends BOOLEAN NOT NULL DEFAULT true,
    buffer_time_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Recovery Patterns Table
CREATE TABLE IF NOT EXISTS journey_recovery_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type TEXT NOT NULL,
    error_type TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    success_rate NUMERIC NOT NULL DEFAULT 0.0 CHECK (success_rate >= 0.0 AND success_rate <= 1.0),
    average_recovery_time INTEGER NOT NULL DEFAULT 0, -- milliseconds
    last_occurrence TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(node_type, error_type)
);

-- Journey Circuit Breakers Table
CREATE TABLE IF NOT EXISTS journey_circuit_breakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    failure_threshold INTEGER NOT NULL DEFAULT 5,
    last_failure_time TIMESTAMPTZ,
    next_attempt_time TIMESTAMPTZ,
    timeout_ms INTEGER NOT NULL DEFAULT 60000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance Optimization

-- Journey Executions Indexes
CREATE INDEX IF NOT EXISTS idx_journey_executions_journey_participant ON journey_executions(journey_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_journey_executions_status ON journey_executions(status);
CREATE INDEX IF NOT EXISTS idx_journey_executions_next_execution ON journey_executions(next_execution_at) WHERE next_execution_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_executions_created_at ON journey_executions(created_at);

-- Scheduled Executions Indexes (Critical for 5-minute processing)
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_queue_priority ON scheduled_executions(scheduled_for, priority, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_status ON scheduled_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_execution_id ON scheduled_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_journey_participant ON scheduled_executions(journey_id, participant_id);

-- Performance Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON journey_performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON journey_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_journey ON journey_performance_metrics(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_timestamp ON journey_performance_metrics(metric_type, timestamp);

-- Execution Logs Indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_journey_timestamp ON journey_execution_logs(journey_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_execution_logs_instance ON journey_execution_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_step_status ON journey_execution_logs(step_type, status);

-- Timeline Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_milestones_execution ON wedding_timeline_milestones(execution_id);
CREATE INDEX IF NOT EXISTS idx_timeline_milestones_scheduled_date ON wedding_timeline_milestones(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_timeline_milestones_category_priority ON wedding_timeline_milestones(category, priority);

-- Manual Tasks and Escalations Indexes
CREATE INDEX IF NOT EXISTS idx_manual_tasks_status_priority ON manual_intervention_tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_manual_tasks_due_date ON manual_intervention_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_escalations_status_priority ON escalations(status, priority);
CREATE INDEX IF NOT EXISTS idx_escalations_business_impact ON escalations(business_impact);

-- Recovery Pattern Indexes
CREATE INDEX IF NOT EXISTS idx_recovery_patterns_node_type ON journey_recovery_patterns(node_type);
CREATE INDEX IF NOT EXISTS idx_recovery_patterns_last_occurrence ON journey_recovery_patterns(last_occurrence);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE journey_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_intervention_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_timeline_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Journey Executions (Organization-based access)
CREATE POLICY "journey_executions_select" ON journey_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "journey_executions_insert" ON journey_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "journey_executions_update" ON journey_executions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Similar policies for scheduled_executions
CREATE POLICY "scheduled_executions_select" ON scheduled_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "scheduled_executions_insert" ON scheduled_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "scheduled_executions_update" ON scheduled_executions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Execution logs policies
CREATE POLICY "execution_logs_select" ON journey_execution_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "execution_logs_insert" ON journey_execution_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Performance metrics policies (system access)
CREATE POLICY "performance_metrics_select" ON journey_performance_metrics
    FOR SELECT USING (
        CASE 
            WHEN journey_id IS NOT NULL THEN
                EXISTS (
                    SELECT 1 FROM journeys j 
                    WHERE j.id = journey_id 
                    AND j.organization_id = auth.jwt() ->> 'organization_id'
                )
            ELSE true -- System-wide metrics
        END
    );

-- Manual intervention and escalations (organization-based)
CREATE POLICY "manual_tasks_select" ON manual_intervention_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

CREATE POLICY "escalations_select" ON escalations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Timeline milestones policies
CREATE POLICY "timeline_milestones_select" ON wedding_timeline_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM journeys j 
            WHERE j.id = journey_id 
            AND j.organization_id = auth.jwt() ->> 'organization_id'
        )
    );

-- Functions and Triggers for Automated Maintenance

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_journey_executions_updated_at 
    BEFORE UPDATE ON journey_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_executions_updated_at 
    BEFORE UPDATE ON scheduled_executions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON journey_alert_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_tasks_updated_at 
    BEFORE UPDATE ON manual_intervention_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at 
    BEFORE UPDATE ON escalations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_milestones_updated_at 
    BEFORE UPDATE ON wedding_timeline_milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recovery_patterns_updated_at 
    BEFORE UPDATE ON journey_recovery_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circuit_breakers_updated_at 
    BEFORE UPDATE ON journey_circuit_breakers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old execution logs
CREATE OR REPLACE FUNCTION cleanup_old_execution_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM journey_execution_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM journey_performance_metrics 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up completed scheduled executions older than 7 days
    DELETE FROM scheduled_executions 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND updated_at < NOW() - INTERVAL '7 days';
END;
$$ language 'plpgsql';

-- Function to calculate journey execution statistics
CREATE OR REPLACE FUNCTION get_journey_execution_stats(journey_uuid UUID)
RETURNS TABLE (
    total_executions BIGINT,
    active_executions BIGINT,
    completed_executions BIGINT,
    failed_executions BIGINT,
    average_completion_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'running') as active_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_executions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL) as average_completion_time
    FROM journey_executions 
    WHERE journey_id = journey_uuid;
END;
$$ language 'plpgsql';

-- Function to get queue depth and processing metrics
CREATE OR REPLACE FUNCTION get_scheduler_metrics()
RETURNS TABLE (
    queue_depth BIGINT,
    processing_count BIGINT,
    avg_processing_time NUMERIC,
    error_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as queue_depth,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status IN ('completed', 'failed')) as avg_processing_time,
        (COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0)) as error_rate
    FROM scheduled_executions 
    WHERE created_at > NOW() - INTERVAL '1 hour';
END;
$$ language 'plpgsql';

-- Schedule automated cleanup using pg_cron (if available)
-- SELECT cron.schedule('cleanup-journey-logs', '0 2 * * *', 'SELECT cleanup_old_execution_logs();');

-- Initial Alert Rules for Performance Monitoring
INSERT INTO journey_alert_rules (name, metric_type, condition, threshold, window_minutes, severity) 
VALUES 
    ('High Node Execution Time', 'execution_time', 'gt', 1500, 5, 'high'),
    ('High Queue Depth', 'queue_depth', 'gt', 800, 2, 'medium'),
    ('High Error Rate', 'error_count', 'gt', 10, 5, 'critical'),
    ('Memory Usage Alert', 'memory_heap_used', 'gt', 400, 5, 'medium')
ON CONFLICT DO NOTHING;

-- Comments for Documentation
COMMENT ON TABLE journey_executions IS 'Enhanced journey execution instances with performance tracking';
COMMENT ON TABLE scheduled_executions IS 'Queue for scheduled journey node executions with 5-minute processing';
COMMENT ON TABLE journey_execution_logs IS 'Detailed logs of all journey execution steps';
COMMENT ON TABLE journey_performance_metrics IS 'Real-time performance metrics for monitoring';
COMMENT ON TABLE journey_alert_rules IS 'Configuration for automated performance alerts';
COMMENT ON TABLE manual_intervention_tasks IS 'Tasks requiring manual intervention in journey execution';
COMMENT ON TABLE escalations IS 'Failed executions requiring management attention';
COMMENT ON TABLE wedding_timeline_milestones IS 'Wedding-specific timeline milestones and scheduling';
COMMENT ON TABLE journey_recovery_patterns IS 'Machine learning patterns for intelligent recovery';
COMMENT ON TABLE journey_circuit_breakers IS 'Circuit breaker states for failing services';

-- Grant necessary permissions (adjust based on your role structure)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;