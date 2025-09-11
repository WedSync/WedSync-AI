# TEAM C - ROUND 1: WS-196 - API Routes Structure
## 2025-08-29 - Development Round 1

**YOUR MISSION:** Create integration-focused API route structure with third-party service connections, webhook management systems, external API standardization, and cross-platform compatibility for wedding vendor integrations
**FEATURE ID:** WS-196 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about API route integration patterns, webhook systems for vendor notifications, third-party service standardization, and ensuring wedding suppliers can connect their existing tools (CRMs, booking systems, payment platforms) to WedSync APIs

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/api-connectors/
cat $WS_ROOT/wedsync/src/app/api/webhooks/route.ts | head -20
```

2. **TEST RESULTS:**
```bash
npm test api-integration
# MUST show: "All API integration tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY)

### A. SERENA PROJECT ACTIVATION
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("webhook integration api third-party");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

## 🧠 STEP 2: SEQUENTIAL THINKING FOR INTEGRATION ARCHITECTURE

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "API Routes Integration needs: webhook management system for vendor notifications, third-party API standardization layer, external service connectors (Zapier, custom CRMs, booking platforms), API versioning for backward compatibility, event-driven architecture for real-time updates. Key integration points: supplier CRM sync, payment gateway webhooks, booking system connections, email marketing platform sync, and external form builders.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**API INTEGRATION ARCHITECTURE:**
- Third-party service connection management with standardized authentication
- Webhook system for real-time vendor notifications and event processing
- External API standardization layer with rate limiting and error handling
- Cross-platform compatibility ensuring API works with existing vendor tools
- Event-driven architecture for real-time synchronization across systems
- Integration testing framework for third-party service reliability
- API versioning and deprecation management for backward compatibility

## 📋 TECHNICAL DELIVERABLES

- [ ] Webhook management system with event processing and retry logic
- [ ] Third-party API connector framework with authentication management
- [ ] External service integration layer with rate limiting and caching
- [ ] Event-driven API architecture with real-time synchronization
- [ ] Integration testing framework with mock services and validation
- [ ] API versioning system with backward compatibility support
- [ ] Cross-platform API documentation with integration examples

## 💾 WHERE TO SAVE YOUR WORK
- Integration Layer: $WS_ROOT/wedsync/src/lib/integrations/api-connectors/
- Webhook System: $WS_ROOT/wedsync/src/app/api/webhooks/
- External APIs: $WS_ROOT/wedsync/src/lib/external/
- Event Processing: $WS_ROOT/wedsync/src/lib/events/

## 🔗 INTEGRATION PATTERNS

### Comprehensive Webhook Management System
```typescript
// src/app/api/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createAPIResponse, logAPIRequest } from '@/lib/api/response-schemas';
import { WebhookEventProcessor } from '@/lib/integrations/webhook-processor';

// Wedding industry webhook event schemas
const WebhookEventSchema = z.object({
  event_type: z.enum([
    'booking.created',
    'booking.updated',
    'booking.cancelled',
    'payment.received',
    'payment.failed',
    'form.submitted',
    'form.updated',
    'vendor.connected',
    'vendor.disconnected',
    'availability.changed',
    'review.received',
    'message.sent'
  ]),
  event_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  source: z.enum(['zapier', 'stripe', 'paypal', 'mailchimp', 'calendly', 'custom_crm', 'booking_system']),
  data: z.record(z.any()),
  signature: z.string().optional(),
  delivery_attempt: z.number().min(1).max(10).default(1),
});

const WebhookSubscriptionSchema = z.object({
  endpoint_url: z.string().url(),
  event_types: z.array(z.string()).min(1),
  secret: z.string().min(16),
  active: z.boolean().default(true),
  retry_policy: z.object({
    max_attempts: z.number().min(1).max(10).default(5),
    backoff_strategy: z.enum(['linear', 'exponential']).default('exponential'),
    initial_delay_seconds: z.number().min(1).default(60),
  }).default({}),
});

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  next_retry: Date | null;
  response_code: number | null;
  response_body: string | null;
  created_at: Date;
}

// POST /api/webhooks - Receive webhook events from third-party services
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Step 1: Parse and validate incoming webhook
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const userAgent = request.headers.get('user-agent') || '';
    
    // Detect webhook source from user agent or headers
    const webhookSource = detectWebhookSource(request.headers, userAgent);
    
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(body);
    } catch (error) {
      return createAPIResponse({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Webhook payload must be valid JSON'
        }
      }, 400);
    }

    // Step 2: Verify webhook signature for security
    const isValidSignature = await verifyWebhookSignature(
      body,
      signature,
      webhookSource,
      request.headers
    );

    if (!isValidSignature) {
      return createAPIResponse({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed'
        }
      }, 401);
    }

    // Step 3: Transform webhook payload to standard format
    const standardizedEvent = await standardizeWebhookPayload(parsedBody, webhookSource);
    
    // Step 4: Validate standardized event
    const validatedEvent = WebhookEventSchema.parse(standardizedEvent);

    // Step 5: Process webhook event with business context
    const processor = new WebhookEventProcessor();
    const processingResult = await processor.processEvent({
      ...validatedEvent,
      source: webhookSource,
      received_at: new Date().toISOString(),
      request_id: requestId,
    });

    // Step 6: Log webhook processing
    await logAPIRequest({
      requestId,
      method: 'POST',
      routePattern: '/api/webhooks',
      statusCode: processingResult.success ? 200 : 500,
      responseTime: Date.now() - startTime,
      businessContext: {
        supplierType: processingResult.context?.supplier_type,
        weddingDate: processingResult.context?.wedding_date,
      },
    });

    // Step 7: Send response to webhook provider
    if (processingResult.success) {
      return createAPIResponse({
        success: true,
        data: {
          event_id: validatedEvent.event_id,
          processed_at: new Date().toISOString(),
          actions_taken: processingResult.actions_taken || [],
        }
      });
    } else {
      return createAPIResponse({
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Webhook event processing failed',
          details: processingResult.error
        }
      }, 500);
    }

  } catch (error) {
    await logAPIRequest({
      requestId,
      method: 'POST',
      routePattern: '/api/webhooks',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      errorType: 'server',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return createAPIResponse({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook'
      }
    }, 500);
  }
}

// GET /api/webhooks - List webhook subscriptions
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const active = url.searchParams.get('active') === 'true';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    let query = supabase
      .from('webhook_subscriptions')
      .select(`
        id,
        endpoint_url,
        event_types,
        source,
        active,
        created_at,
        last_delivery,
        delivery_stats,
        retry_policy
      `);

    if (source) {
      query = query.eq('source', source);
    }

    if (active !== null) {
      query = query.eq('active', active);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      return createAPIResponse({
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve webhook subscriptions'
        }
      }, 500);
    }

    return createAPIResponse({
      success: true,
      data: {
        subscriptions,
        total: subscriptions?.length || 0,
        sources: [...new Set(subscriptions?.map(s => s.source))],
      }
    });

  } catch (error) {
    return createAPIResponse({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500);
  }
}

// Helper functions for webhook processing
function detectWebhookSource(headers: Headers, userAgent: string): string {
  // Detect webhook source from headers and user agent
  if (headers.get('stripe-signature')) return 'stripe';
  if (headers.get('x-paypal-transmission-id')) return 'paypal';
  if (headers.get('x-mailchimp-webhook')) return 'mailchimp';
  if (headers.get('x-calendly-webhook')) return 'calendly';
  if (userAgent.includes('Zapier')) return 'zapier';
  if (headers.get('x-custom-webhook')) return 'custom_crm';
  
  return 'booking_system'; // Default for unrecognized sources
}

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  source: string,
  headers: Headers
): Promise<boolean> {
  try {
    // Get webhook secret for the source
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: config } = await supabase
      .from('webhook_configurations')
      .select('secret')
      .eq('source', source)
      .single();

    if (!config?.secret) {
      return false;
    }

    // Verify signature based on source
    switch (source) {
      case 'stripe':
        return verifyStripeSignature(payload, signature, config.secret);
      case 'paypal':
        return verifyPayPalSignature(payload, headers, config.secret);
      case 'zapier':
        return verifyZapierSignature(payload, signature, config.secret);
      default:
        return verifyGenericSignature(payload, signature, config.secret);
    }
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  const elements = signature.split(',');
  const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
  const sig = elements.find(el => el.startsWith('v1='))?.split('=')[1];
  
  if (!timestamp || !sig) return false;
  
  const payloadForSig = `${timestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payloadForSig, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
}

function verifyPayPalSignature(payload: string, headers: Headers, secret: string): boolean {
  const authAlgo = headers.get('paypal-auth-algo');
  const transmission = headers.get('paypal-transmission');
  const certId = headers.get('paypal-cert-id');
  const transmissionSig = headers.get('paypal-transmission-sig');
  
  // PayPal signature verification would require their SDK
  // For now, return true if headers are present (implement full verification)
  return !!(authAlgo && transmission && certId && transmissionSig);
}

function verifyZapierSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}

function verifyGenericSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return signature === expectedSig;
}

async function standardizeWebhookPayload(payload: any, source: string): Promise<any> {
  // Transform different webhook formats to standard WedSync format
  switch (source) {
    case 'stripe':
      return standardizeStripePayload(payload);
    case 'paypal':
      return standardizePayPalPayload(payload);
    case 'mailchimp':
      return standardizeMailchimpPayload(payload);
    case 'calendly':
      return standardizeCalendlyPayload(payload);
    case 'zapier':
      return standardizeZapierPayload(payload);
    default:
      return standardizeGenericPayload(payload);
  }
}

function standardizeStripePayload(payload: any): any {
  const eventTypeMap: Record<string, string> = {
    'payment_intent.succeeded': 'payment.received',
    'payment_intent.payment_failed': 'payment.failed',
    'invoice.payment_succeeded': 'payment.received',
    'customer.created': 'vendor.connected',
  };

  return {
    event_type: eventTypeMap[payload.type] || 'payment.received',
    event_id: payload.id,
    timestamp: new Date(payload.created * 1000).toISOString(),
    data: {
      amount: payload.data?.object?.amount,
      currency: payload.data?.object?.currency,
      customer_id: payload.data?.object?.customer,
      metadata: payload.data?.object?.metadata,
    },
  };
}

function standardizePayPalPayload(payload: any): any {
  return {
    event_type: 'payment.received',
    event_id: payload.id,
    timestamp: payload.create_time,
    data: {
      amount: payload.resource?.amount?.total,
      currency: payload.resource?.amount?.currency,
      transaction_id: payload.resource?.id,
      status: payload.resource?.state,
    },
  };
}

function standardizeCalendlyPayload(payload: any): any {
  const eventTypeMap: Record<string, string> = {
    'invitee.created': 'booking.created',
    'invitee.canceled': 'booking.cancelled',
  };

  return {
    event_type: eventTypeMap[payload.event] || 'booking.created',
    event_id: payload.payload?.uuid,
    timestamp: payload.time,
    data: {
      meeting_time: payload.payload?.scheduled_event?.start_time,
      duration: payload.payload?.scheduled_event?.event_type?.duration,
      attendee_email: payload.payload?.email,
      attendee_name: payload.payload?.name,
      meeting_url: payload.payload?.scheduled_event?.location?.join_url,
    },
  };
}

function standardizeMailchimpPayload(payload: any): any {
  return {
    event_type: 'message.sent',
    event_id: `mailchimp_${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: {
      campaign_id: payload.data?.id,
      subject: payload.data?.subject,
      recipient: payload.data?.email,
      status: payload.type,
    },
  };
}

function standardizeZapierPayload(payload: any): any {
  // Zapier payloads are typically already in custom format
  return {
    event_type: payload.event_type || 'form.submitted',
    event_id: payload.id || `zapier_${Date.now()}`,
    timestamp: payload.timestamp || new Date().toISOString(),
    data: payload.data || payload,
  };
}

function standardizeGenericPayload(payload: any): any {
  return {
    event_type: payload.type || 'vendor.connected',
    event_id: payload.id || `generic_${Date.now()}`,
    timestamp: payload.timestamp || new Date().toISOString(),
    data: payload.data || payload,
  };
}
```

### Third-Party API Connector Framework
```typescript
// src/lib/integrations/api-connectors/base-connector.ts
import { z } from 'zod';

export interface APIConnectorConfig {
  baseURL: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
  };
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

export abstract class BaseAPIConnector {
  protected config: APIConnectorConfig;
  protected rateLimitTracker: Map<string, number> = new Map();

  constructor(config: APIConnectorConfig) {
    this.config = config;
  }

  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    try {
      // Check rate limits
      const rateLimitKey = `${this.config.baseURL}_${method}_${endpoint}`;
      if (await this.isRateLimited(rateLimitKey)) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'API rate limit exceeded',
          },
        };
      }

      // Make HTTP request with retry logic
      const response = await this.executeWithRetry(async () => {
        const url = `${this.config.baseURL}${endpoint}`;
        const requestOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        };

        if (data && method !== 'GET') {
          requestOptions.body = JSON.stringify(data);
        }

        return fetch(url, requestOptions);
      });

      // Track rate limiting
      await this.trackRateLimit(rateLimitKey, response);

      // Parse response
      const responseData = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.message || 'API request failed',
            details: responseData,
          },
        };
      }

      return {
        success: true,
        data: responseData,
        rateLimit: this.parseRateLimitHeaders(response),
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.config.retryConfig.maxRetries) {
        throw error;
      }

      const delay = this.config.retryConfig.backoffStrategy === 'exponential'
        ? this.config.retryConfig.initialDelay * Math.pow(2, attempt - 1)
        : this.config.retryConfig.initialDelay * attempt;

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  private async isRateLimited(key: string): Promise<boolean> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const requests = this.rateLimitTracker.get(`${key}_${currentMinute}`) || 0;
    return requests >= this.config.rateLimits.requestsPerMinute;
  }

  private async trackRateLimit(key: string, response: Response): Promise<void> {
    const currentMinute = Math.floor(Date.now() / 60000);
    const minuteKey = `${key}_${currentMinute}`;
    const currentCount = this.rateLimitTracker.get(minuteKey) || 0;
    this.rateLimitTracker.set(minuteKey, currentCount + 1);

    // Clean up old entries
    for (const [trackerKey] of this.rateLimitTracker) {
      const keyMinute = parseInt(trackerKey.split('_').pop() || '0');
      if (keyMinute < currentMinute - 60) { // Keep last hour
        this.rateLimitTracker.delete(trackerKey);
      }
    }
  }

  private parseRateLimitHeaders(response: Response): { remaining: number; resetTime: Date } | undefined {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    if (remaining && reset) {
      return {
        remaining: parseInt(remaining, 10),
        resetTime: new Date(parseInt(reset, 10) * 1000),
      };
    }
  }
}

// Specific connector implementations
export class ZapierConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super({
      baseURL: 'https://hooks.zapier.com/hooks/catch',
      apiKey,
      rateLimits: {
        requestsPerMinute: 300,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.config.apiKey || '',
    };
  }

  async triggerZap(zapId: string, data: Record<string, any>): Promise<APIResponse<any>> {
    return this.makeRequest(`/${zapId}`, 'POST', data);
  }
}

export class StripeConnector extends BaseAPIConnector {
  constructor(apiKey: string) {
    super({
      baseURL: 'https://api.stripe.com/v1',
      apiKey,
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      timeout: 10000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 500,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<APIResponse<any>> {
    return this.makeRequest('/payment_intents', 'POST', {
      amount,
      currency,
      metadata,
    });
  }

  async retrieveCustomer(customerId: string): Promise<APIResponse<any>> {
    return this.makeRequest(`/customers/${customerId}`);
  }
}

export class CalendlyConnector extends BaseAPIConnector {
  constructor(accessToken: string) {
    super({
      baseURL: 'https://api.calendly.com',
      apiKey: accessToken,
      rateLimits: {
        requestsPerMinute: 50,
        requestsPerHour: 300,
        requestsPerDay: 2000,
      },
      timeout: 15000,
      retryConfig: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
      },
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async getUser(): Promise<APIResponse<any>> {
    return this.makeRequest('/users/me');
  }

  async listEventTypes(): Promise<APIResponse<any>> {
    const userResponse = await this.getUser();
    if (!userResponse.success) return userResponse;

    const userUri = userResponse.data.resource.uri;
    return this.makeRequest(`/event_types?user=${userUri}`);
  }

  async getScheduledEvents(startTime: string, endTime: string): Promise<APIResponse<any>> {
    return this.makeRequest(`/scheduled_events?min_start_time=${startTime}&max_start_time=${endTime}`);
  }
}
```

### Event-Driven API Architecture
```typescript
// src/lib/events/api-event-system.ts
import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';

export interface APIEvent {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: string;
  correlation_id?: string;
  causation_id?: string;
}

export interface EventHandler {
  eventType: string;
  handler: (event: APIEvent) => Promise<void>;
  priority: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export class APIEventSystem extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private processingQueue: APIEvent[] = [];
  private processing = false;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  // Register event handlers for different API events
  public registerHandler(handler: EventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || [];
    handlers.push(handler);
    handlers.sort((a, b) => b.priority - a.priority); // Higher priority first
    this.handlers.set(handler.eventType, handlers);
  }

  // Publish event to the system
  public async publishEvent(event: APIEvent): Promise<void> {
    // Store event in database for audit trail
    await this.storeEvent(event);
    
    // Add to processing queue
    this.processingQueue.push(event);
    
    // Process queue if not already processing
    if (!this.processing) {
      this.processQueue();
    }

    // Emit event for real-time listeners
    this.emit(event.type, event);
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift();
      if (!event) continue;

      await this.processEvent(event);
    }

    this.processing = false;
  }

  private async processEvent(event: APIEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    
    // Process handlers in parallel
    const processingPromises = handlers.map(async (handler) => {
      try {
        await this.executeHandler(handler, event);
      } catch (error) {
        console.error(`Handler failed for event ${event.type}:`, error);
        await this.handleEventError(event, handler, error);
      }
    });

    await Promise.allSettled(processingPromises);
  }

  private async executeHandler(handler: EventHandler, event: APIEvent): Promise<void> {
    const maxRetries = handler.retryPolicy?.maxRetries || 3;
    const backoffMs = handler.retryPolicy?.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await handler.handler(event);
        return; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
      }
    }
  }

  private async storeEvent(event: APIEvent): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase.from('api_events').insert({
      id: event.id,
      event_type: event.type,
      source: event.source,
      data: event.data,
      timestamp: event.timestamp,
      correlation_id: event.correlation_id,
      causation_id: event.causation_id,
    });
  }

  private async handleEventError(
    event: APIEvent,
    handler: EventHandler,
    error: any
  ): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase.from('api_event_errors').insert({
      event_id: event.id,
      handler_type: handler.eventType,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      created_at: new Date().toISOString(),
    });
  }

  private setupEventHandlers(): void {
    // Wedding booking event handlers
    this.registerHandler({
      eventType: 'booking.created',
      priority: 100,
      handler: async (event) => {
        // Send confirmation emails, update calendars, notify suppliers
        await this.handleBookingCreated(event);
      },
    });

    this.registerHandler({
      eventType: 'booking.cancelled',
      priority: 100,
      handler: async (event) => {
        // Process cancellation, refunds, calendar updates
        await this.handleBookingCancelled(event);
      },
    });

    this.registerHandler({
      eventType: 'payment.received',
      priority: 90,
      handler: async (event) => {
        // Update booking status, send receipts, trigger workflows
        await this.handlePaymentReceived(event);
      },
    });

    this.registerHandler({
      eventType: 'form.submitted',
      priority: 80,
      handler: async (event) => {
        // Process form data, trigger automations, notify suppliers
        await this.handleFormSubmitted(event);
      },
    });

    this.registerHandler({
      eventType: 'vendor.connected',
      priority: 70,
      handler: async (event) => {
        // Setup vendor integration, sync initial data
        await this.handleVendorConnected(event);
      },
    });
  }

  private async handleBookingCreated(event: APIEvent): Promise<void> {
    const bookingData = event.data;
    
    // Create correlation events for booking workflow
    const correlationId = event.correlation_id || crypto.randomUUID();

    // Send booking confirmation to couple
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'email.send',
      source: 'booking_system',
      data: {
        template: 'booking_confirmation',
        recipient: bookingData.couple_email,
        booking_details: bookingData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      causation_id: event.id,
    });

    // Notify supplier of new booking
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'notification.send',
      source: 'booking_system',
      data: {
        type: 'new_booking',
        supplier_id: bookingData.supplier_id,
        booking_details: bookingData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      causation_id: event.id,
    });

    // Update availability calendar
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'calendar.block',
      source: 'booking_system',
      data: {
        supplier_id: bookingData.supplier_id,
        start_time: bookingData.service_start,
        end_time: bookingData.service_end,
        booking_id: bookingData.id,
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      causation_id: event.id,
    });
  }

  private async handlePaymentReceived(event: APIEvent): Promise<void> {
    const paymentData = event.data;

    // Update booking payment status
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        paid_amount: paymentData.amount,
        payment_date: new Date().toISOString(),
      })
      .eq('id', paymentData.booking_id);

    // Send payment receipt
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'email.send',
      source: 'payment_system',
      data: {
        template: 'payment_receipt',
        recipient: paymentData.customer_email,
        payment_details: paymentData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleFormSubmitted(event: APIEvent): Promise<void> {
    const formData = event.data;

    // Store form submission
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    await supabase.from('form_submissions').insert({
      form_id: formData.form_id,
      supplier_id: formData.supplier_id,
      couple_id: formData.couple_id,
      submission_data: formData.responses,
      submitted_at: new Date().toISOString(),
    });

    // Notify supplier of form submission
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'notification.send',
      source: 'form_system',
      data: {
        type: 'form_submitted',
        supplier_id: formData.supplier_id,
        form_title: formData.form_title,
        couple_name: formData.couple_name,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleBookingCancelled(event: APIEvent): Promise<void> {
    const cancellationData = event.data;

    // Process refund if applicable
    if (cancellationData.refund_amount > 0) {
      await this.publishEvent({
        id: crypto.randomUUID(),
        type: 'payment.refund',
        source: 'booking_system',
        data: {
          booking_id: cancellationData.booking_id,
          refund_amount: cancellationData.refund_amount,
          payment_intent_id: cancellationData.payment_intent_id,
        },
        timestamp: new Date().toISOString(),
        correlation_id: event.correlation_id,
        causation_id: event.id,
      });
    }

    // Free up calendar availability
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'calendar.unblock',
      source: 'booking_system',
      data: {
        supplier_id: cancellationData.supplier_id,
        booking_id: cancellationData.booking_id,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleVendorConnected(event: APIEvent): Promise<void> {
    const vendorData = event.data;

    // Initialize vendor data sync
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'integration.sync',
      source: 'vendor_system',
      data: {
        vendor_id: vendorData.vendor_id,
        integration_type: vendorData.integration_type,
        sync_type: 'initial',
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });

    // Send welcome email with integration guide
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'email.send',
      source: 'vendor_system',
      data: {
        template: 'vendor_welcome',
        recipient: vendorData.vendor_email,
        integration_details: vendorData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }
}

// Global event system instance
export const apiEventSystem = new APIEventSystem();
```

---

**EXECUTE IMMEDIATELY - Comprehensive API integration architecture with webhook management, third-party connectors, and event-driven systems!**