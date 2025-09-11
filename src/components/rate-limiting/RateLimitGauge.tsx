'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GaugeIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ZapIcon,
  ClockIcon,
} from 'lucide-react';
import {
  RateLimitStatus,
  RATE_LIMIT_COLORS,
  isPeakWeddingSeason,
} from '@/types/rate-limiting';

interface RateLimitGaugeProps {
  currentUsage: number;
  maxLimit: number;
  timeWindow: string; // e.g., "per minute", "per hour", "per day"
  status: RateLimitStatus;
  label?: string;
  showTrend?: boolean;
  previousUsage?: number;
  realTimeUpdates?: boolean;
  weddingContext?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  onLimitApproaching?: () => void;
  onLimitExceeded?: () => void;
}

export default function RateLimitGauge({
  currentUsage,
  maxLimit,
  timeWindow,
  status,
  label = 'Rate Limit',
  showTrend = false,
  previousUsage = 0,
  realTimeUpdates = false,
  weddingContext = false,
  className = '',
  size = 'md',
  animated = true,
  onLimitApproaching,
  onLimitExceeded,
}: RateLimitGaugeProps) {
  const [displayUsage, setDisplayUsage] = useState(currentUsage);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate usage percentage
  const usagePercentage =
    maxLimit > 0 ? Math.min((currentUsage / maxLimit) * 100, 100) : 0;
  const remainingRequests = Math.max(0, maxLimit - currentUsage);

  // Animated counter effect
  useEffect(() => {
    if (!animated) {
      setDisplayUsage(currentUsage);
      return;
    }

    setIsAnimating(true);
    const startValue = displayUsage;
    const endValue = currentUsage;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const interpolatedValue = startValue + (endValue - startValue) * easeOut;

      setDisplayUsage(Math.round(interpolatedValue));

      if (progress < 1) {
        requestAnimationFrame(animateValue);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animateValue);
  }, [currentUsage, animated, displayUsage]);

  // Trigger callbacks
  useEffect(() => {
    if (usagePercentage >= 100 && onLimitExceeded) {
      onLimitExceeded();
    } else if (usagePercentage >= 80 && onLimitApproaching) {
      onLimitApproaching();
    }
  }, [usagePercentage, onLimitApproaching, onLimitExceeded]);

  const statusColor = RATE_LIMIT_COLORS[status];
  const isWeddingSeason = isPeakWeddingSeason();

  // Size configurations
  const sizeConfig = {
    sm: {
      gauge: 'w-16 h-16',
      progress: 'h-2',
      text: 'text-sm',
      number: 'text-lg',
      padding: 'p-3',
    },
    md: {
      gauge: 'w-24 h-24',
      progress: 'h-3',
      text: 'text-base',
      number: 'text-2xl',
      padding: 'p-4',
    },
    lg: {
      gauge: 'w-32 h-32',
      progress: 'h-4',
      text: 'text-lg',
      number: 'text-3xl',
      padding: 'p-6',
    },
  };

  const config = sizeConfig[size];

  const getStatusIcon = () => {
    switch (status) {
      case RateLimitStatus.SAFE:
        return <CheckCircleIcon className="w-4 h-4" />;
      case RateLimitStatus.MODERATE:
        return <ActivityIcon className="w-4 h-4" />;
      case RateLimitStatus.HIGH:
        return <AlertTriangleIcon className="w-4 h-4" />;
      case RateLimitStatus.EXCEEDED:
        return <AlertTriangleIcon className="w-4 h-4" />;
    }
  };

  const getTrendIcon = () => {
    if (!showTrend || !previousUsage) return null;

    if (currentUsage > previousUsage) {
      return <TrendingUpIcon className="w-4 h-4 text-orange-500" />;
    } else if (currentUsage < previousUsage) {
      return <TrendingDownIcon className="w-4 h-4 text-green-500" />;
    }
    return null;
  };

  const getStatusMessage = (): string => {
    switch (status) {
      case RateLimitStatus.SAFE:
        return 'Within limits';
      case RateLimitStatus.MODERATE:
        return 'Normal usage';
      case RateLimitStatus.HIGH:
        return 'High usage';
      case RateLimitStatus.EXCEEDED:
        return 'Limit exceeded';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Create SVG gauge for circular display
  const createCircularGauge = () => {
    const radius = size === 'sm' ? 30 : size === 'md' ? 40 : 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset =
      circumference - (usagePercentage / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center">
        <svg
          className={config.gauge}
          viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
        >
          {/* Background circle */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={size === 'sm' ? 4 : size === 'md' ? 6 : 8}
          />
          {/* Progress circle */}
          <circle
            cx={radius + 10}
            cy={radius + 10}
            r={radius}
            fill="none"
            stroke={statusColor}
            strokeWidth={size === 'sm' ? 4 : size === 'md' ? 6 : 8}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${isAnimating ? 'ease-out' : ''}`}
            transform={`rotate(-90 ${radius + 10} ${radius + 10})`}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`font-bold ${config.number}`}
            style={{ color: statusColor }}
          >
            {usagePercentage.toFixed(0)}%
          </div>
          {size !== 'sm' && (
            <div className="text-xs text-gray-500 text-center">
              {formatNumber(displayUsage)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className={config.padding}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GaugeIcon className="w-5 h-5 text-gray-600" />
            <div>
              <CardTitle className={`${config.text} font-semibold`}>
                {label}
              </CardTitle>
              {size !== 'sm' && (
                <CardDescription className="text-xs">
                  {timeWindow}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <Badge
              variant="outline"
              style={{
                borderColor: statusColor,
                color: statusColor,
                backgroundColor: statusColor + '10',
              }}
              className="text-xs"
            >
              {getStatusIcon()}
              <span className="ml-1">{status}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`${config.padding} pt-0`}>
        {/* Circular Gauge */}
        <div className="flex justify-center mb-4">{createCircularGauge()}</div>

        {/* Usage Details */}
        <div className="space-y-3">
          {/* Progress Bar (alternative view) */}
          {size !== 'sm' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Usage</span>
                <span>
                  {formatNumber(displayUsage)} / {formatNumber(maxLimit)}
                </span>
              </div>
              <Progress
                value={usagePercentage}
                className={config.progress}
                style={{
                  backgroundColor: statusColor + '20',
                }}
              />
            </div>
          )}

          {/* Status and Remaining */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-gray-600">
                {getStatusMessage()}
              </span>
            </div>
            {size !== 'sm' && (
              <span className="text-sm font-medium text-gray-900">
                {formatNumber(remainingRequests)} left
              </span>
            )}
          </div>

          {/* Wedding Season Indicator */}
          {weddingContext && isWeddingSeason && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
              <ZapIcon className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-700">
                Peak wedding season
              </span>
            </div>
          )}

          {/* Real-time Indicator */}
          {realTimeUpdates && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live updates</span>
            </div>
          )}

          {/* Trend Information */}
          {showTrend && previousUsage > 0 && size !== 'sm' && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <ClockIcon className="w-3 h-3" />
              <span>
                {currentUsage > previousUsage ? 'Increased' : 'Decreased'} by{' '}
                {Math.abs(currentUsage - previousUsage)} from previous period
              </span>
            </div>
          )}

          {/* Critical Status Warning */}
          {status === RateLimitStatus.EXCEEDED && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-center">
              <AlertTriangleIcon className="w-4 h-4 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-red-700 font-medium">
                Rate limit exceeded
              </p>
              <p className="text-xs text-red-600">
                Requests are being throttled
              </p>
            </div>
          )}

          {/* High Usage Warning */}
          {status === RateLimitStatus.HIGH && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
              <AlertTriangleIcon className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
              <p className="text-xs text-yellow-700 font-medium">
                Approaching limit
              </p>
              <p className="text-xs text-yellow-600">
                Consider upgrading your plan
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
