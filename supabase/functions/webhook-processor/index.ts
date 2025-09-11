/**
 * WS-201: Webhook Processor Edge Function
 * Team B - Backend/API Implementation
 * 
 * Scalable webhook delivery processing with:
 * - Batch processing for high throughput
 * - Priority-based queue processing
 * - Circuit breaker patterns
 * - Wedding industry specific handling
 * - Real-time monitoring and health checks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface WebhookDelivery {
  id: string;
  event_id: string;
  webhook_endpoint_id: string;
  organization_id: string;
  event_type: string;
  payload: any;
  signature: string;
  priority: number;
  status: string;
  attempt_count: number;
  max_retries: number;
  scheduled_at: string;
  metadata?: Record<string, any>;
}

interface WebhookEndpoint {
  id: string;
  endpoint_url: string;
  secret_key: string;
  timeout_seconds: number;
  headers?: Record<string, string>;
  is_active: boolean;
  business_critical: boolean;
}

interface QueueItem {
  id: string;
  delivery_id: string;
  organization_id: string;
  priority: number;
  scheduled_for: string;
  retry_delay_seconds: number;
  max_processing_time_seconds: number;
  queue_metadata?: Record<string, any>;
  webhook_deliveries: WebhookDelivery;
}

interface ProcessingResult {
  deliveryId: string;
  success: boolean;
  responseStatus?: number;
  responseTime?: number;
  error?: string;
}

interface ProcessingStats {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  averageResponseTime: number;
  errors: Array<{
    deliveryId: string;
    error: string;
  }>;
}

// ================================================
// CONFIGURATION
// ================================================

const BATCH_SIZE = 10;
const MAX_CONCURRENT_DELIVERIES = 5;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5;
const MAX_PROCESSING_TIME = 300000; // 5 minutes

// Circuit breaker state storage (in-memory for this Edge Function instance)
const circuitBreakers = new Map<string, {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  nextAttempt: number;
}>();

// ================================================
// MAIN HANDLER
// ================================================

serve(async (req: Request) => {
  const startTime = Date.now();
  
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed',
        allowed_methods: ['POST']
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get processing parameters
    const url = new URL(req.url);
    const batchSize = Math.min(
      parseInt(url.searchParams.get('batch_size') ?? BATCH_SIZE.toString()),
      50
    );
    const maxConcurrent = Math.min(
      parseInt(url.searchParams.get('max_concurrent') ?? MAX_CONCURRENT_DELIVERIES.toString()),
      10
    );

    // Process webhook queue
    const stats = await processWebhookQueue(supabase, batchSize, maxConcurrent);
    
    const processingTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      processing_stats: {
        ...stats,
        processing_time_ms: processingTime,
        batch_size: batchSize,
        max_concurrent: maxConcurrent,
        timestamp: new Date().toISOString(),
        circuit_breakers: getCircuitBreakerStats()
      },
      message: `Processed ${stats.processed} webhook deliveries in ${processingTime}ms`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processor error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// ================================================
// WEBHOOK QUEUE PROCESSING
// ================================================

async function processWebhookQueue(
  supabase: any,
  batchSize: number,
  maxConcurrent: number
): Promise<ProcessingStats> {
  
  // Get queued webhook deliveries with priority ordering
  const { data: queueItems, error: queueError } = await supabase
    .from('webhook_delivery_queue')
    .select(`
      id,
      delivery_id,
      organization_id,
      priority,
      scheduled_for,
      retry_delay_seconds,
      max_processing_time_seconds,
      queue_metadata,
      webhook_deliveries!inner(
        id,
        event_id,
        webhook_endpoint_id,
        organization_id,
        event_type,
        payload,
        signature,
        priority,
        status,
        attempt_count,
        max_retries,
        scheduled_at,
        metadata
      )
    `)
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false }) // Higher priority first
    .order('scheduled_for', { ascending: true }) // Older first within same priority
    .limit(batchSize);

  if (queueError) {
    throw new Error(`Failed to fetch queue items: ${queueError.message}`);
  }

  if (!queueItems || queueItems.length === 0) {
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      averageResponseTime: 0,
      errors: []
    };
  }

  console.log(`Processing ${queueItems.length} webhook deliveries`);

  // Process items in batches with concurrency control
  const results: ProcessingResult[] = [];
  const errors: Array<{ deliveryId: string; error: string }> = [];
  
  // Split into chunks for concurrent processing
  const chunks: QueueItem[][] = [];
  for (let i = 0; i < queueItems.length; i += maxConcurrent) {
    chunks.push(queueItems.slice(i, i + maxConcurrent));
  }

  // Process each chunk
  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(item => processQueueItem(supabase, item))
    );

    chunkResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const deliveryId = chunk[index].delivery_id;
        errors.push({
          deliveryId,
          error: result.reason?.message || 'Processing failed'
        });
        results.push({
          deliveryId,
          success: false,
          error: result.reason?.message || 'Processing failed'
        });
      }
    });
  }

  // Calculate statistics
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const responseTimes = results
    .filter(r => r.responseTime)
    .map(r => r.responseTime!);
  
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  return {
    processed: results.length,
    successful,
    failed,
    skipped: 0,
    averageResponseTime: Math.round(averageResponseTime),
    errors
  };
}

// ================================================
// INDIVIDUAL QUEUE ITEM PROCESSING
// ================================================

async function processQueueItem(
  supabase: any,
  item: QueueItem
): Promise<ProcessingResult> {
  const delivery = item.webhook_deliveries;
  const lockExpiry = new Date(Date.now() + (item.max_processing_time_seconds * 1000));
  const nodeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  try {
    // Lock the queue item for processing
    const { error: lockError } = await supabase
      .from('webhook_delivery_queue')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        processing_node: nodeId,
        lock_expires_at: lockExpiry.toISOString()
      })
      .eq('id', item.id)
      .eq('status', 'queued');

    if (lockError) {
      throw new Error(`Failed to lock queue item: ${lockError.message}`);
    }

    // Get webhook endpoint configuration
    const { data: endpoint, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', delivery.webhook_endpoint_id)
      .single();

    if (endpointError || !endpoint) {
      throw new Error('Webhook endpoint not found or inactive');
    }

    if (!endpoint.is_active) {
      throw new Error('Webhook endpoint is inactive');
    }

    // Check circuit breaker
    if (isCircuitBreakerOpen(endpoint.endpoint_url)) {
      throw new Error('Circuit breaker is open for this endpoint');
    }

    // Perform webhook delivery
    const deliveryResult = await deliverWebhook(endpoint, delivery);

    if (deliveryResult.success) {
      // Update delivery as successful
      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'delivered',
          response_status: deliveryResult.responseStatus,
          response_body: deliveryResult.responseBody?.substring(0, 1000),
          response_headers: deliveryResult.responseHeaders,
          response_time_ms: deliveryResult.responseTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', delivery.id);

      // Mark queue item as completed
      await supabase
        .from('webhook_delivery_queue')
        .update({ status: 'completed' })
        .eq('id', item.id);

      // Reset circuit breaker on success
      resetCircuitBreaker(endpoint.endpoint_url);

      return {
        deliveryId: delivery.id,
        success: true,
        responseStatus: deliveryResult.responseStatus,
        responseTime: deliveryResult.responseTime
      };

    } else {
      // Handle delivery failure
      updateCircuitBreaker(endpoint.endpoint_url);
      
      const shouldRetry = delivery.attempt_count < delivery.max_retries;
      
      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const retryDelay = calculateRetryDelay(delivery.attempt_count);
        const nextRetryAt = new Date(Date.now() + retryDelay);
        
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'retrying',
            attempt_count: delivery.attempt_count + 1,
            next_retry_at: nextRetryAt.toISOString(),
            error_message: deliveryResult.error,
            response_status: deliveryResult.responseStatus
          })
          .eq('id', delivery.id);

        // Requeue for retry
        await supabase
          .from('webhook_delivery_queue')
          .insert({
            delivery_id: delivery.id,
            organization_id: delivery.organization_id,
            priority: delivery.priority,
            scheduled_for: nextRetryAt.toISOString(),
            retry_delay_seconds: Math.floor(retryDelay / 1000),
            max_processing_time_seconds: item.max_processing_time_seconds
          });

      } else {
        // Mark as permanently failed
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'permanently_failed',
            error_message: deliveryResult.error,
            response_status: deliveryResult.responseStatus,
            failed_at: new Date().toISOString()
          })
          .eq('id', delivery.id);
      }

      // Mark queue item as failed
      await supabase
        .from('webhook_delivery_queue')
        .update({ status: 'failed' })
        .eq('id', item.id);

      return {
        deliveryId: delivery.id,
        success: false,
        responseStatus: deliveryResult.responseStatus,
        responseTime: deliveryResult.responseTime,
        error: deliveryResult.error
      };
    }

  } catch (error) {
    // Mark queue item as failed
    await supabase
      .from('webhook_delivery_queue')
      .update({ status: 'failed' })
      .eq('id', item.id)
      .catch(() => {}); // Ignore secondary failures

    return {
      deliveryId: delivery.id,
      success: false,
      error: error.message
    };
  }
}

// ================================================
// WEBHOOK DELIVERY
// ================================================

async function deliverWebhook(
  endpoint: WebhookEndpoint,
  delivery: WebhookDelivery
): Promise<{
  success: boolean;
  responseStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  const timeout = (endpoint.timeout_seconds || 30) * 1000;

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-Webhooks/1.0 (Edge Function)',
      'X-Webhook-Event-Type': delivery.event_type,
      'X-Webhook-Delivery-ID': delivery.id,
      'X-Webhook-Event-ID': delivery.event_id,
      'X-Webhook-Organization-ID': delivery.organization_id,
      'X-Webhook-Signature-256': delivery.signature,
      ...endpoint.headers
    };

    // Add timestamp for replay protection
    const timestamp = Math.floor(Date.now() / 1000);
    headers['X-Webhook-Timestamp'] = timestamp.toString();

    // Add priority header for wedding day events
    if (delivery.priority >= 9) {
      headers['X-Webhook-Priority'] = 'high';
    }
    if (delivery.metadata?.isWeddingDay) {
      headers['X-Webhook-Wedding-Day'] = 'true';
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint.endpoint_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();
      const responseHeaders = Object.fromEntries(response.headers.entries());

      if (response.ok) {
        return {
          success: true,
          responseStatus: response.status,
          responseBody,
          responseHeaders,
          responseTime
        };
      } else {
        return {
          success: false,
          responseStatus: response.status,
          responseBody,
          responseHeaders,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = `Request timeout after ${timeout}ms`;
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Network error or invalid URL';
    }

    return {
      success: false,
      responseTime,
      error: errorMessage
    };
  }
}

// ================================================
// CIRCUIT BREAKER LOGIC
// ================================================

function isCircuitBreakerOpen(endpoint: string): boolean {
  const state = circuitBreakers.get(endpoint);
  if (!state) return false;

  const now = Date.now();

  if (state.isOpen && now >= state.nextAttempt) {
    // Move to half-open state
    state.isOpen = false;
    state.failures = 0;
    return false;
  }

  return state.isOpen;
}

function updateCircuitBreaker(endpoint: string): void {
  const state = circuitBreakers.get(endpoint) || {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    nextAttempt: 0
  };

  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    state.nextAttempt = Date.now() + (5 * 60 * 1000); // 5 minutes
    console.log(`Circuit breaker opened for endpoint: ${endpoint}`);
  }

  circuitBreakers.set(endpoint, state);
}

function resetCircuitBreaker(endpoint: string): void {
  const state = circuitBreakers.get(endpoint);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
    state.nextAttempt = 0;
  }
}

function getCircuitBreakerStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  for (const [endpoint, state] of circuitBreakers.entries()) {
    // Mask the endpoint URL for security
    const maskedEndpoint = maskEndpointUrl(endpoint);
    stats[maskedEndpoint] = {
      failures: state.failures,
      is_open: state.isOpen,
      last_failure: state.lastFailure ? new Date(state.lastFailure).toISOString() : null,
      next_attempt: state.nextAttempt ? new Date(state.nextAttempt).toISOString() : null
    };
  }
  return stats;
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function calculateRetryDelay(attemptCount: number): number {
  // Exponential backoff: 1, 2, 4, 8, 16 minutes
  const baseDelay = 60000; // 1 minute
  const maxDelay = 16 * 60000; // 16 minutes
  
  const delay = baseDelay * Math.pow(2, attemptCount);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * delay * 0.1;
  
  return Math.min(delay + jitter, maxDelay);
}

function maskEndpointUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.length > 10 ? '/**' : urlObj.pathname}`;
  } catch {
    return 'invalid-url';
  }
}

function isWeddingDayEvent(eventType: string, metadata?: Record<string, any>): boolean {
  const weddingDayEvents = [
    'wedding.day_started',
    'wedding.ceremony_completed', 
    'wedding.emergency'
  ];
  
  return weddingDayEvents.includes(eventType) ||
         eventType.includes('wedding_day') ||
         eventType.includes('emergency') ||
         metadata?.isWeddingDay === true;
}

console.log('WedSync Webhook Processor Edge Function initialized');
console.log('Configuration:', {
  batch_size: BATCH_SIZE,
  max_concurrent: MAX_CONCURRENT_DELIVERIES,
  default_timeout: DEFAULT_TIMEOUT,
  circuit_breaker_threshold: CIRCUIT_BREAKER_THRESHOLD
});