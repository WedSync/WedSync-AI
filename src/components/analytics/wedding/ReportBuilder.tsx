'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Settings,
  Save,
  Play,
  Download,
  Plus,
  X,
  GripVertical,
  Eye,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);

// Report Widget Types
export type WidgetType =
  | 'budget_overview'
  | 'timeline_progress'
  | 'vendor_performance'
  | 'milestone_tracker'
  | 'budget_variance'
  | 'payment_trends'
  | 'guest_analytics'
  | 'efficiency_score';

export interface ReportWidget {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  size: 'small' | 'medium' | 'large';
  chartType?: 'bar' | 'line' | 'pie' | 'metric';
  dataSource: string;
  filters?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  widgets: ReportWidget[];
  layout: 'grid' | 'list';
  created_at: string;
  updated_at: string;
}

// Available widget configurations
const WIDGET_LIBRARY: Record<
  WidgetType,
  {
    name: string;
    description: string;
    icon: React.ElementType;
    defaultSize: 'small' | 'medium' | 'large';
    defaultChartType?: 'bar' | 'line' | 'pie' | 'metric';
    category: 'budget' | 'timeline' | 'vendors' | 'analytics';
  }
> = {
  budget_overview: {
    name: 'Budget Overview',
    description: 'Total budget allocation and spending',
    icon: DollarSign,
    defaultSize: 'medium',
    defaultChartType: 'bar',
    category: 'budget',
  },
  timeline_progress: {
    name: 'Timeline Progress',
    description: 'Milestone completion over time',
    icon: Calendar,
    defaultSize: 'large',
    defaultChartType: 'line',
    category: 'timeline',
  },
  vendor_performance: {
    name: 'Vendor Performance',
    description: 'Vendor ratings and delivery metrics',
    icon: Users,
    defaultSize: 'medium',
    defaultChartType: 'bar',
    category: 'vendors',
  },
  milestone_tracker: {
    name: 'Milestone Tracker',
    description: 'Current milestone status',
    icon: TrendingUp,
    defaultSize: 'small',
    defaultChartType: 'metric',
    category: 'timeline',
  },
  budget_variance: {
    name: 'Budget Variance',
    description: 'Over/under budget categories',
    icon: BarChart3,
    defaultSize: 'medium',
    defaultChartType: 'bar',
    category: 'budget',
  },
  payment_trends: {
    name: 'Payment Trends',
    description: 'Payment patterns over time',
    icon: LineChart,
    defaultSize: 'large',
    defaultChartType: 'line',
    category: 'budget',
  },
  guest_analytics: {
    name: 'Guest Analytics',
    description: 'RSVP status and guest metrics',
    icon: Users,
    defaultSize: 'small',
    defaultChartType: 'pie',
    category: 'analytics',
  },
  efficiency_score: {
    name: 'Efficiency Score',
    description: 'Overall wedding planning efficiency',
    icon: TrendingUp,
    defaultSize: 'small',
    defaultChartType: 'metric',
    category: 'analytics',
  },
};

interface ReportBuilderProps {
  weddingId: string;
  onSave?: (report: CustomReport) => void;
  initialReport?: CustomReport;
}

// Sortable Widget Item
const SortableWidgetItem = ({
  widget,
  onRemove,
  onEdit,
}: {
  widget: ReportWidget;
  onRemove: (id: string) => void;
  onEdit: (widget: ReportWidget) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = WIDGET_LIBRARY[widget.type];
  const IconComponent = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group"
    >
      <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <IconComponent className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-sm font-medium">
                  {widget.title}
                </CardTitle>
                {widget.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {widget.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {widget.size}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(widget)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(widget.id)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <IconComponent className="h-8 w-8 mx-auto mb-2" />
              <p className="text-xs">{config.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Widget Library Item
const WidgetLibraryItem = ({
  type,
  onAdd,
}: {
  type: WidgetType;
  onAdd: (type: WidgetType) => void;
}) => {
  const config = WIDGET_LIBRARY[type];
  const IconComponent = config.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onAdd(type)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <IconComponent className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-sm">{config.name}</p>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
          </div>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
};

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  weddingId,
  onSave,
  initialReport,
}) => {
  const [report, setReport] = useState<CustomReport>(
    initialReport || {
      id: crypto.randomUUID(),
      name: 'Custom Report',
      description: '',
      widgets: [],
      layout: 'grid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<ReportWidget | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Categorized widget library
  const widgetCategories = useMemo(() => {
    const categories: Record<string, WidgetType[]> = {
      budget: [],
      timeline: [],
      vendors: [],
      analytics: [],
    };

    Object.entries(WIDGET_LIBRARY).forEach(([type, config]) => {
      categories[config.category].push(type as WidgetType);
    });

    return categories;
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        const oldIndex = report.widgets.findIndex(
          (widget) => widget.id === active.id,
        );
        const newIndex = report.widgets.findIndex(
          (widget) => widget.id === over?.id,
        );

        setReport((prev) => ({
          ...prev,
          widgets: arrayMove(prev.widgets, oldIndex, newIndex),
          updated_at: new Date().toISOString(),
        }));
      }

      setActiveId(null);
    },
    [report.widgets],
  );

  const addWidget = useCallback(
    (type: WidgetType) => {
      const config = WIDGET_LIBRARY[type];
      const newWidget: ReportWidget = {
        id: crypto.randomUUID(),
        type,
        title: config.name,
        size: config.defaultSize,
        chartType: config.defaultChartType,
        dataSource: weddingId,
        filters: {},
        settings: {},
      };

      setReport((prev) => ({
        ...prev,
        widgets: [...prev.widgets, newWidget],
        updated_at: new Date().toISOString(),
      }));
    },
    [weddingId],
  );

  const removeWidget = useCallback((widgetId: string) => {
    setReport((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
      updated_at: new Date().toISOString(),
    }));
  }, []);

  const updateWidget = useCallback((updatedWidget: ReportWidget) => {
    setReport((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === updatedWidget.id ? updatedWidget : w,
      ),
      updated_at: new Date().toISOString(),
    }));
    setEditingWidget(null);
  }, []);

  const saveReport = useCallback(() => {
    if (onSave) {
      onSave(report);
    }
  }, [report, onSave]);

  const activeWidget = useMemo(() => {
    return report.widgets.find((w) => w.id === activeId);
  }, [activeId, report.widgets]);

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Widget Library */}
      <div className="w-80 border-r bg-background overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-2">Widget Library</h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop widgets to build your custom report
          </p>
        </div>

        <div className="p-4 space-y-6">
          {Object.entries(widgetCategories).map(([category, types]) => (
            <div key={category}>
              <h3 className="font-medium text-sm mb-3 capitalize text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {types.map((type) => (
                  <WidgetLibraryItem key={type} type={type} onAdd={addWidget} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                value={report.name}
                onChange={(e) =>
                  setReport((prev) => ({
                    ...prev,
                    name: e.target.value,
                    updated_at: new Date().toISOString(),
                  }))
                }
                className="font-semibold text-lg"
                placeholder="Report Name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>

              <Button onClick={saveReport}>
                <Save className="h-4 w-4 mr-2" />
                Save Report
              </Button>
            </div>
          </div>
        </div>

        {/* Report Canvas */}
        <div className="flex-1 p-6 overflow-y-auto bg-muted/20">
          {report.widgets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Start Building Your Report
                </h3>
                <p className="text-muted-foreground mb-4">
                  Select widgets from the library on the left to create your
                  custom analytics report.
                </p>
              </div>
            </div>
          ) : (
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={report.widgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {report.widgets.map((widget) => (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      onRemove={removeWidget}
                      onEdit={setEditingWidget}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeWidget ? (
                  <div className="opacity-90">
                    <SortableWidgetItem
                      widget={activeWidget}
                      onRemove={() => {}}
                      onEdit={() => {}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* Widget Settings Panel */}
      {editingWidget && (
        <div className="w-80 border-l bg-background p-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Widget Settings</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="widget-title">Title</Label>
                  <Input
                    id="widget-title"
                    value={editingWidget.title}
                    onChange={(e) =>
                      setEditingWidget((prev) =>
                        prev
                          ? {
                              ...prev,
                              title: e.target.value,
                            }
                          : null,
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="widget-subtitle">Subtitle</Label>
                  <Input
                    id="widget-subtitle"
                    value={editingWidget.subtitle || ''}
                    onChange={(e) =>
                      setEditingWidget((prev) =>
                        prev
                          ? {
                              ...prev,
                              subtitle: e.target.value,
                            }
                          : null,
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="widget-size">Size</Label>
                  <Select
                    value={editingWidget.size}
                    onValueChange={(value: any) =>
                      setEditingWidget((prev) =>
                        prev
                          ? {
                              ...prev,
                              size: value,
                            }
                          : null,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingWidget.chartType && (
                  <div>
                    <Label htmlFor="widget-chart-type">Chart Type</Label>
                    <Select
                      value={editingWidget.chartType}
                      onValueChange={(value: any) =>
                        setEditingWidget((prev) =>
                          prev
                            ? {
                                ...prev,
                                chartType: value,
                              }
                            : null,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="metric">Metric Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => updateWidget(editingWidget)}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingWidget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;
