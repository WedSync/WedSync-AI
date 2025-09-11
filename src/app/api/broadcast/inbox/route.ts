/**
 * WS-205 Broadcast Inbox API Endpoint
 * User inbox with advanced filtering, pagination, and wedding context awareness
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { BroadcastManager } from '@/lib/broadcast/broadcast-manager';

const inboxQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  priority: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(',')
            .filter((p) => ['critical', 'high', 'normal', 'low'].includes(p))
        : undefined,
    ),
  type: z.string().optional(),
  search: z.string().optional(),
  weddingId: z.string().uuid().optional(),
  category: z
    .enum(['system', 'business', 'collaboration', 'wedding'])
    .optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val) : 50;
      return Math.min(Math.max(parsed, 1), 100); // Limit between 1 and 100
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 0)),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const filters = inboxQuerySchema.parse(queryParams);

    // Get user preferences to apply filtering
    const broadcastManager = new BroadcastManager(supabase);
    const userPreferences = await broadcastManager.getUserPreferences(user.id);

    // Build base query with RLS automatically filtering to user's deliveries
    let query = supabase
      .from('broadcast_deliveries')
      .select(
        `
        id,
        delivered_at,
        read_at,
        acknowledged_at,
        delivery_channel,
        wedding_context_match,
        broadcast:broadcasts!inner (
          id,
          type,
          priority,
          title,
          message,
          action_label,
          action_url,
          expires_at,
          wedding_context,
          created_at,
          status
        )
      `,
      )
      .eq('user_id', user.id)
      .order('delivered_at', { ascending: false });

    // Apply unread filter
    if (filters.unreadOnly) {
      query = query.is('read_at', null);
    }

    // Apply date filters
    if (filters.dateFrom) {
      query = query.gte('delivered_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('delivered_at', filters.dateTo);
    }

    // Execute query with pagination
    const {
      data: deliveries,
      error: queryError,
      count,
    } = await query.range(filters.offset, filters.offset + filters.limit - 1);

    if (queryError) {
      console.error('Inbox query error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch inbox' },
        { status: 500 },
      );
    }

    // Apply client-side filters for complex criteria
    let filteredDeliveries = deliveries || [];

    // Priority filtering
    if (filters.priority && filters.priority.length > 0) {
      filteredDeliveries = filteredDeliveries.filter((delivery) =>
        filters.priority!.includes(delivery.broadcast.priority),
      );
    }

    // Type filtering (partial match)
    if (filters.type) {
      filteredDeliveries = filteredDeliveries.filter((delivery) =>
        delivery.broadcast.type.includes(filters.type!),
      );
    }

    // Wedding context filtering
    if (filters.weddingId) {
      filteredDeliveries = filteredDeliveries.filter(
        (delivery) =>
          delivery.broadcast.wedding_context?.weddingId === filters.weddingId,
      );
    }

    // Category filtering based on broadcast type
    if (filters.category) {
      filteredDeliveries = filteredDeliveries.filter((delivery) => {
        const type = delivery.broadcast.type;
        switch (filters.category) {
          case 'system':
            return (
              type.startsWith('maintenance.') ||
              type.startsWith('security.') ||
              type.startsWith('feature.')
            );
          case 'business':
            return (
              type.startsWith('tier.') ||
              type.startsWith('payment.') ||
              type.startsWith('trial.')
            );
          case 'collaboration':
            return (
              type.startsWith('journey.') ||
              type.startsWith('form.') ||
              type.startsWith('supplier.')
            );
          case 'wedding':
            return (
              type.startsWith('wedding.') ||
              type.startsWith('timeline.') ||
              type.startsWith('coordinator.')
            );
          default:
            return true;
        }
      });
    }

    // Search filtering (title and message)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredDeliveries = filteredDeliveries.filter(
        (delivery) =>
          delivery.broadcast.title.toLowerCase().includes(searchTerm) ||
          delivery.broadcast.message.toLowerCase().includes(searchTerm),
      );
    }

    // Filter out expired broadcasts
    const now = new Date();
    filteredDeliveries = filteredDeliveries.filter(
      (delivery) =>
        !delivery.broadcast.expires_at ||
        new Date(delivery.broadcast.expires_at) > now,
    );

    // Apply user preferences filtering
    filteredDeliveries = filteredDeliveries.filter((delivery) => {
      const type = delivery.broadcast.type;

      // System broadcasts preference
      if (
        type.startsWith('maintenance.') ||
        type.startsWith('security.') ||
        type.startsWith('feature.')
      ) {
        if (!userPreferences.system_broadcasts) return false;
      }

      // Business broadcasts preference
      if (
        type.startsWith('tier.') ||
        type.startsWith('payment.') ||
        type.startsWith('trial.')
      ) {
        if (!userPreferences.business_broadcasts) return false;
      }

      // Collaboration broadcasts preference
      if (
        type.startsWith('journey.') ||
        type.startsWith('form.') ||
        type.startsWith('supplier.')
      ) {
        if (!userPreferences.collaboration_broadcasts) return false;
      }

      // Wedding broadcasts preference
      if (
        type.startsWith('wedding.') ||
        type.startsWith('timeline.') ||
        type.startsWith('coordinator.')
      ) {
        if (!userPreferences.wedding_broadcasts) return false;
      }

      // Critical-only preference
      if (
        userPreferences.critical_only &&
        delivery.broadcast.priority !== 'critical'
      ) {
        return false;
      }

      return true;
    });

    // Format broadcasts for client consumption
    const broadcasts = filteredDeliveries.map((delivery) => ({
      id: delivery.broadcast.id,
      type: delivery.broadcast.type,
      priority: delivery.broadcast.priority,
      title: delivery.broadcast.title,
      message: delivery.broadcast.message,
      action: delivery.broadcast.action_label
        ? {
            label: delivery.broadcast.action_label,
            url: delivery.broadcast.action_url,
          }
        : null,
      deliveredAt: delivery.delivered_at,
      readAt: delivery.read_at,
      acknowledgedAt: delivery.acknowledged_at,
      expiresAt: delivery.broadcast.expires_at,
      weddingContext: delivery.broadcast.wedding_context || null,
      deliveryChannel: delivery.delivery_channel,
      category: getCategoryFromType(delivery.broadcast.type),
      isExpired: delivery.broadcast.expires_at
        ? new Date(delivery.broadcast.expires_at) <= now
        : false,
      weddingContextMatch: delivery.wedding_context_match,
    }));

    // Get comprehensive unread counts by category
    const { data: allDeliveries } = await supabase
      .from('broadcast_deliveries')
      .select(
        `
        read_at,
        broadcast!inner(type, priority, expires_at)
      `,
      )
      .eq('user_id', user.id)
      .is('read_at', null);

    const unreadCounts = {
      total: 0,
      critical: 0,
      system: 0,
      business: 0,
      collaboration: 0,
      wedding: 0,
    };

    allDeliveries?.forEach((delivery) => {
      // Skip expired broadcasts
      if (
        delivery.broadcast.expires_at &&
        new Date(delivery.broadcast.expires_at) <= now
      ) {
        return;
      }

      unreadCounts.total++;

      if (delivery.broadcast.priority === 'critical') {
        unreadCounts.critical++;
      }

      const category = getCategoryFromType(delivery.broadcast.type);
      if (category in unreadCounts) {
        unreadCounts[category as keyof typeof unreadCounts]++;
      }
    });

    // Get user's wedding contexts for additional metadata
    const { data: weddingContexts } = await supabase
      .from('wedding_team')
      .select(
        `
        wedding:weddings!inner(
          id,
          couple_name,
          wedding_date,
          status
        )
      `,
      )
      .eq('user_id', user.id)
      .eq('is_active', true);

    return NextResponse.json({
      broadcasts,
      pagination: {
        offset: filters.offset,
        limit: filters.limit,
        total: count || 0,
        hasMore: filters.offset + filters.limit < (count || 0),
        filtered: filteredDeliveries.length,
      },
      unreadCounts,
      filters: {
        applied: {
          unreadOnly: filters.unreadOnly,
          priority: filters.priority,
          type: filters.type,
          weddingId: filters.weddingId,
          category: filters.category,
          search: filters.search,
          dateRange:
            filters.dateFrom || filters.dateTo
              ? {
                  from: filters.dateFrom,
                  to: filters.dateTo,
                }
              : null,
        },
      },
      weddingContexts:
        weddingContexts?.map((wc) => ({
          id: wc.wedding.id,
          coupleName: wc.wedding.couple_name,
          weddingDate: wc.wedding.wedding_date,
          status: wc.wedding.status,
        })) || [],
      userPreferences: {
        criticalOnly: userPreferences.critical_only,
        categories: {
          system: userPreferences.system_broadcasts,
          business: userPreferences.business_broadcasts,
          collaboration: userPreferences.collaboration_broadcasts,
          wedding: userPreferences.wedding_broadcasts,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error('Inbox API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Helper function to categorize broadcast types
 */
function getCategoryFromType(type: string): string {
  if (
    type.startsWith('maintenance.') ||
    type.startsWith('security.') ||
    type.startsWith('feature.')
  ) {
    return 'system';
  }
  if (
    type.startsWith('tier.') ||
    type.startsWith('payment.') ||
    type.startsWith('trial.')
  ) {
    return 'business';
  }
  if (
    type.startsWith('journey.') ||
    type.startsWith('form.') ||
    type.startsWith('supplier.')
  ) {
    return 'collaboration';
  }
  if (
    type.startsWith('wedding.') ||
    type.startsWith('timeline.') ||
    type.startsWith('coordinator.')
  ) {
    return 'wedding';
  }
  return 'other';
}
