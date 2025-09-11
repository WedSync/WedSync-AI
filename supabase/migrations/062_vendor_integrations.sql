-- WS-342 Real-Time Wedding Collaboration - Vendor Integrations Tables
-- Team C: Integration & System Architecture
-- Migration: 062_vendor_integrations.sql

BEGIN;

-- Vendor Integration Systems Table
CREATE TABLE vendor_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    system_type VARCHAR(50) NOT NULL CHECK (system_type IN (
        'photography_crm',
        'venue_management', 
        'catering_system',
        'florist_software',
        'wedding_planning',
        'booking_system',
        'payment_processor',
        'communication',
        'calendar_system'
    )),
    system_name VARCHAR(100) NOT NULL, -- e.g., 'Tave', 'Studio Ninja', 'HoneyBook'
    configuration JSONB NOT NULL DEFAULT '{}',
    credentials TEXT, -- Encrypted credentials
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'deleted')),
    capabilities JSONB DEFAULT '{}', -- Supported features and operations
    rate_limits JSONB DEFAULT '{}', -- API rate limiting information
    webhook_endpoints JSONB DEFAULT '[]', -- Webhook configuration
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(user_id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(user_id),
    
    -- Indexes for performance
    UNIQUE(organization_id, system_type, system_name)
);

-- Wedding-Vendor Integration Links
CREATE TABLE wedding_vendor_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    vendor_integration_id UUID NOT NULL REFERENCES vendor_integrations(id) ON DELETE CASCADE,
    system_type VARCHAR(50) NOT NULL,
    external_id VARCHAR(255), -- ID in the external system (e.g., Tave job ID)
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'deleted')),
    sync_settings JSONB DEFAULT '{}', -- Integration-specific sync settings
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connected_by UUID REFERENCES user_profiles(user_id),
    
    -- Ensure unique integration per wedding per system type
    UNIQUE(wedding_id, system_type, external_id)
);

-- Integration Data Flows
CREATE TABLE integration_data_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    source_system VARCHAR(100) NOT NULL,
    target_system VARCHAR(100) NOT NULL,
    flow_type VARCHAR(50) NOT NULL, -- 'sync', 'webhook', 'realtime'
    mapping_rules JSONB NOT NULL DEFAULT '{}',
    sync_frequency INTEGER DEFAULT 300, -- seconds
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    
    -- Performance tracking
    last_sync TIMESTAMP WITH TIME ZONE,
    next_sync TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration Sync Log
CREATE TABLE integration_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    systems_synced TEXT[] DEFAULT '{}',
    records_synced INTEGER DEFAULT 0,
    success BOOLEAN NOT NULL,
    conflicts_detected INTEGER DEFAULT 0,
    
    -- Sync details
    sync_results JSONB DEFAULT '{}',
    error_details JSONB,
    duration_ms INTEGER,
    
    -- Metadata
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    initiated_by UUID REFERENCES user_profiles(user_id)
);

-- Integration Conflicts
CREATE TABLE integration_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN (
        'data_mismatch',
        'timing_conflict', 
        'permission_conflict',
        'validation_failure',
        'business_rule_violation'
    )),
    source_system VARCHAR(100) NOT NULL,
    target_system VARCHAR(100) NOT NULL,
    conflicting_data JSONB NOT NULL,
    
    -- Resolution
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'escalated')),
    resolution_strategy VARCHAR(50),
    resolved_data JSONB,
    resolved_by VARCHAR(20), -- 'system' or user_id
    resolved_at TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detected_by VARCHAR(100) -- System that detected the conflict
);

-- Integration Event Queue
CREATE TABLE integration_event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical', 'emergency')),
    
    -- Processing
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    next_retry TIMESTAMP WITH TIME ZONE,
    
    -- Results
    processing_result JSONB,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Log
CREATE TABLE webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system VARCHAR(100) NOT NULL,
    event_type VARCHAR(100),
    webhook_id VARCHAR(255),
    
    -- Payload and processing
    payload JSONB NOT NULL,
    processing_result JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Security
    signature_valid BOOLEAN,
    ip_address INET,
    
    -- Timing
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms INTEGER
);

-- Vendor Activities (for tracking vendor actions)
CREATE TABLE vendor_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id VARCHAR(255) NOT NULL,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_data JSONB NOT NULL DEFAULT '{}',
    
    -- Context
    system_type VARCHAR(50),
    external_id VARCHAR(255),
    
    -- Metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration Audit Log
CREATE TABLE integration_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES vendor_integrations(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'connected', 'disconnected', 'synced', 'error', etc.
    details JSONB DEFAULT '{}',
    
    -- Metadata
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by UUID REFERENCES user_profiles(user_id),
    ip_address INET
);

-- Failed Integration Events (for retry mechanism)
CREATE TABLE failed_integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    event_data JSONB NOT NULL,
    error_message TEXT NOT NULL,
    
    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'abandoned', 'resolved')),
    
    -- Metadata
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_retry TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_vendor_integrations_org_type ON vendor_integrations(organization_id, system_type);
CREATE INDEX idx_vendor_integrations_status ON vendor_integrations(status) WHERE status != 'deleted';

CREATE INDEX idx_wedding_vendor_integrations_wedding ON wedding_vendor_integrations(wedding_id);
CREATE INDEX idx_wedding_vendor_integrations_vendor ON wedding_vendor_integrations(vendor_integration_id);
CREATE INDEX idx_wedding_vendor_integrations_external ON wedding_vendor_integrations(external_id);

CREATE INDEX idx_integration_data_flows_wedding ON integration_data_flows(wedding_id);
CREATE INDEX idx_integration_data_flows_status ON integration_data_flows(status);
CREATE INDEX idx_integration_data_flows_next_sync ON integration_data_flows(next_sync) WHERE status = 'active';

CREATE INDEX idx_integration_sync_log_wedding ON integration_sync_log(wedding_id);
CREATE INDEX idx_integration_sync_log_time ON integration_sync_log(synced_at DESC);
CREATE INDEX idx_integration_sync_log_success ON integration_sync_log(success);

CREATE INDEX idx_integration_conflicts_wedding ON integration_conflicts(wedding_id);
CREATE INDEX idx_integration_conflicts_status ON integration_conflicts(status);
CREATE INDEX idx_integration_conflicts_type ON integration_conflicts(conflict_type);

CREATE INDEX idx_integration_event_queue_scheduled ON integration_event_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX idx_integration_event_queue_wedding ON integration_event_queue(wedding_id);
CREATE INDEX idx_integration_event_queue_priority ON integration_event_queue(priority);

CREATE INDEX idx_webhook_log_source_time ON webhook_log(source_system, received_at DESC);
CREATE INDEX idx_webhook_log_success ON webhook_log(success);

CREATE INDEX idx_vendor_activities_vendor_wedding ON vendor_activities(vendor_id, wedding_id);
CREATE INDEX idx_vendor_activities_time ON vendor_activities(timestamp DESC);

CREATE INDEX idx_integration_audit_log_integration ON integration_audit_log(integration_id);
CREATE INDEX idx_integration_audit_log_time ON integration_audit_log(performed_at DESC);

CREATE INDEX idx_failed_integration_events_retry ON failed_integration_events(next_retry) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_failed_integration_events_wedding ON failed_integration_events(wedding_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE vendor_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_vendor_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_data_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_integration_events ENABLE ROW LEVEL SECURITY;

-- Vendor Integrations: Users can only see integrations for their organization
CREATE POLICY "Users can view their organization's integrations" ON vendor_integrations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's integrations" ON vendor_integrations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Wedding Vendor Integrations: Users can only see integrations for weddings they have access to
CREATE POLICY "Users can view wedding integrations" ON wedding_vendor_integrations
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM wedding_access 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage wedding integrations" ON wedding_vendor_integrations
    FOR ALL USING (
        wedding_id IN (
            SELECT wedding_id FROM wedding_access 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'coordinator')
        )
    );

-- Integration Sync Log: Users can view sync logs for their accessible weddings
CREATE POLICY "Users can view integration sync logs" ON integration_sync_log
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM wedding_access 
            WHERE user_id = auth.uid()
        )
    );

-- Integration Conflicts: Users can view conflicts for their accessible weddings
CREATE POLICY "Users can view integration conflicts" ON integration_conflicts
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM wedding_access 
            WHERE user_id = auth.uid()
        )
    );

-- Vendor Activities: Users can view activities for their accessible weddings
CREATE POLICY "Users can view vendor activities" ON vendor_activities
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM wedding_access 
            WHERE user_id = auth.uid()
        )
    );

-- Integration Audit Log: Users can view audit logs for their organization's integrations
CREATE POLICY "Users can view integration audit logs" ON integration_audit_log
    FOR SELECT USING (
        integration_id IN (
            SELECT id FROM vendor_integrations 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Webhook Log: Only system can access (no user policies needed)
-- Integration Event Queue: Only system can access (no user policies needed)
-- Failed Integration Events: Only system can access (no user policies needed)

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_vendor_integrations
    BEFORE UPDATE ON vendor_integrations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_wedding_vendor_integrations
    BEFORE UPDATE ON wedding_vendor_integrations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_integration_data_flows
    BEFORE UPDATE ON integration_data_flows
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

COMMIT;