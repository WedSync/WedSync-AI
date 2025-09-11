# WS-021: Mobile Responsive Dashboard - Technical Specification

## User Story

**As a wedding planner**, I need a fully functional mobile dashboard so I can manage clients, check schedules, and respond to messages while on-site at venues or during tastings.

**Real Wedding Scenario**: Maria, a wedding planner, is at a venue walkthrough with clients when she receives an urgent message from the florist about delivery timing. Using her mobile dashboard, she quickly checks the timeline, sees the conflict, and messages both the venue coordinator and couple right from her phone to adjust the schedule, preventing a major day-of issue.

## Database Schema

```sql
-- Mobile user preferences
CREATE TABLE mobile_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  bottom_nav_order JSONB DEFAULT '["home", "clients", "add", "messages", "more"]',
  quick_actions JSONB DEFAULT '[]',
  dashboard_layout JSONB DEFAULT '{}',
  offline_sync_enabled BOOLEAN DEFAULT TRUE,
  push_notifications_enabled BOOLEAN DEFAULT TRUE,
  dark_mode_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline data cache
CREATE TABLE offline_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'synced', -- 'synced', 'pending', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, cache_key)
);

-- Touch gesture analytics
CREATE TABLE mobile_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  screen_size VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
  interaction_type VARCHAR(50), -- 'tap', 'swipe', 'long_press', 'scroll'
  element_type VARCHAR(50), -- 'button', 'card', 'list_item'
  element_id VARCHAR(100),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  performance_metrics JSONB DEFAULT '{}'
);

-- PWA installation tracking
CREATE TABLE pwa_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  platform VARCHAR(50), -- 'android', 'ios', 'desktop'
  user_agent TEXT,
  install_date TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for mobile performance
CREATE INDEX idx_mobile_preferences_supplier ON mobile_preferences(supplier_id);
CREATE INDEX idx_offline_cache_supplier_key ON offline_cache(supplier_id, cache_key);
CREATE INDEX idx_offline_cache_expires ON offline_cache(expires_at) WHERE sync_status = 'synced';
CREATE INDEX idx_mobile_analytics_session ON mobile_analytics(session_id, timestamp);
```

## API Endpoints

```typescript
// Mobile-specific data types
interface MobilePreferences {
  id: string;
  supplierId: string;
  bottomNavOrder: string[];
  quickActions: QuickAction[];
  dashboardLayout: DashboardLayout;
  offlineSyncEnabled: boolean;
  pushNotificationsEnabled: boolean;
  darkModeEnabled: boolean;
  updatedAt: string;
}

interface QuickAction {
  id: string;
  label: string;
  action: string;
  icon: string;
  color?: string;
}

interface DashboardLayout {
  cards: DashboardCard[];
  columns: number;
  density: 'compact' | 'comfortable' | 'spacious';
}

interface DashboardCard {
  id: string;
  type: string;
  title: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  settings: Record<string, any>;
}

interface OfflineCacheEntry {
  id: string;
  supplierId: string;
  cacheKey: string;
  cacheData: any;
  expiresAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  updatedAt: string;
}

interface MobileAnalytics {
  sessionId: string;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  interactionType: 'tap' | 'swipe' | 'long_press' | 'scroll';
  elementType: string;
  elementId?: string;
  performanceMetrics: {
    loadTime?: number;
    renderTime?: number;
    responseTime?: number;
  };
}

// API Routes
// GET /api/mobile/preferences
interface GetMobilePreferencesResponse {
  success: boolean;
  data: MobilePreferences;
}

// PUT /api/mobile/preferences
interface UpdateMobilePreferencesRequest {
  bottomNavOrder?: string[];
  quickActions?: QuickAction[];
  dashboardLayout?: DashboardLayout;
  offlineSyncEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
  darkModeEnabled?: boolean;
}

interface UpdateMobilePreferencesResponse {
  success: boolean;
  data: MobilePreferences;
}

// GET /api/mobile/dashboard
interface MobileDashboardRequest {
  compact?: boolean;
  cacheKey?: string;
}

interface MobileDashboardResponse {
  success: boolean;
  data: {
    cards: DashboardCard[];
    quickStats: QuickStats;
    recentActivity: Activity[];
    notifications: Notification[];
  };
  cacheKey: string;
  expiresAt: string;
}

// POST /api/mobile/sync
interface SyncOfflineDataRequest {
  changes: OfflineChange[];
  lastSyncTime: string;
}

interface OfflineChange {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

interface SyncOfflineDataResponse {
  success: boolean;
  data: {
    conflicts: SyncConflict[];
    appliedChanges: string[];
    serverChanges: any[];
  };
}

// POST /api/mobile/analytics
interface TrackMobileAnalyticsRequest {
  events: MobileAnalytics[];
}

interface TrackMobileAnalyticsResponse {
  success: boolean;
  processed: number;
}

// GET /api/mobile/pwa/status
interface PWAStatusResponse {
  success: boolean;
  data: {
    isInstalled: boolean;
    installPromptAvailable: boolean;
    lastUpdateCheck: string;
    version: string;
  };
}
```

## Frontend Components

```typescript
// MobileDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSwipeable } from 'react-swipeable';
import { usePWA } from '@/hooks/use-pwa';
import { useOfflineSync } from '@/hooks/use-offline-sync';

interface MobileDashboardProps {
  supplierId: string;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ supplierId }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, syncPendingChanges } = useOfflineSync();
  const { installPrompt, showInstallPrompt } = usePWA();

  const swipeHandlers = useSwipeable({
    onSwipedDown: handlePullToRefresh,
    preventDefaultTouchmoveEvent: true,
    trackMouse: false
  });

  useEffect(() => {
    loadDashboardData();
  }, [supplierId]);

  const loadDashboardData = async (useCache = true) => {
    try {
      const cacheKey = useCache ? localStorage.getItem('dashboard-cache-key') : null;
      const response = await fetch('/api/mobile/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compact: true,
          cacheKey
        })
      });
      
      const data = await response.json();
      setDashboardData(data.data);
      
      // Cache for offline use
      if (data.cacheKey) {
        localStorage.setItem('dashboard-cache-key', data.cacheKey);
        localStorage.setItem('dashboard-data', JSON.stringify(data.data));
      }
    } catch (error) {
      // Load from cache if offline
      const cachedData = localStorage.getItem('dashboard-data');
      if (cachedData) {
        setDashboardData(JSON.parse(cachedData));
      }
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(false);
    if (isOnline) {
      await syncPendingChanges();
    }
  }, [isOnline, syncPendingChanges]);

  if (loading && !dashboardData) {
    return <MobileDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50" {...swipeHandlers}>
      {/* PWA Install Banner */}
      {installPrompt && (
        <div className="bg-blue-600 text-white p-3 text-center">
          <p className="text-sm">Install WedSync for a better experience</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={showInstallPrompt}
            className="mt-1"
          >
            Install App
          </Button>
        </div>
      )}

      {/* Offline Status */}
      {!isOnline && (
        <div className="bg-yellow-100 border-yellow-400 p-2 text-center">
          <p className="text-sm text-yellow-800">
            You're offline. Changes will sync when connected.
          </p>
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      {refreshing && (
        <div className="text-center p-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Refreshing...</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="p-4">
        <QuickStatsGrid stats={dashboardData?.quickStats} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <QuickActionsBar actions={dashboardData?.quickActions} />
      </div>

      {/* Dashboard Cards */}
      <div className="px-4 space-y-4">
        {dashboardData?.cards.map((card: DashboardCard) => (
          <MobileDashboardCard
            key={card.id}
            card={card}
            onCardAction={handleCardAction}
          />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="p-4">
        <RecentActivityFeed activities={dashboardData?.recentActivity} />
      </div>

      {/* Bottom Navigation Space */}
      <div className="h-20"></div>
    </div>
  );
};

// QuickStatsGrid.tsx
interface QuickStatsGridProps {
  stats: any;
}

const QuickStatsGrid: React.FC<QuickStatsGridProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.activeClients}</p>
          <p className="text-xs text-gray-500">Active Clients</p>
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{stats.upcomingWeddings}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</p>
          <p className="text-xs text-gray-500">Pending Tasks</p>
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.unreadMessages}</p>
          <p className="text-xs text-gray-500">Messages</p>
        </div>
      </Card>
    </div>
  );
};

// MobileBottomNavigation.tsx
interface MobileBottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  currentPage,
  onNavigate
}) => {
  const [navItems, setNavItems] = useState([
    { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' },
    { id: 'clients', label: 'Clients', icon: '👥', path: '/clients' },
    { id: 'add', label: '', icon: '➕', path: '/add', isAction: true },
    { id: 'messages', label: 'Messages', icon: '💬', path: '/messages' },
    { id: 'more', label: 'More', icon: '⋯', path: '/menu' }
  ]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.isAction ? handleQuickAdd() : onNavigate(item.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              item.isAction 
                ? 'bg-blue-600 text-white rounded-full mx-2 h-12 w-12 self-center'
                : currentPage === item.path
                ? 'text-blue-600'
                : 'text-gray-400'
            }`}
          >
            <span className={`text-lg ${item.isAction ? 'text-xl' : ''}`}>
              {item.icon}
            </span>
            {!item.isAction && (
              <span className="text-xs mt-1">{item.label}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// TouchOptimizedButton.tsx
interface TouchOptimizedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = "rounded-lg font-medium transition-all duration-150 active:scale-95";
  const sizeClasses = {
    sm: "px-3 py-2 text-sm min-h-[40px]",
    md: "px-4 py-3 text-base min-h-[48px]",
    lg: "px-6 py-4 text-lg min-h-[56px]"
  };
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${isPressed ? 'scale-95' : ''}
      `}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

## Code Examples

### PWA Service Worker

```typescript
// public/sw.js
const CACHE_NAME = 'wedsync-mobile-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/clients',
  '/messages',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  const offlineChanges = await getOfflineChanges();
  if (offlineChanges.length > 0) {
    try {
      await fetch('/api/mobile/sync', {
        method: 'POST',
        body: JSON.stringify({ changes: offlineChanges }),
        headers: { 'Content-Type': 'application/json' }
      });
      await clearOfflineChanges();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

### Offline Sync Hook

```typescript
// hooks/use-offline-sync.ts
import { useState, useEffect, useCallback } from 'react';

interface OfflineChange {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState<OfflineChange[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadPendingChanges();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline, pendingChanges.length]);

  const loadPendingChanges = useCallback(() => {
    const stored = localStorage.getItem('offline-changes');
    if (stored) {
      setPendingChanges(JSON.parse(stored));
    }
  }, []);

  const addOfflineChange = useCallback((change: Omit<OfflineChange, 'id' | 'timestamp'>) => {
    const newChange: OfflineChange = {
      ...change,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    const updated = [...pendingChanges, newChange];
    setPendingChanges(updated);
    localStorage.setItem('offline-changes', JSON.stringify(updated));
  }, [pendingChanges]);

  const syncPendingChanges = useCallback(async () => {
    if (syncing || pendingChanges.length === 0) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/mobile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: pendingChanges,
          lastSyncTime: localStorage.getItem('last-sync-time') || new Date(0).toISOString()
        })
      });

      const result = await response.json();
      if (result.success) {
        setPendingChanges([]);
        localStorage.removeItem('offline-changes');
        localStorage.setItem('last-sync-time', new Date().toISOString());
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, [pendingChanges, syncing]);

  return {
    isOnline,
    pendingChanges: pendingChanges.length,
    syncing,
    addOfflineChange,
    syncPendingChanges
  };
};
```

### Responsive Layout Hook

```typescript
// hooks/use-responsive-layout.ts
import { useState, useEffect } from 'react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';
type Orientation = 'portrait' | 'landscape';

export const useResponsiveLayout = () => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('mobile');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Determine screen size
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }

      // Determine orientation
      setOrientation(width > height ? 'landscape' : 'portrait');

      // Check for touch capability
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isDesktop = screenSize === 'desktop';

  return {
    screenSize,
    orientation,
    isTouch,
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet: isMobile || isTablet
  };
};
```

## Test Requirements

```typescript
// __tests__/mobile-responsive.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import { useOfflineSync } from '@/hooks/use-offline-sync';

// Mock the offline sync hook
jest.mock('@/hooks/use-offline-sync');

describe('Mobile Responsive Dashboard', () => {
  const mockUseOfflineSync = useOfflineSync as jest.MockedFunction<typeof useOfflineSync>;

  beforeEach(() => {
    mockUseOfflineSync.mockReturnValue({
      isOnline: true,
      pendingChanges: 0,
      syncing: false,
      addOfflineChange: jest.fn(),
      syncPendingChanges: jest.fn()
    });

    // Mock viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    });
  });

  describe('Mobile Layout', () => {
    it('should render mobile dashboard with touch-optimized elements', async () => {
      render(<MobileDashboard supplierId="test-supplier" />);

      // Check for mobile-specific elements
      expect(screen.getByText('Active Clients')).toBeInTheDocument();
      
      // Verify touch target sizes (minimum 48px)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(48);
      });
    });

    it('should handle pull-to-refresh gesture', async () => {
      const { container } = render(<MobileDashboard supplierId="test-supplier" />);

      // Simulate swipe down gesture
      const dashboard = container.firstChild as HTMLElement;
      fireEvent.touchStart(dashboard, {
        touches: [{ clientX: 0, clientY: 0 }]
      });
      fireEvent.touchMove(dashboard, {
        touches: [{ clientX: 0, clientY: 100 }]
      });
      fireEvent.touchEnd(dashboard);

      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      });
    });

    it('should show offline indicator when offline', () => {
      mockUseOfflineSync.mockReturnValue({
        isOnline: false,
        pendingChanges: 2,
        syncing: false,
        addOfflineChange: jest.fn(),
        syncPendingChanges: jest.fn()
      });

      render(<MobileDashboard supplierId="test-supplier" />);

      expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    });
  });

  describe('Responsive Breakpoints', () => {
    it('should adapt layout for tablet screens', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 768
      });

      render(<MobileDashboard supplierId="test-supplier" />);

      // Verify tablet-specific layout adjustments
      const quickStats = screen.getByTestId('quick-stats-grid');
      expect(quickStats).toHaveClass('grid-cols-4'); // More columns on tablet
    });

    it('should handle orientation changes', async () => {
      const { rerender } = render(<MobileDashboard supplierId="test-supplier" />);

      // Simulate orientation change to landscape
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 667 });
        Object.defineProperty(window, 'innerHeight', { value: 375 });
        window.dispatchEvent(new Event('orientationchange'));
      });

      rerender(<MobileDashboard supplierId="test-supplier" />);

      // Verify landscape layout adjustments
      await waitFor(() => {
        expect(screen.getByTestId('landscape-layout')).toBeInTheDocument();
      });
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch gestures correctly', () => {
      render(<MobileDashboard supplierId="test-supplier" />);

      const touchButton = screen.getByTestId('touch-optimized-button');
      
      // Test touch feedback
      fireEvent.touchStart(touchButton);
      expect(touchButton).toHaveClass('scale-95');

      fireEvent.touchEnd(touchButton);
      expect(touchButton).not.toHaveClass('scale-95');
    });

    it('should support long press for context menus', async () => {
      render(<MobileDashboard supplierId="test-supplier" />);

      const clientCard = screen.getByTestId('client-card');
      
      // Simulate long press
      fireEvent.touchStart(clientCard);
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      });
    });
  });

  describe('PWA Features', () => {
    it('should show install prompt when available', () => {
      // Mock PWA install prompt
      global.window.addEventListener = jest.fn((event, cb) => {
        if (event === 'beforeinstallprompt') {
          setTimeout(() => cb({ preventDefault: jest.fn(), prompt: jest.fn() }), 100);
        }
      });

      render(<MobileDashboard supplierId="test-supplier" />);

      expect(screen.getByText('Install WedSync for a better experience')).toBeInTheDocument();
    });

    it('should cache data for offline use', async () => {
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      render(<MobileDashboard supplierId="test-supplier" />);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'dashboard-data',
          expect.any(String)
        );
      });
    });
  });

  describe('Performance', () => {
    it('should load critical content within 3 seconds on 3G', async () => {
      const start = performance.now();
      
      render(<MobileDashboard supplierId="test-supplier" />);

      await waitFor(() => {
        expect(screen.getByText('Active Clients')).toBeInTheDocument();
      });

      const loadTime = performance.now() - start;
      expect(loadTime).toBeLessThan(3000);
    });

    it('should implement virtual scrolling for long lists', () => {
      const longClientList = Array.from({ length: 1000 }, (_, i) => ({
        id: `client-${i}`,
        name: `Client ${i}`
      }));

      render(<MobileDashboard supplierId="test-supplier" />);

      // Verify only visible items are rendered
      const visibleItems = screen.getAllByTestId(/client-item-\d+/);
      expect(visibleItems.length).toBeLessThan(20); // Only visible viewport items
    });
  });
});
```

## Dependencies

### Core Technologies
- **React 18**: Latest React with concurrent features
- **Tailwind CSS**: Mobile-first responsive design
- **React Query**: Data fetching and caching
- **Workbox**: PWA service worker management

### Mobile-Specific Libraries
- **react-swipeable**: Gesture handling
- **react-spring**: Touch animations
- **react-virtual**: List virtualization
- **react-intersection-observer**: Lazy loading

### PWA Requirements
- **Web App Manifest**: App installation metadata
- **Service Worker**: Offline functionality
- **IndexedDB**: Offline data storage
- **Push API**: Notifications

## Effort Estimate

- **Responsive Design System**: 12 hours
- **Mobile Dashboard Components**: 20 hours
- **Touch Interaction Framework**: 8 hours
- **Offline Sync Implementation**: 16 hours
- **PWA Setup and Configuration**: 10 hours
- **Bottom Navigation**: 6 hours
- **Performance Optimization**: 12 hours
- **Testing (Unit + E2E)**: 16 hours
- **Documentation**: 4 hours

**Total Estimated Effort**: 104 hours (13 days)

## Success Metrics

- 100% feature parity between desktop and mobile
- Touch targets minimum 48x48px (WCAG compliance)
- First Contentful Paint < 2 seconds on 3G
- App installation rate > 25% for mobile users
- 95% user satisfaction score for mobile experience
- 50% increase in mobile engagement time