/**
 * WS-152: Dietary Requirements Validation Schemas
 * CRITICAL: Life-threatening medical information validation
 * Zero tolerance for validation errors
 */

import { z } from 'zod';
import { DietarySeverity, DietaryType, AllergenType } from '@/types/dietary';

// Phone number validation pattern
const phoneRegex =
  /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,12}$/;

// Emergency contact schema
export const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Emergency contact name is required').max(100),
  phone: z
    .string()
    .regex(phoneRegex, 'Valid phone number required for emergencies'),
  relationship: z.string().min(2, 'Relationship is required').max(50),
});

// Base dietary requirement schema
export const dietaryRequirementBaseSchema = z.object({
  type: z.nativeEnum(DietaryType),
  severity: z.nativeEnum(DietarySeverity),
  allergen: z.nativeEnum(AllergenType).optional(),
  description: z.string().min(3, 'Description is required').max(500),
  medical_notes: z.string().max(1000).optional(),
  emergency_medication: z.string().max(200).optional(),
  emergency_contact: emergencyContactSchema.optional(),
  cross_contamination_risk: z.boolean().default(false),
});

// Validation with severity-based requirements
export const createDietaryRequirementSchema = z
  .object({
    guest_id: z.string().uuid('Valid guest ID required'),
    ...dietaryRequirementBaseSchema.shape,
  })
  .refine(
    (data) => {
      // Life-threatening allergies MUST have emergency contact
      if (data.severity === DietarySeverity.LIFE_THREATENING) {
        return !!data.emergency_contact;
      }
      return true;
    },
    {
      message: 'Emergency contact is required for life-threatening allergies',
      path: ['emergency_contact'],
    },
  )
  .refine(
    (data) => {
      // Allergies must specify allergen type
      if (data.type === DietaryType.ALLERGY && !data.allergen) {
        return false;
      }
      return true;
    },
    {
      message: 'Allergen type must be specified for allergies',
      path: ['allergen'],
    },
  )
  .refine((data) => {
    // Life-threatening allergies should have emergency medication info
    if (
      data.severity === DietarySeverity.LIFE_THREATENING &&
      !data.emergency_medication
    ) {
      console.warn(
        `Life-threatening allergy for guest ${data.guest_id} missing emergency medication info`,
      );
    }
    return true;
  });

// Update schema with partial fields
export const updateDietaryRequirementSchema = dietaryRequirementBaseSchema
  .partial()
  .refine(
    (data) => {
      // If updating to life-threatening, require emergency contact
      if (
        data.severity === DietarySeverity.LIFE_THREATENING &&
        !data.emergency_contact
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'Emergency contact is required when updating to life-threatening severity',
      path: ['emergency_contact'],
    },
  );

// Dietary matrix request validation
export const dietaryMatrixRequestSchema = z.object({
  include_table_assignments: z.boolean().optional().default(false),
  severity_filter: z.array(z.nativeEnum(DietarySeverity)).optional(),
  allergen_filter: z.array(z.nativeEnum(AllergenType)).optional(),
});

// Caterer export request validation
export const catererExportRequestSchema = z.object({
  format: z.enum(['PDF', 'EXCEL', 'JSON']),
  include_photos: z.boolean().optional().default(false),
  language: z.string().optional().default('en'),
  kitchen_card_format: z
    .enum(['STANDARD', 'DETAILED', 'COMPACT'])
    .optional()
    .default('STANDARD'),
});

// Guest ID parameter validation
export const guestIdParamSchema = z.object({
  guest_id: z.string().uuid('Valid guest ID required'),
});

// Couple ID parameter validation
export const coupleIdParamSchema = z.object({
  couple_id: z.string().uuid('Valid couple ID required'),
});

// Requirement ID parameter validation
export const requirementIdParamSchema = z.object({
  requirement_id: z.string().uuid('Valid requirement ID required'),
});

// Batch dietary requirements creation
export const batchCreateDietarySchema = z.object({
  requirements: z
    .array(createDietaryRequirementSchema)
    .min(1, 'At least one requirement is required')
    .max(100, 'Maximum 100 requirements per batch'),
  validate_only: z.boolean().optional().default(false),
});

// Critical validation helper functions
export function validateLifeThreateningRequirement(requirement: any): string[] {
  const errors: string[] = [];

  if (requirement.severity === DietarySeverity.LIFE_THREATENING) {
    if (!requirement.emergency_contact) {
      errors.push(
        'Emergency contact is mandatory for life-threatening conditions',
      );
    }
    if (!requirement.emergency_medication) {
      errors.push('Emergency medication information should be provided');
    }
    if (!requirement.medical_notes) {
      errors.push(
        'Medical notes are recommended for life-threatening conditions',
      );
    }
    if (!requirement.cross_contamination_risk === undefined) {
      errors.push('Cross-contamination risk must be explicitly specified');
    }
  }

  if (requirement.severity === DietarySeverity.SEVERE) {
    if (!requirement.medical_notes) {
      errors.push('Medical notes are recommended for severe conditions');
    }
  }

  return errors;
}

// Validate cross-contamination risks
export function validateCrossContaminationRisks(requirements: any[]): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const highRiskAllergens = [
    AllergenType.PEANUTS,
    AllergenType.TREE_NUTS,
    AllergenType.SHELLFISH,
    AllergenType.FISH,
  ];

  const presentAllergens = requirements
    .filter((r) => r.type === DietaryType.ALLERGY)
    .map((r) => r.allergen);

  // Check for high-risk allergen combinations
  for (const allergen of highRiskAllergens) {
    if (presentAllergens.includes(allergen)) {
      const affectedGuests = requirements.filter(
        (r) => r.allergen === allergen && r.cross_contamination_risk,
      );
      if (affectedGuests.length > 0) {
        warnings.push(
          `High cross-contamination risk detected for ${allergen} affecting ${affectedGuests.length} guests`,
        );
      }
    }
  }

  // Check for conflicting requirements at same table
  const tableGroups = requirements.reduce(
    (acc, req) => {
      const table = req.table_number || 'unassigned';
      if (!acc[table]) acc[table] = [];
      acc[table].push(req);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  for (const [table, reqs] of Object.entries(tableGroups)) {
    if (table !== 'unassigned') {
      const hasNuts = reqs.some(
        (r) =>
          r.allergen === AllergenType.PEANUTS ||
          r.allergen === AllergenType.TREE_NUTS,
      );
      const hasNutAllergy = reqs.some(
        (r) =>
          (r.allergen === AllergenType.PEANUTS ||
            r.allergen === AllergenType.TREE_NUTS) &&
          r.severity === DietarySeverity.LIFE_THREATENING,
      );

      if (hasNuts && hasNutAllergy) {
        warnings.push(
          `Table ${table} has both nut-containing meals and guests with life-threatening nut allergies`,
        );
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// Sanitize sensitive medical data for logs
export function sanitizeMedicalData(data: any): any {
  const sanitized = { ...data };

  if (sanitized.medical_notes) {
    sanitized.medical_notes = '[REDACTED]';
  }

  if (sanitized.emergency_contact) {
    sanitized.emergency_contact = {
      ...sanitized.emergency_contact,
      phone: sanitized.emergency_contact.phone.replace(/\d{4,}/, '****'),
    };
  }

  if (sanitized.emergency_medication) {
    sanitized.emergency_medication = '[MEDICATION_INFO]';
  }

  return sanitized;
}

// Export all schemas
export const dietaryValidationSchemas = {
  createDietaryRequirement: createDietaryRequirementSchema,
  updateDietaryRequirement: updateDietaryRequirementSchema,
  dietaryMatrixRequest: dietaryMatrixRequestSchema,
  catererExportRequest: catererExportRequestSchema,
  guestIdParam: guestIdParamSchema,
  coupleIdParam: coupleIdParamSchema,
  requirementIdParam: requirementIdParamSchema,
  batchCreateDietary: batchCreateDietarySchema,
};

// Type exports for use in services
export type CreateDietaryRequirementInput = z.infer<
  typeof createDietaryRequirementSchema
>;
export type UpdateDietaryRequirementInput = z.infer<
  typeof updateDietaryRequirementSchema
>;
export type DietaryMatrixRequestInput = z.infer<
  typeof dietaryMatrixRequestSchema
>;
export type CatererExportRequestInput = z.infer<
  typeof catererExportRequestSchema
>;
