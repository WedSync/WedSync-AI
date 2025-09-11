# TEAM B - ROUND 1: WS-182 - Churn Intelligence
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build ML-powered churn prediction engine with real-time risk scoring, automated retention workflows, and predictive analytics APIs
**FEATURE ID:** WS-182 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about churn prediction accuracy and automated retention campaign effectiveness

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ml/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ml/churn-prediction-engine.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/ml/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("churn.*prediction");
await mcp__serena__search_for_pattern("machine.*learning");
await mcp__serena__get_symbols_overview("src/lib/ml/");
```

### B. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("Node.js machine learning churn prediction");
await mcp__Ref__ref_search_documentation("TensorFlow.js customer retention models");
await mcp__Ref__ref_search_documentation("Real-time ML inference Node.js");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Churn prediction engine requires sophisticated ML architecture: 1) Feature engineering from wedding supplier behavioral data (login frequency, feature usage, support tickets) 2) Multiple ML models for different churn scenarios (immediate risk, gradual decline, seasonal patterns) 3) Real-time scoring system with sub-second response times 4) Automated retention campaign triggers based on risk thresholds 5) Continuous model training and accuracy monitoring. Must account for wedding industry seasonality and supplier lifecycle patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

### 1. **ai-ml-engineer**: Advanced churn prediction models
**Mission**: Develop sophisticated machine learning models for accurate churn prediction
```typescript
await Task({
  subagent_type: "ai-ml-engineer",
  prompt: `Create advanced ML churn prediction system for WS-182 intelligence platform. Must include:
  
  1. Feature Engineering Pipeline:
  - Behavioral feature extraction (login patterns, feature usage, engagement metrics)
  - Temporal feature engineering (seasonal patterns, lifecycle stage indicators)
  - Interaction feature creation (support ticket sentiment, payment failures, usage trends)
  - Wedding industry-specific features (seasonality, supplier type, market conditions)
  
  2. Multi-Model Ensemble Architecture:
  - Gradient boosting model for immediate churn risk (XGBoost/LightGBM equivalent)
  - LSTM neural network for sequential behavior patterns
  - Random forest for interpretable feature importance
  - Ensemble voting mechanism for final churn probability
  
  3. Real-Time Inference System:
  - Sub-second model inference for real-time risk scoring
  - Feature caching for efficient prediction serving
  - A/B testing framework for model comparison
  - Continuous learning pipeline for model improvement
  
  Focus on achieving 85%+ accuracy in predicting churn within 30 days for wedding suppliers.`,
  description: "ML churn prediction models"
});
```

### 2. **api-architect**: Churn prediction and retention APIs
**Mission**: Design comprehensive APIs for churn intelligence and automated retention workflows
```typescript
await Task({
  subagent_type: "api-architect",
  prompt: `Design comprehensive API architecture for WS-182 churn intelligence system. Must include:
  
  1. Churn Prediction APIs:
  - POST /api/churn/predict - Real-time churn risk scoring for individual suppliers
  - GET /api/churn/risk-scores - Batch churn risk analysis for supplier cohorts
  - PUT /api/churn/update-features - Update supplier features for prediction
  - GET /api/churn/risk-factors - Explain churn risk factors for transparency
  
  2. Retention Campaign APIs:
  - POST /api/retention/campaigns - Create automated retention campaigns
  - GET /api/retention/campaigns/{id}/performance - Track campaign effectiveness
  - PUT /api/retention/campaigns/{id}/trigger - Manual campaign trigger override
  - DELETE /api/retention/campaigns/{id} - Pause/stop retention campaigns
  
  3. Intelligence Analytics APIs:
  - GET /api/churn/insights - Automated churn insights and trends
  - POST /api/churn/cohort-analysis - Churn analysis by supplier segments
  - GET /api/churn/prevention-roi - ROI analysis for retention investments
  - WebSocket /api/churn/real-time-alerts - Real-time churn risk notifications
  
  Design for high throughput with proper rate limiting and caching strategies.`,
  description: "Churn intelligence APIs"
});
```

### 3. **database-mcp-specialist**: Churn data architecture and optimization
**Mission**: Design optimized database schema and queries for churn prediction system
```typescript
await Task({
  subagent_type: "database-mcp-specialist",
  prompt: `Design database architecture for WS-182 churn intelligence system. Must include:
  
  1. Churn Prediction Schema:
  - Supplier risk scores table with historical tracking
  - Feature vectors table for ML model inputs
  - Churn events table for model training data
  - Retention campaigns table with performance tracking
  
  2. Performance Optimization:
  - Indexes for real-time churn risk queries
  - Materialized views for complex churn analytics
  - Partitioning strategy for historical churn data
  - Query optimization for feature extraction pipelines
  
  3. Data Pipeline Architecture:
  - Real-time feature extraction from supplier activity
  - Batch processing for model training data preparation
  - Data quality validation for churn prediction inputs
  - Automated data archiving and cleanup procedures
  
  Design for handling millions of supplier interactions and real-time risk scoring.`,
  description: "Churn database architecture"
});
```

### 4. **integration-specialist**: Retention campaign automation
**Mission**: Build automated retention campaign triggers and integration workflows
```typescript
await Task({
  subagent_type: "integration-specialist",
  prompt: `Create automated retention campaign system for WS-182 churn intelligence. Must include:
  
  1. Campaign Trigger Automation:
  - Real-time churn risk threshold monitoring
  - Automated campaign selection based on supplier profile
  - Multi-channel campaign execution (email, SMS, in-app notifications)
  - Campaign timing optimization based on supplier behavior patterns
  
  2. External System Integration:
  - Email service integration (SendGrid, Mailgun) for retention campaigns
  - SMS service integration (Twilio) for urgent churn interventions
  - CRM integration (HubSpot, Salesforce) for customer success workflows
  - Marketing automation platform integration for sophisticated campaigns
  
  3. Campaign Performance Tracking:
  - Real-time campaign delivery and engagement tracking
  - A/B testing for retention campaign optimization
  - ROI calculation for retention investment effectiveness
  - Automated campaign performance reporting
  
  Focus on creating seamless automated workflows that prevent wedding supplier churn.`,
  description: "Retention automation"
});
```

### 5. **performance-optimization-expert**: ML inference optimization
**Mission**: Optimize machine learning inference for real-time churn risk scoring
```typescript
await Task({
  subagent_type: "performance-optimization-expert",
  prompt: `Optimize ML inference performance for WS-182 churn prediction system. Must include:
  
  1. Inference Performance Optimization:
  - Model optimization for sub-100ms prediction times
  - Feature caching strategy for frequently scored suppliers
  - Batch prediction optimization for bulk risk assessments
  - GPU utilization for complex neural network inference
  
  2. Scalable ML Infrastructure:
  - Auto-scaling ML inference servers based on demand
  - Model serving optimization with caching and load balancing
  - A/B testing infrastructure for model comparison
  - Canary deployment for new churn prediction models
  
  3. Resource Management:
  - Memory optimization for large-scale feature vectors
  - CPU utilization optimization for real-time scoring
  - Database connection pooling for feature extraction
  - Cost optimization for ML infrastructure usage
  
  Ensure churn risk scoring can handle peak wedding season traffic with consistent performance.`,
  description: "ML inference optimization"
});
```

### 6. **security-compliance-officer**: ML security and data protection
**Mission**: Implement security measures and compliance for churn prediction system
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security and compliance for WS-182 churn intelligence system. Must include:
  
  1. ML Security Measures:
  - Model security to prevent adversarial attacks
  - Feature data encryption and secure transmission
  - Access control for churn prediction models and data
  - Audit logging for all ML predictions and interventions
  
  2. Data Privacy and Compliance:
  - GDPR compliance for supplier behavioral data processing
  - Right to be forgotten implementation for churn data
  - Data anonymization for ML model training
  - Consent management for retention campaign communications
  
  3. Ethical AI Implementation:
  - Bias detection and mitigation in churn prediction models
  - Explainable AI for transparent churn risk factors
  - Fair treatment validation across supplier demographics
  - Ethical guidelines for automated retention interventions
  
  Ensure churn intelligence maintains ethical standards and regulatory compliance.`,
  description: "ML security compliance"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### CHURN INTELLIGENCE SECURITY:
- [ ] **ML model security** - Protect churn prediction models from adversarial attacks
- [ ] **Feature data encryption** - Encrypt supplier behavioral data used for predictions
- [ ] **API authentication** - Secure all churn intelligence API endpoints
- [ ] **Access control** - Implement role-based access for churn prediction data
- [ ] **Audit logging** - Log all churn predictions and retention actions
- [ ] **Data anonymization** - Anonymize supplier data in ML model training
- [ ] **Rate limiting** - Prevent abuse of computationally expensive ML operations

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

### SPECIFIC DELIVERABLES FOR WS-182:

#### 1. ChurnPredictionEngine.ts - Core ML prediction engine
```typescript
export class ChurnPredictionEngine {
  async predictChurnRisk(
    supplierId: string,
    features?: SupplierFeatures
  ): Promise<ChurnRiskScore> {
    // Extract or use provided supplier features
    // Run ensemble ML models for churn prediction
    // Calculate confidence intervals and risk factors
    // Return comprehensive churn risk assessment
  }
  
  async batchPredictChurnRisk(
    supplierIds: string[],
    options: BatchPredictionOptions
  ): Promise<ChurnRiskScore[]> {
    // Optimize batch prediction for multiple suppliers
    // Implement parallel processing for large batches
    // Cache results for frequently accessed suppliers
  }
  
  private async extractSupplierFeatures(
    supplierId: string
  ): Promise<SupplierFeatureVector> {
    // Extract behavioral features from supplier activity
    // Calculate temporal patterns and trends
    // Apply wedding industry-specific feature engineering
  }
}
```

#### 2. /api/churn/predict/route.ts - Real-time churn prediction API
```typescript
// POST /api/churn/predict - Real-time churn risk scoring
// Body: { supplierId, features?, explainability? }
// Response: { churnRisk, confidence, riskFactors, interventionRecommendations }

interface ChurnPredictionRequest {
  supplierId: string;
  features?: SupplierFeatures;
  explainability?: boolean;
  contextualFactors?: WeddingSeasonContext;
}

interface ChurnPredictionResponse {
  supplierId: string;
  churnRisk: number; // 0-1 probability
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  riskFactors: ChurnRiskFactor[];
  interventionRecommendations: RetentionIntervention[];
  predictionTimestamp: string;
}
```

#### 3. RetentionCampaignAutomator.ts - Automated retention workflows
```typescript
export class RetentionCampaignAutomator {
  async triggerRetentionCampaign(
    churnRisk: ChurnRiskScore,
    campaignConfig: RetentionCampaignConfig
  ): Promise<CampaignExecutionResult> {
    // Select appropriate retention campaign based on risk profile
    // Execute multi-channel campaign delivery
    // Track campaign performance and engagement
  }
  
  async optimizeCampaignTiming(
    supplierId: string,
    campaignType: RetentionCampaignType
  ): Promise<OptimalCampaignTiming> {
    // Analyze supplier behavior patterns for optimal timing
    // Consider wedding seasonality and industry patterns
    // Calculate expected campaign effectiveness
  }
  
  private async selectRetentionStrategy(
    riskProfile: SupplierRiskProfile
  ): Promise<RetentionStrategy> {
    // Use ML models to select most effective retention strategy
    // Consider supplier segment and historical campaign performance
    // Optimize for ROI and retention probability
  }
}
```

#### 4. ChurnAnalyticsProcessor.ts - Churn insights and reporting
```typescript
export class ChurnAnalyticsProcessor {
  async generateChurnInsights(
    timeRange: TimeRange,
    segmentation?: SupplierSegmentation
  ): Promise<ChurnInsightReport> {
    // Analyze churn patterns across supplier segments
    // Generate actionable insights for retention strategy
    // Identify high-impact risk factors and trends
  }
  
  async calculateRetentionROI(
    campaignId: string,
    analysisWindow: number
  ): Promise<RetentionROIAnalysis> {
    // Calculate ROI for retention campaigns
    // Compare retention costs vs. supplier lifetime value
    // Generate recommendations for campaign optimization
  }
  
  private async detectChurnPatterns(
    historicalData: SupplierChurnHistory
  ): Promise<ChurnPattern[]> {
    // Use ML models to detect emerging churn patterns
    // Identify seasonal and market-driven churn factors
    // Generate early warning signals for proactive intervention
  }
}
```

## 📋 DATABASE SCHEMA IMPLEMENTATION

### MUST CREATE MIGRATION:
```sql
-- From WS-182 technical specification
CREATE TABLE IF NOT EXISTS supplier_churn_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES user_profiles(id),
  churn_risk_score DECIMAL(5,4) CHECK (churn_risk_score >= 0 AND churn_risk_score <= 1),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score DECIMAL(5,4),
  risk_factors JSONB,
  prediction_model_version TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Retention campaigns and performance tracking
CREATE TABLE IF NOT EXISTS retention_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES user_profiles(id),
  campaign_type TEXT CHECK (campaign_type IN ('email', 'sms', 'discount', 'call', 'training')),
  trigger_churn_score DECIMAL(5,4),
  campaign_status TEXT CHECK (campaign_status IN ('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'converted')),
  campaign_sent_at TIMESTAMPTZ,
  campaign_response_at TIMESTAMPTZ,
  retention_success BOOLEAN,
  campaign_cost DECIMAL(10,2),
  lifetime_value_impact DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature vectors for ML model training
CREATE TABLE IF NOT EXISTS supplier_feature_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES user_profiles(id),
  feature_vector JSONB NOT NULL,
  feature_extraction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_churn_risk_supplier_calculated ON supplier_churn_risk_scores(supplier_id, calculated_at);
CREATE INDEX idx_retention_campaigns_supplier_status ON retention_campaigns(supplier_id, campaign_status);
CREATE INDEX idx_feature_vectors_supplier_date ON supplier_feature_vectors(supplier_id, feature_extraction_date);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/lib/ml/churn-prediction-engine.ts` - Core ML prediction engine
- [ ] `/src/lib/ml/retention-campaign-automator.ts` - Automated retention workflows
- [ ] `/src/lib/ml/churn-analytics-processor.ts` - Analytics and insights
- [ ] `/src/app/api/churn/predict/route.ts` - Real-time prediction API
- [ ] `/src/app/api/churn/risk-scores/route.ts` - Batch prediction API
- [ ] `/src/app/api/retention/campaigns/route.ts` - Campaign management API
- [ ] `/supabase/migrations/WS-182-churn-intelligence.sql` - Database schema
- [ ] `/__tests__/lib/ml/churn-prediction-engine.test.ts` - ML testing suite

### MUST IMPLEMENT:
- [ ] Multi-model ensemble churn prediction with 85%+ accuracy
- [ ] Real-time churn risk scoring with sub-100ms response times
- [ ] Automated retention campaign triggers based on risk thresholds
- [ ] Feature engineering pipeline for supplier behavioral data
- [ ] A/B testing framework for churn prediction model comparison
- [ ] ROI calculation and optimization for retention campaigns
- [ ] Continuous model training and performance monitoring
- [ ] Explainable AI for transparent churn risk factor analysis

## 💾 WHERE TO SAVE YOUR WORK
- ML Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ml/`
- APIs: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/churn/`
- Models: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/models/churn/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/ml/`

## 🏁 COMPLETION CHECKLIST
- [ ] ML churn prediction engine implemented with ensemble modeling
- [ ] Real-time churn risk scoring API functional with sub-100ms response
- [ ] Automated retention campaign system deployed and tested
- [ ] Feature engineering pipeline working with supplier behavioral data
- [ ] Database schema created and optimized for ML operations
- [ ] A/B testing framework implemented for model comparison
- [ ] ROI calculation system functional for retention campaign optimization
- [ ] Continuous model training pipeline established

**WEDDING CONTEXT REMINDER:** Your churn prediction engine helps WedSync identify when wedding photographers are at risk of leaving the platform - perhaps due to declining bookings, poor client reviews, or seasonal business challenges. Early intervention through your system can save valuable supplier relationships, ensuring couples continue to have access to quality wedding professionals for their special day.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**