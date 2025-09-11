/**
 * WS-183 LTV Payment Webhook Handler
 * POST /api/webhooks/ltv/payments - Handle payment webhooks for real-time LTV updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import {
  LTVDataPipeline,
  PaymentEvent,
} from '@/lib/integrations/ltv-data-pipeline';
import {
  PaymentSystemIntegrator,
  SubscriptionEvent,
} from '@/lib/integrations/payment-system-integrator';

interface WebhookProcessingResult {
  webhookId: string;
  platform: string;
  eventType: string;
  processed: boolean;
  ltvImpact: number;
  supplierId?: string;
  errors: string[];
  processingTimeMs: number;
  timestamp: Date;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const webhookId = `webhook_${Date.now()}`;

  try {
    const body = await request.text();
    const headersList = headers();

    // Determine webhook platform based on headers
    const platform = await detectWebhookPlatform(headersList);

    if (!platform) {
      return NextResponse.json(
        { error: 'Unable to determine webhook platform' },
        { status: 400 },
      );
    }

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, headersList, platform);

    if (!isValid) {
      console.warn(`Invalid webhook signature for platform: ${platform}`);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 },
      );
    }

    // Parse webhook payload
    const webhookData = JSON.parse(body);

    // Process webhook based on platform
    const result = await processWebhookByPlatform(
      webhookData,
      platform,
      webhookId,
      startTime,
    );

    // Log webhook processing
    await logWebhookProcessing(result);

    // Return success response
    return NextResponse.json({
      received: true,
      webhookId: result.webhookId,
      processed: result.processed,
      ltvImpact: result.ltvImpact,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);

    const errorResult: WebhookProcessingResult = {
      webhookId,
      platform: 'unknown',
      eventType: 'error',
      processed: false,
      ltvImpact: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    };

    await logWebhookProcessing(errorResult);

    return NextResponse.json(
      {
        received: true,
        processed: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      },
      { status: 500 },
    );
  }
}

async function detectWebhookPlatform(
  headersList: Headers,
): Promise<string | null> {
  // Stripe webhooks
  if (headersList.get('stripe-signature')) {
    return 'stripe';
  }

  // PayPal webhooks
  if (
    headersList.get('paypal-cert-id') ||
    headersList.get('paypal-auth-algo')
  ) {
    return 'paypal';
  }

  // Check user agent for additional clues
  const userAgent = headersList.get('user-agent') || '';
  if (userAgent.includes('Stripe')) {
    return 'stripe';
  }
  if (userAgent.includes('PayPal')) {
    return 'paypal';
  }

  return null;
}

async function verifyWebhookSignature(
  body: string,
  headersList: Headers,
  platform: string,
): Promise<boolean> {
  try {
    switch (platform) {
      case 'stripe':
        return await verifyStripeSignature(body, headersList);
      case 'paypal':
        return await verifyPayPalSignature(body, headersList);
      default:
        return false;
    }
  } catch (error) {
    console.error(
      `Webhook signature verification failed for ${platform}:`,
      error,
    );
    return false;
  }
}

async function verifyStripeSignature(
  body: string,
  headersList: Headers,
): Promise<boolean> {
  const signature = headersList.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return false;
  }

  try {
    // Parse the signature
    const elements = signature.split(',');
    const signatureElements: Record<string, string> = {};

    for (const element of elements) {
      const [key, value] = element.split('=');
      signatureElements[key] = value;
    }

    const timestamp = signatureElements.t;
    const signatures = [signatureElements.v1];

    if (!timestamp || !signatures[0]) {
      return false;
    }

    // Check timestamp (prevent replay attacks)
    const timestampInt = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const TOLERANCE = 300; // 5 minutes

    if (Math.abs(now - timestampInt) > TOLERANCE) {
      return false;
    }

    // Verify signature
    const signedPayload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return signatures.includes(expectedSignature);
  } catch (error) {
    console.error('Stripe signature verification error:', error);
    return false;
  }
}

async function verifyPayPalSignature(
  body: string,
  headersList: Headers,
): Promise<boolean> {
  // PayPal webhook verification would be implemented here
  // For now, return true for development (implement proper verification in production)
  const certId = headersList.get('paypal-cert-id');
  const authAlgo = headersList.get('paypal-auth-algo');

  if (!certId || !authAlgo) {
    return false;
  }

  // In production, you would:
  // 1. Retrieve the PayPal certificate using the cert ID
  // 2. Verify the signature using the certificate and algorithm
  // 3. Check the timestamp to prevent replay attacks

  return true; // Simplified for development
}

async function processWebhookByPlatform(
  webhookData: any,
  platform: string,
  webhookId: string,
  startTime: number,
): Promise<WebhookProcessingResult> {
  const pipeline = new LTVDataPipeline();
  const paymentIntegrator = new PaymentSystemIntegrator();

  const result: WebhookProcessingResult = {
    webhookId,
    platform,
    eventType: webhookData.type || webhookData.event_type || 'unknown',
    processed: false,
    ltvImpact: 0,
    errors: [],
    processingTimeMs: 0,
    timestamp: new Date(),
  };

  try {
    switch (platform) {
      case 'stripe':
        await processStripeWebhook(
          webhookData,
          pipeline,
          paymentIntegrator,
          result,
        );
        break;
      case 'paypal':
        await processPayPalWebhook(
          webhookData,
          pipeline,
          paymentIntegrator,
          result,
        );
        break;
      default:
        result.errors.push(`Unsupported platform: ${platform}`);
    }

    result.processed = result.errors.length === 0;
    result.processingTimeMs = Date.now() - startTime;
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Processing failed',
    );
    result.processingTimeMs = Date.now() - startTime;
  }

  return result;
}

async function processStripeWebhook(
  webhookData: any,
  pipeline: LTVDataPipeline,
  paymentIntegrator: PaymentSystemIntegrator,
  result: WebhookProcessingResult,
): Promise<void> {
  const { type, data } = webhookData;
  result.eventType = type;

  switch (type) {
    case 'invoice.payment_succeeded':
      await processStripePaymentSuccess(data.object, pipeline, result);
      break;

    case 'invoice.payment_failed':
      await processStripePaymentFailure(data.object, pipeline, result);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await processStripeSubscriptionChange(
        data.object,
        paymentIntegrator,
        result,
        'updated',
      );
      break;

    case 'customer.subscription.deleted':
      await processStripeSubscriptionChange(
        data.object,
        paymentIntegrator,
        result,
        'cancelled',
      );
      break;

    case 'customer.subscription.trial_will_end':
      await processStripeTrialEnding(data.object, paymentIntegrator, result);
      break;

    case 'payment_intent.succeeded':
      await processStripePaymentIntentSuccess(data.object, pipeline, result);
      break;

    case 'charge.dispute.created':
      await processStripeChargeback(data.object, pipeline, result);
      break;

    default:
      result.errors.push(`Unhandled Stripe event type: ${type}`);
  }
}

async function processStripePaymentSuccess(
  invoice: any,
  pipeline: LTVDataPipeline,
  result: WebhookProcessingResult,
): Promise<void> {
  const paymentEvent: PaymentEvent = {
    id: invoice.id,
    userId: invoice.customer,
    subscriptionId: invoice.subscription,
    eventType: 'payment_successful',
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase() as PaymentEvent['currency'],
    timestamp: new Date(invoice.created * 1000),
    paymentMethod: 'stripe',
    metadata: {
      customerId: invoice.customer,
      invoiceId: invoice.id,
      paymentIntentId: invoice.payment_intent,
      webhookEventId: result.webhookId,
    },
    taxes: invoice.tax || 0,
    fees: invoice.application_fee_amount
      ? invoice.application_fee_amount / 100
      : 0,
    netAmount:
      (invoice.amount_paid - (invoice.application_fee_amount || 0)) / 100,
  };

  const processingResult = await pipeline.processRevenueEvents([paymentEvent]);

  result.ltvImpact = paymentEvent.netAmount;
  result.supplierId = paymentEvent.userId;

  if (processingResult.failedEvents.length > 0) {
    result.errors.push(...processingResult.failedEvents.map((fe) => fe.error));
  }
}

async function processStripePaymentFailure(
  invoice: any,
  pipeline: LTVDataPipeline,
  result: WebhookProcessingResult,
): Promise<void> {
  const paymentEvent: PaymentEvent = {
    id: invoice.id,
    userId: invoice.customer,
    subscriptionId: invoice.subscription,
    eventType: 'payment_failed',
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase() as PaymentEvent['currency'],
    timestamp: new Date(invoice.created * 1000),
    paymentMethod: 'stripe',
    metadata: {
      customerId: invoice.customer,
      invoiceId: invoice.id,
      paymentIntentId: invoice.payment_intent,
      webhookEventId: result.webhookId,
    },
    taxes: 0,
    fees: 0,
    netAmount: 0, // No revenue from failed payment
  };

  const processingResult = await pipeline.processRevenueEvents([paymentEvent]);

  result.ltvImpact = 0; // No positive impact from failed payment
  result.supplierId = paymentEvent.userId;

  if (processingResult.failedEvents.length > 0) {
    result.errors.push(...processingResult.failedEvents.map((fe) => fe.error));
  }
}

async function processStripeSubscriptionChange(
  subscription: any,
  paymentIntegrator: PaymentSystemIntegrator,
  result: WebhookProcessingResult,
  changeType: 'updated' | 'cancelled',
): Promise<void> {
  const subscriptionEvent: SubscriptionEvent = {
    id: subscription.id,
    customerId: subscription.customer,
    subscriptionId: subscription.id,
    eventType: changeType,
    planId: subscription.items?.data[0]?.price?.id || '',
    planName: subscription.items?.data[0]?.price?.nickname || 'Unknown Plan',
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    amount: subscription.items?.data[0]?.price?.unit_amount || 0,
    currency: subscription.currency || 'usd',
    status: subscription.status,
    metadata: {
      supplierId: subscription.metadata?.supplier_id || subscription.customer,
      businessType: subscription.metadata?.business_type,
      signupSource: subscription.metadata?.signup_source,
    },
  };

  const lifecycleResult =
    await paymentIntegrator.processSubscriptionLifecycle(subscriptionEvent);

  result.ltvImpact = lifecycleResult.ltvImpact;
  result.supplierId = subscriptionEvent.metadata.supplierId;

  if (!lifecycleResult.processed) {
    result.errors.push('Subscription lifecycle processing failed');
  }
}

async function processStripeTrialEnding(
  subscription: any,
  paymentIntegrator: PaymentSystemIntegrator,
  result: WebhookProcessingResult,
): Promise<void> {
  const subscriptionEvent: SubscriptionEvent = {
    id: subscription.id,
    customerId: subscription.customer,
    subscriptionId: subscription.id,
    eventType: 'trial_end',
    planId: subscription.items?.data[0]?.price?.id || '',
    planName: subscription.items?.data[0]?.price?.nickname || 'Unknown Plan',
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    amount: subscription.items?.data[0]?.price?.unit_amount || 0,
    currency: subscription.currency || 'usd',
    status: subscription.status,
    metadata: {
      supplierId: subscription.metadata?.supplier_id || subscription.customer,
      businessType: subscription.metadata?.business_type,
      signupSource: subscription.metadata?.signup_source,
    },
  };

  const lifecycleResult =
    await paymentIntegrator.processSubscriptionLifecycle(subscriptionEvent);

  result.ltvImpact = lifecycleResult.ltvImpact;
  result.supplierId = subscriptionEvent.metadata.supplierId;

  if (!lifecycleResult.processed) {
    result.errors.push('Trial ending processing failed');
  }
}

async function processStripePaymentIntentSuccess(
  paymentIntent: any,
  pipeline: LTVDataPipeline,
  result: WebhookProcessingResult,
): Promise<void> {
  const paymentEvent: PaymentEvent = {
    id: paymentIntent.id,
    userId:
      paymentIntent.metadata?.user_id ||
      paymentIntent.customer ||
      paymentIntent.id,
    subscriptionId: paymentIntent.metadata?.subscription_id,
    eventType: 'payment_successful',
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency.toUpperCase() as PaymentEvent['currency'],
    timestamp: new Date(paymentIntent.created * 1000),
    paymentMethod: 'stripe',
    metadata: {
      customerId: paymentIntent.customer || '',
      invoiceId: paymentIntent.invoice || '',
      paymentIntentId: paymentIntent.id,
      webhookEventId: result.webhookId,
    },
    taxes: 0,
    fees: paymentIntent.application_fee_amount
      ? paymentIntent.application_fee_amount / 100
      : 0,
    netAmount:
      (paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) /
      100,
  };

  const processingResult = await pipeline.processRevenueEvents([paymentEvent]);

  result.ltvImpact = paymentEvent.netAmount;
  result.supplierId = paymentEvent.userId;

  if (processingResult.failedEvents.length > 0) {
    result.errors.push(...processingResult.failedEvents.map((fe) => fe.error));
  }
}

async function processStripeChargeback(
  charge: any,
  pipeline: LTVDataPipeline,
  result: WebhookProcessingResult,
): Promise<void> {
  const paymentEvent: PaymentEvent = {
    id: `chargeback_${charge.id}`,
    userId: charge.metadata?.user_id || charge.customer || charge.id,
    subscriptionId: charge.metadata?.subscription_id,
    eventType: 'chargeback_received',
    amount: charge.amount / 100,
    currency: charge.currency.toUpperCase() as PaymentEvent['currency'],
    timestamp: new Date(),
    paymentMethod: 'stripe',
    metadata: {
      customerId: charge.customer || '',
      invoiceId: charge.invoice || '',
      paymentIntentId: charge.payment_intent || '',
      webhookEventId: result.webhookId,
    },
    taxes: 0,
    fees: 25, // Typical chargeback fee
    netAmount: -(charge.amount / 100 + 25), // Negative impact
  };

  const processingResult = await pipeline.processRevenueEvents([paymentEvent]);

  result.ltvImpact = paymentEvent.netAmount; // Negative impact
  result.supplierId = paymentEvent.userId;

  if (processingResult.failedEvents.length > 0) {
    result.errors.push(...processingResult.failedEvents.map((fe) => fe.error));
  }
}

async function processPayPalWebhook(
  webhookData: any,
  pipeline: LTVDataPipeline,
  paymentIntegrator: PaymentSystemIntegrator,
  result: WebhookProcessingResult,
): Promise<void> {
  const { event_type, resource } = webhookData;
  result.eventType = event_type;

  switch (event_type) {
    case 'PAYMENT.SALE.COMPLETED':
      await processPayPalPaymentSuccess(resource, pipeline, result);
      break;

    case 'PAYMENT.SALE.DENIED':
      await processPayPalPaymentFailure(resource, pipeline, result);
      break;

    case 'BILLING.SUBSCRIPTION.CREATED':
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await processPayPalSubscriptionChange(
        resource,
        paymentIntegrator,
        result,
        'created',
      );
      break;

    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      await processPayPalSubscriptionChange(
        resource,
        paymentIntegrator,
        result,
        'cancelled',
      );
      break;

    default:
      result.errors.push(`Unhandled PayPal event type: ${event_type}`);
  }
}

async function processPayPalPaymentSuccess(
  payment: any,
  pipeline: LTVDataPipeline,
  result: WebhookProcessingResult,
): Promise<void> {
  const amount = parseFloat(payment.amount?.total || '0');

  const paymentEvent: PaymentEvent = {
    id: payment.id,
    userId: payment.custom || payment.invoice_number || payment.id,
    subscriptionId: payment.billing_agreement_id,
    eventType: 'payment_successful',
    amount,
    currency: (payment.amount?.currency || 'USD') as PaymentEvent['currency'],
    timestamp: new Date(payment.create_time || Date.now()),
    paymentMethod: 'paypal',
    metadata: {
      customerId: payment.payer?.payer_info?.payer_id || '',
      invoiceId: payment.invoice_number || '',
      paymentIntentId: payment.id,
      webhookEventId: result.webhookId,
    },
    taxes: parseFloat(payment.amount?.details?.tax || '0'),
    fees: parseFloat(payment.amount?.details?.fee || '0'),
    netAmount: amount - parseFloat(payment.amount?.details?.fee || '0'),
  };

  const processingResult = await pipeline.processRevenueEvents([paymentEvent]);

  result.ltvImpact = paymentEvent.netAmount;
  result.supplierId = paymentEvent.userId;

  if (processingResult.failedEvents.length > 0) {
    result.errors.push(...processingResult.failedEvents.map((fe) => fe.error));
  }
}

async function processPayPalPaymentFailure(
  payment: any,
  pipeline: LTVDataPipeline,
  result: WebhookProcessingResult,
): Promise<void> {
  const amount = parseFloat(payment.amount?.total || '0');

  const paymentEvent: PaymentEvent = {
    id: payment.id,
    userId: payment.custom || payment.invoice_number || payment.id,
    subscriptionId: payment.billing_agreement_id,
    eventType: 'payment_failed',
    amount,
    currency: (payment.amount?.currency || 'USD') as PaymentEvent['currency'],
    timestamp: new Date(payment.create_time || Date.now()),
    paymentMethod: 'paypal',
    metadata: {
      customerId: payment.payer?.payer_info?.payer_id || '',
      invoiceId: payment.invoice_number || '',
      paymentIntentId: payment.id,
      webhookEventId: result.webhookId,
    },
    taxes: 0,
    fees: 0,
    netAmount: 0,
  };

  const processingResult = await pipeline.processRevenueEvents([paymentEvent]);

  result.ltvImpact = 0;
  result.supplierId = paymentEvent.userId;

  if (processingResult.failedEvents.length > 0) {
    result.errors.push(...processingResult.failedEvents.map((fe) => fe.error));
  }
}

async function processPayPalSubscriptionChange(
  subscription: any,
  paymentIntegrator: PaymentSystemIntegrator,
  result: WebhookProcessingResult,
  changeType: 'created' | 'cancelled',
): Promise<void> {
  const billingInfo = subscription.billing_info || {};
  const lastPayment = billingInfo.last_payment || {};

  const subscriptionEvent: SubscriptionEvent = {
    id: subscription.id,
    customerId: subscription.subscriber?.payer_id || subscription.id,
    subscriptionId: subscription.id,
    eventType: changeType,
    planId: subscription.plan_id || '',
    planName: subscription.name || 'PayPal Subscription',
    currentPeriodStart: new Date(billingInfo.next_billing_time || Date.now()),
    currentPeriodEnd: new Date(
      billingInfo.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000,
    ),
    amount: parseFloat(lastPayment.amount?.value || '0') * 100, // Convert to cents
    currency: lastPayment.amount?.currency_code || 'USD',
    status: subscription.status?.toLowerCase() || 'active',
    metadata: {
      supplierId:
        subscription.custom_id ||
        subscription.subscriber?.payer_id ||
        subscription.id,
      businessType: 'unknown',
      signupSource: 'paypal',
    },
  };

  const lifecycleResult =
    await paymentIntegrator.processSubscriptionLifecycle(subscriptionEvent);

  result.ltvImpact = lifecycleResult.ltvImpact;
  result.supplierId = subscriptionEvent.metadata.supplierId;

  if (!lifecycleResult.processed) {
    result.errors.push('PayPal subscription processing failed');
  }
}

async function logWebhookProcessing(
  result: WebhookProcessingResult,
): Promise<void> {
  try {
    // In production, this would store to database
    console.log('Webhook processed:', {
      webhookId: result.webhookId,
      platform: result.platform,
      eventType: result.eventType,
      processed: result.processed,
      ltvImpact: result.ltvImpact,
      supplierId: result.supplierId,
      errors: result.errors,
      processingTimeMs: result.processingTimeMs,
    });

    // Store webhook log to database (implementation would go here)
    // await storeWebhookLog(result);
  } catch (error) {
    console.error('Failed to log webhook processing:', error);
  }
}
