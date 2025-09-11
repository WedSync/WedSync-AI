import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { createHash } from 'crypto';
import {
  VerificationDocument,
  ProcessingOptions,
} from './verification-processing-engine';

export interface OCRResult {
  success: boolean;
  extractedData: any;
  confidence: number;
  processingTimeMs: number;
  ocrEngine: string;
  warnings: string[];
}

export interface BatchOCRResult {
  results: OCRResult[];
  totalProcessingTime: number;
  averageConfidence: number;
  successRate: number;
  metadata: BatchMetadata;
}

export interface BatchMetadata {
  documentsProcessed: number;
  documentsSucceeded: number;
  documentsFailed: number;
  averageProcessingTime: number;
  memoryPeakUsage: number;
  workerPoolUtilization: number;
}

export interface ExtractionRules {
  language: string;
  confidenceThreshold: number;
  extractionMode: 'fast' | 'standard' | 'accurate';
  customPatterns?: RegExp[];
  fieldMappings?: FieldMapping[];
}

export interface FieldMapping {
  fieldName: string;
  pattern: RegExp;
  required: boolean;
  validator?: (value: string) => boolean;
}

export interface EnhancedImage {
  buffer: Buffer;
  width: number;
  height: number;
  channels: number;
  format: string;
  preprocessingApplied: string[];
}

export interface TesseractConfig {
  psm: number; // Page Segmentation Mode
  oem: number; // OCR Engine Mode
  language: string;
  whitelist?: string;
  blacklist?: string;
  tessdata_dir?: string;
}

export class HighPerformanceOCR {
  private workerPool: Worker[] = [];
  private maxWorkers: number = 8;
  private isInitialized: boolean = false;
  private tesseractConfigs: Map<string, TesseractConfig> = new Map();
  private processingStats: OCRProcessingStats = {
    totalProcessed: 0,
    totalSuccessful: 0,
    totalProcessingTime: 0,
    averageConfidence: 0,
  };

  constructor(maxWorkers: number = 8) {
    this.maxWorkers = maxWorkers;
    this.initializeTesseractConfigs();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize worker pool
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(__filename, {
        workerData: { workerId: i },
      });
      this.workerPool.push(worker);
    }

    // Pre-warm Tesseract engines
    await this.prewarmOCREngines();

    this.isInitialized = true;
  }

  async extractTextFromDocument(
    document: VerificationDocument,
    extractionRules: ExtractionRules,
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Select optimal Tesseract configuration
      const config = this.selectOptimalConfig(document, extractionRules);

      // Enhance image for better OCR accuracy
      const enhancedImage = await this.enhanceImageForOCR(document.buffer);

      // Perform OCR extraction
      const ocrResult = await this.performOCRExtraction(
        enhancedImage,
        config,
        extractionRules,
      );

      // Post-process and validate results
      const processedResult = await this.postProcessOCRResult(
        ocrResult,
        extractionRules,
      );

      const processingTime = Date.now() - startTime;

      // Update statistics
      this.updateProcessingStats(
        processedResult.success,
        processingTime,
        processedResult.confidence,
      );

      return {
        success: processedResult.success,
        extractedData: processedResult.extractedData,
        confidence: processedResult.confidence,
        processingTimeMs: processingTime,
        ocrEngine: config.language + '-' + config.oem,
        warnings: processedResult.warnings,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(false, processingTime, 0);

      return {
        success: false,
        extractedData: {},
        confidence: 0,
        processingTimeMs: processingTime,
        ocrEngine: 'failed',
        warnings: [(error as Error).message],
      };
    }
  }

  async batchProcessDocuments(
    documents: VerificationDocument[],
    options: ProcessingOptions,
  ): Promise<BatchOCRResult> {
    const startTime = Date.now();
    const results: OCRResult[] = [];
    const batchSize = Math.min(documents.length, this.maxWorkers * 2);

    // Process documents in optimized batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchTasks = batch.map((doc) =>
        this.extractTextFromDocument(doc, {
          language: options.ocrLanguages.join('+'),
          confidenceThreshold: options.confidenceThreshold,
          extractionMode: 'standard',
        }),
      );

      const batchResults = await this.processBatchWithRetries(batchTasks, 3);
      results.push(...batchResults);

      // Memory optimization between batches
      await this.optimizeMemoryBetweenBatches();
    }

    const totalTime = Date.now() - startTime;
    const successfulResults = results.filter((r) => r.success);

    return {
      results,
      totalProcessingTime: totalTime,
      averageConfidence:
        successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.confidence, 0) /
            successfulResults.length
          : 0,
      successRate:
        results.length > 0
          ? (successfulResults.length / results.length) * 100
          : 0,
      metadata: {
        documentsProcessed: results.length,
        documentsSucceeded: successfulResults.length,
        documentsFailed: results.length - successfulResults.length,
        averageProcessingTime: totalTime / results.length,
        memoryPeakUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        workerPoolUtilization: this.calculateWorkerPoolUtilization(),
      },
    };
  }

  private async enhanceImageForOCR(
    imageBuffer: Buffer,
  ): Promise<EnhancedImage> {
    // This would integrate with Sharp.js or similar library
    // For now, returning a mock enhanced image structure

    const preprocessingSteps = [
      'noise_reduction',
      'contrast_enhancement',
      'orientation_correction',
      'deskewing',
      'binarization',
    ];

    // Mock enhancement - in production, this would use Sharp.js
    const enhanced: EnhancedImage = {
      buffer: imageBuffer, // Would be processed buffer
      width: 2480, // Detected width
      height: 3508, // Detected height
      channels: 1, // Grayscale for OCR
      format: 'png',
      preprocessingApplied: preprocessingSteps,
    };

    return enhanced;
  }

  private initializeTesseractConfigs(): void {
    // Fast mode for simple documents
    this.tesseractConfigs.set('fast', {
      psm: 6, // Uniform block of text
      oem: 1, // Neural nets LSTM only
      language: 'eng',
    });

    // Standard mode for most documents
    this.tesseractConfigs.set('standard', {
      psm: 3, // Fully automatic page segmentation
      oem: 1, // Neural nets LSTM only
      language: 'eng',
    });

    // Accurate mode for complex documents
    this.tesseractConfigs.set('accurate', {
      psm: 1, // Automatic page segmentation with OSD
      oem: 1, // Neural nets LSTM only
      language: 'eng',
      whitelist:
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()-/: ',
    });

    // Specialized config for business documents
    this.tesseractConfigs.set('business', {
      psm: 6, // Uniform block of text
      oem: 1, // Neural nets LSTM only
      language: 'eng',
      whitelist:
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()-/#: @',
    });
  }

  private selectOptimalConfig(
    document: VerificationDocument,
    extractionRules: ExtractionRules,
  ): TesseractConfig {
    const baseConfig =
      this.tesseractConfigs.get(extractionRules.extractionMode) ||
      this.tesseractConfigs.get('standard')!;

    // Optimize based on document type
    const optimizedConfig = { ...baseConfig };

    if (
      document.type === 'business_license' ||
      document.type === 'insurance_certificate'
    ) {
      optimizedConfig.psm = 6; // Better for structured documents
      optimizedConfig.whitelist =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()-/#: @';
    }

    if (extractionRules.language !== 'eng') {
      optimizedConfig.language = extractionRules.language;
    }

    return optimizedConfig;
  }

  private async performOCRExtraction(
    enhancedImage: EnhancedImage,
    config: TesseractConfig,
    extractionRules: ExtractionRules,
  ): Promise<any> {
    // Mock OCR result - in production, this would call Tesseract
    const mockExtractedText = `
      BUSINESS LICENSE
      License Number: BL-2024-001234
      Business Name: Elite Wedding Services LLC
      Address: 123 Wedding Ave, Suite 100, City, State 12345
      Phone: (555) 123-4567
      Email: contact@eliteweddingservices.com
      Issue Date: 01/15/2024
      Expiration Date: 01/15/2025
      Status: ACTIVE
    `;

    const extractedData = await this.parseBusinessDocument(
      mockExtractedText,
      extractionRules,
    );

    return {
      success: true,
      extractedData,
      confidence: 0.92,
      rawText: mockExtractedText,
      warnings: [],
    };
  }

  private async parseBusinessDocument(
    text: string,
    rules: ExtractionRules,
  ): Promise<any> {
    const data: any = {};

    // Extract business license information
    const licenseNumberMatch = text.match(/License Number:\s*([A-Z0-9-]+)/i);
    if (licenseNumberMatch) {
      data.licenseNumber = licenseNumberMatch[1];
    }

    const businessNameMatch = text.match(/Business Name:\s*([^\n]+)/i);
    if (businessNameMatch) {
      data.businessName = businessNameMatch[1].trim();
    }

    const phoneMatch = text.match(
      /Phone:\s*(\([0-9]{3}\)\s*[0-9]{3}-[0-9]{4})/i,
    );
    if (phoneMatch) {
      data.phone = phoneMatch[1];
    }

    const emailMatch = text.match(
      /Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    );
    if (emailMatch) {
      data.email = emailMatch[1];
    }

    const issueDateMatch = text.match(
      /Issue Date:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i,
    );
    if (issueDateMatch) {
      data.issueDate = issueDateMatch[1];
    }

    const expirationDateMatch = text.match(
      /Expiration Date:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i,
    );
    if (expirationDateMatch) {
      data.expirationDate = expirationDateMatch[1];
    }

    const statusMatch = text.match(/Status:\s*([A-Z]+)/i);
    if (statusMatch) {
      data.status = statusMatch[1];
    }

    // Apply custom patterns if provided
    if (rules.customPatterns) {
      for (const pattern of rules.customPatterns) {
        const match = text.match(pattern);
        if (match) {
          data.customMatch = match[1] || match[0];
        }
      }
    }

    return data;
  }

  private async postProcessOCRResult(
    result: any,
    rules: ExtractionRules,
  ): Promise<any> {
    const processedResult = { ...result };

    // Validate required fields if field mappings are provided
    if (rules.fieldMappings) {
      const validationWarnings: string[] = [];

      for (const mapping of rules.fieldMappings) {
        const fieldValue = processedResult.extractedData[mapping.fieldName];

        if (mapping.required && !fieldValue) {
          validationWarnings.push(
            `Required field '${mapping.fieldName}' not found`,
          );
        }

        if (fieldValue && mapping.validator && !mapping.validator(fieldValue)) {
          validationWarnings.push(
            `Field '${mapping.fieldName}' failed validation`,
          );
        }
      }

      processedResult.warnings = [
        ...(processedResult.warnings || []),
        ...validationWarnings,
      ];
    }

    // Adjust confidence based on validation results
    if (processedResult.warnings && processedResult.warnings.length > 0) {
      processedResult.confidence *= 0.8; // Reduce confidence for warnings
    }

    return processedResult;
  }

  private async processBatchWithRetries(
    tasks: Promise<OCRResult>[],
    maxRetries: number,
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (const task of tasks) {
      let attempt = 0;
      let result: OCRResult;

      while (attempt < maxRetries) {
        try {
          result = await task;
          if (result.success || attempt === maxRetries - 1) {
            results.push(result);
            break;
          }
        } catch (error) {
          if (attempt === maxRetries - 1) {
            results.push({
              success: false,
              extractedData: {},
              confidence: 0,
              processingTimeMs: 0,
              ocrEngine: 'failed',
              warnings: [
                `Failed after ${maxRetries} attempts: ${(error as Error).message}`,
              ],
            });
          }
        }
        attempt++;
      }
    }

    return results;
  }

  private async optimizeMemoryBetweenBatches(): Promise<void> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Small delay to allow memory cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private calculateWorkerPoolUtilization(): number {
    // Mock calculation - in production, would track actual worker usage
    return Math.random() * 0.3 + 0.7; // 70-100% utilization
  }

  private updateProcessingStats(
    success: boolean,
    processingTime: number,
    confidence: number,
  ): void {
    this.processingStats.totalProcessed++;
    if (success) {
      this.processingStats.totalSuccessful++;
    }
    this.processingStats.totalProcessingTime += processingTime;

    // Update running average of confidence
    if (success) {
      const totalConfidence =
        this.processingStats.averageConfidence *
          (this.processingStats.totalSuccessful - 1) +
        confidence;
      this.processingStats.averageConfidence =
        totalConfidence / this.processingStats.totalSuccessful;
    }
  }

  private async prewarmOCREngines(): Promise<void> {
    // Pre-compile common patterns for faster matching
    const commonPatterns = [
      /License Number:\s*([A-Z0-9-]+)/i,
      /Business Name:\s*([^\n]+)/i,
      /Phone:\s*(\([0-9]{3}\)\s*[0-9]{3}-[0-9]{4})/i,
      /Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    ];

    // Store compiled patterns globally for reuse
    (global as any).precompiledOCRPatterns = commonPatterns;
  }

  getProcessingStats(): OCRProcessingStats {
    return { ...this.processingStats };
  }

  async shutdown(): Promise<void> {
    // Terminate all workers
    await Promise.all(
      this.workerPool.map(
        (worker) =>
          new Promise<void>((resolve) => {
            worker.terminate().then(() => resolve());
          }),
      ),
    );

    this.workerPool = [];
    this.isInitialized = false;
  }
}

interface OCRProcessingStats {
  totalProcessed: number;
  totalSuccessful: number;
  totalProcessingTime: number;
  averageConfidence: number;
}

// Worker thread code for OCR processing
if (!isMainThread && parentPort) {
  const { workerId } = workerData;

  parentPort.on('message', async (data) => {
    try {
      // Process OCR task in worker thread
      const result = await processOCRInWorker(data);
      parentPort!.postMessage({ success: true, result });
    } catch (error) {
      parentPort!.postMessage({
        success: false,
        error: (error as Error).message,
      });
    }
  });
}

async function processOCRInWorker(data: any): Promise<any> {
  // Mock worker processing - in production, would perform actual OCR
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100)); // Simulate processing

  return {
    workerId: workerData.workerId,
    extractedText: 'Mock OCR result from worker',
    confidence: 0.85 + Math.random() * 0.15,
    processingTime: 50 + Math.random() * 200,
  };
}

// Export singleton instance
export const highPerformanceOCR = new HighPerformanceOCR();
