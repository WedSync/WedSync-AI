/**
 * Section Configuration Builder Component
 *
 * The main component for WS-212: Section Configuration System
 * Allows wedding professionals to customize dashboard sections with drag-and-drop
 *
 * Business Context:
 * - Wedding planners customize client dashboards based on wedding phase
 * - Couples personalize their planning experience
 * - Vendors highlight relevant services and hide irrelevant sections
 * - Guests see simplified, read-only views
 *
 * @fileoverview Main section configuration interface with drag-and-drop reordering
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings2,
  Plus,
  Template,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  AlertTriangle,
  Heart,
  Calendar,
  Users,
} from 'lucide-react';

// Types
import type {
  SectionConfigBuilderProps,
  SectionConfigBuilderState,
  UserSectionConfiguration,
  SectionTemplate,
  ConfigurationError,
  SectionType,
  UserRole,
  WeddingPhase,
} from '@/types/section-configuration';

// Components
import { DraggableSection } from './DraggableSection';
import { SectionConfigPanel } from './SectionConfigPanel';
import { TemplateSelector } from './TemplateSelector';
import { BulkOperationsMenu } from './BulkOperationsMenu';

// Hooks
import { useSectionConfig } from './hooks/useSectionConfig';
import { useSectionTemplates } from './hooks/useSectionTemplates';
import { useToast } from '@/hooks/use-toast';

/**
 * Main Section Configuration Builder Component
 *
 * Provides drag-and-drop interface for customizing dashboard sections
 * with role-based visibility and wedding phase awareness
 */
export function SectionConfigBuilder({
  userId,
  weddingId,
  userRole,
  currentPhase,
  configurations,
  templates,
  onConfigurationUpdate,
  onSectionReorder,
  onTemplateApply,
  readOnly = false,
  className,
}: SectionConfigBuilderProps) {
  // State management
  const [state, setState] = useState<SectionConfigBuilderState>({
    selectedSection: null,
    isPanelOpen: false,
    dragState: null,
    pendingChanges: new Map(),
    loadingStates: {
      saving: false,
      loading: false,
      applying_template: false,
      reordering: false,
    },
    errors: [],
  });

  // Hooks
  const { toast } = useToast();
  const {
    sections,
    isLoading,
    error: configError,
    updateConfiguration,
    reorderSections,
    applyTemplate,
  } = useSectionConfig(userId, weddingId, configurations);

  const { availableTemplates, isLoadingTemplates, getCompatibleTemplates } =
    useSectionTemplates(userRole, currentPhase, templates);

  // Drag and drop sensors with accessibility support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts (better for touch)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Wedding phase context styling
  const phaseTheme = useMemo(() => {
    const themes = {
      planning: {
        gradient: 'from-blue-50 to-purple-50',
        accent: 'blue-600',
        icon: Calendar,
      },
      pre_wedding: {
        gradient: 'from-pink-50 to-rose-50',
        accent: 'pink-600',
        icon: Heart,
      },
      wedding_day: {
        gradient: 'from-yellow-50 to-orange-50',
        accent: 'yellow-600',
        icon: Users,
      },
      post_wedding: {
        gradient: 'from-green-50 to-emerald-50',
        accent: 'green-600',
        icon: Settings2,
      },
    };
    return themes[currentPhase] || themes.planning;
  }, [currentPhase]);

  // Filter sections based on role and phase
  const visibleSections = useMemo(() => {
    return sections.filter((section) => {
      // Apply role-based filtering
      if (section.visibility_rules) {
        const hasRoleAccess = section.visibility_rules.some(
          (rule) => rule.roles.includes(userRole) || rule.roles.includes('all'),
        );
        if (!hasRoleAccess) return false;
      }

      // Apply phase-based filtering
      if (section.phase_based_visibility && section.wedding_phase) {
        if (section.wedding_phase !== currentPhase) return false;
      }

      return true;
    });
  }, [sections, userRole, currentPhase]);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const section = visibleSections.find((s) => s.id === active.id);

      if (section) {
        setState((prev) => ({
          ...prev,
          dragState: {
            activeId: active.id,
            overId: null,
            operation: 'reorder',
            startIndex: visibleSections.indexOf(section),
            currentIndex: visibleSections.indexOf(section),
          },
        }));
      }
    },
    [visibleSections],
  );

  // Handle drag end with reordering
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setState((prev) => ({ ...prev, dragState: null }));

      if (!over || active.id === over.id) return;

      const oldIndex = visibleSections.findIndex((s) => s.id === active.id);
      const newIndex = visibleSections.findIndex((s) => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      setState((prev) => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, reordering: true },
      }));

      try {
        const reorderedSections = arrayMove(
          visibleSections,
          oldIndex,
          newIndex,
        );

        // Optimistic update
        await reorderSections(reorderedSections);

        // Call parent callback
        await onSectionReorder(reorderedSections);

        toast({
          title: 'Sections reordered! 🎯',
          description: `Your dashboard layout has been updated. ${getDragSuccessMessage(userRole)}`,
        });
      } catch (error) {
        console.error('Section reorder error:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              code: 'REORDER_FAILED',
              message: 'Failed to reorder sections. Please try again.',
              field: 'drag_drop',
              severity: 'error',
              context: { originalError: errorMessage },
            },
          ],
        }));

        toast({
          title: 'Reorder failed',
          description:
            "Couldn't update section order. Your changes weren't saved.",
          variant: 'destructive',
        });
      } finally {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, reordering: false },
        }));
      }
    },
    [visibleSections, reorderSections, onSectionReorder, toast, userRole],
  );

  // Handle section selection for configuration
  const handleSectionSelect = useCallback(
    (section: UserSectionConfiguration) => {
      setState((prev) => ({
        ...prev,
        selectedSection: section.section_type,
        isPanelOpen: true,
      }));
    },
    [],
  );

  // Handle configuration updates
  const handleConfigurationUpdate = useCallback(
    async (sectionId: string, updates: Partial<UserSectionConfiguration>) => {
      setState((prev) => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, saving: true },
      }));

      try {
        const updatedSection = await updateConfiguration(sectionId, updates);
        await onConfigurationUpdate(updatedSection);

        toast({
          title: 'Configuration saved! ✨',
          description: getUpdateSuccessMessage(updates, userRole),
        });
      } catch (error) {
        console.error('Configuration update error:', error);

        setState((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              code: 'UPDATE_FAILED',
              message: 'Failed to save configuration changes.',
              field: 'configuration',
              severity: 'error',
            },
          ],
        }));

        toast({
          title: 'Save failed',
          description: "Couldn't save your changes. Please try again.",
          variant: 'destructive',
        });
      } finally {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, saving: false },
        }));
      }
    },
    [updateConfiguration, onConfigurationUpdate, toast, userRole],
  );

  // Handle template application
  const handleTemplateApply = useCallback(
    async (templateId: string, sectionType: SectionType) => {
      setState((prev) => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, applying_template: true },
      }));

      try {
        await applyTemplate(templateId, sectionType);
        await onTemplateApply(templateId, sectionType);

        toast({
          title: 'Template applied! 🎉',
          description: getTemplateSuccessMessage(sectionType, userRole),
        });

        // Close panel after successful application
        setState((prev) => ({
          ...prev,
          isPanelOpen: false,
          selectedSection: null,
        }));
      } catch (error) {
        console.error('Template application error:', error);

        setState((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              code: 'TEMPLATE_FAILED',
              message: 'Failed to apply template. Please try again.',
              field: 'template',
              severity: 'error',
            },
          ],
        }));

        toast({
          title: 'Template failed',
          description:
            "Couldn't apply template. Your settings weren't changed.",
          variant: 'destructive',
        });
      } finally {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, applying_template: false },
        }));
      }
    },
    [applyTemplate, onTemplateApply, toast, userRole],
  );

  // Handle error dismissal
  const dismissError = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.filter((_, i) => i !== index),
    }));
  }, []);

  // Saturday protection warning
  const isSaturday = useMemo(() => new Date().getDay() === 6, []);

  // Loading state
  if (isLoading || state.loadingStates.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">
            Loading your dashboard configuration...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load section configurations. Please refresh the page or
          contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`section-config-builder ${className}`}>
      {/* Saturday Warning */}
      {isSaturday && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Wedding Day Alert:</strong> It's Saturday! Please be extra
            careful with changes. Many couples are getting married today. 💒
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Configuration
          </h1>
          <p className="text-muted-foreground">
            Customize your {getRoleDisplayName(userRole)} dashboard for the{' '}
            {currentPhase.replace('_', ' ')} phase
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Wedding Phase Badge */}
          <Badge
            variant="secondary"
            className={`bg-gradient-to-r ${phaseTheme.gradient} text-${phaseTheme.accent} border-0`}
          >
            <phaseTheme.icon className="w-4 h-4 mr-1" />
            {currentPhase.replace('_', ' ').toUpperCase()}
          </Badge>

          {/* Template Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                isPanelOpen: true,
                selectedSection: null,
              }))
            }
            disabled={readOnly || state.loadingStates.applying_template}
          >
            <Template className="w-4 h-4 mr-2" />
            Templates
          </Button>

          {/* Bulk Operations */}
          {!readOnly && (
            <BulkOperationsMenu
              sections={visibleSections}
              onBulkOperation={async (operation, sectionIds, parameters) => {
                // Handle bulk operations
                console.log(
                  'Bulk operation:',
                  operation,
                  sectionIds,
                  parameters,
                );
              }}
              disabled={state.loadingStates.saving}
            />
          )}
        </div>
      </div>

      {/* Error Display */}
      {state.errors.length > 0 && (
        <div className="space-y-2 mb-6">
          {state.errors.map((error, index) => (
            <Alert key={index} variant="destructive" className="relative">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-6 w-6 p-0"
                onClick={() => dismissError(index)}
              >
                ×
              </Button>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sections List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Dashboard Sections
                </CardTitle>
                <Badge variant="outline">
                  {visibleSections.length} sections
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {visibleSections.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Settings2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">No sections configured</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Get started by applying a template or adding individual
                      sections to customize your {getRoleDisplayName(userRole)}{' '}
                      dashboard.
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setState((prev) => ({ ...prev, isPanelOpen: true }))
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Sections
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={visibleSections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {visibleSections.map((section) => (
                        <DraggableSection
                          key={section.id}
                          section={section}
                          isSelected={
                            state.selectedSection === section.section_type
                          }
                          isDragEnabled={
                            !readOnly && !state.loadingStates.reordering
                          }
                          onSelect={handleSectionSelect}
                          onUpdate={(updates) =>
                            handleConfigurationUpdate(section.id, updates)
                          }
                          className="transition-all duration-200 hover:shadow-sm"
                        />
                      ))}
                    </div>
                  </SortableContext>

                  {/* Drag Overlay */}
                  <DragOverlay>
                    {state.dragState?.activeId ? (
                      <div className="bg-white border-2 border-primary rounded-lg p-4 shadow-lg">
                        <div className="font-medium">
                          {
                            visibleSections.find(
                              (s) => s.id === state.dragState?.activeId,
                            )?.title
                          }
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {state.isPanelOpen ? (
              <SectionConfigPanel
                selectedSection={state.selectedSection}
                sections={visibleSections}
                templates={availableTemplates}
                userRole={userRole}
                currentPhase={currentPhase}
                onClose={() =>
                  setState((prev) => ({
                    ...prev,
                    isPanelOpen: false,
                    selectedSection: null,
                  }))
                }
                onTemplateApply={handleTemplateApply}
                onConfigurationUpdate={handleConfigurationUpdate}
                isLoading={
                  state.loadingStates.applying_template ||
                  state.loadingStates.saving
                }
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Eye className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Select a section</h3>
                    <p className="text-sm text-muted-foreground">
                      Click on any section to customize its settings and
                      appearance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {!readOnly && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2">
          {state.pendingChanges.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((prev) => ({ ...prev, pendingChanges: new Map() }))
                }
                disabled={state.loadingStates.saving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  // Save all pending changes
                  const promises = Array.from(
                    state.pendingChanges.entries(),
                  ).map(([sectionId, updates]) =>
                    handleConfigurationUpdate(sectionId, updates),
                  );
                  await Promise.all(promises);
                  setState((prev) => ({ ...prev, pendingChanges: new Map() }));
                }}
                disabled={state.loadingStates.saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {state.loadingStates.saving
                  ? 'Saving...'
                  : `Save (${state.pendingChanges.size})`}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Functions

function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    admin: 'Administrator',
    planner: 'Wedding Planner',
    couple: 'Couple',
    vendor: 'Vendor',
    guest: 'Guest',
  };
  return roleNames[role] || role;
}

function getDragSuccessMessage(role: UserRole): string {
  const messages = {
    admin: 'Your admin dashboard is now organized.',
    planner: 'Your planning workflow is optimized!',
    couple: 'Your wedding dashboard is personalized.',
    vendor: 'Your vendor portal is customized.',
    guest: 'Your view has been updated.',
  };
  return messages[role] || 'Layout updated successfully.';
}

function getUpdateSuccessMessage(
  updates: Partial<UserSectionConfiguration>,
  role: UserRole,
): string {
  if (updates.title) return 'Section name updated!';
  if (updates.is_enabled !== undefined)
    return updates.is_enabled ? 'Section enabled!' : 'Section disabled!';
  if (updates.visibility_rules) return 'Visibility rules updated!';
  return 'Section settings saved!';
}

function getTemplateSuccessMessage(
  sectionType: SectionType,
  role: UserRole,
): string {
  const messages = {
    planner: `Your ${sectionType} section is now optimized for client management!`,
    couple: `Your ${sectionType} section is ready for wedding planning!`,
    vendor: `Your ${sectionType} section showcases your services beautifully!`,
    admin: `${sectionType} template applied successfully!`,
    guest: `${sectionType} section updated!`,
  };
  return messages[role] || 'Template applied successfully!';
}

// Export default
export default SectionConfigBuilder;
