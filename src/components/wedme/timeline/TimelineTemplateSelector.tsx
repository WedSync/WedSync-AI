'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TimelineTemplate, CreateTimelineRequest } from '@/types/timeline';
import { useHaptic } from '@/hooks/useTouch';
import {
  Clock,
  Users,
  Heart,
  Camera,
  Music,
  Utensils,
  Car,
  Check,
  Star,
  ArrowRight,
  X,
} from 'lucide-react';

interface TimelineTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TimelineTemplate) => void;
  className?: string;
}

const WEDDING_TEMPLATES: TimelineTemplate[] = [
  {
    id: 'classic-church',
    organization_id: 'system',
    name: 'Classic Church Wedding',
    description: 'Traditional church ceremony with reception',
    category: 'Traditional',
    default_duration_hours: 12,
    is_public: true,
    usage_count: 1247,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    template_events: [
      {
        title: 'Hair & Makeup',
        duration: 120,
        event_type: 'preparation',
        offset: 0,
        description: 'Bridal party getting ready',
      },
      {
        title: 'Photography - Getting Ready',
        duration: 60,
        event_type: 'photos',
        offset: 90,
        vendor_types: ['photographer'],
      },
      {
        title: 'Ceremony',
        duration: 45,
        event_type: 'ceremony',
        offset: 240,
        description: 'Church ceremony',
      },
      {
        title: 'Cocktail Hour',
        duration: 60,
        event_type: 'cocktails',
        offset: 300,
        vendor_types: ['catering', 'music'],
      },
      {
        title: 'Reception Dinner',
        duration: 90,
        event_type: 'dinner',
        offset: 360,
        vendor_types: ['catering'],
      },
      {
        title: 'Dancing & Party',
        duration: 180,
        event_type: 'dancing',
        offset: 450,
        vendor_types: ['dj', 'music'],
      },
    ],
  },
  {
    id: 'garden-outdoor',
    organization_id: 'system',
    name: 'Garden Party Wedding',
    description: 'Outdoor ceremony and reception in garden setting',
    category: 'Outdoor',
    default_duration_hours: 10,
    is_public: true,
    usage_count: 856,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    template_events: [
      {
        title: 'Vendor Setup',
        duration: 90,
        event_type: 'setup',
        offset: 0,
        vendor_types: ['venue', 'catering'],
      },
      {
        title: 'Bridal Preparation',
        duration: 120,
        event_type: 'preparation',
        offset: 120,
      },
      {
        title: 'Outdoor Ceremony',
        duration: 30,
        event_type: 'ceremony',
        offset: 300,
      },
      {
        title: 'Garden Cocktails',
        duration: 90,
        event_type: 'cocktails',
        offset: 340,
      },
      {
        title: 'Al Fresco Dinner',
        duration: 120,
        event_type: 'dinner',
        offset: 430,
      },
      {
        title: 'Sunset Dancing',
        duration: 150,
        event_type: 'dancing',
        offset: 550,
      },
    ],
  },
  {
    id: 'intimate-elopement',
    organization_id: 'system',
    name: 'Intimate Elopement',
    description: 'Small, intimate wedding with close family',
    category: 'Intimate',
    default_duration_hours: 6,
    is_public: true,
    usage_count: 432,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    template_events: [
      {
        title: 'Getting Ready Together',
        duration: 60,
        event_type: 'preparation',
        offset: 0,
      },
      {
        title: 'Intimate Ceremony',
        duration: 20,
        event_type: 'ceremony',
        offset: 90,
      },
      {
        title: 'Family Photos',
        duration: 45,
        event_type: 'photos',
        offset: 120,
      },
      {
        title: 'Celebration Lunch',
        duration: 90,
        event_type: 'dinner',
        offset: 180,
      },
      {
        title: 'Private Couple Time',
        duration: 60,
        event_type: 'photos',
        offset: 280,
      },
    ],
  },
  {
    id: 'destination-beach',
    organization_id: 'system',
    name: 'Beach Destination Wedding',
    description: 'Beachfront ceremony with tropical reception',
    category: 'Destination',
    default_duration_hours: 14,
    is_public: true,
    usage_count: 623,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    template_events: [
      {
        title: 'Welcome Rehearsal Dinner',
        duration: 120,
        event_type: 'dinner',
        offset: 0,
        description: 'Night before celebration',
      },
      {
        title: 'Morning Prep & Spa',
        duration: 150,
        event_type: 'preparation',
        offset: 1200,
      },
      {
        title: 'Beach Ceremony',
        duration: 30,
        event_type: 'ceremony',
        offset: 1410,
      },
      {
        title: 'Sunset Cocktails',
        duration: 90,
        event_type: 'cocktails',
        offset: 1450,
      },
      {
        title: 'Beachside Dinner',
        duration: 120,
        event_type: 'dinner',
        offset: 1540,
      },
      {
        title: 'Beach Party Dancing',
        duration: 180,
        event_type: 'dancing',
        offset: 1660,
      },
    ],
  },
];

export function TimelineTemplateSelector({
  isOpen,
  onClose,
  onSelectTemplate,
  className,
}: TimelineTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TimelineTemplate | null>(null);
  const [category, setCategory] = useState<string>('all');

  const haptic = useHaptic();

  const categories = [
    'all',
    'Traditional',
    'Outdoor',
    'Intimate',
    'Destination',
  ];

  const filteredTemplates =
    category === 'all'
      ? WEDDING_TEMPLATES
      : WEDDING_TEMPLATES.filter((t) => t.category === category);

  const handleSelectTemplate = (template: TimelineTemplate) => {
    setSelectedTemplate(template);
    haptic.medium();
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      haptic.success();
      onClose();
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'preparation':
        return Heart;
      case 'ceremony':
        return Heart;
      case 'photos':
        return Camera;
      case 'cocktails':
        return Utensils;
      case 'dinner':
        return Utensils;
      case 'dancing':
        return Music;
      case 'setup':
        return Clock;
      case 'transport':
        return Car;
      default:
        return Clock;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={cn(
          'w-full max-w-4xl bg-white rounded-t-3xl md:rounded-3xl shadow-xl',
          'max-h-[85vh] overflow-hidden flex flex-col',
          className,
        )}
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div>
            <h2 className="text-xl font-semibold">Choose Timeline Template</h2>
            <p className="text-sm text-purple-100">
              Start with a pre-built wedding timeline
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  haptic.light();
                }}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px]',
                  category === cat
                    ? 'bg-purple-500 text-white'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-300',
                )}
              >
                {cat === 'all' ? 'All Templates' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;

              return (
                <motion.div
                  key={template.id}
                  className={cn(
                    'bg-white rounded-2xl border-2 shadow-sm cursor-pointer transition-all',
                    isSelected
                      ? 'border-purple-500 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md',
                  )}
                  onClick={() => handleSelectTemplate(template)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="p-6">
                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.default_duration_hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {template.usage_count} couples
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current text-yellow-400" />
                            Popular
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Event Preview */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Includes {template.template_events.length} events:
                      </h4>
                      {template.template_events
                        .slice(0, 4)
                        .map((event, index) => {
                          const IconComponent = getEventIcon(event.event_type);
                          const hours = Math.floor(event.duration / 60);
                          const minutes = event.duration % 60;
                          const durationText =
                            hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                          return (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900">
                                  {event.title}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {durationText}
                              </span>
                            </div>
                          );
                        })}

                      {template.template_events.length > 4 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          + {template.template_events.length - 4} more events
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">
                No templates found
              </p>
              <p className="text-sm mt-1">Try selecting a different category</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium min-h-[48px]"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmSelection}
              disabled={!selectedTemplate}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium min-h-[48px]',
                selectedTemplate
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed',
              )}
            >
              Use This Template
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {selectedTemplate && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              You can customize all events after creating your timeline
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
