import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidation } from '@/lib/validation/middleware';
import { uuidSchema } from '@/lib/validation/schemas';
import { MicrosoftGraphClient } from '@/lib/integrations/microsoft-graph-client';
import { OutlookSyncService } from '@/lib/services/outlook-sync-service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

const graphClient = new MicrosoftGraphClient({
  clientId:
    process.env.MICROSOFT_CLIENT_ID ||
    (() => {
      throw new Error('Missing environment variable: MICROSOFT_CLIENT_ID');
    })(),
  clientSecret:
    process.env.MICROSOFT_CLIENT_SECRET ||
    (() => {
      throw new Error('Missing environment variable: MICROSOFT_CLIENT_SECRET');
    })(),
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  redirectUri:
    process.env.MICROSOFT_REDIRECT_URI ||
    (() => {
      throw new Error('Missing environment variable: MICROSOFT_REDIRECT_URI');
    })(),
  scopes: [
    'https://graph.microsoft.com/calendars.readwrite',
    'https://graph.microsoft.com/user.read',
  ],
});

const syncService = new OutlookSyncService(graphClient);

// Trigger sync schema
const triggerSyncSchema = z.object({
  syncType: z
    .enum(['initial', 'incremental', 'full'])
    .optional()
    .default('incremental'),
  organizationId: uuidSchema,
});

// Sync status schema
const syncStatusSchema = z.object({
  syncId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

/**
 * GET /api/calendar/outlook/sync
 * Get sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const syncId = searchParams.get('syncId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (syncId) {
      // Get specific sync operation
      const { data: syncOperation, error } = await supabase
        .from('sync_operations')
        .select('*')
        .eq('id', syncId)
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .single();

      if (error || !syncOperation) {
        return NextResponse.json(
          { error: 'Sync operation not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        sync: syncOperation,
      });
    } else {
      // Get sync history
      const { data: syncHistory, error } = await supabase
        .from('sync_operations')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to retrieve sync history' },
          { status: 500 },
        );
      }

      // Get current integration status
      const { data: integration } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .single();

      // Get sync statistics
      const { data: syncStats } = await supabase
        .from('integration_sync_logs')
        .select('activity, status, created_at')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('created_at', { ascending: false });

      return NextResponse.json({
        integration: integration || null,
        syncHistory: syncHistory || [],
        syncStats: {
          total: syncStats?.length || 0,
          successful:
            syncStats?.filter((s) => s.status === 'success').length || 0,
          failed: syncStats?.filter((s) => s.status === 'error').length || 0,
          lastWeekActivity: syncStats || [],
        },
        pagination: {
          limit,
          offset,
          hasMore: (syncHistory?.length || 0) === limit,
        },
      });
    }
  } catch (error) {
    console.error('Sync status retrieval failed:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sync status' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/calendar/outlook/sync
 * Trigger manual sync operation
 */
export const POST = withValidation(
  triggerSyncSchema,
  async (request: NextRequest, validatedData) => {
    try {
      // Get authenticated user
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      const token = authHeader.substring(7);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 },
        );
      }

      // Check if integration is connected
      const { data: integration, error: integrationError } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .single();

      if (integrationError || !integration || !integration.is_connected) {
        return NextResponse.json(
          { error: 'Microsoft Outlook integration not connected' },
          { status: 400 },
        );
      }

      // Rate limiting for sync operations (5 per hour per user)
      const rateKey = `sync_${user.id}`;
      const { data: rateLimitData } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', rateKey)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .single();

      if (rateLimitData && rateLimitData.count >= 5) {
        return NextResponse.json(
          { error: 'Sync rate limit exceeded. Please try again later.' },
          { status: 429 },
        );
      }

      // Check if there's already a sync operation running
      const { data: runningSyncs } = await supabase
        .from('sync_operations')
        .select('id')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .eq('status', 'running');

      if (runningSyncs && runningSyncs.length > 0) {
        return NextResponse.json(
          { error: 'Sync operation already in progress' },
          { status: 409 },
        );
      }

      // Check Microsoft Graph connection
      const connectionStatus = await graphClient.checkConnection(user.id);
      if (!connectionStatus.connected) {
        return NextResponse.json(
          {
            error: 'Microsoft account connection is invalid. Please reconnect.',
          },
          { status: 400 },
        );
      }

      // Trigger sync operation
      const syncResult = await syncService.performBidirectionalSync(
        user.id,
        validatedData.syncType,
      );

      // Update rate limiting
      await supabase.from('rate_limits').upsert({
        key: rateKey,
        count: (rateLimitData?.count || 0) + 1,
        created_at: new Date().toISOString(),
      });

      // Audit log sync trigger
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: validatedData.organizationId,
        action: 'outlook_sync_triggered',
        resource_type: 'integration',
        resource_details: {
          syncType: validatedData.syncType,
          syncId: syncResult.syncId,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        syncResult,
        message: `${validatedData.syncType} sync completed successfully`,
      });
    } catch (error) {
      console.error('Sync trigger failed:', error);
      return NextResponse.json(
        {
          error: 'Sync operation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * PUT /api/calendar/outlook/sync
 * Update sync preferences
 */
export const PUT = withValidation(
  z.object({
    organizationId: uuidSchema,
    syncPreferences: z
      .object({
        eventTypes: z.array(z.string()).optional(),
        syncConflictResolution: z
          .enum(['ask', 'prefer_outlook', 'prefer_wedsync'])
          .optional(),
        autoSyncInterval: z.number().min(5).max(1440).optional(), // 5 minutes to 24 hours
        syncDirection: z
          .enum(['to_outlook', 'from_outlook', 'bidirectional'])
          .optional(),
      })
      .optional(),
  }),
  async (request: NextRequest, validatedData) => {
    try {
      // Get authenticated user
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      const token = authHeader.substring(7);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 },
        );
      }

      // Get current integration
      const { data: integration, error: integrationError } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook')
        .single();

      if (integrationError || !integration) {
        return NextResponse.json(
          { error: 'Microsoft Outlook integration not found' },
          { status: 404 },
        );
      }

      // Merge new preferences with existing ones
      const currentSettings = integration.sync_settings || {};
      const newSettings = {
        ...currentSettings,
        ...validatedData.syncPreferences,
      };

      // Update integration preferences
      const { data: updatedIntegration, error: updateError } = await supabase
        .from('integration_connections')
        .update({
          sync_settings: newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update sync preferences' },
          { status: 500 },
        );
      }

      // Audit log preference update
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: validatedData.organizationId,
        action: 'outlook_sync_preferences_updated',
        resource_type: 'integration',
        resource_details: {
          oldSettings: currentSettings,
          newSettings: newSettings,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        integration: updatedIntegration,
        message: 'Sync preferences updated successfully',
      });
    } catch (error) {
      console.error('Sync preferences update failed:', error);
      return NextResponse.json(
        { error: 'Failed to update sync preferences' },
        { status: 500 },
      );
    }
  },
);
