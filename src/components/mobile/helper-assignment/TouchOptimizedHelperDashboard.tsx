'use client';

// WS-157 Touch-Optimized Helper Assignment Dashboard
// Round 2: Mobile enhancements with offline capabilities and touch gestures

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  ChevronRight,
  Bell,
  BarChart3,
  FileText,
  Plus,
  Filter,
  GripVertical,
  ArrowUpDown,
  Wifi,
  WifiOff,
  Download,
  Upload,
} from 'lucide-react';

interface HelperTask {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  category: string;
  estimatedDuration: number;
  assignedBy: {
    name: string;
    email: string;
  };
  wedding: {
    id: string;
    coupleName: string;
    date: Date;
  };
  budgetImpact?: number;
  vendorInfo?: {
    name: string;
    type: string;
    contact: string;
  };
  offline?: boolean;
  lastSynced?: Date;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  upcoming: number;
  offline: number;
}

interface TouchGesture {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  isActive: boolean;
}

export default function TouchOptimizedHelperDashboard() {
  const [tasks, setTasks] = useState<HelperTask[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    upcoming: 0,
    offline: 0,
  });
  const [filter, setFilter] = useState<
    'all' | 'today' | 'week' | 'overdue' | 'offline'
  >('all');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<HelperTask | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [touchGesture, setTouchGesture] = useState<TouchGesture | null>(null);
  const [swipeThreshold] = useState(100);
  const [longPressTimeout, setLongPressTimeout] =
    useState<NodeJS.Timeout | null>(null);

  const supabase = createClientComponentClient();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch and gesture handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, taskId: string) => {
      const touch = e.touches[0];
      const gesture: TouchGesture = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        isActive: true,
      };

      setTouchGesture(gesture);

      // Long press detection for task options
      const timeout = setTimeout(() => {
        if (touchGesture?.isActive) {
          handleLongPress(taskId);
        }
      }, 800);

      setLongPressTimeout(timeout);
    },
    [touchGesture],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchGesture) return;

      const touch = e.touches[0];
      const updatedGesture = {
        ...touchGesture,
        currentX: touch.clientX,
        currentY: touch.clientY,
      };

      setTouchGesture(updatedGesture);

      // Cancel long press if moved too much
      const deltaX = Math.abs(touch.clientX - touchGesture.startX);
      const deltaY = Math.abs(touch.clientY - touchGesture.startY);

      if ((deltaX > 10 || deltaY > 10) && longPressTimeout) {
        clearTimeout(longPressTimeout);
        setLongPressTimeout(null);
      }
    },
    [touchGesture, longPressTimeout],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, taskId: string) => {
      if (!touchGesture) return;

      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        setLongPressTimeout(null);
      }

      const deltaX = touchGesture.currentX - touchGesture.startX;
      const deltaY = touchGesture.currentY - touchGesture.startY;
      const duration = Date.now() - touchGesture.startTime;

      // Swipe detection
      if (
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > swipeThreshold
      ) {
        if (deltaX > 0) {
          handleSwipeRight(taskId);
        } else {
          handleSwipeLeft(taskId);
        }
      } else if (
        duration < 300 &&
        Math.abs(deltaX) < 10 &&
        Math.abs(deltaY) < 10
      ) {
        // Quick tap
        handleTaskSelect(taskId);
      }

      setTouchGesture(null);
    },
    [touchGesture, longPressTimeout, swipeThreshold],
  );

  const handleLongPress = (taskId: string) => {
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Show task options
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  };

  const handleSwipeLeft = (taskId: string) => {
    // Quick action: Mark as complete
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== 'completed') {
      updateTaskStatus(taskId, 'completed');

      // Show brief feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    }
  };

  const handleSwipeRight = (taskId: string) => {
    // Quick action: Start task or move to in progress
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status === 'todo') {
      updateTaskStatus(taskId, 'in_progress');

      // Show brief feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  };

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineTasks();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadHelperTasks();
    setupRealtimeSubscription();
  }, [filter]);

  const loadHelperTasks = async () => {
    try {
      setLoading(true);

      // Try online first, fallback to offline
      if (isOnline) {
        await loadTasksOnline();
      } else {
        await loadTasksOffline();
      }
    } catch (error) {
      console.error('Error loading helper tasks:', error);
      // Fallback to offline data
      await loadTasksOffline();
    } finally {
      setLoading(false);
    }
  };

  const loadTasksOnline = async () => {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get team member info
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!teamMember) return;

    // Build query based on filter
    let query = supabase
      .from('workflow_tasks')
      .select(
        `
        *,
        assigned_by:team_members!workflow_tasks_assigned_by_fkey(name, email),
        wedding:weddings(id, couple_names, wedding_date),
        vendor:vendors(name, type, email, phone)
      `,
      )
      .eq('assigned_to', teamMember.id);

    // Apply filters
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    switch (filter) {
      case 'today':
        query = query
          .gte('deadline', today.toISOString())
          .lt(
            'deadline',
            new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          );
        break;
      case 'week':
        query = query
          .gte('deadline', today.toISOString())
          .lt('deadline', weekEnd.toISOString());
        break;
      case 'overdue':
        query = query
          .lt('deadline', now.toISOString())
          .neq('status', 'completed');
        break;
    }

    const { data: tasksData, error } = await query.order('deadline', {
      ascending: true,
    });

    if (error) throw error;

    // Transform and cache data
    const transformedTasks: HelperTask[] =
      tasksData?.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        deadline: new Date(task.deadline),
        priority: task.priority,
        status: task.status,
        category: task.category,
        estimatedDuration: task.estimated_duration,
        assignedBy: task.assigned_by,
        wedding: {
          id: task.wedding.id,
          coupleName: task.wedding.couple_names,
          date: new Date(task.wedding.wedding_date),
        },
        budgetImpact: task.budget_impact,
        vendorInfo: task.vendor
          ? {
              name: task.vendor.name,
              type: task.vendor.type,
              contact: task.vendor.email || task.vendor.phone,
            }
          : undefined,
        offline: false,
        lastSynced: new Date(),
      })) || [];

    setTasks(transformedTasks);
    calculateStats(transformedTasks);

    // Cache for offline use
    await cacheTasksOffline(transformedTasks);
  };

  const loadTasksOffline = async () => {
    // Load from IndexedDB cache
    const cachedTasks = await getCachedTasks();
    const offlineTasks = cachedTasks.map((task) => ({
      ...task,
      offline: true,
    }));

    setTasks(offlineTasks);
    calculateStats(offlineTasks);
  };

  const cacheTasksOffline = async (tasks: HelperTask[]) => {
    try {
      // Store in IndexedDB for offline access
      const db = await openOfflineDB();
      const transaction = db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');

      // Clear existing data
      await store.clear();

      // Store new data
      for (const task of tasks) {
        await store.put(task);
      }

      await transaction.complete;
    } catch (error) {
      console.error('Error caching tasks offline:', error);
    }
  };

  const getCachedTasks = async (): Promise<HelperTask[]> => {
    try {
      const db = await openOfflineDB();
      const transaction = db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      return await store.getAll();
    } catch (error) {
      console.error('Error loading cached tasks:', error);
      return [];
    }
  };

  const openOfflineDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('HelperTasksDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('priority', 'priority');
          store.createIndex('deadline', 'deadline');
        }
      };
    });
  };

  const syncOfflineTasks = async () => {
    if (!isOnline) return;

    try {
      // Get pending offline changes
      const pendingChanges = await getPendingOfflineChanges();

      for (const change of pendingChanges) {
        await supabase
          .from('workflow_tasks')
          .update({
            status: change.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', change.taskId);
      }

      // Clear pending changes
      await clearPendingOfflineChanges();

      // Reload fresh data
      await loadTasksOnline();
    } catch (error) {
      console.error('Error syncing offline tasks:', error);
    }
  };

  const getPendingOfflineChanges = async () => {
    try {
      const db = await openOfflineDB();
      const transaction = db.transaction(['pending_changes'], 'readonly');
      const store = transaction.objectStore('pending_changes');
      return await store.getAll();
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return [];
    }
  };

  const clearPendingOfflineChanges = async () => {
    try {
      const db = await openOfflineDB();
      const transaction = db.transaction(['pending_changes'], 'readwrite');
      const store = transaction.objectStore('pending_changes');
      await store.clear();
    } catch (error) {
      console.error('Error clearing pending changes:', error);
    }
  };

  const calculateStats = (taskList: HelperTask[]) => {
    const now = new Date();
    const stats: TaskStats = {
      total: taskList.length,
      completed: taskList.filter((t) => t.status === 'completed').length,
      inProgress: taskList.filter((t) => t.status === 'in_progress').length,
      overdue: taskList.filter(
        (t) => t.deadline < now && t.status !== 'completed',
      ).length,
      upcoming: taskList.filter((t) => {
        const daysUntil =
          (t.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil <= 7 && daysUntil >= 0;
      }).length,
      offline: taskList.filter((t) => t.offline).length,
    };
    setStats(stats);
  };

  const setupRealtimeSubscription = () => {
    if (!isOnline) return;

    const subscription = supabase
      .channel('helper-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_tasks',
        },
        () => {
          loadHelperTasks();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('workflow_tasks')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        if (error) throw error;
      } else {
        // Store offline change
        await storeOfflineChange(taskId, { status: newStatus });
      }

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: newStatus as any,
                offline: !isOnline,
              }
            : task,
        ),
      );

      // Recalculate stats
      const updatedTasks = tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus as any,
              offline: !isOnline,
            }
          : task,
      );
      calculateStats(updatedTasks);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const storeOfflineChange = async (taskId: string, changes: any) => {
    try {
      const db = await openOfflineDB();
      const transaction = db.transaction(['pending_changes'], 'readwrite');
      const store = transaction.objectStore('pending_changes');

      await store.put({
        taskId,
        changes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error storing offline change:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'high':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'medium':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-success-700 bg-success-50 border-success-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-success-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'review':
        return <FileText className="w-5 h-5 text-primary-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" ref={containerRef}>
      {/* Header with Connection Status */}
      <div className="bg-white shadow-xs sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
              {!isOnline && (
                <div className="flex items-center gap-1 px-2 py-1 bg-warning-50 border border-warning-200 rounded-full">
                  <WifiOff className="w-3 h-3 text-warning-600" />
                  <span className="text-xs text-warning-700">Offline</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-6 h-6 text-success-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-warning-600" />
              )}
              <Bell className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards with Offline Count */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completed}
                </p>
              </div>
              <div className="p-2 bg-success-50 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-error-600">
                  {stats.overdue}
                </p>
              </div>
              <div className="p-2 bg-error-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-error-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.upcoming}
                </p>
              </div>
              <div className="p-2 bg-primary-50 rounded-lg">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
        </div>

        {stats.offline > 0 && (
          <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-warning-600" />
              <span className="text-sm text-warning-700">
                {stats.offline} task{stats.offline > 1 ? 's' : ''} pending sync
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Filter Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['all', 'today', 'week', 'overdue', 'offline'].map(
            (filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 min-w-[44px] ${
                  filter === filterOption
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                }`}
              >
                {filterOption === 'offline' && !isOnline ? '📴 ' : ''}
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Touch-Enhanced Task List */}
      <div className="px-4 space-y-3 pb-4">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-xs border border-gray-200">
            <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No tasks found</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === 'offline'
                ? 'No offline tasks available'
                : 'All caught up!'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onTouchStart={(e) => handleTouchStart(e, task.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, task.id)}
              className={`bg-white rounded-xl p-4 shadow-xs border transition-all duration-200 select-none ${
                task.offline
                  ? 'border-warning-200 bg-warning-25'
                  : 'border-gray-200 hover:shadow-sm active:scale-[0.98]'
              }`}
              style={{
                minHeight: '44px', // Minimum touch target size
                touchAction: 'pan-y', // Allow vertical scrolling
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(task.status)}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </span>
                    {task.offline && (
                      <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded-full border border-warning-300">
                        📴 Offline
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1 text-base leading-tight">
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {task.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Due: {task.deadline.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {task.wedding.coupleName}
                      </span>
                    </div>
                    {task.budgetImpact && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <BarChart3 className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Budget: ${task.budgetImpact.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Touch-Optimized Quick Actions */}
                  <div className="flex gap-2 mt-4">
                    {task.status === 'todo' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, 'in_progress');
                        }}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs min-h-[44px] flex items-center justify-center"
                      >
                        Start Task
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, 'completed');
                        }}
                        className="px-4 py-2.5 bg-success-600 hover:bg-success-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-xs min-h-[44px] flex items-center justify-center"
                      >
                        Complete
                      </button>
                    )}
                  </div>

                  {/* Swipe Hints */}
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-4">
                    <span>← Swipe left to complete</span>
                    <span>Swipe right to start →</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 ml-3">
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enhanced Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Task Details
                </h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  {getStatusIcon(selectedTask.status)}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight">
                      {selectedTask.title}
                    </h3>
                    {selectedTask.offline && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-warning-100 text-warning-700 text-sm rounded-full border border-warning-300 mb-2">
                        <WifiOff className="w-3 h-3" />
                        Changes saved offline
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Priority & Status
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getPriorityColor(selectedTask.priority)}`}
                    >
                      {selectedTask.priority}
                    </span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedTask.status)}
                      <span className="text-sm font-medium text-gray-700">
                        {selectedTask.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Wedding Details
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">
                      {selectedTask.wedding.coupleName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Wedding Date:{' '}
                      {selectedTask.wedding.date.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Task Information
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Deadline</p>
                      <p className="font-medium text-gray-900">
                        {selectedTask.deadline.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Estimated Duration
                      </p>
                      <p className="font-medium text-gray-900">
                        {selectedTask.estimatedDuration} hour
                        {selectedTask.estimatedDuration !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {selectedTask.budgetImpact && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Budget Impact
                        </p>
                        <p className="font-medium text-gray-900">
                          ${selectedTask.budgetImpact.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTask.vendorInfo && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Vendor Information
                    </p>
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">
                        {selectedTask.vendorInfo.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedTask.vendorInfo.type}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedTask.vendorInfo.contact}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Assigned By
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">
                      {selectedTask.assignedBy.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedTask.assignedBy.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Touch-Optimized Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                {selectedTask.status === 'todo' && (
                  <button
                    onClick={() => {
                      updateTaskStatus(selectedTask.id, 'in_progress');
                      setSelectedTask(null);
                    }}
                    className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm min-h-[52px]"
                  >
                    Start Task
                  </button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => {
                        updateTaskStatus(selectedTask.id, 'review');
                        setSelectedTask(null);
                      }}
                      className="w-full px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm min-h-[52px]"
                    >
                      Submit for Review
                    </button>
                    <button
                      onClick={() => {
                        updateTaskStatus(selectedTask.id, 'completed');
                        setSelectedTask(null);
                      }}
                      className="w-full px-6 py-4 bg-success-600 hover:bg-success-700 text-white font-semibold rounded-xl transition-colors shadow-sm min-h-[52px]"
                    >
                      Mark Complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-3 px-2 text-primary-600 min-h-[56px]">
            <FileText className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Tasks</span>
          </button>
          <button className="flex flex-col items-center py-3 px-2 text-gray-500 hover:text-gray-700 min-h-[56px]">
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Schedule</span>
          </button>
          <button className="flex flex-col items-center py-3 px-2 text-gray-500 hover:text-gray-700 min-h-[56px]">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Reports</span>
          </button>
          <button className="flex flex-col items-center py-3 px-2 text-gray-500 hover:text-gray-700 min-h-[56px]">
            <User className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
