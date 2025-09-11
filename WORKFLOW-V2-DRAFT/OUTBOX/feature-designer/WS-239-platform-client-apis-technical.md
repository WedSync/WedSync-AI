# WS-239: Platform vs Client APIs Implementation - Technical Specification

## Executive Summary

A comprehensive AI feature architecture that clearly separates platform-provided AI features (using WedSync's OpenAI keys) from client-managed AI features (using suppliers' own API keys). This system enables cost-effective scaling while providing upgrade paths and transparent usage tracking for wedding suppliers.

**Estimated Effort**: 98 hours
- **Backend**: 45 hours (46%)
- **AI/ML**: 28 hours (29%)
- **Frontend**: 15 hours (15%)
- **Integration**: 8 hours (8%)
- **General**: 2 hours (2%)

**Business Impact**:
- Enable controlled AI feature rollout without overwhelming operational costs
- Provide clear upgrade paths from included to premium AI features
- Transparent cost allocation between platform and client usage
- Enable advanced AI features for suppliers willing to invest in their own API usage

## User Story

**As a** wedding photographer on the Professional tier  
**I want to** understand which AI features are included in my subscription vs which require my own OpenAI account  
**So that** I can make informed decisions about upgrading to advanced AI features while controlling my costs

**Acceptance Criteria**:
- ✅ Clear visual distinction between platform and client AI features
- ✅ Automatic enablement of platform features based on subscription tier
- ✅ Guided setup wizard for client API configuration
- ✅ Real-time cost tracking and budget alerts for client features
- ✅ Seamless feature experience regardless of API source
- ✅ Migration path from platform to client features
- ✅ Transparent usage analytics and cost breakdown

## Database Schema

```sql
-- AI feature configuration and usage tracking
CREATE TABLE ai_feature_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  
  -- Platform features configuration
  platform_features_enabled BOOLEAN DEFAULT TRUE,
  platform_usage_tier tier_enum NOT NULL,
  platform_monthly_limits JSONB DEFAULT '{}'::JSONB,
  
  -- Client API configuration
  client_api_enabled BOOLEAN DEFAULT FALSE,
  client_api_provider api_provider_enum,
  client_api_key_hash VARCHAR(128), -- Encrypted storage
  client_api_endpoint VARCHAR(500),
  client_api_model_preferences JSONB DEFAULT '{}'::JSONB,
  
  -- Budget and cost controls
  client_monthly_budget DECIMAL(10,2) DEFAULT 100.00,
  client_budget_alerts BOOLEAN DEFAULT TRUE,
  client_budget_alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80% threshold
  client_auto_disable_on_budget BOOLEAN DEFAULT FALSE,
  
  -- Feature preferences
  preferred_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  disabled_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Security and compliance
  api_key_last_validated TIMESTAMPTZ,
  api_key_status api_key_status_enum DEFAULT 'not_configured',
  last_health_check TIMESTAMPTZ,
  
  -- Wedding industry preferences
  vendor_type vendor_type_enum,
  seasonal_budget_adjustment BOOLEAN DEFAULT FALSE, -- Higher budget in peak season
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id),
  INDEX idx_ai_config_supplier (supplier_id),
  INDEX idx_ai_config_enabled (client_api_enabled),
  INDEX idx_ai_config_provider (client_api_provider)
);

CREATE TYPE api_provider_enum AS ENUM ('openai', 'anthropic', 'azure_openai', 'custom');
CREATE TYPE api_key_status_enum AS ENUM ('not_configured', 'valid', 'invalid', 'expired', 'quota_exceeded');

-- AI usage tracking with cost attribution
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  
  -- API source tracking
  api_source api_source_enum NOT NULL, -- 'platform' or 'client'
  api_provider api_provider_enum,
  
  -- Usage details
  operation_type VARCHAR(100) NOT NULL, -- 'form_generation', 'chatbot_query', etc.
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Cost tracking
  estimated_cost DECIMAL(8,4) DEFAULT 0, -- Cost in USD
  actual_cost DECIMAL(8,4), -- Actual cost if available from provider
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Context and metadata
  request_id VARCHAR(100), -- For debugging and tracing
  model_used VARCHAR(100),
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Wedding business context
  client_id UUID REFERENCES clients(id), -- Which client this usage was for
  wedding_context JSONB, -- Wedding date, type, etc.
  seasonal_context JSONB, -- Peak season multipliers, etc.
  
  -- Performance metrics
  user_satisfaction_rating INTEGER, -- 1-5 if provided
  feature_completion BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_usage_supplier_date (supplier_id, created_at DESC),
  INDEX idx_usage_feature (feature_name),
  INDEX idx_usage_source (api_source),
  INDEX idx_usage_cost (created_at, estimated_cost) WHERE estimated_cost > 0
);

CREATE TYPE api_source_enum AS ENUM ('platform', 'client');

-- Feature definitions and configurations
CREATE TABLE ai_feature_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Feature classification
  category ai_feature_category_enum NOT NULL,
  api_source api_source_enum NOT NULL,
  required_tier tier_enum,
  
  -- Cost and usage parameters
  estimated_cost_per_use DECIMAL(6,4) DEFAULT 0,
  token_multiplier DECIMAL(5,3) DEFAULT 1.0, -- For cost calculations
  rate_limit_per_hour INTEGER DEFAULT 100,
  rate_limit_per_day INTEGER DEFAULT 1000,
  
  -- Wedding industry specific
  vendor_types vendor_type_enum[] DEFAULT ARRAY[]::vendor_type_enum[],
  seasonal_availability BOOLEAN DEFAULT TRUE, -- Available year-round
  peak_season_cost_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  -- Feature flags and controls
  enabled BOOLEAN DEFAULT TRUE,
  beta BOOLEAN DEFAULT FALSE,
  requires_setup BOOLEAN DEFAULT FALSE,
  
  -- Documentation and help
  setup_instructions TEXT,
  usage_examples JSONB,
  help_article_id UUID REFERENCES kb_articles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_features_category (category),
  INDEX idx_features_source (api_source),
  INDEX idx_features_tier (required_tier),
  INDEX idx_features_enabled (enabled)
);

CREATE TYPE ai_feature_category_enum AS ENUM (
  'onboarding', 'content_generation', 'communication', 'analysis', 
  'automation', 'optimization', 'personalization', 'insights'
);

-- Monthly usage aggregations for billing and analytics
CREATE TABLE ai_monthly_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  month DATE NOT NULL, -- First day of month
  
  -- Platform usage summary
  platform_operations INTEGER DEFAULT 0,
  platform_tokens INTEGER DEFAULT 0,
  platform_estimated_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Client usage summary
  client_operations INTEGER DEFAULT 0,
  client_tokens INTEGER DEFAULT 0,
  client_actual_cost DECIMAL(10,2) DEFAULT 0,
  client_estimated_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Feature breakdown
  feature_usage_breakdown JSONB DEFAULT '{}'::JSONB,
  top_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Budget tracking
  client_budget_allocated DECIMAL(10,2),
  client_budget_remaining DECIMAL(10,2),
  budget_alerts_sent INTEGER DEFAULT 0,
  
  -- Performance and satisfaction
  avg_response_time_ms DECIMAL(8,2),
  success_rate DECIMAL(5,4),
  user_satisfaction_avg DECIMAL(3,2),
  
  -- Wedding seasonality
  is_peak_season BOOLEAN DEFAULT FALSE,
  seasonal_usage_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, month),
  INDEX idx_monthly_usage_date (month DESC),
  INDEX idx_monthly_usage_cost (client_actual_cost DESC)
);

-- API key management and security
CREATE TABLE ai_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  
  -- Key information
  key_name VARCHAR(255) NOT NULL, -- User-friendly name
  api_provider api_provider_enum NOT NULL,
  key_hash VARCHAR(128) NOT NULL, -- Encrypted key
  key_preview VARCHAR(20), -- Last few characters for identification
  
  -- Security and validation
  status api_key_status_enum DEFAULT 'not_configured',
  last_validated TIMESTAMPTZ,
  validation_error TEXT,
  
  -- Usage controls
  enabled BOOLEAN DEFAULT TRUE,
  rate_limit_override INTEGER, -- Custom rate limits
  allowed_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Cost controls
  monthly_spend_limit DECIMAL(10,2),
  daily_spend_limit DECIMAL(8,2),
  per_request_limit DECIMAL(6,4),
  
  -- Monitoring and alerts
  last_used TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  total_cost DECIMAL(12,4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_api_keys_supplier (supplier_id),
  INDEX idx_api_keys_provider (api_provider),
  INDEX idx_api_keys_status (status)
);

-- Feature access audit trail
CREATE TABLE ai_feature_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  
  -- Access details
  access_granted BOOLEAN NOT NULL,
  access_reason access_reason_enum NOT NULL,
  api_source_used api_source_enum,
  
  -- Context
  user_tier tier_enum,
  client_api_configured BOOLEAN,
  request_context JSONB,
  
  -- Wedding business context
  wedding_date DATE,
  peak_season_active BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_access_log_supplier (supplier_id),
  INDEX idx_access_log_feature (feature_key),
  INDEX idx_access_log_granted (access_granted)
);

CREATE TYPE access_reason_enum AS ENUM (
  'tier_included', 'client_api_configured', 'trial_granted', 
  'beta_access', 'insufficient_tier', 'no_api_key', 
  'budget_exceeded', 'rate_limit_exceeded', 'feature_disabled'
);
```

## API Endpoints

### Feature Access and Configuration

```typescript
// AI feature access management
GET /api/ai/features
interface GetAIFeaturesResponse {
  platformFeatures: PlatformFeature[];
  clientFeatures: ClientFeature[];
  userAccess: {
    tier: TierLevel;
    platformFeaturesEnabled: boolean;
    clientAPIConfigured: boolean;
    availableFeatures: string[];
  };
  usageSummary: {
    thisMonth: MonthlyUsageStats;
    budgetStatus: BudgetStatus;
  };
}

// Check access to specific feature
GET /api/ai/features/:featureKey/access
interface FeatureAccessResponse {
  hasAccess: boolean;
  accessReason: AccessReason;
  apiSource: 'platform' | 'client';
  costEstimate?: {
    estimatedCostPerUse: number;
    remainingBudget?: number;
  };
  requirements?: {
    requiredTier?: TierLevel;
    requiresAPIKey?: boolean;
    setupSteps?: SetupStep[];
  };
}

// Configure client API settings
POST /api/ai/client-config
interface ClientAPIConfigRequest {
  provider: APIProvider;
  apiKey: string; // Will be encrypted
  endpoint?: string; // For custom endpoints
  modelPreferences?: {
    defaultModel: string;
    fallbackModel?: string;
    temperature?: number;
  };
  budgetSettings: {
    monthlyBudget: number;
    dailyLimit?: number;
    enableAlerts: boolean;
    alertThreshold: number;
    autoDisableOnLimit: boolean;
  };
  enabledFeatures: string[];
}

// Validate API key and test connection
POST /api/ai/client-config/validate
interface ValidateAPIKeyRequest {
  provider: APIProvider;
  apiKey: string;
  testEndpoint?: string;
}

interface ValidateAPIKeyResponse {
  valid: boolean;
  error?: string;
  providerInfo?: {
    organizationId?: string;
    availableModels: string[];
    currentQuota?: QuotaInfo;
  };
  estimatedMonthlyCost?: {
    lowUsage: number;
    mediumUsage: number;
    highUsage: number;
  };
}
```

### Usage Tracking and Analytics

```typescript
// Track AI feature usage
POST /api/ai/usage/track
interface TrackUsageRequest {
  featureKey: string;
  operationType: string;
  apiSource: 'platform' | 'client';
  tokensUsed: {
    input: number;
    output: number;
  };
  modelUsed: string;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  context?: {
    clientId?: string;
    weddingDate?: string;
    userSatisfaction?: number;
  };
}

// Get usage analytics
GET /api/ai/analytics
interface AIAnalyticsRequest {
  timeframe: '7d' | '30d' | '90d' | '1y';
  groupBy?: 'feature' | 'day' | 'week' | 'month';
  includeProjections?: boolean;
}

interface AIAnalyticsResponse {
  summary: {
    totalOperations: number;
    totalCost: number;
    platformCost: number;
    clientCost: number;
    avgResponseTime: number;
    successRate: number;
  };
  breakdown: {
    byFeature: FeatureUsageStats[];
    byAPISource: APISourceStats[];
    byTimeRange: TimeRangeStats[];
  };
  budgetStatus: {
    currentMonth: BudgetStatus;
    projectedSpend: number;
    recommendedBudget: number;
  };
  recommendations: UsageRecommendation[];
}

// Get cost projections and budget recommendations
GET /api/ai/cost-projections
interface CostProjectionResponse {
  currentUsage: CurrentUsageStats;
  projections: {
    nextMonth: CostProjection;
    peakSeason: CostProjection;
    annualEstimate: CostProjection;
  };
  recommendations: {
    budgetOptimizations: BudgetRecommendation[];
    featureOptimizations: FeatureRecommendation[];
    tierRecommendations?: TierRecommendation[];
  };
  costComparisons: {
    platformVsClient: CostComparison;
    providerComparisons: ProviderComparison[];
  };
}
```

## Frontend Components

### AI Features Dashboard

```tsx
// Main AI features overview with clear platform vs client distinction
// components/ai/AIFeaturesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAIFeatures, useUser } from '@/hooks';
import { PlatformFeaturesCard } from './PlatformFeaturesCard';
import { ClientFeaturesCard } from './ClientFeaturesCard';
import { UsageAnalytics } from './UsageAnalytics';
import { SetupWizard } from './SetupWizard';

export function AIFeaturesDashboard() {
  const { user } = useUser();
  const {
    platformFeatures,
    clientFeatures,
    userAccess,
    usageSummary,
    isLoading
  } = useAIFeatures();

  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'settings'>('overview');

  return (
    <div className="ai-features-dashboard">
      <div className="dashboard-header mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI Features
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your AI-powered features and usage
            </p>
          </div>
          
          {!userAccess.clientAPIConfigured && (
            <button
              onClick={() => setShowSetupWizard(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Setup Advanced AI
            </button>
          )}
        </div>

        {/* Usage Summary Bar */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="usage-stat">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Platform Features</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {usageSummary.thisMonth.platformOperations}
              </div>
              <div className="text-sm text-green-600">
                Included in subscription
              </div>
            </div>

            <div className="usage-stat">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Client Features</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {userAccess.clientAPIConfigured ? usageSummary.thisMonth.clientOperations : 'Not Set Up'}
              </div>
              <div className="text-sm text-gray-600">
                {userAccess.clientAPIConfigured 
                  ? `$${usageSummary.thisMonth.clientCost.toFixed(2)} spent`
                  : 'Setup required'
                }
              </div>
            </div>

            <div className="usage-stat">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(usageSummary.thisMonth.successRate * 100)}%
              </div>
              <div className="text-sm text-gray-600">
                This month
              </div>
            </div>

            <div className="usage-stat">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Avg Response</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(usageSummary.thisMonth.avgResponseTime / 1000)}s
              </div>
              <div className="text-sm text-gray-600">
                Response time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {[
              { key: 'overview', label: 'Overview', icon: Grid },
              { key: 'analytics', label: 'Analytics', icon: BarChart },
              { key: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-8">
          <PlatformFeaturesCard
            features={platformFeatures}
            userTier={user.tier}
            usage={usageSummary.thisMonth}
            enabled={userAccess.platformFeaturesEnabled}
          />
          
          <ClientFeaturesCard
            features={clientFeatures}
            configured={userAccess.clientAPIConfigured}
            usage={usageSummary.thisMonth}
            budgetStatus={usageSummary.budgetStatus}
            onSetup={() => setShowSetupWizard(true)}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <UsageAnalytics
          timeframe="30d"
          includeCostProjections={true}
          showRecommendations={true}
        />
      )}

      {activeTab === 'settings' && (
        <AISettingsPanel
          currentConfig={userAccess}
          onConfigUpdate={handleConfigUpdate}
        />
      )}

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <SetupWizard
          onClose={() => setShowSetupWizard(false)}
          onComplete={handleSetupComplete}
          userType={user.userType}
          vendorType={user.vendorType}
        />
      )}
    </div>
  );
}

// Platform features card showing included AI features
export function PlatformFeaturesCard({
  features,
  userTier,
  usage,
  enabled
}: PlatformFeaturesCardProps) {
  return (
    <div className="platform-features-card bg-white border border-gray-200 rounded-xl p-6">
      <div className="card-header mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Platform Features
            </h3>
            <p className="text-sm text-gray-600">
              Included in your {userTier} subscription
            </p>
          </div>
        </div>
        
        <div className="status-badge">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            enabled 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Features List */}
      <div className="features-list space-y-4 mb-6">
        {features.map(feature => (
          <div key={feature.key} className="feature-item">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">
                    {feature.name}
                  </h4>
                  {feature.beta && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">
                      Beta
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {feature.description}
                </p>
                
                {/* Usage this month */}
                <div className="usage-stats flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    {usage.featureBreakdown[feature.key]?.operations || 0} uses this month
                  </span>
                  {feature.monthlyLimit && (
                    <span>
                      Limit: {feature.monthlyLimit} per month
                    </span>
                  )}
                </div>
              </div>

              <div className="feature-status ml-4">
                {enabled && hasRequiredTier(userTier, feature.requiredTier) ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Usage bar for features with limits */}
            {feature.monthlyLimit && usage.featureBreakdown[feature.key] && (
              <div className="usage-bar mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">
                    Monthly usage
                  </span>
                  <span className="text-xs text-gray-700">
                    {usage.featureBreakdown[feature.key].operations} / {feature.monthlyLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((usage.featureBreakdown[feature.key].operations / feature.monthlyLimit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upgrade CTA if needed */}
      {!enabled && (
        <div className="upgrade-cta bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ArrowUp className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900">
                Upgrade to unlock platform AI features
              </p>
              <p className="text-xs text-purple-700 mt-1">
                No additional costs or setup required
              </p>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Client features card for advanced AI with own API keys
export function ClientFeaturesCard({
  features,
  configured,
  usage,
  budgetStatus,
  onSetup
}: ClientFeaturesCardProps) {
  return (
    <div className="client-features-card bg-white border border-gray-200 rounded-xl p-6">
      <div className="card-header mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Advanced AI Features
            </h3>
            <p className="text-sm text-gray-600">
              Powered by your own OpenAI account
            </p>
          </div>
        </div>

        <div className="status-badge">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            configured 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${configured ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            {configured ? 'Configured' : 'Setup Required'}
          </span>
        </div>
      </div>

      {configured ? (
        <>
          {/* Budget Status */}
          <div className="budget-status mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-900">
                This Month's Usage
              </span>
              <span className="text-lg font-bold text-blue-900">
                ${usage.clientCost.toFixed(2)}
              </span>
            </div>
            
            <div className="budget-bar">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-blue-700">
                  Budget: ${budgetStatus.monthlyBudget.toFixed(2)}
                </span>
                <span className="text-xs text-blue-700">
                  {Math.round(budgetStatus.usagePercentage)}% used
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    budgetStatus.usagePercentage > 80 
                      ? 'bg-red-500' 
                      : budgetStatus.usagePercentage > 60 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(budgetStatus.usagePercentage, 100)}%`
                  }}
                ></div>
              </div>
            </div>

            {budgetStatus.usagePercentage > 80 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Approaching budget limit</span>
              </div>
            )}
          </div>

          {/* Features List */}
          <div className="features-list space-y-4">
            {features.map(feature => (
              <div key={feature.key} className="feature-item">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {feature.name}
                      </h4>
                      {feature.estimatedCostRange && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                          {feature.estimatedCostRange} / month
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {feature.description}
                    </p>
                    
                    <div className="usage-stats flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {usage.featureBreakdown[feature.key]?.operations || 0} uses
                      </span>
                      <span>
                        ${(usage.featureBreakdown[feature.key]?.cost || 0).toFixed(2)} spent
                      </span>
                    </div>
                  </div>

                  <Switch
                    checked={feature.enabled}
                    onChange={(enabled) => handleFeatureToggle(feature.key, enabled)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Setup Required State */}
          <div className="setup-required text-center py-8">
            <div className="mb-4">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Advanced AI Features Available
              </h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your OpenAI account to unlock powerful AI features like custom chatbots, 
                advanced content generation, and predictive analytics.
              </p>
            </div>

            {/* Feature Preview */}
            <div className="features-preview mb-6 space-y-3">
              {features.slice(0, 3).map(feature => (
                <div key={feature.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <feature.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{feature.name}</span>
                  </div>
                  <span className="text-sm text-blue-600">
                    {feature.estimatedCostRange}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onSetup}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Set Up Advanced AI
            </button>

            <p className="text-xs text-gray-500 mt-3">
              Requires OpenAI account • Estimated setup time: 5 minutes
            </p>
          </div>
        </>
      )}
    </div>
  );
}
```

### AI Setup Wizard

```tsx
// Guided setup wizard for client API configuration
// components/ai/SetupWizard.tsx
export function SetupWizard({
  onClose,
  onComplete,
  userType,
  vendorType
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState<SetupData>({
    provider: 'openai',
    apiKey: '',
    budgetSettings: {
      monthlyBudget: 50,
      enableAlerts: true,
      alertThreshold: 0.8,
      autoDisableOnLimit: false
    },
    enabledFeatures: []
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const steps = [
    { id: 1, title: 'Choose Provider', description: 'Select your AI provider' },
    { id: 2, title: 'API Configuration', description: 'Enter your API credentials' },
    { id: 3, title: 'Budget Setup', description: 'Configure cost controls' },
    { id: 4, title: 'Feature Selection', description: 'Choose features to enable' },
    { id: 5, title: 'Review & Complete', description: 'Review your configuration' }
  ];

  const validateAPIKey = async () => {
    setIsValidating(true);
    try {
      const result = await aiApi.validateAPIKey({
        provider: setupData.provider,
        apiKey: setupData.apiKey
      });
      setValidationResult(result);
      if (result.valid) {
        setCurrentStep(3);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: 'Failed to validate API key'
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <div className="setup-wizard">
        {/* Header with progress */}
        <div className="wizard-header p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Set Up Advanced AI Features
          </h2>
          
          {/* Progress indicator */}
          <div className="progress-steps flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`step-indicator w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id
                    ? 'bg-purple-600 text-white'
                    : currentStep === step.id
                      ? 'bg-purple-100 text-purple-600 border-2 border-purple-600'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-connector flex-1 h-px mx-4 ${
                    currentStep > step.id ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="current-step-info mt-4">
            <h3 className="font-semibold text-gray-900">
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-gray-600 text-sm">
              {steps[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Step content */}
        <div className="wizard-content p-6">
          {currentStep === 1 && (
            <ProviderSelectionStep
              selectedProvider={setupData.provider}
              onProviderChange={(provider) => 
                setSetupData({ ...setupData, provider })
              }
              userType={userType}
              vendorType={vendorType}
            />
          )}

          {currentStep === 2 && (
            <APIConfigurationStep
              provider={setupData.provider}
              apiKey={setupData.apiKey}
              onAPIKeyChange={(apiKey) => 
                setSetupData({ ...setupData, apiKey })
              }
              validationResult={validationResult}
              isValidating={isValidating}
              onValidate={validateAPIKey}
            />
          )}

          {currentStep === 3 && (
            <BudgetSetupStep
              settings={setupData.budgetSettings}
              onSettingsChange={(budgetSettings) =>
                setSetupData({ ...setupData, budgetSettings })
              }
              usageEstimates={validationResult?.estimatedMonthlyCost}
              vendorType={vendorType}
            />
          )}

          {currentStep === 4 && (
            <FeatureSelectionStep
              availableFeatures={getAvailableFeaturesForProvider(setupData.provider)}
              selectedFeatures={setupData.enabledFeatures}
              onFeaturesChange={(enabledFeatures) =>
                setSetupData({ ...setupData, enabledFeatures })
              }
              budgetSettings={setupData.budgetSettings}
            />
          )}

          {currentStep === 5 && (
            <ReviewStep
              setupData={setupData}
              validationResult={validationResult}
              onComplete={() => handleComplete(setupData)}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-footer flex justify-between items-center p-6 border-t">
          <button
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex gap-3">
            {currentStep < 5 && (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNextStep()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            )}

            {currentStep === 5 && (
              <button
                onClick={() => handleComplete(setupData)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Provider selection step with recommendations
function ProviderSelectionStep({
  selectedProvider,
  onProviderChange,
  userType,
  vendorType
}: ProviderSelectionStepProps) {
  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      logo: '/images/providers/openai.svg',
      description: 'Industry standard with GPT-4 and comprehensive features',
      pricing: '$20-100/month typical',
      features: ['GPT-4', 'Text Generation', 'Code Generation', 'Image Analysis'],
      recommended: true,
      pros: [
        'Most feature-complete',
        'Best performance for wedding industry content',
        'Extensive model options'
      ],
      cons: [
        'Higher cost for heavy usage',
        'Rate limits on free tier'
      ]
    },
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      logo: '/images/providers/anthropic.svg',
      description: 'High-quality conversations with strong safety features',
      pricing: '$15-75/month typical',
      features: ['Claude 3', 'Long Context', 'Safety-First', 'Reasoning'],
      recommended: false,
      pros: [
        'Excellent for customer communication',
        'Strong safety features',
        'Good value for conversational AI'
      ],
      cons: [
        'Limited image capabilities',
        'Newer provider'
      ]
    }
  ];

  const getRecommendedProvider = () => {
    if (vendorType === 'photographer' || vendorType === 'planner') {
      return 'openai'; // Better for content generation and analysis
    }
    return 'openai'; // Default recommendation
  };

  return (
    <div className="provider-selection">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          Choose Your AI Provider
        </h4>
        <p className="text-gray-600">
          Select the AI provider that best fits your needs and budget. 
          You can change this later if needed.
        </p>
      </div>

      <div className="providers-grid space-y-4">
        {providers.map(provider => (
          <div
            key={provider.id}
            className={`provider-card border-2 rounded-xl p-6 cursor-pointer transition-all ${
              selectedProvider === provider.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onProviderChange(provider.id)}
          >
            <div className="flex items-start gap-4">
              <div className="provider-logo">
                <img 
                  src={provider.logo} 
                  alt={provider.name}
                  className="w-12 h-12"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-lg font-semibold text-gray-900">
                    {provider.name}
                  </h5>
                  {provider.recommended && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                      Recommended
                    </span>
                  )}
                  {getRecommendedProvider() === provider.id && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                      Best for {vendorType}s
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-3">
                  {provider.description}
                </p>

                <div className="provider-details grid md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="font-medium text-gray-900 mb-2">Features</h6>
                    <div className="flex flex-wrap gap-1">
                      {provider.features.map(feature => (
                        <span
                          key={feature}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h6 className="font-medium text-gray-900 mb-2">Pricing</h6>
                    <p className="text-sm text-gray-600">{provider.pricing}</p>
                  </div>
                </div>

                <div className="pros-cons grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h6 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Pros
                    </h6>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {provider.pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h6 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Considerations
                    </h6>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {provider.cons.map((con, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="selection-indicator">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedProvider === provider.id
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300'
                }`}>
                  {selectedProvider === provider.id && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="help-text mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">
              Not sure which to choose?
            </p>
            <p className="text-blue-800">
              OpenAI is recommended for most wedding suppliers due to its comprehensive 
              features and strong performance with wedding industry content. You can 
              always switch providers later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Business Logic Implementation

### Feature Access Control System

```typescript
// Advanced AI feature gating with cost and usage controls
// lib/ai/featureAccessControl.ts
export class AIFeatureAccessControl {
  private readonly config: AIConfigService;
  private readonly usage: AIUsageService;
  private readonly billing: BillingService;

  constructor() {
    this.config = new AIConfigService();
    this.usage = new AIUsageService();
    this.billing = new BillingService();
  }

  async checkFeatureAccess(
    supplierId: string,
    featureKey: string,
    context?: AccessContext
  ): Promise<FeatureAccessResult> {
    // Get user and feature information
    const [supplier, feature, userConfig] = await Promise.all([
      this.getSupplier(supplierId),
      this.getFeatureDefinition(featureKey),
      this.config.getUserConfig(supplierId)
    ]);

    // Log access attempt
    await this.logAccessAttempt(supplierId, featureKey, context);

    // Check if feature exists and is enabled
    if (!feature || !feature.enabled) {
      return this.denyAccess('feature_disabled', {
        feature: featureKey,
        reason: 'Feature is not available'
      });
    }

    // Determine API source and check access
    if (feature.apiSource === 'platform') {
      return await this.checkPlatformFeatureAccess(supplier, feature, userConfig);
    } else {
      return await this.checkClientFeatureAccess(supplier, feature, userConfig, context);
    }
  }

  private async checkPlatformFeatureAccess(
    supplier: Supplier,
    feature: AIFeatureDefinition,
    config: AIConfig
  ): Promise<FeatureAccessResult> {
    // Check subscription tier
    if (!this.hasRequiredTier(supplier.tier, feature.requiredTier)) {
      return this.denyAccess('insufficient_tier', {
        required: feature.requiredTier,
        current: supplier.tier,
        upgradeUrl: `/billing/upgrade?feature=${feature.key}`
      });
    }

    // Check if platform features are enabled
    if (!config.platformFeaturesEnabled) {
      return this.denyAccess('platform_features_disabled', {
        reason: 'Platform AI features are disabled',
        settingsUrl: '/ai/settings'
      });
    }

    // Check monthly limits for this feature
    const monthlyUsage = await this.usage.getMonthlyUsage(supplier.id, feature.key);
    if (feature.monthlyLimit && monthlyUsage.operations >= feature.monthlyLimit) {
      return this.denyAccess('monthly_limit_exceeded', {
        limit: feature.monthlyLimit,
        used: monthlyUsage.operations,
        resetDate: this.getNextMonthStart()
      });
    }

    // Check rate limits
    const rateLimitCheck = await this.checkRateLimit(supplier.id, feature);
    if (!rateLimitCheck.allowed) {
      return this.denyAccess('rate_limit_exceeded', {
        limit: rateLimitCheck.limit,
        resetTime: rateLimitCheck.resetTime
      });
    }

    // Check wedding season adjustments
    const seasonalCheck = this.checkSeasonalAvailability(feature, supplier);
    if (!seasonalCheck.available) {
      return this.denyAccess('seasonal_unavailable', seasonalCheck.reason);
    }

    return this.grantAccess('tier_included', {
      apiSource: 'platform',
      estimatedCost: feature.estimatedCostPerUse,
      rateLimit: rateLimitCheck.remaining,
      monthlyUsageRemaining: feature.monthlyLimit ? 
        feature.monthlyLimit - monthlyUsage.operations : null
    });
  }

  private async checkClientFeatureAccess(
    supplier: Supplier,
    feature: AIFeatureDefinition,
    config: AIConfig,
    context?: AccessContext
  ): Promise<FeatureAccessResult> {
    // Check if client API is configured
    if (!config.clientApiEnabled || !config.clientApiKey) {
      return this.denyAccess('no_api_key', {
        reason: 'Client API key not configured',
        setupUrl: '/ai/setup',
        estimatedSetupTime: '5 minutes'
      });
    }

    // Validate API key status
    if (config.clientApiKeyStatus !== 'valid') {
      return this.denyAccess('invalid_api_key', {
        status: config.clientApiKeyStatus,
        lastValidated: config.apiKeyLastValidated,
        revalidateUrl: '/ai/settings/validate'
      });
    }

    // Check if this specific feature is enabled
    if (config.disabledFeatures?.includes(feature.key)) {
      return this.denyAccess('feature_disabled_by_user', {
        reason: 'Feature disabled in user settings',
        settingsUrl: '/ai/settings'
      });
    }

    // Check budget limits
    const budgetCheck = await this.checkBudgetLimits(supplier.id, config, feature);
    if (!budgetCheck.allowed) {
      return this.denyAccess('budget_exceeded', budgetCheck.details);
    }

    // Check daily/hourly rate limits
    const rateLimitCheck = await this.checkRateLimit(supplier.id, feature);
    if (!rateLimitCheck.allowed) {
      return this.denyAccess('rate_limit_exceeded', {
        limit: rateLimitCheck.limit,
        resetTime: rateLimitCheck.resetTime
      });
    }

    // Estimate cost for this operation
    const costEstimate = await this.estimateOperationCost(
      feature,
      context,
      config.clientApiProvider
    );

    // Check if this operation would exceed daily budget
    const dailyUsage = await this.usage.getDailyUsage(supplier.id);
    if (config.clientDailyLimit && 
        (dailyUsage.cost + costEstimate) > config.clientDailyLimit) {
      return this.denyAccess('daily_budget_exceeded', {
        dailyLimit: config.clientDailyLimit,
        currentSpend: dailyUsage.cost,
        estimatedCost: costEstimate
      });
    }

    return this.grantAccess('client_api_configured', {
      apiSource: 'client',
      provider: config.clientApiProvider,
      estimatedCost: costEstimate,
      budgetRemaining: budgetCheck.remaining,
      rateLimit: rateLimitCheck.remaining
    });
  }

  private async checkBudgetLimits(
    supplierId: string,
    config: AIConfig,
    feature: AIFeatureDefinition
  ): Promise<BudgetCheckResult> {
    const monthlyUsage = await this.usage.getMonthlyUsage(supplierId);
    
    // Check monthly budget
    if (config.clientMonthlyBudget && 
        monthlyUsage.clientActualCost >= config.clientMonthlyBudget) {
      
      // Check if auto-disable is enabled
      if (config.clientAutoDisableOnBudget) {
        await this.config.disableClientFeatures(supplierId);
      }

      return {
        allowed: false,
        details: {
          budgetType: 'monthly',
          limit: config.clientMonthlyBudget,
          used: monthlyUsage.clientActualCost,
          autoDisabled: config.clientAutoDisableOnBudget
        }
      };
    }

    // Check if approaching budget limit (for warnings)
    const budgetUsagePercentage = monthlyUsage.clientActualCost / config.clientMonthlyBudget;
    if (budgetUsagePercentage >= config.clientBudgetAlertThreshold) {
      // Send alert if not already sent recently
      await this.sendBudgetAlert(supplierId, {
        percentage: budgetUsagePercentage,
        remaining: config.clientMonthlyBudget - monthlyUsage.clientActualCost,
        projectedOverage: this.calculateProjectedOverage(monthlyUsage, config.clientMonthlyBudget)
      });
    }

    return {
      allowed: true,
      remaining: config.clientMonthlyBudget - monthlyUsage.clientActualCost,
      usagePercentage: budgetUsagePercentage
    };
  }

  private checkSeasonalAvailability(
    feature: AIFeatureDefinition,
    supplier: Supplier
  ): SeasonalAvailabilityResult {
    if (!feature.seasonalAvailability) {
      return { available: true };
    }

    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = [4, 5, 6, 7, 8, 9].includes(currentMonth); // Apr-Sep

    // Some features may be limited during peak season to control costs
    if (isPeakSeason && feature.category === 'bulk_processing') {
      return {
        available: false,
        reason: {
          message: 'Feature limited during peak wedding season',
          alternative: 'Use individual processing instead',
          availableFrom: new Date(new Date().getFullYear(), 9, 1) // October 1st
        }
      };
    }

    // Apply peak season cost multiplier
    if (isPeakSeason && feature.peakSeasonCostMultiplier > 1) {
      return {
        available: true,
        costMultiplier: feature.peakSeasonCostMultiplier,
        notice: `${Math.round((feature.peakSeasonCostMultiplier - 1) * 100)}% higher cost during peak season`
      };
    }

    return { available: true };
  }

  private async estimateOperationCost(
    feature: AIFeatureDefinition,
    context?: AccessContext,
    provider: string = 'openai'
  ): Promise<number> {
    let baseCost = feature.estimatedCostPerUse;

    // Adjust based on context (if provided)
    if (context?.estimatedInputTokens) {
      const tokenCost = this.getTokenCost(provider, feature.category);
      baseCost = (context.estimatedInputTokens * tokenCost.input) + 
                 (context.estimatedOutputTokens || context.estimatedInputTokens * 0.3) * tokenCost.output;
    }

    // Apply feature-specific multipliers
    baseCost *= feature.tokenMultiplier;

    // Apply seasonal adjustments
    const currentMonth = new Date().getMonth() + 1;
    if ([4, 5, 6, 7, 8, 9].includes(currentMonth)) { // Peak wedding season
      baseCost *= feature.peakSeasonCostMultiplier;
    }

    return Math.round(baseCost * 10000) / 10000; // Round to 4 decimal places
  }

  private grantAccess(
    reason: AccessReason,
    details: AccessDetails
  ): FeatureAccessResult {
    return {
      hasAccess: true,
      accessReason: reason,
      apiSource: details.apiSource,
      details,
      timestamp: new Date()
    };
  }

  private denyAccess(
    reason: AccessReason,
    details: AccessDetails
  ): FeatureAccessResult {
    return {
      hasAccess: false,
      accessReason: reason,
      details,
      timestamp: new Date()
    };
  }

  private async logAccessAttempt(
    supplierId: string,
    featureKey: string,
    context?: AccessContext
  ): Promise<void> {
    // Log for analytics and debugging
    await this.db.query(`
      INSERT INTO ai_feature_access_log (
        supplier_id, feature_key, request_context, 
        wedding_date, peak_season_active
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      supplierId,
      featureKey,
      context ? JSON.stringify(context) : null,
      context?.weddingDate,
      this.isPeakSeason()
    ]);
  }
}

// AI usage tracking and cost management
export class AIUsageService {
  async trackUsage(request: TrackUsageRequest): Promise<void> {
    const {
      supplierId,
      featureKey,
      apiSource,
      tokensUsed,
      modelUsed,
      responseTime,
      success,
      context
    } = request;

    // Calculate actual cost
    const actualCost = await this.calculateActualCost(
      tokensUsed,
      modelUsed,
      apiSource,
      featureKey
    );

    // Store usage record
    await this.db.query(`
      INSERT INTO ai_usage_logs (
        supplier_id, feature_name, api_source, operation_type,
        input_tokens, output_tokens, total_tokens,
        estimated_cost, actual_cost, model_used, response_time_ms,
        success, client_id, wedding_context, seasonal_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      supplierId,
      featureKey,
      apiSource,
      context?.operationType || 'unknown',
      tokensUsed.input,
      tokensUsed.output,
      tokensUsed.input + tokensUsed.output,
      request.estimatedCost || actualCost,
      actualCost,
      modelUsed,
      responseTime,
      success,
      context?.clientId,
      context?.weddingContext ? JSON.stringify(context.weddingContext) : null,
      JSON.stringify({
        isPeakSeason: this.isPeakSeason(),
        month: new Date().getMonth() + 1
      })
    ]);

    // Update monthly aggregations
    await this.updateMonthlyUsage(supplierId, featureKey, actualCost, apiSource);

    // Check for budget alerts
    await this.checkBudgetAlerts(supplierId);

    // Track performance metrics
    await this.updatePerformanceMetrics(supplierId, featureKey, {
      responseTime,
      success,
      tokensUsed: tokensUsed.input + tokensUsed.output
    });
  }

  private async calculateActualCost(
    tokensUsed: TokenUsage,
    model: string,
    apiSource: string,
    featureKey: string
  ): Promise<number> {
    if (apiSource === 'platform') {
      // Platform cost is absorbed, but track for internal analytics
      return 0;
    }

    // Get current pricing for the model
    const pricing = await this.getModelPricing(model);
    if (!pricing) {
      // Fallback to estimated cost
      const feature = await this.getFeatureDefinition(featureKey);
      return feature?.estimatedCostPerUse || 0;
    }

    const inputCost = tokensUsed.input * pricing.inputCostPer1000 / 1000;
    const outputCost = tokensUsed.output * pricing.outputCostPer1000 / 1000;

    return inputCost + outputCost;
  }

  private async updateMonthlyUsage(
    supplierId: string,
    featureKey: string,
    cost: number,
    apiSource: string
  ): Promise<void> {
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of month
    currentMonth.setHours(0, 0, 0, 0);

    await this.db.query(`
      INSERT INTO ai_monthly_usage (
        supplier_id, month, 
        ${apiSource === 'platform' ? 'platform_operations, platform_estimated_cost' : 'client_operations, client_actual_cost'},
        feature_usage_breakdown
      ) VALUES (
        $1, $2, 1, $3, 
        jsonb_build_object($4, jsonb_build_object('operations', 1, 'cost', $3))
      )
      ON CONFLICT (supplier_id, month) DO UPDATE SET
        ${apiSource === 'platform' ? 'platform_operations = ai_monthly_usage.platform_operations + 1, platform_estimated_cost = ai_monthly_usage.platform_estimated_cost + $3' : 'client_operations = ai_monthly_usage.client_operations + 1, client_actual_cost = ai_monthly_usage.client_actual_cost + $3'},
        feature_usage_breakdown = ai_monthly_usage.feature_usage_breakdown || 
          jsonb_build_object($4, 
            jsonb_build_object(
              'operations', COALESCE((ai_monthly_usage.feature_usage_breakdown->$4->>'operations')::int, 0) + 1,
              'cost', COALESCE((ai_monthly_usage.feature_usage_breakdown->$4->>'cost')::numeric, 0) + $3
            )
          ),
        updated_at = NOW()
    `, [supplierId, currentMonth, cost, featureKey]);
  }
}
```

## Success Metrics & KPIs

### Platform vs Client API Analytics

```sql
-- Comprehensive API usage and cost analysis
-- Platform vs Client feature utilization

-- 1. API Source Distribution and Cost Analysis
WITH api_usage_summary AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    api_source,
    COUNT(*) as total_operations,
    COUNT(DISTINCT supplier_id) as unique_users,
    SUM(input_tokens + output_tokens) as total_tokens,
    
    -- Cost analysis
    SUM(CASE WHEN api_source = 'platform' THEN estimated_cost ELSE actual_cost END) as total_cost,
    AVG(CASE WHEN api_source = 'platform' THEN estimated_cost ELSE actual_cost END) as avg_cost_per_operation,
    
    -- Performance metrics
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    ROUND(
      COUNT(*) FILTER (WHERE success = true)::FLOAT / COUNT(*) * 100, 2
    ) as success_rate,
    
    -- Feature diversity
    COUNT(DISTINCT feature_name) as features_used,
    
    -- Wedding season context
    AVG(CASE WHEN (seasonal_context->>'isPeakSeason')::boolean THEN 1.0 ELSE 0.0 END) as peak_season_usage_ratio
    
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY month, api_source
)
SELECT 
  month,
  api_source,
  total_operations,
  unique_users,
  total_tokens,
  total_cost,
  avg_cost_per_operation,
  avg_response_time,
  success_rate,
  features_used,
  peak_season_usage_ratio,
  
  -- Growth metrics
  LAG(total_operations) OVER (PARTITION BY api_source ORDER BY month) as prev_month_operations,
  ROUND(
    (total_operations - LAG(total_operations) OVER (PARTITION BY api_source ORDER BY month))::FLOAT /
    NULLIF(LAG(total_operations) OVER (PARTITION BY api_source ORDER BY month), 0) * 100, 2
  ) as monthly_growth_rate,
  
  -- Cost efficiency
  ROUND(total_operations::FLOAT / NULLIF(total_cost, 0), 2) as operations_per_dollar
  
FROM api_usage_summary
ORDER BY month DESC, api_source;

-- 2. Feature Migration Analysis (Platform to Client)
WITH feature_transitions AS (
  SELECT 
    supplier_id,
    feature_name,
    MIN(created_at) as first_usage,
    MIN(CASE WHEN api_source = 'platform' THEN created_at END) as first_platform_usage,
    MIN(CASE WHEN api_source = 'client' THEN created_at END) as first_client_usage,
    
    -- Usage patterns
    COUNT(*) FILTER (WHERE api_source = 'platform') as platform_operations,
    COUNT(*) FILTER (WHERE api_source = 'client') as client_operations,
    
    -- Cost comparison
    SUM(CASE WHEN api_source = 'platform' THEN estimated_cost ELSE 0 END) as platform_cost,
    SUM(CASE WHEN api_source = 'client' THEN actual_cost ELSE 0 END) as client_cost,
    
    -- Performance comparison
    AVG(CASE WHEN api_source = 'platform' THEN response_time_ms END) as platform_avg_response,
    AVG(CASE WHEN api_source = 'client' THEN response_time_ms END) as client_avg_response
    
  FROM ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '6 months'
  GROUP BY supplier_id, feature_name
  HAVING COUNT(DISTINCT api_source) > 1 -- Users who tried both
),
migration_patterns AS (
  SELECT 
    feature_name,
    COUNT(*) as users_tried_both,
    COUNT(*) FILTER (WHERE first_client_usage > first_platform_usage) as platform_to_client_migrations,
    COUNT(*) FILTER (WHERE client_operations > platform_operations) as primarily_client_users,
    
    -- Migration metrics
    AVG(EXTRACT(days FROM first_client_usage - first_platform_usage)) as avg_days_to_migrate,
    AVG(client_operations::FLOAT / NULLIF(platform_operations, 0)) as client_adoption_ratio,
    
    -- Cost impact analysis
    AVG(client_cost) as avg_client_cost,
    AVG(platform_cost) as avg_platform_cost_equivalent,
    
    -- Performance impact
    AVG(client_avg_response - platform_avg_response) as response_time_delta
    
  FROM feature_transitions
  GROUP BY feature_name
)
SELECT 
  feature_name,
  users_tried_both,
  platform_to_client_migrations,
  ROUND(platform_to_client_migrations::FLOAT / users_tried_both * 100, 2) as migration_rate,
  primarily_client_users,
  ROUND(avg_days_to_migrate, 1) as avg_migration_days,
  client_adoption_ratio,
  avg_client_cost,
  avg_platform_cost_equivalent,
  ROUND(response_time_delta, 0) as response_time_change_ms
FROM migration_patterns
ORDER BY migration_rate DESC;

-- 3. Budget Management and Cost Control Analysis
WITH budget_performance AS (
  SELECT 
    s.id as supplier_id,
    s.tier,
    s.vendor_type,
    
    -- Budget configuration
    ac.client_monthly_budget,
    ac.client_budget_alert_threshold,
    ac.client_auto_disable_on_budget,
    
    -- Current month usage
    amu.client_actual_cost as current_month_cost,
    amu.client_operations as current_month_operations,
    
    -- Budget utilization
    ROUND(
      amu.client_actual_cost / NULLIF(ac.client_monthly_budget, 0) * 100, 2
    ) as budget_utilization_percentage,
    
    -- Budget alerts and controls
    amu.budget_alerts_sent,
    CASE 
      WHEN amu.client_actual_cost >= ac.client_monthly_budget THEN 'over_budget'
      WHEN amu.client_actual_cost >= (ac.client_monthly_budget * ac.client_budget_alert_threshold) THEN 'approaching_limit'
      ELSE 'within_budget'
    END as budget_status,
    
    -- Seasonal adjustment
    amu.is_peak_season,
    amu.seasonal_usage_multiplier,
    
    -- Performance metrics
    amu.success_rate,
    amu.user_satisfaction_avg
    
  FROM users s
  JOIN ai_feature_config ac ON s.id = ac.supplier_id
  LEFT JOIN ai_monthly_usage amu ON s.id = amu.supplier_id 
    AND amu.month = DATE_TRUNC('month', NOW())
  WHERE ac.client_api_enabled = true
),
budget_analysis AS (
  SELECT 
    tier,
    vendor_type,
    COUNT(*) as total_users,
    
    -- Budget distribution
    AVG(client_monthly_budget) as avg_monthly_budget,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY client_monthly_budget) as median_budget,
    MIN(client_monthly_budget) as min_budget,
    MAX(client_monthly_budget) as max_budget,
    
    -- Usage patterns
    AVG(current_month_cost) as avg_monthly_spend,
    AVG(budget_utilization_percentage) as avg_budget_utilization,
    
    -- Budget control effectiveness
    COUNT(*) FILTER (WHERE budget_status = 'within_budget') as within_budget_users,
    COUNT(*) FILTER (WHERE budget_status = 'approaching_limit') as approaching_limit_users,
    COUNT(*) FILTER (WHERE budget_status = 'over_budget') as over_budget_users,
    
    -- Alert effectiveness
    AVG(budget_alerts_sent) as avg_alerts_per_user,
    COUNT(*) FILTER (WHERE client_auto_disable_on_budget = true) as auto_disable_enabled_users,
    
    -- Seasonal impact
    COUNT(*) FILTER (WHERE is_peak_season = true) as peak_season_users,
    AVG(CASE WHEN is_peak_season THEN seasonal_usage_multiplier END) as avg_peak_multiplier,
    
    -- Satisfaction correlation
    AVG(user_satisfaction_avg) as avg_satisfaction
    
  FROM budget_performance
  GROUP BY tier, vendor_type
)
SELECT 
  tier,
  vendor_type,
  total_users,
  ROUND(avg_monthly_budget, 2) as avg_budget,
  ROUND(median_budget, 2) as median_budget,
  ROUND(avg_monthly_spend, 2) as avg_spend,
  ROUND(avg_budget_utilization, 2) as avg_utilization_percent,
  
  -- Budget control metrics
  ROUND(within_budget_users::FLOAT / total_users * 100, 2) as within_budget_percentage,
  ROUND(over_budget_users::FLOAT / total_users * 100, 2) as over_budget_percentage,
  
  -- Controls adoption
  ROUND(auto_disable_enabled_users::FLOAT / total_users * 100, 2) as auto_disable_adoption,
  ROUND(avg_alerts_per_user, 1) as avg_alerts,
  
  -- Seasonal patterns
  ROUND(peak_season_users::FLOAT / total_users * 100, 2) as peak_season_percentage,
  ROUND(avg_peak_multiplier, 2) as peak_multiplier,
  
  -- User satisfaction
  ROUND(avg_satisfaction, 2) as satisfaction_score
  
FROM budget_analysis
ORDER BY tier, vendor_type;

-- 4. Feature Adoption and Effectiveness by API Source
SELECT 
  f.feature_name,
  f.api_source,
  f.category,
  f.required_tier,
  
  -- Adoption metrics
  COUNT(DISTINCT ul.supplier_id) as unique_users,
  COUNT(*) as total_operations,
  AVG(ul.input_tokens + ul.output_tokens) as avg_tokens_per_operation,
  
  -- Cost metrics
  SUM(CASE WHEN f.api_source = 'platform' THEN ul.estimated_cost ELSE ul.actual_cost END) as total_cost,
  AVG(CASE WHEN f.api_source = 'platform' THEN ul.estimated_cost ELSE ul.actual_cost END) as avg_cost_per_operation,
  
  -- Performance metrics
  AVG(ul.response_time_ms) as avg_response_time,
  ROUND(COUNT(*) FILTER (WHERE ul.success = true)::FLOAT / COUNT(*) * 100, 2) as success_rate,
  AVG(ul.user_satisfaction_rating) FILTER (WHERE ul.user_satisfaction_rating IS NOT NULL) as avg_satisfaction,
  
  -- Usage patterns
  COUNT(*) FILTER (WHERE (ul.seasonal_context->>'isPeakSeason')::boolean = true) as peak_season_operations,
  COUNT(DISTINCT ul.supplier_id) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '30 days') as active_users_last_30d,
  
  -- Wedding context
  COUNT(*) FILTER (WHERE ul.client_id IS NOT NULL) as operations_with_client_context,
  COUNT(DISTINCT ul.client_id) as unique_clients_served,
  
  -- Tier distribution
  COUNT(DISTINCT CASE WHEN u.tier = 'professional' THEN ul.supplier_id END) as professional_users,
  COUNT(DISTINCT CASE WHEN u.tier = 'scale' THEN ul.supplier_id END) as scale_users,
  COUNT(DISTINCT CASE WHEN u.tier = 'enterprise' THEN ul.supplier_id END) as enterprise_users
  
FROM ai_feature_definitions f
LEFT JOIN ai_usage_logs ul ON f.feature_key = ul.feature_name
LEFT JOIN users u ON ul.supplier_id = u.id
WHERE f.enabled = true
  AND ul.created_at >= NOW() - INTERVAL '3 months'
GROUP BY f.feature_name, f.api_source, f.category, f.required_tier
ORDER BY unique_users DESC, total_operations DESC;
```

### Success Criteria

**API Architecture Goals**:
- ✅ Clear feature separation: 100% of features properly categorized as platform vs client
- ✅ Transparent cost allocation: Users understand exactly what costs are included vs additional
- ✅ Seamless experience: No performance degradation between platform and client features
- ✅ Migration support: Easy upgrade path from platform to client features

**Platform Features (Included)**:
- ✅ >80% of paid tier users actively using platform AI features
- ✅ <$2.00 average cost per user per month for platform features
- ✅ >95% uptime for platform AI services
- ✅ <2 second average response time for platform features

**Client Features (User-Managed)**:
- ✅ >25% of Professional+ users configure client API within 30 days
- ✅ >90% of client API setups complete successfully on first attempt
- ✅ <5% monthly budget overrun rate among users with budget controls
- ✅ 85%+ user satisfaction with client feature setup process

**Wedding Industry Context**:
- ✅ Peak season (April-September) cost multipliers properly applied
- ✅ Vendor-specific feature recommendations increase adoption by 40%
- ✅ Seasonal budget adjustment adoption >60% among active users
- ✅ Wedding day critical features maintain >99.5% availability

**Business Impact**:
- ✅ 35% increase in AI feature adoption through clear platform/client distinction
- ✅ 50% reduction in AI-related support tickets through transparent setup
- ✅ 25% increase in Professional tier conversions driven by client API features
- ✅ $100,000+ annual cost savings through efficient platform feature management

## Completion Checklist

**Backend Implementation**:
- [ ] Comprehensive API source configuration system
- [ ] Feature access control with tier and budget validation
- [ ] Real-time usage tracking and cost calculation
- [ ] Budget management with alerts and auto-controls
- [ ] Wedding seasonality adjustments and vendor-specific logic

**AI/ML Integration**:
- [ ] Multi-provider API abstraction layer
- [ ] Cost estimation and optimization algorithms
- [ ] Usage pattern analysis and recommendations
- [ ] Performance monitoring and quality assurance

**Frontend Implementation**:
- [ ] Clear platform vs client feature distinction in UI
- [ ] Comprehensive setup wizard with provider recommendations
- [ ] Real-time usage dashboard with cost breakdowns
- [ ] Budget management interface with visual indicators

**Integration & Testing**:
- [ ] OpenAI and Anthropic API integration testing
- [ ] Budget control and alert system validation
- [ ] Wedding season cost multiplier verification
- [ ] Cross-tier feature access testing

---

**Estimated Completion**: 12 business days  
**Success Measurement**: 90-day API adoption and cost management analysis  
**Rollout Strategy**: Beta with select Professional users, phased rollout with comprehensive cost monitoring