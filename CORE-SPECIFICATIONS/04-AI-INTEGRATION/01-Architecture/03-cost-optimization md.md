# 03-cost-optimization.md

# AI Cost Optimization Implementation

## What to Build

Implement comprehensive cost optimization strategies to minimize AI API expenses while maintaining performance.

## Key Technical Requirements

### Smart Caching System

```
// src/lib/ai/cache.ts
interface CacheStrategy {
  semantic: {
    similarityThreshold: 0.85,
    ttl: 86400, // 24 hours
    maxEntries: 10000
  },
  
  exact: {
    ttl: 604800, // 7 days
    maxEntries: 50000
  }
}

export class AICache {
  private semanticCache = new Map<string, CachedResult>()
  
  async getOrGenerate<T>(
    query: string,
    generator: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Check exact match first
    const exactMatch = await this.getExact(query)
    if (exactMatch) return exactMatch
    
    // Check semantic similarity
    const similarMatch = await this.getSimilar(query, options.threshold)
    if (similarMatch && similarMatch.confidence > 0.85) {
      return similarMatch.result
    }
    
    // Generate new result
    const result = await generator()
    await [this.store](http://this.store)(query, result, options)
    return result
  }
}
```

### Batch Processing

```
// src/lib/ai/batch-processor.ts
export class BatchProcessor {
  private queue: BatchItem[] = []
  private processing = false
  
  async addToBatch(item: BatchItem): Promise<void> {
    this.queue.push(item)
    
    // Process when queue reaches optimal size
    if (this.queue.length >= 10) {
      this.processBatch()
    }
  }
  
  private async processBatch(): Promise<void> {
    if (this.processing) return
    this.processing = true
    
    const batch = this.queue.splice(0, 20) // OpenAI batch limit
    
    try {
      // Use OpenAI Batch API for 50% cost reduction
      const batchResponse = await openai.batches.create({
        input_file_id: await this.createBatchFile(batch),
        endpoint: '/v1/chat/completions',
        completion_window: '24h'
      })
      
      // Store batch ID for later retrieval
      await this.storeBatchJob([batchResponse.id](http://batchResponse.id), batch)
    } finally {
      this.processing = false
    }
  }
}
```

### Token Optimization

```
// src/lib/ai/token-optimizer.ts
export const optimizePrompt = (prompt: string): string => {
  return prompt
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim()
}

export const selectModel = (complexity: 'simple' | 'medium' | 'complex') => {
  switch (complexity) {
    case 'simple':
      return { model: 'gpt-3.5-turbo', cost: 0.001 }
    case 'medium':
      return { model: 'gpt-4o-mini', cost: 0.00015 }
    case 'complex':
      return { model: 'gpt-4', cost: 0.03 }
  }
}
```

## Critical Implementation Notes

### Cost Monitoring

```
// Track costs in real-time
interface CostTracker {
  daily: Map<string, number>
  monthly: Map<string, number>
  alerts: {
    threshold: number
    recipients: string[]
  }
}

// Database: cost_tracking table
CREATE TABLE cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  date DATE,
  feature TEXT,
  api_calls INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Budget Controls

- Set daily/monthly spending limits per supplier
- Automatic feature disabling when limits reached
- Email alerts at 80% and 95% of budget
- Circuit breakers for runaway costs

### Optimization Strategies

1. **Progressive Enhancement**: Start with rule-based systems, add AI for edge cases
2. **Model Selection**: Use smallest model that meets quality requirements
3. **Prompt Engineering**: Optimize prompts for token efficiency
4. **Response Streaming**: For real-time features, stream responses to improve UX
5. **Graceful Degradation**: Fallback to cached or simplified responses when budget exceeded