-- WS-342: Advanced Form Builder Engine Database Schema
-- Date: 2025-09-08
-- Feature: Enterprise-grade form builder with conditional logic, multi-step workflows, and advanced validation
-- Team B - Backend Implementation Round 1

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create form builder schema for advanced features
CREATE SCHEMA IF NOT EXISTS form_builder;

-- Enhanced forms table with comprehensive configuration
CREATE TABLE IF NOT EXISTS form_builder.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_name TEXT NOT NULL,
    form_description TEXT,
    form_type TEXT NOT NULL CHECK (form_type IN 
        ('intake', 'questionnaire', 'booking', 'contract', 'payment', 'feedback', 'rsvp', 'vendor_application')),
    
    -- Form configuration
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    requires_authentication BOOLEAN DEFAULT false,
    max_submissions INTEGER, -- NULL for unlimited
    submission_count INTEGER DEFAULT 0,
    
    -- Multi-step configuration
    is_multi_step BOOLEAN DEFAULT false,
    step_count INTEGER DEFAULT 1,
    step_configuration JSONB DEFAULT '[]'::jsonb, -- Step metadata and navigation rules
    
    -- Design and behavior
    theme_id UUID, -- Future reference to form themes table
    custom_css TEXT,
    completion_redirect_url TEXT,
    thank_you_message TEXT DEFAULT 'Thank you for your submission!',
    
    -- Advanced settings
    allows_multiple_submissions BOOLEAN DEFAULT false,
    auto_save_progress BOOLEAN DEFAULT true,
    submission_deadline TIMESTAMPTZ,
    notification_emails TEXT[] DEFAULT '{}', -- Multiple email recipients
    
    -- Integration settings
    webhook_url TEXT,
    webhook_secret TEXT, -- For webhook signature verification
    crm_integration_config JSONB DEFAULT '{}'::jsonb,
    email_integration_config JSONB DEFAULT '{}'::jsonb,
    calendar_integration_config JSONB DEFAULT '{}'::jsonb,
    
    -- Analytics and optimization
    analytics_enabled BOOLEAN DEFAULT true,
    conversion_tracking_enabled BOOLEAN DEFAULT true,
    ab_test_config JSONB DEFAULT '{}'::jsonb,
    
    -- SEO and sharing
    meta_title TEXT,
    meta_description TEXT,
    social_image_url TEXT,
    custom_slug TEXT,
    
    -- Performance settings
    enable_progressive_loading BOOLEAN DEFAULT true,
    cache_responses BOOLEAN DEFAULT false,
    response_cache_ttl INTEGER DEFAULT 300, -- seconds
    
    -- Security settings
    enable_captcha BOOLEAN DEFAULT false,
    enable_honeypot BOOLEAN DEFAULT true,
    rate_limit_submissions INTEGER DEFAULT 10, -- per hour per IP
    
    -- Wedding industry specific
    wedding_date_field_id UUID, -- Reference to the wedding date field
    venue_info_field_id UUID, -- Reference to venue information field
    guest_count_field_id UUID, -- Reference to guest count field
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_form_slug_per_org UNIQUE(organization_id, custom_slug),
    CONSTRAINT valid_step_count CHECK (step_count > 0 AND step_count <= 20),
    CONSTRAINT valid_rate_limit CHECK (rate_limit_submissions > 0 AND rate_limit_submissions <= 1000)
);

-- Form fields with advanced configuration and conditional logic
CREATE TABLE IF NOT EXISTS form_builder.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES form_builder.forms(id) ON DELETE CASCADE,
    step_number INTEGER DEFAULT 1,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN 
        ('text', 'textarea', 'email', 'phone', 'number', 'date', 'time', 'datetime-local',
         'select', 'multiselect', 'radio', 'checkbox', 'file_upload', 'signature',
         'address', 'payment', 'rating', 'slider', 'matrix', 'section_break', 'html_block',
         'wedding_date', 'guest_count', 'venue_info', 'dietary_requirements', 'table_assignment',
         'photo_upload', 'document_upload', 'color_picker', 'url', 'hidden')),
    
    -- Field configuration
    is_required BOOLEAN DEFAULT false,
    placeholder_text TEXT,
    help_text TEXT,
    default_value TEXT,
    
    -- Field constraints and validation
    min_length INTEGER,
    max_length INTEGER,
    min_value NUMERIC,
    max_value NUMERIC,
    step_value NUMERIC, -- For number/slider inputs
    validation_pattern TEXT, -- Regex pattern
    validation_message TEXT,
    custom_validation_rules JSONB DEFAULT '[]'::jsonb, -- Advanced validation rules
    
    -- Field options for select/radio/checkbox types
    field_options JSONB DEFAULT '[]'::jsonb, -- [{value, label, color, icon, conditional_logic, price}]
    allow_other_option BOOLEAN DEFAULT false,
    other_option_label TEXT DEFAULT 'Other',
    option_randomization BOOLEAN DEFAULT false,
    max_selections INTEGER, -- For multiselect fields
    
    -- File upload specific configuration
    accepted_file_types TEXT[] DEFAULT '{}', -- ['jpg', 'png', 'pdf', 'docx']
    max_file_size_mb INTEGER DEFAULT 10,
    max_file_count INTEGER DEFAULT 1,
    file_storage_path TEXT DEFAULT 'form-uploads',
    enable_image_compression BOOLEAN DEFAULT true,
    enable_virus_scanning BOOLEAN DEFAULT true,
    
    -- Layout and display
    field_order INTEGER NOT NULL,
    field_width TEXT DEFAULT 'full' CHECK (field_width IN ('full', 'half', 'third', 'quarter')),
    is_hidden BOOLEAN DEFAULT false,
    css_classes TEXT,
    inline_style TEXT,
    
    -- Conditional logic (Enhanced)
    conditional_logic JSONB DEFAULT '{}'::jsonb, -- {show_if: [], hide_if: [], require_if: [], calculate_if: []}
    logic_operator TEXT DEFAULT 'AND' CHECK (logic_operator IN ('AND', 'OR')),
    parent_field_dependencies TEXT[] DEFAULT '{}', -- Fields this field depends on
    
    -- Advanced features
    auto_populate_from TEXT, -- Field to auto-populate from (e.g., 'user.email')
    calculation_formula TEXT, -- For calculated fields
    masked_input TEXT, -- Input masking pattern (e.g., phone numbers)
    
    -- Integration mappings
    crm_field_mapping TEXT,
    calendar_field_mapping TEXT,
    webhook_field_mapping TEXT,
    analytics_tracking_name TEXT,
    
    -- Accessibility
    aria_label TEXT,
    aria_description TEXT,
    tab_index INTEGER,
    
    -- Wedding industry specific
    vendor_category TEXT, -- For vendor-specific fields
    booking_requirement_level TEXT CHECK (booking_requirement_level IN ('required', 'recommended', 'optional')),
    affects_pricing BOOLEAN DEFAULT false,
    pricing_impact JSONB DEFAULT '{}'::jsonb, -- Pricing calculation rules
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_field_order CHECK (field_order > 0),
    CONSTRAINT valid_step_number CHECK (step_number > 0 AND step_number <= 20),
    CONSTRAINT valid_max_file_size CHECK (max_file_size_mb > 0 AND max_file_size_mb <= 100),
    CONSTRAINT valid_max_file_count CHECK (max_file_count > 0 AND max_file_count <= 20)
);

-- Form submissions with comprehensive tracking and file handling
CREATE TABLE IF NOT EXISTS form_builder.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES form_builder.forms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.user_profiles(id), -- NULL for anonymous submissions
    supplier_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    
    -- Submission data
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    partial_data JSONB DEFAULT '{}'::jsonb, -- For multi-step forms in progress
    current_step INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    completion_percentage NUMERIC(5,2) DEFAULT 0.00,
    
    -- File attachments
    file_attachments JSONB DEFAULT '[]'::jsonb, -- [{field_id, file_url, file_name, file_size, file_type, scan_status}]
    total_file_size_mb NUMERIC(10,2) DEFAULT 0.00,
    
    -- Submission metadata
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    submission_source TEXT DEFAULT 'web' CHECK (submission_source IN ('web', 'mobile', 'api', 'import')),
    device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
    browser_info JSONB DEFAULT '{}'::jsonb,
    
    -- Processing status and workflow
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN 
        ('pending', 'processing', 'completed', 'failed', 'requires_review', 'approved', 'rejected')),
    processing_errors JSONB DEFAULT '[]'::jsonb,
    reviewer_id UUID REFERENCES public.user_profiles(id),
    review_notes TEXT,
    review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_changes')),
    
    -- Integration status tracking
    crm_sync_status TEXT DEFAULT 'pending' CHECK (crm_sync_status IN ('pending', 'synced', 'failed', 'not_applicable')),
    crm_sync_at TIMESTAMPTZ,
    crm_record_id TEXT, -- External CRM record identifier
    
    email_notification_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    webhook_delivery_status TEXT DEFAULT 'pending' CHECK (webhook_delivery_status IN ('pending', 'delivered', 'failed', 'retrying')),
    webhook_sent_at TIMESTAMPTZ,
    webhook_attempts INTEGER DEFAULT 0,
    
    -- Analytics and performance metrics
    time_to_complete INTEGER, -- Total seconds from start to completion
    field_completion_times JSONB DEFAULT '{}'::jsonb, -- {field_id: seconds_spent}
    abandonment_points JSONB DEFAULT '[]'::jsonb, -- Steps where user abandoned
    validation_errors JSONB DEFAULT '[]'::jsonb, -- Validation errors encountered
    
    -- Wedding industry specific
    wedding_date DATE, -- Extracted from form data for easier querying
    venue_name TEXT, -- Extracted venue information
    estimated_guest_count INTEGER,
    estimated_budget_range TEXT,
    priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    
    -- GDPR and data retention
    data_retention_until DATE, -- When this data should be deleted
    gdpr_consent_given BOOLEAN DEFAULT false,
    gdpr_consent_timestamp TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT valid_current_step CHECK (current_step > 0 AND current_step <= 20),
    CONSTRAINT valid_webhook_attempts CHECK (webhook_attempts >= 0 AND webhook_attempts <= 10)
);

-- Form field dependencies for conditional logic
CREATE TABLE IF NOT EXISTS form_builder.field_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dependent_field_id UUID REFERENCES form_builder.form_fields(id) ON DELETE CASCADE,
    parent_field_id UUID REFERENCES form_builder.form_fields(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('show', 'hide', 'require', 'calculate', 'populate')),
    condition_operator TEXT NOT NULL CHECK (condition_operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'is_empty', 'is_not_empty')),
    condition_value JSONB NOT NULL,
    execution_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent circular dependencies
    CONSTRAINT no_self_dependency CHECK (dependent_field_id != parent_field_id)
);

-- Form analytics for performance tracking
CREATE TABLE IF NOT EXISTS form_builder.form_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES form_builder.forms(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- View and engagement metrics
    total_views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    total_starts INTEGER DEFAULT 0,
    unique_starts INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    unique_completions INTEGER DEFAULT 0,
    
    -- Conversion rates (calculated)
    start_rate NUMERIC(5,2) DEFAULT 0.00, -- starts/views
    completion_rate NUMERIC(5,2) DEFAULT 0.00, -- completions/starts
    abandonment_rate NUMERIC(5,2) DEFAULT 0.00, -- 1 - completion_rate
    
    -- Performance metrics
    avg_completion_time INTEGER, -- seconds
    avg_field_completion_time JSONB DEFAULT '{}'::jsonb, -- {field_id: avg_seconds}
    bounce_rate NUMERIC(5,2) DEFAULT 0.00,
    
    -- Error tracking
    validation_error_count INTEGER DEFAULT 0,
    submission_error_count INTEGER DEFAULT 0,
    common_errors JSONB DEFAULT '[]'::jsonb,
    
    -- Device and source breakdown
    device_breakdown JSONB DEFAULT '{}'::jsonb, -- {desktop: count, mobile: count, tablet: count}
    source_breakdown JSONB DEFAULT '{}'::jsonb, -- {direct: count, referral: count, etc}
    
    -- Wedding industry specific metrics
    avg_wedding_budget NUMERIC(10,2),
    common_venue_types JSONB DEFAULT '{}'::jsonb,
    peak_submission_hours JSONB DEFAULT '{}'::jsonb,
    seasonal_trends JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per form per date
    UNIQUE(form_id, metric_date)
);

-- Form templates for the form builder (extending existing templates)
CREATE TABLE IF NOT EXISTS form_builder.form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    template_description TEXT,
    vendor_type TEXT, -- Compatible with existing vendor_types
    industry_category TEXT DEFAULT 'wedding', -- wedding, event, photography, etc
    template_config JSONB NOT NULL, -- Complete form configuration
    
    -- Template metadata
    is_premium BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0.00,
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Template features
    supports_multi_step BOOLEAN DEFAULT false,
    supports_conditional_logic BOOLEAN DEFAULT false,
    supports_file_uploads BOOLEAN DEFAULT false,
    supports_payments BOOLEAN DEFAULT false,
    estimated_completion_time INTEGER, -- minutes
    
    -- Preview and marketing
    preview_image_url TEXT,
    demo_url TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Template pricing (for premium templates)
    price_tier TEXT DEFAULT 'free' CHECK (price_tier IN ('free', 'starter', 'professional', 'enterprise')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id)
);

-- Webhook delivery log for tracking webhook events
CREATE TABLE IF NOT EXISTS form_builder.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_submission_id UUID REFERENCES form_builder.form_submissions(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    http_method TEXT DEFAULT 'POST',
    request_headers JSONB DEFAULT '{}'::jsonb,
    request_body JSONB NOT NULL,
    response_status INTEGER,
    response_headers JSONB DEFAULT '{}'::jsonb,
    response_body TEXT,
    delivery_attempt INTEGER NOT NULL,
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'success', 'failed', 'timeout')),
    error_message TEXT,
    delivery_duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    
    -- Performance tracking
    CONSTRAINT valid_response_status CHECK (response_status >= 100 AND response_status <= 599),
    CONSTRAINT valid_delivery_attempt CHECK (delivery_attempt > 0 AND delivery_attempt <= 10)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_forms_supplier_organization ON form_builder.forms(supplier_id, organization_id);
CREATE INDEX idx_forms_active ON form_builder.forms(is_active, created_at) WHERE is_active = true;
CREATE INDEX idx_forms_public ON form_builder.forms(is_public, is_active) WHERE is_public = true AND is_active = true;
CREATE INDEX idx_forms_custom_slug ON form_builder.forms(custom_slug) WHERE custom_slug IS NOT NULL;
CREATE INDEX idx_forms_type_active ON form_builder.forms(form_type, is_active) WHERE is_active = true;

CREATE INDEX idx_form_fields_form_step ON form_builder.form_fields(form_id, step_number, field_order);
CREATE INDEX idx_form_fields_type ON form_builder.form_fields(field_type);
CREATE INDEX idx_form_fields_required ON form_builder.form_fields(form_id, is_required) WHERE is_required = true;
CREATE INDEX idx_form_fields_conditional ON form_builder.form_fields(form_id) WHERE conditional_logic != '{}'::jsonb;

CREATE INDEX idx_form_submissions_form_created ON form_builder.form_submissions(form_id, created_at);
CREATE INDEX idx_form_submissions_supplier_org ON form_builder.form_submissions(supplier_id, organization_id);
CREATE INDEX idx_form_submissions_client ON form_builder.form_submissions(client_id, created_at) WHERE client_id IS NOT NULL;
CREATE INDEX idx_form_submissions_status ON form_builder.form_submissions(processing_status);
CREATE INDEX idx_form_submissions_completed ON form_builder.form_submissions(form_id, is_completed, completed_at) WHERE is_completed = true;
CREATE INDEX idx_form_submissions_wedding_date ON form_builder.form_submissions(wedding_date) WHERE wedding_date IS NOT NULL;
CREATE INDEX idx_form_submissions_activity ON form_builder.form_submissions(last_activity_at);

CREATE INDEX idx_field_dependencies_dependent ON form_builder.field_dependencies(dependent_field_id);
CREATE INDEX idx_field_dependencies_parent ON form_builder.field_dependencies(parent_field_id);
CREATE INDEX idx_field_dependencies_active ON form_builder.field_dependencies(is_active) WHERE is_active = true;

CREATE INDEX idx_form_analytics_form_date ON form_builder.form_analytics(form_id, metric_date);
CREATE INDEX idx_form_analytics_org_date ON form_builder.form_analytics(organization_id, metric_date);

CREATE INDEX idx_form_templates_vendor_type ON form_builder.form_templates(vendor_type);
CREATE INDEX idx_form_templates_featured ON form_builder.form_templates(is_featured, rating) WHERE is_featured = true;
CREATE INDEX idx_form_templates_premium ON form_builder.form_templates(is_premium, price_tier) WHERE is_premium = true;

CREATE INDEX idx_webhook_deliveries_submission ON form_builder.webhook_deliveries(form_submission_id, created_at);
CREATE INDEX idx_webhook_deliveries_status ON form_builder.webhook_deliveries(delivery_status, created_at);
CREATE INDEX idx_webhook_deliveries_retry ON form_builder.webhook_deliveries(delivery_status, delivery_attempt) WHERE delivery_status IN ('failed', 'timeout');

-- Add updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION form_builder.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON form_builder.forms 
    FOR EACH ROW EXECUTE FUNCTION form_builder.update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON form_builder.form_fields 
    FOR EACH ROW EXECUTE FUNCTION form_builder.update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_builder.form_submissions 
    FOR EACH ROW EXECUTE FUNCTION form_builder.update_updated_at_column();

CREATE TRIGGER update_field_dependencies_updated_at BEFORE UPDATE ON form_builder.field_dependencies 
    FOR EACH ROW EXECUTE FUNCTION form_builder.update_updated_at_column();

CREATE TRIGGER update_form_analytics_updated_at BEFORE UPDATE ON form_builder.form_analytics 
    FOR EACH ROW EXECUTE FUNCTION form_builder.update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_builder.form_templates 
    FOR EACH ROW EXECUTE FUNCTION form_builder.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA form_builder TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA form_builder TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA form_builder TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA form_builder TO authenticated;