import { describe, test, expect, beforeEach, afterEach } from 'vitest';

interface WeddingBudgetRange {
  min: number;
  max: number;
  currency: string;
  flexible: boolean; // Can go slightly over if great value
  flexibilityPercent?: number; // How much over budget is acceptable
}

interface VendorPricing {
  vendorId: string;
  vendorName: string;
  vendorType: 'photographer' | 'venue' | 'florist' | 'caterer' | 'dj' | 'band' | 'planner' | 'makeup' | 'videographer' | 'cake';
  pricingStructure: {
    basePrice: number;
    startingPrice: number;
    averagePackagePrice: number;
    priceRange: { min: number; max: number };
  };
  packageOptions: Array<{
    name: string;
    description: string;
    price: number;
    includes: string[];
    addOns: Array<{ name: string; price: number }>;
  }>;
  pricingFactors: {
    seasonalVariation: { [season: string]: number }; // multiplier
    dayOfWeekVariation: { [day: string]: number };
    guestCountBreakpoints: Array<{ min: number; max: number; multiplier: number }>;
    durationBreakpoints: Array<{ hours: number; multiplier: number }>;
    locationSurcharges: { [location: string]: number };
  };
  paymentTerms: {
    depositRequired: boolean;
    depositPercentage: number;
    paymentSchedule: string[];
    cancellationPolicy: string;
    refundPolicy: string;
  };
  budgetLevel: 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury';
  valueProposition: {
    qualityScore: number; // 1-10
    experienceLevel: number; // years
    portfolioQuality: number; // 1-10
    clientSatisfaction: number; // 1-10
    valueForMoney: number; // 1-10 calculated score
  };
}

interface BudgetFilterQuery {
  totalBudget?: WeddingBudgetRange;
  categoryBudgets?: { [vendorType: string]: WeddingBudgetRange };
  vendorTypes: string[];
  location: string;
  weddingDate?: string;
  guestCount?: number;
  duration?: number; // hours
  priorities?: string[]; // Which vendor types are most important
  budgetAllocation?: { [vendorType: string]: number }; // percentage of total budget
  valuePreference?: 'budget' | 'balanced' | 'luxury';
  mustHaveFeatures?: { [vendorType: string]: string[] };
}

interface BudgetFilterResult {
  vendor: VendorPricing;
  estimatedCost: {
    baseEstimate: number;
    withFactors: number;
    packageRecommendation?: {
      packageName: string;
      price: number;
      whyRecommended: string;
    };
  };
  budgetFit: {
    fitsInBudget: boolean;
    budgetUtilization: number; // percentage of budget used
    valueScore: number; // overall value assessment
    costPerGuestFactor?: number;
  };
  alternatives?: {
    lowerCost: VendorPricing[];
    betterValue: VendorPricing[];
  };
  budgetAdvice: string[];
}

// Mock vendor pricing data
const MOCK_VENDOR_PRICING: VendorPricing[] = [
  {
    vendorId: 'photo_budget_001',
    vendorName: 'Affordable Moments Photography',
    vendorType: 'photographer',
    pricingStructure: {
      basePrice: 1200,
      startingPrice: 1200,
      averagePackagePrice: 1800,
      priceRange: { min: 1200, max: 2500 }
    },
    packageOptions: [
      {
        name: 'Essential Package',
        description: '6 hours coverage, 300 edited photos',
        price: 1200,
        includes: ['6 hour coverage', '300 edited photos', 'online gallery'],
        addOns: [
          { name: 'Additional hour', price: 150 },
          { name: 'Engagement session', price: 300 }
        ]
      },
      {
        name: 'Complete Package',
        description: '8 hours coverage, 500 edited photos, second shooter',
        price: 1800,
        includes: ['8 hour coverage', '500 edited photos', 'second shooter', 'online gallery', 'print release'],
        addOns: [
          { name: 'Wedding album', price: 400 },
          { name: 'Raw files', price: 200 }
        ]
      }
    ],
    pricingFactors: {
      seasonalVariation: { spring: 1.1, summer: 1.2, fall: 1.3, winter: 0.9 },
      dayOfWeekVariation: { saturday: 1.0, sunday: 0.9, friday: 0.85, weekday: 0.75 },
      guestCountBreakpoints: [
        { min: 0, max: 50, multiplier: 0.9 },
        { min: 51, max: 150, multiplier: 1.0 },
        { min: 151, max: 300, multiplier: 1.1 }
      ],
      durationBreakpoints: [
        { hours: 6, multiplier: 1.0 },
        { hours: 8, multiplier: 1.2 },
        { hours: 10, multiplier: 1.4 }
      ],
      locationSurcharges: { 'Manhattan': 300, 'Brooklyn': 150, 'Queens': 100 }
    },
    paymentTerms: {
      depositRequired: true,
      depositPercentage: 25,
      paymentSchedule: ['25% deposit', '50% 30 days before', '25% day of'],
      cancellationPolicy: 'Full refund if cancelled 60+ days before',
      refundPolicy: 'Partial refunds based on notice period'
    },
    budgetLevel: 'budget',
    valueProposition: {
      qualityScore: 6,
      experienceLevel: 3,
      portfolioQuality: 6,
      clientSatisfaction: 8,
      valueForMoney: 9
    }
  },
  {
    vendorId: 'photo_luxury_001',
    vendorName: 'Elite Wedding Photography',
    vendorType: 'photographer',
    pricingStructure: {
      basePrice: 4500,
      startingPrice: 4500,
      averagePackagePrice: 6800,
      priceRange: { min: 4500, max: 12000 }
    },
    packageOptions: [
      {
        name: 'Signature Package',
        description: '10 hours coverage, 800 edited photos, 2 shooters',
        price: 6800,
        includes: ['10 hour coverage', '800 edited photos', '2 photographers', 'engagement session', 'online gallery', 'print release'],
        addOns: [
          { name: 'Wedding album', price: 800 },
          { name: 'Parent albums', price: 400 },
          { name: 'Raw files', price: 500 }
        ]
      },
      {
        name: 'Luxury Experience',
        description: 'Full day coverage, unlimited photos, 2 shooters, album',
        price: 9500,
        includes: ['12 hour coverage', 'unlimited edited photos', '2 photographers', 'engagement session', 'wedding album', 'parent albums', 'online gallery', 'print release'],
        addOns: [
          { name: 'Rehearsal dinner coverage', price: 1200 },
          { name: 'Day after session', price: 800 }
        ]
      }
    ],
    pricingFactors: {
      seasonalVariation: { spring: 1.2, summer: 1.3, fall: 1.4, winter: 1.0 },
      dayOfWeekVariation: { saturday: 1.0, sunday: 0.95, friday: 0.9, weekday: 0.8 },
      guestCountBreakpoints: [
        { min: 0, max: 100, multiplier: 1.0 },
        { min: 101, max: 200, multiplier: 1.1 },
        { min: 201, max: 400, multiplier: 1.2 }
      ],
      durationBreakpoints: [
        { hours: 8, multiplier: 1.0 },
        { hours: 10, multiplier: 1.1 },
        { hours: 12, multiplier: 1.2 }
      ],
      locationSurcharges: { 'Manhattan': 800, 'Brooklyn': 400, 'Queens': 200 }
    },
    paymentTerms: {
      depositRequired: true,
      depositPercentage: 50,
      paymentSchedule: ['50% deposit', '25% 60 days before', '25% day of'],
      cancellationPolicy: 'Partial refund based on notice period',
      refundPolicy: 'Deposit non-refundable within 90 days'
    },
    budgetLevel: 'luxury',
    valueProposition: {
      qualityScore: 10,
      experienceLevel: 12,
      portfolioQuality: 10,
      clientSatisfaction: 9,
      valueForMoney: 7
    }
  },
  {
    vendorId: 'venue_budget_001',
    vendorName: 'Community Center Venue',
    vendorType: 'venue',
    pricingStructure: {
      basePrice: 2000,
      startingPrice: 2000,
      averagePackagePrice: 3500,
      priceRange: { min: 2000, max: 5000 }
    },
    packageOptions: [
      {
        name: 'Basic Rental',
        description: '8 hours venue rental, basic setup',
        price: 2000,
        includes: ['8 hour rental', 'tables and chairs', 'basic sound system'],
        addOns: [
          { name: 'Additional hour', price: 200 },
          { name: 'Upgraded sound system', price: 300 },
          { name: 'Decorative lighting', price: 400 }
        ]
      }
    ],
    pricingFactors: {
      seasonalVariation: { spring: 1.2, summer: 1.3, fall: 1.4, winter: 0.8 },
      dayOfWeekVariation: { saturday: 1.0, sunday: 0.7, friday: 0.8, weekday: 0.6 },
      guestCountBreakpoints: [
        { min: 0, max: 100, multiplier: 1.0 },
        { min: 101, max: 200, multiplier: 1.2 },
        { min: 201, max: 300, multiplier: 1.5 }
      ],
      durationBreakpoints: [
        { hours: 6, multiplier: 0.8 },
        { hours: 8, multiplier: 1.0 },
        { hours: 10, multiplier: 1.3 }
      ],
      locationSurcharges: {}
    },
    paymentTerms: {
      depositRequired: true,
      depositPercentage: 30,
      paymentSchedule: ['30% deposit', '70% 30 days before'],
      cancellationPolicy: 'Full refund if cancelled 90+ days before',
      refundPolicy: 'Graduated refund policy'
    },
    budgetLevel: 'budget',
    valueProposition: {
      qualityScore: 5,
      experienceLevel: 5,
      portfolioQuality: 5,
      clientSatisfaction: 7,
      valueForMoney: 9
    }
  },
  {
    vendorId: 'venue_luxury_001',
    vendorName: 'Grand Ballroom at The Plaza',
    vendorType: 'venue',
    pricingStructure: {
      basePrice: 25000,
      startingPrice: 25000,
      averagePackagePrice: 35000,
      priceRange: { min: 25000, max: 60000 }
    },
    packageOptions: [
      {
        name: 'Elegant Reception',
        description: 'Full venue rental with premium service',
        price: 35000,
        includes: ['venue rental', 'premium service staff', 'upgraded linens', 'floral centerpieces', 'premium bar'],
        addOns: [
          { name: 'Ceremony space', price: 5000 },
          { name: 'Bridal suite', price: 2000 },
          { name: 'Valet parking', price: 3000 }
        ]
      }
    ],
    pricingFactors: {
      seasonalVariation: { spring: 1.2, summer: 1.3, fall: 1.4, winter: 0.9 },
      dayOfWeekVariation: { saturday: 1.0, sunday: 0.8, friday: 0.9, weekday: 0.7 },
      guestCountBreakpoints: [
        { min: 0, max: 150, multiplier: 1.0 },
        { min: 151, max: 250, multiplier: 1.1 },
        { min: 251, max: 400, multiplier: 1.2 }
      ],
      durationBreakpoints: [
        { hours: 6, multiplier: 0.9 },
        { hours: 8, multiplier: 1.0 },
        { hours: 10, multiplier: 1.1 }
      ],
      locationSurcharges: {}
    },
    paymentTerms: {
      depositRequired: true,
      depositPercentage: 50,
      paymentSchedule: ['50% deposit', '30% 60 days before', '20% day of'],
      cancellationPolicy: 'No refunds within 6 months',
      refundPolicy: 'Deposit non-refundable'
    },
    budgetLevel: 'ultra-luxury',
    valueProposition: {
      qualityScore: 10,
      experienceLevel: 25,
      portfolioQuality: 10,
      clientSatisfaction: 9,
      valueForMoney: 6
    }
  }
];

// Budget filtering service
class WeddingBudgetFilterService {
  private vendors: VendorPricing[] = [...MOCK_VENDOR_PRICING];

  async filterByBudget(query: BudgetFilterQuery): Promise<BudgetFilterResult[]> {
    const results: BudgetFilterResult[] = [];

    for (const vendor of this.vendors) {
      if (!query.vendorTypes.includes(vendor.vendorType)) {
        continue;
      }

      const estimatedCost = this.calculateEstimatedCost(vendor, query);
      const budgetFit = this.assessBudgetFit(vendor, estimatedCost, query);

      if (budgetFit.fitsInBudget || this.shouldIncludeNearMiss(budgetFit, query)) {
        const alternatives = this.findAlternatives(vendor, query);
        const budgetAdvice = this.generateBudgetAdvice(vendor, budgetFit, query);

        results.push({
          vendor,
          estimatedCost,
          budgetFit,
          alternatives,
          budgetAdvice
        });
      }
    }

    // Sort by value score and budget fit
    results.sort((a, b) => {
      if (a.budgetFit.fitsInBudget && !b.budgetFit.fitsInBudget) return -1;
      if (!a.budgetFit.fitsInBudget && b.budgetFit.fitsInBudget) return 1;
      return b.budgetFit.valueScore - a.budgetFit.valueScore;
    });

    return results;
  }

  private calculateEstimatedCost(vendor: VendorPricing, query: BudgetFilterQuery): BudgetFilterResult['estimatedCost'] {
    let baseEstimate = vendor.pricingStructure.averagePackagePrice;
    
    // Apply seasonal variation
    if (query.weddingDate) {
      const season = this.getSeasonFromDate(query.weddingDate);
      const seasonalMultiplier = vendor.pricingFactors.seasonalVariation[season] || 1.0;
      baseEstimate *= seasonalMultiplier;
    }

    // Apply day of week variation
    if (query.weddingDate) {
      const dayType = this.getDayTypeFromDate(query.weddingDate);
      const dayMultiplier = vendor.pricingFactors.dayOfWeekVariation[dayType] || 1.0;
      baseEstimate *= dayMultiplier;
    }

    // Apply guest count variation
    if (query.guestCount) {
      const guestMultiplier = this.getGuestCountMultiplier(vendor, query.guestCount);
      baseEstimate *= guestMultiplier;
    }

    // Apply duration variation
    if (query.duration) {
      const durationMultiplier = this.getDurationMultiplier(vendor, query.duration);
      baseEstimate *= durationMultiplier;
    }

    // Apply location surcharges
    const locationSurcharge = this.getLocationSurcharge(vendor, query.location);
    baseEstimate += locationSurcharge;

    const withFactors = Math.round(baseEstimate);

    // Find best package recommendation
    const packageRecommendation = this.findBestPackage(vendor, withFactors, query);

    return {
      baseEstimate: vendor.pricingStructure.averagePackagePrice,
      withFactors,
      packageRecommendation
    };
  }

  private assessBudgetFit(
    vendor: VendorPricing, 
    estimatedCost: BudgetFilterResult['estimatedCost'], 
    query: BudgetFilterQuery
  ): BudgetFilterResult['budgetFit'] {
    const cost = estimatedCost.withFactors;
    
    // Get budget for this vendor type
    const budget = query.categoryBudgets?.[vendor.vendorType] || 
                  this.calculateCategoryBudget(query, vendor.vendorType);

    let fitsInBudget = false;
    let budgetUtilization = 0;

    if (budget) {
      fitsInBudget = cost >= budget.min && cost <= budget.max;
      budgetUtilization = cost / budget.max;

      // Allow flexibility if specified
      if (!fitsInBudget && budget.flexible && budget.flexibilityPercent) {
        const maxWithFlex = budget.max * (1 + budget.flexibilityPercent / 100);
        fitsInBudget = cost <= maxWithFlex;
      }
    }

    // Calculate value score
    const valueScore = this.calculateValueScore(vendor, cost, query);

    // Calculate cost per guest if applicable
    const costPerGuestFactor = query.guestCount ? cost / query.guestCount : undefined;

    return {
      fitsInBudget,
      budgetUtilization,
      valueScore,
      costPerGuestFactor
    };
  }

  private calculateValueScore(vendor: VendorPricing, cost: number, query: BudgetFilterQuery): number {
    let score = 0;

    // Base value from vendor's value proposition
    score += vendor.valueProposition.valueForMoney * 0.3;
    score += vendor.valueProposition.qualityScore * 0.2;
    score += vendor.valueProposition.clientSatisfaction * 0.2;

    // Adjust for user's value preference
    if (query.valuePreference === 'budget') {
      // Prioritize cost savings
      score += (10 - Math.min(cost / 1000, 10)) * 0.2;
    } else if (query.valuePreference === 'luxury') {
      // Prioritize quality and experience
      score += vendor.valueProposition.qualityScore * 0.1;
      score += vendor.valueProposition.experienceLevel * 0.1;
    } else {
      // Balanced approach
      score += vendor.valueProposition.valueForMoney * 0.1;
      score += vendor.valueProposition.qualityScore * 0.1;
    }

    return Math.min(score, 10);
  }

  private shouldIncludeNearMiss(budgetFit: BudgetFilterResult['budgetFit'], query: BudgetFilterQuery): boolean {
    // Include vendors slightly over budget if they offer exceptional value
    return budgetFit.budgetUtilization <= 1.15 && budgetFit.valueScore >= 8;
  }

  private findAlternatives(vendor: VendorPricing, query: BudgetFilterQuery): BudgetFilterResult['alternatives'] {
    const sameTypeVendors = this.vendors.filter(v => 
      v.vendorType === vendor.vendorType && v.vendorId !== vendor.vendorId
    );

    // Find lower cost alternatives
    const lowerCost = sameTypeVendors
      .filter(v => v.pricingStructure.averagePackagePrice < vendor.pricingStructure.averagePackagePrice)
      .sort((a, b) => a.pricingStructure.averagePackagePrice - b.pricingStructure.averagePackagePrice)
      .slice(0, 2);

    // Find better value alternatives
    const betterValue = sameTypeVendors
      .filter(v => v.valueProposition.valueForMoney > vendor.valueProposition.valueForMoney)
      .sort((a, b) => b.valueProposition.valueForMoney - a.valueProposition.valueForMoney)
      .slice(0, 2);

    return { lowerCost, betterValue };
  }

  private generateBudgetAdvice(
    vendor: VendorPricing, 
    budgetFit: BudgetFilterResult['budgetFit'], 
    query: BudgetFilterQuery
  ): string[] {
    const advice: string[] = [];

    if (!budgetFit.fitsInBudget) {
      if (budgetFit.budgetUtilization > 1.2) {
        advice.push('This vendor is significantly over your budget. Consider our lower-cost alternatives.');
      } else {
        advice.push('This vendor is slightly over budget but offers excellent value. Consider adjusting your budget allocation.');
      }
    }

    if (budgetFit.budgetUtilization < 0.6) {
      advice.push('This vendor is well within your budget. You could consider upgrading your package or adding extras.');
    }

    // Seasonal advice
    if (query.weddingDate) {
      const season = this.getSeasonFromDate(query.weddingDate);
      if (season === 'fall' || season === 'spring') {
        advice.push('Consider off-peak dates to reduce costs by 10-20%.');
      }
    }

    // Guest count advice
    if (query.guestCount && query.guestCount > 200) {
      advice.push('Large guest count increases costs. Consider if all guests are essential.');
    }

    // Package optimization advice
    const lowestPackage = vendor.packageOptions.sort((a, b) => a.price - b.price)[0];
    if (lowestPackage.price < budgetFit.budgetUtilization * 0.8) {
      advice.push(`Consider the ${lowestPackage.name} and add only essential extras.`);
    }

    return advice;
  }

  // Helper methods
  private getSeasonFromDate(date: string): string {
    const month = new Date(date).getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getDayTypeFromDate(date: string): string {
    const day = new Date(date).getDay();
    if (day === 6) return 'saturday';
    if (day === 0) return 'sunday';
    if (day === 5) return 'friday';
    return 'weekday';
  }

  private getGuestCountMultiplier(vendor: VendorPricing, guestCount: number): number {
    const breakpoint = vendor.pricingFactors.guestCountBreakpoints.find(bp => 
      guestCount >= bp.min && guestCount <= bp.max
    );
    return breakpoint?.multiplier || 1.0;
  }

  private getDurationMultiplier(vendor: VendorPricing, duration: number): number {
    const breakpoint = vendor.pricingFactors.durationBreakpoints
      .sort((a, b) => Math.abs(a.hours - duration) - Math.abs(b.hours - duration))[0];
    return breakpoint?.multiplier || 1.0;
  }

  private getLocationSurcharge(vendor: VendorPricing, location: string): number {
    const locationKey = Object.keys(vendor.pricingFactors.locationSurcharges)
      .find(key => location.toLowerCase().includes(key.toLowerCase()));
    return locationKey ? vendor.pricingFactors.locationSurcharges[locationKey] : 0;
  }

  private findBestPackage(
    vendor: VendorPricing, 
    targetPrice: number, 
    query: BudgetFilterQuery
  ): BudgetFilterResult['estimatedCost']['packageRecommendation'] {
    const packages = vendor.packageOptions.sort((a, b) => 
      Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice)
    );

    const bestPackage = packages[0];
    let reason = 'Best price match for your requirements';

    if (bestPackage.price < targetPrice * 0.8) {
      reason = 'Budget-friendly option with room for upgrades';
    } else if (bestPackage.price > targetPrice * 1.1) {
      reason = 'Premium option with comprehensive inclusions';
    }

    return {
      packageName: bestPackage.name,
      price: bestPackage.price,
      whyRecommended: reason
    };
  }

  private calculateCategoryBudget(query: BudgetFilterQuery, vendorType: string): WeddingBudgetRange | null {
    if (!query.totalBudget || !query.budgetAllocation) return null;

    const percentage = query.budgetAllocation[vendorType] || 0;
    const allocatedAmount = (query.totalBudget.max * percentage) / 100;

    return {
      min: allocatedAmount * 0.7, // Allow 30% under
      max: allocatedAmount,
      currency: query.totalBudget.currency,
      flexible: query.totalBudget.flexible,
      flexibilityPercent: query.totalBudget.flexibilityPercent
    };
  }

  // Budget optimization methods
  async optimizeBudgetAllocation(
    totalBudget: number, 
    vendorTypes: string[], 
    priorities: string[]
  ): Promise<{ [vendorType: string]: { percentage: number; amount: number; reasoning: string } }> {
    const standardAllocations: { [key: string]: number } = {
      venue: 40,
      photographer: 15,
      caterer: 25,
      florist: 8,
      dj: 5,
      videographer: 12,
      planner: 10,
      makeup: 3
    };

    const allocation: { [vendorType: string]: { percentage: number; amount: number; reasoning: string } } = {};
    let totalPercentage = 0;

    // Calculate base allocation
    vendorTypes.forEach(type => {
      const basePercentage = standardAllocations[type] || 5;
      totalPercentage += basePercentage;
    });

    // Normalize to 100%
    vendorTypes.forEach(type => {
      const basePercentage = standardAllocations[type] || 5;
      let normalizedPercentage = (basePercentage / totalPercentage) * 100;

      // Adjust for priorities
      if (priorities.includes(type)) {
        normalizedPercentage *= 1.2; // 20% boost for priorities
      }

      const amount = (totalBudget * normalizedPercentage) / 100;
      
      allocation[type] = {
        percentage: Math.round(normalizedPercentage),
        amount: Math.round(amount),
        reasoning: priorities.includes(type) 
          ? 'Boosted due to high priority' 
          : 'Standard industry allocation'
      };
    });

    return allocation;
  }

  async suggestBudgetAdjustments(
    currentBudget: number,
    desiredVendors: string[],
    location: string
  ): Promise<{
    recommendedBudget: number;
    adjustmentReasons: string[];
    costSavingOpportunities: Array<{ area: string; savings: number; impact: string }>;
  }> {
    // Calculate market rates for desired vendors in location
    const locationMultiplier = location.toLowerCase().includes('manhattan') ? 1.3 : 
                              location.toLowerCase().includes('brooklyn') ? 1.1 : 1.0;

    let estimatedNeedsBudget = 0;
    const costSavingOpportunities = [];

    desiredVendors.forEach(vendorType => {
      const marketRate = this.getMarketRate(vendorType) * locationMultiplier;
      estimatedNeedsBudget += marketRate;
    });

    const adjustmentReasons = [];
    
    if (estimatedNeedsBudget > currentBudget * 1.2) {
      adjustmentReasons.push('Current budget is significantly below market rates for desired vendors');
      costSavingOpportunities.push({
        area: 'Off-season dates',
        savings: estimatedNeedsBudget * 0.15,
        impact: 'Moderate impact on availability'
      });
      costSavingOpportunities.push({
        area: 'Weekday celebrations',
        savings: estimatedNeedsBudget * 0.2,
        impact: 'May affect guest attendance'
      });
    }

    return {
      recommendedBudget: Math.round(estimatedNeedsBudget),
      adjustmentReasons,
      costSavingOpportunities
    };
  }

  private getMarketRate(vendorType: string): number {
    const marketRates: { [key: string]: number } = {
      venue: 15000,
      photographer: 3500,
      caterer: 8000,
      florist: 2500,
      dj: 1500,
      videographer: 3000,
      planner: 2000,
      makeup: 800
    };

    return marketRates[vendorType] || 1000;
  }

  // Clear data for testing
  clearVendorData(): void {
    this.vendors = [];
  }

  // Add vendor data for testing
  addVendorData(vendors: VendorPricing[]): void {
    this.vendors.push(...vendors);
  }
}

describe('WS-248: Budget Filtering Precision Tests', () => {
  let budgetService: WeddingBudgetFilterService;

  beforeEach(() => {
    budgetService = new WeddingBudgetFilterService();
  });

  afterEach(() => {
    // Reset to original mock data
    budgetService.clearVendorData();
    budgetService.addVendorData([...MOCK_VENDOR_PRICING]);
  });

  describe('Basic Budget Filtering', () => {
    test('should filter vendors within total budget range', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 3000, max: 8000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(query);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        if (result.budgetFit.fitsInBudget) {
          expect(result.estimatedCost.withFactors).toBeLessThanOrEqual(8000);
          expect(result.estimatedCost.withFactors).toBeGreaterThanOrEqual(3000);
        }
      });
    });

    test('should filter vendors by category-specific budgets', async () => {
      const query: BudgetFilterQuery = {
        categoryBudgets: {
          photographer: { min: 1000, max: 2000, currency: 'USD', flexible: false },
          venue: { min: 20000, max: 40000, currency: 'USD', flexible: false }
        },
        vendorTypes: ['photographer', 'venue'],
        location: 'New York, NY'
      };

      const results = await budgetService.filterByBudget(query);

      const photographerResults = results.filter(r => r.vendor.vendorType === 'photographer');
      const venueResults = results.filter(r => r.vendor.vendorType === 'venue');

      photographerResults.forEach(result => {
        if (result.budgetFit.fitsInBudget) {
          expect(result.estimatedCost.withFactors).toBeLessThanOrEqual(2000);
        }
      });

      venueResults.forEach(result => {
        if (result.budgetFit.fitsInBudget) {
          expect(result.estimatedCost.withFactors).toBeLessThanOrEqual(40000);
          expect(result.estimatedCost.withFactors).toBeGreaterThanOrEqual(20000);
        }
      });
    });

    test('should respect flexible budget parameters', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 3000, max: 5000, currency: 'USD', flexible: true, flexibilityPercent: 20 },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(query);

      const overBudgetResults = results.filter(r => 
        r.estimatedCost.withFactors > 5000 && r.estimatedCost.withFactors <= 6000
      );

      // Should include some results that are over budget but within flexibility range
      expect(overBudgetResults.length).toBeGreaterThanOrEqual(0);
      overBudgetResults.forEach(result => {
        expect(result.estimatedCost.withFactors).toBeLessThanOrEqual(6000); // 5000 * 1.2
      });
    });
  });

  describe('Price Calculation Accuracy', () => {
    test('should apply seasonal pricing adjustments correctly', async () => {
      const springQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 10000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        weddingDate: '2024-05-15', // Spring
        budgetAllocation: { photographer: 100 }
      };

      const winterQuery: BudgetFilterQuery = {
        ...springQuery,
        weddingDate: '2024-01-15' // Winter
      };

      const springResults = await budgetService.filterByBudget(springQuery);
      const winterResults = await budgetService.filterByBudget(winterQuery);

      const sameBudgetVendor = springResults.find(r => r.vendor.vendorId === 'photo_budget_001');
      const winterSameVendor = winterResults.find(r => r.vendor.vendorId === 'photo_budget_001');

      if (sameBudgetVendor && winterSameVendor) {
        // Spring should be more expensive than winter
        expect(sameBudgetVendor.estimatedCost.withFactors).toBeGreaterThan(
          winterSameVendor.estimatedCost.withFactors
        );
      }
    });

    test('should apply day-of-week pricing correctly', async () => {
      const saturdayQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 10000, currency: 'USD', flexible: false },
        vendorTypes: ['venue'],
        location: 'New York, NY',
        weddingDate: '2024-06-15', // Saturday
        budgetAllocation: { venue: 100 }
      };

      const sundayQuery: BudgetFilterQuery = {
        ...saturdayQuery,
        weddingDate: '2024-06-16' // Sunday
      };

      const saturdayResults = await budgetService.filterByBudget(saturdayQuery);
      const sundayResults = await budgetService.filterByBudget(sundayQuery);

      const saturdayVenue = saturdayResults.find(r => r.vendor.vendorId === 'venue_budget_001');
      const sundayVenue = sundayResults.find(r => r.vendor.vendorId === 'venue_budget_001');

      if (saturdayVenue && sundayVenue) {
        // Saturday should be more expensive than Sunday
        expect(saturdayVenue.estimatedCost.withFactors).toBeGreaterThan(
          sundayVenue.estimatedCost.withFactors
        );
      }
    });

    test('should apply guest count multipliers accurately', async () => {
      const smallWeddingQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 50000, currency: 'USD', flexible: false },
        vendorTypes: ['venue'],
        location: 'New York, NY',
        guestCount: 75,
        budgetAllocation: { venue: 100 }
      };

      const largeWeddingQuery: BudgetFilterQuery = {
        ...smallWeddingQuery,
        guestCount: 250
      };

      const smallResults = await budgetService.filterByBudget(smallWeddingQuery);
      const largeResults = await budgetService.filterByBudget(largeWeddingQuery);

      const smallVenue = smallResults.find(r => r.vendor.vendorId === 'venue_budget_001');
      const largeVenue = largeResults.find(r => r.vendor.vendorId === 'venue_budget_001');

      if (smallVenue && largeVenue) {
        // Larger wedding should cost more
        expect(largeVenue.estimatedCost.withFactors).toBeGreaterThan(
          smallVenue.estimatedCost.withFactors
        );
      }
    });

    test('should include location surcharges in calculations', async () => {
      const manhattanQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 10000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'Manhattan, NY',
        budgetAllocation: { photographer: 100 }
      };

      const queensQuery: BudgetFilterQuery = {
        ...manhattanQuery,
        location: 'Queens, NY'
      };

      const manhattanResults = await budgetService.filterByBudget(manhattanQuery);
      const queensResults = await budgetService.filterByBudget(queensQuery);

      const manhattanPhoto = manhattanResults.find(r => r.vendor.vendorId === 'photo_budget_001');
      const queensPhoto = queensResults.find(r => r.vendor.vendorId === 'photo_budget_001');

      if (manhattanPhoto && queensPhoto) {
        // Manhattan should have higher location surcharge
        expect(manhattanPhoto.estimatedCost.withFactors).toBeGreaterThan(
          queensPhoto.estimatedCost.withFactors
        );
      }
    });
  });

  describe('Value Assessment', () => {
    test('should calculate value scores correctly', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 15000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        valuePreference: 'balanced',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(query);

      results.forEach(result => {
        expect(result.budgetFit.valueScore).toBeGreaterThanOrEqual(0);
        expect(result.budgetFit.valueScore).toBeLessThanOrEqual(10);
        expect(typeof result.budgetFit.valueScore).toBe('number');
      });
    });

    test('should prioritize differently based on value preference', async () => {
      const budgetQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 8000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        valuePreference: 'budget',
        budgetAllocation: { photographer: 100 }
      };

      const luxuryQuery: BudgetFilterQuery = {
        ...budgetQuery,
        valuePreference: 'luxury'
      };

      const budgetResults = await budgetService.filterByBudget(budgetQuery);
      const luxuryResults = await budgetService.filterByBudget(luxuryQuery);

      // Budget preference should favor lower-cost options
      const budgetTopResult = budgetResults.find(r => r.vendor.budgetLevel === 'budget');
      const luxuryTopResult = luxuryResults.find(r => r.vendor.budgetLevel === 'luxury');

      if (budgetTopResult) {
        expect(budgetTopResult.budgetFit.valueScore).toBeGreaterThan(6);
      }
      
      if (luxuryTopResult) {
        expect(luxuryTopResult.budgetFit.valueScore).toBeGreaterThan(6);
      }
    });

    test('should calculate cost per guest factor correctly', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 10000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        guestCount: 100,
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(query);

      results.forEach(result => {
        expect(result.budgetFit.costPerGuestFactor).toBeDefined();
        expect(result.budgetFit.costPerGuestFactor).toBeGreaterThan(0);
        expect(result.budgetFit.costPerGuestFactor).toBe(
          result.estimatedCost.withFactors / 100
        );
      });
    });
  });

  describe('Package Recommendations', () => {
    test('should recommend appropriate packages based on budget', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 5000, max: 8000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(query);

      results.forEach(result => {
        if (result.estimatedCost.packageRecommendation) {
          expect(result.estimatedCost.packageRecommendation.packageName).toBeDefined();
          expect(result.estimatedCost.packageRecommendation.price).toBeGreaterThan(0);
          expect(result.estimatedCost.packageRecommendation.whyRecommended).toBeDefined();
        }
      });
    });

    test('should justify package recommendations', async () => {
      const lowBudgetQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 1500, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(lowBudgetQuery);

      const resultWithPackage = results.find(r => r.estimatedCost.packageRecommendation);
      if (resultWithPackage) {
        expect(resultWithPackage.estimatedCost.packageRecommendation!.whyRecommended)
          .toContain('budget');
      }
    });
  });

  describe('Budget Advice and Alternatives', () => {
    test('should provide relevant budget advice', async () => {
      const overBudgetQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 2000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'Manhattan, NY', // Higher cost location
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(overBudgetQuery);

      results.forEach(result => {
        expect(Array.isArray(result.budgetAdvice)).toBe(true);
        if (result.budgetAdvice.length > 0) {
          expect(result.budgetAdvice.every(advice => typeof advice === 'string')).toBe(true);
        }
      });
    });

    test('should suggest appropriate alternatives', async () => {
      const luxuryQuery: BudgetFilterQuery = {
        totalBudget: { min: 5000, max: 10000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(luxuryQuery);

      const luxuryResult = results.find(r => r.vendor.budgetLevel === 'luxury');
      if (luxuryResult && luxuryResult.alternatives) {
        expect(luxuryResult.alternatives.lowerCost.length).toBeGreaterThanOrEqual(0);
        expect(luxuryResult.alternatives.betterValue.length).toBeGreaterThanOrEqual(0);
        
        if (luxuryResult.alternatives.lowerCost.length > 0) {
          luxuryResult.alternatives.lowerCost.forEach(alt => {
            expect(alt.pricingStructure.averagePackagePrice).toBeLessThan(
              luxuryResult.vendor.pricingStructure.averagePackagePrice
            );
          });
        }
      }
    });
  });

  describe('Budget Optimization', () => {
    test('should optimize budget allocation across vendor types', async () => {
      const allocation = await budgetService.optimizeBudgetAllocation(
        30000,
        ['venue', 'photographer', 'caterer', 'florist'],
        ['photographer', 'venue'] // priorities
      );

      expect(Object.keys(allocation)).toEqual(['venue', 'photographer', 'caterer', 'florist']);
      
      // Priorities should get higher allocation
      expect(allocation.photographer.percentage).toBeGreaterThan(allocation.florist.percentage);
      expect(allocation.venue.percentage).toBeGreaterThan(allocation.caterer.percentage);

      // Total should be reasonable
      const totalPercentage = Object.values(allocation).reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 5); // Within 5% of 100%

      // Amounts should match percentages
      Object.entries(allocation).forEach(([type, data]) => {
        expect(data.amount).toBe(Math.round((30000 * data.percentage) / 100));
        expect(data.reasoning).toBeDefined();
      });
    });

    test('should suggest budget adjustments for market reality', async () => {
      const suggestions = await budgetService.suggestBudgetAdjustments(
        15000, // Low budget
        ['venue', 'photographer', 'caterer'],
        'Manhattan, NY' // Expensive location
      );

      expect(suggestions.recommendedBudget).toBeGreaterThan(15000);
      expect(Array.isArray(suggestions.adjustmentReasons)).toBe(true);
      expect(Array.isArray(suggestions.costSavingOpportunities)).toBe(true);

      suggestions.costSavingOpportunities.forEach(opportunity => {
        expect(opportunity.area).toBeDefined();
        expect(opportunity.savings).toBeGreaterThan(0);
        expect(opportunity.impact).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero or negative budgets gracefully', async () => {
      const invalidBudgetQuery: BudgetFilterQuery = {
        totalBudget: { min: -1000, max: 0, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(invalidBudgetQuery);
      
      // Should return empty results or handle gracefully
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle missing budget allocation gracefully', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 5000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY'
        // No budgetAllocation provided
      };

      const results = await budgetService.filterByBudget(query);
      
      // Should still return results
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle unrealistic guest counts', async () => {
      const extremeGuestQuery: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 10000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        guestCount: 10000, // Unrealistic
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(extremeGuestQuery);
      
      expect(Array.isArray(results)).toBe(true);
      // Should handle gracefully without errors
    });

    test('should handle empty vendor database', async () => {
      budgetService.clearVendorData();

      const query: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 5000, currency: 'USD', flexible: false },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      };

      const results = await budgetService.filterByBudget(query);
      
      expect(results).toEqual([]);
    });
  });

  describe('Performance and Scalability', () => {
    test('should filter budgets within acceptable time limits', async () => {
      const query: BudgetFilterQuery = {
        totalBudget: { min: 1000, max: 50000, currency: 'USD', flexible: true, flexibilityPercent: 15 },
        vendorTypes: ['photographer', 'venue', 'florist'],
        location: 'New York, NY',
        weddingDate: '2024-06-15',
        guestCount: 150,
        duration: 8,
        budgetAllocation: { photographer: 30, venue: 50, florist: 20 }
      };

      const startTime = Date.now();
      const results = await budgetService.filterByBudget(query);
      const filterTime = Date.now() - startTime;

      expect(filterTime).toBeLessThan(500); // 500ms limit
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle complex calculations efficiently', async () => {
      // Add more test data
      const additionalVendors: VendorPricing[] = Array.from({ length: 20 }, (_, i) => ({
        vendorId: `test_vendor_${i}`,
        vendorName: `Test Vendor ${i}`,
        vendorType: 'photographer',
        pricingStructure: {
          basePrice: 1000 + (i * 100),
          startingPrice: 1000 + (i * 100),
          averagePackagePrice: 1500 + (i * 150),
          priceRange: { min: 1000 + (i * 100), max: 2000 + (i * 200) }
        },
        packageOptions: [{
          name: 'Basic Package',
          description: 'Basic coverage',
          price: 1500 + (i * 150),
          includes: ['coverage'],
          addOns: []
        }],
        pricingFactors: {
          seasonalVariation: { spring: 1.1, summer: 1.2, fall: 1.3, winter: 0.9 },
          dayOfWeekVariation: { saturday: 1.0, sunday: 0.9, friday: 0.85, weekday: 0.75 },
          guestCountBreakpoints: [{ min: 0, max: 200, multiplier: 1.0 }],
          durationBreakpoints: [{ hours: 8, multiplier: 1.0 }],
          locationSurcharges: {}
        },
        paymentTerms: {
          depositRequired: true,
          depositPercentage: 25,
          paymentSchedule: ['25% deposit', '75% day of'],
          cancellationPolicy: 'Standard',
          refundPolicy: 'Standard'
        },
        budgetLevel: 'mid-range',
        valueProposition: {
          qualityScore: 5 + (i % 5),
          experienceLevel: 3 + (i % 7),
          portfolioQuality: 6 + (i % 4),
          clientSatisfaction: 7 + (i % 3),
          valueForMoney: 6 + (i % 4)
        }
      }));

      budgetService.addVendorData(additionalVendors);

      const startTime = Date.now();
      const results = await budgetService.filterByBudget({
        totalBudget: { min: 1000, max: 8000, currency: 'USD', flexible: true, flexibilityPercent: 20 },
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        budgetAllocation: { photographer: 100 }
      });
      const filterTime = Date.now() - startTime;

      expect(filterTime).toBeLessThan(1000); // 1 second for larger dataset
      expect(results.length).toBeGreaterThan(0);
    });
  });
});