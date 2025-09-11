-- Automated Reminders System for Wedding Milestones
-- WS-084: Wedding milestone notification system
-- Handles automated reminder scheduling, processing, and delivery

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.reminder_history CASCADE;
DROP TABLE IF EXISTS public.reminder_queue CASCADE;
DROP TABLE IF EXISTS public.reminder_templates CASCADE;
DROP TABLE IF EXISTS public.reminder_schedules CASCADE;

-- Reminder Templates (reusable content templates)
CREATE TABLE public.reminder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('payment', 'milestone', 'vendor_task', 'couple_task', 'deadline', 'general')),
    subject_template TEXT NOT NULL,
    email_template TEXT,
    sms_template TEXT,
    variables JSONB DEFAULT '[]', -- Array of template variables like {firstName}, {dueDate}, etc.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- System templates vs custom templates
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder Schedules (defines when reminders should be sent)
CREATE TABLE public.reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.reminder_templates(id) ON DELETE CASCADE,
    
    -- What this reminder is about
    entity_type VARCHAR(100) NOT NULL, -- 'payment', 'contract', 'milestone', 'task', etc.
    entity_id UUID NOT NULL, -- ID of the related entity
    entity_name VARCHAR(255), -- Human readable name for the entity
    
    -- Recipient information
    recipient_id UUID, -- Can be client_id, vendor_id, or team member
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('client', 'vendor', 'team', 'couple')),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    
    -- Timing configuration
    trigger_date TIMESTAMPTZ NOT NULL, -- When the reminder should be sent
    advance_days INTEGER DEFAULT 0, -- Days before trigger_date to send (e.g., 7 for "7 days before")
    
    -- Recurrence settings
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', null for one-time
    recurrence_end TIMESTAMPTZ,
    
    -- Channel preferences
    send_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_sms BOOLEAN NOT NULL DEFAULT FALSE,
    send_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Status and processing
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled', 'snoozed')),
    next_send_at TIMESTAMPTZ, -- Calculated field for when this should next be processed
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempted_at TIMESTAMPTZ,
    
    -- Snooze functionality
    snoozed_until TIMESTAMPTZ,
    snooze_count INTEGER NOT NULL DEFAULT 0,
    
    -- Escalation
    escalation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_days INTEGER DEFAULT 3, -- Days after missed deadline to escalate
    escalation_recipient_ids UUID[], -- Array of user IDs to escalate to
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder Queue (for processing reminders)
CREATE TABLE public.reminder_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.reminder_schedules(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Processing information
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
    
    -- Content (resolved from template)
    resolved_subject TEXT,
    resolved_email_content TEXT,
    resolved_sms_content TEXT,
    
    -- Recipients
    recipients JSONB NOT NULL, -- Array of recipient objects with email/phone/etc
    
    -- Processing tracking
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder History (track all sent reminders)
CREATE TABLE public.reminder_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.reminder_schedules(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES public.reminder_queue(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Content that was sent
    subject TEXT NOT NULL,
    content TEXT,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    
    -- Recipient information
    recipient_id UUID,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_name VARCHAR(255),
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    -- Provider information
    provider VARCHAR(50), -- 'resend', 'twilio', etc.
    provider_id VARCHAR(255), -- External provider's message ID
    
    -- Status tracking
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked')),
    error_message TEXT,
    
    -- Response tracking
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    snoozed BOOLEAN NOT NULL DEFAULT FALSE,
    snoozed_until TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX idx_reminder_templates_org ON public.reminder_templates(organization_id);
CREATE INDEX idx_reminder_templates_category ON public.reminder_templates(category);
CREATE INDEX idx_reminder_templates_active ON public.reminder_templates(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_reminder_schedules_org ON public.reminder_schedules(organization_id);
CREATE INDEX idx_reminder_schedules_client ON public.reminder_schedules(client_id);
CREATE INDEX idx_reminder_schedules_template ON public.reminder_schedules(template_id);
CREATE INDEX idx_reminder_schedules_entity ON public.reminder_schedules(entity_type, entity_id);
CREATE INDEX idx_reminder_schedules_status ON public.reminder_schedules(status);
CREATE INDEX idx_reminder_schedules_next_send ON public.reminder_schedules(next_send_at) WHERE status = 'scheduled';
CREATE INDEX idx_reminder_schedules_trigger_date ON public.reminder_schedules(trigger_date);

CREATE INDEX idx_reminder_queue_scheduled_for ON public.reminder_queue(scheduled_for);
CREATE INDEX idx_reminder_queue_status ON public.reminder_queue(status);
CREATE INDEX idx_reminder_queue_priority ON public.reminder_queue(priority, scheduled_for);
CREATE INDEX idx_reminder_queue_processing ON public.reminder_queue(status, scheduled_for) WHERE status IN ('pending', 'retrying');

CREATE INDEX idx_reminder_history_org ON public.reminder_history(organization_id);
CREATE INDEX idx_reminder_history_schedule ON public.reminder_history(schedule_id);
CREATE INDEX idx_reminder_history_sent_at ON public.reminder_history(sent_at DESC);
CREATE INDEX idx_reminder_history_recipient ON public.reminder_history(recipient_id);
CREATE INDEX idx_reminder_history_delivery_status ON public.reminder_history(delivery_status);

-- Create update triggers
CREATE TRIGGER update_reminder_templates_updated_at BEFORE UPDATE ON public.reminder_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_schedules_updated_at BEFORE UPDATE ON public.reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_queue_updated_at BEFORE UPDATE ON public.reminder_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next_send_at for reminder schedules
CREATE OR REPLACE FUNCTION calculate_next_send_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate when this reminder should be sent
    IF NEW.advance_days > 0 THEN
        NEW.next_send_at = NEW.trigger_date - INTERVAL '1 day' * NEW.advance_days;
    ELSE
        NEW.next_send_at = NEW.trigger_date;
    END IF;
    
    -- If snoozed, use snooze time instead
    IF NEW.snoozed_until IS NOT NULL AND NEW.snoozed_until > NOW() THEN
        NEW.next_send_at = NEW.snoozed_until;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_next_send_at_trigger
    BEFORE INSERT OR UPDATE ON public.reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION calculate_next_send_at();

-- Function to add reminders to processing queue
CREATE OR REPLACE FUNCTION queue_reminder_for_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if status is scheduled and next_send_at is in the future but within processing window
    IF NEW.status = 'scheduled' AND NEW.next_send_at IS NOT NULL 
       AND NEW.next_send_at <= NOW() + INTERVAL '15 minutes' 
       AND NEW.next_send_at >= NOW() - INTERVAL '1 hour' THEN
        
        INSERT INTO public.reminder_queue (
            schedule_id,
            organization_id,
            scheduled_for,
            priority,
            recipients
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            NEW.next_send_at,
            CASE 
                WHEN NEW.entity_type = 'payment' THEN 1  -- Highest priority for payments
                WHEN NEW.entity_type = 'deadline' THEN 2
                WHEN NEW.entity_type = 'milestone' THEN 3
                ELSE 5
            END,
            jsonb_build_array(
                jsonb_build_object(
                    'id', NEW.recipient_id,
                    'type', NEW.recipient_type,
                    'email', NEW.recipient_email,
                    'phone', NEW.recipient_phone
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER queue_reminder_for_processing_trigger
    AFTER UPDATE ON public.reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION queue_reminder_for_processing();

-- Insert default reminder templates
INSERT INTO public.reminder_templates (organization_id, name, description, category, subject_template, email_template, sms_template, variables, is_system) VALUES
(uuid_nil(), 'Payment Due Reminder', 'Standard payment due reminder', 'payment', 
'Payment Due: {amount} for {serviceName}', 
'<p>Dear {clientName},</p><p>This is a friendly reminder that your payment of <strong>{amount}</strong> for {serviceName} is due on {dueDate}.</p><p>Please make your payment at your earliest convenience.</p><p>Best regards,<br>Your Wedding Team</p>',
'Hi {clientName}, your payment of {amount} for {serviceName} is due on {dueDate}. Please pay at your earliest convenience.',
'["clientName", "amount", "serviceName", "dueDate"]', true),

(uuid_nil(), 'Vendor Task Reminder', 'Reminder for vendor deliverables', 'vendor_task',
'Task Reminder: {taskName} due {dueDate}',
'<p>Dear {vendorName},</p><p>This is a reminder that <strong>{taskName}</strong> is due on {dueDate}.</p><p>Task details: {taskDescription}</p><p>Please confirm completion or contact us if you need assistance.</p><p>Best regards,<br>Your Wedding Coordination Team</p>',
'Reminder: {taskName} is due {dueDate}. Please confirm completion.',
'["vendorName", "taskName", "taskDescription", "dueDate"]', true),

(uuid_nil(), 'Wedding Milestone Reminder', 'General wedding milestone reminder', 'milestone',
'Upcoming: {milestoneName} - {daysRemaining} days to go!',
'<p>Dear {clientName},</p><p>Your wedding milestone <strong>{milestoneName}</strong> is coming up in {daysRemaining} days!</p><p>{milestoneDescription}</p><p>Items to complete:</p><ul>{todoItems}</ul><p>We''re here to help make your special day perfect!</p>',
'Hi {clientName}! {milestoneName} is in {daysRemaining} days. {milestoneDescription}',
'["clientName", "milestoneName", "milestoneDescription", "daysRemaining", "todoItems"]', true),

(uuid_nil(), 'Couple Task Reminder', 'Reminder for couple to complete tasks', 'couple_task',
'Action Required: {taskName}',
'<p>Dear {coupleName},</p><p>You have an outstanding task: <strong>{taskName}</strong></p><p>Due date: {dueDate}</p><p>Description: {taskDescription}</p><p>Please complete this task to keep your wedding planning on track!</p>',
'Hi {coupleName}, reminder to complete: {taskName} by {dueDate}',
'["coupleName", "taskName", "taskDescription", "dueDate"]', true);

-- Create cron job for processing reminder queue
SELECT cron.schedule(
    'process-reminder-queue',
    '*/5 * * * *', -- Every 5 minutes
    $$
    UPDATE public.reminder_queue 
    SET status = 'processing', processing_started_at = NOW() 
    WHERE status IN ('pending', 'retrying') 
    AND scheduled_for <= NOW() 
    ORDER BY priority ASC, scheduled_for ASC 
    LIMIT 100;
    $$
);

-- Grant permissions
GRANT ALL ON public.reminder_templates TO postgres;
GRANT ALL ON public.reminder_schedules TO postgres;
GRANT ALL ON public.reminder_queue TO postgres;
GRANT ALL ON public.reminder_history TO postgres;

-- RLS policies will be added in a separate migration for security
COMMENT ON TABLE public.reminder_templates IS 'Reusable templates for automated reminders';
COMMENT ON TABLE public.reminder_schedules IS 'Scheduled reminders for wedding milestones and deadlines';
COMMENT ON TABLE public.reminder_queue IS 'Processing queue for pending reminders';
COMMENT ON TABLE public.reminder_history IS 'Historical record of all sent reminders';