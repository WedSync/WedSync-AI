# WS-333 Team A: Frontend Reporting Engine Development

## Team A Development Prompt

### Overview
Build a comprehensive, enterprise-scale reporting engine frontend that enables wedding suppliers to generate, customize, and deliver professional reports to their clients. This system must handle complex wedding data visualization, automated report generation, and branded report delivery for millions of users.

### Wedding-Specific User Stories
1. **Photographer Sarah** needs to generate branded wedding albums reports showing package delivery status, photo counts, and client satisfaction metrics for each of her 40 annual weddings
2. **Venue Manager Mark** requires comprehensive venue utilization reports showing booking patterns, revenue optimization, and seasonal trends to maximize his £2M annual revenue
3. **Wedding Planner Lisa** needs client progress reports showing task completion, vendor coordination status, and budget tracking to keep 50 concurrent weddings on track
4. **Catering Director Emma** requires detailed event reports showing menu customization, dietary requirements, guest counts, and cost analysis for enterprise catering operations
5. **Enterprise Wedding Company** needs white-labeled reporting system for 200+ suppliers with automated monthly business intelligence reports

### Core Technical Requirements

#### TypeScript Interfaces
```typescript
interface ReportingEngineProps {
  userId: string;
  organizationId: string;
  userRole: 'supplier' | 'admin' | 'enterprise_admin';
  reportingPermissions: ReportingPermissions;
  brandingConfig: BrandingConfiguration;
  onReportGenerate: (reportConfig: ReportConfiguration) => void;
}

interface ReportConfiguration {
  reportId: string;
  reportType: ReportType;
  templateId?: string;
  dataFilters: ReportFilters;
  dateRange: DateRange;
  visualizationType: VisualizationType[];
  branding: ReportBranding;
  deliveryMethod: ReportDelivery;
  schedulingConfig?: ReportScheduling;
}

interface ReportFilters {
  weddingIds?: string[];
  supplierTypes?: string[];
  clientSegments?: string[];
  revenueRange?: NumberRange;
  dateRange: DateRange;
  customFilters: CustomFilter[];
}

interface ReportTemplate {
  templateId: string;
  name: string;
  category: ReportCategory;
  isCustomizable: boolean;
  requiredPermissions: string[];
  visualComponents: ReportComponent[];
  defaultFilters: ReportFilters;
  brandingOptions: BrandingOptions;
}

interface VisualizationConfig {
  chartType: ChartType;
  dataSource: string;
  aggregation: AggregationType;
  colorScheme: ColorScheme;
  interactivity: InteractivityLevel;
  responsiveBreakpoints: ResponsiveConfig[];
}

interface ReportDeliveryStatus {
  reportId: string;
  status: DeliveryStatus;
  generationProgress: number;
  estimatedCompletion: Date;
  errorDetails?: string;
  deliveryHistory: DeliveryAttempt[];
}

type ReportType = 'financial' | 'operational' | 'client_satisfaction' | 'wedding_portfolio' | 'vendor_performance' | 'seasonal_analysis' | 'custom';
type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'timeline' | 'funnel' | 'gauge';
type DeliveryStatus = 'pending' | 'generating' | 'ready' | 'delivered' | 'failed' | 'scheduled';
```

#### React 19 Component Implementation
```tsx
'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { ReportGenerator } from '@/components/reporting/ReportGenerator';
import { ReportPreview } from '@/components/reporting/ReportPreview';
import { ReportScheduler } from '@/components/reporting/ReportScheduler';

export function ReportingEngine({ userId, organizationId, userRole, reportingPermissions, brandingConfig }: ReportingEngineProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isPending, startTransition] = useTransition();
  const [optimisticReports, addOptimisticReport] = useOptimistic(
    reports,
    (state, newReport: Report) => [...state, newReport]
  );

  const handleReportGeneration = async (config: ReportConfiguration) => {
    startTransition(async () => {
      addOptimisticReport({
        id: crypto.randomUUID(),
        status: 'generating',
        config,
        createdAt: new Date()
      });

      const result = await generateReport(config);
      setReports(prev => [...prev, result]);
    });
  };

  return (
    <div className="reporting-engine">
      <ReportGenerator
        permissions={reportingPermissions}
        branding={brandingConfig}
        onGenerate={handleReportGeneration}
        isPending={isPending}
      />
      
      <ReportPreview
        reports={optimisticReports}
        onPreview={handlePreview}
        onSchedule={handleScheduling}
      />
    </div>
  );
}
```

### Mobile-First Responsive Design

#### Mobile Report Builder
```tsx
interface MobileReportBuilderProps {
  onConfigUpdate: (config: ReportConfiguration) => void;
  availableTemplates: ReportTemplate[];
  currentConfig: ReportConfiguration;
}

function MobileReportBuilder({ onConfigUpdate, availableTemplates, currentConfig }: MobileReportBuilderProps) {
  return (
    <div className="mobile-report-builder">
      <div className="template-selector">
        {availableTemplates.map(template => (
          <TouchableTemplate
            key={template.templateId}
            template={template}
            isSelected={currentConfig.templateId === template.templateId}
            onSelect={() => onConfigUpdate({ ...currentConfig, templateId: template.templateId })}
          />
        ))}
      </div>
      
      <SwipeableFilterPanels
        filters={currentConfig.dataFilters}
        onFiltersChange={(filters) => onConfigUpdate({ ...currentConfig, dataFilters: filters })}
      />
      
      <PreviewCarousel
        reportPreviews={generatePreviews(currentConfig)}
        onPreviewSelect={handlePreviewSelection}
      />
    </div>
  );
}
```

### Performance Optimization

#### Virtual Report Scrolling
```tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualReportListProps {
  reports: Report[];
  itemHeight: number;
  containerHeight: number;
}

function VirtualReportList({ reports, itemHeight, containerHeight }: VirtualReportListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ReportCard
        report={reports[index]}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onSchedule={handleSchedule}
      />
    </div>
  );

  return (
    <List
      height={containerHeight}
      itemCount={reports.length}
      itemSize={itemHeight}
      overscanCount={5}
    >
      {Row}
    </List>
  );
}
```

#### Report Data Caching
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useReportData(reportConfig: ReportConfiguration) {
  return useQuery({
    queryKey: ['report-data', reportConfig],
    queryFn: () => fetchReportData(reportConfig),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 3
  });
}

function useReportGeneration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: generateReport,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['reports']);
      queryClient.setQueryData(['report', data.id], data);
    },
    onError: (error, variables) => {
      console.error('Report generation failed:', error);
      // Implement error recovery
    }
  });
}
```

### Advanced Visualization Components

#### Interactive Charts
```tsx
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface WeddingRevenueChartProps {
  data: WeddingRevenueData[];
  onDataPointClick: (data: WeddingRevenueData) => void;
  timeframe: 'monthly' | 'quarterly' | 'yearly';
}

function WeddingRevenueChart({ data, onDataPointClick, timeframe }: WeddingRevenueChartProps) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(value);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis yAxisId="left" tickFormatter={formatCurrency} />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip formatter={formatCurrency} />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="revenue"
          fill="#8884d8"
          onClick={onDataPointClick}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="weddingCount"
          stroke="#82ca9d"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

#### Heatmap Calendar
```tsx
interface WeddingBookingHeatmapProps {
  bookingData: BookingData[];
  onDateClick: (date: Date, bookings: BookingData[]) => void;
  year: number;
}

function WeddingBookingHeatmap({ bookingData, onDateClick, year }: WeddingBookingHeatmapProps) {
  const getIntensity = (date: Date) => {
    const dayBookings = bookingData.filter(booking => 
      isSameDay(new Date(booking.weddingDate), date)
    );
    return Math.min(dayBookings.length / 3, 1); // Normalize to 0-1
  };

  const getColorIntensity = (intensity: number) => {
    const baseColor = [139, 69, 19]; // Wedding brown
    return `rgb(${baseColor.map(c => Math.floor(c * (0.2 + intensity * 0.8))).join(',')})`;
  };

  return (
    <div className="wedding-heatmap">
      {Array.from({ length: 365 }, (_, i) => {
        const date = new Date(year, 0, i + 1);
        const intensity = getIntensity(date);
        
        return (
          <div
            key={i}
            className="heatmap-cell"
            style={{ backgroundColor: getColorIntensity(intensity) }}
            onClick={() => onDateClick(date, bookingData)}
            title={`${format(date, 'MMM d')}: ${Math.floor(intensity * 3)} bookings`}
          />
        );
      })}
    </div>
  );
}
```

### Report Templates & Customization

#### Template Builder
```tsx
interface ReportTemplateBuilderProps {
  onTemplateSave: (template: ReportTemplate) => void;
  existingTemplate?: ReportTemplate;
  availableComponents: ReportComponent[];
}

function ReportTemplateBuilder({ onTemplateSave, existingTemplate, availableComponents }: ReportTemplateBuilderProps) {
  const [template, setTemplate] = useState<ReportTemplate>(
    existingTemplate || createEmptyTemplate()
  );

  const handleComponentAdd = (component: ReportComponent) => {
    setTemplate(prev => ({
      ...prev,
      visualComponents: [...prev.visualComponents, component]
    }));
  };

  const handleComponentReorder = (startIndex: number, endIndex: number) => {
    const newComponents = Array.from(template.visualComponents);
    const [removed] = newComponents.splice(startIndex, 1);
    newComponents.splice(endIndex, 0, removed);
    
    setTemplate(prev => ({
      ...prev,
      visualComponents: newComponents
    }));
  };

  return (
    <div className="template-builder">
      <ComponentPalette
        components={availableComponents}
        onComponentSelect={handleComponentAdd}
      />
      
      <DragDropContext onDragEnd={handleComponentReorder}>
        <TemplateCanvas
          components={template.visualComponents}
          onComponentUpdate={handleComponentUpdate}
          onComponentRemove={handleComponentRemove}
        />
      </DragDropContext>
      
      <TemplatePreview
        template={template}
        sampleData={generateSampleData()}
      />
    </div>
  );
}
```

### Real-Time Report Generation

#### WebSocket Integration
```tsx
interface ReportGenerationStatusProps {
  reportId: string;
  onComplete: (report: Report) => void;
  onError: (error: string) => void;
}

function ReportGenerationStatus({ reportId, onComplete, onError }: ReportGenerationStatusProps) {
  const [status, setStatus] = useState<ReportDeliveryStatus | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/report-status`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.reportId === reportId) {
        setStatus(update);
        setProgress(update.generationProgress);
        
        if (update.status === 'ready') {
          onComplete(update.report);
        } else if (update.status === 'failed') {
          onError(update.errorDetails);
        }
      }
    };

    return () => ws.close();
  }, [reportId, onComplete, onError]);

  return (
    <div className="report-generation-status">
      <ProgressBar value={progress} max={100} />
      <p className="status-text">
        {status?.status === 'generating' 
          ? `Generating report... ${progress}%`
          : 'Preparing report generation...'
        }
      </p>
      
      {status?.estimatedCompletion && (
        <p className="eta">
          Estimated completion: {format(status.estimatedCompletion, 'HH:mm:ss')}
        </p>
      )}
    </div>
  );
}
```

### Report Delivery System

#### Multi-format Export
```tsx
interface ReportExportProps {
  report: Report;
  availableFormats: ExportFormat[];
  onExport: (format: ExportFormat, options: ExportOptions) => void;
}

function ReportExport({ report, availableFormats, onExport }: ReportExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCharts: true,
    includeRawData: false,
    compression: 'medium'
  });

  const handleExport = async () => {
    try {
      await onExport(selectedFormat, exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="report-export">
      <FormatSelector
        formats={availableFormats}
        selected={selectedFormat}
        onChange={setSelectedFormat}
      />
      
      <ExportOptions
        options={exportOptions}
        onChange={setExportOptions}
        format={selectedFormat}
      />
      
      <ExportPreview
        report={report}
        format={selectedFormat}
        options={exportOptions}
      />
      
      <button onClick={handleExport} className="export-button">
        Export Report
      </button>
    </div>
  );
}

type ExportFormat = 'pdf' | 'excel' | 'powerpoint' | 'csv' | 'json';
```

### Evidence of Reality Requirements

#### File Structure Evidence
```
src/
├── components/
│   ├── reporting/
│   │   ├── ReportingEngine.tsx ✓
│   │   ├── ReportGenerator.tsx ✓
│   │   ├── ReportPreview.tsx ✓
│   │   ├── ReportScheduler.tsx ✓
│   │   ├── ReportTemplateBuilder.tsx ✓
│   │   ├── charts/
│   │   │   ├── WeddingRevenueChart.tsx ✓
│   │   │   ├── BookingHeatmap.tsx ✓
│   │   │   └── PerformanceGauges.tsx ✓
│   │   └── mobile/
│   │       ├── MobileReportBuilder.tsx ✓
│   │       └── TouchableReportCards.tsx ✓
├── hooks/
│   ├── useReportData.ts ✓
│   ├── useReportGeneration.ts ✓
│   └── useReportExport.ts ✓
├── lib/
│   ├── reporting/
│   │   ├── report-generator.ts ✓
│   │   ├── template-engine.ts ✓
│   │   └── export-service.ts ✓
└── types/
    └── reporting.ts ✓
```

#### TypeScript Compilation
```bash
# Must pass without errors
npx tsc --noEmit
✓ No TypeScript errors found

# Report generation performance test
npm run test:reporting-performance
✓ Report generation <3s for standard reports
✓ Complex reports <10s generation time
✓ Mobile responsiveness verified <576px
```

#### Wedding Context Testing
```typescript
describe('WeddingReportingEngine', () => {
  it('generates photographer portfolio reports', async () => {
    const config = createPhotographerReportConfig();
    const report = await generateReport(config);
    expect(report.sections).toContain('wedding_galleries');
    expect(report.metrics.client_satisfaction).toBeGreaterThan(4.5);
  });

  it('handles venue utilization analysis', async () => {
    const venueReport = await generateVenueUtilizationReport();
    expect(venueReport.seasonalTrends).toBeDefined();
    expect(venueReport.revenueOptimization).toHaveProperty('recommendations');
  });

  it('processes wedding planner coordination reports', async () => {
    const plannerReport = await generatePlannerReport();
    expect(plannerReport.taskCompletion.percentage).toBeGreaterThan(95);
    expect(plannerReport.vendorCoordination.status).toBe('on_track');
  });
});
```

### Performance Targets
- **Report Generation**: Standard reports <3s, Complex reports <10s
- **Chart Rendering**: Interactive visualizations load <1s
- **Mobile Performance**: Touch responsiveness <100ms
- **Data Export**: PDF generation <5s for 50-page reports
- **Real-time Updates**: WebSocket latency <200ms
- **Memory Usage**: <50MB for complex dashboard views
- **Concurrent Users**: Support 1000+ simultaneous report generations

### Security & Compliance
- Row-level security for all report data access
- GDPR-compliant data handling and export controls
- Report access logging and audit trails
- Encrypted report delivery and storage
- Role-based report template access controls
- Watermarked sensitive financial reports

### Business Success Metrics
- Report generation completion rate >98%
- User satisfaction with report quality >4.8/5
- Average time from request to delivery <5 minutes
- Mobile report usage >60% of total generations
- Custom template adoption >40% of enterprise users
- Client report sharing rate >85% for delivered reports

This comprehensive frontend reporting engine will enable wedding suppliers to generate professional, branded reports that showcase their value and drive business growth while providing the scalability needed for millions of users.