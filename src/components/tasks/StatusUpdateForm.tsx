'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Camera,
  X,
  Upload,
  FileImage,
  Loader2,
} from 'lucide-react';

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  progress: z.number().min(0).max(100),
  notes: z.string().max(500).optional(),
  photoEvidence: z.array(z.string()).max(5).optional(),
  blockedReason: z.string().max(200).optional(),
  estimatedCompletion: z.string().optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

interface StatusUpdateFormProps {
  taskId: string;
  currentStatus:
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'overdue'
    | 'blocked';
  currentProgress: number;
  currentNotes?: string;
  onSubmit: (data: StatusUpdateFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const statusOptions = [
  {
    value: 'pending' as const,
    label: 'Pending',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    description: 'Task not yet started',
  },
  {
    value: 'in_progress' as const,
    label: 'In Progress',
    icon: AlertCircle,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    description: 'Currently working on this task',
  },
  {
    value: 'completed' as const,
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    description: 'Task finished successfully',
  },
  {
    value: 'blocked' as const,
    label: 'Blocked',
    icon: XCircle,
    color: 'text-error-600',
    bgColor: 'bg-error-50',
    description: 'Cannot proceed due to dependencies',
  },
];

export function StatusUpdateForm({
  taskId,
  currentStatus,
  currentProgress,
  currentNotes = '',
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = '',
}: StatusUpdateFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      status: currentStatus === 'overdue' ? 'pending' : currentStatus,
      progress: currentProgress,
      notes: currentNotes,
      photoEvidence: [],
      blockedReason: '',
      estimatedCompletion: '',
    },
    mode: 'onChange',
  });

  const watchedStatus = watch('status');
  const watchedProgress = watch('progress');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length + uploadedFiles.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }

    const newFiles = [...uploadedFiles, ...validFiles];
    setUploadedFiles(newFiles);

    // Generate previews
    const newPreviews = [...uploadPreviews];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        setUploadPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newPreviews = uploadPreviews.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setUploadPreviews(newPreviews);
  };

  const onFormSubmit = async (data: StatusUpdateFormData) => {
    try {
      // Upload photos first if any
      const photoUrls: string[] = [];

      if (uploadedFiles.length > 0) {
        // Simulate photo upload - in real implementation, upload to Supabase Storage
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          // Create a mock URL for demo - replace with actual Supabase upload
          const mockUrl = `https://storage.supabase.com/task-evidence/${taskId}_${Date.now()}_${i}.jpg`;
          photoUrls.push(mockUrl);
        }
      }

      const submitData = {
        ...data,
        photoEvidence: photoUrls.length > 0 ? photoUrls : undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Failed to submit status update:', error);
    }
  };

  // Auto-adjust progress based on status
  React.useEffect(() => {
    if (watchedStatus === 'pending' && watchedProgress > 0) {
      setValue('progress', 0);
    } else if (watchedStatus === 'completed' && watchedProgress < 100) {
      setValue('progress', 100);
    }
  }, [watchedStatus, watchedProgress, setValue]);

  const selectedStatusOption = statusOptions.find(
    (option) => option.value === watchedStatus,
  );

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Update Task Status
        </h3>
        <p className="text-sm text-gray-600">
          Update the progress and status of this task. Add photos as evidence of
          completion.
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Status Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Task Status
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = watchedStatus === option.value;

              return (
                <label
                  key={option.value}
                  className={`
                    relative flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200
                    ${
                      isSelected
                        ? 'border-primary-300 bg-primary-25 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('status')}
                    className="sr-only"
                  />
                  <div className={`p-2 rounded-lg mr-3 ${option.bgColor}`}>
                    <Icon className={`w-5 h-5 ${option.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {option.label}
                      </span>
                      {isSelected && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          {errors.status && (
            <p className="mt-1 text-sm text-error-600">
              {errors.status.message}
            </p>
          )}
        </div>

        {/* Progress Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Progress: {watchedProgress}%
          </label>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              {...register('progress', { valueAsNumber: true })}
              disabled={watchedStatus === 'completed'}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div
              className="absolute top-0 left-0 h-2 bg-primary-500 rounded-lg pointer-events-none transition-all duration-300"
              style={{ width: `${watchedProgress}%` }}
            />
          </div>
          {errors.progress && (
            <p className="mt-1 text-sm text-error-600">
              {errors.progress.message}
            </p>
          )}
        </div>

        {/* Blocked Reason (conditional) */}
        {watchedStatus === 'blocked' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Blocking <span className="text-error-500">*</span>
            </label>
            <textarea
              {...register('blockedReason', {
                required:
                  watchedStatus === 'blocked'
                    ? 'Please explain why this task is blocked'
                    : false,
              })}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              placeholder="Describe what's preventing you from completing this task..."
            />
            {errors.blockedReason && (
              <p className="mt-1 text-sm text-error-600">
                {errors.blockedReason.message}
              </p>
            )}
          </div>
        )}

        {/* Estimated Completion (for in-progress tasks) */}
        {watchedStatus === 'in_progress' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Completion Date
            </label>
            <input
              type="date"
              {...register('estimatedCompletion')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes & Updates
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
            placeholder="Add any additional notes, updates, or details about your progress..."
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-error-600">
              {errors.notes.message}
            </p>
          )}
        </div>

        {/* Photo Evidence Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo Evidence
            <span className="text-gray-500 font-normal ml-1">
              (Optional, max 5 photos)
            </span>
          </label>

          {/* Upload Button */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-300 transition-colors duration-200">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Upload photos to show your progress
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Photos
            </button>
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG up to 5MB each
            </p>
          </div>

          {/* Photo Previews */}
          {uploadPreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {uploadPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 p-1 bg-error-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded">
                    {Math.round(uploadedFiles[index]?.size / 1024)}KB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </button>
        </div>
      </form>

      {/* Selected Status Preview */}
      {selectedStatusOption && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <selectedStatusOption.icon
              className={`w-5 h-5 ${selectedStatusOption.color}`}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Status will be updated to: {selectedStatusOption.label}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Progress: {watchedProgress}% • {uploadPreviews.length} photo(s)
                attached
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusUpdateForm;
