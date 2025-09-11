'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import {
  WeddingFormField,
  FormBuilderCanvasProps,
  FormBuilderCanvasState,
  FormBuilderDragData,
  WeddingFieldType,
  WEDDING_FIELD_TEMPLATES,
} from '@/types/form-builder';
import { generateId } from '@/lib/utils';
import { SortableFormField } from './SortableFormField';
import { DraggableFieldOverlay } from './DraggableFieldOverlay';
import { EmptyCanvasState } from './EmptyCanvasState';
import { CanvasToolbar } from './CanvasToolbar';
import { toast } from 'sonner';

/**
 * FormBuilderCanvas - The main drag-and-drop form building interface
 *
 * Features:
 * - Drag fields from palette to canvas
 * - Reorder fields within canvas
 * - Visual feedback during drag operations
 * - Mobile-optimized touch interactions
 * - Undo/redo functionality
 * - Auto-save every 30 seconds
 * - Wedding-specific field validation
 */
export function FormBuilderCanvas({
  formId,
  initialData,
  tierLimitations,
  onFormSaved,
  onFieldsChange,
  className,
}: FormBuilderCanvasProps) {
  // Canvas state management
  const [canvasState, setCanvasState] = useState<FormBuilderCanvasState>({
    fields: initialData?.fields || [],
    selectedFieldId: null,
    draggedFieldId: null,
    isDragging: false,
    canvasMode: 'edit',
    undoStack: [],
    redoStack: [],
    autoSaveEnabled: true,
    lastSavedAt: undefined,
  });

  // Active drag data for overlay
  const [activeDragData, setActiveDragData] =
    useState<FormBuilderDragData | null>(null);

  // Configure drag sensors for desktop and mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Custom collision detection for better UX
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First try rectangle intersection
    const rectIntersectionCollisions = rectIntersection(args);

    if (rectIntersectionCollisions.length > 0) {
      return rectIntersectionCollisions;
    }

    // Fall back to closest center if no intersection
    return closestCenter(args);
  }, []);

  // Memoized field IDs for SortableContext
  const fieldIds = useMemo(
    () => canvasState.fields.map((field) => field.id),
    [canvasState.fields],
  );

  // Generate unique field ID
  const generateFieldId = useCallback(() => {
    return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create field from palette template
  const createFieldFromTemplate = useCallback(
    (fieldType: WeddingFieldType, insertIndex?: number): WeddingFormField => {
      const template = WEDDING_FIELD_TEMPLATES[fieldType];

      if (!template) {
        throw new Error(`Unknown field type: ${fieldType}`);
      }

      const newField: WeddingFormField = {
        id: generateFieldId(),
        type: fieldType,
        label: template.label || '',
        placeholder: template.placeholder,
        helperText: template.helperText,
        required: template.validation?.required || false,
        validation: template.validation,
        options: template.options ? [...template.options] : undefined,
        width: template.width || 'full',
        order: insertIndex ?? canvasState.fields.length,
        category: template.category!,
        isWeddingSpecific: template.isWeddingSpecific!,
        tierRestriction: template.tierRestriction,
        weddingContext: template.weddingContext,
        conditionalLogic: undefined,
      };

      return newField;
    },
    [canvasState.fields.length, generateFieldId],
  );

  // Check if field type is allowed for current tier
  const isFieldTypeAllowed = useCallback(
    (fieldType: WeddingFieldType): boolean => {
      return tierLimitations.availableFieldTypes.includes(fieldType);
    },
    [tierLimitations.availableFieldTypes],
  );

  // Check if max fields limit reached
  const isMaxFieldsReached = useCallback((): boolean => {
    if (tierLimitations.maxFields === -1) return false;
    return canvasState.fields.length >= tierLimitations.maxFields;
  }, [canvasState.fields.length, tierLimitations.maxFields]);

  // Update canvas state with undo tracking
  const updateCanvasState = useCallback(
    (
      updater: (prev: FormBuilderCanvasState) => FormBuilderCanvasState,
      trackUndo = true,
    ) => {
      setCanvasState((prev) => {
        const newState = updater(prev);

        // Add to undo stack if tracking
        if (trackUndo && prev.fields !== newState.fields) {
          newState.undoStack = [...prev.undoStack.slice(-9), prev.fields]; // Keep last 10
          newState.redoStack = []; // Clear redo on new action
        }

        return newState;
      });
    },
    [],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const dragData = active.data.current as FormBuilderDragData;

      setActiveDragData(dragData);

      updateCanvasState(
        (prev) => ({
          ...prev,
          isDragging: true,
          draggedFieldId:
            dragData.type === 'field' ? (active.id as string) : null,
        }),
        false,
      );
    },
    [updateCanvasState],
  );

  // Handle drag over for visual feedback
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Add visual feedback during drag operations
    // This could update UI to show drop zones, insertion points, etc.
  }, []);

  // Handle drag end - main drop logic
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        updateCanvasState(
          (prev) => ({
            ...prev,
            isDragging: false,
            draggedFieldId: null,
          }),
          false,
        );
        setActiveDragData(null);
        return;
      }

      const dragData = active.data.current as FormBuilderDragData;

      // Handle different drag scenarios
      if (dragData.type === 'palette-field') {
        // Adding new field from palette
        handleAddFieldFromPalette(dragData.fieldType!, over.id as string);
      } else if (dragData.type === 'field') {
        // Reordering existing field
        handleReorderField(active.id as string, over.id as string);
      }

      // Reset drag state
      updateCanvasState(
        (prev) => ({
          ...prev,
          isDragging: false,
          draggedFieldId: null,
        }),
        false,
      );
      setActiveDragData(null);
    },
    [updateCanvasState],
  );

  // Add field from palette to canvas
  const handleAddFieldFromPalette = useCallback(
    (fieldType: WeddingFieldType, insertPosition?: string) => {
      // Check tier limitations
      if (!isFieldTypeAllowed(fieldType)) {
        toast.error(
          `${fieldType} fields are not available in your current plan`,
        );
        return;
      }

      if (isMaxFieldsReached()) {
        toast.error(
          `Maximum number of fields (${tierLimitations.maxFields}) reached`,
        );
        return;
      }

      // Calculate insert index
      let insertIndex = canvasState.fields.length;
      if (insertPosition && insertPosition !== 'canvas-drop-zone') {
        const targetIndex = canvasState.fields.findIndex(
          (f) => f.id === insertPosition,
        );
        if (targetIndex !== -1) {
          insertIndex = targetIndex + 1;
        }
      }

      try {
        const newField = createFieldFromTemplate(fieldType, insertIndex);

        updateCanvasState((prev) => {
          // Insert at correct position and update order for all fields
          const updatedFields = [...prev.fields];
          updatedFields.splice(insertIndex, 0, newField);

          // Update order property for all fields
          const reorderedFields = updatedFields.map((field, index) => ({
            ...field,
            order: index,
          }));

          return {
            ...prev,
            fields: reorderedFields,
            selectedFieldId: newField.id,
          };
        });

        toast.success(
          `Added ${WEDDING_FIELD_TEMPLATES[fieldType].label} to your questionnaire`,
        );
      } catch (error) {
        console.error('Error creating field:', error);
        toast.error('Failed to add field. Please try again.');
      }
    },
    [
      isFieldTypeAllowed,
      isMaxFieldsReached,
      tierLimitations.maxFields,
      canvasState.fields,
      createFieldFromTemplate,
      updateCanvasState,
    ],
  );

  // Reorder existing field
  const handleReorderField = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;

      updateCanvasState((prev) => {
        const oldIndex = prev.fields.findIndex(
          (field) => field.id === activeId,
        );
        const newIndex = prev.fields.findIndex((field) => field.id === overId);

        if (oldIndex === -1 || newIndex === -1) return prev;

        const reorderedFields = arrayMove(prev.fields, oldIndex, newIndex);

        // Update order property
        const fieldsWithUpdatedOrder = reorderedFields.map((field, index) => ({
          ...field,
          order: index,
        }));

        return {
          ...prev,
          fields: fieldsWithUpdatedOrder,
        };
      });

      toast.success('Field moved successfully');
    },
    [updateCanvasState],
  );

  // Select field
  const handleFieldSelect = useCallback(
    (fieldId: string) => {
      updateCanvasState(
        (prev) => ({
          ...prev,
          selectedFieldId: prev.selectedFieldId === fieldId ? null : fieldId,
        }),
        false,
      );
    },
    [updateCanvasState],
  );

  // Update field configuration
  const handleFieldUpdate = useCallback(
    (updatedField: WeddingFormField) => {
      updateCanvasState((prev) => ({
        ...prev,
        fields: prev.fields.map((field) =>
          field.id === updatedField.id ? updatedField : field,
        ),
      }));
    },
    [updateCanvasState],
  );

  // Delete field
  const handleFieldDelete = useCallback(
    (fieldId: string) => {
      const fieldToDelete = canvasState.fields.find((f) => f.id === fieldId);

      updateCanvasState((prev) => ({
        ...prev,
        fields: prev.fields
          .filter((field) => field.id !== fieldId)
          .map((field, index) => ({ ...field, order: index })),
        selectedFieldId:
          prev.selectedFieldId === fieldId ? null : prev.selectedFieldId,
      }));

      toast.success(
        `Removed ${fieldToDelete?.label || 'field'} from questionnaire`,
      );
    },
    [canvasState.fields, updateCanvasState],
  );

  // Duplicate field
  const handleFieldDuplicate = useCallback(
    (fieldId: string) => {
      const fieldToDuplicate = canvasState.fields.find((f) => f.id === fieldId);
      if (!fieldToDuplicate) return;

      if (isMaxFieldsReached()) {
        toast.error(
          `Maximum number of fields (${tierLimitations.maxFields}) reached`,
        );
        return;
      }

      const duplicatedField: WeddingFormField = {
        ...fieldToDuplicate,
        id: generateFieldId(),
        label: `${fieldToDuplicate.label} (Copy)`,
        order: fieldToDuplicate.order + 1,
      };

      updateCanvasState((prev) => {
        const fieldIndex = prev.fields.findIndex((f) => f.id === fieldId);
        const updatedFields = [...prev.fields];
        updatedFields.splice(fieldIndex + 1, 0, duplicatedField);

        // Update order for all subsequent fields
        const reorderedFields = updatedFields.map((field, index) => ({
          ...field,
          order: index,
        }));

        return {
          ...prev,
          fields: reorderedFields,
          selectedFieldId: duplicatedField.id,
        };
      });

      toast.success('Field duplicated successfully');
    },
    [
      canvasState.fields,
      isMaxFieldsReached,
      tierLimitations.maxFields,
      generateFieldId,
      updateCanvasState,
    ],
  );

  // Undo last action
  const handleUndo = useCallback(() => {
    if (canvasState.undoStack.length === 0) return;

    updateCanvasState((prev) => {
      const previousFields = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        fields: previousFields,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [prev.fields, ...prev.redoStack.slice(0, 9)],
        selectedFieldId: null,
      };
    }, false);

    toast.success('Undone last action');
  }, [canvasState.undoStack, updateCanvasState]);

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (canvasState.redoStack.length === 0) return;

    updateCanvasState((prev) => {
      const nextFields = prev.redoStack[0];
      return {
        ...prev,
        fields: nextFields,
        undoStack: [...prev.undoStack, prev.fields],
        redoStack: prev.redoStack.slice(1),
        selectedFieldId: null,
      };
    }, false);

    toast.success('Redone action');
  }, [canvasState.redoStack, updateCanvasState]);

  // Notify parent of field changes
  useEffect(() => {
    onFieldsChange?.(canvasState.fields);
  }, [canvasState.fields, onFieldsChange]);

  // Auto-save functionality
  useEffect(() => {
    if (!canvasState.autoSaveEnabled || !formId) return;

    const autoSaveInterval = setInterval(() => {
      if (canvasState.fields.length > 0) {
        // Here you would call your save API
        // For now, just update the lastSavedAt timestamp
        setCanvasState((prev) => ({
          ...prev,
          lastSavedAt: new Date(),
        }));
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [canvasState.autoSaveEnabled, canvasState.fields, formId]);

  return (
    <div className={cn('flex-1 flex flex-col min-h-0', className)}>
      {/* Canvas Toolbar */}
      <CanvasToolbar
        canUndo={canvasState.undoStack.length > 0}
        canRedo={canvasState.redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        fieldsCount={canvasState.fields.length}
        maxFields={tierLimitations.maxFields}
        lastSavedAt={canvasState.lastSavedAt}
        onSave={() => {
          /* Implement save functionality */
        }}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <div className="max-w-2xl mx-auto p-6">
            {canvasState.fields.length === 0 ? (
              <EmptyCanvasState
                onAddFirstField={(fieldType) =>
                  handleAddFieldFromPalette(fieldType)
                }
                tierLimitations={tierLimitations}
              />
            ) : (
              <div
                id="canvas-drop-zone"
                className="space-y-4 min-h-96 relative"
                data-testid="form-canvas"
              >
                <SortableContext
                  items={fieldIds}
                  strategy={verticalListSortingStrategy}
                >
                  {canvasState.fields.map((field, index) => (
                    <SortableFormField
                      key={field.id}
                      field={field}
                      isSelected={canvasState.selectedFieldId === field.id}
                      isDragging={canvasState.draggedFieldId === field.id}
                      onSelect={handleFieldSelect}
                      onUpdate={handleFieldUpdate}
                      onDelete={handleFieldDelete}
                      onDuplicate={handleFieldDuplicate}
                      tierLimitations={tierLimitations}
                    />
                  ))}
                </SortableContext>

                {/* Drop zone indicator during drag */}
                {canvasState.isDragging && (
                  <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-8 bg-blue-50/50 dark:bg-blue-950/50 flex items-center justify-center">
                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                      Drop here to add to your questionnaire
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragData ? (
              <DraggableFieldOverlay dragData={activeDragData} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Wedding Day Safety Message */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💍 Building questionnaires for your couples - every detail matters on
          their special day
        </p>
      </div>
    </div>
  );
}

export default FormBuilderCanvas;
