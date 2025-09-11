'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  HomeIcon,
  CameraIcon,
  UsersIcon,
  ShareIcon,
  SettingsIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  AlertTriangleIcon,
  SearchIcon,
  MenuIcon,
  XMarkIcon,
  ChevronRightIcon,
  BackIcon,
  PlusIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

// Types
interface NavigationItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  action?: () => void;
  children?: NavigationItem[];
  badge?: {
    count?: number;
    color?: 'primary' | 'warning' | 'error' | 'success';
    pulse?: boolean;
  };
  isActive?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  action: () => void;
  color?: 'primary' | 'success' | 'warning' | 'error';
  shortcut?: string;
}

interface WedMeNavigationContext {
  // Navigation state
  isOpen: boolean;
  currentPage: string;
  breadcrumbs: BreadcrumbItem[];

  // Actions
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
  navigateTo: (href: string, label?: string) => void;
  goBack: () => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;

  // Quick actions
  quickActions: QuickAction[];
  addQuickAction: (action: QuickAction) => void;
  removeQuickAction: (actionId: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Context
  weddingId?: string;
  conflictCount: number;
  setConflictCount: (count: number) => void;
}

const WedMeNavigationContext = createContext<
  WedMeNavigationContext | undefined
>(undefined);

// Main Navigation Items
const getNavigationItems = (
  weddingId: string,
  conflictCount: number,
  navigateTo: (href: string, label?: string) => void,
  addQuickAction: (action: QuickAction) => void,
): NavigationItem[] => [
  {
    id: 'dashboard',
    label: 'Photo Groups',
    icon: <CameraIcon className="w-5 h-5" />,
    href: `/wedme/${weddingId}/photo-groups`,
    children: [
      {
        id: 'dashboard_overview',
        label: 'Overview',
        icon: <HomeIcon className="w-4 h-4" />,
        href: `/wedme/${weddingId}/photo-groups`,
      },
      {
        id: 'create_group',
        label: 'Create Group',
        icon: <PlusIcon className="w-4 h-4" />,
        action: () => {
          navigateTo(
            `/wedme/${weddingId}/photo-groups/create`,
            'Create Photo Group',
          );
          addQuickAction({
            id: 'save_draft',
            label: 'Save Draft',
            icon: <PlusIcon className="w-4 h-4" />,
            action: () => console.log('Save draft'),
            color: 'primary',
          });
        },
      },
    ],
  },
  {
    id: 'guest_assignment',
    label: 'Guest Assignment',
    icon: <UsersIcon className="w-5 h-5" />,
    href: `/wedme/${weddingId}/guest-assignment`,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: <CalendarIcon className="w-5 h-5" />,
    href: `/wedme/${weddingId}/schedule`,
    children: [
      {
        id: 'timeline',
        label: 'Timeline View',
        icon: <ClockIcon className="w-4 h-4" />,
        href: `/wedme/${weddingId}/schedule/timeline`,
      },
      {
        id: 'venues',
        label: 'Venue Planning',
        icon: <MapPinIcon className="w-4 h-4" />,
        href: `/wedme/${weddingId}/schedule/venues`,
      },
    ],
  },
  {
    id: 'conflicts',
    label: 'Conflicts',
    icon: <AlertTriangleIcon className="w-5 h-5" />,
    href: `/wedme/${weddingId}/conflicts`,
    badge:
      conflictCount > 0
        ? {
            count: conflictCount,
            color: conflictCount > 5 ? 'error' : ('warning' as const),
            pulse: conflictCount > 0,
          }
        : undefined,
  },
  {
    id: 'sharing',
    label: 'Share & Export',
    icon: <ShareIcon className="w-5 h-5" />,
    href: `/wedme/${weddingId}/sharing`,
    children: [
      {
        id: 'quick_share',
        label: 'Quick Share',
        icon: <ShareIcon className="w-4 h-4" />,
        action: () => console.log('Quick share'),
      },
      {
        id: 'export_pdf',
        label: 'Export PDF',
        icon: <ShareIcon className="w-4 h-4" />,
        action: () => console.log('Export PDF'),
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon className="w-5 h-5" />,
    href: `/wedme/${weddingId}/settings`,
  },
];

// Navigation Provider Component
interface WedMeNavigationProviderProps {
  children: ReactNode;
  weddingId: string;
}

export function WedMeNavigationProvider({
  children,
  weddingId,
}: WedMeNavigationProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [conflictCount, setConflictCount] = useState(0);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // Enhanced offline support
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user',
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Navigation actions
  const openNav = useCallback(() => setIsOpen(true), []);
  const closeNav = useCallback(() => setIsOpen(false), []);
  const toggleNav = useCallback(() => setIsOpen((prev) => !prev), []);

  const navigateTo = useCallback(
    (href: string, label?: string) => {
      if (!offlineHook.isOnline && !href.startsWith('/wedme/')) {
        toast({
          title: 'Offline mode',
          description: 'This page is not available offline',
          variant: 'destructive',
        });
        return;
      }

      router.push(href);
      setCurrentPage(label || href);
      closeNav();
    },
    [router, offlineHook.isOnline, toast, closeNav],
  );

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      navigateTo(`/wedme/${weddingId}/photo-groups`, 'Photo Groups');
    }
  }, [router, navigateTo, weddingId]);

  // Quick actions management
  const addQuickAction = useCallback((action: QuickAction) => {
    setQuickActions((prev) => {
      // Remove existing action with same ID and add new one
      const filtered = prev.filter((a) => a.id !== action.id);
      return [...filtered, action];
    });
  }, []);

  const removeQuickAction = useCallback((actionId: string) => {
    setQuickActions((prev) => prev.filter((a) => a.id !== actionId));
  }, []);

  // Update current page based on pathname
  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Create readable page title from path
    const pageTitle =
      lastSegment
        ?.split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'WedMe';

    setCurrentPage(pageTitle);
  }, [pathname]);

  // Context value
  const contextValue: WedMeNavigationContext = {
    isOpen,
    currentPage,
    breadcrumbs,
    openNav,
    closeNav,
    toggleNav,
    navigateTo,
    goBack,
    setBreadcrumbs,
    quickActions,
    addQuickAction,
    removeQuickAction,
    searchQuery,
    setSearchQuery,
    weddingId,
    conflictCount,
    setConflictCount,
  };

  return (
    <WedMeNavigationContext.Provider value={contextValue}>
      {children}
    </WedMeNavigationContext.Provider>
  );
}

// Hook to use navigation context
export function useWedMeNavigation() {
  const context = useContext(WedMeNavigationContext);
  if (context === undefined) {
    throw new Error(
      'useWedMeNavigation must be used within a WedMeNavigationProvider',
    );
  }
  return context;
}

// Mobile Navigation Menu Component
export function MobileNavigationMenu() {
  const {
    isOpen,
    closeNav,
    navigateTo,
    addQuickAction,
    weddingId = '',
    conflictCount,
    searchQuery,
    setSearchQuery,
  } = useWedMeNavigation();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const navigationItems = getNavigationItems(
    weddingId,
    conflictCount,
    navigateTo,
    addQuickAction,
  );

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeNav}
      />

      {/* Navigation Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-xl transform transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <CameraIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">WedMe</h2>
              <p className="text-sm text-gray-600">Photo Planning</p>
            </div>
          </div>
          <button
            onClick={closeNav}
            className="p-2 rounded-lg hover:bg-primary-100 touch-manipulation"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => (
              <NavigationItem
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpanded={() => toggleExpanded(item.id)}
                searchQuery={searchQuery}
              />
            ))}
          </nav>

          {/* Quick Actions */}
          <QuickActionsPanel />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500 text-center">
            WedMe Photo Planning v2.0
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation Item Component
function NavigationItem({
  item,
  isExpanded,
  onToggleExpanded,
  searchQuery,
  level = 0,
}: {
  item: NavigationItem;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  searchQuery: string;
  level?: number;
}) {
  const { navigateTo, closeNav } = useWedMeNavigation();
  const pathname = usePathname();

  // Filter by search query
  const matchesSearch =
    !searchQuery ||
    item.label.toLowerCase().includes(searchQuery.toLowerCase());

  if (!matchesSearch && level === 0) return null;

  const isActive = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (item.action) {
      item.action();
      closeNav();
    } else if (item.href) {
      navigateTo(item.href, item.label);
    } else if (hasChildren) {
      onToggleExpanded();
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer touch-manipulation',
          'transition-colors duration-200',
          level > 0 && 'ml-6',
          isActive
            ? 'bg-primary-100 text-primary-700 border border-primary-200'
            : 'text-gray-700 hover:bg-gray-100',
          item.disabled && 'opacity-50 cursor-not-allowed',
          item.comingSoon && 'opacity-60',
        )}
      >
        <div className="flex-shrink-0 relative">
          {item.icon}
          {item.badge && (
            <div
              className={cn(
                'absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-medium text-white',
                item.badge.color === 'primary' && 'bg-primary-600',
                item.badge.color === 'warning' && 'bg-warning-600',
                item.badge.color === 'error' && 'bg-error-600',
                item.badge.color === 'success' && 'bg-success-600',
                item.badge.pulse && 'animate-pulse',
              )}
            >
              {item.badge.count || '!'}
            </div>
          )}
        </div>

        <span className="flex-1 font-medium text-sm">{item.label}</span>

        {item.comingSoon && (
          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
            Soon
          </span>
        )}

        {hasChildren && (
          <ChevronRightIcon
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              isExpanded && 'rotate-90',
            )}
          />
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((childItem) => (
            <NavigationItem
              key={childItem.id}
              item={childItem}
              isExpanded={false}
              onToggleExpanded={() => {}}
              searchQuery={searchQuery}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

// Quick Actions Panel Component
function QuickActionsPanel() {
  const { quickActions } = useWedMeNavigation();

  if (quickActions.length === 0) return null;

  return (
    <div className="border-t border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium touch-manipulation',
              'transition-colors duration-200',
              action.color === 'primary' &&
                'bg-primary-100 text-primary-700 hover:bg-primary-200',
              action.color === 'success' &&
                'bg-success-100 text-success-700 hover:bg-success-200',
              action.color === 'warning' &&
                'bg-warning-100 text-warning-700 hover:bg-warning-200',
              action.color === 'error' &&
                'bg-error-100 text-error-700 hover:bg-error-200',
              !action.color && 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
          >
            {action.icon}
            <span className="truncate">{action.label}</span>
            {action.shortcut && (
              <span className="text-xs opacity-60">{action.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Navigation Header Component
export function NavigationHeader({
  title,
  showBackButton = false,
}: {
  title?: string;
  showBackButton?: boolean;
}) {
  const { currentPage, openNav, goBack, breadcrumbs } = useWedMeNavigation();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showBackButton ? (
              <button
                onClick={goBack}
                className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
              >
                <BackIcon className="w-5 h-5 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={openNav}
                className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
              >
                <MenuIcon className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {title || currentPage}
              </h1>
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center space-x-1 mt-1">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      {index > 0 && (
                        <ChevronRightIcon className="w-3 h-3 text-gray-400" />
                      )}
                      <span
                        className={cn(
                          'text-xs',
                          crumb.isActive
                            ? 'text-primary-600 font-medium'
                            : 'text-gray-500',
                        )}
                      >
                        {crumb.label}
                      </span>
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
