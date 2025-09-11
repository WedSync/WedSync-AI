-- WS-342: Real-Time Wedding Collaboration - Wedding Real-Time Metrics Table
-- Team B Backend Development - Batch 1 Round 1
-- Description: Create wedding real-time metrics table for performance tracking and analytics

-- Create wedding_real_time_metrics table
CREATE TABLE wedding_real_time_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'collaboration_latency', 'event_processing_time', 'conflict_resolution_time',
        'websocket_connection_count', 'active_user_count', 'message_throughput',
        'data_sync_performance', 'presence_update_frequency', 'session_duration',
        'feature_usage', 'error_rate', 'system_performance'
    )),
    metric_value JSONB NOT NULL DEFAULT '{}',
    metric_tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    measurement_window INTERVAL DEFAULT INTERVAL '1 minute',
    aggregation_level TEXT DEFAULT 'raw' CHECK (aggregation_level IN ('raw', 'minute', 'hour', 'day')),
    
    -- Performance indexes
    INDEX idx_wedding_metrics_type (metric_type, recorded_at DESC),
    INDEX idx_wedding_metrics_wedding (wedding_id, metric_type, recorded_at DESC),
    INDEX idx_wedding_metrics_time (recorded_at DESC, aggregation_level),
    INDEX idx_wedding_metrics_aggregation (aggregation_level, metric_type, recorded_at DESC)
);

-- Add row level security
ALTER TABLE wedding_real_time_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for wedding metrics (admin/system access only)
CREATE POLICY "System can manage all wedding metrics" ON wedding_real_time_metrics
    FOR ALL USING (true); -- Restricted by application logic

-- Create function to record metric
CREATE OR REPLACE FUNCTION record_wedding_metric(
    p_wedding_id UUID,
    p_metric_type TEXT,
    p_metric_value JSONB,
    p_metric_tags JSONB DEFAULT '{}',
    p_measurement_window INTERVAL DEFAULT INTERVAL '1 minute'
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO wedding_real_time_metrics (
        wedding_id,
        metric_type,
        metric_value,
        metric_tags,
        measurement_window,
        recorded_at
    )
    VALUES (
        p_wedding_id,
        p_metric_type,
        p_metric_value,
        p_metric_tags,
        p_measurement_window,
        NOW()
    )
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record collaboration latency
CREATE OR REPLACE FUNCTION record_collaboration_latency(
    p_wedding_id UUID,
    p_event_type TEXT,
    p_latency_ms INTEGER,
    p_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    PERFORM record_wedding_metric(
        p_wedding_id,
        'collaboration_latency',
        jsonb_build_object(
            'latency_ms', p_latency_ms,
            'event_type', p_event_type,
            'user_id', p_user_id,
            'timestamp', NOW()
        ),
        jsonb_build_object(
            'event_type', p_event_type,
            'user_id', p_user_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record websocket connection metrics
CREATE OR REPLACE FUNCTION record_websocket_metrics(
    p_wedding_id UUID,
    p_connection_count INTEGER,
    p_message_throughput INTEGER,
    p_server_instance TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    PERFORM record_wedding_metric(
        p_wedding_id,
        'websocket_connection_count',
        jsonb_build_object(
            'connection_count', p_connection_count,
            'message_throughput', p_message_throughput,
            'server_instance', p_server_instance
        ),
        jsonb_build_object(
            'server_instance', p_server_instance
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get metric aggregations
CREATE OR REPLACE FUNCTION get_wedding_metric_aggregations(
    p_wedding_id UUID,
    p_metric_type TEXT,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours',
    p_bucket_size INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS TABLE (
    time_bucket TIMESTAMP WITH TIME ZONE,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    count_measurements BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('hour', wrm.recorded_at) as time_bucket,
        AVG((wrm.metric_value->>'value')::numeric) as avg_value,
        MIN((wrm.metric_value->>'value')::numeric) as min_value,
        MAX((wrm.metric_value->>'value')::numeric) as max_value,
        COUNT(*) as count_measurements
    FROM wedding_real_time_metrics wrm
    WHERE wrm.wedding_id = p_wedding_id
      AND wrm.metric_type = p_metric_type
      AND wrm.recorded_at >= NOW() - p_time_range
    GROUP BY date_trunc('hour', wrm.recorded_at)
    ORDER BY time_bucket DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get performance dashboard data
CREATE OR REPLACE FUNCTION get_wedding_performance_dashboard(
    p_wedding_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS TABLE (
    metric_type TEXT,
    current_value JSONB,
    avg_value NUMERIC,
    trend_direction TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_metrics AS (
        SELECT DISTINCT ON (wrm.metric_type)
            wrm.metric_type,
            wrm.metric_value,
            wrm.recorded_at
        FROM wedding_real_time_metrics wrm
        WHERE wrm.wedding_id = p_wedding_id
          AND wrm.recorded_at >= NOW() - p_time_range
        ORDER BY wrm.metric_type, wrm.recorded_at DESC
    ),
    historical_avg AS (
        SELECT 
            wrm.metric_type,
            AVG((wrm.metric_value->>'value')::numeric) as avg_val
        FROM wedding_real_time_metrics wrm
        WHERE wrm.wedding_id = p_wedding_id
          AND wrm.recorded_at >= NOW() - p_time_range * 2
          AND wrm.recorded_at < NOW() - p_time_range
        GROUP BY wrm.metric_type
    )
    SELECT 
        lm.metric_type,
        lm.metric_value as current_value,
        ha.avg_val as avg_value,
        CASE 
            WHEN (lm.metric_value->>'value')::numeric > ha.avg_val * 1.1 THEN 'up'
            WHEN (lm.metric_value->>'value')::numeric < ha.avg_val * 0.9 THEN 'down'
            ELSE 'stable'
        END as trend_direction,
        CASE 
            WHEN lm.metric_type = 'collaboration_latency' THEN
                CASE WHEN (lm.metric_value->>'latency_ms')::integer < 100 THEN 'good'
                     WHEN (lm.metric_value->>'latency_ms')::integer < 200 THEN 'warning'
                     ELSE 'critical' END
            WHEN lm.metric_type = 'error_rate' THEN
                CASE WHEN (lm.metric_value->>'rate')::numeric < 0.01 THEN 'good'
                     WHEN (lm.metric_value->>'rate')::numeric < 0.05 THEN 'warning'
                     ELSE 'critical' END
            ELSE 'good'
        END as status
    FROM latest_metrics lm
    LEFT JOIN historical_avg ha ON lm.metric_type = ha.metric_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to aggregate hourly metrics
CREATE OR REPLACE FUNCTION aggregate_hourly_metrics()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the time range for aggregation (previous hour)
    start_time := date_trunc('hour', NOW() - INTERVAL '1 hour');
    end_time := date_trunc('hour', NOW());
    
    -- Aggregate collaboration latency metrics
    INSERT INTO wedding_real_time_metrics (
        wedding_id, metric_type, metric_value, aggregation_level, recorded_at
    )
    SELECT 
        wedding_id,
        'collaboration_latency',
        jsonb_build_object(
            'avg_latency_ms', AVG((metric_value->>'latency_ms')::integer),
            'max_latency_ms', MAX((metric_value->>'latency_ms')::integer),
            'min_latency_ms', MIN((metric_value->>'latency_ms')::integer),
            'measurement_count', COUNT(*)
        ),
        'hour',
        start_time
    FROM wedding_real_time_metrics
    WHERE metric_type = 'collaboration_latency'
      AND aggregation_level = 'raw'
      AND recorded_at >= start_time
      AND recorded_at < end_time
    GROUP BY wedding_id;
    
    GET DIAGNOSTICS processed_count = ROW_COUNT;
    
    -- Aggregate websocket connection metrics
    INSERT INTO wedding_real_time_metrics (
        wedding_id, metric_type, metric_value, aggregation_level, recorded_at
    )
    SELECT 
        wedding_id,
        'websocket_connection_count',
        jsonb_build_object(
            'avg_connections', AVG((metric_value->>'connection_count')::integer),
            'max_connections', MAX((metric_value->>'connection_count')::integer),
            'total_messages', SUM((metric_value->>'message_throughput')::integer)
        ),
        'hour',
        start_time
    FROM wedding_real_time_metrics
    WHERE metric_type = 'websocket_connection_count'
      AND aggregation_level = 'raw'
      AND recorded_at >= start_time
      AND recorded_at < end_time
    GROUP BY wedding_id;
    
    -- Clean up old raw metrics (keep last 48 hours)
    DELETE FROM wedding_real_time_metrics
    WHERE aggregation_level = 'raw'
      AND recorded_at < NOW() - INTERVAL '48 hours';
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get wedding collaboration insights
CREATE OR REPLACE FUNCTION get_wedding_collaboration_insights(
    p_wedding_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    insight_type TEXT,
    insight_data JSONB,
    confidence_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    
    -- Peak collaboration times
    SELECT 
        'peak_collaboration_times'::TEXT,
        jsonb_build_object(
            'peak_hours', peak_data.peak_hours,
            'avg_users_peak', peak_data.avg_users,
            'recommendation', 'Schedule important decisions during peak hours'
        ),
        0.85::NUMERIC
    FROM (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'hour', hour_of_day,
                    'avg_users', avg_users
                ) ORDER BY avg_users DESC
            ) FILTER (WHERE row_num <= 3) as peak_hours,
            AVG(avg_users) FILTER (WHERE row_num <= 3) as avg_users
        FROM (
            SELECT 
                EXTRACT(HOUR FROM recorded_at) as hour_of_day,
                AVG((metric_value->>'connection_count')::integer) as avg_users,
                ROW_NUMBER() OVER (ORDER BY AVG((metric_value->>'connection_count')::integer) DESC) as row_num
            FROM wedding_real_time_metrics
            WHERE wedding_id = p_wedding_id
              AND metric_type = 'active_user_count'
              AND recorded_at >= NOW() - (p_days || ' days')::INTERVAL
            GROUP BY EXTRACT(HOUR FROM recorded_at)
        ) hourly_stats
    ) peak_data
    
    UNION ALL
    
    -- Collaboration efficiency
    SELECT 
        'collaboration_efficiency'::TEXT,
        jsonb_build_object(
            'avg_latency_ms', efficiency_data.avg_latency,
            'efficiency_score', efficiency_data.efficiency_score,
            'recommendation', 
            CASE 
                WHEN efficiency_data.avg_latency < 100 THEN 'Excellent collaboration performance'
                WHEN efficiency_data.avg_latency < 200 THEN 'Good collaboration performance, minor optimizations possible'
                ELSE 'Performance improvements needed for better collaboration'
            END
        ),
        0.90::NUMERIC
    FROM (
        SELECT 
            AVG((metric_value->>'latency_ms')::integer) as avg_latency,
            CASE 
                WHEN AVG((metric_value->>'latency_ms')::integer) < 100 THEN 95
                WHEN AVG((metric_value->>'latency_ms')::integer) < 200 THEN 80
                ELSE 60
            END as efficiency_score
        FROM wedding_real_time_metrics
        WHERE wedding_id = p_wedding_id
          AND metric_type = 'collaboration_latency'
          AND recorded_at >= NOW() - (p_days || ' days')::INTERVAL
    ) efficiency_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup old metrics
CREATE OR REPLACE FUNCTION cleanup_old_wedding_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete raw metrics older than 7 days
    DELETE FROM wedding_real_time_metrics
    WHERE aggregation_level = 'raw'
      AND recorded_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete hourly metrics older than 30 days
    DELETE FROM wedding_real_time_metrics
    WHERE aggregation_level = 'hour'
      AND recorded_at < NOW() - INTERVAL '30 days';
    
    -- Delete daily metrics older than 1 year
    DELETE FROM wedding_real_time_metrics
    WHERE aggregation_level = 'day'
      AND recorded_at < NOW() - INTERVAL '1 year';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE wedding_real_time_metrics IS 'Stores performance metrics and analytics for real-time wedding collaboration';
COMMENT ON COLUMN wedding_real_time_metrics.metric_type IS 'Type of metric being recorded';
COMMENT ON COLUMN wedding_real_time_metrics.metric_value IS 'JSON object containing metric data and measurements';
COMMENT ON COLUMN wedding_real_time_metrics.aggregation_level IS 'Level of data aggregation (raw, minute, hour, day)';
COMMENT ON FUNCTION record_wedding_metric IS 'Records a performance metric for a wedding';
COMMENT ON FUNCTION record_collaboration_latency IS 'Records collaboration latency metrics';
COMMENT ON FUNCTION get_wedding_performance_dashboard IS 'Returns performance dashboard data for a wedding';
COMMENT ON FUNCTION aggregate_hourly_metrics IS 'Aggregates raw metrics into hourly summaries';
COMMENT ON FUNCTION get_wedding_collaboration_insights IS 'Provides AI-driven insights about wedding collaboration patterns';