/**
 * AI Knowledge Base Engine - Core orchestrator for semantic search and content classification
 * Team B - WS-210 Implementation
 */

import { OpenAI } from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VectorSearchService } from './vector-search-service';
import { ContentClassifier } from './content-classifier';
import { logger } from '../logger';
import { z } from 'zod';

// Types and validation schemas
export const KnowledgeDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string().min(10).max(50000),
  source_type: z.enum([
    'faq',
    'vendor-profile',
    'service-package',
    'policy',
    'guide',
    'pricing',
  ]),
  metadata: z.record(z.any()).optional(),
  category: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type KnowledgeDocument = z.infer<typeof KnowledgeDocumentSchema>;

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  organization_id: z.string().uuid(),
  category_filter: z.string().optional(),
  source_type_filter: z
    .enum([
      'faq',
      'vendor-profile',
      'service-package',
      'policy',
      'guide',
      'pricing',
    ])
    .optional(),
  limit: z.number().min(1).max(50).default(10),
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  include_metadata: z.boolean().default(false),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface SearchResult {
  document: KnowledgeDocument;
  similarity_score: number;
  relevance_reason?: string;
}

export interface IndexingResult {
  success: boolean;
  document_id: string;
  category: string;
  embedding_created: boolean;
  error?: string;
}

/**
 * Main AI Knowledge Base Engine
 * Orchestrates vector search, content classification, and intelligent indexing
 */
export class KnowledgeBaseEngine {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private vectorSearchService: VectorSearchService;
  private contentClassifier: ContentClassifier;
  private readonly tableName = 'knowledge_documents';

  constructor(supabaseUrl: string, supabaseKey: string, openaiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.vectorSearchService = new VectorSearchService(this.openai);
    this.contentClassifier = new ContentClassifier(this.openai);

    logger.info('KnowledgeBaseEngine initialized with AI services');
  }

  /**
   * Index a new document with AI classification and embedding generation
   */
  async indexDocument(
    document: Omit<KnowledgeDocument, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<IndexingResult> {
    try {
      // Validate input
      const validatedDoc = KnowledgeDocumentSchema.omit({
        id: true,
        created_at: true,
        updated_at: true,
      }).parse(document);

      logger.info(
        `Starting document indexing for organization: ${validatedDoc.organization_id}`,
      );

      // Step 1: Auto-classify content if category not provided
      let finalCategory = validatedDoc.category;
      if (!finalCategory) {
        finalCategory = await this.contentClassifier.classifyWeddingContent(
          validatedDoc.title,
          validatedDoc.content,
          validatedDoc.source_type,
        );
        logger.info(`Auto-classified document as category: ${finalCategory}`);
      }

      // Step 2: Generate vector embedding
      const embedding = await this.vectorSearchService.generateEmbedding(
        `${validatedDoc.title}\n\n${validatedDoc.content}`,
      );

      // Step 3: Store in database with RLS
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert([
          {
            ...validatedDoc,
            category: finalCategory,
            embedding: embedding,
          },
        ])
        .select('id')
        .single();

      if (error) {
        logger.error('Database insert failed:', error);
        throw new Error(`Database insert failed: ${error.message}`);
      }

      const result: IndexingResult = {
        success: true,
        document_id: data.id,
        category: finalCategory,
        embedding_created: true,
      };

      logger.info(
        `Successfully indexed document ${data.id} in category: ${finalCategory}`,
      );
      return result;
    } catch (error) {
      logger.error('Document indexing failed:', error);
      return {
        success: false,
        document_id: '',
        category: '',
        embedding_created: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Perform semantic search across the knowledge base
   */
  async search(searchQuery: SearchQuery): Promise<SearchResult[]> {
    try {
      // Validate search query
      const validatedQuery = SearchQuerySchema.parse(searchQuery);

      logger.info(
        `Performing semantic search for organization: ${validatedQuery.organization_id}`,
      );

      // Step 1: Generate query embedding
      const queryEmbedding = await this.vectorSearchService.generateEmbedding(
        validatedQuery.query,
      );

      // Step 2: Build search query with filters
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('organization_id', validatedQuery.organization_id);

      // Apply filters
      if (validatedQuery.category_filter) {
        query = query.eq('category', validatedQuery.category_filter);
      }

      if (validatedQuery.source_type_filter) {
        query = query.eq('source_type', validatedQuery.source_type_filter);
      }

      // Step 3: Perform vector similarity search using pgvector
      const { data, error } = await query.rpc('match_documents', {
        query_embedding: queryEmbedding,
        similarity_threshold: validatedQuery.similarity_threshold,
        match_count: validatedQuery.limit,
      });

      if (error) {
        logger.error('Vector search failed:', error);
        throw new Error(`Vector search failed: ${error.message}`);
      }

      // Step 4: Process results and add relevance reasoning
      const results: SearchResult[] = [];

      for (const doc of data || []) {
        const relevanceReason = await this.generateRelevanceReason(
          validatedQuery.query,
          doc.title,
          doc.content,
          doc.category,
        );

        results.push({
          document: {
            ...doc,
            // Remove embedding from response unless requested
            embedding: validatedQuery.include_metadata
              ? doc.embedding
              : undefined,
          },
          similarity_score: doc.similarity || 0,
          relevance_reason: relevanceReason,
        });
      }

      logger.info(`Found ${results.length} relevant documents`);
      return results;
    } catch (error) {
      logger.error('Search operation failed:', error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an existing document's content and re-index
   */
  async updateDocument(
    documentId: string,
    updates: Partial<KnowledgeDocument>,
  ): Promise<IndexingResult> {
    try {
      logger.info(`Updating document: ${documentId}`);

      // If content or title changed, regenerate embedding
      let newEmbedding;
      if (updates.title || updates.content) {
        const { data: existingDoc } = await this.supabase
          .from(this.tableName)
          .select('title, content')
          .eq('id', documentId)
          .single();

        const updatedTitle = updates.title || existingDoc?.title || '';
        const updatedContent = updates.content || existingDoc?.content || '';

        newEmbedding = await this.vectorSearchService.generateEmbedding(
          `${updatedTitle}\n\n${updatedContent}`,
        );
      }

      // Re-classify if content changed
      let newCategory = updates.category;
      if ((updates.title || updates.content) && !newCategory) {
        const { data: existingDoc } = await this.supabase
          .from(this.tableName)
          .select('title, content, source_type')
          .eq('id', documentId)
          .single();

        newCategory = await this.contentClassifier.classifyWeddingContent(
          updates.title || existingDoc?.title || '',
          updates.content || existingDoc?.content || '',
          updates.source_type || existingDoc?.source_type || 'guide',
        );
      }

      const updateData = {
        ...updates,
        ...(newEmbedding && { embedding: newEmbedding }),
        ...(newCategory && { category: newCategory }),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', documentId);

      if (error) {
        logger.error('Document update failed:', error);
        throw new Error(`Update failed: ${error.message}`);
      }

      logger.info(`Successfully updated document: ${documentId}`);
      return {
        success: true,
        document_id: documentId,
        category: newCategory || updates.category || '',
        embedding_created: !!newEmbedding,
      };
    } catch (error) {
      logger.error('Document update failed:', error);
      return {
        success: false,
        document_id: documentId,
        category: '',
        embedding_created: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a document from the knowledge base
   */
  async deleteDocument(
    documentId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', documentId)
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Document deletion failed:', error);
        throw new Error(`Deletion failed: ${error.message}`);
      }

      logger.info(`Successfully deleted document: ${documentId}`);
      return true;
    } catch (error) {
      logger.error('Document deletion failed:', error);
      return false;
    }
  }

  /**
   * Get documents by category for browsing
   */
  async getDocumentsByCategory(
    organizationId: string,
    category: string,
  ): Promise<KnowledgeDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('category', category)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Category query failed:', error);
        throw new Error(`Category query failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Category retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Get knowledge base statistics for organization
   */
  async getKnowledgeBaseStats(organizationId: string) {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_knowledge_base_stats',
        { org_id: organizationId },
      );

      if (error) {
        logger.error('Stats query failed:', error);
        throw new Error(`Stats query failed: ${error.message}`);
      }

      return (
        data || {
          total_documents: 0,
          categories: [],
          source_types: [],
          last_updated: null,
        }
      );
    } catch (error) {
      logger.error('Stats retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Generate relevance reasoning using AI
   */
  private async generateRelevanceReason(
    query: string,
    title: string,
    content: string,
    category: string,
  ): Promise<string> {
    try {
      const prompt = `Explain in 1-2 sentences why this document is relevant to the search query.

Search Query: "${query}"
Document Title: "${title}"
Category: ${category}
Content Preview: "${content.substring(0, 200)}..."

Focus on wedding industry context and practical relevance for suppliers.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      });

      return (
        response.choices[0]?.message?.content?.trim() ||
        'Relevant based on semantic similarity'
      );
    } catch (error) {
      logger.error('Relevance reasoning failed:', error);
      return 'Relevant based on semantic similarity';
    }
  }

  /**
   * Batch index multiple documents efficiently
   */
  async batchIndexDocuments(
    documents: Omit<KnowledgeDocument, 'id' | 'created_at' | 'updated_at'>[],
  ): Promise<IndexingResult[]> {
    const results: IndexingResult[] = [];
    const batchSize = 10;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map((doc) => this.indexDocument(doc));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            document_id: '',
            category: '',
            embedding_created: false,
            error: result.reason?.message || 'Batch processing failed',
          });
        }
      });
    }

    logger.info(`Batch indexed ${results.length} documents`);
    return results;
  }
}

export default KnowledgeBaseEngine;
