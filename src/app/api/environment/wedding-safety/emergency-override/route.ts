import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WeddingDaySafetyService } from '@/lib/services/wedding-safety/WeddingDaySafetyService';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';

// Strict rate limiting for emergency override (critical security operation)
const emergencyOverrideLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 3, // Only 3 attempts per minute
  message:
    'Too many emergency override attempts - contact system administrator',
});

const EmergencyOverrideRequestSchema = z.object({
  action: z.enum(['enable', 'disable', 'extend', 'status']),
  override_reason: z.string().min(10).max(500).optional(),
  emergency_contact_id: z.string().uuid().optional(),
  severity_level: z.enum(['P0', 'P1', 'P2']).optional(),
  estimated_duration_minutes: z.number().min(1).max(480).optional(), // Max 8 hours
  rollback_plan: z.string().min(20).max(1000).optional(),
  stakeholder_notification: z.boolean().default(true),
  override_id: z.string().optional(), // For disable/extend actions
});

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await emergencyOverrideLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for emergency operations' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Get active emergency overrides
    const { data: activeOverrides } = await supabase
      .from('emergency_overrides')
      .select(
        `
        *,
        emergency_contacts(name, role, phone, email)
      `,
      )
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString());

    // Get recent override history
    const { data: recentOverrides } = await supabase
      .from('emergency_overrides')
      .select(
        `
        *,
        emergency_contacts(name, role)
      `,
      )
      .eq('organization_id', organizationId)
      .gte(
        'created_at',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ) // Last 7 days
      .order('created_at', { ascending: false })
      .limit(10);

    const response = {
      active_overrides:
        activeOverrides?.map((override) => ({
          override_id: override.override_id,
          severity_level: override.severity_level,
          override_reason: override.override_reason,
          emergency_contact: override.emergency_contacts,
          created_at: override.created_at,
          expires_at: override.expires_at,
          time_remaining_minutes: Math.max(
            0,
            Math.floor(
              (new Date(override.expires_at).getTime() - new Date().getTime()) /
                (1000 * 60),
            ),
          ),
        })) || [],
      recent_history:
        recentOverrides?.map((override) => ({
          override_id: override.override_id,
          severity_level: override.severity_level,
          emergency_contact: override.emergency_contacts?.name,
          created_at: override.created_at,
          expired_at: override.expires_at,
          was_successful: override.is_active,
          duration_minutes: override.estimated_duration_minutes,
        })) || [],
      override_statistics: {
        total_overrides_7d: recentOverrides?.length || 0,
        active_overrides_count: activeOverrides?.length || 0,
        avg_duration_minutes: calculateAverageDuration(recentOverrides || []),
      },
      current_status: {
        override_active: (activeOverrides?.length || 0) > 0,
        wedding_day_restrictions: new Date().getDay() === 6,
        system_locked:
          (activeOverrides?.length || 0) === 0 && new Date().getDay() === 6,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Emergency override status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to get emergency override status' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting
    const rateLimitResult = await emergencyOverrideLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message:
            'Emergency override attempts are strictly limited for security',
          contact_support:
            'If this is a genuine emergency, contact support directly',
        },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');
    const userId = headersList.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Authentication required for emergency operations' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedRequest = EmergencyOverrideRequestSchema.parse(body);

    const safetyService = new WeddingDaySafetyService();
    const supabase = createClient();

    switch (validatedRequest.action) {
      case 'enable': {
        // Validate required fields for enable action
        if (
          !validatedRequest.override_reason ||
          !validatedRequest.emergency_contact_id ||
          !validatedRequest.severity_level ||
          !validatedRequest.estimated_duration_minutes ||
          !validatedRequest.rollback_plan
        ) {
          return NextResponse.json(
            {
              error: 'Missing required fields for emergency override',
              required_fields: [
                'override_reason',
                'emergency_contact_id',
                'severity_level',
                'estimated_duration_minutes',
                'rollback_plan',
              ],
            },
            { status: 400 },
          );
        }

        // Check if user has permission
        const hasPermission = await checkEmergencyOverridePermission(
          supabase,
          organizationId,
          userId,
        );
        if (!hasPermission) {
          return NextResponse.json(
            {
              error: 'Insufficient permissions',
              message:
                'Emergency override requires ADMIN or WEDDING_DAY_EMERGENCY role',
            },
            { status: 403 },
          );
        }

        // Check for existing active overrides
        const { data: existingOverrides } = await supabase
          .from('emergency_overrides')
          .select('override_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString());

        if (existingOverrides && existingOverrides.length > 0) {
          return NextResponse.json(
            {
              error: 'Emergency override already active',
              existing_override_id: existingOverrides[0].override_id,
              message: 'Only one emergency override can be active at a time',
            },
            { status: 409 }, // Conflict
          );
        }

        // Enable emergency override
        const overrideResult = await safetyService.enableEmergencyOverride(
          organizationId,
          userId,
          {
            override_reason: validatedRequest.override_reason,
            emergency_contact_id: validatedRequest.emergency_contact_id,
            severity_level: validatedRequest.severity_level,
            estimated_duration_minutes:
              validatedRequest.estimated_duration_minutes,
            rollback_plan: validatedRequest.rollback_plan,
            stakeholder_notification: validatedRequest.stakeholder_notification,
          },
        );

        return NextResponse.json(
          {
            success: overrideResult.success,
            override_id: overrideResult.override_id,
            expires_at: overrideResult.expires_at.toISOString(),
            notifications_sent: overrideResult.notifications_sent,
            message: 'Emergency override enabled successfully',
            next_steps: [
              'System is now accessible for emergency changes',
              'Enhanced monitoring has been activated',
              'All actions will be logged and audited',
              'Override will automatically expire at scheduled time',
            ],
          },
          { status: 201 },
        );
      }

      case 'disable': {
        if (!validatedRequest.override_id) {
          return NextResponse.json(
            { error: 'override_id required for disable action' },
            { status: 400 },
          );
        }

        // Disable the override
        const { error } = await supabase
          .from('emergency_overrides')
          .update({
            is_active: false,
            disabled_at: new Date().toISOString(),
            disabled_by: userId,
            disabled_reason:
              validatedRequest.override_reason || 'Manual disable',
          })
          .eq('override_id', validatedRequest.override_id)
          .eq('organization_id', organizationId);

        if (error) {
          return NextResponse.json(
            { error: 'Failed to disable emergency override' },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Emergency override disabled successfully',
        });
      }

      case 'extend': {
        if (
          !validatedRequest.override_id ||
          !validatedRequest.estimated_duration_minutes
        ) {
          return NextResponse.json(
            {
              error:
                'override_id and estimated_duration_minutes required for extend action',
            },
            { status: 400 },
          );
        }

        // Extend the override
        const newExpiresAt = new Date(
          Date.now() + validatedRequest.estimated_duration_minutes * 60 * 1000,
        );

        const { error } = await supabase
          .from('emergency_overrides')
          .update({
            expires_at: newExpiresAt.toISOString(),
            extension_reason: validatedRequest.override_reason,
            extended_by: userId,
            extended_at: new Date().toISOString(),
          })
          .eq('override_id', validatedRequest.override_id)
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (error) {
          return NextResponse.json(
            { error: 'Failed to extend emergency override' },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          new_expires_at: newExpiresAt.toISOString(),
          message: 'Emergency override extended successfully',
        });
      }

      case 'status':
        // This is handled by the GET request
        return NextResponse.json(
          { error: 'Use GET request for status information' },
          { status: 400 },
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Emergency override operation failed:', error);

    // Log the failed attempt
    try {
      const headersList = await headers();
      const organizationId = headersList.get('x-organization-id');
      const userId = headersList.get('x-user-id');

      if (organizationId) {
        const supabase = createClient();
        await supabase.from('security_events').insert({
          organization_id: organizationId,
          user_id: userId,
          event_type: 'failed_emergency_override',
          severity: 'HIGH',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            ip_address: headers().get('x-forwarded-for') || 'unknown',
          },
        });
      }
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return NextResponse.json(
      {
        error: 'Emergency override operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper functions
async function checkEmergencyOverridePermission(
  supabase: any,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data: userRole } = await supabase
      .from('user_organization_roles')
      .select('role, permissions')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!userRole) return false;

    return (
      ['ADMIN', 'WEDDING_DAY_EMERGENCY'].includes(userRole.role) ||
      userRole.permissions?.includes('emergency_override')
    );
  } catch (error) {
    console.error('Error checking emergency override permission:', error);
    return false;
  }
}

function calculateAverageDuration(overrides: any[]): number {
  if (overrides.length === 0) return 0;

  const totalDuration = overrides.reduce(
    (sum, override) => sum + (override.estimated_duration_minutes || 0),
    0,
  );

  return Math.round(totalDuration / overrides.length);
}
