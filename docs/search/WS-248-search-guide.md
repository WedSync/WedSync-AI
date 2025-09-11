# WS-248: Advanced Search System - Complete Guide

## Overview

The WedSync Advanced Search System provides comprehensive search capabilities for wedding vendors and couples. This system includes text search, faceted filtering, location-based search, voice search, and AI-powered recommendations with review integration.

## Key Features

### 🔍 Core Search Capabilities
- **Full-Text Search**: Advanced text matching with fuzzy search and typo tolerance
- **Faceted Search**: Multi-dimensional filtering (vendor type, price, location, rating)
- **Location-Based Search**: Geographic search with distance calculations
- **Voice Search**: Speech-to-text search with natural language processing
- **Visual Search**: Image-based vendor discovery (future enhancement)

### 🎯 Wedding-Specific Features
- **Vendor Discovery**: Smart matching based on wedding style and requirements
- **Availability Search**: Real-time availability checking for specific dates
- **Budget Filtering**: Price range filtering with seasonal adjustments
- **Review Integration**: Review-based ranking and filtering
- **Recommendation Engine**: AI-powered vendor suggestions

### 📱 Platform Support
- **Web Application**: Full-featured search on desktop and mobile browsers
- **Mobile Apps**: Native iOS and Android search experience
- **API Integration**: RESTful API for third-party integrations
- **Voice Assistants**: Integration with Siri, Google Assistant (planned)

## Search Architecture

### Search Flow
```
User Input → Query Processing → Search Engine → Result Ranking → Response Formatting
    ↓              ↓                ↓              ↓               ↓
  Text/Voice    Tokenization    Database Query   ML Scoring    JSON/HTML
  Location      Validation      Index Search     Review Data   Pagination
  Filters       Sanitization    Cache Check      Relevance     Analytics
```

### Core Components
1. **Query Parser**: Processes user input and extracts search intent
2. **Search Engine**: Executes queries against database and search indices
3. **Ranking Algorithm**: Scores and sorts results based on multiple factors
4. **Result Formatter**: Structures response data for different clients
5. **Analytics Tracker**: Records search behavior and performance metrics

## Search Implementation

### Basic Text Search
```typescript
import { advancedSearch } from '@/lib/search/advanced-search';

const results = await advancedSearch({
  query: 'wedding photographer',
  location: 'London',
  filters: {
    vendorType: 'photographer',
    priceRange: { min: 1000, max: 5000 },
    rating: 4.0
  }
});
```

### Faceted Search
```typescript
const facetedResults = await advancedSearch({
  query: 'wedding venue',
  location: 'Surrey',
  facets: {
    vendorType: ['venue', 'catering'],
    priceRange: { min: 2000, max: 15000 },
    capacity: { min: 50, max: 200 },
    amenities: ['parking', 'wheelchair-accessible', 'garden']
  }
});
```

### Location-Based Search
```typescript
const locationResults = await locationSearch({
  latitude: 51.5074,
  longitude: -0.1278,
  radius: 25, // miles
  vendorTypes: ['photographer', 'venue', 'florist']
});
```

## Search Configuration

### Environment Variables
```env
# Search Service Configuration
SEARCH_ENGINE_URL=https://search.wedsync.com
SEARCH_API_KEY=your-search-api-key
SEARCH_INDEX_NAME=wedding-vendors
ELASTICSEARCH_URL=https://elastic.wedsync.com
REDIS_CACHE_URL=redis://cache.wedsync.com:6379

# Performance Settings
SEARCH_TIMEOUT_MS=5000
SEARCH_MAX_RESULTS=100
SEARCH_CACHE_TTL=300
SEARCH_ANALYTICS_ENABLED=true
```

### Search Parameters
- **query**: Main search text (required)
- **location**: Geographic location string or coordinates
- **vendorType**: Filter by vendor category
- **priceRange**: Min and max budget constraints  
- **rating**: Minimum vendor rating
- **availability**: Date range for availability checking
- **radius**: Search radius for location-based queries
- **sortBy**: Ordering preference (relevance, rating, price, distance)

## Performance Standards

### Response Time Requirements
- **Basic Search**: < 200ms (95th percentile)
- **Faceted Search**: < 400ms (95th percentile)  
- **Location Search**: < 500ms (95th percentile)
- **Voice Search**: < 1000ms (95th percentile)
- **Complex Queries**: < 800ms (95th percentile)

### Accuracy Requirements
- **Search Relevance**: > 95% accuracy for wedding vendor queries
- **Location Accuracy**: < 1 mile deviation for geographic searches
- **Voice Recognition**: > 90% accuracy for wedding-related terms
- **Autocomplete**: > 95% accuracy for suggestion matching

### Scalability Standards
- **Concurrent Users**: Support 1000+ simultaneous searches
- **Query Volume**: Handle 10,000+ queries per minute
- **Data Scale**: Search across 100,000+ vendor profiles
- **Response Consistency**: < 5% variance in response times

## Search Analytics

### Key Metrics
- **Query Volume**: Number of searches per time period
- **Search Latency**: Average and percentile response times
- **Result Click-Through**: Percentage of searches leading to vendor views
- **Conversion Rate**: Searches resulting in vendor contact/booking
- **Bounce Rate**: Searches with no interaction with results

### Tracking Implementation
```typescript
import { searchAnalytics } from '@/lib/analytics/search-tracking';

// Track search query
await searchAnalytics.trackSearch({
  query: 'wedding photographer london',
  userId: 'user-123',
  sessionId: 'session-456',
  resultCount: 25,
  responseTime: 180
});

// Track result interaction
await searchAnalytics.trackClick({
  searchId: 'search-789',
  vendorId: 'vendor-123',
  position: 1,
  clickTime: new Date()
});
```

## Error Handling

### Common Error Scenarios
1. **Invalid Query**: Malformed search parameters
2. **Service Timeout**: Search engine response delays
3. **Rate Limiting**: Too many requests from single user
4. **Data Corruption**: Invalid vendor data in search index
5. **Geographic Errors**: Invalid location coordinates

### Error Response Format
```json
{
  "error": {
    "code": "SEARCH_TIMEOUT",
    "message": "Search request timed out",
    "details": "Query execution exceeded 5000ms limit",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-abc123"
  },
  "fallback": {
    "cached_results": true,
    "result_count": 15
  }
}
```

## Testing Strategy

### Test Coverage Areas
- **Unit Tests**: Individual search components and functions
- **Integration Tests**: Search engine and database interactions
- **Performance Tests**: Load testing and response time validation
- **End-to-End Tests**: Complete user search workflows
- **Mobile Tests**: Cross-device search experience validation

### Test Execution
```bash
# Run all search tests
npm test -- --testPathPattern=search

# Run performance tests only
npm test -- tests/search/search-performance.test.ts

# Run mobile E2E tests
npm run test:playwright -- search/mobile-search.e2e.ts
```

## Security Considerations

### Input Sanitization
- **SQL Injection**: Parameterized queries and input validation
- **XSS Prevention**: Output encoding and content security policies
- **Rate Limiting**: IP-based and user-based request throttling
- **Data Privacy**: GDPR compliance for search data retention

### Search Data Protection
- **Personal Information**: Remove PII from search logs
- **Vendor Privacy**: Secure handling of vendor contact information
- **Query Encryption**: HTTPS encryption for all search requests
- **Access Control**: Role-based search result filtering

## Integration Points

### External Services
- **Google Places API**: Location geocoding and validation
- **Elasticsearch**: Primary search engine for text queries
- **Redis Cache**: Query result caching for performance
- **Analytics Platform**: Search behavior tracking and insights

### Internal Systems
- **Vendor Database**: Source of truth for vendor information
- **User Profiles**: Personalization and search history
- **Booking System**: Availability checking and reservation integration
- **Review System**: Rating and review data for result ranking

## Troubleshooting Guide

### Common Issues
1. **Slow Search Performance**
   - Check database index health
   - Verify cache hit rates
   - Monitor search engine resource usage

2. **Poor Search Relevance**
   - Review search ranking algorithms
   - Update search indices with fresh data
   - Analyze user feedback and click patterns

3. **Location Search Errors**
   - Validate GPS coordinates format
   - Check Google Places API quota and status
   - Verify geographic data accuracy

4. **Voice Search Problems**
   - Test microphone permissions
   - Verify speech recognition service status
   - Check for supported language configurations

### Debug Commands
```bash
# Check search service health
curl https://api.wedsync.com/search/health

# Test search query directly
curl -X POST https://api.wedsync.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "location": "london"}'

# View search analytics
curl https://api.wedsync.com/search/analytics/summary
```

## Future Enhancements

### Planned Features
- **AI-Powered Recommendations**: Machine learning based vendor suggestions
- **Visual Search**: Image-based venue and style discovery
- **Natural Language Processing**: Conversational search interface
- **Predictive Search**: Proactive vendor recommendations
- **Advanced Filters**: Complex query builder interface

### Technical Improvements
- **Search Index Optimization**: Advanced indexing strategies
- **Caching Enhancements**: Multi-layer caching architecture
- **Real-time Updates**: Live search result refreshing
- **Performance Monitoring**: Advanced search analytics dashboard
- **Accessibility**: Enhanced screen reader and keyboard navigation

---

## Support and Maintenance

For technical support or questions about the search system implementation:
- **Documentation**: Review API documentation and mobile guides
- **Issue Tracking**: Report bugs via GitHub Issues
- **Performance Monitoring**: Check search analytics dashboard
- **Emergency Contact**: On-call support for production issues

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: WedSync Development Team