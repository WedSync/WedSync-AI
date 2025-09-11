import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MicrosoftGraphClient } from '@/lib/integrations/microsoft-graph-client';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

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

// OAuth initiation schema
const oauthInitiationSchema = z.object({
  organizationId: uuidSchema,
  returnUrl: secureStringSchema.max(500).optional(),
});

// OAuth callback schema
const oauthCallbackSchema = z.object({
  code: secureStringSchema.max(1000),
  state: secureStringSchema.max(500),
  session_state: secureStringSchema.max(500).optional(),
  error: secureStringSchema.max(100).optional(),
  error_description: secureStringSchema.max(500).optional(),
});

/**
 * POST /api/calendar/outlook/auth
 * Initiate OAuth flow for Microsoft Outlook integration
 */
export const POST = withValidation(
  oauthInitiationSchema,
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

      // Rate limiting for OAuth operations (5 requests per hour per user)
      const rateKey = `oauth_${user.id}`;
      const { data: rateLimitData } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', rateKey)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .single();

      if (rateLimitData && rateLimitData.count >= 5) {
        return NextResponse.json(
          { error: 'OAuth rate limit exceeded. Please try again later.' },
          { status: 429 },
        );
      }

      // Generate secure state parameter
      const state = crypto.randomBytes(32).toString('hex');

      // Store OAuth state for validation
      await supabase.from('oauth_states').upsert({
        state,
        user_id: user.id,
        organization_id: validatedData.organizationId,
        integration_type: 'microsoft-outlook',
        return_url: validatedData.returnUrl,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString(),
      });

      // Generate authorization URL
      const authUrl = graphClient.generateAuthorizationUrl(state, user.id);

      // Update rate limiting
      await supabase.from('rate_limits').upsert({
        key: rateKey,
        count: (rateLimitData?.count || 0) + 1,
        created_at: new Date().toISOString(),
      });

      // Audit log OAuth initiation
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: validatedData.organizationId,
        action: 'outlook_oauth_initiated',
        resource_type: 'integration',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        authUrl,
        state,
      });
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      return NextResponse.json(
        { error: 'Failed to start authentication' },
        { status: 500 },
      );
    }
  },
);

/**
 * GET /api/calendar/outlook/auth?code=...&state=...
 * Handle OAuth callback from Microsoft
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/integrations/outlook?error=${encodeURIComponent(error)}`,
          request.url,
        ),
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/integrations/outlook?error=missing_parameters', request.url),
      );
    }

    // Validate OAuth state
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('integration_type', 'microsoft-outlook')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid or expired OAuth state:', state);
      return NextResponse.redirect(
        new URL('/integrations/outlook?error=invalid_state', request.url),
      );
    }

    // Exchange code for tokens
    const tokens = await graphClient.exchangeCodeForTokens(
      code,
      oauthState.user_id,
    );

    // Create integration connection
    await supabase.from('integration_connections').upsert({
      user_id: oauthState.user_id,
      organization_id: oauthState.organization_id,
      integration_type: 'microsoft-outlook',
      is_connected: true,
      last_sync_at: new Date().toISOString(),
      sync_settings: {
        eventTypes: ['wedding', 'consultation', 'meeting'],
        syncConflictResolution: 'ask',
        autoSyncInterval: 30,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Clean up OAuth state
    await supabase.from('oauth_states').delete().eq('state', state);

    // Audit log successful OAuth completion
    await supabase.from('audit_logs').insert({
      user_id: oauthState.user_id,
      organization_id: oauthState.organization_id,
      action: 'outlook_oauth_completed',
      resource_type: 'integration',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    // Redirect to success page or return URL
    const redirectUrl =
      oauthState.return_url || '/integrations/outlook?success=true';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('OAuth callback failed:', error);
    return NextResponse.redirect(
      new URL('/integrations/outlook?error=auth_failed', request.url),
    );
  }
}

/**
 * DELETE /api/calendar/outlook/auth
 * Disconnect Microsoft Outlook integration
 */
export const DELETE = withValidation(
  z.object({
    organizationId: uuidSchema,
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

      // Get webhook subscriptions to clean up
      const { data: subscriptions } = await supabase
        .from('webhook_subscriptions')
        .select('subscription_id')
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook');

      // Delete webhook subscriptions from Microsoft
      for (const subscription of subscriptions || []) {
        try {
          // This would require the webhook handler to have access to delete subscriptions
          // For now, we'll just log it - in production, you'd need proper cleanup
          console.log(
            `Should delete webhook subscription: ${subscription.subscription_id}`,
          );
        } catch (error) {
          console.warn('Failed to delete webhook subscription:', error);
        }
      }

      // Remove stored tokens
      await supabase
        .from('integration_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook');

      // Remove webhook subscriptions
      await supabase
        .from('webhook_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook');

      // Remove synced events
      await supabase
        .from('synced_calendar_events')
        .delete()
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook');

      // Update integration status
      await supabase
        .from('integration_connections')
        .update({
          is_connected: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('integration_type', 'microsoft-outlook');

      // Audit log disconnection
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: validatedData.organizationId,
        action: 'outlook_integration_disconnected',
        resource_type: 'integration',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Microsoft Outlook integration disconnected successfully',
      });
    } catch (error) {
      console.error('Integration disconnect failed:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 },
      );
    }
  },
);
