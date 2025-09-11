-- =============================================
-- WS-122: Field Extraction System
-- Team E - Batch 9 - Round 2
-- Automated Field Extraction from Documents
-- =============================================

-- Create extraction templates table
CREATE TABLE IF NOT EXISTS extraction_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create field definitions table
CREATE TABLE IF NOT EXISTS field_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES extraction_templates(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    pattern TEXT,
    validation_rules JSONB,
    aliases TEXT[],
    position JSONB,
    extraction_hints TEXT[],
    default_value TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create extracted documents table
CREATE TABLE IF NOT EXISTS extracted_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID,
    template_id UUID REFERENCES extraction_templates(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_fields INTEGER DEFAULT 0,
    successful_fields INTEGER DEFAULT 0,
    failed_fields INTEGER DEFAULT 0,
    average_confidence DECIMAL(5,4) DEFAULT 0,
    extraction_time INTEGER, -- milliseconds
    errors JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    extracted_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create extracted fields table
CREATE TABLE IF NOT EXISTS extracted_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES extracted_documents(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES field_definitions(id),
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    value TEXT,
    original_value TEXT,
    confidence DECIMAL(5,4) DEFAULT 0,
    confidence_level VARCHAR(20),
    validation_status VARCHAR(20),
    validation_errors TEXT[],
    position JSONB,
    metadata JSONB,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create field extraction history table for audit
CREATE TABLE IF NOT EXISTS field_extraction_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID,
    template_id UUID,
    extraction_id UUID REFERENCES extracted_documents(id),
    action VARCHAR(50) NOT NULL, -- 'extract', 'validate', 'export', 'retry'
    status VARCHAR(50),
    details JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exports table
CREATE TABLE IF NOT EXISTS field_extraction_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES extracted_documents(id),
    format VARCHAR(20) NOT NULL, -- json, csv, xml, excel, pdf
    file_name VARCHAR(255),
    file_path TEXT,
    file_size INTEGER,
    options JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    errors TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create field extraction analytics table
CREATE TABLE IF NOT EXISTS field_extraction_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES extraction_templates(id),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_documents INTEGER DEFAULT 0,
    successful_extractions INTEGER DEFAULT 0,
    failed_extractions INTEGER DEFAULT 0,
    average_accuracy DECIMAL(5,4) DEFAULT 0,
    average_processing_time INTEGER, -- milliseconds
    field_statistics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_extraction_templates_org ON extraction_templates(organization_id);
CREATE INDEX idx_extraction_templates_active ON extraction_templates(is_active);
CREATE INDEX idx_extraction_templates_type ON extraction_templates(document_type);

CREATE INDEX idx_field_definitions_template ON field_definitions(template_id);
CREATE INDEX idx_field_definitions_name ON field_definitions(field_name);

CREATE INDEX idx_extracted_documents_org ON extracted_documents(organization_id);
CREATE INDEX idx_extracted_documents_status ON extracted_documents(status);
CREATE INDEX idx_extracted_documents_template ON extracted_documents(template_id);
CREATE INDEX idx_extracted_documents_created ON extracted_documents(created_at);

CREATE INDEX idx_extracted_fields_document ON extracted_fields(document_id);
CREATE INDEX idx_extracted_fields_definition ON extracted_fields(field_definition_id);
CREATE INDEX idx_extracted_fields_confidence ON extracted_fields(confidence);
CREATE INDEX idx_extracted_fields_validation ON extracted_fields(validation_status);

CREATE INDEX idx_extraction_history_document ON field_extraction_history(document_id);
CREATE INDEX idx_extraction_history_extraction ON field_extraction_history(extraction_id);
CREATE INDEX idx_extraction_history_action ON field_extraction_history(action);
CREATE INDEX idx_extraction_history_created ON field_extraction_history(created_at);

CREATE INDEX idx_extraction_exports_document ON field_extraction_exports(document_id);
CREATE INDEX idx_extraction_exports_org ON field_extraction_exports(organization_id);
CREATE INDEX idx_extraction_exports_status ON field_extraction_exports(status);

CREATE INDEX idx_extraction_analytics_template ON field_extraction_analytics(template_id);
CREATE INDEX idx_extraction_analytics_org ON field_extraction_analytics(organization_id);
CREATE INDEX idx_extraction_analytics_period ON field_extraction_analytics(period_start, period_end);

-- Row Level Security
ALTER TABLE extraction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_extraction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_extraction_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_extraction_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for extraction_templates
CREATE POLICY "Users can view templates in their organization" ON extraction_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create templates in their organization" ON extraction_templates
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update templates in their organization" ON extraction_templates
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for field_definitions
CREATE POLICY "Users can view field definitions for their templates" ON field_definitions
    FOR SELECT USING (
        template_id IN (
            SELECT id FROM extraction_templates 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage field definitions for their templates" ON field_definitions
    FOR ALL USING (
        template_id IN (
            SELECT id FROM extraction_templates 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for extracted_documents
CREATE POLICY "Users can view extracted documents in their organization" ON extracted_documents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create extracted documents in their organization" ON extracted_documents
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update extracted documents in their organization" ON extracted_documents
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for extracted_fields
CREATE POLICY "Users can view extracted fields for their documents" ON extracted_fields
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM extracted_documents 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage extracted fields for their documents" ON extracted_fields
    FOR ALL USING (
        document_id IN (
            SELECT id FROM extracted_documents 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for field_extraction_history
CREATE POLICY "Users can view extraction history for their organization" ON field_extraction_history
    FOR SELECT USING (
        extraction_id IN (
            SELECT id FROM extracted_documents 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create extraction history" ON field_extraction_history
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- RLS Policies for field_extraction_exports
CREATE POLICY "Users can view exports in their organization" ON field_extraction_exports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create exports in their organization" ON field_extraction_exports
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for field_extraction_analytics
CREATE POLICY "Users can view analytics for their organization" ON field_extraction_analytics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Functions for field extraction

-- Function to calculate extraction accuracy
CREATE OR REPLACE FUNCTION calculate_extraction_accuracy(
    p_document_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_accuracy DECIMAL;
BEGIN
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE AVG(confidence)
        END INTO v_accuracy
    FROM extracted_fields
    WHERE document_id = p_document_id
        AND validation_status IN ('valid', 'warning');
    
    RETURN COALESCE(v_accuracy, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get extraction statistics
CREATE OR REPLACE FUNCTION get_extraction_statistics(
    p_template_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    total_documents INTEGER,
    successful_extractions INTEGER,
    failed_extractions INTEGER,
    average_accuracy DECIMAL,
    average_processing_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_documents,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as successful_extractions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::INTEGER as failed_extractions,
        AVG(average_confidence) as average_accuracy,
        AVG(extraction_time)::INTEGER as average_processing_time
    FROM extracted_documents
    WHERE template_id = p_template_id
        AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_field_extraction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_extraction_templates_timestamp
    BEFORE UPDATE ON extraction_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_field_extraction_timestamp();

CREATE TRIGGER update_field_definitions_timestamp
    BEFORE UPDATE ON field_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_field_extraction_timestamp();

CREATE TRIGGER update_extracted_documents_timestamp
    BEFORE UPDATE ON extracted_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_field_extraction_timestamp();

CREATE TRIGGER update_extracted_fields_timestamp
    BEFORE UPDATE ON extracted_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_field_extraction_timestamp();

-- Grant permissions
GRANT ALL ON extraction_templates TO authenticated;
GRANT ALL ON field_definitions TO authenticated;
GRANT ALL ON extracted_documents TO authenticated;
GRANT ALL ON extracted_fields TO authenticated;
GRANT ALL ON field_extraction_history TO authenticated;
GRANT ALL ON field_extraction_exports TO authenticated;
GRANT ALL ON field_extraction_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_extraction_accuracy TO authenticated;
GRANT EXECUTE ON FUNCTION get_extraction_statistics TO authenticated;