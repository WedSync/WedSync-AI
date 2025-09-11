'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  FormField,
  FormSection,
  FormRow,
  FIELD_TEMPLATES,
  FormFieldType,
} from '@/types/forms';
import { nanoid } from 'nanoid';
import { FieldPalette } from './FieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldEditor } from './FieldEditor';
import { FormPreview } from './FormPreview';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useFormCollaboration } from '@/hooks/useCollaboration';
import { cn } from '@/lib/utils';
import {
  Users,
  Wifi,
  WifiOff,
  Eye,
  Settings,
  Download,
  Upload,
  Undo2,
  Redo2,
  MousePointer2,
} from 'lucide-react';

interface CollaborativeFormBuilderProps {
  formId: string;
  onSave?: (form: any) => void;
  initialTemplate?: string;
  mode?: string;
  enableCollaboration?: boolean;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

interface LiveCursor {
  userId: string;
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

export function CollaborativeFormBuilder({
  formId,
  onSave,
  initialTemplate,
  mode,
  enableCollaboration = true,
}: CollaborativeFormBuilderProps) {
  const [activeTab, setActiveTab] = useState<'build' | 'preview' | 'settings'>(
    'build',
  );
  const [sections, setSections] = useState<FormSection[]>([
    {
      id: nanoid(),
      title: 'Main Section',
      rows: [],
    },
  ]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [draggedField, setDraggedField] = useState<FormField | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collaboration hooks
  const {
    activeUsers,
    cursors,
    changes,
    isConnected,
    currentUser,
    broadcastChange,
    broadcastCursor,
    resolveConflict,
    undo,
    redo,
  } = useFormCollaboration(formId, enableCollaboration);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle cursor tracking for collaboration
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enableCollaboration || !isConnected) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find the element under cursor
      const elementId = (e.target as HTMLElement)?.id || undefined;

      broadcastCursor({ x, y, elementId });
    },
    [enableCollaboration, isConnected, broadcastCursor],
  );

  // Apply incoming changes from other users
  useEffect(() => {
    const unappliedChanges = changes.filter(
      (change) => !change.applied && change.userId !== currentUser?.id,
    );

    unappliedChanges.forEach((change) => {
      switch (change.type) {
        case 'field_add':
          handleRemoteFieldAdd(change);
          break;
        case 'field_update':
          handleRemoteFieldUpdate(change);
          break;
        case 'field_delete':
          handleRemoteFieldDelete(change);
          break;
        case 'field_move':
          handleRemoteFieldMove(change);
          break;
      }
      resolveConflict(change);
    });
  }, [changes, currentUser?.id, resolveConflict]);

  // Handle remote field operations
  const handleRemoteFieldAdd = useCallback((change: any) => {
    setSections((prev) => {
      const newSections = [...prev];
      const section = newSections.find((s) => s.id === change.value.sectionId);
      if (section && change.value.field) {
        section.rows.push({
          id: nanoid(),
          fields: [change.value.field],
        });
      }
      return newSections;
    });
  }, []);

  const handleRemoteFieldUpdate = useCallback((change: any) => {
    setSections((prev) => {
      const newSections = [...prev];
      newSections.forEach((section) => {
        section.rows.forEach((row) => {
          const fieldIndex = row.fields.findIndex(
            (f) => f.id === change.fieldId,
          );
          if (fieldIndex !== -1) {
            row.fields[fieldIndex] = {
              ...row.fields[fieldIndex],
              ...change.value,
            };
          }
        });
      });
      return newSections;
    });
  }, []);

  const handleRemoteFieldDelete = useCallback((change: any) => {
    setSections((prev) => {
      const newSections = [...prev];
      newSections.forEach((section) => {
        section.rows.forEach((row) => {
          row.fields = row.fields.filter((f) => f.id !== change.fieldId);
        });
        section.rows = section.rows.filter((row) => row.fields.length > 0);
      });
      return newSections;
    });
  }, []);

  const handleRemoteFieldMove = useCallback((change: any) => {
    if (change.value.newPosition) {
      setSections((prev) => {
        const newSections = [...prev];
        // Implementation would depend on the specific move operation
        return newSections;
      });
    }
  }, []);

  // Handle field addition with collaboration
  const handleFieldAdd = useCallback(
    (fieldType: FormFieldType, targetSectionId?: string) => {
      const newField: FormField = {
        ...FIELD_TEMPLATES[fieldType],
        id: nanoid(),
      };

      const sectionId = targetSectionId || sections[0]?.id;

      setSections((prev) => {
        const newSections = [...prev];
        const targetSection = newSections.find((s) => s.id === sectionId);
        if (targetSection) {
          targetSection.rows.push({
            id: nanoid(),
            fields: [newField],
          });
        }
        return newSections;
      });

      // Broadcast change to collaborators
      if (enableCollaboration) {
        broadcastChange({
          type: 'field_add',
          fieldId: newField.id,
          value: { field: newField, sectionId },
        });
      }
    },
    [sections, enableCollaboration, broadcastChange],
  );

  // Handle field updates with collaboration
  const handleFieldUpdate = useCallback(
    (fieldId: string, updates: Partial<FormField>) => {
      setSections((prev) => {
        const newSections = [...prev];
        newSections.forEach((section) => {
          section.rows.forEach((row) => {
            const fieldIndex = row.fields.findIndex((f) => f.id === fieldId);
            if (fieldIndex !== -1) {
              row.fields[fieldIndex] = {
                ...row.fields[fieldIndex],
                ...updates,
              };
            }
          });
        });
        return newSections;
      });

      // Broadcast change to collaborators
      if (enableCollaboration) {
        broadcastChange({
          type: 'field_update',
          fieldId,
          value: updates,
        });
      }
    },
    [enableCollaboration, broadcastChange],
  );

  // Handle field deletion with collaboration
  const handleFieldDelete = useCallback(
    (fieldId: string) => {
      setSections((prev) => {
        const newSections = [...prev];
        newSections.forEach((section) => {
          section.rows.forEach((row) => {
            row.fields = row.fields.filter((f) => f.id !== fieldId);
          });
          section.rows = section.rows.filter((row) => row.fields.length > 0);
        });
        return newSections;
      });

      // Broadcast change to collaborators
      if (enableCollaboration) {
        broadcastChange({
          type: 'field_delete',
          fieldId,
          value: null,
        });
      }
    },
    [enableCollaboration, broadcastChange],
  );

  // Handle drag and drop with collaboration
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the dragged field
    let draggedField: FormField | null = null;
    sections.forEach((section) => {
      section.rows.forEach((row) => {
        const field = row.fields.find((f) => f.id === active.id);
        if (field) draggedField = field;
      });
    });
    setDraggedField(draggedField);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedField(null);

    if (!over) return;

    // Handle reordering logic here and broadcast to collaborators
    if (enableCollaboration) {
      broadcastChange({
        type: 'field_move',
        fieldId: active.id as string,
        value: {
          newPosition: {
            sectionId: over.id as string,
            index: 0, // Calculate proper index
          },
        },
      });
    }
  };

  // Render collaboration UI components
  const renderCollaborationBar = () => {
    if (!enableCollaboration) return null;

    return (
      <Card className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {activeUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {activeUsers.length} collaborator
                    {activeUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={undo}>
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={redo}>
                <Redo2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {activeUsers.length > 0 && (
          <CardContent className="py-2">
            <div className="flex items-center gap-2">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <Avatar
                    className="w-6 h-6"
                    style={{ borderColor: user.color, borderWidth: 2 }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <span className="text-xs">{user.name.charAt(0)}</span>
                    )}
                  </Avatar>
                  <span className="text-xs text-gray-600">{user.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // Render live cursors
  const renderLiveCursors = () => {
    if (!enableCollaboration) return null;

    return (
      <div className="absolute inset-0 pointer-events-none z-50">
        {cursors.map((cursor) => {
          const user = activeUsers.find((u) => u.id === cursor.userId);
          if (!user) return null;

          return (
            <div
              key={cursor.userId}
              className="absolute transition-all duration-100 ease-out"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-2px, -2px)',
              }}
            >
              <MousePointer2
                className="w-4 h-4"
                style={{ color: user.color }}
              />
              <div
                className="text-xs px-2 py-1 rounded shadow-lg text-white ml-2 mt-1"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-gray-50 dark:bg-gray-900"
      onMouseMove={handleMouseMove}
    >
      {renderCollaborationBar()}

      <div className="flex h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Field Palette */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
            <FieldPalette onFieldAdd={handleFieldAdd} />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('build')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                    activeTab === 'build'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  )}
                >
                  Build
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                    activeTab === 'preview'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  )}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
                    activeTab === 'settings'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {activeTab === 'build' && (
                <div className="max-w-4xl mx-auto">
                  <FormCanvas
                    sections={sections}
                    onFieldSelect={setSelectedField}
                    onFieldUpdate={handleFieldUpdate}
                    onFieldDelete={handleFieldDelete}
                  />
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="max-w-2xl mx-auto">
                  <FormPreview sections={sections} />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-xl mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle>Form Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400">
                        Form settings and configuration options will be
                        available here.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Field Editor Sidebar */}
          {selectedField && (
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
              <FieldEditor
                field={selectedField}
                onUpdate={(updates) =>
                  handleFieldUpdate(selectedField.id, updates)
                }
                onClose={() => setSelectedField(null)}
              />
            </div>
          )}

          <DragOverlay>
            {draggedField && (
              <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                {draggedField.label}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Live Cursors Overlay */}
      {renderLiveCursors()}
    </div>
  );
}
