# 03-search-algorithm.md

## What to Build

A multi-factor search algorithm that ranks suppliers based on relevance, quality, and location proximity.

## Key Technical Requirements

### Search Components

```
interface SearchQuery {
  query?: string;
  location: LocationFilter;
  category: string[];
  filters: SearchFilters;
  sort: SortOption;
  page: number;
  limit: number;
}

interface SearchFilters {
  priceRange?: [number, number];
  availability?: Date;
  rating?: number;
  experience?: number; // years
  verified?: boolean;
  hasPortfolio?: boolean;
}
```

### Ranking Algorithm

1. **Location Score (30%)**
    - Distance from search location
    - Service area coverage
    - Travel willingness
2. **Relevance Score (25%)**
    - Text match in business name
    - Category exact match
    - Style tag matches
    - Description keyword density
3. **Quality Score (25%)**
    - Average rating (1-5 stars)
    - Number of reviews
    - Profile completeness
    - Verification status
4. **Engagement Score (20%)**
    - Response time average
    - Last active date
    - Booking completion rate
    - Platform activity level

## Critical Implementation Notes

### Search Index Structure

```
-- Full-text search index
CREATE INDEX idx_suppliers_search 
ON suppliers 
USING GIN(to_tsvector('english', 
  business_name || ' ' || description || ' ' || services
));

-- Geographic search index
CREATE INDEX idx_suppliers_location 
ON suppliers 
USING GIST(location_point);
```

### Caching Strategy

- Cache popular searches for 30 minutes
- Cache category/location combinations
- Pre-compute scores for top suppliers
- Invalidate cache on supplier updates

### Performance Targets

- Search response time < 200ms
- Handle 1000+ concurrent searches
- Support fuzzy matching and typo tolerance