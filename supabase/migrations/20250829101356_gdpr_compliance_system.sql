-- WS-176 GDPR Compliance System - Database Migration
-- Created: 2025-08-29
-- Description: Complete GDPR compliance system tables for consent management,
-- data subject requests, deletion tracking, and audit logging.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- GDPR Consent Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'marketing', 'analytics', 'functional', 'performance', 'communication', 'data_sharing'
  )),
  status TEXT NOT NULL CHECK (status IN ('granted', 'denied', 'withdrawn', 'expired')),
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interest'
  )),
  granted_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  version TEXT NOT NULL DEFAULT '1.0',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure logical consistency
  CONSTRAINT consent_status_dates_check CHECK (
    (status = 'granted' AND granted_at IS NOT NULL) OR
    (status = 'denied' AND granted_at IS NULL) OR
    (status = 'withdrawn' AND withdrawn_at IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_user_consent_type ON consent_records(user_id, consent_type);
CREATE INDEX idx_consent_records_status ON consent_records(status);
CREATE INDEX idx_consent_records_created_at ON consent_records(created_at);
CREATE INDEX idx_consent_records_expires_at ON consent_records(expires_at) WHERE expires_at IS NOT NULL;

-- Row Level Security
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own consent records" ON consent_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all consent records" ON consent_records
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Data Subject Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'access', 'rectification', 'erasure', 'restrict_processing', 
    'data_portability', 'object', 'withdraw_consent'
  )),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'verified', 'in_progress', 'completed', 'rejected', 'expired'
  )),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  response_data JSONB,
  verification_token TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  processor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure verification token has expiry
  CONSTRAINT verification_token_expiry_check CHECK (
    (verification_token IS NULL AND verification_expires_at IS NULL) OR
    (verification_token IS NOT NULL AND verification_expires_at IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_data_subject_requests_user_id ON data_subject_requests(user_id);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_submitted_at ON data_subject_requests(submitted_at);
CREATE INDEX idx_data_subject_requests_verification_token ON data_subject_requests(verification_token) 
  WHERE verification_token IS NOT NULL;

-- Row Level Security
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own data requests" ON data_subject_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all data requests" ON data_subject_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Data Processing Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_category TEXT NOT NULL CHECK (data_category IN (
    'personal_details', 'contact_info', 'wedding_info', 'payment_data',
    'communication_logs', 'usage_data', 'technical_data'
  )),
  processing_purpose TEXT NOT NULL CHECK (processing_purpose IN (
    'service_provision', 'marketing', 'analytics', 'legal_compliance', 'security', 'customer_support'
  )),
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interest'
  )),
  retention_period_days INTEGER NOT NULL DEFAULT 365,
  processor_info JSONB NOT NULL DEFAULT '{}',
  data_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  data_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  cross_border_transfers BOOLEAN DEFAULT FALSE,
  safeguards_applied TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_data_processing_records_user_id ON data_processing_records(user_id);
CREATE INDEX idx_data_processing_records_data_category ON data_processing_records(data_category);
CREATE INDEX idx_data_processing_records_legal_basis ON data_processing_records(legal_basis);

-- Row Level Security
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processing records" ON data_processing_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all processing records" ON data_processing_records
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Deletion Execution Plans Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deletion_execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'executing', 'completed', 'failed', 'partially_completed', 'rolled_back'
  )),
  execution_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_deletion_plans_user_id ON deletion_execution_plans(user_id);
CREATE INDEX idx_deletion_plans_plan_id ON deletion_execution_plans(plan_id);
CREATE INDEX idx_deletion_plans_status ON deletion_execution_plans(status);
CREATE INDEX idx_deletion_plans_execution_id ON deletion_execution_plans(execution_id) 
  WHERE execution_id IS NOT NULL;

-- Row Level Security
ALTER TABLE deletion_execution_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion plans" ON deletion_execution_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all deletion plans" ON deletion_execution_plans
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Deletion Results Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deletion_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID UNIQUE NOT NULL,
  plan_id UUID NOT NULL REFERENCES deletion_execution_plans(plan_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL,
  verification_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_deletion_results_execution_id ON deletion_results(execution_id);
CREATE INDEX idx_deletion_results_plan_id ON deletion_results(plan_id);
CREATE INDEX idx_deletion_results_user_id ON deletion_results(user_id);
CREATE INDEX idx_deletion_results_verification_hash ON deletion_results(verification_hash);

-- Row Level Security
ALTER TABLE deletion_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion results" ON deletion_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all deletion results" ON deletion_results
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Processing Restrictions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS processing_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restricted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  restriction_reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure logical consistency for lifted restrictions
  CONSTRAINT restriction_lifted_check CHECK (
    (active = TRUE AND lifted_at IS NULL AND lifted_reason IS NULL) OR
    (active = FALSE AND lifted_at IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_processing_restrictions_user_id ON processing_restrictions(user_id);
CREATE INDEX idx_processing_restrictions_active ON processing_restrictions(active);
CREATE INDEX idx_processing_restrictions_restricted_at ON processing_restrictions(restricted_at);

-- Row Level Security
ALTER TABLE processing_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processing restrictions" ON processing_restrictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all processing restrictions" ON processing_restrictions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- GDPR Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  security_context JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit log queries
CREATE INDEX idx_gdpr_audit_logs_user_id ON gdpr_audit_logs(user_id);
CREATE INDEX idx_gdpr_audit_logs_action ON gdpr_audit_logs(action);
CREATE INDEX idx_gdpr_audit_logs_resource_type ON gdpr_audit_logs(resource_type);
CREATE INDEX idx_gdpr_audit_logs_timestamp ON gdpr_audit_logs(timestamp);
CREATE INDEX idx_gdpr_audit_logs_result ON gdpr_audit_logs(result);

-- Composite index for common queries
CREATE INDEX idx_gdpr_audit_logs_user_action_timestamp ON gdpr_audit_logs(user_id, action, timestamp DESC);

-- Row Level Security - Audit logs are sensitive
ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" ON gdpr_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all audit logs" ON gdpr_audit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Wedding-Specific GDPR Tables
-- ============================================================================

-- Guest Data Rights Table
CREATE TABLE IF NOT EXISTS wedding_guest_data_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL, -- References wedding_guests table
  wedding_id UUID NOT NULL, -- References weddings table  
  consent_for_photos TEXT NOT NULL DEFAULT 'denied' CHECK (consent_for_photos IN ('granted', 'denied', 'withdrawn', 'expired')),
  consent_for_communication TEXT NOT NULL DEFAULT 'denied' CHECK (consent_for_communication IN ('granted', 'denied', 'withdrawn', 'expired')),
  dietary_requirements TEXT,
  accessibility_needs TEXT,
  data_retention_preferences JSONB DEFAULT '{
    "after_wedding_days": 365,
    "marketing_opt_in": false,
    "future_event_invites": false
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wedding_guest_data_rights_guest_id ON wedding_guest_data_rights(guest_id);
CREATE INDEX idx_wedding_guest_data_rights_wedding_id ON wedding_guest_data_rights(wedding_id);

-- Row Level Security
ALTER TABLE wedding_guest_data_rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage wedding guest data rights" ON wedding_guest_data_rights
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Supplier Data Processing Agreements Table
CREATE TABLE IF NOT EXISTS supplier_data_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL, -- References suppliers table
  wedding_id UUID NOT NULL, -- References weddings table
  data_processing_agreement JSONB NOT NULL DEFAULT '{
    "signed": false,
    "signed_date": null,
    "version": "1.0"
  }',
  data_categories_shared TEXT[] DEFAULT ARRAY[]::TEXT[],
  processing_purposes TEXT[] DEFAULT ARRAY[]::TEXT[],
  retention_period_days INTEGER NOT NULL DEFAULT 365,
  data_transfer_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_supplier_data_processing_supplier_id ON supplier_data_processing(supplier_id);
CREATE INDEX idx_supplier_data_processing_wedding_id ON supplier_data_processing(wedding_id);

-- Row Level Security
ALTER TABLE supplier_data_processing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage supplier data processing" ON supplier_data_processing
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_consent_records_updated_at 
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_subject_requests_updated_at 
  BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_processing_records_updated_at 
  BEFORE UPDATE ON data_processing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deletion_execution_plans_updated_at 
  BEFORE UPDATE ON deletion_execution_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_restrictions_updated_at 
  BEFORE UPDATE ON processing_restrictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_guest_data_rights_updated_at 
  BEFORE UPDATE ON wedding_guest_data_rights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_data_processing_updated_at 
  BEFORE UPDATE ON supplier_data_processing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GDPR-specific functions
-- ============================================================================

-- Function to automatically expire consent records
CREATE OR REPLACE FUNCTION expire_consent_records()
RETURNS void AS $$
BEGIN
  UPDATE consent_records 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'granted' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND status != 'expired';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize user data (placeholder for complex anonymization logic)
CREATE OR REPLACE FUNCTION anonymize_user_data(target_user_id UUID, table_name TEXT, column_mapping JSONB)
RETURNS void AS $$
DECLARE
  query_text TEXT;
  column_name TEXT;
  anonymized_value TEXT;
BEGIN
  -- This is a simplified version - production would need more sophisticated anonymization
  FOR column_name IN SELECT jsonb_object_keys(column_mapping)
  LOOP
    anonymized_value := column_mapping ->> column_name;
    query_text := format('UPDATE %I SET %I = %L WHERE user_id = %L', 
                         table_name, column_name, anonymized_value, target_user_id);
    EXECUTE query_text;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Views for GDPR Reporting
-- ============================================================================

-- View for consent status overview
CREATE OR REPLACE VIEW gdpr_consent_overview AS
SELECT 
  u.id AS user_id,
  u.email,
  cr.consent_type,
  cr.status,
  cr.granted_at,
  cr.expires_at,
  CASE 
    WHEN cr.expires_at IS NOT NULL AND cr.expires_at < NOW() THEN 'expired'
    ELSE cr.status
  END AS effective_status,
  cr.created_at
FROM auth.users u
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (consent_type) *
  FROM consent_records 
  WHERE user_id = u.id
  ORDER BY consent_type, created_at DESC
) cr ON true;

-- View for data subject request summary
CREATE OR REPLACE VIEW gdpr_request_summary AS
SELECT 
  DATE_TRUNC('month', submitted_at) AS month,
  request_type,
  status,
  COUNT(*) AS request_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - submitted_at))/3600) AS avg_processing_hours
FROM data_subject_requests
WHERE submitted_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', submitted_at), request_type, status
ORDER BY month DESC, request_type;

-- ============================================================================
-- Comments and Documentation
-- ============================================================================

COMMENT ON TABLE consent_records IS 'GDPR consent tracking with full audit trail and expiration support';
COMMENT ON TABLE data_subject_requests IS 'Data subject rights requests (Articles 15-22) with verification workflow';
COMMENT ON TABLE data_processing_records IS 'Record of personal data processing activities (Article 30)';
COMMENT ON TABLE deletion_execution_plans IS 'Execution plans for data deletion with rollback capability';
COMMENT ON TABLE deletion_results IS 'Results and verification of data deletion operations';
COMMENT ON TABLE processing_restrictions IS 'Processing restrictions per Article 18';
COMMENT ON TABLE gdpr_audit_logs IS 'Comprehensive audit trail for all GDPR operations';
COMMENT ON TABLE wedding_guest_data_rights IS 'Guest-specific consent and data rights for wedding events';
COMMENT ON TABLE supplier_data_processing IS 'Data processing agreements with wedding suppliers';

COMMENT ON FUNCTION expire_consent_records() IS 'Automatically expire consent records past their expiration date';
COMMENT ON FUNCTION anonymize_user_data(UUID, TEXT, JSONB) IS 'Anonymize personal data in specified table and columns';

COMMENT ON VIEW gdpr_consent_overview IS 'Current consent status for all users across all consent types';
COMMENT ON VIEW gdpr_request_summary IS 'Monthly summary of data subject requests by type and status';

-- ============================================================================
-- Migration Completion
-- ============================================================================

-- Log migration completion
INSERT INTO gdpr_audit_logs (
  user_id,
  action,
  resource_type,
  details,
  security_context,
  timestamp,
  result
) VALUES (
  NULL,
  'gdpr_migration_completed',
  'database_migration',
  '{"migration_id": "20250829101356_gdpr_compliance_system", "tables_created": 8, "indexes_created": 25, "policies_created": 16}',
  '{"source": "migration", "version": "1.0"}',
  NOW(),
  'success'
);