'use client';

import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Camera,
  Users,
  Calendar,
  Zap,
  Crown,
  Star,
  ArrowUp,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RateLimitData {
  current: number;
  limit: number;
  resetTime: number;
  tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  endpoint: string;
  weddingContext: string;
}

interface RateLimitIndicatorProps {
  limits: RateLimitData[];
  className?: string;
  onUpgrade?: () => void;
  isOnline?: boolean;
}

const TIER_CONFIG = {
  free: {
    name: 'Free Plan',
    icon: Camera,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    accent: 'text-gray-600',
    gradient: 'from-gray-50 to-gray-100',
  },
  starter: {
    name: 'Starter',
    icon: Users,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    accent: 'text-blue-600',
    gradient: 'from-blue-50 to-blue-100',
  },
  professional: {
    name: 'Professional',
    icon: Star,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    accent: 'text-purple-600',
    gradient: 'from-purple-50 to-purple-100',
  },
  scale: {
    name: 'Scale',
    icon: Zap,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    accent: 'text-orange-600',
    gradient: 'from-orange-50 to-orange-100',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Crown,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accent: 'text-emerald-600',
    gradient: 'from-emerald-50 to-emerald-100',
  },
};

const WEDDING_CONTEXTS = {
  '/api/photos/upload': 'Photo Gallery Updates',
  '/api/clients/import': 'Client Coordination',
  '/api/forms/submit': 'Wedding Questionnaires',
  '/api/timeline/create': 'Wedding Day Timeline',
  '/api/vendors/contact': 'Vendor Communications',
  '/api/ai/chat': 'AI Wedding Assistant',
  '/api/calendar/sync': 'Schedule Management',
  '/api/gallery/share': 'Photo Sharing',
  default: 'Wedding Management',
};

function formatTimeRemaining(resetTime: number): string {
  const now = Date.now();
  const remaining = Math.max(0, resetTime - now);

  if (remaining < 60000) {
    // Less than 1 minute
    return `${Math.ceil(remaining / 1000)}s`;
  } else if (remaining < 3600000) {
    // Less than 1 hour
    return `${Math.ceil(remaining / 60000)}m`;
  } else {
    // Hours
    return `${Math.ceil(remaining / 3600000)}h`;
  }
}

function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

export function RateLimitIndicator({
  limits,
  className,
  onUpgrade,
  isOnline = true,
}: RateLimitIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>(
    {},
  );

  // Update countdown timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: Record<string, string> = {};
      limits.forEach((limit) => {
        newTimeRemaining[limit.endpoint] = formatTimeRemaining(limit.resetTime);
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [limits]);

  // Filter to show only limits that are being approached or exceeded
  const criticalLimits = limits.filter(
    (limit) => limit.current / limit.limit >= 0.5,
  );

  if (criticalLimits.length === 0) return null;

  const primaryLimit = criticalLimits[0];
  const tierConfig = TIER_CONFIG[primaryLimit.tier];
  const TierIcon = tierConfig.icon;

  return (
    <Card
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 p-3 shadow-lg border-2',
        'transform transition-all duration-300 ease-in-out',
        'bg-white/95 backdrop-blur-sm',
        className,
      )}
    >
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="flex items-center justify-between mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Working Offline
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            Venue Mode
          </Badge>
        </div>
      )}

      {/* Main Rate Limit Display */}
      <div className="space-y-3">
        {/* Tier Badge and Status */}
        <div className="flex items-center justify-between">
          <Badge className={cn('text-xs font-medium', tierConfig.color)}>
            <TierIcon className="h-3 w-3 mr-1" />
            {tierConfig.name}
          </Badge>

          {isOnline && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Wifi className="h-3 w-3" />
              <span>Live</span>
            </div>
          )}
        </div>

        {/* Primary Limit Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {WEDDING_CONTEXTS[
                primaryLimit.endpoint as keyof typeof WEDDING_CONTEXTS
              ] || WEDDING_CONTEXTS.default}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                Resets in {timeRemaining[primaryLimit.endpoint] || '0s'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {primaryLimit.current.toLocaleString()} of{' '}
                {primaryLimit.limit.toLocaleString()}
              </span>
              <span className={cn('font-medium', tierConfig.accent)}>
                {Math.round((primaryLimit.current / primaryLimit.limit) * 100)}%
              </span>
            </div>

            <Progress
              value={(primaryLimit.current / primaryLimit.limit) * 100}
              className="h-2"
              indicatorClassName={getUsageColor(
                (primaryLimit.current / primaryLimit.limit) * 100,
              )}
            />
          </div>
        </div>

        {/* Upgrade Action */}
        {onUpgrade && primaryLimit.tier !== 'enterprise' && (
          <Button
            onClick={onUpgrade}
            size="sm"
            className="w-full h-12 text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            Upgrade for Unlimited Wedding Management
          </Button>
        )}
      </div>
    </Card>
  );
}

export default RateLimitIndicator;
