import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { VendorIntegrationManager } from '@/lib/integrations/vendor-integration-manager';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { z } from 'zod';

// Request validation schemas
const CreateIntegrationSchema = z.object({
  weddingId: z.string().min(1),
  vendorId: z.string().min(1),
  integrationType: z.enum([
    'tave',
    'studio_ninja',
    'honeybook',
    'light_blue',
    'google_calendar',
    'outlook',
    'apple_calendar',
  ]),
  credentials: z.record(z.string()),
  syncPreferences: z.object({
    enabled: z.boolean(),
    syncInterval: z.number().min(60).max(86400), // 1 minute to 24 hours
    dataTypes: z.array(
      z.enum(['contacts', 'events', 'invoices', 'projects', 'communications']),
    ),
    conflictResolution: z.enum([
      'manual',
      'vendor_wins',
      'wedsync_wins',
      'latest_wins',
    ]),
  }),
  webhookUrl: z.string().url().optional(),
});

const UpdateIntegrationSchema = z.object({
  integrationId: z.string().min(1),
  syncPreferences: z
    .object({
      enabled: z.boolean().optional(),
      syncInterval: z.number().min(60).max(86400).optional(),
      dataTypes: z
        .array(
          z.enum([
            'contacts',
            'events',
            'invoices',
            'projects',
            'communications',
          ]),
        )
        .optional(),
      conflictResolution: z
        .enum(['manual', 'vendor_wins', 'wedsync_wins', 'latest_wins'])
        .optional(),
    })
    .optional(),
  credentials: z.record(z.string()).optional(),
});

// Initialize integration manager
const integrationManager = new VendorIntegrationManager();

/**
 * GET /api/integrations - List all integrations for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('weddingId');
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');

    // Build query filters
    let query = supabase
      .from('integrations')
      .select(
        `
        *,
        weddings:weddingId (
          id,
          couple_name,
          wedding_date
        ),
        vendors:vendorId (
          id,
          business_name,
          vendor_type
        )
      `,
      )
      .eq('created_by', user.id);

    if (weddingId) {
      query = query.eq('wedding_id', weddingId);
    }

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: integrations, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 },
      );
    }

    // Transform data for API response
    const transformedIntegrations =
      integrations?.map((integration) => ({
        id: integration.id,
        weddingId: integration.wedding_id,
        vendorId: integration.vendor_id,
        integrationType: integration.integration_type,
        status: integration.status,
        lastSync: integration.last_sync_at,
        syncPreferences: integration.sync_preferences,
        healthStatus: integration.health_status,
        errorCount: integration.error_count,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at,
        wedding: integration.weddings
          ? {
              id: integration.weddings.id,
              coupleName: integration.weddings.couple_name,
              weddingDate: integration.weddings.wedding_date,
            }
          : null,
        vendor: integration.vendors
          ? {
              id: integration.vendors.id,
              businessName: integration.vendors.business_name,
              vendorType: integration.vendors.vendor_type,
            }
          : null,
      })) || [];

    return NextResponse.json({
      success: true,
      integrations: transformedIntegrations,
      total: transformedIntegrations.length,
    });
  } catch (error) {
    console.error('GET /api/integrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/integrations - Create new integration
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateIntegrationSchema.parse(body);

    // Check if wedding belongs to user (vendor check)
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, vendors!inner(*)')
      .eq('id', validatedData.weddingId)
      .eq('vendors.user_id', user.id)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json(
        { error: 'Wedding not found or access denied' },
        { status: 403 },
      );
    }

    // Test connection before creating integration
    const connectionTest = await integrationManager.testConnection(
      validatedData.integrationType,
      validatedData.credentials,
    );

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: 'Connection test failed',
          details: connectionTest.error,
          supportedDataTypes: connectionTest.supportedDataTypes,
        },
        { status: 400 },
      );
    }

    // Create integration in database
    const { data: integration, error: insertError } = await supabase
      .from('integrations')
      .insert({
        wedding_id: validatedData.weddingId,
        vendor_id: validatedData.vendorId,
        integration_type: validatedData.integrationType,
        credentials: validatedData.credentials, // Encrypted in database
        sync_preferences: validatedData.syncPreferences,
        webhook_url: validatedData.webhookUrl,
        status: 'active',
        health_status: 'healthy',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Integration creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create integration' },
        { status: 500 },
      );
    }

    // Register integration with manager
    const registrationResult = await integrationManager.registerIntegration({
      id: integration.id,
      weddingId: validatedData.weddingId,
      vendorId: validatedData.vendorId,
      type: validatedData.integrationType,
      credentials: validatedData.credentials,
      syncPreferences: validatedData.syncPreferences,
      webhookUrl: validatedData.webhookUrl,
    });

    if (!registrationResult.success) {
      // Rollback database insertion
      await supabase.from('integrations').delete().eq('id', integration.id);

      return NextResponse.json(
        { error: registrationResult.error },
        { status: 500 },
      );
    }

    // Schedule initial sync
    if (validatedData.syncPreferences.enabled) {
      integrationManager.scheduleSync(
        integration.id,
        validatedData.syncPreferences.syncInterval,
      );
    }

    return NextResponse.json(
      {
        success: true,
        integration: {
          id: integration.id,
          weddingId: integration.wedding_id,
          vendorId: integration.vendor_id,
          integrationType: integration.integration_type,
          status: integration.status,
          healthStatus: integration.health_status,
          createdAt: integration.created_at,
          supportedDataTypes: connectionTest.supportedDataTypes,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('POST /api/integrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/integrations - Update existing integration
 */
export async function PUT(request: NextRequest) {
  try {
    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateIntegrationSchema.parse(body);

    // Check if integration belongs to user
    const { data: existingIntegration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', validatedData.integrationId)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !existingIntegration) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 403 },
      );
    }

    // Test new credentials if provided
    if (validatedData.credentials) {
      const connectionTest = await integrationManager.testConnection(
        existingIntegration.integration_type,
        validatedData.credentials,
      );

      if (!connectionTest.success) {
        return NextResponse.json(
          { error: 'Connection test failed', details: connectionTest.error },
          { status: 400 },
        );
      }
    }

    // Update integration
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.syncPreferences) {
      updateData.sync_preferences = {
        ...existingIntegration.sync_preferences,
        ...validatedData.syncPreferences,
      };
    }

    if (validatedData.credentials) {
      updateData.credentials = validatedData.credentials;
    }

    const { data: updatedIntegration, error: updateError } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', validatedData.integrationId)
      .select()
      .single();

    if (updateError) {
      console.error('Integration update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 },
      );
    }

    // Update sync schedule if interval changed
    if (validatedData.syncPreferences?.syncInterval) {
      integrationManager.updateSyncSchedule(
        validatedData.integrationId,
        validatedData.syncPreferences.syncInterval,
      );
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: updatedIntegration.id,
        weddingId: updatedIntegration.wedding_id,
        vendorId: updatedIntegration.vendor_id,
        integrationType: updatedIntegration.integration_type,
        status: updatedIntegration.status,
        syncPreferences: updatedIntegration.sync_preferences,
        healthStatus: updatedIntegration.health_status,
        updatedAt: updatedIntegration.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('PUT /api/integrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/integrations - Delete integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 },
      );
    }

    // Create Supabase client
    const headersList = await headers();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = headersList.get('cookie');
            return cookieHeader ? [{ name: 'all', value: cookieHeader }] : [];
          },
          setAll: () => {},
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if integration belongs to user
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 403 },
      );
    }

    // Deregister from integration manager
    await integrationManager.deregisterIntegration(integrationId);

    // Soft delete integration (keep for audit trail)
    const { error: deleteError } = await supabase
      .from('integrations')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);

    if (deleteError) {
      console.error('Integration deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete integration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/integrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
