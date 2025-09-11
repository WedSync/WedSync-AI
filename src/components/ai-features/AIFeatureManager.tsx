'use client';

import React, { useState, useEffect } from 'react';
import {
  AIFeatureManagerProps,
  AIFeature,
  FeatureAccess,
  UsageMetrics,
  BudgetAlert,
  WeddingSeasonConfig,
} from '@/types/ai-features';
import { PlatformVsClientToggle } from './PlatformVsClientToggle';
import { APIKeySetupWizard } from './APIKeySetupWizard';
import { CostTrackingDashboard } from './CostTrackingDashboard';
import { FeatureTierComparison } from './FeatureTierComparison';
import {
  Settings,
  TrendingUp,
  Shield,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  Crown,
} from 'lucide-react';

/**
 * AI Feature Manager - Main Dashboard
 * Provides intuitive interface for managing AI features with clear distinction
 * between platform-provided vs client-managed features
 */
export default function AIFeatureManager({
  userId,
  organizationId,
  currentTier,
  onFeatureToggle,
  onUpgradeRequest,
}: AIFeatureManagerProps) {
  const [features, setFeatures] = useState<AIFeature[]>([]);
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess[]>([]);
  const [usage, setUsage] = useState<UsageMetrics[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [weddingSeasonConfig, setWeddingSeasonConfig] =
    useState<WeddingSeasonConfig>({
      peakMonths: [5, 6, 7, 8, 9, 10], // May-October wedding season
      multiplier: 2.5,
      alertsEnabled: true,
      budgetAdjustment: 1.3,
    });
  const [selectedView, setSelectedView] = useState<
    'overview' | 'features' | 'costs' | 'compare'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Mock data - In real implementation, this would come from API
  useEffect(() => {
    // Simulate loading wedding-industry specific AI features
    const mockFeatures: AIFeature[] = [
      {
        id: 'photo-tagging',
        name: 'AI Photo Tagging',
        description:
          'Automatically tag wedding photos with guests, moments, and details',
        category: 'analysis',
        weddingUseCase:
          'Perfect for photographers - identify key moments, guest relationships, and photo categories',
        platformIncluded: true,
        platformLimit: 1000,
        clientManaged: true,
        costPerUnit: 0.002,
        currency: 'GBP',
        requiredTier: 'professional',
        providerOptions: [
          {
            id: 'openai-vision',
            name: 'OpenAI Vision',
            apiKeyRequired: true,
            supportedFeatures: ['photo-tagging'],
            setupComplexity: 'easy',
            estimatedCostPerMonth: 25,
            currency: 'GBP',
          },
        ],
      },
      {
        id: 'event-descriptions',
        name: 'Event Description Generator',
        description:
          'Generate compelling descriptions for wedding events and packages',
        category: 'content',
        weddingUseCase:
          'Ideal for venues and planners - create engaging package descriptions and marketing content',
        platformIncluded: true,
        platformLimit: 100,
        clientManaged: true,
        costPerUnit: 0.01,
        currency: 'GBP',
        requiredTier: 'starter',
        providerOptions: [
          {
            id: 'openai-gpt',
            name: 'OpenAI GPT-4',
            apiKeyRequired: true,
            supportedFeatures: ['event-descriptions'],
            setupComplexity: 'easy',
            estimatedCostPerMonth: 15,
            currency: 'GBP',
          },
        ],
      },
      {
        id: 'menu-optimization',
        name: 'Menu Optimization AI',
        description:
          'Optimize wedding menus based on dietary preferences and seasonal ingredients',
        category: 'automation',
        weddingUseCase:
          'Essential for caterers - balance guest preferences, dietary restrictions, and cost efficiency',
        platformIncluded: false,
        clientManaged: true,
        costPerUnit: 0.05,
        currency: 'GBP',
        requiredTier: 'professional',
        providerOptions: [
          {
            id: 'custom-ai',
            name: 'Custom AI Model',
            apiKeyRequired: true,
            supportedFeatures: ['menu-optimization'],
            setupComplexity: 'medium',
            estimatedCostPerMonth: 45,
            currency: 'GBP',
          },
        ],
      },
      {
        id: 'timeline-assistant',
        name: 'Wedding Timeline Assistant',
        description:
          'AI-powered timeline generation and optimization for wedding days',
        category: 'automation',
        weddingUseCase:
          'Perfect for planners - create optimized schedules considering logistics and guest flow',
        platformIncluded: true,
        platformLimit: 50,
        clientManaged: true,
        costPerUnit: 0.08,
        currency: 'GBP',
        requiredTier: 'professional',
        providerOptions: [
          {
            id: 'openai-gpt',
            name: 'OpenAI GPT-4',
            apiKeyRequired: true,
            supportedFeatures: ['timeline-assistant'],
            setupComplexity: 'medium',
            estimatedCostPerMonth: 35,
            currency: 'GBP',
          },
        ],
      },
    ];

    const mockAccess: FeatureAccess[] = mockFeatures.map((feature) => ({
      featureId: feature.id,
      hasAccess: feature.requiredTier
        ? getTierLevel(currentTier.name) >= getTierLevel(feature.requiredTier)
        : true,
      accessType: feature.platformIncluded ? 'platform' : 'none',
      remainingUsage: feature.platformLimit
        ? Math.floor(feature.platformLimit * 0.3)
        : undefined,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      upgradeRequired: feature.requiredTier
        ? getTierLevel(currentTier.name) < getTierLevel(feature.requiredTier)
        : false,
      upgradeMessage:
        feature.requiredTier &&
        getTierLevel(currentTier.name) < getTierLevel(feature.requiredTier)
          ? `Upgrade to ${feature.requiredTier} tier to access this feature`
          : undefined,
    }));

    const mockUsage: UsageMetrics[] = mockFeatures.map((feature) => ({
      featureId: feature.id,
      period: 'current_month',
      totalUsage: Math.floor(Math.random() * (feature.platformLimit || 100)),
      totalCost: Math.floor(Math.random() * 50),
      currency: 'GBP',
      dailyUsage: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        count: Math.floor(Math.random() * 20),
        cost: Math.random() * 2,
      })),
      projectedMonthlyUsage: Math.floor(
        Math.random() * (feature.platformLimit || 100) * 1.2,
      ),
      projectedMonthlyCost: Math.floor(Math.random() * 60),
      weddingSeasonMultiplier: weddingSeasonConfig.multiplier,
    }));

    setFeatures(mockFeatures);
    setFeatureAccess(mockAccess);
    setUsage(mockUsage);
    setIsLoading(false);
  }, [currentTier, weddingSeasonConfig]);

  const getTierLevel = (tierName: string): number => {
    const levels = {
      free: 0,
      starter: 1,
      professional: 2,
      scale: 3,
      enterprise: 4,
    };
    return levels[tierName as keyof typeof levels] || 0;
  };

  const getFeatureStatusColor = (feature: AIFeature, access: FeatureAccess) => {
    if (!access.hasAccess) return 'text-red-600 bg-red-50 border-red-200';
    if (access.accessType === 'platform')
      return 'text-green-600 bg-green-50 border-green-200';
    if (access.accessType === 'client')
      return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getFeatureStatusIcon = (feature: AIFeature, access: FeatureAccess) => {
    if (!access.hasAccess) return <AlertCircle className="w-4 h-4" />;
    if (access.accessType === 'platform') return <Shield className="w-4 h-4" />;
    if (access.accessType === 'client') return <Zap className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getFeatureStatusText = (feature: AIFeature, access: FeatureAccess) => {
    if (!access.hasAccess) return 'Upgrade Required';
    if (access.accessType === 'platform') return 'Platform Included';
    if (access.accessType === 'client') return 'Client Managed';
    return 'Setup Required';
  };

  const currentMonth = new Date().getMonth() + 1;
  const isWeddingSeason = weddingSeasonConfig.peakMonths.includes(currentMonth);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            AI Features Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your AI-powered wedding tools with transparent cost tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              currentTier.name === 'enterprise'
                ? 'bg-purple-100 text-purple-800'
                : currentTier.name === 'scale'
                  ? 'bg-blue-100 text-blue-800'
                  : currentTier.name === 'professional'
                    ? 'bg-green-100 text-green-800'
                    : currentTier.name === 'starter'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
            }`}
          >
            {currentTier.name === 'enterprise' && (
              <Crown className="w-4 h-4 mr-1" />
            )}
            {currentTier.name.charAt(0).toUpperCase() +
              currentTier.name.slice(1)}{' '}
            Plan
          </span>
          {isWeddingSeason && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              <TrendingUp className="w-4 h-4 mr-1" />
              Wedding Season
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'features', name: 'Features', icon: Zap },
            { id: 'costs', name: 'Cost Tracking', icon: DollarSign },
            { id: 'compare', name: 'Compare Tiers', icon: Crown },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon
                  className={`-ml-0.5 mr-2 h-4 w-4 ${
                    selectedView === tab.id
                      ? 'text-primary-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Based on Selected View */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Features
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {featureAccess.filter((a) => a.hasAccess).length} of{' '}
                      {features.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Platform Features
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {features.filter((f) => f.platformIncluded).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Spend
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      £
                      {usage
                        .reduce((sum, u) => sum + u.totalCost, 0)
                        .toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp
                    className={`h-8 w-8 ${isWeddingSeason ? 'text-orange-500' : 'text-gray-400'}`}
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Season Status
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {isWeddingSeason ? 'Peak Season' : 'Off Season'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Wedding Season Alert */}
          {isWeddingSeason && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    Wedding Season Alert
                  </h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>
                      You're in peak wedding season! AI usage typically
                      increases by{' '}
                      {((weddingSeasonConfig.multiplier - 1) * 100).toFixed(0)}%
                      during this period. Consider upgrading to client-managed
                      features for unlimited usage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedView === 'features' && (
        <div className="space-y-4">
          {features.map((feature) => {
            const access = featureAccess.find(
              (a) => a.featureId === feature.id,
            )!;
            const featureUsage = usage.find((u) => u.featureId === feature.id)!;

            return (
              <div
                key={feature.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {feature.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFeatureStatusColor(feature, access)}`}
                      >
                        {getFeatureStatusIcon(feature, access)}
                        <span className="ml-1">
                          {getFeatureStatusText(feature, access)}
                        </span>
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{feature.description}</p>
                    <p className="text-sm text-blue-600 mt-2 font-medium">
                      {feature.weddingUseCase}
                    </p>

                    {access.hasAccess && (
                      <div className="mt-4">
                        <PlatformVsClientToggle
                          feature={feature}
                          currentAccess={access}
                          usage={featureUsage}
                          onToggle={onFeatureToggle}
                        />
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex-shrink-0">
                    {access.upgradeRequired ? (
                      <button
                        onClick={() => onUpgradeRequest(feature.requiredTier!)}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Upgrade to Access
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedProvider(feature.providerOptions[0]?.id);
                          setShowSetupWizard(true);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-1 inline" />
                        Configure
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedView === 'costs' && (
        <CostTrackingDashboard
          usage={usage}
          alerts={alerts}
          weddingSeasonConfig={weddingSeasonConfig}
          currency="GBP"
          onSetBudget={(featureId, budget) => {
            console.log('Setting budget for', featureId, budget);
          }}
          onDismissAlert={(alertId) => {
            setAlerts(alerts.filter((a) => a.id !== alertId));
          }}
        />
      )}

      {selectedView === 'compare' && (
        <FeatureTierComparison
          currentTier={currentTier}
          features={features}
          onUpgrade={onUpgradeRequest}
        />
      )}

      {/* API Key Setup Wizard */}
      {showSetupWizard && selectedProvider && (
        <APIKeySetupWizard
          provider={
            features
              .find((f) =>
                f.providerOptions.some((p) => p.id === selectedProvider),
              )
              ?.providerOptions.find((p) => p.id === selectedProvider)!
          }
          onSave={async (config) => {
            console.log('Saving API key config:', config);
            setShowSetupWizard(false);
          }}
          onTest={async (apiKey) => {
            console.log('Testing API key:', apiKey);
            return true;
          }}
          onCancel={() => setShowSetupWizard(false)}
          isVisible={showSetupWizard}
        />
      )}
    </div>
  );
}
