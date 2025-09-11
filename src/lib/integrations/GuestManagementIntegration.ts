import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface GuestInfo {
  name: string;
  email?: string;
  dietaryNotes?: string;
  dietaryVerified?: boolean;
  emergencyContact?: string;
  rsvpStatus?: string;
}

interface ExtractedRequirement {
  categoryId: string;
  notes: string;
  severity: number;
  verified: boolean;
  emergencyContact?: string;
}

interface DietarySyncResult {
  totalGuests: number;
  requirementsFound: number;
  newRequirements: number;
  updatedRequirements: number;
  errors: string[];
  syncResults: IndividualSyncResult[];
}

interface IndividualSyncResult {
  guestName: string;
  hasRequirements: boolean;
  isNew: boolean;
  isUpdated: boolean;
  requirementCount?: number;
  error?: string;
}

interface ImportResult {
  system: string;
  importedCount: number;
  processedCount: number;
  requirementsFound: number;
  errors: string[];
}

interface ExportResult {
  format: string;
  fileName: string;
  data: any;
  recordCount: number;
}

interface ExternalSystemCredentials {
  apiUrl: string;
  apiKey: string;
  eventId?: string;
}

export class GuestManagementIntegration extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.setupRealtimeSubscriptions();
  }

  async syncGuestDietaryRequirements(
    weddingId: string,
    guestList: GuestInfo[],
  ): Promise<DietarySyncResult> {
    try {
      const syncResults: IndividualSyncResult[] = [];

      for (const guest of guestList) {
        const result = await this.syncIndividualGuest(weddingId, guest);
        syncResults.push(result);
      }

      // Update wedding-level dietary summary
      await this.updateWeddingDietarySummary(weddingId, syncResults);

      // Trigger dietary analysis refresh
      this.emit('dietary_requirements_updated', {
        weddingId,
        guestCount: guestList.length,
        requirementCount: syncResults.filter((r) => r.hasRequirements).length,
      });

      return {
        totalGuests: guestList.length,
        requirementsFound: syncResults.filter((r) => r.hasRequirements).length,
        newRequirements: syncResults.filter((r) => r.isNew).length,
        updatedRequirements: syncResults.filter((r) => r.isUpdated).length,
        errors: syncResults.filter((r) => r.error).map((r) => r.error!),
        syncResults,
      };
    } catch (error: any) {
      throw new Error(`Guest dietary sync failed: ${error.message}`);
    }
  }

  private async syncIndividualGuest(
    weddingId: string,
    guest: GuestInfo,
  ): Promise<IndividualSyncResult> {
    try {
      // Check for existing dietary requirements
      const { data: existingReqs } = await this.supabase
        .from('guest_dietary_requirements')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('guest_name', guest.name);

      const guestRequirements = this.extractDietaryRequirements(guest);

      if (guestRequirements.length === 0) {
        return {
          guestName: guest.name,
          hasRequirements: false,
          isNew: false,
          isUpdated: false,
        };
      }

      let isNew = false;
      let isUpdated = false;

      for (const requirement of guestRequirements) {
        const existing = existingReqs?.find(
          (r) => r.dietary_category_id === requirement.categoryId,
        );

        if (existing) {
          // Update existing requirement
          if (
            existing.specific_notes !== requirement.notes ||
            existing.severity_level !== requirement.severity
          ) {
            await this.supabase
              .from('guest_dietary_requirements')
              .update({
                specific_notes: requirement.notes,
                severity_level: requirement.severity,
                verified_by_guest: requirement.verified,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            isUpdated = true;
          }
        } else {
          // Create new requirement
          await this.supabase.from('guest_dietary_requirements').insert({
            wedding_id: weddingId,
            guest_name: guest.name,
            guest_email: guest.email,
            dietary_category_id: requirement.categoryId,
            severity_level: requirement.severity,
            specific_notes: requirement.notes,
            emergency_contact: requirement.emergencyContact,
            verified_by_guest: requirement.verified,
          });

          isNew = true;
        }
      }

      return {
        guestName: guest.name,
        hasRequirements: true,
        isNew,
        isUpdated,
        requirementCount: guestRequirements.length,
      };
    } catch (error: any) {
      return {
        guestName: guest.name,
        hasRequirements: false,
        isNew: false,
        isUpdated: false,
        error: error.message,
      };
    }
  }

  private extractDietaryRequirements(guest: GuestInfo): ExtractedRequirement[] {
    const requirements: ExtractedRequirement[] = [];

    // Parse dietary notes from various guest management systems
    if (guest.dietaryNotes) {
      const notes = guest.dietaryNotes.toLowerCase();

      // Common allergy patterns
      const allergyPatterns = {
        nuts: /\b(nut|peanut|almond|walnut)\s*(allerg|free)/i,
        dairy: /\b(dairy|lactose|milk)\s*(allerg|free|intolerant)/i,
        gluten: /\b(gluten|wheat|celiac)\s*(allerg|free|intolerant)/i,
        shellfish: /\b(shellfish|shrimp|lobster|crab)\s*(allerg)/i,
        eggs: /\b(egg)\s*(allerg|free)/i,
        soy: /\b(soy)\s*(allerg|free)/i,
        fish: /\b(fish)\s*(allerg)/i,
        sesame: /\b(sesame)\s*(allerg)/i,
      };

      for (const [allergen, pattern] of Object.entries(allergyPatterns)) {
        if (pattern.test(notes)) {
          requirements.push({
            categoryId: this.getAllergenCategoryId(allergen),
            notes: guest.dietaryNotes,
            severity: this.determineSeverity(notes),
            verified: guest.dietaryVerified || false,
            emergencyContact: guest.emergencyContact,
          });
        }
      }

      // Diet type patterns
      const dietPatterns = {
        vegan: /\bvegan\b/i,
        vegetarian: /\bvegetarian\b/i,
        kosher: /\bkosher\b/i,
        halal: /\bhalal\b/i,
        keto: /\b(keto|ketogenic)\b/i,
        paleo: /\bpaleo\b/i,
        diabetic: /\b(diabetic|diabetes)\b/i,
      };

      for (const [diet, pattern] of Object.entries(dietPatterns)) {
        if (pattern.test(notes)) {
          requirements.push({
            categoryId: this.getDietCategoryId(diet),
            notes: guest.dietaryNotes,
            severity: 3,
            verified: guest.dietaryVerified || false,
          });
        }
      }
    }

    return requirements;
  }

  private getAllergenCategoryId(allergen: string): string {
    const allergenMap: Record<string, string> = {
      nuts: 'allergen-nuts',
      dairy: 'allergen-dairy',
      gluten: 'allergen-gluten',
      shellfish: 'allergen-shellfish',
      eggs: 'allergen-eggs',
      soy: 'allergen-soy',
      fish: 'allergen-fish',
      sesame: 'allergen-sesame',
    };
    return allergenMap[allergen] || 'allergen-unknown';
  }

  private getDietCategoryId(diet: string): string {
    const dietMap: Record<string, string> = {
      vegan: 'diet-vegan',
      vegetarian: 'diet-vegetarian',
      kosher: 'diet-kosher',
      halal: 'diet-halal',
      keto: 'diet-keto',
      paleo: 'diet-paleo',
      diabetic: 'medical-diabetes',
    };
    return dietMap[diet] || 'diet-other';
  }

  private determineSeverity(notes: string): number {
    const lowerNotes = notes.toLowerCase();

    // Critical severity indicators
    if (
      lowerNotes.includes('anaphylactic') ||
      lowerNotes.includes('severe') ||
      lowerNotes.includes('epipen') ||
      lowerNotes.includes('life-threatening')
    ) {
      return 5;
    }

    // High severity
    if (lowerNotes.includes('allergy') || lowerNotes.includes('allergic')) {
      return 4;
    }

    // Medium severity
    if (
      lowerNotes.includes('intolerant') ||
      lowerNotes.includes('sensitivity')
    ) {
      return 3;
    }

    // Low severity (preferences)
    return 2;
  }

  private async updateWeddingDietarySummary(
    weddingId: string,
    syncResults: IndividualSyncResult[],
  ): Promise<void> {
    const summary = {
      total_guests: syncResults.length,
      guests_with_requirements: syncResults.filter((r) => r.hasRequirements)
        .length,
      high_risk_count: 0, // Will be calculated from actual requirements
      last_sync: new Date().toISOString(),
    };

    // Get actual requirement counts by severity
    const { data: requirements } = await this.supabase
      .from('guest_dietary_requirements')
      .select('severity_level')
      .eq('wedding_id', weddingId);

    if (requirements) {
      summary.high_risk_count = requirements.filter(
        (r) => r.severity_level >= 4,
      ).length;
    }

    // Update or insert dietary summary
    await this.supabase.from('wedding_dietary_summaries').upsert({
      wedding_id: weddingId,
      ...summary,
    });
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to guest changes
    this.supabase
      .channel('guest_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_dietary_requirements' },
        (payload) => {
          this.handleDietaryRequirementChange(payload);
        },
      )
      .subscribe();

    // Subscribe to wedding changes that might affect dietary planning
    this.supabase
      .channel('wedding_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'weddings' },
        (payload) => {
          this.handleWeddingChange(payload);
        },
      )
      .subscribe();
  }

  private handleDietaryRequirementChange(payload: any): void {
    this.emit('guest_dietary_requirement_changed', {
      eventType: payload.eventType,
      weddingId: payload.new?.wedding_id || payload.old?.wedding_id,
      guestName: payload.new?.guest_name || payload.old?.guest_name,
      requirement: payload.new,
      oldRequirement: payload.old,
    });
  }

  private handleWeddingChange(payload: any): void {
    if (payload.new.guest_count !== payload.old.guest_count) {
      this.emit('wedding_guest_count_changed', {
        weddingId: payload.new.id,
        oldCount: payload.old.guest_count,
        newCount: payload.new.guest_count,
      });
    }
  }

  // Import from external guest management systems
  async importFromExternalSystem(
    weddingId: string,
    system: 'rsvpify' | 'the_knot' | 'wedding_wire' | 'zola',
    credentials: ExternalSystemCredentials,
  ): Promise<ImportResult> {
    try {
      const importer = this.getSystemImporter(system);
      const guests = await importer.fetchGuests(credentials);

      const syncResult = await this.syncGuestDietaryRequirements(
        weddingId,
        guests,
      );

      return {
        system,
        importedCount: guests.length,
        processedCount: syncResult.totalGuests,
        requirementsFound: syncResult.requirementsFound,
        errors: syncResult.errors,
      };
    } catch (error: any) {
      throw new Error(`External system import failed: ${error.message}`);
    }
  }

  private getSystemImporter(system: string): GuestSystemImporter {
    const importers = {
      rsvpify: new RSVPifyImporter(),
      the_knot: new TheKnotImporter(),
      wedding_wire: new WeddingWireImporter(),
      zola: new ZolaImporter(),
    };

    return importers[system as keyof typeof importers];
  }

  // Export dietary requirements for external systems
  async exportDietaryRequirements(
    weddingId: string,
    format: 'csv' | 'excel' | 'json' | 'pdf',
  ): Promise<ExportResult> {
    const { data: requirements } = await this.supabase
      .from('guest_dietary_requirements')
      .select(
        `
        *,
        dietary_categories (name, category_type)
      `,
      )
      .eq('wedding_id', weddingId)
      .order('severity_level', { ascending: false });

    const exporter = this.getExporter(format);
    const exportData = await exporter.export(requirements || []);

    return {
      format,
      fileName: `dietary_requirements_${weddingId}_${Date.now()}.${format}`,
      data: exportData,
      recordCount: requirements?.length || 0,
    };
  }

  private getExporter(format: string): DietaryRequirementsExporter {
    const exporters = {
      csv: new CSVExporter(),
      excel: new ExcelExporter(),
      json: new JSONExporter(),
      pdf: new PDFExporter(),
    };

    return exporters[format as keyof typeof exporters];
  }

  // Bulk update dietary requirements
  async bulkUpdateRequirements(
    weddingId: string,
    updates: Array<{
      guestName: string;
      requirements: Partial<ExtractedRequirement>[];
    }>,
  ): Promise<{ success: number; errors: string[] }> {
    let successCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        // Find existing requirements for this guest
        const { data: existing } = await this.supabase
          .from('guest_dietary_requirements')
          .select('*')
          .eq('wedding_id', weddingId)
          .eq('guest_name', update.guestName);

        // Delete existing requirements
        if (existing && existing.length > 0) {
          await this.supabase
            .from('guest_dietary_requirements')
            .delete()
            .eq('wedding_id', weddingId)
            .eq('guest_name', update.guestName);
        }

        // Insert new requirements
        if (update.requirements.length > 0) {
          const newRequirements = update.requirements.map((req) => ({
            wedding_id: weddingId,
            guest_name: update.guestName,
            dietary_category_id: req.categoryId || 'unknown',
            severity_level: req.severity || 2,
            specific_notes: req.notes || '',
            verified_by_guest: req.verified || false,
            emergency_contact: req.emergencyContact,
          }));

          await this.supabase
            .from('guest_dietary_requirements')
            .insert(newRequirements);
        }

        successCount++;
      } catch (error: any) {
        errors.push(`Failed to update ${update.guestName}: ${error.message}`);
      }
    }

    // Trigger sync event
    this.emit('bulk_requirements_updated', {
      weddingId,
      updatedCount: successCount,
      errorCount: errors.length,
    });

    return { success: successCount, errors };
  }

  // Get dietary analytics for a wedding
  async getDietaryAnalytics(weddingId: string): Promise<any> {
    const { data: requirements } = await this.supabase
      .from('guest_dietary_requirements')
      .select(
        `
        severity_level,
        dietary_categories (name, category_type)
      `,
      )
      .eq('wedding_id', weddingId);

    if (!requirements) return null;

    const analytics = {
      totalRequirements: requirements.length,
      severityBreakdown: {
        critical: requirements.filter((r) => r.severity_level === 5).length,
        high: requirements.filter((r) => r.severity_level === 4).length,
        medium: requirements.filter((r) => r.severity_level === 3).length,
        low: requirements.filter((r) => r.severity_level <= 2).length,
      },
      categoryBreakdown: {} as Record<string, number>,
      riskAssessment: 'low' as 'low' | 'medium' | 'high' | 'critical',
    };

    // Calculate category breakdown
    requirements.forEach((req) => {
      const category = req.dietary_categories?.name || 'Unknown';
      analytics.categoryBreakdown[category] =
        (analytics.categoryBreakdown[category] || 0) + 1;
    });

    // Determine risk assessment
    if (analytics.severityBreakdown.critical > 0) {
      analytics.riskAssessment = 'critical';
    } else if (analytics.severityBreakdown.high > 2) {
      analytics.riskAssessment = 'high';
    } else if (
      analytics.severityBreakdown.high > 0 ||
      analytics.severityBreakdown.medium > 5
    ) {
      analytics.riskAssessment = 'medium';
    }

    return analytics;
  }
}

// External system importers
abstract class GuestSystemImporter {
  abstract fetchGuests(
    credentials: ExternalSystemCredentials,
  ): Promise<GuestInfo[]>;
}

class RSVPifyImporter extends GuestSystemImporter {
  async fetchGuests(
    credentials: ExternalSystemCredentials,
  ): Promise<GuestInfo[]> {
    // Implementation for RSVPify API integration
    const response = await fetch(`${credentials.apiUrl}/guests`, {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`RSVPify API error: ${response.statusText}`);
    }

    const data = await response.json();

    return data.guests.map((guest: any) => ({
      name: guest.name,
      email: guest.email,
      dietaryNotes: guest.dietary_restrictions,
      dietaryVerified: guest.dietary_verified,
      emergencyContact: guest.emergency_contact,
      rsvpStatus: guest.rsvp_status,
    }));
  }
}

class TheKnotImporter extends GuestSystemImporter {
  async fetchGuests(
    credentials: ExternalSystemCredentials,
  ): Promise<GuestInfo[]> {
    // Mock implementation for The Knot
    console.log('The Knot importer not yet implemented');
    return [];
  }
}

class WeddingWireImporter extends GuestSystemImporter {
  async fetchGuests(
    credentials: ExternalSystemCredentials,
  ): Promise<GuestInfo[]> {
    // Mock implementation for Wedding Wire
    console.log('Wedding Wire importer not yet implemented');
    return [];
  }
}

class ZolaImporter extends GuestSystemImporter {
  async fetchGuests(
    credentials: ExternalSystemCredentials,
  ): Promise<GuestInfo[]> {
    // Mock implementation for Zola
    console.log('Zola importer not yet implemented');
    return [];
  }
}

// Export implementations
abstract class DietaryRequirementsExporter {
  abstract export(requirements: any[]): Promise<any>;
}

class CSVExporter extends DietaryRequirementsExporter {
  async export(requirements: any[]): Promise<string> {
    const headers = [
      'Guest Name',
      'Email',
      'Category',
      'Severity',
      'Notes',
      'Verified',
      'Emergency Contact',
    ];
    const rows = requirements.map((req) => [
      req.guest_name,
      req.guest_email || '',
      req.dietary_categories?.name || 'Unknown',
      req.severity_level,
      req.specific_notes || '',
      req.verified_by_guest ? 'Yes' : 'No',
      req.emergency_contact || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

class ExcelExporter extends DietaryRequirementsExporter {
  async export(requirements: any[]): Promise<Buffer> {
    // Mock implementation - would use a library like xlsx
    return Buffer.from('Excel export not implemented');
  }
}

class JSONExporter extends DietaryRequirementsExporter {
  async export(requirements: any[]): Promise<string> {
    return JSON.stringify(requirements, null, 2);
  }
}

class PDFExporter extends DietaryRequirementsExporter {
  async export(requirements: any[]): Promise<Buffer> {
    // Mock implementation - would use a library like puppeteer or jsPDF
    return Buffer.from('PDF export not implemented');
  }
}
