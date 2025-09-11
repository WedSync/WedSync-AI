# Search Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing search performance in the WedSync platform. It covers database optimization, caching strategies, query optimization, frontend performance, and monitoring techniques to achieve sub-200ms search response times.

## Performance Targets

### Response Time Requirements
- **Basic Text Search**: < 200ms (95th percentile)
- **Faceted Search**: < 400ms (95th percentile)
- **Location-Based Search**: < 500ms (95th percentile)
- **Voice Search Processing**: < 1000ms (95th percentile)
- **Autocomplete**: < 100ms (95th percentile)

### Throughput Requirements
- **Concurrent Users**: 1000+ simultaneous searches
- **Queries Per Minute**: 10,000+ sustained
- **Database Connections**: Efficient connection pooling
- **Cache Hit Rate**: >85% for common queries

### Accuracy Standards
- **Search Relevance**: >95% accuracy for wedding vendor queries
- **Location Accuracy**: <1 mile deviation for geographic searches
- **Cache Consistency**: 100% accuracy with real-time updates

## Database Optimization

### 1. Index Strategy

#### Primary Search Indexes
```sql
-- Full-text search index for vendor names and descriptions
CREATE INDEX idx_vendors_fulltext ON vendors USING gin(
  to_tsvector('english', name || ' ' || description || ' ' || specialties)
);

-- Composite index for common filter combinations
CREATE INDEX idx_vendors_search ON vendors (
  vendor_type, location_city, location_country, rating, price_min, price_max
) WHERE status = 'active';

-- Location-based searches (PostGIS required)
CREATE INDEX idx_vendors_location ON vendors USING gist(location);

-- Availability search optimization
CREATE INDEX idx_vendor_availability ON vendor_availability (
  vendor_id, date, status
) WHERE status IN ('available', 'tentative');

-- Review-based ranking
CREATE INDEX idx_vendor_reviews_summary ON vendors (
  average_rating DESC, review_count DESC, last_review_date DESC
) WHERE status = 'active';
```

#### Specialized Indexes for Advanced Features
```sql
-- Price range optimization
CREATE INDEX idx_vendors_price_range ON vendors 
USING btree (price_min, price_max) 
WHERE status = 'active';

-- Wedding-specific search patterns
CREATE INDEX idx_vendors_wedding_features ON vendors USING gin(
  (wedding_styles || venue_capacity_range || dietary_options)
) WHERE vendor_type IN ('venue', 'catering');

-- Recent activity for trending algorithms
CREATE INDEX idx_vendors_activity ON vendors (
  last_updated DESC, view_count DESC, inquiry_count DESC
) WHERE status = 'active';
```

### 2. Query Optimization Techniques

#### Optimized Search Query Structure
```sql
-- Efficient full-text search with ranking
WITH search_matches AS (
  SELECT 
    v.id,
    v.name,
    v.vendor_type,
    v.location_city,
    v.location_country,
    v.average_rating,
    v.review_count,
    v.price_min,
    v.price_max,
    -- Ranking score calculation
    (
      ts_rank_cd(
        to_tsvector('english', v.name || ' ' || v.description || ' ' || v.specialties),
        plainto_tsquery('english', $1)
      ) * 0.4 +
      (v.average_rating / 5.0) * 0.3 +
      (LEAST(v.review_count / 50.0, 1.0)) * 0.2 +
      (CASE WHEN v.verified = true THEN 0.1 ELSE 0 END)
    ) AS search_score,
    ST_Distance(v.location, ST_GeogFromText($2)) AS distance_meters
  FROM vendors v
  WHERE 
    v.status = 'active'
    AND ($3 IS NULL OR v.vendor_type = $3)
    AND ($4 IS NULL OR v.location_city ILIKE $4)
    AND ($5 IS NULL OR v.average_rating >= $5)
    AND ($6 IS NULL OR v.price_max <= $6)
    AND ($7 IS NULL OR ST_DWithin(v.location, ST_GeogFromText($2), $7))
    AND to_tsvector('english', v.name || ' ' || v.description || ' ' || v.specialties) @@ plainto_tsquery('english', $1)
)
SELECT *
FROM search_matches
ORDER BY search_score DESC, distance_meters ASC
LIMIT $8 OFFSET $9;
```

#### Connection Pool Configuration
```javascript
// Database connection pool optimization
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Connection pool settings
  min: 10,                    // Minimum connections
  max: 30,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000, // Connection timeout
  acquireTimeoutMillis: 5000,    // Acquisition timeout
  // Performance settings
  statement_timeout: '10s',      // Query timeout
  query_timeout: 8000,          // Client-side timeout
  // Connection validation
  testOnBorrow: true,
  testOnReturn: false,
  validateOnBorrow: true
});

// Connection health monitoring
pool.on('error', (err, client) => {
  console.error('Database pool error:', err);
  // Log to monitoring system
});

pool.on('connect', (client) => {
  console.log('New database connection established');
});
```

### 3. Database Maintenance

#### Regular Maintenance Tasks
```sql
-- Weekly vacuum and analyze
VACUUM ANALYZE vendors;
VACUUM ANALYZE vendor_reviews;
VACUUM ANALYZE vendor_availability;

-- Monthly index maintenance
REINDEX INDEX CONCURRENTLY idx_vendors_fulltext;
REINDEX INDEX CONCURRENTLY idx_vendors_search;
REINDEX INDEX CONCURRENTLY idx_vendors_location;

-- Update table statistics for query planner
ANALYZE vendors;
ANALYZE vendor_reviews;

-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_tup_read + idx_tup_fetch DESC;
```

## Caching Strategy

### 1. Multi-Layer Caching Architecture

```typescript
// Cache layer hierarchy: Browser → CDN → Redis → Database
interface CacheLayer {
  browser: 'localStorage' | 'sessionStorage' | 'indexedDB';
  cdn: 'cloudflare' | 'cloudfront';
  application: 'redis' | 'memcached';
  database: 'query_cache' | 'result_cache';
}

// Cache configuration
export const cacheConfig = {
  // Browser cache for user preferences
  browser: {
    searchHistory: { ttl: 86400000, storage: 'localStorage' }, // 24 hours
    userLocation: { ttl: 3600000, storage: 'sessionStorage' }, // 1 hour
    recentSearches: { ttl: 86400000, storage: 'localStorage' }
  },
  
  // Application cache for search results
  redis: {
    searchResults: { ttl: 300, keyPrefix: 'search:' },      // 5 minutes
    vendorDetails: { ttl: 1800, keyPrefix: 'vendor:' },     // 30 minutes
    autocomplete: { ttl: 3600, keyPrefix: 'autocomplete:' }, // 1 hour
    locationData: { ttl: 86400, keyPrefix: 'location:' }     // 24 hours
  },
  
  // CDN cache for static assets
  cdn: {
    vendorImages: { ttl: 86400 },     // 24 hours
    searchAssets: { ttl: 3600 },      // 1 hour
    apiResponses: { ttl: 300 }        // 5 minutes
  }
};
```

### 2. Redis Cache Implementation

```typescript
import Redis from 'ioredis';

export class SearchCacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      // Connection pooling
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000
    });
  }
  
  async cacheSearchResults(cacheKey: string, results: any[], ttl: number = 300): Promise<void> {
    try {
      const cacheData = {
        results,
        timestamp: Date.now(),
        resultCount: results.length
      };
      
      await this.redis.setex(
        `search:${cacheKey}`, 
        ttl, 
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Cache write error:', error);
      // Don't throw - search should work without cache
    }
  }
  
  async getCachedSearchResults(cacheKey: string): Promise<any[] | null> {
    try {
      const cached = await this.redis.get(`search:${cacheKey}`);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // Validate cache freshness
      if (Date.now() - data.timestamp > 300000) { // 5 minutes
        await this.redis.del(`search:${cacheKey}`);
        return null;
      }
      
      return data.results;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }
  
  generateCacheKey(query: any): string {
    // Create deterministic cache key from search parameters
    const keyParts = [
      query.query || '',
      query.location?.address || '',
      query.filters?.vendorType || '',
      query.filters?.priceRange ? `${query.filters.priceRange.min}-${query.filters.priceRange.max}` : '',
      query.sort?.by || 'relevance',
      query.pagination?.page || 1,
      query.pagination?.limit || 20
    ];
    
    return Buffer.from(keyParts.join('|')).toString('base64').slice(0, 64);
  }
  
  async invalidateVendorCache(vendorId: string): Promise<void> {
    try {
      // Remove vendor-specific caches
      const pattern = `*vendor:${vendorId}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      // Clear search result caches that might contain this vendor
      await this.clearSearchCaches();
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  async clearSearchCaches(): Promise<void> {
    try {
      const searchKeys = await this.redis.keys('search:*');
      if (searchKeys.length > 0) {
        await this.redis.del(...searchKeys);
      }
    } catch (error) {
      console.error('Search cache clear error:', error);
    }
  }
}
```

### 3. Client-Side Caching

```typescript
// Browser-based search caching
export class ClientSearchCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 100; // Maximum cached items
  
  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    // Evict oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Periodic cleanup of expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Auto-cleanup every 5 minutes
const clientCache = new ClientSearchCache();
setInterval(() => clientCache.cleanup(), 300000);
```

## Frontend Performance Optimization

### 1. Component Optimization

```typescript
// Memoized search results component
import React, { memo, useMemo, useCallback } from 'react';
import { VendorResult } from '@/types/search';

interface SearchResultsProps {
  vendors: VendorResult[];
  onVendorClick: (vendorId: string) => void;
  loading: boolean;
}

export const SearchResults = memo<SearchResultsProps>(({ 
  vendors, 
  onVendorClick, 
  loading 
}) => {
  // Memoize expensive calculations
  const sortedVendors = useMemo(() => {
    return vendors.sort((a, b) => b.searchScore - a.searchScore);
  }, [vendors]);
  
  // Memoized click handlers
  const handleVendorClick = useCallback((vendorId: string) => {
    onVendorClick(vendorId);
  }, [onVendorClick]);
  
  if (loading) {
    return <SearchResultsSkeleton />;
  }
  
  return (
    <div className="search-results">
      {sortedVendors.map((vendor) => (
        <VendorCard 
          key={vendor.id}
          vendor={vendor}
          onClick={handleVendorClick}
        />
      ))}
    </div>
  );
});

// Virtualized search results for large datasets
import { FixedSizeList as List } from 'react-window';

export const VirtualizedSearchResults = memo<SearchResultsProps>(({ vendors, onVendorClick }) => {
  const Row = useCallback(({ index, style }) => (
    <div style={style}>
      <VendorCard 
        vendor={vendors[index]}
        onClick={onVendorClick}
      />
    </div>
  ), [vendors, onVendorClick]);
  
  return (
    <List
      height={600}
      itemCount={vendors.length}
      itemSize={200}
      itemData={vendors}
    >
      {Row}
    </List>
  );
});
```

### 2. Image Optimization

```typescript
// Responsive image loading with WebP support
export function OptimizedVendorImage({ 
  src, 
  alt, 
  width = 300, 
  height = 200 
}: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    // Generate responsive image URL with WebP support
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaledWidth = width * devicePixelRatio;
    const scaledHeight = height * devicePixelRatio;
    
    // Check WebP support
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('webp') > -1;
    
    const format = supportsWebP ? 'webp' : 'jpg';
    const optimizedSrc = `${src}?w=${scaledWidth}&h=${scaledHeight}&format=${format}&q=80&fit=crop`;
    
    setImageSrc(optimizedSrc);
  }, [src, width, height]);
  
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);
  
  const handleImageError = useCallback(() => {
    setImageError(true);
    // Fallback to original image
    setImageSrc(src);
  }, [src]);
  
  return (
    <div className="image-container">
      {!imageLoaded && !imageError && (
        <div className="image-placeholder">
          <div className="loading-shimmer" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        decoding="async"
        style={{ 
          display: imageLoaded ? 'block' : 'none',
          width,
          height,
          objectFit: 'cover'
        }}
      />
    </div>
  );
}
```

### 3. Search Query Optimization

```typescript
// Debounced search with request cancellation
import { useCallback, useRef, useState } from 'react';

export function useOptimizedSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef(new Map());
  
  const search = useCallback(async (query: string, immediate = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    const performSearch = async () => {
      // Check cache first
      const cacheKey = JSON.stringify(query);
      const cached = cacheRef.current.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
        setResults(cached.results);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      try {
        const response = await fetch('/api/search/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache results
        cacheRef.current.set(cacheKey, {
          results: data.vendors,
          timestamp: Date.now()
        });
        
        // Clean old cache entries
        if (cacheRef.current.size > 50) {
          const oldestKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(oldestKey);
        }
        
        setResults(data.vendors);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (immediate) {
      performSearch();
    } else {
      // Debounce search requests
      debounceTimeoutRef.current = setTimeout(performSearch, 300);
    }
  }, []);
  
  return { search, results, loading, error };
}
```

## Search Engine Optimization

### 1. Elasticsearch Integration

```javascript
// Elasticsearch configuration for advanced search
const elasticsearch = require('@elastic/elasticsearch');

const client = new elasticsearch.Client({
  nodes: [process.env.ELASTICSEARCH_URL],
  auth: {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD
  },
  maxRetries: 3,
  requestTimeout: 10000,
  sniffOnStart: true,
  sniffInterval: 300000, // 5 minutes
});

// Optimized search query with boosting and filtering
async function elasticSearch(query) {
  const searchBody = {
    size: query.limit || 20,
    from: (query.page - 1) * (query.limit || 20),
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: query.text,
              fields: [
                'name^3',           // Boost name matches
                'description^2',    // Boost description matches
                'specialties^1.5',  // Moderate boost for specialties
                'location.city^1.2',
                'tags'
              ],
              type: 'best_fields',
              fuzziness: 'AUTO',
              operator: 'and'
            }
          }
        ],
        filter: [
          { term: { status: 'active' } },
          ...(query.vendorType ? [{ term: { vendor_type: query.vendorType } }] : []),
          ...(query.location ? [{
            geo_distance: {
              distance: `${query.radius || 25}mi`,
              location: query.location
            }
          }] : []),
          ...(query.priceRange ? [{
            range: {
              price_max: { 
                gte: query.priceRange.min || 0,
                lte: query.priceRange.max || 999999
              }
            }
          }] : [])
        ]
      }
    },
    sort: [
      query.sort === 'distance' ? {
        _geo_distance: {
          location: query.location,
          order: 'asc',
          unit: 'mi'
        }
      } : { _score: { order: 'desc' } },
      { average_rating: { order: 'desc' } },
      { review_count: { order: 'desc' } }
    ],
    aggs: {
      vendor_types: {
        terms: { field: 'vendor_type', size: 20 }
      },
      price_ranges: {
        histogram: {
          field: 'price_max',
          interval: 1000,
          min_doc_count: 1
        }
      },
      locations: {
        terms: { field: 'location.city', size: 50 }
      },
      ratings: {
        histogram: {
          field: 'average_rating',
          interval: 0.5,
          min_doc_count: 1
        }
      }
    }
  };
  
  const response = await client.search({
    index: 'wedding-vendors',
    body: searchBody
  });
  
  return {
    vendors: response.body.hits.hits.map(hit => ({
      ...hit._source,
      searchScore: hit._score,
      distance: hit.sort?.[0]
    })),
    facets: response.body.aggregations,
    total: response.body.hits.total.value
  };
}
```

### 2. Search Index Optimization

```javascript
// Elasticsearch mapping with performance optimizations
const vendorMapping = {
  mappings: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'completion' }
        }
      },
      description: {
        type: 'text',
        analyzer: 'english'
      },
      vendor_type: {
        type: 'keyword'
      },
      location: {
        type: 'geo_point'
      },
      location_city: {
        type: 'keyword'
      },
      average_rating: {
        type: 'float'
      },
      review_count: {
        type: 'integer'
      },
      price_min: {
        type: 'integer'
      },
      price_max: {
        type: 'integer'
      },
      specialties: {
        type: 'keyword'
      },
      tags: {
        type: 'keyword'
      },
      status: {
        type: 'keyword'
      },
      last_updated: {
        type: 'date'
      },
      wedding_styles: {
        type: 'keyword'
      },
      availability: {
        type: 'nested',
        properties: {
          date: { type: 'date' },
          status: { type: 'keyword' }
        }
      }
    }
  },
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
    refresh_interval: '30s',
    analysis: {
      analyzer: {
        wedding_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'stop',
            'wedding_synonym',
            'stemmer'
          ]
        }
      },
      filter: {
        wedding_synonym: {
          type: 'synonym',
          synonyms: [
            'photo,photographer,photography',
            'venue,location,place',
            'music,dj,band,entertainment',
            'flowers,florist,floral',
            'food,catering,caterer'
          ]
        }
      }
    }
  }
};
```

## Performance Monitoring

### 1. Application Performance Monitoring

```typescript
// Search performance tracking
export class SearchPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
      return duration;
    };
  }
  
  recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const measurements = this.metrics.get(operation)!;
    measurements.push(duration);
    
    // Keep only last 1000 measurements
    if (measurements.length > 1000) {
      measurements.shift();
    }
  }
  
  getMetrics(operation: string): {
    average: number;
    p95: number;
    p99: number;
    count: number;
  } | null {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      average: sorted.reduce((sum, val) => sum + val, 0) / count,
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      count
    };
  }
  
  // Send metrics to monitoring service
  async reportMetrics(): Promise<void> {
    const report: Record<string, any> = {};
    
    for (const [operation, measurements] of this.metrics.entries()) {
      report[operation] = this.getMetrics(operation);
    }
    
    try {
      await fetch('/api/metrics/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          metrics: report
        })
      });
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }
}

// Usage in search functions
const performanceMonitor = new SearchPerformanceMonitor();

export async function searchVendors(query: SearchQuery) {
  const timer = performanceMonitor.startTimer('search_vendors');
  
  try {
    // Database query timer
    const dbTimer = performanceMonitor.startTimer('database_query');
    const dbResults = await executeSearchQuery(query);
    dbTimer();
    
    // Processing timer
    const processTimer = performanceMonitor.startTimer('result_processing');
    const processedResults = await processSearchResults(dbResults);
    processTimer();
    
    // Cache write timer
    const cacheTimer = performanceMonitor.startTimer('cache_write');
    await cacheSearchResults(query, processedResults);
    cacheTimer();
    
    return processedResults;
  } finally {
    timer();
  }
}
```

### 2. Database Performance Monitoring

```sql
-- Database performance monitoring queries
-- Slow query detection
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_exec_time > 1000  -- Queries slower than 1 second
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index usage analysis
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_tup_read + idx_tup_fetch AS total_reads,
  CASE 
    WHEN idx_tup_read + idx_tup_fetch = 0 THEN 0 
    ELSE idx_tup_fetch::float / (idx_tup_read + idx_tup_fetch) * 100 
  END AS hit_rate
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY total_reads DESC;

-- Table size and bloat analysis
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_stat_get_live_tuples(c.oid) AS live_tuples,
  pg_stat_get_dead_tuples(c.oid) AS dead_tuples
FROM pg_stat_user_tables
JOIN pg_class c ON c.relname = tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Real-Time Performance Dashboard

```typescript
// Performance dashboard component
export function SearchPerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics/search/summary');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading || !metrics) {
    return <div>Loading performance metrics...</div>;
  }
  
  return (
    <div className="performance-dashboard">
      <h2>Search Performance Metrics</h2>
      
      <div className="metrics-grid">
        <MetricCard
          title="Average Response Time"
          value={`${metrics.averageResponseTime.toFixed(0)}ms`}
          status={metrics.averageResponseTime < 200 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="95th Percentile"
          value={`${metrics.p95ResponseTime.toFixed(0)}ms`}
          status={metrics.p95ResponseTime < 400 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={`${(metrics.cacheHitRate * 100).toFixed(1)}%`}
          status={metrics.cacheHitRate > 0.8 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="Error Rate"
          value={`${(metrics.errorRate * 100).toFixed(2)}%`}
          status={metrics.errorRate < 0.01 ? 'good' : 'error'}
        />
        
        <MetricCard
          title="Queries/Minute"
          value={metrics.queriesPerMinute.toLocaleString()}
          status={metrics.queriesPerMinute < 10000 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="Active Connections"
          value={metrics.activeConnections.toString()}
          status={metrics.activeConnections < 25 ? 'good' : 'warning'}
        />
      </div>
      
      <div className="performance-charts">
        <ResponseTimeChart data={metrics.responseTimeHistory} />
        <ThroughputChart data={metrics.throughputHistory} />
        <ErrorRateChart data={metrics.errorRateHistory} />
      </div>
    </div>
  );
}
```

## Load Testing and Scaling

### 1. Load Testing Scripts

```javascript
// Artillery load testing configuration
module.exports = {
  config: {
    target: 'https://api.wedsync.com',
    phases: [
      // Warm-up phase
      { duration: 60, arrivalRate: 5, name: 'Warm up' },
      // Ramp up phase
      { duration: 300, arrivalRate: 10, rampTo: 50, name: 'Ramp up' },
      // Sustained load
      { duration: 600, arrivalRate: 50, name: 'Sustained load' },
      // Peak load
      { duration: 180, arrivalRate: 100, name: 'Peak load' },
      // Cool down
      { duration: 120, arrivalRate: 10, name: 'Cool down' }
    ],
    payload: {
      path: './search-queries.csv',
      fields: ['query', 'location', 'vendorType']
    }
  },
  scenarios: [
    {
      name: 'Search Performance Test',
      weight: 70,
      flow: [
        {
          post: {
            url: '/api/v1/search/vendors',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer {{ $randomString() }}'
            },
            json: {
              query: '{{ query }}',
              location: { address: '{{ location }}' },
              filters: {
                vendorType: '{{ vendorType }}'
              }
            }
          }
        }
      ]
    },
    {
      name: 'Autocomplete Performance',
      weight: 20,
      flow: [
        {
          get: {
            url: '/api/v1/search/autocomplete',
            qs: {
              q: '{{ query }}',
              location: '{{ location }}'
            }
          }
        }
      ]
    },
    {
      name: 'Location Search',
      weight: 10,
      flow: [
        {
          post: {
            url: '/api/v1/search/location',
            json: {
              location: {
                coordinates: {
                  latitude: 51.5074,
                  longitude: -0.1278
                },
                radius: 25
              },
              vendorTypes: ['photographer', 'venue']
            }
          }
        }
      ]
    }
  ]
};
```

### 2. Horizontal Scaling Strategy

```yaml
# Docker Compose scaling configuration
version: '3.8'
services:
  search-api:
    image: wedsync/search-api:latest
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    environment:
      - NODE_ENV=production
      - DATABASE_POOL_MIN=5
      - DATABASE_POOL_MAX=10
      - REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379
    depends_on:
      - postgres-master
      - redis-cluster

  postgres-master:
    image: postgres:15
    environment:
      - POSTGRES_DB=wedsync
      - POSTGRES_MAX_CONNECTIONS=200
      - POSTGRES_SHARED_BUFFERS=256MB
      - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15
    environment:
      - PGUSER=replicator
      - POSTGRES_MASTER_SERVICE=postgres-master
    depends_on:
      - postgres-master

  redis-cluster:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    deploy:
      replicas: 6
    
  nginx-load-balancer:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - search-api
```

## Troubleshooting Performance Issues

### 1. Common Performance Bottlenecks

#### Slow Database Queries
```sql
-- Identify slow queries
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Fix: Add missing indexes
EXPLAIN ANALYZE SELECT * FROM vendors 
WHERE vendor_type = 'photographer' 
  AND location_city = 'London'
  AND average_rating >= 4.0;
```

#### Memory Leaks in Node.js
```javascript
// Monitor memory usage
const memoryUsage = process.memoryUsage();
console.log('Memory Usage:', {
  rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
  heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
  heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
  external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
});

// Fix: Proper cleanup of resources
process.on('exit', () => {
  // Close database connections
  pool.end();
  // Close cache connections
  redis.disconnect();
});
```

#### High CPU Usage
```javascript
// CPU profiling
const v8Profiler = require('v8-profiler-next');
const fs = require('fs');

// Start profiling
const title = 'search-performance';
v8Profiler.startProfiling(title, true);

// After operation
setTimeout(() => {
  const profile = v8Profiler.stopProfiling(title);
  profile.export((error, result) => {
    fs.writeFileSync(`${title}.cpuprofile`, result);
    profile.delete();
  });
}, 10000);
```

### 2. Performance Alerts and Monitoring

```typescript
// Automated performance alerting
export class PerformanceAlert {
  private thresholds = {
    responseTime: 500,      // ms
    errorRate: 0.05,        // 5%
    cacheHitRate: 0.7,      // 70%
    cpuUsage: 80,           // 80%
    memoryUsage: 85         // 85%
  };
  
  async checkPerformance(): Promise<void> {
    const metrics = await this.getCurrentMetrics();
    
    // Response time check
    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      await this.sendAlert('high_response_time', {
        current: metrics.averageResponseTime,
        threshold: this.thresholds.responseTime
      });
    }
    
    // Error rate check
    if (metrics.errorRate > this.thresholds.errorRate) {
      await this.sendAlert('high_error_rate', {
        current: metrics.errorRate,
        threshold: this.thresholds.errorRate
      });
    }
    
    // Cache hit rate check
    if (metrics.cacheHitRate < this.thresholds.cacheHitRate) {
      await this.sendAlert('low_cache_hit_rate', {
        current: metrics.cacheHitRate,
        threshold: this.thresholds.cacheHitRate
      });
    }
  }
  
  private async sendAlert(type: string, data: any): Promise<void> {
    // Send to monitoring service (e.g., Slack, PagerDuty)
    await fetch(process.env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: type,
        severity: 'warning',
        timestamp: new Date().toISOString(),
        data
      })
    });
  }
}

// Run performance checks every minute
const alertSystem = new PerformanceAlert();
setInterval(() => alertSystem.checkPerformance(), 60000);
```

---

## Performance Checklist

### Database Optimization ✅
- [ ] Proper indexes on search columns
- [ ] Query optimization and EXPLAIN ANALYZE
- [ ] Connection pooling configured
- [ ] Regular VACUUM and ANALYZE
- [ ] Monitoring slow queries

### Caching Strategy ✅
- [ ] Multi-layer caching implemented
- [ ] Redis cluster for high availability
- [ ] Cache invalidation strategy
- [ ] Client-side caching for repetitive queries
- [ ] CDN for static assets

### Application Performance ✅
- [ ] Code splitting and lazy loading
- [ ] Component memoization
- [ ] Image optimization and lazy loading
- [ ] Request debouncing
- [ ] Memory leak prevention

### Monitoring and Alerting ✅
- [ ] Performance metrics collection
- [ ] Real-time dashboards
- [ ] Automated alerting
- [ ] Load testing regular schedule
- [ ] Capacity planning

### Scaling Preparation ✅
- [ ] Horizontal scaling capability
- [ ] Database replication
- [ ] Load balancing
- [ ] Auto-scaling policies
- [ ] Disaster recovery plan

**Last Updated**: January 2025  
**Version**: 1.0.0