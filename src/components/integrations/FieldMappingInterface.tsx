'use client';

/**
 * Field Mapping Interface Component
 * WS-343 - Team A - Round 1
 *
 * Advanced drag-and-drop field mapping interface for CRM integrations
 * Features: Visual field mapping, validation, auto-suggestions, field type matching
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  Active,
  Over,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Shuffle,
  RotateCcw,
  Wand2,
  Info,
  Link,
  Unlink,
  Eye,
  EyeOff,
} from 'lucide-react';

// UI Components (Untitled UI)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// Types
import type {
  FieldMappingInterfaceProps,
  CRMField,
  WedSyncField,
  FieldMapping,
  FieldType,
  MappingValidationResult,
} from '@/types/crm';

// Utils
import { cn } from '@/lib/utils';

interface DragItem {
  id: string;
  type: 'crm' | 'wedsync';
  field: CRMField | WedSyncField;
}

interface MappingPair {
  id: string;
  crmField: CRMField | null;
  wedSyncField: WedSyncField | null;
  isValid: boolean;
  confidence: number;
  suggestions?: string[];
}

export function FieldMappingInterface({
  crmFields,
  wedSyncFields,
  existingMappings = [],
  onMappingChange,
  onSave,
  onCancel,
  isLoading = false,
  className,
}: FieldMappingInterfaceProps) {
  // State Management
  const [mappings, setMappings] = useState<FieldMapping[]>(existingMappings);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showUnmapped, setShowUnmapped] = useState(true);
  const [validationResults, setValidationResults] = useState<
    MappingValidationResult[]
  >([]);
  const [autoSuggestionsEnabled, setAutoSuggestionsEnabled] = useState(true);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Process mappings into pairs for display
  const mappingPairs = useMemo(() => {
    const pairs: MappingPair[] = [];
    const usedCRMFields = new Set<string>();
    const usedWedSyncFields = new Set<string>();

    // Create pairs from existing mappings
    mappings.forEach((mapping, index) => {
      const crmField = crmFields.find((f) => f.id === mapping.crm_field_id);
      const wedSyncField = wedSyncFields.find(
        (f) => f.id === mapping.wedsync_field_id,
      );

      if (crmField && wedSyncField) {
        pairs.push({
          id: `mapping-${index}`,
          crmField,
          wedSyncField,
          isValid: validateFieldMapping(crmField, wedSyncField),
          confidence: calculateMappingConfidence(crmField, wedSyncField),
          suggestions: generateSuggestions(crmField, wedSyncFields),
        });

        usedCRMFields.add(crmField.id);
        usedWedSyncFields.add(wedSyncField.id);
      }
    });

    // Add unmapped CRM fields if showing unmapped
    if (showUnmapped) {
      crmFields
        .filter((field) => !usedCRMFields.has(field.id))
        .forEach((field, index) => {
          pairs.push({
            id: `unmapped-crm-${index}`,
            crmField: field,
            wedSyncField: null,
            isValid: false,
            confidence: 0,
            suggestions: generateSuggestions(field, wedSyncFields),
          });
        });
    }

    return pairs;
  }, [mappings, crmFields, wedSyncFields, showUnmapped]);

  // Auto-suggest mappings based on field names and types
  const generateAutoMappings = useCallback(() => {
    const autoMappings: FieldMapping[] = [];

    crmFields.forEach((crmField) => {
      const bestMatch = findBestFieldMatch(crmField, wedSyncFields);
      if (bestMatch && bestMatch.confidence > 0.7) {
        autoMappings.push({
          id: `auto-${crmField.id}-${bestMatch.field.id}`,
          crm_field_id: crmField.id,
          wedsync_field_id: bestMatch.field.id,
          transformation_rules: bestMatch.transformationRules || null,
          is_required: crmField.is_required || bestMatch.field.is_required,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    setMappings(autoMappings);
    onMappingChange(autoMappings);
  }, [crmFields, wedSyncFields, onMappingChange]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end - create or update mapping
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeField = findFieldById(active.id as string);
    const overField = findFieldById(over.id as string);

    if (activeField && overField && canCreateMapping(activeField, overField)) {
      createMapping(activeField, overField);
    }
  };

  // Find field by ID
  const findFieldById = (
    id: string,
  ): { type: 'crm' | 'wedsync'; field: CRMField | WedSyncField } | null => {
    const crmField = crmFields.find((f) => f.id === id);
    if (crmField) return { type: 'crm', field: crmField };

    const wedSyncField = wedSyncFields.find((f) => f.id === id);
    if (wedSyncField) return { type: 'wedsync', field: wedSyncField };

    return null;
  };

  // Check if mapping can be created
  const canCreateMapping = (
    field1: { type: 'crm' | 'wedsync'; field: CRMField | WedSyncField },
    field2: { type: 'crm' | 'wedsync'; field: CRMField | WedSyncField },
  ): boolean => {
    return (
      field1.type !== field2.type &&
      validateFieldTypes(field1.field.field_type, field2.field.field_type)
    );
  };

  // Create new mapping
  const createMapping = (
    field1: { type: 'crm' | 'wedsync'; field: CRMField | WedSyncField },
    field2: { type: 'crm' | 'wedsync'; field: CRMField | WedSyncField },
  ) => {
    const crmField =
      field1.type === 'crm'
        ? (field1.field as CRMField)
        : (field2.field as CRMField);
    const wedSyncField =
      field1.type === 'wedsync'
        ? (field1.field as WedSyncField)
        : (field2.field as WedSyncField);

    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      crm_field_id: crmField.id,
      wedsync_field_id: wedSyncField.id,
      transformation_rules: generateTransformationRules(crmField, wedSyncField),
      is_required: crmField.is_required || wedSyncField.is_required,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedMappings = [...mappings, newMapping];
    setMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  // Remove mapping
  const removeMapping = (mappingId: string) => {
    const updatedMappings = mappings.filter((m) => m.id !== mappingId);
    setMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  // Reset all mappings
  const resetMappings = () => {
    setMappings([]);
    onMappingChange([]);
  };

  // Calculate progress
  const mappingProgress = useMemo(() => {
    const requiredCRMFields = crmFields.filter((f) => f.is_required).length;
    const mappedRequiredFields = mappings.filter((mapping) => {
      const crmField = crmFields.find((f) => f.id === mapping.crm_field_id);
      return crmField?.is_required;
    }).length;

    return requiredCRMFields > 0
      ? (mappedRequiredFields / requiredCRMFields) * 100
      : 100;
  }, [mappings, crmFields]);

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={cn('space-y-6', className)}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Field Mapping</h2>
              <p className="text-sm text-muted-foreground">
                Map your CRM fields to WedSync fields to enable data
                synchronization
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnmapped(!showUnmapped)}
                  >
                    {showUnmapped ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showUnmapped
                    ? 'Hide unmapped fields'
                    : 'Show unmapped fields'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAutoMappings}
                    disabled={isLoading}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Auto-map
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Automatically suggest field mappings
                </TooltipContent>
              </Tooltip>

              <Button
                variant="outline"
                size="sm"
                onClick={resetMappings}
                disabled={isLoading || mappings.length === 0}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          {mappingProgress < 100 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Required field mapping progress</span>
                    <span>{Math.round(mappingProgress)}%</span>
                  </div>
                  <Progress value={mappingProgress} className="h-2" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Mapping Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CRM Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  CRM Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <SortableContext
                  items={crmFields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {crmFields.map((field) => (
                    <DraggableField
                      key={field.id}
                      field={field}
                      type="crm"
                      isMapped={mappings.some(
                        (m) => m.crm_field_id === field.id,
                      )}
                    />
                  ))}
                </SortableContext>
              </CardContent>
            </Card>

            {/* Mapping Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Mappings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mappingPairs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shuffle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No field mappings yet</p>
                    <p className="text-xs">
                      Drag fields from left to right to create mappings
                    </p>
                  </div>
                ) : (
                  mappingPairs.map((pair) => (
                    <MappingPairCard
                      key={pair.id}
                      pair={pair}
                      onRemove={() => {
                        const mappingToRemove = mappings.find(
                          (m) =>
                            m.crm_field_id === pair.crmField?.id &&
                            m.wedsync_field_id === pair.wedSyncField?.id,
                        );
                        if (mappingToRemove) {
                          removeMapping(mappingToRemove.id);
                        }
                      }}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* WedSync Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  WedSync Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <SortableContext
                  items={wedSyncFields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {wedSyncFields.map((field) => (
                    <DraggableField
                      key={field.id}
                      field={field}
                      type="wedsync"
                      isMapped={mappings.some(
                        (m) => m.wedsync_field_id === field.id,
                      )}
                    />
                  ))}
                </SortableContext>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {mappings.length} field{mappings.length !== 1 ? 's' : ''} mapped
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => onSave(mappings)}
                disabled={isLoading || mappingProgress < 100}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Mapping
              </Button>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? <DragOverlayField fieldId={activeId} /> : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}

// Draggable Field Component
interface DraggableFieldProps {
  field: CRMField | WedSyncField;
  type: 'crm' | 'wedsync';
  isMapped: boolean;
}

function DraggableField({ field, type, isMapped }: DraggableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'p-3 rounded-lg border cursor-move transition-all',
        isDragging && 'opacity-50 scale-105 shadow-lg',
        isMapped
          ? 'bg-green-50 border-green-200 text-green-900'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300',
        type === 'crm'
          ? 'border-l-4 border-l-blue-500'
          : 'border-l-4 border-l-green-500',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{field.display_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {field.field_name}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <Badge variant="outline" className="text-xs">
            {field.field_type}
          </Badge>

          {field.is_required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}

          {isMapped && <CheckCircle className="h-4 w-4 text-green-600" />}
        </div>
      </div>
    </div>
  );
}

// Mapping Pair Card Component
interface MappingPairCardProps {
  pair: MappingPair;
  onRemove: () => void;
}

function MappingPairCard({ pair, onRemove }: MappingPairCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        pair.isValid
          ? 'bg-green-50 border-green-200'
          : pair.crmField && pair.wedSyncField
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {pair.crmField ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {pair.crmField.display_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {pair.crmField.field_type}
              </p>
            </div>
          ) : (
            <div className="flex-1 text-sm text-muted-foreground italic">
              No CRM field selected
            </div>
          )}

          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {pair.wedSyncField ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {pair.wedSyncField.display_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {pair.wedSyncField.field_type}
              </p>
            </div>
          ) : (
            <div className="flex-1 text-sm text-muted-foreground italic">
              No WedSync field selected
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          {pair.isValid ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : pair.crmField && pair.wedSyncField ? (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          ) : null}

          {pair.crmField && pair.wedSyncField && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0"
            >
              <Unlink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {pair.confidence > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Confidence: {Math.round(pair.confidence * 100)}%
        </div>
      )}
    </div>
  );
}

// Drag Overlay Field Component
interface DragOverlayFieldProps {
  fieldId: string;
}

function DragOverlayField({ fieldId }: DragOverlayFieldProps) {
  // This would need access to the field data - simplified for now
  return (
    <div className="p-3 rounded-lg border bg-white shadow-lg opacity-90">
      <div className="text-sm font-medium">Dragging field...</div>
    </div>
  );
}

// Utility Functions
function validateFieldMapping(
  crmField: CRMField,
  wedSyncField: WedSyncField,
): boolean {
  return validateFieldTypes(crmField.field_type, wedSyncField.field_type);
}

function validateFieldTypes(
  crmType: FieldType,
  wedSyncType: FieldType,
): boolean {
  // Define compatible field type mappings
  const compatibleTypes: Record<FieldType, FieldType[]> = {
    text: ['text', 'textarea', 'email', 'phone'],
    textarea: ['text', 'textarea'],
    email: ['text', 'email'],
    phone: ['text', 'phone'],
    number: ['number', 'currency'],
    currency: ['number', 'currency'],
    date: ['date', 'datetime'],
    datetime: ['date', 'datetime'],
    boolean: ['boolean'],
    select: ['select', 'text'],
    multiselect: ['multiselect', 'textarea'],
    url: ['url', 'text'],
  };

  return compatibleTypes[crmType]?.includes(wedSyncType) || false;
}

function calculateMappingConfidence(
  crmField: CRMField,
  wedSyncField: WedSyncField,
): number {
  let confidence = 0;

  // Name similarity
  const nameSimilarity = calculateStringSimilarity(
    crmField.field_name.toLowerCase(),
    wedSyncField.field_name.toLowerCase(),
  );
  confidence += nameSimilarity * 0.4;

  // Display name similarity
  const displaySimilarity = calculateStringSimilarity(
    crmField.display_name.toLowerCase(),
    wedSyncField.display_name.toLowerCase(),
  );
  confidence += displaySimilarity * 0.3;

  // Type compatibility
  if (validateFieldTypes(crmField.field_type, wedSyncField.field_type)) {
    confidence += 0.3;
  }

  return Math.min(confidence, 1);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[str2.length][str1.length];
}

function findBestFieldMatch(
  crmField: CRMField,
  wedSyncFields: WedSyncField[],
): {
  field: WedSyncField;
  confidence: number;
  transformationRules?: any;
} | null {
  let bestMatch = null;
  let highestConfidence = 0;

  for (const wedSyncField of wedSyncFields) {
    const confidence = calculateMappingConfidence(crmField, wedSyncField);
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = { field: wedSyncField, confidence };
    }
  }

  return bestMatch;
}

function generateSuggestions(
  crmField: CRMField,
  wedSyncFields: WedSyncField[],
): string[] {
  return wedSyncFields
    .filter((field) =>
      validateFieldTypes(crmField.field_type, field.field_type),
    )
    .sort(
      (a, b) =>
        calculateMappingConfidence(crmField, b) -
        calculateMappingConfidence(crmField, a),
    )
    .slice(0, 3)
    .map((field) => field.display_name);
}

function generateTransformationRules(
  crmField: CRMField,
  wedSyncField: WedSyncField,
): any {
  // Generate basic transformation rules based on field types
  if (crmField.field_type !== wedSyncField.field_type) {
    return {
      sourceType: crmField.field_type,
      targetType: wedSyncField.field_type,
      transformation: 'type_conversion',
    };
  }

  return null;
}
