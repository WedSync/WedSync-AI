/**
 * POST /api/webhooks/retention
 * Handle retention campaign webhooks from external services
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmailProviderService } from '@/lib/integrations/email/EmailProviderService';
import { CommunicationService } from '@/lib/integrations/communication/CommunicationService';
import { createClient } from '@supabase/supabase-js';

interface WebhookEvent {
  provider:
    | 'sendgrid'
    | 'mailgun'
    | 'twilio'
    | 'slack'
    | 'hubspot'
    | 'salesforce';
  eventType: string;
  messageId: string;
  campaignId?: string;
  supplierId?: string;
  timestamp: Date;
  data: any;
}

interface WebhookValidation {
  isValid: boolean;
  provider?: string;
  error?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Get request headers and body
    const headers = Object.fromEntries(request.headers.entries());
    const body = await request.text();
    const parsedBody = JSON.parse(body || '{}');

    // Validate webhook signature and determine provider
    const validation = await validateWebhook(headers, body, parsedBody);

    if (!validation.isValid) {
      console.warn('Invalid webhook received:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook signature',
        },
        { status: 401 },
      );
    }

    // Process webhook based on provider
    let processingResult;

    switch (validation.provider) {
      case 'sendgrid':
        processingResult = await processSendGridWebhook(parsedBody);
        break;

      case 'mailgun':
        processingResult = await processMailgunWebhook(parsedBody);
        break;

      case 'twilio':
        processingResult = await processTwilioWebhook(parsedBody);
        break;

      case 'slack':
        processingResult = await processSlackWebhook(parsedBody);
        break;

      case 'hubspot':
        processingResult = await processHubSpotWebhook(parsedBody);
        break;

      case 'salesforce':
        processingResult = await processSalesforceWebhook(parsedBody);
        break;

      default:
        throw new Error(`Unsupported webhook provider: ${validation.provider}`);
    }

    // Log successful processing
    await logWebhookEvent('processed', validation.provider!, processingResult);

    return NextResponse.json(
      {
        success: true,
        processed: processingResult.eventsProcessed,
        message: 'Webhook processed successfully',
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Webhook processing failed:', error);

    // Log error
    await logWebhookEvent('error', 'unknown', { error: error.message });

    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * Validate webhook signature based on provider
 */
async function validateWebhook(
  headers: Record<string, string>,
  body: string,
  parsedBody: any,
): Promise<WebhookValidation> {
  // SendGrid webhook validation
  if (headers['user-agent']?.includes('SendGrid')) {
    return validateSendGridWebhook(headers, body);
  }

  // Mailgun webhook validation
  if (headers['user-agent']?.includes('Mailgun')) {
    return validateMailgunWebhook(headers, body);
  }

  // Twilio webhook validation
  if (headers['user-agent']?.includes('TwilioProxy')) {
    return validateTwilioWebhook(headers, body);
  }

  // Slack webhook validation
  if (headers['user-agent']?.includes('Slackbot')) {
    return validateSlackWebhook(headers, parsedBody);
  }

  // HubSpot webhook validation
  if (headers['user-agent']?.includes('HubSpot')) {
    return validateHubSpotWebhook(headers, body);
  }

  // Salesforce webhook validation
  if (headers['user-agent']?.includes('Salesforce')) {
    return validateSalesforceWebhook(headers, body);
  }

  return {
    isValid: false,
    error: 'Unknown webhook provider',
  };
}

/**
 * SendGrid webhook validation
 */
function validateSendGridWebhook(
  headers: Record<string, string>,
  body: string,
): WebhookValidation {
  const crypto = require('crypto');

  try {
    const signature = headers['x-twilio-email-event-webhook-signature'];
    const timestamp = headers['x-twilio-email-event-webhook-timestamp'];

    if (!signature || !timestamp) {
      return { isValid: false, error: 'Missing SendGrid signature headers' };
    }

    // Verify timestamp (within 10 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 600) {
      return { isValid: false, error: 'SendGrid webhook timestamp too old' };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SENDGRID_WEBHOOK_SECRET!)
      .update(timestamp + body)
      .digest('base64');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'SendGrid signature mismatch' };
    }

    return { isValid: true, provider: 'sendgrid' };
  } catch (error) {
    return { isValid: false, error: 'SendGrid validation error' };
  }
}

/**
 * Mailgun webhook validation
 */
function validateMailgunWebhook(
  headers: Record<string, string>,
  body: string,
): WebhookValidation {
  const crypto = require('crypto');

  try {
    const signature = headers['x-mailgun-signature-v2'];
    const timestamp = headers['x-mailgun-timestamp'];
    const token = headers['x-mailgun-token'];

    if (!signature || !timestamp || !token) {
      return { isValid: false, error: 'Missing Mailgun signature headers' };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MAILGUN_WEBHOOK_SECRET!)
      .update(timestamp + token)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Mailgun signature mismatch' };
    }

    return { isValid: true, provider: 'mailgun' };
  } catch (error) {
    return { isValid: false, error: 'Mailgun validation error' };
  }
}

/**
 * Twilio webhook validation
 */
function validateTwilioWebhook(
  headers: Record<string, string>,
  body: string,
): WebhookValidation {
  const crypto = require('crypto');

  try {
    const signature = headers['x-twilio-signature'];
    const url =
      headers['x-forwarded-proto'] +
      '://' +
      headers['host'] +
      '/api/webhooks/retention';

    if (!signature) {
      return { isValid: false, error: 'Missing Twilio signature header' };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN!)
      .update(url + body)
      .digest('base64');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Twilio signature mismatch' };
    }

    return { isValid: true, provider: 'twilio' };
  } catch (error) {
    return { isValid: false, error: 'Twilio validation error' };
  }
}

/**
 * Slack webhook validation
 */
function validateSlackWebhook(
  headers: Record<string, string>,
  body: any,
): WebhookValidation {
  try {
    // For URL verification challenge
    if (body.type === 'url_verification') {
      return { isValid: true, provider: 'slack' };
    }

    // Verify token (basic validation)
    if (body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return { isValid: false, error: 'Slack token mismatch' };
    }

    return { isValid: true, provider: 'slack' };
  } catch (error) {
    return { isValid: false, error: 'Slack validation error' };
  }
}

/**
 * HubSpot webhook validation
 */
function validateHubSpotWebhook(
  headers: Record<string, string>,
  body: string,
): WebhookValidation {
  const crypto = require('crypto');

  try {
    const signature = headers['x-hubspot-signature-v3'];
    const timestamp = headers['x-hubspot-request-timestamp'];
    const sourceString =
      'POST' +
      'https://' +
      headers['host'] +
      '/api/webhooks/retention' +
      body +
      timestamp;

    if (!signature || !timestamp) {
      return { isValid: false, error: 'Missing HubSpot signature headers' };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHash('sha256')
      .update(sourceString + process.env.HUBSPOT_WEBHOOK_SECRET!)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'HubSpot signature mismatch' };
    }

    return { isValid: true, provider: 'hubspot' };
  } catch (error) {
    return { isValid: false, error: 'HubSpot validation error' };
  }
}

/**
 * Salesforce webhook validation
 */
function validateSalesforceWebhook(
  headers: Record<string, string>,
  body: string,
): WebhookValidation {
  try {
    // Salesforce typically uses certificate-based authentication
    // This is a simplified validation - in production you'd verify the certificate
    const salesforceHeader = headers['x-salesforce-sip'];

    if (!salesforceHeader) {
      return { isValid: false, error: 'Missing Salesforce header' };
    }

    return { isValid: true, provider: 'salesforce' };
  } catch (error) {
    return { isValid: false, error: 'Salesforce validation error' };
  }
}

/**
 * Process SendGrid webhook events
 */
async function processSendGridWebhook(events: any[]): Promise<any> {
  const emailService = new EmailProviderService();
  let processed = 0;

  for (const event of events) {
    try {
      // Update campaign metrics
      await updateCampaignMetrics(event.sg_message_id, 'email', event.event, {
        email: event.email,
        timestamp: new Date(event.timestamp * 1000),
        url: event.url,
        reason: event.reason,
      });

      // Handle specific events
      switch (event.event) {
        case 'delivered':
          await handleEmailDelivered(event);
          break;
        case 'open':
          await handleEmailOpened(event);
          break;
        case 'click':
          await handleEmailClicked(event);
          break;
        case 'bounce':
          await handleEmailBounced(event);
          break;
        case 'unsubscribe':
          await handleEmailUnsubscribe(event);
          break;
      }

      processed++;
    } catch (error) {
      console.error('Failed to process SendGrid event:', error);
    }
  }

  return { eventsProcessed: processed, provider: 'sendgrid' };
}

/**
 * Process Mailgun webhook events
 */
async function processMailgunWebhook(eventData: any): Promise<any> {
  try {
    const event = eventData['event-data'];

    await updateCampaignMetrics(
      event.message?.headers?.['message-id'],
      'email',
      event.event,
      {
        recipient: event.recipient,
        timestamp: new Date(event.timestamp * 1000),
        url: event.url,
        reason: event.reason,
      },
    );

    return { eventsProcessed: 1, provider: 'mailgun' };
  } catch (error) {
    console.error('Failed to process Mailgun event:', error);
    return { eventsProcessed: 0, provider: 'mailgun' };
  }
}

/**
 * Process Twilio webhook events
 */
async function processTwilioWebhook(event: any): Promise<any> {
  try {
    const messageId = event.MessageSid || event.CallSid;
    const eventType = event.MessageStatus || event.CallStatus;
    const channelType = messageId?.startsWith('CA')
      ? 'voice'
      : event.From?.startsWith('whatsapp:')
        ? 'whatsapp'
        : 'sms';

    await updateCampaignMetrics(messageId, channelType, eventType, {
      from: event.From,
      to: event.To,
      timestamp: new Date(),
      errorCode: event.ErrorCode,
      duration: event.Duration,
    });

    // Handle supplier responses
    if (event.Body && channelType !== 'voice') {
      await handleSupplierResponse(messageId, event.Body, channelType);
    }

    return { eventsProcessed: 1, provider: 'twilio' };
  } catch (error) {
    console.error('Failed to process Twilio event:', error);
    return { eventsProcessed: 0, provider: 'twilio' };
  }
}

/**
 * Process Slack webhook events
 */
async function processSlackWebhook(event: any): Promise<any> {
  try {
    // Handle URL verification
    if (event.type === 'url_verification') {
      return { challenge: event.challenge };
    }

    // Handle Slack events
    if (event.event) {
      switch (event.event.type) {
        case 'message':
          await handleSlackMessage(event.event);
          break;
        case 'reaction_added':
          await handleSlackReaction(event.event);
          break;
      }
    }

    return { eventsProcessed: 1, provider: 'slack' };
  } catch (error) {
    console.error('Failed to process Slack event:', error);
    return { eventsProcessed: 0, provider: 'slack' };
  }
}

/**
 * Process HubSpot webhook events
 */
async function processHubSpotWebhook(events: any[]): Promise<any> {
  let processed = 0;

  for (const event of events) {
    try {
      // Handle different HubSpot events
      switch (event.subscriptionType) {
        case 'contact.propertyChange':
          await handleHubSpotContactChange(event);
          break;
        case 'deal.propertyChange':
          await handleHubSpotDealChange(event);
          break;
        case 'task.creation':
          await handleHubSpotTaskCreation(event);
          break;
      }

      processed++;
    } catch (error) {
      console.error('Failed to process HubSpot event:', error);
    }
  }

  return { eventsProcessed: processed, provider: 'hubspot' };
}

/**
 * Process Salesforce webhook events
 */
async function processSalesforceWebhook(event: any): Promise<any> {
  try {
    // Handle Salesforce Outbound Messages
    if (event.notifications) {
      for (const notification of event.notifications.Notification) {
        await handleSalesforceNotification(notification);
      }
    }

    return {
      eventsProcessed: event.notifications?.Notification?.length || 0,
      provider: 'salesforce',
    };
  } catch (error) {
    console.error('Failed to process Salesforce event:', error);
    return { eventsProcessed: 0, provider: 'salesforce' };
  }
}

/**
 * Update campaign metrics based on webhook events
 */
async function updateCampaignMetrics(
  messageId: string,
  channel: string,
  eventType: string,
  eventData: any,
): Promise<void> {
  try {
    // Find campaign associated with this message
    const { data: log } = await supabase
      .from('retention_communication_logs')
      .select('campaign_id')
      .eq('message_id', messageId)
      .single();

    if (!log?.campaign_id) {
      console.warn(`No campaign found for message ${messageId}`);
      return;
    }

    // Map event type to metric field
    const metricField = mapEventToMetric(eventType);
    if (!metricField) return;

    // Update campaign metrics
    const { error } = await supabase.rpc('increment_campaign_metric', {
      campaign_id: log.campaign_id,
      metric_field: metricField,
      increment_by: 1,
    });

    if (error) {
      console.error('Failed to update campaign metrics:', error);
    }

    // Log the event
    await supabase.from('retention_webhook_events').insert({
      campaign_id: log.campaign_id,
      message_id: messageId,
      channel,
      event_type: eventType,
      event_data: eventData,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update campaign metrics:', error);
  }
}

/**
 * Handle supplier response to retention campaign
 */
async function handleSupplierResponse(
  messageId: string,
  responseContent: string,
  channel: string,
): Promise<void> {
  try {
    // Get campaign and supplier information
    const { data: log } = await supabase
      .from('retention_communication_logs')
      .select('campaign_id, supplier_id')
      .eq('message_id', messageId)
      .single();

    if (!log) return;

    // Analyze sentiment of response
    const sentiment = await analyzeSentiment(responseContent);

    // Store supplier response
    await supabase.from('supplier_responses').insert({
      campaign_id: log.campaign_id,
      supplier_id: log.supplier_id,
      channel,
      content: responseContent,
      sentiment: sentiment.score,
      sentiment_label: sentiment.label,
      created_at: new Date().toISOString(),
    });

    // Trigger appropriate follow-up based on sentiment
    if (sentiment.label === 'negative') {
      await triggerEscalation(
        log.campaign_id,
        log.supplier_id,
        'negative_response',
      );
    } else if (sentiment.label === 'positive') {
      await markCampaignSuccess(log.campaign_id);
    }
  } catch (error) {
    console.error('Failed to handle supplier response:', error);
  }
}

/**
 * Event handlers for specific webhook events
 */
async function handleEmailDelivered(event: any): Promise<void> {
  console.log(`Email delivered to ${event.email}`);
}

async function handleEmailOpened(event: any): Promise<void> {
  console.log(`Email opened by ${event.email}`);
}

async function handleEmailClicked(event: any): Promise<void> {
  console.log(`Email link clicked by ${event.email}: ${event.url}`);
}

async function handleEmailBounced(event: any): Promise<void> {
  console.log(`Email bounced for ${event.email}: ${event.reason}`);
}

async function handleEmailUnsubscribe(event: any): Promise<void> {
  console.log(`Email unsubscribed by ${event.email}`);
  // Add to suppression list
}

async function handleSlackMessage(event: any): Promise<void> {
  console.log(`Slack message received: ${event.text}`);
}

async function handleSlackReaction(event: any): Promise<void> {
  console.log(`Slack reaction added: ${event.reaction}`);
}

async function handleHubSpotContactChange(event: any): Promise<void> {
  console.log(`HubSpot contact changed: ${event.objectId}`);
}

async function handleHubSpotDealChange(event: any): Promise<void> {
  console.log(`HubSpot deal changed: ${event.objectId}`);
}

async function handleHubSpotTaskCreation(event: any): Promise<void> {
  console.log(`HubSpot task created: ${event.objectId}`);
}

async function handleSalesforceNotification(notification: any): Promise<void> {
  console.log(`Salesforce notification: ${notification.Id}`);
}

/**
 * Utility functions
 */
function mapEventToMetric(eventType: string): string | null {
  const eventMap: Record<string, string> = {
    delivered: 'delivered',
    open: 'opened',
    click: 'clicked',
    bounce: 'bounced',
    unsubscribe: 'unsubscribed',
    read: 'read',
    completed: 'completed',
    failed: 'failed',
  };

  return eventMap[eventType] || null;
}

async function analyzeSentiment(
  text: string,
): Promise<{ score: number; label: string }> {
  // Simple sentiment analysis - in production, use a proper service
  const positiveWords = [
    'thank',
    'great',
    'good',
    'excellent',
    'happy',
    'satisfied',
  ];
  const negativeWords = [
    'no',
    'cancel',
    'stop',
    'bad',
    'terrible',
    'unhappy',
    'disappointed',
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score += 1;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score -= 1;
  });

  let label = 'neutral';
  if (score > 0) label = 'positive';
  if (score < 0) label = 'negative';

  return { score, label };
}

async function triggerEscalation(
  campaignId: string,
  supplierId: string,
  trigger: string,
): Promise<void> {
  console.log(`Triggering escalation for campaign ${campaignId}: ${trigger}`);
  // Implementation would trigger escalation workflow
}

async function markCampaignSuccess(campaignId: string): Promise<void> {
  await supabase
    .from('retention_campaigns')
    .update({
      status: 'successful',
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
}

async function logWebhookEvent(
  eventType: string,
  provider: string,
  data: any,
): Promise<void> {
  try {
    await supabase.from('webhook_processing_logs').insert({
      event_type: eventType,
      provider,
      data,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}
