/**
 * WS-038: Role-Based Navigation Access System
 * Enhanced navigation system with role-specific menu items and permissions
 */

import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog8ToothIcon,
  InboxIcon,
  CalendarIcon,
  FolderIcon,
  MapIcon,
  CpuChipIcon,
  CameraIcon,
  HeartIcon,
  SparklesIcon,
  BellIcon,
  PlusIcon,
} from '@heroicons/react/20/solid';

export type UserRole =
  | 'admin'
  | 'manager'
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'coordinator'
  | 'basic';

export type NavigationPermission =
  | 'view_dashboard'
  | 'manage_clients'
  | 'view_analytics'
  | 'manage_forms'
  | 'manage_vendors'
  | 'view_journeys'
  | 'manage_settings'
  | 'admin_features'
  | 'vendor_portal'
  | 'photo_management'
  | 'venue_management'
  | 'floral_management'
  | 'catering_management'
  | 'coordination_tools';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: NavigationPermission[];
  badge?: number;
  children?: NavigationItem[];
  vendorSpecific?: UserRole[];
  quickAction?: boolean;
  contextAware?: boolean;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  permissions: NavigationPermission[];
  organizationId?: string;
  vendorType?: string;
  activeWedding?: string;
}

const rolePermissions: Record<UserRole, NavigationPermission[]> = {
  admin: [
    'view_dashboard',
    'manage_clients',
    'view_analytics',
    'manage_forms',
    'manage_vendors',
    'view_journeys',
    'manage_settings',
    'admin_features',
  ],
  manager: [
    'view_dashboard',
    'manage_clients',
    'view_analytics',
    'manage_forms',
    'view_journeys',
    'manage_settings',
  ],
  photographer: [
    'view_dashboard',
    'manage_clients',
    'manage_forms',
    'photo_management',
    'coordination_tools',
  ],
  venue: [
    'view_dashboard',
    'manage_clients',
    'manage_forms',
    'venue_management',
    'coordination_tools',
  ],
  florist: [
    'view_dashboard',
    'manage_clients',
    'manage_forms',
    'floral_management',
    'coordination_tools',
  ],
  caterer: [
    'view_dashboard',
    'manage_clients',
    'manage_forms',
    'catering_management',
    'coordination_tools',
  ],
  coordinator: [
    'view_dashboard',
    'manage_clients',
    'view_analytics',
    'manage_forms',
    'view_journeys',
    'coordination_tools',
  ],
  basic: ['view_dashboard', 'manage_forms'],
};

const allNavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    permissions: ['view_dashboard'],
    contextAware: true,
  },
  {
    id: 'clients',
    label: 'Clients',
    href: '/clients',
    icon: UsersIcon,
    permissions: ['manage_clients'],
    children: [
      {
        id: 'clients-list',
        label: 'All Clients',
        href: '/clients',
        icon: UsersIcon,
        permissions: ['manage_clients'],
      },
      {
        id: 'clients-import',
        label: 'Import Clients',
        href: '/clients/import',
        icon: PlusIcon,
        permissions: ['manage_clients'],
      },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendor Directory',
    href: '/vendors',
    icon: BuildingStorefrontIcon,
    permissions: ['manage_vendors'],
  },
  {
    id: 'forms',
    label: 'Forms',
    href: '/forms',
    icon: DocumentTextIcon,
    permissions: ['manage_forms'],
    children: [
      {
        id: 'forms-list',
        label: 'All Forms',
        href: '/forms',
        icon: DocumentTextIcon,
        permissions: ['manage_forms'],
      },
      {
        id: 'forms-builder',
        label: 'Form Builder',
        href: '/forms/builder',
        icon: PlusIcon,
        permissions: ['manage_forms'],
        quickAction: true,
      },
    ],
  },
  {
    id: 'templates',
    label: 'Templates',
    href: '/templates',
    icon: FolderIcon,
    permissions: ['manage_forms'],
  },
  {
    id: 'journeys',
    label: 'Customer Journeys',
    href: '/journeys',
    icon: MapIcon,
    permissions: ['view_journeys'],
    children: [
      {
        id: 'journeys-list',
        label: 'All Journeys',
        href: '/journeys',
        icon: MapIcon,
        permissions: ['view_journeys'],
      },
      {
        id: 'journeys-builder',
        label: 'Journey Builder',
        href: '/journeys/builder',
        icon: PlusIcon,
        permissions: ['view_journeys'],
        quickAction: true,
      },
      {
        id: 'journey-monitor',
        label: 'Journey Monitor',
        href: '/journey-monitor',
        icon: CpuChipIcon,
        permissions: ['view_journeys'],
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    permissions: ['view_analytics'],
  },
  {
    id: 'photo-gallery',
    label: 'Photo Gallery',
    href: '/photos',
    icon: CameraIcon,
    permissions: ['photo_management'],
    vendorSpecific: ['photographer'],
    quickAction: true,
  },
  {
    id: 'venue-setup',
    label: 'Venue Setup',
    href: '/venue/setup',
    icon: BuildingStorefrontIcon,
    permissions: ['venue_management'],
    vendorSpecific: ['venue'],
    quickAction: true,
  },
  {
    id: 'floral-arrangements',
    label: 'Arrangements',
    href: '/flowers/arrange',
    icon: SparklesIcon,
    permissions: ['floral_management'],
    vendorSpecific: ['florist'],
    quickAction: true,
  },
  {
    id: 'catering-menu',
    label: 'Menu Planning',
    href: '/catering/menu',
    icon: HeartIcon,
    permissions: ['catering_management'],
    vendorSpecific: ['caterer'],
    quickAction: true,
  },
  {
    id: 'communications',
    label: 'Messages',
    href: '/communications',
    icon: InboxIcon,
    permissions: ['coordination_tools'],
    badge: 5,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: BellIcon,
    permissions: ['coordination_tools'],
    badge: 3,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: CalendarIcon,
    permissions: ['coordination_tools'],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Cog8ToothIcon,
    permissions: ['manage_settings'],
  },
];

export function getUserPermissions(role: UserRole): NavigationPermission[] {
  return rolePermissions[role] || [];
}

export function hasPermission(
  userPermissions: NavigationPermission[],
  requiredPermissions: NavigationPermission[],
): boolean {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

export function filterNavigationByRole(
  userProfile: UserProfile,
): NavigationItem[] {
  const userPermissions = getUserPermissions(userProfile.role);

  return allNavigationItems
    .filter((item) => {
      // Check basic permissions
      if (!hasPermission(userPermissions, item.permissions)) {
        return false;
      }

      // Check vendor-specific items
      if (
        item.vendorSpecific &&
        !item.vendorSpecific.includes(userProfile.role)
      ) {
        return false;
      }

      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) =>
          hasPermission(userPermissions, child.permissions) &&
          (!child.vendorSpecific ||
            child.vendorSpecific.includes(userProfile.role)),
      ),
    }));
}

export function getQuickActions(userProfile: UserProfile): NavigationItem[] {
  const filteredNav = filterNavigationByRole(userProfile);
  const quickActions: NavigationItem[] = [];

  filteredNav.forEach((item) => {
    if (item.quickAction) {
      quickActions.push(item);
    }

    if (item.children) {
      item.children.forEach((child) => {
        if (child.quickAction) {
          quickActions.push(child);
        }
      });
    }
  });

  return quickActions;
}

export function getContextAwareItems(
  userProfile: UserProfile,
): NavigationItem[] {
  const filteredNav = filterNavigationByRole(userProfile);

  return filteredNav
    .filter((item) => item.contextAware)
    .map((item) => {
      if (item.id === 'dashboard' && userProfile.activeWedding) {
        return {
          ...item,
          label: 'Active Wedding',
          badge: 1,
        };
      }
      return item;
    });
}

export function getNavigationBadges(
  userProfile: UserProfile,
): Record<string, number> {
  // This would typically fetch from your backend/state management
  // For now, returning mock data based on role
  const badges: Record<string, number> = {};

  if (
    hasPermission(getUserPermissions(userProfile.role), ['coordination_tools'])
  ) {
    badges.communications = 5;
    badges.notifications = 3;
  }

  if (hasPermission(getUserPermissions(userProfile.role), ['manage_clients'])) {
    badges.clients = 12;
  }

  if (hasPermission(getUserPermissions(userProfile.role), ['manage_forms'])) {
    badges.forms = 2;
  }

  return badges;
}

export function searchNavigationItems(
  query: string,
  userProfile: UserProfile,
): NavigationItem[] {
  const filteredNav = filterNavigationByRole(userProfile);
  const searchTerm = query.toLowerCase();
  const results: NavigationItem[] = [];

  filteredNav.forEach((item) => {
    // Search main items
    if (item.label.toLowerCase().includes(searchTerm)) {
      results.push(item);
    }

    // Search children
    if (item.children) {
      item.children.forEach((child) => {
        if (child.label.toLowerCase().includes(searchTerm)) {
          results.push(child);
        }
      });
    }
  });

  return results;
}

// Wedding season specific enhancements
export function getSeasonalPriority(
  userProfile: UserProfile,
): NavigationItem[] {
  const baseItems = filterNavigationByRole(userProfile);
  const currentMonth = new Date().getMonth();

  // Wedding season is typically May-October
  const isWeddingSeason = currentMonth >= 4 && currentMonth <= 9;

  if (isWeddingSeason) {
    return baseItems.map((item) => {
      if (['clients', 'communications', 'calendar'].includes(item.id)) {
        return { ...item, badge: (item.badge || 0) + 1 };
      }
      return item;
    });
  }

  return baseItems;
}
