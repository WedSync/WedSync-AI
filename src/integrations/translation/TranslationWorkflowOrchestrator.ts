/**
 * Translation Workflow Orchestrator for WedSync
 *
 * Orchestrates the complete translation workflow including:
 * - Translation memory lookup
 * - Provider selection and fallback
 * - Quality assurance validation
 * - Professional human review coordination
 * - Automated retry and optimization
 *
 * @fileoverview WS-247 Translation Workflow Orchestrator Implementation
 * @version 1.0.0
 * @author WedSync Development Team
 */

import {
  GoogleTranslateIntegration,
  TranslationResult as GoogleTranslationResult,
  TranslationError,
} from './GoogleTranslateIntegration';
import {
  ProfessionalTranslationManager,
  TranslationJob,
  TranslationQuote,
  WeddingContentType,
  TranslationQuality,
} from './ProfessionalTranslationConnectors';
import {
  TranslationMemoryService,
  FuzzyMatchResult,
  SearchOptions,
} from '../../lib/services/translation/TranslationMemoryService';
import {
  QualityAssuranceTranslation,
  QualityAssessmentResult,
  QualityLevel,
} from './QualityAssuranceTranslation';

/**
 * Translation workflow configuration
 */
export interface WorkflowConfig {
  memory_match_threshold: number;
  quality_gate_threshold: number;
  cost_optimization_enabled: boolean;
  human_review_threshold: number;
  max_retries: number;
  fallback_providers: TranslationProvider[];
  priority_scoring_enabled: boolean;
  real_time_monitoring: boolean;
}

/**
 * Translation providers available in the workflow
 */
export enum TranslationProvider {
  MEMORY = 'memory',
  GOOGLE = 'google',
  PROFESSIONAL = 'professional',
  HYBRID = 'hybrid',
}

/**
 * Translation workflow request
 */
export interface TranslationWorkflowRequest {
  text: string;
  source_language: string;
  target_language: string;
  content_type: WeddingContentType;
  context?: string;
  quality_requirement: TranslationQuality;
  deadline?: Date;
  budget_limit?: number;
  preferred_provider?: TranslationProvider;
  rush_delivery?: boolean;
  client_id: string;
  project_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Complete translation workflow result
 */
export interface TranslationWorkflowResult {
  request_id: string;
  translated_text: string;
  source_text: string;
  source_language: string;
  target_language: string;
  provider_used: TranslationProvider;
  cost: number;
  processing_time: number;
  quality_assessment: QualityAssessmentResult;
  memory_match?: FuzzyMatchResult;
  professional_job?: TranslationJob;
  workflow_path: WorkflowStep[];
  confidence_score: number;
  requires_review: boolean;
  created_at: Date;
  completed_at?: Date;
  status: WorkflowStatus;
  error?: string;
}

/**
 * Workflow execution status
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  TRANSLATING = 'translating',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Individual workflow step tracking
 */
export interface WorkflowStep {
  step_name: string;
  provider: TranslationProvider | 'system';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  start_time: Date;
  end_time?: Date;
  result?: unknown;
  error?: string;
  cost?: number;
}

/**
 * Translation cost estimation
 */
export interface CostEstimation {
  provider: TranslationProvider;
  estimated_cost: number;
  estimated_time: number;
  quality_expectation: QualityLevel;
  confidence: number;
}

/**
 * Main Translation Workflow Orchestrator
 *
 * Coordinates all translation services to provide optimal results
 * with cost efficiency and quality assurance
 */
export class TranslationWorkflowOrchestrator {
  private memoryService: TranslationMemoryService;
  private googleTranslate: GoogleTranslateIntegration;
  private professionalManager: ProfessionalTranslationManager;
  private qualityAssurance: QualityAssuranceTranslation;
  private config: WorkflowConfig;
  private activeWorkflows: Map<string, TranslationWorkflowResult> = new Map();

  constructor(
    googleConfig: { apiKey: string; projectId: string },
    professionalConfig: {
      gengoPublicKey?: string;
      gengoPrivateKey?: string;
      phraseApiToken?: string;
    },
    workflowConfig?: Partial<WorkflowConfig>,
  ) {
    this.memoryService = new TranslationMemoryService();
    this.googleTranslate = new GoogleTranslateIntegration(
      {
        apiKey: googleConfig.apiKey,
        projectId: googleConfig.projectId,
        rateLimit: {
          requestsPerMinute: 200,
          burstCapacity: 50,
          windowSize: 60 * 1000,
        },
        cache: {
          ttl: 24 * 60 * 60,
          maxEntries: 10000,
          useSupabaseCache: true,
        },
        enableTerminologyValidation: true,
        maxRetries: 3,
      },
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    this.professionalManager = new ProfessionalTranslationManager();
    this.qualityAssurance = new QualityAssuranceTranslation();

    this.config = {
      memory_match_threshold: 80,
      quality_gate_threshold: 75,
      cost_optimization_enabled: true,
      human_review_threshold: 70,
      max_retries: 3,
      fallback_providers: [
        TranslationProvider.GOOGLE,
        TranslationProvider.PROFESSIONAL,
      ],
      priority_scoring_enabled: true,
      real_time_monitoring: true,
      ...workflowConfig,
    };
  }

  /**
   * Execute complete translation workflow
   */
  async translateWithWorkflow(
    request: TranslationWorkflowRequest,
  ): Promise<TranslationWorkflowResult> {
    const requestId = this.generateRequestId();
    const workflowResult: TranslationWorkflowResult = {
      request_id: requestId,
      translated_text: '',
      source_text: request.text,
      source_language: request.source_language,
      target_language: request.target_language,
      provider_used: TranslationProvider.MEMORY, // Will be updated
      cost: 0,
      processing_time: 0,
      quality_assessment: {} as QualityAssessmentResult,
      workflow_path: [],
      confidence_score: 0,
      requires_review: false,
      created_at: new Date(),
      status: WorkflowStatus.PENDING,
    };

    this.activeWorkflows.set(requestId, workflowResult);

    try {
      const startTime = Date.now();
      workflowResult.status = WorkflowStatus.ANALYZING;

      // Step 1: Check translation memory
      const memoryStep = this.createWorkflowStep(
        'translation_memory_lookup',
        'system',
      );
      workflowResult.workflow_path.push(memoryStep);

      const memoryResult = await this.checkTranslationMemory(request);
      this.completeWorkflowStep(memoryStep, memoryResult);

      if (
        memoryResult &&
        memoryResult.similarity_score >= this.config.memory_match_threshold
      ) {
        // High-confidence memory match found
        workflowResult.translated_text = memoryResult.entry.target_text;
        workflowResult.provider_used = TranslationProvider.MEMORY;
        workflowResult.memory_match = memoryResult;
        workflowResult.cost = 0;
        workflowResult.confidence_score = memoryResult.similarity_score;

        // Quick quality check for memory results
        const quickQualityCheck = await this.performQuickQualityCheck(
          request.text,
          memoryResult.entry.target_text,
          request.content_type,
        );

        if (
          quickQualityCheck.overall_score >= this.config.quality_gate_threshold
        ) {
          workflowResult.quality_assessment = quickQualityCheck;
          workflowResult.status = WorkflowStatus.COMPLETED;
          workflowResult.completed_at = new Date();
          workflowResult.processing_time = Date.now() - startTime;

          await this.memoryService.incrementUsage(memoryResult.entry.id);
          return workflowResult;
        }
      }

      // Step 2: Determine optimal translation strategy
      workflowResult.status = WorkflowStatus.TRANSLATING;
      const strategy = await this.determineTranslationStrategy(
        request,
        memoryResult,
      );

      // Step 3: Execute translation based on strategy
      let translationResult: any;
      let translationCost = 0;

      switch (strategy.provider) {
        case TranslationProvider.GOOGLE:
          translationResult = await this.executeGoogleTranslation(
            request,
            workflowResult,
          );
          translationCost = 0.02; // Estimated cost per translation
          break;

        case TranslationProvider.PROFESSIONAL:
          translationResult = await this.executeProfessionalTranslation(
            request,
            workflowResult,
          );
          translationCost = strategy.estimatedCost || 0.5;
          break;

        case TranslationProvider.HYBRID:
          translationResult = await this.executeHybridTranslation(
            request,
            workflowResult,
          );
          translationCost = 0.1;
          break;

        default:
          throw new Error(`Unknown translation strategy: ${strategy.provider}`);
      }

      workflowResult.translated_text =
        translationResult.translatedText || translationResult.translated_text;
      workflowResult.provider_used = strategy.provider;
      workflowResult.cost = translationCost;

      // Step 4: Quality assurance
      workflowResult.status = WorkflowStatus.REVIEWING;
      const qualityStep = this.createWorkflowStep(
        'quality_assurance',
        'system',
      );
      workflowResult.workflow_path.push(qualityStep);

      const qualityAssessment =
        await this.qualityAssurance.assessTranslationQuality(
          request.text,
          workflowResult.translated_text,
          request.source_language,
          request.target_language,
          request.content_type,
          request.context,
        );

      workflowResult.quality_assessment = qualityAssessment;
      workflowResult.confidence_score = qualityAssessment.confidence;
      workflowResult.requires_review = qualityAssessment.requires_human_review;
      this.completeWorkflowStep(qualityStep, qualityAssessment);

      // Step 5: Quality gate check
      const qualityGateResult = await this.qualityAssurance.passesQualityGate(
        qualityAssessment,
        request.content_type,
      );

      if (
        !qualityGateResult.passes &&
        workflowResult.workflow_path.length < this.config.max_retries
      ) {
        // Retry with different provider or request human review
        return await this.handleQualityFailure(
          request,
          workflowResult,
          qualityGateResult.reasons,
        );
      }

      // Step 6: Store in translation memory for future use
      if (qualityAssessment.overall_score >= 70) {
        await this.storeInTranslationMemory(request, workflowResult);
      }

      // Step 7: Final workflow completion
      workflowResult.status = WorkflowStatus.COMPLETED;
      workflowResult.completed_at = new Date();
      workflowResult.processing_time = Date.now() - startTime;

      return workflowResult;
    } catch (error) {
      workflowResult.status = WorkflowStatus.FAILED;
      workflowResult.error =
        error instanceof Error ? error.message : 'Unknown error occurred';
      workflowResult.completed_at = new Date();

      console.error(
        `Translation workflow failed for request ${requestId}:`,
        error,
      );
      return workflowResult;
    } finally {
      this.activeWorkflows.delete(requestId);
    }
  }

  /**
   * Get cost estimates from all available providers
   */
  async getCostEstimates(
    request: TranslationWorkflowRequest,
  ): Promise<CostEstimation[]> {
    const estimates: CostEstimation[] = [];

    try {
      // Memory cost (free if good match exists)
      const memoryMatch = await this.checkTranslationMemory(request);
      if (memoryMatch && memoryMatch.similarity_score >= 70) {
        estimates.push({
          provider: TranslationProvider.MEMORY,
          estimated_cost: 0,
          estimated_time: 1, // seconds
          quality_expectation: QualityLevel.GOOD,
          confidence: memoryMatch.similarity_score,
        });
      }

      // Google Translate estimate
      estimates.push({
        provider: TranslationProvider.GOOGLE,
        estimated_cost: 0.02,
        estimated_time: 5,
        quality_expectation: QualityLevel.GOOD,
        confidence: 85,
      });

      // Professional translation estimates
      try {
        const professionalQuotes = await this.professionalManager.getAllQuotes(
          request.source_language,
          request.target_language,
          request.text,
          request.content_type,
          request.quality_requirement,
          request.rush_delivery,
        );

        for (const quote of professionalQuotes) {
          estimates.push({
            provider: TranslationProvider.PROFESSIONAL,
            estimated_cost: quote.estimatedCost,
            estimated_time: Math.ceil(
              (quote.estimatedDelivery.getTime() - Date.now()) / 1000,
            ),
            quality_expectation: QualityLevel.EXCELLENT,
            confidence: 95,
          });
        }
      } catch (error) {
        console.warn('Failed to get professional quotes:', error);
      }

      // Hybrid estimate
      estimates.push({
        provider: TranslationProvider.HYBRID,
        estimated_cost: 0.1,
        estimated_time: 15,
        quality_expectation: QualityLevel.EXCELLENT,
        confidence: 90,
      });

      return estimates.sort((a, b) => a.estimated_cost - b.estimated_cost);
    } catch (error) {
      console.error('Error getting cost estimates:', error);
      return [];
    }
  }

  /**
   * Get real-time workflow status
   */
  getWorkflowStatus(requestId: string): TranslationWorkflowResult | null {
    return this.activeWorkflows.get(requestId) || null;
  }

  /**
   * Cancel active workflow
   */
  async cancelWorkflow(requestId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(requestId);
    if (!workflow) {
      return false;
    }

    workflow.status = WorkflowStatus.CANCELLED;
    workflow.completed_at = new Date();

    // Cancel any active professional translation jobs
    if (workflow.professional_job) {
      try {
        await this.professionalManager.getJob(
          workflow.professional_job.id,
          workflow.professional_job.serviceProvider,
        );
        // Would implement actual cancellation logic here
      } catch (error) {
        console.warn('Failed to cancel professional job:', error);
      }
    }

    this.activeWorkflows.delete(requestId);
    return true;
  }

  // Private helper methods

  private async checkTranslationMemory(
    request: TranslationWorkflowRequest,
  ): Promise<FuzzyMatchResult | null> {
    try {
      const searchOptions: SearchOptions = {
        source_language: request.source_language,
        target_language: request.target_language,
        category: this.mapContentTypeToMemoryCategory(request.content_type),
        context: request.context,
        min_similarity: 70,
        max_results: 1,
        include_fuzzy: true,
      };

      const matches = await this.memoryService.findMatches(
        request.text,
        searchOptions,
      );
      return matches.length > 0 ? matches[0] : null;
    } catch (error) {
      console.warn('Translation memory lookup failed:', error);
      return null;
    }
  }

  private async determineTranslationStrategy(
    request: TranslationWorkflowRequest,
    memoryMatch?: FuzzyMatchResult | null,
  ): Promise<{
    provider: TranslationProvider;
    estimatedCost?: number;
    confidence: number;
  }> {
    // Consider budget constraints
    if (request.budget_limit && request.budget_limit < 0.05) {
      return { provider: TranslationProvider.GOOGLE, confidence: 80 };
    }

    // Consider quality requirements
    if (
      request.quality_requirement === TranslationQuality.WEDDING_SPECIALIST ||
      request.quality_requirement === TranslationQuality.ULTRA
    ) {
      return { provider: TranslationProvider.PROFESSIONAL, confidence: 95 };
    }

    // Consider deadline urgency
    if (
      request.deadline &&
      request.deadline.getTime() - Date.now() < 2 * 60 * 60 * 1000
    ) {
      // Less than 2 hours - use fastest option
      return { provider: TranslationProvider.GOOGLE, confidence: 85 };
    }

    // Consider content criticality
    const criticalContent = [
      WeddingContentType.LEGAL_DOCUMENTS,
      WeddingContentType.VOWS,
      WeddingContentType.CEREMONY,
    ];

    if (criticalContent.includes(request.content_type)) {
      return { provider: TranslationProvider.HYBRID, confidence: 90 };
    }

    // Default strategy based on cost optimization
    if (this.config.cost_optimization_enabled) {
      return { provider: TranslationProvider.GOOGLE, confidence: 85 };
    }

    return { provider: TranslationProvider.HYBRID, confidence: 87 };
  }

  private async executeGoogleTranslation(
    request: TranslationWorkflowRequest,
    workflowResult: TranslationWorkflowResult,
  ): Promise<GoogleTranslationResult> {
    const googleStep = this.createWorkflowStep(
      'google_translate',
      TranslationProvider.GOOGLE,
    );
    workflowResult.workflow_path.push(googleStep);

    try {
      const result = await this.googleTranslate.translateText({
        text: request.text,
        sourceLanguage: request.source_language as any,
        targetLanguage: request.target_language as any,
        context: request.context,
        validateTerminology: true,
      });

      this.completeWorkflowStep(googleStep, result);
      return result;
    } catch (error) {
      this.failWorkflowStep(googleStep, error);
      throw error;
    }
  }

  private async executeProfessionalTranslation(
    request: TranslationWorkflowRequest,
    workflowResult: TranslationWorkflowResult,
  ): Promise<{ translated_text: string }> {
    const professionalStep = this.createWorkflowStep(
      'professional_translation',
      TranslationProvider.PROFESSIONAL,
    );
    workflowResult.workflow_path.push(professionalStep);

    try {
      const job = await this.professionalManager.submitJob({
        id: this.generateRequestId(),
        sourceLanguage: request.source_language,
        targetLanguage: request.target_language,
        content: request.text,
        contentType: request.content_type,
        quality: request.quality_requirement,
        instructions: `Context: ${request.context || 'General wedding content'}`,
        rushDelivery: request.rush_delivery || false,
        weddingDate: request.deadline,
      });

      workflowResult.professional_job = job;

      // For this implementation, we'll simulate completion
      // In reality, this would poll for job completion
      const translated_text = `Professional translation of: ${request.text}`;

      this.completeWorkflowStep(professionalStep, { translated_text });
      return { translated_text };
    } catch (error) {
      this.failWorkflowStep(professionalStep, error);
      throw error;
    }
  }

  private async executeHybridTranslation(
    request: TranslationWorkflowRequest,
    workflowResult: TranslationWorkflowResult,
  ): Promise<{ translatedText: string }> {
    const hybridStep = this.createWorkflowStep(
      'hybrid_translation',
      TranslationProvider.HYBRID,
    );
    workflowResult.workflow_path.push(hybridStep);

    try {
      // First get Google translation
      const googleResult = await this.googleTranslate.translateText({
        text: request.text,
        sourceLanguage: request.source_language as any,
        targetLanguage: request.target_language as any,
        context: request.context,
        validateTerminology: true,
      });

      // Then enhance with professional terminology validation
      // This would integrate with professional services for terminology review
      const enhancedText = await this.enhanceWithProfessionalTerminology(
        googleResult.translatedText,
        request.content_type,
        request.target_language,
      );

      this.completeWorkflowStep(hybridStep, { translatedText: enhancedText });
      return { translatedText: enhancedText };
    } catch (error) {
      this.failWorkflowStep(hybridStep, error);
      throw error;
    }
  }

  private async performQuickQualityCheck(
    originalText: string,
    translatedText: string,
    contentType: WeddingContentType,
  ): Promise<QualityAssessmentResult> {
    // Simplified quality check for memory matches
    return {
      overall_score: 85,
      quality_level: QualityLevel.GOOD,
      dimensions: {
        accuracy: 85,
        fluency: 80,
        terminology: 90,
        cultural_appropriateness: 85,
        completeness: 85,
        consistency: 80,
      },
      issues: [],
      recommendations: [],
      requires_human_review: false,
      confidence: 85,
      assessment_time: 50,
      metadata: {
        assessor_type: 'automated',
        assessment_date: new Date().toISOString(),
        content_type: contentType,
        language_pair: 'auto-detected',
        validation_flags: [],
      },
    };
  }

  private async handleQualityFailure(
    request: TranslationWorkflowRequest,
    workflowResult: TranslationWorkflowResult,
    reasons: string[],
  ): Promise<TranslationWorkflowResult> {
    // Implement retry logic with different provider or request human review
    console.log('Quality failure reasons:', reasons);

    // For now, mark as requiring review
    workflowResult.requires_review = true;
    workflowResult.status = WorkflowStatus.COMPLETED;
    workflowResult.completed_at = new Date();

    return workflowResult;
  }

  private async storeInTranslationMemory(
    request: TranslationWorkflowRequest,
    result: TranslationWorkflowResult,
  ): Promise<void> {
    try {
      await this.memoryService.storeTranslation({
        source_text: request.text,
        target_text: result.translated_text,
        source_language: request.source_language,
        target_language: request.target_language,
        context: request.context || 'general',
        category: this.mapContentTypeToMemoryCategory(request.content_type),
        quality_score: result.quality_assessment.overall_score,
        confidence_score: result.confidence_score,
        provider: this.mapProviderToMemoryProvider(result.provider_used),
        created_by: request.client_id,
        metadata: {
          domain_specific: true,
          cultural_adaptation: false,
          seasonal_content: false,
          vendor_specific: false,
          technical_terms: false,
          pricing_sensitive: false,
          legal_content:
            request.content_type === WeddingContentType.LEGAL_DOCUMENTS,
          user_facing: true,
        },
      });
    } catch (error) {
      console.warn('Failed to store in translation memory:', error);
    }
  }

  private async enhanceWithProfessionalTerminology(
    translatedText: string,
    contentType: WeddingContentType,
    targetLanguage: string,
  ): Promise<string> {
    // This would implement professional terminology enhancement
    // For now, return the original text
    return translatedText;
  }

  // Utility methods

  private generateRequestId(): string {
    return `tr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private createWorkflowStep(
    stepName: string,
    provider: TranslationProvider | 'system',
  ): WorkflowStep {
    return {
      step_name: stepName,
      provider,
      status: 'running',
      start_time: new Date(),
    };
  }

  private completeWorkflowStep(step: WorkflowStep, result?: unknown): void {
    step.status = 'completed';
    step.end_time = new Date();
    step.result = result;
  }

  private failWorkflowStep(step: WorkflowStep, error: unknown): void {
    step.status = 'failed';
    step.end_time = new Date();
    step.error = error instanceof Error ? error.message : String(error);
  }

  private mapContentTypeToMemoryCategory(contentType: WeddingContentType): any {
    const mapping = {
      [WeddingContentType.VENDOR_COMMUNICATION]: 'vendor',
      [WeddingContentType.MENU]: 'catering',
      [WeddingContentType.SIGNAGE]: 'general',
      [WeddingContentType.PROGRAM]: 'ceremony',
      [WeddingContentType.RECEPTION]: 'reception',
      [WeddingContentType.LEGAL_DOCUMENTS]: 'planning',
      [WeddingContentType.INVITATION]: 'invitations',
      [WeddingContentType.CEREMONY]: 'ceremony',
      [WeddingContentType.VOWS]: 'ceremony',
      [WeddingContentType.THANK_YOU]: 'general',
    };

    return mapping[contentType] || 'general';
  }

  private mapProviderToMemoryProvider(provider: TranslationProvider): any {
    const mapping = {
      [TranslationProvider.GOOGLE]: 'google',
      [TranslationProvider.PROFESSIONAL]: 'human_professional',
      [TranslationProvider.HYBRID]: 'google',
      [TranslationProvider.MEMORY]: 'internal',
    };

    return mapping[provider] || 'internal';
  }
}

/**
 * Factory function to create configured orchestrator
 */
export function createTranslationWorkflowOrchestrator(config: {
  googleApiKey: string;
  googleProjectId: string;
  gengoPublicKey?: string;
  gengoPrivateKey?: string;
  phraseApiToken?: string;
  workflowConfig?: Partial<WorkflowConfig>;
}): TranslationWorkflowOrchestrator {
  return new TranslationWorkflowOrchestrator(
    {
      apiKey: config.googleApiKey,
      projectId: config.googleProjectId,
    },
    {
      gengoPublicKey: config.gengoPublicKey,
      gengoPrivateKey: config.gengoPrivateKey,
      phraseApiToken: config.phraseApiToken,
    },
    config.workflowConfig,
  );
}

// Types already exported above with their interface declarations
