/**
 * WS-205 Broadcast Manager - Core broadcast management service
 * Wedding industry-specific broadcast targeting and delivery management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export interface BroadcastTargeting {
  segments?: string[];
  userIds?: string[];
  roles?: string[];
  tiers?: string[];
  weddingIds?: string[];
}

export interface WeddingContext {
  weddingId: string;
  coupleName: string;
  weddingDate: string;
}

export interface BroadcastUser {
  userId: string;
  role: string;
  tier: string;
  weddingAccess: string[];
}

export class BroadcastManager {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Determine target users based on broadcast targeting criteria
   */
  async getTargetedUsers(
    targeting: BroadcastTargeting,
    weddingId?: string,
  ): Promise<string[]> {
    let query = this.supabase
      .from('user_profiles')
      .select('user_id, role, subscription_tier');

    // Apply role-based targeting
    if (targeting.roles && targeting.roles.length > 0) {
      query = query.in('role', targeting.roles);
    }

    // Apply tier-based targeting
    if (targeting.tiers && targeting.tiers.length > 0) {
      query = query.in('subscription_tier', targeting.tiers);
    }

    const { data: users, error } = await query;

    if (error || !users) {
      console.error('Failed to get targeted users:', error);
      return [];
    }

    let targetUsers = users.map((u) => u.user_id);

    // Apply specific user targeting
    if (targeting.userIds && targeting.userIds.length > 0) {
      targetUsers = targetUsers.filter((userId) =>
        targeting.userIds!.includes(userId),
      );
    }

    // Apply wedding context filtering
    if (targeting.weddingIds && targeting.weddingIds.length > 0) {
      const { data: weddingTeam } = await this.supabase
        .from('wedding_team')
        .select('user_id')
        .in('wedding_id', targeting.weddingIds);

      const weddingUsers = weddingTeam?.map((wt) => wt.user_id) || [];
      targetUsers = targetUsers.filter((userId) =>
        weddingUsers.includes(userId),
      );
    }

    // Apply segment-based targeting
    if (targeting.segments && targeting.segments.length > 0) {
      const segmentUsers = await this.getUsersFromSegments(targeting.segments);
      targetUsers = targetUsers.filter((userId) =>
        segmentUsers.includes(userId),
      );
    }

    return [...new Set(targetUsers)]; // Remove duplicates
  }

  /**
   * Get users matching broadcast segments
   */
  private async getUsersFromSegments(
    segmentNames: string[],
  ): Promise<string[]> {
    const { data: segments } = await this.supabase
      .from('broadcast_segments')
      .select('criteria')
      .in('name', segmentNames)
      .eq('is_active', true);

    if (!segments || segments.length === 0) {
      return [];
    }

    const allUsers = new Set<string>();

    for (const segment of segments) {
      const users = await this.getUsersMatchingCriteria(segment.criteria);
      users.forEach((userId) => allUsers.add(userId));
    }

    return Array.from(allUsers);
  }

  /**
   * Get users matching specific segment criteria
   */
  private async getUsersMatchingCriteria(criteria: any): Promise<string[]> {
    let query = this.supabase
      .from('user_profiles')
      .select('user_id, role, subscription_tier');

    // Role-based criteria
    if (criteria.roles) {
      query = query.in('role', criteria.roles);
    }

    // Tier-based criteria
    if (criteria.tiers) {
      query = query.in('subscription_tier', criteria.tiers);
    }

    const { data: users } = await query;

    if (!users) return [];

    let matchedUsers = users.map((u) => u.user_id);

    // Wedding status criteria
    if (criteria.weddingStatus) {
      const { data: weddings } = await this.supabase
        .from('weddings')
        .select(
          `
          wedding_team!inner(user_id)
        `,
        )
        .in('status', criteria.weddingStatus);

      if (weddings) {
        const weddingUsers = weddings.flatMap((w) =>
          w.wedding_team.map((wt: any) => wt.user_id),
        );
        matchedUsers = matchedUsers.filter((userId) =>
          weddingUsers.includes(userId),
        );
      }
    }

    return matchedUsers;
  }

  /**
   * Queue broadcast for delivery to target users
   */
  async queueBroadcast(
    broadcastId: string,
    targetUsers: string[],
  ): Promise<void> {
    if (targetUsers.length === 0) return;

    const deliveryRecords = targetUsers.map((userId) => ({
      broadcast_id: broadcastId,
      user_id: userId,
      delivery_channel: 'realtime' as const,
      delivery_status: 'pending' as const,
      delivered_at: new Date().toISOString(),
      wedding_context_match: false, // Will be updated based on actual context
    }));

    // Batch insert delivery records
    const batchSize = 100;
    for (let i = 0; i < deliveryRecords.length; i += batchSize) {
      const batch = deliveryRecords.slice(i, i + batchSize);

      const { error } = await this.supabase
        .from('broadcast_deliveries')
        .upsert(batch, {
          onConflict: 'broadcast_id,user_id,delivery_channel',
        });

      if (error) {
        console.error(
          `Failed to queue broadcast batch ${i}-${i + batchSize}:`,
          error,
        );
      }
    }
  }

  /**
   * Get user's broadcast preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    const { data: preferences } = await this.supabase
      .from('broadcast_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return (
      preferences || {
        system_broadcasts: true,
        business_broadcasts: true,
        collaboration_broadcasts: true,
        wedding_broadcasts: true,
        critical_only: false,
        delivery_channels: ['realtime', 'in_app'],
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: 'UTC',
      }
    );
  }

  /**
   * Check if user should receive broadcast based on preferences
   */
  async shouldReceiveBroadcast(
    userId: string,
    broadcastType: string,
    priority: string,
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    // Always send critical broadcasts
    if (priority === 'critical') {
      return true;
    }

    // Check if user wants only critical broadcasts
    if (preferences.critical_only) {
      return false;
    }

    // Check specific broadcast type preferences
    if (
      broadcastType.startsWith('maintenance.') &&
      !preferences.system_broadcasts
    ) {
      return false;
    }

    if (broadcastType.startsWith('tier.') && !preferences.business_broadcasts) {
      return false;
    }

    if (
      broadcastType.startsWith('journey.') &&
      !preferences.collaboration_broadcasts
    ) {
      return false;
    }

    if (
      broadcastType.startsWith('wedding.') &&
      !preferences.wedding_broadcasts
    ) {
      return false;
    }

    // Check quiet hours
    if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const now = new Date();
      const userTime = new Date(
        now.toLocaleString('en-US', {
          timeZone: preferences.timezone || 'UTC',
        }),
      );

      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = preferences.quiet_hours_start
        .split(':')
        .map(Number);
      const [endHour, endMinute] = preferences.quiet_hours_end
        .split(':')
        .map(Number);

      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        if (currentTime >= startTime || currentTime <= endTime) {
          return priority === 'critical'; // Only critical during quiet hours
        }
      } else {
        if (currentTime >= startTime && currentTime <= endTime) {
          return priority === 'critical';
        }
      }
    }

    return true;
  }

  /**
   * Update broadcast analytics
   */
  async updateAnalytics(
    broadcastId: string,
    metrics: {
      total_delivered?: number;
      total_read?: number;
      total_acknowledged?: number;
      total_action_clicked?: number;
    },
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.supabase.from('broadcast_analytics').upsert(
      {
        broadcast_id: broadcastId,
        calculated_at: new Date().toISOString(),
        ...metrics,
      },
      {
        onConflict: 'broadcast_id,calculated_at',
      },
    );
  }

  /**
   * Cleanup old broadcasts and deliveries
   */
  async cleanupExpiredBroadcasts(): Promise<number> {
    const { data } = await this.supabase.rpc('cleanup_expired_broadcasts');
    return data || 0;
  }
}
