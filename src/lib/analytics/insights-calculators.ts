export interface OpportunityScoreResult {
  averageScore: number;
  validInsightsCount: number;
}

export interface InsightsTrend {
  totalInsights: number;
  recentInsights: number;
  averageOpportunityScore: number;
}

export function calculateAverageOpportunityScore(insights: any[]): OpportunityScoreResult {
  const validInsights = insights.filter(
    insight => insight.executive_summary?.opportunityScore
  );
  
  if (validInsights.length === 0) {
    return { averageScore: 0, validInsightsCount: 0 };
  }
  
  const totalScore = validInsights.reduce(
    (sum, insight) => sum + insight.executive_summary.opportunityScore,
    0
  );
  
  return {
    averageScore: totalScore / validInsights.length,
    validInsightsCount: validInsights.length
  };
}

export function filterRecentInsights(insights: any[]): any[] {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return insights.filter(insight => 
    new Date(insight.created_at) > thirtyDaysAgo
  );
}

export function calculateInsightsTrend(industryInsights: any[]): InsightsTrend | null {
  if (industryInsights.length <= 1) return null;
  
  const recentInsights = filterRecentInsights(industryInsights);
  const opportunityStats = calculateAverageOpportunityScore(industryInsights);
  
  return {
    totalInsights: industryInsights.length,
    recentInsights: recentInsights.length,
    averageOpportunityScore: opportunityStats.averageScore,
  };
}