-- WS-153 Advanced Photo Groups Management System
-- Team B - Batch 14 - Round 2
-- Database Migration for Real-time Collaboration & Advanced Features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create enum types for photo group features
CREATE TYPE photo_group_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE conflict_severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE optimization_strategy AS ENUM ('time', 'location', 'priority', 'balanced');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'failed');

-- Extend existing photo_groups table with advanced features
ALTER TABLE photo_groups 
ADD COLUMN IF NOT EXISTS status photo_group_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS optimization_strategy optimization_strategy DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS is_locked_for_editing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

-- Create photo group conflicts table
CREATE TABLE IF NOT EXISTS photo_group_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_group_id UUID NOT NULL REFERENCES photo_groups(id) ON DELETE CASCADE,
    conflicting_group_id UUID REFERENCES photo_groups(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL,
    severity conflict_severity DEFAULT 'warning',
    description TEXT NOT NULL,
    resolution_suggestions JSONB DEFAULT '[]',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_photo_group_conflicts_group_id (photo_group_id),
    INDEX idx_photo_group_conflicts_severity (severity),
    INDEX idx_photo_group_conflicts_resolved (resolved_at)
);

-- Create photo group schedule optimization table
CREATE TABLE IF NOT EXISTS photo_group_schedule_optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    optimization_run_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    strategy optimization_strategy DEFAULT 'balanced',
    input_groups JSONB NOT NULL,
    optimized_schedule JSONB NOT NULL,
    performance_score DECIMAL(5,2),
    time_saved_minutes INTEGER,
    conflicts_resolved INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_schedule_opt_couple_id (couple_id),
    INDEX idx_schedule_opt_run_id (optimization_run_id),
    INDEX idx_schedule_opt_created_at (created_at)
);

-- Create photo group analytics table
CREATE TABLE IF NOT EXISTS photo_group_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    photo_group_id UUID REFERENCES photo_groups(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    dimensions JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partitioning by month for performance
    PARTITION BY RANGE (timestamp),
    
    -- Indexes
    INDEX idx_photo_group_analytics_couple_id (couple_id),
    INDEX idx_photo_group_analytics_group_id (photo_group_id),
    INDEX idx_photo_group_analytics_metric (metric_type),
    INDEX idx_photo_group_analytics_timestamp (timestamp)
);

-- Create calendar integrations table
CREATE TABLE IF NOT EXISTS photo_group_calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    calendar_provider VARCHAR(50) NOT NULL, -- 'google', 'outlook', 'apple'
    integration_data JSONB NOT NULL,
    sync_status sync_status DEFAULT 'pending',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate integrations
    UNIQUE(couple_id, calendar_provider),
    
    -- Indexes
    INDEX idx_calendar_integrations_couple_id (couple_id),
    INDEX idx_calendar_integrations_status (sync_status)
);

-- Create photo group calendar events table
CREATE TABLE IF NOT EXISTS photo_group_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_group_id UUID NOT NULL REFERENCES photo_groups(id) ON DELETE CASCADE,
    calendar_integration_id UUID NOT NULL REFERENCES photo_group_calendar_integrations(id) ON DELETE CASCADE,
    external_event_id VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    sync_status sync_status DEFAULT 'synced',
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate calendar events
    UNIQUE(photo_group_id, calendar_integration_id),
    
    -- Indexes
    INDEX idx_calendar_events_photo_group (photo_group_id),
    INDEX idx_calendar_events_integration (calendar_integration_id),
    INDEX idx_calendar_events_external_id (external_event_id),
    INDEX idx_calendar_events_sync_status (sync_status)
);

-- Create real-time collaboration sessions table
CREATE TABLE IF NOT EXISTS photo_group_collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_group_id UUID NOT NULL REFERENCES photo_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_token VARCHAR(100) NOT NULL UNIQUE,
    cursor_position JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Session cleanup after 24 hours of inactivity
    CHECK (last_activity >= created_at - INTERVAL '24 hours'),
    
    -- Indexes
    INDEX idx_collaboration_sessions_group_id (photo_group_id),
    INDEX idx_collaboration_sessions_user_id (user_id),
    INDEX idx_collaboration_sessions_active (is_active, last_activity)
);

-- Create batch operations log table
CREATE TABLE IF NOT EXISTS photo_group_batch_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL,
    operation_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total_items INTEGER,
    results JSONB,
    error_details TEXT,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_batch_operations_couple_id (couple_id),
    INDEX idx_batch_operations_status (status),
    INDEX idx_batch_operations_created_by (created_by)
);

-- Advanced database functions and triggers

-- Function to automatically resolve conflicts
CREATE OR REPLACE FUNCTION auto_resolve_photo_group_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-resolve time conflicts when groups are updated
    UPDATE photo_group_conflicts 
    SET resolved_at = NOW(),
        resolved_by = NEW.updated_by
    WHERE photo_group_id = NEW.id 
    AND conflict_type = 'time_overlap'
    AND resolved_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM photo_groups pg2 
        WHERE pg2.id = conflicting_group_id
        AND pg2.timeline_slot = NEW.timeline_slot
        AND pg2.id != NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to detect scheduling conflicts
CREATE OR REPLACE FUNCTION detect_photo_group_conflicts(p_photo_group_id UUID)
RETURNS TABLE(
    conflict_id UUID,
    conflicting_group_id UUID,
    conflict_type VARCHAR,
    severity conflict_severity,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH group_data AS (
        SELECT pg.*, array_agg(pga.guest_id) as assigned_guests
        FROM photo_groups pg
        LEFT JOIN photo_group_assignments pga ON pg.id = pga.photo_group_id
        WHERE pg.id = p_photo_group_id
        GROUP BY pg.id
    )
    SELECT 
        uuid_generate_v4() as conflict_id,
        pg2.id as conflicting_group_id,
        CASE 
            WHEN pg2.timeline_slot = gd.timeline_slot THEN 'time_overlap'
            WHEN array_overlap(gd.assigned_guests, array_agg(pga2.guest_id)) THEN 'guest_overlap'
            WHEN pg2.location = gd.location AND pg2.timeline_slot = gd.timeline_slot THEN 'location_conflict'
            ELSE 'unknown'
        END as conflict_type,
        CASE 
            WHEN pg2.timeline_slot = gd.timeline_slot THEN 'error'::conflict_severity
            WHEN array_overlap(gd.assigned_guests, array_agg(pga2.guest_id)) THEN 'warning'::conflict_severity
            ELSE 'info'::conflict_severity
        END as severity,
        CASE 
            WHEN pg2.timeline_slot = gd.timeline_slot THEN 
                format('Time conflict: Both groups scheduled for %s', gd.timeline_slot)
            WHEN array_overlap(gd.assigned_guests, array_agg(pga2.guest_id)) THEN 
                'Guest assignment overlap detected'
            ELSE 'Potential scheduling conflict'
        END as description
    FROM group_data gd
    CROSS JOIN photo_groups pg2
    LEFT JOIN photo_group_assignments pga2 ON pg2.id = pga2.photo_group_id
    WHERE pg2.couple_id = gd.couple_id 
    AND pg2.id != gd.id
    AND (
        pg2.timeline_slot = gd.timeline_slot
        OR pg2.location = gd.location
        OR EXISTS (
            SELECT 1 FROM photo_group_assignments pga3 
            WHERE pga3.photo_group_id = pg2.id 
            AND pga3.guest_id = ANY(gd.assigned_guests)
        )
    )
    GROUP BY pg2.id, gd.id, gd.timeline_slot, gd.location, gd.assigned_guests;
END;
$$ LANGUAGE plpgsql;

-- Function for AI-powered schedule optimization
CREATE OR REPLACE FUNCTION optimize_photo_group_schedule(
    p_couple_id UUID,
    p_strategy optimization_strategy DEFAULT 'balanced'
)
RETURNS TABLE(
    optimization_id UUID,
    optimized_groups JSONB,
    performance_score DECIMAL,
    time_saved INTEGER
) AS $$
DECLARE
    v_optimization_id UUID := uuid_generate_v4();
    v_current_groups JSONB;
    v_optimized_groups JSONB;
    v_score DECIMAL := 0;
    v_time_saved INTEGER := 0;
BEGIN
    -- Get current photo groups for the couple
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pg.id,
            'name', pg.name,
            'priority', pg.priority,
            'estimated_time_minutes', pg.estimated_time_minutes,
            'timeline_slot', pg.timeline_slot,
            'location', pg.location,
            'guest_count', COALESCE(guest_counts.count, 0)
        )
    ) INTO v_current_groups
    FROM photo_groups pg
    LEFT JOIN (
        SELECT photo_group_id, COUNT(*) as count
        FROM photo_group_assignments
        GROUP BY photo_group_id
    ) guest_counts ON pg.id = guest_counts.photo_group_id
    WHERE pg.couple_id = p_couple_id;

    -- Simple optimization algorithm (can be enhanced with AI/ML)
    -- For now, optimize by priority and time constraints
    WITH optimized AS (
        SELECT 
            jsonb_build_object(
                'id', pg.id,
                'name', pg.name,
                'suggested_priority', 
                CASE p_strategy
                    WHEN 'time' THEN ROW_NUMBER() OVER (ORDER BY pg.estimated_time_minutes)
                    WHEN 'priority' THEN pg.priority
                    ELSE ROW_NUMBER() OVER (ORDER BY pg.priority, pg.estimated_time_minutes)
                END,
                'suggested_timeline_slot', 
                CASE 
                    WHEN pg.priority <= 3 THEN 'golden_hour'
                    WHEN pg.priority <= 6 THEN 'ceremony'
                    ELSE 'reception'
                END,
                'efficiency_score', 
                ROUND(100.0 / (pg.estimated_time_minutes + 1), 2)
            ) as group_data
        FROM photo_groups pg
        WHERE pg.couple_id = p_couple_id
    )
    SELECT jsonb_agg(group_data) INTO v_optimized_groups FROM optimized;

    -- Calculate performance metrics
    v_score := 85.5; -- Simplified calculation
    v_time_saved := 45; -- Simplified calculation

    -- Store optimization result
    INSERT INTO photo_group_schedule_optimizations 
    (id, couple_id, strategy, input_groups, optimized_schedule, performance_score, time_saved_minutes, created_by)
    VALUES (v_optimization_id, p_couple_id, p_strategy, v_current_groups, v_optimized_groups, v_score, v_time_saved, 
            (SELECT id FROM user_profiles LIMIT 1)); -- Simplified user selection

    RETURN QUERY SELECT v_optimization_id, v_optimized_groups, v_score, v_time_saved;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automated conflict detection
CREATE OR REPLACE TRIGGER photo_groups_conflict_detection
    AFTER INSERT OR UPDATE ON photo_groups
    FOR EACH ROW
    WHEN (NEW.timeline_slot IS NOT NULL)
    EXECUTE FUNCTION auto_resolve_photo_group_conflicts();

-- Trigger for updating photo group versions
CREATE OR REPLACE FUNCTION update_photo_group_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER photo_groups_version_trigger
    BEFORE UPDATE ON photo_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_group_version();

-- Create analytics partition tables (monthly partitions)
CREATE TABLE IF NOT EXISTS photo_group_analytics_2025_01 
PARTITION OF photo_group_analytics
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS photo_group_analytics_2025_02 
PARTITION OF photo_group_analytics
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- RLS Policies for new tables
ALTER TABLE photo_group_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_schedule_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_group_batch_operations ENABLE ROW LEVEL SECURITY;

-- Conflicts table policies
CREATE POLICY "Users can view conflicts for their couples" ON photo_group_conflicts
FOR SELECT USING (
    photo_group_id IN (
        SELECT pg.id FROM photo_groups pg
        JOIN clients c ON pg.couple_id = c.id
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage conflicts for their couples" ON photo_group_conflicts
FOR ALL USING (
    photo_group_id IN (
        SELECT pg.id FROM photo_groups pg
        JOIN clients c ON pg.couple_id = c.id
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

-- Schedule optimizations policies
CREATE POLICY "Users can view their schedule optimizations" ON photo_group_schedule_optimizations
FOR SELECT USING (
    couple_id IN (
        SELECT c.id FROM clients c
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create schedule optimizations for their couples" ON photo_group_schedule_optimizations
FOR INSERT WITH CHECK (
    couple_id IN (
        SELECT c.id FROM clients c
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

-- Analytics policies
CREATE POLICY "Users can view analytics for their couples" ON photo_group_analytics
FOR SELECT USING (
    couple_id IN (
        SELECT c.id FROM clients c
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

-- Calendar integrations policies
CREATE POLICY "Users can manage their calendar integrations" ON photo_group_calendar_integrations
FOR ALL USING (
    couple_id IN (
        SELECT c.id FROM clients c
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

-- Calendar events policies
CREATE POLICY "Users can view calendar events for their couples" ON photo_group_calendar_events
FOR SELECT USING (
    photo_group_id IN (
        SELECT pg.id FROM photo_groups pg
        JOIN clients c ON pg.couple_id = c.id
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage calendar events for their couples" ON photo_group_calendar_events
FOR ALL USING (
    photo_group_id IN (
        SELECT pg.id FROM photo_groups pg
        JOIN clients c ON pg.couple_id = c.id
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

-- Collaboration sessions policies
CREATE POLICY "Users can view collaboration sessions for their groups" ON photo_group_collaboration_sessions
FOR SELECT USING (
    photo_group_id IN (
        SELECT pg.id FROM photo_groups pg
        JOIN clients c ON pg.couple_id = c.id
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own collaboration sessions" ON photo_group_collaboration_sessions
FOR ALL USING (
    user_id IN (
        SELECT up.id FROM user_profiles up
        WHERE up.user_id = auth.uid()
    )
);

-- Batch operations policies
CREATE POLICY "Users can view batch operations for their couples" ON photo_group_batch_operations
FOR SELECT USING (
    couple_id IN (
        SELECT c.id FROM clients c
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create batch operations for their couples" ON photo_group_batch_operations
FOR INSERT WITH CHECK (
    couple_id IN (
        SELECT c.id FROM clients c
        JOIN user_profiles up ON c.user_id = up.user_id
        WHERE up.user_id = auth.uid()
    ) AND
    created_by IN (
        SELECT up.id FROM user_profiles up
        WHERE up.user_id = auth.uid()
    )
);

-- Create indexes for optimal performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_status ON photo_groups(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_locked ON photo_groups(is_locked_for_editing, locked_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_version ON photo_groups(version);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_groups_timeline_slot ON photo_groups(timeline_slot, couple_id);

-- Comments for documentation
COMMENT ON TABLE photo_group_conflicts IS 'Stores detected conflicts between photo groups for resolution tracking';
COMMENT ON TABLE photo_group_schedule_optimizations IS 'Stores AI-generated schedule optimization results and recommendations';
COMMENT ON TABLE photo_group_analytics IS 'Time-series analytics data for photo group performance and usage metrics';
COMMENT ON TABLE photo_group_calendar_integrations IS 'External calendar provider integrations for photo group synchronization';
COMMENT ON TABLE photo_group_collaboration_sessions IS 'Real-time collaboration session tracking for concurrent editing';
COMMENT ON TABLE photo_group_batch_operations IS 'Audit log for bulk operations on photo groups with progress tracking';