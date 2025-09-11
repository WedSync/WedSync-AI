import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  stripe_price_id: string;
  price: number;
  currency: string;
  billing_interval: 'month' | 'year';
  trial_days: number;
  limits: {
    clients: number;
    vendors: number;
    journeys: number;
    storage_gb: number;
    team_members: number;
    api_requests: number;
    email_sends: number;
    sms_sends: number;
  };
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_id: string;
  status:
    | 'active'
    | 'canceled'
    | 'past_due'
    | 'unpaid'
    | 'trialing'
    | 'incomplete'
    | 'paused';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  pause_collection: any | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UsageMetrics {
  id: string;
  user_id: string;
  subscription_id: string | null;
  clients_count: number;
  vendors_count: number;
  journeys_count: number;
  storage_used_gb: number;
  team_members_count: number;
  api_requests_count: number;
  monthly_api_requests: number;
  email_sends_count: number;
  sms_sends_count: number;
  last_reset_at: string;
  last_updated: string;
  created_at: string;
}

export interface CreateSubscriptionParams {
  userId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  couponId?: string;
}

export interface UpdateSubscriptionParams {
  priceId?: string;
  paymentMethodId?: string;
  couponId?: string;
  cancelAtPeriodEnd?: boolean;
  pauseCollection?: any;
  metadata?: Record<string, any>;
}

export interface UsageLimitCheck {
  withinLimits: boolean;
  violations: Array<{
    metric: string;
    current: number;
    limit: number;
    percentage: number;
  }>;
  plan: SubscriptionPlan | null;
}

export class SubscriptionService {
  constructor(
    private supabase: SupabaseClient,
    private stripe: Stripe,
  ) {}

  /**
   * Get all active subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch subscription plans: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get subscription plan by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch subscription plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Get subscription plan by name
   */
  async getPlanByName(planName: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch subscription plan: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<{
    subscription: Stripe.Subscription;
    clientSecret?: string;
  }> {
    try {
      const { userId, priceId, paymentMethodId, trialPeriodDays, couponId } =
        params;

      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(userId);

      // Prepare subscription creation parameters
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: priceId }],
        metadata: {
          user_id: userId,
        },
        expand: ['latest_invoice.payment_intent'],
      };

      // Add trial period if specified
      if (trialPeriodDays && trialPeriodDays > 0) {
        subscriptionParams.trial_period_days = trialPeriodDays;
      }

      // Add coupon if specified
      if (couponId) {
        subscriptionParams.discounts = [{ coupon: couponId }];
      }

      // Handle payment method
      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
        subscriptionParams.payment_behavior = 'default_incomplete';
        subscriptionParams.payment_settings = {
          save_default_payment_method: 'on_subscription',
        };
      } else {
        // Collect payment method during subscription creation
        subscriptionParams.payment_behavior = 'default_incomplete';
        subscriptionParams.payment_settings = {
          save_default_payment_method: 'on_subscription',
        };
      }

      // Create subscription in Stripe
      const subscription =
        await this.stripe.subscriptions.create(subscriptionParams);

      // Save subscription to database
      await this.saveSubscriptionToDatabase(subscription);

      // Get client secret for frontend payment completion
      let clientSecret: string | undefined;
      if (
        subscription.latest_invoice &&
        typeof subscription.latest_invoice === 'object'
      ) {
        const invoice = subscription.latest_invoice as Stripe.Invoice;
        // Handle payment_intent which can be string ID or expanded object
        const paymentIntentId =
          typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent?.id;

        if (paymentIntentId && typeof invoice.payment_intent === 'object') {
          const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          clientSecret = paymentIntent.client_secret || undefined;
        }
      }

      // Log subscription creation event
      await this.logSubscriptionEvent(
        userId,
        subscription.id,
        'subscription.created',
        {
          plan_id: priceId,
          trial_days: trialPeriodDays,
        },
      );

      return {
        subscription,
        clientSecret,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: UpdateSubscriptionParams,
  ): Promise<Stripe.Subscription> {
    try {
      const {
        priceId,
        paymentMethodId,
        couponId,
        cancelAtPeriodEnd,
        pauseCollection,
        metadata,
      } = params;

      const updateParams: Stripe.SubscriptionUpdateParams = {};

      // Update price/plan
      if (priceId) {
        const subscription =
          await this.stripe.subscriptions.retrieve(subscriptionId);
        updateParams.items = [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ];
        updateParams.proration_behavior = 'create_prorations';
      }

      // Update payment method
      if (paymentMethodId) {
        updateParams.default_payment_method = paymentMethodId;
      }

      // Add coupon
      if (couponId) {
        updateParams.discounts = [{ coupon: couponId }];
      }

      // Cancel at period end
      if (cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = cancelAtPeriodEnd;
      }

      // Pause collection
      if (pauseCollection !== undefined) {
        updateParams.pause_collection = pauseCollection;
      }

      // Update metadata
      if (metadata) {
        updateParams.metadata = metadata;
      }

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        updateParams,
      );

      // Update subscription in database
      await this.updateSubscriptionInDatabase(updatedSubscription);

      // Log subscription update event
      const userId = await this.getUserIdFromSubscription(subscriptionId);
      if (userId) {
        await this.logSubscriptionEvent(
          userId,
          subscriptionId,
          'subscription.updated',
          params,
        );
      }

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    try {
      let canceledSubscription: Stripe.Subscription;

      if (cancelAtPeriodEnd) {
        // Cancel at the end of the current period
        canceledSubscription = await this.stripe.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end: true,
          },
        );
      } else {
        // Cancel immediately
        canceledSubscription =
          await this.stripe.subscriptions.cancel(subscriptionId);
      }

      // Update subscription in database
      await this.updateSubscriptionInDatabase(canceledSubscription);

      // Log cancellation event
      const userId = await this.getUserIdFromSubscription(subscriptionId);
      if (userId) {
        await this.logSubscriptionEvent(
          userId,
          subscriptionId,
          'subscription.canceled',
          {
            cancel_at_period_end: cancelAtPeriodEnd,
          },
        );
      }

      return canceledSubscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscription(
    stripeSubscriptionId: string,
  ): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user's usage metrics
   */
  async getUserUsage(userId: string): Promise<UsageMetrics | null> {
    const { data, error } = await this.supabase
      .from('usage_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch usage metrics: ${error.message}`);
    }

    return data;
  }

  /**
   * Track usage for a specific metric
   */
  async trackUsage(
    userId: string,
    metric: keyof Pick<
      UsageMetrics,
      | 'clients_count'
      | 'vendors_count'
      | 'journeys_count'
      | 'team_members_count'
      | 'api_requests_count'
      | 'email_sends_count'
      | 'sms_sends_count'
    >,
    increment: number = 1,
  ): Promise<void> {
    try {
      // Map metric names to database function parameter names
      const metricMap: Record<string, string> = {
        clients_count: 'clients',
        vendors_count: 'vendors',
        journeys_count: 'journeys',
        team_members_count: 'team_members',
        api_requests_count: 'api_requests',
        email_sends_count: 'email_sends',
        sms_sends_count: 'sms_sends',
      };

      const dbMetricName = metricMap[metric];
      if (!dbMetricName) {
        throw new Error(`Invalid metric: ${metric}`);
      }

      // Call the database function to track usage
      const { error } = await this.supabase.rpc('track_usage_metric', {
        p_user_id: userId,
        p_metric_name: dbMetricName,
        p_increment: increment,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  }

  /**
   * Track storage usage (in MB)
   */
  async trackStorageUsage(userId: string, sizeInMB: number): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('track_usage_metric', {
        p_user_id: userId,
        p_metric_name: 'storage',
        p_increment: Math.round(sizeInMB), // Function converts MB to GB
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error tracking storage usage:', error);
      throw error;
    }
  }

  /**
   * Check if user's usage is within plan limits
   */
  async checkUsageLimits(userId: string): Promise<UsageLimitCheck> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const usage = await this.getUserUsage(userId);

      if (!subscription) {
        // User has no subscription - treat as free plan
        const freePlan = await this.getPlanByName('free');
        return this.compareUsageWithPlan(usage, freePlan);
      }

      const plan = await this.getPlan(subscription.plan_id);
      return this.compareUsageWithPlan(usage, plan);
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return {
        withinLimits: false,
        violations: [],
        plan: null,
      };
    }
  }

  /**
   * Compare usage with plan limits
   */
  private compareUsageWithPlan(
    usage: UsageMetrics | null,
    plan: SubscriptionPlan | null,
  ): UsageLimitCheck {
    if (!plan) {
      return {
        withinLimits: false,
        violations: [{ metric: 'plan', current: 0, limit: 0, percentage: 100 }],
        plan: null,
      };
    }

    if (!usage) {
      return {
        withinLimits: true,
        violations: [],
        plan,
      };
    }

    const violations: Array<{
      metric: string;
      current: number;
      limit: number;
      percentage: number;
    }> = [];

    // Check each limit (-1 means unlimited)
    const checks = [
      {
        metric: 'clients',
        current: usage.clients_count,
        limit: plan.limits.clients,
      },
      {
        metric: 'vendors',
        current: usage.vendors_count,
        limit: plan.limits.vendors,
      },
      {
        metric: 'journeys',
        current: usage.journeys_count,
        limit: plan.limits.journeys,
      },
      {
        metric: 'storage_gb',
        current: usage.storage_used_gb,
        limit: plan.limits.storage_gb,
      },
      {
        metric: 'team_members',
        current: usage.team_members_count,
        limit: plan.limits.team_members,
      },
      {
        metric: 'monthly_api_requests',
        current: usage.monthly_api_requests,
        limit: plan.limits.api_requests,
      },
      {
        metric: 'email_sends',
        current: usage.email_sends_count,
        limit: plan.limits.email_sends,
      },
      {
        metric: 'sms_sends',
        current: usage.sms_sends_count,
        limit: plan.limits.sms_sends,
      },
    ];

    for (const check of checks) {
      if (check.limit !== -1 && check.current > check.limit) {
        violations.push({
          metric: check.metric,
          current: check.current,
          limit: check.limit,
          percentage: Math.round((check.current / check.limit) * 100),
        });
      }
    }

    return {
      withinLimits: violations.length === 0,
      violations,
      plan,
    };
  }

  /**
   * Get or create Stripe customer for user
   */
  private async getOrCreateStripeCustomer(
    userId: string,
  ): Promise<Stripe.Customer> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('stripe_customer_id, email, full_name')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error(
          `Failed to fetch user profile: ${profileError.message}`,
        );
      }

      // Return existing customer if found
      if (profile.stripe_customer_id) {
        const customer = await this.stripe.customers.retrieve(
          profile.stripe_customer_id,
        );
        if (!customer.deleted) {
          return customer as Stripe.Customer;
        }
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: {
          user_id: userId,
        },
      });

      // Update profile with customer ID
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

      if (updateError) {
        console.error(
          'Failed to update profile with customer ID:',
          updateError,
        );
      }

      return customer;
    } catch (error) {
      console.error('Error getting/creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Save subscription to database
   */
  private async saveSubscriptionToDatabase(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const userId = subscription.metadata.user_id;
      if (!userId) {
        throw new Error('User ID not found in subscription metadata');
      }

      const subscriptionData = {
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        plan_id:
          subscription.items.data[0].price.lookup_key ||
          subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: new Date(
          (subscription as any).current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          (subscription as any).current_period_end * 1000,
        ).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        trial_start: subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        metadata: subscription.metadata || {},
      };

      const { error } = await this.supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'stripe_subscription_id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving subscription to database:', error);
      throw error;
    }
  }

  /**
   * Update subscription in database
   */
  private async updateSubscriptionInDatabase(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    try {
      const updateData = {
        status: subscription.status,
        current_period_start: new Date(
          (subscription as any).current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          (subscription as any).current_period_end * 1000,
        ).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        trial_start: subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        metadata: subscription.metadata || {},
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating subscription in database:', error);
      throw error;
    }
  }

  /**
   * Get user ID from subscription
   */
  private async getUserIdFromSubscription(
    subscriptionId: string,
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (error) {
        return null;
      }

      return data?.user_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Log subscription event
   */
  private async logSubscriptionEvent(
    userId: string,
    subscriptionId: string,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('subscription_events').insert({
        user_id: userId,
        subscription_id: subscriptionId,
        event_type: eventType,
        event_data: eventData,
      });

      if (error) {
        console.error('Failed to log subscription event:', error);
      }
    } catch (error) {
      console.error('Error logging subscription event:', error);
    }
  }
}
