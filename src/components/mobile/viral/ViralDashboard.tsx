'use client';

// =====================================================
// VIRAL DASHBOARD MOBILE COMPONENT
// WS-230 Enhanced Viral Coefficient Tracking System
// Team D - Mobile/PWA Implementation
// =====================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import {
  Share,
  TrendingUp,
  Users,
  Target,
  RefreshCcw,
  ChevronUp,
  Bell,
  Zap,
  Award,
  Send,
} from 'lucide-react';

import {
  ViralCoefficient,
  ViralDashboardState,
  ViralMetricType,
  HapticFeedback,
  VIRAL_COLORS,
  HAPTIC_PATTERNS,
} from '@/types/viral-tracking';

// =====================================================
// ZUSTAND STORE FOR DASHBOARD STATE
// =====================================================

interface ViralDashboardStore extends ViralDashboardState {
  setSelectedPeriod: (period: 'DAILY' | 'WEEKLY' | 'MONTHLY') => void;
  setIsRefreshing: (refreshing: boolean) => void;
  setLastUpdated: (date: Date) => void;
  setSelectedMetric: (metric: ViralMetricType) => void;
  setBottomSheetOpen: (
    open: boolean,
    content?: 'INVITATIONS' | 'CONVERSIONS' | 'MILESTONES' | null,
  ) => void;
  triggerHaptic: (type: HapticFeedback['type']) => void;
}

const useViralDashboard = create<ViralDashboardStore>((set, get) => ({
  selectedPeriod: 'WEEKLY',
  isRefreshing: false,
  lastUpdated: null,
  selectedMetric: 'K_FACTOR',
  showBottomSheet: false,
  bottomSheetContent: null,

  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  setLastUpdated: (date) => set({ lastUpdated: date }),
  setSelectedMetric: (metric) => set({ selectedMetric: metric }),
  setBottomSheetOpen: (open, content = null) =>
    set({
      showBottomSheet: open,
      bottomSheetContent: content,
    }),

  triggerHaptic: (type) => {
    if ('vibrate' in navigator) {
      const pattern = HAPTIC_PATTERNS[type] || [50];
      navigator.vibrate(pattern);
    }
  },
}));

// =====================================================
// VIRAL ANALYTICS HOOK
// =====================================================

const useViralAnalytics = () => {
  const { selectedPeriod } = useViralDashboard();

  return useQuery({
    queryKey: ['viral-analytics', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(
        `/api/viral/analytics?period=${selectedPeriod}`,
      );
      if (!response.ok) throw new Error('Failed to fetch viral analytics');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider fresh for 15 seconds
  });
};

// =====================================================
// METRIC CARD COMPONENT
// =====================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  color: string;
  icon: React.ElementType;
  isSelected: boolean;
  onClick: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  color,
  icon: Icon,
  isSelected,
  onClick,
}) => {
  const { triggerHaptic } = useViralDashboard();

  const handleClick = useCallback(() => {
    triggerHaptic('LIGHT');
    onClick();
  }, [onClick, triggerHaptic]);

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={`
        relative overflow-hidden rounded-2xl p-4 cursor-pointer
        transition-all duration-200 touch-manipulation
        ${
          isSelected
            ? 'bg-white shadow-lg ring-2 ring-blue-500'
            : 'bg-gray-50 shadow-sm hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toFixed(2) : value}
          </p>

          {/* Trend Indicator */}
          <div className="flex items-center mt-2">
            <TrendingUp
              className={`w-4 h-4 mr-1 ${
                trend === 'UP'
                  ? 'text-green-500'
                  : trend === 'DOWN'
                    ? 'text-red-500 rotate-180'
                    : 'text-gray-400'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                change > 0
                  ? 'text-green-600'
                  : change < 0
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          </div>
        </div>

        <div
          className={`p-2 rounded-lg`}
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          className="absolute bottom-0 left-0 h-1 rounded-t-full"
          style={{ backgroundColor: color }}
        />
      )}
    </motion.div>
  );
};

// =====================================================
// PULL TO REFRESH COMPONENT
// =====================================================

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { triggerHaptic } = useViralDashboard();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    // Store initial touch position
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (window.scrollY > 0) return;

      const touch = e.touches[0];
      const distance = Math.max(0, touch.clientY - 50);
      setPullDistance(Math.min(distance, 100));

      if (distance > 60 && !isRefreshing) {
        triggerHaptic('LIGHT');
      }
    },
    [isRefreshing, triggerHaptic],
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('SUCCESS');
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, isRefreshing, onRefresh, triggerHaptic]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull to Refresh Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{
          opacity: pullDistance > 20 ? 1 : 0,
          y: pullDistance > 20 ? 0 : -50,
        }}
        className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10"
      >
        <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-lg">
          <RefreshCcw
            className={`w-5 h-5 text-blue-500 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {isRefreshing
              ? 'Refreshing...'
              : pullDistance > 60
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </div>
      </motion.div>

      <motion.div
        style={{
          transform: `translateY(${Math.min(pullDistance, 100)}px)`,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// =====================================================
// BOTTOM SHEET COMPONENT
// =====================================================

const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl z-50 max-h-[80vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// =====================================================
// QUICK ACTIONS COMPONENT
// =====================================================

const QuickActions: React.FC = () => {
  const { triggerHaptic } = useViralDashboard();

  const actions = [
    {
      icon: Send,
      label: 'Send Invite',
      color: VIRAL_COLORS.INVITATIONS,
      action: () => {
        triggerHaptic('LIGHT');
        // TODO: Open invite modal
      },
    },
    {
      icon: Share,
      label: 'Share Link',
      color: VIRAL_COLORS.K_FACTOR,
      action: async () => {
        triggerHaptic('LIGHT');
        if (navigator.share) {
          await navigator.share({
            title: 'Join WedSync',
            text: 'Manage your wedding like a pro!',
            url: window.location.origin + '/invite',
          });
        }
      },
    },
    {
      icon: Target,
      label: 'Milestones',
      color: VIRAL_COLORS.MILESTONE,
      action: () => {
        triggerHaptic('LIGHT');
        useViralDashboard.getState().setBottomSheetOpen(true, 'MILESTONES');
      },
    },
    {
      icon: Bell,
      label: 'Alerts',
      color: VIRAL_COLORS.WARNING,
      action: () => {
        triggerHaptic('LIGHT');
        // TODO: Open notifications
      },
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action, index) => (
        <motion.button
          key={index}
          whileTap={{ scale: 0.9 }}
          onClick={action.action}
          className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all touch-manipulation"
        >
          <div
            className="p-2 rounded-lg mb-2"
            style={{ backgroundColor: `${action.color}20` }}
          >
            <action.icon className="w-5 h-5" style={{ color: action.color }} />
          </div>
          <span className="text-xs font-medium text-gray-700 text-center">
            {action.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

// =====================================================
// MAIN VIRAL DASHBOARD COMPONENT
// =====================================================

const ViralDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: analytics, isLoading, error } = useViralAnalytics();

  const {
    selectedPeriod,
    selectedMetric,
    showBottomSheet,
    bottomSheetContent,
    setSelectedPeriod,
    setSelectedMetric,
    setBottomSheetOpen,
    setLastUpdated,
    triggerHaptic,
  } = useViralDashboard();

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['viral-analytics'] });
    setLastUpdated(new Date());
    triggerHaptic('SUCCESS');
  }, [queryClient, setLastUpdated, triggerHaptic]);

  // Metrics configuration
  const metrics = useMemo(
    () => [
      {
        key: 'K_FACTOR',
        title: 'K-Factor',
        value: analytics?.summary?.avg_k_factor || 0,
        change: 12.5,
        trend: 'UP' as const,
        color: VIRAL_COLORS.K_FACTOR,
        icon: Zap,
      },
      {
        key: 'VIRAL_COEFFICIENT',
        title: 'Viral Coefficient',
        value: analytics?.coefficients?.[0]?.viral_coefficient || 0,
        change: 8.2,
        trend: 'UP' as const,
        color: VIRAL_COLORS.VIRAL_COEFFICIENT,
        icon: TrendingUp,
      },
      {
        key: 'CONVERSIONS',
        title: 'Conversions',
        value: analytics?.summary?.total_conversions || 0,
        change: -2.1,
        trend: 'DOWN' as const,
        color: VIRAL_COLORS.CONVERSIONS,
        icon: Target,
      },
      {
        key: 'INVITATIONS',
        title: 'Invitations',
        value: analytics?.summary?.total_invitations || 0,
        change: 15.7,
        trend: 'UP' as const,
        color: VIRAL_COLORS.INVITATIONS,
        icon: Users,
      },
    ],
    [analytics],
  );

  // Period selector
  const periods = [
    { key: 'DAILY', label: 'Daily' },
    { key: 'WEEKLY', label: 'Weekly' },
    { key: 'MONTHLY', label: 'Monthly' },
  ] as const;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold mb-2">
            Failed to load viral data
          </p>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Viral Growth</h1>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 bg-gray-100 rounded-lg"
              >
                <RefreshCcw
                  className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
                />
              </motion.button>
            </div>

            {/* Period Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {periods.map((period) => (
                <motion.button
                  key={period.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedPeriod(period.key);
                    triggerHaptic('LIGHT');
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    selectedPeriod === period.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period.label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                title={metric.title}
                value={metric.value}
                change={metric.change}
                trend={metric.trend}
                color={metric.color}
                icon={metric.icon}
                isSelected={selectedMetric === metric.key}
                onClick={() => setSelectedMetric(metric.key as ViralMetricType)}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <QuickActions />
          </div>

          {/* Additional Content Placeholder */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <p className="text-gray-600 text-sm">
              Activity feed will be implemented in the next component.
            </p>
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setBottomSheetOpen(false)}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {bottomSheetContent === 'MILESTONES' && 'Viral Milestones'}
            {bottomSheetContent === 'INVITATIONS' && 'Recent Invitations'}
            {bottomSheetContent === 'CONVERSIONS' && 'Recent Conversions'}
          </h2>
          <p className="text-gray-600">
            {bottomSheetContent} content will be implemented in subsequent
            components.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ViralDashboard;
