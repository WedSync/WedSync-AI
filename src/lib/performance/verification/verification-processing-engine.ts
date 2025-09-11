import { Worker } from 'worker_threads';
import { createHash } from 'crypto';
import { HighPerformanceOCR } from './high-performance-ocr';
import { DocumentPerformanceMonitor } from './document-performance-monitor';
import { VerificationCacheManager } from './verification-cache-manager';
import { ProcessingWorkerPool } from './processing-worker-pool';
import { DocumentOptimizer } from './document-optimizer';

export interface VerificationDocument {
  id: string;
  supplierId: string;
  type:
    | 'business_license'
    | 'insurance_certificate'
    | 'certification'
    | 'other';
  buffer: Buffer;
  filename: string;
  mimeType: string;
  uploadedAt: Date;
}

export interface ProcessingOptions {
  priority: 'high' | 'normal' | 'low';
  timeout: number;
  enableCaching: boolean;
  enableParallelProcessing: boolean;
  ocrLanguages: string[];
  confidenceThreshold: number;
}

export interface ProcessingResult {
  documentId: string;
  success: boolean;
  processingTimeMs: number;
  extractedData: any;
  confidence: number;
  errors?: string[];
  warningFlags?: string[];
  metadata: ProcessingMetadata;
}

export interface ProcessingMetadata {
  processingStartTime: Date;
  processingEndTime: Date;
  workerPoolId: string;
  cacheHit: boolean;
  memoryUsageMB: number;
  ocrEngine: string;
  preprocessingSteps: string[];
}

export interface LoadBalanceResult {
  assignedWorker: string;
  estimatedCompletionTime: number;
  queuePosition: number;
}

export class VerificationProcessingEngine {
  private workerPool: ProcessingWorkerPool;
  private ocrEngine: HighPerformanceOCR;
  private metricsCollector: DocumentPerformanceMonitor;
  private cacheManager: VerificationCacheManager;
  private documentOptimizer: DocumentOptimizer;
  private isInitialized: boolean = false;

  constructor() {
    this.workerPool = new ProcessingWorkerPool({
      maxWorkers: 8,
      maxConcurrentTasks: 32,
      idleTimeout: 300000, // 5 minutes
    });

    this.ocrEngine = new HighPerformanceOCR();
    this.metricsCollector = new DocumentPerformanceMonitor();
    this.cacheManager = new VerificationCacheManager();
    this.documentOptimizer = new DocumentOptimizer();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await Promise.all([
      this.workerPool.initialize(),
      this.ocrEngine.initialize(),
      this.metricsCollector.initialize(),
      this.cacheManager.initialize(),
      this.documentOptimizer.initialize(),
    ]);

    this.isInitialized = true;
  }

  async processVerificationDocuments(
    documents: VerificationDocument[],
    options: ProcessingOptions = {
      priority: 'normal',
      timeout: 30000,
      enableCaching: true,
      enableParallelProcessing: true,
      ocrLanguages: ['eng'],
      confidenceThreshold: 0.85,
    },
  ): Promise<ProcessingResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const processingId = this.generateProcessingId();

    // Track processing start
    await this.metricsCollector.trackProcessingStart(
      processingId,
      documents.length,
    );

    try {
      // Categorize documents by complexity for optimal routing
      const documentCategories = await this.categorizeDocuments(documents);

      // Process each category with appropriate strategy
      const results = await this.processDocumentCategories(
        documentCategories,
        options,
      );

      // Track successful completion
      const totalTime = Date.now() - startTime;
      await this.metricsCollector.trackProcessingCompletion(
        processingId,
        totalTime,
        results,
      );

      return results;
    } catch (error) {
      // Track processing failure
      await this.metricsCollector.trackProcessingFailure(
        processingId,
        error as Error,
      );
      throw error;
    }
  }

  async optimizeDocumentForOCR(
    document: VerificationDocument,
  ): Promise<VerificationDocument> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateDocumentHash(document.buffer);
      const cached = await this.cacheManager.getCachedProcessingResult(
        cacheKey,
        await this.getProcessingVersion(),
      );

      if (cached) {
        return cached as VerificationDocument;
      }

      // Apply AI-powered preprocessing
      const optimizedBuffer = await this.documentOptimizer.optimizeForOCR(
        document.buffer,
        document.mimeType,
        {
          enhanceContrast: true,
          correctOrientation: true,
          removeNoise: true,
          normalizeSize: true,
        },
      );

      const optimizedDocument = {
        ...document,
        buffer: optimizedBuffer,
      };

      // Cache the optimized result
      await this.cacheManager.cacheProcessingResult(
        cacheKey,
        optimizedDocument,
        3600000, // 1 hour TTL
      );

      return optimizedDocument;
    } catch (error) {
      console.error('Document optimization failed:', error);
      return document; // Return original if optimization fails
    }
  }

  private async balanceProcessingLoad(
    processingQueue: ProcessingJob[],
  ): Promise<LoadBalanceResult[]> {
    const workerStats = await this.workerPool.getWorkerStatistics();
    const results: LoadBalanceResult[] = [];

    for (const job of processingQueue) {
      // Find optimal worker based on current load and document complexity
      const optimalWorker = this.selectOptimalWorker(workerStats, job);

      const result: LoadBalanceResult = {
        assignedWorker: optimalWorker.id,
        estimatedCompletionTime: this.estimateProcessingTime(
          job,
          optimalWorker,
        ),
        queuePosition: optimalWorker.queueLength,
      };

      results.push(result);

      // Update worker stats for next allocation
      optimalWorker.queueLength++;
    }

    return results;
  }

  private async categorizeDocuments(
    documents: VerificationDocument[],
  ): Promise<DocumentCategories> {
    const fastLane: VerificationDocument[] = [];
    const standardLane: VerificationDocument[] = [];
    const batchLane: VerificationDocument[] = [];

    for (const doc of documents) {
      const complexity = await this.assessDocumentComplexity(doc);

      if (complexity.score < 0.3) {
        fastLane.push(doc);
      } else if (complexity.score < 0.7) {
        standardLane.push(doc);
      } else {
        batchLane.push(doc);
      }
    }

    return { fastLane, standardLane, batchLane };
  }

  private async processDocumentCategories(
    categories: DocumentCategories,
    options: ProcessingOptions,
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    // Process fast lane documents immediately
    if (categories.fastLane.length > 0) {
      const fastResults = await this.processFastLane(
        categories.fastLane,
        options,
      );
      results.push(...fastResults);
    }

    // Process standard lane with normal concurrency
    if (categories.standardLane.length > 0) {
      const standardResults = await this.processStandardLane(
        categories.standardLane,
        options,
      );
      results.push(...standardResults);
    }

    // Process batch lane with optimized batching
    if (categories.batchLane.length > 0) {
      const batchResults = await this.processBatchLane(
        categories.batchLane,
        options,
      );
      results.push(...batchResults);
    }

    return results;
  }

  private async processFastLane(
    documents: VerificationDocument[],
    options: ProcessingOptions,
  ): Promise<ProcessingResult[]> {
    // Fast processing for simple documents
    const tasks = documents.map((doc) =>
      this.processSimpleDocument(doc, { ...options, timeout: 5000 }),
    );

    return await Promise.all(tasks);
  }

  private async processStandardLane(
    documents: VerificationDocument[],
    options: ProcessingOptions,
  ): Promise<ProcessingResult[]> {
    // Standard processing with controlled concurrency
    const concurrencyLimit = 4;
    const results: ProcessingResult[] = [];

    for (let i = 0; i < documents.length; i += concurrencyLimit) {
      const batch = documents.slice(i, i + concurrencyLimit);
      const batchTasks = batch.map((doc) =>
        this.processStandardDocument(doc, options),
      );
      const batchResults = await Promise.all(batchTasks);
      results.push(...batchResults);
    }

    return results;
  }

  private async processBatchLane(
    documents: VerificationDocument[],
    options: ProcessingOptions,
  ): Promise<ProcessingResult[]> {
    // Optimized batch processing for complex documents
    return await this.ocrEngine.batchProcessDocuments(
      documents.map((doc) => doc),
      options,
    );
  }

  private async processSimpleDocument(
    document: VerificationDocument,
    options: ProcessingOptions,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      const optimizedDoc = await this.optimizeDocumentForOCR(document);
      const ocrResult = await this.ocrEngine.extractTextFromDocument(
        optimizedDoc,
        {
          language: options.ocrLanguages[0],
          confidenceThreshold: options.confidenceThreshold,
          extractionMode: 'fast',
        },
      );

      return {
        documentId: document.id,
        success: true,
        processingTimeMs: Date.now() - startTime,
        extractedData: ocrResult.extractedData,
        confidence: ocrResult.confidence,
        metadata: {
          processingStartTime: new Date(startTime),
          processingEndTime: new Date(),
          workerPoolId: 'fast-lane',
          cacheHit: false,
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
          ocrEngine: 'tesseract-fast',
          preprocessingSteps: ['optimize', 'enhance'],
        },
      };
    } catch (error) {
      return {
        documentId: document.id,
        success: false,
        processingTimeMs: Date.now() - startTime,
        extractedData: {},
        confidence: 0,
        errors: [(error as Error).message],
        metadata: {
          processingStartTime: new Date(startTime),
          processingEndTime: new Date(),
          workerPoolId: 'fast-lane',
          cacheHit: false,
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
          ocrEngine: 'tesseract-fast',
          preprocessingSteps: [],
        },
      };
    }
  }

  private async processStandardDocument(
    document: VerificationDocument,
    options: ProcessingOptions,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      const optimizedDoc = await this.optimizeDocumentForOCR(document);
      const ocrResult = await this.ocrEngine.extractTextFromDocument(
        optimizedDoc,
        {
          language: options.ocrLanguages.join('+'),
          confidenceThreshold: options.confidenceThreshold,
          extractionMode: 'standard',
        },
      );

      return {
        documentId: document.id,
        success: true,
        processingTimeMs: Date.now() - startTime,
        extractedData: ocrResult.extractedData,
        confidence: ocrResult.confidence,
        metadata: {
          processingStartTime: new Date(startTime),
          processingEndTime: new Date(),
          workerPoolId: 'standard-lane',
          cacheHit: false,
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
          ocrEngine: 'tesseract-standard',
          preprocessingSteps: ['optimize', 'enhance', 'normalize'],
        },
      };
    } catch (error) {
      return {
        documentId: document.id,
        success: false,
        processingTimeMs: Date.now() - startTime,
        extractedData: {},
        confidence: 0,
        errors: [(error as Error).message],
        metadata: {
          processingStartTime: new Date(startTime),
          processingEndTime: new Date(),
          workerPoolId: 'standard-lane',
          cacheHit: false,
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
          ocrEngine: 'tesseract-standard',
          preprocessingSteps: [],
        },
      };
    }
  }

  private generateProcessingId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateDocumentHash(buffer: Buffer): string {
    return createHash('sha256')
      .update(buffer.slice(0, Math.min(buffer.length, 10240)))
      .digest('hex');
  }

  private async getProcessingVersion(): Promise<string> {
    return '1.0.0'; // Version for cache invalidation
  }

  private async assessDocumentComplexity(
    doc: VerificationDocument,
  ): Promise<{ score: number }> {
    const sizeScore = Math.min(doc.buffer.length / (5 * 1024 * 1024), 1); // Normalize to 5MB
    const typeScore = doc.type === 'business_license' ? 0.3 : 0.5;
    return { score: (sizeScore + typeScore) / 2 };
  }

  private selectOptimalWorker(workerStats: any[], job: ProcessingJob): any {
    // Simple round-robin for now
    return workerStats.reduce((optimal, worker) =>
      worker.queueLength < optimal.queueLength ? worker : optimal,
    );
  }

  private estimateProcessingTime(job: ProcessingJob, worker: any): number {
    // Simple estimation based on document size and worker load
    const baseTime = Math.min(job.document.buffer.length / 100000, 30000); // Max 30s
    const queueDelay = worker.queueLength * 5000; // 5s per queued item
    return baseTime + queueDelay;
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.workerPool.shutdown(),
      this.metricsCollector.shutdown(),
      this.cacheManager.shutdown(),
    ]);

    this.isInitialized = false;
  }
}

interface DocumentCategories {
  fastLane: VerificationDocument[];
  standardLane: VerificationDocument[];
  batchLane: VerificationDocument[];
}

interface ProcessingJob {
  id: string;
  document: VerificationDocument;
  options: ProcessingOptions;
  priority: number;
}

// Export singleton instance
export const verificationProcessingEngine = new VerificationProcessingEngine();
