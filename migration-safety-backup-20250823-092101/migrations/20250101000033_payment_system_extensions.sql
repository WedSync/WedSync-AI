-- Extensions for payment system
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment status tracking table (for real-time status updates)
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