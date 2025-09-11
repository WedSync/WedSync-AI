import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

/**
 * Timeline Export Functionality Testing
 * Tests export capabilities across PDF, CSV, JSON, Excel, and other formats
 */

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  duration: number;
  type: string;
  location?: string;
  assignedTo?: string[];
  resources?: string[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineExportOptions {
  format: 'pdf' | 'csv' | 'json' | 'excel' | 'ical' | 'xml';
  includeDrafts?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  eventTypes?: string[];
  customFields?: string[];
  template?: string;
}

interface ExportResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  format: string;
  recordCount: number;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    exportedAt: string;
    exportedBy?: string;
    filters?: any;
  };
}

// Mock Timeline Export Engine
class TimelineExportEngine {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'test-results', 'exports');
    this.ensureOutputDirectory();
  }

  async exportTimeline(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    try {
      const filteredEvents = this.filterEvents(events, options);
      
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(filteredEvents, options);
        case 'csv':
          return await this.exportToCSV(filteredEvents, options);
        case 'json':
          return await this.exportToJSON(filteredEvents, options);
        case 'excel':
          return await this.exportToExcel(filteredEvents, options);
        case 'ical':
          return await this.exportToICal(filteredEvents, options);
        case 'xml':
          return await this.exportToXML(filteredEvents, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        format: options.format,
        recordCount: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private filterEvents(events: TimelineEvent[], options: TimelineExportOptions): TimelineEvent[] {
    let filtered = [...events];

    // Filter by date range
    if (options.dateRange) {
      const startDate = new Date(options.dateRange.start).getTime();
      const endDate = new Date(options.dateRange.end).getTime();
      
      filtered = filtered.filter(event => {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();
        return eventStart >= startDate && eventEnd <= endDate;
      });
    }

    // Filter by event types
    if (options.eventTypes && options.eventTypes.length > 0) {
      filtered = filtered.filter(event => options.eventTypes!.includes(event.type));
    }

    // Filter drafts if needed
    if (!options.includeDrafts) {
      filtered = filtered.filter(event => event.status !== 'pending');
    }

    return filtered;
  }

  private async exportToPDF(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    const doc = new jsPDF();
    const fileName = `timeline-export-${Date.now()}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    // Title
    doc.setFontSize(16);
    doc.text('Wedding Timeline Export', 20, 20);
    
    // Metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`Total Events: ${events.length}`, 20, 35);

    // Events
    let yPosition = 50;
    doc.setFontSize(12);
    
    events.forEach((event, index) => {
      if (yPosition > 270) { // New page if needed
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`${index + 1}. ${event.title}`, 20, yPosition);
      doc.setFontSize(10);
      doc.text(`Time: ${event.start} - ${event.end}`, 30, yPosition + 5);
      
      if (event.location) {
        doc.text(`Location: ${event.location}`, 30, yPosition + 10);
        yPosition += 15;
      } else {
        yPosition += 10;
      }
      
      doc.setFontSize(12);
      yPosition += 10;
    });

    // Save PDF
    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

    return {
      success: true,
      filePath,
      fileSize: fs.statSync(filePath).size,
      format: 'pdf',
      recordCount: events.length,
      metadata: {
        exportedAt: new Date().toISOString()
      }
    };
  }

  private async exportToCSV(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    const fileName = `timeline-export-${Date.now()}.csv`;
    const filePath = path.join(this.outputDir, fileName);

    const headers = [
      { id: 'id', title: 'ID' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'start', title: 'Start Time' },
      { id: 'end', title: 'End Time' },
      { id: 'duration', title: 'Duration (mins)' },
      { id: 'type', title: 'Type' },
      { id: 'location', title: 'Location' },
      { id: 'status', title: 'Status' },
      { id: 'priority', title: 'Priority' },
      { id: 'assignedTo', title: 'Assigned To' },
      { id: 'tags', title: 'Tags' },
      { id: 'notes', title: 'Notes' }
    ];

    // Add custom fields if specified
    if (options.customFields) {
      options.customFields.forEach(field => {
        headers.push({ id: field, title: field });
      });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    // Transform events for CSV
    const csvData = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      start: event.start,
      end: event.end,
      duration: event.duration,
      type: event.type,
      location: event.location || '',
      status: event.status,
      priority: event.priority,
      assignedTo: event.assignedTo?.join(', ') || '',
      tags: event.tags?.join(', ') || '',
      notes: event.notes || '',
      ...options.customFields?.reduce((acc, field) => ({ ...acc, [field]: '' }), {})
    }));

    await csvWriter.writeRecords(csvData);

    return {
      success: true,
      filePath,
      fileSize: fs.statSync(filePath).size,
      format: 'csv',
      recordCount: events.length,
      metadata: {
        exportedAt: new Date().toISOString(),
        filters: options
      }
    };
  }

  private async exportToJSON(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    const fileName = `timeline-export-${Date.now()}.json`;
    const filePath = path.join(this.outputDir, fileName);

    const jsonData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalEvents: events.length,
        format: 'json',
        version: '1.0',
        filters: options
      },
      timeline: {
        events: events,
        summary: {
          totalDuration: events.reduce((sum, event) => sum + event.duration, 0),
          eventTypes: [...new Set(events.map(e => e.type))],
          statusBreakdown: this.getStatusBreakdown(events),
          priorityBreakdown: this.getPriorityBreakdown(events)
        }
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

    return {
      success: true,
      filePath,
      fileSize: fs.statSync(filePath).size,
      format: 'json',
      recordCount: events.length,
      metadata: jsonData.metadata
    };
  }

  private async exportToExcel(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    const fileName = `timeline-export-${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, fileName);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Events sheet
    const eventsSheet = XLSX.utils.json_to_sheet(events.map(event => ({
      ID: event.id,
      Title: event.title,
      Description: event.description || '',
      'Start Time': event.start,
      'End Time': event.end,
      'Duration (mins)': event.duration,
      Type: event.type,
      Location: event.location || '',
      Status: event.status,
      Priority: event.priority,
      'Assigned To': event.assignedTo?.join(', ') || '',
      Tags: event.tags?.join(', ') || '',
      Notes: event.notes || '',
      'Created At': event.createdAt,
      'Updated At': event.updatedAt
    })));

    XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Timeline Events');

    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Events', events.length],
      ['Total Duration', `${events.reduce((sum, event) => sum + event.duration, 0)} minutes`],
      ['Event Types', [...new Set(events.map(e => e.type))].join(', ')],
      ['Export Date', new Date().toLocaleString()],
      ['Export Format', 'Excel (.xlsx)']
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Status breakdown sheet
    const statusBreakdown = this.getStatusBreakdown(events);
    const statusData = [
      ['Status', 'Count', 'Percentage'],
      ...Object.entries(statusBreakdown).map(([status, count]) => [
        status,
        count,
        `${((count / events.length) * 100).toFixed(1)}%`
      ])
    ];

    const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Breakdown');

    // Write file
    XLSX.writeFile(workbook, filePath);

    return {
      success: true,
      filePath,
      fileSize: fs.statSync(filePath).size,
      format: 'excel',
      recordCount: events.length,
      metadata: {
        exportedAt: new Date().toISOString(),
        sheets: ['Timeline Events', 'Summary', 'Status Breakdown']
      }
    };
  }

  private async exportToICal(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    const fileName = `timeline-export-${Date.now()}.ics`;
    const filePath = path.join(this.outputDir, fileName);

    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Timeline Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    events.forEach(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      const eventContent = [
        'BEGIN:VEVENT',
        `UID:${event.id}@wedsync.com`,
        `DTSTART:${this.formatICalDate(startDate)}`,
        `DTEND:${this.formatICalDate(endDate)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ''}`,
        `LOCATION:${event.location || ''}`,
        `STATUS:${event.status.toUpperCase()}`,
        `PRIORITY:${event.priority === 'high' ? '1' : event.priority === 'medium' ? '5' : '9'}`,
        `CREATED:${this.formatICalDate(new Date(event.createdAt))}`,
        `LAST-MODIFIED:${this.formatICalDate(new Date(event.updatedAt))}`,
        'END:VEVENT'
      ].join('\r\n');
      
      icalContent += '\r\n' + eventContent;
    });

    icalContent += '\r\nEND:VCALENDAR';

    fs.writeFileSync(filePath, icalContent);

    return {
      success: true,
      filePath,
      fileSize: fs.statSync(filePath).size,
      format: 'ical',
      recordCount: events.length,
      metadata: {
        exportedAt: new Date().toISOString()
      }
    };
  }

  private async exportToXML(events: TimelineEvent[], options: TimelineExportOptions): Promise<ExportResult> {
    const fileName = `timeline-export-${Date.now()}.xml`;
    const filePath = path.join(this.outputDir, fileName);

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<timeline>\n';
    xmlContent += `  <metadata>\n`;
    xmlContent += `    <exportedAt>${new Date().toISOString()}</exportedAt>\n`;
    xmlContent += `    <totalEvents>${events.length}</totalEvents>\n`;
    xmlContent += `    <format>xml</format>\n`;
    xmlContent += `  </metadata>\n`;
    xmlContent += `  <events>\n`;

    events.forEach(event => {
      xmlContent += `    <event id="${event.id}">\n`;
      xmlContent += `      <title><![CDATA[${event.title}]]></title>\n`;
      xmlContent += `      <description><![CDATA[${event.description || ''}]]></description>\n`;
      xmlContent += `      <start>${event.start}</start>\n`;
      xmlContent += `      <end>${event.end}</end>\n`;
      xmlContent += `      <duration>${event.duration}</duration>\n`;
      xmlContent += `      <type>${event.type}</type>\n`;
      xmlContent += `      <location><![CDATA[${event.location || ''}]]></location>\n`;
      xmlContent += `      <status>${event.status}</status>\n`;
      xmlContent += `      <priority>${event.priority}</priority>\n`;
      
      if (event.assignedTo && event.assignedTo.length > 0) {
        xmlContent += `      <assignedTo>\n`;
        event.assignedTo.forEach(person => {
          xmlContent += `        <person><![CDATA[${person}]]></person>\n`;
        });
        xmlContent += `      </assignedTo>\n`;
      }
      
      if (event.tags && event.tags.length > 0) {
        xmlContent += `      <tags>\n`;
        event.tags.forEach(tag => {
          xmlContent += `        <tag><![CDATA[${tag}]]></tag>\n`;
        });
        xmlContent += `      </tags>\n`;
      }
      
      xmlContent += `      <createdAt>${event.createdAt}</createdAt>\n`;
      xmlContent += `      <updatedAt>${event.updatedAt}</updatedAt>\n`;
      xmlContent += `    </event>\n`;
    });

    xmlContent += `  </events>\n`;
    xmlContent += `</timeline>\n`;

    fs.writeFileSync(filePath, xmlContent);

    return {
      success: true,
      filePath,
      fileSize: fs.statSync(filePath).size,
      format: 'xml',
      recordCount: events.length,
      metadata: {
        exportedAt: new Date().toISOString()
      }
    };
  }

  private getStatusBreakdown(events: TimelineEvent[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    events.forEach(event => {
      breakdown[event.status] = (breakdown[event.status] || 0) + 1;
    });
    return breakdown;
  }

  private getPriorityBreakdown(events: TimelineEvent[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    events.forEach(event => {
      breakdown[event.priority] = (breakdown[event.priority] || 0) + 1;
    });
    return breakdown;
  }

  private formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  cleanup(): void {
    // Clean up test files
    if (fs.existsSync(this.outputDir)) {
      fs.readdirSync(this.outputDir).forEach(file => {
        fs.unlinkSync(path.join(this.outputDir, file));
      });
    }
  }
}

// Test data
const createTestEvents = (): TimelineEvent[] => [
  {
    id: 'event-1',
    title: 'Bridal Preparation',
    description: 'Hair, makeup, and dress preparation for the bride',
    start: '2024-06-15T08:00:00Z',
    end: '2024-06-15T11:00:00Z',
    duration: 180,
    type: 'preparation',
    location: 'Bridal Suite',
    assignedTo: ['Makeup Artist', 'Hair Stylist'],
    resources: ['makeup-kit', 'styling-tools'],
    status: 'confirmed',
    priority: 'high',
    tags: ['bridal', 'preparation', 'beauty'],
    notes: 'Start with hair, then makeup',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z'
  },
  {
    id: 'event-2',
    title: 'Wedding Ceremony',
    description: 'The main wedding ceremony',
    start: '2024-06-15T16:00:00Z',
    end: '2024-06-15T17:00:00Z',
    duration: 60,
    type: 'ceremony',
    location: 'Main Chapel',
    assignedTo: ['Officiant', 'Photographer'],
    resources: ['altar', 'microphones', 'chairs'],
    status: 'confirmed',
    priority: 'high',
    tags: ['ceremony', 'main-event'],
    notes: 'Ring exchange at 16:30',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-25T12:00:00Z'
  },
  {
    id: 'event-3',
    title: 'Reception Dinner',
    description: 'Wedding reception with dinner service',
    start: '2024-06-15T18:00:00Z',
    end: '2024-06-15T22:00:00Z',
    duration: 240,
    type: 'reception',
    location: 'Grand Ballroom',
    assignedTo: ['Catering Manager', 'DJ'],
    resources: ['tables', 'sound-system', 'catering'],
    status: 'confirmed',
    priority: 'high',
    tags: ['reception', 'dinner', 'entertainment'],
    notes: 'First dance at 19:30',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-02-01T09:15:00Z'
  },
  {
    id: 'event-4',
    title: 'Photography Session',
    description: 'Couple and family photo session',
    start: '2024-06-15T14:00:00Z',
    end: '2024-06-15T15:30:00Z',
    duration: 90,
    type: 'photography',
    location: 'Garden Area',
    assignedTo: ['Wedding Photographer'],
    resources: ['camera-equipment', 'lighting'],
    status: 'pending',
    priority: 'medium',
    tags: ['photography', 'couple', 'family'],
    notes: 'Weather backup plan needed',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-18T14:20:00Z'
  },
  {
    id: 'event-5',
    title: 'Cleanup and Breakdown',
    description: 'Post-event cleanup and equipment breakdown',
    start: '2024-06-15T23:00:00Z',
    end: '2024-06-16T01:00:00Z',
    duration: 120,
    type: 'cleanup',
    location: 'All Venues',
    assignedTo: ['Cleanup Crew'],
    resources: ['cleaning-supplies', 'transport'],
    status: 'confirmed',
    priority: 'low',
    tags: ['cleanup', 'breakdown'],
    notes: 'Return all rented items',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T11:45:00Z'
  }
];

describe('Timeline Export Functionality Testing', () => {
  let exportEngine: TimelineExportEngine;
  let testEvents: TimelineEvent[];

  beforeEach(() => {
    exportEngine = new TimelineExportEngine();
    testEvents = createTestEvents();
  });

  afterEach(() => {
    exportEngine.cleanup();
  });

  describe('PDF Export', () => {
    it('should export timeline to PDF format', async () => {
      const options: TimelineExportOptions = {
        format: 'pdf',
        includeDrafts: true
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.recordCount).toBe(testEvents.length);
      expect(result.filePath).toBeTruthy();
      expect(result.fileSize).toBeGreaterThan(0);
      expect(fs.existsSync(result.filePath!)).toBe(true);
    });

    it('should handle filtered PDF export', async () => {
      const options: TimelineExportOptions = {
        format: 'pdf',
        eventTypes: ['ceremony', 'reception'],
        includeDrafts: false
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2); // Only confirmed ceremony and reception
    });
  });

  describe('CSV Export', () => {
    it('should export timeline to CSV format', async () => {
      const options: TimelineExportOptions = {
        format: 'csv',
        customFields: ['custom1', 'custom2']
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.recordCount).toBe(testEvents.length);
      expect(result.filePath).toBeTruthy();
      expect(result.fileSize).toBeGreaterThan(0);

      // Verify CSV content
      const csvContent = fs.readFileSync(result.filePath!, 'utf8');
      expect(csvContent).toContain('ID,Title,Description');
      expect(csvContent).toContain('Bridal Preparation');
      expect(csvContent).toContain('Wedding Ceremony');
    });

    it('should handle date range filtering in CSV export', async () => {
      const options: TimelineExportOptions = {
        format: 'csv',
        dateRange: {
          start: '2024-06-15T15:00:00Z',
          end: '2024-06-15T20:00:00Z'
        }
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(3); // Ceremony, Photography, Reception
    });
  });

  describe('JSON Export', () => {
    it('should export timeline to JSON format with metadata', async () => {
      const options: TimelineExportOptions = {
        format: 'json',
        includeDrafts: true
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(testEvents.length);

      // Verify JSON structure
      const jsonContent = JSON.parse(fs.readFileSync(result.filePath!, 'utf8'));
      expect(jsonContent.metadata).toBeTruthy();
      expect(jsonContent.timeline.events).toHaveLength(testEvents.length);
      expect(jsonContent.timeline.summary).toBeTruthy();
      expect(jsonContent.timeline.summary.totalDuration).toBeGreaterThan(0);
    });

    it('should include proper summary data in JSON export', async () => {
      const options: TimelineExportOptions = {
        format: 'json'
      };

      const result = await exportEngine.exportTimeline(testEvents, options);
      const jsonContent = JSON.parse(fs.readFileSync(result.filePath!, 'utf8'));

      expect(jsonContent.timeline.summary.eventTypes).toContain('ceremony');
      expect(jsonContent.timeline.summary.eventTypes).toContain('preparation');
      expect(jsonContent.timeline.summary.statusBreakdown).toBeTruthy();
      expect(jsonContent.timeline.summary.priorityBreakdown).toBeTruthy();
    });
  });

  describe('Excel Export', () => {
    it('should export timeline to Excel format with multiple sheets', async () => {
      const options: TimelineExportOptions = {
        format: 'excel'
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('excel');
      expect(result.recordCount).toBe(testEvents.length);
      expect(result.metadata?.sheets).toContain('Timeline Events');
      expect(result.metadata?.sheets).toContain('Summary');
      expect(result.metadata?.sheets).toContain('Status Breakdown');

      // Verify file exists and has content
      expect(fs.existsSync(result.filePath!)).toBe(true);
      expect(result.fileSize).toBeGreaterThan(1000); // Excel files are typically larger
    });
  });

  describe('iCal Export', () => {
    it('should export timeline to iCal format', async () => {
      const options: TimelineExportOptions = {
        format: 'ical'
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('ical');
      expect(result.recordCount).toBe(testEvents.length);

      // Verify iCal format
      const icalContent = fs.readFileSync(result.filePath!, 'utf8');
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('END:VEVENT');
      expect(icalContent).toContain('SUMMARY:Bridal Preparation');
    });
  });

  describe('XML Export', () => {
    it('should export timeline to XML format', async () => {
      const options: TimelineExportOptions = {
        format: 'xml'
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe('xml');
      expect(result.recordCount).toBe(testEvents.length);

      // Verify XML structure
      const xmlContent = fs.readFileSync(result.filePath!, 'utf8');
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<timeline>');
      expect(xmlContent).toContain('</timeline>');
      expect(xmlContent).toContain('<metadata>');
      expect(xmlContent).toContain('<events>');
      expect(xmlContent).toContain('Bridal Preparation');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported export format', async () => {
      const options: TimelineExportOptions = {
        format: 'unsupported' as any
      };

      const result = await exportEngine.exportTimeline(testEvents, options);

      expect(result.success).toBe(false);
      expect(result.errors).toBeTruthy();
      expect(result.errors![0]).toContain('Unsupported export format');
    });

    it('should handle empty event list', async () => {
      const options: TimelineExportOptions = {
        format: 'json'
      };

      const result = await exportEngine.exportTimeline([], options);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
    });
  });

  describe('Performance Testing', () => {
    it('should handle large dataset export efficiently', async () => {
      // Generate large dataset
      const largeEventSet: TimelineEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        largeEventSet.push({
          ...testEvents[0],
          id: `large-event-${i}`,
          title: `Large Event ${i}`,
          start: new Date(Date.now() + i * 60 * 1000).toISOString(),
          end: new Date(Date.now() + (i + 1) * 60 * 1000).toISOString()
        });
      }

      const options: TimelineExportOptions = {
        format: 'csv'
      };

      const startTime = performance.now();
      const result = await exportEngine.exportTimeline(largeEventSet, options);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1000);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.fileSize).toBeGreaterThan(50000); // Should be substantial file
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all event data in JSON export', async () => {
      const options: TimelineExportOptions = {
        format: 'json'
      };

      const result = await exportEngine.exportTimeline(testEvents, options);
      const jsonContent = JSON.parse(fs.readFileSync(result.filePath!, 'utf8'));

      const exportedEvents = jsonContent.timeline.events;
      
      // Verify all original events are present
      testEvents.forEach(originalEvent => {
        const exportedEvent = exportedEvents.find((e: any) => e.id === originalEvent.id);
        expect(exportedEvent).toBeTruthy();
        expect(exportedEvent.title).toBe(originalEvent.title);
        expect(exportedEvent.start).toBe(originalEvent.start);
        expect(exportedEvent.end).toBe(originalEvent.end);
        expect(exportedEvent.status).toBe(originalEvent.status);
      });
    });

    it('should maintain data types and formatting', async () => {
      const options: TimelineExportOptions = {
        format: 'json'
      };

      const result = await exportEngine.exportTimeline(testEvents, options);
      const jsonContent = JSON.parse(fs.readFileSync(result.filePath!, 'utf8'));

      const firstEvent = jsonContent.timeline.events[0];
      expect(typeof firstEvent.duration).toBe('number');
      expect(Array.isArray(firstEvent.assignedTo)).toBe(true);
      expect(Array.isArray(firstEvent.tags)).toBe(true);
      expect(typeof firstEvent.start).toBe('string');
      expect(new Date(firstEvent.start).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Export Options Validation', () => {
    it('should respect event type filtering', async () => {
      const options: TimelineExportOptions = {
        format: 'json',
        eventTypes: ['ceremony']
      };

      const result = await exportEngine.exportTimeline(testEvents, options);
      const jsonContent = JSON.parse(fs.readFileSync(result.filePath!, 'utf8'));

      expect(result.recordCount).toBe(1);
      expect(jsonContent.timeline.events).toHaveLength(1);
      expect(jsonContent.timeline.events[0].type).toBe('ceremony');
    });

    it('should exclude drafts when specified', async () => {
      const options: TimelineExportOptions = {
        format: 'json',
        includeDrafts: false
      };

      const result = await exportEngine.exportTimeline(testEvents, options);
      const jsonContent = JSON.parse(fs.readFileSync(result.filePath!, 'utf8'));

      // Should exclude the 'pending' status event
      expect(result.recordCount).toBe(4);
      jsonContent.timeline.events.forEach((event: any) => {
        expect(event.status).not.toBe('pending');
      });
    });
  });
});