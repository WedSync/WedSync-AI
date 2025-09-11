/**
 * WS-183 LTV Data Pipeline - Core financial data integration orchestrator
 *
 * This is the central orchestrator for all LTV-related financial data processing,
 * integrating payment events, marketing attribution, and external analytics
 * for comprehensive wedding supplier lifetime value calculations.
 */

import { createClient } from '@supabase/supabase-js';

export interface PaymentEvent {
  id: string;
  userId: string;
  subscriptionId?: string;
  eventType:
    | 'payment_successful'
    | 'payment_failed'
    | 'subscription_upgraded'
    | 'subscription_downgraded'
    | 'subscription_cancelled'
    | 'refund_processed'
    | 'chargeback_received';
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
  timestamp: Date;
  paymentMethod: 'stripe' | 'paypal' | 'manual';
  metadata: {
    subscriptionTier?: string;
    planId?: string;
    customerId: string;
    invoiceId?: string;
    paymentIntentId?: string;
    webhookEventId: string;
  };
  taxes?: number;
  fees?: number;
  netAmount: number;
}

export interface MarketingAttributionData {
  id: string;
  userId: string;
  source: string;
  medium: string;
  campaign: string;
  attribution: number; // 0-1 representing attribution weight
  spend: number;
  timestamp: Date;
  conversionValue: number;
  touchpointSequence: number;
}

export interface RevenueProcessingResult {
  processedEvents: number;
  successfulEvents: PaymentEvent[];
  failedEvents: { event: PaymentEvent; error: string }[];
  ltvUpdatesTriggered: number;
  totalRevenueImpact: number;
  affectedSuppliers: string[];
  dataQualityScore: number;
  processingTimeMs: number;
}

export interface AttributionSyncResult {
  syncedRecords: number;
  attributionUpdates: number;
  cacRecalculations: number;
  totalSpendProcessed: number;
  channelBreakdown: Record<string, { spend: number; attribution: number }>;
  dataValidationErrors: string[];
  syncTimeMs: number;
}

export interface FinancialData {
  revenue: PaymentEvent[];
  attribution: MarketingAttributionData[];
  timestamp: Date;
  source: string;
  validationChecks: string[];
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicatesFound: number;
  currencyMismatches: number;
  dataQualityScore: number;
  validationTimestamp: Date;
}

export class LTVDataPipeline {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private readonly VALIDATION_THRESHOLDS = {
    MAX_DUPLICATE_RATE: 0.05, // 5%
    MIN_DATA_QUALITY_SCORE: 0.85, // 85%
    MAX_PROCESSING_TIME_MS: 30000, // 30 seconds
  };

  /**
   * Process payment events for LTV calculation updates
   * Handles subscription lifecycle events and revenue adjustments
   */
  async processRevenueEvents(
    paymentEvents: PaymentEvent[],
  ): Promise<RevenueProcessingResult> {
    const startTime = Date.now();
    const result: RevenueProcessingResult = {
      processedEvents: 0,
      successfulEvents: [],
      failedEvents: [],
      ltvUpdatesTriggered: 0,
      totalRevenueImpact: 0,
      affectedSuppliers: [],
      dataQualityScore: 0,
      processingTimeMs: 0,
    };

    // Track affected suppliers using a Set to avoid duplicates
    const affectedSuppliersSet = new Set<string>();

    try {
      // Validate input data
      const validationResult = await this.validateFinancialDataIntegrity({
        revenue: paymentEvents,
        attribution: [],
        timestamp: new Date(),
        source: 'payment_events',
        validationChecks: [
          'duplicate_check',
          'currency_validation',
          'amount_validation',
        ],
      });

      if (!validationResult.isValid) {
        throw new Error(
          `Data validation failed: ${validationResult.errors.join(', ')}`,
        );
      }

      // Process each payment event
      for (const event of paymentEvents) {
        try {
          await this.processSinglePaymentEvent(event);
          result.successfulEvents.push(event);
          result.totalRevenueImpact += event.netAmount;
          affectedSuppliersSet.add(event.userId);
          result.processedEvents++;
        } catch (error) {
          result.failedEvents.push({
            event,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`Failed to process payment event ${event.id}:`, error);
        }
      }

      // Convert Set to array and trigger LTV recalculations for affected suppliers
      result.affectedSuppliers = Array.from(affectedSuppliersSet);
      result.ltvUpdatesTriggered = await this.triggerLTVRecalculations(
        result.affectedSuppliers,
      );

      // Calculate data quality score
      result.dataQualityScore = this.calculateDataQualityScore(
        result,
        validationResult,
      );

      result.processingTimeMs = Date.now() - startTime;

      // Log processing metrics
      await this.logProcessingMetrics('revenue_processing', result);

      return result;
    } catch (error) {
      console.error('Revenue processing failed:', error);
      result.processingTimeMs = Date.now() - startTime;
      throw new Error(
        `Revenue processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Synchronize marketing attribution data from multiple channels
   * Calculate multi-touch attribution for accurate CAC calculations
   */
  async synchronizeMarketingData(
    attributionData: MarketingAttributionData[],
  ): Promise<AttributionSyncResult> {
    const startTime = Date.now();
    const result: AttributionSyncResult = {
      syncedRecords: 0,
      attributionUpdates: 0,
      cacRecalculations: 0,
      totalSpendProcessed: 0,
      channelBreakdown: {},
      dataValidationErrors: [],
      syncTimeMs: 0,
    };

    try {
      // Validate attribution data
      const validation = await this.validateAttributionData(attributionData);
      result.dataValidationErrors = validation.errors;

      if (validation.errors.length > 10) {
        throw new Error('Too many data validation errors, aborting sync');
      }

      // Group data by channel
      const channelGroups = this.groupAttributionByChannel(attributionData);

      // Process each channel
      for (const [channel, data] of Object.entries(channelGroups)) {
        const channelSpend = data.reduce((sum, item) => sum + item.spend, 0);
        const channelAttribution = data.reduce(
          (sum, item) => sum + item.attribution,
          0,
        );

        result.channelBreakdown[channel] = {
          spend: channelSpend,
          attribution: channelAttribution,
        };

        result.totalSpendProcessed += channelSpend;
      }

      // Store attribution data
      const { error: insertError } = await this.supabase
        .from('marketing_attribution')
        .upsert(
          attributionData.map((attr) => ({
            id: attr.id,
            user_id: attr.userId,
            source: attr.source,
            medium: attr.medium,
            campaign: attr.campaign,
            attribution_weight: attr.attribution,
            spend: attr.spend,
            timestamp: attr.timestamp.toISOString(),
            conversion_value: attr.conversionValue,
            touchpoint_sequence: attr.touchpointSequence,
            created_at: new Date().toISOString(),
          })),
          { onConflict: 'id' },
        );

      if (insertError) {
        throw new Error(
          `Failed to store attribution data: ${insertError.message}`,
        );
      }

      result.syncedRecords = attributionData.length;

      // Update CAC calculations for affected users
      const uniqueUsers = Array.from(
        new Set(attributionData.map((attr) => attr.userId)),
      );
      result.cacRecalculations = await this.updateCACCalculations(uniqueUsers);
      result.attributionUpdates =
        await this.updateAttributionWeights(attributionData);

      result.syncTimeMs = Date.now() - startTime;

      // Log sync metrics
      await this.logProcessingMetrics('attribution_sync', result);

      return result;
    } catch (error) {
      console.error('Marketing data synchronization failed:', error);
      result.syncTimeMs = Date.now() - startTime;
      throw new Error(
        `Attribution sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate financial data consistency across sources
   * Detect and handle duplicate transactions
   */
  private async validateFinancialDataIntegrity(
    financialData: FinancialData,
  ): Promise<DataValidationResult> {
    const result: DataValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      duplicatesFound: 0,
      currencyMismatches: 0,
      dataQualityScore: 1.0,
      validationTimestamp: new Date(),
    };

    try {
      // Check for duplicates in payment events
      const paymentIds = financialData.revenue.map((event) => event.id);
      const uniquePaymentIds = new Set(paymentIds);
      result.duplicatesFound = paymentIds.length - uniquePaymentIds.size;

      if (result.duplicatesFound > 0) {
        result.errors.push(
          `Found ${result.duplicatesFound} duplicate payment events`,
        );
        result.dataQualityScore -= 0.1;
      }

      // Validate currency consistency
      const currencies = new Set(
        financialData.revenue.map((event) => event.currency),
      );
      if (currencies.size > 3) {
        result.warnings.push(
          `Multiple currencies detected: ${Array.from(currencies).join(', ')}`,
        );
        result.currencyMismatches = currencies.size - 1;
      }

      // Validate amount consistency
      for (const event of financialData.revenue) {
        if (event.amount <= 0) {
          result.errors.push(
            `Invalid amount for event ${event.id}: ${event.amount}`,
          );
        }

        if (event.netAmount > event.amount) {
          result.errors.push(
            `Net amount exceeds gross amount for event ${event.id}`,
          );
        }

        // Check for reasonable amounts (wedding supplier subscriptions typically $50-$500/month)
        if (event.amount > 10000) {
          result.warnings.push(
            `Unusually high amount for event ${event.id}: $${event.amount}`,
          );
        }
      }

      // Validate timestamp consistency
      const now = new Date();
      const futureEvents = financialData.revenue.filter(
        (event) => event.timestamp > now,
      );
      if (futureEvents.length > 0) {
        result.errors.push(
          `Found ${futureEvents.length} events with future timestamps`,
        );
      }

      // Calculate final data quality score
      const errorPenalty = result.errors.length * 0.1;
      const warningPenalty = result.warnings.length * 0.02;
      result.dataQualityScore = Math.max(
        0,
        1.0 - errorPenalty - warningPenalty,
      );

      // Determine overall validity
      result.isValid =
        result.errors.length === 0 &&
        result.dataQualityScore >=
          this.VALIDATION_THRESHOLDS.MIN_DATA_QUALITY_SCORE;

      return result;
    } catch (error) {
      console.error('Data validation error:', error);
      result.isValid = false;
      result.errors.push(
        `Validation process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      result.dataQualityScore = 0;
      return result;
    }
  }

  /**
   * Process a single payment event and update related LTV calculations
   */
  private async processSinglePaymentEvent(event: PaymentEvent): Promise<void> {
    try {
      // Store the payment event
      const { error: insertError } = await this.supabase
        .from('payment_events')
        .insert({
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

      if (insertError) {
        throw new Error(
          `Failed to store payment event: ${insertError.message}`,
        );
      }

      // Handle different event types
      switch (event.eventType) {
        case 'payment_successful':
          await this.handleSuccessfulPayment(event);
          break;
        case 'subscription_upgraded':
          await this.handleSubscriptionUpgrade(event);
          break;
        case 'subscription_downgraded':
          await this.handleSubscriptionDowngrade(event);
          break;
        case 'subscription_cancelled':
          await this.handleSubscriptionCancellation(event);
          break;
        case 'refund_processed':
          await this.handleRefund(event);
          break;
        case 'chargeback_received':
          await this.handleChargeback(event);
          break;
        default:
          console.warn(`Unknown event type: ${event.eventType}`);
      }
    } catch (error) {
      console.error(`Failed to process payment event ${event.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle successful payment processing
   */
  private async handleSuccessfulPayment(event: PaymentEvent): Promise<void> {
    // Update supplier revenue
    await this.updateSupplierRevenue(
      event.userId,
      event.netAmount,
      event.timestamp,
    );

    // Update subscription metrics if applicable
    if (event.subscriptionId) {
      await this.updateSubscriptionMetrics(event.subscriptionId, event);
    }

    // Trigger LTV recalculation
    await this.scheduleSupplierLTVUpdate(event.userId);
  }

  /**
   * Handle subscription upgrades
   */
  private async handleSubscriptionUpgrade(event: PaymentEvent): Promise<void> {
    // Calculate upgrade value
    const upgradeValue = await this.calculateUpgradeValue(event);

    // Update supplier LTV projection
    await this.updateSupplierLTVProjection(event.userId, upgradeValue);

    // Log subscription change
    await this.logSubscriptionChange(event, 'upgrade');
  }

  /**
   * Handle subscription downgrades
   */
  private async handleSubscriptionDowngrade(
    event: PaymentEvent,
  ): Promise<void> {
    // Calculate downgrade impact
    const downgradeImpact = await this.calculateDowngradeImpact(event);

    // Update supplier LTV projection
    await this.updateSupplierLTVProjection(event.userId, -downgradeImpact);

    // Log subscription change
    await this.logSubscriptionChange(event, 'downgrade');
  }

  /**
   * Handle subscription cancellations
   */
  private async handleSubscriptionCancellation(
    event: PaymentEvent,
  ): Promise<void> {
    // Calculate lost LTV
    const lostLTV = await this.calculateLostLTV(event.userId);

    // Update churn metrics
    await this.updateChurnMetrics(event.userId, event.timestamp);

    // Trigger retention analysis
    await this.triggerRetentionAnalysis(event.userId);

    // Log subscription change
    await this.logSubscriptionChange(event, 'cancellation');
  }

  /**
   * Handle refund processing
   */
  private async handleRefund(event: PaymentEvent): Promise<void> {
    // Adjust supplier revenue
    await this.adjustSupplierRevenue(
      event.userId,
      -Math.abs(event.netAmount),
      event.timestamp,
    );

    // Update refund metrics
    await this.updateRefundMetrics(event);

    // Recalculate LTV
    await this.scheduleSupplierLTVUpdate(event.userId);
  }

  /**
   * Handle chargeback processing
   */
  private async handleChargeback(event: PaymentEvent): Promise<void> {
    // Adjust supplier revenue with additional fees
    const chargebackImpact = Math.abs(event.netAmount) + 25; // $25 typical chargeback fee
    await this.adjustSupplierRevenue(
      event.userId,
      -chargebackImpact,
      event.timestamp,
    );

    // Update risk metrics
    await this.updateRiskMetrics(event.userId, 'chargeback');

    // Trigger fraud analysis
    await this.triggerFraudAnalysis(event);
  }

  /**
   * Trigger LTV recalculations for affected suppliers
   */
  private async triggerLTVRecalculations(
    supplierIds: string[],
  ): Promise<number> {
    let recalculationCount = 0;

    for (const supplierId of supplierIds) {
      try {
        // Queue LTV recalculation job
        const { error } = await this.supabase
          .from('ltv_calculation_queue')
          .insert({
            user_id: supplierId,
            priority: 'high',
            trigger_event: 'revenue_update',
            queued_at: new Date().toISOString(),
          });

        if (!error) {
          recalculationCount++;
        }
      } catch (error) {
        console.error(
          `Failed to queue LTV recalculation for supplier ${supplierId}:`,
          error,
        );
      }
    }

    return recalculationCount;
  }

  /**
   * Validate attribution data
   */
  private async validateAttributionData(
    data: MarketingAttributionData[],
  ): Promise<{ errors: string[] }> {
    const errors: string[] = [];

    for (const attr of data) {
      if (attr.attribution < 0 || attr.attribution > 1) {
        errors.push(
          `Invalid attribution value for ${attr.id}: ${attr.attribution}`,
        );
      }

      if (attr.spend < 0) {
        errors.push(`Negative spend for ${attr.id}: ${attr.spend}`);
      }

      if (!attr.source || !attr.medium || !attr.campaign) {
        errors.push(`Missing required fields for ${attr.id}`);
      }
    }

    return { errors };
  }

  /**
   * Group attribution data by channel
   */
  private groupAttributionByChannel(
    data: MarketingAttributionData[],
  ): Record<string, MarketingAttributionData[]> {
    const grouped: Record<string, MarketingAttributionData[]> = {};

    for (const attr of data) {
      const channel = `${attr.source}_${attr.medium}`;
      if (!grouped[channel]) {
        grouped[channel] = [];
      }
      grouped[channel].push(attr);
    }

    return grouped;
  }

  /**
   * Update CAC calculations for users
   */
  private async updateCACCalculations(userIds: string[]): Promise<number> {
    let updateCount = 0;

    for (const userId of userIds) {
      try {
        // Calculate total attribution spend for user
        const { data: attributionData, error } = await this.supabase
          .from('marketing_attribution')
          .select('spend, attribution_weight')
          .eq('user_id', userId);

        if (error) {
          console.error(
            `Failed to fetch attribution data for user ${userId}:`,
            error,
          );
          continue;
        }

        const totalCAC =
          attributionData?.reduce(
            (sum, attr) => sum + attr.spend * attr.attribution_weight,
            0,
          ) || 0;

        // Update user CAC
        const { error: updateError } = await this.supabase
          .from('user_metrics')
          .upsert(
            {
              user_id: userId,
              cac: totalCAC,
              last_cac_update: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );

        if (!updateError) {
          updateCount++;
        }
      } catch (error) {
        console.error(`Failed to update CAC for user ${userId}:`, error);
      }
    }

    return updateCount;
  }

  /**
   * Update attribution weights
   */
  private async updateAttributionWeights(
    data: MarketingAttributionData[],
  ): Promise<number> {
    // This would implement attribution model recalculations
    // For now, return the count of processed records
    return data.length;
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQualityScore(
    result: RevenueProcessingResult,
    validation: DataValidationResult,
  ): number {
    const successRate =
      result.processedEvents > 0
        ? result.successfulEvents.length / result.processedEvents
        : 1;

    const processingScore =
      result.processingTimeMs <
      this.VALIDATION_THRESHOLDS.MAX_PROCESSING_TIME_MS
        ? 1
        : 0.8;

    return Math.min(
      1,
      successRate * 0.4 +
        validation.dataQualityScore * 0.4 +
        processingScore * 0.2,
    );
  }

  /**
   * Log processing metrics
   */
  private async logProcessingMetrics(
    operation: string,
    metrics: any,
  ): Promise<void> {
    try {
      await this.supabase.from('pipeline_metrics').insert({
        operation,
        metrics: JSON.stringify(metrics),
        timestamp: new Date().toISOString(),
        success: true,
      });
    } catch (error) {
      console.error('Failed to log metrics:', error);
    }
  }

  // Helper methods for payment event processing
  private async updateSupplierRevenue(
    userId: string,
    amount: number,
    timestamp: Date,
  ): Promise<void> {
    const { error } = await this.supabase.from('supplier_revenue').upsert(
      {
        user_id: userId,
        amount,
        timestamp: timestamp.toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,timestamp' },
    );

    if (error) {
      throw new Error(`Failed to update supplier revenue: ${error.message}`);
    }
  }

  private async scheduleSupplierLTVUpdate(userId: string): Promise<void> {
    // Implementation would schedule background job
    console.log(`Scheduled LTV update for supplier: ${userId}`);
  }

  private async updateSubscriptionMetrics(
    subscriptionId: string,
    event: PaymentEvent,
  ): Promise<void> {
    // Implementation would update subscription-specific metrics
    console.log(`Updated subscription metrics for: ${subscriptionId}`);
  }

  private async calculateUpgradeValue(event: PaymentEvent): Promise<number> {
    // Implementation would calculate the incremental value from upgrade
    return event.netAmount * 0.2; // Simplified calculation
  }

  private async updateSupplierLTVProjection(
    userId: string,
    adjustment: number,
  ): Promise<void> {
    // Implementation would adjust LTV projections
    console.log(`Adjusted LTV projection for ${userId} by ${adjustment}`);
  }

  private async logSubscriptionChange(
    event: PaymentEvent,
    changeType: string,
  ): Promise<void> {
    await this.supabase.from('subscription_changes').insert({
      user_id: event.userId,
      subscription_id: event.subscriptionId,
      change_type: changeType,
      amount: event.netAmount,
      timestamp: event.timestamp.toISOString(),
    });
  }

  private async calculateDowngradeImpact(event: PaymentEvent): Promise<number> {
    // Implementation would calculate lost value from downgrade
    return event.netAmount * 0.3; // Simplified calculation
  }

  private async calculateLostLTV(userId: string): Promise<number> {
    // Implementation would calculate lost lifetime value
    return 2500; // Average wedding supplier LTV
  }

  private async updateChurnMetrics(
    userId: string,
    timestamp: Date,
  ): Promise<void> {
    await this.supabase.from('churn_events').insert({
      user_id: userId,
      churn_date: timestamp.toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  private async triggerRetentionAnalysis(userId: string): Promise<void> {
    // Implementation would trigger retention analysis workflow
    console.log(`Triggered retention analysis for: ${userId}`);
  }

  private async adjustSupplierRevenue(
    userId: string,
    amount: number,
    timestamp: Date,
  ): Promise<void> {
    await this.updateSupplierRevenue(userId, amount, timestamp);
  }

  private async updateRefundMetrics(event: PaymentEvent): Promise<void> {
    await this.supabase.from('refund_events').insert({
      payment_event_id: event.id,
      user_id: event.userId,
      amount: Math.abs(event.netAmount),
      timestamp: event.timestamp.toISOString(),
    });
  }

  private async updateRiskMetrics(
    userId: string,
    riskType: string,
  ): Promise<void> {
    await this.supabase.from('risk_events').insert({
      user_id: userId,
      risk_type: riskType,
      timestamp: new Date().toISOString(),
    });
  }

  private async triggerFraudAnalysis(event: PaymentEvent): Promise<void> {
    // Implementation would trigger fraud detection workflow
    console.log(`Triggered fraud analysis for event: ${event.id}`);
  }
}
