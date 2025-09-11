'use client';

import React, { useState } from 'react';
import { TaskCategory, TaskPriority, TaskCreateInput } from '@/types/workflow';
import { Calendar, Clock, User, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCreateFormProps {
  weddingId: string;
  teamMembers: {
    id: string;
    name: string;
    email: string;
    role: string;
    specialties: TaskCategory[];
  }[];
  availableTasks?: {
    id: string;
    title: string;
    category: TaskCategory;
  }[];
  onSubmit: (task: TaskCreateInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const categories: { value: TaskCategory; label: string }[] = [
  { value: 'venue_management', label: 'Venue Management' },
  { value: 'vendor_coordination', label: 'Vendor Coordination' },
  { value: 'client_management', label: 'Client Management' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'design', label: 'Design' },
  { value: 'photography', label: 'Photography' },
  { value: 'catering', label: 'Catering' },
  { value: 'florals', label: 'Florals' },
  { value: 'music', label: 'Music' },
  { value: 'transportation', label: 'Transportation' },
];

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const dependencyTypes = [
  { value: 'finish_to_start', label: 'Finish to Start' },
  { value: 'start_to_start', label: 'Start to Start' },
  { value: 'finish_to_finish', label: 'Finish to Finish' },
  { value: 'start_to_finish', label: 'Start to Finish' },
];

export function TaskCreateForm({
  weddingId,
  teamMembers,
  availableTasks = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TaskCreateFormProps) {
  const [formData, setFormData] = useState<Partial<TaskCreateInput>>({
    wedding_id: weddingId,
    priority: 'medium',
    estimated_duration: 2,
    buffer_time: 0,
    dependencies: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    }

    if (!formData.estimated_duration || formData.estimated_duration <= 0) {
      newErrors.estimated_duration = 'Duration must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData as TaskCreateInput);
  };

  const addDependency = () => {
    setFormData((prev) => ({
      ...prev,
      dependencies: [
        ...(prev.dependencies || []),
        {
          predecessor_task_id: '',
          dependency_type: 'finish_to_start' as const,
          lag_time: 0,
        },
      ],
    }));
  };

  const removeDependency = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      dependencies: prev.dependencies?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateDependency = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      dependencies:
        prev.dependencies?.map((dep, i) =>
          i === index ? { ...dep, [field]: value } : dep,
        ) || [],
    }));
  };

  // Filter team members by category speciality
  const filteredTeamMembers = formData.category
    ? teamMembers.filter(
        (member) =>
          member.specialties.includes(formData.category!) ||
          member.role === 'admin' ||
          member.role === 'planner',
      )
    : teamMembers;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Create New Task</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add a new task to the wedding workflow
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            className={`
              w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900 placeholder-gray-500
              shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
              transition-all duration-200 ${errors.title ? 'border-red-300' : 'border-gray-300'}
            `}
            placeholder="e.g., Engagement photo shoot at venue"
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="
              w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
              text-gray-900 placeholder-gray-500 shadow-xs
              focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
              transition-all duration-200
            "
            placeholder="Detailed description of the task..."
          />
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  category: e.target.value as TaskCategory,
                  assigned_to: undefined, // Reset assignee when category changes
                }))
              }
              className={`
                w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900
                shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                transition-all duration-200 ${errors.category ? 'border-red-300' : 'border-gray-300'}
              `}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority || 'medium'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: e.target.value as TaskPriority,
                }))
              }
              className="
                w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100
                focus:border-primary-300 transition-all duration-200
              "
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign To
          </label>
          <select
            value={formData.assigned_to || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                assigned_to: e.target.value || undefined,
              }))
            }
            className="
              w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
              text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100
              focus:border-primary-300 transition-all duration-200
            "
          >
            <option value="">Assign later</option>
            {filteredTeamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
          {formData.category && filteredTeamMembers.length === 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              No team members specialize in this category
            </p>
          )}
        </div>

        {/* Duration and Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (hours) *
            </label>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={formData.estimated_duration || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  estimated_duration: parseFloat(e.target.value),
                }))
              }
              className={`
                w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900
                shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                transition-all duration-200 ${errors.estimated_duration ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {errors.estimated_duration && (
              <p className="text-sm text-red-600 mt-1">
                {errors.estimated_duration}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Time (hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.25"
              value={formData.buffer_time || 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  buffer_time: parseFloat(e.target.value) || 0,
                }))
              }
              className="
                w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100
                focus:border-primary-300 transition-all duration-200
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline *
            </label>
            <input
              type="datetime-local"
              value={formData.deadline || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, deadline: e.target.value }))
              }
              className={`
                w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900
                shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                transition-all duration-200 ${errors.deadline ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {errors.deadline && (
              <p className="text-sm text-red-600 mt-1">{errors.deadline}</p>
            )}
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Dependencies
            </label>
            <button
              type="button"
              onClick={addDependency}
              className="
                inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-700
                bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100
                transition-colors duration-200
              "
              disabled={availableTasks.length === 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Dependency
            </button>
          </div>

          {formData.dependencies && formData.dependencies.length > 0 && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              {formData.dependencies.map((dep, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={dep.predecessor_task_id}
                    onChange={(e) =>
                      updateDependency(
                        index,
                        'predecessor_task_id',
                        e.target.value,
                      )
                    }
                    className="
                      flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg
                      text-sm focus:outline-none focus:ring-2 focus:ring-primary-100
                    "
                  >
                    <option value="">Select task</option>
                    {availableTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={dep.dependency_type}
                    onChange={(e) =>
                      updateDependency(index, 'dependency_type', e.target.value)
                    }
                    className="
                      px-3 py-2 bg-white border border-gray-300 rounded-lg
                      text-sm focus:outline-none focus:ring-2 focus:ring-primary-100
                    "
                  >
                    {dependencyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    value={dep.lag_time}
                    onChange={(e) =>
                      updateDependency(
                        index,
                        'lag_time',
                        parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="Lag (hours)"
                    className="
                      w-24 px-3 py-2 bg-white border border-gray-300 rounded-lg
                      text-sm focus:outline-none focus:ring-2 focus:ring-primary-100
                    "
                  />

                  <button
                    type="button"
                    onClick={() => removeDependency(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {availableTasks.length === 0 && (
            <p className="text-sm text-gray-500">
              No existing tasks available for dependencies
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="
              px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
              rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100
              transition-all duration-200
            "
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              px-4 py-2.5 text-sm font-semibold text-white bg-primary-600
              hover:bg-primary-700 rounded-lg shadow-xs hover:shadow-sm
              focus:outline-none focus:ring-4 focus:ring-primary-100
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
