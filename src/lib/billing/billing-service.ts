// WS-131: Advanced Billing Service
// Core billing operations with Stripe integration

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { Database } from '@/types/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripe_product_id: string;
  stripe_price_id: string;
  price_cents: number;
  currency: string;
  interval: 'month' | 'year';
  features: Record<string, any>;
  limits: Record<string, number>;
  metadata: Record<string, any>;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  organization_id: string;
  plan_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
  plan?: SubscriptionPlan;
}

export class BillingService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies });
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data: plans, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch subscription plans: ${error.message}`);
    }

    return plans || [];
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data: subscription, error } = await this.supabase
      .from('user_subscriptions')
      .select(
        `
        *,
        plan:subscription_plans(*)
      `,
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user subscription: ${error.message}`);
    }

    return subscription;
  }

  async createCheckoutSession({
    priceId,
    userId,
    organizationId,
    successUrl,
    cancelUrl,
    couponCode,
  }: {
    priceId: string;
    userId: string;
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
    couponCode?: string;
  }) {
    try {
      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(userId);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          organization_id: organizationId,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            organization_id: organizationId,
          },
        },
      };

      // Apply coupon if provided
      if (couponCode) {
        const { data: coupon } = await this.supabase
          .from('coupons')
          .select('stripe_coupon_id')
          .eq('code', couponCode)
          .eq('is_active', true)
          .single();

        if (coupon?.stripe_coupon_id) {
          sessionParams.discounts = [{ coupon: coupon.stripe_coupon_id }];
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return { url: session.url };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async getOrCreateStripeCustomer(userId: string) {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user.user || user.user.id !== userId) {
      throw new Error('Unauthorized');
    }

    // Check if customer already exists
    const customers = await stripe.customers.list({
      email: user.user.email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    return await stripe.customers.create({
      email: user.user.email!,
      metadata: {
        user_id: userId,
      },
    });
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    try {
      // Get subscription from database
      const { data: dbSubscription } = await this.supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('id', subscriptionId)
        .single();

      if (!dbSubscription?.stripe_subscription_id) {
        throw new Error('Subscription not found');
      }

      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.update(
        dbSubscription.stripe_subscription_id,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
        },
      );

      // Update database
      const { error } = await this.supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          cancel_at: cancelAtPeriodEnd
            ? new Date(
                stripeSubscription.current_period_end * 1000,
              ).toISOString()
            : null,
          canceled_at: cancelAtPeriodEnd ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async updatePaymentMethod(subscriptionId: string, paymentMethodId: string) {
    try {
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('id', subscriptionId)
        .single();

      if (!subscription?.stripe_customer_id) {
        throw new Error('Subscription not found');
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: subscription.stripe_customer_id,
      });

      // Set as default payment method
      await stripe.customers.update(subscription.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw new Error('Failed to update payment method');
    }
  }

  async getPaymentHistory(userId: string, limit = 10) {
    const { data: payments, error } = await this.supabase
      .from('payment_records')
      .select(
        `
        *,
        subscription:user_subscriptions(
          plan:subscription_plans(name)
        )
      `,
      )
      .eq('subscription.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    return payments || [];
  }

  async createCustomerPortalSession(userId: string, returnUrl: string) {
    try {
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (!subscription?.stripe_customer_id) {
        throw new Error('No subscription found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new Error('Failed to create customer portal session');
    }
  }
}
