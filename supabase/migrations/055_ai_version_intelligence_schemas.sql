-- =====================================================
-- AI Version Intelligence System Database Schemas
-- WS-200 API Versioning Strategy - Team D Implementation
-- =====================================================

-- API Evolution Training Data
CREATE TABLE IF NOT EXISTS api_evolution_training (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- API Version Data
    from_version VARCHAR(50) NOT NULL,
    to_version VARCHAR(50) NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- breaking, non-breaking, enhancement
    
    -- Schema Changes
    schema_changes JSONB NOT NULL DEFAULT '{}',
    breaking_changes JSONB NOT NULL DEFAULT '[]',
    compatibility_score FLOAT NOT NULL DEFAULT 0.0,
    
    -- Wedding Industry Context
    wedding_season_impact INTEGER NOT NULL DEFAULT 0, -- 0-10 scale
    cultural_considerations JSONB NOT NULL DEFAULT '{}',
    supplier_type VARCHAR(50), -- photographer, venue, florist, etc.
    
    -- Performance Metrics
    migration_success_rate FLOAT DEFAULT 0.0,
    rollback_required BOOLEAN DEFAULT FALSE,
    client_adoption_rate FLOAT DEFAULT 0.0,
    performance_impact FLOAT DEFAULT 0.0, -- -1 to 1 scale
    
    -- ML Features
    embedding_vector VECTOR(1536), -- OpenAI embedding
    feature_vector JSONB NOT NULL DEFAULT '{}',
    outcome_label VARCHAR(50) NOT NULL, -- success, failure, partial
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    training_validated BOOLEAN DEFAULT FALSE,
    validation_score FLOAT DEFAULT 0.0
);

-- Model Training Sessions
CREATE TABLE IF NOT EXISTS ml_model_training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Model Information
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- compatibility, performance, cultural
    model_version VARCHAR(20) NOT NULL,
    framework VARCHAR(50) NOT NULL, -- openai, tensorflow, pytorch
    
    -- Training Configuration
    training_config JSONB NOT NULL DEFAULT '{}',
    hyperparameters JSONB NOT NULL DEFAULT '{}',
    dataset_size INTEGER NOT NULL DEFAULT 0,
    training_duration_minutes INTEGER DEFAULT 0,
    
    -- Performance Metrics
    training_accuracy FLOAT DEFAULT 0.0,
    validation_accuracy FLOAT DEFAULT 0.0,
    test_accuracy FLOAT DEFAULT 0.0,
    loss_function_value FLOAT DEFAULT 0.0,
    overfitting_score FLOAT DEFAULT 0.0,
    
    -- Wedding Industry Metrics
    wedding_season_accuracy FLOAT DEFAULT 0.0,
    cultural_accuracy FLOAT DEFAULT 0.0,
    supplier_type_accuracy FLOAT DEFAULT 0.0,
    
    -- Training Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, training, completed, failed
    error_message TEXT,
    model_file_path VARCHAR(500),
    
    -- Metadata
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    
    UNIQUE(organization_id, model_name, model_version)
);

-- Cultural API Intelligence Data
CREATE TABLE IF NOT EXISTS cultural_api_intelligence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Cultural Context
    cultural_tradition VARCHAR(100) NOT NULL, -- hindu, islamic, jewish, christian, buddhist
    region VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL,
    
    -- API Requirements
    api_endpoint VARCHAR(255) NOT NULL,
    cultural_modifications JSONB NOT NULL DEFAULT '{}',
    localization_requirements JSONB NOT NULL DEFAULT '{}',
    calendar_considerations JSONB NOT NULL DEFAULT '{}',
    
    -- Wedding Traditions
    ceremony_requirements JSONB NOT NULL DEFAULT '{}',
    ritual_integrations JSONB NOT NULL DEFAULT '{}',
    cultural_validations JSONB NOT NULL DEFAULT '{}',
    
    -- Performance Data
    adoption_rate FLOAT DEFAULT 0.0,
    user_satisfaction FLOAT DEFAULT 0.0,
    cultural_accuracy FLOAT DEFAULT 0.0,
    
    -- ML Features
    cultural_embedding VECTOR(1536),
    feature_importance JSONB NOT NULL DEFAULT '{}',
    similarity_score FLOAT DEFAULT 0.0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_by_cultural_expert BOOLEAN DEFAULT FALSE,
    expert_validation_notes TEXT
);

-- Version Recommendation History
CREATE TABLE IF NOT EXISTS version_recommendation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Client Information
    client_business_type VARCHAR(50) NOT NULL,
    client_technical_capability INTEGER NOT NULL DEFAULT 3, -- 1-5 scale
    client_size VARCHAR(20) NOT NULL, -- small, medium, large, enterprise
    
    -- Recommendation Data
    recommended_version VARCHAR(50) NOT NULL,
    confidence_score FLOAT NOT NULL DEFAULT 0.0,
    reasoning JSONB NOT NULL DEFAULT '{}',
    alternative_versions JSONB NOT NULL DEFAULT '[]',
    
    -- Context Factors
    wedding_season_factor FLOAT NOT NULL DEFAULT 1.0,
    cultural_requirements JSONB NOT NULL DEFAULT '{}',
    technical_constraints JSONB NOT NULL DEFAULT '{}',
    business_priorities JSONB NOT NULL DEFAULT '{}',
    
    -- Outcome Tracking
    recommendation_accepted BOOLEAN,
    migration_successful BOOLEAN,
    client_satisfaction_score FLOAT,
    post_migration_issues INTEGER DEFAULT 0,
    
    -- Performance Impact
    api_response_time_change FLOAT DEFAULT 0.0,
    error_rate_change FLOAT DEFAULT 0.0,
    feature_adoption_rate FLOAT DEFAULT 0.0,
    
    -- ML Learning Data
    feedback_vector JSONB NOT NULL DEFAULT '{}',
    success_factors JSONB NOT NULL DEFAULT '{}',
    failure_factors JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    recommendation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    migration_date TIMESTAMP WITH TIME ZONE,
    feedback_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id)
);

-- Performance Prediction Models
CREATE TABLE IF NOT EXISTS performance_prediction_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Model Configuration
    model_name VARCHAR(100) NOT NULL,
    algorithm_type VARCHAR(50) NOT NULL, -- genetic, neural, gradient_boost
    model_parameters JSONB NOT NULL DEFAULT '{}',
    
    -- Performance Metrics
    prediction_accuracy FLOAT NOT NULL DEFAULT 0.0,
    mean_absolute_error FLOAT DEFAULT 0.0,
    root_mean_square_error FLOAT DEFAULT 0.0,
    wedding_season_accuracy FLOAT DEFAULT 0.0,
    
    -- Training Data
    training_data_size INTEGER NOT NULL DEFAULT 0,
    validation_data_size INTEGER NOT NULL DEFAULT 0,
    test_data_size INTEGER NOT NULL DEFAULT 0,
    
    -- Feature Importance
    feature_importance_scores JSONB NOT NULL DEFAULT '{}',
    top_performance_predictors JSONB NOT NULL DEFAULT '[]',
    
    -- Model Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, deprecated, training
    model_file_location VARCHAR(500),
    last_trained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Deployment Info
    deployed_version VARCHAR(20),
    deployment_environment VARCHAR(50), -- staging, production
    api_endpoint VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

-- AI System Metrics and Monitoring
CREATE TABLE IF NOT EXISTS ai_system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- System Component
    component_name VARCHAR(100) NOT NULL, -- api_evolution, compatibility, migration, etc.
    metric_type VARCHAR(50) NOT NULL, -- accuracy, performance, usage
    
    -- Metric Values
    metric_value FLOAT NOT NULL,
    metric_threshold FLOAT DEFAULT NULL,
    alert_triggered BOOLEAN DEFAULT FALSE,
    
    -- Context
    measurement_context JSONB NOT NULL DEFAULT '{}',
    wedding_season_context BOOLEAN DEFAULT FALSE,
    cultural_context VARCHAR(100),
    
    -- Performance Breakdown
    response_time_ms FLOAT DEFAULT 0.0,
    memory_usage_mb FLOAT DEFAULT 0.0,
    cpu_utilization_percent FLOAT DEFAULT 0.0,
    api_calls_count INTEGER DEFAULT 0,
    error_rate FLOAT DEFAULT 0.0,
    
    -- Wedding Industry KPIs
    wedding_day_performance FLOAT DEFAULT 0.0,
    supplier_satisfaction_score FLOAT DEFAULT 0.0,
    cultural_accuracy_score FLOAT DEFAULT 0.0,
    
    -- Metadata
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    measurement_duration_seconds INTEGER DEFAULT 0,
    environment VARCHAR(50) DEFAULT 'production'
);

-- Migration Intelligence Optimization Results
CREATE TABLE IF NOT EXISTS migration_optimization_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Optimization Run Info
    optimization_run_id VARCHAR(100) NOT NULL,
    algorithm_used VARCHAR(50) NOT NULL, -- genetic, simulated_annealing, gradient_descent
    optimization_objective VARCHAR(100) NOT NULL,
    
    -- Input Parameters
    client_segments JSONB NOT NULL DEFAULT '{}',
    wedding_season_constraints JSONB NOT NULL DEFAULT '{}',
    cultural_requirements JSONB NOT NULL DEFAULT '{}',
    technical_constraints JSONB NOT NULL DEFAULT '{}',
    
    -- Optimization Results
    optimal_migration_plan JSONB NOT NULL DEFAULT '{}',
    predicted_success_rate FLOAT NOT NULL DEFAULT 0.0,
    estimated_duration_days INTEGER DEFAULT 0,
    risk_score FLOAT DEFAULT 0.0,
    
    -- Alternative Solutions
    alternative_plans JSONB NOT NULL DEFAULT '[]',
    plan_comparison_matrix JSONB NOT NULL DEFAULT '{}',
    
    -- Performance Metrics
    optimization_runtime_seconds FLOAT DEFAULT 0.0,
    convergence_iterations INTEGER DEFAULT 0,
    solution_quality_score FLOAT DEFAULT 0.0,
    
    -- Validation Results
    plan_feasibility_score FLOAT DEFAULT 0.0,
    resource_requirement_score FLOAT DEFAULT 0.0,
    business_impact_score FLOAT DEFAULT 0.0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    validation_status VARCHAR(50) DEFAULT 'pending'
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_api_evolution_training_org_version ON api_evolution_training(organization_id, from_version, to_version);
CREATE INDEX IF NOT EXISTS idx_api_evolution_training_supplier_type ON api_evolution_training(supplier_type);
CREATE INDEX IF NOT EXISTS idx_api_evolution_training_cultural ON api_evolution_training USING GIN(cultural_considerations);
CREATE INDEX IF NOT EXISTS idx_api_evolution_training_embedding ON api_evolution_training USING ivfflat(embedding_vector vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_ml_training_sessions_org_model ON ml_model_training_sessions(organization_id, model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_ml_training_sessions_status ON ml_model_training_sessions(status);

CREATE INDEX IF NOT EXISTS idx_cultural_api_intelligence_tradition ON cultural_api_intelligence(cultural_tradition, region);
CREATE INDEX IF NOT EXISTS idx_cultural_api_intelligence_embedding ON cultural_api_intelligence USING ivfflat(cultural_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_version_recommendation_history_org ON version_recommendation_history(organization_id, client_business_type);
CREATE INDEX IF NOT EXISTS idx_version_recommendation_history_date ON version_recommendation_history(recommendation_date);

CREATE INDEX IF NOT EXISTS idx_ai_system_metrics_component ON ai_system_metrics(component_name, metric_type, measured_at);
CREATE INDEX IF NOT EXISTS idx_ai_system_metrics_wedding_season ON ai_system_metrics(wedding_season_context, measured_at);

CREATE INDEX IF NOT EXISTS idx_migration_optimization_run ON migration_optimization_results(optimization_run_id, algorithm_used);

-- RLS Policies for Security
ALTER TABLE api_evolution_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_api_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_prediction_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_optimization_results ENABLE ROW LEVEL SECURITY;

-- Organization-based access policies
CREATE POLICY "Users can access their organization's AI training data"
ON api_evolution_training FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's ML training sessions"
ON ml_model_training_sessions FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's cultural intelligence data"
ON cultural_api_intelligence FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's version recommendation history"
ON version_recommendation_history FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's performance prediction models"
ON performance_prediction_models FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's AI system metrics"
ON ai_system_metrics FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's migration optimization results"
ON migration_optimization_results FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    )
);

-- Functions for AI System Management
CREATE OR REPLACE FUNCTION update_ai_model_metrics()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_evolution_training_timestamp
    BEFORE UPDATE ON api_evolution_training
    FOR EACH ROW EXECUTE FUNCTION update_ai_model_metrics();

CREATE TRIGGER update_cultural_api_intelligence_timestamp
    BEFORE UPDATE ON cultural_api_intelligence
    FOR EACH ROW EXECUTE FUNCTION update_ai_model_metrics();

CREATE TRIGGER update_performance_prediction_models_timestamp
    BEFORE UPDATE ON performance_prediction_models
    FOR EACH ROW EXECUTE FUNCTION update_ai_model_metrics();

-- AI System Health Check Function
CREATE OR REPLACE FUNCTION check_ai_system_health(
    component_name_param VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    component VARCHAR,
    status VARCHAR,
    last_metric_time TIMESTAMP WITH TIME ZONE,
    error_rate FLOAT,
    performance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        asm.component_name::VARCHAR,
        CASE 
            WHEN MAX(asm.measured_at) < NOW() - INTERVAL '1 hour' THEN 'stale'
            WHEN AVG(asm.error_rate) > 0.05 THEN 'warning'
            WHEN AVG(asm.error_rate) > 0.01 THEN 'degraded'
            ELSE 'healthy'
        END::VARCHAR,
        MAX(asm.measured_at),
        AVG(asm.error_rate)::FLOAT,
        AVG(asm.wedding_day_performance)::FLOAT
    FROM ai_system_metrics asm
    WHERE (component_name_param IS NULL OR asm.component_name = component_name_param)
        AND asm.measured_at > NOW() - INTERVAL '24 hours'
    GROUP BY asm.component_name
    ORDER BY asm.component_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE api_evolution_training IS 'Training data for API evolution intelligence with wedding industry context';
COMMENT ON TABLE ml_model_training_sessions IS 'ML model training sessions and performance tracking';
COMMENT ON TABLE cultural_api_intelligence IS 'Cultural API intelligence data for global wedding traditions';
COMMENT ON TABLE version_recommendation_history IS 'History of version recommendations and their outcomes';
COMMENT ON TABLE performance_prediction_models IS 'Performance prediction models and their configurations';
COMMENT ON TABLE ai_system_metrics IS 'AI system metrics and monitoring data';
COMMENT ON TABLE migration_optimization_results IS 'Migration optimization results and alternative plans';