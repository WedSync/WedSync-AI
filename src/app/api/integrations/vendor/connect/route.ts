/**
 * WS-342 Real-Time Wedding Collaboration - Vendor Integration Connection API
 * Team C: Integration & System Architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { vendorIntegrationManager } from '@/lib/integrations/vendor-integration-manager';
import { z } from 'zod';

// Validation schema
const ConnectVendorSchema = z.object({
  vendorSystemType: z.enum([
    'photography_crm',
    'venue_management',
    'catering_system',
    'florist_software',
    'wedding_planning',
    'booking_system',
    'payment_processor',
    'communication',
    'calendar_system',
  ]),
  credentials: z.record(z.string()),
  configuration: z.record(z.any()).optional().default({}),
  weddingId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    console.log('🔌 Connecting vendor system integration...');

    // Parse and validate request body
    const body = await req.json();
    const validatedData = ConnectVendorSchema.parse(body);

    // Get authenticated user
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 },
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User must belong to an organization' },
        { status: 400 },
      );
    }

    // Connect vendor system
    const integrationResult =
      await vendorIntegrationManager.connectVendorSystem({
        systemType: validatedData.vendorSystemType,
        credentials: validatedData.credentials,
        configuration: {
          ...validatedData.configuration,
          organizationId: profile.organization_id,
          userId: user.id,
        },
      });

    if (!integrationResult.success) {
      return NextResponse.json(
        { error: integrationResult.error },
        { status: 400 },
      );
    }

    // If weddingId is provided, link this integration to the wedding
    if (validatedData.weddingId) {
      const { error: linkError } = await supabase
        .from('wedding_vendor_integrations')
        .insert({
          wedding_id: validatedData.weddingId,
          vendor_integration_id: integrationResult.integrationId,
          system_type: validatedData.vendorSystemType,
          status: 'active',
          connected_by: user.id,
        });

      if (linkError) {
        console.error('Failed to link integration to wedding:', linkError);
        // Don't fail the entire operation, just log the error
      }
    }

    // Log successful connection
    await supabase.from('integration_audit_log').insert({
      integration_id: integrationResult.integrationId,
      action: 'connected',
      performed_by: user.id,
      details: {
        systemType: validatedData.vendorSystemType,
        capabilities: integrationResult.capabilities,
      },
    });

    console.log(
      '✅ Vendor integration connected successfully:',
      integrationResult.integrationId,
    );

    return NextResponse.json({
      success: true,
      integrationId: integrationResult.integrationId,
      systemType: validatedData.vendorSystemType,
      capabilities: integrationResult.capabilities,
      message: 'Vendor system connected successfully',
    });
  } catch (error) {
    console.error('❌ Failed to connect vendor system:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to connect vendor system' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const weddingId = searchParams.get('weddingId');

    // Get authenticated user
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('vendor_integrations').select(`
        *,
        wedding_vendor_integrations (
          wedding_id,
          status
        )
      `);

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Filter by wedding if provided
    if (weddingId) {
      query = query
        .inner('wedding_vendor_integrations', 'id', 'vendor_integration_id')
        .eq('wedding_vendor_integrations.wedding_id', weddingId);
    }

    const { data: integrations, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      integrations: integrations || [],
    });
  } catch (error) {
    console.error('Failed to fetch vendor integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID required' },
        { status: 400 },
      );
    }

    // Get authenticated user
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user can delete this integration
    const { data: integration } = await supabase
      .from('vendor_integrations')
      .select('organization_id')
      .eq('id', integrationId)
      .single();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (
      !integration ||
      !profile ||
      integration.organization_id !== profile.organization_id
    ) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 404 },
      );
    }

    // Soft delete the integration
    const { error: deleteError } = await supabase
      .from('vendor_integrations')
      .update({
        status: 'deleted',
        deleted_at: new Date(),
        deleted_by: user.id,
      })
      .eq('id', integrationId);

    if (deleteError) {
      throw deleteError;
    }

    // Log deletion
    await supabase.from('integration_audit_log').insert({
      integration_id: integrationId,
      action: 'deleted',
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 },
    );
  }
}
