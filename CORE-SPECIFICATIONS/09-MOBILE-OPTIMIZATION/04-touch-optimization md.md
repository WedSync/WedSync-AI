# 04-touch-optimization.md

# Touch Optimization Guide for WedSync/WedMe

## Overview

Touch optimization is critical for wedding professionals who need to access the platform during events with one hand while managing equipment, and couples who primarily use mobile devices for planning.

## Core Touch Principles

### 1. Minimum Touch Target Sizes

```css
/* Base touch target requirements */
.touch-target {
  min-height: 48px; /* Google Material Design recommendation */
  min-width: 48px;
  padding: 12px; /* Increase actual touch area beyond visual boundaries */
}

/* iOS-specific adjustments */
@supports (-webkit-touch-callout: none) {
  .touch-target {
    min-height: 44px; /* Apple HIG minimum */
  }
}

/* Critical actions need larger targets */
.primary-action {
  min-height: 56px;
  min-width: 120px;
  font-size: 18px;
}

```

### 2. Touch-Friendly Spacing

```tsx
// Spacing constants for touch interfaces
const TOUCH_SPACING = {
  between_buttons: 8,  // Minimum space between tap targets
  edge_padding: 16,    // Distance from screen edges
  list_item_padding: 16, // Vertical padding for list items
  form_field_spacing: 24, // Space between form inputs
  section_spacing: 32  // Space between content sections
};

```

## Form Optimization for Touch

### Input Field Enhancements

```tsx
// Touch-optimized form input component
const TouchInput: React.FC<InputProps> = ({ type, label, ...props }) => {
  return (
    <div className="touch-input-wrapper">
      <label className="text-base font-medium mb-2 block">
        {label}
      </label>
      <input
        type={type}
        className="w-full h-14 px-4 text-base rounded-lg border-2
                   border-gray-300 focus:border-primary-500
                   transition-colors duration-200"
        style={{
          fontSize: '16px', // Prevents zoom on iOS
          WebkitAppearance: 'none', // Remove iOS styling
        }}
        {...props}
      />
    </div>
  );
};

```

### Smart Keyboard Management

```tsx
// Keyboard visibility handler
const useKeyboardVisibility = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const fullHeight = window.screen.height;
      setKeyboardHeight(fullHeight - viewportHeight);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  return { keyboardHeight, isKeyboardVisible: keyboardHeight > 100 };
};

```

## Gesture Support Implementation

### 1. Swipe Navigation

```tsx
// Swipe gesture handler for navigation
const useSwipeNavigation = () => {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    // Horizontal swipe detection (minimum 50px movement)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
        router.back(); // Swipe right - go back
      } else {
        // Swipe left - could navigate forward in workflow
      }
    }
  };

  return { handleTouchStart, handleTouchEnd };
};

```

### 2. Pull-to-Refresh

```tsx
// Pull-to-refresh implementation
const PullToRefresh: React.FC<{ onRefresh: () => Promise<void> }> = ({
  onRefresh,
  children
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const TRIGGER_DISTANCE = 80;

  const handleTouchMove = (e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      const touch = e.touches[0];
      const distance = Math.max(0, touch.clientY - touchStart);
      setPullDistance(Math.min(distance, TRIGGER_DISTANCE * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > TRIGGER_DISTANCE) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div className="relative">
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex justify-center"
          style={{ height: pullDistance }}
        >
          <LoadingSpinner size={Math.min(pullDistance / 2, 40)} />
        </div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
};

```

## Bottom Navigation Optimization

### Thumb-Friendly Navigation

```tsx
// Bottom navigation for one-handed use
const MobileNavigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t
                    safe-area-pb shadow-lg z-50">
      <div className="grid grid-cols-5 h-16">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center
                       touch-target relative ${
              activeTab === item.id ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
            {item.hasNotification && (
              <span className="absolute top-2 right-4 w-2 h-2
                             bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

```

## Touch Feedback Enhancement

### Visual Feedback

```css
/* Immediate visual feedback for touches */
.touchable {
  transition: transform 0.1s, opacity 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.touchable:active {
  transform: scale(0.98);
  opacity: 0.9;
}

/* Ripple effect for Material Design */
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple:active::after {
  width: 300px;
  height: 300px;
}

```

### Haptic Feedback

```tsx
// Haptic feedback for critical actions
const useHapticFeedback = () => {
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate(patterns[type]);
    }

    // iOS Haptic Feedback (if using Capacitor/Cordova)
    if (window.Haptics) {
      const impactStyle = {
        light: 'LIGHT',
        medium: 'MEDIUM',
        heavy: 'HEAVY'
      };
      window.Haptics.impact({ style: impactStyle[type] });
    }
  };

  return { triggerHaptic };
};

```

## Scroll Optimization

### Momentum Scrolling

```css
/* Enable smooth momentum scrolling on iOS */
.scrollable {
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

/* Prevent scroll chaining */
.modal-content {
  overscroll-behavior: contain;
}

/* Hide scrollbars on mobile while maintaining scrollability */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

```

### Infinite Scroll Implementation

```tsx
// Touch-optimized infinite scroll
const useInfiniteScroll = (loadMore: () => Promise<void>) => {
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setIsLoading(true);
          await loadMore();
          setIsLoading(false);
        }
      },
      { rootMargin: '100px' } // Load before reaching the end
    );

    if (triggerRef.current) {
      observerRef.current.observe(triggerRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore, isLoading]);

  return { triggerRef, isLoading };
};

```

## Wedding Day Mode Optimizations

### Quick Access Interface

```tsx
// Large touch targets for wedding day use
const WeddingDayQuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <button className="h-32 bg-primary-500 text-white rounded-xl
                        flex flex-col items-center justify-center
                        active:scale-95 transition-transform">
        <CameraIcon className="w-12 h-12 mb-2" />
        <span className="text-lg font-semibold">Shot List</span>
      </button>

      <button className="h-32 bg-green-500 text-white rounded-xl
                        flex flex-col items-center justify-center
                        active:scale-95 transition-transform">
        <PhoneIcon className="w-12 h-12 mb-2" />
        <span className="text-lg font-semibold">Contacts</span>
      </button>

      <button className="h-32 bg-blue-500 text-white rounded-xl
                        flex flex-col items-center justify-center
                        active:scale-95 transition-transform">
        <ClockIcon className="w-12 h-12 mb-2" />
        <span className="text-lg font-semibold">Timeline</span>
      </button>

      <button className="h-32 bg-purple-500 text-white rounded-xl
                        flex flex-col items-center justify-center
                        active:scale-95 transition-transform">
        <MapIcon className="w-12 h-12 mb-2" />
        <span className="text-lg font-semibold">Directions</span>
      </button>
    </div>
  );
};

```

## Testing Checklist

### Manual Testing Points

- [ ]  All buttons have 48px minimum touch target
- [ ]  Form inputs don't zoom on focus (iOS)
- [ ]  Swipe gestures work smoothly
- [ ]  Scroll doesn't stick or jump
- [ ]  Double-tap is disabled where not needed
- [ ]  Long press doesn't trigger browser context menu
- [ ]  Pull-to-refresh works consistently
- [ ]  Bottom navigation is reachable with thumb
- [ ]  Modals can be dismissed with swipe/tap outside
- [ ]  Loading states are touch-responsive

### Automated Testing

```tsx
// Touch target size validation
describe('Touch Optimization Tests', () => {
  it('should have minimum touch target sizes', () => {
    cy.get('.touch-target').each(($el) => {
      expect($el.height()).to.be.at.least(48);
      expect($el.width()).to.be.at.least(48);
    });
  });

  it('should prevent zoom on input focus', () => {
    cy.get('input').each(($input) => {
      const fontSize = window.getComputedStyle($input[0]).fontSize;
      expect(parseInt(fontSize)).to.be.at.least(16);
    });
  });
});

```

## Performance Considerations

### Touch Response Optimization

- Use `touch-action: manipulation` to eliminate 300ms delay
- Implement passive event listeners for scroll performance
- Debounce rapid tap events to prevent accidental double-actions
- Pre-load touch feedback animations

### Memory Management

- Remove touch event listeners on component unmount
- Clear gesture recognition timeouts
- Limit stored touch history for gesture detection
- Use `will-change` CSS property sparingly

## Accessibility Integration

### Touch with Screen Readers

- Ensure all touch targets have proper ARIA labels
- Provide alternative navigation methods for complex gestures
- Test with TalkBack (Android) and VoiceOver (iOS)
- Implement focus indicators for keyboard navigation fallback