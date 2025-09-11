/**
 * PDF Mapping Integration Service
 * WS-123 Integration Layer: Connects PDF Analysis → Field Extraction → Smart Mapping
 * Provides seamless workflow from document upload to structured form creation
 */

import { FieldExtractionService } from './field-extraction-service';
import { SmartMappingService } from './smart-mapping-service';
import { createClient } from '@supabase/supabase-js';
import { ExtractedField, ExtractionRequest } from '@/types/field-extraction';

export interface PDFMappingWorkflow {
  documentId: string;
  extractionResults?: {
    fields: ExtractedField[];
    accuracy: number;
    processingTime: number;
  };
  mappingResults?: {
    mappings: any[];
    accuracy: number;
    processingTime: number;
  };
  formResults?: {
    formId: string;
    clientId?: string;
    processingTime: number;
  };
  status:
    | 'pending'
    | 'extracting'
    | 'mapping'
    | 'creating_form'
    | 'completed'
    | 'failed';
  error?: string;
  totalProcessingTime: number;
  createdAt: string;
  completedAt?: string;
}

export interface WorkflowOptions {
  enableOCR?: boolean;
  confidenceThreshold?: number;
  enableLearning?: boolean;
  createRecord?: boolean;
  autoApplyBestTemplate?: boolean;
  preserveRawData?: boolean;
}

export class PDFMappingIntegrationService {
  private fieldExtractionService: FieldExtractionService;
  private smartMappingService: SmartMappingService;
  private supabase: any;

  constructor() {
    this.fieldExtractionService = new FieldExtractionService();
    this.smartMappingService = new SmartMappingService();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  /**
   * Execute complete PDF to form workflow
   */
  async processDocumentToForm(
    documentId: string,
    userId: string,
    options: WorkflowOptions = {},
  ): Promise<PDFMappingWorkflow> {
    const workflow: PDFMappingWorkflow = {
      documentId,
      status: 'pending',
      totalProcessingTime: 0,
      createdAt: new Date().toISOString(),
    };

    const startTime = Date.now();

    try {
      // Save initial workflow state
      await this.saveWorkflowState(workflow, userId);

      // Step 1: Extract fields from PDF
      workflow.status = 'extracting';
      await this.updateWorkflowStatus(workflow.documentId, 'extracting');

      const extractionRequest: ExtractionRequest = {
        documentId,
        options: {
          ocr: options.enableOCR,
          enhanceImage: true,
          fuzzyMatching: true,
          strictMode: false,
        },
      };

      const extractionResult =
        await this.fieldExtractionService.extractFields(extractionRequest);

      if (!extractionResult.success || !extractionResult.document) {
        workflow.status = 'failed';
        workflow.error = 'Field extraction failed';
        return workflow;
      }

      workflow.extractionResults = {
        fields: extractionResult.document.fields,
        accuracy: extractionResult.document.averageConfidence,
        processingTime: extractionResult.processingTime,
      };

      // Step 2: Apply smart mapping to extracted fields
      workflow.status = 'mapping';
      await this.updateWorkflowStatus(workflow.documentId, 'mapping');

      const mappingRequest = {
        documentId,
        extractedFields: extractionResult.document.fields,
        options: {
          confidenceThreshold: options.confidenceThreshold || 0.7,
          enableSemanticMatching: true,
          enableLearningMode: options.enableLearning !== false,
          includeContextAnalysis: true,
          prioritizeAccuracy: true,
          autoApplyBestTemplate: options.autoApplyBestTemplate,
        },
      };

      const mappingResult =
        await this.smartMappingService.analyzeFieldMappings(mappingRequest);

      if (!mappingResult.success) {
        workflow.status = 'failed';
        workflow.error = 'Smart mapping failed';
        return workflow;
      }

      workflow.mappingResults = {
        mappings: mappingResult.mappings,
        accuracy: mappingResult.accuracy,
        processingTime:
          Date.now() - startTime - workflow.extractionResults.processingTime,
      };

      // Step 3: Auto-apply high-confidence mappings and create structured data
      workflow.status = 'creating_form';
      await this.updateWorkflowStatus(workflow.documentId, 'creating_form');

      const highConfidenceMappings = mappingResult.mappings.filter(
        (m) => m.confidence >= 0.85,
      );

      if (highConfidenceMappings.length > 0) {
        const applyRequest = {
          documentId,
          mappings: highConfidenceMappings.map((m) => ({
            sourceFieldId: m.sourceFieldId,
            targetFieldId: m.targetFieldId,
            confidence: m.confidence,
            confirmed: true,
          })),
          options: {
            createRecord: options.createRecord !== false,
            validateData: true,
            generateForm: true,
            preserveRawData: options.preserveRawData,
          },
        };

        const applyResult =
          await this.smartMappingService.applyMappings(applyRequest);

        if (applyResult.success) {
          workflow.formResults = {
            formId: applyResult.formId,
            clientId: applyResult.clientId,
            processingTime:
              Date.now() -
              startTime -
              workflow.extractionResults.processingTime -
              workflow.mappingResults.processingTime,
          };
        }
      }

      // Mark workflow as completed
      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();
      workflow.totalProcessingTime = Date.now() - startTime;

      // Update final workflow state
      await this.updateWorkflowState(workflow);

      // Log completion metrics
      console.log(
        `PDF mapping workflow completed for document ${documentId}:`,
        {
          extractionAccuracy: workflow.extractionResults?.accuracy,
          mappingAccuracy: workflow.mappingResults?.accuracy,
          totalFields: workflow.extractionResults?.fields.length,
          highConfidenceMappings: highConfidenceMappings.length,
          totalProcessingTime: workflow.totalProcessingTime,
        },
      );

      return workflow;
    } catch (error: any) {
      console.error('PDF mapping workflow error:', error);

      workflow.status = 'failed';
      workflow.error = error.message || 'Unknown workflow error';
      workflow.totalProcessingTime = Date.now() - startTime;

      await this.updateWorkflowState(workflow);
      return workflow;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(
    documentId: string,
  ): Promise<PDFMappingWorkflow | null> {
    try {
      const { data, error } = await this.supabase
        .from('pdf_mapping_workflows')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        documentId: data.document_id,
        extractionResults: data.extraction_results,
        mappingResults: data.mapping_results,
        formResults: data.form_results,
        status: data.status,
        error: data.error,
        totalProcessingTime: data.total_processing_time,
        createdAt: data.created_at,
        completedAt: data.completed_at,
      };
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return null;
    }
  }

  /**
   * Resume workflow from specific step
   */
  async resumeWorkflow(
    documentId: string,
    fromStep: 'extraction' | 'mapping' | 'form_creation',
    userId: string,
    options: WorkflowOptions = {},
  ): Promise<PDFMappingWorkflow> {
    const existingWorkflow = await this.getWorkflowStatus(documentId);

    if (!existingWorkflow) {
      // Start fresh workflow
      return this.processDocumentToForm(documentId, userId, options);
    }

    switch (fromStep) {
      case 'extraction':
        return this.processDocumentToForm(documentId, userId, options);

      case 'mapping':
        if (!existingWorkflow.extractionResults) {
          throw new Error(
            'No extraction results found. Must start from extraction step.',
          );
        }
        return this.continueFromMapping(existingWorkflow, userId, options);

      case 'form_creation':
        if (!existingWorkflow.mappingResults) {
          throw new Error(
            'No mapping results found. Must start from mapping step.',
          );
        }
        return this.continueFromFormCreation(existingWorkflow, userId, options);

      default:
        throw new Error('Invalid resume step');
    }
  }

  /**
   * Continue workflow from mapping step
   */
  private async continueFromMapping(
    workflow: PDFMappingWorkflow,
    userId: string,
    options: WorkflowOptions,
  ): Promise<PDFMappingWorkflow> {
    const startTime = Date.now();

    try {
      workflow.status = 'mapping';
      await this.updateWorkflowStatus(workflow.documentId, 'mapping');

      const mappingRequest = {
        documentId: workflow.documentId,
        extractedFields: workflow.extractionResults!.fields,
        options: {
          confidenceThreshold: options.confidenceThreshold || 0.7,
          enableSemanticMatching: true,
          enableLearningMode: options.enableLearning !== false,
          includeContextAnalysis: true,
          prioritizeAccuracy: true,
          autoApplyBestTemplate: options.autoApplyBestTemplate,
        },
      };

      const mappingResult =
        await this.smartMappingService.analyzeFieldMappings(mappingRequest);

      if (!mappingResult.success) {
        workflow.status = 'failed';
        workflow.error = 'Smart mapping failed during resume';
        return workflow;
      }

      workflow.mappingResults = {
        mappings: mappingResult.mappings,
        accuracy: mappingResult.accuracy,
        processingTime: Date.now() - startTime,
      };

      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();
      workflow.totalProcessingTime =
        (workflow.extractionResults?.processingTime || 0) +
        workflow.mappingResults.processingTime;

      await this.updateWorkflowState(workflow);
      return workflow;
    } catch (error: any) {
      workflow.status = 'failed';
      workflow.error = error.message;
      await this.updateWorkflowState(workflow);
      return workflow;
    }
  }

  /**
   * Continue workflow from form creation step
   */
  private async continueFromFormCreation(
    workflow: PDFMappingWorkflow,
    userId: string,
    options: WorkflowOptions,
  ): Promise<PDFMappingWorkflow> {
    const startTime = Date.now();

    try {
      workflow.status = 'creating_form';
      await this.updateWorkflowStatus(workflow.documentId, 'creating_form');

      const highConfidenceMappings = workflow.mappingResults!.mappings.filter(
        (m) => m.confidence >= 0.85,
      );

      if (highConfidenceMappings.length > 0) {
        const applyRequest = {
          documentId: workflow.documentId,
          mappings: highConfidenceMappings.map((m) => ({
            sourceFieldId: m.sourceFieldId,
            targetFieldId: m.targetFieldId,
            confidence: m.confidence,
            confirmed: true,
          })),
          options: {
            createRecord: options.createRecord !== false,
            validateData: true,
            generateForm: true,
            preserveRawData: options.preserveRawData,
          },
        };

        const applyResult =
          await this.smartMappingService.applyMappings(applyRequest);

        if (applyResult.success) {
          workflow.formResults = {
            formId: applyResult.formId,
            clientId: applyResult.clientId,
            processingTime: Date.now() - startTime,
          };
        }
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();
      workflow.totalProcessingTime =
        (workflow.extractionResults?.processingTime || 0) +
        (workflow.mappingResults?.processingTime || 0) +
        (workflow.formResults?.processingTime || 0);

      await this.updateWorkflowState(workflow);
      return workflow;
    } catch (error: any) {
      workflow.status = 'failed';
      workflow.error = error.message;
      await this.updateWorkflowState(workflow);
      return workflow;
    }
  }

  /**
   * Get best matching template for extracted fields
   */
  async getBestMatchingTemplate(
    extractedFields: ExtractedField[],
    targetSchema: string = 'wedding_default',
  ): Promise<any | null> {
    try {
      // Get available templates
      const templates = await this.smartMappingService.getMappingTemplates({
        targetSchema,
        isPublic: true,
      });

      if (templates.length === 0) {
        return null;
      }

      // Score templates based on field similarity
      const templateScores = templates.map((template) => {
        const score = this.calculateTemplateMatchScore(
          extractedFields,
          template,
        );
        return { template, score };
      });

      // Sort by score and return best match
      templateScores.sort((a, b) => b.score - a.score);

      if (templateScores[0].score > 0.6) {
        return templateScores[0].template;
      }

      return null;
    } catch (error) {
      console.error('Failed to find best matching template:', error);
      return null;
    }
  }

  /**
   * Calculate template match score based on field similarity
   */
  private calculateTemplateMatchScore(
    extractedFields: ExtractedField[],
    template: any,
  ): number {
    const templateFieldNames = template.mappings.map((m: any) =>
      m.sourceFieldId.toLowerCase(),
    );

    const extractedFieldNames = extractedFields.map((f) =>
      f.name.toLowerCase(),
    );

    let matchScore = 0;
    let totalPossibleMatches = 0;

    // Calculate Jaccard similarity
    for (const templateField of templateFieldNames) {
      totalPossibleMatches++;

      // Check for exact matches
      if (extractedFieldNames.includes(templateField)) {
        matchScore += 1.0;
        continue;
      }

      // Check for partial matches
      const partialMatch = extractedFieldNames.find(
        (extracted) =>
          extracted.includes(templateField) ||
          templateField.includes(extracted),
      );

      if (partialMatch) {
        matchScore += 0.7;
        continue;
      }

      // Check for semantic similarity (simplified)
      const semanticMatch = extractedFieldNames.find(
        (extracted) =>
          this.calculateSemanticSimilarity(extracted, templateField) > 0.8,
      );

      if (semanticMatch) {
        matchScore += 0.5;
      }
    }

    return totalPossibleMatches > 0 ? matchScore / totalPossibleMatches : 0;
  }

  /**
   * Calculate semantic similarity between field names
   */
  private calculateSemanticSimilarity(field1: string, field2: string): number {
    // Jaro-Winkler similarity (simplified implementation)
    const s1 = field1.toLowerCase();
    const s2 = field2.toLowerCase();

    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro =
      (matches / len1 +
        matches / len2 +
        (matches - transpositions / 2) / matches) /
      3;

    // Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + 0.1 * prefix * (1 - jaro);
  }

  /**
   * Create client record from mapped data
   */
  async createClientFromMapping(
    documentId: string,
    mappings: any[],
    userId: string,
  ): Promise<{ clientId: string; accuracy: number }> {
    try {
      // Extract mapped values
      const mappedData: Record<string, any> = {};
      let totalConfidence = 0;

      for (const mapping of mappings) {
        if (mapping.confirmed) {
          const extractedField = await this.getExtractedFieldValue(
            documentId,
            mapping.sourceFieldId,
          );

          if (extractedField) {
            mappedData[mapping.targetFieldId] = extractedField.value;
            totalConfidence += mapping.confidence;
          }
        }
      }

      const accuracy =
        mappings.length > 0 ? totalConfidence / mappings.length : 0;

      // Create client record
      const clientData = {
        id: this.generateId(),
        organization_id: userId, // Assuming user org mapping
        bride_name: mappedData.bride_name,
        groom_name: mappedData.groom_name,
        wedding_date: mappedData.wedding_date,
        venue_name: mappedData.venue_name,
        venue_address: mappedData.venue_address,
        primary_email: mappedData.primary_email,
        primary_phone: mappedData.primary_phone,
        guest_count: mappedData.guest_count,
        budget: mappedData.budget,
        ceremony_time: mappedData.ceremony_time,
        status: 'active',
        source_document_id: documentId,
        extraction_accuracy: accuracy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdClient, error } = await this.supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create client: ${error.message}`);
      }

      // Create activity log
      await this.createActivityLog(
        createdClient.id,
        'client_created_from_pdf',
        {
          documentId,
          accuracy,
          mappingsCount: mappings.length,
        },
      );

      return {
        clientId: createdClient.id,
        accuracy,
      };
    } catch (error: any) {
      console.error('Failed to create client from mapping:', error);
      throw error;
    }
  }

  /**
   * Get extracted field value
   */
  private async getExtractedFieldValue(
    documentId: string,
    fieldId: string,
  ): Promise<ExtractedField | null> {
    try {
      const { data, error } = await this.supabase
        .from('extracted_fields')
        .select('*')
        .eq('document_id', documentId)
        .eq('field_id', fieldId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get extracted field value:', error);
      return null;
    }
  }

  /**
   * Validate workflow completion
   */
  async validateWorkflowCompletion(documentId: string): Promise<{
    isComplete: boolean;
    requiredFieldsMapped: number;
    totalRequiredFields: number;
    accuracy: number;
    issues: string[];
  }> {
    try {
      const workflow = await this.getWorkflowStatus(documentId);

      if (!workflow || !workflow.mappingResults) {
        return {
          isComplete: false,
          requiredFieldsMapped: 0,
          totalRequiredFields: 0,
          accuracy: 0,
          issues: ['Workflow not found or incomplete'],
        };
      }

      // Define required wedding fields
      const requiredFields = [
        'bride_name',
        'groom_name',
        'primary_email',
        'primary_phone',
        'wedding_date',
      ];

      const mappedRequiredFields = workflow.mappingResults.mappings.filter(
        (m) => requiredFields.includes(m.targetFieldId) && m.confidence >= 0.7,
      );

      const issues: string[] = [];

      // Check for missing required fields
      const missingFields = requiredFields.filter(
        (field) => !mappedRequiredFields.some((m) => m.targetFieldId === field),
      );

      if (missingFields.length > 0) {
        issues.push(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Check accuracy threshold
      if (workflow.mappingResults.accuracy < 0.85) {
        issues.push(
          `Accuracy below threshold: ${Math.round(workflow.mappingResults.accuracy * 100)}% < 85%`,
        );
      }

      return {
        isComplete: issues.length === 0,
        requiredFieldsMapped: mappedRequiredFields.length,
        totalRequiredFields: requiredFields.length,
        accuracy: workflow.mappingResults.accuracy,
        issues,
      };
    } catch (error: any) {
      console.error('Failed to validate workflow completion:', error);
      return {
        isComplete: false,
        requiredFieldsMapped: 0,
        totalRequiredFields: 0,
        accuracy: 0,
        issues: [error.message || 'Validation failed'],
      };
    }
  }

  /**
   * Export workflow results
   */
  async exportWorkflowResults(
    documentId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const workflow = await this.getWorkflowStatus(documentId);

      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }

      switch (format) {
        case 'json':
          return { success: true, data: JSON.stringify(workflow, null, 2) };

        case 'csv':
          if (!workflow.mappingResults) {
            return { success: false, error: 'No mapping results to export' };
          }

          const csvData = this.convertMappingsToCSV(
            workflow.mappingResults.mappings,
          );
          return { success: true, data: csvData };

        case 'pdf':
          // Would implement PDF generation in production
          return { success: true, data: 'PDF export not implemented' };

        default:
          return { success: false, error: 'Unsupported export format' };
      }
    } catch (error: any) {
      console.error('Failed to export workflow results:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert mappings to CSV format
   */
  private convertMappingsToCSV(mappings: any[]): string {
    const headers = [
      'Source Field',
      'Target Field',
      'Confidence',
      'Type',
      'Reasoning',
    ];
    let csv = headers.join(',') + '\n';

    mappings.forEach((mapping) => {
      const row = [
        `"${mapping.sourceFieldId}"`,
        `"${mapping.targetFieldId}"`,
        mapping.confidence,
        mapping.mappingType,
        `"${mapping.reasoning}"`,
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Save workflow state to database
   */
  private async saveWorkflowState(
    workflow: PDFMappingWorkflow,
    userId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('pdf_mapping_workflows').insert({
        document_id: workflow.documentId,
        user_id: userId,
        status: workflow.status,
        extraction_results: workflow.extractionResults,
        mapping_results: workflow.mappingResults,
        form_results: workflow.formResults,
        error: workflow.error,
        total_processing_time: workflow.totalProcessingTime,
        created_at: workflow.createdAt,
        completed_at: workflow.completedAt,
      });
    } catch (error) {
      console.error('Failed to save workflow state:', error);
    }
  }

  /**
   * Update workflow state
   */
  private async updateWorkflowState(
    workflow: PDFMappingWorkflow,
  ): Promise<void> {
    try {
      await this.supabase
        .from('pdf_mapping_workflows')
        .update({
          status: workflow.status,
          extraction_results: workflow.extractionResults,
          mapping_results: workflow.mappingResults,
          form_results: workflow.formResults,
          error: workflow.error,
          total_processing_time: workflow.totalProcessingTime,
          completed_at: workflow.completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('document_id', workflow.documentId);
    } catch (error) {
      console.error('Failed to update workflow state:', error);
    }
  }

  /**
   * Update workflow status only
   */
  private async updateWorkflowStatus(
    documentId: string,
    status: PDFMappingWorkflow['status'],
  ): Promise<void> {
    try {
      await this.supabase
        .from('pdf_mapping_workflows')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('document_id', documentId);
    } catch (error) {
      console.error('Failed to update workflow status:', error);
    }
  }

  /**
   * Create activity log entry
   */
  private async createActivityLog(
    clientId: string,
    activityType: string,
    metadata: any,
  ): Promise<void> {
    try {
      await this.supabase.from('client_activities').insert({
        client_id: clientId,
        activity_type: activityType,
        description: `Client created from PDF document via smart mapping`,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create activity log:', error);
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(
    userId: string,
    timeRange: 'day' | 'week' | 'month' = 'week',
  ): Promise<{
    totalWorkflows: number;
    successfulWorkflows: number;
    averageAccuracy: number;
    averageProcessingTime: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    accuracyTrend: Array<{ date: string; accuracy: number }>;
  }> {
    try {
      let dateFilter = '';
      switch (timeRange) {
        case 'day':
          dateFilter = "created_at >= NOW() - INTERVAL '1 day'";
          break;
        case 'week':
          dateFilter = "created_at >= NOW() - INTERVAL '1 week'";
          break;
        case 'month':
          dateFilter = "created_at >= NOW() - INTERVAL '1 month'";
          break;
      }

      const { data: workflows, error } = await this.supabase
        .from('pdf_mapping_workflows')
        .select('*')
        .eq('user_id', userId)
        .filter('created_at', 'gte', dateFilter);

      if (error) {
        throw error;
      }

      const successfulWorkflows = workflows.filter(
        (w) => w.status === 'completed',
      );
      const totalAccuracy = successfulWorkflows.reduce(
        (sum, w) => sum + (w.mapping_results?.accuracy || 0),
        0,
      );
      const totalProcessingTime = workflows.reduce(
        (sum, w) => sum + (w.total_processing_time || 0),
        0,
      );

      // Calculate failure reasons
      const failedWorkflows = workflows.filter((w) => w.status === 'failed');
      const failureReasons = failedWorkflows.reduce((acc: any, w) => {
        const reason = w.error || 'Unknown error';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

      const topFailureReasons = Object.entries(failureReasons)
        .map(([reason, count]) => ({ reason, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate accuracy trend
      const accuracyTrend = successfulWorkflows
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .map((w) => ({
          date: w.created_at.split('T')[0],
          accuracy: w.mapping_results?.accuracy || 0,
        }));

      return {
        totalWorkflows: workflows.length,
        successfulWorkflows: successfulWorkflows.length,
        averageAccuracy:
          successfulWorkflows.length > 0
            ? totalAccuracy / successfulWorkflows.length
            : 0,
        averageProcessingTime:
          workflows.length > 0 ? totalProcessingTime / workflows.length : 0,
        topFailureReasons,
        accuracyTrend,
      };
    } catch (error: any) {
      console.error('Failed to get workflow analytics:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pdf_mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup workflow resources
   */
  async cleanup(): Promise<void> {
    await this.fieldExtractionService.cleanup();
  }
}

// Export types for use in other modules
export interface ExportRequest {
  documentId: string;
  format: 'json' | 'csv' | 'pdf';
  options?: any;
}

export interface ExportResult {
  success: boolean;
  data?: any;
  format: string;
  fileName?: string;
  size?: number;
  errors?: string[];
}
