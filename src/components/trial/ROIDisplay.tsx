/**
 * WS-132 Trial Management - ROI Display Component
 * Visual display of return on investment metrics with time/cost savings
 */

'use client';

import React from 'react';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  BarChart3,
  Calculator,
  Target,
} from 'lucide-react';
import { TrialROIMetrics } from '@/types/trial';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface ROIDisplayProps {
  roi: TrialROIMetrics;
  timePeriod: 'trial' | 'monthly' | 'yearly';
  className?: string;
  showProjections?: boolean;
}

export function ROIDisplay({
  roi,
  timePeriod = 'trial',
  className = '',
  showProjections = true,
}: ROIDisplayProps) {
  const getROIStatus = (percentage: number) => {
    if (percentage >= 200)
      return { level: 'excellent', color: 'success', label: 'Excellent ROI' };
    if (percentage >= 100)
      return { level: 'good', color: 'success', label: 'Strong ROI' };
    if (percentage >= 50)
      return { level: 'moderate', color: 'warning', label: 'Good Progress' };
    return { level: 'building', color: 'default', label: 'Building Value' };
  };

  const roiStatus = getROIStatus(roi.roi_percentage);

  const metrics = [
    {
      label: 'Time Saved',
      value: `${Math.round(roi.total_time_saved_hours)}h`,
      subValue: `${Math.round(roi.total_time_saved_hours * 60)} minutes total`,
      icon: Clock,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Cost Savings',
      value: formatCurrency(roi.estimated_cost_savings),
      subValue: 'Based on time value',
      icon: DollarSign,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Productivity Gain',
      value: `${Math.round(roi.productivity_improvement_percent)}%`,
      subValue: 'Workflow efficiency',
      icon: Zap,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      label: 'Features Adopted',
      value: roi.features_adopted_count.toString(),
      subValue: 'Active features used',
      icon: Target,
      color: 'text-amber-600 bg-amber-100',
    },
  ];

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            <span>ROI Analysis</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Your return on investment during the trial
          </p>
        </div>
        <Badge variant={roiStatus.color as any}>{roiStatus.label}</Badge>
      </div>

      {/* Main ROI metric */}
      <div className="text-center mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <TrendingUp
            className={cn(
              'h-6 w-6',
              roi.roi_percentage >= 100 ? 'text-green-600' : 'text-primary-600',
            )}
          />
          <span className="text-2xl font-bold text-gray-900">
            {Math.round(roi.roi_percentage)}%
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Return on Investment{' '}
          {timePeriod === 'trial' ? 'this trial' : `per ${timePeriod}`}
        </p>
        {roi.roi_percentage >= 100 && (
          <p className="text-xs text-green-600 font-medium mt-1">
            🎉 You're already seeing positive ROI!
          </p>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className={cn('p-2 rounded-lg', metric.color)}>
              <metric.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {metric.value}
              </p>
              <p className="text-xs text-gray-500">{metric.subValue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projections */}
      {showProjections && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-gray-600" />
            <span>Monthly Projections</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Projected monthly savings */}
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-800">
                {formatCurrency(roi.projected_monthly_savings)}
              </div>
              <div className="text-xs text-green-600 mt-1">Monthly Savings</div>
            </div>

            {/* Workflow efficiency */}
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-800">
                {Math.round(roi.workflow_efficiency_gain)}%
              </div>
              <div className="text-xs text-blue-600 mt-1">Efficiency Gain</div>
            </div>

            {/* Time savings per week */}
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-800">
                {Math.round(roi.total_time_saved_hours * 4)}h
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Weekly Time Saved
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROI breakdown explanation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          How we calculate ROI:
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • <strong>Time saved:</strong> Based on feature usage and automation
          </li>
          <li>
            • <strong>Cost savings:</strong> Time saved × your hourly rate
          </li>
          <li>
            • <strong>Productivity:</strong> Milestones achieved + features
            adopted
          </li>
          <li>
            • <strong>ROI:</strong> (Savings - Subscription Cost) / Subscription
            Cost
          </li>
        </ul>
      </div>

      {/* Value realization tips */}
      {roi.roi_percentage < 100 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-medium text-amber-800 mb-1">
            💡 Maximize Your ROI
          </h4>
          <p className="text-xs text-amber-700">
            {roi.features_adopted_count < 3
              ? 'Try using more features to increase your time savings'
              : roi.milestones_achieved_count < 3
                ? 'Complete more milestones to unlock greater value'
                : 'Keep using the platform consistently to see compound benefits'}
          </p>
        </div>
      )}

      {/* Success celebration */}
      {roi.roi_percentage >= 200 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-1">
            🚀 Outstanding Results!
          </h4>
          <p className="text-xs text-green-700">
            You're achieving exceptional ROI. This platform is clearly a great
            fit for your workflow!
          </p>
        </div>
      )}
    </Card>
  );
}
