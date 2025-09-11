import { createClient } from '@/lib/supabase/server';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

type SupabaseClient = ReturnType<typeof createClient>;

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface ExportOptions {
  format: 'pdf' | 'ics' | 'json' | 'csv';
  include_notes?: boolean;
  include_contact_info?: boolean;
  theme?: 'light' | 'dark' | 'minimal' | 'detailed';
  date_format?: 'short' | 'long' | 'iso';
  timezone?: string;
  language?: 'en' | 'es' | 'fr' | 'de';
}

interface ExportResult {
  success: boolean;
  data?: Buffer | string;
  filename: string;
  content_type: string;
  size_bytes?: number;
  error?: string;
}

interface ScheduleData {
  supplier_id: string;
  supplier_name: string;
  supplier_category: string;
  supplier_contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  timeline_id: string;
  timeline_name: string;
  wedding_date: string;
  schedule_items: ScheduleItem[];
  generated_at: string;
  status: string;
  confirmation_status?: string;
}

interface ScheduleItem {
  event_id: string;
  event_title: string;
  event_description?: string;
  scheduled_arrival: string;
  event_start: string;
  event_end: string;
  scheduled_departure: string;
  location?: string;
  location_details?: string;
  category: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  notes?: string;
  status: string;
  confirmation?: {
    status: 'pending' | 'confirmed' | 'declined' | 'needs_adjustment';
    supplier_notes?: string;
  };
}

// =====================================================
// SCHEDULE EXPORT SERVICE
// =====================================================

export class ScheduleExportService {
  private supabase: SupabaseClient;
  private readonly TEMP_DIR = '/tmp/schedule-exports';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // Main export method
  async exportSchedule(
    supplierId: string,
    timelineId: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      console.log(
        `Exporting schedule in ${options.format} format for supplier ${supplierId}`,
      );

      // Get schedule data
      const scheduleData = await this.getScheduleData(supplierId, timelineId);

      // Ensure temp directory exists
      await this.ensureTempDirectory();

      // Export based on format
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(scheduleData, options);
        case 'ics':
          return await this.exportToICS(scheduleData, options);
        case 'csv':
          return await this.exportToCSV(scheduleData, options);
        case 'json':
          return await this.exportToJSON(scheduleData, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Error exporting schedule:', error);
      return {
        success: false,
        filename: '',
        content_type: '',
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  // Get schedule data from database
  private async getScheduleData(
    supplierId: string,
    timelineId: string,
  ): Promise<ScheduleData> {
    const { data: schedule, error } = await this.supabase
      .from('supplier_schedules')
      .select(
        `
        schedule_data,
        status,
        confirmation_status,
        suppliers:supplier_id (
          business_name,
          primary_category,
          email,
          phone,
          website
        ),
        wedding_timelines:timeline_id (
          timeline_name,
          wedding_date
        )
      `,
      )
      .eq('supplier_id', supplierId)
      .eq('timeline_id', timelineId)
      .single();

    if (error || !schedule) {
      throw new Error('Schedule not found');
    }

    // Transform data to expected format
    return {
      supplier_id: supplierId,
      supplier_name: schedule.suppliers?.business_name || 'Unknown Supplier',
      supplier_category: schedule.suppliers?.primary_category || 'General',
      supplier_contact: {
        email: schedule.suppliers?.email || '',
        phone: schedule.suppliers?.phone,
        website: schedule.suppliers?.website,
      },
      timeline_id: timelineId,
      timeline_name:
        schedule.wedding_timelines?.timeline_name || 'Wedding Timeline',
      wedding_date: schedule.wedding_timelines?.wedding_date || '',
      schedule_items: schedule.schedule_data?.schedule_items || [],
      generated_at:
        schedule.schedule_data?.generated_at || new Date().toISOString(),
      status: schedule.status,
      confirmation_status: schedule.confirmation_status,
    };
  }

  // Ensure temp directory exists
  private async ensureTempDirectory() {
    try {
      await fs.access(this.TEMP_DIR);
    } catch {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    }
  }

  // Export to PDF format
  private async exportToPDF(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const htmlContent = this.generatePDFHTML(scheduleData, options);
      const filename = this.generateFilename(scheduleData, 'pdf');
      const filepath = path.join(this.TEMP_DIR, filename);

      // Launch Puppeteer and generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: filepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      await browser.close();

      // Read the generated PDF
      const pdfBuffer = await fs.readFile(filepath);

      // Clean up temp file
      await fs.unlink(filepath);

      return {
        success: true,
        data: pdfBuffer,
        filename: filename,
        content_type: 'application/pdf',
        size_bytes: pdfBuffer.length,
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Export to ICS calendar format
  private async exportToICS(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const icsContent = this.generateICSContent(scheduleData, options);
      const filename = this.generateFilename(scheduleData, 'ics');

      return {
        success: true,
        data: Buffer.from(icsContent, 'utf-8'),
        filename: filename,
        content_type: 'text/calendar',
        size_bytes: Buffer.byteLength(icsContent, 'utf-8'),
      };
    } catch (error) {
      console.error('Error generating ICS:', error);
      throw new Error(
        `ICS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Export to CSV format
  private async exportToCSV(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const csvContent = this.generateCSVContent(scheduleData, options);
      const filename = this.generateFilename(scheduleData, 'csv');

      return {
        success: true,
        data: Buffer.from(csvContent, 'utf-8'),
        filename: filename,
        content_type: 'text/csv',
        size_bytes: Buffer.byteLength(csvContent, 'utf-8'),
      };
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw new Error(
        `CSV generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Export to JSON format
  private async exportToJSON(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const jsonContent = JSON.stringify(scheduleData, null, 2);
      const filename = this.generateFilename(scheduleData, 'json');

      return {
        success: true,
        data: Buffer.from(jsonContent, 'utf-8'),
        filename: filename,
        content_type: 'application/json',
        size_bytes: Buffer.byteLength(jsonContent, 'utf-8'),
      };
    } catch (error) {
      console.error('Error generating JSON:', error);
      throw new Error(
        `JSON generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Generate PDF HTML content
  private generatePDFHTML(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): string {
    const theme = options.theme || 'light';
    const includeNotes = options.include_notes ?? true;
    const includeContact = options.include_contact_info ?? true;

    const styles = this.getPDFStyles(theme);
    const weddingDate = new Date(scheduleData.wedding_date).toLocaleDateString(
      'en-GB',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    const scheduleRows = scheduleData.schedule_items
      .map((item) => {
        const arrivalTime = new Date(item.scheduled_arrival).toLocaleTimeString(
          'en-GB',
          { hour: '2-digit', minute: '2-digit' },
        );
        const startTime = new Date(item.event_start).toLocaleTimeString(
          'en-GB',
          { hour: '2-digit', minute: '2-digit' },
        );
        const endTime = new Date(item.event_end).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const departureTime = new Date(
          item.scheduled_departure,
        ).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        return `
        <tr>
          <td class="event-title">${item.event_title}</td>
          <td class="time-slot">
            <div class="arrival">Arrive: ${arrivalTime}</div>
            <div class="event-time">${startTime} - ${endTime}</div>
            <div class="departure">Depart: ${departureTime}</div>
          </td>
          <td class="location">${item.location || 'TBD'}</td>
          ${includeNotes ? `<td class="notes">${item.notes || ''}</td>` : ''}
        </tr>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Wedding Schedule - ${scheduleData.supplier_name}</title>
        <style>${styles}</style>
      </head>
      <body>
        <header>
          <div class="header-content">
            <div class="wedding-info">
              <h1>${scheduleData.timeline_name}</h1>
              <p class="wedding-date">${weddingDate}</p>
            </div>
            <div class="supplier-info">
              <h2>${scheduleData.supplier_name}</h2>
              <p class="supplier-category">${scheduleData.supplier_category}</p>
              ${
                includeContact
                  ? `
                <div class="contact-info">
                  <p>📧 ${scheduleData.supplier_contact.email}</p>
                  ${scheduleData.supplier_contact.phone ? `<p>📞 ${scheduleData.supplier_contact.phone}</p>` : ''}
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </header>

        <main>
          <div class="schedule-summary">
            <div class="summary-item">
              <span class="label">Total Events:</span>
              <span class="value">${scheduleData.schedule_items.length}</span>
            </div>
            <div class="summary-item">
              <span class="label">First Arrival:</span>
              <span class="value">${scheduleData.schedule_items.length > 0 ? new Date(scheduleData.schedule_items[0].scheduled_arrival).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
            </div>
            <div class="summary-item">
              <span class="label">Last Departure:</span>
              <span class="value">${scheduleData.schedule_items.length > 0 ? new Date(scheduleData.schedule_items[scheduleData.schedule_items.length - 1].scheduled_departure).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
            </div>
            <div class="summary-item">
              <span class="label">Status:</span>
              <span class="value status-${scheduleData.status}">${this.formatStatus(scheduleData.status)}</span>
            </div>
          </div>

          <div class="schedule-table-container">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Timing</th>
                  <th>Location</th>
                  ${includeNotes ? '<th>Notes</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${scheduleRows}
              </tbody>
            </table>
          </div>

          <div class="footer-notes">
            <h3>Important Notes:</h3>
            <ul>
              <li>Please arrive at the specified times to allow for setup</li>
              <li>Contact the wedding coordinator if you need to make any changes</li>
              <li>Keep this schedule handy on the wedding day</li>
              <li>Generated on ${new Date().toLocaleDateString('en-GB')}</li>
            </ul>
          </div>
        </main>
      </body>
      </html>
    `;
  }

  // Get PDF styles based on theme
  private getPDFStyles(theme: string): string {
    const baseStyles = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: ${theme === 'dark' ? '#ffffff' : '#333333'};
        background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      }
      
      header {
        border-bottom: 3px solid #007bff;
        padding: 20px 0;
        margin-bottom: 30px;
      }
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      
      .wedding-info h1 {
        font-size: 24px;
        color: #007bff;
        margin-bottom: 5px;
      }
      
      .wedding-date {
        font-size: 16px;
        font-weight: bold;
        color: #666;
      }
      
      .supplier-info {
        text-align: right;
      }
      
      .supplier-info h2 {
        font-size: 18px;
        margin-bottom: 5px;
      }
      
      .supplier-category {
        font-style: italic;
        color: #666;
        margin-bottom: 10px;
      }
      
      .contact-info p {
        margin: 2px 0;
        font-size: 11px;
      }
      
      .schedule-summary {
        display: flex;
        justify-content: space-around;
        background-color: ${theme === 'dark' ? '#333333' : '#f8f9fa'};
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .summary-item {
        text-align: center;
      }
      
      .summary-item .label {
        display: block;
        font-weight: bold;
        color: #666;
        font-size: 11px;
      }
      
      .summary-item .value {
        display: block;
        font-size: 14px;
        margin-top: 5px;
      }
      
      .status-confirmed { color: #28a745; }
      .status-pending { color: #ffc107; }
      .status-needs_review { color: #dc3545; }
      
      .schedule-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      
      .schedule-table th,
      .schedule-table td {
        border: 1px solid ${theme === 'dark' ? '#555555' : '#dee2e6'};
        padding: 12px;
        text-align: left;
        vertical-align: top;
      }
      
      .schedule-table th {
        background-color: ${theme === 'dark' ? '#444444' : '#f8f9fa'};
        font-weight: bold;
      }
      
      .event-title {
        font-weight: bold;
        color: #007bff;
      }
      
      .time-slot .arrival,
      .time-slot .departure {
        font-size: 10px;
        color: #666;
      }
      
      .time-slot .event-time {
        font-weight: bold;
        margin: 5px 0;
      }
      
      .location {
        font-style: italic;
      }
      
      .notes {
        font-size: 10px;
        color: #666;
      }
      
      .footer-notes {
        background-color: ${theme === 'dark' ? '#333333' : '#f8f9fa'};
        padding: 20px;
        border-radius: 8px;
        margin-top: 30px;
      }
      
      .footer-notes h3 {
        margin-bottom: 15px;
        color: #007bff;
      }
      
      .footer-notes ul {
        padding-left: 20px;
      }
      
      .footer-notes li {
        margin-bottom: 8px;
      }
    `;

    return baseStyles;
  }

  // Generate ICS calendar content
  private generateICSContent(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): string {
    const timezone = options.timezone || 'Europe/London';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Supplier Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${scheduleData.supplier_name} - ${scheduleData.timeline_name}`,
      `X-WR-CALDESC:Wedding day schedule for ${scheduleData.supplier_name}`,
      `X-WR-TIMEZONE:${timezone}`,
    ];

    scheduleData.schedule_items.forEach((item, index) => {
      const startDate = new Date(item.scheduled_arrival);
      const endDate = new Date(item.scheduled_departure);
      const eventStart = new Date(item.event_start);
      const eventEnd = new Date(item.event_end);

      // Main event
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:wedsync-${scheduleData.supplier_id}-${item.event_id}@wedsync.app`,
        `DTSTART:${this.formatICSDate(eventStart)}`,
        `DTEND:${this.formatICSDate(eventEnd)}`,
        `SUMMARY:${this.escapeICS(item.event_title)}`,
        `DESCRIPTION:${this.escapeICS(item.event_description || item.notes || '')}`,
        `LOCATION:${this.escapeICS(item.location || '')}`,
        `STATUS:${item.confirmation?.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
        `CATEGORIES:${this.escapeICS(item.category)}`,
        `CREATED:${this.formatICSDate(new Date())}`,
        `LAST-MODIFIED:${this.formatICSDate(new Date())}`,
        'END:VEVENT',
      );

      // Arrival reminder
      if (startDate < eventStart) {
        icsContent.push(
          'BEGIN:VEVENT',
          `UID:wedsync-arrival-${scheduleData.supplier_id}-${item.event_id}@wedsync.app`,
          `DTSTART:${this.formatICSDate(startDate)}`,
          `DTEND:${this.formatICSDate(eventStart)}`,
          `SUMMARY:Arrival & Setup - ${this.escapeICS(item.event_title)}`,
          `DESCRIPTION:Arrival and setup time for ${this.escapeICS(item.event_title)}`,
          `LOCATION:${this.escapeICS(item.location || '')}`,
          'STATUS:TENTATIVE',
          'CATEGORIES:Setup',
          `CREATED:${this.formatICSDate(new Date())}`,
          `LAST-MODIFIED:${this.formatICSDate(new Date())}`,
          'END:VEVENT',
        );
      }
    });

    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  // Generate CSV content
  private generateCSVContent(
    scheduleData: ScheduleData,
    options: ExportOptions,
  ): string {
    const headers = [
      'Event Title',
      'Event Description',
      'Arrival Time',
      'Event Start',
      'Event End',
      'Departure Time',
      'Location',
      'Category',
      'Duration (minutes)',
      'Status',
    ];

    if (options.include_notes) {
      headers.push('Notes');
    }

    const csvRows = [headers.join(',')];

    scheduleData.schedule_items.forEach((item) => {
      const row = [
        this.escapeCSV(item.event_title),
        this.escapeCSV(item.event_description || ''),
        this.formatDateForCSV(new Date(item.scheduled_arrival)),
        this.formatDateForCSV(new Date(item.event_start)),
        this.formatDateForCSV(new Date(item.event_end)),
        this.formatDateForCSV(new Date(item.scheduled_departure)),
        this.escapeCSV(item.location || ''),
        this.escapeCSV(item.category),
        item.duration_minutes.toString(),
        this.escapeCSV(item.status),
      ];

      if (options.include_notes) {
        row.push(this.escapeCSV(item.notes || ''));
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Helper methods for formatting
  private generateFilename(
    scheduleData: ScheduleData,
    extension: string,
  ): string {
    const date = scheduleData.wedding_date.replace(/[^\d]/g, '');
    const supplier = scheduleData.supplier_name
      .replace(/[^\w]/g, '_')
      .toLowerCase();
    return `wedding_schedule_${supplier}_${date}.${extension}`;
  }

  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private formatDateForCSV(date: Date): string {
    return date.toISOString();
  }

  private escapeICS(text: string): string {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  }

  private escapeCSV(text: string): string {
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  // Static method to create service instance
  static async create(): Promise<ScheduleExportService> {
    const supabase = await createClient();
    return new ScheduleExportService(supabase);
  }

  // Static helper for quick exports
  static async quickExport(
    supplierId: string,
    timelineId: string,
    format: 'pdf' | 'ics' | 'json' | 'csv',
    options: Partial<ExportOptions> = {},
  ): Promise<ExportResult> {
    const service = await ScheduleExportService.create();
    return service.exportSchedule(supplierId, timelineId, {
      format,
      ...options,
    });
  }
}

export default ScheduleExportService;
