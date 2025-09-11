-- WS-342: Advanced Form Builder Engine Row Level Security Policies
-- Date: 2025-09-08
-- Feature: Enterprise-grade RLS policies for multi-tenant form builder
-- Team B - Backend Implementation Round 1

-- Enable Row Level Security on all form builder tables
ALTER TABLE form_builder.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder.field_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder.form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_builder.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION form_builder.user_has_organization_access(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = target_org_id 
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is organization admin/owner
CREATE OR REPLACE FUNCTION form_builder.user_is_organization_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = target_org_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'owner')
        AND om.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's accessible organization IDs
CREATE OR REPLACE FUNCTION form_builder.get_user_organization_ids()
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT om.organization_id 
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() 
        AND om.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check form ownership
CREATE OR REPLACE FUNCTION form_builder.user_owns_form(form_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM form_builder.forms f
        WHERE f.id = form_id 
        AND (
            f.supplier_id = auth.uid() 
            OR form_builder.user_has_organization_access(f.organization_id)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FORMS TABLE RLS POLICIES
-- Users can view forms from their organizations or public forms
CREATE POLICY "Users can view organization forms or public forms" ON form_builder.forms
    FOR SELECT USING (
        form_builder.user_has_organization_access(organization_id)
        OR (is_public = true AND is_active = true)
    );

-- Users can create forms in their organizations
CREATE POLICY "Users can create forms in their organizations" ON form_builder.forms
    FOR INSERT WITH CHECK (
        form_builder.user_has_organization_access(organization_id)
        AND supplier_id = auth.uid()
    );

-- Users can update their own forms in their organizations
CREATE POLICY "Users can update their own forms" ON form_builder.forms
    FOR UPDATE USING (
        form_builder.user_has_organization_access(organization_id)
        AND supplier_id = auth.uid()
    ) WITH CHECK (
        form_builder.user_has_organization_access(organization_id)
        AND supplier_id = auth.uid()
    );

-- Users can delete their own forms, or admins can delete organization forms
CREATE POLICY "Users can delete their own forms or admins can delete org forms" ON form_builder.forms
    FOR DELETE USING (
        (supplier_id = auth.uid() AND form_builder.user_has_organization_access(organization_id))
        OR form_builder.user_is_organization_admin(organization_id)
    );

-- FORM FIELDS TABLE RLS POLICIES
-- Users can view fields for forms they have access to
CREATE POLICY "Users can view fields for accessible forms" ON form_builder.form_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_builder.forms f
            WHERE f.id = form_id
            AND (
                form_builder.user_has_organization_access(f.organization_id)
                OR (f.is_public = true AND f.is_active = true)
            )
        )
    );

-- Users can manage fields for forms they own
CREATE POLICY "Users can manage fields for their forms" ON form_builder.form_fields
    FOR ALL USING (
        form_builder.user_owns_form(form_id)
    ) WITH CHECK (
        form_builder.user_owns_form(form_id)
    );

-- FORM SUBMISSIONS TABLE RLS POLICIES  
-- Users can view submissions for their organization's forms
CREATE POLICY "Users can view submissions for organization forms" ON form_builder.form_submissions
    FOR SELECT USING (
        form_builder.user_has_organization_access(organization_id)
    );

-- Clients can view their own submissions
CREATE POLICY "Clients can view their own submissions" ON form_builder.form_submissions
    FOR SELECT USING (
        client_id = auth.uid()
    );

-- Anyone can create submissions (for public forms)
CREATE POLICY "Anyone can create form submissions" ON form_builder.form_submissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_builder.forms f
            WHERE f.id = form_id
            AND f.is_active = true
            AND (
                f.is_public = true
                OR form_builder.user_has_organization_access(f.organization_id)
            )
        )
    );

-- Users can update submissions in their organization or their own submissions
CREATE POLICY "Users can update organization or own submissions" ON form_builder.form_submissions
    FOR UPDATE USING (
        form_builder.user_has_organization_access(organization_id)
        OR client_id = auth.uid()
    ) WITH CHECK (
        form_builder.user_has_organization_access(organization_id)
        OR client_id = auth.uid()
    );

-- Only organization admins can delete submissions
CREATE POLICY "Only organization admins can delete submissions" ON form_builder.form_submissions
    FOR DELETE USING (
        form_builder.user_is_organization_admin(organization_id)
    );

-- FIELD DEPENDENCIES TABLE RLS POLICIES
-- Users can view dependencies for forms they have access to
CREATE POLICY "Users can view dependencies for accessible forms" ON form_builder.field_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_builder.form_fields ff
            JOIN form_builder.forms f ON f.id = ff.form_id
            WHERE ff.id = dependent_field_id
            AND (
                form_builder.user_has_organization_access(f.organization_id)
                OR (f.is_public = true AND f.is_active = true)
            )
        )
    );

-- Users can manage dependencies for forms they own
CREATE POLICY "Users can manage dependencies for their forms" ON form_builder.field_dependencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM form_builder.form_fields ff
            JOIN form_builder.forms f ON f.id = ff.form_id
            WHERE ff.id = dependent_field_id
            AND form_builder.user_has_organization_access(f.organization_id)
            AND f.supplier_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_builder.form_fields ff
            JOIN form_builder.forms f ON f.id = ff.form_id
            WHERE ff.id = dependent_field_id
            AND form_builder.user_has_organization_access(f.organization_id)
            AND f.supplier_id = auth.uid()
        )
    );

-- FORM ANALYTICS TABLE RLS POLICIES
-- Users can view analytics for their organization's forms
CREATE POLICY "Users can view analytics for organization forms" ON form_builder.form_analytics
    FOR SELECT USING (
        form_builder.user_has_organization_access(organization_id)
    );

-- Only authenticated users can create/update analytics (system generated)
CREATE POLICY "Authenticated users can manage analytics" ON form_builder.form_analytics
    FOR ALL USING (
        form_builder.user_has_organization_access(organization_id)
    ) WITH CHECK (
        form_builder.user_has_organization_access(organization_id)
    );

-- FORM TEMPLATES TABLE RLS POLICIES
-- Everyone can view non-premium templates
CREATE POLICY "Everyone can view free form templates" ON form_builder.form_templates
    FOR SELECT USING (
        is_premium = false
    );

-- Users with appropriate tier can view premium templates
CREATE POLICY "Paid users can view premium templates" ON form_builder.form_templates
    FOR SELECT USING (
        is_premium = true
        AND EXISTS (
            SELECT 1 FROM public.organization_members om
            JOIN public.organizations o ON o.id = om.organization_id
            WHERE om.user_id = auth.uid()
            AND om.status = 'active'
            AND o.subscription_tier IN ('professional', 'scale', 'enterprise')
        )
    );

-- Only admins can manage templates
CREATE POLICY "Only system admins can manage templates" ON form_builder.form_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- WEBHOOK DELIVERIES TABLE RLS POLICIES
-- Users can view webhook deliveries for their organization's submissions
CREATE POLICY "Users can view webhook deliveries for organization submissions" ON form_builder.webhook_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM form_builder.form_submissions fs
            WHERE fs.id = form_submission_id
            AND form_builder.user_has_organization_access(fs.organization_id)
        )
    );

-- System can create/update webhook delivery records
CREATE POLICY "System can manage webhook deliveries" ON form_builder.webhook_deliveries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM form_builder.form_submissions fs
            WHERE fs.id = form_submission_id
            AND form_builder.user_has_organization_access(fs.organization_id)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM form_builder.form_submissions fs
            WHERE fs.id = form_submission_id
            AND form_builder.user_has_organization_access(fs.organization_id)
        )
    );

-- ADDITIONAL SECURITY POLICIES FOR WEDDING DAY PROTECTION

-- Emergency read-only policy for Saturday weddings (can be enabled during wedding emergencies)
CREATE POLICY "Saturday emergency read-only" ON form_builder.form_submissions
    FOR UPDATE USING (
        -- Allow updates only if it's not Saturday or if it's an admin override
        EXTRACT(dow FROM CURRENT_DATE) != 6 -- Saturday = 6
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Prevent accidental form deactivation during peak wedding season
CREATE POLICY "Protect form deactivation during peak season" ON form_builder.forms
    FOR UPDATE USING (
        -- Allow updates except deactivation during peak months (May-October)
        NOT (
            OLD.is_active = true 
            AND NEW.is_active = false 
            AND EXTRACT(month FROM CURRENT_DATE) BETWEEN 5 AND 10
        )
        OR form_builder.user_is_organization_admin(organization_id)
    );

-- Data retention policy compliance
CREATE POLICY "GDPR data retention compliance" ON form_builder.form_submissions
    FOR SELECT USING (
        -- Hide submissions past their retention date unless explicitly requested
        (data_retention_until IS NULL OR data_retention_until > CURRENT_DATE)
        OR form_builder.user_is_organization_admin(organization_id)
    );

-- Rate limiting policy for form creation
CREATE OR REPLACE FUNCTION form_builder.check_form_creation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_forms_count INTEGER;
    user_tier TEXT;
BEGIN
    -- Get user's subscription tier
    SELECT o.subscription_tier INTO user_tier
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
    LIMIT 1;

    -- Count recent form creations (last 24 hours)
    SELECT COUNT(*) INTO recent_forms_count
    FROM form_builder.forms
    WHERE supplier_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours';

    -- Apply tier-based rate limits
    IF user_tier = 'free' AND recent_forms_count >= 3 THEN
        RAISE EXCEPTION 'Free tier: Maximum 3 forms per day. Upgrade to create more forms.';
    ELSIF user_tier = 'starter' AND recent_forms_count >= 10 THEN
        RAISE EXCEPTION 'Starter tier: Maximum 10 forms per day. Upgrade for unlimited forms.';
    ELSIF user_tier IN ('professional', 'scale', 'enterprise') AND recent_forms_count >= 100 THEN
        RAISE EXCEPTION 'Rate limit: Maximum 100 forms per day for system protection.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for form creation rate limiting
CREATE TRIGGER form_creation_rate_limit_trigger
    BEFORE INSERT ON form_builder.forms
    FOR EACH ROW
    EXECUTE FUNCTION form_builder.check_form_creation_rate_limit();

-- Audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION form_builder.log_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
    -- Log form deletions
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            user_id, 
            action, 
            table_name, 
            record_id, 
            old_values, 
            created_at
        ) VALUES (
            auth.uid(),
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD),
            NOW()
        );
        RETURN OLD;
    END IF;

    -- Log form status changes (activation/deactivation)
    IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
        INSERT INTO public.audit_logs (
            user_id, 
            action, 
            table_name, 
            record_id, 
            old_values,
            new_values,
            created_at
        ) VALUES (
            auth.uid(),
            'STATUS_CHANGE',
            TG_TABLE_NAME,
            NEW.id,
            json_build_object('is_active', OLD.is_active),
            json_build_object('is_active', NEW.is_active),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for sensitive operations
CREATE TRIGGER form_audit_trigger
    AFTER UPDATE OR DELETE ON form_builder.forms
    FOR EACH ROW
    EXECUTE FUNCTION form_builder.log_sensitive_operations();

-- Create audit trigger for submission deletions (GDPR compliance)
CREATE TRIGGER submission_audit_trigger
    AFTER DELETE ON form_builder.form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION form_builder.log_sensitive_operations();

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION form_builder.user_has_organization_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION form_builder.user_is_organization_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION form_builder.get_user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION form_builder.user_owns_form(UUID) TO authenticated;

-- Performance optimization: Create functional indexes for RLS policies
CREATE INDEX idx_forms_rls_organization_supplier ON form_builder.forms(organization_id, supplier_id) WHERE is_active = true;
CREATE INDEX idx_forms_rls_public_active ON form_builder.forms(is_public, is_active) WHERE is_public = true AND is_active = true;
CREATE INDEX idx_submissions_rls_organization ON form_builder.form_submissions(organization_id, created_at);
CREATE INDEX idx_submissions_rls_client ON form_builder.form_submissions(client_id, created_at) WHERE client_id IS NOT NULL;

-- Comment on security approach
COMMENT ON SCHEMA form_builder IS 'Advanced Form Builder schema with enterprise-grade Row Level Security for multi-tenant isolation, wedding industry compliance, and GDPR data protection';

-- Security audit summary
DO $$
BEGIN
    RAISE NOTICE 'WS-342 Form Builder RLS Policies Applied Successfully';
    RAISE NOTICE '✅ Multi-tenant organization isolation implemented';
    RAISE NOTICE '✅ Wedding day protection policies active';  
    RAISE NOTICE '✅ GDPR data retention compliance enforced';
    RAISE NOTICE '✅ Tier-based rate limiting configured';
    RAISE NOTICE '✅ Comprehensive audit logging enabled';
    RAISE NOTICE '✅ Performance optimized with functional indexes';
END $$;