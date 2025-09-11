import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'wedding_day_emergency';
  status:
    | 'new'
    | 'assigned'
    | 'in_progress'
    | 'waiting_for_customer'
    | 'resolved'
    | 'closed';
  category: string;
  wedding_id?: string;
  venue_name?: string;
  location?: string;
  assigned_agent_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  organization_id: string;
  created_by: string;
  voice_note_url?: string;
  attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }>;
  latest_comment?: {
    content: string;
    created_at: string;
    agent_name?: string;
  };
}

export interface SupportTicketUpdate {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: SupportTicket;
  old?: SupportTicket;
}

export interface UseRealtimeTicketsOptions {
  organizationId?: string;
  userId?: string;
  onTicketUpdate?: (update: SupportTicketUpdate) => void;
  onUrgentTicket?: (ticket: SupportTicket) => void;
}

export function useRealtimeTickets({
  organizationId,
  userId,
  onTicketUpdate,
  onUrgentTicket,
}: UseRealtimeTicketsOptions = {}) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = createClientComponentClient();

  // Initialize tickets and setup realtime subscription
  useEffect(() => {
    let isMounted = true;

    const setupRealtimeSubscription = async () => {
      try {
        // Initial load of tickets
        let query = supabase
          .from('support_tickets')
          .select(
            `
            *,
            attachments:support_ticket_attachments(
              id, file_name, file_url, file_type, file_size
            ),
            latest_comment:support_ticket_comments(
              content, created_at,
              agent:support_agents(name)
            )
          `,
          )
          .order('created_at', { ascending: false });

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        if (userId) {
          query = query.eq('created_by', userId);
        }

        const { data: initialTickets, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        if (isMounted) {
          setTickets(initialTickets || []);
          setLoading(false);
        }

        // Setup realtime subscription
        const channelName = organizationId
          ? `support-tickets-${organizationId}`
          : 'support-tickets-all';

        const realtimeChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'support_tickets',
              filter: organizationId
                ? `organization_id=eq.${organizationId}`
                : undefined,
            },
            async (payload) => {
              console.log('Realtime ticket update:', payload);

              const update: SupportTicketUpdate = {
                id: payload.new?.id || payload.old?.id,
                type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                new: payload.new as SupportTicket,
                old: payload.old as SupportTicket,
              };

              // Handle ticket updates
              if (isMounted) {
                handleRealtimeUpdate(update);
              }

              // Call custom update handler
              onTicketUpdate?.(update);

              // Handle urgent tickets
              if (
                payload.eventType === 'INSERT' ||
                payload.eventType === 'UPDATE'
              ) {
                const ticket = payload.new as SupportTicket;
                if (
                  ticket.priority === 'urgent' ||
                  ticket.priority === 'wedding_day_emergency'
                ) {
                  onUrgentTicket?.(ticket);
                  showUrgentNotification(ticket);
                }
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'support_ticket_comments',
              filter: organizationId
                ? `organization_id=eq.${organizationId}`
                : undefined,
            },
            (payload) => {
              // Handle comment updates by refreshing the related ticket
              if (payload.new?.support_ticket_id && isMounted) {
                refreshTicketById(payload.new.support_ticket_id as string);
              }
            },
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            if (isMounted) {
              setIsConnected(status === 'SUBSCRIBED');
            }
          });

        if (isMounted) {
          setChannel(realtimeChannel);
        }
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to setup realtime updates',
          );
          setLoading(false);
        }
      }
    };

    setupRealtimeSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [organizationId, userId, onTicketUpdate, onUrgentTicket]);

  // Handle realtime updates
  const handleRealtimeUpdate = (update: SupportTicketUpdate) => {
    setTickets((current) => {
      switch (update.type) {
        case 'INSERT':
          if (update.new) {
            // Add new ticket to the beginning of the list
            return [update.new, ...current];
          }
          break;

        case 'UPDATE':
          if (update.new) {
            // Update existing ticket
            return current.map((ticket) =>
              ticket.id === update.id ? update.new! : ticket,
            );
          }
          break;

        case 'DELETE':
          // Remove ticket from list
          return current.filter((ticket) => ticket.id !== update.id);

        default:
          break;
      }
      return current;
    });
  };

  // Refresh specific ticket by ID
  const refreshTicketById = async (ticketId: string) => {
    try {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select(
          `
          *,
          attachments:support_ticket_attachments(
            id, file_name, file_url, file_type, file_size
          ),
          latest_comment:support_ticket_comments(
            content, created_at,
            agent:support_agents(name)
          )
        `,
        )
        .eq('id', ticketId)
        .single();

      if (error) throw error;

      if (ticket) {
        setTickets((current) =>
          current.map((t) => (t.id === ticketId ? ticket : t)),
        );
      }
    } catch (err) {
      console.error('Error refreshing ticket:', err);
    }
  };

  // Show urgent notification
  const showUrgentNotification = (ticket: SupportTicket) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title =
        ticket.priority === 'wedding_day_emergency'
          ? '🚨 Wedding Day Emergency!'
          : '⚡ Urgent Support Ticket';

      const body = `${ticket.title}${ticket.venue_name ? ` - ${ticket.venue_name}` : ''}`;

      const notification = new Notification(title, {
        body,
        icon: '/icons/wedding-alert.png',
        badge: '/icons/badge.png',
        tag: `wedding-${ticket.wedding_id || ticket.id}`,
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Ticket' },
          { action: 'call', title: 'Call Support' },
        ],
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to ticket (you'll need to implement this navigation)
        window.location.href = `/support/tickets/${ticket.id}`;
      };
    }
  };

  // Manual refresh
  const refresh = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select(
          `
          *,
          attachments:support_ticket_attachments(
            id, file_name, file_url, file_type, file_size
          ),
          latest_comment:support_ticket_comments(
            content, created_at,
            agent:support_agents(name)
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTickets(data || []);
      setError(null);
    } catch (err) {
      console.error('Error refreshing tickets:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh tickets',
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    tickets,
    loading,
    error,
    isConnected,
    refresh,
    // Utility functions
    getTicketById: (id: string) => tickets.find((t) => t.id === id),
    getUrgentTickets: () =>
      tickets.filter(
        (t) =>
          t.priority === 'urgent' || t.priority === 'wedding_day_emergency',
      ),
    getTicketsByStatus: (status: string) =>
      tickets.filter((t) => t.status === status),
    getWeddingDayTickets: () =>
      tickets.filter((t) => t.priority === 'wedding_day_emergency'),
  };
}
