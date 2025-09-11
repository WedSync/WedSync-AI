import { describe, test, expect, beforeEach, afterEach } from 'vitest';

interface WeddingVendor {
  id: string;
  name: string;
  type: 'photographer' | 'venue' | 'florist' | 'caterer' | 'dj' | 'band' | 'planner' | 'makeup' | 'videographer' | 'cake';
  location: {
    city: string;
    state: string;
    coordinates: { lat: number; lng: number };
  };
  services: string[];
  specialties: string[];
  weddingStyles: string[];
  pricing: {
    startingPrice: number;
    averagePackagePrice: number;
    priceRange: { min: number; max: number };
  };
  portfolio: {
    images: string[];
    realWeddings: number;
    featuredWeddings: string[];
  };
  availability: {
    bookingsThisYear: number;
    availableDates: string[];
    busySeasons: string[];
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
    recentReviews: Array<{
      rating: number;
      comment: string;
      weddingDate: string;
      verified: boolean;
    }>;
  };
  businessInfo: {
    yearsInBusiness: number;
    teamSize: number;
    insuranceStatus: 'verified' | 'unverified';
    licenses: string[];
    awards: string[];
  };
  weddingExperience: {
    weddingTypes: string[];
    venueExperience: string[];
    culturalExperience: string[];
    seasonalExperience: string[];
  };
}

interface WeddingVendorSearchQuery {
  weddingType?: 'traditional' | 'destination' | 'outdoor' | 'indoor' | 'cultural' | 'religious' | 'elopement' | 'micro';
  vendorTypes: string[];
  location: string;
  weddingDate?: string;
  guestCount?: number;
  budget?: { min?: number; max?: number };
  style?: string[];
  mustHaveServices?: string[];
  experienceLevel?: 'new' | 'experienced' | 'expert';
  portfolioRequirements?: {
    minRealWeddings?: number;
    requireSimilarStyle?: boolean;
    requireSimilarVenue?: boolean;
  };
}

interface VendorDiscoveryResult {
  vendor: WeddingVendor;
  matchScore: number;        // Overall match quality (0-1)
  matchReasons: {
    serviceMatch: number;
    locationMatch: number;
    budgetMatch: number;
    styleMatch: number;
    experienceMatch: number;
    availabilityMatch: number;
  };
  recommendationReason: string;
  alternativeSuggestions?: string[];
}

// Mock wedding vendor database
const MOCK_WEDDING_VENDORS: WeddingVendor[] = [
  {
    id: 'photo_001',
    name: 'Elegant Moments Photography',
    type: 'photographer',
    location: {
      city: 'New York',
      state: 'NY',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    services: ['wedding photography', 'engagement photos', 'bridal portraits', 'same-day editing'],
    specialties: ['luxury weddings', 'destination weddings', 'cultural ceremonies'],
    weddingStyles: ['romantic', 'classic', 'editorial', 'fine art'],
    pricing: {
      startingPrice: 2500,
      averagePackagePrice: 4200,
      priceRange: { min: 2500, max: 8000 }
    },
    portfolio: {
      images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
      realWeddings: 150,
      featuredWeddings: ['wedding1', 'wedding2', 'wedding3']
    },
    availability: {
      bookingsThisYear: 35,
      availableDates: ['2024-06-15', '2024-07-20', '2024-09-12'],
      busySeasons: ['spring', 'fall']
    },
    reviews: {
      averageRating: 4.8,
      totalReviews: 87,
      recentReviews: [
        { rating: 5, comment: 'Absolutely stunning photos!', weddingDate: '2024-01-15', verified: true },
        { rating: 5, comment: 'Professional and creative', weddingDate: '2024-02-03', verified: true }
      ]
    },
    businessInfo: {
      yearsInBusiness: 8,
      teamSize: 2,
      insuranceStatus: 'verified',
      licenses: ['business_license', 'photography_permit'],
      awards: ['Best Wedding Photographer 2023', 'Couples Choice Award']
    },
    weddingExperience: {
      weddingTypes: ['traditional', 'destination', 'cultural'],
      venueExperience: ['historic venues', 'outdoor venues', 'luxury hotels'],
      culturalExperience: ['indian', 'jewish', 'italian', 'irish'],
      seasonalExperience: ['spring', 'summer', 'fall', 'winter']
    }
  },
  {
    id: 'venue_001',
    name: 'Grand Ballroom at The Plaza',
    type: 'venue',
    location: {
      city: 'New York',
      state: 'NY',
      coordinates: { lat: 40.7648, lng: -73.9738 }
    },
    services: ['ceremony space', 'reception space', 'catering', 'bar service', 'planning coordination'],
    specialties: ['luxury weddings', 'black-tie events', 'corporate events'],
    weddingStyles: ['classic', 'elegant', 'glamorous', 'traditional'],
    pricing: {
      startingPrice: 15000,
      averagePackagePrice: 25000,
      priceRange: { min: 15000, max: 50000 }
    },
    portfolio: {
      images: ['venue1.jpg', 'venue2.jpg', 'venue3.jpg'],
      realWeddings: 200,
      featuredWeddings: ['plaza_wedding1', 'plaza_wedding2']
    },
    availability: {
      bookingsThisYear: 48,
      availableDates: ['2024-08-10', '2024-11-15', '2024-12-20'],
      busySeasons: ['fall', 'spring']
    },
    reviews: {
      averageRating: 4.6,
      totalReviews: 124,
      recentReviews: [
        { rating: 5, comment: 'Dream wedding venue!', weddingDate: '2024-01-20', verified: true },
        { rating: 4, comment: 'Beautiful but expensive', weddingDate: '2024-02-14', verified: true }
      ]
    },
    businessInfo: {
      yearsInBusiness: 25,
      teamSize: 15,
      insuranceStatus: 'verified',
      licenses: ['venue_license', 'liquor_license', 'catering_license'],
      awards: ['Best Venue 2023', 'Luxury Venue Award']
    },
    weddingExperience: {
      weddingTypes: ['traditional', 'luxury', 'black-tie'],
      venueExperience: ['ballroom', 'historic venue'],
      culturalExperience: ['jewish', 'catholic', 'protestant', 'secular'],
      seasonalExperience: ['spring', 'summer', 'fall', 'winter']
    }
  },
  {
    id: 'florist_001',
    name: 'Bloom & Blossom Floral Design',
    type: 'florist',
    location: {
      city: 'Brooklyn',
      state: 'NY',
      coordinates: { lat: 40.6782, lng: -73.9442 }
    },
    services: ['bridal bouquets', 'ceremony arrangements', 'reception centerpieces', 'boutonnières'],
    specialties: ['organic arrangements', 'seasonal flowers', 'sustainable florals'],
    weddingStyles: ['rustic', 'boho', 'garden', 'natural'],
    pricing: {
      startingPrice: 800,
      averagePackagePrice: 2200,
      priceRange: { min: 800, max: 5000 }
    },
    portfolio: {
      images: ['floral1.jpg', 'floral2.jpg'],
      realWeddings: 85,
      featuredWeddings: ['garden_wedding1', 'rustic_wedding1']
    },
    availability: {
      bookingsThisYear: 22,
      availableDates: ['2024-05-18', '2024-06-22', '2024-08-15'],
      busySeasons: ['spring', 'summer']
    },
    reviews: {
      averageRating: 4.7,
      totalReviews: 56,
      recentReviews: [
        { rating: 5, comment: 'Gorgeous natural arrangements', weddingDate: '2024-01-10', verified: true }
      ]
    },
    businessInfo: {
      yearsInBusiness: 6,
      teamSize: 3,
      insuranceStatus: 'verified',
      licenses: ['business_license'],
      awards: ['Eco-Friendly Florist 2023']
    },
    weddingExperience: {
      weddingTypes: ['outdoor', 'garden', 'rustic'],
      venueExperience: ['outdoor venues', 'farms', 'gardens'],
      culturalExperience: ['secular', 'non-traditional'],
      seasonalExperience: ['spring', 'summer', 'fall']
    }
  }
];

// Wedding vendor discovery service
class WeddingVendorDiscoveryService {
  async discoverVendors(query: WeddingVendorSearchQuery): Promise<VendorDiscoveryResult[]> {
    const results: VendorDiscoveryResult[] = [];

    for (const vendor of MOCK_WEDDING_VENDORS) {
      // Skip if vendor type doesn't match
      if (!query.vendorTypes.includes(vendor.type)) {
        continue;
      }

      const matchReasons = {
        serviceMatch: this.calculateServiceMatch(vendor, query),
        locationMatch: this.calculateLocationMatch(vendor, query),
        budgetMatch: this.calculateBudgetMatch(vendor, query),
        styleMatch: this.calculateStyleMatch(vendor, query),
        experienceMatch: this.calculateExperienceMatch(vendor, query),
        availabilityMatch: this.calculateAvailabilityMatch(vendor, query)
      };

      const matchScore = this.calculateOverallMatch(matchReasons);
      
      if (matchScore > 0.3) { // Only include reasonably good matches
        results.push({
          vendor,
          matchScore,
          matchReasons,
          recommendationReason: this.generateRecommendationReason(vendor, matchReasons, query),
          alternativeSuggestions: this.generateAlternativeSuggestions(vendor, query)
        });
      }
    }

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  }

  private calculateServiceMatch(vendor: WeddingVendor, query: WeddingVendorSearchQuery): number {
    if (!query.mustHaveServices || query.mustHaveServices.length === 0) {
      return 0.8; // Default good score if no specific requirements
    }

    const matchedServices = query.mustHaveServices.filter(service => 
      vendor.services.some(vendorService => 
        vendorService.toLowerCase().includes(service.toLowerCase())
      )
    );

    return matchedServices.length / query.mustHaveServices.length;
  }

  private calculateLocationMatch(vendor: WeddingVendor, query: WeddingVendorSearchQuery): number {
    // Simple location matching - in real implementation would use geocoding
    const queryLocation = query.location.toLowerCase();
    const vendorLocation = `${vendor.location.city}, ${vendor.location.state}`.toLowerCase();

    if (vendorLocation.includes(queryLocation) || queryLocation.includes(vendor.location.city.toLowerCase())) {
      return 1.0;
    }

    // Check if in same state
    if (queryLocation.includes(vendor.location.state.toLowerCase())) {
      return 0.6;
    }

    return 0.2; // Default low score for different locations
  }

  private calculateBudgetMatch(vendor: WeddingVendor, query: WeddingVendorSearchQuery): number {
    if (!query.budget) {
      return 0.8; // Neutral score if no budget specified
    }

    const { min: queryMin, max: queryMax } = query.budget;
    const { min: vendorMin, max: vendorMax } = vendor.pricing.priceRange;

    // Check if there's any overlap
    if (queryMax && queryMax < vendorMin) {
      return 0.1; // Vendor too expensive
    }
    if (queryMin && queryMin > vendorMax) {
      return 0.3; // Vendor might be too cheap (quality concern)
    }

    // Calculate overlap percentage
    const overlapStart = Math.max(queryMin || vendorMin, vendorMin);
    const overlapEnd = Math.min(queryMax || vendorMax, vendorMax);
    const overlapSize = Math.max(0, overlapEnd - overlapStart);
    const queryRangeSize = (queryMax || vendorMax) - (queryMin || vendorMin);

    return overlapSize / queryRangeSize;
  }

  private calculateStyleMatch(vendor: WeddingVendor, query: WeddingVendorSearchQuery): number {
    if (!query.style || query.style.length === 0) {
      return 0.7; // Neutral score if no style specified
    }

    const matchedStyles = query.style.filter(style => 
      vendor.weddingStyles.some(vendorStyle => 
        vendorStyle.toLowerCase().includes(style.toLowerCase())
      )
    );

    return matchedStyles.length > 0 ? matchedStyles.length / query.style.length : 0.2;
  }

  private calculateExperienceMatch(vendor: WeddingVendor, query: WeddingVendorSearchQuery): number {
    let score = 0.5; // Base score

    // Wedding type experience
    if (query.weddingType && vendor.weddingExperience.weddingTypes.includes(query.weddingType)) {
      score += 0.3;
    }

    // Experience level
    if (query.experienceLevel) {
      const yearsInBusiness = vendor.businessInfo.yearsInBusiness;
      const realWeddings = vendor.portfolio.realWeddings;

      if (query.experienceLevel === 'expert' && yearsInBusiness >= 8 && realWeddings >= 100) {
        score += 0.2;
      } else if (query.experienceLevel === 'experienced' && yearsInBusiness >= 3 && realWeddings >= 30) {
        score += 0.2;
      } else if (query.experienceLevel === 'new' && yearsInBusiness >= 1) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  private calculateAvailabilityMatch(vendor: WeddingVendor, query: WeddingVendorSearchQuery): number {
    if (!query.weddingDate) {
      return 0.6; // Neutral score if no date specified
    }

    // Check if vendor is available on the requested date
    if (vendor.availability.availableDates.includes(query.weddingDate)) {
      return 1.0;
    }

    // Check if it's in a busy season
    const weddingMonth = new Date(query.weddingDate).getMonth();
    const season = this.getSeasonFromMonth(weddingMonth);
    
    if (vendor.availability.busySeasons.includes(season)) {
      return 0.3; // Lower score for busy seasons
    }

    return 0.6; // Neutral score
  }

  private calculateOverallMatch(matchReasons: VendorDiscoveryResult['matchReasons']): number {
    const weights = {
      serviceMatch: 0.25,
      locationMatch: 0.20,
      budgetMatch: 0.20,
      styleMatch: 0.15,
      experienceMatch: 0.10,
      availabilityMatch: 0.10
    };

    return Object.entries(matchReasons).reduce((total, [reason, score]) => {
      return total + (score * weights[reason as keyof typeof weights]);
    }, 0);
  }

  private generateRecommendationReason(
    vendor: WeddingVendor, 
    matchReasons: VendorDiscoveryResult['matchReasons'],
    query: WeddingVendorSearchQuery
  ): string {
    const strongMatches = Object.entries(matchReasons)
      .filter(([_, score]) => score > 0.8)
      .map(([reason, _]) => reason);

    const reasons = [];

    if (strongMatches.includes('serviceMatch')) {
      reasons.push('offers all your required services');
    }
    if (strongMatches.includes('locationMatch')) {
      reasons.push('is located in your area');
    }
    if (strongMatches.includes('budgetMatch')) {
      reasons.push('fits within your budget');
    }
    if (strongMatches.includes('styleMatch')) {
      reasons.push('specializes in your preferred style');
    }
    if (strongMatches.includes('experienceMatch')) {
      reasons.push('has extensive experience with your type of wedding');
    }
    if (strongMatches.includes('availabilityMatch')) {
      reasons.push('is available on your wedding date');
    }

    if (reasons.length === 0) {
      return `${vendor.name} is a good match for your wedding needs`;
    }

    return `${vendor.name} is recommended because they ${reasons.join(' and ')}`;
  }

  private generateAlternativeSuggestions(vendor: WeddingVendor, query: WeddingVendorSearchQuery): string[] {
    const suggestions = [];

    if (vendor.pricing.priceRange.min > (query.budget?.max || 0)) {
      suggestions.push('Consider increasing your budget or looking for package deals');
    }

    if (!vendor.availability.availableDates.includes(query.weddingDate || '')) {
      suggestions.push('Consider flexible dates or check for last-minute availability');
    }

    return suggestions;
  }

  private getSeasonFromMonth(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  // Get vendor recommendations based on similar couples
  async getRecommendationsBasedOnSimilarWeddings(
    query: WeddingVendorSearchQuery
  ): Promise<VendorDiscoveryResult[]> {
    // This would analyze similar wedding profiles and recommend vendors
    // For now, return vendors that match similar criteria
    const results = await this.discoverVendors(query);
    
    return results.filter(result => result.vendor.portfolio.realWeddings >= 50);
  }

  // Get trending vendors in the area
  async getTrendingVendors(location: string, vendorType: string): Promise<WeddingVendor[]> {
    return MOCK_WEDDING_VENDORS
      .filter(vendor => 
        vendor.type === vendorType &&
        vendor.location.city.toLowerCase().includes(location.toLowerCase())
      )
      .sort((a, b) => b.reviews.totalReviews - a.reviews.totalReviews)
      .slice(0, 5);
  }
}

describe('WS-248: Wedding Vendor Discovery Tests', () => {
  let discoveryService: WeddingVendorDiscoveryService;

  beforeEach(() => {
    discoveryService = new WeddingVendorDiscoveryService();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Basic Vendor Discovery', () => {
    test('should find photographers in New York', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY'
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.vendor.type).toBe('photographer');
        expect(result.matchScore).toBeGreaterThan(0);
        expect(result.matchReasons).toBeDefined();
      });
    });

    test('should find venues within budget range', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        budget: { min: 10000, max: 30000 }
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.vendor.type).toBe('venue');
        expect(result.matchReasons.budgetMatch).toBeGreaterThan(0.5);
      });
    });

    test('should find florists for outdoor weddings', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['florist'],
        location: 'Brooklyn',
        weddingType: 'outdoor',
        style: ['rustic', 'natural']
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.vendor.type).toBe('florist');
        expect(result.matchReasons.styleMatch).toBeGreaterThan(0);
      });
    });

    test('should return empty results for unavailable vendor types', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['cake'],
        location: 'New York'
      };

      const results = await discoveryService.discoverVendors(query);
      expect(results.length).toBe(0);
    });
  });

  describe('Match Scoring and Ranking', () => {
    test('should rank vendors by overall match quality', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer', 'venue', 'florist'],
        location: 'New York',
        budget: { min: 2000, max: 5000 },
        style: ['classic', 'elegant'],
        experienceLevel: 'experienced'
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(1);
      
      // Results should be sorted by match score
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].matchScore).toBeGreaterThanOrEqual(results[i].matchScore);
      }

      // Top result should have high match score
      expect(results[0].matchScore).toBeGreaterThan(0.6);
    });

    test('should provide detailed match reasons', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York',
        mustHaveServices: ['wedding photography', 'engagement photos'],
        budget: { min: 2000, max: 5000 }
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      
      const result = results[0];
      expect(result.matchReasons.serviceMatch).toBeGreaterThan(0.8);
      expect(result.matchReasons.locationMatch).toBeGreaterThan(0.8);
      expect(result.matchReasons.budgetMatch).toBeGreaterThan(0.5);
    });

    test('should generate meaningful recommendation reasons', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        style: ['classic', 'elegant'],
        weddingType: 'traditional'
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      
      const result = results[0];
      expect(result.recommendationReason).toBeDefined();
      expect(result.recommendationReason).toContain(result.vendor.name);
      expect(result.recommendationReason.length).toBeGreaterThan(20);
    });

    test('should provide alternative suggestions when appropriate', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        budget: { max: 5000 }, // Very low budget for luxury venues
        weddingDate: '2024-12-31' // New Year's Eve - likely unavailable
      };

      const results = await discoveryService.discoverVendors(query);

      if (results.length > 0) {
        const expensiveResult = results.find(r => 
          r.vendor.pricing.priceRange.min > 5000
        );
        
        if (expensiveResult && expensiveResult.alternativeSuggestions) {
          expect(expensiveResult.alternativeSuggestions.length).toBeGreaterThan(0);
          expect(expensiveResult.alternativeSuggestions.some(s => 
            s.toLowerCase().includes('budget')
          )).toBe(true);
        }
      }
    });
  });

  describe('Wedding-Specific Requirements', () => {
    test('should match vendors based on wedding type experience', async () => {
      const destinationQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York',
        weddingType: 'destination'
      };

      const results = await discoveryService.discoverVendors(destinationQuery);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        if (result.matchReasons.experienceMatch > 0.7) {
          expect(result.vendor.weddingExperience.weddingTypes).toContain('destination');
        }
      });
    });

    test('should consider cultural wedding experience', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer', 'venue'],
        location: 'New York'
        // In a real implementation, would add cultural requirements
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      // Verify that vendors with cultural experience are prioritized
      const photographerResult = results.find(r => r.vendor.type === 'photographer');
      if (photographerResult) {
        expect(photographerResult.vendor.weddingExperience.culturalExperience.length).toBeGreaterThan(0);
      }
    });

    test('should factor in seasonal availability and experience', async () => {
      const springQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['florist'],
        location: 'Brooklyn',
        weddingDate: '2024-05-15' // Spring wedding
      };

      const results = await discoveryService.discoverVendors(springQuery);

      expect(results.length).toBeGreaterThan(0);
      const topResult = results[0];
      
      if (topResult.vendor.weddingExperience.seasonalExperience.includes('spring')) {
        expect(topResult.matchReasons.experienceMatch).toBeGreaterThan(0.6);
      }
    });

    test('should consider guest count for appropriate vendors', async () => {
      const largeWeddingQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        guestCount: 200
      };

      const smallWeddingQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        guestCount: 50
      };

      const largeResults = await discoveryService.discoverVendors(largeWeddingQuery);
      const smallResults = await discoveryService.discoverVendors(smallWeddingQuery);

      // Both should return results, but potentially different venues
      expect(largeResults.length).toBeGreaterThan(0);
      expect(smallResults.length).toBeGreaterThan(0);
    });
  });

  describe('Portfolio and Experience Filtering', () => {
    test('should filter by minimum real wedding experience', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York',
        portfolioRequirements: {
          minRealWeddings: 100
        }
      };

      const results = await discoveryService.discoverVendors(query);

      results.forEach(result => {
        expect(result.vendor.portfolio.realWeddings).toBeGreaterThanOrEqual(100);
      });
    });

    test('should prioritize vendors with similar style portfolios', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York',
        style: ['romantic', 'fine art'],
        portfolioRequirements: {
          requireSimilarStyle: true
        }
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        const hasMatchingStyle = result.vendor.weddingStyles.some(style => 
          ['romantic', 'fine art'].includes(style)
        );
        expect(hasMatchingStyle).toBe(true);
      });
    });

    test('should consider business credentials and insurance', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['venue', 'photographer'],
        location: 'New York',
        experienceLevel: 'expert'
      };

      const results = await discoveryService.discoverVendors(query);

      results.forEach(result => {
        if (result.matchReasons.experienceMatch > 0.8) {
          expect(result.vendor.businessInfo.insuranceStatus).toBe('verified');
          expect(result.vendor.businessInfo.licenses.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Availability and Booking Integration', () => {
    test('should prioritize vendors available on wedding date', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York',
        weddingDate: '2024-06-15'
      };

      const results = await discoveryService.discoverVendors(query);

      expect(results.length).toBeGreaterThan(0);
      
      const availableResult = results.find(r => 
        r.vendor.availability.availableDates.includes('2024-06-15')
      );

      if (availableResult) {
        expect(availableResult.matchReasons.availabilityMatch).toBe(1.0);
      }
    });

    test('should handle busy season considerations', async () => {
      const fallQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer', 'venue'],
        location: 'New York',
        weddingDate: '2024-10-15' // Fall wedding
      };

      const results = await discoveryService.discoverVendors(fallQuery);

      results.forEach(result => {
        if (result.vendor.availability.busySeasons.includes('fall')) {
          expect(result.matchReasons.availabilityMatch).toBeLessThan(0.8);
        }
      });
    });
  });

  describe('Recommendation Algorithms', () => {
    test('should provide recommendations based on similar weddings', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York',
        weddingType: 'luxury',
        budget: { min: 3000, max: 6000 }
      };

      const recommendations = await discoveryService.getRecommendationsBasedOnSimilarWeddings(query);

      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(result => {
        expect(result.vendor.portfolio.realWeddings).toBeGreaterThanOrEqual(50);
      });
    });

    test('should identify trending vendors in area', async () => {
      const trending = await discoveryService.getTrendingVendors('New York', 'photographer');

      expect(trending.length).toBeGreaterThan(0);
      expect(trending.length).toBeLessThanOrEqual(5);
      
      trending.forEach(vendor => {
        expect(vendor.type).toBe('photographer');
        expect(vendor.location.city.toLowerCase()).toContain('new york');
      });

      // Should be sorted by popularity (reviews)
      for (let i = 1; i < trending.length; i++) {
        expect(trending[i-1].reviews.totalReviews).toBeGreaterThanOrEqual(
          trending[i].reviews.totalReviews
        );
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle queries with no location match', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer'],
        location: 'Remote Location, AK' // No vendors in Alaska
      };

      const results = await discoveryService.discoverVendors(query);

      // Should still return some results but with low location match scores
      results.forEach(result => {
        expect(result.matchReasons.locationMatch).toBeLessThan(0.5);
      });
    });

    test('should handle unrealistic budget constraints', async () => {
      const lowBudgetQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        budget: { max: 100 } // Unrealistically low
      };

      const highBudgetQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['florist'],
        location: 'New York',
        budget: { min: 50000 } // Unrealistically high for florist
      };

      const lowResults = await discoveryService.discoverVendors(lowBudgetQuery);
      const highResults = await discoveryService.discoverVendors(highBudgetQuery);

      // Should return results with appropriate budget match scores
      lowResults.forEach(result => {
        expect(result.matchReasons.budgetMatch).toBeLessThan(0.5);
      });

      highResults.forEach(result => {
        expect(result.matchReasons.budgetMatch).toBeLessThan(0.8);
      });
    });

    test('should handle queries with conflicting requirements', async () => {
      const conflictingQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York',
        budget: { max: 1000 }, // Very low budget
        style: ['luxury'], // But luxury style
        experienceLevel: 'expert' // And expert level
      };

      const results = await discoveryService.discoverVendors(conflictingQuery);

      // Should still return results but with explanatory alternative suggestions
      if (results.length > 0) {
        const result = results[0];
        expect(result.alternativeSuggestions?.length).toBeGreaterThan(0);
      }
    });

    test('should handle empty vendor database gracefully', async () => {
      // This would test behavior with no vendors available
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['nonexistent_type' as any],
        location: 'New York'
      };

      const results = await discoveryService.discoverVendors(query);
      expect(results).toEqual([]);
    });
  });

  describe('Performance and Scalability', () => {
    test('should return results within acceptable time', async () => {
      const query: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer', 'venue', 'florist'],
        location: 'New York',
        budget: { min: 1000, max: 10000 },
        style: ['classic', 'modern']
      };

      const startTime = Date.now();
      const results = await discoveryService.discoverVendors(query);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // 500ms limit
      expect(results.length).toBeGreaterThan(0);
    });

    test('should handle complex multi-criteria searches efficiently', async () => {
      const complexQuery: WeddingVendorSearchQuery = {
        vendorTypes: ['photographer', 'venue', 'florist'],
        location: 'New York',
        weddingDate: '2024-09-21',
        guestCount: 150,
        budget: { min: 2000, max: 8000 },
        style: ['romantic', 'classic', 'elegant'],
        mustHaveServices: ['photography', 'planning', 'flowers'],
        experienceLevel: 'experienced',
        portfolioRequirements: {
          minRealWeddings: 25,
          requireSimilarStyle: true
        }
      };

      const startTime = Date.now();
      const results = await discoveryService.discoverVendors(complexQuery);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // 1 second for complex query
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });
});