import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database/types';

export interface InvitationData {
  id?: string;
  sender_id: string;
  recipient_email: string;
  recipient_name?: string;
  invitation_type: 'vendor_to_couple' | 'couple_to_vendor' | 'vendor_to_vendor';
  channel: 'email' | 'sms' | 'whatsapp';
  template_id?: string;
  personalized_message?: string;
  scheduled_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  status?:
    | 'pending'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'accepted'
    | 'declined'
    | 'expired';
}

export interface InvitationFilters {
  userId: string;
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  channel?: string;
  sender_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface InvitationListResponse {
  data: InvitationData[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface InvitationStats {
  total_invitations: number;
  sent_invitations: number;
  delivered_invitations: number;
  opened_invitations: number;
  clicked_invitations: number;
  accepted_invitations: number;
  declined_invitations: number;
  pending_invitations: number;
  expired_invitations: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  acceptance_rate: number;
}

export class InvitationManager {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new invitation
   */
  async createInvitation(data: InvitationData): Promise<InvitationData> {
    try {
      // Generate expiration date if not provided (default: 30 days)
      const expiresAt =
        data.expires_at ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Generate tracking code
      const trackingCode = this.generateTrackingCode();

      const invitationData = {
        sender_id: data.sender_id,
        recipient_email: data.recipient_email,
        recipient_name: data.recipient_name,
        invitation_type: data.invitation_type,
        channel: data.channel,
        template_id: data.template_id,
        personalized_message: data.personalized_message,
        scheduled_at: data.scheduled_at,
        expires_at: expiresAt,
        tracking_code: trackingCode,
        status:
          data.scheduled_at && new Date(data.scheduled_at) > new Date()
            ? 'pending'
            : 'sent',
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: invitation, error } = await this.supabase
        .from('viral_invitations')
        .insert(invitationData)
        .select()
        .single();

      if (error) throw error;

      // If invitation is scheduled for immediate sending, trigger the send process
      if (!data.scheduled_at || new Date(data.scheduled_at) <= new Date()) {
        await this.processSendInvitation(invitation.id);
      }

      return invitation;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw new Error(
        `Failed to create invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get invitations with filters and pagination
   */
  async getInvitations(
    filters: InvitationFilters,
  ): Promise<InvitationListResponse> {
    try {
      let query = this.supabase
        .from('viral_invitations')
        .select('*, invitation_templates(name, subject)', { count: 'exact' });

      // Apply access control - users can only see their own invitations or those they received
      query = query.or(
        `sender_id.eq.${filters.userId},recipient_email.eq.(SELECT email FROM user_profiles WHERE id = '${filters.userId}')`,
      );

      // Apply filters
      if (filters.type) {
        query = query.eq('invitation_type', filters.type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }

      if (filters.sender_id) {
        query = query.eq('sender_id', filters.sender_id);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.search) {
        query = query.or(
          `recipient_email.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%,personalized_message.ilike.%${filters.search}%`,
        );
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        data: data || [],
        total: count || 0,
        pagination: {
          page,
          limit,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting invitations:', error);
      throw new Error(
        `Failed to get invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(
    invitationId: string,
    userId: string,
  ): Promise<InvitationData | null> {
    try {
      const { data, error } = await this.supabase
        .from('viral_invitations')
        .select('*, invitation_templates(name, subject, content)')
        .eq('id', invitationId)
        .or(
          `sender_id.eq.${userId},recipient_email.eq.(SELECT email FROM user_profiles WHERE id = '${userId}')`,
        )
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting invitation by ID:', error);
      throw new Error(
        `Failed to get invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update invitation
   */
  async updateInvitation(
    invitationId: string,
    updates: Partial<InvitationData>,
    userId: string,
  ): Promise<InvitationData> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('viral_invitations')
        .update(updateData)
        .eq('id', invitationId)
        .eq('sender_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating invitation:', error);
      throw new Error(
        `Failed to update invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Bulk update invitations
   */
  async bulkUpdateInvitations(params: {
    invitationIds: string[];
    updates: Partial<InvitationData>;
    userId: string;
  }): Promise<{ updatedCount: number; updatedInvitations: InvitationData[] }> {
    try {
      const updateData = {
        ...params.updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('viral_invitations')
        .update(updateData)
        .in('id', params.invitationIds)
        .eq('sender_id', params.userId)
        .select();

      if (error) throw error;

      return {
        updatedCount: data?.length || 0,
        updatedInvitations: data || [],
      };
    } catch (error) {
      console.error('Error bulk updating invitations:', error);
      throw new Error(
        `Failed to bulk update invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete invitations (soft delete)
   */
  async deleteInvitations(params: {
    invitationIds: string[];
    userId: string;
  }): Promise<{ deletedCount: number }> {
    try {
      const { data, error } = await this.supabase
        .from('viral_invitations')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', params.invitationIds)
        .eq('sender_id', params.userId)
        .select('id');

      if (error) throw error;

      return {
        deletedCount: data?.length || 0,
      };
    } catch (error) {
      console.error('Error deleting invitations:', error);
      throw new Error(
        `Failed to delete invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(
    userId: string,
    filters?: {
      type?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<InvitationStats> {
    try {
      let query = this.supabase
        .from('viral_invitations')
        .select('status, created_at')
        .eq('sender_id', userId);

      if (filters?.type) {
        query = query.eq('invitation_type', filters.type);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      const invitations = data || [];
      const total = invitations.length;

      const stats = invitations.reduce(
        (acc, inv) => {
          acc[inv.status as keyof InvitationStats] =
            (acc[inv.status as keyof InvitationStats] || 0) + 1;
          return acc;
        },
        {
          total_invitations: total,
          sent_invitations: 0,
          delivered_invitations: 0,
          opened_invitations: 0,
          clicked_invitations: 0,
          accepted_invitations: 0,
          declined_invitations: 0,
          pending_invitations: 0,
          expired_invitations: 0,
        } as any,
      );

      // Calculate rates
      const delivered = stats.delivered_invitations || 0;
      const opened = stats.opened_invitations || 0;
      const clicked = stats.clicked_invitations || 0;
      const accepted = stats.accepted_invitations || 0;

      return {
        ...stats,
        delivery_rate: total > 0 ? (delivered / total) * 100 : 0,
        open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
        click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
        acceptance_rate: clicked > 0 ? (accepted / clicked) * 100 : 0,
      };
    } catch (error) {
      console.error('Error getting invitation stats:', error);
      throw new Error(
        `Failed to get invitation stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process scheduled invitations
   */
  async processScheduledInvitations(): Promise<{ processedCount: number }> {
    try {
      const now = new Date().toISOString();

      // Get invitations scheduled for sending
      const { data: scheduledInvitations, error } = await this.supabase
        .from('viral_invitations')
        .select('id')
        .eq('status', 'pending')
        .lte('scheduled_at', now);

      if (error) throw error;

      let processedCount = 0;

      for (const invitation of scheduledInvitations || []) {
        try {
          await this.processSendInvitation(invitation.id);
          processedCount++;
        } catch (error) {
          console.error(
            `Failed to process invitation ${invitation.id}:`,
            error,
          );
        }
      }

      return { processedCount };
    } catch (error) {
      console.error('Error processing scheduled invitations:', error);
      throw new Error(
        `Failed to process scheduled invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get invitation templates
   */
  async getInvitationTemplates(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      subject: string;
      content: string;
      invitation_type: string;
      channel: string;
      is_default: boolean;
    }>
  > {
    try {
      const { data, error } = await this.supabase
        .from('invitation_templates')
        .select('*')
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting invitation templates:', error);
      throw new Error(
        `Failed to get invitation templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Private helper methods

  private generateTrackingCode(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private async processSendInvitation(invitationId: string): Promise<void> {
    try {
      // Update status to sent
      await this.supabase
        .from('viral_invitations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      // Here you would integrate with email/SMS providers
      // For now, we'll just create a tracking event
      await this.supabase.from('invitation_tracking_events').insert({
        invitation_id: invitationId,
        event_type: 'sent',
        timestamp: new Date().toISOString(),
        metadata: {},
      });
    } catch (error) {
      console.error('Error processing send invitation:', error);
      throw error;
    }
  }
}
