/**
 * WS-038: Deep Linking Support System
 * Enhanced URL handling with state preservation and navigation history
 */

import { NavigationItem, UserProfile } from './roleBasedAccess';

export interface DeepLinkParams {
  [key: string]: string | string[] | undefined;
}

export interface NavigationState {
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
  search?: string;
  view?: string;
  selected?: string[];
  context?: Record<string, any>;
}

export interface DeepLink {
  path: string;
  params: DeepLinkParams;
  state: NavigationState;
  timestamp: number;
  userRole: string;
}

const NAVIGATION_HISTORY_KEY = 'wedsync_navigation_history';
const MAX_HISTORY_ITEMS = 50;

// URL parameter mappings for different features
const URL_PARAM_MAPPINGS = {
  clients: {
    page: 'p',
    limit: 'l',
    search: 'q',
    status: 's',
    vendor: 'v',
    dateRange: 'dr',
    sortBy: 'sort',
    view: 'view',
  },
  forms: {
    page: 'p',
    category: 'cat',
    status: 'status',
    template: 'tpl',
    search: 'q',
  },
  analytics: {
    period: 'period',
    metric: 'metric',
    segment: 'seg',
    comparison: 'comp',
  },
  journeys: {
    status: 'status',
    template: 'tpl',
    search: 'q',
    view: 'view',
  },
};

class DeepLinkingManager {
  private history: DeepLink[] = [];

  constructor() {
    this.loadHistory();
  }

  // Generate deep link with state
  generateDeepLink(
    path: string,
    state: NavigationState = {},
    userProfile?: UserProfile,
  ): string {
    const url = new URL(path, window.location.origin);
    const feature = this.getFeatureFromPath(path);
    const paramMapping =
      URL_PARAM_MAPPINGS[feature as keyof typeof URL_PARAM_MAPPINGS] || {};

    // Add pagination
    if (state.pagination) {
      if (state.pagination.page > 1) {
        url.searchParams.set(
          paramMapping.page || 'page',
          state.pagination.page.toString(),
        );
      }
      if (state.pagination.limit !== 20) {
        // Default limit
        url.searchParams.set(
          paramMapping.limit || 'limit',
          state.pagination.limit.toString(),
        );
      }
    }

    // Add search
    if (state.search) {
      url.searchParams.set(paramMapping.search || 'search', state.search);
    }

    // Add filters
    if (state.filters) {
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const paramKey = (paramMapping as any)[key] || key;
          if (Array.isArray(value)) {
            url.searchParams.set(paramKey, value.join(','));
          } else {
            url.searchParams.set(paramKey, value.toString());
          }
        }
      });
    }

    // Add view type
    if (state.view) {
      url.searchParams.set(paramMapping.view || 'view', state.view);
    }

    // Add selected items (for bulk operations)
    if (state.selected && state.selected.length > 0) {
      url.searchParams.set('selected', state.selected.join(','));
    }

    // Add context data (encoded)
    if (state.context && Object.keys(state.context).length > 0) {
      const contextString = btoa(JSON.stringify(state.context));
      url.searchParams.set('ctx', contextString);
    }

    // Store in history
    this.addToHistory({
      path,
      params: Object.fromEntries(url.searchParams.entries()),
      state,
      timestamp: Date.now(),
      userRole: userProfile?.role || 'unknown',
    });

    return url.toString();
  }

  // Parse deep link and extract state
  parseDeepLink(url: string): { path: string; state: NavigationState } {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const feature = this.getFeatureFromPath(path);
    const paramMapping =
      URL_PARAM_MAPPINGS[feature as keyof typeof URL_PARAM_MAPPINGS] || {};

    const state: NavigationState = {};

    // Parse pagination
    const page = this.getParamValue(
      urlObj.searchParams,
      paramMapping.page || 'page',
    );
    const limit = this.getParamValue(
      urlObj.searchParams,
      paramMapping.limit || 'limit',
    );

    if (page || limit) {
      state.pagination = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      };
    }

    // Parse search
    const search = this.getParamValue(
      urlObj.searchParams,
      paramMapping.search || 'search',
    );
    if (search) {
      state.search = search;
    }

    // Parse view
    const view = this.getParamValue(
      urlObj.searchParams,
      paramMapping.view || 'view',
    );
    if (view) {
      state.view = view;
    }

    // Parse selected items
    const selected = this.getParamValue(urlObj.searchParams, 'selected');
    if (selected) {
      state.selected = selected.split(',').filter(Boolean);
    }

    // Parse context
    const context = this.getParamValue(urlObj.searchParams, 'ctx');
    if (context) {
      try {
        state.context = JSON.parse(atob(context));
      } catch (error) {
        console.warn('Failed to parse context from URL:', error);
      }
    }

    // Parse feature-specific filters
    const filters: Record<string, any> = {};

    // Reverse mapping to get original filter keys
    const reversedMapping = Object.entries(paramMapping).reduce(
      (acc, [key, value]) => {
        acc[value] = key;
        return acc;
      },
      {} as Record<string, string>,
    );

    urlObj.searchParams.forEach((value, key) => {
      // Skip known system parameters
      if (
        ['page', 'limit', 'search', 'view', 'selected', 'ctx'].includes(key)
      ) {
        return;
      }

      const originalKey = reversedMapping[key] || key;

      // Handle comma-separated values
      if (value.includes(',')) {
        filters[originalKey] = value.split(',').filter(Boolean);
      } else {
        filters[originalKey] = value;
      }
    });

    if (Object.keys(filters).length > 0) {
      state.filters = filters;
    }

    return { path, state };
  }

  // Generate shareable links with access control
  generateShareableLink(
    path: string,
    state: NavigationState,
    userProfile: UserProfile,
    options: {
      includeFilters?: boolean;
      includeSearch?: boolean;
      includePagination?: boolean;
      expiresAt?: Date;
    } = {},
  ): string {
    const filteredState: NavigationState = {};

    if (options.includeFilters && state.filters) {
      filteredState.filters = state.filters;
    }

    if (options.includeSearch && state.search) {
      filteredState.search = state.search;
    }

    if (options.includePagination && state.pagination) {
      filteredState.pagination = state.pagination;
    }

    // Add sharing metadata
    const shareContext = {
      sharedBy: userProfile.id,
      sharedAt: new Date().toISOString(),
      expiresAt: options.expiresAt?.toISOString(),
      allowedRoles: this.getAllowedRolesForPath(path, userProfile),
    };

    filteredState.context = {
      ...filteredState.context,
      share: shareContext,
    };

    return this.generateDeepLink(path, filteredState, userProfile);
  }

  // Restore state from URL
  restoreStateFromUrl(url: string = window.location.href): NavigationState {
    const { state } = this.parseDeepLink(url);
    return state;
  }

  // Update URL without navigation
  updateUrl(state: NavigationState, replace: boolean = true): void {
    const currentPath = window.location.pathname;
    const newUrl = this.generateDeepLink(currentPath, state);

    if (replace) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
  }

  // Navigation history management
  addToHistory(link: DeepLink): void {
    this.history = [link, ...this.history.slice(0, MAX_HISTORY_ITEMS - 1)];
    this.saveHistory();
  }

  getHistory(userRole?: string): DeepLink[] {
    if (userRole) {
      return this.history.filter((link) => link.userRole === userRole);
    }
    return this.history;
  }

  getRecentLinks(limit: number = 10, userRole?: string): DeepLink[] {
    const history = this.getHistory(userRole);
    return history.slice(0, limit);
  }

  clearHistory(): void {
    this.history = [];
    localStorage.removeItem(NAVIGATION_HISTORY_KEY);
  }

  // Bookmark functionality
  createBookmark(
    path: string,
    state: NavigationState,
    title: string,
    userProfile: UserProfile,
  ): string {
    const bookmark = {
      id: this.generateId(),
      title,
      url: this.generateDeepLink(path, state, userProfile),
      createdAt: new Date().toISOString(),
      userId: userProfile.id,
      userRole: userProfile.role,
    };

    // Store bookmark (you would typically save this to your backend)
    const bookmarks = this.getBookmarks();
    bookmarks.push(bookmark);
    localStorage.setItem('wedsync_bookmarks', JSON.stringify(bookmarks));

    return bookmark.id;
  }

  getBookmarks(): any[] {
    try {
      return JSON.parse(localStorage.getItem('wedsync_bookmarks') || '[]');
    } catch {
      return [];
    }
  }

  // URL validation and security
  validateDeepLink(url: string, userProfile: UserProfile): boolean {
    try {
      const { path, state } = this.parseDeepLink(url);

      // Check if user has access to the path
      if (!this.hasAccessToPath(path, userProfile)) {
        return false;
      }

      // Check share expiration
      if (state.context?.share?.expiresAt) {
        const expiresAt = new Date(state.context.share.expiresAt);
        if (expiresAt < new Date()) {
          return false;
        }
      }

      // Check role permissions for shared links
      if (state.context?.share?.allowedRoles) {
        const allowedRoles = state.context.share.allowedRoles;
        if (!allowedRoles.includes(userProfile.role)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods
  private getFeatureFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'dashboard';
  }

  private getParamValue(
    searchParams: URLSearchParams,
    key: string,
  ): string | null {
    return searchParams.get(key);
  }

  private getAllowedRolesForPath(
    path: string,
    userProfile: UserProfile,
  ): string[] {
    // This would be based on your role-based access control
    // For now, returning basic logic
    const feature = this.getFeatureFromPath(path);

    switch (feature) {
      case 'analytics':
        return ['admin', 'manager', 'coordinator'];
      case 'settings':
        return ['admin', 'manager'];
      default:
        return [
          'admin',
          'manager',
          'photographer',
          'venue',
          'florist',
          'caterer',
          'coordinator',
        ];
    }
  }

  private hasAccessToPath(path: string, userProfile: UserProfile): boolean {
    const allowedRoles = this.getAllowedRolesForPath(path, userProfile);
    return allowedRoles.includes(userProfile.role);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(NAVIGATION_HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load navigation history:', error);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(
        NAVIGATION_HISTORY_KEY,
        JSON.stringify(this.history),
      );
    } catch (error) {
      console.warn('Failed to save navigation history:', error);
    }
  }
}

// Export singleton instance
export const deepLinkingManager = new DeepLinkingManager();

// Convenience functions
export function generateDeepLink(
  path: string,
  state?: NavigationState,
  userProfile?: UserProfile,
): string {
  return deepLinkingManager.generateDeepLink(path, state, userProfile);
}

export function parseCurrentUrl(): { path: string; state: NavigationState } {
  return deepLinkingManager.parseDeepLink(window.location.href);
}

export function updateUrlState(
  state: NavigationState,
  replace?: boolean,
): void {
  deepLinkingManager.updateUrl(state, replace);
}

export function restoreNavigationState(): NavigationState {
  return deepLinkingManager.restoreStateFromUrl();
}

// React hook for deep linking
export function useDeepLinking() {
  const updateUrl = (state: NavigationState, replace: boolean = true) => {
    deepLinkingManager.updateUrl(state, replace);
  };

  const generateLink = (path: string, state?: NavigationState) => {
    return deepLinkingManager.generateDeepLink(path, state);
  };

  const restoreState = () => {
    return deepLinkingManager.restoreStateFromUrl();
  };

  const createShareableLink = (
    path: string,
    state: NavigationState,
    userProfile: UserProfile,
    options?: any,
  ) => {
    return deepLinkingManager.generateShareableLink(
      path,
      state,
      userProfile,
      options,
    );
  };

  return {
    updateUrl,
    generateLink,
    restoreState,
    createShareableLink,
    getHistory: () => deepLinkingManager.getHistory(),
    getRecentLinks: (limit?: number) =>
      deepLinkingManager.getRecentLinks(limit),
  };
}
