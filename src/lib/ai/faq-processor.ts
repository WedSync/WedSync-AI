import OpenAI from 'openai';
import { z } from 'zod';
import { ContentSanitizer } from '../security/content-sanitizer';
import { AuditLogger } from '../audit/audit-logger';

/**
 * Wedding-specific FAQ categories for AI classification
 */
export type WeddingFAQCategory =
  | 'pricing'
  | 'timeline'
  | 'services'
  | 'booking'
  | 'planning'
  | 'policies'
  | 'availability'
  | 'equipment'
  | 'location'
  | 'general';

/**
 * AI categorization result with confidence scoring
 */
export interface AICategorizationResult {
  category: WeddingFAQCategory;
  confidence: number; // 0-1
  reasoning: string;
  alternativeCategories?: Array<{
    category: WeddingFAQCategory;
    confidence: number;
  }>;
}

/**
 * AI quality assessment for FAQ content
 */
export interface AIQualityAssessment {
  overallScore: number; // 0-1
  dimensions: {
    completeness: number;
    clarity: number;
    weddingContext: number;
    actionability: number;
    professionalTone: number;
    lengthAppropriate: number;
  };
  improvements: string[];
  strengths: string[];
}

/**
 * AI content enhancement result
 */
export interface AIEnhancementResult {
  enhancedAnswer: string;
  improvements: string[];
  addedElements: string[];
  confidenceScore: number;
  preservedOriginal: boolean;
}

/**
 * Duplicate detection result
 */
export interface DuplicateGroup {
  questions: string[];
  similarity: number;
  suggestedMerge: string;
  reasoning: string;
}

/**
 * FAQ item structure for processing
 */
export interface FAQItem {
  id?: string;
  question: string;
  answer: string;
  category?: WeddingFAQCategory;
  metadata?: Record<string, any>;
}

/**
 * Batch processing result
 */
export interface AIProcessingResult {
  originalFAQ: FAQItem;
  categorization: AICategorizationResult;
  qualityAssessment: AIQualityAssessment;
  enhancement?: AIEnhancementResult;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

/**
 * Rate limiter for OpenAI API calls
 */
class OpenAIRateLimiter {
  private tokens: number = 500; // RPM limit for GPT-4
  private lastRefill: number = Date.now();
  private readonly refillRate = 500; // tokens per minute
  private readonly maxTokens = 500;

  async waitForToken(): Promise<void> {
    this.refill();

    if (this.tokens <= 0) {
      const waitTime = (60 / this.refillRate) * 1000; // Wait time in ms
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000 / 60; // minutes
    const tokensToAdd = Math.floor(timePassed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

/**
 * Comprehensive FAQ AI processor with OpenAI integration
 * Specialized for wedding vendor FAQ categorization and enhancement
 */
export class FAQAIProcessor {
  private openai: OpenAI;
  private rateLimiter: OpenAIRateLimiter;
  private contentSanitizer: ContentSanitizer;
  private auditLogger: AuditLogger;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
    this.rateLimiter = new OpenAIRateLimiter();
    this.contentSanitizer = new ContentSanitizer();

    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Categorize a single FAQ using AI with wedding industry context
   */
  async categorizeFAQ(
    question: string,
    answer: string,
  ): Promise<AICategorizationResult> {
    try {
      await this.rateLimiter.waitForToken();

      const prompt = this.buildCategorizationPrompt(question, answer);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a wedding industry expert specializing in categorizing wedding vendor FAQs. 
            You understand the unique needs of couples planning weddings and how different vendor types operate.
            
            Categories:
            - pricing: Costs, packages, payment terms, deposits, budgets
            - timeline: Schedules, delivery times, wedding day timing, deadlines  
            - services: What's included, service offerings, packages, scope
            - booking: Availability, reservations, dates, scheduling process
            - planning: Wedding day coordination, timelines, vendor management
            - policies: Cancellation, refunds, contracts, terms, agreements
            - availability: Seasonal availability, busy periods, open dates
            - equipment: Technical specs, camera gear, lighting, setup requirements
            - location: Travel requirements, venue restrictions, coverage areas
            - general: Miscellaneous questions that don't fit other categories
            
            Provide structured JSON response with category, confidence (0-1), reasoning, and alternatives.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        functions: [
          {
            name: 'categorize_faq',
            description: 'Categorize a wedding vendor FAQ',
            parameters: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: [
                    'pricing',
                    'timeline',
                    'services',
                    'booking',
                    'planning',
                    'policies',
                    'availability',
                    'equipment',
                    'location',
                    'general',
                  ],
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence score from 0-1',
                },
                reasoning: {
                  type: 'string',
                  description: 'Brief explanation for the categorization',
                },
                alternativeCategories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: {
                        type: 'string',
                        enum: [
                          'pricing',
                          'timeline',
                          'services',
                          'booking',
                          'planning',
                          'policies',
                          'availability',
                          'equipment',
                          'location',
                          'general',
                        ],
                      },
                      confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                      },
                    },
                  },
                },
              },
              required: ['category', 'confidence', 'reasoning'],
            },
          },
        ],
        function_call: { name: 'categorize_faq' },
        temperature: 0.1, // Low temperature for consistent categorization
      });

      const functionCall = completion.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error('No function call result from OpenAI');
      }

      const result = JSON.parse(functionCall.arguments);

      // Validate and sanitize result
      return {
        category: result.category as WeddingFAQCategory,
        confidence: Math.max(0, Math.min(1, result.confidence)),
        reasoning: await this.contentSanitizer.sanitizeText(
          result.reasoning || '',
        ),
        alternativeCategories: result.alternativeCategories || [],
      };
    } catch (error) {
      console.error('FAQ categorization failed:', error);

      // Fallback to rule-based categorization
      return this.fallbackCategorization(question, answer);
    }
  }

  /**
   * Assess FAQ quality using AI analysis
   */
  async assessQuality(faq: FAQItem): Promise<AIQualityAssessment> {
    try {
      await this.rateLimiter.waitForToken();

      const prompt = `Assess the quality of this wedding vendor FAQ:
      
Question: ${faq.question}
Answer: ${faq.answer}

Evaluate on these dimensions (0-1 scale):
1. Completeness: Does the answer fully address the question?
2. Clarity: Is it easy for couples to understand?
3. Wedding Context: Uses appropriate wedding industry language?
4. Actionability: Helps couples make decisions or take next steps?
5. Professional Tone: Professional yet approachable?
6. Length: Appropriate length (not too brief/verbose)?

Also provide specific improvements and strengths.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a wedding industry content quality expert who helps vendors improve their FAQ content for better client communication.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        functions: [
          {
            name: 'assess_quality',
            description: 'Assess FAQ quality across multiple dimensions',
            parameters: {
              type: 'object',
              properties: {
                dimensions: {
                  type: 'object',
                  properties: {
                    completeness: { type: 'number', minimum: 0, maximum: 1 },
                    clarity: { type: 'number', minimum: 0, maximum: 1 },
                    weddingContext: { type: 'number', minimum: 0, maximum: 1 },
                    actionability: { type: 'number', minimum: 0, maximum: 1 },
                    professionalTone: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1,
                    },
                    lengthAppropriate: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1,
                    },
                  },
                },
                improvements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific suggestions for improvement',
                },
                strengths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'What the FAQ does well',
                },
              },
              required: ['dimensions', 'improvements', 'strengths'],
            },
          },
        ],
        function_call: { name: 'assess_quality' },
        temperature: 0.2,
      });

      const functionCall = completion.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error('No function call result from OpenAI');
      }

      const result = JSON.parse(functionCall.arguments);
      const dimensions = result.dimensions;

      // Calculate overall score
      const overallScore =
        (dimensions.completeness +
          dimensions.clarity +
          dimensions.weddingContext +
          dimensions.actionability +
          dimensions.professionalTone +
          dimensions.lengthAppropriate) /
        6;

      return {
        overallScore,
        dimensions,
        improvements: result.improvements || [],
        strengths: result.strengths || [],
      };
    } catch (error) {
      console.error('Quality assessment failed:', error);

      // Return basic quality assessment
      return this.basicQualityAssessment(faq);
    }
  }

  /**
   * Detect duplicate FAQs using semantic similarity
   */
  async detectDuplicates(faqs: FAQItem[]): Promise<DuplicateGroup[]> {
    try {
      const duplicateGroups: DuplicateGroup[] = [];
      const processed = new Set<number>();

      // Get embeddings for all questions
      const embeddings = await this.getEmbeddings(faqs.map((f) => f.question));

      for (let i = 0; i < faqs.length; i++) {
        if (processed.has(i)) continue;

        const duplicates: string[] = [faqs[i].question];
        let maxSimilarity = 0;

        for (let j = i + 1; j < faqs.length; j++) {
          if (processed.has(j)) continue;

          const similarity = this.cosineSimilarity(
            embeddings[i],
            embeddings[j],
          );

          if (similarity > 0.85) {
            // High similarity threshold
            duplicates.push(faqs[j].question);
            processed.add(j);
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
        }

        if (duplicates.length > 1) {
          processed.add(i);

          // Generate merge suggestion using AI
          const suggestedMerge = await this.suggestMerge(
            duplicates,
            faqs.filter((f) => duplicates.includes(f.question)),
          );

          duplicateGroups.push({
            questions: duplicates,
            similarity: maxSimilarity,
            suggestedMerge,
            reasoning: `Found ${duplicates.length} similar questions with ${(maxSimilarity * 100).toFixed(1)}% similarity`,
          });
        }
      }

      return duplicateGroups;
    } catch (error) {
      console.error('Duplicate detection failed:', error);
      return [];
    }
  }

  /**
   * Enhance FAQ content with AI improvements
   */
  async enhanceContent(faq: FAQItem): Promise<AIEnhancementResult> {
    try {
      await this.rateLimiter.waitForToken();

      const prompt = `Enhance this wedding vendor FAQ to be more helpful for couples:

Question: ${faq.question}
Answer: ${faq.answer}

Improvements to make:
1. Add appropriate wedding industry terminology
2. Improve professional but approachable tone
3. Make it more actionable for couples
4. Add relevant next steps or contact suggestions
5. Ensure clarity and completeness

Keep the core information but enhance the language and structure.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a wedding industry copywriter who specializes in creating clear, helpful FAQ content that builds trust with couples and addresses their concerns effectively.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        functions: [
          {
            name: 'enhance_content',
            description: 'Enhance FAQ content for better client communication',
            parameters: {
              type: 'object',
              properties: {
                enhancedAnswer: {
                  type: 'string',
                  description: 'The improved answer text',
                },
                improvements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of improvements made',
                },
                addedElements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'New elements added (CTA, contact info, etc.)',
                },
                confidenceScore: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence in the enhancement quality',
                },
              },
              required: [
                'enhancedAnswer',
                'improvements',
                'addedElements',
                'confidenceScore',
              ],
            },
          },
        ],
        function_call: { name: 'enhance_content' },
        temperature: 0.3,
      });

      const functionCall = completion.choices[0]?.message?.function_call;
      if (!functionCall?.arguments) {
        throw new Error('No function call result from OpenAI');
      }

      const result = JSON.parse(functionCall.arguments);

      // Sanitize enhanced content
      const enhancedAnswer = await this.contentSanitizer.sanitizeText(
        result.enhancedAnswer,
      );

      return {
        enhancedAnswer,
        improvements: result.improvements || [],
        addedElements: result.addedElements || [],
        confidenceScore: Math.max(
          0,
          Math.min(1, result.confidenceScore || 0.5),
        ),
        preservedOriginal: false,
      };
    } catch (error) {
      console.error('Content enhancement failed:', error);

      return {
        enhancedAnswer: faq.answer,
        improvements: [],
        addedElements: [],
        confidenceScore: 0,
        preservedOriginal: true,
      };
    }
  }

  /**
   * Process multiple FAQs in batch with rate limiting
   */
  async processBatch(faqs: FAQItem[]): Promise<AIProcessingResult[]> {
    const results: AIProcessingResult[] = [];
    const batchSize = 10; // Process in smaller batches

    for (let i = 0; i < faqs.length; i += batchSize) {
      const batch = faqs.slice(i, i + batchSize);
      const batchPromises = batch.map((faq) => this.processSingleFAQ(faq));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Wait between batches to respect rate limits
        if (i + batchSize < faqs.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(
          `Batch processing failed for batch starting at ${i}:`,
          error,
        );

        // Add error results for failed batch
        batch.forEach((faq) => {
          results.push({
            originalFAQ: faq,
            categorization: this.fallbackCategorization(
              faq.question,
              faq.answer,
            ),
            qualityAssessment: this.basicQualityAssessment(faq),
            processingTimeMs: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }

    return results;
  }

  /**
   * Process a single FAQ with full AI analysis
   */
  private async processSingleFAQ(faq: FAQItem): Promise<AIProcessingResult> {
    const startTime = Date.now();

    try {
      // Run categorization and quality assessment in parallel
      const [categorization, qualityAssessment] = await Promise.all([
        this.categorizeFAQ(faq.question, faq.answer),
        this.assessQuality(faq),
      ]);

      // Only enhance if quality score is below threshold
      let enhancement: AIEnhancementResult | undefined;
      if (qualityAssessment.overallScore < 0.7) {
        enhancement = await this.enhanceContent(faq);
      }

      return {
        originalFAQ: faq,
        categorization,
        qualityAssessment,
        enhancement,
        processingTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        originalFAQ: faq,
        categorization: this.fallbackCategorization(faq.question, faq.answer),
        qualityAssessment: this.basicQualityAssessment(faq),
        processingTimeMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get embeddings for text similarity comparison
   */
  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      // Check cache first
      const cacheKey = this.hashText(text);
      if (this.embeddingCache.has(cacheKey)) {
        embeddings.push(this.embeddingCache.get(cacheKey)!);
        continue;
      }

      try {
        await this.rateLimiter.waitForToken();

        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Limit input length
        });

        const embedding = response.data[0].embedding;
        this.embeddingCache.set(cacheKey, embedding);
        embeddings.push(embedding);
      } catch (error) {
        console.error('Embedding generation failed:', error);
        // Use zero vector as fallback
        embeddings.push(new Array(1536).fill(0));
      }
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Suggest merged content for duplicate questions
   */
  private async suggestMerge(
    questions: string[],
    faqs: FAQItem[],
  ): Promise<string> {
    try {
      await this.rateLimiter.waitForToken();

      const prompt = `These wedding vendor FAQ questions seem to be duplicates:
      
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Related answers:
${faqs.map((faq, i) => `Answer ${i + 1}: ${faq.answer}`).join('\n\n')}

Create one comprehensive question that covers all these similar questions, keeping the most important elements from each.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a content editor specializing in merging similar FAQ content for wedding vendors.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.2,
      });

      return completion.choices[0]?.message?.content?.trim() || questions[0];
    } catch (error) {
      console.error('Merge suggestion failed:', error);
      return questions[0]; // Return first question as fallback
    }
  }

  /**
   * Fallback categorization using rule-based approach
   */
  private fallbackCategorization(
    question: string,
    answer: string,
  ): AICategorizationResult {
    const text = `${question} ${answer}`.toLowerCase();

    const patterns = {
      pricing: /price|cost|fee|payment|deposit|budget|money|\$|£|€/,
      timeline: /timeline|schedule|time|hour|day|duration|when|deadline/,
      services: /service|package|include|offer|provide|what.*do/,
      booking: /book|reserve|available|calendar|date|appointment/,
      planning: /plan|wedding day|coordinate|manage|timeline|venue/,
      policies: /policy|cancel|refund|contract|terms|agreement/,
      availability: /available|busy|season|weekend|holiday/,
      equipment: /equipment|camera|lighting|setup|gear|technical/,
      location: /location|travel|venue|where|distance|area/,
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return {
          category: category as WeddingFAQCategory,
          confidence: 0.6,
          reasoning: `Rule-based categorization based on keyword matching`,
        };
      }
    }

    return {
      category: 'general',
      confidence: 0.3,
      reasoning: 'No specific category patterns detected',
    };
  }

  /**
   * Basic quality assessment fallback
   */
  private basicQualityAssessment(faq: FAQItem): AIQualityAssessment {
    const questionLength = faq.question.length;
    const answerLength = faq.answer.length;
    const hasWeddingTerms = /wedding|bride|groom|ceremony|reception/.test(
      (faq.question + ' ' + faq.answer).toLowerCase(),
    );

    return {
      overallScore: 0.5,
      dimensions: {
        completeness: answerLength > 50 ? 0.7 : 0.3,
        clarity: questionLength > 10 && answerLength > 20 ? 0.6 : 0.3,
        weddingContext: hasWeddingTerms ? 0.8 : 0.2,
        actionability: 0.5,
        professionalTone: 0.5,
        lengthAppropriate: answerLength > 20 && answerLength < 1000 ? 0.7 : 0.4,
      },
      improvements: ['Consider adding more specific wedding industry context'],
      strengths: ['Basic question-answer structure is present'],
    };
  }

  /**
   * Generate hash for text caching
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Build categorization prompt
   */
  private buildCategorizationPrompt(question: string, answer: string): string {
    return `Please categorize this wedding vendor FAQ:

Question: ${question}

Answer: ${answer}

Consider the context of wedding planning and vendor services. Focus on what couples would need to know when planning their wedding.`;
  }
}

/**
 * Singleton instance for FAQ AI processor
 */
let processorInstance: FAQAIProcessor | null = null;

/**
 * Get or create FAQ AI processor singleton
 */
export function getFAQAIProcessor(auditLogger: AuditLogger): FAQAIProcessor {
  if (!processorInstance) {
    processorInstance = new FAQAIProcessor(auditLogger);
  }
  return processorInstance;
}
