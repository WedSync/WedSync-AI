/**
 * AI-Powered Wedding Optimization Types
 * Team A: Frontend/UI Development - WS-341
 *
 * Comprehensive types for AI-powered wedding planning optimization
 * Focuses on wedding-specific optimization features and user interfaces
 */

// Core optimization types
export type OptimizationType =
  | 'comprehensive'
  | 'budget'
  | 'timeline'
  | 'vendor'
  | 'experience';
export type OptimizationPriority = 'low' | 'medium' | 'high' | 'critical';
export type OptimizationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type RecommendationFilter =
  | 'all'
  | 'budget'
  | 'vendor'
  | 'timeline'
  | 'experience';
export type RecommendationImpact = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired';

// Wedding context and preferences
export interface WeddingContext {
  id: string;
  coupleId: string;
  weddingDate: string;
  guestCount: number;
  location: {
    city: string;
    country: string;
    venue?: string;
  };
  style: string;
  budget: WeddingBudget;
  timeline: WeddingTimeline;
  preferences: CouplePreferences;
}

export interface CouplePreferences {
  priorities: WeddingPriority[];
  style: {
    theme: string;
    colors: string[];
    formality: 'casual' | 'semi-formal' | 'formal' | 'black-tie';
  };
  preferences: {
    photography: string[];
    catering: string[];
    music: string[];
    flowers: string[];
  };
  dealBreakers: string[];
  mustHaves: string[];
}

export interface WeddingPriority {
  category: string;
  importance: number; // 1-10 scale
  flexibility: 'rigid' | 'flexible' | 'very-flexible';
}

// Budget types
export interface WeddingBudget {
  id: string;
  total: number;
  allocated: number;
  spent: number;
  remaining: number;
  categories: BudgetCategory[];
  currency: string;
  lastUpdated: Date;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  percentage: number;
  priority: number;
  flexibility: 'rigid' | 'flexible' | 'very-flexible';
}

export interface OptimizedBudget extends WeddingBudget {
  optimizationId: string;
  projectedSavings: number;
  optimizedCategories: OptimizedBudgetCategory[];
  confidenceScore: number;
}

export interface OptimizedBudgetCategory extends BudgetCategory {
  originalAmount: number;
  optimizedAmount: number;
  savings: number;
  savingsPercentage: number;
  reasoning: string;
}

export interface BudgetSavings {
  id: string;
  category: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  confidence: number;
  reasoning: string;
  alternatives: BudgetAlternative[];
  riskLevel: 'low' | 'medium' | 'high';
  implementationDifficulty: 'easy' | 'medium' | 'hard';
}

export interface BudgetAlternative {
  id: string;
  title: string;
  cost: number;
  description: string;
  pros: string[];
  cons: string[];
  confidence: number;
}

// Timeline types
export interface WeddingTimeline {
  id: string;
  events: TimelineEvent[];
  dependencies: TimelineDependency[];
  conflicts: TimelineConflict[];
  optimizationSuggestions: TimelineOptimization[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  category:
    | 'ceremony'
    | 'reception'
    | 'photos'
    | 'preparation'
    | 'vendor'
    | 'other';
  priority: number;
  flexibility: 'fixed' | 'flexible' | 'very-flexible';
  vendorIds: string[];
  dependencies: string[];
}

export interface TimelineDependency {
  id: string;
  eventId: string;
  dependsOnId: string;
  type: 'starts-after' | 'ends-before' | 'concurrent' | 'buffer-time';
  bufferMinutes?: number;
}

export interface TimelineConflict {
  id: string;
  eventIds: string[];
  type: 'overlap' | 'vendor-conflict' | 'dependency-violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution?: string;
}

export interface TimelineOptimization {
  id: string;
  type: 'reorder' | 'combine' | 'split' | 'buffer' | 'vendor-coordination';
  affectedEvents: string[];
  description: string;
  benefits: string[];
  timeSavings?: number;
  stressReduction?: number;
  confidence: number;
}

// Vendor matching types
export interface VendorMatch {
  id: string;
  vendorId: string;
  vendor: VendorProfile;
  matchScore: number;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  priceComparison: PriceComparison;
  availabilityMatch: boolean;
  styleMatch: number;
  personalityMatch: number;
  reviews: VendorReview[];
}

export interface VendorProfile {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceRange: [number, number];
  location: string;
  specialties: string[];
  style: string[];
  availability: DateRange[];
  portfolio: string[];
  verified: boolean;
}

export interface PriceComparison {
  vendorPrice: number;
  marketAverage: number;
  percentageDifference: number;
  valueRating: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface VendorReview {
  id: string;
  rating: number;
  comment: string;
  date: Date;
  weddingType: string;
  verified: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// AI optimization core types
export interface OptimizationRequest {
  type: OptimizationType;
  priority: OptimizationPriority;
  focusAreas?: string[];
  constraints?: string[];
  maxBudgetReduction?: number;
  timelineFlexibility?: 'low' | 'medium' | 'high';
}

export interface AIOptimization {
  id: string;
  weddingId: string;
  type: OptimizationType;
  status: OptimizationStatus;
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  recommendations: AIRecommendation[];
  metrics: OptimizationMetrics;
  error?: string;
}

export interface AIRecommendation {
  id: string;
  optimizationId: string;
  title: string;
  summary: string;
  detailedAnalysis: string;
  category: RecommendationFilter;
  type: string;
  impact: RecommendationImpact;
  confidence: number; // 0-100
  status: RecommendationStatus;
  potentialSavings: number;
  timeSavings?: number; // in hours
  stressReduction?: number; // 0-100
  implementationTime: string;
  benefits: string[];
  risks?: string[];
  alternatives?: RecommendationAlternative[];
  vendorRecommendations?: VendorMatch[];
  budgetAdjustments?: BudgetAdjustment[];
  timelineChanges?: TimelineChange[];
  priority: number;
  expiresAt?: Date;
  createdAt: Date;
}

export interface RecommendationAlternative {
  id: string;
  title: string;
  description: string;
  cost: number;
  savings: number;
  confidence: number;
  pros: string[];
  cons: string[];
}

export interface BudgetAdjustment {
  categoryId: string;
  currentAmount: number;
  suggestedAmount: number;
  reasoning: string;
}

export interface TimelineChange {
  eventId: string;
  changeType: 'move' | 'duration' | 'merge' | 'split' | 'remove';
  currentValue: any;
  suggestedValue: any;
  reasoning: string;
}

export interface OptimizationMetrics {
  totalSavings: number;
  timeSavings: number; // hours
  stressReduction: number; // 0-100
  decisionSpeed: number; // percentage improvement
  confidenceScore: number; // 0-100
  acceptanceRate: number; // 0-100
  implementationSuccess: number; // 0-100
}

// AI insights and analytics
export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'suggestion' | 'achievement';
  title: string;
  description: string;
  category: string;
  importance: number; // 1-10
  actionable: boolean;
  action?: InsightAction;
  metrics?: { [key: string]: number };
  createdAt: Date;
  expiresAt?: Date;
}

export interface InsightAction {
  label: string;
  type:
    | 'optimization'
    | 'recommendation'
    | 'vendor-search'
    | 'timeline-adjustment';
  data: any;
}

// Progress and history tracking
export interface OptimizationHistory {
  id: string;
  weddingId: string;
  timestamp: Date;
  request: OptimizationRequest;
  result: AIOptimization;
  status: OptimizationStatus;
  userFeedback?: OptimizationFeedback;
}

export interface OptimizationFeedback {
  rating: number; // 1-5
  helpful: boolean;
  implemented: boolean;
  comments?: string;
  improvements?: string[];
}

export interface AIFeedback {
  recommendationId: string;
  type: 'positive' | 'negative' | 'neutral';
  rating?: number; // 1-5
  reason?: string;
  improvements?: string[];
}

// Performance and analytics
export interface AIPerformanceMetrics {
  acceptanceRate: number; // 0-100
  averageSavings: number; // percentage
  timeReduction: number; // hours
  userSatisfaction: number; // 0-100
  errorRate: number; // 0-100
  responseTime: number; // seconds
  recommendationAccuracy: number; // 0-100
}

export interface WeddingProgress {
  overallProgress: number; // 0-100
  categories: CategoryProgress[];
  upcomingDeadlines: Deadline[];
  criticalTasks: Task[];
  completedMilestones: Milestone[];
}

export interface CategoryProgress {
  category: string;
  progress: number; // 0-100
  tasksCompleted: number;
  tasksTotal: number;
  onTrack: boolean;
}

export interface Deadline {
  id: string;
  task: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  overdue: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  assignee?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
}

export interface Milestone {
  id: string;
  title: string;
  completedAt: Date;
  category: string;
  significance: 'minor' | 'major' | 'critical';
}

export interface BudgetHealth {
  overallHealth: 'excellent' | 'good' | 'concerning' | 'critical';
  onTrack: boolean;
  projectedOverrun: number;
  savingsOpportunities: number;
  riskFactors: string[];
  recommendations: string[];
}

// Recommendation criteria for personalized suggestions
export interface RecommendationCriteria {
  type: 'personalized' | 'budget-focused' | 'time-focused' | 'vendor-focused';
  maxRecommendations?: number;
  categories?: RecommendationFilter[];
  prioritizeBy?: 'savings' | 'time' | 'satisfaction' | 'ease';
  excludeTypes?: string[];
  includeAlternatives?: boolean;
}

// UI component prop types
export interface OptimizationResult {
  id: string;
  type: OptimizationType;
  status: OptimizationStatus;
  recommendations: AIRecommendation[];
  metrics: OptimizationMetrics;
  createdAt: Date;
}

// Component-specific interfaces for AI Wedding Optimizer
export interface AIWeddingOptimizerProps {
  weddingId: string;
  couplePreferences: CouplePreferences;
  budget: WeddingBudget;
  timeline: WeddingTimeline;
  currentOptimizations: OptimizationResult[];
  onOptimizationRequest: (request: OptimizationRequest) => Promise<void>;
  onAcceptRecommendation: (recommendation: AIRecommendation) => Promise<void>;
  onFeedback: (feedback: AIFeedback) => void;
  isOptimizing: boolean;
}

export interface AIRecommendationEngineProps {
  recommendations: AIRecommendation[];
  weddingContext: WeddingContext;
  onAcceptRecommendation: (recommendation: AIRecommendation) => Promise<void>;
  onDeclineRecommendation: (
    recommendation: AIRecommendation,
    reason?: string,
  ) => void;
  onRequestMoreRecommendations: (
    criteria: RecommendationCriteria,
  ) => Promise<void>;
  isLoading: boolean;
}

export interface BudgetOptimizationPanelProps {
  currentBudget: WeddingBudget;
  optimizedBudget: OptimizedBudget;
  savings: BudgetSavings[];
  onApplyOptimization: (optimization: BudgetOptimization) => Promise<void>;
  onRejectOptimization: (optimization: BudgetOptimization) => void;
}

export interface BudgetOptimization {
  id: string;
  category: string;
  currentAmount: number;
  optimizedAmount: number;
  savings: number;
  reasoning: string;
  confidence: number;
}

export interface TimelineOptimizerProps {
  timeline: WeddingTimeline;
  optimizations: TimelineOptimization[];
  onApplyOptimization: (optimization: TimelineOptimization) => Promise<void>;
  onRejectOptimization: (optimization: TimelineOptimization) => void;
  isOptimizing: boolean;
}

export interface VendorMatchingInterfaceProps {
  weddingContext: WeddingContext;
  vendorMatches: VendorMatch[];
  categories: string[];
  onAcceptVendor: (vendor: VendorMatch) => Promise<void>;
  onRequestMoreMatches: (criteria: VendorMatchingCriteria) => Promise<void>;
  isLoading: boolean;
}

export interface VendorMatchingCriteria {
  category: string;
  maxPrice?: number;
  location?: string;
  style?: string[];
  availability?: DateRange;
  rating?: number;
}

export interface AIInsightsVisualizationProps {
  insights: AIInsight[];
  weddingProgress: WeddingProgress;
  budgetHealth: BudgetHealth;
  onInsightAction: (insight: AIInsight) => Promise<void>;
  onDismissInsight: (insight: AIInsight) => void;
}

export interface OptimizationProgressProps {
  optimizations: AIOptimization[];
  isOptimizing: boolean;
  currentStep?: string;
  progress: number;
  estimatedTimeRemaining?: number;
  onCancel?: () => void;
}

// Hook return types
export interface UseAIOptimizationReturn {
  optimizations: AIOptimization[];
  isOptimizing: boolean;
  optimizationHistory: OptimizationHistory[];
  error: Error | null;
  startOptimization: (request: OptimizationRequest) => Promise<void>;
  acceptRecommendation: (recommendation: AIRecommendation) => Promise<void>;
  declineRecommendation: (
    recommendation: AIRecommendation,
    reason?: string,
  ) => void;
  getPersonalizedRecommendations: (
    criteria: RecommendationCriteria,
  ) => Promise<AIRecommendation[]>;
}

// Chart and visualization data types
export interface BudgetComparisonData {
  category: string;
  current: number;
  optimized: number;
  savings: number;
  percentage: number;
}

export interface TimelineVisualizationData {
  events: TimelineEvent[];
  conflicts: TimelineConflict[];
  optimizations: TimelineOptimization[];
  dependencies: TimelineDependency[];
}

export interface VendorMatchVisualizationData {
  matches: VendorMatch[];
  categories: string[];
  priceRanges: { [category: string]: [number, number] };
  locationDistribution: { [location: string]: number };
}

// API response types
export interface AIOptimizationResponse {
  success: boolean;
  data: AIOptimization;
  error?: string;
  timestamp: string;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: AIRecommendation[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

export interface VendorMatchingResponse {
  success: boolean;
  matches: VendorMatch[];
  totalCount: number;
  searchCriteria: VendorMatchingCriteria;
  error?: string;
}

// Wedding-specific constants and enums
export const WEDDING_CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'videography',
  'flowers',
  'music',
  'transportation',
  'attire',
  'beauty',
  'decorations',
  'stationery',
  'favors',
] as const;

export const OPTIMIZATION_PRIORITIES = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
};

export const RECOMMENDATION_IMPACTS = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
};

// Utility types
export type WeddingCategory = (typeof WEDDING_CATEGORIES)[number];
export type AIOptimizationType = OptimizationType;
export type AIPriority = OptimizationPriority;
export type AIStatus = OptimizationStatus;

// Export default configuration
export const DEFAULT_OPTIMIZATION_CONFIG = {
  maxRecommendations: 10,
  confidenceThreshold: 70,
  savingsThreshold: 100, // £1.00 minimum savings
  timeSavingsThreshold: 1, // 1 hour minimum time savings
  refreshInterval: 300000, // 5 minutes
};
