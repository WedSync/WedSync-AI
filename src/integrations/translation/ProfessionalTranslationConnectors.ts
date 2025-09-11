/**
 * Professional Translation Service Connectors for WedSync
 * Handles human translator workflows for wedding industry content
 *
 * @fileoverview Comprehensive connector system for professional translation services
 * with wedding industry specialization, job management, and quality assurance
 *
 * @version 1.0.0
 * @author WedSync Development Team
 * @created 2025-01-14
 */

import { z } from 'zod';

/**
 * Translation quality levels supported across all services
 */
export enum TranslationQuality {
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  ULTRA = 'ultra',
  WEDDING_SPECIALIST = 'wedding_specialist',
}

/**
 * Job status tracking across all translation services
 */
export enum TranslationJobStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  REVISION_REQUESTED = 'revision_requested',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Wedding industry content categories for specialized translation
 */
export enum WeddingContentType {
  INVITATION = 'invitation',
  CEREMONY = 'ceremony',
  RECEPTION = 'reception',
  VENDOR_COMMUNICATION = 'vendor_communication',
  LEGAL_DOCUMENTS = 'legal_documents',
  MENU = 'menu',
  VOWS = 'vows',
  PROGRAM = 'program',
  SIGNAGE = 'signage',
  THANK_YOU = 'thank_you',
}

/**
 * Validation schemas for translation requests and responses
 */
export const TranslationJobSchema = z.object({
  id: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  content: z.string(),
  contentType: z.nativeEnum(WeddingContentType),
  quality: z.nativeEnum(TranslationQuality),
  instructions: z.string().optional(),
  culturalNotes: z.string().optional(),
  rushDelivery: z.boolean().default(false),
  weddingDate: z.date().optional(),
  budget: z.number().positive().optional(),
});

export const TranslatorProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  languages: z.array(z.string()),
  specializations: z.array(z.nativeEnum(WeddingContentType)),
  rating: z.number().min(0).max(5),
  completedJobs: z.number().nonnegative(),
  weddingExperience: z.boolean(),
  certifications: z.array(z.string()),
  averageDeliveryTime: z.number().positive(),
});

/**
 * Base interfaces for all translation service implementations
 */
export interface TranslationJob {
  id: string;
  serviceProvider: string;
  sourceLanguage: string;
  targetLanguage: string;
  content: string;
  translatedContent?: string;
  contentType: WeddingContentType;
  quality: TranslationQuality;
  status: TranslationJobStatus;
  assignedTranslator?: TranslatorProfile;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  cost: number;
  currency: string;
  instructions?: string;
  culturalNotes?: string;
  rushDelivery: boolean;
  weddingDate?: Date;
  revisionCount: number;
  rating?: number;
  feedback?: string;
  metadata?: Record<string, unknown>;
}

export interface TranslatorProfile {
  id: string;
  serviceProvider: string;
  name: string;
  languages: string[];
  specializations: WeddingContentType[];
  rating: number;
  completedJobs: number;
  weddingExperience: boolean;
  certifications: string[];
  averageDeliveryTime: number; // in hours
  pricePerWord: Record<string, number>; // currency -> price
  availability: boolean;
  timezone: string;
  profileUrl?: string;
}

export interface TranslationQuote {
  serviceProvider: string;
  estimatedCost: number;
  currency: string;
  estimatedDelivery: Date;
  availableTranslators: TranslatorProfile[];
  rushDeliveryAvailable: boolean;
  rushDeliveryMultiplier: number;
  qualityOptions: TranslationQuality[];
}

export interface TranslationProgress {
  jobId: string;
  status: TranslationJobStatus;
  progressPercentage: number;
  currentStage: string;
  estimatedCompletion: Date;
  messagesFromTranslator?: string[];
  lastUpdated: Date;
}

/**
 * Events emitted by translation services for real-time updates
 */
export interface TranslationServiceEvents {
  jobStatusChanged: (jobId: string, status: TranslationJobStatus) => void;
  translatorAssigned: (jobId: string, translator: TranslatorProfile) => void;
  progressUpdated: (jobId: string, progress: TranslationProgress) => void;
  qualityIssueDetected: (jobId: string, issue: string) => void;
  deliveryDelayed: (
    jobId: string,
    newDeliveryDate: Date,
    reason: string,
  ) => void;
  jobCompleted: (jobId: string, result: TranslationJob) => void;
}

/**
 * Abstract base class for all professional translation service providers
 * Ensures consistent interface across different services
 */
export abstract class BaseProfessionalTranslationProvider {
  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly serviceName: string;
  protected readonly eventHandlers: Partial<TranslationServiceEvents> = {};

  constructor(apiKey: string, baseUrl: string, serviceName: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.serviceName = serviceName;
  }

  /**
   * Register event handlers for real-time updates
   */
  public on<K extends keyof TranslationServiceEvents>(
    event: K,
    handler: TranslationServiceEvents[K],
  ): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Emit events to registered handlers
   */
  protected emit<K extends keyof TranslationServiceEvents>(
    event: K,
    ...args: Parameters<TranslationServiceEvents[K]>
  ): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      (handler as (...args: unknown[]) => void)(...args);
    }
  }

  /**
   * Get quote for translation job
   */
  abstract getQuote(
    sourceLanguage: string,
    targetLanguage: string,
    content: string,
    contentType: WeddingContentType,
    quality: TranslationQuality,
    rushDelivery?: boolean,
  ): Promise<TranslationQuote>;

  /**
   * Find translators with wedding industry expertise
   */
  abstract findWeddingSpecialists(
    sourceLanguage: string,
    targetLanguage: string,
    contentType: WeddingContentType,
  ): Promise<TranslatorProfile[]>;

  /**
   * Submit translation job to service
   */
  abstract submitJob(
    request: z.infer<typeof TranslationJobSchema>,
  ): Promise<TranslationJob>;

  /**
   * Get job status and progress
   */
  abstract getJobStatus(jobId: string): Promise<TranslationProgress>;

  /**
   * Get completed translation job
   */
  abstract getJob(jobId: string): Promise<TranslationJob>;

  /**
   * Request revision for completed job
   */
  abstract requestRevision(
    jobId: string,
    revisionInstructions: string,
  ): Promise<TranslationJob>;

  /**
   * Rate and provide feedback for completed job
   */
  abstract rateTranslation(
    jobId: string,
    rating: number,
    feedback?: string,
  ): Promise<void>;

  /**
   * Cancel pending or in-progress job
   */
  abstract cancelJob(jobId: string, reason?: string): Promise<void>;

  /**
   * Get translator profile and portfolio
   */
  abstract getTranslatorProfile(
    translatorId: string,
  ): Promise<TranslatorProfile>;

  /**
   * Calculate wedding content priority scoring
   */
  protected calculateWeddingPriority(
    contentType: WeddingContentType,
    weddingDate?: Date,
  ): number {
    const baseScores: Record<WeddingContentType, number> = {
      [WeddingContentType.LEGAL_DOCUMENTS]: 100,
      [WeddingContentType.INVITATION]: 90,
      [WeddingContentType.CEREMONY]: 85,
      [WeddingContentType.VOWS]: 85,
      [WeddingContentType.PROGRAM]: 75,
      [WeddingContentType.MENU]: 70,
      [WeddingContentType.SIGNAGE]: 65,
      [WeddingContentType.RECEPTION]: 60,
      [WeddingContentType.VENDOR_COMMUNICATION]: 50,
      [WeddingContentType.THANK_YOU]: 30,
    };

    let priority = baseScores[contentType];

    // Increase priority based on wedding date proximity
    if (weddingDate) {
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilWedding <= 7) priority *= 2;
      else if (daysUntilWedding <= 30) priority *= 1.5;
      else if (daysUntilWedding <= 90) priority *= 1.2;
    }

    return priority;
  }

  /**
   * Validate translation quality against wedding standards
   */
  protected validateWeddingTranslation(
    original: string,
    translation: string,
    contentType: WeddingContentType,
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for wedding-specific terminology preservation
    const weddingTerms = [
      'bride',
      'groom',
      'ceremony',
      'reception',
      'vows',
      'wedding party',
      'maid of honor',
      'best man',
    ];

    weddingTerms.forEach((term) => {
      if (
        original.toLowerCase().includes(term) &&
        !translation.toLowerCase().includes('bride') &&
        !translation.toLowerCase().includes('groom')
      ) {
        issues.push(
          `Wedding terminology "${term}" may not be properly translated`,
        );
      }
    });

    // Check length discrepancy (shouldn't be too different)
    const lengthRatio = translation.length / original.length;
    if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      issues.push('Translation length significantly different from original');
    }

    // Content-specific validations
    switch (contentType) {
      case WeddingContentType.INVITATION:
        if (
          !translation.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/) &&
          original.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/)
        ) {
          issues.push('Date format may not be preserved in invitation');
        }
        break;

      case WeddingContentType.LEGAL_DOCUMENTS:
        if (translation.length < original.length * 0.8) {
          issues.push('Legal document translation appears incomplete');
        }
        break;

      case WeddingContentType.MENU:
        // Check for dietary restrictions/allergen info preservation
        const dietaryTerms = [
          'vegetarian',
          'vegan',
          'gluten',
          'allergy',
          'allergen',
        ];
        dietaryTerms.forEach((term) => {
          if (
            original.toLowerCase().includes(term) &&
            !translation.toLowerCase().includes(term)
          ) {
            issues.push(
              `Dietary restriction "${term}" may be lost in translation`,
            );
          }
        });
        break;
    }

    return { isValid: issues.length === 0, issues };
  }
}

/**
 * Gengo API Integration
 * Professional human translation service with wedding industry specialists
 */
export class GengoTranslationProvider extends BaseProfessionalTranslationProvider {
  private readonly sandboxUrl = 'https://api.sandbox.gengo.com/v2';
  private readonly productionUrl = 'https://api.gengo.com/v2';
  private readonly privateKey: string;

  constructor(publicKey: string, privateKey: string, useSandbox = false) {
    super(
      publicKey,
      useSandbox
        ? 'https://api.sandbox.gengo.com/v2'
        : 'https://api.gengo.com/v2',
      'Gengo',
    );
    this.privateKey = privateKey;
  }

  async getQuote(
    sourceLanguage: string,
    targetLanguage: string,
    content: string,
    contentType: WeddingContentType,
    quality: TranslationQuality,
    rushDelivery = false,
  ): Promise<TranslationQuote> {
    const wordCount = content.trim().split(/\s+/).length;
    const priority = this.calculateWeddingPriority(contentType);

    // Simulate Gengo API call
    const response = await this.makeApiCall('/translate/service/quote', {
      jobs: [
        {
          source_language: sourceLanguage,
          target_language: targetLanguage,
          tier: this.mapQualityToGengoTier(quality),
          unit_count: wordCount,
          custom_data: JSON.stringify({ contentType, priority, rushDelivery }),
        },
      ],
    });

    const estimatedHours = rushDelivery
      ? Math.max(2, wordCount / 500)
      : Math.max(8, wordCount / 200);

    return {
      serviceProvider: this.serviceName,
      estimatedCost: response.credits * 0.05, // Convert credits to USD
      currency: 'USD',
      estimatedDelivery: new Date(Date.now() + estimatedHours * 60 * 60 * 1000),
      availableTranslators: await this.findWeddingSpecialists(
        sourceLanguage,
        targetLanguage,
        contentType,
      ),
      rushDeliveryAvailable: true,
      rushDeliveryMultiplier: 2.0,
      qualityOptions: [
        TranslationQuality.STANDARD,
        TranslationQuality.PROFESSIONAL,
        TranslationQuality.WEDDING_SPECIALIST,
      ],
    };
  }

  async findWeddingSpecialists(
    sourceLanguage: string,
    targetLanguage: string,
    contentType: WeddingContentType,
  ): Promise<TranslatorProfile[]> {
    // Simulate finding wedding specialist translators
    const response = await this.makeApiCall('/translate/translators', {
      source_language: sourceLanguage,
      target_language: targetLanguage,
      tier: 'pro',
      tags: ['wedding', 'events', 'hospitality'],
    });

    return response.translators.map((translator: any) => ({
      id: translator.id,
      serviceProvider: this.serviceName,
      name: translator.display_name || 'Professional Translator',
      languages: [sourceLanguage, targetLanguage],
      specializations: [contentType, WeddingContentType.CEREMONY],
      rating: translator.rating || 4.5,
      completedJobs: translator.number_of_jobs || 100,
      weddingExperience: translator.tags?.includes('wedding') || true,
      certifications: translator.certifications || [
        'Wedding Translation Certificate',
      ],
      averageDeliveryTime: 24,
      pricePerWord: { USD: 0.12 },
      availability: true,
      timezone: translator.timezone || 'UTC',
      profileUrl: `https://gengo.com/translators/${translator.id}`,
    }));
  }

  async submitJob(
    request: z.infer<typeof TranslationJobSchema>,
  ): Promise<TranslationJob> {
    const validatedRequest = TranslationJobSchema.parse(request);
    const priority = this.calculateWeddingPriority(
      validatedRequest.contentType,
      validatedRequest.weddingDate,
    );

    const response = await this.makeApiCall('/translate/jobs', {
      jobs: [
        {
          type: 'text',
          slug: `wedding-${validatedRequest.contentType}-${Date.now()}`,
          body_src: validatedRequest.content,
          lc_src: validatedRequest.sourceLanguage,
          lc_tgt: validatedRequest.targetLanguage,
          tier: this.mapQualityToGengoTier(validatedRequest.quality),
          instructions: this.buildWeddingInstructions(validatedRequest),
          custom_data: JSON.stringify({
            contentType: validatedRequest.contentType,
            priority,
            rushDelivery: validatedRequest.rushDelivery,
            weddingDate: validatedRequest.weddingDate?.toISOString(),
          }),
        },
      ],
    });

    const job = response.jobs[0];
    const translationJob: TranslationJob = {
      id: job.job_id,
      serviceProvider: this.serviceName,
      sourceLanguage: validatedRequest.sourceLanguage,
      targetLanguage: validatedRequest.targetLanguage,
      content: validatedRequest.content,
      contentType: validatedRequest.contentType,
      quality: validatedRequest.quality,
      status: this.mapGengoStatusToJobStatus(job.status),
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDelivery: new Date(job.eta * 1000),
      cost: job.credits * 0.05,
      currency: 'USD',
      instructions: validatedRequest.instructions,
      culturalNotes: validatedRequest.culturalNotes,
      rushDelivery: validatedRequest.rushDelivery,
      weddingDate: validatedRequest.weddingDate,
      revisionCount: 0,
    };

    this.emit('jobStatusChanged', translationJob.id, translationJob.status);
    return translationJob;
  }

  async getJobStatus(jobId: string): Promise<TranslationProgress> {
    const response = await this.makeApiCall(`/translate/job/${jobId}`);
    const job = response.job;

    return {
      jobId,
      status: this.mapGengoStatusToJobStatus(job.status),
      progressPercentage: this.calculateProgressPercentage(job.status),
      currentStage: this.getHumanReadableStage(job.status),
      estimatedCompletion: new Date(job.eta * 1000),
      messagesFromTranslator: job.comments?.map((c: any) => c.body) || [],
      lastUpdated: new Date(job.ctime * 1000),
    };
  }

  async getJob(jobId: string): Promise<TranslationJob> {
    const response = await this.makeApiCall(`/translate/job/${jobId}`);
    const job = response.job;

    const translationJob: TranslationJob = {
      id: job.job_id,
      serviceProvider: this.serviceName,
      sourceLanguage: job.lc_src,
      targetLanguage: job.lc_tgt,
      content: job.body_src,
      translatedContent: job.body_tgt,
      contentType: WeddingContentType.VENDOR_COMMUNICATION, // Parse from custom_data
      quality: this.mapGengoTierToQuality(job.tier),
      status: this.mapGengoStatusToJobStatus(job.status),
      createdAt: new Date(job.ctime * 1000),
      updatedAt: new Date(job.mtime * 1000),
      completedAt:
        job.status === 'approved' ? new Date(job.mtime * 1000) : undefined,
      estimatedDelivery: new Date(job.eta * 1000),
      cost: job.credits * 0.05,
      currency: 'USD',
      rushDelivery: false,
      revisionCount: 0,
    };

    if (job.body_tgt) {
      const validation = this.validateWeddingTranslation(
        job.body_src,
        job.body_tgt,
        translationJob.contentType,
      );

      if (!validation.isValid) {
        this.emit('qualityIssueDetected', jobId, validation.issues.join('; '));
      }
    }

    return translationJob;
  }

  async requestRevision(
    jobId: string,
    revisionInstructions: string,
  ): Promise<TranslationJob> {
    await this.makeApiCall(
      `/translate/job/${jobId}`,
      {
        action: 'revise',
        comment: revisionInstructions,
      },
      'PUT',
    );

    return this.getJob(jobId);
  }

  async rateTranslation(
    jobId: string,
    rating: number,
    feedback?: string,
  ): Promise<void> {
    await this.makeApiCall(
      `/translate/job/${jobId}`,
      {
        action: rating >= 3 ? 'approve' : 'reject',
        rating: Math.max(1, Math.min(5, rating)),
        for_translator: feedback || '',
      },
      'PUT',
    );
  }

  async cancelJob(jobId: string, reason?: string): Promise<void> {
    await this.makeApiCall(
      `/translate/job/${jobId}`,
      {
        action: 'cancel',
        reason: reason || 'No longer needed',
      },
      'DELETE',
    );

    this.emit('jobStatusChanged', jobId, TranslationJobStatus.CANCELLED);
  }

  async getTranslatorProfile(translatorId: string): Promise<TranslatorProfile> {
    const response = await this.makeApiCall(
      `/translate/translators/${translatorId}`,
    );
    const translator = response.translator;

    return {
      id: translator.id,
      serviceProvider: this.serviceName,
      name: translator.display_name,
      languages: translator.language_pairs,
      specializations: [
        WeddingContentType.CEREMONY,
        WeddingContentType.RECEPTION,
      ],
      rating: translator.rating,
      completedJobs: translator.number_of_jobs,
      weddingExperience: true,
      certifications: translator.certifications || [],
      averageDeliveryTime: 24,
      pricePerWord: { USD: 0.12 },
      availability: true,
      timezone: translator.timezone,
      profileUrl: `https://gengo.com/translators/${translator.id}`,
    };
  }

  /**
   * Helper methods for Gengo-specific functionality
   */
  private mapQualityToGengoTier(quality: TranslationQuality): string {
    switch (quality) {
      case TranslationQuality.STANDARD:
        return 'standard';
      case TranslationQuality.PROFESSIONAL:
      case TranslationQuality.WEDDING_SPECIALIST:
        return 'pro';
      case TranslationQuality.ULTRA:
        return 'ultra';
      default:
        return 'standard';
    }
  }

  private mapGengoTierToQuality(tier: string): TranslationQuality {
    switch (tier) {
      case 'standard':
        return TranslationQuality.STANDARD;
      case 'pro':
        return TranslationQuality.PROFESSIONAL;
      case 'ultra':
        return TranslationQuality.ULTRA;
      default:
        return TranslationQuality.STANDARD;
    }
  }

  private mapGengoStatusToJobStatus(status: string): TranslationJobStatus {
    const statusMap: Record<string, TranslationJobStatus> = {
      available: TranslationJobStatus.PENDING,
      pending: TranslationJobStatus.ASSIGNED,
      translating: TranslationJobStatus.IN_PROGRESS,
      reviewable: TranslationJobStatus.REVIEW,
      revising: TranslationJobStatus.REVISION_REQUESTED,
      approved: TranslationJobStatus.COMPLETED,
      cancelled: TranslationJobStatus.CANCELLED,
      held: TranslationJobStatus.FAILED,
    };

    return statusMap[status] || TranslationJobStatus.PENDING;
  }

  private calculateProgressPercentage(status: string): number {
    const progressMap: Record<string, number> = {
      available: 0,
      pending: 10,
      translating: 50,
      reviewable: 85,
      revising: 60,
      approved: 100,
      cancelled: 0,
      held: 0,
    };

    return progressMap[status] || 0;
  }

  private getHumanReadableStage(status: string): string {
    const stageMap: Record<string, string> = {
      available: 'Waiting for translator assignment',
      pending: 'Translator assigned, starting soon',
      translating: 'Translation in progress',
      reviewable: 'Ready for your review',
      revising: 'Translator making revisions',
      approved: 'Translation completed',
      cancelled: 'Job cancelled',
      held: 'On hold due to issues',
    };

    return stageMap[status] || 'Unknown status';
  }

  private buildWeddingInstructions(
    request: z.infer<typeof TranslationJobSchema>,
  ): string {
    let instructions = `This is ${request.contentType} content for a wedding. `;

    instructions +=
      'Please maintain formal tone and wedding-appropriate language. ';

    if (request.weddingDate) {
      const daysUntil = Math.ceil(
        (request.weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      instructions += `The wedding is in ${daysUntil} days, so accuracy is critical. `;
    }

    if (request.culturalNotes) {
      instructions += `Cultural context: ${request.culturalNotes} `;
    }

    if (request.instructions) {
      instructions += `Additional instructions: ${request.instructions}`;
    }

    return instructions.trim();
  }

  /**
   * Make authenticated API call to Gengo
   */
  private async makeApiCall(
    endpoint: string,
    data?: any,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  ): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body:
        method !== 'GET'
          ? JSON.stringify({
              api_key: this.apiKey,
              ts: timestamp,
              api_sig: signature,
              data: data || {},
            })
          : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Gengo API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    if (result.opstat !== 'ok') {
      throw new Error(`Gengo API error: ${result.err?.msg || 'Unknown error'}`);
    }

    return result.response;
  }

  private generateSignature(timestamp: number): string {
    // In a real implementation, use HMAC-SHA1 with private key
    // For demo purposes, returning a mock signature
    return `mock_signature_${timestamp}_${this.privateKey.slice(0, 8)}`;
  }
}

/**
 * Phrase (formerly Crowdin) Integration
 * Translation management platform with collaborative workflows
 */
export class PhraseTranslationProvider extends BaseProfessionalTranslationProvider {
  constructor(apiToken: string) {
    super(apiToken, 'https://api.phrase.com/v2', 'Phrase');
  }

  async getQuote(
    sourceLanguage: string,
    targetLanguage: string,
    content: string,
    contentType: WeddingContentType,
    quality: TranslationQuality,
    rushDelivery = false,
  ): Promise<TranslationQuote> {
    const wordCount = content.trim().split(/\s+/).length;

    // Phrase uses orders system - simulate pricing
    const basePrice = wordCount * 0.1; // $0.10 per word
    const qualityMultiplier = this.getQualityMultiplier(quality);
    const rushMultiplier = rushDelivery ? 1.5 : 1.0;

    const estimatedCost = basePrice * qualityMultiplier * rushMultiplier;
    const estimatedHours = rushDelivery
      ? Math.max(4, wordCount / 400)
      : Math.max(24, wordCount / 150);

    return {
      serviceProvider: this.serviceName,
      estimatedCost,
      currency: 'USD',
      estimatedDelivery: new Date(Date.now() + estimatedHours * 60 * 60 * 1000),
      availableTranslators: await this.findWeddingSpecialists(
        sourceLanguage,
        targetLanguage,
        contentType,
      ),
      rushDeliveryAvailable: true,
      rushDeliveryMultiplier: 1.5,
      qualityOptions: [
        TranslationQuality.STANDARD,
        TranslationQuality.PROFESSIONAL,
        TranslationQuality.ULTRA,
      ],
    };
  }

  async findWeddingSpecialists(
    sourceLanguage: string,
    targetLanguage: string,
    contentType: WeddingContentType,
  ): Promise<TranslatorProfile[]> {
    // Mock translator profiles with wedding expertise
    return [
      {
        id: 'phrase_wedding_expert_1',
        serviceProvider: this.serviceName,
        name: 'Wedding Translation Specialist',
        languages: [sourceLanguage, targetLanguage],
        specializations: [
          contentType,
          WeddingContentType.INVITATION,
          WeddingContentType.CEREMONY,
        ],
        rating: 4.8,
        completedJobs: 250,
        weddingExperience: true,
        certifications: [
          'Certified Wedding Translator',
          'Cultural Adaptation Specialist',
        ],
        averageDeliveryTime: 18,
        pricePerWord: { USD: 0.15 },
        availability: true,
        timezone: 'UTC+1',
        profileUrl: 'https://phrase.com/translators/wedding-expert-1',
      },
    ];
  }

  async submitJob(
    request: z.infer<typeof TranslationJobSchema>,
  ): Promise<TranslationJob> {
    const validatedRequest = TranslationJobSchema.parse(request);

    // Create translation order in Phrase
    const response = await this.makeApiCall('/orders', {
      name: `Wedding ${validatedRequest.contentType} Translation`,
      lsp: 'phrase',
      source_locale: validatedRequest.sourceLanguage,
      target_locales: [validatedRequest.targetLanguage],
      translation_type: this.mapQualityToPhraseType(validatedRequest.quality),
      briefing: this.buildWeddingBriefing(validatedRequest),
      styleguide_id: null,
      unverify_translations_upon_delivery: false,
      include_untranslated_keys: false,
      include_unverified_translations: false,
      quality_assurance_checks: true,
      priority: validatedRequest.rushDelivery,
    });

    const translationJob: TranslationJob = {
      id: response.id,
      serviceProvider: this.serviceName,
      sourceLanguage: validatedRequest.sourceLanguage,
      targetLanguage: validatedRequest.targetLanguage,
      content: validatedRequest.content,
      contentType: validatedRequest.contentType,
      quality: validatedRequest.quality,
      status: TranslationJobStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDelivery: new Date(response.expected_delivery_date),
      cost: response.amount_cents / 100,
      currency: response.currency,
      instructions: validatedRequest.instructions,
      culturalNotes: validatedRequest.culturalNotes,
      rushDelivery: validatedRequest.rushDelivery,
      weddingDate: validatedRequest.weddingDate,
      revisionCount: 0,
    };

    this.emit('jobStatusChanged', translationJob.id, translationJob.status);
    return translationJob;
  }

  async getJobStatus(jobId: string): Promise<TranslationProgress> {
    const response = await this.makeApiCall(`/orders/${jobId}`);

    return {
      jobId,
      status: this.mapPhraseStatusToJobStatus(response.state),
      progressPercentage: this.calculatePhraseProgress(
        response.progress_percent,
      ),
      currentStage: this.getPhraseHumanReadableStage(response.state),
      estimatedCompletion: new Date(response.expected_delivery_date),
      messagesFromTranslator:
        response.messages?.map((m: any) => m.message) || [],
      lastUpdated: new Date(response.updated_at),
    };
  }

  async getJob(jobId: string): Promise<TranslationJob> {
    const response = await this.makeApiCall(`/orders/${jobId}`);

    return {
      id: response.id,
      serviceProvider: this.serviceName,
      sourceLanguage: response.source_locale,
      targetLanguage: response.target_locales[0],
      content: '', // Would need to fetch from associated keys
      translatedContent:
        response.state === 'delivered' ? 'Translated content' : undefined,
      contentType: WeddingContentType.VENDOR_COMMUNICATION,
      quality: TranslationQuality.PROFESSIONAL,
      status: this.mapPhraseStatusToJobStatus(response.state),
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
      completedAt:
        response.state === 'delivered'
          ? new Date(response.updated_at)
          : undefined,
      estimatedDelivery: new Date(response.expected_delivery_date),
      cost: response.amount_cents / 100,
      currency: response.currency,
      rushDelivery: response.priority,
      revisionCount: 0,
    };
  }

  async requestRevision(
    jobId: string,
    revisionInstructions: string,
  ): Promise<TranslationJob> {
    await this.makeApiCall(`/orders/${jobId}/messages`, {
      message: `Revision requested: ${revisionInstructions}`,
    });

    return this.getJob(jobId);
  }

  async rateTranslation(
    jobId: string,
    rating: number,
    feedback?: string,
  ): Promise<void> {
    await this.makeApiCall(`/orders/${jobId}/reviews`, {
      rating: Math.max(1, Math.min(5, rating)),
      message: feedback || '',
    });
  }

  async cancelJob(jobId: string, reason?: string): Promise<void> {
    await this.makeApiCall(
      `/orders/${jobId}`,
      {
        state: 'cancelled',
        message: reason || 'No longer needed',
      },
      'PATCH',
    );

    this.emit('jobStatusChanged', jobId, TranslationJobStatus.CANCELLED);
  }

  async getTranslatorProfile(translatorId: string): Promise<TranslatorProfile> {
    // Phrase doesn't expose individual translator profiles
    // Return a mock profile representing their LSP network
    return {
      id: translatorId,
      serviceProvider: this.serviceName,
      name: 'Phrase Professional Translator',
      languages: ['en', 'es', 'fr', 'de'],
      specializations: [
        WeddingContentType.CEREMONY,
        WeddingContentType.RECEPTION,
      ],
      rating: 4.5,
      completedJobs: 500,
      weddingExperience: true,
      certifications: ['Professional Translation Certificate'],
      averageDeliveryTime: 24,
      pricePerWord: { USD: 0.12 },
      availability: true,
      timezone: 'UTC',
      profileUrl: 'https://phrase.com/lsp-network',
    };
  }

  private getQualityMultiplier(quality: TranslationQuality): number {
    switch (quality) {
      case TranslationQuality.STANDARD:
        return 1.0;
      case TranslationQuality.PROFESSIONAL:
        return 1.5;
      case TranslationQuality.ULTRA:
      case TranslationQuality.WEDDING_SPECIALIST:
        return 2.0;
      default:
        return 1.0;
    }
  }

  private mapQualityToPhraseType(quality: TranslationQuality): string {
    switch (quality) {
      case TranslationQuality.STANDARD:
        return 'translation';
      case TranslationQuality.PROFESSIONAL:
      case TranslationQuality.WEDDING_SPECIALIST:
        return 'translation_and_review';
      case TranslationQuality.ULTRA:
        return 'translation_review_and_approval';
      default:
        return 'translation';
    }
  }

  private mapPhraseStatusToJobStatus(state: string): TranslationJobStatus {
    const statusMap: Record<string, TranslationJobStatus> = {
      confirmed: TranslationJobStatus.ASSIGNED,
      in_progress: TranslationJobStatus.IN_PROGRESS,
      delivered: TranslationJobStatus.COMPLETED,
      cancelled: TranslationJobStatus.CANCELLED,
    };

    return statusMap[state] || TranslationJobStatus.PENDING;
  }

  private calculatePhraseProgress(progressPercent: number): number {
    return Math.max(0, Math.min(100, progressPercent));
  }

  private getPhraseHumanReadableStage(state: string): string {
    const stageMap: Record<string, string> = {
      confirmed: 'Order confirmed, translation starting',
      in_progress: 'Translation in progress',
      delivered: 'Translation completed and delivered',
      cancelled: 'Order cancelled',
    };

    return stageMap[state] || 'Processing order';
  }

  private buildWeddingBriefing(
    request: z.infer<typeof TranslationJobSchema>,
  ): string {
    let briefing = `Wedding ${request.contentType} translation project.\n\n`;

    briefing +=
      'IMPORTANT: This content is for a wedding ceremony and must maintain:\n';
    briefing += '- Formal, respectful tone\n';
    briefing += '- Cultural sensitivity\n';
    briefing += '- Accuracy of names, dates, and locations\n';
    briefing += '- Wedding-specific terminology\n\n';

    if (request.weddingDate) {
      briefing += `Wedding Date: ${request.weddingDate.toDateString()}\n`;
    }

    if (request.culturalNotes) {
      briefing += `Cultural Context: ${request.culturalNotes}\n`;
    }

    if (request.instructions) {
      briefing += `Additional Instructions: ${request.instructions}\n`;
    }

    return briefing;
  }

  private async makeApiCall(
    endpoint: string,
    data?: any,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `token ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(data || {}) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Phrase API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }
}

/**
 * Professional Translation Service Manager
 * Orchestrates multiple translation providers with fallback and optimization
 */
export class ProfessionalTranslationManager {
  private providers: Map<string, BaseProfessionalTranslationProvider> =
    new Map();
  private defaultProvider?: string;
  private fallbackProviders: string[] = [];

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Register a translation service provider
   */
  public addProvider(
    name: string,
    provider: BaseProfessionalTranslationProvider,
    isDefault = false,
  ): void {
    this.providers.set(name, provider);

    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = name;
    }

    this.fallbackProviders.push(name);
  }

  /**
   * Get quotes from all available providers
   */
  public async getAllQuotes(
    sourceLanguage: string,
    targetLanguage: string,
    content: string,
    contentType: WeddingContentType,
    quality: TranslationQuality,
    rushDelivery = false,
  ): Promise<TranslationQuote[]> {
    const quotes: TranslationQuote[] = [];

    await Promise.allSettled(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        try {
          const quote = await provider.getQuote(
            sourceLanguage,
            targetLanguage,
            content,
            contentType,
            quality,
            rushDelivery,
          );
          quotes.push(quote);
        } catch (error) {
          console.warn(`Failed to get quote from ${name}:`, error);
        }
      }),
    );

    return quotes.sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  /**
   * Submit job to best available provider
   */
  public async submitJob(
    request: z.infer<typeof TranslationJobSchema>,
    preferredProvider?: string,
  ): Promise<TranslationJob> {
    const providerName = preferredProvider || this.defaultProvider;

    if (!providerName || !this.providers.has(providerName)) {
      throw new Error('No translation provider available');
    }

    const provider = this.providers.get(providerName)!;

    try {
      return await provider.submitJob(request);
    } catch (error) {
      console.error(`Failed to submit job to ${providerName}:`, error);

      // Try fallback providers
      for (const fallbackName of this.fallbackProviders) {
        if (fallbackName !== providerName && this.providers.has(fallbackName)) {
          try {
            const fallbackProvider = this.providers.get(fallbackName)!;
            return await fallbackProvider.submitJob(request);
          } catch (fallbackError) {
            console.warn(
              `Fallback provider ${fallbackName} also failed:`,
              fallbackError,
            );
          }
        }
      }

      throw new Error('All translation providers failed');
    }
  }

  /**
   * Get job status from appropriate provider
   */
  public async getJobStatus(
    jobId: string,
    providerName: string,
  ): Promise<TranslationProgress> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Translation provider ${providerName} not found`);
    }

    return provider.getJobStatus(jobId);
  }

  /**
   * Get completed job from appropriate provider
   */
  public async getJob(
    jobId: string,
    providerName: string,
  ): Promise<TranslationJob> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Translation provider ${providerName} not found`);
    }

    return provider.getJob(jobId);
  }

  /**
   * Find wedding specialists across all providers
   */
  public async findAllWeddingSpecialists(
    sourceLanguage: string,
    targetLanguage: string,
    contentType: WeddingContentType,
  ): Promise<Map<string, TranslatorProfile[]>> {
    const specialistsByProvider = new Map<string, TranslatorProfile[]>();

    await Promise.allSettled(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        try {
          const specialists = await provider.findWeddingSpecialists(
            sourceLanguage,
            targetLanguage,
            contentType,
          );
          specialistsByProvider.set(name, specialists);
        } catch (error) {
          console.warn(`Failed to find specialists from ${name}:`, error);
        }
      }),
    );

    return specialistsByProvider;
  }

  /**
   * Get provider statistics and health
   */
  public getProviderStats(): Record<string, any> {
    return {
      totalProviders: this.providers.size,
      availableProviders: Array.from(this.providers.keys()),
      defaultProvider: this.defaultProvider,
      fallbackProviders: this.fallbackProviders,
    };
  }

  private setupEventHandlers(): void {
    // Set up cross-provider event handling and monitoring
    // This would include metrics collection, alerting, etc.
  }
}

/**
 * Factory function to create a configured professional translation manager
 */
export function createProfessionalTranslationManager(config: {
  gengoPublicKey?: string;
  gengoPrivateKey?: string;
  phraseApiToken?: string;
  useSandbox?: boolean;
}): ProfessionalTranslationManager {
  const manager = new ProfessionalTranslationManager();

  // Add Gengo provider if configured
  if (config.gengoPublicKey && config.gengoPrivateKey) {
    const gengoProvider = new GengoTranslationProvider(
      config.gengoPublicKey,
      config.gengoPrivateKey,
      config.useSandbox || false,
    );
    manager.addProvider('gengo', gengoProvider, true);
  }

  // Add Phrase provider if configured
  if (config.phraseApiToken) {
    const phraseProvider = new PhraseTranslationProvider(config.phraseApiToken);
    manager.addProvider('phrase', phraseProvider, !config.gengoPublicKey);
  }

  return manager;
}

// Types already exported above with their interface declarations
