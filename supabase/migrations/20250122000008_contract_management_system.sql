-- =====================================================
-- Contract Management System Migration
-- WS-082: Contract Tracking & Payment Milestones
-- Team D - Batch 6 Round 1
-- =====================================================

-- Contract Categories Table
CREATE TABLE public.contract_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#8B5CF6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wedding Contracts Table
CREATE TABLE public.wedding_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.contract_categories(id) ON DELETE RESTRICT,
    
    -- Contract Basic Information
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('vendor_service', 'venue_rental', 'supplier_agreement', 'other')),
    
    -- Financial Details
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    deposit_amount DECIMAL(12, 2),
    deposit_percentage DECIMAL(5, 2),
    balance_amount DECIMAL(12, 2),
    
    -- Contract Dates
    contract_date DATE NOT NULL,
    service_start_date DATE,
    service_end_date DATE,
    contract_expiry_date DATE,
    signed_date DATE,
    
    -- Status Management
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'reviewed', 'signed', 'active', 'completed', 'cancelled', 'expired')),
    signing_status VARCHAR(30) DEFAULT 'unsigned' CHECK (signing_status IN ('unsigned', 'partially_signed', 'fully_signed')),
    
    -- Document Management
    original_document_id UUID REFERENCES public.business_documents(id),
    signed_document_id UUID REFERENCES public.business_documents(id),
    
    -- Legal & Compliance
    terms_conditions TEXT,
    cancellation_policy TEXT,
    force_majeure_clause TEXT,
    privacy_policy_accepted BOOLEAN DEFAULT false,
    gdpr_consent BOOLEAN DEFAULT false,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    
    -- Audit Fields
    created_by UUID REFERENCES user_profiles(id),
    last_modified_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_service_dates CHECK (service_end_date IS NULL OR service_end_date >= service_start_date),
    CONSTRAINT valid_contract_expiry CHECK (contract_expiry_date IS NULL OR contract_expiry_date >= contract_date),
    CONSTRAINT valid_deposit CHECK (deposit_amount IS NULL OR deposit_amount <= total_amount)
);

-- Contract Payment Milestones Table
CREATE TABLE public.contract_payment_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Milestone Details
    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(30) NOT NULL CHECK (milestone_type IN ('deposit', 'progress_payment', 'final_payment', 'penalty', 'refund')),
    sequence_order INTEGER NOT NULL,
    
    -- Financial Information
    amount DECIMAL(12, 2) NOT NULL,
    percentage_of_total DECIMAL(5, 2),
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Timing
    due_date DATE NOT NULL,
    grace_period_days INTEGER DEFAULT 0,
    reminder_days_before INTEGER DEFAULT 7,
    
    -- Status & Payment Tracking
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'partially_paid', 'paid', 'waived', 'cancelled')),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date DATE,
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50),
    
    -- Late Fees & Penalties
    late_fee_amount DECIMAL(12, 2) DEFAULT 0,
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    penalty_applied BOOLEAN DEFAULT false,
    
    -- Automation & Alerts
    auto_reminder_enabled BOOLEAN DEFAULT true,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= amount),
    CONSTRAINT valid_percentage CHECK (percentage_of_total IS NULL OR (percentage_of_total >= 0 AND percentage_of_total <= 100)),
    UNIQUE(contract_id, sequence_order)
);

-- Vendor Deliverables Table
CREATE TABLE public.contract_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Deliverable Information
    deliverable_name VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable_type VARCHAR(50) NOT NULL CHECK (deliverable_type IN ('document', 'service', 'product', 'milestone', 'approval')),
    category VARCHAR(100),
    
    -- Timing & Dependencies
    due_date DATE NOT NULL,
    estimated_hours DECIMAL(6, 2),
    dependency_ids UUID[],  -- Array of other deliverable IDs this depends on
    
    -- Status Management
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review_required', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_date DATE,
    completed_date DATE,
    approved_date DATE,
    approved_by UUID REFERENCES user_profiles(id),
    
    -- Requirements & Specifications
    requirements TEXT,
    acceptance_criteria TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    
    -- File & Document Links
    related_document_ids UUID[],
    deliverable_file_ids UUID[],
    
    -- Assignment & Responsibility
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_team VARCHAR(100),
    
    -- Quality & Review
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    review_notes TEXT,
    revision_count INTEGER DEFAULT 0,
    
    -- Alerts & Notifications
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 3,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_days INTEGER DEFAULT 1,
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_completion_dates CHECK (completed_date IS NULL OR started_date IS NULL OR completed_date >= started_date),
    CONSTRAINT valid_approval_dates CHECK (approved_date IS NULL OR completed_date IS NULL OR approved_date >= completed_date)
);

-- Contract Revisions & Amendments Table
CREATE TABLE public.contract_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Revision Information
    revision_number INTEGER NOT NULL,
    revision_type VARCHAR(30) NOT NULL CHECK (revision_type IN ('amendment', 'addendum', 'cancellation', 'renewal', 'correction')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    
    -- Document Management
    original_document_id UUID REFERENCES public.business_documents(id),
    revised_document_id UUID REFERENCES public.business_documents(id),
    comparison_document_id UUID REFERENCES public.business_documents(id),  -- PDF showing changes
    
    -- Change Tracking
    changes_summary TEXT,
    fields_changed JSONB DEFAULT '{}'::jsonb,  -- JSON of field changes {"field_name": {"old": "value", "new": "value"}}
    financial_impact DECIMAL(12, 2) DEFAULT 0,
    
    -- Approval Process
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'implemented')),
    requires_client_approval BOOLEAN DEFAULT true,
    requires_supplier_approval BOOLEAN DEFAULT false,
    
    -- Client Approval
    client_approved BOOLEAN DEFAULT false,
    client_approved_date TIMESTAMP WITH TIME ZONE,
    client_approved_by VARCHAR(255),
    client_signature_required BOOLEAN DEFAULT false,
    client_signed BOOLEAN DEFAULT false,
    client_signed_date TIMESTAMP WITH TIME ZONE,
    
    -- Supplier Approval (if applicable)
    supplier_approved BOOLEAN DEFAULT false,
    supplier_approved_date TIMESTAMP WITH TIME ZONE,
    supplier_approved_by VARCHAR(255),
    
    -- Internal Approval
    internal_approved BOOLEAN DEFAULT false,
    internal_approved_by UUID REFERENCES user_profiles(id),
    internal_approved_date TIMESTAMP WITH TIME ZONE,
    
    -- Implementation
    implemented_date TIMESTAMP WITH TIME ZONE,
    implemented_by UUID REFERENCES user_profiles(id),
    
    -- Legal & Compliance
    legal_review_required BOOLEAN DEFAULT false,
    legal_reviewed BOOLEAN DEFAULT false,
    legal_reviewed_by VARCHAR(255),
    legal_reviewed_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_revision_number UNIQUE(contract_id, revision_number)
);

-- Contract Alerts & Notifications Table
CREATE TABLE public.contract_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.contract_payment_milestones(id) ON DELETE CASCADE,
    deliverable_id UUID REFERENCES public.contract_deliverables(id) ON DELETE CASCADE,
    
    -- Alert Configuration
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('payment_due', 'payment_overdue', 'deliverable_due', 'deliverable_overdue', 'contract_expiring', 'contract_expired', 'milestone_approaching', 'revision_pending')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Timing
    trigger_date DATE NOT NULL,
    days_before_due INTEGER,
    
    -- Status & Processing
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'acknowledged', 'dismissed', 'expired')),
    sent_date TIMESTAMP WITH TIME ZONE,
    acknowledged_date TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES user_profiles(id),
    
    -- Recipients
    recipient_user_ids UUID[],
    recipient_emails TEXT[],
    send_to_client BOOLEAN DEFAULT false,
    send_to_supplier BOOLEAN DEFAULT false,
    
    -- Notification Channels
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT at_least_one_reference CHECK (
        contract_id IS NOT NULL OR 
        milestone_id IS NOT NULL OR 
        deliverable_id IS NOT NULL
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Contract lookup indexes
CREATE INDEX idx_wedding_contracts_organization ON public.wedding_contracts(organization_id);
CREATE INDEX idx_wedding_contracts_client ON public.wedding_contracts(client_id);
CREATE INDEX idx_wedding_contracts_supplier ON public.wedding_contracts(supplier_id);
CREATE INDEX idx_wedding_contracts_status ON public.wedding_contracts(status);
CREATE INDEX idx_wedding_contracts_contract_number ON public.wedding_contracts(contract_number);
CREATE INDEX idx_wedding_contracts_service_dates ON public.wedding_contracts(service_start_date, service_end_date);
CREATE INDEX idx_wedding_contracts_expiry ON public.wedding_contracts(contract_expiry_date) WHERE contract_expiry_date IS NOT NULL;

-- Payment milestones indexes
CREATE INDEX idx_payment_milestones_contract ON public.contract_payment_milestones(contract_id);
CREATE INDEX idx_payment_milestones_due_date ON public.contract_payment_milestones(due_date);
CREATE INDEX idx_payment_milestones_status ON public.contract_payment_milestones(status);
CREATE INDEX idx_payment_milestones_overdue ON public.contract_payment_milestones(due_date, status) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_payment_milestones_organization ON public.contract_payment_milestones(organization_id);

-- Deliverables indexes
CREATE INDEX idx_contract_deliverables_contract ON public.contract_deliverables(contract_id);
CREATE INDEX idx_contract_deliverables_due_date ON public.contract_deliverables(due_date);
CREATE INDEX idx_contract_deliverables_status ON public.contract_deliverables(status);
CREATE INDEX idx_contract_deliverables_assigned ON public.contract_deliverables(assigned_to);
CREATE INDEX idx_contract_deliverables_organization ON public.contract_deliverables(organization_id);

-- Revisions indexes
CREATE INDEX idx_contract_revisions_contract ON public.contract_revisions(contract_id);
CREATE INDEX idx_contract_revisions_status ON public.contract_revisions(status);
CREATE INDEX idx_contract_revisions_created ON public.contract_revisions(created_at);

-- Alerts indexes
CREATE INDEX idx_contract_alerts_trigger_date ON public.contract_alerts(trigger_date, status) WHERE status = 'scheduled';
CREATE INDEX idx_contract_alerts_contract ON public.contract_alerts(contract_id);
CREATE INDEX idx_contract_alerts_organization ON public.contract_alerts(organization_id);

-- Full text search indexes
CREATE INDEX idx_contracts_search ON public.wedding_contracts USING gin(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(contract_number, '') || ' ' ||
        array_to_string(tags, ' ')
    )
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.contract_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_alerts ENABLE ROW LEVEL SECURITY;

-- Contract Categories: Read-only for authenticated users
CREATE POLICY "Contract categories are viewable by authenticated users" ON public.contract_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Wedding Contracts: Organization-based access
CREATE POLICY "Users can view their organization's contracts" ON public.wedding_contracts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert contracts for their organization" ON public.wedding_contracts
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their organization's contracts" ON public.wedding_contracts
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their organization's contracts" ON public.wedding_contracts
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Payment Milestones: Organization-based access
CREATE POLICY "Users can manage milestones for their organization's contracts" ON public.contract_payment_milestones
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Deliverables: Organization-based access
CREATE POLICY "Users can manage deliverables for their organization's contracts" ON public.contract_deliverables
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Revisions: Organization-based access
CREATE POLICY "Users can manage revisions for their organization's contracts" ON public.contract_revisions
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Alerts: Organization-based access
CREATE POLICY "Users can manage alerts for their organization" ON public.contract_alerts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update updated_at timestamps
CREATE TRIGGER update_wedding_contracts_updated_at
    BEFORE UPDATE ON public.wedding_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_milestones_updated_at
    BEFORE UPDATE ON public.contract_payment_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
    BEFORE UPDATE ON public.contract_deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_revisions_updated_at
    BEFORE UPDATE ON public.contract_revisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_alerts_updated_at
    BEFORE UPDATE ON public.contract_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update payment milestone status based on due dates
CREATE OR REPLACE FUNCTION update_milestone_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-mark as overdue if past due date
    IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
        NEW.status = 'overdue';
    END IF;
    
    -- Auto-calculate remaining balance
    IF NEW.paid_amount >= NEW.amount THEN
        NEW.status = 'paid';
        NEW.paid_date = COALESCE(NEW.paid_date, CURRENT_DATE);
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status = 'partially_paid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_milestone_status
    BEFORE INSERT OR UPDATE ON public.contract_payment_milestones
    FOR EACH ROW EXECUTE FUNCTION update_milestone_status();

-- Auto-update deliverable status based on progress and dates
CREATE OR REPLACE FUNCTION update_deliverable_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-mark as overdue if past due date and not completed
    IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'cancelled') THEN
        NEW.status = 'overdue';
    END IF;
    
    -- Auto-update based on progress percentage
    IF NEW.progress_percentage = 100 AND NEW.status != 'completed' THEN
        NEW.status = 'completed';
        NEW.completed_date = COALESCE(NEW.completed_date, CURRENT_DATE);
    ELSIF NEW.progress_percentage > 0 AND NEW.status = 'pending' THEN
        NEW.status = 'in_progress';
        NEW.started_date = COALESCE(NEW.started_date, CURRENT_DATE);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deliverable_status_trigger
    BEFORE INSERT OR UPDATE ON public.contract_deliverables
    FOR EACH ROW EXECUTE FUNCTION update_deliverable_status();

-- Generate contract number if not provided
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_number IS NULL THEN
        NEW.contract_number = 'CON-' || 
            EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
            LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0') || '-' ||
            LPAD(nextval('contract_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1000;

CREATE TRIGGER generate_contract_number_trigger
    BEFORE INSERT ON public.wedding_contracts
    FOR EACH ROW EXECUTE FUNCTION generate_contract_number();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Default Contract Categories
INSERT INTO public.contract_categories (name, display_name, description, icon, color, sort_order) VALUES
    ('venue', 'Venue Contracts', 'Wedding venue rental agreements and service contracts', 'Building', '#8B5CF6', 1),
    ('photography', 'Photography Contracts', 'Wedding photography service agreements', 'Camera', '#3B82F6', 2),
    ('videography', 'Videography Contracts', 'Wedding videography and cinematography contracts', 'Video', '#06B6D4', 3),
    ('catering', 'Catering Contracts', 'Food and beverage service agreements', 'UtensilsCrossed', '#10B981', 4),
    ('music_entertainment', 'Music & Entertainment', 'DJ, band, and entertainment service contracts', 'Music', '#F59E0B', 5),
    ('florals', 'Floral Contracts', 'Florist and floral design service agreements', 'Flower', '#EC4899', 6),
    ('beauty', 'Beauty Services', 'Hair, makeup, and beauty service contracts', 'Sparkles', '#8B5CF6', 7),
    ('transport', 'Transportation', 'Wedding car and transportation service contracts', 'Car', '#6B7280', 8),
    ('planning', 'Planning Services', 'Wedding planner and coordinator contracts', 'Calendar', '#EF4444', 9),
    ('other', 'Other Services', 'Miscellaneous vendor and service contracts', 'FileText', '#6B7280', 10);

-- =====================================================
-- HELPFUL VIEWS FOR DEVELOPMENT
-- =====================================================

-- Contracts with payment status summary
CREATE VIEW public.contracts_with_payment_status AS
SELECT 
    c.*,
    cat.display_name as category_name,
    cat.icon as category_icon,
    COUNT(pm.id) as total_milestones,
    COUNT(CASE WHEN pm.status = 'paid' THEN 1 END) as paid_milestones,
    COUNT(CASE WHEN pm.status = 'overdue' THEN 1 END) as overdue_milestones,
    COALESCE(SUM(pm.paid_amount), 0) as total_paid,
    COALESCE(SUM(CASE WHEN pm.status != 'paid' THEN pm.amount ELSE 0 END), 0) as amount_outstanding
FROM public.wedding_contracts c
LEFT JOIN public.contract_categories cat ON c.category_id = cat.id
LEFT JOIN public.contract_payment_milestones pm ON c.id = pm.contract_id
WHERE c.status != 'cancelled'
GROUP BY c.id, cat.display_name, cat.icon;

-- Upcoming deliverables view
CREATE VIEW public.upcoming_deliverables AS
SELECT 
    d.*,
    c.title as contract_title,
    c.contract_number,
    cl.first_name || ' ' || cl.last_name as client_name
FROM public.contract_deliverables d
JOIN public.wedding_contracts c ON d.contract_id = c.id
JOIN public.clients cl ON c.client_id = cl.id
WHERE d.status NOT IN ('completed', 'cancelled')
    AND d.due_date <= CURRENT_DATE + INTERVAL '14 days'
ORDER BY d.due_date ASC;

-- Overdue payments view
CREATE VIEW public.overdue_payments AS
SELECT 
    pm.*,
    c.title as contract_title,
    c.contract_number,
    cl.first_name || ' ' || cl.last_name as client_name,
    (CURRENT_DATE - pm.due_date) as days_overdue
FROM public.contract_payment_milestones pm
JOIN public.wedding_contracts c ON pm.contract_id = c.id
JOIN public.clients cl ON c.client_id = cl.id
WHERE pm.status IN ('pending', 'overdue', 'partially_paid')
    AND pm.due_date < CURRENT_DATE
ORDER BY pm.due_date ASC;

-- Contract analytics view
CREATE VIEW public.contract_analytics AS
SELECT 
    organization_id,
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
    COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed_contracts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_contracts,
    SUM(total_amount) as total_contract_value,
    AVG(total_amount) as avg_contract_value,
    COUNT(CASE WHEN contract_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon
FROM public.wedding_contracts
WHERE status != 'cancelled'
GROUP BY organization_id;

-- =====================================================
-- GRANTS FOR PROPER PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on tables
GRANT ALL ON public.contract_categories TO authenticated;
GRANT ALL ON public.wedding_contracts TO authenticated;
GRANT ALL ON public.contract_payment_milestones TO authenticated;
GRANT ALL ON public.contract_deliverables TO authenticated;
GRANT ALL ON public.contract_revisions TO authenticated;
GRANT ALL ON public.contract_alerts TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.contracts_with_payment_status TO authenticated;
GRANT SELECT ON public.upcoming_deliverables TO authenticated;
GRANT SELECT ON public.overdue_payments TO authenticated;
GRANT SELECT ON public.contract_analytics TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.contract_categories IS 'Categories for organizing different types of wedding contracts';
COMMENT ON TABLE public.wedding_contracts IS 'Main contracts table linking clients and suppliers with payment tracking';
COMMENT ON TABLE public.contract_payment_milestones IS 'Payment schedule and milestone tracking for contracts';
COMMENT ON TABLE public.contract_deliverables IS 'Vendor deliverables and deadline management for contracts';
COMMENT ON TABLE public.contract_revisions IS 'Contract amendment and revision tracking with approval workflow';
COMMENT ON TABLE public.contract_alerts IS 'Automated alerts and notifications for contract management';

COMMENT ON COLUMN public.wedding_contracts.contract_number IS 'Auto-generated unique identifier for each contract';
COMMENT ON COLUMN public.contract_payment_milestones.sequence_order IS 'Order of payment in the milestone sequence';
COMMENT ON COLUMN public.contract_deliverables.dependency_ids IS 'Array of deliverable IDs that must be completed first';
COMMENT ON COLUMN public.contract_revisions.fields_changed IS 'JSON tracking specific field changes in revision';