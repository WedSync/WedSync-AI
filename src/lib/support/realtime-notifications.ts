import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database.types';
import { toast } from 'react-hot-toast';

type TicketNotification = {
  id: string;
  type:
    | 'sla_breach'
    | 'wedding_emergency'
    | 'escalation'
    | 'assignment'
    | 'resolution';
  ticket_id: string;
  ticket_title: string;
  customer_name: string;
  customer_tier: string;
  priority: string;
  message: string;
  action_required: boolean;
  created_at: string;
  metadata?: Record<string, any>;
};

type NotificationCallback = (notification: TicketNotification) => void;

class RealtimeNotificationService {
  private supabase;
  private subscribers: Map<string, NotificationCallback[]> = new Map();
  private channel: any;
  private isConnected = false;

  constructor() {
    this.supabase = createClientComponentClient<Database>();
    this.initializeConnection();
  }

  /**
   * Initialize realtime connection to Supabase
   */
  private async initializeConnection() {
    try {
      // Create a channel for support notifications
      this.channel = this.supabase.channel('support_notifications');

      // Listen for ticket updates
      this.channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'support_tickets',
          },
          (payload: any) => {
            this.handleTicketChange(payload);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_sla_tracking',
          },
          (payload: any) => {
            this.handleSlaTracking(payload);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_escalations',
          },
          (payload: any) => {
            this.handleEscalation(payload);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            console.log('Realtime notifications connected');
          }
        });

      // Monitor SLA breaches every 30 seconds
      setInterval(() => {
        this.checkSlaBreaches();
      }, 30000);
    } catch (error) {
      console.error('Failed to initialize realtime notifications:', error);
    }
  }

  /**
   * Handle ticket changes from database
   */
  private async handleTicketChange(payload: any) {
    const { new: newTicket, old: oldTicket, eventType } = payload;

    if (eventType === 'INSERT') {
      // New ticket created
      if (newTicket.is_wedding_emergency) {
        this.sendNotification({
          id: `wedding_emergency_${newTicket.id}`,
          type: 'wedding_emergency',
          ticket_id: newTicket.id,
          ticket_title: newTicket.title,
          customer_name: newTicket.customer_name || 'Unknown',
          customer_tier: newTicket.customer_tier || 'free',
          priority: newTicket.priority,
          message:
            '🚨 WEDDING EMERGENCY: Immediate action required for live wedding event',
          action_required: true,
          created_at: new Date().toISOString(),
          metadata: {
            event_type: 'new_emergency',
            urgency: 'maximum',
          },
        });
      } else if (newTicket.priority === 'urgent') {
        this.sendNotification({
          id: `urgent_ticket_${newTicket.id}`,
          type: 'assignment',
          ticket_id: newTicket.id,
          ticket_title: newTicket.title,
          customer_name: newTicket.customer_name || 'Unknown',
          customer_tier: newTicket.customer_tier || 'free',
          priority: newTicket.priority,
          message: `🔥 New urgent ticket requires immediate attention`,
          action_required: true,
          created_at: new Date().toISOString(),
          metadata: {
            event_type: 'urgent_assignment',
          },
        });
      }
    } else if (eventType === 'UPDATE') {
      // Ticket updated
      if (newTicket.status === 'resolved' && oldTicket.status !== 'resolved') {
        this.sendNotification({
          id: `resolution_${newTicket.id}`,
          type: 'resolution',
          ticket_id: newTicket.id,
          ticket_title: newTicket.title,
          customer_name: newTicket.customer_name || 'Unknown',
          customer_tier: newTicket.customer_tier || 'free',
          priority: newTicket.priority,
          message: `✅ Ticket resolved successfully`,
          action_required: false,
          created_at: new Date().toISOString(),
          metadata: {
            event_type: 'resolution',
            resolution_time: newTicket.resolution_time_hours,
          },
        });
      }

      if (
        newTicket.assigned_agent !== oldTicket.assigned_agent &&
        newTicket.assigned_agent
      ) {
        this.sendNotification({
          id: `assignment_${newTicket.id}`,
          type: 'assignment',
          ticket_id: newTicket.id,
          ticket_title: newTicket.title,
          customer_name: newTicket.customer_name || 'Unknown',
          customer_tier: newTicket.customer_tier || 'free',
          priority: newTicket.priority,
          message: `👤 Ticket assigned to ${newTicket.assigned_agent}`,
          action_required: false,
          created_at: new Date().toISOString(),
          metadata: {
            event_type: 'assignment',
            assigned_to: newTicket.assigned_agent,
          },
        });
      }
    }
  }

  /**
   * Handle SLA tracking changes
   */
  private async handleSlaTracking(payload: any) {
    const slaRecord = payload.new;

    if (slaRecord.status === 'breached') {
      // Fetch ticket details
      const { data: ticket } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('id', slaRecord.ticket_id)
        .single();

      if (ticket) {
        this.sendNotification({
          id: `sla_breach_${ticket.id}`,
          type: 'sla_breach',
          ticket_id: ticket.id,
          ticket_title: ticket.title,
          customer_name: ticket.customer_name || 'Unknown',
          customer_tier: ticket.customer_tier || 'free',
          priority: ticket.priority,
          message: `⏰ SLA BREACH: Response time exceeded for ${ticket.customer_tier.toUpperCase()} customer`,
          action_required: true,
          created_at: new Date().toISOString(),
          metadata: {
            event_type: 'sla_breach',
            breach_type: slaRecord.sla_type,
            time_exceeded: slaRecord.time_to_breach_minutes,
          },
        });
      }
    }
  }

  /**
   * Handle escalations
   */
  private async handleEscalation(payload: any) {
    const escalation = payload.new;

    // Fetch ticket details
    const { data: ticket } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', escalation.ticket_id)
      .single();

    if (ticket) {
      this.sendNotification({
        id: `escalation_${ticket.id}`,
        type: 'escalation',
        ticket_id: ticket.id,
        ticket_title: ticket.title,
        customer_name: ticket.customer_name || 'Unknown',
        customer_tier: ticket.customer_tier || 'free',
        priority: ticket.priority,
        message: `📈 Ticket escalated to ${escalation.escalated_to_role} - ${escalation.reason}`,
        action_required: true,
        created_at: new Date().toISOString(),
        metadata: {
          event_type: 'escalation',
          escalated_to: escalation.escalated_to_role,
          reason: escalation.reason,
        },
      });
    }
  }

  /**
   * Check for SLA breaches proactively
   */
  private async checkSlaBreaches() {
    try {
      const { data: breachingTickets } =
        await this.supabase.rpc('check_sla_breaches');

      if (breachingTickets && breachingTickets.length > 0) {
        for (const ticket of breachingTickets) {
          // Only notify once per breach
          const notificationId = `sla_warning_${ticket.id}`;
          if (!this.hasRecentNotification(notificationId)) {
            this.sendNotification({
              id: notificationId,
              type: 'sla_breach',
              ticket_id: ticket.id,
              ticket_title: ticket.title,
              customer_name: ticket.customer_name || 'Unknown',
              customer_tier: ticket.customer_tier || 'free',
              priority: ticket.priority,
              message: `⚠️ SLA WARNING: Ticket approaching breach in ${ticket.minutes_to_breach} minutes`,
              action_required: true,
              created_at: new Date().toISOString(),
              metadata: {
                event_type: 'sla_warning',
                minutes_to_breach: ticket.minutes_to_breach,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking SLA breaches:', error);
    }
  }

  /**
   * Check if we've sent a similar notification recently
   */
  private hasRecentNotification(notificationId: string): boolean {
    // Simple in-memory cache - in production, use Redis
    const recentNotifications = JSON.parse(
      localStorage.getItem('recent_notifications') || '[]',
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hasRecent = recentNotifications.some(
      (n: any) => n.id === notificationId && new Date(n.timestamp) > oneHourAgo,
    );

    if (!hasRecent) {
      recentNotifications.push({
        id: notificationId,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(
        'recent_notifications',
        JSON.stringify(recentNotifications),
      );
    }

    return hasRecent;
  }

  /**
   * Send notification to all subscribers
   */
  private sendNotification(notification: TicketNotification) {
    // Send to all general subscribers
    const generalSubscribers = this.subscribers.get('all') || [];
    generalSubscribers.forEach((callback) => callback(notification));

    // Send to type-specific subscribers
    const typeSubscribers = this.subscribers.get(notification.type) || [];
    typeSubscribers.forEach((callback) => callback(notification));

    // Show toast notification
    this.showToastNotification(notification);

    // Send browser notification if permitted
    this.sendBrowserNotification(notification);

    // Log notification for debugging
    console.log('Support notification sent:', notification);
  }

  /**
   * Show toast notification
   */
  private showToastNotification(notification: TicketNotification) {
    const toastOptions = {
      duration: notification.action_required ? 8000 : 4000,
      position: 'top-right' as const,
    };

    switch (notification.type) {
      case 'wedding_emergency':
        toast.error(notification.message, {
          ...toastOptions,
          duration: 0, // Don't auto-dismiss emergencies
          icon: '🚨',
        });
        break;
      case 'sla_breach':
        toast.error(notification.message, {
          ...toastOptions,
          icon: '⏰',
        });
        break;
      case 'escalation':
        toast.error(notification.message, {
          ...toastOptions,
          icon: '📈',
        });
        break;
      case 'assignment':
        toast.success(notification.message, {
          ...toastOptions,
          icon: '👤',
        });
        break;
      case 'resolution':
        toast.success(notification.message, {
          ...toastOptions,
          icon: '✅',
        });
        break;
      default:
        toast(notification.message, toastOptions);
    }
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(notification: TicketNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(
        `WedSync Support: ${notification.type.replace('_', ' ').toUpperCase()}`,
        {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          data: notification,
          requireInteraction: notification.action_required,
        },
      );

      browserNotification.onclick = () => {
        window.focus();
        // Navigate to ticket details
        window.location.href = `/admin/support/tickets/${notification.ticket_id}`;
      };
    }
  }

  /**
   * Subscribe to notifications
   */
  public subscribe(
    type:
      | 'all'
      | 'sla_breach'
      | 'wedding_emergency'
      | 'escalation'
      | 'assignment'
      | 'resolution',
    callback: NotificationCallback,
  ): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }

    this.subscribers.get(type)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(type) || [];
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Manually trigger SLA breach check
   */
  public async triggerSlaCheck(): Promise<void> {
    await this.checkSlaBreaches();
  }

  /**
   * Send test notification
   */
  public sendTestNotification(): void {
    this.sendNotification({
      id: 'test_notification',
      type: 'assignment',
      ticket_id: 'test',
      ticket_title: 'Test Ticket',
      customer_name: 'Test Customer',
      customer_tier: 'professional',
      priority: 'medium',
      message: '🧪 Test notification - system is working correctly',
      action_required: false,
      created_at: new Date().toISOString(),
      metadata: {
        event_type: 'test',
      },
    });
  }

  /**
   * Cleanup resources
   */
  public disconnect(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.isConnected = false;
    }
    this.subscribers.clear();
  }
}

// Export singleton instance
export const notificationService = new RealtimeNotificationService();

// Wedding Emergency Alert Hook
export function useWeddingEmergencyAlerts() {
  const [emergencies, setEmergencies] = React.useState<TicketNotification[]>(
    [],
  );

  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(
      'wedding_emergency',
      (notification) => {
        setEmergencies((prev) => [notification, ...prev].slice(0, 10)); // Keep last 10
      },
    );

    return unsubscribe;
  }, []);

  return {
    emergencies,
    clearEmergency: (id: string) => {
      setEmergencies((prev) => prev.filter((e) => e.id !== id));
    },
    clearAllEmergencies: () => setEmergencies([]),
  };
}

// SLA Breach Alert Hook
export function useSlaBreachAlerts() {
  const [breaches, setBreaches] = React.useState<TicketNotification[]>([]);

  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(
      'sla_breach',
      (notification) => {
        setBreaches((prev) => [notification, ...prev].slice(0, 20)); // Keep last 20
      },
    );

    return unsubscribe;
  }, []);

  return {
    breaches,
    clearBreach: (id: string) => {
      setBreaches((prev) => prev.filter((b) => b.id !== id));
    },
    clearAllBreaches: () => setBreaches([]),
  };
}
