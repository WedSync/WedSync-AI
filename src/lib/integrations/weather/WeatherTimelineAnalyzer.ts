/**
 * WeatherTimelineAnalyzer - Wedding Timeline Weather Impact Analysis
 * Analyzes weather impact on wedding schedules and suggests timeline adjustments
 * WS-220: Weather API Integration - Team C Round 1
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { WeatherData, WeatherSubscription } from './WeatherSync';

export interface TimelineEvent {
  id: string;
  wedding_id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  location: 'indoor' | 'outdoor' | 'covered' | 'flexible';
  weather_sensitivity: 'low' | 'medium' | 'high' | 'critical';
  backup_plan?: string;
  vendor_dependencies: string[];
  guest_impact: 'minimal' | 'moderate' | 'significant' | 'major';
  order: number;
  created_at: string;
  updated_at: string;
}

export interface WeatherImpactAssessment {
  event_id: string;
  weather_conditions: WeatherData['current'];
  impact_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  specific_concerns: {
    rain_impact?: boolean;
    wind_impact?: boolean;
    temperature_impact?: boolean;
    visibility_impact?: boolean;
  };
  recommendations: {
    should_move_indoor: boolean;
    should_reschedule: boolean;
    should_delay: boolean;
    should_cancel: boolean;
    suggested_new_time?: string;
    suggested_location?: string;
    additional_preparations: string[];
  };
  affected_vendors: string[];
  guest_communication_needed: boolean;
  last_analyzed: string;
}

export interface TimelineAdjustmentSuggestion {
  id: string;
  wedding_id: string;
  original_event_id: string;
  suggestion_type:
    | 'move_indoor'
    | 'reschedule'
    | 'delay'
    | 'add_preparation'
    | 'vendor_alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  implementation_steps: string[];
  time_to_implement: number; // minutes
  cost_impact: 'none' | 'minimal' | 'moderate' | 'significant';
  stakeholders_affected: string[];
  deadline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  created_at: string;
}

export class WeatherTimelineAnalyzer {
  private supabase;
  private readonly ANALYSIS_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private activeAnalyses: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.supabase = createSupabaseClient();
  }

  /**
   * Start continuous timeline analysis for a wedding
   */
  async startTimelineAnalysis(weddingId: string): Promise<void> {
    try {
      // Stop existing analysis if running
      this.stopTimelineAnalysis(weddingId);

      // Start periodic analysis
      const intervalId = setInterval(async () => {
        try {
          await this.analyzeWeddingTimeline(weddingId);
        } catch (error) {
          console.error('Timeline analysis failed:', error);
        }
      }, this.ANALYSIS_INTERVAL);

      this.activeAnalyses.set(weddingId, intervalId);

      // Run initial analysis
      await this.analyzeWeddingTimeline(weddingId);

      console.log(`Timeline analysis started for wedding ${weddingId}`);
    } catch (error) {
      console.error('Failed to start timeline analysis:', error);
      throw error;
    }
  }

  /**
   * Stop timeline analysis for a wedding
   */
  stopTimelineAnalysis(weddingId: string): void {
    const intervalId = this.activeAnalyses.get(weddingId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeAnalyses.delete(weddingId);
      console.log(`Timeline analysis stopped for wedding ${weddingId}`);
    }
  }

  /**
   * Analyze complete wedding timeline for weather impacts
   */
  async analyzeWeddingTimeline(
    weddingId: string,
  ): Promise<WeatherImpactAssessment[]> {
    try {
      // Get wedding timeline events
      const { data: events, error: eventsError } = await this.supabase
        .from('timeline_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('start_time');

      if (eventsError) throw eventsError;
      if (!events || events.length === 0) return [];

      // Get current weather data
      const { data: weatherData, error: weatherError } = await this.supabase
        .from('weather_data')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (weatherError) throw weatherError;
      if (!weatherData) return [];

      const assessments: WeatherImpactAssessment[] = [];

      // Analyze each timeline event
      for (const event of events) {
        const assessment = await this.analyzeEventWeatherImpact(
          event,
          weatherData,
        );
        assessments.push(assessment);

        // Generate suggestions if significant impact detected
        if (
          assessment.impact_level === 'high' ||
          assessment.impact_level === 'critical'
        ) {
          await this.generateTimelineAdjustmentSuggestions(event, assessment);
        }
      }

      // Store assessments
      await this.storeImpactAssessments(assessments);

      return assessments;
    } catch (error) {
      console.error('Failed to analyze wedding timeline:', error);
      throw error;
    }
  }

  /**
   * Analyze individual event for weather impact
   */
  private async analyzeEventWeatherImpact(
    event: TimelineEvent,
    weatherData: WeatherData,
  ): Promise<WeatherImpactAssessment> {
    const assessment: WeatherImpactAssessment = {
      event_id: event.id,
      weather_conditions: weatherData.current,
      impact_level: 'none',
      specific_concerns: {},
      recommendations: {
        should_move_indoor: false,
        should_reschedule: false,
        should_delay: false,
        should_cancel: false,
        additional_preparations: [],
      },
      affected_vendors: [],
      guest_communication_needed: false,
      last_analyzed: new Date().toISOString(),
    };

    // Analyze rain impact
    if (weatherData.current.precipitation > 0) {
      assessment.specific_concerns.rain_impact = true;

      if (event.location === 'outdoor') {
        assessment.impact_level = this.escalateImpactLevel(
          assessment.impact_level,
          'high',
        );
        assessment.recommendations.should_move_indoor = true;
        assessment.recommendations.additional_preparations.push(
          'Set up rain protection',
        );
        assessment.guest_communication_needed = true;
      } else if (event.location === 'covered') {
        assessment.impact_level = this.escalateImpactLevel(
          assessment.impact_level,
          'medium',
        );
        assessment.recommendations.additional_preparations.push(
          'Check covered area integrity',
        );
      }
    }

    // Analyze wind impact
    if (weatherData.current.wind_speed > 10) {
      assessment.specific_concerns.wind_impact = true;

      if (event.location === 'outdoor' || event.location === 'covered') {
        assessment.impact_level = this.escalateImpactLevel(
          assessment.impact_level,
          'medium',
        );
        assessment.recommendations.additional_preparations.push(
          'Secure outdoor decorations',
        );
        assessment.recommendations.additional_preparations.push(
          'Alert vendors about wind conditions',
        );

        if (weatherData.current.wind_speed > 20) {
          assessment.impact_level = this.escalateImpactLevel(
            assessment.impact_level,
            'high',
          );
          assessment.recommendations.should_move_indoor = true;
        }
      }
    }

    // Analyze temperature impact
    if (
      weatherData.current.temperature < 5 ||
      weatherData.current.temperature > 35
    ) {
      assessment.specific_concerns.temperature_impact = true;
      assessment.impact_level = this.escalateImpactLevel(
        assessment.impact_level,
        'medium',
      );

      if (weatherData.current.temperature < 0) {
        assessment.impact_level = this.escalateImpactLevel(
          assessment.impact_level,
          'high',
        );
        assessment.recommendations.additional_preparations.push(
          'Provide heating solutions',
        );
        assessment.recommendations.additional_preparations.push(
          'Warn guests about cold conditions',
        );
      } else if (weatherData.current.temperature > 35) {
        assessment.impact_level = this.escalateImpactLevel(
          assessment.impact_level,
          'high',
        );
        assessment.recommendations.additional_preparations.push(
          'Provide cooling solutions',
        );
        assessment.recommendations.additional_preparations.push(
          'Ensure adequate hydration stations',
        );
      }
    }

    // Analyze visibility impact
    if (weatherData.current.visibility < 1) {
      assessment.specific_concerns.visibility_impact = true;
      assessment.impact_level = this.escalateImpactLevel(
        assessment.impact_level,
        'high',
      );
      assessment.recommendations.should_delay = true;
      assessment.recommendations.additional_preparations.push(
        'Improve lighting conditions',
      );
      assessment.guest_communication_needed = true;
    }

    // Consider event-specific sensitivity
    assessment.impact_level = this.adjustForEventSensitivity(
      assessment.impact_level,
      event.weather_sensitivity,
    );

    // Identify affected vendors
    assessment.affected_vendors = this.identifyAffectedVendors(
      event,
      assessment.specific_concerns,
    );

    return assessment;
  }

  /**
   * Escalate impact level to higher severity
   */
  private escalateImpactLevel(
    currentLevel: WeatherImpactAssessment['impact_level'],
    newLevel: WeatherImpactAssessment['impact_level'],
  ): WeatherImpactAssessment['impact_level'] {
    const levels = ['none', 'low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentLevel);
    const newIndex = levels.indexOf(newLevel);

    return levels[
      Math.max(currentIndex, newIndex)
    ] as WeatherImpactAssessment['impact_level'];
  }

  /**
   * Adjust impact level based on event weather sensitivity
   */
  private adjustForEventSensitivity(
    impactLevel: WeatherImpactAssessment['impact_level'],
    sensitivity: TimelineEvent['weather_sensitivity'],
  ): WeatherImpactAssessment['impact_level'] {
    if (sensitivity === 'critical' && impactLevel !== 'none') {
      return 'critical';
    } else if (
      sensitivity === 'high' &&
      (impactLevel === 'medium' || impactLevel === 'high')
    ) {
      return 'high';
    } else if (sensitivity === 'low') {
      const levels = ['none', 'low', 'medium', 'high', 'critical'];
      const currentIndex = levels.indexOf(impactLevel);
      const reducedIndex = Math.max(0, currentIndex - 1);
      return levels[reducedIndex] as WeatherImpactAssessment['impact_level'];
    }

    return impactLevel;
  }

  /**
   * Identify vendors affected by weather conditions
   */
  private identifyAffectedVendors(
    event: TimelineEvent,
    concerns: WeatherImpactAssessment['specific_concerns'],
  ): string[] {
    const affectedVendors: string[] = [];

    // Always include vendors with direct dependencies
    affectedVendors.push(...event.vendor_dependencies);

    // Add weather-specific vendor impacts
    if (concerns.rain_impact) {
      affectedVendors.push('photographer', 'florist', 'caterer', 'dj');
    }

    if (concerns.wind_impact) {
      affectedVendors.push('florist', 'decorator', 'tent_rental');
    }

    if (concerns.temperature_impact) {
      affectedVendors.push('caterer', 'bartender', 'venue_coordinator');
    }

    // Remove duplicates
    return [...new Set(affectedVendors)];
  }

  /**
   * Generate timeline adjustment suggestions
   */
  private async generateTimelineAdjustmentSuggestions(
    event: TimelineEvent,
    assessment: WeatherImpactAssessment,
  ): Promise<void> {
    try {
      const suggestions: Partial<TimelineAdjustmentSuggestion>[] = [];

      // Move indoor suggestion
      if (assessment.recommendations.should_move_indoor) {
        suggestions.push({
          wedding_id: event.wedding_id,
          original_event_id: event.id,
          suggestion_type: 'move_indoor',
          priority: assessment.impact_level === 'critical' ? 'urgent' : 'high',
          title: `Move ${event.name} indoors`,
          description: `Weather conditions recommend moving this ${event.location} event to an indoor location.`,
          implementation_steps: [
            'Identify suitable indoor alternative',
            'Confirm capacity and availability',
            'Coordinate with venue staff',
            'Update vendor locations',
            'Notify all guests of location change',
          ],
          time_to_implement: 60,
          cost_impact: 'moderate',
          stakeholders_affected: [
            'couple',
            'venue',
            'guests',
            ...assessment.affected_vendors,
          ],
          deadline: this.calculateSuggestionDeadline(event.start_time, 120), // 2 hours before
          status: 'pending',
        });
      }

      // Reschedule suggestion
      if (assessment.recommendations.should_reschedule) {
        suggestions.push({
          wedding_id: event.wedding_id,
          original_event_id: event.id,
          suggestion_type: 'reschedule',
          priority: 'urgent',
          title: `Reschedule ${event.name}`,
          description: `Weather conditions are severe enough to recommend rescheduling this event.`,
          implementation_steps: [
            'Check alternative time slots',
            'Confirm vendor availability',
            'Update all bookings',
            'Communicate with all stakeholders',
            'Update timeline documentation',
          ],
          time_to_implement: 180,
          cost_impact: 'significant',
          stakeholders_affected: [
            'couple',
            'venue',
            'guests',
            ...assessment.affected_vendors,
          ],
          deadline: this.calculateSuggestionDeadline(event.start_time, 240), // 4 hours before
          status: 'pending',
        });
      }

      // Preparation suggestions
      if (assessment.recommendations.additional_preparations.length > 0) {
        suggestions.push({
          wedding_id: event.wedding_id,
          original_event_id: event.id,
          suggestion_type: 'add_preparation',
          priority: assessment.impact_level === 'high' ? 'high' : 'medium',
          title: `Additional preparations for ${event.name}`,
          description: `Weather conditions require additional preparations to ensure event success.`,
          implementation_steps:
            assessment.recommendations.additional_preparations,
          time_to_implement: 30,
          cost_impact: 'minimal',
          stakeholders_affected: assessment.affected_vendors,
          deadline: this.calculateSuggestionDeadline(event.start_time, 60), // 1 hour before
          status: 'pending',
        });
      }

      // Vendor alert suggestions
      if (assessment.affected_vendors.length > 0) {
        suggestions.push({
          wedding_id: event.wedding_id,
          original_event_id: event.id,
          suggestion_type: 'vendor_alert',
          priority: 'medium',
          title: `Alert vendors about weather conditions`,
          description: `Notify affected vendors about weather conditions that may impact their services.`,
          implementation_steps: [
            'Send weather update to all affected vendors',
            'Request confirmation of backup plans',
            'Coordinate any necessary equipment changes',
            'Schedule pre-event vendor check-in',
          ],
          time_to_implement: 15,
          cost_impact: 'none',
          stakeholders_affected: assessment.affected_vendors,
          deadline: this.calculateSuggestionDeadline(event.start_time, 180), // 3 hours before
          status: 'pending',
        });
      }

      // Store suggestions
      if (suggestions.length > 0) {
        const { error } = await this.supabase
          .from('timeline_adjustment_suggestions')
          .upsert(
            suggestions.map((s) => ({
              ...s,
              created_at: new Date().toISOString(),
            })),
            {
              onConflict: 'wedding_id,original_event_id,suggestion_type',
            },
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error(
        'Failed to generate timeline adjustment suggestions:',
        error,
      );
    }
  }

  /**
   * Calculate suggestion deadline based on event time and lead time required
   */
  private calculateSuggestionDeadline(
    eventStartTime: string,
    minutesBefore: number,
  ): string {
    const eventTime = new Date(eventStartTime);
    const deadlineTime = new Date(
      eventTime.getTime() - minutesBefore * 60 * 1000,
    );
    return deadlineTime.toISOString();
  }

  /**
   * Store impact assessments in database
   */
  private async storeImpactAssessments(
    assessments: WeatherImpactAssessment[],
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('weather_impact_assessments')
        .upsert(assessments, {
          onConflict: 'event_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store impact assessments:', error);
    }
  }

  /**
   * Get timeline adjustment suggestions for a wedding
   */
  async getTimelineAdjustmentSuggestions(
    weddingId: string,
    status?: TimelineAdjustmentSuggestion['status'],
  ): Promise<TimelineAdjustmentSuggestion[]> {
    try {
      let query = this.supabase
        .from('timeline_adjustment_suggestions')
        .select(
          `
          *,
          timeline_events:original_event_id(name, start_time, location)
        `,
        )
        .eq('wedding_id', weddingId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get timeline adjustment suggestions:', error);
      throw error;
    }
  }

  /**
   * Accept a timeline adjustment suggestion
   */
  async acceptSuggestion(suggestionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('timeline_adjustment_suggestions')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      if (error) throw error;

      // TODO: Implement actual timeline adjustments and notifications
      console.log(`Suggestion ${suggestionId} accepted`);
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      throw error;
    }
  }

  /**
   * Cleanup analysis for completed weddings
   */
  async cleanupCompletedAnalyses(): Promise<void> {
    try {
      // Get completed weddings
      const { data: completedWeddings } = await this.supabase
        .from('weddings')
        .select('id')
        .lt('date', new Date().toISOString());

      if (completedWeddings) {
        for (const wedding of completedWeddings) {
          this.stopTimelineAnalysis(wedding.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup completed analyses:', error);
    }
  }

  /**
   * Get weather impact summary for dashboard
   */
  async getWeatherImpactSummary(weddingId: string): Promise<{
    total_events: number;
    high_impact_events: number;
    pending_suggestions: number;
    last_analysis: string;
  }> {
    try {
      const [
        { count: totalEvents },
        { count: highImpactEvents },
        { count: pendingSuggestions },
      ] = await Promise.all([
        this.supabase
          .from('timeline_events')
          .select('*', { count: 'exact', head: true })
          .eq('wedding_id', weddingId),
        this.supabase
          .from('weather_impact_assessments')
          .select('*', { count: 'exact', head: true })
          .in('impact_level', ['high', 'critical']),
        this.supabase
          .from('timeline_adjustment_suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('wedding_id', weddingId)
          .eq('status', 'pending'),
      ]);

      const { data: lastAnalysis } = await this.supabase
        .from('weather_impact_assessments')
        .select('last_analyzed')
        .order('last_analyzed', { ascending: false })
        .limit(1)
        .single();

      return {
        total_events: totalEvents || 0,
        high_impact_events: highImpactEvents || 0,
        pending_suggestions: pendingSuggestions || 0,
        last_analysis: lastAnalysis?.last_analyzed || 'Never',
      };
    } catch (error) {
      console.error('Failed to get weather impact summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const weatherTimelineAnalyzer = new WeatherTimelineAnalyzer();
