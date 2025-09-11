# TEAM A - ROUND 1: WS-306 - Forms System Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build drag-and-drop form builder UI with wedding-specific field types, AI-powered form generation, and real-time form preview
**FEATURE ID:** WS-306 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about form builder UX, wedding vendor workflows, and dynamic form creation experiences

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FORM BUILDER FUNCTIONALITY PROOF:**
```bash
open http://localhost:3000/forms/builder
# MUST show: Drag-and-drop form builder with wedding field types working smoothly
```

2. **DYNAMIC FIELD CREATION VERIFICATION:**
```bash
# Test adding wedding-specific fields
# Navigate to form builder, drag "Wedding Date" field to canvas
# MUST show: Field appears with proper wedding date validation and styling
```

3. **REAL-TIME PREVIEW VALIDATION:**
```bash
# Test form preview updates
# Add fields to builder and check preview panel
# MUST show: Form preview updates instantly as fields are added/modified
```

## 🧠 SEQUENTIAL THINKING FOR FORM BUILDER UI

```typescript
// Form builder UI complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding form builder needs: Drag-and-drop interface for field placement, wedding-specific field types (wedding date, venue address, guest count, dietary restrictions), real-time preview showing couple's perspective, AI-powered form suggestions based on vendor type, and integration with existing form templates.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor form creation patterns: Photographers need timeline questions and shot preferences, venues require guest counts and catering needs, florists ask about color schemes and allergy information, coordinators collect vendor contact details and special requirements. Each vendor type has unique form templates and common fields.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Form builder UX requirements: Left sidebar with draggable field palette, central canvas for form layout, right panel for field properties and settings, bottom preview showing couple's view, undo/redo functionality, save/publish controls, and responsive design for mobile form editing.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Technical implementation approach: Use @dnd-kit for drag-and-drop, React Hook Form for form validation, Zod schemas for field validation, AI integration for smart field suggestions, real-time preview with iframe or styled component, and optimistic UI updates for smooth interaction.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA FORM BUILDER PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing form and drag-drop patterns
await mcp__serena__search_for_pattern("dnd-kit drag drop form builder");
await mcp__serena__find_symbol("DndContext Droppable Draggable", "$WS_ROOT/wedsync/src/components/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/forms/");

// Study existing form field components
await mcp__serena__find_referencing_symbols("Input Select TextArea FormField");
```

### B. FORM BUILDER DOCUMENTATION LOADING
```typescript
// Load drag-and-drop and form builder documentation
// Use Ref MCP to search for:
# - "dnd-kit React drag drop implementation"
# - "React Hook Form dynamic form building"
# - "Form builder UI design patterns"

// Load wedding-specific form design patterns
// Use Ref MCP to search for:
# - "Wedding form field types best practices"
# - "Progressive form design principles"
# - "Real-time preview implementation patterns"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Form Builder Layout** (`$WS_ROOT/wedsync/src/components/forms/FormBuilder.tsx`)
  - Three-panel layout with field palette, canvas, and properties
  - Drag-and-drop interface using @dnd-kit
  - Responsive design for mobile and desktop form editing
  - Evidence: Form builder loads smoothly, all panels functional

- [ ] **Wedding Field Types Palette** (`$WS_ROOT/wedsync/src/components/forms/FormFieldPalette.tsx`)
  - Complete set of wedding-specific field types
  - Draggable field components with preview icons
  - Categorized fields (basic, wedding, contact, advanced)
  - Evidence: All wedding field types draggable and functional

- [ ] **Dynamic Form Canvas** (`$WS_ROOT/wedsync/src/components/forms/FormCanvas.tsx`)
  - Drop zone for form field arrangement
  - Visual feedback for drop targeting
  - Field reordering and deletion capabilities
  - Evidence: Fields can be dropped, reordered, and removed smoothly

- [ ] **Field Properties Panel** (`$WS_ROOT/wedsync/src/components/forms/FieldPropertiesPanel.tsx`)
  - Context-sensitive field configuration
  - Validation rules and options setup
  - Wedding-specific field mapping configuration
  - Evidence: Field properties update correctly when fields selected

- [ ] **Real-time Form Preview** (`$WS_ROOT/wedsync/src/components/forms/FormPreview.tsx`)
  - Live preview of form as couples would see it
  - Responsive preview modes (mobile/desktop)
  - Interactive preview with validation testing
  - Evidence: Preview updates instantly as form is modified

## 🎨 DRAG-AND-DROP FORM BUILDER IMPLEMENTATION

### Main Form Builder Component
```typescript
// File: $WS_ROOT/wedsync/src/components/forms/FormBuilder.tsx

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FormFieldPalette } from './FormFieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldPropertiesPanel } from './FieldPropertiesPanel';
import { FormPreview } from './FormPreview';
import { generateId } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Save, Eye, Play, Undo, Redo, Wand2 } from 'lucide-react';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'textarea' | 'number' | 'wedding_date' | 'venue_address' | 'guest_count';
  label: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  mapping?: string;
  position: number;
}

interface FormBuilderProps {
  formId?: string;
  initialFields?: FormField[];
  onSave: (formData: { title: string; description?: string; fields: FormField[] }) => Promise<void>;
  onPublish: (formId: string) => Promise<void>;
}

export function FormBuilder({ formId, initialFields = [], onSave, onPublish }: FormBuilderProps) {
  const [formFields, setFormFields] = useState<FormField[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [formTitle, setFormTitle] = useState('New Wedding Form');
  const [formDescription, setFormDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [undoStack, setUndoStack] = useState<FormField[][]>([]);
  const [redoStack, setRedoStack] = useState<FormField[][]>([]);
  
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const selectedField = useMemo(() => 
    formFields.find(field => field.id === selectedFieldId),
    [formFields, selectedFieldId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    // Save current state for undo
    setUndoStack(prev => [...prev, formFields]);
    setRedoStack([]);

    if (active.data.current?.type === 'field-type') {
      // Adding new field from palette
      const fieldType = active.id as FormField['type'];
      const newField: FormField = {
        id: generateId(),
        type: fieldType,
        label: getDefaultLabel(fieldType),
        required: false,
        position: formFields.length,
        ...(fieldType === 'select' || fieldType === 'multiselect' ? { options: ['Option 1', 'Option 2'] } : {}),
        ...(isWeddingField(fieldType) ? { mapping: getWeddingMapping(fieldType) } : {}),
      };

      setFormFields(prev => [...prev, newField]);
      setSelectedFieldId(newField.id);
      
      toast({
        title: "Field added",
        description: `${newField.label} has been added to your form`,
      });
    } else if (active.data.current?.type === 'form-field' && over.id !== active.id) {
      // Reordering existing fields
      setFormFields(prev => {
        const oldIndex = prev.findIndex(field => field.id === active.id);
        const newIndex = prev.findIndex(field => field.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex).map((field, index) => ({
            ...field,
            position: index
          }));
        }
        return prev;
      });
    }

    setActiveId(null);
  }, [formFields, toast]);

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setUndoStack(prev => [...prev, formFields]);
    setRedoStack([]);
    
    setFormFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  }, [formFields]);

  const handleFieldDelete = useCallback((fieldId: string) => {
    setUndoStack(prev => [...prev, formFields]);
    setRedoStack([]);
    
    setFormFields(prev => prev.filter(field => field.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    
    toast({
      title: "Field removed",
      description: "The form field has been removed",
    });
  }, [formFields, selectedFieldId, toast]);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [formFields, ...prev]);
      setFormFields(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, formFields]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev, formFields]);
      setFormFields(nextState);
      setRedoStack(prev => prev.slice(1));
    }
  }, [redoStack, formFields]);

  const handleGenerateForm = useCallback(async (vendorType: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_type: vendorType })
      });

      if (response.ok) {
        const { fields, title, description } = await response.json();
        
        setUndoStack(prev => [...prev, formFields]);
        setRedoStack([]);
        setFormFields(fields);
        setFormTitle(title);
        setFormDescription(description);
        
        toast({
          title: "Form generated",
          description: `AI has generated a ${vendorType} form with ${fields.length} fields`,
        });
      }
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Unable to generate form. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [formFields, toast]);

  const handleSaveForm = useCallback(async () => {
    try {
      await onSave({
        title: formTitle,
        description: formDescription,
        fields: formFields
      });
      
      toast({
        title: "Form saved",
        description: "Your wedding form has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Unable to save form. Please try again.",
        variant: "destructive"
      });
    }
  }, [formTitle, formDescription, formFields, onSave, toast]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              />
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {formFields.length} fields
                </Badge>
                <span className="text-xs text-gray-500">
                  Last saved: Never
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            >
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateForm('photographer')}
              disabled={isGenerating}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              AI Generate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode === 'desktop' ? 'Mobile' : 'Desktop'} Preview
            </Button>

            <Button onClick={handleSaveForm}>
              <Save className="h-4 w-4 mr-2" />
              Save Form
            </Button>

            {formId && (
              <Button onClick={() => onPublish(formId)} variant="default">
                <Play className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left Sidebar - Field Palette */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <FormFieldPalette />
          </div>

          {/* Center - Form Canvas */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <FormCanvas
                fields={formFields}
                selectedFieldId={selectedFieldId}
                onFieldSelect={setSelectedFieldId}
                onFieldDelete={handleFieldDelete}
              />
            </div>
          </div>

          {/* Right Sidebar - Properties and Preview */}
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            {selectedField ? (
              <FieldPropertiesPanel
                field={selectedField}
                onUpdate={(updates) => handleFieldUpdate(selectedField.id, updates)}
              />
            ) : (
              <div className="flex-1">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Form Preview</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    How couples will see your form
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FormPreview
                    fields={formFields}
                    title={formTitle}
                    description={formDescription}
                    mode={previewMode}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId ? (
              <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 shadow-lg">
                <div className="font-medium text-blue-900">
                  {getDefaultLabel(activeId as FormField['type'])}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultLabel(fieldType: FormField['type']): string {
  const labels: Record<FormField['type'], string> = {
    text: 'Text Field',
    email: 'Email Address',
    phone: 'Phone Number', 
    date: 'Date',
    select: 'Dropdown',
    multiselect: 'Multiple Choice',
    textarea: 'Long Text',
    number: 'Number',
    wedding_date: 'Wedding Date',
    venue_address: 'Venue Address',
    guest_count: 'Guest Count',
  };
  return labels[fieldType] || 'Form Field';
}

function isWeddingField(fieldType: FormField['type']): boolean {
  return ['wedding_date', 'venue_address', 'guest_count'].includes(fieldType);
}

function getWeddingMapping(fieldType: FormField['type']): string {
  const mappings: Record<string, string> = {
    wedding_date: 'wedding_date',
    venue_address: 'venue_address', 
    guest_count: 'estimated_guest_count',
  };
  return mappings[fieldType] || '';
}
```

### Wedding-Specific Field Palette
```typescript
// File: $WS_ROOT/wedsync/src/components/forms/FormFieldPalette.tsx

'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  Mail, 
  Phone, 
  Calendar, 
  ChevronDown, 
  CheckSquare, 
  MessageSquare, 
  Hash,
  Heart,
  MapPin,
  Users
} from 'lucide-react';

interface FieldType {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'basic' | 'wedding' | 'advanced';
  description: string;
}

const FIELD_TYPES: FieldType[] = [
  // Basic Fields
  { id: 'text', name: 'Text Field', icon: <Type className="h-4 w-4" />, category: 'basic', description: 'Single line text input' },
  { id: 'email', name: 'Email', icon: <Mail className="h-4 w-4" />, category: 'basic', description: 'Email address with validation' },
  { id: 'phone', name: 'Phone', icon: <Phone className="h-4 w-4" />, category: 'basic', description: 'Phone number with formatting' },
  { id: 'textarea', name: 'Long Text', icon: <MessageSquare className="h-4 w-4" />, category: 'basic', description: 'Multi-line text area' },
  { id: 'number', name: 'Number', icon: <Hash className="h-4 w-4" />, category: 'basic', description: 'Numeric input only' },
  { id: 'date', name: 'Date', icon: <Calendar className="h-4 w-4" />, category: 'basic', description: 'Date picker' },
  { id: 'select', name: 'Dropdown', icon: <ChevronDown className="h-4 w-4" />, category: 'basic', description: 'Single selection dropdown' },
  { id: 'multiselect', name: 'Multiple Choice', icon: <CheckSquare className="h-4 w-4" />, category: 'basic', description: 'Multiple option selection' },

  // Wedding-Specific Fields
  { id: 'wedding_date', name: 'Wedding Date', icon: <Heart className="h-4 w-4 text-pink-500" />, category: 'wedding', description: 'Special wedding date field with timeline validation' },
  { id: 'venue_address', name: 'Venue Address', icon: <MapPin className="h-4 w-4 text-pink-500" />, category: 'wedding', description: 'Venue location with maps integration' },
  { id: 'guest_count', name: 'Guest Count', icon: <Users className="h-4 w-4 text-pink-500" />, category: 'wedding', description: 'Expected number of wedding guests' },
];

function DraggableFieldType({ fieldType }: { fieldType: FieldType }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: fieldType.id,
    data: {
      type: 'field-type',
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <Card className="p-3 hover:shadow-md transition-shadow border-gray-200 hover:border-blue-300">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5 text-gray-600">
            {fieldType.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {fieldType.name}
              </p>
              {fieldType.category === 'wedding' && (
                <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700">
                  Wedding
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {fieldType.description}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function FormFieldPalette() {
  const basicFields = FIELD_TYPES.filter(field => field.category === 'basic');
  const weddingFields = FIELD_TYPES.filter(field => field.category === 'wedding');

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Wedding Fields</h3>
        <div className="space-y-2">
          {weddingFields.map((fieldType) => (
            <DraggableFieldType key={fieldType.id} fieldType={fieldType} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Fields</h3>
        <div className="space-y-2">
          {basicFields.map((fieldType) => (
            <DraggableFieldType key={fieldType.id} fieldType={fieldType} />
          ))}
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <div className="text-blue-600 mt-0.5">
            <Heart className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Wedding Forms Tip</p>
            <p className="text-xs text-blue-700 mt-1">
              Wedding fields automatically map to your client profiles and integrate with other WedSync features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Dynamic Form Canvas
```typescript
// File: $WS_ROOT/wedsync/src/components/forms/FormCanvas.tsx

'use client';

import React from 'react';
import {
  useDroppable,
  useSortable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  X, 
  Settings,
  Type,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  CheckSquare,
  MessageSquare,
  Hash,
  Heart,
  MapPin,
  Users
} from 'lucide-react';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  mapping?: string;
  position: number;
}

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldDelete: (fieldId: string) => void;
}

function SortableField({ 
  field, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  field: FormField; 
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: 'form-field',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getFieldIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      text: <Type className="h-4 w-4" />,
      email: <Mail className="h-4 w-4" />,
      phone: <Phone className="h-4 w-4" />,
      date: <Calendar className="h-4 w-4" />,
      select: <ChevronDown className="h-4 w-4" />,
      multiselect: <CheckSquare className="h-4 w-4" />,
      textarea: <MessageSquare className="h-4 w-4" />,
      number: <Hash className="h-4 w-4" />,
      wedding_date: <Heart className="h-4 w-4 text-pink-500" />,
      venue_address: <MapPin className="h-4 w-4 text-pink-500" />,
      guest_count: <Users className="h-4 w-4 text-pink-500" />,
    };
    return icons[type] || <Type className="h-4 w-4" />;
  };

  const isWeddingField = ['wedding_date', 'venue_address', 'guest_count'].includes(field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <Card 
        className={`
          p-4 cursor-pointer transition-all hover:shadow-md
          ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}
        `}
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-gray-400 hover:text-gray-600 cursor-grab"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            
            <div className="text-gray-600">
              {getFieldIcon(field.type)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900">
                  {field.label}
                </p>
                {field.required && (
                  <Badge variant="destructive" className="text-xs px-1">
                    Required
                  </Badge>
                )}
                {isWeddingField && (
                  <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700">
                    Wedding
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-1">
                {field.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {field.options && ` • ${field.options.length} options`}
                {field.mapping && ` • Maps to ${field.mapping}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function FormCanvas({ fields, selectedFieldId, onFieldSelect, onFieldDelete }: FormCanvasProps) {
  const { setNodeRef } = useDroppable({
    id: 'form-canvas',
  });

  const sortedFields = [...fields].sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Form Builder</h2>
        <p className="text-sm text-gray-600">
          Drag fields from the left panel to build your wedding form. Click on fields to configure their properties.
        </p>
      </div>

      <div
        ref={setNodeRef}
        data-testid="form-canvas"
        className={`
          min-h-96 p-6 border-2 border-dashed rounded-lg space-y-4
          ${fields.length === 0 
            ? 'border-gray-300 bg-gray-50 flex items-center justify-center' 
            : 'border-gray-200 bg-white'
          }
        `}
      >
        {fields.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">
              <Heart className="h-12 w-12 mx-auto mb-3" />
              Start building your wedding form
            </div>
            <p className="text-gray-500 text-sm">
              Drag wedding fields from the left panel to create your form
            </p>
          </div>
        ) : (
          <SortableContext 
            items={sortedFields.map(field => field.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedFields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onFieldSelect(field.id)}
                onDelete={() => onFieldDelete(field.id)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
```

## 📱 RESPONSIVE DESIGN REQUIREMENTS

### Mobile Form Builder Optimization
- Touch-friendly drag targets (minimum 48x48px)
- Collapsible sidebar panels for mobile screens
- Simplified mobile editing interface
- Gesture-based field manipulation
- Mobile-optimized field palette

### Desktop Enhancement Features
- Keyboard shortcuts for common actions
- Multi-field selection and bulk operations
- Advanced field configuration options
- Split-screen preview modes
- Detailed analytics integration

## 🧪 REQUIRED TESTING

### Form Builder UI Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/components/form-builder.test.tsx

describe('FormBuilder Component', () => {
  it('should allow dragging fields from palette to canvas', async () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <FormBuilder onSave={onSave} onPublish={jest.fn()} />
    );

    const textField = getByTestId('field-type-text');
    const canvas = getByTestId('form-canvas');

    // Simulate drag and drop
    fireEvent.dragStart(textField);
    fireEvent.dragEnter(canvas);
    fireEvent.dragOver(canvas);
    fireEvent.drop(canvas);

    // Verify field was added
    expect(getByTestId('form-field')).toBeInTheDocument();
  });

  it('should update field properties in real-time', async () => {
    const initialFields = [{
      id: '1',
      type: 'text',
      label: 'Test Field',
      required: false,
      position: 0
    }];

    const { getByTestId } = render(
      <FormBuilder 
        initialFields={initialFields}
        onSave={jest.fn()} 
        onPublish={jest.fn()} 
      />
    );

    // Select field
    fireEvent.click(getByTestId('form-field-1'));
    
    // Update label
    const labelInput = getByTestId('field-label-input');
    fireEvent.change(labelInput, { target: { value: 'Updated Label' } });

    // Verify preview updates
    expect(getByTestId('form-preview')).toHaveTextContent('Updated Label');
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-306-forms-system-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team A",
  "notes": "Form builder UI completed. Drag-and-drop interface, wedding field types, real-time preview, AI integration ready."
}
```

---

**WedSync Form Builder - Create Beautiful Wedding Forms with Ease! 📝💖✨**