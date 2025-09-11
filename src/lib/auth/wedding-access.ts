/**
 * WS-205 Wedding Access Validation
 * Security validation for wedding-context broadcasts and cross-wedding privacy
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export interface WeddingAccessResult {
  hasAccess: boolean;
  role?: string;
  permissions?: string[];
  restrictionReason?: string;
}

/**
 * Validate if user has access to specific wedding context
 */
export async function validateWeddingAccess(
  userId: string,
  weddingId: string,
): Promise<boolean> {
  try {
    const supabase = createClient();

    // Check if user is part of wedding team
    const { data: teamMember, error } = await supabase
      .from('wedding_team')
      .select(
        `
        role,
        permissions,
        is_active,
        wedding:weddings!inner(
          id,
          status,
          wedding_date
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !teamMember) {
      return false;
    }

    // Check if wedding is active
    if (teamMember.wedding.status === 'cancelled') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Wedding access validation failed:', error);
    return false;
  }
}

/**
 * Get detailed wedding access information for user
 */
export async function getWeddingAccessDetails(
  userId: string,
  weddingId: string,
): Promise<WeddingAccessResult> {
  try {
    const supabase = createClient();

    const { data: teamMember, error } = await supabase
      .from('wedding_team')
      .select(
        `
        role,
        permissions,
        is_active,
        wedding:weddings!inner(
          id,
          status,
          wedding_date,
          privacy_level
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('user_id', userId)
      .single();

    if (error || !teamMember) {
      return {
        hasAccess: false,
        restrictionReason: 'Not a member of wedding team',
      };
    }

    if (!teamMember.is_active) {
      return {
        hasAccess: false,
        restrictionReason: 'Wedding team membership inactive',
      };
    }

    if (teamMember.wedding.status === 'cancelled') {
      return {
        hasAccess: false,
        restrictionReason: 'Wedding has been cancelled',
      };
    }

    // Check if wedding is too far in the past (6 months)
    const weddingDate = new Date(teamMember.wedding.wedding_date);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (
      weddingDate < sixMonthsAgo &&
      teamMember.wedding.status === 'completed'
    ) {
      return {
        hasAccess: false,
        restrictionReason: 'Wedding completed more than 6 months ago',
      };
    }

    return {
      hasAccess: true,
      role: teamMember.role,
      permissions: (teamMember.permissions as string[]) || [],
    };
  } catch (error) {
    console.error('Wedding access details failed:', error);
    return {
      hasAccess: false,
      restrictionReason: 'System error during access validation',
    };
  }
}

/**
 * Check if user can send broadcasts to wedding context
 */
export async function canSendWeddingBroadcast(
  userId: string,
  weddingId: string,
  broadcastType: string,
): Promise<boolean> {
  const accessDetails = await getWeddingAccessDetails(userId, weddingId);

  if (!accessDetails.hasAccess) {
    return false;
  }

  // Role-based broadcast permissions
  const role = accessDetails.role?.toLowerCase();

  // Admins and coordinators can send any broadcast
  if (role === 'admin' || role === 'coordinator') {
    return true;
  }

  // Emergency broadcasts - only coordinators and admins
  if (
    broadcastType.includes('emergency') ||
    broadcastType.includes('handoff') ||
    broadcastType.includes('cancelled')
  ) {
    return role === 'coordinator' || role === 'admin';
  }

  // Timeline changes - coordinators, photographers, venues
  if (broadcastType.includes('timeline')) {
    return ['coordinator', 'photographer', 'venue', 'admin'].includes(
      role || '',
    );
  }

  // General wedding updates - most team members can send
  if (
    broadcastType.includes('wedding.') ||
    broadcastType.includes('supplier.') ||
    broadcastType.includes('couple.')
  ) {
    return [
      'coordinator',
      'photographer',
      'venue',
      'florist',
      'caterer',
      'admin',
    ].includes(role || '');
  }

  return false;
}

/**
 * Get all weddings user has access to
 */
export async function getUserWeddingAccess(userId: string): Promise<
  {
    weddingId: string;
    role: string;
    permissions: string[];
    weddingName: string;
    weddingDate: string;
    status: string;
  }[]
> {
  try {
    const supabase = createClient();

    const { data: weddings, error } = await supabase
      .from('wedding_team')
      .select(
        `
        role,
        permissions,
        wedding:weddings!inner(
          id,
          couple_name,
          wedding_date,
          status
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !weddings) {
      return [];
    }

    return weddings.map((w) => ({
      weddingId: w.wedding.id,
      role: w.role,
      permissions: (w.permissions as string[]) || [],
      weddingName: w.wedding.couple_name,
      weddingDate: w.wedding.wedding_date,
      status: w.wedding.status,
    }));
  } catch (error) {
    console.error('Failed to get user wedding access:', error);
    return [];
  }
}

/**
 * Validate broadcast targeting doesn't cross wedding boundaries
 */
export async function validateBroadcastTargeting(
  senderId: string,
  targeting: {
    weddingIds?: string[];
    userIds?: string[];
  },
): Promise<{
  valid: boolean;
  restrictedWeddings?: string[];
  restrictedUsers?: string[];
  reason?: string;
}> {
  try {
    // Get sender's wedding access
    const senderWeddings = await getUserWeddingAccess(senderId);
    const senderWeddingIds = senderWeddings.map((w) => w.weddingId);

    // Check wedding ID targeting
    if (targeting.weddingIds && targeting.weddingIds.length > 0) {
      const restrictedWeddings = targeting.weddingIds.filter(
        (weddingId) => !senderWeddingIds.includes(weddingId),
      );

      if (restrictedWeddings.length > 0) {
        return {
          valid: false,
          restrictedWeddings,
          reason: 'Cannot target weddings you are not a member of',
        };
      }
    }

    // Check user ID targeting for wedding context
    if (targeting.userIds && targeting.userIds.length > 0) {
      const supabase = createClient();

      // Get wedding contexts for targeted users
      const { data: targetUserWeddings } = await supabase
        .from('wedding_team')
        .select('user_id, wedding_id')
        .in('user_id', targeting.userIds)
        .eq('is_active', true);

      if (targetUserWeddings) {
        const restrictedUsers: string[] = [];

        for (const userWedding of targetUserWeddings) {
          if (!senderWeddingIds.includes(userWedding.wedding_id)) {
            restrictedUsers.push(userWedding.user_id);
          }
        }

        if (restrictedUsers.length > 0) {
          return {
            valid: false,
            restrictedUsers,
            reason: 'Cannot target users from weddings you are not a member of',
          };
        }
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Broadcast targeting validation failed:', error);
    return {
      valid: false,
      reason: 'System error during targeting validation',
    };
  }
}

/**
 * Check if broadcast is allowed on wedding day (Saturday restrictions)
 */
export function isWeddingDayRestricted(
  broadcastType: string,
  priority: string,
): boolean {
  const now = new Date();
  const isSaturday = now.getDay() === 6;

  if (!isSaturday) return false;

  // Critical broadcasts are always allowed
  if (priority === 'critical') return false;

  // Emergency types are always allowed
  if (
    broadcastType.includes('emergency') ||
    broadcastType.includes('handoff') ||
    broadcastType.includes('cancelled')
  ) {
    return false;
  }

  // Non-essential broadcasts are restricted on Saturdays
  if (
    broadcastType.includes('maintenance') ||
    broadcastType.includes('feature') ||
    broadcastType.includes('tier.upgraded')
  ) {
    return true;
  }

  return false;
}

/**
 * Log wedding access violations for security monitoring
 */
export async function logWeddingAccessViolation(
  userId: string,
  weddingId: string,
  attemptedAction: string,
  userAgent?: string,
): Promise<void> {
  console.warn('Wedding access violation:', {
    userId,
    weddingId,
    attemptedAction,
    timestamp: new Date().toISOString(),
    userAgent,
  });

  // In production, this would integrate with security monitoring
  // await securityMonitor.recordAccessViolation({
  //   userId,
  //   resourceType: 'wedding',
  //   resourceId: weddingId,
  //   attemptedAction,
  //   timestamp: new Date(),
  //   userAgent,
  //   severity: 'medium'
  // })
}
