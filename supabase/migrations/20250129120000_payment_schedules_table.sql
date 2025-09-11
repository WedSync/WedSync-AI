-- Create payment_schedules table for WS-165 Payment Calendar
-- This table stores scheduled payments with due dates for wedding planning

CREATE TABLE IF NOT EXISTS payment_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id uuid REFERENCES budget_categories(id) ON DELETE SET NULL,
    
    -- Payment details
    amount numeric(10,2) NOT NULL CHECK (amount > 0),
    description text NOT NULL CHECK (length(description) >= 3 AND length(description) <= 500),
    due_date date NOT NULL,
    
    -- Payment status
    status varchar(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'partial')),
    
    -- Payment tracking
    amount_paid numeric(10,2) DEFAULT NULL CHECK (amount_paid >= 0),
    paid_date timestamptz DEFAULT NULL,
    payment_method varchar(50) DEFAULT NULL,
    transaction_reference varchar(200) DEFAULT NULL,
    
    -- Vendor information
    vendor_name varchar(200) DEFAULT NULL,
    vendor_contact varchar(200) DEFAULT NULL,
    
    -- Additional details
    notes text DEFAULT NULL CHECK (length(notes) <= 1000),
    priority varchar(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Wedding-specific timing
    payment_type varchar(30) DEFAULT 'milestone' 
        CHECK (payment_type IN ('deposit', 'milestone', 'final', 'balance', 'gratuity')),
    
    -- Metadata
    tags jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_payment_amount CHECK (
        (status = 'paid' AND amount_paid = amount) OR 
        (status = 'partial' AND amount_paid > 0 AND amount_paid < amount) OR 
        (status IN ('pending', 'overdue', 'cancelled') AND (amount_paid IS NULL OR amount_paid = 0))
    ),
    
    CONSTRAINT valid_paid_date CHECK (
        (status = 'paid' AND paid_date IS NOT NULL) OR 
        (status != 'paid' AND paid_date IS NULL)
    ),
    
    CONSTRAINT due_date_reasonable CHECK (due_date >= '2020-01-01' AND due_date <= '2030-12-31')
);

-- Create indexes for performance
CREATE INDEX idx_payment_schedules_wedding_id ON payment_schedules(wedding_id);
CREATE INDEX idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX idx_payment_schedules_category_id ON payment_schedules(category_id);
CREATE INDEX idx_payment_schedules_overdue ON payment_schedules(due_date, status) 
    WHERE status IN ('pending', 'partial') AND due_date < CURRENT_DATE;
CREATE INDEX idx_payment_schedules_upcoming ON payment_schedules(due_date, status) 
    WHERE status IN ('pending', 'partial') AND due_date >= CURRENT_DATE;

-- Create composite indexes for common queries
CREATE INDEX idx_payment_schedules_wedding_due_status ON payment_schedules(wedding_id, due_date, status);
CREATE INDEX idx_payment_schedules_organization_status ON payment_schedules(organization_id, status);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_schedules_updated_at
    BEFORE UPDATE ON payment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_schedules_updated_at();

-- Row Level Security (RLS)
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access payment schedules for weddings they're part of
CREATE POLICY payment_schedules_access_policy ON payment_schedules
    FOR ALL USING (
        wedding_id IN (
            SELECT w.id 
            FROM weddings w 
            INNER JOIN wedding_team_members wtm ON w.id = wtm.wedding_id 
            WHERE wtm.user_id = auth.uid()
        )
    );

-- Policy: Only team members with appropriate roles can insert/update
CREATE POLICY payment_schedules_write_policy ON payment_schedules
    FOR INSERT WITH CHECK (
        wedding_id IN (
            SELECT w.id 
            FROM weddings w 
            INNER JOIN wedding_team_members wtm ON w.id = wtm.wedding_id 
            WHERE wtm.user_id = auth.uid() 
            AND wtm.role IN ('owner', 'partner', 'planner', 'financial_manager')
        )
    );

CREATE POLICY payment_schedules_update_policy ON payment_schedules
    FOR UPDATE USING (
        wedding_id IN (
            SELECT w.id 
            FROM weddings w 
            INNER JOIN wedding_team_members wtm ON w.id = wtm.wedding_id 
            WHERE wtm.user_id = auth.uid() 
            AND wtm.role IN ('owner', 'partner', 'planner', 'financial_manager')
        )
    );

-- Policy: Only owners and planners can delete
CREATE POLICY payment_schedules_delete_policy ON payment_schedules
    FOR DELETE USING (
        wedding_id IN (
            SELECT w.id 
            FROM weddings w 
            INNER JOIN wedding_team_members wtm ON w.id = wtm.wedding_id 
            WHERE wtm.user_id = auth.uid() 
            AND wtm.role IN ('owner', 'planner')
        )
    );

-- Grant permissions
GRANT ALL ON payment_schedules TO authenticated;
GRANT ALL ON payment_schedules TO service_role;

COMMENT ON TABLE payment_schedules IS 'Wedding payment scheduling calendar for tracking due dates, vendor payments, and payment status';
COMMENT ON COLUMN payment_schedules.payment_type IS 'Wedding-specific payment types: deposit (initial), milestone (progress), final (completion), balance (remaining), gratuity (tips)';
COMMENT ON COLUMN payment_schedules.priority IS 'Payment urgency: critical (wedding date risk), high (vendor requirement), medium (standard), low (optional)';