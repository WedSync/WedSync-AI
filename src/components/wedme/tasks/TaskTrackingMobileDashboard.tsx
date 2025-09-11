'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  PlusIcon,
  FilterIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from 'lucide-react';
import { WedMeHeader } from '../WedMeHeader';
import { TaskStatusCard } from './TaskStatusCard';
import { MobileStatusUpdateModal } from './MobileStatusUpdateModal';
import { TouchInput } from '@/components/touch/TouchInput';
import { PullToRefresh } from '@/components/mobile/MobileEnhancedFeatures';
import { useMobileSecurity } from '@/hooks/useMobileSecurity';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
  dueDate?: Date;
  category: string;
  estimatedTime?: string;
  notes?: string;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
  helperCount: number;
  isHighPriority: boolean;
  venue?: string;
  conflicts?: string[];
}

interface TaskTrackingMobileDashboardProps {
  weddingId: string;
  currentUserId: string;
  initialTasks?: Task[];
  onTaskCreate?: () => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskComplete?: (taskId: string) => Promise<void>;
  onTaskAssign?: (taskId: string, helperId: string) => Promise<void>;
}

export function TaskTrackingMobileDashboard({
  weddingId,
  currentUserId,
  initialTasks = [],
  onTaskCreate,
  onTaskUpdate,
  onTaskComplete,
  onTaskAssign,
}: TaskTrackingMobileDashboardProps) {
  // State management
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pending' | 'in_progress' | 'completed'
  >('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Security and offline hooks
  const { validateTaskAccess, securityLevel, isOffline, networkQuality } =
    useMobileSecurity();

  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: currentUserId,
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Filter and search logic
  useEffect(() => {
    let filtered = tasks;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query) ||
          task.assignedToName?.toLowerCase().includes(query),
      );
    }

    // Sort by priority and due date
    filtered = filtered.sort((a, b) => {
      // First by priority
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // Finally by created date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    setFilteredTasks(filtered);
  }, [tasks, activeFilter, searchQuery]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call to refresh tasks
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // In real app, would refetch from API
      console.log('Tasks refreshed');
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Task action handlers
  const handleTaskTap = useCallback(
    async (task: Task) => {
      try {
        // Validate task access with mobile security
        const hasAccess = await validateTaskAccess(task.id);
        if (!hasAccess) {
          alert('Access denied to this task');
          return;
        }

        setSelectedTask(task);
        setIsModalOpen(true);
      } catch (error) {
        console.error('Task access validation failed:', error);
        alert('Unable to open task');
      }
    },
    [validateTaskAccess],
  );

  const handleTaskComplete = useCallback(
    async (taskId: string) => {
      try {
        const hasAccess = await validateTaskAccess(taskId);
        if (!hasAccess) return;

        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, status: 'completed' as const, updatedAt: new Date() }
              : task,
          ),
        );

        // Trigger success haptic
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        // Call API
        await onTaskComplete?.(taskId);
      } catch (error) {
        console.error('Failed to complete task:', error);
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, status: 'in_progress' as const }
              : task,
          ),
        );
      }
    },
    [validateTaskAccess, onTaskComplete],
  );

  const handleTaskEdit = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
  }, []);

  const handleTaskSave = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      try {
        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, ...updates, updatedAt: new Date() }
              : task,
          ),
        );

        // Call API
        await onTaskUpdate?.(taskId, updates);

        setIsModalOpen(false);
        setSelectedTask(null);

        // Success feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      } catch (error) {
        console.error('Failed to update task:', error);
        // Could implement revert logic here
      }
    },
    [onTaskUpdate],
  );

  // Stats calculations
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    overdue: tasks.filter(
      (t) => t.dueDate && t.dueDate < new Date() && t.status !== 'completed',
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* WedMe Header */}
      <WedMeHeader
        title="Task Tracking"
        showBackButton={false}
        notifications={offlineHook.syncStatus.pendingCount}
        className="sticky top-0 z-50"
      />

      {/* Security & Network Status Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOffline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                <WifiOffIcon className="w-3 h-3" />
                Offline
              </div>
            )}
            {offlineHook.syncStatus.hasUnsyncedData && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <RefreshCwIcon className="w-3 h-3" />
                {offlineHook.syncStatus.pendingCount} pending
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Security: {securityLevel.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
        {/* Search Input */}
        <TouchInput
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          size="md"
          preventZoom={true}
          touchOptimized={true}
        />

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'pending', label: 'Pending', count: stats.pending },
            {
              key: 'in_progress',
              label: 'In Progress',
              count: stats.inProgress,
            },
            { key: 'completed', label: 'Completed', count: stats.completed },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as typeof activeFilter)}
              className={cn(
                'flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                'transition-all duration-200 touch-manipulation',
                activeFilter === key
                  ? 'bg-pink-100 text-pink-700 border-2 border-pink-200'
                  : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200',
              )}
            >
              {label}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                  activeFilter === key
                    ? 'bg-pink-200 text-pink-800'
                    : 'bg-gray-200 text-gray-600',
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {stats.total}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {stats.completed}
            </div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {stats.inProgress}
            </div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {stats.overdue}
            </div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
        </div>
      </div>

      {/* Task List with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="p-4 space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskStatusCard
                key={task.id}
                task={task}
                onTap={handleTaskTap}
                onComplete={handleTaskComplete}
                onEdit={handleTaskEdit}
                onAssignHelper={(helperId) => onTaskAssign?.(task.id, helperId)}
                disabled={isOffline && task.status === 'pending'}
                showOfflineIndicator={!offlineHook.isOnline}
              />
            ))
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
                {searchQuery || activeFilter !== 'all' ? (
                  <FilterIcon className="w-8 h-8 text-gray-400" />
                ) : (
                  <CheckCircleIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || activeFilter !== 'all'
                  ? 'No tasks found'
                  : 'No tasks yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first task to get started'}
              </p>
              {!searchQuery && activeFilter === 'all' && (
                <button
                  onClick={onTaskCreate}
                  className={cn(
                    'px-6 py-3 bg-pink-600 text-white rounded-lg font-medium',
                    'touch-manipulation hover:bg-pink-700 transition-colors duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  disabled={isOffline}
                >
                  Create Your First Task
                </button>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-4 z-20">
        <button
          onClick={onTaskCreate}
          className={cn(
            'w-14 h-14 bg-pink-600 text-white rounded-full shadow-lg',
            'flex items-center justify-center touch-manipulation',
            'hover:bg-pink-700 transition-all duration-200',
            'focus:outline-none focus:ring-4 focus:ring-pink-100',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isOffline && 'opacity-75',
          )}
          disabled={isOffline}
          aria-label="Create new task"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Status Update Modal */}
      {isModalOpen && selectedTask && (
        <MobileStatusUpdateModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleTaskSave}
          onComplete={() => handleTaskComplete(selectedTask.id)}
          canEdit={!isOffline}
          securityLevel={securityLevel}
        />
      )}

      {/* Performance Debug (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div>
            Tasks: {filteredTasks.length}/{tasks.length}
          </div>
          <div>Network: {networkQuality}</div>
          <div>Security: {securityLevel}</div>
          <div>Offline: {offlineHook.isOnline ? '✅' : '❌'}</div>
          <div>Sync: {offlineHook.syncStatus.pendingCount} pending</div>
        </div>
      )}
    </div>
  );
}
