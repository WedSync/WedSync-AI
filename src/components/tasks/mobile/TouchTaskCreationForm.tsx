'use client';

import React, { useState, useCallback } from 'react';
import { TouchInput, TouchTextarea, TouchSelect } from '@/components/touch';
import { TaskTemplate, TaskPriority, TaskCategory } from '@/types/tasks';
import { validateTaskInput } from '@/lib/validations/wedding-forms';

interface TouchTaskCreationFormProps {
  onTaskCreate: (task: TaskInput) => Promise<void>;
  templates?: TaskTemplate[];
  isOffline?: boolean;
  onCancel?: () => void;
}

interface TaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate?: string;
  estimatedDuration?: number;
  attachments: File[];
}

export const TouchTaskCreationForm: React.FC<TouchTaskCreationFormProps> = ({
  onTaskCreate,
  templates = [],
  isOffline = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<TaskInput>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'planning',
    attachments: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Validate form
      const validation = validateTaskInput(formData);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }

      setIsSubmitting(true);
      setValidationErrors({});

      try {
        await onTaskCreate(formData);

        // Success haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        // Reset form
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          category: 'planning',
          attachments: [],
        });
      } catch (error) {
        // Error haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        setValidationErrors({
          submit: 'Failed to create task. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onTaskCreate],
  );

  return (
    <form onSubmit={handleSubmit} className="touch-task-form">
      <div className="space-y-6 p-4">
        {/* Title Field */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Task Title *
          </label>
          <TouchInput
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="What needs to be done?"
            size="lg"
            variant={validationErrors.title ? 'error' : 'default'}
            haptic
            required
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.title}
            </p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description
          </label>
          <TouchTextarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Add details about this task..."
            rows={3}
            variant={validationErrors.description ? 'error' : 'default'}
            haptic
          />
          {validationErrors.description && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.description}
            </p>
          )}
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(
              (priority) => (
                <button
                  key={priority}
                  type="button"
                  className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all touch-manipulation ${
                    formData.priority === priority
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                  style={{ minHeight: '44px' }}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, priority }));
                    if ('vibrate' in navigator) navigator.vibrate(30);
                  }}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Category
          </label>
          <TouchSelect
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                category: e.target.value as TaskCategory,
              }))
            }
            haptic
          >
            <option value="planning">Planning</option>
            <option value="detail">Details</option>
            <option value="final">Final Preparations</option>
            <option value="custom">Custom</option>
          </TouchSelect>
        </div>

        {/* Due Date */}
        <div>
          <label
            htmlFor="dueDate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Due Date
          </label>
          <TouchInput
            id="dueDate"
            type="date"
            value={formData.dueDate || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
            }
            size="lg"
            haptic
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-3 px-4 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-4 touch-manipulation ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-100'
            }`}
            style={{ minHeight: '48px' }}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {isOffline ? 'Saving...' : 'Creating...'}
              </div>
            ) : isOffline ? (
              'Save Offline'
            ) : (
              'Create Task'
            )}
          </button>
        </div>

        {/* Offline Indicator */}
        {isOffline && (
          <div className="text-center text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
            📱 Working offline - Task will sync when online
          </div>
        )}

        {/* General Error */}
        {validationErrors.submit && (
          <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {validationErrors.submit}
          </div>
        )}
      </div>
    </form>
  );
};
