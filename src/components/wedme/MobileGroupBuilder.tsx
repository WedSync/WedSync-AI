'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PlusIcon,
  MinusIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  CameraIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import {
  TouchInput,
  TouchTextarea,
  TouchSelect,
} from '@/components/touch/TouchInput';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

interface PhotoGroupTemplate {
  id: string;
  name: string;
  description: string;
  suggestedGuests: string[];
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  venueTypes: string[];
  samplePhotos: string[];
}

interface MobileGroupBuilderProps {
  weddingId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (groupData: any) => void;
  editingGroup?: any;
}

const PHOTO_TEMPLATES: PhotoGroupTemplate[] = [
  {
    id: 'family-immediate',
    name: 'Immediate Family',
    description: 'Parents, siblings, and grandparents',
    suggestedGuests: [
      'Parents of Bride',
      'Parents of Groom',
      'Siblings',
      'Grandparents',
    ],
    estimatedTime: '20 min',
    priority: 'high',
    venueTypes: ['indoor', 'outdoor', 'garden'],
    samplePhotos: ['family-formal', 'family-casual', 'generations'],
  },
  {
    id: 'wedding-party',
    name: 'Wedding Party',
    description: 'Bridesmaids, groomsmen, and couple',
    suggestedGuests: ['Bridesmaids', 'Groomsmen', 'Maid of Honor', 'Best Man'],
    estimatedTime: '30 min',
    priority: 'high',
    venueTypes: ['outdoor', 'garden', 'chapel'],
    samplePhotos: ['party-formal', 'party-fun', 'couple-with-party'],
  },
  {
    id: 'extended-family',
    name: 'Extended Family',
    description: 'Aunts, uncles, cousins',
    suggestedGuests: ['Aunts & Uncles', 'Cousins', 'Family Friends'],
    estimatedTime: '40 min',
    priority: 'medium',
    venueTypes: ['outdoor', 'garden', 'reception'],
    samplePhotos: ['large-group', 'family-reunion'],
  },
  {
    id: 'custom',
    name: 'Custom Group',
    description: 'Create your own group from scratch',
    suggestedGuests: [],
    estimatedTime: '15 min',
    priority: 'medium',
    venueTypes: [],
    samplePhotos: [],
  },
];

const VENUE_OPTIONS = [
  { value: 'main-garden', label: 'Main Garden' },
  { value: 'rose-pavilion', label: 'Rose Pavilion' },
  { value: 'chapel-steps', label: 'Chapel Steps' },
  { value: 'reception-hall', label: 'Reception Hall' },
  { value: 'courtyard', label: 'Courtyard' },
  { value: 'custom', label: 'Custom Location' },
];

const PHOTO_STYLES = [
  { value: 'formal', label: 'Formal Poses' },
  { value: 'candid', label: 'Candid Shots' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'artistic', label: 'Artistic' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'modern', label: 'Modern' },
];

export function MobileGroupBuilder({
  weddingId,
  isOpen,
  onClose,
  onComplete,
  editingGroup,
}: MobileGroupBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    template: '',
    guests: [] as string[],
    venue: '',
    customVenue: '',
    estimatedTime: '15',
    priority: 'medium' as const,
    photoStyles: [] as string[],
    specialRequests: '',
    timeline: {
      startTime: '',
      endTime: '',
      buffer: '5',
    },
  });

  const { toast } = useToast();
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user',
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  const steps = [
    { title: 'Template', key: 'template' },
    { title: 'Basic Info', key: 'info' },
    { title: 'Guests', key: 'guests' },
    { title: 'Venue & Time', key: 'venue' },
    { title: 'Photo Style', key: 'style' },
    { title: 'Review', key: 'review' },
  ];

  // Auto-save functionality
  useEffect(() => {
    if (currentStep > 0) {
      const timeoutId = setTimeout(() => {
        // Save to local storage for recovery
        localStorage.setItem(
          `photo-group-draft-${weddingId}`,
          JSON.stringify({
            ...groupData,
            lastSaved: new Date().toISOString(),
            currentStep,
          }),
        );
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [groupData, currentStep, weddingId]);

  // Load draft on mount
  useEffect(() => {
    if (isOpen && !editingGroup) {
      const draft = localStorage.getItem(`photo-group-draft-${weddingId}`);
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          setGroupData(parsedDraft);
          setCurrentStep(parsedDraft.currentStep || 0);
          toast({
            title: 'Draft restored',
            description: 'Your previous work has been restored',
          });
        } catch (error) {
          console.error('Failed to restore draft:', error);
        }
      }
    }
  }, [isOpen, editingGroup, weddingId, toast]);

  const selectedTemplate = useMemo(() => {
    return PHOTO_TEMPLATES.find((t) => t.id === groupData.template);
  }, [groupData.template]);

  const isStepComplete = useCallback(
    (step: number) => {
      switch (step) {
        case 0:
          return !!groupData.template;
        case 1:
          return !!(groupData.name && groupData.description);
        case 2:
          return groupData.guests.length > 0;
        case 3:
          return !!(groupData.venue && groupData.timeline.startTime);
        case 4:
          return groupData.photoStyles.length > 0;
        case 5:
          return true;
        default:
          return false;
      }
    },
    [groupData],
  );

  const canProceed = isStepComplete(currentStep);
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = useCallback(() => {
    if (canProceed && !isLastStep) {
      setCurrentStep((prev) => prev + 1);
    } else if (isLastStep) {
      handleComplete();
    }
  }, [canProceed, isLastStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    try {
      // Prepare final group data
      const finalGroupData = {
        ...groupData,
        id: editingGroup?.id || `group-${Date.now()}`,
        created_at: editingGroup?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        weddingId,
      };

      // Clear draft
      localStorage.removeItem(`photo-group-draft-${weddingId}`);

      onComplete(finalGroupData);
      onClose();

      toast({
        title: editingGroup ? 'Group updated!' : 'Group created!',
        description: `"${groupData.name}" has been ${editingGroup ? 'updated' : 'created'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error saving group',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, [groupData, editingGroup, weddingId, onComplete, onClose, toast]);

  const addGuest = useCallback(
    (guestName: string) => {
      if (guestName.trim() && !groupData.guests.includes(guestName.trim())) {
        setGroupData((prev) => ({
          ...prev,
          guests: [...prev.guests, guestName.trim()],
        }));
      }
    },
    [groupData.guests],
  );

  const removeGuest = useCallback((guestName: string) => {
    setGroupData((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g !== guestName),
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 touch-manipulation hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1 mx-4">
            <h1 className="text-lg font-semibold text-gray-900">
              {editingGroup ? 'Edit Photo Group' : 'Create Photo Group'}
            </h1>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}:{' '}
              {steps[currentStep]?.title}
            </div>
          </div>

          {/* Offline indicator */}
          {!offlineHook.isOnline && (
            <div className="px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded-full">
              Offline
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={cn(
                  'flex-1 h-2 rounded-full transition-colors duration-300',
                  index < currentStep
                    ? 'bg-primary-600'
                    : index === currentStep
                      ? 'bg-primary-300'
                      : 'bg-gray-200',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-24">
          {/* Step 0: Template Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Choose a Template
                </h2>
                <p className="text-gray-600">
                  Select a starting point for your photo group
                </p>
              </div>

              <div className="space-y-3">
                {PHOTO_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() =>
                      setGroupData((prev) => ({
                        ...prev,
                        template: template.id,
                      }))
                    }
                    className={cn(
                      'w-full p-4 text-left rounded-xl border-2 transition-all duration-200',
                      'touch-manipulation',
                      groupData.template === template.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {template.name}
                          </h3>
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              template.priority === 'high'
                                ? 'bg-error-50 text-error-700'
                                : 'bg-gray-50 text-gray-700',
                            )}
                          >
                            {template.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {template.estimatedTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <UsersIcon className="w-3 h-3" />
                            {template.suggestedGuests.length} types
                          </span>
                        </div>
                      </div>
                      {groupData.template === template.id && (
                        <CheckIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Basic Information
                </h2>
                <p className="text-gray-600">
                  Give your photo group a name and description
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <TouchInput
                    value={groupData.name}
                    onChange={(e) =>
                      setGroupData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder={selectedTemplate?.name || 'Enter group name'}
                    size="lg"
                    touchOptimized={true}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <TouchTextarea
                    value={groupData.description}
                    onChange={(e) =>
                      setGroupData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder={
                      selectedTemplate?.description ||
                      'Describe this photo group'
                    }
                    rows={3}
                    touchOptimized={true}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <TouchSelect
                    value={groupData.priority}
                    onChange={(e) =>
                      setGroupData((prev) => ({
                        ...prev,
                        priority: e.target.value as any,
                      }))
                    }
                    touchOptimized={true}
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </TouchSelect>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Time (minutes)
                  </label>
                  <TouchInput
                    type="number"
                    value={groupData.estimatedTime}
                    onChange={(e) =>
                      setGroupData((prev) => ({
                        ...prev,
                        estimatedTime: e.target.value,
                      }))
                    }
                    placeholder="15"
                    min="5"
                    max="120"
                    touchOptimized={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Guests */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Add Guests
                </h2>
                <p className="text-gray-600">
                  Who should be in this photo group?
                </p>
              </div>

              {/* Suggested Guests from Template */}
              {selectedTemplate?.suggestedGuests.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Suggested for {selectedTemplate.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.suggestedGuests.map((guest) => (
                      <button
                        key={guest}
                        onClick={() => addGuest(guest)}
                        disabled={groupData.guests.includes(guest)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-all duration-200',
                          'touch-manipulation',
                          groupData.guests.includes(guest)
                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                            : 'bg-white border-gray-200 hover:border-gray-300',
                        )}
                      >
                        <span className="text-sm">{guest}</span>
                        {groupData.guests.includes(guest) ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <PlusIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Guest Input */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Add Custom Guests
                </h3>
                <div className="flex gap-2">
                  <TouchInput
                    placeholder="Enter guest name or group"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addGuest((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                    touchOptimized={true}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector(
                        'input[placeholder="Enter guest name or group"]',
                      ) as HTMLInputElement;
                      if (input?.value) {
                        addGuest(input.value);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg touch-manipulation hover:bg-primary-700 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Added Guests List */}
              {groupData.guests.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Added Guests ({groupData.guests.length})
                  </h3>
                  <div className="space-y-2">
                    {groupData.guests.map((guest, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-900">{guest}</span>
                        <button
                          onClick={() => removeGuest(guest)}
                          className="p-1 text-gray-400 hover:text-error-600 touch-manipulation transition-colors"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Venue & Time */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Venue & Timing
                </h2>
                <p className="text-gray-600">
                  Where and when should this group be photographed?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    Photo Location *
                  </label>
                  <TouchSelect
                    value={groupData.venue}
                    onChange={(e) =>
                      setGroupData((prev) => ({
                        ...prev,
                        venue: e.target.value,
                      }))
                    }
                    touchOptimized={true}
                  >
                    <option value="">Select a location</option>
                    {VENUE_OPTIONS.map((venue) => (
                      <option key={venue.value} value={venue.value}>
                        {venue.label}
                      </option>
                    ))}
                  </TouchSelect>
                </div>

                {groupData.venue === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Location *
                    </label>
                    <TouchInput
                      value={groupData.customVenue}
                      onChange={(e) =>
                        setGroupData((prev) => ({
                          ...prev,
                          customVenue: e.target.value,
                        }))
                      }
                      placeholder="Enter custom location"
                      touchOptimized={true}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ClockIcon className="w-4 h-4 inline mr-1" />
                      Start Time *
                    </label>
                    <TouchInput
                      type="time"
                      value={groupData.timeline.startTime}
                      onChange={(e) =>
                        setGroupData((prev) => ({
                          ...prev,
                          timeline: {
                            ...prev.timeline,
                            startTime: e.target.value,
                          },
                        }))
                      }
                      touchOptimized={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buffer Time (min)
                    </label>
                    <TouchInput
                      type="number"
                      value={groupData.timeline.buffer}
                      onChange={(e) =>
                        setGroupData((prev) => ({
                          ...prev,
                          timeline: {
                            ...prev.timeline,
                            buffer: e.target.value,
                          },
                        }))
                      }
                      placeholder="5"
                      min="0"
                      max="30"
                      touchOptimized={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Photo Style */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Photo Style
                </h2>
                <p className="text-gray-600">
                  What style of photos do you want?
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Photography Styles (select multiple)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {PHOTO_STYLES.map((style) => {
                    const isSelected = groupData.photoStyles.includes(
                      style.value,
                    );
                    return (
                      <button
                        key={style.value}
                        onClick={() => {
                          setGroupData((prev) => ({
                            ...prev,
                            photoStyles: isSelected
                              ? prev.photoStyles.filter(
                                  (s) => s !== style.value,
                                )
                              : [...prev.photoStyles, style.value],
                          }));
                        }}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-all duration-200',
                          'touch-manipulation',
                          isSelected
                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                            : 'bg-white border-gray-200 hover:border-gray-300',
                        )}
                      >
                        <span className="text-sm">{style.label}</span>
                        {isSelected && <CheckIcon className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests or Notes
                </label>
                <TouchTextarea
                  value={groupData.specialRequests}
                  onChange={(e) =>
                    setGroupData((prev) => ({
                      ...prev,
                      specialRequests: e.target.value,
                    }))
                  }
                  placeholder="Any specific poses, lighting, or other requirements..."
                  rows={3}
                  touchOptimized={true}
                />
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Review & Confirm
                </h2>
                <p className="text-gray-600">
                  Check all details before creating your photo group
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {groupData.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {groupData.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="capitalize">
                      Priority: {groupData.priority}
                    </span>
                    <span>Time: {groupData.estimatedTime} min</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    <UsersIcon className="w-4 h-4 inline mr-1" />
                    Guests ({groupData.guests.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {groupData.guests.map((guest, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
                      >
                        {guest}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    Location & Time
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      Location:{' '}
                      {VENUE_OPTIONS.find((v) => v.value === groupData.venue)
                        ?.label || groupData.customVenue}
                    </div>
                    <div>Start time: {groupData.timeline.startTime}</div>
                    <div>Buffer: {groupData.timeline.buffer} minutes</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    <CameraIcon className="w-4 h-4 inline mr-1" />
                    Photo Styles
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {groupData.photoStyles.map((style, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {PHOTO_STYLES.find((s) => s.value === style)?.label}
                      </span>
                    ))}
                  </div>
                </div>

                {groupData.specialRequests && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-1">
                      Special Requests
                    </h4>
                    <p className="text-sm text-gray-600">
                      {groupData.specialRequests}
                    </p>
                  </div>
                )}
              </div>

              {/* Validation Warnings */}
              <div className="space-y-2">
                {groupData.guests.length > 15 && (
                  <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <AlertTriangleIcon className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-warning-700">
                      <strong>Large group warning:</strong> Groups with more
                      than 15 people may require additional time and
                      coordination.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200',
              'touch-manipulation',
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            {currentStep + 1} of {steps.length}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200',
              'touch-manipulation',
              canProceed
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            )}
          >
            {isLastStep ? 'Create Group' : 'Next'}
            {!isLastStep && <ArrowRightIcon className="w-4 h-4" />}
            {isLastStep && <CheckIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
