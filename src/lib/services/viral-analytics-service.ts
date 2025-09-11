/**
 * Viral Analytics Service - WS-141 Round 2
 * Advanced analytics for viral optimization with generation tracking
 * PERFORMANCE: Complex queries under 1s, analytics under 200ms
 */

import { supabase } from '@/lib/supabase/client';

// Types for viral analytics
export interface GenerationAnalysis {
  generation: number;
  total_invites_sent: number;
  total_responses: number;
  total_signups: number;
  conversion_rate: number;
  average_time_to_response: number; // hours
  viral_coefficient: number;
  dropoff_rate: number;
  most_active_connector: string | null;
  geographic_spread: number; // unique regions reached
}

export interface ChannelPerformance {
  channel: 'email' | 'whatsapp' | 'sms';
  total_sent: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  responded_count: number;
  signup_count: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  response_rate: number;
  conversion_rate: number;
  average_response_time: number; // hours
  cost_per_signup: number;
  roi_score: number;
  preferred_demographics: string[];
}

export interface TimingInsight {
  hour_of_day: number;
  day_of_week: number;
  timezone: string;
  recipient_type: 'past_client' | 'vendor' | 'friend';
  response_rate: number;
  conversion_rate: number;
  average_response_time: number;
  sample_size: number;
  confidence_level: number;
}

export interface GeographicSpread {
  region: string;
  country_code: string;
  city: string;
  generation_reached: number;
  total_invites: number;
  signup_count: number;
  conversion_rate: number;
  viral_velocity: number; // signups per day
  network_density: number;
  top_connectors: Array<{
    user_id: string;
    influence_score: number;
    local_connections: number;
  }>;
}

export interface ViralCohortAnalysis {
  cohort_start: string;
  cohort_size: number;
  generations_tracked: number;
  total_reach: number;
  final_conversion_rate: number;
  lifetime_viral_value: number;
  retention_by_generation: number[];
  engagement_dropoff_points: number[];
  revenue_attribution: number;
}

export class ViralAnalyticsService {
  private static readonly PERFORMANCE_THRESHOLD = 1000; // 1 second for complex queries
  private static readonly ANALYTICS_THRESHOLD = 200; // 200ms for analytics

  /**
   * Generation Analysis: Track viral chains through 5+ generations
   * Performance requirement: Under 1s for complex analysis
   */
  static async analyzeGenerations(
    timeframe: string = '30 days',
    maxGenerations: number = 10,
  ): Promise<GenerationAnalysis[]> {
    const startTime = Date.now();

    try {
      // Complex recursive query to track viral generations
      const query = `
        WITH RECURSIVE viral_generations AS (
          -- Base case: Generation 1 (direct invites)
          SELECT 
            1 as generation,
            vi.id as invite_id,
            vi.sender_id,
            vi.recipient_email,
            vi.sent_at,
            vi.responded_at,
            vi.channel,
            vi.status,
            up.location_data,
            NULL::uuid as parent_invite_id
          FROM viral_invitations vi
          LEFT JOIN user_profiles up ON vi.recipient_id = up.id
          WHERE vi.sent_at > NOW() - INTERVAL '${timeframe}'
            AND vi.generation = 1
          
          UNION ALL
          
          -- Recursive case: Subsequent generations  
          SELECT 
            vg.generation + 1,
            vi.id as invite_id,
            vi.sender_id,
            vi.recipient_email,
            vi.sent_at,
            vi.responded_at,
            vi.channel,
            vi.status,
            up.location_data,
            vg.invite_id as parent_invite_id
          FROM viral_generations vg
          JOIN viral_invitations vi ON vg.sender_id = vi.sender_id
          LEFT JOIN user_profiles up ON vi.recipient_id = up.id
          WHERE vg.generation < ${maxGenerations}
            AND vi.sent_at > vg.sent_at
            AND vi.generation = vg.generation + 1
        )
        SELECT 
          generation,
          COUNT(*) as total_invites_sent,
          COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) as total_responses,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as total_signups,
          ROUND(
            COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 2
          ) as conversion_rate,
          ROUND(
            AVG(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 3600), 2
          ) as average_time_to_response,
          ROUND(
            COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / 
            NULLIF(LAG(COUNT(CASE WHEN status = 'converted' THEN 1 END)) 
                   OVER (ORDER BY generation), 0), 2
          ) as viral_coefficient,
          ROUND(
            (LAG(COUNT(*)) OVER (ORDER BY generation) - COUNT(*))::numeric /
            NULLIF(LAG(COUNT(*)) OVER (ORDER BY generation), 0) * 100, 2
          ) as dropoff_rate,
          (
            SELECT sender_id
            FROM viral_generations vg2
            WHERE vg2.generation = vg_summary.generation
            GROUP BY sender_id
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as most_active_connector,
          COUNT(DISTINCT COALESCE(location_data->>'region', 'unknown')) as geographic_spread
        FROM viral_generations vg_summary
        GROUP BY generation
        ORDER BY generation;
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
      });

      if (result.error) {
        console.error('Generation analysis query error:', result.error);
        throw new Error(`Generation analysis failed: ${result.error.message}`);
      }

      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD * 0.9) {
        console.warn(
          `Generation analysis took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD}ms limit`,
        );
      }

      return (result.data || []).map((row: any) => ({
        generation: row.generation,
        total_invites_sent: row.total_invites_sent,
        total_responses: row.total_responses,
        total_signups: row.total_signups,
        conversion_rate: row.conversion_rate,
        average_time_to_response: row.average_time_to_response,
        viral_coefficient: row.viral_coefficient || 0,
        dropoff_rate: row.dropoff_rate || 0,
        most_active_connector: row.most_active_connector,
        geographic_spread: row.geographic_spread,
      }));
    } catch (error) {
      console.error('Generation analysis error:', error);
      throw new Error('Failed to analyze viral generations');
    }
  }

  /**
   * Channel Performance Analysis: Compare email vs WhatsApp vs SMS
   * Performance requirement: Under 200ms for analytics
   */
  static async analyzeChannelPerformance(
    timeframe: string = '30 days',
  ): Promise<ChannelPerformance[]> {
    const startTime = Date.now();

    try {
      const query = `
        SELECT 
          channel,
          COUNT(*) as total_sent,
          COUNT(CASE WHEN status != 'failed' THEN 1 END) as delivered_count,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened_count,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_count,
          COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) as responded_count,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as signup_count,
          ROUND(
            COUNT(CASE WHEN status != 'failed' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 2
          ) as delivery_rate,
          ROUND(
            COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN status != 'failed' THEN 1 END), 0) * 100, 2
          ) as open_rate,
          ROUND(
            COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END), 0) * 100, 2
          ) as click_rate,
          ROUND(
            COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN status != 'failed' THEN 1 END), 0) * 100, 2
          ) as response_rate,
          ROUND(
            COUNT(CASE WHEN status = 'converted' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 2
          ) as conversion_rate,
          ROUND(
            AVG(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 3600), 2
          ) as average_response_time,
          ROUND(
            SUM(COALESCE(channel_cost, 0))::numeric / 
            NULLIF(COUNT(CASE WHEN status = 'converted' THEN 1 END), 0), 4
          ) as cost_per_signup,
          ROUND(
            (COUNT(CASE WHEN status = 'converted' THEN 1 END) * 50.0 - SUM(COALESCE(channel_cost, 0))) /
            NULLIF(SUM(COALESCE(channel_cost, 0)), 0) * 100, 2
          ) as roi_score,
          ARRAY_AGG(
            DISTINCT CASE 
              WHEN up.demographic_data->>'age_group' IS NOT NULL 
              THEN up.demographic_data->>'age_group'
            END
          ) FILTER (WHERE up.demographic_data->>'age_group' IS NOT NULL) as preferred_demographics
        FROM viral_invitations vi
        LEFT JOIN user_profiles up ON vi.recipient_id = up.id
        WHERE vi.sent_at > NOW() - INTERVAL '${timeframe}'
        GROUP BY channel
        ORDER BY conversion_rate DESC;
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
      });

      if (result.error) {
        console.error('Channel performance query error:', result.error);
        throw new Error(`Channel analysis failed: ${result.error.message}`);
      }

      const processingTime = Date.now() - startTime;
      if (processingTime > this.ANALYTICS_THRESHOLD * 0.9) {
        console.warn(
          `Channel performance analysis took ${processingTime}ms - approaching ${this.ANALYTICS_THRESHOLD}ms limit`,
        );
      }

      return (result.data || []).map((row: any) => ({
        channel: row.channel,
        total_sent: row.total_sent,
        delivered_count: row.delivered_count,
        opened_count: row.opened_count,
        clicked_count: row.clicked_count,
        responded_count: row.responded_count,
        signup_count: row.signup_count,
        delivery_rate: row.delivery_rate,
        open_rate: row.open_rate,
        click_rate: row.click_rate,
        response_rate: row.response_rate,
        conversion_rate: row.conversion_rate,
        average_response_time: row.average_response_time,
        cost_per_signup: row.cost_per_signup || 0,
        roi_score: row.roi_score || 0,
        preferred_demographics: row.preferred_demographics || [],
      }));
    } catch (error) {
      console.error('Channel performance analysis error:', error);
      throw new Error('Failed to analyze channel performance');
    }
  }

  /**
   * Timing Optimization: Best invitation times by recipient type
   * Performance requirement: Under 200ms for analytics
   */
  static async analyzeOptimalTiming(
    recipientType?: 'past_client' | 'vendor' | 'friend',
    timeframe: string = '90 days',
  ): Promise<TimingInsight[]> {
    const startTime = Date.now();

    try {
      const recipientFilter = recipientType
        ? `AND vi.relationship_type = '${recipientType}'`
        : '';

      const query = `
        SELECT 
          EXTRACT(HOUR FROM vi.sent_at AT TIME ZONE COALESCE(up.timezone, 'UTC')) as hour_of_day,
          EXTRACT(DOW FROM vi.sent_at AT TIME ZONE COALESCE(up.timezone, 'UTC')) as day_of_week,
          COALESCE(up.timezone, 'UTC') as timezone,
          vi.relationship_type as recipient_type,
          COUNT(*) as total_sent,
          COUNT(CASE WHEN vi.responded_at IS NOT NULL THEN 1 END) as responded_count,
          COUNT(CASE WHEN vi.status = 'converted' THEN 1 END) as converted_count,
          ROUND(
            COUNT(CASE WHEN vi.responded_at IS NOT NULL THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 2
          ) as response_rate,
          ROUND(
            COUNT(CASE WHEN vi.status = 'converted' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100, 2
          ) as conversion_rate,
          ROUND(
            AVG(EXTRACT(EPOCH FROM (vi.responded_at - vi.sent_at)) / 3600), 2
          ) as average_response_time,
          COUNT(*) as sample_size
        FROM viral_invitations vi
        LEFT JOIN user_profiles up ON vi.recipient_id = up.id
        WHERE vi.sent_at > NOW() - INTERVAL '${timeframe}'
          ${recipientFilter}
        GROUP BY 
          EXTRACT(HOUR FROM vi.sent_at AT TIME ZONE COALESCE(up.timezone, 'UTC')),
          EXTRACT(DOW FROM vi.sent_at AT TIME ZONE COALESCE(up.timezone, 'UTC')),
          COALESCE(up.timezone, 'UTC'),
          vi.relationship_type
        HAVING COUNT(*) >= 10  -- Minimum sample size for reliability
        ORDER BY conversion_rate DESC, response_rate DESC;
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
      });

      if (result.error) {
        console.error('Timing analysis query error:', result.error);
        throw new Error(`Timing analysis failed: ${result.error.message}`);
      }

      const processingTime = Date.now() - startTime;
      if (processingTime > this.ANALYTICS_THRESHOLD * 0.9) {
        console.warn(
          `Timing analysis took ${processingTime}ms - approaching ${this.ANALYTICS_THRESHOLD}ms limit`,
        );
      }

      return (result.data || []).map((row: any) => {
        const sampleSize = row.sample_size;
        const confidenceLevel = this.calculateConfidenceLevel(
          sampleSize,
          row.response_rate,
        );

        return {
          hour_of_day: row.hour_of_day,
          day_of_week: row.day_of_week,
          timezone: row.timezone,
          recipient_type: row.recipient_type,
          response_rate: row.response_rate,
          conversion_rate: row.conversion_rate,
          average_response_time: row.average_response_time,
          sample_size: sampleSize,
          confidence_level: confidenceLevel,
        };
      });
    } catch (error) {
      console.error('Timing analysis error:', error);
      throw new Error('Failed to analyze optimal timing');
    }
  }

  /**
   * Geographic Spread Analysis: Track viral expansion across regions
   * Performance requirement: Under 1s for complex analysis
   */
  static async analyzeGeographicSpread(
    timeframe: string = '30 days',
  ): Promise<GeographicSpread[]> {
    const startTime = Date.now();

    try {
      const query = `
        WITH geographic_metrics AS (
          SELECT 
            COALESCE(up.location_data->>'region', 'Unknown') as region,
            COALESCE(up.location_data->>'country_code', 'XX') as country_code,
            COALESCE(up.location_data->>'city', 'Unknown') as city,
            vi.generation,
            vi.sender_id,
            COUNT(*) as invite_count,
            COUNT(CASE WHEN vi.status = 'converted' THEN 1 END) as signup_count,
            AVG(vi.created_at::date - vi.sent_at::date) as viral_velocity
          FROM viral_invitations vi
          LEFT JOIN user_profiles up ON vi.recipient_id = up.id
          WHERE vi.sent_at > NOW() - INTERVAL '${timeframe}'
          GROUP BY 
            up.location_data->>'region',
            up.location_data->>'country_code', 
            up.location_data->>'city',
            vi.generation,
            vi.sender_id
        ),
        super_connectors AS (
          SELECT 
            region,
            country_code,
            city,
            sender_id,
            COUNT(*) as local_connections,
            SUM(signup_count) as influence_score
          FROM geographic_metrics
          GROUP BY region, country_code, city, sender_id
          ORDER BY influence_score DESC
        )
        SELECT 
          gm.region,
          gm.country_code,
          gm.city,
          MAX(gm.generation) as generation_reached,
          SUM(gm.invite_count) as total_invites,
          SUM(gm.signup_count) as signup_count,
          ROUND(
            SUM(gm.signup_count)::numeric / 
            NULLIF(SUM(gm.invite_count), 0) * 100, 2
          ) as conversion_rate,
          ROUND(AVG(gm.viral_velocity), 2) as viral_velocity,
          ROUND(
            COUNT(DISTINCT gm.sender_id)::numeric / 
            NULLIF(SUM(gm.invite_count), 0), 4
          ) as network_density,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'user_id', sc.sender_id,
                'influence_score', sc.influence_score,
                'local_connections', sc.local_connections
              )
              ORDER BY sc.influence_score DESC
            ) FILTER (WHERE sc.sender_id IS NOT NULL), 
            '[]'
          ) as top_connectors_json
        FROM geographic_metrics gm
        LEFT JOIN super_connectors sc ON 
          gm.region = sc.region AND 
          gm.country_code = sc.country_code AND
          gm.city = sc.city AND
          gm.sender_id = sc.sender_id
        GROUP BY gm.region, gm.country_code, gm.city
        ORDER BY signup_count DESC, total_invites DESC;
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
      });

      if (result.error) {
        console.error('Geographic spread query error:', result.error);
        throw new Error(`Geographic analysis failed: ${result.error.message}`);
      }

      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD * 0.9) {
        console.warn(
          `Geographic analysis took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD}ms limit`,
        );
      }

      return (result.data || []).map((row: any) => ({
        region: row.region,
        country_code: row.country_code,
        city: row.city,
        generation_reached: row.generation_reached,
        total_invites: row.total_invites,
        signup_count: row.signup_count,
        conversion_rate: row.conversion_rate,
        viral_velocity: row.viral_velocity || 0,
        network_density: row.network_density,
        top_connectors: JSON.parse(row.top_connectors_json || '[]').slice(0, 5),
      }));
    } catch (error) {
      console.error('Geographic spread analysis error:', error);
      throw new Error('Failed to analyze geographic spread');
    }
  }

  /**
   * Viral Cohort Analysis: Track cohort performance over time
   * Performance requirement: Under 1s for complex analysis
   */
  static async analyzeViralCohorts(
    cohortSize: number = 100,
  ): Promise<ViralCohortAnalysis[]> {
    const startTime = Date.now();

    try {
      const query = `
        WITH cohort_definitions AS (
          SELECT 
            DATE_TRUNC('week', vi.sent_at) as cohort_start,
            vi.sender_id,
            vi.id as initial_invite_id,
            ROW_NUMBER() OVER (
              PARTITION BY DATE_TRUNC('week', vi.sent_at) 
              ORDER BY vi.sent_at
            ) as cohort_position
          FROM viral_invitations vi
          WHERE vi.generation = 1
            AND vi.sent_at > NOW() - INTERVAL '90 days'
        ),
        cohort_tracking AS (
          SELECT 
            cd.cohort_start,
            cd.sender_id,
            vi.generation,
            COUNT(*) as invites_in_generation,
            COUNT(CASE WHEN vi.status = 'converted' THEN 1 END) as conversions_in_generation,
            SUM(COALESCE(revenue_attribution, 0)) as revenue_in_generation
          FROM cohort_definitions cd
          JOIN viral_invitations vi ON vi.sender_id = cd.sender_id
          WHERE cd.cohort_position <= ${cohortSize}
            AND vi.sent_at >= cd.cohort_start
          GROUP BY cd.cohort_start, cd.sender_id, vi.generation
        )
        SELECT 
          cohort_start,
          COUNT(DISTINCT sender_id) as cohort_size,
          MAX(generation) as generations_tracked,
          SUM(invites_in_generation) as total_reach,
          ROUND(
            SUM(conversions_in_generation)::numeric / 
            NULLIF(SUM(invites_in_generation), 0) * 100, 2
          ) as final_conversion_rate,
          SUM(revenue_in_generation) as lifetime_viral_value,
          ARRAY_AGG(
            ROUND(
              SUM(conversions_in_generation)::numeric / 
              NULLIF(SUM(invites_in_generation), 0) * 100, 2
            ) 
            ORDER BY generation
          ) as retention_by_generation,
          ARRAY_AGG(
            CASE 
              WHEN LAG(SUM(invites_in_generation)) OVER (ORDER BY generation) = 0 THEN 0
              ELSE ROUND(
                (LAG(SUM(invites_in_generation)) OVER (ORDER BY generation) - SUM(invites_in_generation))::numeric /
                NULLIF(LAG(SUM(invites_in_generation)) OVER (ORDER BY generation), 0) * 100, 2
              )
            END
            ORDER BY generation
          ) as engagement_dropoff_points
        FROM cohort_tracking
        GROUP BY cohort_start
        ORDER BY cohort_start DESC;
      `;

      const result = await supabase.rpc('execute_analytics_query', {
        query_sql: query,
      });

      if (result.error) {
        console.error('Cohort analysis query error:', result.error);
        throw new Error(`Cohort analysis failed: ${result.error.message}`);
      }

      const processingTime = Date.now() - startTime;
      if (processingTime > this.PERFORMANCE_THRESHOLD * 0.9) {
        console.warn(
          `Cohort analysis took ${processingTime}ms - approaching ${this.PERFORMANCE_THRESHOLD}ms limit`,
        );
      }

      return (result.data || []).map((row: any) => ({
        cohort_start: row.cohort_start,
        cohort_size: row.cohort_size,
        generations_tracked: row.generations_tracked,
        total_reach: row.total_reach,
        final_conversion_rate: row.final_conversion_rate,
        lifetime_viral_value: row.lifetime_viral_value || 0,
        retention_by_generation: row.retention_by_generation || [],
        engagement_dropoff_points: row.engagement_dropoff_points || [],
        revenue_attribution: row.lifetime_viral_value || 0,
      }));
    } catch (error) {
      console.error('Cohort analysis error:', error);
      throw new Error('Failed to analyze viral cohorts');
    }
  }

  /**
   * Calculate statistical confidence level for timing insights
   */
  private static calculateConfidenceLevel(
    sampleSize: number,
    responseRate: number,
  ): number {
    if (sampleSize < 30) return 0.7; // Low confidence
    if (sampleSize < 50) return 0.8; // Moderate confidence
    if (sampleSize < 100) return 0.9; // Good confidence
    if (sampleSize < 500) return 0.95; // High confidence
    return 0.99; // Very high confidence
  }

  /**
   * Get viral analytics summary for dashboard
   * Performance requirement: Under 200ms
   */
  static async getViralAnalyticsSummary(timeframe: string = '30 days') {
    const startTime = Date.now();

    try {
      const [generations, channels, geographic] = await Promise.all([
        this.analyzeGenerations(timeframe, 5),
        this.analyzeChannelPerformance(timeframe),
        this.analyzeGeographicSpread(timeframe),
      ]);

      const processingTime = Date.now() - startTime;

      return {
        generation_analysis: generations,
        channel_performance: channels,
        geographic_spread: geographic.slice(0, 10), // Top 10 regions
        summary: {
          total_generations: generations.length,
          best_performing_channel: channels[0]?.channel || null,
          top_viral_region: geographic[0]?.region || null,
          overall_viral_coefficient:
            generations.reduce((sum, g) => sum + g.viral_coefficient, 0) /
              generations.length || 0,
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      console.error('Viral analytics summary error:', error);
      throw new Error('Failed to generate viral analytics summary');
    }
  }
}
