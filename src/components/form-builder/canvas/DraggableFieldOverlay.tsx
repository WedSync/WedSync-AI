'use client';

import React from 'react';
import { GripVertical, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FormBuilderDragData,
  WEDDING_FIELD_TEMPLATES,
} from '@/types/form-builder';
import { Badge } from '@/components/ui/badge';

interface DraggableFieldOverlayProps {
  dragData: FormBuilderDragData;
}

/**
 * DraggableFieldOverlay - Visual overlay shown during drag operations
 *
 * This component renders the visual representation of the item being dragged,
 * whether it's a field from the palette or an existing field being reordered.
 * It provides clear visual feedback with wedding-themed styling.
 */
export function DraggableFieldOverlay({
  dragData,
}: DraggableFieldOverlayProps) {
  // Get field information based on drag type
  const fieldInfo =
    dragData.type === 'field' && dragData.field
      ? dragData.field
      : dragData.fieldType
        ? WEDDING_FIELD_TEMPLATES[dragData.fieldType]
        : null;

  if (!fieldInfo) {
    return null;
  }

  // Determine if this is a wedding-specific field
  const isWeddingSpecific =
    dragData.type === 'field'
      ? dragData.field?.isWeddingSpecific
      : WEDDING_FIELD_TEMPLATES[dragData.fieldType!]?.isWeddingSpecific;

  // Determine tier restriction
  const tierRestriction =
    dragData.type === 'field'
      ? dragData.field?.tierRestriction
      : WEDDING_FIELD_TEMPLATES[dragData.fieldType!]?.tierRestriction;

  // Wedding context color based on category
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'wedding':
        return 'border-rose-300 bg-rose-100 dark:border-rose-700 dark:bg-rose-900';
      case 'contact':
        return 'border-blue-300 bg-blue-100 dark:border-blue-700 dark:bg-blue-900';
      case 'preferences':
        return 'border-purple-300 bg-purple-100 dark:border-purple-700 dark:bg-purple-900';
      case 'logistics':
        return 'border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900';
      case 'business':
        return 'border-amber-300 bg-amber-100 dark:border-amber-700 dark:bg-amber-900';
      default:
        return 'border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900';
    }
  };

  const categoryColor = getCategoryColor(
    dragData.type === 'field'
      ? dragData.field?.category
      : WEDDING_FIELD_TEMPLATES[dragData.fieldType!]?.category,
  );

  return (
    <div
      className={cn(
        'rounded-lg border-2 shadow-xl transform rotate-3 scale-105 transition-all',
        // Wedding-specific styling
        isWeddingSpecific
          ? categoryColor
          : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900',
        // Premium field styling
        tierRestriction &&
          'border-amber-400 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900',
        // Drag shadow and glow
        'shadow-2xl ring-4 ring-blue-200 dark:ring-blue-800',
        // Width constraint for readability
        'w-80 max-w-sm',
      )}
      style={{
        // Add a subtle glow effect
        boxShadow:
          '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 4px rgba(59, 130, 246, 0.3)',
      }}
    >
      {/* Overlay Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <div className="flex-shrink-0 p-1 text-blue-600 dark:text-blue-400">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Field Content */}
        <div className="flex-1 min-w-0">
          {/* Field Label and Badges */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {fieldInfo.label || `${dragData.fieldType} field`}
            </h3>

            {/* Wedding-specific Badge */}
            {isWeddingSpecific && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
              >
                💍
              </Badge>
            )}

            {/* Premium Badge */}
            {tierRestriction && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0.5 border-amber-300 text-amber-700 dark:text-amber-400"
              >
                <Crown className="w-3 h-3" />
              </Badge>
            )}
          </div>

          {/* Field Type */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs">
              {dragData.fieldType || dragData.field?.type}
            </span>
          </div>

          {/* Wedding Context Preview */}
          {isWeddingSpecific && fieldInfo.weddingContext?.helpText && (
            <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded border-l-2 border-rose-300">
              💡 {fieldInfo.weddingContext.helpText}
            </div>
          )}
        </div>
      </div>

      {/* Drag Action Indicator */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-blue-50 dark:bg-blue-950/50">
        <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium">
            {dragData.type === 'palette-field'
              ? 'Adding to questionnaire...'
              : 'Moving field...'}
          </span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Wedding Ring Animation */}
      {isWeddingSpecific && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <span className="text-white text-xs">💍</span>
          </div>
        </div>
      )}

      {/* Premium Crown Animation */}
      {tierRestriction && (
        <div className="absolute -top-2 -left-2">
          <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <Crown className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export default DraggableFieldOverlay;
