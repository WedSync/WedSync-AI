/**
 * Translation Memory Service for WedSync Multilingual Platform
 *
 * Provides intelligent translation caching, fuzzy matching, and wedding industry
 * terminology management to optimize translation costs and improve consistency.
 *
 * Key Features:
 * - Multi-level caching (memory + Supabase)
 * - Fuzzy matching with similarity scoring
 * - Wedding industry terminology database
 * - Quality assurance and confidence scoring
 * - Bulk operations and analytics
 *
 * @fileoverview WS-247 Translation Memory Service Implementation
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Translation memory entry representing a source-target translation pair
 */
export interface TranslationMemoryEntry {
  id: string;
  source_text: string;
  target_text: string;
  source_language: string;
  target_language: string;
  context: string;
  category: WeddingCategory;
  quality_score: number;
  confidence_score: number;
  usage_count: number;
  provider: TranslationProvider;
  created_at: string;
  updated_at: string;
  created_by: string;
  validated_by?: string;
  validation_date?: string;
  metadata: TranslationMetadata;
}

/**
 * Wedding industry categories for context-aware translation
 */
export type WeddingCategory =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'videography'
  | 'flowers'
  | 'music'
  | 'planning'
  | 'invitations'
  | 'ceremony'
  | 'reception'
  | 'general';

/**
 * Translation providers supported by the system
 */
export type TranslationProvider =
  | 'google'
  | 'deepl'
  | 'azure'
  | 'human_professional'
  | 'community'
  | 'internal';

/**
 * Metadata associated with translation entries
 */
export interface TranslationMetadata {
  domain_specific: boolean;
  cultural_adaptation: boolean;
  seasonal_content: boolean;
  vendor_specific: boolean;
  technical_terms: boolean;
  pricing_sensitive: boolean;
  legal_content: boolean;
  user_facing: boolean;
}

/**
 * Fuzzy match result with similarity scoring
 */
export interface FuzzyMatchResult {
  entry: TranslationMemoryEntry;
  similarity_score: number;
  match_type: MatchType;
  edit_distance: number;
  context_match: boolean;
}

/**
 * Match types based on similarity thresholds
 */
export type MatchType =
  | 'exact' // 100% match
  | 'high' // 95-99% match
  | 'medium' // 80-94% match
  | 'low' // 70-79% match
  | 'fuzzy'; // 50-69% match

/**
 * Translation memory search options
 */
export interface SearchOptions {
  source_language: string;
  target_language: string;
  category?: WeddingCategory;
  context?: string;
  min_similarity?: number;
  max_results?: number;
  include_fuzzy?: boolean;
  provider_preference?: TranslationProvider[];
}

/**
 * Bulk import/export data structure
 */
export interface BulkTranslationData {
  entries: Omit<TranslationMemoryEntry, 'id' | 'created_at' | 'updated_at'>[];
  metadata: {
    source: string;
    import_date: string;
    total_entries: number;
    categories: WeddingCategory[];
  };
}

/**
 * Analytics data for translation memory performance
 */
export interface TranslationMemoryAnalytics {
  total_entries: number;
  languages_supported: string[];
  categories_coverage: Record<WeddingCategory, number>;
  quality_distribution: Record<string, number>;
  usage_statistics: {
    daily_queries: number;
    cache_hit_rate: number;
    cost_savings: number;
    top_categories: Array<{ category: WeddingCategory; count: number }>;
  };
  performance_metrics: {
    average_response_time: number;
    fuzzy_match_accuracy: number;
    user_satisfaction_score: number;
  };
}

/**
 * In-memory cache for frequently accessed translations
 */
class TranslationMemoryCache {
  private cache = new Map<string, TranslationMemoryEntry>();
  private readonly maxSize: number = 10000;
  private readonly ttl: number = 1000 * 60 * 60; // 1 hour

  /**
   * Generate cache key for translation entry
   */
  private generateKey(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    context?: string,
  ): string {
    return `${sourceLang}:${targetLang}:${context || 'default'}:${sourceText}`;
  }

  /**
   * Get translation from cache
   */
  get(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    context?: string,
  ): TranslationMemoryEntry | null {
    const key = this.generateKey(sourceText, sourceLang, targetLang, context);
    const entry = this.cache.get(key);

    if (entry) {
      // Check if entry has expired
      const now = Date.now();
      const entryTime = new Date(entry.updated_at).getTime();
      if (now - entryTime > this.ttl) {
        this.cache.delete(key);
        return null;
      }
      return entry;
    }

    return null;
  }

  /**
   * Set translation in cache
   */
  set(entry: TranslationMemoryEntry): void {
    const key = this.generateKey(
      entry.source_text,
      entry.source_language,
      entry.target_language,
      entry.context,
    );

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, entry);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // This would be tracked separately in a real implementation
    };
  }
}

/**
 * Fuzzy matching algorithms for translation similarity
 */
class FuzzyMatcher {
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate Jaccard similarity between two strings
   */
  private jaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate cosine similarity between two strings
   */
  private cosineSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const wordFreq1 = new Map<string, number>();
    const wordFreq2 = new Map<string, number>();

    words1.forEach((word) => {
      wordFreq1.set(word, (wordFreq1.get(word) || 0) + 1);
    });

    words2.forEach((word) => {
      wordFreq2.set(word, (wordFreq2.get(word) || 0) + 1);
    });

    const allWords = new Set([...wordFreq1.keys(), ...wordFreq2.keys()]);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const word of allWords) {
      const freq1 = wordFreq1.get(word) || 0;
      const freq2 = wordFreq2.get(word) || 0;

      dotProduct += freq1 * freq2;
      magnitude1 += freq1 * freq1;
      magnitude2 += freq2 * freq2;
    }

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Calculate comprehensive similarity score
   */
  calculateSimilarity(source: string, target: string): number {
    const maxLength = Math.max(source.length, target.length);
    const editDistance = this.levenshteinDistance(source, target);
    const levenshteinSimilarity = (maxLength - editDistance) / maxLength;

    const jaccardSim = this.jaccardSimilarity(source, target);
    const cosineSim = this.cosineSimilarity(source, target);

    // Weighted average of different similarity measures
    return (
      (levenshteinSimilarity * 0.4 + jaccardSim * 0.3 + cosineSim * 0.3) * 100
    );
  }

  /**
   * Determine match type based on similarity score
   */
  getMatchType(similarity: number): MatchType {
    if (similarity >= 100) return 'exact';
    if (similarity >= 95) return 'high';
    if (similarity >= 80) return 'medium';
    if (similarity >= 70) return 'low';
    return 'fuzzy';
  }
}

/**
 * Translation Memory Service
 *
 * Provides comprehensive translation memory functionality including:
 * - Intelligent caching and retrieval
 * - Fuzzy matching with similarity scoring
 * - Wedding industry terminology management
 * - Quality assurance and analytics
 * - Bulk import/export operations
 */
export class TranslationMemoryService {
  private supabase: SupabaseClient<Database>;
  private cache: TranslationMemoryCache;
  private fuzzyMatcher: FuzzyMatcher;
  private readonly tableName = 'translation_memory';

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.cache = new TranslationMemoryCache();
    this.fuzzyMatcher = new FuzzyMatcher();
  }

  /**
   * Store a new translation in memory
   */
  async storeTranslation(
    translation: Omit<
      TranslationMemoryEntry,
      'id' | 'created_at' | 'updated_at' | 'usage_count'
    >,
  ): Promise<TranslationMemoryEntry> {
    try {
      const entry: Omit<TranslationMemoryEntry, 'id'> = {
        ...translation,
        usage_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(entry)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store translation: ${error.message}`);
      }

      const storedEntry = data as TranslationMemoryEntry;

      // Cache the new entry
      this.cache.set(storedEntry);

      return storedEntry;
    } catch (error) {
      console.error('Error storing translation:', error);
      throw error;
    }
  }

  /**
   * Find exact or fuzzy matches for a source text
   */
  async findMatches(
    sourceText: string,
    options: SearchOptions,
  ): Promise<FuzzyMatchResult[]> {
    try {
      // Check cache first for exact match
      const cachedEntry = this.cache.get(
        sourceText,
        options.source_language,
        options.target_language,
        options.context,
      );

      if (cachedEntry) {
        return [
          {
            entry: cachedEntry,
            similarity_score: 100,
            match_type: 'exact',
            edit_distance: 0,
            context_match: true,
          },
        ];
      }

      // Query database for potential matches
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('source_language', options.source_language)
        .eq('target_language', options.target_language)
        .order('usage_count', { ascending: false })
        .limit(options.max_results || 50);

      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.context) {
        query = query.eq('context', options.context);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find matches: ${error.message}`);
      }

      const entries = data as TranslationMemoryEntry[];
      const matches: FuzzyMatchResult[] = [];

      // Calculate similarity scores
      for (const entry of entries) {
        const similarity = this.fuzzyMatcher.calculateSimilarity(
          sourceText,
          entry.source_text,
        );
        const minSimilarity = options.min_similarity || 70;

        if (similarity >= minSimilarity) {
          const matchType = this.fuzzyMatcher.getMatchType(similarity);

          // Skip fuzzy matches if not requested
          if (!options.include_fuzzy && matchType === 'fuzzy') {
            continue;
          }

          const editDistance =
            similarity < 100
              ? this.fuzzyMatcher['levenshteinDistance'](
                  sourceText,
                  entry.source_text,
                )
              : 0;

          matches.push({
            entry,
            similarity_score: similarity,
            match_type: matchType,
            edit_distance: editDistance,
            context_match: entry.context === (options.context || entry.context),
          });
        }
      }

      // Sort by similarity score (highest first)
      matches.sort((a, b) => b.similarity_score - a.similarity_score);

      // Cache the best exact match
      const exactMatch = matches.find((m) => m.match_type === 'exact');
      if (exactMatch) {
        this.cache.set(exactMatch.entry);
      }

      return matches.slice(0, options.max_results || 10);
    } catch (error) {
      console.error('Error finding matches:', error);
      throw error;
    }
  }

  /**
   * Update usage statistics for a translation entry
   */
  async incrementUsage(entryId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_usage_count', {
        entry_id: entryId,
      });

      if (error) {
        throw new Error(`Failed to increment usage: ${error.message}`);
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  /**
   * Update quality score for a translation entry
   */
  async updateQualityScore(
    entryId: string,
    qualityScore: number,
    validatedBy?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        quality_score: Math.max(0, Math.min(100, qualityScore)),
        updated_at: new Date().toISOString(),
      };

      if (validatedBy) {
        updateData.validated_by = validatedBy;
        updateData.validation_date = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', entryId);

      if (error) {
        throw new Error(`Failed to update quality score: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating quality score:', error);
      throw error;
    }
  }

  /**
   * Import wedding industry terminology database
   */
  async importWeddingTerminology(languagePair: {
    source: string;
    target: string;
  }): Promise<number> {
    try {
      const weddingTerms = await this.getWeddingIndustryTerms(languagePair);
      let importedCount = 0;

      for (const term of weddingTerms) {
        try {
          await this.storeTranslation(term);
          importedCount++;
        } catch (error) {
          console.warn(`Failed to import term: ${term.source_text}`, error);
        }
      }

      return importedCount;
    } catch (error) {
      console.error('Error importing wedding terminology:', error);
      throw error;
    }
  }

  /**
   * Get pre-defined wedding industry terms for a language pair
   */
  private async getWeddingIndustryTerms(languagePair: {
    source: string;
    target: string;
  }): Promise<
    Omit<
      TranslationMemoryEntry,
      'id' | 'created_at' | 'updated_at' | 'usage_count'
    >[]
  > {
    // This would typically load from a curated database or external source
    const baseTerms: Record<string, Partial<TranslationMemoryEntry>> = {
      // Venue terms
      'wedding venue': { category: 'venue', context: 'location' },
      'reception hall': { category: 'venue', context: 'location' },
      'outdoor ceremony': { category: 'ceremony', context: 'location' },
      'bridal suite': { category: 'venue', context: 'accommodation' },

      // Photography terms
      'wedding photographer': { category: 'photography', context: 'vendor' },
      'engagement photos': { category: 'photography', context: 'service' },
      'wedding album': { category: 'photography', context: 'product' },
      'photo booth': { category: 'photography', context: 'service' },

      // Catering terms
      'wedding cake': { category: 'catering', context: 'food' },
      'cocktail hour': { category: 'catering', context: 'event' },
      'plated dinner': { category: 'catering', context: 'service' },
      'dietary restrictions': { category: 'catering', context: 'requirements' },

      // General wedding terms
      'bride and groom': { category: 'general', context: 'people' },
      'wedding party': { category: 'general', context: 'people' },
      'maid of honor': { category: 'general', context: 'people' },
      'best man': { category: 'general', context: 'people' },
      'wedding ceremony': { category: 'ceremony', context: 'event' },
      'wedding reception': { category: 'reception', context: 'event' },
    };

    // This would be expanded with actual translation data
    // For now, returning a basic structure
    return Object.entries(baseTerms).map(([sourceText, partial]) => ({
      source_text: sourceText,
      target_text: sourceText, // Would be actual translation
      source_language: languagePair.source,
      target_language: languagePair.target,
      context: partial.context || 'general',
      category: partial.category || 'general',
      quality_score: 90,
      confidence_score: 95,
      provider: 'internal' as TranslationProvider,
      created_by: 'system',
      metadata: {
        domain_specific: true,
        cultural_adaptation: false,
        seasonal_content: false,
        vendor_specific: false,
        technical_terms: false,
        pricing_sensitive: false,
        legal_content: false,
        user_facing: true,
      },
    }));
  }

  /**
   * Bulk import translations from external source
   */
  async bulkImport(
    data: BulkTranslationData,
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    try {
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const entry of data.entries) {
        try {
          await this.storeTranslation(entry);
          imported++;
        } catch (error) {
          failed++;
          errors.push(
            `Failed to import "${entry.source_text}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      return { imported, failed, errors };
    } catch (error) {
      console.error('Error in bulk import:', error);
      throw error;
    }
  }

  /**
   * Export translations for backup or transfer
   */
  async bulkExport(options?: {
    languages?: string[];
    categories?: WeddingCategory[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BulkTranslationData> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: true });

      if (options?.languages?.length) {
        query = query.in('source_language', options.languages);
      }

      if (options?.categories?.length) {
        query = query.in('category', options.categories);
      }

      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }

      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to export translations: ${error.message}`);
      }

      const entries = data as TranslationMemoryEntry[];
      const categories = new Set<WeddingCategory>();

      entries.forEach((entry) => categories.add(entry.category));

      return {
        entries: entries.map(({ id, created_at, updated_at, ...rest }) => rest),
        metadata: {
          source: 'wedsync_translation_memory',
          import_date: new Date().toISOString(),
          total_entries: entries.length,
          categories: Array.from(categories),
        },
      };
    } catch (error) {
      console.error('Error exporting translations:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for translation memory performance
   */
  async getAnalytics(dateRange?: {
    from: string;
    to: string;
  }): Promise<TranslationMemoryAnalytics> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from)
          .lte('created_at', dateRange.to);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get analytics: ${error.message}`);
      }

      const entries = data as TranslationMemoryEntry[];

      // Calculate analytics
      const languages = new Set<string>();
      const categoryCounts: Record<WeddingCategory, number> = {
        venue: 0,
        catering: 0,
        photography: 0,
        videography: 0,
        flowers: 0,
        music: 0,
        planning: 0,
        invitations: 0,
        ceremony: 0,
        reception: 0,
        general: 0,
      };

      const qualityDistribution: Record<string, number> = {
        excellent: 0, // 90-100
        good: 0, // 70-89
        fair: 0, // 50-69
        poor: 0, // <50
      };

      let totalUsage = 0;
      let totalQuality = 0;

      entries.forEach((entry) => {
        languages.add(entry.source_language);
        languages.add(entry.target_language);
        categoryCounts[entry.category]++;
        totalUsage += entry.usage_count;
        totalQuality += entry.quality_score;

        if (entry.quality_score >= 90) qualityDistribution.excellent++;
        else if (entry.quality_score >= 70) qualityDistribution.good++;
        else if (entry.quality_score >= 50) qualityDistribution.fair++;
        else qualityDistribution.poor++;
      });

      const topCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category: category as WeddingCategory,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const cacheStats = this.cache.getStats();

      return {
        total_entries: entries.length,
        languages_supported: Array.from(languages),
        categories_coverage: categoryCounts,
        quality_distribution: qualityDistribution,
        usage_statistics: {
          daily_queries: Math.round(totalUsage / 30), // Approximate
          cache_hit_rate: cacheStats.hitRate,
          cost_savings: totalUsage * 0.02, // Estimated $0.02 per translation saved
          top_categories: topCategories,
        },
        performance_metrics: {
          average_response_time: 150, // This would be measured in real implementation
          fuzzy_match_accuracy:
            entries.length > 0 ? totalQuality / entries.length : 0,
          user_satisfaction_score: 8.7, // This would come from user feedback
        },
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Clean up old or low-quality translations
   */
  async cleanup(options: {
    removeOlderThan?: string;
    removeQualityBelow?: number;
    removeUnusedFor?: string;
    dryRun?: boolean;
  }): Promise<{ deletedCount: number; entries?: TranslationMemoryEntry[] }> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      // Build cleanup criteria
      const criteria: string[] = [];

      if (options.removeOlderThan) {
        query = query.lt('created_at', options.removeOlderThan);
        criteria.push(`older than ${options.removeOlderThan}`);
      }

      if (options.removeQualityBelow !== undefined) {
        query = query.lt('quality_score', options.removeQualityBelow);
        criteria.push(`quality below ${options.removeQualityBelow}`);
      }

      if (options.removeUnusedFor) {
        query = query
          .lt('updated_at', options.removeUnusedFor)
          .eq('usage_count', 1); // Only used once (initial creation)
        criteria.push(`unused since ${options.removeUnusedFor}`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to query cleanup candidates: ${error.message}`);
      }

      const candidatesForDeletion = data as TranslationMemoryEntry[];

      if (options.dryRun) {
        return {
          deletedCount: candidatesForDeletion.length,
          entries: candidatesForDeletion,
        };
      }

      // Perform actual deletion
      if (candidatesForDeletion.length > 0) {
        const ids = candidatesForDeletion.map((entry) => entry.id);

        const { error: deleteError } = await this.supabase
          .from(this.tableName)
          .delete()
          .in('id', ids);

        if (deleteError) {
          throw new Error(`Failed to delete entries: ${deleteError.message}`);
        }

        // Clear cache to ensure consistency
        this.cache.clear();
      }

      return {
        deletedCount: candidatesForDeletion.length,
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Get translation memory statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    languagePairs: number;
    categories: number;
    averageQuality: number;
    cacheStats: { size: number; maxSize: number; hitRate: number };
  }> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('source_language, target_language, category, quality_score');

      if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      const entries = data as Array<{
        source_language: string;
        target_language: string;
        category: WeddingCategory;
        quality_score: number;
      }>;

      const languagePairs = new Set<string>();
      const categories = new Set<WeddingCategory>();
      let totalQuality = 0;

      entries.forEach((entry) => {
        languagePairs.add(`${entry.source_language}-${entry.target_language}`);
        categories.add(entry.category);
        totalQuality += entry.quality_score;
      });

      return {
        totalEntries: entries.length,
        languagePairs: languagePairs.size,
        categories: categories.size,
        averageQuality: entries.length > 0 ? totalQuality / entries.length : 0,
        cacheStats: this.cache.getStats(),
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance for global access
 */
export const translationMemoryService = new TranslationMemoryService();

/**
 * Utility functions for external integration
 */
export class TranslationMemoryUtils {
  /**
   * Calculate cost savings from using translation memory
   */
  static calculateCostSavings(
    totalTranslations: number,
    cacheHitRate: number,
    costPerTranslation: number = 0.02,
  ): number {
    const savedTranslations = totalTranslations * (cacheHitRate / 100);
    return savedTranslations * costPerTranslation;
  }

  /**
   * Generate quality score based on various factors
   */
  static calculateQualityScore(factors: {
    providerReliability: number; // 0-100
    userValidation: boolean;
    usageFrequency: number; // 0-100
    contextMatch: boolean;
    culturalAdaptation: boolean;
  }): number {
    let score = factors.providerReliability * 0.4;

    if (factors.userValidation) score += 20;
    score += factors.usageFrequency * 0.2;
    if (factors.contextMatch) score += 10;
    if (factors.culturalAdaptation) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Validate translation memory entry data
   */
  static validateEntry(entry: Partial<TranslationMemoryEntry>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!entry.source_text?.trim()) {
      errors.push('Source text is required');
    }

    if (!entry.target_text?.trim()) {
      errors.push('Target text is required');
    }

    if (!entry.source_language) {
      errors.push('Source language is required');
    }

    if (!entry.target_language) {
      errors.push('Target language is required');
    }

    if (entry.source_language === entry.target_language) {
      errors.push('Source and target languages must be different');
    }

    if (
      entry.quality_score !== undefined &&
      (entry.quality_score < 0 || entry.quality_score > 100)
    ) {
      errors.push('Quality score must be between 0 and 100');
    }

    if (
      entry.confidence_score !== undefined &&
      (entry.confidence_score < 0 || entry.confidence_score > 100)
    ) {
      errors.push('Confidence score must be between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
