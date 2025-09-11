# TEAM B - ROUND 1: WS-183 - LTV Calculations
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build multi-model LTV prediction engine with advanced statistical analysis, CAC calculation system, and financial metrics API infrastructure
**FEATURE ID:** WS-183 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about LTV prediction accuracy and financial calculation reliability for executive decision-making

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/analytics/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/analytics/ltv-prediction-engine.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/analytics/
# MUST show: "All tests passing"
```

## 📚 ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__search_for_pattern("ltv.*prediction");
await mcp__serena__search_for_pattern("financial.*calculation");
await mcp__serena__get_symbols_overview("src/lib/analytics/");
```

### B. REF MCP CURRENT DOCS
```typescript
await mcp__Ref__ref_search_documentation("Node.js statistical analysis libraries");
await mcp__Ref__ref_search_documentation("PostgreSQL financial calculations");
await mcp__Ref__ref_search_documentation("Machine learning prediction models JavaScript");
```

## 🧠 SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Multi-model LTV prediction engine requires sophisticated statistical architecture: 1) Cohort-based modeling using retention curves and revenue patterns 2) Probabilistic modeling with Bayesian inference for uncertainty quantification 3) Machine learning models trained on supplier behavioral data 4) Ensemble methodology combining predictions with confidence weighting 5) CAC attribution across channels with marketing spend analysis 6) Payback period calculations with segment-specific variables. Must achieve 80%+ accuracy for 6-month predictions.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

### 1. **ai-ml-engineer**: Advanced LTV prediction models
**Mission**: Develop sophisticated machine learning and statistical models for accurate LTV prediction
```typescript
await Task({
  subagent_type: "ai-ml-engineer",
  prompt: `Create advanced LTV prediction models for WS-183 system. Must include:
  
  1. Multi-Model LTV Prediction Architecture:
  - Cohort-based prediction using retention curves and revenue progression
  - Probabilistic modeling with Bayesian inference for uncertainty quantification
  - Gradient boosting models (XGBoost equivalent) for complex feature relationships
  - Ensemble methodology combining all models with confidence weighting
  
  2. Feature Engineering Pipeline:
  - Behavioral feature extraction from supplier activity patterns
  - Temporal feature engineering for seasonal wedding industry patterns
  - Interaction features between supplier characteristics and market conditions
  - Wedding-specific features (seasonality, supplier type, market position)
  
  3. Model Training and Validation:
  - Cross-validation with temporal splits for time-series accuracy
  - Hyperparameter optimization for prediction accuracy
  - Model drift detection and automatic retraining triggers
  - Confidence interval calculation for prediction reliability
  
  Target 80%+ accuracy within 6-month prediction windows for wedding supplier LTV.`,
  description: "LTV prediction models"
});
```

### 2. **postgresql-database-expert**: Advanced financial calculation queries
**Mission**: Design optimized database queries and procedures for complex LTV and CAC calculations
```typescript
await Task({
  subagent_type: "postgresql-database-expert",
  prompt: `Design advanced PostgreSQL queries for WS-183 LTV calculation system. Must include:
  
  1. Complex LTV Calculation Queries:
  - Historical LTV calculation with subscription revenue aggregation
  - Predictive LTV queries integrating multiple prediction models
  - Cohort-based LTV analysis with retention curve calculations
  - Segment-specific LTV queries (vendor type, plan tier, acquisition channel)
  
  2. CAC Attribution and Analysis:
  - Multi-touch attribution queries for customer acquisition costs
  - Channel-specific CAC calculation with marketing spend allocation
  - Time-decay attribution models for complex customer journeys
  - CAC trend analysis with seasonal adjustment calculations
  
  3. Financial Metrics Optimization:
  - Materialized views for frequently accessed LTV and CAC metrics
  - Stored procedures for batch LTV calculation with performance optimization
  - Indexing strategies for fast financial query performance
  - Partitioning for historical financial data scalability
  
  Design for handling millions of supplier transactions with sub-second query performance.`,
  description: "Financial calculation queries"
});
```

### 3. **api-architect**: Financial metrics and LTV APIs
**Mission**: Design comprehensive APIs for LTV calculations, CAC analysis, and financial reporting
```typescript
await Task({
  subagent_type: "api-architect",
  prompt: `Design comprehensive API architecture for WS-183 LTV calculation system. Must include:
  
  1. LTV Prediction APIs:
  - POST /api/analytics/ltv/predict - Individual supplier LTV prediction
  - GET /api/analytics/ltv/batch - Bulk LTV calculations for supplier cohorts
  - PUT /api/analytics/ltv/recalculate - Trigger LTV recalculation workflows
  - GET /api/analytics/ltv/accuracy - Model accuracy and validation metrics
  
  2. CAC Analysis APIs:
  - GET /api/analytics/cac/channels - CAC by acquisition channel
  - POST /api/analytics/cac/attribution - Multi-touch attribution analysis
  - GET /api/analytics/cac/trends - CAC trends and forecasting
  - PUT /api/analytics/cac/update-spend - Update marketing spend data
  
  3. Financial Reporting APIs:
  - GET /api/analytics/ltv-cac-ratios - LTV:CAC ratios by segment
  - GET /api/analytics/payback-periods - Payback period analysis
  - POST /api/analytics/financial-forecast - Revenue forecasting
  - GET /api/analytics/executive-summary - Executive financial dashboard
  
  Design for high-performance financial calculations with proper caching and rate limiting.`,
  description: "Financial metrics APIs"
});
```

### 4. **data-analytics-engineer**: Statistical analysis and validation
**Mission**: Implement statistical analysis framework for LTV prediction accuracy and business intelligence
```typescript
await Task({
  subagent_type: "data-analytics-engineer",
  prompt: `Implement statistical analysis framework for WS-183 LTV system. Must include:
  
  1. Statistical Validation Framework:
  - Cross-validation procedures for LTV prediction model accuracy
  - Statistical significance testing for model performance comparisons
  - Confidence interval calculation for LTV predictions
  - Bias detection and correction across supplier segments
  
  2. Business Intelligence Analytics:
  - Cohort lifetime value analysis with statistical significance
  - Customer acquisition efficiency analysis with ROI calculations
  - Payback period distribution analysis with percentile calculations
  - Revenue forecasting with uncertainty quantification
  
  3. Advanced Analytics Calculations:
  - Customer lifetime value distribution analysis
  - Churn impact modeling on LTV calculations
  - Market condition impact analysis on supplier lifetime value
  - Seasonal adjustment calculations for wedding industry patterns
  
  Ensure all statistical calculations meet academic standards for financial analysis accuracy.`,
  description: "Statistical validation"
});
```

### 5. **performance-optimization-expert**: Financial calculation optimization
**Mission**: Optimize LTV calculation performance for large-scale financial data processing
```typescript
await Task({
  subagent_type: "performance-optimization-expert",
  prompt: `Optimize performance for WS-183 LTV calculation system. Must include:
  
  1. Calculation Performance Optimization:
  - Parallel processing for bulk LTV calculations across supplier cohorts
  - Caching strategies for frequently requested LTV metrics
  - Batch processing optimization for nightly LTV recalculations
  - Memory optimization for large-scale financial data processing
  
  2. Database Performance Optimization:
  - Query optimization for complex LTV and CAC calculation queries
  - Index strategies for fast financial metric retrieval
  - Connection pooling optimization for analytics workloads
  - Materialized view management for real-time financial dashboards
  
  3. API Performance Enhancement:
  - Response caching for expensive LTV calculation endpoints
  - Streaming responses for large financial dataset exports
  - Rate limiting and throttling for computational financial operations
  - Resource allocation optimization for concurrent financial analysis
  
  Target sub-5-second response times for individual LTV predictions and sub-5-minute batch processing.`,
  description: "Financial calculation optimization"
});
```

### 6. **security-compliance-officer**: Financial data security and compliance
**Mission**: Implement security measures and compliance for sensitive financial calculation data
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security and compliance for WS-183 financial calculation system. Must include:
  
  1. Financial Data Security:
  - Encryption of sensitive LTV and revenue calculation data
  - Access control for financial metrics with role-based permissions
  - Audit logging for all financial calculations and data access
  - Secure API endpoints for executive financial dashboard access
  
  2. Compliance Requirements:
  - SOX compliance for financial reporting and calculation accuracy
  - PCI DSS compliance for payment data used in LTV calculations
  - GDPR compliance for supplier financial data processing
  - Financial data retention policies and secure archival procedures
  
  3. Executive Financial Security:
  - Multi-factor authentication for executive financial dashboard access
  - Secure session management for financial data viewing
  - IP restriction capabilities for financial calculation API access
  - Data classification and handling procedures for financial metrics
  
  Ensure financial calculation system meets highest security standards for executive decision-making.`,
  description: "Financial security compliance"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### FINANCIAL CALCULATION SECURITY:
- [ ] **Executive authentication** - Verify executive/finance team role for LTV access
- [ ] **Financial data encryption** - Encrypt all revenue and LTV calculation data
- [ ] **API authentication** - Secure all financial calculation API endpoints
- [ ] **Audit logging** - Log all LTV calculations and financial data access
- [ ] **Rate limiting** - Prevent abuse of computationally expensive calculations
- [ ] **Data classification** - Classify and handle sensitive financial metrics appropriately
- [ ] **Compliance validation** - Ensure SOX, PCI DSS compliance for financial data

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

### SPECIFIC DELIVERABLES FOR WS-183:

#### 1. LTVPredictionEngine.ts - Core multi-model LTV prediction system
```typescript
export class LTVPredictionEngine {
  async predictSupplierLTV(
    supplierId: string,
    predictionHorizon: number = 24
  ): Promise<LTVPredictionResult> {
    // Run multiple prediction models (cohort, probabilistic, ML)
    // Calculate confidence intervals and prediction reliability
    // Apply wedding industry seasonal adjustments
    // Return comprehensive LTV prediction with business insights
  }
  
  async batchPredictLTV(
    supplierIds: string[],
    segmentFilters: SegmentFilter[]
  ): Promise<BatchLTVPredictionResult> {
    // Optimize batch predictions for performance
    // Handle large supplier cohort predictions
    // Apply segment-specific model optimizations
  }
  
  private async ensembleModelPrediction(
    supplierFeatures: SupplierFeatures,
    models: PredictionModel[]
  ): Promise<EnsemblePrediction> {
    // Combine multiple model predictions with confidence weighting
    // Calculate prediction uncertainty and reliability metrics
    // Apply model-specific confidence scoring
  }
}
```

#### 2. /api/analytics/ltv/predict/route.ts - LTV prediction API
```typescript
// POST /api/analytics/ltv/predict - Individual supplier LTV prediction
// Body: { supplierId, predictionHorizon?, includeBreakdown? }
// Response: { historicalLTV, predictedLTV, totalLTV, confidence, breakdown }

interface LTVPredictionRequest {
  supplierId: string;
  predictionHorizon?: number; // months, default 24
  includeBreakdown?: boolean;
  segmentContext?: SegmentContext;
}

interface LTVPredictionResponse {
  supplierId: string;
  historicalLTV: number;
  predictedLTV: number;
  totalLTV: number;
  confidence: number; // 0-1
  paybackPeriod: number; // months
  ltvCacRatio: number;
  predictionBreakdown?: ModelBreakdown[];
  calculatedAt: string;
}
```

#### 3. CACCalculator.ts - Customer Acquisition Cost analysis engine
```typescript
export class CACCalculator {
  async calculateChannelCAC(
    channel: AcquisitionChannel,
    timeRange: DateRange
  ): Promise<ChannelCACResult> {
    // Calculate CAC by acquisition channel with multi-touch attribution
    // Include marketing spend allocation and operational costs
    // Apply time-decay attribution for complex customer journeys
  }
  
  async calculateLTVCACRatios(
    segments: SupplierSegment[]
  ): Promise<LTVCACAnalysis> {
    // Calculate LTV:CAC ratios by supplier segment
    // Include payback period analysis
    // Generate ROI insights for marketing optimization
  }
  
  private async multiTouchAttribution(
    customerJourney: CustomerTouchpoint[],
    attributionModel: 'linear' | 'time_decay' | 'position_based'
  ): Promise<AttributionResult> {
    // Apply sophisticated attribution modeling
    // Calculate weighted CAC across multiple touchpoints
    // Account for wedding industry customer journey complexity
  }
}
```

#### 4. FinancialMetricsProcessor.ts - Advanced financial calculations
```typescript
export class FinancialMetricsProcessor {
  async calculatePaybackPeriods(
    supplierSegments: SupplierSegment[]
  ): Promise<PaybackAnalysis> {
    // Calculate payback periods by supplier type and acquisition channel
    // Apply seasonal adjustments for wedding industry patterns
    // Include confidence intervals for payback predictions
  }
  
  async generateFinancialForecast(
    forecastParams: ForecastParameters
  ): Promise<FinancialForecast> {
    // Generate revenue forecasts based on LTV predictions
    // Include uncertainty quantification and scenario analysis
    // Apply market condition impact modeling
  }
  
  private async applySeasonalAdjustments(
    rawMetrics: RawFinancialMetrics,
    seasonalFactors: SeasonalFactors
  ): Promise<AdjustedFinancialMetrics> {
    // Apply wedding industry seasonality to financial calculations
    // Adjust for peak seasons (spring/fall) and low seasons (winter)
    // Account for market trends and economic conditions
  }
}
```

## 📋 DATABASE SCHEMA IMPLEMENTATION

### MUST CREATE MIGRATION:
```sql
-- From WS-183 technical specification
CREATE TABLE IF NOT EXISTS user_ltv (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id),
  historical_ltv DECIMAL(10,2) NOT NULL DEFAULT 0,
  predicted_ltv DECIMAL(10,2),
  total_ltv DECIMAL(10,2),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  months_active INTEGER,
  last_payment_date DATE,
  churn_probability DECIMAL(3,2),
  expansion_rate DECIMAL(3,2),
  cac DECIMAL(10,2),
  ltv_cac_ratio DECIMAL(5,2),
  payback_months INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT
);

-- LTV by segment analysis
CREATE TABLE IF NOT EXISTS ltv_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_type TEXT NOT NULL CHECK (segment_type IN ('vendor_type', 'plan', 'acquisition_channel')),
  segment_value TEXT NOT NULL,
  avg_ltv DECIMAL(10,2),
  median_ltv DECIMAL(10,2),
  p90_ltv DECIMAL(10,2),
  user_count INTEGER,
  avg_tenure DECIMAL(5,2),
  confidence_score DECIMAL(3,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAC tracking by channel
CREATE TABLE IF NOT EXISTS customer_acquisition_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  channel TEXT NOT NULL,
  marketing_spend DECIMAL(10,2),
  operational_spend DECIMAL(10,2),
  new_customers INTEGER,
  cac DECIMAL(10,2),
  attribution_model TEXT DEFAULT 'time_decay',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_ltv_calculated ON user_ltv(calculated_at, confidence_score);
CREATE INDEX idx_ltv_segments_type_value ON ltv_segments(segment_type, segment_value);
CREATE INDEX idx_cac_channel_period ON customer_acquisition_costs(channel, period_start);
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/lib/analytics/ltv-prediction-engine.ts` - Core multi-model prediction system
- [ ] `/src/lib/analytics/cac-calculator.ts` - Customer acquisition cost analysis
- [ ] `/src/lib/analytics/financial-metrics-processor.ts` - Advanced financial calculations
- [ ] `/src/app/api/analytics/ltv/predict/route.ts` - LTV prediction API
- [ ] `/src/app/api/analytics/ltv/batch/route.ts` - Batch LTV calculations
- [ ] `/src/app/api/analytics/cac/channels/route.ts` - CAC analysis API
- [ ] `/supabase/migrations/WS-183-ltv-calculations.sql` - Database schema
- [ ] `/__tests__/lib/analytics/ltv-prediction-engine.test.ts` - Comprehensive testing

### MUST IMPLEMENT:
- [ ] Multi-model LTV prediction achieving 80%+ accuracy within 6-month windows
- [ ] Sophisticated CAC calculation with multi-touch attribution
- [ ] Payback period analysis by supplier segment and acquisition channel
- [ ] Advanced statistical validation and confidence interval calculations
- [ ] Performance optimization for large-scale financial data processing
- [ ] Comprehensive error handling and logging for financial calculations
- [ ] Security measures for sensitive financial data access
- [ ] Database schema optimized for financial query performance

## 💾 WHERE TO SAVE YOUR WORK
- Analytics Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/analytics/`
- APIs: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/analytics/`
- Financial Models: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/models/financial/`
- Migrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/supabase/migrations/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/__tests__/lib/analytics/`

## 🏁 COMPLETION CHECKLIST
- [ ] Multi-model LTV prediction engine implemented with 80%+ accuracy validation
- [ ] CAC calculation system functional with multi-touch attribution
- [ ] Financial metrics processor deployed with advanced statistical analysis
- [ ] API endpoints secured and optimized for financial data access
- [ ] Database schema created and optimized for financial query performance
- [ ] Performance optimization validated for large-scale calculations
- [ ] Security and compliance measures implemented for financial data
- [ ] Comprehensive testing completed for prediction accuracy

**WEDDING CONTEXT REMINDER:** Your LTV prediction engine helps WedSync identify that wedding photographers acquired through referrals have an average lifetime value of $3,200 versus $2,400 from Google Ads, with payback periods of 1.2 months versus 3.1 months respectively. This sophisticated financial analysis enables data-driven marketing budget allocation that maximizes acquisition of profitable wedding suppliers who serve couples throughout their engagement journey.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**