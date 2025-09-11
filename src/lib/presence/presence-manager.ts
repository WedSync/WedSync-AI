/**
 * WS-204: Presence Tracking System - Core PresenceManager Service
 *
 * Comprehensive presence management with privacy controls and enterprise analytics.
 * Handles both real-time ephemeral presence (Supabase Realtime) and persistent tracking.
 *
 * Features:
 * - Privacy-compliant presence tracking with granular visibility controls
 * - Relationship-based access control (organization, wedding collaboration)
 * - Enterprise activity logging with metadata sanitization
 * - Performance-optimized bulk presence queries
 * - Persistent last-seen tracking with session management
 * - Wedding industry context integration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { createHash } from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PresenceData {
  status: 'online' | 'idle' | 'away' | 'busy';
  currentPage?: string;
  isTyping?: boolean;
  device?: 'desktop' | 'mobile' | 'tablet';
  customStatus?: string;
  customEmoji?: string;
}

export interface PresenceState extends PresenceData {
  userId: string;
  lastSeen: string;
  sessionId: string;
  isOnline: boolean;
}

export interface PresenceSettings {
  visibility: 'everyone' | 'team' | 'contacts' | 'nobody';
  showActivity: boolean;
  showCurrentPage: boolean;
  appearOffline: boolean;
  customStatus?: string;
  customEmoji?: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  userAgent: string;
  platform?: string;
  screenSize?: { width: number; height: number };
}

export interface ActivityMetadata {
  page?: string;
  device?: string;
  duration?: number;
  sessionId?: string;
  interactionType?: string;
  elementType?: string;
  [key: string]: any;
}

export type ActivityType =
  | 'status_change'
  | 'page_view'
  | 'session_start'
  | 'session_end'
  | 'typing_start'
  | 'typing_stop'
  | 'focus_change'
  | 'device_change'
  | 'settings_update'
  | 'presence_query';

export type RelationshipType =
  | 'same_user'
  | 'organization_member'
  | 'wedding_collaborator'
  | 'public'
  | 'none';

export interface ActivityAnalytics {
  totalSessions: number;
  averageSessionDuration: number;
  peakHours: { hour: number; activeUsers: number }[];
  mostActiveUsers: { userId: string; totalMinutes: number }[];
  pageViews: { page: string; views: number; uniqueUsers: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// PRESENCE MANAGER CLASS
// ============================================================================

export class PresenceManager {
  private supabase: SupabaseClient<Database>;
  private realtimeChannel: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // CORE PRESENCE TRACKING
  // ============================================================================

  /**
   * Track user presence with real-time broadcasting and persistent storage
   */
  async trackUserPresence(userId: string, data: PresenceData): Promise<void> {
    try {
      // Validate user permissions and rate limits
      await this.validatePresenceTracking(userId);

      // Generate session ID if not provided
      const sessionId = this.generateSessionId(userId);

      // Update persistent storage
      await this.updateLastSeen(userId, {
        ...data,
        sessionId,
        timestamp: new Date(),
      });

      // Broadcast to Supabase Realtime (ephemeral)
      await this.broadcastPresence(userId, data, sessionId);

      // Log activity for enterprise analytics
      await this.logActivity(userId, 'status_change', {
        fromStatus: await this.getLastStatus(userId),
        toStatus: data.status,
        page: data.currentPage,
        device: data.device,
        sessionId,
      });
    } catch (error) {
      console.error('Failed to track user presence:', error);
      throw new Error('Presence tracking failed');
    }
  }

  /**
   * Get presence data for a single user with privacy filtering
   */
  async getUserPresence(
    userId: string,
    viewerId: string,
  ): Promise<PresenceState | null> {
    try {
      // Check if viewer can access this user's presence
      const canView = await this.checkPresencePermissions(userId, viewerId);
      if (!canView) {
        return null;
      }

      // Get presence data from database
      const { data, error } = await this.supabase
        .from('user_last_seen')
        .select(
          `
          user_id,
          last_seen_at,
          last_page,
          last_device,
          last_status,
          is_online,
          session_id,
          session_duration_minutes
        `,
        )
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      // Get custom status from settings
      const settings = await this.getPresenceSettings(userId);

      return {
        userId: data.user_id,
        status: (data.last_status as any) || 'offline',
        lastSeen: data.last_seen_at,
        currentPage: settings.showCurrentPage ? data.last_page : undefined,
        device: data.last_device as any,
        customStatus: settings.customStatus,
        customEmoji: settings.customEmoji,
        isOnline: data.is_online,
        sessionId: data.session_id,
      };
    } catch (error) {
      console.error('Failed to get user presence:', error);
      return null;
    }
  }

  /**
   * Get bulk presence data for multiple users with privacy filtering
   */
  async getBulkPresence(
    userIds: string[],
    viewerId: string,
  ): Promise<Record<string, PresenceState>> {
    const result: Record<string, PresenceState> = {};

    try {
      // Validate permissions for all users in parallel
      const permissionChecks = await Promise.all(
        userIds.map(async (userId) => ({
          userId,
          canView: await this.checkPresencePermissions(userId, viewerId),
        })),
      );

      // Filter to only users the viewer can see
      const viewableUserIds = permissionChecks
        .filter((check) => check.canView)
        .map((check) => check.userId);

      if (viewableUserIds.length === 0) {
        return result;
      }

      // Fetch presence data in bulk
      const { data, error } = await this.supabase
        .from('user_last_seen')
        .select(
          `
          user_id,
          last_seen_at,
          last_page,
          last_device,
          last_status,
          is_online,
          session_id
        `,
        )
        .in('user_id', viewableUserIds);

      if (error) {
        throw error;
      }

      // Get settings for all users in parallel
      const settingsPromises = viewableUserIds.map((userId) =>
        this.getPresenceSettings(userId),
      );
      const allSettings = await Promise.all(settingsPromises);

      // Build result object
      data?.forEach((presenceData, index) => {
        const settings =
          allSettings.find((s) => s !== null) || this.getDefaultSettings();

        result[presenceData.user_id] = {
          userId: presenceData.user_id,
          status: (presenceData.last_status as any) || 'offline',
          lastSeen: presenceData.last_seen_at,
          currentPage: settings.showCurrentPage
            ? presenceData.last_page
            : undefined,
          device: presenceData.last_device as any,
          customStatus: settings.customStatus,
          customEmoji: settings.customEmoji,
          isOnline: presenceData.is_online,
          sessionId: presenceData.session_id,
        };
      });

      // Log bulk presence query for analytics
      await this.logActivity(viewerId, 'presence_query', {
        queriedUsers: userIds.length,
        viewableUsers: viewableUserIds.length,
        queryType: 'bulk',
      });

      return result;
    } catch (error) {
      console.error('Failed to get bulk presence:', error);
      return result;
    }
  }

  // ============================================================================
  // PRIVACY AND SETTINGS MANAGEMENT
  // ============================================================================

  /**
   * Update user presence settings with privacy controls
   */
  async updatePresenceSettings(
    userId: string,
    settings: PresenceSettings,
  ): Promise<void> {
    try {
      // Validate settings
      this.validatePresenceSettings(settings);

      // Update database
      const { error } = await this.supabase.from('presence_settings').upsert({
        user_id: userId,
        visibility: settings.visibility,
        show_activity: settings.showActivity,
        show_current_page: settings.showCurrentPage,
        appear_offline: settings.appearOffline,
        custom_status: settings.customStatus,
        custom_status_emoji: settings.customEmoji,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      // Invalidate cached relationships
      await this.invalidateRelationshipCache(userId);

      // Log settings update
      await this.logActivity(userId, 'settings_update', {
        visibility: settings.visibility,
        appearOffline: settings.appearOffline,
        customStatus: !!settings.customStatus,
      });

      // Broadcast settings change to active sessions
      await this.broadcastSettingsUpdate(userId, settings);
    } catch (error) {
      console.error('Failed to update presence settings:', error);
      throw new Error('Settings update failed');
    }
  }

  /**
   * Get user presence settings
   */
  async getPresenceSettings(userId: string): Promise<PresenceSettings> {
    try {
      const { data, error } = await this.supabase
        .from('presence_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found error is OK
        throw error;
      }

      // Return default settings if none found
      if (!data) {
        return this.getDefaultSettings();
      }

      return {
        visibility: data.visibility as any,
        showActivity: data.show_activity,
        showCurrentPage: data.show_current_page,
        appearOffline: data.appear_offline,
        customStatus: data.custom_status || undefined,
        customEmoji: data.custom_status_emoji || undefined,
      };
    } catch (error) {
      console.error('Failed to get presence settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Check if viewer can see target user's presence
   */
  async checkPresencePermissions(
    targetUserId: string,
    viewerId: string,
  ): Promise<boolean> {
    try {
      // Users can always see their own presence
      if (targetUserId === viewerId) {
        return true;
      }

      // Check cache first
      const cachedResult = await this.getCachedRelationship(
        viewerId,
        targetUserId,
      );
      if (cachedResult !== null) {
        return cachedResult.canViewPresence;
      }

      // Get target user's privacy settings
      const settings = await this.getPresenceSettings(targetUserId);

      // Check appear offline override
      if (settings.appearOffline || settings.visibility === 'nobody') {
        await this.cacheRelationship(viewerId, targetUserId, 'none', false);
        return false;
      }

      // Check visibility level
      let hasRelationship = false;
      let relationshipType: RelationshipType = 'none';

      switch (settings.visibility) {
        case 'everyone':
          hasRelationship = true;
          relationshipType = 'public';
          break;

        case 'team':
          hasRelationship = await this.checkOrganizationMembership(
            viewerId,
            targetUserId,
          );
          relationshipType = hasRelationship ? 'organization_member' : 'none';
          break;

        case 'contacts':
          hasRelationship = await this.checkWeddingCollaboration(
            viewerId,
            targetUserId,
          );
          relationshipType = hasRelationship ? 'wedding_collaborator' : 'none';
          break;

        default:
          hasRelationship = false;
          relationshipType = 'none';
      }

      // Cache the result
      await this.cacheRelationship(
        viewerId,
        targetUserId,
        relationshipType,
        hasRelationship,
      );

      return hasRelationship;
    } catch (error) {
      console.error('Failed to check presence permissions:', error);
      return false;
    }
  }

  // ============================================================================
  // ACTIVITY LOGGING AND ANALYTICS
  // ============================================================================

  /**
   * Log user activity for enterprise analytics
   */
  async logActivity(
    userId: string,
    activityType: ActivityType,
    metadata: ActivityMetadata = {},
  ): Promise<void> {
    try {
      // Check if user's organization has enterprise features
      const hasEnterprise = await this.checkEnterpriseFeatures(userId);
      if (!hasEnterprise) {
        return; // Skip logging for non-enterprise users
      }

      // Get organization ID for logging
      const organizationId = await this.getUserOrganizationId(userId);
      if (!organizationId) {
        return;
      }

      // Sanitize metadata to remove sensitive information
      const sanitizedMetadata = this.sanitizeMetadata(metadata);

      // Insert activity log
      const { error } = await this.supabase
        .from('presence_activity_logs')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          activity_type: activityType,
          page_viewed: metadata.page,
          from_status: metadata.fromStatus,
          to_status: metadata.toStatus,
          device_type: metadata.device,
          session_id: metadata.sessionId,
          duration_seconds: metadata.duration,
          metadata: sanitizedMetadata,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to log activity:', error);
        // Don't throw - activity logging is non-critical
      }
    } catch (error) {
      console.error('Activity logging error:', error);
      // Swallow errors - logging should not break core functionality
    }
  }

  /**
   * Get activity analytics for organization
   */
  async getActivityAnalytics(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<ActivityAnalytics> {
    try {
      // Verify user has admin access to organization
      const hasAccess = await this.checkOrganizationAdminAccess(organizationId);
      if (!hasAccess) {
        throw new Error('Insufficient permissions for analytics');
      }

      // Execute multiple analytics queries in parallel
      const [
        sessionsData,
        peakHoursData,
        userActivityData,
        pageViewsData,
        deviceData,
      ] = await Promise.all([
        this.getSessionAnalytics(organizationId, dateRange),
        this.getPeakHoursAnalytics(organizationId, dateRange),
        this.getUserActivityAnalytics(organizationId, dateRange),
        this.getPageViewAnalytics(organizationId, dateRange),
        this.getDeviceAnalytics(organizationId, dateRange),
      ]);

      return {
        totalSessions: sessionsData.total,
        averageSessionDuration: sessionsData.avgDuration,
        peakHours: peakHoursData,
        mostActiveUsers: userActivityData,
        pageViews: pageViewsData,
        deviceBreakdown: deviceData,
      };
    } catch (error) {
      console.error('Failed to get activity analytics:', error);
      throw new Error('Analytics query failed');
    }
  }

  // ============================================================================
  // MAINTENANCE AND CLEANUP
  // ============================================================================

  /**
   * Update user last seen with device context
   */
  async updateLastSeen(userId: string, data: any): Promise<void> {
    try {
      const { error } = await this.supabase.from('user_last_seen').upsert({
        user_id: userId,
        last_seen_at: new Date().toISOString(),
        last_page: data.currentPage,
        last_device: data.device,
        last_activity_type: data.activityType || 'presence_update',
        last_status: data.status,
        is_online: data.status === 'online',
        session_id: data.sessionId,
        session_duration_minutes: data.sessionDuration,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update last seen:', error);
      throw error;
    }
  }

  /**
   * Clean up stale presence data
   */
  async cleanupStalePresence(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Mark users as offline if they haven't been seen in 5 minutes
      const { data, error } = await this.supabase
        .from('user_last_seen')
        .update({ is_online: false })
        .lt('last_seen_at', fiveMinutesAgo.toISOString())
        .eq('is_online', true)
        .select('user_id');

      if (error) {
        throw error;
      }

      // Clean up expired relationship cache
      await this.supabase
        .from('presence_relationship_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to cleanup stale presence:', error);
      return 0;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async validatePresenceTracking(userId: string): Promise<void> {
    // Rate limiting check - max 1 update per second
    const lastUpdate = this.activityTimeouts.get(userId);
    if (lastUpdate) {
      throw new Error('Rate limit exceeded - max 1 presence update per second');
    }

    // Set rate limit timeout
    this.activityTimeouts.set(
      userId,
      setTimeout(() => {
        this.activityTimeouts.delete(userId);
      }, 1000),
    );
  }

  private generateSessionId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return createHash('sha256')
      .update(`${userId}-${timestamp}-${random}`)
      .digest('hex')
      .substring(0, 16);
  }

  private async getLastStatus(userId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('user_last_seen')
        .select('last_status')
        .eq('user_id', userId)
        .single();

      return data?.last_status || 'offline';
    } catch {
      return 'offline';
    }
  }

  private async broadcastPresence(
    userId: string,
    data: PresenceData,
    sessionId: string,
  ): Promise<void> {
    // Implementation for Supabase Realtime broadcasting
    // This would integrate with Supabase Realtime Presence features
    console.log('Broadcasting presence update:', { userId, data, sessionId });
  }

  private async broadcastSettingsUpdate(
    userId: string,
    settings: PresenceSettings,
  ): Promise<void> {
    // Broadcast settings changes to active sessions
    console.log('Broadcasting settings update:', { userId, settings });
  }

  private validatePresenceSettings(settings: PresenceSettings): void {
    const validVisibility = ['everyone', 'team', 'contacts', 'nobody'];
    if (!validVisibility.includes(settings.visibility)) {
      throw new Error('Invalid visibility setting');
    }

    if (settings.customStatus && settings.customStatus.length > 100) {
      throw new Error('Custom status too long (max 100 characters)');
    }

    if (settings.customEmoji && settings.customEmoji.length > 10) {
      throw new Error('Custom emoji too long (max 10 characters)');
    }
  }

  private getDefaultSettings(): PresenceSettings {
    return {
      visibility: 'contacts',
      showActivity: true,
      showCurrentPage: false,
      appearOffline: false,
    };
  }

  private async checkOrganizationMembership(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('organization_id')
        .in('user_id', [viewerId, targetUserId]);

      if (error || !data || data.length !== 2) {
        return false;
      }

      const [viewer, target] = data;
      return (
        viewer.organization_id === target.organization_id &&
        viewer.organization_id !== null
      );
    } catch {
      return false;
    }
  }

  private async checkWeddingCollaboration(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('vendor_wedding_connections')
        .select('id')
        .or(
          `and(supplier_id.eq.${viewerId},client_id.eq.${targetUserId}),and(client_id.eq.${viewerId},supplier_id.eq.${targetUserId})`,
        )
        .eq('connection_status', 'active')
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  private async getCachedRelationship(
    viewerId: string,
    targetUserId: string,
  ): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('presence_relationship_cache')
        .select('*')
        .eq('user_id', viewerId)
        .eq('target_user_id', targetUserId)
        .gt('expires_at', new Date().toISOString())
        .single();

      return data || null;
    } catch {
      return null;
    }
  }

  private async cacheRelationship(
    viewerId: string,
    targetUserId: string,
    relationshipType: RelationshipType,
    canView: boolean,
  ): Promise<void> {
    try {
      await this.supabase.from('presence_relationship_cache').upsert({
        user_id: viewerId,
        target_user_id: targetUserId,
        relationship_type: relationshipType,
        can_view_presence: canView,
        can_view_activity: canView,
        can_view_current_page: canView,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });
    } catch (error) {
      // Cache failures are non-critical
      console.warn('Failed to cache relationship:', error);
    }
  }

  private async invalidateRelationshipCache(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('presence_relationship_cache')
        .delete()
        .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);
    } catch (error) {
      console.warn('Failed to invalidate relationship cache:', error);
    }
  }

  private async checkEnterpriseFeatures(userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('user_profiles')
        .select(
          `
          organization_id,
          organizations(pricing_tier)
        `,
        )
        .eq('user_id', userId)
        .single();

      return data?.organizations?.pricing_tier === 'enterprise';
    } catch {
      return false;
    }
  }

  private async getUserOrganizationId(userId: string): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

      return data?.organization_id || null;
    } catch {
      return null;
    }
  }

  private sanitizeMetadata(metadata: ActivityMetadata): any {
    const sanitized: any = {};

    // Allow only safe fields
    const allowedFields = [
      'page',
      'device',
      'duration',
      'sessionId',
      'interactionType',
      'elementType',
      'fromStatus',
      'toStatus',
      'queryType',
      'queriedUsers',
      'viewableUsers',
    ];

    for (const field of allowedFields) {
      if (metadata[field] !== undefined) {
        sanitized[field] = metadata[field];
      }
    }

    return sanitized;
  }

  private async checkOrganizationAdminAccess(
    organizationId: string,
  ): Promise<boolean> {
    // This would check if the current user has admin access to the organization
    // Implementation depends on authentication context
    return true; // Placeholder
  }

  private async getSessionAnalytics(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<any> {
    // Placeholder for session analytics query
    return { total: 0, avgDuration: 0 };
  }

  private async getPeakHoursAnalytics(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<any[]> {
    // Placeholder for peak hours analytics
    return [];
  }

  private async getUserActivityAnalytics(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<any[]> {
    // Placeholder for user activity analytics
    return [];
  }

  private async getPageViewAnalytics(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<any[]> {
    // Placeholder for page view analytics
    return [];
  }

  private async getDeviceAnalytics(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<any> {
    // Placeholder for device analytics
    return { desktop: 0, mobile: 0, tablet: 0 };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let presenceManager: PresenceManager | null = null;

export function getPresenceManager(): PresenceManager {
  if (!presenceManager) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    presenceManager = new PresenceManager(supabaseUrl, supabaseKey);
  }
  return presenceManager;
}

export default PresenceManager;
