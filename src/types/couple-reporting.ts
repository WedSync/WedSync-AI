/**
 * WedMe Couple Reporting Platform - TypeScript Interfaces
 * Comprehensive type definitions for wedding couple reporting system
 */

// Core Reporting Platform Interface
export interface CoupleReportingPlatform {
  generatePersonalizedReport(
    request: CoupleReportRequest,
  ): Promise<CoupleReport>;
  createShareableInsights(insights: WeddingInsights): Promise<ShareableContent>;
  trackWeddingProgress(weddingId: string): Promise<ProgressReport>;
  analyzeBudgetOptimization(budget: WeddingBudget): Promise<BudgetAnalysis>;
  generateVendorPerformanceReport(vendorIds: string[]): Promise<VendorReport>;
}

// Report Request Configuration
export interface CoupleReportRequest {
  coupleId: string;
  weddingId: string;
  reportType: CoupleReportType;
  timeframe: ReportTimeframe;
  includeVendors: string[];
  sharingSettings: SharingConfiguration;
  visualStyle: ReportVisualStyle;
  privacyLevel: PrivacyLevel;
}

export interface ReportTimeframe {
  start: Date;
  end: Date;
}

export interface SharingConfiguration {
  allowPublicSharing: boolean;
  includeVendorTags: boolean;
  watermarkStyle: 'elegant' | 'minimal' | 'branded' | 'none';
  socialPlatforms: ('instagram' | 'facebook' | 'twitter' | 'pinterest')[];
}

// Wedding Insights
export interface WeddingInsights {
  milestones: PlanningMilestone[];
  vendorHighlights: VendorHighlight[];
  budgetInsights: BudgetInsight[];
  timelineMetrics: TimelineMetric[];
  personalizedRecommendations: Recommendation[];
  socialShareableStats: ShareableStatistic[];
}

export interface PlanningMilestone {
  milestoneId: string;
  title: string;
  description: string;
  category:
    | 'venue'
    | 'catering'
    | 'photography'
    | 'flowers'
    | 'music'
    | 'attire'
    | 'guests';
  dueDate: Date;
  completedDate?: Date;
  status: 'completed' | 'in_progress' | 'upcoming' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  assignedVendor?: {
    id: string;
    name: string;
    category: string;
  };
}

export interface VendorHighlight {
  vendorId: string;
  vendor: {
    id: string;
    name: string;
    category: string;
    rating: number;
    profileImage: string;
  };
  type: 'vendor' | 'milestone' | 'budget' | 'communication';
  title: string;
  description: string;
  rating: number;
  completed: boolean;
  highlightImage?: string;
  testimonial?: string;
}

export interface BudgetInsight {
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  trendDirection: 'up' | 'down' | 'stable';
  comparisonToAverage: number;
  optimizationOpportunity?: {
    potentialSavings: number;
    recommendation: string;
  };
}

export interface TimelineMetric {
  metric:
    | 'milestones_completed'
    | 'vendor_responses'
    | 'decision_speed'
    | 'timeline_adherence';
  value: number;
  unit: 'percentage' | 'days' | 'count' | 'hours';
  trend: 'improving' | 'declining' | 'stable';
  benchmarkComparison: number;
}

export interface Recommendation {
  id: string;
  type: 'budget' | 'vendor' | 'timeline' | 'planning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionRequired: boolean;
  estimatedImpact: string;
  dueDate?: Date;
}

export interface ShareableStatistic {
  statType:
    | 'planning_days'
    | 'vendors_coordinated'
    | 'budget_saved'
    | 'milestones_completed';
  value: number;
  displayText: string;
  iconName: string;
  colorScheme: string;
}

// Couple Report Structure
export interface CoupleReport {
  reportId: string;
  coupleId: string;
  weddingId: string;
  generatedAt: Date;
  reportType: CoupleReportType;
  visualContent: VisualContent[];
  textualInsights: TextualInsight[];
  shareableAssets: ShareableAsset[];
  actionableRecommendations: ActionableRecommendation[];
  privacySettings: PrivacySettings;
  metadata: ReportMetadata;
}

export interface VisualContent {
  contentId: string;
  type: 'chart' | 'infographic' | 'timeline' | 'progress_ring' | 'comparison';
  title: string;
  description: string;
  dataUrl: string;
  thumbnailUrl: string;
  interactionData?: any;
}

export interface TextualInsight {
  insightId: string;
  category: string;
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  relatedData?: any;
}

export interface ShareableAsset {
  assetId: string;
  type:
    | 'instagram_story'
    | 'instagram_post'
    | 'facebook_post'
    | 'pinterest_pin';
  title: string;
  description: string;
  imageUrl: string;
  templateId: string;
  socialOptimized: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  hashtags: string[];
  vendorTags: string[];
}

export interface ActionableRecommendation {
  recommendationId: string;
  type:
    | 'budget_optimization'
    | 'vendor_selection'
    | 'timeline_adjustment'
    | 'planning_tip';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
  dueDate?: Date;
  relatedVendors?: string[];
  estimatedSavings?: number;
}

export interface PrivacySettings {
  isPublic: boolean;
  allowVendorSharing: boolean;
  allowSocialSharing: boolean;
  hideBudgetDetails: boolean;
  hideVendorNames: boolean;
  watermarkRequired: boolean;
}

export interface ReportMetadata {
  version: string;
  generationTime: number;
  dataSourceVersion: string;
  templateVersion: string;
  exportFormats: ('pdf' | 'png' | 'jpg' | 'json')[];
}

// Progress Report Structure
export interface ProgressReport {
  overallProgress: number; // 0-100
  milestoneStatus: MilestoneStatus[];
  vendorCoordination: VendorCoordinationStatus[];
  timelineAdherence: TimelineAdherence;
  budgetUtilization: BudgetUtilization;
  upcomingTasks: UpcomingTask[];
  riskFactors: RiskFactor[];
  weddingCountdown: WeddingCountdown;
}

export interface MilestoneStatus extends PlanningMilestone {
  progress: number;
  blockers: string[];
  dependencies: string[];
  estimatedCompletion?: Date;
}

export interface VendorCoordinationStatus {
  vendorId: string;
  vendorName: string;
  category: string;
  status: 'excellent' | 'good' | 'needs_attention' | 'concerning';
  communicationScore: number;
  timelinessScore: number;
  lastContact: Date;
  nextDeadline?: Date;
  outstandingTasks: number;
  responseTime: number; // hours
}

export interface TimelineAdherence {
  overallScore: number;
  onTrackMilestones: number;
  delayedMilestones: number;
  criticalPathRisk: 'low' | 'medium' | 'high';
  bufferDays: number;
}

export interface BudgetUtilization {
  totalBudget: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationRate: number;
  projectedTotal: number;
  budgetHealth: 'healthy' | 'warning' | 'over_budget';
}

export interface UpcomingTask {
  taskId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedTime: number; // minutes
  assignedVendor?: string;
  category: string;
  dependencies: string[];
}

export interface RiskFactor {
  riskId: string;
  type: 'budget' | 'timeline' | 'vendor' | 'logistics';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  probability: number; // 0-1
  impact: number; // 0-10
  mitigation: string;
  responsibleParty: 'couple' | 'vendor' | 'coordinator';
}

export interface WeddingCountdown {
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  milestonesThisWeek: number;
  upcomingDeadlines: Date[];
}

// Budget Analysis Structure
export interface BudgetAnalysis {
  totalBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  categoryBreakdown: CategoryBudget[];
  savingsOpportunities: SavingsOpportunity[];
  pricingBenchmarks: PricingBenchmark[];
  paymentSchedule: PaymentScheduleItem[];
  costTrends: CostTrend[];
  budgetHealth: BudgetHealthScore;
}

export interface CategoryBudget {
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentOfTotal: number;
  status: 'under_budget' | 'on_budget' | 'over_budget';
  averageMarketPrice: number;
  comparisonToMarket: 'below' | 'average' | 'above';
}

export interface SavingsOpportunity {
  opportunityId: string;
  type:
    | 'vendor_negotiation'
    | 'timing_adjustment'
    | 'alternative_option'
    | 'package_bundling';
  category: string;
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  timeframe: string;
  actionSteps: string[];
  relatedVendors?: string[];
}

export interface PricingBenchmark {
  category: string;
  averagePrice: number;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  yourPrice: number;
  percentile: number;
  region: string;
  sampleSize: number;
  lastUpdated: Date;
}

export interface PaymentScheduleItem {
  paymentId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  status: 'upcoming' | 'due' | 'paid' | 'overdue';
  paymentMethod: string;
  description: string;
}

export interface CostTrend {
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  timeframe: '3_months' | '6_months' | '1_year';
  projection: number;
  confidence: number;
}

export interface BudgetHealthScore {
  overallScore: number; // 0-100
  factors: {
    allocation: number;
    timeline: number;
    marketComparison: number;
    riskAssessment: number;
  };
  recommendations: string[];
}

// Vendor Report Structure
export interface VendorReport {
  vendorPerformance: VendorPerformanceMetric[];
  communicationQuality: CommunicationScore[];
  timelineAdherence: VendorTimelineScore[];
  clientSatisfaction: SatisfactionScore[];
  recommendationStrength: RecommendationScore;
  comparativeAnalysis: VendorComparison[];
  overallScore: number;
}

export interface VendorPerformanceMetric {
  vendorId: string;
  vendorName: string;
  category: string;
  overallScore: number;
  responsiveness: number;
  quality: number;
  timeliness: number;
  professionalism: number;
  valueForMoney: number;
  lastInteraction: Date;
  totalInteractions: number;
}

export interface CommunicationScore {
  vendorId: string;
  averageResponseTime: number; // hours
  responseRate: number; // percentage
  communicationQuality: number; // 1-5 scale
  preferredChannels: string[];
  proactiveUpdates: number;
}

export interface VendorTimelineScore {
  vendorId: string;
  onTimeDelivery: number; // percentage
  averageDelay: number; // days
  milestoneAdherence: number; // percentage
  earlyWarnings: number;
}

export interface SatisfactionScore {
  vendorId: string;
  overallSatisfaction: number;
  likelyToRecommend: number;
  meetExpectations: boolean;
  strongPoints: string[];
  improvementAreas: string[];
  testimonial?: string;
}

export interface RecommendationScore {
  overallScore: number;
  topPerformers: string[];
  concerningVendors: string[];
  replacementSuggestions: VendorSuggestion[];
}

export interface VendorComparison {
  vendorId: string;
  comparisonCategory: string;
  rank: number;
  percentile: number;
  strengthAreas: string[];
  weaknessAreas: string[];
}

export interface VendorSuggestion {
  suggestedVendorId: string;
  reason: string;
  expectedImprovement: string[];
  switchingCost: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// Wedding-Specific Types
export interface WeddingDetails {
  weddingId: string;
  coupleNames: string;
  weddingDate: Date;
  venue: string;
  estimatedGuests: number;
  selectedVendors: SelectedVendor[];
  budget: WeddingBudget;
  highlights: WeddingHighlight[];
  timeline: WeddingTimeline;
}

export interface SelectedVendor {
  id: string;
  name: string;
  category: string;
  status: 'booked' | 'considering' | 'contacted' | 'declined';
  contract: {
    signed: boolean;
    value: number;
    paymentSchedule: PaymentScheduleItem[];
  };
  rating: number;
  communication: {
    lastContact: Date;
    responseTime: number;
    preferredChannel: string;
  };
}

export interface WeddingBudget {
  totalBudget: number;
  categories: CategoryBudget[];
  weddingDate: Date;
  region: string;
  guestCount: number;
  priorities: string[];
}

export interface WeddingHighlight {
  highlightId: string;
  type: 'vendor' | 'milestone' | 'decision' | 'inspiration';
  title: string;
  description: string;
  date: Date;
  category: string;
  rating?: number;
  vendorId?: string;
  images: string[];
  completed: boolean;
}

export interface WeddingTimeline {
  milestones: PlanningMilestone[];
  criticalPath: string[];
  buffer: number; // days
  lastUpdated: Date;
}

// Shareable Content Types
export interface ShareableContent {
  contentId: string;
  title: string;
  description: string;
  type: 'story' | 'post' | 'carousel';
  platform: 'instagram' | 'facebook' | 'pinterest' | 'twitter';
  previewUrl: string;
  downloadUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  expectedEngagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  hashtags: string[];
  vendorTags: string[];
  templateId: string;
  customizations: ContentCustomization;
}

export interface ContentCustomization {
  colorScheme: string;
  fontFamily: string;
  brandElements: string[];
  personalizedText: string[];
  vendorCredits: boolean;
}

// Enum Types
export type CoupleReportType =
  | 'progress'
  | 'budget'
  | 'vendor_performance'
  | 'timeline'
  | 'social_share'
  | 'final_summary';
export type PrivacyLevel = 'private' | 'friends' | 'public' | 'vendors_only';
export type ReportVisualStyle =
  | 'modern_minimalist'
  | 'romantic_elegant'
  | 'fun_colorful'
  | 'classic_traditional'
  | 'instagram_story';

// Dashboard Props Types
export interface WeddingProgressOverviewProps {
  progressData: ProgressReport | null;
}

export interface ReportTypeSelectorProps {
  selectedType: CoupleReportType;
  onTypeSelect: (type: CoupleReportType) => void;
  availableTypes: CoupleReportType[];
}

// Service Function Types
export type GeneratePersonalizedReportFn = (
  request: CoupleReportRequest,
) => Promise<CoupleReport>;
export type CreateShareableInsightsFn = (
  insights: WeddingInsights,
) => Promise<ShareableContent[]>;
export type TrackWeddingProgressFn = (
  weddingId: string,
) => Promise<ProgressReport>;
export type AnalyzeBudgetOptimizationFn = (
  budget: WeddingBudget,
) => Promise<BudgetAnalysis>;
export type GenerateVendorPerformanceReportFn = (
  vendorIds: string[],
) => Promise<VendorReport>;
