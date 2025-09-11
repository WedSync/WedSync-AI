/**
 * WS-212 Section Configuration API
 * REST endpoints for managing section configurations per wedding
 * Enables wedding planners to customize dashboard section visibility and settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ConfigEngine } from '@/lib/services/config-engine';
import {
  SectionType,
  ConfigContext,
  UpdateSectionConfigRequest,
} from '@/types/section-config';

const configEngine = new ConfigEngine();

/**
 * GET /api/sections/config
 * Get section configurations for a wedding
 * Query params: weddingId, sectionType (optional - if not provided, returns all sections)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const weddingId = searchParams.get('weddingId');
    const sectionType = searchParams.get('sectionType') as SectionType | null;

    // Validate required parameters
    if (!weddingId) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'weddingId is required',
        },
        { status: 400 },
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Valid authentication required' },
        { status: 401 },
      );
    }

    // Verify user has access to this wedding
    const hasAccess = await verifyWeddingAccess(user.id, weddingId, supabase);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Access denied',
          details: 'You do not have access to this wedding',
        },
        { status: 403 },
      );
    }

    // Create context
    const context: ConfigContext = {
      userId: user.id,
      userRole: 'guest', // Will be determined by ConfigEngine
      weddingId,
    };

    // Get user's organization for additional context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (profile?.organization_id) {
      context.organizationId = profile.organization_id;
    }

    // Get section configuration(s)
    if (sectionType) {
      // Get single section configuration
      const sectionConfig = await configEngine.getSectionConfig(
        weddingId,
        sectionType,
        context,
      );

      if (!sectionConfig) {
        return NextResponse.json(
          {
            error: 'Section configuration not found',
            details: `No configuration found for section type: ${sectionType}`,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        weddingId,
        sectionType,
        configuration: sectionConfig,
      });
    } else {
      // Get all section configurations for the wedding
      const sectionConfigs = await configEngine.getWeddingSectionConfigs(
        weddingId,
        context,
      );

      return NextResponse.json({
        weddingId,
        configurations: sectionConfigs,
        total: sectionConfigs.length,
      });
    }
  } catch (error) {
    console.error('SectionConfigAPI: Error getting configurations:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to retrieve section configurations',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/sections/config
 * Update section configuration (planner only)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body: UpdateSectionConfigRequest = await request.json();

    const {
      weddingId,
      sectionType,
      isVisible,
      displayOrder,
      customSettings,
      customTitle,
      customDescription,
      visibilityRules,
    } = body;

    // Validate request body
    if (!weddingId || !sectionType) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: 'weddingId and sectionType are required',
        },
        { status: 400 },
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Valid authentication required' },
        { status: 401 },
      );
    }

    // Verify user has permission to configure this wedding (planner only)
    const canConfigure = await verifyConfigurationPermission(
      user.id,
      weddingId,
      supabase,
    );

    if (!canConfigure) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details: 'Only wedding planners can modify section configurations',
        },
        { status: 403 },
      );
    }

    // Create context
    const context: ConfigContext = {
      userId: user.id,
      userRole: 'planner',
      weddingId,
    };

    // Get user's organization for additional context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profile?.organization_id) {
      context.organizationId = profile.organization_id;
    }

    // Update section configuration
    const success = await configEngine.updateSectionConfig(body, context);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Update failed',
          details: 'Failed to update section configuration',
        },
        { status: 500 },
      );
    }

    // Get updated configuration to return
    const updatedConfig = await configEngine.getSectionConfig(
      weddingId,
      sectionType,
      context,
    );

    return NextResponse.json({
      success: true,
      message: 'Section configuration updated successfully',
      weddingId,
      sectionType,
      configuration: updatedConfig,
    });
  } catch (error) {
    console.error('SectionConfigAPI: Error updating configuration:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to update section configuration',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sections/config/initialize
 * Initialize section configurations for a new wedding (planner only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { weddingId } = body;

    // Validate request body
    if (!weddingId) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: 'weddingId is required',
        },
        { status: 400 },
      );
    }

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Valid authentication required' },
        { status: 401 },
      );
    }

    // Verify user has permission to configure this wedding (planner only)
    const canConfigure = await verifyConfigurationPermission(
      user.id,
      weddingId,
      supabase,
    );

    if (!canConfigure) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details:
            'Only wedding planners can initialize section configurations',
        },
        { status: 403 },
      );
    }

    // Check if configurations already exist
    const { data: existingConfigs } = await supabase
      .from('section_configurations')
      .select('id')
      .eq('wedding_id', weddingId)
      .limit(1);

    if (existingConfigs && existingConfigs.length > 0) {
      return NextResponse.json(
        {
          error: 'Configurations already exist',
          details:
            'Section configurations have already been initialized for this wedding',
        },
        { status: 409 },
      );
    }

    // Initialize wedding sections
    const success = await configEngine.initializeWeddingSections(
      weddingId,
      user.id,
    );

    if (!success) {
      return NextResponse.json(
        {
          error: 'Initialization failed',
          details: 'Failed to initialize section configurations',
        },
        { status: 500 },
      );
    }

    // Get created configurations
    const context: ConfigContext = {
      userId: user.id,
      userRole: 'planner',
      weddingId,
    };

    const configurations = await configEngine.getWeddingSectionConfigs(
      weddingId,
      context,
    );

    return NextResponse.json({
      success: true,
      message: 'Section configurations initialized successfully',
      weddingId,
      configurations,
      total: configurations.length,
    });
  } catch (error) {
    console.error(
      'SectionConfigAPI: Error initializing configurations:',
      error,
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to initialize section configurations',
      },
      { status: 500 },
    );
  }
}

/**
 * Verify if user has access to this wedding
 */
async function verifyWeddingAccess(
  userId: string,
  weddingId: string,
  supabase: any,
): Promise<boolean> {
  try {
    // Check if user is a planner
    const { data: plannerCheck } = await supabase
      .from('weddings')
      .select(
        `
        organization_id,
        organizations!inner (
          user_profiles!inner (
            user_id
          )
        )
      `,
      )
      .eq('id', weddingId)
      .eq('organizations.user_profiles.user_id', userId)
      .single();

    if (plannerCheck) return true;

    // Check if user is part of the couple
    const { data: coupleCheck } = await supabase
      .from('weddings')
      .select('couple_user_id, partner_user_id')
      .eq('id', weddingId)
      .single();

    if (
      coupleCheck &&
      (coupleCheck.couple_user_id === userId ||
        coupleCheck.partner_user_id === userId)
    ) {
      return true;
    }

    // Check if user is a vendor
    const { data: vendorCheck } = await supabase
      .from('wedding_vendors')
      .select(
        `
        vendors!inner (
          organization_id,
          organizations!inner (
            user_profiles!inner (
              user_id
            )
          )
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('vendors.organizations.user_profiles.user_id', userId)
      .single();

    return !!vendorCheck;
  } catch (error) {
    console.error('Error verifying wedding access:', error);
    return false;
  }
}

/**
 * Verify if user can configure this wedding
 */
async function verifyConfigurationPermission(
  userId: string,
  weddingId: string,
  supabase: any,
): Promise<boolean> {
  try {
    // Check if user is a planner for this wedding
    const { data: plannerCheck } = await supabase
      .from('weddings')
      .select(
        `
        organization_id,
        organizations!inner (
          user_profiles!inner (
            user_id,
            role
          )
        )
      `,
      )
      .eq('id', weddingId)
      .eq('organizations.user_profiles.user_id', userId)
      .single();

    if (
      plannerCheck &&
      plannerCheck.organizations?.user_profiles?.[0]?.role === 'planner'
    ) {
      return true;
    }

    // Also check if user is admin
    const { data: adminCheck } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    return !!adminCheck;
  } catch (error) {
    console.error('Error verifying configuration permission:', error);
    return false;
  }
}
