import { createClient } from '@/lib/supabase/server';

export interface LeadScoringFactors {
  // Demographic factors (0-25 points)
  weddingDateProximity: number;
  budgetMatch: number;
  profileCompleteness: number;
  locationMatch: number;

  // Behavioral factors (0-25 points)
  formCompletions: number;
  emailEngagement: number;
  websiteActivity: number;
  responseRate: number;

  // Engagement factors (0-25 points)
  recentActivity: number;
  communicationFrequency: number;
  initiatedContact: number;
  referralSource: number;

  // Fit factors (0-25 points)
  serviceAlignment: number;
  pricePointMatch: number;
  previousExperience: number;
  urgencyLevel: number;
}

export interface LeadScore {
  clientId: string;
  totalScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    demographic: number;
    behavioral: number;
    engagement: number;
    fit: number;
  };
  factors: LeadScoringFactors;
  qualificationStatus: 'qualified' | 'unqualified' | 'needs_review';
  scoreTrend: 'up' | 'down' | 'stable' | 'new';
  lastCalculated: Date;
}

export class LeadScoringAlgorithm {
  private supabase: any;
  private organizationId: string;

  constructor(supabase: any, organizationId: string) {
    this.supabase = supabase;
    this.organizationId = organizationId;
  }

  /**
   * Calculate comprehensive lead score for a client
   */
  async calculateLeadScore(clientId: string): Promise<LeadScore> {
    // Get client data
    const { data: client, error: clientError } = await this.supabase
      .from('clients')
      .select(
        `
        *,
        client_activities (
          activity_type,
          created_at,
          metadata
        ),
        lead_sources (
          source_name,
          source_category
        )
      `,
      )
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Get organization settings for scoring weights
    const { data: scoringSettings } = await this.supabase
      .from('lead_scoring_rules')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true);

    const factors = await this.calculateScoringFactors(client);
    const components = this.calculateComponents(factors);
    const totalScore = this.calculateTotalScore(components);
    const grade = this.calculateGrade(totalScore);
    const qualificationStatus = this.determineQualificationStatus(
      totalScore,
      factors,
    );
    const scoreTrend = await this.calculateScoreTrend(clientId, totalScore);

    const leadScore: LeadScore = {
      clientId,
      totalScore,
      grade,
      components,
      factors,
      qualificationStatus,
      scoreTrend,
      lastCalculated: new Date(),
    };

    // Save score to database
    await this.saveLeadScore(leadScore);

    return leadScore;
  }

  /**
   * Calculate individual scoring factors
   */
  private async calculateScoringFactors(
    client: any,
  ): Promise<LeadScoringFactors> {
    const factors: LeadScoringFactors = {
      // Demographic factors
      weddingDateProximity: this.calculateWeddingDateProximity(
        client.wedding_date,
      ),
      budgetMatch: this.calculateBudgetMatch(client.budget_range),
      profileCompleteness: this.calculateProfileCompleteness(client),
      locationMatch: this.calculateLocationMatch(client.venue_name),

      // Behavioral factors
      formCompletions: this.calculateFormCompletions(client.client_activities),
      emailEngagement: this.calculateEmailEngagement(client.client_activities),
      websiteActivity: this.calculateWebsiteActivity(client.client_activities),
      responseRate: this.calculateResponseRate(client.client_activities),

      // Engagement factors
      recentActivity: this.calculateRecentActivity(client.last_touch_date),
      communicationFrequency: this.calculateCommunicationFrequency(
        client.touch_count,
        client.created_at,
      ),
      initiatedContact: this.calculateInitiatedContact(
        client.client_activities,
      ),
      referralSource: this.calculateReferralSource(client.lead_sources),

      // Fit factors
      serviceAlignment: this.calculateServiceAlignment(client),
      pricePointMatch: this.calculatePricePointMatch(
        client.estimated_value,
        client.budget_range,
      ),
      previousExperience: this.calculatePreviousExperience(client),
      urgencyLevel: this.calculateUrgencyLevel(
        client.wedding_date,
        client.created_at,
      ),
    };

    return factors;
  }

  // Demographic scoring methods
  private calculateWeddingDateProximity(weddingDate: string | null): number {
    if (!weddingDate) return 0;

    const today = new Date();
    const wedding = new Date(weddingDate);
    const daysUntil = Math.ceil(
      (wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil < 0) return 2; // Past wedding
    if (daysUntil <= 90) return 10; // Within 3 months - highest urgency
    if (daysUntil <= 180) return 8; // 3-6 months
    if (daysUntil <= 365) return 6; // 6-12 months
    if (daysUntil <= 540) return 4; // 12-18 months
    return 2; // Over 18 months
  }

  private calculateBudgetMatch(budgetRange: string | null): number {
    if (!budgetRange) return 2;

    // This would ideally compare against your service pricing
    // For now, assume any stated budget is positive
    const budgetScores: Record<string, number> = {
      '£1000-2000': 4,
      '£2000-3000': 6,
      '£3000-5000': 8,
      '£5000+': 10,
      flexible: 7,
      to_discuss: 5,
    };

    return budgetScores[budgetRange] || 3;
  }

  private calculateProfileCompleteness(client: any): number {
    let completeness = 0;
    const fields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'wedding_date',
      'venue_name',
      'guest_count',
      'budget_range',
    ];

    fields.forEach((field) => {
      if (client[field]) completeness += 1;
    });

    return Math.round((completeness / fields.length) * 5);
  }

  private calculateLocationMatch(venueName: string | null): number {
    if (!venueName) return 1;

    // In a real implementation, you'd check venue location against your service areas
    // For now, any venue mentioned gets points
    return 4;
  }

  // Behavioral scoring methods
  private calculateFormCompletions(activities: any[]): number {
    if (!activities) return 0;

    const formActivities = activities.filter(
      (a) =>
        a.activity_type === 'form_completed' ||
        a.activity_type === 'questionnaire_submitted',
    );

    return Math.min(formActivities.length * 3, 8);
  }

  private calculateEmailEngagement(activities: any[]): number {
    if (!activities) return 0;

    const emailActivities = activities.filter(
      (a) =>
        a.activity_type === 'email_opened' ||
        a.activity_type === 'email_clicked' ||
        a.activity_type === 'email_replied',
    );

    let score = 0;
    emailActivities.forEach((activity) => {
      if (activity.activity_type === 'email_opened') score += 1;
      if (activity.activity_type === 'email_clicked') score += 2;
      if (activity.activity_type === 'email_replied') score += 3;
    });

    return Math.min(score, 7);
  }

  private calculateWebsiteActivity(activities: any[]): number {
    if (!activities) return 0;

    const webActivities = activities.filter(
      (a) =>
        a.activity_type === 'website_visit' ||
        a.activity_type === 'portfolio_viewed' ||
        a.activity_type === 'pricing_viewed',
    );

    return Math.min(webActivities.length * 2, 6);
  }

  private calculateResponseRate(activities: any[]): number {
    if (!activities) return 0;

    const outboundMessages = activities.filter(
      (a) =>
        a.activity_type === 'email_sent' || a.activity_type === 'message_sent',
    );

    const responses = activities.filter(
      (a) =>
        a.activity_type === 'email_replied' ||
        a.activity_type === 'message_replied',
    );

    if (outboundMessages.length === 0) return 2;

    const responseRate = responses.length / outboundMessages.length;
    return Math.round(responseRate * 4);
  }

  // Engagement scoring methods
  private calculateRecentActivity(lastTouchDate: string | null): number {
    if (!lastTouchDate) return 0;

    const daysSinceTouch = Math.floor(
      (new Date().getTime() - new Date(lastTouchDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysSinceTouch <= 1) return 8;
    if (daysSinceTouch <= 3) return 6;
    if (daysSinceTouch <= 7) return 4;
    if (daysSinceTouch <= 14) return 2;
    return 0;
  }

  private calculateCommunicationFrequency(
    touchCount: number,
    createdAt: string,
  ): number {
    if (!touchCount || !createdAt) return 0;

    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysSinceCreated === 0) return touchCount > 0 ? 5 : 0;

    const frequency = touchCount / Math.max(daysSinceCreated, 1);

    if (frequency >= 0.5) return 7; // More than every 2 days
    if (frequency >= 0.2) return 5; // More than every 5 days
    if (frequency >= 0.1) return 3; // More than every 10 days
    return 1;
  }

  private calculateInitiatedContact(activities: any[]): number {
    if (!activities) return 0;

    const initiatedActivities = activities.filter(
      (a) =>
        a.activity_type === 'client_called' ||
        a.activity_type === 'client_emailed' ||
        a.activity_type === 'inquiry_submitted',
    );

    return Math.min(initiatedActivities.length * 2, 5);
  }

  private calculateReferralSource(leadSource: any): number {
    if (!leadSource) return 2;

    const sourceScores: Record<string, number> = {
      referral: 8,
      past_client: 7,
      vendor_referral: 6,
      website: 5,
      social_media: 4,
      advertising: 3,
      directory: 2,
      unknown: 1,
    };

    return sourceScores[leadSource.source_category] || 2;
  }

  // Fit scoring methods
  private calculateServiceAlignment(client: any): number {
    // This would analyze how well the client's needs match your services
    // For now, assume moderate alignment
    let score = 4;

    // Add points for specific indicators
    if (client.notes && client.notes.toLowerCase().includes('photography'))
      score += 2;
    if (client.package_name) score += 2;

    return Math.min(score, 6);
  }

  private calculatePricePointMatch(
    estimatedValue: number | null,
    budgetRange: string | null,
  ): number {
    if (!budgetRange) return 2;

    // Compare estimated value with budget range
    if (!estimatedValue) return 3;

    // This would ideally compare against your actual pricing
    if (estimatedValue >= 2000) return 6;
    if (estimatedValue >= 1000) return 4;
    return 2;
  }

  private calculatePreviousExperience(client: any): number {
    // Check if they mention working with similar vendors before
    let score = 3; // Default neutral

    if (client.notes) {
      const notes = client.notes.toLowerCase();
      if (notes.includes('first time') || notes.includes('never worked'))
        score = 2;
      if (notes.includes('previous') || notes.includes('worked with'))
        score = 5;
    }

    return score;
  }

  private calculateUrgencyLevel(
    weddingDate: string | null,
    createdAt: string,
  ): number {
    if (!weddingDate) return 2;

    const wedding = new Date(weddingDate);
    const created = new Date(createdAt);
    const planningTime = Math.ceil(
      (wedding.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (planningTime <= 90) return 8; // Very urgent
    if (planningTime <= 180) return 6; // Urgent
    if (planningTime <= 365) return 4; // Moderate
    return 2; // Low urgency
  }

  // Component calculation
  private calculateComponents(factors: LeadScoringFactors) {
    return {
      demographic:
        factors.weddingDateProximity +
        factors.budgetMatch +
        factors.profileCompleteness +
        factors.locationMatch,
      behavioral:
        factors.formCompletions +
        factors.emailEngagement +
        factors.websiteActivity +
        factors.responseRate,
      engagement:
        factors.recentActivity +
        factors.communicationFrequency +
        factors.initiatedContact +
        factors.referralSource,
      fit:
        factors.serviceAlignment +
        factors.pricePointMatch +
        factors.previousExperience +
        factors.urgencyLevel,
    };
  }

  private calculateTotalScore(components: {
    demographic: number;
    behavioral: number;
    engagement: number;
    fit: number;
  }): number {
    return Math.min(
      components.demographic +
        components.behavioral +
        components.engagement +
        components.fit,
      100,
    );
  }

  private calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private determineQualificationStatus(
    score: number,
    factors: LeadScoringFactors,
  ): 'qualified' | 'unqualified' | 'needs_review' {
    if (score >= 70) return 'qualified';
    if (
      score >= 50 &&
      (factors.budgetMatch >= 6 || factors.weddingDateProximity >= 6)
    )
      return 'needs_review';
    return 'unqualified';
  }

  private async calculateScoreTrend(
    clientId: string,
    currentScore: number,
  ): Promise<'up' | 'down' | 'stable' | 'new'> {
    const { data: previousScore } = await this.supabase
      .from('lead_scores')
      .select('total_score')
      .eq('client_id', clientId)
      .single();

    if (!previousScore) return 'new';

    const difference = currentScore - previousScore.total_score;
    if (Math.abs(difference) < 5) return 'stable';
    return difference > 0 ? 'up' : 'down';
  }

  private async saveLeadScore(leadScore: LeadScore): Promise<void> {
    const { error } = await this.supabase.from('lead_scores').upsert({
      client_id: leadScore.clientId,
      organization_id: this.organizationId,
      total_score: leadScore.totalScore,
      score_grade: leadScore.grade,
      demographic_score: leadScore.components.demographic,
      behavioral_score: leadScore.components.behavioral,
      engagement_score: leadScore.components.engagement,
      fit_score: leadScore.components.fit,
      scoring_factors: leadScore.factors,
      is_qualified_lead: leadScore.qualificationStatus === 'qualified',
      qualification_date:
        leadScore.qualificationStatus === 'qualified' ? new Date() : null,
      score_trend: leadScore.scoreTrend,
      last_calculated_at: leadScore.lastCalculated,
      updated_at: new Date(),
    });

    if (error) {
      console.error('Error saving lead score:', error);
      throw error;
    }

    // Update the client record with the new score
    await this.supabase
      .from('clients')
      .update({
        lead_score: leadScore.totalScore,
        lead_grade: leadScore.grade,
        qualification_status: leadScore.qualificationStatus,
        updated_at: new Date(),
      })
      .eq('id', leadScore.clientId);
  }

  /**
   * Batch calculate scores for multiple leads
   */
  async batchCalculateScores(clientIds: string[]): Promise<LeadScore[]> {
    const results: LeadScore[] = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 5;
    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);
      const batchPromises = batch.map((clientId) =>
        this.calculateLeadScore(clientId),
      );
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get recommended actions based on lead score
   */
  getRecommendedActions(leadScore: LeadScore): string[] {
    const actions: string[] = [];

    if (leadScore.grade === 'A+' || leadScore.grade === 'A') {
      actions.push('Schedule immediate consultation call');
      actions.push('Send premium package information');
      actions.push('Prioritize in follow-up queue');
    } else if (leadScore.grade === 'B') {
      actions.push('Send detailed portfolio');
      actions.push('Schedule discovery call');
      actions.push('Add to weekly follow-up sequence');
    } else if (leadScore.grade === 'C') {
      actions.push('Send educational content');
      actions.push('Add to nurture email sequence');
      actions.push('Check in monthly');
    } else {
      actions.push('Add to long-term nurture campaign');
      actions.push('Monitor for engagement changes');
    }

    // Add specific actions based on weak areas
    if (leadScore.components.behavioral < 10) {
      actions.push('Encourage form completion with incentive');
    }

    if (leadScore.components.engagement < 10) {
      actions.push('Increase communication frequency');
    }

    if (leadScore.factors.budgetMatch < 5) {
      actions.push('Clarify budget expectations');
    }

    return actions;
  }
}
