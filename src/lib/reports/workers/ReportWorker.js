/**
 * WS-333 Team B: Report Processing Worker Thread
 * Individual worker thread for processing wedding industry reports
 * Handles data aggregation, report generation, and format conversion
 */

const { parentPort, workerData } = require('worker_threads');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');

class ReportWorker {
  constructor(config) {
    this.workerId = workerData.workerId;
    this.config = config;
    this.isProcessing = false;
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Performance monitoring
    this.startTime = Date.now();
    this.tasksProcessed = 0;
    this.totalProcessingTime = 0;
    
    console.log(`🧵 Report Worker ${this.workerId} initialized`);
  }

  async processTask(task) {
    const startTime = Date.now();
    this.isProcessing = true;
    
    try {
      console.log(`⚡ Worker ${this.workerId} processing task ${task.taskId} (${task.type})`);
      
      let result;
      
      switch (task.type) {
        case 'data_aggregation':
          result = await this.processDataAggregation(task.data);
          break;
          
        case 'report_generation':
          result = await this.generateReport(task.data);
          break;
          
        case 'excel_processing':
          result = await this.processExcel(task.data);
          break;
          
        case 'pdf_generation':
          result = await this.generatePDF(task.data);
          break;
          
        case 'image_processing':
          result = await this.processImages(task.data);
          break;
          
        case 'email_delivery':
          result = await this.deliverEmail(task.data);
          break;
          
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      const duration = Date.now() - startTime;
      this.tasksProcessed++;
      this.totalProcessingTime += duration;
      
      // Send success result back to main thread
      parentPort.postMessage({
        taskId: task.taskId,
        success: true,
        data: result,
        duration,
        workerId: this.workerId,
        memoryUsage: process.memoryUsage(),
        completedAt: new Date()
      });
      
      console.log(`✅ Worker ${this.workerId} completed task ${task.taskId} in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ Worker ${this.workerId} failed task ${task.taskId}:`, error);
      
      // Send error result back to main thread
      parentPort.postMessage({
        taskId: task.taskId,
        success: false,
        error: error.message,
        data: null,
        duration,
        workerId: this.workerId,
        memoryUsage: process.memoryUsage(),
        completedAt: new Date()
      });
    } finally {
      this.isProcessing = false;
    }
  }

  async processDataAggregation(request) {
    console.log(`📊 Processing data aggregation for ${request.reportType}`);
    
    const { reportType, dataFilters, aggregationType } = request;
    
    // Build query based on report type and filters
    let query = this.buildAggregationQuery(reportType, dataFilters, aggregationType);
    
    // Execute query with pagination for large datasets
    const results = await this.executeQueryWithPagination(query);
    
    // Apply wedding-specific transformations
    const transformedData = this.applyWeddingTransformations(results, reportType);
    
    // Generate summary statistics
    const summary = this.generateSummaryStatistics(transformedData);
    
    return {
      data: transformedData,
      summary,
      recordCount: transformedData.length,
      processingTime: Date.now() - Date.now(),
      weddingMetrics: this.calculateWeddingMetrics(transformedData)
    };
  }

  async generateReport(request) {
    console.log(`📈 Generating ${request.reportType} report`);
    
    const { reportType, dataFilters, outputFormat } = request;
    
    // Fetch and aggregate data
    const aggregatedData = await this.processDataAggregation({
      reportType,
      dataFilters,
      aggregationType: 'comprehensive'
    });
    
    // Generate report content based on type
    const reportContent = await this.generateReportContent(reportType, aggregatedData);
    
    // Generate outputs in requested formats
    const outputs = {};
    
    for (const format of outputFormat) {
      switch (format) {
        case 'json':
          outputs.json = reportContent;
          break;
        case 'excel':
          outputs.excel = await this.generateExcelReport(reportContent);
          break;
        case 'pdf':
          outputs.pdf = await this.generatePDFReport(reportContent);
          break;
        case 'csv':
          outputs.csv = this.generateCSVReport(reportContent);
          break;
        case 'wedding_portfolio':
          outputs.wedding_portfolio = await this.generateWeddingPortfolio(reportContent);
          break;
      }
    }
    
    return {
      reportId: request.reportId || `report_${Date.now()}`,
      reportType,
      generatedAt: new Date(),
      outputs,
      metadata: {
        recordsProcessed: aggregatedData.recordCount,
        weddingCount: aggregatedData.weddingMetrics?.total_weddings || 0,
        supplierCount: aggregatedData.weddingMetrics?.unique_suppliers || 0,
        processingTime: Date.now() - Date.now()
      }
    };
  }

  buildAggregationQuery(reportType, filters, aggregationType) {
    let baseQuery = this.supabase.from('weddings');
    
    // Apply date filters
    if (filters.dateRange) {
      baseQuery = baseQuery
        .gte('wedding_date', filters.dateRange.start)
        .lte('wedding_date', filters.dateRange.end);
    }
    
    // Apply dynamic date filters
    if (filters.dynamicDateRange) {
      const dateRange = this.calculateDynamicDateRange(filters.dynamicDateRange);
      baseQuery = baseQuery
        .gte('wedding_date', dateRange.start)
        .lte('wedding_date', dateRange.end);
    }
    
    // Report-specific query modifications
    switch (reportType) {
      case 'financial':
        baseQuery = baseQuery.select(`
          *,
          wedding_suppliers!inner (
            supplier_id,
            service_type,
            confirmed_price,
            paid_amount
          ),
          suppliers!inner (
            business_name,
            service_type,
            tier
          )
        `);
        break;
        
      case 'supplier_performance':
        baseQuery = baseQuery.select(`
          *,
          wedding_suppliers!inner (
            supplier_id,
            service_type,
            status,
            rating,
            completion_date
          ),
          suppliers!inner (
            business_name,
            service_type,
            tier,
            rating
          )
        `);
        break;
        
      case 'seasonal_analysis':
        baseQuery = baseQuery.select(`
          *,
          venues (name, location, capacity)
        `);
        break;
        
      case 'booking_trends':
        baseQuery = baseQuery.select(`
          wedding_date,
          created_at,
          guest_count,
          budget_range,
          venue_id,
          status
        `);
        break;
        
      default:
        baseQuery = baseQuery.select('*');
    }
    
    return baseQuery;
  }

  async executeQueryWithPagination(query) {
    const pageSize = 1000;
    let allResults = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await query
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('wedding_date', { ascending: false });
      
      if (error) {
        throw new Error(`Query execution failed: ${error.message}`);
      }
      
      if (data && data.length > 0) {
        allResults = allResults.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
      
      // Prevent infinite loops
      if (page > 100) {
        console.warn(`⚠️ Query pagination exceeded 100 pages, stopping`);
        break;
      }
    }
    
    return allResults;
  }

  applyWeddingTransformations(data, reportType) {
    return data.map(record => {
      // Add weekend classification
      const weddingDate = new Date(record.wedding_date);
      record.is_weekend = weddingDate.getDay() === 0 || weddingDate.getDay() === 6;
      record.is_saturday = weddingDate.getDay() === 6;
      
      // Add season classification
      const month = weddingDate.getMonth() + 1;
      if (month >= 6 && month <= 9) record.season = 'summer';
      else if (month >= 3 && month <= 5) record.season = 'spring';
      else if (month >= 10 && month <= 11) record.season = 'fall';
      else record.season = 'winter';
      
      // Add peak season indicator
      record.is_peak_season = month >= 5 && month <= 10;
      
      // Add quarter
      record.quarter = Math.ceil(month / 3);
      
      // Wedding-specific calculations
      if (reportType === 'financial' && record.wedding_suppliers) {
        record.total_confirmed_price = record.wedding_suppliers.reduce(
          (sum, supplier) => sum + (supplier.confirmed_price || 0), 0
        );
        record.total_paid = record.wedding_suppliers.reduce(
          (sum, supplier) => sum + (supplier.paid_amount || 0), 0
        );
        record.payment_completion_rate = record.total_confirmed_price > 0 
          ? (record.total_paid / record.total_confirmed_price) * 100 
          : 0;
      }
      
      return record;
    });
  }

  generateSummaryStatistics(data) {
    if (data.length === 0) {
      return { total_records: 0 };
    }
    
    const summary = {
      total_records: data.length,
      date_range: {
        earliest: new Date(Math.min(...data.map(r => new Date(r.wedding_date)))),
        latest: new Date(Math.max(...data.map(r => new Date(r.wedding_date))))
      },
      weekend_concentration: {
        total_weekends: data.filter(r => r.is_weekend).length,
        total_saturdays: data.filter(r => r.is_saturday).length,
        weekend_percentage: (data.filter(r => r.is_weekend).length / data.length) * 100
      },
      seasonal_distribution: {
        spring: data.filter(r => r.season === 'spring').length,
        summer: data.filter(r => r.season === 'summer').length,
        fall: data.filter(r => r.season === 'fall').length,
        winter: data.filter(r => r.season === 'winter').length
      }
    };
    
    // Add financial summary if available
    const financialRecords = data.filter(r => r.total_confirmed_price);
    if (financialRecords.length > 0) {
      summary.financial = {
        total_value: financialRecords.reduce((sum, r) => sum + r.total_confirmed_price, 0),
        total_paid: financialRecords.reduce((sum, r) => sum + r.total_paid, 0),
        avg_wedding_value: financialRecords.reduce((sum, r) => sum + r.total_confirmed_price, 0) / financialRecords.length,
        payment_completion_rate: (financialRecords.reduce((sum, r) => sum + r.total_paid, 0) / 
                                  financialRecords.reduce((sum, r) => sum + r.total_confirmed_price, 0)) * 100
      };
    }
    
    return summary;
  }

  calculateWeddingMetrics(data) {
    return {
      total_weddings: data.length,
      unique_suppliers: new Set(data.flatMap(r => 
        r.wedding_suppliers ? r.wedding_suppliers.map(s => s.supplier_id) : []
      )).size,
      unique_venues: new Set(data.map(r => r.venue_id).filter(Boolean)).size,
      weekend_concentration: (data.filter(r => r.is_weekend).length / data.length) * 100,
      seasonal_distribution: {
        spring: data.filter(r => r.season === 'spring').length,
        summer: data.filter(r => r.season === 'summer').length,
        fall: data.filter(r => r.season === 'fall').length,
        winter: data.filter(r => r.season === 'winter').length
      },
      average_booking_lead_time: this.calculateAverageLeadTime(data)
    };
  }

  calculateAverageLeadTime(data) {
    const validRecords = data.filter(r => r.created_at && r.wedding_date);
    
    if (validRecords.length === 0) return 0;
    
    const totalLeadTime = validRecords.reduce((sum, record) => {
      const bookingDate = new Date(record.created_at);
      const weddingDate = new Date(record.wedding_date);
      const leadTimeDays = Math.ceil((weddingDate - bookingDate) / (1000 * 60 * 60 * 24));
      return sum + leadTimeDays;
    }, 0);
    
    return Math.round(totalLeadTime / validRecords.length);
  }

  calculateDynamicDateRange(dynamicRange) {
    const now = new Date();
    const { period, offset = 0 } = dynamicRange;
    
    let start, end;
    
    switch (period) {
      case 'last_week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 - (offset * 7));
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offset * 7));
        break;
        
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1 - offset, 1);
        end = new Date(now.getFullYear(), now.getMonth() - offset, 0);
        break;
        
      case 'last_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStart = (currentQuarter - 1 - offset) * 3;
        start = new Date(now.getFullYear(), quarterStart, 1);
        end = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
        
      case 'last_year':
        start = new Date(now.getFullYear() - 1 - offset, 0, 1);
        end = new Date(now.getFullYear() - offset, 0, 0);
        break;
        
      case 'current_season':
        const month = now.getMonth() + 1;
        if (month >= 6 && month <= 9) {
          start = new Date(now.getFullYear(), 5, 1); // June 1
          end = new Date(now.getFullYear(), 9, 30); // September 30
        } else if (month >= 3 && month <= 5) {
          start = new Date(now.getFullYear(), 2, 1); // March 1
          end = new Date(now.getFullYear(), 5, 0); // May 31
        } else if (month >= 10 && month <= 11) {
          start = new Date(now.getFullYear(), 9, 1); // October 1
          end = new Date(now.getFullYear(), 11, 30); // November 30
        } else {
          start = new Date(now.getFullYear(), 11, 1); // December 1
          end = new Date(now.getFullYear() + 1, 2, 0); // February 28/29
        }
        break;
        
      default:
        // Default to last month
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  }

  async generateReportContent(reportType, aggregatedData) {
    const content = {
      title: this.getReportTitle(reportType),
      generatedAt: new Date(),
      summary: aggregatedData.summary,
      data: aggregatedData.data,
      charts: [],
      insights: []
    };
    
    // Generate report-specific content
    switch (reportType) {
      case 'financial':
        content.charts.push(...this.generateFinancialCharts(aggregatedData.data));
        content.insights.push(...this.generateFinancialInsights(aggregatedData.data));
        break;
        
      case 'supplier_performance':
        content.charts.push(...this.generateSupplierPerformanceCharts(aggregatedData.data));
        content.insights.push(...this.generateSupplierInsights(aggregatedData.data));
        break;
        
      case 'seasonal_analysis':
        content.charts.push(...this.generateSeasonalCharts(aggregatedData.data));
        content.insights.push(...this.generateSeasonalInsights(aggregatedData.data));
        break;
        
      case 'booking_trends':
        content.charts.push(...this.generateBookingTrendCharts(aggregatedData.data));
        content.insights.push(...this.generateBookingInsights(aggregatedData.data));
        break;
    }
    
    return content;
  }

  getReportTitle(reportType) {
    const titles = {
      'financial': 'Wedding Financial Performance Report',
      'supplier_performance': 'Supplier Performance Analysis',
      'seasonal_analysis': 'Wedding Seasonal Trends Analysis',
      'booking_trends': 'Wedding Booking Trends Report',
      'venue_utilization': 'Venue Utilization Report',
      'client_satisfaction': 'Client Satisfaction Analysis'
    };
    
    return titles[reportType] || 'Wedding Industry Report';
  }

  generateFinancialCharts(data) {
    return [
      {
        type: 'bar',
        title: 'Revenue by Month',
        data: this.groupByMonth(data, 'total_confirmed_price')
      },
      {
        type: 'pie',
        title: 'Revenue by Season',
        data: this.groupBySeason(data, 'total_confirmed_price')
      },
      {
        type: 'line',
        title: 'Payment Completion Rate Trend',
        data: this.calculatePaymentCompletionTrend(data)
      }
    ];
  }

  generateFinancialInsights(data) {
    const insights = [];
    
    // Weekend vs weekday revenue
    const weekendRevenue = data.filter(r => r.is_weekend).reduce((sum, r) => sum + (r.total_confirmed_price || 0), 0);
    const weekdayRevenue = data.filter(r => !r.is_weekend).reduce((sum, r) => sum + (r.total_confirmed_price || 0), 0);
    const totalRevenue = weekendRevenue + weekdayRevenue;
    
    if (totalRevenue > 0) {
      insights.push({
        type: 'revenue_concentration',
        title: 'Weekend Revenue Concentration',
        description: `${((weekendRevenue / totalRevenue) * 100).toFixed(1)}% of revenue comes from weekend weddings`,
        impact: weekendRevenue > weekdayRevenue * 2 ? 'high' : 'medium'
      });
    }
    
    // Peak season analysis
    const peakSeasonRevenue = data.filter(r => r.is_peak_season).reduce((sum, r) => sum + (r.total_confirmed_price || 0), 0);
    if (totalRevenue > 0) {
      insights.push({
        type: 'seasonal_revenue',
        title: 'Peak Season Revenue',
        description: `${((peakSeasonRevenue / totalRevenue) * 100).toFixed(1)}% of annual revenue occurs during peak season (May-October)`,
        impact: 'high'
      });
    }
    
    return insights;
  }

  generateSupplierPerformanceCharts(data) {
    return [
      {
        type: 'bar',
        title: 'Supplier Ratings by Service Type',
        data: this.calculateSupplierRatingsByServiceType(data)
      },
      {
        type: 'scatter',
        title: 'Completion Time vs Rating',
        data: this.calculateCompletionTimeVsRating(data)
      }
    ];
  }

  generateSeasonalCharts(data) {
    return [
      {
        type: 'line',
        title: 'Wedding Volume by Month',
        data: this.groupByMonth(data, 'count')
      },
      {
        type: 'heatmap',
        title: 'Wedding Day Heat Map',
        data: this.generateWeddingDayHeatMap(data)
      }
    ];
  }

  groupByMonth(data, valueField) {
    const groups = {};
    
    data.forEach(record => {
      const month = new Date(record.wedding_date).toISOString().slice(0, 7); // YYYY-MM
      
      if (!groups[month]) {
        groups[month] = { month, value: 0, count: 0 };
      }
      
      if (valueField === 'count') {
        groups[month].value++;
      } else {
        groups[month].value += record[valueField] || 0;
      }
      groups[month].count++;
    });
    
    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
  }

  groupBySeason(data, valueField) {
    const seasons = { spring: 0, summer: 0, fall: 0, winter: 0 };
    
    data.forEach(record => {
      if (valueField === 'count') {
        seasons[record.season]++;
      } else {
        seasons[record.season] += record[valueField] || 0;
      }
    });
    
    return Object.entries(seasons).map(([season, value]) => ({
      label: season.charAt(0).toUpperCase() + season.slice(1),
      value
    }));
  }

  async processExcel(data) {
    console.log('📊 Processing Excel report');
    
    const workbook = new ExcelJS.Workbook();
    
    // Create worksheets based on data structure
    if (data.summary) {
      this.addSummaryWorksheet(workbook, data.summary);
    }
    
    if (data.data && data.data.length > 0) {
      this.addDataWorksheet(workbook, 'Wedding Data', data.data);
    }
    
    if (data.charts && data.charts.length > 0) {
      this.addChartsWorksheet(workbook, data.charts);
    }
    
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  addSummaryWorksheet(workbook, summary) {
    const worksheet = workbook.addWorksheet('Summary');
    
    // Add title
    worksheet.addRow(['Wedding Report Summary']);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.addRow([]); // Empty row
    
    // Add summary statistics
    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        worksheet.addRow([key.replace(/_/g, ' ').toUpperCase()]);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        Object.entries(value).forEach(([subKey, subValue]) => {
          worksheet.addRow([`  ${subKey.replace(/_/g, ' ')}`, subValue]);
        });
      } else {
        worksheet.addRow([key.replace(/_/g, ' '), value]);
      }
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 0, 15);
    });
  }

  addDataWorksheet(workbook, sheetName, data) {
    const worksheet = workbook.addWorksheet(sheetName);
    
    if (data.length === 0) return;
    
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    
    // Add data rows
    data.forEach(record => {
      const row = headers.map(header => {
        const value = record[header];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      });
      worksheet.addRow(row);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      const header = headers[index];
      column.width = Math.max(header.length, 12);
    });
  }

  async generatePDF(reportContent) {
    console.log('📄 Generating PDF report');
    
    const doc = new PDFDocument();
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      doc.on('error', reject);
      
      try {
        // Add title
        doc.fontSize(20).text(reportContent.title, { align: 'center' });
        doc.moveDown();
        
        // Add generation date
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();
        
        // Add summary section
        if (reportContent.summary) {
          doc.fontSize(16).text('Summary', { underline: true });
          doc.fontSize(12);
          
          Object.entries(reportContent.summary).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              doc.text(`${key.replace(/_/g, ' ').toUpperCase()}:`);
              Object.entries(value).forEach(([subKey, subValue]) => {
                doc.text(`  ${subKey.replace(/_/g, ' ')}: ${subValue}`);
              });
            } else {
              doc.text(`${key.replace(/_/g, ' ')}: ${value}`);
            }
          });
          
          doc.moveDown();
        }
        
        // Add insights section
        if (reportContent.insights && reportContent.insights.length > 0) {
          doc.fontSize(16).text('Key Insights', { underline: true });
          doc.fontSize(12);
          
          reportContent.insights.forEach((insight, index) => {
            doc.text(`${index + 1}. ${insight.title}`, { continued: false });
            doc.text(`   ${insight.description}`, { indent: 20 });
            doc.moveDown(0.5);
          });
        }
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  generateCSVReport(reportContent) {
    if (!reportContent.data || reportContent.data.length === 0) {
      return 'No data available';
    }
    
    const data = reportContent.data;
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    
    data.forEach(record => {
      const row = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  async processImages(images) {
    console.log(`🖼️ Processing ${images.length} images`);
    
    const processedImages = [];
    
    for (const image of images) {
      try {
        // Resize image for thumbnails
        const thumbnail = await sharp(image.buffer)
          .resize(300, 300, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        // Create web-optimized version
        const webOptimized = await sharp(image.buffer)
          .resize(1200, 1200, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        processedImages.push({
          original: image,
          thumbnail,
          webOptimized,
          metadata: await sharp(image.buffer).metadata()
        });
        
      } catch (error) {
        console.error(`Failed to process image ${image.name}:`, error);
        processedImages.push({
          original: image,
          error: error.message
        });
      }
    }
    
    return processedImages;
  }

  async deliverEmail(emailData) {
    console.log('📧 Processing email delivery');
    
    // This would integrate with the email service (Resend)
    // For now, simulate email processing
    
    return {
      emailId: `email_${Date.now()}`,
      recipient: emailData.recipient,
      subject: emailData.subject,
      status: 'sent',
      sentAt: new Date()
    };
  }

  // Additional helper methods would go here...
  
  calculateSupplierRatingsByServiceType(data) {
    const serviceTypes = {};
    
    data.forEach(record => {
      if (record.wedding_suppliers) {
        record.wedding_suppliers.forEach(supplier => {
          const { service_type, rating } = supplier;
          if (service_type && rating) {
            if (!serviceTypes[service_type]) {
              serviceTypes[service_type] = { total: 0, count: 0 };
            }
            serviceTypes[service_type].total += rating;
            serviceTypes[service_type].count++;
          }
        });
      }
    });
    
    return Object.entries(serviceTypes).map(([serviceType, stats]) => ({
      serviceType,
      averageRating: stats.total / stats.count
    }));
  }

  generateWeddingDayHeatMap(data) {
    const dayOfWeekCounts = Array(7).fill(0);
    
    data.forEach(record => {
      const dayOfWeek = new Date(record.wedding_date).getDay();
      dayOfWeekCounts[dayOfWeek]++;
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return dayOfWeekCounts.map((count, index) => ({
      day: dayNames[index],
      count,
      percentage: (count / data.length) * 100
    }));
  }
}

// Initialize worker
const worker = new ReportWorker(workerData.config);

// Listen for tasks from main thread
parentPort.on('message', async (task) => {
  await worker.processTask(task);
});

// Send periodic health updates
setInterval(() => {
  if (worker.config.enableProfiling) {
    parentPort.postMessage({
      type: 'profile',
      workerId: worker.workerId,
      uptime: Date.now() - worker.startTime,
      tasksProcessed: worker.tasksProcessed,
      avgProcessingTime: worker.tasksProcessed > 0 
        ? worker.totalProcessingTime / worker.tasksProcessed 
        : 0,
      memoryUsage: process.memoryUsage(),
      isProcessing: worker.isProcessing
    });
  }
}, 30000); // Every 30 seconds