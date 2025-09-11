import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { DataQualityGovernance } from '@/lib/integrations/analytics/data-quality-governance';

const QualityCheckRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  checkType: z.enum(['comprehensive', 'incremental', 'targeted', 'compliance']),
  platforms: z
    .array(
      z.enum([
        'tableau',
        'powerbi',
        'looker',
        'qlik',
        'sisense',
        'domo',
        'snowflake',
        'bigquery',
        'redshift',
        'databricks',
        'synapse',
        'google_analytics',
        'mixpanel',
        'amplitude',
        'segment',
        'hotjar',
        'fullstory',
        'theknot',
        'weddingwire',
        'zola',
        'weddingspot',
        'herecomestheguide',
        'quickbooks',
        'xero',
        'freshbooks',
        'stripe',
        'square',
        'paypal',
        'facebook_ads',
        'google_ads',
        'instagram',
        'pinterest',
        'mailchimp',
        'klaviyo',
      ]),
    )
    .optional(),
  dataCategories: z
    .array(
      z.enum([
        'wedding_data',
        'vendor_data',
        'guest_data',
        'financial_data',
        'marketing_data',
        'performance_data',
        'compliance_data',
      ]),
    )
    .optional(),
  qualityRules: z
    .object({
      completeness: z
        .object({
          threshold: z.number().min(0).max(100).default(95),
          criticalFields: z
            .array(z.string())
            .default([
              'wedding_date',
              'vendor_id',
              'client_id',
              'booking_value',
            ]),
        })
        .optional(),
      accuracy: z
        .object({
          threshold: z.number().min(0).max(100).default(98),
          validationRules: z
            .array(z.string())
            .default([
              'valid_email_format',
              'valid_phone_format',
              'valid_date_range',
              'positive_amounts',
            ]),
        })
        .optional(),
      consistency: z
        .object({
          crossPlatformValidation: z.boolean().default(true),
          duplicateDetection: z.boolean().default(true),
          referentialIntegrity: z.boolean().default(true),
        })
        .optional(),
      timeliness: z
        .object({
          maxAgeHours: z.number().min(1).max(168).default(24), // 1 week max
          weddingSeasonPriority: z.boolean().default(true),
        })
        .optional(),
      privacy: z
        .object({
          gdprCompliance: z.boolean().default(true),
          dataRetentionCheck: z.boolean().default(true),
          consentValidation: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),
  weddingSpecificChecks: z
    .object({
      seasonalDataValidation: z.boolean().default(true),
      vendorPerformanceMetrics: z.boolean().default(true),
      bookingPatternAnalysis: z.boolean().default(true),
      guestDataIntegrity: z.boolean().default(true),
    })
    .optional(),
  scheduledCheck: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

const QualityIssueSchema = z.object({
  category: z.enum([
    'completeness',
    'accuracy',
    'consistency',
    'timeliness',
    'privacy',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  platform: z.string(),
  dataCategory: z.string(),
  description: z.string(),
  affectedRecords: z.number(),
  suggestedAction: z.string(),
  weddingImpact: z
    .enum(['none', 'low', 'medium', 'high', 'critical'])
    .optional(),
  autoFixable: z.boolean(),
  estimatedFixTime: z.string().optional(),
});

const QualityReportSchema = z.object({
  checkId: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: z.enum(['running', 'completed', 'failed', 'partial']),
  overallScore: z.number().min(0).max(100),
  categoryScores: z.object({
    completeness: z.number().min(0).max(100),
    accuracy: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
    timeliness: z.number().min(0).max(100),
    privacy: z.number().min(0).max(100),
  }),
  platformResults: z.array(
    z.object({
      platform: z.string(),
      score: z.number().min(0).max(100),
      recordsChecked: z.number(),
      issuesFound: z.number(),
      criticalIssues: z.number(),
      weddingDataQuality: z
        .object({
          weddingRecordsChecked: z.number(),
          seasonalDataAccuracy: z.number(),
          vendorDataConsistency: z.number(),
          guestDataCompleteness: z.number(),
        })
        .optional(),
    }),
  ),
  issues: z.array(QualityIssueSchema),
  weddingSpecificInsights: z.object({
    peakSeasonDataQuality: z.number(),
    vendorDataReliability: z.number(),
    bookingDataAccuracy: z.number(),
    guestDataPrivacyCompliance: z.number(),
    seasonalTrends: z.array(
      z.object({
        month: z.string(),
        qualityScore: z.number(),
        commonIssues: z.array(z.string()),
      }),
    ),
  }),
  recommendations: z.array(
    z.object({
      category: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      implementation: z.string(),
      estimatedImpact: z.string(),
      weddingBusinessValue: z.string().optional(),
    }),
  ),
  completedAt: z.string().datetime(),
  nextScheduledCheck: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const authorization = headersList.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = QualityCheckRequestSchema.parse(body);

    // Verify organization access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organizationId)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied' },
        { status: 403 },
      );
    }

    // Check subscription tier permissions for quality checks
    const { data: organization, error: subscriptionError } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', validatedData.organizationId)
      .single();

    if (subscriptionError) {
      return NextResponse.json(
        { error: 'Failed to verify subscription' },
        { status: 500 },
      );
    }

    // Scale tier or higher required for comprehensive quality checks
    const allowedTiers = ['scale', 'enterprise'];
    if (
      validatedData.checkType === 'comprehensive' &&
      !allowedTiers.includes(organization.subscription_tier)
    ) {
      return NextResponse.json(
        {
          error: 'Comprehensive quality checks require Scale tier or higher',
          requiredTier: 'scale',
          currentTier: organization.subscription_tier,
          availableCheckTypes: ['incremental', 'targeted'],
        },
        { status: 403 },
      );
    }

    const checkId = crypto.randomUUID();

    // Initialize Data Quality Governance engine
    const qualityGovernance = new DataQualityGovernance({
      organizationId: validatedData.organizationId,
      weddingOptimized: true,
      gdprEnabled: true,
    });

    // Create quality check job record
    const { error: checkJobError } = await supabase
      .from('analytics_quality_checks')
      .insert({
        id: checkId,
        organization_id: validatedData.organizationId,
        check_type: validatedData.checkType,
        platforms: validatedData.platforms || [],
        data_categories: validatedData.dataCategories || [],
        quality_rules: validatedData.qualityRules || {},
        wedding_specific_checks: validatedData.weddingSpecificChecks || {},
        status: 'running',
        created_by: user.id,
        priority: validatedData.priority,
      });

    if (checkJobError) {
      console.error('Failed to create quality check job:', checkJobError);
      return NextResponse.json(
        { error: 'Failed to initiate quality check' },
        { status: 500 },
      );
    }

    // Execute quality checks
    let qualityReport;

    try {
      qualityReport = await qualityGovernance.executeQualityCheck({
        checkId,
        checkType: validatedData.checkType,
        platforms: validatedData.platforms,
        dataCategories: validatedData.dataCategories,
        qualityRules: validatedData.qualityRules,
        weddingSpecificChecks: validatedData.weddingSpecificChecks,
      });
    } catch (checkError) {
      console.error('Quality check execution failed:', checkError);

      // Update job status to failed
      await supabase
        .from('analytics_quality_checks')
        .update({
          status: 'failed',
          error_message:
            checkError instanceof Error ? checkError.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', checkId);

      return NextResponse.json(
        {
          error: 'Quality check execution failed',
          details:
            checkError instanceof Error ? checkError.message : 'Unknown error',
        },
        { status: 500 },
      );
    }

    // Validate and structure the quality report
    const structuredReport = {
      checkId,
      organizationId: validatedData.organizationId,
      status: 'completed' as const,
      overallScore: qualityReport.overallScore,
      categoryScores: qualityReport.categoryScores,
      platformResults: qualityReport.platformResults.map((result) => ({
        platform: result.platform,
        score: result.score,
        recordsChecked: result.recordsChecked,
        issuesFound: result.issues?.length || 0,
        criticalIssues:
          result.issues?.filter((i) => i.severity === 'critical').length || 0,
        weddingDataQuality: result.weddingDataQuality,
      })),
      issues: qualityReport.issues,
      weddingSpecificInsights: {
        peakSeasonDataQuality:
          qualityReport.weddingInsights?.peakSeasonDataQuality || 0,
        vendorDataReliability:
          qualityReport.weddingInsights?.vendorDataReliability || 0,
        bookingDataAccuracy:
          qualityReport.weddingInsights?.bookingDataAccuracy || 0,
        guestDataPrivacyCompliance:
          qualityReport.weddingInsights?.guestDataPrivacyCompliance || 0,
        seasonalTrends: qualityReport.weddingInsights?.seasonalTrends || [],
      },
      recommendations: qualityReport.recommendations.map((rec) => ({
        category: rec.category,
        priority: rec.priority,
        description: rec.description,
        implementation: rec.implementation,
        estimatedImpact: rec.estimatedImpact,
        weddingBusinessValue: rec.weddingBusinessValue,
      })),
      completedAt: new Date().toISOString(),
      nextScheduledCheck: validatedData.scheduledCheck
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    };

    // Update quality check job with results
    await supabase
      .from('analytics_quality_checks')
      .update({
        status: 'completed',
        overall_score: structuredReport.overallScore,
        category_scores: structuredReport.categoryScores,
        platform_results: structuredReport.platformResults,
        issues: structuredReport.issues,
        wedding_insights: structuredReport.weddingSpecificInsights,
        recommendations: structuredReport.recommendations,
        completed_at: structuredReport.completedAt,
        next_scheduled_check: structuredReport.nextScheduledCheck,
      })
      .eq('id', checkId);

    // Create audit log entry
    await supabase.from('analytics_audit_log').insert({
      organization_id: validatedData.organizationId,
      action: 'quality_check',
      details: {
        checkId,
        checkType: validatedData.checkType,
        overallScore: structuredReport.overallScore,
        criticalIssues: structuredReport.issues.filter(
          (i) => i.severity === 'critical',
        ).length,
        platformsChecked: validatedData.platforms?.length || 0,
      },
      performed_by: user.id,
    });

    // If critical issues found, create alert
    const criticalIssues = structuredReport.issues.filter(
      (issue) => issue.severity === 'critical',
    );
    if (criticalIssues.length > 0) {
      await supabase.from('analytics_alerts').insert({
        organization_id: validatedData.organizationId,
        alert_type: 'data_quality',
        severity: 'critical',
        message: `${criticalIssues.length} critical data quality issues detected`,
        details: {
          checkId,
          criticalIssues: criticalIssues.slice(0, 5), // Limit to first 5 for storage
          weddingImpact: criticalIssues.some(
            (i) => i.weddingImpact === 'critical',
          ),
        },
        created_by: user.id,
      });
    }

    // Schedule next check if requested
    if (validatedData.scheduledCheck) {
      await supabase.from('analytics_scheduled_checks').upsert({
        organization_id: validatedData.organizationId,
        check_type: validatedData.checkType,
        frequency: 'weekly',
        next_run: structuredReport.nextScheduledCheck,
        configuration: {
          platforms: validatedData.platforms,
          dataCategories: validatedData.dataCategories,
          qualityRules: validatedData.qualityRules,
          weddingSpecificChecks: validatedData.weddingSpecificChecks,
        },
        created_by: user.id,
      });
    }

    return NextResponse.json(structuredReport, { status: 200 });
  } catch (error) {
    console.error('Analytics quality check error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during quality check' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkId = searchParams.get('checkId');
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeScheduled = searchParams.get('includeScheduled') === 'true';

    if (!checkId && !organizationId) {
      return NextResponse.json(
        { error: 'checkId or organizationId parameter required' },
        { status: 400 },
      );
    }

    const headersList = await headers();
    const authorization = headersList.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    // Get quality check results
    let query = supabase.from('analytics_quality_checks').select('*');

    if (checkId) {
      query = query.eq('id', checkId);
    } else {
      query = query.eq('organization_id', organizationId);

      // Verify organization access
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();

      if (orgError || !orgMember) {
        return NextResponse.json(
          { error: 'Organization access denied' },
          { status: 403 },
        );
      }
    }

    const { data: qualityChecks, error } = await query
      .order('created_at', { ascending: false })
      .limit(checkId ? 1 : limit);

    if (error) {
      console.error('Failed to fetch quality checks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quality check results' },
        { status: 500 },
      );
    }

    if (checkId) {
      const check = qualityChecks[0];
      if (!check) {
        return NextResponse.json(
          { error: 'Quality check not found' },
          { status: 404 },
        );
      }

      // Verify user has access to this check's organization
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', check.organization_id)
        .single();

      if (orgError || !orgMember) {
        return NextResponse.json(
          { error: 'Access denied to this quality check' },
          { status: 403 },
        );
      }

      return NextResponse.json(check, { status: 200 });
    }

    // Get scheduled checks if requested
    let scheduledChecks = null;
    if (includeScheduled && organizationId) {
      const { data: scheduled } = await supabase
        .from('analytics_scheduled_checks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('next_run', { ascending: true });

      scheduledChecks = scheduled;
    }

    // Calculate quality trends
    const qualityTrend =
      qualityChecks.length > 1
        ? {
            currentScore: qualityChecks[0]?.overall_score || 0,
            previousScore: qualityChecks[1]?.overall_score || 0,
            trend:
              qualityChecks[0]?.overall_score > qualityChecks[1]?.overall_score
                ? 'improving'
                : qualityChecks[0]?.overall_score <
                    qualityChecks[1]?.overall_score
                  ? 'declining'
                  : 'stable',
          }
        : null;

    return NextResponse.json(
      {
        qualityChecks,
        scheduledChecks,
        qualityTrend,
        total: qualityChecks.length,
        weddingOptimizedChecks: qualityChecks.filter(
          (check) => check.wedding_specific_checks?.seasonalDataValidation,
        ).length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Analytics quality check retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
