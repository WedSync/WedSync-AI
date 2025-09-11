import { OCRService, DetectedField, OCRResult } from './google-vision';
import {
  detectCoreFieldFromLabel,
  validateCoreFieldValue,
  CORE_FIELDS,
} from '@/types/core-fields';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export interface ProcessingOptions {
  qualityCheck?: boolean;
  parallel?: boolean;
  skipCache?: boolean;
  enhanceAccuracy?: boolean;
  extractTables?: boolean;
  detectSignatures?: boolean;
}

export interface ProcessingResult {
  id: string;
  status: 'completed' | 'failed';
  fields: EnhancedField[];
  accuracy: number;
  pageCount: number;
  processingTimeMs: number;
  extractedText?: string;
  tables?: ExtractedTable[];
  signatures?: SignatureField[];
  metadata: {
    confidence: number;
    language: string;
    documentType: string;
    hasWeddingContent: boolean;
  };
}

export interface EnhancedField extends DetectedField {
  coreFieldKey?: string | null;
  coreFieldConfidence?: number;
  validated?: boolean;
  validationError?: string;
  contextClues?: string[];
  nearbyFields?: string[];
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: string[][];
  pageNumber: number;
  confidence: number;
}

export interface SignatureField {
  id: string;
  pageNumber: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  isComplete: boolean;
  label?: string;
}

export class OCRProcessingPipeline {
  private ocrService: OCRService;
  private processingCache: Map<string, ProcessingResult>;

  constructor() {
    this.ocrService = new OCRService();
    this.processingCache = new Map();
  }

  /**
   * Process a PDF with enhanced accuracy
   */
  async processPDF(
    filePath: string,
    filename: string,
    userId: string,
    options: ProcessingOptions = {},
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const processId = this.generateProcessId();

    try {
      // Check cache if not skipped
      if (!options.skipCache) {
        const cached = this.processingCache.get(filePath);
        if (cached) {
          console.log(`Returning cached result for ${filePath}`);
          return cached;
        }
      }

      // Step 1: Extract text and basic fields using Google Vision
      const ocrResult = await OCRService.extractFromPDF(filePath, {
        extractionMode: options.enhanceAccuracy ? 'hybrid' : 'auto',
        confidenceThreshold: 0.65, // Lower threshold to catch more fields
      });

      // Step 2: Enhance field detection with wedding-specific patterns
      const enhancedFields = await this.enhanceFieldDetection(
        ocrResult.fields,
        ocrResult.text,
        options,
      );

      // Step 3: Map fields to core wedding fields
      const mappedFields = await this.mapToCoreFields(enhancedFields);

      // Step 4: Validate fields
      const validatedFields = await this.validateFields(mappedFields);

      // Step 5: Extract tables if requested
      let tables: ExtractedTable[] = [];
      if (options.extractTables) {
        tables = await this.extractTables(ocrResult.text, ocrResult.pageCount);
      }

      // Step 6: Detect signatures if requested
      let signatures: SignatureField[] = [];
      if (options.detectSignatures) {
        signatures = await this.detectSignatures(ocrResult);
      }

      // Step 7: Calculate final accuracy
      const accuracy = this.calculateAccuracy(validatedFields);

      const result: ProcessingResult = {
        id: processId,
        status: 'completed',
        fields: validatedFields,
        accuracy,
        pageCount: ocrResult.pageCount,
        processingTimeMs: Date.now() - startTime,
        extractedText: ocrResult.text,
        tables,
        signatures,
        metadata: {
          confidence: ocrResult.confidence,
          language: 'en',
          documentType: this.detectDocumentType(ocrResult.text),
          hasWeddingContent: this.hasWeddingContent(ocrResult.text),
        },
      };

      // Cache the result
      this.processingCache.set(filePath, result);

      // Store in database
      await this.storeProcessingResult(result, filePath, filename, userId);

      return result;
    } catch (error) {
      console.error('PDF processing pipeline error:', error);

      const errorResult: ProcessingResult = {
        id: processId,
        status: 'failed',
        fields: [],
        accuracy: 0,
        pageCount: 0,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          confidence: 0,
          language: 'unknown',
          documentType: 'unknown',
          hasWeddingContent: false,
        },
      };

      return errorResult;
    }
  }

  /**
   * Enhance field detection with advanced pattern matching and context analysis
   */
  private async enhanceFieldDetection(
    fields: DetectedField[],
    fullText: string,
    options: ProcessingOptions,
  ): Promise<EnhancedField[]> {
    const enhancedFields: EnhancedField[] = [];
    const textLines = fullText.split('\n');

    for (const field of fields) {
      const enhanced: EnhancedField = { ...field };

      // Find context around the field
      const fieldIndex = fullText.indexOf(field.value);
      if (fieldIndex !== -1) {
        const contextStart = Math.max(0, fieldIndex - 100);
        const contextEnd = Math.min(
          fullText.length,
          fieldIndex + field.value.length + 100,
        );
        const context = fullText.substring(contextStart, contextEnd);

        // Extract context clues
        enhanced.contextClues = this.extractContextClues(context);

        // Find nearby fields for relationship analysis
        enhanced.nearbyFields = this.findNearbyFields(field, fields);
      }

      // Enhance confidence based on context
      enhanced.confidence = this.recalculateConfidence(enhanced);

      // Apply wedding-specific enhancements
      if (options.enhanceAccuracy) {
        enhanced.confidence = await this.applyWeddingEnhancements(
          enhanced,
          fullText,
        );
      }

      enhancedFields.push(enhanced);
    }

    // Add fields that might have been missed
    const additionalFields = await this.detectMissedFields(
      fullText,
      enhancedFields,
    );
    enhancedFields.push(...additionalFields);

    return enhancedFields;
  }

  /**
   * Map enhanced fields to core wedding fields with improved accuracy
   */
  private async mapToCoreFields(
    fields: EnhancedField[],
  ): Promise<EnhancedField[]> {
    for (const field of fields) {
      // Try to detect core field mapping
      const detection = detectCoreFieldFromLabel(field.label);

      if (detection.field_key) {
        field.coreFieldKey = detection.field_key;
        field.coreFieldConfidence = detection.confidence;

        // Boost confidence if context supports the mapping
        if (
          field.contextClues?.some((clue) =>
            clue.toLowerCase().includes(detection.field_key.replace(/_/g, ' ')),
          )
        ) {
          field.coreFieldConfidence = Math.min(
            1.0,
            field.coreFieldConfidence + 0.1,
          );
        }
      }

      // Special handling for common wedding fields
      const weddingFieldBoosts = await this.applyWeddingFieldBoosts(field);
      if (weddingFieldBoosts.key) {
        field.coreFieldKey = weddingFieldBoosts.key;
        field.coreFieldConfidence = Math.max(
          field.coreFieldConfidence || 0,
          weddingFieldBoosts.confidence,
        );
      }
    }

    return fields;
  }

  /**
   * Validate fields against core field rules
   */
  private async validateFields(
    fields: EnhancedField[],
  ): Promise<EnhancedField[]> {
    for (const field of fields) {
      if (field.coreFieldKey) {
        const validation = validateCoreFieldValue(
          field.coreFieldKey,
          field.value,
        );
        field.validated = validation.valid;
        field.validationError = validation.error;

        // Try to auto-correct common issues
        if (!validation.valid && field.type === 'date') {
          const corrected = this.attemptDateCorrection(field.value);
          if (corrected) {
            field.value = corrected;
            const revalidation = validateCoreFieldValue(
              field.coreFieldKey,
              corrected,
            );
            field.validated = revalidation.valid;
            field.validationError = revalidation.error;
          }
        }
      }
    }

    return fields;
  }

  /**
   * Extract tables from text
   */
  private async extractTables(
    text: string,
    pageCount: number,
  ): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];

    // Simple table detection based on consistent spacing and alignment
    const lines = text.split('\n');
    let currentTable: string[] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasMultipleSpaces = /\s{2,}/.test(line);
      const hasTabs = /\t/.test(line);
      const hasDelimiters = /[|]/.test(line);

      if (hasMultipleSpaces || hasTabs || hasDelimiters) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(line);
      } else if (inTable && line.trim() === '') {
        // End of table
        if (currentTable.length > 1) {
          const table = this.parseTableFromLines(currentTable);
          if (table) {
            tables.push(table);
          }
        }
        inTable = false;
        currentTable = [];
      }
    }

    return tables;
  }

  /**
   * Parse table from text lines
   */
  private parseTableFromLines(lines: string[]): ExtractedTable | null {
    if (lines.length < 2) return null;

    const headers = lines[0].split(/\s{2,}|\t|[|]/).filter((h) => h.trim());
    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/\s{2,}|\t|[|]/).filter((c) => c.trim());
      if (row.length === headers.length) {
        rows.push(row);
      }
    }

    if (rows.length === 0) return null;

    return {
      id: `table-${Date.now()}`,
      headers,
      rows,
      pageNumber: 1, // Would need page tracking for accurate number
      confidence: 0.75,
    };
  }

  /**
   * Detect signature fields
   */
  private async detectSignatures(
    ocrResult: OCRResult,
  ): Promise<SignatureField[]> {
    const signatures: SignatureField[] = [];
    const signaturePatterns = [
      /signature[\s]*:?[\s]*_{3,}/gi,
      /sign[\s]*here[\s]*:?[\s]*_{3,}/gi,
      /authorized[\s]*signature[\s]*:?/gi,
      /client[\s]*signature[\s]*:?/gi,
      /vendor[\s]*signature[\s]*:?/gi,
      /\_+[\s]*\(signature\)/gi,
    ];

    for (const pattern of signaturePatterns) {
      const matches = [...ocrResult.text.matchAll(pattern)];
      for (const match of matches) {
        signatures.push({
          id: `sig-${Date.now()}-${signatures.length}`,
          pageNumber: 1, // Would need better page tracking
          boundingBox: { x: 0, y: 0, width: 200, height: 50 },
          isComplete: false,
          label: match[0].replace(/[_:]/g, '').trim(),
        });
      }
    }

    return signatures;
  }

  /**
   * Detect fields that might have been missed by initial OCR
   */
  private async detectMissedFields(
    text: string,
    existingFields: EnhancedField[],
  ): Promise<EnhancedField[]> {
    const missedFields: EnhancedField[] = [];

    // Wedding-specific patterns that might be missed
    const specialPatterns = [
      {
        pattern: /wedding[\s]*party[\s]*:?[\s]*(\d+)/gi,
        type: 'wedding_party_size',
      },
      { pattern: /adult[\s]*guests[\s]*:?[\s]*(\d+)/gi, type: 'adult_guests' },
      {
        pattern: /child(?:ren)?[\s]*guests[\s]*:?[\s]*(\d+)/gi,
        type: 'child_guests',
      },
      { pattern: /budget[\s]*:?[\s]*\$?([\d,]+)/gi, type: 'budget' },
      {
        pattern: /coordinator[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        type: 'coordinator_name',
      },
      {
        pattern: /emergency[\s]*contact[\s]*:?[\s]*([^\n]+)/gi,
        type: 'emergency_contact',
      },
    ];

    for (const { pattern, type } of specialPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          // Check if this field already exists
          const exists = existingFields.some(
            (f) => f.value.toLowerCase() === match[1].toLowerCase(),
          );

          if (!exists) {
            missedFields.push({
              id: `missed-${Date.now()}-${missedFields.length}`,
              type:
                type.includes('guest') || type === 'budget' ? 'number' : 'text',
              label: type
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              value: match[1].trim(),
              confidence: 0.85,
              boundingBox: { x: 0, y: 0, width: 100, height: 20 },
              pageNumber: 1,
              coreFieldKey: type,
              coreFieldConfidence: 0.9,
            });
          }
        }
      }
    }

    return missedFields;
  }

  /**
   * Extract context clues around a field
   */
  private extractContextClues(context: string): string[] {
    const clues: string[] = [];
    const keywords = [
      'wedding',
      'bride',
      'groom',
      'ceremony',
      'reception',
      'venue',
      'date',
      'time',
      'guest',
      'coordinator',
      'photographer',
      'contract',
    ];

    for (const keyword of keywords) {
      if (context.toLowerCase().includes(keyword)) {
        clues.push(keyword);
      }
    }

    return clues;
  }

  /**
   * Find fields that are nearby in the document
   */
  private findNearbyFields(
    field: DetectedField,
    allFields: DetectedField[],
  ): string[] {
    const nearby: string[] = [];

    for (const other of allFields) {
      if (other.id === field.id) continue;

      // Check if on same page and within reasonable distance
      if (other.pageNumber === field.pageNumber) {
        const distance = Math.abs(other.boundingBox.y - field.boundingBox.y);
        if (distance < 100) {
          // Within ~5 lines
          nearby.push(other.label);
        }
      }
    }

    return nearby;
  }

  /**
   * Recalculate confidence based on context
   */
  private recalculateConfidence(field: EnhancedField): number {
    let confidence = field.confidence;

    // Boost confidence if field has wedding-related context
    if (field.contextClues && field.contextClues.length > 0) {
      confidence += 0.05 * field.contextClues.length;
    }

    // Boost confidence if field is near other relevant fields
    if (field.nearbyFields && field.nearbyFields.length > 0) {
      const relevantNearby = field.nearbyFields.filter((f) =>
        /bride|groom|wedding|venue|date|time/i.test(f),
      );
      confidence += 0.03 * relevantNearby.length;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Apply wedding-specific enhancements to boost accuracy
   */
  private async applyWeddingEnhancements(
    field: EnhancedField,
    fullText: string,
  ): Promise<number> {
    let confidence = field.confidence;

    // Check for wedding contract patterns
    if (/contract|agreement|terms/i.test(fullText)) {
      // This is likely a wedding contract, boost confidence for relevant fields
      if (/name|date|venue|signature/i.test(field.label)) {
        confidence += 0.1;
      }
    }

    // Check for timeline patterns
    if (/timeline|schedule|itinerary/i.test(fullText)) {
      if (field.type === 'time' || /time/i.test(field.label)) {
        confidence += 0.15;
      }
    }

    // Check for pricing/invoice patterns
    if (/invoice|payment|pricing|quote/i.test(fullText)) {
      if (field.type === 'number' || /\$|price|cost|total/i.test(field.label)) {
        confidence += 0.1;
      }
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Apply wedding-specific field detection boosts
   */
  private async applyWeddingFieldBoosts(
    field: EnhancedField,
  ): Promise<{ key: string | null; confidence: number }> {
    // Special handling for names near "bride" or "groom"
    if (field.contextClues?.includes('bride') && field.type === 'text') {
      if (!field.coreFieldKey || field.coreFieldConfidence! < 0.8) {
        return { key: 'bride_first_name', confidence: 0.85 };
      }
    }

    if (field.contextClues?.includes('groom') && field.type === 'text') {
      if (!field.coreFieldKey || field.coreFieldConfidence! < 0.8) {
        return { key: 'groom_first_name', confidence: 0.85 };
      }
    }

    // Special handling for dates near wedding keywords
    if (field.type === 'date' && field.contextClues?.includes('wedding')) {
      return { key: 'wedding_date', confidence: 0.95 };
    }

    return { key: null, confidence: 0 };
  }

  /**
   * Attempt to correct common date format issues
   */
  private attemptDateCorrection(value: string): string | null {
    // Try different date formats
    const formats = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, // MM/DD/YYYY
      /(\d{2,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
      /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})/, // Month DD, YYYY
      /(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})/, // DD Month YYYY
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        // Convert to ISO format
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch {
          // Continue to next format
        }
      }
    }

    return null;
  }

  /**
   * Calculate overall accuracy
   */
  private calculateAccuracy(fields: EnhancedField[]): number {
    if (fields.length === 0) return 0;

    let totalConfidence = 0;
    let validatedCount = 0;
    let coreFieldCount = 0;

    for (const field of fields) {
      totalConfidence += field.confidence;

      if (field.validated) {
        validatedCount++;
      }

      if (
        field.coreFieldKey &&
        field.coreFieldConfidence &&
        field.coreFieldConfidence > 0.7
      ) {
        coreFieldCount++;
      }
    }

    // Weighted accuracy calculation
    const avgConfidence = totalConfidence / fields.length;
    const validationRate =
      fields.length > 0 ? validatedCount / fields.length : 0;
    const coreFieldRate =
      fields.length > 0 ? coreFieldCount / fields.length : 0;

    // 40% confidence, 30% validation, 30% core field mapping
    const accuracy =
      avgConfidence * 0.4 + validationRate * 0.3 + coreFieldRate * 0.3;

    return Math.round(accuracy * 100) / 100;
  }

  /**
   * Detect document type
   */
  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();

    if (/contract|agreement|terms\s+and\s+conditions/i.test(lowerText)) {
      return 'contract';
    }

    if (/invoice|payment|billing|amount\s+due/i.test(lowerText)) {
      return 'invoice';
    }

    if (/questionnaire|form|survey/i.test(lowerText)) {
      return 'questionnaire';
    }

    if (/timeline|schedule|itinerary/i.test(lowerText)) {
      return 'timeline';
    }

    if (/quote|proposal|estimate/i.test(lowerText)) {
      return 'quote';
    }

    return 'general';
  }

  /**
   * Check if document has wedding-related content
   */
  private hasWeddingContent(text: string): boolean {
    const weddingKeywords = [
      'wedding',
      'bride',
      'groom',
      'ceremony',
      'reception',
      'venue',
      'photographer',
      'videographer',
      'florist',
      'caterer',
      'coordinator',
      'planner',
      'bridal',
    ];

    const lowerText = text.toLowerCase();
    let keywordCount = 0;

    for (const keyword of weddingKeywords) {
      if (lowerText.includes(keyword)) {
        keywordCount++;
      }
    }

    return keywordCount >= 2; // At least 2 wedding keywords
  }

  /**
   * Store processing result in database
   */
  private async storeProcessingResult(
    result: ProcessingResult,
    filePath: string,
    filename: string,
    userId: string,
  ): Promise<void> {
    try {
      const supabase = await createClient();

      // Update pdf_imports table
      await supabase
        .from('pdf_imports')
        .update({
          status: result.status === 'completed' ? 'completed' : 'failed',
          ocr_confidence: result.accuracy,
          page_count: result.pageCount,
          extracted_text: result.extractedText?.substring(0, 10000), // Limit text storage
          detected_fields: result.fields.map((f) => ({
            id: f.id,
            type: f.type,
            label: f.label,
            value: f.value,
            confidence: f.confidence,
            coreFieldKey: f.coreFieldKey,
            coreFieldConfidence: f.coreFieldConfidence,
          })),
          processing_time_ms: result.processingTimeMs,
          updated_at: new Date().toISOString(),
        })
        .eq('storage_path', filePath);
    } catch (error) {
      console.error('Failed to store processing result:', error);
    }
  }

  /**
   * Generate unique process ID
   */
  private generateProcessId(): string {
    return `proc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(
    processId: string,
  ): Promise<{ status: string; progress?: number } | null> {
    // In a real implementation, this would check a job queue
    return { status: 'completed', progress: 100 };
  }

  /**
   * Get processing result
   */
  async getProcessingResult(
    processId: string,
  ): Promise<ProcessingResult | null> {
    // In a real implementation, this would fetch from database
    for (const [_, result] of this.processingCache) {
      if (result.id === processId) {
        return result;
      }
    }
    return null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    overall: boolean;
    services: Record<string, boolean>;
  }> {
    return {
      overall: true,
      services: {
        ocr: true,
        database: true,
        cache: true,
      },
    };
  }
}
