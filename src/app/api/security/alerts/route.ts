/**
 * WS-190 Security Alerts API - Automated Alert Processing
 * Team B Implementation - Backend/API Focus
 *
 * Processes incoming security alerts with automated threat evaluation
 * and incident creation for P1 emergency response
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import IncidentResponseSystem from '@/lib/security/incident-response-system';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

const ProcessAlertRequestSchema = z.object({
  sourceSystem: z.string().min(1).max(100),
  alertType: z.string().min(1).max(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(10).max(255),
  description: z.string().min(20).max(2000),
  rawData: z.record(z.any()).default({}),
  potentialWeddingImpact: z.boolean().default(false),
  externalAlertId: z.string().optional(),
  signature: z.string().optional(), // For webhook validation
});

const RATE_LIMITS = {
  processAlert: { requests: 500, window: 60 * 1000 }, // 500 per minute for high-volume alerts
  webhookAlert: { requests: 1000, window: 60 * 1000 }, // 1000 per minute for webhook sources
};

// Known source system signatures for webhook validation
const WEBHOOK_SIGNATURES: Record<string, string> = {
  cloudflare_waf: process.env.CLOUDFLARE_WEBHOOK_SECRET || '',
  aws_guardduty: process.env.AWS_GUARDDUTY_WEBHOOK_SECRET || '',
  supabase_auth: process.env.SUPABASE_WEBHOOK_SECRET || '',
  stripe_radar: process.env.STRIPE_WEBHOOK_SECRET || '',
};

/**
 * POST /api/security/alerts - Process incoming security alert
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Determine if this is a webhook or authenticated request
    const authHeader = request.headers.get('authorization');
    const webhookSignature = request.headers.get('x-webhook-signature');
    const isWebhook = !!webhookSignature && !authHeader;

    // Rate limiting based on request type
    const rateLimitKey = isWebhook
      ? `webhook_alerts_${request.ip}`
      : `alerts_process_${request.ip}`;
    const rateLimit = isWebhook
      ? RATE_LIMITS.webhookAlert
      : RATE_LIMITS.processAlert;

    const rateLimitResult = await rateLimit(request, rateLimitKey, rateLimit);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = ProcessAlertRequestSchema.parse(body);

    let organizationId: string;
    let processedBy = 'system';

    if (isWebhook) {
      // Webhook validation
      const isValidWebhook = await validateWebhookSignature(
        validatedData.sourceSystem,
        request,
        body,
        webhookSignature,
      );

      if (!isValidWebhook) {
        console.warn(
          `🚨 Invalid webhook signature from ${validatedData.sourceSystem}`,
        );
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 },
        );
      }

      // For webhooks, use default organization or extract from alert data
      organizationId =
        extractOrganizationFromAlert(validatedData) ||
        process.env.DEFAULT_ORGANIZATION_ID ||
        '';

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Unable to determine organization for webhook alert' },
          { status: 400 },
        );
      }

      console.log(
        `🔗 Processing webhook alert from ${validatedData.sourceSystem}`,
      );
    } else {
      // Authenticated API request
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized - Valid authentication required' },
          { status: 401 },
        );
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id, full_name')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 400 },
        );
      }

      organizationId = profile.organization_id;
      processedBy = user.id;
    }

    // Initialize incident response system
    const incidentSystem = new IncidentResponseSystem(organizationId);

    // Process the security alert with automated threat evaluation
    const alertResult = await incidentSystem.processSecurityAlert({
      sourceSystem: validatedData.sourceSystem,
      alertType: validatedData.alertType,
      severity: validatedData.severity,
      title: validatedData.title,
      description: validatedData.description,
      rawData: validatedData.rawData,
      potentialWeddingImpact: validatedData.potentialWeddingImpact,
    });

    // Enhanced logging for different outcomes
    if (alertResult.incidentCreated) {
      console.log(
        `🚨 Alert escalated to incident: ${alertResult.incidentCreated.incident_reference}`,
        {
          severity: alertResult.incidentCreated.severity,
          autoContained: alertResult.autoContained,
          sourceSystem: validatedData.sourceSystem,
          alertType: validatedData.alertType,
          weddingImpact: validatedData.potentialWeddingImpact,
          isWeddingDay: new Date().getDay() === 6,
        },
      );
    } else {
      console.log(`ℹ️  Security alert processed - no incident created`, {
        reason:
          'Did not match threat detection rules or classified as false positive',
        sourceSystem: validatedData.sourceSystem,
        alertType: validatedData.alertType,
        severity: validatedData.severity,
      });
    }

    // Prepare response based on incident creation
    if (alertResult.incidentCreated) {
      return NextResponse.json(
        {
          success: true,
          alertProcessed: true,
          incidentCreated: true,
          incident: {
            id: alertResult.incidentCreated.id,
            reference: alertResult.incidentCreated.incident_reference,
            severity: alertResult.incidentCreated.severity,
            status: alertResult.incidentCreated.status,
            autoContainmentExecuted: alertResult.autoContained,
            emergencyResponse: alertResult.incidentCreated.severity === 'P1',
          },
          alert: {
            id: alertResult.alert.id,
            processed: true,
            processingStatus: alertResult.alert.processing_status,
          },
          message: `Alert processed and escalated to ${alertResult.incidentCreated.severity} incident ${alertResult.incidentCreated.incident_reference}${alertResult.autoContained ? ' with automated containment' : ''}`,
        },
        { status: 201 },
      );
    } else {
      return NextResponse.json({
        success: true,
        alertProcessed: true,
        incidentCreated: false,
        alert: {
          id: alertResult.alert.id,
          processed: true,
          processingStatus: alertResult.alert.processing_status,
        },
        message:
          'Alert processed successfully - no incident created (did not match threat detection criteria)',
      });
    }
  } catch (error) {
    console.error('Security alert processing error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      const isProduction = process.env.NODE_ENV === 'production';
      return NextResponse.json(
        {
          error: 'Failed to process security alert',
          ...(isProduction ? {} : { details: error.message }),
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/security/alerts - List recent security alerts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authentication required for listing alerts
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sourceSystem = searchParams.get('sourceSystem');
    const severity = searchParams.get('severity');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const hours = Math.min(parseInt(searchParams.get('hours') || '24'), 168); // Max 1 week

    // Build query
    let query = supabase
      .from('security_alerts')
      .select(
        `
        id,
        source_system,
        alert_type,
        severity,
        title,
        description,
        processing_status,
        incident_created_id,
        saturday_alert,
        potential_wedding_impact,
        processed_at,
        processing_duration_ms,
        created_at
      `,
      )
      .eq('organization_id', profile.organization_id)
      .gte(
        'created_at',
        new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('processing_status', status);
    }

    if (sourceSystem) {
      query = query.eq('source_system', sourceSystem);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: alerts, error } = await query;

    if (error) throw error;

    // Calculate summary statistics
    const summary = {
      totalAlerts: alerts?.length || 0,
      incidentsCreated:
        alerts?.filter((a) => a.processing_status === 'incident_created')
          .length || 0,
      falsePositives:
        alerts?.filter((a) => a.processing_status === 'false_positive')
          .length || 0,
      saturdayAlerts: alerts?.filter((a) => a.saturday_alert).length || 0,
      weddingImpactAlerts:
        alerts?.filter((a) => a.potential_wedding_impact).length || 0,
      averageProcessingTime: alerts?.length
        ? Math.round(
            alerts.reduce(
              (sum, a) => sum + (a.processing_duration_ms || 0),
              0,
            ) / alerts.length,
          )
        : 0,
      alertsBySource:
        alerts?.reduce((acc: Record<string, number>, alert) => {
          acc[alert.source_system] = (acc[alert.source_system] || 0) + 1;
          return acc;
        }, {}) || {},
      alertsBySeverity:
        alerts?.reduce((acc: Record<string, number>, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        }, {}) || {},
    };

    return NextResponse.json({
      alerts: alerts || [],
      summary,
      filters: {
        hours,
        status,
        sourceSystem,
        severity,
        limit,
      },
    });
  } catch (error) {
    console.error('Alerts list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 },
    );
  }
}

/**
 * Helper Functions
 */

async function validateWebhookSignature(
  sourceSystem: string,
  request: NextRequest,
  body: any,
  providedSignature: string | null,
): Promise<boolean> {
  if (!providedSignature || !WEBHOOK_SIGNATURES[sourceSystem]) {
    return false;
  }

  const secret = WEBHOOK_SIGNATURES[sourceSystem];
  if (!secret) return false;

  try {
    // Calculate expected signature
    const payload = JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Compare signatures (timing-safe comparison)
    const expected = `sha256=${expectedSignature}`;
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch (error) {
    console.error('Webhook signature validation error:', error);
    return false;
  }
}

function extractOrganizationFromAlert(
  alertData: z.infer<typeof ProcessAlertRequestSchema>,
): string | null {
  // Try to extract organization ID from alert metadata
  if (alertData.rawData.organizationId) {
    return alertData.rawData.organizationId;
  }

  if (alertData.rawData.org_id) {
    return alertData.rawData.org_id;
  }

  // Try to extract from user context in alert
  if (alertData.rawData.user?.organizationId) {
    return alertData.rawData.user.organizationId;
  }

  // For wedding-specific alerts, try to match by domain or other identifiers
  if (alertData.potentialWeddingImpact) {
    // Could implement domain-based organization matching here
    // For now, return null to use default
  }

  return null;
}
