import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { z } from 'zod';

const scoringConfigSchema = z.object({
  rules: z.array(
    z.object({
      ruleName: z.string(),
      ruleType: z.enum(['activity', 'demographic', 'behavioral', 'time_based']),
      triggerEvent: z.string(),
      triggerConditions: z.record(z.any()),
      scoreChange: z.number(),
      maxScorePerPeriod: z.number().optional(),
      resetPeriodDays: z.number().optional(),
      isActive: z.boolean().default(true),
      priority: z.number().default(0),
      description: z.string().optional(),
    }),
  ),
});

const bulkScoringSchema = z.object({
  clientIds: z.array(z.string().uuid()).optional(),
  recalculateAll: z.boolean().default(false),
  includeInactive: z.boolean().default(false),
});

// Get lead scoring configuration and statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    // Get scoring rules
    const { data: scoringRules, error: rulesError } = await supabase
      .from('lead_scoring_rules')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('Error fetching scoring rules:', rulesError);
      return NextResponse.json(
        { error: 'Failed to fetch scoring rules' },
        { status: 500 },
      );
    }

    // Get scoring statistics
    const { data: scoreStats, error: statsError } = await supabase
      .from('lead_scores')
      .select(
        `
        total_score,
        score_grade,
        demographic_score,
        behavioral_score,
        engagement_score,
        fit_score,
        is_qualified_lead,
        last_calculated_at
      `,
      )
      .eq('organization_id', profile.organization_id);

    if (statsError) {
      console.error('Error fetching score statistics:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch score statistics' },
        { status: 500 },
      );
    }

    // Calculate statistics
    const statistics = {
      totalLeads: scoreStats?.length || 0,
      averageScore: 0,
      scoreDistribution: {
        'A+': 0,
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0,
      },
      qualifiedLeads: 0,
      scoringComponents: {
        averageDemographic: 0,
        averageBehavioral: 0,
        averageEngagement: 0,
        averageFit: 0,
      },
      lastCalculated: null as string | null,
    };

    if (scoreStats && scoreStats.length > 0) {
      const totalScores = scoreStats.reduce(
        (sum, lead) => sum + lead.total_score,
        0,
      );
      statistics.averageScore = Math.round(totalScores / scoreStats.length);

      // Grade distribution
      scoreStats.forEach((lead) => {
        statistics.scoreDistribution[
          lead.score_grade as keyof typeof statistics.scoreDistribution
        ]++;
      });

      // Qualified leads
      statistics.qualifiedLeads = scoreStats.filter(
        (lead) => lead.is_qualified_lead,
      ).length;

      // Component averages
      statistics.scoringComponents.averageDemographic = Math.round(
        scoreStats.reduce((sum, lead) => sum + lead.demographic_score, 0) /
          scoreStats.length,
      );
      statistics.scoringComponents.averageBehavioral = Math.round(
        scoreStats.reduce((sum, lead) => sum + lead.behavioral_score, 0) /
          scoreStats.length,
      );
      statistics.scoringComponents.averageEngagement = Math.round(
        scoreStats.reduce((sum, lead) => sum + lead.engagement_score, 0) /
          scoreStats.length,
      );
      statistics.scoringComponents.averageFit = Math.round(
        scoreStats.reduce((sum, lead) => sum + lead.fit_score, 0) /
          scoreStats.length,
      );

      // Most recent calculation
      const mostRecent = scoreStats.reduce((latest, current) => {
        return new Date(current.last_calculated_at) >
          new Date(latest.last_calculated_at)
          ? current
          : latest;
      });
      statistics.lastCalculated = mostRecent.last_calculated_at;
    }

    return NextResponse.json({
      scoringRules,
      statistics,
      configuration: {
        maxScore: 100,
        passingGrade: 'C',
        qualificationThreshold: 60,
        componentsEnabled: {
          demographic: true,
          behavioral: true,
          engagement: true,
          fit: true,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching scoring data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoring data' },
      { status: 500 },
    );
  }
}

// Update scoring configuration
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, rateLimitConfigs.api);
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = scoringConfigSchema.parse(body);

    // Delete existing rules and insert new ones
    await supabase
      .from('lead_scoring_rules')
      .delete()
      .eq('organization_id', profile.organization_id);

    const rulesToInsert = validatedData.rules.map((rule) => ({
      organization_id: profile.organization_id,
      rule_name: rule.ruleName,
      rule_type: rule.ruleType,
      trigger_event: rule.triggerEvent,
      trigger_conditions: rule.triggerConditions,
      score_change: rule.scoreChange,
      max_score_per_period: rule.maxScorePerPeriod,
      reset_period_days: rule.resetPeriodDays,
      is_active: rule.isActive,
      priority: rule.priority,
      description: rule.description,
      created_by: user.id,
    }));

    const { error: insertError } = await supabase
      .from('lead_scoring_rules')
      .insert(rulesToInsert);

    if (insertError) {
      console.error('Error updating scoring rules:', insertError);
      return NextResponse.json(
        { error: 'Failed to update scoring rules' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scoring configuration updated successfully',
      rulesCreated: rulesToInsert.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error updating scoring configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update scoring configuration' },
      { status: 500 },
    );
  }
}

// Trigger bulk lead scoring recalculation
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(
      request,
      rateLimitConfigs.intensive,
    );
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = bulkScoringSchema.parse(body);

    let clientIds: string[] = [];

    if (validatedData.recalculateAll) {
      // Get all clients for the organization
      const query = supabase
        .from('clients')
        .select('id')
        .eq('organization_id', profile.organization_id);

      if (!validatedData.includeInactive) {
        query.neq('status', 'archived');
      }

      const { data: clients, error: clientsError } = await query;

      if (clientsError) {
        console.error('Error fetching clients for bulk scoring:', clientsError);
        return NextResponse.json(
          { error: 'Failed to fetch clients' },
          { status: 500 },
        );
      }

      clientIds = clients?.map((c) => c.id) || [];
    } else if (validatedData.clientIds) {
      clientIds = validatedData.clientIds;
    } else {
      return NextResponse.json(
        { error: 'Either clientIds or recalculateAll must be specified' },
        { status: 400 },
      );
    }

    if (clientIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clients to process',
        processed: 0,
        errors: [],
      });
    }

    const results = [];
    const errors = [];

    // Process clients in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (clientId) => {
        try {
          const { data, error } = await supabase.rpc('calculate_lead_score', {
            client_uuid: clientId,
          });

          if (error) {
            errors.push({ clientId, error: error.message });
          } else {
            results.push({ clientId, newScore: data });
          }
        } catch (err) {
          errors.push({ clientId, error: 'Calculation failed' });
        }
      });

      await Promise.all(batchPromises);
    }

    // Log bulk scoring activity
    await supabase.from('client_activities').insert({
      client_id: null, // Bulk operation
      organization_id: profile.organization_id,
      activity_type: 'bulk_scoring',
      activity_title: 'Bulk lead scoring completed',
      activity_description: `Recalculated scores for ${results.length} leads`,
      performed_by: user.id,
      metadata: {
        totalProcessed: clientIds.length,
        successful: results.length,
        failed: errors.length,
        recalculateAll: validatedData.recalculateAll,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bulk scoring completed',
      summary: {
        totalRequested: clientIds.length,
        processed: results.length,
        failed: errors.length,
      },
      results: results.slice(0, 100), // Limit response size
      errors: errors.slice(0, 50), // Limit error reporting
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Error in bulk lead scoring:', error);
    return NextResponse.json(
      { error: 'Failed to complete bulk scoring' },
      { status: 500 },
    );
  }
}
