import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient } from '@/lib/supabase/server';

// Google Cloud Vision client
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedField {
  id: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'date'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'signature';
  label: string;
  value: string;
  confidence: number;
  boundingBox: BoundingBox;
  pageNumber: number;
}

export interface OCRResult {
  confidence: number;
  text: string;
  fields: DetectedField[];
  pageCount: number;
  processingTimeMs: number;
}

// Enhanced field detection patterns for wedding documents
const FIELD_PATTERNS = {
  email: [
    /[\w.-]+@[\w.-]+\.\w+/g,
    /(?:email|e-mail)[\s]*:?[\s]*([\w.-]+@[\w.-]+\.\w+)/gi,
    /(?:contact|primary|secondary)[\s]*(?:email|e-mail)[\s]*:?[\s]*([\w.-]+@[\w.-]+\.\w+)/gi,
    /(?:bride|groom|client|vendor)[\s]*(?:email|e-mail)[\s]*:?[\s]*([\w.-]+@[\w.-]+\.\w+)/gi,
  ],
  phone: [
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /(?:phone|ph|tel|telephone)[\s]*(?:#|number)?[\s]*:?[\s]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/gi,
    /(?:cell|mobile|work|home|office)[\s]*(?:phone)?[\s]*:?[\s]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/gi,
    /(?:bride|groom|coordinator|vendor)[\s]*(?:phone|contact)[\s]*:?[\s]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/gi,
    /(?:emergency)[\s]*(?:contact|phone)[\s]*:?[\s]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/gi,
  ],
  date: [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
    /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
    /([A-Za-z]+\s+\d{1,2},?\s+\d{2,4})/g, // Month DD, YYYY
    /(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/g, // DD Month YYYY
    /(?:date|dt)[\s]*:?[\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
    /(?:wedding|ceremony|reception|event)[\s]*(?:date|day)[\s]*:?[\s]*([^\n]+)/gi,
    /(?:contract|booking|signed)[\s]*(?:date)[\s]*:?[\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
  ],
  name: [
    /(?:name|client)[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
    /(?:bride|her)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
    /(?:groom|his)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
    /(?:coordinator|planner)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi,
    /(?:photographer|videographer|florist|caterer|dj|band)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:mr\.|mrs\.|ms\.|miss)[\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/gi,
  ],
  address: [
    /(?:address|addr)[\s]*:?[\s]*([^\n]+(?:\n[^\n]+)?)/gi,
    /(?:location|venue|place)[\s]*:?[\s]*([^\n]+)/gi,
    /(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl|circle|cir)[^\n]*)/gi,
    /(?:ceremony|reception)[\s]*(?:venue|location|address)[\s]*:?[\s]*([^\n]+)/gi,
  ],
  number: [
    /\$[\d,]+(?:\.\d{2})?/g,
    /(?:price|cost|fee|rate|amount|total|subtotal|balance|deposit)[\s]*:?[\s]*\$?([\d,]+(?:\.\d{2})?)/gi,
    /(?:guest|guests)[\s]*(?:count|number|total)?[\s]*:?[\s]*(\d+)/gi,
    /(?:adult|adults)[\s]*(?:guests)?[\s]*:?[\s]*(\d+)/gi,
    /(?:child|children|kids)[\s]*(?:guests)?[\s]*:?[\s]*(\d+)/gi,
    /(?:wedding[\s]*)?party[\s]*(?:size|members)?[\s]*:?[\s]*(\d+)/gi,
    /(?:tables?|seats?)[\s]*:?[\s]*(\d+)/gi,
    /(?:hours?|hrs?)[\s]*(?:of[\s]*)?(?:coverage|service)?[\s]*:?[\s]*(\d+(?:\.\d+)?)/gi,
  ],
  time: [
    /(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?)/g,
    /(?:time|start|begin|end)[\s]*:?[\s]*(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?)/gi,
    /(?:ceremony|reception|cocktail[\s]*hour|dinner|first[\s]*dance|cake[\s]*cutting)[\s]*(?:time|start|begins)?[\s]*:?[\s]*(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?)/gi,
    /(?:getting[\s]*ready|first[\s]*look|photos?|send[\s]*off)[\s]*(?:time|start)?[\s]*:?[\s]*(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?)/gi,
  ],
  venue: [
    /(?:venue|location)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][A-Za-z\s&']+)/gi,
    /(?:ceremony|reception)[\s]*(?:venue|location|site|place)[\s]*:?[\s]*([A-Z][A-Za-z\s&']+)/gi,
    /(?:at|@)[\s]+([A-Z][A-Za-z\s&']+(?:hotel|resort|club|gardens?|estate|vineyard|winery|barn|farm|hall|center|church|chapel))/gi,
  ],
};

// Core wedding fields to detect
const CORE_WEDDING_FIELDS = [
  'bride_name',
  'groom_name',
  'wedding_date',
  'venue_name',
  'venue_address',
  'email',
  'phone',
  'emergency_contact',
  'guest_count',
  'budget',
  'ceremony_time',
  'reception_time',
  'coordinator_name',
  'coordinator_phone',
];

export class OCRService {
  /**
   * Extract text and fields from PDF using Google Cloud Vision
   */
  static async extractFromPDF(
    pdfPath: string,
    options: {
      extractionMode?: 'auto' | 'manual' | 'hybrid';
      pageNumbers?: number[];
      confidenceThreshold?: number;
    } = {},
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const {
      extractionMode = 'auto',
      pageNumbers,
      confidenceThreshold = 0.7,
    } = options;

    try {
      const supabase = await createClient();

      // Download PDF from Supabase Storage
      const { data: pdfBuffer, error: downloadError } = await supabase.storage
        .from('pdf-uploads')
        .download(pdfPath);

      if (downloadError) {
        throw new Error(`Failed to download PDF: ${downloadError.message}`);
      }

      // Convert PDF buffer to base64 for Google Vision
      const pdfBase64 = Buffer.from(await pdfBuffer.arrayBuffer()).toString(
        'base64',
      );

      // Call Google Cloud Vision API
      const [result] = await vision.documentTextDetection({
        image: {
          content: pdfBase64,
        },
        imageContext: {
          languageHints: ['en'],
        },
      });

      if (!result.fullTextAnnotation) {
        throw new Error('No text found in PDF');
      }

      const fullText = result.fullTextAnnotation.text || '';
      const pages = result.fullTextAnnotation.pages || [];

      // Extract fields based on mode
      let detectedFields: DetectedField[] = [];

      if (extractionMode === 'auto' || extractionMode === 'hybrid') {
        detectedFields = this.extractFieldsFromText(
          fullText,
          pages,
          confidenceThreshold,
        );
      }

      // If hybrid mode and confidence is low, could add manual annotation here
      if (
        extractionMode === 'hybrid' &&
        this.getAverageConfidence(detectedFields) < 0.8
      ) {
        // TODO: Trigger manual review workflow
        console.log('Low confidence detected, manual review recommended');
      }

      const processingTime = Date.now() - startTime;

      return {
        confidence: this.getAverageConfidence(detectedFields),
        text: fullText,
        fields: detectedFields,
        pageCount: pages.length,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extract fields from raw text using pattern matching with enhanced accuracy
   */
  private static extractFieldsFromText(
    text: string,
    pages: any[],
    confidenceThreshold: number,
  ): DetectedField[] {
    const fields: DetectedField[] = [];
    let fieldCounter = 1;

    // Pre-process text for better extraction
    const normalizedText = text.replace(/\s+/g, ' '); // Normalize whitespace
    const lines = text.split('\n');

    // Extract different field types with priority ordering
    const fieldTypeOrder = [
      'email',
      'phone',
      'date',
      'time',
      'venue',
      'name',
      'address',
      'number',
    ];

    fieldTypeOrder.forEach((fieldType) => {
      const patterns = FIELD_PATTERNS[fieldType];
      if (!patterns) return;

      patterns.forEach((pattern) => {
        const matches = [...text.matchAll(pattern)];

        matches.forEach((match) => {
          if (match[1] || match[0]) {
            const value = (match[1] || match[0]).trim();

            // Skip if value is too short or too long
            if (value.length < 2 || value.length > 200) return;

            // Skip if already extracted with higher confidence
            const existingField = fields.find(
              (f) =>
                f.value.toLowerCase() === value.toLowerCase() &&
                f.confidence > 0.9,
            );
            if (existingField) return;

            const confidence = this.calculateConfidence(
              fieldType,
              value,
              match,
            );

            if (confidence >= confidenceThreshold) {
              // Get line context for better label generation
              const lineIndex = this.findLineContaining(lines, value);
              const contextLine = lineIndex >= 0 ? lines[lineIndex] : '';

              const field: DetectedField = {
                id: `field-${fieldCounter++}`,
                type: this.mapToFieldType(fieldType),
                label: this.generateLabel(fieldType, value, contextLine),
                value: value,
                confidence,
                boundingBox: this.estimateBoundingBox(match, text, lineIndex),
                pageNumber: this.estimatePageNumber(
                  match.index || 0,
                  text,
                  pages,
                ),
              };

              fields.push(field);
            }
          }
        });
      });
    });

    // Post-process to improve field relationships
    const enhancedFields = this.enhanceFieldRelationships(fields);

    // Remove duplicates and merge similar fields
    return this.deduplicateFields(enhancedFields);
  }

  /**
   * Find the line containing a specific value
   */
  private static findLineContaining(lines: string[], value: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(value)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Estimate page number based on text position
   */
  private static estimatePageNumber(
    index: number,
    text: string,
    pages: any[],
  ): number {
    if (!pages || pages.length === 0) return 1;

    const textLength = text.length;
    const charsPerPage = Math.ceil(textLength / pages.length);
    const pageNumber = Math.ceil((index + 1) / charsPerPage);

    return Math.min(pageNumber, pages.length);
  }

  /**
   * Enhance field relationships based on proximity and context
   */
  private static enhanceFieldRelationships(
    fields: DetectedField[],
  ): DetectedField[] {
    const enhanced = [...fields];

    // Group fields by proximity
    for (let i = 0; i < enhanced.length; i++) {
      for (let j = i + 1; j < enhanced.length; j++) {
        const field1 = enhanced[i];
        const field2 = enhanced[j];

        // Check if fields are on same page and close together
        if (field1.pageNumber === field2.pageNumber) {
          const distance = Math.abs(
            field1.boundingBox.y - field2.boundingBox.y,
          );

          // If fields are very close, they might be related
          if (distance < 50) {
            // Boost confidence if they form a logical pair
            if (this.isLogicalPair(field1, field2)) {
              field1.confidence = Math.min(1.0, field1.confidence + 0.05);
              field2.confidence = Math.min(1.0, field2.confidence + 0.05);
            }
          }
        }
      }
    }

    return enhanced;
  }

  /**
   * Check if two fields form a logical pair
   */
  private static isLogicalPair(
    field1: DetectedField,
    field2: DetectedField,
  ): boolean {
    const pairs = [
      ['name', 'email'],
      ['name', 'phone'],
      ['venue', 'address'],
      ['date', 'time'],
      ['email', 'phone'],
    ];

    const type1 =
      field1.type === 'text'
        ? this.inferFieldTypeFromLabel(field1.label)
        : field1.type;
    const type2 =
      field2.type === 'text'
        ? this.inferFieldTypeFromLabel(field2.label)
        : field2.type;

    return pairs.some((pair) => pair.includes(type1) && pair.includes(type2));
  }

  /**
   * Infer field type from label
   */
  private static inferFieldTypeFromLabel(label: string): string {
    const lower = label.toLowerCase();

    if (lower.includes('email')) return 'email';
    if (lower.includes('phone') || lower.includes('tel')) return 'phone';
    if (lower.includes('date')) return 'date';
    if (lower.includes('time')) return 'time';
    if (lower.includes('venue') || lower.includes('location')) return 'venue';
    if (lower.includes('name')) return 'name';
    if (lower.includes('address')) return 'address';

    return 'text';
  }

  /**
   * Calculate confidence score for a field match with enhanced accuracy
   */
  private static calculateConfidence(
    fieldType: string,
    value: string,
    match: RegExpMatchArray,
  ): number {
    let confidence = 0.75; // Increased base confidence for better patterns

    // Enhanced confidence boosting based on field type accuracy
    switch (fieldType) {
      case 'email':
        // Strong email validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (emailRegex.test(value)) {
          confidence += 0.2;
        } else if (value.includes('@') && value.includes('.')) {
          confidence += 0.1;
        }
        break;

      case 'phone':
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length === 10) {
          confidence += 0.2;
        } else if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) {
          confidence += 0.18; // US number with country code
        } else if (phoneDigits.length >= 7) {
          confidence += 0.1;
        }
        break;

      case 'date':
        // Check multiple date formats
        const datePatterns = [
          /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/,
          /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,
          /^[A-Za-z]+\s+\d{1,2},?\s+\d{4}$/,
          /^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/,
        ];
        if (datePatterns.some((pattern) => pattern.test(value))) {
          confidence += 0.2;
        }
        // Extra boost for wedding-specific date ranges
        const year = value.match(/\d{4}/);
        if (year) {
          const yearNum = parseInt(year[0]);
          const currentYear = new Date().getFullYear();
          if (yearNum >= currentYear && yearNum <= currentYear + 2) {
            confidence += 0.05; // Likely future wedding date
          }
        }
        break;

      case 'name':
        // Check for proper name formatting
        if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(value)) {
          confidence += 0.15;
        } else if (/^[A-Z]/.test(value)) {
          confidence += 0.1;
        }
        break;

      case 'time':
        // Valid time format
        if (/^\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?$/.test(value)) {
          confidence += 0.2;
        }
        break;

      case 'venue':
        // Common venue indicators
        if (
          /hotel|resort|club|gardens?|estate|vineyard|winery|barn|farm|hall|center|church|chapel/i.test(
            value,
          )
        ) {
          confidence += 0.15;
        }
        break;

      case 'number':
        // Check if it's a valid number
        const numValue = parseFloat(value.replace(/[$,]/g, ''));
        if (!isNaN(numValue)) {
          confidence += 0.1;
          // Wedding-specific number ranges
          if (fieldType === 'number' && numValue >= 10 && numValue <= 500) {
            confidence += 0.05; // Likely guest count
          } else if (numValue >= 1000 && numValue <= 100000) {
            confidence += 0.05; // Likely budget/price
          }
        }
        break;
    }

    // Enhanced context analysis
    if (match.input && match.index !== undefined) {
      const contextRadius = 50; // Increased context window
      const contextStart = Math.max(0, match.index - contextRadius);
      const contextEnd = Math.min(
        match.input.length,
        match.index + value.length + contextRadius,
      );
      const context = match.input
        .substring(contextStart, contextEnd)
        .toLowerCase();

      // Wedding-specific context keywords
      const weddingKeywords = [
        'wedding',
        'bride',
        'groom',
        'ceremony',
        'reception',
        'venue',
        'client',
        'contract',
        'agreement',
        'coordinator',
        'planner',
        'photographer',
        'videographer',
        'florist',
        'caterer',
      ];

      const keywordMatches = weddingKeywords.filter((keyword) =>
        context.includes(keyword),
      );
      if (keywordMatches.length > 0) {
        confidence += 0.05 * Math.min(keywordMatches.length, 3); // Up to 0.15 boost
      }

      // Field label proximity boost
      const labelKeywords = {
        email: ['email', 'e-mail', 'contact', 'address'],
        phone: ['phone', 'tel', 'mobile', 'cell', 'contact', 'number'],
        date: ['date', 'day', 'when', 'scheduled'],
        name: ['name', 'client', 'bride', 'groom', 'coordinator'],
        venue: ['venue', 'location', 'place', 'where', 'at'],
        time: ['time', 'when', 'start', 'begin', 'end'],
        number: ['count', 'total', 'amount', 'price', 'cost', 'guests'],
      };

      const relevantLabels = labelKeywords[fieldType] || [];
      const labelMatches = relevantLabels.filter((label) =>
        context.includes(label),
      );
      if (labelMatches.length > 0) {
        confidence += 0.05 * Math.min(labelMatches.length, 2); // Up to 0.10 boost
      }
    }

    return Math.min(confidence, 0.98); // Cap at 0.98 to allow for manual verification
  }

  /**
   * Map pattern type to form field type
   */
  private static mapToFieldType(patternType: string): DetectedField['type'] {
    const mapping: Record<string, DetectedField['type']> = {
      email: 'email',
      phone: 'tel',
      date: 'date',
      number: 'number',
      name: 'text',
      address: 'text',
      time: 'text', // Using text for time as HTML time input is limited
      venue: 'text',
    };

    return mapping[patternType] || 'text';
  }

  /**
   * Generate appropriate label for a field with enhanced context
   */
  private static generateLabel(
    fieldType: string,
    value: string,
    contextLine: string = '',
  ): string {
    const labelMap: Record<string, string> = {
      email: 'Email Address',
      phone: 'Phone Number',
      date: 'Date',
      number: 'Amount',
      name: 'Name',
      address: 'Address',
      time: 'Time',
      venue: 'Venue',
    };

    const context = (contextLine + ' ' + value).toLowerCase();

    // Enhanced specific label generation based on context
    if (fieldType === 'date') {
      if (/wedding|ceremony/i.test(context)) return 'Wedding Date';
      if (/reception/i.test(context)) return 'Reception Date';
      if (/contract|signed|agreement/i.test(context)) return 'Contract Date';
      if (/booking/i.test(context)) return 'Booking Date';
    }

    if (fieldType === 'name') {
      if (/bride|her/i.test(context)) return 'Bride Name';
      if (/groom|his/i.test(context)) return 'Groom Name';
      if (/coordinator|planner/i.test(context)) return 'Coordinator Name';
      if (/photographer/i.test(context)) return 'Photographer Name';
      if (/venue/i.test(context)) return 'Venue Contact';
    }

    if (fieldType === 'time') {
      if (/ceremony/i.test(context)) return 'Ceremony Time';
      if (/reception/i.test(context)) return 'Reception Time';
      if (/cocktail/i.test(context)) return 'Cocktail Hour';
      if (/dinner/i.test(context)) return 'Dinner Time';
      if (/first[\s]*look/i.test(context)) return 'First Look Time';
      if (/getting[\s]*ready/i.test(context)) return 'Getting Ready Time';
    }

    if (fieldType === 'venue') {
      if (/ceremony/i.test(context)) return 'Ceremony Venue';
      if (/reception/i.test(context)) return 'Reception Venue';
    }

    if (fieldType === 'phone') {
      if (/emergency/i.test(context)) return 'Emergency Contact';
      if (/coordinator/i.test(context)) return 'Coordinator Phone';
      if (/venue/i.test(context)) return 'Venue Phone';
    }

    if (fieldType === 'number') {
      if (/guest|people|attendees/i.test(context)) return 'Guest Count';
      if (/adult/i.test(context)) return 'Adult Guests';
      if (/child|kid/i.test(context)) return 'Child Guests';
      if (/budget/i.test(context)) return 'Budget';
      if (/deposit/i.test(context)) return 'Deposit Amount';
      if (/balance/i.test(context)) return 'Balance Due';
      if (/total|amount|cost|price/i.test(context)) return 'Total Amount';
      if (/hour|coverage/i.test(context)) return 'Hours of Coverage';
    }

    return labelMap[fieldType] || 'Field';
  }

  /**
   * Estimate bounding box based on text position with line context
   */
  private static estimateBoundingBox(
    match: RegExpMatchArray,
    fullText: string,
    lineIndex: number = -1,
  ): BoundingBox {
    // Use actual line index if available, otherwise calculate
    const index = match.index || 0;
    const lineNumber =
      lineIndex >= 0
        ? lineIndex
        : fullText.substring(0, index).split('\n').length;

    // More accurate positioning based on common document layouts
    const estimatedCharWidth = 8;
    const estimatedLineHeight = 22;
    const leftMargin = 50;
    const topMargin = 50;

    // Calculate position within line for x coordinate
    const lineStart = fullText.lastIndexOf('\n', index - 1) + 1;
    const positionInLine = index - lineStart;

    return {
      x: leftMargin + positionInLine * estimatedCharWidth,
      y: topMargin + lineNumber * estimatedLineHeight,
      width: match[0].length * estimatedCharWidth,
      height: estimatedLineHeight,
    };
  }

  /**
   * Remove duplicate fields and merge similar ones
   */
  private static deduplicateFields(fields: DetectedField[]): DetectedField[] {
    const seen = new Set<string>();
    const unique: DetectedField[] = [];

    // Sort by confidence descending
    fields.sort((a, b) => b.confidence - a.confidence);

    for (const field of fields) {
      const key = `${field.type}-${field.value.toLowerCase().trim()}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(field);
      }
    }

    return unique;
  }

  /**
   * Calculate average confidence of all fields
   */
  private static getAverageConfidence(fields: DetectedField[]): number {
    if (fields.length === 0) return 0;

    const totalConfidence = fields.reduce(
      (sum, field) => sum + field.confidence,
      0,
    );
    return Math.round((totalConfidence / fields.length) * 100) / 100;
  }

  /**
   * Map detected fields to wedding core fields
   */
  static mapToCoreFields(fields: DetectedField[]): Record<string, any> {
    const coreFieldMapping: Record<string, any> = {};

    fields.forEach((field) => {
      // Map based on field content and type
      const value = field.value.toLowerCase();

      if (field.type === 'email') {
        coreFieldMapping.email = field.value;
      }

      if (field.type === 'tel') {
        coreFieldMapping.phone = field.value;
      }

      if (field.type === 'date') {
        if (field.label.toLowerCase().includes('wedding')) {
          coreFieldMapping.wedding_date = field.value;
        }
      }

      if (field.type === 'text') {
        if (field.label.toLowerCase().includes('bride')) {
          coreFieldMapping.bride_name = field.value;
        } else if (field.label.toLowerCase().includes('groom')) {
          coreFieldMapping.groom_name = field.value;
        } else if (field.label.toLowerCase().includes('venue')) {
          coreFieldMapping.venue_name = field.value;
        }
      }
    });

    return coreFieldMapping;
  }
}
