/**
 * WS-164: AI-Enhanced Manual Tracking Integration
 * Advanced OCR with natural language processing for receipts and expense tracking
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { aiExpenseCategorizer } from '../budget/expense-categorization';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = Redis.fromEnv();

// Schema definitions
const ReceiptDataSchema = z.object({
  vendor_name: z.string(),
  vendor_address: z.string().optional(),
  vendor_phone: z.string().optional(),
  transaction_date: z.string(),
  transaction_time: z.string().optional(),
  total_amount: z.number(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  tip_amount: z.number().optional(),
  payment_method: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().optional(),
        unit_price: z.number().optional(),
        total_price: z.number(),
      }),
    )
    .optional(),
  receipt_number: z.string().optional(),
  confidence_score: z.number().min(0).max(1),
});

const DuplicateDetectionSchema = z.object({
  is_duplicate: z.boolean(),
  confidence: z.number().min(0).max(1),
  matching_expenses: z.array(
    z.object({
      expense_id: z.string(),
      similarity_score: z.number(),
      matching_factors: z.array(z.string()),
    }),
  ),
  recommendation: z.enum(['merge', 'keep_separate', 'flag_for_review']),
});

const FraudDetectionSchema = z.object({
  fraud_risk: z.enum(['low', 'medium', 'high']),
  risk_score: z.number().min(0).max(1),
  risk_factors: z.array(z.string()),
  recommendations: z.array(z.string()),
  requires_verification: z.boolean(),
});

const PaymentPredictionSchema = z.object({
  predicted_due_date: z.string(),
  confidence: z.number(),
  payment_terms: z.string().optional(),
  late_fee_risk: z.number(),
  early_payment_discount: z.number().optional(),
  recommended_payment_date: z.string(),
});

export type ReceiptData = z.infer<typeof ReceiptDataSchema>;
export type DuplicateDetection = z.infer<typeof DuplicateDetectionSchema>;
export type FraudDetection = z.infer<typeof FraudDetectionSchema>;
export type PaymentPrediction = z.infer<typeof PaymentPredictionSchema>;

/**
 * Advanced OCR and Manual Tracking System
 */
export class AdvancedOCRTracker {
  private cachePrefix = 'ocr:tracking:';
  private modelVersion = 'gpt-4-vision-preview';
  private duplicateDetector: DuplicateDetector;
  private fraudDetector: FraudDetector;
  private paymentPredictor: PaymentPredictor;

  constructor() {
    this.duplicateDetector = new DuplicateDetector();
    this.fraudDetector = new FraudDetector();
    this.paymentPredictor = new PaymentPredictor();
  }

  /**
   * Process receipt image with advanced OCR and NLP
   */
  async processReceiptImage(
    imageBase64: string,
    weddingId: string,
    userId: string,
  ): Promise<{
    receipt_data: ReceiptData;
    duplicate_check: DuplicateDetection;
    fraud_analysis: FraudDetection;
    category_suggestion: any;
    payment_prediction: PaymentPrediction;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Advanced OCR with context understanding
      const receiptData = await this.performAdvancedOCR(imageBase64);

      // Step 2: Enhance with NLP processing
      const enhancedData = await this.enhanceWithNLP(receiptData);

      // Step 3: Check for duplicates
      const duplicateCheck = await this.duplicateDetector.checkForDuplicates(
        enhancedData,
        weddingId,
      );

      // Step 4: Fraud detection analysis
      const fraudAnalysis = await this.fraudDetector.analyzeExpense(
        enhancedData,
        weddingId,
        userId,
      );

      // Step 5: Category suggestion using existing AI categorizer
      const categorySuggestion = await aiExpenseCategorizer.categorizeExpense({
        vendor_name: enhancedData.vendor_name,
        description:
          enhancedData.items?.map((i) => i.description).join(', ') ||
          'Receipt items',
        amount: enhancedData.total_amount,
        date: enhancedData.transaction_date,
        receipt_text: this.extractReceiptText(enhancedData),
        wedding_id: weddingId,
      });

      // Step 6: Payment due date prediction
      const paymentPrediction =
        await this.paymentPredictor.predictPaymentDueDate(
          enhancedData,
          categorySuggestion.category,
        );

      // Record metrics
      await this.recordMetrics('receipt_processing', Date.now() - startTime, {
        confidence: enhancedData.confidence_score,
        duplicate_detected: duplicateCheck.is_duplicate,
        fraud_risk: fraudAnalysis.fraud_risk,
        category: categorySuggestion.category,
      });

      return {
        receipt_data: enhancedData,
        duplicate_check: duplicateCheck,
        fraud_analysis: fraudAnalysis,
        category_suggestion: categorySuggestion,
        payment_prediction: paymentPrediction,
      };
    } catch (error) {
      console.error('Receipt processing error:', error);
      throw new Error(`Receipt processing failed: ${error.message}`);
    }
  }

  /**
   * Advanced OCR with GPT-4 Vision
   */
  private async performAdvancedOCR(imageBase64: string): Promise<ReceiptData> {
    const prompt = `
      Analyze this receipt image with high precision and extract all relevant information.
      
      EXTRACTION REQUIREMENTS:
      1. Vendor Information:
         - Business name (exact spelling)
         - Full address if visible
         - Phone number if present
      
      2. Transaction Details:
         - Date (convert to YYYY-MM-DD format)
         - Time (24-hour format if present)
         - Receipt/transaction number
      
      3. Financial Information:
         - Total amount (final amount paid)
         - Subtotal (before tax/tip)
         - Tax amount (separately if shown)
         - Tip amount (if added)
         - Payment method (cash, card, etc.)
      
      4. Line Items (if clearly itemized):
         - Item descriptions
         - Quantities
         - Unit prices
         - Total prices per item
      
      5. Quality Assessment:
         - Confidence score (0.0-1.0) based on image clarity and text legibility
      
      ANALYSIS CONTEXT:
      This is a wedding-related expense receipt. Look for wedding-specific terms,
      services, or vendor types (catering, photography, flowers, etc.).
      
      Pay special attention to:
      - Service dates vs. receipt dates
      - Deposit vs. final payment indicators
      - Wedding package details
      - Vendor contact information for wedding planning
      
      Return JSON with all extracted data following the schema:
      {
        "vendor_name": "string",
        "vendor_address": "string or null",
        "vendor_phone": "string or null",
        "transaction_date": "YYYY-MM-DD",
        "transaction_time": "HH:MM or null",
        "total_amount": number,
        "subtotal": number or null,
        "tax_amount": number or null,
        "tip_amount": number or null,
        "payment_method": "string or null",
        "items": [{"description": "string", "quantity": number, "unit_price": number, "total_price": number}] or null,
        "receipt_number": "string or null",
        "confidence_score": number
      }
    `;

    const response = await openai.chat.completions.create({
      model: this.modelVersion,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return ReceiptDataSchema.parse(result);
  }

  /**
   * Enhance OCR data with NLP processing
   */
  private async enhanceWithNLP(receiptData: ReceiptData): Promise<ReceiptData> {
    try {
      // Use NLP to improve vendor name standardization
      const standardizedVendor = await this.standardizeVendorName(
        receiptData.vendor_name,
      );

      // Enhance item descriptions with context understanding
      const enhancedItems = await this.enhanceItemDescriptions(
        receiptData.items || [],
      );

      // Validate and correct amounts using cross-validation
      const validatedAmounts = await this.validateAmounts(receiptData);

      return {
        ...receiptData,
        vendor_name: standardizedVendor,
        items: enhancedItems,
        ...validatedAmounts,
      };
    } catch (error) {
      console.error('NLP enhancement error:', error);
      return receiptData; // Return original if enhancement fails
    }
  }

  /**
   * Standardize vendor names for consistency
   */
  private async standardizeVendorName(vendorName: string): Promise<string> {
    // Check cache for known vendor standardizations
    const cacheKey = `vendor:standardization:${vendorName.toLowerCase().replace(/\s+/g, '')}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached as string;

    // Use AI to standardize vendor name
    const prompt = `
      Standardize this vendor name for a wedding expense tracking system:
      Original: "${vendorName}"
      
      Requirements:
      1. Fix common OCR errors (l->I, 0->O, etc.)
      2. Standardize formatting (proper capitalization)
      3. Remove extra characters or artifacts
      4. Maintain original business name authenticity
      5. Consider common wedding vendor naming patterns
      
      Return only the standardized name, nothing else.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    });

    const standardized =
      response.choices[0].message.content?.trim() || vendorName;

    // Cache the result
    await redis.set(cacheKey, standardized, { ex: 86400 }); // 24 hours

    return standardized;
  }

  /**
   * Enhance item descriptions with context
   */
  private async enhanceItemDescriptions(items: any[]): Promise<any[]> {
    if (!items || items.length === 0) return [];

    return Promise.all(
      items.map(async (item) => {
        try {
          const enhancedDescription = await this.enhanceItemDescription(
            item.description,
          );
          return {
            ...item,
            description: enhancedDescription,
            enhanced: true,
          };
        } catch (error) {
          return item; // Return original if enhancement fails
        }
      }),
    );
  }

  /**
   * Enhance individual item description
   */
  private async enhanceItemDescription(description: string): Promise<string> {
    const prompt = `
      Enhance this receipt item description for wedding expense tracking:
      Original: "${description}"
      
      Improvements needed:
      1. Fix OCR errors and abbreviations
      2. Expand cryptic codes or abbreviations
      3. Add clarity for wedding context
      4. Standardize formatting
      5. Keep it concise but clear
      
      Return only the enhanced description.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 150,
    });

    return response.choices[0].message.content?.trim() || description;
  }

  /**
   * Validate and correct financial amounts
   */
  private async validateAmounts(
    receiptData: ReceiptData,
  ): Promise<Partial<ReceiptData>> {
    const corrections: Partial<ReceiptData> = {};

    // Validate total = subtotal + tax + tip
    if (receiptData.subtotal && receiptData.tax_amount) {
      const calculatedTotal =
        receiptData.subtotal +
        receiptData.tax_amount +
        (receiptData.tip_amount || 0);
      const tolerance = 0.02; // 2 cent tolerance for rounding

      if (Math.abs(calculatedTotal - receiptData.total_amount) > tolerance) {
        // Use AI to determine which amount is likely correct
        corrections.total_amount = receiptData.total_amount; // Keep original for now
        corrections.confidence_score =
          (receiptData.confidence_score || 1) * 0.8; // Reduce confidence
      }
    }

    // Validate item totals sum to subtotal
    if (
      receiptData.items &&
      receiptData.items.length > 0 &&
      receiptData.subtotal
    ) {
      const itemsTotal = receiptData.items.reduce(
        (sum, item) => sum + item.total_price,
        0,
      );
      const tolerance = 0.05; // 5 cent tolerance

      if (Math.abs(itemsTotal - receiptData.subtotal) > tolerance) {
        corrections.confidence_score =
          (receiptData.confidence_score || 1) * 0.9;
      }
    }

    return corrections;
  }

  /**
   * Extract text content from receipt data for categorization
   */
  private extractReceiptText(receiptData: ReceiptData): string {
    const parts = [
      receiptData.vendor_name,
      receiptData.vendor_address || '',
      receiptData.items?.map((i) => i.description).join(' ') || '',
    ];

    return parts.filter((p) => p).join(' ');
  }

  /**
   * Bank feed reconciliation with intelligent matching
   */
  async reconcileBankTransaction(
    bankTransaction: {
      amount: number;
      date: string;
      description: string;
      merchant: string;
    },
    weddingId: string,
  ): Promise<{
    matched_expenses: Array<{
      expense_id: string;
      confidence: number;
      match_factors: string[];
    }>;
    suggested_action: 'auto_match' | 'manual_review' | 'create_new';
  }> {
    try {
      // Find potential matches
      const potentialMatches = await this.findMatchingExpenses(
        bankTransaction,
        weddingId,
      );

      // Analyze matches with AI
      const matchAnalysis = await this.analyzeBankMatches(
        bankTransaction,
        potentialMatches,
      );

      return matchAnalysis;
    } catch (error) {
      console.error('Bank reconciliation error:', error);
      return {
        matched_expenses: [],
        suggested_action: 'manual_review',
      };
    }
  }

  // Private helper methods
  private async recordMetrics(
    operation: string,
    duration: number,
    metadata: any,
  ) {
    try {
      await supabase.from('ai_tracking_metrics').insert({
        operation,
        duration_ms: duration,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Metrics recording error:', error);
    }
  }
}

/**
 * Duplicate Detection System
 */
class DuplicateDetector {
  async checkForDuplicates(
    receiptData: ReceiptData,
    weddingId: string,
  ): Promise<DuplicateDetection> {
    try {
      // Get similar expenses from database
      const similarExpenses = await this.findSimilarExpenses(
        receiptData,
        weddingId,
      );

      if (similarExpenses.length === 0) {
        return {
          is_duplicate: false,
          confidence: 1.0,
          matching_expenses: [],
          recommendation: 'keep_separate',
        };
      }

      // Analyze similarities with AI
      const analysis = await this.analyzeSimilarities(
        receiptData,
        similarExpenses,
      );

      return DuplicateDetectionSchema.parse(analysis);
    } catch (error) {
      console.error('Duplicate detection error:', error);
      return {
        is_duplicate: false,
        confidence: 0.5,
        matching_expenses: [],
        recommendation: 'flag_for_review',
      };
    }
  }

  private async findSimilarExpenses(
    receiptData: ReceiptData,
    weddingId: string,
  ) {
    // Find expenses with similar amount, vendor, or date
    const { data, error } = await supabase
      .from('wedding_expenses')
      .select('*')
      .eq('wedding_id', weddingId)
      .gte('amount', receiptData.total_amount * 0.95)
      .lte('amount', receiptData.total_amount * 1.05)
      .gte(
        'date',
        new Date(
          Date.parse(receiptData.transaction_date) - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      )
      .lte(
        'date',
        new Date(
          Date.parse(receiptData.transaction_date) + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      );

    if (error) throw error;
    return data || [];
  }

  private async analyzeSimilarities(
    receiptData: ReceiptData,
    similarExpenses: any[],
  ) {
    // Use AI to analyze similarities and determine if duplicate
    const prompt = `
      Analyze these expenses to determine if any are duplicates of the new receipt:
      
      NEW RECEIPT:
      Vendor: ${receiptData.vendor_name}
      Amount: $${receiptData.total_amount}
      Date: ${receiptData.transaction_date}
      
      SIMILAR EXPENSES:
      ${similarExpenses
        .map(
          (exp, i) => `
        ${i + 1}. ID: ${exp.id}
        Vendor: ${exp.vendor_name}
        Amount: $${exp.amount}
        Date: ${exp.date}
        Description: ${exp.description}
      `,
        )
        .join('\n')}
      
      Determine:
      1. Is the new receipt a duplicate of any existing expense?
      2. Confidence level (0.0-1.0)
      3. Which expenses match and why
      4. Recommendation: merge, keep_separate, or flag_for_review
      
      Return JSON format.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}

/**
 * Fraud Detection System
 */
class FraudDetector {
  async analyzeExpense(
    receiptData: ReceiptData,
    weddingId: string,
    userId: string,
  ): Promise<FraudDetection> {
    try {
      // Get user spending patterns
      const spendingPatterns = await this.getSpendingPatterns(
        weddingId,
        userId,
      );

      // Analyze various fraud risk factors
      const riskFactors = await this.analyzeRiskFactors(
        receiptData,
        spendingPatterns,
      );

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(riskFactors);

      // Determine risk level and recommendations
      const analysis = this.generateFraudAnalysis(riskScore, riskFactors);

      return FraudDetectionSchema.parse(analysis);
    } catch (error) {
      console.error('Fraud detection error:', error);
      return {
        fraud_risk: 'medium',
        risk_score: 0.5,
        risk_factors: ['analysis_error'],
        recommendations: ['Manual review recommended due to analysis error'],
        requires_verification: true,
      };
    }
  }

  private async analyzeRiskFactors(receiptData: ReceiptData, patterns: any) {
    const factors = [];

    // Unusual amount for vendor type
    if (receiptData.total_amount > patterns.average_expense * 3) {
      factors.push('unusually_high_amount');
    }

    // Weekend/off-hours transaction
    const transactionDate = new Date(receiptData.transaction_date);
    if (transactionDate.getDay() === 0 || transactionDate.getDay() === 6) {
      factors.push('weekend_transaction');
    }

    // Poor image quality (low confidence)
    if (receiptData.confidence_score < 0.7) {
      factors.push('poor_image_quality');
    }

    // Round numbers (potentially fabricated)
    if (receiptData.total_amount % 10 === 0 && receiptData.total_amount > 100) {
      factors.push('round_amount_suspicious');
    }

    return factors;
  }

  private calculateRiskScore(riskFactors: string[]): number {
    const riskWeights = {
      unusually_high_amount: 0.3,
      weekend_transaction: 0.1,
      poor_image_quality: 0.2,
      round_amount_suspicious: 0.15,
      duplicate_suspected: 0.25,
    };

    return riskFactors.reduce((score, factor) => {
      return score + (riskWeights[factor as keyof typeof riskWeights] || 0.1);
    }, 0);
  }
}

/**
 * Payment Due Date Predictor
 */
class PaymentPredictor {
  async predictPaymentDueDate(
    receiptData: ReceiptData,
    category: string,
  ): Promise<PaymentPrediction> {
    try {
      // Analyze receipt for payment terms
      const paymentTerms = await this.extractPaymentTerms(receiptData);

      // Get industry standards for payment timing
      const industryStandards =
        await this.getIndustryPaymentStandards(category);

      // Calculate predicted due date
      const prediction = await this.calculateDueDate(
        receiptData,
        paymentTerms,
        industryStandards,
      );

      return PaymentPredictionSchema.parse(prediction);
    } catch (error) {
      console.error('Payment prediction error:', error);
      // Return safe default
      return {
        predicted_due_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        confidence: 0.3,
        late_fee_risk: 0.2,
        recommended_payment_date: new Date(
          Date.now() + 25 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    }
  }

  private async extractPaymentTerms(receiptData: ReceiptData) {
    // Use AI to extract payment terms from receipt text
    const prompt = `
      Analyze this receipt data to extract payment terms:
      
      Vendor: ${receiptData.vendor_name}
      Transaction Date: ${receiptData.transaction_date}
      Items: ${receiptData.items?.map((i) => i.description).join(', ')}
      
      Look for:
      - Payment due dates
      - Terms like "Net 30", "Due on delivery", etc.
      - Deposit vs final payment indicators
      - Early payment discounts
      - Late payment penalties
      
      Return JSON with extracted terms.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}

// Export singleton instance
export const advancedOCRTracker = new AdvancedOCRTracker();
