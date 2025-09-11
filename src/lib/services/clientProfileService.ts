import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Types
export interface ClientProfile {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  partner_first_name?: string;
  partner_last_name?: string;
  email: string;
  phone?: string;
  partner_email?: string;
  partner_phone?: string;
  wedding_date?: string;
  ceremony_venue_name?: string;
  ceremony_venue_address?: string;
  ceremony_time?: string;
  reception_venue_name?: string;
  reception_venue_address?: string;
  reception_time?: string;
  guest_count_estimated?: number;
  guest_count_confirmed?: number;
  budget_total?: number;
  budget_spent?: number;
  wedding_theme?: string;
  profile_completion_score: number;
  status: 'lead' | 'booked' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ClientActivity {
  id: string;
  activity_type: string;
  activity_title: string;
  activity_description?: string;
  activity_category?: string;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ClientDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  version_number: number;
  is_latest: boolean;
  uploaded_at: string;
  uploaded_by_name: string;
  download_url?: string;
}

export interface ClientNote {
  id: string;
  content: string;
  note_type: string;
  visibility: 'public' | 'internal' | 'private';
  priority?: string;
  tags?: string[];
  created_at: string;
  created_by_name: string;
}

export interface ClientCommunication {
  id: string;
  communication_type: string;
  direction: 'inbound' | 'outbound';
  subject?: string;
  summary?: string;
  communication_date: string;
  from_name?: string;
  to_name?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
}

export interface ClientMilestone {
  id: string;
  milestone_name: string;
  milestone_type: string;
  target_date: string;
  is_completed: boolean;
  completed_date?: string;
}

export interface ClientProfileWithRelations extends ClientProfile {
  activities?: ClientActivity[];
  documents?: ClientDocument[];
  notes?: ClientNote[];
  communications?: ClientCommunication[];
  milestones?: ClientMilestone[];
}

// Validation schemas
const weddingDetailsSchema = z.object({
  wedding_date: z.string().optional(),
  ceremony_venue_name: z.string().max(255).optional(),
  ceremony_venue_address: z.string().optional(),
  ceremony_time: z.string().optional(),
  ceremony_type: z.string().max(100).optional(),
  reception_venue_name: z.string().max(255).optional(),
  reception_venue_address: z.string().optional(),
  reception_time: z.string().optional(),
  reception_style: z.string().max(100).optional(),
  wedding_theme: z.string().max(255).optional(),
  color_scheme: z.array(z.string()).optional(),
  music_preferences: z.string().optional(),
  photography_style: z.string().max(100).optional(),
});

const guestDetailsSchema = z.object({
  guest_count_estimated: z.number().min(0).max(1000).optional(),
  guest_count_confirmed: z.number().min(0).max(1000).optional(),
  guest_count_children: z.number().min(0).max(500).optional(),
  plus_ones_allowed: z.boolean().optional(),
  guest_list: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        dietary_requirements: z.string().optional(),
        table_number: z.number().optional(),
        rsvp_status: z.enum(['pending', 'confirmed', 'declined']).optional(),
      }),
    )
    .optional(),
});

const budgetDetailsSchema = z.object({
  budget_total: z.number().min(0).optional(),
  budget_spent: z.number().min(0).optional(),
  budget_categories: z.record(z.number()).optional(),
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
});

// Service class
export class ClientProfileService {
  private supabase: any;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    this.supabase = await createClient();
  }

  /**
   * Get comprehensive client profile with all related data
   */
  async getCompleteProfile(
    clientId: string,
  ): Promise<ClientProfileWithRelations | null> {
    try {
      if (!this.supabase) await this.initializeClient();

      // Fetch main profile
      const { data: profile, error: profileError } = await this.supabase
        .from('clients')
        .select(
          `
          *,
          client_activities (
            id,
            activity_type,
            activity_title,
            activity_description,
            activity_category,
            performed_by,
            performed_by_name,
            created_at,
            metadata
          ),
          client_notes (
            id,
            content,
            note_type,
            visibility,
            priority,
            tags,
            created_at,
            created_by_name
          ),
          client_documents (
            id,
            document_name,
            document_type,
            file_path,
            file_size,
            mime_type,
            version_number,
            is_latest,
            uploaded_at,
            uploaded_by_name
          )
        `,
        )
        .eq('id', clientId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Fetch communications separately (if table exists)
      const { data: communications } = await this.supabase
        .from('client_communications')
        .select(
          `
          id,
          communication_type,
          direction,
          subject,
          summary,
          communication_date,
          from_name,
          to_name,
          follow_up_required,
          follow_up_date
        `,
        )
        .eq('client_id', clientId)
        .order('communication_date', { ascending: false })
        .limit(10);

      // Fetch milestones separately
      const { data: milestones } = await this.supabase
        .from('client_milestones')
        .select(
          `
          id,
          milestone_name,
          milestone_type,
          target_date,
          is_completed,
          completed_date
        `,
        )
        .eq('client_id', clientId)
        .order('target_date', { ascending: true });

      return {
        ...profile,
        communications: communications || [],
        milestones: milestones || [],
      };
    } catch (error) {
      console.error('Error in getCompleteProfile:', error);
      return null;
    }
  }

  /**
   * Update wedding details
   */
  async updateWeddingDetails(
    clientId: string,
    details: z.infer<typeof weddingDetailsSchema>,
  ) {
    try {
      if (!this.supabase) await this.initializeClient();

      const validatedData = weddingDetailsSchema.parse(details);

      const { data, error } = await this.supabase
        .from('clients')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;

      // Track activity
      await this.trackActivity(clientId, {
        activity_type: 'wedding_details_updated',
        activity_title: 'Wedding details updated',
        activity_description:
          'Wedding ceremony and reception details were modified',
        activity_category: 'profile',
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error updating wedding details:', error);
      return { success: false, error };
    }
  }

  /**
   * Update guest information
   */
  async updateGuestDetails(
    clientId: string,
    details: z.infer<typeof guestDetailsSchema>,
  ) {
    try {
      if (!this.supabase) await this.initializeClient();

      const validatedData = guestDetailsSchema.parse(details);

      const { data, error } = await this.supabase
        .from('clients')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;

      // Track activity
      await this.trackActivity(clientId, {
        activity_type: 'guest_details_updated',
        activity_title: 'Guest information updated',
        activity_description: `Guest count: ${validatedData.guest_count_estimated || 'TBD'}`,
        activity_category: 'profile',
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error updating guest details:', error);
      return { success: false, error };
    }
  }

  /**
   * Update budget information
   */
  async updateBudgetDetails(
    clientId: string,
    details: z.infer<typeof budgetDetailsSchema>,
  ) {
    try {
      if (!this.supabase) await this.initializeClient();

      const validatedData = budgetDetailsSchema.parse(details);

      const { data, error } = await this.supabase
        .from('clients')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;

      // Track activity
      await this.trackActivity(clientId, {
        activity_type: 'budget_updated',
        activity_title: 'Budget information updated',
        activity_description: `Total budget: ${validatedData.budget_total ? `£${validatedData.budget_total}` : 'TBD'}`,
        activity_category: 'financial',
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error updating budget details:', error);
      return { success: false, error };
    }
  }

  /**
   * Track client activity
   */
  private async trackActivity(
    clientId: string,
    activity: {
      activity_type: string;
      activity_title: string;
      activity_description?: string;
      activity_category?: string;
      metadata?: Record<string, any>;
    },
  ) {
    try {
      if (!this.supabase) await this.initializeClient();

      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name, organization_id')
        .eq('user_id', user.id)
        .single();

      const userName = userProfile
        ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
        : user.email || 'Unknown User';

      await this.supabase.from('client_activities').insert({
        client_id: clientId,
        organization_id: userProfile?.organization_id,
        ...activity,
        performed_by: user.id,
        performed_by_name: userName,
        is_automated: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }

  /**
   * Calculate and update profile completion score
   */
  async updateProfileCompletionScore(clientId: string): Promise<number> {
    try {
      if (!this.supabase) await this.initializeClient();

      const { data, error } = await this.supabase.rpc(
        'calculate_profile_completion_score',
        { client_id: clientId },
      );

      if (error) throw error;

      return data || 0;
    } catch (error) {
      console.error('Error calculating profile completion:', error);
      return 0;
    }
  }

  /**
   * Get activity feed for a client
   */
  async getActivityFeed(
    clientId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      if (!this.supabase) await this.initializeClient();

      const { data, error } = await this.supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  }

  /**
   * Search clients with filters
   */
  async searchClients(
    filters: {
      query?: string;
      status?: string;
      weddingDateFrom?: string;
      weddingDateTo?: string;
      organizationId: string;
    },
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      if (!this.supabase) await this.initializeClient();

      let query = this.supabase
        .from('clients')
        .select('*')
        .eq('organization_id', filters.organizationId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.weddingDateFrom) {
        query = query.gte('wedding_date', filters.weddingDateFrom);
      }

      if (filters.weddingDateTo) {
        query = query.lte('wedding_date', filters.weddingDateTo);
      }

      if (filters.query) {
        query = query.or(`
          first_name.ilike.%${filters.query}%,
          last_name.ilike.%${filters.query}%,
          partner_first_name.ilike.%${filters.query}%,
          partner_last_name.ilike.%${filters.query}%,
          email.ilike.%${filters.query}%,
          venue_name.ilike.%${filters.query}%
        `);
      }

      const { data, error } = await query
        .order('wedding_date', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching clients:', error);
      return [];
    }
  }

  /**
   * Get upcoming milestones
   */
  async getUpcomingMilestones(clientId: string, daysAhead: number = 30) {
    try {
      if (!this.supabase) await this.initializeClient();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await this.supabase
        .from('client_milestones')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_completed', false)
        .lte('target_date', futureDate.toISOString())
        .order('target_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming milestones:', error);
      return [];
    }
  }
}

// Export singleton instance
export const clientProfileService = new ClientProfileService();
