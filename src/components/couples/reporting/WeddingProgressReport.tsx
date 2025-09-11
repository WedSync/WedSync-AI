'use client';

import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  TrendingUpIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import {
  CircularProgress,
  ProgressRing,
} from '../visualization/CircularProgress';
import {
  ProgressReport,
  MilestoneStatus,
  VendorCoordinationStatus,
  UpcomingTask,
  RiskFactor,
} from '@/types/couple-reporting';

interface WeddingProgressReportProps {
  progressData: ProgressReport | null;
  onGenerateReport: () => void;
  isPending: boolean;
}

export function WeddingProgressReport({
  progressData,
  onGenerateReport,
  isPending,
}: WeddingProgressReportProps) {
  if (!progressData) {
    return <ProgressReportSkeleton />;
  }

  const progressPercentage = progressData.overallProgress || 0;

  return (
    <div className="wedding-progress-report space-y-8">
      {/* Header */}
      <motion.div
        className="report-header text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Wedding Progress Report
        </h2>
        <p className="text-gray-600">
          Track your planning journey and celebrate your achievements
        </p>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        className="overall-progress bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-center mb-6">
          <CircularProgress
            percentage={progressPercentage}
            size={200}
            strokeWidth={12}
            color="#3b82f6"
          >
            <div className="progress-center text-center">
              <span className="text-4xl font-bold text-blue-600">
                {progressPercentage}%
              </span>
              <span className="block text-lg text-gray-600 font-medium">
                Complete
              </span>
            </div>
          </CircularProgress>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            You're doing amazing! 🎉
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {progressPercentage >= 80 &&
              "You're in the final stretch! Almost everything is ready for your big day."}
            {progressPercentage >= 60 &&
              progressPercentage < 80 &&
              "Great progress! You're well on your way to having everything perfectly planned."}
            {progressPercentage >= 40 &&
              progressPercentage < 60 &&
              "You're making solid progress! Keep up the momentum."}
            {progressPercentage < 40 &&
              "You're just getting started, and that's perfectly fine! Take it one step at a time."}
          </p>
        </div>
      </motion.div>

      {/* Milestone Timeline */}
      <motion.div
        className="milestone-timeline"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            Planning Milestones
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <ChartBarIcon className="w-4 h-4 mr-1" />
            <span>
              {progressData.milestoneStatus?.length || 0} total milestones
            </span>
          </div>
        </div>

        <div className="timeline relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200"></div>

          <div className="space-y-6">
            {progressData.milestoneStatus
              ?.slice(0, 8)
              .map((milestone, index) => (
                <MilestoneCard
                  key={milestone.milestoneId}
                  milestone={milestone}
                  index={index}
                />
              ))}
          </div>
        </div>
      </motion.div>

      {/* Vendor Coordination */}
      <motion.div
        className="vendor-coordination"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            Vendor Coordination Status
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <UserGroupIcon className="w-4 h-4 mr-1" />
            <span>{progressData.vendorCoordination?.length || 0} vendors</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {progressData.vendorCoordination?.map((vendor) => (
            <VendorStatusCard key={vendor.vendorId} vendor={vendor} />
          ))}
        </div>
      </motion.div>

      {/* Upcoming Tasks */}
      <motion.div
        className="upcoming-tasks"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Upcoming Tasks
        </h3>
        <div className="space-y-4">
          {progressData.upcomingTasks?.slice(0, 5).map((task) => (
            <TaskCard key={task.taskId} task={task} />
          ))}
        </div>
      </motion.div>

      {/* Risk Factors */}
      {progressData.riskFactors && progressData.riskFactors.length > 0 && (
        <motion.div
          className="risk-factors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Things to Watch
          </h3>
          <div className="space-y-4">
            {progressData.riskFactors.slice(0, 3).map((risk) => (
              <RiskFactorCard key={risk.riskId} risk={risk} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        className="report-actions flex flex-col sm:flex-row gap-4 pt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <button
          onClick={onGenerateReport}
          disabled={isPending}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Report...
            </>
          ) : (
            <>
              <ChartBarIcon className="w-5 h-5 mr-2" />
              Generate Full Progress Report
            </>
          )}
        </button>

        <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center">
          <ShareIcon className="w-5 h-5 mr-2" />
          Share Progress
        </button>
      </motion.div>
    </div>
  );
}

interface MilestoneCardProps {
  milestone: MilestoneStatus;
  index: number;
}

function MilestoneCard({ milestone, index }: MilestoneCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
      case 'upcoming':
        return <CalendarIcon className="w-6 h-6 text-gray-400" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <CalendarIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
        return 'bg-yellow-50 border-yellow-200';
      case 'upcoming':
        return 'bg-gray-50 border-gray-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <motion.div
      className={`milestone-item relative flex items-start space-x-4 p-6 rounded-xl border ${getStatusColor(milestone.status)}`}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Timeline marker */}
      <div className="absolute left-0 ml-6 w-4 h-4 bg-white border-4 border-gray-300 rounded-full -translate-x-8"></div>

      <div className="milestone-marker flex-shrink-0">
        {getStatusIcon(milestone.status)}
      </div>

      <div className="milestone-content flex-1">
        <h4 className="text-lg font-semibold text-gray-900 mb-1">
          {milestone.title}
        </h4>
        <p className="text-gray-600 mb-3">{milestone.description}</p>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center text-gray-500">
            <CalendarIcon className="w-4 h-4 mr-1" />
            <span>Due: {format(new Date(milestone.dueDate), 'MMM dd')}</span>
          </div>

          {milestone.assignedVendor && (
            <div className="flex items-center text-blue-600">
              <UserGroupIcon className="w-4 h-4 mr-1" />
              <span>{milestone.assignedVendor.name}</span>
            </div>
          )}

          {milestone.progress > 0 && (
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${milestone.progress}%` }}
                />
              </div>
              <span className="text-blue-600 text-xs font-medium">
                {milestone.progress}%
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface VendorStatusCardProps {
  vendor: VendorCoordinationStatus;
}

function VendorStatusCard({ vendor }: VendorStatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'needs_attention':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'concerning':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`vendor-status-card p-6 rounded-xl border ${getStatusColor(vendor.status)}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">{vendor.vendorName}</h4>
          <p className="text-sm text-gray-500">{vendor.category}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium capitalize">
            {vendor.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Communication</span>
          <ProgressRing
            percentage={vendor.communicationScore}
            label=""
            size={40}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Timeliness</span>
          <ProgressRing
            percentage={vendor.timelinessScore}
            label=""
            size={40}
          />
        </div>

        <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
          <span>Last contact:</span>
          <span>{format(new Date(vendor.lastContact), 'MMM dd')}</span>
        </div>

        {vendor.outstandingTasks > 0 && (
          <div className="flex justify-between text-sm text-orange-600 font-medium">
            <span>Outstanding tasks:</span>
            <span>{vendor.outstandingTasks}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: UpcomingTask;
}

function TaskCard({ task }: TaskCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="task-card bg-white p-6 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-900">{task.title}</h4>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}
        >
          {task.priority}
        </div>
      </div>

      <p className="text-gray-600 mb-4">{task.description}</p>

      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 mr-1" />
          <span>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
        </div>

        <div className="flex items-center">
          <ClockIcon className="w-4 h-4 mr-1" />
          <span>{task.estimatedTime} minutes</span>
        </div>

        {task.assignedVendor && (
          <div className="flex items-center">
            <UserGroupIcon className="w-4 h-4 mr-1" />
            <span>Assigned to vendor</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RiskFactorCardProps {
  risk: RiskFactor;
}

function RiskFactorCard({ risk }: RiskFactorCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className={`risk-factor-card p-6 rounded-xl border ${getSeverityColor(risk.severity)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-lg font-semibold text-gray-900">{risk.title}</h4>
        <div className="text-xs font-medium capitalize">
          {risk.severity} risk
        </div>
      </div>

      <p className="text-gray-600 mb-4">{risk.description}</p>

      <div className="bg-white bg-opacity-50 p-3 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 mb-1">
          Recommended action:
        </h5>
        <p className="text-sm text-gray-700">{risk.mitigation}</p>
      </div>
    </div>
  );
}

function ProgressReportSkeleton() {
  return (
    <div className="progress-report-skeleton space-y-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
      </div>

      <div className="animate-pulse bg-gray-100 rounded-2xl h-64"></div>

      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
