-- WS-172: Offline Sync System Migration
-- Team B - Round 3 - Batch 21
-- Date: 2025-08-28

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sync Queue Management
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID,
    action VARCHAR(10) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    data JSONB,
    original_data JSONB, -- For conflict resolution
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed', 'conflict')),
    retry_count INTEGER DEFAULT 0,
    retry_after TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    conflict_resolution JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync Status Tracking per User
CREATE TABLE IF NOT EXISTS offline_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    organization_id UUID,
    last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_in_progress BOOLEAN DEFAULT FALSE,
    queued_items_count INTEGER DEFAULT 0,
    failed_items_count INTEGER DEFAULT 0,
    last_successful_sync TIMESTAMP WITH TIME ZONE,
    sync_session_id UUID,
    device_id VARCHAR(100),
    app_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conflict Resolution Log
CREATE TABLE IF NOT EXISTS sync_conflict_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_queue_id UUID REFERENCES offline_sync_queue(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    client_data JSONB NOT NULL,
    server_data JSONB NOT NULL,
    resolution_strategy VARCHAR(30) NOT NULL CHECK (resolution_strategy IN ('client_wins', 'server_wins', 'merge', 'manual')),
    resolved_data JSONB,
    resolution_applied BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync Performance Metrics
CREATE TABLE IF NOT EXISTS sync_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    sync_session_id UUID NOT NULL,
    batch_size INTEGER NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    items_synced INTEGER NOT NULL,
    conflicts_detected INTEGER DEFAULT 0,
    failures_count INTEGER DEFAULT 0,
    throughput_per_second DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_sync_queue_user_status ON offline_sync_queue(user_id, sync_status);
CREATE INDEX idx_sync_queue_timestamp ON offline_sync_queue(timestamp);
CREATE INDEX idx_sync_queue_table_record ON offline_sync_queue(table_name, record_id);
CREATE INDEX idx_sync_queue_retry_after ON offline_sync_queue(retry_after) WHERE retry_after IS NOT NULL;
CREATE INDEX idx_sync_status_user_id ON offline_sync_status(user_id);
CREATE INDEX idx_sync_conflict_session ON sync_conflict_log(sync_queue_id, resolved_at);
CREATE INDEX idx_sync_metrics_session ON sync_performance_metrics(sync_session_id);
CREATE INDEX idx_sync_metrics_user_time ON sync_performance_metrics(user_id, created_at);

-- RLS Policies for security
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflict_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Sync Queue Policies
CREATE POLICY "Users can access their own sync queue items"
ON offline_sync_queue FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Organization members can access sync queue"
ON offline_sync_queue FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = offline_sync_queue.organization_id
    )
);

-- Sync Status Policies
CREATE POLICY "Users can access their own sync status"
ON offline_sync_status FOR ALL
USING (auth.uid() = user_id);

-- Conflict Log Policies  
CREATE POLICY "Users can access their own conflict logs"
ON sync_conflict_log FOR ALL
USING (auth.uid() = user_id);

-- Metrics Policies
CREATE POLICY "Users can access their own sync metrics"
ON sync_performance_metrics FOR ALL
USING (auth.uid() = user_id);

-- Functions for sync processing

-- Update sync status function
CREATE OR REPLACE FUNCTION update_sync_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update queued items count
    UPDATE offline_sync_status 
    SET 
        queued_items_count = (
            SELECT COUNT(*) 
            FROM offline_sync_queue 
            WHERE user_id = NEW.user_id 
            AND sync_status = 'pending'
        ),
        failed_items_count = (
            SELECT COUNT(*) 
            FROM offline_sync_queue 
            WHERE user_id = NEW.user_id 
            AND sync_status = 'failed'
        ),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- If no status record exists, create one
    INSERT INTO offline_sync_status (user_id, organization_id, queued_items_count, failed_items_count)
    SELECT NEW.user_id, NEW.organization_id, 1, 0
    WHERE NOT EXISTS (SELECT 1 FROM offline_sync_status WHERE user_id = NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating sync status
CREATE TRIGGER trigger_update_sync_status
    AFTER INSERT OR UPDATE ON offline_sync_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_status();

-- Conflict detection function
CREATE OR REPLACE FUNCTION detect_sync_conflicts(
    p_user_id UUID,
    p_table_name VARCHAR,
    p_record_id UUID,
    p_client_data JSONB,
    p_client_timestamp TIMESTAMP WITH TIME ZONE
) RETURNS JSONB AS $$
DECLARE
    server_record RECORD;
    conflict_detected BOOLEAN := FALSE;
    conflict_fields JSONB := '[]'::jsonb;
    result JSONB;
BEGIN
    -- Get server version of the record based on table
    CASE p_table_name
        WHEN 'clients' THEN
            SELECT * INTO server_record FROM clients WHERE id = p_record_id AND user_id = p_user_id;
        WHEN 'timeline_items' THEN
            SELECT * INTO server_record FROM timeline_items WHERE id = p_record_id;
        WHEN 'vendor_contacts' THEN
            SELECT * INTO server_record FROM vendor_contacts WHERE id = p_record_id;
        ELSE
            RAISE EXCEPTION 'Unsupported table for sync: %', p_table_name;
    END CASE;
    
    -- If record doesn't exist on server, no conflict
    IF server_record IS NULL THEN
        RETURN jsonb_build_object(
            'has_conflict', FALSE,
            'conflict_type', 'none'
        );
    END IF;
    
    -- Compare timestamps (if available)
    IF server_record.updated_at > p_client_timestamp THEN
        conflict_detected := TRUE;
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'has_conflict', conflict_detected,
        'conflict_type', CASE 
            WHEN conflict_detected THEN 'timestamp_conflict'
            ELSE 'none'
        END,
        'server_data', to_jsonb(server_record),
        'server_timestamp', server_record.updated_at,
        'client_timestamp', p_client_timestamp
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch sync processing function
CREATE OR REPLACE FUNCTION process_sync_batch(
    p_user_id UUID,
    p_batch_size INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    sync_item RECORD;
    processed_count INTEGER := 0;
    success_count INTEGER := 0;
    failure_count INTEGER := 0;
    conflict_count INTEGER := 0;
    batch_start_time TIMESTAMP := clock_timestamp();
    session_id UUID := uuid_generate_v4();
    result JSONB;
BEGIN
    -- Mark sync as in progress
    UPDATE offline_sync_status 
    SET sync_in_progress = TRUE, sync_session_id = session_id
    WHERE user_id = p_user_id;
    
    -- Process batch of sync items
    FOR sync_item IN 
        SELECT * FROM offline_sync_queue 
        WHERE user_id = p_user_id 
        AND sync_status = 'pending'
        ORDER BY timestamp ASC
        LIMIT p_batch_size
    LOOP
        processed_count := processed_count + 1;
        
        BEGIN
            -- Detect conflicts first
            DECLARE
                conflict_result JSONB;
            BEGIN
                conflict_result := detect_sync_conflicts(
                    sync_item.user_id,
                    sync_item.table_name,
                    sync_item.record_id,
                    sync_item.data,
                    sync_item.client_timestamp
                );
                
                -- If conflict detected, log it
                IF (conflict_result->>'has_conflict')::boolean THEN
                    INSERT INTO sync_conflict_log (
                        sync_queue_id, user_id, table_name, record_id,
                        client_data, server_data, resolution_strategy
                    ) VALUES (
                        sync_item.id, sync_item.user_id, sync_item.table_name, 
                        sync_item.record_id, sync_item.data,
                        conflict_result->'server_data', 'server_wins'
                    );
                    
                    UPDATE offline_sync_queue 
                    SET sync_status = 'conflict', conflict_resolution = conflict_result
                    WHERE id = sync_item.id;
                    
                    conflict_count := conflict_count + 1;
                    CONTINUE;
                END IF;
            END;
            
            -- Apply the sync operation (simplified for demo)
            -- In production, this would handle actual table operations
            UPDATE offline_sync_queue 
            SET sync_status = 'completed', updated_at = NOW()
            WHERE id = sync_item.id;
            
            success_count := success_count + 1;
            
        EXCEPTION WHEN others THEN
            -- Log the failure
            UPDATE offline_sync_queue 
            SET 
                sync_status = 'failed',
                retry_count = retry_count + 1,
                retry_after = NOW() + INTERVAL '5 minutes' * power(2, retry_count),
                error_message = SQLERRM,
                updated_at = NOW()
            WHERE id = sync_item.id;
            
            failure_count := failure_count + 1;
        END;
    END LOOP;
    
    -- Record performance metrics
    INSERT INTO sync_performance_metrics (
        user_id, sync_session_id, batch_size, processing_time_ms,
        items_synced, conflicts_detected, failures_count, throughput_per_second
    ) VALUES (
        p_user_id, session_id, p_batch_size,
        EXTRACT(EPOCH FROM (clock_timestamp() - batch_start_time)) * 1000,
        processed_count, conflict_count, failure_count,
        CASE 
            WHEN processed_count > 0 AND EXTRACT(EPOCH FROM (clock_timestamp() - batch_start_time)) > 0
            THEN processed_count / EXTRACT(EPOCH FROM (clock_timestamp() - batch_start_time))
            ELSE 0
        END
    );
    
    -- Update sync status
    UPDATE offline_sync_status 
    SET 
        sync_in_progress = FALSE,
        last_sync_time = NOW(),
        last_successful_sync = CASE WHEN success_count > 0 THEN NOW() ELSE last_successful_sync END,
        sync_session_id = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Build result
    result := jsonb_build_object(
        'success', TRUE,
        'session_id', session_id,
        'processed_count', processed_count,
        'success_count', success_count,
        'failure_count', failure_count,
        'conflict_count', conflict_count,
        'processing_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - batch_start_time)) * 1000
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sync status for user
CREATE OR REPLACE FUNCTION get_user_sync_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    status_record RECORD;
    result JSONB;
BEGIN
    SELECT * INTO status_record
    FROM offline_sync_status 
    WHERE user_id = p_user_id;
    
    IF status_record IS NULL THEN
        -- Initialize status if doesn't exist
        INSERT INTO offline_sync_status (user_id, queued_items_count, failed_items_count)
        VALUES (p_user_id, 0, 0);
        
        result := jsonb_build_object(
            'user_id', p_user_id,
            'last_sync_time', NULL,
            'sync_in_progress', FALSE,
            'queued_items', 0,
            'failed_items', 0,
            'last_successful_sync', NULL
        );
    ELSE
        result := jsonb_build_object(
            'user_id', status_record.user_id,
            'last_sync_time', status_record.last_sync_time,
            'sync_in_progress', status_record.sync_in_progress,
            'queued_items', status_record.queued_items_count,
            'failed_items', status_record.failed_items_count,
            'last_successful_sync', status_record.last_successful_sync,
            'device_id', status_record.device_id,
            'app_version', status_record.app_version
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old sync records function
CREATE OR REPLACE FUNCTION cleanup_old_sync_records()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove completed sync queue items older than 30 days
    WITH deleted AS (
        DELETE FROM offline_sync_queue 
        WHERE sync_status = 'completed' 
        AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Remove old conflict logs (keep for 90 days)
    DELETE FROM sync_conflict_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Remove old performance metrics (keep for 30 days)
    DELETE FROM sync_performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON offline_sync_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offline_sync_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_conflict_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_performance_metrics TO authenticated;

GRANT EXECUTE ON FUNCTION detect_sync_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION process_sync_batch TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sync_records TO authenticated;

-- Create scheduled job for cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-sync-records', '0 2 * * *', 'SELECT cleanup_old_sync_records();');

COMMENT ON TABLE offline_sync_queue IS 'Stores offline sync operations waiting to be processed';
COMMENT ON TABLE offline_sync_status IS 'Tracks sync status and progress for each user';
COMMENT ON TABLE sync_conflict_log IS 'Logs and tracks resolution of sync conflicts';
COMMENT ON TABLE sync_performance_metrics IS 'Tracks sync performance metrics for optimization';