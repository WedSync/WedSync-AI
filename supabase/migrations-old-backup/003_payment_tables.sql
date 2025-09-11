-- Payment History Table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  customer_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL, -- Always store in cents to avoid floating point issues
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  refunded_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events Table for idempotency protection
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processed'
);

-- Subscription History for tracking subscription changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  pricing_tier VARCHAR(20) NOT NULL,
  price_amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  interval VARCHAR(20) NOT NULL, -- 'month' or 'year'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods for storing customer payment methods securely
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'card', 'bank_account', etc.
  brand VARCHAR(50), -- For cards: visa, mastercard, etc.
  last4 VARCHAR(4), -- Last 4 digits only
  exp_month INTEGER, -- For cards
  exp_year INTEGER, -- For cards
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table for storing invoice data
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  invoice_number VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  invoice_pdf VARCHAR(500),
  hosted_invoice_url VARCHAR(500),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payment_history_org ON payment_history(organization_id);
CREATE INDEX idx_payment_history_customer ON payment_history(customer_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created ON payment_history(created_at DESC);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed_at DESC);

CREATE INDEX idx_subscription_history_org ON subscription_history(organization_id);
CREATE INDEX idx_subscription_history_stripe_id ON subscription_history(stripe_subscription_id);
CREATE INDEX idx_subscription_history_status ON subscription_history(status);

CREATE INDEX idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX idx_payment_methods_customer ON payment_methods(stripe_customer_id);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_customer ON invoices(stripe_customer_id);
CREATE INDEX idx_invoices_subscription ON invoices(stripe_subscription_id);

-- Enable Row Level Security
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_history
CREATE POLICY "Organizations can view their payment history"
  ON payment_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  ));

-- RLS Policies for subscription_history  
CREATE POLICY "Organizations can view their subscription history"
  ON subscription_history FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  ));

-- RLS Policies for payment_methods
CREATE POLICY "Organizations can view their payment methods"
  ON payment_methods FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  ));

-- RLS Policies for invoices
CREATE POLICY "Organizations can view their invoices"
  ON invoices FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid()
  ));

-- Webhook events are internal only - no RLS for users
CREATE POLICY "Service role only for webhook events"
  ON webhook_events FOR ALL
  USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON payment_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();