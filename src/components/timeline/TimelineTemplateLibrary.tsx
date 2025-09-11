'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Clock,
  Users,
  MapPin,
  Star,
  Download,
  Eye,
  Plus,
  Filter,
  X,
} from 'lucide-react';
import { format, addMinutes, startOfDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type {
  TimelineTemplate,
  TemplateEvent,
  EventType,
  EventCategory,
  TimelineEvent,
} from '@/types/timeline';

// Default wedding timeline templates
const DEFAULT_TEMPLATES: TimelineTemplate[] = [
  {
    id: 'traditional-wedding',
    organization_id: 'default',
    name: 'Traditional Wedding',
    description:
      'Classic wedding timeline perfect for traditional ceremonies and receptions',
    category: 'Traditional',
    default_duration_hours: 12,
    is_public: true,
    usage_count: 1247,
    template_events: [
      {
        title: 'Bridal Party Getting Ready',
        duration: 180,
        event_type: 'preparation',
        offset: 0,
        category: 'preparation',
        description: 'Hair, makeup, and dressing for bridal party',
        vendor_types: ['photographer', 'hair_makeup'],
      },
      {
        title: 'Groom & Groomsmen Preparation',
        duration: 90,
        event_type: 'preparation',
        offset: 90,
        category: 'preparation',
        description: 'Getting ready and first look photos',
        vendor_types: ['photographer'],
      },
      {
        title: 'First Look Photos',
        duration: 30,
        event_type: 'photos',
        offset: 240,
        category: 'ceremony',
        description: 'Private first look between couple',
        vendor_types: ['photographer'],
      },
      {
        title: 'Family & Wedding Party Photos',
        duration: 60,
        event_type: 'photos',
        offset: 270,
        category: 'ceremony',
        description: 'Group photos with family and wedding party',
        vendor_types: ['photographer'],
      },
      {
        title: 'Ceremony Setup',
        duration: 60,
        event_type: 'setup',
        offset: 300,
        category: 'ceremony',
        description: 'Final ceremony setup and sound check',
        vendor_types: ['florist', 'dj', 'officiant'],
      },
      {
        title: 'Wedding Ceremony',
        duration: 45,
        event_type: 'ceremony',
        offset: 360,
        category: 'ceremony',
        description: 'Main wedding ceremony',
        vendor_types: ['officiant', 'photographer', 'dj'],
      },
      {
        title: 'Post-Ceremony Photos',
        duration: 30,
        event_type: 'photos',
        offset: 405,
        category: 'ceremony',
        description: 'Just married photos and family shots',
        vendor_types: ['photographer'],
      },
      {
        title: 'Cocktail Hour',
        duration: 75,
        event_type: 'cocktails',
        offset: 435,
        category: 'cocktails',
        description: 'Guests mingle while couple takes more photos',
        vendor_types: ['catering', 'dj', 'photographer'],
      },
      {
        title: 'Reception Setup',
        duration: 30,
        event_type: 'setup',
        offset: 435,
        category: 'reception',
        description: 'Final reception room setup',
        vendor_types: ['catering', 'florist'],
      },
      {
        title: 'Grand Entrance',
        duration: 15,
        event_type: 'reception',
        offset: 510,
        category: 'reception',
        description: 'Couple entrance to reception',
        vendor_types: ['dj', 'photographer'],
      },
      {
        title: 'First Dance',
        duration: 15,
        event_type: 'dancing',
        offset: 525,
        category: 'reception',
        description: "Couple's first dance",
        vendor_types: ['dj', 'photographer'],
      },
      {
        title: 'Dinner Service',
        duration: 90,
        event_type: 'dinner',
        offset: 540,
        category: 'reception',
        description: 'Served dinner with toasts',
        vendor_types: ['catering', 'dj'],
      },
      {
        title: 'Toasts & Speeches',
        duration: 30,
        event_type: 'reception',
        offset: 570,
        category: 'reception',
        description: 'Wedding party toasts and speeches',
        vendor_types: ['dj', 'photographer'],
      },
      {
        title: 'Open Dancing',
        duration: 120,
        event_type: 'dancing',
        offset: 630,
        category: 'party',
        description: 'Dance floor opens for all guests',
        vendor_types: ['dj', 'photographer'],
      },
      {
        title: 'Cake Cutting',
        duration: 15,
        event_type: 'reception',
        offset: 690,
        category: 'reception',
        description: 'Traditional cake cutting ceremony',
        vendor_types: ['photographer', 'catering'],
      },
      {
        title: 'Last Dance & Send-off',
        duration: 30,
        event_type: 'reception',
        offset: 750,
        category: 'party',
        description: 'Final dance and grand exit',
        vendor_types: ['dj', 'photographer'],
      },
    ],
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'modern-minimalist',
    organization_id: 'default',
    name: 'Modern Minimalist',
    description: 'Streamlined timeline for intimate, modern weddings',
    category: 'Modern',
    default_duration_hours: 8,
    is_public: true,
    usage_count: 892,
    template_events: [
      {
        title: 'Getting Ready',
        duration: 120,
        event_type: 'preparation',
        offset: 0,
        category: 'preparation',
        description: 'Minimal prep with focus on natural beauty',
        vendor_types: ['photographer'],
      },
      {
        title: 'Intimate First Look',
        duration: 20,
        event_type: 'photos',
        offset: 180,
        category: 'ceremony',
        description: 'Private moment before ceremony',
        vendor_types: ['photographer'],
      },
      {
        title: 'Ceremony',
        duration: 25,
        event_type: 'ceremony',
        offset: 240,
        category: 'ceremony',
        description: 'Simple, heartfelt ceremony',
        vendor_types: ['officiant', 'photographer'],
      },
      {
        title: 'Celebration & Cocktails',
        duration: 90,
        event_type: 'cocktails',
        offset: 265,
        category: 'cocktails',
        description: 'Casual celebration with drinks',
        vendor_types: ['catering', 'photographer'],
      },
      {
        title: 'Dinner & Toasts',
        duration: 90,
        event_type: 'dinner',
        offset: 355,
        category: 'reception',
        description: 'Intimate dinner with close family',
        vendor_types: ['catering'],
      },
      {
        title: 'Dancing & Celebration',
        duration: 120,
        event_type: 'dancing',
        offset: 445,
        category: 'party',
        description: 'Dancing and celebration',
        vendor_types: ['dj'],
      },
    ],
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'destination-wedding',
    organization_id: 'default',
    name: 'Destination Wedding',
    description:
      'Perfect for beach or destination weddings with extended timeline',
    category: 'Destination',
    default_duration_hours: 10,
    is_public: true,
    usage_count: 634,
    template_events: [
      {
        title: 'Welcome Reception',
        duration: 120,
        event_type: 'cocktails',
        offset: -1440, // Day before
        category: 'preparation',
        description: 'Welcome guests who traveled',
        vendor_types: ['catering'],
      },
      {
        title: 'Getting Ready',
        duration: 150,
        event_type: 'preparation',
        offset: 0,
        category: 'preparation',
        description: 'Relaxed preparation with ocean views',
        vendor_types: ['photographer', 'hair_makeup'],
      },
      {
        title: 'Beach Photos',
        duration: 45,
        event_type: 'photos',
        offset: 180,
        category: 'ceremony',
        description: 'Golden hour beach photography',
        vendor_types: ['photographer'],
      },
      {
        title: 'Ceremony on Beach',
        duration: 30,
        event_type: 'ceremony',
        offset: 300,
        category: 'ceremony',
        description: 'Beachside ceremony at sunset',
        vendor_types: ['officiant', 'photographer', 'florist'],
      },
      {
        title: 'Sunset Cocktails',
        duration: 90,
        event_type: 'cocktails',
        offset: 330,
        category: 'cocktails',
        description: 'Cocktails on the beach',
        vendor_types: ['catering', 'photographer'],
      },
      {
        title: 'Dinner Under Stars',
        duration: 120,
        event_type: 'dinner',
        offset: 420,
        category: 'reception',
        description: 'Al fresco dinner with local cuisine',
        vendor_types: ['catering'],
      },
      {
        title: 'Beach Dancing',
        duration: 150,
        event_type: 'dancing',
        offset: 540,
        category: 'party',
        description: 'Dancing under the stars',
        vendor_types: ['dj', 'photographer'],
      },
    ],
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

interface TimelineTemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (
    template: TimelineTemplate,
    customizations?: TemplateCustomization,
  ) => void;
  weddingDate: string;
  startTime?: string;
  className?: string;
}

interface TemplateCustomization {
  startTime: string;
  guestCount: number;
  selectedVendorTypes: string[];
  skipEvents: string[];
  customDurations: Record<string, number>;
}

interface TemplateFilter {
  category?: string;
  duration?: 'short' | 'medium' | 'long';
  popularity?: 'high' | 'medium' | 'low';
  search?: string;
}

export function TimelineTemplateLibrary({
  isOpen,
  onClose,
  onApplyTemplate,
  weddingDate,
  startTime = '09:00',
  className,
}: TimelineTemplateLibraryProps) {
  const [templates] = useState<TimelineTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TimelineTemplate | null>(null);
  const [filter, setFilter] = useState<TemplateFilter>({});
  const [showPreview, setShowPreview] = useState(false);
  const [customization, setCustomization] = useState<TemplateCustomization>({
    startTime,
    guestCount: 100,
    selectedVendorTypes: [],
    skipEvents: [],
    customDurations: {},
  });

  // Filter templates based on current filter
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description.toLowerCase().includes(searchTerm) ||
          template.category?.toLowerCase().includes(searchTerm),
      );
    }

    if (filter.category) {
      filtered = filtered.filter(
        (template) => template.category === filter.category,
      );
    }

    if (filter.duration) {
      filtered = filtered.filter((template) => {
        if (filter.duration === 'short')
          return template.default_duration_hours <= 6;
        if (filter.duration === 'medium')
          return (
            template.default_duration_hours > 6 &&
            template.default_duration_hours <= 10
          );
        if (filter.duration === 'long')
          return template.default_duration_hours > 10;
        return true;
      });
    }

    if (filter.popularity) {
      filtered = filtered.filter((template) => {
        if (filter.popularity === 'high') return template.usage_count > 1000;
        if (filter.popularity === 'medium')
          return template.usage_count > 500 && template.usage_count <= 1000;
        if (filter.popularity === 'low') return template.usage_count <= 500;
        return true;
      });
    }

    return filtered;
  }, [templates, filter]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    return Array.from(
      new Set(templates.map((t) => t.category).filter(Boolean)),
    );
  }, [templates]);

  // Generate preview timeline from template
  const generatePreviewTimeline = useCallback(
    (template: TimelineTemplate, customizations: TemplateCustomization) => {
      const weddingDateObj = parseISO(weddingDate);
      const startDateTime = startOfDay(weddingDateObj);
      const [startHour, startMinute] = customizations.startTime
        .split(':')
        .map(Number);
      const baseStartTime = addMinutes(
        startDateTime,
        startHour * 60 + startMinute,
      );

      return template.template_events
        .filter((event) => !customizations.skipEvents.includes(event.title))
        .map((event, index) => {
          const customDuration =
            customizations.customDurations[event.title] || event.duration;
          const eventStartTime = addMinutes(baseStartTime, event.offset);
          const eventEndTime = addMinutes(eventStartTime, customDuration);

          return {
            id: `preview-${index}`,
            timeline_id: 'preview',
            title: event.title,
            description: event.description,
            event_type: event.event_type,
            category: event.category,
            start_time: eventStartTime.toISOString(),
            end_time: eventEndTime.toISOString(),
            duration_minutes: customDuration,
            priority: 'medium' as const,
            status: 'pending' as const,
            is_locked: false,
            is_flexible: true,
            weather_dependent: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as TimelineEvent;
        });
    },
    [weddingDate],
  );

  // Handle template application
  const handleApplyTemplate = useCallback(
    (template: TimelineTemplate) => {
      onApplyTemplate(template, customization);
      onClose();
    },
    [onApplyTemplate, customization, onClose],
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilter: Partial<TemplateFilter>) => {
      setFilter((prev) => ({ ...prev, ...newFilter }));
    },
    [],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Timeline Template Library
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a pre-built timeline or customize your own
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Template List */}
          <div className="flex-1 flex flex-col">
            {/* Search and Filters */}
            <div className="p-6 border-b space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  value={filter.search || ''}
                  onChange={(e) =>
                    handleFilterChange({ search: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  value={filter.category || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      category: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  value={filter.duration || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      duration: (e.target.value as any) || undefined,
                    })
                  }
                >
                  <option value="">All Durations</option>
                  <option value="short">Short (≤6h)</option>
                  <option value="medium">Medium (6-10h)</option>
                  <option value="long">Long (&gt;10h)</option>
                </select>

                <select
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  value={filter.popularity || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      popularity: (e.target.value as any) || undefined,
                    })
                  }
                >
                  <option value="">All Popularity</option>
                  <option value="high">Most Popular</option>
                  <option value="medium">Popular</option>
                  <option value="low">New</option>
                </select>

                {Object.keys(filter).length > 0 && (
                  <button
                    onClick={() => setFilter({})}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={() => setSelectedTemplate(template)}
                    onPreview={() => {
                      setSelectedTemplate(template);
                      setShowPreview(true);
                    }}
                    onApply={() => handleApplyTemplate(template)}
                  />
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    No templates found matching your criteria.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Template Preview/Customization */}
          {selectedTemplate && (
            <div className="w-96 border-l bg-gray-50 flex flex-col">
              <div className="p-4 border-b bg-white">
                <h3 className="font-medium text-gray-900">
                  {selectedTemplate.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTemplate.description}
                </p>
              </div>

              {showPreview ? (
                <TemplatePreview
                  template={selectedTemplate}
                  customization={customization}
                  onCustomizationChange={setCustomization}
                  onApply={() => handleApplyTemplate(selectedTemplate)}
                  onBack={() => setShowPreview(false)}
                  weddingDate={weddingDate}
                  generatePreviewTimeline={generatePreviewTimeline}
                />
              ) : (
                <TemplateDetails
                  template={selectedTemplate}
                  onCustomize={() => setShowPreview(true)}
                  onApply={() => handleApplyTemplate(selectedTemplate)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  onApply,
}: {
  template: TimelineTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onApply: () => void;
}) {
  const popularity =
    template.usage_count > 1000
      ? 'high'
      : template.usage_count > 500
        ? 'medium'
        : 'low';

  const popularityColor =
    popularity === 'high'
      ? 'text-green-600'
      : popularity === 'medium'
        ? 'text-blue-600'
        : 'text-gray-600';

  return (
    <div
      className={cn(
        'p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-0.5 bg-gray-100 rounded-full">
              {template.category}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.default_duration_hours}h
            </div>
            <div className={cn('flex items-center gap-1', popularityColor)}>
              <Star className="w-3 h-3" />
              {template.usage_count}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {template.description}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Use Template
        </button>
      </div>
    </div>
  );
}

// Template Details Component
function TemplateDetails({
  template,
  onCustomize,
  onApply,
}: {
  template: TimelineTemplate;
  onCustomize: () => void;
  onApply: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Template Overview</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span>{template.default_duration_hours} hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Events:</span>
            <span>{template.template_events.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Used by:</span>
            <span>{template.usage_count.toLocaleString()} couples</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Event Timeline</h4>
        <div className="space-y-2">
          {template.template_events.slice(0, 5).map((event, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <span className="text-gray-600">{event.title}</span>
              <span className="text-gray-400 text-xs ml-auto">
                {event.duration}m
              </span>
            </div>
          ))}
          {template.template_events.length > 5 && (
            <div className="text-xs text-gray-500">
              +{template.template_events.length - 5} more events
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onCustomize}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Customize Template
        </button>
        <button
          onClick={onApply}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Use As-Is
        </button>
      </div>
    </div>
  );
}

// Template Preview Component
function TemplatePreview({
  template,
  customization,
  onCustomizationChange,
  onApply,
  onBack,
  weddingDate,
  generatePreviewTimeline,
}: {
  template: TimelineTemplate;
  customization: TemplateCustomization;
  onCustomizationChange: (customization: TemplateCustomization) => void;
  onApply: () => void;
  onBack: () => void;
  weddingDate: string;
  generatePreviewTimeline: (
    template: TimelineTemplate,
    customizations: TemplateCustomization,
  ) => TimelineEvent[];
}) {
  const previewEvents = generatePreviewTimeline(template, customization);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
      >
        ← Back to details
      </button>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Customize Timeline</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              value={customization.startTime}
              onChange={(e) =>
                onCustomizationChange({
                  ...customization,
                  startTime: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Count
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              value={customization.guestCount}
              onChange={(e) =>
                onCustomizationChange({
                  ...customization,
                  guestCount: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Preview Timeline</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {previewEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-2 bg-white rounded-lg border"
            >
              <div>
                <div className="font-medium text-sm">{event.title}</div>
                <div className="text-xs text-gray-600">
                  {format(parseISO(event.start_time), 'HH:mm')} -{' '}
                  {format(parseISO(event.end_time), 'HH:mm')}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {event.duration_minutes}m
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        Apply Customized Template
      </button>
    </div>
  );
}
