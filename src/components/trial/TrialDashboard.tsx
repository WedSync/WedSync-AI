/**
 * WS-132 Trial Management System - Main Trial Dashboard
 * Main trial progress overview with milestone tracking and ROI visualization
 * Follows Untitled UI design patterns and wedding industry UX
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import { Progress } from '@/components/untitled-ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Circle,
  AlertCircle,
  Crown,
  Sparkles,
} from 'lucide-react';
import { TrialProgress, TrialStatusResponse } from '@/types/trial';
import { TrialCountdown } from './TrialCountdown';
import { MilestoneProgress } from './MilestoneProgress';
import { ROIDisplay } from './ROIDisplay';
import { UsageMeter } from './UsageMeter';
import { formatCurrency } from '@/lib/utils/currency';

interface TrialDashboardProps {
  className?: string;
}

export function TrialDashboard({ className = '' }: TrialDashboardProps) {
  const [trialData, setTrialData] = useState<TrialStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch('/api/trial/status');
      const data = await response.json();

      if (response.ok) {
        setTrialData(data);
      } else {
        setError(data.message || 'Failed to load trial status');
      }
    } catch (err) {
      setError('Network error loading trial status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">
          Loading your trial progress...
        </span>
      </div>
    );
  }

  if (error || !trialData?.success) {
    return (
      <Card className={`p-6 border-red-200 bg-red-50 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Unable to Load Trial
            </h3>
            <p className="text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const { trial, progress, recommendations } = trialData;
  const urgencyLevel =
    progress.urgency_score >= 4
      ? 'high'
      : progress.urgency_score >= 3
        ? 'medium'
        : 'low';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with trial status and countdown */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Crown className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Professional Trial
            </h1>
          </div>
          <Badge variant={urgencyLevel === 'high' ? 'error' : 'success'}>
            {progress.days_remaining} days remaining
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <TrialCountdown
            daysRemaining={progress.days_remaining}
            urgencyLevel={urgencyLevel}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowUpgradeModal(true)}
            className="font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </div>
      </div>

      {/* Urgency message if trial is ending soon */}
      {recommendations.urgency_message && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-amber-800 font-medium">
              {recommendations.urgency_message}
            </p>
          </div>
        </Card>
      )}

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Progress overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Trial Progress
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round(progress.progress_percentage)}%
              </p>
            </div>
            <div className="p-2 bg-primary-100 rounded-lg">
              <Target className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <Progress value={progress.progress_percentage} className="mt-3" />
          <p className="text-xs text-gray-500 mt-2">
            Day {progress.days_elapsed} of 30
          </p>
        </Card>

        {/* ROI summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ROI Achieved</p>
              <p className="text-2xl font-semibold text-green-600">
                {Math.round(progress.roi_metrics.roi_percentage)}%
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formatCurrency(progress.roi_metrics.estimated_cost_savings)} saved
          </p>
        </Card>

        {/* Milestones */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Milestones</p>
              <p className="text-2xl font-semibold text-gray-900">
                {progress.milestones_achieved.length}/
                {progress.milestones_achieved.length +
                  progress.milestones_remaining.length}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {progress.milestones_remaining.length} remaining
          </p>
        </Card>

        {/* Time saved */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Time Saved</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Math.round(progress.roi_metrics.total_time_saved_hours)}h
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">This trial period</p>
        </Card>
      </div>

      {/* Detailed progress sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestone progress */}
        <MilestoneProgress
          milestones={[
            ...progress.milestones_achieved,
            ...progress.milestones_remaining,
          ]}
          onMilestoneClick={(milestone) => {
            // Handle milestone click - could open instructions modal
            console.log('Milestone clicked:', milestone);
          }}
        />

        {/* ROI breakdown */}
        <ROIDisplay roi={progress.roi_metrics} timePeriod="trial" />
      </div>

      {/* Feature usage section */}
      <UsageMeter
        features={progress.feature_usage_summary}
        totalTimeSaved={progress.roi_metrics.total_time_saved_hours}
      />

      {/* Conversion recommendations */}
      {recommendations.next_actions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Maximize Your Trial Benefits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Recommended Next Steps:
              </h4>
              <ul className="space-y-2">
                {recommendations.next_actions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Circle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                When You Upgrade:
              </h4>
              <ul className="space-y-2">
                {recommendations.upgrade_benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Conversion CTA */}
      <Card className="p-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold text-primary-900 mb-2">
              Ready to unlock your full potential?
            </h3>
            <p className="text-primary-700">
              {progress.conversion_recommendation}
            </p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Save{' '}
                  {formatCurrency(
                    progress.roi_metrics.projected_monthly_savings,
                  )}
                  /month
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {Math.round(
                    progress.roi_metrics.productivity_improvement_percent,
                  )}
                  % more productive
                </span>
              </div>
            </div>
          </div>
          <Button
            size="lg"
            variant="primary"
            onClick={() => setShowUpgradeModal(true)}
            className="font-semibold"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Professional
          </Button>
        </div>
      </Card>

      {/* TODO: Add upgrade modal component */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <Card className="max-w-lg w-full mx-4 p-6">
            <h3 className="text-xl font-semibold mb-4">
              Upgrade to Professional
            </h3>
            <p className="text-gray-600 mb-6">
              Continue your journey with full access to all professional
              features.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  // TODO: Navigate to payment page
                  window.location.href = '/billing/upgrade';
                }}
              >
                Continue
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
