-- Migration: Custom Domains System (WS-222)
-- Description: Enterprise-grade custom domain management with DNS verification, SSL tracking, and health monitoring
-- Author: WedSync Development Team
-- Date: 2025-01-20

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Custom types for better type safety and validation
CREATE TYPE domain_status AS ENUM (
    'pending',
    'verifying',
    'verified',
    'active',
    'suspended',
    'failed',
    'expired'
);

CREATE TYPE dns_record_type AS ENUM (
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SRV',
    'PTR'
);

CREATE TYPE verification_method AS ENUM (
    'dns_txt',
    'file_upload',
    'email',
    'meta_tag',
    'cname'
);

CREATE TYPE verification_status AS ENUM (
    'pending',
    'in_progress',
    'verified',
    'failed',
    'expired'
);

CREATE TYPE ssl_status AS ENUM (
    'pending',
    'provisioning',
    'issued',
    'active',
    'expiring',
    'expired',
    'revoked',
    'failed'
);

CREATE TYPE health_check_type AS ENUM (
    'http',
    'https',
    'dns',
    'ssl',
    'performance'
);

CREATE TYPE health_status AS ENUM (
    'healthy',
    'degraded',
    'unhealthy',
    'unknown'
);

-- 1. Main domains table
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Domain information
    domain_name TEXT NOT NULL,
    subdomain TEXT, -- For subdomains like 'photos.vendor.com'
    full_domain TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN subdomain IS NOT NULL THEN subdomain || '.' || domain_name
            ELSE domain_name
        END
    ) STORED,
    
    -- Status and configuration
    status domain_status NOT NULL DEFAULT 'pending',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_wildcard BOOLEAN NOT NULL DEFAULT false,
    
    -- DNS configuration
    target_cname TEXT, -- What the domain should point to (e.g., 'wedsync.com')
    custom_ip_address INET, -- For A records
    
    -- Metadata
    notes TEXT,
    configuration JSONB DEFAULT '{}', -- Store additional config (redirects, etc.)
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT domains_domain_name_check CHECK (
        domain_name ~* '^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
    ),
    CONSTRAINT domains_subdomain_check CHECK (
        subdomain IS NULL OR subdomain ~* '^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$'
    ),
    CONSTRAINT domains_primary_unique UNIQUE (organization_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index to allow only one primary domain per organization
CREATE UNIQUE INDEX domains_organization_primary_idx 
ON domains (organization_id) 
WHERE is_primary = true;

-- 2. DNS records table
CREATE TABLE dns_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    
    -- DNS record details
    record_type dns_record_type NOT NULL,
    name TEXT NOT NULL, -- Record name (e.g., '@', 'www', 'mail')
    value TEXT NOT NULL, -- Record value
    ttl INTEGER DEFAULT 3600 CHECK (ttl >= 60 AND ttl <= 86400),
    priority INTEGER CHECK (priority >= 0 AND priority <= 65535),
    
    -- Status and validation
    is_verified BOOLEAN NOT NULL DEFAULT false,
    last_verified_at TIMESTAMPTZ,
    verification_error TEXT,
    
    -- Metadata
    managed_by_wedsync BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints based on record type
    CONSTRAINT dns_records_mx_priority CHECK (
        (record_type = 'MX' AND priority IS NOT NULL) OR 
        (record_type != 'MX' AND priority IS NULL)
    ),
    CONSTRAINT dns_records_value_format CHECK (
        CASE record_type
            WHEN 'A' THEN value ~* '^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
            WHEN 'AAAA' THEN value ~* '^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$'
            ELSE true
        END
    )
);

-- 3. SSL certificates table
CREATE TABLE ssl_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Certificate details
    certificate_authority TEXT NOT NULL DEFAULT 'Let''s Encrypt',
    certificate_type TEXT NOT NULL DEFAULT 'DV', -- DV, OV, EV
    status ssl_status NOT NULL DEFAULT 'pending',
    
    -- Certificate data (encrypted in production)
    certificate_pem TEXT, -- Full certificate chain
    private_key_pem TEXT, -- Private key (should be encrypted)
    certificate_fingerprint TEXT,
    serial_number TEXT,
    
    -- Validity periods
    issued_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    renewed_at TIMESTAMPTZ,
    
    -- Auto-renewal settings
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    renewal_threshold_days INTEGER NOT NULL DEFAULT 30,
    
    -- Tracking
    renewal_attempts INTEGER NOT NULL DEFAULT 0,
    last_renewal_attempt_at TIMESTAMPTZ,
    renewal_error TEXT,
    
    -- Metadata
    subject_alternative_names TEXT[], -- SAN entries
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ssl_certificates_validity_check CHECK (
        issued_at IS NULL OR expires_at IS NULL OR expires_at > issued_at
    ),
    CONSTRAINT ssl_certificates_renewal_threshold CHECK (
        renewal_threshold_days >= 1 AND renewal_threshold_days <= 90
    )
);

-- 4. Domain verifications table
CREATE TABLE domain_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Verification details
    verification_method verification_method NOT NULL,
    status verification_status NOT NULL DEFAULT 'pending',
    
    -- Verification tokens and data
    verification_token TEXT NOT NULL,
    verification_value TEXT, -- Expected value to find
    verification_file_path TEXT, -- For file upload method
    verification_meta_tag TEXT, -- For meta tag method
    
    -- Verification results
    verified_at TIMESTAMPTZ,
    verification_error TEXT,
    verification_response JSONB, -- Store full response for debugging
    
    -- Retry logic
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT domain_verifications_token_length CHECK (
        LENGTH(verification_token) >= 32
    ),
    CONSTRAINT domain_verifications_attempts_check CHECK (
        attempts >= 0 AND attempts <= max_attempts
    )
);

-- 5. Domain health checks table
CREATE TABLE domain_health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Health check configuration
    check_type health_check_type NOT NULL,
    endpoint_path TEXT DEFAULT '/', -- Path to check (e.g., '/health')
    expected_status_code INTEGER DEFAULT 200,
    expected_response_time_ms INTEGER DEFAULT 5000,
    
    -- Check results
    status health_status NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    
    -- Performance metrics
    dns_resolution_time_ms INTEGER,
    ssl_handshake_time_ms INTEGER,
    
    -- SSL-specific data
    ssl_cert_expires_at TIMESTAMPTZ,
    ssl_cert_issuer TEXT,
    ssl_cert_subject TEXT,
    
    -- Metadata
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_duration_ms INTEGER,
    user_agent TEXT DEFAULT 'WedSync-Health-Monitor/1.0',
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT domain_health_checks_response_time CHECK (
        response_time_ms IS NULL OR response_time_ms >= 0
    ),
    CONSTRAINT domain_health_checks_status_code CHECK (
        status_code IS NULL OR (status_code >= 100 AND status_code < 600)
    )
);

-- 6. Domain alerts table (for monitoring and notifications)
CREATE TABLE domain_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL, -- 'ssl_expiring', 'domain_down', 'dns_failure', etc.
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert data
    alert_data JSONB DEFAULT '{}',
    
    -- Status
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    
    -- Auto-resolution
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Notification tracking
    notifications_sent JSONB DEFAULT '{}', -- Track which notifications were sent
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance optimization
-- Domains table indexes
CREATE INDEX domains_organization_id_idx ON domains (organization_id);
CREATE INDEX domains_status_idx ON domains (status);
CREATE INDEX domains_full_domain_idx ON domains (full_domain);
CREATE INDEX domains_verification_status_idx ON domains (status, last_checked_at);

-- DNS records indexes  
CREATE INDEX dns_records_domain_id_idx ON dns_records (domain_id);
CREATE INDEX dns_records_type_idx ON dns_records (record_type);
CREATE INDEX dns_records_name_value_idx ON dns_records (name, value);
CREATE INDEX dns_records_verification_idx ON dns_records (is_verified, last_verified_at);

-- SSL certificates indexes
CREATE INDEX ssl_certificates_domain_id_idx ON ssl_certificates (domain_id);
CREATE INDEX ssl_certificates_status_idx ON ssl_certificates (status);
CREATE INDEX ssl_certificates_expiry_idx ON ssl_certificates (expires_at) WHERE status = 'active';
CREATE INDEX ssl_certificates_renewal_idx ON ssl_certificates (auto_renew, expires_at) WHERE auto_renew = true;

-- Domain verifications indexes
CREATE INDEX domain_verifications_domain_id_idx ON domain_verifications (domain_id);
CREATE INDEX domain_verifications_status_idx ON domain_verifications (status);
CREATE INDEX domain_verifications_token_idx ON domain_verifications (verification_token);
CREATE INDEX domain_verifications_retry_idx ON domain_verifications (status, next_retry_at) WHERE status = 'failed';

-- Health checks indexes
CREATE INDEX domain_health_checks_domain_id_idx ON domain_health_checks (domain_id);
CREATE INDEX domain_health_checks_type_status_idx ON domain_health_checks (check_type, status);
CREATE INDEX domain_health_checks_checked_at_idx ON domain_health_checks (checked_at DESC);
CREATE INDEX domain_health_checks_performance_idx ON domain_health_checks (domain_id, checked_at DESC) 
WHERE status = 'healthy';

-- Domain alerts indexes
CREATE INDEX domain_alerts_domain_id_idx ON domain_alerts (domain_id);
CREATE INDEX domain_alerts_unresolved_idx ON domain_alerts (is_resolved, severity, created_at) 
WHERE is_resolved = false;
CREATE INDEX domain_alerts_severity_idx ON domain_alerts (severity, created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains
CREATE POLICY "Users can view domains for their organization" ON domains
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can manage domains" ON domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for dns_records
CREATE POLICY "Users can view DNS records for their domains" ON dns_records
    FOR SELECT USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization owners can manage DNS records" ON dns_records
    FOR ALL USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
    );

-- RLS Policies for ssl_certificates
CREATE POLICY "Users can view SSL certificates for their domains" ON ssl_certificates
    FOR SELECT USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization owners can manage SSL certificates" ON ssl_certificates
    FOR ALL USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
    );

-- RLS Policies for domain_verifications
CREATE POLICY "Users can view verifications for their domains" ON domain_verifications
    FOR SELECT USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Organization owners can manage verifications" ON domain_verifications
    FOR ALL USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('owner', 'admin')
            )
        )
    );

-- RLS Policies for domain_health_checks
CREATE POLICY "Users can view health checks for their domains" ON domain_health_checks
    FOR SELECT USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert health check results" ON domain_health_checks
    FOR INSERT WITH CHECK (true); -- Health checks are system-generated

-- RLS Policies for domain_alerts
CREATE POLICY "Users can view alerts for their domains" ON domain_alerts
    FOR SELECT USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can acknowledge alerts for their domains" ON domain_alerts
    FOR UPDATE USING (
        domain_id IN (
            SELECT id FROM domains 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dns_records_updated_at BEFORE UPDATE ON dns_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ssl_certificates_updated_at BEFORE UPDATE ON ssl_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_verifications_updated_at BEFORE UPDATE ON domain_verifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_alerts_updated_at BEFORE UPDATE ON domain_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for domain management
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check if domain is ready for SSL provisioning
CREATE OR REPLACE FUNCTION is_domain_ready_for_ssl(domain_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    domain_record domains%ROWTYPE;
    verification_count INTEGER;
BEGIN
    -- Get domain record
    SELECT * INTO domain_record FROM domains WHERE id = domain_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if domain is verified
    IF domain_record.status != 'verified' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if we have successful DNS verification
    SELECT COUNT(*) INTO verification_count
    FROM domain_verifications 
    WHERE domain_id = domain_uuid 
    AND status = 'verified'
    AND expires_at > NOW();
    
    RETURN verification_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get domain health summary
CREATE OR REPLACE FUNCTION get_domain_health_summary(domain_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    latest_check domain_health_checks%ROWTYPE;
    ssl_cert ssl_certificates%ROWTYPE;
BEGIN
    -- Get latest health check
    SELECT * INTO latest_check 
    FROM domain_health_checks 
    WHERE domain_id = domain_uuid 
    ORDER BY checked_at DESC 
    LIMIT 1;
    
    -- Get active SSL certificate
    SELECT * INTO ssl_cert
    FROM ssl_certificates
    WHERE domain_id = domain_uuid 
    AND status = 'active'
    ORDER BY expires_at DESC
    LIMIT 1;
    
    -- Build summary
    result := jsonb_build_object(
        'domain_id', domain_uuid,
        'last_check_at', COALESCE(latest_check.checked_at, NULL),
        'status', COALESCE(latest_check.status, 'unknown'),
        'response_time_ms', latest_check.response_time_ms,
        'ssl_expires_at', ssl_cert.expires_at,
        'ssl_status', ssl_cert.status,
        'days_until_ssl_expiry', 
        CASE 
            WHEN ssl_cert.expires_at IS NOT NULL 
            THEN EXTRACT(days FROM ssl_cert.expires_at - NOW())
            ELSE NULL
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE domains IS 'Custom domains managed by organizations for white-label branding';
COMMENT ON TABLE dns_records IS 'DNS records for custom domains including A, CNAME, MX records';
COMMENT ON TABLE ssl_certificates IS 'SSL certificate lifecycle management and tracking';
COMMENT ON TABLE domain_verifications IS 'Domain ownership verification processes';
COMMENT ON TABLE domain_health_checks IS 'Automated monitoring and health checks for domains';
COMMENT ON TABLE domain_alerts IS 'Alert system for domain issues and notifications';

COMMENT ON COLUMN domains.full_domain IS 'Computed full domain name including subdomain';
COMMENT ON COLUMN domains.target_cname IS 'CNAME target for domain pointing (e.g., wedsync.com)';
COMMENT ON COLUMN ssl_certificates.private_key_pem IS 'Private key - should be encrypted in production';
COMMENT ON COLUMN ssl_certificates.renewal_threshold_days IS 'Days before expiry to trigger renewal';
COMMENT ON COLUMN domain_verifications.verification_token IS 'Unique token for domain verification';
COMMENT ON COLUMN domain_health_checks.response_time_ms IS 'HTTP response time in milliseconds';