/**
 * WS-183 Payment System Integrator - Payment platform integration
 *
 * Handles integration with payment platforms (Stripe, PayPal) for revenue tracking,
 * webhook processing, and subscription lifecycle management for LTV calculations.
 */

import { createClient } from '@supabase/supabase-js';
import { PaymentEvent } from './ltv-data-pipeline';

export interface StripeIntegrationConfig {
  secretKey: string;
  webhookSecret: string;
  accountId?: string;
  enableTestMode: boolean;
  webhookEndpoints: string[];
}

export interface StripeIntegrationResult {
  integrationId: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: Date;
  processedEvents: number;
  failedEvents: number;
  webhookHealth: {
    totalReceived: number;
    successfullyProcessed: number;
    failed: number;
  };
  subscriptionMetrics: {
    activeSubscriptions: number;
    totalRevenue: number;
    averageMonthlyRevenue: number;
  };
}

export interface SubscriptionEvent {
  id: string;
  customerId: string;
  subscriptionId: string;
  eventType:
    | 'created'
    | 'updated'
    | 'cancelled'
    | 'trial_end'
    | 'payment_succeeded'
    | 'payment_failed';
  planId: string;
  planName: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amount: number;
  currency: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'unpaid';
  metadata: {
    supplierId: string;
    businessType?: string;
    signupSource?: string;
  };
}

export interface LifecycleProcessingResult {
  eventId: string;
  processed: boolean;
  ltvImpact: number;
  previousLTV?: number;
  newLTV: number;
  churnRisk?: number;
  recommendedActions: string[];
  processingTimestamp: Date;
}

export interface StripePaymentData {
  paymentIntentId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: string;
  created: Date;
  description?: string;
  metadata: Record<string, any>;
}

export interface InternalPaymentData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: Date;
  source: 'stripe' | 'paypal' | 'manual';
}

export interface ReconciliationResult {
  totalRecords: number;
  matchedRecords: number;
  discrepancies: {
    id: string;
    type:
      | 'amount_mismatch'
      | 'status_mismatch'
      | 'missing_external'
      | 'missing_internal';
    description: string;
    externalValue?: any;
    internalValue?: any;
  }[];
  reconciliationAccuracy: number;
  recommendedActions: string[];
}

export class PaymentSystemIntegrator {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private readonly STRIPE_API_VERSION = '2023-10-16';
  private readonly MAX_WEBHOOK_RETRIES = 3;
  private readonly WEBHOOK_TIMEOUT_MS = 30000;

  /**
   * Integrate with Stripe for subscription revenue tracking and LTV calculation
   */
  async integrateStripeData(
    config: StripeIntegrationConfig,
  ): Promise<StripeIntegrationResult> {
    try {
      // Validate Stripe configuration
      await this.validateStripeConfig(config);

      // Initialize Stripe client
      const stripe = this.initializeStripeClient(config);

      // Sync historical subscription data
      const historicalSync = await this.syncHistoricalStripeData(
        stripe,
        config,
      );

      // Set up webhook handlers
      await this.setupStripeWebhooks(config);

      // Calculate subscription metrics
      const subscriptionMetrics =
        await this.calculateStripeSubscriptionMetrics();

      // Store integration configuration
      const integrationId = await this.storeIntegrationConfig('stripe', config);

      const result: StripeIntegrationResult = {
        integrationId,
        status: 'active',
        lastSync: new Date(),
        processedEvents: historicalSync.processedEvents,
        failedEvents: historicalSync.failedEvents,
        webhookHealth: {
          totalReceived: 0,
          successfullyProcessed: 0,
          failed: 0,
        },
        subscriptionMetrics,
      };

      // Log integration success
      await this.logIntegrationEvent('stripe_integration_success', result);

      return result;
    } catch (error) {
      console.error('Stripe integration failed:', error);

      // Log integration failure
      await this.logIntegrationEvent('stripe_integration_failed', {
        error: error.message,
      });

      throw new Error(
        `Stripe integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process subscription upgrades, downgrades, and cancellations
   * Calculate immediate impact on supplier LTV
   */
  async processSubscriptionLifecycle(
    event: SubscriptionEvent,
  ): Promise<LifecycleProcessingResult> {
    const startTime = new Date();

    try {
      // Get current supplier LTV
      const currentLTV = await this.getSupplierLTV(event.metadata.supplierId);

      // Calculate lifecycle impact based on event type
      let ltvImpact = 0;
      let churnRisk = 0;
      const recommendedActions: string[] = [];

      switch (event.eventType) {
        case 'created':
          ltvImpact = await this.calculateNewSubscriptionLTV(event);
          recommendedActions.push(
            'Set up onboarding sequence',
            'Schedule first month check-in',
          );
          break;

        case 'updated':
          ltvImpact = await this.calculateSubscriptionUpdateImpact(event);
          if (ltvImpact > 0) {
            recommendedActions.push(
              'Thank customer for upgrade',
              'Highlight premium features',
            );
          } else if (ltvImpact < 0) {
            recommendedActions.push(
              'Investigate downgrade reason',
              'Offer retention incentive',
            );
            churnRisk = 0.3;
          }
          break;

        case 'cancelled':
          ltvImpact = await this.calculateCancellationImpact(event);
          churnRisk = 1.0;
          recommendedActions.push(
            'Send exit survey',
            'Offer win-back campaign',
            'Analyze cancellation patterns',
          );
          break;

        case 'trial_end':
          const conversionProbability =
            await this.calculateTrialConversionProbability(event);
          ltvImpact = await this.calculateTrialEndImpact(
            event,
            conversionProbability,
          );
          if (conversionProbability < 0.5) {
            churnRisk = 0.7;
            recommendedActions.push(
              'Send trial extension offer',
              'Schedule demo call',
            );
          } else {
            recommendedActions.push(
              'Send conversion reminder',
              'Highlight value proposition',
            );
          }
          break;

        case 'payment_succeeded':
          ltvImpact = event.amount / 100; // Convert from cents
          await this.updatePaymentSuccessMetrics(event);
          break;

        case 'payment_failed':
          churnRisk = await this.calculatePaymentFailureChurnRisk(event);
          recommendedActions.push(
            'Send payment failure notification',
            'Update payment method',
          );
          await this.handlePaymentFailure(event);
          break;
      }

      const newLTV = currentLTV + ltvImpact;

      // Store subscription event
      await this.storeSubscriptionEvent(event, ltvImpact, churnRisk);

      // Update supplier LTV
      await this.updateSupplierLTV(event.metadata.supplierId, newLTV);

      // Update churn risk if significant
      if (churnRisk > 0.2) {
        await this.updateChurnRisk(event.metadata.supplierId, churnRisk);
      }

      const result: LifecycleProcessingResult = {
        eventId: event.id,
        processed: true,
        ltvImpact,
        previousLTV: currentLTV,
        newLTV,
        churnRisk,
        recommendedActions,
        processingTimestamp: startTime,
      };

      // Log lifecycle processing
      await this.logLifecycleProcessing(result);

      return result;
    } catch (error) {
      console.error(
        `Failed to process subscription lifecycle event ${event.id}:`,
        error,
      );

      return {
        eventId: event.id,
        processed: false,
        ltvImpact: 0,
        newLTV: 0,
        churnRisk: 0,
        recommendedActions: ['Manual review required'],
        processingTimestamp: startTime,
      };
    }
  }

  /**
   * Reconcile payment data between Stripe and internal systems
   * Ensure 100% accuracy for LTV calculations
   */
  private async reconcilePaymentData(
    stripeData: StripePaymentData[],
    internalData: InternalPaymentData[],
  ): Promise<ReconciliationResult> {
    const discrepancies: ReconciliationResult['discrepancies'] = [];
    let matchedRecords = 0;

    // Create lookup maps
    const stripeMap = new Map(stripeData.map((d) => [d.paymentIntentId, d]));
    const internalMap = new Map(internalData.map((d) => [d.id, d]));

    // Check Stripe data against internal data
    for (const stripePayment of stripeData) {
      const internalPayment = internalMap.get(stripePayment.paymentIntentId);

      if (!internalPayment) {
        discrepancies.push({
          id: stripePayment.paymentIntentId,
          type: 'missing_internal',
          description: `Stripe payment not found in internal system`,
          externalValue: stripePayment,
        });
        continue;
      }

      // Check amount consistency
      if (Math.abs(stripePayment.amount - internalPayment.amount) > 0.01) {
        discrepancies.push({
          id: stripePayment.paymentIntentId,
          type: 'amount_mismatch',
          description: `Amount mismatch between Stripe and internal`,
          externalValue: stripePayment.amount,
          internalValue: internalPayment.amount,
        });
      }

      // Check status consistency
      if (
        this.normalizePaymentStatus(stripePayment.status) !==
        internalPayment.status
      ) {
        discrepancies.push({
          id: stripePayment.paymentIntentId,
          type: 'status_mismatch',
          description: `Status mismatch between Stripe and internal`,
          externalValue: stripePayment.status,
          internalValue: internalPayment.status,
        });
      }

      if (
        discrepancies.filter((d) => d.id === stripePayment.paymentIntentId)
          .length === 0
      ) {
        matchedRecords++;
      }
    }

    // Check for internal payments missing in Stripe
    for (const internalPayment of internalData) {
      if (
        internalPayment.source === 'stripe' &&
        !stripeMap.has(internalPayment.id)
      ) {
        discrepancies.push({
          id: internalPayment.id,
          type: 'missing_external',
          description: `Internal payment not found in Stripe`,
          internalValue: internalPayment,
        });
      }
    }

    const reconciliationAccuracy =
      stripeData.length > 0 ? matchedRecords / stripeData.length : 1;

    const recommendedActions = this.generateReconciliationActions(
      discrepancies,
      reconciliationAccuracy,
    );

    const result: ReconciliationResult = {
      totalRecords: stripeData.length,
      matchedRecords,
      discrepancies,
      reconciliationAccuracy,
      recommendedActions,
    };

    // Store reconciliation results
    await this.storeReconciliationResults(result);

    // Alert if accuracy is below threshold
    if (reconciliationAccuracy < 0.95) {
      await this.alertDataInconsistency(result);
    }

    return result;
  }

  /**
   * Initialize Stripe client with proper configuration
   */
  private initializeStripeClient(config: StripeIntegrationConfig): any {
    const Stripe = require('stripe');
    return new Stripe(config.secretKey, {
      apiVersion: this.STRIPE_API_VERSION,
      typescript: true,
    });
  }

  /**
   * Validate Stripe configuration
   */
  private async validateStripeConfig(
    config: StripeIntegrationConfig,
  ): Promise<void> {
    if (!config.secretKey) {
      throw new Error('Stripe secret key is required');
    }

    if (!config.webhookSecret) {
      throw new Error('Stripe webhook secret is required');
    }

    if (config.secretKey.startsWith('pk_')) {
      throw new Error('Provided publishable key instead of secret key');
    }

    // Test API connection
    try {
      const stripe = this.initializeStripeClient(config);
      await stripe.customers.list({ limit: 1 });
    } catch (error) {
      throw new Error(`Stripe API connection failed: ${error.message}`);
    }
  }

  /**
   * Sync historical Stripe subscription data
   */
  private async syncHistoricalStripeData(
    stripe: any,
    config: StripeIntegrationConfig,
  ): Promise<{
    processedEvents: number;
    failedEvents: number;
  }> {
    let processedEvents = 0;
    let failedEvents = 0;
    let hasMore = true;
    let startingAfter: string | undefined;

    try {
      // Sync subscriptions
      while (hasMore) {
        const subscriptions = await stripe.subscriptions.list({
          limit: 100,
          starting_after: startingAfter,
          expand: ['data.customer', 'data.latest_invoice'],
        });

        for (const subscription of subscriptions.data) {
          try {
            await this.processStripeSubscription(subscription);
            processedEvents++;
          } catch (error) {
            console.error(
              `Failed to process subscription ${subscription.id}:`,
              error,
            );
            failedEvents++;
          }
        }

        hasMore = subscriptions.has_more;
        if (hasMore && subscriptions.data.length > 0) {
          startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
        }
      }

      // Sync recent payment intents (last 30 days)
      const thirtyDaysAgo = Math.floor(
        (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
      );

      hasMore = true;
      startingAfter = undefined;

      while (hasMore) {
        const paymentIntents = await stripe.paymentIntents.list({
          limit: 100,
          created: { gte: thirtyDaysAgo },
          starting_after: startingAfter,
        });

        for (const paymentIntent of paymentIntents.data) {
          try {
            await this.processStripePaymentIntent(paymentIntent);
            processedEvents++;
          } catch (error) {
            console.error(
              `Failed to process payment intent ${paymentIntent.id}:`,
              error,
            );
            failedEvents++;
          }
        }

        hasMore = paymentIntents.has_more;
        if (hasMore && paymentIntents.data.length > 0) {
          startingAfter =
            paymentIntents.data[paymentIntents.data.length - 1].id;
        }
      }

      return { processedEvents, failedEvents };
    } catch (error) {
      console.error('Historical sync failed:', error);
      throw new Error(`Historical data sync failed: ${error.message}`);
    }
  }

  /**
   * Process Stripe subscription data
   */
  private async processStripeSubscription(subscription: any): Promise<void> {
    const subscriptionEvent: SubscriptionEvent = {
      id: subscription.id,
      customerId: subscription.customer?.id || subscription.customer,
      subscriptionId: subscription.id,
      eventType: 'created',
      planId: subscription.items?.data[0]?.price?.id || '',
      planName: subscription.items?.data[0]?.price?.nickname || 'Unknown Plan',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      amount: subscription.items?.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency || 'usd',
      status: subscription.status,
      metadata: {
        supplierId:
          subscription.metadata?.supplier_id || subscription.customer?.id,
        businessType: subscription.metadata?.business_type,
        signupSource: subscription.metadata?.signup_source,
      },
    };

    // Store subscription data
    await this.storeSubscriptionData(subscriptionEvent);
  }

  /**
   * Process Stripe payment intent
   */
  private async processStripePaymentIntent(paymentIntent: any): Promise<void> {
    const paymentEvent: PaymentEvent = {
      id: paymentIntent.id,
      userId:
        paymentIntent.metadata?.user_id ||
        paymentIntent.customer ||
        paymentIntent.id,
      subscriptionId: paymentIntent.metadata?.subscription_id,
      eventType:
        paymentIntent.status === 'succeeded'
          ? 'payment_successful'
          : 'payment_failed',
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency.toUpperCase(),
      timestamp: new Date(paymentIntent.created * 1000),
      paymentMethod: 'stripe',
      metadata: {
        customerId: paymentIntent.customer || '',
        invoiceId: paymentIntent.invoice || '',
        paymentIntentId: paymentIntent.id,
        webhookEventId: paymentIntent.id,
      },
      taxes: paymentIntent.metadata?.taxes
        ? parseFloat(paymentIntent.metadata.taxes)
        : 0,
      fees: paymentIntent.metadata?.fees
        ? parseFloat(paymentIntent.metadata.fees)
        : 0,
      netAmount:
        (paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) /
        100,
    };

    // Store payment event
    await this.storePaymentEvent(paymentEvent);
  }

  /**
   * Set up Stripe webhook handlers
   */
  private async setupStripeWebhooks(
    config: StripeIntegrationConfig,
  ): Promise<void> {
    const webhookEvents = [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.trial_will_end',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
    ];

    // Store webhook configuration
    await this.supabase.from('webhook_configurations').upsert(
      {
        provider: 'stripe',
        webhook_secret: config.webhookSecret,
        enabled_events: webhookEvents,
        endpoints: config.webhookEndpoints,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'provider' },
    );
  }

  /**
   * Calculate current subscription metrics
   */
  private async calculateStripeSubscriptionMetrics(): Promise<{
    activeSubscriptions: number;
    totalRevenue: number;
    averageMonthlyRevenue: number;
  }> {
    const { data: subscriptions, error } = await this.supabase
      .from('subscription_data')
      .select('amount, status')
      .eq('provider', 'stripe')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch subscription metrics: ${error.message}`);
    }

    const activeSubscriptions = subscriptions?.length || 0;
    const totalRevenue =
      subscriptions?.reduce((sum, sub) => sum + sub.amount, 0) || 0;
    const averageMonthlyRevenue =
      activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;

    return {
      activeSubscriptions,
      totalRevenue,
      averageMonthlyRevenue,
    };
  }

  // Helper methods for lifecycle processing
  private async getSupplierLTV(supplierId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('supplier_ltv')
      .select('ltv_value')
      .eq('user_id', supplierId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.ltv_value || 0;
  }

  private async calculateNewSubscriptionLTV(
    event: SubscriptionEvent,
  ): Promise<number> {
    // Calculate estimated LTV based on plan and historical data
    const monthlyValue = event.amount / 100; // Convert from cents
    const estimatedLifespanMonths = 24; // Average wedding supplier lifespan
    const retentionRate = 0.8; // 80% retention rate

    return monthlyValue * estimatedLifespanMonths * retentionRate;
  }

  private async calculateSubscriptionUpdateImpact(
    event: SubscriptionEvent,
  ): Promise<number> {
    // Get previous subscription value
    const { data: previousEvent } = await this.supabase
      .from('subscription_events')
      .select('amount')
      .eq('subscription_id', event.subscriptionId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!previousEvent || previousEvent.length < 2) {
      return 0;
    }

    const currentAmount = event.amount / 100;
    const previousAmount = previousEvent[1].amount / 100;
    const monthlyDifference = currentAmount - previousAmount;

    // Project impact over remaining subscription lifetime
    const remainingMonths = Math.max(
      1,
      Math.ceil(
        (event.currentPeriodEnd.getTime() - Date.now()) /
          (30 * 24 * 60 * 60 * 1000),
      ),
    );

    return monthlyDifference * remainingMonths;
  }

  private async calculateCancellationImpact(
    event: SubscriptionEvent,
  ): Promise<number> {
    // Calculate lost future revenue
    const monthlyValue = event.amount / 100;
    const averageRemainingLifetime = 12; // 12 months average remaining

    return -(monthlyValue * averageRemainingLifetime);
  }

  private async calculateTrialConversionProbability(
    event: SubscriptionEvent,
  ): Promise<number> {
    // Simple model based on trial usage and engagement
    // In production, this would use ML models
    const baseConversionRate = 0.25;
    const businessTypeMultiplier =
      event.metadata.businessType === 'photographer' ? 1.2 : 1.0;
    const sourceMultiplier =
      event.metadata.signupSource === 'organic' ? 1.1 : 0.9;

    return Math.min(
      0.9,
      baseConversionRate * businessTypeMultiplier * sourceMultiplier,
    );
  }

  private async calculateTrialEndImpact(
    event: SubscriptionEvent,
    conversionProbability: number,
  ): Promise<number> {
    const potentialLTV = await this.calculateNewSubscriptionLTV(event);
    return potentialLTV * conversionProbability;
  }

  private async calculatePaymentFailureChurnRisk(
    event: SubscriptionEvent,
  ): Promise<number> {
    // Calculate churn risk based on payment failure patterns
    const { data: failureHistory } = await this.supabase
      .from('payment_failures')
      .select('id')
      .eq('customer_id', event.customerId)
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const recentFailures = failureHistory?.length || 0;

    // Exponential increase in churn risk
    return Math.min(0.9, 0.2 + recentFailures * 0.15);
  }

  // Storage methods
  private async storeIntegrationConfig(
    provider: string,
    config: any,
  ): Promise<string> {
    const integrationId = `${provider}_${Date.now()}`;

    await this.supabase.from('payment_integrations').insert({
      id: integrationId,
      provider,
      config: JSON.stringify(config),
      status: 'active',
      created_at: new Date().toISOString(),
    });

    return integrationId;
  }

  private async storeSubscriptionEvent(
    event: SubscriptionEvent,
    ltvImpact: number,
    churnRisk: number,
  ): Promise<void> {
    await this.supabase.from('subscription_events').insert({
      id: event.id,
      customer_id: event.customerId,
      subscription_id: event.subscriptionId,
      event_type: event.eventType,
      plan_id: event.planId,
      amount: event.amount,
      currency: event.currency,
      status: event.status,
      ltv_impact: ltvImpact,
      churn_risk: churnRisk,
      metadata: event.metadata,
      created_at: new Date().toISOString(),
    });
  }

  private async storeSubscriptionData(event: SubscriptionEvent): Promise<void> {
    await this.supabase.from('subscription_data').upsert(
      {
        subscription_id: event.subscriptionId,
        customer_id: event.customerId,
        plan_id: event.planId,
        plan_name: event.planName,
        amount: event.amount,
        currency: event.currency,
        status: event.status,
        current_period_start: event.currentPeriodStart.toISOString(),
        current_period_end: event.currentPeriodEnd.toISOString(),
        metadata: event.metadata,
        provider: 'stripe',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'subscription_id' },
    );
  }

  private async storePaymentEvent(event: PaymentEvent): Promise<void> {
    await this.supabase.from('payment_events').insert({
      id: event.id,
      user_id: event.userId,
      subscription_id: event.subscriptionId,
      event_type: event.eventType,
      amount: event.amount,
      currency: event.currency,
      timestamp: event.timestamp.toISOString(),
      payment_method: event.paymentMethod,
      metadata: event.metadata,
      taxes: event.taxes || 0,
      fees: event.fees || 0,
      net_amount: event.netAmount,
      created_at: new Date().toISOString(),
    });
  }

  private async updateSupplierLTV(
    supplierId: string,
    newLTV: number,
  ): Promise<void> {
    await this.supabase.from('supplier_ltv').upsert(
      {
        user_id: supplierId,
        ltv_value: newLTV,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }

  private async updateChurnRisk(
    supplierId: string,
    churnRisk: number,
  ): Promise<void> {
    await this.supabase.from('supplier_churn_risk').upsert(
      {
        user_id: supplierId,
        churn_risk: churnRisk,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }

  // Utility methods
  private normalizePaymentStatus(stripeStatus: string): string {
    const statusMap: Record<string, string> = {
      succeeded: 'completed',
      requires_payment_method: 'failed',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'pending',
      canceled: 'cancelled',
    };

    return statusMap[stripeStatus] || stripeStatus;
  }

  private generateReconciliationActions(
    discrepancies: ReconciliationResult['discrepancies'],
    accuracy: number,
  ): string[] {
    const actions: string[] = [];

    if (accuracy < 0.9) {
      actions.push('Immediate manual review required');
    }

    if (discrepancies.some((d) => d.type === 'amount_mismatch')) {
      actions.push('Investigate amount discrepancies');
    }

    if (discrepancies.some((d) => d.type === 'missing_internal')) {
      actions.push('Import missing Stripe payments');
    }

    if (discrepancies.some((d) => d.type === 'missing_external')) {
      actions.push('Verify internal payment records');
    }

    if (actions.length === 0) {
      actions.push('No action required - reconciliation successful');
    }

    return actions;
  }

  // Logging and monitoring methods
  private async logIntegrationEvent(
    eventType: string,
    data: any,
  ): Promise<void> {
    await this.supabase.from('integration_logs').insert({
      event_type: eventType,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    });
  }

  private async logLifecycleProcessing(
    result: LifecycleProcessingResult,
  ): Promise<void> {
    await this.supabase.from('lifecycle_processing_logs').insert({
      event_id: result.eventId,
      processed: result.processed,
      ltv_impact: result.ltvImpact,
      churn_risk: result.churnRisk,
      recommended_actions: result.recommendedActions,
      timestamp: result.processingTimestamp.toISOString(),
    });
  }

  private async storeReconciliationResults(
    result: ReconciliationResult,
  ): Promise<void> {
    await this.supabase.from('reconciliation_results').insert({
      total_records: result.totalRecords,
      matched_records: result.matchedRecords,
      discrepancy_count: result.discrepancies.length,
      accuracy: result.reconciliationAccuracy,
      discrepancies: JSON.stringify(result.discrepancies),
      recommended_actions: result.recommendedActions,
      created_at: new Date().toISOString(),
    });
  }

  private async alertDataInconsistency(
    result: ReconciliationResult,
  ): Promise<void> {
    // Implementation would send alerts to monitoring systems
    console.warn('Data inconsistency detected:', {
      accuracy: result.reconciliationAccuracy,
      discrepancies: result.discrepancies.length,
    });
  }

  // Additional helper methods for payment processing
  private async updatePaymentSuccessMetrics(
    event: SubscriptionEvent,
  ): Promise<void> {
    await this.supabase.from('payment_success_metrics').insert({
      customer_id: event.customerId,
      subscription_id: event.subscriptionId,
      amount: event.amount,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePaymentFailure(event: SubscriptionEvent): Promise<void> {
    await this.supabase.from('payment_failures').insert({
      customer_id: event.customerId,
      subscription_id: event.subscriptionId,
      amount: event.amount,
      failure_reason: 'Payment processing failed',
      timestamp: new Date().toISOString(),
    });
  }
}
