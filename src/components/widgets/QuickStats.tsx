'use client';

import React from 'react';
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Stat {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  target?: number;
}

interface QuickStatsProps {
  stats: Stat[];
  className?: string;
  compact?: boolean;
}

export function QuickStats({
  stats,
  className,
  compact = false,
}: QuickStatsProps) {
  const getChangeIcon = (changeType?: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-3 h-3" />;
      case 'decrease':
        return <TrendingDown className="w-3 h-3" />;
      case 'neutral':
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getChangeColor = (changeType?: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      case 'neutral':
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (value: number | string): string => {
    if (typeof value === 'string') return value;

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getProgressPercentage = (
    value: number | string,
    target?: number,
  ): number => {
    if (!target || typeof value === 'string') return 0;
    return Math.min((value / target) * 100, 100);
  };

  if (compact) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.id} className="text-center">
                <div
                  className={cn('inline-flex p-2 rounded-lg mb-2', stat.color)}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {formatValue(stat.value)}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{stat.label}</p>
                  {stat.change !== undefined && (
                    <div
                      className={cn(
                        'flex items-center justify-center text-xs mt-1',
                        getChangeColor(stat.changeType),
                      )}
                    >
                      {getChangeIcon(stat.changeType)}
                      <span className="ml-1">
                        {stat.change > 0 ? '+' : ''}
                        {stat.change}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div
                      className={cn(
                        'inline-flex p-2 rounded-lg mr-3',
                        stat.color,
                      )}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {formatValue(stat.value)}
                      </p>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                  </div>

                  {stat.change !== undefined && (
                    <div
                      className={cn(
                        'flex items-center text-sm',
                        getChangeColor(stat.changeType),
                      )}
                    >
                      {getChangeIcon(stat.changeType)}
                      <span className="ml-1">
                        {stat.change > 0 ? '+' : ''}
                        {stat.change}% from last period
                      </span>
                    </div>
                  )}

                  {stat.target && typeof stat.value === 'number' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress to goal</span>
                        <span>
                          {Math.round(
                            getProgressPercentage(stat.value, stat.target),
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${getProgressPercentage(stat.value, stat.target)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Target: {formatValue(stat.target)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Default stats for wedding business
export const defaultWeddingStats: Stat[] = [
  {
    id: 'total-couples',
    label: 'Active Couples',
    value: 42,
    change: 12,
    changeType: 'increase',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-600',
    target: 50,
  },
  {
    id: 'upcoming-weddings',
    label: 'Upcoming Weddings',
    value: 8,
    change: -5,
    changeType: 'decrease',
    icon: <Calendar className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'completed-tasks',
    label: 'Tasks Completed Today',
    value: 23,
    change: 8,
    changeType: 'increase',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'response-rate',
    label: 'Response Rate',
    value: '94%',
    change: 3,
    changeType: 'increase',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-600',
  },
];
