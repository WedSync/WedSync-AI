import { NextRequest, NextResponse } from 'next/server';
import { VendorAIBridge } from '@/lib/integrations/ai/vendor-ai-bridge';
import { CRMAISync } from '@/lib/integrations/ai/crm-ai-sync';
import { PaymentAIIntegration } from '@/lib/integrations/ai/payment-ai-integration';
import { CalendarAISync } from '@/lib/integrations/ai/calendar-ai-sync';
import { AINotificationEngine } from '@/lib/integrations/ai/notification-ai-engine';
import { RealTimeAISync } from '@/lib/integrations/ai/real-time-ai-sync';

// Webhook validation and security
interface WebhookSignatureValidator {
  validateSignature(body: string, signature: string, secret: string): boolean;
}

class HMACValidator implements WebhookSignatureValidator {
  validateSignature(body: string, signature: string, secret: string): boolean {
    if (!signature || !body || !secret) {
      return false;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');

      const providedSignature = signature.startsWith('sha256=')
        ? signature.slice(7)
        : signature;

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex'),
      );
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }
}

// Webhook data interfaces
interface VendorWebhookData {
  vendorId: string;
  inquiryId: string;
  updateType:
    | 'availability_change'
    | 'quote_received'
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'emergency_response';
  details: VendorUpdateDetails;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface VendorUpdateDetails {
  status?: string;
  quoteAmount?: number;
  availabilitySlots?: TimeSlot[];
  cancellationReason?: string;
  emergencyAlternatives?: string[];
  responseMessage?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  restrictions?: string[];
}

interface CRMWebhookData {
  crmSystem: string;
  recordId: string;
  recordType: 'lead' | 'contact' | 'opportunity' | 'wedding' | 'vendor';
  updateType: 'created' | 'updated' | 'deleted' | 'status_change';
  data: Record<string, any>;
  timestamp: string;
  userId?: string;
}

interface PaymentWebhookData {
  paymentSystem: string;
  eventType:
    | 'payment_succeeded'
    | 'payment_failed'
    | 'invoice_created'
    | 'subscription_updated'
    | 'dispute_created';
  paymentId: string;
  weddingId: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
}

interface CalendarWebhookData {
  calendarSystem: string;
  eventType:
    | 'event_created'
    | 'event_updated'
    | 'event_cancelled'
    | 'attendee_response';
  eventId: string;
  weddingId: string;
  changes: CalendarChange[];
  timestamp: string;
}

interface CalendarChange {
  field: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

interface AIOptimizationWebhookData {
  optimizationId: string;
  weddingId: string;
  optimizationType:
    | 'budget'
    | 'timeline'
    | 'vendor_selection'
    | 'comprehensive';
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  results?: OptimizationResults;
  progress?: number; // 0-100
  estimatedCompletion?: string;
  error?: string;
}

interface OptimizationResults {
  recommendations: AIRecommendation[];
  potentialSavings: number;
  confidenceScore: number;
  implementationSteps: ImplementationStep[];
  riskAssessment: RiskAssessment;
}

interface AIRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  estimatedSavings?: number;
  timeToImplement?: number;
}

interface ImplementationStep {
  stepId: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies?: string[];
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

interface RiskFactor {
  type: string;
  severity: number;
  probability: number;
  description: string;
}

interface WebhookResult {
  processed: boolean;
  webhookId?: string;
  action?: string;
  affectedRecords?: string[];
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}

interface WebhookContext {
  signature: string | null;
  timestamp: string;
  source: string;
  retryCount: number;
  correlationId?: string;
}

// Rate limiting
interface RateLimiter {
  checkLimit(identifier: string): Promise<boolean>;
  recordRequest(identifier: string): Promise<void>;
}

class MemoryRateLimiter implements RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 100;
  private readonly windowMs = 60000; // 1 minute

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Clean old requests
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    return validRequests.length < this.maxRequests;
  }

  async recordRequest(identifier: string): Promise<void> {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
  }
}

// Initialize services
const vendorBridge = new VendorAIBridge({
  notificationConfig: { provider: 'default' },
  queueConfig: { maxConcurrent: 10 },
  vendorConfigs: [],
});

const crmSync = new CRMAISync({
  schedulerConfig: { maxConcurrent: 5 },
  crmConfigs: [],
});

const paymentIntegration = new PaymentAIIntegration({
  paymentProviders: [],
  aiServiceUrl: process.env.AI_SERVICE_URL || '',
  budgetOptimizationRules: [],
  automationSettings: {
    autoApproveThreshold: 100,
    requireApprovalAbove: 1000,
    budgetAlertThresholds: [0.8, 0.9, 0.95],
    paymentReminderDays: [30, 14, 7, 1],
  },
});

const calendarSync = new CalendarAISync({
  calendarProviders: [],
  aiServiceUrl: process.env.AI_SERVICE_URL || '',
  weddingTimelineRules: [],
  syncSettings: {
    autoSyncEnabled: true,
    syncIntervalMinutes: 15,
    conflictResolutionStrategy: 'ai_optimize',
    notificationSettings: {
      emailReminders: true,
      smsReminders: true,
      reminderTimes: [60, 30, 15],
      escalationRules: [],
    },
  },
});

const notificationEngine = new AINotificationEngine({
  providers: [],
  templates: [],
});

const realTimeSync = new RealTimeAISync({
  websocketConfig: {
    port: 3001,
    maxConnections: 1000,
    heartbeatInterval: 30000,
    connectionTimeout: 60000,
  },
  conflictConfig: {
    autoResolveThreshold: 0.8,
    resolutionTimeout: 30000,
    maxConcurrentConflicts: 10,
    defaultStrategy: 'ai_automatic',
  },
  healthConfig: {
    monitoringInterval: 60000,
    healthCheckTimeout: 5000,
    alertThresholds: [
      { metric: 'latency', warning: 1000, critical: 5000 },
      { metric: 'error_rate', warning: 0.05, critical: 0.1 },
    ],
  },
});

// Utilities
const signatureValidator = new HMACValidator();
const rateLimiter = new MemoryRateLimiter();

// Webhook handlers
async function handleVendorUpdate(
  data: VendorWebhookData,
  context: WebhookContext,
): Promise<WebhookResult> {
  try {
    const { vendorId, inquiryId, updateType, details } = data;

    // Find related AI recommendation
    const syncMapping = await getSyncMapping(inquiryId);
    if (!syncMapping) {
      throw new Error('No sync mapping found for inquiry');
    }

    // Process different update types
    switch (updateType) {
      case 'quote_received':
        await handleQuoteReceived(syncMapping, details);
        break;

      case 'availability_change':
        await handleAvailabilityChange(syncMapping, details);
        break;

      case 'booking_confirmed':
        await handleBookingConfirmed(syncMapping, details);
        break;

      case 'booking_cancelled':
        await handleBookingCancelled(syncMapping, details);
        break;

      case 'emergency_response':
        await handleEmergencyResponse(syncMapping, details);
        break;
    }

    // Update AI system with vendor response
    await updateAIWithVendorUpdate(syncMapping.recommendationId, {
      vendorId,
      updateType,
      details,
      timestamp: new Date(data.timestamp),
    });

    // Notify stakeholders
    await notifyStakeholdersOfVendorUpdate(syncMapping.weddingId, {
      vendor: vendorId,
      update: details,
      action: updateType,
    });

    // Broadcast real-time update
    await realTimeSync.broadcastAIUpdate({
      updateId: `vendor-${Date.now()}`,
      type: 'vendor_update',
      weddingId: syncMapping.weddingId,
      timestamp: new Date(),
      source: 'external_system',
      data: {
        category: 'vendor_response',
        changes: [
          {
            field: 'vendor_status',
            oldValue: 'pending',
            newValue: details.status || 'updated',
            reason: `Vendor ${updateType}`,
            confidence: 1.0,
          },
        ],
        confidence: 1.0,
        impactAssessment: {
          severity: updateType === 'booking_cancelled' ? 'high' : 'medium',
          affectedEntities: [vendorId],
          downstreamEffects: [],
          estimatedPropagationTime: 1000,
        },
        validationStatus: {
          isValid: true,
          validationScore: 1.0,
          validationRules: [],
          warnings: [],
          errors: [],
        },
      },
      priority: updateType === 'emergency_response' ? 'critical' : 'normal',
      affectedSystems: ['vendor_management', 'notifications'],
      metadata: {
        correlationId: inquiryId,
        sequenceNumber: 1,
        dependencies: [],
        tags: ['vendor_update', updateType],
      },
    });

    return {
      processed: true,
      webhookId: `vendor-${inquiryId}`,
      action: updateType,
      affectedRecords: [syncMapping.recommendationId],
      nextSteps:
        updateType === 'booking_cancelled'
          ? ['Find alternative vendors', 'Update wedding timeline']
          : ['Update vendor status', 'Notify couple'],
    };
  } catch (error: any) {
    console.error('Vendor webhook processing error:', error);
    return {
      processed: false,
      errors: [error.message],
    };
  }
}

async function handleCRMUpdate(data: CRMWebhookData): Promise<WebhookResult> {
  try {
    const { crmSystem, recordType, updateType, data: recordData } = data;

    // Process different CRM update types
    switch (updateType) {
      case 'created':
        await handleCRMRecordCreated(crmSystem, recordType, recordData);
        break;

      case 'updated':
        await handleCRMRecordUpdated(crmSystem, recordType, recordData);
        break;

      case 'status_change':
        await handleCRMStatusChange(crmSystem, recordType, recordData);
        break;
    }

    // Sync with AI system if relevant
    if (recordType === 'wedding' || recordType === 'lead') {
      await syncCRMDataWithAI(recordData);
    }

    return {
      processed: true,
      webhookId: `crm-${data.recordId}`,
      action: `${recordType}_${updateType}`,
      affectedRecords: [data.recordId],
    };
  } catch (error: any) {
    console.error('CRM webhook processing error:', error);
    return {
      processed: false,
      errors: [error.message],
    };
  }
}

async function handlePaymentUpdate(
  data: PaymentWebhookData,
): Promise<WebhookResult> {
  try {
    const { eventType, paymentId, weddingId, amount } = data;

    // Process payment events
    switch (eventType) {
      case 'payment_succeeded':
        await handlePaymentSuccess(weddingId, paymentId, amount);
        break;

      case 'payment_failed':
        await handlePaymentFailure(weddingId, paymentId, amount);
        break;

      case 'invoice_created':
        await handleInvoiceCreated(weddingId, paymentId, amount);
        break;
    }

    // Update budget tracking
    await updateBudgetTracking(weddingId, eventType, amount);

    return {
      processed: true,
      webhookId: `payment-${paymentId}`,
      action: eventType,
      affectedRecords: [weddingId, paymentId],
    };
  } catch (error: any) {
    console.error('Payment webhook processing error:', error);
    return {
      processed: false,
      errors: [error.message],
    };
  }
}

async function handleCalendarUpdate(
  data: CalendarWebhookData,
): Promise<WebhookResult> {
  try {
    const { eventType, eventId, weddingId, changes } = data;

    // Process calendar events
    switch (eventType) {
      case 'event_updated':
        await handleCalendarEventUpdate(weddingId, eventId, changes);
        break;

      case 'event_cancelled':
        await handleCalendarEventCancellation(weddingId, eventId);
        break;
    }

    // Check for timeline optimization opportunities
    await checkTimelineOptimization(weddingId);

    return {
      processed: true,
      webhookId: `calendar-${eventId}`,
      action: eventType,
      affectedRecords: [weddingId, eventId],
    };
  } catch (error: any) {
    console.error('Calendar webhook processing error:', error);
    return {
      processed: false,
      errors: [error.message],
    };
  }
}

async function handleAIOptimizationComplete(
  data: AIOptimizationWebhookData,
): Promise<WebhookResult> {
  try {
    const { optimizationId, weddingId, results } = data;

    if (!results) {
      throw new Error('No optimization results provided');
    }

    // Sync optimization results to all connected systems
    const syncTasks = [
      vendorBridge.propagateAIOptimizationToVendors(results as any),
      crmSync.syncAIOptimizationToCRM(results as any, 'default'),
      updateWeddingPlanningDashboard(weddingId, results),
    ];

    const syncResults = await Promise.allSettled(syncTasks);
    const successful = syncResults.filter(
      (r) => r.status === 'fulfilled',
    ).length;

    // Generate follow-up notifications
    await generateOptimizationNotifications(weddingId, results);

    return {
      processed: true,
      webhookId: `ai-opt-${optimizationId}`,
      action: 'optimization_complete',
      affectedRecords: [weddingId],
      nextSteps: [
        'Review AI recommendations',
        'Update vendor contracts',
        'Adjust wedding timeline',
        'Notify stakeholders',
      ],
    };
  } catch (error: any) {
    console.error('AI optimization webhook processing error:', error);
    return {
      processed: false,
      errors: [error.message],
    };
  }
}

// Main webhook endpoint handlers
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract headers and validate basic requirements
    const signature = request.headers.get('x-webhook-signature');
    const timestamp =
      request.headers.get('x-webhook-timestamp') || new Date().toISOString();
    const source = request.headers.get('x-webhook-source') || 'unknown';
    const retryCount = parseInt(request.headers.get('x-webhook-retry') || '0');
    const correlationId = request.headers.get('x-correlation-id');

    // Rate limiting
    const clientId =
      request.headers.get('x-client-id') || request.ip || 'anonymous';
    if (!(await rateLimiter.checkLimit(clientId))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }
    await rateLimiter.recordRequest(clientId);

    // Get request body
    const body = await request.text();
    if (!body) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 },
      );
    }

    // Validate webhook signature
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (signature && webhookSecret) {
      if (
        !signatureValidator.validateSignature(body, signature, webhookSecret)
      ) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 },
        );
      }
    }

    // Parse webhook data
    let webhook;
    try {
      webhook = JSON.parse(body);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { type, data } = webhook;
    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data field' },
        { status: 400 },
      );
    }

    const context: WebhookContext = {
      signature,
      timestamp,
      source,
      retryCount,
      correlationId,
    };

    // Route to appropriate handler based on webhook type
    let result: WebhookResult;

    switch (type) {
      case 'vendor_update':
        result = await handleVendorUpdate(data as VendorWebhookData, context);
        break;

      case 'crm_update':
        result = await handleCRMUpdate(data as CRMWebhookData);
        break;

      case 'payment_update':
        result = await handlePaymentUpdate(data as PaymentWebhookData);
        break;

      case 'calendar_update':
        result = await handleCalendarUpdate(data as CalendarWebhookData);
        break;

      case 'ai_optimization_complete':
        result = await handleAIOptimizationComplete(
          data as AIOptimizationWebhookData,
        );
        break;

      case 'vendor_cancellation':
        // Handle emergency vendor cancellation
        result = await handleEmergencyVendorCancellation(data);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown webhook type: ${type}` },
          { status: 400 },
        );
    }

    // Log webhook processing
    console.log('Webhook processed:', {
      type,
      source,
      processingTime: Date.now() - startTime,
      success: result.processed,
      correlationId,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      result,
      processingTime: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
        processingTime: Date.now() - startTime,
      },
      {
        status: 500,
      },
    );
  }
}

// GET endpoint for webhook health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      vendorBridge: 'active',
      crmSync: 'active',
      paymentIntegration: 'active',
      calendarSync: 'active',
      notificationEngine: 'active',
      realTimeSync: 'active',
    },
  });
}

// Helper functions (implementations would be more detailed in real system)
async function getSyncMapping(inquiryId: string): Promise<any> {
  // Mock implementation - replace with actual database lookup
  return {
    recommendationId: `rec-${inquiryId}`,
    weddingId: 'wedding-123',
    vendorId: 'vendor-456',
    webhookActive: true,
  };
}

async function handleQuoteReceived(
  syncMapping: any,
  details: VendorUpdateDetails,
): Promise<void> {
  console.log('Processing quote received:', syncMapping, details);
}

async function handleAvailabilityChange(
  syncMapping: any,
  details: VendorUpdateDetails,
): Promise<void> {
  console.log('Processing availability change:', syncMapping, details);
}

async function handleBookingConfirmed(
  syncMapping: any,
  details: VendorUpdateDetails,
): Promise<void> {
  console.log('Processing booking confirmed:', syncMapping, details);
}

async function handleBookingCancelled(
  syncMapping: any,
  details: VendorUpdateDetails,
): Promise<void> {
  console.log('Processing booking cancelled:', syncMapping, details);
}

async function handleEmergencyResponse(
  syncMapping: any,
  details: VendorUpdateDetails,
): Promise<void> {
  console.log('Processing emergency response:', syncMapping, details);
}

async function updateAIWithVendorUpdate(
  recommendationId: string,
  update: any,
): Promise<void> {
  console.log('Updating AI with vendor update:', recommendationId, update);
}

async function notifyStakeholdersOfVendorUpdate(
  weddingId: string,
  updateData: any,
): Promise<void> {
  console.log('Notifying stakeholders:', weddingId, updateData);
}

async function handleCRMRecordCreated(
  crmSystem: string,
  recordType: string,
  data: any,
): Promise<void> {
  console.log('CRM record created:', crmSystem, recordType, data);
}

async function handleCRMRecordUpdated(
  crmSystem: string,
  recordType: string,
  data: any,
): Promise<void> {
  console.log('CRM record updated:', crmSystem, recordType, data);
}

async function handleCRMStatusChange(
  crmSystem: string,
  recordType: string,
  data: any,
): Promise<void> {
  console.log('CRM status change:', crmSystem, recordType, data);
}

async function syncCRMDataWithAI(recordData: any): Promise<void> {
  console.log('Syncing CRM data with AI:', recordData);
}

async function handlePaymentSuccess(
  weddingId: string,
  paymentId: string,
  amount: number,
): Promise<void> {
  console.log('Payment success:', weddingId, paymentId, amount);
}

async function handlePaymentFailure(
  weddingId: string,
  paymentId: string,
  amount: number,
): Promise<void> {
  console.log('Payment failure:', weddingId, paymentId, amount);
}

async function handleInvoiceCreated(
  weddingId: string,
  paymentId: string,
  amount: number,
): Promise<void> {
  console.log('Invoice created:', weddingId, paymentId, amount);
}

async function updateBudgetTracking(
  weddingId: string,
  eventType: string,
  amount: number,
): Promise<void> {
  console.log('Updating budget tracking:', weddingId, eventType, amount);
}

async function handleCalendarEventUpdate(
  weddingId: string,
  eventId: string,
  changes: CalendarChange[],
): Promise<void> {
  console.log('Calendar event updated:', weddingId, eventId, changes);
}

async function handleCalendarEventCancellation(
  weddingId: string,
  eventId: string,
): Promise<void> {
  console.log('Calendar event cancelled:', weddingId, eventId);
}

async function checkTimelineOptimization(weddingId: string): Promise<void> {
  console.log('Checking timeline optimization:', weddingId);
}

async function updateWeddingPlanningDashboard(
  weddingId: string,
  results: OptimizationResults,
): Promise<void> {
  console.log('Updating wedding planning dashboard:', weddingId, results);
}

async function generateOptimizationNotifications(
  weddingId: string,
  results: OptimizationResults,
): Promise<void> {
  console.log('Generating optimization notifications:', weddingId, results);
}

async function handleEmergencyVendorCancellation(
  data: any,
): Promise<WebhookResult> {
  const cancellation = data as any; // VendorCancellation type would be imported

  try {
    // Trigger emergency vendor replacement workflow
    const crisisResponse =
      await vendorBridge.handleVendorCancellation(cancellation);

    return {
      processed: true,
      webhookId: `emergency-${Date.now()}`,
      action: 'vendor_cancellation_handled',
      affectedRecords: [cancellation.weddingId],
      nextSteps: [
        'Contact alternative vendors',
        'Update wedding timeline',
        'Notify couple immediately',
        'Review contract terms',
      ],
    };
  } catch (error: any) {
    return {
      processed: false,
      errors: [error.message],
      warnings: [
        'Emergency vendor cancellation requires immediate manual attention',
      ],
    };
  }
}
