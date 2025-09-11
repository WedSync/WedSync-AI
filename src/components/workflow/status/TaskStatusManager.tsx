'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  MessageSquare,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { WorkflowTask, TaskStatus, TaskPriority } from '@/types/workflow';

interface StatusUpdate {
  id: string;
  task_id: string;
  previous_status: TaskStatus;
  new_status: TaskStatus;
  updated_by: string;
  updated_by_name: string;
  comment?: string;
  progress_percentage?: number;
  created_at: string;
}

interface TaskStatusManagerProps {
  task: WorkflowTask;
  onStatusUpdate: (
    taskId: string,
    newStatus: TaskStatus,
    comment?: string,
    progress?: number,
  ) => Promise<void>;
  canEdit: boolean;
  showHistory?: boolean;
}

export const TaskStatusManager: React.FC<TaskStatusManagerProps> = ({
  task,
  onStatusUpdate,
  canEdit,
  showHistory = true,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [progress, setProgress] = useState(task.progress_percentage || 0);
  const [statusHistory, setStatusHistory] = useState<StatusUpdate[]>([]);
  const [showCommentField, setShowCommentField] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (showHistory) {
      fetchStatusHistory();
    }
  }, [task.id, showHistory]);

  const fetchStatusHistory = async () => {
    try {
      const response = await fetch(
        `/api/workflow/tasks/${task.id}/status-history`,
      );
      if (response.ok) {
        const history = await response.json();
        setStatusHistory(history);
      }
    } catch (error) {
      console.error('Failed to fetch status history:', error);
    }
  };

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING:
        return {
          icon: Clock,
          label: 'Pending',
          color: 'text-gray-600 bg-gray-100',
          description: 'Task is waiting to be started',
        };
      case TaskStatus.IN_PROGRESS:
        return {
          icon: Play,
          label: 'In Progress',
          color: 'text-blue-600 bg-blue-100',
          description: 'Task is currently being worked on',
        };
      case TaskStatus.ON_HOLD:
        return {
          icon: Pause,
          label: 'On Hold',
          color: 'text-amber-600 bg-amber-100',
          description: 'Task is temporarily paused',
        };
      case TaskStatus.COMPLETED:
        return {
          icon: CheckCircle,
          label: 'Completed',
          color: 'text-green-600 bg-green-100',
          description: 'Task has been finished successfully',
        };
      case TaskStatus.CANCELLED:
        return {
          icon: XCircle,
          label: 'Cancelled',
          color: 'text-red-600 bg-red-100',
          description: 'Task has been cancelled',
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          color: 'text-gray-600 bg-gray-100',
          description: 'Unknown status',
        };
    }
  };

  const getValidStatusTransitions = (
    currentStatus: TaskStatus,
  ): TaskStatus[] => {
    switch (currentStatus) {
      case TaskStatus.PENDING:
        return [
          TaskStatus.IN_PROGRESS,
          TaskStatus.ON_HOLD,
          TaskStatus.CANCELLED,
        ];
      case TaskStatus.IN_PROGRESS:
        return [TaskStatus.COMPLETED, TaskStatus.ON_HOLD, TaskStatus.CANCELLED];
      case TaskStatus.ON_HOLD:
        return [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED];
      case TaskStatus.COMPLETED:
        return [TaskStatus.IN_PROGRESS]; // Allow reopening
      case TaskStatus.CANCELLED:
        return [TaskStatus.PENDING, TaskStatus.IN_PROGRESS];
      default:
        return [];
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!canEdit || isUpdating) return;

    setSelectedStatus(newStatus);

    // Show comment field for certain transitions
    if (
      newStatus === TaskStatus.ON_HOLD ||
      newStatus === TaskStatus.CANCELLED ||
      (task.status === TaskStatus.COMPLETED &&
        newStatus === TaskStatus.IN_PROGRESS)
    ) {
      setShowCommentField(true);
      return;
    }

    await executeStatusUpdate(newStatus);
  };

  const executeStatusUpdate = async (newStatus: TaskStatus) => {
    if (!canEdit || isUpdating) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(
        task.id,
        newStatus,
        comment.trim() || undefined,
        newStatus === TaskStatus.IN_PROGRESS ? progress : undefined,
      );

      setComment('');
      setShowCommentField(false);
      setSelectedStatus(null);

      // Refresh history
      if (showHistory) {
        await fetchStatusHistory();
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCommentSubmit = () => {
    if (selectedStatus) {
      executeStatusUpdate(selectedStatus);
    }
  };

  const getCurrentConfig = () => getStatusConfig(task.status);
  const currentConfig = getCurrentConfig();
  const CurrentIcon = currentConfig.icon;
  const validTransitions = getValidStatusTransitions(task.status);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Current Status Display */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Task Status</h3>
          {task.priority === TaskPriority.CRITICAL && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Critical
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 mb-6">
          <div className={`p-3 rounded-lg ${currentConfig.color}`}>
            <CurrentIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              {currentConfig.label}
            </h4>
            <p className="text-sm text-gray-600">{currentConfig.description}</p>
          </div>
        </div>

        {/* Progress Bar for In Progress Tasks */}
        {task.status === TaskStatus.IN_PROGRESS && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {canEdit && (
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            )}
          </div>
        )}

        {/* Status Transition Buttons */}
        {canEdit && validTransitions.length > 0 && (
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-gray-900">
              Available Actions
            </h5>
            <div className="flex flex-wrap gap-2">
              {validTransitions.map((status) => {
                const config = getStatusConfig(status);
                const StatusIcon = config.icon;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isUpdating}
                    className={`
                      inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium
                      border border-gray-300 bg-white text-gray-700
                      hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    `}
                  >
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comment Field */}
        {showCommentField && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Add a comment (required for this status change)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explain the reason for this status change..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => {
                  setShowCommentField(false);
                  setSelectedStatus(null);
                  setComment('');
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!comment.trim() || isUpdating}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status History */}
      {showHistory && statusHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Status History
          </h3>
          <div className="space-y-4">
            {statusHistory.map((update, index) => {
              const fromConfig = getStatusConfig(update.previous_status);
              const toConfig = getStatusConfig(update.new_status);
              const FromIcon = fromConfig.icon;
              const ToIcon = toConfig.icon;

              return (
                <div
                  key={update.id}
                  className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-md ${fromConfig.color}`}>
                      <FromIcon className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-gray-400">→</span>
                    <div className={`p-1.5 rounded-md ${toConfig.color}`}>
                      <ToIcon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {fromConfig.label} → {toConfig.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(update.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                      <User className="w-3 h-3" />
                      <span>{update.updated_by_name}</span>
                      <Calendar className="w-3 h-3 ml-2" />
                      <span>
                        {new Date(update.created_at).toLocaleString()}
                      </span>
                    </div>

                    {update.comment && (
                      <div className="flex items-start space-x-2 mt-2">
                        <MessageSquare className="w-3 h-3 mt-0.5 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {update.comment}
                        </p>
                      </div>
                    )}

                    {update.progress_percentage !== undefined && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">
                          Progress updated to {update.progress_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
