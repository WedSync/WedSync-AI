-- Tutorial System Database Schema
-- Migration: 019_tutorial_system

-- Tutorial progress tracking table
CREATE TABLE IF NOT EXISTS tutorial_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tutorial_type TEXT NOT NULL CHECK (tutorial_type IN ('onboarding', 'feature-discovery', 'advanced')),
    user_type TEXT DEFAULT 'couple' CHECK (user_type IN ('couple', 'planner', 'vendor')),
    device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    
    -- Tutorial structure
    steps JSONB NOT NULL DEFAULT '[]',
    current_step INTEGER DEFAULT 1,
    completed_steps TEXT[] DEFAULT '{}',
    skipped_steps TEXT[] DEFAULT '{}',
    
    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Preferences
    preferences JSONB DEFAULT '{"showHints": true, "autoAdvance": false, "speed": "normal"}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, tutorial_type)
);

-- Tutorial analytics table for tracking interactions
CREATE TABLE IF NOT EXISTS tutorial_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tutorial_type TEXT NOT NULL,
    
    -- Event tracking
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'complete', 'skip', 'pause', 'resume', 'exit')),
    step_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional data
    data JSONB DEFAULT '{}',
    time_spent INTEGER, -- milliseconds
    device_type TEXT,
    user_type TEXT,
    
    -- Session tracking
    session_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tutorial feedback table for collecting user feedback
CREATE TABLE IF NOT EXISTS tutorial_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tutorial_type TEXT NOT NULL,
    
    -- Feedback data
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    helpful_steps TEXT[],
    confusing_steps TEXT[],
    suggestions TEXT,
    
    -- Completion data
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_time INTEGER, -- total time in milliseconds
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user_id ON tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_status ON tutorial_progress(status);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_type ON tutorial_progress(tutorial_type);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_last_activity ON tutorial_progress(last_activity);

CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_user_id ON tutorial_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_event_type ON tutorial_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_timestamp ON tutorial_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_step_id ON tutorial_analytics(step_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_feedback_user_id ON tutorial_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_feedback_rating ON tutorial_feedback(rating);

-- RLS (Row Level Security) policies
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_feedback ENABLE ROW LEVEL SECURITY;

-- Tutorial progress policies
CREATE POLICY "Users can view their own tutorial progress"
    ON tutorial_progress FOR SELECT
    USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own tutorial progress"
    ON tutorial_progress FOR INSERT
    WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own tutorial progress"
    ON tutorial_progress FOR UPDATE
    USING (( SELECT auth.uid() ) = user_id)
    WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can delete their own tutorial progress"
    ON tutorial_progress FOR DELETE
    USING (( SELECT auth.uid() ) = user_id);

-- Tutorial analytics policies
CREATE POLICY "Users can view their own tutorial analytics"
    ON tutorial_analytics FOR SELECT
    USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own tutorial analytics"
    ON tutorial_analytics FOR INSERT
    WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Tutorial feedback policies
CREATE POLICY "Users can view their own tutorial feedback"
    ON tutorial_feedback FOR SELECT
    USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own tutorial feedback"
    ON tutorial_feedback FOR INSERT
    WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own tutorial feedback"
    ON tutorial_feedback FOR UPDATE
    USING (( SELECT auth.uid() ) = user_id)
    WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Functions for tutorial management

-- Function to get tutorial completion stats
CREATE OR REPLACE FUNCTION get_tutorial_completion_stats(
    tutorial_type_param TEXT DEFAULT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    tutorial_type TEXT,
    total_started INTEGER,
    total_completed INTEGER,
    completion_rate DECIMAL,
    avg_completion_time INTERVAL,
    most_skipped_step TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            tp.tutorial_type,
            COUNT(*) as started,
            COUNT(*) FILTER (WHERE tp.status = 'completed') as completed,
            AVG(EXTRACT(EPOCH FROM (tp.completed_at - tp.started_at))) as avg_time_seconds
        FROM tutorial_progress tp
        WHERE tp.started_at >= start_date 
            AND tp.started_at <= end_date
            AND (tutorial_type_param IS NULL OR tp.tutorial_type = tutorial_type_param)
        GROUP BY tp.tutorial_type
    ),
    skipped_steps AS (
        SELECT 
            ta.tutorial_type,
            ta.step_id,
            COUNT(*) as skip_count,
            ROW_NUMBER() OVER (PARTITION BY ta.tutorial_type ORDER BY COUNT(*) DESC) as rn
        FROM tutorial_analytics ta
        WHERE ta.event_type = 'skip'
            AND ta.timestamp >= start_date
            AND ta.timestamp <= end_date
            AND (tutorial_type_param IS NULL OR ta.tutorial_type = tutorial_type_param)
        GROUP BY ta.tutorial_type, ta.step_id
    )
    SELECT 
        s.tutorial_type,
        s.started::INTEGER,
        s.completed::INTEGER,
        CASE WHEN s.started > 0 THEN ROUND((s.completed::DECIMAL / s.started) * 100, 2) ELSE 0 END,
        MAKE_INTERVAL(secs => s.avg_time_seconds)::INTERVAL,
        ss.step_id
    FROM stats s
    LEFT JOIN skipped_steps ss ON s.tutorial_type = ss.tutorial_type AND ss.rn = 1;
END;
$$;

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_tutorial_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep analytics data for 1 year
    DELETE FROM tutorial_analytics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Log cleanup
    RAISE NOTICE 'Cleaned up old tutorial analytics data';
END;
$$;

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_tutorial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for tutorial_progress
DROP TRIGGER IF EXISTS trigger_tutorial_progress_updated_at ON tutorial_progress;
CREATE TRIGGER trigger_tutorial_progress_updated_at
    BEFORE UPDATE ON tutorial_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_tutorial_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tutorial_progress TO authenticated;
GRANT SELECT, INSERT ON tutorial_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tutorial_feedback TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE tutorial_progress IS 'Tracks user progress through interactive tutorials';
COMMENT ON TABLE tutorial_analytics IS 'Analytics data for tutorial interactions and performance metrics';
COMMENT ON TABLE tutorial_feedback IS 'User feedback and ratings for tutorial experiences';

COMMENT ON COLUMN tutorial_progress.steps IS 'JSONB array containing tutorial step definitions';
COMMENT ON COLUMN tutorial_progress.completed_steps IS 'Array of step IDs that have been completed';
COMMENT ON COLUMN tutorial_progress.skipped_steps IS 'Array of step IDs that have been skipped';
COMMENT ON COLUMN tutorial_progress.preferences IS 'User preferences for tutorial behavior (hints, auto-advance, speed)';

COMMENT ON COLUMN tutorial_analytics.time_spent IS 'Time spent on step in milliseconds';
COMMENT ON COLUMN tutorial_analytics.data IS 'Additional event data (form submissions, interactions, etc.)';

COMMENT ON FUNCTION get_tutorial_completion_stats IS 'Returns tutorial completion statistics for analytics';
COMMENT ON FUNCTION cleanup_old_tutorial_analytics IS 'Removes analytics data older than 1 year';

-- Create a view for tutorial dashboard analytics
CREATE OR REPLACE VIEW tutorial_dashboard_stats AS
SELECT 
    tp.tutorial_type,
    tp.user_type,
    tp.device_type,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE tp.status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE tp.status = 'active') as active_sessions,
    COUNT(*) FILTER (WHERE tp.status = 'paused') as paused_sessions,
    ROUND(AVG(array_length(tp.completed_steps, 1))::DECIMAL, 2) as avg_completed_steps,
    ROUND(AVG(array_length(tp.skipped_steps, 1))::DECIMAL, 2) as avg_skipped_steps,
    AVG(EXTRACT(EPOCH FROM (COALESCE(tp.completed_at, tp.last_activity) - tp.started_at))) as avg_session_time_seconds
FROM tutorial_progress tp
WHERE tp.started_at >= NOW() - INTERVAL '30 days'
GROUP BY tp.tutorial_type, tp.user_type, tp.device_type
ORDER BY tp.tutorial_type, total_sessions DESC;

COMMENT ON VIEW tutorial_dashboard_stats IS 'Aggregated tutorial statistics for dashboard display';

-- Initialize with default tutorial step templates (can be customized per user type)
INSERT INTO tutorial_progress (user_id, tutorial_type, steps) VALUES
-- This would typically be done via the API, but here's the structure
-- The steps will be populated by the API based on user type and preferences