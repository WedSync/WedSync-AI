import { describe, test, expect, beforeEach, afterEach } from 'vitest';

interface RelevanceFactors {
  titleMatch: number;          // How well query matches vendor name/title
  descriptionMatch: number;    // Match with description/bio
  specialtyMatch: number;      // Match with specialties/services
  locationProximity: number;   // Geographic proximity score
  reviewQuality: number;       // Average rating weight
  completenessScore: number;   // Profile completeness (photos, info, etc.)
  popularityScore: number;     // Booking frequency, views, etc.
  freshness: number;           // How recently updated/active
}

interface VendorRelevanceScore {
  vendorId: string;
  vendorName: string;
  totalScore: number;
  normalizedScore: number;     // 0-1 range
  factors: RelevanceFactors;
  ranking: number;
}

interface RelevanceQuery {
  searchTerm: string;
  userLocation?: { lat: number; lng: number };
  vendorType?: string;
  userPreferences?: {
    priceWeight: number;
    locationWeight: number;
    ratingWeight: number;
  };
}

// Mock relevance scoring algorithm
function calculateRelevanceScore(
  vendor: any,
  query: RelevanceQuery
): VendorRelevanceScore {
  const factors: RelevanceFactors = {
    titleMatch: calculateTitleMatch(vendor.name, query.searchTerm),
    descriptionMatch: calculateDescriptionMatch(vendor.description || '', query.searchTerm),
    specialtyMatch: calculateSpecialtyMatch(vendor.specialties || [], query.searchTerm),
    locationProximity: calculateLocationScore(vendor.location, query.userLocation),
    reviewQuality: calculateReviewScore(vendor.rating, vendor.reviewCount),
    completenessScore: calculateCompletenessScore(vendor),
    popularityScore: calculatePopularityScore(vendor.bookingCount, vendor.viewCount),
    freshness: calculateFreshnessScore(vendor.lastUpdated)
  };

  // Weighted total score
  const weights = {
    titleMatch: 0.25,
    descriptionMatch: 0.15,
    specialtyMatch: 0.20,
    locationProximity: 0.15,
    reviewQuality: 0.10,
    completenessScore: 0.05,
    popularityScore: 0.05,
    freshness: 0.05
  };

  // Apply user preferences if provided
  if (query.userPreferences) {
    weights.locationProximity *= query.userPreferences.locationWeight;
    weights.reviewQuality *= query.userPreferences.ratingWeight;
  }

  const totalScore = Object.entries(factors).reduce((sum, [key, value]) => {
    return sum + (value * weights[key as keyof typeof weights]);
  }, 0);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    totalScore,
    normalizedScore: Math.min(totalScore, 1.0),
    factors,
    ranking: 0 // Will be set when sorting
  };
}

// Helper functions for scoring different factors
function calculateTitleMatch(title: string, searchTerm: string): number {
  const titleLower = title.toLowerCase();
  const termLower = searchTerm.toLowerCase();
  
  if (titleLower.includes(termLower)) {
    const words = termLower.split(' ');
    let matchScore = 0;
    
    words.forEach(word => {
      if (titleLower.includes(word)) {
        matchScore += titleLower.startsWith(word) ? 1.0 : 0.8;
      }
    });
    
    return Math.min(matchScore / words.length, 1.0);
  }
  
  return 0;
}

function calculateDescriptionMatch(description: string, searchTerm: string): number {
  const descLower = description.toLowerCase();
  const termLower = searchTerm.toLowerCase();
  const words = termLower.split(' ');
  
  let matchCount = 0;
  words.forEach(word => {
    if (descLower.includes(word)) matchCount++;
  });
  
  return matchCount / Math.max(words.length, 1);
}

function calculateSpecialtyMatch(specialties: string[], searchTerm: string): number {
  const termLower = searchTerm.toLowerCase();
  const words = termLower.split(' ');
  
  let matchScore = 0;
  specialties.forEach(specialty => {
    words.forEach(word => {
      if (specialty.toLowerCase().includes(word)) {
        matchScore += 0.5;
      }
    });
  });
  
  return Math.min(matchScore / words.length, 1.0);
}

function calculateLocationScore(vendorLocation: any, userLocation?: { lat: number; lng: number }): number {
  if (!userLocation || !vendorLocation.coordinates) return 0.5;
  
  const distance = calculateDistance(
    userLocation.lat, userLocation.lng,
    vendorLocation.coordinates.lat, vendorLocation.coordinates.lng
  );
  
  // Score decreases with distance (max 50 miles considered)
  return Math.max(0, 1 - (distance / 50));
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateReviewScore(rating: number, reviewCount: number): number {
  if (!rating || !reviewCount) return 0;
  
  // Normalize rating (0-5 scale to 0-1)
  const ratingScore = rating / 5;
  
  // Weight by review count (more reviews = more reliable)
  const reviewCountWeight = Math.min(reviewCount / 50, 1); // Cap at 50 reviews
  
  return ratingScore * (0.7 + 0.3 * reviewCountWeight);
}

function calculateCompletenessScore(vendor: any): number {
  let score = 0;
  const factors = [
    vendor.description ? 1 : 0,
    vendor.photos && vendor.photos.length > 0 ? 1 : 0,
    vendor.services && vendor.services.length > 0 ? 1 : 0,
    vendor.pricing ? 1 : 0,
    vendor.availability ? 1 : 0,
    vendor.contact ? 1 : 0
  ];
  
  return factors.reduce((sum, val) => sum + val, 0) / factors.length;
}

function calculatePopularityScore(bookingCount: number = 0, viewCount: number = 0): number {
  const bookingScore = Math.min(bookingCount / 100, 1); // Normalize to 100 bookings
  const viewScore = Math.min(viewCount / 1000, 1); // Normalize to 1000 views
  
  return (bookingScore * 0.7) + (viewScore * 0.3);
}

function calculateFreshnessScore(lastUpdated?: string): number {
  if (!lastUpdated) return 0.3;
  
  const daysSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate <= 7) return 1.0;
  if (daysSinceUpdate <= 30) return 0.8;
  if (daysSinceUpdate <= 90) return 0.5;
  return 0.2;
}

// Mock vendor data for testing
const mockVendors = [
  {
    id: '1',
    name: 'Elite Wedding Photography',
    description: 'Professional wedding photographer specializing in luxury weddings and destination ceremonies',
    specialties: ['wedding', 'luxury', 'destination', 'portraits'],
    location: { name: 'New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
    rating: 4.8,
    reviewCount: 45,
    photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    services: ['wedding photography', 'engagement photos', 'bridal portraits'],
    pricing: { min: 2500, max: 6000 },
    availability: true,
    contact: { phone: '555-0123', email: 'contact@elitewedding.com' },
    bookingCount: 85,
    viewCount: 2400,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    id: '2',
    name: 'Manhattan Grand Venue',
    description: 'Historic ballroom venue perfect for elegant wedding receptions',
    specialties: ['venue', 'ballroom', 'historic', 'elegant'],
    location: { name: 'Manhattan, NY', coordinates: { lat: 40.7589, lng: -73.9851 } },
    rating: 4.6,
    reviewCount: 28,
    photos: ['venue1.jpg', 'venue2.jpg'],
    services: ['wedding venue', 'catering', 'event planning'],
    pricing: { min: 8000, max: 25000 },
    availability: true,
    contact: { phone: '555-0456', email: 'events@manhattangrand.com' },
    bookingCount: 42,
    viewCount: 1800,
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    id: '3',
    name: 'Brooklyn Bloom Florist',
    description: 'Creative floral designs for modern weddings',
    specialties: ['florist', 'modern', 'creative', 'bridal'],
    location: { name: 'Brooklyn, NY', coordinates: { lat: 40.6782, lng: -73.9442 } },
    rating: 4.4,
    reviewCount: 18,
    photos: ['flower1.jpg'],
    services: ['bridal bouquets', 'ceremony arrangements'],
    pricing: { min: 800, max: 3000 },
    availability: false,
    contact: { email: 'info@brooklynbloom.com' },
    bookingCount: 25,
    viewCount: 900,
    lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days ago
  }
];

describe('WS-248: Advanced Search System - Relevance Scoring Tests', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup after tests
  });

  describe('Title Match Scoring', () => {
    test('should give highest score for exact title matches', () => {
      const vendor = mockVendors[0]; // Elite Wedding Photography
      const query: RelevanceQuery = { searchTerm: 'Elite Wedding Photography' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.titleMatch).toBe(1.0);
    });

    test('should score partial title matches appropriately', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: 'Wedding Photography' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.titleMatch).toBeGreaterThan(0.8);
      expect(score.factors.titleMatch).toBeLessThan(1.0);
    });

    test('should score beginning matches higher than middle matches', () => {
      const vendor1 = { ...mockVendors[0], name: 'Wedding Elite Photography' };
      const vendor2 = { ...mockVendors[0], name: 'Elite Wedding Photography' };
      const query: RelevanceQuery = { searchTerm: 'Wedding' };
      
      const score1 = calculateRelevanceScore(vendor1, query);
      const score2 = calculateRelevanceScore(vendor2, query);
      
      expect(score1.factors.titleMatch).toBeGreaterThan(score2.factors.titleMatch);
    });

    test('should return zero for no title matches', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: 'Catering Services' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.titleMatch).toBe(0);
    });
  });

  describe('Description Match Scoring', () => {
    test('should score description matches correctly', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: 'luxury wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.descriptionMatch).toBeGreaterThan(0.5);
    });

    test('should handle multiple word matches in description', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: 'professional destination ceremonies' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.descriptionMatch).toBeGreaterThan(0);
      expect(score.factors.descriptionMatch).toBeLessThanOrEqual(1);
    });
  });

  describe('Specialty Match Scoring', () => {
    test('should score specialty matches highly', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: 'luxury destination wedding' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.specialtyMatch).toBeGreaterThan(0.8);
    });

    test('should handle partial specialty matches', () => {
      const vendor = mockVendors[1]; // venue specialties
      const query: RelevanceQuery = { searchTerm: 'elegant ballroom' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.specialtyMatch).toBeGreaterThan(0.5);
    });
  });

  describe('Location Proximity Scoring', () => {
    test('should score nearby locations higher', () => {
      const vendor = mockVendors[0]; // New York location
      const query: RelevanceQuery = {
        searchTerm: 'wedding photographer',
        userLocation: { lat: 40.7500, lng: -73.9900 } // Close to NYC
      };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.locationProximity).toBeGreaterThan(0.8);
    });

    test('should score distant locations lower', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = {
        searchTerm: 'wedding photographer',
        userLocation: { lat: 34.0522, lng: -118.2437 } // Los Angeles
      };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.locationProximity).toBeLessThan(0.3);
    });

    test('should handle missing location data gracefully', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.locationProximity).toBe(0.5); // Default neutral score
    });
  });

  describe('Review Quality Scoring', () => {
    test('should weight high ratings and review counts appropriately', () => {
      const vendor = mockVendors[0]; // 4.8 rating, 45 reviews
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.reviewQuality).toBeGreaterThan(0.8);
    });

    test('should penalize low review counts even with high ratings', () => {
      const vendor = { ...mockVendors[0], rating: 4.9, reviewCount: 2 };
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.reviewQuality).toBeLessThan(0.8);
    });

    test('should handle vendors with no reviews', () => {
      const vendor = { ...mockVendors[0], rating: 0, reviewCount: 0 };
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.reviewQuality).toBe(0);
    });
  });

  describe('Profile Completeness Scoring', () => {
    test('should score complete profiles higher', () => {
      const vendor = mockVendors[0]; // Complete profile
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.completenessScore).toBeGreaterThan(0.8);
    });

    test('should score incomplete profiles lower', () => {
      const vendor = {
        ...mockVendors[0],
        photos: [],
        services: [],
        pricing: null
      };
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.factors.completenessScore).toBeLessThan(0.6);
    });
  });

  describe('Popularity Scoring', () => {
    test('should factor in booking and view counts', () => {
      const popularVendor = mockVendors[0]; // 85 bookings, 2400 views
      const unpopularVendor = { ...mockVendors[0], bookingCount: 1, viewCount: 50 };
      const query: RelevanceQuery = { searchTerm: 'wedding photographer' };
      
      const popularScore = calculateRelevanceScore(popularVendor, query);
      const unpopularScore = calculateRelevanceScore(unpopularVendor, query);
      
      expect(popularScore.factors.popularityScore).toBeGreaterThan(unpopularScore.factors.popularityScore);
    });
  });

  describe('Freshness Scoring', () => {
    test('should favor recently updated profiles', () => {
      const recentVendor = mockVendors[1]; // 2 days ago
      const oldVendor = mockVendors[2]; // 45 days ago
      const query: RelevanceQuery = { searchTerm: 'wedding services' };
      
      const recentScore = calculateRelevanceScore(recentVendor, query);
      const oldScore = calculateRelevanceScore(oldVendor, query);
      
      expect(recentScore.factors.freshness).toBeGreaterThan(oldScore.factors.freshness);
    });
  });

  describe('Combined Relevance Scoring', () => {
    test('should combine all factors into meaningful total scores', () => {
      const query: RelevanceQuery = { 
        searchTerm: 'luxury wedding photography',
        userLocation: { lat: 40.7128, lng: -74.0060 }
      };
      
      const scores = mockVendors.map(vendor => calculateRelevanceScore(vendor, query));
      
      // Photography vendor should score highest for photography query
      const photographyScore = scores.find(s => s.vendorId === '1');
      const venueScore = scores.find(s => s.vendorId === '2');
      
      expect(photographyScore!.totalScore).toBeGreaterThan(venueScore!.totalScore);
      expect(photographyScore!.normalizedScore).toBeLessThanOrEqual(1.0);
      expect(photographyScore!.normalizedScore).toBeGreaterThan(0);
    });

    test('should apply user preference weighting correctly', () => {
      const baseQuery: RelevanceQuery = { 
        searchTerm: 'wedding photographer',
        userLocation: { lat: 40.7128, lng: -74.0060 }
      };
      
      const locationPrefQuery: RelevanceQuery = {
        ...baseQuery,
        userPreferences: { priceWeight: 1, locationWeight: 2, ratingWeight: 1 }
      };
      
      const vendor = mockVendors[0];
      const baseScore = calculateRelevanceScore(vendor, baseQuery);
      const locationScore = calculateRelevanceScore(vendor, locationPrefQuery);
      
      // Location-weighted query should have higher total score for nearby vendor
      expect(locationScore.totalScore).toBeGreaterThan(baseScore.totalScore);
    });

    test('should rank vendors correctly by relevance', () => {
      const query: RelevanceQuery = { 
        searchTerm: 'wedding photography',
        userLocation: { lat: 40.7128, lng: -74.0060 }
      };
      
      const scores = mockVendors
        .map(vendor => calculateRelevanceScore(vendor, query))
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((score, index) => ({ ...score, ranking: index + 1 }));
      
      // Photography vendor should rank #1
      const photographyRank = scores.find(s => s.vendorId === '1')?.ranking;
      expect(photographyRank).toBe(1);
      
      // Ensure rankings are sequential
      expect(scores.map(s => s.ranking)).toEqual([1, 2, 3]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty search terms', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { searchTerm: '' };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.normalizedScore).toBeLessThanOrEqual(1);
    });

    test('should handle vendors with missing data fields', () => {
      const incompleteVendor = {
        id: '99',
        name: 'Minimal Vendor',
        // Missing most fields
      };
      const query: RelevanceQuery = { searchTerm: 'wedding' };
      
      const score = calculateRelevanceScore(incompleteVendor, query);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.normalizedScore).toBeLessThanOrEqual(1);
    });

    test('should handle very long search terms', () => {
      const vendor = mockVendors[0];
      const longQuery = 'wedding photographer ' + 'luxury '.repeat(20) + 'destination ceremony';
      const query: RelevanceQuery = { searchTerm: longQuery };
      
      const score = calculateRelevanceScore(vendor, query);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.normalizedScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Relevance Score Validation', () => {
    test('should maintain score consistency across multiple runs', () => {
      const vendor = mockVendors[0];
      const query: RelevanceQuery = { 
        searchTerm: 'wedding photographer',
        userLocation: { lat: 40.7128, lng: -74.0060 }
      };
      
      const scores = Array(5).fill(0).map(() => calculateRelevanceScore(vendor, query));
      
      // All scores should be identical
      const firstScore = scores[0].totalScore;
      scores.forEach(score => {
        expect(score.totalScore).toBe(firstScore);
      });
    });

    test('should produce reasonable score distributions', () => {
      const queries = [
        'wedding photographer',
        'wedding venue', 
        'wedding florist',
        'luxury wedding services'
      ];
      
      const allScores: number[] = [];
      
      queries.forEach(searchTerm => {
        mockVendors.forEach(vendor => {
          const score = calculateRelevanceScore(vendor, { searchTerm });
          allScores.push(score.normalizedScore);
        });
      });
      
      // Score distribution should be reasonable
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      expect(avgScore).toBeGreaterThan(0.1);
      expect(avgScore).toBeLessThan(0.9);
      
      // Should have variety in scores (not all the same)
      const uniqueScores = new Set(allScores.map(s => Math.round(s * 100) / 100));
      expect(uniqueScores.size).toBeGreaterThan(3);
    });

    test('should meet minimum relevance accuracy requirements', () => {
      const photographyQueries = [
        'wedding photographer',
        'wedding photography',
        'bridal photographer',
        'wedding photos'
      ];
      
      let correctTop1 = 0;
      let correctTop3 = 0;
      
      photographyQueries.forEach(searchTerm => {
        const scores = mockVendors
          .map(vendor => calculateRelevanceScore(vendor, { searchTerm }))
          .sort((a, b) => b.totalScore - a.totalScore);
        
        // Check if photography vendor (id: '1') is top result
        if (scores[0].vendorId === '1') correctTop1++;
        
        // Check if photography vendor is in top 3
        const top3Ids = scores.slice(0, 3).map(s => s.vendorId);
        if (top3Ids.includes('1')) correctTop3++;
      });
      
      const top1Accuracy = correctTop1 / photographyQueries.length;
      const top3Accuracy = correctTop3 / photographyQueries.length;
      
      expect(top1Accuracy).toBeGreaterThanOrEqual(0.75); // 75% accuracy for #1 position
      expect(top3Accuracy).toBeGreaterThanOrEqual(0.95); // 95% accuracy for top 3
    });
  });
});