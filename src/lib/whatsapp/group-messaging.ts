import { createClient } from '@supabase/supabase-js';
import { createWhatsAppService } from './service';

interface GroupMessage {
  id?: string;
  groupId: string;
  templateName?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document';
  caption?: string;
  filename?: string;
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  createdBy: string;
  createdAt?: Date;
  sentAt?: Date;
  metadata?: Record<string, any>;
}

interface GroupMember {
  id?: string;
  groupId: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  optInStatus: 'opted_in' | 'opted_out' | 'pending';
  addedAt?: Date;
  addedBy: string;
  metadata?: Record<string, any>;
}

interface MessageGroup {
  id?: string;
  name: string;
  description?: string;
  weddingId?: string;
  type: 'wedding_party' | 'family' | 'vendors' | 'custom';
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

interface BulkMessageResult {
  success: boolean;
  totalMessages: number;
  sentCount: number;
  failedCount: number;
  results: {
    phoneNumber: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

export class WhatsAppGroupMessaging {
  private supabase: ReturnType<typeof createClient>;
  private whatsAppService: ReturnType<typeof createWhatsAppService>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.whatsAppService = createWhatsAppService();
  }

  // Create a new message group
  async createGroup(
    group: Omit<MessageGroup, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_groups')
        .insert({
          ...group,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, groupId: data?.id?.toString() ?? '' };
    } catch (error) {
      console.error('Create group error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create group',
      };
    }
  }

  // Add members to a group
  async addMembersToGroup(
    groupId: string,
    members: Omit<GroupMember, 'id' | 'groupId' | 'addedAt'>[],
  ): Promise<{ success: boolean; addedCount?: number; error?: string }> {
    try {
      const membersToAdd = members.map((member) => ({
        ...member,
        group_id: groupId,
        added_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('whatsapp_group_members')
        .insert(membersToAdd);

      if (error) throw error;

      return { success: true, addedCount: members.length };
    } catch (error) {
      console.error('Add members error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add members',
      };
    }
  }

  // Remove member from group
  async removeMemberFromGroup(
    groupId: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_group_members')
        .delete()
        .match({ group_id: groupId, phone_number: phoneNumber });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Remove member error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to remove member',
      };
    }
  }

  // Update member opt-in status
  async updateMemberOptInStatus(
    groupId: string,
    phoneNumber: string,
    status: 'opted_in' | 'opted_out',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_group_members')
        .update({
          opt_in_status: status,
          updated_at: new Date().toISOString(),
        })
        .match({ group_id: groupId, phone_number: phoneNumber });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Update opt-in status error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update opt-in status',
      };
    }
  }

  // Get group members (only opted-in and active)
  async getGroupMembers(
    groupId: string,
  ): Promise<{ success: boolean; members?: GroupMember[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_group_members')
        .select('*')
        .match({
          group_id: groupId,
          is_active: true,
          opt_in_status: 'opted_in',
        });

      if (error) throw error;

      const members: GroupMember[] = data.map((row) => ({
        id: row.id as string,
        groupId: row.group_id as string,
        phoneNumber: row.phone_number as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        isActive: row.is_active as boolean,
        optInStatus: row.opt_in_status as 'opted_in' | 'opted_out' | 'pending',
        addedAt: new Date(row.added_at as string),
        addedBy: row.added_by as string,
        metadata: (row.metadata as Record<string, any>) || {},
      }));

      return { success: true, members };
    } catch (error) {
      console.error('Get group members error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get group members',
      };
    }
  }

  // Send template message to group
  async sendTemplateToGroup(
    groupId: string,
    templateName: string,
    languageCode: string,
    components?: any[],
    metadata?: Record<string, any>,
  ): Promise<BulkMessageResult> {
    try {
      const membersResult = await this.getGroupMembers(groupId);
      if (!membersResult.success || !membersResult.members) {
        return {
          success: false,
          totalMessages: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      const members = membersResult.members;
      const results: BulkMessageResult['results'] = [];

      // Send messages with rate limiting (max 80 messages per second per WhatsApp guidelines)
      const batchSize = 10;
      const batchDelay = 1000; // 1 second between batches

      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        const batchPromises = batch.map(async (member) => {
          const result = await this.whatsAppService.sendTemplateMessage(
            member.phoneNumber,
            templateName,
            languageCode,
            components,
            {
              ...metadata,
              groupId,
              recipientName:
                `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            },
          );

          return {
            phoneNumber: member.phoneNumber,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < members.length) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
        }
      }

      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      // Store group message record
      await this.supabase.from('whatsapp_group_messages').insert({
        group_id: groupId,
        template_name: templateName,
        language_code: languageCode,
        components: components || [],
        status:
          failedCount === 0
            ? 'sent'
            : failedCount === results.length
              ? 'failed'
              : 'partial',
        total_messages: results.length,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        metadata: metadata || {},
      });

      return {
        success: sentCount > 0,
        totalMessages: results.length,
        sentCount,
        failedCount,
        results,
      };
    } catch (error) {
      console.error('Send template to group error:', error);
      return {
        success: false,
        totalMessages: 0,
        sentCount: 0,
        failedCount: 0,
        results: [],
      };
    }
  }

  // Send media message to group
  async sendMediaToGroup(
    groupId: string,
    mediaType: 'image' | 'document',
    mediaUrl: string,
    caption?: string,
    filename?: string,
    metadata?: Record<string, any>,
  ): Promise<BulkMessageResult> {
    try {
      const membersResult = await this.getGroupMembers(groupId);
      if (!membersResult.success || !membersResult.members) {
        return {
          success: false,
          totalMessages: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      const members = membersResult.members;
      const results: BulkMessageResult['results'] = [];

      // Send messages with rate limiting
      const batchSize = 10;
      const batchDelay = 1000;

      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        const batchPromises = batch.map(async (member) => {
          const result = await this.whatsAppService.sendMediaMessage(
            member.phoneNumber,
            mediaType,
            mediaUrl,
            caption,
            filename,
            {
              ...metadata,
              groupId,
              recipientName:
                `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            },
          );

          return {
            phoneNumber: member.phoneNumber,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
          };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        if (i + batchSize < members.length) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
        }
      }

      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      // Store group message record
      await this.supabase.from('whatsapp_group_messages').insert({
        group_id: groupId,
        message_type: mediaType,
        media_url: mediaUrl,
        content: caption || '',
        status:
          failedCount === 0
            ? 'sent'
            : failedCount === results.length
              ? 'failed'
              : 'partial',
        total_messages: results.length,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        metadata: metadata || {},
      });

      return {
        success: sentCount > 0,
        totalMessages: results.length,
        sentCount,
        failedCount,
        results,
      };
    } catch (error) {
      console.error('Send media to group error:', error);
      return {
        success: false,
        totalMessages: 0,
        sentCount: 0,
        failedCount: 0,
        results: [],
      };
    }
  }

  // Get group message history
  async getGroupMessageHistory(
    groupId: string,
    limit = 50,
  ): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, messages: data };
    } catch (error) {
      console.error('Get group message history error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get message history',
      };
    }
  }

  // Get all groups for a user
  async getUserGroups(
    userId: string,
  ): Promise<{ success: boolean; groups?: MessageGroup[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_groups')
        .select('*')
        .eq('created_by', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groups: MessageGroup[] = data.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        description: row.description as string,
        weddingId: row.wedding_id as string,
        type: row.type as 'wedding_party' | 'family' | 'vendors' | 'custom',
        isActive: row.is_active as boolean,
        createdBy: row.created_by as string,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        metadata: (row.metadata as Record<string, any>) || {},
      }));

      return { success: true, groups };
    } catch (error) {
      console.error('Get user groups error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get groups',
      };
    }
  }

  // Delete group (soft delete)
  async deleteGroup(
    groupId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_groups')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .match({ id: groupId, created_by: userId });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Delete group error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete group',
      };
    }
  }
}

// Export factory function
export function createWhatsAppGroupMessaging(): WhatsAppGroupMessaging {
  return new WhatsAppGroupMessaging();
}

// Export types
export type { GroupMessage, GroupMember, MessageGroup, BulkMessageResult };
