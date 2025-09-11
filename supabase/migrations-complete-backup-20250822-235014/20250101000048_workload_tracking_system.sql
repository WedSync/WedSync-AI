-- =====================================================
-- WS-058: Task Delegation System - Workload Tracking
-- Migration: 030_workload_tracking_system.sql
-- =====================================================

-- Function to calculate comprehensive workload metrics
CREATE OR REPLACE FUNCTION calculate_workload_metrics(wedding_id_param UUID)
RETURNS TABLE(
    team_member_id UUID,
    team_member_name TEXT,
    role TEXT,
    specialty TEXT,
    total_assigned_tasks INTEGER,
    active_tasks INTEGER,
    completed_tasks INTEGER,
    overdue_tasks INTEGER,
    estimated_hours_total DECIMAL,
    estimated_hours_remaining DECIMAL,
    capacity_utilization DECIMAL,
    workload_score DECIMAL,
    availability_status TEXT,
    avg_completion_time_days DECIMAL,
    task_completion_rate DECIMAL
) 
LANGUAGE plpgsql
AS $$
DECLARE
    standard_work_hours CONSTANT DECIMAL := 40.0; -- Hours per week
BEGIN
    RETURN QUERY
    WITH team_task_stats AS (
        SELECT 
            tm.id as member_id,
            tm.name as member_name,
            tm.role,
            tm.specialty,
            COUNT(wt.id) as total_tasks,
            COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_count,
            COUNT(*) FILTER (WHERE wt.status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_count,
            COALESCE(SUM(wt.estimated_hours), 0) as total_hours,
            COALESCE(SUM(CASE 
                WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                THEN wt.estimated_hours 
                ELSE 0 
            END), 0) as remaining_hours,
            AVG(CASE 
                WHEN wt.status = 'completed' AND wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL
                THEN EXTRACT(DAY FROM wt.completed_at - wt.started_at)
                ELSE NULL 
            END) as avg_completion_days
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
        GROUP BY tm.id, tm.name, tm.role, tm.specialty
    ),
    workload_calculations AS (
        SELECT 
            tts.*,
            -- Capacity utilization based on remaining hours vs standard work hours
            CASE 
                WHEN standard_work_hours > 0 
                THEN ROUND((tts.remaining_hours / standard_work_hours) * 100, 2)
                ELSE 0 
            END as utilization,
            -- Workload score considering task count, hours, priority, and deadlines
            ROUND(
                (tts.active_count * 2.0) + 
                (tts.remaining_hours * 0.5) + 
                (tts.overdue_count * 5.0) +
                -- Priority weight (estimated from task priorities)
                COALESCE((
                    SELECT SUM(CASE wt.priority 
                        WHEN 'critical' THEN 3.0
                        WHEN 'high' THEN 2.0 
                        WHEN 'medium' THEN 1.0
                        ELSE 0.5 
                    END)
                    FROM workflow_tasks wt 
                    WHERE wt.assigned_to = tts.member_id 
                    AND wt.status IN ('pending', 'in_progress', 'on_hold')
                ), 0),
                2
            ) as workload_score,
            -- Task completion rate
            CASE 
                WHEN tts.total_tasks > 0 
                THEN ROUND((tts.completed_count::DECIMAL / tts.total_tasks::DECIMAL) * 100, 2)
                ELSE 0 
            END as completion_rate
        FROM team_task_stats tts
    )
    SELECT 
        wc.member_id,
        wc.member_name,
        wc.role,
        wc.specialty,
        wc.total_tasks::INTEGER,
        wc.active_count::INTEGER,
        wc.completed_count::INTEGER,
        wc.overdue_count::INTEGER,
        wc.total_hours,
        wc.remaining_hours,
        wc.utilization,
        wc.workload_score,
        -- Availability status based on utilization and overdue tasks
        CASE 
            WHEN wc.overdue_count > 2 OR wc.utilization > 100 THEN 'overloaded'
            WHEN wc.utilization > 85 OR wc.overdue_count > 0 THEN 'busy'
            WHEN wc.utilization < 50 AND wc.active_count = 0 THEN 'available'
            WHEN wc.utilization <= 85 THEN 'available'
            ELSE 'unavailable'
        END as availability_status,
        COALESCE(wc.avg_completion_days, 3.0),
        wc.completion_rate
    FROM workload_calculations wc
    ORDER BY wc.workload_score DESC, wc.utilization DESC;
END;
$$;

-- Function to analyze overall team capacity
CREATE OR REPLACE FUNCTION analyze_team_capacity(wedding_id_param UUID)
RETURNS TABLE(
    total_team_size INTEGER,
    total_capacity_hours DECIMAL,
    allocated_hours DECIMAL,
    remaining_capacity DECIMAL,
    capacity_utilization DECIMAL
) 
LANGUAGE plpgsql
AS $$
DECLARE
    standard_hours_per_member CONSTANT DECIMAL := 40.0;
BEGIN
    RETURN QUERY
    WITH capacity_analysis AS (
        SELECT 
            COUNT(tm.id) as team_size,
            COUNT(tm.id) * standard_hours_per_member as total_capacity,
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as allocated
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
    )
    SELECT 
        ca.team_size::INTEGER,
        ca.total_capacity,
        ca.allocated,
        (ca.total_capacity - ca.allocated) as remaining,
        CASE 
            WHEN ca.total_capacity > 0 
            THEN ROUND((ca.allocated / ca.total_capacity) * 100, 2)
            ELSE 0 
        END as utilization
    FROM capacity_analysis ca;
END;
$$;

-- Function to identify capacity bottlenecks by specialty
CREATE OR REPLACE FUNCTION identify_capacity_bottlenecks(wedding_id_param UUID)
RETURNS TABLE(
    specialty TEXT,
    overallocation_percentage DECIMAL,
    affected_tasks INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    standard_hours_per_specialty CONSTANT DECIMAL := 40.0;
BEGIN
    RETURN QUERY
    WITH specialty_workload AS (
        SELECT 
            tm.specialty,
            COUNT(tm.id) as specialist_count,
            COUNT(tm.id) * standard_hours_per_specialty as specialty_capacity,
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as allocated_hours,
            COUNT(wt.id) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_task_count
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
        AND tm.specialty IS NOT NULL
        GROUP BY tm.specialty
        HAVING COUNT(tm.id) > 0
    )
    SELECT 
        sw.specialty,
        ROUND(
            CASE 
                WHEN sw.specialty_capacity > 0 
                THEN ((sw.allocated_hours - sw.specialty_capacity) / sw.specialty_capacity) * 100
                ELSE 0 
            END, 
            2
        ) as overallocation_pct,
        sw.active_task_count::INTEGER
    FROM specialty_workload sw
    WHERE sw.allocated_hours > sw.specialty_capacity
    ORDER BY overallocation_pct DESC;
END;
$$;

-- Function to get workload trends over time
CREATE OR REPLACE FUNCTION get_workload_trends(wedding_id_param UUID, days_param INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    total_active_tasks INTEGER,
    average_workload_score DECIMAL,
    team_utilization DECIMAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '1 day' * days_param,
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE as trend_date
    ),
    daily_metrics AS (
        SELECT 
            ds.trend_date,
            COUNT(wt.id) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_tasks,
            COUNT(DISTINCT tm.id) as team_count,
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as daily_allocated_hours
        FROM date_series ds
        LEFT JOIN workflow_tasks wt ON DATE(wt.created_at) <= ds.trend_date
        LEFT JOIN team_members tm ON wt.assigned_to = tm.id
        WHERE tm.wedding_id = wedding_id_param OR tm.wedding_id IS NULL
        GROUP BY ds.trend_date
    )
    SELECT 
        dm.trend_date,
        dm.active_tasks::INTEGER,
        ROUND(
            CASE 
                WHEN dm.team_count > 0 
                THEN dm.daily_allocated_hours / dm.team_count 
                ELSE 0 
            END, 
            2
        ) as avg_workload,
        ROUND(
            CASE 
                WHEN dm.team_count > 0 
                THEN (dm.daily_allocated_hours / (dm.team_count * 40.0)) * 100
                ELSE 0 
            END, 
            2
        ) as utilization
    FROM daily_metrics dm
    ORDER BY dm.trend_date;
END;
$$;

-- Function to suggest optimal task assignments
CREATE OR REPLACE FUNCTION suggest_task_assignment(
    wedding_id_param UUID,
    task_category_param TEXT,
    priority_param TEXT,
    estimated_hours_param DECIMAL
)
RETURNS TABLE(
    team_member_id UUID,
    team_member_name TEXT,
    confidence_score DECIMAL,
    current_workload_score DECIMAL,
    specialty_match BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH member_suitability AS (
        SELECT 
            tm.id,
            tm.name,
            tm.role,
            tm.specialty,
            -- Calculate current workload
            COALESCE(SUM(
                CASE 
                    WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                    THEN wt.estimated_hours 
                    ELSE 0 
                END
            ), 0) as current_hours,
            COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_task_count,
            COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_count,
            -- Specialty match
            (tm.specialty = task_category_param OR tm.role IN ('admin', 'coordinator')) as specialty_match,
            -- Completion rate
            CASE 
                WHEN COUNT(wt.id) > 0 
                THEN (COUNT(*) FILTER (WHERE wt.status = 'completed')::DECIMAL / COUNT(wt.id)::DECIMAL) * 100
                ELSE 100 
            END as completion_rate
        FROM team_members tm
        LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
        WHERE tm.wedding_id = wedding_id_param
        GROUP BY tm.id, tm.name, tm.role, tm.specialty
    ),
    confidence_calculation AS (
        SELECT 
            ms.*,
            -- Base confidence calculation
            (
                50.0 + -- Base score
                CASE WHEN ms.specialty_match THEN 30.0 ELSE 0.0 END + -- Specialty bonus
                CASE WHEN ms.current_hours < 20 THEN 20.0 
                     WHEN ms.current_hours < 35 THEN 10.0 
                     ELSE -10.0 END + -- Availability bonus/penalty
                CASE WHEN ms.overdue_count = 0 THEN 10.0 ELSE -20.0 END + -- Overdue penalty
                (ms.completion_rate * 0.2) -- Completion rate bonus
            ) as confidence
        FROM member_suitability ms
    )
    SELECT 
        cc.id,
        cc.name,
        GREATEST(0, LEAST(100, ROUND(cc.confidence, 2))) as confidence_score,
        ROUND(cc.current_hours + (cc.active_task_count * 2.0) + (cc.overdue_count * 5.0), 2) as workload_score,
        cc.specialty_match
    FROM confidence_calculation cc
    WHERE cc.confidence > 0
    ORDER BY confidence DESC, cc.current_hours ASC
    LIMIT 5;
END;
$$;

-- View for team performance dashboard
CREATE OR REPLACE VIEW team_performance_dashboard AS
SELECT 
    tm.wedding_id,
    tm.id as team_member_id,
    tm.name as team_member_name,
    tm.role,
    tm.specialty,
    COUNT(wt.id) as total_tasks,
    COUNT(*) FILTER (WHERE wt.status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_tasks,
    COUNT(*) FILTER (WHERE wt.deadline < NOW() AND wt.status != 'completed') as overdue_tasks,
    COALESCE(SUM(wt.estimated_hours), 0) as total_estimated_hours,
    ROUND(
        CASE 
            WHEN COUNT(wt.id) > 0 
            THEN (COUNT(*) FILTER (WHERE wt.status = 'completed')::DECIMAL / COUNT(wt.id)::DECIMAL) * 100
            ELSE 0 
        END, 
        2
    ) as completion_rate,
    ROUND(
        AVG(CASE 
            WHEN wt.status = 'completed' AND wt.completed_at IS NOT NULL AND wt.started_at IS NOT NULL
            THEN EXTRACT(DAY FROM wt.completed_at - wt.started_at)
            ELSE NULL 
        END), 
        2
    ) as avg_completion_days
FROM team_members tm
LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
GROUP BY tm.wedding_id, tm.id, tm.name, tm.role, tm.specialty;

-- Materialized view for workload metrics (refreshed periodically)
CREATE MATERIALIZED VIEW workload_metrics_cache AS
SELECT 
    tm.wedding_id,
    tm.id as team_member_id,
    tm.name as team_member_name,
    tm.role,
    tm.specialty,
    -- Current workload
    COUNT(*) FILTER (WHERE wt.status IN ('pending', 'in_progress', 'on_hold')) as active_tasks,
    COALESCE(SUM(CASE 
        WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
        THEN wt.estimated_hours 
        ELSE 0 
    END), 0) as remaining_hours,
    -- Capacity utilization
    ROUND(
        CASE 
            WHEN 40.0 > 0 
            THEN (COALESCE(SUM(CASE 
                WHEN wt.status IN ('pending', 'in_progress', 'on_hold') 
                THEN wt.estimated_hours 
                ELSE 0 
            END), 0) / 40.0) * 100
            ELSE 0 
        END, 
        2
    ) as capacity_utilization,
    -- Last updated
    NOW() as last_updated
FROM team_members tm
LEFT JOIN workflow_tasks wt ON tm.id = wt.assigned_to
GROUP BY tm.wedding_id, tm.id, tm.name, tm.role, tm.specialty;

-- Create index on materialized view
CREATE UNIQUE INDEX workload_metrics_cache_pkey ON workload_metrics_cache (wedding_id, team_member_id);

-- Function to refresh workload metrics cache
CREATE OR REPLACE FUNCTION refresh_workload_metrics_cache()
RETURNS VOID
LANGUAGE sql
AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY workload_metrics_cache;
$$;

-- Grant permissions
GRANT SELECT ON team_performance_dashboard TO authenticated;
GRANT SELECT ON workload_metrics_cache TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_workload_metrics_cache() TO authenticated;

-- Create a trigger to refresh the cache when tasks are updated
CREATE OR REPLACE FUNCTION trigger_workload_cache_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Schedule cache refresh (in a real system, this would queue a background job)
    PERFORM pg_notify('workload_cache_refresh', NEW.wedding_id::TEXT);
    RETURN NEW;
END;
$$;

CREATE TRIGGER workload_cache_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_workload_cache_refresh();

-- Initial data refresh
SELECT refresh_workload_metrics_cache();