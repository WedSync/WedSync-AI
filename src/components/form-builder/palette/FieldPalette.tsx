'use client';

import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Crown,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeddingFieldType,
  WeddingFieldCategory,
  WEDDING_FIELD_TEMPLATES,
  WEDDING_FIELD_CATEGORIES,
  TierLimitations,
  FormBuilderDragData,
} from '@/types/form-builder';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FieldPaletteProps {
  availableFields: WeddingFieldType[];
  tierLimitations: TierLimitations;
  searchQuery: string;
  selectedCategory: WeddingFieldCategory | null;
  onFieldDragStart?: (fieldType: WeddingFieldType) => void;
  onFieldDragEnd?: () => void;
  className?: string;
}

/**
 * FieldPalette - Categorized field selection sidebar
 *
 * Features:
 * - Wedding-specific field categorization
 * - Search and filter functionality
 * - Tier-based field restrictions
 * - Drag and drop field creation
 * - Mobile-responsive collapsible categories
 * - Wedding industry context and tooltips
 */
export function FieldPalette({
  availableFields,
  tierLimitations,
  searchQuery,
  selectedCategory,
  onFieldDragStart,
  onFieldDragEnd,
  className,
}: FieldPaletteProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);
  const [expandedCategories, setExpandedCategories] = useState<
    Set<WeddingFieldCategory>
  >(
    new Set(['basic', 'wedding']), // Start with essential categories expanded
  );

  // Group fields by category
  const fieldsByCategory = useMemo(() => {
    const grouped: Record<WeddingFieldCategory, WeddingFieldType[]> = {
      [WeddingFieldCategory.BASIC]: [],
      [WeddingFieldCategory.WEDDING_DETAILS]: [],
      [WeddingFieldCategory.CONTACT_INFO]: [],
      [WeddingFieldCategory.PREFERENCES]: [],
      [WeddingFieldCategory.LOGISTICS]: [],
      [WeddingFieldCategory.BUSINESS]: [],
    };

    // Filter fields based on search query
    const filteredFieldTypes = Object.keys(
      WEDDING_FIELD_TEMPLATES,
    ) as WeddingFieldType[];
    const searchableFields = filteredFieldTypes.filter((fieldType) => {
      const template = WEDDING_FIELD_TEMPLATES[fieldType];
      const searchTerm = internalSearchQuery.toLowerCase();

      if (!searchTerm) return true;

      return (
        fieldType.toLowerCase().includes(searchTerm) ||
        template.label?.toLowerCase().includes(searchTerm) ||
        template.weddingContext?.helpText?.toLowerCase().includes(searchTerm) ||
        template.weddingContext?.photographerTip
          ?.toLowerCase()
          .includes(searchTerm)
      );
    });

    // Group filtered fields by category
    searchableFields.forEach((fieldType) => {
      const template = WEDDING_FIELD_TEMPLATES[fieldType];
      if (template.category) {
        grouped[template.category].push(fieldType);
      }
    });

    return grouped;
  }, [internalSearchQuery]);

  // Check if field is available for current tier
  const isFieldAvailable = (fieldType: WeddingFieldType) => {
    return tierLimitations.availableFieldTypes.includes(fieldType);
  };

  // Check if field is premium/advanced
  const isFieldPremium = (fieldType: WeddingFieldType) => {
    const template = WEDDING_FIELD_TEMPLATES[fieldType];
    return template.tierRestriction && !isFieldAvailable(fieldType);
  };

  // Toggle category expansion
  const toggleCategory = (category: WeddingFieldCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800',
          className,
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Field Library
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Drag fields to build your questionnaire
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search fields..."
              value={internalSearchQuery}
              onChange={(e) => setInternalSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Field Categories */}
        <div className="flex-1 overflow-auto">
          <div className="p-2">
            {WEDDING_FIELD_CATEGORIES.map((categoryInfo) => {
              const fieldsInCategory = fieldsByCategory[categoryInfo.id];
              const hasVisibleFields = fieldsInCategory.length > 0;

              if (!hasVisibleFields) return null;

              const isExpanded = expandedCategories.has(categoryInfo.id);

              return (
                <Collapsible
                  key={categoryInfo.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(categoryInfo.id)}
                  className="mb-2"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start p-3 h-auto hover:bg-gray-50 dark:hover:bg-gray-800',
                        selectedCategory === categoryInfo.id &&
                          'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800',
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {/* Category Icon */}
                        <span className="text-xl">{categoryInfo.icon}</span>

                        {/* Category Info */}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {categoryInfo.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {fieldsInCategory.length} field
                            {fieldsInCategory.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Expand/Collapse Icon */}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pl-4">
                    <div className="space-y-1 py-2">
                      {fieldsInCategory.map((fieldType) => (
                        <DraggableFieldItem
                          key={fieldType}
                          fieldType={fieldType}
                          template={WEDDING_FIELD_TEMPLATES[fieldType]}
                          isAvailable={isFieldAvailable(fieldType)}
                          isPremium={isFieldPremium(fieldType)}
                          onDragStart={onFieldDragStart}
                          onDragEnd={onFieldDragEnd}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* Footer - Tier Information */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <div className="flex items-center justify-between">
              <span>Available fields:</span>
              <Badge variant="outline" className="text-xs">
                {tierLimitations.availableFieldTypes.length}
              </Badge>
            </div>

            {tierLimitations.maxFields !== -1 && (
              <div className="flex items-center justify-between">
                <span>Max fields per form:</span>
                <Badge variant="outline" className="text-xs">
                  {tierLimitations.maxFields}
                </Badge>
              </div>
            )}

            {tierLimitations.advancedFields.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Crown className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    Premium fields available
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * DraggableFieldItem - Individual field item in the palette
 */
interface DraggableFieldItemProps {
  fieldType: WeddingFieldType;
  template: any;
  isAvailable: boolean;
  isPremium: boolean;
  onDragStart?: (fieldType: WeddingFieldType) => void;
  onDragEnd?: () => void;
}

function DraggableFieldItem({
  fieldType,
  template,
  isAvailable,
  isPremium,
  onDragStart,
  onDragEnd,
}: DraggableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${fieldType}`,
      data: {
        type: 'palette-field',
        fieldType: fieldType,
      } as FormBuilderDragData,
      disabled: !isAvailable,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 0.9 : 1})`,
      }
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            'group relative p-3 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing',
            // Available field styling
            isAvailable &&
              'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm bg-white dark:bg-gray-950',
            // Premium field styling
            isPremium &&
              'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 cursor-not-allowed opacity-70',
            // Wedding-specific field highlighting
            template.isWeddingSpecific &&
              isAvailable &&
              'ring-1 ring-rose-100 dark:ring-rose-900',
            // Dragging state
            isDragging && 'opacity-50 scale-95 rotate-2 shadow-lg z-50',
          )}
          onMouseDown={() => {
            if (isAvailable) {
              onDragStart?.(fieldType);
            }
          }}
          onMouseUp={onDragEnd}
          onTouchStart={() => {
            if (isAvailable) {
              onDragStart?.(fieldType);
            }
          }}
          onTouchEnd={onDragEnd}
        >
          {/* Field Header */}
          <div className="flex items-start gap-3 min-h-[44px]">
            {' '}
            {/* Mobile touch target */}
            {/* Field Type Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm">
              {getFieldTypeIcon(fieldType)}
            </div>
            {/* Field Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {template.label || fieldType}
                </h4>

                {/* Wedding-specific badge */}
                {template.isWeddingSpecific && (
                  <span className="text-xs">💍</span>
                )}

                {/* Premium badge */}
                {isPremium && <Crown className="w-3 h-3 text-amber-500" />}
              </div>

              {/* Field description */}
              {template.weddingContext?.helpText && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {template.weddingContext.helpText}
                </p>
              )}
            </div>
          </div>

          {/* Premium overlay */}
          {isPremium && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-orange-100/20 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg flex items-center justify-center">
              <div className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded text-xs font-medium text-amber-800 dark:text-amber-200">
                Upgrade Required
              </div>
            </div>
          )}

          {/* Drag hint */}
          {isAvailable && (
            <div className="absolute inset-0 bg-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Drag to add
              </div>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-medium">{template.label}</div>
          {template.weddingContext?.helpText && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {template.weddingContext.helpText}
            </div>
          )}
          {template.weddingContext?.photographerTip && (
            <div className="text-sm text-blue-600 dark:text-blue-400 border-t pt-2">
              💡 {template.weddingContext.photographerTip}
            </div>
          )}
          {isPremium && (
            <div className="text-sm text-amber-600 dark:text-amber-400 border-t pt-2">
              <Crown className="w-3 h-3 inline mr-1" />
              Premium feature - upgrade to use
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Get icon for field type
 */
function getFieldTypeIcon(fieldType: WeddingFieldType): string {
  const iconMap: Record<WeddingFieldType, string> = {
    text: '📝',
    email: '📧',
    tel: '📞',
    textarea: '📄',
    select: '📋',
    radio: '⚪',
    checkbox: '☑️',
    date: '📅',
    time: '🕐',
    file: '📎',
    number: '#️⃣',
    heading: '📌',
    paragraph: '📰',
    divider: '➖',
    image: '🖼️',
    signature: '✍️',
    'wedding-date': '💍',
    venue: '🏛️',
    'guest-count': '👥',
    'budget-range': '💰',
    'dietary-restrictions': '🍽️',
    'timeline-event': '⏰',
    'photo-preferences': '📸',
    'vendor-selection': '🤝',
    'package-selection': '📦',
  };

  return iconMap[fieldType] || '📝';
}

export default FieldPalette;
