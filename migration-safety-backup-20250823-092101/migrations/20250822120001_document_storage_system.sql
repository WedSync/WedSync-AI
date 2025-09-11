-- =====================================================
-- Document Storage System Migration
-- WS-068: Wedding Business Compliance Hub
-- =====================================================

-- Document Categories Table
CREATE TABLE public.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Storage Table
CREATE TABLE public.business_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.document_categories(id) ON DELETE RESTRICT,
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    
    -- Document Metadata
    title VARCHAR(255),
    description TEXT,
    tags TEXT[],
    
    -- Compliance & Expiry Tracking
    issued_date DATE,
    expiry_date DATE,
    expiry_warning_days INTEGER DEFAULT 30,
    is_compliance_required BOOLEAN DEFAULT false,
    compliance_status VARCHAR(20) DEFAULT 'valid' CHECK (compliance_status IN ('valid', 'expiring', 'expired', 'invalid')),
    
    -- Security & Access
    security_level VARCHAR(10) DEFAULT 'standard' CHECK (security_level IN ('low', 'standard', 'high', 'critical')),
    encryption_key_id UUID,
    virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'failed')),
    virus_scan_date TIMESTAMP WITH TIME ZONE,
    
    -- Status & Audit
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date > issued_date),
    CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Document Access Control Table
CREATE TABLE public.document_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Access Permissions
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('view', 'download', 'share', 'manage')),
    granted_by UUID REFERENCES auth.users(id),
    
    -- Access Restrictions
    ip_restrictions TEXT[],
    time_restrictions JSONB, -- {"start_time": "09:00", "end_time": "17:00", "days": [1,2,3,4,5]}
    expires_at TIMESTAMP WITH TIME ZONE,
    max_downloads INTEGER,
    current_downloads INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(document_id, user_id, access_level)
);

-- Document Sharing Links Table
CREATE TABLE public.document_sharing_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Link Configuration
    link_token VARCHAR(64) NOT NULL UNIQUE,
    link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('view', 'download', 'preview')),
    
    -- Security Settings
    password_hash VARCHAR(255),
    require_email BOOLEAN DEFAULT false,
    allowed_emails TEXT[],
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Time Controls
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance Index
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Document Sharing Access Log Table
CREATE TABLE public.document_sharing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sharing_link_id UUID REFERENCES public.document_sharing_links(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    
    -- Access Details
    accessed_by_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    -- Action Information
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'download', 'preview')),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Metadata
    file_size_downloaded BIGINT,
    download_duration_ms INTEGER,
    
    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Compliance Alerts Table
CREATE TABLE public.document_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Alert Configuration
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('expiry_warning', 'expired', 'compliance_check', 'renewal_required')),
    trigger_days_before INTEGER, -- Days before expiry to trigger
    
    -- Alert Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    next_trigger_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    -- Notification Settings
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Version History Table
CREATE TABLE public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Previous Version Data
    previous_filename VARCHAR(255),
    previous_file_path TEXT,
    previous_file_hash VARCHAR(64),
    
    -- Change Information
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, version_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX idx_business_documents_user_id ON public.business_documents(user_id);
CREATE INDEX idx_business_documents_category_id ON public.business_documents(category_id);
CREATE INDEX idx_business_documents_status ON public.business_documents(status) WHERE status = 'active';

-- Compliance and expiry indexes
CREATE INDEX idx_business_documents_expiry_date ON public.business_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_business_documents_compliance_status ON public.business_documents(compliance_status);
CREATE INDEX idx_business_documents_expiring ON public.business_documents(user_id, expiry_date) WHERE expiry_date IS NOT NULL AND status = 'active';

-- Security indexes
CREATE INDEX idx_business_documents_hash ON public.business_documents(file_hash);
CREATE INDEX idx_business_documents_virus_scan ON public.business_documents(virus_scan_status) WHERE virus_scan_status != 'clean';

-- Access control indexes
CREATE INDEX idx_document_access_control_document_id ON public.document_access_control(document_id);
CREATE INDEX idx_document_access_control_user_id ON public.document_access_control(user_id);
CREATE INDEX idx_document_access_control_expires ON public.document_access_control(expires_at) WHERE expires_at IS NOT NULL;

-- Sharing indexes
CREATE INDEX idx_document_sharing_links_token ON public.document_sharing_links(link_token);
CREATE INDEX idx_document_sharing_links_document_id ON public.document_sharing_links(document_id);
CREATE INDEX idx_document_sharing_links_active ON public.document_sharing_links(is_active, expires_at) WHERE is_active = true;

-- Alert indexes
CREATE INDEX idx_document_compliance_alerts_next_trigger ON public.document_compliance_alerts(next_trigger_at) WHERE is_active = true;
CREATE INDEX idx_document_compliance_alerts_user_document ON public.document_compliance_alerts(user_id, document_id);

-- Audit log indexes
CREATE INDEX idx_document_sharing_logs_document_id ON public.document_sharing_logs(document_id);
CREATE INDEX idx_document_sharing_logs_accessed_at ON public.document_sharing_logs(accessed_at);
CREATE INDEX idx_document_sharing_logs_ip ON public.document_sharing_logs(ip_address);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sharing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sharing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Document Categories: Read-only for authenticated users
CREATE POLICY "Document categories are viewable by authenticated users" ON public.document_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Business Documents: Full access for document owner
CREATE POLICY "Users can view their own documents" ON public.business_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.business_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.business_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.business_documents
    FOR DELETE USING (auth.uid() = user_id);

-- Document Access Control: Owner and granted users
CREATE POLICY "Users can manage access to their documents" ON public.document_access_control
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_access_control.document_id 
            AND user_id = auth.uid()
        ) 
        OR user_id = auth.uid()
    );

-- Document Sharing Links: Owner can manage
CREATE POLICY "Users can manage sharing links for their documents" ON public.document_sharing_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_sharing_links.document_id 
            AND user_id = auth.uid()
        )
    );

-- Document Sharing Logs: Owner can view
CREATE POLICY "Users can view sharing logs for their documents" ON public.document_sharing_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_sharing_logs.document_id 
            AND user_id = auth.uid()
        )
    );

-- Service role can insert logs
CREATE POLICY "Service can insert sharing logs" ON public.document_sharing_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Document Compliance Alerts: Owner access
CREATE POLICY "Users can manage alerts for their documents" ON public.document_compliance_alerts
    FOR ALL USING (auth.uid() = user_id);

-- Document Versions: Owner access
CREATE POLICY "Users can view versions of their documents" ON public.document_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_documents 
            WHERE id = document_versions.document_id 
            AND user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_categories_updated_at
    BEFORE UPDATE ON public.document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_documents_updated_at
    BEFORE UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_compliance_alerts_updated_at
    BEFORE UPDATE ON public.document_compliance_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Compliance Status Auto-Update
CREATE OR REPLACE FUNCTION update_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update compliance status based on expiry date
    IF NEW.expiry_date IS NOT NULL THEN
        IF NEW.expiry_date < CURRENT_DATE THEN
            NEW.compliance_status = 'expired';
        ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
            NEW.compliance_status = 'expiring';
        ELSE
            NEW.compliance_status = 'valid';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_compliance_status
    BEFORE INSERT OR UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION update_compliance_status();

-- Alert Schedule Update
CREATE OR REPLACE FUNCTION schedule_compliance_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update next trigger time for alerts
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_warning_days IS NOT NULL THEN
        UPDATE public.document_compliance_alerts
        SET next_trigger_at = NEW.expiry_date - INTERVAL '1 day' * NEW.expiry_warning_days
        WHERE document_id = NEW.id AND alert_type = 'expiry_warning' AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_document_alerts
    AFTER INSERT OR UPDATE ON public.business_documents
    FOR EACH ROW EXECUTE FUNCTION schedule_compliance_alerts();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Default Document Categories
INSERT INTO public.document_categories (name, display_name, description, icon, color, sort_order, is_system) VALUES
    ('credentials_insurance', 'Credentials & Insurance', 'Professional liability insurance, public indemnity, and certifications', 'Shield', '#10B981', 1, true),
    ('certifications_licenses', 'Certifications & Licenses', 'Professional certifications, music licenses, and regulatory permits', 'Award', '#3B82F6', 2, true),
    ('contracts_agreements', 'Contracts & Agreements', 'Client contracts, vendor agreements, and legal documents', 'FileText', '#8B5CF6', 3, true),
    ('equipment_safety', 'Equipment & Safety', 'PAT testing certificates, equipment warranties, and safety documentation', 'Settings', '#F59E0B', 4, true),
    ('business_registration', 'Business Registration', 'Company registration, tax documents, and business permits', 'Building2', '#EF4444', 5, true),
    ('marketing_materials', 'Marketing Materials', 'Brochures, portfolios, and promotional documents', 'Image', '#EC4899', 6, true),
    ('financial_documents', 'Financial Documents', 'Invoices, receipts, and financial statements', 'CreditCard', '#06B6D4', 7, true),
    ('other', 'Other Documents', 'Miscellaneous business documents', 'FileQuestion', '#6B7280', 8, true);

-- =====================================================
-- HELPFUL VIEWS FOR DEVELOPMENT
-- =====================================================

-- Documents with category information
CREATE VIEW public.documents_with_categories AS
SELECT 
    d.*,
    c.display_name as category_name,
    c.icon as category_icon,
    c.color as category_color
FROM public.business_documents d
JOIN public.document_categories c ON d.category_id = c.id
WHERE d.status = 'active';

-- Expiring documents view
CREATE VIEW public.expiring_documents AS
SELECT 
    d.*,
    c.display_name as category_name,
    (d.expiry_date - CURRENT_DATE) as days_until_expiry
FROM public.business_documents d
JOIN public.document_categories c ON d.category_id = c.id
WHERE d.status = 'active' 
    AND d.expiry_date IS NOT NULL 
    AND d.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY d.expiry_date ASC;

-- Document statistics view
CREATE VIEW public.document_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_documents,
    COUNT(CASE WHEN expiry_date IS NOT NULL THEN 1 END) as documents_with_expiry,
    COUNT(CASE WHEN compliance_status = 'expired' THEN 1 END) as expired_documents,
    COUNT(CASE WHEN compliance_status = 'expiring' THEN 1 END) as expiring_documents,
    SUM(file_size) as total_storage_used,
    MAX(created_at) as last_upload_date
FROM public.business_documents
WHERE status = 'active'
GROUP BY user_id;

-- =====================================================
-- GRANTS FOR PROPER PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on tables
GRANT ALL ON public.document_categories TO authenticated;
GRANT ALL ON public.business_documents TO authenticated;
GRANT ALL ON public.document_access_control TO authenticated;
GRANT ALL ON public.document_sharing_links TO authenticated;
GRANT ALL ON public.document_sharing_logs TO service_role;
GRANT SELECT ON public.document_sharing_logs TO authenticated;
GRANT ALL ON public.document_compliance_alerts TO authenticated;
GRANT ALL ON public.document_versions TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.documents_with_categories TO authenticated;
GRANT SELECT ON public.expiring_documents TO authenticated;
GRANT SELECT ON public.document_statistics TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.document_categories IS 'Categorizes business documents for better organization and compliance tracking';
COMMENT ON TABLE public.business_documents IS 'Main table storing wedding business compliance documents with expiry tracking';
COMMENT ON TABLE public.document_access_control IS 'Controls who can access specific documents with granular permissions';
COMMENT ON TABLE public.document_sharing_links IS 'Secure temporary links for document sharing with external parties';
COMMENT ON TABLE public.document_sharing_logs IS 'Audit trail of all document sharing activities';
COMMENT ON TABLE public.document_compliance_alerts IS 'Automated alerts for document expiry and compliance requirements';
COMMENT ON TABLE public.document_versions IS 'Version history tracking for document updates and changes';

COMMENT ON COLUMN public.business_documents.compliance_status IS 'Auto-calculated based on expiry_date: valid, expiring (30 days), expired, invalid';
COMMENT ON COLUMN public.business_documents.security_level IS 'Determines encryption and access requirements: low, standard, high, critical';
COMMENT ON COLUMN public.business_documents.file_hash IS 'SHA-256 hash for integrity verification and duplicate detection';
COMMENT ON COLUMN public.document_access_control.time_restrictions IS 'JSON object defining time-based access rules';
COMMENT ON COLUMN public.document_sharing_links.link_token IS 'Cryptographically secure token for accessing shared documents';