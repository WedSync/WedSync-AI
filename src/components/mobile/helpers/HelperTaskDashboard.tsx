'use client';

// Mobile Helper Task Dashboard Component
// WS-058: Mobile interface for task helpers

import React, { useState, useEffect } from 'react';
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
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  upcoming: number;
}

export default function HelperTaskDashboard() {
  const [tasks, setTasks] = useState<HelperTask[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    upcoming: 0,
  });
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>(
    'all',
  );
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<HelperTask | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    loadHelperTasks();
    setupRealtimeSubscription();
  }, [filter]);

  const loadHelperTasks = async () => {
    try {
      setLoading(true);

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

      // Transform data
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
        })) || [];

      setTasks(transformedTasks);
      calculateStats(transformedTasks);
    } catch (error) {
      console.error('Error loading helper tasks:', error);
    } finally {
      setLoading(false);
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
    };
    setStats(stats);
  };

  const setupRealtimeSubscription = () => {
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
      const { error } = await supabase
        .from('workflow_tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus as any } : task,
        ),
      );

      // Recalculate stats
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus as any } : task,
      );
      calculateStats(updatedTasks);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'review':
        return <FileText className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
            <Bell className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.upcoming}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'today', 'week', 'overdue'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === filterOption
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="px-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="bg-white rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(task.status)}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {task.description}
                  </p>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {task.deadline.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{task.wedding.coupleName}</span>
                    </div>
                    {task.budgetImpact && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <BarChart3 className="w-3 h-3" />
                        <span>
                          Budget: ${task.budgetImpact.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3">
                    {task.status === 'todo' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, 'in_progress');
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg"
                      >
                        Start
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, 'completed');
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Task Details</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  {selectedTask.title}
                </h3>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Priority</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}
                  >
                    {selectedTask.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedTask.status)}
                    <span className="text-sm font-medium">
                      {selectedTask.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Wedding</p>
                  <p className="font-medium">
                    {selectedTask.wedding.coupleName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedTask.wedding.date.toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Deadline</p>
                  <p className="font-medium">
                    {selectedTask.deadline.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Estimated Duration
                  </p>
                  <p className="font-medium">
                    {selectedTask.estimatedDuration} hours
                  </p>
                </div>

                {selectedTask.budgetImpact && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Budget Impact</p>
                    <p className="font-medium">
                      ${selectedTask.budgetImpact.toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedTask.vendorInfo && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Vendor</p>
                    <p className="font-medium">
                      {selectedTask.vendorInfo.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedTask.vendorInfo.type}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedTask.vendorInfo.contact}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500 mb-1">Assigned By</p>
                  <p className="font-medium">{selectedTask.assignedBy.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedTask.assignedBy.email}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {selectedTask.status === 'todo' && (
                  <button
                    onClick={() => {
                      updateTaskStatus(selectedTask.id, 'in_progress');
                      setSelectedTask(null);
                    }}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
                  >
                    Start Task
                  </button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => {
                        updateTaskStatus(selectedTask.id, 'review');
                        setSelectedTask(null);
                      }}
                      className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium"
                    >
                      Submit for Review
                    </button>
                    <button
                      onClick={() => {
                        updateTaskStatus(selectedTask.id, 'completed');
                        setSelectedTask(null);
                      }}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium"
                    >
                      Mark Complete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-2 text-indigo-600">
            <FileText className="w-6 h-6" />
            <span className="text-xs mt-1">Tasks</span>
          </button>
          <button className="flex flex-col items-center py-2 text-gray-600">
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Schedule</span>
          </button>
          <button className="flex flex-col items-center py-2 text-gray-600">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs mt-1">Reports</span>
          </button>
          <button className="flex flex-col items-center py-2 text-gray-600">
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
