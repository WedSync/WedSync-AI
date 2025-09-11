/**
 * WS-140 Trial Management System - Trial Banner Component
 * Header banner with countdown timer and upgrade call-to-action
 * Follows Untitled UI design patterns with wedding-focused UX
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/untitled-ui/button';
import { Badge } from '@/components/untitled-ui/badge';
import {
  Crown,
  Sparkles,
  X,
  Clock,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Gift,
} from 'lucide-react';
import { TrialStatusResponse } from '@/types/trial';

interface TrialBannerProps {
  className?: string;
  position?: 'top' | 'bottom';
  dismissible?: boolean;
  onUpgradeClick?: () => void;
  onDismiss?: () => void;
  showDetailedInfo?: boolean;
  variant?: 'minimal' | 'standard' | 'urgent';
}

export function TrialBanner({
  className = '',
  position = 'top',
  dismissible = true,
  onUpgradeClick,
  onDismiss,
  showDetailedInfo = false,
  variant = 'standard',
}: TrialBannerProps) {
  const [trialData, setTrialData] = useState<TrialStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  useEffect(() => {
    if (trialData?.success) {
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [trialData]);

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch('/api/trial/status');
      const data = await response.json();

      if (response.ok) {
        setTrialData(data);
      }
    } catch (err) {
      // Fail silently for banner - banner shouldn't break the page
    } finally {
      setLoading(false);
    }
  };

  const updateCountdown = () => {
    if (!trialData?.trial) return;

    const now = new Date().getTime();
    const endTime = new Date(trialData.trial.trial_end).getTime();
    const difference = endTime - now;

    if (difference > 0) {
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        ),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    } else {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('trialBannerDismissed', 'true');
  };

  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('trialBannerDismissed');
    if (dismissed === 'true' && dismissible) {
      setIsDismissed(true);
    }
  }, [dismissible]);

  // Don't render if loading, dismissed, no trial data, or trial expired
  if (
    loading ||
    isDismissed ||
    !trialData?.success ||
    trialData.progress.days_remaining <= 0
  ) {
    return null;
  }

  const { progress } = trialData;
  const isUrgent = progress.urgency_score >= 4;
  const urgencyLevel =
    progress.urgency_score >= 4
      ? 'high'
      : progress.urgency_score >= 3
        ? 'medium'
        : 'low';

  // Auto-determine variant based on urgency if not explicitly set
  const effectiveVariant =
    variant === 'standard' && isUrgent ? 'urgent' : variant;

  const positionClasses =
    position === 'top' ? 'top-0 border-b' : 'bottom-0 border-t';

  const variantStyles = {
    minimal: 'bg-primary-50 border-primary-200',
    standard:
      'bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200',
    urgent: 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200',
  };

  const textColors = {
    minimal: 'text-primary-900',
    standard: 'text-primary-900',
    urgent: 'text-red-900',
  };

  if (effectiveVariant === 'minimal') {
    return (
      <div
        className={`
        fixed left-0 right-0 z-40 ${positionClasses} ${variantStyles[effectiveVariant]} 
        ${className}
      `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-900">
                  Professional Trial
                </span>
                <Badge variant={isUrgent ? 'error' : 'success'} size="sm">
                  {progress.days_remaining} days left
                </Badge>
              </div>
              <div className="hidden sm:flex items-center space-x-1 text-xs text-primary-700">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {Math.round(progress.roi_metrics.roi_percentage)}% ROI
                  achieved
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button size="sm" variant="primary" onClick={onUpgradeClick}>
                Upgrade
              </Button>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-primary-600 hover:text-primary-800 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveVariant === 'urgent') {
    return (
      <div
        className={`
        fixed left-0 right-0 z-40 ${positionClasses} ${variantStyles[effectiveVariant]}
        ${className}
      `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-red-900">
                      Trial Ending Soon!
                    </h3>
                    <Badge variant="error">
                      {progress.days_remaining} days left
                    </Badge>
                  </div>
                  <p className="text-sm text-red-700">
                    Don't lose your progress. Upgrade now to continue with all
                    your data and settings.
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        $
                        {Math.round(
                          progress.roi_metrics.projected_monthly_savings,
                        )}
                        /month savings
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {Math.round(progress.roi_metrics.roi_percentage)}% ROI
                        achieved
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center space-x-6">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white bg-opacity-50 rounded-lg">
                    <div className="text-lg font-bold text-red-900">
                      {timeLeft.days}
                    </div>
                    <div className="text-xs text-red-700">days</div>
                  </div>
                  <div className="p-2 bg-white bg-opacity-50 rounded-lg">
                    <div className="text-lg font-bold text-red-900">
                      {timeLeft.hours}
                    </div>
                    <div className="text-xs text-red-700">hours</div>
                  </div>
                  <div className="p-2 bg-white bg-opacity-50 rounded-lg">
                    <div className="text-lg font-bold text-red-900">
                      {timeLeft.minutes}
                    </div>
                    <div className="text-xs text-red-700">min</div>
                  </div>
                  <div className="p-2 bg-white bg-opacity-50 rounded-lg">
                    <div className="text-lg font-bold text-red-900">
                      {timeLeft.seconds}
                    </div>
                    <div className="text-xs text-red-700">sec</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={onUpgradeClick}
                    className="font-semibold animate-pulse"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                  {dismissible && (
                    <button
                      onClick={handleDismiss}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div
      className={`
      fixed left-0 right-0 z-40 ${positionClasses} ${variantStyles[effectiveVariant]}
      ${className}
    `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Crown className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-primary-900">
                    Professional Trial
                  </h3>
                  <Badge variant={isUrgent ? 'warning' : 'success'}>
                    {progress.days_remaining} days remaining
                  </Badge>
                </div>
                <p className="text-sm text-primary-700">
                  You're doing great! {Math.round(progress.progress_percentage)}
                  % through your trial with amazing results.
                </p>
                {showDetailedInfo && (
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        {Math.round(
                          progress.roi_metrics.total_time_saved_hours,
                        )}
                        h saved
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        {progress.milestones_achieved.length}/
                        {progress.milestones_achieved.length +
                          progress.milestones_remaining.length}{' '}
                        milestones
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Gift className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-purple-700">
                        Special upgrade discount available
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Mini Countdown for Standard */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-60 rounded-lg">
                <Clock className="h-4 w-4 text-primary-600" />
                <div className="flex items-center space-x-1 text-sm font-medium text-primary-900">
                  <span>{timeLeft.days}d</span>
                  <span>{timeLeft.hours}h</span>
                  <span>{timeLeft.minutes}m</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={onUpgradeClick}
                  className="font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade & Save
                </Button>
                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className="text-primary-600 hover:text-primary-800 p-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
