/**
 * Wedding Insights - Specialized Types for Wedding Analytics
 */

// Insights Generation Types
export interface WeddingInsightsEngine {
  generateProgressInsights(weddingId: string): Promise<ProgressInsights>;
  generateBudgetInsights(budget: WeddingBudget): Promise<BudgetInsights>;
  generateVendorInsights(vendors: VendorData[]): Promise<VendorInsights>;
  generateTimelineInsights(
    timeline: WeddingTimeline,
  ): Promise<TimelineInsights>;
  generateSocialInsights(
    activities: WeddingActivity[],
  ): Promise<SocialInsights>;
}

export interface ProgressInsights {
  completionRate: number;
  velocityTrend: 'accelerating' | 'steady' | 'slowing';
  criticalPathHealth: 'green' | 'yellow' | 'red';
  blockerCount: number;
  nextMilestones: MilestonePreview[];
  recommendations: ProgressRecommendation[];
}

export interface BudgetInsights {
  spendingVelocity: number;
  categoryPerformance: CategoryInsight[];
  marketComparison: MarketInsight[];
  riskFactors: BudgetRisk[];
  optimizationScore: number;
  projectedFinal: number;
}

export interface VendorInsights {
  teamPerformance: number;
  communicationHealth: number;
  riskAssessment: VendorRisk[];
  strengths: string[];
  improvements: string[];
  replacementCandidates: ReplacementCandidate[];
}

export interface TimelineInsights {
  bufferStatus: 'healthy' | 'tight' | 'critical';
  riskMilestones: RiskMilestone[];
  optimizationOpportunities: TimelineOptimization[];
  weatherRisk: WeatherRiskAssessment;
  seasonalFactors: SeasonalFactor[];
}

export interface SocialInsights {
  shareabilityScore: number;
  viralPotential: number;
  engagementPrediction: EngagementPrediction;
  trendingElements: TrendingElement[];
  hashtagRecommendations: string[];
}

// Detailed Insight Components
export interface MilestonePreview {
  milestoneId: string;
  title: string;
  dueDate: Date;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  preparationTime: number; // days needed
  dependencies: string[];
}

export interface ProgressRecommendation {
  type:
    | 'acceleration'
    | 'resequencing'
    | 'resource_addition'
    | 'scope_adjustment';
  title: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface CategoryInsight {
  category: string;
  performance: 'excellent' | 'good' | 'concerning' | 'problematic';
  variance: number;
  trend: 'improving' | 'stable' | 'worsening';
  recommendations: string[];
}

export interface MarketInsight {
  category: string;
  marketPosition:
    | 'premium'
    | 'above_average'
    | 'average'
    | 'below_average'
    | 'budget';
  potentialSavings: number;
  qualityTradeoff: string;
  alternativeOptions: AlternativeOption[];
}

export interface BudgetRisk {
  riskType:
    | 'overspend'
    | 'scope_creep'
    | 'market_inflation'
    | 'timeline_pressure';
  probability: number; // 0-1
  potentialImpact: number;
  mitigation: string[];
}

export interface VendorRisk {
  vendorId: string;
  riskType: 'communication' | 'timeline' | 'quality' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  mitigation: string[];
}

export interface ReplacementCandidate {
  currentVendorId: string;
  suggestedVendorId: string;
  improvementAreas: string[];
  switchingCost: number;
  timeline: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskMilestone {
  milestoneId: string;
  riskLevel: 'medium' | 'high' | 'critical';
  riskFactors: string[];
  contingencyPlans: string[];
  bufferRecommendation: number; // additional days
}

export interface TimelineOptimization {
  type:
    | 'parallel_execution'
    | 'early_start'
    | 'vendor_coordination'
    | 'task_elimination';
  description: string;
  timeSaved: number; // days
  feasibility: 'easy' | 'moderate' | 'challenging';
  requirements: string[];
}

export interface WeatherRiskAssessment {
  seasonalRisk: 'low' | 'medium' | 'high';
  backupRequirements: string[];
  contingencyBudget: number;
  alternativeDates: Date[];
}

export interface SeasonalFactor {
  factor: 'vendor_availability' | 'pricing' | 'weather' | 'guest_availability';
  impact: 'positive' | 'neutral' | 'negative';
  description: string;
  mitigation?: string;
}

export interface EngagementPrediction {
  expectedLikes: number;
  expectedShares: number;
  expectedComments: number;
  viralProbability: number;
  peakEngagementTime: string;
}

export interface TrendingElement {
  element: string;
  trendScore: number;
  hashtag: string;
  exampleContent: string[];
}

export interface AlternativeOption {
  optionId: string;
  description: string;
  priceDifference: number;
  qualityImpact: 'better' | 'similar' | 'worse';
  availabilityRisk: 'low' | 'medium' | 'high';
}

// Analytics and Metrics
export interface WeddingMetrics {
  planningEfficiency: PlanningEfficiency;
  budgetPerformance: BudgetPerformance;
  vendorRelationshipHealth: VendorRelationshipHealth;
  timelinePerformance: TimelinePerformance;
  socialEngagement: SocialEngagement;
}

export interface PlanningEfficiency {
  decisionSpeed: number; // average days to make decisions
  taskCompletion: number; // percentage
  planningVelocity: number; // tasks per week
  procrastinationIndex: number; // 0-100
  stressLevel: 'low' | 'medium' | 'high';
}

export interface BudgetPerformance {
  accuracyScore: number; // how close estimates are to actual
  negotiationSuccess: number; // percentage of successful negotiations
  marketSavvy: number; // how well they compare to market rates
  impulseSpending: number; // unplanned purchases as percentage
}

export interface VendorRelationshipHealth {
  communicationScore: number; // average across all vendors
  satisfactionScore: number; // average satisfaction rating
  conflictResolution: number; // how well issues are resolved
  loyaltyIndex: number; // likelihood to recommend vendors
}

export interface TimelinePerformance {
  onTimeCompletion: number; // percentage of milestones hit on time
  bufferUtilization: number; // how much buffer time used
  riskMitigation: number; // how well risks are managed
  adaptability: number; // how well timeline adjusts to changes
}

export interface SocialEngagement {
  shareFrequency: number; // posts per week about wedding
  engagementRate: number; // likes/comments per post
  reachExpansion: number; // new followers/connections
  viralContent: number; // posts that went viral
}

// AI-Driven Insights
export interface AIInsightEngine {
  predictBudgetOverrun(
    budget: WeddingBudget,
    currentSpending: number[],
  ): Promise<OverrunPrediction>;
  recommendVendorOptimization(
    vendors: VendorData[],
  ): Promise<VendorOptimization>;
  suggestTimelineAdjustments(
    timeline: WeddingTimeline,
    constraints: PlanningConstraints,
  ): Promise<TimelineAdjustment[]>;
  generateContentIdeas(weddingDetails: WeddingDetails): Promise<ContentIdea[]>;
  predictEngagement(content: ShareableContent): Promise<EngagementPrediction>;
}

export interface OverrunPrediction {
  probability: number; // 0-1
  estimatedOverage: number;
  primaryCauses: string[];
  interventions: BudgetIntervention[];
  confidenceLevel: number;
}

export interface VendorOptimization {
  currentScore: number;
  optimizedScore: number;
  recommendations: VendorRecommendation[];
  riskAssessment: string;
  implementationPlan: string[];
}

export interface TimelineAdjustment {
  adjustmentType:
    | 'milestone_reorder'
    | 'buffer_adjustment'
    | 'parallel_execution'
    | 'outsourcing';
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeSaved: number;
}

export interface ContentIdea {
  ideaId: string;
  title: string;
  description: string;
  platform: 'instagram' | 'facebook' | 'pinterest' | 'tiktok';
  viralPotential: number;
  requiredAssets: string[];
  timing: 'now' | 'soon' | 'later' | 'post_wedding';
}

export interface BudgetIntervention {
  interventionType:
    | 'negotiation'
    | 'substitution'
    | 'elimination'
    | 'timing_change';
  category: string;
  potentialSavings: number;
  feasibility: number; // 0-1
  requirements: string[];
}

export interface VendorRecommendation {
  type:
    | 'replacement'
    | 'negotiation'
    | 'communication_improvement'
    | 'scope_adjustment';
  vendorId: string;
  description: string;
  expectedImprovement: string[];
  implementation: string[];
}

export interface PlanningConstraints {
  budgetFlexibility: number; // 0-1
  timelineFlexibility: number; // 0-1
  guestCountFlexibility: number; // 0-1
  venueConstraints: string[];
  personalPreferences: string[];
}

// Benchmark and Comparison Data
export interface WeddingBenchmarks {
  budgetBenchmarks: BudgetBenchmark[];
  timelineBenchmarks: TimelineBenchmark[];
  vendorBenchmarks: VendorBenchmark[];
  regionalFactors: RegionalFactor[];
}

export interface BudgetBenchmark {
  category: string;
  region: string;
  guestRange: string;
  averageSpend: number;
  medianSpend: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  seasonalVariation: number;
}

export interface TimelineBenchmark {
  planningDuration: number; // months
  averageMilestones: number;
  criticalPathLength: number; // weeks
  bufferRecommendation: number; // weeks
  commonBottlenecks: string[];
}

export interface VendorBenchmark {
  category: string;
  averageRating: number;
  averageResponseTime: number; // hours
  averageProjectDuration: number; // weeks
  commonIssues: string[];
  redFlags: string[];
}

export interface RegionalFactor {
  region: string;
  costMultiplier: number;
  availabilityFactor: number;
  seasonalPeaks: string[];
  culturalConsiderations: string[];
}

// Export all from couple-reporting for convenience
export * from './couple-reporting';
