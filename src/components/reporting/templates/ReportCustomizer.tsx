'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Palette,
  Layout,
  Filter,
  Calendar,
  Save,
  Eye,
  RotateCcw,
  Sliders,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Clock,
  Star,
  DollarSign,
  Users,
  Heart,
  Camera,
  MapPin,
  Zap,
  Target,
  RefreshCw,
} from 'lucide-react';

import {
  ReportTemplate,
  TemplateSection,
  FilterConfig,
  ChartType,
  DateRange,
  WeddingVendorType,
  WEDDING_COLORS,
  SEASONAL_COLORS,
  formatDate,
} from '../types';

interface ReportCustomizerProps {
  template: ReportTemplate;
  onSave: (customizedTemplate: ReportTemplate) => void;
  onPreview: (customizedTemplate: ReportTemplate) => void;
  onCancel: () => void;
  defaultDateRange?: DateRange;
  vendorType?: WeddingVendorType;
  className?: string;
}

const CHART_TYPE_OPTIONS = [
  {
    type: 'bar' as ChartType,
    name: 'Bar Chart',
    icon: BarChart3,
    description: 'Compare categories',
  },
  {
    type: 'line' as ChartType,
    name: 'Line Chart',
    icon: LineChart,
    description: 'Show trends over time',
  },
  {
    type: 'pie' as ChartType,
    name: 'Pie Chart',
    icon: PieChart,
    description: 'Show proportions',
  },
  {
    type: 'area' as ChartType,
    name: 'Area Chart',
    icon: TrendingUp,
    description: 'Filled trend lines',
  },
  {
    type: 'radar' as ChartType,
    name: 'Radar Chart',
    icon: Star,
    description: 'Multi-dimensional data',
  },
  {
    type: 'gauge' as ChartType,
    name: 'Gauge Chart',
    icon: Target,
    description: 'Single metric progress',
  },
  {
    type: 'timeline' as ChartType,
    name: 'Timeline',
    icon: Clock,
    description: 'Time-based events',
  },
];

const COLOR_SCHEMES = [
  { name: 'Wedding', colors: WEDDING_COLORS, primary: '#c59d6c' },
  { name: 'Seasonal', colors: SEASONAL_COLORS, primary: '#3b82f6' },
  {
    name: 'Professional',
    colors: { primary: '#1f2937', secondary: '#6b7280', accent: '#3b82f6' },
    primary: '#1f2937',
  },
  {
    name: 'Elegant',
    colors: { primary: '#7c3aed', secondary: '#a855f7', accent: '#c084fc' },
    primary: '#7c3aed',
  },
  {
    name: 'Natural',
    colors: { primary: '#059669', secondary: '#10b981', accent: '#34d399' },
    primary: '#059669',
  },
  {
    name: 'Warm',
    colors: { primary: '#dc2626', secondary: '#ef4444', accent: '#f87171' },
    primary: '#dc2626',
  },
];

const DATE_RANGE_PRESETS = [
  { id: 'last-30-days', name: 'Last 30 Days', days: 30 },
  { id: 'last-3-months', name: 'Last 3 Months', days: 90 },
  { id: 'last-6-months', name: 'Last 6 Months', days: 180 },
  { id: 'last-year', name: 'Last Year', days: 365 },
  { id: 'this-year', name: 'This Year', custom: true },
  { id: 'custom', name: 'Custom Range', custom: true },
];

const FILTER_TYPES = [
  {
    type: 'date',
    name: 'Date Range',
    icon: Calendar,
    description: 'Filter by date period',
  },
  {
    type: 'vendor',
    name: 'Vendor Type',
    icon: Camera,
    description: 'Filter by vendor category',
  },
  {
    type: 'status',
    name: 'Booking Status',
    icon: Target,
    description: 'Filter by booking status',
  },
  {
    type: 'value',
    name: 'Value Range',
    icon: DollarSign,
    description: 'Filter by monetary value',
  },
  {
    type: 'rating',
    name: 'Rating',
    icon: Star,
    description: 'Filter by rating/satisfaction',
  },
  {
    type: 'season',
    name: 'Wedding Season',
    icon: Heart,
    description: 'Filter by wedding season',
  },
];

const SectionCustomizer = ({
  section,
  onUpdate,
}: {
  section: TemplateSection;
  onUpdate: (updates: Partial<TemplateSection>) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSectionIcon = () => {
    if (section.type === 'chart' && section.chartType) {
      const chartOption = CHART_TYPE_OPTIONS.find(
        (c) => c.type === section.chartType,
      );
      return chartOption?.icon || BarChart3;
    }
    return BarChart3; // Default icon
  };

  const IconComponent = getSectionIcon();

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <IconComponent className="h-5 w-5 text-wedding-primary" />
          <div className="text-left">
            <h4 className="font-medium text-gray-900">{section.title}</h4>
            <p className="text-sm text-gray-600">{section.type} section</p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Settings className="h-4 w-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-4 space-y-4">
              {/* Section Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent text-sm"
                />
              </div>

              {/* Chart Type (for chart sections) */}
              {section.type === 'chart' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHART_TYPE_OPTIONS.map((chartType) => {
                      const ChartIcon = chartType.icon;

                      return (
                        <button
                          key={chartType.type}
                          onClick={() =>
                            onUpdate({ chartType: chartType.type })
                          }
                          className={`flex items-center gap-2 p-2 border rounded-md text-left transition-all text-sm ${
                            section.chartType === chartType.type
                              ? 'border-wedding-primary bg-wedding-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <ChartIcon className="h-4 w-4 text-wedding-primary" />
                          <div>
                            <div className="font-medium">{chartType.name}</div>
                            <div className="text-xs text-gray-500">
                              {chartType.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Filters
                </label>
                <div className="space-y-2">
                  {FILTER_TYPES.slice(0, 3).map((filterType) => {
                    const FilterIcon = filterType.icon;
                    const isActive = section.filters?.some(
                      (f) => f.type === filterType.type,
                    );

                    return (
                      <label
                        key={filterType.type}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => {
                            const currentFilters = section.filters || [];
                            let newFilters;

                            if (e.target.checked) {
                              newFilters = [
                                ...currentFilters,
                                {
                                  id: `${filterType.type}-${Date.now()}`,
                                  type: filterType.type,
                                  field: filterType.type,
                                  operator: 'equals',
                                  value: '',
                                  label: filterType.name,
                                },
                              ];
                            } else {
                              newFilters = currentFilters.filter(
                                (f) => f.type !== filterType.type,
                              );
                            }

                            onUpdate({ filters: newFilters });
                          }}
                          className="rounded border-gray-300"
                        />
                        <FilterIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {filterType.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={section.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Describe what this section shows..."
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GlobalFilters = ({
  template,
  onUpdate,
}: {
  template: ReportTemplate;
  onUpdate: (updates: Partial<ReportTemplate>) => void;
}) => {
  const [selectedDateRange, setSelectedDateRange] = useState('last-30-days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleDateRangeChange = useCallback(
    (rangeId: string) => {
      setSelectedDateRange(rangeId);

      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (rangeId) {
        case 'last-30-days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last-3-months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last-6-months':
          startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'last-year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'this-year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          return; // Don't update for custom range
      }

      onUpdate({
        globalFilters: {
          ...template.globalFilters,
          dateRange: {
            start: startDate,
            end: endDate,
            preset: rangeId,
          },
        },
      });
    },
    [template.globalFilters, onUpdate],
  );

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">Global Filters</h3>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {DATE_RANGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleDateRangeChange(preset.id)}
              className={`px-3 py-2 text-sm border rounded-md transition-all ${
                selectedDateRange === preset.id
                  ? 'border-wedding-primary bg-wedding-primary/5 text-wedding-primary'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {selectedDateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Global Filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Filters
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={template.globalFilters?.includeCancelled === true}
              onChange={(e) =>
                onUpdate({
                  globalFilters: {
                    ...template.globalFilters,
                    includeCancelled: e.target.checked,
                  },
                })
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Include cancelled bookings
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={template.globalFilters?.showProjections === true}
              onChange={(e) =>
                onUpdate({
                  globalFilters: {
                    ...template.globalFilters,
                    showProjections: e.target.checked,
                  },
                })
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Show future projections
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

const StyleCustomizer = ({
  template,
  onUpdate,
}: {
  template: ReportTemplate;
  onUpdate: (updates: Partial<ReportTemplate>) => void;
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">Styling & Colors</h3>

      {/* Color Scheme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color Scheme
        </label>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.name}
              onClick={() =>
                onUpdate({
                  style: {
                    ...template.style,
                    colors: scheme.colors,
                    theme: scheme.name.toLowerCase(),
                  },
                })
              }
              className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                template.style?.theme === scheme.name.toLowerCase()
                  ? 'border-wedding-primary bg-wedding-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1">
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: scheme.primary }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{
                    backgroundColor:
                      Object.values(scheme.colors)[1] || scheme.primary,
                  }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{
                    backgroundColor:
                      Object.values(scheme.colors)[2] || scheme.primary,
                  }}
                />
              </div>
              <span className="text-sm font-medium">{scheme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layout Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Layout Density
        </label>
        <div className="flex gap-2">
          {['compact', 'comfortable', 'spacious'].map((density) => (
            <button
              key={density}
              onClick={() =>
                onUpdate({
                  layout: {
                    ...template.layout,
                    spacing: density as 'compact' | 'medium' | 'relaxed',
                  },
                })
              }
              className={`flex-1 px-3 py-2 text-sm border rounded-md transition-all capitalize ${
                template.layout?.spacing === density
                  ? 'border-wedding-primary bg-wedding-primary/5 text-wedding-primary'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {density}
            </button>
          ))}
        </div>
      </div>

      {/* Font Settings */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Typography
        </label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={template.style?.fonts?.heading || 'Inter'}
            onChange={(e) =>
              onUpdate({
                style: {
                  ...template.style,
                  fonts: {
                    ...template.style?.fonts,
                    heading: e.target.value,
                  },
                },
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value="Inter">Inter (Headings)</option>
            <option value="Playfair Display">Playfair Display</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Poppins">Poppins</option>
          </select>

          <select
            value={template.style?.fonts?.body || 'Inter'}
            onChange={(e) =>
              onUpdate({
                style: {
                  ...template.style,
                  fonts: {
                    ...template.style?.fonts,
                    body: e.target.value,
                  },
                },
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wedding-primary text-sm"
          >
            <option value="Inter">Inter (Body)</option>
            <option value="Source Sans Pro">Source Sans Pro</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export const ReportCustomizer: React.FC<ReportCustomizerProps> = ({
  template: initialTemplate,
  onSave,
  onPreview,
  onCancel,
  defaultDateRange,
  vendorType,
  className = '',
}) => {
  const [template, setTemplate] = useState<ReportTemplate>(() => ({
    ...initialTemplate,
    updatedAt: new Date(),
  }));

  const [activeTab, setActiveTab] = useState<'sections' | 'filters' | 'style'>(
    'sections',
  );

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

  const handleSectionUpdate = useCallback(
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

  const handleSave = useCallback(() => {
    onSave({
      ...template,
      name: `${template.name} (Customized)`,
      id: `customized_${Date.now()}`,
      isCustomized: true,
      originalTemplateId: initialTemplate.id,
    });
  }, [template, initialTemplate.id, onSave]);

  const handlePreview = useCallback(() => {
    onPreview(template);
  }, [template, onPreview]);

  const handleReset = useCallback(() => {
    setTemplate({
      ...initialTemplate,
      updatedAt: new Date(),
    });
  }, [initialTemplate]);

  const tabs = [
    {
      id: 'sections',
      name: 'Sections',
      icon: Layout,
      count: template.sections.length,
    },
    { id: 'filters', name: 'Filters', icon: Filter, count: 0 },
    { id: 'style', name: 'Style', icon: Palette, count: 0 },
  ];

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="flex">
        {/* Left Sidebar - Customization Controls */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Customize Report
                </h2>
                <p className="text-sm text-gray-600">{template.name}</p>
              </div>

              <button
                onClick={handleReset}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                title="Reset to original"
              >
                <RotateCcw className="h-4 w-4" />
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

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-wedding-primary border-b-2 border-wedding-primary bg-wedding-primary/5'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.name}
                  {tab.count > 0 && (
                    <span className="ml-1 bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5 text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'sections' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Report Sections</h3>
                  <span className="text-sm text-gray-500">
                    {template.sections.length} sections
                  </span>
                </div>

                {template.sections.map((section) => (
                  <SectionCustomizer
                    key={section.id}
                    section={section}
                    onUpdate={(updates) =>
                      handleSectionUpdate(section.id, updates)
                    }
                  />
                ))}
              </div>
            )}

            {activeTab === 'filters' && (
              <GlobalFilters
                template={template}
                onUpdate={handleTemplateUpdate}
              />
            )}

            {activeTab === 'style' && (
              <StyleCustomizer
                template={template}
                onUpdate={handleTemplateUpdate}
              />
            )}
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-96">
              {/* Preview Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h1
                    className="text-2xl font-bold text-gray-900"
                    style={{ fontFamily: template.style?.fonts?.heading }}
                  >
                    {template.name}
                  </h1>
                  {template.description && (
                    <p
                      className="text-gray-600 mt-1"
                      style={{ fontFamily: template.style?.fonts?.body }}
                    >
                      {template.description}
                    </p>
                  )}
                </div>

                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Updated {formatDate(template.updatedAt)}
                  </div>
                  {template.globalFilters?.dateRange && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {template.globalFilters.dateRange.preset ||
                        'Custom range'}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Sections */}
              <div className="space-y-6">
                {template.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="border border-gray-100 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3
                        className="font-medium text-gray-900"
                        style={{ fontFamily: template.style?.fonts?.heading }}
                      >
                        {section.title}
                      </h3>

                      {section.chartType && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {React.createElement(
                            CHART_TYPE_OPTIONS.find(
                              (c) => c.type === section.chartType,
                            )?.icon || BarChart3,
                            { className: 'h-3 w-3' },
                          )}
                          {section.chartType}
                        </span>
                      )}
                    </div>

                    {section.description && (
                      <p
                        className="text-sm text-gray-600 mb-3"
                        style={{ fontFamily: template.style?.fonts?.body }}
                      >
                        {section.description}
                      </p>
                    )}

                    {section.filters && section.filters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {section.filters.map((filter, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            <Filter className="h-2.5 w-2.5" />
                            {filter.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Mock Chart/Content Area */}
                    <div className="bg-gray-50 rounded border border-dashed border-gray-300 p-8 text-center">
                      <div className="text-gray-400 mb-2">
                        {React.createElement(
                          CHART_TYPE_OPTIONS.find(
                            (c) => c.type === section.chartType,
                          )?.icon || BarChart3,
                          { className: 'h-8 w-8 mx-auto' },
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {section.chartType
                          ? `${section.chartType} chart will appear here`
                          : `${section.type} content will appear here`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {template.sections.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <BarChart3 className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No sections configured
                  </h3>
                  <p className="text-gray-600">
                    This template doesn't have any sections yet. Try selecting a
                    different template from the library.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCustomizer;
