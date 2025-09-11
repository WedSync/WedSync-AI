import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';

export interface PaymentStatus {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string;
  status: string;
  amount: number;
  currency: string;
  last_updated: string;
  metadata?: Record<string, any>;
}

export interface PaymentStatusUpdate {
  paymentIntentId: string;
  status: string;
  lastPaymentError?: string;
  metadata?: Record<string, any>;
}

/**
 * Track payment status in real-time
 */
export async function trackPaymentStatus(
  paymentIntentId: string,
  userId: string,
): Promise<PaymentStatus | null> {
  const supabase = await createClient();

  try {
    // Get latest status from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Update or create status record
    const statusData = {
      user_id: userId,
      stripe_payment_intent_id: paymentIntentId,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      last_updated: new Date().toISOString(),
      metadata: {
        stripe_status: paymentIntent.status,
        last_payment_error: paymentIntent.last_payment_error?.message,
        payment_method: paymentIntent.payment_method,
        client_secret: paymentIntent.client_secret,
      },
    };

    const { data, error } = await supabase
      .from('payment_status')
      .upsert([statusData], {
        onConflict: 'stripe_payment_intent_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating payment status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error tracking payment status:', error);
    return null;
  }
}

/**
 * Get payment status by Intent ID
 */
export async function getPaymentStatus(
  paymentIntentId: string,
): Promise<PaymentStatus | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('payment_status')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (error) {
      console.error('Error fetching payment status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting payment status:', error);
    return null;
  }
}

/**
 * Update payment status from webhook
 */
export async function updatePaymentStatusFromWebhook(
  update: PaymentStatusUpdate,
): Promise<void> {
  const supabase = await createClient();

  try {
    const updateData = {
      status: update.status,
      last_updated: new Date().toISOString(),
      metadata: {
        ...update.metadata,
        last_payment_error: update.lastPaymentError,
        updated_via: 'webhook',
      },
    };

    const { error } = await supabase
      .from('payment_status')
      .update(updateData)
      .eq('stripe_payment_intent_id', update.paymentIntentId);

    if (error) {
      console.error('Error updating payment status from webhook:', error);
      throw error;
    }

    // Also update the main payments table
    await supabase
      .from('payments')
      .update({
        status: mapStripeStatusToPaymentStatus(update.status),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', update.paymentIntentId);
  } catch (error) {
    console.error('Error updating payment status from webhook:', error);
    throw error;
  }
}

/**
 * Get user's payment statuses
 */
export async function getUserPaymentStatuses(
  userId: string,
): Promise<PaymentStatus[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('payment_status')
      .select('*')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user payment statuses:', error);
    return [];
  }
}

/**
 * Subscribe to payment status changes (for real-time updates)
 */
export function subscribeToPaymentStatus(
  paymentIntentId: string,
  callback: (status: PaymentStatus) => void,
) {
  const supabase = await createClient();

  const subscription = supabase
    .channel('payment_status_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payment_status',
        filter: `stripe_payment_intent_id=eq.${paymentIntentId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as PaymentStatus);
        }
      },
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Map Stripe payment intent status to our payment status
 */
export function mapStripeStatusToPaymentStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    requires_action: 'pending',
    processing: 'pending',
    requires_capture: 'pending',
    canceled: 'canceled',
    succeeded: 'completed',
  };

  return statusMap[stripeStatus] || 'pending';
}

/**
 * Check if payment needs action from user
 */
export function paymentNeedsAction(status: string): boolean {
  return [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
  ].includes(status);
}

/**
 * Check if payment is in final state
 */
export function paymentIsFinalized(status: string): boolean {
  return ['succeeded', 'canceled'].includes(status);
}

/**
 * Get payment status summary for user dashboard
 */
export async function getPaymentStatusSummary(userId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('payment_status')
      .select('status, amount, currency')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const summary = {
      total_payments: data.length,
      total_amount: 0,
      successful_payments: 0,
      pending_payments: 0,
      failed_payments: 0,
      by_status: {} as Record<string, number>,
    };

    data.forEach((payment) => {
      summary.total_amount += payment.amount;

      if (payment.status === 'succeeded') {
        summary.successful_payments++;
      } else if (
        [
          'requires_payment_method',
          'requires_confirmation',
          'requires_action',
          'processing',
        ].includes(payment.status)
      ) {
        summary.pending_payments++;
      } else if (payment.status === 'canceled') {
        summary.failed_payments++;
      }

      summary.by_status[payment.status] =
        (summary.by_status[payment.status] || 0) + 1;
    });

    return summary;
  } catch (error) {
    console.error('Error getting payment status summary:', error);
    return null;
  }
}

/**
 * Refresh payment status from Stripe (for manual sync)
 */
export async function refreshPaymentStatusFromStripe(
  paymentIntentId: string,
): Promise<PaymentStatus | null> {
  const supabase = await createClient();

  try {
    // Get current record to get user_id
    const { data: currentStatus } = await supabase
      .from('payment_status')
      .select('user_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (!currentStatus) {
      throw new Error('Payment status record not found');
    }

    // Fetch fresh data from Stripe and update
    return await trackPaymentStatus(paymentIntentId, currentStatus.user_id);
  } catch (error) {
    console.error('Error refreshing payment status:', error);
    return null;
  }
}
