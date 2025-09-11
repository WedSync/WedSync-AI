'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, parseISO, addMinutes } from 'date-fns';
import {
  X,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Cloud,
  Lock,
  Unlock,
  Palette,
  FileText,
  Calendar,
  Save,
  Trash2,
} from 'lucide-react';
import type {
  TimelineEvent,
  WeddingTimeline,
  EventType,
  EventCategory,
  EventPriority,
  EventStatus,
} from '@/types/timeline';

interface TimelineEventFormProps {
  event?: TimelineEvent | null;
  timeline: WeddingTimeline;
  onSave: (eventData: Partial<TimelineEvent>) => void;
  onClose: () => void;
  onDelete?: (eventId: string) => void;
}

const eventTypes: { value: EventType; label: string; icon: string }[] = [
  { value: 'ceremony', label: 'Ceremony', icon: '💒' },
  { value: 'reception', label: 'Reception', icon: '🎉' },
  { value: 'photos', label: 'Photography', icon: '📸' },
  { value: 'preparation', label: 'Preparation', icon: '💄' },
  { value: 'cocktails', label: 'Cocktail Hour', icon: '🍸' },
  { value: 'dinner', label: 'Dinner', icon: '🍽️' },
  { value: 'dancing', label: 'Dancing', icon: '💃' },
  { value: 'setup', label: 'Setup', icon: '🔧' },
  { value: 'breakdown', label: 'Breakdown', icon: '📦' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const eventCategories: { value: EventCategory; label: string }[] = [
  { value: 'preparation', label: 'Preparation' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'cocktails', label: 'Cocktails' },
  { value: 'reception', label: 'Reception' },
  { value: 'party', label: 'Party' },
  { value: 'logistics', label: 'Logistics' },
];

const priorities: { value: EventPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-yellow-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
];

const statusOptions: { value: EventStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'delayed', label: 'Delayed' },
];

const colorOptions = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#EC4899',
  '#6B7280',
];

export function TimelineEventForm({
  event,
  timeline,
  onSave,
  onClose,
  onDelete,
}: TimelineEventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || ('other' as EventType),
    category: event?.category || ('preparation' as EventCategory),
    start_time: event?.start_time || new Date().toISOString(),
    end_time: event?.end_time || addMinutes(new Date(), 60).toISOString(),
    location: event?.location || '',
    location_details: event?.location_details || '',
    priority: event?.priority || ('medium' as EventPriority),
    status: event?.status || ('pending' as EventStatus),
    is_locked: event?.is_locked || false,
    is_flexible: event?.is_flexible || false,
    weather_dependent: event?.weather_dependent || false,
    backup_plan: event?.backup_plan || '',
    color: event?.color || colorOptions[0],
    internal_notes: event?.internal_notes || '',
    vendor_notes: event?.vendor_notes || '',
    buffer_before_minutes: event?.buffer_before_minutes || 0,
    buffer_after_minutes: event?.buffer_after_minutes || 0,
    min_duration_minutes: event?.min_duration_minutes || 15,
    max_duration_minutes: event?.max_duration_minutes || 480,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }

    if (formData.start_time && formData.end_time) {
      const start = parseISO(formData.start_time);
      const end = parseISO(formData.end_time);

      if (end <= start) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;

    if (confirm('Are you sure you want to delete this event?')) {
      await onDelete(event.id);
      onClose();
    }
  };

  const calculateDuration = () => {
    if (formData.start_time && formData.end_time) {
      const start = parseISO(formData.start_time);
      const end = parseISO(formData.end_time);
      const minutes = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60),
      );
      return minutes;
    }
    return 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {event ? 'Edit Event' : 'Create New Event'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {timeline.name} •{' '}
                {format(parseISO(timeline.wedding_date), 'MMM d, yyyy')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500',
                      errors.title ? 'border-red-500' : 'border-gray-300',
                    )}
                    placeholder="Enter event title"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        event_type: e.target.value as EventType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {eventTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as EventCategory,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {eventCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as EventPriority,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe the event details..."
                />
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Timing</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time.slice(0, 16)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        start_time: e.target.value + ':00.000Z',
                      })
                    }
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500',
                      errors.start_time ? 'border-red-500' : 'border-gray-300',
                    )}
                  />
                  {errors.start_time && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.start_time}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time.slice(0, 16)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        end_time: e.target.value + ':00.000Z',
                      })
                    }
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500',
                      errors.end_time ? 'border-red-500' : 'border-gray-300',
                    )}
                  />
                  {errors.end_time && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.end_time}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-gray-600">
                      {calculateDuration()} minutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buffer Before (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.buffer_before_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buffer_before_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buffer After (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.buffer_after_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buffer_after_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max="120"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Location</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Main Ballroom, Garden Gazebo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as EventStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Details
                </label>
                <textarea
                  value={formData.location_details}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location_details: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Additional location details, setup instructions, etc."
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_locked}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_locked: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Lock event (prevent dragging)
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_flexible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_flexible: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Flexible timing
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.weather_dependent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weather_dependent: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Cloud className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Weather dependent
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          'w-8 h-8 rounded-lg border-2 transition-all',
                          formData.color === color
                            ? 'border-gray-400 scale-110'
                            : 'border-transparent',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {formData.weather_dependent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Plan
                  </label>
                  <textarea
                    value={formData.backup_plan}
                    onChange={(e) =>
                      setFormData({ ...formData, backup_plan: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe the backup plan for bad weather..."
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Notes</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internal_notes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Private notes for planners only..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Notes
                  </label>
                  <textarea
                    value={formData.vendor_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Notes visible to assigned vendors..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-xl">
            <div className="flex items-center gap-2">
              {event && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSubmitting
                  ? 'Saving...'
                  : event
                    ? 'Update Event'
                    : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
