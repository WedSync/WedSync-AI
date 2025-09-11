/**
 * AI Features Type Definitions
 * WS-239 Platform vs Client APIs Implementation
 */

export interface SubscriptionTier {
  id: string;
  name: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  monthlyPrice: number;
  yearlyPrice?: number;
}

export interface AIFeature {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'analysis' | 'automation' | 'communication';
  weddingUseCase: string;
  platformIncluded: boolean;
  platformLimit?: number;
  clientManaged: boolean;
  costPerUnit?: number;
  currency: 'GBP' | 'USD';
  requiredTier?: SubscriptionTier['name'];
  providerOptions: AIProvider[];
}

export interface AIProvider {
  id: string;
  name: string;
  apiKeyRequired: boolean;
  supportedFeatures: string[];
  setupComplexity: 'easy' | 'medium' | 'advanced';
  estimatedCostPerMonth: number;
  currency: 'GBP' | 'USD';
}

export interface APIKeyConfig {
  id: string;
  providerId: string;
  keyName: string;
  isConfigured: boolean;
  lastTested: Date | null;
  testStatus: 'success' | 'error' | 'pending' | 'never_tested';
  errorMessage?: string;
  encryptedKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  featureId: string;
  period: 'current_month' | 'last_month' | 'last_3_months';
  totalUsage: number;
  totalCost: number;
  currency: 'GBP' | 'USD';
  dailyUsage: Array<{
    date: string;
    count: number;
    cost: number;
  }>;
  projectedMonthlyUsage: number;
  projectedMonthlyCost: number;
  weddingSeasonMultiplier: number;
}

export interface BudgetAlert {
  id: string;
  featureId: string;
  threshold: number;
  alertType: 'warning' | 'critical' | 'limit_reached';
  message: string;
  isActive: boolean;
  triggeredAt?: Date;
}

export interface FeatureAccess {
  featureId: string;
  hasAccess: boolean;
  accessType: 'platform' | 'client' | 'trial' | 'none';
  remainingUsage?: number;
  resetDate?: Date;
  upgradeRequired?: boolean;
  upgradeMessage?: string;
}

export interface MigrationOption {
  fromType: 'platform' | 'trial';
  toType: 'client' | 'higher_tier';
  estimatedSavings?: number;
  estimatedCost?: number;
  complexity: 'easy' | 'medium' | 'advanced';
  timeToSetup: string;
  benefits: string[];
  requirements: string[];
}

export interface WeddingSeasonConfig {
  peakMonths: number[];
  multiplier: number;
  alertsEnabled: boolean;
  budgetAdjustment: number;
}

export interface AIFeatureState {
  currentTier: SubscriptionTier;
  features: AIFeature[];
  apiKeys: APIKeyConfig[];
  usage: UsageMetrics[];
  alerts: BudgetAlert[];
  access: FeatureAccess[];
  weddingSeasonConfig: WeddingSeasonConfig;
  isLoading: boolean;
  error: string | null;
}

// Component Props Interfaces
export interface AIFeatureManagerProps {
  userId: string;
  organizationId: string;
  currentTier: SubscriptionTier;
  onFeatureToggle: (featureId: string, enabled: boolean) => void;
  onUpgradeRequest: (targetTier: string) => void;
}

export interface PlatformVsClientToggleProps {
  feature: AIFeature;
  currentAccess: FeatureAccess;
  usage: UsageMetrics;
  onToggle: (featureId: string, newType: 'platform' | 'client') => void;
  disabled?: boolean;
}

export interface APIKeySetupWizardProps {
  provider: AIProvider;
  existingConfig?: APIKeyConfig;
  onSave: (
    config: Omit<APIKeyConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>;
  onTest: (apiKey: string) => Promise<boolean>;
  onCancel: () => void;
  isVisible: boolean;
}

export interface CostTrackingDashboardProps {
  usage: UsageMetrics[];
  alerts: BudgetAlert[];
  weddingSeasonConfig: WeddingSeasonConfig;
  currency: 'GBP' | 'USD';
  onSetBudget: (featureId: string, budget: number) => void;
  onDismissAlert: (alertId: string) => void;
}

export interface FeatureTierComparisonProps {
  currentTier: SubscriptionTier;
  features: AIFeature[];
  onUpgrade: (targetTier: string) => void;
  highlightFeature?: string;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface TestAPIKeyResponse {
  isValid: boolean;
  provider: string;
  remainingCredits?: number;
  errorMessage?: string;
}

export interface UsageStatsResponse {
  totalUsage: number;
  totalCost: number;
  period: string;
  breakdown: Array<{
    feature: string;
    usage: number;
    cost: number;
  }>;
}

// Wedding Industry Specific Types
export interface WeddingVendorType {
  type:
    | 'photographer'
    | 'venue'
    | 'caterer'
    | 'planner'
    | 'florist'
    | 'dj'
    | 'other';
  typicalAIFeatures: string[];
  seasonalMultiplier: number;
  averageMonthlyUsage: number;
}

export interface WeddingSeasonAlert {
  message: string;
  type: 'info' | 'warning' | 'preparation';
  actionRequired: boolean;
  estimatedImpact: {
    usageIncrease: number;
    costIncrease: number;
    recommendedBudget: number;
  };
}
