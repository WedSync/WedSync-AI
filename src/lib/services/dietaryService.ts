/**
 * WS-152: Dietary Requirements Service
 * CRITICAL SERVICE: Handles life-threatening medical information
 *
 * Safety Features:
 * - Multi-layer validation for critical allergies
 * - Cross-contamination risk analysis
 * - Emergency contact verification
 * - Audit logging for all modifications
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/logger';
import {
  DietaryRequirement,
  DietaryMatrix,
  CriticalAlert,
  DietarySeverity,
  DietaryType,
  AllergenType,
  DietarySummary,
  AllergenMatrix,
  CrossContaminationMap,
  KitchenInstructions,
  CatererExport,
  KitchenCard,
  AllergenGuide,
  EmergencyProcedures,
  TableDietaryInfo,
  GuestAllergenInfo,
  AllergenCombination,
  PreparationZone,
  ServiceInstruction,
  EmergencyContact,
} from '@/types/dietary';
import {
  validateLifeThreateningRequirement,
  validateCrossContaminationRisks,
  sanitizeMedicalData,
  CreateDietaryRequirementInput,
  UpdateDietaryRequirementInput,
} from '@/lib/validations/dietary';

export class DietaryService {
  private supabase;
  private readonly CRITICAL_SEVERITY_LEVELS = [
    DietarySeverity.LIFE_THREATENING,
    DietarySeverity.SEVERE,
  ];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Create a new dietary requirement with safety validation
   */
  async createDietaryRequirement(
    data: CreateDietaryRequirementInput,
    userId: string,
  ): Promise<DietaryRequirement> {
    try {
      // Critical validation for life-threatening conditions
      const validationErrors = validateLifeThreateningRequirement(data);
      if (
        validationErrors.length > 0 &&
        data.severity === DietarySeverity.LIFE_THREATENING
      ) {
        throw new Error(
          `Critical validation failed: ${validationErrors.join(', ')}`,
        );
      }

      // Determine if kitchen alert is required
      const kitchen_alert_required =
        this.CRITICAL_SEVERITY_LEVELS.includes(data.severity) ||
        data.cross_contamination_risk;

      const requirement = {
        ...data,
        kitchen_alert_required,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: userId,
      };

      // Log critical medical information creation (sanitized)
      await this.auditLog('CREATE_DIETARY_REQUIREMENT', {
        guest_id: data.guest_id,
        severity: data.severity,
        type: data.type,
        cross_contamination_risk: data.cross_contamination_risk,
        created_by: userId,
      });

      const { data: inserted, error } = await this.supabase
        .from('dietary_requirements')
        .insert(requirement)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create dietary requirement', {
          error,
          guest_id: data.guest_id,
        });
        throw error;
      }

      // Send alert for critical allergies
      if (data.severity === DietarySeverity.LIFE_THREATENING) {
        await this.sendCriticalAllergyAlert(inserted);
      }

      return inserted;
    } catch (error) {
      logger.error('Error creating dietary requirement', {
        error,
        sanitized_data: sanitizeMedicalData(data),
      });
      throw error;
    }
  }

  /**
   * Update dietary requirement with safety checks
   */
  async updateDietaryRequirement(
    requirementId: string,
    data: UpdateDietaryRequirementInput,
    userId: string,
  ): Promise<DietaryRequirement> {
    try {
      // Get existing requirement to check severity changes
      const { data: existing } = await this.supabase
        .from('dietary_requirements')
        .select()
        .eq('id', requirementId)
        .single();

      if (!existing) {
        throw new Error('Dietary requirement not found');
      }

      // Validate if upgrading to life-threatening
      if (
        data.severity === DietarySeverity.LIFE_THREATENING &&
        existing.severity !== DietarySeverity.LIFE_THREATENING
      ) {
        const validationErrors = validateLifeThreateningRequirement({
          ...existing,
          ...data,
        });
        if (validationErrors.length > 0) {
          throw new Error(
            `Cannot upgrade to life-threatening without: ${validationErrors.join(', ')}`,
          );
        }
      }

      const kitchen_alert_required =
        (data.severity &&
          this.CRITICAL_SEVERITY_LEVELS.includes(data.severity)) ||
        data.cross_contamination_risk ||
        existing.kitchen_alert_required;

      const update = {
        ...data,
        kitchen_alert_required,
        updated_at: new Date(),
        updated_by: userId,
      };

      // Audit log for tracking changes
      await this.auditLog('UPDATE_DIETARY_REQUIREMENT', {
        requirement_id: requirementId,
        changes: Object.keys(data),
        severity_change: existing.severity !== data.severity,
        updated_by: userId,
      });

      const { data: updated, error } = await this.supabase
        .from('dietary_requirements')
        .update(update)
        .eq('id', requirementId)
        .select()
        .single();

      if (error) throw error;

      // Alert on critical changes
      if (
        data.severity === DietarySeverity.LIFE_THREATENING &&
        existing.severity !== DietarySeverity.LIFE_THREATENING
      ) {
        await this.sendCriticalAllergyAlert(updated);
      }

      return updated;
    } catch (error) {
      logger.error('Error updating dietary requirement', {
        error,
        requirement_id: requirementId,
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive dietary matrix for an event
   * Performance target: <2 seconds for 500 guests
   */
  async generateDietaryMatrix(
    coupleId: string,
    options: {
      includeTableAssignments?: boolean;
      severityFilter?: DietarySeverity[];
      allergenFilter?: AllergenType[];
    } = {},
  ): Promise<DietaryMatrix> {
    const startTime = Date.now();

    try {
      // Fetch all dietary requirements for the couple's guests
      const { data: requirements, error } = await this.supabase
        .from('dietary_requirements')
        .select(
          `
          *,
          guests!inner(
            id,
            first_name,
            last_name,
            table_number,
            couple_id
          )
        `,
        )
        .eq('guests.couple_id', coupleId);

      if (error) throw error;

      // Apply filters
      let filteredRequirements = requirements || [];
      if (options.severityFilter?.length) {
        filteredRequirements = filteredRequirements.filter((r) =>
          options.severityFilter!.includes(r.severity),
        );
      }
      if (options.allergenFilter?.length) {
        filteredRequirements = filteredRequirements.filter(
          (r) => r.allergen && options.allergenFilter!.includes(r.allergen),
        );
      }

      // Generate critical alerts
      const criticalAlerts = this.generateCriticalAlerts(filteredRequirements);

      // Generate dietary summary
      const dietarySummary = this.generateDietarySummary(filteredRequirements);

      // Generate allergen matrix with cross-contamination analysis
      const allergenMatrix = this.generateAllergenMatrix(filteredRequirements);

      // Generate kitchen instructions
      const kitchenInstructions = this.generateKitchenInstructions(
        filteredRequirements,
        allergenMatrix,
      );

      // Collect emergency contacts
      const emergencyContacts =
        this.collectEmergencyContacts(filteredRequirements);

      // Table assignments if requested
      let tableAssignments: TableDietaryInfo[] | undefined;
      if (options.includeTableAssignments) {
        tableAssignments = this.generateTableAssignments(filteredRequirements);
      }

      const matrix: DietaryMatrix = {
        couple_id: coupleId,
        event_date: new Date(), // Should be fetched from event data
        guest_count: filteredRequirements.length,
        critical_alerts: criticalAlerts,
        dietary_summary: dietarySummary,
        allergen_matrix: allergenMatrix,
        table_assignments: tableAssignments,
        kitchen_instructions: kitchenInstructions,
        emergency_contacts: emergencyContacts,
        generated_at: new Date(),
      };

      // Performance logging
      const generationTime = Date.now() - startTime;
      if (generationTime > 2000) {
        logger.warn('Dietary matrix generation exceeded 2s target', {
          couple_id: coupleId,
          guest_count: filteredRequirements.length,
          generation_time_ms: generationTime,
        });
      }

      // Cache the matrix for quick retrieval
      await this.cacheDietaryMatrix(coupleId, matrix);

      return matrix;
    } catch (error) {
      logger.error('Error generating dietary matrix', {
        error,
        couple_id: coupleId,
      });
      throw error;
    }
  }

  /**
   * Generate critical alerts for life-threatening conditions
   */
  private generateCriticalAlerts(requirements: any[]): CriticalAlert[] {
    return requirements
      .filter((r) => this.CRITICAL_SEVERITY_LEVELS.includes(r.severity))
      .map((r) => ({
        guest_id: r.guest_id,
        guest_name: `${r.guests.first_name} ${r.guests.last_name}`,
        table_number: r.guests.table_number,
        allergen: r.allergen,
        severity: r.severity,
        description: r.description,
        medical_notes: r.medical_notes,
        emergency_medication: r.emergency_medication,
        cross_contamination_risk: r.cross_contamination_risk,
        emergency_contact: r.emergency_contact,
      }))
      .sort((a, b) => {
        // Sort by severity (life-threatening first)
        const severityOrder = {
          [DietarySeverity.LIFE_THREATENING]: 0,
          [DietarySeverity.SEVERE]: 1,
          [DietarySeverity.MODERATE]: 2,
          [DietarySeverity.MILD]: 3,
          [DietarySeverity.PREFERENCE]: 4,
        };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Generate comprehensive dietary summary statistics
   */
  private generateDietarySummary(requirements: any[]): DietarySummary {
    const summary: DietarySummary = {
      total_dietary_requirements: requirements.length,
      life_threatening_count: 0,
      severe_count: 0,
      moderate_count: 0,
      by_type: {} as Record<DietaryType, number>,
      by_allergen: {} as Record<AllergenType, number>,
      cross_contamination_risks: 0,
    };

    for (const req of requirements) {
      // Count by severity
      switch (req.severity) {
        case DietarySeverity.LIFE_THREATENING:
          summary.life_threatening_count++;
          break;
        case DietarySeverity.SEVERE:
          summary.severe_count++;
          break;
        case DietarySeverity.MODERATE:
          summary.moderate_count++;
          break;
      }

      // Count by type
      summary.by_type[req.type] = (summary.by_type[req.type] || 0) + 1;

      // Count by allergen
      if (req.allergen) {
        summary.by_allergen[req.allergen] =
          (summary.by_allergen[req.allergen] || 0) + 1;
      }

      // Count cross-contamination risks
      if (req.cross_contamination_risk) {
        summary.cross_contamination_risks++;
      }
    }

    return summary;
  }

  /**
   * Generate allergen matrix with cross-contamination analysis
   */
  private generateAllergenMatrix(requirements: any[]): AllergenMatrix {
    const allergens = new Set<AllergenType>();
    const affectedGuests: Record<AllergenType, GuestAllergenInfo[]> = {};

    // Collect all unique allergens and affected guests
    for (const req of requirements) {
      if (req.allergen) {
        allergens.add(req.allergen);

        if (!affectedGuests[req.allergen]) {
          affectedGuests[req.allergen] = [];
        }

        affectedGuests[req.allergen].push({
          guest_id: req.guest_id,
          guest_name: `${req.guests.first_name} ${req.guests.last_name}`,
          table_number: req.guests.table_number,
          severity: req.severity,
          requires_epipen: req.emergency_medication
            ?.toLowerCase()
            .includes('epipen'),
          notes: req.medical_notes,
        });
      }
    }

    // Analyze cross-contamination risks
    const crossContaminationMap = this.analyzeCrossContamination(
      Array.from(allergens),
      affectedGuests,
    );

    return {
      allergens: Array.from(allergens),
      affected_guests: affectedGuests,
      cross_contamination_map: crossContaminationMap,
    };
  }

  /**
   * Analyze cross-contamination risks between allergens
   */
  private analyzeCrossContamination(
    allergens: AllergenType[],
    affectedGuests: Record<AllergenType, GuestAllergenInfo[]>,
  ): CrossContaminationMap {
    const highRiskCombinations: AllergenCombination[] = [];
    const sharedEquipmentConcerns: string[] = [];
    const preparationWarnings: string[] = [];

    // High-risk allergen pairs
    const riskPairs = [
      {
        pair: [AllergenType.PEANUTS, AllergenType.TREE_NUTS],
        risk: 'HIGH' as const,
      },
      {
        pair: [AllergenType.WHEAT, AllergenType.GLUTEN],
        risk: 'HIGH' as const,
      },
      {
        pair: [AllergenType.MILK, AllergenType.LACTOSE],
        risk: 'HIGH' as const,
      },
      {
        pair: [AllergenType.FISH, AllergenType.SHELLFISH],
        risk: 'MEDIUM' as const,
      },
    ];

    // Check for risky combinations present
    for (const { pair, risk } of riskPairs) {
      const hasFirst = allergens.includes(pair[0]);
      const hasSecond = allergens.includes(pair[1]);

      if (hasFirst && hasSecond) {
        const affected = [
          ...(affectedGuests[pair[0]] || []),
          ...(affectedGuests[pair[1]] || []),
        ].map((g) => g.guest_name);

        highRiskCombinations.push({
          allergen1: pair[0],
          allergen2: pair[1],
          risk_level: risk,
          affected_guests: Array.from(new Set(affected)),
          mitigation_steps: this.getMitigationSteps(pair[0], pair[1]),
        });
      }
    }

    // Equipment concerns for specific allergens
    if (allergens.includes(AllergenType.GLUTEN)) {
      sharedEquipmentConcerns.push(
        'Dedicated gluten-free preparation area required',
      );
      sharedEquipmentConcerns.push(
        'Separate toaster and cutting boards for gluten-free items',
      );
    }

    if (
      allergens.includes(AllergenType.PEANUTS) ||
      allergens.includes(AllergenType.TREE_NUTS)
    ) {
      sharedEquipmentConcerns.push('Nut-free zone required in kitchen');
      sharedEquipmentConcerns.push(
        'Dedicated utensils for nut-free meal preparation',
      );
      preparationWarnings.push(
        'Prepare nut-free meals first to avoid contamination',
      );
    }

    if (allergens.includes(AllergenType.SHELLFISH)) {
      sharedEquipmentConcerns.push('Separate cooking surfaces for shellfish');
      preparationWarnings.push(
        'Use dedicated fryer oil if serving fried shellfish',
      );
    }

    // Check for airborne allergen risks
    const airborneRisks = [
      AllergenType.PEANUTS,
      AllergenType.FISH,
      AllergenType.WHEAT,
    ];
    const presentAirborne = allergens.filter((a) => airborneRisks.includes(a));
    if (presentAirborne.length > 0) {
      preparationWarnings.push(
        `Airborne allergen risk: ${presentAirborne.join(', ')}. Ensure proper ventilation.`,
      );
    }

    return {
      high_risk_combinations: highRiskCombinations,
      shared_equipment_concerns: sharedEquipmentConcerns,
      preparation_warnings: preparationWarnings,
    };
  }

  /**
   * Get specific mitigation steps for allergen combinations
   */
  private getMitigationSteps(
    allergen1: AllergenType,
    allergen2: AllergenType,
  ): string[] {
    const steps: string[] = [];

    // Nut-related mitigations
    if (
      [allergen1, allergen2].some(
        (a) => a === AllergenType.PEANUTS || a === AllergenType.TREE_NUTS,
      )
    ) {
      steps.push('Prepare nut-free meals in completely separate area');
      steps.push(
        'Staff handling nuts must wash hands and change gloves before handling other food',
      );
      steps.push('Use color-coded utensils for nut-free preparation');
      steps.push('Label all nut-free items clearly');
    }

    // Gluten-related mitigations
    if (
      [allergen1, allergen2].some(
        (a) => a === AllergenType.GLUTEN || a === AllergenType.WHEAT,
      )
    ) {
      steps.push('Use dedicated gluten-free preparation surfaces');
      steps.push(
        'Store gluten-free ingredients separately and above gluten-containing items',
      );
      steps.push('Clean all surfaces thoroughly between preparations');
    }

    // Seafood-related mitigations
    if (
      [allergen1, allergen2].some(
        (a) => a === AllergenType.FISH || a === AllergenType.SHELLFISH,
      )
    ) {
      steps.push('Cook seafood in dedicated pans/grills');
      steps.push('Use separate oil for frying seafood');
      steps.push(
        'Store seafood in sealed containers away from other ingredients',
      );
    }

    return steps;
  }

  /**
   * Generate detailed kitchen instructions
   */
  private generateKitchenInstructions(
    requirements: any[],
    allergenMatrix: AllergenMatrix,
  ): KitchenInstructions {
    const zones: PreparationZone[] = [];
    const equipmentRequirements: string[] = [];
    const protocols: string[] = [];
    const serviceSequence: ServiceInstruction[] = [];

    // Define preparation zones based on allergens
    if (allergenMatrix.allergens.includes(AllergenType.GLUTEN)) {
      zones.push({
        zone_name: 'Gluten-Free Zone',
        allergen_free: [AllergenType.GLUTEN, AllergenType.WHEAT],
        dedicated_equipment: [
          'Cutting boards',
          'Toaster',
          'Pasta pot',
          'Colander',
        ],
        staff_requirements: ['Trained in celiac disease protocols'],
      });
    }

    if (
      allergenMatrix.allergens.some(
        (a) => a === AllergenType.PEANUTS || a === AllergenType.TREE_NUTS,
      )
    ) {
      zones.push({
        zone_name: 'Nut-Free Zone',
        allergen_free: [AllergenType.PEANUTS, AllergenType.TREE_NUTS],
        dedicated_equipment: [
          'All utensils color-coded',
          'Separate storage containers',
        ],
        staff_requirements: [
          'EpiPen trained',
          'Anaphylaxis response certified',
        ],
      });
    }

    // Equipment requirements
    if (
      requirements.some((r) => r.severity === DietarySeverity.LIFE_THREATENING)
    ) {
      equipmentRequirements.push('EpiPen stations clearly marked');
      equipmentRequirements.push('Medical kit with antihistamines');
      equipmentRequirements.push('Direct phone line to emergency services');
    }

    // Cross-contamination protocols
    protocols.push(
      'Wash hands and change gloves between handling different allergens',
    );
    protocols.push('Use color-coded cutting boards and utensils');
    protocols.push(
      'Clean all surfaces with allergen-safe cleaners between preparations',
    );
    protocols.push(
      'Never reuse oil or water that has been in contact with allergens',
    );

    // Service sequence (prioritize critical allergies)
    const tableGroups = this.groupByTable(requirements);
    let sequence = 1;

    // Serve tables with life-threatening allergies first
    for (const [table, reqs] of Object.entries(tableGroups)) {
      const hasCritical = reqs.some(
        (r) => r.severity === DietarySeverity.LIFE_THREATENING,
      );
      if (hasCritical) {
        serviceSequence.push({
          sequence: sequence++,
          table_number: parseInt(table),
          special_instructions: [
            'Verify each plate against guest dietary cards',
            'Have manager double-check life-threatening allergy plates',
          ],
          critical_guests: reqs
            .filter((r) => r.severity === DietarySeverity.LIFE_THREATENING)
            .map((r) => `${r.guests.first_name} ${r.guests.last_name}`),
        });
      }
    }

    // Then serve other tables
    for (const [table, reqs] of Object.entries(tableGroups)) {
      const hasCritical = reqs.some(
        (r) => r.severity === DietarySeverity.LIFE_THREATENING,
      );
      if (!hasCritical && reqs.length > 0) {
        serviceSequence.push({
          sequence: sequence++,
          table_number: parseInt(table),
          special_instructions: ['Standard dietary protocol'],
          critical_guests: [],
        });
      }
    }

    // Emergency procedures
    const emergencyProcedures = [
      'In case of allergic reaction, immediately call emergency services',
      'Administer EpiPen if available and guest/family approves',
      'Keep the person calm and seated upright (unless unconscious)',
      'Save the food item that caused the reaction for medical team',
      'Document the incident thoroughly',
    ];

    return {
      preparation_zones: zones,
      equipment_requirements: equipmentRequirements,
      cross_contamination_protocols: protocols,
      service_sequence: serviceSequence,
      emergency_procedures: emergencyProcedures,
    };
  }

  /**
   * Collect all emergency contacts
   */
  private collectEmergencyContacts(requirements: any[]): EmergencyContact[] {
    const contacts: EmergencyContact[] = [];
    const seen = new Set<string>();

    for (const req of requirements) {
      if (req.emergency_contact) {
        const key = `${req.emergency_contact.phone}-${req.emergency_contact.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          contacts.push({
            ...req.emergency_contact,
            guest_name: `${req.guests.first_name} ${req.guests.last_name}`,
            guest_id: req.guest_id,
          });
        }
      }
    }

    // Sort by guest severity
    return contacts.sort((a, b) => {
      const aReq = requirements.find((r) => r.guest_id === a.guest_id);
      const bReq = requirements.find((r) => r.guest_id === b.guest_id);
      const severityOrder = {
        [DietarySeverity.LIFE_THREATENING]: 0,
        [DietarySeverity.SEVERE]: 1,
        [DietarySeverity.MODERATE]: 2,
        [DietarySeverity.MILD]: 3,
        [DietarySeverity.PREFERENCE]: 4,
      };
      return (
        severityOrder[aReq?.severity || 4] - severityOrder[bReq?.severity || 4]
      );
    });
  }

  /**
   * Generate table assignment dietary information
   */
  private generateTableAssignments(requirements: any[]): TableDietaryInfo[] {
    const tableGroups = this.groupByTable(requirements);
    const assignments: TableDietaryInfo[] = [];

    for (const [table, reqs] of Object.entries(tableGroups)) {
      if (table === 'unassigned') continue;

      const allergens = new Set<AllergenType>();
      let hasCritical = false;

      for (const req of reqs) {
        if (req.allergen) allergens.add(req.allergen);
        if (this.CRITICAL_SEVERITY_LEVELS.includes(req.severity)) {
          hasCritical = true;
        }
      }

      assignments.push({
        table_number: parseInt(table),
        table_name: `Table ${table}`,
        guest_count: reqs.length,
        dietary_requirements: reqs,
        critical_alerts: hasCritical,
        allergen_summary: Array.from(allergens),
      });
    }

    return assignments.sort((a, b) => a.table_number - b.table_number);
  }

  /**
   * Group requirements by table number
   */
  private groupByTable(requirements: any[]): Record<string, any[]> {
    return requirements.reduce(
      (acc, req) => {
        const table = req.guests?.table_number || 'unassigned';
        if (!acc[table]) acc[table] = [];
        acc[table].push(req);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  /**
   * Generate caterer export with all safety information
   */
  async generateCatererExport(
    coupleId: string,
    format: 'PDF' | 'EXCEL' | 'JSON',
    options: {
      includePhotos?: boolean;
      language?: string;
      kitchenCardFormat?: 'STANDARD' | 'DETAILED' | 'COMPACT';
    } = {},
  ): Promise<CatererExport> {
    try {
      // Generate fresh dietary matrix
      const matrix = await this.generateDietaryMatrix(coupleId, {
        includeTableAssignments: true,
      });

      // Get event details
      const { data: couple } = await this.supabase
        .from('couples')
        .select('names, event_date, venue')
        .eq('id', coupleId)
        .single();

      // Generate kitchen cards
      const kitchenCards = await this.generateKitchenCards(
        matrix,
        options.kitchenCardFormat,
      );

      // Generate allergen guide
      const allergenGuide = this.generateAllergenGuide(matrix.allergen_matrix);

      // Generate emergency procedures
      const emergencyProcedures = this.generateEmergencyProcedures(
        couple?.venue,
      );

      const exportData: CatererExport = {
        event_info: {
          couple_names: couple?.names || '',
          event_date: couple?.event_date || '',
          venue: couple?.venue || '',
          guest_count: matrix.guest_count,
        },
        critical_medical_alerts: matrix.critical_alerts,
        dietary_matrix: matrix,
        kitchen_cards: kitchenCards,
        allergen_guide: allergenGuide,
        emergency_procedures: emergencyProcedures,
        contact_sheet: matrix.emergency_contacts,
        generated_at: new Date(),
        version: '2.0',
      };

      // Export based on format
      switch (format) {
        case 'PDF':
          return await this.exportToPDF(exportData, options);
        case 'EXCEL':
          return await this.exportToExcel(exportData, options);
        case 'JSON':
        default:
          return exportData;
      }
    } catch (error) {
      logger.error('Error generating caterer export', {
        error,
        couple_id: coupleId,
      });
      throw error;
    }
  }

  /**
   * Generate kitchen cards for each guest with dietary requirements
   */
  private async generateKitchenCards(
    matrix: DietaryMatrix,
    format: 'STANDARD' | 'DETAILED' | 'COMPACT' = 'STANDARD',
  ): Promise<KitchenCard[]> {
    const cards: KitchenCard[] = [];
    let cardNumber = 1;

    // Create cards for critical alerts first
    for (const alert of matrix.critical_alerts) {
      cards.push({
        card_number: cardNumber++,
        table_number: alert.table_number || 0,
        guest_name: alert.guest_name,
        dietary_requirements: [alert.description],
        allergens: alert.allergen ? [alert.allergen] : [],
        severity_indicator:
          alert.severity === DietarySeverity.LIFE_THREATENING
            ? 'CRITICAL'
            : 'HIGH',
        special_instructions: this.getSpecialInstructions(alert, format),
        plate_marking: this.getPlateMarking(alert.severity),
      });
    }

    return cards;
  }

  /**
   * Get special instructions based on alert and format
   */
  private getSpecialInstructions(
    alert: CriticalAlert,
    format: string,
  ): string[] {
    const instructions: string[] = [];

    if (alert.severity === DietarySeverity.LIFE_THREATENING) {
      instructions.push('⚠️ LIFE-THREATENING ALLERGY');
      if (alert.emergency_medication) {
        instructions.push(
          `Emergency medication: ${alert.emergency_medication}`,
        );
      }
      if (alert.cross_contamination_risk) {
        instructions.push('EXTREME CAUTION: Cross-contamination risk');
      }
    }

    if (format === 'DETAILED' && alert.medical_notes) {
      instructions.push(`Medical notes: ${alert.medical_notes}`);
    }

    return instructions;
  }

  /**
   * Get plate marking for severity level
   */
  private getPlateMarking(severity: DietarySeverity): string {
    switch (severity) {
      case DietarySeverity.LIFE_THREATENING:
        return '🔴🔴🔴'; // Triple red for critical
      case DietarySeverity.SEVERE:
        return '🔴🔴'; // Double red for severe
      case DietarySeverity.MODERATE:
        return '🟡'; // Yellow for moderate
      default:
        return '';
    }
  }

  /**
   * Generate comprehensive allergen guide
   */
  private generateAllergenGuide(allergenMatrix: AllergenMatrix): AllergenGuide {
    const legend: Record<string, any> = {};

    for (const allergen of allergenMatrix.allergens) {
      legend[allergen] = {
        code: this.getAllergenCode(allergen),
        name: allergen,
        common_sources: this.getCommonSources(allergen),
        hidden_sources: this.getHiddenSources(allergen),
        cross_contamination_risks: this.getCrossContaminationRisks(allergen),
      };
    }

    const visualIndicators = {
      [DietarySeverity.LIFE_THREATENING]: {
        color_code: '#FF0000',
        symbol: '⚠️',
        priority: 1,
        description: 'Life-threatening - Immediate medical attention required',
      },
      [DietarySeverity.SEVERE]: {
        color_code: '#FF6600',
        symbol: '⚡',
        priority: 2,
        description: 'Severe reaction - Medical attention may be required',
      },
      [DietarySeverity.MODERATE]: {
        color_code: '#FFAA00',
        symbol: '⚡',
        priority: 3,
        description: 'Moderate reaction - Discomfort expected',
      },
      [DietarySeverity.MILD]: {
        color_code: '#FFFF00',
        symbol: '👁',
        priority: 4,
        description: 'Mild reaction - Minor discomfort possible',
      },
      [DietarySeverity.PREFERENCE]: {
        color_code: '#00FF00',
        symbol: '✓',
        priority: 5,
        description: 'Preference - No medical risk',
      },
    };

    // Build cross-reference table
    const byTable: Record<number, AllergenType[]> = {};
    const byAllergen: Record<AllergenType, number[]> = {};
    const highRiskTables: number[] = [];

    for (const [allergen, guests] of Object.entries(
      allergenMatrix.affected_guests,
    )) {
      for (const guest of guests) {
        if (guest.table_number) {
          // By table
          if (!byTable[guest.table_number]) {
            byTable[guest.table_number] = [];
          }
          if (!byTable[guest.table_number].includes(allergen as AllergenType)) {
            byTable[guest.table_number].push(allergen as AllergenType);
          }

          // By allergen
          if (!byAllergen[allergen as AllergenType]) {
            byAllergen[allergen as AllergenType] = [];
          }
          if (
            !byAllergen[allergen as AllergenType].includes(guest.table_number)
          ) {
            byAllergen[allergen as AllergenType].push(guest.table_number);
          }

          // High risk tables
          if (
            guest.severity === DietarySeverity.LIFE_THREATENING &&
            !highRiskTables.includes(guest.table_number)
          ) {
            highRiskTables.push(guest.table_number);
          }
        }
      }
    }

    return {
      legend,
      visual_indicators: visualIndicators,
      cross_reference_table: {
        by_table: byTable,
        by_allergen: byAllergen,
        high_risk_tables: highRiskTables.sort((a, b) => a - b),
      },
    };
  }

  /**
   * Get allergen code for kitchen reference
   */
  private getAllergenCode(allergen: AllergenType): string {
    const codes: Record<AllergenType, string> = {
      [AllergenType.PEANUTS]: 'PN',
      [AllergenType.TREE_NUTS]: 'TN',
      [AllergenType.MILK]: 'MK',
      [AllergenType.EGGS]: 'EG',
      [AllergenType.WHEAT]: 'WH',
      [AllergenType.SOY]: 'SY',
      [AllergenType.FISH]: 'FI',
      [AllergenType.SHELLFISH]: 'SF',
      [AllergenType.SESAME]: 'SE',
      [AllergenType.CELERY]: 'CL',
      [AllergenType.MUSTARD]: 'MD',
      [AllergenType.LUPIN]: 'LP',
      [AllergenType.MOLLUSCS]: 'ML',
      [AllergenType.SULPHITES]: 'SU',
      [AllergenType.GLUTEN]: 'GL',
      [AllergenType.LACTOSE]: 'LC',
      [AllergenType.OTHER]: 'OT',
    };
    return codes[allergen] || 'XX';
  }

  /**
   * Get common sources for allergen
   */
  private getCommonSources(allergen: AllergenType): string[] {
    const sources: Record<AllergenType, string[]> = {
      [AllergenType.PEANUTS]: [
        'Peanut butter',
        'Satay sauce',
        'Some chocolates',
        'Asian cuisine',
      ],
      [AllergenType.TREE_NUTS]: [
        'Almonds',
        'Cashews',
        'Walnuts',
        'Nut oils',
        'Marzipan',
      ],
      [AllergenType.MILK]: ['Cheese', 'Butter', 'Cream', 'Yogurt', 'Ice cream'],
      [AllergenType.EGGS]: [
        'Mayonnaise',
        'Cakes',
        'Pasta',
        'Some sauces',
        'Meringue',
      ],
      [AllergenType.WHEAT]: ['Bread', 'Pasta', 'Cakes', 'Cereals', 'Beer'],
      [AllergenType.GLUTEN]: [
        'Wheat products',
        'Rye',
        'Barley',
        'Some oats',
        'Bread',
      ],
      [AllergenType.FISH]: [
        'All fish species',
        'Fish sauce',
        'Worcester sauce',
        'Caesar dressing',
      ],
      [AllergenType.SHELLFISH]: [
        'Shrimp',
        'Lobster',
        'Crab',
        'Oysters',
        'Mussels',
      ],
      [AllergenType.SOY]: ['Soy sauce', 'Tofu', 'Edamame', 'Miso', 'Tempeh'],
      [AllergenType.SESAME]: [
        'Tahini',
        'Hummus',
        'Sesame oil',
        'Some breads',
        'Halvah',
      ],
      [AllergenType.CELERY]: [
        'Celery stalks',
        'Celeriac',
        'Celery salt',
        'Some stocks',
      ],
      [AllergenType.MUSTARD]: [
        'Mustard seeds',
        'Mustard powder',
        'Prepared mustard',
        'Some sauces',
      ],
      [AllergenType.LUPIN]: [
        'Lupin flour',
        'Some pastries',
        'Some pasta',
        'Some bread',
      ],
      [AllergenType.MOLLUSCS]: [
        'Snails',
        'Squid',
        'Octopus',
        'Scallops',
        'Clams',
      ],
      [AllergenType.SULPHITES]: [
        'Wine',
        'Dried fruit',
        'Some vinegars',
        'Preserved foods',
      ],
      [AllergenType.LACTOSE]: [
        'Milk',
        'Soft cheese',
        'Cream',
        'Ice cream',
        'Butter',
      ],
      [AllergenType.OTHER]: ['Various - check with guest'],
    };
    return sources[allergen] || [];
  }

  /**
   * Get hidden sources for allergen
   */
  private getHiddenSources(allergen: AllergenType): string[] {
    const hidden: Record<AllergenType, string[]> = {
      [AllergenType.PEANUTS]: [
        'Some curries',
        'Energy bars',
        'Chili',
        'Some ice creams',
      ],
      [AllergenType.TREE_NUTS]: [
        'Pesto',
        'BBQ sauce',
        'Some cereals',
        'Mortadella',
      ],
      [AllergenType.MILK]: [
        'Processed meats',
        'Dark chocolate',
        'Some bread',
        'Wine (casein)',
      ],
      [AllergenType.EGGS]: [
        'Glazed bread',
        'Marshmallows',
        'Some pasta',
        'Foam coffee',
      ],
      [AllergenType.WHEAT]: [
        'Soy sauce',
        'Ice cream',
        'Processed meats',
        'Licorice',
      ],
      [AllergenType.GLUTEN]: [
        'Sauces',
        'Soups',
        'Processed foods',
        'Some medications',
      ],
      [AllergenType.FISH]: [
        'Salad dressings',
        'Worcestershire',
        'Pizza (anchovies)',
        'Some wines',
      ],
      [AllergenType.SHELLFISH]: [
        'Surimi',
        'Some calcium supplements',
        'Glucosamine',
        'Fish stock',
      ],
      [AllergenType.SOY]: [
        'Chocolate',
        'Cereals',
        'Baked goods',
        'Some peanut butters',
      ],
      [AllergenType.SESAME]: [
        'Some spice blends',
        'Vegetable oil',
        'Some breads',
        'Margarine',
      ],
      [AllergenType.OTHER]: ['Various - detailed check required'],
    };
    return hidden[allergen] || [];
  }

  /**
   * Get cross-contamination risks for allergen
   */
  private getCrossContaminationRisks(allergen: AllergenType): string[] {
    const risks: Record<AllergenType, string[]> = {
      [AllergenType.PEANUTS]: [
        'Shared fryers',
        'Grinding equipment',
        'Bulk bins',
      ],
      [AllergenType.TREE_NUTS]: [
        'Shared processing facilities',
        'Bakery equipment',
      ],
      [AllergenType.GLUTEN]: [
        'Shared toasters',
        'Flour dust',
        'Cutting boards',
      ],
      [AllergenType.SHELLFISH]: ['Shared fryers', 'Grills', 'Steam tables'],
      [AllergenType.FISH]: ['Shared grills', 'Fryers', 'Preparation surfaces'],
      [AllergenType.OTHER]: ['Various equipment and surfaces'],
    };
    return risks[allergen] || ['General kitchen equipment'];
  }

  /**
   * Generate emergency procedures document
   */
  private generateEmergencyProcedures(venue?: string): EmergencyProcedures {
    return {
      anaphylaxis_protocol: [
        '1. Call emergency services immediately (911/999/112)',
        '2. Help the person use their epinephrine auto-injector if available',
        '3. Have the person lie down with legs elevated (unless vomiting or difficulty breathing)',
        '4. If breathing is difficult, allow them to sit up',
        '5. Give a second dose of epinephrine after 5-15 minutes if symptoms persist',
        '6. Begin CPR if person becomes unresponsive and not breathing normally',
        '7. Keep the person warm and calm',
        '8. Save the food that caused the reaction for testing',
      ],
      emergency_services: {
        number: '911',
        venue_address: venue || 'Check with venue coordinator',
        access_instructions:
          'Main entrance - inform security of medical emergency',
      },
      medical_kit_locations: [
        'Kitchen first aid station',
        'Service bar area',
        'Venue manager office',
        'Main entrance security desk',
      ],
      trained_staff: [
        'Head chef - First Aid certified',
        'Venue manager - CPR certified',
        'Security team - Emergency response trained',
      ],
      evacuation_plan:
        'Follow venue evacuation procedures - Assembly point in main parking lot',
    };
  }

  /**
   * Cache dietary matrix for performance
   */
  private async cacheDietaryMatrix(
    coupleId: string,
    matrix: DietaryMatrix,
  ): Promise<void> {
    try {
      await this.supabase.from('dietary_matrix_cache').upsert({
        couple_id: coupleId,
        matrix_data: matrix,
        generated_at: matrix.generated_at,
        expires_at: new Date(Date.now() + 3600000), // 1 hour cache
      });
    } catch (error) {
      logger.warn('Failed to cache dietary matrix', {
        error,
        couple_id: coupleId,
      });
    }
  }

  /**
   * Export dietary matrix to PDF
   */
  private async exportToPDF(
    data: CatererExport,
    options: any,
  ): Promise<CatererExport> {
    // PDF generation would be implemented here
    // For now, return the data with PDF marker
    return {
      ...data,
      // PDF generation implementation
    };
  }

  /**
   * Export dietary matrix to Excel
   */
  private async exportToExcel(
    data: CatererExport,
    options: any,
  ): Promise<CatererExport> {
    // Excel generation would be implemented here
    // For now, return the data with Excel marker
    return {
      ...data,
      // Excel generation implementation
    };
  }

  /**
   * Send critical allergy alert
   */
  private async sendCriticalAllergyAlert(
    requirement: DietaryRequirement,
  ): Promise<void> {
    try {
      // Send alert via notification system
      await this.supabase.from('critical_alerts').insert({
        type: 'DIETARY_CRITICAL',
        severity: 'HIGH',
        title: `Critical Allergy Alert: ${requirement.allergen}`,
        message: `Life-threatening allergy registered for guest ${requirement.guest_id}`,
        metadata: {
          requirement_id: requirement.id,
          guest_id: requirement.guest_id,
          allergen: requirement.allergen,
          emergency_contact: requirement.emergency_contact,
        },
        created_at: new Date(),
      });
    } catch (error) {
      logger.error('Failed to send critical allergy alert', {
        error,
        requirement_id: requirement.id,
      });
    }
  }

  /**
   * Audit log for tracking changes to medical data
   */
  private async auditLog(action: string, data: any): Promise<void> {
    try {
      await this.supabase.from('dietary_audit_log').insert({
        action,
        data: sanitizeMedicalData(data),
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to write audit log', { error, action });
    }
  }
}

// Export singleton instance
export const dietaryService = new DietaryService();
