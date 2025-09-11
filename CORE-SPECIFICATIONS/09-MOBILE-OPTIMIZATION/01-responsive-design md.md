# 01-responsive-design.md

# WedSync/WedMe Responsive Design Documentation

## Overview

This document outlines the responsive design strategy for both WedSync (supplier platform) and WedMe (couple platform), ensuring optimal user experience across all devices with particular emphasis on wedding-day mobile usage scenarios.

## Design Philosophy

### Mobile-First Approach

- Start with mobile design (320px minimum width)
- Progressive enhancement for larger screens
- Touch-first interactions with mouse/keyboard as enhancements
- Prioritize critical wedding-day features on mobile

### Breakpoint Strategy

```css
/* Core breakpoints aligned with real devices */
--xs: 375px;   /* iPhone SE/Mini */
--sm: 640px;   /* Large phones */
--md: 768px;   /* Tablets (iPad Mini) */
--lg: 1024px;  /* iPad Pro / Small laptops */
--xl: 1280px;  /* Desktops */
--2xl: 1536px; /* Large screens */

```

## Component-Specific Responsive Patterns

### Navigation

### Desktop Navigation

```tsx
// Full horizontal navigation with all menu items visible
<nav className="hidden lg:flex items-center space-x-6">
  <NavItem href="/dashboard" icon={Dashboard} label="Dashboard" />
  <NavItem href="/clients" icon={Users} label="Clients" />
  <NavItem href="/forms" icon={Forms} label="Forms" />
  <NavItem href="/journeys" icon={Journey} label="Journeys" />
  <NavItem href="/communications" icon={Mail} label="Communications" />
  <NavItem href="/growth" icon={TrendingUp} label="Growth" />
</nav>

```

### Mobile Navigation

```tsx
// Bottom tab bar for primary actions
<nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t safe-bottom">
  <div className="grid grid-cols-5 h-16">
    <TabItem icon={Dashboard} label="Home" />
    <TabItem icon={Users} label="Clients" />
    <TabItem icon={Forms} label="Forms" badge={3} />
    <TabItem icon={Journey} label="Journey" />
    <TabItem icon={Menu} label="More" />
  </div>
</nav>

```

### Forms System Responsive Behavior

### Form Builder Canvas

```tsx
// Responsive grid system for form fields
<div className="form-builder-canvas">
  {/* Desktop: Multi-column layout */}
  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {formFields.map(field => <FormField key={field.id} {...field} />)}
  </div>

  {/* Mobile: Single column with collapsible sections */}
  <div className="md:hidden space-y-2">
    {formSections.map(section => (
      <CollapsibleSection key={section.id} title={section.title}>
        {section.fields.map(field => <MobileFormField key={field.id} {...field} />)}
      </CollapsibleSection>
    ))}
  </div>
</div>

```

### Form Completion (Client View)

```tsx
// Mobile-optimized form interface
const MobileFormView = () => (
  <div className="max-w-full px-4 pb-20"> {/* Padding for bottom nav */}
    <ProgressBar current={currentStep} total={totalSteps} />

    {/* One field group at a time on mobile */}
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-4">{currentSection.title}</h2>
      {currentSection.fields.map(field => (
        <div key={field.id} className="mb-6">
          <FormInput
            {...field}
            className="w-full text-base" // Prevents zoom on iOS
            touchOptimized={true}
          />
        </div>
      ))}
    </div>

    {/* Fixed bottom action bar */}
    <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4">
      <div className="flex justify-between">
        <button className="btn-secondary">Previous</button>
        <button className="btn-primary">Next</button>
      </div>
    </div>
  </div>
);

```

### Dashboard Components

### Priority Widget Responsive Scaling

```tsx
const PriorityWidget = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  return (
    <div className={`
      ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6'}
      bg-white rounded-lg shadow-sm
    `}>
      {isMobile ? (
        // Condensed mobile view
        <CompactPriorityList items={priorities.slice(0, 3)} />
      ) : isTablet ? (
        // Tablet view with more items
        <MediumPriorityList items={priorities.slice(0, 5)} />
      ) : (
        // Full desktop view
        <FullPriorityList items={priorities} />
      )}
    </div>
  );
};

```

### Wedding Day Module (Critical Mobile Feature)

```tsx
const WeddingDayModule = () => (
  <div className="wedding-day-module">
    {/* Mobile: Full screen takeover */}
    <div className="lg:hidden fixed inset-0 z-50 bg-white">
      <WeddingDayMobileView />
    </div>

    {/* Desktop: Dashboard widget */}
    <div className="hidden lg:block">
      <WeddingDayDesktopWidget />
    </div>
  </div>
);

const WeddingDayMobileView = () => (
  <div className="h-full flex flex-col">
    {/* Fixed header with critical info */}
    <header className="bg-primary text-white p-4">
      <h1 className="text-lg font-bold">Emma & James Wedding</h1>
      <p className="text-sm opacity-90">Tap for directions • 28 min away</p>
    </header>

    {/* Scrollable timeline */}
    <div className="flex-1 overflow-y-auto">
      <TimelineView mobile={true} />
    </div>

    {/* Quick action buttons */}
    <footer className="border-t p-4 grid grid-cols-3 gap-2">
      <button className="btn-quick">📞 Call</button>
      <button className="btn-quick">🗺 Navigate</button>
      <button className="btn-quick">📋 Details</button>
    </footer>
  </div>
);

```

## Touch Optimization

### Touch Target Sizes

```css
/* Minimum 48x48px touch targets (Google recommendation) */
.btn-mobile,
.form-input,
.nav-item {
  min-height: 48px;
  min-width: 48px;
  padding: 12px 16px;
}

/* Spacing between interactive elements */
.touch-list > * + * {
  margin-top: 8px; /* Prevent accidental taps */
}

```

### Gesture Support

```tsx
// Swipe navigation for mobile
import { useSwipeable } from 'react-swipeable';

const MobileGallery = ({ images }) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => nextImage(),
    onSwipedRight: () => prevImage(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  return (
    <div {...handlers} className="touch-none select-none">
      {/* Gallery content */}
    </div>
  );
};

```

## Responsive Tables

### Desktop Table View

```tsx
<table className="hidden md:table w-full">
  <thead>
    <tr>
      <th>Client</th>
      <th>Wedding Date</th>
      <th>Venue</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {clients.map(client => <ClientRow key={client.id} {...client} />)}
  </tbody>
</table>

```

### Mobile Card View

```tsx
<div className="md:hidden space-y-3">
  {clients.map(client => (
    <div key={client.id} className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{client.names}</h3>
        <StatusBadge status={client.status} />
      </div>
      <p className="text-sm text-gray-600">{client.weddingDate}</p>
      <p className="text-sm text-gray-600">{client.venue}</p>
      <div className="mt-3 flex gap-2">
        <button className="btn-sm">View</button>
        <button className="btn-sm">Message</button>
      </div>
    </div>
  ))}
</div>

```

## Performance Considerations

### Responsive Image Loading

```tsx
const ResponsiveImage = ({ src, alt }) => (
  <picture>
    <source
      media="(max-width: 640px)"
      srcSet={`${src}?w=640&q=75 1x, ${src}?w=1280&q=75 2x`}
    />
    <source
      media="(max-width: 1024px)"
      srcSet={`${src}?w=1024&q=80 1x, ${src}?w=2048&q=80 2x`}
    />
    <img
      src={`${src}?w=1920&q=85`}
      alt={alt}
      loading="lazy"
      className="w-full h-auto"
    />
  </picture>
);

```

### Conditional Component Loading

```tsx
const DashboardLayout = () => {
  const isMobile = useMediaQuery('(max-width: 640px)');

  return (
    <>
      {/* Load heavy components only on desktop */}
      {!isMobile && <AnalyticsWidget />}
      {!isMobile && <ActivityFeed />}

      {/* Always load critical components */}
      <PriorityTasks />
      <ClientList />
    </>
  );
};

```

## Accessibility in Responsive Design

### Focus Management

```tsx
// Ensure focus is visible on all screen sizes
const FocusableElement = styled.button`
  &:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    &:focus {
      outline-offset: 4px; /* More space on mobile */
    }
  }
`;

```

### Screen Reader Considerations

```tsx
// Hide decorative elements on mobile to reduce verbosity
<div className="hidden sm:block" aria-hidden="true">
  <DecorativeIcon />
</div>

// Provide mobile-specific labels
<button
  aria-label={isMobile ? "Menu" : "Open navigation menu"}
  className="btn-nav"
>
  {isMobile ? "☰" : "Menu"}
</button>

```

## Testing Responsive Designs

### Device Testing Matrix

- **Phones**: iPhone SE (375px), iPhone 14 (390px), Samsung S22 (412px)
- **Tablets**: iPad Mini (768px), iPad Pro (1024px)
- **Laptops**: MacBook Air (1280px), Windows laptop (1366px)
- **Desktop**: Standard monitor (1920px), Ultrawide (2560px)

### Automated Testing

```tsx
// Playwright responsive tests
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 }
];

viewports.forEach(({ name, width, height }) => {
  test(`Dashboard renders correctly on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/dashboard');

    if (width < 768) {
      await expect(page.locator('.mobile-nav')).toBeVisible();
      await expect(page.locator('.desktop-nav')).toBeHidden();
    } else {
      await expect(page.locator('.desktop-nav')).toBeVisible();
      await expect(page.locator('.mobile-nav')).toBeHidden();
    }
  });
});

```

## Implementation Checklist

- [ ]  Set up Tailwind CSS with custom breakpoints
- [ ]  Create responsive navigation components
- [ ]  Implement touch-optimized form inputs
- [ ]  Build mobile-specific wedding day module
- [ ]  Add gesture support for galleries
- [ ]  Create responsive table/card views
- [ ]  Implement responsive image loading
- [ ]  Test on physical devices
- [ ]  Add viewport meta tag
- [ ]  Ensure text is readable without zooming
- [ ]  Test with screen readers on mobile
- [ ]  Optimize performance for 3G connections
- [ ]  Implement offline fallbacks
- [ ]  Add mobile-specific error states

## Best Practices

1. **Never disable zoom** - Users may need to zoom for accessibility
2. **Use relative units** - rem/em for typography, % for layouts
3. **Test with real content** - Long names, multiple venues, etc.
4. **Consider thumb reach** - Important actions in bottom third on mobile
5. **Minimize data usage** - Crucial for venue WiFi/cellular
6. **Fast interaction feedback** - Immediate visual response to touches
7. **Progressive disclosure** - Show less on mobile, reveal on demand