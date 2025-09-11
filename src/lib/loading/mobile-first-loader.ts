/**
 * WS-173 Team D Round 2: Mobile-First Loading Strategies
 *
 * Critical path optimization for wedding suppliers on slow connections
 * Implements 3G-first loading with progressive enhancement
 */

import React from 'react';
import { networkLoader } from '../performance/network-adaptive-loader';
import { cacheManager } from '../performance/advanced-cache-manager';

export interface LoadingPriority {
  level: 'critical' | 'important' | 'normal' | 'low' | 'background';
  timeout: number;
  fallbackStrategy: 'cache' | 'minimal' | 'skip' | 'retry';
  compressionLevel: 'none' | 'light' | 'aggressive';
}

export interface ResourceLoadingConfig {
  url: string;
  priority: LoadingPriority;
  dependencies?: string[];
  validator?: (data: any) => boolean;
  transformer?: (data: any) => any;
}

export interface WeddingWorkflowContext {
  supplierId: string;
  weddingId: string;
  venueId?: string;
  eventPhase: 'pre-event' | 'ceremony' | 'reception' | 'cleanup' | 'post-event';
  urgencyLevel: 'emergency' | 'high' | 'normal' | 'low';
  connectionType: '2g' | '3g' | '4g' | 'wifi' | 'offline';
}

class MobileFirstLoader {
  private loadingQueue: Map<string, ResourceLoadingConfig> = new Map();
  private loadedResources: Map<string, any> = new Map();
  private failedResources: Set<string> = new Set();
  private loadingMetrics: Map<string, { startTime: number; endTime?: number }> =
    new Map();

  /**
   * Define loading priorities based on wedding supplier workflows
   */
  private static WEDDING_LOADING_PRIORITIES: Record<string, LoadingPriority> = {
    // CRITICAL (0-500ms): Essential for immediate supplier coordination
    'wedding-basic-info': {
      level: 'critical',
      timeout: 300,
      fallbackStrategy: 'cache',
      compressionLevel: 'aggressive',
    },
    'supplier-contacts': {
      level: 'critical',
      timeout: 400,
      fallbackStrategy: 'cache',
      compressionLevel: 'aggressive',
    },
    'emergency-protocols': {
      level: 'critical',
      timeout: 200,
      fallbackStrategy: 'cache',
      compressionLevel: 'none',
    },

    // IMPORTANT (500-1000ms): Core coordination features
    'photo-groups-summary': {
      level: 'important',
      timeout: 800,
      fallbackStrategy: 'cache',
      compressionLevel: 'light',
    },
    'guest-assignments-current': {
      level: 'important',
      timeout: 700,
      fallbackStrategy: 'minimal',
      compressionLevel: 'light',
    },
    'venue-layout-basic': {
      level: 'important',
      timeout: 900,
      fallbackStrategy: 'cache',
      compressionLevel: 'aggressive',
    },

    // NORMAL (1000-2000ms): Enhanced features
    'seating-arrangements': {
      level: 'normal',
      timeout: 1500,
      fallbackStrategy: 'skip',
      compressionLevel: 'light',
    },
    'photo-thumbnails': {
      level: 'normal',
      timeout: 2000,
      fallbackStrategy: 'skip',
      compressionLevel: 'aggressive',
    },

    // LOW (2000ms+): Nice-to-have features
    'historical-data': {
      level: 'low',
      timeout: 5000,
      fallbackStrategy: 'skip',
      compressionLevel: 'aggressive',
    },

    // BACKGROUND: Load when resources available
    'analytics-data': {
      level: 'background',
      timeout: 10000,
      fallbackStrategy: 'skip',
      compressionLevel: 'aggressive',
    },
  };

  /**
   * Load resources based on wedding context and connection speed
   */
  async loadForWeddingContext(context: WeddingWorkflowContext): Promise<any> {
    const startTime = performance.now();

    // Determine loading strategy based on connection and urgency
    const loadingStrategy = this.determineLoadingStrategy(context);

    // Build resource loading queue based on wedding phase and urgency
    const resourceQueue = this.buildResourceQueue(context, loadingStrategy);

    // Execute loading in priority order
    const results = await this.executeLoadingSequence(resourceQueue, context);

    // Log performance metrics
    const totalTime = performance.now() - startTime;
    this.recordLoadingMetrics('wedding-context-load', totalTime, context);

    return results;
  }

  /**
   * Determine optimal loading strategy based on context
   */
  private determineLoadingStrategy(context: WeddingWorkflowContext): {
    maxConcurrentLoads: number;
    priorityFilter: LoadingPriority['level'][];
    timeoutMultiplier: number;
  } {
    // Emergency situations - load only critical resources immediately
    if (context.urgencyLevel === 'emergency') {
      return {
        maxConcurrentLoads: 1,
        priorityFilter: ['critical'],
        timeoutMultiplier: 0.5,
      };
    }

    // Adjust based on connection speed
    switch (context.connectionType) {
      case '2g':
      case 'offline':
        return {
          maxConcurrentLoads: 1,
          priorityFilter: ['critical', 'important'],
          timeoutMultiplier: 2.0,
        };

      case '3g':
        return {
          maxConcurrentLoads: 2,
          priorityFilter: ['critical', 'important', 'normal'],
          timeoutMultiplier: 1.5,
        };

      case '4g':
      case 'wifi':
      default:
        return {
          maxConcurrentLoads: 4,
          priorityFilter: ['critical', 'important', 'normal', 'low'],
          timeoutMultiplier: 1.0,
        };
    }
  }

  /**
   * Build resource loading queue based on wedding phase
   */
  private buildResourceQueue(
    context: WeddingWorkflowContext,
    strategy: any,
  ): ResourceLoadingConfig[] {
    const baseResources = this.getBaseResourcesForPhase(context.eventPhase);
    const contextualResources = this.getContextualResources(context);

    // Combine and filter based on priority
    const allResources = [...baseResources, ...contextualResources]
      .filter((resource) =>
        strategy.priorityFilter.includes(resource.priority.level),
      )
      .map((resource) => ({
        ...resource,
        priority: {
          ...resource.priority,
          timeout: resource.priority.timeout * strategy.timeoutMultiplier,
        },
      }));

    // Sort by priority and return
    return this.sortResourcesByPriority(allResources);
  }

  /**
   * Get base resources required for specific wedding phase
   */
  private getBaseResourcesForPhase(
    phase: WeddingWorkflowContext['eventPhase'],
  ): ResourceLoadingConfig[] {
    const baseUrl = `/api/wedding`;

    switch (phase) {
      case 'pre-event':
        return [
          {
            url: `${baseUrl}/basic-info`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'wedding-basic-info'
              ],
            validator: (data) => data?.weddingId && data?.venue,
          },
          {
            url: `${baseUrl}/supplier-contacts`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES['supplier-contacts'],
          },
          {
            url: `${baseUrl}/venue-layout`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'venue-layout-basic'
              ],
          },
        ];

      case 'ceremony':
        return [
          {
            url: `${baseUrl}/basic-info`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'wedding-basic-info'
              ],
          },
          {
            url: `${baseUrl}/emergency-contacts`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'emergency-protocols'
              ],
          },
          {
            url: `${baseUrl}/photo-groups/active`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'photo-groups-summary'
              ],
          },
          {
            url: `${baseUrl}/guest-assignments/current`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'guest-assignments-current'
              ],
          },
        ];

      case 'reception':
        return [
          {
            url: `${baseUrl}/seating-current`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'seating-arrangements'
              ],
          },
          {
            url: `${baseUrl}/photo-groups/active`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'photo-groups-summary'
              ],
          },
          {
            url: `${baseUrl}/supplier-contacts`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES['supplier-contacts'],
          },
        ];

      case 'cleanup':
      case 'post-event':
        return [
          {
            url: `${baseUrl}/completion-checklist`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'wedding-basic-info'
              ],
          },
          {
            url: `${baseUrl}/photo-groups/final`,
            priority:
              MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
                'photo-groups-summary'
              ],
          },
        ];

      default:
        return [];
    }
  }

  /**
   * Get contextual resources based on specific wedding context
   */
  private getContextualResources(
    context: WeddingWorkflowContext,
  ): ResourceLoadingConfig[] {
    const contextualResources: ResourceLoadingConfig[] = [];

    // Add venue-specific resources if available
    if (context.venueId) {
      contextualResources.push({
        url: `/api/venue/${context.venueId}/layout`,
        priority:
          MobileFirstLoader.WEDDING_LOADING_PRIORITIES['venue-layout-basic'],
      });
    }

    // Add supplier-specific resources
    contextualResources.push({
      url: `/api/supplier/${context.supplierId}/active-tasks`,
      priority:
        MobileFirstLoader.WEDDING_LOADING_PRIORITIES[
          'guest-assignments-current'
        ],
    });

    return contextualResources;
  }

  /**
   * Sort resources by loading priority
   */
  private sortResourcesByPriority(
    resources: ResourceLoadingConfig[],
  ): ResourceLoadingConfig[] {
    const priorityOrder = [
      'critical',
      'important',
      'normal',
      'low',
      'background',
    ];

    return resources.sort((a, b) => {
      const aPriorityIndex = priorityOrder.indexOf(a.priority.level);
      const bPriorityIndex = priorityOrder.indexOf(b.priority.level);

      if (aPriorityIndex !== bPriorityIndex) {
        return aPriorityIndex - bPriorityIndex;
      }

      // Sort by timeout for same priority
      return a.priority.timeout - b.priority.timeout;
    });
  }

  /**
   * Execute loading sequence with batching and error handling
   */
  private async executeLoadingSequence(
    resources: ResourceLoadingConfig[],
    context: WeddingWorkflowContext,
  ): Promise<any> {
    const results: Record<string, any> = {};
    const errors: Record<string, Error> = {};

    // Group resources by priority level for batched loading
    const resourceBatches = this.groupResourcesByPriority(resources);

    // Execute batches in priority order
    for (const [priority, batch] of resourceBatches) {
      const batchResults = await this.loadResourceBatch(batch, context);

      // Merge successful results
      Object.assign(results, batchResults.success);
      Object.assign(errors, batchResults.errors);

      // Check if critical resources failed - abort if so
      if (
        priority === 'critical' &&
        Object.keys(batchResults.errors).length > 0
      ) {
        console.warn('Critical resources failed to load:', batchResults.errors);

        // Try fallback strategies for critical resources
        const fallbackResults = await this.handleCriticalResourceFailure(
          batch,
          context,
        );
        Object.assign(results, fallbackResults);
      }
    }

    return { data: results, errors, context };
  }

  /**
   * Group resources by priority for batch loading
   */
  private groupResourcesByPriority(
    resources: ResourceLoadingConfig[],
  ): Map<string, ResourceLoadingConfig[]> {
    const groups = new Map<string, ResourceLoadingConfig[]>();

    resources.forEach((resource) => {
      const priority = resource.priority.level;
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push(resource);
    });

    return groups;
  }

  /**
   * Load a batch of resources concurrently
   */
  private async loadResourceBatch(
    resources: ResourceLoadingConfig[],
    context: WeddingWorkflowContext,
  ): Promise<{ success: Record<string, any>; errors: Record<string, Error> }> {
    const success: Record<string, any> = {};
    const errors: Record<string, Error> = {};

    // Load resources concurrently with timeout
    const loadPromises = resources.map(async (resource) => {
      const resourceId = this.getResourceId(resource.url);
      this.loadingMetrics.set(resourceId, { startTime: performance.now() });

      try {
        const data = await this.loadResource(resource, context);
        success[resourceId] = data;

        // Record success metrics
        const metrics = this.loadingMetrics.get(resourceId);
        if (metrics) {
          metrics.endTime = performance.now();
        }
      } catch (error) {
        errors[resourceId] = error as Error;
        this.failedResources.add(resourceId);
      }
    });

    await Promise.allSettled(loadPromises);

    return { success, errors };
  }

  /**
   * Load individual resource with fallback strategies
   */
  private async loadResource(
    resource: ResourceLoadingConfig,
    context: WeddingWorkflowContext,
  ): Promise<any> {
    const resourceId = this.getResourceId(resource.url);

    // Check cache first
    const cached = await cacheManager.get(resourceId);
    if (cached) {
      return cached;
    }

    // Try network load with timeout
    try {
      const response = await Promise.race([
        networkLoader.loadResource(resource.url, 'high'),
        this.createTimeoutPromise(resource.priority.timeout),
      ]);

      const data = await response.json();

      // Validate data if validator provided
      if (resource.validator && !resource.validator(data)) {
        throw new Error(`Invalid data structure for ${resourceId}`);
      }

      // Transform data if transformer provided
      const finalData = resource.transformer
        ? resource.transformer(data)
        : data;

      // Cache the result
      const cacheStrategy =
        cacheManager.getCacheStrategyForWeddingData(resourceId);
      await cacheManager.set(resourceId, finalData, cacheStrategy);

      return finalData;
    } catch (error) {
      // Handle with fallback strategy
      return this.handleResourceLoadFailure(resource, context, error);
    }
  }

  /**
   * Handle resource loading failure with fallback strategies
   */
  private async handleResourceLoadFailure(
    resource: ResourceLoadingConfig,
    context: WeddingWorkflowContext,
    error: any,
  ): Promise<any> {
    const resourceId = this.getResourceId(resource.url);

    switch (resource.priority.fallbackStrategy) {
      case 'cache':
        // Try to get any cached version, even if expired
        const cached = await cacheManager.get(resourceId);
        if (cached) {
          return cached;
        }
        break;

      case 'minimal':
        return this.getMinimalDataForResource(resourceId, context);

      case 'retry':
        // Retry once with longer timeout
        if (!this.failedResources.has(resourceId)) {
          resource.priority.timeout *= 2;
          return this.loadResource(resource, context);
        }
        break;

      case 'skip':
      default:
        // Return null/empty data
        return null;
    }

    throw error;
  }

  /**
   * Handle critical resource failure
   */
  private async handleCriticalResourceFailure(
    criticalResources: ResourceLoadingConfig[],
    context: WeddingWorkflowContext,
  ): Promise<Record<string, any>> {
    const fallbackResults: Record<string, any> = {};

    // For each failed critical resource, try emergency fallbacks
    for (const resource of criticalResources) {
      const resourceId = this.getResourceId(resource.url);

      if (this.failedResources.has(resourceId)) {
        // Try emergency local storage
        const emergency = localStorage.getItem(`emergency_${resourceId}`);
        if (emergency) {
          try {
            fallbackResults[resourceId] = JSON.parse(emergency);
          } catch (e) {
            // Generate minimal emergency data
            fallbackResults[resourceId] = this.generateEmergencyData(
              resourceId,
              context,
            );
          }
        } else {
          fallbackResults[resourceId] = this.generateEmergencyData(
            resourceId,
            context,
          );
        }
      }
    }

    return fallbackResults;
  }

  /**
   * Generate minimal emergency data when all loading fails
   */
  private generateEmergencyData(
    resourceId: string,
    context: WeddingWorkflowContext,
  ): any {
    switch (resourceId) {
      case 'wedding-basic-info':
        return {
          weddingId: context.weddingId,
          status: 'emergency-mode',
          venue: 'Loading...',
          date: new Date().toISOString(),
        };

      case 'supplier-contacts':
        return {
          emergency: '911',
          venue: 'Contact venue directly',
          coordinator: 'Check your contacts',
        };

      default:
        return {
          status: 'offline',
          message: 'Data unavailable in offline mode',
        };
    }
  }

  /**
   * Get minimal data for resource when full loading fails
   */
  private getMinimalDataForResource(
    resourceId: string,
    context: WeddingWorkflowContext,
  ): any {
    // Return basic structure with loading placeholders
    return {
      id: resourceId,
      weddingId: context.weddingId,
      status: 'minimal-mode',
      data: 'Loading...',
      timestamp: Date.now(),
    };
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Resource loading timeout')), timeout);
    });
  }

  /**
   * Get resource ID from URL
   */
  private getResourceId(url: string): string {
    return url.split('/').slice(-2).join('-');
  }

  /**
   * Record loading metrics
   */
  private recordLoadingMetrics(
    operation: string,
    duration: number,
    context: WeddingWorkflowContext,
  ): void {
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        '/api/performance/loading-metrics',
        JSON.stringify({
          operation,
          duration,
          context: {
            eventPhase: context.eventPhase,
            urgencyLevel: context.urgencyLevel,
            connectionType: context.connectionType,
          },
          timestamp: Date.now(),
        }),
      );
    }
  }

  /**
   * Prefetch resources for predicted workflow paths
   */
  async prefetchForWorkflow(
    currentContext: WeddingWorkflowContext,
    predictedNextPhase: WeddingWorkflowContext['eventPhase'],
  ): Promise<void> {
    const nextContext = { ...currentContext, eventPhase: predictedNextPhase };
    const nextResources = this.getBaseResourcesForPhase(predictedNextPhase);

    // Prefetch with low priority in background
    requestIdleCallback(async () => {
      for (const resource of nextResources) {
        if (resource.priority.level !== 'critical') {
          try {
            await this.loadResource(resource, nextContext);
          } catch (error) {
            // Silent fail for prefetch
            console.debug('Prefetch failed:', resource.url, error);
          }
        }
      }
    });
  }

  /**
   * Get loading performance metrics
   */
  getLoadingMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    this.loadingMetrics.forEach((timing, resourceId) => {
      if (timing.endTime) {
        metrics[resourceId] = {
          duration: timing.endTime - timing.startTime,
          successful: !this.failedResources.has(resourceId),
        };
      }
    });

    return metrics;
  }

  /**
   * Clear metrics and failed resources
   */
  clearMetrics(): void {
    this.loadingMetrics.clear();
    this.failedResources.clear();
  }
}

// Export singleton instance
export const mobileFirstLoader = new MobileFirstLoader();

// React hook for using mobile-first loading
export function useMobileFirstLoading(context: WeddingWorkflowContext) {
  const [loadingState, setLoadingState] = React.useState<{
    isLoading: boolean;
    data: any;
    errors: Record<string, Error>;
    phase: string;
  }>({
    isLoading: true,
    data: {},
    errors: {},
    phase: 'initializing',
  });

  React.useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!mounted) return;

      setLoadingState((prev) => ({
        ...prev,
        isLoading: true,
        phase: 'loading',
      }));

      try {
        const result = await mobileFirstLoader.loadForWeddingContext(context);

        if (mounted) {
          setLoadingState({
            isLoading: false,
            data: result.data,
            errors: result.errors,
            phase: 'completed',
          });
        }
      } catch (error) {
        if (mounted) {
          setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            errors: { ...prev.errors, general: error as Error },
            phase: 'error',
          }));
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [context.weddingId, context.eventPhase, context.urgencyLevel]);

  // Prefetch for predicted next phase
  const prefetchNextPhase = React.useCallback(
    (nextPhase: WeddingWorkflowContext['eventPhase']) => {
      mobileFirstLoader.prefetchForWorkflow(context, nextPhase);
    },
    [context],
  );

  return {
    ...loadingState,
    prefetchNextPhase,
    metrics: mobileFirstLoader.getLoadingMetrics(),
  };
}
