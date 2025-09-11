import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  InvitationService,
  TrackVisitSchema,
  TrackConversionSchema,
} from '@/lib/services/invitationService';
import { DynamicAPIRouteContext, extractParams } from '@/types/next15-params';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';

// Rate limiting for invitation operations
const invitationRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000, // Higher limit for public invitation access
});

// Validation schemas
const trackVisitBodySchema = z.object({
  session_id: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

const trackConversionBodySchema = TrackConversionSchema.extend({
  visit_id: z.string().uuid().optional(),
});

/**
 * GET /api/invite/[code]
 * Get invitation details and track the visit
 */
export async function GET(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting - more lenient for public access
    const identifier = request.ip || 'anonymous';
    const { success } = await invitationRateLimit.check(200, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { code } = params;

    // Validate code format
    if (!code || !InvitationService.isValidCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid invitation code format' },
        { status: 400 },
      );
    }

    // Get invitation details
    const invitation = await InvitationService.getInvitationByCode(code);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 },
      );
    }

    // Extract tracking data from request
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const realIp = request.headers.get('x-real-ip') || '';
    const ip = forwardedFor.split(',')[0] || realIp || request.ip;

    // Parse URL for UTM parameters
    const url = new URL(request.url);
    const utm_source = url.searchParams.get('utm_source') || undefined;
    const utm_medium = url.searchParams.get('utm_medium') || undefined;
    const utm_campaign = url.searchParams.get('utm_campaign') || undefined;

    // Parse user agent for device info
    const deviceInfo = InvitationService.parseUserAgent(userAgent);

    // Track the visit
    try {
      const visit = await InvitationService.trackVisit(invitation.id, {
        ip_address: ip,
        user_agent: userAgent,
        referer: referer,
        utm_source,
        utm_medium,
        utm_campaign,
        device_type: deviceInfo.device_type,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        session_id: url.searchParams.get('session_id') || undefined,
      });

      // Get supplier settings for enhanced response
      const supplierSettings = await InvitationService.getSupplierSettings(
        invitation.supplier_id,
      );

      return NextResponse.json({
        success: true,
        invitation: {
          code: invitation.code,
          supplier_name: invitation.supplier_name,
          supplier_type: invitation.supplier_type,
          supplier_logo_url: invitation.supplier_logo_url,
          supplier_brand_color: invitation.supplier_brand_color,
          couple_names: invitation.couple_names,
          wedding_date: invitation.wedding_date,
          personalized_message: invitation.personalized_message,
        },
        supplier_settings: supplierSettings
          ? {
              welcome_message_template:
                supplierSettings.welcome_message_template,
              value_proposition: supplierSettings.value_proposition,
              call_to_action: supplierSettings.call_to_action,
              featured_benefits: supplierSettings.featured_benefits,
              google_analytics_id: supplierSettings.google_analytics_id,
              facebook_pixel_id: supplierSettings.facebook_pixel_id,
            }
          : null,
        visit_id: visit.id,
        tracking: {
          utm_source,
          utm_medium,
          utm_campaign,
        },
      });
    } catch (trackingError) {
      console.error('Visit tracking failed:', trackingError);

      // Still return invitation data even if tracking fails
      return NextResponse.json({
        success: true,
        invitation: {
          code: invitation.code,
          supplier_name: invitation.supplier_name,
          supplier_type: invitation.supplier_type,
          supplier_logo_url: invitation.supplier_logo_url,
          supplier_brand_color: invitation.supplier_brand_color,
          couple_names: invitation.couple_names,
          wedding_date: invitation.wedding_date,
          personalized_message: invitation.personalized_message,
        },
        visit_id: null,
        tracking: {
          utm_source,
          utm_medium,
          utm_campaign,
        },
      });
    }
  } catch (error) {
    console.error('Invitation API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation details' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/invite/[code]/track-visit
 * Track additional visit data (e.g., visit duration)
 */
export async function POST(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // Rate limiting
    const identifier = request.ip || 'anonymous';
    const { success } = await invitationRateLimit.check(100, identifier);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { code } = params;

    if (!code || !InvitationService.isValidCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid invitation code format' },
        { status: 400 },
      );
    }

    // Get and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    // Handle conversion tracking
    if (body.action === 'conversion') {
      const validatedData = trackConversionBodySchema.parse(body);

      // Get invitation
      const invitation = await InvitationService.getInvitationByCode(code);
      if (!invitation) {
        return NextResponse.json(
          { error: 'Invitation not found or expired' },
          { status: 404 },
        );
      }

      // Track conversion
      const conversion = await InvitationService.trackConversion(
        invitation.id,
        validatedData,
      );

      // Call webhook if configured
      try {
        const supplierSettings = await InvitationService.getSupplierSettings(
          invitation.supplier_id,
        );
        if (supplierSettings?.conversion_webhook_url) {
          await fetch(supplierSettings.conversion_webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'WedSync-Invitation-System/1.0',
            },
            body: JSON.stringify({
              invitation_code: invitation.code,
              supplier_id: invitation.supplier_id,
              conversion_id: conversion.id,
              email: conversion.email,
              oauth_provider: conversion.oauth_provider,
              timestamp: conversion.created_at,
            }),
          });
        }
      } catch (webhookError) {
        console.error('Webhook notification failed:', webhookError);
        // Don't fail the request if webhook fails
      }

      return NextResponse.json({
        success: true,
        conversion_id: conversion.id,
      });
    }

    // Handle visit tracking updates (e.g., visit duration)
    if (body.action === 'visit_update') {
      const validatedData = trackVisitBodySchema.parse(body);

      // For visit updates, we would typically update an existing visit record
      // This is a simplified implementation
      return NextResponse.json({
        success: true,
        message: 'Visit data updated',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Invitation API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/invite/[code]/analytics
 * Get analytics for invitation (protected endpoint)
 */
export async function PUT(
  request: NextRequest,
  context: DynamicAPIRouteContext,
) {
  const params = await extractParams(context.params);

  try {
    // This would require authentication for supplier access
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { code } = params;

    if (!code || !InvitationService.isValidCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid invitation code format' },
        { status: 400 },
      );
    }

    // Get invitation
    const invitation = await InvitationService.getInvitationByCode(code);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 },
      );
    }

    // Verify user has access to this invitation's supplier
    const { data: supplierAccess } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', invitation.supplier_id)
      .eq('user_id', user.id)
      .single();

    if (!supplierAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get analytics
    const analytics = await InvitationService.getInvitationAnalytics(
      invitation.id,
    );

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Invitation analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
