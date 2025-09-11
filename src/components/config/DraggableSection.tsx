/**
 * Draggable Section Component
 *
 * Individual draggable section item for the Section Configuration Builder
 * Supports drag-and-drop reordering with wedding industry specific UI
 *
 * @fileoverview Draggable section component with @dnd-kit integration
 */

'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Users,
  Camera,
  MapPin,
  Utensils,
  Flower2,
  Music,
  MessageCircle,
  Bell,
  FileText,
  BarChart3,
  CheckSquare,
} from 'lucide-react';

import type {
  DraggableSectionProps,
  UserSectionConfiguration,
  SectionType,
} from '@/types/section-configuration';

/**
 * Get icon for section type
 * Wedding industry specific icons for better user experience
 */
function getSectionIcon(sectionType: SectionType) {
  const icons = {
    overview: BarChart3,
    timeline: Calendar,
    budget: FileText,
    guest_list: Users,
    vendors: Users,
    tasks: CheckSquare,
    photography: Camera,
    venues: MapPin,
    catering: Utensils,
    flowers: Flower2,
    music: Music,
    messages: MessageCircle,
    notifications: Bell,
    documents: FileText,
    analytics: BarChart3,
    reports: FileText,
    custom: Settings,
  };

  return icons[sectionType] || Settings;
}

/**
 * Get display name for section type
 * Human-readable names for wedding industry sections
 */
function getSectionDisplayName(sectionType: SectionType): string {
  const names = {
    overview: 'Dashboard Overview',
    timeline: 'Wedding Timeline',
    budget: 'Budget Tracker',
    guest_list: 'Guest List',
    vendors: 'Vendor Directory',
    tasks: 'Task Manager',
    photography: 'Photo Gallery',
    venues: 'Venue Details',
    catering: 'Catering Menu',
    flowers: 'Floral Arrangements',
    music: 'Music Playlist',
    messages: 'Messages',
    notifications: 'Notifications',
    documents: 'Documents',
    analytics: 'Analytics',
    reports: 'Reports',
    custom: 'Custom Section',
  };

  return names[sectionType] || sectionType.replace('_', ' ');
}

/**
 * Get theme color for section type
 * Wedding industry appropriate color schemes
 */
function getSectionTheme(sectionType: SectionType): string {
  const themes = {
    overview: 'blue',
    timeline: 'purple',
    budget: 'green',
    guest_list: 'pink',
    vendors: 'indigo',
    tasks: 'yellow',
    photography: 'rose',
    venues: 'emerald',
    catering: 'orange',
    flowers: 'pink',
    music: 'violet',
    messages: 'cyan',
    notifications: 'amber',
    documents: 'slate',
    analytics: 'teal',
    reports: 'gray',
    custom: 'neutral',
  };

  return themes[sectionType] || 'gray';
}

/**
 * Draggable Section Component
 *
 * Individual section item that can be dragged to reorder
 * Includes visibility toggle, configuration access, and wedding industry styling
 */
export function DraggableSection({
  section,
  isSelected,
  isDragEnabled,
  onSelect,
  onUpdate,
  previewMode = false,
  className,
}: DraggableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getSectionIcon(section.section_type);
  const sectionTheme = getSectionTheme(section.section_type);
  const displayName =
    section.title || getSectionDisplayName(section.section_type);

  // Handle visibility toggle
  const handleVisibilityToggle = async (enabled: boolean) => {
    if (previewMode) return;

    try {
      await onUpdate({
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to toggle section visibility:', error);
    }
  };

  // Handle section selection
  const handleSelect = () => {
    if (previewMode) return;
    onSelect(section);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-section ${className} ${
        isDragging ? 'dragging' : ''
      } ${isSelected ? 'selected' : ''}`}
    >
      <Card
        className={`
        relative transition-all duration-200 cursor-pointer
        ${isSelected ? `ring-2 ring-${sectionTheme}-500 shadow-md` : 'hover:shadow-sm'}
        ${!section.is_enabled ? 'opacity-60' : ''}
        ${isDragging ? 'shadow-lg scale-102' : ''}
        ${previewMode ? 'pointer-events-none' : ''}
      `}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            {isDragEnabled && (
              <div
                {...attributes}
                {...listeners}
                className="
                  flex items-center justify-center w-6 h-6 
                  text-muted-foreground hover:text-foreground
                  cursor-grab active:cursor-grabbing
                  touch-none
                "
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            {/* Section Icon */}
            <div
              className={`
              flex items-center justify-center w-10 h-10 rounded-lg
              bg-${sectionTheme}-50 text-${sectionTheme}-600
              flex-shrink-0
            `}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Section Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{displayName}</h4>

                {/* Section Type Badge */}
                <Badge variant="outline" className="text-xs">
                  {section.section_type}
                </Badge>

                {/* Wedding Phase Badge */}
                {section.wedding_phase && (
                  <Badge variant="secondary" className="text-xs">
                    {section.wedding_phase.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              {/* Section Description */}
              {section.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {section.description}
                </p>
              )}

              {/* Section Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Order: {section.display_order}</span>
                {section.visibility_rules && (
                  <span>Rules: {section.visibility_rules.length}</span>
                )}
                {section.updated_at && (
                  <span>
                    Updated: {new Date(section.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Section Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Visibility Toggle */}
              {!previewMode && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.is_enabled}
                    onCheckedChange={handleVisibilityToggle}
                    aria-label={`Toggle ${displayName} visibility`}
                    size="sm"
                  />
                  <span className="sr-only">
                    {section.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center">
                {section.is_enabled ? (
                  <Eye
                    className="w-4 h-4 text-green-600"
                    title="Visible to users"
                  />
                ) : (
                  <EyeOff
                    className="w-4 h-4 text-muted-foreground"
                    title="Hidden from users"
                  />
                )}
              </div>

              {/* Configuration Button */}
              {!previewMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelect}
                  className="h-8 w-8 p-0"
                  title="Configure section"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div
              className={`
              absolute inset-0 rounded-lg pointer-events-none
              ring-2 ring-${sectionTheme}-500 ring-inset
            `}
            />
          )}

          {/* Drag Overlay Effect */}
          {isDragging && (
            <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
              <div className="text-sm font-medium text-muted-foreground">
                Moving section...
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wedding Industry Context Hints */}
      {isSelected && !previewMode && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-dashed">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Wedding Context:</div>
            <div>{getWeddingContextHint(section.section_type)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get wedding industry context hint for section type
 * Helps users understand when and why to use each section
 */
function getWeddingContextHint(sectionType: SectionType): string {
  const hints = {
    overview:
      'Shows key metrics and progress summary - perfect for quick status checks',
    timeline:
      'Essential for tracking wedding planning milestones and day-of schedule',
    budget:
      'Critical for expense tracking - hide from guests, share with trusted vendors',
    guest_list:
      'Core planning tool - manage RSVP, dietary requirements, seating',
    vendors:
      'Directory of wedding professionals - customize by services needed',
    tasks:
      'Action items and deadlines - great for couples and planners to stay organized',
    photography:
      'Photo galleries and shot lists - essential for photographers and couples',
    venues:
      'Venue details, floor plans, capacity info - useful during planning phase',
    catering:
      'Menu options, dietary accommodations - important for final planning',
    flowers:
      'Floral arrangements, bouquet designs - visual inspiration and orders',
    music: 'Playlists, timing, equipment - coordinate with DJs and venues',
    messages: 'Communication hub - keep all wedding conversations in one place',
    notifications:
      "Important alerts and reminders - don't miss critical updates",
    documents:
      'Contracts, permits, inspiration - organize all wedding paperwork',
    analytics:
      "Performance insights - see what's working in your planning process",
    reports: 'Detailed summaries - great for post-wedding analysis and reviews',
    custom: 'Personalized section - create something unique for your needs',
  };

  return (
    hints[sectionType] || 'Customize this section to fit your wedding needs'
  );
}

export default DraggableSection;
