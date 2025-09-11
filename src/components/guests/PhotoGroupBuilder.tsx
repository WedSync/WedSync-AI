'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  Clock,
  MapPin,
  Camera,
  Users,
  Info,
} from 'lucide-react';
import { z } from 'zod';

// Components
import { GuestSelector } from './GuestSelector';

// Types
import {
  PhotoGroup,
  PhotoGroupFormData,
  PhotoGroupFormErrors,
  AvailableGuest,
  PhotoGroupConflict,
} from '@/types/photo-groups';

// Validation schema
const photoGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(200, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  photo_type: z.enum([
    'family',
    'friends',
    'bridal_party',
    'groomsmen',
    'bridesmaids',
    'children',
    'special',
    'formal',
    'candid',
  ]),
  estimated_time_minutes: z
    .number()
    .min(1, 'Time must be at least 1 minute')
    .max(120, 'Time cannot exceed 2 hours'),
  location: z.string().max(200, 'Location too long').optional(),
  timeline_slot: z.string().max(100, 'Timeline slot too long').optional(),
  photographer_notes: z.string().max(1000, 'Notes too long').optional(),
  guest_ids: z.array(z.string().uuid()).default([]),
});

// Photo type configurations
const PHOTO_TYPE_CONFIGS = [
  {
    type: 'family',
    label: 'Family Photos',
    icon: Users,
    color: 'blue',
    typical_duration: 15,
  },
  {
    type: 'friends',
    label: 'Friends Group',
    icon: Users,
    color: 'green',
    typical_duration: 10,
  },
  {
    type: 'bridal_party',
    label: 'Bridal Party',
    icon: Camera,
    color: 'pink',
    typical_duration: 20,
  },
  {
    type: 'groomsmen',
    label: 'Groomsmen',
    icon: Camera,
    color: 'indigo',
    typical_duration: 15,
  },
  {
    type: 'bridesmaids',
    label: 'Bridesmaids',
    icon: Camera,
    color: 'rose',
    typical_duration: 15,
  },
  {
    type: 'children',
    label: 'Children',
    icon: Users,
    color: 'yellow',
    typical_duration: 5,
  },
  {
    type: 'special',
    label: 'Special Moments',
    icon: Camera,
    color: 'purple',
    typical_duration: 10,
  },
  {
    type: 'formal',
    label: 'Formal Portraits',
    icon: Camera,
    color: 'gray',
    typical_duration: 25,
  },
  {
    type: 'candid',
    label: 'Candid Shots',
    icon: Camera,
    color: 'orange',
    typical_duration: 8,
  },
];

interface PhotoGroupBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PhotoGroupFormData) => Promise<void>;
  initialData?: PhotoGroup;
  availableGuests: AvailableGuest[];
  coupleId: string;
  conflicts?: PhotoGroupConflict[];
}

export function PhotoGroupBuilder({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  availableGuests,
  coupleId,
  conflicts = [],
}: PhotoGroupBuilderProps) {
  // Form state
  const [formData, setFormData] = useState<PhotoGroupFormData>({
    name: '',
    description: '',
    photo_type: 'family',
    estimated_time_minutes: 15,
    location: '',
    timeline_slot: '',
    photographer_notes: '',
    guest_ids: [],
  });

  const [errors, setErrors] = useState<PhotoGroupFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        photo_type: initialData.photo_type,
        estimated_time_minutes: initialData.estimated_time_minutes,
        location: initialData.location || '',
        timeline_slot: initialData.timeline_slot || '',
        photographer_notes: initialData.photographer_notes || '',
        guest_ids: initialData.assignments?.map((a) => a.guest_id) || [],
      });
      setSelectedGuestIds(
        initialData.assignments?.map((a) => a.guest_id) || [],
      );
    } else {
      // Reset form for new group
      setFormData({
        name: '',
        description: '',
        photo_type: 'family',
        estimated_time_minutes: 15,
        location: '',
        timeline_slot: '',
        photographer_notes: '',
        guest_ids: [],
      });
      setSelectedGuestIds([]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Update guest_ids when selection changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      guest_ids: selectedGuestIds,
    }));
  }, [selectedGuestIds]);

  // Get available guests (including currently assigned if editing)
  const selectableGuests = useMemo(() => {
    if (initialData) {
      // When editing, include all available guests plus currently assigned ones
      const currentlyAssignedIds = new Set(
        initialData.assignments?.map((a) => a.guest_id) || [],
      );
      return availableGuests.filter(
        (guest) =>
          !guest.assigned_groups.some(
            (groupId) =>
              groupId !== initialData.id && !currentlyAssignedIds.has(guest.id),
          ),
      );
    }
    return availableGuests;
  }, [availableGuests, initialData]);

  // Get photo type configuration
  const selectedTypeConfig = PHOTO_TYPE_CONFIGS.find(
    (config) => config.type === formData.photo_type,
  );

  // Handle form field changes
  const handleFieldChange = useCallback(
    (field: keyof PhotoGroupFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  // Handle photo type change with auto-duration
  const handlePhotoTypeChange = useCallback(
    (photoType: PhotoGroupFormData['photo_type']) => {
      const config = PHOTO_TYPE_CONFIGS.find((c) => c.type === photoType);
      setFormData((prev) => ({
        ...prev,
        photo_type: photoType,
        estimated_time_minutes:
          config?.typical_duration || prev.estimated_time_minutes,
      }));
    },
    [],
  );

  // Validation
  const validateForm = useCallback(() => {
    try {
      photoGroupSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: PhotoGroupFormErrors = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof PhotoGroupFormData;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        onClose();
      } catch (error) {
        console.error('Failed to save photo group:', error);
        setErrors({ general: 'Failed to save photo group. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit, onClose],
  );

  // Handle guest selection
  const handleGuestSelect = useCallback((guestId: string) => {
    setSelectedGuestIds((prev) => [...prev, guestId]);
  }, []);

  const handleGuestUnselect = useCallback((guestId: string) => {
    setSelectedGuestIds((prev) => prev.filter((id) => id !== guestId));
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {initialData ? 'Edit Photo Group' : 'New Photo Group'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Organize guests for efficient wedding photography
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Conflicts Warning */}
            {conflicts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-1">
                      Conflicts Detected
                    </h4>
                    {conflicts.map((conflict, index) => (
                      <p key={index} className="text-sm text-amber-700">
                        {conflict.message}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Group Details
                  </h3>

                  {/* Group Name */}
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Group Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleFieldChange('name', e.target.value)
                      }
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 ${
                        errors.name
                          ? 'border-red-300 focus:border-red-300'
                          : 'border-gray-300 focus:border-primary-300'
                      }`}
                      placeholder="e.g., Family Photos"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        handleFieldChange('description', e.target.value)
                      }
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 ${
                        errors.description
                          ? 'border-red-300 focus:border-red-300'
                          : 'border-gray-300 focus:border-primary-300'
                      }`}
                      placeholder="Describe this photo group..."
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Photo Type */}
                  <div className="space-y-2">
                    <label
                      htmlFor="photo_type"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Photo Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="photo_type"
                      value={formData.photo_type}
                      onChange={(e) =>
                        handlePhotoTypeChange(e.target.value as any)
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                    >
                      {PHOTO_TYPE_CONFIGS.map((config) => (
                        <option key={config.type} value={config.type}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                    {selectedTypeConfig && (
                      <p className="text-xs text-gray-500">
                        Typical duration: {selectedTypeConfig.typical_duration}{' '}
                        minutes
                      </p>
                    )}
                  </div>
                </div>

                {/* Logistics */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Logistics
                  </h4>

                  {/* Estimated Time */}
                  <div className="space-y-2 mb-4">
                    <label
                      htmlFor="estimated_time"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Estimated Time (minutes){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="estimated_time"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.estimated_time_minutes}
                      onChange={(e) =>
                        handleFieldChange(
                          'estimated_time_minutes',
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 ${
                        errors.estimated_time_minutes
                          ? 'border-red-300 focus:border-red-300'
                          : 'border-gray-300 focus:border-primary-300'
                      }`}
                    />
                    {errors.estimated_time_minutes && (
                      <p className="text-sm text-red-600">
                        {errors.estimated_time_minutes}
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-2 mb-4">
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700"
                    >
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    <input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        handleFieldChange('location', e.target.value)
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                      placeholder="e.g., Garden, Church steps"
                    />
                    {errors.location && (
                      <p className="text-sm text-red-600">{errors.location}</p>
                    )}
                  </div>

                  {/* Timeline Slot */}
                  <div className="space-y-2">
                    <label
                      htmlFor="timeline_slot"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Timeline Slot
                    </label>
                    <select
                      id="timeline_slot"
                      value={formData.timeline_slot}
                      onChange={(e) =>
                        handleFieldChange('timeline_slot', e.target.value)
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                    >
                      <option value="">Select timeline slot</option>
                      <option value="pre-ceremony">Pre-Ceremony</option>
                      <option value="ceremony-before">Before Ceremony</option>
                      <option value="ceremony-after">After Ceremony</option>
                      <option value="cocktail-hour">Cocktail Hour</option>
                      <option value="reception-before">Before Reception</option>
                      <option value="reception-during">During Reception</option>
                      <option value="reception-after">After Reception</option>
                    </select>
                  </div>
                </div>

                {/* Photographer Notes */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Photographer Notes
                  </h4>
                  <textarea
                    id="photographer_notes"
                    rows={4}
                    value={formData.photographer_notes}
                    onChange={(e) =>
                      handleFieldChange('photographer_notes', e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                    placeholder="Special instructions, poses, or requirements for the photographer..."
                  />
                  {errors.photographer_notes && (
                    <p className="text-sm text-red-600">
                      {errors.photographer_notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Guest Assignment */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Assign Guests
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select guests to include in this photo group
                  </p>

                  {selectedGuestIds.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-green-800">
                        {selectedGuestIds.length} guest
                        {selectedGuestIds.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg max-h-96">
                    <GuestSelector
                      availableGuests={selectableGuests}
                      selectedGuestIds={selectedGuestIds}
                      onGuestSelect={handleGuestSelect}
                      onGuestUnselect={handleGuestUnselect}
                      searchPlaceholder="Search guests to assign..."
                      showCheckboxes={true}
                      groupByCategory={true}
                      allowDragDrop={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedGuestIds.length} guest
                {selectedGuestIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Saving...' : 'Save Group'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PhotoGroupBuilder;
