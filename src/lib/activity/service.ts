import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type ActivityFeedInsert =
  Database['public']['Tables']['activity_feeds']['Insert'];

export interface CreateActivityOptions {
  organizationId: string;
  entityType: 'client' | 'vendor' | 'form' | 'message' | 'booking' | 'payment';
  entityId: string;
  activityType: string;
  title: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  actorType?: 'client' | 'vendor' | 'system';
  targetUserIds?: string[];
  isPublic?: boolean;
  icon?: string;
  color?: string;
  data?: Record<string, any>;
}

export class ActivityService {
  static async createActivity(options: CreateActivityOptions) {
    const supabase = await createClient();

    const activityData: ActivityFeedInsert = {
      organization_id: options.organizationId,
      entity_type: options.entityType,
      entity_id: options.entityId,
      activity_type: options.activityType,
      title: options.title,
      description: options.description || null,
      actor_id: options.actorId || null,
      actor_name: options.actorName || null,
      actor_type: options.actorType || 'system',
      target_user_ids: options.targetUserIds || null,
      is_public: options.isPublic ?? false,
      icon: options.icon || null,
      color: options.color || null,
      data: options.data || null,
    };

    try {
      const { data, error } = await supabase
        .from('activity_feeds')
        .insert(activityData)
        .select()
        .single();

      if (error) {
        console.error('Error creating activity:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createActivity:', error);
      throw error;
    }
  }

  // Predefined activity creators for common actions
  static async logMessageSent(
    organizationId: string,
    conversationId: string,
    senderId: string,
    senderName: string,
    senderType: 'client' | 'vendor',
    recipientId: string,
    messagePreview: string,
  ) {
    return this.createActivity({
      organizationId,
      entityType: 'message',
      entityId: conversationId,
      activityType: 'message_sent',
      title: `New message from ${senderName}`,
      description: messagePreview.substring(0, 100),
      actorId: senderId,
      actorName: senderName,
      actorType: senderType,
      targetUserIds: [recipientId],
      isPublic: false,
      icon: 'message-circle',
      color: '#3b82f6',
      data: {
        conversation_id: conversationId,
        sender_type: senderType,
      },
    });
  }

  static async logFormSubmission(
    organizationId: string,
    formId: string,
    submissionId: string,
    clientId: string,
    clientName: string,
    formName: string,
    vendorId?: string,
  ) {
    return this.createActivity({
      organizationId,
      entityType: 'form',
      entityId: formId,
      activityType: 'form_submitted',
      title: `Form submission: ${formName}`,
      description: `${clientName} submitted the ${formName} form`,
      actorId: clientId,
      actorName: clientName,
      actorType: 'client',
      targetUserIds: vendorId ? [vendorId] : undefined,
      isPublic: true,
      icon: 'file-text',
      color: '#8b5cf6',
      data: {
        form_id: formId,
        submission_id: submissionId,
        form_name: formName,
      },
    });
  }

  static async logClientCreated(
    organizationId: string,
    clientId: string,
    clientName: string,
    createdBy?: string,
    createdByName?: string,
  ) {
    return this.createActivity({
      organizationId,
      entityType: 'client',
      entityId: clientId,
      activityType: 'client_created',
      title: `New client: ${clientName}`,
      description: `${clientName} was added to your client list`,
      actorId: createdBy,
      actorName: createdByName || 'System',
      actorType: createdBy ? 'vendor' : 'system',
      isPublic: true,
      icon: 'user-plus',
      color: '#10b981',
      data: {
        client_id: clientId,
        client_name: clientName,
      },
    });
  }

  static async logBookingCreated(
    organizationId: string,
    bookingId: string,
    clientId: string,
    clientName: string,
    bookingDetails: string,
    vendorId?: string,
  ) {
    return this.createActivity({
      organizationId,
      entityType: 'booking',
      entityId: bookingId,
      activityType: 'booking_created',
      title: `New booking: ${clientName}`,
      description: bookingDetails,
      actorId: clientId,
      actorName: clientName,
      actorType: 'client',
      targetUserIds: vendorId ? [vendorId] : undefined,
      isPublic: true,
      icon: 'calendar',
      color: '#6366f1',
      data: {
        booking_id: bookingId,
        client_id: clientId,
        client_name: clientName,
      },
    });
  }

  static async logPaymentReceived(
    organizationId: string,
    paymentId: string,
    clientId: string,
    clientName: string,
    amount: number,
    currency: string,
    vendorId?: string,
  ) {
    return this.createActivity({
      organizationId,
      entityType: 'payment',
      entityId: paymentId,
      activityType: 'payment_received',
      title: `Payment received: ${currency}${amount}`,
      description: `Payment of ${currency}${amount} received from ${clientName}`,
      actorId: clientId,
      actorName: clientName,
      actorType: 'client',
      targetUserIds: vendorId ? [vendorId] : undefined,
      isPublic: true,
      icon: 'credit-card',
      color: '#059669',
      data: {
        payment_id: paymentId,
        client_id: clientId,
        client_name: clientName,
        amount,
        currency,
      },
    });
  }

  static async logEmailSent(
    organizationId: string,
    recipientId: string,
    recipientEmail: string,
    subject: string,
    templateType: string,
    senderId?: string,
    senderName?: string,
  ) {
    return this.createActivity({
      organizationId,
      entityType: recipientId.includes('client') ? 'client' : 'vendor',
      entityId: recipientId,
      activityType: 'email_sent',
      title: `Email sent: ${subject}`,
      description: `Email notification sent to ${recipientEmail}`,
      actorId: senderId,
      actorName: senderName || 'System',
      actorType: senderId ? 'vendor' : 'system',
      targetUserIds: [recipientId],
      isPublic: false,
      icon: 'mail',
      color: '#10b981',
      data: {
        recipient_email: recipientEmail,
        subject,
        template_type: templateType,
      },
    });
  }

  static async logSystemNotification(
    organizationId: string,
    title: string,
    description: string,
    targetUserIds?: string[],
    isPublic = false,
    data?: Record<string, any>,
  ) {
    return this.createActivity({
      organizationId,
      entityType: 'vendor', // Default to vendor for system notifications
      entityId: 'system',
      activityType: 'system_notification',
      title,
      description,
      actorType: 'system',
      targetUserIds,
      isPublic,
      icon: 'bell',
      color: '#6b7280',
      data,
    });
  }

  // Get activities for a specific entity
  static async getActivitiesForEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    limit = 20,
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('activity_feeds')
      .select(
        `
        *,
        actor:user_profiles!activity_feeds_actor_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `,
      )
      .eq('organization_id', organizationId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching entity activities:', error);
      throw error;
    }

    return data || [];
  }

  // Get activities for a user (based on targeting and visibility)
  static async getActivitiesForUser(
    organizationId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('activity_feeds')
      .select(
        `
        *,
        actor:user_profiles!activity_feeds_actor_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `,
      )
      .eq('organization_id', organizationId)
      .or(
        `is_public.eq.true,target_user_ids.cs.["${userId}"],actor_id.eq.${userId}`,
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }

    return data || [];
  }

  // Mark activity as read for a user
  static async markAsRead(activityId: string, userId: string) {
    const supabase = await createClient();

    // Get current read_by array
    const { data: activity, error: fetchError } = await supabase
      .from('activity_feeds')
      .select('read_by')
      .eq('id', activityId)
      .single();

    if (fetchError || !activity) {
      throw new Error('Activity not found');
    }

    const currentReadBy = activity.read_by || [];

    // Don't update if already read
    if (currentReadBy.includes(userId)) {
      return true;
    }

    // Add user to read_by array
    const { error } = await supabase
      .from('activity_feeds')
      .update({
        read_by: [...currentReadBy, userId],
      })
      .eq('id', activityId);

    if (error) {
      console.error('Error marking activity as read:', error);
      throw error;
    }

    return true;
  }

  // Get unread count for a user
  static async getUnreadCount(organizationId: string, userId: string) {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('activity_feeds')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .or(`is_public.eq.true,target_user_ids.cs.["${userId}"]`)
      .not('read_by', 'cs', `["${userId}"]`);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }
}
