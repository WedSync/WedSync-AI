'use client';

import React from 'react';
import { AlertTriangle, Clock, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UrgentTask {
  id: string;
  title: string;
  dueDate: string;
  overdueDays?: number;
  assignee?: string;
  client?: string;
  priority: 'high' | 'urgent' | 'critical';
  category: 'vendor' | 'client' | 'planning' | 'documentation' | 'follow-up';
}

interface UrgentTasksProps {
  tasks: UrgentTask[];
  className?: string;
  compact?: boolean;
}

export function UrgentTasks({
  tasks,
  className,
  compact = false,
}: UrgentTasksProps) {
  const getPriorityColor = (priority: UrgentTask['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'urgent':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'high':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getCategoryIcon = (category: UrgentTask['category']) => {
    const iconClass = 'w-4 h-4';
    switch (category) {
      case 'vendor':
        return <User className={iconClass} />;
      case 'client':
        return <User className={iconClass} />;
      case 'planning':
        return <Calendar className={iconClass} />;
      case 'documentation':
        return <Clock className={iconClass} />;
      case 'follow-up':
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  const getCategoryColor = (category: UrgentTask['category']) => {
    switch (category) {
      case 'vendor':
        return 'text-blue-600 bg-blue-50';
      case 'client':
        return 'text-green-600 bg-green-50';
      case 'planning':
        return 'text-purple-600 bg-purple-50';
      case 'documentation':
        return 'text-gray-600 bg-gray-50';
      case 'follow-up':
      default:
        return 'text-orange-600 bg-orange-50';
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const isOverdue = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    return date.getTime() < now.getTime();
  };

  const urgentCount = tasks.filter(
    (task) => task.priority === 'urgent' || task.priority === 'critical',
  ).length;
  const overdueCount = tasks.filter((task) => isOverdue(task.dueDate)).length;

  if (compact) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
              Urgent Tasks
            </div>
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {urgentCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className={cn(
                'p-2 rounded-lg border',
                getPriorityColor(task.priority),
                isOverdue(task.dueDate) && 'ring-1 ring-red-400',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{task.title}</p>
                  <div className="flex items-center text-xs mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    <span
                      className={
                        isOverdue(task.dueDate)
                          ? 'text-red-600 font-medium'
                          : ''
                      }
                    >
                      {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="ml-2">{getCategoryIcon(task.category)}</div>
              </div>
            </div>
          ))}
          {tasks.length > 3 && (
            <p className="text-xs text-gray-500 text-center py-1">
              +{tasks.length - 3} more urgent tasks
            </p>
          )}
          {overdueCount > 0 && (
            <div className="p-2 bg-red-50 rounded-lg">
              <p className="text-xs text-red-800 font-medium">
                ⚠️ {overdueCount} overdue tasks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Urgent Tasks
          </div>
          <div className="flex gap-2">
            {urgentCount > 0 && (
              <Badge variant="destructive">{urgentCount} urgent</Badge>
            )}
            {overdueCount > 0 && (
              <Badge className="bg-red-600 text-white">
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No urgent tasks</p>
            <p className="text-sm text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'p-3 rounded-lg border transition-all duration-200 hover:shadow-sm',
                  getPriorityColor(task.priority),
                  isOverdue(task.dueDate) && 'ring-2 ring-red-400',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'ml-2 text-xs',
                          getCategoryColor(task.category),
                        )}
                      >
                        {task.category}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span
                          className={
                            isOverdue(task.dueDate)
                              ? 'text-red-600 font-medium'
                              : ''
                          }
                        >
                          {formatDueDate(task.dueDate)}
                        </span>
                      </div>

                      {task.assignee && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          <span className="truncate max-w-[120px]">
                            {task.assignee}
                          </span>
                        </div>
                      )}

                      {task.client && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span className="truncate max-w-[120px]">
                            {task.client}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={cn('ml-2', getPriorityColor(task.priority))}
                  >
                    {task.priority}
                  </Badge>
                </div>

                {isOverdue(task.dueDate) && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800 font-medium">
                    🚨{' '}
                    {Math.abs(
                      Math.ceil(
                        (new Date(task.dueDate).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    )}{' '}
                    days overdue
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
