'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Bell,
  TrendingUp,
} from 'lucide-react';
import { WorkflowTask, TaskPriority, TaskStatus } from '@/types/workflow';

interface DeadlineStats {
  upcoming: number;
  overdue: number;
  completed: number;
  critical_overdue: number;
}

interface DeadlineTrackerProps {
  weddingId: string;
  tasks: WorkflowTask[];
  onTaskUpdate?: (taskId: string) => void;
}

interface TaskWithDeadlineInfo extends WorkflowTask {
  daysUntilDeadline?: number;
  isOverdue: boolean;
  urgencyLevel: 'safe' | 'warning' | 'danger' | 'critical';
}

export const DeadlineTracker: React.FC<DeadlineTrackerProps> = ({
  weddingId,
  tasks,
  onTaskUpdate,
}) => {
  const [stats, setStats] = useState<DeadlineStats>({
    upcoming: 0,
    overdue: 0,
    completed: 0,
    critical_overdue: 0,
  });
  const [tasksWithDeadlines, setTasksWithDeadlines] = useState<
    TaskWithDeadlineInfo[]
  >([]);
  const [filter, setFilter] = useState<
    'all' | 'overdue' | 'upcoming' | 'critical'
  >('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    processTaskDeadlines();
  }, [tasks]);

  const processTaskDeadlines = () => {
    const now = new Date();
    const processedTasks: TaskWithDeadlineInfo[] = [];
    const newStats: DeadlineStats = {
      upcoming: 0,
      overdue: 0,
      completed: 0,
      critical_overdue: 0,
    };

    tasks
      .filter((task) => task.deadline)
      .forEach((task) => {
        const deadline = new Date(task.deadline!);
        const timeDiff = deadline.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        const isOverdue = daysDiff < 0 && task.status !== TaskStatus.COMPLETED;
        let urgencyLevel: 'safe' | 'warning' | 'danger' | 'critical' = 'safe';

        if (task.status === TaskStatus.COMPLETED) {
          newStats.completed++;
          urgencyLevel = 'safe';
        } else if (isOverdue) {
          newStats.overdue++;
          if (task.priority === TaskPriority.CRITICAL) {
            newStats.critical_overdue++;
            urgencyLevel = 'critical';
          } else {
            urgencyLevel = 'danger';
          }
        } else {
          newStats.upcoming++;
          if (daysDiff <= 1) {
            urgencyLevel =
              task.priority === TaskPriority.CRITICAL ? 'critical' : 'danger';
          } else if (daysDiff <= 3) {
            urgencyLevel = 'warning';
          }
        }

        processedTasks.push({
          ...task,
          daysUntilDeadline: daysDiff,
          isOverdue,
          urgencyLevel,
        });
      });

    // Sort by urgency and deadline
    processedTasks.sort((a, b) => {
      const urgencyOrder = { critical: 0, danger: 1, warning: 2, safe: 3 };
      if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
        return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      }
      return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
    });

    setTasksWithDeadlines(processedTasks);
    setStats(newStats);
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'overdue':
        return tasksWithDeadlines.filter((task) => task.isOverdue);
      case 'upcoming':
        return tasksWithDeadlines.filter(
          (task) => !task.isOverdue && task.status !== TaskStatus.COMPLETED,
        );
      case 'critical':
        return tasksWithDeadlines.filter(
          (task) => task.urgencyLevel === 'critical',
        );
      default:
        return tasksWithDeadlines;
    }
  };

  const formatDeadlineText = (task: TaskWithDeadlineInfo) => {
    if (task.status === TaskStatus.COMPLETED) {
      return 'Completed';
    }

    if (task.isOverdue) {
      const daysPast = Math.abs(task.daysUntilDeadline!);
      return `${daysPast} day${daysPast === 1 ? '' : 's'} overdue`;
    }

    if (task.daysUntilDeadline === 0) {
      return 'Due today';
    }

    if (task.daysUntilDeadline === 1) {
      return 'Due tomorrow';
    }

    return `Due in ${task.daysUntilDeadline} days`;
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'danger':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getUrgencyIcon = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-700" />;
      case 'danger':
        return <Clock className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: number;
    color: string;
    onClick?: () => void;
  }> = ({ icon, title, value, color, onClick }) => (
    <div
      className={`
        bg-white border border-gray-200 rounded-xl p-6
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div
          className={`p-3 rounded-lg ${
            color.includes('red')
              ? 'bg-red-50'
              : color.includes('amber')
                ? 'bg-amber-50'
                : color.includes('green')
                  ? 'bg-green-50'
                  : 'bg-gray-50'
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Deadline Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-6 h-6 text-blue-600" />}
          title="Upcoming Deadlines"
          value={stats.upcoming}
          color="text-blue-600"
          onClick={() => setFilter('upcoming')}
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
          title="Overdue Tasks"
          value={stats.overdue}
          color="text-amber-600"
          onClick={() => setFilter('overdue')}
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          title="Critical Overdue"
          value={stats.critical_overdue}
          color="text-red-600"
          onClick={() => setFilter('critical')}
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          title="Completed"
          value={stats.completed}
          color="text-green-600"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'critical', label: 'Critical' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'upcoming', label: 'Upcoming' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${
                filter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Deadline Tracking
              {filter !== 'all' && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({getFilteredTasks().length} tasks)
                </span>
              )}
            </h3>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {getFilteredTasks().length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No tasks found
              </h4>
              <p className="text-gray-500">
                {filter === 'all'
                  ? 'No tasks with deadlines assigned yet.'
                  : `No ${filter} tasks at the moment.`}
              </p>
            </div>
          ) : (
            getFilteredTasks().map((task) => (
              <div
                key={task.id}
                className="p-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getUrgencyIcon(task.urgencyLevel)}
                      <h4 className="text-sm font-medium text-gray-900">
                        {task.title}
                      </h4>
                      {task.priority === TaskPriority.CRITICAL && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Critical
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Assigned to: {task.assigned_to_name || 'Unassigned'}
                      </span>
                      <span>Category: {task.category}</span>
                      {task.estimated_hours && (
                        <span>Est: {task.estimated_hours}h</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <span
                      className={`
                      inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${getUrgencyColor(task.urgencyLevel)}
                    `}
                    >
                      {formatDeadlineText(task)}
                    </span>

                    <div className="text-xs text-gray-500">
                      Due: {new Date(task.deadline!).toLocaleDateString()}
                    </div>

                    <div className="flex space-x-2">
                      {task.status !== TaskStatus.COMPLETED && (
                        <button
                          onClick={() => onTaskUpdate?.(task.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Update Status
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress indicator for tasks in progress */}
                {task.status === TaskStatus.IN_PROGRESS &&
                  task.progress_percentage && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{task.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {stats.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-900">
                  Overdue Tasks Detected
                </h4>
                <p className="text-sm text-red-700">
                  {stats.overdue} task{stats.overdue === 1 ? ' is' : 's are'}{' '}
                  past deadline
                  {stats.critical_overdue > 0 && (
                    <span className="font-medium">
                      , including {stats.critical_overdue} critical task
                      {stats.critical_overdue === 1 ? '' : 's'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilter('overdue')}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Review Overdue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
