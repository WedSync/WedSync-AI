'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  XIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  CameraIcon,
  MicIcon,
  SaveIcon,
  UserPlusIcon,
  CalendarIcon,
  MapPinIcon,
  FileTextIcon,
  ImageIcon,
  PlayIcon,
  StopCircleIcon,
  TrashIcon,
} from 'lucide-react';
import { TouchInput, TouchTextarea, TouchSelect } from '@/components/touch';
import { BottomSheet } from '@/components/mobile/MobileEnhancedFeatures';
import { useHapticFeedback } from '@/components/mobile/MobileEnhancedFeatures';
import { PhotoCaptureInterface } from './PhotoCaptureInterface';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

interface MobileStatusUpdateModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  canEdit?: boolean;
  securityLevel?: 'high' | 'medium' | 'low';
}

interface FormData {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  notes: string;
  dueDate: string;
  estimatedTime: string;
  venue: string;
}

export function MobileStatusUpdateModal({
  task,
  isOpen,
  onClose,
  onSave,
  onComplete,
  canEdit = true,
  securityLevel = 'medium',
}: MobileStatusUpdateModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    notes: task.notes || '',
    dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
    estimatedTime: task.estimatedTime || '',
    venue: task.venue || '',
  });

  const [photos, setPhotos] = useState<string[]>(task.photos || []);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const haptic = useHapticFeedback();

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      formData.title !== task.title ||
      formData.description !== task.description ||
      formData.status !== task.status ||
      formData.priority !== task.priority ||
      formData.notes !== (task.notes || '') ||
      formData.dueDate !==
        (task.dueDate ? task.dueDate.toISOString().split('T')[0] : '') ||
      formData.estimatedTime !== (task.estimatedTime || '') ||
      formData.venue !== (task.venue || '') ||
      photos.length !== (task.photos || []).length;

    setHasUnsavedChanges(hasChanges);
  }, [formData, photos, task]);

  // Handle form field updates
  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      haptic.light();
    },
    [haptic],
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (!canEdit || isSaving) return;

    setIsSaving(true);
    haptic.medium();

    try {
      const updates: Partial<Task> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        notes: formData.notes.trim(),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        estimatedTime: formData.estimatedTime.trim() || undefined,
        venue: formData.venue.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      };

      await onSave(task.id, updates);
      haptic.success();
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      haptic.error();
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [formData, photos, task.id, onSave, onClose, canEdit, isSaving, haptic]);

  // Handle complete
  const handleComplete = useCallback(async () => {
    if (!canEdit || isSaving) return;

    const confirmed = confirm('Mark this task as completed?');
    if (!confirmed) return;

    setIsSaving(true);
    haptic.medium();

    try {
      await onComplete(task.id);
      haptic.success();
      onClose();
    } catch (error) {
      console.error('Failed to complete task:', error);
      haptic.error();
      alert('Failed to complete task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [task.id, onComplete, onClose, canEdit, isSaving, haptic]);

  // Voice recording handlers
  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Voice recording not supported on this device');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/wav',
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceNotes((prev) => [...prev, audioUrl]);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      haptic.light();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied or unavailable');
    }
  }, [haptic]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      haptic.medium();
    }
  }, [isRecording, haptic]);

  // Photo handlers
  const handlePhotosAdded = useCallback(
    (newPhotos: string[]) => {
      setPhotos((prev) => [...prev, ...newPhotos]);
      setShowPhotoCapture(false);
      haptic.success();
    },
    [haptic],
  );

  const handlePhotoDelete = useCallback(
    (index: number) => {
      const confirmed = confirm('Delete this photo?');
      if (confirmed) {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
        haptic.light();
      }
    },
    [haptic],
  );

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && canEdit) {
      const confirmed = confirm(
        'You have unsaved changes. Are you sure you want to close?',
      );
      if (!confirmed) return;
    }
    onClose();
  }, [hasUnsavedChanges, canEdit, onClose]);

  const statusOptions = [
    {
      value: 'pending',
      label: 'Pending',
      icon: ClockIcon,
      color: 'text-gray-600',
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      icon: ClockIcon,
      color: 'text-blue-600',
    },
    {
      value: 'completed',
      label: 'Completed',
      icon: CheckCircleIcon,
      color: 'text-green-600',
    },
    {
      value: 'blocked',
      label: 'Blocked',
      icon: AlertCircleIcon,
      color: 'text-red-600',
    },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    {
      value: 'medium',
      label: 'Medium',
      color: 'bg-yellow-100 text-yellow-800',
    },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
  ];

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        snapPoints={[0.3, 0.7, 0.95]}
        initialSnap={2}
        className="bg-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              Update Task
            </h2>
            <p className="text-sm text-gray-600">{task.category}</p>
          </div>

          <button
            onClick={handleClose}
            className={cn(
              'p-2 rounded-lg hover:bg-gray-100 transition-colors',
              'touch-manipulation flex-shrink-0',
              'focus:outline-none focus:ring-2 focus:ring-pink-200',
            )}
            aria-label="Close"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Security Badge */}
        {securityLevel && (
          <div className="px-4 py-2 border-b border-gray-50">
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                securityLevel === 'high'
                  ? 'bg-green-100 text-green-800'
                  : securityLevel === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800',
              )}
            >
              🔒 Security Level: {securityLevel.toUpperCase()}
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <TouchInput
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter task title..."
              disabled={!canEdit}
              className="w-full"
              size="lg"
              touchOptimized
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateField('status', option.value)}
                    disabled={!canEdit}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      'touch-manipulation text-left',
                      formData.status === option.value
                        ? 'border-pink-300 bg-pink-50'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                      !canEdit && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    <Icon className={cn('w-4 h-4', option.color)} />
                    <span className="font-medium text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-2 gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('priority', option.value)}
                  disabled={!canEdit}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all touch-manipulation',
                    'text-sm font-medium text-center',
                    formData.priority === option.value
                      ? 'border-pink-300 bg-pink-50'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                    !canEdit && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <span className={cn('px-2 py-1 rounded-full', option.color)}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <TouchTextarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Add task description..."
              disabled={!canEdit}
              rows={3}
              className="w-full"
              touchOptimized
            />
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-1 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <TouchInput
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                disabled={!canEdit}
                className="w-full"
                size="lg"
                touchOptimized
              />
            </div>

            {/* Estimated Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="w-4 h-4 inline mr-1" />
                Estimated Time
              </label>
              <TouchInput
                value={formData.estimatedTime}
                onChange={(e) => updateField('estimatedTime', e.target.value)}
                placeholder="e.g., 2 hours, 30 minutes"
                disabled={!canEdit}
                className="w-full"
                size="lg"
                touchOptimized
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="w-4 h-4 inline mr-1" />
                Venue/Location
              </label>
              <TouchInput
                value={formData.venue}
                onChange={(e) => updateField('venue', e.target.value)}
                placeholder="Add location..."
                disabled={!canEdit}
                className="w-full"
                size="lg"
                touchOptimized
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileTextIcon className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <TouchTextarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Add notes or updates..."
              disabled={!canEdit}
              rows={4}
              className="w-full"
              touchOptimized
            />
          </div>

          {/* Photos Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Photos ({photos.length})
              </label>
              {canEdit && (
                <button
                  onClick={() => setShowPhotoCapture(true)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg',
                    'bg-pink-100 text-pink-700 hover:bg-pink-200',
                    'text-sm font-medium transition-colors touch-manipulation',
                  )}
                >
                  <CameraIcon className="w-4 h-4" />
                  Add Photo
                </button>
              )}
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Task photo ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    {canEdit && (
                      <button
                        onClick={() => handlePhotoDelete(index)}
                        className={cn(
                          'absolute top-1 right-1 p-1 rounded-full',
                          'bg-red-500 text-white opacity-0 group-hover:opacity-100',
                          'transition-opacity touch-manipulation',
                        )}
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                <MicIcon className="w-4 h-4 inline mr-1" />
                Voice Notes ({voiceNotes.length})
              </label>
              {canEdit && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium',
                    'transition-colors touch-manipulation',
                    isRecording
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
                  )}
                >
                  {isRecording ? (
                    <>
                      <StopCircleIcon className="w-4 h-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <MicIcon className="w-4 h-4" />
                      Record Note
                    </>
                  )}
                </button>
              )}
            </div>

            {voiceNotes.length > 0 && (
              <div className="space-y-2">
                {voiceNotes.map((note, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <button className="p-1 rounded-full bg-blue-100 text-blue-600">
                      <PlayIcon className="w-3 h-3" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Voice Note {index + 1}
                    </span>
                    <audio src={note} controls className="flex-1 h-8" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-100 space-y-3 bg-white">
          {/* Primary Actions */}
          <div className="flex gap-3">
            {task.status !== 'completed' && canEdit && (
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4',
                  'bg-green-600 text-white rounded-lg font-medium',
                  'hover:bg-green-700 transition-colors touch-manipulation',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <CheckCircleIcon className="w-4 h-4" />
                Complete Task
              </button>
            )}

            {canEdit && (
              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4',
                  'bg-pink-600 text-white rounded-lg font-medium',
                  'hover:bg-pink-700 transition-colors touch-manipulation',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>

          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && canEdit && (
            <div className="text-center text-sm text-orange-600">
              You have unsaved changes
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Photo Capture Interface */}
      {showPhotoCapture && (
        <PhotoCaptureInterface
          isOpen={showPhotoCapture}
          onClose={() => setShowPhotoCapture(false)}
          onPhotosAdded={handlePhotosAdded}
          maxPhotos={5}
          allowMultiple={true}
        />
      )}
    </>
  );
}
