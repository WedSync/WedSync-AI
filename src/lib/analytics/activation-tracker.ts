import { createClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface ActivationFunnel {
  stages: FunnelStage[];
  overallConversion: number;
  timeToActivation: number; // Average days
  dropoffAnalysis: DropoffPoint[];
}

export interface FunnelStage {
  name: string;
  description: string;
  users: number;
  conversionRate: number;
  avgTimeToReach: number; // Hours from signup
  dropoffRate: number;
}

export interface DropoffPoint {
  stageName: string;
  dropoffUsers: number;
  dropoffRate: number;
  mainReasons: string[];
  recommendations: string[];
}

export interface CohortActivationData {
  cohortDate: string;
  totalSignups: number;
  activationRate: number;
  stageBreakdown: FunnelStage[];
  avgTimeToActivation: number;
}

export interface ActivationEvent {
  userId: string;
  userType: 'supplier' | 'couple';
  eventName: string;
  eventData?: Record<string, any>;
  sessionId?: string;
}

export class ActivationTracker {
  private supabase = createClient();

  private readonly ACTIVATION_CRITERIA = {
    supplier: {
      requiredActions: [
        'email_verified',
        'profile_completed',
        'form_created',
        'client_added',
        'journey_started',
      ],
      minActions: 3,
      timeframe: 7, // days
    },
    couple: {
      requiredActions: [
        'email_verified',
        'wedding_date_set',
        'venue_added',
        'guest_list_started',
      ],
      minActions: 3,
      timeframe: 14, // days
    },
  };

  /**
   * Calculate activation funnel for a specific user type and time period
   */
  async calculateActivationFunnel(
    userType: 'supplier' | 'couple',
    period: { start: Date; end: Date },
  ): Promise<ActivationFunnel> {
    try {
      const { data: userData, error } = await this.supabase.rpc(
        'calculate_activation_funnel',
        {
          user_type_param: userType,
          start_date_param: period.start.toISOString(),
          end_date_param: period.end.toISOString(),
        },
      );

      if (error) {
        console.error('Error calculating activation funnel:', error);
        throw new Error(
          `Failed to calculate activation funnel: ${error.message}`,
        );
      }

      if (!userData || userData.length === 0) {
        return {
          stages: [],
          overallConversion: 0,
          timeToActivation: 0,
          dropoffAnalysis: [],
        };
      }

      const stages: FunnelStage[] = userData.map((stage: any) => ({
        name: stage.stage_name,
        description: stage.description,
        users: parseInt(stage.user_count) || 0,
        conversionRate: parseFloat(stage.conversion_rate) || 0,
        avgTimeToReach: parseFloat(stage.avg_hours_to_reach) || 0,
        dropoffRate: 100 - (parseFloat(stage.conversion_rate) || 0),
      }));

      const overallConversion =
        stages.length > 0 ? stages[stages.length - 1].conversionRate : 0;

      const timeToActivation =
        stages.length > 0
          ? stages[stages.length - 1].avgTimeToReach / 24 // Convert hours to days
          : 0;

      const dropoffAnalysis = await this.analyzeDropoffs(userType, period);

      return {
        stages,
        overallConversion,
        timeToActivation,
        dropoffAnalysis,
      };
    } catch (error) {
      console.error('Error in calculateActivationFunnel:', error);
      throw error;
    }
  }

  /**
   * Track a user activation event
   */
  async trackActivationEvent(
    userId: string,
    eventName: string,
    eventData?: Record<string, any>,
  ): Promise<void> {
    try {
      // Get user type first
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single();

      if (!userProfile) {
        throw new Error(`User profile not found for user ${userId}`);
      }

      // Insert activation event
      const { error } = await this.supabase
        .from('user_activation_events')
        .insert({
          user_id: userId,
          user_type: userProfile.user_type,
          event_name: eventName,
          event_data: eventData || {},
          session_id: this.getSessionId(),
        });

      if (error) {
        console.error('Error tracking activation event:', error);
        throw new Error(`Failed to track activation event: ${error.message}`);
      }

      // Check if user has reached activation
      await this.checkActivationStatus(userId);
    } catch (error) {
      console.error('Error in trackActivationEvent:', error);
      throw error;
    }
  }

  /**
   * Check if a user has reached activation criteria and update their status
   */
  private async checkActivationStatus(userId: string): Promise<boolean> {
    try {
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single();

      if (!user) return false;

      const criteria =
        this.ACTIVATION_CRITERIA[
          user.user_type as keyof typeof this.ACTIVATION_CRITERIA
        ];

      // Get user's activation events within the timeframe
      const { data: events } = await this.supabase
        .from('user_activation_events')
        .select('event_name, created_at')
        .eq('user_id', userId)
        .gte(
          'created_at',
          new Date(
            Date.now() - criteria.timeframe * 24 * 60 * 60 * 1000,
          ).toISOString(),
        );

      if (!events) return false;

      const completedEvents = new Set(events.map((e) => e.event_name));
      const requiredCount = criteria.requiredActions.filter((action) =>
        completedEvents.has(action),
      ).length;

      const isActivated = requiredCount >= criteria.minActions;

      if (isActivated) {
        // Update user's activated_at timestamp
        const { error } = await this.supabase
          .from('users')
          .update({ activated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) {
          console.error('Error updating user activation status:', error);
        }
      }

      return isActivated;
    } catch (error) {
      console.error('Error in checkActivationStatus:', error);
      return false;
    }
  }

  /**
   * Analyze dropoff points in the activation funnel
   */
  private async analyzeDropoffs(
    userType: 'supplier' | 'couple',
    period: { start: Date; end: Date },
  ): Promise<DropoffPoint[]> {
    try {
      // Get funnel stages
      const { data: stages } = await this.supabase
        .from('activation_stages')
        .select('*')
        .eq('user_type', userType)
        .order('stage_order');

      if (!stages) return [];

      const dropoffPoints: DropoffPoint[] = [];

      for (let i = 0; i < stages.length - 1; i++) {
        const currentStage = stages[i];
        const nextStage = stages[i + 1];

        // Calculate users who completed current stage but not next
        const { data: currentStageUsers } = await this.supabase
          .from('user_activation_events')
          .select('user_id')
          .eq('user_type', userType)
          .in('event_name', currentStage.required_events)
          .gte('created_at', period.start.toISOString())
          .lte('created_at', period.end.toISOString());

        const { data: nextStageUsers } = await this.supabase
          .from('user_activation_events')
          .select('user_id')
          .eq('user_type', userType)
          .in('event_name', nextStage.required_events)
          .gte('created_at', period.start.toISOString())
          .lte('created_at', period.end.toISOString());

        const currentUserIds = new Set(
          currentStageUsers?.map((u) => u.user_id) || [],
        );
        const nextUserIds = new Set(
          nextStageUsers?.map((u) => u.user_id) || [],
        );

        const dropoffUsers =
          currentUserIds.size -
          [...currentUserIds].filter((id) => nextUserIds.has(id)).length;
        const dropoffRate =
          currentUserIds.size > 0
            ? (dropoffUsers / currentUserIds.size) * 100
            : 0;

        dropoffPoints.push({
          stageName: `${currentStage.stage_name} → ${nextStage.stage_name}`,
          dropoffUsers,
          dropoffRate,
          mainReasons: this.getDropoffReasons(
            currentStage.stage_name,
            nextStage.stage_name,
          ),
          recommendations: this.getDropoffRecommendations(
            currentStage.stage_name,
            nextStage.stage_name,
          ),
        });
      }

      return dropoffPoints;
    } catch (error) {
      console.error('Error analyzing dropoffs:', error);
      return [];
    }
  }

  /**
   * Get cohort activation data for analysis
   */
  async getCohortActivationData(
    cohortDate: string,
    userType: 'supplier' | 'couple',
  ): Promise<CohortActivationData> {
    try {
      const startDate = new Date(cohortDate);
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Next day

      const funnel = await this.calculateActivationFunnel(userType, {
        start: startDate,
        end: endDate,
      });

      // Get total signups for the cohort
      const { count: totalSignups } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());

      return {
        cohortDate,
        totalSignups: totalSignups || 0,
        activationRate: funnel.overallConversion,
        stageBreakdown: funnel.stages,
        avgTimeToActivation: funnel.timeToActivation,
      };
    } catch (error) {
      console.error('Error getting cohort activation data:', error);
      throw error;
    }
  }

  /**
   * Get activation metrics for both user types
   */
  async getActivationMetrics(period: { start: Date; end: Date }) {
    try {
      const [supplierFunnel, coupleFunnel] = await Promise.all([
        this.calculateActivationFunnel('supplier', period),
        this.calculateActivationFunnel('couple', period),
      ]);

      // Get overall metrics from the database view
      const { data: metrics } = await this.supabase
        .from('activation_metrics')
        .select('*');

      return {
        funnel: {
          stages: [...supplierFunnel.stages, ...coupleFunnel.stages],
          overallConversion:
            (supplierFunnel.overallConversion +
              coupleFunnel.overallConversion) /
            2,
          timeToActivation:
            (supplierFunnel.timeToActivation + coupleFunnel.timeToActivation) /
            2,
          dropoffAnalysis: [
            ...supplierFunnel.dropoffAnalysis,
            ...coupleFunnel.dropoffAnalysis,
          ],
        },
        byUserType: {
          supplier: supplierFunnel,
          couple: coupleFunnel,
        },
        metrics: metrics || [],
      };
    } catch (error) {
      console.error('Error getting activation metrics:', error);
      throw error;
    }
  }

  /**
   * Get potential reasons for dropoffs between stages
   */
  private getDropoffReasons(currentStage: string, nextStage: string): string[] {
    const reasonsMap: Record<string, string[]> = {
      'Email Verification → Profile Completion': [
        'Complex profile setup process',
        'Too many required fields',
        'Unclear value proposition',
      ],
      'Profile Completion → First Form Created': [
        'Form builder complexity',
        'Lack of templates',
        'Missing tutorial guidance',
      ],
      'First Form Created → Client Addition': [
        'No existing clients to import',
        'Complex client management interface',
        'Missing integration with existing tools',
      ],
      'Client Addition → Journey Activation': [
        'Journey builder complexity',
        'Unclear automation benefits',
        'Missing use case examples',
      ],
      'Wedding Date Set → Venue Added': [
        'Venue search difficulties',
        'Limited venue database',
        'Complex venue management interface',
      ],
      'Venue Added → Guest List Started': [
        'Guest list import complexity',
        'Missing contact integration',
        'Overwhelming guest management features',
      ],
    };

    return reasonsMap[`${currentStage} → ${nextStage}`] || ['Unknown reasons'];
  }

  /**
   * Get recommendations to improve conversion between stages
   */
  private getDropoffRecommendations(
    currentStage: string,
    nextStage: string,
  ): string[] {
    const recommendationsMap: Record<string, string[]> = {
      'Email Verification → Profile Completion': [
        'Simplify profile setup with progressive disclosure',
        'Add onboarding wizard with clear steps',
        'Show value proposition during setup',
      ],
      'Profile Completion → First Form Created': [
        'Add form templates for common use cases',
        'Create interactive form builder tutorial',
        'Show successful form examples',
      ],
      'First Form Created → Client Addition': [
        'Offer CSV import for existing clients',
        'Simplify client addition process',
        'Integrate with popular CRM tools',
      ],
      'Client Addition → Journey Activation': [
        'Create journey templates for common workflows',
        'Add automation benefits calculator',
        'Show case studies and success stories',
      ],
      'Wedding Date Set → Venue Added': [
        'Improve venue search and filtering',
        'Add venue recommendation engine',
        'Simplify venue addition process',
      ],
      'Venue Added → Guest List Started': [
        'Add contact import from popular platforms',
        'Create guest list templates',
        'Simplify guest management interface',
      ],
    };

    return (
      recommendationsMap[`${currentStage} → ${nextStage}`] || [
        'Focus on user experience improvements',
      ]
    );
  }

  /**
   * Get or generate a session ID for tracking
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('activation_session_id');
      if (!sessionId) {
        sessionId = uuidv4();
        sessionStorage.setItem('activation_session_id', sessionId);
      }
      return sessionId;
    }
    return uuidv4(); // Fallback for server-side
  }
}

// Export singleton instance
export const activationTracker = new ActivationTracker();
