/**
 * API Authentication Middleware
 * Provides permission sets and auth validation for API routes
 */

export interface PermissionSet {
  resource: string;
  actions: string[];
  tierRequired?: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
}

// Music API Permissions
export const MUSIC_PERMISSION_SETS: PermissionSet[] = [
  {
    resource: 'music',
    actions: ['read', 'search'],
    tierRequired: 'starter',
  },
  {
    resource: 'music_analysis',
    actions: ['analyze', 'moderate'],
    tierRequired: 'professional',
  },
  {
    resource: 'music_playlist',
    actions: ['create', 'modify', 'share'],
    tierRequired: 'professional',
  },
];

// General API Permissions
export const API_PERMISSION_SETS: PermissionSet[] = [
  {
    resource: 'forms',
    actions: ['create', 'read', 'update', 'delete'],
    tierRequired: 'starter',
  },
  {
    resource: 'clients',
    actions: ['create', 'read', 'update'],
    tierRequired: 'free',
  },
  {
    resource: 'analytics',
    actions: ['read'],
    tierRequired: 'scale',
  },
];

/**
 * Check if user has permission for specific action
 */
export function hasPermission(
  userTier: string,
  resource: string,
  action: string,
  permissionSets: PermissionSet[] = API_PERMISSION_SETS,
): boolean {
  const permission = permissionSets.find((p) => p.resource === resource);
  if (!permission) return false;

  if (!permission.actions.includes(action)) return false;

  if (!permission.tierRequired) return true;

  // Simple tier hierarchy check
  const tierHierarchy = [
    'free',
    'starter',
    'professional',
    'scale',
    'enterprise',
  ];
  const userTierIndex = tierHierarchy.indexOf(userTier);
  const requiredTierIndex = tierHierarchy.indexOf(permission.tierRequired);

  return userTierIndex >= requiredTierIndex;
}

/**
 * Validate user permissions middleware
 */
export function validatePermissions(
  resource: string,
  action: string,
  permissionSets?: PermissionSet[],
) {
  return (userTier: string = 'free') => {
    return hasPermission(userTier, resource, action, permissionSets);
  };
}
