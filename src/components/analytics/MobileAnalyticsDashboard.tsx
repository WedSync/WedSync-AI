'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  PanInfo,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Heart,
  Camera,
  MapPin,
  Clock,
  Star,
  Phone,
  MessageCircle,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Filter,
  Search,
  Bell,
  Settings,
  Menu,
  X,
} from 'lucide-react';

// Type imports
import type {
  MobileAnalyticsDashboardProps,
  MobileDashboardCard,
  QuickActionConfig,
  MobileViewMode,
  SwipeDirection,
  TouchGesture,
  MobileMetric,
  WeddingQuickStat,
  MobileChartConfig,
  NotificationBadge,
  MobileFilterConfig,
} from '@/types/analytics';

// Mock data for mobile dashboard
const generateMobileMetrics = (): MobileMetric[] => [
  {
    id: 'revenue-today',
    title: "Today's Revenue",
    value: '£2,340',
    change: 12.5,
    trend: 'up',
    icon: DollarSign,
    color: 'green',
    priority: 'high',
    tapAction: 'view-revenue-detail',
  },
  {
    id: 'bookings-pending',
    title: 'Pending Bookings',
    value: '7',
    change: -2,
    trend: 'down',
    icon: Calendar,
    color: 'orange',
    priority: 'high',
    tapAction: 'view-bookings',
  },
  {
    id: 'satisfaction-score',
    title: 'Client Satisfaction',
    value: '4.8★',
    change: 0.2,
    trend: 'up',
    icon: Heart,
    color: 'pink',
    priority: 'medium',
    tapAction: 'view-reviews',
  },
  {
    id: 'response-time',
    title: 'Avg Response Time',
    value: '12 min',
    change: -5.2,
    trend: 'up',
    icon: MessageCircle,
    color: 'blue',
    priority: 'medium',
    tapAction: 'view-communications',
  },
  {
    id: 'wedding-season',
    title: 'Season Performance',
    value: '89%',
    change: 15.3,
    trend: 'up',
    icon: TrendingUp,
    color: 'purple',
    priority: 'low',
    tapAction: 'view-seasonal-trends',
  },
  {
    id: 'location-reach',
    title: 'Service Areas',
    value: '23',
    change: 3,
    trend: 'up',
    icon: MapPin,
    color: 'teal',
    priority: 'low',
    tapAction: 'view-location-analytics',
  },
];

const generateQuickStats = (): WeddingQuickStat[] => [
  { label: 'This Week', value: '12 bookings', status: 'positive' },
  { label: 'Next Wedding', value: '3 days', status: 'neutral' },
  { label: 'Completion Rate', value: '94%', status: 'positive' },
  { label: 'Client Calls', value: '8 pending', status: 'warning' },
];

const generateQuickActions = (): QuickActionConfig[] => [
  {
    id: 'call-client',
    icon: Phone,
    label: 'Call Client',
    color: 'green',
    urgent: true,
  },
  {
    id: 'send-update',
    icon: MessageCircle,
    label: 'Send Update',
    color: 'blue',
    urgent: false,
  },
  {
    id: 'check-weather',
    icon: Activity,
    label: 'Weather Check',
    color: 'orange',
    urgent: false,
  },
  {
    id: 'venue-directions',
    icon: MapPin,
    label: 'Get Directions',
    color: 'purple',
    urgent: false,
  },
];

const MobileAnalyticsDashboard: React.FC<MobileAnalyticsDashboardProps> = ({
  userId,
  dateRange,
  refreshInterval = 30000,
  enableNotifications = true,
  compactMode = false,
  theme = 'light',
  onMetricTap,
  onQuickAction,
  onRefresh,
  className = '',
}) => {
  // State management
  const [currentView, setCurrentView] = useState<MobileViewMode>('overview');
  const [metrics, setMetrics] = useState<MobileMetric[]>(
    generateMobileMetrics(),
  );
  const [quickStats, setQuickStats] =
    useState<WeddingQuickStat[]>(generateQuickStats());
  const [quickActions, setQuickActions] = useState<QuickActionConfig[]>(
    generateQuickActions(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState<NotificationBadge[]>([
    { id: '1', type: 'urgent', count: 3, message: 'Client responses needed' },
    { id: '2', type: 'info', count: 1, message: 'Weather alert for Saturday' },
  ]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Touch/swipe handling
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0, 0.5, 1, 0.5, 0],
  );

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Handle swipe gestures
  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const threshold = 50;
      const direction: SwipeDirection =
        info.offset.x > threshold
          ? 'right'
          : info.offset.x < -threshold
            ? 'left'
            : 'none';

      if (direction === 'left' && currentCardIndex < metrics.length - 1) {
        setCurrentCardIndex((prev) => prev + 1);
      } else if (direction === 'right' && currentCardIndex > 0) {
        setCurrentCardIndex((prev) => prev - 1);
      }

      // Reset position
      x.set(0);
    },
    [currentCardIndex, metrics.length, x],
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update data
    setMetrics(generateMobileMetrics());
    setQuickStats(generateQuickStats());
    setLastRefresh(new Date());
    setIsLoading(false);

    onRefresh?.();
  }, [onRefresh]);

  // Handle metric tap
  const handleMetricTap = useCallback(
    (metric: MobileMetric) => {
      // Haptic feedback simulation
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      onMetricTap?.(metric);
    },
    [onMetricTap],
  );

  // Handle quick action
  const handleQuickAction = useCallback(
    (action: QuickActionConfig) => {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      onQuickAction?.(action);
    },
    [onQuickAction],
  );

  // View modes
  const views: Record<MobileViewMode, JSX.Element> = useMemo(
    () => ({
      overview: (
        <div className="space-y-4">
          {/* Current metric card with swipe */}
          <div className="relative h-48">
            <AnimatePresence mode="wait">
              {metrics.map(
                (metric, index) =>
                  index === currentCardIndex && (
                    <motion.div
                      key={metric.id}
                      className="absolute inset-0"
                      style={{ x, rotate, opacity }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={handleDragEnd}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <div
                        className="bg-white rounded-2xl shadow-lg p-6 h-full cursor-pointer"
                        onClick={() => handleMetricTap(metric)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`p-3 rounded-full bg-${metric.color}-100`}
                          >
                            <metric.icon
                              className={`w-6 h-6 text-${metric.color}-600`}
                            />
                          </div>
                          {metric.priority === 'high' && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              High Priority
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm text-gray-600 mb-2">
                          {metric.title}
                        </h3>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-bold text-gray-900">
                            {metric.value}
                          </span>
                          <div
                            className={`flex items-center ${
                              metric.trend === 'up'
                                ? 'text-green-600'
                                : metric.trend === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                              {metric.change > 0 ? '+' : ''}
                              {metric.change}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ),
              )}
            </AnimatePresence>

            {/* Card indicators */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {metrics.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentCardIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  onClick={() => setCurrentCardIndex(index)}
                />
              ))}
            </div>
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickStats.map((stat, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl shadow-sm p-4"
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p
                  className={`text-lg font-semibold ${
                    stat.status === 'positive'
                      ? 'text-green-600'
                      : stat.status === 'warning'
                        ? 'text-orange-600'
                        : 'text-gray-900'
                  }`}
                >
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  className={`flex items-center justify-center p-3 rounded-lg bg-${action.color}-50 border border-${action.color}-200 relative`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAction(action)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <action.icon
                    className={`w-5 h-5 text-${action.color}-600 mr-2`}
                  />
                  <span
                    className={`text-sm font-medium text-${action.color}-600`}
                  >
                    {action.label}
                  </span>
                  {action.urgent && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      ),

      detailed: (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detailed Analytics
            </h3>
            {/* Detailed charts would go here */}
            <div className="grid grid-cols-1 gap-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.id}
                  className="border border-gray-200 rounded-lg p-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <metric.icon
                        className={`w-5 h-5 text-${metric.color}-600 mr-2`}
                      />
                      <span className="font-medium text-gray-900">
                        {metric.title}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {metric.value}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-${metric.color}-500 h-2 rounded-full`}
                      style={{ width: `${Math.abs(metric.change) * 5}%` }}
                    ></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ),

      notifications: (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notifications
            </h3>
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  className={`flex items-center p-3 rounded-lg ${
                    notification.type === 'urgent'
                      ? 'bg-red-50 border border-red-200'
                      : notification.type === 'warning'
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-blue-50 border border-blue-200'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Bell
                    className={`w-5 h-5 mr-3 ${
                      notification.type === 'urgent'
                        ? 'text-red-600'
                        : notification.type === 'warning'
                          ? 'text-orange-600'
                          : 'text-blue-600'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.message}
                    </p>
                  </div>
                  {notification.count > 1 && (
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        notification.type === 'urgent'
                          ? 'bg-red-200 text-red-800'
                          : notification.type === 'warning'
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {notification.count}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ),
    }),
    [
      metrics,
      quickStats,
      quickActions,
      notifications,
      currentCardIndex,
      handleDragEnd,
      handleMetricTap,
      handleQuickAction,
      x,
      rotate,
      opacity,
    ],
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile header */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h1 className="ml-3 text-lg font-semibold text-gray-900">
              Analytics
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                className="relative p-2"
                onClick={() => setCurrentView('notifications')}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notifications.reduce((sum, n) => sum + n.count, 0)}
                </span>
              </button>
            )}
            <button
              className="p-2"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              className="p-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-t border-gray-200">
          {(['overview', 'detailed', 'notifications'] as MobileViewMode[]).map(
            (view) => (
              <button
                key={view}
                className={`flex-1 py-3 text-sm font-medium capitalize ${
                  currentView === view
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500'
                }`}
                onClick={() => setCurrentView(view)}
              >
                {view}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {views[currentView]}
          </motion.div>
        </AnimatePresence>

        {/* Last refresh indicator */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Pull-to-refresh overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-start justify-center pt-20 z-50">
          <div className="bg-white rounded-full p-3 shadow-lg">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </div>
      )}

      {/* Filter overlay */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-6"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Today', 'This Week', 'This Month'].map((period) => (
                      <button
                        key={period}
                        className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metric Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Revenue', 'Bookings', 'Satisfaction', 'Performance'].map(
                      (type) => (
                        <button
                          key={type}
                          className="py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          {type}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium">
                  Reset
                </button>
                <button className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium">
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileAnalyticsDashboard;
