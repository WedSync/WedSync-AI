# WS-247: AI Chatbot Knowledge Base - Technical Specification

## Feature Identifier
- **Feature ID**: WS-247
- **Feature Name**: AI Chatbot Knowledge Base System
- **Category**: AI Integration - Chatbot
- **Priority**: High (Revenue Analytics batch)

## User Story
As a **wedding supplier**, I want **an intelligent knowledge base system that powers AI chatbots with accurate, contextual information about my services and processes**, so that **clients can get instant, accurate answers to their questions 24/7**.

## Database Schema

### Core Tables

```sql
-- Store knowledge base content with vector embeddings
CREATE TABLE knowledge_base_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_type VARCHAR(50) NOT NULL,
  content_title VARCHAR(255) NOT NULL,
  content_text TEXT NOT NULL,
  content_summary TEXT,
  embedding vector(1536) NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'faq', 'article', 'form', 'website', 'document', 'manual'
  source_id UUID,
  source_url TEXT,
  content_category VARCHAR(100), -- 'pricing', 'process', 'timeline', 'requirements', 'policies'
  wedding_context JSONB DEFAULT '{}', -- Wedding-specific metadata
  relevance_keywords TEXT[],
  confidence_score DECIMAL(3,2) DEFAULT 0.80,
  quality_score DECIMAL(3,2),
  usage_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store knowledge chunks for large content
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_embedding vector(1536) NOT NULL,
  chunk_summary TEXT,
  token_count INTEGER,
  overlap_content TEXT, -- Content that overlaps with adjacent chunks
  chunk_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, chunk_index)
);

-- Store knowledge source configurations
CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  source_name VARCHAR(150) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_url TEXT,
  crawl_frequency VARCHAR(20) DEFAULT 'weekly', -- 'never', 'daily', 'weekly', 'monthly'
  last_crawled_at TIMESTAMPTZ,
  crawl_status VARCHAR(20) DEFAULT 'pending',
  indexing_rules JSONB DEFAULT '{}',
  extraction_patterns JSONB DEFAULT '{}',
  priority_score INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store search analytics and optimization data
CREATE TABLE knowledge_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  search_query TEXT NOT NULL,
  search_intent VARCHAR(100), -- 'pricing', 'availability', 'process', 'requirements'
  results_returned INTEGER,
  top_result_id UUID REFERENCES knowledge_base_entries(id),
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'partially_helpful'
  click_through_rate DECIMAL(3,2),
  answer_confidence DECIMAL(3,2),
  response_time_ms INTEGER,
  search_metadata JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store knowledge quality metrics
CREATE TABLE knowledge_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  accuracy_score DECIMAL(3,2),
  relevance_score DECIMAL(3,2),
  completeness_score DECIMAL(3,2),
  freshness_score DECIMAL(3,2),
  user_satisfaction_score DECIMAL(3,2),
  citation_count INTEGER DEFAULT 0,
  correction_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  quality_issues TEXT[],
  improvement_suggestions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store wedding-specific knowledge patterns
CREATE TABLE wedding_knowledge_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name VARCHAR(100) NOT NULL,
  pattern_category VARCHAR(50) NOT NULL, -- 'seasonal', 'venue_type', 'wedding_style', 'timeline'
  trigger_keywords TEXT[] NOT NULL,
  context_rules JSONB NOT NULL DEFAULT '{}',
  response_template TEXT,
  confidence_boost DECIMAL(3,2) DEFAULT 0.10,
  applicable_vendor_types TEXT[],
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store content preprocessing rules
CREATE TABLE content_preprocessing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  extraction_pattern TEXT NOT NULL, -- Regex or selector
  transformation_rules JSONB DEFAULT '{}',
  chunking_strategy VARCHAR(50) DEFAULT 'semantic', -- 'semantic', 'fixed', 'sliding'
  chunk_size INTEGER DEFAULT 500,
  chunk_overlap INTEGER DEFAULT 50,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store chatbot training data derived from knowledge base
CREATE TABLE chatbot_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  knowledge_source_id UUID REFERENCES knowledge_base_entries(id),
  context_metadata JSONB DEFAULT '{}',
  training_quality VARCHAR(20) DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'
  validation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  usage_in_training BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and vector search
CREATE INDEX idx_knowledge_entries_supplier ON knowledge_base_entries(supplier_id);
CREATE INDEX idx_knowledge_entries_source ON knowledge_base_entries(source_type, supplier_id);
CREATE INDEX idx_knowledge_entries_category ON knowledge_base_entries(content_category, supplier_id);
CREATE INDEX idx_knowledge_entries_active ON knowledge_base_entries(is_active, supplier_id);
CREATE INDEX idx_knowledge_chunks_entry ON knowledge_chunks(entry_id);
CREATE INDEX idx_search_analytics_supplier ON knowledge_search_analytics(supplier_id, created_at DESC);
CREATE INDEX idx_quality_metrics_entry ON knowledge_quality_metrics(entry_id);

-- Vector similarity search indexes (using pgvector extension)
CREATE INDEX idx_knowledge_entries_embedding ON knowledge_base_entries 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks 
  USING ivfflat (chunk_embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX idx_knowledge_entries_content_fts ON knowledge_base_entries 
  USING gin(to_tsvector('english', content_title || ' ' || content_text));
CREATE INDEX idx_knowledge_keywords_gin ON knowledge_base_entries 
  USING gin(relevance_keywords);

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  p_supplier_id UUID,
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_title TEXT,
  content_text TEXT,
  source_type TEXT,
  content_category TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kbe.id,
    kbe.content_title,
    kbe.content_text,
    kbe.source_type,
    kbe.content_category,
    1 - (kbe.embedding <=> query_embedding) as similarity
  FROM knowledge_base_entries kbe
  WHERE kbe.supplier_id = p_supplier_id 
    AND kbe.is_active = true
    AND 1 - (kbe.embedding <=> query_embedding) > match_threshold
  ORDER BY kbe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## API Endpoints

### Knowledge Base Management Endpoints

```typescript
// POST /api/chatbot/knowledge/index
interface IndexContentRequest {
  supplierId: string;
  content: {
    title: string;
    text: string;
    sourceType: 'faq' | 'article' | 'form' | 'website' | 'document' | 'manual';
    sourceId?: string;
    sourceUrl?: string;
    category?: string;
    keywords?: string[];
  };
  options?: {
    chunkingStrategy?: 'semantic' | 'fixed' | 'sliding';
    chunkSize?: number;
    forceReindex?: boolean;
  };
}

interface IndexContentResponse {
  entryId: string;
  chunksCreated: number;
  embeddingGenerated: boolean;
  qualityScore: number;
  processingTimeMs: number;
  tokenCount: number;
  warnings?: string[];
}

// GET /api/chatbot/knowledge/search
interface SearchKnowledgeRequest {
  query: string;
  supplierId: string;
  category?: string;
  sourceTypes?: string[];
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
}

interface SearchKnowledgeResponse {
  results: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
    sourceType: string;
    category?: string;
    relevanceScore: number;
    metadata?: any;
  }>;
  totalResults: number;
  searchMetrics: {
    responseTimeMs: number;
    vectorSearchTime: number;
    rerankingTime: number;
  };
  suggestions?: string[];
}

// POST /api/chatbot/knowledge/bulk-index
interface BulkIndexRequest {
  supplierId: string;
  contents: Array<{
    id: string;
    title: string;
    text: string;
    sourceType: string;
    category?: string;
    metadata?: any;
  }>;
  options?: {
    batchSize?: number;
    skipDuplicates?: boolean;
  };
}

// GET /api/chatbot/knowledge/analytics/:supplierId
interface GetKnowledgeAnalyticsResponse {
  supplierId: string;
  metrics: {
    totalEntries: number;
    totalSearches: number;
    averageRelevance: number;
    topCategories: Array<{
      category: string;
      count: number;
      averageScore: number;
    }>;
    searchPatterns: Array<{
      intent: string;
      frequency: number;
      satisfaction: number;
    }>;
  };
  qualityMetrics: {
    averageAccuracy: number;
    averageFreshness: number;
    contentGaps: string[];
  };
}

// POST /api/chatbot/knowledge/optimize
interface OptimizeKnowledgeRequest {
  supplierId: string;
  optimizationType: 'reindex' | 'quality_check' | 'gap_analysis' | 'duplicate_removal';
  options?: {
    categories?: string[];
    minQualityThreshold?: number;
  };
}

// GET /api/chatbot/knowledge/suggestions/:supplierId
interface GetKnowledgeSuggestionsResponse {
  suggestions: Array<{
    type: 'missing_content' | 'outdated_content' | 'low_quality' | 'popular_question';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    suggestedAction: string;
    relatedQueries?: string[];
  }>;
  contentGaps: Array<{
    topic: string;
    searchVolume: number;
    currentCoverage: number;
  }>;
}
```

## Frontend Components

### React Component Structure

```typescript
// components/chatbot/KnowledgeBaseManager.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';

interface KnowledgeBaseManagerProps {
  supplierId: string;
}

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({
  supplierId
}) => {
  const {
    entries,
    analytics,
    suggestions,
    isLoading,
    indexContent,
    searchKnowledge,
    optimizeKnowledge
  } = useKnowledgeBase(supplierId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await searchKnowledge({
      query: searchQuery,
      supplierId,
      includeMetadata: true
    });
    
    setSearchResults(results.results);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600';
    if (similarity >= 0.8) return 'text-blue-600';
    if (similarity >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Base Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total Entries</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics?.totalEntries || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Search Accuracy</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {Math.round((analytics?.averageRelevance || 0) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Content Quality</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round((analytics?.qualityMetrics?.averageAccuracy || 0) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Active Sources</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics?.topCategories?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="search">Search Test</TabsTrigger>
          <TabsTrigger value="content">Content Manager</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Categories */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Content Categories</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topCategories?.map((category) => (
                    <div key={category.category} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium capitalize">{category.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.count} entries
                        </p>
                      </div>
                      <Badge variant="outline">
                        {Math.round(category.averageScore * 100)}% quality
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Improvement Suggestions */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Improvement Suggestions</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions?.slice(0, 5).map((suggestion, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-3">
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.description}
                      </p>
                      <Badge 
                        variant={suggestion.priority === 'high' ? 'destructive' : 'outline'}
                        className="mt-1"
                      >
                        {suggestion.priority} priority
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Knowledge Search Testing</h3>
              <p className="text-sm text-muted-foreground">
                Test how well your knowledge base responds to questions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ask a question your clients might have..."
                    className="flex-1 p-2 border rounded-md"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Search Results:</h4>
                    {searchResults.map((result, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">{result.title}</h5>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={getSimilarityColor(result.similarity)}>
                              {Math.round(result.similarity * 100)}% match
                            </Badge>
                            <Badge variant="secondary">
                              {result.sourceType}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {result.content}
                        </p>
                        {result.category && (
                          <Badge variant="outline" className="mt-2">
                            {result.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <ContentManager supplierId={supplierId} />
        </TabsContent>

        <TabsContent value="analytics">
          <KnowledgeAnalytics analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// components/chatbot/ContentIndexer.tsx
export const ContentIndexer: React.FC<{
  supplierId: string;
  onIndexComplete?: () => void;
}> = ({ supplierId, onIndexComplete }) => {
  const [content, setContent] = useState({
    title: '',
    text: '',
    sourceType: 'faq',
    category: '',
    keywords: ''
  });
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<any>(null);

  const { indexContent } = useKnowledgeBase(supplierId);

  const handleIndex = async () => {
    setIsIndexing(true);
    try {
      const result = await indexContent({
        supplierId,
        content: {
          ...content,
          keywords: content.keywords.split(',').map(k => k.trim()).filter(Boolean)
        }
      });
      
      setIndexResult(result);
      onIndexComplete?.();
      
      // Reset form
      setContent({
        title: '',
        text: '',
        sourceType: 'faq',
        category: '',
        keywords: ''
      });
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Add Knowledge Content</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={content.title}
              onChange={(e) => setContent({...content, title: e.target.value})}
              className="w-full p-2 border rounded-md mt-1"
              placeholder="e.g., Wedding Photography Pricing"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <textarea
              value={content.text}
              onChange={(e) => setContent({...content, text: e.target.value})}
              className="w-full p-2 border rounded-md mt-1 min-h-[120px]"
              placeholder="Enter the content that will be searchable..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Source Type</label>
              <select
                value={content.sourceType}
                onChange={(e) => setContent({...content, sourceType: e.target.value})}
                className="w-full p-2 border rounded-md mt-1"
              >
                <option value="faq">FAQ</option>
                <option value="article">Article</option>
                <option value="form">Form</option>
                <option value="website">Website</option>
                <option value="document">Document</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <input
                type="text"
                value={content.category}
                onChange={(e) => setContent({...content, category: e.target.value})}
                className="w-full p-2 border rounded-md mt-1"
                placeholder="e.g., pricing, process"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Keywords (comma-separated)</label>
            <input
              type="text"
              value={content.keywords}
              onChange={(e) => setContent({...content, keywords: e.target.value})}
              className="w-full p-2 border rounded-md mt-1"
              placeholder="wedding, photography, pricing, packages"
            />
          </div>

          <Button
            onClick={handleIndex}
            disabled={!content.title || !content.text || isIndexing}
            className="w-full"
          >
            {isIndexing ? (
              <>
                <span className="animate-spin mr-2">⚡</span>
                Indexing Content...
              </>
            ) : (
              'Index Content'
            )}
          </Button>

          {indexResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800">
                Content indexed successfully!
              </p>
              <div className="text-xs text-green-700 mt-1">
                <p>Quality Score: {Math.round(indexResult.qualityScore * 100)}%</p>
                <p>Chunks Created: {indexResult.chunksCreated}</p>
                <p>Processing Time: {indexResult.processingTimeMs}ms</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

## Integration Points

### AI Service Integration

```typescript
// lib/ai/knowledge-base-manager.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export class KnowledgeBaseManager {
  private openai: OpenAI;
  private supabase: any;
  private chunker: ContentChunker;
  private prioritizer: SourcePrioritizer;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.chunker = new ContentChunker();
    this.prioritizer = new SourcePrioritizer();
  }

  async indexContent(
    supplierId: string,
    content: KnowledgeContent,
    options: IndexingOptions = {}
  ): Promise<IndexingResult> {
    const startTime = Date.now();

    try {
      // Preprocess content
      const preprocessed = this.preprocessContent(content.text, content.sourceType);
      
      // Generate chunks if needed
      const chunks = this.chunker.splitIntoChunks(
        preprocessed,
        options.chunkSize || 500
      );

      // Generate embeddings
      const embeddings = await this.generateEmbeddings(chunks);

      // Calculate quality score
      const qualityScore = await this.assessContentQuality(content);

      // Store main entry
      const { data: entry } = await this.supabase
        .from('knowledge_base_entries')
        .insert({
          supplier_id: supplierId,
          supplier_type: await this.getSupplierType(supplierId),
          content_title: content.title,
          content_text: content.text,
          content_summary: await this.generateSummary(content.text),
          embedding: embeddings[0], // Use first chunk for main entry
          source_type: content.sourceType,
          source_id: content.sourceId,
          source_url: content.sourceUrl,
          content_category: content.category,
          wedding_context: await this.extractWeddingContext(content.text),
          relevance_keywords: content.keywords || [],
          quality_score: qualityScore
        })
        .select('id')
        .single();

      // Store chunks if multiple
      if (chunks.length > 1) {
        const chunkRecords = chunks.slice(1).map((chunk, index) => ({
          entry_id: entry.id,
          chunk_index: index + 1,
          chunk_text: chunk,
          chunk_embedding: embeddings[index + 1],
          chunk_summary: this.generateChunkSummary(chunk),
          token_count: this.estimateTokens(chunk)
        }));

        await this.supabase
          .from('knowledge_chunks')
          .insert(chunkRecords);
      }

      const processingTime = Date.now() - startTime;

      return {
        entryId: entry.id,
        chunksCreated: chunks.length,
        embeddingGenerated: true,
        qualityScore,
        processingTimeMs: processingTime,
        tokenCount: this.estimateTokens(content.text),
        warnings: []
      };

    } catch (error) {
      console.error('Content indexing failed:', error);
      throw new Error(`Failed to index content: ${error.message}`);
    }
  }

  async searchKnowledge(
    query: string,
    supplierId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });

    // Search main entries
    const { data: results } = await this.supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding.data[0].embedding,
      p_supplier_id: supplierId,
      match_threshold: options.threshold || 0.8,
      match_count: options.limit || 10
    });

    // Apply source prioritization
    const prioritized = this.prioritizer.rankResults(results || []);

    // Enhance with wedding context if applicable
    const enhanced = await this.enhanceWithWeddingContext(prioritized, query);

    // Log search for analytics
    await this.logSearch(query, supplierId, enhanced);

    return enhanced;
  }

  private async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings = [];
    
    for (const chunk of chunks) {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk
      });
      embeddings.push(response.data[0].embedding);
    }
    
    return embeddings;
  }

  private async assessContentQuality(content: KnowledgeContent): Promise<number> {
    let score = 0.5; // Base score

    // Length check
    if (content.text.length > 100) score += 0.1;
    if (content.text.length > 500) score += 0.1;

    // Structure check
    if (content.text.includes('\n') || content.text.includes('.')) score += 0.1;

    // Keyword relevance
    if (content.keywords && content.keywords.length > 0) score += 0.1;

    // Wedding-specific content
    const weddingKeywords = ['wedding', 'bride', 'groom', 'ceremony', 'reception', 'venue'];
    const hasWeddingContext = weddingKeywords.some(keyword => 
      content.text.toLowerCase().includes(keyword)
    );
    if (hasWeddingContext) score += 0.1;

    return Math.min(1.0, score);
  }

  private async extractWeddingContext(content: string): Promise<any> {
    // Extract wedding-specific metadata
    const context = {
      mentionsVenue: /venue|location|church|hall/i.test(content),
      mentionsTimeline: /timeline|schedule|time|hour/i.test(content),
      mentionsBudget: /price|cost|budget|\$/i.test(content),
      mentionsGuests: /guest|attendee|people/i.test(content),
      mentionsStyle: /style|theme|aesthetic|vibe/i.test(content),
      seasonal: this.extractSeasonalReferences(content)
    };

    return context;
  }

  private extractSeasonalReferences(content: string): string[] {
    const seasons = ['spring', 'summer', 'fall', 'winter', 'autumn'];
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
                   'july', 'august', 'september', 'october', 'november', 'december'];
    
    const found = [];
    const lowerContent = content.toLowerCase();
    
    seasons.forEach(season => {
      if (lowerContent.includes(season)) found.push(season);
    });
    
    months.forEach(month => {
      if (lowerContent.includes(month)) found.push(month);
    });
    
    return found;
  }

  async optimizeKnowledgeBase(
    supplierId: string,
    optimizationType: string
  ): Promise<OptimizationResult> {
    switch (optimizationType) {
      case 'reindex':
        return this.reindexContent(supplierId);
      case 'quality_check':
        return this.performQualityCheck(supplierId);
      case 'gap_analysis':
        return this.analyzeContentGaps(supplierId);
      case 'duplicate_removal':
        return this.removeDuplicates(supplierId);
      default:
        throw new Error(`Unknown optimization type: ${optimizationType}`);
    }
  }
}

// lib/ai/content-chunker.ts
export class ContentChunker {
  splitIntoChunks(content: string, maxTokens: number = 500, strategy: string = 'semantic'): string[] {
    switch (strategy) {
      case 'semantic':
        return this.semanticChunking(content, maxTokens);
      case 'fixed':
        return this.fixedChunking(content, maxTokens);
      case 'sliding':
        return this.slidingWindowChunking(content, maxTokens);
      default:
        return this.semanticChunking(content, maxTokens);
    }
  }

  private semanticChunking(content: string, maxTokens: number): string[] {
    // Split by semantic boundaries (paragraphs, then sentences)
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
      
      for (const sentence of sentences) {
        const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + sentence.trim();
        
        if (this.estimateTokens(potentialChunk) > maxTokens && currentChunk.length > 0) {
          chunks.push(currentChunk.trim() + '.');
          currentChunk = sentence.trim();
        } else {
          currentChunk = potentialChunk;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim() + (currentChunk.endsWith('.') ? '' : '.'));
    }

    return chunks.filter(chunk => chunk.length > 10); // Filter out very short chunks
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
}
```

## Testing Requirements

### Unit Tests
- Test content chunking strategies
- Test embedding generation
- Test vector similarity search
- Test quality assessment algorithms
- Test wedding context extraction
- Test content preprocessing rules

### Integration Tests
- Test full content indexing pipeline
- Test OpenAI embeddings API integration
- Test PostgreSQL vector operations
- Test knowledge search accuracy
- Test bulk indexing operations

### E2E Tests with Playwright
```typescript
test('Knowledge base management workflow', async ({ page }) => {
  // Navigate to knowledge base
  await page.goto('/chatbot/knowledge');
  
  // Add new content
  await page.click('[data-testid="add-content"]');
  await page.fill('[data-testid="content-title"]', 'Wedding Photography Pricing');
  await page.fill('[data-testid="content-text"]', 
    'Our wedding photography packages start at $2000 and include 8 hours of coverage...'
  );
  await page.selectOption('[data-testid="source-type"]', 'faq');
  await page.fill('[data-testid="category"]', 'pricing');
  
  // Index content
  await page.click('[data-testid="index-content"]');
  await page.waitForSelector('[data-testid="indexing-success"]', { timeout: 10000 });
  
  // Test search functionality
  await page.click('[data-testid="search-tab"]');
  await page.fill('[data-testid="search-query"]', 'How much do wedding photos cost?');
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results
  await page.waitForSelector('[data-testid="search-results"]');
  
  // Verify results
  const results = await page.$$('[data-testid="search-result"]');
  expect(results.length).toBeGreaterThan(0);
  
  // Check similarity score
  const similarityScore = await page.textContent('[data-testid="similarity-score"]');
  expect(parseInt(similarityScore!)).toBeGreaterThan(80);
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Content indexing completes in < 5 seconds for standard articles
- [ ] Vector search returns results in < 500ms
- [ ] Search accuracy > 90% for domain-specific queries
- [ ] Support for 10,000+ knowledge entries per supplier
- [ ] Automatic content quality scoring
- [ ] Wedding context extraction and enhancement

### Performance Requirements
- [ ] Embedding generation: < 2 seconds per 1000 tokens
- [ ] Bulk indexing: 100 items per minute
- [ ] Search response time: < 500ms
- [ ] Database queries: < 200ms average
- [ ] Vector similarity calculations: < 100ms

### Quality Requirements
- [ ] Search relevance accuracy > 85%
- [ ] Content quality assessment accuracy > 80%
- [ ] Zero data leakage between suppliers
- [ ] Duplicate detection accuracy > 95%
- [ ] Content freshness tracking functional

## Effort Estimation

### Development Tasks
- Database schema and migrations: 12 hours
- Core knowledge base engine: 36 hours
- Content chunking and preprocessing: 20 hours
- Vector embedding integration: 16 hours
- Search and ranking algorithms: 24 hours
- Wedding context extraction: 12 hours
- Quality assessment system: 16 hours
- Frontend components and UI: 32 hours
- API endpoints: 16 hours
- Analytics and optimization tools: 20 hours
- Testing implementation: 28 hours

### Team Requirements
- Backend Developer: 130 hours
- Frontend Developer: 50 hours
- AI/ML Engineer: 40 hours
- QA Engineer: 30 hours
- DevOps: 12 hours

### Total Effort: 262 hours

## Dependencies
- OpenAI API (Embeddings API)
- PostgreSQL with pgvector extension
- Supabase for data storage
- Wedding domain knowledge
- Content preprocessing libraries

## Risk Mitigation
- **Risk**: High embedding costs for large content volumes
  - **Mitigation**: Implement chunking optimization and caching strategies
- **Risk**: Poor search relevance for wedding-specific queries
  - **Mitigation**: Wedding context enhancement and domain-specific training
- **Risk**: Performance degradation with large knowledge bases
  - **Mitigation**: Efficient indexing strategies and database optimization
- **Risk**: Content quality inconsistency
  - **Mitigation**: Automated quality scoring and validation rules