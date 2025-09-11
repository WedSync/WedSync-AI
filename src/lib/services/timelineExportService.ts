// =====================================================
// TIMELINE EXPORT SERVICE
// =====================================================
// Advanced export functionality for wedding timelines
// Supports PDF, CSV, Excel formats with customization
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20
// =====================================================

'use client';

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { format, parseISO, addMinutes } from 'date-fns';
import type {
  WeddingTimeline,
  TimelineEvent,
  TimelineExport,
  TimelineEventVendor,
  VendorInfo,
} from '@/types/timeline';

// =====================================================
// EXPORT CONFIGURATION TYPES
// =====================================================

export interface ExportOptions extends TimelineExport {
  includeImages?: boolean;
  includeColors?: boolean;
  includeNotes?: boolean;
  includeComments?: boolean;
  includeStatistics?: boolean;
  customLogo?: string;
  customFooter?: string;
  pageOrientation?: 'portrait' | 'landscape';
  fontSize?: 'small' | 'medium' | 'large';
  groupByCategory?: boolean;
  showBufferTimes?: boolean;
  showTravelTimes?: boolean;
  includeEmptyEvents?: boolean;
  // WS-160 specific features
  clientFriendlyVersion?: boolean; // Hide internal notes, show only relevant details
  vendorDetailedVersion?: boolean; // Include all setup/breakdown times, responsibilities
  printOptimized?: boolean; // Optimize layout for printing
  includeContactInfo?: boolean; // Include vendor contact information
  includeLocationMaps?: boolean; // Include location details and maps
  reminderSettings?: boolean; // Include reminder settings for calendar exports
}

export interface ExportProgress {
  stage: 'preparing' | 'processing' | 'generating' | 'complete';
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename: string;
  size?: number;
  error?: string;
  downloadUrl?: string;
  // WS-160 Security features
  secureUrl?: string;
  expiresAt?: string;
  fileId?: string;
  sharing?: {
    email_enabled: boolean;
    password_required: boolean;
    download_limit?: number;
  };
}

// =====================================================
// MAIN EXPORT SERVICE
// =====================================================

export class TimelineExportService {
  private progressCallback?: (progress: ExportProgress) => void;

  constructor(progressCallback?: (progress: ExportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  // =====================================================
  // PUBLIC EXPORT METHODS
  // =====================================================

  async exportTimeline(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      this.updateProgress('preparing', 0, 'Preparing export...');

      // Validate inputs
      if (!timeline || !events) {
        throw new Error('Timeline and events are required');
      }

      // Filter and sort events
      const processedEvents = this.preprocessEvents(events, options);
      this.updateProgress('preparing', 20, 'Processing events...');

      // Generate export based on format
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(timeline, processedEvents, options);
        case 'csv':
          return await this.exportToCSV(timeline, processedEvents, options);
        case 'excel':
          return await this.exportToExcel(timeline, processedEvents, options);
        case 'ical':
          return await this.exportToICAL(timeline, processedEvents, options);
        case 'google':
          return await this.exportToGoogleCalendar(
            timeline,
            processedEvents,
            options,
          );
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Timeline export failed:', error);
      return {
        success: false,
        filename: `timeline_error_${Date.now()}.txt`,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  // =====================================================
  // PDF EXPORT IMPLEMENTATION
  // =====================================================

  private async exportToPDF(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    this.updateProgress('processing', 30, 'Generating PDF layout...');

    const doc = new jsPDF({
      orientation:
        options.pageOrientation ||
        (options.printOptimized ? 'landscape' : 'portrait'),
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = options.printOptimized ? 15 : 20; // Smaller margins for print optimization
    const contentWidth = pageWidth - margin * 2;

    let currentY = margin;
    const lineHeight = options.printOptimized ? 5 : 6;
    const fontSize = this.getFontSize(options.fontSize);

    // Header with branding
    if (options.branding?.company_name) {
      doc.setFontSize(fontSize + 2);
      doc.setFont('helvetica', 'bold');
      doc.text(options.branding.company_name, margin, currentY);
      currentY += lineHeight + 2;
    }

    doc.setFontSize(fontSize + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(timeline.name, margin, currentY);
    currentY += lineHeight + 4;

    // Wedding Date & Details
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    const weddingDate = format(
      parseISO(timeline.wedding_date),
      'EEEE, MMMM dd, yyyy',
    );
    doc.text(`Wedding Date: ${weddingDate}`, margin, currentY);
    currentY += lineHeight;

    const timeRange = `${timeline.start_time} - ${timeline.end_time}`;
    doc.text(`Time: ${timeRange} (${timeline.timezone})`, margin, currentY);
    currentY += lineHeight;

    // Version info (client-friendly vs vendor detailed)
    if (options.clientFriendlyVersion) {
      doc.setFontSize(fontSize - 1);
      doc.setTextColor(100, 100, 100);
      doc.text('Client Version - Summary Timeline', margin, currentY);
      currentY += lineHeight + 2;
      doc.setTextColor(0, 0, 0);
    } else if (options.vendorDetailedVersion) {
      doc.setFontSize(fontSize - 1);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Vendor Version - Detailed Timeline with Setup Requirements',
        margin,
        currentY,
      );
      currentY += lineHeight + 2;
      doc.setTextColor(0, 0, 0);
    }

    currentY += 8;

    this.updateProgress('processing', 50, 'Adding events to PDF...');

    // Events Table Header - Dynamic based on version and options
    doc.setFont('helvetica', 'bold');
    doc.text('Time', margin, currentY);
    doc.text('Event', margin + 30, currentY);

    let headerX = margin + 80;
    if (options.includeLocationMaps || !options.clientFriendlyVersion) {
      doc.text('Location', headerX, currentY);
      headerX += 50;
    }

    if (options.include_vendor_details || options.vendorDetailedVersion) {
      doc.text('Vendors', headerX, currentY);
      headerX += 60;
    }

    if (options.vendorDetailedVersion) {
      doc.text('Setup', headerX, currentY);
      headerX += 30;
    }

    if (options.includeContactInfo && options.vendorDetailedVersion) {
      doc.text('Contact', headerX, currentY);
      headerX += 40;
    }

    currentY += lineHeight + 2;

    // Draw header line
    doc.line(margin, currentY - 2, margin + contentWidth, currentY - 2);
    currentY += 4;

    // Events
    doc.setFont('helvetica', 'normal');
    for (const event of events) {
      // Check if we need a new page
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
      }

      // Format times
      const startTime = format(parseISO(event.start_time), 'HH:mm');
      const endTime = format(parseISO(event.end_time), 'HH:mm');
      const timeString = `${startTime}-${endTime}`;

      // Event details
      doc.text(timeString, margin, currentY);

      // Event title with priority indicator (unless client-friendly version)
      let eventTitle = event.title;
      if (!options.clientFriendlyVersion) {
        if (event.priority === 'critical') {
          eventTitle = `⚠️ ${eventTitle}`;
        } else if (event.priority === 'high') {
          eventTitle = `🔥 ${eventTitle}`;
        }
      }

      doc.text(eventTitle, margin + 30, currentY);

      let contentX = margin + 80;

      // Location
      if (
        (options.includeLocationMaps || !options.clientFriendlyVersion) &&
        event.location
      ) {
        doc.text(event.location, contentX, currentY);
        contentX += 50;
      }

      // Vendors
      if (
        (options.include_vendor_details || options.vendorDetailedVersion) &&
        event.vendors?.length
      ) {
        const vendorNames = event.vendors
          .map((v) => v.vendor?.business_name || 'Unknown')
          .join(', ');
        doc.text(
          vendorNames.substring(0, 25) + (vendorNames.length > 25 ? '...' : ''),
          contentX,
          currentY,
        );
        contentX += 60;
      }

      // Setup/breakdown times for vendor version
      if (options.vendorDetailedVersion && event.vendors?.length) {
        const setupTime = event.vendors[0]?.setup_time_minutes || 0;
        const breakdownTime = event.vendors[0]?.breakdown_time_minutes || 0;
        if (setupTime || breakdownTime) {
          doc.text(`${setupTime}/${breakdownTime}min`, contentX, currentY);
        }
        contentX += 30;
      }

      // Contact info for vendor detailed version
      if (
        options.includeContactInfo &&
        options.vendorDetailedVersion &&
        event.vendors?.length
      ) {
        const primaryVendor =
          event.vendors.find((v) => v.role === 'primary') || event.vendors[0];
        if (primaryVendor?.vendor?.phone) {
          doc.text(primaryVendor.vendor.phone, contentX, currentY);
        }
        contentX += 40;
      }

      currentY += lineHeight;

      // Event description (client-friendly version shows all descriptions, vendor version is selective)
      if (
        event.description &&
        (options.includeNotes || options.clientFriendlyVersion)
      ) {
        currentY += 2;
        doc.setFontSize(fontSize - 1);
        doc.setTextColor(100, 100, 100);
        const splitDescription = doc.splitTextToSize(
          event.description,
          contentWidth - 30,
        );
        doc.text(splitDescription, margin + 30, currentY);
        currentY += splitDescription.length * (lineHeight - 1);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(fontSize);
      }

      // Internal notes - only for vendor detailed version
      if (
        options.vendorDetailedVersion &&
        options.include_internal_notes &&
        event.internal_notes
      ) {
        currentY += 2;
        doc.setFontSize(fontSize - 1);
        doc.setTextColor(150, 0, 0);
        const splitNotes = doc.splitTextToSize(
          `Internal: ${event.internal_notes}`,
          contentWidth - 30,
        );
        doc.text(splitNotes, margin + 30, currentY);
        currentY += splitNotes.length * (lineHeight - 1);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(fontSize);
      }

      // Vendor notes - for vendor detailed version
      if (options.vendorDetailedVersion && event.vendor_notes) {
        currentY += 2;
        doc.setFontSize(fontSize - 1);
        doc.setTextColor(0, 100, 150);
        const splitVendorNotes = doc.splitTextToSize(
          `Vendor Notes: ${event.vendor_notes}`,
          contentWidth - 30,
        );
        doc.text(splitVendorNotes, margin + 30, currentY);
        currentY += splitVendorNotes.length * (lineHeight - 1);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(fontSize);
      }

      // Location details for client version
      if (
        options.clientFriendlyVersion &&
        options.includeLocationMaps &&
        event.location_details
      ) {
        currentY += 2;
        doc.setFontSize(fontSize - 1);
        doc.setTextColor(0, 150, 0);
        const splitLocation = doc.splitTextToSize(
          `Location: ${event.location_details}`,
          contentWidth - 30,
        );
        doc.text(splitLocation, margin + 30, currentY);
        currentY += splitLocation.length * (lineHeight - 1);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(fontSize);
      }

      currentY += 4;
    }

    // Footer with branding and export info
    doc.setFontSize(fontSize - 2);
    doc.setTextColor(100, 100, 100);

    const footerY = pageHeight - 15;

    if (options.branding?.footer_text || options.customFooter) {
      doc.text(
        options.branding?.footer_text || options.customFooter!,
        margin,
        footerY,
      );
    }

    // Export timestamp and version info
    const exportInfo = `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | ${options.clientFriendlyVersion ? 'Client Version' : options.vendorDetailedVersion ? 'Vendor Version' : 'Standard Version'}`;
    doc.text(exportInfo, margin, footerY + 5);

    // Page numbers for multi-page documents
    if (doc.getNumberOfPages() > 1) {
      for (let i = 1; i <= doc.getNumberOfPages(); i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${doc.getNumberOfPages()}`,
          pageWidth - margin - 30,
          footerY + 5,
        );
      }
    }

    this.updateProgress('generating', 80, 'Finalizing PDF...');

    // Generate blob
    const pdfBlob = doc.output('blob');
    const filename = this.generateFilename(timeline, 'pdf');

    this.updateProgress('complete', 100, 'PDF export complete!');

    return {
      success: true,
      blob: pdfBlob,
      filename,
      size: pdfBlob.size,
    };
  }

  // =====================================================
  // CSV EXPORT IMPLEMENTATION
  // =====================================================

  private async exportToCSV(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    this.updateProgress('processing', 40, 'Processing CSV data...');

    const headers = [
      'Start Time',
      'End Time',
      'Duration (mins)',
      'Event Title',
      'Description',
      'Category',
      'Priority',
      'Status',
      'Location',
      'Location Details',
    ];

    if (options.include_vendor_details) {
      headers.push('Primary Vendor', 'All Vendors', 'Vendor Roles');
    }

    if (options.include_internal_notes) {
      headers.push('Internal Notes', 'Vendor Notes');
    }

    if (options.showBufferTimes) {
      headers.push('Buffer Before (mins)', 'Buffer After (mins)');
    }

    const rows: string[][] = [headers];

    this.updateProgress('processing', 60, 'Converting events to CSV...');

    events.forEach((event) => {
      const row = [
        format(parseISO(event.start_time), 'HH:mm'),
        format(parseISO(event.end_time), 'HH:mm'),
        event.duration_minutes?.toString() || '0',
        event.title,
        event.description || '',
        event.category || '',
        event.priority,
        event.status,
        event.location || '',
        event.location_details || '',
      ];

      if (options.include_vendor_details) {
        const primaryVendor = event.vendors?.find((v) => v.role === 'primary');
        const allVendors =
          event.vendors
            ?.map((v) => v.vendor?.business_name || 'Unknown')
            .join('; ') || '';
        const vendorRoles =
          event.vendors
            ?.map((v) => `${v.vendor?.business_name}: ${v.role}`)
            .join('; ') || '';

        row.push(
          primaryVendor?.vendor?.business_name || '',
          allVendors,
          vendorRoles,
        );
      }

      if (options.include_internal_notes) {
        row.push(event.internal_notes || '', event.vendor_notes || '');
      }

      if (options.showBufferTimes) {
        row.push(
          event.buffer_before_minutes?.toString() || '0',
          event.buffer_after_minutes?.toString() || '0',
        );
      }

      rows.push(row);
    });

    this.updateProgress('generating', 80, 'Generating CSV file...');

    // Convert to CSV string
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    // Create blob
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = this.generateFilename(timeline, 'csv');

    this.updateProgress('complete', 100, 'CSV export complete!');

    return {
      success: true,
      blob: csvBlob,
      filename,
      size: csvBlob.size,
    };
  }

  // =====================================================
  // EXCEL EXPORT IMPLEMENTATION
  // =====================================================

  private async exportToExcel(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    this.updateProgress('processing', 40, 'Creating Excel workbook...');

    const workbook = XLSX.utils.book_new();

    // Timeline Summary Sheet
    const summaryData = [
      ['Wedding Timeline Export'],
      [''],
      ['Timeline Name', timeline.name],
      [
        'Wedding Date',
        format(parseISO(timeline.wedding_date), 'EEEE, MMMM dd, yyyy'),
      ],
      ['Time Range', `${timeline.start_time} - ${timeline.end_time}`],
      ['Timezone', timeline.timezone],
      ['Status', timeline.status],
      ['Total Events', events.length],
      [''],
      ['Export Options'],
      ['Include Vendor Details', options.include_vendor_details ? 'Yes' : 'No'],
      ['Include Internal Notes', options.include_internal_notes ? 'Yes' : 'No'],
      ['Show Buffer Times', options.showBufferTimes ? 'Yes' : 'No'],
      ['Export Date', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    this.updateProgress('processing', 60, 'Adding events to Excel...');

    // Events Sheet
    const eventHeaders = [
      'Start Time',
      'End Time',
      'Duration (mins)',
      'Event Title',
      'Description',
      'Category',
      'Type',
      'Priority',
      'Status',
      'Location',
      'Location Details',
      'Is Locked',
      'Is Flexible',
      'Weather Dependent',
    ];

    if (options.include_vendor_details) {
      eventHeaders.push('Primary Vendor', 'All Vendors', 'Vendor Count');
    }

    if (options.include_internal_notes) {
      eventHeaders.push('Internal Notes', 'Vendor Notes');
    }

    if (options.showBufferTimes) {
      eventHeaders.push('Buffer Before (mins)', 'Buffer After (mins)');
    }

    const eventData = [eventHeaders];

    events.forEach((event) => {
      const row = [
        format(parseISO(event.start_time), 'HH:mm'),
        format(parseISO(event.end_time), 'HH:mm'),
        event.duration_minutes || 0,
        event.title,
        event.description || '',
        event.category || '',
        event.event_type || '',
        event.priority,
        event.status,
        event.location || '',
        event.location_details || '',
        event.is_locked ? 'Yes' : 'No',
        event.is_flexible ? 'Yes' : 'No',
        event.weather_dependent ? 'Yes' : 'No',
      ];

      if (options.include_vendor_details) {
        const primaryVendor = event.vendors?.find((v) => v.role === 'primary');
        const allVendors =
          event.vendors
            ?.map((v) => v.vendor?.business_name || 'Unknown')
            .join('; ') || '';

        row.push(
          primaryVendor?.vendor?.business_name || '',
          allVendors,
          event.vendors?.length || 0,
        );
      }

      if (options.include_internal_notes) {
        row.push(event.internal_notes || '', event.vendor_notes || '');
      }

      if (options.showBufferTimes) {
        row.push(
          event.buffer_before_minutes || 0,
          event.buffer_after_minutes || 0,
        );
      }

      eventData.push(row);
    });

    const eventsSheet = XLSX.utils.aoa_to_sheet(eventData);
    XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Events');

    // Vendors Sheet (if vendor details included)
    if (options.include_vendor_details) {
      this.updateProgress('processing', 70, 'Adding vendor details...');

      const vendorData = [
        [
          'Event',
          'Vendor',
          'Role',
          'Responsibilities',
          'Arrival Time',
          'Departure Time',
          'Status',
        ],
      ];

      events.forEach((event) => {
        if (event.vendors?.length) {
          event.vendors.forEach((eventVendor) => {
            vendorData.push([
              event.title,
              eventVendor.vendor?.business_name || 'Unknown',
              eventVendor.role || '',
              eventVendor.responsibilities || '',
              eventVendor.arrival_time || '',
              eventVendor.departure_time || '',
              eventVendor.confirmation_status,
            ]);
          });
        }
      });

      const vendorsSheet = XLSX.utils.aoa_to_sheet(vendorData);
      XLSX.utils.book_append_sheet(workbook, vendorsSheet, 'Vendors');
    }

    this.updateProgress('generating', 85, 'Finalizing Excel file...');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const filename = this.generateFilename(timeline, 'xlsx');

    this.updateProgress('complete', 100, 'Excel export complete!');

    return {
      success: true,
      blob: excelBlob,
      filename,
      size: excelBlob.size,
    };
  }

  // =====================================================
  // ICAL EXPORT IMPLEMENTATION
  // =====================================================

  private async exportToICAL(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    this.updateProgress('processing', 50, 'Generating iCal events...');

    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Timeline Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${timeline.name}`,
      `X-WR-CALDESC:Wedding timeline for ${timeline.name}`,
      `X-WR-TIMEZONE:${options.timezone || timeline.timezone}`,
    ];

    events.forEach((event) => {
      const startDate = parseISO(event.start_time);
      const endDate = parseISO(event.end_time);

      // Format dates for iCal (UTC)
      const formatDateForICAL = (date: Date) => {
        return date
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '');
      };

      let description = event.description || '';

      // Add vendor information
      if (options.include_vendor_details && event.vendors?.length) {
        const vendorList = event.vendors
          .map((v) => {
            let vendorInfo = `${v.vendor?.business_name} (${v.role})`;
            if (options.includeContactInfo && v.vendor?.phone) {
              vendorInfo += ` - ${v.vendor.phone}`;
            }
            return vendorInfo;
          })
          .join(', ');
        description += `\\n\\nVendors: ${vendorList}`;
      }

      // Add location details
      if (event.location_details && options.includeLocationMaps) {
        description += `\\n\\nLocation Details: ${event.location_details}`;
      }

      // Add setup/breakdown info for vendors
      if (options.vendorDetailedVersion && event.vendors?.length) {
        event.vendors.forEach((v) => {
          if (v.setup_time_minutes || v.breakdown_time_minutes) {
            description += `\\n\\n${v.vendor?.business_name} Setup: ${v.setup_time_minutes || 0} mins, Breakdown: ${v.breakdown_time_minutes || 0} mins`;
          }
          if (v.responsibilities) {
            description += `\\nResponsibilities: ${v.responsibilities}`;
          }
        });
      }

      if (
        options.include_internal_notes &&
        event.internal_notes &&
        !options.clientFriendlyVersion
      ) {
        description += `\\n\\nInternal Notes: ${event.internal_notes}`;
      }

      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${event.id}@wedsync.com`,
        `DTSTART:${formatDateForICAL(startDate)}`,
        `DTEND:${formatDateForICAL(endDate)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
        event.location ? `LOCATION:${event.location}` : '',
        `CATEGORIES:${event.category || 'Wedding'}`,
        `STATUS:${event.status.toUpperCase()}`,
        `PRIORITY:${this.getPriorityNumber(event.priority)}`,
        `CREATED:${formatDateForICAL(new Date())}`,
        `LAST-MODIFIED:${formatDateForICAL(new Date())}`,
      ];

      // Add reminders based on event priority and type
      if (options.reminderSettings) {
        if (event.priority === 'critical') {
          // Critical events: 24 hours and 1 hour before
          eventLines.push(
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Critical Wedding Event Reminder',
            'TRIGGER:-PT24H',
            'END:VALARM',
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Critical Wedding Event - 1 Hour Reminder',
            'TRIGGER:-PT1H',
            'END:VALARM',
          );
        } else if (event.priority === 'high') {
          // High priority: 4 hours before
          eventLines.push(
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Wedding Event Reminder',
            'TRIGGER:-PT4H',
            'END:VALARM',
          );
        } else {
          // Regular events: 2 hours before
          eventLines.push(
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Wedding Event Reminder',
            'TRIGGER:-PT2H',
            'END:VALARM',
          );
        }
      }

      eventLines.push('END:VEVENT');
      icalContent.push(...eventLines);
    });

    icalContent.push('END:VCALENDAR');

    this.updateProgress('generating', 90, 'Finalizing iCal file...');

    const icalString = icalContent.filter((line) => line).join('\r\n');
    const icalBlob = new Blob([icalString], {
      type: 'text/calendar;charset=utf-8',
    });
    const filename = this.generateFilename(timeline, 'ics');

    this.updateProgress('complete', 100, 'iCal export complete!');

    return {
      success: true,
      blob: icalBlob,
      filename,
      size: icalBlob.size,
    };
  }

  // =====================================================
  // GOOGLE CALENDAR EXPORT
  // =====================================================

  private async exportToGoogleCalendar(
    timeline: WeddingTimeline,
    events: TimelineEvent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    // Generate Google Calendar URL for import
    const googleCalendarUrl =
      'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const baseUrl = new URL(googleCalendarUrl);

    // For multiple events, we'll create a downloadable .ics file that can be imported
    const icalResult = await this.exportToICAL(timeline, events, options);

    if (icalResult.success && icalResult.blob) {
      const filename = this.generateFilename(timeline, 'ics');

      return {
        success: true,
        blob: icalResult.blob,
        filename,
        size: icalResult.blob.size,
        downloadUrl: `${googleCalendarUrl}&text=${encodeURIComponent(timeline.name)}`,
      };
    }

    return {
      success: false,
      filename: 'google_calendar_error.txt',
      error: 'Failed to generate Google Calendar export',
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private preprocessEvents(
    events: TimelineEvent[],
    options: ExportOptions,
  ): TimelineEvent[] {
    let processedEvents = [...events];

    // Filter out empty events if option is set
    if (!options.includeEmptyEvents) {
      processedEvents = processedEvents.filter(
        (event) =>
          event.title.trim() !== '' && event.start_time && event.end_time,
      );
    }

    // Apply date range filtering
    if (options.date_range?.start || options.date_range?.end) {
      processedEvents = processedEvents.filter((event) => {
        const eventDate = new Date(event.start_time);
        if (
          options.date_range?.start &&
          eventDate < new Date(options.date_range.start)
        ) {
          return false;
        }
        if (
          options.date_range?.end &&
          eventDate > new Date(options.date_range.end)
        ) {
          return false;
        }
        return true;
      });
    }

    // Apply event type filtering
    if (options.event_types?.length) {
      processedEvents = processedEvents.filter((event) =>
        options.event_types!.includes(event.event_type!),
      );
    }

    // Apply vendor filtering
    if (options.vendor_id) {
      processedEvents = processedEvents.filter((event) =>
        event.vendors?.some((v) => v.vendor_id === options.vendor_id),
      );
    }

    // For client-friendly version, filter out internal/setup events
    if (options.clientFriendlyVersion) {
      processedEvents = processedEvents.filter(
        (event) =>
          ![
            'setup',
            'breakdown',
            'vendor_arrival',
            'vendor_departure',
          ].includes(event.event_type || ''),
      );
    }

    // Sort by start time
    processedEvents.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    // Group by category if option is set
    if (options.groupByCategory) {
      processedEvents = this.groupEventsByCategory(processedEvents);
    }

    return processedEvents;
  }

  private groupEventsByCategory(events: TimelineEvent[]): TimelineEvent[] {
    const grouped = events.reduce(
      (acc, event) => {
        const category = event.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(event);
        return acc;
      },
      {} as Record<string, TimelineEvent[]>,
    );

    // Flatten back to array with category order
    const categoryOrder = [
      'preparation',
      'ceremony',
      'cocktails',
      'reception',
      'party',
      'logistics',
      'other',
    ];
    return categoryOrder.flatMap((category) => grouped[category] || []);
  }

  private getFontSize(size?: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small':
        return 9;
      case 'large':
        return 13;
      default:
        return 11;
    }
  }

  private getPriorityNumber(priority: string): number {
    switch (priority) {
      case 'critical':
        return 1;
      case 'high':
        return 2;
      case 'medium':
        return 5;
      case 'low':
        return 9;
      default:
        return 5;
    }
  }

  private generateFilename(
    timeline: WeddingTimeline,
    extension: string,
  ): string {
    const date = format(parseISO(timeline.wedding_date), 'yyyy-MM-dd');
    const safeName = timeline.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = format(new Date(), 'HHmm');

    return `${safeName}_timeline_${date}_${timestamp}.${extension}`;
  }

  private updateProgress(
    stage: ExportProgress['stage'],
    progress: number,
    message: string,
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        estimatedTimeRemaining:
          progress > 0
            ? Math.round(((100 - progress) / progress) * 1000)
            : undefined,
      });
    }
  }
}

// =====================================================
// EXPORT UTILITIES
// =====================================================

export const createTimelineExportService = (
  progressCallback?: (progress: ExportProgress) => void,
) => {
  return new TimelineExportService(progressCallback);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getExportFormatLabel = (
  format: TimelineExport['format'],
): string => {
  switch (format) {
    case 'pdf':
      return 'PDF Document';
    case 'csv':
      return 'CSV Spreadsheet';
    case 'excel':
      return 'Excel Workbook';
    case 'ical':
      return 'iCal Calendar';
    case 'google':
      return 'Google Calendar';
    default:
      return format.toUpperCase();
  }
};

export const getExportFormatDescription = (
  format: TimelineExport['format'],
): string => {
  switch (format) {
    case 'pdf':
      return 'Professional formatted document with timeline layout, perfect for printing and client sharing';
    case 'csv':
      return 'Comma-separated values file, compatible with Excel and all spreadsheet applications';
    case 'excel':
      return 'Microsoft Excel workbook with multiple sheets, charts, and advanced formatting';
    case 'ical':
      return 'Standard calendar format with reminders, compatible with Apple Calendar, Google Calendar, Outlook';
    case 'google':
      return 'Import directly into Google Calendar with automatic event creation and reminders';
    default:
      return 'Export timeline data';
  }
};

export const getExportVersionDescription = (options: ExportOptions): string => {
  if (options.clientFriendlyVersion) {
    return 'Client-friendly version with clean formatting, no internal notes, and focus on key events';
  } else if (options.vendorDetailedVersion) {
    return 'Vendor detailed version with setup times, contact info, responsibilities, and internal notes';
  }
  return 'Standard version with all timeline information';
};

export const getRecommendedExportOptions = (
  format: TimelineExport['format'],
  userType: 'client' | 'vendor' | 'admin',
): Partial<ExportOptions> => {
  const baseOptions: Partial<ExportOptions> = {
    format,
    include_vendor_details: true,
    include_internal_notes: userType !== 'client',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  switch (userType) {
    case 'client':
      return {
        ...baseOptions,
        clientFriendlyVersion: true,
        includeLocationMaps: true,
        reminderSettings: format === 'ical' || format === 'google',
        printOptimized: format === 'pdf',
      };
    case 'vendor':
      return {
        ...baseOptions,
        vendorDetailedVersion: true,
        includeContactInfo: true,
        showBufferTimes: true,
        include_internal_notes: true,
      };
    case 'admin':
      return {
        ...baseOptions,
        vendorDetailedVersion: true,
        includeContactInfo: true,
        showBufferTimes: true,
        includeStatistics: true,
        include_internal_notes: true,
      };
    default:
      return baseOptions;
  }
};

export const validateExportOptions = (
  options: ExportOptions,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!options.format) {
    errors.push('Export format is required');
  }

  if (!['pdf', 'csv', 'excel', 'ical', 'google'].includes(options.format)) {
    errors.push('Invalid export format');
  }

  if (
    options.fontSize &&
    !['small', 'medium', 'large'].includes(options.fontSize)
  ) {
    errors.push('Invalid font size option');
  }

  if (
    options.pageOrientation &&
    !['portrait', 'landscape'].includes(options.pageOrientation)
  ) {
    errors.push('Invalid page orientation option');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
