ssions
GRANT SELECT ON dashboard_widgets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON dashboard_widgets TO authenticated;
GRANT SELECT ON dashboard_cache TO authenticated;
GRANT SELECT, INSERT ON dashboard_activity TO authenticated;
GRANT SELECT ON dashboard_summary TO authenticated;
GRANT SELECT ON dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION setup_default_dashboard_widgets(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_dashboard_cache() TO service_role;
GRANT EXECUTE ON FUNCTION refresh_dashboard_metrics() TO service_role;

-- Comments for documentation
COMMENT ON TABLE dashboard_widgets IS 'Stores user-configurable dashboard widget settings and positions';
COMMENT ON TABLE dashboard_cache IS 'High-performance cache for dashboard data with TTL support';
COMMENT ON TABLE dashboard_activity IS 'Activity log for real-time dashboard updates and notifications';
COMMENT ON VIEW dashboard_summary IS 'Optimized view for dashboard overview data aggregation';
COMMENT ON MATERIALIZED VIEW dashboard_metrics IS 'Pre-calculated metrics for dashboard performance optimization';
COMMENT ON FUNCTION setup_default_dashboard_widgets(UUID) IS 'Sets up default dashboard layout for new suppliers';
COMMENT ON FUNCTION clean_expired_dashboard_cache() IS 'Removes expired cache entries to maintain performance';
COMMENT ON FUNCTION refresh_dashboard_metrics() IS 'Refreshes materialized view for dashboard metrics';


-- ========================================
-- Migration: 20250101000032_import_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- WS-033: CSV/Excel Import System
-- Tables and functions for managing client import jobs

-- Create import_jobs table
DROP VIEW IF EXISTS public CASCADE;
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending', 'processing', 'preview', 'completed', 
      'completed_with_errors', 'failed', 'cancelled', 'timeout'
    )
  ),
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  column_mappings JSONB,
  validation_summary JSONB,
  performance_metrics JSONB,
  imported_client_ids UUID[],
  errors JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

-- Add import tracking columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES public.import_jobs(id);

-- Create index for imported clients
CREATE INDEX IF NOT EXISTS idx_clients_import_id ON public.clients(import_id);

-- Create temp storage bucket for import files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp',
  'temp',
  false,
  52428800, -- 50MB
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for import_jobs
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own import jobs
CREATE POLICY "Users can view own import jobs"
  ON public.import_jobs
  FOR SELECT
  USING (( SELECT auth.uid() ) = user_id);

-- Users can create their own import jobs
CREATE POLICY "Users can create import jobs"
  ON public.import_jobs
  FOR INSERT
  WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Users can update their own import jobs
CREATE POLICY "Users can update own import jobs"
  ON public.import_jobs
  FOR UPDATE
  USING (( SELECT auth.uid() ) = user_id)
  WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Users can delete their own import jobs
CREATE POLICY "Users can delete own import jobs"
  ON public.import_jobs
  FOR DELETE
  USING (( SELECT auth.uid() ) = user_id);

-- Storage policies for temp bucket
CREATE POLICY "Users can upload to temp storage"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'temp' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'imports' AND
    (storage.foldername(name))[2] = ( SELECT auth.uid() )::text
  );

CREATE POLICY "Users can read own temp files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'temp' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'imports' AND
    (storage.foldername(name))[2] = ( SELECT auth.uid() )::text
  );

CREATE POLICY "Users can delete own temp files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'temp' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = 'imports' AND
    (storage.foldername(name))[2] = ( SELECT auth.uid() )::text
  );

-- Function to clean up old import jobs
CREATE OR REPLACE FUNCTION cleanup_old_import_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete completed import jobs older than 30 days
  DELETE FROM public.import_jobs
  WHERE completed_at < now() - INTERVAL '30 days'
    AND status IN ('completed', 'failed', 'cancelled');

  -- Delete stuck processing jobs older than 1 day
  UPDATE public.import_jobs
  SET 
    status = 'timeout',
    error = 'Import timed out after 24 hours'
  WHERE status = 'processing'
    AND created_at < now() - INTERVAL '1 day';

  -- Clean up orphaned temp files
  DELETE FROM storage.objects
  WHERE bucket_id = 'temp'
    AND created_at < now() - INTERVAL '7 days';
END;
$$;

-- Schedule cleanup function (requires pg_cron extension)
-- Run daily at 2 AM
-- SELECT cron.schedule('cleanup-import-jobs', '0 2 * * *', 'SELECT cleanup_old_import_jobs();');

-- Function to get import statistics
CREATE OR REPLACE FUNCTION get_import_statistics(p_user_id UUID)
RETURNS TABLE (
  total_imports BIGINT,
  successful_imports BIGINT,
  failed_imports BIGINT,
  total_clients_imported BIGINT,
  avg_processing_time_ms NUMERIC,
  last_import_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_imports,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_imports,
    COUNT(*) FILTER (WHERE status IN ('failed', 'timeout'))::BIGINT as failed_imports,
    COALESCE(SUM(successful_rows), 0)::BIGINT as total_clients_imported,
    AVG((performance_metrics->>'processing_time_ms')::NUMERIC) as avg_processing_time_ms,
    MAX(completed_at) as last_import_date
  FROM public.import_jobs
  WHERE user_id = p_user_id;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.import_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_import_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_import_jobs() TO service_role;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000033_payment_system_extensions.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Extensions for payment system
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment status tracking table (for real-time status updates)
DROP VIEW IF EXISTS payment_status CASCADE;
CREATE TABLE IF NOT EXISTS payment_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for payment_status table
CREATE INDEX IF NOT EXISTS idx_payment_status_user_id ON payment_status(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_stripe_payment_intent_id ON payment_status(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_status ON payment_status(status);
CREATE INDEX IF NOT EXISTS idx_payment_status_last_updated ON payment_status(last_updated DESC);

-- Invoices table
DROP VIEW IF EXISTS invoices CASCADE;
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    due_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    invoice_pdf_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Payment plans table for installment payments
DROP VIEW IF EXISTS payment_plans CASCADE;
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    installments INTEGER NOT NULL CHECK (installments > 0),
    installment_amount DECIMAL(10,2) NOT NULL CHECK (installment_amount > 0),
    interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('weekly', 'bi_weekly', 'monthly')),
    next_payment_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'canceled', 'paused')),
    payments_completed INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment_plans table
CREATE INDEX IF NOT EXISTS idx_payment_plans_user_id ON payment_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_stripe_customer_id ON payment_plans(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_next_payment_date ON payment_plans(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_plans_created_at ON payment_plans(created_at DESC);

-- Installment payments table
DROP VIEW IF EXISTS installment_payments CASCADE;
CREATE TABLE IF NOT EXISTS installment_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    stripe_payment_intent_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for installment_payments table
CREATE INDEX IF NOT EXISTS idx_installment_payments_payment_plan_id ON installment_payments(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_installment_number ON installment_payments(installment_number);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_stripe_payment_intent_id ON installment_payments(stripe_payment_intent_id);

-- Refunds table for tracking refund requests and processing
DROP VIEW IF EXISTS refunds CASCADE;
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    stripe_refund_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    reason VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for refunds table
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id ON refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_stripe_payment_intent_id ON refunds(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at DESC);

-- Payment analytics table for tracking metrics
DROP VIEW IF EXISTS payment_analytics CASCADE;
CREATE TABLE IF NOT EXISTS payment_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_payments INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    successful_payments INTEGER NOT NULL DEFAULT 0,
    failed_payments INTEGER NOT NULL DEFAULT 0,
    refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    average_payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    new_customers INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Create indexes for payment_analytics table
CREATE INDEX IF NOT EXISTS idx_payment_analytics_date ON payment_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_analytics_total_amount ON payment_analytics(total_amount DESC);

-- Row Level Security (RLS) policies for new tables
ALTER TABLE payment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Payment status RLS policies
CREATE POLICY "Users can view their own payment status" ON payment_status
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own payment status" ON payment_status
    FOR INSERT WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own payment status" ON payment_status
    FOR UPDATE USING (( SELECT auth.uid() ) = user_id);

-- Invoices RLS policies
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own invoices" ON invoices
    FOR INSERT WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own invoices" ON invoices
    FOR UPDATE USING (( SELECT auth.uid() ) = user_id);

-- Payment plans RLS policies
CREATE POLICY "Users can view their own payment plans" ON payment_plans
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own payment plans" ON payment_plans
    FOR INSERT WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own payment plans" ON payment_plans
    FOR UPDATE USING (( SELECT auth.uid() ) = user_id);

-- Installment payments RLS policies (via payment plan)
CREATE POLICY "Users can view installments of their payment plans" ON installment_payments
    FOR SELECT USING (
        payment_plan_id IN (
            SELECT id FROM payment_plans WHERE user_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Users can insert installments for their payment plans" ON installment_payments
    FOR INSERT WITH CHECK (
        payment_plan_id IN (
            SELECT id FROM payment_plans WHERE user_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Users can update installments of their payment plans" ON installment_payments
    FOR UPDATE USING (
        payment_plan_id IN (
            SELECT id FROM payment_plans WHERE user_id = ( SELECT auth.uid() )
        )
    );

-- Refunds RLS policies
CREATE POLICY "Users can view their own refunds" ON refunds
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own refunds" ON refunds
    FOR INSERT WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own refunds" ON refunds
    FOR UPDATE USING (( SELECT auth.uid() ) = user_id);

-- Add updated_at triggers for tables that need them
CREATE TRIGGER update_payment_status_updated_at BEFORE UPDATE ON payment_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at BEFORE UPDATE ON payment_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_analytics_updated_at BEFORE UPDATE ON payment_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION get_next_invoice_number(year_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the highest invoice number for the given year
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number ~ '^WS-' || year_param::TEXT || '-\d{6}$' 
            THEN CAST(SUBSTRING(invoice_number FROM '\d{6}$') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO next_number
    FROM invoices
    WHERE invoice_number LIKE 'WS-' || year_param::TEXT || '-%';
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment analytics (to be called daily)
CREATE OR REPLACE FUNCTION update_payment_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    analytics_data RECORD;
BEGIN
    -- Calculate analytics for the target date
    SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as average_payment_amount
    INTO analytics_data
    FROM payments
    WHERE DATE(created_at) = target_date;

    -- Get refunded amount for the date
    SELECT COALESCE(SUM(amount), 0) INTO analytics_data.refunded_amount
    FROM refunds
    WHERE DATE(created_at) = target_date AND status = 'succeeded';

    -- Get new customers count
    SELECT COUNT(DISTINCT stripe_customer_id) INTO analytics_data.new_customers
    FROM customer_payment_methods
    WHERE DATE(created_at) = target_date;

    -- Insert or update analytics
    INSERT INTO payment_analytics (
        date,
        total_payments,
        total_amount,
        successful_payments,
        failed_payments,
        refunded_amount,
        average_payment_amount,
        new_customers
    ) VALUES (
        target_date,
        analytics_data.total_payments,
        analytics_data.total_amount,
        analytics_data.successful_payments,
        analytics_data.failed_payments,
        COALESCE(analytics_data.refunded_amount, 0),
        analytics_data.average_payment_amount,
        COALESCE(analytics_data.new_customers, 0)
    )
    ON CONFLICT (date) 
    DO UPDATE SET
        total_payments = EXCLUDED.total_payments,
        total_amount = EXCLUDED.total_amount,
        successful_payments = EXCLUDED.successful_payments,
        failed_payments = EXCLUDED.failed_payments,
        refunded_amount = EXCLUDED.refunded_amount,
        average_payment_amount = EXCLUDED.average_payment_amount,
        new_customers = EXCLUDED.new_customers,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON payment_status TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON payment_plans TO authenticated;
GRANT ALL ON installment_payments TO authenticated;
GRANT ALL ON refunds TO authenticated;
GRANT SELECT ON payment_analytics TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000034_wedding_encryption_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Wedding Data Encryption System
-- Stores encryption key metadata for per-wedding data protection

-- Create wedding encryption keys table
CREATE TABLE wedding_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed master key
  salt TEXT NOT NULL, -- Salt for key derivation
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT wedding_encryption_keys_wedding_id_fkey 
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_wedding_encryption_keys_wedding_id ON wedding_encryption_keys(wedding_id);
CREATE INDEX idx_wedding_encryption_keys_active ON wedding_encryption_keys(wedding_id, is_active) WHERE is_active = true;
CREATE INDEX idx_wedding_encryption_keys_version ON wedding_encryption_keys(wedding_id, version);

-- Ensure only one active key per wedding
CREATE UNIQUE INDEX idx_wedding_encryption_keys_unique_active 
  ON wedding_encryption_keys(wedding_id) 
  WHERE is_active = true;

-- Update trigger for updated_at
CREATE TRIGGER update_wedding_encryption_keys_updated_at
  BEFORE UPDATE ON wedding_encryption_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for wedding encryption keys
ALTER TABLE wedding_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access keys for their own weddings
CREATE POLICY "Users can access their wedding encryption keys" ON wedding_encryption_keys
  FOR ALL USING (
    wedding_id IN (
      SELECT id FROM weddings 
      WHERE owner_id = ( SELECT auth.uid() ) 
      OR id IN (
        SELECT wedding_id FROM wedding_collaborators 
        WHERE user_id = ( SELECT auth.uid() ) AND status = 'accepted'
      )
    )
  );

-- Service role can access all keys (for background operations)
CREATE POLICY "Service role can access all encryption keys" ON wedding_encryption_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Create encryption audit log table
CREATE TABLE encryption_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL,
  key_id UUID,
  operation TEXT NOT NULL, -- 'encrypt', 'decrypt', 'key_create', 'key_rotate'
  field_path TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT encryption_audit_log_wedding_id_fkey 
    FOREIGN KEY (wedding_id) REFERENCES weddings(id) ON DELETE CASCADE,
  CONSTRAINT encryption_audit_log_key_id_fkey 
    FOREIGN KEY (key_id) REFERENCES wedding_encryption_keys(id) ON DELETE SET NULL,
  CONSTRAINT encryption_audit_log_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for audit log
CREATE INDEX idx_encryption_audit_log_wedding_id ON encryption_audit_log(wedding_id);
CREATE INDEX idx_encryption_audit_log_created_at ON encryption_audit_log(created_at);
CREATE INDEX idx_encryption_audit_log_operation ON encryption_audit_log(operation);
CREATE INDEX idx_encryption_audit_log_user_id ON encryption_audit_log(user_id);

-- RLS Policies for encryption audit log
ALTER TABLE encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for their weddings
CREATE POLICY "Users can view their wedding encryption audit logs" ON encryption_audit_log
  FOR SELECT USING (
    wedding_id IN (
      SELECT id FROM weddings 
      WHERE owner_id = ( SELECT auth.uid() ) 
      OR id IN (
        SELECT wedding_id FROM wedding_collaborators 
        WHERE user_id = ( SELECT auth.uid() ) AND status = 'accepted'
      )
    )
  );

-- Service role can manage all audit logs
CREATE POLICY "Service role can manage all encryption audit logs" ON encryption_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Function to log encryption operations
CREATE OR REPLACE FUNCTION log_encryption_operation(
  p_wedding_id UUID,
  p_key_id UUID DEFAULT NULL,
  p_operation TEXT DEFAULT 'unknown',
  p_field_path TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO encryption_audit_log (
    wedding_id,
    key_id,
    operation,
    field_path,
    user_id,
    ip_address,
    success,
    error_message,
    created_at
  ) VALUES (
    p_wedding_id,
    p_key_id,
    p_operation,
    p_field_path,
    auth.uid(),
    inet_client_addr(),
    p_success,
    p_error_message,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate wedding encryption key
CREATE OR REPLACE FUNCTION rotate_wedding_encryption_key(p_wedding_id UUID)
RETURNS UUID AS $$
DECLARE
  new_key_id UUID;
BEGIN
  -- Check if user has permission to manage this wedding
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE id = p_wedding_id 
    AND (owner_id = ( SELECT auth.uid() ) OR id IN (
      SELECT wedding_id FROM wedding_collaborators 
      WHERE user_id = ( SELECT auth.uid() ) AND status = 'accepted' AND role IN ('admin', 'planner')
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to rotate encryption key';
  END IF;

  -- Deactivate current key
  UPDATE wedding_encryption_keys 
  SET is_active = false, updated_at = NOW()
  WHERE wedding_id = p_wedding_id AND is_active = true;

  -- Log key rotation
  PERFORM log_encryption_operation(
    p_wedding_id,
    NULL,
    'key_rotate',
    NULL,
    true,
    NULL
  );

  -- Return success (new key will be generated on next access)
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wedding encryption key info (metadata only)
CREATE OR REPLACE FUNCTION get_wedding_encryption_info(p_wedding_id UUID)
RETURNS TABLE (
  key_id UUID,
  version INTEGER,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Check if user has permission to access this wedding
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE id = p_wedding_id 
    AND (owner_id = ( SELECT auth.uid() ) OR id IN (
      SELECT wedding_id FROM wedding_collaborators 
      WHERE user_id = ( SELECT auth.uid() ) AND status = 'accepted'
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access encryption info';
  END IF;

  RETURN QUERY
  SELECT wek.id, wek.version, wek.created_at, wek.is_active
  FROM wedding_encryption_keys wek
  WHERE wek.wedding_id = p_wedding_id
  ORDER BY wek.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for encryption statistics
CREATE VIEW encryption_stats AS
SELECT 
  w.id as wedding_id,
  w.title as wedding_title,
  COUNT(wek.id) as total_keys,
  COUNT(CASE WHEN wek.is_active THEN 1 END) as active_keys,
  MAX(wek.created_at) as latest_key_created,
  COUNT(eal.id) as total_operations,
  COUNT(CASE WHEN eal.operation = 'encrypt' THEN 1 END) as encrypt_operations,
  COUNT(CASE WHEN eal.operation = 'decrypt' THEN 1 END) as decrypt_operations,
  COUNT(CASE WHEN eal.success = false THEN 1 END) as failed_operations
FROM weddings w
LEFT JOIN wedding_encryption_keys wek ON w.id = wek.wedding_id
LEFT JOIN encryption_audit_log eal ON w.id = eal.wedding_id
GROUP BY w.id, w.title;

-- Grant permissions
GRANT SELECT ON encryption_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE wedding_encryption_keys IS 'Stores encryption key metadata for per-wedding data protection';
COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption/decryption operations';
COMMENT ON FUNCTION log_encryption_operation IS 'Logs encryption operations for audit trail';
COMMENT ON FUNCTION rotate_wedding_encryption_key IS 'Rotates encryption key for a wedding';
COMMENT ON FUNCTION get_wedding_encryption_info IS 'Gets encryption key metadata for a wedding';
COMMENT ON VIEW encryption_stats IS 'Statistics about encryption usage per wedding';

-- Create initial encryption keys for existing weddings (if any)
DO $$
DECLARE
  wedding_record RECORD;
BEGIN
  FOR wedding_record IN SELECT id FROM weddings LOOP
    -- Insert placeholder key record (actual key will be generated on first use)
    INSERT INTO wedding_encryption_keys (
      wedding_id,
      key_hash,
      salt,
      version,
      is_active
    ) VALUES (
      wedding_record.id,
      'placeholder_' || gen_random_uuid(),
      'placeholder_' || gen_random_uuid(),
      1,
      true
    );
  END LOOP;
END $$;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000035_ab_testing_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- A/B Testing System Migration
-- WS-028: Communication Optimization Engine

BEGIN;

-- Create A/B Tests table
DROP VIEW IF EXISTS ab_tests CASCADE;
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    
    -- Test configuration
    metrics TEXT[] NOT NULL DEFAULT '{}',
    target_audience JSONB,
    confidence_level INTEGER NOT NULL DEFAULT 95 CHECK (confidence_level BETWEEN 90 AND 99),
    
    -- Statistical results
    statistical_significance DECIMAL(5,4),
    winner_variant_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Organization and user tracking
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create A/B Test Variants table
DROP VIEW IF EXISTS ab_test_variants CASCADE;
CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    traffic_percentage INTEGER NOT NULL DEFAULT 0 CHECK (traffic_percentage BETWEEN 0 AND 100),
    is_control BOOLEAN NOT NULL DEFAULT false,
    
    -- Performance metrics
    total_exposures INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    
    -- Wedding-specific metrics
    open_count INTEGER NOT NULL DEFAULT 0,
    response_count INTEGER NOT NULL DEFAULT 0,
    engagement_count INTEGER NOT NULL DEFAULT 0,
    satisfaction_score DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create A/B Test Results table for detailed tracking
DROP VIEW IF EXISTS ab_test_results CASCADE;
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    
    -- Event tracking
    event_type TEXT NOT NULL CHECK (event_type IN ('exposure', 'open', 'response', 'engagement', 'conversion')),
    event_data JSONB,
    
    -- Client information
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    message_id UUID, -- Reference to message/campaign
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    location_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create A/B Test Assignments table to track which variant each client sees
DROP VIEW IF EXISTS ab_test_assignments CASCADE;
CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sticky BOOLEAN NOT NULL DEFAULT true, -- Whether to keep same assignment for consistency
    
    UNIQUE(test_id, client_id) -- Each client gets one variant per test
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ab_tests_organization_id ON ab_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_at ON ab_tests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_is_control ON ab_test_variants(is_control);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant_id ON ab_test_results(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_event_type ON ab_test_results(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_created_at ON ab_test_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_client ON ab_test_assignments(test_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_variant_id ON ab_test_assignments(variant_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ab_tests_updated_at 
    BEFORE UPDATE ON ab_tests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_variants_updated_at 
    BEFORE UPDATE ON ab_test_variants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate conversion rates
CREATE OR REPLACE FUNCTION calculate_variant_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversion rate when metrics change
    IF NEW.total_exposures > 0 THEN
        NEW.conversion_rate = CAST(NEW.conversions AS DECIMAL) / NEW.total_exposures;
    ELSE
        NEW.conversion_rate = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate conversion rates
CREATE TRIGGER calculate_conversion_rate_trigger
    BEFORE INSERT OR UPDATE ON ab_test_variants
    FOR EACH ROW
    EXECUTE FUNCTION calculate_variant_conversion_rate();

-- Create function to get variant assignment for a client
CREATE OR REPLACE FUNCTION get_variant_assignment(
    p_test_id UUID,
    p_client_id UUID
) RETURNS UUID AS $$
DECLARE
    v_variant_id UUID;
    v_test_status TEXT;
    v_total_traffic INTEGER;
    v_random_value INTEGER;
    v_cumulative_traffic INTEGER := 0;
    variant_record RECORD;
BEGIN
    -- Check if test is running
    SELECT status INTO v_test_status
    FROM ab_tests
    WHERE id = p_test_id;
    
    IF v_test_status != 'running' THEN
        RETURN NULL;
    END IF;
    
    -- Check if client already has assignment
    SELECT variant_id INTO v_variant_id
    FROM ab_test_assignments
    WHERE test_id = p_test_id AND client_id = p_client_id;
    
    IF v_variant_id IS NOT NULL THEN
        RETURN v_variant_id;
    END IF;
    
    -- Generate new assignment based on traffic percentages
    -- Use client_id hash for deterministic assignment
    v_random_value := (hashtext(p_client_id::TEXT) & 2147483647) % 100 + 1;
    
    -- Find appropriate variant based on traffic percentages
    FOR variant_record IN
        SELECT id, traffic_percentage
        FROM ab_test_variants
        WHERE test_id = p_test_id
        ORDER BY is_control DESC, id
    LOOP
        v_cumulative_traffic := v_cumulative_traffic + variant_record.traffic_percentage;
        IF v_random_value <= v_cumulative_traffic THEN
            v_variant_id := variant_record.id;
            EXIT;
        END IF;
    END LOOP;
    
    -- Create assignment record
    INSERT INTO ab_test_assignments (test_id, variant_id, client_id)
    VALUES (p_test_id, v_variant_id, p_client_id);
    
    RETURN v_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to record test events
CREATE OR REPLACE FUNCTION record_ab_test_event(
    p_test_id UUID,
    p_variant_id UUID,
    p_client_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT NULL,
    p_message_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Record the event
    INSERT INTO ab_test_results (
        test_id,
        variant_id,
        client_id,
        event_type,
        event_data,
        message_id
    ) VALUES (
        p_test_id,
        p_variant_id,
        p_client_id,
        p_event_type,
        p_event_data,
        p_message_id
    );
    
    -- Update variant metrics
    CASE p_event_type
        WHEN 'exposure' THEN
            UPDATE ab_test_variants 
            SET total_exposures = total_exposures + 1
            WHERE id = p_variant_id;
            
        WHEN 'open' THEN
            UPDATE ab_test_variants 
            SET open_count = open_count + 1
            WHERE id = p_variant_id;
            
        WHEN 'response' THEN
            UPDATE ab_test_variants 
            SET response_count = response_count + 1
            WHERE id = p_variant_id;
            
        WHEN 'engagement' THEN
            UPDATE ab_test_variants 
            SET engagement_count = engagement_count + 1
            WHERE id = p_variant_id;
            
        WHEN 'conversion' THEN
            UPDATE ab_test_variants 
            SET conversions = conversions + 1
            WHERE id = p_variant_id;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create view for test performance summary
CREATE OR REPLACE VIEW ab_test_performance AS
SELECT 
    t.id as test_id,
    t.name as test_name,
    t.status,
    t.confidence_level,
    t.statistical_significance,
    v.id as variant_id,
    v.name as variant_name,
    v.is_control,
    v.traffic_percentage,
    v.total_exposures,
    v.conversions,
    v.conversion_rate,
    v.open_count,
    v.response_count,
    v.engagement_count,
    v.satisfaction_score,
    -- Calculate additional metrics
    CASE 
        WHEN v.total_exposures > 0 
        THEN CAST(v.open_count AS DECIMAL) / v.total_exposures 
        ELSE 0 
    END as open_rate,
    CASE 
        WHEN v.total_exposures > 0 
        THEN CAST(v.response_count AS DECIMAL) / v.total_exposures 
        ELSE 0 
    END as response_rate,
    CASE 
        WHEN v.total_exposures > 0 
        THEN CAST(v.engagement_count AS DECIMAL) / v.total_exposures 
        ELSE 0 
    END as engagement_rate
FROM ab_tests t
JOIN ab_test_variants v ON t.id = v.test_id
ORDER BY t.created_at DESC, v.is_control DESC;

-- Enable Row Level Security
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tests in their organization" ON ab_tests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE user_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Users can create tests in their organization" ON ab_tests
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE user_id = ( SELECT auth.uid() )
        ) AND created_by = ( SELECT auth.uid() )
    );

CREATE POLICY "Users can update their organization's tests" ON ab_tests
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE user_id = ( SELECT auth.uid() )
        )
    );

-- Similar policies for variants
CREATE POLICY "Users can view variants in their organization" ON ab_test_variants
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM ab_tests WHERE organization_id IN (
                SELECT organization_id 
                FROM profiles 
                WHERE user_id = ( SELECT auth.uid() )
            )
        )
    );

CREATE POLICY "Users can manage variants in their organization" ON ab_test_variants
    FOR ALL USING (
        test_id IN (
            SELECT id FROM ab_tests WHERE organization_id IN (
                SELECT organization_id 
                FROM profiles 
                WHERE user_id = ( SELECT auth.uid() )
            )
        )
    );

-- Policies for results and assignments
CREATE POLICY "Users can view results in their organization" ON ab_test_results
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM ab_tests WHERE organization_id IN (
                SELECT organization_id 
                FROM profiles 
                WHERE user_id = ( SELECT auth.uid() )
            )
        )
    );

CREATE POLICY "System can manage results" ON ab_test_results
    FOR ALL USING (true);

CREATE POLICY "System can manage assignments" ON ab_test_assignments
    FOR ALL USING (true);

-- Grant permissions to service role for backend operations
GRANT ALL ON ab_tests TO service_role;
GRANT ALL ON ab_test_variants TO service_role;
GRANT ALL ON ab_test_results TO service_role;
GRANT ALL ON ab_test_assignments TO service_role;

-- Comments for documentation
COMMENT ON TABLE ab_tests IS 'A/B tests for wedding communication optimization';
COMMENT ON TABLE ab_test_variants IS 'Individual variants within A/B tests';
COMMENT ON TABLE ab_test_results IS 'Event tracking for A/B test interactions';
COMMENT ON TABLE ab_test_assignments IS 'Client assignments to specific variants';

COMMENT ON FUNCTION get_variant_assignment(UUID, UUID) IS 'Deterministically assign clients to test variants';
COMMENT ON FUNCTION record_ab_test_event(UUID, UUID, UUID, TEXT, JSONB, UUID) IS 'Record and aggregate A/B test events';

COMMIT;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000036_client_profiles_enhancement.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- WS-032: Client Profiles Enhancement - Comprehensive Wedding Data & Activity Tracking
-- Migration to enhance client profiles with full wedding details, documents, and activities
-- Created: 2025-08-21
-- Priority: P1

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENHANCE CLIENTS TABLE WITH WEDDING DETAILS
-- =====================================================

-- Add comprehensive wedding fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS
  -- Enhanced couple information
  partner_email VARCHAR(255),
  partner_phone VARCHAR(50),
  couple_photo_url VARCHAR(500),
  anniversary_date DATE,
  
  -- Wedding ceremony details
  ceremony_venue_name VARCHAR(255),
  ceremony_venue_address TEXT,
  ceremony_time TIME,
  ceremony_type VARCHAR(100), -- religious, civil, outdoor, etc.
  officiant_name VARCHAR(255),
  officiant_contact VARCHAR(255),
  
  -- Reception details
  reception_venue_name VARCHAR(255),
  reception_venue_address TEXT,
  reception_time TIME,
  reception_style VARCHAR(100), -- formal, casual, cocktail, etc.
  
  -- Guest management
  guest_count_estimated INTEGER,
  guest_count_confirmed INTEGER,
  guest_count_children INTEGER,
  plus_ones_allowed BOOLEAN DEFAULT false,
  guest_list JSONB DEFAULT '[]'::jsonb, -- Structured guest data
  
  -- Budget tracking
  budget_total DECIMAL(12, 2),
  budget_spent DECIMAL(12, 2),
  budget_categories JSONB DEFAULT '{}'::jsonb, -- Category breakdowns
  payment_status VARCHAR(50) DEFAULT 'pending',
  
  -- Timeline & schedule
  wedding_timeline JSONB DEFAULT '[]'::jsonb, -- Array of timeline events
  key_milestones JSONB DEFAULT '[]'::jsonb, -- Important dates/deadlines
  rehearsal_date DATE,
  rehearsal_time TIME,
  
  -- Vendor assignments
  assigned_vendors JSONB DEFAULT '[]'::jsonb, -- Array of vendor IDs & roles
  preferred_vendors JSONB DEFAULT '[]'::jsonb,
  
  -- Special requirements
  dietary_requirements JSONB DEFAULT '[]'::jsonb, -- Guest dietary needs
  accessibility_needs TEXT,
  cultural_requirements TEXT,
  religious_requirements TEXT,
  special_requests TEXT,
  
  -- Theme & preferences
  wedding_theme VARCHAR(255),
  color_scheme JSONB DEFAULT '[]'::jsonb, -- Array of colors
  music_preferences TEXT,
  photography_style VARCHAR(100),
  
  -- Communication preferences
  preferred_contact_time VARCHAR(50), -- morning, afternoon, evening
  preferred_language VARCHAR(50) DEFAULT 'en',
  communication_notes TEXT,
  
  -- Metadata
  profile_completion_score INTEGER DEFAULT 0,
  last_profile_update TIMESTAMP WITH TIME ZONE,
  profile_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES user_profiles(id);

-- =====================================================
-- CLIENT DOCUMENTS TABLE
-- =====================================================

DROP VIEW IF EXISTS client_documents CASCADE;
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Document information
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- contract, invoice, photo, permit, etc.
  file_path VARCHAR(500) NOT NULL, -- Supabase storage path
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type VARCHAR(100) NOT NULL,
  
  -- Version control
  version_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES client_documents(id),
  
  -- Document metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100), -- legal, financial, design, etc.
  status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
  
  -- Security & privacy
  is_confidential BOOLEAN DEFAULT false,
  encryption_key_id VARCHAR(255), -- For sensitive documents
  access_level VARCHAR(50) DEFAULT 'team', -- owner, team, client
  
  -- Timestamps & audit
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  uploaded_by_name VARCHAR(255) NOT NULL,
  modified_at TIMESTAMP WITH TIME ZONE,
  modified_by UUID REFERENCES user_profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE, -- For temporary documents
  
  -- Document properties
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by JSONB DEFAULT '[]'::jsonb, -- Array of signatory info
  
  -- Search
  search_content TEXT, -- Extracted text for search
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- CLIENT COMMUNICATIONS TABLE
-- =====================================================

DROP VIEW IF EXISTS client_communications CASCADE;
CREATE TABLE IF NOT EXISTS client_communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Communication details
  communication_type VARCHAR(50) NOT NULL, -- email, phone, meeting, text, video_call
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  subject VARCHAR(500),
  content TEXT,
  summary TEXT, -- Brief summary for quick review
  
  -- Participants
  from_user UUID REFERENCES user_profiles(id),
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  to_email VARCHAR(255),
  to_name VARCHAR(255),
  cc_emails TEXT[], -- Array of CC recipients
  
  -- Communication metadata
  communication_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER, -- For calls/meetings
  location VARCHAR(255), -- For in-person meetings
  meeting_type VARCHAR(50), -- initial_consultation, planning, venue_visit, etc.
  
  -- Response tracking
  response_required BOOLEAN DEFAULT false,
  response_due_date DATE,
  response_status VARCHAR(50), -- pending, responded, no_response_needed
  response_time_hours INTEGER, -- Time to respond in hours
  
  -- Attachments & links
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of document IDs
  recording_url VARCHAR(500), -- For recorded calls
  meeting_notes_url VARCHAR(500),
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  
  -- Sentiment & importance
  sentiment VARCHAR(20), -- positive, neutral, negative, urgent
  importance VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
  
  -- Integration
  external_id VARCHAR(255), -- ID from email system, CRM, etc.
  source_system VARCHAR(100), -- manual, email_integration, phone_system
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- CLIENT MILESTONES TABLE
-- =====================================================

DROP VIEW IF EXISTS client_milestones CASCADE;
CREATE TABLE IF NOT EXISTS client_milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Milestone details
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(100) NOT NULL, -- booking, payment, planning, delivery
  description TEXT,
  
  -- Timing
  target_date DATE NOT NULL,
  completed_date DATE,
  is_completed BOOLEAN DEFAULT false,
  
  -- Dependencies
  depends_on UUID[] DEFAULT '{}', -- Array of milestone IDs
  blocks UUID[] DEFAULT '{}', -- Milestones this blocks
  
  -- Notification settings
  reminder_days_before INTEGER[] DEFAULT '{30, 14, 7, 1}',
  reminder_sent_dates TIMESTAMP WITH TIME ZONE[],
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  completed_by UUID REFERENCES user_profiles(id)
);

-- =====================================================
-- ENHANCED ACTIVITY TRACKING
-- =====================================================

-- Add more activity type support
ALTER TABLE client_activities ADD COLUMN IF NOT EXISTS
  activity_category VARCHAR(50), -- communication, document, payment, milestone, etc.
  activity_severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, success
  is_automated BOOLEAN DEFAULT false,
  is_client_visible BOOLEAN DEFAULT false;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Client profile search indexes
CREATE INDEX IF NOT EXISTS idx_clients_wedding_date_range 
  ON clients(wedding_date) 
  WHERE wedding_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_status_date 
  ON clients(status, wedding_date);

CREATE INDEX IF NOT EXISTS idx_clients_budget_range 
  ON clients(budget_total) 
  WHERE budget_total IS NOT NULL;

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_client 
  ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type 
  ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded 
  ON client_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_documents_latest 
  ON client_documents(client_id, is_latest) 
  WHERE is_latest = true;

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_client_communications_client 
  ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_date 
  ON client_communications(communication_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_communications_type 
  ON client_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_client_communications_follow_up 
  ON client_communications(follow_up_date) 
  WHERE follow_up_required = true AND follow_up_completed = false;

-- Milestone indexes
CREATE INDEX IF NOT EXISTS idx_client_milestones_client 
  ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_target 
  ON client_milestones(target_date) 
  WHERE is_completed = false;

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_clients_full_search ON clients USING gin(
  to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(partner_first_name, '') || ' ' ||
    COALESCE(partner_last_name, '') || ' ' ||
    COALESCE(email, '') || ' ' ||
    COALESCE(partner_email, '') || ' ' ||
    COALESCE(venue_name, '') || ' ' ||
    COALESCE(ceremony_venue_name, '') || ' ' ||
    COALESCE(reception_venue_name, '') || ' ' ||
    COALESCE(wedding_theme, '')
  )
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;

-- Client Documents RLS
CREATE POLICY "client_documents_org_access" ON client_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Client Communications RLS
CREATE POLICY "client_communications_org_access" ON client_communications
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- Client Milestones RLS
CREATE POLICY "client_milestones_org_access" ON client_milestones
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- =====================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- =====================================================

-- Function to calculate profile completion score
CREATE OR REPLACE FUNCTION calculate_profile_completion_score(client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  client_record RECORD;
BEGIN
  SELECT * INTO client_record FROM clients WHERE id = client_id;
  
  -- Basic information (30 points)
  IF client_record.first_name IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.last_name IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.email IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.phone IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.partner_first_name IS NOT NULL THEN score := score + 5; END IF;
  IF client_record.partner_email IS NOT NULL THEN score := score + 5; END IF;
  
  -- Wedding details (40 points)
  IF client_record.wedding_date IS NOT NULL THEN score := score + 10; END IF;
  IF client_record.ceremony_venue_name IS NOT NULL THEN score := score + 10; END IF;
  IF client_record.guest_count_estimated IS NOT NULL THEN score := score + 10; END IF;
  IF client_record.budget_total IS NOT NULL THEN score := score + 10; END IF;
  
  -- Additional information (30 points)
  IF client_record.wedding_theme IS NOT NULL THEN score := score + 10; END IF;
  IF jsonb_array_length(client_record.wedding_timeline) > 0 THEN score := score + 10; END IF;
  IF jsonb_array_length(client_record.assigned_vendors) > 0 THEN score := score + 10; END IF;
  
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track activity
CREATE OR REPLACE FUNCTION track_client_activity(
  p_client_id UUID,
  p_organization_id UUID,
  p_activity_type VARCHAR(100),
  p_activity_title VARCHAR(255),
  p_activity_description TEXT,
  p_performed_by UUID,
  p_performed_by_name VARCHAR(255),
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO client_activities (
    client_id,
    organization_id,
    activity_type,
    activity_title,
    activity_description,
    performed_by,
    performed_by_name,
    metadata,
    is_automated,
    created_at
  ) VALUES (
    p_client_id,
    p_organization_id,
    p_activity_type,
    p_activity_title,
    p_activity_description,
    p_performed_by,
    p_performed_by_name,
    p_metadata,
    false,
    NOW()
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update profile completion score
CREATE OR REPLACE FUNCTION update_profile_completion_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completion_score := calculate_profile_completion_score(NEW.id);
  NEW.last_profile_update := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_completion
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_trigger();

-- Trigger to track document uploads
CREATE OR REPLACE FUNCTION track_document_upload_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM track_client_activity(
    NEW.client_id,
    NEW.organization_id,
    'document_uploaded',
    'Document uploaded: ' || NEW.document_name,
    'Document type: ' || NEW.document_type || ', Size: ' || (NEW.file_size / 1024)::INTEGER || 'KB',
    NEW.uploaded_by,
    NEW.uploaded_by_name,
    jsonb_build_object('document_id', NEW.id, 'document_type', NEW.document_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_document_upload
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION track_document_upload_trigger();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON client_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_communications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_milestones TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completion_score TO authenticated;
GRANT EXECUTE ON FUNCTION track_client_activity TO authenticated;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- Create view for monitoring client profile completeness
CREATE OR REPLACE VIEW client_profile_stats AS
SELECT 
  organization_id,
  COUNT(*) as total_clients,
  AVG(profile_completion_score)::INTEGER as avg_completion_score,
  COUNT(*) FILTER (WHERE profile_completion_score >= 80) as well_completed_profiles,
  COUNT(*) FILTER (WHERE profile_completion_score < 50) as incomplete_profiles,
  COUNT(*) FILTER (WHERE wedding_date >= CURRENT_DATE) as upcoming_weddings,
  COUNT(*) FILTER (WHERE wedding_date < CURRENT_DATE) as past_weddings,
  COUNT(DISTINCT client_id) FILTER (WHERE EXISTS (
    SELECT 1 FROM client_documents WHERE client_documents.client_id = clients.id
  )) as clients_with_documents,
  COUNT(DISTINCT client_id) FILTER (WHERE EXISTS (
    SELECT 1 FROM client_communications WHERE client_communications.client_id = clients.id
  )) as clients_with_communications
FROM clients
GROUP BY organization_id;

GRANT SELECT ON client_profile_stats TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE client_documents IS 'Stores all client-related documents with version control and security features';
COMMENT ON TABLE client_communications IS 'Tracks all communications with clients including emails, calls, and meetings';
COMMENT ON TABLE client_milestones IS 'Manages important milestones and deadlines for each wedding';
COMMENT ON COLUMN clients.profile_completion_score IS 'Automatically calculated score (0-100) indicating profile completeness';
COMMENT ON COLUMN clients.guest_list IS 'JSONB array of guest objects with name, email, dietary requirements, etc.';
COMMENT ON COLUMN clients.wedding_timeline IS 'JSONB array of timeline events with time, description, and responsible party';
COMMENT ON FUNCTION calculate_profile_completion_score IS 'Calculates profile completion percentage based on filled fields';
COMMENT ON FUNCTION track_client_activity IS 'Records activity in the client activity log for audit and timeline';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000037_journey_canvas_enhancement.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =====================================================
-- JOURNEY CANVAS ENHANCEMENT
-- =====================================================
-- WS-043: Journey Canvas Technical Implementation
-- Adds canvas-specific tables and enhances existing journey system
-- Created: 2025-08-21
-- =====================================================

-- Add canvas-specific columns to existing journeys table
ALTER TABLE journeys 
ADD COLUMN IF NOT EXISTS canvas_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS canvas_zoom DECIMAL(3,2) DEFAULT 1.0;

-- Create journey_connections table for canvas node connections
DROP VIEW IF EXISTS journey_connections CASCADE;
CREATE TABLE IF NOT EXISTS journey_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES journey_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES journey_nodes(id) ON DELETE CASCADE,
  connection_type TEXT DEFAULT 'default',
  condition_config JSONB DEFAULT '{}',
  style_config JSONB DEFAULT '{}', -- Canvas-specific styling
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create journey_executions table for tracking (alternative name for instances)
DROP VIEW IF EXISTS journey_executions CASCADE;
CREATE TABLE IF NOT EXISTS journey_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES journey_nodes(id),
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'failed')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Create journey_scheduled_actions table for scheduled tasks
DROP VIEW IF EXISTS journey_scheduled_actions CASCADE;
CREATE TABLE IF NOT EXISTS journey_scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES journey_executions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES journey_nodes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'email', 'sms', 'form', 'reminder'
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')) DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update journey_nodes to include canvas-specific fields
ALTER TABLE journey_nodes 
ADD COLUMN IF NOT EXISTS canvas_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS canvas_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timeline_config JSONB DEFAULT '{}'; -- For timeline anchor configuration

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_journey_connections_journey_id ON journey_connections(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_connections_source_node ON journey_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_journey_connections_target_node ON journey_connections(target_node_id);

CREATE INDEX IF NOT EXISTS idx_journey_executions_journey_id ON journey_executions(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_executions_client_id ON journey_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_journey_executions_status ON journey_executions(status);

CREATE INDEX IF NOT EXISTS idx_journey_scheduled_actions_scheduled_for ON journey_scheduled_actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_journey_scheduled_actions_status ON journey_scheduled_actions(status);
CREATE INDEX IF NOT EXISTS idx_journey_scheduled_actions_execution_id ON journey_scheduled_actions(execution_id);

-- Enable RLS on new tables
ALTER TABLE journey_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_scheduled_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journey_connections
CREATE POLICY "Users can view connections for their journeys"
  ON journey_connections FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can manage connections for their journeys"
  ON journey_connections FOR ALL
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- RLS Policies for journey_executions
CREATE POLICY "Users can view executions for their journeys"
  ON journey_executions FOR SELECT
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can manage executions for their journeys"
  ON journey_executions FOR ALL
  USING (
    journey_id IN (
      SELECT id FROM journeys 
      WHERE organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- RLS Policies for journey_scheduled_actions
CREATE POLICY "Users can view scheduled actions for their executions"
  ON journey_scheduled_actions FOR SELECT
  USING (
    execution_id IN (
      SELECT je.id FROM journey_executions je
      JOIN journeys j ON j.id = je.journey_id
      WHERE j.organization_id = (
        SELECT organization_id FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "System can manage scheduled actions"
  ON journey_scheduled_actions FOR ALL
  WITH CHECK (true); -- System processes scheduled actions

-- Create function to validate journey canvas
CREATE OR REPLACE FUNCTION validate_journey_canvas(
  p_journey_id UUID,
  p_nodes JSONB,
  p_connections JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
  v_start_nodes INTEGER;
  v_end_nodes INTEGER;
  v_orphaned_nodes INTEGER;
BEGIN
  -- Check for start nodes
  SELECT COUNT(*) INTO v_start_nodes
  FROM jsonb_array_elements(p_nodes) AS node
  WHERE node->>'type' = 'start';
  
  IF v_start_nodes = 0 THEN
    v_errors := array_append(v_errors, 'Journey must have at least one start node');
  END IF;
  
  IF v_start_nodes > 1 THEN
    v_warnings := array_append(v_warnings, 'Multiple start nodes detected');
  END IF;
  
  -- Check for end nodes
  SELECT COUNT(*) INTO v_end_nodes
  FROM jsonb_array_elements(p_nodes) AS node
  WHERE node->>'type' = 'end';
  
  IF v_end_nodes = 0 THEN
    v_warnings := array_append(v_warnings, 'Journey should have at least one end node');
  END IF;
  
  -- Return validation result
  RETURN jsonb_build_object(
    'isValid', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    'errors', to_jsonb(v_errors),
    'warnings', to_jsonb(v_warnings)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to save canvas state
CREATE OR REPLACE FUNCTION save_journey_canvas(
  p_journey_id UUID,
  p_canvas_data JSONB,
  p_nodes JSONB,
  p_connections JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_node JSONB;
  v_connection JSONB;
BEGIN
  -- Update journey canvas data
  UPDATE journeys 
  SET 
    canvas_data = p_canvas_data,
    updated_at = NOW()
  WHERE id = p_journey_id;
  
  -- Clear existing nodes and connections
  DELETE FROM journey_connections WHERE journey_id = p_journey_id;
  DELETE FROM journey_nodes WHERE journey_id = p_journey_id;
  
  -- Insert nodes
  FOR v_node IN SELECT * FROM jsonb_array_elements(p_nodes)
  LOOP
    INSERT INTO journey_nodes (
      journey_id,
      node_id,
      type,
      name,
      canvas_position,
      config,
      timeline_config
    ) VALUES (
      p_journey_id,
      v_node->>'id',
      (v_node->>'type')::journey_node_type,
      COALESCE(v_node->>'name', v_node->>'label', 'Untitled Node'),
      COALESCE(v_node->'position', '{"x": 0, "y": 0}'::jsonb),
      COALESCE(v_node->'data', '{}'::jsonb),
      COALESCE(v_node->'timelineConfig', '{}'::jsonb)
    );
  END LOOP;
  
  -- Insert connections
  FOR v_connection IN SELECT * FROM jsonb_array_elements(p_connections)
  LOOP
    INSERT INTO journey_connections (
      journey_id,
      source_node_id,
      target_node_id,
      connection_type,
      condition_config
    ) VALUES (
      p_journey_id,
      (SELECT id FROM journey_nodes WHERE journey_id = p_journey_id AND node_id = (v_connection->>'source')),
      (SELECT id FROM journey_nodes WHERE journey_id = p_journey_id AND node_id = (v_connection->>'target')),
      COALESCE(v_connection->>'type', 'default'),
      COALESCE(v_connection->'conditionConfig', '{}'::jsonb)
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON journey_connections TO authenticated;
GRANT ALL ON journey_executions TO authenticated;
GRANT ALL ON journey_scheduled_actions TO authenticated;
GRANT EXECUTE ON FUNCTION validate_journey_canvas(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION save_journey_canvas(UUID, JSONB, JSONB, JSONB) TO authenticated;

-- Comments
COMMENT ON TABLE journey_connections IS 'Canvas connections between journey nodes for WS-043';
COMMENT ON TABLE journey_executions IS 'Journey execution tracking for canvas workflows';
COMMENT ON TABLE journey_scheduled_actions IS 'Scheduled actions for timeline-based nodes';
COMMENT ON FUNCTION validate_journey_canvas IS 'Validates journey canvas structure and connections';
COMMENT ON FUNCTION save_journey_canvas IS 'Saves complete canvas state including nodes and connections';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000038_guest_management_system.sql
-- ========================================

-- Migration: Guest Management System (WS-056)
-- Date: 2025-08-22
-- Features: Guest list builder with households, import tracking, and bulk operations

-- Households table
DROP VIEW IF EXISTS households CASCADE;
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  primary_contact_id UUID,
  address JSONB NOT NULL DEFAULT '{}',
  invitation_sent BOOLEAN DEFAULT FALSE,
  invitation_sent_date TIMESTAMP WITH TIME ZONE,
  total_members INTEGER DEFAULT 1,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests table
DROP VIEW IF EXISTS guests CASCADE;
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address JSONB DEFAULT '{}',
  category VARCHAR(20) NOT NULL DEFAULT 'family' CHECK (category IN ('family', 'friends', 'work', 'other')),
  side VARCHAR(20) NOT NULL DEFAULT 'mutual' CHECK (side IN ('partner1', 'partner2', 'mutual')),
  plus_one BOOLEAN DEFAULT FALSE,
  plus_one_name VARCHAR(100),
  age_group VARCHAR(20) DEFAULT 'adult' CHECK (age_group IN ('adult', 'child', 'infant')),
  table_number INTEGER,
  helper_role VARCHAR(50),
  dietary_restrictions TEXT,
  special_needs TEXT,
  rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined', 'maybe')),
  rsvp_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Import Sessions table
DROP VIEW IF EXISTS guest_import_sessions CASCADE;
CREATE TABLE IF NOT EXISTS guest_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  import_type VARCHAR(30) NOT NULL CHECK (import_type IN ('csv', 'google_contacts', 'manual', 'excel')),
  file_name VARCHAR(255),
  original_file_name VARCHAR(255),
  file_size INTEGER,
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  error_log JSONB DEFAULT '[]',
  mapping_config JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Guest Import History (for rollback functionality)
DROP VIEW IF EXISTS guest_import_history CASCADE;
CREATE TABLE IF NOT EXISTS guest_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id UUID NOT NULL REFERENCES guest_import_sessions(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'skipped', 'error')),
  original_data JSONB,
  processed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for primary_contact_id after guests table is created
ALTER TABLE households
ADD CONSTRAINT fk_households_primary_contact_id 
FOREIGN KEY (primary_contact_id) REFERENCES guests(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_guests_couple_id ON guests(couple_id);
CREATE INDEX IF NOT EXISTS idx_guests_household_id ON guests(household_id);
CREATE INDEX IF NOT EXISTS idx_guests_category ON guests(category);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guests_age_group ON guests(age_group);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_tags ON guests USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON guests(first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_households_couple_id ON households(couple_id);
CREATE INDEX IF NOT EXISTS idx_households_primary_contact_id ON households(primary_contact_id);

CREATE INDEX IF NOT EXISTS idx_import_sessions_couple_id ON guest_import_sessions(couple_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON guest_import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at ON guest_import_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_import_history_session_id ON guest_import_history(import_session_id);
CREATE INDEX IF NOT EXISTS idx_import_history_guest_id ON guest_import_history(guest_id);

-- Full-text search index for guests
CREATE INDEX IF NOT EXISTS idx_guests_fulltext 
ON guests USING GIN (to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(notes, '')));

-- RLS policies for security
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_import_history ENABLE ROW LEVEL SECURITY;

-- Function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment for migration tracking
COMMENT ON TABLE guests IS 'Guest list management for wedding couples - WS-056';
COMMENT ON TABLE households IS 'Household groupings for guest management - WS-056';
COMMENT ON TABLE guest_import_sessions IS 'Import session tracking with rollback capability - WS-056';


-- ========================================
-- Migration: 20250101000039_guest_management_rls.sql
-- ========================================

-- Migration: Guest Management RLS Policies (WS-056)
-- Date: 2025-08-22
-- Features: Row Level Security for guest management system

-- Policies for guests
CREATE POLICY "Users can view guests for their clients" ON guests
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can insert guests for their clients" ON guests
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update guests for their clients" ON guests
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can delete guests for their clients" ON guests
  FOR DELETE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Policies for households (same pattern)
CREATE POLICY "Users can view households for their clients" ON households
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can insert households for their clients" ON households
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update households for their clients" ON households
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can delete households for their clients" ON households
  FOR DELETE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Policies for import sessions
CREATE POLICY "Users can view import sessions for their clients" ON guest_import_sessions
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can insert import sessions for their clients" ON guest_import_sessions
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can update import sessions for their clients" ON guest_import_sessions
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Policies for import history
CREATE POLICY "Users can view import history for their clients" ON guest_import_history
  FOR SELECT USING (
    import_session_id IN (
      SELECT id FROM guest_import_sessions WHERE couple_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
        )
      )
    )
  );

CREATE POLICY "Users can insert import history for their clients" ON guest_import_history
  FOR INSERT WITH CHECK (
    import_session_id IN (
      SELECT id FROM guest_import_sessions WHERE couple_id IN (
        SELECT id FROM clients WHERE organization_id IN (
          SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
        )
      )
    )
  );


-- ========================================
-- Migration: 20250101000040_guest_management_functions.sql
-- ========================================

-- Migration: Guest Management Functions (WS-056)
-- Date: 2025-08-22
-- Features: Advanced functions for guest list management

-- Function for smart household grouping
CREATE OR REPLACE FUNCTION create_household_from_guests(
    guest_ids UUID[], 
    household_name VARCHAR(200)
)
RETURNS UUID AS $$
DECLARE
    new_household_id UUID;
    guest_couple_id UUID;
    primary_guest_id UUID;
    guest_address JSONB;
    adult_count INTEGER;
    child_count INTEGER;
    infant_count INTEGER;
BEGIN
    -- Get couple_id and primary contact from first guest
    SELECT couple_id, id, address INTO guest_couple_id, primary_guest_id, guest_address
    FROM guests WHERE id = guest_ids[1];
    
    -- Count age groups
    SELECT 
        COUNT(CASE WHEN age_group = 'adult' THEN 1 END),
        COUNT(CASE WHEN age_group = 'child' THEN 1 END),
        COUNT(CASE WHEN age_group = 'infant' THEN 1 END)
    INTO adult_count, child_count, infant_count
    FROM guests WHERE id = ANY(guest_ids);
    
    -- Create household
    INSERT INTO households (
        couple_id, name, primary_contact_id, address,
        total_members, adults, children, infants
    ) VALUES (
        guest_couple_id, household_name, guest_address,
        array_length(guest_ids, 1), adult_count, child_count, infant_count
    ) RETURNING id INTO new_household_id;
    
    -- Update guests to reference household
    UPDATE guests SET household_id = new_household_id WHERE id = ANY(guest_ids);
    
    -- Set primary contact after household is created
    UPDATE households SET primary_contact_id = primary_guest_id WHERE id = new_household_id;
    
    RETURN new_household_id;
END;
$$ LANGUAGE plpgsql;

-- Function for bulk guest operations
CREATE OR REPLACE FUNCTION bulk_update_guests(
    guest_ids UUID[],
    updates JSONB
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE guests SET
            category = COALESCE((updates->>'category')::VARCHAR(20), category),
            side = COALESCE((updates->>'side')::VARCHAR(20), side),
            table_number = COALESCE((updates->>'table_number')::INTEGER, table_number),
            rsvp_status = COALESCE((updates->>'rsvp_status')::VARCHAR(20), rsvp_status),
            tags = COALESCE(
                CASE 
                    WHEN updates->>'tags' IS NOT NULL THEN 
                        (SELECT array_agg(DISTINCT elem) FROM unnest(tags || (updates->>'tags')::TEXT[]) elem)
                    ELSE tags
                END, 
                tags
            ),
            dietary_restrictions = COALESCE(updates->>'dietary_restrictions', dietary_restrictions),
            special_needs = COALESCE(updates->>'special_needs', special_needs),
            helper_role = COALESCE(updates->>'helper_role', helper_role),
            updated_at = NOW()
        WHERE id = ANY(guest_ids)
        RETURNING 1
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function for duplicate detection with fuzzy matching
CREATE OR REPLACE FUNCTION find_duplicate_guests(
    couple_id_param UUID,
    email_param VARCHAR(255) DEFAULT NULL,
    first_name_param VARCHAR(100) DEFAULT NULL,
    last_name_param VARCHAR(100) DEFAULT NULL,
    phone_param VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    guest_id UUID,
    match_score INTEGER,
    match_fields TEXT[],
    guest_name TEXT,
    guest_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as guest_id,
        (
            CASE WHEN g.email = email_param AND email_param IS NOT NULL THEN 40 ELSE 0 END +
            CASE WHEN g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL THEN 20 ELSE 0 END +
            CASE WHEN g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL THEN 20 ELSE 0 END +
            CASE WHEN g.phone = phone_param AND phone_param IS NOT NULL THEN 20 ELSE 0 END +
            -- Fuzzy matching bonuses
            CASE WHEN similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8 THEN 10 ELSE 0 END +
            CASE WHEN similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8 THEN 10 ELSE 0 END
        ) as match_score,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN g.email = email_param AND email_param IS NOT NULL THEN 'email' END,
            CASE WHEN g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL THEN 'first_name' END,
            CASE WHEN g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL THEN 'last_name' END,
            CASE WHEN g.phone = phone_param AND phone_param IS NOT NULL THEN 'phone' END,
            CASE WHEN similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8 THEN 'fuzzy_first_name' END,
            CASE WHEN similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8 THEN 'fuzzy_last_name' END
        ], NULL)::TEXT[] as match_fields,
        (g.first_name || ' ' || g.last_name) as guest_name,
        g.email as guest_email
    FROM guests g
    WHERE g.couple_id = couple_id_param
    AND (
        (g.email = email_param AND email_param IS NOT NULL) OR
        (g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL) OR
        (g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL) OR
        (g.phone = phone_param AND phone_param IS NOT NULL) OR
        (similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8) OR
        (similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8)
    )
    HAVING (
        CASE WHEN g.email = email_param AND email_param IS NOT NULL THEN 40 ELSE 0 END +
        CASE WHEN g.first_name ILIKE first_name_param AND first_name_param IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN g.last_name ILIKE last_name_param AND last_name_param IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN g.phone = phone_param AND phone_param IS NOT NULL THEN 20 ELSE 0 END +
        CASE WHEN similarity(g.first_name, COALESCE(first_name_param, '')) > 0.8 THEN 10 ELSE 0 END +
        CASE WHEN similarity(g.last_name, COALESCE(last_name_param, '')) > 0.8 THEN 10 ELSE 0 END
    ) >= 20
    ORDER BY match_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function for intelligent household name generation
CREATE OR REPLACE FUNCTION generate_household_name(guest_ids UUID[])
RETURNS VARCHAR(200) AS $$
DECLARE
    guest_names TEXT[];
    last_names TEXT[];
    household_name VARCHAR(200);
BEGIN
    -- Get all guest names and last names
    SELECT 
        array_agg(first_name ORDER BY first_name),
        array_agg(DISTINCT last_name ORDER BY last_name)
    INTO guest_names, last_names
    FROM guests 
    WHERE id = ANY(guest_ids);
    
    -- Generate household name based on patterns
    IF array_length(last_names, 1) = 1 THEN
        -- Single family name
        IF array_length(guest_names, 1) <= 2 THEN
            household_name := array_to_string(guest_names, ' & ') || ' ' || last_names[1];
        ELSE
            household_name := guest_names[1] || ' ' || last_names[1] || ' Family';
        END IF;
    ELSE
        -- Multiple family names
        household_name := guest_names[1] || ' ' || last_names[1] || ' & ' || guest_names[2] || ' ' || last_names[2];
    END IF;
    
    RETURN COALESCE(household_name, 'Household');
END;
$$ LANGUAGE plpgsql;

-- Function for advanced guest search with filters
CREATE OR REPLACE FUNCTION search_guests(
    couple_id_param UUID,
    search_query TEXT DEFAULT NULL,
    category_filter VARCHAR(20) DEFAULT NULL,
    rsvp_filter VARCHAR(20) DEFAULT NULL,
    age_group_filter VARCHAR(20) DEFAULT NULL,
    side_filter VARCHAR(20) DEFAULT NULL,
    has_dietary_restrictions BOOLEAN DEFAULT NULL,
    has_plus_one BOOLEAN DEFAULT NULL,
    page_size INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    guest_id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    category VARCHAR(20),
    rsvp_status VARCHAR(20),
    age_group VARCHAR(20),
    side VARCHAR(20),
    plus_one BOOLEAN,
    plus_one_name VARCHAR(100),
    table_number INTEGER,
    household_id UUID,
    household_name VARCHAR(200),
    tags TEXT[],
    dietary_restrictions TEXT,
    special_needs TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as guest_id,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        g.category,
        g.rsvp_status,
        g.age_group,
        g.side,
        g.plus_one,
        g.plus_one_name,
        g.table_number,
        g.household_id,
        h.name as household_name,
        g.tags,
        g.dietary_restrictions,
        g.special_needs,
        g.created_at,
        CASE 
            WHEN search_query IS NOT NULL THEN
                ts_rank(
                    to_tsvector('english', g.first_name || ' ' || g.last_name || ' ' || COALESCE(g.email, '') || ' ' || COALESCE(g.notes, '')),
                    plainto_tsquery('english', search_query)
                )
            ELSE 0
        END as rank
    FROM guests g
    LEFT JOIN households h ON g.household_id = h.id
    WHERE g.couple_id = couple_id_param
        AND (category_filter IS NULL OR g.category = category_filter)
        AND (rsvp_filter IS NULL OR g.rsvp_status = rsvp_filter)
        AND (age_group_filter IS NULL OR g.age_group = age_group_filter)
        AND (side_filter IS NULL OR g.side = side_filter)
        AND (has_dietary_restrictions IS NULL OR (g.dietary_restrictions IS NOT NULL AND g.dietary_restrictions != '') = has_dietary_restrictions)
        AND (has_plus_one IS NULL OR g.plus_one = has_plus_one)
        AND (
            search_query IS NULL OR
            to_tsvector('english', g.first_name || ' ' || g.last_name || ' ' || COALESCE(g.email, '') || ' ' || COALESCE(g.notes, ''))
            @@ plainto_tsquery('english', search_query)
        )
    ORDER BY 
        CASE WHEN search_query IS NOT NULL THEN rank END DESC,
        g.last_name, g.first_name
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Function for guest statistics and analytics
CREATE OR REPLACE FUNCTION get_guest_analytics(couple_id_param UUID)
RETURNS TABLE(
    total_guests INTEGER,
    adults INTEGER,
    children INTEGER,
    infants INTEGER,
    attending INTEGER,
    declined INTEGER,
    pending INTEGER,
    maybe INTEGER,
    family INTEGER,
    friends INTEGER,
    work INTEGER,
    other INTEGER,
    partner1_side INTEGER,
    partner2_side INTEGER,
    mutual_side INTEGER,
    with_plus_ones INTEGER,
    with_dietary_restrictions INTEGER,
    with_special_needs INTEGER,
    households INTEGER,
    avg_household_size NUMERIC,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(g.id)::INTEGER as total_guests,
        COUNT(CASE WHEN g.age_group = 'adult' THEN 1 END)::INTEGER as adults,
        COUNT(CASE WHEN g.age_group = 'child' THEN 1 END)::INTEGER as children,
        COUNT(CASE WHEN g.age_group = 'infant' THEN 1 END)::INTEGER as infants,
        COUNT(CASE WHEN g.rsvp_status = 'attending' THEN 1 END)::INTEGER as attending,
        COUNT(CASE WHEN g.rsvp_status = 'declined' THEN 1 END)::INTEGER as declined,
        COUNT(CASE WHEN g.rsvp_status = 'pending' THEN 1 END)::INTEGER as pending,
        COUNT(CASE WHEN g.rsvp_status = 'maybe' THEN 1 END)::INTEGER as maybe,
        COUNT(CASE WHEN g.category = 'family' THEN 1 END)::INTEGER as family,
        COUNT(CASE WHEN g.category = 'friends' THEN 1 END)::INTEGER as friends,
        COUNT(CASE WHEN g.category = 'work' THEN 1 END)::INTEGER as work,
        COUNT(CASE WHEN g.category = 'other' THEN 1 END)::INTEGER as other,
        COUNT(CASE WHEN g.side = 'partner1' THEN 1 END)::INTEGER as partner1_side,
        COUNT(CASE WHEN g.side = 'partner2' THEN 1 END)::INTEGER as partner2_side,
        COUNT(CASE WHEN g.side = 'mutual' THEN 1 END)::INTEGER as mutual_side,
        COUNT(CASE WHEN g.plus_one = true THEN 1 END)::INTEGER as with_plus_ones,
        COUNT(CASE WHEN g.dietary_restrictions IS NOT NULL AND g.dietary_restrictions != '' THEN 1 END)::INTEGER as with_dietary_restrictions,
        COUNT(CASE WHEN g.special_needs IS NOT NULL AND g.special_needs != '' THEN 1 END)::INTEGER as with_special_needs,
        COUNT(DISTINCT g.household_id)::INTEGER as households,
        ROUND(COUNT(g.id)::NUMERIC / NULLIF(COUNT(DISTINCT g.household_id), 0), 2) as avg_household_size,
        MAX(g.updated_at) as last_updated
    FROM guests g
    WHERE g.couple_id = couple_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback import session
CREATE OR REPLACE FUNCTION rollback_import_session(session_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    couple_id_val UUID;
BEGIN
    -- Get couple_id for verification
    SELECT couple_id INTO couple_id_val FROM guest_import_sessions WHERE id = session_id_param;
    
    IF couple_id_val IS NULL THEN
        RAISE EXCEPTION 'Import session not found';
    END IF;
    
    -- Delete guests created in this import session
    WITH deleted AS (
        DELETE FROM guests 
        WHERE id IN (
            SELECT guest_id FROM guest_import_history 
            WHERE import_session_id = session_id_param 
            AND action = 'created'
            AND guest_id IS NOT NULL
        )
        RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Update import session status
    UPDATE guest_import_sessions 
    SET status = 'cancelled', completed_at = NOW()
    WHERE id = session_id_param;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for fuzzy matching if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ========================================
-- Migration: 20250101000041_rsvp_management_system.sql
-- ========================================

-- RSVP Management System
-- Feature: WS-057 - Comprehensive RSVP management with automation and analytics

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RSVP Events Table (weddings, parties, etc.)
DROP VIEW IF EXISTS rsvp_events CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    venue_name TEXT,
    venue_address TEXT,
    max_guests INTEGER,
    rsvp_deadline DATE,
    allow_plus_ones BOOLEAN DEFAULT true,
    require_meal_selection BOOLEAN DEFAULT false,
    require_song_requests BOOLEAN DEFAULT false,
    custom_message TEXT,
    thank_you_message TEXT,
    reminder_settings JSONB DEFAULT '{"enabled": true, "days_before": [30, 14, 7, 3, 1]}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Custom Questions
DROP VIEW IF EXISTS rsvp_custom_questions CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_custom_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'multiple_choice', 'checkbox', 'number', 'date')),
    required BOOLEAN DEFAULT false,
    options JSONB, -- For multiple choice/checkbox options
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Invitations
DROP VIEW IF EXISTS rsvp_invitations CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone VARCHAR(20),
    invitation_code VARCHAR(10) UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
    max_party_size INTEGER DEFAULT 1,
    is_vip BOOLEAN DEFAULT false,
    table_assignment VARCHAR(50),
    invitation_sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Responses
DROP VIEW IF EXISTS rsvp_responses CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'maybe', 'waitlist')),
    party_size INTEGER DEFAULT 1,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    response_source VARCHAR(50) DEFAULT 'web', -- web, email, sms, phone
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Guest Details (for each person in party)
DROP VIEW IF EXISTS rsvp_guest_details CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_guest_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    meal_preference VARCHAR(100),
    dietary_restrictions TEXT[],
    allergies TEXT[],
    song_request TEXT,
    special_needs TEXT,
    age_group VARCHAR(20) CHECK (age_group IN ('adult', 'teen', 'child', 'infant')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Custom Question Responses
DROP VIEW IF EXISTS rsvp_custom_responses CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_custom_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES rsvp_custom_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_json JSONB, -- For complex answers
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Remin