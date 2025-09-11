/**
 * TypeScript interfaces for WS-245 Wedding Budget Optimizer System
 * Team A - Frontend Budget Optimization & Visualization
 * Built for React 19, TypeScript 5.9, and comprehensive budget management
 */

// ============================================================================
// Core Budget Types
// ============================================================================

export interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  plannedAmount: number;
  isOptimizable: boolean;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  color: string; // Hex color for visualizations
  subcategories?: BudgetSubcategory[];
  marketPriceRange?: {
    min: number;
    max: number;
    average: number;
  };
}

export interface BudgetSubcategory {
  id: string;
  categoryId: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  plannedAmount: number;
}

export interface BudgetAllocation {
  id: string;
  coupleId: string;
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  categories: BudgetCategory[];
  lastUpdated: Date;
  optimizationScore: number; // 0-100 score
  savingsOpportunity: number;
}

// ============================================================================
// AI Optimization Types
// ============================================================================

export type CostSavingRecommendationType =
  | 'vendor-alternative'
  | 'category-reallocation'
  | 'timing-optimization'
  | 'feature-substitution'
  | 'bulk-booking'
  | 'seasonal-discount'
  | 'diy-opportunity';

export interface CostSavingRecommendation {
  id: string;
  type: CostSavingRecommendationType;
  title: string;
  description: string;
  category: string;
  potentialSavings: number;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
  timelineWeeks: number;
  isApplied: boolean;
  actionItems: string[];
  pros: string[];
  cons: string[];
  alternativeVendors?: VendorSuggestion[];
  relatedRecommendations?: string[]; // IDs of related recommendations
  aiExplanation: string;
  expiresAt?: Date;
}

export interface VendorSuggestion {
  id: string;
  name: string;
  category: string;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  reviewCount: number;
  location: string;
  distance?: number; // km from venue
  features: string[];
  savings: number;
  isRecommended: boolean;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

export interface OptimizationGoal {
  type:
    | 'reduce-costs'
    | 'optimize-quality'
    | 'balance-both'
    | 'premium-upgrade';
  targetSavings?: number;
  priorityCategories: string[];
  constraints: string[];
  preferences: {
    diyWillingness: number; // 0-100
    travelWillingness: number; // km willing to travel
    flexibilityScore: number; // 0-100
  };
}

// ============================================================================
// Budget Visualization Types
// ============================================================================

export type BudgetVisualizationMode =
  | 'pie'
  | 'bar'
  | 'timeline'
  | 'comparison'
  | 'waterfall'
  | 'treemap';

export interface BudgetVisualizationData {
  categories: BudgetCategory[];
  totalBudget: number;
  spentAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  savingsOpportunity: number;
  timelineData?: BudgetTimelinePoint[];
  comparisonData?: BudgetComparisonData[];
}

export interface BudgetTimelinePoint {
  date: Date;
  plannedSpent: number;
  actualSpent: number;
  cumulativePlanned: number;
  cumulativeActual: number;
  milestones: string[];
}

export interface BudgetComparisonData {
  category: string;
  yourBudget: number;
  averageBudget: number;
  recommendedBudget: number;
  variance: number;
}

// ============================================================================
// Market Pricing Types
// ============================================================================

export interface MarketPriceData {
  category: string;
  region: string;
  season: 'peak' | 'mid' | 'off';
  averagePrice: number;
  priceRange: {
    p25: number; // 25th percentile
    p50: number; // median
    p75: number; // 75th percentile
    p90: number; // 90th percentile
  };
  trends: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  factors: string[];
  lastUpdated: Date;
}

export interface BudgetImpactAnalysis {
  totalSavings: number;
  categoryImpacts: Array<{
    category: string;
    oldAmount: number;
    newAmount: number;
    savings: number;
    confidence: number;
  }>;
  riskFactors: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
  expectedTimeline: string;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface BudgetOptimizerProps {
  totalBudget: number;
  currentAllocations: BudgetCategory[];
  optimizationGoals: OptimizationGoal[];
  onOptimizationApplied: (newBudget: BudgetAllocation) => void;
  onRecommendationApplied?: (recommendation: CostSavingRecommendation) => void;
  isLoading?: boolean;
  className?: string;
}

export interface BudgetVisualizationProps {
  budgetData: BudgetCategory[];
  viewMode: BudgetVisualizationMode;
  interactiveMode: boolean;
  onCategorySelect?: (category: BudgetCategory) => void;
  onModeChange?: (mode: BudgetVisualizationMode) => void;
  showComparisons?: boolean;
  showTrends?: boolean;
  className?: string;
}

export interface CostSavingRecommendationsProps {
  currentBudget: BudgetAllocation;
  aiRecommendations: CostSavingRecommendation[];
  potentialSavings: number;
  onRecommendationApply: (recommendation: CostSavingRecommendation) => void;
  onRecommendationDismiss?: (recommendationId: string) => void;
  onViewDetails?: (recommendation: CostSavingRecommendation) => void;
  isLoading?: boolean;
  className?: string;
}

export interface BudgetAllocationProps {
  categories: BudgetCategory[];
  totalBudget: number;
  onAllocationChange: (categories: BudgetCategory[]) => void;
  onDragEnd?: (result: any) => void; // @dnd-kit result type
  showPercentages?: boolean;
  showTargets?: boolean;
  isEditable?: boolean;
  className?: string;
}

export interface VendorPriceComparisonProps {
  category: string;
  currentVendor?: VendorSuggestion;
  alternativeVendors: VendorSuggestion[];
  marketData: MarketPriceData;
  onVendorSelect: (vendor: VendorSuggestion) => void;
  onViewDetails?: (vendor: VendorSuggestion) => void;
  className?: string;
}

export interface BudgetTrackerProps {
  budgetData: BudgetAllocation;
  alerts: BudgetAlert[];
  onAlertDismiss: (alertId: string) => void;
  showProjections?: boolean;
  className?: string;
}

// ============================================================================
// Alert & Notification Types
// ============================================================================

export interface BudgetAlert {
  id: string;
  type:
    | 'overspend'
    | 'underspend'
    | 'milestone'
    | 'deadline'
    | 'recommendation';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  category?: string;
  amount?: number;
  percentage?: number;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  expiresAt?: Date;
  isDismissible: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseBudgetOptimizationReturn {
  // State
  budgetData: BudgetAllocation | null;
  recommendations: CostSavingRecommendation[];
  marketData: MarketPriceData[];
  optimizationScore: number;
  isLoading: boolean;
  isOptimizing: boolean;
  error: string | null;

  // Actions
  optimizeBudget: (goals: OptimizationGoal[]) => Promise<void>;
  applyRecommendation: (recommendationId: string) => Promise<void>;
  dismissRecommendation: (recommendationId: string) => void;
  updateAllocation: (categories: BudgetCategory[]) => Promise<void>;
  refreshMarketData: () => Promise<void>;
  generateNewRecommendations: () => Promise<void>;

  // Utilities
  calculateSavings: () => number;
  getOptimizationInsights: () => string[];
  validateBudgetAllocation: (categories: BudgetCategory[]) => string[];
}

export interface UseBudgetCalculationsReturn {
  // Calculations
  totalAllocated: number;
  totalSpent: number;
  remainingBudget: number;
  overspentAmount: number;
  utilizationRate: number; // percentage of budget used
  completionRate: number; // percentage of planning complete

  // Projections
  projectedTotal: number;
  projectedOverrun: number;
  savingsOpportunity: number;

  // Analysis
  categoryAnalysis: Array<{
    category: string;
    status: 'on-track' | 'over-budget' | 'under-budget';
    variance: number;
    confidence: number;
  }>;

  // Utilities
  formatCurrency: (amount: number) => string;
  calculatePercentage: (amount: number, total: number) => number;
  getCategoryStatus: (
    category: BudgetCategory,
  ) => 'on-track' | 'over-budget' | 'under-budget';
}

// ============================================================================
// API & Data Types
// ============================================================================

export interface BudgetOptimizationRequest {
  coupleId: string;
  currentBudget: BudgetAllocation;
  goals: OptimizationGoal[];
  preferences: {
    riskTolerance: 'low' | 'medium' | 'high';
    timeframe: number; // weeks until wedding
    priorities: string[];
  };
}

export interface BudgetOptimizationResponse {
  optimizedBudget: BudgetAllocation;
  recommendations: CostSavingRecommendation[];
  analysis: BudgetImpactAnalysis;
  marketInsights: MarketPriceData[];
  confidence: number;
  estimatedSavings: number;
}

// ============================================================================
// Default Values & Constants
// ============================================================================

export const DEFAULT_BUDGET_CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'videography',
  'flowers',
  'music',
  'attire',
  'transportation',
  'stationery',
  'rings',
  'miscellaneous',
] as const;

export const BUDGET_CATEGORY_COLORS: Record<string, string> = {
  venue: '#9E77ED',
  catering: '#F79009',
  photography: '#2E90FA',
  videography: '#7F56D9',
  flowers: '#12B76A',
  music: '#F04438',
  attire: '#6941C6',
  transportation: '#039855',
  stationery: '#DC6803',
  rings: '#D92D20',
  miscellaneous: '#667085',
};

export const RECOMMENDATION_PRIORITY: Record<
  CostSavingRecommendationType,
  number
> = {
  'vendor-alternative': 1,
  'timing-optimization': 2,
  'category-reallocation': 3,
  'bulk-booking': 4,
  'seasonal-discount': 5,
  'feature-substitution': 6,
  'diy-opportunity': 7,
};

export const DEFAULT_OPTIMIZATION_GOALS: OptimizationGoal = {
  type: 'reduce-costs',
  targetSavings: 0,
  priorityCategories: [],
  constraints: [],
  preferences: {
    diyWillingness: 50,
    travelWillingness: 50,
    flexibilityScore: 50,
  },
};
