# Mobile Search Usage Guide

## Overview

The WedSync mobile search experience is optimized for wedding vendors and couples on-the-go. This guide covers mobile-specific features, touch interactions, and best practices for mobile search implementation.

## Mobile-First Design Principles

### Touch-Friendly Interface
- **Minimum Touch Targets**: 48x48px minimum for all interactive elements
- **Thumb Navigation**: Critical actions within thumb reach (bottom 60% of screen)
- **Generous Spacing**: Adequate spacing between touch targets
- **Visual Feedback**: Clear hover/press states for all interactions

### Responsive Breakpoints
```css
/* Mobile Portrait */
@media (max-width: 375px) { /* iPhone SE */ }
@media (max-width: 414px) { /* iPhone Plus */ }

/* Mobile Landscape */
@media (max-width: 736px) { /* iPhone Plus Landscape */ }
@media (max-width: 812px) { /* iPhone X Landscape */ }

/* Tablet */
@media (min-width: 768px) { /* iPad Portrait */ }
@media (min-width: 1024px) { /* iPad Landscape */ }
```

### Performance Optimization
- **Bundle Size**: Search JavaScript < 50KB gzipped
- **Image Optimization**: WebP format with fallbacks
- **Lazy Loading**: Progressive image and content loading
- **Caching**: Aggressive caching of search results and images

## Mobile Search Components

### 1. Search Input

#### Implementation
```typescript
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchAutocomplete } from '@/lib/search/api';

interface MobileSearchInputProps {
  onSearchResults: (results: any[]) => void;
  placeholder?: string;
  location?: string;
}

export function MobileSearchInput({ 
  onSearchResults, 
  placeholder = "Search wedding vendors...",
  location 
}: MobileSearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isActive, setIsActive] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);
  
  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const response = await searchAutocomplete({
        q: searchQuery,
        location: location,
        limit: 5
      });
      setSuggestions(response.suggestions);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };
  
  return (
    <div className="mobile-search-container">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsActive(true)}
          onBlur={() => setTimeout(() => setIsActive(false), 200)}
          placeholder={placeholder}
          className="mobile-search-input"
          autoComplete="off"
          aria-label="Search wedding vendors"
        />
        <button 
          className="search-button"
          aria-label="Search"
          type="submit"
        >
          🔍
        </button>
      </div>
      
      {isActive && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-item"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <span className="suggestion-text">{suggestion.text}</span>
              {suggestion.type === 'vendor' && (
                <span className="vendor-info">
                  ⭐ {suggestion.rating} • {suggestion.location}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Styling
```css
.mobile-search-container {
  width: 100%;
  position: relative;
  margin-bottom: 1rem;
}

.search-input-wrapper {
  display: flex;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.mobile-search-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px; /* Prevent zoom on iOS */
  border: none;
  outline: none;
  background: transparent;
}

.search-button {
  padding: 12px 16px;
  background: #7c3aed;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  min-width: 48px; /* Minimum touch target */
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border: none;
  background: white;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  min-height: 48px; /* Touch target */
}

.suggestion-item:hover,
.suggestion-item:active {
  background: #f9fafb;
}

.vendor-info {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
```

### 2. Filter Interface

#### Mobile Filter Panel
```typescript
interface MobileFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
}

export function MobileFilters({ filters, onFiltersChange, onClose }: MobileFiltersProps) {
  return (
    <div className="mobile-filters-overlay">
      <div className="mobile-filters-panel">
        <div className="filters-header">
          <h3>Filter Results</h3>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
        
        <div className="filters-content">
          {/* Vendor Type Filter */}
          <FilterSection title="Vendor Type">
            <div className="filter-grid">
              {vendorTypes.map(type => (
                <FilterChip
                  key={type.id}
                  label={type.label}
                  selected={filters.vendorType?.includes(type.id)}
                  onToggle={() => toggleVendorType(type.id)}
                />
              ))}
            </div>
          </FilterSection>
          
          {/* Price Range Filter */}
          <FilterSection title="Budget Range">
            <PriceRangeSlider
              min={0}
              max={10000}
              value={[filters.priceRange?.min || 0, filters.priceRange?.max || 10000]}
              onChange={handlePriceRangeChange}
            />
          </FilterSection>
          
          {/* Location Filter */}
          <FilterSection title="Distance">
            <RadiusSlider
              value={filters.radius || 25}
              onChange={handleRadiusChange}
              max={100}
              unit="miles"
            />
          </FilterSection>
          
          {/* Rating Filter */}
          <FilterSection title="Minimum Rating">
            <StarRating
              rating={filters.rating || 0}
              onRatingChange={handleRatingChange}
              interactive={true}
            />
          </FilterSection>
        </div>
        
        <div className="filters-footer">
          <button 
            className="clear-button"
            onClick={clearAllFilters}
          >
            Clear All
          </button>
          <button 
            className="apply-button"
            onClick={applyFilters}
          >
            Apply Filters ({resultCount} results)
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Search Results

#### Mobile Result Cards
```typescript
interface MobileSearchResultProps {
  vendor: VendorResult;
  onVendorClick: (vendorId: string) => void;
  onFavorite: (vendorId: string) => void;
  isFavorite: boolean;
}

export function MobileSearchResult({ 
  vendor, 
  onVendorClick, 
  onFavorite, 
  isFavorite 
}: MobileSearchResultProps) {
  return (
    <div 
      className="mobile-result-card"
      onClick={() => onVendorClick(vendor.id)}
    >
      <div className="result-image-container">
        <img
          src={vendor.images[0]}
          alt={vendor.name}
          className="result-image"
          loading="lazy"
        />
        <button
          className="favorite-button"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(vendor.id);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
      
      <div className="result-content">
        <div className="result-header">
          <h3 className="vendor-name">{vendor.name}</h3>
          <span className="vendor-type">{vendor.type}</span>
        </div>
        
        <div className="result-meta">
          <div className="rating-info">
            <StarRating rating={vendor.rating} size="sm" />
            <span className="review-count">({vendor.reviewCount} reviews)</span>
          </div>
          <div className="location-info">
            📍 {vendor.location.distance}mi • {vendor.location.area}
          </div>
        </div>
        
        <div className="price-info">
          <span className="price-range">
            £{vendor.priceRange.min} - £{vendor.priceRange.max}
          </span>
          {vendor.availability?.available ? (
            <span className="available">Available</span>
          ) : (
            <span className="unavailable">Booked</span>
          )}
        </div>
        
        <div className="vendor-specialties">
          {vendor.specialties.slice(0, 2).map(specialty => (
            <span key={specialty} className="specialty-tag">
              {specialty}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4. Voice Search Integration

#### Mobile Voice Search
```typescript
interface MobileVoiceSearchProps {
  onVoiceResult: (query: string) => void;
  isListening: boolean;
}

export function MobileVoiceSearch({ onVoiceResult, isListening }: MobileVoiceSearchProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  useEffect(() => {
    setIsSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);
  
  const startVoiceSearch = () => {
    if (!isSupported) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      
      if (event.results[0].isFinal) {
        onVoiceResult(result);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
    };
    
    recognition.start();
  };
  
  if (!isSupported) {
    return null;
  }
  
  return (
    <div className="mobile-voice-search">
      <button
        className={`voice-button ${isListening ? 'listening' : ''}`}
        onClick={startVoiceSearch}
        disabled={isListening}
        aria-label="Voice search"
      >
        🎤
      </button>
      
      {isListening && (
        <div className="voice-feedback">
          <div className="listening-indicator">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          <p className="listening-text">
            {transcript || "Listening..."}
          </p>
        </div>
      )}
    </div>
  );
}
```

## Mobile Performance Optimization

### Image Optimization
```typescript
// Responsive image component for mobile
export function ResponsiveVendorImage({ 
  src, 
  alt, 
  className = "" 
}: ResponsiveImageProps) {
  const [imageSrc, setImageSrc] = useState('');
  
  useEffect(() => {
    // Choose appropriate image size based on device
    const devicePixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width;
    
    let imageSize: string;
    if (screenWidth <= 375) {
      imageSize = devicePixelRatio > 1 ? '400x300' : '200x150';
    } else if (screenWidth <= 414) {
      imageSize = devicePixelRatio > 1 ? '500x375' : '250x188';
    } else {
      imageSize = '600x450';
    }
    
    setImageSrc(`${src}?w=${imageSize}&format=webp&q=80`);
  }, [src]);
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImageSrc(src)} // Fallback to original
    />
  );
}
```

### Infinite Scroll Implementation
```typescript
// Mobile-optimized infinite scroll for search results
export function useInfiniteSearch(initialQuery: SearchQuery) {
  const [results, setResults] = useState<VendorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await searchVendors({
        ...initialQuery,
        pagination: { page, limit: 20 }
      });
      
      setResults(prev => [...prev, ...response.vendors]);
      setHasMore(response.pagination.page < response.pagination.totalPages);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoading(false);
    }
  }, [initialQuery, page, loading, hasMore]);
  
  // Intersection observer for mobile scroll detection
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (lastElementRef.current) observer.unobserve(lastElementRef.current);
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { rootMargin: '100px' } // Trigger 100px before element is visible
    );
    
    if (node) observer.observe(node);
  }, [loading, hasMore, loadMore]);
  
  return { results, loading, hasMore, lastElementRef };
}
```

## Mobile-Specific Features

### 1. Location Detection
```typescript
// Automatic location detection for mobile users
export function useLocationDetection() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
        setLoading(false);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };
  
  return { location, error, loading, getCurrentLocation };
}
```

### 2. Offline Support
```typescript
// Service worker for offline search caching
const CACHE_NAME = 'wedsync-search-v1';
const OFFLINE_PAGES = [
  '/search',
  '/search/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(OFFLINE_PAGES))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/search')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful search responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Return cached results when offline
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page if no cached results
              return caches.match('/search/offline');
            });
        })
    );
  }
});
```

### 3. Touch Gestures
```typescript
// Swipe gestures for mobile search results
export function useSwipeGestures(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const minSwipeDistance = 50;
  
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };
  
  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}
```

## Testing Mobile Search

### Device Testing Matrix
```typescript
// Mobile testing configuration
export const MOBILE_TEST_DEVICES = [
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    pixelRatio: 2,
    userAgent: 'iPhone SE'
  },
  {
    name: 'iPhone 12',
    width: 390,
    height: 844,
    pixelRatio: 3,
    userAgent: 'iPhone 12'
  },
  {
    name: 'Galaxy S21',
    width: 384,
    height: 854,
    pixelRatio: 2.75,
    userAgent: 'Galaxy S21'
  },
  {
    name: 'Pixel 5',
    width: 393,
    height: 851,
    pixelRatio: 2.75,
    userAgent: 'Pixel 5'
  }
];

// Playwright mobile testing
export const mobileSearchTests = {
  async testTouchInteractions(page: Page) {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test search input focus
    await page.tap('[data-testid="search-input"]');
    await expect(page.locator('.suggestions-dropdown')).toBeVisible();
    
    // Test filter panel swipe
    await page.swipe('.search-results', { direction: 'left' });
    await expect(page.locator('.mobile-filters-panel')).toBeVisible();
  },
  
  async testVoiceSearch(page: Page) {
    await page.evaluate(() => {
      // Mock speech recognition API
      window.SpeechRecognition = class MockSpeechRecognition {
        start() {
          setTimeout(() => {
            this.onresult({
              results: [[{
                transcript: 'wedding photographer london',
                isFinal: true
              }]]
            });
          }, 1000);
        }
      };
    });
    
    await page.tap('[data-testid="voice-search-button"]');
    await expect(page.locator('.voice-feedback')).toBeVisible();
    await page.waitForSelector('.search-results');
  }
};
```

## Best Practices

### Mobile Search UX Guidelines
1. **Fast Response Times**: < 300ms for autocomplete, < 1s for full search
2. **Clear Visual Hierarchy**: Large, readable text and clear CTAs
3. **Thumb-Friendly Navigation**: Bottom navigation and reachable controls
4. **Offline Gracefully**: Cache recent searches and provide offline feedback
5. **Battery Optimization**: Minimize background processes and GPS usage

### Accessibility Considerations
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Tab order and focus management
- **High Contrast**: Ensure 4.5:1 contrast ratio minimum
- **Font Scaling**: Support dynamic type sizing
- **Voice Control**: Compatible with iOS Voice Control and Android Voice Access

### Performance Monitoring
```typescript
// Mobile performance tracking
export function trackMobileSearchPerformance() {
  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-input') {
        analytics.track('mobile_search_fid', {
          delay: entry.processingStart - entry.startTime
        });
      }
    }
  }).observe({ type: 'first-input', buffered: true });
  
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    analytics.track('mobile_search_lcp', {
      time: lastEntry.startTime
    });
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  
  // Custom search metrics
  window.addEventListener('searchComplete', (event) => {
    analytics.track('mobile_search_performance', {
      query: event.detail.query,
      resultCount: event.detail.resultCount,
      responseTime: event.detail.responseTime,
      viewportWidth: window.innerWidth
    });
  });
}
```

---

## Troubleshooting Common Issues

### Search Input Issues
- **iOS Zoom on Focus**: Use `font-size: 16px` minimum
- **Android Keyboard Overlap**: Use `viewport-fit=cover` and handle keyboard events
- **Voice Search Permissions**: Request microphone permissions properly

### Performance Issues
- **Slow Image Loading**: Implement proper lazy loading and WebP format
- **Memory Leaks**: Clean up event listeners and observers
- **Bundle Size**: Use code splitting and dynamic imports

### Touch Interaction Issues
- **Touch Target Size**: Ensure minimum 48x48px touch targets
- **Swipe Conflicts**: Handle touch events properly to avoid conflicts
- **Scroll Performance**: Use `will-change` and `transform3d` for smooth scrolling

**Last Updated**: January 2025  
**Version**: 1.0.0