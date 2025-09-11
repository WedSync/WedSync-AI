/**
 * WS-242: AI PDF Analysis System - Main Service Integration
 * Team D: AI/ML Engineering & Optimization
 *
 * Main service that orchestrates all AI PDF analysis components
 * Integrates field extraction, cost optimization, and continuous learning
 */

import {
  AnalysisRequest,
  ProcessingResult,
  ProcessingOptions,
  UserCorrection,
  UserFeedback,
  LearningUpdate,
  PerformanceMetrics,
  ExtractedField,
  ProcessingStatus,
  AIProcessingError,
} from './types';

import { WeddingFormFieldExtractor } from './wedding-field-extractor';
import { IntelligentFieldTypeDetector } from './intelligent-field-type-detector';
import { ContinuousLearningEngine } from './continuous-learning-engine';
import { CostOptimizedAIProcessor } from './cost-optimized-ai-processor';

export class AIPDFAnalysisService {
  private fieldExtractor: WeddingFormFieldExtractor;
  private fieldTypeDetector: IntelligentFieldTypeDetector;
  private learningEngine: ContinuousLearningEngine;
  private costOptimizedProcessor: CostOptimizedAIProcessor;
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      console.log('Initializing AI PDF Analysis Service...');

      this.fieldExtractor = new WeddingFormFieldExtractor();
      this.fieldTypeDetector = new IntelligentFieldTypeDetector();
      this.learningEngine = new ContinuousLearningEngine();
      this.costOptimizedProcessor = new CostOptimizedAIProcessor();

      this.isInitialized = true;
      console.log('AI PDF Analysis Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI PDF Analysis Service:', error);
      throw new AIProcessingError({
        error_id: `service-init-${Date.now()}`,
        error_type: 'model_error',
        message: 'Failed to initialize AI PDF Analysis Service',
        timestamp: new Date(),
        recovery_suggestions: [
          'Check all component dependencies',
          'Verify AI model availability',
          'Restart the service',
        ],
      });
    }
  }

  /**
   * Analyze PDF with full AI processing pipeline
   * Main entry point for wedding PDF field extraction
   */
  async analyzePDF(request: AnalysisRequest): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      await this.initializeService();
    }

    try {
      console.log(`Starting AI PDF analysis for: ${request.pdf_id}`);
      console.log(
        `Processing ${request.pages.length} pages for user: ${request.user_id} (${request.user_tier})`,
      );

      // Validate request
      this.validateAnalysisRequest(request);

      // Process with cost optimization
      const result =
        await this.costOptimizedProcessor.processWithCostOptimization(request);

      // Enhance field types with intelligent detection
      const enhancedFields = await this.enhanceFieldTypes(
        result.extracted_fields,
        request.pages[0]?.image_data,
      );

      // Update result with enhanced fields
      result.extracted_fields = enhancedFields;

      // Log successful analysis
      console.log(
        `AI PDF analysis completed successfully for ${request.pdf_id}`,
      );
      console.log(
        `Extracted ${result.extracted_fields.length} fields with average confidence: ${this.calculateAverageConfidence(result.extracted_fields)}`,
      );
      console.log(
        `Processing time: ${result.processing_time}ms, Cost: £${result.cost_incurred}`,
      );

      return result;
    } catch (error) {
      console.error(`AI PDF analysis failed for ${request.pdf_id}:`, error);
      throw new AIProcessingError({
        error_id: `analyze-${request.pdf_id}-${Date.now()}`,
        error_type: 'processing_error',
        message: `PDF analysis failed: ${error.message}`,
        timestamp: new Date(),
        recovery_suggestions: [
          'Try with reduced accuracy settings',
          'Process pages individually',
          'Contact support if problem persists',
        ],
      });
    }
  }

  /**
   * Process user corrections to improve model accuracy
   * Implements continuous learning from wedding supplier feedback
   */
  async processCorrections(
    corrections: UserCorrection[],
  ): Promise<LearningUpdate> {
    console.log(
      `Processing ${corrections.length} user corrections for model improvement...`,
    );

    try {
      const learningUpdate =
        await this.learningEngine.processUserCorrections(corrections);

      console.log(`Corrections processed successfully:`);
      console.log(
        `- ${learningUpdate.corrections_processed} corrections processed`,
      );
      console.log(
        `- ${learningUpdate.model_updates_applied} model updates applied`,
      );
      console.log(
        `- Accuracy improvement: ${learningUpdate.performance_improvement.accuracy_score}`,
      );

      return learningUpdate;
    } catch (error) {
      console.error('Failed to process user corrections:', error);
      throw new AIProcessingError({
        error_id: `corrections-${Date.now()}`,
        error_type: 'processing_error',
        message: `Failed to process corrections: ${error.message}`,
        timestamp: new Date(),
        recovery_suggestions: [
          'Process corrections in smaller batches',
          'Verify correction data quality',
          'Try again later',
        ],
      });
    }
  }

  /**
   * Submit user feedback for continuous improvement
   */
  async submitFeedback(
    feedback: UserFeedback[],
  ): Promise<{ success: boolean; feedback_id: string }> {
    console.log(`Processing ${feedback.length} feedback items...`);

    try {
      // Generate training data from feedback
      const trainingDataset =
        await this.learningEngine.generateTrainingDataFromFeedback(feedback);

      // Store feedback for future model training
      const feedbackId = await this.storeFeedbackForTraining(
        feedback,
        trainingDataset,
      );

      console.log(`Feedback processed successfully: ${feedbackId}`);
      console.log(
        `Generated ${trainingDataset.examples.length} training examples with quality score: ${trainingDataset.quality_score}`,
      );

      return {
        success: true,
        feedback_id: feedbackId,
      };
    } catch (error) {
      console.error('Failed to process feedback:', error);
      throw new AIProcessingError({
        error_id: `feedback-${Date.now()}`,
        error_type: 'processing_error',
        message: `Failed to process feedback: ${error.message}`,
        timestamp: new Date(),
        recovery_suggestions: [
          'Verify feedback format',
          'Check feedback data completeness',
          'Submit feedback again',
        ],
      });
    }
  }

  /**
   * Get processing status for long-running analyses
   */
  async getProcessingStatus(requestId: string): Promise<ProcessingStatus> {
    // Simulate status checking
    return {
      request_id: requestId,
      status: 'completed',
      progress_percentage: 100,
      estimated_completion: new Date(),
      current_stage: 'Validation complete',
      errors: [],
    };
  }

  /**
   * Optimize models for wedding season
   */
  async optimizeForWeddingSeason(): Promise<{
    success: boolean;
    optimizations_applied: number;
  }> {
    console.log('Optimizing AI models for wedding season...');

    try {
      const optimizationResult =
        await this.learningEngine.optimizeModelForWeddingseason();

      console.log(`Wedding season optimization completed:`);
      console.log(
        `- ${optimizationResult.optimizations_applied} optimizations applied`,
      );
      console.log(
        `- Performance improvement: ${optimizationResult.performance_improvement.accuracy_score}`,
      );
      console.log(`- Cost reduction: ${optimizationResult.cost_reduction}`);

      return {
        success: true,
        optimizations_applied: optimizationResult.optimizations_applied,
      };
    } catch (error) {
      console.error('Wedding season optimization failed:', error);
      throw new AIProcessingError({
        error_id: `wedding-season-${Date.now()}`,
        error_type: 'processing_error',
        message: `Wedding season optimization failed: ${error.message}`,
        timestamp: new Date(),
        recovery_suggestions: [
          'Try optimizing individual components',
          'Check model availability',
          'Contact technical support',
        ],
      });
    }
  }

  /**
   * Get current model performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    console.log('Retrieving current model performance metrics...');

    // Simulate performance metrics retrieval
    return {
      accuracy_score: 0.92,
      processing_speed: 25.5, // seconds average
      cost_efficiency: 0.85, // efficiency score
      user_satisfaction: 0.95,
      model_confidence: 0.9,
      field_type_accuracy: {
        wedding_date: 0.95,
        guest_count: 0.92,
        venue_name: 0.9,
        total_budget: 0.88,
        couple_names: 0.93,
        contact_info: 0.91,
        photography_package: 0.87,
        catering_menu: 0.85,
        general_field: 0.82,
      },
      category_accuracy: {
        wedding_details: 0.93,
        guest_management: 0.9,
        vendor_services: 0.88,
        timeline_planning: 0.89,
        budget_financial: 0.91,
        legal_contractual: 0.87,
        personal_information: 0.94,
        preferences_styling: 0.85,
        logistics: 0.88,
      },
    };
  }

  // Private helper methods

  private validateAnalysisRequest(request: AnalysisRequest): void {
    if (!request.pdf_id) {
      throw new Error('PDF ID is required');
    }
    if (!request.user_id) {
      throw new Error('User ID is required');
    }
    if (!request.pages || request.pages.length === 0) {
      throw new Error('At least one page is required');
    }
    if (request.pages.length > 50) {
      throw new Error('Maximum 50 pages allowed per analysis');
    }

    for (const page of request.pages) {
      if (!page.image_data) {
        throw new Error(`Image data required for page ${page.page_number}`);
      }
      if (!page.image_format) {
        throw new Error(`Image format required for page ${page.page_number}`);
      }
    }
  }

  private async enhanceFieldTypes(
    fields: ExtractedField[],
    sampleImageData: string,
  ): Promise<ExtractedField[]> {
    console.log(
      `Enhancing field type detection for ${fields.length} fields...`,
    );

    const enhancedFields: ExtractedField[] = [];

    for (const field of fields) {
      try {
        // Use intelligent field type detector for enhanced analysis
        const classifiedField = {
          id: field.id,
          label_text: field.label_text,
          field_position: field.field_position,
          wedding_category: field.wedding_category,
          wedding_field_type: field.field_type,
          confidence: field.confidence,
          raw_features: {},
        };

        const enhancedTypeResult = await this.fieldTypeDetector.detectFieldType(
          classifiedField,
          sampleImageData,
        );

        // Update field with enhanced detection results
        const enhancedField: ExtractedField = {
          ...field,
          field_type: enhancedTypeResult.field_type,
          confidence: Math.max(field.confidence, enhancedTypeResult.confidence),
          visual_features: enhancedTypeResult.visual_analysis,
          validation_rules:
            enhancedTypeResult.wedding_validation.validation_rules,
          suggestions: [
            ...(field.suggestions || []),
            `Enhanced detection confidence: ${Math.round(enhancedTypeResult.confidence * 100)}%`,
            `Visual analysis: ${this.summarizeVisualFeatures(enhancedTypeResult.visual_analysis)}`,
          ],
        };

        enhancedFields.push(enhancedField);
      } catch (error) {
        console.warn(
          `Failed to enhance field type for "${field.label_text}":`,
          error,
        );
        // Keep original field if enhancement fails
        enhancedFields.push(field);
      }
    }

    console.log(
      `Field type enhancement completed for ${enhancedFields.length} fields`,
    );
    return enhancedFields;
  }

  private summarizeVisualFeatures(features: any): string {
    const detectedFeatures = [];

    if (features.has_checkbox) detectedFeatures.push('checkbox');
    if (features.has_text_input) detectedFeatures.push('text input');
    if (features.has_dropdown) detectedFeatures.push('dropdown');
    if (features.has_date_picker) detectedFeatures.push('date picker');
    if (features.has_signature_line) detectedFeatures.push('signature line');

    return detectedFeatures.length > 0
      ? detectedFeatures.join(', ')
      : 'standard field';
  }

  private calculateAverageConfidence(fields: ExtractedField[]): number {
    if (fields.length === 0) return 0;
    const sum = fields.reduce((acc, field) => acc + field.confidence, 0);
    return Math.round((sum / fields.length) * 100) / 100;
  }

  private async storeFeedbackForTraining(
    feedback: UserFeedback[],
    trainingDataset: any,
  ): Promise<string> {
    // Generate unique feedback ID
    const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would store to database
    console.log(`Storing feedback for future training: ${feedbackId}`);
    console.log(`Training dataset quality: ${trainingDataset.quality_score}`);
    console.log(`Wedding category coverage:`, trainingDataset.wedding_coverage);

    return feedbackId;
  }

  /**
   * Health check for the AI service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    performance: PerformanceMetrics;
  }> {
    console.log('Performing AI service health check...');

    const components = {
      field_extractor: this.fieldExtractor ? true : false,
      field_type_detector: this.fieldTypeDetector ? true : false,
      learning_engine: this.learningEngine ? true : false,
      cost_optimizer: this.costOptimizedProcessor ? true : false,
    };

    const healthyComponents = Object.values(components).filter(Boolean).length;
    const totalComponents = Object.keys(components).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (healthyComponents === 0) {
      status = 'unhealthy';
    } else if (healthyComponents < totalComponents) {
      status = 'degraded';
    }

    const performance = await this.getPerformanceMetrics();

    console.log(
      `Health check completed: ${status} (${healthyComponents}/${totalComponents} components healthy)`,
    );

    return {
      status,
      components,
      performance,
    };
  }

  /**
   * Process wedding day usage data for real-time learning
   */
  async processWeddingDayUsage(usageData: any[]): Promise<LearningUpdate> {
    console.log(
      `Processing wedding day usage data: ${usageData.length} sessions`,
    );

    try {
      const learningUpdate =
        await this.learningEngine.learnFromWeddingDayUsage(usageData);

      console.log(`Wedding day learning update completed:`);
      console.log(
        `- ${learningUpdate.corrections_processed} usage sessions processed`,
      );
      console.log(
        `- ${learningUpdate.model_updates_applied} real-time updates applied`,
      );

      return learningUpdate;
    } catch (error) {
      console.error('Failed to process wedding day usage:', error);
      throw new AIProcessingError({
        error_id: `wedding-usage-${Date.now()}`,
        error_type: 'processing_error',
        message: `Failed to process wedding day usage: ${error.message}`,
        timestamp: new Date(),
        recovery_suggestions: [
          'Verify usage data format',
          'Process in smaller batches',
          'Check learning engine status',
        ],
      });
    }
  }
}

// Export singleton instance
export const aiPDFAnalysisService = new AIPDFAnalysisService();
