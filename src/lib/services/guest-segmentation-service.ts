import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Guest Segmentation Service
 * Query and filter guest lists efficiently for targeted communications
 */

export interface GuestSegment {
  id: string;
  couple_id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  guest_count: number;
  last_updated: Date;
  created_at: Date;
  is_dynamic: boolean; // If true, recalculates automatically
}

export interface SegmentCriteria {
  // Basic demographic filters
  age_range?: { min?: number; max?: number };
  location?: {
    country?: string[];
    state?: string[];
    city?: string[];
    postal_code?: string[];
  };

  // Relationship filters
  relationship_to_couple?: string[];
  plus_one_status?: 'has_plus_one' | 'no_plus_one' | 'any';

  // RSVP and attendance filters
  rsvp_status?: 'accepted' | 'declined' | 'pending' | 'no_response';
  attendance_type?: 'ceremony_only' | 'reception_only' | 'both' | 'any';

  // Dietary and accessibility
  dietary_restrictions?: string[];
  accessibility_needs?: string[];

  // Household filters
  household_size?: { min?: number; max?: number };
  has_children?: boolean;

  // Communication preferences
  preferred_communication?: 'email' | 'sms' | 'both';
  unsubscribed?: boolean;

  // Engagement filters
  communication_engagement?: {
    email_open_rate?: { min?: number; max?: number };
    sms_response_rate?: { min?: number; max?: number };
    last_interaction_days?: number;
  };

  // Custom fields
  custom_fields?: {
    [field_name: string]: any;
  };

  // Tags and categories
  tags?: string[];
  vip_status?: boolean;

  // Date-based filters
  invited_after?: Date;
  invited_before?: Date;
  last_contacted?: {
    after?: Date;
    before?: Date;
  };
}

export interface GuestProfile {
  id: string;
  couple_id: string;
  household_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  age?: number;
  relationship_to_couple?: string;
  plus_one_name?: string;
  rsvp_status?: string;
  attendance_type?: string;
  dietary_restrictions?: string[];
  accessibility_needs?: string[];
  communication_preferences?: any;
  custom_fields?: any;
  tags?: string[];
  vip_status?: boolean;
  location?: {
    country?: string;
    state?: string;
    city?: string;
    postal_code?: string;
    address?: string;
  };
  engagement_metrics?: {
    email_opens: number;
    email_clicks: number;
    sms_responses: number;
    last_interaction: Date;
    engagement_score: number;
  };
  household_info?: {
    name: string;
    total_members: number;
    adults: number;
    children: number;
  };
}

export class GuestSegmentationService {
  private static instance: GuestSegmentationService;

  static getInstance(): GuestSegmentationService {
    if (!GuestSegmentationService.instance) {
      GuestSegmentationService.instance = new GuestSegmentationService();
    }
    return GuestSegmentationService.instance;
  }

  /**
   * Create a new guest segment
   */
  async createSegment(
    segment: Omit<
      GuestSegment,
      'id' | 'guest_count' | 'last_updated' | 'created_at'
    >,
  ): Promise<GuestSegment> {
    try {
      // Calculate initial guest count
      const guests = await this.getGuestsBySegmentCriteria(
        segment.couple_id,
        segment.criteria,
      );

      const { data, error } = await supabase
        .from('guest_segments')
        .insert({
          couple_id: segment.couple_id,
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          guest_count: guests.length,
          is_dynamic: segment.is_dynamic,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        couple_id: data.couple_id,
        name: data.name,
        description: data.description,
        criteria: data.criteria,
        guest_count: data.guest_count,
        is_dynamic: data.is_dynamic,
        last_updated: new Date(data.last_updated),
        created_at: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Error creating guest segment:', error);
      throw error;
    }
  }

  /**
   * Get guests by segment criteria
   */
  async getGuestsBySegmentCriteria(
    coupleId: string,
    criteria: SegmentCriteria,
  ): Promise<GuestProfile[]> {
    try {
      // Build complex query based on criteria
      let query = supabase
        .from('guests')
        .select(
          `
          *,
          households (
            name,
            total_members,
            adults,
            children,
            address
          ),
          guest_rsvp_status (
            status,
            attendance_type
          ),
          guest_communication_preferences (
            email_unsubscribed,
            sms_unsubscribed,
            preferred_method
          ),
          guest_dietary_requirements (
            requirements,
            allergies,
            notes
          )
        `,
        )
        .eq('couple_id', coupleId);

      const { data: guestsData, error } = await query;
      if (error) throw error;

      if (!guestsData) return [];

      // Filter guests based on criteria
      let filteredGuests = guestsData;

      // Apply age range filter
      if (criteria.age_range) {
        filteredGuests = filteredGuests.filter((guest) => {
          if (!guest.age) return false;
          if (criteria.age_range!.min && guest.age < criteria.age_range!.min)
            return false;
          if (criteria.age_range!.max && guest.age > criteria.age_range!.max)
            return false;
          return true;
        });
      }

      // Apply location filter
      if (criteria.location) {
        filteredGuests = filteredGuests.filter((guest) => {
          const address = guest.households?.address || {};

          if (
            criteria.location!.country &&
            !criteria.location!.country.includes(address.country)
          )
            return false;
          if (
            criteria.location!.state &&
            !criteria.location!.state.includes(address.state)
          )
            return false;
          if (
            criteria.location!.city &&
            !criteria.location!.city.includes(address.city)
          )
            return false;
          if (
            criteria.location!.postal_code &&
            !criteria.location!.postal_code.includes(address.postal_code)
          )
            return false;

          return true;
        });
      }

      // Apply relationship filter
      if (criteria.relationship_to_couple) {
        filteredGuests = filteredGuests.filter((guest) =>
          criteria.relationship_to_couple!.includes(
            guest.relationship_to_couple || '',
          ),
        );
      }

      // Apply RSVP status filter
      if (criteria.rsvp_status) {
        filteredGuests = filteredGuests.filter((guest) => {
          const rsvpStatus = guest.guest_rsvp_status?.[0]?.status;
          return rsvpStatus === criteria.rsvp_status;
        });
      }

      // Apply attendance type filter
      if (criteria.attendance_type && criteria.attendance_type !== 'any') {
        filteredGuests = filteredGuests.filter((guest) => {
          const attendanceType = guest.guest_rsvp_status?.[0]?.attendance_type;
          return attendanceType === criteria.attendance_type;
        });
      }

      // Apply dietary restrictions filter
      if (
        criteria.dietary_restrictions &&
        criteria.dietary_restrictions.length > 0
      ) {
        filteredGuests = filteredGuests.filter((guest) => {
          const dietaryReqs =
            guest.guest_dietary_requirements?.[0]?.requirements || [];
          return criteria.dietary_restrictions!.some((req) =>
            dietaryReqs.includes(req),
          );
        });
      }

      // Apply plus one status filter
      if (criteria.plus_one_status && criteria.plus_one_status !== 'any') {
        filteredGuests = filteredGuests.filter((guest) => {
          const hasPlus = !!guest.plus_one_name;
          return (
            (criteria.plus_one_status === 'has_plus_one' && hasPlus) ||
            (criteria.plus_one_status === 'no_plus_one' && !hasPlus)
          );
        });
      }

      // Apply household size filter
      if (criteria.household_size) {
        filteredGuests = filteredGuests.filter((guest) => {
          const householdSize = guest.households?.total_members || 1;
          if (
            criteria.household_size!.min &&
            householdSize < criteria.household_size!.min
          )
            return false;
          if (
            criteria.household_size!.max &&
            householdSize > criteria.household_size!.max
          )
            return false;
          return true;
        });
      }

      // Apply children filter
      if (criteria.has_children !== undefined) {
        filteredGuests = filteredGuests.filter((guest) => {
          const hasChildren = (guest.households?.children || 0) > 0;
          return hasChildren === criteria.has_children;
        });
      }

      // Apply communication preferences filter
      if (criteria.preferred_communication) {
        filteredGuests = filteredGuests.filter((guest) => {
          const prefs = guest.guest_communication_preferences?.[0];
          if (!prefs) return true; // Include if no preferences set

          if (criteria.preferred_communication === 'email') {
            return !prefs.email_unsubscribed && guest.email;
          } else if (criteria.preferred_communication === 'sms') {
            return !prefs.sms_unsubscribed && guest.phone;
          } else if (criteria.preferred_communication === 'both') {
            return (
              !prefs.email_unsubscribed &&
              guest.email &&
              !prefs.sms_unsubscribed &&
              guest.phone
            );
          }

          return true;
        });
      }

      // Apply unsubscribed filter
      if (criteria.unsubscribed !== undefined) {
        filteredGuests = filteredGuests.filter((guest) => {
          const prefs = guest.guest_communication_preferences?.[0];
          const isUnsubscribed =
            prefs?.email_unsubscribed || prefs?.sms_unsubscribed || false;
          return isUnsubscribed === criteria.unsubscribed;
        });
      }

      // Apply VIP status filter
      if (criteria.vip_status !== undefined) {
        filteredGuests = filteredGuests.filter(
          (guest) => (guest.vip_status || false) === criteria.vip_status,
        );
      }

      // Apply tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        filteredGuests = filteredGuests.filter((guest) => {
          const guestTags = guest.tags || [];
          return criteria.tags!.some((tag) => guestTags.includes(tag));
        });
      }

      // Get engagement metrics for remaining guests
      const guestIds = filteredGuests.map((g) => g.id);
      const engagementMetrics = await this.getEngagementMetrics(guestIds);

      // Apply engagement filters
      if (criteria.communication_engagement) {
        const engagement = criteria.communication_engagement;

        filteredGuests = filteredGuests.filter((guest) => {
          const metrics = engagementMetrics.get(guest.id);
          if (!metrics) return false;

          if (engagement.email_open_rate) {
            const openRate =
              metrics.total_emails > 0
                ? (metrics.email_opens / metrics.total_emails) * 100
                : 0;
            if (
              engagement.email_open_rate.min &&
              openRate < engagement.email_open_rate.min
            )
              return false;
            if (
              engagement.email_open_rate.max &&
              openRate > engagement.email_open_rate.max
            )
              return false;
          }

          if (engagement.sms_response_rate) {
            const responseRate =
              metrics.total_sms > 0
                ? (metrics.sms_responses / metrics.total_sms) * 100
                : 0;
            if (
              engagement.sms_response_rate.min &&
              responseRate < engagement.sms_response_rate.min
            )
              return false;
            if (
              engagement.sms_response_rate.max &&
              responseRate > engagement.sms_response_rate.max
            )
              return false;
          }

          if (engagement.last_interaction_days) {
            const daysSince = metrics.last_interaction
              ? Math.floor(
                  (Date.now() - metrics.last_interaction.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 999;
            if (daysSince > engagement.last_interaction_days) return false;
          }

          return true;
        });
      }

      // Convert to GuestProfile format
      return filteredGuests.map((guest) =>
        this.convertToGuestProfile(guest, engagementMetrics.get(guest.id)),
      );
    } catch (error) {
      console.error('Error getting guests by criteria:', error);
      throw error;
    }
  }

  /**
   * Get engagement metrics for guests
   */
  private async getEngagementMetrics(
    guestIds: string[],
  ): Promise<Map<string, any>> {
    if (guestIds.length === 0) return new Map();

    try {
      const { data: events, error } = await supabase
        .from('communication_events')
        .select('guest_id, event_type, communication_type, timestamp')
        .in('guest_id', guestIds)
        .not('guest_id', 'is', null);

      if (error) throw error;

      const metricsMap = new Map<string, any>();

      // Initialize metrics for all guests
      guestIds.forEach((id) => {
        metricsMap.set(id, {
          email_opens: 0,
          email_clicks: 0,
          sms_responses: 0,
          total_emails: 0,
          total_sms: 0,
          last_interaction: null,
          engagement_score: 0,
        });
      });

      // Process events
      events?.forEach((event) => {
        const metrics = metricsMap.get(event.guest_id);
        if (!metrics) return;

        const eventDate = new Date(event.timestamp);

        if (!metrics.last_interaction || eventDate > metrics.last_interaction) {
          metrics.last_interaction = eventDate;
        }

        switch (event.event_type) {
          case 'sent':
            if (event.communication_type === 'email') {
              metrics.total_emails++;
            } else if (event.communication_type === 'sms') {
              metrics.total_sms++;
            }
            break;
          case 'opened':
            metrics.email_opens++;
            metrics.engagement_score += 1;
            break;
          case 'clicked':
            metrics.email_clicks++;
            metrics.engagement_score += 2;
            break;
          case 'received': // SMS response
            metrics.sms_responses++;
            metrics.engagement_score += 3;
            break;
          case 'read': // SMS read receipt
            metrics.engagement_score += 1;
            break;
        }
      });

      return metricsMap;
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      return new Map();
    }
  }

  /**
   * Convert database guest to GuestProfile
   */
  private convertToGuestProfile(
    guest: any,
    engagementMetrics?: any,
  ): GuestProfile {
    return {
      id: guest.id,
      couple_id: guest.couple_id,
      household_id: guest.household_id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone,
      age: guest.age,
      relationship_to_couple: guest.relationship_to_couple,
      plus_one_name: guest.plus_one_name,
      rsvp_status: guest.guest_rsvp_status?.[0]?.status,
      attendance_type: guest.guest_rsvp_status?.[0]?.attendance_type,
      dietary_restrictions:
        guest.guest_dietary_requirements?.[0]?.requirements || [],
      accessibility_needs: guest.accessibility_needs || [],
      communication_preferences: guest.guest_communication_preferences?.[0],
      custom_fields: guest.custom_fields || {},
      tags: guest.tags || [],
      vip_status: guest.vip_status || false,
      location: guest.households?.address
        ? {
            country: guest.households.address.country,
            state: guest.households.address.state,
            city: guest.households.address.city,
            postal_code: guest.households.address.postal_code,
            address: guest.households.address.full_address,
          }
        : undefined,
      engagement_metrics: engagementMetrics,
      household_info: guest.households
        ? {
            name: guest.households.name,
            total_members: guest.households.total_members,
            adults: guest.households.adults,
            children: guest.households.children,
          }
        : undefined,
    };
  }

  /**
   * Get all segments for a couple
   */
  async getSegments(coupleId: string): Promise<GuestSegment[]> {
    try {
      const { data: segments, error } = await supabase
        .from('guest_segments')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (
        segments?.map((segment) => ({
          id: segment.id,
          couple_id: segment.couple_id,
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          guest_count: segment.guest_count,
          is_dynamic: segment.is_dynamic,
          last_updated: new Date(segment.last_updated),
          created_at: new Date(segment.created_at),
        })) || []
      );
    } catch (error) {
      console.error('Error getting segments:', error);
      throw error;
    }
  }

  /**
   * Update segment guest count (for dynamic segments)
   */
  async updateSegmentCount(segmentId: string): Promise<void> {
    try {
      // Get segment
      const { data: segment, error: segmentError } = await supabase
        .from('guest_segments')
        .select('*')
        .eq('id', segmentId)
        .single();

      if (segmentError || !segment) throw segmentError;

      // Recalculate guest count
      const guests = await this.getGuestsBySegmentCriteria(
        segment.couple_id,
        segment.criteria,
      );

      // Update count
      const { error: updateError } = await supabase
        .from('guest_segments')
        .update({
          guest_count: guests.length,
          last_updated: new Date().toISOString(),
        })
        .eq('id', segmentId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating segment count:', error);
      throw error;
    }
  }

  /**
   * Get guests for a specific segment
   */
  async getGuestsForSegment(segmentId: string): Promise<GuestProfile[]> {
    try {
      const { data: segment, error } = await supabase
        .from('guest_segments')
        .select('*')
        .eq('id', segmentId)
        .single();

      if (error || !segment) throw error;

      return await this.getGuestsBySegmentCriteria(
        segment.couple_id,
        segment.criteria,
      );
    } catch (error) {
      console.error('Error getting guests for segment:', error);
      throw error;
    }
  }

  /**
   * Create predefined segments for common use cases
   */
  async createPredefinedSegments(coupleId: string): Promise<GuestSegment[]> {
    const predefinedSegments = [
      {
        name: 'Family Members',
        description: 'Close family members of the couple',
        criteria: {
          relationship_to_couple: ['parent', 'sibling', 'grandparent', 'child'],
        },
        is_dynamic: true,
      },
      {
        name: 'Wedding Party',
        description: 'Bridesmaids, groomsmen, and other wedding party members',
        criteria: {
          tags: [
            'wedding_party',
            'bridesmaid',
            'groomsman',
            'best_man',
            'maid_of_honor',
          ],
        },
        is_dynamic: true,
      },
      {
        name: 'Confirmed Attendees',
        description: 'Guests who have confirmed their attendance',
        criteria: {
          rsvp_status: 'accepted',
        },
        is_dynamic: true,
      },
      {
        name: 'Pending RSVPs',
        description: 'Guests who have not yet responded',
        criteria: {
          rsvp_status: 'pending',
        },
        is_dynamic: true,
      },
      {
        name: 'Out of Town Guests',
        description: 'Guests from different cities/states',
        criteria: {
          tags: ['out_of_town'],
        },
        is_dynamic: true,
      },
      {
        name: 'VIP Guests',
        description: 'VIP guests requiring special attention',
        criteria: {
          vip_status: true,
        },
        is_dynamic: true,
      },
      {
        name: 'Children & Families',
        description: 'Households with children',
        criteria: {
          has_children: true,
        },
        is_dynamic: true,
      },
    ];

    const createdSegments = [];
    for (const segmentData of predefinedSegments) {
      try {
        const segment = await this.createSegment({
          couple_id: coupleId,
          ...segmentData,
        });
        createdSegments.push(segment);
      } catch (error) {
        console.error(
          `Error creating predefined segment ${segmentData.name}:`,
          error,
        );
      }
    }

    return createdSegments;
  }

  /**
   * Get segment analytics
   */
  async getSegmentAnalytics(coupleId: string): Promise<{
    total_segments: number;
    total_guests_covered: number;
    coverage_percentage: number;
    most_used_criteria: Array<{ criteria: string; count: number }>;
    segment_overlap: Array<{ segments: string[]; guest_count: number }>;
  }> {
    try {
      const segments = await this.getSegments(coupleId);

      // Get total guest count
      const { data: totalGuestsData, error } = await supabase
        .from('guests')
        .select('id')
        .eq('couple_id', coupleId);

      if (error) throw error;

      const totalGuests = totalGuestsData?.length || 0;
      const totalGuestsCovered = segments.reduce(
        (sum, segment) => sum + segment.guest_count,
        0,
      );

      // Analyze criteria usage
      const criteriaUsage = new Map<string, number>();
      segments.forEach((segment) => {
        Object.keys(segment.criteria).forEach((key) => {
          criteriaUsage.set(key, (criteriaUsage.get(key) || 0) + 1);
        });
      });

      const mostUsedCriteria = Array.from(criteriaUsage.entries())
        .map(([criteria, count]) => ({ criteria, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total_segments: segments.length,
        total_guests_covered: totalGuestsCovered,
        coverage_percentage: totalGuests
          ? (totalGuestsCovered / totalGuests) * 100
          : 0,
        most_used_criteria: mostUsedCriteria,
        segment_overlap: [], // Would need complex analysis for overlap detection
      };
    } catch (error) {
      console.error('Error getting segment analytics:', error);
      throw error;
    }
  }
}

export const guestSegmentationService = GuestSegmentationService.getInstance();
