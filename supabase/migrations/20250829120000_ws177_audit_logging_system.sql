-- WS-177 Audit Logging System - Team B Backend Audit Engine
-- ============================================================================
-- Creates comprehensive audit logging infrastructure for wedding business
-- Supports compliance requirements, security monitoring, and business analytics
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE public.audit_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and organizational context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Core audit information
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    
    -- Request/response metadata stored as JSONB for flexibility
    metadata JSONB DEFAULT '{}' NOT NULL,
    
    -- Network and client information
    ip_address INET,
    user_agent TEXT,
    
    -- Timing and performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    duration_ms INTEGER,
    response_status INTEGER,
    
    -- Wedding-specific context
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    wedding_id UUID,
    supplier_id UUID,
    guest_id UUID,
    task_id UUID,
    
    -- Security and compliance
    sensitivity_level VARCHAR(20) DEFAULT 'internal',
    business_impact VARCHAR(30) DEFAULT 'low',
    compliance_relevant BOOLEAN DEFAULT false,
    
    -- Performance optimization
    event_hash VARCHAR(64), -- For deduplication
    batch_id UUID -- For batch processing
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Primary query patterns
CREATE INDEX idx_audit_logs_user_created_at ON public.audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_organization_created_at ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_created_at ON public.audit_logs(action, created_at DESC);

-- Security monitoring indexes
CREATE INDEX idx_audit_logs_ip_created_at ON public.audit_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_audit_logs_suspicious ON public.audit_logs(created_at DESC) 
WHERE (metadata->'security_flags'->>'suspicious_activity')::boolean = true;

-- Wedding business context indexes
CREATE INDEX idx_audit_logs_client_created_at ON public.audit_logs(client_id, created_at DESC) WHERE client_id IS NOT NULL;
CREATE INDEX idx_audit_logs_wedding_created_at ON public.audit_logs(wedding_id, created_at DESC) WHERE wedding_id IS NOT NULL;
CREATE INDEX idx_audit_logs_supplier_created_at ON public.audit_logs(supplier_id, created_at DESC) WHERE supplier_id IS NOT NULL;

-- Compliance and security indexes
CREATE INDEX idx_audit_logs_compliance ON public.audit_logs(created_at DESC) WHERE compliance_relevant = true;
CREATE INDEX idx_audit_logs_high_impact ON public.audit_logs(created_at DESC) 
WHERE business_impact IN ('high', 'critical', 'wedding_day_critical');

-- Performance analysis indexes
CREATE INDEX idx_audit_logs_slow_operations ON public.audit_logs(action, duration_ms DESC) WHERE duration_ms > 1000;
CREATE INDEX idx_audit_logs_failed_operations ON public.audit_logs(created_at DESC) WHERE response_status >= 400;

-- JSONB indexes for metadata queries
CREATE INDEX idx_audit_logs_metadata_gin ON public.audit_logs USING gin(metadata);
CREATE INDEX idx_audit_logs_resource_metadata ON public.audit_logs(resource_type, (metadata->>'resource_name'));

-- Batch processing optimization
CREATE INDEX idx_audit_logs_batch_processing ON public.audit_logs(batch_id, created_at) WHERE batch_id IS NOT NULL;

-- ============================================================================
-- SECURITY PATTERN ANALYSIS TABLE
-- ============================================================================

CREATE TABLE public.security_pattern_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    event_count INTEGER NOT NULL CHECK (event_count > 0),
    time_window_minutes INTEGER NOT NULL CHECK (time_window_minutes > 0),
    severity VARCHAR(20) NOT NULL DEFAULT 'low',
    description TEXT NOT NULL,
    affected_users TEXT[] DEFAULT ARRAY[]::TEXT[],
    recommended_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Analysis metadata
    analysis_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Organizational context
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Alert status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive'))
);

-- Security pattern analysis indexes
CREATE INDEX idx_security_patterns_org_created ON public.security_pattern_analysis(organization_id, created_at DESC);
CREATE INDEX idx_security_patterns_active ON public.security_pattern_analysis(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_security_patterns_severity ON public.security_pattern_analysis(severity, created_at DESC);
CREATE INDEX idx_security_patterns_type ON public.security_pattern_analysis(pattern_type, created_at DESC);

-- ============================================================================
-- AUDIT LOG RETENTION AND ARCHIVAL
-- ============================================================================

CREATE TABLE public.audit_logs_archive (
    LIKE public.audit_logs INCLUDING ALL
);

-- Create monthly partitions for archive (example for future implementation)
-- Note: Actual partitioning would be implemented via PostgreSQL partitioning

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on audit logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_pattern_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see audit logs from their organization
CREATE POLICY "audit_logs_organization_access" 
ON public.audit_logs FOR SELECT 
USING (
    organization_id IN (
        SELECT org.id 
        FROM public.organizations org
        JOIN public.user_profiles up ON up.organization_id = org.id
        WHERE up.user_id = auth.uid()
    )
);

-- Policy: Service role can insert audit logs (for system logging)
CREATE POLICY "audit_logs_service_insert" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true); -- Service role bypasses this anyway

-- Policy: Only admin users can access security pattern analysis
CREATE POLICY "security_patterns_admin_access" 
ON public.security_pattern_analysis FOR ALL 
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles up 
        WHERE up.user_id = auth.uid() 
        AND up.role IN ('admin', 'super_admin')
        AND up.organization_id = security_pattern_analysis.organization_id
    )
);

-- ============================================================================
-- AUDIT LOGGING FUNCTIONS
-- ============================================================================

-- Function to clean up old audit logs (for data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Move old records to archive
    INSERT INTO public.audit_logs_archive 
    SELECT * FROM public.audit_logs 
    WHERE created_at < cutoff_date;
    
    -- Delete old records from main table
    DELETE FROM public.audit_logs 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to calculate risk scores for audit events
CREATE OR REPLACE FUNCTION public.calculate_audit_risk_score(
    action_type VARCHAR,
    resource_type VARCHAR,
    metadata_json JSONB,
    user_context JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER
IMMUTABLE
LANGUAGE plpgsql
AS $$
DECLARE
    base_score INTEGER := 0;
    risk_score INTEGER := 0;
BEGIN
    -- Base risk scores by action type
    CASE action_type
        WHEN 'guest.dietary_requirements_access' THEN base_score := 60;
        WHEN 'guest.personal_data_export' THEN base_score := 80;
        WHEN 'vendor.client_data_access' THEN base_score := 50;
        WHEN 'data.bulk_export' THEN base_score := 90;
        WHEN 'auth.privileged_access_grant' THEN base_score := 95;
        WHEN 'system.audit_log_access' THEN base_score := 85;
        ELSE base_score := 20;
    END CASE;
    
    -- Adjust for security flags
    IF (metadata_json->'security_flags'->>'suspicious_activity')::boolean = true THEN
        base_score := base_score + 30;
    END IF;
    
    IF (metadata_json->'security_flags'->>'rate_limited')::boolean = true THEN
        base_score := base_score + 15;
    END IF;
    
    IF (metadata_json->'security_flags'->>'bulk_operation')::boolean = true THEN
        base_score := base_score + 20;
    END IF;
    
    -- Adjust for business context
    IF (metadata_json->'business_context'->>'compliance_relevant')::boolean = true THEN
        base_score := base_score + 10;
    END IF;
    
    -- Cap the risk score
    risk_score := LEAST(base_score, 100);
    
    RETURN risk_score;
END;
$$;

-- Function to detect suspicious patterns (simplified version)
CREATE OR REPLACE FUNCTION public.detect_suspicious_audit_patterns()
RETURNS TABLE (
    pattern_type VARCHAR,
    event_count BIGINT,
    confidence_score DECIMAL,
    affected_users TEXT[],
    severity VARCHAR
)
SECURITY DEFINER
LANGUAGE sql
AS $$
    -- Rapid guest data access pattern
    SELECT 
        'rapid_guest_data_access'::VARCHAR as pattern_type,
        COUNT(*)::BIGINT as event_count,
        CASE 
            WHEN COUNT(*) > 50 THEN 95.0
            WHEN COUNT(*) > 20 THEN 80.0
            WHEN COUNT(*) > 10 THEN 60.0
            ELSE 30.0
        END::DECIMAL as confidence_score,
        array_agg(DISTINCT user_id::TEXT) as affected_users,
        CASE 
            WHEN COUNT(*) > 50 THEN 'critical'
            WHEN COUNT(*) > 20 THEN 'high'
            ELSE 'medium'
        END::VARCHAR as severity
    FROM public.audit_logs
    WHERE action LIKE 'guest.%'
        AND created_at >= NOW() - INTERVAL '1 hour'
        AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 10

    UNION ALL

    -- Failed authentication cluster
    SELECT 
        'failed_authentication_cluster'::VARCHAR as pattern_type,
        COUNT(*)::BIGINT as event_count,
        CASE 
            WHEN COUNT(*) > 10 THEN 90.0
            WHEN COUNT(*) > 5 THEN 70.0
            ELSE 40.0
        END::DECIMAL as confidence_score,
        array_agg(DISTINCT ip_address::TEXT) as affected_users,
        CASE 
            WHEN COUNT(*) > 10 THEN 'high'
            ELSE 'medium'
        END::VARCHAR as severity
    FROM public.audit_logs
    WHERE response_status = 401
        AND created_at >= NOW() - INTERVAL '30 minutes'
        AND ip_address IS NOT NULL
    GROUP BY ip_address
    HAVING COUNT(*) > 3;
$$;

-- ============================================================================
-- TRIGGERS AND AUTOMATION
-- ============================================================================

-- Trigger function to automatically calculate risk scores
CREATE OR REPLACE FUNCTION public.audit_log_risk_calculation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate and store risk score in metadata
    NEW.metadata = NEW.metadata || jsonb_build_object(
        'risk_score', 
        public.calculate_audit_risk_score(
            NEW.action,
            NEW.resource_type,
            NEW.metadata,
            '{}'::jsonb
        )
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for risk calculation
CREATE TRIGGER trigger_audit_log_risk_calculation
    BEFORE INSERT ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_log_risk_calculation();

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for audit log performance metrics
CREATE OR REPLACE VIEW public.audit_performance_metrics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_events,
    AVG(duration_ms) as avg_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
    COUNT(*) FILTER (WHERE response_status >= 400) as error_count,
    COUNT(*) FILTER (WHERE (metadata->'security_flags'->>'suspicious_activity')::boolean = true) as suspicious_count
FROM public.audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- View for wedding business audit summary
CREATE OR REPLACE VIEW public.wedding_audit_summary AS
SELECT 
    c.id as client_id,
    c.company_name,
    COUNT(*) as total_events,
    COUNT(DISTINCT al.user_id) as unique_users,
    COUNT(*) FILTER (WHERE al.action LIKE 'guest.%') as guest_related_events,
    COUNT(*) FILTER (WHERE al.action LIKE 'vendor.%') as vendor_related_events,
    COUNT(*) FILTER (WHERE al.action LIKE 'task.%') as task_related_events,
    COUNT(*) FILTER (WHERE al.compliance_relevant = true) as compliance_events,
    MAX(al.created_at) as last_activity
FROM public.audit_logs al
JOIN public.clients c ON c.id = al.client_id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
GROUP BY c.id, c.company_name
ORDER BY total_events DESC;

-- ============================================================================
-- DATA SEEDING AND INITIAL SETUP
-- ============================================================================

-- Insert initial configuration data
INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    metadata,
    sensitivity_level,
    business_impact
) VALUES (
    NULL, -- System action
    NULL,
    'system.audit_system_initialize',
    'audit_trail',
    jsonb_build_object(
        'system_info', jsonb_build_object(
            'migration_version', '20250829120000',
            'feature_id', 'WS-177',
            'team', 'Team B',
            'initialization_time', NOW()
        ),
        'security_flags', jsonb_build_object(
            'suspicious_activity', false,
            'system_event', true
        )
    ),
    'internal',
    'low'
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.audit_logs IS 'WS-177: Comprehensive audit logging for wedding business operations, compliance, and security monitoring';
COMMENT ON TABLE public.security_pattern_analysis IS 'WS-177: Security pattern detection and analysis results for proactive threat identification';

COMMENT ON COLUMN public.audit_logs.action IS 'Structured action identifier (e.g., guest.dietary_requirements_access)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource being accessed (e.g., guest_profile, vendor_contract)';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Flexible JSONB storage for request/response data, security flags, and business context';
COMMENT ON COLUMN public.audit_logs.wedding_id IS 'Wedding identifier for business context (may not correspond to a table)';
COMMENT ON COLUMN public.audit_logs.sensitivity_level IS 'Data sensitivity classification for compliance';
COMMENT ON COLUMN public.audit_logs.business_impact IS 'Business impact level for prioritization';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.security_pattern_analysis TO authenticated;
GRANT SELECT ON public.audit_performance_metrics TO authenticated;
GRANT SELECT ON public.wedding_audit_summary TO authenticated;

-- Service role gets full access for logging
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.security_pattern_analysis TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'WS-177 Audit Logging System migration completed successfully';
    RAISE NOTICE 'Created tables: audit_logs, security_pattern_analysis';
    RAISE NOTICE 'Created % indexes for performance optimization', (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE tablename IN ('audit_logs', 'security_pattern_analysis')
        AND schemaname = 'public'
    );
    RAISE NOTICE 'Enabled Row Level Security policies for data protection';
    RAISE NOTICE 'Team B backend audit engine ready for integration';
END $$;