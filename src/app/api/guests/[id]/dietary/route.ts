/**
 * WS-152: Dietary Requirements CRUD API
 * Path: /api/guests/:id/dietary
 * Critical: Handles life-threatening medical information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { dietaryService } from '@/lib/services/dietaryService';
import {
  createDietaryRequirementSchema,
  updateDietaryRequirementSchema,
  guestIdParamSchema,
  sanitizeMedicalData,
} from '@/lib/validations/dietary';
import { logger } from '@/lib/monitoring/logger';
import { withAuth } from '@/lib/auth/middleware';
import { DietarySeverity } from '@/types/dietary';

// Rate limiting for critical endpoints
const RATE_LIMIT = {
  window: 60000, // 1 minute
  maxRequests: 30,
};

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.window,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT.maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * GET /api/guests/:id/dietary
 * Get all dietary requirements for a guest
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Validate guest ID
    const validationResult = guestIdParamSchema.safeParse({ guest_id: id });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid guest ID format' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify guest belongs to user's organization
    const { data: guest } = await supabase
      .from('guests')
      .select('couple_id')
      .eq('id', id)
      .single();

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Check authorization - user must have access to this couple
    const { data: hasAccess } = await supabase
      .from('couples')
      .select('id')
      .eq('id', guest.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess) {
      logger.warn('Unauthorized access attempt to dietary requirements', {
        user_id: user.id,
        guest_id: id,
      });
      return NextResponse.json(
        { error: 'Unauthorized access to this guest' },
        { status: 403 },
      );
    }

    // Fetch dietary requirements
    const { data: requirements, error } = await supabase
      .from('dietary_requirements')
      .select('*')
      .eq('guest_id', id)
      .order('severity', { ascending: true }) // Critical first
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch dietary requirements', {
        error,
        guest_id: id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch dietary requirements' },
        { status: 500 },
      );
    }

    // Log access to medical data (sanitized)
    logger.info('Dietary requirements accessed', {
      user_id: user.id,
      guest_id: id,
      requirement_count: requirements?.length || 0,
      has_critical: requirements?.some(
        (r) => r.severity === DietarySeverity.LIFE_THREATENING,
      ),
    });

    return NextResponse.json({
      guest_id: id,
      requirements: requirements || [],
      total_count: requirements?.length || 0,
      critical_count:
        requirements?.filter(
          (r) => r.severity === DietarySeverity.LIFE_THREATENING,
        ).length || 0,
    });
  } catch (error) {
    logger.error('Error in GET dietary requirements', {
      error,
      guest_id: (await params).id,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/guests/:id/dietary
 * Create a new dietary requirement for a guest
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Validate guest ID
    const guestValidation = guestIdParamSchema.safeParse({ guest_id: id });
    if (!guestValidation.success) {
      return NextResponse.json(
        { error: 'Invalid guest ID format' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - stricter for POST
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createDietaryRequirementSchema.safeParse({
      ...body,
      guest_id: id,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify guest exists and user has access
    const { data: guest } = await supabase
      .from('guests')
      .select('couple_id, first_name, last_name')
      .eq('id', id)
      .single();

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const { data: hasAccess } = await supabase
      .from('couples')
      .select('id')
      .eq('id', guest.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess) {
      logger.warn('Unauthorized attempt to create dietary requirement', {
        user_id: user.id,
        guest_id: id,
      });
      return NextResponse.json(
        { error: 'Unauthorized access to this guest' },
        { status: 403 },
      );
    }

    // Create dietary requirement using service
    const requirement = await dietaryService.createDietaryRequirement(
      validation.data,
      user.id,
    );

    // Log successful creation of critical medical data
    if (requirement.severity === DietarySeverity.LIFE_THREATENING) {
      logger.warn('Life-threatening dietary requirement created', {
        guest_id: id,
        guest_name: `${guest.first_name} ${guest.last_name}`,
        allergen: requirement.allergen,
        created_by: user.id,
      });

      // Send notification to couple
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'CRITICAL_DIETARY',
        title: 'Critical Dietary Requirement Added',
        message: `Life-threatening allergy recorded for ${guest.first_name} ${guest.last_name}`,
        severity: 'HIGH',
        metadata: {
          guest_id: id,
          requirement_id: requirement.id,
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Dietary requirement created successfully',
        requirement,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Error creating dietary requirement', {
      error,
      guest_id: (await params).id,
      sanitized_body: sanitizeMedicalData(
        await request.json().catch(() => ({})),
      ),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/guests/:id/dietary/:requirement_id
 * Update a dietary requirement
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Extract requirement_id from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const requirementId = pathParts[pathParts.length - 1];

    if (!requirementId || requirementId === 'dietary') {
      return NextResponse.json(
        { error: 'Requirement ID is required' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateDietaryRequirementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify requirement exists and user has access
    const { data: requirement } = await supabase
      .from('dietary_requirements')
      .select(
        `
        *,
        guests!inner(
          couple_id
        )
      `,
      )
      .eq('id', requirementId)
      .eq('guest_id', id)
      .single();

    if (!requirement) {
      return NextResponse.json(
        { error: 'Dietary requirement not found' },
        { status: 404 },
      );
    }

    const { data: hasAccess } = await supabase
      .from('couples')
      .select('id')
      .eq('id', requirement.guests.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess) {
      logger.warn('Unauthorized attempt to update dietary requirement', {
        user_id: user.id,
        requirement_id: requirementId,
      });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 },
      );
    }

    // Update using service
    const updated = await dietaryService.updateDietaryRequirement(
      requirementId,
      validation.data,
      user.id,
    );

    // Log critical changes
    if (
      validation.data.severity === DietarySeverity.LIFE_THREATENING &&
      requirement.severity !== DietarySeverity.LIFE_THREATENING
    ) {
      logger.warn('Dietary requirement upgraded to life-threatening', {
        requirement_id: requirementId,
        guest_id: id,
        updated_by: user.id,
      });
    }

    return NextResponse.json({
      message: 'Dietary requirement updated successfully',
      requirement: updated,
    });
  } catch (error) {
    logger.error('Error updating dietary requirement', {
      error,
      guest_id: (await params).id,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/guests/:id/dietary/:requirement_id
 * Delete a dietary requirement (with safety confirmation)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Extract requirement_id from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const requirementId = pathParts[pathParts.length - 1];

    if (!requirementId || requirementId === 'dietary') {
      return NextResponse.json(
        { error: 'Requirement ID is required' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const user = await withAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for confirmation header for critical allergies
    const confirmationToken = request.headers.get('X-Confirm-Delete');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch requirement to check severity
    const { data: requirement } = await supabase
      .from('dietary_requirements')
      .select(
        `
        *,
        guests!inner(
          couple_id,
          first_name,
          last_name
        )
      `,
      )
      .eq('id', requirementId)
      .eq('guest_id', id)
      .single();

    if (!requirement) {
      return NextResponse.json(
        { error: 'Dietary requirement not found' },
        { status: 404 },
      );
    }

    // Check authorization
    const { data: hasAccess } = await supabase
      .from('couples')
      .select('id')
      .eq('id', requirement.guests.couple_id)
      .eq('user_id', user.id)
      .single();

    if (!hasAccess) {
      logger.warn('Unauthorized attempt to delete dietary requirement', {
        user_id: user.id,
        requirement_id: requirementId,
      });
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 },
      );
    }

    // Require confirmation for life-threatening allergies
    if (requirement.severity === DietarySeverity.LIFE_THREATENING) {
      const expectedToken = `DELETE-CRITICAL-${requirementId}`;
      if (confirmationToken !== expectedToken) {
        return NextResponse.json(
          {
            error:
              'Confirmation required for deleting life-threatening allergy',
            confirmation_token: expectedToken,
            message:
              'Include X-Confirm-Delete header with the confirmation token',
          },
          { status: 409 }, // Conflict
        );
      }
    }

    // Archive the requirement instead of hard delete (for audit trail)
    const { error: archiveError } = await supabase
      .from('dietary_requirements_archive')
      .insert({
        ...requirement,
        archived_at: new Date(),
        archived_by: user.id,
      });

    if (archiveError) {
      logger.error('Failed to archive dietary requirement', {
        error: archiveError,
        requirement_id: requirementId,
      });
    }

    // Soft delete the requirement
    const { error: deleteError } = await supabase
      .from('dietary_requirements')
      .update({
        deleted_at: new Date(),
        deleted_by: user.id,
      })
      .eq('id', requirementId);

    if (deleteError) {
      throw deleteError;
    }

    // Log deletion of medical data
    logger.warn('Dietary requirement deleted', {
      requirement_id: requirementId,
      guest_id: id,
      guest_name: `${requirement.guests.first_name} ${requirement.guests.last_name}`,
      severity: requirement.severity,
      deleted_by: user.id,
    });

    return NextResponse.json({
      message: 'Dietary requirement deleted successfully',
      archived: true,
    });
  } catch (error) {
    logger.error('Error deleting dietary requirement', {
      error,
      guest_id: (await params).id,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
