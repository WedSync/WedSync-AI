/**
 * WS-190 Security Incidents API - Core Incident Management Endpoints
 * Team B Implementation - Backend/API Focus
 *
 * Comprehensive validation, authentication, rate limiting, and audit logging
 * Handles P1 emergency incidents with automated response workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import IncidentResponseSystem from '@/lib/security/incident-response-system';
import EvidencePreservationService from '@/lib/security/evidence-preservation';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

// Comprehensive validation schemas
const CreateIncidentRequestSchema = z.object({
  incidentType: z.enum([
    'security_breach',
    'data_leak',
    'system_failure',
    'unauthorized_access',
    'malware_detected',
    'phishing_attempt',
    'insider_threat',
    'ddos_attack',
    'api_abuse',
    'authentication_bypass',
    'privilege_escalation',
    'data_corruption',
    'service_disruption',
  ]),
  severity: z.enum(['P1', 'P2', 'P3', 'P4']),
  title: z
    .string()
    .min(10)
    .max(255)
    .regex(/^[a-zA-Z0-9\s\-\._,:;!?()]+$/, 'Title contains invalid characters'),
  description: z.string().min(50).max(5000),
  affectedSystems: z.array(z.string().min(1).max(100)).min(1).max(50),
  weddingIds: z.array(z.string().uuid()).max(100).default([]),
  venueIds: z.array(z.string().uuid()).max(50).default([]),
  vendorIds: z.array(z.string().uuid()).max(100).default([]),
  guestDataAffected: z.boolean().default(false),
  photosAffected: z.boolean().default(false),
  paymentDataAffected: z.boolean().default(false),
  evidenceData: z.record(z.any()).default({}),
  forensicsRequired: z.boolean().default(false),
  autoContainmentEnabled: z.boolean().default(true),
});

const ProcessAlertRequestSchema = z.object({
  sourceSystem: z.string().min(1).max(100),
  alertType: z.string().min(1).max(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(10).max(255),
  description: z.string().min(20).max(2000),
  rawData: z.record(z.any()).default({}),
  potentialWeddingImpact: z.boolean().default(false),
});

const ListIncidentsQuerySchema = z.object({
  status: z
    .enum([
      'detected',
      'triaged',
      'investigating',
      'contained',
      'mitigating',
      'resolved',
      'closed',
    ])
    .optional(),
  severity: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
  incidentType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100)
    .default('20'),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 0)
    .default('0'),
  includeResolved: z.enum(['true', 'false']).default('false'),
  weddingImpactOnly: z.enum(['true', 'false']).default('false'),
});

// Rate limiting configuration
const RATE_LIMITS = {
  createIncident: { requests: 10, window: 60 * 1000 }, // 10 per minute
  processAlert: { requests: 100, window: 60 * 1000 }, // 100 per minute
  listIncidents: { requests: 60, window: 60 * 1000 }, // 60 per minute
};

/**
 * POST /api/security/incidents - Create new security incident
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Rate limiting
    const rateLimitResult = await rateLimit(
      request,
      `incidents_create_${request.ip}`,
      RATE_LIMITS.createIncident,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Authentication
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

    // Get user profile and organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'User profile or organization not found' },
        { status: 400 },
      );
    }

    // Role-based authorization
    if (
      !['admin', 'security_officer', 'incident_manager'].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create security incidents' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateIncidentRequestSchema.parse(body);

    // Saturday protection check for P1 incidents
    const isWeddingDay = new Date().getDay() === 6;
    if (
      isWeddingDay &&
      validatedData.severity === 'P1' &&
      validatedData.autoContainmentEnabled
    ) {
      console.warn(
        '🚨 P1 incident on wedding day - Auto-containment enabled with wedding safety checks',
      );
    }

    // Initialize incident response system
    const incidentSystem = new IncidentResponseSystem(profile.organization_id);

    // Create incident with automated response
    const response = await incidentSystem.createIncident(
      validatedData,
      user.id,
    );

    // Audit logging
    console.log(
      `🔐 Incident created: ${response.incident.incident_reference} by ${profile.full_name} (${user.id})`,
      {
        severity: response.incident.severity,
        type: response.incident.incident_type,
        emergency: response.emergencyResponse,
        weddingImpact: response.weddingImpactAssessment.impactLevel,
        organizationId: profile.organization_id,
      },
    );

    return NextResponse.json(
      {
        success: true,
        incident: {
          id: response.incident.id,
          reference: response.incident.incident_reference,
          severity: response.incident.severity,
          status: response.incident.status,
          title: response.incident.title,
          createdAt: response.incident.created_at,
          emergencyResponse: response.emergencyResponse,
          weddingImpactAssessment: response.weddingImpactAssessment,
          containmentActions: response.containmentActions.length,
          complianceRequired: response.complianceRequired,
        },
        message: `Security incident ${response.incident.incident_reference} created successfully${response.emergencyResponse ? ' with emergency response activated' : ''}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Security incident creation error:', error);

    // Detailed error handling
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
      // Don't expose internal errors in production
      const isProduction = process.env.NODE_ENV === 'production';
      return NextResponse.json(
        {
          error: 'Failed to create security incident',
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
 * GET /api/security/incidents - List security incidents with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Rate limiting
    const rateLimitResult = await rateLimit(
      request,
      `incidents_list_${request.ip}`,
      RATE_LIMITS.listIncidents,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user organization
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = ListIncidentsQuerySchema.parse(queryParams);

    // Build database query with security filters
    let query = supabase
      .from('security_incidents')
      .select(
        `
        id,
        incident_reference,
        incident_type,
        severity,
        status,
        title,
        description,
        affected_systems,
        wedding_ids,
        venue_ids,
        vendor_ids,
        guest_data_affected,
        photos_affected,
        payment_data_affected,
        detected_at,
        acknowledged_at,
        contained_at,
        resolved_at,
        created_at,
        updated_at,
        created_by,
        assigned_to,
        auto_containment_executed,
        auto_containment_success,
        stakeholders_notified,
        forensics_required
      `,
      )
      .eq('organization_id', profile.organization_id)
      .order('detected_at', { ascending: false })
      .range(
        validatedQuery.offset,
        validatedQuery.offset + validatedQuery.limit - 1,
      );

    // Apply filters
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status);
    }

    if (validatedQuery.severity) {
      query = query.eq('severity', validatedQuery.severity);
    }

    if (validatedQuery.incidentType) {
      query = query.eq('incident_type', validatedQuery.incidentType);
    }

    if (validatedQuery.dateFrom) {
      query = query.gte('detected_at', validatedQuery.dateFrom);
    }

    if (validatedQuery.dateTo) {
      query = query.lte('detected_at', validatedQuery.dateTo);
    }

    if (validatedQuery.includeResolved === 'false') {
      query = query.not('status', 'in', '(resolved,closed)');
    }

    if (validatedQuery.weddingImpactOnly === 'true') {
      query = query.or(
        'guest_data_affected.eq.true,photos_affected.eq.true,wedding_ids.neq.{}',
      );
    }

    // Execute query
    const { data: incidents, error, count } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    // Get count for pagination
    let totalCount = 0;
    if (incidents && incidents.length === validatedQuery.limit) {
      const { count: total } = await supabase
        .from('security_incidents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);

      totalCount = total || 0;
    } else {
      totalCount = validatedQuery.offset + (incidents?.length || 0);
    }

    // Enrich incidents with additional data
    const enrichedIncidents = await Promise.all(
      (incidents || []).map(async (incident) => {
        // Get latest containment actions count
        const { count: containmentActions } = await supabase
          .from('containment_actions')
          .select('*', { count: 'exact', head: true })
          .eq('incident_id', incident.id);

        // Get timeline entry count
        const { count: timelineEntries } = await supabase
          .from('incident_timeline')
          .select('*', { count: 'exact', head: true })
          .eq('incident_id', incident.id);

        // Calculate response times
        const detectedAt = new Date(incident.detected_at);
        const acknowledgedAt = incident.acknowledged_at
          ? new Date(incident.acknowledged_at)
          : null;
        const containedAt = incident.contained_at
          ? new Date(incident.contained_at)
          : null;
        const resolvedAt = incident.resolved_at
          ? new Date(incident.resolved_at)
          : null;

        const responseMetrics = {
          timeToAcknowledgment: acknowledgedAt
            ? Math.round(
                (acknowledgedAt.getTime() - detectedAt.getTime()) / 1000,
              )
            : null,
          timeToContainment: containedAt
            ? Math.round((containedAt.getTime() - detectedAt.getTime()) / 1000)
            : null,
          timeToResolution: resolvedAt
            ? Math.round((resolvedAt.getTime() - detectedAt.getTime()) / 1000)
            : null,
        };

        // P1 SLA compliance check (5 minutes = 300 seconds)
        const p1SlaCompliance =
          incident.severity === 'P1' && containedAt
            ? responseMetrics.timeToContainment! <= 300
            : null;

        return {
          ...incident,
          containmentActionsCount: containmentActions || 0,
          timelineEntriesCount: timelineEntries || 0,
          responseMetrics,
          p1SlaCompliance,
          isWeddingDay: new Date(incident.detected_at).getDay() === 6,
          weddingImpact: {
            hasWeddingData:
              incident.guest_data_affected ||
              incident.photos_affected ||
              (incident.wedding_ids?.length || 0) > 0,
            weddingsAffected: incident.wedding_ids?.length || 0,
            vendorsInvolved: incident.vendor_ids?.length || 0,
          },
        };
      }),
    );

    return NextResponse.json({
      incidents: enrichedIncidents,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: totalCount,
        hasMore: validatedQuery.offset + validatedQuery.limit < totalCount,
      },
      summary: {
        totalIncidents: enrichedIncidents.length,
        p1Incidents: enrichedIncidents.filter((i) => i.severity === 'P1')
          .length,
        weddingRelated: enrichedIncidents.filter(
          (i) => i.weddingImpact.hasWeddingData,
        ).length,
        autoContained: enrichedIncidents.filter(
          (i) => i.auto_containment_executed,
        ).length,
        saturdayIncidents: enrichedIncidents.filter((i) => i.isWeddingDay)
          .length,
      },
    });
  } catch (error) {
    console.error('Incidents list error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch security incidents' },
      { status: 500 },
    );
  }
}
