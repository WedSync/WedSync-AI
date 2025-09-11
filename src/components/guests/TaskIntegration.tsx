'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Guest } from '@/types/guest-management';
import {
  ClipboardDocumentListIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/20/solid';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  deadline: string;
  assigned_to?: string;
  assigned_user_name?: string;
  estimated_duration: number;
  wedding_id: string;
  created_at: string;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_duration: number;
}

interface TaskIntegrationProps {
  selectedGuests: Guest[];
  onTaskAssigned?: (guestId: string, taskId: string) => void;
  coupleId: string;
  weddingId: string;
}

const TASK_CATEGORIES = [
  {
    value: 'venue_management',
    label: 'Venue Management',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'vendor_coordination',
    label: 'Vendor Coordination',
    color: 'bg-green-100 text-green-800',
  },
  {
    value: 'guest_services',
    label: 'Guest Services',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    value: 'logistics',
    label: 'Logistics',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    value: 'ceremony_setup',
    label: 'Ceremony Setup',
    color: 'bg-pink-100 text-pink-800',
  },
  {
    value: 'reception_setup',
    label: 'Reception Setup',
    color: 'bg-indigo-100 text-indigo-800',
  },
  {
    value: 'photography',
    label: 'Photography',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'entertainment',
    label: 'Entertainment',
    color: 'bg-red-100 text-red-800',
  },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'template-1',
    title: 'Pick up flowers from florist',
    description: 'Collect bridal bouquet and ceremony arrangements',
    category: 'vendor_coordination',
    priority: 'high',
    estimated_duration: 1,
  },
  {
    id: 'template-2',
    title: 'Set up ceremony seating',
    description: 'Arrange chairs and decorations for ceremony space',
    category: 'ceremony_setup',
    priority: 'medium',
    estimated_duration: 2,
  },
  {
    id: 'template-3',
    title: 'Coordinate guest transportation',
    description: 'Ensure guests have transportation to venue',
    category: 'guest_services',
    priority: 'medium',
    estimated_duration: 1,
  },
  {
    id: 'template-4',
    title: 'Manage gift table',
    description: 'Set up and oversee gift collection area',
    category: 'reception_setup',
    priority: 'low',
    estimated_duration: 1,
  },
];

export function TaskIntegration({
  selectedGuests,
  onTaskAssigned,
  coupleId,
  weddingId,
}: TaskIntegrationProps) {
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [assigningTasks, setAssigningTasks] = useState<Set<string>>(new Set());

  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'guest_services',
    priority: 'medium' as const,
    deadline: '',
    estimated_duration: 1,
  });

  // Fetch existing tasks assigned to selected guests
  useEffect(() => {
    if (selectedGuests.length > 0) {
      fetchExistingTasks();
    }
  }, [selectedGuests]);

  const fetchExistingTasks = async () => {
    setLoading(true);
    try {
      const guestIds = selectedGuests.map((guest) => guest.id);
      const response = await fetch(
        `/api/tasks/analytics?guest_ids=${guestIds.join(',')}`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setExistingTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing tasks:', error);
    }
    setLoading(false);
  };

  const handleAssignTask = async (
    taskTemplate: TaskTemplate,
    guestIds?: string[],
  ) => {
    const targetGuests = guestIds || selectedGuests.map((g) => g.id);
    setAssigningTasks(new Set([taskTemplate.id]));

    try {
      // Create tasks for each selected guest
      const taskPromises = targetGuests.map((guestId) => {
        const guest = selectedGuests.find((g) => g.id === guestId);
        return fetch('/api/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bulk_import',
            data: {
              tasks: [
                {
                  ...taskTemplate,
                  title: `${taskTemplate.title} (${guest?.first_name} ${guest?.last_name})`,
                  assigned_to: guestId,
                  wedding_id: weddingId,
                  deadline:
                    newTask.deadline ||
                    new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000,
                    ).toISOString(),
                },
              ],
              wedding_id: weddingId,
            },
          }),
        });
      });

      const results = await Promise.all(taskPromises);
      const allSuccessful = results.every((r) => r.ok);

      if (allSuccessful) {
        await fetchExistingTasks();
        targetGuests.forEach((guestId) => {
          onTaskAssigned?.(guestId, taskTemplate.id);
        });
      }
    } catch (error) {
      console.error('Failed to assign tasks:', error);
    }

    setAssigningTasks(new Set());
  };

  const handleCreateAndAssignTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_import',
          data: {
            tasks: selectedGuests.map((guest) => ({
              ...newTask,
              title: `${newTask.title} (${guest.first_name} ${guest.last_name})`,
              assigned_to: guest.id,
              wedding_id: weddingId,
              deadline:
                newTask.deadline ||
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })),
            wedding_id: weddingId,
          },
        }),
      });

      if (response.ok) {
        await fetchExistingTasks();
        setShowCreateTask(false);
        setNewTask({
          title: '',
          description: '',
          category: 'guest_services',
          priority: 'medium',
          deadline: '',
          estimated_duration: 1,
        });
      }
    } catch (error) {
      console.error('Failed to create and assign task:', error);
    }
  };

  const handleBulkStatusUpdate = async (status: Task['status']) => {
    const taskIds = existingTasks.map((task) => task.id);

    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_operation',
          data: {
            task_ids: taskIds,
            operation: { type: 'status', value: status },
          },
        }),
      });

      if (response.ok) {
        await fetchExistingTasks();
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    const config = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return (
      <Badge className={`${config?.color} text-xs`}>{config?.label}</Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const config = TASK_CATEGORIES.find((c) => c.value === category);
    return (
      <Badge className={`${config?.color} text-xs`}>{config?.label}</Badge>
    );
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-success-600" />;
      case 'in_progress':
        return <ClockIcon className="w-4 h-4 text-warning-600" />;
      case 'todo':
        return <ClipboardDocumentListIcon className="w-4 h-4 text-gray-600" />;
      default:
        return <ClipboardDocumentListIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const taskStats = {
    total: existingTasks.length,
    completed: existingTasks.filter((t) => t.status === 'completed').length,
    in_progress: existingTasks.filter((t) => t.status === 'in_progress').length,
    todo: existingTasks.filter((t) => t.status === 'todo').length,
  };

  if (selectedGuests.length === 0) {
    return (
      <Card className="p-6 text-center">
        <ClipboardDocumentListIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Select guests to assign tasks and coordinate wedding helpers
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {taskStats.total}
            </div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-success-600">
              {taskStats.completed}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning-600">
              {taskStats.in_progress}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {taskStats.todo}
            </div>
            <div className="text-sm text-gray-600">To Do</div>
          </div>
        </div>
      </Card>

      {/* Task Templates */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Task Assignment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {TASK_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{template.title}</h4>
                {getPriorityBadge(template.priority)}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {template.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(template.category)}
                  <Badge variant="outline" className="text-xs">
                    {template.estimated_duration}h
                  </Badge>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAssignTask(template)}
                  disabled={assigningTasks.has(template.id)}
                  className="text-xs px-3 py-1"
                >
                  {assigningTasks.has(template.id) ? (
                    'Assigning...'
                  ) : (
                    <>
                      <UserGroupIcon className="w-3 h-3 mr-1" />
                      Assign to {selectedGuests.length}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowCreateTask(!showCreateTask)}
          className="w-full"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Custom Task
        </Button>
      </Card>

      {/* Create Custom Task */}
      {showCreateTask && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Create Custom Task
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title
              </label>
              <Input
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Enter task title..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Enter task description..."
                rows={3}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newTask.category}
                  onChange={(e) =>
                    setNewTask({ ...newTask, category: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                >
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      priority: e.target.value as Task['priority'],
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (hours)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newTask.estimated_duration}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      estimated_duration: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <Input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) =>
                  setNewTask({ ...newTask, deadline: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateTask(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAndAssignTask}
                disabled={!newTask.title.trim()}
              >
                Create & Assign to {selectedGuests.length} Guest
                {selectedGuests.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Existing Tasks */}
      {existingTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Assigned Tasks
            </h3>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('in_progress')}
              >
                Mark In Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('completed')}
              >
                Mark Completed
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse border border-gray-200 rounded-lg p-3"
                  >
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              existingTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(task.status)}
                        <h4 className="font-medium text-gray-900">
                          {task.title}
                        </h4>
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {task.assigned_user_name && (
                          <span>Assigned to: {task.assigned_user_name}</span>
                        )}
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {task.estimated_duration && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {task.estimated_duration}h
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {getPriorityBadge(task.priority)}
                      {getCategoryBadge(task.category)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Real-time Updates Notice */}
      <div className="text-center text-sm text-gray-600">
        <p>
          Task assignments sync in real-time with the main task management
          system
        </p>
      </div>
    </div>
  );
}
