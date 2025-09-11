-- WS-148: Advanced Data Encryption System
-- Zero-knowledge architecture for client data protection

-- Create encryption schema
CREATE SCHEMA IF NOT EXISTS encryption;

-- Core encryption infrastructure
CREATE TABLE encryption.user_encryption_keys (
    user_id UUID REFERENCES user_profiles(id) PRIMARY KEY,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    salt BYTEA NOT NULL,
    key_version INTEGER DEFAULT 1,
    algorithm TEXT DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'deprecated'))
);

-- Field-level encryption mapping
CREATE TABLE encryption.encrypted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_key_id UUID REFERENCES encryption.user_encryption_keys(user_id),
    nonce BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, column_name, record_id)
);

-- Crypto-shredding for GDPR compliance
CREATE TABLE encryption.shredded_keys (
    user_id UUID PRIMARY KEY,
    shredded_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    performed_by UUID REFERENCES user_profiles(id)
);

-- Audit trail for encryption operations
CREATE TABLE encryption.encryption_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    operation TEXT NOT NULL,
    field_reference TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key rotation history
CREATE TABLE encryption.key_rotation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    from_version INTEGER NOT NULL,
    to_version INTEGER NOT NULL,
    fields_rotated INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_details TEXT
);

-- Encryption performance metrics
CREATE TABLE encryption.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL,
    table_name TEXT,
    field_name TEXT,
    data_size_bytes INTEGER,
    encryption_time_ms INTEGER,
    user_id UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_encrypted_fields_table_record ON encryption.encrypted_fields(table_name, record_id);
CREATE INDEX idx_encrypted_fields_key_id ON encryption.encrypted_fields(encryption_key_id);
CREATE INDEX idx_encryption_audit_user_operation ON encryption.encryption_audit(user_id, operation, created_at DESC);
CREATE INDEX idx_key_rotation_history_user ON encryption.key_rotation_history(user_id, status);
CREATE INDEX idx_performance_metrics_operation ON encryption.performance_metrics(operation_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE encryption.user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.encrypted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.shredded_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.encryption_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.key_rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_encryption_keys
CREATE POLICY "Users can only access own keys" ON encryption.user_encryption_keys
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for encrypted_fields
CREATE POLICY "Access encrypted data with valid key" ON encryption.encrypted_fields
    FOR ALL USING (
        encryption_key_id IN (
            SELECT user_id FROM encryption.user_encryption_keys 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- RLS Policies for shredded_keys (read-only for admins)
CREATE POLICY "Admins can view shredded keys" ON encryption.shredded_keys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for encryption_audit
CREATE POLICY "Users can view own audit logs" ON encryption.encryption_audit
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON encryption.encryption_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for key_rotation_history
CREATE POLICY "Users can view own rotation history" ON encryption.key_rotation_history
    FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for performance_metrics (admin only)
CREATE POLICY "Admins can view performance metrics" ON encryption.performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to verify crypto-shredding
CREATE OR REPLACE FUNCTION encryption.verify_crypto_shred(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'keys_shredded', EXISTS(SELECT 1 FROM encryption.shredded_keys WHERE user_id = target_user_id),
        'active_keys', EXISTS(SELECT 1 FROM encryption.user_encryption_keys WHERE user_id = target_user_id AND status = 'active'),
        'encrypted_fields_count', (SELECT COUNT(*) FROM encryption.encrypted_fields WHERE encryption_key_id = target_user_id),
        'data_recoverable', NOT EXISTS(SELECT 1 FROM encryption.shredded_keys WHERE user_id = target_user_id)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get encryption statistics
CREATE OR REPLACE FUNCTION encryption.get_encryption_stats()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_encrypted_fields', (SELECT COUNT(*) FROM encryption.encrypted_fields),
        'active_users', (SELECT COUNT(DISTINCT user_id) FROM encryption.user_encryption_keys WHERE status = 'active'),
        'keys_rotated_last_30_days', (SELECT COUNT(*) FROM encryption.key_rotation_history WHERE completed_at > NOW() - INTERVAL '30 days'),
        'shredded_accounts', (SELECT COUNT(*) FROM encryption.shredded_keys),
        'avg_encryption_time_ms', (SELECT AVG(encryption_time_ms) FROM encryption.performance_metrics WHERE operation_type = 'encrypt'),
        'avg_decryption_time_ms', (SELECT AVG(encryption_time_ms) FROM encryption.performance_metrics WHERE operation_type = 'decrypt')
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA encryption TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA encryption TO authenticated;
GRANT INSERT, UPDATE ON encryption.user_encryption_keys TO authenticated;
GRANT INSERT ON encryption.encrypted_fields TO authenticated;
GRANT INSERT ON encryption.encryption_audit TO authenticated;
GRANT INSERT ON encryption.performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION encryption.verify_crypto_shred TO authenticated;
GRANT EXECUTE ON FUNCTION encryption.get_encryption_stats TO admin;