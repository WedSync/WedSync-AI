# Search API Documentation

## API Overview

The WedSync Search API provides comprehensive search capabilities for wedding vendors, venues, and services. All endpoints use RESTful conventions and return JSON responses.

**Base URL**: `https://api.wedsync.com/v1/search`
**Authentication**: Bearer token required for all endpoints
**Rate Limit**: 100 requests per minute per user

## Authentication

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.wedsync.com/v1/search/vendors
```

## Core Search Endpoints

### 1. General Vendor Search

**Endpoint**: `POST /search/vendors`

Search for wedding vendors with text queries, filters, and location-based parameters.

#### Request Body
```json
{
  "query": "wedding photographer",
  "location": {
    "address": "London, UK",
    "coordinates": {
      "latitude": 51.5074,
      "longitude": -0.1278
    },
    "radius": 25
  },
  "filters": {
    "vendorType": "photographer",
    "priceRange": {
      "min": 1000,
      "max": 5000
    },
    "rating": 4.0,
    "availability": {
      "startDate": "2024-06-01",
      "endDate": "2024-09-30"
    }
  },
  "sort": {
    "by": "relevance",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor-123",
        "name": "Sarah's Photography Studio",
        "type": "photographer",
        "rating": 4.8,
        "reviewCount": 125,
        "location": {
          "address": "Central London, UK",
          "distance": 2.3
        },
        "priceRange": {
          "min": 1200,
          "max": 4500
        },
        "availability": {
          "available": true,
          "nextAvailableDate": "2024-06-15"
        },
        "images": [
          "https://cdn.wedsync.com/vendors/123/portfolio/image1.jpg"
        ],
        "description": "Award-winning wedding photographer specializing in romantic, candid moments...",
        "specialties": ["outdoor weddings", "intimate ceremonies", "destination weddings"],
        "searchScore": 0.95
      }
    ],
    "facets": {
      "vendorTypes": {
        "photographer": 45,
        "venue": 23,
        "florist": 18
      },
      "priceRanges": {
        "under_1000": 12,
        "1000_3000": 34,
        "3000_5000": 28,
        "over_5000": 15
      },
      "ratings": {
        "5_star": 52,
        "4_star": 31,
        "3_star": 6
      }
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 89,
      "totalPages": 5
    },
    "searchTime": 187,
    "searchId": "search-abc123"
  }
}
```

### 2. Autocomplete Suggestions

**Endpoint**: `GET /search/autocomplete`

Get real-time search suggestions as users type.

#### Parameters
- `q` (string, required): Partial search query
- `location` (string, optional): Location context for suggestions
- `limit` (integer, optional): Maximum suggestions to return (default: 10)

#### Example Request
```bash
GET /search/autocomplete?q=wedding+pho&location=london&limit=5
```

#### Response
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "wedding photographer",
        "type": "query",
        "popularity": 0.95,
        "resultCount": 234
      },
      {
        "text": "wedding photography packages",
        "type": "query",
        "popularity": 0.78,
        "resultCount": 156
      },
      {
        "text": "Sarah's Photography Studio",
        "type": "vendor",
        "vendorId": "vendor-123",
        "rating": 4.8,
        "location": "London"
      }
    ],
    "responseTime": 45
  }
}
```

### 3. Location-Based Search

**Endpoint**: `POST /search/location`

Find vendors within a specific geographic area using coordinates or address.

#### Request Body
```json
{
  "location": {
    "coordinates": {
      "latitude": 51.5074,
      "longitude": -0.1278
    },
    "radius": 50,
    "unit": "miles"
  },
  "vendorTypes": ["photographer", "venue", "catering"],
  "filters": {
    "rating": 3.5,
    "priceRange": {
      "max": 10000
    }
  },
  "sort": {
    "by": "distance",
    "order": "asc"
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor-456",
        "name": "Garden Manor Estate",
        "type": "venue",
        "location": {
          "address": "Surrey, UK",
          "coordinates": {
            "latitude": 51.2277,
            "longitude": -0.5371
          },
          "distance": 18.4
        },
        "capacity": {
          "min": 50,
          "max": 200
        },
        "amenities": ["parking", "wheelchair-accessible", "garden", "indoor-backup"]
      }
    ],
    "searchArea": {
      "center": {
        "latitude": 51.5074,
        "longitude": -0.1278
      },
      "radius": 50,
      "vendorCount": 127
    }
  }
}
```

### 4. Faceted Search

**Endpoint**: `POST /search/faceted`

Advanced search with multiple filter dimensions and facet counting.

#### Request Body
```json
{
  "query": "wedding venue",
  "facets": {
    "vendorType": ["venue", "catering"],
    "priceRange": {
      "min": 2000,
      "max": 15000
    },
    "capacity": {
      "min": 50,
      "max": 200
    },
    "amenities": ["parking", "wheelchair-accessible"],
    "style": ["rustic", "modern", "classic"],
    "location": "Surrey"
  },
  "aggregations": [
    "vendorType",
    "priceRange",
    "capacity",
    "amenities",
    "style"
  ]
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "vendors": [...],
    "facetCounts": {
      "vendorType": {
        "venue": 45,
        "catering": 23,
        "venue_catering": 12
      },
      "priceRange": {
        "2000_5000": 34,
        "5000_10000": 28,
        "10000_15000": 18
      },
      "capacity": {
        "50_100": 42,
        "100_150": 31,
        "150_200": 18
      },
      "amenities": {
        "parking": 67,
        "wheelchair-accessible": 45,
        "garden": 38,
        "indoor-backup": 29
      }
    },
    "activeFilters": {
      "vendorType": ["venue", "catering"],
      "priceRange": {"min": 2000, "max": 15000},
      "capacity": {"min": 50, "max": 200}
    }
  }
}
```

### 5. Voice Search

**Endpoint**: `POST /search/voice`

Process voice search queries with natural language understanding.

#### Request Body
```json
{
  "audioData": "base64-encoded-audio-data",
  "audioFormat": "wav",
  "language": "en-US",
  "context": {
    "location": "London",
    "userId": "user-123",
    "previousSearches": ["wedding photographer", "wedding venue"]
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "transcription": "Find a wedding photographer in London under three thousand pounds",
    "intent": {
      "action": "search",
      "vendorType": "photographer",
      "location": "London",
      "priceLimit": 3000
    },
    "searchResults": {
      "vendors": [...],
      "query": "wedding photographer london",
      "filters": {
        "vendorType": "photographer",
        "location": "London",
        "priceRange": {"max": 3000}
      }
    },
    "confidence": 0.92,
    "processingTime": 1240
  }
}
```

## Specialized Search Endpoints

### 6. Availability Search

**Endpoint**: `POST /search/availability`

Search for vendors available on specific dates.

#### Request Body
```json
{
  "weddingDate": "2024-08-15",
  "flexibleDates": {
    "enabled": true,
    "range": 14
  },
  "vendorTypes": ["photographer", "venue", "dj"],
  "location": "London",
  "guestCount": 120
}
```

### 7. Budget-Optimized Search

**Endpoint**: `POST /search/budget`

Find vendors that fit within specific budget constraints with package recommendations.

#### Request Body
```json
{
  "totalBudget": 15000,
  "budgetAllocation": {
    "venue": 0.40,
    "catering": 0.25,
    "photography": 0.15,
    "flowers": 0.10,
    "music": 0.05,
    "other": 0.05
  },
  "location": "Surrey",
  "guestCount": 100,
  "weddingDate": "2024-09-21"
}
```

### 8. Review-Based Search

**Endpoint**: `POST /search/reviews`

Search and rank vendors based on review criteria.

#### Request Body
```json
{
  "query": "wedding photographer",
  "reviewCriteria": {
    "minRating": 4.5,
    "minReviews": 10,
    "verifiedOnly": true,
    "recentOnly": true,
    "includePhotos": true,
    "excludeNegative": false
  },
  "location": "London"
}
```

## Analytics and Tracking

### 9. Search Analytics

**Endpoint**: `POST /search/analytics/track`

Track search behavior and performance metrics.

#### Request Body
```json
{
  "event": "search_performed",
  "data": {
    "searchId": "search-abc123",
    "query": "wedding photographer london",
    "userId": "user-456",
    "sessionId": "session-789",
    "resultCount": 45,
    "responseTime": 234,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 10. Search Performance

**Endpoint**: `GET /search/performance`

Get search system performance metrics and health status.

#### Response
```json
{
  "success": true,
  "data": {
    "health": "healthy",
    "metrics": {
      "averageResponseTime": 185,
      "p95ResponseTime": 340,
      "p99ResponseTime": 650,
      "errorRate": 0.02,
      "throughput": 1250,
      "cacheHitRate": 0.85
    },
    "searchEngineStatus": {
      "elasticsearch": "healthy",
      "redis": "healthy",
      "database": "healthy"
    }
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Search query is required",
    "details": "The 'query' field cannot be empty for text-based searches",
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

### Common Error Codes
- `INVALID_QUERY` - Malformed search parameters
- `SEARCH_TIMEOUT` - Query execution timeout
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED` - Invalid or missing authentication token
- `SERVICE_UNAVAILABLE` - Search engine temporarily down
- `LOCATION_INVALID` - Invalid geographic coordinates
- `VALIDATION_ERROR` - Request validation failed

## Rate Limiting

All search endpoints have rate limits:
- **Standard Users**: 100 requests per minute
- **Premium Users**: 500 requests per minute
- **API Partners**: 2000 requests per minute

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## SDKs and Client Libraries

### JavaScript/TypeScript SDK
```bash
npm install @wedsync/search-sdk
```

```typescript
import { WedSyncSearch } from '@wedsync/search-sdk';

const client = new WedSyncSearch({
  apiKey: 'your-api-key',
  baseURL: 'https://api.wedsync.com/v1'
});

const results = await client.searchVendors({
  query: 'wedding photographer',
  location: 'London'
});
```

### Python SDK
```bash
pip install wedsync-search
```

```python
from wedsync_search import SearchClient

client = SearchClient(api_key='your-api-key')
results = client.search_vendors(
    query='wedding photographer',
    location='London'
)
```

## Webhook Integration

Subscribe to search-related events:

### Available Events
- `search.performed` - When a search is executed
- `vendor.viewed` - When a search result is clicked
- `vendor.contacted` - When a vendor is contacted from search
- `search.converted` - When a search leads to a booking

### Webhook Example
```json
{
  "event": "search.performed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "searchId": "search-abc123",
    "userId": "user-456",
    "query": "wedding photographer london",
    "resultCount": 45,
    "responseTime": 234
  }
}
```

## Testing

### Test Environment
- **Base URL**: `https://api-staging.wedsync.com/v1/search`
- **Test API Keys**: Available in developer dashboard
- **Test Data**: Seeded with realistic wedding vendor data

### Example Test Request
```bash
curl -X POST https://api-staging.wedsync.com/v1/search/vendors \
  -H "Authorization: Bearer test_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "wedding photographer",
    "location": {"address": "London"}
  }'
```

---

## Support

- **API Status**: https://status.wedsync.com
- **Documentation**: https://docs.wedsync.com/search-api
- **Developer Support**: api-support@wedsync.com
- **Discord Community**: https://discord.gg/wedsync-dev

**API Version**: 1.0  
**Last Updated**: January 2025