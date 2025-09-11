# 01-knowledge-base.md

## What to Build

Structured knowledge management system for chatbot training.

## Key Technical Requirements

### Knowledge Hierarchy

```
interface KnowledgeBase {
  sources: {
    faqs: { priority: 1, weight: 1.0 },
    articles: { priority: 2, weight: 0.8 },
    forms: { priority: 3, weight: 0.6 },
    website: { priority: 4, weight: 0.4 }
  }
}
```

### Vector Search Implementation

```
class KnowledgeSearch {
  async indexContent(content: string, metadata: any) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content
    })
    
    await supabase.from('knowledge_base').insert({
      content,
      embedding: [embedding.data](http://embedding.data)[0].embedding,
      metadata,
      source_type: metadata.type,
      source_id: [metadata.id](http://metadata.id),
      vendor_id: metadata.vendorId
    })
  }
  
  async search(query: string, vendorId: string): Promise<SearchResult[]> {
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    })
    
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: [queryEmbedding.data](http://queryEmbedding.data)[0].embedding,
      vendor_id: vendorId,
      match_threshold: 0.8,
      match_count: 5
    })
    
    return data || []
  }
}
```

### Content Chunking Strategy

```
class ContentChunker {
  splitIntoChunks(content: string, maxTokens: number = 500): string[] {
    const sentences = content.split(/[.!?]+/)
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const sentence of sentences) {
      const tokenCount = this.estimateTokens(currentChunk + sentence)
      
      if (tokenCount > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }
}
```

### Knowledge Source Prioritization

```
class SourcePrioritizer {
  rankResults(results: SearchResult[]): SearchResult[] {
    return results
      .map(result => ({
        ...result,
        finalScore: result.similarity * this.getSourceWeight(result.source_type)
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
  }
  
  private getSourceWeight(sourceType: string): number {
    const weights = {
      'faq': 1.0,        // Highest priority - curated content
      'article': 0.8,    // High priority - detailed explanations
      'form': 0.6,       // Medium priority - process information
      'website': 0.4     // Lower priority - general content
    }
    
    return weights[sourceType] || 0.2
  }
}
```

### API Endpoints

```
// Index new content
POST /api/chatbot/knowledge/index
{
  content: string,
  sourceType: string,
  sourceId: string,
  vendorId: string
}

// Search knowledge base
GET /api/chatbot/knowledge/search?q=:query&vendor_id=:id

// Update existing knowledge
PUT /api/chatbot/knowledge/:id
{
  content: string,
  reindex?: boolean
}
```

```

```

### Content Preprocessing

```
const preprocessContent = (content: string, type: 'faq' | 'article') => {
  // Clean HTML tags
  const cleaned = content.replace(/<[^>]*>/g, '')
  
  // Split into chunks for embedding
  return type === 'faq' 
    ? [cleaned] // Keep FAQs whole
    : splitIntoChunks(cleaned, 500) // Split articles
}
```

## Critical Implementation Notes

- Re-index when content updates to maintain accuracy
- Include metadata for source attribution and confidence
- Vendor-specific knowledge isolation prevents data leaks
- Cache frequently accessed embeddings for performance

## Database Structure

```
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  source_type TEXT NOT NULL,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
```