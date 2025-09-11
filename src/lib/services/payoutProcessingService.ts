/**
 * WS-109: Payout Processing Service
 *
 * Automated monthly payout processing system that handles Stripe Connect
 * transfers, minimum thresholds, retry logic, and payout tracking.
 * Integrates with commission calculation service for creator payouts.
 *
 * Team B - Batch 8 - Round 2
 * Backend Commission Engine Implementation
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import Decimal from 'decimal.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

export interface PayoutSummary {
  creator_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_commission_earned_cents: number;
  total_platform_fee_cents: number;
  net_payout_amount_cents: number;
  transaction_count: number;
  current_tier: string;
  stripe_account_id?: string;
  minimum_payout_threshold_cents: number;
}

export interface PayoutRecord {
  id: string;
  creator_id: string;
  payout_period_start: string;
  payout_period_end: string;
  gross_earnings_cents: number;
  platform_fees_cents: number;
  net_payout_cents: number;
  stripe_transfer_id?: string;
  stripe_account_id?: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  failure_reason?: string;
  retry_count: number;
  processed_at?: string;
  paid_at?: string;
  created_at: string;
}

export interface PayoutQueueItem {
  creator_id: string;
  expected_payout_cents: number;
  transaction_count: number;
  period_start: string;
  period_end: string;
  priority: 'high' | 'normal' | 'low';
}

export interface StripeConnectAccount {
  creator_id: string;
  stripe_account_id: string;
  account_status: 'active' | 'pending' | 'restricted' | 'suspended';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_completed: boolean;
  requirements_due: string[];
}

export interface PayoutProcessingResult {
  success: boolean;
  payout_id?: string;
  stripe_transfer_id?: string;
  error_message?: string;
  retry_suggested: boolean;
  next_retry_at?: string;
}

// =====================================================================================
// PAYOUT PROCESSING SERVICE
// =====================================================================================

export class PayoutProcessingService {
  // Configuration constants
  private static readonly MINIMUM_PAYOUT_THRESHOLD_CENTS = 2000; // £20 minimum payout
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MINUTES = [30, 120, 1440]; // 30min, 2hr, 24hr
  private static readonly PAYOUT_PROCESSING_FEE_CENTS = 25; // 25p processing fee

  /**
   * Process monthly payouts for all eligible creators
   */
  async processMonthlyPayouts(
    periodStart?: Date,
    periodEnd?: Date,
    creatorIds?: string[],
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    errors: Array<{ creator_id: string; error: string }>;
  }> {
    try {
      console.log('Starting monthly payout processing...');

      // Default to previous month if no period specified
      if (!periodStart || !periodEnd) {
        const now = new Date();
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }

      // Get payout summaries for eligible creators
      const payoutSummaries = await this.generatePayoutSummaries(
        periodStart,
        periodEnd,
        creatorIds,
      );

      console.log(
        `Found ${payoutSummaries.length} creators for payout processing`,
      );

      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        errors: [] as Array<{ creator_id: string; error: string }>,
      };

      // Process each creator's payout
      for (const summary of payoutSummaries) {
        results.processed++;

        try {
          // Check if payout meets minimum threshold
          if (
            summary.net_payout_amount_cents <
            summary.minimum_payout_threshold_cents
          ) {
            console.log(
              `Skipping ${summary.creator_id}: Below minimum threshold`,
            );
            results.skipped++;
            continue;
          }

          // Process the payout
          const result = await this.processSinglePayout(summary);

          if (result.success) {
            results.succeeded++;
          } else {
            results.failed++;
            results.errors.push({
              creator_id: summary.creator_id,
              error: result.error_message || 'Unknown error',
            });
          }
        } catch (error) {
          console.error(
            `Error processing payout for ${summary.creator_id}:`,
            error,
          );
          results.failed++;
          results.errors.push({
            creator_id: summary.creator_id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // Add small delay between payouts to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log('Monthly payout processing completed:', results);
      return results;
    } catch (error) {
      console.error('Error in monthly payout processing:', error);
      throw error;
    }
  }

  /**
   * Process payout for a single creator
   */
  async processSinglePayout(
    summary: PayoutSummary,
  ): Promise<PayoutProcessingResult> {
    try {
      // Validate Stripe Connect account
      const connectAccount = await this.validateStripeAccount(
        summary.creator_id,
      );
      if (!connectAccount || !connectAccount.payouts_enabled) {
        return {
          success: false,
          error_message: 'Stripe Connect account not ready for payouts',
          retry_suggested: false,
        };
      }

      // Create payout record
      const payoutRecord = await this.createPayoutRecord(
        summary,
        connectAccount.stripe_account_id,
      );

      try {
        // Calculate final payout amount (subtract processing fee)
        const finalPayoutCents =
          summary.net_payout_amount_cents -
          PayoutProcessingService.PAYOUT_PROCESSING_FEE_CENTS;

        if (finalPayoutCents <= 0) {
          throw new Error('Payout amount too low after processing fees');
        }

        // Execute Stripe Connect transfer
        const transfer = await stripe.transfers.create({
          amount: finalPayoutCents,
          currency: 'gbp',
          destination: connectAccount.stripe_account_id,
          description: `Marketplace payout for period ${summary.period_start} to ${summary.period_end}`,
          metadata: {
            creator_id: summary.creator_id,
            payout_record_id: payoutRecord.id,
            period_start: summary.period_start,
            period_end: summary.period_end,
            transaction_count: summary.transaction_count.toString(),
          },
        });

        // Update payout record with success
        await this.updatePayoutRecord(payoutRecord.id, {
          status: 'paid',
          stripe_transfer_id: transfer.id,
          paid_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        });

        // Log successful payout
        await this.logPayoutEvent(
          summary.creator_id,
          payoutRecord.id,
          'payout.succeeded',
          {
            transfer_id: transfer.id,
            amount_cents: finalPayoutCents,
            transaction_count: summary.transaction_count,
          },
        );

        return {
          success: true,
          payout_id: payoutRecord.id,
          stripe_transfer_id: transfer.id,
          retry_suggested: false,
        };
      } catch (stripeError) {
        console.error('Stripe transfer error:', stripeError);

        // Determine if retry is appropriate
        const isRetryable = this.isRetryableError(stripeError);
        const nextRetryAt = isRetryable
          ? this.calculateNextRetry(payoutRecord.retry_count)
          : null;

        // Update payout record with failure
        await this.updatePayoutRecord(payoutRecord.id, {
          status: 'failed',
          failure_reason:
            stripeError instanceof Error
              ? stripeError.message
              : 'Unknown Stripe error',
          retry_count: payoutRecord.retry_count + 1,
          processed_at: new Date().toISOString(),
        });

        // Log failed payout
        await this.logPayoutEvent(
          summary.creator_id,
          payoutRecord.id,
          'payout.failed',
          {
            error:
              stripeError instanceof Error
                ? stripeError.message
                : 'Unknown error',
            retry_count: payoutRecord.retry_count + 1,
            next_retry_at: nextRetryAt,
          },
        );

        return {
          success: false,
          payout_id: payoutRecord.id,
          error_message:
            stripeError instanceof Error
              ? stripeError.message
              : 'Stripe transfer failed',
          retry_suggested: isRetryable,
          next_retry_at: nextRetryAt || undefined,
        };
      }
    } catch (error) {
      console.error('Error in single payout processing:', error);
      return {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_suggested: false,
      };
    }
  }

  /**
   * Retry failed payouts
   */
  async retryFailedPayouts(
    maxRetries: number = PayoutProcessingService.MAX_RETRY_ATTEMPTS,
  ): Promise<{
    retried: number;
    succeeded: number;
    failed: number;
  }> {
    try {
      console.log('Starting failed payout retry process...');

      // Get failed payouts eligible for retry
      const { data: failedPayouts, error } = await supabase
        .from('marketplace_creator_payouts')
        .select('*')
        .eq('status', 'failed')
        .lt('retry_count', maxRetries)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch failed payouts: ${error.message}`);
      }

      const results = { retried: 0, succeeded: 0, failed: 0 };

      for (const payout of failedPayouts || []) {
        // Check if enough time has passed for retry
        if (!this.shouldRetryPayout(payout)) {
          continue;
        }

        results.retried++;

        try {
          // Reconstruct payout summary
          const summary = await this.reconstructPayoutSummary(payout);

          // Attempt payout again
          const result = await this.processSinglePayout(summary);

          if (result.success) {
            results.succeeded++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Retry failed for payout ${payout.id}:`, error);
          results.failed++;
        }
      }

      console.log('Failed payout retry completed:', results);
      return results;
    } catch (error) {
      console.error('Error in failed payout retry:', error);
      throw error;
    }
  }

  /**
   * Get payout status for a creator
   */
  async getCreatorPayoutStatus(
    creatorId: string,
    limit: number = 10,
  ): Promise<{
    recent_payouts: PayoutRecord[];
    pending_amount_cents: number;
    next_payout_date: string;
    total_lifetime_earnings_cents: number;
  }> {
    try {
      // Get recent payouts
      const { data: payouts, error } = await supabase
        .from('marketplace_creator_payouts')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch creator payouts: ${error.message}`);
      }

      // Calculate pending amount (current month's earnings)
      const currentMonth = new Date();
      const monthStart = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );

      const { data: pendingCommissions, error: pendingError } = await supabase
        .from('marketplace_commission_records')
        .select('creator_earnings_cents')
        .eq('creator_id', creatorId)
        .gte('created_at', monthStart.toISOString());

      if (pendingError) {
        console.error('Error fetching pending commissions:', pendingError);
      }

      const pendingAmount = (pendingCommissions || []).reduce(
        (sum, record) => sum + (record.creator_earnings_cents || 0),
        0,
      );

      // Calculate total lifetime earnings
      const { data: lifetimeData, error: lifetimeError } = await supabase
        .from('marketplace_creator_payouts')
        .select('net_payout_cents')
        .eq('creator_id', creatorId)
        .eq('status', 'paid');

      if (lifetimeError) {
        console.error('Error fetching lifetime earnings:', lifetimeError);
      }

      const lifetimeEarnings = (lifetimeData || []).reduce(
        (sum, payout) => sum + (payout.net_payout_cents || 0),
        0,
      );

      // Calculate next payout date (1st of next month)
      const nextMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      );
      const nextPayoutDate = nextMonth.toISOString().split('T')[0];

      return {
        recent_payouts: payouts || [],
        pending_amount_cents: pendingAmount,
        next_payout_date: nextPayoutDate,
        total_lifetime_earnings_cents: lifetimeEarnings,
      };
    } catch (error) {
      console.error('Error getting creator payout status:', error);
      throw error;
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async generatePayoutSummaries(
    periodStart: Date,
    periodEnd: Date,
    creatorIds?: string[],
  ): Promise<PayoutSummary[]> {
    try {
      // Build query for commission records in the period
      let query = supabase
        .from('marketplace_commission_records')
        .select(
          `
          creator_id,
          creator_earnings_cents,
          commission_amount_cents,
          created_at,
          creator_tier_at_sale
        `,
        )
        .gte('created_at', periodStart.toISOString())
        .lt('created_at', periodEnd.toISOString());

      if (creatorIds && creatorIds.length > 0) {
        query = query.in('creator_id', creatorIds);
      }

      const { data: commissionData, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch commission data: ${error.message}`);
      }

      // Group by creator and calculate summaries
      const creatorSummaries = new Map<string, PayoutSummary>();

      for (const record of commissionData || []) {
        const creatorId = record.creator_id;

        if (!creatorSummaries.has(creatorId)) {
          creatorSummaries.set(creatorId, {
            creator_id: creatorId,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            total_sales: 0,
            total_commission_earned_cents: 0,
            total_platform_fee_cents: 0,
            net_payout_amount_cents: 0,
            transaction_count: 0,
            current_tier: record.creator_tier_at_sale || 'base',
            minimum_payout_threshold_cents:
              PayoutProcessingService.MINIMUM_PAYOUT_THRESHOLD_CENTS,
          });
        }

        const summary = creatorSummaries.get(creatorId)!;
        summary.total_sales++;
        summary.total_commission_earned_cents +=
          record.creator_earnings_cents || 0;
        summary.total_platform_fee_cents += record.commission_amount_cents || 0;
        summary.transaction_count++;
      }

      // Calculate net payout amounts
      creatorSummaries.forEach((summary) => {
        summary.net_payout_amount_cents = summary.total_commission_earned_cents;
      });

      return Array.from(creatorSummaries.values());
    } catch (error) {
      console.error('Error generating payout summaries:', error);
      throw error;
    }
  }

  private async validateStripeAccount(
    creatorId: string,
  ): Promise<StripeConnectAccount | null> {
    try {
      // Get creator's Stripe Connect account info
      const { data: accountData, error } = await supabase
        .from('marketplace_creator_stripe_accounts')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (error || !accountData) {
        console.log(`No Stripe Connect account found for creator ${creatorId}`);
        return null;
      }

      // Verify account status with Stripe
      const account = await stripe.accounts.retrieve(
        accountData.stripe_account_id,
      );

      return {
        creator_id: creatorId,
        stripe_account_id: accountData.stripe_account_id,
        account_status: accountData.account_status,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        onboarding_completed: account.details_submitted,
        requirements_due: account.requirements?.currently_due || [],
      };
    } catch (error) {
      console.error(`Error validating Stripe account for ${creatorId}:`, error);
      return null;
    }
  }

  private async createPayoutRecord(
    summary: PayoutSummary,
    stripeAccountId: string,
  ): Promise<PayoutRecord> {
    try {
      const { data: payoutRecord, error } = await supabase
        .from('marketplace_creator_payouts')
        .insert({
          creator_id: summary.creator_id,
          payout_period_start: summary.period_start,
          payout_period_end: summary.period_end,
          gross_earnings_cents: summary.total_commission_earned_cents,
          platform_fees_cents: summary.total_platform_fee_cents,
          net_payout_cents: summary.net_payout_amount_cents,
          stripe_account_id: stripeAccountId,
          status: 'processing',
          retry_count: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create payout record: ${error.message}`);
      }

      return payoutRecord;
    } catch (error) {
      console.error('Error creating payout record:', error);
      throw error;
    }
  }

  private async updatePayoutRecord(
    payoutId: string,
    updates: Partial<PayoutRecord>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_creator_payouts')
        .update(updates)
        .eq('id', payoutId);

      if (error) {
        throw new Error(`Failed to update payout record: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating payout record:', error);
      throw error;
    }
  }

  private async logPayoutEvent(
    creatorId: string,
    payoutId: string,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('marketplace_payout_events')
        .insert({
          creator_id: creatorId,
          payout_id: payoutId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to log payout event:', error);
      }
    } catch (error) {
      console.error('Error logging payout event:', error);
    }
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Stripe.errors.StripeError) {
      // Retry for temporary errors
      return ['rate_limit', 'api_connection_error', 'api_error'].includes(
        error.type,
      );
    }
    return false;
  }

  private calculateNextRetry(retryCount: number): string | null {
    if (retryCount >= PayoutProcessingService.MAX_RETRY_ATTEMPTS) {
      return null;
    }

    const delayMinutes =
      PayoutProcessingService.RETRY_DELAY_MINUTES[retryCount] || 1440;
    const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);
    return nextRetry.toISOString();
  }

  private shouldRetryPayout(payout: any): boolean {
    if (!payout.failure_reason) return false;
    if (payout.retry_count >= PayoutProcessingService.MAX_RETRY_ATTEMPTS)
      return false;

    // Check if enough time has passed since last attempt
    const lastAttempt = new Date(payout.processed_at || payout.created_at);
    const now = new Date();
    const hoursElapsed =
      (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);
    const requiredHours =
      PayoutProcessingService.RETRY_DELAY_MINUTES[payout.retry_count] / 60 ||
      24;

    return hoursElapsed >= requiredHours;
  }

  private async reconstructPayoutSummary(payout: any): Promise<PayoutSummary> {
    return {
      creator_id: payout.creator_id,
      period_start: payout.payout_period_start,
      period_end: payout.payout_period_end,
      total_sales: 1, // Simplified for retry
      total_commission_earned_cents: payout.gross_earnings_cents,
      total_platform_fee_cents: payout.platform_fees_cents,
      net_payout_amount_cents: payout.net_payout_cents,
      transaction_count: 1, // Simplified for retry
      current_tier: 'base', // Will be updated during processing
      minimum_payout_threshold_cents:
        PayoutProcessingService.MINIMUM_PAYOUT_THRESHOLD_CENTS,
    };
  }
}

// =====================================================================================
// SINGLETON INSTANCE EXPORT
// =====================================================================================

export const payoutProcessingService = new PayoutProcessingService();
