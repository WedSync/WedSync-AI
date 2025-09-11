/**
 * Smart Receipt Scanner with AI-Powered Recognition
 * Team D - Round 2 WS-163 Implementation
 *
 * Provides advanced OCR, automatic vendor recognition, and intelligent
 * expense categorization from receipt photos on mobile devices.
 */

import { BudgetItem, BudgetCategory } from './advanced-budget-system';
import { weddingSync } from './background-sync';

// ==================== TYPES AND INTERFACES ====================

export interface ReceiptScanResult {
  id: string;
  imageUrl: string;
  thumbnail: string;
  scanDate: string;
  processingTime: number;
  confidence: number;
  status: ScanStatus;
  extractedData: ExtractedReceiptData;
  recognizedVendor?: VendorRecognition;
  categorySuggestions: CategorySuggestion[];
  validationFlags: ValidationFlag[];
  errors: ScanError[];
}

export interface ExtractedReceiptData {
  merchantName: string;
  merchantAddress?: string;
  date: string;
  time?: string;
  totalAmount: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  currency: string;
  items: ReceiptLineItem[];
  paymentMethod?: string;
  lastFourDigits?: string;
  receiptNumber?: string;
  cashierName?: string;
}

export interface ReceiptLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  category?: string;
  confidence: number;
}

export interface VendorRecognition {
  vendorId: string;
  vendorName: string;
  businessType: string;
  weddingRelevant: boolean;
  confidence: number;
  logo?: string;
  website?: string;
  phone?: string;
  address?: string;
  socialMedia?: SocialMediaLinks;
  previousTransactions?: string[];
}

export interface SocialMediaLinks {
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
  isWeddingRelated: boolean;
}

export interface ValidationFlag {
  type: ValidationType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface ScanError {
  code: string;
  message: string;
  field?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface OCRConfiguration {
  language: string;
  enhanceContrast: boolean;
  deskewImage: boolean;
  removeNoise: boolean;
  confidenceThreshold: number;
  multiRegion: boolean;
  templateMatching: boolean;
}

export interface ReceiptTemplate {
  vendorName: string;
  patterns: FieldPattern[];
  layout: LayoutInfo;
  validationRules: ValidationRule[];
}

export interface FieldPattern {
  fieldName: string;
  regex: string;
  position?: RegionPosition;
  required: boolean;
  dataType: 'text' | 'number' | 'date' | 'currency';
}

export interface RegionPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutInfo {
  orientation: 'portrait' | 'landscape';
  headerRegion: RegionPosition;
  itemsRegion: RegionPosition;
  totalRegion: RegionPosition;
  footerRegion: RegionPosition;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'numeric' | 'date' | 'currency' | 'range' | 'pattern';
  parameters?: any;
  errorMessage: string;
}

export interface VendorDatabase {
  vendors: VendorInfo[];
  lastUpdated: string;
  version: string;
}

export interface VendorInfo {
  id: string;
  name: string;
  aliases: string[];
  businessType: WeddingVendorType;
  logoKeywords: string[];
  receiptPatterns: string[];
  confidence: number;
  isVerified: boolean;
  metadata: VendorMetadata;
}

export interface VendorMetadata {
  averagePrice: number;
  location: string;
  specialties: string[];
  packageDeals: boolean;
  depositRequired: boolean;
  cancellationPolicy: string;
}

export enum ScanStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NEEDS_REVIEW = 'needs_review',
}

export enum ValidationType {
  BLURRY_IMAGE = 'blurry_image',
  INCOMPLETE_DATA = 'incomplete_data',
  SUSPICIOUS_AMOUNT = 'suspicious_amount',
  DATE_MISMATCH = 'date_mismatch',
  DUPLICATE_RECEIPT = 'duplicate_receipt',
  UNKNOWN_VENDOR = 'unknown_vendor',
}

export enum WeddingVendorType {
  VENUE = 'venue',
  CATERING = 'catering',
  PHOTOGRAPHY = 'photography',
  VIDEOGRAPHY = 'videography',
  FLORIST = 'florist',
  MUSIC = 'music',
  TRANSPORTATION = 'transportation',
  ATTIRE = 'attire',
  JEWELRY = 'jewelry',
  BEAUTY = 'beauty',
  DECORATIONS = 'decorations',
  STATIONERY = 'stationery',
  MISCELLANEOUS = 'miscellaneous',
}

// ==================== SMART RECEIPT SCANNER ====================

export class SmartReceiptScanner {
  private static instance: SmartReceiptScanner;
  private ocrEngine: OCREngine;
  private vendorRecognizer: VendorRecognizer;
  private categoryClassifier: CategoryClassifier;
  private imageProcessor: ImageProcessor;
  private duplicateDetector: DuplicateDetector;
  private validationEngine: ValidationEngine;
  private templates: Map<string, ReceiptTemplate> = new Map();

  private constructor() {
    this.ocrEngine = new OCREngine();
    this.vendorRecognizer = new VendorRecognizer();
    this.categoryClassifier = new CategoryClassifier();
    this.imageProcessor = new ImageProcessor();
    this.duplicateDetector = new DuplicateDetector();
    this.validationEngine = new ValidationEngine();
    this.initializeTemplates();
  }

  public static getInstance(): SmartReceiptScanner {
    if (!SmartReceiptScanner.instance) {
      SmartReceiptScanner.instance = new SmartReceiptScanner();
    }
    return SmartReceiptScanner.instance;
  }

  // ==================== MAIN SCANNING INTERFACE ====================

  public async scanReceipt(
    imageFile: File | string,
    options?: Partial<OCRConfiguration>,
  ): Promise<ReceiptScanResult> {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log(`[Receipt] Starting scan: ${scanId}`);

      // Preprocess image
      const processedImage = await this.imageProcessor.preprocessImage(
        imageFile,
        options,
      );

      // Check for duplicates early
      const isDuplicate = await this.duplicateDetector.checkDuplicate(
        processedImage.imageUrl,
      );
      if (isDuplicate) {
        throw new Error('Duplicate receipt detected');
      }

      // Perform OCR
      const ocrResult = await this.ocrEngine.extractText(
        processedImage.imageData,
        options,
      );

      // Extract structured data
      const extractedData = await this.extractReceiptData(ocrResult);

      // Recognize vendor
      const vendorRecognition = await this.vendorRecognizer.recognizeVendor(
        extractedData,
        processedImage.imageData,
      );

      // Generate category suggestions
      const categorySuggestions =
        await this.categoryClassifier.suggestCategories(
          extractedData,
          vendorRecognition,
        );

      // Validate results
      const validationFlags = await this.validationEngine.validateReceipt(
        extractedData,
        processedImage,
      );

      // Calculate confidence score
      const confidence = this.calculateOverallConfidence(
        ocrResult,
        extractedData,
        vendorRecognition,
        categorySuggestions,
      );

      const processingTime = Date.now() - startTime;

      const result: ReceiptScanResult = {
        id: scanId,
        imageUrl: processedImage.imageUrl,
        thumbnail: processedImage.thumbnail,
        scanDate: new Date().toISOString(),
        processingTime,
        confidence,
        status:
          confidence > 0.8 ? ScanStatus.COMPLETED : ScanStatus.NEEDS_REVIEW,
        extractedData,
        recognizedVendor: vendorRecognition,
        categorySuggestions,
        validationFlags,
        errors: [],
      };

      console.log(
        `[Receipt] Scan completed: ${scanId} (${processingTime}ms, confidence: ${confidence.toFixed(2)})`,
      );

      // Auto-create budget item if confidence is high
      if (confidence > 0.9 && categorySuggestions.length > 0) {
        await this.autoCreateBudgetItem(result);
      }

      return result;
    } catch (error) {
      console.error(`[Receipt] Scan failed: ${scanId}`, error);

      return {
        id: scanId,
        imageUrl:
          typeof imageFile === 'string'
            ? imageFile
            : URL.createObjectURL(imageFile),
        thumbnail: '',
        scanDate: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        confidence: 0,
        status: ScanStatus.FAILED,
        extractedData: this.getEmptyExtractedData(),
        categorySuggestions: [],
        validationFlags: [],
        errors: [
          {
            code: 'SCAN_FAILED',
            message: error.message,
            severity: 'high',
          },
        ],
      };
    }
  }

  // ==================== BATCH SCANNING ====================

  public async scanMultipleReceipts(
    imageFiles: File[],
    progressCallback?: (progress: number) => void,
  ): Promise<ReceiptScanResult[]> {
    const results: ReceiptScanResult[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const result = await this.scanReceipt(imageFiles[i]);
        results.push(result);

        if (progressCallback) {
          progressCallback(((i + 1) / imageFiles.length) * 100);
        }
      } catch (error) {
        console.error(`[Receipt] Failed to scan image ${i}:`, error);
        // Continue with other images
      }
    }

    return results;
  }

  // ==================== DATA EXTRACTION ====================

  private async extractReceiptData(
    ocrResult: any,
  ): Promise<ExtractedReceiptData> {
    const text = ocrResult.text;
    const lines = text
      .split('\n')
      .filter((line: string) => line.trim().length > 0);

    // Extract merchant name (usually first few lines)
    const merchantName = this.extractMerchantName(lines);

    // Extract date
    const date = this.extractDate(text);

    // Extract total amount
    const totalAmount = this.extractTotalAmount(text);

    // Extract line items
    const items = this.extractLineItems(lines);

    // Extract additional details
    const currency = this.extractCurrency(text) || 'USD';
    const paymentMethod = this.extractPaymentMethod(text);
    const receiptNumber = this.extractReceiptNumber(text);

    return {
      merchantName,
      date,
      totalAmount,
      currency,
      items,
      paymentMethod,
      receiptNumber,
    };
  }

  private extractMerchantName(lines: string[]): string {
    // Look for merchant name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();

      // Skip common receipt headers
      if (line.match(/receipt|copy|customer|thank you/i)) continue;

      // Skip addresses (containing numbers and common address words)
      if (
        line.match(
          /\d+.*\b(street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|way|court|ct)\b/i,
        )
      )
        continue;

      // Skip phone numbers
      if (line.match(/\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{10}/))
        continue;

      // If line has reasonable length and appears to be a business name
      if (line.length > 3 && line.length < 50 && !line.match(/^\d+$/)) {
        return line;
      }
    }

    return lines[0]?.trim() || 'Unknown Merchant';
  }

  private extractDate(text: string): string {
    const datePatterns = [
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
      /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}\b/i,
      /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\b/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1] || match[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
    }

    return new Date().toISOString().split('T')[0]; // Default to today
  }

  private extractTotalAmount(text: string): number {
    const amountPatterns = [
      /total[:\s]*\$?(\d+\.?\d*)/i,
      /amount[:\s]*\$?(\d+\.?\d*)/i,
      /\$(\d+\.\d{2})/g,
      /(\d+\.\d{2})/g,
    ];

    for (const pattern of amountPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Get the last match as it's usually the total
        const lastMatch = matches[matches.length - 1];
        const amount = parseFloat(lastMatch.replace(/[^\d.]/g, ''));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    return 0;
  }

  private extractLineItems(lines: string[]): ReceiptLineItem[] {
    const items: ReceiptLineItem[] = [];

    for (const line of lines) {
      // Look for lines that have both description and price
      const priceMatch = line.match(/\$?(\d+\.?\d*)\s*$/);
      if (priceMatch && line.trim().length > priceMatch[0].length + 2) {
        const price = parseFloat(priceMatch[1]);
        const description = line.replace(priceMatch[0], '').trim();

        if (price > 0 && description.length > 0) {
          items.push({
            description,
            totalPrice: price,
            confidence: 0.8,
          });
        }
      }
    }

    return items;
  }

  private extractCurrency(text: string): string | undefined {
    // Look for currency symbols or codes
    if (text.includes('$')) return 'USD';
    if (text.includes('€')) return 'EUR';
    if (text.includes('£')) return 'GBP';
    if (text.includes('¥')) return 'JPY';
    if (text.includes('CAD')) return 'CAD';
    if (text.includes('AUD')) return 'AUD';

    return undefined;
  }

  private extractPaymentMethod(text: string): string | undefined {
    const methods = ['credit', 'debit', 'cash', 'check', 'card'];
    const lowerText = text.toLowerCase();

    for (const method of methods) {
      if (lowerText.includes(method)) {
        return method;
      }
    }

    return undefined;
  }

  private extractReceiptNumber(text: string): string | undefined {
    const patterns = [
      /receipt\s*#?\s*(\w+)/i,
      /ref\s*#?\s*(\w+)/i,
      /transaction\s*#?\s*(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  // ==================== AUTO BUDGET ITEM CREATION ====================

  private async autoCreateBudgetItem(
    scanResult: ReceiptScanResult,
  ): Promise<void> {
    try {
      const data = scanResult.extractedData;
      const vendor = scanResult.recognizedVendor;
      const category = scanResult.categorySuggestions[0];

      const budgetItem: Partial<BudgetItem> = {
        name: vendor?.vendorName || data.merchantName,
        description: `Auto-imported receipt: ${data.merchantName}`,
        actual_cost: data.totalAmount,
        status: 'completed' as any,
        payment_status: 'fully_paid' as any,
        receipts: [
          {
            id: scanResult.id,
            image_url: scanResult.imageUrl,
            total_amount: data.totalAmount,
            vendor_name: data.merchantName,
            date: data.date,
            currency: data.currency,
            items: data.items,
            ocr_data: {
              raw_text: '',
              extracted_data: data,
              confidence_score: scanResult.confidence,
              manual_corrections: [],
            },
            verification_status:
              scanResult.confidence > 0.9 ? 'verified' : 'pending',
          },
        ],
        notes: `Automatically scanned on ${scanResult.scanDate}`,
      };

      // Sync with budget system
      weddingSync.syncExpenseCreate(
        'current_wedding_id', // This would be dynamic in real app
        'current_user_id', // This would be dynamic in real app
        {
          ...budgetItem,
          category_id: category?.categoryId || 'miscellaneous',
          receipt_scan_id: scanResult.id,
        },
      );

      console.log(
        `[Receipt] Auto-created budget item for scan: ${scanResult.id}`,
      );
    } catch (error) {
      console.error('[Receipt] Failed to auto-create budget item:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateOverallConfidence(
    ocrResult: any,
    extractedData: ExtractedReceiptData,
    vendorRecognition?: VendorRecognition,
    categorySuggestions?: CategorySuggestion[],
  ): number {
    let confidence = 0.5; // Base confidence

    // OCR quality
    confidence += Math.min(0.3, (ocrResult.confidence || 0) * 0.3);

    // Data extraction quality
    if (
      extractedData.merchantName &&
      extractedData.merchantName !== 'Unknown Merchant'
    )
      confidence += 0.1;
    if (extractedData.totalAmount > 0) confidence += 0.1;
    if (extractedData.date) confidence += 0.05;
    if (extractedData.items.length > 0) confidence += 0.05;

    // Vendor recognition
    if (vendorRecognition && vendorRecognition.confidence > 0.8) {
      confidence += 0.15;
    }

    // Category suggestions
    if (categorySuggestions && categorySuggestions.length > 0) {
      const bestCategory = categorySuggestions[0];
      confidence += bestCategory.confidence * 0.1;
    }

    return Math.min(1.0, confidence);
  }

  private getEmptyExtractedData(): ExtractedReceiptData {
    return {
      merchantName: '',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      currency: 'USD',
      items: [],
    };
  }

  private initializeTemplates(): void {
    // Initialize common receipt templates
    const commonTemplates: ReceiptTemplate[] = [
      {
        vendorName: 'Generic Restaurant',
        patterns: [
          {
            fieldName: 'total',
            regex: /total[:\s]*\$?(\d+\.?\d*)/i,
            required: true,
            dataType: 'currency',
          },
          {
            fieldName: 'date',
            regex: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
            required: true,
            dataType: 'date',
          },
        ],
        layout: {
          orientation: 'portrait',
          headerRegion: { x: 0, y: 0, width: 100, height: 20 },
          itemsRegion: { x: 0, y: 20, width: 100, height: 60 },
          totalRegion: { x: 0, y: 80, width: 100, height: 10 },
          footerRegion: { x: 0, y: 90, width: 100, height: 10 },
        },
        validationRules: [
          {
            field: 'total',
            rule: 'numeric',
            errorMessage: 'Total must be a valid number',
          },
        ],
      },
    ];

    commonTemplates.forEach((template) => {
      this.templates.set(template.vendorName, template);
    });
  }

  // ==================== PUBLIC API ====================

  public async reprocessReceipt(
    scanId: string,
    corrections: any,
  ): Promise<ReceiptScanResult> {
    // Reprocess receipt with manual corrections
    console.log(`[Receipt] Reprocessing scan: ${scanId} with corrections`);
    // Implementation would reload and reprocess with corrections
    throw new Error('Not implemented');
  }

  public async searchSimilarReceipts(
    scanResult: ReceiptScanResult,
  ): Promise<ReceiptScanResult[]> {
    // Find similar receipts based on vendor, amount, date
    return await this.duplicateDetector.findSimilar(scanResult);
  }

  public getScanHistory(days: number = 30): Promise<ReceiptScanResult[]> {
    // Return recent scan history
    return Promise.resolve([]);
  }

  public getVendorStatistics(): Promise<{
    [vendorName: string]: { count: number; totalAmount: number };
  }> {
    // Return vendor spending statistics
    return Promise.resolve({});
  }

  public destroy(): void {
    this.templates.clear();
  }
}

// ==================== OCR ENGINE ====================

class OCREngine {
  async extractText(
    imageData: string,
    options?: Partial<OCRConfiguration>,
  ): Promise<any> {
    // Mock OCR result - in reality, this would use Tesseract.js or Google Vision API
    const mockResult = {
      text: `
        FLOWERS BY SARAH
        123 Wedding Lane
        Bridal City, BC 12345
        
        Date: 03/15/2024
        Receipt #: 12345
        
        Bridal Bouquet        $150.00
        Bridesmaids (5)       $275.00
        Centerpieces (8)      $320.00
        Petals               $45.00
        
        Subtotal:            $790.00
        Tax:                 $63.20
        Total:               $853.20
        
        Payment: Credit Card
        Thank you for your business!
      `,
      confidence: 0.92,
      words: [],
      lines: [],
      blocks: [],
    };

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return mockResult;
  }
}

// ==================== VENDOR RECOGNIZER ====================

class VendorRecognizer {
  private vendorDatabase: VendorInfo[] = [];

  constructor() {
    this.initializeVendorDatabase();
  }

  async recognizeVendor(
    extractedData: ExtractedReceiptData,
    imageData: string,
  ): Promise<VendorRecognition | undefined> {
    const merchantName = extractedData.merchantName.toLowerCase();

    // Search vendor database
    for (const vendor of this.vendorDatabase) {
      // Check exact name match
      if (vendor.name.toLowerCase() === merchantName) {
        return this.createVendorRecognition(vendor, 0.95);
      }

      // Check aliases
      for (const alias of vendor.aliases) {
        if (
          alias.toLowerCase() === merchantName ||
          merchantName.includes(alias.toLowerCase())
        ) {
          return this.createVendorRecognition(vendor, 0.85);
        }
      }

      // Check receipt patterns
      for (const pattern of vendor.receiptPatterns) {
        if (merchantName.includes(pattern.toLowerCase())) {
          return this.createVendorRecognition(vendor, 0.75);
        }
      }
    }

    // No match found - try to infer vendor type from business name
    return this.inferVendorType(extractedData);
  }

  private createVendorRecognition(
    vendor: VendorInfo,
    confidence: number,
  ): VendorRecognition {
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      businessType: vendor.businessType,
      weddingRelevant: true,
      confidence,
      previousTransactions: [],
    };
  }

  private inferVendorType(
    extractedData: ExtractedReceiptData,
  ): VendorRecognition | undefined {
    const name = extractedData.merchantName.toLowerCase();

    const typeKeywords = {
      [WeddingVendorType.FLORIST]: ['flower', 'floral', 'bouquet', 'bloom'],
      [WeddingVendorType.CATERING]: [
        'catering',
        'restaurant',
        'cafe',
        'kitchen',
      ],
      [WeddingVendorType.PHOTOGRAPHY]: [
        'photo',
        'photography',
        'studio',
        'portrait',
      ],
      [WeddingVendorType.VENUE]: [
        'venue',
        'hall',
        'ballroom',
        'center',
        'manor',
      ],
      [WeddingVendorType.ATTIRE]: [
        'bridal',
        'dress',
        'tuxedo',
        'formal',
        'boutique',
      ],
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      for (const keyword of keywords) {
        if (name.includes(keyword)) {
          return {
            vendorId: `inferred_${Date.now()}`,
            vendorName: extractedData.merchantName,
            businessType: type as WeddingVendorType,
            weddingRelevant: true,
            confidence: 0.6,
          };
        }
      }
    }

    return undefined;
  }

  private initializeVendorDatabase(): void {
    this.vendorDatabase = [
      {
        id: 'flowers_by_sarah',
        name: 'Flowers by Sarah',
        aliases: ['Sarah Flowers', 'Flowers Sarah'],
        businessType: WeddingVendorType.FLORIST,
        logoKeywords: ['sarah', 'flowers'],
        receiptPatterns: ['flowers by sarah', 'sarah floral'],
        confidence: 0.95,
        isVerified: true,
        metadata: {
          averagePrice: 500,
          location: 'Downtown',
          specialties: ['bridal bouquets', 'centerpieces'],
          packageDeals: true,
          depositRequired: true,
          cancellationPolicy: '48 hours notice',
        },
      },
      {
        id: 'grand_ballroom',
        name: 'Grand Ballroom',
        aliases: ['Grand Ballroom Events', 'The Grand Ballroom'],
        businessType: WeddingVendorType.VENUE,
        logoKeywords: ['grand', 'ballroom'],
        receiptPatterns: ['grand ballroom', 'ballroom venue'],
        confidence: 0.95,
        isVerified: true,
        metadata: {
          averagePrice: 5000,
          location: 'Uptown',
          specialties: ['wedding receptions', 'corporate events'],
          packageDeals: true,
          depositRequired: true,
          cancellationPolicy: '30 days notice',
        },
      },
    ];
  }
}

// ==================== CATEGORY CLASSIFIER ====================

class CategoryClassifier {
  async suggestCategories(
    extractedData: ExtractedReceiptData,
    vendorRecognition?: VendorRecognition,
  ): Promise<CategorySuggestion[]> {
    const suggestions: CategorySuggestion[] = [];

    // Use vendor type if available
    if (vendorRecognition) {
      const categoryMap = {
        [WeddingVendorType.VENUE]: 'venue',
        [WeddingVendorType.CATERING]: 'catering',
        [WeddingVendorType.PHOTOGRAPHY]: 'photography',
        [WeddingVendorType.FLORIST]: 'flowers',
        [WeddingVendorType.MUSIC]: 'music',
        [WeddingVendorType.ATTIRE]: 'attire',
      };

      const categoryId =
        categoryMap[vendorRecognition.businessType as WeddingVendorType];
      if (categoryId) {
        suggestions.push({
          categoryId,
          categoryName: this.getCategoryDisplayName(categoryId),
          confidence: vendorRecognition.confidence,
          reasoning: `Vendor recognized as ${vendorRecognition.businessType}`,
          keywords: [vendorRecognition.businessType],
          isWeddingRelated: true,
        });
      }
    }

    // Keyword-based classification
    const merchantName = extractedData.merchantName.toLowerCase();
    const keywordMappings = {
      flowers: {
        category: 'flowers',
        keywords: ['flower', 'floral', 'bouquet', 'bloom', 'petals'],
      },
      venue: {
        category: 'venue',
        keywords: ['venue', 'hall', 'ballroom', 'center', 'manor', 'reception'],
      },
      catering: {
        category: 'catering',
        keywords: ['catering', 'restaurant', 'cafe', 'kitchen', 'food'],
      },
      photography: {
        category: 'photography',
        keywords: ['photo', 'photography', 'studio', 'portrait', 'camera'],
      },
      attire: {
        category: 'attire',
        keywords: [
          'bridal',
          'dress',
          'tuxedo',
          'formal',
          'boutique',
          'alterations',
        ],
      },
    };

    for (const [categoryId, mapping] of Object.entries(keywordMappings)) {
      let matchCount = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of mapping.keywords) {
        if (merchantName.includes(keyword)) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(
          0.9,
          matchCount / mapping.keywords.length + 0.3,
        );
        suggestions.push({
          categoryId,
          categoryName: this.getCategoryDisplayName(categoryId),
          confidence,
          reasoning: `Keyword match: ${matchedKeywords.join(', ')}`,
          keywords: matchedKeywords,
          isWeddingRelated: true,
        });
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private getCategoryDisplayName(categoryId: string): string {
    const displayNames: { [key: string]: string } = {
      venue: 'Venue',
      catering: 'Catering',
      photography: 'Photography',
      flowers: 'Flowers & Decorations',
      music: 'Music & Entertainment',
      attire: 'Attire & Accessories',
      transportation: 'Transportation',
      miscellaneous: 'Miscellaneous',
    };

    return displayNames[categoryId] || categoryId;
  }
}

// ==================== SUPPORTING CLASSES ====================

class ImageProcessor {
  async preprocessImage(
    imageFile: File | string,
    options?: Partial<OCRConfiguration>,
  ): Promise<{ imageUrl: string; imageData: string; thumbnail: string }> {
    // Mock image processing
    const imageUrl =
      typeof imageFile === 'string'
        ? imageFile
        : URL.createObjectURL(imageFile);

    return {
      imageUrl,
      imageData: imageUrl, // In reality, this would be processed image data
      thumbnail: imageUrl, // In reality, this would be a smaller thumbnail
    };
  }
}

class DuplicateDetector {
  async checkDuplicate(imageUrl: string): Promise<boolean> {
    // Mock duplicate detection - in reality, this would use image hashing
    return false;
  }

  async findSimilar(
    scanResult: ReceiptScanResult,
  ): Promise<ReceiptScanResult[]> {
    // Mock similar receipt search
    return [];
  }
}

class ValidationEngine {
  async validateReceipt(
    extractedData: ExtractedReceiptData,
    processedImage: any,
  ): Promise<ValidationFlag[]> {
    const flags: ValidationFlag[] = [];

    // Check for common issues
    if (extractedData.totalAmount <= 0) {
      flags.push({
        type: ValidationType.INCOMPLETE_DATA,
        severity: 'error',
        message: 'Total amount not found or invalid',
        suggestion: 'Please verify the total amount manually',
        autoFixable: false,
      });
    }

    if (
      !extractedData.merchantName ||
      extractedData.merchantName === 'Unknown Merchant'
    ) {
      flags.push({
        type: ValidationType.UNKNOWN_VENDOR,
        severity: 'warning',
        message: 'Vendor name could not be determined',
        suggestion: 'Please enter the vendor name manually',
        autoFixable: false,
      });
    }

    if (extractedData.totalAmount > 10000) {
      flags.push({
        type: ValidationType.SUSPICIOUS_AMOUNT,
        severity: 'warning',
        message: 'Large amount detected - please verify',
        suggestion: 'Confirm this amount is correct',
        autoFixable: false,
      });
    }

    return flags;
  }
}

// ==================== SINGLETON EXPORT ====================

export const receiptScanner = SmartReceiptScanner.getInstance();
export default SmartReceiptScanner;
