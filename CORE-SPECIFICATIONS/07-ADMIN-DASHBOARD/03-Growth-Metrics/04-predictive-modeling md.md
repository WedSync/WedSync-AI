# 04-predictive-modeling.md

# WedSync/WedMe Predictive Analytics System

## Machine Learning Infrastructure for Wedding Industry SaaS

## Executive Overview

As a wedding photographer building WedSync/WedMe, predictive analytics serves as the intelligence layer that transforms raw data into actionable insights. This system predicts supplier behavior, forecasts revenue, identifies at-risk accounts, and optimizes viral growth loops - all critical for scaling a two-sided marketplace in the wedding industry.

## System Architecture

### Core Predictive Models

```tsx
interface WedSyncPredictiveSystem {
  // Revenue Intelligence
  revenueModels: {
    mrrForecast: MRRPredictionModel
    ltv: LifetimeValueModel
    churn: ChurnPredictionModel
    expansion: ExpansionRevenueModel
  }

  // Growth Intelligence
  growthModels: {
    viral: ViralCoefficientPredictor
    acquisition: AcquisitionForecastModel
    activation: ActivationRatePredictor
    retention: RetentionCurveModel
  }

  // Marketplace Dynamics
  marketplaceModels: {
    supplierDemand: SupplierDemandModel
    coupleBehavior: CoupleBehaviorModel
    networkEffects: NetworkEffectModel
    seasonality: WeddingSeasonalityModel
  }

  // Operational Intelligence
  operationalModels: {
    support: SupportVolumePredictor
    infrastructure: CapacityPlanningModel
    costs: CostForecastModel
    efficiency: AutomationROIModel
  }
}

```

## 1. Churn Prediction Engine

### Advanced Churn Model with Wedding-Specific Features

```tsx
class WeddingSupplierChurnPredictor {
  private readonly CHURN_SIGNALS = {
    // Engagement metrics
    lastLogin: { weight: 0.25, threshold: 14 }, // days
    formsCreated: { weight: 0.15, threshold: 2 },
    clientsActive: { weight: 0.20, threshold: 5 },

    // Wedding-specific signals
    seasonalityFactor: { weight: 0.10 }, // Off-season risk
    vendorTypeRisk: { weight: 0.08 }, // Some vendors churn more
    competitorMentions: { weight: 0.05 }, // Support ticket analysis

    // Financial signals
    paymentFailures: { weight: 0.10, threshold: 1 },
    downgradeBehavior: { weight: 0.07, threshold: 1 }
  }

  async predictChurn(supplierId: string): Promise<ChurnPrediction> {
    // Gather comprehensive features
    const features = await this.extractSupplierFeatures(supplierId)

    // Apply wedding seasonality adjustments
    const seasonAdjusted = this.adjustForWeddingSeason(features)

    // Run ensemble prediction
    const predictions = await Promise.all([
      this.logisticRegression(seasonAdjusted),
      this.randomForest(seasonAdjusted),
      this.gradientBoosting(seasonAdjusted),
      this.neuralNetwork(seasonAdjusted)
    ])

    // Weighted ensemble
    const ensemblePrediction = this.weightedEnsemble(predictions)

    // Generate intervention recommendations
    const interventions = this.generateInterventions(
      ensemblePrediction,
      features
    )

    return {
      supplierId,
      churnProbability: ensemblePrediction.probability,
      churnDate: ensemblePrediction.estimatedDate,
      confidence: ensemblePrediction.confidence,
      riskLevel: this.getRiskLevel(ensemblePrediction.probability),
      monthlyRevenueLoss: features.mrr,
      lifetimeValueLoss: features.ltv,
      interventions,
      factors: this.explainPrediction(features, ensemblePrediction)
    }
  }

  private async extractSupplierFeatures(supplierId: string) {
    const query = `
      WITH supplier_metrics AS (
        SELECT
          s.id,
          s.vendor_type,
          s.created_at,
          s.subscription_tier,
          s.mrr,

          -- Engagement metrics
          DATE_PART('day', NOW() - s.last_login) as days_since_login,
          COUNT(DISTINCT f.id) as total_forms,
          COUNT(DISTINCT f.id) FILTER (WHERE f.created_at > NOW() - INTERVAL '30 days') as recent_forms,
          COUNT(DISTINCT c.id) as total_clients,
          COUNT(DISTINCT c.id) FILTER (WHERE c.last_active > NOW() - INTERVAL '7 days') as active_clients,

          -- Viral metrics (critical for growth)
          COUNT(DISTINCT ci.id) as couples_invited,
          COUNT(DISTINCT ci.id) FILTER (WHERE ci.activated = true) as couples_activated,

          -- Usage patterns
          AVG(session_duration) as avg_session_duration,
          COUNT(DISTINCT DATE(activity_date)) as active_days_last_month,

          -- Support signals
          COUNT(DISTINCT t.id) FILTER (WHERE t.sentiment = 'negative') as negative_tickets,
          MAX(t.created_at) as last_support_contact,

          -- Payment history
          COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'failed') as failed_payments,
          MAX(p.failed_at) as last_payment_failure,

          -- Competitor mentions in support tickets
          COUNT(DISTINCT t.id) FILTER (WHERE
            t.content ILIKE '%honeybook%' OR
            t.content ILIKE '%dubsado%' OR
            t.content ILIKE '%17hats%'
          ) as competitor_mentions

        FROM suppliers s
        LEFT JOIN forms f ON s.id = f.supplier_id
        LEFT JOIN clients c ON s.id = c.supplier_id
        LEFT JOIN couple_invites ci ON s.id = ci.supplier_id
        LEFT JOIN activity_logs al ON s.id = al.user_id
        LEFT JOIN support_tickets t ON s.id = t.user_id
        LEFT JOIN payments p ON s.id = p.user_id
        WHERE s.id = $1
        GROUP BY s.id, s.vendor_type, s.created_at, s.subscription_tier, s.mrr
      )
      SELECT * FROM supplier_metrics;
    `

    return await db.query(query, [supplierId])
  }

  private generateInterventions(
    prediction: ChurnPrediction,
    features: SupplierFeatures
  ): Intervention[] {
    const interventions = []

    if (prediction.probability > 0.7) {
      // High risk - immediate action
      interventions.push({
        type: 'immediate_outreach',
        action: 'Schedule founder call within 24 hours',
        priority: 'critical',
        script: this.generateOutreachScript(features),
        incentive: this.calculateRetentionOffer(features.mrr)
      })
    }

    if (features.days_since_login > 14) {
      interventions.push({
        type: 'engagement_campaign',
        action: 'Send re-engagement email sequence',
        priority: 'high',
        content: this.getReengagementContent(features.vendor_type)
      })
    }

    if (features.active_clients < 5) {
      interventions.push({
        type: 'growth_assistance',
        action: 'Offer free onboarding call',
        priority: 'medium',
        focus: 'Help import existing clients and set up first form'
      })
    }

    if (features.couples_activated / features.couples_invited < 0.2) {
      interventions.push({
        type: 'viral_optimization',
        action: 'Improve couple invitation flow',
        priority: 'medium',
        suggestion: 'Add incentive for couples to join'
      })
    }

    return interventions
  }
}

```

## 2. Revenue Forecasting System

### MRR Prediction with Cohort Analysis

```tsx
class RevenueForecaster {
  async forecastMRR(horizonMonths: number): Promise<RevenueForecast> {
    // Get comprehensive historical data
    const historicalData = await this.getHistoricalMetrics()

    // Separate by revenue streams
    const revenueStreams = {
      newBusiness: await this.forecastNewBusiness(historicalData),
      expansion: await this.forecastExpansion(historicalData),
      contraction: await this.forecastContraction(historicalData),
      churn: await this.forecastChurn(historicalData),
      reactivation: await this.forecastReactivation(historicalData)
    }

    // Apply wedding seasonality
    const seasonallyAdjusted = this.applyWeddingSeasonality(
      revenueStreams,
      horizonMonths
    )

    // Generate scenarios
    const scenarios = this.generateScenarios(seasonallyAdjusted)

    return {
      baseline: this.calculateBaseline(seasonallyAdjusted),
      optimistic: scenarios.optimistic,
      pessimistic: scenarios.pessimistic,
      probabilistic: this.monteCarloSimulation(seasonallyAdjusted, 1000),
      keyDrivers: this.identifyKeyDrivers(seasonallyAdjusted),
      recommendations: this.generateRevenueRecommendations(seasonallyAdjusted)
    }
  }

  private applyWeddingSeasonality(
    streams: RevenueStreams,
    months: number
  ): AdjustedStreams {
    const seasonalFactors = {
      'January': 1.4,    // New Year planning surge
      'February': 1.2,   // Valentine's boost
      'March': 1.1,      // Spring planning begins
      'April': 1.3,      // Peak planning season
      'May': 1.5,        // Wedding season starts
      'June': 1.6,       // Peak wedding month
      'July': 1.5,       // High season continues
      'August': 1.4,     // Late summer weddings
      'September': 1.5,  // Fall wedding peak
      'October': 1.3,    // Fall continues
      'November': 0.8,   // Slowdown begins
      'December': 0.6    // Holiday slowdown
    }

    return streams.map(stream => ({
      ...stream,
      adjusted: stream.base * seasonalFactors[stream.month]
    }))
  }

  private async forecastNewBusiness(historical: HistoricalData) {
    // Viral growth component
    const viralGrowth = await this.calculateViralGrowth(historical)

    // Paid acquisition component
    const paidGrowth = await this.calculatePaidGrowth(historical)

    // Organic growth component
    const organicGrowth = await this.calculateOrganicGrowth(historical)

    return {
      total: viralGrowth + paidGrowth + organicGrowth,
      breakdown: { viral: viralGrowth, paid: paidGrowth, organic: organicGrowth },
      confidence: this.calculateConfidence(historical.volatility)
    }
  }
}

```

## 3. Viral Growth Predictor

### Network Effects & Viral Coefficient Forecasting

```tsx
class ViralGrowthPredictor {
  async predictViralCoefficient(
    timeframe: number = 30
  ): Promise<ViralPrediction> {
    // Get current viral metrics
    const currentMetrics = await this.getCurrentViralMetrics()

    // Analyze historical trends
    const trends = await this.analyzeViralTrends()

    // Factor in network effects
    const networkEffects = await this.calculateNetworkEffects()

    // Predict future coefficient
    const prediction = await this.runViralPrediction({
      current: currentMetrics,
      trends,
      networkEffects
    })

    return {
      currentK: currentMetrics.kFactor,
      predictedK: prediction.kFactor,
      breakdown: {
        supplierToCouple: prediction.s2c,
        coupleToSupplier: prediction.c2s
      },
      growthMultiplier: Math.pow(1 + prediction.kFactor, timeframe / 30),
      viralScore: this.calculateViralScore(prediction),
      optimizationOpportunities: this.identifyOptimizations(prediction),
      criticalThresholds: {
        viral: prediction.kFactor > 1.0,
        sustainable: prediction.kFactor > 0.7,
        declining: prediction.kFactor < 0.5
      }
    }
  }

  private async calculateNetworkEffects() {
    const query = `
      WITH network_metrics AS (
        SELECT
          -- Density metrics
          COUNT(DISTINCT s.id) as total_suppliers,
          COUNT(DISTINCT c.id) as total_couples,
          COUNT(DISTINCT cs.id) as connections,

          -- Growth metrics
          COUNT(DISTINCT s.id) FILTER (WHERE s.created_at > NOW() - INTERVAL '30 days') as new_suppliers,
          COUNT(DISTINCT c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '30 days') as new_couples,

          -- Engagement metrics
          AVG(suppliers_per_couple) as avg_suppliers_per_couple,
          AVG(couples_per_supplier) as avg_couples_per_supplier,

          -- Value metrics
          AVG(CASE WHEN suppliers_per_couple > 3 THEN 1 ELSE 0 END) as high_value_couples,
          AVG(CASE WHEN couples_per_supplier > 10 THEN 1 ELSE 0 END) as high_value_suppliers

        FROM suppliers s
        FULL OUTER JOIN couples c ON true
        LEFT JOIN couple_suppliers cs ON s.id = cs.supplier_id OR c.id = cs.couple_id
      )
      SELECT
        *,
        connections::FLOAT / (total_suppliers * total_couples) as network_density,
        new_suppliers::FLOAT / total_suppliers as supplier_growth_rate,
        new_couples::FLOAT / total_couples as couple_growth_rate
      FROM network_metrics;
    `

    const metrics = await db.query(query)

    // Calculate Metcalfe's Law value (n²)
    const metcalfeValue = Math.pow(metrics.total_suppliers + metrics.total_couples, 2)

    // Calculate Reed's Law value (2^n) - capped for practical purposes
    const reedsValue = Math.min(
      Math.pow(2, Math.log2(metrics.total_suppliers + metrics.total_couples)),
      metcalfeValue * 10
    )

    return {
      density: metrics.network_density,
      metcalfeValue,
      reedsValue,
      growthRate: (metrics.supplier_growth_rate + metrics.couple_growth_rate) / 2,
      qualityScore: (metrics.high_value_couples + metrics.high_value_suppliers) / 2
    }
  }
}

```

## 4. Demand Forecasting

### Wedding Industry Demand Predictor

```tsx
class WeddingDemandForecaster {
  async forecastSupplierDemand(
    vendorType: VendorType,
    region?: string
  ): Promise<DemandForecast> {
    // External data sources
    const marketData = await this.getMarketData(vendorType, region)

    // Internal platform data
    const platformData = await this.getPlatformDemand(vendorType)

    // Wedding industry trends
    const industryTrends = await this.getIndustryTrends()

    // Build comprehensive forecast
    const forecast = await this.buildDemandModel({
      market: marketData,
      platform: platformData,
      industry: industryTrends,
      seasonality: this.getWeddingSeasonality(vendorType)
    })

    return {
      vendorType,
      currentDemand: forecast.current,
      projectedDemand: forecast.projected,
      growthRate: forecast.growthRate,
      saturation: this.calculateMarketSaturation(forecast),
      opportunities: this.identifyOpportunities(forecast),
      threats: this.identifyThreats(forecast),
      recommendations: this.generateDemandRecommendations(forecast)
    }
  }

  private getWeddingSeasonality(vendorType: VendorType) {
    // Different vendor types have different seasonal patterns
    const patterns = {
      photographer: {
        peak: ['May', 'June', 'September', 'October'],
        moderate: ['April', 'July', 'August'],
        low: ['November', 'December', 'January', 'February', 'March']
      },
      venue: {
        peak: ['June', 'July', 'August', 'September'],
        moderate: ['May', 'October'],
        low: ['November', 'December', 'January', 'February', 'March', 'April']
      },
      planner: {
        peak: ['January', 'February', 'March'], // Planning season
        moderate: ['April', 'May', 'September', 'October', 'November'],
        low: ['June', 'July', 'August', 'December'] // Busy executing
      },
      florist: {
        peak: ['May', 'June', 'July', 'August', 'September'],
        moderate: ['April', 'October'],
        low: ['November', 'December', 'January', 'February', 'March']
      }
    }

    return patterns[vendorType] || patterns.photographer
  }

  private async identifyOpportunities(forecast: Forecast) {
    const opportunities = []

    if (forecast.growthRate > 0.2) {
      opportunities.push({
        type: 'high_growth',
        action: 'Increase acquisition spend',
        impact: 'high',
        timeframe: 'immediate'
      })
    }

    if (forecast.saturation < 0.3) {
      opportunities.push({
        type: 'untapped_market',
        action: 'Geographic expansion',
        impact: 'medium',
        timeframe: '3-6 months'
      })
    }

    if (forecast.seasonalPeak.within(60)) {
      opportunities.push({
        type: 'seasonal_surge',
        action: 'Prepare capacity and campaigns',
        impact: 'high',
        timeframe: '1-2 months'
      })
    }

    return opportunities
  }
}

```

## 5. LTV Prediction Model

### Lifetime Value Calculator with Cohort Analysis

```tsx
class LTVPredictor {
  async predictLTV(
    supplierId: string,
    confidenceLevel: number = 0.95
  ): Promise<LTVPrediction> {
    // Get supplier characteristics
    const supplier = await this.getSupplierProfile(supplierId)

    // Find similar cohort
    const cohort = await this.findSimilarCohort(supplier)

    // Calculate base LTV
    const baseLTV = await this.calculateBaseLTV(supplier, cohort)

    // Apply modifiers
    const modifiers = await this.calculateModifiers(supplier)

    // Generate confidence interval
    const interval = this.calculateConfidenceInterval(
      baseLTV,
      cohort.variance,
      confidenceLevel
    )

    return {
      supplierId,
      predictedLTV: baseLTV * modifiers.total,
      confidenceInterval: interval,
      timeToValue: this.predictTimeToValue(supplier),
      expansionPotential: this.calculateExpansionPotential(supplier),
      retentionCurve: this.generateRetentionCurve(supplier, cohort),
      keyDrivers: this.identifyLTVDrivers(supplier, modifiers),
      optimizations: this.suggestLTVOptimizations(supplier)
    }
  }

  private async calculateModifiers(supplier: SupplierProfile) {
    const modifiers = {
      vendorType: this.getVendorTypeMultiplier(supplier.vendorType),
      onboarding: supplier.hadOnboardingCall ? 1.3 : 1.0,
      viralActivity: Math.min(supplier.couplesInvited / 10, 2.0),
      formUsage: Math.min(supplier.formsCreated / 5, 1.5),
      seasonality: this.getSeasonalityMultiplier(supplier.joinMonth),
      engagement: this.getEngagementMultiplier(supplier.avgSessionTime)
    }

    return {
      ...modifiers,
      total: Object.values(modifiers).reduce((a, b) => a * b, 1)
    }
  }

  private getVendorTypeMultiplier(vendorType: string) {
    const multipliers = {
      'planner': 2.3,      // Highest LTV - full service
      'photographer': 1.8,  // High LTV - ongoing relationships
      'venue': 1.6,        // Good LTV - fewer but bigger transactions
      'videographer': 1.5,
      'florist': 1.3,
      'caterer': 1.2,
      'dj': 1.0,
      'other': 1.1
    }

    return multipliers[vendorType] || 1.0
  }
}

```

## 6. Anomaly Detection

### Real-time Anomaly Detection System

```tsx
class AnomalyDetector {
  private models: Map<string, AnomalyModel> = new Map()

  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies = []

    // Revenue anomalies
    const revenueAnomalies = await this.detectRevenueAnomalies()
    anomalies.push(...revenueAnomalies)

    // Usage anomalies
    const usageAnomalies = await this.detectUsageAnomalies()
    anomalies.push(...usageAnomalies)

    // Viral growth anomalies
    const viralAnomalies = await this.detectViralAnomalies()
    anomalies.push(...viralAnomalies)

    // Support anomalies
    const supportAnomalies = await this.detectSupportAnomalies()
    anomalies.push(...supportAnomalies)

    // Prioritize and alert
    return this.prioritizeAnomalies(anomalies)
  }

  private async detectRevenueAnomalies() {
    const recentMetrics = await this.getRecentRevenueMetrics()
    const model = this.models.get('revenue')

    const anomalies = []

    // Isolation Forest for multivariate anomaly detection
    const isolationScore = model.detectAnomalies(recentMetrics)

    if (isolationScore > 0.7) {
      anomalies.push({
        type: 'revenue',
        severity: this.calculateSeverity(isolationScore),
        description: 'Unusual revenue pattern detected',
        metrics: recentMetrics,
        recommendation: await this.generateRecommendation('revenue', recentMetrics)
      })
    }

    // Specific checks
    if (recentMetrics.churnRate > recentMetrics.historicalP95) {
      anomalies.push({
        type: 'churn_spike',
        severity: 'high',
        description: `Churn rate ${recentMetrics.churnRate}% exceeds 95th percentile`,
        impact: recentMetrics.churnRate * recentMetrics.mrr,
        action: 'Initiate retention campaign immediately'
      })
    }

    return anomalies
  }

  private async detectViralAnomalies() {
    const viralMetrics = await this.getViralMetrics()

    const anomalies = []

    // Sudden drop in viral coefficient
    if (viralMetrics.kFactor < viralMetrics.movingAverage * 0.7) {
      anomalies.push({
        type: 'viral_decline',
        severity: 'critical',
        description: 'Viral coefficient dropped 30%+',
        currentK: viralMetrics.kFactor,
        expectedK: viralMetrics.movingAverage,
        diagnosis: await this.diagnoseViralIssue(viralMetrics),
        fixes: this.suggestViralFixes(viralMetrics)
      })
    }

    // Invitation rate anomaly
    if (viralMetrics.invitationRate < viralMetrics.baseline * 0.5) {
      anomalies.push({
        type: 'invitation_drop',
        severity: 'high',
        description: 'Invitation rate halved',
        analysis: await this.analyzeInvitationDrop(),
        action: 'Check for UI bugs in invitation flow'
      })
    }

    return anomalies
  }
}

```

## 7. Model Monitoring & MLOps

### Production Model Management

```tsx
class ModelMonitor {
  async monitorModelHealth(): Promise<ModelHealthReport> {
    const models = await this.getAllModels()

    const healthReports = await Promise.all(
      models.map(async (model) => {
        const metrics = await this.evaluateModel(model)
        const drift = await this.detectDataDrift(model)
        const performance = await this.checkPerformance(model)

        return {
          modelName: model.name,
          version: model.version,
          health: this.calculateHealth(metrics, drift, performance),
          metrics: {
            accuracy: metrics.accuracy,
            precision: metrics.precision,
            recall: metrics.recall,
            f1Score: metrics.f1Score,
            auc: metrics.auc
          },
          drift: {
            detected: drift.detected,
            severity: drift.severity,
            features: drift.affectedFeatures
          },
          recommendations: this.generateRecommendations(metrics, drift, performance)
        }
      })
    )

    return {
      timestamp: new Date(),
      models: healthReports,
      overallHealth: this.calculateOverallHealth(healthReports),
      alerts: this.generateAlerts(healthReports),
      retrainingNeeded: healthReports.filter(r => r.health < 0.7)
    }
  }

  private async detectDataDrift(model: Model) {
    // Kolmogorov-Smirnov test for distribution drift
    const trainingDistribution = await this.getTrainingDistribution(model)
    const currentDistribution = await this.getCurrentDistribution(model)

    const ksStatistic = this.kolmogorovSmirnovTest(
      trainingDistribution,
      currentDistribution
    )

    // Population Stability Index (PSI) for categorical features
    const psi = this.calculatePSI(trainingDistribution, currentDistribution)

    return {
      detected: ksStatistic.pValue < 0.05 || psi > 0.2,
      severity: this.calculateDriftSeverity(ksStatistic, psi),
      affectedFeatures: this.identifyDriftedFeatures(
        trainingDistribution,
        currentDistribution
      ),
      recommendation: this.recommendDriftAction(ksStatistic, psi)
    }
  }
}

```

## 8. Dashboard Integration

### Predictive Analytics Dashboard Component

```tsx
const PredictiveAnalyticsDashboard: React.FC = () => {
  const [timeHorizon, setTimeHorizon] = useState(90) // days
  const predictions = usePredictions(timeHorizon)

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Revenue Forecast */}
      <div className="col-span-8">
        <RevenueForecastChart
          historical={predictions.revenue.historical}
          forecast={predictions.revenue.forecast}
          scenarios={predictions.revenue.scenarios}
          confidence={predictions.revenue.confidence}
        />
      </div>

      {/* Churn Risk Matrix */}
      <div className="col-span-4">
        <ChurnRiskMatrix
          suppliers={predictions.churn.atRisk}
          totalMRRAtRisk={predictions.churn.mrrAtRisk}
          interventions={predictions.churn.suggestedActions}
        />
      </div>

      {/* Viral Growth Predictor */}
      <div className="col-span-6">
        <ViralGrowthPredictor
          currentK={predictions.viral.current}
          predictedK={predictions.viral.predicted}
          optimizations={predictions.viral.optimizations}
        />
      </div>

      {/* LTV Distribution */}
      <div className="col-span-6">
        <LTVDistribution
          cohorts={predictions.ltv.cohorts}
          segments={predictions.ltv.segments}
          expansionOpportunities={predictions.ltv.expansion}
        />
      </div>

      {/* Anomaly Alerts */}
      <div className="col-span-12">
        <AnomalyAlerts
          anomalies={predictions.anomalies}
          autoActions={predictions.anomalies.filter(a => a.autoAction)}
        />
      </div>

      {/* Model Performance */}
      <div className="col-span-4">
        <ModelPerformanceGrid
          models={predictions.modelHealth}
          retrainingSchedule={predictions.retraining}
        />
      </div>

      {/* Demand Forecast */}
      <div className="col-span-8">
        <DemandForecastByVendor
          forecasts={predictions.demand}
          marketSaturation={predictions.marketAnalysis}
        />
      </div>
    </div>
  )
}

```

## 9. Database Schema

### Comprehensive ML Database Structure

```sql
-- Feature store for ML
CREATE TABLE ml_feature_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'supplier', 'couple', 'transaction'
  entity_id UUID NOT NULL,
  feature_set TEXT NOT NULL,
  features JSONB NOT NULL,
  feature_version INTEGER DEFAULT 1,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(entity_type, entity_id, feature_set, feature_version)
);

CREATE INDEX idx_feature_store_lookup ON ml_feature_store(entity_type, entity_id, feature_set);
CREATE INDEX idx_feature_store_expiry ON ml_feature_store(expires_at) WHERE expires_at IS NOT NULL;

-- Model registry
CREATE TABLE ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'churn', 'ltv', 'viral', 'revenue'
  version TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  hyperparameters JSONB,
  training_metrics JSONB,
  validation_metrics JSONB,
  feature_importance JSONB,
  training_data_snapshot JSONB,
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  status TEXT DEFAULT 'training', -- 'training', 'validating', 'staged', 'production', 'retired'
  UNIQUE(model_name, version)
);

-- Predictions log
CREATE TABLE ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ml_models(id),
  prediction_type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  prediction JSONB NOT NULL,
  confidence DECIMAL(3,2),
  features_used JSONB,
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  prediction_for_date DATE,
  actual_outcome JSONB,
  outcome_recorded_at TIMESTAMPTZ
);

CREATE INDEX idx_predictions_model ON ml_predictions(model_id, predicted_at DESC);
CREATE INDEX idx_predictions_entity ON ml_predictions(entity_id, prediction_type);
CREATE INDEX idx_predictions_evaluation ON ml_predictions(prediction_for_date, outcome_recorded_at)
  WHERE actual_outcome IS NOT NULL;

-- A/B test results for ML
CREATE TABLE ml_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name TEXT NOT NULL,
  model_a_id UUID REFERENCES ml_models(id),
  model_b_id UUID REFERENCES ml_models(id),
  metric_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  sample_size INTEGER,
  model_a_performance JSONB,
  model_b_performance JSONB,
  statistical_significance DECIMAL(3,2),
  winner TEXT,
  decision TEXT,
  notes TEXT
);

-- Anomaly detection log
CREATE TABLE ml_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metrics JSONB NOT NULL,
  description TEXT,
  auto_action_taken BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  resolved_at TIMESTAMPTZ,
  false_positive BOOLEAN,
  impact_assessment JSONB
);

CREATE INDEX idx_anomalies_unresolved ON ml_anomalies(severity, detected_at DESC)
  WHERE resolved_at IS NULL;

-- Model performance tracking
CREATE TABLE ml_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ml_models(id),
  evaluation_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL,
  sample_size INTEGER,
  data_drift_detected BOOLEAN DEFAULT FALSE,
  drift_severity DECIMAL(3,2),
  performance_degradation DECIMAL(3,2),
  UNIQUE(model_id, evaluation_date, metric_type)
);

CREATE INDEX idx_model_performance ON ml_model_performance(model_id, evaluation_date DESC);

```

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- Set up feature store and data pipelines
- Implement basic churn prediction model
- Create model registry and versioning
- Build initial dashboard components

### Phase 2: Revenue Intelligence (Week 3-4)

- Deploy MRR forecasting model
- Implement LTV prediction
- Add cohort analysis
- Create revenue optimization recommendations

### Phase 3: Growth Analytics (Week 5-6)

- Build viral coefficient predictor
- Implement demand forecasting
- Add network effect calculations
- Create growth optimization engine

### Phase 4: Advanced Features (Week 7-8)

- Deploy anomaly detection
- Implement real-time predictions
- Add model monitoring and drift detection
- Create automated retraining pipelines

### Phase 5: Optimization (Week 9+)

- A/B testing framework for models
- Advanced ensemble methods
- AutoML integration
- Real-time feature engineering

## Success Metrics

### Model Performance KPIs

- Churn prediction accuracy: >85%
- Revenue forecast accuracy: ±10% at 30 days
- LTV prediction accuracy: ±15% at 6 months
- Viral coefficient prediction: ±0.1 accuracy
- Anomaly detection precision: >90%
- False positive rate: <5%

### Business Impact Metrics

- Churn reduction: 20% through proactive interventions
- Revenue growth: 15% through optimization
- CAC reduction: 25% through better targeting
- Support ticket reduction: 30% through anomaly prevention
- Decision speed improvement: 10x faster insights

This comprehensive predictive analytics system will transform WedSync/WedMe from a reactive platform to a proactive, intelligence-driven marketplace that anticipates supplier needs, optimizes growth loops, and maximizes revenue potential in the wedding industry.