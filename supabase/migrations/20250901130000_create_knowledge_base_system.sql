-- AI Knowledge Base System Migration
-- Team B - WS-210 Implementation
-- Creates tables and functions for semantic search and content classification

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents table - stores all indexed content with embeddings
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 50000),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
    'faq', 'vendor-profile', 'service-package', 'policy', 'guide', 'pricing'
  )),
  category VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI text-embedding-ada-002 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_org_id ON knowledge_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_type ON knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_updated_at ON knowledge_documents(updated_at DESC);

-- Vector similarity search index using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding ON knowledge_documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full text search index for fallback searches
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_search ON knowledge_documents 
USING GIN (to_tsvector('english', title || ' ' || content));

-- Add RLS (Row Level Security) policies
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Organizations can only access their own knowledge documents
CREATE POLICY "Organizations can manage their knowledge documents" ON knowledge_documents
  USING (organization_id = auth.jwt() ->> 'organization_id'::text);

-- Policy: Service role can access all documents (for admin operations)
CREATE POLICY "Service role full access" ON knowledge_documents
  TO service_role
  USING (true);

-- Knowledge base search statistics table (for analytics)
CREATE TABLE IF NOT EXISTS knowledge_search_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search stats
CREATE INDEX IF NOT EXISTS idx_knowledge_search_stats_org_id ON knowledge_search_stats(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_search_stats_created_at ON knowledge_search_stats(created_at DESC);

-- RLS for search stats
ALTER TABLE knowledge_search_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their search stats" ON knowledge_search_stats
  USING (organization_id = auth.jwt() ->> 'organization_id'::text);

CREATE POLICY "Service role full access to search stats" ON knowledge_search_stats
  TO service_role
  USING (true);

-- Function: Vector similarity search with filters
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_organization_id uuid DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  title varchar(500),
  content text,
  source_type varchar(50),
  category varchar(100),
  metadata jsonb,
  similarity float,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kd.id,
    kd.organization_id,
    kd.title,
    kd.content,
    kd.source_type,
    kd.category,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) as similarity,
    kd.created_at,
    kd.updated_at
  FROM knowledge_documents kd
  WHERE 
    (filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)
    AND (filter_category IS NULL OR kd.category = filter_category)
    AND (filter_source_type IS NULL OR kd.source_type = filter_source_type)
    AND kd.embedding IS NOT NULL
    AND 1 - (kd.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Get knowledge base statistics for organization
CREATE OR REPLACE FUNCTION get_knowledge_base_stats(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  total_docs int;
  categories_data jsonb;
  source_types_data jsonb;
  last_update timestamptz;
BEGIN
  -- Get total document count
  SELECT COUNT(*) INTO total_docs
  FROM knowledge_documents 
  WHERE organization_id = org_id;
  
  -- Get category distribution
  SELECT jsonb_agg(
    jsonb_build_object(
      'category', category,
      'count', doc_count
    )
  ) INTO categories_data
  FROM (
    SELECT category, COUNT(*) as doc_count
    FROM knowledge_documents 
    WHERE organization_id = org_id
    GROUP BY category
    ORDER BY doc_count DESC
  ) cat_stats;
  
  -- Get source type distribution
  SELECT jsonb_agg(
    jsonb_build_object(
      'source_type', source_type,
      'count', doc_count
    )
  ) INTO source_types_data
  FROM (
    SELECT source_type, COUNT(*) as doc_count
    FROM knowledge_documents 
    WHERE organization_id = org_id
    GROUP BY source_type
    ORDER BY doc_count DESC
  ) source_stats;
  
  -- Get last update timestamp
  SELECT MAX(updated_at) INTO last_update
  FROM knowledge_documents 
  WHERE organization_id = org_id;
  
  -- Build result JSON
  result := jsonb_build_object(
    'total_documents', total_docs,
    'categories', COALESCE(categories_data, '[]'::jsonb),
    'source_types', COALESCE(source_types_data, '[]'::jsonb),
    'last_updated', last_update
  );
  
  RETURN result;
END;
$$;

-- Function: Get storage statistics for knowledge base
CREATE OR REPLACE FUNCTION get_knowledge_base_storage_stats(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  total_size bigint;
  avg_doc_size bigint;
  embedding_size bigint;
BEGIN
  -- Calculate content storage size (approximate)
  SELECT 
    SUM(octet_length(title) + octet_length(content)) as total_content_size,
    AVG(octet_length(title) + octet_length(content)) as avg_content_size,
    COUNT(*) * 1536 * 4 as approx_embedding_size -- 1536 dimensions * 4 bytes per float
  INTO total_size, avg_doc_size, embedding_size
  FROM knowledge_documents 
  WHERE organization_id = org_id;
  
  result := jsonb_build_object(
    'total_content_bytes', COALESCE(total_size, 0),
    'average_document_bytes', COALESCE(avg_doc_size, 0),
    'embedding_storage_bytes', COALESCE(embedding_size, 0),
    'total_storage_bytes', COALESCE(total_size + embedding_size, 0)
  );
  
  RETURN result;
END;
$$;

-- Function: Clean up old search statistics (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_search_stats(days_to_keep int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM knowledge_search_stats 
  WHERE created_at < NOW() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Trigger: Update updated_at timestamp on knowledge_documents changes
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_knowledge_documents_updated_at ON knowledge_documents;
CREATE TRIGGER trigger_update_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_documents_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_composite_search ON knowledge_documents(organization_id, category, source_type);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_documents TO authenticated;
GRANT SELECT, INSERT ON knowledge_search_stats TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for API operations)
GRANT ALL ON knowledge_documents TO service_role;
GRANT ALL ON knowledge_search_stats TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Add helpful comments
COMMENT ON TABLE knowledge_documents IS 'Stores AI-powered knowledge base documents with vector embeddings for semantic search';
COMMENT ON COLUMN knowledge_documents.embedding IS 'OpenAI text-embedding-ada-002 vector (1536 dimensions) for semantic similarity search';
COMMENT ON COLUMN knowledge_documents.category IS 'AI-classified content category for wedding industry organization';
COMMENT ON COLUMN knowledge_documents.metadata IS 'Additional structured data for advanced filtering and organization';

COMMENT ON TABLE knowledge_search_stats IS 'Analytics data for knowledge base search performance and usage patterns';

COMMENT ON FUNCTION match_documents IS 'Performs vector similarity search with cosine distance, supports category and source type filtering';
COMMENT ON FUNCTION get_knowledge_base_stats IS 'Returns comprehensive statistics about an organization knowledge base including category distribution';
COMMENT ON FUNCTION get_knowledge_base_storage_stats IS 'Calculates storage usage statistics for knowledge base content and embeddings';

-- Create sample wedding industry categories (can be used for validation)
INSERT INTO knowledge_documents (
  organization_id,
  title,
  content,
  source_type,
  category,
  metadata
) VALUES 
-- Sample system documentation (replace with actual org UUID in production)
(
  '00000000-0000-0000-0000-000000000000',
  'Wedding Photography Package Pricing Guide',
  'Our wedding photography packages are designed to capture every precious moment of your special day. Basic Package ($1,500): Includes 6 hours of coverage, 300+ edited photos, online gallery. Standard Package ($2,500): Includes 8 hours coverage, engagement session, 500+ photos, print release. Premium Package ($3,500): Full day coverage, engagement session, second photographer, 800+ photos, wedding album. All packages include professional editing, high-resolution digital files, and secure online delivery.',
  'pricing',
  'photography-services',
  '{"sample_data": true, "package_count": 3, "price_range": "1500-3500"}'
) ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'AI Knowledge Base System migration completed successfully!';
  RAISE NOTICE 'Created tables: knowledge_documents, knowledge_search_stats';
  RAISE NOTICE 'Created functions: match_documents, get_knowledge_base_stats, get_knowledge_base_storage_stats, cleanup_old_search_stats';
  RAISE NOTICE 'Enabled pgvector extension for semantic search';
  RAISE NOTICE 'Applied Row Level Security policies';
END $$;