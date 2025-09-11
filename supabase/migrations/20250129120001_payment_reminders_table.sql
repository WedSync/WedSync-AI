-- Create payment_reminders table for WS-165 Payment Calendar reminder system
-- This table stores automated reminders for payment schedules

CREATE TABLE IF NOT EXISTS payment_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_schedule_id uuid NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
    
    -- Reminder timing
    reminder_date timestamptz NOT NULL,
    reminder_type varchar(30) NOT NULL 
        CHECK (reminder_type IN ('email', 'sms', 'push', 'overdue_notification', 'payment_confirmation', 'final_notice')),
    
    -- Reminder content
    message text DEFAULT NULL CHECK (length(message) <= 1000),
    subject varchar(200) DEFAULT NULL,
    
    -- Delivery status
    is_sent boolean NOT NULL DEFAULT false,
    sent_at timestamptz DEFAULT NULL,
    is_cancelled boolean NOT NULL DEFAULT false,
    cancelled_at timestamptz DEFAULT NULL,
    cancelled_reason varchar(200) DEFAULT NULL,
    
    -- Delivery tracking
    delivery_status varchar(20) DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
    delivery_attempts integer DEFAULT 0 CHECK (delivery_attempts >= 0),
    last_attempt_at timestamptz DEFAULT NULL,
    error_message text DEFAULT NULL,
    
    -- Wedding industry specific timing
    days_before_due integer DEFAULT NULL,
    reminder_priority varchar(20) DEFAULT 'medium' 
        CHECK (reminder_priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Notification channels
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    push_enabled boolean DEFAULT false,
    
    -- Recipient information
    recipient_email varchar(320) DEFAULT NULL,
    recipient_phone varchar(20) DEFAULT NULL,
    recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_sent_status CHECK (
        (is_sent = true AND sent_at IS NOT NULL) OR 
        (is_sent = false AND sent_at IS NULL)
    ),
    
    CONSTRAINT valid_cancelled_status CHECK (
        (is_cancelled = true AND cancelled_at IS NOT NULL) OR 
        (is_cancelled = false AND cancelled_at IS NULL)
    ),
    
    CONSTRAINT valid_delivery_channels CHECK (
        email_enabled = true OR sms_enabled = true OR push_enabled = true
    ),
    
    CONSTRAINT valid_reminder_date CHECK (reminder_date >= '2020-01-01'::timestamptz)
);

-- Create indexes for performance
CREATE INDEX idx_payment_reminders_schedule_id ON payment_reminders(payment_schedule_id);
CREATE INDEX idx_payment_reminders_reminder_date ON payment_reminders(reminder_date);
CREATE INDEX idx_payment_reminders_pending ON payment_reminders(reminder_date, is_sent, is_cancelled) 
    WHERE is_sent = false AND is_cancelled = false;
CREATE INDEX idx_payment_reminders_failed ON payment_reminders(delivery_status, last_attempt_at) 
    WHERE delivery_status = 'failed';
CREATE INDEX idx_payment_reminders_user_id ON payment_reminders(recipient_user_id) 
    WHERE recipient_user_id IS NOT NULL;

-- Create composite indexes for reminder processing
CREATE INDEX idx_payment_reminders_processing ON payment_reminders(reminder_date, delivery_status, reminder_type)
    WHERE delivery_status IN ('pending', 'failed') AND is_cancelled = false;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_reminders_updated_at
    BEFORE UPDATE ON payment_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_reminders_updated_at();

-- Function to automatically create reminders when payment schedules are created
CREATE OR REPLACE FUNCTION create_default_payment_reminders()
RETURNS TRIGGER AS $$
DECLARE
    reminder_dates timestamptz[];
    reminder_types varchar[];
    i integer;
BEGIN
    -- Create default reminders based on wedding industry standards
    -- 30 days before (planning reminder)
    -- 14 days before (preparation reminder)  
    -- 7 days before (urgent reminder)
    -- 3 days before (critical reminder)
    -- 1 day before (final notice)
    
    reminder_dates := ARRAY[
        NEW.due_date - interval '30 days',
        NEW.due_date - interval '14 days', 
        NEW.due_date - interval '7 days',
        NEW.due_date - interval '3 days',
        NEW.due_date - interval '1 day'
    ];
    
    reminder_types := ARRAY[
        'email',
        'email', 
        'email',
        'sms',
        'final_notice'
    ];
    
    -- Only create reminders for future due dates
    IF NEW.due_date > CURRENT_DATE THEN
        FOR i IN 1..array_length(reminder_dates, 1) LOOP
            -- Only create reminder if the reminder date is in the future
            IF reminder_dates[i] > now() THEN
                INSERT INTO payment_reminders (
                    payment_schedule_id,
                    reminder_date,
                    reminder_type,
                    days_before_due,
                    reminder_priority,
                    created_by,
                    message
                ) VALUES (
                    NEW.id,
                    reminder_dates[i],
                    reminder_types[i],
                    EXTRACT(days FROM (NEW.due_date - reminder_dates[i]::date)),
                    CASE 
                        WHEN i >= 4 THEN 'urgent'
                        WHEN i >= 3 THEN 'high'  
                        ELSE 'medium'
                    END,
                    NEW.created_by,
                    format('Payment reminder: %s due in %s days', 
                           NEW.description, 
                           EXTRACT(days FROM (NEW.due_date - reminder_dates[i]::date)))
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically create reminders when payment schedule is created
CREATE TRIGGER create_payment_reminders_trigger
    AFTER INSERT ON payment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION create_default_payment_reminders();

-- Row Level Security (RLS)
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access reminders for payment schedules they can access
CREATE POLICY payment_reminders_access_policy ON payment_reminders
    FOR ALL USING (
        payment_schedule_id IN (
            SELECT ps.id 
            FROM payment_schedules ps
            INNER JOIN weddings w ON ps.wedding_id = w.id
            INNER JOIN wedding_team_members wtm ON w.id = wtm.wedding_id 
            WHERE wtm.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON payment_reminders TO authenticated;
GRANT ALL ON payment_reminders TO service_role;

COMMENT ON TABLE payment_reminders IS 'Automated reminder system for payment schedules with wedding industry timing';
COMMENT ON COLUMN payment_reminders.reminder_type IS 'Reminder delivery method and type: email, sms, push, overdue_notification, payment_confirmation, final_notice';
COMMENT ON COLUMN payment_reminders.days_before_due IS 'Number of days before payment due date this reminder fires';
COMMENT ON COLUMN payment_reminders.delivery_status IS 'Tracks delivery status for reliability and retry logic';