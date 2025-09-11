'use client';

/**
 * WS-342 Live Task Management - Real-time Task Coordination
 * Team A - Frontend/UI Development - Task Management Interface
 *
 * Real-time task management system for collaborative wedding planning
 * with assignments, progress tracking, and deadline management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  WeddingTask,
  TaskStatus,
  TaskPriority,
  Collaborator,
  WeddingVendor,
  TaskAssignment,
  TaskProgress,
  TaskComment,
} from '@/types/collaboration';

// Icons
import {
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  FileText,
  Camera,
  Star,
  Filter,
  Search,
  MoreHorizontal,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export interface LiveTaskManagementProps {
  weddingId: string;
  tasks: WeddingTask[];
  collaborators: Collaborator[];
  vendors: WeddingVendor[];
  onTaskCreate: (
    task: Omit<WeddingTask, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void;
  onTaskUpdate: (taskId: string, updates: Partial<WeddingTask>) => void;
  onTaskAssign: (taskId: string, assigneeId: string) => void;
  onTaskComplete: (taskId: string) => void;
  onProgressUpdate: (taskId: string, progress: TaskProgress) => void;
  currentUserId: string;
  realTimeMode?: boolean;
  className?: string;
}

export function LiveTaskManagement({
  weddingId,
  tasks,
  collaborators,
  vendors,
  onTaskCreate,
  onTaskUpdate,
  onTaskAssign,
  onTaskComplete,
  onProgressUpdate,
  currentUserId,
  realTimeMode = true,
  className,
}: LiveTaskManagementProps) {
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline'>(
    'board',
  );
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<WeddingTask | null>(null);

  // Filter and organize tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority =
        filterPriority === 'all' || task.priority === filterPriority;
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tasks, filterStatus, filterPriority, searchQuery]);

  // Group tasks by status for board view
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, WeddingTask[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.COMPLETED]: [],
    };

    filteredTasks.forEach((task) => {
      groups[task.status].push(task);
    });

    return groups;
  }, [filteredTasks]);

  const handleTaskStatusUpdate = useCallback(
    (taskId: string, status: TaskStatus) => {
      onTaskUpdate(taskId, { status, updatedAt: new Date() });
    },
    [onTaskUpdate],
  );

  const handleTaskPriorityUpdate = useCallback(
    (taskId: string, priority: TaskPriority) => {
      onTaskUpdate(taskId, { priority, updatedAt: new Date() });
    },
    [onTaskUpdate],
  );

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-gray-100 text-gray-800';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case TaskStatus.REVIEW:
        return 'bg-yellow-100 text-yellow-800';
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'text-green-600';
      case TaskPriority.MEDIUM:
        return 'text-yellow-600';
      case TaskPriority.HIGH:
        return 'text-orange-600';
      case TaskPriority.URGENT:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return <Star className="w-4 h-4" />;
      case TaskPriority.MEDIUM:
        return <Clock className="w-4 h-4" />;
      case TaskPriority.HIGH:
        return <AlertTriangle className="w-4 h-4" />;
      case TaskPriority.URGENT:
        return <AlertTriangle className="w-4 h-4 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const TaskCard = ({ task }: { task: WeddingTask }) => {
    const assignee = collaborators.find((c) => c.id === task.assignedTo);
    const vendor = vendors.find((v) => v.id === task.vendorId);

    return (
      <Card
        className={cn(
          'mb-3 cursor-pointer hover:shadow-md transition-shadow',
          realTimeMode && 'ring-1 ring-blue-200',
        )}
        onClick={() => setSelectedTask(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            <div
              className={cn(
                'flex items-center',
                getPriorityColor(task.priority),
              )}
            >
              {getPriorityIcon(task.priority)}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Progress Bar */}
          {task.progress && task.progress.percentage > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Progress</span>
                <span className="text-xs font-medium">
                  {task.progress.percentage}%
                </span>
              </div>
              <Progress value={task.progress.percentage} className="h-2" />
            </div>
          )}

          {/* Task Meta Information */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              {assignee && (
                <div className="flex items-center">
                  <Avatar className="w-4 h-4 mr-1">
                    <AvatarImage src={assignee.avatar} />
                    <AvatarFallback className="text-xs">
                      {assignee.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{assignee.name}</span>
                </div>
              )}

              {vendor && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {vendor.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {task.dueDate && (
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}

              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  <span>{task.comments.length}</span>
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  <span>{task.attachments.length}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className={cn('live-task-management', className)}
      data-testid="live-task-management"
    >
      {/* Task Management Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Task Management
            </h2>
            <p className="text-gray-600">
              Coordinate tasks and track progress in real-time
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {realTimeMode && (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Live</span>
              </div>
            )}
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as TaskStatus | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value={TaskStatus.TODO}>To Do</option>
            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatus.REVIEW}>Review</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) =>
              setFilterPriority(e.target.value as TaskPriority | 'all')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Priority</option>
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.HIGH}>High</option>
            <option value={TaskPriority.URGENT}>Urgent</option>
          </select>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('board')}
              className={cn(
                'px-3 py-1 rounded text-sm transition-colors',
                activeView === 'board'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-gray-200',
              )}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={cn(
                'px-3 py-1 rounded text-sm transition-colors',
                activeView === 'list'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-gray-200',
              )}
            >
              List
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={cn(
                'px-3 py-1 rounded text-sm transition-colors',
                activeView === 'timeline'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-gray-200',
              )}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Board View */}
      {activeView === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 capitalize">
                  {status.replace('_', ' ').toLowerCase()}
                </h3>
                <Badge className={getStatusColor(status as TaskStatus)}>
                  {statusTasks.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {statusTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}

                {statusTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {activeView === 'list' && (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const assignee = collaborators.find(
              (c) => c.id === task.assignedTo,
            );
            const vendor = vendors.find((v) => v.id === task.vendorId);

            return (
              <Card
                key={task.id}
                className="hover:shadow-sm transition-shadow cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => onTaskComplete(task.id)}
                      disabled={task.status === TaskStatus.COMPLETED}
                    >
                      <CheckCircle
                        className={cn(
                          'w-5 h-5',
                          task.status === TaskStatus.COMPLETED
                            ? 'text-green-600'
                            : 'text-gray-400 hover:text-green-600',
                        )}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 truncate">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>

                      <div className={getPriorityColor(task.priority)}>
                        {getPriorityIcon(task.priority)}
                      </div>

                      {assignee && (
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={assignee.avatar} />
                          <AvatarFallback className="text-xs">
                            {assignee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {task.dueDate && (
                        <div className="text-sm text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}

                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {task.progress && task.progress.percentage > 0 && (
                    <div className="mt-3">
                      <Progress
                        value={task.progress.percentage}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tasks match your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {activeView === 'timeline' && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Timeline view coming soon</p>
        </div>
      )}
    </div>
  );
}

export default LiveTaskManagement;
