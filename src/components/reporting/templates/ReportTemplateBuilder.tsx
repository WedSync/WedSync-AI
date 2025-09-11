'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Settings,
  Eye,
  Save,
  Copy,
  Trash2,
  GripVertical,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Camera,
  MapPin,
  Clock,
  Star,
  Heart,
  Filter,
} from 'lucide-react';

import {
  ReportTemplate,
  TemplateSection,
  ChartType,
  FilterConfig,
  LayoutConfig,
  StyleConfig,
  WEDDING_COLORS,
  WeddingVendorType,
} from '../types';

interface ReportTemplateBuilderProps {
  template?: ReportTemplate;
  onSave: (template: ReportTemplate) => void;
  onPreview: (template: ReportTemplate) => void;
  onCancel: () => void;
  availableCharts: Array<{
    type: ChartType;
    name: string;
    description: string;
    icon: any;
    categories: string[];
  }>;
  className?: string;
}

const CHART_ICONS: Record<ChartType, any> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: TrendingUp,
  radar: Star,
  heatmap: Calendar,
  gauge: TrendingUp,
  timeline: Clock,
};

const SECTION_TYPES = [
  {
    id: 'header',
    name: 'Header Section',
    icon: Settings,
    description: 'Title, logo, and basic information',
  },
  {
    id: 'metrics',
    name: 'Key Metrics',
    icon: TrendingUp,
    description: 'Important KPIs and summary statistics',
  },
  {
    id: 'chart',
    name: 'Chart Widget',
    icon: BarChart3,
    description: 'Data visualization component',
  },
  {
    id: 'table',
    name: 'Data Table',
    icon: Filter,
    description: 'Tabular data display',
  },
  {
    id: 'text',
    name: 'Text Block',
    icon: Settings,
    description: 'Custom text content',
  },
  {
    id: 'spacer',
    name: 'Spacer',
    icon: Settings,
    description: 'Empty space for layout',
  },
] as const;

const LAYOUT_PRESETS = [
  {
    id: 'single-column',
    name: 'Single Column',
    columns: 1,
    description: 'Simple vertical layout',
  },
  {
    id: 'two-column',
    name: 'Two Columns',
    columns: 2,
    description: 'Split content layout',
  },
  {
    id: 'three-column',
    name: 'Three Columns',
    columns: 3,
    description: 'Multi-column dashboard',
  },
  {
    id: 'grid',
    name: 'Grid Layout',
    columns: 'auto',
    description: 'Responsive grid system',
  },
] as const;

const DEFAULT_TEMPLATE: Partial<ReportTemplate> = {
  name: 'New Report Template',
  description: 'Custom report template',
  sections: [
    {
      id: 'header-1',
      type: 'header',
      title: 'Report Header',
      config: {
        showLogo: true,
        showDate: true,
        showTitle: true,
      },
    },
  ],
  layout: {
    columns: 1,
    spacing: 'medium',
    responsive: true,
  },
  style: {
    theme: 'default',
    colors: WEDDING_COLORS,
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
  },
  filters: [],
  isPublic: false,
  tags: [],
};

const SortableSection = ({
  section,
  onUpdate,
  onDelete,
  onSettings,
}: {
  section: TemplateSection;
  onUpdate: (section: TemplateSection) => void;
  onDelete: () => void;
  onSettings: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSectionIcon = () => {
    const sectionType = SECTION_TYPES.find((s) => s.id === section.type);
    if (section.type === 'chart' && section.chartType) {
      return CHART_ICONS[section.chartType] || BarChart3;
    }
    return sectionType?.icon || Settings;
  };

  const IconComponent = getSectionIcon();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-wedding-primary" />
            <h4 className="font-medium text-gray-900">{section.title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSettings}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-400 hover:text-red-600 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {section.type === 'chart' && section.chartType && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            <IconComponent className="h-3 w-3" />
            {section.chartType} chart
          </span>
        )}

        {section.type === 'metrics' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            <TrendingUp className="h-3 w-3" />
            Key metrics
          </span>
        )}

        {section.description && (
          <p className="mt-1 text-xs">{section.description}</p>
        )}
      </div>

      {section.filters?.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {section.filters.map((filter, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                <Filter className="h-3 w-3" />
                {filter.field}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionPalette = ({
  onAddSection,
}: {
  onAddSection: (type: string) => void;
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-3">Add Section</h3>

      <div className="grid grid-cols-2 gap-2">
        {SECTION_TYPES.map((sectionType) => {
          const IconComponent = sectionType.icon;

          return (
            <button
              key={sectionType.id}
              onClick={() => onAddSection(sectionType.id)}
              className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-wedding-primary hover:bg-wedding-primary/5 transition-all group"
            >
              <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-wedding-primary" />
              <span className="text-xs font-medium text-gray-700 group-hover:text-wedding-primary text-center">
                {sectionType.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TemplateSettings = ({
  template,
  onUpdate,
}: {
  template: ReportTemplate;
  onUpdate: (template: Partial<ReportTemplate>) => void;
}) => {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Template Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent"
              placeholder="Enter template name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={template.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent"
              rows={3}
              placeholder="Describe this template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={template.tags?.join(', ') || ''}
              onChange={(e) =>
                onUpdate({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent"
              placeholder="photography, revenue, monthly (comma separated)"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={template.isPublic}
              onChange={(e) => onUpdate({ isPublic: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
              Make this template public (other vendors can use it)
            </label>
          </div>
        </div>
      </div>

      {/* Layout Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Layout</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layout Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() =>
                    onUpdate({
                      layout: {
                        ...template.layout,
                        columns: preset.columns,
                        type: preset.id,
                      },
                    })
                  }
                  className={`p-3 border rounded-lg text-left transition-all ${
                    template.layout?.type === preset.id
                      ? 'border-wedding-primary bg-wedding-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-gray-600">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spacing
            </label>
            <select
              value={template.layout?.spacing || 'medium'}
              onChange={(e) =>
                onUpdate({
                  layout: {
                    ...template.layout,
                    spacing: e.target.value as 'compact' | 'medium' | 'relaxed',
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary"
            >
              <option value="compact">Compact</option>
              <option value="medium">Medium</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="responsive"
              checked={template.layout?.responsive !== false}
              onChange={(e) =>
                onUpdate({
                  layout: {
                    ...template.layout,
                    responsive: e.target.checked,
                  },
                })
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="responsive" className="ml-2 text-sm text-gray-700">
              Responsive layout (adapts to screen size)
            </label>
          </div>
        </div>
      </div>

      {/* Style Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Styling</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={template.style?.theme || 'default'}
              onChange={(e) =>
                onUpdate({
                  style: {
                    ...template.style,
                    theme: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary"
            >
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
              <option value="elegant">Elegant</option>
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(WEDDING_COLORS).map(([key, color]) => (
                <button
                  key={key}
                  className="w-8 h-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: color }}
                  title={key}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReportTemplateBuilder: React.FC<ReportTemplateBuilderProps> = ({
  template: initialTemplate,
  onSave,
  onPreview,
  onCancel,
  availableCharts = [],
  className = '',
}) => {
  const [template, setTemplate] = useState<ReportTemplate>(
    () =>
      ({
        ...DEFAULT_TEMPLATE,
        ...initialTemplate,
        id: initialTemplate?.id || `template_${Date.now()}`,
        createdAt: initialTemplate?.createdAt || new Date(),
        updatedAt: new Date(),
      }) as ReportTemplate,
  );

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSection(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTemplate((prev) => ({
        ...prev,
        sections: arrayMove(
          prev.sections,
          prev.sections.findIndex((s) => s.id === active.id),
          prev.sections.findIndex((s) => s.id === over.id),
        ),
        updatedAt: new Date(),
      }));
    }

    setActiveSection(null);
  };

  const handleAddSection = useCallback(
    (type: string) => {
      const newSection: TemplateSection = {
        id: `section_${Date.now()}`,
        type: type as any,
        title: `New ${type} Section`,
        config: {},
        position: template.sections.length,
      };

      if (type === 'chart') {
        newSection.chartType = 'bar';
      }

      setTemplate((prev) => ({
        ...prev,
        sections: [...prev.sections, newSection],
        updatedAt: new Date(),
      }));
    },
    [template.sections.length],
  );

  const handleUpdateSection = useCallback(
    (sectionId: string, updates: Partial<TemplateSection>) => {
      setTemplate((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section,
        ),
        updatedAt: new Date(),
      }));
    },
    [],
  );

  const handleDeleteSection = useCallback((sectionId: string) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
      updatedAt: new Date(),
    }));
  }, []);

  const handleTemplateUpdate = useCallback(
    (updates: Partial<ReportTemplate>) => {
      setTemplate((prev) => ({
        ...prev,
        ...updates,
        updatedAt: new Date(),
      }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    onSave(template);
  }, [template, onSave]);

  const handlePreview = useCallback(() => {
    onPreview(template);
  }, [template, onPreview]);

  const activeSectionData = useMemo(() => {
    return template.sections.find((s) => s.id === activeSection);
  }, [template.sections, activeSection]);

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="flex">
        {/* Left Sidebar - Tools and Settings */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Template Builder</h2>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-md transition-colors ${
                  showSettings
                    ? 'bg-wedding-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-wedding-primary text-white px-3 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors text-sm font-medium"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Save
              </button>
              <button
                onClick={handlePreview}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {showSettings ? (
              <TemplateSettings
                template={template}
                onUpdate={handleTemplateUpdate}
              />
            ) : (
              <SectionPalette onAddSection={handleAddSection} />
            )}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-96">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {template.name}
                </h1>
                {template.description && (
                  <p className="text-gray-600 mt-1">{template.description}</p>
                )}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={template.sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {template.sections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        onUpdate={(updates) =>
                          handleUpdateSection(section.id, updates)
                        }
                        onDelete={() => handleDeleteSection(section.id)}
                        onSettings={() => {
                          /* TODO: Open section settings modal */
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeSectionData && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {activeSectionData.title}
                        </span>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>

              {template.sections.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <BarChart3 className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start Building Your Report
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add sections from the left panel to create your custom
                    report template.
                  </p>
                  <button
                    onClick={() => handleAddSection('header')}
                    className="inline-flex items-center gap-2 bg-wedding-primary text-white px-4 py-2 rounded-md hover:bg-wedding-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Section
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportTemplateBuilder;
