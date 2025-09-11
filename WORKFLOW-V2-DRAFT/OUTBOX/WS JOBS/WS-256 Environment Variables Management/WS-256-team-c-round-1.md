# WS-256: Environment Variables Management System - Team C (Database Schema & Integration)

## 🎯 Team C Focus: Database Schema Design & System Integration

### 📋 Your Assignment
Design and implement the comprehensive database schema and system integrations for the Environment Variables Management System, ensuring secure storage, efficient querying, and seamless integration with WedSync's existing architecture.

### 🎪 Wedding Industry Context
Wedding suppliers depend on reliable environment configuration for critical business operations. The database must securely store API keys for payment processing (Stripe), email delivery (Resend), SMS services (Twilio), and CRM integrations (Tave, HoneyBook). Any database corruption or performance issues could cause configuration failures during peak wedding season, directly impacting payment processing, client communications, and booking systems that affect real weddings.

### 🎯 Specific Requirements

#### Core Database Schema (MUST IMPLEMENT)

1. **Environment Variables Core Tables**
   ```sql
   -- Main environment variables table
   CREATE TABLE environment_variables (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     name VARCHAR(255) NOT NULL,
     display_name VARCHAR(255),
     description TEXT,
     variable_type VARCHAR(50) NOT NULL CHECK (variable_type IN ('api_key', 'database_url', 'feature_flag', 'configuration', 'secret')),
     security_classification VARCHAR(20) NOT NULL CHECK (security_classification IN ('public', 'internal', 'confidential', 'wedding_day_critical')),
     is_required BOOLEAN DEFAULT false,
     is_wedding_critical BOOLEAN DEFAULT false, -- Critical for wedding operations
     default_value TEXT, -- For non-sensitive defaults
     validation_pattern VARCHAR(500), -- Regex for value validation
     metadata JSONB DEFAULT '{}',
     tags TEXT[] DEFAULT '{}',
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(organization_id, name)
   );

   -- Environment definitions
   CREATE TABLE environments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(id),
     name VARCHAR(100) NOT NULL, -- development, staging, production, etc.
     display_name VARCHAR(255) NOT NULL,
     description TEXT,
     environment_type VARCHAR(50) NOT NULL CHECK (environment_type IN ('development', 'testing', 'staging', 'production', 'disaster_recovery')),
     is_active BOOLEAN DEFAULT true,
     is_production BOOLEAN DEFAULT false,
     wedding_day_protection BOOLEAN DEFAULT false, -- Extra protection during wedding hours
     deployment_branch VARCHAR(255), -- Git branch associated with environment
     deployment_url TEXT, -- Environment URL
     metadata JSONB DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(organization_id, name)
   );

   -- Environment variable values (encrypted sensitive data)
   CREATE TABLE environment_variable_values (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variable_id UUID NOT NULL REFERENCES environment_variables(id),
     environment_id UUID NOT NULL REFERENCES environments(id),
     encrypted_value TEXT NOT NULL, -- AES-256 encrypted value
     encryption_key_id VARCHAR(255) NOT NULL, -- Key management system reference
     value_hash VARCHAR(255) NOT NULL, -- Hash for integrity checking
     is_encrypted BOOLEAN DEFAULT true,
     last_rotated_at TIMESTAMP WITH TIME ZONE,
     expires_at TIMESTAMP WITH TIME ZONE, -- For temporary secrets
     created_by UUID NOT NULL REFERENCES user_profiles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(variable_id, environment_id)
   );
   ```

2. **Security & Access Control Tables**
   ```sql
   -- Security classifications
   CREATE TABLE security_classifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(50) UNIQUE NOT NULL,
     display_name VARCHAR(255) NOT NULL,
     description TEXT,
     encryption_required BOOLEAN DEFAULT true,
     audit_level VARCHAR(20) DEFAULT 'detailed' CHECK (audit_level IN ('basic', 'detailed', 'comprehensive', 'real_time')),
     access_restrictions JSONB DEFAULT '{}',
     change_approval_required BOOLEAN DEFAULT false,
     wedding_day_restrictions BOOLEAN DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Access control policies
   CREATE TABLE variable_access_policies (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variable_id UUID NOT NULL REFERENCES environment_variables(id),
     user_id UUID REFERENCES user_profiles(id),
     role VARCHAR(100), -- Can be role-based instead of user-specific
     permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('read', 'write', 'admin', 'emergency')),
     environment_restrictions TEXT[], -- Specific environments this policy applies to
     time_restrictions JSONB DEFAULT '{}', -- Time-based access restrictions
     emergency_override BOOLEAN DEFAULT false,
     granted_by UUID NOT NULL REFERENCES user_profiles(id),
     granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     expires_at TIMESTAMP WITH TIME ZONE,
     is_active BOOLEAN DEFAULT true
   );

   -- Audit trail for all variable operations
   CREATE TABLE environment_variable_audit (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variable_id UUID REFERENCES environment_variables(id),
     environment_id UUID REFERENCES environments(id),
     user_id UUID NOT NULL REFERENCES user_profiles(id),
     action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'rotate', 'decrypt', 'sync')),
     resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('variable', 'value', 'permission', 'environment')),
     previous_value_hash VARCHAR(255), -- Hash of previous value (not actual value)
     new_value_hash VARCHAR(255), -- Hash of new value
     change_details JSONB DEFAULT '{}', -- What specifically changed
     security_context JSONB DEFAULT '{}', -- Security-related context
     ip_address INET,
     user_agent TEXT,
     session_id VARCHAR(255),
     success BOOLEAN DEFAULT true,
     error_message TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Integration & Deployment Tables**
   ```sql
   -- Deployment synchronization tracking
   CREATE TABLE deployment_syncs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     environment_id UUID NOT NULL REFERENCES environments(id),
     sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('manual', 'automated', 'pipeline', 'rollback')),
     sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'failed')),
     variables_synced INTEGER DEFAULT 0,
     variables_failed INTEGER DEFAULT 0,
     sync_details JSONB DEFAULT '{}',
     deployment_id VARCHAR(255), -- External deployment system ID
     pipeline_url TEXT, -- Link to deployment pipeline
     sync_duration_ms INTEGER,
     started_by UUID NOT NULL REFERENCES user_profiles(id),
     started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     error_log TEXT[]
   );

   -- Variable validation results
   CREATE TABLE variable_validations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variable_id UUID NOT NULL REFERENCES environment_variables(id),
     environment_id UUID NOT NULL REFERENCES environments(id),
     validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN ('format', 'connectivity', 'api_key', 'security')),
     validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('passed', 'failed', 'warning')),
     validation_details JSONB DEFAULT '{}',
     error_message TEXT,
     validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     next_validation TIMESTAMP WITH TIME ZONE -- For scheduled validations
   );

   -- Configuration drift detection
   CREATE TABLE configuration_drift (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     environment_id UUID NOT NULL REFERENCES environments(id),
     drift_type VARCHAR(50) NOT NULL CHECK (drift_type IN ('missing_variable', 'unexpected_variable', 'value_mismatch', 'security_violation')),
     variable_name VARCHAR(255) NOT NULL,
     expected_value_hash VARCHAR(255),
     actual_value_hash VARCHAR(255),
     drift_severity VARCHAR(20) NOT NULL CHECK (drift_severity IN ('low', 'medium', 'high', 'critical')),
     detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     resolved_at TIMESTAMP WITH TIME ZONE,
     resolution_notes TEXT
   );
   ```

### 🔧 Database Integration Requirements

#### Encryption Key Management Integration
```sql
-- Encryption key management
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id VARCHAR(255) UNIQUE NOT NULL,
  key_type VARCHAR(50) NOT NULL CHECK (key_type IN ('master', 'data', 'backup')),
  algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
  key_status VARCHAR(20) NOT NULL CHECK (key_status IN ('active', 'rotating', 'deprecated', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);
```

#### Row Level Security (RLS) Policies
```sql
-- Enable RLS on all environment variable tables
ALTER TABLE environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_variable_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_access_policies ENABLE ROW LEVEL SECURITY;

-- Organization-based access control
CREATE POLICY env_var_organization_access ON environment_variables
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Security classification-based access
CREATE POLICY env_var_security_access ON environment_variable_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM variable_access_policies vap
      JOIN environment_variables ev ON vap.variable_id = ev.id
      WHERE vap.variable_id = variable_id
      AND (vap.user_id = auth.uid() OR vap.role = get_user_role())
      AND vap.permission_level IN ('read', 'write', 'admin')
      AND vap.is_active = true
      AND (vap.expires_at IS NULL OR vap.expires_at > NOW())
    )
  );

-- Wedding day protection policy
CREATE POLICY wedding_day_protection ON environment_variable_values
  FOR UPDATE USING (
    NOT (
      SELECT wedding_day_protection 
      FROM environments 
      WHERE id = environment_id
    ) 
    OR 
    EXISTS (
      SELECT 1 FROM variable_access_policies vap
      WHERE vap.variable_id = variable_id
      AND vap.user_id = auth.uid()
      AND vap.emergency_override = true
    )
    OR
    NOT is_wedding_hours()
  );
```

### 🏗️ Performance Optimization

#### Indexes for Query Performance
```sql
-- Core performance indexes
CREATE INDEX idx_env_vars_org_name ON environment_variables(organization_id, name);
CREATE INDEX idx_env_var_values_var_env ON environment_variable_values(variable_id, environment_id);
CREATE INDEX idx_env_var_audit_timestamp ON environment_variable_audit(created_at DESC);
CREATE INDEX idx_env_var_audit_user ON environment_variable_audit(user_id, created_at DESC);
CREATE INDEX idx_env_var_audit_variable ON environment_variable_audit(variable_id, created_at DESC);

-- Security and access control indexes  
CREATE INDEX idx_access_policies_user ON variable_access_policies(user_id, is_active);
CREATE INDEX idx_access_policies_variable ON variable_access_policies(variable_id, is_active);

-- Wedding day and critical operations indexes
CREATE INDEX idx_wedding_critical_vars ON environment_variables(is_wedding_critical, security_classification);
CREATE INDEX idx_environment_protection ON environments(wedding_day_protection, is_production);

-- Deployment and sync indexes
CREATE INDEX idx_deployment_syncs_env_status ON deployment_syncs(environment_id, sync_status, started_at DESC);
CREATE INDEX idx_config_drift_unresolved ON configuration_drift(environment_id, resolved_at) WHERE resolved_at IS NULL;
```

#### Query Performance Functions
```sql
-- Optimized function for environment health check
CREATE OR REPLACE FUNCTION get_environment_health(env_id UUID)
RETURNS JSONB AS $$
DECLARE
  health_status JSONB;
  missing_vars INTEGER;
  drift_count INTEGER;
  last_sync TIMESTAMP;
BEGIN
  -- Count missing required variables
  SELECT COUNT(*) INTO missing_vars
  FROM environment_variables ev
  LEFT JOIN environment_variable_values evv ON ev.id = evv.variable_id AND evv.environment_id = env_id
  WHERE ev.is_required = true AND evv.id IS NULL;
  
  -- Count unresolved configuration drift
  SELECT COUNT(*) INTO drift_count
  FROM configuration_drift
  WHERE environment_id = env_id AND resolved_at IS NULL;
  
  -- Get last successful sync
  SELECT MAX(completed_at) INTO last_sync
  FROM deployment_syncs
  WHERE environment_id = env_id AND sync_status = 'completed';
  
  health_status := jsonb_build_object(
    'missing_variables', missing_vars,
    'configuration_drift', drift_count,
    'last_sync', last_sync,
    'status', CASE 
      WHEN missing_vars > 0 OR drift_count > 5 THEN 'critical'
      WHEN drift_count > 0 THEN 'warning'
      ELSE 'healthy'
    END
  );
  
  RETURN health_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wedding day protection function
CREATE OR REPLACE FUNCTION is_wedding_hours()
RETURNS BOOLEAN AS $$
BEGIN
  -- Friday 6PM to Sunday 11:59PM (peak wedding time)
  RETURN (
    EXTRACT(DOW FROM NOW()) IN (5, 6, 0) -- Friday, Saturday, Sunday
    AND (
      (EXTRACT(DOW FROM NOW()) = 5 AND EXTRACT(HOUR FROM NOW()) >= 18) -- Friday 6PM+
      OR EXTRACT(DOW FROM NOW()) IN (6, 0) -- All day Saturday and Sunday
    )
  );
END;
$$ LANGUAGE plpgsql;
```

### 📊 Real-time Integration Requirements

#### Supabase Real-time Subscriptions
```typescript
// Real-time subscription setup for environment variables
export const setupEnvironmentVariableSubscriptions = () => {
  // Variable changes subscription
  const variableChanges = supabase
    .channel('variable_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'environment_variable_values'
    }, (payload) => {
      handleVariableChange(payload);
    });

  // Audit trail subscription for security monitoring
  const auditSubscription = supabase
    .channel('audit_trail')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'environment_variable_audit'
    }, (payload) => {
      handleAuditEvent(payload);
    });

  // Configuration drift alerts
  const driftSubscription = supabase
    .channel('config_drift')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'configuration_drift'
    }, (payload) => {
      handleConfigurationDrift(payload);
    });
};
```

### 🛡️ Security Integration Requirements

#### Audit Trail Integration
```sql
-- Trigger function for comprehensive audit logging
CREATE OR REPLACE FUNCTION log_environment_variable_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO environment_variable_audit (
    variable_id,
    environment_id,
    user_id,
    action,
    resource_type,
    previous_value_hash,
    new_value_hash,
    change_details,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(NEW.variable_id, OLD.variable_id),
    COALESCE(NEW.environment_id, OLD.environment_id),
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
    END,
    'value',
    CASE WHEN OLD IS NOT NULL THEN OLD.value_hash END,
    CASE WHEN NEW IS NOT NULL THEN NEW.value_hash END,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'changed_fields', 
      CASE WHEN TG_OP = 'UPDATE' THEN
        (SELECT array_agg(key) FROM jsonb_each_text(to_jsonb(NEW)) WHERE value != COALESCE((to_jsonb(OLD) ->> key), ''))
      ELSE NULL END
    ),
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER environment_variable_values_audit
  AFTER INSERT OR UPDATE OR DELETE ON environment_variable_values
  FOR EACH ROW EXECUTE FUNCTION log_environment_variable_change();
```

### 🧪 Testing Requirements
- **Schema Validation**: Verify all constraints and relationships work correctly
- **Performance Testing**: Test query performance with 10,000+ variables across 20+ environments
- **Security Testing**: Validate RLS policies and encryption handling
- **Audit Testing**: Ensure complete audit trail for all operations
- **Integration Testing**: Test real-time subscriptions and external system integrations

### 📈 Monitoring & Maintenance
- **Database Health Monitoring**: Track query performance and connection usage
- **Storage Monitoring**: Monitor table sizes and index usage
- **Security Monitoring**: Track access patterns and potential security violations
- **Backup Verification**: Ensure regular backups and test restoration procedures

### 📚 Documentation Requirements
- Complete schema documentation with entity relationship diagrams
- Query optimization guidelines and performance benchmarks
- Security implementation documentation
- Integration patterns and best practices
- Operational procedures for database maintenance

### 🎓 Handoff Requirements
Deliver production-ready database schema with comprehensive security implementations, optimized performance, full audit capabilities, and detailed operational documentation. Include migration scripts and rollback procedures.

---
**Priority Level**: P1 (Critical Infrastructure)  
**Estimated Effort**: 20 days  
**Team Dependencies**: Backend API (Team B), Frontend Components (Team A), Testing (Team E)  
**Go-Live Target**: Q1 2025  

This database implementation ensures WedSync's environment variables are stored securely, perform efficiently, and maintain comprehensive audit trails to prevent configuration-related issues that could disrupt wedding operations.