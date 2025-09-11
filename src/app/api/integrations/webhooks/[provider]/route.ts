import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { VendorIntegrationManager } from '@/lib/integrations/vendor-integration-manager';
import { RealTimeSyncOrchestrator } from '@/lib/integrations/real-time-sync-orchestrator';
import { z } from 'zod';
import crypto from 'crypto';

// Webhook signature verification
class WebhookVerifier {
  static verifyTaveSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', '')),
      Buffer.from(expectedSignature),
    );
  }

  static verifyStudioNinjaSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha1=', '')),
      Buffer.from(expectedSignature),
    );
  }

  static verifyHoneyBookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  static verifyGenericSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: 'sha1' | 'sha256' = 'sha256',
  ): boolean {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}

// Webhook event schemas
const TaveWebhookSchema = z.object({
  event: z.enum([
    'job.created',
    'job.updated',
    'job.deleted',
    'client.created',
    'client.updated',
    'invoice.created',
    'invoice.updated',
  ]),
  data: z.object({
    id: z.number(),
    type: z.string(),
    job_id: z.number().optional(),
    client_id: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  webhook_id: z.string(),
  timestamp: z.number(),
});

const StudioNinjaWebhookSchema = z.object({
  event: z.enum([
    'job_created',
    'job_updated',
    'job_deleted',
    'client_created',
    'client_updated',
    'invoice_created',
  ]),
  data: z.record(z.any()),
  webhook_signature: z.string(),
  timestamp: z.string(),
});

const HoneyBookWebhookSchema = z.object({
  event_type: z.enum([
    'project.created',
    'project.updated',
    'contact.created',
    'contact.updated',
    'proposal.sent',
    'contract.signed',
    'invoice.paid',
  ]),
  project_id: z.string().optional(),
  contact_id: z.string().optional(),
  data: z.record(z.any()),
  occurred_at: z.string(),
});

const CalendarWebhookSchema = z.object({
  kind: z.string(),
  type: z.enum(['sync', 'exists']),
  address: z.string(),
  params: z
    .object({
      channel_id: z.string(),
      resource_id: z.string(),
      resource_uri: z.string(),
      resource_state: z.enum(['exists', 'not_exists', 'sync']),
      message_number: z.string(),
      page_token: z.string().optional(),
    })
    .optional(),
  payload: z.record(z.any()).optional(),
});

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Initialize services
const integrationManager = new VendorIntegrationManager();
const syncOrchestrator = new RealTimeSyncOrchestrator();

/**
 * POST /api/integrations/webhooks/[provider] - Handle incoming webhooks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  try {
    const provider = params.provider.toLowerCase();
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

    // Rate limiting check
    if (!checkRateLimit(clientIP, provider)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Get raw payload for signature verification
    const rawPayload = await request.text();
    const headersList = await headers();

    // Create Supabase client
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

    // Parse JSON payload
    let webhookData;
    try {
      webhookData = JSON.parse(rawPayload);
    } catch (parseError) {
      console.error('Invalid JSON payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    // Process webhook based on provider
    let processResult;

    switch (provider) {
      case 'tave':
        processResult = await processTaveWebhook(
          supabase,
          headersList,
          rawPayload,
          webhookData,
        );
        break;

      case 'studio_ninja':
        processResult = await processStudioNinjaWebhook(
          supabase,
          headersList,
          rawPayload,
          webhookData,
        );
        break;

      case 'honeybook':
        processResult = await processHoneyBookWebhook(
          supabase,
          headersList,
          rawPayload,
          webhookData,
        );
        break;

      case 'google_calendar':
        processResult = await processGoogleCalendarWebhook(
          supabase,
          headersList,
          rawPayload,
          webhookData,
        );
        break;

      case 'outlook':
        processResult = await processOutlookWebhook(
          supabase,
          headersList,
          rawPayload,
          webhookData,
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 },
        );
    }

    // Log webhook processing result
    await logWebhookEvent(supabase, {
      provider,
      eventType: processResult.eventType || 'unknown',
      success: processResult.success,
      error: processResult.error,
      integrationId: processResult.integrationId,
      processingTimeMs: processResult.processingTime,
      payload: rawPayload.substring(0, 1000), // Truncate for storage
      clientIP,
    });

    if (processResult.success) {
      // Trigger real-time sync if needed
      if (processResult.triggerSync && processResult.integrationId) {
        syncOrchestrator.orchestrateSync({
          integrationId: processResult.integrationId,
          eventType: 'webhook_received',
          priority: processResult.priority || 'medium',
          sourceSystem: provider,
          data: webhookData,
          timestamp: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
        eventType: processResult.eventType,
      });
    } else {
      return NextResponse.json(
        { error: processResult.error || 'Webhook processing failed' },
        { status: processResult.statusCode || 500 },
      );
    }
  } catch (error) {
    console.error(`Webhook processing error for ${params.provider}:`, error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/integrations/webhooks/[provider] - Health check endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  const provider = params.provider.toLowerCase();

  return NextResponse.json({
    success: true,
    provider,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

// Provider-specific webhook processors

async function processTaveWebhook(
  supabase: any,
  headers: Headers,
  rawPayload: string,
  webhookData: any,
): Promise<WebhookProcessResult> {
  const startTime = Date.now();

  try {
    // Verify signature
    const signature = headers.get('x-tave-signature');
    if (!signature) {
      return {
        success: false,
        error: 'Missing Tave signature',
        statusCode: 401,
        processingTime: Date.now() - startTime,
      };
    }

    // Get integration for signature verification
    const webhookId = webhookData.webhook_id;
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*, credentials')
      .eq('integration_type', 'tave')
      .eq('webhook_id', webhookId)
      .single();

    if (error || !integration) {
      return {
        success: false,
        error: 'Integration not found',
        statusCode: 404,
        processingTime: Date.now() - startTime,
      };
    }

    // Verify webhook signature
    const webhookSecret = integration.credentials.webhook_secret;
    if (
      !WebhookVerifier.verifyTaveSignature(rawPayload, signature, webhookSecret)
    ) {
      return {
        success: false,
        error: 'Invalid signature',
        statusCode: 401,
        processingTime: Date.now() - startTime,
      };
    }

    // Validate webhook data
    const validatedData = TaveWebhookSchema.parse(webhookData);

    // Process the webhook event
    let triggerSync = false;
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    switch (validatedData.event) {
      case 'job.created':
      case 'job.updated':
        triggerSync = true;
        priority = 'high';
        break;

      case 'client.created':
      case 'client.updated':
        triggerSync = true;
        priority = 'medium';
        break;

      case 'invoice.created':
      case 'invoice.updated':
        triggerSync = true;
        priority = 'high';
        break;

      case 'job.deleted':
        triggerSync = true;
        priority = 'critical';
        break;
    }

    // Update integration last webhook time
    await supabase
      .from('integrations')
      .update({
        last_webhook_at: new Date().toISOString(),
        webhook_count: supabase.raw('webhook_count + 1'),
      })
      .eq('id', integration.id);

    return {
      success: true,
      eventType: validatedData.event,
      integrationId: integration.id,
      triggerSync,
      priority,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Tave webhook processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      statusCode: 500,
      processingTime: Date.now() - startTime,
    };
  }
}

async function processStudioNinjaWebhook(
  supabase: any,
  headers: Headers,
  rawPayload: string,
  webhookData: any,
): Promise<WebhookProcessResult> {
  const startTime = Date.now();

  try {
    // Verify signature
    const signature = headers.get('x-studioninja-signature');
    if (!signature) {
      return {
        success: false,
        error: 'Missing Studio Ninja signature',
        statusCode: 401,
        processingTime: Date.now() - startTime,
      };
    }

    // Find integration by webhook signature or endpoint
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*, credentials')
      .eq('integration_type', 'studio_ninja')
      .eq('status', 'active')
      .single();

    if (error || !integration) {
      return {
        success: false,
        error: 'Integration not found',
        statusCode: 404,
        processingTime: Date.now() - startTime,
      };
    }

    // Verify webhook signature
    const webhookSecret = integration.credentials.webhook_secret;
    if (
      !WebhookVerifier.verifyStudioNinjaSignature(
        rawPayload,
        signature,
        webhookSecret,
      )
    ) {
      return {
        success: false,
        error: 'Invalid signature',
        statusCode: 401,
        processingTime: Date.now() - startTime,
      };
    }

    // Validate webhook data
    const validatedData = StudioNinjaWebhookSchema.parse(webhookData);

    // Determine sync priority based on event
    let triggerSync = true;
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (validatedData.event.includes('job')) {
      priority = 'high';
    } else if (validatedData.event.includes('invoice')) {
      priority = 'high';
    }

    return {
      success: true,
      eventType: validatedData.event,
      integrationId: integration.id,
      triggerSync,
      priority,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Studio Ninja webhook processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      statusCode: 500,
      processingTime: Date.now() - startTime,
    };
  }
}

async function processHoneyBookWebhook(
  supabase: any,
  headers: Headers,
  rawPayload: string,
  webhookData: any,
): Promise<WebhookProcessResult> {
  const startTime = Date.now();

  try {
    // Verify signature
    const signature = headers.get('x-honeybook-signature');
    if (!signature) {
      return {
        success: false,
        error: 'Missing HoneyBook signature',
        statusCode: 401,
        processingTime: Date.now() - startTime,
      };
    }

    // Find integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*, credentials')
      .eq('integration_type', 'honeybook')
      .eq('status', 'active')
      .single();

    if (error || !integration) {
      return {
        success: false,
        error: 'Integration not found',
        statusCode: 404,
        processingTime: Date.now() - startTime,
      };
    }

    // Verify signature
    const webhookSecret = integration.credentials.webhook_secret;
    if (
      !WebhookVerifier.verifyHoneyBookSignature(
        rawPayload,
        signature,
        webhookSecret,
      )
    ) {
      return {
        success: false,
        error: 'Invalid signature',
        statusCode: 401,
        processingTime: Date.now() - startTime,
      };
    }

    // Validate webhook data
    const validatedData = HoneyBookWebhookSchema.parse(webhookData);

    // Determine priority based on event
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (
      validatedData.event_type === 'contract.signed' ||
      validatedData.event_type === 'invoice.paid'
    ) {
      priority = 'critical';
    } else if (validatedData.event_type === 'proposal.sent') {
      priority = 'high';
    }

    return {
      success: true,
      eventType: validatedData.event_type,
      integrationId: integration.id,
      triggerSync: true,
      priority,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('HoneyBook webhook processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      statusCode: 500,
      processingTime: Date.now() - startTime,
    };
  }
}

async function processGoogleCalendarWebhook(
  supabase: any,
  headers: Headers,
  rawPayload: string,
  webhookData: any,
): Promise<WebhookProcessResult> {
  const startTime = Date.now();

  try {
    // Google Calendar webhooks include channel information
    const channelId = headers.get('x-goog-channel-id');
    const resourceState = headers.get('x-goog-resource-state');

    if (!channelId) {
      return {
        success: false,
        error: 'Missing Google channel ID',
        statusCode: 400,
        processingTime: Date.now() - startTime,
      };
    }

    // Find integration by channel ID
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('integration_type', 'google_calendar')
      .eq('webhook_channel_id', channelId)
      .eq('status', 'active')
      .single();

    if (error || !integration) {
      return {
        success: false,
        error: 'Integration not found for channel',
        statusCode: 404,
        processingTime: Date.now() - startTime,
      };
    }

    // Calendar changes trigger sync
    const triggerSync = resourceState === 'exists';
    const priority: 'low' | 'medium' | 'high' | 'critical' = 'high'; // Calendar changes are important

    return {
      success: true,
      eventType: `calendar.${resourceState}`,
      integrationId: integration.id,
      triggerSync,
      priority,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Google Calendar webhook processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      statusCode: 500,
      processingTime: Date.now() - startTime,
    };
  }
}

async function processOutlookWebhook(
  supabase: any,
  headers: Headers,
  rawPayload: string,
  webhookData: any,
): Promise<WebhookProcessResult> {
  const startTime = Date.now();

  try {
    // Microsoft Graph webhook validation
    const validationToken = headers.get('x-ms-token-validation');
    if (validationToken) {
      // This is a validation request
      return {
        success: true,
        eventType: 'validation',
        processingTime: Date.now() - startTime,
      };
    }

    // Find integration for Outlook calendar
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('integration_type', 'outlook')
      .eq('status', 'active')
      .single();

    if (error || !integration) {
      return {
        success: false,
        error: 'Outlook integration not found',
        statusCode: 404,
        processingTime: Date.now() - startTime,
      };
    }

    return {
      success: true,
      eventType: 'calendar.changed',
      integrationId: integration.id,
      triggerSync: true,
      priority: 'high',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Outlook webhook processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      statusCode: 500,
      processingTime: Date.now() - startTime,
    };
  }
}

// Helper functions

interface WebhookProcessResult {
  success: boolean;
  eventType?: string;
  integrationId?: string;
  triggerSync?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  error?: string;
  statusCode?: number;
  processingTime: number;
}

function checkRateLimit(clientIP: string, provider: string): boolean {
  const key = `${clientIP}:${provider}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // Per minute

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

async function logWebhookEvent(
  supabase: any,
  event: {
    provider: string;
    eventType: string;
    success: boolean;
    error?: string;
    integrationId?: string;
    processingTimeMs: number;
    payload: string;
    clientIP: string;
  },
) {
  try {
    await supabase.from('webhook_logs').insert({
      provider: event.provider,
      event_type: event.eventType,
      success: event.success,
      error_message: event.error,
      integration_id: event.integrationId,
      processing_time_ms: event.processingTimeMs,
      payload: event.payload,
      client_ip: event.clientIP,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}
