/**
 * WS-155 Round 2: AI-Powered Delivery Optimization
 * Team C - Advanced Integration Phase
 *
 * Optimizes message delivery times using ML models and guest behavior patterns
 */

import { EventEmitter } from 'events';

export interface OptimizationContext {
  guestId: string;
  messageType: 'invitation' | 'update' | 'reminder' | 'thank_you' | 'general';
  weddingDate: Date;
  timezone: string;
  previousEngagements: EngagementHistory[];
  guestSegment?: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
}

export interface EngagementHistory {
  messageId: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  respondedAt?: Date;
  deviceType?: string;
  location?: string;
}

export interface OptimalTimeWindow {
  startTime: Date;
  endTime: Date;
  confidence: number;
  reasoning: string[];
  alternativeWindows?: TimeWindow[];
}

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
  score: number;
}

export interface DeliveryPrediction {
  openProbability: number;
  clickProbability: number;
  responseProbability: number;
  bestChannel: 'email' | 'sms' | 'push';
  suggestedPersonalization?: string[];
}

export interface OptimizationConfig {
  enableAI: boolean;
  learningRate: number;
  minHistoryForPrediction: number;
  defaultTimeWindows: Record<string, TimeWindow[]>;
  timezoneAdjustment: boolean;
  maxFutureSchedule: number; // hours
}

export class DeliveryOptimizationService extends EventEmitter {
  private config: OptimizationConfig;
  private engagementPatterns: Map<string, GuestPattern> = new Map();
  private globalPatterns: GlobalPatterns;
  private modelVersion: string = '2.0.0';

  constructor(config?: Partial<OptimizationConfig>) {
    super();
    this.config = {
      enableAI: true,
      learningRate: 0.1,
      minHistoryForPrediction: 3,
      defaultTimeWindows: {
        invitation: [
          {
            startTime: new Date('10:00'),
            endTime: new Date('11:00'),
            score: 0.9,
          },
          {
            startTime: new Date('19:00'),
            endTime: new Date('20:00'),
            score: 0.8,
          },
        ],
        reminder: [
          {
            startTime: new Date('09:00'),
            endTime: new Date('10:00'),
            score: 0.85,
          },
          {
            startTime: new Date('18:00'),
            endTime: new Date('19:00'),
            score: 0.75,
          },
        ],
        update: [
          {
            startTime: new Date('11:00'),
            endTime: new Date('12:00'),
            score: 0.8,
          },
          {
            startTime: new Date('16:00'),
            endTime: new Date('17:00'),
            score: 0.7,
          },
        ],
      },
      timezoneAdjustment: true,
      maxFutureSchedule: 168, // 1 week
      ...config,
    };

    this.globalPatterns = this.initializeGlobalPatterns();
  }

  /**
   * Calculate optimal send time using AI/ML
   */
  async calculateOptimalTime(
    context: OptimizationContext,
  ): Promise<OptimalTimeWindow> {
    // Get or create guest pattern
    let guestPattern = this.engagementPatterns.get(context.guestId);
    if (!guestPattern) {
      guestPattern = this.createGuestPattern(context);
      this.engagementPatterns.set(context.guestId, guestPattern);
    }

    // Update pattern with latest engagement history
    this.updateGuestPattern(guestPattern, context.previousEngagements);

    // Calculate optimal time window
    const optimalTime =
      this.config.enableAI &&
      context.previousEngagements.length >= this.config.minHistoryForPrediction
        ? await this.aiOptimization(guestPattern, context)
        : this.ruleBasedOptimization(context);

    // Apply timezone adjustment
    if (this.config.timezoneAdjustment) {
      this.adjustForTimezone(optimalTime, context.timezone);
    }

    // Apply urgency modifiers
    this.applyUrgencyModifiers(optimalTime, context.urgency);

    this.emit('optimization:calculated', {
      guestId: context.guestId,
      optimalTime,
      method:
        context.previousEngagements.length >=
        this.config.minHistoryForPrediction
          ? 'ai'
          : 'rules',
    });

    return optimalTime;
  }

  /**
   * AI-powered optimization using guest patterns
   */
  private async aiOptimization(
    pattern: GuestPattern,
    context: OptimizationContext,
  ): Promise<OptimalTimeWindow> {
    // Analyze engagement patterns
    const dayOfWeekScores = this.analyzeDayOfWeekPattern(pattern);
    const hourOfDayScores = this.analyzeHourOfDayPattern(pattern);
    const responseTimeAnalysis = this.analyzeResponseTimes(pattern);
    const channelPreference = this.analyzeChannelPreference(pattern);

    // Calculate wedding proximity factor
    const daysUntilWedding = Math.ceil(
      (context.weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const proximityFactor = this.calculateProximityFactor(
      daysUntilWedding,
      context.messageType,
    );

    // Combine factors using neural network simulation
    const predictions = this.neuralNetworkPredict({
      dayOfWeekScores,
      hourOfDayScores,
      responseTimeAnalysis,
      channelPreference,
      proximityFactor,
      messageType: context.messageType,
      guestSegment: context.guestSegment || 'general',
    });

    // Generate optimal time windows
    const windows = this.generateTimeWindows(predictions, context);
    const primary = windows[0];

    return {
      startTime: primary.startTime,
      endTime: primary.endTime,
      confidence: predictions.confidence,
      reasoning: [
        `Based on ${pattern.totalEngagements} previous interactions`,
        `Best engagement: ${this.formatDayTime(dayOfWeekScores, hourOfDayScores)}`,
        `Average response time: ${Math.round(responseTimeAnalysis.avgMinutes)} minutes`,
        `Preferred channel: ${channelPreference.preferred} (${Math.round(channelPreference.confidence * 100)}% confidence)`,
        `Wedding proximity factor: ${proximityFactor.toFixed(2)}`,
      ],
      alternativeWindows: windows.slice(1, 3),
    };
  }

  /**
   * Rule-based optimization fallback
   */
  private ruleBasedOptimization(
    context: OptimizationContext,
  ): OptimalTimeWindow {
    const defaultWindows = this.config.defaultTimeWindows[
      context.messageType
    ] ||
      this.config.defaultTimeWindows['general'] || [
        {
          startTime: new Date('10:00'),
          endTime: new Date('11:00'),
          score: 0.5,
        },
      ];

    const today = new Date();
    const primary = defaultWindows[0];

    // Adjust for wedding proximity
    const daysUntilWedding = Math.ceil(
      (context.weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    let confidence = primary.score;

    if (daysUntilWedding <= 7) {
      confidence *= 1.2; // Boost confidence for wedding week
    } else if (daysUntilWedding <= 30) {
      confidence *= 1.1; // Slight boost for wedding month
    }

    return {
      startTime: this.setTimeToday(primary.startTime),
      endTime: this.setTimeToday(primary.endTime),
      confidence: Math.min(confidence, 1),
      reasoning: [
        'Using rule-based optimization (insufficient history)',
        `Default window for ${context.messageType} messages`,
        `${daysUntilWedding} days until wedding`,
      ],
      alternativeWindows: defaultWindows.slice(1).map((w) => ({
        startTime: this.setTimeToday(w.startTime),
        endTime: this.setTimeToday(w.endTime),
        score: w.score,
      })),
    };
  }

  /**
   * Neural network simulation for predictions
   */
  private neuralNetworkPredict(inputs: NeuralInputs): NeuralPrediction {
    // Simplified neural network simulation
    // In production, this would use TensorFlow.js or similar

    const weights = {
      dayOfWeek: 0.15,
      hourOfDay: 0.25,
      responseTime: 0.2,
      channelPref: 0.15,
      proximity: 0.15,
      messageType: 0.1,
    };

    // Calculate weighted score
    let score = 0;
    score += inputs.dayOfWeekScores.maxScore * weights.dayOfWeek;
    score += inputs.hourOfDayScores.maxScore * weights.hourOfDay;
    score +=
      (1 / Math.max(inputs.responseTimeAnalysis.avgMinutes, 1)) *
      weights.responseTime;
    score += inputs.channelPreference.confidence * weights.channelPref;
    score += inputs.proximityFactor * weights.proximity;
    score +=
      this.getMessageTypeWeight(inputs.messageType) * weights.messageType;

    // Add noise for variation
    const noise = (Math.random() - 0.5) * 0.1;
    score = Math.max(0, Math.min(1, score + noise));

    return {
      confidence: score,
      bestHour: inputs.hourOfDayScores.bestHour,
      bestDay: inputs.dayOfWeekScores.bestDay,
      openProbability: score * 0.85,
      clickProbability: score * 0.45,
      responseProbability: score * 0.25,
    };
  }

  /**
   * Generate time windows based on predictions
   */
  private generateTimeWindows(
    predictions: NeuralPrediction,
    context: OptimizationContext,
  ): TimeWindow[] {
    const windows: TimeWindow[] = [];
    const baseDate = new Date();

    // Primary window based on best predicted time
    const primaryStart = new Date(baseDate);
    primaryStart.setHours(predictions.bestHour, 0, 0, 0);

    // Adjust for future days if needed
    if (primaryStart < new Date()) {
      primaryStart.setDate(primaryStart.getDate() + 1);
    }

    windows.push({
      startTime: primaryStart,
      endTime: new Date(primaryStart.getTime() + 60 * 60 * 1000), // 1 hour window
      score: predictions.confidence,
    });

    // Alternative windows with decreasing scores
    for (let i = 1; i <= 2; i++) {
      const altStart = new Date(primaryStart);
      altStart.setHours(primaryStart.getHours() + i * 3); // 3 hours apart

      if (altStart.getHours() >= 22) {
        altStart.setDate(altStart.getDate() + 1);
        altStart.setHours(9, 0, 0, 0);
      }

      windows.push({
        startTime: altStart,
        endTime: new Date(altStart.getTime() + 60 * 60 * 1000),
        score: predictions.confidence * (1 - i * 0.15),
      });
    }

    return windows;
  }

  /**
   * Update guest pattern with new engagement data
   */
  private updateGuestPattern(
    pattern: GuestPattern,
    engagements: EngagementHistory[],
  ): void {
    for (const engagement of engagements) {
      pattern.totalEngagements++;

      // Update day of week stats
      const dayOfWeek = engagement.sentAt.getDay();
      pattern.dayOfWeekEngagement[dayOfWeek] =
        (pattern.dayOfWeekEngagement[dayOfWeek] || 0) + 1;

      // Update hour of day stats
      const hour = engagement.sentAt.getHours();
      pattern.hourOfDayEngagement[hour] =
        (pattern.hourOfDayEngagement[hour] || 0) + 1;

      // Update response times
      if (engagement.openedAt) {
        const responseTime =
          engagement.openedAt.getTime() - engagement.sentAt.getTime();
        pattern.avgResponseTime =
          (pattern.avgResponseTime * (pattern.totalEngagements - 1) +
            responseTime) /
          pattern.totalEngagements;
      }

      // Update channel effectiveness
      if (engagement.openedAt || engagement.clickedAt) {
        pattern.channelEffectiveness.email =
          (pattern.channelEffectiveness.email || 0) + 1;
      }
    }

    pattern.lastUpdated = new Date();
  }

  /**
   * Create initial guest pattern
   */
  private createGuestPattern(context: OptimizationContext): GuestPattern {
    return {
      guestId: context.guestId,
      totalEngagements: 0,
      dayOfWeekEngagement: {},
      hourOfDayEngagement: {},
      avgResponseTime: 0,
      channelEffectiveness: {},
      lastUpdated: new Date(),
      segment: context.guestSegment,
    };
  }

  /**
   * Analyze day of week patterns
   */
  private analyzeDayOfWeekPattern(pattern: GuestPattern): DayAnalysis {
    let maxScore = 0;
    let bestDay = 0;

    for (let day = 0; day < 7; day++) {
      const score =
        (pattern.dayOfWeekEngagement[day] || 0) /
        Math.max(pattern.totalEngagements, 1);
      if (score > maxScore) {
        maxScore = score;
        bestDay = day;
      }
    }

    return { maxScore, bestDay, distribution: pattern.dayOfWeekEngagement };
  }

  /**
   * Analyze hour of day patterns
   */
  private analyzeHourOfDayPattern(pattern: GuestPattern): HourAnalysis {
    let maxScore = 0;
    let bestHour = 10; // Default to 10 AM

    for (let hour = 0; hour < 24; hour++) {
      const score =
        (pattern.hourOfDayEngagement[hour] || 0) /
        Math.max(pattern.totalEngagements, 1);
      if (score > maxScore) {
        maxScore = score;
        bestHour = hour;
      }
    }

    return { maxScore, bestHour, distribution: pattern.hourOfDayEngagement };
  }

  /**
   * Analyze response times
   */
  private analyzeResponseTimes(pattern: GuestPattern): ResponseAnalysis {
    return {
      avgMinutes: Math.round(pattern.avgResponseTime / (1000 * 60)),
      median: pattern.avgResponseTime, // Simplified for now
      percentile95: pattern.avgResponseTime * 1.5,
    };
  }

  /**
   * Analyze channel preferences
   */
  private analyzeChannelPreference(pattern: GuestPattern): ChannelPreference {
    const email = pattern.channelEffectiveness.email || 0;
    const sms = pattern.channelEffectiveness.sms || 0;
    const push = pattern.channelEffectiveness.push || 0;
    const total = email + sms + push;

    if (total === 0) {
      return { preferred: 'email', confidence: 0.5 };
    }

    const scores = { email, sms, push };
    const preferred = Object.entries(scores).reduce((a, b) =>
      scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores]
        ? a
        : b,
    )[0] as 'email' | 'sms' | 'push';

    return {
      preferred,
      confidence: scores[preferred] / total,
    };
  }

  /**
   * Calculate wedding proximity factor
   */
  private calculateProximityFactor(
    daysUntilWedding: number,
    messageType: string,
  ): number {
    const factors = {
      invitation: daysUntilWedding > 60 ? 1.0 : 0.8,
      reminder:
        daysUntilWedding <= 7 ? 1.5 : daysUntilWedding <= 30 ? 1.2 : 1.0,
      update: daysUntilWedding <= 14 ? 1.3 : 1.0,
      thank_you: daysUntilWedding < 0 ? 1.0 : 0.5,
      general: 1.0,
    };

    return factors[messageType as keyof typeof factors] || 1.0;
  }

  /**
   * Get message type weight for scoring
   */
  private getMessageTypeWeight(messageType: string): number {
    const weights = {
      invitation: 0.9,
      reminder: 0.85,
      update: 0.7,
      thank_you: 0.6,
      general: 0.5,
    };

    return weights[messageType as keyof typeof weights] || 0.5;
  }

  /**
   * Initialize global patterns
   */
  private initializeGlobalPatterns(): GlobalPatterns {
    return {
      avgOpenRate: 0.65,
      avgClickRate: 0.25,
      avgResponseRate: 0.15,
      bestGlobalHours: [10, 11, 19, 20],
      bestGlobalDays: [2, 3, 4], // Tuesday, Wednesday, Thursday
      seasonalFactors: {
        spring: 1.1,
        summer: 1.0,
        fall: 1.15,
        winter: 0.95,
      },
    };
  }

  /**
   * Adjust time window for timezone
   */
  private adjustForTimezone(window: OptimalTimeWindow, timezone: string): void {
    // Simplified timezone adjustment
    // In production, would use proper timezone library
    const offset = this.getTimezoneOffset(timezone);
    window.startTime = new Date(window.startTime.getTime() + offset);
    window.endTime = new Date(window.endTime.getTime() + offset);

    if (window.alternativeWindows) {
      for (const alt of window.alternativeWindows) {
        alt.startTime = new Date(alt.startTime.getTime() + offset);
        alt.endTime = new Date(alt.endTime.getTime() + offset);
      }
    }
  }

  /**
   * Apply urgency modifiers to time window
   */
  private applyUrgencyModifiers(
    window: OptimalTimeWindow,
    urgency: string,
  ): void {
    if (urgency === 'urgent') {
      // Send immediately
      window.startTime = new Date();
      window.endTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      window.reasoning.push('Urgent message - sending immediately');
    } else if (urgency === 'high') {
      // Send within next 2 hours
      const maxDelay = 2 * 60 * 60 * 1000;
      if (window.startTime.getTime() - Date.now() > maxDelay) {
        window.startTime = new Date();
        window.endTime = new Date(Date.now() + maxDelay);
        window.reasoning.push('High priority - sending within 2 hours');
      }
    }
  }

  /**
   * Helper: Get timezone offset
   */
  private getTimezoneOffset(timezone: string): number {
    // Simplified - in production use moment-timezone or similar
    const offsets: Record<string, number> = {
      'America/New_York': -5 * 60 * 60 * 1000,
      'America/Chicago': -6 * 60 * 60 * 1000,
      'America/Denver': -7 * 60 * 60 * 1000,
      'America/Los_Angeles': -8 * 60 * 60 * 1000,
      'Europe/London': 0,
      'Europe/Paris': 1 * 60 * 60 * 1000,
    };

    return offsets[timezone] || 0;
  }

  /**
   * Helper: Set time to today
   */
  private setTimeToday(time: Date): Date {
    const today = new Date();
    const result = new Date(today);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (result < today) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }

  /**
   * Helper: Format day and time for reasoning
   */
  private formatDayTime(
    dayAnalysis: DayAnalysis,
    hourAnalysis: HourAnalysis,
  ): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return `${days[dayAnalysis.bestDay]} at ${hourAnalysis.bestHour}:00`;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.engagementPatterns.clear();
    this.removeAllListeners();
  }
}

// Type definitions
interface GuestPattern {
  guestId: string;
  totalEngagements: number;
  dayOfWeekEngagement: Record<number, number>;
  hourOfDayEngagement: Record<number, number>;
  avgResponseTime: number;
  channelEffectiveness: Record<string, number>;
  lastUpdated: Date;
  segment?: string;
}

interface GlobalPatterns {
  avgOpenRate: number;
  avgClickRate: number;
  avgResponseRate: number;
  bestGlobalHours: number[];
  bestGlobalDays: number[];
  seasonalFactors: Record<string, number>;
}

interface NeuralInputs {
  dayOfWeekScores: DayAnalysis;
  hourOfDayScores: HourAnalysis;
  responseTimeAnalysis: ResponseAnalysis;
  channelPreference: ChannelPreference;
  proximityFactor: number;
  messageType: string;
  guestSegment: string;
}

interface NeuralPrediction {
  confidence: number;
  bestHour: number;
  bestDay: number;
  openProbability: number;
  clickProbability: number;
  responseProbability: number;
}

interface DayAnalysis {
  maxScore: number;
  bestDay: number;
  distribution: Record<number, number>;
}

interface HourAnalysis {
  maxScore: number;
  bestHour: number;
  distribution: Record<number, number>;
}

interface ResponseAnalysis {
  avgMinutes: number;
  median: number;
  percentile95: number;
}

interface ChannelPreference {
  preferred: 'email' | 'sms' | 'push';
  confidence: number;
}
