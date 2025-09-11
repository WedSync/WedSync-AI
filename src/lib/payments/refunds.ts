import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';

export interface RefundData {
  paymentId: string;
  paymentIntentId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface WedSyncRefund {
  id: string;
  user_id: string;
  payment_id?: string;
  stripe_refund_id?: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  reason?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DisputeData {
  chargeId: string;
  evidence: {
    uncategorized_text?: string;
    customer_signature?: string;
    receipt?: string;
    shipping_documentation?: string;
    customer_communication?: string;
  };
  metadata?: Record<string, string>;
}

/**
 * Create a refund for a payment
 */
export async function createRefund(
  refundData: RefundData,
  userId: string,
): Promise<WedSyncRefund> {
  const supabase = await createClient();

  try {
    // Get the original payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', refundData.paymentId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found or not accessible');
    }

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    // Validate refund amount
    if (refundData.amount <= 0 || refundData.amount > payment.amount) {
      throw new Error('Invalid refund amount');
    }

    // Check if there are already refunds for this payment
    const { data: existingRefunds } = await supabase
      .from('refunds')
      .select('amount')
      .eq('stripe_payment_intent_id', payment.stripe_payment_intent_id)
      .eq('status', 'succeeded');

    const totalRefunded =
      existingRefunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
    const availableForRefund = payment.amount - totalRefunded;

    if (refundData.amount > availableForRefund) {
      throw new Error(
        `Only $${availableForRefund.toFixed(2)} is available for refund`,
      );
    }

    // Create refund record in database first
    const { data: refundRecord, error: insertError } = await supabase
      .from('refunds')
      .insert([
        {
          user_id: userId,
          payment_id: refundData.paymentId,
          stripe_payment_intent_id: payment.stripe_payment_intent_id,
          amount: refundData.amount,
          currency: payment.currency,
          reason: refundData.reason,
          status: 'pending',
          metadata: refundData.metadata,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    try {
      // Create refund in Stripe
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: Math.round(refundData.amount * 100), // Convert to cents
        reason: (refundData.reason as any) || 'requested_by_customer',
        metadata: {
          user_id: userId,
          payment_id: refundData.paymentId,
          refund_id: refundRecord.id,
          ...refundData.metadata,
        },
      });

      // Update record with Stripe refund ID
      const { data: updatedRefund, error: updateError } = await supabase
        .from('refunds')
        .update({
          stripe_refund_id: stripeRefund.id,
          status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating refund record:', updateError);
        // Continue anyway - refund was created in Stripe
      }

      return updatedRefund || refundRecord;
    } catch (stripeError) {
      // Update database record with failure
      await supabase
        .from('refunds')
        .update({
          status: 'failed',
          failure_reason:
            stripeError instanceof Error
              ? stripeError.message
              : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundRecord.id);

      throw stripeError;
    }
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error('Failed to create refund');
  }
}

/**
 * Get refund by ID
 */
export async function getRefund(
  refundId: string,
  userId: string,
): Promise<WedSyncRefund | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', refundId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching refund:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting refund:', error);
    return null;
  }
}

/**
 * Get user's refunds
 */
export async function getUserRefunds(userId: string): Promise<WedSyncRefund[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user refunds:', error);
    return [];
  }
}

/**
 * Update refund status (called from webhook)
 */
export async function updateRefundStatus(
  stripeRefundId: string,
  status: string,
  failureReason?: string,
): Promise<void> {
  const supabase = await createClient();

  try {
    const updateData: any = {
      status: mapStripeRefundStatus(status),
      updated_at: new Date().toISOString(),
    };

    if (failureReason) {
      updateData.failure_reason = failureReason;
    }

    const { error } = await supabase
      .from('refunds')
      .update(updateData)
      .eq('stripe_refund_id', stripeRefundId);

    if (error) {
      console.error('Error updating refund status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating refund status:', error);
    throw error;
  }
}

/**
 * Cancel a pending refund
 */
export async function cancelRefund(
  refundId: string,
  userId: string,
): Promise<WedSyncRefund> {
  const supabase = await createClient();

  try {
    // Get refund record
    const { data: refund, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', refundId)
      .eq('user_id', userId)
      .single();

    if (error || !refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== 'pending') {
      throw new Error('Can only cancel pending refunds');
    }

    // Cancel in Stripe if it has a Stripe ID
    if (refund.stripe_refund_id) {
      try {
        await stripe.refunds.cancel(refund.stripe_refund_id);
      } catch (stripeError) {
        console.error('Error canceling refund in Stripe:', stripeError);
        // Continue with database update anyway
      }
    }

    // Update database
    const { data: updatedRefund, error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedRefund;
  } catch (error) {
    console.error('Error canceling refund:', error);
    throw new Error('Failed to cancel refund');
  }
}

/**
 * Handle dispute evidence submission
 */
export async function submitDisputeEvidence(
  disputeData: DisputeData,
  userId: string,
): Promise<void> {
  try {
    // Submit evidence to Stripe
    await stripe.disputes.update(disputeData.chargeId, {
      evidence: disputeData.evidence,
      metadata: {
        user_id: userId,
        submitted_via: 'wedsync_app',
        ...disputeData.metadata,
      },
    });

    // Log dispute activity
    const supabase = await createClient();
    await supabase.from('dispute_logs').insert([
      {
        user_id: userId,
        stripe_charge_id: disputeData.chargeId,
        action: 'evidence_submitted',
        evidence: disputeData.evidence,
        metadata: disputeData.metadata,
      },
    ]);
  } catch (error) {
    console.error('Error submitting dispute evidence:', error);
    throw new Error('Failed to submit dispute evidence');
  }
}

/**
 * Get dispute information
 */
export async function getDispute(chargeId: string): Promise<any> {
  try {
    const dispute = await stripe.disputes.retrieve(chargeId);
    return dispute;
  } catch (error) {
    console.error('Error getting dispute:', error);
    return null;
  }
}

/**
 * Map Stripe refund status to our status
 */
function mapStripeRefundStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    succeeded: 'succeeded',
    failed: 'failed',
    canceled: 'canceled',
    requires_action: 'pending',
  };

  return statusMap[stripeStatus] || 'pending';
}

/**
 * Get refund statistics
 */
export async function getRefundStatistics(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  averageRefundAmount: number;
  refundsByStatus: Record<string, number>;
}> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('refunds')
      .select('amount, status, created_at')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: refunds, error } = await query;

    if (error) {
      throw error;
    }

    const totalRefunds = refunds.length;
    const totalRefundAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
    const averageRefundAmount =
      totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0;

    // Get refunds by status
    const refundsByStatus: Record<string, number> = {};
    refunds.forEach((refund) => {
      refundsByStatus[refund.status] =
        (refundsByStatus[refund.status] || 0) + 1;
    });

    // Calculate refund rate (refunds vs total payments)
    let paymentsQuery = supabase
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (startDate) {
      paymentsQuery = paymentsQuery.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      paymentsQuery = paymentsQuery.lte('created_at', endDate.toISOString());
    }

    const { data: payments } = await paymentsQuery;
    const totalPayments = payments?.length || 0;
    const refundRate =
      totalPayments > 0 ? (totalRefunds / totalPayments) * 100 : 0;

    return {
      totalRefunds,
      totalRefundAmount,
      refundRate,
      averageRefundAmount,
      refundsByStatus,
    };
  } catch (error) {
    console.error('Error getting refund statistics:', error);
    return {
      totalRefunds: 0,
      totalRefundAmount: 0,
      refundRate: 0,
      averageRefundAmount: 0,
      refundsByStatus: {},
    };
  }
}

/**
 * Process automatic refunds (for business rules)
 */
export async function processAutomaticRefund(
  paymentIntentId: string,
  reason: string,
  percentage: number = 100,
): Promise<WedSyncRefund | null> {
  const supabase = await createClient();

  try {
    // Get payment from database
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (error || !payment) {
      console.error('Payment not found for automatic refund:', paymentIntentId);
      return null;
    }

    // Calculate refund amount
    const refundAmount =
      Math.round(((payment.amount * percentage) / 100) * 100) / 100;

    // Create refund
    return await createRefund(
      {
        paymentId: payment.id,
        paymentIntentId,
        amount: refundAmount,
        reason,
        metadata: {
          automatic_refund: 'true',
          percentage: percentage.toString(),
        },
      },
      payment.user_id,
    );
  } catch (error) {
    console.error('Error processing automatic refund:', error);
    return null;
  }
}
