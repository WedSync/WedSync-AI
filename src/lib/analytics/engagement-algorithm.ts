/**
 * Advanced Engagement Scoring Algorithm
 * Feature ID: WS-052
 *
 * Implements comprehensive engagement scoring with:
 * - Real-time calculation
 * - Multi-factor analysis
 * - Predictive at-risk detection
 * - Industry benchmarking
 */

import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

export interface EngagementMetrics {
  // Communication Metrics
  emailOpens: number;
  emailClicks: number;
  emailResponseRate: number;
  averageResponseTime: number; // in hours

  // Portal Activity
  portalLogins: number;
  portalPageViews: number;
  averageSessionDuration: number; // in minutes
  documentsDownloaded: number;

  // Form Engagement
  formsViewed: number;
  formsStarted: number;
  formsCompleted: number;
  formCompletionRate: number;

  // Meeting & Call Metrics
  callsScheduled: number;
  callsAttended: number;
  meetingsScheduled: number;
  meetingsAttended: number;

  // Payment & Contract
  paymentsOnTime: number;
  paymentDelays: number;
  contractsSigned: number;

  // Timeline Metrics
  daysSinceLastActivity: number;
  daysUntilWedding: number;
  accountAge: number; // days since first interaction

  // Quality Metrics
  satisfactionRating?: number; // 1-5 scale
  npsScore?: number; // -100 to 100
  referralsGiven: number;
}

export interface EngagementWeights {
  emailActivity: number;
  portalActivity: number;
  formEngagement: number;
  communicationQuality: number;
  meetingParticipation: number;
  paymentBehavior: number;
  recencyFactor: number;
  satisfactionFactor: number;
}

export interface IndustryBenchmarks {
  averageEngagementScore: number;
  topPerformerThreshold: number; // Top 20%
  atRiskThreshold: number; // Bottom 20%
  averageResponseTime: number; // hours
  averageFormCompletionRate: number;
  averagePortalVisitsPerMonth: number;
}

export class EngagementScoringAlgorithm {
  private readonly defaultWeights: EngagementWeights = {
    emailActivity: 0.15,
    portalActivity: 0.2,
    formEngagement: 0.15,
    communicationQuality: 0.15,
    meetingParticipation: 0.1,
    paymentBehavior: 0.1,
    recencyFactor: 0.1,
    satisfactionFactor: 0.05,
  };

  private readonly industryBenchmarks: IndustryBenchmarks = {
    averageEngagementScore: 65,
    topPerformerThreshold: 80,
    atRiskThreshold: 40,
    averageResponseTime: 24, // hours
    averageFormCompletionRate: 0.75,
    averagePortalVisitsPerMonth: 8,
  };

  /**
   * Calculate comprehensive engagement score (0-100)
   */
  calculateScore(
    metrics: EngagementMetrics,
    weights: Partial<EngagementWeights> = {},
  ): number {
    const finalWeights = { ...this.defaultWeights, ...weights };

    // Calculate component scores
    const emailScore = this.calculateEmailScore(metrics);
    const portalScore = this.calculatePortalScore(metrics);
    const formScore = this.calculateFormScore(metrics);
    const communicationScore = this.calculateCommunicationScore(metrics);
    const meetingScore = this.calculateMeetingScore(metrics);
    const paymentScore = this.calculatePaymentScore(metrics);
    const recencyScore = this.calculateRecencyScore(metrics);
    const satisfactionScore = this.calculateSatisfactionScore(metrics);

    // Apply weights
    const weightedScore =
      emailScore * finalWeights.emailActivity +
      portalScore * finalWeights.portalActivity +
      formScore * finalWeights.formEngagement +
      communicationScore * finalWeights.communicationQuality +
      meetingScore * finalWeights.meetingParticipation +
      paymentScore * finalWeights.paymentBehavior +
      recencyScore * finalWeights.recencyFactor +
      satisfactionScore * finalWeights.satisfactionFactor;

    // Apply time-based adjustments
    const adjustedScore = this.applyTimeAdjustments(weightedScore, metrics);

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(adjustedScore)));
  }

  /**
   * Calculate email engagement score
   */
  private calculateEmailScore(metrics: EngagementMetrics): number {
    const openRate =
      metrics.emailOpens > 0
        ? Math.min(1, metrics.emailClicks / metrics.emailOpens)
        : 0;

    const responseRate = metrics.emailResponseRate;
    const responseTimeScore = this.normalizeResponseTime(
      metrics.averageResponseTime,
    );

    return openRate * 40 + responseRate * 40 + responseTimeScore * 20;
  }

  /**
   * Calculate portal activity score
   */
  private calculatePortalScore(metrics: EngagementMetrics): number {
    const loginFrequency = Math.min(1, metrics.portalLogins / 10); // 10+ logins = perfect
    const pageEngagement = Math.min(1, metrics.portalPageViews / 50); // 50+ views = perfect
    const sessionQuality = Math.min(1, metrics.averageSessionDuration / 10); // 10+ minutes = perfect
    const documentActivity = Math.min(1, metrics.documentsDownloaded / 5); // 5+ downloads = perfect

    return (
      loginFrequency * 25 +
      pageEngagement * 25 +
      sessionQuality * 25 +
      documentActivity * 25
    );
  }

  /**
   * Calculate form engagement score
   */
  private calculateFormScore(metrics: EngagementMetrics): number {
    const viewToStartRate =
      metrics.formsViewed > 0 ? metrics.formsStarted / metrics.formsViewed : 0;

    const completionRate = metrics.formCompletionRate;
    const volumeScore = Math.min(1, metrics.formsCompleted / 5); // 5+ forms = perfect

    return viewToStartRate * 30 + completionRate * 50 + volumeScore * 20;
  }

  /**
   * Calculate communication quality score
   */
  private calculateCommunicationScore(metrics: EngagementMetrics): number {
    const responseRate = metrics.emailResponseRate;
    const responseSpeed = this.normalizeResponseTime(
      metrics.averageResponseTime,
    );
    const proactiveEngagement = Math.min(
      1,
      (metrics.callsScheduled + metrics.meetingsScheduled) / 5,
    );

    return responseRate * 40 + responseSpeed * 35 + proactiveEngagement * 25;
  }

  /**
   * Calculate meeting participation score
   */
  private calculateMeetingScore(metrics: EngagementMetrics): number {
    const callAttendance =
      metrics.callsScheduled > 0
        ? metrics.callsAttended / metrics.callsScheduled
        : 1;

    const meetingAttendance =
      metrics.meetingsScheduled > 0
        ? metrics.meetingsAttended / metrics.meetingsScheduled
        : 1;

    const volumeScore = Math.min(
      1,
      (metrics.callsAttended + metrics.meetingsAttended) / 8,
    );

    return callAttendance * 35 + meetingAttendance * 35 + volumeScore * 30;
  }

  /**
   * Calculate payment behavior score
   */
  private calculatePaymentScore(metrics: EngagementMetrics): number {
    const onTimeRate =
      metrics.paymentsOnTime + metrics.paymentDelays > 0
        ? metrics.paymentsOnTime /
          (metrics.paymentsOnTime + metrics.paymentDelays)
        : 1;

    const contractCompliance = Math.min(1, metrics.contractsSigned / 2); // 2+ contracts = perfect

    return onTimeRate * 70 + contractCompliance * 30;
  }

  /**
   * Calculate recency score (how recent is the engagement)
   */
  private calculateRecencyScore(metrics: EngagementMetrics): number {
    const { daysSinceLastActivity } = metrics;

    if (daysSinceLastActivity <= 3) return 100;
    if (daysSinceLastActivity <= 7) return 85;
    if (daysSinceLastActivity <= 14) return 70;
    if (daysSinceLastActivity <= 21) return 50;
    if (daysSinceLastActivity <= 30) return 30;
    if (daysSinceLastActivity <= 45) return 15;
    return 5;
  }

  /**
   * Calculate satisfaction score
   */
  private calculateSatisfactionScore(metrics: EngagementMetrics): number {
    let score = 50; // Default neutral score

    if (metrics.satisfactionRating !== undefined) {
      score = (metrics.satisfactionRating / 5) * 100;
    }

    if (metrics.npsScore !== undefined) {
      const npsContribution = ((metrics.npsScore + 100) / 200) * 30;
      score = score * 0.7 + npsContribution;
    }

    const referralBonus = Math.min(20, metrics.referralsGiven * 10);
    score += referralBonus;

    return Math.min(100, score);
  }

  /**
   * Apply time-based adjustments
   */
  private applyTimeAdjustments(
    baseScore: number,
    metrics: EngagementMetrics,
  ): number {
    let adjustedScore = baseScore;

    // Wedding proximity boost
    if (metrics.daysUntilWedding <= 30 && metrics.daysUntilWedding > 0) {
      adjustedScore *= 1.2; // 20% boost for couples close to wedding
    } else if (
      metrics.daysUntilWedding <= 60 &&
      metrics.daysUntilWedding > 30
    ) {
      adjustedScore *= 1.1; // 10% boost
    }

    // New account grace period
    if (metrics.accountAge <= 7) {
      adjustedScore = Math.max(adjustedScore, 50); // Minimum 50 for new accounts
    }

    // Inactivity penalty
    if (metrics.daysSinceLastActivity > 30) {
      adjustedScore *= 0.7; // 30% penalty for long inactivity
    }

    return adjustedScore;
  }

  /**
   * Normalize response time to 0-100 score
   */
  private normalizeResponseTime(hours: number): number {
    if (hours <= 1) return 100;
    if (hours <= 4) return 90;
    if (hours <= 8) return 80;
    if (hours <= 24) return 70;
    if (hours <= 48) return 50;
    if (hours <= 72) return 30;
    return 10;
  }

  /**
   * Determine engagement segment
   */
  getEngagementSegment(score: number): string {
    if (score >= 85) return 'champion';
    if (score >= 70) return 'highly_engaged';
    if (score >= 50) return 'normal';
    if (score >= 30) return 'at_risk';
    return 'ghost';
  }

  /**
   * Get risk level based on multiple factors
   */
  getRiskLevel(
    metrics: EngagementMetrics,
    score: number,
  ): {
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskPoints = 0;

    // Check inactivity
    if (metrics.daysSinceLastActivity > 30) {
      reasons.push('No activity for over 30 days');
      riskPoints += 3;
    } else if (metrics.daysSinceLastActivity > 14) {
      reasons.push('No activity for over 2 weeks');
      riskPoints += 2;
    } else if (metrics.daysSinceLastActivity > 7) {
      reasons.push('No activity for over a week');
      riskPoints += 1;
    }

    // Check wedding proximity vs engagement
    if (metrics.daysUntilWedding <= 60 && score < 50) {
      reasons.push('Low engagement close to wedding date');
      riskPoints += 3;
    }

    // Check form abandonment
    if (metrics.formsStarted > 0 && metrics.formCompletionRate < 0.3) {
      reasons.push('High form abandonment rate');
      riskPoints += 2;
    }

    // Check meeting attendance
    const meetingAttendanceRate =
      metrics.meetingsScheduled > 0
        ? metrics.meetingsAttended / metrics.meetingsScheduled
        : 1;
    if (meetingAttendanceRate < 0.5) {
      reasons.push('Missing scheduled meetings');
      riskPoints += 2;
    }

    // Check payment delays
    if (metrics.paymentDelays > 2) {
      reasons.push('Multiple payment delays');
      riskPoints += 2;
    }

    // Determine risk level
    if (riskPoints === 0) return { level: 'none', reasons };
    if (riskPoints <= 2) return { level: 'low', reasons };
    if (riskPoints <= 4) return { level: 'medium', reasons };
    if (riskPoints <= 6) return { level: 'high', reasons };
    return { level: 'critical', reasons };
  }

  /**
   * Get recommended actions based on engagement analysis
   */
  getRecommendedActions(metrics: EngagementMetrics, score: number): string[] {
    const actions: string[] = [];
    const segment = this.getEngagementSegment(score);

    if (segment === 'ghost' || segment === 'at_risk') {
      actions.push('Schedule a personal check-in call immediately');
      actions.push('Send a personalized re-engagement email');

      if (metrics.daysUntilWedding <= 90) {
        actions.push('Escalate to senior planner for intervention');
      }
    }

    if (metrics.formCompletionRate < 0.5) {
      actions.push('Simplify forms or offer assistance with completion');
    }

    if (metrics.averageResponseTime > 48) {
      actions.push('Improve response time to under 24 hours');
    }

    if (metrics.portalLogins < 2) {
      actions.push('Send portal tutorial or walkthrough video');
    }

    if (segment === 'champion') {
      actions.push('Request testimonial or referral');
      actions.push('Offer premium services or upgrades');
    }

    return actions;
  }

  /**
   * Compare to industry benchmarks
   */
  getBenchmarkComparison(score: number): {
    percentile: number;
    comparison: 'below_average' | 'average' | 'above_average' | 'top_performer';
    message: string;
  } {
    const { averageEngagementScore, topPerformerThreshold, atRiskThreshold } =
      this.industryBenchmarks;

    let percentile: number;
    let comparison:
      | 'below_average'
      | 'average'
      | 'above_average'
      | 'top_performer';
    let message: string;

    if (score >= topPerformerThreshold) {
      percentile =
        80 +
        ((score - topPerformerThreshold) / (100 - topPerformerThreshold)) * 20;
      comparison = 'top_performer';
      message = `Top ${Math.round(100 - percentile)}% in the industry`;
    } else if (score >= averageEngagementScore) {
      percentile =
        50 +
        ((score - averageEngagementScore) /
          (topPerformerThreshold - averageEngagementScore)) *
          30;
      comparison = 'above_average';
      message = 'Above industry average';
    } else if (score >= atRiskThreshold) {
      percentile =
        20 +
        ((score - atRiskThreshold) /
          (averageEngagementScore - atRiskThreshold)) *
          30;
      comparison = 'average';
      message = 'Industry average performance';
    } else {
      percentile = (score / atRiskThreshold) * 20;
      comparison = 'below_average';
      message = 'Below industry average - improvement needed';
    }

    return {
      percentile: Math.round(percentile),
      comparison,
      message,
    };
  }
}

// Export singleton instance
export const engagementAlgorithm = new EngagementScoringAlgorithm();
