// Team A Integration: Guest Count Budget Calculations
// WS-059 Budget Tracker - Round 3 Final Integration

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import type { Database } from '@/types/database';

interface GuestCountUpdate {
  weddingId: string;
  previousCount: number;
  newCount: number;
  categories: {
    adults: number;
    children: number;
    vendors: number;
  };
  timestamp: Date;
}

interface BudgetImpact {
  category: string;
  subcategory?: string;
  previousAmount: number;
  newAmount: number;
  perPersonCost: number;
  reason: string;
}

interface VenuePricingTier {
  minGuests: number;
  maxGuests: number;
  baseCost: number;
  perPersonCost: number;
  additionalFees?: {
    serviceFee?: number;
    taxRate?: number;
  };
}

export class BudgetGuestSyncIntegration extends EventEmitter {
  private supabase: ReturnType<typeof createClient<Database>>;
  private websocketConnections: Map<string, WebSocket> = new Map();
  private readonly DEFAULT_PER_PERSON_COSTS = {
    catering: {
      adult: 125,
      child: 45,
      vendor: 75,
    },
    beverages: {
      alcoholic: 35,
      nonAlcoholic: 15,
    },
    rentals: {
      chair: 8,
      tableSettings: 12,
      linens: 5,
    },
    favors: 10,
    stationery: 8,
  };

  private readonly VENUE_PRICING_TIERS: VenuePricingTier[] = [
    { minGuests: 0, maxGuests: 50, baseCost: 2000, perPersonCost: 0 },
    { minGuests: 51, maxGuests: 100, baseCost: 3500, perPersonCost: 10 },
    { minGuests: 101, maxGuests: 150, baseCost: 5000, perPersonCost: 15 },
    { minGuests: 151, maxGuests: 200, baseCost: 7500, perPersonCost: 20 },
    { minGuests: 201, maxGuests: 300, baseCost: 10000, perPersonCost: 25 },
  ];

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.initializeRealtimeSubscription();
  }

  private initializeRealtimeSubscription() {
    // Subscribe to guest count changes from Team A
    const channel = this.supabase
      .channel('guest-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
        },
        async (payload) => {
          await this.handleGuestTableChange(payload);
        },
      )
      .subscribe();
  }

  async handleGuestCountChange(
    update: GuestCountUpdate,
  ): Promise<BudgetImpact[]> {
    const impacts: BudgetImpact[] = [];

    try {
      // Start transaction for atomic updates
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('id, budget_total, venue_id')
        .eq('id', update.weddingId)
        .single();

      if (weddingError) throw weddingError;

      // Calculate catering impact
      const cateringImpact = await this.calculateCateringImpact(update);
      impacts.push(...cateringImpact);

      // Calculate venue impact based on guest count tiers
      const venueImpact = await this.calculateVenueImpact(
        update,
        wedding.venue_id,
      );
      impacts.push(venueImpact);

      // Calculate rentals impact
      const rentalsImpact = await this.calculateRentalsImpact(update);
      impacts.push(rentalsImpact);

      // Calculate beverages impact
      const beveragesImpact = await this.calculateBeveragesImpact(update);
      impacts.push(beveragesImpact);

      // Calculate favors and stationery
      const favorsImpact = this.calculateSimplePerPersonImpact(
        update,
        'favors',
        this.DEFAULT_PER_PERSON_COSTS.favors,
      );
      impacts.push(favorsImpact);

      const stationeryImpact = this.calculateSimplePerPersonImpact(
        update,
        'stationery',
        this.DEFAULT_PER_PERSON_COSTS.stationery,
      );
      impacts.push(stationeryImpact);

      // Update budget items in database
      await this.persistBudgetImpacts(update.weddingId, impacts);

      // Broadcast changes via WebSocket
      await this.broadcastBudgetUpdate(update.weddingId, impacts);

      // Emit event for other systems
      this.emit('budgetUpdated', {
        weddingId: update.weddingId,
        source: 'guest-count',
        impacts,
        timestamp: new Date(),
      });

      return impacts;
    } catch (error) {
      console.error('Error handling guest count change:', error);
      throw error;
    }
  }

  private async calculateCateringImpact(
    update: GuestCountUpdate,
  ): Promise<BudgetImpact[]> {
    const impacts: BudgetImpact[] = [];

    // Adult catering
    const adultCateringPrevious =
      update.previousCount * this.DEFAULT_PER_PERSON_COSTS.catering.adult;
    const adultCateringNew =
      update.categories.adults * this.DEFAULT_PER_PERSON_COSTS.catering.adult;

    impacts.push({
      category: 'catering',
      subcategory: 'adult_meals',
      previousAmount: adultCateringPrevious,
      newAmount: adultCateringNew,
      perPersonCost: this.DEFAULT_PER_PERSON_COSTS.catering.adult,
      reason: `Guest count changed from ${update.previousCount} to ${update.categories.adults} adults`,
    });

    // Child catering
    if (update.categories.children > 0) {
      const childCateringNew =
        update.categories.children *
        this.DEFAULT_PER_PERSON_COSTS.catering.child;
      impacts.push({
        category: 'catering',
        subcategory: 'child_meals',
        previousAmount: 0,
        newAmount: childCateringNew,
        perPersonCost: this.DEFAULT_PER_PERSON_COSTS.catering.child,
        reason: `${update.categories.children} children added`,
      });
    }

    // Vendor meals
    if (update.categories.vendors > 0) {
      const vendorCateringNew =
        update.categories.vendors *
        this.DEFAULT_PER_PERSON_COSTS.catering.vendor;
      impacts.push({
        category: 'catering',
        subcategory: 'vendor_meals',
        previousAmount: 0,
        newAmount: vendorCateringNew,
        perPersonCost: this.DEFAULT_PER_PERSON_COSTS.catering.vendor,
        reason: `${update.categories.vendors} vendor meals required`,
      });
    }

    // Service charge (18% of food costs)
    const totalCateringNew = impacts.reduce(
      (sum, impact) => sum + impact.newAmount,
      0,
    );
    const serviceCharge = totalCateringNew * 0.18;
    impacts.push({
      category: 'catering',
      subcategory: 'service_charge',
      previousAmount: adultCateringPrevious * 0.18,
      newAmount: serviceCharge,
      perPersonCost: 0,
      reason: '18% service charge on catering',
    });

    return impacts;
  }

  private async calculateVenueImpact(
    update: GuestCountUpdate,
    venueId: string | null,
  ): Promise<BudgetImpact> {
    const totalGuests = update.categories.adults + update.categories.children;

    // Find appropriate pricing tier
    const tier =
      this.VENUE_PRICING_TIERS.find(
        (t) => totalGuests >= t.minGuests && totalGuests <= t.maxGuests,
      ) || this.VENUE_PRICING_TIERS[this.VENUE_PRICING_TIERS.length - 1];

    const previousTier =
      this.VENUE_PRICING_TIERS.find(
        (t) =>
          update.previousCount >= t.minGuests &&
          update.previousCount <= t.maxGuests,
      ) || this.VENUE_PRICING_TIERS[0];

    const newVenueCost = tier.baseCost + totalGuests * tier.perPersonCost;
    const previousVenueCost =
      previousTier.baseCost + update.previousCount * previousTier.perPersonCost;

    return {
      category: 'venue',
      subcategory: 'rental_fee',
      previousAmount: previousVenueCost,
      newAmount: newVenueCost,
      perPersonCost: tier.perPersonCost,
      reason: `Venue pricing tier: ${tier.minGuests}-${tier.maxGuests} guests`,
    };
  }

  private async calculateRentalsImpact(
    update: GuestCountUpdate,
  ): Promise<BudgetImpact> {
    const totalGuests = update.categories.adults + update.categories.children;
    const { chair, tableSettings, linens } =
      this.DEFAULT_PER_PERSON_COSTS.rentals;

    const perPersonRental = chair + tableSettings + linens;
    const previousAmount = update.previousCount * perPersonRental;
    const newAmount = totalGuests * perPersonRental;

    return {
      category: 'rentals',
      subcategory: 'tables_chairs_linens',
      previousAmount,
      newAmount,
      perPersonCost: perPersonRental,
      reason: `Rentals for ${totalGuests} guests (chairs, settings, linens)`,
    };
  }

  private async calculateBeveragesImpact(
    update: GuestCountUpdate,
  ): Promise<BudgetImpact> {
    // Assume 80% of adults drink alcohol
    const drinkingAdults = Math.floor(update.categories.adults * 0.8);
    const nonDrinkingTotal =
      update.categories.adults - drinkingAdults + update.categories.children;

    const alcoholicCost =
      drinkingAdults * this.DEFAULT_PER_PERSON_COSTS.beverages.alcoholic;
    const nonAlcoholicCost =
      nonDrinkingTotal * this.DEFAULT_PER_PERSON_COSTS.beverages.nonAlcoholic;

    const previousAlcoholic =
      Math.floor(update.previousCount * 0.8) *
      this.DEFAULT_PER_PERSON_COSTS.beverages.alcoholic;
    const previousNonAlcoholic =
      Math.floor(update.previousCount * 0.2) *
      this.DEFAULT_PER_PERSON_COSTS.beverages.nonAlcoholic;

    return {
      category: 'beverages',
      subcategory: 'bar_service',
      previousAmount: previousAlcoholic + previousNonAlcoholic,
      newAmount: alcoholicCost + nonAlcoholicCost,
      perPersonCost:
        (alcoholicCost + nonAlcoholicCost) /
        (update.categories.adults + update.categories.children),
      reason: `Bar service for ${drinkingAdults} drinking adults, ${nonDrinkingTotal} non-alcoholic`,
    };
  }

  private calculateSimplePerPersonImpact(
    update: GuestCountUpdate,
    category: string,
    perPersonCost: number,
  ): BudgetImpact {
    const totalGuests = update.categories.adults + update.categories.children;
    return {
      category,
      previousAmount: update.previousCount * perPersonCost,
      newAmount: totalGuests * perPersonCost,
      perPersonCost,
      reason: `${category} for ${totalGuests} guests`,
    };
  }

  private async persistBudgetImpacts(
    weddingId: string,
    impacts: BudgetImpact[],
  ) {
    const timestamp = new Date().toISOString();

    for (const impact of impacts) {
      // Update or insert budget items
      const { error } = await this.supabase.from('budget_items').upsert(
        {
          wedding_id: weddingId,
          category: impact.category,
          subcategory: impact.subcategory || null,
          amount: impact.newAmount,
          per_person_cost: impact.perPersonCost,
          last_updated: timestamp,
          update_source: 'guest_count_sync',
          update_reason: impact.reason,
        },
        {
          onConflict: 'wedding_id,category,subcategory',
        },
      );

      if (error) {
        console.error('Error persisting budget impact:', error);
        throw error;
      }

      // Log the change in audit trail
      await this.supabase.from('budget_audit_log').insert({
        wedding_id: weddingId,
        category: impact.category,
        subcategory: impact.subcategory,
        previous_amount: impact.previousAmount,
        new_amount: impact.newAmount,
        change_reason: impact.reason,
        source_system: 'team_a_guest_management',
        timestamp,
      });
    }

    // Recalculate total budget
    await this.recalculateTotalBudget(weddingId);
  }

  private async recalculateTotalBudget(weddingId: string) {
    const { data: budgetItems, error } = await this.supabase
      .from('budget_items')
      .select('amount')
      .eq('wedding_id', weddingId);

    if (error) throw error;

    const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);

    await this.supabase
      .from('weddings')
      .update({
        budget_spent: totalBudget,
        budget_last_updated: new Date().toISOString(),
      })
      .eq('id', weddingId);
  }

  private async broadcastBudgetUpdate(
    weddingId: string,
    impacts: BudgetImpact[],
  ) {
    const message = {
      type: 'BUDGET_UPDATE',
      source: 'GUEST_COUNT_SYNC',
      weddingId,
      impacts,
      timestamp: new Date().toISOString(),
      totalImpact: impacts.reduce(
        (sum, i) => sum + (i.newAmount - i.previousAmount),
        0,
      ),
    };

    // Send to all connected WebSocket clients for this wedding
    const connections = Array.from(this.websocketConnections.entries())
      .filter(([clientId]) => clientId.includes(weddingId))
      .map(([, ws]) => ws);

    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  private async handleGuestTableChange(payload: any) {
    // Process real-time updates from guest table
    if (
      payload.eventType === 'INSERT' ||
      payload.eventType === 'UPDATE' ||
      payload.eventType === 'DELETE'
    ) {
      const weddingId = payload.new?.wedding_id || payload.old?.wedding_id;

      if (weddingId) {
        // Get current guest count
        const { data: guests } = await this.supabase
          .from('guests')
          .select('guest_type')
          .eq('wedding_id', weddingId)
          .in('rsvp_status', ['confirmed', 'pending']);

        const categories = {
          adults: guests?.filter((g) => g.guest_type === 'adult').length || 0,
          children: guests?.filter((g) => g.guest_type === 'child').length || 0,
          vendors: guests?.filter((g) => g.guest_type === 'vendor').length || 0,
        };

        const update: GuestCountUpdate = {
          weddingId,
          previousCount: payload.old ? 1 : 0, // Simplified for demo
          newCount:
            categories.adults + categories.children + categories.vendors,
          categories,
          timestamp: new Date(),
        };

        await this.handleGuestCountChange(update);
      }
    }
  }

  // Public API for manual guest count updates
  async updateGuestCount(
    weddingId: string,
    newCount: number,
    categories?: any,
  ) {
    const update: GuestCountUpdate = {
      weddingId,
      previousCount: 0, // Will be fetched from DB
      newCount,
      categories: categories || {
        adults: newCount,
        children: 0,
        vendors: 0,
      },
      timestamp: new Date(),
    };

    return await this.handleGuestCountChange(update);
  }

  registerWebSocketConnection(clientId: string, ws: WebSocket) {
    this.websocketConnections.set(clientId, ws);
  }

  unregisterWebSocketConnection(clientId: string) {
    this.websocketConnections.delete(clientId);
  }
}

// Export singleton instance
let instance: BudgetGuestSyncIntegration | null = null;

export function getBudgetGuestSyncIntegration() {
  if (!instance) {
    instance = new BudgetGuestSyncIntegration(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return instance;
}
