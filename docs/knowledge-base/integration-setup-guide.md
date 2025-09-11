# Knowledge Base Integration Setup Guide

## Overview

This comprehensive guide covers integrating the WedSync Knowledge Base system into your wedding industry application, including database setup, API configuration, authentication, and deployment considerations.

## Prerequisites

- **Node.js**: 18.0+ with npm or yarn
- **Database**: PostgreSQL 14+ (Supabase recommended)
- **AI Service**: OpenAI API access (GPT-4 + text-embedding-ada-002)
- **Storage**: Cloud storage for article assets (Supabase Storage or AWS S3)
- **Search**: Optional Elasticsearch/OpenSearch for advanced search features

## Quick Start (5-Minute Setup)

### 1. Install Dependencies

```bash
# Core knowledge base package
npm install @wedsync/knowledge-base-core

# UI Components (optional)
npm install @wedsync/knowledge-base-components

# Database client
npm install @supabase/supabase-js

# AI integration
npm install openai

# Additional utilities
npm install fuse.js class-variance-authority clsx
```

### 2. Environment Configuration

Create `.env.local` with required variables:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI for AI-powered search
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ORGANIZATION_ID=org-your-org-id

# Knowledge Base Configuration
KB_EMBEDDING_MODEL=text-embedding-ada-002
KB_SEARCH_MODEL=gpt-4
KB_CACHE_TTL=300
KB_MAX_SEARCH_RESULTS=50

# Optional: Advanced Search (Elasticsearch)
ELASTICSEARCH_URL=https://your-elasticsearch-cluster
ELASTICSEARCH_API_KEY=your-es-key

# Optional: Analytics
ANALYTICS_API_KEY=your-analytics-key

# Performance
KB_ENABLE_CACHING=true
KB_REDIS_URL=redis://localhost:6379
```

### 3. Database Schema Setup

Run the knowledge base migration:

```sql
-- Run this SQL in your Supabase SQL editor or via CLI
-- This creates all necessary tables and indexes

-- Knowledge Base Tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Articles table
CREATE TABLE kb_articles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced
  read_time INTEGER DEFAULT 0, -- in seconds
  target_audience TEXT[] DEFAULT '{}', -- ['supplier', 'couple']
  supplier_types TEXT[] DEFAULT '{}', -- ['photographer', 'venue', 'florist', etc.]
  
  -- SEO and metadata
  meta_title VARCHAR(200),
  meta_description TEXT,
  keywords TEXT[],
  
  -- Author information
  author_name VARCHAR(200),
  author_role VARCHAR(200),
  author_avatar TEXT,
  author_bio TEXT,
  
  -- Versioning and status
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  version INTEGER DEFAULT 1,
  published_at TIMESTAMP,
  
  -- Metrics and engagement
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- AI and search
  embedding VECTOR(1536), -- OpenAI ada-002 embedding size
  embedding_updated_at TIMESTAMP,
  search_vector TSVECTOR,
  
  -- Multi-tenant support
  organization_id UUID REFERENCES organizations(id),
  tenant_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Article categories
CREATE TABLE kb_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  parent_id UUID REFERENCES kb_categories(id),
  display_order INTEGER DEFAULT 0,
  target_audience TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Article feedback and ratings
CREATE TABLE kb_article_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Feedback data
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  feedback_text TEXT,
  category VARCHAR(50), -- content-quality, accuracy, relevance
  
  -- User context
  user_type VARCHAR(20), -- supplier, couple
  supplier_type VARCHAR(50),
  planning_stage VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Search analytics
CREATE TABLE kb_search_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Search context
  user_type VARCHAR(20),
  supplier_type VARCHAR(50),
  planning_stage VARCHAR(50),
  location VARCHAR(200),
  
  -- Search results
  result_count INTEGER,
  search_time_ms INTEGER,
  selected_article_id UUID REFERENCES kb_articles(id),
  selection_position INTEGER, -- Which result was clicked (1-based)
  
  -- Session data
  session_id VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Article views and engagement
CREATE TABLE kb_article_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- View context
  user_type VARCHAR(20),
  supplier_type VARCHAR(50),
  source VARCHAR(50), -- search, related, direct, etc.
  
  -- Engagement metrics
  time_spent INTEGER DEFAULT 0, -- seconds
  scroll_percentage INTEGER DEFAULT 0,
  completed_reading BOOLEAN DEFAULT false,
  
  -- Device and location
  device_type VARCHAR(20), -- mobile, desktop, tablet
  location VARCHAR(200),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge base settings and configuration
CREATE TABLE kb_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  
  -- AI Configuration
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  search_model VARCHAR(100) DEFAULT 'gpt-4',
  enable_ai_search BOOLEAN DEFAULT true,
  
  -- Search Configuration
  max_results INTEGER DEFAULT 20,
  search_timeout_ms INTEGER DEFAULT 5000,
  enable_fuzzy_search BOOLEAN DEFAULT true,
  enable_voice_search BOOLEAN DEFAULT false,
  
  -- Content Configuration
  auto_categorize BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT true,
  enable_versioning BOOLEAN DEFAULT false,
  
  -- Analytics
  track_searches BOOLEAN DEFAULT true,
  track_views BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 365,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
CREATE INDEX idx_kb_articles_status ON kb_articles(status);
CREATE INDEX idx_kb_articles_target_audience ON kb_articles USING GIN(target_audience);
CREATE INDEX idx_kb_articles_supplier_types ON kb_articles USING GIN(supplier_types);
CREATE INDEX idx_kb_articles_tags ON kb_articles USING GIN(tags);
CREATE INDEX idx_kb_articles_organization ON kb_articles(organization_id);
CREATE INDEX idx_kb_articles_published ON kb_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_kb_articles_embedding ON kb_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_kb_articles_search_vector ON kb_articles USING gin(search_vector);

CREATE INDEX idx_kb_search_analytics_query ON kb_search_analytics(query);
CREATE INDEX idx_kb_search_analytics_user ON kb_search_analytics(user_id, created_at DESC);
CREATE INDEX idx_kb_search_analytics_org ON kb_search_analytics(organization_id, created_at DESC);

CREATE INDEX idx_kb_article_views_article ON kb_article_views(article_id, created_at DESC);
CREATE INDEX idx_kb_article_views_user ON kb_article_views(user_id, created_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_search_vector
  BEFORE INSERT OR UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION update_article_search_vector();
```

### 4. Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_settings ENABLE ROW LEVEL SECURITY;

-- Articles access policies
CREATE POLICY "Public articles are viewable by everyone" ON kb_articles
  FOR SELECT USING (status = 'published');

CREATE POLICY "Organization members can view their articles" ON kb_articles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = kb_articles.organization_id
    )
  );

CREATE POLICY "Editors can create articles" ON kb_articles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = kb_articles.organization_id 
      AND role IN ('admin', 'editor')
    )
  );

-- Feedback policies
CREATE POLICY "Users can submit feedback" ON kb_article_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organization members can view feedback" ON kb_article_feedback
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = kb_article_feedback.organization_id
    )
  );

-- Analytics policies (admin only)
CREATE POLICY "Admins can view search analytics" ON kb_search_analytics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = kb_search_analytics.organization_id 
      AND role = 'admin'
    )
  );
```

## API Integration Setup

### 1. Create API Client

```typescript
// lib/knowledge-base/api-client.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export class KnowledgeBaseAPI {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    organization: process.env.OPENAI_ORGANIZATION_ID
  });

  async searchArticles(params: SearchParams): Promise<SearchResults> {
    const {
      query,
      userType,
      supplierType,
      organizationId,
      limit = 20,
      offset = 0,
      filters = {}
    } = params;

    // Generate embedding for semantic search
    const embedding = await this.generateEmbedding(query);
    
    // Build query with filters
    let dbQuery = this.supabase
      .from('kb_articles')
      .select(`
        id, title, summary, category, tags, difficulty, read_time,
        rating, helpful_count, view_count, published_at,
        author_name, author_role, author_avatar
      `)
      .eq('status', 'published')
      .range(offset, offset + limit - 1);

    // Apply user-specific filters
    if (userType === 'supplier' && supplierType) {
      dbQuery = dbQuery.contains('target_audience', [userType]);
      dbQuery = dbQuery.contains('supplier_types', [supplierType]);
    } else if (userType === 'couple') {
      dbQuery = dbQuery.contains('target_audience', [userType]);
    }

    // Organization-specific content
    if (organizationId) {
      dbQuery = dbQuery.eq('organization_id', organizationId);
    }

    // Category filter
    if (filters.category) {
      dbQuery = dbQuery.eq('category', filters.category);
    }

    // Execute semantic search using embedding similarity
    const { data: articles, error } = await dbQuery
      .order('embedding <-> ' + `'[${embedding.join(',')}]'::vector`, { ascending: true });

    if (error) throw new Error(`Search failed: ${error.message}`);

    // Track search analytics
    await this.trackSearch(params, articles?.length || 0);

    return {
      articles: articles || [],
      total: articles?.length || 0,
      searchTime: Date.now() - startTime,
      suggestions: await this.generateSuggestions(query, userType)
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
      encoding_format: 'float'
    });
    
    return response.data[0].embedding;
  }

  private async trackSearch(params: SearchParams, resultCount: number): Promise<void> {
    await this.supabase
      .from('kb_search_analytics')
      .insert({
        query: params.query,
        user_type: params.userType,
        supplier_type: params.supplierType,
        organization_id: params.organizationId,
        result_count: resultCount,
        search_time_ms: Date.now() - params.startTime,
        session_id: params.sessionId
      });
  }
}
```

### 2. Create Next.js API Routes

```typescript
// pages/api/knowledge-base/search.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { KnowledgeBaseAPI } from '@/lib/knowledge-base/api-client';
import { authenticateUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request
    const { query, userType, supplierType, filters = {} } = req.body;
    if (!query || !userType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Perform search
    const kb = new KnowledgeBaseAPI();
    const results = await kb.searchArticles({
      query,
      userType,
      supplierType,
      organizationId: user.organizationId,
      filters,
      userId: user.id,
      sessionId: req.headers['x-session-id'] as string
    });

    // Return results
    res.status(200).json(results);
    
  } catch (error) {
    console.error('Knowledge base search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

```typescript
// pages/api/knowledge-base/articles/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { KnowledgeBaseAPI } from '@/lib/knowledge-base/api-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    try {
      const kb = new KnowledgeBaseAPI();
      const article = await kb.getArticle(id as string, {
        includeMetrics: req.query.includeMetrics === 'true',
        format: req.query.format as 'full' | 'summary' | undefined
      });
      
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.status(200).json({ article });
      
    } catch (error) {
      console.error('Article fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

## Frontend Integration

### 1. React Hook for Knowledge Base

```typescript
// hooks/useKnowledgeBase.ts
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface UseKnowledgeBaseOptions {
  userType: 'supplier' | 'couple';
  supplierType?: string;
  organizationId?: string;
}

export function useKnowledgeBase(options: UseKnowledgeBaseOptions) {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge-base/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`,
          'X-Session-ID': generateSessionId()
        },
        body: JSON.stringify({
          ...params,
          ...options
        })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [options, user]);

  const getArticle = useCallback(async (articleId: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/articles/${articleId}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status}`);
      }
      
      const { article } = await response.json();
      return article;
      
    } catch (err) {
      console.error('Error fetching article:', err);
      throw err;
    }
  }, [user]);

  return {
    search,
    getArticle,
    results,
    loading,
    error,
    clearResults: () => setResults(null),
    clearError: () => setError(null)
  };
}

function generateSessionId(): string {
  return `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 2. Component Integration

```tsx
// components/KnowledgeBaseSearch.tsx
import { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useAuth } from '@/hooks/useAuth';

interface KnowledgeBaseSearchProps {
  userType: 'supplier' | 'couple';
  supplierType?: string;
  className?: string;
}

export function KnowledgeBaseSearch({ userType, supplierType, className }: KnowledgeBaseSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  
  const { search, results, loading, error } = useKnowledgeBase({
    userType,
    supplierType,
    organizationId: user?.organizationId
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      await search({
        query: query.trim(),
        limit: 20
      });
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  return (
    <div className={`knowledge-base-search ${className || ''}`}>
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for wedding help..."
            className="search-input"
            disabled={loading}
            aria-label="Search knowledge base"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="search-button"
            aria-label="Search"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {results && (
        <div className="search-results">
          <div className="results-header">
            <h3>
              {results.total} result{results.total !== 1 ? 's' : ''} 
              {results.searchTime && ` (${results.searchTime}ms)`}
            </h3>
          </div>
          
          <div className="articles-list">
            {results.articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                userType={userType}
              />
            ))}
          </div>
          
          {results.suggestions && results.suggestions.length > 0 && (
            <div className="suggestions">
              <h4>Related searches:</h4>
              <div className="suggestion-tags">
                {results.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="suggestion-tag"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Performance Optimization

### 1. Caching Setup

```typescript
// lib/knowledge-base/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.KB_REDIS_URL);

export class KnowledgeBaseCache {
  private static TTL = {
    SEARCH_RESULTS: 300, // 5 minutes
    ARTICLES: 3600,      // 1 hour
    EMBEDDINGS: 86400,   // 24 hours
    SUGGESTIONS: 1800    // 30 minutes
  };

  static async cacheSearchResults(key: string, results: SearchResults): Promise<void> {
    await redis.setex(
      `kb:search:${key}`,
      this.TTL.SEARCH_RESULTS,
      JSON.stringify(results)
    );
  }

  static async getCachedSearchResults(key: string): Promise<SearchResults | null> {
    const cached = await redis.get(`kb:search:${key}`);
    return cached ? JSON.parse(cached) : null;
  }

  static async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const key = this.generateEmbeddingKey(text);
    await redis.setex(
      `kb:embedding:${key}`,
      this.TTL.EMBEDDINGS,
      JSON.stringify(embedding)
    );
  }

  static async getCachedEmbedding(text: string): Promise<number[] | null> {
    const key = this.generateEmbeddingKey(text);
    const cached = await redis.get(`kb:embedding:${key}`);
    return cached ? JSON.parse(cached) : null;
  }

  private static generateEmbeddingKey(text: string): string {
    return require('crypto').createHash('sha256').update(text).digest('hex');
  }
}
```

### 2. Database Query Optimization

```typescript
// lib/knowledge-base/optimizations.ts
export class QueryOptimizer {
  static async preloadPopularContent(): Promise<void> {
    // Cache frequently accessed articles
    const popularArticles = await supabase
      .from('kb_articles')
      .select('*')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(50);

    // Cache in Redis
    if (popularArticles.data) {
      for (const article of popularArticles.data) {
        await redis.setex(
          `kb:article:${article.id}`,
          3600,
          JSON.stringify(article)
        );
      }
    }
  }

  static async warmupEmbeddings(): Promise<void> {
    // Pre-generate embeddings for common queries
    const commonQueries = [
      'wedding pricing',
      'vendor coordination',
      'client communication',
      'photography tips',
      'venue management'
    ];

    for (const query of commonQueries) {
      const embedding = await generateEmbedding(query);
      await KnowledgeBaseCache.cacheEmbedding(query, embedding);
    }
  }
}
```

## Security Configuration

### 1. API Rate Limiting

```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const knowledgeBaseRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Different limits based on endpoint
    if (req.url?.includes('/search')) return 100;
    if (req.url?.includes('/articles')) return 500;
    if (req.url?.includes('/feedback')) return 10;
    return 50;
  },
  message: {
    error: 'Too many requests',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### 2. Input Validation

```typescript
// lib/knowledge-base/validation.ts
import { z } from 'zod';

export const searchParamsSchema = z.object({
  query: z.string().min(1).max(500),
  userType: z.enum(['supplier', 'couple']),
  supplierType: z.enum(['photographer', 'venue', 'florist', 'caterer', 'coordinator']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  filters: z.object({
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    readTime: z.number().positive().optional()
  }).default({})
});

export const feedbackSchema = z.object({
  articleId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  helpful: z.boolean().optional(),
  feedback: z.string().max(1000).optional(),
  category: z.enum(['content-quality', 'accuracy', 'relevance']).optional()
});

export function validateSearchParams(data: unknown) {
  return searchParamsSchema.parse(data);
}

export function validateFeedback(data: unknown) {
  return feedbackSchema.parse(data);
}
```

## Deployment Configuration

### 1. Docker Configuration

```dockerfile
# Dockerfile for Knowledge Base Service
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/knowledge-base || exit 1

EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Production Environment Variables

```bash
# Production .env
NODE_ENV=production

# Database
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key

# OpenAI
OPENAI_API_KEY=your-prod-openai-key

# Performance
KB_REDIS_URL=redis://prod-redis:6379
KB_ENABLE_CACHING=true
KB_CACHE_TTL=300

# Monitoring
KB_LOG_LEVEL=info
KB_METRICS_ENABLED=true
SENTRY_DSN=your-sentry-dsn

# Security
KB_RATE_LIMIT_ENABLED=true
KB_CORS_ORIGIN=https://your-domain.com
```

### 3. Monitoring and Analytics

```typescript
// lib/knowledge-base/monitoring.ts
import { createClient } from '@supabase/supabase-js';

export class KnowledgeBaseMonitoring {
  private static async trackMetrics(event: string, data: any): Promise<void> {
    // Send to your analytics service (Mixpanel, Amplitude, etc.)
    await analytics.track(event, {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'knowledge-base'
    });
  }

  static async trackSearch(params: {
    query: string;
    userType: string;
    resultCount: number;
    searchTime: number;
    userId?: string;
  }): Promise<void> {
    await this.trackMetrics('kb_search_performed', params);
  }

  static async trackArticleView(params: {
    articleId: string;
    userType: string;
    source: string;
    userId?: string;
  }): Promise<void> {
    await this.trackMetrics('kb_article_viewed', params);
  }

  static async trackFeedback(params: {
    articleId: string;
    rating: number;
    helpful?: boolean;
    userId?: string;
  }): Promise<void> {
    await this.trackMetrics('kb_feedback_submitted', params);
  }
}
```

## Testing Integration

### 1. API Testing

```typescript
// __tests__/knowledge-base/api.test.ts
import { KnowledgeBaseAPI } from '@/lib/knowledge-base/api-client';
import { setupTestDatabase, cleanupTestDatabase } from '@/test-utils/database';

describe('Knowledge Base API', () => {
  let api: KnowledgeBaseAPI;

  beforeAll(async () => {
    await setupTestDatabase();
    api = new KnowledgeBaseAPI();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('searchArticles', () => {
    it('should return relevant articles for supplier queries', async () => {
      const results = await api.searchArticles({
        query: 'wedding photography pricing',
        userType: 'supplier',
        supplierType: 'photographer',
        limit: 10
      });

      expect(results.articles).toHaveLength(expect.any(Number));
      expect(results.total).toBeGreaterThanOrEqual(0);
      expect(results.searchTime).toBeGreaterThan(0);
      
      // Verify article structure
      if (results.articles.length > 0) {
        const article = results.articles[0];
        expect(article).toHaveProperty('id');
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('category');
      }
    });

    it('should handle search errors gracefully', async () => {
      // Mock OpenAI API failure
      jest.spyOn(api as any, 'generateEmbedding')
        .mockRejectedValueOnce(new Error('OpenAI API error'));

      await expect(api.searchArticles({
        query: 'test query',
        userType: 'supplier',
        supplierType: 'photographer'
      })).rejects.toThrow('Search failed');
    });
  });
});
```

### 2. Load Testing

```javascript
// k6-scripts/knowledge-base-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 200 },  // Peak load
    { duration: '2m', target: 200 },  // Hold peak
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failures
  }
};

const BASE_URL = 'https://your-app.com/api/knowledge-base';
const authToken = 'your-test-token';

export default function () {
  const searchQueries = [
    'wedding photography pricing',
    'venue coordination tips',
    'client communication',
    'seasonal flower guide',
    'catering menu planning'
  ];

  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  const response = http.post(`${BASE_URL}/search`, JSON.stringify({
    query,
    userType: 'supplier',
    supplierType: 'photographer',
    limit: 20
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  check(response, {
    'search returns 200': (r) => r.status === 200,
    'search completes in <500ms': (r) => r.timings.duration < 500,
    'returns articles array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.articles);
    },
  });

  sleep(1); // Wait 1 second between requests
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Slow Search Performance**
   - Check database indexes are created
   - Verify embedding cache is working
   - Monitor OpenAI API latency
   - Consider implementing search result pagination

2. **High Memory Usage**
   - Implement proper connection pooling
   - Clear unused embeddings cache
   - Monitor article content size
   - Use streaming for large result sets

3. **AI Service Rate Limits**
   - Implement exponential backoff
   - Use embedding cache effectively
   - Consider fallback to text search
   - Monitor usage quotas

4. **Database Connection Issues**
   - Check connection string format
   - Verify SSL certificates
   - Monitor connection pool usage
   - Implement health checks

### Monitoring Commands

```bash
# Check API health
curl -f https://your-app.com/api/health/knowledge-base

# Monitor database queries
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%knowledge_base%';

# Check Redis cache status
redis-cli info memory

# Monitor embedding cache hit rate
redis-cli --latency-history -i 1
```

## Support and Resources

- **Documentation**: https://docs.wedsync.com/knowledge-base
- **API Reference**: https://api-docs.wedsync.com/knowledge-base
- **GitHub Repository**: https://github.com/wedsync/knowledge-base
- **Support Email**: kb-support@wedsync.com
- **Community Forum**: https://community.wedsync.com/knowledge-base

For complex integration questions or custom implementation needs, contact our integration team at integrations@wedsync.com.