// WS-131: Subscription Manager with Proration
// Handles subscription upgrades, downgrades, and billing transitions

import Stripe from 'stripe';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface UpgradePreview {
  immediate_charge: number;
  currency: string;
  next_payment_amount: number;
  proration_credit: number;
  effective_date: string;
  new_plan: {
    name: string;
    price_cents: number;
    interval: string;
  };
}

export interface SubscriptionChange {
  success: boolean;
  subscription?: any;
  proration_amount?: number;
  error?: string;
}

export class SubscriptionManager {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies });
  }

  async upgradeSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior: 'create_prorations' | 'none' = 'create_prorations',
  ): Promise<SubscriptionChange> {
    try {
      // Get current subscription from database
      const { data: dbSubscription } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (!dbSubscription) {
        return { success: false, error: 'Subscription not found' };
      }

      // Get new plan details
      const { data: newPlan } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', newPriceId)
        .single();

      if (!newPlan) {
        return { success: false, error: 'New plan not found' };
      }

      // Get Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        dbSubscription.stripe_subscription_id,
      );

      // Update the subscription in Stripe
      const updatedSubscription = await stripe.subscriptions.update(
        dbSubscription.stripe_subscription_id,
        {
          items: [
            {
              id: stripeSubscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: prorationBehavior,
          metadata: {
            ...stripeSubscription.metadata,
            upgraded_at: new Date().toISOString(),
            previous_plan: dbSubscription.plan_id,
          },
        },
      );

      // Update database record
      const { error: updateError } = await this.supabase
        .from('user_subscriptions')
        .update({
          plan_id: newPlan.id,
          current_period_start: new Date(
            updatedSubscription.current_period_start * 1000,
          ).toISOString(),
          current_period_end: new Date(
            updatedSubscription.current_period_end * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...dbSubscription.metadata,
            upgrade_history: [
              ...(dbSubscription.metadata?.upgrade_history || []),
              {
                from_plan: dbSubscription.plan_id,
                to_plan: newPlan.id,
                upgraded_at: new Date().toISOString(),
                proration_behavior: prorationBehavior,
              },
            ],
          },
        })
        .eq('id', subscriptionId);

      if (updateError) {
        console.error('Database update error:', updateError);
        // Stripe was updated but DB failed - this needs manual intervention
        throw new Error(
          `Failed to update subscription in database: ${updateError.message}`,
        );
      }

      // Calculate proration amount from the latest invoice
      const prorationAmount =
        await this.calculateProrationAmount(updatedSubscription);

      return {
        success: true,
        subscription: updatedSubscription,
        proration_amount: prorationAmount,
      };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upgrade subscription',
      };
    }
  }

  async downgradeSubscription(
    subscriptionId: string,
    newPriceId: string,
    applyAtPeriodEnd = true,
  ): Promise<SubscriptionChange> {
    try {
      const { data: dbSubscription } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (!dbSubscription) {
        return { success: false, error: 'Subscription not found' };
      }

      const { data: newPlan } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', newPriceId)
        .single();

      if (!newPlan) {
        return { success: false, error: 'New plan not found' };
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        dbSubscription.stripe_subscription_id,
      );

      if (applyAtPeriodEnd) {
        // Schedule the downgrade for the end of the current period
        const subscriptionSchedule = await stripe.subscriptionSchedules.create({
          from_subscription: dbSubscription.stripe_subscription_id,
          phases: [
            // Current phase continues until period end
            {
              start_date: stripeSubscription.current_period_start,
              end_date: stripeSubscription.current_period_end,
              items: stripeSubscription.items.data.map((item) => ({
                price: item.price.id,
                quantity: item.quantity || 1,
              })),
            },
            // New phase starts after period end
            {
              start_date: stripeSubscription.current_period_end,
              items: [
                {
                  price: newPriceId,
                  quantity: 1,
                },
              ],
            },
          ],
        });

        // Update database to reflect pending change
        const { error: updateError } = await this.supabase
          .from('user_subscriptions')
          .update({
            metadata: {
              ...dbSubscription.metadata,
              pending_downgrade: {
                plan_id: newPlan.id,
                effective_date: new Date(
                  stripeSubscription.current_period_end * 1000,
                ).toISOString(),
                schedule_id: subscriptionSchedule.id,
              },
              downgrade_history: [
                ...(dbSubscription.metadata?.downgrade_history || []),
                {
                  from_plan: dbSubscription.plan_id,
                  to_plan: newPlan.id,
                  scheduled_at: new Date().toISOString(),
                  effective_date: new Date(
                    stripeSubscription.current_period_end * 1000,
                  ).toISOString(),
                },
              ],
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId);

        if (updateError) {
          throw new Error(
            `Failed to update subscription metadata: ${updateError.message}`,
          );
        }

        return { success: true };
      } else {
        // Apply immediately with proration
        return await this.upgradeSubscription(
          subscriptionId,
          newPriceId,
          'create_prorations',
        );
      }
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to downgrade subscription',
      };
    }
  }

  async getUpgradePreview(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<UpgradePreview | null> {
    try {
      const { data: dbSubscription } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (!dbSubscription) {
        throw new Error('Subscription not found');
      }

      const { data: newPlan } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', newPriceId)
        .single();

      if (!newPlan) {
        throw new Error('New plan not found');
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        dbSubscription.stripe_subscription_id,
      );

      // Create a preview of the upcoming invoice
      const invoice = await stripe.invoices.retrieveUpcoming({
        subscription: dbSubscription.stripe_subscription_id,
        subscription_items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        subscription_proration_behavior: 'create_prorations',
      });

      // Calculate proration credit (negative line items)
      const prorationCredit = invoice.lines.data
        .filter((line) => line.amount < 0)
        .reduce((sum, line) => sum + Math.abs(line.amount), 0);

      // Get the new plan's regular price (not prorated)
      const newPlanLineItem = invoice.lines.data.find(
        (line) => line.price?.id === newPriceId && line.amount > 0,
      );

      return {
        immediate_charge: invoice.amount_due,
        currency: invoice.currency,
        next_payment_amount: newPlanLineItem?.amount || newPlan.price_cents,
        proration_credit: prorationCredit,
        effective_date: new Date().toISOString(),
        new_plan: {
          name: newPlan.name,
          price_cents: newPlan.price_cents,
          interval: newPlan.interval,
        },
      };
    } catch (error) {
      console.error('Error getting upgrade preview:', error);
      return null;
    }
  }

  async getDowngradePreview(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<UpgradePreview | null> {
    try {
      const { data: dbSubscription } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (!dbSubscription) {
        throw new Error('Subscription not found');
      }

      const { data: newPlan } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', newPriceId)
        .single();

      if (!newPlan) {
        throw new Error('New plan not found');
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        dbSubscription.stripe_subscription_id,
      );

      // For downgrades, we typically apply at period end, so no immediate charge
      return {
        immediate_charge: 0,
        currency: 'usd',
        next_payment_amount: newPlan.price_cents,
        proration_credit: 0,
        effective_date: new Date(
          stripeSubscription.current_period_end * 1000,
        ).toISOString(),
        new_plan: {
          name: newPlan.name,
          price_cents: newPlan.price_cents,
          interval: newPlan.interval,
        },
      };
    } catch (error) {
      console.error('Error getting downgrade preview:', error);
      return null;
    }
  }

  private async calculateProrationAmount(
    subscription: Stripe.Subscription,
  ): Promise<number> {
    try {
      // Get the latest invoice for this subscription
      const invoices = await stripe.invoices.list({
        subscription: subscription.id,
        limit: 1,
      });

      if (!invoices.data.length) return 0;

      const latestInvoice = invoices.data[0];

      // Sum all proration line items (positive values are charges, negative are credits)
      const prorationItems = latestInvoice.lines.data.filter(
        (item) => item.proration === true,
      );

      return prorationItems.reduce(
        (total, item) => total + (item.amount || 0),
        0,
      );
    } catch (error) {
      console.error('Error calculating proration amount:', error);
      return 0;
    }
  }

  async cancelPendingChanges(
    subscriptionId: string,
  ): Promise<SubscriptionChange> {
    try {
      const { data: dbSubscription } = await this.supabase
        .from('user_subscriptions')
        .select('metadata')
        .eq('id', subscriptionId)
        .single();

      if (!dbSubscription?.metadata?.pending_downgrade) {
        return { success: false, error: 'No pending changes found' };
      }

      const scheduleId = dbSubscription.metadata.pending_downgrade.schedule_id;

      if (scheduleId) {
        // Cancel the subscription schedule
        await stripe.subscriptionSchedules.cancel(scheduleId);
      }

      // Remove pending downgrade from metadata
      const updatedMetadata = { ...dbSubscription.metadata };
      delete updatedMetadata.pending_downgrade;

      const { error: updateError } = await this.supabase
        .from('user_subscriptions')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (updateError) {
        throw new Error(
          `Failed to update subscription: ${updateError.message}`,
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling pending changes:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to cancel pending changes',
      };
    }
  }

  async getSubscriptionHistory(subscriptionId: string) {
    try {
      const { data: subscription } = await this.supabase
        .from('user_subscriptions')
        .select(
          `
          metadata,
          created_at,
          updated_at,
          plan:subscription_plans(name)
        `,
        )
        .eq('id', subscriptionId)
        .single();

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const history = [];

      // Add creation event
      history.push({
        event: 'created',
        date: subscription.created_at,
        plan_name: subscription.plan?.name,
        description: 'Subscription created',
      });

      // Add upgrade history
      if (subscription.metadata?.upgrade_history) {
        for (const upgrade of subscription.metadata.upgrade_history) {
          history.push({
            event: 'upgraded',
            date: upgrade.upgraded_at,
            description: `Upgraded from ${upgrade.from_plan} to ${upgrade.to_plan}`,
            proration_behavior: upgrade.proration_behavior,
          });
        }
      }

      // Add downgrade history
      if (subscription.metadata?.downgrade_history) {
        for (const downgrade of subscription.metadata.downgrade_history) {
          history.push({
            event: 'downgrade_scheduled',
            date: downgrade.scheduled_at,
            effective_date: downgrade.effective_date,
            description: `Downgrade scheduled from ${downgrade.from_plan} to ${downgrade.to_plan}`,
          });
        }
      }

      // Sort by date
      history.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return history;
    } catch (error) {
      console.error('Error getting subscription history:', error);
      throw error;
    }
  }
}
