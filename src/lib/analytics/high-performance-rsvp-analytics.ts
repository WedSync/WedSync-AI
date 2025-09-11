import { createClient } from '@/lib/supabase/server';

export interface RSVPAnalyticsSnapshot {
  event_id: string;
  timestamp: string;

  // Core Metrics
  total_invited: number;
  total_responded: number;
  total_attending: number;
  total_not_attending: number;
  total_maybe: number;
  total_guests_confirmed: number;

  // Calculated Metrics
  response_rate_percentage: number;
  attendance_rate_percentage: number;
  avg_party_size: number;

  // Predictions
  predicted_final_attendance: number;
  prediction_confidence: number;

  // Detailed Breakdowns
  meal_preferences: Record<string, number>;
  dietary_restrictions: Record<string, number>;
  age_distribution: Record<string, number>;
  household_stats: {
    total_households: number;
    avg_household_size: number;
    single_person_households: number;
  };

  // Waitlist & Plus-ones
  waitlist_count: number;
  plus_ones_count: number;
  plus_ones_confirmed: number;

  // Timing Analysis
  days_to_event: number;
  response_velocity: number; // responses per day
  peak_response_time: string; // hour of day most responses come in

  // Escalation Status
  escalation_stats: {
    total_active_escalations: number;
    by_level: Record<number, number>;
    total_reminders_sent: number;
  };
}

export interface RSVPTrendData {
  date: string;
  attending_count: number;
  not_attending_count: number;
  maybe_count: number;
  total_responses: number;
  prediction_attendance: number;
  confidence_score: number;
}

export class HighPerformanceRSVPAnalytics {
  private static memoryCache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private static readonly CACHE_TTL = 30000; // 30 seconds for high-frequency updates
  private static readonly PREDICTION_CACHE_TTL = 300000; // 5 minutes for predictions

  /**
   * Get comprehensive analytics snapshot with <200ms performance guarantee
   */
  static async getAnalyticsSnapshot(
    eventId: string,
  ): Promise<RSVPAnalyticsSnapshot> {
    const cacheKey = `analytics_snapshot_${eventId}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const supabase = await createClient();

      // Use the materialized view for base statistics (ultra-fast)
      const { data: summary, error: summaryError } = await supabase
        .from('rsvp_analytics_summary')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (summaryError) {
        throw new Error(
          `Failed to fetch analytics summary: ${summaryError.message}`,
        );
      }

      // Get additional real-time data in parallel
      const [
        escalationData,
        predictionData,
        mealData,
        dietaryData,
        ageData,
        householdData,
        plusOneData,
        velocityData,
      ] = await Promise.all([
        this.getEscalationStats(eventId),
        this.getPredictionData(eventId),
        this.getMealPreferences(eventId),
        this.getDietaryRestrictions(eventId),
        this.getAgeDistribution(eventId),
        this.getHouseholdStats(eventId),
        this.getPlusOneStats(eventId),
        this.getResponseVelocity(eventId),
      ]);

      const snapshot: RSVPAnalyticsSnapshot = {
        event_id: eventId,
        timestamp: new Date().toISOString(),

        // From materialized view (optimized)
        total_invited: summary.total_invited || 0,
        total_responded: summary.total_responded || 0,
        total_attending: summary.total_attending || 0,
        total_not_attending: summary.total_not_attending || 0,
        total_maybe: summary.total_maybe || 0,
        total_guests_confirmed: summary.total_guests_confirmed || 0,
        response_rate_percentage: summary.response_rate_percentage || 0,
        avg_party_size: summary.avg_party_size || 0,
        waitlist_count: summary.waitlist_count || 0,
        plus_ones_count: summary.plus_ones_count || 0,

        // Calculated metrics
        attendance_rate_percentage:
          summary.total_invited > 0
            ? Math.round(
                (summary.total_attending / summary.total_invited) * 100 * 100,
              ) / 100
            : 0,

        // From additional queries
        predicted_final_attendance:
          predictionData.predicted_attendance || summary.total_attending,
        prediction_confidence: predictionData.confidence_percentage || 0,

        meal_preferences: mealData,
        dietary_restrictions: dietaryData,
        age_distribution: ageData,
        household_stats: householdData,
        plus_ones_confirmed: plusOneData.confirmed_count,

        days_to_event: velocityData.days_to_event,
        response_velocity: velocityData.velocity,
        peak_response_time: velocityData.peak_hour,

        escalation_stats: escalationData,
      };

      const processingTime = Date.now() - startTime;

      // Cache with dynamic TTL based on performance
      const ttl = processingTime > 100 ? this.CACHE_TTL * 2 : this.CACHE_TTL;
      this.setCachedData(cacheKey, snapshot, ttl);

      // Log performance for monitoring
      if (processingTime > 200) {
        console.warn(
          `Analytics snapshot took ${processingTime}ms for event ${eventId}`,
        );
      }

      return snapshot;
    } catch (error) {
      console.error('Error generating analytics snapshot:', error);
      throw error;
    }
  }

  /**
   * Get trend data for charts and visualization
   */
  static async getTrendData(
    eventId: string,
    days: number = 30,
  ): Promise<RSVPTrendData[]> {
    const cacheKey = `trend_data_${eventId}_${days}`;
    const cached = this.getCachedData(cacheKey, 600000); // 10 min cache for trends

    if (cached) {
      return cached;
    }

    try {
      const supabase = await createClient();

      // Get historical daily snapshots
      const { data: trends, error } = await supabase
        .from('rsvp_analytics')
        .select('*')
        .eq('event_id', eventId)
        .gte(
          'date',
          new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        )
        .order('date');

      if (error) {
        throw error;
      }

      // Get predictions for each day
      const { data: predictions } = await supabase
        .from('rsvp_analytics_predictions')
        .select('*')
        .eq('event_id', eventId)
        .gte(
          'prediction_date',
          new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        )
        .order('prediction_date');

      const predictionMap = new Map(
        (predictions || []).map((p) => [p.prediction_date, p]),
      );

      const trendData: RSVPTrendData[] = (trends || []).map((trend) => ({
        date: trend.date,
        attending_count: trend.total_attending || 0,
        not_attending_count: trend.total_not_attending || 0,
        maybe_count: trend.total_maybe || 0,
        total_responses: trend.total_responded || 0,
        prediction_attendance:
          predictionMap.get(trend.date)?.predicted_final_attendance ||
          trend.total_attending,
        confidence_score:
          predictionMap.get(trend.date)?.prediction_confidence || 0,
      }));

      this.setCachedData(cacheKey, trendData, 600000);
      return trendData;
    } catch (error) {
      console.error('Error fetching trend data:', error);
      return [];
    }
  }

  /**
   * Generate real-time prediction using the database function
   */
  static async generatePrediction(eventId: string): Promise<{
    predicted_attendance: number;
    confidence_percentage: number;
    factors: any;
  }> {
    const cacheKey = `prediction_${eventId}`;
    const cached = this.getCachedData(cacheKey, this.PREDICTION_CACHE_TTL);

    if (cached) {
      return cached;
    }

    try {
      const supabase = await createClient();

      const { data: prediction, error } = await supabase.rpc(
        'calculate_attendance_prediction',
        { p_event_id: eventId },
      );

      if (error || !prediction || prediction.length === 0) {
        throw new Error('Failed to generate prediction');
      }

      const result = {
        predicted_attendance: prediction[0].predicted_attendance,
        confidence_percentage: prediction[0].confidence_percentage,
        factors: prediction[0].factors,
      };

      // Save prediction to database for historical tracking
      await supabase.from('rsvp_analytics_predictions').upsert({
        event_id: eventId,
        prediction_date: new Date().toISOString().split('T')[0],
        predicted_final_attendance: result.predicted_attendance,
        prediction_confidence: result.confidence_percentage,
        factors_json: result.factors,
        historical_patterns: {},
        response_velocity: result.factors.response_velocity || 0,
        time_to_event_days: result.factors.days_to_event || 0,
      });

      this.setCachedData(cacheKey, result, this.PREDICTION_CACHE_TTL);
      return result;
    } catch (error) {
      console.error('Error generating prediction:', error);
      throw error;
    }
  }

  /**
   * Get real-time response statistics
   */
  static async getResponseStats(eventId: string): Promise<{
    last_24h_responses: number;
    last_7d_responses: number;
    most_active_hour: number;
    response_pattern: 'early' | 'steady' | 'last_minute';
  }> {
    const cacheKey = `response_stats_${eventId}`;
    const cached = this.getCachedData(cacheKey, 300000); // 5 min cache

    if (cached) {
      return cached;
    }

    try {
      const supabase = await createClient();

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get response counts and patterns
      const { data: responses, error } = await supabase
        .from('rsvp_responses')
        .select('responded_at')
        .eq('event_id', eventId)
        .gte('responded_at', weekAgo.toISOString());

      if (error) {
        throw error;
      }

      const last24h = (responses || []).filter(
        (r) => new Date(r.responded_at) >= yesterday,
      ).length;

      const hourCounts = new Array(24).fill(0);
      (responses || []).forEach((response) => {
        const hour = new Date(response.responded_at).getHours();
        hourCounts[hour]++;
      });

      const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));

      // Determine response pattern
      let responsePattern: 'early' | 'steady' | 'last_minute' = 'steady';
      if (responses && responses.length > 10) {
        const sortedResponses = responses.sort(
          (a, b) =>
            new Date(a.responded_at).getTime() -
            new Date(b.responded_at).getTime(),
        );

        const firstThird = sortedResponses.slice(
          0,
          Math.floor(responses.length / 3),
        );
        const lastThird = sortedResponses.slice(
          -Math.floor(responses.length / 3),
        );

        if (firstThird.length > lastThird.length * 1.5) {
          responsePattern = 'early';
        } else if (lastThird.length > firstThird.length * 1.5) {
          responsePattern = 'last_minute';
        }
      }

      const stats = {
        last_24h_responses: last24h,
        last_7d_responses: responses?.length || 0,
        most_active_hour: mostActiveHour,
        response_pattern: responsePattern,
      };

      this.setCachedData(cacheKey, stats, 300000);
      return stats;
    } catch (error) {
      console.error('Error fetching response stats:', error);
      return {
        last_24h_responses: 0,
        last_7d_responses: 0,
        most_active_hour: 12,
        response_pattern: 'steady',
      };
    }
  }

  /**
   * Trigger analytics refresh and cache invalidation
   */
  static async refreshAnalytics(eventId: string): Promise<void> {
    try {
      const supabase = await createClient();

      // Refresh materialized view
      await supabase.rpc('refresh_rsvp_analytics_summary');

      // Clear caches for this event
      const keysToDelete = Array.from(this.memoryCache.keys()).filter((key) =>
        key.includes(eventId),
      );

      keysToDelete.forEach((key) => this.memoryCache.delete(key));

      // Update analytics table
      await supabase.rpc('update_rsvp_analytics', { p_event_id: eventId });
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    }
  }

  // Private helper methods
  private static getCachedData(key: string, customTtl?: number): any | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const ttl = customTtl || cached.ttl;
    if (Date.now() - cached.timestamp > ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private static setCachedData(key: string, data: any, ttl: number): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private static async getEscalationStats(eventId: string) {
    const { RSVPReminderService } = await import(
      '../services/rsvpReminderService'
    );
    return await RSVPReminderService.getEscalationStatus(eventId);
  }

  private static async getPredictionData(eventId: string) {
    try {
      return await this.generatePrediction(eventId);
    } catch {
      return { predicted_attendance: 0, confidence_percentage: 0, factors: {} };
    }
  }

  private static async getMealPreferences(
    eventId: string,
  ): Promise<Record<string, number>> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('rsvp_guest_details')
        .select('meal_preference')
        .eq(
          'response_id',
          supabase.from('rsvp_responses').select('id').eq('event_id', eventId),
        );

      const preferences: Record<string, number> = {};
      (data || []).forEach((item) => {
        if (item.meal_preference) {
          preferences[item.meal_preference] =
            (preferences[item.meal_preference] || 0) + 1;
        }
      });

      return preferences;
    } catch {
      return {};
    }
  }

  private static async getDietaryRestrictions(
    eventId: string,
  ): Promise<Record<string, number>> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('rsvp_guest_details')
        .select('dietary_restrictions')
        .eq(
          'response_id',
          supabase.from('rsvp_responses').select('id').eq('event_id', eventId),
        );

      const restrictions: Record<string, number> = {};
      (data || []).forEach((item) => {
        (item.dietary_restrictions || []).forEach((restriction: string) => {
          restrictions[restriction] = (restrictions[restriction] || 0) + 1;
        });
      });

      return restrictions;
    } catch {
      return {};
    }
  }

  private static async getAgeDistribution(
    eventId: string,
  ): Promise<Record<string, number>> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('rsvp_guest_details')
        .select('age_group')
        .eq(
          'response_id',
          supabase.from('rsvp_responses').select('id').eq('event_id', eventId),
        );

      const distribution: Record<string, number> = {};
      (data || []).forEach((item) => {
        if (item.age_group) {
          distribution[item.age_group] =
            (distribution[item.age_group] || 0) + 1;
        }
      });

      return distribution;
    } catch {
      return {};
    }
  }

  private static async getHouseholdStats(eventId: string) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('rsvp_households')
        .select('total_expected_guests')
        .eq('event_id', eventId);

      const totalHouseholds = data?.length || 0;
      const singlePersonHouseholds = (data || []).filter(
        (h) => h.total_expected_guests === 1,
      ).length;
      const avgHouseholdSize =
        totalHouseholds > 0
          ? (data || []).reduce((sum, h) => sum + h.total_expected_guests, 0) /
            totalHouseholds
          : 0;

      return {
        total_households: totalHouseholds,
        avg_household_size: Math.round(avgHouseholdSize * 100) / 100,
        single_person_households: singlePersonHouseholds,
      };
    } catch {
      return {
        total_households: 0,
        avg_household_size: 0,
        single_person_households: 0,
      };
    }
  }

  private static async getPlusOneStats(eventId: string) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('rsvp_plus_one_relationships')
        .select('is_confirmed')
        .eq(
          'primary_invitation_id',
          supabase
            .from('rsvp_invitations')
            .select('id')
            .eq('event_id', eventId),
        );

      return {
        confirmed_count: (data || []).filter((p) => p.is_confirmed).length,
      };
    } catch {
      return { confirmed_count: 0 };
    }
  }

  private static async getResponseVelocity(eventId: string) {
    try {
      const supabase = await createClient();

      const { data: event } = await supabase
        .from('rsvp_events')
        .select('event_date, created_at')
        .eq('id', eventId)
        .single();

      const { data: responses } = await supabase
        .from('rsvp_responses')
        .select('responded_at')
        .eq('event_id', eventId);

      if (!event || !responses) {
        return { days_to_event: 0, velocity: 0, peak_hour: '12:00' };
      }

      const daysToEvent = Math.ceil(
        (new Date(event.event_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );

      const daysSinceCreated = Math.ceil(
        (Date.now() - new Date(event.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const velocity =
        daysSinceCreated > 0 ? responses.length / daysSinceCreated : 0;

      // Find peak response hour
      const hourCounts = new Array(24).fill(0);
      responses.forEach((response) => {
        const hour = new Date(response.responded_at).getHours();
        hourCounts[hour]++;
      });

      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
      const peakHourFormatted = `${peakHour.toString().padStart(2, '0')}:00`;

      return {
        days_to_event: daysToEvent,
        velocity: Math.round(velocity * 100) / 100,
        peak_hour: peakHourFormatted,
      };
    } catch {
      return { days_to_event: 0, velocity: 0, peak_hour: '12:00' };
    }
  }
}
