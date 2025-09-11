/**
 * Wedding Party Collaboration Cache
 *
 * Handles multi-user wedding planning with real-time synchronization:
 * - Bride, Groom, Wedding Planner, Family Members collaboration
 * - Shared guest lists, timelines, budgets, checklists
 * - Conflict resolution for simultaneous edits
 * - Role-based permissions and access control
 *
 * Wedding Industry Context:
 * - Average wedding has 4-8 planning participants
 * - Peak editing during engagement period (6-12 months before wedding)
 * - Critical data: guest list (150-300 guests), timeline, budget
 */

import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from '@supabase/supabase-js';
import { VendorCacheManager } from '../integrations/cache/vendor-cache-manager';

export interface PartyMember {
  userId: string;
  role: 'bride' | 'groom' | 'planner' | 'family' | 'vendor';
  name: string;
  email: string;
  permissions: Permission[];
  isActive: boolean;
  lastSeen: string;
}

export interface Permission {
  resource:
    | 'guest_list'
    | 'timeline'
    | 'budget'
    | 'checklist'
    | 'vendor_management';
  actions: ('read' | 'write' | 'delete' | 'approve')[];
}

export interface GuestListEntry {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  relationship: string;
  side: 'bride' | 'groom' | 'both';
  rsvpStatus: 'pending' | 'attending' | 'not_attending';
  addedBy: string;
  lastEditedBy: string;
  updatedAt: string;
}

export interface EditLock {
  resourceType: 'guest_list' | 'checklist' | 'timeline' | 'budget';
  resourceId: string;
  userId: string;
  userName: string;
  lockedAt: string;
  expiresAt: string;
}

export class WeddingPartyCollaborationCache {
  private supabase: SupabaseClient;
  private vendorCacheManager: VendorCacheManager;
  private partyChannels: Map<string, RealtimeChannel> = new Map();
  private editLocks: Map<string, EditLock> = new Map();
  private partyMembers: Map<string, Map<string, PartyMember>> = new Map();

  private readonly LOCK_TIMEOUT = 30000; // 30 seconds

  constructor(vendorCacheManager: VendorCacheManager) {
    this.vendorCacheManager = vendorCacheManager;

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  /**
   * Setup wedding party collaboration
   */
  async setupWeddingPartySync(
    weddingId: string,
    partyMembers: PartyMember[],
  ): Promise<void> {
    const channelName = `wedding_party:${weddingId}`;

    const channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: 'wedding_party' },
      },
    });

    // Setup handlers
    this.setupPartyChannelHandlers(channel, weddingId);

    await channel.subscribe();
    this.partyChannels.set(channelName, channel);

    // Store members
    const membersMap = new Map<string, PartyMember>();
    partyMembers.forEach((member) => membersMap.set(member.userId, member));
    this.partyMembers.set(weddingId, membersMap);

    console.log(`✅ Wedding party setup: ${partyMembers.length} members`);
  }

  /**
   * Setup channel handlers
   */
  private setupPartyChannelHandlers(
    channel: RealtimeChannel,
    weddingId: string,
  ): void {
    channel.on('broadcast', { event: 'guest_list_change' }, async (payload) => {
      await this.handleGuestListChange(weddingId, payload.payload);
    });

    channel.on('broadcast', { event: 'edit_lock_request' }, async (payload) => {
      await this.handleEditLockRequest(weddingId, payload.payload);
    });
  }

  /**
   * Handle guest list changes
   */
  private async handleGuestListChange(
    weddingId: string,
    update: any,
  ): Promise<void> {
    const lockKey = `guest_list:${weddingId}`;
    const existingLock = this.editLocks.get(lockKey);

    if (
      existingLock &&
      existingLock.userId !== update.userId &&
      !this.isLockExpired(existingLock)
    ) {
      await this.handleEditConflict(weddingId, update, existingLock);
      return;
    }

    // Process the update
    console.log(`Processing guest list change for ${weddingId}:`, update);
  }

  /**
   * Request edit lock
   */
  async requestEditLock(
    weddingId: string,
    userId: string,
    resourceType: EditLock['resourceType'],
    resourceId: string,
  ): Promise<boolean> {
    const lockKey = `${resourceType}:${weddingId}:${resourceId}`;
    const existingLock = this.editLocks.get(lockKey);

    if (
      existingLock &&
      !this.isLockExpired(existingLock) &&
      existingLock.userId !== userId
    ) {
      return false;
    }

    const partyMember = this.getPartyMember(weddingId, userId);
    if (!partyMember) return false;

    const lock: EditLock = {
      resourceType,
      resourceId,
      userId,
      userName: partyMember.name,
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.LOCK_TIMEOUT).toISOString(),
    };

    this.editLocks.set(lockKey, lock);

    const channel = this.partyChannels.get(`wedding_party:${weddingId}`);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'edit_lock_acquired',
        payload: { lock },
      });
    }

    return true;
  }

  /**
   * Handle edit conflicts
   */
  private async handleEditConflict(
    weddingId: string,
    update: any,
    existingLock: EditLock,
  ): Promise<void> {
    const conflictingUser = this.getPartyMember(weddingId, update.userId);
    const lockHolder = this.getPartyMember(weddingId, existingLock.userId);

    if (!conflictingUser || !lockHolder) return;

    // Role-based resolution
    if (this.hasHigherPriority(conflictingUser, lockHolder)) {
      await this.forceOverrideLock(weddingId, existingLock, update);
    } else {
      await this.notifyEditConflict(weddingId, update.userId, existingLock);
    }
  }

  /**
   * Check role priority
   */
  private hasHigherPriority(user1: PartyMember, user2: PartyMember): boolean {
    const priority = { planner: 4, bride: 3, groom: 3, family: 2, vendor: 1 };
    return (priority[user1.role] || 0) > (priority[user2.role] || 0);
  }

  /**
   * Get party member
   */
  private getPartyMember(
    weddingId: string,
    userId: string,
  ): PartyMember | undefined {
    return this.partyMembers.get(weddingId)?.get(userId);
  }

  /**
   * Check if lock expired
   */
  private isLockExpired(lock: EditLock): boolean {
    return new Date() > new Date(lock.expiresAt);
  }

  // Handler stubs
  private async handleEditLockRequest(
    weddingId: string,
    payload: any,
  ): Promise<void> {
    console.log('Edit lock request:', payload);
  }

  private async forceOverrideLock(
    weddingId: string,
    existingLock: EditLock,
    update: any,
  ): Promise<void> {
    console.log('Force overriding lock:', existingLock.resourceType);
  }

  private async notifyEditConflict(
    weddingId: string,
    userId: string,
    existingLock: EditLock,
  ): Promise<void> {
    const channel = this.partyChannels.get(`wedding_party:${weddingId}`);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'edit_conflict',
        payload: {
          conflictingUserId: userId,
          lockHolder: existingLock.userName,
          resource: existingLock.resourceType,
        },
      });
    }
  }

  /**
   * Cleanup
   */
  async cleanup(weddingId: string): Promise<void> {
    const channelName = `wedding_party:${weddingId}`;
    const channel = this.partyChannels.get(channelName);

    if (channel) {
      await channel.unsubscribe();
      this.partyChannels.delete(channelName);
    }

    this.partyMembers.delete(weddingId);
  }
}

export default WeddingPartyCollaborationCache;
