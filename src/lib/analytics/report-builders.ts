export interface ExecutiveSummaryData {
  keyFindings: string[];
  criticalInsights: string[];
  actionPriorities: string[];
  marketPosition: string;
  opportunityScore: number;
}

export interface RecommendationInput {
  category: string;
  priority: string;
  recommendation: string;
  rationale: string;
  expectedImpact: string;
  implementationComplexity: string;
  timeframe: string;
  estimatedROI?: number;
  keyMetrics?: string[];
  weddingSpecificConsiderations?: string;
}

export function buildExecutiveSummary(insightReport: any): ExecutiveSummaryData {
  return {
    keyFindings: insightReport.keyFindings || [],
    criticalInsights: insightReport.criticalInsights || [],
    actionPriorities: insightReport.actionPriorities || [],
    marketPosition: insightReport.marketPosition || 'Not determined',
    opportunityScore: insightReport.opportunityScore || 0,
  };
}

export function buildMarketAnalysis(insightReport: any) {
  const defaultMarketSize = {
    totalValue: 0,
    unit: 'USD',
    growthRate: 0,
  };
  
  return {
    marketSize: insightReport.marketAnalysis?.marketSize || defaultMarketSize,
    marketTrends: insightReport.marketAnalysis?.trends || [],
    seasonalPatterns: insightReport.marketAnalysis?.seasonalPatterns || [],
    geographicInsights: insightReport.marketAnalysis?.geographicInsights || [],
  };
}

export function buildCompetitiveAnalysis(insightReport: any) {
  const defaultLandscape = {
    concentration: 'moderately_concentrated' as const,
    barriers: [],
    opportunities: [],
  };
  
  return {
    directCompetitors: insightReport.competitiveAnalysis?.directCompetitors || [],
    marketLeaders: insightReport.competitiveAnalysis?.marketLeaders || [],
    competitiveLandscape: insightReport.competitiveAnalysis?.landscape || defaultLandscape,
    benchmarking: insightReport.competitiveAnalysis?.benchmarking || [],
  };
}

export function buildCustomerBehaviorInsights(customerBehavior?: any) {
  if (customerBehavior) return customerBehavior;
  
  return {
    bookingTimeline: {
      averageLeadTime: 12,
      planningMilestones: [],
    },
    spendingPatterns: {
      averageWeddingBudget: 30000,
      categoryAllocations: {},
    },
    selectionCriteria: [],
  };
}

export function buildWeddingIndustrySpecifics(insightReport: any) {
  return {
    seasonalDemand: insightReport.weddingSpecifics?.seasonalDemand || [],
    vendorEcosystem: insightReport.weddingSpecifics?.vendorEcosystem || [],
    emergingTrends: insightReport.weddingSpecifics?.emergingTrends || [],
    customerBehaviorInsights: buildCustomerBehaviorInsights(
      insightReport.weddingSpecifics?.customerBehavior
    ),
  };
}

export function transformSingleRecommendation(rec: any): RecommendationInput {
  return {
    category: rec.category,
    priority: rec.priority,
    recommendation: rec.recommendation,
    rationale: rec.rationale,
    expectedImpact: rec.expectedImpact,
    implementationComplexity: rec.implementationComplexity,
    timeframe: rec.timeframe,
    estimatedROI: rec.estimatedROI,
    keyMetrics: rec.keyMetrics || [],
    weddingSpecificConsiderations: rec.weddingSpecificConsiderations,
  };
}

export function transformRecommendations(
  recommendations?: RecommendationInput[]
): RecommendationInput[] {
  if (!recommendations) return [];
  
  return recommendations.map(transformSingleRecommendation);
}

export function buildDataQuality(validatedData: any, insightReport: any) {
  const nextUpdateDue = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  
  return {
    dataSourcesCovered: validatedData.industryDataSources || [
      'theknot',
      'weddingwire',
    ],
    dataFreshness: 'Last 24 hours',
    confidenceLevel: insightReport.dataQuality?.confidenceLevel || 85,
    limitations: insightReport.dataQuality?.limitations || [],
    nextUpdateDue,
  };
}

export function buildStructuredReport(
  insightId: string,
  organizationId: string,
  validatedData: any,
  insightReport: any
) {
  return {
    insightId,
    organizationId,
    reportType: validatedData.insightType,
    generatedAt: new Date().toISOString(),
    scope: validatedData.scope,
    timeframe: validatedData.timeframe,
    executiveSummary: buildExecutiveSummary(insightReport),
    marketAnalysis: buildMarketAnalysis(insightReport),
    competitiveAnalysis: buildCompetitiveAnalysis(insightReport),
    weddingIndustrySpecifics: buildWeddingIndustrySpecifics(insightReport),
    actionableRecommendations: transformRecommendations(
      insightReport.recommendations
    ),
    dataQuality: buildDataQuality(validatedData, insightReport),
  };
}