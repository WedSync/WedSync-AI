# 06-mobile-experience.md

## What to Build

Optimize the couple's dashboard for mobile devices with touch-friendly navigation and progressive disclosure of information.

## Key Technical Requirements

### Mobile Layout Structure

```
// components/couple/MobileDashboard.tsx
const MobileDashboard = () => {
  return (
    <div className="min-h-screen pb-16"> {/* Space for bottom nav */}
      <MobileHeader />
      <SwipeableViews>
        <OverviewTab />
        <SuppliersTab />
        <TasksTab />
        <TimelineTab />
      </SwipeableViews>
      <BottomNavigation />
    </div>
  );
};
```

### Bottom Navigation

```
const bottomNavItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Users, label: 'Vendors', path: '/suppliers' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: Calendar, label: 'Timeline', path: '/timeline' },
  { icon: Menu, label: 'More', path: '/menu' }
];
```

### Touch Optimizations

```
/* Minimum touch targets */
.touch-target {
  min-height: 48px;
  min-width: 48px;
}

/* Swipe gestures */
.swipeable-card {
  touch-action: pan-y;
}

/* Prevent zoom on input focus (iOS) */
input, select, textarea {
  font-size: 16px;
}
```

### PWA Configuration

```
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});
```

## Critical Implementation Notes

- Lazy load supplier cards (show 5, then "Load More")
- Collapsible sections with smooth animations
- Pull-to-refresh on main dashboard
- Offline mode for viewing cached data
- Quick actions floating action button (FAB)
- Haptic feedback for important actions (iOS)

## Performance Targets

- First Contentful Paint: <1.5s on 3G
- Time to Interactive: <3s
- Lighthouse Performance Score: >90
- Bundle size: <200KB for initial load