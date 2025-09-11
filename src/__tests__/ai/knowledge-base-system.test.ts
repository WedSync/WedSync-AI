/**
 * AI Knowledge Base System Tests
 * Team B - WS-210 Implementation
 *
 * Comprehensive test suite for semantic search and content classification
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  KnowledgeBaseEngine,
  SearchQuery,
  KnowledgeDocument,
} from '@/lib/ai/knowledge-base-engine';
import { VectorSearchService } from '@/lib/ai/vector-search-service';
import { ContentClassifier } from '@/lib/ai/content-classifier';

// Mock OpenAI for testing
const mockOpenAI = {
  embeddings: {
    create: jest.fn(),
  },
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
} as any;

// Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
function createSingleMock() {
  return jest.fn();
}

function createSelectSingleChain() {
  const singleMock = createSingleMock();
  const selectMock = jest.fn(() => ({ single: singleMock }));
  return { select: selectMock, single: singleMock };
}

function createInsertChain() {
  const chain = createSelectSingleChain();
  const insertMock = jest.fn(() => chain);
  return { insert: insertMock };
}

function createEqOrderChain() {
  const orderMock = jest.fn();
  const eqMock = jest.fn(() => ({ order: orderMock }));
  return { eq: eqMock };
}

function createSelectEqChain() {
  const singleMock = jest.fn();
  const rpcMock = jest.fn();
  const eqOrderChain = createEqOrderChain();
  const eqMock = jest.fn(() => ({
    ...eqOrderChain,
    single: singleMock,
    rpc: rpcMock,
  }));
  const selectMock = jest.fn(() => ({ eq: eqMock }));
  return { select: selectMock };
}

// Optimized helper functions to prevent S2004 violations
function createFlatEqMock() {
  return jest.fn(() => Promise.resolve({ data: null, error: null }));
}

// Helper function to create batch classification test content - S2004 compliance
function createBatchClassificationTestContent() {
  return [
    {
      title: 'Wedding Venue Rental',
      content:
        'Beautiful ceremony and reception hall available for weddings',
      sourceType: 'vendor-profile' as const,
    },
    {
      title: 'Catering Services',
      content: 'Full service wedding catering with custom menus',
      sourceType: 'service-package' as const,
    },
  ];
}

function createUpdateChain() {
  const eqMock = createFlatEqMock();
  const updateMock = jest.fn(() => ({ eq: eqMock }));
  return { update: updateMock };
}

function createDeleteChain() {
  const eqMock = createFlatEqMock();
  const deleteMock = jest.fn(() => ({ eq: eqMock }));
  return { delete: deleteMock };
}

function createSupabaseFromChain() {
  const insertChain = createInsertChain();
  const selectChain = createSelectEqChain();
  const updateChain = createUpdateChain();
  const deleteChain = createDeleteChain();
  
  return {
    ...insertChain,
    ...selectChain,
    ...updateChain,
    ...deleteChain,
    rpc: jest.fn(),
  };
}

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => createSupabaseFromChain()),
  rpc: jest.fn(),
};

// Test data
const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
const testDocument: Omit<
  KnowledgeDocument,
  'id' | 'created_at' | 'updated_at'
> = {
  organization_id: testOrganizationId,
  title: 'Wedding Photography Services',
  content:
    'We offer comprehensive wedding photography services including engagement sessions, full day coverage, and professional editing. Our photographers specialize in capturing candid moments and romantic portraits.',
  source_type: 'service-package',
  category: 'photography-services',
  metadata: { tags: ['photography', 'wedding', 'professional'] },
};

const testEmbedding = new Array(1536)
  .fill(0)
  .map((_, i) => Math.random() - 0.5);

describe('AI Knowledge Base System', () => {
  let knowledgeEngine: KnowledgeBaseEngine;
  let vectorSearchService: VectorSearchService;
  let contentClassifier: ContentClassifier;

  beforeAll(() => {
    // Initialize services with mocks
    knowledgeEngine = new KnowledgeBaseEngine(
      'http://localhost:8000',
      'test-key',
      'test-openai-key',
    );

    vectorSearchService = new VectorSearchService(mockOpenAI);
    contentClassifier = new ContentClassifier(mockOpenAI);

    // Set up default mock responses with helper functions to reduce nesting
    const createEmbeddingResponse = () => ({
      data: [{ embedding: testEmbedding }],
      usage: { total_tokens: 100 },
    });

    const createClassificationResponse = () => ({
      category: 'photography-services',
      confidence: 0.95,
      reasoning: 'Content clearly describes wedding photography services',
    });

    const createChatCompletionResponse = () => ({
      choices: [
        {
          message: {
            content: JSON.stringify(createClassificationResponse()),
          },
        },
      ],
    });

    mockOpenAI.embeddings.create.mockResolvedValue(createEmbeddingResponse());
    mockOpenAI.chat.completions.create.mockResolvedValue(createChatCompletionResponse());
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('VectorSearchService', () => {
    it('should generate embeddings for text', async () => {
      const text = 'Wedding photography services and packages';
      const embedding = await vectorSearchService.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: expect.any(String),
      });
    });

    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const vectorC = [1, 0, 0];

      const result1 = vectorSearchService.calculateCosineSimilarity(
        vectorA,
        vectorB,
      );
      expect(result1.similarity).toBe(0);
      expect(result1.isSignificant).toBe(false);

      const result2 = vectorSearchService.calculateCosineSimilarity(
        vectorA,
        vectorC,
      );
      expect(result2.similarity).toBe(1);
      expect(result2.isSignificant).toBe(true);
    });

    it('should preprocess wedding industry text correctly', async () => {
      const text =
        'photographer specializes in ceremony and reception coverage';

      // The preprocessing should enhance wedding context
      await vectorSearchService.generateEmbedding(text);

      const callArgs = mockOpenAI.embeddings.create.mock.calls[0][0];
      expect(callArgs.input).toContain('wedding');
    });

    it('should handle batch embedding generation', async () => {
      const texts = [
        'Wedding venue services',
        'Catering for wedding receptions',
        'Floral arrangements for ceremonies',
      ];

      const embeddings =
        await vectorSearchService.batchGenerateEmbeddings(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
    });

    it('should validate embeddings correctly', () => {
      const validEmbedding = new Array(1536).fill(0.5);
      const invalidEmbedding1 = [];
      const invalidEmbedding2 = [NaN, 0.5, 0.3];

      expect(vectorSearchService.validateEmbedding(validEmbedding)).toBe(true);
      expect(vectorSearchService.validateEmbedding(invalidEmbedding1)).toBe(
        false,
      );
      expect(vectorSearchService.validateEmbedding(invalidEmbedding2)).toBe(
        false,
      );
    });
  });

  describe('ContentClassifier', () => {
    it('should classify wedding content correctly', async () => {
      const category = await contentClassifier.classifyWeddingContent(
        testDocument.title,
        testDocument.content,
        testDocument.source_type,
      );

      expect(category).toBe('photography-services');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should provide detailed classification results', async () => {
      const result = await contentClassifier.getDetailedClassification(
        testDocument.title,
        testDocument.content,
        testDocument.source_type,
      );

      expect(result).toBeDefined();
      expect(result.category).toBe('photography-services');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle batch classification', async () => {
      const contents = createBatchClassificationTestContent();

      const results = await contentClassifier.batchClassifyContent(contents);

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.category).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    it('should fallback to heuristic classification when AI fails', async () => {
      // Mock AI failure
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('API Error'),
      );

      const category = await contentClassifier.classifyWeddingContent(
        'Photography Services',
        'Wedding photo packages and pricing',
        'pricing',
      );

      // Should fallback to rule-based classification
      expect(category).toBe('pricing-packages'); // Based on source_type
    });

    it('should provide category descriptions', () => {
      const categories = contentClassifier.getAvailableCategories();

      expect(categories).toBeDefined();
      expect(categories.length).toBeGreaterThan(20);
      expect(categories).toContain('photography-services');
      expect(categories).toContain('venue-services');

      const description = contentClassifier.getCategoryDescription(
        'photography-services',
      );
      expect(description).toContain('photography');
    });
  });

  describe('KnowledgeBaseEngine Integration', () => {
    // Helper function to create mock search result
    function createMockSearchResult() {
      return {
        ...testDocument,
        id: 'test-doc-id',
        embedding: testEmbedding,
        similarity: 0.85,
      };
    }

    // Helper function to create mock statistics
    function createMockStats() {
      return {
        total_documents: 10,
        categories: [
          { category: 'photography-services', count: 3 },
          { category: 'venue-services', count: 2 },
        ],
        source_types: [{ source_type: 'service-package', count: 5 }],
        last_updated: new Date().toISOString(),
      };
    }

    // Helper function to create successful mock chain
    function createSuccessfulMockChain() {
      const insertSingleMock = jest.fn(() =>
        Promise.resolve({ data: { id: 'test-doc-id' }, error: null })
      );
      const insertSelectMock = jest.fn(() => ({ single: insertSingleMock }));
      const insertMock = jest.fn(() => ({ select: insertSelectMock }));

      const rpcMock = jest.fn(() =>
        Promise.resolve({ data: [createMockSearchResult()], error: null })
      );
      const eqMock2 = jest.fn(() => ({ rpc: rpcMock }));
      const eqMock1 = jest.fn(() => ({ eq: eqMock2 }));
      const selectMock = jest.fn(() => ({ eq: eqMock1 }));

      const statsRpcMock = jest.fn(() =>
        Promise.resolve({ data: createMockStats(), error: null })
      );

      return {
        insert: insertMock,
        select: selectMock,
        rpc: statsRpcMock,
      };
    }

    beforeAll(() => {
      // Mock successful database operations
      mockSupabase.from.mockImplementation((table: string) => {
        return createSuccessfulMockChain();
      });
    });

    it('should index documents successfully', async () => {
      // Override the knowledgeEngine's supabase property for testing
      (knowledgeEngine as any).supabase = mockSupabase;

      const result = await knowledgeEngine.indexDocument(testDocument);

      expect(result.success).toBe(true);
      expect(result.document_id).toBe('test-doc-id');
      expect(result.category).toBe('photography-services');
      expect(result.embedding_created).toBe(true);
    });

    it('should perform semantic search', async () => {
      // Override the knowledgeEngine's supabase property for testing
      (knowledgeEngine as any).supabase = mockSupabase;

      const searchQuery: SearchQuery = {
        query: 'wedding photography services',
        organization_id: testOrganizationId,
        limit: 10,
        similarity_threshold: 0.7,
        include_metadata: false,
      };

      const results = await knowledgeEngine.search(searchQuery);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get knowledge base statistics', async () => {
      // Override the knowledgeEngine's supabase property for testing
      (knowledgeEngine as any).supabase = mockSupabase;

      const stats =
        await knowledgeEngine.getKnowledgeBaseStats(testOrganizationId);

      expect(stats).toBeDefined();
      expect(stats.total_documents).toBe(10);
      expect(stats.categories).toBeDefined();
      expect(stats.source_types).toBeDefined();
    });

    it('should handle batch document indexing', async () => {
      // Override the knowledgeEngine's supabase property for testing
      (knowledgeEngine as any).supabase = mockSupabase;

      const documents = [
        testDocument,
        {
          ...testDocument,
          title: 'Venue Services',
          content: 'Wedding venue rental and event coordination',
          category: 'venue-services',
        },
      ];

      const results = await knowledgeEngine.batchIndexDocuments(documents);

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should update existing documents', async () => {
      // Override the knowledgeEngine's supabase property for testing
      (knowledgeEngine as any).supabase = mockSupabase;

      const updates = {
        title: 'Updated Wedding Photography Services',
        content: 'Updated content with new pricing and packages',
      };

      const result = await knowledgeEngine.updateDocument(
        'test-doc-id',
        updates,
      );

      expect(result.success).toBe(true);
      expect(result.document_id).toBe('test-doc-id');
      expect(result.embedding_created).toBe(true); // Should regenerate embedding
    });

    it('should delete documents safely', async () => {
      // Override the knowledgeEngine's supabase property for testing
      (knowledgeEngine as any).supabase = mockSupabase;

      mockSupabase.from().delete().eq().eq.mockResolvedValueOnce({
        error: null,
      });

      const success = await knowledgeEngine.deleteDocument(
        'test-doc-id',
        testOrganizationId,
      );

      expect(success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API failures gracefully', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('OpenAI API Error'),
      );

      await expect(
        vectorSearchService.generateEmbedding('test content'),
      ).rejects.toThrow('Embedding generation failed');
    });

    it('should handle database connection failures', async () => {
      // Helper function to create broken database mock
      function createBrokenDatabaseMock() {
        const singleMock = jest.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
          })
        );
        const selectMock = jest.fn(() => ({ single: singleMock }));
        const insertMock = jest.fn(() => ({ select: selectMock }));
        return { insert: insertMock };
      }

      const brokenSupabase = {
        from: jest.fn(() => createBrokenDatabaseMock()),
      };

      (knowledgeEngine as any).supabase = brokenSupabase;

      const result = await knowledgeEngine.indexDocument(testDocument);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database insert failed');
    });

    it('should validate input data correctly', async () => {
      const invalidDocument = {
        organization_id: 'invalid-uuid',
        title: '',
        content: 'short',
        source_type: 'invalid-type' as any,
      };

      await expect(
        knowledgeEngine.indexDocument(invalidDocument),
      ).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = 'A'.repeat(10000); // 10KB content

      const startTime = Date.now();
      await vectorSearchService.generateEmbedding(largeContent);
      const endTime = Date.now();

      // Should complete within reasonable time (< 5 seconds for testing)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should cache embeddings effectively', async () => {
      const text = 'Wedding photography services';

      // First call should generate embedding
      await vectorSearchService.generateEmbedding(text);
      const firstCallCount = mockOpenAI.embeddings.create.mock.calls.length;

      // Second call should use cache
      await vectorSearchService.generateEmbedding(text);
      const secondCallCount = mockOpenAI.embeddings.create.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // No additional API call
    });
  });
});

// Integration test helper functions
export const testHelpers = {
  createTestDocument: (overrides: Partial<KnowledgeDocument> = {}) => ({
    ...testDocument,
    ...overrides,
  }),

  createMockEmbedding: (dimensions = 1536) =>
    new Array(dimensions).fill(0).map(() => Math.random() - 0.5),

  mockOpenAIResponse: (embedding: number[], classification: any) => {
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding }],
      usage: { total_tokens: 100 },
    });

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: { content: JSON.stringify(classification) },
        },
      ],
    });
  },
};

export {
  mockOpenAI,
  mockSupabase,
  testDocument,
  testEmbedding,
  testOrganizationId,
};
