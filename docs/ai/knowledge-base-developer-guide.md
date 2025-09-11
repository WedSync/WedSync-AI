# WedSync AI Knowledge Base - Developer Guide

## Overview

This guide provides technical implementation details for developers working with the WedSync AI Knowledge Base system. It covers architecture, integration patterns, testing strategies, and advanced features.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Development Setup](#development-setup)
4. [Implementation Patterns](#implementation-patterns)
5. [AI Integration](#ai-integration)
6. [Testing Strategy](#testing-strategy)
7. [Performance Optimization](#performance-optimization)
8. [Security Implementation](#security-implementation)
9. [Deployment Guide](#deployment-guide)
10. [Monitoring and Debugging](#monitoring-and-debugging)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway                              │
├─────────────────────────────────────────────────────────────┤
│  Knowledge Base Service  │  AI Processing Service           │
├─────────────────────────────────────────────────────────────┤
│  Search Engine Service   │  FAQ Extraction Service         │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database     │  Redis Cache     │ Vector DB    │
└─────────────────────────────────────────────────────────────┘
```

### Service Architecture

- **Knowledge Base Service**: Core CRUD operations for articles
- **AI Processing Service**: Content generation and analysis
- **Search Engine Service**: Full-text search and recommendations
- **FAQ Extraction Service**: Document parsing and FAQ extraction
- **Analytics Service**: Usage tracking and insights

### Data Flow

1. **Content Creation**:
   ```
   User Input → Validation → AI Enhancement → Storage → Indexing
   ```

2. **Search Process**:
   ```
   Query → AI Processing → Index Search → Ranking → Results
   ```

3. **FAQ Extraction**:
   ```
   Document → OCR/Parse → AI Analysis → Review Queue → Publication
   ```

## Technology Stack

### Backend

- **Framework**: Next.js 15 with App Router
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.0+
- **Database**: PostgreSQL 15 with pgvector extension
- **Cache**: Redis 7.0
- **Search**: Elasticsearch/OpenSearch
- **AI/ML**: OpenAI GPT-4, TensorFlow.js
- **Queue**: Bull MQ with Redis

### Frontend

- **Framework**: React 19 with Server Components
- **Styling**: Tailwind CSS 4.0
- **State Management**: Zustand 5.0
- **Forms**: React Hook Form 7.0 + Zod validation
- **UI Components**: Radix UI primitives

### Infrastructure

- **Container**: Docker with multi-stage builds
- **Orchestration**: Docker Compose (dev), Kubernetes (prod)
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + Elastic Stack
- **CDN**: Cloudflare for static assets

## Development Setup

### Prerequisites

```bash
# Required software
node >= 20.0.0
docker >= 24.0.0
docker-compose >= 2.0.0
postgresql >= 15.0.0
redis >= 7.0.0
```

### Environment Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/wedsync/wedsync.git
   cd wedsync
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Database Setup**:
   ```bash
   # Start development services
   docker-compose up -d postgres redis elasticsearch
   
   # Run migrations
   npm run db:migrate
   
   # Seed development data
   npm run db:seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Development Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/wedsync_dev
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
AI_SERVICE_MODE=development

# Search
ELASTICSEARCH_URL=http://localhost:9200
SEARCH_INDEX_NAME=knowledge_articles_dev

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_FAQ_EXTRACTION=true
ENABLE_ADVANCED_SEARCH=true
```

## Implementation Patterns

### Service Layer Pattern

```typescript
// Base service interface
interface BaseKnowledgeService {
  create(data: CreateKnowledgeRequest): Promise<KnowledgeArticle>
  findById(id: string): Promise<KnowledgeArticle | null>
  update(id: string, data: UpdateKnowledgeRequest): Promise<KnowledgeArticle>
  delete(id: string): Promise<void>
}

// Implementation
class KnowledgeArticleService implements BaseKnowledgeService {
  constructor(
    private db: DatabaseClient,
    private cache: CacheClient,
    private aiService: AIService
  ) {}

  async create(data: CreateKnowledgeRequest): Promise<KnowledgeArticle> {
    // Validate input
    const validatedData = CreateArticleSchema.parse(data)
    
    // AI enhancement if requested
    if (data.enhance_with_ai) {
      validatedData.content = await this.aiService.enhanceContent(
        validatedData.content,
        validatedData.category
      )
    }
    
    // Database transaction
    const article = await this.db.transaction(async (tx) => {
      const article = await tx.knowledgeArticles.create(validatedData)
      
      // Update search index
      await this.searchService.indexArticle(article)
      
      return article
    })
    
    // Invalidate cache
    await this.cache.invalidate(`articles:org:${article.organization_id}`)
    
    return article
  }
}
```

### Repository Pattern

```typescript
interface KnowledgeRepository {
  findMany(params: FindManyParams): Promise<KnowledgeArticle[]>
  findByCategory(category: string, orgId: string): Promise<KnowledgeArticle[]>
  search(query: SearchQuery): Promise<SearchResult>
}

class PostgresKnowledgeRepository implements KnowledgeRepository {
  constructor(private db: DatabaseClient) {}
  
  async findMany(params: FindManyParams): Promise<KnowledgeArticle[]> {
    const query = this.db.knowledgeArticles.findMany({
      where: {
        organization_id: params.organizationId,
        status: params.status,
        ...(params.category && { category: params.category })
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: params.offset,
      take: params.limit
    })
    
    return query
  }
}
```

### AI Service Integration

```typescript
class AIKnowledgeService {
  constructor(
    private openai: OpenAI,
    private vectorStore: VectorStore
  ) {}
  
  async generateContent(params: ContentGenerationParams): Promise<GeneratedContent> {
    const prompt = this.buildPrompt(params)
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert wedding industry content creator...'
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
    
    const generatedText = completion.choices[0].message.content
    
    // Calculate confidence score
    const confidence = await this.calculateConfidenceScore(
      generatedText,
      params.category
    )
    
    return {
      content: generatedText,
      confidence_score: confidence,
      model_used: 'gpt-4-turbo-preview',
      tokens_used: completion.usage?.total_tokens
    }
  }
  
  private async calculateConfidenceScore(
    content: string,
    category: string
  ): Promise<number> {
    // Vector similarity with existing high-quality content
    const embedding = await this.generateEmbedding(content)
    const similarContent = await this.vectorStore.similaritySearch(
      embedding,
      { category, minQualityScore: 8 }
    )
    
    // Calculate score based on similarity to quality content
    const avgSimilarity = similarContent.reduce(
      (sum, item) => sum + item.similarity,
      0
    ) / similarContent.length
    
    return Math.min(0.95, avgSimilarity * 1.1) // Cap at 95% for AI content
  }
}
```

### Search Implementation

```typescript
class ElasticsearchKnowledgeSearch {
  constructor(private client: Client) {}
  
  async search(params: SearchParams): Promise<SearchResult> {
    const searchBody = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: params.query,
                fields: [
                  'title^3',
                  'content^2', 
                  'excerpt^2',
                  'tags^1.5',
                  'search_keywords^1.5'
                ],
                type: 'cross_fields',
                operator: 'and'
              }
            }
          ],
          filter: [
            { term: { organization_id: params.organizationId } },
            { term: { status: 'published' } },
            ...(params.category !== 'all' ? [{ term: { category: params.category } }] : []),
            ...(params.minConfidenceScore ? [{
              range: { ai_confidence_score: { gte: params.minConfidenceScore } }
            }] : [])
          ]
        }
      },
      sort: this.buildSortQuery(params.sortBy),
      from: params.offset,
      size: params.limit,
      highlight: {
        fields: {
          title: {},
          content: { fragment_size: 150, number_of_fragments: 3 }
        }
      },
      aggs: {
        categories: {
          terms: { field: 'category.keyword' }
        },
        tags: {
          terms: { field: 'tags.keyword', size: 10 }
        }
      }
    }
    
    const response = await this.client.search({
      index: 'knowledge_articles',
      body: searchBody
    })
    
    return this.parseSearchResponse(response, params.query)
  }
  
  private parseSearchResponse(
    response: SearchResponse,
    originalQuery: string
  ): SearchResult {
    const articles = response.body.hits.hits.map(hit => ({
      ...hit._source,
      relevance_score: hit._score,
      highlight: hit.highlight
    }))
    
    const suggestions = this.generateSearchSuggestions(
      originalQuery,
      response.body.aggregations
    )
    
    return {
      articles,
      total_count: response.body.hits.total.value,
      suggestions,
      related_tags: response.body.aggregations.tags.buckets.map(b => b.key),
      ai_recommendations: await this.generateAIRecommendations(originalQuery)
    }
  }
}
```

## AI Integration

### Content Generation Pipeline

```typescript
class ContentGenerationPipeline {
  async process(request: GenerationRequest): Promise<GeneratedArticle> {
    // Step 1: Research existing content
    const existingContent = await this.findRelatedContent(
      request.topic,
      request.category
    )
    
    // Step 2: Generate outline
    const outline = await this.generateOutline(request, existingContent)
    
    // Step 3: Generate sections
    const sections = await Promise.all(
      outline.sections.map(section => 
        this.generateSection(section, request.context)
      )
    )
    
    // Step 4: Combine and refine
    const fullContent = await this.combineAndRefine(sections)
    
    // Step 5: Quality check
    const qualityScore = await this.assessQuality(fullContent)
    
    // Step 6: Generate metadata
    const metadata = await this.generateMetadata(fullContent)
    
    return {
      content: fullContent,
      quality_score: qualityScore,
      metadata,
      generation_stats: this.getStats()
    }
  }
}
```

### Vector Embeddings

```typescript
class VectorEmbeddingService {
  constructor(private openai: OpenAI) {}
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1024
    })
    
    return response.data[0].embedding
  }
  
  async findSimilarContent(
    query: string,
    options: SimilaritySearchOptions
  ): Promise<SimilarContent[]> {
    const queryEmbedding = await this.generateEmbedding(query)
    
    // PostgreSQL with pgvector
    const sql = `
      SELECT 
        id,
        title,
        content,
        category,
        (embedding <=> $1::vector) as similarity
      FROM knowledge_articles 
      WHERE organization_id = $2
        AND status = 'published'
        ${options.category ? 'AND category = $3' : ''}
      ORDER BY embedding <=> $1::vector
      LIMIT $${options.category ? '4' : '3'}
    `
    
    const params = [
      `[${queryEmbedding.join(',')}]`,
      options.organizationId,
      ...(options.category ? [options.category] : [])
    ]
    
    const results = await this.db.query(sql, params)
    
    return results.rows.map(row => ({
      id: row.id,
      title: row.title,
      similarity: 1 - row.similarity, // Convert distance to similarity
      category: row.category
    }))
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// Service unit tests
describe('KnowledgeArticleService', () => {
  let service: KnowledgeArticleService
  let mockDb: jest.Mocked<DatabaseClient>
  let mockAI: jest.Mocked<AIService>
  
  beforeEach(() => {
    mockDb = createMockDatabase()
    mockAI = createMockAIService()
    service = new KnowledgeArticleService(mockDb, mockAI)
  })
  
  describe('create', () => {
    it('should create article with AI enhancement', async () => {
      // Arrange
      const createRequest = {
        title: 'Test Article',
        content: 'Basic content',
        category: 'timeline',
        enhance_with_ai: true
      }
      
      mockAI.enhanceContent.mockResolvedValue('Enhanced content')
      mockDb.knowledgeArticles.create.mockResolvedValue({
        id: 'article-1',
        ...createRequest,
        content: 'Enhanced content'
      })
      
      // Act
      const result = await service.create(createRequest)
      
      // Assert
      expect(mockAI.enhanceContent).toHaveBeenCalledWith(
        'Basic content',
        'timeline'
      )
      expect(result.content).toBe('Enhanced content')
    })
  })
})
```

### Integration Tests

```typescript
// API integration tests
describe('Knowledge Base API', () => {
  let app: Application
  let db: TestDatabase
  
  beforeAll(async () => {
    db = await setupTestDatabase()
    app = await createTestApplication(db)
  })
  
  afterAll(async () => {
    await db.cleanup()
  })
  
  describe('POST /api/knowledge/articles', () => {
    it('should create article and return 201', async () => {
      const articleData = {
        title: 'Wedding Timeline Guide',
        content: 'Comprehensive guide...',
        category: 'timeline'
      }
      
      const response = await request(app)
        .post('/api/knowledge/articles')
        .set('Authorization', `Bearer ${getTestToken()}`)
        .send(articleData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(articleData.title)
      
      // Verify database persistence
      const dbArticle = await db.knowledgeArticles.findById(
        response.body.data.id
      )
      expect(dbArticle).toBeTruthy()
    })
  })
})
```

### E2E Tests

See the comprehensive E2E test suite in `/src/__tests__/e2e/KnowledgeE2ETests.spec.ts`

### AI Testing

```typescript
describe('AI Content Generation', () => {
  let aiService: AIKnowledgeService
  
  beforeEach(() => {
    aiService = new AIKnowledgeService(mockOpenAI, mockVectorStore)
  })
  
  it('should generate wedding-appropriate content', async () => {
    const params = {
      prompt: 'Create a wedding venue selection guide',
      category: 'venue',
      tone: 'professional'
    }
    
    const result = await aiService.generateContent(params)
    
    // Validate content structure
    expect(result.content).toContain('venue')
    expect(result.content).toContain('wedding')
    expect(result.confidence_score).toBeGreaterThan(0.7)
    
    // Validate wedding industry relevance
    const weddingTerms = ['ceremony', 'reception', 'bridal', 'couple']
    const containsWeddingTerms = weddingTerms.some(term =>
      result.content.toLowerCase().includes(term)
    )
    expect(containsWeddingTerms).toBe(true)
  })
})
```

## Performance Optimization

### Database Optimization

```sql
-- Indexes for knowledge articles
CREATE INDEX CONCURRENTLY idx_knowledge_articles_org_status 
  ON knowledge_articles (organization_id, status);

CREATE INDEX CONCURRENTLY idx_knowledge_articles_category_published
  ON knowledge_articles (category, status) 
  WHERE status = 'published';

CREATE INDEX CONCURRENTLY idx_knowledge_articles_search_keywords
  ON knowledge_articles USING GIN (search_keywords);

-- Full-text search index
CREATE INDEX CONCURRENTLY idx_knowledge_articles_fts
  ON knowledge_articles USING GIN (
    to_tsvector('english', title || ' ' || content || ' ' || excerpt)
  );

-- Vector similarity index for AI features
CREATE INDEX CONCURRENTLY idx_knowledge_articles_embedding
  ON knowledge_articles USING hnsw (embedding vector_cosine_ops);
```

### Caching Strategy

```typescript
class CachedKnowledgeService {
  constructor(
    private baseService: KnowledgeArticleService,
    private cache: CacheClient
  ) {}
  
  async findById(id: string): Promise<KnowledgeArticle | null> {
    const cacheKey = `article:${id}`
    
    // Try cache first
    const cached = await this.cache.get<KnowledgeArticle>(cacheKey)
    if (cached) {
      return cached
    }
    
    // Fetch from database
    const article = await this.baseService.findById(id)
    if (article) {
      // Cache for 1 hour
      await this.cache.setex(cacheKey, 3600, article)
    }
    
    return article
  }
  
  async search(params: SearchParams): Promise<SearchResult> {
    // Create cache key from search parameters
    const cacheKey = `search:${hashObject(params)}`
    
    const cached = await this.cache.get<SearchResult>(cacheKey)
    if (cached) {
      return cached
    }
    
    const result = await this.baseService.search(params)
    
    // Cache search results for 15 minutes
    await this.cache.setex(cacheKey, 900, result)
    
    return result
  }
}
```

### AI Request Batching

```typescript
class BatchedAIService {
  private requestQueue: AIRequest[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  
  async enhanceContent(content: string, category: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        content,
        category,
        resolve,
        reject
      })
      
      // Schedule batch processing
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch()
        }, 100) // Batch requests for 100ms
      }
    })
  }
  
  private async processBatch() {
    const batch = [...this.requestQueue]
    this.requestQueue.length = 0
    this.batchTimeout = null
    
    if (batch.length === 0) return
    
    try {
      // Process multiple requests in single API call
      const batchContent = batch.map(req => req.content).join('\n---\n')
      
      const enhanced = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Enhance these wedding industry contents separately...'
          },
          {
            role: 'user',
            content: batchContent
          }
        ]
      })
      
      // Split and distribute results
      const results = enhanced.choices[0].message.content.split('\n---\n')
      batch.forEach((request, index) => {
        request.resolve(results[index] || request.content)
      })
      
    } catch (error) {
      batch.forEach(request => request.reject(error))
    }
  }
}
```

## Security Implementation

### Input Validation

```typescript
// Comprehensive validation schemas
export const CreateArticleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .regex(/^[a-zA-Z0-9\s\-\'\".,!?()]+$/, 'Invalid characters in title'),
    
  content: z.string()
    .min(10, 'Content too short')
    .max(50000, 'Content too long')
    .refine(
      content => !containsMaliciousContent(content),
      'Content contains prohibited elements'
    ),
    
  category: z.enum(['timeline', 'venue', 'photography', 'catering', 'florist', 'music', 'transport', 'general']),
  
  tags: z.array(z.string().max(50)).max(20, 'Too many tags'),
  
  ai_generated: z.boolean().default(false),
  
  // Sanitize HTML content
  content_html: z.string().optional().transform(content => 
    content ? sanitizeHtml(content, {
      allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
      allowedAttributes: {}
    }) : undefined
  )
})

function containsMaliciousContent(content: string): boolean {
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi
  ]
  
  return maliciousPatterns.some(pattern => pattern.test(content))
}
```

### Authorization

```typescript
// Role-based access control
export class KnowledgeAuthorizationService {
  async canCreateArticle(user: User, organizationId: string): Promise<boolean> {
    if (user.organization_id !== organizationId) {
      return false
    }
    
    return user.permissions.includes('knowledge:write')
  }
  
  async canViewArticle(user: User, article: KnowledgeArticle): Promise<boolean> {
    // Public articles are viewable by all
    if (article.status === 'published' && article.is_public) {
      return true
    }
    
    // Organization members can view their articles
    if (user.organization_id === article.organization_id) {
      return user.permissions.includes('knowledge:read')
    }
    
    return false
  }
  
  async canUseAIFeatures(user: User): Promise<boolean> {
    const subscription = await this.getSubscription(user.organization_id)
    
    return subscription.tier === 'professional' || 
           subscription.tier === 'enterprise'
  }
}
```

### API Rate Limiting

```typescript
// Advanced rate limiting with different limits per endpoint
export class KnowledgeRateLimiter {
  private redis: Redis
  
  constructor(redis: Redis) {
    this.redis = redis
  }
  
  async checkRateLimit(
    userId: string,
    endpoint: string,
    organizationId: string
  ): Promise<RateLimitResult> {
    const limits = this.getLimitsForEndpoint(endpoint, organizationId)
    const key = `rate_limit:${userId}:${endpoint}`
    
    // Use sliding window rate limiter
    const now = Date.now()
    const windowStart = now - limits.windowMs
    
    // Clean old entries and count current requests
    await this.redis.zremrangebyscore(key, 0, windowStart)
    const currentCount = await this.redis.zcard(key)
    
    if (currentCount >= limits.maxRequests) {
      return {
        allowed: false,
        resetTime: windowStart + limits.windowMs,
        remaining: 0,
        total: limits.maxRequests
      }
    }
    
    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`)
    await this.redis.expire(key, Math.ceil(limits.windowMs / 1000))
    
    return {
      allowed: true,
      resetTime: windowStart + limits.windowMs,
      remaining: limits.maxRequests - currentCount - 1,
      total: limits.maxRequests
    }
  }
  
  private getLimitsForEndpoint(endpoint: string, orgId: string): RateLimit {
    // Different limits based on subscription tier
    const subscription = this.getSubscriptionTier(orgId)
    
    const baseLimits = {
      '/api/knowledge/search': { maxRequests: 100, windowMs: 60000 },
      '/api/knowledge/articles': { maxRequests: 50, windowMs: 60000 },
      '/api/knowledge/ai/generate': { maxRequests: 20, windowMs: 60000 }
    }
    
    const multiplier = subscription === 'enterprise' ? 2 : 1
    const limits = baseLimits[endpoint] || { maxRequests: 30, windowMs: 60000 }
    
    return {
      maxRequests: limits.maxRequests * multiplier,
      windowMs: limits.windowMs
    }
  }
}
```

## Deployment Guide

### Docker Configuration

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
```

### Kubernetes Deployment

```yaml
# knowledge-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: knowledge-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: knowledge-service
  template:
    metadata:
      labels:
        app: knowledge-service
    spec:
      containers:
      - name: knowledge-service
        image: wedsync/knowledge-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
```

### Environment-Specific Configurations

```typescript
// config/environments.ts
export const environments = {
  development: {
    database: {
      pool: { min: 2, max: 10 },
      debug: true
    },
    ai: {
      model: 'gpt-4-turbo-preview',
      timeout: 30000,
      batchSize: 5
    },
    cache: {
      ttl: 300, // 5 minutes
      checkPeriod: 60
    }
  },
  
  production: {
    database: {
      pool: { min: 10, max: 50 },
      debug: false,
      ssl: { rejectUnauthorized: false }
    },
    ai: {
      model: 'gpt-4-turbo-preview',
      timeout: 15000,
      batchSize: 10,
      maxRetries: 3
    },
    cache: {
      ttl: 3600, // 1 hour
      checkPeriod: 600
    }
  }
}
```

## Monitoring and Debugging

### Application Metrics

```typescript
// metrics/knowledge-metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client'

export const knowledgeMetrics = {
  // Article operations
  articlesCreated: new Counter({
    name: 'knowledge_articles_created_total',
    help: 'Total number of articles created',
    labelNames: ['organization_id', 'category', 'ai_generated']
  }),
  
  // Search metrics  
  searchRequests: new Counter({
    name: 'knowledge_search_requests_total',
    help: 'Total number of search requests',
    labelNames: ['organization_id', 'category']
  }),
  
  searchDuration: new Histogram({
    name: 'knowledge_search_duration_seconds',
    help: 'Search request duration in seconds',
    labelNames: ['organization_id'],
    buckets: [0.1, 0.5, 1, 2, 5]
  }),
  
  // AI metrics
  aiGenerationRequests: new Counter({
    name: 'knowledge_ai_generation_requests_total',
    help: 'Total AI content generation requests',
    labelNames: ['model', 'category']
  }),
  
  aiGenerationDuration: new Histogram({
    name: 'knowledge_ai_generation_duration_seconds', 
    help: 'AI generation duration in seconds',
    labelNames: ['model'],
    buckets: [1, 5, 10, 30, 60]
  }),
  
  // Quality metrics
  contentQualityScore: new Histogram({
    name: 'knowledge_content_quality_score',
    help: 'Content quality scores',
    labelNames: ['category', 'ai_generated'],
    buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0]
  })
}

// Middleware for automatic metrics collection
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000
    
    if (req.path.includes('/search')) {
      knowledgeMetrics.searchRequests.inc({
        organization_id: req.user?.organization_id || 'anonymous',
        category: req.query.category || 'all'
      })
      
      knowledgeMetrics.searchDuration.observe(
        { organization_id: req.user?.organization_id || 'anonymous' },
        duration
      )
    }
  })
  
  next()
}
```

### Logging Configuration

```typescript
// logging/knowledge-logger.ts
import winston from 'winston'

export const knowledgeLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.metadata({
      fillExcept: ['message', 'level', 'timestamp']
    })
  ),
  defaultMeta: {
    service: 'knowledge-service',
    version: process.env.APP_VERSION
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/knowledge-error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/knowledge-combined.log'
    })
  ]
})

// Structured logging for key operations
export const logKnowledgeOperation = (
  operation: string,
  metadata: Record<string, any>,
  level: string = 'info'
) => {
  knowledgeLogger.log(level, `Knowledge operation: ${operation}`, {
    operation,
    ...metadata,
    timestamp: new Date().toISOString()
  })
}

// Usage example
logKnowledgeOperation('article_created', {
  articleId: 'article_123',
  organizationId: 'org_456', 
  category: 'timeline',
  aiGenerated: true,
  processingTime: 1250
})
```

### Debug Tools

```typescript
// debug/knowledge-debug.ts
export class KnowledgeDebugger {
  static async analyzeSearchPerformance(query: string, orgId: string) {
    const startTime = performance.now()
    
    // Execute search with detailed timing
    const searchResult = await knowledgeService.search({
      query,
      organizationId: orgId,
      category: 'all',
      limit: 10
    })
    
    const totalTime = performance.now() - startTime
    
    return {
      query,
      totalTime,
      resultCount: searchResult.total_count,
      avgRelevanceScore: searchResult.articles.reduce(
        (sum, article) => sum + (article.relevance_score || 0),
        0
      ) / searchResult.articles.length,
      suggestions: searchResult.suggestions,
      performance: {
        classification: totalTime < 500 ? 'good' : totalTime < 1000 ? 'ok' : 'slow',
        recommendation: totalTime > 1000 ? 'Consider adding search indexes or caching' : 'Performance within acceptable range'
      }
    }
  }
  
  static async validateAIOutput(content: string, category: string) {
    const validations = [
      {
        name: 'Contains Wedding Terms',
        test: /\b(wedding|bride|groom|ceremony|reception)\b/gi,
        required: true
      },
      {
        name: 'Appropriate Length',
        test: (content: string) => content.length >= 100 && content.length <= 10000,
        required: true
      },
      {
        name: 'No Malicious Content',
        test: (content: string) => !/<script|javascript:/gi.test(content),
        required: true
      },
      {
        name: 'Category Relevant',
        test: new RegExp(`\\b${category}\\b`, 'gi'),
        required: false
      }
    ]
    
    return validations.map(validation => ({
      name: validation.name,
      passed: typeof validation.test === 'function' 
        ? validation.test(content)
        : validation.test.test(content),
      required: validation.required
    }))
  }
}
```

---

*Last Updated: January 2025*
*Version: 2.0*