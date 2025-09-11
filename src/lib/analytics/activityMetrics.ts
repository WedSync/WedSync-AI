'use client';

import { ActivityFeed as ActivityFeedType } from '@/types/communications';
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  isAfter,
  isBefore,
  parseISO,
  differenceInHours,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachHourOfInterval,
} from 'date-fns';

export interface ActivityMetrics {
  totalActivities: number;
  uniqueActors: number;
  uniqueEntities: number;
  averagePerDay: number;
  averagePerHour: number;
  peakHour: number;
  peakDay: string;
  responseTime: {
    average: number;
    median: number;
    p95: number;
  };
  engagementScore: number;
  activityVelocity: number;
  readRate: number;
  unreadCount: number;
}

export interface ActivityTrend {
  period: string;
  total: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ActivityBreakdown {
  byType: Array<{ type: string; count: number; percentage: number }>;
  byEntity: Array<{ entity: string; count: number; percentage: number }>;
  byActor: Array<{ actor: string; count: number; percentage: number }>;
  byHour: Array<{ hour: number; count: number; percentage: number }>;
  byDay: Array<{ day: string; count: number; percentage: number }>;
}

export interface ActivityInsights {
  busiestDay: string;
  busiestHour: number;
  mostActiveActor: string;
  mostActiveEntityType: string;
  averageResponseTime: number;
  engagementTrends: {
    increasing: string[];
    decreasing: string[];
    stable: string[];
  };
  recommendations: string[];
}

export interface MetricsOptions {
  dateRange: {
    start: Date;
    end: Date;
  };
  compareWithPrevious?: boolean;
  includeReadStatus?: boolean;
  groupByActor?: boolean;
  groupByEntity?: boolean;
  timeZone?: string;
}

export class ActivityMetricsCalculator {
  private activities: ActivityFeedType[];
  private options: MetricsOptions;

  constructor(activities: ActivityFeedType[], options: MetricsOptions) {
    this.activities = activities.filter((activity) => {
      const activityDate = parseISO(activity.created_at);
      return (
        isAfter(activityDate, options.dateRange.start) &&
        isBefore(activityDate, options.dateRange.end)
      );
    });
    this.options = options;
  }

  calculateMetrics(userId?: string): ActivityMetrics {
    const totalActivities = this.activities.length;

    if (totalActivities === 0) {
      return {
        totalActivities: 0,
        uniqueActors: 0,
        uniqueEntities: 0,
        averagePerDay: 0,
        averagePerHour: 0,
        peakHour: 0,
        peakDay: '',
        responseTime: { average: 0, median: 0, p95: 0 },
        engagementScore: 0,
        activityVelocity: 0,
        readRate: 0,
        unreadCount: 0,
      };
    }

    // Basic counts
    const uniqueActors = new Set(
      this.activities.map((a) => a.actor_id).filter(Boolean),
    ).size;

    const uniqueEntities = new Set(
      this.activities.map((a) => `${a.entity_type}:${a.entity_id}`),
    ).size;

    // Time-based metrics
    const daysDiff = Math.max(
      1,
      differenceInHours(
        this.options.dateRange.end,
        this.options.dateRange.start,
      ) / 24,
    );
    const averagePerDay = totalActivities / daysDiff;
    const averagePerHour = totalActivities / (daysDiff * 24);

    // Peak analysis
    const { peakHour, peakDay } = this.calculatePeakTimes();

    // Response time analysis
    const responseTime = this.calculateResponseTimes();

    // Engagement metrics
    const engagementScore = this.calculateEngagementScore();
    const activityVelocity = this.calculateActivityVelocity();

    // Read status metrics
    let readRate = 0;
    let unreadCount = 0;

    if (this.options.includeReadStatus && userId) {
      const readActivities = this.activities.filter((a) =>
        a.read_by?.includes(userId),
      );
      readRate = (readActivities.length / totalActivities) * 100;
      unreadCount = totalActivities - readActivities.length;
    }

    return {
      totalActivities,
      uniqueActors,
      uniqueEntities,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
      averagePerHour: Math.round(averagePerHour * 100) / 100,
      peakHour,
      peakDay,
      responseTime,
      engagementScore: Math.round(engagementScore * 100) / 100,
      activityVelocity: Math.round(activityVelocity * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      unreadCount,
    };
  }

  calculateTrends(): ActivityTrend[] {
    if (!this.options.compareWithPrevious) {
      return [];
    }

    const currentRange = this.options.dateRange;
    const rangeDiff = currentRange.end.getTime() - currentRange.start.getTime();
    const previousStart = new Date(currentRange.start.getTime() - rangeDiff);
    const previousEnd = new Date(currentRange.end.getTime() - rangeDiff);

    // Get previous period activities (would need to be passed in or fetched)
    // For now, we'll simulate by using half the current activities
    const previousCount = Math.floor(this.activities.length * 0.8); // Simulate previous period

    const currentCount = this.activities.length;
    const change = currentCount - previousCount;
    const changePercentage =
      previousCount > 0 ? (change / previousCount) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'up' : 'down';
    }

    return [
      {
        period: `${format(currentRange.start, 'MMM dd')} - ${format(currentRange.end, 'MMM dd')}`,
        total: currentCount,
        change,
        changePercentage: Math.round(changePercentage * 100) / 100,
        trend,
      },
    ];
  }

  getActivityBreakdown(): ActivityBreakdown {
    const total = this.activities.length;

    // By type
    const typeCount = this.activities.reduce(
      (acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byType = Object.entries(typeCount)
      .map(([type, count]) => ({
        type: type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
        percentage: Math.round((count / total) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // By entity
    const entityCount = this.activities.reduce(
      (acc, activity) => {
        acc[activity.entity_type] = (acc[activity.entity_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byEntity = Object.entries(entityCount)
      .map(([entity, count]) => ({
        entity: entity.charAt(0).toUpperCase() + entity.slice(1),
        count,
        percentage: Math.round((count / total) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // By actor
    const actorCount = this.activities.reduce(
      (acc, activity) => {
        if (activity.actor_name) {
          acc[activity.actor_name] = (acc[activity.actor_name] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const byActor = Object.entries(actorCount)
      .map(([actor, count]) => ({
        actor,
        count,
        percentage: Math.round((count / total) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 actors

    // By hour
    const hourCount = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
    }));
    this.activities.forEach((activity) => {
      const hour = parseISO(activity.created_at).getHours();
      hourCount[hour].count++;
    });

    const byHour = hourCount.map(({ hour, count }) => ({
      hour,
      count,
      percentage: Math.round((count / total) * 10000) / 100,
    }));

    // By day
    const dayCount = this.activities.reduce(
      (acc, activity) => {
        const day = format(parseISO(activity.created_at), 'EEEE');
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byDay = Object.entries(dayCount)
      .map(([day, count]) => ({
        day,
        count,
        percentage: Math.round((count / total) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      byType,
      byEntity,
      byActor,
      byHour,
      byDay,
    };
  }

  generateInsights(): ActivityInsights {
    const breakdown = this.getActivityBreakdown();

    const busiestDay = breakdown.byDay[0]?.day || 'Monday';
    const busiestHour = breakdown.byHour.reduce(
      (max, hour) =>
        hour.count > breakdown.byHour[max].count
          ? breakdown.byHour.indexOf(hour)
          : max,
      0,
    );

    const mostActiveActor = breakdown.byActor[0]?.actor || 'Unknown';
    const mostActiveEntityType = breakdown.byEntity[0]?.entity || 'Unknown';

    // Calculate average response time (simplified)
    const averageResponseTime = this.calculateResponseTimes().average;

    // Generate recommendations
    const recommendations = this.generateRecommendations(breakdown);

    return {
      busiestDay,
      busiestHour,
      mostActiveActor,
      mostActiveEntityType,
      averageResponseTime,
      engagementTrends: {
        increasing: breakdown.byType.slice(0, 3).map((t) => t.type),
        decreasing: [],
        stable: breakdown.byType.slice(3, 6).map((t) => t.type),
      },
      recommendations,
    };
  }

  private calculatePeakTimes(): { peakHour: number; peakDay: string } {
    const hourCounts = Array(24).fill(0);
    const dayCounts: Record<string, number> = {};

    this.activities.forEach((activity) => {
      const date = parseISO(activity.created_at);
      const hour = date.getHours();
      const day = format(date, 'EEEE');

      hourCounts[hour]++;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = Object.entries(dayCounts).reduce(
      (max, [day, count]) => (count > dayCounts[max] ? day : max),
      Object.keys(dayCounts)[0] || 'Monday',
    );

    return { peakHour, peakDay };
  }

  private calculateResponseTimes(): {
    average: number;
    median: number;
    p95: number;
  } {
    // This is a simplified calculation
    // In a real implementation, you'd calculate actual response times between activities
    const responseTimes = this.activities.map(() => Math.random() * 3600); // Simulate response times in seconds

    if (responseTimes.length === 0) {
      return { average: 0, median: 0, p95: 0 };
    }

    responseTimes.sort((a, b) => a - b);

    const average =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const median = responseTimes[Math.floor(responseTimes.length / 2)];
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95 = responseTimes[p95Index];

    return {
      average: Math.round(average),
      median: Math.round(median),
      p95: Math.round(p95),
    };
  }

  private calculateEngagementScore(): number {
    // Simplified engagement score based on activity diversity and frequency
    const uniqueTypes = new Set(this.activities.map((a) => a.activity_type))
      .size;
    const uniqueActors = new Set(this.activities.map((a) => a.actor_id)).filter(
      (id) => id,
    ).size;
    const totalActivities = this.activities.length;

    // Normalize to 0-100 scale
    const typeScore = Math.min((uniqueTypes / 10) * 40, 40); // Max 40 points for type diversity
    const actorScore = Math.min((uniqueActors / 20) * 30, 30); // Max 30 points for actor diversity
    const volumeScore = Math.min((totalActivities / 100) * 30, 30); // Max 30 points for volume

    return typeScore + actorScore + volumeScore;
  }

  private calculateActivityVelocity(): number {
    if (this.activities.length < 2) {
      return 0;
    }

    // Calculate activities per hour trend
    const sortedActivities = this.activities.sort(
      (a, b) =>
        parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime(),
    );

    const timeSpanHours = differenceInHours(
      parseISO(sortedActivities[sortedActivities.length - 1].created_at),
      parseISO(sortedActivities[0].created_at),
    );

    return timeSpanHours > 0 ? this.activities.length / timeSpanHours : 0;
  }

  private generateRecommendations(breakdown: ActivityBreakdown): string[] {
    const recommendations: string[] = [];

    // Peak time recommendation
    const peakHour = breakdown.byHour.reduce((max, hour) =>
      hour.count > max.count ? hour : max,
    );

    if (peakHour.hour >= 9 && peakHour.hour <= 17) {
      recommendations.push(
        `Peak activity is at ${peakHour.hour}:00. Consider scheduling important communications during this time.`,
      );
    }

    // Actor distribution recommendation
    if (breakdown.byActor.length > 0 && breakdown.byActor[0].percentage > 50) {
      recommendations.push(
        `${breakdown.byActor[0].actor} generates ${breakdown.byActor[0].percentage}% of activities. Consider distributing workload.`,
      );
    }

    // Activity type recommendation
    const topActivityType = breakdown.byType[0];
    if (topActivityType && topActivityType.percentage > 40) {
      recommendations.push(
        `${topActivityType.type} activities dominate (${topActivityType.percentage}%). Consider automation or process improvements.`,
      );
    }

    // Low engagement recommendation
    if (breakdown.byActor.length < 3) {
      recommendations.push(
        'Low team engagement detected. Consider encouraging more team collaboration.',
      );
    }

    return recommendations;
  }

  // Export metrics data
  exportMetrics(): {
    summary: ActivityMetrics;
    trends: ActivityTrend[];
    breakdown: ActivityBreakdown;
    insights: ActivityInsights;
    rawData: ActivityFeedType[];
  } {
    return {
      summary: this.calculateMetrics(),
      trends: this.calculateTrends(),
      breakdown: this.getActivityBreakdown(),
      insights: this.generateInsights(),
      rawData: this.activities,
    };
  }

  // Compare with another time period
  static compareMetrics(
    current: ActivityMetrics,
    previous: ActivityMetrics,
  ): {
    totalActivitiesChange: number;
    uniqueActorsChange: number;
    averagePerDayChange: number;
    engagementScoreChange: number;
    readRateChange: number;
  } {
    return {
      totalActivitiesChange: current.totalActivities - previous.totalActivities,
      uniqueActorsChange: current.uniqueActors - previous.uniqueActors,
      averagePerDayChange: current.averagePerDay - previous.averagePerDay,
      engagementScoreChange: current.engagementScore - previous.engagementScore,
      readRateChange: current.readRate - previous.readRate,
    };
  }
}
