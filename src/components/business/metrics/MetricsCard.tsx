'use client';

// WS-195: Metrics Card Component
// Reusable metric display card with wedding industry context and accessibility features

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricsCardProps, MetricStatus } from '@/types/business-metrics';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Percent,
  Hash,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Metrics Card Component
 * Displays individual business metrics with trend indicators and wedding context
 * Features:
 * - Multiple format support (currency, percentage, number)
 * - Trend visualization with directional indicators
 * - Status-based color coding for quick health assessment
 * - Wedding industry context tooltips
 * - Accessibility compliance with ARIA labels
 * - Responsive sizing for different dashboard layouts
 */
export function MetricsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  format = 'number',
  description,
  weddingContext,
  size = 'medium',
  status = 'healthy',
}: MetricsCardProps) {
  // Format value based on type
  const formatValue = (val: number | string, formatType: string): string => {
    if (typeof val === 'string') return val;

    switch (formatType) {
      case 'currency':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: val >= 1000 ? 0 : 2,
        }).format(val);

      case 'percentage':
        return `${val.toFixed(1)}%`;

      case 'number':
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();

      default:
        return val.toString();
    }
  };

  // Get format icon
  const getFormatIcon = (formatType: string) => {
    switch (formatType) {
      case 'currency':
        return <DollarSign className="w-3 h-3" />;
      case 'percentage':
        return <Percent className="w-3 h-3" />;
      case 'number':
        return <Hash className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Get trend icon and color
  const getTrendDisplay = (changeValue?: number, type?: string) => {
    if (changeValue === undefined || changeValue === 0) {
      return {
        icon: <Minus className="w-3 h-3" />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        text: 'No change',
      };
    }

    const isPositive =
      type === 'positive' || (type === 'neutral' && changeValue > 0);
    const isNegative =
      type === 'negative' || (type === 'neutral' && changeValue < 0);

    if (isPositive) {
      return {
        icon: <TrendingUp className="w-3 h-3" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        text: `+${Math.abs(changeValue).toFixed(1)}%`,
      };
    } else if (isNegative) {
      return {
        icon: <TrendingDown className="w-3 h-3" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        text: `-${Math.abs(changeValue).toFixed(1)}%`,
      };
    }

    return {
      icon: <Minus className="w-3 h-3" />,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      text: `${changeValue.toFixed(1)}%`,
    };
  };

  // Get status colors
  const getStatusColors = (statusType: MetricStatus) => {
    switch (statusType) {
      case 'excellent':
        return {
          border: 'border-green-200',
          bg: 'bg-green-50',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
        };
      case 'healthy':
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-800',
        };
      case 'concerning':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      case 'critical':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
        };
      default:
        return {
          border: 'border-gray-200',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
        };
    }
  };

  // Get size classes
  const getSizeClasses = (sizeType: string) => {
    switch (sizeType) {
      case 'small':
        return {
          card: 'p-3',
          title: 'text-xs',
          value: 'text-lg',
          change: 'text-xs',
        };
      case 'large':
        return {
          card: 'p-6',
          title: 'text-sm',
          value: 'text-3xl',
          change: 'text-sm',
        };
      default: // medium
        return {
          card: 'p-4',
          title: 'text-sm',
          value: 'text-2xl',
          change: 'text-xs',
        };
    }
  };

  const trendDisplay = getTrendDisplay(change, changeType);
  const statusColors = getStatusColors(status);
  const sizeClasses = getSizeClasses(size);
  const formatIcon = getFormatIcon(format);

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        statusColors.border,
      )}
      role="article"
      aria-labelledby={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <CardContent className={sizeClasses.card}>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {formatIcon}
              <h3
                id={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
                className={cn('font-medium text-gray-600', sizeClasses.title)}
              >
                {title}
              </h3>
            </div>

            {weddingContext && (
              <div
                className="group relative"
                role="tooltip"
                aria-label={weddingContext}
              >
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                <div className="absolute right-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                  {weddingContext}
                </div>
              </div>
            )}
          </div>

          {/* Value */}
          <div className="space-y-1">
            <div
              className={cn('font-bold text-gray-900', sizeClasses.value)}
              aria-label={`Current value: ${formatValue(value, format)}`}
            >
              {formatValue(value, format)}
            </div>

            {/* Change Indicator */}
            {change !== undefined && (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full',
                    trendDisplay.bgColor,
                  )}
                  aria-label={`Change: ${trendDisplay.text}`}
                >
                  <span className={trendDisplay.color}>
                    {trendDisplay.icon}
                  </span>
                  <span
                    className={cn(
                      trendDisplay.color,
                      'font-medium',
                      sizeClasses.change,
                    )}
                  >
                    {trendDisplay.text}
                  </span>
                </div>

                {/* Status Badge */}
                <Badge
                  className={cn('text-xs', statusColors.badge)}
                  aria-label={`Status: ${status}`}
                >
                  {status}
                </Badge>
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p
              className="text-xs text-gray-500 mt-1"
              aria-label={`Description: ${description}`}
            >
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricsCard;
