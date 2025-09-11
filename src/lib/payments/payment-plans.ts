import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';
import { createPaymentIntent } from '@/lib/stripe/payment-intents';

export interface PaymentPlan {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  interval_type: 'monthly' | 'weekly' | 'bi_weekly';
  next_payment_date: string;
  status: 'active' | 'completed' | 'canceled' | 'paused';
  payments_completed: number;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentPlanData {
  userId: string;
  customerId: string;
  totalAmount: number;
  installments: number;
  intervalType: 'monthly' | 'weekly' | 'bi_weekly';
  startDate?: Date;
  description?: string;
  metadata?: Record<string, string>;
}

export interface InstallmentPayment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  stripe_payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
}

/**
 * Create a new payment plan
 */
export async function createPaymentPlan(
  planData: PaymentPlanData,
): Promise<PaymentPlan> {
  const supabase = await createClient();

  try {
    // Calculate installment amount
    const installmentAmount =
      Math.round((planData.totalAmount / planData.installments) * 100) / 100;

    // Calculate next payment date
    const startDate = planData.startDate || new Date();
    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 1); // Start tomorrow

    // Create payment plan record
    const { data: paymentPlan, error } = await supabase
      .from('payment_plans')
      .insert([
        {
          user_id: planData.userId,
          stripe_customer_id: planData.customerId,
          total_amount: planData.totalAmount,
          installments: planData.installments,
          installment_amount: installmentAmount,
          interval_type: planData.intervalType,
          next_payment_date: nextPaymentDate.toISOString(),
          status: 'active',
          payments_completed: 0,
          description: planData.description,
          metadata: planData.metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create installment schedule
    await createInstallmentSchedule(paymentPlan.id, planData);

    return paymentPlan;
  } catch (error) {
    console.error('Error creating payment plan:', error);
    throw new Error('Failed to create payment plan');
  }
}

/**
 * Create installment schedule for a payment plan
 */
async function createInstallmentSchedule(
  paymentPlanId: string,
  planData: PaymentPlanData,
): Promise<void> {
  const supabase = await createClient();

  try {
    const installments: Omit<InstallmentPayment, 'id' | 'created_at'>[] = [];
    const installmentAmount =
      Math.round((planData.totalAmount / planData.installments) * 100) / 100;
    const currentDate = planData.startDate || new Date();

    for (let i = 1; i <= planData.installments; i++) {
      // Calculate due date for this installment
      const dueDate = new Date(currentDate);

      switch (planData.intervalType) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + i * 7);
          break;
        case 'bi_weekly':
          dueDate.setDate(dueDate.getDate() + i * 14);
          break;
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + i);
          break;
      }

      // Handle final installment (adjust for rounding)
      let amount = installmentAmount;
      if (i === planData.installments) {
        const totalSoFar = installmentAmount * (planData.installments - 1);
        amount = planData.totalAmount - totalSoFar;
      }

      installments.push({
        payment_plan_id: paymentPlanId,
        installment_number: i,
        amount,
        due_date: dueDate.toISOString(),
        status: 'pending',
      });
    }

    const { error } = await supabase
      .from('installment_payments')
      .insert(installments);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error creating installment schedule:', error);
    throw error;
  }
}

/**
 * Process next installment payment
 */
export async function processNextInstallment(
  paymentPlanId: string,
): Promise<InstallmentPayment | null> {
  const supabase = await createClient();

  try {
    // Get payment plan
    const { data: paymentPlan, error: planError } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('id', paymentPlanId)
      .eq('status', 'active')
      .single();

    if (planError || !paymentPlan) {
      throw new Error('Payment plan not found or not active');
    }

    // Get next pending installment
    const { data: nextInstallment, error: installmentError } = await supabase
      .from('installment_payments')
      .select('*')
      .eq('payment_plan_id', paymentPlanId)
      .eq('status', 'pending')
      .order('installment_number', { ascending: true })
      .limit(1)
      .single();

    if (installmentError || !nextInstallment) {
      console.log('No pending installments found');
      return null;
    }

    // Check if payment is due
    const dueDate = new Date(nextInstallment.due_date);
    const now = new Date();

    if (dueDate > now) {
      console.log('Installment not yet due');
      return nextInstallment;
    }

    // Create payment intent for this installment
    const paymentIntent = await createPaymentIntent({
      amount: nextInstallment.amount,
      customerId: paymentPlan.stripe_customer_id,
      setupFutureUsage: 'off_session',
      description: `Installment ${nextInstallment.installment_number} of ${paymentPlan.installments}`,
      metadata: {
        payment_plan_id: paymentPlanId,
        installment_number: nextInstallment.installment_number.toString(),
        user_id: paymentPlan.user_id,
      },
    });

    // Update installment with payment intent
    const { data: updatedInstallment, error: updateError } = await supabase
      .from('installment_payments')
      .update({
        status: 'processing',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('id', nextInstallment.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedInstallment;
  } catch (error) {
    console.error('Error processing next installment:', error);
    return null;
  }
}

/**
 * Mark installment as paid (called from webhook)
 */
export async function markInstallmentAsPaid(
  paymentIntentId: string,
  paidAt: Date = new Date(),
): Promise<void> {
  const supabase = await createClient();

  try {
    // Update installment payment
    const { data: installment, error: installmentError } = await supabase
      .from('installment_payments')
      .update({
        status: 'completed',
        paid_at: paidAt.toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select('payment_plan_id, installment_number')
      .single();

    if (installmentError) {
      throw installmentError;
    }

    // Update payment plan progress
    const { data: paymentPlan, error: planError } = await supabase
      .from('payment_plans')
      .select('payments_completed, installments')
      .eq('id', installment.payment_plan_id)
      .single();

    if (planError) {
      throw planError;
    }

    const newPaymentsCompleted = paymentPlan.payments_completed + 1;
    const isCompleted = newPaymentsCompleted >= paymentPlan.installments;

    await supabase
      .from('payment_plans')
      .update({
        payments_completed: newPaymentsCompleted,
        status: isCompleted ? 'completed' : 'active',
        next_payment_date: isCompleted
          ? null
          : await getNextPaymentDate(installment.payment_plan_id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', installment.payment_plan_id);
  } catch (error) {
    console.error('Error marking installment as paid:', error);
    throw error;
  }
}

/**
 * Get next payment date for a payment plan
 */
async function getNextPaymentDate(
  paymentPlanId: string,
): Promise<string | null> {
  const supabase = await createClient();

  try {
    const { data: nextInstallment } = await supabase
      .from('installment_payments')
      .select('due_date')
      .eq('payment_plan_id', paymentPlanId)
      .eq('status', 'pending')
      .order('installment_number', { ascending: true })
      .limit(1)
      .single();

    return nextInstallment?.due_date || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get payment plan by ID
 */
export async function getPaymentPlan(
  paymentPlanId: string,
): Promise<PaymentPlan | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('id', paymentPlanId)
      .single();

    if (error) {
      console.error('Error fetching payment plan:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting payment plan:', error);
    return null;
  }
}

/**
 * Get user's payment plans
 */
export async function getUserPaymentPlans(
  userId: string,
): Promise<PaymentPlan[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user payment plans:', error);
    return [];
  }
}

/**
 * Get installments for a payment plan
 */
export async function getPaymentPlanInstallments(
  paymentPlanId: string,
): Promise<InstallmentPayment[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('installment_payments')
      .select('*')
      .eq('payment_plan_id', paymentPlanId)
      .order('installment_number', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching installments:', error);
    return [];
  }
}

/**
 * Cancel payment plan
 */
export async function cancelPaymentPlan(
  paymentPlanId: string,
): Promise<PaymentPlan> {
  const supabase = await createClient();

  try {
    // Cancel any pending installments
    await supabase
      .from('installment_payments')
      .update({ status: 'skipped' })
      .eq('payment_plan_id', paymentPlanId)
      .eq('status', 'pending');

    // Update payment plan status
    const { data: paymentPlan, error } = await supabase
      .from('payment_plans')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentPlanId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return paymentPlan;
  } catch (error) {
    console.error('Error canceling payment plan:', error);
    throw new Error('Failed to cancel payment plan');
  }
}

/**
 * Pause payment plan
 */
export async function pausePaymentPlan(
  paymentPlanId: string,
): Promise<PaymentPlan> {
  const supabase = await createClient();

  try {
    const { data: paymentPlan, error } = await supabase
      .from('payment_plans')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentPlanId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return paymentPlan;
  } catch (error) {
    console.error('Error pausing payment plan:', error);
    throw new Error('Failed to pause payment plan');
  }
}

/**
 * Resume payment plan
 */
export async function resumePaymentPlan(
  paymentPlanId: string,
): Promise<PaymentPlan> {
  const supabase = await createClient();

  try {
    const { data: paymentPlan, error } = await supabase
      .from('payment_plans')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentPlanId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return paymentPlan;
  } catch (error) {
    console.error('Error resuming payment plan:', error);
    throw new Error('Failed to resume payment plan');
  }
}
