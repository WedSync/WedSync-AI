// Team B Integration: RSVP Headcount Impact Calculator
// WS-059 Budget Tracker - Round 3 Final Integration

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import type { Database } from '@/types/database';

interface RSVPUpdate {
  weddingId: string;
  eventId: string;
  changes: {
    confirmed: number;
    declined: number;
    pending: number;
    waitlist: number;
  };
  mealPreferences: {
    standard: number;
    vegetarian: number;
    vegan: number;
    glutenFree: number;
    kidsMenu: number;
    allergies: string[];
  };
  plusOnes: {
    invited: number;
    confirmed: number;
  };
  timestamp: Date;
}

interface RSVPBudgetImpact {
  category: string;
  subcategory: string;
  previousAmount: number;
  newAmount: number;
  headcount: number;
  costBreakdown: {
    item: string;
    quantity: number;
    unitCost: number;
    total: number;
  }[];
  confidenceLevel: 'confirmed' | 'estimated' | 'projected';
}

interface MealPricing {
  standard: number;
  vegetarian: number;
  vegan: number;
  glutenFree: number;
  kidsMenu: number;
  allergyUpcharge: number;
}

export class BudgetRSVPCalculator extends EventEmitter {
  private supabase: ReturnType<typeof createClient<Database>>;
  private websocketConnections: Map<string, WebSocket> = new Map();

  private readonly MEAL_PRICING: MealPricing = {
    standard: 125,
    vegetarian: 115,
    vegan: 120,
    glutenFree: 135,
    kidsMenu: 45,
    allergyUpcharge: 15,
  };

  private readonly CATERING_TIERS = [
    { min: 0, max: 50, discount: 0 },
    { min: 51, max: 100, discount: 0.05 },
    { min: 101, max: 150, discount: 0.08 },
    { min: 151, max: 200, discount: 0.1 },
    { min: 201, max: 999, discount: 0.12 },
  ];

  private readonly BUFFER_PERCENTAGES = {
    confirmed: 0, // No buffer for confirmed guests
    estimated: 0.05, // 5% buffer for estimated
    projected: 0.1, // 10% buffer for projected
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.initializeRealtimeSubscription();
  }

  private initializeRealtimeSubscription() {
    // Subscribe to RSVP changes from Team B
    const channel = this.supabase
      .channel('rsvp-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvp_responses',
        },
        async (payload) => {
          await this.handleRSVPTableChange(payload);
        },
      )
      .subscribe();

    // Subscribe to meal preference updates
    const mealChannel = this.supabase
      .channel('meal-preference-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvp_meal_preferences',
        },
        async (payload) => {
          await this.handleMealPreferenceChange(payload);
        },
      )
      .subscribe();
  }

  async calculateRSVPImpact(update: RSVPUpdate): Promise<RSVPBudgetImpact[]> {
    const impacts: RSVPBudgetImpact[] = [];

    try {
      // Get wedding details
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('id, estimated_guests, venue_id, catering_vendor_id')
        .eq('id', update.weddingId)
        .single();

      if (weddingError) throw weddingError;

      // Calculate confirmed headcount impact
      const confirmedImpact = await this.calculateConfirmedGuestImpact(
        update,
        wedding,
      );
      impacts.push(confirmedImpact);

      // Calculate meal preference impact
      const mealImpact = await this.calculateMealPreferenceImpact(update);
      impacts.push(mealImpact);

      // Calculate plus-one impact
      const plusOneImpact = await this.calculatePlusOneImpact(update);
      impacts.push(plusOneImpact);

      // Calculate waitlist buffer
      if (update.changes.waitlist > 0) {
        const waitlistImpact = await this.calculateWaitlistBuffer(update);
        impacts.push(waitlistImpact);
      }

      // Calculate vendor meal requirements
      const vendorMealImpact = await this.calculateVendorMeals(
        update.weddingId,
        update.changes.confirmed,
      );
      impacts.push(vendorMealImpact);

      // Calculate service charges and taxes
      const serviceChargeImpact = this.calculateServiceCharges(impacts);
      impacts.push(serviceChargeImpact);

      // Persist all impacts to database
      await this.persistRSVPImpacts(update.weddingId, impacts);

      // Broadcast real-time updates
      await this.broadcastRSVPBudgetUpdate(update.weddingId, impacts);

      // Emit event for other systems
      this.emit('rsvpBudgetUpdated', {
        weddingId: update.weddingId,
        source: 'rsvp-calculator',
        impacts,
        totalHeadcount: update.changes.confirmed + update.plusOnes.confirmed,
        timestamp: new Date(),
      });

      return impacts;
    } catch (error) {
      console.error('Error calculating RSVP impact:', error);
      throw error;
    }
  }

  private async calculateConfirmedGuestImpact(
    update: RSVPUpdate,
    wedding: any,
  ): Promise<RSVPBudgetImpact> {
    const confirmedTotal = update.changes.confirmed + update.plusOnes.confirmed;
    const tier = this.CATERING_TIERS.find(
      (t) => confirmedTotal >= t.min && confirmedTotal <= t.max,
    )!;
    const discount = tier.discount;

    // Get previous RSVP count for comparison
    const { data: previousRSVP } = await this.supabase
      .from('budget_items')
      .select('amount, metadata')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'catering')
      .eq('subcategory', 'confirmed_guests')
      .single();

    const basePerPerson = this.MEAL_PRICING.standard;
    const discountedPrice = basePerPerson * (1 - discount);
    const totalCost = confirmedTotal * discountedPrice;

    const costBreakdown = [
      {
        item: 'Confirmed Guests',
        quantity: update.changes.confirmed,
        unitCost: discountedPrice,
        total: update.changes.confirmed * discountedPrice,
      },
      {
        item: 'Plus Ones',
        quantity: update.plusOnes.confirmed,
        unitCost: discountedPrice,
        total: update.plusOnes.confirmed * discountedPrice,
      },
    ];

    if (discount > 0) {
      costBreakdown.push({
        item: `Volume Discount (${discount * 100}%)`,
        quantity: confirmedTotal,
        unitCost: -basePerPerson * discount,
        total: -confirmedTotal * basePerPerson * discount,
      });
    }

    return {
      category: 'catering',
      subcategory: 'confirmed_guests',
      previousAmount: previousRSVP?.amount || 0,
      newAmount: totalCost,
      headcount: confirmedTotal,
      costBreakdown,
      confidenceLevel: 'confirmed',
    };
  }

  private async calculateMealPreferenceImpact(
    update: RSVPUpdate,
  ): Promise<RSVPBudgetImpact> {
    const mealCosts = {
      standard: update.mealPreferences.standard * this.MEAL_PRICING.standard,
      vegetarian:
        update.mealPreferences.vegetarian * this.MEAL_PRICING.vegetarian,
      vegan: update.mealPreferences.vegan * this.MEAL_PRICING.vegan,
      glutenFree:
        update.mealPreferences.glutenFree * this.MEAL_PRICING.glutenFree,
      kidsMenu: update.mealPreferences.kidsMenu * this.MEAL_PRICING.kidsMenu,
    };

    // Add allergy upcharges
    const allergyUpcharge =
      update.mealPreferences.allergies.length *
      this.MEAL_PRICING.allergyUpcharge;

    const totalMealCost =
      Object.values(mealCosts).reduce((sum, cost) => sum + cost, 0) +
      allergyUpcharge;

    const costBreakdown = Object.entries(mealCosts)
      .filter(([, cost]) => cost > 0)
      .map(([type, cost]) => ({
        item: `${type.charAt(0).toUpperCase() + type.slice(1)} Meals`,
        quantity: update.mealPreferences[
          type as keyof typeof update.mealPreferences
        ] as number,
        unitCost: this.MEAL_PRICING[type as keyof MealPricing],
        total: cost,
      }));

    if (allergyUpcharge > 0) {
      costBreakdown.push({
        item: 'Allergy Accommodations',
        quantity: update.mealPreferences.allergies.length,
        unitCost: this.MEAL_PRICING.allergyUpcharge,
        total: allergyUpcharge,
      });
    }

    // Get previous meal preference costs
    const { data: previousMealCosts } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'catering')
      .eq('subcategory', 'meal_preferences')
      .single();

    return {
      category: 'catering',
      subcategory: 'meal_preferences',
      previousAmount: previousMealCosts?.amount || 0,
      newAmount: totalMealCost,
      headcount: update.changes.confirmed,
      costBreakdown,
      confidenceLevel: 'confirmed',
    };
  }

  private async calculatePlusOneImpact(
    update: RSVPUpdate,
  ): Promise<RSVPBudgetImpact> {
    const pendingPlusOnes = update.plusOnes.invited - update.plusOnes.confirmed;
    const estimatedConfirmRate = 0.75; // 75% of plus-ones typically confirm
    const estimatedAdditional = Math.ceil(
      pendingPlusOnes * estimatedConfirmRate,
    );

    const confirmedCost =
      update.plusOnes.confirmed * this.MEAL_PRICING.standard;
    const estimatedCost = estimatedAdditional * this.MEAL_PRICING.standard;
    const totalCost = confirmedCost + estimatedCost;

    const costBreakdown = [
      {
        item: 'Confirmed Plus-Ones',
        quantity: update.plusOnes.confirmed,
        unitCost: this.MEAL_PRICING.standard,
        total: confirmedCost,
      },
    ];

    if (estimatedAdditional > 0) {
      costBreakdown.push({
        item: 'Estimated Plus-Ones (75% confirmation rate)',
        quantity: estimatedAdditional,
        unitCost: this.MEAL_PRICING.standard,
        total: estimatedCost,
      });
    }

    const { data: previousPlusOne } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'catering')
      .eq('subcategory', 'plus_ones')
      .single();

    return {
      category: 'catering',
      subcategory: 'plus_ones',
      previousAmount: previousPlusOne?.amount || 0,
      newAmount: totalCost,
      headcount: update.plusOnes.confirmed + estimatedAdditional,
      costBreakdown,
      confidenceLevel: estimatedAdditional > 0 ? 'estimated' : 'confirmed',
    };
  }

  private async calculateWaitlistBuffer(
    update: RSVPUpdate,
  ): Promise<RSVPBudgetImpact> {
    // Assume 20% of waitlist might get promoted
    const potentialPromotions = Math.ceil(update.changes.waitlist * 0.2);
    const bufferCost = potentialPromotions * this.MEAL_PRICING.standard * 1.1; // 10% markup for last-minute additions

    const costBreakdown = [
      {
        item: 'Waitlist Buffer (20% promotion estimate)',
        quantity: potentialPromotions,
        unitCost: this.MEAL_PRICING.standard * 1.1,
        total: bufferCost,
      },
    ];

    const { data: previousBuffer } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', update.weddingId)
      .eq('category', 'catering')
      .eq('subcategory', 'waitlist_buffer')
      .single();

    return {
      category: 'catering',
      subcategory: 'waitlist_buffer',
      previousAmount: previousBuffer?.amount || 0,
      newAmount: bufferCost,
      headcount: potentialPromotions,
      costBreakdown,
      confidenceLevel: 'projected',
    };
  }

  private async calculateVendorMeals(
    weddingId: string,
    guestCount: number,
  ): Promise<RSVPBudgetImpact> {
    // Get vendor list for the wedding
    const { data: vendors } = await this.supabase
      .from('wedding_vendors')
      .select('vendor_type, team_size')
      .eq('wedding_id', weddingId)
      .eq('status', 'confirmed');

    const vendorMealCount =
      vendors?.reduce((sum, v) => sum + (v.team_size || 1), 0) || 0;
    const vendorMealCost = vendorMealCount * (this.MEAL_PRICING.standard * 0.6); // 60% of guest meal cost

    const costBreakdown =
      vendors?.map((v) => ({
        item: `${v.vendor_type} Team`,
        quantity: v.team_size || 1,
        unitCost: this.MEAL_PRICING.standard * 0.6,
        total: (v.team_size || 1) * this.MEAL_PRICING.standard * 0.6,
      })) || [];

    const { data: previousVendorMeals } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', weddingId)
      .eq('category', 'catering')
      .eq('subcategory', 'vendor_meals')
      .single();

    return {
      category: 'catering',
      subcategory: 'vendor_meals',
      previousAmount: previousVendorMeals?.amount || 0,
      newAmount: vendorMealCost,
      headcount: vendorMealCount,
      costBreakdown,
      confidenceLevel: 'confirmed',
    };
  }

  private calculateServiceCharges(
    impacts: RSVPBudgetImpact[],
  ): RSVPBudgetImpact {
    const cateringSubtotal = impacts
      .filter((i) => i.category === 'catering')
      .reduce((sum, i) => sum + i.newAmount, 0);

    const serviceCharge = cateringSubtotal * 0.2; // 20% service charge
    const tax = (cateringSubtotal + serviceCharge) * 0.0875; // 8.75% tax
    const total = serviceCharge + tax;

    return {
      category: 'catering',
      subcategory: 'service_and_tax',
      previousAmount: 0, // Will be calculated from previous impacts
      newAmount: total,
      headcount: 0,
      costBreakdown: [
        {
          item: 'Service Charge (20%)',
          quantity: 1,
          unitCost: serviceCharge,
          total: serviceCharge,
        },
        {
          item: 'Sales Tax (8.75%)',
          quantity: 1,
          unitCost: tax,
          total: tax,
        },
      ],
      confidenceLevel: 'confirmed',
    };
  }

  private async persistRSVPImpacts(
    weddingId: string,
    impacts: RSVPBudgetImpact[],
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
          headcount: impact.headcount,
          confidence_level: impact.confidenceLevel,
          cost_breakdown: impact.costBreakdown,
          last_updated: timestamp,
          update_source: 'rsvp_calculator',
          metadata: {
            previousAmount: impact.previousAmount,
            costBreakdown: impact.costBreakdown,
          },
        },
        {
          onConflict: 'wedding_id,category,subcategory',
        },
      );

      if (error) {
        console.error('Error persisting RSVP impact:', error);
        throw error;
      }

      // Log in audit trail
      await this.supabase.from('budget_audit_log').insert({
        wedding_id: weddingId,
        category: impact.category,
        subcategory: impact.subcategory,
        previous_amount: impact.previousAmount,
        new_amount: impact.newAmount,
        change_reason: `RSVP update: ${impact.headcount} guests`,
        source_system: 'team_b_rsvp_system',
        confidence_level: impact.confidenceLevel,
        timestamp,
      });
    }

    // Update wedding total
    await this.recalculateCateringTotal(weddingId);
  }

  private async recalculateCateringTotal(weddingId: string) {
    const { data: cateringItems, error } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', weddingId)
      .eq('category', 'catering');

    if (error) throw error;

    const cateringTotal = cateringItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    await this.supabase.from('wedding_budget_summary').upsert(
      {
        wedding_id: weddingId,
        category: 'catering',
        total_amount: cateringTotal,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: 'wedding_id,category',
      },
    );
  }

  private async broadcastRSVPBudgetUpdate(
    weddingId: string,
    impacts: RSVPBudgetImpact[],
  ) {
    const totalHeadcount = impacts
      .filter((i) => i.headcount > 0)
      .reduce((sum, i) => sum + i.headcount, 0);

    const totalImpact = impacts.reduce(
      (sum, i) => sum + (i.newAmount - i.previousAmount),
      0,
    );

    const message = {
      type: 'RSVP_BUDGET_UPDATE',
      source: 'RSVP_CALCULATOR',
      weddingId,
      impacts,
      summary: {
        totalHeadcount,
        totalCateringCost: impacts.reduce((sum, i) => sum + i.newAmount, 0),
        netChange: totalImpact,
        confidenceLevels: {
          confirmed: impacts.filter((i) => i.confidenceLevel === 'confirmed')
            .length,
          estimated: impacts.filter((i) => i.confidenceLevel === 'estimated')
            .length,
          projected: impacts.filter((i) => i.confidenceLevel === 'projected')
            .length,
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

  private async handleRSVPTableChange(payload: any) {
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      const weddingId = payload.new?.wedding_id;

      if (weddingId) {
        // Aggregate current RSVP data
        const { data: rsvpData } = await this.supabase
          .from('rsvp_responses')
          .select('status, meal_preference, plus_one_confirmed')
          .eq('wedding_id', weddingId);

        const { data: mealPrefs } = await this.supabase
          .from('rsvp_meal_preferences')
          .select('preference_type, guest_count')
          .eq('wedding_id', weddingId);

        // Build update object
        const update: RSVPUpdate = {
          weddingId,
          eventId: payload.new?.event_id || '',
          changes: {
            confirmed:
              rsvpData?.filter((r) => r.status === 'confirmed').length || 0,
            declined:
              rsvpData?.filter((r) => r.status === 'declined').length || 0,
            pending:
              rsvpData?.filter((r) => r.status === 'pending').length || 0,
            waitlist:
              rsvpData?.filter((r) => r.status === 'waitlist').length || 0,
          },
          mealPreferences: {
            standard:
              mealPrefs?.find((m) => m.preference_type === 'standard')
                ?.guest_count || 0,
            vegetarian:
              mealPrefs?.find((m) => m.preference_type === 'vegetarian')
                ?.guest_count || 0,
            vegan:
              mealPrefs?.find((m) => m.preference_type === 'vegan')
                ?.guest_count || 0,
            glutenFree:
              mealPrefs?.find((m) => m.preference_type === 'gluten_free')
                ?.guest_count || 0,
            kidsMenu:
              mealPrefs?.find((m) => m.preference_type === 'kids')
                ?.guest_count || 0,
            allergies: [], // Would need separate query
          },
          plusOnes: {
            invited:
              rsvpData?.filter((r) => r.plus_one_confirmed !== null).length ||
              0,
            confirmed:
              rsvpData?.filter((r) => r.plus_one_confirmed === true).length ||
              0,
          },
          timestamp: new Date(),
        };

        await this.calculateRSVPImpact(update);
      }
    }
  }

  private async handleMealPreferenceChange(payload: any) {
    // Similar to RSVP change handler but focused on meal preferences
    const weddingId = payload.new?.wedding_id || payload.old?.wedding_id;
    if (weddingId) {
      // Trigger recalculation
      await this.handleRSVPTableChange({
        eventType: 'UPDATE',
        new: { wedding_id: weddingId },
      });
    }
  }

  registerWebSocketConnection(clientId: string, ws: WebSocket) {
    this.websocketConnections.set(clientId, ws);
  }

  unregisterWebSocketConnection(clientId: string) {
    this.websocketConnections.delete(clientId);
  }
}

// Export singleton instance
let instance: BudgetRSVPCalculator | null = null;

export function getBudgetRSVPCalculator() {
  if (!instance) {
    instance = new BudgetRSVPCalculator(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return instance;
}
