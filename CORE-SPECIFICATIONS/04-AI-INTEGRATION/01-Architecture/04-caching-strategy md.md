# 04-caching-strategy.md

# AI Caching Strategy

## What to Build

Multi-layer caching system using semantic similarity, Redis for hot data, and database storage for long-term cache with intelligent invalidation and warming strategies.

## Key Technical Requirements

### Cache Architecture

```
interface CacheLayer {
  L1: Redis // Hot cache (1-24 hours)
  L2: Supabase // Warm cache (1-90 days)
  L3: Vector // Semantic similarity cache
}

class AICache {
  async get(key: string, type: CacheType): Promise<CachedResult | null> {
    // L1: Exact match in Redis
    let result = await this.redis.get(this.buildKey(key, type))
    if (result) return JSON.parse(result)
    
    // L2: Database cache
    result = await this.db.getCached(key, type)
    if (result) {
      await this.warmL1(key, result)
      return result
    }
    
    // L3: Semantic similarity
    return await this.findSemanticallyDifferent(key, type)
  }
}
```

### Vector Similarity Caching

```
class SemanticCache {
  async findSimilar(prompt: string, threshold = 0.95) {
    const embedding = await this.generateEmbedding(prompt)
    
    const { data } = await supabase.rpc('match_ai_cache', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 5
    })
    
    return data?.[0] || null
  }
}
```

## Critical Implementation Notes

### Database Schema

```
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt_embedding vector(1536),
  result_data JSONB NOT NULL,
  model_used TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_ai_cache_type (cache_type),
  INDEX idx_ai_cache_hash (prompt_hash),
  INDEX idx_ai_cache_embedding 
    USING ivfflat (prompt_embedding vector_cosine_ops)
);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_ai_cache(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  result_data jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_[cache.id](http://cache.id),
    ai_cache.result_data,
    1 - (ai_cache.prompt_embedding <=> query_embedding) as similarity
  FROM ai_cache
  WHERE 1 - (ai_cache.prompt_embedding <=> query_embedding) > match_threshold
    AND expires_at > NOW()
  ORDER BY ai_cache.prompt_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Cache Warming Strategy

```
class CacheWarmer {
  async warmCommonRequests() {
    const commonPrompts = await this.getPopularPrompts()
    
    for (const prompt of commonPrompts) {
      if (!await this.cache.exists(prompt.key)) {
        await this.backgroundGenerate(prompt)
      }
    }
  }
  
  async precomputeSeasonalContent() {
    const season = this.getCurrentSeason()
    const templates = this.getSeasonalTemplates(season)
    
    // Pre-generate common seasonal content
    await Promise.all(
      [templates.map](http://templates.map)(t => this.generateIfNotCached(t))
    )
  }
}
```

### Cache Invalidation

```
class CacheInvalidator {
  async invalidateByPattern(pattern: string) {
    // Redis pattern-based invalidation
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
    
    // Database soft delete
    await supabase
      .from('ai_cache')
      .update({ expires_at: new Date() })
      .like('cache_key', pattern)
  }
  
  // Invalidate when supplier updates templates
  async onSupplierTemplateUpdate(supplierId: string) {
    await this.invalidateByPattern(`template:${supplierId}:*`)
  }
}
```

### Performance Monitoring

```
interface CacheMetrics {
  hitRate: number
  averageResponseTime: number
  memoryUsage: number
  evictionRate: number
}

class CacheMonitor {
  async trackCacheHit(key: string, hit: boolean) {
    await supabase.from('cache_metrics').insert({
      cache_key: key,
      cache_hit: hit,
      timestamp: new Date()
    })
  }
}
```

## TTL Configuration

```
const CACHE_TTL = {
  formGeneration: 7 * 24 * 60 * 60, // 7 days
  emailTemplates: 30 * 24 * 60 * 60, // 30 days
  faqGeneration: 90 * 24 * 60 * 60, // 90 days
  chatbotResponses: 24 * 60 * 60, // 1 day
  dynamicContent: 60 * 60 // 1 hour
}
```