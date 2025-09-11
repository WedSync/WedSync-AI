/**
 * WS-167 Trial Management System - Enhanced Trial Status Widget
 * Round 2: Enhanced with smooth countdown animations and advanced interactions
 * Compact dashboard widget showing trial countdown, activity tracking, and key metrics
 * Follows Untitled UI design patterns with wedding-focused UX and enhanced security
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import { Progress } from '@/components/untitled-ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Crown,
  Sparkles,
  Target,
  Activity,
  Zap,
  Info,
  CheckCircle,
} from 'lucide-react';
import { TrialStatusResponse } from '@/types/trial';
import { sanitizeHTML } from '@/lib/security/input-validation';
import * as animations from '@/components/trial/animations/trial-animations';

interface TrialStatusWidgetProps {
  className?: string;
  onUpgradeClick?: () => void;
  showUpgradeButton?: boolean;
  compact?: boolean;
  refreshInterval?: number; // Auto-refresh interval in milliseconds
  showActivityScore?: boolean; // Show activity score tracking
  onActivityUpdate?: (score: number) => void; // Callback for activity updates
}

export function TrialStatusWidget({
  className = '',
  onUpgradeClick,
  showUpgradeButton = true,
  compact = false,
  refreshInterval = 30000, // 30 seconds default
  showActivityScore = true,
  onActivityUpdate,
}: TrialStatusWidgetProps) {
  const [trialData, setTrialData] = useState<TrialStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityScore, setActivityScore] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Enhanced fetch with security validation and activity tracking
  const fetchTrialStatus = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/trial/status');
      const data = await response.json();

      if (response.ok && data.success) {
        // Security: Validate and sanitize data
        const safeData = {
          ...data,
          trial: {
            ...data.trial,
            business_type: sanitizeHTML(data.trial?.business_type || ''),
          },
          progress: {
            ...data.progress,
            days_remaining: Math.max(
              0,
              Math.floor(data.progress?.days_remaining || 0),
            ),
            progress_percentage: Math.min(
              100,
              Math.max(0, data.progress?.progress_percentage || 0),
            ),
            roi_metrics: {
              ...data.progress?.roi_metrics,
              roi_percentage: Math.min(
                1000,
                Math.max(0, data.progress?.roi_metrics?.roi_percentage || 0),
              ),
              total_time_saved_hours: Math.max(
                0,
                data.progress?.roi_metrics?.total_time_saved_hours || 0,
              ),
            },
          },
        };

        setTrialData(safeData);

        // Calculate and update activity score
        const newActivityScore = calculateActivityScore(safeData.progress);
        setActivityScore(newActivityScore);
        onActivityUpdate?.(newActivityScore);

        setError(null);
      } else {
        setError(data.message || 'Failed to load trial status');
      }
    } catch (err) {
      setError('Network error loading trial status');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [onActivityUpdate]);

  // Calculate activity score based on milestones and feature usage
  const calculateActivityScore = useCallback((progress: any): number => {
    if (!progress) return 0;

    const milestonesWeight = 0.6;
    const roiWeight = 0.4;

    const milestonesScore = progress.progress_percentage || 0;
    const roiScore = Math.min(
      100,
      (progress.roi_metrics?.roi_percentage || 0) * 10,
    );

    return Math.round(
      milestonesScore * milestonesWeight + roiScore * roiWeight,
    );
  }, []);

  // Enhanced countdown timer with live updates
  useEffect(() => {
    if (!trialData?.progress?.days_remaining) return;

    const updateCountdown = () => {
      const days = trialData.progress.days_remaining;
      const hours = Math.floor((days * 24) % 24);

      if (days >= 1) {
        setTimeRemaining(`${Math.floor(days)}d ${hours}h remaining`);
      } else {
        setTimeRemaining('Less than 1 day remaining');
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [trialData]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchTrialStatus();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchTrialStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTrialStatus, refreshInterval]);

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      </Card>
    );
  }

  if (error || !trialData?.success) {
    return (
      <Card className={`p-4 border-red-200 bg-red-50 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Trial Status Error
            </p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  const { trial, progress } = trialData;
  const urgencyLevel =
    progress.urgency_score >= 4
      ? 'high'
      : progress.urgency_score >= 3
        ? 'medium'
        : 'low';
  const urgencyColor =
    urgencyLevel === 'high'
      ? 'error'
      : urgencyLevel === 'medium'
        ? 'warning'
        : 'success';
  const daysLeft = progress.days_remaining;
  const progressPercent = progress.progress_percentage;

  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Crown className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-gray-900">
                  Professional Trial
                </p>
                <Badge variant={urgencyColor} size="sm">
                  {timeRemaining || `${daysLeft}d left`}
                </Badge>
                {isRefreshing && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {Math.round(progressPercent)}% complete
                  </span>
                </div>
                {showActivityScore && (
                  <div className="flex items-center space-x-1">
                    <Activity className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600">
                      {activityScore}% activity
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">
                    {Math.round(progress.roi_metrics.roi_percentage)}% ROI
                  </span>
                </div>
              </div>
            </div>
          </div>
          {showUpgradeButton && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                variant="primary"
                onClick={onUpgradeClick}
                className="font-medium"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </motion.div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={animations.fadeIn}
    >
      <Card className={`p-6 ${className} overflow-hidden relative`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg relative">
              <Crown className="h-5 w-5 text-primary-600" />
              {isRefreshing && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Professional Trial
              </h3>
              <p className="text-sm text-gray-600">
                Day {progress.days_elapsed} of 30 •{' '}
                {timeRemaining || `${daysLeft} days left`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {showActivityScore && (
              <Badge variant="primary">
                <Activity className="h-3 w-3 mr-1" />
                {activityScore}% active
              </Badge>
            )}
            <Badge variant={urgencyColor}>{daysLeft} days remaining</Badge>
          </div>
        </div>

        {/* Urgency Alert */}
        {urgencyLevel === 'high' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-red-800">
                Trial ending soon! Upgrade to continue your progress.
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Progress Bar with Animation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Trial Progress
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {Math.round(progressPercent)}%
              </span>
              {activityScore > 75 && (
                <Zap
                  className="h-4 w-4 text-yellow-500 animate-pulse"
                  title="High Activity!"
                />
              )}
            </div>
          </div>
          <Progress
            value={progressPercent}
            className="h-3 transition-all duration-500 ease-out"
          />
          {activityScore > 0 && (
            <div className="mt-1 text-xs text-right text-blue-600 animate-fade-in">
              Activity Score: {activityScore}%
            </div>
          )}
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg transition-all duration-200 hover:bg-gray-100">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                Milestones
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {progress.milestones_achieved.length}/
              {progress.milestones_achieved.length +
                progress.milestones_remaining.length}
            </p>
            <p className="text-xs text-gray-500">completed</p>
          </div>

          {showActivityScore && (
            <div className="text-center p-3 bg-blue-50 rounded-lg transition-all duration-200 hover:bg-blue-100">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  Activity
                </span>
              </div>
              <p className="text-lg font-semibold text-blue-600">
                {activityScore}%
              </p>
              <p className="text-xs text-blue-500">engagement</p>
            </div>
          )}

          <div className="text-center p-3 bg-green-50 rounded-lg transition-all duration-200 hover:bg-green-100">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">ROI</span>
            </div>
            <p className="text-lg font-semibold text-green-600">
              {Math.round(progress.roi_metrics.roi_percentage)}%
            </p>
            <p className="text-xs text-green-500">return</p>
          </div>
        </div>

        {/* Time Saved */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Time Saved
              </span>
            </div>
            <span className="text-lg font-semibold text-green-900">
              {Math.round(progress.roi_metrics.total_time_saved_hours)}h
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            During your trial period
          </p>
        </div>

        {/* CTA Section */}
        {showUpgradeButton && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Ready to unlock full potential?
                </p>
                <p className="text-xs text-gray-600">
                  Continue your progress with all professional features
                </p>
              </div>
              <Button
                variant="primary"
                onClick={onUpgradeClick}
                className="font-medium w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
