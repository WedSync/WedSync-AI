-- Create payment_schedule_history table for audit trail of payment status changes
-- This table maintains immutable history of all payment schedule modifications

CREATE TABLE IF NOT EXISTS payment_schedule_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_schedule_id uuid NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
    
    -- Status change tracking
    previous_status varchar(20) NOT NULL,
    new_status varchar(20) NOT NULL,
    status_changed_at timestamptz NOT NULL DEFAULT now(),
    
    -- Payment amount tracking
    previous_amount_paid numeric(10,2) DEFAULT NULL,
    new_amount_paid numeric(10,2) DEFAULT NULL,
    
    -- Payment method and reference
    payment_method varchar(50) DEFAULT NULL,
    transaction_reference varchar(200) DEFAULT NULL,
    
    -- Change details
    change_reason varchar(200) DEFAULT NULL,
    notes text DEFAULT NULL CHECK (length(notes) <= 1000),
    
    -- User who made the change
    changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_by_role varchar(50) DEFAULT NULL,
    
    -- System context
    ip_address inet DEFAULT NULL,
    user_agent text DEFAULT NULL,
    
    -- Metadata for complex changes
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Immutable timestamp
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance and audit queries
CREATE INDEX idx_payment_schedule_history_schedule_id ON payment_schedule_history(payment_schedule_id);
CREATE INDEX idx_payment_schedule_history_changed_at ON payment_schedule_history(status_changed_at);
CREATE INDEX idx_payment_schedule_history_changed_by ON payment_schedule_history(changed_by);
CREATE INDEX idx_payment_schedule_history_status_change ON payment_schedule_history(previous_status, new_status);

-- Composite index for audit trails
CREATE INDEX idx_payment_schedule_history_audit ON payment_schedule_history(payment_schedule_id, status_changed_at DESC);

-- Function to automatically log payment schedule changes
CREATE OR REPLACE FUNCTION log_payment_schedule_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_reason_text varchar(200);
    user_role varchar(50);
BEGIN
    -- Only log if status or amount_paid actually changed
    IF OLD.status != NEW.status OR 
       COALESCE(OLD.amount_paid, 0) != COALESCE(NEW.amount_paid, 0) THEN
        
        -- Determine change reason
        change_reason_text := CASE
            WHEN OLD.status = 'pending' AND NEW.status = 'paid' THEN 'Payment completed'
            WHEN OLD.status = 'pending' AND NEW.status = 'partial' THEN 'Partial payment received'
            WHEN OLD.status = 'pending' AND NEW.status = 'overdue' THEN 'Payment became overdue'
            WHEN OLD.status = 'pending' AND NEW.status = 'cancelled' THEN 'Payment cancelled'
            WHEN OLD.status = 'partial' AND NEW.status = 'paid' THEN 'Final payment completed'
            WHEN OLD.status = 'overdue' AND NEW.status = 'paid' THEN 'Overdue payment received'
            WHEN OLD.status != NEW.status THEN format('Status changed from %s to %s', OLD.status, NEW.status)
            WHEN COALESCE(OLD.amount_paid, 0) != COALESCE(NEW.amount_paid, 0) THEN 'Payment amount updated'
            ELSE 'Payment schedule updated'
        END;
        
        -- Get user role (try to get from wedding team members)
        SELECT wtm.role INTO user_role
        FROM wedding_team_members wtm
        WHERE wtm.wedding_id = NEW.wedding_id 
        AND wtm.user_id = NEW.updated_by
        LIMIT 1;
        
        -- Insert history record
        INSERT INTO payment_schedule_history (
            payment_schedule_id,
            previous_status,
            new_status,
            previous_amount_paid,
            new_amount_paid,
            payment_method,
            transaction_reference,
            change_reason,
            notes,
            changed_by,
            changed_by_role,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            OLD.amount_paid,
            NEW.amount_paid,
            NEW.payment_method,
            NEW.transaction_reference,
            change_reason_text,
            NEW.notes,
            NEW.updated_by,
            user_role,
            jsonb_build_object(
                'previous_due_date', OLD.due_date,
                'new_due_date', NEW.due_date,
                'previous_amount', OLD.amount,
                'new_amount', NEW.amount,
                'update_timestamp', NEW.updated_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to log payment schedule changes
CREATE TRIGGER log_payment_schedule_changes_trigger
    AFTER UPDATE ON payment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_schedule_changes();

-- Row Level Security (RLS)
ALTER TABLE payment_schedule_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for payment schedules they can access
CREATE POLICY payment_schedule_history_read_policy ON payment_schedule_history
    FOR SELECT USING (
        payment_schedule_id IN (
            SELECT ps.id 
            FROM payment_schedules ps
            INNER JOIN weddings w ON ps.wedding_id = w.id
            INNER JOIN wedding_team_members wtm ON w.id = wtm.wedding_id 
            WHERE wtm.user_id = auth.uid()
        )
    );

-- No INSERT/UPDATE/DELETE policies - history is managed automatically by triggers
-- This ensures history records cannot be manually manipulated

-- Grant permissions
GRANT SELECT ON payment_schedule_history TO authenticated;
GRANT ALL ON payment_schedule_history TO service_role;

COMMENT ON TABLE payment_schedule_history IS 'Immutable audit trail of payment schedule status changes and modifications';
COMMENT ON COLUMN payment_schedule_history.change_reason IS 'Human-readable reason for the status change';
COMMENT ON COLUMN payment_schedule_history.metadata IS 'Additional context about the change including previous/new values';

-- Create view for easy payment status timeline
CREATE OR REPLACE VIEW payment_status_timeline AS
SELECT 
    psh.payment_schedule_id,
    ps.wedding_id,
    ps.description as payment_description,
    psh.previous_status,
    psh.new_status,
    psh.previous_amount_paid,
    psh.new_amount_paid,
    psh.payment_method,
    psh.transaction_reference,
    psh.change_reason,
    psh.status_changed_at,
    psh.changed_by,
    psh.changed_by_role,
    up.full_name as changed_by_name,
    up.email as changed_by_email
FROM payment_schedule_history psh
INNER JOIN payment_schedules ps ON psh.payment_schedule_id = ps.id
LEFT JOIN user_profiles up ON psh.changed_by = up.id
ORDER BY psh.payment_schedule_id, psh.status_changed_at DESC;

-- RLS for the view
ALTER VIEW payment_status_timeline SET (security_invoker = true);

COMMENT ON VIEW payment_status_timeline IS 'User-friendly view of payment status changes with user information for audit reports';