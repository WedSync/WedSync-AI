import { createClient } from '@/lib/supabase/server';

export class AnalyticsQueries {
  private supabase;

  constructor() {
    this.supabase = null;
  }

  private async initSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
  }

  async getSupplierReviewOverview(supplierId: string) {
    await this.initSupabase();

    try {
      // Get review metrics for supplier
      const { data: reviews, error } = await this.supabase
        .from('reviews')
        .select(
          `
          id,
          rating,
          review_text,
          created_at,
          client:clients(first_name, last_name),
          wedding_date
        `,
        )
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const totalReviews = reviews?.length || 0;
      const averageRating =
        totalReviews > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            totalReviews
          : 0;

      const ratingDistribution = {
        5: reviews?.filter((r) => r.rating === 5).length || 0,
        4: reviews?.filter((r) => r.rating === 4).length || 0,
        3: reviews?.filter((r) => r.rating === 3).length || 0,
        2: reviews?.filter((r) => r.rating === 2).length || 0,
        1: reviews?.filter((r) => r.rating === 1).length || 0,
      };

      // Recent reviews trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentReviews =
        reviews?.filter((r) => new Date(r.created_at) >= sixMonthsAgo) || [];

      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        recentReviews: recentReviews.length,
        recentAverageRating:
          recentReviews.length > 0
            ? Math.round(
                (recentReviews.reduce((sum, r) => sum + r.rating, 0) /
                  recentReviews.length) *
                  10,
              ) / 10
            : 0,
        reviews: reviews?.slice(0, 10), // Latest 10 reviews
      };
    } catch (error) {
      console.error('Error fetching supplier review overview:', error);
      throw error;
    }
  }

  async getSupplierPerformanceMetrics(
    supplierId: string,
    period: string = '6months',
  ) {
    await this.initSupabase();

    try {
      let startDate = new Date();

      switch (period) {
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 6);
      }

      // Get weddings and reviews for the period
      const { data: weddings, error: weddingsError } = await this.supabase
        .from('clients')
        .select(
          `
          id,
          wedding_date,
          status,
          created_at,
          vendor_assignments!inner(vendor_id)
        `,
        )
        .eq('vendor_assignments.vendor_id', supplierId)
        .gte('wedding_date', startDate.toISOString());

      if (weddingsError) throw weddingsError;

      const { data: reviews, error: reviewsError } = await this.supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('supplier_id', supplierId)
        .gte('created_at', startDate.toISOString());

      if (reviewsError) throw reviewsError;

      // Calculate metrics
      const totalWeddings = weddings?.length || 0;
      const completedWeddings =
        weddings?.filter((w) => w.status === 'completed').length || 0;
      const completionRate =
        totalWeddings > 0 ? (completedWeddings / totalWeddings) * 100 : 0;

      const averageRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return {
        totalWeddings,
        completedWeddings,
        completionRate: Math.round(completionRate * 10) / 10,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews?.length || 0,
        period,
      };
    } catch (error) {
      console.error('Error fetching supplier performance metrics:', error);
      throw error;
    }
  }

  async getCampaignAnalytics(campaignId: string) {
    await this.initSupabase();

    try {
      // Get campaign data
      const { data: campaign, error: campaignError } = await this.supabase
        .from('review_campaigns')
        .select(
          `
          id,
          name,
          status,
          created_at,
          target_reviews,
          sent_count,
          response_rate,
          supplier_id
        `,
        )
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get campaign responses/reviews
      const { data: responses, error: responsesError } = await this.supabase
        .from('campaign_responses')
        .select(
          `
          id,
          response_type,
          created_at,
          review_id,
          reviews(rating, review_text)
        `,
        )
        .eq('campaign_id', campaignId);

      if (responsesError) throw responsesError;

      const totalResponses = responses?.length || 0;
      const reviewResponses =
        responses?.filter((r) => r.response_type === 'review').length || 0;
      const averageRating =
        responses && responses.length > 0
          ? responses
              .filter((r) => r.reviews?.rating)
              .reduce((sum, r) => sum + (r.reviews?.rating || 0), 0) /
              reviewResponses || 0
          : 0;

      return {
        campaign,
        totalResponses,
        reviewResponses,
        responseRate:
          campaign.sent_count > 0
            ? Math.round((totalResponses / campaign.sent_count) * 100 * 10) / 10
            : 0,
        averageRating: Math.round(averageRating * 10) / 10,
        responses: responses?.slice(0, 20), // Latest 20 responses
      };
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      throw error;
    }
  }
}

export const analyticsQueries = new AnalyticsQueries();
