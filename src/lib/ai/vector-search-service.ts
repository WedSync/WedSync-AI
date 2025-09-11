/**
 * Vector Search Service - Handles embeddings generation and semantic similarity operations
 * Team B - WS-210 Implementation
 *
 * Provides high-performance semantic search using OpenAI embeddings and PostgreSQL vector operations
 */

import { OpenAI } from 'openai';
import { logger } from '../logger';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  model: string;
}

export interface SimilarityResult {
  similarity: number;
  isSignificant: boolean;
}

export interface VectorSearchOptions {
  model?: string;
  maxTokens?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * VectorSearchService handles all embedding and semantic search operations
 * Optimized for wedding industry content with caching and error handling
 */
export class VectorSearchService {
  private openai: OpenAI;
  private readonly defaultModel = 'text-embedding-ada-002';
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly cache = new Map<string, EmbeddingResult>();
  private readonly maxCacheSize = 1000;

  constructor(
    openai: OpenAI,
    private options: VectorSearchOptions = {},
  ) {
    this.openai = openai;
    logger.info('VectorSearchService initialized with caching');
  }

  /**
   * Generate embedding for a text with retry logic and caching
   */
  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    try {
      // Validate and clean input
      const cleanedText = this.preprocessText(text);
      if (!cleanedText || cleanedText.length < 3) {
        throw new Error('Text too short for embedding generation');
      }

      // Check cache first
      const cacheKey = this.getCacheKey(cleanedText, model);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Using cached embedding');
        return cached.embedding;
      }

      // Generate new embedding with retries
      const result = await this.generateEmbeddingWithRetry(cleanedText, model);

      // Cache the result
      this.cacheEmbedding(cacheKey, result);

      return result.embedding;
    } catch (error) {
      logger.error('Embedding generation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length,
        model: model || this.defaultModel,
      });
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async batchGenerateEmbeddings(
    texts: string[],
    model?: string,
  ): Promise<number[][]> {
    const results: number[][] = [];
    const batchSize = this.options.batchSize || 20;

    logger.info(
      `Generating embeddings for ${texts.length} texts in batches of ${batchSize}`,
    );

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((text) =>
        this.generateEmbedding(text, model),
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Rate limiting - small delay between batches
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(
          `Batch embedding failed for batch starting at index ${i}:`,
          error,
        );
        throw error;
      }
    }

    logger.info(`Successfully generated ${results.length} embeddings`);
    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[],
  ): SimilarityResult {
    if (vectorA.length !== vectorB.length) {
      throw new Error(
        'Vectors must have the same length for similarity calculation',
      );
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return { similarity: 0, isSignificant: false };
    }

    const similarity = dotProduct / (magnitudeA * magnitudeB);

    return {
      similarity: Math.round(similarity * 10000) / 10000, // Round to 4 decimal places
      isSignificant: similarity > 0.7, // Threshold for significant similarity
    };
  }

  /**
   * Find most similar embeddings from a collection
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: { id: string; embedding: number[]; metadata?: any }[],
    limit = 10,
    threshold = 0.5,
  ): Array<{ id: string; similarity: number; metadata?: any }> {
    const similarities = candidateEmbeddings
      .map((candidate) => {
        const result = this.calculateCosineSimilarity(
          queryEmbedding,
          candidate.embedding,
        );
        return {
          id: candidate.id,
          similarity: result.similarity,
          metadata: candidate.metadata,
        };
      })
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    logger.debug(
      `Found ${similarities.length} similar items above threshold ${threshold}`,
    );
    return similarities;
  }

  /**
   * Enhanced text preprocessing for wedding industry content
   */
  private preprocessText(text: string): string {
    // Remove excessive whitespace and normalize
    let cleaned = text.trim().replace(/\s+/g, ' ');

    // Wedding industry specific preprocessing
    cleaned = this.normalizeWeddingTerms(cleaned);

    // Limit length to prevent token limit issues
    const maxLength = this.options.maxTokens
      ? this.options.maxTokens * 4
      : 8000;
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
      logger.warn(
        `Text truncated to ${maxLength} characters to prevent token limit`,
      );
    }

    return cleaned;
  }

  /**
   * Normalize wedding industry terms for better embeddings
   */
  private normalizeWeddingTerms(text: string): string {
    const weddingTermMappings = {
      photographer: 'wedding photographer',
      videographer: 'wedding videographer',
      florist: 'wedding florist',
      caterer: 'wedding catering',
      venue: 'wedding venue',
      dj: 'wedding dj',
      band: 'wedding band',
      cake: 'wedding cake',
      dress: 'wedding dress',
      suit: 'wedding suit',
      flowers: 'wedding flowers',
      bouquet: 'bridal bouquet',
      ceremony: 'wedding ceremony',
      reception: 'wedding reception',
    };

    let normalized = text.toLowerCase();

    for (const [term, replacement] of Object.entries(weddingTermMappings)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (!normalized.includes('wedding') && regex.test(normalized)) {
        normalized = normalized.replace(regex, replacement);
      }
    }

    return normalized;
  }

  /**
   * Generate embedding with exponential backoff retry
   */
  private async generateEmbeddingWithRetry(
    text: string,
    model?: string,
  ): Promise<EmbeddingResult> {
    const embeddingModel = model || this.options.model || this.defaultModel;
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(
          `Generating embedding (attempt ${attempt}/${this.maxRetries})`,
        );

        const response = await this.openai.embeddings.create({
          model: embeddingModel,
          input: text,
        });

        const embedding = response.data[0]?.embedding;
        if (!embedding || embedding.length === 0) {
          throw new Error('Empty embedding returned from OpenAI');
        }

        return {
          embedding,
          tokenCount: response.usage?.total_tokens || 0,
          model: embeddingModel,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay =
          this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        logger.warn(
          `Embedding attempt ${attempt} failed, retrying in ${delay}ms:`,
          lastError.message,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Generate cache key for embedding
   */
  private getCacheKey(text: string, model?: string): string {
    const embeddingModel = model || this.defaultModel;
    return `${embeddingModel}:${this.hashText(text)}`;
  }

  /**
   * Simple hash function for text
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache embedding result with LRU eviction
   */
  private cacheEmbedding(key: string, result: EmbeddingResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to implement hit counting for this
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Embedding cache cleared');
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return false;
    }

    // Check for valid numbers
    return embedding.every(
      (val) => typeof val === 'number' && !isNaN(val) && isFinite(val),
    );
  }

  /**
   * Get embedding model information
   */
  getModelInfo(model?: string) {
    const embeddingModel = model || this.defaultModel;

    const modelInfo = {
      'text-embedding-ada-002': {
        dimensions: 1536,
        maxTokens: 8191,
        costPer1kTokens: 0.0001,
        description: 'Most capable embedding model for semantic search',
      },
      'text-embedding-3-small': {
        dimensions: 1536,
        maxTokens: 8191,
        costPer1kTokens: 0.00002,
        description: 'Smaller, faster embedding model',
      },
      'text-embedding-3-large': {
        dimensions: 3072,
        maxTokens: 8191,
        costPer1kTokens: 0.00013,
        description: 'Most powerful embedding model with higher dimensions',
      },
    };

    return (
      modelInfo[embeddingModel as keyof typeof modelInfo] || {
        dimensions: 1536,
        maxTokens: 8191,
        costPer1kTokens: 0.0001,
        description: 'Unknown model',
      }
    );
  }
}

export default VectorSearchService;
