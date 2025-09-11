'use client';

/**
 * WS-038: Navigation Context System
 * Centralized navigation state management with role-based access
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  NavigationItem,
  UserProfile,
  filterNavigationByRole,
  getQuickActions,
  getContextAwareItems,
  getNavigationBadges,
  searchNavigationItems,
  getSeasonalPriority,
} from './roleBasedAccess';

interface NavigationState {
  items: NavigationItem[];
  quickActions: NavigationItem[];
  contextAwareItems: NavigationItem[];
  badges: Record<string, number>;
  isLoading: boolean;
  searchQuery: string;
  searchResults: NavigationItem[];
  breadcrumbs: BreadcrumbItem[];
  activeItem: NavigationItem | null;
}

interface BreadcrumbItem {
  label: string;
  href: string;
  isActive: boolean;
}

interface NavigationContextType extends NavigationState {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  updateBadges: (badges: Record<string, number>) => void;
  search: (query: string) => void;
  clearSearch: () => void;
  navigate: (href: string) => void;
  addToBreadcrumbs: (item: BreadcrumbItem) => void;
  clearBreadcrumbs: () => void;
  refreshNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
  children: React.ReactNode;
  initialProfile?: UserProfile;
}

export function NavigationProvider({
  children,
  initialProfile,
}: NavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    initialProfile || null,
  );
  const [navigationState, setNavigationState] = useState<NavigationState>({
    items: [],
    quickActions: [],
    contextAwareItems: [],
    badges: {},
    isLoading: false,
    searchQuery: '',
    searchResults: [],
    breadcrumbs: [],
    activeItem: null,
  });

  // Update navigation when user profile changes
  const refreshNavigation = useCallback(() => {
    if (!userProfile) {
      setNavigationState((prev) => ({
        ...prev,
        items: [],
        quickActions: [],
        contextAwareItems: [],
        activeItem: null,
      }));
      return;
    }

    setNavigationState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const items = getSeasonalPriority(userProfile);
      const quickActions = getQuickActions(userProfile);
      const contextAwareItems = getContextAwareItems(userProfile);
      const badges = getNavigationBadges(userProfile);

      // Find active item based on current pathname
      const activeItem = findActiveItem(items, pathname);

      setNavigationState((prev) => ({
        ...prev,
        items,
        quickActions,
        contextAwareItems,
        badges,
        activeItem,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error refreshing navigation:', error);
      setNavigationState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [userProfile, pathname]);

  // Update badges
  const updateBadges = useCallback((newBadges: Record<string, number>) => {
    setNavigationState((prev) => ({
      ...prev,
      badges: { ...prev.badges, ...newBadges },
    }));
  }, []);

  // Search functionality
  const search = useCallback(
    (query: string) => {
      if (!userProfile) return;

      setNavigationState((prev) => ({
        ...prev,
        searchQuery: query,
        searchResults: query ? searchNavigationItems(query, userProfile) : [],
      }));
    },
    [userProfile],
  );

  const clearSearch = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      searchQuery: '',
      searchResults: [],
    }));
  }, []);

  // Navigation
  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      clearSearch();
    },
    [router, clearSearch],
  );

  // Breadcrumbs
  const addToBreadcrumbs = useCallback((item: BreadcrumbItem) => {
    setNavigationState((prev) => {
      const newBreadcrumbs = [...prev.breadcrumbs];
      const existingIndex = newBreadcrumbs.findIndex(
        (b) => b.href === item.href,
      );

      if (existingIndex >= 0) {
        // Remove all items after the existing one and update it
        newBreadcrumbs.splice(existingIndex);
      }

      // Mark all existing items as inactive
      newBreadcrumbs.forEach((b) => (b.isActive = false));

      // Add the new item
      newBreadcrumbs.push(item);

      return {
        ...prev,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      breadcrumbs: [],
    }));
  }, []);

  // Auto-generate breadcrumbs based on pathname
  useEffect(() => {
    if (!userProfile || !navigationState.items.length) return;

    const pathSegments = pathname.split('/').filter(Boolean);
    const newBreadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard
    newBreadcrumbs.push({
      label: 'Dashboard',
      href: '/',
      isActive: pathname === '/',
    });

    if (pathSegments.length > 0) {
      let currentPath = '';

      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const isLast = index === pathSegments.length - 1;

        // Find the navigation item for this path
        const navItem = findNavigationItemByPath(
          navigationState.items,
          currentPath,
        );

        if (navItem) {
          newBreadcrumbs.push({
            label: navItem.label,
            href: currentPath,
            isActive: isLast,
          });
        } else {
          // Fallback to segment name
          newBreadcrumbs.push({
            label: formatSegmentLabel(segment),
            href: currentPath,
            isActive: isLast,
          });
        }
      });
    }

    setNavigationState((prev) => ({
      ...prev,
      breadcrumbs: newBreadcrumbs,
    }));
  }, [pathname, userProfile, navigationState.items]);

  // Refresh navigation when profile changes
  useEffect(() => {
    refreshNavigation();
  }, [refreshNavigation]);

  // Update active item when pathname changes
  useEffect(() => {
    const activeItem = findActiveItem(navigationState.items, pathname);
    setNavigationState((prev) => ({
      ...prev,
      activeItem,
    }));
  }, [pathname, navigationState.items]);

  const value: NavigationContextType = {
    ...navigationState,
    userProfile,
    setUserProfile,
    updateBadges,
    search,
    clearSearch,
    navigate,
    addToBreadcrumbs,
    clearBreadcrumbs,
    refreshNavigation,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Helper functions
function findActiveItem(
  items: NavigationItem[],
  pathname: string,
): NavigationItem | null {
  for (const item of items) {
    if (item.href === pathname) {
      return item;
    }

    if (item.children) {
      for (const child of item.children) {
        if (child.href === pathname) {
          return child;
        }
      }
    }
  }

  // Find best match for nested routes
  let bestMatch: NavigationItem | null = null;
  let bestMatchLength = 0;

  for (const item of items) {
    if (pathname.startsWith(item.href) && item.href.length > bestMatchLength) {
      bestMatch = item;
      bestMatchLength = item.href.length;
    }

    if (item.children) {
      for (const child of item.children) {
        if (
          pathname.startsWith(child.href) &&
          child.href.length > bestMatchLength
        ) {
          bestMatch = child;
          bestMatchLength = child.href.length;
        }
      }
    }
  }

  return bestMatch;
}

function findNavigationItemByPath(
  items: NavigationItem[],
  path: string,
): NavigationItem | null {
  for (const item of items) {
    if (item.href === path) {
      return item;
    }

    if (item.children) {
      const found = findNavigationItemByPath(item.children, path);
      if (found) return found;
    }
  }

  return null;
}

function formatSegmentLabel(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Custom hooks for specific navigation features
export function useNavigationSearch() {
  const { searchQuery, searchResults, search, clearSearch } = useNavigation();
  return { searchQuery, searchResults, search, clearSearch };
}

export function useBreadcrumbs() {
  const { breadcrumbs, addToBreadcrumbs, clearBreadcrumbs } = useNavigation();
  return { breadcrumbs, addToBreadcrumbs, clearBreadcrumbs };
}

export function useQuickActions() {
  const { quickActions } = useNavigation();
  return quickActions;
}

export function useNavigationBadges() {
  const { badges, updateBadges } = useNavigation();
  return { badges, updateBadges };
}

export function useActiveNavigation() {
  const { activeItem, contextAwareItems } = useNavigation();
  return { activeItem, contextAwareItems };
}
