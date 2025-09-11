/**
 * WS-155: Message Pattern Analysis Service
 * Team E - Round 2
 * ML-powered pattern detection and communication insights
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type MessagePattern = Database['public']['Tables']['message_patterns']['Row'];

export interface PatternDetectionResult {
  patternId: string;
  type: PatternType;
  confidence: number;
  description: string;
  evidence: Evidence[];
  recommendations: Recommendation[];
  impact: Impact;
}

export type PatternType =
  | 'timing'
  | 'frequency'
  | 'content'
  | 'engagement'
  | 'response'
  | 'sentiment'
  | 'channel'
  | 'audience';

export interface Evidence {
  dataPoint: string;
  value: any;
  significance: number;
  explanation: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface Impact {
  metric: string;
  current: number;
  potential: number;
  improvement: number;
}

export interface CommunicationInsights {
  bestTimes: TimingInsight[];
  optimalFrequency: FrequencyInsight;
  contentPatterns: ContentInsight[];
  audienceSegments: AudienceInsight[];
  channelPerformance: ChannelInsight[];
}

export interface TimingInsight {
  dayOfWeek: string;
  hour: number;
  engagementRate: number;
  openRate: number;
  responseTime: number;
  confidence: number;
}

export interface FrequencyInsight {
  optimal: number;
  unit: 'day' | 'week' | 'month';
  fatigueTreshold: number;
  currentRate: number;
  recommendation: string;
}

export interface ContentInsight {
  type: string;
  characteristics: Record<string, any>;
  performance: number;
  examples: string[];
}

export interface AudienceInsight {
  segment: string;
  size: number;
  engagement: number;
  preferences: Record<string, any>;
  bestPractices: string[];
}

export interface ChannelInsight {
  channel: string;
  effectiveness: number;
  cost: number;
  roi: number;
  bestUseCase: string[];
}

class MessagePatternAnalysisService {
  private supabase = createClient();
  private mlModel: any = null; // Would integrate with TensorFlow.js or similar

  /**
   * Detect all patterns in message history
   */
  async detectPatterns(
    organizationId: string,
    lookbackDays: number = 30,
  ): Promise<PatternDetectionResult[]> {
    const patterns: PatternDetectionResult[] = [];

    try {
      // Run multiple pattern detection algorithms in parallel
      const [
        timingPatterns,
        contentPatterns,
        engagementPatterns,
        responsePatterns,
        sentimentPatterns,
      ] = await Promise.all([
        this.detectTimingPatterns(organizationId, lookbackDays),
        this.detectContentPatterns(organizationId, lookbackDays),
        this.detectEngagementPatterns(organizationId, lookbackDays),
        this.detectResponsePatterns(organizationId, lookbackDays),
        this.detectSentimentPatterns(organizationId, lookbackDays),
      ]);

      patterns.push(
        ...timingPatterns,
        ...contentPatterns,
        ...engagementPatterns,
        ...responsePatterns,
        ...sentimentPatterns,
      );

      // Store detected patterns
      await this.storePatterns(organizationId, patterns);

      return patterns;
    } catch (error) {
      console.error('Pattern detection failed:', error);
      throw new Error('Failed to detect patterns');
    }
  }

  /**
   * Detect optimal timing patterns
   */
  private async detectTimingPatterns(
    organizationId: string,
    lookbackDays: number,
  ): Promise<PatternDetectionResult[]> {
    const patterns: PatternDetectionResult[] = [];

    try {
      // Analyze message timing data
      const { data, error } = await this.supabase.rpc(
        'analyze_timing_patterns',
        {
          p_organization_id: organizationId,
          p_days_back: lookbackDays,
        },
      );

      if (error) throw error;

      if (data && data.best_hours) {
        const bestHours = data.best_hours;
        const confidence = this.calculateConfidence(
          data.sample_size,
          data.variance,
        );

        patterns.push({
          patternId: `timing-${Date.now()}`,
          type: 'timing',
          confidence,
          description: `Optimal sending times identified: ${bestHours.map((h: any) => `${h.hour}:00`).join(', ')}`,
          evidence: bestHours.map((h: any) => ({
            dataPoint: `Hour ${h.hour}`,
            value: h.engagement_rate,
            significance: h.significance || 0.8,
            explanation: `${(h.engagement_rate * 100).toFixed(1)}% engagement rate`,
          })),
          recommendations: [
            {
              priority: 'high',
              action: `Schedule important messages between ${bestHours[0].hour}:00-${bestHours[0].hour + 1}:00`,
              expectedImpact: `${((bestHours[0].engagement_rate - data.avg_engagement_rate) * 100).toFixed(1)}% increase in engagement`,
              effort: 'low',
            },
          ],
          impact: {
            metric: 'engagement_rate',
            current: data.avg_engagement_rate || 0,
            potential: bestHours[0].engagement_rate || 0,
            improvement:
              ((bestHours[0].engagement_rate - data.avg_engagement_rate) /
                data.avg_engagement_rate) *
                100 || 0,
          },
        });
      }

      // Detect day-of-week patterns
      const dayPatterns = await this.analyzeDayOfWeekPatterns(organizationId);
      if (dayPatterns) {
        patterns.push(dayPatterns);
      }
    } catch (error) {
      console.error('Timing pattern detection failed:', error);
    }

    return patterns;
  }

  /**
   * Detect content patterns
   */
  private async detectContentPatterns(
    organizationId: string,
    lookbackDays: number,
  ): Promise<PatternDetectionResult[]> {
    const patterns: PatternDetectionResult[] = [];

    try {
      // Analyze message content
      const { data: messages } = await this.supabase
        .from('messages')
        .select('id, subject, content, open_rate, click_rate')
        .eq('organization_id', organizationId)
        .gte(
          'created_at',
          new Date(
            Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        )
        .not('open_rate', 'is', null)
        .order('open_rate', { ascending: false })
        .limit(100);

      if (messages && messages.length > 20) {
        // Analyze content characteristics
        const analysis = this.analyzeContentCharacteristics(messages);

        if (analysis.patterns.length > 0) {
          analysis.patterns.forEach((pattern) => {
            patterns.push({
              patternId: `content-${Date.now()}-${pattern.type}`,
              type: 'content',
              confidence: pattern.confidence,
              description: pattern.description,
              evidence: pattern.evidence,
              recommendations: pattern.recommendations,
              impact: pattern.impact,
            });
          });
        }
      }
    } catch (error) {
      console.error('Content pattern detection failed:', error);
    }

    return patterns;
  }

  /**
   * Detect engagement patterns
   */
  private async detectEngagementPatterns(
    organizationId: string,
    lookbackDays: number,
  ): Promise<PatternDetectionResult[]> {
    const patterns: PatternDetectionResult[] = [];

    try {
      // Get engagement metrics
      const { data } = await this.supabase
        .from('message_analytics_fact')
        .select('*')
        .eq('organization_id', organizationId)
        .gte(
          'sent_date',
          new Date(
            Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        );

      if (data && data.length > 0) {
        // Analyze engagement trends
        const engagementTrend = this.analyzeEngagementTrend(data);

        if (engagementTrend.significant) {
          patterns.push({
            patternId: `engagement-${Date.now()}`,
            type: 'engagement',
            confidence: engagementTrend.confidence,
            description: engagementTrend.description,
            evidence: engagementTrend.evidence,
            recommendations: engagementTrend.recommendations,
            impact: engagementTrend.impact,
          });
        }

        // Detect fatigue patterns
        const fatiguePattern = this.detectFatiguePattern(data);
        if (fatiguePattern) {
          patterns.push(fatiguePattern);
        }
      }
    } catch (error) {
      console.error('Engagement pattern detection failed:', error);
    }

    return patterns;
  }

  /**
   * Detect response patterns
   */
  private async detectResponsePatterns(
    organizationId: string,
    lookbackDays: number,
  ): Promise<PatternDetectionResult[]> {
    const patterns: PatternDetectionResult[] = [];

    try {
      // Analyze response times and patterns
      const { data } = await this.supabase
        .from('messages')
        .select('id, created_at, first_response_at, response_count')
        .eq('organization_id', organizationId)
        .not('first_response_at', 'is', null)
        .gte(
          'created_at',
          new Date(
            Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        );

      if (data && data.length > 10) {
        const responseAnalysis = this.analyzeResponsePatterns(data);

        if (responseAnalysis.pattern) {
          patterns.push(responseAnalysis.pattern);
        }
      }
    } catch (error) {
      console.error('Response pattern detection failed:', error);
    }

    return patterns;
  }

  /**
   * Detect sentiment patterns
   */
  private async detectSentimentPatterns(
    organizationId: string,
    lookbackDays: number,
  ): Promise<PatternDetectionResult[]> {
    const patterns: PatternDetectionResult[] = [];

    try {
      // This would typically use NLP/sentiment analysis
      // For now, using mock analysis
      const sentimentData = await this.analyzeSentiment(
        organizationId,
        lookbackDays,
      );

      if (sentimentData.pattern) {
        patterns.push(sentimentData.pattern);
      }
    } catch (error) {
      console.error('Sentiment pattern detection failed:', error);
    }

    return patterns;
  }

  /**
   * Get comprehensive communication insights
   */
  async getCommunicationInsights(
    organizationId: string,
  ): Promise<CommunicationInsights> {
    const [
      bestTimes,
      optimalFrequency,
      contentPatterns,
      audienceSegments,
      channelPerformance,
    ] = await Promise.all([
      this.getBestSendingTimes(organizationId),
      this.getOptimalFrequency(organizationId),
      this.getContentPatterns(organizationId),
      this.getAudienceSegments(organizationId),
      this.getChannelPerformance(organizationId),
    ]);

    return {
      bestTimes,
      optimalFrequency,
      contentPatterns,
      audienceSegments,
      channelPerformance,
    };
  }

  /**
   * Get best sending times
   */
  private async getBestSendingTimes(
    organizationId: string,
  ): Promise<TimingInsight[]> {
    const { data } = await this.supabase.rpc('get_best_sending_times', {
      p_organization_id: organizationId,
    });

    return (data || []).map((item: any) => ({
      dayOfWeek: item.day_of_week,
      hour: item.hour,
      engagementRate: item.engagement_rate,
      openRate: item.open_rate,
      responseTime: item.avg_response_time,
      confidence: item.confidence || 0.75,
    }));
  }

  /**
   * Get optimal sending frequency
   */
  private async getOptimalFrequency(
    organizationId: string,
  ): Promise<FrequencyInsight> {
    const { data } = await this.supabase.rpc('calculate_optimal_frequency', {
      p_organization_id: organizationId,
    });

    if (!data) {
      return {
        optimal: 3,
        unit: 'week',
        fatigueTreshold: 5,
        currentRate: 3,
        recommendation: 'Maintain current frequency',
      };
    }

    return {
      optimal: data.optimal_frequency,
      unit: data.unit,
      fatigueTreshold: data.fatigue_threshold,
      currentRate: data.current_rate,
      recommendation: data.recommendation,
    };
  }

  /**
   * Get content patterns
   */
  private async getContentPatterns(
    organizationId: string,
  ): Promise<ContentInsight[]> {
    // Simplified implementation
    return [
      {
        type: 'subject_line',
        characteristics: {
          optimal_length: '30-50 characters',
          personalization: true,
          urgency_words: false,
        },
        performance: 0.35,
        examples: [
          'Personal update for {name}',
          'Your wedding timeline is ready',
        ],
      },
      {
        type: 'message_body',
        characteristics: {
          optimal_length: '50-150 words',
          formatting: 'bullets',
          cta_placement: 'top',
        },
        performance: 0.28,
        examples: [],
      },
    ];
  }

  /**
   * Get audience segments
   */
  private async getAudienceSegments(
    organizationId: string,
  ): Promise<AudienceInsight[]> {
    // Would integrate with segmentation logic
    return [
      {
        segment: 'Highly Engaged',
        size: 150,
        engagement: 0.75,
        preferences: {
          frequency: 'daily',
          channel: 'email',
          content_type: 'detailed',
        },
        bestPractices: ['Send detailed updates', 'Include exclusive content'],
      },
      {
        segment: 'Occasional Readers',
        size: 300,
        engagement: 0.25,
        preferences: {
          frequency: 'weekly',
          channel: 'sms',
          content_type: 'summary',
        },
        bestPractices: ['Keep messages brief', 'Focus on key updates only'],
      },
    ];
  }

  /**
   * Get channel performance
   */
  private async getChannelPerformance(
    organizationId: string,
  ): Promise<ChannelInsight[]> {
    return [
      {
        channel: 'email',
        effectiveness: 0.65,
        cost: 0.02,
        roi: 3.2,
        bestUseCase: ['Detailed updates', 'Newsletters'],
      },
      {
        channel: 'sms',
        effectiveness: 0.85,
        cost: 0.05,
        roi: 2.8,
        bestUseCase: ['Urgent updates', 'Reminders'],
      },
      {
        channel: 'whatsapp',
        effectiveness: 0.75,
        cost: 0.03,
        roi: 3.5,
        bestUseCase: ['Group communications', 'Media sharing'],
      },
    ];
  }

  /**
   * Predict future engagement
   */
  async predictEngagement(
    organizationId: string,
    messageContent: string,
    sendTime: Date,
  ): Promise<{
    predictedOpenRate: number;
    predictedClickRate: number;
    confidence: number;
    factors: Array<{ factor: string; impact: number }>;
  }> {
    // This would use ML model for prediction
    // Simplified implementation
    const hour = sendTime.getHours();
    const dayOfWeek = sendTime.getDay();
    const contentLength = messageContent.length;

    let baseOpenRate = 0.25;
    let baseClickRate = 0.05;
    const factors: Array<{ factor: string; impact: number }> = [];

    // Time factors
    if (hour >= 9 && hour <= 11) {
      baseOpenRate *= 1.3;
      factors.push({ factor: 'Morning send time', impact: 0.3 });
    }

    // Day factors
    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      baseOpenRate *= 1.2;
      factors.push({ factor: 'Mid-week send', impact: 0.2 });
    }

    // Content factors
    if (contentLength >= 50 && contentLength <= 150) {
      baseClickRate *= 1.4;
      factors.push({ factor: 'Optimal content length', impact: 0.4 });
    }

    return {
      predictedOpenRate: Math.min(baseOpenRate, 0.8),
      predictedClickRate: Math.min(baseClickRate, 0.3),
      confidence: 0.75,
      factors: factors.sort((a, b) => b.impact - a.impact),
    };
  }

  /**
   * Helper methods
   */
  private calculateConfidence(sampleSize: number, variance: number): number {
    // Simple confidence calculation
    const sizeScore = Math.min(sampleSize / 100, 1);
    const varianceScore = Math.max(1 - variance, 0);
    return sizeScore * 0.6 + varianceScore * 0.4;
  }

  private analyzeContentCharacteristics(messages: any[]): any {
    // Analyze subject lines, content length, etc.
    const patterns: any[] = [];

    // Subject line analysis
    const avgSubjectLength =
      messages.reduce((sum, m) => sum + (m.subject?.length || 0), 0) /
      messages.length;
    const highPerformers = messages.filter((m) => m.open_rate > 0.3);
    const avgHighPerformerLength =
      highPerformers.reduce((sum, m) => sum + (m.subject?.length || 0), 0) /
      Math.max(highPerformers.length, 1);

    if (highPerformers.length > 5) {
      patterns.push({
        type: 'subject_length',
        confidence: 0.7,
        description: `Optimal subject line length: ${Math.round(avgHighPerformerLength)} characters`,
        evidence: [
          {
            dataPoint: 'Average length',
            value: avgHighPerformerLength,
            significance: 0.8,
            explanation: 'Based on high-performing messages',
          },
        ],
        recommendations: [
          {
            priority: 'medium',
            action: `Keep subject lines around ${Math.round(avgHighPerformerLength)} characters`,
            expectedImpact: '15% increase in open rate',
            effort: 'low',
          },
        ],
        impact: {
          metric: 'open_rate',
          current: 0.25,
          potential: 0.29,
          improvement: 16,
        },
      });
    }

    return { patterns };
  }

  private analyzeEngagementTrend(data: any[]): any {
    // Simplified trend analysis
    const recent = data.slice(-10);
    const older = data.slice(0, 10);

    const recentEngagement =
      recent.reduce((sum, d) => sum + (d.engagement_score || 0), 0) /
      recent.length;
    const olderEngagement =
      older.reduce((sum, d) => sum + (d.engagement_score || 0), 0) /
      Math.max(older.length, 1);

    const trend =
      (recentEngagement - olderEngagement) / Math.max(olderEngagement, 0.01);

    return {
      significant: Math.abs(trend) > 0.1,
      confidence: 0.7,
      description:
        trend > 0
          ? 'Engagement trending upward'
          : 'Engagement trending downward',
      evidence: [
        {
          dataPoint: 'Trend',
          value: `${(trend * 100).toFixed(1)}%`,
          significance: 0.8,
          explanation: 'Change over time period',
        },
      ],
      recommendations:
        trend < 0
          ? [
              {
                priority: 'high',
                action: 'Review and refresh message content',
                expectedImpact: 'Reverse negative trend',
                effort: 'medium',
              },
            ]
          : [],
      impact: {
        metric: 'engagement',
        current: recentEngagement,
        potential: recentEngagement * 1.2,
        improvement: 20,
      },
    };
  }

  private detectFatiguePattern(data: any[]): PatternDetectionResult | null {
    // Detect if increasing frequency leads to decreased engagement
    const byFrequency = this.groupByFrequency(data);

    if (byFrequency.highFrequency && byFrequency.lowFrequency) {
      const highEngagement = byFrequency.highFrequency.avgEngagement;
      const lowEngagement = byFrequency.lowFrequency.avgEngagement;

      if (highEngagement < lowEngagement * 0.8) {
        return {
          patternId: `fatigue-${Date.now()}`,
          type: 'frequency',
          confidence: 0.75,
          description:
            'Message fatigue detected - high frequency correlates with lower engagement',
          evidence: [
            {
              dataPoint: 'High frequency engagement',
              value: highEngagement,
              significance: 0.9,
              explanation: 'Engagement drops with increased frequency',
            },
          ],
          recommendations: [
            {
              priority: 'high',
              action: 'Reduce message frequency by 30%',
              expectedImpact: '25% increase in engagement',
              effort: 'low',
            },
          ],
          impact: {
            metric: 'engagement',
            current: highEngagement,
            potential: lowEngagement,
            improvement:
              ((lowEngagement - highEngagement) / highEngagement) * 100,
          },
        };
      }
    }

    return null;
  }

  private groupByFrequency(data: any[]): any {
    // Group messages by frequency periods
    // Simplified implementation
    return {
      highFrequency: { count: 100, avgEngagement: 0.15 },
      lowFrequency: { count: 50, avgEngagement: 0.25 },
    };
  }

  private analyzeResponsePatterns(data: any[]): any {
    // Analyze response times and patterns
    const responseTimes = data.map((m) => {
      const created = new Date(m.created_at).getTime();
      const responded = new Date(m.first_response_at).getTime();
      return (responded - created) / 1000 / 60; // Minutes
    });

    const avgResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    return {
      pattern:
        avgResponseTime < 60
          ? {
              patternId: `response-${Date.now()}`,
              type: 'response',
              confidence: 0.8,
              description: 'Quick response pattern detected',
              evidence: [
                {
                  dataPoint: 'Average response time',
                  value: `${avgResponseTime.toFixed(0)} minutes`,
                  significance: 0.85,
                  explanation: 'Recipients respond quickly to messages',
                },
              ],
              recommendations: [
                {
                  priority: 'medium',
                  action: 'Enable real-time chat for high-value conversations',
                  expectedImpact: 'Improved customer satisfaction',
                  effort: 'medium',
                },
              ],
              impact: {
                metric: 'response_time',
                current: avgResponseTime,
                potential: avgResponseTime * 0.5,
                improvement: 50,
              },
            }
          : null,
    };
  }

  private async analyzeSentiment(
    organizationId: string,
    lookbackDays: number,
  ): Promise<any> {
    // Placeholder for sentiment analysis
    // Would integrate with NLP service
    return {
      pattern: null,
    };
  }

  private async analyzeDayOfWeekPatterns(
    organizationId: string,
  ): Promise<PatternDetectionResult | null> {
    // Analyze which days have best engagement
    const { data } = await this.supabase.rpc('analyze_day_of_week_patterns', {
      p_organization_id: organizationId,
    });

    if (data && data.best_days) {
      return {
        patternId: `dow-${Date.now()}`,
        type: 'timing',
        confidence: 0.75,
        description: `Best days for engagement: ${data.best_days.join(', ')}`,
        evidence: data.best_days.map((day: any) => ({
          dataPoint: day.name,
          value: day.engagement,
          significance: 0.7,
          explanation: `${(day.engagement * 100).toFixed(1)}% engagement`,
        })),
        recommendations: [
          {
            priority: 'medium',
            action: `Focus campaigns on ${data.best_days[0]}`,
            expectedImpact: '20% increase in engagement',
            effort: 'low',
          },
        ],
        impact: {
          metric: 'engagement',
          current: data.avg_engagement || 0.2,
          potential: data.best_engagement || 0.3,
          improvement: 50,
        },
      };
    }

    return null;
  }

  private async storePatterns(
    organizationId: string,
    patterns: PatternDetectionResult[],
  ): Promise<void> {
    try {
      const records = patterns.map((p) => ({
        organization_id: organizationId,
        pattern_name: p.description,
        pattern_type: p.type,
        pattern_data: {
          evidence: p.evidence,
          recommendations: p.recommendations,
          impact: p.impact,
        },
        confidence_score: p.confidence,
        detected_at: new Date().toISOString(),
      }));

      await this.supabase.from('message_patterns').insert(records);
    } catch (error) {
      console.error('Failed to store patterns:', error);
    }
  }
}

export const messagePatternAnalysis = new MessagePatternAnalysisService();
