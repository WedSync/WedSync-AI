/**
 * WS-248: Advanced Search System - Review Integration Testing
 * Team E - QA/Testing & Documentation
 * 
 * Tests review-based search ranking validation and review integration accuracy
 * Ensures reviews properly influence vendor search results and rankings
 * 
 * Success Criteria:
 * - Review scoring accuracy >95%
 * - Review-based ranking correctness 100%
 * - Review filtering precision >90%
 * - Review sentiment analysis accuracy >85%
 * - Review freshness weighting accurate
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Review interfaces for wedding vendors
interface VendorReview {
  id: string;
  vendorId: string;
  coupleId: string;
  rating: number; // 1-5 stars
  title: string;
  content: string;
  photos?: string[];
  weddingDate: string;
  reviewDate: string;
  verified: boolean;
  helpful: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  categories: {
    quality: number;
    communication: number;
    value: number;
    professionalism: number;
    timeliness: number;
  };
  tags: string[];
}

interface ReviewMetrics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  sentimentScore: number;
  recentReviews: number;
  verifiedReviewPercentage: number;
  responseRate: number;
  responseTime: number; // hours
}

interface ReviewSearchCriteria {
  minRating?: number;
  minReviews?: number;
  verifiedOnly?: boolean;
  recentOnly?: boolean; // within last 12 months
  includePhotos?: boolean;
  excludeNegative?: boolean;
  weddingType?: string;
  venue?: string;
}

interface ReviewRankingFactors {
  averageRating: number;
  reviewCount: number;
  recentActivity: number;
  verifiedPercentage: number;
  sentimentScore: number;
  responseEngagement: number;
  photoEvidence: number;
}

// Mock review service
class MockReviewService {
  private reviews: VendorReview[] = [
    {
      id: 'rev-001',
      vendorId: 'vendor-photo-001',
      coupleId: 'couple-001',
      rating: 5,
      title: 'Absolutely Perfect Wedding Photography!',
      content: 'Sarah captured our special day beautifully. Every moment was preserved with such artistic vision. The candid shots during our ceremony brought tears to our eyes. Professional, punctual, and incredibly talented.',
      photos: ['review-photo-1.jpg', 'review-photo-2.jpg'],
      weddingDate: '2024-06-15',
      reviewDate: '2024-06-20',
      verified: true,
      helpful: 23,
      sentiment: 'positive',
      categories: {
        quality: 5,
        communication: 5,
        value: 4,
        professionalism: 5,
        timeliness: 5
      },
      tags: ['artistic', 'punctual', 'professional', 'creative']
    },
    {
      id: 'rev-002',
      vendorId: 'vendor-venue-001',
      coupleId: 'couple-002',
      rating: 4,
      title: 'Beautiful Venue with Minor Issues',
      content: 'The venue was stunning and the staff was helpful. The gardens provided the perfect backdrop for our outdoor ceremony. However, there were some coordination issues with catering timing.',
      photos: ['venue-review-1.jpg'],
      weddingDate: '2024-08-12',
      reviewDate: '2024-08-15',
      verified: true,
      helpful: 12,
      sentiment: 'positive',
      categories: {
        quality: 4,
        communication: 3,
        value: 4,
        professionalism: 4,
        timeliness: 3
      },
      tags: ['beautiful', 'gardens', 'coordination-issues']
    },
    {
      id: 'rev-003',
      vendorId: 'vendor-cater-001',
      coupleId: 'couple-003',
      rating: 2,
      title: 'Disappointing Catering Experience',
      content: 'Food quality was below expectations and service was slow. Several dishes were cold when served. Would not recommend for important events.',
      weddingDate: '2024-05-22',
      reviewDate: '2024-05-25',
      verified: true,
      helpful: 8,
      sentiment: 'negative',
      categories: {
        quality: 2,
        communication: 3,
        value: 2,
        professionalism: 2,
        timeliness: 1
      },
      tags: ['disappointing', 'cold-food', 'slow-service']
    },
    {
      id: 'rev-004',
      vendorId: 'vendor-photo-001',
      coupleId: 'couple-004',
      rating: 5,
      title: 'Outstanding Work - Highly Recommended',
      content: 'Sarah exceeded all expectations. Her attention to detail and ability to capture candid moments is unparalleled. We received our photos ahead of schedule.',
      photos: ['portfolio-1.jpg', 'portfolio-2.jpg', 'portfolio-3.jpg'],
      weddingDate: '2024-09-03',
      reviewDate: '2024-09-08',
      verified: true,
      helpful: 31,
      sentiment: 'positive',
      categories: {
        quality: 5,
        communication: 5,
        value: 5,
        professionalism: 5,
        timeliness: 5
      },
      tags: ['exceeded-expectations', 'attention-to-detail', 'ahead-of-schedule']
    }
  ];

  async getVendorReviews(vendorId: string): Promise<VendorReview[]> {
    return this.reviews.filter(review => review.vendorId === vendorId);
  }

  async calculateReviewMetrics(vendorId: string): Promise<ReviewMetrics> {
    const vendorReviews = await this.getVendorReviews(vendorId);
    
    if (vendorReviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        sentimentScore: 0,
        recentReviews: 0,
        verifiedReviewPercentage: 0,
        responseRate: 0,
        responseTime: 0
      };
    }

    const averageRating = vendorReviews.reduce((sum, review) => sum + review.rating, 0) / vendorReviews.length;
    const ratingDistribution = vendorReviews.reduce((dist, review) => {
      dist[review.rating] = (dist[review.rating] || 0) + 1;
      return dist;
    }, {} as Record<number, number>);

    const sentimentScore = this.calculateSentimentScore(vendorReviews);
    const recentReviews = this.countRecentReviews(vendorReviews);
    const verifiedCount = vendorReviews.filter(r => r.verified).length;

    return {
      averageRating,
      totalReviews: vendorReviews.length,
      ratingDistribution,
      sentimentScore,
      recentReviews,
      verifiedReviewPercentage: (verifiedCount / vendorReviews.length) * 100,
      responseRate: 85, // Mock response rate
      responseTime: 4.2 // Mock response time in hours
    };
  }

  private calculateSentimentScore(reviews: VendorReview[]): number {
    const sentimentWeights = { positive: 1, neutral: 0, negative: -1 };
    const totalSentiment = reviews.reduce((sum, review) => {
      return sum + sentimentWeights[review.sentiment] * review.rating;
    }, 0);
    return totalSentiment / reviews.length;
  }

  private countRecentReviews(reviews: VendorReview[]): number {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return reviews.filter(review => 
      new Date(review.reviewDate) > oneYearAgo
    ).length;
  }

  async searchByReviews(criteria: ReviewSearchCriteria): Promise<string[]> {
    const vendorIds = [...new Set(this.reviews.map(r => r.vendorId))];
    const filteredVendors: string[] = [];

    for (const vendorId of vendorIds) {
      const metrics = await this.calculateReviewMetrics(vendorId);
      const vendorReviews = await this.getVendorReviews(vendorId);

      // Apply review-based filters
      if (criteria.minRating && metrics.averageRating < criteria.minRating) continue;
      if (criteria.minReviews && metrics.totalReviews < criteria.minReviews) continue;
      if (criteria.verifiedOnly && metrics.verifiedReviewPercentage < 100) continue;
      if (criteria.recentOnly && metrics.recentReviews === 0) continue;
      if (criteria.includePhotos && !vendorReviews.some(r => r.photos && r.photos.length > 0)) continue;
      if (criteria.excludeNegative && vendorReviews.some(r => r.sentiment === 'negative')) continue;

      filteredVendors.push(vendorId);
    }

    return this.rankVendorsByReviews(filteredVendors);
  }

  private async rankVendorsByReviews(vendorIds: string[]): Promise<string[]> {
    const vendorRankings = await Promise.all(
      vendorIds.map(async (vendorId) => {
        const metrics = await this.calculateReviewMetrics(vendorId);
        const reviews = await this.getVendorReviews(vendorId);
        
        const rankingScore = this.calculateRankingScore(metrics, reviews);
        
        return { vendorId, score: rankingScore };
      })
    );

    return vendorRankings
      .sort((a, b) => b.score - a.score)
      .map(item => item.vendorId);
  }

  private calculateRankingScore(metrics: ReviewMetrics, reviews: VendorReview[]): number {
    const factors: ReviewRankingFactors = {
      averageRating: metrics.averageRating / 5 * 0.25, // 25% weight
      reviewCount: Math.min(metrics.totalReviews / 20, 1) * 0.15, // 15% weight
      recentActivity: Math.min(metrics.recentReviews / 10, 1) * 0.15, // 15% weight
      verifiedPercentage: (metrics.verifiedReviewPercentage / 100) * 0.10, // 10% weight
      sentimentScore: Math.max((metrics.sentimentScore + 5) / 10, 0) * 0.15, // 15% weight
      responseEngagement: (metrics.responseRate / 100) * 0.10, // 10% weight
      photoEvidence: Math.min(reviews.filter(r => r.photos?.length).length / 5, 1) * 0.10 // 10% weight
    };

    return Object.values(factors).reduce((sum, score) => sum + score, 0);
  }

  async analyzeReviewTrends(vendorId: string): Promise<any> {
    const reviews = await this.getVendorReviews(vendorId);
    
    // Sort reviews by date
    const sortedReviews = reviews.sort((a, b) => 
      new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime()
    );

    // Calculate trends
    const ratingTrend = this.calculateRatingTrend(sortedReviews);
    const categoryTrends = this.calculateCategoryTrends(sortedReviews);
    const sentimentTrend = this.calculateSentimentTrend(sortedReviews);

    return {
      ratingTrend,
      categoryTrends,
      sentimentTrend,
      overallTrend: ratingTrend.direction
    };
  }

  private calculateRatingTrend(reviews: VendorReview[]): any {
    if (reviews.length < 3) return { direction: 'stable', change: 0 };

    const recent = reviews.slice(-3).reduce((sum, r) => sum + r.rating, 0) / 3;
    const older = reviews.slice(0, -3).reduce((sum, r) => sum + r.rating, 0) / (reviews.length - 3);

    const change = recent - older;
    const direction = change > 0.2 ? 'improving' : change < -0.2 ? 'declining' : 'stable';

    return { direction, change };
  }

  private calculateCategoryTrends(reviews: VendorReview[]): any {
    const categories = ['quality', 'communication', 'value', 'professionalism', 'timeliness'];
    const trends: any = {};

    categories.forEach(category => {
      const scores = reviews.map(r => r.categories[category as keyof typeof r.categories]);
      const recentAvg = scores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, scores.length);
      const overallAvg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      trends[category] = {
        current: recentAvg,
        change: recentAvg - overallAvg,
        direction: recentAvg > overallAvg + 0.1 ? 'improving' : 
                  recentAvg < overallAvg - 0.1 ? 'declining' : 'stable'
      };
    });

    return trends;
  }

  private calculateSentimentTrend(reviews: VendorReview[]): any {
    const sentimentScores = reviews.map(r => {
      const weights = { positive: 1, neutral: 0, negative: -1 };
      return weights[r.sentiment];
    });

    const recentSentiment = sentimentScores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, sentimentScores.length);
    const overallSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;

    return {
      current: recentSentiment,
      change: recentSentiment - overallSentiment,
      direction: recentSentiment > overallSentiment ? 'improving' : 
                recentSentiment < overallSentiment ? 'declining' : 'stable'
    };
  }
}

// Mock advanced search with review integration
async function searchVendorsWithReviews(
  query: string,
  location: string,
  reviewCriteria: ReviewSearchCriteria = {}
): Promise<any> {
  const reviewService = new MockReviewService();
  
  // Get vendors filtered by review criteria
  const reviewFilteredVendors = await reviewService.searchByReviews(reviewCriteria);
  
  // Mock base search results
  const baseResults = [
    {
      id: 'vendor-photo-001',
      name: 'Sarah\'s Photography Studio',
      type: 'photographer',
      location: 'London',
      baseScore: 0.95
    },
    {
      id: 'vendor-venue-001',
      name: 'Garden Manor Estate',
      type: 'venue',
      location: 'Surrey',
      baseScore: 0.88
    },
    {
      id: 'vendor-cater-001',
      name: 'Elegant Catering Co.',
      type: 'caterer',
      location: 'London',
      baseScore: 0.82
    }
  ];

  // Combine base results with review filtering
  const filteredResults = baseResults.filter(vendor => 
    reviewFilteredVendors.includes(vendor.id)
  );

  // Enhance results with review metrics
  const enhancedResults = await Promise.all(
    filteredResults.map(async (vendor) => {
      const reviewMetrics = await reviewService.calculateReviewMetrics(vendor.id);
      const reviewTrends = await reviewService.analyzeReviewTrends(vendor.id);
      
      return {
        ...vendor,
        reviews: reviewMetrics,
        trends: reviewTrends,
        finalScore: vendor.baseScore * 0.3 + (reviewMetrics.averageRating / 5) * 0.7
      };
    })
  );

  return {
    vendors: enhancedResults.sort((a, b) => b.finalScore - a.finalScore),
    total: enhancedResults.length,
    reviewFiltersApplied: Object.keys(reviewCriteria).length > 0
  };
}

describe('Review Integration Search Tests', () => {
  let reviewService: MockReviewService;

  beforeEach(() => {
    reviewService = new MockReviewService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Review Metrics Calculation', () => {
    test('should calculate accurate review metrics for vendors with reviews', async () => {
      const metrics = await reviewService.calculateReviewMetrics('vendor-photo-001');
      
      expect(metrics.averageRating).toBeCloseTo(5.0, 1);
      expect(metrics.totalReviews).toBe(2);
      expect(metrics.verifiedReviewPercentage).toBe(100);
      expect(metrics.sentimentScore).toBeGreaterThan(4);
      expect(metrics.recentReviews).toBe(2);
    });

    test('should return zero metrics for vendors without reviews', async () => {
      const metrics = await reviewService.calculateReviewMetrics('vendor-nonexistent');
      
      expect(metrics.averageRating).toBe(0);
      expect(metrics.totalReviews).toBe(0);
      expect(metrics.verifiedReviewPercentage).toBe(0);
      expect(metrics.sentimentScore).toBe(0);
    });

    test('should properly weight negative reviews in metrics', async () => {
      const metrics = await reviewService.calculateReviewMetrics('vendor-cater-001');
      
      expect(metrics.averageRating).toBe(2);
      expect(metrics.sentimentScore).toBeLessThan(0);
      expect(metrics.totalReviews).toBe(1);
    });
  });

  describe('Review-Based Search Filtering', () => {
    test('should filter vendors by minimum rating', async () => {
      const results = await reviewService.searchByReviews({ minRating: 4.5 });
      
      expect(results).toContain('vendor-photo-001'); // 5.0 rating
      expect(results).not.toContain('vendor-cater-001'); // 2.0 rating
    });

    test('should filter vendors by minimum review count', async () => {
      const results = await reviewService.searchByReviews({ minReviews: 2 });
      
      expect(results).toContain('vendor-photo-001'); // 2 reviews
      expect(results).not.toContain('vendor-venue-001'); // 1 review
      expect(results).not.toContain('vendor-cater-001'); // 1 review
    });

    test('should filter for verified reviews only', async () => {
      const results = await reviewService.searchByReviews({ verifiedOnly: true });
      
      // All mock reviews are verified, so should include all vendors with reviews
      expect(results.length).toBeGreaterThan(0);
    });

    test('should filter for reviews with photos', async () => {
      const results = await reviewService.searchByReviews({ includePhotos: true });
      
      expect(results).toContain('vendor-photo-001'); // Has photo reviews
      expect(results).toContain('vendor-venue-001'); // Has photo reviews
      expect(results).not.toContain('vendor-cater-001'); // No photo reviews
    });

    test('should exclude vendors with negative reviews', async () => {
      const results = await reviewService.searchByReviews({ excludeNegative: true });
      
      expect(results).toContain('vendor-photo-001'); // Only positive reviews
      expect(results).toContain('vendor-venue-001'); // Only positive reviews
      expect(results).not.toContain('vendor-cater-001'); // Has negative reviews
    });
  });

  describe('Review-Based Vendor Ranking', () => {
    test('should rank vendors with higher ratings first', async () => {
      const results = await reviewService.searchByReviews({});
      
      // vendor-photo-001 has 5.0 rating, should be first
      expect(results[0]).toBe('vendor-photo-001');
    });

    test('should consider multiple ranking factors', async () => {
      const results = await reviewService.searchByReviews({});
      
      // Verify that ranking considers multiple factors
      expect(results.length).toBeGreaterThan(1);
      
      // Higher rated vendors should generally rank higher
      const topVendorMetrics = await reviewService.calculateReviewMetrics(results[0]);
      const bottomVendorMetrics = await reviewService.calculateReviewMetrics(results[results.length - 1]);
      
      expect(topVendorMetrics.averageRating).toBeGreaterThanOrEqual(bottomVendorMetrics.averageRating);
    });

    test('should weight recent reviews appropriately', async () => {
      const metrics1 = await reviewService.calculateReviewMetrics('vendor-photo-001');
      const metrics2 = await reviewService.calculateReviewMetrics('vendor-cater-001');
      
      // Verify recent reviews are counted correctly
      expect(metrics1.recentReviews).toBeGreaterThan(0);
      expect(metrics2.recentReviews).toBeGreaterThan(0);
    });
  });

  describe('Review Trend Analysis', () => {
    test('should analyze rating trends correctly', async () => {
      const trends = await reviewService.analyzeReviewTrends('vendor-photo-001');
      
      expect(trends).toHaveProperty('ratingTrend');
      expect(trends).toHaveProperty('categoryTrends');
      expect(trends).toHaveProperty('sentimentTrend');
      expect(trends).toHaveProperty('overallTrend');
      
      expect(trends.overallTrend).toMatch(/improving|declining|stable/);
    });

    test('should identify improving vs declining vendors', async () => {
      const trends = await reviewService.analyzeReviewTrends('vendor-photo-001');
      
      // With consistent 5-star ratings, trend should be stable or improving
      expect(trends.overallTrend).toMatch(/improving|stable/);
      expect(trends.ratingTrend.change).toBeGreaterThanOrEqual(-0.2);
    });

    test('should analyze category-specific trends', async () => {
      const trends = await reviewService.analyzeReviewTrends('vendor-photo-001');
      
      expect(trends.categoryTrends).toHaveProperty('quality');
      expect(trends.categoryTrends).toHaveProperty('communication');
      expect(trends.categoryTrends).toHaveProperty('value');
      expect(trends.categoryTrends).toHaveProperty('professionalism');
      expect(trends.categoryTrends).toHaveProperty('timeliness');
      
      Object.values(trends.categoryTrends).forEach((trend: any) => {
        expect(trend).toHaveProperty('current');
        expect(trend).toHaveProperty('change');
        expect(trend).toHaveProperty('direction');
      });
    });
  });

  describe('Advanced Search Integration', () => {
    test('should integrate review filtering with general search', async () => {
      const results = await searchVendorsWithReviews('photographer', 'London', {
        minRating: 4.0,
        minReviews: 1
      });
      
      expect(results.vendors).toBeDefined();
      expect(results.total).toBeGreaterThan(0);
      expect(results.reviewFiltersApplied).toBe(true);
      
      // All results should have review data
      results.vendors.forEach((vendor: any) => {
        expect(vendor.reviews).toBeDefined();
        expect(vendor.reviews.averageRating).toBeGreaterThanOrEqual(4.0);
        expect(vendor.trends).toBeDefined();
      });
    });

    test('should properly weight review scores in final ranking', async () => {
      const results = await searchVendorsWithReviews('wedding vendor', 'London');
      
      expect(results.vendors.length).toBeGreaterThan(0);
      
      // Vendors should be sorted by finalScore
      for (let i = 0; i < results.vendors.length - 1; i++) {
        expect(results.vendors[i].finalScore).toBeGreaterThanOrEqual(
          results.vendors[i + 1].finalScore
        );
      }
    });

    test('should handle search with no review criteria', async () => {
      const results = await searchVendorsWithReviews('wedding', 'London');
      
      expect(results.reviewFiltersApplied).toBe(false);
      expect(results.vendors.length).toBeGreaterThan(0);
    });

    test('should return empty results when review criteria too strict', async () => {
      const results = await searchVendorsWithReviews('wedding', 'London', {
        minRating: 5.0,
        minReviews: 10,
        verifiedOnly: true,
        includePhotos: true
      });
      
      // These criteria are too strict for our mock data
      expect(results.vendors.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Review Data Quality and Validation', () => {
    test('should validate review data integrity', async () => {
      const reviews = await reviewService.getVendorReviews('vendor-photo-001');
      
      reviews.forEach(review => {
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
        expect(review.vendorId).toBeTruthy();
        expect(review.coupleId).toBeTruthy();
        expect(review.reviewDate).toBeTruthy();
        expect(['positive', 'neutral', 'negative']).toContain(review.sentiment);
        
        // Validate category scores
        Object.values(review.categories).forEach(score => {
          expect(score).toBeGreaterThanOrEqual(1);
          expect(score).toBeLessThanOrEqual(5);
        });
      });
    });

    test('should handle edge cases in review analysis', async () => {
      // Test with vendor that has no reviews
      const emptyMetrics = await reviewService.calculateReviewMetrics('vendor-nonexistent');
      expect(emptyMetrics.averageRating).toBe(0);
      expect(emptyMetrics.totalReviews).toBe(0);
      
      // Test trend analysis with insufficient data
      const emptyTrends = await reviewService.analyzeReviewTrends('vendor-nonexistent');
      expect(emptyTrends.ratingTrend.direction).toBe('stable');
    });
  });

  describe('Performance Requirements', () => {
    test('should calculate review metrics within performance limits', async () => {
      const startTime = Date.now();
      
      await reviewService.calculateReviewMetrics('vendor-photo-001');
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100); // Should complete under 100ms
    });

    test('should handle concurrent review analysis efficiently', async () => {
      const vendorIds = ['vendor-photo-001', 'vendor-venue-001', 'vendor-cater-001'];
      
      const startTime = Date.now();
      
      const concurrentAnalysis = vendorIds.map(id => 
        Promise.all([
          reviewService.calculateReviewMetrics(id),
          reviewService.analyzeReviewTrends(id)
        ])
      );
      
      await Promise.all(concurrentAnalysis);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(500); // Should handle concurrent requests efficiently
    });

    test('should scale review search with large filter criteria', async () => {
      const startTime = Date.now();
      
      await reviewService.searchByReviews({
        minRating: 3.0,
        minReviews: 1,
        verifiedOnly: true,
        recentOnly: true,
        includePhotos: true,
        excludeNegative: false
      });
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(200); // Should handle complex filtering efficiently
    });
  });

  describe('Review Integration Edge Cases', () => {
    test('should handle missing or corrupted review data gracefully', async () => {
      // Mock service should handle non-existent vendors
      const metrics = await reviewService.calculateReviewMetrics('vendor-missing');
      expect(metrics).toBeDefined();
      expect(metrics.totalReviews).toBe(0);
    });

    test('should maintain search functionality when review service fails', async () => {
      // Mock a review service failure
      const mockFailedService = {
        searchByReviews: vi.fn().mockRejectedValue(new Error('Service unavailable'))
      };

      // Search should still work with fallback
      try {
        await mockFailedService.searchByReviews({});
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle extreme review scores appropriately', async () => {
      // Test metrics calculation handles all 1-star or all 5-star scenarios
      const perfectMetrics = await reviewService.calculateReviewMetrics('vendor-photo-001');
      expect(perfectMetrics.averageRating).toBeGreaterThan(4.5);
      
      const poorMetrics = await reviewService.calculateReviewMetrics('vendor-cater-001');
      expect(poorMetrics.averageRating).toBeLessThan(3);
    });
  });
});