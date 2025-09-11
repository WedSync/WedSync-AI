/**
 * Comprehensive type definitions for WS-195 Business Metrics Dashboard validation
 * Ensures type safety across all business intelligence validation systems
 */

export interface ValidationReport {
  timestamp: string;
  overallValid: boolean;
  validations: MetricValidation[];
  businessCriticalIssues: MetricValidation[];
  executiveImpact: string;
  recommendedActions: string[];
  investorReadiness: InvestorReadinessAssessment;
  weddingSeasonContext: WeddingSeasonContext;
}

export interface MetricValidation {
  metric: string;
  valid: boolean;
  accuracy?: number;
  severity: 'normal' | 'medium' | 'high' | 'critical';
  error?: string;
  details: Record<string, any>;
}

export interface InvestorReadinessAssessment {
  ready: boolean;
  confidence: number;
  blockers: string[];
}

export interface WeddingSeasonContext {
  currentSeason: 'peak' | 'off-season' | 'transition';
  seasonStart: string;
  seasonEnd: string;
  expectedMetricMultipliers: {
    mrr: number;
    churn: number;
    viral: number;
    engagement: number;
  };
  industryBenchmarks: {
    peakSeasonGrowth: number;
    offSeasonDecline: number;
    seasonalChurnVariation: number;
  };
}

export interface BusinessMetricsData {
  mrr: MRRMetrics;
  churn: ChurnMetrics;
  viral: ViralMetrics;
  seasonal: SeasonalMetrics;
  integration: IntegrationMetrics;
  mobile: MobileMetrics;
}

export interface MRRMetrics {
  currentMRR: number;
  previousMRR: number;
  growth: number;
  growthRate: number;
  seasonalMultiplier?: number;
  supplierBreakdown: {
    photographers: number;
    venues: number;
    florists: number;
    caterers: number;
    other: number;
  };
  tierBreakdown: {
    starter: number;
    professional: number;
    scale: number;
    enterprise: number;
  };
  forecastedMRR: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ChurnMetrics {
  overallChurnRate: number;
  previousChurnRate: number;
  churnTrend: 'improving' | 'stable' | 'deteriorating';
  seasonalBreakdown?: {
    peak: number;
    offSeason: number;
  };
  segmentedChurn: {
    bySupplierType: Record<string, number>;
    byTier: Record<string, number>;
    byTenure: Record<string, number>;
  };
  churnReasons: Array<{
    reason: string;
    percentage: number;
    recoverable: boolean;
  }>;
  predictiveChurn: {
    nextMonthRisk: number;
    highRiskSegments: string[];
    interventionOpportunities: number;
  };
}

export interface ViralMetrics {
  overallCoefficient: number;
  previousCoefficient: number;
  trend: 'improving' | 'stable' | 'declining';
  sourceBreakdown: Record<string, {
    coefficient: number;
    conversionRate: number;
    volume: number;
  }>;
  seasonalBreakdown?: {
    peak: number;
    offSeason: number;
  };
  weddingIndustryFactors: {
    networkEffectStrength: number;
    professionalReferralRate: number;
    coupleRecommendationRate: number;
  };
  predictiveMetrics: {
    projectedGrowth: number;
    sustainabilityScore: number;
    organicGrowthPotential: number;
  };
}

export interface SeasonalMetrics {
  currentSeason: 'peak' | 'off-season' | 'transition';
  seasonalMultipliers: {
    activity: number;
    revenue: number;
    engagement: number;
    churn: number;
  };
  yearOverYearComparison: {
    revenue: number;
    userGrowth: number;
    engagement: number;
  };
  seasonalForecasting: {
    nextSeasonProjection: number;
    confidenceLevel: number;
    keyFactors: string[];
  };
}

export interface IntegrationMetrics {
  externalSyncAccuracy: number;
  apiResponseTimes: Record<string, number>;
  integrationHealth: Record<string, {
    status: 'healthy' | 'degraded' | 'failing';
    uptime: number;
    errorRate: number;
    lastSync: string;
  }>;
  dataConsistency: {
    crmSync: number;
    paymentSync: number;
    calendarSync: number;
    emailSync: number;
  };
  integrationUsage: Record<string, {
    activeUsers: number;
    syncFrequency: number;
    errorCount: number;
  }>;
}

export interface MobileMetrics {
  mobileUsagePercentage: number;
  mobilePerformance: {
    loadTime: number;
    responsiveness: number;
    crashRate: number;
    batteryUsage: number;
  };
  mobileFeatureAdoption: Record<string, number>;
  mobileSatisfactionScore: number;
  mobileChurnRate: number;
  crossPlatformConsistency: {
    dataAccuracy: number;
    featureParity: number;
    syncReliability: number;
  };
}

export interface ExecutiveDashboardData {
  mrr: number;
  churn: number;
  viral: number;
  seasonal: {
    currentSeason: string;
    multiplier: number;
    forecast: number;
  };
  investor: {
    ltv: number;
    cac: number;
    paybackPeriod: number;
    unitEconomics: Record<string, number>;
  };
  competitive: {
    marketShare: number;
    competitivePosition: string;
    differentiators: string[];
  };
  segmentation: {
    suppliers: Record<string, {
      count: number;
      revenue: number;
      growth: number;
    }>;
  };
  performance: {
    loadTime: number;
    availability: number;
    errorRate: number;
  };
}

export interface TestSubscriptionData {
  id: string;
  supplierType: 'photographer' | 'venue' | 'florist' | 'caterer' | 'other';
  tier: 'starter' | 'professional' | 'scale' | 'enterprise';
  monthlyValue: number;
  annualValue: number;
  startDate: string;
  status: 'active' | 'cancelled' | 'paused';
  seasonalPattern: {
    peakMultiplier: number;
    offSeasonMultiplier: number;
  };
}

export interface TestChurnData {
  supplierId: string;
  supplierType: string;
  tier: string;
  churnDate: string;
  churnReason: string;
  monthsActive: number;
  lifetimeValue: number;
  reactivationProbability: number;
  seasonalContext: 'peak' | 'off-season';
  expectedRate: number;
}

export interface TestReferralData {
  referrerId: string;
  refereeId: string;
  source: string;
  conversionRate: number;
  coefficient: number;
  seasonalMultiplier: number;
  weddingNetworkType: 'professional' | 'venue' | 'couple' | 'directory';
}

export interface PerformanceMetrics {
  loadTime: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  acceptable: boolean;
}

export interface WeddingSupplierSubscriptionConfig {
  photographersCount: number;
  venuesCount: number;
  floristsCount: number;
  caterersCount: number;
  seasonalMix: boolean;
  tierDistribution: {
    starter: number;
    professional: number;
    scale: number;
    enterprise: number;
  };
}

export interface ChurnScenarioConfig {
  peakSeasonChurn: number;
  offSeasonChurn: number;
  supplierTypes: string[];
  timeRange: string;
  includeReactivations: boolean;
}

export interface ReferralScenarioConfig {
  referralSources: string[];
  conversionRates: Record<string, number>;
  seasonalMultipliers: {
    peak: number;
    offSeason: number;
  };
}

// Business Intelligence Validation Configuration
export interface ValidationConfig {
  tolerances: {
    mrr: number;        // Acceptable MRR calculation variance
    churn: number;      // Acceptable churn rate variance  
    viral: number;      // Acceptable viral coefficient variance
    performance: number; // Acceptable performance degradation
  };
  thresholds: {
    investorGrade: number;    // Minimum accuracy for investor presentations
    executiveGrade: number;   // Minimum accuracy for executive dashboards
    operationalGrade: number; // Minimum accuracy for daily operations
  };
  seasonalAdjustments: {
    enabled: boolean;
    peakSeasonMonths: number[];
    offSeasonMonths: number[];
    transitionPeriods: Array<{
      start: number;
      end: number;
      multiplier: number;
    }>;
  };
}

// Executive Reporting Types
export interface ExecutiveReport {
  period: string;
  summary: {
    mrr: string;
    churn: string;
    viral: string;
    seasonal: string;
  };
  keyInsights: string[];
  actionItems: string[];
  weddingIndustryContext: string;
  investorHighlights: string[];
}

// Multi-team coordination types
export interface TeamCoordinationMetrics {
  teamA: { // Frontend/UI Team
    dashboardAccuracy: number;
    performanceMetrics: PerformanceMetrics;
    userExperienceScore: number;
  };
  teamB: { // Backend/API Team  
    calculationAccuracy: number;
    apiPerformance: PerformanceMetrics;
    dataIntegrity: number;
  };
  teamC: { // Integration Team
    externalSyncReliability: number;
    integrationHealth: number;
    dataConsistency: number;
  };
  teamD: { // Mobile Team
    mobilePerformance: PerformanceMetrics;
    crossPlatformConsistency: number;
    mobileSatisfaction: number;
  };
  teamE: { // QA/Testing Team (This team)
    validationCoverage: number;
    testAccuracy: number;
    documentationCompleteness: number;
  };
}

export interface MultiTeamValidationResults {
  overallHealthScore: number;
  teamPerformance: TeamCoordinationMetrics;
  crossTeamIssues: Array<{
    teams: string[];
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    resolution: string;
  }>;
  coordinationRecommendations: string[];
}