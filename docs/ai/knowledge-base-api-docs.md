# WedSync AI Knowledge Base API Documentation

## Overview

The WedSync AI Knowledge Base API provides comprehensive endpoints for creating, managing, searching, and analyzing knowledge content. This RESTful API is designed specifically for wedding industry suppliers and integrates advanced AI capabilities.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL and Versioning](#base-url-and-versioning)
3. [Rate Limiting](#rate-limiting)
4. [Response Format](#response-format)
5. [Articles API](#articles-api)
6. [Search API](#search-api)
7. [AI Features API](#ai-features-api)
8. [FAQ Management API](#faq-management-api)
9. [Analytics API](#analytics-api)
10. [Webhooks](#webhooks)
11. [Error Codes](#error-codes)
12. [SDK and Libraries](#sdk-and-libraries)

## Authentication

### API Key Authentication

All API requests require authentication using your WedSync API key:

```http
Authorization: Bearer YOUR_API_KEY
```

### Getting Your API Key

1. Log into your WedSync dashboard
2. Navigate to Settings > API Keys
3. Generate a new API key for knowledge base access
4. Set appropriate permissions and scopes

### Scopes and Permissions

- `knowledge:read` - Read access to articles and search
- `knowledge:write` - Create and update articles
- `knowledge:ai` - Access AI-powered features
- `knowledge:analytics` - Access analytics data
- `knowledge:admin` - Full administrative access

## Base URL and Versioning

### Base URL
```
https://api.wedsync.com/v1/knowledge
```

### API Versioning

The API uses URL versioning. Current version is `v1`. Future versions will be available as `v2`, etc.

## Rate Limiting

### Standard Limits

- **Search requests**: 100 per minute per organization
- **Article creation**: 50 per minute per organization  
- **AI generation**: 20 per minute per organization
- **Analytics queries**: 30 per minute per organization

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1643723400
```

### Exceeding Limits

When rate limits are exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "API rate limit exceeded",
  "retry_after": 60
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid input provided",
    "details": {
      "field": "title",
      "reason": "Title is required"
    }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

## Articles API

### Create Article

Create a new knowledge base article.

```http
POST /articles
```

**Request Body:**

```json
{
  "title": "Wedding Day Timeline Guide",
  "content": "Comprehensive guide for planning wedding day timeline...",
  "excerpt": "Learn how to create the perfect wedding timeline",
  "category": "timeline",
  "tags": ["planning", "timeline", "wedding-day"],
  "status": "published",
  "ai_generated": false
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "article_123",
    "title": "Wedding Day Timeline Guide",
    "content": "Comprehensive guide for planning wedding day timeline...",
    "category": "timeline",
    "status": "published",
    "author_id": "user_456",
    "organization_id": "org_789",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z",
    "view_count": 0,
    "like_count": 0,
    "search_keywords": ["timeline", "planning", "wedding-day"]
  }
}
```

### Get Article

Retrieve a specific article by ID.

```http
GET /articles/{article_id}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "article_123",
    "title": "Wedding Day Timeline Guide",
    "content": "Full article content...",
    "category": "timeline",
    "tags": ["planning", "timeline"],
    "status": "published",
    "ai_generated": false,
    "ai_confidence_score": null,
    "view_count": 25,
    "like_count": 3,
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

### Update Article

Update an existing article.

```http
PUT /articles/{article_id}
```

**Request Body:**

```json
{
  "title": "Updated Wedding Timeline Guide",
  "content": "Updated comprehensive guide...",
  "status": "published"
}
```

### List Articles

Get a paginated list of articles.

```http
GET /articles?page=1&limit=20&category=timeline&status=published
```

**Query Parameters:**

- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (max: 100, default: 20)
- `category` (string): Filter by category
- `status` (string): Filter by status (draft, published, archived)
- `ai_generated` (boolean): Filter by AI generation status
- `sort_by` (string): Sort by field (created_at, updated_at, views, likes)
- `order` (string): Sort order (asc, desc)

**Response:**

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "article_123",
        "title": "Wedding Timeline Guide",
        "excerpt": "Learn how to create...",
        "category": "timeline",
        "status": "published",
        "view_count": 25,
        "created_at": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 95,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

### Delete Article

Delete an article (soft delete).

```http
DELETE /articles/{article_id}
```

## Search API

### Search Articles

Search through knowledge base articles.

```http
POST /search
```

**Request Body:**

```json
{
  "query": "wedding timeline photography",
  "category": "all",
  "tags": ["photography"],
  "sort_by": "relevance",
  "limit": 10,
  "offset": 0,
  "include_ai_generated": true,
  "min_confidence_score": 0.7
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "article_123",
        "title": "Wedding Timeline with Photography",
        "excerpt": "Perfect timeline including photo sessions...",
        "category": "timeline",
        "relevance_score": 0.95,
        "ai_confidence_score": 0.92
      }
    ],
    "total_count": 8,
    "suggestions": [
      "photography timeline",
      "wedding day schedule",
      "photo session planning"
    ],
    "related_tags": ["photography", "planning", "timeline"],
    "ai_recommendations": [
      {
        "type": "article",
        "title": "Photography Package Pricing",
        "confidence_score": 0.88,
        "article_id": "article_456"
      }
    ]
  }
}
```

### Get Search Suggestions

Get autocomplete suggestions for search queries.

```http
GET /search/suggestions?q=photo&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "photography timeline",
        "type": "phrase",
        "frequency": 45
      },
      {
        "text": "photo session",
        "type": "phrase",
        "frequency": 32
      }
    ]
  }
}
```

## AI Features API

### Generate Content

Use AI to generate article content.

```http
POST /ai/generate-content
```

**Request Body:**

```json
{
  "prompt": "Create a guide about wedding venue selection criteria",
  "category": "venue",
  "tone": "professional",
  "length": "medium",
  "include_examples": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "generated_content": {
      "title": "Essential Wedding Venue Selection Criteria",
      "content": "When choosing the perfect wedding venue...",
      "suggested_tags": ["venue", "selection", "criteria"],
      "ai_confidence_score": 0.89,
      "estimated_reading_time": "5 minutes"
    },
    "generation_metadata": {
      "model_used": "gpt-4-turbo-preview",
      "tokens_used": 1250,
      "processing_time_ms": 3200
    }
  }
}
```

### Content Analysis

Analyze existing content for quality and improvements.

```http
POST /ai/analyze-content
```

**Request Body:**

```json
{
  "content": "Article content to analyze...",
  "category": "timeline"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "quality_score": 78,
    "readability_score": 82,
    "seo_score": 65,
    "suggestions": [
      {
        "type": "improvement",
        "priority": "high",
        "suggestion": "Add more specific examples",
        "location": "paragraph 3"
      }
    ],
    "keyword_analysis": {
      "primary_keywords": ["wedding", "timeline"],
      "missing_keywords": ["photography", "vendor"]
    }
  }
}
```

### Get AI Recommendations

Get AI-powered content recommendations.

```http
GET /ai/recommendations?organization_id=org_789&type=content_gaps
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "content_gap",
        "priority": "high",
        "title": "Create Pricing FAQ Section",
        "description": "Many clients ask about pricing. Consider creating comprehensive pricing FAQs.",
        "suggested_content": "Photography Package Pricing Guide",
        "confidence_score": 0.91
      }
    ]
  }
}
```

## FAQ Management API

### Extract FAQs from Document

Extract FAQ entries from uploaded documents.

```http
POST /faq/extract
```

**Request (multipart/form-data):**

```
file: [PDF/DOC file]
supplier_id: org_789
auto_categorize: true
confidence_threshold: 0.8
```

**Response:**

```json
{
  "success": true,
  "data": {
    "extraction_id": "extract_123",
    "extracted_faqs": [
      {
        "question": "How many photos will we receive?",
        "answer": "You'll receive 300-500 edited photos depending on your package",
        "category": "photography",
        "confidence": 0.92,
        "source_page": 2
      }
    ],
    "processing_stats": {
      "total_extractions": 8,
      "high_confidence": 6,
      "needs_review": 2,
      "processing_time_ms": 4500
    }
  }
}
```

### Approve FAQ Extraction

Approve and publish extracted FAQ.

```http
POST /faq/approve/{extraction_id}
```

**Request Body:**

```json
{
  "faq_id": "faq_456",
  "approved": true,
  "modifications": {
    "answer": "Updated answer with more details..."
  }
}
```

## Analytics API

### Knowledge Base Analytics

Get comprehensive analytics for your knowledge base.

```http
GET /analytics/overview?period=30d
```

**Query Parameters:**

- `period` (string): Time period (7d, 30d, 90d, 1y)
- `category` (string): Filter by category
- `include_ai_metrics` (boolean): Include AI-specific metrics

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "total_articles": 45,
      "published_articles": 42,
      "draft_articles": 3,
      "ai_generated_percentage": 35.5,
      "total_views": 1250,
      "total_searches": 890
    },
    "performance": {
      "most_viewed_articles": [
        {
          "id": "article_123",
          "title": "Wedding Timeline Guide",
          "views": 156
        }
      ],
      "most_searched_terms": [
        {
          "term": "photography pricing",
          "count": 78
        }
      ]
    },
    "quality_metrics": {
      "average_quality_score": 82.5,
      "high_quality_articles": 38,
      "needs_improvement": 4
    }
  }
}
```

### Search Analytics

Get detailed search analytics.

```http
GET /analytics/search?period=7d
```

**Response:**

```json
{
  "success": true,
  "data": {
    "search_stats": {
      "total_searches": 234,
      "successful_searches": 198,
      "success_rate": 84.6,
      "average_results": 6.2
    },
    "popular_queries": [
      {
        "query": "wedding timeline",
        "count": 45,
        "success_rate": 91.1
      }
    ],
    "failed_queries": [
      {
        "query": "destination wedding costs",
        "count": 8,
        "suggestions": ["Create destination wedding content"]
      }
    ]
  }
}
```

## Webhooks

### Configure Webhooks

Set up webhooks to receive real-time notifications about knowledge base events.

**Supported Events:**

- `article.created`
- `article.updated` 
- `article.published`
- `search.performed`
- `ai.content_generated`
- `faq.extracted`

### Webhook Payload Example

```json
{
  "event": "article.published",
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "article_id": "article_123",
    "title": "New Wedding Timeline Guide",
    "category": "timeline",
    "organization_id": "org_789"
  }
}
```

## Error Codes

### Common HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized  
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### API-Specific Error Codes

- `KNOWLEDGE_001` - Article not found
- `KNOWLEDGE_002` - Invalid category
- `KNOWLEDGE_003` - Content too long
- `KNOWLEDGE_004` - Duplicate article
- `AI_001` - AI service unavailable
- `AI_002` - Content generation failed
- `AI_003` - Confidence threshold not met
- `SEARCH_001` - Search index unavailable
- `SEARCH_002` - Invalid search query
- `FAQ_001` - Document format not supported
- `FAQ_002` - Extraction failed

## SDK and Libraries

### Official SDKs

**Node.js/TypeScript:**
```bash
npm install @wedsync/knowledge-sdk
```

```typescript
import { WedSyncKnowledge } from '@wedsync/knowledge-sdk'

const knowledge = new WedSyncKnowledge({
  apiKey: 'your-api-key',
  organizationId: 'org-123'
})

// Create article
const article = await knowledge.articles.create({
  title: 'Wedding Timeline Guide',
  content: 'Comprehensive guide...',
  category: 'timeline'
})

// Search articles  
const results = await knowledge.search({
  query: 'photography timeline',
  limit: 10
})
```

**Python:**
```bash
pip install wedsync-knowledge
```

```python
from wedsync_knowledge import KnowledgeClient

client = KnowledgeClient(
    api_key='your-api-key',
    organization_id='org-123'
)

# Create article
article = client.articles.create(
    title='Wedding Timeline Guide',
    content='Comprehensive guide...',
    category='timeline'
)

# Search articles
results = client.search(
    query='photography timeline',
    limit=10
)
```

### Community Libraries

- **PHP**: `wedsync/knowledge-php`
- **Ruby**: `wedsync-knowledge-gem`
- **Go**: `github.com/wedsync/knowledge-go`

## Examples and Tutorials

### Basic Article Management

```javascript
// Create a new article
const article = await knowledge.articles.create({
  title: 'Ultimate Wedding Photography Timeline',
  content: `
    # Wedding Photography Timeline
    
    ## 6 Hours Before Ceremony
    - Bridal preparations
    - Detail shots
    
    ## 4 Hours Before
    - Groom preparations
    - Groomsmen photos
  `,
  category: 'timeline',
  tags: ['photography', 'timeline', 'planning'],
  status: 'published'
})

// Search for related articles
const searchResults = await knowledge.search({
  query: 'photography timeline',
  category: 'timeline',
  limit: 5
})
```

### AI Content Generation

```javascript
// Generate content with AI
const generatedContent = await knowledge.ai.generateContent({
  prompt: 'Create a comprehensive guide for selecting wedding venues',
  category: 'venue',
  tone: 'professional',
  length: 'long'
})

// Analyze content quality
const analysis = await knowledge.ai.analyzeContent({
  content: generatedContent.content,
  category: 'venue'
})

console.log(`Quality Score: ${analysis.quality_score}/100`)
```

### FAQ Extraction Workflow

```javascript
// Extract FAQs from document
const extraction = await knowledge.faq.extractFromDocument({
  file: documentBuffer,
  filename: 'wedding-info.pdf',
  auto_categorize: true
})

// Review and approve extractions
for (const faq of extraction.extracted_faqs) {
  if (faq.confidence > 0.8) {
    await knowledge.faq.approve(faq.id, {
      approved: true
    })
  }
}
```

## Rate Limiting Best Practices

1. **Implement Exponential Backoff**: When receiving 429 responses
2. **Cache Responses**: Cache search results and article data when possible
3. **Batch Operations**: Combine multiple operations when available
4. **Monitor Usage**: Track your API usage to avoid hitting limits

## Security Considerations

1. **API Key Security**: Never expose API keys in client-side code
2. **Use HTTPS**: Always use HTTPS for API requests
3. **Validate Input**: Sanitize and validate all input data
4. **Monitor Access**: Regularly audit API access logs

## Support and Resources

- **API Status**: https://status.wedsync.com
- **Developer Forum**: https://developers.wedsync.com/forum
- **Support Email**: api-support@wedsync.com
- **Documentation**: https://docs.wedsync.com/api

---

*Last Updated: January 2025*
*API Version: 1.0*