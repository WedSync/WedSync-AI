# WS-275 Reports Export System - Team B Comprehensive Prompt
**Team B: Backend/API Development Specialists**

## 🎯 Your Mission: Scalable Report Generation Engine
You are the **Backend/API specialists** responsible for creating a high-performance report generation engine that processes wedding data into beautiful, professional reports at scale. Your focus: **Lightning-fast report generation that handles complex data processing and multiple export formats seamlessly**.

## ⚡ The Wedding Report Processing Challenge
**Context**: It's Monday morning and 50 wedding photographers need their weekend reports generated simultaneously. Each report contains 500+ photos, timeline data, vendor performance metrics, and budget analysis. The reports need to be generated in PDF (high-resolution), Excel (with interactive charts), and CSV formats, then automatically emailed to couples. **Your engine must process this workload without breaking a sweat or keeping anyone waiting.**

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/app/api/reports/generate/route.ts`** - Main report generation API endpoint
2. **`/src/app/api/reports/templates/route.ts`** - Report template management API
3. **`/src/app/api/reports/data-sources/route.ts`** - Data source configuration API
4. **`/src/app/api/reports/export/[format]/route.ts`** - Format-specific export endpoints
5. **`/src/app/api/reports/schedule/route.ts`** - Automated report scheduling API
6. **`/src/app/api/reports/preview/route.ts`** - Report preview generation
7. **`/src/lib/reports/report-engine.ts`** - Core report generation engine
8. **`/src/lib/reports/data-aggregator.ts`** - Wedding data aggregation service
9. **`/src/lib/reports/template-processor.ts`** - Template processing and compilation
10. **`/src/lib/reports/export-engines/pdf-engine.ts`** - PDF generation engine
11. **`/src/lib/reports/export-engines/excel-engine.ts`** - Excel generation engine
12. **`/src/lib/reports/export-engines/powerpoint-engine.ts`** - PowerPoint generation engine
13. **`/src/lib/reports/chart-generator.ts`** - Chart and visualization generator
14. **`/src/lib/reports/brand-customizer.ts`** - Brand customization processor
15. **`/src/lib/reports/report-scheduler.ts`** - Automated scheduling service

### 🗄️ Required Database Schemas:
- **`/supabase/migrations/reports_system.sql`** - Report system database tables
- **`/supabase/migrations/report_templates.sql`** - Template storage schema
- **`/supabase/migrations/report_jobs.sql`** - Background job processing schema
- **`/supabase/migrations/report_data_cache.sql`** - Data caching optimization

### 🧪 Required Tests:
- **`/src/__tests__/api/reports-generation.test.ts`**
- **`/src/__tests__/reports/data-aggregation.test.ts`**
- **`/src/__tests__/reports/export-performance.test.ts`**

## 🏗️ Core Report Engine Architecture

### High-Performance Report Generation Pipeline
```typescript
// Main report generation engine with queue processing
export class ReportGenerationEngine {
  private jobQueue: Queue<ReportJob>;
  private dataAggregator: WeddingDataAggregator;
  private templateProcessor: ReportTemplateProcessor;
  private exportEngines: Map<ExportFormat, ExportEngine>;
  private brandCustomizer: BrandCustomizer;
  private cacheManager: ReportCacheManager;
  
  constructor() {
    this.jobQueue = new Queue('report-generation', {
      redis: getRedisConfig(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });
    
    this.initializeExportEngines();
    this.setupJobProcessing();
  }
  
  async generateReport(request: ReportGenerationRequest): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate request and check permissions
      await this.validateReportRequest(request);
      
      // Step 2: Check cache for existing report
      const cached = await this.checkCache(request);
      if (cached && !request.forceRegenerate) {
        return this.returnCachedReport(cached);
      }
      
      // Step 3: Aggregate wedding data
      console.log(`Aggregating data for wedding ${request.weddingId}`);
      const weddingData = await this.dataAggregator.aggregateWeddingData({
        weddingId: request.weddingId,
        dataSources: request.dataSources,
        dateRange: request.dateRange,
        includeMedia: request.includeMedia
      });
      
      // Step 4: Process template
      console.log(`Processing template ${request.templateId}`);
      const processedTemplate = await this.templateProcessor.processTemplate({
        templateId: request.templateId,
        data: weddingData,
        customizations: request.customizations,
        brandSettings: request.brandSettings
      });
      
      // Step 5: Generate charts and visualizations
      console.log('Generating charts and visualizations');
      const charts = await this.generateCharts({
        data: weddingData,
        chartConfigs: request.chartConfigs,
        brandSettings: request.brandSettings
      });
      
      // Step 6: Compile final report structure
      const reportStructure = await this.compileReportStructure({
        template: processedTemplate,
        data: weddingData,
        charts,
        customizations: request.customizations
      });
      
      // Step 7: Generate exports in requested formats
      const exports: Map<ExportFormat, ExportResult> = new Map();
      
      for (const format of request.exportFormats) {
        console.log(`Exporting to ${format}`);
        const exportEngine = this.exportEngines.get(format);
        if (!exportEngine) {
          throw new Error(`Export engine not found for format: ${format}`);
        }
        
        const exportResult = await exportEngine.export({
          reportStructure,
          settings: request.exportSettings[format] || {},
          brandSettings: request.brandSettings
        });
        
        exports.set(format, exportResult);
      }
      
      // Step 8: Store report and cache results
      const reportId = await this.storeGeneratedReport({
        request,
        reportStructure,
        exports,
        generatedAt: new Date(),
        processingTime: Date.now() - startTime
      });
      
      // Step 9: Schedule cleanup if needed
      if (request.autoCleanup) {
        await this.scheduleReportCleanup(reportId, request.retentionPeriod || 30);
      }
      
      const result: ReportGenerationResult = {
        reportId,
        success: true,
        exports: Object.fromEntries(exports),
        processingTime: Date.now() - startTime,
        dataPoints: weddingData.totalRecords,
        cacheKey: this.generateCacheKey(request),
        downloadUrls: await this.generateDownloadUrls(exports)
      };
      
      // Step 10: Cache successful result
      await this.cacheResult(request, result);
      
      return result;
      
    } catch (error) {
      console.error('Report generation failed:', error);
      
      return {
        reportId: null,
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        dataPoints: 0,
        exports: {},
        downloadUrls: {}
      };
    }
  }
  
  async queueReportGeneration(request: ReportGenerationRequest): Promise<JobResult> {
    // Add report generation to background queue
    const job = await this.jobQueue.add('generate-report', request, {
      priority: request.priority || 0,
      delay: request.scheduleDelay || 0,
      jobId: `report-${request.weddingId}-${Date.now()}`
    });
    
    return {
      jobId: job.id,
      status: 'queued',
      estimatedTime: await this.estimateProcessingTime(request),
      queuePosition: await this.getQueuePosition(job.id)
    };
  }
  
  private setupJobProcessing(): void {
    this.jobQueue.process('generate-report', 5, async (job) => {
      const request = job.data as ReportGenerationRequest;
      
      // Update job progress
      await job.progress(10);
      
      try {
        const result = await this.generateReport(request);
        
        await job.progress(100);
        
        // Send completion notification if requested
        if (request.notifyOnCompletion) {
          await this.sendCompletionNotification(request, result);
        }
        
        return result;
        
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    });
    
    // Handle job completion
    this.jobQueue.on('completed', async (job, result) => {
      console.log(`Report generation completed for job ${job.id}`);
      await this.trackJobCompletion(job.id, result);
    });
    
    // Handle job failure
    this.jobQueue.on('failed', async (job, error) => {
      console.error(`Report generation failed for job ${job.id}:`, error);
      await this.trackJobFailure(job.id, error);
    });
  }
  
  private async estimateProcessingTime(request: ReportGenerationRequest): Promise<number> {
    // Base processing time
    let estimatedTime = 30; // 30 seconds base
    
    // Add time based on data volume
    const dataVolumeMultiplier = Math.log(request.dataSources.length + 1) * 5;
    estimatedTime += dataVolumeMultiplier;
    
    // Add time for each export format
    const formatTimes = {
      pdf: 15,
      excel: 10,
      powerpoint: 20,
      csv: 2
    };
    
    for (const format of request.exportFormats) {
      estimatedTime += formatTimes[format] || 10;
    }
    
    // Add time for charts
    estimatedTime += (request.chartConfigs?.length || 0) * 3;
    
    // Add time for high-resolution images
    if (request.includeMedia && request.exportSettings.pdf?.quality === 'print') {
      estimatedTime += 30;
    }
    
    return Math.max(estimatedTime, 15); // Minimum 15 seconds
  }
}
```

### Wedding Data Aggregation Service
```typescript
// Comprehensive wedding data aggregation
export class WeddingDataAggregator {
  private supabase: SupabaseClient;
  private cacheManager: DataCacheManager;
  
  async aggregateWeddingData(config: DataAggregationConfig): Promise<WeddingDataSet> {
    const { weddingId, dataSources, dateRange, includeMedia } = config;
    
    // Check cache first
    const cacheKey = this.generateCacheKey(config);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const aggregatedData: WeddingDataSet = {
      wedding: null,
      timeline: [],
      vendors: [],
      guests: [],
      photos: [],
      budget: null,
      payments: [],
      communications: [],
      tasks: [],
      reviews: [],
      analytics: null,
      totalRecords: 0,
      aggregatedAt: new Date()
    };
    
    // Parallel data fetching for performance
    const dataFetchers = dataSources.map(async (source) => {
      try {
        switch (source.type) {
          case 'wedding-details':
            aggregatedData.wedding = await this.fetchWeddingDetails(weddingId);
            break;
            
          case 'timeline-events':
            aggregatedData.timeline = await this.fetchTimelineEvents(weddingId, dateRange);
            break;
            
          case 'vendor-performance':
            aggregatedData.vendors = await this.fetchVendorPerformance(weddingId);
            break;
            
          case 'guest-management':
            aggregatedData.guests = await this.fetchGuestData(weddingId);
            break;
            
          case 'photo-delivery':
            if (includeMedia) {
              aggregatedData.photos = await this.fetchPhotoMetrics(weddingId);
            }
            break;
            
          case 'budget-tracking':
            aggregatedData.budget = await this.fetchBudgetAnalysis(weddingId);
            aggregatedData.payments = await this.fetchPaymentHistory(weddingId);
            break;
            
          case 'communication-logs':
            aggregatedData.communications = await this.fetchCommunicationHistory(weddingId, dateRange);
            break;
            
          case 'task-completion':
            aggregatedData.tasks = await this.fetchTaskCompletionData(weddingId);
            break;
            
          case 'reviews-feedback':
            aggregatedData.reviews = await this.fetchReviewsAndFeedback(weddingId);
            break;
            
          case 'analytics-metrics':
            aggregatedData.analytics = await this.fetchWeddingAnalytics(weddingId);
            break;
            
          default:
            console.warn(`Unknown data source type: ${source.type}`);
        }
      } catch (error) {
        console.error(`Failed to fetch data for source ${source.type}:`, error);
        // Continue with other sources
      }
    });
    
    await Promise.allSettled(dataFetchers);
    
    // Calculate total records
    aggregatedData.totalRecords = this.calculateTotalRecords(aggregatedData);
    
    // Cache the aggregated data
    await this.cacheManager.set(cacheKey, aggregatedData, 300); // Cache for 5 minutes
    
    return aggregatedData;
  }
  
  private async fetchTimelineEvents(weddingId: string, dateRange?: DateRange): Promise<TimelineEvent[]> {
    let query = this.supabase
      .from('timeline_events')
      .select(`
        id,
        title,
        description,
        scheduled_time,
        actual_time,
        status,
        priority,
        assigned_vendor_id,
        completion_notes,
        created_at,
        updated_at,
        vendors (
          id,
          name,
          category,
          contact_email,
          contact_phone
        )
      `)
      .eq('wedding_id', weddingId)
      .order('scheduled_time');
    
    if (dateRange) {
      query = query
        .gte('scheduled_time', dateRange.start.toISOString())
        .lte('scheduled_time', dateRange.end.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch timeline events: ${error.message}`);
    }
    
    return data || [];
  }
  
  private async fetchVendorPerformance(weddingId: string): Promise<VendorPerformance[]> {
    // Complex query aggregating vendor performance metrics
    const { data, error } = await this.supabase.rpc('get_vendor_performance', {
      p_wedding_id: weddingId
    });
    
    if (error) {
      throw new Error(`Failed to fetch vendor performance: ${error.message}`);
    }
    
    return data || [];
  }
  
  private async fetchBudgetAnalysis(weddingId: string): Promise<BudgetAnalysis> {
    // Aggregate budget data with category breakdowns
    const { data: budgetData, error: budgetError } = await this.supabase
      .from('wedding_budgets')
      .select(`
        *,
        budget_categories (
          id,
          name,
          allocated_amount,
          spent_amount,
          category_items (
            id,
            description,
            estimated_cost,
            actual_cost,
            vendor_id,
            status
          )
        )
      `)
      .eq('wedding_id', weddingId)
      .single();
    
    if (budgetError) {
      throw new Error(`Failed to fetch budget data: ${budgetError.message}`);
    }
    
    // Calculate budget analytics
    const analytics = await this.calculateBudgetAnalytics(budgetData);
    
    return {
      ...budgetData,
      analytics,
      fetchedAt: new Date()
    };
  }
  
  private async fetchWeddingAnalytics(weddingId: string): Promise<WeddingAnalytics> {
    // Fetch comprehensive analytics
    const [
      timelineMetrics,
      communicationMetrics,
      vendorMetrics,
      guestMetrics
    ] = await Promise.all([
      this.calculateTimelineMetrics(weddingId),
      this.calculateCommunicationMetrics(weddingId),
      this.calculateVendorMetrics(weddingId),
      this.calculateGuestMetrics(weddingId)
    ]);
    
    return {
      timeline: timelineMetrics,
      communication: communicationMetrics,
      vendors: vendorMetrics,
      guests: guestMetrics,
      overall: await this.calculateOverallMetrics(weddingId),
      generatedAt: new Date()
    };
  }
  
  private async calculateTimelineMetrics(weddingId: string): Promise<TimelineMetrics> {
    const { data, error } = await this.supabase.rpc('calculate_timeline_metrics', {
      p_wedding_id: weddingId
    });
    
    if (error) {
      console.error('Failed to calculate timeline metrics:', error);
      return this.getDefaultTimelineMetrics();
    }
    
    return data;
  }
}
```

### Export Engine Architecture
```typescript
// PDF Export Engine with high-quality output
export class PDFExportEngine implements ExportEngine {
  private puppeteer: PuppeteerManager;
  private templateRenderer: HTMLTemplateRenderer;
  
  async export(config: PDFExportConfig): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Render report as HTML
      const htmlContent = await this.templateRenderer.renderToHTML({
        reportStructure: config.reportStructure,
        settings: config.settings,
        brandSettings: config.brandSettings
      });
      
      // Step 2: Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePDF(htmlContent, config.settings);
      
      // Step 3: Store PDF file
      const fileUrl = await this.storePDFFile(pdfBuffer, config);
      
      return {
        format: 'pdf',
        fileUrl,
        fileSize: pdfBuffer.length,
        fileName: this.generateFileName(config),
        mimeType: 'application/pdf',
        processingTime: Date.now() - startTime,
        pages: await this.countPDFPages(pdfBuffer),
        success: true
      };
      
    } catch (error) {
      return {
        format: 'pdf',
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  private async generatePDF(htmlContent: string, settings: PDFExportSettings): Promise<Buffer> {
    const browser = await this.puppeteer.getBrowser();
    const page = await browser.newPage();
    
    try {
      // Set page content
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Configure PDF options
      const pdfOptions: PDFOptions = {
        format: settings.pageSize || 'A4',
        landscape: settings.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: this.generateHeaderTemplate(settings),
        footerTemplate: this.generateFooterTemplate(settings)
      };
      
      // Adjust quality based on settings
      if (settings.quality === 'print') {
        pdfOptions.preferCSSPageSize = true;
        await page.emulateMediaType('print');
      }
      
      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      
      // Apply password protection if requested
      if (settings.password) {
        return this.addPasswordProtection(pdfBuffer, settings.password);
      }
      
      return pdfBuffer;
      
    } finally {
      await page.close();
    }
  }
  
  private generateHeaderTemplate(settings: PDFExportSettings): string {
    if (!settings.includeHeader) return '<div></div>';
    
    return `
      <div style="font-size: 10px; padding: 0 15mm; width: 100%; display: flex; justify-content: space-between; align-items: center;">
        <span>Generated by WedSync</span>
        <span class="date"></span>
      </div>
    `;
  }
  
  private generateFooterTemplate(settings: PDFExportSettings): string {
    return `
      <div style="font-size: 10px; padding: 0 15mm; width: 100%; display: flex; justify-content: center; align-items: center;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }
}

// Excel Export Engine with interactive charts
export class ExcelExportEngine implements ExportEngine {
  private workbookGenerator: ExcelWorkbookGenerator;
  private chartGenerator: ExcelChartGenerator;
  
  async export(config: ExcelExportConfig): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // Create new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties
      workbook.creator = 'WedSync Report System';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Generate worksheets based on report structure
      await this.generateWorksheets(workbook, config);
      
      // Add charts and visualizations
      await this.addChartsToWorkbook(workbook, config);
      
      // Apply branding and styling
      await this.applyBrandStyling(workbook, config.brandSettings);
      
      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      // Store Excel file
      const fileUrl = await this.storeExcelFile(excelBuffer, config);
      
      return {
        format: 'excel',
        fileUrl,
        fileSize: excelBuffer.byteLength,
        fileName: this.generateFileName(config),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        processingTime: Date.now() - startTime,
        worksheets: workbook.worksheets.length,
        success: true
      };
      
    } catch (error) {
      return {
        format: 'excel',
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  private async generateWorksheets(workbook: ExcelJS.Workbook, config: ExcelExportConfig): Promise<void> {
    const { reportStructure, settings } = config;
    
    // Summary worksheet
    if (settings.includeSummary !== false) {
      await this.createSummaryWorksheet(workbook, reportStructure);
    }
    
    // Data worksheets
    if (settings.includeData !== false) {
      await this.createDataWorksheets(workbook, reportStructure);
    }
    
    // Charts worksheet
    if (settings.includeCharts !== false && reportStructure.charts?.length > 0) {
      await this.createChartsWorksheet(workbook, reportStructure);
    }
    
    // Raw data worksheet
    if (settings.includeRawData) {
      await this.createRawDataWorksheet(workbook, reportStructure);
    }
  }
  
  private async createSummaryWorksheet(workbook: ExcelJS.Workbook, reportStructure: ReportStructure): Promise<void> {
    const worksheet = workbook.addWorksheet('Summary', {
      pageSetup: { orientation: 'portrait', fitToPage: true }
    });
    
    // Add title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportStructure.title;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF2D5AA0' } };
    worksheet.mergeCells('A1:D1');
    
    // Add wedding details
    let row = 3;
    const weddingData = reportStructure.data.wedding;
    
    if (weddingData) {
      worksheet.getCell(`A${row}`).value = 'Wedding Details';
      worksheet.getCell(`A${row}`).font = { bold: true };
      row++;
      
      worksheet.getCell(`A${row}`).value = 'Couple Names:';
      worksheet.getCell(`B${row}`).value = `${weddingData.partner1_name} & ${weddingData.partner2_name}`;
      row++;
      
      worksheet.getCell(`A${row}`).value = 'Wedding Date:';
      worksheet.getCell(`B${row}`).value = new Date(weddingData.wedding_date);
      worksheet.getCell(`B${row}`).numFmt = 'dd/mm/yyyy';
      row++;
      
      worksheet.getCell(`A${row}`).value = 'Venue:';
      worksheet.getCell(`B${row}`).value = weddingData.venue_name;
      row += 2;
    }
    
    // Add key metrics
    await this.addKeyMetrics(worksheet, reportStructure, row);
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
  }
}

// PowerPoint Export Engine
export class PowerPointExportEngine implements ExportEngine {
  private presentationGenerator: PowerPointGenerator;
  
  async export(config: PowerPointExportConfig): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // Create new presentation
      const presentation = new PptxGenJS();
      
      // Set presentation properties
      presentation.author = 'WedSync Report System';
      presentation.company = 'WedSync';
      presentation.title = config.reportStructure.title;
      
      // Apply brand theme
      await this.applyBrandTheme(presentation, config.brandSettings);
      
      // Generate slides based on report structure
      await this.generateSlides(presentation, config);
      
      // Generate PowerPoint buffer
      const pptxBuffer = await presentation.write('nodebuffer');
      
      // Store PowerPoint file
      const fileUrl = await this.storePowerPointFile(pptxBuffer, config);
      
      return {
        format: 'powerpoint',
        fileUrl,
        fileSize: pptxBuffer.length,
        fileName: this.generateFileName(config),
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        processingTime: Date.now() - startTime,
        slides: presentation.slides.length,
        success: true
      };
      
    } catch (error) {
      return {
        format: 'powerpoint',
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }
}
```

### API Endpoints Implementation
```typescript
// Main report generation API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reportRequest = ReportGenerationRequestSchema.parse(body);
    
    // Authenticate and authorize user
    const { user, session } = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate user permissions for the wedding
    const hasPermission = await checkWeddingPermissions(user.id, reportRequest.weddingId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Rate limiting
    const rateLimitKey = `report_generation:${user.id}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 10, 3600); // 10 reports per hour
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        resetTime: rateLimitResult.resetTime
      }, { status: 429 });
    }
    
    // Initialize report engine
    const reportEngine = new ReportGenerationEngine();
    
    // Check if this should be queued or processed immediately
    const shouldQueue = await shouldQueueReport(reportRequest);
    
    if (shouldQueue) {
      // Queue for background processing
      const jobResult = await reportEngine.queueReportGeneration({
        ...reportRequest,
        userId: user.id,
        notifyOnCompletion: true
      });
      
      return NextResponse.json({
        queued: true,
        jobId: jobResult.jobId,
        estimatedTime: jobResult.estimatedTime,
        queuePosition: jobResult.queuePosition,
        statusUrl: `/api/reports/status/${jobResult.jobId}`
      });
      
    } else {
      // Process immediately
      const result = await reportEngine.generateReport({
        ...reportRequest,
        userId: user.id
      });
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          reportId: result.reportId,
          downloadUrls: result.downloadUrls,
          processingTime: result.processingTime,
          dataPoints: result.dataPoints
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error('Report generation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Report scheduling API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scheduleRequest = ReportScheduleRequestSchema.parse(body);
    
    // Authenticate user
    const { user } = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create scheduled report job
    const scheduler = new ReportScheduler();
    const scheduledJob = await scheduler.scheduleReport({
      ...scheduleRequest,
      userId: user.id
    });
    
    return NextResponse.json({
      success: true,
      scheduleId: scheduledJob.id,
      nextRun: scheduledJob.nextRun,
      schedule: scheduledJob.schedule
    });
    
  } catch (error) {
    console.error('Report scheduling error:', error);
    return NextResponse.json({
      error: 'Failed to schedule report'
    }, { status: 500 });
  }
}
```

## 🧪 Testing Requirements

### Performance Testing
```typescript
describe('Report Generation Performance', () => {
  it('should generate PDF reports within 60 seconds', async () => {
    const startTime = Date.now();
    
    const result = await reportEngine.generateReport({
      weddingId: 'test-wedding-123',
      templateId: 'client-summary',
      exportFormats: ['pdf'],
      dataSources: DEFAULT_DATA_SOURCES
    });
    
    const processingTime = Date.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(processingTime).toBeLessThan(60000); // 60 seconds
    expect(result.downloadUrls.pdf).toBeTruthy();
  });
  
  it('should handle concurrent report generation', async () => {
    const requests = Array.from({ length: 10 }, (_, i) => 
      reportEngine.generateReport({
        weddingId: `test-wedding-${i}`,
        templateId: 'vendor-performance',
        exportFormats: ['excel'],
        dataSources: ['vendor-performance', 'timeline-events']
      })
    );
    
    const results = await Promise.all(requests);
    
    expect(results.every(r => r.success)).toBe(true);
    expect(results.every(r => r.processingTime < 90000)).toBe(true); // 90 seconds max
  });
  
  it('should efficiently cache aggregated data', async () => {
    const weddingId = 'test-wedding-cache';
    
    // First request - should aggregate data
    const start1 = Date.now();
    const result1 = await dataAggregator.aggregateWeddingData({
      weddingId,
      dataSources: DEFAULT_DATA_SOURCES,
      includeMedia: false
    });
    const time1 = Date.now() - start1;
    
    // Second request - should use cache
    const start2 = Date.now();
    const result2 = await dataAggregator.aggregateWeddingData({
      weddingId,
      dataSources: DEFAULT_DATA_SOURCES,
      includeMedia: false
    });
    const time2 = Date.now() - start2;
    
    expect(time2).toBeLessThan(time1 * 0.1); // Cache should be 10x faster
    expect(result1.totalRecords).toBe(result2.totalRecords);
  });
});
```

## 🎯 Success Criteria

### Performance Benchmarks
- **Report Generation Time**: <60s for standard reports, <120s for complex reports
- **Concurrent Processing**: Handle 20+ simultaneous report generations
- **Data Aggregation**: <10s to aggregate typical wedding dataset
- **Export Processing**: PDF <30s, Excel <20s, PowerPoint <40s, CSV <5s
- **Cache Hit Rate**: >80% for frequently requested data combinations

### Quality Requirements  
- **Export Fidelity**: 100% accurate data representation across formats
- **File Size Optimization**: PDF <5MB, Excel <2MB for typical reports
- **Brand Consistency**: Perfect brand application across all export formats
- **Error Handling**: <0.1% failure rate with comprehensive error recovery
- **Memory Efficiency**: <512MB peak memory usage per report generation

Your report generation engine will be the powerhouse behind professional wedding reporting, enabling vendors to create stunning insights that wow their clients and grow their business.

**Remember**: Every report tells a story of a perfect wedding day. Your engine makes those stories beautiful, accurate, and memorable. 📊💍