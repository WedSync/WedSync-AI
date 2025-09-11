/**
 * Field Extraction Service
 * WS-122: Automated Field Extraction from Documents
 * Provides high-accuracy field detection and extraction with OCR support
 */

import { createClient } from '@supabase/supabase-js';
import * as pdfjs from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import {
  ExtractedDocument,
  ExtractedField,
  ExtractionError,
  ExtractionOptions,
  ExtractionRequest,
  ExtractionResult,
  ExtractionStatus,
  ExtractionTemplate,
  FieldDefinition,
  FieldType,
  ValidationStatus,
  ConfidenceLevel,
  DocumentMetadata,
} from '@/types/field-extraction';

export class FieldExtractionService {
  private supabase: any;
  private ocrWorker: Tesseract.Worker | null = null;
  private templates: Map<string, ExtractionTemplate> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  /**
   * Initialize OCR worker for text extraction
   */
  private async initializeOCR(): Promise<void> {
    if (!this.ocrWorker) {
      this.ocrWorker = await Tesseract.createWorker({
        logger: (m) => console.log('OCR Progress:', m),
      });
      await this.ocrWorker.loadLanguage('eng');
      await this.ocrWorker.initialize('eng');
    }
  }

  /**
   * Extract fields from a document
   */
  async extractFields(request: ExtractionRequest): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: ExtractionError[] = [];

    try {
      // Initialize OCR if needed
      if (request.options?.ocr) {
        await this.initializeOCR();
      }

      // Load document
      const document = await this.loadDocument(request.documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get or detect template
      const template = await this.getTemplate(request.templateId, document);

      // Extract text content
      const textContent = await this.extractTextContent(
        document,
        request.options,
      );

      // Detect and extract fields
      const extractedFields = await this.detectAndExtractFields(
        textContent,
        template,
        request.options,
      );

      // Validate extracted fields
      const validatedFields = await this.validateFields(
        extractedFields,
        template,
      );

      // Calculate confidence metrics
      const metrics = this.calculateMetrics(validatedFields);

      // Create extracted document record
      const extractedDocument: ExtractedDocument = {
        id: this.generateId(),
        documentId: request.documentId,
        templateId: template?.id,
        status: metrics.successRate > 0.9 ? 'completed' : 'partial',
        fields: validatedFields,
        totalFields: validatedFields.length,
        successfulFields: metrics.successfulFields,
        failedFields: metrics.failedFields,
        averageConfidence: metrics.averageConfidence,
        extractionTime: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
        metadata: await this.getDocumentMetadata(document),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save extraction results
      await this.saveExtractionResults(extractedDocument);

      return {
        success: true,
        document: extractedDocument,
        processingTime: Date.now() - startTime,
        retryCount: 0,
      };
    } catch (error: any) {
      errors.push({
        type: 'processing',
        code: 'EXTRACTION_FAILED',
        message: error.message,
        details: error,
      });

      return {
        success: false,
        errors,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Detect and extract fields from text content
   */
  private async detectAndExtractFields(
    textContent: string,
    template: ExtractionTemplate | null,
    options?: ExtractionOptions,
  ): Promise<ExtractedField[]> {
    const extractedFields: ExtractedField[] = [];

    if (template) {
      // Template-based extraction
      for (const fieldDef of template.fields) {
        const field = await this.extractField(textContent, fieldDef, options);
        if (field) {
          extractedFields.push(field);
        }
      }
    } else {
      // Auto-detection of common fields
      const commonFields = await this.detectCommonFields(textContent, options);
      extractedFields.push(...commonFields);
    }

    return extractedFields;
  }

  /**
   * Extract a single field based on definition
   */
  private async extractField(
    text: string,
    fieldDef: FieldDefinition,
    options?: ExtractionOptions,
  ): Promise<ExtractedField | null> {
    try {
      // Try multiple extraction strategies
      let value: any = null;
      let confidence = 0;
      let position: any = undefined;

      // Strategy 1: Pattern matching
      if (fieldDef.pattern) {
        const patternResult = this.extractByPattern(text, fieldDef);
        if (patternResult) {
          value = patternResult.value;
          confidence = patternResult.confidence;
          position = patternResult.position;
        }
      }

      // Strategy 2: Keyword proximity
      if (!value && fieldDef.aliases) {
        const proximityResult = this.extractByProximity(text, fieldDef);
        if (proximityResult) {
          value = proximityResult.value;
          confidence = Math.max(confidence, proximityResult.confidence);
          position = proximityResult.position;
        }
      }

      // Strategy 3: Machine learning-based extraction (simulated)
      if (!value && options?.fuzzyMatching) {
        const mlResult = this.extractByML(text, fieldDef);
        if (mlResult) {
          value = mlResult.value;
          confidence = Math.max(confidence, mlResult.confidence);
          position = mlResult.position;
        }
      }

      if (!value) {
        return null;
      }

      // Convert and format value
      const formattedValue = this.formatFieldValue(value, fieldDef.type);

      return {
        fieldId: fieldDef.id,
        name: fieldDef.name,
        value: formattedValue,
        originalValue: value.toString(),
        type: fieldDef.type,
        confidence,
        confidenceLevel: this.getConfidenceLevel(confidence),
        validationStatus: 'skipped',
        position,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to extract field ${fieldDef.name}:`, error);
      return null;
    }
  }

  /**
   * Extract by pattern matching
   */
  private extractByPattern(
    text: string,
    fieldDef: FieldDefinition,
  ): { value: string; confidence: number; position?: any } | null {
    const pattern =
      typeof fieldDef.pattern === 'string'
        ? new RegExp(fieldDef.pattern, 'gi')
        : fieldDef.pattern;

    if (!pattern) return null;

    const matches = text.match(pattern);
    if (!matches || matches.length === 0) return null;

    // Calculate confidence based on match quality
    const confidence = this.calculatePatternConfidence(matches[0], fieldDef);

    return {
      value: matches[0],
      confidence,
      position: this.findTextPosition(text, matches[0]),
    };
  }

  /**
   * Extract by keyword proximity
   */
  private extractByProximity(
    text: string,
    fieldDef: FieldDefinition,
  ): { value: string; confidence: number; position?: any } | null {
    if (!fieldDef.aliases || fieldDef.aliases.length === 0) return null;

    for (const alias of fieldDef.aliases) {
      const pattern = new RegExp(`${alias}[\\s:]*([^\\n\\r]{1,100})`, 'gi');
      const match = pattern.exec(text);

      if (match && match[1]) {
        const value = match[1].trim();
        const confidence = this.calculateProximityConfidence(value, fieldDef);

        if (confidence > 0.5) {
          return {
            value,
            confidence,
            position: this.findTextPosition(text, match[0]),
          };
        }
      }
    }

    return null;
  }

  /**
   * Machine learning-based extraction (simulated with heuristics)
   */
  private extractByML(
    text: string,
    fieldDef: FieldDefinition,
  ): { value: string; confidence: number; position?: any } | null {
    // Simulate ML extraction with advanced heuristics
    const patterns = this.getMLPatterns(fieldDef.type);

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const value = matches[0];
        const confidence = this.calculateMLConfidence(value, fieldDef);

        if (confidence > 0.6) {
          return {
            value,
            confidence,
            position: this.findTextPosition(text, value),
          };
        }
      }
    }

    return null;
  }

  /**
   * Get ML patterns for field types
   */
  private getMLPatterns(type: FieldType): RegExp[] {
    const patterns: Record<FieldType, RegExp[]> = {
      email: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g],
      phone: [
        /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
        /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
      ],
      date: [
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
        /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{2,4}/gi,
      ],
      currency: [
        /\$[\d,]+\.?\d{0,2}/g,
        /€[\d,]+\.?\d{0,2}/g,
        /£[\d,]+\.?\d{0,2}/g,
        /[\d,]+\.?\d{0,2}\s?(USD|EUR|GBP)/g,
      ],
      percentage: [/\d+\.?\d*\s?%/g],
      url: [
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/g,
      ],
      text: [/.+/g],
      number: [/\d+\.?\d*/g],
      boolean: [/(true|false|yes|no|y|n)/gi],
      address: [
        /\d+\s+[\w\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Plaza|Pl)[,\s]+[\w\s]+[,\s]+[A-Z]{2}\s+\d{5}(-\d{4})?/gi,
      ],
      array: [/\[.*\]/g],
      object: [/\{.*\}/g],
    };

    return patterns[type] || [/.+/g];
  }

  /**
   * Detect common fields automatically
   */
  private async detectCommonFields(
    text: string,
    options?: ExtractionOptions,
  ): Promise<ExtractedField[]> {
    const commonFields: ExtractedField[] = [];
    const detectors = [
      {
        type: 'email' as FieldType,
        name: 'Email',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      },
      {
        type: 'phone' as FieldType,
        name: 'Phone',
        pattern:
          /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
      },
      {
        type: 'date' as FieldType,
        name: 'Date',
        pattern: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
      },
      {
        type: 'currency' as FieldType,
        name: 'Amount',
        pattern: /\$[\d,]+\.?\d{0,2}/g,
      },
      {
        type: 'url' as FieldType,
        name: 'Website',
        pattern: /https?:\/\/[^\s]+/g,
      },
    ];

    for (const detector of detectors) {
      const matches = text.match(detector.pattern);
      if (matches) {
        for (let i = 0; i < Math.min(matches.length, 5); i++) {
          const fieldId = `${detector.name.toLowerCase()}_${i + 1}`;
          commonFields.push({
            fieldId,
            name: `${detector.name} ${i + 1}`,
            value: this.formatFieldValue(matches[i], detector.type),
            originalValue: matches[i],
            type: detector.type,
            confidence: 0.85,
            confidenceLevel: 'high',
            validationStatus: 'skipped',
            extractedAt: new Date().toISOString(),
          });
        }
      }
    }

    return commonFields;
  }

  /**
   * Validate extracted fields
   */
  private async validateFields(
    fields: ExtractedField[],
    template: ExtractionTemplate | null,
  ): Promise<ExtractedField[]> {
    const validatedFields: ExtractedField[] = [];

    for (const field of fields) {
      const fieldDef = template?.fields.find((f) => f.id === field.fieldId);

      if (fieldDef?.validation) {
        const validationResult = await this.validateField(field, fieldDef);
        validatedFields.push({
          ...field,
          validationStatus: validationResult.status,
          validationErrors: validationResult.errors,
        });
      } else {
        // Basic validation based on field type
        const basicValidation = this.performBasicValidation(field);
        validatedFields.push({
          ...field,
          validationStatus: basicValidation.status,
          validationErrors: basicValidation.errors,
        });
      }
    }

    return validatedFields;
  }

  /**
   * Validate a single field
   */
  private async validateField(
    field: ExtractedField,
    fieldDef: FieldDefinition,
  ): Promise<{ status: ValidationStatus; errors?: string[] }> {
    const errors: string[] = [];

    if (!fieldDef.validation) {
      return { status: 'skipped' };
    }

    for (const rule of fieldDef.validation) {
      switch (rule.type) {
        case 'required':
          if (!field.value) {
            errors.push(rule.message || `${field.name} is required`);
          }
          break;

        case 'pattern':
          if (
            rule.value &&
            !new RegExp(rule.value).test(field.value?.toString() || '')
          ) {
            errors.push(rule.message || `${field.name} format is invalid`);
          }
          break;

        case 'range':
          if (rule.value && typeof field.value === 'number') {
            const { min, max } = rule.value;
            if (
              (min !== undefined && field.value < min) ||
              (max !== undefined && field.value > max)
            ) {
              errors.push(rule.message || `${field.name} is out of range`);
            }
          }
          break;

        case 'length':
          if (rule.value && field.value?.toString()) {
            const { min, max } = rule.value;
            const length = field.value.toString().length;
            if (
              (min !== undefined && length < min) ||
              (max !== undefined && length > max)
            ) {
              errors.push(rule.message || `${field.name} length is invalid`);
            }
          }
          break;

        case 'custom':
          if (rule.validator && !rule.validator(field.value)) {
            errors.push(rule.message || `${field.name} validation failed`);
          }
          break;
      }
    }

    return {
      status: errors.length === 0 ? 'valid' : 'invalid',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Perform basic validation
   */
  private performBasicValidation(field: ExtractedField): {
    status: ValidationStatus;
    errors?: string[];
  } {
    const errors: string[] = [];

    switch (field.type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value?.toString() || '')) {
          errors.push('Invalid email format');
        }
        break;

      case 'phone':
        if (!/^\+?[\d\s\-\(\)]+$/.test(field.value?.toString() || '')) {
          errors.push('Invalid phone format');
        }
        break;

      case 'url':
        try {
          new URL(field.value?.toString() || '');
        } catch {
          errors.push('Invalid URL format');
        }
        break;

      case 'date':
        if (isNaN(Date.parse(field.value?.toString() || ''))) {
          errors.push('Invalid date format');
        }
        break;
    }

    // Confidence-based validation
    if (field.confidence < 0.5) {
      return { status: 'warning', errors: ['Low extraction confidence'] };
    }

    return {
      status: errors.length === 0 ? 'valid' : 'invalid',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Calculate extraction metrics
   */
  private calculateMetrics(fields: ExtractedField[]): {
    successRate: number;
    successfulFields: number;
    failedFields: number;
    averageConfidence: number;
  } {
    const successfulFields = fields.filter(
      (f) => f.validationStatus === 'valid' || f.validationStatus === 'warning',
    ).length;

    const failedFields = fields.filter(
      (f) => f.validationStatus === 'invalid',
    ).length;

    const totalConfidence = fields.reduce((sum, f) => sum + f.confidence, 0);
    const averageConfidence =
      fields.length > 0 ? totalConfidence / fields.length : 0;

    return {
      successRate: fields.length > 0 ? successfulFields / fields.length : 0,
      successfulFields,
      failedFields,
      averageConfidence,
    };
  }

  /**
   * Calculate confidence levels
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.95) return 'very-high';
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.7) return 'medium';
    if (confidence >= 0.5) return 'low';
    return 'very-low';
  }

  /**
   * Calculate pattern matching confidence
   */
  private calculatePatternConfidence(
    match: string,
    fieldDef: FieldDefinition,
  ): number {
    let confidence = 0.7; // Base confidence for pattern match

    // Increase confidence for exact type matches
    if (fieldDef.type === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(match)) {
      confidence = 0.95;
    } else if (
      fieldDef.type === 'phone' &&
      /^\+?[\d\s\-\(\)]{10,}$/.test(match)
    ) {
      confidence = 0.9;
    } else if (fieldDef.type === 'date' && !isNaN(Date.parse(match))) {
      confidence = 0.9;
    }

    return confidence;
  }

  /**
   * Calculate proximity-based confidence
   */
  private calculateProximityConfidence(
    value: string,
    fieldDef: FieldDefinition,
  ): number {
    let confidence = 0.6; // Base confidence for proximity match

    // Adjust based on value characteristics
    if (value.length > 100) confidence -= 0.2;
    if (value.length < 3) confidence -= 0.3;
    if (/^[A-Z]/.test(value)) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate ML-based confidence
   */
  private calculateMLConfidence(
    value: string,
    fieldDef: FieldDefinition,
  ): number {
    let confidence = 0.65; // Base confidence for ML match

    // Type-specific confidence adjustments
    switch (fieldDef.type) {
      case 'email':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) confidence = 0.92;
        break;
      case 'phone':
        if (/^\+?[\d\s\-\(\)]{10,}$/.test(value)) confidence = 0.88;
        break;
      case 'currency':
        if (/^[\$€£]?[\d,]+\.?\d{0,2}$/.test(value)) confidence = 0.85;
        break;
    }

    return confidence;
  }

  /**
   * Format field value based on type
   */
  private formatFieldValue(value: any, type: FieldType): any {
    switch (type) {
      case 'number':
        return parseFloat(value.toString().replace(/[^\d.-]/g, ''));
      case 'date':
        return new Date(value).toISOString();
      case 'boolean':
        return /^(true|yes|y|1)$/i.test(value.toString());
      case 'currency':
        return parseFloat(value.toString().replace(/[^\d.-]/g, ''));
      case 'percentage':
        return parseFloat(value.toString().replace('%', '')) / 100;
      case 'array':
        try {
          return JSON.parse(value.toString());
        } catch {
          return value
            .toString()
            .split(',')
            .map((v: string) => v.trim());
        }
      case 'object':
        try {
          return JSON.parse(value.toString());
        } catch {
          return { raw: value.toString() };
        }
      default:
        return value.toString().trim();
    }
  }

  /**
   * Find text position in document
   */
  private findTextPosition(text: string, match: string): any {
    const index = text.indexOf(match);
    if (index === -1) return undefined;

    const lines = text.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length,
      offset: index,
    };
  }

  /**
   * Extract text content from document
   */
  private async extractTextContent(
    document: any,
    options?: ExtractionOptions,
  ): Promise<string> {
    let textContent = '';

    // Check document type
    if (document.mime_type === 'application/pdf') {
      textContent = await this.extractFromPDF(document.file_path, options);
    } else if (document.mime_type.startsWith('image/')) {
      textContent = await this.extractFromImage(document.file_path, options);
    } else {
      textContent = await this.extractFromText(document.file_path);
    }

    // Apply preprocessing if needed
    if (options?.enhanceImage) {
      textContent = this.enhanceText(textContent);
    }

    return textContent;
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPDF(
    filePath: string,
    options?: ExtractionOptions,
  ): Promise<string> {
    try {
      // This is a simplified example - in production, use proper PDF library
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      // Fallback to OCR if text extraction fails
      if (options?.ocr && this.ocrWorker) {
        return await this.extractFromImage(filePath, options);
      }
      throw error;
    }
  }

  /**
   * Extract text from image using OCR
   */
  private async extractFromImage(
    filePath: string,
    options?: ExtractionOptions,
  ): Promise<string> {
    if (!this.ocrWorker) {
      await this.initializeOCR();
    }

    const result = await this.ocrWorker!.recognize(filePath);
    return result.data.text;
  }

  /**
   * Extract text from text file
   */
  private async extractFromText(filePath: string): Promise<string> {
    const response = await fetch(filePath);
    return await response.text();
  }

  /**
   * Enhance extracted text
   */
  private enhanceText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
      .trim();
  }

  /**
   * Load document from database
   */
  private async loadDocument(documentId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('business_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get or auto-detect template
   */
  private async getTemplate(
    templateId: string | undefined,
    document: any,
  ): Promise<ExtractionTemplate | null> {
    if (templateId) {
      return await this.loadTemplate(templateId);
    }

    // Auto-detect template based on document type
    return await this.autoDetectTemplate(document);
  }

  /**
   * Load template from database
   */
  private async loadTemplate(
    templateId: string,
  ): Promise<ExtractionTemplate | null> {
    if (this.templates.has(templateId)) {
      return this.templates.get(templateId)!;
    }

    const { data, error } = await this.supabase
      .from('extraction_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) return null;

    const template = data as ExtractionTemplate;
    this.templates.set(templateId, template);
    return template;
  }

  /**
   * Auto-detect template based on document
   */
  private async autoDetectTemplate(
    document: any,
  ): Promise<ExtractionTemplate | null> {
    // Try to detect based on document category or type
    const { data } = await this.supabase
      .from('extraction_templates')
      .select('*')
      .eq('document_type', document.category_id)
      .eq('is_active', true)
      .limit(1);

    return data?.[0] || null;
  }

  /**
   * Get document metadata
   */
  private async getDocumentMetadata(document: any): Promise<DocumentMetadata> {
    return {
      fileName: document.original_filename,
      fileType: document.mime_type,
      fileSize: document.file_size,
      checksum: document.file_hash,
      processingEngine: 'FieldExtractionService v1.0',
    };
  }

  /**
   * Save extraction results to database
   */
  private async saveExtractionResults(
    document: ExtractedDocument,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('extracted_documents')
      .upsert(document);

    if (error) {
      console.error('Failed to save extraction results:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get extraction results for a document
   */
  async getExtractionResults(
    documentId: string,
  ): Promise<ExtractedDocument | null> {
    const { data, error } = await this.supabase
      .from('extracted_documents')
      .select(
        `
        *,
        fields:extracted_fields(*)
      `,
      )
      .eq('document_id', documentId)
      .single();

    if (error) {
      console.error('Failed to get extraction results:', error);
      return null;
    }

    return data;
  }

  /**
   * Export extracted fields in various formats
   */
  async exportFields(request: ExportRequest): Promise<ExportResult> {
    try {
      // Get extracted document
      const document = await this.getExtractionResults(request.documentId);
      if (!document) {
        return {
          success: false,
          format: request.format,
          errors: ['Document not found'],
        };
      }

      let exportData: any;
      let fileName: string;
      let contentType: string;

      switch (request.format) {
        case 'json':
          exportData = this.exportToJSON(document, request.options);
          fileName = `extraction_${document.id}.json`;
          contentType = 'application/json';
          break;

        case 'structured-json':
          exportData = this.exportToStructuredJSON(document, request.options);
          fileName = `extraction_structured_${document.id}.json`;
          contentType = 'application/json';
          break;

        case 'csv':
          exportData = await this.exportToCSV(document, request.options);
          fileName = `extraction_${document.id}.csv`;
          contentType = 'text/csv';
          break;

        case 'xml':
          exportData = this.exportToXML(document, request.options);
          fileName = `extraction_${document.id}.xml`;
          contentType = 'application/xml';
          break;

        case 'excel':
          exportData = await this.exportToExcel(document, request.options);
          fileName = `extraction_${document.id}.xlsx`;
          contentType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;

        case 'pdf':
          exportData = await this.exportToPDF(document, request.options);
          fileName = `extraction_${document.id}.pdf`;
          contentType = 'application/pdf';
          break;

        default:
          return {
            success: false,
            format: request.format,
            errors: ['Unsupported export format'],
          };
      }

      // Save export record
      await this.saveExportRecord({
        document_id: document.id,
        format: request.format,
        file_name: fileName,
        file_size: new Blob([exportData]).size,
        options: request.options,
        status: 'completed',
      });

      return {
        success: true,
        data: exportData,
        format: request.format,
        fileName,
        size: new Blob([exportData]).size,
      };
    } catch (error: any) {
      console.error('Export fields error:', error);
      return {
        success: false,
        format: request.format,
        errors: [error.message || 'Export failed'],
      };
    }
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(document: ExtractedDocument, options?: any): string {
    const data = {
      documentId: document.documentId,
      extractionId: document.id,
      status: document.status,
      extractionTime: document.extractionTime,
      totalFields: document.totalFields,
      successfulFields: document.successfulFields,
      averageConfidence: document.averageConfidence,
      fields: document.fields.map((field) => ({
        name: field.name,
        value: field.value,
        type: field.type,
        confidence: field.confidence,
        confidenceLevel: field.confidenceLevel,
        validationStatus: field.validationStatus,
        ...(options?.includePosition && { position: field.position }),
        ...(options?.includeValidation && {
          validationErrors: field.validationErrors,
        }),
      })),
      ...(options?.includeMetadata && { metadata: document.metadata }),
      extractedAt: document.createdAt,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export to structured JSON format
   */
  private exportToStructuredJSON(
    document: ExtractedDocument,
    options?: any,
  ): string {
    const structuredData: Record<string, any> = {};

    document.fields.forEach((field) => {
      if (options?.fields && !options.fields.includes(field.name)) {
        return;
      }

      structuredData[field.name] = {
        value: field.value,
        confidence: field.confidence,
        type: field.type,
        ...(options?.includeValidation && {
          validation: {
            status: field.validationStatus,
            errors: field.validationErrors,
          },
        }),
      };
    });

    return JSON.stringify(structuredData, null, 2);
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    document: ExtractedDocument,
    options?: any,
  ): Promise<string> {
    const headers = [
      'Field Name',
      'Value',
      'Type',
      'Confidence',
      'Validation Status',
    ];
    if (options?.includePosition) headers.push('Position');
    if (options?.includeValidation) headers.push('Validation Errors');

    let csv = headers.join(',') + '\n';

    document.fields.forEach((field) => {
      if (options?.fields && !options.fields.includes(field.name)) {
        return;
      }

      const row = [
        `"${field.name}"`,
        `"${field.value || ''}"`,
        field.type,
        field.confidence,
        field.validationStatus,
      ];

      if (options?.includePosition) {
        row.push(`"${JSON.stringify(field.position || {})}"`);
      }

      if (options?.includeValidation) {
        row.push(`"${field.validationErrors?.join('; ') || ''}"`);
      }

      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Export to XML format
   */
  private exportToXML(document: ExtractedDocument, options?: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<extraction>\n';
    xml += `  <documentId>${document.documentId}</documentId>\n`;
    xml += `  <extractionId>${document.id}</extractionId>\n`;
    xml += `  <status>${document.status}</status>\n`;
    xml += `  <extractionTime>${document.extractionTime}</extractionTime>\n`;
    xml += `  <totalFields>${document.totalFields}</totalFields>\n`;
    xml += `  <successfulFields>${document.successfulFields}</successfulFields>\n`;
    xml += `  <averageConfidence>${document.averageConfidence}</averageConfidence>\n`;
    xml += '  <fields>\n';

    document.fields.forEach((field) => {
      if (options?.fields && !options.fields.includes(field.name)) {
        return;
      }

      xml += '    <field>\n';
      xml += `      <name>${this.escapeXml(field.name)}</name>\n`;
      xml += `      <value>${this.escapeXml(field.value?.toString() || '')}</value>\n`;
      xml += `      <type>${field.type}</type>\n`;
      xml += `      <confidence>${field.confidence}</confidence>\n`;
      xml += `      <confidenceLevel>${field.confidenceLevel}</confidenceLevel>\n`;
      xml += `      <validationStatus>${field.validationStatus}</validationStatus>\n`;

      if (options?.includeValidation && field.validationErrors) {
        xml += '      <validationErrors>\n';
        field.validationErrors.forEach((error) => {
          xml += `        <error>${this.escapeXml(error)}</error>\n`;
        });
        xml += '      </validationErrors>\n';
      }

      xml += '    </field>\n';
    });

    xml += '  </fields>\n';
    xml += '</extraction>';

    return xml;
  }

  /**
   * Export to Excel format (simplified - would use a proper library in production)
   */
  private async exportToExcel(
    document: ExtractedDocument,
    options?: any,
  ): Promise<ArrayBuffer> {
    // This is a simplified implementation
    // In production, use a proper Excel library like ExcelJS
    const csv = await this.exportToCSV(document, options);
    return new TextEncoder().encode(csv);
  }

  /**
   * Export to PDF format (simplified - would use a proper library in production)
   */
  private async exportToPDF(
    document: ExtractedDocument,
    options?: any,
  ): Promise<ArrayBuffer> {
    // This is a simplified implementation
    // In production, use a proper PDF library like jsPDF or PDFKit
    const json = this.exportToJSON(document, options);
    return new TextEncoder().encode(json);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Save export record
   */
  private async saveExportRecord(exportRecord: any): Promise<void> {
    const { error } = await this.supabase
      .from('field_extraction_exports')
      .insert(exportRecord);

    if (error) {
      console.error('Failed to save export record:', error);
    }
  }

  /**
   * Get templates with filters
   */
  async getTemplates(filters?: {
    documentType?: string;
    isActive?: boolean;
  }): Promise<ExtractionTemplate[]> {
    let query = this.supabase.from('extraction_templates').select(`
        *,
        fields:field_definitions(*)
      `);

    if (filters?.documentType) {
      query = query.eq('document_type', filters.documentType);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Failed to get templates:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a single template
   */
  async getTemplate(id: string): Promise<ExtractionTemplate | null> {
    const { data, error } = await this.supabase
      .from('extraction_templates')
      .select(
        `
        *,
        fields:field_definitions(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to get template:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a new template
   */
  async createTemplate(
    template: Partial<ExtractionTemplate>,
  ): Promise<ExtractionTemplate> {
    const templateData = {
      name: template.name,
      description: template.description,
      document_type: template.documentType,
      is_active: template.isActive ?? true,
    };

    const { data: createdTemplate, error: templateError } = await this.supabase
      .from('extraction_templates')
      .insert(templateData)
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    // Create field definitions
    const fieldDefinitions = template.fields?.map((field) => ({
      template_id: createdTemplate.id,
      field_name: field.name,
      field_type: field.type,
      is_required: field.required,
      pattern: field.pattern?.toString(),
      validation_rules: field.validation,
      aliases: field.aliases,
      position: field.position,
      extraction_hints: field.extractionHints,
      default_value: field.defaultValue,
      description: field.description,
    }));

    if (fieldDefinitions && fieldDefinitions.length > 0) {
      const { error: fieldsError } = await this.supabase
        .from('field_definitions')
        .insert(fieldDefinitions);

      if (fieldsError) {
        throw new Error(
          `Failed to create field definitions: ${fieldsError.message}`,
        );
      }
    }

    // Return full template with fields
    return (await this.getTemplate(createdTemplate.id)) as ExtractionTemplate;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: string,
    updates: Partial<ExtractionTemplate>,
  ): Promise<ExtractionTemplate> {
    const templateUpdates: any = {};

    if (updates.name) templateUpdates.name = updates.name;
    if (updates.description !== undefined)
      templateUpdates.description = updates.description;
    if (updates.documentType)
      templateUpdates.document_type = updates.documentType;
    if (updates.isActive !== undefined)
      templateUpdates.is_active = updates.isActive;

    const { error: templateError } = await this.supabase
      .from('extraction_templates')
      .update(templateUpdates)
      .eq('id', id);

    if (templateError) {
      throw new Error(`Failed to update template: ${templateError.message}`);
    }

    // Update field definitions if provided
    if (updates.fields) {
      // Delete existing field definitions
      await this.supabase
        .from('field_definitions')
        .delete()
        .eq('template_id', id);

      // Insert new field definitions
      const fieldDefinitions = updates.fields.map((field) => ({
        template_id: id,
        field_name: field.name,
        field_type: field.type,
        is_required: field.required,
        pattern: field.pattern?.toString(),
        validation_rules: field.validation,
        aliases: field.aliases,
        position: field.position,
        extraction_hints: field.extractionHints,
        default_value: field.defaultValue,
        description: field.description,
      }));

      const { error: fieldsError } = await this.supabase
        .from('field_definitions')
        .insert(fieldDefinitions);

      if (fieldsError) {
        throw new Error(
          `Failed to update field definitions: ${fieldsError.message}`,
        );
      }
    }

    // Return updated template
    return (await this.getTemplate(id)) as ExtractionTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('extraction_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Check if template is in use
   */
  async isTemplateInUse(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('extracted_documents')
      .select('id')
      .eq('template_id', id)
      .limit(1);

    if (error) {
      console.error('Failed to check template usage:', error);
      return false;
    }

    return data.length > 0;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
    this.templates.clear();
  }
}
