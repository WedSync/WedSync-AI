/**
 * WS-254 Catering Dietary Management - Guest Management Service
 * Handles guest dietary data import, validation, and management
 */

import { z } from 'zod';
import {
  DietaryRestriction,
  DietaryRestrictionSchema,
} from './dietary-analysis-service';

export const GuestSchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dietaryRestrictions: z.array(DietaryRestrictionSchema).default([]),
  tableAssignment: z.string().optional(),
  mealPreference: z.enum(['meat', 'fish', 'vegetarian', 'vegan']).optional(),
  isVip: z.boolean().default(false),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Guest = z.infer<typeof GuestSchema>;

export const BulkGuestImportSchema = z.object({
  weddingId: z.string(),
  source: z.enum(['csv', 'tave', 'manual', 'other']),
  guests: z.array(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      dietaryNotes: z.string().optional(),
      tableNumber: z.string().optional(),
      mealChoice: z.string().optional(),
      isVip: z.boolean().default(false),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      emergencyContactRelation: z.string().optional(),
    }),
  ),
  importTimestamp: z.date(),
});

export type BulkGuestImport = z.infer<typeof BulkGuestImportSchema>;

export class GuestManagementService {
  private readonly MAX_GUESTS_PER_WEDDING = 1000; // Wedding industry standard
  private readonly BATCH_SIZE = 100; // For bulk operations

  constructor() {
    // Service initialization
  }

  /**
   * Import guests in bulk from various sources (CSV, Tave, etc.)
   * Critical for wedding vendors with 200+ guest lists
   */
  async importGuestsBulk(importData: BulkGuestImport): Promise<{
    imported: Guest[];
    errors: Array<{ row: number; error: string; data: any }>;
    summary: {
      totalProcessed: number;
      successfulImports: number;
      failedImports: number;
      duplicatesSkipped: number;
    };
  }> {
    const imported: Guest[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];
    let duplicatesSkipped = 0;

    // Validate wedding capacity
    if (importData.guests.length > this.MAX_GUESTS_PER_WEDDING) {
      throw new Error(
        `Guest count exceeds maximum of ${this.MAX_GUESTS_PER_WEDDING} per wedding`,
      );
    }

    // Process guests in batches to prevent memory issues
    const batches = this.chunkArray(importData.guests, this.BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      for (let guestIndex = 0; guestIndex < batch.length; guestIndex++) {
        const rowIndex = batchIndex * this.BATCH_SIZE + guestIndex;
        const guestData = batch[guestIndex];

        try {
          // Check for duplicates
          const existingGuest = imported.find(
            (g) =>
              g.firstName.toLowerCase() === guestData.firstName.toLowerCase() &&
              g.lastName.toLowerCase() === guestData.lastName.toLowerCase() &&
              g.email === guestData.email,
          );

          if (existingGuest) {
            duplicatesSkipped++;
            continue;
          }

          // Parse dietary notes into structured restrictions
          const dietaryRestrictions = this.parseDietaryNotes(
            guestData.dietaryNotes || '',
          );

          // Create guest object
          const guest: Guest = {
            id: `guest-${Date.now()}-${rowIndex}`,
            weddingId: importData.weddingId,
            firstName: guestData.firstName.trim(),
            lastName: guestData.lastName.trim(),
            email: guestData.email?.trim() || undefined,
            phone: guestData.phone?.trim() || undefined,
            dietaryRestrictions,
            tableAssignment: guestData.tableNumber?.trim() || undefined,
            mealPreference: this.parseMealPreference(guestData.mealChoice),
            isVip: guestData.isVip,
            emergencyContact: this.parseEmergencyContact(guestData),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Validate guest data
          const validatedGuest = GuestSchema.parse(guest);
          imported.push(validatedGuest);
        } catch (error) {
          errors.push({
            row: rowIndex + 1,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
            data: guestData,
          });
        }
      }
    }

    return {
      imported,
      errors,
      summary: {
        totalProcessed: importData.guests.length,
        successfulImports: imported.length,
        failedImports: errors.length,
        duplicatesSkipped,
      },
    };
  }

  /**
   * Add dietary restriction to existing guest
   * Handles emergency dietary additions on wedding day
   */
  async addDietaryRestriction(
    guestId: string,
    restriction: Omit<
      DietaryRestriction,
      'id' | 'guestId' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<DietaryRestriction> {
    const newRestriction: DietaryRestriction = {
      id: `rest-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      guestId,
      ...restriction,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate the restriction
    const validatedRestriction = DietaryRestrictionSchema.parse(newRestriction);

    return validatedRestriction;
  }

  /**
   * Update guest dietary restrictions
   * Critical for managing changes during wedding planning
   */
  async updateGuestRestrictions(
    guestId: string,
    restrictions: DietaryRestriction[],
  ): Promise<Guest> {
    // Validate all restrictions
    const validatedRestrictions = restrictions.map((r) =>
      DietaryRestrictionSchema.parse({ ...r, guestId, updatedAt: new Date() }),
    );

    // Create updated guest (in real app, this would update database)
    const updatedGuest: Guest = {
      id: guestId,
      weddingId: 'wedding-placeholder',
      firstName: 'Updated',
      lastName: 'Guest',
      dietaryRestrictions: validatedRestrictions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return GuestSchema.parse(updatedGuest);
  }

  /**
   * Get guests with critical dietary restrictions
   * For wedding day priority management
   */
  async getCriticalDietaryGuests(
    weddingId: string,
    guests: Guest[],
  ): Promise<{
    lifeThreatening: Guest[];
    severe: Guest[];
    medicalCertified: Guest[];
    vipGuests: Guest[];
  }> {
    const weddingGuests = guests.filter((g) => g.weddingId === weddingId);

    const lifeThreatening = weddingGuests.filter((guest) =>
      guest.dietaryRestrictions.some((r) => r.severity === 'life-threatening'),
    );

    const severe = weddingGuests.filter(
      (guest) =>
        guest.dietaryRestrictions.some((r) => r.severity === 'severe') &&
        !guest.dietaryRestrictions.some(
          (r) => r.severity === 'life-threatening',
        ),
    );

    const medicalCertified = weddingGuests.filter((guest) =>
      guest.dietaryRestrictions.some((r) => r.medicalCertification === true),
    );

    const vipGuests = weddingGuests.filter(
      (guest) => guest.isVip && guest.dietaryRestrictions.length > 0,
    );

    return {
      lifeThreatening,
      severe,
      medicalCertified,
      vipGuests,
    };
  }

  /**
   * Generate dietary summary report for wedding vendors
   * Helps caterers prepare for dietary requirements
   */
  async generateDietarySummaryReport(guests: Guest[]): Promise<{
    totalGuests: number;
    restrictionSummary: Record<string, number>;
    severityBreakdown: Record<string, number>;
    mealPreferenceSummary: Record<string, number>;
    criticalAlerts: string[];
    recommendations: string[];
  }> {
    const totalGuests = guests.length;
    const allRestrictions = guests.flatMap((g) => g.dietaryRestrictions);

    // Count restrictions by type
    const restrictionSummary = allRestrictions.reduce(
      (acc, restriction) => {
        acc[restriction.type] = (acc[restriction.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Count by severity
    const severityBreakdown = allRestrictions.reduce(
      (acc, restriction) => {
        acc[restriction.severity] = (acc[restriction.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Count meal preferences
    const mealPreferenceSummary = guests.reduce(
      (acc, guest) => {
        const preference = guest.mealPreference || 'no-preference';
        acc[preference] = (acc[preference] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Generate critical alerts
    const criticalAlerts: string[] = [];
    const lifeThreatening = severityBreakdown['life-threatening'] || 0;
    const nutAllergies = restrictionSummary['nut-allergy'] || 0;
    const multipleRestrictions = guests.filter(
      (g) => g.dietaryRestrictions.length > 2,
    ).length;

    if (lifeThreatening > 0) {
      criticalAlerts.push(
        `${lifeThreatening} guests with LIFE-THREATENING dietary restrictions - emergency protocols required`,
      );
    }

    if (nutAllergies > 0) {
      criticalAlerts.push(
        `${nutAllergies} guests with nut allergies - nut-free kitchen protocols essential`,
      );
    }

    if (multipleRestrictions > 0) {
      criticalAlerts.push(
        `${multipleRestrictions} guests with multiple dietary restrictions - require special attention`,
      );
    }

    // Generate recommendations
    const recommendations = this.generateCateringRecommendations(
      restrictionSummary,
      severityBreakdown,
      totalGuests,
    );

    return {
      totalGuests,
      restrictionSummary,
      severityBreakdown,
      mealPreferenceSummary,
      criticalAlerts,
      recommendations,
    };
  }

  /**
   * Validate guest list for wedding day readiness
   * Final check before the event
   */
  async validateWeddingDayReadiness(guests: Guest[]): Promise<{
    isReady: boolean;
    errors: string[];
    warnings: string[];
    checklist: Array<{
      item: string;
      status: 'complete' | 'pending' | 'missing';
    }>;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checklist = [];

    // Check for guests with dietary restrictions but no emergency contact
    const riskyGuests = guests.filter(
      (guest) =>
        guest.dietaryRestrictions.some(
          (r) => r.severity === 'life-threatening',
        ) && !guest.emergencyContact,
    );

    if (riskyGuests.length > 0) {
      errors.push(
        `${riskyGuests.length} guests with life-threatening allergies missing emergency contacts`,
      );
    }

    // Check for unspecified dietary restrictions
    const vagueRestrictions = guests.filter((guest) =>
      guest.dietaryRestrictions.some((r) => r.type === 'other' && !r.notes),
    );

    if (vagueRestrictions.length > 0) {
      warnings.push(
        `${vagueRestrictions.length} guests with unspecified dietary restrictions`,
      );
    }

    // Wedding day readiness checklist
    checklist.push({
      item: 'All critical allergies documented',
      status: riskyGuests.length === 0 ? 'complete' : 'missing',
    });

    checklist.push({
      item: 'Emergency contacts available for high-risk guests',
      status: riskyGuests.length === 0 ? 'complete' : 'missing',
    });

    checklist.push({
      item: 'Medical certifications verified',
      status: guests.every((g) =>
        g.dietaryRestrictions.every(
          (r) => r.severity !== 'life-threatening' || r.medicalCertification,
        ),
      )
        ? 'complete'
        : 'pending',
    });

    return {
      isReady: errors.length === 0,
      errors,
      warnings,
      checklist,
    };
  }

  // Private helper methods
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private parseDietaryNotes(notes: string): DietaryRestriction[] {
    if (!notes.trim()) return [];

    const restrictions: DietaryRestriction[] = [];
    const lowerNotes = notes.toLowerCase();

    // Simple pattern matching for common restrictions
    const patterns = [
      { pattern: /gluten.free|celiac/i, type: 'gluten-free' as const },
      { pattern: /vegetarian/i, type: 'vegetarian' as const },
      { pattern: /vegan/i, type: 'vegan' as const },
      { pattern: /nut.allerg|peanut.allerg/i, type: 'nut-allergy' as const },
      { pattern: /dairy.free|lactose/i, type: 'dairy-free' as const },
      { pattern: /kosher/i, type: 'kosher' as const },
      { pattern: /halal/i, type: 'halal' as const },
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(notes)) {
        restrictions.push({
          id: `parsed-${Date.now()}-${Math.random()}`,
          guestId: 'temp',
          type,
          severity:
            lowerNotes.includes('severe') || lowerNotes.includes('allerg')
              ? 'severe'
              : 'mild',
          notes,
          medicalCertification:
            lowerNotes.includes('medical') || lowerNotes.includes('doctor'),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // If no patterns matched but there are notes, create general restriction
    if (restrictions.length === 0 && notes.trim()) {
      restrictions.push({
        id: `parsed-${Date.now()}-${Math.random()}`,
        guestId: 'temp',
        type: 'other',
        severity: 'mild',
        notes,
        medicalCertification: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return restrictions;
  }

  private parseMealPreference(choice?: string): Guest['mealPreference'] {
    if (!choice) return undefined;

    const lowerChoice = choice.toLowerCase();

    if (
      lowerChoice.includes('meat') ||
      lowerChoice.includes('beef') ||
      lowerChoice.includes('chicken')
    ) {
      return 'meat';
    }
    if (
      lowerChoice.includes('fish') ||
      lowerChoice.includes('salmon') ||
      lowerChoice.includes('seafood')
    ) {
      return 'fish';
    }
    if (lowerChoice.includes('vegetarian')) {
      return 'vegetarian';
    }
    if (lowerChoice.includes('vegan')) {
      return 'vegan';
    }

    return undefined;
  }

  private parseEmergencyContact(guestData: any): Guest['emergencyContact'] {
    if (!guestData.emergencyContactName || !guestData.emergencyContactPhone) {
      return undefined;
    }

    return {
      name: guestData.emergencyContactName.trim(),
      phone: guestData.emergencyContactPhone.trim(),
      relationship:
        guestData.emergencyContactRelation?.trim() || 'Emergency Contact',
    };
  }

  private generateCateringRecommendations(
    restrictionSummary: Record<string, number>,
    severityBreakdown: Record<string, number>,
    totalGuests: number,
  ): string[] {
    const recommendations: string[] = [];

    const restrictionPercentage =
      Object.values(restrictionSummary).reduce((sum, count) => sum + count, 0) /
      totalGuests;

    if (restrictionPercentage > 0.3) {
      recommendations.push('Consider dedicated dietary restriction stations');
    }

    if (restrictionSummary['gluten-free'] > 0) {
      recommendations.push('Ensure separate gluten-free preparation area');
    }

    if (restrictionSummary['nut-allergy'] > 0) {
      recommendations.push('Implement strict nut-free kitchen protocols');
    }

    if (restrictionSummary['vegan'] > totalGuests * 0.1) {
      recommendations.push('Provide substantial vegan menu options');
    }

    if (severityBreakdown['life-threatening'] > 0) {
      recommendations.push(
        'Have EpiPens and emergency medical protocols ready',
      );
    }

    return recommendations;
  }
}
