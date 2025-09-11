// WS-161: Supplier Portal Dashboard Service
import { createClient } from '@/lib/supabase/server';
import { SupplierScheduleEvent } from '@/types/suppliers';

export interface SupplierDashboard {
  supplier_info: {
    id: string;
    name: string;
    company_name: string;
    email: string;
    phone: string;
    role: string;
    profile_picture?: string;
  };

  upcoming_events: SupplierScheduleEvent[];
  recent_communications: Array<{
    id: string;
    type: 'email' | 'sms' | 'feedback_response' | 'schedule_change';
    subject: string;
    preview: string;
    sender: string;
    created_at: Date;
    read: boolean;
    priority: 'low' | 'medium' | 'high';
  }>;

  pending_actions: Array<{
    id: string;
    type:
      | 'feedback_required'
      | 'schedule_conflict'
      | 'document_review'
      | 'approval_needed';
    title: string;
    description: string;
    due_date?: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    action_url: string;
  }>;

  notifications: Array<{
    id: string;
    type:
      | 'schedule_update'
      | 'new_message'
      | 'deadline_reminder'
      | 'system_alert';
    title: string;
    message: string;
    created_at: Date;
    read: boolean;
    action_required: boolean;
  }>;

  statistics: {
    total_weddings: number;
    completed_events: number;
    upcoming_events: number;
    pending_feedback: number;
    response_rate: number;
    average_rating: number;
  };

  quick_actions: Array<{
    title: string;
    description: string;
    icon: string;
    action_url: string;
    enabled: boolean;
  }>;
}

export interface SupplierScheduleOverview {
  events: Array<
    SupplierScheduleEvent & {
      wedding_info: {
        couple_names: string;
        wedding_date: Date;
        venue_name?: string;
        planner_name?: string;
        planner_email?: string;
      };
      conflict_status?: 'none' | 'potential' | 'confirmed';
      feedback_pending: boolean;
      documents_attached: number;
    }
  >;

  conflicts: Array<{
    event_id: string;
    conflict_type: 'time_overlap' | 'travel_time' | 'resource_conflict';
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggested_resolution: string;
  }>;

  calendar_view: {
    month: number;
    year: number;
    events_by_date: Record<string, SupplierScheduleEvent[]>;
    busy_dates: string[];
    available_dates: string[];
  };
}

export interface SupplierCommunicationHub {
  conversations: Array<{
    id: string;
    wedding_id: string;
    couple_names: string;
    planner_name?: string;
    last_message: {
      content: string;
      sender: string;
      sent_at: Date;
    };
    unread_count: number;
    priority: 'low' | 'medium' | 'high';
    status: 'active' | 'archived' | 'closed';
  }>;

  feedback_requests: Array<{
    id: string;
    schedule_event_id: string;
    event_title: string;
    couple_names: string;
    request_type: 'conflict' | 'availability' | 'suggestion';
    submitted_at: Date;
    status: 'pending' | 'in_review' | 'resolved';
    priority: 'low' | 'medium' | 'high';
  }>;

  announcements: Array<{
    id: string;
    title: string;
    content: string;
    type: 'general' | 'urgent' | 'policy_update' | 'feature_announcement';
    published_at: Date;
    expires_at?: Date;
    read: boolean;
  }>;
}

export class SupplierPortalService {
  /**
   * Get supplier dashboard data
   */
  static async getSupplierDashboard(
    supplierId: string,
    organizationId: string,
  ): Promise<SupplierDashboard> {
    try {
      const supabase = await createClient();

      // Get supplier basic info
      const { data: supplier } = await supabase
        .from('suppliers')
        .select(
          `
          id, name, company_name, email, phone, role,
          portal_user:supplier_portal_users(profile_picture)
        `,
        )
        .eq('id', supplierId)
        .eq('organization_id', organizationId)
        .single();

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Get upcoming events (next 30 days)
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const { data: upcomingEvents } = await supabase
        .from('supplier_schedule_events')
        .select(
          `
          *,
          wedding:weddings!inner(
            couple_names, wedding_date, planner_name, planner_email
          )
        `,
        )
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', thirtyDaysFromNow.toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(10);

      // Get recent communications
      const { data: recentComms } = await supabase
        .from('supplier_communications_log')
        .select(
          `
          id, type, subject, preview, sender, created_at, read, priority
        `,
        )
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get pending actions
      const { data: pendingActions } = await supabase
        .from('supplier_pending_actions')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

      // Get notifications
      const { data: notifications } = await supabase
        .from('supplier_notifications')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(15);

      // Calculate statistics
      const stats = await this.calculateSupplierStatistics(
        supplierId,
        organizationId,
      );

      // Generate quick actions
      const quickActions = this.generateQuickActions(
        supplierId,
        organizationId,
      );

      return {
        supplier_info: {
          id: supplier.id,
          name: supplier.name,
          company_name: supplier.company_name,
          email: supplier.email,
          phone: supplier.phone,
          role: supplier.role,
          profile_picture: supplier.portal_user?.profile_picture,
        },

        upcoming_events: (upcomingEvents || []).map((event) => ({
          ...event,
          start_time: new Date(event.start_time),
          end_time: new Date(event.end_time),
          setup_time: event.setup_time ? new Date(event.setup_time) : undefined,
          breakdown_time: event.breakdown_time
            ? new Date(event.breakdown_time)
            : undefined,
          wedding_date: new Date(event.wedding.wedding_date),
          couple_names: event.wedding.couple_names,
          planner_name: event.wedding.planner_name,
          planner_email: event.wedding.planner_email,
          priority: event.priority as 'low' | 'medium' | 'high' | 'critical',
          status: event.status as
            | 'draft'
            | 'confirmed'
            | 'updated'
            | 'cancelled',
          created_at: new Date(event.created_at),
          updated_at: new Date(event.updated_at),
        })),

        recent_communications: (recentComms || []).map((comm) => ({
          ...comm,
          created_at: new Date(comm.created_at),
        })),

        pending_actions: (pendingActions || []).map((action) => ({
          ...action,
          due_date: action.due_date ? new Date(action.due_date) : undefined,
        })),

        notifications: (notifications || []).map((notif) => ({
          ...notif,
          created_at: new Date(notif.created_at),
        })),

        statistics: stats,
        quick_actions: quickActions,
      };
    } catch (error) {
      console.error('Failed to get supplier dashboard:', error);
      throw error;
    }
  }

  /**
   * Get supplier schedule overview with calendar view
   */
  static async getSupplierScheduleOverview(
    supplierId: string,
    organizationId: string,
    month?: number,
    year?: number,
  ): Promise<SupplierScheduleOverview> {
    try {
      const supabase = await createClient();

      // Default to current month/year
      const now = new Date();
      const targetMonth = month || now.getMonth() + 1;
      const targetYear = year || now.getFullYear();

      // Get month date range
      const monthStart = new Date(targetYear, targetMonth - 1, 1);
      const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      // Get all events for the month
      const { data: events } = await supabase
        .from('supplier_schedule_events')
        .select(
          `
          *,
          wedding:weddings!inner(
            id, couple_names, wedding_date, planner_name, planner_email,
            venue_name:wedding_venues(name)
          ),
          feedback:supplier_schedule_feedback(
            id, status, feedback_type
          ),
          documents:supplier_schedule_documents(count)
        `,
        )
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      // Get potential conflicts
      const { data: conflicts } = await supabase
        .from('supplier_schedule_conflicts')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .in('status', ['reported', 'investigating']);

      // Process events
      const processedEvents = (events || []).map((event) => ({
        ...event,
        start_time: new Date(event.start_time),
        end_time: new Date(event.end_time),
        setup_time: event.setup_time ? new Date(event.setup_time) : undefined,
        breakdown_time: event.breakdown_time
          ? new Date(event.breakdown_time)
          : undefined,
        wedding_date: new Date(event.wedding.wedding_date),
        couple_names: event.wedding.couple_names,
        planner_name: event.wedding.planner_name,
        planner_email: event.wedding.planner_email,
        priority: event.priority as 'low' | 'medium' | 'high' | 'critical',
        status: event.status as 'draft' | 'confirmed' | 'updated' | 'cancelled',
        created_at: new Date(event.created_at),
        updated_at: new Date(event.updated_at),
        wedding_info: {
          couple_names: event.wedding.couple_names,
          wedding_date: new Date(event.wedding.wedding_date),
          venue_name: event.wedding.venue_name?.name,
          planner_name: event.wedding.planner_name,
          planner_email: event.wedding.planner_email,
        },
        conflict_status: this.getConflictStatus(event.id, conflicts || []),
        feedback_pending:
          event.feedback?.some((f: any) => f.status === 'pending') || false,
        documents_attached: event.documents?.length || 0,
      }));

      // Create calendar view
      const eventsByDate: Record<string, SupplierScheduleEvent[]> = {};
      const busyDates: string[] = [];

      processedEvents.forEach((event) => {
        const dateKey = event.start_time.toISOString().split('T')[0];
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);

        if (!busyDates.includes(dateKey)) {
          busyDates.push(dateKey);
        }
      });

      // Generate available dates (for the month, excluding busy dates)
      const availableDates: string[] = [];
      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const date = new Date(targetYear, targetMonth - 1, day);
        const dateKey = date.toISOString().split('T')[0];
        if (!busyDates.includes(dateKey) && date >= now) {
          availableDates.push(dateKey);
        }
      }

      return {
        events: processedEvents,
        conflicts: (conflicts || []).map((conflict) => ({
          event_id: conflict.schedule_event_id,
          conflict_type: conflict.conflict_type,
          description: `${conflict.conflict_type.replace('_', ' ')} conflict detected`,
          severity: this.getConflictSeverity(conflict.conflict_type),
          suggested_resolution:
            conflict.suggested_solutions?.[0]?.description ||
            'Contact planner for resolution',
        })),
        calendar_view: {
          month: targetMonth,
          year: targetYear,
          events_by_date: eventsByDate,
          busy_dates: busyDates,
          available_dates: availableDates,
        },
      };
    } catch (error) {
      console.error('Failed to get supplier schedule overview:', error);
      throw error;
    }
  }

  /**
   * Get supplier communication hub
   */
  static async getSupplierCommunicationHub(
    supplierId: string,
    organizationId: string,
  ): Promise<SupplierCommunicationHub> {
    try {
      const supabase = await createClient();

      // Get active conversations
      const { data: conversations } = await supabase
        .from('supplier_conversations')
        .select(
          `
          id, wedding_id, status, priority, updated_at,
          wedding:weddings(couple_names, planner_name),
          last_message:supplier_messages(content, sender, created_at),
          unread_count
        `,
        )
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .in('status', ['active', 'pending'])
        .order('updated_at', { ascending: false });

      // Get pending feedback requests
      const { data: feedbackRequests } = await supabase
        .from('supplier_schedule_feedback')
        .select(
          `
          id, schedule_event_id, feedback_type, submitted_at, status, priority,
          schedule_event:supplier_schedule_events(
            title,
            wedding:weddings(couple_names)
          )
        `,
        )
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'reviewing'])
        .order('submitted_at', { ascending: false });

      // Get recent announcements
      const { data: announcements } = await supabase
        .from('organization_announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .or('target_audience.cs.{suppliers},target_audience.cs.{all}')
        .gte('expires_at', new Date().toISOString())
        .order('published_at', { ascending: false });

      return {
        conversations: (conversations || []).map((conv) => ({
          id: conv.id,
          wedding_id: conv.wedding_id,
          couple_names: conv.wedding.couple_names,
          planner_name: conv.wedding.planner_name,
          last_message: {
            content: conv.last_message?.content || '',
            sender: conv.last_message?.sender || '',
            sent_at: conv.last_message?.created_at
              ? new Date(conv.last_message.created_at)
              : new Date(),
          },
          unread_count: conv.unread_count || 0,
          priority: conv.priority,
          status: conv.status,
        })),

        feedback_requests: (feedbackRequests || []).map((req) => ({
          id: req.id,
          schedule_event_id: req.schedule_event_id,
          event_title: req.schedule_event.title,
          couple_names: req.schedule_event.wedding.couple_names,
          request_type: req.feedback_type,
          submitted_at: new Date(req.submitted_at),
          status: req.status,
          priority: req.priority,
        })),

        announcements: (announcements || []).map((ann) => ({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          type: ann.type,
          published_at: new Date(ann.published_at),
          expires_at: ann.expires_at ? new Date(ann.expires_at) : undefined,
          read: false, // You'd track this in a separate table
        })),
      };
    } catch (error) {
      console.error('Failed to get supplier communication hub:', error);
      throw error;
    }
  }

  /**
   * Update supplier profile
   */
  static async updateSupplierProfile(
    supplierId: string,
    organizationId: string,
    updates: {
      profile_picture?: string;
      phone?: string;
      address?: string;
      emergency_contact?: {
        name: string;
        phone: string;
        relationship: string;
      };
      notification_preferences?: {
        email_notifications?: boolean;
        sms_notifications?: boolean;
        push_notifications?: boolean;
        notification_frequency?: 'immediate' | 'daily' | 'weekly';
        notification_types?: string[];
      };
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      // Update portal user record
      const { error } = await supabase
        .from('supplier_portal_users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update supplier profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Profile update failed',
      };
    }
  }

  /**
   * Mark notifications as read
   */
  static async markNotificationsAsRead(
    supplierId: string,
    organizationId: string,
    notificationIds: string[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('supplier_notifications')
        .update({ read: true })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .in('id', notificationIds);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update notifications',
      };
    }
  }

  // Private helper methods

  private static async calculateSupplierStatistics(
    supplierId: string,
    organizationId: string,
  ): Promise<SupplierDashboard['statistics']> {
    try {
      const supabase = await createClient();

      // Get total weddings worked on
      const { count: totalWeddings } = await supabase
        .from('supplier_schedule_events')
        .select('wedding_id', { count: 'exact' })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId);

      // Get completed events
      const { count: completedEvents } = await supabase
        .from('supplier_schedule_events')
        .select('*', { count: 'exact' })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .eq('status', 'completed');

      // Get upcoming events
      const { count: upcomingEvents } = await supabase
        .from('supplier_schedule_events')
        .select('*', { count: 'exact' })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled');

      // Get pending feedback
      const { count: pendingFeedback } = await supabase
        .from('supplier_schedule_feedback')
        .select('*', { count: 'exact' })
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      return {
        total_weddings: totalWeddings || 0,
        completed_events: completedEvents || 0,
        upcoming_events: upcomingEvents || 0,
        pending_feedback: pendingFeedback || 0,
        response_rate: 85, // Would calculate from feedback response data
        average_rating: 4.2, // Would calculate from feedback ratings
      };
    } catch (error) {
      console.error('Failed to calculate supplier statistics:', error);
      return {
        total_weddings: 0,
        completed_events: 0,
        upcoming_events: 0,
        pending_feedback: 0,
        response_rate: 0,
        average_rating: 0,
      };
    }
  }

  private static generateQuickActions(
    supplierId: string,
    organizationId: string,
  ): SupplierDashboard['quick_actions'] {
    return [
      {
        title: 'View Schedule',
        description: 'See your upcoming wedding events',
        icon: 'calendar',
        action_url: `/portal/schedule`,
        enabled: true,
      },
      {
        title: 'Submit Feedback',
        description: 'Report conflicts or provide suggestions',
        icon: 'message-circle',
        action_url: `/portal/feedback`,
        enabled: true,
      },
      {
        title: 'Communications',
        description: 'Chat with couples and planners',
        icon: 'mail',
        action_url: `/portal/communications`,
        enabled: true,
      },
      {
        title: 'Documents',
        description: 'Access contracts and event details',
        icon: 'file-text',
        action_url: `/portal/documents`,
        enabled: true,
      },
      {
        title: 'Profile Settings',
        description: 'Update your profile and preferences',
        icon: 'settings',
        action_url: `/portal/settings`,
        enabled: true,
      },
    ];
  }

  private static getConflictStatus(
    eventId: string,
    conflicts: any[],
  ): 'none' | 'potential' | 'confirmed' {
    const eventConflicts = conflicts.filter(
      (c) => c.schedule_event_id === eventId,
    );
    if (eventConflicts.length === 0) return 'none';

    const hasConfirmed = eventConflicts.some((c) => c.status === 'confirmed');
    return hasConfirmed ? 'confirmed' : 'potential';
  }

  private static getConflictSeverity(
    conflictType: string,
  ): 'low' | 'medium' | 'high' {
    switch (conflictType) {
      case 'double_booking':
      case 'equipment_conflict':
        return 'high';
      case 'travel_time':
        return 'medium';
      default:
        return 'low';
    }
  }
}
