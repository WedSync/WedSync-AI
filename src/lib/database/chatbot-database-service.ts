// ==========================================
// WS-243: AI Chatbot Database Service
// ==========================================

import { createAuthenticatedSupabaseClient } from '../auth/chatbot-auth';
import type {
  ChatbotConversation,
  ChatbotMessage,
  ChatbotPrompt,
  ChatbotAnalytics,
  CreateConversationRequest,
  UpdateConversationRequest,
  CreateMessageRequest,
} from '../../types/chatbot';

export class ChatbotDatabaseService {
  private supabase;

  constructor() {
    this.supabase = null; // Will be initialized in methods
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createAuthenticatedSupabaseClient();
    }
    return this.supabase;
  }

  // ==========================================
  // Conversation Operations
  // ==========================================

  async createConversation(
    userId: string,
    organizationId: string,
    data: CreateConversationRequest,
  ): Promise<ChatbotConversation> {
    const supabase = await this.getSupabaseClient();

    const conversationData = {
      organization_id: organizationId,
      user_id: userId,
      title: data.title || 'New Conversation',
      client_id: data.client_id || null,
      wedding_id: data.wedding_id || null,
      context_data: data.context_data || {},
      status: 'active' as const,
    };

    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return conversation;
  }

  async getConversation(
    conversationId: string,
    organizationId: string,
  ): Promise<ChatbotConversation | null> {
    const supabase = await this.getSupabaseClient();

    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching conversation:', error);
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return conversation;
  }

  async getConversations(
    organizationId: string,
    filters: {
      userId?: string;
      clientId?: string;
      weddingId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ conversations: ChatbotConversation[]; total: number }> {
    const supabase = await this.getSupabaseClient();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('chatbot_conversations')
      .select('*, chatbot_analytics(*)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters.weddingId) {
      query = query.eq('wedding_id', filters.weddingId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    // Order and paginate
    query = query
      .order('last_activity_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return {
      conversations: conversations || [],
      total: count || 0,
    };
  }

  async updateConversation(
    conversationId: string,
    organizationId: string,
    updates: UpdateConversationRequest,
  ): Promise<ChatbotConversation> {
    const supabase = await this.getSupabaseClient();

    const { data: conversation, error } = await supabase
      .from('chatbot_conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return conversation;
  }

  async deleteConversation(
    conversationId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Soft delete
    const { error } = await supabase
      .from('chatbot_conversations')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'archived',
      })
      .eq('id', conversationId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  // ==========================================
  // Message Operations
  // ==========================================

  async createMessage(
    conversationId: string,
    data: CreateMessageRequest,
  ): Promise<ChatbotMessage> {
    const supabase = await this.getSupabaseClient();

    // Validate conversation exists
    const { data: conversation, error: convError } = await supabase
      .from('chatbot_conversations')
      .select('id, organization_id')
      .eq('id', conversationId)
      .is('deleted_at', null)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or deleted');
    }

    const messageData = {
      conversation_id: conversationId,
      role: data.role || 'user',
      content: data.content,
      wedding_context: data.wedding_context || {},
      ai_metadata: {},
      tokens_used: 0,
      response_time_ms: 0,
    };

    const { data: message, error } = await supabase
      .from('chatbot_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return message;
  }

  async getMessages(
    conversationId: string,
    organizationId: string,
    filters: {
      role?: string;
      since?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ messages: ChatbotMessage[]; total: number }> {
    const supabase = await this.getSupabaseClient();

    // Validate conversation access
    const conversation = await this.getConversation(
      conversationId,
      organizationId,
    );
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('chatbot_messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .is('deleted_at', null);

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: messages, error, count } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return {
      messages: messages || [],
      total: count || 0,
    };
  }

  async updateMessageMetadata(
    messageId: string,
    metadata: {
      ai_metadata?: Record<string, any>;
      tokens_used?: number;
      response_time_ms?: number;
      is_flagged?: boolean;
      flag_reason?: string;
    },
  ): Promise<ChatbotMessage> {
    const supabase = await this.getSupabaseClient();

    const { data: message, error } = await supabase
      .from('chatbot_messages')
      .update({
        ...metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating message metadata:', error);
      throw new Error(`Failed to update message: ${error.message}`);
    }

    return message;
  }

  // ==========================================
  // Prompt Operations
  // ==========================================

  async getPrompts(
    organizationId: string,
    type?: string,
  ): Promise<ChatbotPrompt[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('chatbot_prompts')
      .select('*')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .eq('is_active', true);

    if (type) {
      query = query.eq('type', type);
    }

    query = query.order('usage_count', { ascending: false });

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      throw new Error(`Failed to fetch prompts: ${error.message}`);
    }

    return prompts || [];
  }

  async getPromptByType(
    organizationId: string,
    type: string,
    name?: string,
  ): Promise<ChatbotPrompt | null> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('chatbot_prompts')
      .select('*')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .eq('type', type)
      .eq('is_active', true);

    if (name) {
      query = query.eq('name', name);
    }

    // Prefer organization-specific prompts
    query = query.order('organization_id', {
      ascending: false,
      nullsLast: true,
    });

    const { data: prompts, error } = await query;

    if (error) {
      console.error('Error fetching prompt:', error);
      throw new Error(`Failed to fetch prompt: ${error.message}`);
    }

    return prompts?.[0] || null;
  }

  // ==========================================
  // Analytics Operations
  // ==========================================

  async updateConversationAnalytics(
    conversationId: string,
    updates: {
      avg_response_time_ms?: number;
      total_tokens_cost?: number;
      message_count?: number;
      satisfaction_rating?: number;
      satisfaction_feedback?: string;
      escalated_to_human?: boolean;
      escalation_reason?: string;
      led_to_booking?: boolean;
      led_to_upsell?: boolean;
      inquiry_category?: string;
      session_duration_minutes?: number;
    },
  ): Promise<ChatbotAnalytics> {
    const supabase = await this.getSupabaseClient();

    const { data: analytics, error } = await supabase
      .from('chatbot_analytics')
      .upsert({
        conversation_id: conversationId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating analytics:', error);
      throw new Error(`Failed to update analytics: ${error.message}`);
    }

    return analytics;
  }

  async getAnalytics(
    organizationId: string,
    timeRange?: { start: string; end: string },
  ): Promise<{
    totalConversations: number;
    totalMessages: number;
    avgSatisfaction: number;
    escalationRate: number;
    avgResponseTime: number;
    totalCost: number;
    conversionRate: number;
  }> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('chatbot_analytics')
      .select(
        `
        *,
        chatbot_conversations!inner(organization_id, created_at)
      `,
      )
      .eq('chatbot_conversations.organization_id', organizationId);

    if (timeRange) {
      query = query
        .gte('chatbot_conversations.created_at', timeRange.start)
        .lte('chatbot_conversations.created_at', timeRange.end);
    }

    const { data: analytics, error } = await query;

    if (error) {
      console.error('Error fetching analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    if (!analytics || analytics.length === 0) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        avgSatisfaction: 0,
        escalationRate: 0,
        avgResponseTime: 0,
        totalCost: 0,
        conversionRate: 0,
      };
    }

    const totalConversations = analytics.length;
    const totalMessages = analytics.reduce(
      (sum, a) => sum + a.message_count,
      0,
    );
    const avgSatisfaction = analytics
      .filter((a) => a.satisfaction_rating)
      .reduce((sum, a, _, arr) => sum + a.satisfaction_rating / arr.length, 0);
    const escalationRate =
      analytics.filter((a) => a.escalated_to_human).length / totalConversations;
    const avgResponseTime = analytics.reduce(
      (sum, a, _, arr) => sum + a.avg_response_time_ms / arr.length,
      0,
    );
    const totalCost = analytics.reduce(
      (sum, a) => sum + parseFloat(a.total_tokens_cost),
      0,
    );
    const conversionRate =
      analytics.filter((a) => a.led_to_booking).length / totalConversations;

    return {
      totalConversations,
      totalMessages,
      avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
      escalationRate: Math.round(escalationRate * 100),
      avgResponseTime: Math.round(avgResponseTime),
      totalCost: Math.round(totalCost * 100) / 100,
      conversionRate: Math.round(conversionRate * 100),
    };
  }

  // ==========================================
  // Wedding Context Helpers
  // ==========================================

  async getWeddingContext(
    organizationId: string,
    weddingId?: string,
    clientId?: string,
  ): Promise<Record<string, any>> {
    const supabase = await this.getSupabaseClient();
    let context: Record<string, any> = {};

    try {
      // Get organization info
      const { data: org } = await supabase
        .from('organizations')
        .select('business_name, service_types, services')
        .eq('id', organizationId)
        .single();

      if (org) {
        context.organization_name = org.business_name;
        context.service_types = org.service_types;
        context.service_list = org.services;
      }

      // Get wedding details if provided
      if (weddingId) {
        const { data: wedding } = await supabase
          .from('weddings')
          .select('*')
          .eq('id', weddingId)
          .eq('organization_id', organizationId)
          .single();

        if (wedding) {
          context.couple_names = `${wedding.partner_1_name} & ${wedding.partner_2_name}`;
          context.wedding_date = wedding.wedding_date;
          context.venue_name = wedding.venue_name;
          context.guest_count = wedding.guest_count;
          context.budget_range = `${wedding.budget_min} - ${wedding.budget_max}`;
        }
      }

      // Get client details if provided
      if (clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('organization_id', organizationId)
          .single();

        if (client) {
          context.client_name = `${client.first_name} ${client.last_name}`;
          context.client_email = client.email;
          context.client_phone = client.phone;
        }
      }
    } catch (error) {
      console.error('Error fetching wedding context:', error);
    }

    return context;
  }
}

// Export singleton instance
export const chatbotDB = new ChatbotDatabaseService();
