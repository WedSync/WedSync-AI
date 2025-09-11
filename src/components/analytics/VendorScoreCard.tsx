'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Users,
  Star,
  Heart,
  DollarSign,
  Calendar,
  BarChart3,
  Zap,
  Shield,
  Award,
  Target,
} from 'lucide-react';

import type { ScoreCardConfig } from '../../types/analytics';

export interface VendorScoreCardProps {
  config: ScoreCardConfig;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showTrend?: boolean;
  onClick?: () => void;
  className?: string;
}

// Icon mapping
const iconMap = {
  Clock,
  Users,
  Star,
  Heart,
  DollarSign,
  Calendar,
  BarChart3,
  Zap,
  Shield,
  Award,
  Target,
};

// Utility function for class names
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Color scheme mappings
const colorSchemes = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    accent: 'text-green-600',
    icon: 'text-green-500',
    progress: 'bg-green-500',
    trend: 'text-green-600',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    accent: 'text-blue-600',
    icon: 'text-blue-500',
    progress: 'bg-blue-500',
    trend: 'text-blue-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    accent: 'text-yellow-600',
    icon: 'text-yellow-500',
    progress: 'bg-yellow-500',
    trend: 'text-yellow-600',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    accent: 'text-red-600',
    icon: 'text-red-500',
    progress: 'bg-red-500',
    trend: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    accent: 'text-purple-600',
    icon: 'text-purple-500',
    progress: 'bg-purple-500',
    trend: 'text-purple-600',
  },
};

const VendorScoreCard: React.FC<VendorScoreCardProps> = ({
  config,
  size = 'md',
  interactive = false,
  showTrend = true,
  onClick,
  className,
}) => {
  const { title, value, maxValue, format, trend, color, icon } = config;

  // Get color scheme
  const colorScheme = colorSchemes[color] || colorSchemes.blue;

  // Get icon component
  const IconComponent =
    icon && iconMap[icon as keyof typeof iconMap]
      ? iconMap[icon as keyof typeof iconMap]
      : BarChart3;

  // Format value based on type
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'percentage':
        return `${Math.round(value)}%`;
      case 'decimal':
        return value.toFixed(1);
      case 'currency':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'time':
        if (value < 60) {
          return `${Math.round(value)}min`;
        } else if (value < 1440) {
          return `${Math.round(value / 60)}h ${Math.round(value % 60)}min`;
        } else {
          return `${Math.round(value / 1440)}d`;
        }
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }, [value, format]);

  // Calculate progress percentage for progress bars
  const progressPercentage = maxValue
    ? Math.min((value / maxValue) * 100, 100)
    : 0;

  // Determine trend icon and styling
  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : Minus;

  // Size classes
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: {
      value: 'text-2xl',
      title: 'text-sm',
      trend: 'text-xs',
    },
    md: {
      value: 'text-3xl',
      title: 'text-base',
      trend: 'text-sm',
    },
    lg: {
      value: 'text-4xl',
      title: 'text-lg',
      trend: 'text-base',
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-white rounded-lg border-2 transition-all duration-200',
        colorScheme.border,
        interactive && 'cursor-pointer hover:shadow-lg hover:scale-105',
        sizeClasses[size],
        className,
      )}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-2 rounded-lg', colorScheme.bg)}>
          <IconComponent
            className={cn(iconSizeClasses[size], colorScheme.icon)}
          />
        </div>

        {showTrend && trend && (
          <div
            className={cn(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              trend.direction === 'up'
                ? 'bg-green-100 text-green-700'
                : trend.direction === 'down'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700',
            )}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{trend.value}</span>
            {trend.period && (
              <span className="text-gray-500">{trend.period}</span>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-medium mb-2',
          textSizeClasses[size].title,
          colorScheme.accent,
        )}
      >
        {title}
      </h3>

      {/* Main Value */}
      <div
        className={cn(
          'font-bold mb-4',
          textSizeClasses[size].value,
          colorScheme.text,
        )}
      >
        {formattedValue}
      </div>

      {/* Progress Bar (if maxValue is provided) */}
      {maxValue && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={cn('text-xs', colorScheme.accent)}>Progress</span>
            <span className={cn('text-xs font-medium', colorScheme.text)}>
              {Math.round(progressPercentage)}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', colorScheme.progress)}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>{maxValue}</span>
          </div>
        </div>
      )}

      {/* Additional Context (Wedding Industry Specific) */}
      {format === 'time' && (
        <div className={cn('text-xs mt-2', colorScheme.accent)}>
          {value < 60
            ? '⚡ Fast Response'
            : value < 180
              ? '✅ Good Response'
              : value < 360
                ? '⚠️ Slow Response'
                : '🚨 Very Slow'}
        </div>
      )}

      {format === 'percentage' && (
        <div className={cn('text-xs mt-2', colorScheme.accent)}>
          {value > 80
            ? '🎯 Excellent'
            : value > 60
              ? '👍 Good'
              : value > 40
                ? '⚠️ Needs Work'
                : '🚨 Critical'}
        </div>
      )}

      {format === 'decimal' && title.toLowerCase().includes('satisfaction') && (
        <div className="flex items-center mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'w-4 h-4',
                star <= Math.floor(value)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300',
              )}
            />
          ))}
          <span className={cn('ml-2 text-xs', colorScheme.accent)}>
            ({value.toFixed(1)}/5.0)
          </span>
        </div>
      )}

      {/* Hover Effect for Interactive Cards */}
      {interactive && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-lg opacity-0 pointer-events-none',
            colorScheme.bg,
          )}
          whileHover={{ opacity: 0.1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
};

export default VendorScoreCard;
