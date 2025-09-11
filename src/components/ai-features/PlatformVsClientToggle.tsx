'use client';

import React, { useState } from 'react';
import { PlatformVsClientToggleProps } from '@/types/ai-features';
import {
  Shield,
  Zap,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Info,
} from 'lucide-react';

/**
 * Platform vs Client Toggle Component
 * Clear interface to switch between platform-included vs client-managed AI features
 * with transparent cost tracking and usage visualization
 */
export function PlatformVsClientToggle({
  feature,
  currentAccess,
  usage,
  onToggle,
  disabled = false,
}: PlatformVsClientToggleProps) {
  const [selectedMode, setSelectedMode] = useState<'platform' | 'client'>(
    (currentAccess.accessType as 'platform' | 'client') || 'platform',
  );
  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = (newMode: 'platform' | 'client') => {
    if (disabled) return;
    setSelectedMode(newMode);
    onToggle(feature.id, newMode);
  };

  const getUsagePercentage = () => {
    if (!feature.platformLimit || !currentAccess.remainingUsage) return 0;
    const used = feature.platformLimit - currentAccess.remainingUsage;
    return (used / feature.platformLimit) * 100;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const projectedSavings =
    feature.clientManaged && usage.projectedMonthlyCost
      ? Math.max(
          0,
          usage.projectedMonthlyCost -
            feature.costPerUnit! * usage.projectedMonthlyUsage,
        )
      : 0;

  const currentMonth = new Date().getMonth() + 1;
  const isWeddingSeason = [5, 6, 7, 8, 9, 10].includes(currentMonth); // May-October

  return (
    <div className="space-y-4">
      {/* Toggle Interface */}
      <div className="bg-gray-50 rounded-lg p-1 flex">
        {/* Platform Option */}
        <button
          onClick={() => handleToggle('platform')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
            selectedMode === 'platform'
              ? 'bg-white text-green-700 shadow-sm border border-green-200'
              : 'text-gray-600 hover:text-gray-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Shield className="w-4 h-4 mr-2" />
          Platform Included
        </button>

        {/* Client Option */}
        <button
          onClick={() => handleToggle('client')}
          disabled={disabled || !feature.clientManaged}
          className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
            selectedMode === 'client'
              ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          } ${disabled || !feature.clientManaged ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Zap className="w-4 h-4 mr-2" />
          Client Managed
        </button>
      </div>

      {/* Mode-Specific Information */}
      <div className="space-y-3">
        {selectedMode === 'platform' && feature.platformIncluded && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-green-800">
                  Platform Included
                </h4>
                <div className="mt-2 space-y-2">
                  {feature.platformLimit && (
                    <div>
                      <div className="flex justify-between text-sm text-green-700 mb-1">
                        <span>Usage this month</span>
                        <span>
                          {feature.platformLimit -
                            (currentAccess.remainingUsage || 0)}{' '}
                          / {feature.platformLimit}
                        </span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(getUsagePercentage())}`}
                          style={{
                            width: `${Math.min(100, getUsagePercentage())}%`,
                          }}
                        ></div>
                      </div>
                      {getUsagePercentage() > 75 && (
                        <div className="flex items-center mt-2 text-sm text-orange-600">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {getUsagePercentage() > 90
                            ? 'Almost at limit - consider upgrading'
                            : 'Approaching limit - monitor usage'}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-green-700">
                    ✓ No additional charges • ✓ Automatic updates • ✓ WedSync
                    support included
                  </div>
                  {isWeddingSeason && (
                    <div className="flex items-center text-sm text-orange-600 bg-orange-50 rounded p-2 mt-2">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Wedding season: Usage may increase 2.5x during peak months
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMode === 'client' && feature.clientManaged && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Zap className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-blue-800">
                  Client Managed
                </h4>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="flex items-center text-blue-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="font-medium">Cost per use</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-800 mt-1">
                        £{feature.costPerUnit?.toFixed(3)}
                      </div>
                    </div>
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="flex items-center text-blue-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="font-medium">Est. monthly</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-800 mt-1">
                        £{usage.projectedMonthlyCost?.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="flex items-center text-blue-600">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        <span className="font-medium">Usage</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-800 mt-1">
                        Unlimited
                      </div>
                    </div>
                  </div>

                  {projectedSavings > 0 && (
                    <div className="flex items-center text-sm text-green-600 bg-green-50 rounded p-2">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Potential savings: £{projectedSavings.toFixed(2)}/month
                      with your usage
                    </div>
                  )}

                  <div className="text-sm text-blue-700">
                    ✓ Unlimited usage • ✓ Your own API key • ✓ Direct provider
                    billing • ✓ Advanced features
                  </div>

                  {feature.providerOptions.length > 0 && (
                    <div className="bg-white border border-blue-200 rounded p-3 mt-2">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">
                        Available Providers
                      </h5>
                      <div className="space-y-2">
                        {feature.providerOptions.map((provider) => (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="font-medium text-gray-900">
                                {provider.name}
                              </span>
                              <span className="text-gray-500 ml-2">
                                ({provider.setupComplexity} setup)
                              </span>
                            </div>
                            <div className="text-blue-600 font-medium">
                              £{provider.estimatedCostPerMonth}/month
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!feature.clientManaged && selectedMode === 'client' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Client Management Not Available
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  This feature is only available through our platform. Contact
                  support if you need custom implementation.
                </p>
              </div>
            </div>
          </div>
        )}

        {!feature.platformIncluded && selectedMode === 'platform' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-orange-800">
                  Premium Feature
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  This feature requires client management with your own API key.
                  Platform-included option is not available for this advanced
                  feature.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
      >
        <Info className="w-4 h-4 mr-1" />
        {showDetails ? 'Hide' : 'Show'} detailed comparison
      </button>

      {showDetails && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
          <h5 className="text-sm font-medium text-gray-900 mb-3">
            Platform vs Client Comparison
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-green-700 mb-2">
                Platform Included
              </h6>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ No setup required</li>
                <li>✓ Included in subscription</li>
                <li>✓ WedSync manages updates</li>
                <li>✓ Support included</li>
                {feature.platformLimit && <li>✗ Usage limits apply</li>}
                <li>✗ Standard features only</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-blue-700 mb-2">
                Client Managed
              </h6>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Unlimited usage</li>
                <li>✓ Advanced features</li>
                <li>✓ Custom configurations</li>
                <li>✓ Direct provider relationship</li>
                <li>✗ API key setup required</li>
                <li>✗ Separate billing from provider</li>
              </ul>
            </div>
          </div>

          {isWeddingSeason && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <h6 className="text-sm font-medium text-orange-800 mb-1">
                Wedding Season Considerations
              </h6>
              <p className="text-sm text-orange-700">
                During peak season (
                {new Date().toLocaleDateString('en-US', { month: 'long' })}), AI
                usage typically increases by 150%. Client-managed features
                provide unlimited usage to handle increased demand without
                interruption.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
