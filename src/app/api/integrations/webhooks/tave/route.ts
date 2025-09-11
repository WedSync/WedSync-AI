/**
 * WS-342 Real-Time Wedding Collaboration - Tave Webhook Handler
 * Team C: Integration & System Architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TaveIntegrationAdapter } from '@/lib/integrations/adapters/photography/tave-adapter';
import { RealTimeSyncOrchestrator } from '@/lib/integrations/real-time-sync-orchestrator';
import crypto from 'crypto';

const taveAdapter = new TaveIntegrationAdapter();
const syncOrchestrator = new RealTimeSyncOrchestrator();

export async function POST(req: NextRequest) {
  try {
    console.log('🎣 Received Tave webhook');

    // Verify webhook signature
    const signature = req.headers.get('x-tave-signature');
    const body = await req.text();

    if (!verifyWebhookSignature(body, signature)) {
      console.warn('❌ Invalid Tave webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('❌ Invalid JSON in webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    // Handle webhook with Tave adapter
    const processingResult = await taveAdapter.handleWebhook(webhookData);

    if (!processingResult.success) {
      console.error(
        '❌ Tave webhook processing failed:',
        processingResult.errors,
      );
      return NextResponse.json(
        {
          error: 'Webhook processing failed',
          details: processingResult.errors,
        },
        { status: 500 },
      );
    }

    // Process each event from the webhook
    const supabase = createSupabaseServerClient();

    for (const processedEvent of processingResult.processedEvents) {
      try {
        await handleTaveEvent(processedEvent, supabase);
      } catch (error) {
        console.error('❌ Failed to handle Tave event:', processedEvent, error);
        // Continue processing other events even if one fails
      }
    }

    // Log webhook receipt
    await supabase.from('webhook_log').insert({
      source_system: 'tave',
      event_type: webhookData.event || 'unknown',
      payload: webhookData,
      processing_result: processingResult,
      processed_at: new Date(),
    });

    console.log(
      `✅ Tave webhook processed successfully: ${processingResult.processedEvents.length} events`,
    );

    return NextResponse.json({
      success: true,
      eventsProcessed: processingResult.processedEvents.length,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('❌ Tave webhook handler error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function handleTaveEvent(processedEvent: any, supabase: any) {
  const { eventType, weddingId, data } = processedEvent;

  if (!weddingId) {
    console.warn('⚠️ Tave event has no wedding ID, skipping:', eventType);
    return;
  }

  // Find WedSync wedding that maps to this Tave job
  const { data: weddingMapping } = await supabase
    .from('wedding_vendor_integrations')
    .select(
      `
      wedding_id,
      vendor_integrations (system_type)
    `,
    )
    .eq('external_id', weddingId)
    .eq('vendor_integrations.system_type', 'photography_crm')
    .single();

  if (!weddingMapping) {
    console.warn('⚠️ No WedSync wedding found for Tave job:', weddingId);
    return;
  }

  const wedsyncWeddingId = weddingMapping.wedding_id;

  // Create integration event based on Tave event type
  const integrationEvent = createIntegrationEventFromTave(
    eventType,
    wedsyncWeddingId,
    weddingId,
    data,
  );

  if (integrationEvent) {
    // Trigger real-time sync orchestration
    await syncOrchestrator.handleIntegrationEvent(integrationEvent);

    console.log(`🔄 Triggered integration sync for Tave ${eventType} event`);
  }

  // Handle specific event types
  switch (eventType) {
    case 'job_updated':
      await handleTaveJobUpdated(wedsyncWeddingId, data, supabase);
      break;

    case 'payment_received':
      await handleTavePaymentReceived(wedsyncWeddingId, data, supabase);
      break;

    case 'timeline_changed':
      await handleTaveTimelineChanged(wedsyncWeddingId, data, supabase);
      break;

    case 'client_updated':
      await handleTaveClientUpdated(wedsyncWeddingId, data, supabase);
      break;

    default:
      console.log(`ℹ️ Unhandled Tave event type: ${eventType}`);
  }
}

function createIntegrationEventFromTave(
  taveEventType: string,
  weddingId: string,
  externalWeddingId: string,
  data: any,
) {
  const eventTypeMap: Record<string, string> = {
    job_updated: 'vendor_status_change',
    payment_received: 'payment_status_change',
    timeline_changed: 'wedding_timeline_update',
    client_updated: 'vendor_status_change',
  };

  const integrationEventType = eventTypeMap[taveEventType];

  if (!integrationEventType) {
    return null;
  }

  return {
    id: `tave_${taveEventType}_${externalWeddingId}_${Date.now()}`,
    sourceSystem: 'tave',
    targetSystems: [], // Will be determined by orchestrator
    eventType: integrationEventType,
    weddingId,
    data: {
      originalEvent: taveEventType,
      externalWeddingId,
      ...data,
    },
    timestamp: new Date(),
    priority: determinePriority(taveEventType),
    weddingDate: new Date(), // Will be filled by orchestrator
    isWeddingDay: false, // Will be determined by orchestrator
    affectedVendors: ['tave'],
  };
}

async function handleTaveJobUpdated(
  weddingId: string,
  jobData: any,
  supabase: any,
) {
  try {
    // Update wedding details from Tave job
    const updates: any = {};

    if (jobData.eventDate) {
      updates.wedding_date = new Date(jobData.eventDate);
    }

    if (jobData.venue) {
      updates.venue_name = jobData.venue;
    }

    if (jobData.status) {
      updates.vendor_status = {
        tave: {
          status: jobData.status,
          updatedAt: new Date(),
        },
      };
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('weddings').update(updates).eq('id', weddingId);

      console.log(`📝 Updated wedding ${weddingId} from Tave job update`);
    }
  } catch (error) {
    console.error('Failed to handle Tave job update:', error);
  }
}

async function handleTavePaymentReceived(
  weddingId: string,
  paymentData: any,
  supabase: any,
) {
  try {
    // Record payment in WedSync payment history
    await supabase.from('payment_history').insert({
      wedding_id: weddingId,
      vendor_type: 'photography',
      external_payment_id: paymentData.paymentId,
      amount: paymentData.amount * 100, // Convert to cents
      currency: paymentData.currency || 'USD',
      status: 'completed',
      payment_method: paymentData.method,
      processed_at: new Date(paymentData.processedAt || Date.now()),
      vendor_data: paymentData,
    });

    // Update wedding budget if applicable
    const { data: budget } = await supabase
      .from('wedding_budgets')
      .select('*')
      .eq('wedding_id', weddingId)
      .single();

    if (budget) {
      // Find photography budget category
      const photographyCategory = budget.categories?.find(
        (cat: any) => cat.category === 'photography',
      );

      if (photographyCategory) {
        photographyCategory.spent += paymentData.amount;

        await supabase
          .from('wedding_budgets')
          .update({ categories: budget.categories })
          .eq('wedding_id', weddingId);
      }
    }

    console.log(
      `💰 Recorded Tave payment for wedding ${weddingId}: $${paymentData.amount}`,
    );
  } catch (error) {
    console.error('Failed to handle Tave payment:', error);
  }
}

async function handleTaveTimelineChanged(
  weddingId: string,
  timelineData: any,
  supabase: any,
) {
  try {
    // Update wedding timeline events from Tave
    if (timelineData.events && Array.isArray(timelineData.events)) {
      for (const event of timelineData.events) {
        await supabase.from('wedding_timeline_events').upsert(
          {
            wedding_id: weddingId,
            external_id: event.id,
            title: event.title,
            start_time: new Date(event.startDate),
            end_time: new Date(event.endDate),
            event_type: event.eventType || 'photography',
            location: event.location,
            vendor_type: 'photography',
            vendor_data: event,
          },
          { onConflict: 'wedding_id,external_id' },
        );
      }
    }

    console.log(`📅 Updated timeline for wedding ${weddingId} from Tave`);
  } catch (error) {
    console.error('Failed to handle Tave timeline change:', error);
  }
}

async function handleTaveClientUpdated(
  weddingId: string,
  clientData: any,
  supabase: any,
) {
  try {
    // Update client information
    const clientUpdates: any = {};

    if (clientData.email) {
      clientUpdates.contact_email = clientData.email;
    }

    if (clientData.phone) {
      clientUpdates.contact_phone = clientData.phone;
    }

    if (clientData.firstName && clientData.lastName) {
      clientUpdates.couple_names = [
        `${clientData.firstName} ${clientData.lastName}`,
      ];
    }

    if (Object.keys(clientUpdates).length > 0) {
      await supabase.from('weddings').update(clientUpdates).eq('id', weddingId);

      console.log(`👥 Updated client info for wedding ${weddingId} from Tave`);
    }
  } catch (error) {
    console.error('Failed to handle Tave client update:', error);
  }
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
): boolean {
  if (!signature) {
    return false;
  }

  const secret = process.env.TAVE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('❌ TAVE_WEBHOOK_SECRET not configured');
    return false;
  }

  // Tave uses HMAC-SHA256 signatures
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const providedSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature),
  );
}

function determinePriority(
  eventType: string,
): 'low' | 'normal' | 'high' | 'critical' {
  const priorityMap: Record<string, 'low' | 'normal' | 'high' | 'critical'> = {
    payment_received: 'high',
    timeline_changed: 'high',
    job_updated: 'normal',
    client_updated: 'normal',
  };

  return priorityMap[eventType] || 'normal';
}
