-- A/B Testing System Migration
-- WS-028: Communication Optimization Engine

BEGIN;

-- Create A/B Tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    
    -- Test configuration
    metrics TEXT[] NOT NULL DEFAULT '{}',
    target_audience JSONB,
    confidence_level INTEGER NOT NULL DEFAULT 95 CHECK (confidence_level BETWEEN 90 AND 99),
    
    -- Statistical results
    statistical_significance DECIMAL(5,4),
    winner_variant_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Organization and user tracking
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create A/B Test Variants table
CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    traffic_percentage INTEGER NOT NULL DEFAULT 0 CHECK (traffic_percentage BETWEEN 0 AND 100),
    is_control BOOLEAN NOT NULL DEFAULT false,
    
    -- Performance metrics
    total_exposures INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    
    -- Wedding-specific metrics
    open_count INTEGER NOT NULL DEFAULT 0,
    response_count INTEGER NOT NULL DEFAULT 0,
    engagement_count INTEGER NOT NULL DEFAULT 0,
    satisfaction_score DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create A/B Test Results table for detailed tracking
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    
    -- Event tracking
    event_type TEXT NOT NULL CHECK (event_type IN ('exposure', 'open', 'response', 'engagement', 'conversion')),
    event_data JSONB,
    
    -- Client information
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    message_id UUID, -- Reference to message/campaign
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    location_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create A/B Test Assignments table to track which variant each client sees
CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sticky BOOLEAN NOT NULL DEFAULT true, -- Whether to keep same assignment for consistency
    
    UNIQUE(test_id, client_id) -- Each client gets one variant per test
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ab_tests_organization_id ON ab_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_created_at ON ab_tests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_is_control ON ab_test_variants(is_control);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant_id ON ab_test_results(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_event_type ON ab_test_results(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_created_at ON ab_test_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_client ON ab_test_assignments(test_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_variant_id ON ab_test_assignments(variant_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ab_tests_updated_at 
    BEFORE UPDATE ON ab_tests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_variants_updated_at 
    BEFORE UPDATE ON ab_test_variants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate conversion rates
CREATE OR REPLACE FUNCTION calculate_variant_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversion rate when metrics change
    IF NEW.total_exposures > 0 THEN
        NEW.conversion_rate = CAST(NEW.conversions AS DECIMAL) / NEW.total_exposures;
    ELSE
        NEW.conversion_rate = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate conversion rates
CREATE TRIGGER calculate_conversion_rate_trigger
    BEFORE INSERT OR UPDATE ON ab_test_variants
    FOR EACH ROW
    EXECUTE FUNCTION calculate_variant_conversion_rate();

-- Create function to get variant assignment for a client
CREATE OR REPLACE FUNCTION get_variant_assignment(
    p_test_id UUID,
    p_client_id UUID
) RETURNS UUID AS $$
DECLARE
    v_variant_id UUID;
    v_test_status TEXT;
    v_total_traffic INTEGER;
    v_random_value INTEGER;
    v_cumulative_traffic INTEGER := 0;
    variant_record RECORD;
BEGIN
    -- Check if test is running
    SELECT status INTO v_test_status
    FROM ab_tests
    WHERE id = p_test_id;
    
    IF v_test_status != 'running' THEN
        RETURN NULL;
    END IF;
    
    -- Check if client already has assignment
    SELECT variant_id INTO v_variant_id
    FROM ab_test_assignments
    WHERE test_id = p_test_id AND client_id = p_client_id;
    
    IF v_variant_id IS NOT NULL THEN
        RETURN v_variant_id;
    END IF;
    
    -- Generate new assignment based on traffic percentages
    -- Use client_id hash for deterministic assignment
    v_random_value := (hashtext(p_client_id::TEXT) & 2147483647) % 100 + 1;
    
    -- Find appropriate variant based on traffic percentages
    FOR variant_record IN
        SELECT id, traffic_percentage
        FROM ab_test_variants
        WHERE test_id = p_test_id
        ORDER BY is_control DESC, id
    LOOP
        v_cumulative_traffic := v_cumulative_traffic + variant_record.traffic_percentage;
        IF v_random_value <= v_cumulative_traffic THEN
            v_variant_id := variant_record.id;
            EXIT;
        END IF;
    END LOOP;
    
    -- Create assignment record
    INSERT INTO ab_test_assignments (test_id, variant_id, client_id)
    VALUES (p_test_id, v_variant_id, p_client_id);
    
    RETURN v_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to record test events
CREATE OR REPLACE FUNCTION record_ab_test_event(
    p_test_id UUID,
    p_variant_id UUID,
    p_client_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT NULL,
    p_message_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Record the event
    INSERT INTO ab_test_results (
        test_id,
        variant_id,
        client_id,
        event_type,
        event_data,
        message_id
    ) VALUES (
        p_test_id,
        p_variant_id,
        p_client_id,
        p_event_type,
        p_event_data,
        p_message_id
    );
    
    -- Update variant metrics
    CASE p_event_type
        WHEN 'exposure' THEN
            UPDATE ab_test_variants 
            SET total_exposures = total_exposures + 1
            WHERE id = p_variant_id;
            
        WHEN 'open' THEN
            UPDATE ab_test_variants 
            SET open_count = open_count + 1
            WHERE id = p_variant_id;
            
        WHEN 'response' THEN
            UPDATE ab_test_variants 
            SET response_count = response_count + 1
            WHERE id = p_variant_id;
            
        WHEN 'engagement' THEN
            UPDATE ab_test_variants 
            SET engagement_count = engagement_count + 1
            WHERE id = p_variant_id;
            
        WHEN 'conversion' THEN
            UPDATE ab_test_variants 
            SET conversions = conversions + 1
            WHERE id = p_variant_id;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create view for test performance summary
CREATE OR REPLACE VIEW ab_test_performance AS
SELECT 
    t.id as test_id,
    t.name as test_name,
    t.status,
    t.confidence_level,
    t.statistical_significance,
    v.id as variant_id,
    v.name as variant_name,
    v.is_control,
    v.traffic_percentage,
    v.total_exposures,
    v.conversions,
    v.conversion_rate,
    v.open_count,
    v.response_count,
    v.engagement_count,
    v.satisfaction_score,
    -- Calculate additional metrics
    CASE 
        WHEN v.total_exposures > 0 
        THEN CAST(v.open_count AS DECIMAL) / v.total_exposures 
        ELSE 0 
    END as open_rate,
    CASE 
        WHEN v.total_exposures > 0 
        THEN CAST(v.response_count AS DECIMAL) / v.total_exposures 
        ELSE 0 
    END as response_rate,
    CASE 
        WHEN v.total_exposures > 0 
        THEN CAST(v.engagement_count AS DECIMAL) / v.total_exposures 
        ELSE 0 
    END as engagement_rate
FROM ab_tests t
JOIN ab_test_variants v ON t.id = v.test_id
ORDER BY t.created_at DESC, v.is_control DESC;

-- Enable Row Level Security
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tests in their organization" ON ab_tests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE user_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Users can create tests in their organization" ON ab_tests
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE user_id = ( SELECT auth.uid() )
        ) AND created_by = ( SELECT auth.uid() )
    );

CREATE POLICY "Users can update their organization's tests" ON ab_tests
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE user_id = ( SELECT auth.uid() )
        )
    );

-- Similar policies for variants
CREATE POLICY "Users can view variants in their organization" ON ab_test_variants
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM ab_tests WHERE organization_id IN (
                SELECT organization_id 
                FROM profiles 
                WHERE user_id = ( SELECT auth.uid() )
            )
        )
    );

CREATE POLICY "Users can manage variants in their organization" ON ab_test_variants
    FOR ALL USING (
        test_id IN (
            SELECT id FROM ab_tests WHERE organization_id IN (
                SELECT organization_id 
                FROM profiles 
                WHERE user_id = ( SELECT auth.uid() )
            )
        )
    );

-- Policies for results and assignments
CREATE POLICY "Users can view results in their organization" ON ab_test_results
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM ab_tests WHERE organization_id IN (
                SELECT organization_id 
                FROM profiles 
                WHERE user_id = ( SELECT auth.uid() )
            )
        )
    );

CREATE POLICY "System can manage results" ON ab_test_results
    FOR ALL USING (true);

CREATE POLICY "System can manage assignments" ON ab_test_assignments
    FOR ALL USING (true);

-- Grant permissions to service role for backend operations
GRANT ALL ON ab_tests TO service_role;
GRANT ALL ON ab_test_variants TO service_role;
GRANT ALL ON ab_test_results TO service_role;
GRANT ALL ON ab_test_assignments TO service_role;

-- Comments for documentation
COMMENT ON TABLE ab_tests IS 'A/B tests for wedding communication optimization';
COMMENT ON TABLE ab_test_variants IS 'Individual variants within A/B tests';
COMMENT ON TABLE ab_test_results IS 'Event tracking for A/B test interactions';
COMMENT ON TABLE ab_test_assignments IS 'Client assignments to specific variants';

COMMENT ON FUNCTION get_variant_assignment(UUID, UUID) IS 'Deterministically assign clients to test variants';
COMMENT ON FUNCTION record_ab_test_event(UUID, UUID, UUID, TEXT, JSONB, UUID) IS 'Record and aggregate A/B test events';

COMMIT;