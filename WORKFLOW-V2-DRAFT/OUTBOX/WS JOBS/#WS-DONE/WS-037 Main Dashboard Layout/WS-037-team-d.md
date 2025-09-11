# TEAM D - ROUND 1: WS-037 - Main Dashboard Layout
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Optimize dashboard for mobile-first usage, ensuring seamless responsive design and touch-optimized interactions for wedding professionals on-the-go
**FEATURE ID:** WS-037 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about mobile wedding professional workflows and venue-based usage patterns

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **MOBILE OPTIMIZATION PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/dashboard/mobile/
cat $WS_ROOT/wedsync/src/components/dashboard/mobile/MobileDashboard.tsx | head -30
ls -la $WS_ROOT/wedsync/src/lib/hooks/
cat $WS_ROOT/wedsync/src/lib/hooks/useMobileOptimizations.ts | head -20
```

2. **RESPONSIVE TESTING RESULTS:**
```bash
npm run test:responsive -- dashboard
# MUST show: "All dashboard responsive breakpoint tests passing"
```

3. **MOBILE PERFORMANCE METRICS:**
```bash
npm run lighthouse:mobile -- dashboard
# MUST show: "Performance >85, Accessibility >95, Mobile-friendly >90"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧭 CRITICAL: MOBILE-FIRST DESIGN REQUIREMENTS (MANDATORY FOR PLATFORM FEATURES)

**❌ FORBIDDEN: Desktop-first approach that doesn't prioritize mobile experience**
**✅ MANDATORY: Dashboard must be optimized for mobile wedding professional workflows**

### MOBILE OPTIMIZATION CHECKLIST
- [ ] Touch-first design with minimum 44px touch targets
- [ ] Responsive CSS Grid that adapts from 3 columns (desktop) to 1 column (mobile)
- [ ] Mobile-optimized drag-and-drop for widget positioning
- [ ] Thumb-friendly navigation with bottom-placed primary actions
- [ ] Optimized bundle size for mobile network conditions
- [ ] Battery-conscious real-time updates and background processing
- [ ] Offline-ready with service worker for poor venue connectivity

### MOBILE-FIRST LAYOUT PATTERN:
```typescript
// File: $WS_ROOT/wedsync/src/components/dashboard/mobile/MobileDashboard.tsx
export const MobileDashboard = () => {
  const { isMobile, isTablet } = useResponsiveBreakpoints();
  const { batteryOptimizations } = useBatteryManager();
  
  return (
    <div className={cn(
      "dashboard-container",
      "grid gap-4 p-4",
      isMobile && "grid-cols-1",
      isTablet && "grid-cols-2",
      "desktop:grid-cols-3"
    )}>
      {/* Mobile-optimized widgets */}
    </div>
  );
};
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & MOBILE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. MOBILE PATTERNS ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Focus on mobile-specific patterns
await mcp__serena__search_for_pattern("mobile responsive breakpoints touch interface");
await mcp__serena__find_symbol("useBreakpoints useTouchGestures MobileOptimized", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/mobile/");
```

### B. RESPONSIVE DESIGN REQUIREMENTS (MANDATORY FOR ALL MOBILE WORK)
```typescript
// CRITICAL: Load mobile optimization best practices
await mcp__ref__ref_search_documentation("CSS Grid responsive mobile first design");
await mcp__ref__ref_search_documentation("React mobile performance optimization");
await mcp__ref__ref_search_documentation("Touch gestures drag drop mobile");
await mcp__ref__ref_search_documentation("Progressive Web App mobile dashboard");
```

**🚨 CRITICAL MOBILE TECHNOLOGY STACK:**
- **CSS Grid**: Mobile-first responsive layout system
- **Touch Events**: Native touch handling for drag-and-drop
- **Intersection Observer**: Lazy loading for mobile performance
- **Service Worker**: Offline functionality for poor venue connectivity
- **Battery API**: Battery-conscious feature management
- **Responsive Design**: Fluid breakpoints with container queries

**❌ DO NOT USE:**
- Fixed pixel layouts that don't scale
- Mouse-only interaction patterns
- Heavy animations that drain battery

### C. REF MCP MOBILE DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to mobile dashboard optimization
# Use Ref MCP to search for:
# - "Mobile responsive dashboard layouts CSS Grid"
# - "Touch-friendly drag and drop interactions"
# - "React performance optimization mobile devices"
# - "Progressive Web App offline functionality"
# - "Mobile viewport management best practices"
# - "Battery API web performance optimization"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR MOBILE DASHBOARD OPTIMIZATION

### Platform-Specific Sequential Thinking for Mobile Dashboard

```typescript
// Mobile dashboard optimization architecture analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile dashboard optimization needs: responsive CSS Grid that transforms from 3-column desktop to 1-column mobile, touch-optimized drag-and-drop for widget positioning, thumb-friendly navigation with bottom-placed actions, optimized loading for mobile networks, battery-conscious real-time updates, and offline functionality for venue environments with poor connectivity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding professional mobile usage patterns: Checking dashboard while traveling to venues, quick client updates between appointments, accessing critical information with one hand while carrying equipment, using dashboard in various lighting conditions (bright outdoor venues, dim indoor spaces), and needing instant access to emergency information during events.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Mobile performance considerations: Bundle size optimization for slower mobile networks, lazy loading of below-the-fold widgets, touch event optimization to prevent 300ms delay, virtual scrolling for activity feeds, service worker implementation for offline widget state, and battery optimization by reducing background processing.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Touch interaction design: Minimum 44px touch targets for easy tapping, swipe gestures for quick actions (swipe to complete tasks), long-press for context menus, drag-and-drop with visual feedback and haptic response, pull-to-refresh for manual updates, and thumb-zone optimization for frequently used actions.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Responsive breakpoint strategy: 320px+ (small mobile), 375px+ (large mobile), 768px+ (tablet portrait), 1024px+ (tablet landscape), 1200px+ (desktop small), 1440px+ (desktop large). Widget layouts: 1 column mobile, 2 columns tablet, 3 columns desktop. Navigation: bottom tabs mobile, side navigation desktop.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build mobile-first CSS with progressive enhancement, implement touch gesture handlers with proper event delegation, create adaptive component loading based on screen size, optimize critical rendering path for mobile, implement service worker for offline dashboard state, and ensure accessibility across all devices and input methods.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH MOBILE OPTIMIZATION FOCUS

Launch these agents with comprehensive mobile platform requirements:

1. **ui-ux-designer** --mobile-first-design --touch-interfaces --responsive-layouts
   - Mission: Create optimal mobile user experience for wedding professional workflows
   
2. **performance-optimization-expert** --mobile-performance --battery-optimization --network-awareness
   - Mission: Optimize dashboard performance for mobile devices and networks
   
3. **react-ui-specialist** --responsive-components --mobile-hooks --touch-gestures
   - Mission: Build mobile-optimized React components with touch interaction support
   
4. **test-automation-architect** --mobile-testing --responsive-testing --touch-testing
   - Mission: Create comprehensive mobile testing suite across devices and orientations
   
5. **user-impact-analyzer** --mobile-usability --wedding-venue-usage --accessibility
   - Mission: Ensure mobile dashboard meets real-world wedding professional needs
   
6. **documentation-chronicler** --mobile-documentation --responsive-guides --mobile-patterns
   - Mission: Document mobile optimization patterns and responsive design decisions

## 🎯 TECHNICAL SPECIFICATION

**Core Mobile Requirements from WS-037:**
- Mobile-first responsive design with CSS Grid adaptation
- Touch-optimized drag-and-drop widget positioning
- Thumb-friendly navigation and interaction patterns
- Progressive loading and performance optimization
- Offline functionality with service worker integration
- Battery-conscious background processing and updates
- Cross-device responsive breakpoint management

## 📱 MOBILE IMPLEMENTATION REQUIREMENTS

### Core Mobile Components to Build:

**1. MobileDashboard.tsx (Mobile-Optimized Container)**
```typescript
import { useState, useEffect } from 'react';
import { useBreakpoints } from '$WS_ROOT/wedsync/src/lib/hooks/useBreakpoints';
import { useBatteryManager } from '$WS_ROOT/wedsync/src/lib/hooks/useBatteryManager';
import { useMobileGestures } from '$WS_ROOT/wedsync/src/lib/hooks/useMobileGestures';

interface MobileDashboardProps {
  widgets: DashboardWidget[];
  onWidgetReorder: (widgets: DashboardWidget[]) => void;
  suppressHydrationWarning?: boolean;
}

export const MobileDashboard = ({ widgets, onWidgetReorder }: MobileDashboardProps) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  const { batteryLevel, isLowBattery } = useBatteryManager();
  const [optimizedWidgets, setOptimizedWidgets] = useState(widgets);
  
  // Battery optimization: reduce update frequency when battery is low
  const updateInterval = isLowBattery ? 60000 : 30000; // 60s vs 30s
  
  const getGridColumns = () => {
    if (isMobile) return 'grid-cols-1';
    if (isTablet) return 'grid-cols-2';
    return 'grid-cols-3';
  };
  
  const getGapSize = () => {
    if (isMobile) return 'gap-3'; // 12px
    if (isTablet) return 'gap-4'; // 16px
    return 'gap-6'; // 24px
  };
  
  return (
    <div 
      className={cn(
        "dashboard-grid min-h-screen bg-gray-50",
        "grid auto-rows-min p-4",
        getGridColumns(),
        getGapSize(),
        "safe-area-inset-bottom" // iOS safe area support
      )}
      suppressHydrationWarning={true}
    >
      {optimizedWidgets.map((widget, index) => (
        <MobileWidget
          key={widget.id}
          widget={widget}
          index={index}
          isMobile={isMobile}
          isLowBattery={isLowBattery}
          onReorder={onWidgetReorder}
        />
      ))}
    </div>
  );
};
```

**2. MobileWidget.tsx (Touch-Optimized Widget)**
```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLongPress } from '$WS_ROOT/wedsync/src/lib/hooks/useLongPress';

interface MobileWidgetProps {
  widget: DashboardWidget;
  index: number;
  isMobile: boolean;
  isLowBattery: boolean;
  onReorder: (widgets: DashboardWidget[]) => void;
}

export const MobileWidget = ({ widget, isMobile, isLowBattery }: MobileWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });
  
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (isMobile) {
        setIsContextMenuOpen(true);
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    },
    threshold: 500, // 500ms for long press
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const getWidgetHeight = () => {
    if (widget.size === 'small') return 'h-32';
    if (widget.size === 'large') return 'h-48';
    return 'h-40'; // medium
  };
  
  const getTouchTargetSize = () => {
    return isMobile ? 'min-h-[44px]' : 'min-h-[32px]';
  };
  
  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "widget-container bg-white rounded-lg shadow-sm border border-gray-200",
          "touch-manipulation", // Disable double-tap zoom
          getWidgetHeight(),
          getTouchTargetSize(),
          isDragging && "shadow-lg scale-105",
          "transition-all duration-200 ease-out"
        )}
        {...attributes}
        {...listeners}
        {...longPressHandlers}
      >
        <WidgetHeader 
          widget={widget} 
          isMobile={isMobile}
          onContextMenu={() => setIsContextMenuOpen(true)}
        />
        
        <WidgetContent 
          widget={widget} 
          isLowBattery={isLowBattery}
          isMobile={isMobile}
        />
      </div>
      
      {isContextMenuOpen && (
        <MobileContextMenu
          widget={widget}
          isOpen={isContextMenuOpen}
          onClose={() => setIsContextMenuOpen(false)}
        />
      )}
    </>
  );
};
```

**3. MobileNavigationBar.tsx (Bottom Navigation)**
```typescript
interface MobileNavigationBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MobileNavigationBar = ({ currentPath, onNavigate }: MobileNavigationBarProps) => {
  const { isMobile } = useBreakpoints();
  
  if (!isMobile) return null;
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/forms', icon: FileText, label: 'Forms' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-white border-t border-gray-200",
      "safe-area-inset-bottom pb-2", // iOS safe area
      "flex justify-around items-center",
      "h-16"
    )}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path;
        
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center",
              "min-h-[44px] min-w-[44px] px-2", // Touch target size
              "rounded-lg transition-colors duration-200",
              "active:bg-gray-100", // Touch feedback
              isActive ? "text-blue-600" : "text-gray-500"
            )}
            aria-label={item.label}
          >
            <Icon 
              className={cn(
                "w-5 h-5 mb-1",
                isActive && "stroke-2"
              )} 
            />
            <span className="text-xs font-medium truncate">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
```

**4. MobileGestureHandler.tsx (Touch Gesture Management)**
```typescript
interface TouchGesture {
  type: 'swipe' | 'pinch' | 'tap' | 'long-press';
  direction?: 'left' | 'right' | 'up' | 'down';
  element: HTMLElement;
  callback: (event: TouchEvent) => void;
}

export class MobileGestureHandler {
  private gestures = new Map<string, TouchGesture>();
  private touchStart: Touch | null = null;
  private touchStartTime = 0;
  
  constructor(private container: HTMLElement) {
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }
  
  registerGesture(id: string, gesture: TouchGesture): void {
    this.gestures.set(id, gesture);
  }
  
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStart = event.touches[0];
      this.touchStartTime = Date.now();
    }
  }
  
  private handleTouchMove(event: TouchEvent): void {
    // Prevent scrolling during drag operations
    if (event.target instanceof HTMLElement && 
        event.target.closest('[data-draggable="true"]')) {
      event.preventDefault();
    }
  }
  
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.touchStart) return;
    
    const touchEnd = event.changedTouches[0];
    const deltaX = touchEnd.clientX - this.touchStart.clientX;
    const deltaY = touchEnd.clientY - this.touchStart.clientY;
    const deltaTime = Date.now() - this.touchStartTime;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const isSwipe = distance > 50 && deltaTime < 300; // 50px minimum, 300ms maximum
    const isLongPress = deltaTime > 500 && distance < 10; // 500ms minimum, 10px maximum movement
    
    if (isSwipe) {
      const direction = Math.abs(deltaX) > Math.abs(deltaY)
        ? (deltaX > 0 ? 'right' : 'left')
        : (deltaY > 0 ? 'down' : 'up');
      
      this.handleSwipe(event.target as HTMLElement, direction);
    } else if (isLongPress) {
      this.handleLongPress(event.target as HTMLElement);
    }
    
    this.touchStart = null;
  }
  
  private handleSwipe(element: HTMLElement, direction: string): void {
    for (const [id, gesture] of this.gestures) {
      if (gesture.type === 'swipe' && 
          gesture.direction === direction &&
          (element === gesture.element || element.closest(`[data-gesture-id="${id}"]`))) {
        gesture.callback(event as any);
        break;
      }
    }
  }
  
  private handleLongPress(element: HTMLElement): void {
    for (const [id, gesture] of this.gestures) {
      if (gesture.type === 'long-press' &&
          (element === gesture.element || element.closest(`[data-gesture-id="${id}"]`))) {
        gesture.callback(event as any);
        break;
      }
    }
  }
  
  destroy(): void {
    this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.gestures.clear();
  }
}
```

**5. useMobileOptimizations.ts (Mobile Performance Hook)**
```typescript
import { useState, useEffect, useCallback } from 'react';

interface MobileOptimizations {
  isLowBattery: boolean;
  connectionType: string;
  shouldReduceMotion: boolean;
  shouldLazyLoad: boolean;
  updateInterval: number;
  maxConcurrentRequests: number;
}

export const useMobileOptimizations = (): MobileOptimizations => {
  const [batteryLevel, setBatteryLevel] = useState<number>(1);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [shouldReduceMotion, setShouldReduceMotion] = useState<boolean>(false);
  
  useEffect(() => {
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level);
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level);
        });
      });
    }
    
    // Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
      });
    }
    
    // Reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(motionQuery.matches);
    
    motionQuery.addEventListener('change', (e) => {
      setShouldReduceMotion(e.matches);
    });
  }, []);
  
  const isLowBattery = batteryLevel < 0.2; // Below 20%
  const isSlowConnection = ['slow-2g', '2g', '3g'].includes(connectionType);
  
  const optimizations: MobileOptimizations = {
    isLowBattery,
    connectionType,
    shouldReduceMotion,
    shouldLazyLoad: isSlowConnection || isLowBattery,
    updateInterval: isLowBattery ? 60000 : isSlowConnection ? 45000 : 30000,
    maxConcurrentRequests: isSlowConnection ? 2 : isLowBattery ? 3 : 6
  };
  
  return optimizations;
};
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Mobile-first responsive dashboard with CSS Grid adaptation
- [ ] Touch-optimized drag-and-drop widget positioning
- [ ] Mobile navigation bar with thumb-friendly controls
- [ ] Gesture handling system for mobile interactions
- [ ] Performance optimizations for mobile networks and battery
- [ ] Offline functionality with service worker integration
- [ ] Cross-device responsive testing and validation
- [ ] Mobile accessibility compliance and testing

## 🎭 PLAYWRIGHT TESTING REQUIREMENTS

```typescript
// 1. RESPONSIVE BREAKPOINT TESTING
const breakpoints = [
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile-large', width: 414, height: 896 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 }
];

for (const breakpoint of breakpoints) {
  test(`Dashboard responsive at ${breakpoint.name}`, async ({ page }) => {
    await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
    await page.goto('/dashboard');
    
    // Verify layout adapts correctly
    const gridColumns = await page.locator('.dashboard-grid').evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );
    
    if (breakpoint.width < 768) {
      expect(gridColumns).toBe('1fr'); // Single column on mobile
    } else if (breakpoint.width < 1024) {
      expect(gridColumns).toBe('1fr 1fr'); // Two columns on tablet
    } else {
      expect(gridColumns).toBe('1fr 1fr 1fr'); // Three columns on desktop
    }
    
    await page.screenshot({
      path: `dashboard-${breakpoint.name}.png`,
      fullPage: true
    });
  });
}

// 2. TOUCH GESTURE TESTING
test('Mobile touch gestures work correctly', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dashboard');
  
  // Test long press for context menu
  const widget = page.locator('[data-testid="widget-todays-focus"]');
  await widget.tap({ force: true });
  await page.waitForTimeout(600); // Long press duration
  
  await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();
  
  // Test swipe gesture (if implemented)
  await widget.swipeLeft();
  await expect(page.locator('[data-testid="widget-actions"]')).toBeVisible();
});

// 3. MOBILE DRAG-AND-DROP TESTING
test('Mobile drag-and-drop works with touch', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dashboard');
  
  const sourceWidget = page.locator('[data-testid="widget-todays-focus"]');
  const targetWidget = page.locator('[data-testid="widget-activity-feed"]');
  
  // Perform touch-based drag and drop
  const sourceBounds = await sourceWidget.boundingBox();
  const targetBounds = await targetWidget.boundingBox();
  
  if (sourceBounds && targetBounds) {
    await page.touchscreen.touchStart(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    
    await page.touchscreen.touchMove(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2
    );
    
    await page.touchscreen.touchEnd();
  }
  
  // Verify widget order changed
  await page.waitForTimeout(500);
  const newOrder = await page.locator('.widget-container').evaluateAll(
    widgets => widgets.map(w => w.getAttribute('data-testid'))
  );
  
  expect(newOrder[0]).toBe('widget-activity-feed');
  expect(newOrder[1]).toBe('widget-todays-focus');
});

// 4. MOBILE NAVIGATION TESTING
test('Mobile navigation bar works correctly', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dashboard');
  
  // Verify mobile navigation is visible
  await expect(page.locator('[data-testid="mobile-nav-bar"]')).toBeVisible();
  
  // Test navigation to different sections
  await page.click('[data-testid="nav-clients"]');
  await expect(page).toHaveURL(/.*\/clients/);
  
  await page.click('[data-testid="nav-dashboard"]');
  await expect(page).toHaveURL(/.*\/dashboard/);
  
  // Verify touch targets are appropriately sized
  const navButtons = page.locator('[data-testid="mobile-nav-bar"] button');
  const buttonSizes = await navButtons.evaluateAll(buttons => 
    buttons.map(btn => {
      const rect = btn.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })
  );
  
  buttonSizes.forEach(size => {
    expect(size.width).toBeGreaterThanOrEqual(44); // Minimum touch target
    expect(size.height).toBeGreaterThanOrEqual(44);
  });
});

// 5. MOBILE PERFORMANCE TESTING
test('Dashboard loads quickly on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Simulate slow 3G connection
  await page.route('**/*', (route) => {
    route.continue({ method: 'GET' });
  });
  
  const startTime = Date.now();
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid="dashboard-loaded"]');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds on 3G
  
  // Test Core Web Vitals
  const vitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const vitals: any = {};
        
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            vitals.lcp = entry.startTime;
          }
          if (entry.entryType === 'first-input') {
            vitals.fid = entry.processingStart - entry.startTime;
          }
        });
        
        resolve(vitals);
      }).observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      
      setTimeout(() => resolve({}), 3000); // Timeout after 3 seconds
    });
  });
  
  if (vitals.lcp) expect(vitals.lcp).toBeLessThan(4000); // LCP < 4s on mobile
  if (vitals.fid) expect(vitals.fid).toBeLessThan(100); // FID < 100ms
});

// 6. BATTERY OPTIMIZATION TESTING
test('Dashboard optimizes for low battery', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Mock low battery state
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve({
        level: 0.15, // 15% battery
        charging: false
      })
    });
  });
  
  await page.goto('/dashboard');
  
  // Verify low battery optimizations are active
  await expect(page.locator('[data-testid="battery-optimization-notice"]')).toBeVisible();
  
  // Check that update intervals are reduced
  const updateInterval = await page.evaluate(() => {
    return window.dashboardUpdateInterval || 30000;
  });
  
  expect(updateInterval).toBeGreaterThan(45000); // Should be > 45s for low battery
});
```

## 💾 WHERE TO SAVE YOUR WORK

- **Mobile Components**: `$WS_ROOT/wedsync/src/components/dashboard/mobile/`
  - `MobileDashboard.tsx`
  - `MobileWidget.tsx`
  - `MobileNavigationBar.tsx`
  - `MobileContextMenu.tsx`
- **Mobile Hooks**: `$WS_ROOT/wedsync/src/lib/hooks/`
  - `useMobileOptimizations.ts`
  - `useBreakpoints.ts`
  - `useTouchGestures.ts`
  - `useBatteryManager.ts`
- **Gesture Handling**: `$WS_ROOT/wedsync/src/lib/mobile/`
  - `MobileGestureHandler.ts`
  - `TouchEventManager.ts`
- **Mobile Tests**: `$WS_ROOT/wedsync/tests/mobile/dashboard/`
- **Responsive Styles**: Integrated in existing component files with mobile-first approach

## 🏁 COMPLETION CHECKLIST

### Mobile Implementation:
- [ ] Mobile-first responsive design with fluid CSS Grid
- [ ] Touch-optimized drag-and-drop widget positioning
- [ ] Mobile navigation bar with thumb-friendly controls
- [ ] Touch gesture handling with proper event delegation
- [ ] Performance optimizations for mobile networks
- [ ] Battery-conscious background processing
- [ ] Offline functionality with service worker

### Responsive Design:
- [ ] Breakpoint testing across all device sizes
- [ ] Touch target sizing (minimum 44px) compliance
- [ ] Orientation change handling (portrait/landscape)
- [ ] Safe area support for iOS devices
- [ ] High-DPI screen optimization
- [ ] Mobile typography and spacing optimization

### Performance & Accessibility:
- [ ] Mobile Core Web Vitals optimization (LCP < 4s, FID < 100ms)
- [ ] Bundle size optimization for mobile networks
- [ ] Lazy loading implementation for below-the-fold content
- [ ] Mobile accessibility testing with screen readers
- [ ] Keyboard navigation support for mobile keyboards

### Integration Points:
- [ ] Seamless integration with Team A desktop dashboard
- [ ] Mobile API optimization coordination with Team B
- [ ] Real-time functionality testing with Team C integrations
- [ ] Comprehensive mobile test scenarios for Team E

### Evidence Package:
- [ ] Screenshots of dashboard across all breakpoints
- [ ] Mobile performance metrics and Core Web Vitals
- [ ] Touch interaction demonstration videos
- [ ] Battery optimization testing results
- [ ] Accessibility audit results for mobile devices

---

**EXECUTE IMMEDIATELY - This is a comprehensive mobile optimization prompt with full responsive design requirements!**