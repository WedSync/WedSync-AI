# WS-275 Reports Export System - Team A Comprehensive Prompt
**Team A: Frontend/UI Development Specialists**

## 🎯 Your Mission: Beautiful Report Generation Interface
You are the **Frontend/UI specialists** responsible for creating an intuitive, powerful report generation interface that makes creating professional wedding reports feel effortless. Your focus: **Beautiful, user-friendly report builder that wedding vendors actually want to use**.

## 📊 The Wedding Professional Reporting Challenge
**Context**: Sarah is a wedding photographer who needs to generate a comprehensive client report showing timeline completion, vendor performance, budget tracking, and photo delivery metrics for the Henderson wedding. She's using her laptop while sitting in a coffee shop, needs the report to look professional for her client meeting in 2 hours, and wants to customize it with her branding. **Your interface must make creating stunning reports as simple as clicking a few buttons.**

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/components/reports/ReportBuilder.tsx`** - Main report builder interface
2. **`/src/components/reports/ReportPreview.tsx`** - Live report preview component
3. **`/src/components/reports/ReportTemplateGallery.tsx`** - Template selection interface
4. **`/src/components/reports/CustomizationPanel.tsx`** - Report customization sidebar
5. **`/src/components/reports/DataSourceSelector.tsx`** - Data source selection interface
6. **`/src/components/reports/ChartBuilder.tsx`** - Interactive chart creation tool
7. **`/src/components/reports/ReportScheduler.tsx`** - Automated report scheduling
8. **`/src/components/reports/ExportOptions.tsx`** - Export format selection
9. **`/src/components/reports/BrandingCustomizer.tsx`** - Brand customization interface
10. **`/src/components/reports/ReportHistory.tsx`** - Historical reports management
11. **`/src/lib/reports/report-builder-state.ts`** - Report builder state management
12. **`/src/lib/reports/template-engine.ts`** - Client-side template processing
13. **`/src/lib/reports/preview-generator.ts`** - Real-time preview generation
14. **`/src/hooks/useReportBuilder.ts`** - Report builder React hook
15. **`/src/hooks/useReportPreview.ts`** - Live preview React hook

### 🎨 Required UI Components:
- **`/src/components/ui/reports/ReportCard.tsx`** - Report item card component
- **`/src/components/ui/reports/TemplateCard.tsx`** - Template selection card
- **`/src/components/ui/reports/ChartPreview.tsx`** - Chart preview component
- **`/src/components/ui/reports/ColorPicker.tsx`** - Brand color picker
- **`/src/components/ui/reports/FontSelector.tsx`** - Font selection interface

### 🧪 Required Tests:
- **`/src/__tests__/reports/report-builder.test.tsx`**
- **`/src/__tests__/reports/template-engine.test.tsx`**
- **`/src/__tests__/reports/export-functionality.test.tsx`**

## 🎨 Report Builder User Experience Design

### Modern Report Builder Interface
```typescript
// Main report builder component with drag-and-drop functionality
export const ReportBuilder: React.FC = () => {
  const {
    currentReport,
    availableDataSources,
    selectedTemplate,
    customizations,
    updateReport,
    previewReport,
    exportReport
  } = useReportBuilder();
  
  const [activeSection, setActiveSection] = useState<ReportSection>('overview');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  return (
    <div className="report-builder-container h-screen flex bg-gray-50">
      {/* Left Sidebar - Tools & Data */}
      <div className="report-sidebar w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="sidebar-header p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
          <p className="text-sm text-gray-600 mt-1">Create professional wedding reports</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="nav-tabs flex border-b border-gray-200">
          {REPORT_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`tab-button flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors
                ${activeSection === section.id
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              <section.icon className="w-4 h-4 mr-2" />
              {section.name}
            </button>
          ))}
        </div>
        
        {/* Dynamic Content based on active section */}
        <div className="sidebar-content flex-1 overflow-y-auto p-4">
          {activeSection === 'templates' && (
            <TemplateSection
              templates={REPORT_TEMPLATES}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={(template) => updateReport({ template })}
            />
          )}
          
          {activeSection === 'data' && (
            <DataSourceSection
              availableSources={availableDataSources}
              selectedSources={currentReport.dataSources}
              onToggleSource={(sourceId) => toggleDataSource(sourceId)}
            />
          )}
          
          {activeSection === 'design' && (
            <DesignSection
              customizations={customizations}
              onUpdateCustomizations={(updates) => updateReport({ customizations: updates })}
            />
          )}
          
          {activeSection === 'charts' && (
            <ChartSection
              availableCharts={CHART_TYPES}
              selectedCharts={currentReport.charts}
              onAddChart={(chart) => addChart(chart)}
              onRemoveChart={(chartId) => removeChart(chartId)}
            />
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="sidebar-footer p-4 border-t border-gray-200 space-y-3">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="preview-button w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            {isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
          
          <div className="export-buttons flex gap-2">
            <button
              onClick={() => exportReport('pdf')}
              className="export-pdf flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Export PDF
            </button>
            <button
              onClick={() => exportReport('excel')}
              className="export-excel flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Canvas Area */}
      <div className="report-canvas flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="canvas-toolbar bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="toolbar-left flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentReport.name || 'Untitled Report'}
            </h2>
            <span className="text-sm text-gray-500">
              Last saved: {formatDistanceToNow(currentReport.lastSaved)} ago
            </span>
          </div>
          
          <div className="toolbar-right flex items-center space-x-3">
            <button
              onClick={() => scheduleReport()}
              className="schedule-button flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ClockIcon className="w-4 h-4 mr-2" />
              Schedule
            </button>
            
            <button
              onClick={() => shareReport()}
              className="share-button flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Share
            </button>
            
            <button
              onClick={() => saveReport()}
              className="save-button bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Save Report
            </button>
          </div>
        </div>
        
        {/* Canvas Content */}
        <div className="canvas-content flex-1 p-6">
          {isPreviewMode ? (
            <ReportPreview
              report={currentReport}
              customizations={customizations}
              onSectionEdit={(sectionId) => {
                setIsPreviewMode(false);
                // Focus on specific section
              }}
            />
          ) : (
            <ReportEditor
              report={currentReport}
              onUpdateReport={updateReport}
              onPreviewSection={(sectionId) => previewSection(sectionId)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Template selection component
const TemplateSection: React.FC<TemplateSectionProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  return (
    <div className="template-section space-y-4">
      <div className="section-header">
        <h3 className="text-lg font-semibold text-gray-900">Report Templates</h3>
        <p className="text-sm text-gray-600">Choose a template to get started</p>
      </div>
      
      {/* Search and Filter */}
      <div className="search-filter space-y-3">
        <div className="search-bar relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            <option value="client-summary">Client Summary</option>
            <option value="vendor-performance">Vendor Performance</option>
            <option value="budget-analysis">Budget Analysis</option>
            <option value="timeline-report">Timeline Report</option>
            <option value="photo-delivery">Photo Delivery</option>
          </select>
        </div>
      </div>
      
      {/* Template Grid */}
      <div className="template-grid space-y-3">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate?.id === template.id}
            onSelect={() => onSelectTemplate(template)}
          />
        ))}
        
        {filteredTemplates.length === 0 && (
          <div className="empty-state text-center py-8">
            <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No templates found</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary-600 text-sm hover:text-primary-700"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Individual template card
const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  onSelect
}) => {
  return (
    <motion.div
      className={`template-card p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="template-preview mb-3">
        <img
          src={template.thumbnail}
          alt={`${template.name} preview`}
          className="w-full h-24 object-cover rounded border border-gray-200"
        />
      </div>
      
      <div className="template-info">
        <div className="template-header flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
          {template.isPremium && (
            <span className="premium-badge bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full">
              Premium
            </span>
          )}
        </div>
        
        <p className="template-description text-xs text-gray-600 mb-3">
          {template.description}
        </p>
        
        <div className="template-meta flex items-center justify-between text-xs text-gray-500">
          <span className="category-tag bg-gray-100 px-2 py-1 rounded">
            {template.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          
          <div className="template-stats flex items-center space-x-2">
            <span className="flex items-center">
              <StarIcon className="w-3 h-3 text-yellow-400 mr-1" />
              {template.rating}
            </span>
            <span>{template.usageCount} uses</span>
          </div>
        </div>
      </div>
      
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="selected-indicator mt-3 p-2 bg-primary-100 rounded border border-primary-200"
        >
          <div className="flex items-center text-primary-700 text-xs">
            <CheckIcon className="w-4 h-4 mr-2" />
            <span className="font-medium">Template Selected</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
```

### Data Source Selection Interface
```typescript
// Interactive data source selector
const DataSourceSection: React.FC<DataSourceSectionProps> = ({
  availableSources,
  selectedSources,
  onToggleSource
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['wedding-data']));
  
  const groupedSources = WEDDING_DATA_GROUPS.map(group => ({
    ...group,
    sources: availableSources.filter(source => source.category === group.id),
    isExpanded: expandedGroups.has(group.id)
  }));
  
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };
  
  return (
    <div className="data-source-section space-y-4">
      <div className="section-header">
        <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
        <p className="text-sm text-gray-600">Select data to include in your report</p>
      </div>
      
      {/* Quick Stats */}
      <div className="data-stats bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-900 font-medium">
            {selectedSources.length} of {availableSources.length} sources selected
          </span>
          <button
            onClick={() => {
              // Select all sources
              availableSources.forEach(source => {
                if (!selectedSources.includes(source.id)) {
                  onToggleSource(source.id);
                }
              });
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Select All
          </button>
        </div>
      </div>
      
      {/* Data Source Groups */}
      <div className="data-groups space-y-3">
        {groupedSources.map((group) => (
          <div key={group.id} className="data-group border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleGroup(group.id)}
              className="group-header w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="group-info flex items-center">
                <group.icon className="w-5 h-5 text-gray-600 mr-3" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">{group.name}</h4>
                  <p className="text-sm text-gray-600">{group.description}</p>
                </div>
              </div>
              
              <div className="group-controls flex items-center space-x-2">
                <span className="selected-count text-sm text-gray-500">
                  {group.sources.filter(s => selectedSources.includes(s.id)).length}/{group.sources.length}
                </span>
                <ChevronDownIcon 
                  className={`w-4 h-4 text-gray-500 transform transition-transform
                    ${group.isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
            
            <AnimatePresence>
              {group.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group-sources overflow-hidden"
                >
                  <div className="sources-list p-3 pt-0 space-y-2">
                    {group.sources.map((source) => (
                      <DataSourceItem
                        key={source.id}
                        source={source}
                        isSelected={selectedSources.includes(source.id)}
                        onToggle={() => onToggleSource(source.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

// Individual data source item
const DataSourceItem: React.FC<DataSourceItemProps> = ({
  source,
  isSelected,
  onToggle
}) => {
  return (
    <motion.div
      className={`data-source-item flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
        ${isSelected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      onClick={onToggle}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="source-info flex items-center">
        <div className={`source-icon w-8 h-8 rounded-full flex items-center justify-center mr-3
          ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
        >
          <source.icon className="w-4 h-4" />
        </div>
        
        <div>
          <h5 className="font-medium text-gray-900">{source.name}</h5>
          <p className="text-sm text-gray-600">{source.description}</p>
          
          {source.recordCount && (
            <span className="text-xs text-gray-500 mt-1">
              {source.recordCount.toLocaleString()} records available
            </span>
          )}
        </div>
      </div>
      
      <div className="source-controls flex items-center">
        {source.hasPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              previewDataSource(source.id);
            }}
            className="preview-button p-1 text-gray-400 hover:text-gray-600 mr-2"
            title="Preview data"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
        )}
        
        <div className={`checkbox w-5 h-5 border-2 rounded flex items-center justify-center transition-colors
          ${isSelected 
            ? 'border-primary-500 bg-primary-500 text-white' 
            : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isSelected && <CheckIcon className="w-3 h-3" />}
        </div>
      </div>
    </motion.div>
  );
};
```

### Chart Builder Interface
```typescript
// Interactive chart builder for reports
const ChartSection: React.FC<ChartSectionProps> = ({
  availableCharts,
  selectedCharts,
  onAddChart,
  onRemoveChart
}) => {
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  
  return (
    <div className="chart-section space-y-4">
      <div className="section-header">
        <h3 className="text-lg font-semibold text-gray-900">Charts & Visualizations</h3>
        <p className="text-sm text-gray-600">Add visual elements to your report</p>
      </div>
      
      {/* Chart Type Selector */}
      <div className="chart-types">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Chart Types</h4>
        <div className="chart-type-grid grid grid-cols-2 gap-2">
          {CHART_TYPES.map((chartType) => (
            <button
              key={chartType.id}
              onClick={() => setSelectedChartType(chartType.id)}
              className={`chart-type-card p-3 rounded-lg border-2 text-left transition-all
                ${selectedChartType === chartType.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <chartType.icon className="w-6 h-6 text-gray-600 mb-2" />
              <div>
                <h5 className="text-sm font-medium text-gray-900">{chartType.name}</h5>
                <p className="text-xs text-gray-600">{chartType.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart Configuration */}
      {selectedChartType && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="chart-config bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Configure {CHART_TYPES.find(t => t.id === selectedChartType)?.name}
          </h4>
          
          <ChartConfigForm
            chartType={selectedChartType}
            onCreateChart={(config) => {
              onAddChart({
                id: generateUUID(),
                type: selectedChartType,
                config,
                title: config.title || `New ${selectedChartType} Chart`,
                createdAt: new Date()
              });
              setSelectedChartType(null);
            }}
          />
        </motion.div>
      )}
      
      {/* Selected Charts */}
      {selectedCharts.length > 0 && (
        <div className="selected-charts">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Added Charts ({selectedCharts.length})
          </h4>
          
          <div className="charts-list space-y-2">
            {selectedCharts.map((chart) => (
              <div
                key={chart.id}
                className="chart-item flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="chart-info flex items-center">
                  <div className="chart-icon w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    {/* Dynamic icon based on chart type */}
                    <ChartBarIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900">{chart.title}</h5>
                    <p className="text-sm text-gray-600">
                      {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
                    </p>
                  </div>
                </div>
                
                <div className="chart-actions flex items-center space-x-2">
                  <button
                    onClick={() => editChart(chart.id)}
                    className="edit-chart p-1 text-gray-400 hover:text-gray-600"
                    title="Edit chart"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => previewChart(chart.id)}
                    className="preview-chart p-1 text-gray-400 hover:text-gray-600"
                    title="Preview chart"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => onRemoveChart(chart.id)}
                    className="remove-chart p-1 text-red-400 hover:text-red-600"
                    title="Remove chart"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Chart configuration form
const ChartConfigForm: React.FC<ChartConfigFormProps> = ({
  chartType,
  onCreateChart
}) => {
  const [config, setConfig] = useState<ChartConfig>({
    title: '',
    dataSource: '',
    xAxis: '',
    yAxis: '',
    colorScheme: 'primary',
    showLegend: true,
    showGrid: true
  });
  
  const updateConfig = (updates: Partial<ChartConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };
  
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreateChart(config);
      }}
      className="chart-config-form space-y-4"
    >
      {/* Chart Title */}
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chart Title
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateConfig({ title: e.target.value })}
          placeholder="Enter chart title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>
      
      {/* Data Source */}
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Source
        </label>
        <select
          value={config.dataSource}
          onChange={(e) => updateConfig({ dataSource: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        >
          <option value="">Select data source...</option>
          {AVAILABLE_DATA_SOURCES.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} ({source.recordCount} records)
            </option>
          ))}
        </select>
      </div>
      
      {/* Chart-specific configuration */}
      {chartType === 'bar' || chartType === 'line' ? (
        <>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X-Axis Field
            </label>
            <select
              value={config.xAxis}
              onChange={(e) => updateConfig({ xAxis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select field...</option>
              {getFieldsForDataSource(config.dataSource).map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name} ({field.type})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y-Axis Field
            </label>
            <select
              value={config.yAxis}
              onChange={(e) => updateConfig({ yAxis: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select field...</option>
              {getFieldsForDataSource(config.dataSource)
                .filter(field => field.type === 'number')
                .map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
            </select>
          </div>
        </>
      ) : chartType === 'pie' ? (
        <>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Field
            </label>
            <select
              value={config.categoryField}
              onChange={(e) => updateConfig({ categoryField: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select category...</option>
              {getFieldsForDataSource(config.dataSource)
                .filter(field => field.type === 'string')
                .map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value Field
            </label>
            <select
              value={config.valueField}
              onChange={(e) => updateConfig({ valueField: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select value...</option>
              {getFieldsForDataSource(config.dataSource)
                .filter(field => field.type === 'number')
                .map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
            </select>
          </div>
        </>
      ) : null}
      
      {/* Color Scheme */}
      <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color Scheme
        </label>
        <div className="color-scheme-options grid grid-cols-4 gap-2">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              onClick={() => updateConfig({ colorScheme: scheme.id })}
              className={`color-scheme-option p-2 rounded-lg border-2 flex items-center justify-center transition-all
                ${config.colorScheme === scheme.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="flex space-x-1">
                {scheme.colors.slice(0, 3).map((color, index) => (
                  <div
                    key={index}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart Options */}
      <div className="chart-options space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.showLegend}
            onChange={(e) => updateConfig({ showLegend: e.target.checked })}
            className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Show Legend</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.showGrid}
            onChange={(e) => updateConfig({ showGrid: e.target.checked })}
            className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Show Grid Lines</span>
        </label>
      </div>
      
      {/* Form Actions */}
      <div className="form-actions flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => resetConfig()}
          className="cancel-button px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="create-button px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Add Chart
        </button>
      </div>
    </form>
  );
};
```

### Export Options Interface
```typescript
// Comprehensive export options
const ExportOptions: React.FC<ExportOptionsProps> = ({
  report,
  onExport,
  isExporting
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    includeCharts: true,
    includeData: true,
    includeAppendix: false,
    pageSize: 'A4',
    orientation: 'portrait',
    quality: 'high',
    password: '',
    watermark: false
  });
  
  const formatOptions: ExportFormatOption[] = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional PDF perfect for sharing and printing',
      icon: DocumentTextIcon,
      size: '~2MB',
      features: ['Vector graphics', 'Print-ready', 'Password protection']
    },
    {
      id: 'excel',
      name: 'Excel Workbook',
      description: 'Editable spreadsheet with data and charts',
      icon: TableCellsIcon,
      size: '~1MB',
      features: ['Editable data', 'Interactive charts', 'Multiple sheets']
    },
    {
      id: 'powerpoint',
      name: 'PowerPoint Presentation',
      description: 'Presentation-ready slides for client meetings',
      icon: PresentationChartBarIcon,
      size: '~3MB',
      features: ['Slide layout', 'Speaker notes', 'Animation ready']
    },
    {
      id: 'csv',
      name: 'CSV Data Export',
      description: 'Raw data for analysis in other tools',
      icon: DocumentArrowDownIcon,
      size: '~100KB',
      features: ['Raw data only', 'Universal format', 'Lightweight']
    }
  ];
  
  const updateSettings = (updates: Partial<ExportSettings>) => {
    setExportSettings(prev => ({ ...prev, ...updates }));
  };
  
  const handleExport = async () => {
    await onExport({
      format: selectedFormat,
      settings: exportSettings,
      reportId: report.id
    });
  };
  
  return (
    <div className="export-options space-y-6">
      <div className="section-header">
        <h3 className="text-lg font-semibold text-gray-900">Export Report</h3>
        <p className="text-sm text-gray-600">Choose format and customize export settings</p>
      </div>
      
      {/* Format Selection */}
      <div className="format-selection">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Export Format</h4>
        <div className="format-grid grid grid-cols-1 gap-3">
          {formatOptions.map((format) => (
            <motion.div
              key={format.id}
              className={`format-option p-4 rounded-lg border-2 cursor-pointer transition-all
                ${selectedFormat === format.id
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              onClick={() => setSelectedFormat(format.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="format-header flex items-start justify-between mb-2">
                <div className="format-info flex items-center">
                  <format.icon className="w-6 h-6 text-gray-600 mr-3" />
                  <div>
                    <h5 className="font-medium text-gray-900">{format.name}</h5>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </div>
                </div>
                
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {format.size}
                </span>
              </div>
              
              <div className="format-features flex flex-wrap gap-1">
                {format.features.map((feature, index) => (
                  <span
                    key={index}
                    className="feature-tag text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              
              {selectedFormat === format.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="format-selected mt-3 pt-3 border-t border-primary-200"
                >
                  <div className="flex items-center text-primary-700 text-sm">
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    <span className="font-medium">Format Selected</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Format-Specific Settings */}
      <AnimatePresence mode="wait">
        {selectedFormat && (
          <motion.div
            key={selectedFormat}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="export-settings bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              {formatOptions.find(f => f.id === selectedFormat)?.name} Settings
            </h4>
            
            {/* Content Options */}
            <div className="content-options mb-4">
              <h5 className="text-sm font-medium text-gray-800 mb-2">Include Content</h5>
              <div className="options-grid space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeCharts}
                    onChange={(e) => updateSettings({ includeCharts: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Charts and Visualizations</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeData}
                    onChange={(e) => updateSettings({ includeData: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Raw Data Tables</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeAppendix}
                    onChange={(e) => updateSettings({ includeAppendix: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Technical Appendix</span>
                </label>
              </div>
            </div>
            
            {/* PDF-Specific Settings */}
            {selectedFormat === 'pdf' && (
              <div className="pdf-settings space-y-4">
                <div className="settings-row flex space-x-4">
                  <div className="setting-group flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Page Size
                    </label>
                    <select
                      value={exportSettings.pageSize}
                      onChange={(e) => updateSettings({ pageSize: e.target.value as PageSize })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="letter">Letter (8.5 × 11 in)</option>
                      <option value="legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>
                  
                  <div className="setting-group flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orientation
                    </label>
                    <select
                      value={exportSettings.orientation}
                      onChange={(e) => updateSettings({ orientation: e.target.value as PageOrientation })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
                
                <div className="setting-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality
                  </label>
                  <div className="quality-options flex space-x-3">
                    {(['standard', 'high', 'print'] as QualityLevel[]).map((quality) => (
                      <label key={quality} className="flex items-center">
                        <input
                          type="radio"
                          name="quality"
                          value={quality}
                          checked={exportSettings.quality === quality}
                          onChange={(e) => updateSettings({ quality: e.target.value as QualityLevel })}
                          className="mr-2 border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{quality}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Security Options */}
                <div className="security-options">
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={!!exportSettings.password}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          updateSettings({ password: '' });
                        }
                      }}
                      className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Password Protection</span>
                  </label>
                  
                  {exportSettings.password !== undefined && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="password-input mt-2"
                    >
                      <input
                        type="password"
                        placeholder="Enter password..."
                        value={exportSettings.password}
                        onChange={(e) => updateSettings({ password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </motion.div>
                  )}
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportSettings.watermark}
                    onChange={(e) => updateSettings({ watermark: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Add Watermark</span>
                </label>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Export Preview */}
      <div className="export-preview bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Export Preview</h4>
        <div className="preview-details text-sm text-blue-800 space-y-1">
          <p>Format: {formatOptions.find(f => f.id === selectedFormat)?.name}</p>
          <p>Estimated size: {formatOptions.find(f => f.id === selectedFormat)?.size}</p>
          <p>Pages: ~{Math.ceil((report.sections?.length || 1) * 1.5)}</p>
          <p>Processing time: ~30 seconds</p>
        </div>
      </div>
      
      {/* Export Actions */}
      <div className="export-actions flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => previewExport()}
          className="preview-button flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <EyeIcon className="w-4 h-4 mr-2" />
          Preview Export
        </button>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="export-button flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};
```

## 🔄 Integration with Navigation System

### Navigation Integration Requirements
```typescript
// MANDATORY: All report components must integrate with navigation
import { NavigationProvider } from '@/lib/navigation/NavigationProvider';
import { useReportNavigation } from '@/lib/navigation/hooks/useReportNavigation';

interface ReportNavigationProps {
  reportId?: string;
  templateId?: string;
  exportFormat?: string;
  showBreadcrumbs?: boolean;
  enableKeyboardShortcuts?: boolean;
}

// Must provide report-specific navigation context
export const ReportNavigationWrapper: React.FC<PropsWithChildren<ReportNavigationProps>> = ({
  children,
  reportId,
  templateId,
  exportFormat,
  showBreadcrumbs = true,
  enableKeyboardShortcuts = true
}) => {
  const reportNavigation = useReportNavigation({
    reportId,
    currentStep: 'builder',
    enableKeyboardShortcuts
  });
  
  return (
    <NavigationProvider value={reportNavigation}>
      {showBreadcrumbs && (
        <div className="report-breadcrumbs mb-4">
          <ReportBreadcrumbs />
        </div>
      )}
      {children}
    </NavigationProvider>
  );
};
```

## 🧪 Testing Requirements

### Report Builder Testing
```typescript
describe('Report Builder Interface', () => {
  it('should create reports with all template types', async () => {
    await page.goto('/reports/builder');
    
    // Test each template type
    for (const template of REPORT_TEMPLATES) {
      await page.click(`[data-template-id="${template.id}"]`);
      await expect(page.locator('.report-preview')).toBeVisible();
      await expect(page.locator('.template-applied')).toContainText(template.name);
    }
  });
  
  it('should handle data source selection', async () => {
    await page.goto('/reports/builder');
    
    // Select data sources
    await page.check('[data-source="timeline-events"]');
    await page.check('[data-source="vendor-performance"]');
    
    // Should update preview
    await expect(page.locator('.data-preview')).toBeVisible();
    await expect(page.locator('.selected-sources')).toHaveCount(2);
  });
  
  it('should export reports in all formats', async () => {
    await page.goto('/reports/builder');
    
    // Configure report
    await page.click('[data-template="client-summary"]');
    await page.check('[data-source="timeline-events"]');
    
    // Test each export format
    const formats = ['pdf', 'excel', 'powerpoint', 'csv'];
    
    for (const format of formats) {
      await page.click(`[data-export="${format}"]`);
      await expect(page.locator('.export-progress')).toBeVisible();
      await page.waitForSelector('.export-complete', { timeout: 30000 });
    }
  });
});
```

## 🎯 Success Criteria

### User Experience Goals
- **Report Creation Time**: <5 minutes for standard reports
- **Template Application**: <30 seconds to apply and customize
- **Preview Generation**: <3 seconds for live preview updates
- **Export Processing**: <60 seconds for PDF/Excel exports
- **Interface Responsiveness**: <200ms for all UI interactions

### Functionality Requirements
- **Template Variety**: 10+ professional templates covering all use cases
- **Data Source Coverage**: 20+ wedding data sources available
- **Chart Types**: 8+ chart types with full customization
- **Export Formats**: PDF, Excel, PowerPoint, CSV with quality options
- **Brand Customization**: Full color, font, and logo customization
- **Scheduled Reports**: Automated report generation and delivery

Your report builder interface will transform how wedding professionals create and share insights with their clients. Make it so intuitive and powerful that generating professional reports becomes a joy, not a chore.

**Remember**: Behind every great wedding is great planning, and behind great planning are insightful reports that tell the story. Your interface makes those stories beautiful. 📊💍