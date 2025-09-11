/**
 * WS-127: Photo Gallery Performance Optimizer
 * Advanced optimizations for handling large photo galleries with AI features
 */

export interface PerformanceMetrics {
  total_photos: number;
  load_time_ms: number;
  memory_usage_mb: number;
  ai_processing_time_ms: number;
  cache_hit_rate: number;
  thumbnail_generation_time_ms: number;
  optimization_score: number; // 1-100 scale
}

export interface OptimizationSettings {
  lazy_loading: boolean;
  thumbnail_quality: 'low' | 'medium' | 'high';
  cache_enabled: boolean;
  prefetch_count: number;
  batch_size: number;
  ai_processing_priority: 'background' | 'realtime';
  compression_level: number; // 1-9 scale
  progressive_loading: boolean;
}

export interface PhotoIndexEntry {
  id: string;
  thumbnail_url?: string;
  preview_url?: string;
  original_url?: string;
  metadata: {
    width: number;
    height: number;
    file_size: number;
    quality_score?: number;
    ai_analysis_status: 'pending' | 'processing' | 'completed' | 'error';
    last_accessed?: string;
  };
  tags: string[];
  categories: string[];
  priority_score: number; // For loading order optimization
}

export interface GalleryChunk {
  chunk_id: string;
  start_index: number;
  end_index: number;
  photos: PhotoIndexEntry[];
  loaded: boolean;
  loading: boolean;
  ai_processed: boolean;
  last_accessed: number;
}

export interface CacheEntry {
  key: string;
  data: any;
  size_bytes: number;
  created_at: number;
  last_accessed: number;
  access_count: number;
  ttl: number; // Time to live in ms
}

/**
 * Photo Performance Optimizer
 * Manages large photo galleries with advanced caching, lazy loading, and AI processing optimization
 */
export class PhotoPerformanceOptimizer {
  private cache = new Map<string, CacheEntry>();
  private photoIndex = new Map<string, PhotoIndexEntry>();
  private chunks = new Map<string, GalleryChunk>();
  private loadingQueue = new Set<string>();
  private aiProcessingQueue = new Set<string>();

  private settings: OptimizationSettings = {
    lazy_loading: true,
    thumbnail_quality: 'medium',
    cache_enabled: true,
    prefetch_count: 20,
    batch_size: 50,
    ai_processing_priority: 'background',
    compression_level: 7,
    progressive_loading: true,
  };

  private readonly MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly CHUNK_SIZE = 50;
  private readonly AI_BATCH_SIZE = 10;

  constructor(settings?: Partial<OptimizationSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.startCacheCleanup();
    this.startMetricsCollection();
  }

  /**
   * Initialize gallery with performance optimizations
   */
  async initializeGallery(
    photos: PhotoIndexEntry[],
    bucketId: string,
  ): Promise<{
    chunks: GalleryChunk[];
    optimization_applied: string[];
    estimated_load_time_ms: number;
  }> {
    const startTime = Date.now();

    try {
      // Clear previous data
      this.photoIndex.clear();
      this.chunks.clear();

      // Build optimized photo index
      const optimizedPhotos = this.buildOptimizedIndex(photos);

      // Create chunks for efficient loading
      const chunks = this.createOptimizedChunks(optimizedPhotos);

      // Preload first chunk and critical photos
      await this.preloadCriticalContent(chunks[0], bucketId);

      // Start background AI processing if enabled
      if (this.settings.ai_processing_priority === 'background') {
        this.scheduleBackgroundAIProcessing(optimizedPhotos);
      }

      const optimizationsApplied = [
        this.settings.lazy_loading ? 'lazy_loading' : '',
        this.settings.cache_enabled ? 'intelligent_caching' : '',
        this.settings.progressive_loading ? 'progressive_loading' : '',
        'chunk_based_loading',
        'priority_based_sorting',
        'memory_optimization',
      ].filter(Boolean);

      return {
        chunks: chunks,
        optimization_applied: optimizationsApplied,
        estimated_load_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Gallery initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load photos for a specific chunk with optimizations
   */
  async loadChunk(
    chunkId: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
  ): Promise<{
    photos: PhotoIndexEntry[];
    cache_hits: number;
    load_time_ms: number;
  }> {
    const startTime = Date.now();
    const chunk = this.chunks.get(chunkId);

    if (!chunk) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    if (chunk.loaded) {
      // Return from cache
      return {
        photos: chunk.photos,
        cache_hits: chunk.photos.length,
        load_time_ms: Date.now() - startTime,
      };
    }

    if (chunk.loading) {
      // Wait for existing loading to complete
      return this.waitForChunkLoad(chunkId);
    }

    chunk.loading = true;
    let cacheHits = 0;

    try {
      // Load photos with intelligent caching
      const loadedPhotos = await Promise.all(
        chunk.photos.map(async (photo) => {
          const cached = this.getCachedPhoto(photo.id);
          if (cached) {
            cacheHits++;
            return cached;
          }

          // Load photo with appropriate quality based on viewport and settings
          return this.loadOptimizedPhoto(
            photo,
            this.settings.thumbnail_quality,
          );
        }),
      );

      chunk.photos = loadedPhotos;
      chunk.loaded = true;
      chunk.loading = false;
      chunk.last_accessed = Date.now();

      // Prefetch next chunk if requested
      if (priority === 'high') {
        this.prefetchNextChunk(chunkId);
      }

      return {
        photos: loadedPhotos,
        cache_hits: cacheHits,
        load_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      chunk.loading = false;
      console.error(`Failed to load chunk ${chunkId}:`, error);
      throw error;
    }
  }

  /**
   * Process AI analysis for photos in batches with performance optimization
   */
  async processAIAnalysisBatch(
    photoIds: string[],
    analysisTypes: string[] = ['categorization', 'smart_tagging'],
  ): Promise<{
    processed: string[];
    queued: string[];
    processing_time_ms: number;
    estimated_remaining_time_ms: number;
  }> {
    const startTime = Date.now();
    const batchSize = Math.min(photoIds.length, this.AI_BATCH_SIZE);

    // Prioritize photos that are currently visible
    const prioritizedPhotoIds = this.prioritizePhotosForAI(photoIds);

    const batch = prioritizedPhotoIds.slice(0, batchSize);
    const remaining = prioritizedPhotoIds.slice(batchSize);

    // Add to processing queue
    batch.forEach((id) => this.aiProcessingQueue.add(id));

    try {
      // Process in parallel with controlled concurrency
      const processPromises = batch.map((photoId) =>
        this.processPhotoAIOptimized(photoId, analysisTypes),
      );

      await Promise.all(processPromises);

      // Remove from queue
      batch.forEach((id) => this.aiProcessingQueue.delete(id));

      // Update photo index with AI results
      this.updatePhotoIndexWithAI(batch);

      // Queue remaining photos for background processing
      if (
        remaining.length > 0 &&
        this.settings.ai_processing_priority === 'background'
      ) {
        setTimeout(() => {
          this.processAIAnalysisBatch(remaining, analysisTypes);
        }, 100); // Small delay to prevent overwhelming
      }

      return {
        processed: batch,
        queued: remaining,
        processing_time_ms: Date.now() - startTime,
        estimated_remaining_time_ms: remaining.length * 800, // Estimated 800ms per photo
      };
    } catch (error) {
      // Remove from queue on error
      batch.forEach((id) => this.aiProcessingQueue.delete(id));
      console.error('AI batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Search photos with performance optimizations
   */
  async searchPhotosOptimized(
    query: string,
    filters: {
      categories?: string[];
      tags?: string[];
      quality_threshold?: number;
      date_range?: { start: string; end: string };
    } = {},
    options: {
      limit?: number;
      offset?: number;
      include_ai_suggestions?: boolean;
    } = {},
  ): Promise<{
    photos: PhotoIndexEntry[];
    total_matches: number;
    search_time_ms: number;
    ai_enhanced: boolean;
  }> {
    const startTime = Date.now();
    const { limit = 50, offset = 0, include_ai_suggestions = true } = options;

    try {
      // Use index for fast searching
      let matchingPhotos = Array.from(this.photoIndex.values());

      // Apply text search
      if (query.trim()) {
        matchingPhotos = matchingPhotos.filter((photo) =>
          this.matchesTextQuery(photo, query),
        );
      }

      // Apply filters
      if (filters.categories?.length) {
        matchingPhotos = matchingPhotos.filter((photo) =>
          photo.categories.some((cat) => filters.categories!.includes(cat)),
        );
      }

      if (filters.tags?.length) {
        matchingPhotos = matchingPhotos.filter((photo) =>
          photo.tags.some((tag) => filters.tags!.includes(tag)),
        );
      }

      if (filters.quality_threshold) {
        matchingPhotos = matchingPhotos.filter(
          (photo) =>
            (photo.metadata.quality_score || 0) >= filters.quality_threshold!,
        );
      }

      if (filters.date_range) {
        // Would implement date filtering
      }

      // Sort by relevance and priority
      matchingPhotos.sort((a, b) => {
        const scoreA = this.calculateRelevanceScore(a, query, filters);
        const scoreB = this.calculateRelevanceScore(b, query, filters);
        return scoreB - scoreA;
      });

      // Apply pagination
      const paginatedPhotos = matchingPhotos.slice(offset, offset + limit);

      // Load thumbnails for visible results
      await this.preloadThumbnails(paginatedPhotos);

      return {
        photos: paginatedPhotos,
        total_matches: matchingPhotos.length,
        search_time_ms: Date.now() - startTime,
        ai_enhanced: include_ai_suggestions,
      };
    } catch (error) {
      console.error('Optimized search failed:', error);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const totalPhotos = this.photoIndex.size;
    const loadedChunks = Array.from(this.chunks.values()).filter(
      (c) => c.loaded,
    ).length;
    const totalChunks = this.chunks.size;

    return {
      total_photos: totalPhotos,
      load_time_ms: 0, // Would track actual load times
      memory_usage_mb: this.estimateMemoryUsage(),
      ai_processing_time_ms: 0, // Would track AI processing times
      cache_hit_rate: this.calculateCacheHitRate(),
      thumbnail_generation_time_ms: 0,
      optimization_score: this.calculateOptimizationScore(
        loadedChunks,
        totalChunks,
      ),
    };
  }

  /**
   * Optimize gallery configuration based on usage patterns
   */
  async optimizeConfiguration(): Promise<{
    recommendations: string[];
    new_settings: Partial<OptimizationSettings>;
    estimated_improvement: number;
  }> {
    const metrics = this.getPerformanceMetrics();
    const recommendations: string[] = [];
    const newSettings: Partial<OptimizationSettings> = {};

    // Analyze performance and make recommendations
    if (metrics.cache_hit_rate < 0.7) {
      recommendations.push('Increase cache size for better performance');
      newSettings.prefetch_count = Math.min(
        this.settings.prefetch_count * 1.5,
        50,
      );
    }

    if (metrics.total_photos > 1000) {
      recommendations.push('Enable progressive loading for large galleries');
      newSettings.progressive_loading = true;
      newSettings.batch_size = Math.min(this.settings.batch_size, 25);
    }

    if (metrics.ai_processing_time_ms > 5000) {
      recommendations.push('Move AI processing to background for better UX');
      newSettings.ai_processing_priority = 'background';
    }

    return {
      recommendations,
      new_settings: newSettings,
      estimated_improvement: recommendations.length * 15, // Rough estimate
    };
  }

  // Helper methods
  private buildOptimizedIndex(photos: PhotoIndexEntry[]): PhotoIndexEntry[] {
    return photos
      .map((photo) => {
        // Calculate priority score based on various factors
        const priorityScore = this.calculatePriorityScore(photo);

        this.photoIndex.set(photo.id, {
          ...photo,
          priority_score: priorityScore,
        });

        return { ...photo, priority_score: priorityScore };
      })
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  private createOptimizedChunks(photos: PhotoIndexEntry[]): GalleryChunk[] {
    const chunks: GalleryChunk[] = [];

    for (let i = 0; i < photos.length; i += this.CHUNK_SIZE) {
      const chunkPhotos = photos.slice(i, i + this.CHUNK_SIZE);
      const chunkId = `chunk_${Math.floor(i / this.CHUNK_SIZE)}`;

      const chunk: GalleryChunk = {
        chunk_id: chunkId,
        start_index: i,
        end_index: i + chunkPhotos.length - 1,
        photos: chunkPhotos,
        loaded: false,
        loading: false,
        ai_processed: false,
        last_accessed: 0,
      };

      this.chunks.set(chunkId, chunk);
      chunks.push(chunk);
    }

    return chunks;
  }

  private calculatePriorityScore(photo: PhotoIndexEntry): number {
    let score = 50; // Base score

    // Quality boost
    if (photo.metadata.quality_score) {
      score += photo.metadata.quality_score * 10;
    }

    // Recently accessed boost
    if (photo.metadata.last_accessed) {
      const daysSinceAccess =
        (Date.now() - new Date(photo.metadata.last_accessed).getTime()) /
        (1000 * 60 * 60 * 24);
      score += Math.max(0, 20 - daysSinceAccess * 2);
    }

    // AI analysis status
    if (photo.metadata.ai_analysis_status === 'completed') {
      score += 10;
    }

    // Tags and categories
    score += photo.tags.length * 2;
    score += photo.categories.length * 3;

    return Math.min(100, Math.max(0, score));
  }

  private async preloadCriticalContent(
    chunk: GalleryChunk,
    bucketId: string,
  ): Promise<void> {
    const criticalPhotos = chunk.photos
      .filter((p) => p.priority_score > 70)
      .slice(0, 10); // Limit preloading

    await Promise.all(
      criticalPhotos.map((photo) => this.loadOptimizedPhoto(photo, 'high')),
    );
  }

  private scheduleBackgroundAIProcessing(photos: PhotoIndexEntry[]): void {
    const unprocessedPhotos = photos.filter(
      (p) => p.metadata.ai_analysis_status === 'pending',
    );

    // Process in small batches to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < unprocessedPhotos.length; i += batchSize) {
      const batch = unprocessedPhotos.slice(i, i + batchSize);

      setTimeout(() => {
        this.processAIAnalysisBatch(batch.map((p) => p.id));
      }, i * 1000); // Stagger processing
    }
  }

  private async loadOptimizedPhoto(
    photo: PhotoIndexEntry,
    quality: string,
  ): Promise<PhotoIndexEntry> {
    // Simulate optimized photo loading
    // In production, this would:
    // 1. Choose appropriate image size based on viewport
    // 2. Use progressive JPEG loading
    // 3. Apply compression optimizations
    // 4. Cache results appropriately

    const optimizedPhoto = { ...photo };

    // Cache the loaded photo
    this.setCachedPhoto(photo.id, optimizedPhoto, quality);

    return optimizedPhoto;
  }

  private getCachedPhoto(photoId: string): PhotoIndexEntry | null {
    const entry = this.cache.get(`photo_${photoId}`);
    if (!entry) return null;

    // Check TTL
    if (Date.now() > entry.created_at + entry.ttl) {
      this.cache.delete(`photo_${photoId}`);
      return null;
    }

    // Update access info
    entry.last_accessed = Date.now();
    entry.access_count++;

    return entry.data;
  }

  private setCachedPhoto(
    photoId: string,
    photo: PhotoIndexEntry,
    quality: string,
  ): void {
    if (!this.settings.cache_enabled) return;

    const key = `photo_${photoId}`;
    const sizeEstimate = this.estimatePhotoSize(photo, quality);

    // Check cache size limits
    if (this.getCacheSize() + sizeEstimate > this.MAX_CACHE_SIZE) {
      this.evictLeastUsedEntries();
    }

    const entry: CacheEntry = {
      key,
      data: photo,
      size_bytes: sizeEstimate,
      created_at: Date.now(),
      last_accessed: Date.now(),
      access_count: 1,
      ttl: 30 * 60 * 1000, // 30 minutes
    };

    this.cache.set(key, entry);
  }

  private async waitForChunkLoad(chunkId: string): Promise<any> {
    return new Promise((resolve) => {
      const checkLoading = () => {
        const chunk = this.chunks.get(chunkId);
        if (chunk && chunk.loaded) {
          resolve({
            photos: chunk.photos,
            cache_hits: 0,
            load_time_ms: 0,
          });
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  private async prefetchNextChunk(currentChunkId: string): void {
    const currentIndex = parseInt(currentChunkId.split('_')[1]);
    const nextChunkId = `chunk_${currentIndex + 1}`;

    if (this.chunks.has(nextChunkId)) {
      // Prefetch in background
      setTimeout(() => {
        this.loadChunk(nextChunkId, 'low');
      }, 500);
    }
  }

  private prioritizePhotosForAI(photoIds: string[]): string[] {
    return photoIds.sort((a, b) => {
      const photoA = this.photoIndex.get(a);
      const photoB = this.photoIndex.get(b);

      if (!photoA || !photoB) return 0;

      return photoB.priority_score - photoA.priority_score;
    });
  }

  private async processPhotoAIOptimized(
    photoId: string,
    analysisTypes: string[],
  ): Promise<void> {
    // Simulate optimized AI processing
    // In production, this would:
    // 1. Use appropriate model sizes based on device capabilities
    // 2. Batch similar operations
    // 3. Use GPU acceleration when available
    // 4. Cache intermediate results

    return new Promise((resolve) => {
      setTimeout(resolve, 800); // Simulate processing time
    });
  }

  private updatePhotoIndexWithAI(photoIds: string[]): void {
    photoIds.forEach((photoId) => {
      const photo = this.photoIndex.get(photoId);
      if (photo) {
        photo.metadata.ai_analysis_status = 'completed';
        // Would add actual AI results here
      }
    });
  }

  private matchesTextQuery(photo: PhotoIndexEntry, query: string): boolean {
    const searchText = [...photo.tags, ...photo.categories, photo.id]
      .join(' ')
      .toLowerCase();

    return searchText.includes(query.toLowerCase());
  }

  private calculateRelevanceScore(
    photo: PhotoIndexEntry,
    query: string,
    filters: any,
  ): number {
    let score = photo.priority_score;

    // Text matching boost
    if (query.trim()) {
      const searchText = [...photo.tags, ...photo.categories]
        .join(' ')
        .toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        score += 20;
      }
    }

    // Filter matching boost
    if (
      filters.categories?.some((cat: string) => photo.categories.includes(cat))
    ) {
      score += 15;
    }

    if (filters.tags?.some((tag: string) => photo.tags.includes(tag))) {
      score += 10;
    }

    return score;
  }

  private async preloadThumbnails(photos: PhotoIndexEntry[]): Promise<void> {
    // Preload thumbnails for visible search results
    const preloadPromises = photos
      .slice(0, 20)
      .map((photo) => this.loadOptimizedPhoto(photo, 'medium'));

    await Promise.all(preloadPromises);
  }

  private estimateMemoryUsage(): number {
    return this.getCacheSize() / (1024 * 1024); // Convert to MB
  }

  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size_bytes,
      0,
    );
  }

  private calculateCacheHitRate(): number {
    const totalRequests = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.access_count,
      0,
    );
    const cacheHits = this.cache.size;

    return totalRequests > 0 ? cacheHits / totalRequests : 0;
  }

  private calculateOptimizationScore(
    loadedChunks: number,
    totalChunks: number,
  ): number {
    const cacheEfficiency = this.calculateCacheHitRate() * 30;
    const loadingEfficiency =
      totalChunks > 0 ? (loadedChunks / totalChunks) * 30 : 30;
    const memoryEfficiency = Math.max(0, 40 - this.estimateMemoryUsage() / 10);

    return Math.min(
      100,
      cacheEfficiency + loadingEfficiency + memoryEfficiency,
    );
  }

  private estimatePhotoSize(photo: PhotoIndexEntry, quality: string): number {
    const baseSize = photo.metadata.file_size || 2000000; // 2MB default

    const qualityMultipliers = {
      low: 0.1,
      medium: 0.3,
      high: 0.7,
    };

    return (
      baseSize *
      (qualityMultipliers[quality as keyof typeof qualityMultipliers] || 0.3)
    );
  }

  private evictLeastUsedEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.last_accessed - b.last_accessed);

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove && entries.length > 0; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private startCacheCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (now > entry.created_at + entry.ttl) {
            this.cache.delete(key);
          }
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  private startMetricsCollection(): void {
    // Start collecting performance metrics
    setInterval(() => {
      // Would collect and store performance metrics
    }, 60 * 1000); // Every minute
  }

  /**
   * Cleanup method
   */
  dispose(): void {
    this.cache.clear();
    this.photoIndex.clear();
    this.chunks.clear();
    this.loadingQueue.clear();
    this.aiProcessingQueue.clear();
  }
}

// Export singleton instance
export const photoPerformanceOptimizer = new PhotoPerformanceOptimizer();
