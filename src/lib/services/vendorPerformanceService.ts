import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface VendorPerformanceMetrics {
  vendor_id: string;
  total_reviews: number;
  average_overall_rating: number;
  average_communication_rating: number;
  average_quality_rating: number;
  average_professionalism_rating: number;
  average_value_rating: number;
  average_reliability_rating: number;
  recommendation_percentage: number;
  hire_again_percentage: number;
  vendor_response_rate: number;
  reviews_last_30_days: number;
  reviews_last_90_days: number;
  reviews_last_year: number;
  rating_distribution: {
    rating_1_count: number;
    rating_2_count: number;
    rating_3_count: number;
    rating_4_count: number;
    rating_5_count: number;
  };
  last_review_date: string | null;
  metrics_updated_at: string;
}

export interface VendorPerformanceTrend {
  period: string;
  reviews_count: number;
  average_rating: number;
  recommendation_rate: number;
}

export interface VendorBenchmark {
  category: string;
  metric: string;
  vendor_value: number;
  category_average: number;
  percentile_rank: number;
}

export class VendorPerformanceService {
  private supabase = createClientComponentClient();

  /**
   * Get comprehensive performance metrics for a vendor
   */
  async getVendorMetrics(
    vendorId: string,
  ): Promise<VendorPerformanceMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from('vendor_performance_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .single();

      if (error) throw error;

      return {
        vendor_id: data.vendor_id,
        total_reviews: data.total_reviews || 0,
        average_overall_rating: parseFloat(data.average_overall_rating || '0'),
        average_communication_rating: parseFloat(
          data.average_communication_rating || '0',
        ),
        average_quality_rating: parseFloat(data.average_quality_rating || '0'),
        average_professionalism_rating: parseFloat(
          data.average_professionalism_rating || '0',
        ),
        average_value_rating: parseFloat(data.average_value_rating || '0'),
        average_reliability_rating: parseFloat(
          data.average_reliability_rating || '0',
        ),
        recommendation_percentage: parseFloat(
          data.recommendation_percentage || '0',
        ),
        hire_again_percentage: parseFloat(data.hire_again_percentage || '0'),
        vendor_response_rate: parseFloat(data.vendor_response_rate || '0'),
        reviews_last_30_days: data.reviews_last_30_days || 0,
        reviews_last_90_days: data.reviews_last_90_days || 0,
        reviews_last_year: data.reviews_last_year || 0,
        rating_distribution: {
          rating_1_count: data.rating_1_count || 0,
          rating_2_count: data.rating_2_count || 0,
          rating_3_count: data.rating_3_count || 0,
          rating_4_count: data.rating_4_count || 0,
          rating_5_count: data.rating_5_count || 0,
        },
        last_review_date: data.last_review_date,
        metrics_updated_at: data.metrics_updated_at,
      };
    } catch (error) {
      console.error('Error fetching vendor metrics:', error);
      return null;
    }
  }

  /**
   * Get performance trends for a vendor over time
   */
  async getVendorPerformanceTrends(
    vendorId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<VendorPerformanceTrend[]> {
    try {
      const daysAgo =
        period === '7d'
          ? 7
          : period === '30d'
            ? 30
            : period === '90d'
              ? 90
              : 365;
      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('vendor_reviews')
        .select('created_at, overall_rating, would_recommend')
        .eq('vendor_id', vendorId)
        .eq('moderation_status', 'approved')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Group by time period (day, week, or month depending on range)
      const groupBy =
        period === '7d' || period === '30d'
          ? 'day'
          : period === '90d'
            ? 'week'
            : 'month';

      const trends = this.groupReviewsByPeriod(data || [], groupBy);

      return trends;
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      return [];
    }
  }

  /**
   * Compare vendor performance against category benchmarks
   */
  async getVendorBenchmarks(vendorId: string): Promise<VendorBenchmark[]> {
    try {
      // Get vendor metrics
      const vendorMetrics = await this.getVendorMetrics(vendorId);
      if (!vendorMetrics) return [];

      // Get vendor category
      const { data: vendorData } = await this.supabase
        .from('vendors')
        .select('category')
        .eq('id', vendorId)
        .single();

      if (!vendorData) return [];

      // Get category averages
      const { data: categoryMetrics } = await this.supabase
        .from('vendor_performance_metrics')
        .select(
          `
          average_overall_rating,
          average_communication_rating,
          average_quality_rating,
          average_professionalism_rating,
          average_value_rating,
          average_reliability_rating,
          recommendation_percentage,
          vendor_response_rate,
          vendor:vendors!vendor_performance_metrics_vendor_id_fkey(category)
        `,
        )
        .eq('vendor.category', vendorData.category)
        .gt('total_reviews', 0);

      if (!categoryMetrics) return [];

      // Calculate benchmarks
      const benchmarks: VendorBenchmark[] = [];
      const metrics = [
        { key: 'average_overall_rating', name: 'Overall Rating' },
        { key: 'average_communication_rating', name: 'Communication' },
        { key: 'average_quality_rating', name: 'Quality' },
        { key: 'average_professionalism_rating', name: 'Professionalism' },
        { key: 'average_value_rating', name: 'Value' },
        { key: 'average_reliability_rating', name: 'Reliability' },
        { key: 'recommendation_percentage', name: 'Recommendation Rate' },
        { key: 'vendor_response_rate', name: 'Response Rate' },
      ];

      for (const metric of metrics) {
        const vendorValue = vendorMetrics[
          metric.key as keyof VendorPerformanceMetrics
        ] as number;
        const categoryValues = categoryMetrics
          .map((m) => parseFloat(m[metric.key as keyof typeof m] || '0'))
          .filter((v) => v > 0);

        if (categoryValues.length === 0) continue;

        const categoryAverage =
          categoryValues.reduce((sum, val) => sum + val, 0) /
          categoryValues.length;
        const betterCount = categoryValues.filter(
          (val) => vendorValue > val,
        ).length;
        const percentileRank = (betterCount / categoryValues.length) * 100;

        benchmarks.push({
          category: vendorData.category,
          metric: metric.name,
          vendor_value: vendorValue,
          category_average: categoryAverage,
          percentile_rank: percentileRank,
        });
      }

      return benchmarks;
    } catch (error) {
      console.error('Error calculating benchmarks:', error);
      return [];
    }
  }

  /**
   * Get vendor performance alerts and recommendations
   */
  async getPerformanceInsights(vendorId: string): Promise<{
    alerts: Array<{ type: 'warning' | 'critical' | 'info'; message: string }>;
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      impact: string;
    }>;
  }> {
    try {
      const metrics = await this.getVendorMetrics(vendorId);
      const trends = await this.getVendorPerformanceTrends(vendorId, '30d');
      const benchmarks = await this.getVendorBenchmarks(vendorId);

      const alerts: Array<{
        type: 'warning' | 'critical' | 'info';
        message: string;
      }> = [];
      const recommendations: Array<{
        priority: 'high' | 'medium' | 'low';
        action: string;
        impact: string;
      }> = [];

      if (!metrics) return { alerts, recommendations };

      // Performance alerts
      if (metrics.average_overall_rating < 3.0 && metrics.total_reviews >= 3) {
        alerts.push({
          type: 'critical',
          message: `Low overall rating (${metrics.average_overall_rating.toFixed(1)}/5.0) requires immediate attention`,
        });
      }

      if (
        metrics.recommendation_percentage < 70 &&
        metrics.total_reviews >= 5
      ) {
        alerts.push({
          type: 'warning',
          message: `Only ${metrics.recommendation_percentage.toFixed(0)}% of customers would recommend this vendor`,
        });
      }

      if (metrics.vendor_response_rate < 50 && metrics.total_reviews >= 3) {
        alerts.push({
          type: 'warning',
          message: `Low response rate (${metrics.vendor_response_rate.toFixed(0)}%) - consider responding to more reviews`,
        });
      }

      if (metrics.reviews_last_30_days === 0 && metrics.total_reviews > 0) {
        alerts.push({
          type: 'info',
          message: 'No new reviews in the past 30 days',
        });
      }

      // Performance recommendations
      if (
        metrics.average_communication_rating <
        metrics.average_overall_rating - 0.5
      ) {
        recommendations.push({
          priority: 'high',
          action: 'Improve communication responsiveness and clarity',
          impact:
            'Better communication can increase overall satisfaction by 0.3-0.5 stars',
        });
      }

      if (metrics.vendor_response_rate < 80) {
        recommendations.push({
          priority: 'medium',
          action: 'Respond to more customer reviews, especially recent ones',
          impact: 'Higher response rates correlate with 15-25% more bookings',
        });
      }

      if (metrics.average_value_rating < 4.0 && metrics.total_reviews >= 5) {
        recommendations.push({
          priority: 'medium',
          action: 'Review pricing strategy and value proposition',
          impact:
            'Improved value perception can increase recommendation rate by 10-20%',
        });
      }

      // Trend-based recommendations
      if (trends.length >= 2) {
        const recentTrend = trends.slice(-2);
        const ratingChange =
          recentTrend[1].average_rating - recentTrend[0].average_rating;

        if (ratingChange < -0.3) {
          recommendations.push({
            priority: 'high',
            action: 'Address declining rating trend immediately',
            impact:
              'Stopping negative trends early prevents long-term reputation damage',
          });
        }
      }

      // Benchmark-based recommendations
      const poorPerformingCategories = benchmarks.filter(
        (b) => b.percentile_rank < 25,
      );
      for (const category of poorPerformingCategories) {
        recommendations.push({
          priority: 'medium',
          action: `Focus on improving ${category.metric.toLowerCase()} (bottom 25% in category)`,
          impact: `Reaching category average could improve overall rating by 0.1-0.3 stars`,
        });
      }

      return { alerts, recommendations };
    } catch (error) {
      console.error('Error generating performance insights:', error);
      return { alerts: [], recommendations: [] };
    }
  }

  /**
   * Force refresh vendor metrics (useful after new reviews)
   */
  async refreshVendorMetrics(vendorId: string): Promise<void> {
    try {
      // Trigger the stored function that updates metrics
      await this.supabase.rpc('update_vendor_performance_metrics', {
        vendor_id_param: vendorId,
      });
    } catch (error) {
      console.error('Error refreshing vendor metrics:', error);
    }
  }

  /**
   * Get performance comparison between vendors
   */
  async compareVendors(vendorIds: string[]): Promise<
    Array<{
      vendor_id: string;
      vendor_name: string;
      metrics: VendorPerformanceMetrics;
      rank: number;
    }>
  > {
    try {
      const comparisons = await Promise.all(
        vendorIds.map(async (id) => {
          const metrics = await this.getVendorMetrics(id);

          // Get vendor name
          const { data: vendor } = await this.supabase
            .from('vendors')
            .select('business_name')
            .eq('id', id)
            .single();

          return {
            vendor_id: id,
            vendor_name: vendor?.business_name || 'Unknown',
            metrics: metrics!,
            rank: 0, // Will be calculated below
          };
        }),
      );

      // Sort by overall performance score and assign ranks
      const validComparisons = comparisons.filter((c) => c.metrics);
      validComparisons.sort((a, b) => {
        const scoreA = this.calculatePerformanceScore(a.metrics);
        const scoreB = this.calculatePerformanceScore(b.metrics);
        return scoreB - scoreA;
      });

      // Assign ranks
      validComparisons.forEach((comparison, index) => {
        comparison.rank = index + 1;
      });

      return validComparisons;
    } catch (error) {
      console.error('Error comparing vendors:', error);
      return [];
    }
  }

  /**
   * Calculate a composite performance score
   */
  private calculatePerformanceScore(metrics: VendorPerformanceMetrics): number {
    const weights = {
      rating: 0.3,
      recommendation: 0.25,
      response: 0.15,
      volume: 0.15,
      recency: 0.15,
    };

    const ratingScore = (metrics.average_overall_rating / 5) * 100;
    const recommendationScore = metrics.recommendation_percentage;
    const responseScore = metrics.vendor_response_rate;
    const volumeScore = Math.min((metrics.total_reviews / 10) * 100, 100); // Cap at 10 reviews
    const recencyScore =
      metrics.reviews_last_30_days > 0
        ? 100
        : metrics.reviews_last_90_days > 0
          ? 75
          : metrics.reviews_last_year > 0
            ? 50
            : 0;

    return (
      ratingScore * weights.rating +
      recommendationScore * weights.recommendation +
      responseScore * weights.response +
      volumeScore * weights.volume +
      recencyScore * weights.recency
    );
  }

  /**
   * Group reviews by time period for trend analysis
   */
  private groupReviewsByPeriod(
    reviews: Array<{
      created_at: string;
      overall_rating: number;
      would_recommend: boolean;
    }>,
    groupBy: 'day' | 'week' | 'month',
  ): VendorPerformanceTrend[] {
    const groups: {
      [key: string]: Array<{
        overall_rating: number;
        would_recommend: boolean;
      }>;
    } = {};

    reviews.forEach((review) => {
      const date = new Date(review.created_at);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push({
        overall_rating: review.overall_rating,
        would_recommend: review.would_recommend,
      });
    });

    return Object.entries(groups)
      .map(([period, periodReviews]) => ({
        period,
        reviews_count: periodReviews.length,
        average_rating:
          periodReviews.reduce((sum, r) => sum + r.overall_rating, 0) /
          periodReviews.length,
        recommendation_rate:
          (periodReviews.filter((r) => r.would_recommend).length /
            periodReviews.length) *
          100,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Export vendor performance data
   */
  async exportVendorPerformanceData(
    vendorId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    try {
      const metrics = await this.getVendorMetrics(vendorId);
      const trends = await this.getVendorPerformanceTrends(vendorId, '1y');
      const benchmarks = await this.getVendorBenchmarks(vendorId);
      const insights = await this.getPerformanceInsights(vendorId);

      const exportData = {
        generated_at: new Date().toISOString(),
        vendor_id: vendorId,
        metrics,
        trends,
        benchmarks,
        insights,
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else {
        // Convert to CSV format
        let csv = 'Vendor Performance Report\n';
        csv += `Generated: ${exportData.generated_at}\n`;
        csv += `Vendor ID: ${vendorId}\n\n`;

        // Add metrics
        csv += 'Metrics\n';
        csv += 'Metric,Value\n';
        if (metrics) {
          csv += `Total Reviews,${metrics.total_reviews}\n`;
          csv += `Average Rating,${metrics.average_overall_rating}\n`;
          csv += `Recommendation Rate,${metrics.recommendation_percentage}%\n`;
          csv += `Response Rate,${metrics.vendor_response_rate}%\n`;
        }

        return csv;
      }
    } catch (error) {
      console.error('Error exporting performance data:', error);
      throw error;
    }
  }
}
