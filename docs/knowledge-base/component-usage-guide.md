# Knowledge Base Component Usage Guide

## Overview

This guide covers the React components available for integrating the WedSync Knowledge Base into your wedding industry applications. All components are built with TypeScript, follow accessibility standards, and are optimized for mobile-first experiences.

## Installation

```bash
npm install @wedsync/knowledge-base-components
# or
yarn add @wedsync/knowledge-base-components
```

## Core Components

### 1. KnowledgeBaseInterface

The main search interface for suppliers and wedding professionals.

**Import:**
```typescript
import { KnowledgeBaseInterface } from '@wedsync/knowledge-base-components';
```

**Basic Usage:**
```tsx
function SupplierDashboard() {
  return (
    <KnowledgeBaseInterface
      userType="supplier"
      supplierType="photographer"
      organizationId="org_123"
      onArticleSelect={(article) => {
        console.log('Article selected:', article);
      }}
    />
  );
}
```

**Props Interface:**
```typescript
interface KnowledgeBaseInterfaceProps {
  // User Configuration
  userType: 'supplier' | 'couple';
  supplierType?: 'photographer' | 'venue' | 'florist' | 'caterer' | 'coordinator';
  organizationId?: string;
  
  // Couple-specific props
  weddingDate?: string; // ISO date format
  planningStage?: 'just-engaged' | 'venue-hunting' | 'vendor-selection' | 'detail-planning' | 'final-details' | 'wedding-week';
  location?: string; // "City, Country" format
  
  // UI Configuration
  theme?: 'light' | 'dark' | 'auto';
  compact?: boolean; // Compact layout for sidebars
  showCategories?: boolean; // Show category filters
  showSuggestions?: boolean; // Show search suggestions
  
  // Behavior
  initialQuery?: string;
  autoFocus?: boolean;
  enableVoiceSearch?: boolean;
  enableOfflineMode?: boolean;
  
  // Event Handlers
  onArticleSelect?: (article: Article) => void;
  onSearchComplete?: (results: SearchResults) => void;
  onError?: (error: KBError) => void;
  
  // Customization
  placeholder?: string;
  emptyStateMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}
```

**Advanced Example:**
```tsx
function AdvancedSupplierSearch() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  return (
    <div className="knowledge-base-container">
      <KnowledgeBaseInterface
        userType="supplier"
        supplierType="photographer"
        organizationId="org_123"
        theme="auto"
        showCategories={true}
        showSuggestions={true}
        enableVoiceSearch={true}
        placeholder="Ask me about your photography business..."
        onArticleSelect={setSelectedArticle}
        onSearchComplete={(results) => {
          // Track search analytics
          analytics.track('knowledge_base_search', {
            query: results.query,
            resultCount: results.total,
            searchTime: results.searchTime
          });
        }}
        onError={(error) => {
          toast.error(`Search failed: ${error.message}`);
        }}
        className="my-custom-kb-styles"
      />
      
      {selectedArticle && (
        <ArticleViewer
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}
```

### 2. WedMeKnowledgeBase

Specialized component for couples using the WedMe app.

**Import:**
```typescript
import { WedMeKnowledgeBase } from '@wedsync/knowledge-base-components';
```

**Usage:**
```tsx
function CoupleApp() {
  return (
    <WedMeKnowledgeBase
      weddingDate="2025-08-15"
      planningStage="venue-hunting"
      location="London, UK"
      partnerMode={true} // Enable partner sharing features
      offlineMode={!navigator.onLine}
      onSaveToTimeline={(article) => {
        // Save helpful articles to wedding timeline
        timeline.addResource(article);
      }}
      onShareWithPartner={(article) => {
        // Share with wedding partner
        sharing.sendToPartner(article);
      }}
    />
  );
}
```

**WedMe-Specific Props:**
```typescript
interface WedMeKnowledgeBaseProps extends Omit<KnowledgeBaseInterfaceProps, 'userType' | 'supplierType'> {
  weddingDate: string;
  planningStage: CouplesPlanningStage;
  location?: string;
  culturalBackground?: string[];
  budgetRange?: 'budget' | 'moderate' | 'luxury';
  
  // Partner Features
  partnerMode?: boolean;
  partnerId?: string;
  
  // Mobile Features
  enableGeoLocation?: boolean;
  enablePushNotifications?: boolean;
  
  // WedMe-specific handlers
  onSaveToTimeline?: (article: Article) => void;
  onShareWithPartner?: (article: Article) => void;
  onAddToFavorites?: (article: Article) => void;
}
```

### 3. ArticleViewer

Component for displaying full article content with enhanced reading experience.

**Usage:**
```tsx
import { ArticleViewer } from '@wedsync/knowledge-base-components';

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} size="xl">
      <ArticleViewer
        article={article}
        showRelatedArticles={true}
        enableFeedback={true}
        showReadingProgress={true}
        onFeedbackSubmit={(feedback) => {
          // Handle article feedback
          api.submitFeedback(article.id, feedback);
        }}
        onRelatedArticleClick={(relatedArticle) => {
          // Navigate to related article
          setArticle(relatedArticle);
        }}
      />
    </Modal>
  );
}
```

### 4. SearchSuggestions

Standalone search suggestions component.

**Usage:**
```tsx
import { SearchSuggestions } from '@wedsync/knowledge-base-components';

function CustomSearchInput() {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Search for wedding help..."
      />
      
      {showSuggestions && (
        <SearchSuggestions
          query={query}
          userType="supplier"
          supplierType="photographer"
          onSuggestionClick={(suggestion) => {
            setQuery(suggestion.text);
            // Trigger search
            performSearch(suggestion.text);
          }}
          maxSuggestions={8}
        />
      )}
    </div>
  );
}
```

### 5. CategoryFilter

Category filtering component for refined search results.

**Usage:**
```tsx
import { CategoryFilter } from '@wedsync/knowledge-base-components';

function SearchWithFilters() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  return (
    <div className="search-layout">
      <div className="filters-sidebar">
        <CategoryFilter
          userType="supplier"
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          showCounts={true}
          collapsible={true}
        />
      </div>
      
      <div className="search-results">
        <KnowledgeBaseInterface
          userType="supplier"
          supplierType="photographer"
          categoryFilters={selectedCategories}
          // ... other props
        />
      </div>
    </div>
  );
}
```

### 6. OfflineIndicator

Shows offline status and cached content availability.

**Usage:**
```tsx
import { OfflineIndicator } from '@wedsync/knowledge-base-components';

function App() {
  return (
    <div className="app">
      <OfflineIndicator
        isOnline={navigator.onLine}
        cachedArticlesCount={45}
        showSyncStatus={true}
        onSync={() => {
          // Trigger sync when back online
          syncOfflineData();
        }}
      />
      
      <KnowledgeBaseInterface
        // ... props
        enableOfflineMode={true}
      />
    </div>
  );
}
```

## Hooks

### useKnowledgeBase

Custom hook for knowledge base functionality.

```typescript
import { useKnowledgeBase } from '@wedsync/knowledge-base-components';

function CustomSearchComponent() {
  const {
    search,
    results,
    loading,
    error,
    suggestions,
    getSuggestions,
    submitFeedback
  } = useKnowledgeBase({
    userType: 'supplier',
    supplierType: 'photographer',
    organizationId: 'org_123'
  });
  
  const handleSearch = async (query: string) => {
    const results = await search({
      query,
      limit: 20,
      filters: {
        category: 'Business'
      }
    });
    
    console.log('Search results:', results);
  };
  
  return (
    <div>
      {/* Custom search UI using the hook */}
      <input
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      
      {loading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}
      
      {results?.articles.map(article => (
        <div key={article.id}>{article.title}</div>
      ))}
    </div>
  );
}
```

### useOfflineSync

Hook for managing offline functionality.

```typescript
import { useOfflineSync } from '@wedsync/knowledge-base-components';

function OfflineAwareComponent() {
  const {
    isOnline,
    cachedArticles,
    syncStatus,
    syncOfflineData,
    getCachedArticle
  } = useOfflineSync();
  
  return (
    <div>
      <div className="sync-status">
        {isOnline ? 'Online' : 'Offline'}
        {syncStatus === 'syncing' && ' - Syncing...'}
      </div>
      
      <button onClick={syncOfflineData} disabled={!isOnline}>
        Sync Now
      </button>
      
      <p>{cachedArticles.length} articles available offline</p>
    </div>
  );
}
```

## Styling and Theming

### CSS Variables

All components use CSS custom properties for theming:

```css
:root {
  /* Colors */
  --kb-primary-color: #3b82f6;
  --kb-secondary-color: #64748b;
  --kb-background-color: #ffffff;
  --kb-surface-color: #f8fafc;
  --kb-text-primary: #1e293b;
  --kb-text-secondary: #64748b;
  --kb-border-color: #e2e8f0;
  
  /* Spacing */
  --kb-spacing-xs: 0.25rem;
  --kb-spacing-sm: 0.5rem;
  --kb-spacing-md: 1rem;
  --kb-spacing-lg: 1.5rem;
  --kb-spacing-xl: 2rem;
  
  /* Typography */
  --kb-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --kb-font-size-sm: 0.875rem;
  --kb-font-size-base: 1rem;
  --kb-font-size-lg: 1.125rem;
  --kb-font-size-xl: 1.25rem;
  
  /* Borders and Shadows */
  --kb-border-radius: 0.5rem;
  --kb-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --kb-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --kb-primary-color: #60a5fa;
  --kb-background-color: #0f172a;
  --kb-surface-color: #1e293b;
  --kb-text-primary: #f1f5f9;
  --kb-text-secondary: #94a3b8;
  --kb-border-color: #334155;
}
```

### Custom Styling

```scss
.my-knowledge-base {
  // Override specific component styles
  .kb-search-input {
    border: 2px solid var(--my-brand-color);
    border-radius: 12px;
  }
  
  .kb-article-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--kb-shadow-md);
    }
  }
  
  // Wedding-specific styling
  .kb-category-wedding-planning {
    background-color: #fef3c7; // Warm yellow for planning
  }
  
  .kb-category-business {
    background-color: #dbeafe; // Blue for business
  }
}
```

## Accessibility Features

All components include comprehensive accessibility support:

### Keyboard Navigation
```typescript
// Components automatically handle keyboard navigation
<KnowledgeBaseInterface
  onKeyboardShortcut={(shortcut) => {
    if (shortcut === 'cmd+k') {
      // Focus search input
    }
  }}
/>
```

### Screen Reader Support
```tsx
// All components include proper ARIA labels and roles
<div
  role="search"
  aria-label="Knowledge base search"
  aria-describedby="search-instructions"
>
  <input
    aria-label="Search wedding knowledge base"
    aria-autocomplete="list"
    aria-expanded={showSuggestions}
  />
</div>
```

### High Contrast Mode
```css
@media (prefers-contrast: high) {
  .kb-component {
    --kb-border-color: #000000;
    --kb-text-primary: #000000;
    --kb-background-color: #ffffff;
  }
}
```

## Performance Optimization

### Lazy Loading
```tsx
import { lazy, Suspense } from 'react';

const KnowledgeBaseInterface = lazy(() => 
  import('@wedsync/knowledge-base-components').then(module => ({
    default: module.KnowledgeBaseInterface
  }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading knowledge base...</div>}>
      <KnowledgeBaseInterface {...props} />
    </Suspense>
  );
}
```

### Memoization
```tsx
import { memo, useMemo } from 'react';

const OptimizedKnowledgeBase = memo(KnowledgeBaseInterface);

function ParentComponent({ userType, supplierType, organizationId }) {
  const memoizedProps = useMemo(() => ({
    userType,
    supplierType,
    organizationId,
    enableVoiceSearch: true,
    showSuggestions: true
  }), [userType, supplierType, organizationId]);
  
  return <OptimizedKnowledgeBase {...memoizedProps} />;
}
```

## Mobile Optimization

### Responsive Design
Components automatically adapt to mobile viewports:

```tsx
<WedMeKnowledgeBase
  // Mobile-specific props
  compactMode={window.innerWidth < 768}
  enableSwipeGestures={true}
  showMobileFilters={false} // Hide complex filters on mobile
  quickActions={['bookmark', 'share', 'read-later']}
/>
```

### Touch Interactions
```typescript
// Touch-friendly interfaces are built-in
interface TouchGestureProps {
  enableSwipeToRefresh?: boolean;
  enablePullToRefresh?: boolean;
  swipeThreshold?: number; // Default: 50px
  hapticFeedback?: boolean; // iOS only
}
```

## Testing Components

### Jest/Testing Library
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KnowledgeBaseInterface } from '@wedsync/knowledge-base-components';

describe('KnowledgeBaseInterface', () => {
  it('should search for articles', async () => {
    const mockSearch = jest.fn();
    
    render(
      <KnowledgeBaseInterface
        userType="supplier"
        supplierType="photographer"
        onSearchComplete={mockSearch}
      />
    );
    
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(searchInput, { target: { value: 'wedding pricing' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'wedding pricing'
        })
      );
    });
  });
});
```

### Mock Data
```typescript
import { mockKnowledgeBaseData } from '@wedsync/knowledge-base-components/testing';

// Use mock data in tests
const mockArticles = mockKnowledgeBaseData.articles.photography;
const mockSearchResults = mockKnowledgeBaseData.searchResults.business;
```

## Integration Examples

### With React Router
```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';

function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  return (
    <KnowledgeBaseInterface
      userType="supplier"
      supplierType="photographer"
      initialQuery={searchParams.get('q') || ''}
      onArticleSelect={(article) => {
        navigate(`/knowledge-base/article/${article.id}`);
      }}
      onSearchComplete={(results) => {
        // Update URL with search query
        navigate(`/knowledge-base?q=${encodeURIComponent(results.query)}`);
      }}
    />
  );
}
```

### With State Management (Redux/Zustand)
```tsx
import { useKnowledgeBaseStore } from './store/knowledgeBase';

function ConnectedKnowledgeBase() {
  const {
    searchQuery,
    searchResults,
    selectedArticle,
    setSearchQuery,
    performSearch,
    selectArticle
  } = useKnowledgeBaseStore();
  
  return (
    <KnowledgeBaseInterface
      userType="supplier"
      supplierType="photographer"
      initialQuery={searchQuery}
      onSearchComplete={(results) => {
        setSearchQuery(results.query);
      }}
      onArticleSelect={selectArticle}
    />
  );
}
```

## Best Practices

1. **Always provide user context** (userType, supplierType, organizationId)
2. **Handle loading and error states** gracefully
3. **Use memoization** for expensive props calculations
4. **Implement proper keyboard navigation** for accessibility
5. **Test mobile interactions** on actual devices
6. **Cache search results** to improve perceived performance
7. **Provide offline fallbacks** for mobile users
8. **Track user interactions** for analytics and improvements
9. **Use semantic HTML** and proper ARIA labels
10. **Optimize for Core Web Vitals** (LCP, CLS, FID)

## Support and Updates

- **Component Library**: https://components.wedsync.com
- **Storybook**: https://storybook.wedsync.com/knowledge-base
- **GitHub**: https://github.com/wedsync/knowledge-base-components
- **NPM**: https://www.npmjs.com/package/@wedsync/knowledge-base-components
- **Changelog**: Check GitHub releases for updates