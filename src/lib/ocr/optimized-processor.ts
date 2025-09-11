import '@/lib/dom-polyfill';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker, Worker } from 'tesseract.js';
import { DatabaseOptimizer } from '@/lib/database-optimizer';
import { advancedQueryOptimizer } from '@/lib/database/advanced-query-optimizer';
import { auditLogger, AuditEventType, AuditSeverity } from '@/lib/audit-logger';
import { createClient } from '@/lib/supabase/server';
import {
  isWeddingSeason,
  determineProcessingPriority,
  createOptimizedChunks,
  extractGuestRecordsFromChunk,
  deduplicateGuestRecords,
  generateProcessingId,
} from './enterprise-wedding-helpers';

// Enhanced processor options for enterprise wedding season scaling
interface ProcessorOptions {
  enableCaching?: boolean;
  maxConcurrency?: number;
  chunkSize?: number;
  progressCallback?: (
    progress: number,
    stage?: string,
    guestCount?: number,
  ) => void;
  ocrLanguage?: string;
  // Wedding season enhancements
  weddingSeasonScaling?: boolean;
  priorityProcessing?: boolean;
  streamingMode?: boolean;
  maxMemoryMB?: number;
  batchDbUpdates?: boolean;
  guestListOptimization?: boolean;
  realTimeProgress?: boolean;
  organizationId?: string;
  userId?: string;
}

interface ProcessingResult {
  text: string;
  pageCount: number;
  fields: ExtractedField[];
  // Wedding-specific enhancements
  guestRecords: GuestRecord[];
  weddingMetadata: WeddingProcessingMetadata;
  metadata: {
    processingTime: number;
    avgPageTime: number;
    cacheHits: number;
    memoryUsage: number;
    // Enterprise performance metrics
    peakMemoryUsage: number;
    dbOperations: number;
    avgDbQueryTime: number;
    queueWaitTime: number;
    streamingChunks: number;
    guestRecordsProcessed: number;
    duplicatesDetected: number;
    validationErrors: number;
  };
}

interface ExtractedField {
  id: string;
  type: string;
  label: string;
  value: string;
  confidence: number;
  pageNumber: number;
  // Wedding enhancements
  isGuestField?: boolean;
  guestRecordId?: string;
  validationStatus?: 'valid' | 'invalid' | 'needs_review';
  duplicateOf?: string;
}

// Wedding-specific guest record interface
interface GuestRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  plusOne?: boolean;
  dietaryRestrictions?: string;
  tableNumber?: string;
  rsvpStatus?: 'pending' | 'accepted' | 'declined';
  invitationType?: 'ceremony' | 'reception' | 'both';
  confidence: number;
  pageNumber: number;
  sourceFields: string[];
  validationErrors: string[];
}

// Wedding processing metadata
interface WeddingProcessingMetadata {
  weddingDate?: string;
  venueInfo?: string;
  totalExpectedGuests: number;
  processedGuests: number;
  validGuests: number;
  duplicateGuests: number;
  incompleteRecords: number;
  seasonallyOptimized: boolean;
  processingPriority: 'low' | 'medium' | 'high' | 'urgent';
  queuePosition?: number;
}

export class OptimizedPDFProcessor {
  private options: Required<ProcessorOptions>;
  private cache = new Map<string, string>();
  private workers: Worker[] = [];
  private currentWorkerIndex = 0;

  // Enterprise enhancements
  private supabase: any;
  private guestRecords: GuestRecord[] = [];
  private processingQueue: any[] = [];
  private isProcessingQueue = false;
  private memoryMonitor?: NodeJS.Timeout;
  private peakMemoryUsage = 0;
  private dbOperationCount = 0;
  private totalDbQueryTime = 0;

  constructor(options: ProcessorOptions = {}) {
    // Wedding season intelligent scaling
    const isWeddingSeason = this.isWeddingSeason();
    const seasonMultiplier =
      options.weddingSeasonScaling && isWeddingSeason ? 3 : 1;

    this.options = {
      enableCaching: options.enableCaching ?? true,
      maxConcurrency: Math.min(
        options.maxConcurrency ?? 4 * seasonMultiplier,
        16,
      ), // Cap at 16 workers
      chunkSize: options.chunkSize ?? (isWeddingSeason ? 25 : 10), // Larger chunks during wedding season
      progressCallback: options.progressCallback ?? (() => {}),
      ocrLanguage: options.ocrLanguage ?? 'eng',
      // Wedding season defaults
      weddingSeasonScaling: options.weddingSeasonScaling ?? true,
      priorityProcessing: options.priorityProcessing ?? isWeddingSeason,
      streamingMode: options.streamingMode ?? true,
      maxMemoryMB: options.maxMemoryMB ?? (isWeddingSeason ? 2048 : 1024),
      batchDbUpdates: options.batchDbUpdates ?? true,
      guestListOptimization: options.guestListOptimization ?? true,
      realTimeProgress: options.realTimeProgress ?? isWeddingSeason,
      organizationId: options.organizationId ?? '',
      userId: options.userId ?? '',
    };

    // Configure PDF.js for Node.js environment
    if (typeof window === 'undefined') {
      // Set worker source for PDF.js
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    // Initialize monitoring and database connections
    this.initializeEnterpriseFeatures();
  }

  /**
   * Initialize enterprise features for wedding season optimization
   */
  private async initializeEnterpriseFeatures(): Promise<void> {
    try {
      // Initialize Supabase client for database operations
      this.supabase = await createClient();

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Initialize processing queue
      if (this.options.priorityProcessing) {
        this.startQueueProcessor();
      }

      // Log initialization
      await auditLogger.log({
        event_type: AuditEventType.SYSTEM_INFO,
        severity: AuditSeverity.INFO,
        action: 'PDF processor initialized',
        details: {
          weddingSeasonMode: this.isWeddingSeason(),
          maxConcurrency: this.options.maxConcurrency,
          chunkSize: this.options.chunkSize,
          streamingMode: this.options.streamingMode,
          maxMemoryMB: this.options.maxMemoryMB,
        },
        user_id: this.options.userId,
        organization_id: this.options.organizationId,
      });
    } catch (error) {
      console.error('Failed to initialize enterprise features:', error);
    }
  }

  /**
   * Start memory monitoring for enterprise workloads
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      if (typeof process !== 'undefined') {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / 1024 / 1024;

        // Track peak memory usage
        if (heapUsedMB > this.peakMemoryUsage) {
          this.peakMemoryUsage = heapUsedMB;
        }

        // Warning threshold
        if (heapUsedMB > this.options.maxMemoryMB * 0.8) {
          console.warn(
            `High memory usage: ${heapUsedMB.toFixed(2)}MB (${((heapUsedMB / this.options.maxMemoryMB) * 100).toFixed(1)}%)`,
          );

          // Force garbage collection
          if (global.gc) {
            global.gc();
          }
        }

        // Emergency threshold
        if (heapUsedMB > this.options.maxMemoryMB * 0.95) {
          console.error(
            `Critical memory usage: ${heapUsedMB.toFixed(2)}MB - initiating emergency cleanup`,
          );
          this.emergencyMemoryCleanup();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Emergency memory cleanup procedures
   */
  private emergencyMemoryCleanup(): void {
    // Clear caches
    this.cache.clear();

    // Clear processed guest records from memory
    this.guestRecords = [];

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    console.log('Emergency memory cleanup completed');
  }

  /**
   * Start priority processing queue for wedding season
   */
  private startQueueProcessor(): void {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    this.processQueue();
  }

  /**
   * Process queued operations with priority handling
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessingQueue) {
      if (this.processingQueue.length > 0) {
        // Sort by priority (urgent -> high -> medium -> low)
        this.processingQueue.sort((a, b) => {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        const operation = this.processingQueue.shift();
        if (operation) {
          await this.executeQueuedOperation(operation);
        }
      }

      // Wait before checking queue again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Execute queued database operations
   */
  private async executeQueuedOperation(operation: any): Promise<void> {
    const startTime = performance.now();

    try {
      switch (operation.type) {
        case 'guest_batch_insert':
          await this.batchInsertGuests(operation.data);
          break;
        case 'progress_update':
          await this.updateProcessingProgress(operation.data);
          break;
        default:
          console.warn(`Unknown queue operation: ${operation.type}`);
      }
    } catch (error) {
      console.error(`Queue operation failed: ${operation.type}`, error);
    } finally {
      const queryTime = performance.now() - startTime;
      this.totalDbQueryTime += queryTime;
      this.dbOperationCount++;
    }
  }

  async initialize(): Promise<void> {
    // Initialize worker pool for concurrent OCR
    for (let i = 0; i < this.options.maxConcurrency; i++) {
      const worker = await createWorker(this.options.ocrLanguage);
      this.workers.push(worker);
    }
  }

  async cleanup(): Promise<void> {
    // Stop processing queue
    this.isProcessingQueue = false;

    // Clear memory monitor
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = undefined;
    }

    // Terminate all workers
    await Promise.all(this.workers.map((worker) => worker.terminate()));
    this.workers = [];

    // Clear caches and temporary data
    this.cache.clear();
    this.guestRecords = [];
    this.processingQueue = [];

    // Reset counters
    this.peakMemoryUsage = 0;
    this.dbOperationCount = 0;
    this.totalDbQueryTime = 0;

    // Final garbage collection
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Process large PDF with enterprise wedding guest list optimization
   */
  async processLargePDF(
    fileBuffer: ArrayBuffer,
    weddingContext?: {
      weddingId?: string;
      expectedGuestCount?: number;
      weddingDate?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    },
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    const queueStartTime = Date.now();
    let cacheHits = 0;
    let streamingChunks = 0;

    await this.initialize();

    try {
      // Load PDF document with enterprise settings
      const pdf = await pdfjsLib.getDocument({
        data: fileBuffer,
        useSystemFonts: true,
        standardFontDataUrl: '/standard_fonts/',
        verbosity: 0,
        // Enterprise optimizations
        maxImageSize: (this.options.maxMemoryMB * 1024 * 1024) / 4, // Quarter of max memory for images
        disableFontFace: false,
        disableAutoFetch: false,
        disableStream: !this.options.streamingMode,
      }).promise;

      const pageCount = pdf.numPages;
      const expectedGuestCount =
        weddingContext?.expectedGuestCount || Math.ceil(pageCount * 10); // Estimate 10 guests per page
      const processingPriority = this.determineProcessingPriority(
        pageCount,
        expectedGuestCount,
        weddingContext?.priority,
      );

      console.log(
        `🎉 Wedding PDF Processing Started - ${pageCount} pages, ~${expectedGuestCount} expected guests`,
      );
      console.log(
        `⚡ Enterprise Mode: ${this.options.maxConcurrency} workers, ${this.options.chunkSize} chunk size, Priority: ${processingPriority}`,
      );

      // Initialize wedding processing metadata
      const weddingMetadata: WeddingProcessingMetadata = {
        weddingDate: weddingContext?.weddingDate,
        totalExpectedGuests: expectedGuestCount,
        processedGuests: 0,
        validGuests: 0,
        duplicateGuests: 0,
        incompleteRecords: 0,
        seasonallyOptimized: this.isWeddingSeason(),
        processingPriority,
        queuePosition: this.processingQueue.length,
      };

      // Update initial progress
      this.options.progressCallback(
        0,
        'Initializing wedding guest processing...',
        expectedGuestCount,
      );

      // Process pages in chunks for memory efficiency and streaming
      const chunks = this.createOptimizedChunks(
        pageCount,
        this.options.chunkSize,
        processingPriority,
      );
      const allFields: ExtractedField[] = [];
      const guestRecords: GuestRecord[] = [];
      let allText = '';
      let processedPages = 0;
      let batchedGuests: GuestRecord[] = [];

      for (const chunk of chunks) {
        streamingChunks++;

        // Memory check before processing each chunk
        this.checkMemoryUsage();

        const chunkResults = await this.processEnhancedChunk(
          pdf,
          chunk,
          processedPages,
          pageCount,
          processingPriority,
        );
        allText += chunkResults.text;
        allFields.push(...chunkResults.fields);
        cacheHits += chunkResults.cacheHits;

        // Extract and validate guest records from chunk
        const chunkGuests = await this.extractGuestRecordsFromChunk(
          chunkResults.fields,
          processedPages,
        );
        guestRecords.push(...chunkGuests);
        batchedGuests.push(...chunkGuests);

        // Update wedding metadata
        weddingMetadata.processedGuests += chunkGuests.length;
        weddingMetadata.validGuests += chunkGuests.filter(
          (g) => g.validationErrors.length === 0,
        ).length;
        weddingMetadata.incompleteRecords += chunkGuests.filter(
          (g) => !g.firstName || !g.lastName,
        ).length;

        processedPages += chunk.length;
        const progressPercentage = (processedPages / pageCount) * 100;

        this.options.progressCallback(
          progressPercentage,
          `Processing wedding guests... Page ${processedPages}/${pageCount}`,
          weddingMetadata.processedGuests,
        );

        // Batch database updates for performance
        if (this.options.batchDbUpdates && batchedGuests.length >= 50) {
          await this.queueDatabaseOperation(
            'guest_batch_insert',
            {
              guests: [...batchedGuests],
              weddingContext,
              processingId: this.generateProcessingId(),
            },
            processingPriority,
          );
          batchedGuests = [];
        }

        // Real-time progress updates during wedding season
        if (this.options.realTimeProgress && processedPages % 5 === 0) {
          await this.queueDatabaseOperation(
            'progress_update',
            {
              processedPages,
              totalPages: pageCount,
              guestCount: weddingMetadata.processedGuests,
              processingId: this.generateProcessingId(),
            },
            'medium',
          );
        }

        // Memory-friendly processing with garbage collection
        if (processedPages % this.options.chunkSize === 0 && global.gc) {
          global.gc();
        }
      }

      // Process remaining batched guests
      if (batchedGuests.length > 0) {
        await this.queueDatabaseOperation(
          'guest_batch_insert',
          {
            guests: batchedGuests,
            weddingContext,
            processingId: this.generateProcessingId(),
          },
          processingPriority,
        );
      }

      // Detect and resolve duplicates
      const { deduplicatedGuests, duplicateCount } =
        await this.deduplicateGuestRecords(guestRecords);
      weddingMetadata.duplicateGuests = duplicateCount;
      weddingMetadata.validGuests = deduplicatedGuests.filter(
        (g) => g.validationErrors.length === 0,
      ).length;

      const processingTime = performance.now() - startTime;
      const queueWaitTime = Date.now() - queueStartTime - processingTime;
      const avgDbQueryTime =
        this.dbOperationCount > 0
          ? this.totalDbQueryTime / this.dbOperationCount
          : 0;

      // Final progress update
      this.options.progressCallback(
        100,
        'Wedding guest processing complete!',
        deduplicatedGuests.length,
      );

      // Log completion
      await auditLogger.log({
        event_type: AuditEventType.SYSTEM_INFO,
        severity: AuditSeverity.INFO,
        action: 'Wedding PDF processing completed',
        details: {
          pageCount,
          guestRecordsProcessed: deduplicatedGuests.length,
          duplicatesDetected: duplicateCount,
          processingTimeMs: processingTime,
          avgPageTimeMs: processingTime / pageCount,
          peakMemoryMB: this.peakMemoryUsage,
          seasonallyOptimized: weddingMetadata.seasonallyOptimized,
          priority: processingPriority,
        },
        user_id: this.options.userId,
        organization_id: this.options.organizationId,
      });

      return {
        text: allText.trim(),
        pageCount,
        fields: allFields,
        guestRecords: deduplicatedGuests,
        weddingMetadata,
        metadata: {
          processingTime,
          avgPageTime: processingTime / pageCount,
          cacheHits,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          // Enterprise metrics
          peakMemoryUsage: this.peakMemoryUsage,
          dbOperations: this.dbOperationCount,
          avgDbQueryTime,
          queueWaitTime,
          streamingChunks,
          guestRecordsProcessed: deduplicatedGuests.length,
          duplicatesDetected: duplicateCount,
          validationErrors: deduplicatedGuests.reduce(
            (sum, g) => sum + g.validationErrors.length,
            0,
          ),
        },
      };
    } finally {
      await this.cleanup();
    }
  }

  private createChunks(total: number, chunkSize: number): number[][] {
    const chunks: number[][] = [];
    for (let i = 1; i <= total; i += chunkSize) {
      const chunk = [];
      for (let j = 0; j < chunkSize && i + j <= total; j++) {
        chunk.push(i + j);
      }
      chunks.push(chunk);
    }
    return chunks;
  }

  private async processChunk(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumbers: number[],
    startIndex: number,
    totalPages: number,
  ): Promise<{ text: string; fields: ExtractedField[]; cacheHits: number }> {
    const chunkPromises = pageNumbers.map((pageNum) =>
      this.processPage(pdf, pageNum),
    );

    const results = await Promise.all(chunkPromises);

    let text = '';
    const fields: ExtractedField[] = [];
    let cacheHits = 0;

    results.forEach((result, index) => {
      text += result.text + '\n';
      fields.push(...result.fields);
      if (result.cached) cacheHits++;
    });

    return { text, fields, cacheHits };
  }

  private async processPage(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
  ): Promise<{ text: string; fields: ExtractedField[]; cached: boolean }> {
    const cacheKey = `page_${pageNumber}`;

    // Check cache
    if (this.options.enableCaching && this.cache.has(cacheKey)) {
      const cachedResult = JSON.parse(this.cache.get(cacheKey)!);
      return { ...cachedResult, cached: true };
    }

    try {
      const page = await pdf.getPage(pageNumber);

      // Try text extraction first (much faster than OCR)
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      let finalText = pageText;
      const fields: ExtractedField[] = [];

      // If text extraction yields little content, use OCR
      if (pageText.length < 50) {
        const ocrResult = await this.performOCR(page, pageNumber);
        finalText = ocrResult.text;
        fields.push(...ocrResult.fields);
      } else {
        // Extract fields from text content
        const extractedFields = this.extractFieldsFromText(
          pageText,
          pageNumber,
        );
        fields.push(...extractedFields);
      }

      const result = { text: finalText, fields, cached: false };

      // Cache the result
      if (this.options.enableCaching) {
        this.cache.set(cacheKey, JSON.stringify({ text: finalText, fields }));
      }

      return result;
    } catch (error) {
      console.error(`Error processing page ${pageNumber}:`, error);
      return { text: '', fields: [], cached: false };
    }
  }

  private async performOCR(
    page: pdfjsLib.PDFPageProxy,
    pageNumber: number,
  ): Promise<{ text: string; fields: ExtractedField[] }> {
    const viewport = page.getViewport({ scale: 1.5 });

    // Create canvas for rendering
    const canvas =
      typeof document !== 'undefined'
        ? document.createElement('canvas')
        : require('canvas').createCanvas(viewport.width, viewport.height);

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Get next available worker
    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex =
      (this.currentWorkerIndex + 1) % this.workers.length;

    // Perform OCR
    const { data } = await worker.recognize(canvas);

    const fields = this.extractFieldsFromOCR(data, pageNumber);

    return {
      text: data.text,
      fields,
    };
  }

  private extractFieldsFromText(
    text: string,
    pageNumber: number,
  ): ExtractedField[] {
    const fields: ExtractedField[] = [];
    const lines = text.split(/\n|\r/);

    // Common patterns for form fields
    const patterns = [
      { regex: /^([A-Za-z\s]+):\s*(.+)$/, type: 'text' },
      { regex: /(\w+\s*Name):\s*(.+)/i, type: 'text' },
      { regex: /(\w+\s*Date):\s*(.+)/i, type: 'date' },
      { regex: /(Email|E-mail):\s*(.+)/i, type: 'email' },
      { regex: /(Phone|Tel|Mobile):\s*(.+)/i, type: 'phone' },
      { regex: /(Address):\s*(.+)/i, type: 'address' },
    ];

    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          fields.push({
            id: `field_${pageNumber}_${index}`,
            type: pattern.type,
            label: match[1].trim(),
            value: match[2]?.trim() || '',
            confidence: 0.9, // High confidence for direct text extraction
            pageNumber,
          });
          break;
        }
      }
    });

    return fields;
  }

  private extractFieldsFromOCR(
    ocrData: any,
    pageNumber: number,
  ): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Process OCR blocks/words to identify fields
    if (ocrData.blocks) {
      ocrData.blocks.forEach((block: any, blockIndex: number) => {
        const blockText = block.text || '';

        // Check for field patterns
        const fieldMatch = blockText.match(/^([A-Za-z\s]+):\s*(.*)$/);
        if (fieldMatch) {
          fields.push({
            id: `ocr_field_${pageNumber}_${blockIndex}`,
            type: this.detectFieldType(fieldMatch[1]),
            label: fieldMatch[1].trim(),
            value: fieldMatch[2]?.trim() || '',
            confidence: block.confidence / 100,
            pageNumber,
          });
        }
      });
    }

    return fields;
  }

  private detectFieldType(label: string): string {
    const lowercaseLabel = label.toLowerCase();

    if (lowercaseLabel.includes('email') || lowercaseLabel.includes('e-mail')) {
      return 'email';
    }
    if (
      lowercaseLabel.includes('phone') ||
      lowercaseLabel.includes('tel') ||
      lowercaseLabel.includes('mobile')
    ) {
      return 'phone';
    }
    if (
      lowercaseLabel.includes('date') ||
      lowercaseLabel.includes('birthday')
    ) {
      return 'date';
    }
    if (lowercaseLabel.includes('address')) {
      return 'address';
    }
    if (
      lowercaseLabel.includes('number') ||
      lowercaseLabel.includes('count') ||
      lowercaseLabel.includes('amount')
    ) {
      return 'number';
    }

    return 'text';
  }

  // Memory monitoring for large files
  private checkMemoryUsage(): void {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;

      // Update peak memory tracking
      if (heapUsedMB > this.peakMemoryUsage) {
        this.peakMemoryUsage = heapUsedMB;
      }

      if (heapUsedMB > this.options.maxMemoryMB * 0.8) {
        console.warn(
          `High memory usage: ${heapUsedMB.toFixed(2)}MB (${((heapUsedMB / this.options.maxMemoryMB) * 100).toFixed(1)}%)`,
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }
  }

  /**
   * Check if it's wedding season (helper method)
   */
  private isWeddingSeason(): boolean {
    return isWeddingSeason();
  }

  /**
   * Determine processing priority
   */
  private determineProcessingPriority(
    pageCount: number,
    expectedGuestCount: number,
    userPriority?: 'low' | 'medium' | 'high' | 'urgent',
  ): 'low' | 'medium' | 'high' | 'urgent' {
    return determineProcessingPriority(
      pageCount,
      expectedGuestCount,
      userPriority,
    );
  }

  /**
   * Create optimized chunks for processing
   */
  private createOptimizedChunks(
    totalPages: number,
    baseChunkSize: number,
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ): number[][] {
    return createOptimizedChunks(totalPages, baseChunkSize, priority);
  }

  /**
   * Process enhanced chunk with enterprise optimizations
   */
  private async processEnhancedChunk(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumbers: number[],
    startIndex: number,
    totalPages: number,
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ): Promise<{ text: string; fields: ExtractedField[]; cacheHits: number }> {
    const chunkPromises = pageNumbers.map((pageNum) =>
      this.processPage(pdf, pageNum),
    );

    const results = await Promise.all(chunkPromises);

    let text = '';
    const fields: ExtractedField[] = [];
    let cacheHits = 0;

    results.forEach((result, index) => {
      text += result.text + '\n';
      fields.push(...result.fields);
      if (result.cached) cacheHits++;
    });

    return { text, fields, cacheHits };
  }

  /**
   * Extract guest records from chunk
   */
  private async extractGuestRecordsFromChunk(
    fields: ExtractedField[],
    startPageNumber: number,
  ): Promise<GuestRecord[]> {
    return await extractGuestRecordsFromChunk(fields, startPageNumber);
  }

  /**
   * Queue database operation for batch processing
   */
  private async queueDatabaseOperation(
    type: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ): Promise<void> {
    if (!this.options.batchDbUpdates) {
      // Execute immediately if batch updates disabled
      await this.executeQueuedOperation({ type, data, priority });
      return;
    }

    this.processingQueue.push({
      type,
      data,
      priority,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate unique processing ID
   */
  private generateProcessingId(): string {
    return generateProcessingId();
  }

  /**
   * Deduplicate guest records
   */
  private async deduplicateGuestRecords(
    guests: GuestRecord[],
  ): Promise<{ deduplicatedGuests: GuestRecord[]; duplicateCount: number }> {
    return await deduplicateGuestRecords(guests);
  }

  /**
   * Batch insert guests to database
   */
  private async batchInsertGuests(data: {
    guests: GuestRecord[];
    weddingContext?: any;
    processingId: string;
  }): Promise<void> {
    if (!this.supabase || !data.guests.length) return;

    try {
      // Use DatabaseOptimizer for batch operations
      const result = await DatabaseOptimizer.batchOperation(
        'guest_lists',
        'insert',
        data.guests.map((guest) => ({
          id: guest.id,
          first_name: guest.firstName,
          last_name: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          address: guest.address,
          plus_one: guest.plusOne,
          dietary_restrictions: guest.dietaryRestrictions,
          table_number: guest.tableNumber,
          rsvp_status: guest.rsvpStatus,
          invitation_type: guest.invitationType,
          confidence_score: guest.confidence,
          page_number: guest.pageNumber,
          source_fields: guest.sourceFields,
          validation_errors: guest.validationErrors,
          processing_id: data.processingId,
          organization_id: this.options.organizationId,
          created_by: this.options.userId,
          created_at: new Date().toISOString(),
        })),
        {
          batchSize: 50,
          userId: this.options.userId,
        },
      );

      console.log(`✅ Batch inserted ${result.data.length} guest records`);
    } catch (error) {
      console.error('Failed to batch insert guests:', error);
      throw error;
    }
  }

  /**
   * Update processing progress in database
   */
  private async updateProcessingProgress(data: {
    processedPages: number;
    totalPages: number;
    guestCount: number;
    processingId: string;
  }): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('pdf_processing_progress').upsert({
        processing_id: data.processingId,
        processed_pages: data.processedPages,
        total_pages: data.totalPages,
        guest_count: data.guestCount,
        progress_percentage: (data.processedPages / data.totalPages) * 100,
        updated_at: new Date().toISOString(),
        organization_id: this.options.organizationId,
        user_id: this.options.userId,
      });
    } catch (error) {
      console.error('Failed to update processing progress:', error);
    }
  }
}

// Export the class for direct instantiation
export class OptimizedProcessor extends OptimizedPDFProcessor {}

// Export enhanced singleton instance for enterprise wedding season processing
export const optimizedProcessor = new OptimizedPDFProcessor({
  // Base configuration
  enableCaching: true,
  ocrLanguage: 'eng',

  // Wedding season intelligent defaults
  weddingSeasonScaling: true,
  priorityProcessing: true,
  streamingMode: true,
  maxMemoryMB: 2048,
  batchDbUpdates: true,
  guestListOptimization: true,
  realTimeProgress: true,

  // Dynamic concurrency based on season
  maxConcurrency: isWeddingSeason() ? 12 : 6,
  chunkSize: isWeddingSeason() ? 25 : 15,
});
