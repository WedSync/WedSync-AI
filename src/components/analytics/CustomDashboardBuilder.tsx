'use client';

// WS-332 Analytics Dashboard - Custom Dashboard Builder Component
// Team A - Round 1 - Interactive dashboard building with drag-and-drop

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CustomDashboardBuilderProps,
  WidgetLibrary,
  AvailableWidget,
  DashboardConfiguration,
  AnalyticsWidget,
} from '@/types/analytics';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Icons
import {
  Plus,
  Grid3X3,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Heart,
  Save,
  Eye,
  Trash2,
  Copy,
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  Move,
  RotateCcw,
  Maximize2,
} from 'lucide-react';

// Mock widget library
const mockWidgetLibrary: WidgetLibrary[] = [
  {
    category: 'charts',
    widgets: [
      {
        id: 'revenue_chart',
        name: 'Revenue Chart',
        description: 'Track revenue trends over time',
        previewImage: '/widgets/revenue-chart.png',
        configurationOptions: [
          {
            key: 'chartType',
            label: 'Chart Type',
            type: 'select',
            required: true,
            defaultValue: 'line',
            options: [
              { label: 'Line Chart', value: 'line' },
              { label: 'Bar Chart', value: 'bar' },
              { label: 'Area Chart', value: 'area' },
            ],
          },
          {
            key: 'timeRange',
            label: 'Time Range',
            type: 'select',
            required: true,
            defaultValue: 'last_30_days',
            options: [
              { label: 'Last 7 Days', value: 'last_7_days' },
              { label: 'Last 30 Days', value: 'last_30_days' },
              { label: 'Last 90 Days', value: 'last_90_days' },
            ],
          },
          {
            key: 'showComparison',
            label: 'Show Comparison',
            type: 'boolean',
            required: false,
            defaultValue: false,
          },
        ],
        dataSources: [
          {
            id: 'revenue_api',
            name: 'Revenue API',
            type: 'api',
            endpoint: '/api/analytics/revenue',
            schema: {
              fields: [
                {
                  name: 'date',
                  type: 'date',
                  description: 'Date',
                  nullable: false,
                },
              ],
            },
          },
        ],
        sizeConstraints: { minWidth: 300, minHeight: 200, resizable: true },
      },
      {
        id: 'booking_funnel',
        name: 'Booking Funnel',
        description: 'Visualize booking conversion funnel',
        previewImage: '/widgets/booking-funnel.png',
        configurationOptions: [
          {
            key: 'funnelType',
            label: 'Funnel Type',
            type: 'select',
            required: true,
            defaultValue: 'traditional',
            options: [
              { label: 'Traditional Funnel', value: 'traditional' },
              { label: 'Sankey Diagram', value: 'sankey' },
            ],
          },
          {
            key: 'showDropoffs',
            label: 'Show Dropoffs',
            type: 'boolean',
            required: false,
            defaultValue: true,
          },
        ],
        dataSources: [
          {
            id: 'funnel_api',
            name: 'Funnel API',
            type: 'api',
            endpoint: '/api/analytics/funnel',
            schema: {
              fields: [
                {
                  name: 'stage',
                  type: 'string',
                  description: 'Stage',
                  nullable: false,
                },
              ],
            },
          },
        ],
        sizeConstraints: { minWidth: 400, minHeight: 300, resizable: true },
      },
    ],
  },
  {
    category: 'metrics',
    widgets: [
      {
        id: 'kpi_metric',
        name: 'KPI Metric',
        description: 'Display key performance indicator',
        previewImage: '/widgets/kpi-metric.png',
        configurationOptions: [
          {
            key: 'metricName',
            label: 'Metric Name',
            type: 'text',
            required: true,
            defaultValue: '',
          },
          {
            key: 'metricType',
            label: 'Metric Type',
            type: 'select',
            required: true,
            defaultValue: 'number',
            options: [
              { label: 'Number', value: 'number' },
              { label: 'Percentage', value: 'percentage' },
              { label: 'Currency', value: 'currency' },
            ],
          },
          {
            key: 'showTrend',
            label: 'Show Trend',
            type: 'boolean',
            required: false,
            defaultValue: true,
          },
          {
            key: 'showTarget',
            label: 'Show Target',
            type: 'boolean',
            required: false,
            defaultValue: false,
          },
        ],
        dataSources: [
          {
            id: 'kpi_api',
            name: 'KPI API',
            type: 'api',
            endpoint: '/api/analytics/kpis',
            schema: {
              fields: [
                {
                  name: 'value',
                  type: 'number',
                  description: 'Value',
                  nullable: false,
                },
              ],
            },
          },
        ],
        sizeConstraints: { minWidth: 200, minHeight: 150, resizable: true },
      },
      {
        id: 'satisfaction_gauge',
        name: 'Satisfaction Gauge',
        description: 'Client satisfaction gauge meter',
        previewImage: '/widgets/satisfaction-gauge.png',
        configurationOptions: [
          {
            key: 'minValue',
            label: 'Min Value',
            type: 'number',
            required: true,
            defaultValue: 0,
          },
          {
            key: 'maxValue',
            label: 'Max Value',
            type: 'number',
            required: true,
            defaultValue: 10,
          },
          {
            key: 'showLabels',
            label: 'Show Labels',
            type: 'boolean',
            required: false,
            defaultValue: true,
          },
        ],
        dataSources: [
          {
            id: 'satisfaction_api',
            name: 'Satisfaction API',
            type: 'api',
            endpoint: '/api/analytics/satisfaction',
            schema: {
              fields: [
                {
                  name: 'score',
                  type: 'number',
                  description: 'Score',
                  nullable: false,
                },
              ],
            },
          },
        ],
        sizeConstraints: { minWidth: 250, minHeight: 250, resizable: true },
      },
    ],
  },
  {
    category: 'tables',
    widgets: [
      {
        id: 'recent_bookings',
        name: 'Recent Bookings',
        description: 'List of recent wedding bookings',
        previewImage: '/widgets/recent-bookings.png',
        configurationOptions: [
          {
            key: 'maxRows',
            label: 'Max Rows',
            type: 'number',
            required: true,
            defaultValue: 10,
          },
          {
            key: 'showStatus',
            label: 'Show Status',
            type: 'boolean',
            required: false,
            defaultValue: true,
          },
          {
            key: 'sortBy',
            label: 'Sort By',
            type: 'select',
            required: true,
            defaultValue: 'date',
            options: [
              { label: 'Date', value: 'date' },
              { label: 'Value', value: 'value' },
              { label: 'Status', value: 'status' },
            ],
          },
        ],
        dataSources: [
          {
            id: 'bookings_api',
            name: 'Bookings API',
            type: 'api',
            endpoint: '/api/analytics/bookings',
            schema: {
              fields: [
                {
                  name: 'date',
                  type: 'date',
                  description: 'Date',
                  nullable: false,
                },
              ],
            },
          },
        ],
        sizeConstraints: { minWidth: 400, minHeight: 300, resizable: true },
      },
    ],
  },
];

interface DashboardGrid {
  rows: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}

interface PreviewDevice {
  name: string;
  width: number;
  height: number;
  icon: React.ElementType;
}

const previewDevices: PreviewDevice[] = [
  { name: 'Desktop', width: 1200, height: 800, icon: Monitor },
  { name: 'Tablet', width: 768, height: 1024, icon: Tablet },
  { name: 'Mobile', width: 375, height: 667, icon: Smartphone },
];

export function CustomDashboardBuilder({
  userId,
  availableWidgets,
  currentDashboard,
  onDashboardSave,
}: CustomDashboardBuilderProps) {
  // State Management
  const [dashboardName, setDashboardName] = useState(
    currentDashboard.layout.name || 'My Dashboard',
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('charts');
  const [dashboardWidgets, setDashboardWidgets] = useState<AnalyticsWidget[]>(
    currentDashboard.widgets || [],
  );
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>(
    previewDevices[0],
  );
  const [gridSettings, setGridSettings] = useState<DashboardGrid>({
    rows: 6,
    columns: 12,
    cellWidth: 80,
    cellHeight: 60,
    gap: 16,
  });
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configuringWidget, setConfiguringWidget] =
    useState<AnalyticsWidget | null>(null);

  // Memoized calculations
  const widgetLibrary = useMemo(() => mockWidgetLibrary, []);

  const filteredWidgets = useMemo(() => {
    const category = widgetLibrary.find(
      (cat) => cat.category === selectedCategory,
    );
    return category?.widgets || [];
  }, [selectedCategory, widgetLibrary]);

  const dashboardGrid = useMemo(() => {
    const gridCells: boolean[][] = Array(gridSettings.rows)
      .fill(null)
      .map(() => Array(gridSettings.columns).fill(false));

    dashboardWidgets.forEach((widget) => {
      const { x, y, width, height } = widget.position;
      for (let row = y; row < y + height && row < gridSettings.rows; row++) {
        for (
          let col = x;
          col < x + width && col < gridSettings.columns;
          col++
        ) {
          if (gridCells[row] && gridCells[row][col] !== undefined) {
            gridCells[row][col] = true;
          }
        }
      }
    });

    return gridCells;
  }, [dashboardWidgets, gridSettings]);

  // Widget management functions
  const addWidget = useCallback(
    (widgetTemplate: AvailableWidget) => {
      // Find next available position
      let position = { x: 0, y: 0, width: 3, height: 2 };

      for (let row = 0; row < gridSettings.rows; row++) {
        for (let col = 0; col < gridSettings.columns - 2; col++) {
          const canPlace =
            !dashboardGrid[row]?.[col] &&
            !dashboardGrid[row]?.[col + 1] &&
            !dashboardGrid[row]?.[col + 2] &&
            !dashboardGrid[row + 1]?.[col] &&
            !dashboardGrid[row + 1]?.[col + 1] &&
            !dashboardGrid[row + 1]?.[col + 2];

          if (canPlace) {
            position = { x: col, y: row, width: 3, height: 2 };
            break;
          }
        }
        if (position.x !== 0 || position.y !== 0) break;
      }

      const newWidget: AnalyticsWidget = {
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: widgetTemplate.id as any,
        title: widgetTemplate.name,
        position,
        configuration: {
          chartType:
            widgetTemplate.configurationOptions.find(
              (opt) => opt.key === 'chartType',
            )?.defaultValue || 'line',
          timeRange: {
            startDate: new Date(),
            endDate: new Date(),
            granularity: 'day',
            timezone: 'UTC',
          },
          filters: [],
          displayOptions: {
            showLegend: true,
            showGrid: true,
            showTooltips: true,
            animation: true,
            colorScheme: 'default',
          },
        },
        dataSource: {
          endpoint: widgetTemplate.dataSources[0]?.endpoint || '',
          parameters: {},
          transformations: [],
          cacheKey: '',
          cacheDuration: 300,
        },
        refreshRate: 60,
        alertsEnabled: false,
      };

      setDashboardWidgets((prev) => [...prev, newWidget]);
    },
    [dashboardGrid, gridSettings],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      setDashboardWidgets((prev) => prev.filter((w) => w.id !== widgetId));
      if (selectedWidget === widgetId) {
        setSelectedWidget(null);
      }
    },
    [selectedWidget],
  );

  const duplicateWidget = useCallback(
    (widgetId: string) => {
      const widget = dashboardWidgets.find((w) => w.id === widgetId);
      if (!widget) return;

      const duplicatedWidget: AnalyticsWidget = {
        ...widget,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `${widget.title} Copy`,
        position: {
          ...widget.position,
          x: widget.position.x + 1,
          y: widget.position.y + 1,
        },
      };

      setDashboardWidgets((prev) => [...prev, duplicatedWidget]);
    },
    [dashboardWidgets],
  );

  const updateWidgetPosition = useCallback(
    (
      widgetId: string,
      position: { x: number; y: number; width: number; height: number },
    ) => {
      setDashboardWidgets((prev) =>
        prev.map((widget) =>
          widget.id === widgetId ? { ...widget, position } : widget,
        ),
      );
    },
    [],
  );

  const configureWidget = useCallback((widget: AnalyticsWidget) => {
    setConfiguringWidget(widget);
    setConfigDialogOpen(true);
  }, []);

  const saveWidgetConfiguration = useCallback(
    (widgetId: string, configuration: any) => {
      setDashboardWidgets((prev) =>
        prev.map((widget) =>
          widget.id === widgetId
            ? {
                ...widget,
                configuration: { ...widget.configuration, ...configuration },
              }
            : widget,
        ),
      );
      setConfigDialogOpen(false);
      setConfiguringWidget(null);
    },
    [],
  );

  // Dashboard management
  const saveDashboard = useCallback(() => {
    const updatedDashboard: DashboardConfiguration = {
      ...currentDashboard,
      layout: {
        ...currentDashboard.layout,
        name: dashboardName,
        gridColumns: gridSettings.columns,
        gridRows: gridSettings.rows,
      },
      widgets: dashboardWidgets,
    };

    onDashboardSave(updatedDashboard);
  }, [
    currentDashboard,
    dashboardName,
    gridSettings,
    dashboardWidgets,
    onDashboardSave,
  ]);

  const resetDashboard = useCallback(() => {
    setDashboardWidgets([]);
    setSelectedWidget(null);
    setDashboardName('My Dashboard');
  }, []);

  // Get widget icon
  const getWidgetIcon = useCallback((widgetId: string) => {
    const iconMap: Record<string, React.ElementType> = {
      revenue_chart: BarChart3,
      booking_funnel: TrendingUp,
      kpi_metric: Target,
      satisfaction_gauge: Heart,
      recent_bookings: Users,
      market_position: PieChart,
    };
    return iconMap[widgetId] || BarChart3;
  }, []);

  return (
    <div className="custom-dashboard-builder min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Builder Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Grid3X3 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Dashboard Builder
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Create custom analytics dashboards for your wedding business
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Input
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="Dashboard name"
                className="w-48"
              />

              <div className="flex rounded-md border border-slate-200 dark:border-slate-700">
                {previewDevices.map((device) => {
                  const IconComponent = device.icon;
                  return (
                    <Button
                      key={device.name}
                      variant={
                        previewDevice.name === device.name ? 'default' : 'ghost'
                      }
                      size="sm"
                      onClick={() => setPreviewDevice(device)}
                      className="rounded-none first:rounded-l-md last:rounded-r-md"
                    >
                      <IconComponent className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>

              <Button
                variant={previewMode ? 'default' : 'outline'}
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>

              <Button onClick={saveDashboard}>
                <Save className="h-4 w-4 mr-2" />
                Save Dashboard
              </Button>

              <Button variant="outline" onClick={resetDashboard}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Widget Library Sidebar */}
        {!previewMode && (
          <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Widget Library
              </h2>

              {/* Category Tabs */}
              <Tabs
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="tables">Tables</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-4">
                  <div className="space-y-3">
                    {filteredWidgets.map((widget) => {
                      const IconComponent = getWidgetIcon(widget.id);

                      return (
                        <motion.div
                          key={widget.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => addWidget(widget)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                              <IconComponent className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                {widget.name}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {widget.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-1">
                            <Plus className="h-3 w-3 text-blue-600" />
                            <span className="text-xs text-blue-600 font-medium">
                              Add to Dashboard
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Grid Settings */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                  Grid Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Columns</Label>
                    <Input
                      type="number"
                      value={gridSettings.columns}
                      onChange={(e) =>
                        setGridSettings((prev) => ({
                          ...prev,
                          columns: parseInt(e.target.value) || 12,
                        }))
                      }
                      min="6"
                      max="24"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Rows</Label>
                    <Input
                      type="number"
                      value={gridSettings.rows}
                      onChange={(e) =>
                        setGridSettings((prev) => ({
                          ...prev,
                          rows: parseInt(e.target.value) || 6,
                        }))
                      }
                      min="4"
                      max="12"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Canvas */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div
              className="dashboard-canvas bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 relative"
              style={{
                width: previewMode ? previewDevice.width : '100%',
                minHeight: previewMode ? previewDevice.height : '600px',
                margin: previewMode ? '0 auto' : '0',
                transform:
                  previewMode && previewDevice.width > 1000
                    ? 'scale(0.8)'
                    : 'none',
                transformOrigin: 'top center',
              }}
            >
              {/* Grid Overlay (only in edit mode) */}
              {!previewMode && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="grid gap-1 h-full w-full p-4"
                    style={{
                      gridTemplateColumns: `repeat(${gridSettings.columns}, 1fr)`,
                      gridTemplateRows: `repeat(${gridSettings.rows}, 1fr)`,
                    }}
                  >
                    {Array(gridSettings.rows * gridSettings.columns)
                      .fill(null)
                      .map((_, index) => (
                        <div
                          key={index}
                          className="border border-slate-100 dark:border-slate-700 rounded opacity-50"
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Dashboard Widgets */}
              <div className="relative p-4 h-full">
                {dashboardWidgets.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Grid3X3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Empty Dashboard
                      </h3>
                      <p className="text-slate-500">
                        Add widgets from the library to start building your
                        dashboard
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="grid gap-4 h-full"
                    style={{
                      gridTemplateColumns: `repeat(${gridSettings.columns}, 1fr)`,
                      gridTemplateRows: `repeat(${gridSettings.rows}, 1fr)`,
                    }}
                  >
                    {dashboardWidgets.map((widget) => {
                      const IconComponent = getWidgetIcon(widget.type);
                      const isSelected = selectedWidget === widget.id;

                      return (
                        <motion.div
                          key={widget.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-lg border bg-white dark:bg-slate-900 overflow-hidden ${
                            isSelected
                              ? 'border-blue-500 shadow-lg'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                          style={{
                            gridColumn: `${widget.position.x + 1} / span ${widget.position.width}`,
                            gridRow: `${widget.position.y + 1} / span ${widget.position.height}`,
                          }}
                          onClick={() => setSelectedWidget(widget.id)}
                        >
                          {/* Widget Header */}
                          <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-slate-600" />
                              <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                {widget.title}
                              </span>
                            </div>

                            {!previewMode && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    configureWidget(widget);
                                  }}
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateWidget(widget.id);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeWidget(widget.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Widget Content */}
                          <div className="p-4 h-full">
                            {widget.type === 'revenue_chart' && (
                              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded">
                                <div className="text-center">
                                  <BarChart3 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Revenue Chart
                                  </p>
                                </div>
                              </div>
                            )}

                            {widget.type === 'booking_funnel' && (
                              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded">
                                <div className="text-center">
                                  <TrendingUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Booking Funnel
                                  </p>
                                </div>
                              </div>
                            )}

                            {widget.type === 'kpi_metric' && (
                              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded">
                                <div className="text-center">
                                  <Target className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    KPI Metric
                                  </p>
                                </div>
                              </div>
                            )}

                            {widget.type === 'satisfaction_gauge' && (
                              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded">
                                <div className="text-center">
                                  <Heart className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Satisfaction Gauge
                                  </p>
                                </div>
                              </div>
                            )}

                            {widget.type === 'recent_bookings' && (
                              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded">
                                <div className="text-center">
                                  <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Recent Bookings
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Resize Handle */}
                          {!previewMode && isSelected && (
                            <div className="absolute bottom-1 right-1 w-3 h-3 bg-blue-500 rounded cursor-se-resize opacity-60 hover:opacity-100" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Stats */}
            {!previewMode && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Total Widgets
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {dashboardWidgets.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Grid Usage
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(
                        (dashboardWidgets.reduce(
                          (sum, widget) =>
                            sum +
                            widget.position.width * widget.position.height,
                          0,
                        ) /
                          (gridSettings.rows * gridSettings.columns)) *
                          100,
                      )}
                      %
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Charts
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {
                        dashboardWidgets.filter((w) =>
                          ['revenue_chart', 'booking_funnel'].includes(w.type),
                        ).length
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      KPIs
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {
                        dashboardWidgets.filter((w) =>
                          ['kpi_metric', 'satisfaction_gauge'].includes(w.type),
                        ).length
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configure Widget: {configuringWidget?.title}
            </DialogTitle>
          </DialogHeader>

          {configuringWidget && (
            <div className="space-y-4">
              <div>
                <Label>Widget Title</Label>
                <Input
                  value={configuringWidget.title}
                  onChange={(e) =>
                    setConfiguringWidget({
                      ...configuringWidget,
                      title: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Refresh Rate (seconds)</Label>
                <Input
                  type="number"
                  value={configuringWidget.refreshRate}
                  onChange={(e) =>
                    setConfiguringWidget({
                      ...configuringWidget,
                      refreshRate: parseInt(e.target.value) || 60,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={configuringWidget.alertsEnabled}
                  onCheckedChange={(checked) =>
                    setConfiguringWidget({
                      ...configuringWidget,
                      alertsEnabled: checked,
                    })
                  }
                />
                <Label>Enable Alerts</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfigDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    configuringWidget &&
                    saveWidgetConfiguration(configuringWidget.id, {
                      title: configuringWidget.title,
                      refreshRate: configuringWidget.refreshRate,
                      alertsEnabled: configuringWidget.alertsEnabled,
                    })
                  }
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
