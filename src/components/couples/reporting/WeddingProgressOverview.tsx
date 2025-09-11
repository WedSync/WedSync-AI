'use client';

import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  CalendarDaysIcon,
  CurrencyPoundIcon,
} from '@heroicons/react/24/outline';
import { CircularProgress } from '../visualization/CircularProgress';
import { ProgressReport } from '@/types/couple-reporting';

interface WeddingProgressOverviewProps {
  progressData: ProgressReport | null;
}

export function WeddingProgressOverview({
  progressData,
}: WeddingProgressOverviewProps) {
  if (!progressData) {
    return (
      <div className="progress-overview-skeleton">
        <div className="animate-pulse bg-gray-200 rounded-2xl h-48"></div>
      </div>
    );
  }

  const {
    overallProgress,
    timelineAdherence,
    budgetUtilization,
    weddingCountdown,
  } = progressData;

  return (
    <div className="wedding-progress-overview">
      <motion.div
        className="overview-header mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your Wedding at a Glance
        </h2>
        <p className="text-gray-600">
          Track your planning progress and stay on top of important milestones
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <motion.div
          className="progress-card bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Overall Progress
            </h3>
            <TrendingUpIcon className="w-6 h-6 text-green-500" />
          </div>

          <div className="flex items-center justify-center mb-4">
            <CircularProgress
              percentage={overallProgress}
              size={120}
              strokeWidth={8}
              color="#10b981"
            >
              <div className="progress-center text-center">
                <span className="text-2xl font-bold text-gray-900">
                  {overallProgress}%
                </span>
                <span className="block text-sm text-gray-500">Complete</span>
              </div>
            </CircularProgress>
          </div>

          <div className="progress-status">
            {overallProgress >= 80 && (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">On track!</span>
              </div>
            )}
            {overallProgress >= 60 && overallProgress < 80 && (
              <div className="flex items-center text-yellow-600">
                <ClockIcon className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Making progress</span>
              </div>
            )}
            {overallProgress < 60 && (
              <div className="flex items-center text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Needs attention</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Timeline Status */}
        <motion.div
          className="timeline-card bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
            <CalendarDaysIcon className="w-6 h-6 text-blue-500" />
          </div>

          <div className="space-y-3">
            <div className="metric">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Days Remaining</span>
                <span className="text-2xl font-bold text-blue-600">
                  {weddingCountdown.daysRemaining}
                </span>
              </div>
            </div>

            <div className="metric">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">On Track</span>
                <span className="text-lg font-semibold text-green-600">
                  {timelineAdherence.onTrackMilestones}
                </span>
              </div>
            </div>

            <div className="metric">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Buffer Days</span>
                <span className="text-lg font-semibold text-purple-600">
                  {timelineAdherence.bufferDays}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <TimelineHealthIndicator
              risk={timelineAdherence.criticalPathRisk}
            />
          </div>
        </motion.div>

        {/* Budget Status */}
        <motion.div
          className="budget-card bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Budget</h3>
            <CurrencyPoundIcon className="w-6 h-6 text-green-500" />
          </div>

          <div className="space-y-3">
            <div className="metric">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Budget</span>
                <span className="text-lg font-semibold text-gray-900">
                  £{budgetUtilization.totalBudget.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="metric">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Spent</span>
                <span className="text-lg font-semibold text-red-600">
                  £{budgetUtilization.spentAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="metric">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className="text-lg font-semibold text-green-600">
                  £{budgetUtilization.remainingAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="budget-progress-bar">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${budgetUtilization.utilizationRate * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0%</span>
                <span>
                  {(budgetUtilization.utilizationRate * 100).toFixed(0)}% used
                </span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <BudgetHealthIndicator health={budgetUtilization.budgetHealth} />
          </div>
        </motion.div>

        {/* This Week */}
        <motion.div
          className="thisweek-card bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {weddingCountdown.milestonesThisWeek}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="metric">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {weddingCountdown.milestonesThisWeek}
                </div>
                <div className="text-sm text-gray-600">Milestones Due</div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Venue final walkthrough</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Final headcount to caterer</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Wedding favors ordered</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface TimelineHealthIndicatorProps {
  risk: 'low' | 'medium' | 'high';
}

function TimelineHealthIndicator({ risk }: TimelineHealthIndicatorProps) {
  const riskConfig = {
    low: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      text: 'On Schedule',
    },
    medium: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      icon: <ClockIcon className="w-4 h-4" />,
      text: 'Watch Closely',
    },
    high: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      text: 'Needs Action',
    },
  };

  const config = riskConfig[risk];

  return (
    <div
      className={`flex items-center ${config.color} ${config.bg} rounded-lg px-3 py-2`}
    >
      {config.icon}
      <span className="ml-2 text-sm font-medium">{config.text}</span>
    </div>
  );
}

interface BudgetHealthIndicatorProps {
  health: 'healthy' | 'warning' | 'over_budget';
}

function BudgetHealthIndicator({ health }: BudgetHealthIndicatorProps) {
  const healthConfig = {
    healthy: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: <CheckCircleIcon className="w-4 h-4" />,
      text: 'On Budget',
    },
    warning: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      text: 'Watch Spend',
    },
    over_budget: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      text: 'Over Budget',
    },
  };

  const config = healthConfig[health];

  return (
    <div
      className={`flex items-center ${config.color} ${config.bg} rounded-lg px-3 py-2`}
    >
      {config.icon}
      <span className="ml-2 text-sm font-medium">{config.text}</span>
    </div>
  );
}
