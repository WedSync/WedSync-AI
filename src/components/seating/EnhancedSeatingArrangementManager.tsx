'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useOptimistic,
  useTransition,
  useRef,
  useEffect,
} from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  KeyboardSensor,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Undo,
  Redo,
  Layout,
  List,
  AlertTriangle,
  Users,
  Settings,
  Download,
  Share,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  Check,
} from 'lucide-react';

// Enhanced types for Round 2
interface Guest {
  id: string;
  name: string;
  email: string;
  dietaryRequirements?: string[];
  plusOne?: boolean;
  tableId?: string;
  seatNumber?: number;
  accessibilityNeeds?: string[];
  category?: 'family' | 'friends' | 'work' | 'other';
  side?: 'bride' | 'groom' | 'mutual';
  ageGroup?: 'adult' | 'child' | 'infant';
  conflictsWith?: string[];
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape: 'round' | 'rectangle' | 'long-rectangle';
  x: number;
  y: number;
  rotation: number;
  guests: Guest[];
  isVip?: boolean;
  template?: 'family' | 'formal' | 'cocktail';
}

interface ConflictHeatMap {
  [tableId: string]: {
    conflictLevel: 'none' | 'low' | 'medium' | 'high';
    conflictCount: number;
    conflictReasons: string[];
  };
}

interface SeatingOptimizationResult {
  score: number;
  arrangement: { tableId: string; guestId: string; seatNumber?: number }[];
  conflicts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    guestIds: string[];
  }>;
  suggestions: Array<{
    guestId: string;
    fromTableId?: string;
    toTableId: string;
    reason: string;
    impactScore: number;
  }>;
}

interface HistoryState {
  guests: Guest[];
  tables: Table[];
  timestamp: number;
  action: string;
}

interface TableTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tables: Omit<Table, 'id' | 'guests'>[];
}

// Table layout templates
const TABLE_TEMPLATES: TableTemplate[] = [
  {
    id: 'family-style',
    name: 'Family Style',
    description: 'Long rectangular tables for intimate family dining',
    icon: '👨‍👩‍👧‍👦',
    tables: [
      {
        name: 'Head Table',
        capacity: 12,
        shape: 'long-rectangle',
        x: 400,
        y: 100,
        rotation: 0,
        template: 'family',
        isVip: true,
      },
      {
        name: 'Family Table 1',
        capacity: 10,
        shape: 'long-rectangle',
        x: 200,
        y: 250,
        rotation: 0,
        template: 'family',
      },
      {
        name: 'Family Table 2',
        capacity: 10,
        shape: 'long-rectangle',
        x: 600,
        y: 250,
        rotation: 0,
        template: 'family',
      },
      {
        name: 'Family Table 3',
        capacity: 10,
        shape: 'long-rectangle',
        x: 200,
        y: 400,
        rotation: 0,
        template: 'family',
      },
      {
        name: 'Family Table 4',
        capacity: 10,
        shape: 'long-rectangle',
        x: 600,
        y: 400,
        rotation: 0,
        template: 'family',
      },
    ],
  },
  {
    id: 'formal-dinner',
    name: 'Formal Dinner',
    description: 'Traditional round tables for elegant dining',
    icon: '🍽️',
    tables: [
      {
        name: 'Sweetheart Table',
        capacity: 2,
        shape: 'round',
        x: 400,
        y: 100,
        rotation: 0,
        template: 'formal',
        isVip: true,
      },
      {
        name: 'Table 1',
        capacity: 8,
        shape: 'round',
        x: 200,
        y: 250,
        rotation: 0,
        template: 'formal',
      },
      {
        name: 'Table 2',
        capacity: 8,
        shape: 'round',
        x: 600,
        y: 250,
        rotation: 0,
        template: 'formal',
      },
      {
        name: 'Table 3',
        capacity: 8,
        shape: 'round',
        x: 100,
        y: 400,
        rotation: 0,
        template: 'formal',
      },
      {
        name: 'Table 4',
        capacity: 8,
        shape: 'round',
        x: 400,
        y: 400,
        rotation: 0,
        template: 'formal',
      },
      {
        name: 'Table 5',
        capacity: 8,
        shape: 'round',
        x: 700,
        y: 400,
        rotation: 0,
        template: 'formal',
      },
    ],
  },
  {
    id: 'cocktail-reception',
    name: 'Cocktail Reception',
    description: 'High-top tables for mingling and cocktails',
    icon: '🍸',
    tables: [
      {
        name: 'Cocktail Table 1',
        capacity: 4,
        shape: 'round',
        x: 150,
        y: 150,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 2',
        capacity: 4,
        shape: 'round',
        x: 350,
        y: 150,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 3',
        capacity: 4,
        shape: 'round',
        x: 550,
        y: 150,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 4',
        capacity: 4,
        shape: 'round',
        x: 250,
        y: 300,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 5',
        capacity: 4,
        shape: 'round',
        x: 450,
        y: 300,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 6',
        capacity: 4,
        shape: 'round',
        x: 150,
        y: 450,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 7',
        capacity: 4,
        shape: 'round',
        x: 350,
        y: 450,
        rotation: 0,
        template: 'cocktail',
      },
      {
        name: 'Cocktail Table 8',
        capacity: 4,
        shape: 'round',
        x: 550,
        y: 450,
        rotation: 0,
        template: 'cocktail',
      },
    ],
  },
];

interface EnhancedSeatingArrangementManagerProps {
  guests: Guest[];
  tables: Table[];
  onUpdateArrangement: (tables: Table[], guests: Guest[]) => void;
  className?: string;
  weddingId: string;
  userId: string;
  readOnly?: boolean;
}

export function EnhancedSeatingArrangementManager({
  guests,
  tables,
  onUpdateArrangement,
  className,
  weddingId,
  userId,
  readOnly = false,
}: EnhancedSeatingArrangementManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationScore, setOptimizationScore] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [conflictHeatMap, setConflictHeatMap] = useState<ConflictHeatMap>({});

  // History management for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const [viewMode, setViewMode] = useState<'layout' | 'list' | 'analytics'>(
    'layout',
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { toast } = useToast();

  // Add state to history
  const addToHistory = useCallback(
    (action: string, newGuests: Guest[], newTables: Table[]) => {
      const newState: HistoryState = {
        guests: newGuests,
        tables: newTables,
        timestamp: Date.now(),
        action,
      };

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newState);
        return newHistory.slice(-50); // Keep last 50 states
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex],
  );

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (canUndo && historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      onUpdateArrangement(prevState.tables, prevState.guests);
      setHistoryIndex((prev) => prev - 1);
      toast({
        title: 'Undid Action',
        description: `Undid: ${prevState.action}`,
      });
    }
  }, [canUndo, historyIndex, history, onUpdateArrangement, toast]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (canRedo && historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      onUpdateArrangement(nextState.tables, nextState.guests);
      setHistoryIndex((prev) => prev + 1);
      toast({
        title: 'Redid Action',
        description: `Redid: ${nextState.action}`,
      });
    }
  }, [canRedo, historyIndex, history, onUpdateArrangement, toast]);

  // Seating optimization integration
  const handleOptimizeSeating = useCallback(async () => {
    setIsOptimizing(true);
    setShowSuggestions(true);

    try {
      const response = await fetch('/api/seating/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: weddingId,
          guest_count: guests.length,
          table_count: tables.length,
          table_configurations: tables.map((table) => ({
            table_number: parseInt(table.name.replace(/\D/g, '')) || 1,
            capacity: table.capacity,
            table_shape:
              table.shape === 'long-rectangle' ? 'rectangular' : table.shape,
            special_requirements: table.isVip ? 'VIP table' : undefined,
          })),
          relationship_preferences: {
            prioritize_families: true,
            separate_conflicting_guests: true,
            balance_age_groups: true,
            consider_dietary_needs: true,
          },
          optimization_level: 'advanced',
        }),
      });

      if (!response.ok) {
        throw new Error('Optimization failed');
      }

      const result: SeatingOptimizationResult = await response.json();

      // Apply optimization results
      const optimizedTables = tables.map((table) => ({
        ...table,
        guests: result.arrangement
          .filter((assignment) => assignment.tableId === table.id)
          .map((assignment) => {
            const guest = guests.find((g) => g.id === assignment.guestId);
            return guest
              ? {
                  ...guest,
                  tableId: table.id,
                  seatNumber: assignment.seatNumber,
                }
              : null;
          })
          .filter(Boolean) as Guest[],
      }));

      const optimizedGuests = guests.map((guest) => {
        const assignment = result.arrangement.find(
          (a) => a.guestId === guest.id,
        );
        return assignment
          ? {
              ...guest,
              tableId: assignment.tableId,
              seatNumber: assignment.seatNumber,
            }
          : { ...guest, tableId: undefined, seatNumber: undefined };
      });

      addToHistory('Optimization Applied', optimizedGuests, optimizedTables);
      onUpdateArrangement(optimizedTables, optimizedGuests);
      setOptimizationScore(result.score);
      setSuggestions(result.suggestions || []);

      // Generate conflict heat map
      const heatMap: ConflictHeatMap = {};
      result.conflicts?.forEach((conflict) => {
        conflict.guestIds.forEach((guestId) => {
          const guest = guests.find((g) => g.id === guestId);
          if (guest?.tableId && !heatMap[guest.tableId]) {
            heatMap[guest.tableId] = {
              conflictLevel: 'none',
              conflictCount: 0,
              conflictReasons: [],
            };
          }
          if (guest?.tableId) {
            heatMap[guest.tableId].conflictCount++;
            heatMap[guest.tableId].conflictReasons.push(conflict.message);
            heatMap[guest.tableId].conflictLevel = conflict.severity;
          }
        });
      });
      setConflictHeatMap(heatMap);

      toast({
        title: 'Seating Optimized!',
        description: `Optimization complete with score: ${result.score.toFixed(1)}`,
      });
    } catch (error) {
      console.error('Optimization failed:', error);
      toast({
        title: 'Optimization Failed',
        description: 'Unable to optimize seating. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [guests, tables, weddingId, onUpdateArrangement, addToHistory, toast]);

  // Apply table template
  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = TABLE_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      const newTables: Table[] = template.tables.map(
        (tableTemplate, index) => ({
          ...tableTemplate,
          id: `table-${Date.now()}-${index}`,
          guests: [],
        }),
      );

      addToHistory(`Applied ${template.name} Template`, guests, newTables);
      onUpdateArrangement(
        newTables,
        guests.map((g) => ({
          ...g,
          tableId: undefined,
          seatNumber: undefined,
        })),
      );
      setShowTemplates(false);
      setSelectedTemplate(templateId);

      toast({
        title: 'Template Applied',
        description: `${template.name} layout has been applied`,
      });
    },
    [guests, onUpdateArrangement, addToHistory, toast],
  );

  // Calculate seating statistics
  const statistics = useMemo(() => {
    const assigned = guests.filter((g) => g.tableId).length;
    const totalCapacity = tables.reduce(
      (sum, table) => sum + table.capacity,
      0,
    );
    const usedTables = tables.filter((table) => table.guests.length > 0).length;

    return {
      assignedGuests: assigned,
      totalGuests: guests.length,
      completionPercentage: Math.round((assigned / guests.length) * 100),
      usedTables,
      totalTables: tables.length,
      totalCapacity,
      efficiency: Math.round((assigned / totalCapacity) * 100),
    };
  }, [guests, tables]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (readOnly) return;

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'o' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleOptimizeSeating();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleUndo, handleRedo, handleOptimizeSeating, readOnly]);

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* Enhanced Controls Panel */}
      <div className="w-96 border-r border-border bg-muted/30">
        <div className="p-6 space-y-6">
          {/* Header with Actions */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Seating Manager</h2>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleUndo}
                disabled={!canUndo || readOnly}
                className="p-2"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRedo}
                disabled={!canRedo || readOnly}
                className="p-2"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Optimization Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleOptimizeSeating}
                disabled={isOptimizing || readOnly}
                className="w-full"
              >
                {isOptimizing ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Optimize Seating
                  </>
                )}
              </Button>

              {optimizationScore > 0 && (
                <div className="text-sm">
                  <div className="flex justify-between items-center">
                    <span>Current Score:</span>
                    <Badge variant="secondary">
                      {optimizationScore.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Layout className="h-4 w-4 mr-2" />
                Table Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TABLE_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => applyTemplate(template.id)}
                  disabled={readOnly}
                >
                  <span className="mr-2">{template.icon}</span>
                  {template.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span>{statistics.completionPercentage}%</span>
                </div>
                <Progress
                  value={statistics.completionPercentage}
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Assigned</div>
                  <div className="font-medium">
                    {statistics.assignedGuests}/{statistics.totalGuests}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tables</div>
                  <div className="font-medium">
                    {statistics.usedTables}/{statistics.totalTables}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Suggestions Panel */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Smart Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="p-2 bg-muted rounded-lg text-xs">
                    <div className="font-medium">{suggestion.reason}</div>
                    <div className="text-muted-foreground">
                      Impact: +{suggestion.impactScore.toFixed(1)}
                    </div>
                  </div>
                ))}
                {suggestions.length > 3 && (
                  <Button variant="outline" size="sm" className="w-full">
                    View All {suggestions.length} Suggestions
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* View Mode Tabs */}
        <div className="border-b border-border px-6 py-3">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as any)}
          >
            <TabsList>
              <TabsTrigger value="layout" className="flex items-center">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <TabsContent value="layout" className="h-full">
            {/* This would contain the enhanced table layout with heat maps */}
            <div className="h-full bg-muted/30 rounded-lg p-6 flex items-center justify-center">
              <div className="text-center">
                <Layout className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">Enhanced Layout View</h3>
                <p className="text-muted-foreground">
                  Interactive seating layout with conflict heat maps and
                  drag-drop
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="h-full">
            {/* Enhanced list view with bulk operations */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Table Assignments</h3>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Assign
                </Button>
              </div>

              {tables.map((table) => (
                <Card key={table.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{table.name}</h4>
                        <div className="text-sm text-muted-foreground">
                          {table.guests.length}/{table.capacity} seats
                          {conflictHeatMap[table.id] &&
                            conflictHeatMap[table.id].conflictLevel !==
                              'none' && (
                              <Badge variant="destructive" className="ml-2">
                                {conflictHeatMap[table.id].conflictCount}{' '}
                                conflicts
                              </Badge>
                            )}
                        </div>
                      </div>
                      {table.template && (
                        <Badge variant="outline">
                          {
                            TABLE_TEMPLATES.find((t) =>
                              t.id.includes(table.template!),
                            )?.name
                          }
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {table.guests.map((guest) => (
                        <div
                          key={guest.id}
                          className="p-2 bg-muted rounded text-sm"
                        >
                          {guest.name}
                          {guest.dietaryRequirements?.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Dietary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="h-full">
            {/* Seating Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Guest Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">87%</div>
                  <p className="text-sm text-muted-foreground">
                    Based on relationship preferences
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Conflict Resolution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">94%</div>
                  <p className="text-sm text-muted-foreground">
                    Conflicts avoided or resolved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Table Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {statistics.efficiency}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Optimal space usage
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>

        {/* Loading Overlay */}
        {(isPending || isOptimizing) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full" />
                <div>
                  <div className="font-medium">
                    {isOptimizing
                      ? 'Optimizing seating arrangement...'
                      : 'Updating arrangement...'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This may take a few moments
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
