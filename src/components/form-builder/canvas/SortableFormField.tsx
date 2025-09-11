'use client';

import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings, Copy, Trash2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeddingFormField,
  TierLimitations,
  FormBuilderDragData,
} from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormFieldPreview } from './FormFieldPreview';

interface SortableFormFieldProps {
  field: WeddingFormField;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (fieldId: string) => void;
  onUpdate: (field: WeddingFormField) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate: (fieldId: string) => void;
  tierLimitations: TierLimitations;
}

/**
 * SortableFormField - Individual draggable form field component
 *
 * Features:
 * - Drag and drop reordering
 * - Visual selection state
 * - Field actions (edit, duplicate, delete)
 * - Mobile-optimized touch interactions
 * - Wedding-specific field indicators
 * - Tier restriction badges
 */
export function SortableFormField({
  field,
  isSelected,
  isDragging,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  tierLimitations,
}: SortableFormFieldProps) {
  // Set up sortable functionality
  const { attributes, listeners, setNodeRef, transform, transition, active } =
    useSortable({
      id: field.id,
      data: {
        type: 'field',
        field: field,
      } as FormBuilderDragData,
    });

  // Transform styles for dragging
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if this field is premium/restricted
  const isPremiumField = useMemo(() => {
    return (
      field.tierRestriction &&
      !tierLimitations.availableFieldTypes.includes(field.type)
    );
  }, [field.tierRestriction, field.type, tierLimitations.availableFieldTypes]);

  // Check if field is being dragged by another instance
  const isGloballyDragging = active?.id === field.id;

  // Wedding context styling
  const weddingContextColor = useMemo(() => {
    switch (field.category) {
      case 'wedding':
        return 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950';
      case 'contact':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
      case 'preferences':
        return 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950';
      case 'logistics':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'business':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950';
    }
  }, [field.category]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border-2 transition-all duration-200',
        // Selection state
        isSelected &&
          'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900',
        // Dragging state
        isGloballyDragging && 'opacity-50 z-50 rotate-2 scale-105',
        isDragging && 'shadow-lg',
        // Wedding context colors
        field.isWeddingSpecific
          ? weddingContextColor
          : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950',
        // Premium field styling
        isPremiumField &&
          'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950',
        // Hover state
        'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700',
        // Mobile optimization
        'min-h-[60px] touch-manipulation',
      )}
      onClick={() => onSelect(field.id)}
      data-testid={`form-field-${field.type}`}
    >
      {/* Field Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'flex-shrink-0 p-1 rounded cursor-grab active:cursor-grabbing',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            // Mobile-optimized touch target
            'min-w-[44px] min-h-[44px] flex items-center justify-center',
            isSelected && 'text-blue-600 dark:text-blue-400',
          )}
          title="Drag to reorder"
          aria-label={`Drag to reorder ${field.label} field`}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Field Content */}
        <div className="flex-1 min-w-0">
          {/* Field Label and Badges */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {field.label || `Untitled ${field.type} field`}
            </h3>

            {/* Required Badge */}
            {field.required && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                Required
              </Badge>
            )}

            {/* Wedding-specific Badge */}
            {field.isWeddingSpecific && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
              >
                💍 Wedding
              </Badge>
            )}

            {/* Premium Badge */}
            {isPremiumField && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0.5 border-amber-300 text-amber-700 dark:text-amber-400"
              >
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          {/* Field Type and Description */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs mr-2">
              {field.type}
            </span>
            {field.helperText && (
              <span className="italic">{field.helperText}</span>
            )}
          </div>

          {/* Wedding Context Help */}
          {field.weddingContext?.helpText && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded border-l-2 border-rose-300">
              💡 {field.weddingContext.helpText}
              {field.weddingContext.photographerTip && (
                <div className="mt-1 font-medium">
                  📸 Photographer tip: {field.weddingContext.photographerTip}
                </div>
              )}
            </div>
          )}

          {/* Field Preview */}
          <FormFieldPreview field={field} />
        </div>

        {/* Field Actions */}
        <div
          className={cn(
            'flex-shrink-0 flex gap-1',
            // Show actions on selection or hover
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            isSelected && 'opacity-100',
          )}
        >
          {/* Configure Field */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(field.id); // This will open the config panel
            }}
            className="p-2 h-8 w-8"
            title="Configure field"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Duplicate Field */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(field.id);
            }}
            className="p-2 h-8 w-8"
            title="Duplicate field"
            disabled={
              tierLimitations.maxFields !== -1 && tierLimitations.maxFields <= 1
            } // Prevent if at max
          >
            <Copy className="w-4 h-4" />
          </Button>

          {/* Delete Field */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(field.id);
            }}
            className="p-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            title="Delete field"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      )}

      {/* Premium Overlay for Restricted Fields */}
      {isPremiumField && (
        <div className="absolute inset-0 bg-amber-100/20 dark:bg-amber-900/20 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-amber-100 dark:bg-amber-900 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Premium Feature</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Upgrade to use this field type
            </p>
          </div>
        </div>
      )}

      {/* Accessibility - Screen reader content */}
      <div className="sr-only">
        Form field: {field.label}, Type: {field.type}
        {field.required && ', Required field'}
        {field.isWeddingSpecific && ', Wedding-specific field'}
        {isPremiumField && ', Premium field - upgrade required'}
      </div>
    </div>
  );
}

export default SortableFormField;
