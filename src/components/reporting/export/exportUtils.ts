'use client';

import {
  ExportFormat,
  ExportOptions,
  ExportJob,
  ReportTemplate,
  ChartType,
} from '../types';

// Export processing utilities
export class ExportProcessor {
  private static instance: ExportProcessor;

  static getInstance(): ExportProcessor {
    if (!this.instance) {
      this.instance = new ExportProcessor();
    }
    return this.instance;
  }

  private constructor() {}

  async processExport(
    format: ExportFormat,
    reportData: any,
    template: ReportTemplate,
    options: ExportOptions,
    onProgress?: (progress: number, step: string) => void,
  ): Promise<ExportJob> {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ExportJob = {
      id: jobId,
      format,
      status: 'processing',
      progress: 0,
      templateName: template.name,
      fileName: this.generateFileName(template.name, format, options),
      createdAt: new Date(),
      startedAt: new Date(),
      options,
      currentStep: 'Initializing',
    };

    try {
      // Step 1: Validate and prepare data
      onProgress?.(10, 'Validating data');
      await this.validateData(reportData, template);
      job.progress = 10;

      // Step 2: Process data according to format
      onProgress?.(30, 'Processing data');
      const processedData = await this.processDataForFormat(
        reportData,
        template,
        format,
        options,
      );
      job.progress = 30;

      // Step 3: Generate export content
      onProgress?.(60, `Generating ${format.toUpperCase()}`);
      const content = await this.generateContent(
        processedData,
        format,
        options,
      );
      job.progress = 60;

      // Step 4: Apply formatting and styling
      onProgress?.(80, 'Applying formatting');
      const formattedContent = await this.applyFormatting(
        content,
        format,
        options,
      );
      job.progress = 80;

      // Step 5: Finalize and create download link
      onProgress?.(95, 'Creating download link');
      const result = await this.finalizeExport(
        formattedContent,
        format,
        options,
        job.fileName!,
      );
      job.progress = 95;

      // Complete
      onProgress?.(100, 'Complete');
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.downloadUrl = result.downloadUrl;
      job.fileSize = result.fileSize;
      job.currentStep = undefined;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Export failed';
      job.completedAt = new Date();
      console.error('Export failed:', error);
    }

    return job;
  }

  private generateFileName(
    templateName: string,
    format: ExportFormat,
    options: ExportOptions,
  ): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanName = templateName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    let suffix = '';
    if (options.pageSize && format === 'pdf') suffix += `_${options.pageSize}`;
    if (options.width && format === 'png')
      suffix += `_${options.width}x${options.height}`;

    return `${cleanName}_${timestamp}${suffix}.${this.getFileExtension(format)}`;
  }

  private getFileExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      png: 'png',
      jpeg: 'jpg',
    };
    return extensions[format];
  }

  private async validateData(
    reportData: any,
    template: ReportTemplate,
  ): Promise<void> {
    if (!reportData) {
      throw new Error('Report data is required for export');
    }

    if (!template.sections || template.sections.length === 0) {
      throw new Error('Template must have at least one section');
    }

    // Validate that required data exists for each section
    for (const section of template.sections) {
      if (section.type === 'chart' && section.chartType) {
        await this.validateChartData(reportData, section.chartType);
      }
    }
  }

  private async validateChartData(
    data: any,
    chartType: ChartType,
  ): Promise<void> {
    switch (chartType) {
      case 'bar':
      case 'line':
      case 'area':
        if (!data.chartData || !Array.isArray(data.chartData)) {
          throw new Error(`${chartType} chart requires chartData array`);
        }
        break;
      case 'pie':
        if (!data.pieData || !Array.isArray(data.pieData)) {
          throw new Error('Pie chart requires pieData array');
        }
        break;
      case 'radar':
        if (!data.radarData || !Array.isArray(data.radarData)) {
          throw new Error('Radar chart requires radarData array');
        }
        break;
    }
  }

  private async processDataForFormat(
    reportData: any,
    template: ReportTemplate,
    format: ExportFormat,
    options: ExportOptions,
  ): Promise<any> {
    const processedData = { ...reportData };

    // Format-specific data processing
    switch (format) {
      case 'csv':
        return this.processDataForCSV(processedData, template, options);
      case 'excel':
        return this.processDataForExcel(processedData, template, options);
      case 'pdf':
        return this.processDataForPDF(processedData, template, options);
      case 'png':
      case 'jpeg':
        return this.processDataForImage(processedData, template, options);
      default:
        return processedData;
    }
  }

  private async processDataForCSV(
    data: any,
    template: ReportTemplate,
    options: ExportOptions,
  ): Promise<any> {
    // Flatten data into tabular format
    const rows: any[] = [];

    template.sections.forEach((section) => {
      if (section.type === 'chart' && data[section.id]) {
        const sectionData = data[section.id];
        if (Array.isArray(sectionData)) {
          rows.push(...sectionData);
        }
      } else if (section.type === 'table' && data[section.id]) {
        const tableData = data[section.id];
        if (Array.isArray(tableData)) {
          rows.push(...tableData);
        }
      }
    });

    return {
      rows,
      headers: this.extractHeaders(rows),
      delimiter: options.delimiter || ',',
      includeHeaders: options.includeHeaders !== false,
    };
  }

  private async processDataForExcel(
    data: any,
    template: ReportTemplate,
    options: ExportOptions,
  ): Promise<any> {
    const sheets: Record<string, any[]> = {};

    if (options.separateSheets) {
      // Create separate sheet for each section
      template.sections.forEach((section) => {
        if (data[section.id]) {
          sheets[section.title] = this.normalizeDataArray(data[section.id]);
        }
      });
    } else {
      // Single sheet with all data
      const allData: any[] = [];
      template.sections.forEach((section) => {
        if (data[section.id] && Array.isArray(data[section.id])) {
          allData.push(
            { section: section.title, type: 'header' },
            ...data[section.id],
            { type: 'spacer' },
          );
        }
      });
      sheets['Report'] = allData;
    }

    return {
      sheets,
      includeCharts: options.includeCharts !== false,
      includeFormulas: options.includeFormulas === true,
      dateFormat: options.dateFormat || 'MM/dd/yyyy',
    };
  }

  private async processDataForPDF(
    data: any,
    template: ReportTemplate,
    options: ExportOptions,
  ): Promise<any> {
    return {
      ...data,
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'portrait',
      includeCharts: options.includeCharts !== false,
      includeData: options.includeData !== false,
      watermark: options.watermark === true,
      compression: options.compression || 'medium',
      template,
    };
  }

  private async processDataForImage(
    data: any,
    template: ReportTemplate,
    options: ExportOptions,
  ): Promise<any> {
    return {
      ...data,
      width: options.width || 1920,
      height: options.height || 1080,
      dpi: options.dpi || 300,
      quality: options.quality || 90,
      background: options.background || 'white',
      transparent: options.transparent === true && options.format === 'png',
      template,
    };
  }

  private normalizeDataArray(data: any): any[] {
    if (!Array.isArray(data)) {
      return [data];
    }
    return data;
  }

  private extractHeaders(rows: any[]): string[] {
    if (rows.length === 0) return [];

    const firstRow = rows[0];
    if (typeof firstRow === 'object' && firstRow !== null) {
      return Object.keys(firstRow);
    }

    return ['Value'];
  }

  private async generateContent(
    processedData: any,
    format: ExportFormat,
    options: ExportOptions,
  ): Promise<any> {
    switch (format) {
      case 'csv':
        return this.generateCSV(processedData);
      case 'excel':
        return this.generateExcel(processedData);
      case 'pdf':
        return this.generatePDF(processedData);
      case 'png':
      case 'jpeg':
        return this.generateImage(processedData, format);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async generateCSV(data: any): Promise<string> {
    const { rows, headers, delimiter, includeHeaders } = data;
    let csv = '';

    if (includeHeaders && headers.length > 0) {
      csv += headers.join(delimiter) + '\n';
    }

    rows.forEach((row: any) => {
      const values = headers.map((header) => {
        let value = row[header];

        if (value === null || value === undefined) {
          return '';
        }

        if (
          typeof value === 'string' &&
          (value.includes(delimiter) ||
            value.includes('"') ||
            value.includes('\n'))
        ) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }

        return value;
      });

      csv += values.join(delimiter) + '\n';
    });

    return csv;
  }

  private async generateExcel(data: any): Promise<Blob> {
    // This would typically use a library like ExcelJS
    // For now, return a mock blob
    const workbook = {
      sheets: data.sheets,
      options: {
        includeCharts: data.includeCharts,
        includeFormulas: data.includeFormulas,
        dateFormat: data.dateFormat,
      },
    };

    // Mock Excel generation - in real implementation, use ExcelJS
    const jsonString = JSON.stringify(workbook, null, 2);
    return new Blob([jsonString], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  private async generatePDF(data: any): Promise<Blob> {
    // This would typically use a library like jsPDF or PDFKit
    // For now, return a mock blob
    const pdfContent = {
      template: data.template,
      data: data,
      options: {
        pageSize: data.pageSize,
        orientation: data.orientation,
        includeCharts: data.includeCharts,
        includeData: data.includeData,
        watermark: data.watermark,
        compression: data.compression,
      },
    };

    // Mock PDF generation - in real implementation, use jsPDF or similar
    const jsonString = JSON.stringify(pdfContent, null, 2);
    return new Blob([jsonString], { type: 'application/pdf' });
  }

  private async generateImage(data: any, format: ExportFormat): Promise<Blob> {
    // This would typically render the components to canvas and export
    // For now, return a mock blob
    const canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Mock image generation
    ctx.fillStyle =
      data.background === 'transparent'
        ? 'rgba(0,0,0,0)'
        : data.background || 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add mock content
    ctx.fillStyle = '#333333';
    ctx.font = '24px Arial';
    ctx.fillText(`${data.template.name} - Report Export`, 50, 50);
    ctx.fillText(`Format: ${format.toUpperCase()}`, 50, 100);
    ctx.fillText(`Size: ${data.width}x${data.height}`, 50, 150);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate image blob'));
          }
        },
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        format === 'jpeg' ? data.quality / 100 : undefined,
      );
    });
  }

  private async applyFormatting(
    content: any,
    format: ExportFormat,
    options: ExportOptions,
  ): Promise<any> {
    // Apply format-specific formatting
    switch (format) {
      case 'csv':
        return this.applyCSVFormatting(content, options);
      case 'excel':
        return this.applyExcelFormatting(content, options);
      case 'pdf':
        return this.applyPDFFormatting(content, options);
      case 'png':
      case 'jpeg':
        return this.applyImageFormatting(content, options);
      default:
        return content;
    }
  }

  private async applyCSVFormatting(
    content: string,
    options: ExportOptions,
  ): Promise<string> {
    // Apply CSV-specific formatting
    let formatted = content;

    if (options.encoding && options.encoding !== 'utf-8') {
      // Apply encoding transformation if needed
      // This would typically use a library like iconv-lite
    }

    return formatted;
  }

  private async applyExcelFormatting(
    content: Blob,
    options: ExportOptions,
  ): Promise<Blob> {
    // Apply Excel-specific formatting
    // This would modify the workbook with styling, charts, etc.
    return content;
  }

  private async applyPDFFormatting(
    content: Blob,
    options: ExportOptions,
  ): Promise<Blob> {
    // Apply PDF-specific formatting
    // This would add styling, headers, footers, watermarks, etc.
    return content;
  }

  private async applyImageFormatting(
    content: Blob,
    options: ExportOptions,
  ): Promise<Blob> {
    // Apply image-specific formatting
    // This could include filters, compression, etc.
    return content;
  }

  private async finalizeExport(
    content: any,
    format: ExportFormat,
    options: ExportOptions,
    fileName: string,
  ): Promise<{ downloadUrl: string; fileSize: number }> {
    let blob: Blob;

    if (typeof content === 'string') {
      blob = new Blob([content], { type: this.getMimeType(format) });
    } else if (content instanceof Blob) {
      blob = content;
    } else {
      blob = new Blob([JSON.stringify(content)], {
        type: this.getMimeType(format),
      });
    }

    // Create download URL
    const downloadUrl = URL.createObjectURL(blob);

    return {
      downloadUrl,
      fileSize: blob.size,
    };
  }

  private getMimeType(format: ExportFormat): string {
    const mimeTypes: Record<ExportFormat, string> = {
      pdf: 'application/pdf',
      excel:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      png: 'image/png',
      jpeg: 'image/jpeg',
    };
    return mimeTypes[format];
  }

  // Utility methods for cleanup
  static cleanupDownloadUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  static getEstimatedSize(
    reportData: any,
    template: ReportTemplate,
    format: ExportFormat,
    options: ExportOptions,
  ): number {
    // Estimate file size based on format and data
    const baseSize = JSON.stringify(reportData).length;

    const multipliers: Record<ExportFormat, number> = {
      csv: 0.5, // CSV is typically smaller due to text format
      excel: 1.5, // Excel has overhead for formatting
      pdf: 2.0, // PDF includes fonts, images, formatting
      png: 3.0, // PNG is uncompressed
      jpeg: 1.5, // JPEG is compressed
    };

    let estimatedSize = baseSize * (multipliers[format] || 1.0);

    // Adjust based on options
    if (format === 'pdf' && options.compression === 'high') {
      estimatedSize *= 0.6;
    } else if (format === 'pdf' && options.compression === 'none') {
      estimatedSize *= 1.5;
    }

    if (
      (format === 'png' || format === 'jpeg') &&
      options.width &&
      options.height
    ) {
      const pixelCount = options.width * options.height;
      estimatedSize = Math.max(
        estimatedSize,
        pixelCount * (format === 'png' ? 4 : 1),
      );
    }

    return Math.round(estimatedSize);
  }
}

// Convenience functions
export const exportProcessor = ExportProcessor.getInstance();

export const generateFileName = (
  templateName: string,
  format: ExportFormat,
  suffix?: string,
): string => {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const cleanName = templateName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const fullSuffix = suffix ? `_${suffix}` : '';

  const extensions: Record<ExportFormat, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
    csv: 'csv',
    png: 'png',
    jpeg: 'jpg',
  };

  return `${cleanName}_${timestamp}${fullSuffix}.${extensions[format]}`;
};

export const validateExportOptions = (
  format: ExportFormat,
  options: ExportOptions,
): string[] => {
  const errors: string[] = [];

  switch (format) {
    case 'pdf':
      if (
        options.pageSize &&
        !['A4', 'A3', 'Letter', 'Legal'].includes(options.pageSize)
      ) {
        errors.push('Invalid page size for PDF export');
      }
      break;

    case 'png':
    case 'jpeg':
      if (options.width && (options.width < 100 || options.width > 4000)) {
        errors.push('Image width must be between 100 and 4000 pixels');
      }
      if (options.height && (options.height < 100 || options.height > 4000)) {
        errors.push('Image height must be between 100 and 4000 pixels');
      }
      if (
        format === 'jpeg' &&
        options.quality &&
        (options.quality < 10 || options.quality > 100)
      ) {
        errors.push('JPEG quality must be between 10 and 100');
      }
      break;

    case 'csv':
      if (options.delimiter && options.delimiter.length !== 1) {
        errors.push('CSV delimiter must be a single character');
      }
      break;
  }

  return errors;
};

export default ExportProcessor;
