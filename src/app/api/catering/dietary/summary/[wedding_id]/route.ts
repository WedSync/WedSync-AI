// /api/catering/dietary/summary/[wedding_id]/route.ts
// WS-254: Dietary Requirements Summary API - SECURED
// Provides quick overview of all dietary requirements for a wedding

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withSecureValidation } from '@/lib/security/withSecureValidation';

interface DietaryRequirement {
  id: string;
  guest_name: string;
  category: 'allergy' | 'diet' | 'medical' | 'preference';
  severity: number;
  notes: string;
  verified: boolean;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

interface DietarySummary {
  wedding_id: string;
  wedding_name: string;
  total_guests: number;
  requirements: DietaryRequirement[];
  summary_stats: {
    total_requirements: number;
    by_category: {
      allergy: number;
      diet: number;
      medical: number;
      preference: number;
    };
    by_severity: {
      level_1: number;
      level_2: number;
      level_3: number;
      level_4: number;
      level_5: number;
    };
    high_severity_count: number;
    unverified_count: number;
    guests_with_requirements: number;
    most_common_requirements: Array<{
      requirement: string;
      count: number;
      category: string;
    }>;
  };
  compliance_insights: {
    risk_assessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    risk_factors: string[];
    recommendations: string[];
  };
}

// GET /api/catering/dietary/summary/[wedding_id] - Get comprehensive dietary summary (SECURED)
export async function GET(
  request: NextRequest,
  { params }: { params: { wedding_id: string } },
) {
  return withSecureValidation(
    request,
    async ({ user, request: validatedRequest }) => {
      try {
        const { wedding_id } = params;

        // Validate wedding ID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(wedding_id)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid wedding ID format',
              code: 'INVALID_WEDDING_ID',
            },
            { status: 400 },
          );
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Verify user has access to the wedding and get wedding details
        const { data: wedding, error: weddingError } = await supabase
          .from('weddings')
          .select('id, couple_name, guest_count')
          .eq('id', wedding_id)
          .eq('supplier_id', user.id)
          .single();

        if (weddingError || !wedding) {
          return NextResponse.json(
            {
              success: false,
              error: 'Wedding not found or access denied',
              code: 'ACCESS_DENIED',
            },
            { status: 404 },
          );
        }

        // Get all dietary requirements for this wedding
        const { data: requirements, error: reqError } = await supabase
          .from('dietary_requirements')
          .select(
            `
            id,
            guest_name,
            category,
            severity,
            notes,
            verified,
            emergency_contact,
            created_at,
            updated_at
          `,
          )
          .eq('wedding_id', wedding_id)
          .eq('supplier_id', user.id)
          .order('severity', { ascending: false })
          .order('guest_name', { ascending: true });

        if (reqError) {
          throw new Error(
            `Failed to fetch dietary requirements: ${reqError.message}`,
          );
        }

        const dietaryRequirements: DietaryRequirement[] = requirements || [];

        // Calculate summary statistics
        const totalRequirements = dietaryRequirements.length;
        const byCategory = {
          allergy: dietaryRequirements.filter((r) => r.category === 'allergy')
            .length,
          diet: dietaryRequirements.filter((r) => r.category === 'diet').length,
          medical: dietaryRequirements.filter((r) => r.category === 'medical')
            .length,
          preference: dietaryRequirements.filter(
            (r) => r.category === 'preference',
          ).length,
        };

        const bySeverity = {
          level_1: dietaryRequirements.filter((r) => r.severity === 1).length,
          level_2: dietaryRequirements.filter((r) => r.severity === 2).length,
          level_3: dietaryRequirements.filter((r) => r.severity === 3).length,
          level_4: dietaryRequirements.filter((r) => r.severity === 4).length,
          level_5: dietaryRequirements.filter((r) => r.severity === 5).length,
        };

        const highSeverityCount = dietaryRequirements.filter(
          (r) => r.severity >= 4,
        ).length;
        const unverifiedCount = dietaryRequirements.filter(
          (r) => !r.verified,
        ).length;
        const guestsWithRequirements = new Set(
          dietaryRequirements.map((r) => r.guest_name),
        ).size;

        // Find most common requirements
        const requirementCounts = new Map<
          string,
          { count: number; category: string }
        >();
        dietaryRequirements.forEach((req) => {
          const key = req.notes.toLowerCase().trim();
          if (requirementCounts.has(key)) {
            requirementCounts.get(key)!.count++;
          } else {
            requirementCounts.set(key, { count: 1, category: req.category });
          }
        });

        const mostCommonRequirements = Array.from(requirementCounts.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([requirement, data]) => ({
            requirement,
            count: data.count,
            category: data.category,
          }));

        // Risk assessment
        let riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        const riskFactors: string[] = [];
        const recommendations: string[] = [];

        // Assess risk factors
        if (byCategory.allergy > 0) {
          riskFactors.push(`${byCategory.allergy} guests with allergies`);
          recommendations.push(
            'Implement strict allergen separation protocols',
          );
        }

        if (highSeverityCount > 0) {
          riskFactors.push(
            `${highSeverityCount} high-severity dietary requirements`,
          );
          recommendations.push(
            'Prepare emergency action plans for severe reactions',
          );
          if (highSeverityCount >= 3) {
            riskAssessment = 'HIGH';
          } else {
            riskAssessment = 'MEDIUM';
          }
        }

        if (unverifiedCount > 0) {
          riskFactors.push(
            `${unverifiedCount} unverified dietary requirements`,
          );
          recommendations.push('Contact guests to verify dietary requirements');
          if (unverifiedCount > 5) {
            riskAssessment = riskAssessment === 'HIGH' ? 'CRITICAL' : 'HIGH';
          }
        }

        if (bySeverity.level_5 > 0) {
          riskAssessment = 'CRITICAL';
          riskFactors.push(`${bySeverity.level_5} life-threatening allergies`);
          recommendations.push(
            'Notify emergency services and have EpiPens available',
          );
        }

        if (
          guestsWithRequirements /
            (wedding.guest_count || guestsWithRequirements) >
          0.3
        ) {
          riskFactors.push('Over 30% of guests have dietary requirements');
          recommendations.push(
            'Consider buffet style with clear labeling for easier management',
          );
        }

        // Add general recommendations
        if (dietaryRequirements.length > 0) {
          recommendations.push(
            'Train all catering staff on dietary requirement protocols',
          );
          recommendations.push('Label all dishes with allergen information');
          recommendations.push(
            'Prepare separate utensils and serving areas for allergen-free dishes',
          );
        }

        // Build comprehensive summary
        const summary: DietarySummary = {
          wedding_id: wedding.id,
          wedding_name: wedding.couple_name,
          total_guests: wedding.guest_count || guestsWithRequirements,
          requirements: dietaryRequirements,
          summary_stats: {
            total_requirements: totalRequirements,
            by_category: byCategory,
            by_severity: bySeverity,
            high_severity_count: highSeverityCount,
            unverified_count: unverifiedCount,
            guests_with_requirements: guestsWithRequirements,
            most_common_requirements: mostCommonRequirements,
          },
          compliance_insights: {
            risk_assessment: riskAssessment,
            risk_factors: riskFactors,
            recommendations: recommendations,
          },
        };

        return NextResponse.json({
          success: true,
          data: summary,
          meta: {
            generated_at: new Date().toISOString(),
            data_freshness: 'real-time',
            compliance_version: '1.0',
          },
        });
      } catch (error) {
        console.error('Failed to generate dietary summary:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to generate dietary summary',
            code: 'SUMMARY_FAILED',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 },
        );
      }
    },
    {
      requireAuth: true,
      rateLimit: { requests: 40, window: '1m' }, // 40 requests per minute for read operations
      validateBody: false, // GET request, no body to validate
      logSensitiveData: false, // Don't log dietary information
    },
  )();
}
