# 05-mobile-optimization.md

## What to Build

Ensure wedding websites are fully responsive and optimized for mobile viewing, as 70%+ of guests will access on phones.

## Key Technical Requirements

### Mobile-First Components

```
interface MobileOptimization {
  viewport_meta: string
  touch_targets: {
    min_size: '48px'
    spacing: '8px'
  }
  images: {
    responsive_srcset: boolean
    lazy_loading: boolean
    format: 'webp' | 'jpg'
  }
  performance: {
    critical_css: boolean
    font_display: 'swap'
    preload_fonts: string[]
  }
}
```

### Responsive Layout System

```
const MobileLayout = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 640px)')
  
  return (
    <div className={cn(
      'min-h-screen',
      isMobile ? 'pb-20' : 'pb-8' // Account for mobile navigation
    )}>
      {isMobile ? (
        <MobileNavigation />
      ) : (
        <DesktopHeader />
      )}
      <main className="px-4 md:px-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
```

### Performance Optimization

```
const imageOptimization = {
  sizes: {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw'
  },
  formats: ['webp', 'jpg'],
  quality: 85,
  loading: 'lazy'
}

// Service Worker for offline access
const cacheStrategy = {
  pages: 'network-first',
  images: 'cache-first',
  fonts: 'cache-first'
}
```

## Critical Implementation Notes

1. **Test on real devices** not just browser DevTools
2. **Optimize First Contentful Paint** to under 1.5s on 3G
3. **Implement touch gestures** for image galleries
4. **Add to Home Screen** prompt for frequent visitors
5. **Offline fallback page** with essential info cached