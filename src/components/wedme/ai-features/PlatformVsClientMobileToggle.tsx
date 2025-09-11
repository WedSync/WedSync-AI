'use client';

/**
 * WS-239: Platform vs Client Mobile Toggle
 * Swipeable comparison interface for mobile AI feature selection
 * Touch-optimized for wedding suppliers on-the-go
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  ArrowRight,
  DollarSign,
  Zap,
  Shield,
  Smartphone,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Wifi,
  WifiOff,
} from 'lucide-react';

import type {
  PlatformVsClientToggleProps,
  PlatformType,
  AIFeatureType,
  AIFeatureComparison,
  CostComparisonData,
  WeddingScenario,
} from '@/types/wedme-ai';

import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// Feature icons mapping
const FEATURE_ICONS: Record<
  AIFeatureType,
  React.ComponentType<{ className?: string }>
> = {
  'photo-tagging': Star,
  'description-generation': Zap,
  'menu-ai': TrendingUp,
  'timeline-optimization': Clock,
  'chat-bot': Smartphone,
};

// Wedding scenarios with visual indicators
const SCENARIO_COLORS = {
  photographer: 'from-purple-500 to-pink-500',
  planner: 'from-blue-500 to-indigo-500',
  venue: 'from-green-500 to-emerald-500',
  caterer: 'from-orange-500 to-red-500',
} as const;

const PlatformVsClientMobileToggle: React.FC<PlatformVsClientToggleProps> = ({
  currentMode,
  comparison,
  onSwitch,
  loading = false,
  disabled = false,
  showDetailedComparison = true,
  mobileOptimized = true,
  className = '',
}) => {
  // State management
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<AIFeatureType | null>(
    null,
  );

  // Refs for drag handling
  const containerRef = useRef<HTMLDivElement>(null);
  const dragConstraints = { left: 0, right: 0 };

  // Mobile hooks
  const { triggerHaptic, isSupported: hapticSupported } = useHapticFeedback();

  // Calculate savings and recommendations
  const savingsData = useMemo(() => {
    if (!comparison?.costComparison) return null;

    const {
      platformMonthly,
      averageClientCosts,
      breakEvenPoint,
      savingsProjection,
    } = comparison.costComparison;
    const monthlySavings = averageClientCosts.total - platformMonthly;
    const yearlyProjection =
      savingsProjection.length > 0
        ? savingsProjection[11]
        : monthlySavings * 12;

    return {
      monthly: monthlySavings,
      yearly: yearlyProjection,
      breakEven: breakEvenPoint,
      recommendation:
        monthlySavings > 0 ? 'platform' : ('client' as PlatformType),
    };
  }, [comparison?.costComparison]);

  // Handle drag events with haptic feedback
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      const newOffset = info.offset.x;
      setDragOffset(newOffset);

      // Haptic feedback at 25% and 75% drag thresholds
      const dragPercentage = Math.abs(newOffset) / 150;
      if (
        hapticSupported &&
        ((dragPercentage > 0.25 && dragPercentage < 0.35) ||
          (dragPercentage > 0.65 && dragPercentage < 0.75))
      ) {
        triggerHaptic('selection', 0.3);
      }
    },
    [disabled, hapticSupported, triggerHaptic],
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      setIsDragging(false);
      setDragOffset(0);

      const dragDistance = Math.abs(info.offset.x);
      const velocity = Math.abs(info.velocity.x);

      // Determine if switch should occur (either distance or velocity threshold)
      const shouldSwitch = dragDistance > 100 || velocity > 500;

      if (shouldSwitch) {
        const newMode: PlatformType =
          info.offset.x > 0
            ? currentMode === 'platform'
              ? 'client'
              : 'platform'
            : currentMode === 'client'
              ? 'platform'
              : 'client';

        if (newMode !== currentMode) {
          // Strong haptic feedback for successful switch
          if (hapticSupported) {
            triggerHaptic('notification', 1.0);
          }
          onSwitch(newMode);
        }
      } else {
        // Light haptic feedback for failed switch
        if (hapticSupported) {
          triggerHaptic('impact', 0.2);
        }
      }
    },
    [disabled, currentMode, onSwitch, hapticSupported, triggerHaptic],
  );

  // Render feature comparison item
  const renderFeatureItem = (feature: AIFeatureComparison, index: number) => {
    const IconComponent = FEATURE_ICONS[feature.feature] || Zap;
    const isSelected = selectedFeature === feature.feature;

    return (
      <motion.div
        key={feature.feature}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`p-4 rounded-xl border transition-all duration-200 ${
          isSelected
            ? 'border-purple-300 bg-purple-50'
            : 'border-gray-200 bg-white'
        }`}
        style={{ minHeight: '48px' }}
        onClick={() => {
          if (hapticSupported) triggerHaptic('selection');
          setSelectedFeature(isSelected ? null : feature.feature);
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
              <IconComponent className="w-4 h-4 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900 capitalize">
              {feature.feature.replace('-', ' ')}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Platform Column */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Platform AI</div>
            <div className="flex items-center justify-center">
              {feature.platformIncluded ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Included</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <X className="w-4 h-4" />
                  <span className="text-sm">Not available</span>
                </div>
              )}
            </div>
            {feature.platformLimits && (
              <div className="text-xs text-gray-500 mt-1">
                {feature.platformLimits.monthly
                  ? `${feature.platformLimits.monthly}/mo`
                  : 'Limited'}
              </div>
            )}
          </div>

          {/* Client Column */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Client API</div>
            <div className="flex items-center justify-center">
              {feature.clientAvailable ? (
                <div className="flex items-center gap-1 text-blue-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Available</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <X className="w-4 h-4" />
                  <span className="text-sm">Not supported</span>
                </div>
              )}
            </div>
            {feature.clientCosts && (
              <div className="text-xs text-gray-600 mt-1">
                ${feature.clientCosts.perRequest.toFixed(3)}/request
              </div>
            )}
          </div>
        </div>

        {/* Wedding scenarios for selected feature */}
        <AnimatePresence>
          {isSelected && feature.weddingScenarios.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-100 pt-3 mt-3"
            >
              <div className="text-xs text-gray-500 mb-2">
                Wedding scenarios:
              </div>
              <div className="space-y-2">
                {feature.weddingScenarios.map((scenario, scenarioIndex) => (
                  <div
                    key={scenarioIndex}
                    className="bg-gray-50 rounded-lg p-2 text-xs"
                  >
                    <div className="font-medium text-gray-700 mb-1">
                      {scenario.scenario}
                    </div>
                    <div className="text-gray-600">{scenario.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          scenario.recommendedChoice === 'platform'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {scenario.recommendedChoice === 'platform'
                          ? 'Platform AI'
                          : 'Client API'}
                      </span>
                      <span className="text-gray-500">
                        {scenario.mobileContext}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Render cost comparison
  const renderCostComparison = () => {
    if (!comparison?.costComparison || !savingsData) return null;

    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Cost Analysis</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Platform AI</div>
            <div className="text-lg font-bold text-green-600">
              ${comparison.costComparison.platformMonthly}/mo
            </div>
            <div className="text-xs text-gray-500">Fixed cost</div>
          </div>

          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Client API</div>
            <div className="text-lg font-bold text-blue-600">
              ${comparison.costComparison.averageClientCosts.total}/mo
            </div>
            <div className="text-xs text-gray-500">Average usage</div>
          </div>
        </div>

        {savingsData.monthly !== 0 && (
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-sm text-gray-600 mb-1">
              {savingsData.monthly > 0
                ? 'Potential Monthly Savings'
                : 'Monthly Cost Increase'}
            </div>
            <div
              className={`text-xl font-bold ${savingsData.monthly > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {savingsData.monthly > 0 ? '+' : ''}$
              {Math.abs(savingsData.monthly).toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">
              Break-even at {savingsData.breakEven} requests/month
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`platform-client-toggle ${className}`}>
      {/* Main Toggle Interface */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header with current mode indicator */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${currentMode === 'platform' ? 'bg-green-500' : 'bg-blue-500'}`}
              />
              <div>
                <div className="font-medium text-gray-900">
                  {currentMode === 'platform' ? 'Platform AI' : 'Client API'}{' '}
                  Mode
                </div>
                <div className="text-xs text-gray-500">
                  {currentMode === 'platform'
                    ? 'Included in your subscription'
                    : 'Using your own API keys'}
                </div>
              </div>
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              {loading ? (
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* Swipeable Card Interface */}
        <div
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ touchAction: 'pan-y pinch-zoom' }}
        >
          <motion.div
            drag="x"
            dragConstraints={dragConstraints}
            dragElastic={0.3}
            onDragStart={() => setIsDragging(true)}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            animate={{ x: dragOffset }}
            className={`p-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ touchAction: 'none' }}
          >
            {/* Current Mode Card */}
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 mb-4">
              <div className="text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    currentMode === 'platform' ? 'bg-green-100' : 'bg-blue-100'
                  }`}
                >
                  {currentMode === 'platform' ? (
                    <Shield className="w-6 h-6 text-green-600" />
                  ) : (
                    <Zap className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {currentMode === 'platform' ? 'Platform AI' : 'Client API'}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {currentMode === 'platform'
                    ? 'AI features included with your WedSync subscription'
                    : 'Your own AI provider keys for unlimited usage'}
                </p>

                {/* Switch suggestion */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ArrowRight className="w-3 h-3" />
                  <span>Swipe to switch modes</span>
                  <ArrowRight className="w-3 h-3 rotate-180" />
                </div>
              </div>
            </div>

            {/* Recommendation Badge */}
            {comparison?.recommendedChoice && (
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                  comparison.recommendedChoice === currentMode
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Star className="w-3 h-3" />
                <span>
                  {comparison.recommendedChoice === currentMode
                    ? 'Recommended choice'
                    : `Consider switching to ${comparison.recommendedChoice === 'platform' ? 'Platform AI' : 'Client API'}`}
                </span>
              </div>
            )}
          </motion.div>

          {/* Drag indicator overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-full px-4 py-2 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {dragOffset > 50 ? (
                    <>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                      <span>Release to switch to Client API</span>
                    </>
                  ) : dragOffset < -50 ? (
                    <>
                      <ArrowRight className="w-4 h-4 text-green-600 rotate-180" />
                      <span>Release to switch to Platform AI</span>
                    </>
                  ) : (
                    <span className="text-gray-500">
                      Keep swiping to switch
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Comparison */}
      {showDetailedComparison && comparison && (
        <div className="mt-6 space-y-4">
          {/* Toggle for details */}
          <button
            onClick={() => {
              if (hapticSupported) triggerHaptic('selection');
              setShowDetails(!showDetails);
            }}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors min-h-[48px]"
            style={{ touchAction: 'manipulation' }}
          >
            <span className="font-medium text-gray-700">
              Feature Comparison
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Cost comparison */}
                {renderCostComparison()}

                {/* Feature list */}
                <div className="space-y-3">
                  {comparison.platformFeatures.map((feature, index) =>
                    renderFeatureItem(feature, index),
                  )}
                </div>

                {/* Performance metrics */}
                {comparison.performanceMetrics && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Performance Comparison
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          Platform AI
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {comparison.performanceMetrics.platformLatency}ms
                        </div>
                        <div className="text-xs text-gray-500">
                          Average response
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          Client API
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          {comparison.performanceMetrics.clientLatency}ms
                        </div>
                        <div className="text-xs text-gray-500">
                          Average response
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Wedding industry tips */}
      <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
        <div className="flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-purple-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-purple-900">
              Mobile Tip
            </div>
            <div className="text-xs text-purple-700">
              Photographers: Use Client API for unlimited photo processing.
              Venues: Platform AI is perfect for occasional description
              generation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformVsClientMobileToggle;
