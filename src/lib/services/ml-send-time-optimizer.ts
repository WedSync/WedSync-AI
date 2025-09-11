// WS-155: ML-Powered Send Time Optimization
import { createClient } from '@/lib/supabase/server';

interface RecipientProfile {
  id: string;
  timezone: string;
  historicalEngagement: EngagementHistory[];
  deviceTypes: string[];
  preferredChannels: string[];
  demographicData?: {
    ageGroup?: string;
    location?: string;
    role?: string;
  };
}

interface EngagementHistory {
  timestamp: Date;
  dayOfWeek: number;
  hourOfDay: number;
  action: 'opened' | 'clicked' | 'converted' | 'ignored';
  channel: 'email' | 'sms' | 'push';
  responseTime?: number; // Minutes until action
}

interface OptimalSendTime {
  recipientId: string;
  recommendedTime: Date;
  confidence: number;
  reasoning: string[];
  alternativeTimes: Date[];
  predictedEngagementRate: number;
}

export class MLSendTimeOptimizer {
  private engagementPatterns: Map<string, any>;
  private globalPatterns: any;
  private modelVersion: string = '1.0.0';

  constructor() {
    this.engagementPatterns = new Map();
    this.globalPatterns = {
      bestHoursByDay: {},
      bestDayOfWeek: {},
      channelPreferences: {},
    };

    this.initializeModel();
  }

  private async initializeModel() {
    // Load historical engagement data for pattern analysis
    await this.loadHistoricalData();

    // Initialize ML model weights
    this.initializePatternRecognition();
  }

  private async loadHistoricalData() {
    const supabase = await createClient();

    // Load aggregated engagement patterns
    const { data: patterns } = await supabase
      .from('engagement_patterns')
      .select('*')
      .order('engagement_rate', { ascending: false });

    if (patterns) {
      this.processHistoricalPatterns(patterns);
    }
  }

  private processHistoricalPatterns(patterns: any[]) {
    // Process patterns by day of week
    const byDayOfWeek: Record<number, any> = {};
    const byHourOfDay: Record<number, any> = {};

    for (const pattern of patterns) {
      const dayOfWeek = pattern.day_of_week;
      const hourOfDay = pattern.hour_of_day;

      if (!byDayOfWeek[dayOfWeek]) {
        byDayOfWeek[dayOfWeek] = {
          totalEngagements: 0,
          totalSent: 0,
          bestHours: [],
        };
      }

      if (!byHourOfDay[hourOfDay]) {
        byHourOfDay[hourOfDay] = {
          totalEngagements: 0,
          totalSent: 0,
          averageResponseTime: 0,
        };
      }

      byDayOfWeek[dayOfWeek].totalEngagements += pattern.engagement_count;
      byDayOfWeek[dayOfWeek].totalSent += pattern.total_sent;

      byHourOfDay[hourOfDay].totalEngagements += pattern.engagement_count;
      byHourOfDay[hourOfDay].totalSent += pattern.total_sent;
    }

    // Calculate engagement rates
    for (const day in byDayOfWeek) {
      const data = byDayOfWeek[day];
      data.engagementRate =
        data.totalSent > 0 ? (data.totalEngagements / data.totalSent) * 100 : 0;
    }

    for (const hour in byHourOfDay) {
      const data = byHourOfDay[hour];
      data.engagementRate =
        data.totalSent > 0 ? (data.totalEngagements / data.totalSent) * 100 : 0;
    }

    this.globalPatterns.bestDayOfWeek = byDayOfWeek;
    this.globalPatterns.bestHoursByDay = byHourOfDay;
  }

  private initializePatternRecognition() {
    // Initialize pattern recognition weights
    // These would be trained on historical data in a real ML system
    this.globalPatterns.weights = {
      dayOfWeek: {
        0: 0.7, // Sunday
        1: 1.2, // Monday
        2: 1.3, // Tuesday
        3: 1.4, // Wednesday
        4: 1.3, // Thursday
        5: 1.0, // Friday
        6: 0.8, // Saturday
      },
      hourOfDay: {
        // Morning spike (9-11 AM)
        9: 1.3,
        10: 1.5,
        11: 1.4,
        // Lunch dip (12-1 PM)
        12: 0.9,
        13: 0.8,
        // Afternoon recovery (2-5 PM)
        14: 1.1,
        15: 1.2,
        16: 1.1,
        17: 1.0,
        // Evening spike (7-9 PM)
        19: 1.3,
        20: 1.4,
        21: 1.2,
        // Night decline
        22: 0.8,
        23: 0.6,
      },
      channelMultipliers: {
        email: {
          morning: 1.2,
          afternoon: 1.0,
          evening: 1.1,
          night: 0.7,
        },
        sms: {
          morning: 1.0,
          afternoon: 1.3,
          evening: 1.2,
          night: 0.5,
        },
        push: {
          morning: 0.9,
          afternoon: 1.1,
          evening: 1.4,
          night: 0.6,
        },
      },
    };
  }

  public async optimizeSendTime(
    recipientProfiles: RecipientProfile[],
    campaignType: string,
    preferredWindow?: { start: Date; end: Date },
  ): Promise<OptimalSendTime[]> {
    const optimizations: OptimalSendTime[] = [];

    for (const profile of recipientProfiles) {
      const optimization = await this.calculateOptimalTime(
        profile,
        campaignType,
        preferredWindow,
      );
      optimizations.push(optimization);
    }

    // Apply load balancing to prevent all messages being sent at once
    return this.applyLoadBalancing(optimizations);
  }

  private async calculateOptimalTime(
    profile: RecipientProfile,
    campaignType: string,
    window?: { start: Date; end: Date },
  ): Promise<OptimalSendTime> {
    // Analyze recipient's historical engagement
    const personalPattern = this.analyzePersonalPattern(profile);

    // Combine with global patterns
    const combinedScore = this.combinePatterns(
      personalPattern,
      this.globalPatterns,
    );

    // Find optimal time slots
    const timeSlots = this.generateTimeSlots(window);
    const scoredSlots = this.scoreTimeSlots(timeSlots, combinedScore, profile);

    // Sort by score and get best options
    scoredSlots.sort((a, b) => b.score - a.score);

    const bestSlot = scoredSlots[0];
    const alternativeSlots = scoredSlots.slice(1, 4).map((s) => s.time);

    return {
      recipientId: profile.id,
      recommendedTime: bestSlot.time,
      confidence: this.calculateConfidence(bestSlot.score, profile),
      reasoning: this.generateReasoning(bestSlot, profile),
      alternativeTimes: alternativeSlots,
      predictedEngagementRate: bestSlot.predictedEngagement,
    };
  }

  private analyzePersonalPattern(profile: RecipientProfile): any {
    const pattern = {
      preferredDays: new Map<number, number>(),
      preferredHours: new Map<number, number>(),
      averageResponseTime: 0,
      channelPreferences: new Map<string, number>(),
    };

    if (
      !profile.historicalEngagement ||
      profile.historicalEngagement.length === 0
    ) {
      return pattern;
    }

    // Analyze engagement history
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const engagement of profile.historicalEngagement) {
      // Track day preferences
      const dayCount = pattern.preferredDays.get(engagement.dayOfWeek) || 0;
      pattern.preferredDays.set(engagement.dayOfWeek, dayCount + 1);

      // Track hour preferences
      const hourCount = pattern.preferredHours.get(engagement.hourOfDay) || 0;
      pattern.preferredHours.set(engagement.hourOfDay, hourCount + 1);

      // Track channel preferences
      const channelCount =
        pattern.channelPreferences.get(engagement.channel) || 0;
      pattern.channelPreferences.set(engagement.channel, channelCount + 1);

      // Calculate average response time
      if (engagement.responseTime) {
        totalResponseTime += engagement.responseTime;
        responseCount++;
      }
    }

    pattern.averageResponseTime =
      responseCount > 0 ? totalResponseTime / responseCount : 0;

    return pattern;
  }

  private combinePatterns(personalPattern: any, globalPattern: any): any {
    const combined = {
      dayScores: new Map<number, number>(),
      hourScores: new Map<number, number>(),
      channelScores: new Map<string, number>(),
    };

    // Weight personal patterns more heavily (70%) than global (30%)
    const personalWeight = 0.7;
    const globalWeight = 0.3;

    // Combine day scores
    for (let day = 0; day < 7; day++) {
      const personalScore = personalPattern.preferredDays.get(day) || 0;
      const globalScore = globalPattern.weights?.dayOfWeek[day] || 1;

      combined.dayScores.set(
        day,
        personalScore * personalWeight + globalScore * globalWeight,
      );
    }

    // Combine hour scores
    for (let hour = 0; hour < 24; hour++) {
      const personalScore = personalPattern.preferredHours.get(hour) || 0;
      const globalScore = globalPattern.weights?.hourOfDay[hour] || 1;

      combined.hourScores.set(
        hour,
        personalScore * personalWeight + globalScore * globalWeight,
      );
    }

    return combined;
  }

  private generateTimeSlots(window?: { start: Date; end: Date }): Date[] {
    const slots: Date[] = [];
    const now = new Date();

    const start = window?.start || new Date(now.getTime() + 3600000); // 1 hour from now
    const end = window?.end || new Date(now.getTime() + 7 * 24 * 3600000); // 7 days from now

    const current = new Date(start);

    while (current <= end) {
      // Generate slots every hour
      slots.push(new Date(current));
      current.setHours(current.getHours() + 1);
    }

    return slots;
  }

  private scoreTimeSlots(
    slots: Date[],
    pattern: any,
    profile: RecipientProfile,
  ): any[] {
    return slots.map((slot) => {
      const dayOfWeek = slot.getDay();
      const hourOfDay = slot.getHours();

      // Get base scores
      const dayScore = pattern.dayScores.get(dayOfWeek) || 1;
      const hourScore = pattern.hourScores.get(hourOfDay) || 1;

      // Apply timezone adjustment
      const timezoneAdjustedHour = this.adjustForTimezone(
        hourOfDay,
        profile.timezone,
      );
      const timezoneScore = pattern.hourScores.get(timezoneAdjustedHour) || 1;

      // Calculate final score
      const finalScore = (dayScore + hourScore + timezoneScore) / 3;

      // Predict engagement rate
      const predictedEngagement = this.predictEngagementRate(
        finalScore,
        profile,
        dayOfWeek,
        hourOfDay,
      );

      return {
        time: slot,
        score: finalScore,
        dayOfWeek,
        hourOfDay,
        predictedEngagement,
      };
    });
  }

  private adjustForTimezone(hour: number, timezone: string): number {
    // Simple timezone adjustment (would use proper timezone library in production)
    const timezoneOffsets: Record<string, number> = {
      UTC: 0,
      EST: -5,
      CST: -6,
      MST: -7,
      PST: -8,
    };

    const offset = timezoneOffsets[timezone] || 0;
    const adjustedHour = (hour + offset + 24) % 24;

    return adjustedHour;
  }

  private predictEngagementRate(
    score: number,
    profile: RecipientProfile,
    dayOfWeek: number,
    hourOfDay: number,
  ): number {
    // Base engagement rate from score
    let engagement = score * 20; // Convert score to percentage

    // Adjust based on historical engagement
    if (profile.historicalEngagement.length > 0) {
      const historicalRate =
        profile.historicalEngagement.filter((e) => e.action !== 'ignored')
          .length / profile.historicalEngagement.length;

      engagement = (engagement + historicalRate * 100) / 2;
    }

    // Apply time-based modifiers
    if (hourOfDay >= 9 && hourOfDay <= 17) {
      engagement *= 1.1; // Business hours boost
    } else if (hourOfDay >= 22 || hourOfDay <= 6) {
      engagement *= 0.7; // Night-time penalty
    }

    // Cap at 95% (never promise 100%)
    return Math.min(95, Math.max(5, engagement));
  }

  private calculateConfidence(
    score: number,
    profile: RecipientProfile,
  ): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on data availability
    if (profile.historicalEngagement.length > 10) {
      confidence += 20;
    } else if (profile.historicalEngagement.length > 5) {
      confidence += 10;
    }

    // Increase confidence based on score strength
    if (score > 2) {
      confidence += 20;
    } else if (score > 1.5) {
      confidence += 10;
    }

    // Cap confidence at 95%
    return Math.min(95, confidence);
  }

  private generateReasoning(slot: any, profile: RecipientProfile): string[] {
    const reasons: string[] = [];

    // Day of week reasoning
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    reasons.push(`${dayNames[slot.dayOfWeek]} typically shows high engagement`);

    // Time of day reasoning
    if (slot.hourOfDay >= 9 && slot.hourOfDay <= 11) {
      reasons.push('Morning hours when recipients check messages');
    } else if (slot.hourOfDay >= 14 && slot.hourOfDay <= 17) {
      reasons.push('Afternoon hours with good engagement rates');
    } else if (slot.hourOfDay >= 19 && slot.hourOfDay <= 21) {
      reasons.push('Evening hours when recipients are more relaxed');
    }

    // Personal pattern reasoning
    if (profile.historicalEngagement.length > 5) {
      reasons.push("Based on recipient's past engagement patterns");
    }

    // Predicted engagement reasoning
    if (slot.predictedEngagement > 70) {
      reasons.push('High predicted engagement rate');
    }

    return reasons;
  }

  private applyLoadBalancing(
    optimizations: OptimalSendTime[],
  ): OptimalSendTime[] {
    // Group by recommended time
    const timeGroups = new Map<number, OptimalSendTime[]>();

    for (const opt of optimizations) {
      const timeKey = Math.floor(opt.recommendedTime.getTime() / 3600000); // Group by hour

      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }

      timeGroups.get(timeKey)!.push(opt);
    }

    // Redistribute if too many in one slot
    const maxPerSlot = 100;
    const redistributed: OptimalSendTime[] = [];

    for (const [timeKey, group] of timeGroups) {
      if (group.length <= maxPerSlot) {
        redistributed.push(...group);
      } else {
        // Spread across the hour
        for (let i = 0; i < group.length; i++) {
          const opt = group[i];
          const minuteOffset = (i % 60) * 60000; // Spread across 60 minutes

          opt.recommendedTime = new Date(
            opt.recommendedTime.getTime() + minuteOffset,
          );

          redistributed.push(opt);
        }
      }
    }

    return redistributed;
  }

  public async updateEngagementData(
    recipientId: string,
    engagement: EngagementHistory,
  ): Promise<void> {
    const supabase = await createClient();

    // Store engagement data
    await supabase.from('recipient_engagement_history').insert({
      recipient_id: recipientId,
      timestamp: engagement.timestamp,
      day_of_week: engagement.dayOfWeek,
      hour_of_day: engagement.hourOfDay,
      action: engagement.action,
      channel: engagement.channel,
      response_time: engagement.responseTime,
    });

    // Update recipient pattern cache
    if (this.engagementPatterns.has(recipientId)) {
      const pattern = this.engagementPatterns.get(recipientId);
      pattern.push(engagement);

      // Keep only last 100 engagements
      if (pattern.length > 100) {
        pattern.shift();
      }
    }
  }

  public async retrainModel(): Promise<void> {
    console.log('Retraining ML model with latest engagement data...');

    // Reload historical data
    await this.loadHistoricalData();

    // Update model weights based on recent performance
    await this.updateModelWeights();

    console.log('Model retrained successfully');
  }

  private async updateModelWeights(): Promise<void> {
    const supabase = await createClient();

    // Get recent campaign performance
    const { data: recentPerformance } = await supabase
      .from('campaign_performance')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 3600000).toISOString()) // Last 30 days
      .order('engagement_rate', { ascending: false });

    if (recentPerformance) {
      // Update weights based on performance
      this.adjustWeightsBasedOnPerformance(recentPerformance);
    }

    // Save updated model
    await this.saveModel();
  }

  private adjustWeightsBasedOnPerformance(performance: any[]): void {
    // Adjust day of week weights
    const dayPerformance: Record<number, { total: number; count: number }> = {};

    for (const perf of performance) {
      const day = new Date(perf.sent_at).getDay();

      if (!dayPerformance[day]) {
        dayPerformance[day] = { total: 0, count: 0 };
      }

      dayPerformance[day].total += perf.engagement_rate;
      dayPerformance[day].count++;
    }

    // Update weights
    for (const day in dayPerformance) {
      const avgEngagement =
        dayPerformance[day].total / dayPerformance[day].count;
      const weight = avgEngagement / 25; // Normalize to ~1.0 for 25% engagement

      this.globalPatterns.weights.dayOfWeek[day] = weight;
    }
  }

  private async saveModel(): Promise<void> {
    const supabase = await createClient();

    await supabase.from('ml_models').upsert({
      model_name: 'send_time_optimizer',
      version: this.modelVersion,
      weights: this.globalPatterns.weights,
      updated_at: new Date().toISOString(),
    });
  }
}
