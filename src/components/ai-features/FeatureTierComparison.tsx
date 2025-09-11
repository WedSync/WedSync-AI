'use client';

import React, { useState } from 'react';
import {
  FeatureTierComparisonProps,
  SubscriptionTier,
} from '@/types/ai-features';
import {
  Check,
  X,
  Crown,
  Zap,
  Shield,
  Star,
  ArrowRight,
  DollarSign,
  Users,
  Infinity,
} from 'lucide-react';

/**
 * Feature Tier Comparison Component
 * Visual comparison of platform vs client features across subscription tiers
 */
export function FeatureTierComparison({
  currentTier,
  features,
  onUpgrade,
  highlightFeature,
}: FeatureTierComparisonProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Define tier structure with AI feature limits
  const tierStructure: Record<
    string,
    {
      tier: SubscriptionTier;
      aiLimits: Record<
        string,
        { included: boolean; limit?: number; clientManaged: boolean }
      >;
      highlights: string[];
    }
  > = {
    free: {
      tier: { id: 'free', name: 'free', monthlyPrice: 0 },
      aiLimits: {
        'photo-tagging': { included: false, clientManaged: false },
        'event-descriptions': { included: false, clientManaged: false },
        'menu-optimization': { included: false, clientManaged: false },
        'timeline-assistant': { included: false, clientManaged: false },
      },
      highlights: [
        'Basic wedding management',
        'Single login',
        '30-day trial of AI features',
      ],
    },
    starter: {
      tier: { id: 'starter', name: 'starter', monthlyPrice: 19 },
      aiLimits: {
        'photo-tagging': { included: false, clientManaged: false },
        'event-descriptions': {
          included: true,
          limit: 50,
          clientManaged: true,
        },
        'menu-optimization': { included: false, clientManaged: false },
        'timeline-assistant': { included: false, clientManaged: false },
      },
      highlights: [
        'Basic AI content generation',
        'Email marketing',
        '2 team logins',
      ],
    },
    professional: {
      tier: { id: 'professional', name: 'professional', monthlyPrice: 49 },
      aiLimits: {
        'photo-tagging': { included: true, limit: 1000, clientManaged: true },
        'event-descriptions': {
          included: true,
          limit: 200,
          clientManaged: true,
        },
        'menu-optimization': {
          included: true,
          limit: 100,
          clientManaged: true,
        },
        'timeline-assistant': {
          included: true,
          limit: 50,
          clientManaged: true,
        },
      },
      highlights: [
        'Full AI suite included',
        'Marketplace selling',
        'Advanced automation',
      ],
    },
    scale: {
      tier: { id: 'scale', name: 'scale', monthlyPrice: 79 },
      aiLimits: {
        'photo-tagging': { included: true, limit: 2500, clientManaged: true },
        'event-descriptions': {
          included: true,
          limit: 500,
          clientManaged: true,
        },
        'menu-optimization': {
          included: true,
          limit: 250,
          clientManaged: true,
        },
        'timeline-assistant': {
          included: true,
          limit: 150,
          clientManaged: true,
        },
      },
      highlights: [
        'Higher AI limits',
        'API access',
        'Advanced integrations',
        '5 team logins',
      ],
    },
    enterprise: {
      tier: { id: 'enterprise', name: 'enterprise', monthlyPrice: 149 },
      aiLimits: {
        'photo-tagging': { included: true, clientManaged: true },
        'event-descriptions': { included: true, clientManaged: true },
        'menu-optimization': { included: true, clientManaged: true },
        'timeline-assistant': { included: true, clientManaged: true },
      },
      highlights: [
        'Unlimited AI usage',
        'White-label solution',
        'Priority support',
        'Custom integrations',
      ],
    },
  };

  const tiers = Object.values(tierStructure);

  const getTierIcon = (tierName: string) => {
    switch (tierName) {
      case 'free':
        return <Users className="w-5 h-5" />;
      case 'starter':
        return <Star className="w-5 h-5" />;
      case 'professional':
        return <Zap className="w-5 h-5" />;
      case 'scale':
        return <Shield className="w-5 h-5" />;
      case 'enterprise':
        return <Crown className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getTierColor = (tierName: string) => {
    switch (tierName) {
      case 'free':
        return 'border-gray-200 bg-gray-50';
      case 'starter':
        return 'border-yellow-200 bg-yellow-50';
      case 'professional':
        return 'border-green-200 bg-green-50';
      case 'scale':
        return 'border-blue-200 bg-blue-50';
      case 'enterprise':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const isCurrentTier = (tierName: string) => currentTier.name === tierName;

  const canUpgradeTo = (tierName: string) => {
    const tierLevels = {
      free: 0,
      starter: 1,
      professional: 2,
      scale: 3,
      enterprise: 4,
    };
    const currentLevel =
      tierLevels[currentTier.name as keyof typeof tierLevels] || 0;
    const targetLevel = tierLevels[tierName as keyof typeof tierLevels] || 0;
    return targetLevel > currentLevel;
  };

  const getFeatureStatus = (featureId: string, tierLimits: any) => {
    const limit = tierLimits[featureId];
    if (!limit) return { included: false, clientManaged: false };
    return limit;
  };

  const formatFeatureName = (featureId: string) => {
    return featureId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          AI Features Across Plans
        </h2>
        <p className="text-gray-600">
          Choose the right plan for your AI needs. All plans include platform
          features with usage limits, plus the option to use your own API keys
          for unlimited usage.
        </p>
      </div>

      {/* Highlighted Feature Banner */}
      {highlightFeature && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-primary-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-primary-900">
                {formatFeatureName(highlightFeature)} Available in Higher Tiers
              </h3>
              <p className="text-sm text-primary-700 mt-1">
                Upgrade to access this feature with platform limits, or use your
                own API key for unlimited usage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tier Comparison Table */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Desktop View */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-6 gap-4">
              {/* Feature Names Column */}
              <div className="space-y-4">
                <div className="h-32"></div> {/* Header spacer */}
                <div className="space-y-6">
                  <div className="font-medium text-gray-900 text-sm">
                    Platform Features
                  </div>
                  {features.map((feature) => (
                    <div key={feature.id} className="py-3">
                      <div
                        className={`font-medium text-gray-900 text-sm ${
                          highlightFeature === feature.id
                            ? 'text-primary-700 bg-primary-50 px-2 py-1 rounded'
                            : ''
                        }`}
                      >
                        {feature.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {feature.category}
                      </div>
                    </div>
                  ))}

                  <div className="font-medium text-gray-900 text-sm mt-8">
                    Client Management
                  </div>
                  <div className="py-3">
                    <div className="font-medium text-gray-900 text-sm">
                      Unlimited Usage
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      With your own API keys
                    </div>
                  </div>

                  <div className="py-3">
                    <div className="font-medium text-gray-900 text-sm">
                      Cost Control
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Direct provider billing
                    </div>
                  </div>
                </div>
              </div>

              {/* Tier Columns */}
              {tiers.map((tierData) => (
                <div
                  key={tierData.tier.name}
                  className={`rounded-lg border-2 p-6 relative ${
                    isCurrentTier(tierData.tier.name)
                      ? 'border-primary-500 bg-primary-50 shadow-lg ring-2 ring-primary-200'
                      : 'border-gray-200 bg-white hover:shadow-md'
                  } ${getTierColor(tierData.tier.name)}`}
                >
                  {isCurrentTier(tierData.tier.name) && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {/* Tier Header */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-2">
                      <div
                        className={`p-2 rounded-full ${
                          tierData.tier.name === 'enterprise'
                            ? 'bg-purple-100 text-purple-600'
                            : tierData.tier.name === 'scale'
                              ? 'bg-blue-100 text-blue-600'
                              : tierData.tier.name === 'professional'
                                ? 'bg-green-100 text-green-600'
                                : tierData.tier.name === 'starter'
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getTierIcon(tierData.tier.name)}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 capitalize">
                      {tierData.tier.name}
                    </h3>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                      {tierData.tier.monthlyPrice === 0
                        ? 'Free'
                        : `£${tierData.tier.monthlyPrice}`}
                    </div>
                    {tierData.tier.monthlyPrice > 0 && (
                      <div className="text-sm text-gray-600">/month</div>
                    )}
                  </div>

                  {/* Feature Checkmarks */}
                  <div className="space-y-6">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Platform
                    </div>
                    {features.map((feature) => {
                      const status = getFeatureStatus(
                        feature.id,
                        tierData.aiLimits,
                      );
                      return (
                        <div
                          key={feature.id}
                          className="py-3 flex items-center justify-center"
                        >
                          {status.included ? (
                            <div className="text-center">
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                              {status.limit && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {status.limit.toLocaleString()}/mo
                                </div>
                              )}
                            </div>
                          ) : (
                            <X className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                      );
                    })}

                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mt-8">
                      Client
                    </div>
                    <div className="py-3 flex items-center justify-center">
                      {tierData.tier.name !== 'free' ? (
                        <div className="text-center">
                          <Infinity className="w-5 h-5 text-blue-500 mx-auto" />
                          <div className="text-xs text-blue-600 mt-1">
                            Available
                          </div>
                        </div>
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>

                    <div className="py-3 flex items-center justify-center">
                      {tierData.tier.name !== 'free' ? (
                        <DollarSign className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>

                  {/* Upgrade Button */}
                  <div className="mt-8">
                    {isCurrentTier(tierData.tier.name) ? (
                      <div className="w-full py-2 px-4 bg-gray-100 text-gray-500 text-center text-sm font-medium rounded-lg">
                        Current Plan
                      </div>
                    ) : canUpgradeTo(tierData.tier.name) ? (
                      <button
                        onClick={() => onUpgrade(tierData.tier.name)}
                        className="w-full py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                      >
                        Upgrade Now
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    ) : (
                      <div className="w-full py-2 px-4 bg-gray-100 text-gray-400 text-center text-sm font-medium rounded-lg">
                        Lower Tier
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden space-y-4">
            {tiers.map((tierData) => (
              <div
                key={tierData.tier.name}
                className={`rounded-lg border p-6 ${
                  isCurrentTier(tierData.tier.name)
                    ? 'border-primary-500 bg-primary-50 shadow-lg'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-full mr-3 ${
                        tierData.tier.name === 'enterprise'
                          ? 'bg-purple-100 text-purple-600'
                          : tierData.tier.name === 'scale'
                            ? 'bg-blue-100 text-blue-600'
                            : tierData.tier.name === 'professional'
                              ? 'bg-green-100 text-green-600'
                              : tierData.tier.name === 'starter'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {getTierIcon(tierData.tier.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 capitalize">
                        {tierData.tier.name}
                      </h3>
                      {isCurrentTier(tierData.tier.name) && (
                        <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {tierData.tier.monthlyPrice === 0
                        ? 'Free'
                        : `£${tierData.tier.monthlyPrice}`}
                    </div>
                    {tierData.tier.monthlyPrice > 0 && (
                      <div className="text-sm text-gray-600">/month</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {tierData.highlights.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-gray-700"
                    >
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {highlight}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium text-gray-900 mb-2">
                      Platform AI Features
                    </div>
                    {features.map((feature) => {
                      const status = getFeatureStatus(
                        feature.id,
                        tierData.aiLimits,
                      );
                      return (
                        <div
                          key={feature.id}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-gray-600 text-xs">
                            {feature.name}
                          </span>
                          {status.included ? (
                            <div className="text-center">
                              <Check className="w-4 h-4 text-green-500" />
                              {status.limit && (
                                <div className="text-xs text-gray-500">
                                  {status.limit >= 1000
                                    ? `${(status.limit / 1000).toFixed(1)}k`
                                    : status.limit}
                                </div>
                              )}
                            </div>
                          ) : (
                            <X className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 mb-2">
                      Client Management
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600 text-xs">
                        Unlimited Usage
                      </span>
                      {tierData.tier.name !== 'free' ? (
                        <Check className="w-4 h-4 text-blue-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600 text-xs">
                        Cost Control
                      </span>
                      {tierData.tier.name !== 'free' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {isCurrentTier(tierData.tier.name) ? (
                    <div className="w-full py-2 px-4 bg-gray-100 text-gray-500 text-center text-sm font-medium rounded-lg">
                      Current Plan
                    </div>
                  ) : canUpgradeTo(tierData.tier.name) ? (
                    <button
                      onClick={() => onUpgrade(tierData.tier.name)}
                      className="w-full py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                    >
                      Upgrade to{' '}
                      {tierData.tier.name.charAt(0).toUpperCase() +
                        tierData.tier.name.slice(1)}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <div className="w-full py-2 px-4 bg-gray-100 text-gray-400 text-center text-sm font-medium rounded-lg">
                      Lower Tier
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              Platform vs Client Features
            </h4>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Platform features</strong> are included in your
              subscription with usage limits.
              <strong> Client-managed features</strong> let you use your own API
              keys for unlimited usage and advanced configurations, with costs
              billed directly by the AI provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
