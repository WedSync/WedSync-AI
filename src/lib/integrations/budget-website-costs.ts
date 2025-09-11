// Team E Integration: Website Plan Cost Integration
// WS-059 Budget Tracker - Round 3 Final Integration

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import type { Database } from '@/types/database';

interface WebsitePlanUpdate {
  weddingId: string;
  websiteId: string;
  planDetails: {
    currentPlan: WebsitePlan;
    previousPlan?: WebsitePlan;
    billingCycle: 'monthly' | 'annual';
    startDate: Date;
    nextBillingDate: Date;
    customDomain?: {
      domain: string;
      annualCost: number;
      renewalDate: Date;
    };
  };
  features: {
    guestLimit: number;
    storageGB: number;
    customPages: number;
    rsvpManagement: boolean;
    giftRegistry: boolean;
    photoGallery: boolean;
    livestreaming: boolean;
    analytics: boolean;
  };
  usage: {
    currentGuests: number;
    storageUsed: number;
    pageViews: number;
    uniqueVisitors: number;
    bandwidthGB: number;
  };
  addOns: WebsiteAddOn[];
  timestamp: Date;
}

interface WebsitePlan {
  id: string;
  name: 'free' | 'starter' | 'professional' | 'premium' | 'enterprise';
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

interface WebsiteAddOn {
  id: string;
  name: string;
  type: 'one-time' | 'recurring';
  price: number;
  billingCycle?: 'monthly' | 'annual';
  description: string;
}

interface WebsiteBudgetImpact {
  category: string;
  subcategory: string;
  previousAmount: number;
  newAmount: number;
  billingType: 'subscription' | 'one-time' | 'usage-based';
  billingCycle?: 'monthly' | 'annual';
  nextBillingDate?: Date;
  breakdown: {
    basePlan: number;
    addOns: number;
    customDomain: number;
    overages: number;
    taxes: number;
  };
  projectedAnnualCost: number;
}

export class BudgetWebsiteCostIntegration extends EventEmitter {
  private supabase: ReturnType<typeof createClient<Database>>;
  private websocketConnections: Map<string, WebSocket> = new Map();

  private readonly WEBSITE_PLANS: Record<string, WebsitePlan> = {
    free: {
      id: 'free',
      name: 'free',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        'Basic website',
        '50 guests',
        '100MB storage',
        '1 custom page',
      ],
    },
    starter: {
      id: 'starter',
      name: 'starter',
      monthlyPrice: 15,
      annualPrice: 144, // 20% discount
      features: [
        'Custom design',
        '150 guests',
        '1GB storage',
        '5 custom pages',
        'RSVP management',
      ],
    },
    professional: {
      id: 'professional',
      name: 'professional',
      monthlyPrice: 35,
      annualPrice: 336, // 20% discount
      features: [
        'Premium designs',
        '300 guests',
        '5GB storage',
        '10 custom pages',
        'RSVP + Gift registry',
        'Photo gallery',
      ],
    },
    premium: {
      id: 'premium',
      name: 'premium',
      monthlyPrice: 65,
      annualPrice: 624, // 20% discount
      features: [
        'All designs',
        '500 guests',
        '10GB storage',
        'Unlimited pages',
        'All features',
        'Livestreaming',
        'Analytics',
      ],
    },
    enterprise: {
      id: 'enterprise',
      name: 'enterprise',
      monthlyPrice: 125,
      annualPrice: 1200, // 20% discount
      features: [
        'White label',
        'Unlimited guests',
        '50GB storage',
        'All features',
        'Priority support',
        'Custom integrations',
      ],
    },
  };

  private readonly COMMON_ADDONS: WebsiteAddOn[] = [
    {
      id: 'extra-storage',
      name: 'Extra Storage (5GB)',
      type: 'recurring',
      price: 10,
      billingCycle: 'monthly',
      description: 'Additional 5GB storage for photos and videos',
    },
    {
      id: 'premium-templates',
      name: 'Premium Template Pack',
      type: 'one-time',
      price: 49,
      description: 'Access to exclusive premium wedding templates',
    },
    {
      id: 'custom-design',
      name: 'Custom Design Service',
      type: 'one-time',
      price: 299,
      description: 'Professional designer creates custom website theme',
    },
    {
      id: 'seo-package',
      name: 'SEO Optimization',
      type: 'recurring',
      price: 25,
      billingCycle: 'monthly',
      description: 'Advanced SEO tools and optimization',
    },
    {
      id: 'email-marketing',
      name: 'Email Marketing Suite',
      type: 'recurring',
      price: 20,
      billingCycle: 'monthly',
      description: 'Send beautiful email invitations and updates',
    },
  ];

  private readonly OVERAGE_RATES = {
    storage: 2, // $ per GB over limit
    bandwidth: 0.15, // $ per GB
    guests: 0.1, // $ per guest over limit
    pageViews: 0.001, // $ per 1000 page views over limit
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.initializeRealtimeSubscription();
  }

  private initializeRealtimeSubscription() {
    // Subscribe to website plan changes from Team E
    const planChannel = this.supabase
      .channel('website-plan-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_websites',
        },
        async (payload) => {
          await this.handleWebsitePlanChange(payload);
        },
      )
      .subscribe();

    // Subscribe to website usage updates
    const usageChannel = this.supabase
      .channel('website-usage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'website_usage_metrics',
        },
        async (payload) => {
          await this.handleUsageUpdate(payload);
        },
      )
      .subscribe();
  }

  async processWebsiteCostUpdate(
    update: WebsitePlanUpdate,
  ): Promise<WebsiteBudgetImpact[]> {
    const impacts: WebsiteBudgetImpact[] = [];

    try {
      // Calculate base plan cost impact
      const planImpact = await this.calculatePlanCostImpact(update);
      impacts.push(planImpact);

      // Calculate add-on costs
      if (update.addOns.length > 0) {
        const addOnImpact = await this.calculateAddOnImpact(update);
        impacts.push(addOnImpact);
      }

      // Calculate custom domain costs
      if (update.planDetails.customDomain) {
        const domainImpact = await this.calculateDomainImpact(update);
        impacts.push(domainImpact);
      }

      // Calculate overage charges based on usage
      const overageImpact = await this.calculateOverageCharges(update);
      if (overageImpact.newAmount > 0) {
        impacts.push(overageImpact);
      }

      // Project costs for the wedding timeline
      const projectedImpact = await this.projectWebsiteCosts(update);
      impacts.push(projectedImpact);

      // Persist all impacts
      await this.persistWebsiteImpacts(update.weddingId, impacts);

      // Schedule billing reminders
      await this.scheduleBillingReminders(update);

      // Broadcast updates
      await this.broadcastWebsiteCostUpdate(update.weddingId, impacts);

      // Emit event for other systems
      this.emit('websiteCostUpdated', {
        weddingId: update.weddingId,
        source: 'website-cost-integration',
        impacts,
        websiteId: update.websiteId,
        plan: update.planDetails.currentPlan.name,
        timestamp: new Date(),
      });

      return impacts;
    } catch (error) {
      console.error('Error processing website cost update:', error);
      throw error;
    }
  }

  private async calculatePlanCostImpact(
    update: WebsitePlanUpdate,
  ): Promise<WebsiteBudgetImpact> {
    const currentPlan = update.planDetails.currentPlan;
    const previousPlan =
      update.planDetails.previousPlan || this.WEBSITE_PLANS.free;

    // Calculate monthly cost based on billing cycle
    const currentMonthlyCost =
      update.planDetails.billingCycle === 'annual'
        ? currentPlan.annualPrice / 12
        : currentPlan.monthlyPrice;

    const previousMonthlyCost =
      update.planDetails.billingCycle === 'annual'
        ? previousPlan.annualPrice / 12
        : previousPlan.monthlyPrice;

    // Calculate tax (assuming 8.75% sales tax)
    const taxRate = 0.0875;
    const currentTax = currentMonthlyCost * taxRate;
    const previousTax = previousMonthlyCost * taxRate;

    // Project annual cost
    const projectedAnnual =
      update.planDetails.billingCycle === 'annual'
        ? currentPlan.annualPrice * (1 + taxRate)
        : currentPlan.monthlyPrice * 12 * (1 + taxRate);

    return {
      category: 'website_hosting',
      subcategory: 'subscription_plan',
      previousAmount: previousMonthlyCost + previousTax,
      newAmount: currentMonthlyCost + currentTax,
      billingType: 'subscription',
      billingCycle: update.planDetails.billingCycle,
      nextBillingDate: update.planDetails.nextBillingDate,
      breakdown: {
        basePlan: currentMonthlyCost,
        addOns: 0,
        customDomain: 0,
        overages: 0,
        taxes: currentTax,
      },
      projectedAnnualCost: projectedAnnual,
    };
  }

  private async calculateAddOnImpact(
    update: WebsitePlanUpdate,
  ): Promise<WebsiteBudgetImpact> {
    let recurringMonthly = 0;
    let oneTimeCosts = 0;

    for (const addOn of update.addOns) {
      if (addOn.type === 'recurring') {
        if (addOn.billingCycle === 'monthly') {
          recurringMonthly += addOn.price;
        } else if (addOn.billingCycle === 'annual') {
          recurringMonthly += addOn.price / 12;
        }
      } else {
        oneTimeCosts += addOn.price;
      }
    }

    // Get previous add-on costs
    const { data: previousAddOns } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'website_hosting')
      .eq('subcategory', 'addons')
      .single();

    const taxRate = 0.0875;
    const totalMonthly = recurringMonthly + oneTimeCosts / 12; // Amortize one-time costs over a year
    const tax = totalMonthly * taxRate;

    return {
      category: 'website_hosting',
      subcategory: 'addons',
      previousAmount: previousAddOns?.amount || 0,
      newAmount: totalMonthly + tax,
      billingType: 'subscription',
      billingCycle: 'monthly',
      nextBillingDate: update.planDetails.nextBillingDate,
      breakdown: {
        basePlan: 0,
        addOns: totalMonthly,
        customDomain: 0,
        overages: 0,
        taxes: tax,
      },
      projectedAnnualCost: (totalMonthly + tax) * 12,
    };
  }

  private async calculateDomainImpact(
    update: WebsitePlanUpdate,
  ): Promise<WebsiteBudgetImpact> {
    if (!update.planDetails.customDomain) {
      return {
        category: 'website_hosting',
        subcategory: 'custom_domain',
        previousAmount: 0,
        newAmount: 0,
        billingType: 'subscription',
        billingCycle: 'annual',
        breakdown: {
          basePlan: 0,
          addOns: 0,
          customDomain: 0,
          overages: 0,
          taxes: 0,
        },
        projectedAnnualCost: 0,
      };
    }

    const domainCost = update.planDetails.customDomain.annualCost;
    const monthlyCost = domainCost / 12;
    const taxRate = 0.0875;
    const tax = monthlyCost * taxRate;

    // Get previous domain costs
    const { data: previousDomain } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'website_hosting')
      .eq('subcategory', 'custom_domain')
      .single();

    return {
      category: 'website_hosting',
      subcategory: 'custom_domain',
      previousAmount: previousDomain?.amount || 0,
      newAmount: monthlyCost + tax,
      billingType: 'subscription',
      billingCycle: 'annual',
      nextBillingDate: update.planDetails.customDomain.renewalDate,
      breakdown: {
        basePlan: 0,
        addOns: 0,
        customDomain: monthlyCost,
        overages: 0,
        taxes: tax,
      },
      projectedAnnualCost: domainCost * (1 + taxRate),
    };
  }

  private async calculateOverageCharges(
    update: WebsitePlanUpdate,
  ): Promise<WebsiteBudgetImpact> {
    const plan = update.planDetails.currentPlan;
    const features = update.features;
    const usage = update.usage;

    let overageCharges = 0;

    // Storage overages
    if (usage.storageUsed > features.storageGB) {
      const extraGB = usage.storageUsed - features.storageGB;
      overageCharges += extraGB * this.OVERAGE_RATES.storage;
    }

    // Guest limit overages
    if (usage.currentGuests > features.guestLimit) {
      const extraGuests = usage.currentGuests - features.guestLimit;
      overageCharges += extraGuests * this.OVERAGE_RATES.guests;
    }

    // Bandwidth overages (assuming 100GB included in all plans)
    const includedBandwidth = 100;
    if (usage.bandwidthGB > includedBandwidth) {
      const extraBandwidth = usage.bandwidthGB - includedBandwidth;
      overageCharges += extraBandwidth * this.OVERAGE_RATES.bandwidth;
    }

    const taxRate = 0.0875;
    const tax = overageCharges * taxRate;

    // Get previous overage charges
    const { data: previousOverages } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'website_hosting')
      .eq('subcategory', 'overages')
      .single();

    return {
      category: 'website_hosting',
      subcategory: 'overages',
      previousAmount: previousOverages?.amount || 0,
      newAmount: overageCharges + tax,
      billingType: 'usage-based',
      billingCycle: 'monthly',
      nextBillingDate: update.planDetails.nextBillingDate,
      breakdown: {
        basePlan: 0,
        addOns: 0,
        customDomain: 0,
        overages: overageCharges,
        taxes: tax,
      },
      projectedAnnualCost: (overageCharges + tax) * 12,
    };
  }

  private async projectWebsiteCosts(
    update: WebsitePlanUpdate,
  ): Promise<WebsiteBudgetImpact> {
    // Get wedding date to calculate remaining months
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('wedding_date')
      .eq('id', update.weddingId)
      .single();

    if (!wedding) {
      throw new Error('Wedding not found');
    }

    const weddingDate = new Date(wedding.wedding_date);
    const today = new Date();
    const monthsRemaining = Math.max(
      1,
      Math.ceil(
        (weddingDate.getTime() - today.getTime()) / (30 * 24 * 60 * 60 * 1000),
      ),
    );

    // Calculate total projected costs
    const plan = update.planDetails.currentPlan;
    const monthlyPlanCost =
      update.planDetails.billingCycle === 'annual'
        ? plan.annualPrice / 12
        : plan.monthlyPrice;

    let totalMonthly = monthlyPlanCost;

    // Add recurring add-ons
    for (const addOn of update.addOns) {
      if (addOn.type === 'recurring') {
        if (addOn.billingCycle === 'monthly') {
          totalMonthly += addOn.price;
        } else if (addOn.billingCycle === 'annual') {
          totalMonthly += addOn.price / 12;
        }
      }
    }

    // Add domain cost
    if (update.planDetails.customDomain) {
      totalMonthly += update.planDetails.customDomain.annualCost / 12;
    }

    const taxRate = 0.0875;
    const totalWithTax = totalMonthly * (1 + taxRate);
    const projectedTotal = totalWithTax * monthsRemaining;

    // Get previous projection
    const { data: previousProjection } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'website_hosting')
      .eq('subcategory', 'total_projected')
      .single();

    return {
      category: 'website_hosting',
      subcategory: 'total_projected',
      previousAmount: previousProjection?.amount || 0,
      newAmount: projectedTotal,
      billingType: 'subscription',
      billingCycle: 'monthly',
      breakdown: {
        basePlan: monthlyPlanCost * monthsRemaining,
        addOns: (totalMonthly - monthlyPlanCost) * monthsRemaining,
        customDomain: 0,
        overages: 0,
        taxes: totalMonthly * taxRate * monthsRemaining,
      },
      projectedAnnualCost: totalWithTax * 12,
    };
  }

  private async persistWebsiteImpacts(
    weddingId: string,
    impacts: WebsiteBudgetImpact[],
  ) {
    const timestamp = new Date().toISOString();

    for (const impact of impacts) {
      // Upsert budget items
      const { error } = await this.supabase.from('budget_items').upsert(
        {
          wedding_id: weddingId,
          category: impact.category,
          subcategory: impact.subcategory,
          amount: impact.newAmount,
          billing_type: impact.billingType,
          billing_cycle: impact.billingCycle,
          next_billing_date: impact.nextBillingDate,
          cost_breakdown: impact.breakdown,
          projected_annual: impact.projectedAnnualCost,
          last_updated: timestamp,
          update_source: 'website_cost_integration',
        },
        {
          onConflict: 'wedding_id,category,subcategory',
        },
      );

      if (error) {
        console.error('Error persisting website impact:', error);
        throw error;
      }

      // Log in audit trail
      await this.supabase.from('budget_audit_log').insert({
        wedding_id: weddingId,
        category: impact.category,
        subcategory: impact.subcategory,
        previous_amount: impact.previousAmount,
        new_amount: impact.newAmount,
        change_reason: `Website ${impact.subcategory} update`,
        source_system: 'team_e_website_builder',
        metadata: {
          billingType: impact.billingType,
          billingCycle: impact.billingCycle,
          breakdown: impact.breakdown,
        },
        timestamp,
      });
    }

    // Update total website costs
    await this.recalculateWebsiteTotal(weddingId);
  }

  private async recalculateWebsiteTotal(weddingId: string) {
    const { data: websiteItems, error } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', weddingId)
      .eq('category', 'website_hosting');

    if (error) throw error;

    const websiteTotal = websiteItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    await this.supabase.from('wedding_budget_summary').upsert(
      {
        wedding_id: weddingId,
        category: 'website_hosting',
        total_amount: websiteTotal,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: 'wedding_id,category',
      },
    );
  }

  private async scheduleBillingReminders(update: WebsitePlanUpdate) {
    // Schedule reminder 3 days before next billing date
    const reminderDate = new Date(update.planDetails.nextBillingDate);
    reminderDate.setDate(reminderDate.getDate() - 3);

    await this.supabase.from('budget_reminders').insert({
      wedding_id: update.weddingId,
      category: 'website_hosting',
      reminder_type: 'billing_due',
      reminder_date: reminderDate.toISOString(),
      message: `Website hosting billing of $${update.planDetails.currentPlan.monthlyPrice} due in 3 days`,
      status: 'scheduled',
    });

    // Schedule domain renewal reminder if applicable
    if (update.planDetails.customDomain) {
      const domainReminderDate = new Date(
        update.planDetails.customDomain.renewalDate,
      );
      domainReminderDate.setDate(domainReminderDate.getDate() - 30); // 30 days before renewal

      await this.supabase.from('budget_reminders').insert({
        wedding_id: update.weddingId,
        category: 'website_hosting',
        reminder_type: 'domain_renewal',
        reminder_date: domainReminderDate.toISOString(),
        message: `Domain ${update.planDetails.customDomain.domain} renewal of $${update.planDetails.customDomain.annualCost} due in 30 days`,
        status: 'scheduled',
      });
    }
  }

  private async broadcastWebsiteCostUpdate(
    weddingId: string,
    impacts: WebsiteBudgetImpact[],
  ) {
    const totalMonthly = impacts.reduce(
      (sum, i) => (i.billingType === 'subscription' ? sum + i.newAmount : sum),
      0,
    );
    const totalOneTime = impacts.reduce(
      (sum, i) => (i.billingType === 'one-time' ? sum + i.newAmount : sum),
      0,
    );
    const projectedAnnual = impacts.reduce(
      (sum, i) => Math.max(sum, i.projectedAnnualCost),
      0,
    );

    const message = {
      type: 'WEBSITE_COST_UPDATE',
      source: 'WEBSITE_COST_INTEGRATION',
      weddingId,
      impacts,
      summary: {
        monthlyRecurring: totalMonthly,
        oneTimeCosts: totalOneTime,
        projectedAnnual,
        breakdown: {
          plan:
            impacts.find((i) => i.subcategory === 'subscription_plan')
              ?.newAmount || 0,
          addOns:
            impacts.find((i) => i.subcategory === 'addons')?.newAmount || 0,
          domain:
            impacts.find((i) => i.subcategory === 'custom_domain')?.newAmount ||
            0,
          overages:
            impacts.find((i) => i.subcategory === 'overages')?.newAmount || 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all connected clients
    const connections = Array.from(this.websocketConnections.entries())
      .filter(([clientId]) => clientId.includes(weddingId))
      .map(([, ws]) => ws);

    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  private async handleWebsitePlanChange(payload: any) {
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      const website = payload.new;

      if (website) {
        // Get current plan details
        const plan =
          this.WEBSITE_PLANS[
            website.plan_id as keyof typeof this.WEBSITE_PLANS
          ];

        if (plan) {
          // Get usage metrics
          const { data: usage } = await this.supabase
            .from('website_usage_metrics')
            .select('*')
            .eq('website_id', website.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get add-ons
          const { data: addOns } = await this.supabase
            .from('website_addons')
            .select('*')
            .eq('website_id', website.id)
            .eq('status', 'active');

          const update: WebsitePlanUpdate = {
            weddingId: website.wedding_id,
            websiteId: website.id,
            planDetails: {
              currentPlan: plan,
              previousPlan: payload.old
                ? this.WEBSITE_PLANS[payload.old.plan_id]
                : undefined,
              billingCycle: website.billing_cycle || 'monthly',
              startDate: new Date(website.created_at),
              nextBillingDate: new Date(
                website.next_billing_date || new Date(),
              ),
              customDomain: website.custom_domain
                ? {
                    domain: website.custom_domain,
                    annualCost: website.domain_cost || 15,
                    renewalDate: new Date(
                      website.domain_renewal_date || new Date(),
                    ),
                  }
                : undefined,
            },
            features: {
              guestLimit:
                plan.name === 'enterprise'
                  ? 999999
                  : plan.name === 'premium'
                    ? 500
                    : plan.name === 'professional'
                      ? 300
                      : plan.name === 'starter'
                        ? 150
                        : 50,
              storageGB:
                plan.name === 'enterprise'
                  ? 50
                  : plan.name === 'premium'
                    ? 10
                    : plan.name === 'professional'
                      ? 5
                      : plan.name === 'starter'
                        ? 1
                        : 0.1,
              customPages:
                plan.name === 'premium' || plan.name === 'enterprise'
                  ? 999
                  : plan.name === 'professional'
                    ? 10
                    : plan.name === 'starter'
                      ? 5
                      : 1,
              rsvpManagement: plan.name !== 'free',
              giftRegistry:
                plan.name === 'professional' ||
                plan.name === 'premium' ||
                plan.name === 'enterprise',
              photoGallery:
                plan.name === 'professional' ||
                plan.name === 'premium' ||
                plan.name === 'enterprise',
              livestreaming:
                plan.name === 'premium' || plan.name === 'enterprise',
              analytics: plan.name === 'premium' || plan.name === 'enterprise',
            },
            usage: {
              currentGuests: usage?.guest_count || 0,
              storageUsed: usage?.storage_mb ? usage.storage_mb / 1024 : 0,
              pageViews: usage?.page_views || 0,
              uniqueVisitors: usage?.unique_visitors || 0,
              bandwidthGB: usage?.bandwidth_mb ? usage.bandwidth_mb / 1024 : 0,
            },
            addOns:
              addOns?.map((a) => ({
                id: a.addon_id,
                name: a.name,
                type: a.billing_type as 'one-time' | 'recurring',
                price: a.price,
                billingCycle: a.billing_cycle as
                  | 'monthly'
                  | 'annual'
                  | undefined,
                description: a.description,
              })) || [],
            timestamp: new Date(),
          };

          await this.processWebsiteCostUpdate(update);
        }
      }
    }
  }

  private async handleUsageUpdate(payload: any) {
    const usage = payload.new;

    if (usage) {
      // Get associated website
      const { data: website } = await this.supabase
        .from('wedding_websites')
        .select('*')
        .eq('id', usage.website_id)
        .single();

      if (website) {
        // Trigger cost recalculation if usage exceeds limits
        await this.handleWebsitePlanChange({
          eventType: 'UPDATE',
          new: website,
        });
      }
    }
  }

  // Public API methods
  async getWebsiteCostSummary(weddingId: string) {
    const { data: items } = await this.supabase
      .from('budget_items')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('category', 'website_hosting');

    if (!items) return null;

    const monthly = items
      .filter((i) => i.billing_cycle === 'monthly')
      .reduce((sum, i) => sum + i.amount, 0);

    const annual = items
      .filter((i) => i.billing_cycle === 'annual')
      .reduce((sum, i) => sum + i.amount, 0);

    const projected =
      items.find((i) => i.subcategory === 'total_projected')?.amount || 0;

    return {
      monthlyRecurring: monthly,
      annualCosts: annual,
      projectedTotal: projected,
      nextBillingDate: items[0]?.next_billing_date,
      breakdown: items.reduce(
        (acc, item) => {
          acc[item.subcategory] = item.amount;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async recommendPlanUpgrade(weddingId: string, currentUsage: any) {
    const currentPlan = Object.values(this.WEBSITE_PLANS).find(
      (p) =>
        currentUsage.currentGuests <=
        (p.name === 'enterprise'
          ? 999999
          : p.name === 'premium'
            ? 500
            : p.name === 'professional'
              ? 300
              : p.name === 'starter'
                ? 150
                : 50),
    );

    if (!currentPlan) return null;

    const nextPlan = Object.values(this.WEBSITE_PLANS).find(
      (p) => p.monthlyPrice > currentPlan.monthlyPrice,
    );

    if (!nextPlan) return null;

    return {
      currentPlan: currentPlan.name,
      recommendedPlan: nextPlan.name,
      reason: 'Usage approaching plan limits',
      monthlySavings: currentPlan.monthlyPrice - nextPlan.monthlyPrice,
      additionalFeatures: nextPlan.features.filter(
        (f) => !currentPlan.features.includes(f),
      ),
    };
  }

  registerWebSocketConnection(clientId: string, ws: WebSocket) {
    this.websocketConnections.set(clientId, ws);
  }

  unregisterWebSocketConnection(clientId: string) {
    this.websocketConnections.delete(clientId);
  }
}

// Export singleton instance
let instance: BudgetWebsiteCostIntegration | null = null;

export function getBudgetWebsiteCostIntegration() {
  if (!instance) {
    instance = new BudgetWebsiteCostIntegration(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return instance;
}
