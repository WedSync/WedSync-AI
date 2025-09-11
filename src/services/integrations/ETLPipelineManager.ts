import { EventEmitter } from 'events';
import {
  DataSynchronizationRequest,
  DataValidationResult,
} from '../../types/integrations/integration-types';

export interface ETLPipelineConfig {
  defaultBatchSize: number;
  maxConcurrentPipelines: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
  dataValidationEnabled: boolean;
  preserveDataLineage: boolean;
  enableParallelProcessing: boolean;
}

export interface ETLPipeline {
  id: string;
  name: string;
  description: string;
  source: ETLSource;
  transformations: ETLTransformation[];
  destinations: ETLDestination[];
  schedule?: ETLSchedule;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  weddingSpecific: {
    dataType:
      | 'suppliers'
      | 'couples'
      | 'bookings'
      | 'revenue'
      | 'satisfaction'
      | 'mixed';
    seasonalAdjustments: boolean;
    weddingDateAware: boolean;
    supplierTypeSpecific: boolean;
  };
  errorHandling: ETLErrorHandling;
  monitoring: ETLMonitoring;
}

export interface ETLSource {
  type: 'api' | 'database' | 'file' | 'webhook' | 'manual';
  connectionId: string;
  config: {
    endpoint?: string;
    query?: string;
    filePath?: string;
    headers?: { [key: string]: string };
    authentication?: any;
  };
  extractionRules: {
    incrementalColumn?: string;
    filterConditions?: string;
    customExtractor?: string;
  };
}

export interface ETLTransformation {
  id: string;
  name: string;
  type:
    | 'mapping'
    | 'aggregation'
    | 'validation'
    | 'enrichment'
    | 'cleaning'
    | 'custom';
  order: number;
  config: any;
  weddingBusinessRules?: {
    validateWeddingDates?: boolean;
    standardizeSupplierTypes?: boolean;
    calculateRevenue?: boolean;
    enrichWithSeasonalData?: boolean;
    validateGuestCounts?: boolean;
    normalizeRatings?: boolean;
  };
}

export interface ETLDestination {
  type: 'database' | 'api' | 'file' | 'webhook';
  connectionId: string;
  config: {
    table?: string;
    endpoint?: string;
    filePath?: string;
    syncMode: 'append' | 'replace' | 'upsert';
    batchSize?: number;
  };
}

export interface ETLSchedule {
  type: 'cron' | 'interval' | 'event' | 'manual';
  expression: string; // Cron expression or interval in ms
  timezone: string;
  enabled: boolean;
  weddingSeasonalAdjustment?: {
    peakSeasonFrequency?: string; // Higher frequency during wedding season
    offSeasonFrequency?: string;
    peakSeasonMonths?: number[]; // May-September typically
  };
}

export interface ETLErrorHandling {
  onSourceError: 'fail' | 'skip' | 'retry';
  onTransformationError: 'fail' | 'skip' | 'log_and_continue';
  onDestinationError: 'fail' | 'retry' | 'dead_letter_queue';
  maxErrors: number;
  notificationThreshold: number;
  quarantineInvalidData: boolean;
}

export interface ETLMonitoring {
  trackDataLineage: boolean;
  collectMetrics: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  alertOnFailure: boolean;
  alertOnSlowExecution: boolean;
  alertThresholds: {
    executionTimeMs: number;
    errorRate: number;
    dataQualityScore: number;
  };
}

export interface ETLExecution {
  id: string;
  pipelineId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  errors: ETLError[];
  metrics: ETLExecutionMetrics;
  dataLineage?: ETLDataLineage;
}

export interface ETLError {
  id: string;
  executionId: string;
  stage: 'extraction' | 'transformation' | 'loading' | 'validation';
  errorType: string;
  errorMessage: string;
  errorDetails: any;
  recordId?: string;
  timestamp: Date;
  retryAttempt: number;
  resolved: boolean;
}

export interface ETLExecutionMetrics {
  totalExecutionTimeMs: number;
  extractionTimeMs: number;
  transformationTimeMs: number;
  loadingTimeMs: number;
  validationTimeMs: number;
  dataVolumeBytes: number;
  throughputRecordsPerSecond: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
}

export interface ETLDataLineage {
  executionId: string;
  sourceRecords: {
    recordId: string;
    sourceTable: string;
    sourceTimestamp: Date;
    sourceChecksum: string;
  }[];
  transformationSteps: {
    stepName: string;
    inputRecordIds: string[];
    outputRecordIds: string[];
    transformationDetails: any;
  }[];
  destinationRecords: {
    recordId: string;
    destinationTable: string;
    destinationTimestamp: Date;
    destinationChecksum: string;
  }[];
}

export interface WeddingDataTransformationRule {
  id: string;
  name: string;
  category: 'validation' | 'standardization' | 'enrichment' | 'calculation';
  supplierTypes?: string[];
  weddingDateRange?: {
    startDate: Date;
    endDate: Date;
  };
  rule: (data: any) => any;
  description: string;
}

export class ETLPipelineManager extends EventEmitter {
  private config: ETLPipelineConfig;
  private pipelines: Map<string, ETLPipeline> = new Map();
  private executions: ETLExecution[] = [];
  private runningExecutions: Map<string, ETLExecution> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private transformationRules: Map<string, WeddingDataTransformationRule> =
    new Map();

  constructor(config: ETLPipelineConfig) {
    super();
    this.config = config;
    this.initializeWeddingTransformationRules();
  }

  async registerPipeline(pipeline: ETLPipeline): Promise<void> {
    // Validate pipeline configuration
    await this.validatePipelineConfiguration(pipeline);

    this.pipelines.set(pipeline.id, pipeline);

    // Schedule the pipeline if it has a schedule
    if (pipeline.schedule && pipeline.schedule.enabled) {
      await this.schedulePipeline(pipeline);
    }

    console.log(`ETL Pipeline registered: ${pipeline.name} (${pipeline.id})`);
    this.emit('pipeline_registered', pipeline);
  }

  async unregisterPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;

    // Cancel scheduled job if exists
    const scheduledJob = this.scheduledJobs.get(pipelineId);
    if (scheduledJob) {
      clearInterval(scheduledJob);
      this.scheduledJobs.delete(pipelineId);
    }

    this.pipelines.delete(pipelineId);
    console.log(`ETL Pipeline unregistered: ${pipeline.name} (${pipelineId})`);
    this.emit('pipeline_unregistered', pipeline);
  }

  async executePipeline(
    pipelineId: string,
    manualTrigger: boolean = false,
  ): Promise<ETLExecution> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    if (!pipeline.enabled && !manualTrigger) {
      throw new Error(`Pipeline ${pipelineId} is disabled`);
    }

    // Check if we've exceeded max concurrent pipelines
    if (this.runningExecutions.size >= this.config.maxConcurrentPipelines) {
      throw new Error('Maximum concurrent pipelines limit reached');
    }

    const execution: ETLExecution = {
      id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pipelineId,
      startTime: new Date(),
      status: 'running',
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailed: 0,
      errors: [],
      metrics: {
        totalExecutionTimeMs: 0,
        extractionTimeMs: 0,
        transformationTimeMs: 0,
        loadingTimeMs: 0,
        validationTimeMs: 0,
        dataVolumeBytes: 0,
        throughputRecordsPerSecond: 0,
        memoryUsageMB: 0,
        cpuUsagePercent: 0,
      },
    };

    this.runningExecutions.set(execution.id, execution);
    this.executions.push(execution);

    console.log(
      `Starting ETL execution: ${execution.id} for pipeline ${pipeline.name}`,
    );
    this.emit('execution_started', execution);

    try {
      // Execute the pipeline
      await this.executePipelineSteps(pipeline, execution);

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.metrics.totalExecutionTimeMs =
        execution.endTime.getTime() - execution.startTime.getTime();

      console.log(
        `ETL execution completed: ${execution.id} (${execution.recordsSuccessful}/${execution.recordsProcessed} records successful)`,
      );
      this.emit('execution_completed', execution);
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.metrics.totalExecutionTimeMs =
        execution.endTime.getTime() - execution.startTime.getTime();

      const etlError: ETLError = {
        id: `error_${Date.now()}`,
        executionId: execution.id,
        stage: 'extraction', // Will be updated based on where error occurred
        errorType: 'PipelineExecutionError',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorDetails: error,
        timestamp: new Date(),
        retryAttempt: 0,
        resolved: false,
      };

      execution.errors.push(etlError);

      console.error(`ETL execution failed: ${execution.id}`, error);
      this.emit('execution_failed', { execution, error });
    } finally {
      this.runningExecutions.delete(execution.id);
    }

    return execution;
  }

  private async executePipelineSteps(
    pipeline: ETLPipeline,
    execution: ETLExecution,
  ): Promise<void> {
    const startTime = Date.now();

    // Step 1: Extract data from source
    console.log(`Extracting data from source: ${pipeline.source.type}`);
    const extractStartTime = Date.now();
    const extractedData = await this.extractData(pipeline.source, execution);
    execution.metrics.extractionTimeMs = Date.now() - extractStartTime;

    if (!extractedData || extractedData.length === 0) {
      console.log('No data extracted - skipping pipeline execution');
      return;
    }

    execution.recordsProcessed = extractedData.length;
    execution.metrics.dataVolumeBytes = this.calculateDataSize(extractedData);

    // Step 2: Apply transformations
    console.log(`Applying ${pipeline.transformations.length} transformations`);
    const transformStartTime = Date.now();
    const transformedData = await this.applyTransformations(
      extractedData,
      pipeline.transformations,
      execution,
    );
    execution.metrics.transformationTimeMs = Date.now() - transformStartTime;

    // Step 3: Validate data if enabled
    if (this.config.dataValidationEnabled) {
      console.log('Validating transformed data');
      const validationStartTime = Date.now();
      await this.validateTransformedData(transformedData, pipeline, execution);
      execution.metrics.validationTimeMs = Date.now() - validationStartTime;
    }

    // Step 4: Load data to destinations
    console.log(`Loading data to ${pipeline.destinations.length} destinations`);
    const loadStartTime = Date.now();
    await this.loadDataToDestinations(
      transformedData,
      pipeline.destinations,
      execution,
    );
    execution.metrics.loadingTimeMs = Date.now() - loadStartTime;

    // Step 5: Record data lineage if enabled
    if (
      this.config.preserveDataLineage &&
      pipeline.monitoring.trackDataLineage
    ) {
      execution.dataLineage = await this.recordDataLineage(
        extractedData,
        transformedData,
        execution,
      );
    }

    // Calculate final metrics
    const totalTime = Date.now() - startTime;
    execution.metrics.throughputRecordsPerSecond =
      execution.recordsProcessed / (totalTime / 1000);
    execution.recordsSuccessful =
      execution.recordsProcessed - execution.recordsFailed;
  }

  private async extractData(
    source: ETLSource,
    execution: ETLExecution,
  ): Promise<any[]> {
    try {
      switch (source.type) {
        case 'api':
          return await this.extractFromAPI(source, execution);
        case 'database':
          return await this.extractFromDatabase(source, execution);
        case 'file':
          return await this.extractFromFile(source, execution);
        case 'webhook':
          return await this.extractFromWebhook(source, execution);
        case 'manual':
          return []; // Manual data would be provided directly
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }
    } catch (error) {
      const etlError: ETLError = {
        id: `error_${Date.now()}`,
        executionId: execution.id,
        stage: 'extraction',
        errorType: 'ExtractionError',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorDetails: { source, error },
        timestamp: new Date(),
        retryAttempt: 0,
        resolved: false,
      };

      execution.errors.push(etlError);
      throw error;
    }
  }

  private async extractFromAPI(
    source: ETLSource,
    execution: ETLExecution,
  ): Promise<any[]> {
    if (!source.config.endpoint) {
      throw new Error('API endpoint not configured');
    }

    const response = await fetch(source.config.endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...source.config.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }

  private async extractFromDatabase(
    source: ETLSource,
    execution: ETLExecution,
  ): Promise<any[]> {
    // This would integrate with the specific database connector
    // For now, returning mock data structure
    console.log(`Extracting from database: ${source.connectionId}`);
    return [];
  }

  private async extractFromFile(
    source: ETLSource,
    execution: ETLExecution,
  ): Promise<any[]> {
    if (!source.config.filePath) {
      throw new Error('File path not configured');
    }

    // File extraction logic would go here (CSV, JSON, Excel parsing)
    console.log(`Extracting from file: ${source.config.filePath}`);
    return [];
  }

  private async extractFromWebhook(
    source: ETLSource,
    execution: ETLExecution,
  ): Promise<any[]> {
    // Webhook data would typically be stored in a queue/buffer
    console.log(`Extracting from webhook: ${source.connectionId}`);
    return [];
  }

  private async applyTransformations(
    data: any[],
    transformations: ETLTransformation[],
    execution: ETLExecution,
  ): Promise<any[]> {
    let transformedData = [...data];

    // Sort transformations by order
    const sortedTransformations = transformations.sort(
      (a, b) => a.order - b.order,
    );

    for (const transformation of sortedTransformations) {
      try {
        console.log(`Applying transformation: ${transformation.name}`);
        transformedData = await this.applyTransformation(
          transformedData,
          transformation,
          execution,
        );
      } catch (error) {
        const etlError: ETLError = {
          id: `error_${Date.now()}`,
          executionId: execution.id,
          stage: 'transformation',
          errorType: 'TransformationError',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorDetails: { transformation, error },
          timestamp: new Date(),
          retryAttempt: 0,
          resolved: false,
        };

        execution.errors.push(etlError);

        // Handle error based on pipeline configuration
        // For now, continue with remaining transformations
        console.error(`Transformation error: ${transformation.name}`, error);
      }
    }

    return transformedData;
  }

  private async applyTransformation(
    data: any[],
    transformation: ETLTransformation,
    execution: ETLExecution,
  ): Promise<any[]> {
    switch (transformation.type) {
      case 'mapping':
        return this.applyMappingTransformation(data, transformation);
      case 'aggregation':
        return this.applyAggregationTransformation(data, transformation);
      case 'validation':
        return this.applyValidationTransformation(data, transformation);
      case 'enrichment':
        return this.applyEnrichmentTransformation(data, transformation);
      case 'cleaning':
        return this.applyCleaningTransformation(data, transformation);
      case 'custom':
        return this.applyCustomTransformation(data, transformation);
      default:
        throw new Error(
          `Unsupported transformation type: ${transformation.type}`,
        );
    }
  }

  private async applyMappingTransformation(
    data: any[],
    transformation: ETLTransformation,
  ): Promise<any[]> {
    const mappingRules = transformation.config.mappingRules || {};

    return data.map((record) => {
      const mappedRecord: any = {};

      // Apply field mappings
      Object.keys(mappingRules).forEach((targetField) => {
        const sourceField = mappingRules[targetField];
        if (typeof sourceField === 'string') {
          mappedRecord[targetField] = record[sourceField];
        } else if (typeof sourceField === 'function') {
          mappedRecord[targetField] = sourceField(record);
        }
      });

      // Apply wedding-specific business rules if configured
      if (transformation.weddingBusinessRules) {
        return this.applyWeddingBusinessRules(
          mappedRecord,
          transformation.weddingBusinessRules,
        );
      }

      return mappedRecord;
    });
  }

  private async applyAggregationTransformation(
    data: any[],
    transformation: ETLTransformation,
  ): Promise<any[]> {
    const { groupBy, aggregations } = transformation.config;

    if (!groupBy || !aggregations) {
      return data; // No aggregation configuration
    }

    // Group data by specified fields
    const groups = data.reduce(
      (acc, record) => {
        const key = Array.isArray(groupBy)
          ? groupBy.map((field: string) => record[field]).join('|')
          : record[groupBy];

        if (!acc[key]) acc[key] = [];
        acc[key].push(record);
        return acc;
      },
      {} as { [key: string]: any[] },
    );

    // Apply aggregations to each group
    return Object.keys(groups).map((groupKey) => {
      const groupRecords = groups[groupKey];
      const aggregatedRecord: any = {};

      // Preserve grouping fields
      if (Array.isArray(groupBy)) {
        groupBy.forEach((field: string, index: number) => {
          aggregatedRecord[field] = groupKey.split('|')[index];
        });
      } else {
        aggregatedRecord[groupBy] = groupKey;
      }

      // Apply aggregation functions
      Object.keys(aggregations).forEach((field) => {
        const aggregationType = aggregations[field];
        const values = groupRecords
          .map((record) => record[field])
          .filter((val) => val !== null && val !== undefined);

        switch (aggregationType) {
          case 'sum':
            aggregatedRecord[field] = values.reduce(
              (sum, val) => sum + Number(val),
              0,
            );
            break;
          case 'avg':
            aggregatedRecord[field] =
              values.reduce((sum, val) => sum + Number(val), 0) / values.length;
            break;
          case 'count':
            aggregatedRecord[field] = values.length;
            break;
          case 'max':
            aggregatedRecord[field] = Math.max(
              ...values.map((val) => Number(val)),
            );
            break;
          case 'min':
            aggregatedRecord[field] = Math.min(
              ...values.map((val) => Number(val)),
            );
            break;
          case 'first':
            aggregatedRecord[field] = values[0];
            break;
          case 'last':
            aggregatedRecord[field] = values[values.length - 1];
            break;
        }
      });

      return aggregatedRecord;
    });
  }

  private async applyValidationTransformation(
    data: any[],
    transformation: ETLTransformation,
  ): Promise<any[]> {
    const validationRules = transformation.config.validationRules || [];
    const validRecords: any[] = [];
    const invalidRecords: any[] = [];

    for (const record of data) {
      let isValid = true;
      const validationErrors: string[] = [];

      for (const rule of validationRules) {
        try {
          const isRuleValid = await this.evaluateValidationRule(record, rule);
          if (!isRuleValid) {
            isValid = false;
            validationErrors.push(
              rule.message || `Validation failed: ${rule.field}`,
            );
          }
        } catch (error) {
          isValid = false;
          validationErrors.push(`Validation error: ${error}`);
        }
      }

      if (isValid) {
        validRecords.push(record);
      } else {
        record._validationErrors = validationErrors;
        invalidRecords.push(record);
      }
    }

    // Handle invalid records based on error handling configuration
    if (invalidRecords.length > 0) {
      console.warn(`${invalidRecords.length} records failed validation`);
      // Could log to dead letter queue or quarantine table
    }

    return validRecords;
  }

  private async applyEnrichmentTransformation(
    data: any[],
    transformation: ETLTransformation,
  ): Promise<any[]> {
    const enrichmentRules = transformation.config.enrichmentRules || [];

    return Promise.all(
      data.map(async (record) => {
        let enrichedRecord = { ...record };

        for (const rule of enrichmentRules) {
          try {
            enrichedRecord = await this.applyEnrichmentRule(
              enrichedRecord,
              rule,
            );
          } catch (error) {
            console.error(`Enrichment rule failed: ${rule.name}`, error);
          }
        }

        return enrichedRecord;
      }),
    );
  }

  private async applyCleaningTransformation(
    data: any[],
    transformation: ETLTransformation,
  ): Promise<any[]> {
    const cleaningRules = transformation.config.cleaningRules || [];

    return data
      .map((record) => {
        let cleanedRecord = { ...record };

        for (const rule of cleaningRules) {
          cleanedRecord = this.applyCleaningRule(cleanedRecord, rule);
        }

        return cleanedRecord;
      })
      .filter((record) => record !== null); // Remove null records
  }

  private async applyCustomTransformation(
    data: any[],
    transformation: ETLTransformation,
  ): Promise<any[]> {
    // Custom transformation would execute user-defined logic
    const customFunction = transformation.config.customFunction;

    if (typeof customFunction === 'function') {
      return await customFunction(data, transformation.config);
    }

    return data;
  }

  private applyWeddingBusinessRules(
    record: any,
    rules: NonNullable<ETLTransformation['weddingBusinessRules']>,
  ): any {
    let processedRecord = { ...record };

    // Validate wedding dates
    if (rules.validateWeddingDates && processedRecord.wedding_date) {
      const weddingDate = new Date(processedRecord.wedding_date);
      const today = new Date();

      if (weddingDate < today) {
        processedRecord._warnings = processedRecord._warnings || [];
        processedRecord._warnings.push('Wedding date is in the past');
      }

      // Check if wedding date is on weekend (common wedding days)
      const dayOfWeek = weddingDate.getDay();
      processedRecord.is_weekend_wedding = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }

    // Standardize supplier types
    if (rules.standardizeSupplierTypes && processedRecord.supplier_type) {
      processedRecord.supplier_type = this.standardizeSupplierType(
        processedRecord.supplier_type,
      );
    }

    // Calculate revenue metrics
    if (
      rules.calculateRevenue &&
      processedRecord.contract_value &&
      processedRecord.commission_rate
    ) {
      processedRecord.calculated_commission =
        processedRecord.contract_value *
        (processedRecord.commission_rate / 100);
      processedRecord.net_revenue =
        processedRecord.contract_value - processedRecord.calculated_commission;
    }

    // Enrich with seasonal data
    if (rules.enrichWithSeasonalData && processedRecord.wedding_date) {
      const weddingDate = new Date(processedRecord.wedding_date);
      const month = weddingDate.getMonth() + 1; // 1-based month

      // Wedding season is typically May-September
      processedRecord.is_peak_season = month >= 5 && month <= 9;
      processedRecord.wedding_season = this.getWeddingSeason(month);
    }

    // Validate guest counts
    if (rules.validateGuestCounts && processedRecord.guest_count) {
      const guestCount = Number(processedRecord.guest_count);
      if (guestCount < 1 || guestCount > 1000) {
        processedRecord._warnings = processedRecord._warnings || [];
        processedRecord._warnings.push(`Unusual guest count: ${guestCount}`);
      }

      // Categorize wedding size
      if (guestCount <= 50) processedRecord.wedding_size = 'intimate';
      else if (guestCount <= 100) processedRecord.wedding_size = 'medium';
      else if (guestCount <= 200) processedRecord.wedding_size = 'large';
      else processedRecord.wedding_size = 'very_large';
    }

    // Normalize ratings
    if (rules.normalizeRatings && processedRecord.rating) {
      const rating = Number(processedRecord.rating);
      // Normalize to 1-5 scale if needed
      if (rating > 5) {
        processedRecord.rating = Math.min(5, rating / 2); // Assume 1-10 scale
      }
      processedRecord.rating = Math.round(processedRecord.rating * 2) / 2; // Round to nearest 0.5
    }

    return processedRecord;
  }

  private standardizeSupplierType(supplierType: string): string {
    const standardizedTypes: { [key: string]: string } = {
      photographer: 'Photography',
      photo: 'Photography',
      photos: 'Photography',
      'wedding photographer': 'Photography',
      videographer: 'Videography',
      video: 'Videography',
      'wedding videographer': 'Videography',
      venue: 'Venue',
      'reception venue': 'Venue',
      'wedding venue': 'Venue',
      caterer: 'Catering',
      catering: 'Catering',
      food: 'Catering',
      florist: 'Floral',
      flowers: 'Floral',
      floral: 'Floral',
      'wedding flowers': 'Floral',
      dj: 'Entertainment',
      band: 'Entertainment',
      music: 'Entertainment',
      entertainment: 'Entertainment',
      'wedding planner': 'Planning',
      planner: 'Planning',
      coordinator: 'Planning',
      'wedding coordinator': 'Planning',
      makeup: 'Beauty',
      hair: 'Beauty',
      beauty: 'Beauty',
      'makeup artist': 'Beauty',
      'hair stylist': 'Beauty',
    };

    const lowerType = supplierType.toLowerCase().trim();
    return standardizedTypes[lowerType] || supplierType;
  }

  private getWeddingSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  private async evaluateValidationRule(
    record: any,
    rule: any,
  ): Promise<boolean> {
    const { field, operator, value, customValidator } = rule;

    if (customValidator && typeof customValidator === 'function') {
      return await customValidator(record);
    }

    const recordValue = record[field];

    switch (operator) {
      case 'required':
        return (
          recordValue !== null &&
          recordValue !== undefined &&
          recordValue !== ''
        );
      case 'min_length':
        return typeof recordValue === 'string' && recordValue.length >= value;
      case 'max_length':
        return typeof recordValue === 'string' && recordValue.length <= value;
      case 'min_value':
        return Number(recordValue) >= value;
      case 'max_value':
        return Number(recordValue) <= value;
      case 'regex':
        return new RegExp(value).test(String(recordValue));
      case 'in':
        return Array.isArray(value) && value.includes(recordValue);
      case 'date_range':
        const date = new Date(recordValue);
        return date >= new Date(value.min) && date <= new Date(value.max);
      default:
        return true;
    }
  }

  private async applyEnrichmentRule(record: any, rule: any): Promise<any> {
    const { type, config } = rule;
    let enrichedRecord = { ...record };

    switch (type) {
      case 'lookup':
        // Lookup additional data from external source
        const lookupData = await this.performLookup(
          record[config.keyField],
          config.lookupSource,
        );
        enrichedRecord = { ...enrichedRecord, ...lookupData };
        break;

      case 'calculation':
        // Perform calculations based on existing fields
        enrichedRecord[config.outputField] = config.calculation(record);
        break;

      case 'geocoding':
        // Add location data based on address
        if (record[config.addressField]) {
          const locationData = await this.performGeocoding(
            record[config.addressField],
          );
          enrichedRecord = { ...enrichedRecord, ...locationData };
        }
        break;

      case 'classification':
        // Classify data based on business rules
        enrichedRecord[config.outputField] = config.classifier(record);
        break;
    }

    return enrichedRecord;
  }

  private applyCleaningRule(record: any, rule: any): any {
    const { field, cleaningType, config } = rule;

    if (!record[field]) return record;

    let cleanedRecord = { ...record };
    let value = record[field];

    switch (cleaningType) {
      case 'trim':
        cleanedRecord[field] = String(value).trim();
        break;

      case 'lowercase':
        cleanedRecord[field] = String(value).toLowerCase();
        break;

      case 'uppercase':
        cleanedRecord[field] = String(value).toUpperCase();
        break;

      case 'remove_duplicates':
        if (Array.isArray(value)) {
          cleanedRecord[field] = [...new Set(value)];
        }
        break;

      case 'standardize_phone':
        cleanedRecord[field] = this.standardizePhoneNumber(String(value));
        break;

      case 'standardize_email':
        cleanedRecord[field] = String(value).toLowerCase().trim();
        break;

      case 'remove_special_chars':
        cleanedRecord[field] = String(value).replace(/[^a-zA-Z0-9\s]/g, '');
        break;

      case 'null_if_empty':
        cleanedRecord[field] = String(value).trim() === '' ? null : value;
        break;

      case 'default_value':
        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ''
        ) {
          cleanedRecord[field] = config.defaultValue;
        }
        break;
    }

    return cleanedRecord;
  }

  private standardizePhoneNumber(phone: string): string {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '');

    // Handle different formats
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // US format with country code
      return `+1-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    } else if (digitsOnly.length === 10) {
      // US format without country code
      return `+1-${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }

    // Return original if format not recognized
    return phone;
  }

  private async performLookup(key: any, lookupSource: any): Promise<any> {
    // Mock lookup implementation
    // In production, this would query external APIs or databases
    return {};
  }

  private async performGeocoding(address: string): Promise<any> {
    // Mock geocoding implementation
    // In production, this would use Google Maps API, etc.
    return {
      latitude: 0,
      longitude: 0,
      formatted_address: address,
    };
  }

  private async validateTransformedData(
    data: any[],
    pipeline: ETLPipeline,
    execution: ETLExecution,
  ): Promise<void> {
    // Wedding-specific data validation
    for (const record of data) {
      const validationResult = await this.validateWeddingRecord(
        record,
        pipeline.weddingSpecific,
      );

      if (!validationResult.isValid) {
        execution.recordsFailed++;

        const etlError: ETLError = {
          id: `error_${Date.now()}`,
          executionId: execution.id,
          stage: 'validation',
          errorType: 'ValidationError',
          errorMessage: validationResult.errors.join(', '),
          errorDetails: { record, validationResult },
          recordId: record.id || record.booking_id || record.supplier_id,
          timestamp: new Date(),
          retryAttempt: 0,
          resolved: false,
        };

        execution.errors.push(etlError);
      }
    }
  }

  private async validateWeddingRecord(
    record: any,
    weddingSpecific: ETLPipeline['weddingSpecific'],
  ): Promise<DataValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Wedding date validation
    if (weddingSpecific.weddingDateAware && record.wedding_date) {
      const weddingDate = new Date(record.wedding_date);
      if (isNaN(weddingDate.getTime())) {
        errors.push('Invalid wedding date format');
      } else {
        const today = new Date();
        const oneYearFromNow = new Date(
          today.getFullYear() + 1,
          today.getMonth(),
          today.getDate(),
        );

        if (weddingDate < today) {
          warnings.push('Wedding date is in the past');
        } else if (weddingDate > oneYearFromNow) {
          warnings.push('Wedding date is more than one year in the future');
        }
      }
    }

    // Supplier type validation
    if (weddingSpecific.supplierTypeSpecific && record.supplier_type) {
      const validSupplierTypes = [
        'Photography',
        'Videography',
        'Venue',
        'Catering',
        'Floral',
        'Entertainment',
        'Planning',
        'Beauty',
      ];
      if (!validSupplierTypes.includes(record.supplier_type)) {
        warnings.push(`Non-standard supplier type: ${record.supplier_type}`);
      }
    }

    // Data type specific validations
    switch (weddingSpecific.dataType) {
      case 'bookings':
        if (!record.booking_id) errors.push('Missing booking_id');
        if (!record.couple_id) errors.push('Missing couple_id');
        if (!record.supplier_id) errors.push('Missing supplier_id');
        if (record.contract_value && record.contract_value < 0)
          errors.push('Negative contract value');
        break;

      case 'suppliers':
        if (!record.supplier_id) errors.push('Missing supplier_id');
        if (!record.business_name) errors.push('Missing business_name');
        if (record.rating && (record.rating < 1 || record.rating > 5))
          errors.push('Invalid rating range');
        break;

      case 'couples':
        if (!record.couple_id) errors.push('Missing couple_id');
        if (!record.partner1_name) errors.push('Missing primary partner name');
        if (record.guest_count && record.guest_count < 1)
          errors.push('Invalid guest count');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  private async loadDataToDestinations(
    data: any[],
    destinations: ETLDestination[],
    execution: ETLExecution,
  ): Promise<void> {
    for (const destination of destinations) {
      try {
        await this.loadDataToDestination(data, destination, execution);
      } catch (error) {
        const etlError: ETLError = {
          id: `error_${Date.now()}`,
          executionId: execution.id,
          stage: 'loading',
          errorType: 'LoadingError',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorDetails: { destination, error },
          timestamp: new Date(),
          retryAttempt: 0,
          resolved: false,
        };

        execution.errors.push(etlError);
        console.error(
          `Loading failed for destination: ${destination.type}`,
          error,
        );
      }
    }
  }

  private async loadDataToDestination(
    data: any[],
    destination: ETLDestination,
    execution: ETLExecution,
  ): Promise<void> {
    const batchSize =
      destination.config.batchSize || this.config.defaultBatchSize;

    // Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      switch (destination.type) {
        case 'database':
          await this.loadToDatabase(batch, destination);
          break;
        case 'api':
          await this.loadToAPI(batch, destination);
          break;
        case 'file':
          await this.loadToFile(batch, destination);
          break;
        case 'webhook':
          await this.loadToWebhook(batch, destination);
          break;
      }
    }
  }

  private async loadToDatabase(
    data: any[],
    destination: ETLDestination,
  ): Promise<void> {
    // Database loading logic would integrate with specific database connectors
    console.log(
      `Loading ${data.length} records to database: ${destination.connectionId}`,
    );
  }

  private async loadToAPI(
    data: any[],
    destination: ETLDestination,
  ): Promise<void> {
    if (!destination.config.endpoint) {
      throw new Error('API endpoint not configured for destination');
    }

    const response = await fetch(destination.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `API load failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  private async loadToFile(
    data: any[],
    destination: ETLDestination,
  ): Promise<void> {
    console.log(
      `Loading ${data.length} records to file: ${destination.config.filePath}`,
    );
    // File loading logic (JSON, CSV export)
  }

  private async loadToWebhook(
    data: any[],
    destination: ETLDestination,
  ): Promise<void> {
    console.log(
      `Sending ${data.length} records to webhook: ${destination.config.endpoint}`,
    );
    // Webhook notification logic
  }

  private async recordDataLineage(
    extractedData: any[],
    transformedData: any[],
    execution: ETLExecution,
  ): Promise<ETLDataLineage> {
    return {
      executionId: execution.id,
      sourceRecords: extractedData.map((record, index) => ({
        recordId: record.id || `source_${index}`,
        sourceTable: 'unknown',
        sourceTimestamp: new Date(),
        sourceChecksum: this.calculateChecksum(record),
      })),
      transformationSteps: [
        {
          stepName: 'complete_transformation',
          inputRecordIds: extractedData.map(
            (record, index) => record.id || `source_${index}`,
          ),
          outputRecordIds: transformedData.map(
            (record, index) => record.id || `transformed_${index}`,
          ),
          transformationDetails: {
            totalTransformations: execution.errors.length,
          },
        },
      ],
      destinationRecords: transformedData.map((record, index) => ({
        recordId: record.id || `dest_${index}`,
        destinationTable: 'unknown',
        destinationTimestamp: new Date(),
        destinationChecksum: this.calculateChecksum(record),
      })),
    };
  }

  private calculateDataSize(data: any[]): number {
    return JSON.stringify(data).length;
  }

  private calculateChecksum(data: any): string {
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private async validatePipelineConfiguration(
    pipeline: ETLPipeline,
  ): Promise<void> {
    // Validate pipeline configuration
    if (!pipeline.id || !pipeline.name) {
      throw new Error('Pipeline must have id and name');
    }

    if (!pipeline.source) {
      throw new Error('Pipeline must have a source configuration');
    }

    if (!pipeline.transformations || pipeline.transformations.length === 0) {
      throw new Error('Pipeline must have at least one transformation');
    }

    if (!pipeline.destinations || pipeline.destinations.length === 0) {
      throw new Error('Pipeline must have at least one destination');
    }

    // Validate transformation order
    const orders = pipeline.transformations.map((t) => t.order);
    if (orders.length !== new Set(orders).size) {
      throw new Error('Transformation orders must be unique');
    }
  }

  private async schedulePipeline(pipeline: ETLPipeline): Promise<void> {
    if (!pipeline.schedule) return;

    const schedule = pipeline.schedule;
    let intervalMs: number;

    switch (schedule.type) {
      case 'interval':
        intervalMs = parseInt(schedule.expression);
        break;
      case 'cron':
        // For production, would use a proper cron parser
        intervalMs = 60000; // Default to 1 minute for demo
        break;
      case 'event':
        // Event-based scheduling would be handled elsewhere
        return;
      case 'manual':
        return;
      default:
        throw new Error(`Unsupported schedule type: ${schedule.type}`);
    }

    // Adjust for wedding seasonal requirements
    if (schedule.weddingSeasonalAdjustment) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const isPeakSeason = month >= 5 && month <= 9;

      if (
        isPeakSeason &&
        schedule.weddingSeasonalAdjustment.peakSeasonFrequency
      ) {
        intervalMs = parseInt(
          schedule.weddingSeasonalAdjustment.peakSeasonFrequency,
        );
      } else if (
        !isPeakSeason &&
        schedule.weddingSeasonalAdjustment.offSeasonFrequency
      ) {
        intervalMs = parseInt(
          schedule.weddingSeasonalAdjustment.offSeasonFrequency,
        );
      }
    }

    const scheduledJob = setInterval(async () => {
      if (pipeline.enabled) {
        try {
          await this.executePipeline(pipeline.id, false);
        } catch (error) {
          console.error(
            `Scheduled execution failed for pipeline ${pipeline.name}:`,
            error,
          );
        }
      }
    }, intervalMs);

    this.scheduledJobs.set(pipeline.id, scheduledJob);
    console.log(
      `Pipeline ${pipeline.name} scheduled with interval: ${intervalMs}ms`,
    );
  }

  private initializeWeddingTransformationRules(): void {
    // Initialize common wedding industry transformation rules
    const weddingRules: WeddingDataTransformationRule[] = [
      {
        id: 'standardize_wedding_dates',
        name: 'Standardize Wedding Dates',
        category: 'standardization',
        rule: (data) => {
          if (data.wedding_date) {
            data.wedding_date = new Date(data.wedding_date)
              .toISOString()
              .split('T')[0];
            data.is_weekend_wedding = [0, 6].includes(
              new Date(data.wedding_date).getDay(),
            );
          }
          return data;
        },
        description:
          'Standardizes wedding date format and adds weekend indicator',
      },
      {
        id: 'calculate_wedding_season',
        name: 'Calculate Wedding Season',
        category: 'enrichment',
        rule: (data) => {
          if (data.wedding_date) {
            const month = new Date(data.wedding_date).getMonth() + 1;
            data.wedding_season = this.getWeddingSeason(month);
            data.is_peak_season = month >= 5 && month <= 9;
          }
          return data;
        },
        description: 'Adds wedding season and peak season indicators',
      },
      {
        id: 'validate_supplier_ratings',
        name: 'Validate Supplier Ratings',
        category: 'validation',
        rule: (data) => {
          if (data.rating) {
            const rating = parseFloat(data.rating);
            if (rating < 1 || rating > 5) {
              data._validation_errors = data._validation_errors || [];
              data._validation_errors.push(
                'Invalid rating: must be between 1 and 5',
              );
            } else {
              data.rating = Math.round(rating * 2) / 2; // Round to nearest 0.5
            }
          }
          return data;
        },
        description: 'Validates and normalizes supplier ratings',
      },
    ];

    weddingRules.forEach((rule) => {
      this.transformationRules.set(rule.id, rule);
    });
  }

  // Public API methods

  getPipelines(): ETLPipeline[] {
    return Array.from(this.pipelines.values());
  }

  getPipeline(pipelineId: string): ETLPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  getExecutions(pipelineId?: string): ETLExecution[] {
    if (pipelineId) {
      return this.executions.filter((exec) => exec.pipelineId === pipelineId);
    }
    return this.executions;
  }

  getRunningExecutions(): ETLExecution[] {
    return Array.from(this.runningExecutions.values());
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.runningExecutions.get(executionId);
    if (!execution) return false;

    execution.status = 'cancelled';
    execution.endTime = new Date();
    this.runningExecutions.delete(executionId);

    console.log(`ETL execution cancelled: ${executionId}`);
    this.emit('execution_cancelled', execution);
    return true;
  }

  async enablePipeline(pipelineId: string): Promise<boolean> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;

    pipeline.enabled = true;

    if (pipeline.schedule && pipeline.schedule.enabled) {
      await this.schedulePipeline(pipeline);
    }

    console.log(`Pipeline enabled: ${pipeline.name}`);
    this.emit('pipeline_enabled', pipeline);
    return true;
  }

  async disablePipeline(pipelineId: string): Promise<boolean> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;

    pipeline.enabled = false;

    // Cancel scheduled job if exists
    const scheduledJob = this.scheduledJobs.get(pipelineId);
    if (scheduledJob) {
      clearInterval(scheduledJob);
      this.scheduledJobs.delete(pipelineId);
    }

    console.log(`Pipeline disabled: ${pipeline.name}`);
    this.emit('pipeline_disabled', pipeline);
    return true;
  }

  getTransformationRules(): WeddingDataTransformationRule[] {
    return Array.from(this.transformationRules.values());
  }

  addTransformationRule(rule: WeddingDataTransformationRule): void {
    this.transformationRules.set(rule.id, rule);
    console.log(`Transformation rule added: ${rule.name}`);
  }

  removeTransformationRule(ruleId: string): boolean {
    const deleted = this.transformationRules.delete(ruleId);
    if (deleted) {
      console.log(`Transformation rule removed: ${ruleId}`);
    }
    return deleted;
  }

  getSystemMetrics(): {
    totalPipelines: number;
    enabledPipelines: number;
    runningExecutions: number;
    successfulExecutionsToday: number;
    failedExecutionsToday: number;
    avgExecutionTimeMs: number;
  } {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const todaysExecutions = this.executions.filter(
      (exec) => exec.startTime >= startOfDay,
    );
    const successfulToday = todaysExecutions.filter(
      (exec) => exec.status === 'completed',
    ).length;
    const failedToday = todaysExecutions.filter(
      (exec) => exec.status === 'failed',
    ).length;

    const completedExecutions = todaysExecutions.filter((exec) => exec.endTime);
    const avgExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce(
            (sum, exec) => sum + exec.metrics.totalExecutionTimeMs,
            0,
          ) / completedExecutions.length
        : 0;

    return {
      totalPipelines: this.pipelines.size,
      enabledPipelines: Array.from(this.pipelines.values()).filter(
        (p) => p.enabled,
      ).length,
      runningExecutions: this.runningExecutions.size,
      successfulExecutionsToday: successfulToday,
      failedExecutionsToday: failedToday,
      avgExecutionTimeMs: Math.round(avgExecutionTime),
    };
  }
}
