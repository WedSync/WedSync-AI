'use client';

/**
 * WS-239: Mobile AI Feature Manager
 * Main orchestrator for mobile AI feature selection and management
 * Optimized for wedding suppliers working on-the-go
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Zap,
  TrendingUp,
  Settings,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowLeft,
  MoreVertical,
  Sparkles,
  DollarSign,
  Shield,
} from 'lucide-react';

import type {
  MobileAIFeatureManagerProps,
  PlatformType,
  PlatformClientComparison,
  CostMonitorView,
  AIFeatureType,
  ConnectionStatus,
  BudgetAlert,
  SetupResult,
} from '@/types/wedme-ai';

// Import our mobile-specific hooks and utilities
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { AutoPopulationSecurity } from '@/lib/mobile/auto-population-security';

// Import child components
import PlatformVsClientMobileToggle from './PlatformVsClientMobileToggle';
import MobileAPIKeySetup from './MobileAPIKeySetup';
import MobileCostMonitor from './MobileCostMonitor';
import AIFeatureMigrationMobile from './AIFeatureMigrationMobile';

// Wedding supplier scenarios for context-aware suggestions
const WEDDING_SCENARIOS = [
  {
    type: 'photographer',
    title: 'Photography Session',
    description: 'Auto-tag photos during wedding shoots',
    preferredMode: 'client' as PlatformType,
    reason: 'Unlimited photo processing needed',
  },
  {
    type: 'planner',
    title: 'Client Meeting',
    description: 'Generate timeline suggestions with clients',
    preferredMode: 'platform' as PlatformType,
    reason: 'Included in your plan, quick access',
  },
  {
    type: 'venue',
    title: 'Venue Tour',
    description: 'AI descriptions for space features',
    preferredMode: 'platform' as PlatformType,
    reason: 'Cost-effective for occasional use',
  },
  {
    type: 'caterer',
    title: 'Menu Planning',
    description: 'AI-powered menu descriptions and pairings',
    preferredMode: 'client' as PlatformType,
    reason: 'Volume pricing better for many menus',
  },
];

const MobileAIFeatureManager: React.FC<MobileAIFeatureManagerProps> = ({
  userId,
  organizationId,
  initialMode = 'platform',
  onModeChange,
  offlineMode = false,
  className = '',
}) => {
  // State management
  const [currentMode, setCurrentMode] = useState<PlatformType>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connected');

  // Feature state
  const [comparison, setComparison] = useState<PlatformClientComparison | null>(
    null,
  );
  const [costMonitor, setCostMonitor] = useState<CostMonitorView | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [quickActions, setQuickActions] = useState<string[]>([]);

  // Mobile-specific hooks
  const { isOnline, queueAction, isPending, queueSize } = useOfflineSync();
  const { triggerHaptic, isSupported: hapticSupported } = useHapticFeedback();

  // Wedding context detection
  const currentScenario = useMemo(() => {
    // In a real implementation, this would analyze current context
    // For now, default to planner scenario
    return (
      WEDDING_SCENARIOS.find((s) => s.type === 'planner') ||
      WEDDING_SCENARIOS[1]
    );
  }, []);

  // Load comparison data
  const loadComparison = useCallback(async () => {
    if (!isOnline && !offlineMode) {
      setError('Connection required for feature comparison');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In offline mode, use cached data
      if (offlineMode || !isOnline) {
        const cachedComparison =
          await AutoPopulationSecurity.getSecureItem<PlatformClientComparison>(
            'ai_feature_comparison',
          );
        if (cachedComparison) {
          setComparison(cachedComparison);
        } else {
          setError(
            'Offline data not available. Connect to internet to load features.',
          );
        }
        return;
      }

      // Fetch live comparison data
      const response = await fetch('/api/ai-features/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, userId, currentMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to load feature comparison');
      }

      const data = await response.json();
      setComparison(data);

      // Cache for offline use
      await AutoPopulationSecurity.setSecureItem('ai_feature_comparison', data);
    } catch (error) {
      console.error('Comparison load failed:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load features',
      );
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, userId, currentMode, isOnline, offlineMode]);

  // Load cost monitoring data
  const loadCostMonitor = useCallback(async () => {
    try {
      if (currentMode === 'platform') {
        // Platform costs are included in subscription
        setCostMonitor({
          currentSpend: 0,
          budget: 0,
          alerts: [],
          projections: {
            daily: 0,
            weekly: 0,
            monthly: 0,
            seasonalMultiplier: 1,
            confidence: 1,
            scenarios: [],
          },
          offlineQueue: [],
        });
        return;
      }

      // For client mode, fetch real cost data
      const response = await fetch('/api/ai-features/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, userId, mode: currentMode }),
      });

      if (response.ok) {
        const data = await response.json();
        setCostMonitor(data);
        setBudgetAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Cost monitor load failed:', error);
    }
  }, [organizationId, userId, currentMode]);

  // Handle mode switching
  const handleModeSwitch = useCallback(
    async (newMode: PlatformType) => {
      if (newMode === currentMode) return;

      // Haptic feedback for mode switch
      if (hapticSupported) {
        triggerHaptic('selection', 0.8);
      }

      const switchAction = async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Check if migration is needed
          const needsMigration =
            currentMode === 'platform' && newMode === 'client';

          if (needsMigration && !showMigration) {
            setShowMigration(true);
            return;
          }

          // Perform the switch
          const response = await fetch('/api/ai-features/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              userId,
              fromMode: currentMode,
              toMode: newMode,
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            throw new Error('Mode switch failed');
          }

          const result = await response.json();

          setCurrentMode(newMode);
          onModeChange?.(newMode);

          // Log successful switch
          AutoPopulationSecurity.logSecurityEvent('ai_mode_switch', {
            from: currentMode,
            to: newMode,
            migrationRequired: needsMigration,
          });

          // Refresh data for new mode
          await Promise.all([loadComparison(), loadCostMonitor()]);
        } catch (error) {
          setError(
            error instanceof Error ? error.message : 'Failed to switch modes',
          );
          // Haptic feedback for error
          if (hapticSupported) {
            triggerHaptic('notification', 0.3);
          }
        } finally {
          setIsLoading(false);
        }
      };

      // Queue action if offline
      if (!isOnline) {
        await queueAction('switch-ai-mode', switchAction);
      } else {
        await switchAction();
      }
    },
    [
      currentMode,
      organizationId,
      userId,
      onModeChange,
      isOnline,
      queueAction,
      hapticSupported,
      triggerHaptic,
      showMigration,
      loadComparison,
      loadCostMonitor,
    ],
  );

  // Handle API setup completion
  const handleSetupComplete = useCallback(
    async (result: SetupResult) => {
      if (result.success) {
        setShowSetup(false);

        // Haptic feedback for successful setup
        if (hapticSupported) {
          triggerHaptic('notification', 1.0);
        }

        // Refresh data after successful setup
        await Promise.all([loadComparison(), loadCostMonitor()]);

        // Add quick action for testing
        setQuickActions((prev) => [...prev, 'Test your new AI setup']);
      } else {
        setError(result.message);
      }
    },
    [hapticSupported, triggerHaptic, loadComparison, loadCostMonitor],
  );

  // Load initial data
  useEffect(() => {
    loadComparison();
    loadCostMonitor();
  }, [loadComparison, loadCostMonitor]);

  // Connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      if (!isOnline) {
        setConnectionStatus('disconnected');
        return;
      }

      try {
        const response = await fetch('/api/health/ai-features', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        setConnectionStatus(response.ok ? 'connected' : 'error');
      } catch {
        setConnectionStatus('error');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [isOnline]);

  // Render connection status indicator
  const renderConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {connectionStatus === 'connected' ? (
        <div className="flex items-center gap-1 text-green-600">
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
        </div>
      ) : connectionStatus === 'disconnected' ? (
        <div className="flex items-center gap-1 text-amber-600">
          <WifiOff className="w-4 h-4" />
          <span>Offline{queueSize > 0 ? ` (${queueSize} queued)` : ''}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span>Connection Issue</span>
        </div>
      )}
    </div>
  );

  // Render scenario-based suggestion
  const renderScenarioSuggestion = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 border border-purple-100"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {currentScenario.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {currentScenario.description}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
              Recommended:{' '}
              {currentScenario.preferredMode === 'platform'
                ? 'Platform AI'
                : 'Client AI'}
            </span>
            <span className="text-xs text-gray-500">
              {currentScenario.reason}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Render budget alerts
  const renderBudgetAlerts = () => {
    if (!budgetAlerts.length) return null;

    return (
      <div className="mb-4 space-y-2">
        {budgetAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg border-l-4 ${
              alert.level === 'critical'
                ? 'bg-red-50 border-red-500'
                : alert.level === 'high'
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-yellow-50 border-yellow-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    alert.level === 'critical'
                      ? 'text-red-500'
                      : alert.level === 'high'
                        ? 'text-orange-500'
                        : 'text-yellow-500'
                  }`}
                />
                <span className="font-medium text-sm">{alert.message}</span>
              </div>
              {alert.dismissable && (
                <button
                  onClick={() =>
                    setBudgetAlerts((prev) =>
                      prev.filter((a) => a.id !== alert.id),
                    )
                  }
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            {alert.actionRequired && (
              <p className="text-xs text-gray-600 mt-1 ml-6">
                {alert.actionRequired}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  // Main render
  return (
    <div className={`mobile-ai-feature-manager ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI Features</h1>
              <p className="text-xs text-gray-500">
                {currentMode === 'platform'
                  ? 'Using Platform AI'
                  : 'Using Client API'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {renderConnectionStatus()}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
              <span className="text-gray-600">Loading AI features...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Connection Error</h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    loadComparison();
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scenario Suggestion */}
        {!isLoading && !error && renderScenarioSuggestion()}

        {/* Budget Alerts */}
        <AnimatePresence>{renderBudgetAlerts()}</AnimatePresence>

        {/* Platform vs Client Toggle */}
        {!isLoading && comparison && (
          <PlatformVsClientMobileToggle
            currentMode={currentMode}
            comparison={comparison}
            onSwitch={handleModeSwitch}
            loading={isLoading}
            disabled={isPending}
            showDetailedComparison={true}
            mobileOptimized={true}
            className="mb-6"
          />
        )}

        {/* API Key Setup Button (Client Mode) */}
        {currentMode === 'client' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowSetup(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-4 flex items-center gap-3 min-h-[48px] shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
            style={{ touchAction: 'manipulation' }}
          >
            <Settings className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Setup API Keys</div>
              <div className="text-xs opacity-90">
                Configure your AI providers
              </div>
            </div>
          </motion.button>
        )}

        {/* Cost Monitor */}
        {costMonitor && (
          <MobileCostMonitor
            mode={currentMode}
            refreshInterval={30000}
            showProjections={true}
            enableAlerts={true}
            onBudgetExceeded={(alert) =>
              setBudgetAlerts((prev) => [...prev, alert])
            }
            offlineData={costMonitor.offlineQueue}
            compactView={false}
            className="mt-6"
          />
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Quick Actions</h3>
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (hapticSupported) triggerHaptic('selection');
                  setQuickActions((prev) => prev.filter((_, i) => i !== index));
                }}
                className="w-full bg-gray-50 hover:bg-gray-100 rounded-lg p-3 text-left text-sm text-gray-700 transition-colors min-h-[48px] flex items-center"
              >
                {action}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlays */}
      <AnimatePresence>
        {/* API Key Setup Modal */}
        {showSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowSetup(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <MobileAPIKeySetup
                provider="openai"
                onComplete={handleSetupComplete}
                onCancel={() => setShowSetup(false)}
                biometricAvailable={true}
                touchOptimized={true}
              />
            </motion.div>
          </motion.div>
        )}

        {/* Migration Modal */}
        {showMigration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowMigration(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <AIFeatureMigrationMobile
                fromMode="platform"
                toMode="client"
                onComplete={() => {
                  setShowMigration(false);
                  setCurrentMode('client');
                  onModeChange?.('client');
                }}
                onCancel={() => setShowMigration(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileAIFeatureManager;
