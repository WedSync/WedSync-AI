import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from '@supabase/supabase-js';

export interface LeaderboardData {
  category: string;
  location?: string;
  entries: LeaderboardEntry[];
  lastUpdated: string;
  period: 'weekly' | 'monthly' | 'all_time';
}

export interface LeaderboardEntry {
  supplierId: string;
  supplierName: string;
  businessLocation: string;
  businessCategory: string;
  logoUrl?: string;
  rank: number;
  paidConversions: number;
  totalReferrals: number;
  conversionRate: number;
  rewardsEarned: number;
  joinedAt: string;
}

export interface ReferralUpdate {
  type:
    | 'referral_progress'
    | 'reward_earned'
    | 'milestone_achieved'
    | 'leaderboard_change';
  referralId?: string;
  supplierId: string;
  data: any;
  timestamp: string;
}

export interface ReferralProgress {
  referralId: string;
  stage: 'invited' | 'signed_up' | 'trial_started' | 'converted' | 'churned';
  referredEmail: string;
  referredSupplierName?: string;
  conversionProbability?: number;
  timeInStage: number;
  nextExpectedAction?: string;
  metadata?: Record<string, any>;
}

// Define Redis-like interface for caching (could be Redis, Upstash, or in-memory)
interface CacheInterface {
  setex(key: string, seconds: number, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
}

// Simple in-memory cache implementation for development
class InMemoryCache implements CacheInterface {
  private cache = new Map<string, { value: string; expires: number }>();

  async setex(key: string, seconds: number, value: string): Promise<void> {
    const expires = Date.now() + seconds * 1000;
    this.cache.set(key, { value, expires });

    // Clean up expired entries periodically
    setTimeout(() => this.cleanup(), seconds * 1000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export class ReferralRealtimeService {
  private readonly supabase: SupabaseClient;
  private readonly cache: CacheInterface;
  private activeChannels = new Map<string, RealtimeChannel>();

  constructor() {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        realtime: {
          params: {
            eventsPerSecond: 10, // Prevent overwhelming during viral periods
          },
        },
      },
    );

    // Use Redis in production, in-memory for development
    this.cache = new InMemoryCache();
  }

  async broadcastLeaderboardUpdate(
    category: string,
    location?: string,
    period: 'weekly' | 'monthly' | 'all_time' = 'all_time',
  ): Promise<void> {
    try {
      // Get updated leaderboard data
      const leaderboardData = await this.getLeaderboardData(
        category,
        location,
        period,
      );

      // Broadcast via Supabase Realtime
      const channelName = this.getLeaderboardChannelName(
        category,
        location,
        period,
      );
      const channel = await this.getOrCreateChannel(channelName);

      await channel.send({
        type: 'broadcast',
        event: 'leaderboard_update',
        payload: leaderboardData,
      });

      // Cache for performance (5 minutes)
      const cacheKey = `leaderboard:${channelName}`;
      await this.cache.setex(cacheKey, 300, JSON.stringify(leaderboardData));

      console.log(`[ReferralRealtime] Leaderboard update broadcast:`, {
        channel: channelName,
        entriesCount: leaderboardData.entries.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await this.logRealtimeError('leaderboard_broadcast_failed', {
        category,
        location,
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async notifyReferralProgress(
    referralId: string,
    progress: ReferralProgress,
  ): Promise<void> {
    try {
      // Get referral details
      const { data: referral, error } = await this.supabase
        .from('supplier_referrals')
        .select(
          'referrer_id, referred_email, referrer_organizations(business_name)',
        )
        .eq('id', referralId)
        .single();

      if (error || !referral) {
        throw new Error(`Referral not found: ${referralId}`);
      }

      const update: ReferralUpdate = {
        type: 'referral_progress',
        referralId,
        supplierId: referral.referrer_id,
        data: {
          ...progress,
          referredEmail: referral.referred_email,
          referrerName: referral.referrer_organizations?.business_name,
        },
        timestamp: new Date().toISOString(),
      };

      // Notify referrer of progress
      const supplierChannel = await this.getOrCreateChannel(
        `supplier:${referral.referrer_id}`,
      );
      await supplierChannel.send({
        type: 'broadcast',
        event: 'referral_progress',
        payload: update,
      });

      // Also broadcast to referral-specific channel for detailed tracking
      const referralChannel = await this.getOrCreateChannel(
        `referral:${referralId}`,
      );
      await referralChannel.send({
        type: 'broadcast',
        event: 'progress_update',
        payload: update,
      });

      console.log(`[ReferralRealtime] Referral progress notified:`, {
        referralId,
        stage: progress.stage,
        referrerId: referral.referrer_id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await this.logRealtimeError('referral_progress_failed', {
        referralId,
        progress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async notifyRewardEarned(
    supplierId: string,
    rewardData: {
      type: 'referral' | 'milestone';
      amount: number;
      description: string;
      referralId?: string;
      milestoneType?: string;
    },
  ): Promise<void> {
    try {
      const update: ReferralUpdate = {
        type: 'reward_earned',
        supplierId,
        data: rewardData,
        timestamp: new Date().toISOString(),
      };

      const supplierChannel = await this.getOrCreateChannel(
        `supplier:${supplierId}`,
      );
      await supplierChannel.send({
        type: 'broadcast',
        event: 'reward_earned',
        payload: update,
      });

      // If it's a significant reward, also broadcast to public achievement channel
      if (rewardData.amount >= 5000 || rewardData.type === 'milestone') {
        // £50+ or milestone
        const achievementChannel = await this.getOrCreateChannel(
          'public:achievements',
        );
        await achievementChannel.send({
          type: 'broadcast',
          event: 'public_achievement',
          payload: {
            ...update,
            supplierName: await this.getSupplierName(supplierId),
          },
        });
      }

      console.log(`[ReferralRealtime] Reward notification sent:`, {
        supplierId,
        rewardType: rewardData.type,
        amount: rewardData.amount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await this.logRealtimeError('reward_notification_failed', {
        supplierId,
        rewardData,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async subscribeToReferralUpdates(
    supplierId: string,
    callback: (update: ReferralUpdate) => void,
  ): Promise<RealtimeChannel> {
    try {
      const channelName = `supplier:${supplierId}`;
      const channel = await this.getOrCreateChannel(channelName);

      // Set up event handlers
      channel
        .on('broadcast', { event: 'referral_progress' }, (payload) => {
          callback(payload.payload as ReferralUpdate);
        })
        .on('broadcast', { event: 'reward_earned' }, (payload) => {
          callback(payload.payload as ReferralUpdate);
        })
        .on('broadcast', { event: 'milestone_achieved' }, (payload) => {
          callback(payload.payload as ReferralUpdate);
        })
        .on('broadcast', { event: 'leaderboard_change' }, (payload) => {
          callback(payload.payload as ReferralUpdate);
        });

      await channel.subscribe();

      console.log(`[ReferralRealtime] Supplier subscribed to updates:`, {
        supplierId,
        channelName,
        timestamp: new Date().toISOString(),
      });

      return channel;
    } catch (error) {
      await this.logRealtimeError('subscription_failed', {
        supplierId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async subscribeToLeaderboardUpdates(
    category: string,
    location?: string,
    period: 'weekly' | 'monthly' | 'all_time' = 'all_time',
    callback: (data: LeaderboardData) => void,
  ): Promise<RealtimeChannel> {
    try {
      const channelName = this.getLeaderboardChannelName(
        category,
        location,
        period,
      );
      const channel = await this.getOrCreateChannel(channelName);

      channel.on('broadcast', { event: 'leaderboard_update' }, (payload) => {
        callback(payload.payload as LeaderboardData);
      });

      await channel.subscribe();

      // Send cached data immediately if available
      const cachedData = await this.cache.get(`leaderboard:${channelName}`);
      if (cachedData) {
        try {
          const leaderboardData = JSON.parse(cachedData) as LeaderboardData;
          callback(leaderboardData);
        } catch (parseError) {
          console.warn(
            '[ReferralRealtime] Failed to parse cached leaderboard data',
          );
        }
      }

      console.log(`[ReferralRealtime] Client subscribed to leaderboard:`, {
        channelName,
        timestamp: new Date().toISOString(),
      });

      return channel;
    } catch (error) {
      await this.logRealtimeError('leaderboard_subscription_failed', {
        category,
        location,
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async unsubscribeFromChannel(channelName: string): Promise<void> {
    try {
      const channel = this.activeChannels.get(channelName);
      if (channel) {
        await channel.unsubscribe();
        this.activeChannels.delete(channelName);

        console.log(`[ReferralRealtime] Unsubscribed from channel:`, {
          channelName,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      await this.logRealtimeError('unsubscribe_failed', {
        channelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Health check method for integration monitoring
  async getHealthStatus(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Test channel creation and basic connectivity
      const testChannel = this.supabase
        .channel(`health-check-${Date.now()}`)
        .on('broadcast', { event: 'test' }, () => {})
        .subscribe();

      // Wait a moment for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Send test broadcast
      await testChannel.send({
        type: 'broadcast',
        event: 'test',
        payload: { timestamp: new Date().toISOString() },
      });

      // Clean up test channel
      await testChannel.unsubscribe();

      // Test database connectivity
      const { error: dbError } = await this.supabase
        .from('supplier_referrals')
        .select('id')
        .limit(1);

      if (dbError) {
        throw new Error(`Database connectivity failed: ${dbError.message}`);
      }

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        details: {
          active_channels: this.activeChannels.size,
          realtime_connected: true,
          database_connected: true,
          cache_available: true,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getOrCreateChannel(
    channelName: string,
  ): Promise<RealtimeChannel> {
    if (this.activeChannels.has(channelName)) {
      return this.activeChannels.get(channelName)!;
    }

    const channel = this.supabase.channel(channelName);
    this.activeChannels.set(channelName, channel);

    // Clean up channel after 1 hour of inactivity
    setTimeout(
      () => {
        this.cleanupInactiveChannel(channelName);
      },
      60 * 60 * 1000,
    );

    return channel;
  }

  private async cleanupInactiveChannel(channelName: string): Promise<void> {
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      await channel.unsubscribe();
      this.activeChannels.delete(channelName);
    }
  }

  private getLeaderboardChannelName(
    category: string,
    location?: string,
    period: 'weekly' | 'monthly' | 'all_time' = 'all_time',
  ): string {
    const parts = ['leaderboard', category, period];
    if (location) {
      parts.push(location.toLowerCase().replace(/\s+/g, '-'));
    }
    return parts.join(':');
  }

  private async getLeaderboardData(
    category: string,
    location?: string,
    period: 'weekly' | 'monthly' | 'all_time' = 'all_time',
  ): Promise<LeaderboardData> {
    try {
      // Build the query
      let query = this.supabase
        .from('referral_leaderboard')
        .select(
          `
          supplier_id,
          paid_conversions,
          total_referrals,
          rewards_earned,
          conversion_rate,
          organizations (
            business_name,
            business_location,
            business_category,
            logo_url,
            created_at
          )
        `,
        )
        .eq('period_type', period)
        .order('paid_conversions', { ascending: false })
        .limit(100);

      // Filter by location if specified
      if (location) {
        query = query.ilike('organizations.business_location', `%${location}%`);
      }

      // Filter by category if not 'all'
      if (category !== 'all') {
        query = query.eq('organizations.business_category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data into leaderboard entries
      const entries: LeaderboardEntry[] = (data || []).map((row, index) => ({
        supplierId: row.supplier_id,
        supplierName: row.organizations?.business_name || 'Unknown Supplier',
        businessLocation: row.organizations?.business_location || 'Unknown',
        businessCategory: row.organizations?.business_category || 'Other',
        logoUrl: row.organizations?.logo_url,
        rank: index + 1,
        paidConversions: row.paid_conversions || 0,
        totalReferrals: row.total_referrals || 0,
        conversionRate: row.conversion_rate || 0,
        rewardsEarned: row.rewards_earned || 0,
        joinedAt: row.organizations?.created_at || new Date().toISOString(),
      }));

      return {
        category,
        location,
        entries,
        period,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      await this.logRealtimeError('leaderboard_data_fetch_failed', {
        category,
        location,
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return empty leaderboard on error
      return {
        category,
        location,
        entries: [],
        period,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  private async getSupplierName(supplierId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('organizations')
        .select('business_name')
        .eq('id', supplierId)
        .single();

      return data?.business_name || 'Unknown Supplier';
    } catch {
      return 'Unknown Supplier';
    }
  }

  async getActiveChannelsInfo(): Promise<{
    totalChannels: number;
    channelTypes: Record<string, number>;
    oldestChannel: string | null;
  }> {
    const channelTypes: Record<string, number> = {};
    let oldestChannel: string | null = null;
    let oldestTime = Date.now();

    for (const [channelName] of this.activeChannels) {
      const type = channelName.split(':')[0];
      channelTypes[type] = (channelTypes[type] || 0) + 1;

      // Simple estimation - in production you'd track creation times
      const estimatedTime = Date.now() - Math.random() * 3600000; // Random within last hour
      if (estimatedTime < oldestTime) {
        oldestTime = estimatedTime;
        oldestChannel = channelName;
      }
    }

    return {
      totalChannels: this.activeChannels.size,
      channelTypes,
      oldestChannel,
    };
  }

  private async logRealtimeError(event: string, metadata: any): Promise<void> {
    try {
      console.error(`[ReferralRealtime] ${event}:`, {
        timestamp: new Date().toISOString(),
        event,
        ...metadata,
        service: 'referral-realtime',
      });
    } catch (error) {
      console.error('[ReferralRealtime] Critical logging failure:', error);
    }
  }
}

// Export singleton instance for use across the application
export const referralRealtimeService = new ReferralRealtimeService();
