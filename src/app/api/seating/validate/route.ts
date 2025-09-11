import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { conflictDetector } from '@/lib/algorithms/seating-optimization';
import {
  verifyCoupleAccess,
  withSecureValidation,
} from '@/lib/validation/middleware';

// Validation schema for seating validation
const seatingValidationSchema = z.object({
  couple_id: z.string().uuid(),
  table_assignments: z.array(
    z.object({
      guest_id: z.string().uuid(),
      table_number: z.number().int().positive(),
      seat_number: z.number().int().positive().optional(),
    }),
  ),
  check_relationships: z.boolean().default(true),
  check_capacity: z.boolean().default(true),
  check_dietary_needs: z.boolean().default(true),
  check_age_appropriateness: z.boolean().default(true),
});

// POST /api/seating/validate - Check for relationship conflicts and seating issues
export const POST = withSecureValidation(
  seatingValidationSchema,
  async (
    request: NextRequest,
    validatedData: z.infer<typeof seatingValidationSchema>,
  ) => {
    try {
      const supabase = await createClient();

      // Verify couple ownership
      await verifyCoupleAccess(request, validatedData.couple_id);

      // Get guest data
      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select(
          `
          id,
          first_name,
          last_name,
          category,
          side,
          age_group,
          plus_one,
          dietary_restrictions,
          special_needs,
          household_id,
          tags
        `,
        )
        .eq('couple_id', validatedData.couple_id)
        .in(
          'id',
          validatedData.table_assignments.map((a) => a.guest_id),
        );

      if (guestsError || !guests) {
        return NextResponse.json(
          { error: 'Failed to fetch guest data' },
          { status: 500 },
        );
      }

      // Get guest relationships if checking relationships
      let relationships: any[] = [];
      if (validatedData.check_relationships) {
        const { data: relationshipsData, error: relationshipsError } =
          await supabase
            .from('guest_relationships')
            .select('*')
            .eq('couple_id', validatedData.couple_id);

        if (relationshipsError) {
          console.warn('Failed to fetch relationships:', relationshipsError);
        } else {
          relationships = relationshipsData || [];
        }
      }

      // Get table configurations if checking capacity
      let tableConfigurations: any[] = [];
      if (validatedData.check_capacity) {
        const { data: tables, error: tablesError } = await supabase
          .from('reception_tables')
          .select('*')
          .eq('couple_id', validatedData.couple_id);

        if (tablesError) {
          console.warn('Failed to fetch table configurations:', tablesError);
        } else {
          tableConfigurations = tables || [];
        }
      }

      // Run conflict detection
      const validationResult = await conflictDetector.validate({
        guests,
        relationships,
        tableAssignments: validatedData.table_assignments,
        tableConfigurations,
        checkOptions: {
          checkRelationships: validatedData.check_relationships,
          checkCapacity: validatedData.check_capacity,
          checkDietaryNeeds: validatedData.check_dietary_needs,
          checkAgeAppropriateness: validatedData.check_age_appropriateness,
        },
      });

      // Log conflicts for audit trail
      if (validationResult.conflicts.length > 0) {
        await supabase.from('seating_validation_logs').insert({
          couple_id: validatedData.couple_id,
          validation_type: 'conflict_check',
          conflicts_found: validationResult.conflicts.length,
          conflict_details: validationResult.conflicts,
          table_assignments: validatedData.table_assignments,
        });
      }

      return NextResponse.json({
        success: true,
        is_valid: validationResult.isValid,
        conflicts: validationResult.conflicts,
        warnings: validationResult.warnings,
        suggestions: validationResult.suggestions,
        validation_summary: {
          total_guests: guests.length,
          total_conflicts: validationResult.conflicts.length,
          conflict_types: validationResult.conflictTypes,
          severity_breakdown: validationResult.severityBreakdown,
        },
      });
    } catch (error) {
      console.error('Seating validation error:', error);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 },
      );
    }
  },
);

// GET /api/seating/validate/rules - Get validation rules and conflict types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coupleId = searchParams.get('couple_id');

    if (!coupleId) {
      return NextResponse.json(
        { error: 'couple_id is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    await verifyCoupleAccess(request, coupleId);

    // Return available validation rules and conflict types
    const validationRules = {
      relationship_conflicts: {
        description: 'Detects guests who should not be seated together',
        severity_levels: ['high', 'medium', 'low'],
        conflict_types: [
          'incompatible_personalities',
          'family_disputes',
          'ex_relationships',
          'business_conflicts',
        ],
      },
      capacity_violations: {
        description: 'Checks if table capacity limits are exceeded',
        severity_levels: ['high'],
        rules: ['maximum_capacity_per_table', 'minimum_guests_per_table'],
      },
      dietary_conflicts: {
        description: 'Identifies dietary restriction conflicts',
        severity_levels: ['medium', 'low'],
        considerations: [
          'allergies_proximity',
          'cultural_dietary_needs',
          'special_meal_requirements',
        ],
      },
      age_appropriateness: {
        description: 'Ensures age-appropriate seating arrangements',
        severity_levels: ['medium', 'low'],
        rules: [
          'children_with_guardians',
          'elderly_accessibility',
          'adult_supervision_ratios',
        ],
      },
    };

    return NextResponse.json({
      success: true,
      validation_rules: validationRules,
      supported_checks: [
        'check_relationships',
        'check_capacity',
        'check_dietary_needs',
        'check_age_appropriateness',
      ],
    });
  } catch (error) {
    console.error('Get validation rules error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
