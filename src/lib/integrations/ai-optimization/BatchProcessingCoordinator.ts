/**
 * Batch Processing Coordinator for AI Cost Optimization
 * Coordinates efficient batch processing across multiple AI providers
 * Optimizes scheduling for off-peak cost savings for wedding suppliers
 */

import { createClient } from '@supabase/supabase-js';
import { AIRequest, AIResponse } from './SmartCacheManager';
import { encrypt, decrypt } from '../security/encryption-service';

export interface AIRequestBatch {
  id: string;
  requests: AIRequest[];
  provider: 'openai' | 'anthropic' | 'google';
  priority: 'low' | 'medium' | 'high';
  scheduledFor: Date;
  maxConcurrency: number;
  timeoutMs: number;
  supplierId: string;
  estimatedCost: number;
  actualCost?: number;
}

export interface QueueResult {
  batchId: string;
  position: number;
  estimatedProcessTime: Date;
  costEstimate: number;
  optimizationApplied: string[];
}

export interface BatchResult {
  batchId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  responses: AIResponse[];
  totalCost: number;
  estimatedSavings: number;
  processingTimeMs: number;
  errors: string[];
}

export interface ProviderBatchResult {
  provider: string;
  batches: BatchResult[];
  totalSavings: number;
  avgProcessingTime: number;
  successRate: number;
}

export interface ScheduleOptimization {
  recommendedSchedule: Date;
  costMultiplier: number;
  availableSlots: Date[];
  peakHours: Date[];
  estimatedSavings: number;
}

export interface BatchProcessingConfig {
  maxBatchSize: number;
  maxConcurrency: number;
  timeoutMs: number;
  retryAttempts: number;
  offPeakHours: number[];
  peakCostMultiplier: number;
  weddingSeasonMultiplier: number;
}

export class BatchProcessingCoordinator {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private config: BatchProcessingConfig = {
    maxBatchSize: 50,
    maxConcurrency: 10,
    timeoutMs: 300000, // 5 minutes
    retryAttempts: 3,
    offPeakHours: [0, 1, 2, 3, 4, 5, 22, 23], // Late night/early morning
    peakCostMultiplier: 1.5,
    weddingSeasonMultiplier: 2.0,
  };

  private processingQueue: Map<string, AIRequestBatch> = new Map();
  private activeProcessing: Set<string> = new Set();

  /**
   * Queue AI requests for optimal batch processing
   */
  async queueForBatchProcessing(requests: AIRequest[]): Promise<QueueResult> {
    try {
      if (!requests.length) {
        throw new Error('No requests provided for batching');
      }

      const supplierId = requests[0].supplierId;
      const provider = this.selectOptimalProvider(requests);

      // Group requests by priority and context
      const batchGroups = this.groupRequestsForBatching(requests);
      const batch = await this.createOptimalBatch(
        batchGroups,
        provider,
        supplierId,
      );

      // Determine optimal scheduling
      const scheduleOpt = await this.optimizeSchedulingForCosts();
      batch.scheduledFor = scheduleOpt.recommendedSchedule;

      // Store batch in database
      const { data: storedBatch, error } = await this.supabase
        .from('ai_batch_queue')
        .insert({
          id: batch.id,
          supplier_id: batch.supplierId,
          provider: batch.provider,
          priority: batch.priority,
          request_count: batch.requests.length,
          encrypted_requests: encrypt(JSON.stringify(batch.requests)),
          scheduled_for: batch.scheduledFor.toISOString(),
          estimated_cost: batch.estimatedCost,
          max_concurrency: batch.maxConcurrency,
          timeout_ms: batch.timeoutMs,
          status: 'queued',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to queue batch: ${error.message}`);
      }

      // Add to processing queue
      this.processingQueue.set(batch.id, batch);

      // Calculate queue position
      const queuePosition = await this.calculateQueuePosition(batch);

      return {
        batchId: batch.id,
        position: queuePosition,
        estimatedProcessTime: batch.scheduledFor,
        costEstimate: batch.estimatedCost,
        optimizationApplied: [
          'off-peak-scheduling',
          'provider-optimization',
          'context-grouping',
          'priority-based-batching',
        ],
      };
    } catch (error) {
      console.error('Error queuing for batch processing:', error);
      throw error;
    }
  }

  /**
   * Process batch with optimal coordination for wedding suppliers
   */
  async processBatchOptimally(batch: AIRequestBatch): Promise<BatchResult> {
    try {
      const startTime = Date.now();
      this.activeProcessing.add(batch.id);

      // Update batch status
      await this.updateBatchStatus(batch.id, 'processing');

      const responses: AIResponse[] = [];
      const errors: string[] = [];
      let totalCost = 0;
      let successfulRequests = 0;
      let failedRequests = 0;

      // Process requests in optimal chunks
      const chunks = this.createProcessingChunks(
        batch.requests,
        batch.maxConcurrency,
      );

      for (const chunk of chunks) {
        try {
          const chunkResults = await this.processRequestChunk(
            chunk,
            batch.provider,
            batch.timeoutMs,
          );

          for (const result of chunkResults) {
            if (result.success) {
              responses.push(result.response!);
              totalCost += result.response!.usage.cost;
              successfulRequests++;
            } else {
              errors.push(result.error!);
              failedRequests++;
            }
          }
        } catch (chunkError) {
          errors.push(`Chunk processing failed: ${chunkError}`);
          failedRequests += chunk.length;
        }

        // Small delay between chunks to avoid rate limiting
        await this.sleep(100);
      }

      const processingTimeMs = Date.now() - startTime;
      const estimatedOriginalCost = this.calculateOriginalCost(batch.requests);
      const estimatedSavings = estimatedOriginalCost - totalCost;

      // Update batch with results
      await this.updateBatchResults(batch.id, {
        totalCost,
        successfulRequests,
        failedRequests,
        processingTimeMs,
        estimatedSavings,
        status: 'completed',
      });

      // Store responses
      await this.storeResponseResults(responses, batch.id);

      // Update optimization analytics
      await this.updateBatchAnalytics(batch, totalCost, estimatedSavings);

      this.activeProcessing.delete(batch.id);
      this.processingQueue.delete(batch.id);

      return {
        batchId: batch.id,
        totalRequests: batch.requests.length,
        successfulRequests,
        failedRequests,
        responses,
        totalCost,
        estimatedSavings,
        processingTimeMs,
        errors,
      };
    } catch (error) {
      this.activeProcessing.delete(batch.id);
      await this.updateBatchStatus(batch.id, 'failed');
      console.error('Error processing batch:', error);
      throw error;
    }
  }

  /**
   * Coordinate multi-provider batching for maximum efficiency
   */
  async coordinateMultiProviderBatching(): Promise<ProviderBatchResult[]> {
    try {
      // Get all queued batches ready for processing
      const { data: readyBatches, error } = await this.supabase
        .from('ai_batch_queue')
        .select('*')
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error || !readyBatches?.length) {
        return [];
      }

      // Group by provider
      const providerBatches = this.groupBatchesByProvider(readyBatches);
      const results: ProviderBatchResult[] = [];

      // Process each provider's batches concurrently
      const providerPromises = Object.entries(providerBatches).map(
        async ([provider, batches]) => {
          const batchResults: BatchResult[] = [];
          let totalSavings = 0;
          let totalProcessingTime = 0;
          let totalRequests = 0;
          let successfulRequests = 0;

          // Process batches for this provider
          for (const batchData of batches) {
            try {
              const batch = await this.reconstructBatch(batchData);
              const result = await this.processBatchOptimally(batch);

              batchResults.push(result);
              totalSavings += result.estimatedSavings;
              totalProcessingTime += result.processingTimeMs;
              totalRequests += result.totalRequests;
              successfulRequests += result.successfulRequests;
            } catch (error) {
              console.error(`Error processing batch ${batchData.id}:`, error);
            }
          }

          const avgProcessingTime =
            totalProcessingTime / batchResults.length || 0;
          const successRate =
            totalRequests > 0 ? successfulRequests / totalRequests : 0;

          return {
            provider,
            batches: batchResults,
            totalSavings,
            avgProcessingTime,
            successRate,
          };
        },
      );

      const providerResults = await Promise.all(providerPromises);
      results.push(...providerResults);

      // Log coordination results
      await this.logCoordinationResults(results);

      return results;
    } catch (error) {
      console.error('Error coordinating multi-provider batching:', error);
      throw error;
    }
  }

  /**
   * Optimize scheduling for cost savings during off-peak hours
   */
  async optimizeSchedulingForCosts(): Promise<ScheduleOptimization> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const isOffPeak = this.config.offPeakHours.includes(currentHour);
      const isWeddingSeason = this.isWeddingSeason(now);

      let costMultiplier = 1.0;
      if (!isOffPeak) {
        costMultiplier *= this.config.peakCostMultiplier;
      }
      if (isWeddingSeason) {
        costMultiplier *= this.config.weddingSeasonMultiplier;
      }

      // Calculate next available off-peak slots
      const availableSlots: Date[] = [];
      const peakHours: Date[] = [];

      for (let i = 0; i < 48; i++) {
        // Next 48 hours
        const slotTime = new Date(now.getTime() + i * 60 * 60 * 1000);
        const slotHour = slotTime.getHours();

        if (this.config.offPeakHours.includes(slotHour)) {
          availableSlots.push(slotTime);
        } else {
          peakHours.push(slotTime);
        }
      }

      // Recommend immediate processing if off-peak, otherwise next off-peak slot
      const recommendedSchedule =
        isOffPeak && !isWeddingSeason ? now : availableSlots[0] || now;

      const originalCost = 1000; // Base cost estimate
      const optimizedCost = originalCost * costMultiplier;
      const estimatedSavings = originalCost - optimizedCost;

      return {
        recommendedSchedule,
        costMultiplier,
        availableSlots: availableSlots.slice(0, 10), // Next 10 slots
        peakHours: peakHours.slice(0, 10),
        estimatedSavings: Math.max(0, estimatedSavings),
      };
    } catch (error) {
      console.error('Error optimizing scheduling:', error);
      throw error;
    }
  }

  /**
   * Select optimal AI provider based on request characteristics
   */
  private selectOptimalProvider(
    requests: AIRequest[],
  ): 'openai' | 'anthropic' | 'google' {
    // Analyze request characteristics
    const contexts = requests.map((r) => r.context);
    const priorities = requests.map((r) => r.priority);
    const avgLength =
      requests.reduce((sum, r) => sum + r.content.length, 0) / requests.length;

    // Provider selection logic based on wedding supplier needs
    const photographyRequests = contexts.filter(
      (c) => c === 'photography',
    ).length;
    const planningRequests = contexts.filter((c) => c === 'planning').length;
    const highPriorityRequests = priorities.filter((p) => p === 'high').length;

    // OpenAI for photography and creative content
    if (photographyRequests > requests.length * 0.4 || avgLength > 2000) {
      return 'openai';
    }

    // Anthropic for planning and structured content
    if (
      planningRequests > requests.length * 0.4 ||
      highPriorityRequests > requests.length * 0.3
    ) {
      return 'anthropic';
    }

    // Google for general purpose and cost optimization
    return 'google';
  }

  /**
   * Group requests for optimal batching
   */
  private groupRequestsForBatching(
    requests: AIRequest[],
  ): Map<string, AIRequest[]> {
    const groups = new Map<string, AIRequest[]>();

    for (const request of requests) {
      const key = `${request.context}-${request.priority}-${request.provider}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(request);
    }

    return groups;
  }

  /**
   * Create optimal batch from grouped requests
   */
  private async createOptimalBatch(
    groups: Map<string, AIRequest[]>,
    provider: string,
    supplierId: string,
  ): Promise<AIRequestBatch> {
    const allRequests = Array.from(groups.values()).flat();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine batch priority (highest priority of all requests)
    const priorities = allRequests.map((r) => r.priority);
    const batchPriority = priorities.includes('high')
      ? 'high'
      : priorities.includes('medium')
        ? 'medium'
        : 'low';

    // Estimate cost
    const estimatedCost = allRequests.reduce((sum, req) => {
      const tokenEstimate = req.content.length / 4; // Rough token estimate
      const costPerToken = this.getCostPerToken(provider as any, req.context);
      return sum + tokenEstimate * costPerToken;
    }, 0);

    return {
      id: batchId,
      requests: allRequests.slice(0, this.config.maxBatchSize),
      provider: provider as any,
      priority: batchPriority as any,
      scheduledFor: new Date(),
      maxConcurrency: this.config.maxConcurrency,
      timeoutMs: this.config.timeoutMs,
      supplierId,
      estimatedCost,
    };
  }

  /**
   * Process a chunk of requests concurrently
   */
  private async processRequestChunk(
    requests: AIRequest[],
    provider: string,
    timeoutMs: number,
  ): Promise<
    Array<{ success: boolean; response?: AIResponse; error?: string }>
  > {
    const promises = requests.map(async (request) => {
      try {
        const response = await this.processIndividualRequest(
          request,
          provider,
          timeoutMs,
        );
        return { success: true, response };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Process individual AI request (placeholder - implement actual AI provider calls)
   */
  private async processIndividualRequest(
    request: AIRequest,
    provider: string,
    timeoutMs: number,
  ): Promise<AIResponse> {
    // This is a placeholder - implement actual AI provider integration
    await this.sleep(Math.random() * 1000 + 500); // Simulate processing time

    const tokenCount = Math.ceil(request.content.length / 4);
    const cost =
      tokenCount * this.getCostPerToken(provider as any, request.context);

    return {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId: request.id,
      content: `Optimized AI response for ${request.context} context`,
      provider,
      model: request.model,
      usage: {
        promptTokens: tokenCount,
        completionTokens: tokenCount * 2,
        totalTokens: tokenCount * 3,
        cost,
      },
      quality_score: 0.9,
      cached: false,
      timestamp: new Date(),
    };
  }

  /**
   * Get cost per token for provider and context
   */
  private getCostPerToken(
    provider: 'openai' | 'anthropic' | 'google',
    context: string,
  ): number {
    const baseCosts = {
      openai: 0.001,
      anthropic: 0.0008,
      google: 0.0005,
    };

    const contextMultipliers = {
      photography: 1.2,
      venue: 1.0,
      catering: 1.1,
      planning: 1.15,
      general: 1.0,
    };

    return (
      baseCosts[provider] *
      (contextMultipliers[context as keyof typeof contextMultipliers] || 1.0)
    );
  }

  /**
   * Check if current time is wedding season
   */
  private isWeddingSeason(date: Date): boolean {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    // Wedding season: May-October (months 5-10)
    return month >= 5 && month <= 10;
  }

  /**
   * Create processing chunks with optimal concurrency
   */
  private createProcessingChunks<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate original cost without optimization
   */
  private calculateOriginalCost(requests: AIRequest[]): number {
    return requests.reduce((sum, req) => {
      const tokenEstimate = req.content.length / 4;
      const costPerToken =
        this.getCostPerToken(req.provider, req.context) * 1.5; // 50% higher without optimization
      return sum + tokenEstimate * costPerToken;
    }, 0);
  }

  /**
   * Group batches by provider
   */
  private groupBatchesByProvider(batches: any[]): Record<string, any[]> {
    return batches.reduce((groups, batch) => {
      const provider = batch.provider;
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(batch);
      return groups;
    }, {});
  }

  /**
   * Reconstruct batch from database data
   */
  private async reconstructBatch(batchData: any): Promise<AIRequestBatch> {
    const requests = JSON.parse(decrypt(batchData.encrypted_requests));

    return {
      id: batchData.id,
      requests,
      provider: batchData.provider,
      priority: batchData.priority,
      scheduledFor: new Date(batchData.scheduled_for),
      maxConcurrency: batchData.max_concurrency,
      timeoutMs: batchData.timeout_ms,
      supplierId: batchData.supplier_id,
      estimatedCost: batchData.estimated_cost,
    };
  }

  /**
   * Utility functions
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async calculateQueuePosition(batch: AIRequestBatch): Promise<number> {
    const { count } = await this.supabase
      .from('ai_batch_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')
      .gte(
        'priority',
        batch.priority === 'high' ? 3 : batch.priority === 'medium' ? 2 : 1,
      )
      .lte('created_at', new Date().toISOString());

    return (count || 0) + 1;
  }

  private async updateBatchStatus(
    batchId: string,
    status: string,
  ): Promise<void> {
    await this.supabase
      .from('ai_batch_queue')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', batchId);
  }

  private async updateBatchResults(
    batchId: string,
    results: any,
  ): Promise<void> {
    await this.supabase
      .from('ai_batch_queue')
      .update({
        ...results,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId);
  }

  private async storeResponseResults(
    responses: AIResponse[],
    batchId: string,
  ): Promise<void> {
    const responseInserts = responses.map((response) => ({
      id: response.id,
      batch_id: batchId,
      request_id: response.requestId,
      encrypted_content: encrypt(response.content),
      provider: response.provider,
      model: response.model,
      usage_metrics: JSON.stringify(response.usage),
      quality_score: response.quality_score,
      created_at: response.timestamp.toISOString(),
    }));

    await this.supabase.from('ai_batch_responses').insert(responseInserts);
  }

  private async updateBatchAnalytics(
    batch: AIRequestBatch,
    cost: number,
    savings: number,
  ): Promise<void> {
    await this.supabase.from('ai_batch_analytics').upsert(
      {
        supplier_id: batch.supplierId,
        date: new Date().toISOString().split('T')[0],
        provider: batch.provider,
        total_batches: this.supabase.rpc('increment_counter'),
        total_requests: batch.requests.length,
        total_cost: cost,
        total_savings: savings,
        avg_processing_time: 0, // Will be calculated separately
        success_rate: 0, // Will be calculated separately
      },
      {
        onConflict: 'supplier_id,date,provider',
      },
    );
  }

  private async logCoordinationResults(
    results: ProviderBatchResult[],
  ): Promise<void> {
    const logEntry = {
      coordination_id: `coord_${Date.now()}`,
      providers_processed: results.length,
      total_batches: results.reduce((sum, r) => sum + r.batches.length, 0),
      total_savings: results.reduce((sum, r) => sum + r.totalSavings, 0),
      avg_success_rate:
        results.reduce((sum, r) => sum + r.successRate, 0) / results.length,
      created_at: new Date().toISOString(),
    };

    await this.supabase.from('ai_coordination_log').insert(logEntry);
  }
}
