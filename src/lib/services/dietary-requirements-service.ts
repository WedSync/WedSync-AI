/**
 * WS-152: Dietary Requirements Service
 * Team D - Batch 13
 *
 * Medical-grade dietary requirements management with encryption,
 * audit logging, and performance optimization
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { cache } from 'react';

type DietarySeverity =
  | 'preference'
  | 'intolerance'
  | 'allergy'
  | 'severe_allergy'
  | 'life_threatening'
  | 'medical_required';

type DietaryCategory =
  | 'allergen'
  | 'religious'
  | 'ethical'
  | 'medical'
  | 'preference'
  | 'intolerance';

interface DietaryType {
  id: string;
  name: string;
  category: DietaryCategory;
  commonAllergens: string[];
  crossContaminationRisk: boolean;
  requiresMedicalAttention: boolean;
  standardSubstitutes: Record<string, string>;
  cateringNotes?: string;
  icon?: string;
  colorCode?: string;
  displayOrder: number;
  isActive: boolean;
}

interface GuestDietaryRequirement {
  id: string;
  guestId: string;
  dietaryTypeId: string;
  severity: DietarySeverity;
  description?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  crossContaminationSeverity?: DietarySeverity;
  kitchenSeparationRequired: boolean;
  lastReviewed: Date;
  reviewRequired: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Related data
  dietaryType?: DietaryType;
  guestName?: string;
}

interface DietaryMatrix {
  summary: Record<string, any>;
  allergens: string[];
  severity: Record<DietarySeverity, { count: number; guests: number }>;
  cached: boolean;
  cachedAt?: Date;
  totalRequirements: number;
  criticalAllergies: string[];
  kitchenRequirements: {
    separatePrepNeeded: boolean;
    allergenFreeZone: boolean;
  };
  generatedAt: Date;
}

interface CateringReport {
  id: string;
  coupleId: string;
  eventDate: Date;
  totalGuests: number;
  dietaryBreakdown: Record<string, any>;
  allergenList: Record<string, any>;
  specialInstructions?: string;
  generatedAt: Date;
  sharedWith: string[];
  lastAccessed?: Date;
  accessCount: number;
}

interface MedicalData {
  details?: string;
  emergencyContact?: string;
  emergencyMedication?: string;
  hospitalPreference?: string;
}

interface AuditLogEntry {
  id: string;
  requirementId?: string;
  guestId?: string;
  action: string;
  performedBy: string;
  performedByRole?: string;
  changesMade?: Record<string, any>;
  previousValues?: Record<string, any>;
  accessReason?: string;
  ipAddress?: string;
  userAgent?: string;
  legitimateAccess: boolean;
  emergencyOverride: boolean;
  createdAt: Date;
}

export class DietaryRequirementsService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Get all available dietary types
   */
  async getDietaryTypes(category?: DietaryCategory): Promise<DietaryType[]> {
    const query = this.supabase
      .from('dietary_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (category) {
      query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching dietary types:', error);
      throw new Error('Failed to fetch dietary types');
    }

    return this.transformDietaryTypes(data || []);
  }

  /**
   * Get dietary requirements for a guest
   */
  async getGuestDietaryRequirements(
    guestId: string,
  ): Promise<GuestDietaryRequirement[]> {
    const { data, error } = await this.supabase
      .from('guest_dietary_requirements')
      .select(
        `
        *,
        dietary_types (*)
      `,
      )
      .eq('guest_id', guestId)
      .order('severity', { ascending: false });

    if (error) {
      console.error('Error fetching guest dietary requirements:', error);
      throw new Error('Failed to fetch dietary requirements');
    }

    // Log access for audit
    await this.logAuditEvent({
      guestId,
      action: 'viewed',
      accessReason: 'Guest dietary requirements viewed',
    });

    return this.transformDietaryRequirements(data || []);
  }

  /**
   * Add dietary requirement for a guest with medical data encryption
   */
  async addDietaryRequirement(
    guestId: string,
    requirement: {
      dietaryTypeId: string;
      severity: DietarySeverity;
      description?: string;
      medicalData?: MedicalData;
      crossContaminationSeverity?: DietarySeverity;
      kitchenSeparationRequired?: boolean;
    },
  ): Promise<GuestDietaryRequirement> {
    const { data: user } = await this.supabase.auth.getUser();

    // Prepare encrypted medical data if provided
    const encryptedData: any = {
      guest_id: guestId,
      dietary_type_id: requirement.dietaryTypeId,
      severity: requirement.severity,
      description: requirement.description,
      cross_contamination_severity: requirement.crossContaminationSeverity,
      kitchen_separation_required:
        requirement.kitchenSeparationRequired || false,
    };

    // For severe allergies, encrypt medical data
    if (
      requirement.medicalData &&
      ['severe_allergy', 'life_threatening', 'medical_required'].includes(
        requirement.severity,
      )
    ) {
      // Call encrypted data functions (handled by database)
      encryptedData.medical_details_encrypted = requirement.medicalData.details;
      encryptedData.emergency_contact_encrypted =
        requirement.medicalData.emergencyContact;
      encryptedData.emergency_medication_encrypted =
        requirement.medicalData.emergencyMedication;
      encryptedData.hospital_preference_encrypted =
        requirement.medicalData.hospitalPreference;
    }

    const { data, error } = await this.supabase
      .from('guest_dietary_requirements')
      .insert(encryptedData)
      .select(
        `
        *,
        dietary_types (*)
      `,
      )
      .single();

    if (error) {
      console.error('Error adding dietary requirement:', error);
      throw new Error('Failed to add dietary requirement');
    }

    // Log for audit
    await this.logAuditEvent({
      requirementId: data.id,
      guestId,
      action: 'created',
      changesMade: requirement,
      accessReason: 'New dietary requirement added',
    });

    return this.transformDietaryRequirement(data);
  }

  /**
   * Update dietary requirement with audit logging
   */
  async updateDietaryRequirement(
    requirementId: string,
    updates: Partial<{
      severity: DietarySeverity;
      description: string;
      medicalData: MedicalData;
      verifiedBy: string;
      kitchenSeparationRequired: boolean;
    }>,
  ): Promise<GuestDietaryRequirement> {
    // Fetch current values for audit
    const { data: currentData } = await this.supabase
      .from('guest_dietary_requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.verifiedBy) {
      updateData.verified_by = updates.verifiedBy;
      updateData.verified_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('guest_dietary_requirements')
      .update(updateData)
      .eq('id', requirementId)
      .select(
        `
        *,
        dietary_types (*)
      `,
      )
      .single();

    if (error) {
      console.error('Error updating dietary requirement:', error);
      throw new Error('Failed to update dietary requirement');
    }

    // Log audit with changes
    await this.logAuditEvent({
      requirementId,
      guestId: data.guest_id,
      action: 'updated',
      changesMade: updates,
      previousValues: currentData,
      accessReason: 'Dietary requirement updated',
    });

    return this.transformDietaryRequirement(data);
  }

  /**
   * Delete dietary requirement with audit
   */
  async deleteDietaryRequirement(requirementId: string): Promise<void> {
    // Get requirement details for audit
    const { data: requirement } = await this.supabase
      .from('guest_dietary_requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    const { error } = await this.supabase
      .from('guest_dietary_requirements')
      .delete()
      .eq('id', requirementId);

    if (error) {
      console.error('Error deleting dietary requirement:', error);
      throw new Error('Failed to delete dietary requirement');
    }

    // Log deletion
    await this.logAuditEvent({
      requirementId,
      guestId: requirement?.guest_id,
      action: 'deleted',
      previousValues: requirement,
      accessReason: 'Dietary requirement removed',
    });
  }

  /**
   * Generate dietary matrix with caching for performance
   * Target: <2 seconds response time
   */
  async generateDietaryMatrix(
    coupleId: string,
    eventId?: string,
    forceRefresh = false,
  ): Promise<DietaryMatrix> {
    const startTime = performance.now();

    // Check cache first if not forcing refresh
    if (!forceRefresh && eventId) {
      const cached = await this.getCachedMatrix(coupleId, eventId);
      if (cached) {
        const endTime = performance.now();
        console.log(
          `Dietary matrix served from cache in ${endTime - startTime}ms`,
        );
        return cached;
      }
    }

    // Generate fresh matrix using database function
    const { data, error } = await this.supabase.rpc('generate_dietary_matrix', {
      p_couple_id: coupleId,
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error generating dietary matrix:', error);
      throw new Error('Failed to generate dietary matrix');
    }

    const endTime = performance.now();
    const generationTime = endTime - startTime;

    // Log performance warning if exceeds 2 seconds
    if (generationTime > 2000) {
      console.warn(
        `Dietary matrix generation took ${generationTime}ms - exceeds 2s target`,
      );
    } else {
      console.log(`Dietary matrix generated in ${generationTime}ms`);
    }

    return data as DietaryMatrix;
  }

  /**
   * Get cached dietary matrix
   */
  private async getCachedMatrix(
    coupleId: string,
    eventId: string,
  ): Promise<DietaryMatrix | null> {
    const { data, error } = await this.supabase
      .from('dietary_matrix_cache')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('event_id', eventId)
      .eq('is_valid', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      summary: data.dietary_summary,
      allergens: data.allergen_matrix,
      severity: data.severity_breakdown,
      cached: true,
      cachedAt: new Date(data.generated_at),
      totalRequirements: data.dietary_summary?.total_requirements || 0,
      criticalAllergies: data.allergen_matrix?.critical || [],
      kitchenRequirements: data.dietary_summary?.kitchen_requirements || {},
      generatedAt: new Date(data.generated_at),
    };
  }

  /**
   * Generate catering report with encrypted medical data
   */
  async generateCateringReport(
    coupleId: string,
    eventDate: Date,
    includeEmergencyInfo = false,
  ): Promise<CateringReport> {
    // Generate dietary matrix first
    const matrix = await this.generateDietaryMatrix(coupleId);

    // Get critical allergies if requested
    const criticalData = includeEmergencyInfo
      ? await this.getCriticalAllergies(coupleId)
      : null;

    const reportData = {
      couple_id: coupleId,
      event_date: eventDate.toISOString(),
      total_guests: matrix.totalRequirements,
      dietary_breakdown: matrix.summary,
      allergen_list: matrix.allergens,
      special_instructions: this.generateSpecialInstructions(matrix),
    };

    const { data, error } = await this.supabase
      .from('catering_dietary_reports')
      .insert(reportData)
      .select()
      .single();

    if (error) {
      console.error('Error generating catering report:', error);
      throw new Error('Failed to generate catering report');
    }

    // Log report generation
    await this.logAuditEvent({
      action: 'exported',
      accessReason: `Catering report generated for ${eventDate.toLocaleDateString()}`,
      changesMade: { includeEmergencyInfo },
    });

    return this.transformCateringReport(data);
  }

  /**
   * Get critical allergies for emergency planning
   */
  private async getCriticalAllergies(coupleId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('guest_dietary_requirements')
      .select(
        `
        *,
        guests!inner(
          id,
          first_name,
          last_name,
          couple_id
        ),
        dietary_types (*)
      `,
      )
      .eq('guests.couple_id', coupleId)
      .in('severity', ['life_threatening', 'severe_allergy']);

    if (error) {
      console.error('Error fetching critical allergies:', error);
      throw new Error('Failed to fetch critical allergies');
    }

    // Log emergency access
    await this.logAuditEvent({
      action: 'emergency_accessed',
      accessReason: 'Critical allergies accessed for emergency planning',
      emergencyOverride: true,
    });

    return data || [];
  }

  /**
   * Generate special instructions based on dietary matrix
   */
  private generateSpecialInstructions(matrix: DietaryMatrix): string {
    const instructions: string[] = [];

    if (matrix.criticalAllergies.length > 0) {
      instructions.push(
        `⚠️ CRITICAL ALLERGIES: ${matrix.criticalAllergies.join(', ')}`,
      );
      instructions.push(
        'Ensure EpiPens are available and staff are briefed on emergency procedures',
      );
    }

    if (matrix.kitchenRequirements.allergenFreeZone) {
      instructions.push('Allergen-free preparation zone required');
    }

    if (matrix.kitchenRequirements.separatePrepNeeded) {
      instructions.push(
        'Separate preparation areas needed to prevent cross-contamination',
      );
    }

    const severeCount = matrix.severity?.life_threatening?.count || 0;
    if (severeCount > 0) {
      instructions.push(
        `${severeCount} guest(s) with life-threatening conditions - extreme caution required`,
      );
    }

    return instructions.join('\n');
  }

  /**
   * Search dietary requirements with performance optimization
   */
  async searchDietaryRequirements(
    coupleId: string,
    searchTerm?: string,
    severity?: DietarySeverity,
    category?: DietaryCategory,
  ): Promise<GuestDietaryRequirement[]> {
    let query = this.supabase
      .from('guest_dietary_requirements')
      .select(
        `
        *,
        guests!inner(
          id,
          first_name,
          last_name,
          couple_id
        ),
        dietary_types (*)
      `,
      )
      .eq('guests.couple_id', coupleId);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (category) {
      query = query.eq('dietary_types.category', category);
    }

    if (searchTerm) {
      query = query.or(`
        dietary_types.name.ilike.%${searchTerm}%,
        description.ilike.%${searchTerm}%
      `);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error searching dietary requirements:', error);
      throw new Error('Failed to search dietary requirements');
    }

    return this.transformDietaryRequirements(data || []);
  }

  /**
   * Verify dietary requirement (for medical validation)
   */
  async verifyDietaryRequirement(
    requirementId: string,
    verifiedBy: string,
  ): Promise<GuestDietaryRequirement> {
    return this.updateDietaryRequirement(requirementId, {
      verifiedBy,
    });
  }

  /**
   * Get audit log for compliance
   */
  async getAuditLog(filters: {
    guestId?: string;
    requirementId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]> {
    let query = this.supabase
      .from('dietary_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.guestId) {
      query = query.eq('guest_id', filters.guestId);
    }

    if (filters.requirementId) {
      query = query.eq('requirement_id', filters.requirementId);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit log:', error);
      throw new Error('Failed to fetch audit log');
    }

    return data || [];
  }

  /**
   * Log audit event for compliance
   */
  private async logAuditEvent(event: Partial<AuditLogEntry>): Promise<void> {
    const { data: user } = await this.supabase.auth.getUser();

    const auditData = {
      ...event,
      performed_by: user?.user?.id || 'system',
      ip_address:
        typeof window !== 'undefined' ? await this.getClientIP() : null,
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
      legitimate_access: event.legitimateAccess !== false,
      emergency_override: event.emergencyOverride || false,
    };

    const { error } = await this.supabase
      .from('dietary_audit_log')
      .insert(auditData);

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get client IP for audit logging
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Transform database records to TypeScript types
   */
  private transformDietaryTypes(data: any[]): DietaryType[] {
    return data.map((type) => ({
      id: type.id,
      name: type.name,
      category: type.category,
      commonAllergens: type.common_allergens || [],
      crossContaminationRisk: type.cross_contamination_risk,
      requiresMedicalAttention: type.requires_medical_attention,
      standardSubstitutes: type.standard_substitutes || {},
      cateringNotes: type.catering_notes,
      icon: type.icon,
      colorCode: type.color_code,
      displayOrder: type.display_order,
      isActive: type.is_active,
    }));
  }

  private transformDietaryRequirements(data: any[]): GuestDietaryRequirement[] {
    return data.map((req) => this.transformDietaryRequirement(req));
  }

  private transformDietaryRequirement(req: any): GuestDietaryRequirement {
    return {
      id: req.id,
      guestId: req.guest_id,
      dietaryTypeId: req.dietary_type_id,
      severity: req.severity,
      description: req.description,
      verifiedBy: req.verified_by,
      verifiedAt: req.verified_at ? new Date(req.verified_at) : undefined,
      crossContaminationSeverity: req.cross_contamination_severity,
      kitchenSeparationRequired: req.kitchen_separation_required,
      lastReviewed: new Date(req.last_reviewed),
      reviewRequired: req.review_required,
      createdAt: new Date(req.created_at),
      updatedAt: new Date(req.updated_at),
      dietaryType: req.dietary_types
        ? this.transformDietaryTypes([req.dietary_types])[0]
        : undefined,
      guestName: req.guests
        ? `${req.guests.first_name} ${req.guests.last_name}`
        : undefined,
    };
  }

  private transformCateringReport(data: any): CateringReport {
    return {
      id: data.id,
      coupleId: data.couple_id,
      eventDate: new Date(data.event_date),
      totalGuests: data.total_guests,
      dietaryBreakdown: data.dietary_breakdown,
      allergenList: data.allergen_list,
      specialInstructions: data.special_instructions,
      generatedAt: new Date(data.generated_at),
      sharedWith: data.shared_with || [],
      lastAccessed: data.last_accessed
        ? new Date(data.last_accessed)
        : undefined,
      accessCount: data.access_count,
    };
  }
}

// Cached instance
const dietaryRequirementsService = new DietaryRequirementsService();

// React cache wrapper for server components
export const getDietaryTypes = cache(async (category?: DietaryCategory) =>
  dietaryRequirementsService.getDietaryTypes(category),
);

export const getGuestDietaryRequirements = cache(async (guestId: string) =>
  dietaryRequirementsService.getGuestDietaryRequirements(guestId),
);

export const generateDietaryMatrix = cache(
  async (coupleId: string, eventId?: string) =>
    dietaryRequirementsService.generateDietaryMatrix(coupleId, eventId),
);

export default dietaryRequirementsService;
