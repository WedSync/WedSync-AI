'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  RefreshCw,
  Clock,
  DollarSign,
  Database,
  TrendingUp,
  Activity,
  Settings,
} from 'lucide-react';

import type {
  MobileCacheInterfaceProps,
  CacheStats,
  CachePerformance,
  SupplierType,
} from '@/types/ai-cache';

// Mobile-optimized quick stat card
interface QuickStatCardProps {
  title: string;
  value: string;
  trend: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
  size?: 'compact' | 'regular';
  icon: React.ReactNode;
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({
  title,
  value,
  trend,
  color,
  size = 'compact',
  icon,
}) => {
  const colorClasses = {
    green: 'from-green-50 to-green-100 border-green-200 text-green-700',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-700',
  };

  return (
    <Card
      className={`
      min-w-[140px] bg-gradient-to-br border-2 ${colorClasses[color]}
      ${size === 'compact' ? 'p-3' : 'p-4'}
    `}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-2">
          <div className="opacity-80">{icon}</div>
          <Badge variant="secondary" className="text-xs">
            {trend}
          </Badge>
        </div>
        <div className="space-y-1">
          <div
            className={`font-bold ${size === 'compact' ? 'text-lg' : 'text-xl'}`}
          >
            {value}
          </div>
          <div className="text-xs opacity-80">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
};

// Touch-optimized button component
interface TouchButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  color: 'green' | 'orange' | 'blue';
  disabled?: boolean;
}

const TouchButton: React.FC<TouchButtonProps> = ({
  icon,
  label,
  sublabel,
  onClick,
  color,
  disabled = false,
}) => {
  const colorClasses = {
    green:
      'from-green-50 to-green-100 border-green-200 text-green-700 active:from-green-100 active:to-green-200',
    orange:
      'from-orange-50 to-orange-100 border-orange-200 text-orange-700 active:from-orange-100 active:to-orange-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700 active:from-blue-100 active:to-blue-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center p-4 rounded-xl border-2 
        bg-gradient-to-br active:scale-95 transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colorClasses[color]}
      `}
      style={{ minHeight: '80px' }}
    >
      <div className="mb-1">{icon}</div>
      <span className="font-medium text-sm">{label}</span>
      <span className="text-xs opacity-75">{sublabel}</span>
    </button>
  );
};

// Mobile performance chart component
const MobilePerformanceChart: React.FC<{ data?: any[] }> = ({ data = [] }) => {
  // Simple sparkline-style chart for mobile
  const chartPoints = data.slice(-10); // Last 10 data points

  if (chartPoints.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-gray-500">
        <Activity className="h-4 w-4 mr-2" />
        No performance data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Performance Trend</span>
        <Badge variant="outline" className="text-xs">
          Last 24h
        </Badge>
      </div>

      <div className="relative h-16 bg-gray-50 rounded-lg overflow-hidden">
        {/* Simplified chart visualization */}
        <div className="absolute inset-0 flex items-end justify-between px-2 py-2">
          {chartPoints.map((point, index) => (
            <div
              key={index}
              className="bg-purple-400 rounded-t w-1.5 transition-all duration-300"
              style={{
                height: `${Math.max(10, (point.hitRate || 0) * 0.6)}%`,
                opacity: 0.7 + index * 0.03,
              }}
            />
          ))}
        </div>

        <div className="absolute top-2 left-2 text-xs text-gray-600">
          Hit Rate Trend
        </div>
      </div>
    </div>
  );
};

// Mobile cache activity row
interface MobileCacheActivityRowProps {
  activity: {
    type: 'hit' | 'miss' | 'warm' | 'clear';
    query: string;
    timestamp: string;
    savings?: number;
  };
}

const MobileCacheActivityRow: React.FC<MobileCacheActivityRowProps> = ({
  activity,
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'hit':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'miss':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'warm':
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
      case 'clear':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'hit':
        return 'Cache Hit';
      case 'miss':
        return 'Cache Miss';
      case 'warm':
        return 'Warmed';
      case 'clear':
        return 'Cleared';
      default:
        return 'Activity';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      {getActivityIcon(activity.type)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {getActivityLabel(activity.type)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(activity.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="text-xs text-gray-600 truncate">
          {activity.query.substring(0, 40)}...
        </div>
        {activity.savings && (
          <div className="text-xs text-green-600 font-medium">
            £{activity.savings.toFixed(2)} saved
          </div>
        )}
      </div>
    </div>
  );
};

// Main mobile interface component
export default function MobileCacheInterface({
  supplierId,
  supplierType,
  compactMode = false,
}: MobileCacheInterfaceProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [performance, setPerformance] = useState<CachePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Mock recent activity data
  const [recentActivity] = useState([
    {
      type: 'hit' as const,
      query: 'What are your wedding photography packages?',
      timestamp: new Date().toISOString(),
      savings: 0.45,
    },
    {
      type: 'warm' as const,
      query: 'Do you offer same-day editing?',
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      type: 'hit' as const,
      query: 'What is your pricing for 8-hour coverage?',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      savings: 0.32,
    },
  ]);

  useEffect(() => {
    loadMobileCacheData();
  }, [supplierId]);

  const loadMobileCacheData = async () => {
    try {
      const [statsRes, performanceRes] = await Promise.all([
        fetch(`/api/ai/cache/stats?supplier_id=${supplierId}&range=day`),
        fetch(`/api/ai/cache/performance?supplier_id=${supplierId}&range=day`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (performanceRes.ok) setPerformance(await performanceRes.json());
    } catch (error) {
      console.error('Error loading mobile cache data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerQuickWarming = async () => {
    setActiveAction('warming');
    try {
      const response = await fetch('/api/ai/cache/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: 'popular',
          maxQueries: 50,
          priority: 3,
        }),
      });

      if (response.ok) {
        // Show success feedback
        setTimeout(() => setActiveAction(null), 2000);
      }
    } catch (error) {
      console.error('Error warming cache:', error);
      setActiveAction(null);
    }
  };

  const clearOldEntries = async () => {
    setActiveAction('clearing');
    try {
      const response = await fetch('/api/ai/cache/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: 'old',
          maxAge: 168, // 1 week
        }),
      });

      if (response.ok) {
        setTimeout(() => {
          setActiveAction(null);
          loadMobileCacheData(); // Refresh data
        }, 2000);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      setActiveAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="mobile-cache-interface pb-6">
      {/* Quick Stats Cards - Swipeable */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 px-4" style={{ width: 'max-content' }}>
          <QuickStatCard
            title="Hit Rate"
            value={`${(stats?.overall.hitRate || 0).toFixed(1)}%`}
            trend="+2.1%"
            color="green"
            size="compact"
            icon={<Zap className="h-4 w-4" />}
          />
          <QuickStatCard
            title="Savings"
            value={`£${(stats?.overall.monthlySavings || 0).toFixed(0)}/mo`}
            trend="+£12"
            color="blue"
            size="compact"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <QuickStatCard
            title="Speed"
            value={`${stats?.overall.averageResponseTime || 0}ms`}
            trend="-15ms"
            color="purple"
            size="compact"
            icon={<Clock className="h-4 w-4" />}
          />
          <QuickStatCard
            title="Storage"
            value={stats?.overall.storageUsed || '0MB'}
            trend="Stable"
            color="orange"
            size="compact"
            icon={<Database className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className="font-medium mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <TouchButton
            icon={
              activeAction === 'warming' ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )
            }
            label={activeAction === 'warming' ? 'Warming...' : 'Warm Cache'}
            sublabel="Popular queries"
            onClick={triggerQuickWarming}
            color="green"
            disabled={activeAction === 'warming'}
          />
          <TouchButton
            icon={
              activeAction === 'clearing' ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )
            }
            label={activeAction === 'clearing' ? 'Clearing...' : 'Clear Old'}
            sublabel="Free storage"
            onClick={clearOldEntries}
            color="orange"
            disabled={activeAction === 'clearing'}
          />
        </div>
      </div>

      {/* Performance Summary */}
      <Card className="mx-4 mb-6">
        <CardContent className="pt-4">
          <MobilePerformanceChart data={performance?.metrics} />
        </CardContent>
      </Card>

      {/* Wedding Season Alert */}
      {!compactMode && (
        <div className="px-4 mb-6">
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">
                  Peak Wedding Season
                </span>
              </div>
              <p className="text-sm text-purple-700">
                Cache warming recommended. 60% more queries expected this month.
              </p>
              <button className="mt-2 text-sm text-purple-600 underline">
                View seasonal optimization →
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Cache Activity */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Recent Activity</h3>
          <button className="text-sm text-blue-600 flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Settings
          </button>
        </div>
        <div className="space-y-2">
          {recentActivity
            .slice(0, compactMode ? 2 : 5)
            .map((activity, index) => (
              <MobileCacheActivityRow key={index} activity={activity} />
            ))}
        </div>

        {!compactMode && (
          <button className="w-full mt-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">
            View All Activity
          </button>
        )}
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-6" />
    </div>
  );
}
