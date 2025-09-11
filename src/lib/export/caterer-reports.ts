/**
 * Caterer Reports Export Processing Engine
 * Generates professional kitchen-ready documents for dietary requirements
 *
 * Supports:
 * - PDF kitchen cards with clear allergen warnings
 * - Excel matrices for dietary analysis
 * - Print-optimized formatting
 * - Bulk export processing
 */

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { AlertSeverity } from '../alerts/dietary-alerts';

// Export format types
export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  PRINT = 'PRINT',
}

// Kitchen card layout options
export enum CardLayout {
  STANDARD = 'STANDARD', // Regular kitchen card
  ALLERGEN_FOCUS = 'ALLERGEN', // Emphasizes allergens
  COMPACT = 'COMPACT', // Space-saving format
  DETAILED = 'DETAILED', // Full medical information
}

// Guest dietary information schema
const GuestDietaryInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  table: z.string().optional(),
  mealChoice: z.string().optional(),
  restrictions: z.array(
    z.object({
      type: z.string(),
      severity: z.nativeEnum(AlertSeverity),
      notes: z.string().optional(),
    }),
  ),
  allergies: z.array(
    z.object({
      allergen: z.string(),
      severity: z.nativeEnum(AlertSeverity),
      requiresEpipen: z.boolean().default(false),
      crossContaminationRisk: z.boolean().default(false),
    }),
  ),
  preferences: z.array(z.string()),
  medicalNotes: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
    })
    .optional(),
  specialInstructions: z.string().optional(),
});

export type GuestDietaryInfo = z.infer<typeof GuestDietaryInfoSchema>;

// Export configuration
const ExportConfigSchema = z.object({
  format: z.nativeEnum(ExportFormat),
  layout: z.nativeEnum(CardLayout).default(CardLayout.STANDARD),
  includeEmergencyContacts: z.boolean().default(true),
  includePhotos: z.boolean().default(false),
  groupByTable: z.boolean().default(true),
  highlightCritical: z.boolean().default(true),
  language: z.string().default('en'),
  paperSize: z.enum(['A4', 'Letter', 'A5']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  marginSize: z.number().default(10),
  fontSize: z.number().default(12),
  colorScheme: z.enum(['color', 'grayscale', 'high-contrast']).default('color'),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

export class CatererReportExporter {
  private readonly criticalAllergens = [
    'peanut',
    'tree nut',
    'milk',
    'egg',
    'wheat',
    'soy',
    'fish',
    'shellfish',
    'sesame',
  ];

  private readonly severityColors = {
    [AlertSeverity.LIFE_THREATENING]: '#FF0000',
    [AlertSeverity.CRITICAL]: '#FF6600',
    [AlertSeverity.HIGH]: '#FFA500',
    [AlertSeverity.MEDIUM]: '#FFD700',
    [AlertSeverity.LOW]: '#90EE90',
  };

  /**
   * Generate kitchen cards PDF
   */
  async generateKitchenCardsPDF(
    guests: GuestDietaryInfo[],
    eventDetails: any,
    config: ExportConfig,
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.paperSize.toLowerCase() as any,
    });

    // Set document properties
    pdf.setProperties({
      title: `Kitchen Cards - ${eventDetails.eventName}`,
      subject: 'Dietary Requirements and Allergen Information',
      author: 'WedSync Catering Module',
      keywords: 'dietary, allergen, kitchen, catering',
      creator: 'WedSync',
    });

    // Add header
    this.addPDFHeader(pdf, eventDetails, config);

    // Group guests by table if requested
    const guestGroups = config.groupByTable
      ? this.groupGuestsByTable(guests)
      : { 'All Guests': guests };

    let currentPage = 1;
    let yPosition = 40;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = config.marginSize;

    // Generate cards for each guest
    for (const [group, groupGuests] of Object.entries(guestGroups)) {
      // Add group header
      if (config.groupByTable) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Table: ${group}`, margin, yPosition);
        yPosition += 10;
      }

      for (const guest of groupGuests) {
        const cardHeight = this.calculateCardHeight(guest, config);

        // Check if we need a new page
        if (yPosition + cardHeight > pageHeight - margin) {
          pdf.addPage();
          currentPage++;
          yPosition = margin + 20;
          this.addPDFHeader(pdf, eventDetails, config);
        }

        // Draw the kitchen card
        this.drawKitchenCard(pdf, guest, margin, yPosition, config);
        yPosition += cardHeight + 5;
      }
    }

    // Add footer with emergency information
    this.addPDFFooter(pdf, eventDetails, config);

    return pdf.output('blob');
  }

  /**
   * Draw individual kitchen card
   */
  private drawKitchenCard(
    pdf: jsPDF,
    guest: GuestDietaryInfo,
    x: number,
    y: number,
    config: ExportConfig,
  ): void {
    const cardWidth = pdf.internal.pageSize.width - 2 * config.marginSize;
    const padding = 3;

    // Card border - highlight critical allergies
    const hasLifeThreatening = guest.allergies.some(
      (a) => a.severity === AlertSeverity.LIFE_THREATENING,
    );

    if (hasLifeThreatening && config.highlightCritical) {
      pdf.setDrawColor(255, 0, 0);
      pdf.setLineWidth(2);
    } else {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
    }

    const cardHeight = this.calculateCardHeight(guest, config);
    pdf.rect(x, y, cardWidth, cardHeight);

    // Guest name
    pdf.setFontSize(config.fontSize + 2);
    pdf.setFont('helvetica', 'bold');
    pdf.text(guest.name, x + padding, y + padding + 5);

    // Table and meal choice
    if (guest.table) {
      pdf.setFontSize(config.fontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Table: ${guest.table}`, x + cardWidth - 40, y + padding + 5);
    }

    let currentY = y + padding + 10;

    // Critical allergies section
    if (guest.allergies.length > 0) {
      const criticalAllergies = guest.allergies.filter(
        (a) =>
          a.severity === AlertSeverity.LIFE_THREATENING ||
          a.severity === AlertSeverity.CRITICAL,
      );

      if (criticalAllergies.length > 0) {
        pdf.setFillColor(255, 200, 200);
        pdf.rect(x + padding, currentY, cardWidth - 2 * padding, 15, 'F');

        pdf.setFontSize(config.fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 0, 0);
        pdf.text('⚠️ CRITICAL ALLERGIES:', x + padding + 2, currentY + 5);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        const allergenList = criticalAllergies
          .map((a) => {
            let text = a.allergen.toUpperCase();
            if (a.requiresEpipen) text += ' (EPIPEN)';
            if (a.crossContaminationRisk) text += ' (X-CONTAMINATION)';
            return text;
          })
          .join(', ');

        pdf.text(allergenList, x + padding + 2, currentY + 10);
        currentY += 18;
      }

      // Other allergies
      const otherAllergies = guest.allergies.filter(
        (a) =>
          a.severity !== AlertSeverity.LIFE_THREATENING &&
          a.severity !== AlertSeverity.CRITICAL,
      );

      if (otherAllergies.length > 0) {
        pdf.setFontSize(config.fontSize - 1);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Other Allergies:', x + padding + 2, currentY + 5);

        pdf.setFont('helvetica', 'normal');
        const allergenList = otherAllergies.map((a) => a.allergen).join(', ');
        pdf.text(allergenList, x + padding + 2, currentY + 10);
        currentY += 13;
      }
    }

    // Dietary restrictions
    if (guest.restrictions.length > 0) {
      pdf.setFontSize(config.fontSize - 1);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dietary Restrictions:', x + padding + 2, currentY + 5);

      pdf.setFont('helvetica', 'normal');
      const restrictionsList = guest.restrictions.map((r) => r.type).join(', ');
      pdf.text(restrictionsList, x + padding + 2, currentY + 10);
      currentY += 13;
    }

    // Preferences
    if (guest.preferences.length > 0) {
      pdf.setFontSize(config.fontSize - 1);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Preferences:', x + padding + 2, currentY + 5);

      pdf.setFont('helvetica', 'normal');
      pdf.text(guest.preferences.join(', '), x + padding + 2, currentY + 10);
      currentY += 13;
    }

    // Special instructions
    if (guest.specialInstructions) {
      pdf.setFontSize(config.fontSize - 1);
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        `Note: ${guest.specialInstructions}`,
        x + padding + 2,
        currentY + 5,
      );
      currentY += 8;
    }

    // Emergency contact (if included)
    if (config.includeEmergencyContacts && guest.emergencyContact) {
      pdf.setFontSize(config.fontSize - 2);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Emergency: ${guest.emergencyContact.name} - ${guest.emergencyContact.phone}`,
        x + padding + 2,
        currentY + 3,
      );
    }
  }

  /**
   * Generate dietary matrix Excel file
   */
  async generateDietaryMatrixExcel(
    guests: GuestDietaryInfo[],
    eventDetails: any,
    config: ExportConfig,
  ): Promise<Blob> {
    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = this.createSummarySheet(guests, eventDetails);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create detailed matrix sheet
    const matrixData = this.createDietaryMatrix(guests);
    const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);

    // Apply formatting to matrix
    this.formatMatrixSheet(matrixSheet, guests.length);
    XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Dietary Matrix');

    // Create allergen-specific sheets
    for (const allergen of this.criticalAllergens) {
      const allergenGuests = guests.filter((g) =>
        g.allergies.some((a) =>
          a.allergen.toLowerCase().includes(allergen.toLowerCase()),
        ),
      );

      if (allergenGuests.length > 0) {
        const allergenData = this.createAllergenSheet(allergenGuests, allergen);
        const allergenSheet = XLSX.utils.json_to_sheet(allergenData);
        XLSX.utils.book_append_sheet(
          workbook,
          allergenSheet,
          `${allergen} Allergies`,
        );
      }
    }

    // Create critical alerts sheet
    const criticalGuests = guests.filter((g) =>
      g.allergies.some(
        (a) =>
          a.severity === AlertSeverity.LIFE_THREATENING ||
          a.severity === AlertSeverity.CRITICAL,
      ),
    );

    if (criticalGuests.length > 0) {
      const criticalData = this.createCriticalAlertsSheet(criticalGuests);
      const criticalSheet = XLSX.utils.json_to_sheet(criticalData);
      XLSX.utils.book_append_sheet(workbook, criticalSheet, 'CRITICAL ALERTS');
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: true,
    });

    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Create dietary matrix data
   */
  private createDietaryMatrix(guests: GuestDietaryInfo[]): any[][] {
    // Get all unique restrictions and allergies
    const allRestrictions = new Set<string>();
    const allAllergies = new Set<string>();

    guests.forEach((guest) => {
      guest.restrictions.forEach((r) => allRestrictions.add(r.type));
      guest.allergies.forEach((a) => allAllergies.add(a.allergen));
    });

    // Create header row
    const headers = [
      'Guest Name',
      'Table',
      'Meal Choice',
      ...Array.from(allAllergies).map((a) => `Allergy: ${a}`),
      ...Array.from(allRestrictions).map((r) => `Restriction: ${r}`),
      'Special Instructions',
      'Emergency Contact',
    ];

    // Create data rows
    const rows = guests.map((guest) => {
      const row = [guest.name, guest.table || '', guest.mealChoice || ''];

      // Add allergy columns
      Array.from(allAllergies).forEach((allergen) => {
        const allergy = guest.allergies.find((a) => a.allergen === allergen);
        if (allergy) {
          let marker = '✓';
          if (allergy.severity === AlertSeverity.LIFE_THREATENING)
            marker = '⚠️ CRITICAL';
          if (allergy.requiresEpipen) marker += ' (EPIPEN)';
          row.push(marker);
        } else {
          row.push('');
        }
      });

      // Add restriction columns
      Array.from(allRestrictions).forEach((restriction) => {
        const hasRestriction = guest.restrictions.find(
          (r) => r.type === restriction,
        );
        row.push(hasRestriction ? '✓' : '');
      });

      // Add additional info
      row.push(guest.specialInstructions || '');
      row.push(
        guest.emergencyContact
          ? `${guest.emergencyContact.name} - ${guest.emergencyContact.phone}`
          : '',
      );

      return row;
    });

    return [headers, ...rows];
  }

  /**
   * Create summary sheet data
   */
  private createSummarySheet(
    guests: GuestDietaryInfo[],
    eventDetails: any,
  ): any[] {
    const totalGuests = guests.length;
    const withRestrictions = guests.filter(
      (g) => g.restrictions.length > 0,
    ).length;
    const withAllergies = guests.filter((g) => g.allergies.length > 0).length;
    const criticalAllergies = guests.filter((g) =>
      g.allergies.some((a) => a.severity === AlertSeverity.LIFE_THREATENING),
    ).length;
    const requiresEpipen = guests.filter((g) =>
      g.allergies.some((a) => a.requiresEpipen),
    ).length;

    // Count each restriction type
    const restrictionCounts: Record<string, number> = {};
    const allergyCounts: Record<string, number> = {};

    guests.forEach((guest) => {
      guest.restrictions.forEach((r) => {
        restrictionCounts[r.type] = (restrictionCounts[r.type] || 0) + 1;
      });
      guest.allergies.forEach((a) => {
        allergyCounts[a.allergen] = (allergyCounts[a.allergen] || 0) + 1;
      });
    });

    return [
      { Category: 'Event Name', Value: eventDetails.eventName },
      { Category: 'Event Date', Value: eventDetails.eventDate },
      { Category: 'Total Guests', Value: totalGuests },
      { Category: 'Guests with Restrictions', Value: withRestrictions },
      { Category: 'Guests with Allergies', Value: withAllergies },
      { Category: 'Critical Allergies', Value: criticalAllergies },
      { Category: 'Requires Epipen', Value: requiresEpipen },
      { Category: '', Value: '' },
      { Category: 'RESTRICTION BREAKDOWN', Value: 'COUNT' },
      ...Object.entries(restrictionCounts).map(([type, count]) => ({
        Category: type,
        Value: count,
      })),
      { Category: '', Value: '' },
      { Category: 'ALLERGY BREAKDOWN', Value: 'COUNT' },
      ...Object.entries(allergyCounts).map(([allergen, count]) => ({
        Category: allergen,
        Value: count,
      })),
    ];
  }

  /**
   * Create allergen-specific sheet
   */
  private createAllergenSheet(
    guests: GuestDietaryInfo[],
    allergen: string,
  ): any[] {
    return guests.map((guest) => {
      const allergy = guest.allergies.find((a) =>
        a.allergen.toLowerCase().includes(allergen.toLowerCase()),
      );

      return {
        'Guest Name': guest.name,
        Table: guest.table || '',
        Severity: allergy?.severity || '',
        'Requires Epipen': allergy?.requiresEpipen ? 'YES' : 'NO',
        'Cross Contamination Risk': allergy?.crossContaminationRisk
          ? 'YES'
          : 'NO',
        'Emergency Contact': guest.emergencyContact
          ? `${guest.emergencyContact.name} - ${guest.emergencyContact.phone}`
          : '',
        'Special Instructions': guest.specialInstructions || '',
      };
    });
  }

  /**
   * Create critical alerts sheet
   */
  private createCriticalAlertsSheet(guests: GuestDietaryInfo[]): any[] {
    const alerts: any[] = [];

    guests.forEach((guest) => {
      guest.allergies
        .filter(
          (a) =>
            a.severity === AlertSeverity.LIFE_THREATENING ||
            a.severity === AlertSeverity.CRITICAL,
        )
        .forEach((allergy) => {
          alerts.push({
            PRIORITY:
              allergy.severity === AlertSeverity.LIFE_THREATENING
                ? '🚨 LIFE-THREATENING'
                : '⚠️ CRITICAL',
            'Guest Name': guest.name,
            Table: guest.table || '',
            Allergen: allergy.allergen.toUpperCase(),
            'Requires Epipen': allergy.requiresEpipen
              ? 'YES - EPIPEN REQUIRED'
              : 'NO',
            'Cross Contamination': allergy.crossContaminationRisk
              ? 'HIGH RISK - SEPARATE PREPARATION REQUIRED'
              : 'Standard precautions',
            'Emergency Contact': guest.emergencyContact
              ? `${guest.emergencyContact.name} - ${guest.emergencyContact.phone}`
              : 'NOT PROVIDED',
            'Medical Notes': guest.medicalNotes || '',
            'Kitchen Protocol': this.getKitchenProtocol(allergy),
          });
        });
    });

    // Sort by severity
    return alerts.sort((a, b) => {
      if (a.PRIORITY.includes('LIFE-THREATENING')) return -1;
      if (b.PRIORITY.includes('LIFE-THREATENING')) return 1;
      return 0;
    });
  }

  /**
   * Get kitchen protocol for an allergy
   */
  private getKitchenProtocol(allergy: any): string {
    const protocols = [];

    if (allergy.requiresEpipen) {
      protocols.push('EPIPEN ON SITE REQUIRED');
    }

    if (allergy.crossContaminationRisk) {
      protocols.push('SEPARATE PREP AREA');
      protocols.push('DEDICATED UTENSILS');
      protocols.push('FIRST IN SERVICE ORDER');
    }

    if (allergy.severity === AlertSeverity.LIFE_THREATENING) {
      protocols.push('CHEF VERIFICATION REQUIRED');
      protocols.push('DOUBLE-CHECK INGREDIENTS');
    }

    return protocols.join(' | ');
  }

  /**
   * Format Excel matrix sheet
   */
  private formatMatrixSheet(sheet: any, guestCount: number): void {
    // Set column widths
    const cols = [
      { wch: 20 }, // Guest name
      { wch: 10 }, // Table
      { wch: 15 }, // Meal choice
    ];

    // Add widths for allergy and restriction columns
    for (let i = 0; i < 20; i++) {
      cols.push({ wch: 15 });
    }

    sheet['!cols'] = cols;

    // Add cell formatting for critical allergies
    // Note: This is simplified - full implementation would use cell styles
  }

  /**
   * Calculate card height based on content
   */
  private calculateCardHeight(
    guest: GuestDietaryInfo,
    config: ExportConfig,
  ): number {
    let height = 25; // Base height

    if (guest.allergies.length > 0) height += 20;
    if (guest.restrictions.length > 0) height += 15;
    if (guest.preferences.length > 0) height += 10;
    if (guest.specialInstructions) height += 10;
    if (config.includeEmergencyContacts && guest.emergencyContact) height += 8;

    return height;
  }

  /**
   * Group guests by table
   */
  private groupGuestsByTable(
    guests: GuestDietaryInfo[],
  ): Record<string, GuestDietaryInfo[]> {
    const groups: Record<string, GuestDietaryInfo[]> = {};

    guests.forEach((guest) => {
      const table = guest.table || 'Unassigned';
      if (!groups[table]) groups[table] = [];
      groups[table].push(guest);
    });

    return groups;
  }

  /**
   * Add PDF header
   */
  private addPDFHeader(
    pdf: jsPDF,
    eventDetails: any,
    config: ExportConfig,
  ): void {
    const pageWidth = pdf.internal.pageSize.width;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DIETARY REQUIREMENTS & ALLERGEN REPORT', pageWidth / 2, 15, {
      align: 'center',
    });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `${eventDetails.eventName} - ${eventDetails.eventDate}`,
      pageWidth / 2,
      22,
      { align: 'center' },
    );

    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, {
      align: 'center',
    });

    // Add warning banner for critical allergies
    pdf.setFillColor(255, 200, 200);
    pdf.rect(config.marginSize, 32, pageWidth - 2 * config.marginSize, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      '⚠️ This document contains critical medical information. Handle with care.',
      pageWidth / 2,
      37,
      { align: 'center' },
    );
  }

  /**
   * Add PDF footer with emergency information
   */
  private addPDFFooter(
    pdf: jsPDF,
    eventDetails: any,
    config: ExportConfig,
  ): void {
    const pageCount = pdf.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');

      // Emergency contacts
      if (eventDetails.emergencyContacts) {
        pdf.text(
          `Emergency: ${eventDetails.emergencyContacts}`,
          config.marginSize,
          pageHeight - 10,
        );
      }

      // Page number
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - config.marginSize - 20,
        pageHeight - 10,
      );

      // Confidentiality notice
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        'Confidential: Contains sensitive medical information',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' },
      );
    }
  }

  /**
   * Bulk export processing
   */
  async processBulkExport(
    events: any[],
    config: ExportConfig,
  ): Promise<Map<string, Blob>> {
    const exports = new Map<string, Blob>();

    for (const event of events) {
      const guests = await this.fetchEventGuests(event.id);

      let exportBlob: Blob;

      switch (config.format) {
        case ExportFormat.PDF:
          exportBlob = await this.generateKitchenCardsPDF(
            guests,
            event,
            config,
          );
          break;
        case ExportFormat.EXCEL:
          exportBlob = await this.generateDietaryMatrixExcel(
            guests,
            event,
            config,
          );
          break;
        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      exports.set(`${event.eventName}_dietary_report`, exportBlob);
    }

    return exports;
  }

  /**
   * Fetch event guests (placeholder - integrate with actual data source)
   */
  private async fetchEventGuests(eventId: string): Promise<GuestDietaryInfo[]> {
    // This would integrate with your actual data source
    // For now, returning empty array
    return [];
  }

  /**
   * Validate export data before processing
   */
  validateExportData(guests: GuestDietaryInfo[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    guests.forEach((guest, index) => {
      try {
        GuestDietaryInfoSchema.parse(guest);
      } catch (error) {
        errors.push(
          `Guest ${index + 1} (${guest.name || 'Unknown'}): ${error}`,
        );
      }

      // Check for critical allergies without emergency contacts
      const hasCritical = guest.allergies.some(
        (a) => a.severity === AlertSeverity.LIFE_THREATENING,
      );

      if (hasCritical && !guest.emergencyContact) {
        errors.push(
          `Guest ${guest.name}: Critical allergy without emergency contact`,
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
let instance: CatererReportExporter | null = null;

export function getCatererReportExporter(): CatererReportExporter {
  if (!instance) {
    instance = new CatererReportExporter();
  }
  return instance;
}
