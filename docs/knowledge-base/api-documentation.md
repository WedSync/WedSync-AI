# Knowledge Base API Documentation

## Overview

The WedSync Knowledge Base API provides intelligent search and content management for wedding industry professionals and couples. It features AI-powered semantic search, multi-tenant organization support, and real-time performance analytics.

## Base URL
```
https://wedsync.com/api/knowledge-base
```

## Authentication

All API requests require authentication using Bearer tokens:

```http
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Search Articles

**Endpoint:** `POST /search`

Search for articles using natural language queries with AI-powered semantic matching.

**Request Body:**
```json
{
  "query": "wedding photography pricing strategies",
  "userType": "supplier", // "supplier" | "couple"
  "supplierType": "photographer", // Required if userType is "supplier"
  "organizationId": "org_123", // Optional, for tenant isolation
  "limit": 20, // Optional, default 20, max 100
  "offset": 0, // Optional, for pagination
  "filters": {
    "category": "Business", // Optional category filter
    "tags": ["pricing", "strategy"], // Optional tag filters
    "difficulty": "beginner", // Optional: "beginner" | "intermediate" | "advanced"
    "readTime": 300 // Optional, max read time in seconds
  },
  "weddingDate": "2025-08-15", // Optional, for couples
  "planningStage": "venue-hunting", // Optional, for couples
  "location": "London, UK" // Optional, for location-aware results
}
```

**Response:**
```json
{
  "articles": [
    {
      "id": "art_123",
      "title": "Wedding Photography Pricing Strategies for 2025",
      "content": "Complete guide to pricing your wedding photography services...",
      "summary": "Learn effective pricing strategies for wedding photographers...",
      "category": "Business",
      "tags": ["pricing", "photography", "business"],
      "readTime": 420,
      "difficulty": "intermediate",
      "relevanceScore": 0.94,
      "lastUpdated": "2025-01-15T10:30:00Z",
      "author": {
        "name": "Sarah Johnson",
        "role": "Wedding Industry Expert",
        "avatar": "https://..."
      },
      "metadata": {
        "viewCount": 1547,
        "rating": 4.8,
        "helpful": true,
        "couplesRating": 4.6,
        "supplierRating": 4.9
      }
    }
  ],
  "total": 42,
  "searchTime": 234,
  "page": {
    "current": 1,
    "size": 20,
    "totalPages": 3
  },
  "suggestions": [
    "seasonal pricing adjustments",
    "package pricing optimization",
    "competitor pricing analysis"
  ],
  "facets": {
    "categories": {
      "Business": 15,
      "Technical": 12,
      "Marketing": 8,
      "Legal": 7
    },
    "difficulty": {
      "beginner": 18,
      "intermediate": 16,
      "advanced": 8
    }
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "SEARCH_FAILED",
    "message": "Search service temporarily unavailable",
    "details": "AI service rate limit exceeded",
    "retryAfter": 30,
    "fallbackAvailable": true
  }
}
```

### 2. Get Article by ID

**Endpoint:** `GET /articles/{articleId}`

Retrieve a specific article by its ID.

**Path Parameters:**
- `articleId` (string): Unique identifier for the article

**Query Parameters:**
- `format` (string, optional): Response format - "full" | "summary" | "content-only"
- `includeMetrics` (boolean, optional): Include view metrics and analytics

**Response:**
```json
{
  "article": {
    "id": "art_123",
    "title": "Wedding Photography Pricing Strategies for 2025",
    "content": "Complete article content in markdown format...",
    "summary": "Brief summary of the article...",
    "category": "Business",
    "tags": ["pricing", "photography", "business"],
    "readTime": 420,
    "difficulty": "intermediate",
    "lastUpdated": "2025-01-15T10:30:00Z",
    "author": {
      "name": "Sarah Johnson",
      "role": "Wedding Industry Expert",
      "bio": "15 years in wedding photography business...",
      "avatar": "https://..."
    },
    "relatedArticles": [
      {
        "id": "art_124",
        "title": "Photography Contract Essentials",
        "relevanceScore": 0.87
      }
    ],
    "metrics": {
      "viewCount": 1547,
      "avgReadTime": 380,
      "completionRate": 0.78,
      "rating": 4.8,
      "feedbackCount": 127,
      "shareCount": 89
    }
  }
}
```

### 3. Search Suggestions

**Endpoint:** `GET /search/suggestions`

Get real-time search suggestions based on partial query input.

**Query Parameters:**
- `q` (string): Partial search query (minimum 2 characters)
- `userType` (string): "supplier" | "couple"
- `limit` (number, optional): Max suggestions, default 10

**Response:**
```json
{
  "suggestions": [
    {
      "text": "wedding photography pricing",
      "category": "Business",
      "popularity": 0.89,
      "resultCount": 23
    },
    {
      "text": "wedding photography contracts",
      "category": "Legal",
      "popularity": 0.76,
      "resultCount": 18
    }
  ],
  "popular": [
    "wedding day timeline",
    "vendor coordination",
    "client communication"
  ]
}
```

### 4. Submit Feedback

**Endpoint:** `POST /articles/{articleId}/feedback`

Submit feedback and ratings for articles.

**Request Body:**
```json
{
  "rating": 5, // 1-5 star rating
  "helpful": true, // Boolean helpful indicator
  "feedback": "Very comprehensive guide, helped me price my services better",
  "category": "content-quality", // "content-quality" | "accuracy" | "relevance"
  "userType": "supplier",
  "supplierType": "photographer" // If userType is supplier
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "articleId": "art_123",
  "feedbackId": "fb_456"
}
```

### 5. Analytics and Metrics

**Endpoint:** `GET /analytics`

Get search analytics and usage metrics (admin/organization level).

**Query Parameters:**
- `period` (string): "day" | "week" | "month" | "year"
- `organizationId` (string, optional): Filter by organization
- `userType` (string, optional): Filter by user type

**Response:**
```json
{
  "searchMetrics": {
    "totalSearches": 12547,
    "avgSearchTime": 189,
    "topQueries": [
      {
        "query": "wedding pricing",
        "count": 234,
        "avgResults": 18,
        "avgSearchTime": 167
      }
    ],
    "categoryDistribution": {
      "Business": 35,
      "Planning": 28,
      "Legal": 20,
      "Technical": 17
    }
  },
  "contentMetrics": {
    "totalArticles": 456,
    "avgRating": 4.6,
    "topRatedArticles": [
      {
        "id": "art_123",
        "title": "Wedding Photography Pricing",
        "rating": 4.9,
        "views": 1547
      }
    ],
    "engagementRate": 0.73
  },
  "userMetrics": {
    "activeUsers": 2341,
    "supplierUsers": 1890,
    "coupleUsers": 451,
    "avgSessionDuration": 342
  }
}
```

### 6. Content Management (Admin Only)

**Endpoint:** `POST /articles`

Create new articles (admin/content manager only).

**Request Body:**
```json
{
  "title": "New Wedding Industry Guide",
  "content": "Article content in markdown format...",
  "summary": "Brief article summary...",
  "category": "Business",
  "tags": ["new-tag", "business", "guide"],
  "difficulty": "intermediate",
  "targetAudience": ["supplier"],
  "supplierTypes": ["photographer", "venue"],
  "readTime": 300,
  "author": {
    "name": "Expert Name",
    "role": "Industry Expert"
  },
  "seo": {
    "metaTitle": "SEO optimized title",
    "metaDescription": "SEO description",
    "keywords": ["wedding", "business", "guide"]
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_REQUEST` | Request validation failed | 400 |
| `UNAUTHORIZED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Article not found | 404 |
| `RATE_LIMITED` | Too many requests | 429 |
| `SEARCH_FAILED` | Search service error | 500 |
| `AI_SERVICE_DOWN` | AI service unavailable | 503 |

## Rate Limits

- **Search API**: 100 requests per minute per user
- **Article Retrieval**: 500 requests per minute per user
- **Feedback Submission**: 10 requests per minute per user
- **Analytics API**: 10 requests per minute per organization

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { KnowledgeBaseAPI } from '@wedsync/knowledge-base-sdk';

const kb = new KnowledgeBaseAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://wedsync.com/api/knowledge-base'
});

// Search for articles
const results = await kb.search({
  query: 'wedding photography pricing',
  userType: 'supplier',
  supplierType: 'photographer',
  limit: 10
});

// Get article by ID
const article = await kb.getArticle('art_123', {
  format: 'full',
  includeMetrics: true
});

// Submit feedback
await kb.submitFeedback('art_123', {
  rating: 5,
  helpful: true,
  feedback: 'Very helpful article!'
});
```

### cURL Examples

**Search Articles:**
```bash
curl -X POST "https://wedsync.com/api/knowledge-base/search" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "wedding venue pricing strategies",
    "userType": "supplier",
    "supplierType": "venue",
    "limit": 10
  }'
```

**Get Article:**
```bash
curl -X GET "https://wedsync.com/api/knowledge-base/articles/art_123?format=full" \
  -H "Authorization: Bearer your-jwt-token"
```

## Performance Considerations

1. **Caching**: All API responses are cached for 5-15 minutes depending on the endpoint
2. **Search Performance**: Target <500ms response time for search queries
3. **Pagination**: Use pagination for large result sets to improve performance
4. **AI Rate Limiting**: AI-powered searches may be slower during high load periods
5. **CDN**: Static content (images, documents) served via CDN

## Webhooks (Optional)

Subscribe to events for real-time updates:

**Available Events:**
- `article.created` - New article published
- `article.updated` - Article content updated
- `search.popular` - Query becomes trending
- `feedback.received` - New article feedback

**Webhook Payload Example:**
```json
{
  "event": "article.created",
  "timestamp": "2025-01-20T10:30:00Z",
  "data": {
    "articleId": "art_789",
    "title": "New Wedding Planning Guide",
    "category": "Planning",
    "organizationId": "org_123"
  }
}
```

## Testing

Use the following test endpoints in development:

- **Base URL**: `https://staging.wedsync.com/api/knowledge-base`
- **Test Token**: Contact support for staging access tokens
- **Rate Limits**: Relaxed rate limits for testing (1000 requests/minute)

## Support

For API support and questions:
- **Documentation**: https://docs.wedsync.com/knowledge-base
- **Support Email**: api-support@wedsync.com
- **Community Forum**: https://community.wedsync.com/api
- **Status Page**: https://status.wedsync.com

## Changelog

### v2.1.0 (2025-01-20)
- Added AI-powered semantic search
- Improved performance with embeddings caching
- Added real-time search suggestions
- Enhanced multi-tenant support

### v2.0.0 (2025-01-15)
- Complete API redesign for wedding industry
- Added supplier/couple user type distinction
- Introduced analytics and metrics endpoints
- Added comprehensive feedback system