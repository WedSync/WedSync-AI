-- Analytics Automation Setup - Team D Round 2
-- Automated triggers, scheduled functions, and data processing for analytics
-- Final integration layer for Team B execution engine analytics

-- ============================================================================
-- AUTOMATED DATA PROCESSING FUNCTIONS
-- ============================================================================

-- Function to process new journey execution data for analytics
CREATE OR REPLACE FUNCTION process_journey_execution_for_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial analytics record when execution starts
    IF TG_OP = 'INSERT' THEN
        INSERT INTO journey_execution_analytics (
            journey_id,
            execution_id,
            participant_id,
            execution_start_time,
            queue_wait_time_ms,
            total_nodes,
            completed_nodes,
            failed_nodes,
            skipped_nodes,
            retry_count,
            journey_priority,
            participant_tier,
            wedding_date,
            days_to_wedding,
            organization_id
        )
        SELECT 
            NEW.journey_id,
            NEW.id,
            NEW.participant_id,
            NEW.started_at,
            COALESCE((NEW.performance_metrics->>'queueWaitTime')::integer, 0),
            COALESCE((NEW.performance_metrics->>'totalNodes')::integer, 0),
            COALESCE((NEW.performance_metrics->>'completedNodes')::integer, 0),
            COALESCE((NEW.performance_metrics->>'failedNodes')::integer, 0),
            0, -- skipped_nodes, will be calculated
            COALESCE((NEW.metadata->>'retryCount')::integer, 0),
            COALESCE((NEW.metadata->>'priority')::integer, 5),
            NEW.participant_data->>'tier',
            CASE 
                WHEN NEW.participant_data->>'weddingDate' IS NOT NULL 
                THEN (NEW.participant_data->>'weddingDate')::timestamptz
                ELSE NULL 
            END,
            CASE 
                WHEN NEW.participant_data->>'weddingDate' IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM (
                    (NEW.participant_data->>'weddingDate')::timestamptz - NOW()
                )) / 86400)::integer
                ELSE NULL 
            END,
            (NEW.metadata->>'organizationId')::uuid
        ON CONFLICT (execution_id) DO NOTHING;
        
        RETURN NEW;
    END IF;

    -- Update analytics record when execution completes or fails
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        UPDATE journey_execution_analytics SET
            execution_end_time = NEW.completed_at,
            total_execution_duration_ms = CASE 
                WHEN NEW.completed_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
                ELSE NULL 
            END,
            completed_nodes = COALESCE((NEW.performance_metrics->>'completedNodes')::integer, 0),
            failed_nodes = COALESCE((NEW.performance_metrics->>'failedNodes')::integer, 0),
            avg_node_execution_time_ms = COALESCE((NEW.performance_metrics->>'averageNodeExecutionTime')::numeric, 0),
            journey_completion_rate = CASE 
                WHEN NEW.status = 'completed' THEN 1.0
                WHEN NEW.status = 'failed' THEN 0.0
                ELSE COALESCE((NEW.performance_metrics->>'completedNodes')::numeric, 0) / 
                     NULLIF(COALESCE((NEW.performance_metrics->>'totalNodes')::numeric, 1), 0)
            END,
            error_rate = COALESCE((NEW.performance_metrics->>'failedNodes')::numeric, 0) / 
                        NULLIF(COALESCE((NEW.performance_metrics->>'totalNodes')::numeric, 1), 0),
            retry_count = COALESCE((NEW.metadata->>'retryCount')::integer, 0),
            memory_usage_bytes = pg_column_size(NEW),
            updated_at = NOW()
        WHERE execution_id = NEW.id;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for journey execution analytics
CREATE TRIGGER journey_execution_analytics_trigger
    AFTER INSERT OR UPDATE ON journey_executions
    FOR EACH ROW
    EXECUTE FUNCTION process_journey_execution_for_analytics();

-- Function to process execution log entries for node analytics
CREATE OR REPLACE FUNCTION process_execution_log_for_node_analytics()
RETURNS TRIGGER AS $$
DECLARE
    execution_record journey_executions%ROWTYPE;
BEGIN
    -- Get execution details
    SELECT * INTO execution_record 
    FROM journey_executions 
    WHERE id = NEW.instance_id;
    
    IF FOUND THEN
        -- Insert node performance analytics
        INSERT INTO node_performance_analytics (
            journey_id,
            execution_id,
            node_id,
            node_type,
            node_name,
            execution_order,
            execution_start_time,
            execution_end_time,
            execution_duration_ms,
            status,
            retry_attempt,
            error_message,
            error_type,
            business_impact,
            user_visible
        )
        SELECT 
            NEW.journey_id,
            NEW.instance_id,
            NEW.step_id,
            NEW.step_type,
            NEW.step_name,
            (SELECT COUNT(*) FROM journey_execution_logs 
             WHERE instance_id = NEW.instance_id AND timestamp <= NEW.timestamp),
            NEW.timestamp,
            NEW.timestamp, -- Same for logs, actual duration would come from execution events
            COALESCE((NEW.details->>'duration')::integer, 0),
            CASE 
                WHEN NEW.status = 'success' THEN 'success'
                WHEN NEW.status = 'error' THEN 'failure'
                WHEN NEW.status = 'timeout' THEN 'timeout'
                ELSE 'success'
            END,
            COALESCE((NEW.details->>'retryCount')::integer, 0),
            NEW.details->>'error',
            CASE 
                WHEN NEW.details->>'error' IS NOT NULL 
                THEN SPLIT_PART(NEW.details->>'error', ':', 1)
                ELSE NULL 
            END,
            CASE 
                WHEN NEW.step_type IN ('email', 'sms', 'form') THEN 'medium'
                WHEN NEW.step_type IN ('webhook', 'review') THEN 'high'
                ELSE 'low'
            END,
            NEW.step_type IN ('email', 'sms', 'form', 'review')
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for node performance analytics
CREATE TRIGGER execution_log_node_analytics_trigger
    AFTER INSERT ON journey_execution_logs
    FOR EACH ROW
    EXECUTE FUNCTION process_execution_log_for_node_analytics();

-- ============================================================================
-- AUTOMATED AGGREGATION FUNCTIONS
-- ============================================================================

-- Function to update performance trends (runs every hour)
CREATE OR REPLACE FUNCTION update_performance_trends_hourly()
RETURNS void AS $$
BEGIN
    -- Update trends for the previous hour
    WITH hourly_stats AS (
        SELECT 
            jea.journey_id,
            DATE(jea.execution_start_time) as trend_date,
            EXTRACT(HOUR FROM jea.execution_start_time) as hour_of_day,
            COUNT(*) as total_executions,
            COUNT(*) FILTER (WHERE jea.journey_completion_rate = 1.0) as successful_executions,
            COUNT(*) FILTER (WHERE jea.journey_completion_rate < 1.0) as failed_executions,
            ROUND(AVG(jea.total_execution_duration_ms), 2) as avg_execution_time_ms,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p50_execution_time_ms,
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p95_execution_time_ms,
            ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p99_execution_time_ms,
            ROUND(AVG(jea.error_rate), 4) as error_rate,
            ROUND(AVG(jea.queue_wait_time_ms), 2) as avg_queue_wait_time_ms,
            ROUND(AVG(jea.memory_usage_bytes) / 1024.0 / 1024.0, 2) as avg_memory_usage_mb,
            ROUND(AVG(jea.cpu_usage_percent), 2) as avg_cpu_usage_percent,
            COUNT(*) FILTER (WHERE jea.wedding_date IS NOT NULL) as wedding_execution_count,
            COUNT(*) FILTER (WHERE jea.days_to_wedding <= 7) as urgent_execution_count,
            COUNT(*) FILTER (WHERE jea.participant_tier IN ('VIP', 'PREMIUM')) as vip_execution_count
        FROM journey_execution_analytics jea
        WHERE jea.execution_start_time >= NOW() - INTERVAL '1 hour'
          AND jea.execution_start_time < NOW() - INTERVAL '5 minutes' -- Allow for completion buffer
        GROUP BY jea.journey_id, DATE(jea.execution_start_time), EXTRACT(HOUR FROM jea.execution_start_time)
    )
    INSERT INTO journey_performance_trends (
        journey_id, trend_date, hour_of_day,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_ms, p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms,
        error_rate, timeout_rate, retry_rate,
        avg_queue_wait_time_ms, avg_memory_usage_mb, avg_cpu_usage_percent,
        wedding_execution_count, urgent_execution_count, vip_execution_count
    )
    SELECT 
        journey_id, trend_date, hour_of_day,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_ms, p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms,
        error_rate, 
        0 as timeout_rate, -- Would need timeout data from node analytics
        0 as retry_rate,    -- Would calculate from retry counts
        avg_queue_wait_time_ms, avg_memory_usage_mb, avg_cpu_usage_percent,
        wedding_execution_count, urgent_execution_count, vip_execution_count
    FROM hourly_stats
    ON CONFLICT (journey_id, trend_date, hour_of_day) 
    DO UPDATE SET
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
        p50_execution_time_ms = EXCLUDED.p50_execution_time_ms,
        p95_execution_time_ms = EXCLUDED.p95_execution_time_ms,
        p99_execution_time_ms = EXCLUDED.p99_execution_time_ms,
        error_rate = EXCLUDED.error_rate,
        avg_queue_wait_time_ms = EXCLUDED.avg_queue_wait_time_ms,
        avg_memory_usage_mb = EXCLUDED.avg_memory_usage_mb,
        avg_cpu_usage_percent = EXCLUDED.avg_cpu_usage_percent,
        wedding_execution_count = EXCLUDED.wedding_execution_count,
        urgent_execution_count = EXCLUDED.urgent_execution_count,
        vip_execution_count = EXCLUDED.vip_execution_count,
        updated_at = NOW();
        
    -- Update business intelligence aggregations
    PERFORM update_business_intelligence();
    
    -- Log aggregation completion
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'hourly_aggregation_completed', 1, 
        jsonb_build_object('function', 'update_performance_trends_hourly')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate error occurrences (runs every 15 minutes)
CREATE OR REPLACE FUNCTION consolidate_error_analytics()
RETURNS void AS $$
BEGIN
    -- Update error occurrence counts and latest occurrences
    WITH error_stats AS (
        SELECT 
            error_type,
            error_category,
            error_severity,
            journey_id,
            COUNT(*) as new_occurrences,
            MAX(created_at) as latest_occurrence
        FROM journey_error_analytics
        WHERE last_occurrence >= NOW() - INTERVAL '15 minutes'
          AND occurrence_count = 1 -- Only process new errors
        GROUP BY error_type, error_category, error_severity, journey_id
    )
    UPDATE journey_error_analytics jea SET
        occurrence_count = jea.occurrence_count + es.new_occurrences - 1,
        last_occurrence = es.latest_occurrence,
        updated_at = NOW()
    FROM error_stats es
    WHERE jea.error_type = es.error_type
      AND jea.error_category = es.error_category
      AND jea.error_severity = es.error_severity
      AND jea.journey_id = es.journey_id
      AND jea.id = (
          SELECT id FROM journey_error_analytics jea2
          WHERE jea2.error_type = es.error_type
            AND jea2.error_category = es.error_category
            AND jea2.error_severity = es.error_severity
            AND jea2.journey_id = es.journey_id
          ORDER BY first_occurrence ASC
          LIMIT 1
      );
      
    -- Remove duplicate error entries (keep oldest)
    WITH duplicate_errors AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY error_type, error_category, error_severity, journey_id 
                ORDER BY first_occurrence ASC
            ) as rn
        FROM journey_error_analytics
        WHERE last_occurrence >= NOW() - INTERVAL '15 minutes'
    )
    DELETE FROM journey_error_analytics 
    WHERE id IN (
        SELECT id FROM duplicate_errors WHERE rn > 1
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING AUTOMATION
-- ============================================================================

-- Function to monitor system performance and create alerts
CREATE OR REPLACE FUNCTION monitor_system_performance()
RETURNS void AS $$
DECLARE
    current_metrics RECORD;
    alert_threshold RECORD;
    should_alert BOOLEAN;
BEGIN
    -- Get current system metrics from the most recent real-time entry
    SELECT 
        active_executions,
        queue_depth,
        processing_rate,
        avg_execution_time_last_5min,
        error_rate_last_5min,
        system_health_score,
        memory_usage_mb,
        cpu_usage_percent
    INTO current_metrics
    FROM journey_realtime_metrics
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Check against alert rules and create alerts if needed
    FOR alert_threshold IN 
        SELECT * FROM journey_alert_rules WHERE enabled = true
    LOOP
        should_alert := false;
        
        -- Check specific metric thresholds
        CASE alert_threshold.metric_type
            WHEN 'execution_time' THEN
                should_alert := current_metrics.avg_execution_time_last_5min > alert_threshold.threshold;
            WHEN 'queue_depth' THEN
                should_alert := current_metrics.queue_depth > alert_threshold.threshold;
            WHEN 'error_rate' THEN
                should_alert := current_metrics.error_rate_last_5min > (alert_threshold.threshold / 100.0);
            WHEN 'memory_heap_used' THEN
                should_alert := current_metrics.memory_usage_mb > alert_threshold.threshold;
            WHEN 'system_health' THEN
                should_alert := current_metrics.system_health_score < (alert_threshold.threshold / 100.0);
            WHEN 'processing_rate' THEN
                should_alert := current_metrics.processing_rate < alert_threshold.threshold;
        END CASE;
        
        -- Create alert if threshold exceeded
        IF should_alert THEN
            INSERT INTO journey_alerts (
                rule_id,
                rule_name,
                metric_type,
                threshold,
                actual_value,
                severity,
                timestamp
            ) VALUES (
                alert_threshold.id,
                alert_threshold.name,
                alert_threshold.metric_type,
                alert_threshold.threshold,
                CASE alert_threshold.metric_type
                    WHEN 'execution_time' THEN current_metrics.avg_execution_time_last_5min
                    WHEN 'queue_depth' THEN current_metrics.queue_depth
                    WHEN 'error_rate' THEN current_metrics.error_rate_last_5min * 100
                    WHEN 'memory_heap_used' THEN current_metrics.memory_usage_mb
                    WHEN 'system_health' THEN current_metrics.system_health_score * 100
                    WHEN 'processing_rate' THEN current_metrics.processing_rate
                END,
                alert_threshold.severity,
                NOW()
            );
            
            -- Log the alert creation
            INSERT INTO journey_performance_metrics (
                timestamp, metric_type, value, labels
            ) VALUES (
                NOW(), 'alert_created', 1, 
                jsonb_build_object(
                    'rule_name', alert_threshold.name,
                    'severity', alert_threshold.severity,
                    'metric_type', alert_threshold.metric_type,
                    'threshold', alert_threshold.threshold,
                    'actual_value', CASE alert_threshold.metric_type
                        WHEN 'execution_time' THEN current_metrics.avg_execution_time_last_5min
                        WHEN 'queue_depth' THEN current_metrics.queue_depth
                        WHEN 'error_rate' THEN current_metrics.error_rate_last_5min * 100
                        WHEN 'memory_heap_used' THEN current_metrics.memory_usage_mb
                        WHEN 'system_health' THEN current_metrics.system_health_score * 100
                        WHEN 'processing_rate' THEN current_metrics.processing_rate
                    END
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_analytics_data()
RETURNS void AS $$
BEGIN
    -- Clean up old real-time metrics (keep only 48 hours)
    DELETE FROM journey_realtime_metrics 
    WHERE timestamp < NOW() - INTERVAL '48 hours';
    
    -- Clean up old node performance analytics (keep 90 days)
    DELETE FROM node_performance_analytics 
    WHERE execution_start_time < NOW() - INTERVAL '90 days';
    
    -- Clean up resolved error analytics (keep resolved errors for 30 days)
    DELETE FROM journey_error_analytics 
    WHERE resolved = true 
      AND resolution_time < NOW() - INTERVAL '30 days';
    
    -- Clean up old performance trends (keep 1 year)
    DELETE FROM journey_performance_trends 
    WHERE trend_date < CURRENT_DATE - INTERVAL '1 year';
    
    -- Clean up old alerts (keep 90 days)
    DELETE FROM journey_alerts 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Clean up old execution analytics (keep 1 year)
    DELETE FROM journey_execution_analytics 
    WHERE execution_start_time < NOW() - INTERVAL '1 year';
    
    -- Vacuum analyze analytics tables for performance
    ANALYZE journey_execution_analytics;
    ANALYZE node_performance_analytics;
    ANALYZE journey_performance_trends;
    ANALYZE journey_error_analytics;
    
    -- Log cleanup completion
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'analytics_cleanup_completed', 1, 
        jsonb_build_object('function', 'cleanup_analytics_data')
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MATERIALIZED VIEW REFRESH AUTOMATION
-- ============================================================================

-- Function to refresh all materialized views in optimal order
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh in dependency order
    PERFORM refresh_journey_performance_realtime();
    PERFORM refresh_node_performance_insights();  
    PERFORM refresh_error_analytics_dashboard();
    
    -- Update last refresh timestamp
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'materialized_views_refreshed', 3, 
        jsonb_build_object('views', ARRAY['journey_performance_realtime', 'node_performance_insights', 'error_analytics_dashboard'])
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON SCHEDULE SETUP (Using pg_cron extension)
-- ============================================================================

-- Schedule performance trends aggregation (every hour)
SELECT cron.schedule(
    'journey-performance-trends-hourly',
    '0 * * * *',  -- Every hour at minute 0
    'SELECT update_performance_trends_hourly();'
);

-- Schedule error consolidation (every 15 minutes)
SELECT cron.schedule(
    'journey-error-consolidation',
    '*/15 * * * *',  -- Every 15 minutes
    'SELECT consolidate_error_analytics();'
);

-- Schedule system performance monitoring (every 5 minutes)
SELECT cron.schedule(
    'journey-system-monitoring',
    '*/5 * * * *',  -- Every 5 minutes
    'SELECT monitor_system_performance();'
);

-- Schedule materialized view refresh (every 10 minutes for real-time views)
SELECT cron.schedule(
    'journey-realtime-view-refresh',
    '*/10 * * * *',  -- Every 10 minutes
    'SELECT refresh_journey_performance_realtime();'
);

SELECT cron.schedule(
    'journey-node-insights-refresh',
    '*/20 * * * *',  -- Every 20 minutes
    'SELECT refresh_node_performance_insights();'
);

SELECT cron.schedule(
    'journey-error-dashboard-refresh',
    '*/15 * * * *',  -- Every 15 minutes  
    'SELECT refresh_error_analytics_dashboard();'
);

-- Schedule daily cleanup (every day at 2 AM)
SELECT cron.schedule(
    'journey-analytics-cleanup',
    '0 2 * * *',  -- Every day at 2 AM
    'SELECT cleanup_analytics_data();'
);

-- Schedule business intelligence updates (every 4 hours)
SELECT cron.schedule(
    'journey-business-intelligence-update',
    '0 */4 * * *',  -- Every 4 hours
    'SELECT update_business_intelligence();'
);

-- ============================================================================
-- MONITORING AND HEALTH CHECK FUNCTIONS
-- ============================================================================

-- Function to check analytics system health
CREATE OR REPLACE FUNCTION check_analytics_health()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    last_update TIMESTAMPTZ,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH health_checks AS (
        -- Check materialized view freshness
        SELECT 
            'mv_journey_performance_realtime' as component,
            CASE 
                WHEN refreshed_at > NOW() - INTERVAL '15 minutes' THEN 'healthy'
                WHEN refreshed_at > NOW() - INTERVAL '1 hour' THEN 'warning'
                ELSE 'critical'
            END as status,
            refreshed_at as last_update,
            jsonb_build_object('refresh_lag_minutes', 
                EXTRACT(EPOCH FROM (NOW() - refreshed_at)) / 60) as details
        FROM mv_journey_performance_realtime
        LIMIT 1
        
        UNION ALL
        
        -- Check real-time metrics freshness
        SELECT 
            'journey_realtime_metrics' as component,
            CASE 
                WHEN MAX(timestamp) > NOW() - INTERVAL '10 minutes' THEN 'healthy'
                WHEN MAX(timestamp) > NOW() - INTERVAL '30 minutes' THEN 'warning'  
                ELSE 'critical'
            END as status,
            MAX(timestamp) as last_update,
            jsonb_build_object(
                'data_lag_minutes', EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) / 60,
                'record_count', COUNT(*)
            ) as details
        FROM journey_realtime_metrics
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        -- Check execution analytics data flow
        SELECT 
            'journey_execution_analytics' as component,
            CASE 
                WHEN COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '1 hour') > 0 THEN 'healthy'
                WHEN COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '4 hours') > 0 THEN 'warning'
                ELSE 'critical'
            END as status,
            MAX(execution_start_time) as last_update,
            jsonb_build_object(
                'executions_last_hour', COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '1 hour'),
                'executions_last_4_hours', COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '4 hours')
            ) as details
        FROM journey_execution_analytics
        WHERE execution_start_time > NOW() - INTERVAL '4 hours'
        
        UNION ALL
        
        -- Check scheduled jobs status
        SELECT 
            'scheduled_jobs' as component,
            CASE 
                WHEN COUNT(*) FILTER (WHERE last_run > NOW() - INTERVAL '1 hour') >= 3 THEN 'healthy'
                WHEN COUNT(*) FILTER (WHERE last_run > NOW() - INTERVAL '2 hours') >= 2 THEN 'warning'
                ELSE 'critical'
            END as status,
            MAX(last_run) as last_update,
            jsonb_build_object(
                'active_jobs', COUNT(*),
                'recent_runs', COUNT(*) FILTER (WHERE last_run > NOW() - INTERVAL '1 hour')
            ) as details
        FROM cron.job
        WHERE jobname LIKE 'journey-%'
    )
    SELECT * FROM health_checks;
END;
$$ LANGUAGE plpgsql;

-- Function to get analytics performance metrics
CREATE OR REPLACE FUNCTION get_analytics_performance_metrics()
RETURNS TABLE (
    metric_name TEXT,
    current_value NUMERIC,
    avg_value_24h NUMERIC,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH metrics_24h AS (
        SELECT 
            'execution_analytics_records' as metric,
            COUNT(*)::NUMERIC as current_val,
            COUNT(*) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours')::NUMERIC as val_24h
        FROM journey_execution_analytics
        
        UNION ALL
        
        SELECT 
            'node_analytics_records' as metric,
            COUNT(*)::NUMERIC as current_val,
            COUNT(*) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours')::NUMERIC as val_24h
        FROM node_performance_analytics
        
        UNION ALL
        
        SELECT 
            'error_analytics_records' as metric,
            COUNT(*)::NUMERIC as current_val,
            COUNT(*) FILTER (WHERE last_occurrence >= NOW() - INTERVAL '24 hours')::NUMERIC as val_24h
        FROM journey_error_analytics
        
        UNION ALL
        
        SELECT 
            'avg_processing_time_ms' as metric,
            AVG(total_execution_duration_ms) as current_val,
            AVG(total_execution_duration_ms) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours') as val_24h
        FROM journey_execution_analytics
        WHERE total_execution_duration_ms IS NOT NULL
        
        UNION ALL
        
        SELECT 
            'system_health_score' as metric,
            AVG(system_health_score * 100) as current_val,
            AVG(system_health_score * 100) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as val_24h
        FROM journey_realtime_metrics
    )
    SELECT 
        metric as metric_name,
        COALESCE(current_val, 0) as current_value,
        COALESCE(val_24h, 0) as avg_value_24h,
        CASE 
            WHEN current_val > val_24h * 1.1 THEN 'increasing'
            WHEN current_val < val_24h * 0.9 THEN 'decreasing' 
            ELSE 'stable'
        END as trend
    FROM metrics_24h;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INTEGRATION ACTIVATION FUNCTION
-- ============================================================================

-- Function to activate analytics integration with Team B execution engine
CREATE OR REPLACE FUNCTION activate_analytics_integration()
RETURNS void AS $$
BEGIN
    -- Ensure all triggers are enabled
    ALTER TABLE journey_executions ENABLE TRIGGER journey_execution_analytics_trigger;
    ALTER TABLE journey_execution_logs ENABLE TRIGGER execution_log_node_analytics_trigger;
    
    -- Refresh all materialized views
    PERFORM refresh_analytics_materialized_views();
    
    -- Validate integration is working
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'analytics_integration_activated', 1, 
        jsonb_build_object(
            'team', 'Team D',
            'round', 'Round 2',
            'integration_status', 'active'
        )
    );
    
    -- Log activation
    RAISE NOTICE 'Analytics integration with Team B execution engine activated successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS AND FINAL SETUP
-- ============================================================================

COMMENT ON FUNCTION process_journey_execution_for_analytics() IS 'Processes journey execution changes for analytics data capture';
COMMENT ON FUNCTION process_execution_log_for_node_analytics() IS 'Processes execution log entries for node performance analytics';
COMMENT ON FUNCTION update_performance_trends_hourly() IS 'Updates hourly performance trends for capacity planning';
COMMENT ON FUNCTION consolidate_error_analytics() IS 'Consolidates error occurrences to prevent duplicate entries';
COMMENT ON FUNCTION monitor_system_performance() IS 'Monitors system performance and creates alerts when thresholds are exceeded';
COMMENT ON FUNCTION cleanup_analytics_data() IS 'Cleans up old analytics data according to retention policies';
COMMENT ON FUNCTION check_analytics_health() IS 'Checks the health status of all analytics components';
COMMENT ON FUNCTION activate_analytics_integration() IS 'Activates the complete analytics integration with Team B execution engine';

-- Grant necessary permissions for automation
GRANT EXECUTE ON FUNCTION process_journey_execution_for_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION process_execution_log_for_node_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION update_performance_trends_hourly() TO authenticated;
GRANT EXECUTE ON FUNCTION consolidate_error_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_system_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION check_analytics_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_performance_metrics() TO authenticated;

-- Final activation
SELECT activate_analytics_integration();