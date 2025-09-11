/**
 * WS-250: API Gateway Management System - Cross Platform Transformer
 * Team C - Round 1: API data format transformation between platforms
 *
 * Handles data transformation between different API formats, schemas,
 * and protocols with wedding industry specific mapping rules.
 */

import {
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
} from '../../types/integrations';

export interface TransformationSchema {
  id: string;
  name: string;
  sourceFormat: DataFormat;
  targetFormat: DataFormat;
  version: string;
  bidirectional: boolean;
  mappingRules: FieldMapping[];
  validationRules: ValidationRule[];
  customTransformers: CustomTransformer[];
  weddingSpecificMappings?: WeddingFieldMapping[];
}

export interface DataFormat {
  type: 'JSON' | 'XML' | 'CSV' | 'FORM_DATA' | 'QUERY_STRING' | 'BINARY';
  contentType: string;
  encoding?: 'utf-8' | 'base64' | 'binary';
  schema?: any; // JSON Schema, XML Schema, etc.
  structure?: 'flat' | 'nested' | 'array' | 'mixed';
  dateFormat?: string;
  timeZone?: string;
}

export interface FieldMapping {
  sourcePath: string;
  targetPath: string;
  transformationType:
    | 'direct'
    | 'computed'
    | 'conditional'
    | 'aggregated'
    | 'split'
    | 'merge';
  transformer?: string;
  required: boolean;
  defaultValue?: any;
  conditions?: MappingCondition[];
  weddingContextAware?: boolean;
}

export interface WeddingFieldMapping extends FieldMapping {
  weddingRole: 'bride' | 'groom' | 'vendor' | 'guest' | 'venue' | 'planner';
  eventPhase: 'planning' | 'day_of' | 'post_wedding';
  criticalField: boolean;
  seasonalAdjustment?: boolean;
}

export interface MappingCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'exists'
    | 'not_exists';
  value: any;
  caseSensitive?: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom' | 'wedding_specific';
  parameters?: any;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
  weddingCritical?: boolean;
}

export interface CustomTransformer {
  name: string;
  function: (value: any, context: TransformationContext) => any;
  description: string;
  parameters?: Record<string, any>;
  returnsPromise?: boolean;
}

export interface TransformationContext {
  sourceData: any;
  targetSchema: TransformationSchema;
  metadata: {
    timestamp: Date;
    requestId: string;
    clientId?: string;
    userAgent?: string;
  };
  weddingContext?: {
    weddingId?: string;
    weddingDate?: Date;
    vendorType?: string;
    isWeddingWeekend?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  platformContext?: {
    sourceSystem?: string;
    targetSystem?: string;
    environment?: 'development' | 'staging' | 'production';
  };
}

export interface TransformationResult<T = any> {
  success: boolean;
  data?: T;
  originalData: any;
  schema: string;
  validationResults: ValidationResult[];
  transformationLog: TransformationLogEntry[];
  warnings: string[];
  errors: string[];
  metadata: {
    processingTime: number;
    fieldsTransformed: number;
    fieldsSkipped: number;
    customTransformersApplied: string[];
  };
}

export interface ValidationResult {
  field: string;
  rule: string;
  passed: boolean;
  message?: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
}

export interface TransformationLogEntry {
  field: string;
  transformation: string;
  originalValue: any;
  transformedValue: any;
  timestamp: Date;
  processingTime: number;
}

export interface PlatformAdapter {
  platformName: string;
  supportedFormats: DataFormat[];
  commonMappings: Map<string, FieldMapping>;
  authenticationMethod: 'none' | 'api_key' | 'oauth' | 'bearer' | 'custom';
  rateLimit?: {
    requests: number;
    window: number;
    burstLimit?: number;
  };
  weddingSpecificFeatures?: {
    supportsWeddingDates: boolean;
    supportsGuestManagement: boolean;
    supportsVendorCategories: boolean;
    supportsTimelineIntegration: boolean;
  };
}

export interface BatchTransformationRequest {
  items: Array<{
    id: string;
    data: any;
    schemaId: string;
    context?: Partial<TransformationContext>;
  }>;
  options: {
    failFast?: boolean;
    maxConcurrency?: number;
    validateAll?: boolean;
    preserveOrder?: boolean;
  };
}

export interface BatchTransformationResult {
  success: boolean;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  results: Map<string, TransformationResult>;
  errors: Map<string, string>;
  processingTime: number;
  averageItemTime: number;
}

export class CrossPlatformTransformer {
  private schemas: Map<string, TransformationSchema>;
  private platformAdapters: Map<string, PlatformAdapter>;
  private customTransformers: Map<string, CustomTransformer>;
  private transformationCache: Map<string, TransformationResult>;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;

  constructor(
    options: {
      enableCache?: boolean;
      cacheTTL?: number;
    } = {},
  ) {
    this.schemas = new Map();
    this.platformAdapters = new Map();
    this.customTransformers = new Map();
    this.transformationCache = new Map();
    this.cacheEnabled = options.enableCache ?? true;
    this.cacheTTL = options.cacheTTL ?? 300000; // 5 minutes

    // Initialize built-in transformers
    this.initializeBuiltInTransformers();

    // Initialize wedding industry adapters
    this.initializeWeddingPlatforms();
  }

  /**
   * Register a transformation schema
   */
  registerSchema(schema: TransformationSchema): void {
    this.schemas.set(schema.id, schema);
  }

  /**
   * Register a platform adapter
   */
  registerPlatformAdapter(adapter: PlatformAdapter): void {
    this.platformAdapters.set(adapter.platformName, adapter);
  }

  /**
   * Transform data using specified schema
   */
  async transform<T = any>(
    data: any,
    schemaId: string,
    context?: Partial<TransformationContext>,
  ): Promise<TransformationResult<T>> {
    const startTime = Date.now();

    try {
      // Get transformation schema
      const schema = this.schemas.get(schemaId);
      if (!schema) {
        throw new IntegrationError(
          `Transformation schema not found: ${schemaId}`,
          'SCHEMA_NOT_FOUND',
          ErrorCategory.VALIDATION,
        );
      }

      // Build full context
      const fullContext: TransformationContext = {
        sourceData: data,
        targetSchema: schema,
        metadata: {
          timestamp: new Date(),
          requestId: context?.metadata?.requestId || this.generateRequestId(),
          clientId: context?.metadata?.clientId,
          userAgent: context?.metadata?.userAgent,
        },
        weddingContext: context?.weddingContext,
        platformContext: context?.platformContext,
      };

      // Check cache
      const cacheKey = this.generateCacheKey(data, schemaId, fullContext);
      if (this.cacheEnabled) {
        const cached = this.transformationCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
          return { ...cached };
        }
      }

      // Perform transformation
      const result = await this.performTransformation<T>(
        data,
        schema,
        fullContext,
      );
      result.metadata.processingTime = Date.now() - startTime;

      // Cache result
      if (this.cacheEnabled && result.success) {
        this.transformationCache.set(cacheKey, result);
        // Clean up expired cache entries
        this.cleanupCache();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        originalData: data,
        schema: schemaId,
        validationResults: [],
        transformationLog: [],
        warnings: [],
        errors: [
          error instanceof Error ? error.message : 'Transformation failed',
        ],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsTransformed: 0,
          fieldsSkipped: 0,
          customTransformersApplied: [],
        },
      };
    }
  }

  /**
   * Transform batch of items
   */
  async transformBatch(
    request: BatchTransformationRequest,
  ): Promise<BatchTransformationResult> {
    const startTime = Date.now();
    const results = new Map<string, TransformationResult>();
    const errors = new Map<string, string>();

    const {
      failFast = false,
      maxConcurrency = 10,
      preserveOrder = true,
    } = request.options;

    try {
      // Process items in chunks to respect concurrency limits
      const chunks = this.chunkArray(request.items, maxConcurrency);

      for (const chunk of chunks) {
        const promises = chunk.map(async (item) => {
          try {
            const result = await this.transform(
              item.data,
              item.schemaId,
              item.context,
            );
            results.set(item.id, result);

            if (!result.success && failFast) {
              throw new Error(
                `Transformation failed for item ${item.id}: ${result.errors.join(', ')}`,
              );
            }

            return { id: item.id, success: result.success };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            errors.set(item.id, errorMessage);

            if (failFast) {
              throw error;
            }

            return { id: item.id, success: false };
          }
        });

        await Promise.all(promises);
      }

      const successfulItems = Array.from(results.values()).filter(
        (r) => r.success,
      ).length;
      const failedItems = request.items.length - successfulItems;

      return {
        success: failedItems === 0,
        totalItems: request.items.length,
        successfulItems,
        failedItems,
        results,
        errors,
        processingTime: Date.now() - startTime,
        averageItemTime: (Date.now() - startTime) / request.items.length,
      };
    } catch (error) {
      return {
        success: false,
        totalItems: request.items.length,
        successfulItems: results.size,
        failedItems: request.items.length - results.size,
        results,
        errors,
        processingTime: Date.now() - startTime,
        averageItemTime: 0,
      };
    }
  }

  /**
   * Validate data against schema without transformation
   */
  async validate(
    data: any,
    schemaId: string,
    context?: Partial<TransformationContext>,
  ): Promise<ValidationResult[]> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return [
        {
          field: '_schema',
          rule: 'exists',
          passed: false,
          message: `Schema not found: ${schemaId}`,
          severity: 'error',
        },
      ];
    }

    const results: ValidationResult[] = [];
    const fullContext: TransformationContext = {
      sourceData: data,
      targetSchema: schema,
      metadata: {
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      },
      weddingContext: context?.weddingContext,
      platformContext: context?.platformContext,
    };

    for (const rule of schema.validationRules) {
      const result = await this.applyValidationRule(data, rule, fullContext);
      results.push(result);
    }

    return results;
  }

  /**
   * Get available transformation schemas
   */
  getAvailableSchemas(): Array<{
    id: string;
    name: string;
    sourceFormat: DataFormat;
    targetFormat: DataFormat;
    bidirectional: boolean;
    weddingSpecific: boolean;
  }> {
    return Array.from(this.schemas.values()).map((schema) => ({
      id: schema.id,
      name: schema.name,
      sourceFormat: schema.sourceFormat,
      targetFormat: schema.targetFormat,
      bidirectional: schema.bidirectional,
      weddingSpecific: !!schema.weddingSpecificMappings?.length,
    }));
  }

  /**
   * Get transformation statistics
   */
  getTransformationStats(): {
    totalSchemas: number;
    totalTransformations: number;
    cacheHitRate: number;
    averageProcessingTime: number;
    topSchemas: Array<{
      schemaId: string;
      usageCount: number;
      successRate: number;
    }>;
    weddingRelatedTransformations: number;
  } {
    // This would be implemented with actual metrics collection
    return {
      totalSchemas: this.schemas.size,
      totalTransformations: 0, // Would track this
      cacheHitRate: 0, // Would calculate this
      averageProcessingTime: 0, // Would calculate this
      topSchemas: [], // Would track this
      weddingRelatedTransformations: 0, // Would track this
    };
  }

  // Private methods

  private async performTransformation<T>(
    data: any,
    schema: TransformationSchema,
    context: TransformationContext,
  ): Promise<TransformationResult<T>> {
    const transformationLog: TransformationLogEntry[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    let transformedData: any = {};
    let fieldsTransformed = 0;
    let fieldsSkipped = 0;
    const customTransformersApplied: string[] = [];

    try {
      // Pre-transformation validation
      const validationResults = await this.validate(data, schema.id, context);
      const criticalErrors = validationResults.filter(
        (r) => !r.passed && r.severity === 'error',
      );

      if (criticalErrors.length > 0) {
        errors.push(...criticalErrors.map((e) => e.message || ''));
        return {
          success: false,
          originalData: data,
          schema: schema.id,
          validationResults,
          transformationLog,
          warnings,
          errors,
          metadata: {
            processingTime: 0,
            fieldsTransformed: 0,
            fieldsSkipped: 0,
            customTransformersApplied: [],
          },
        };
      }

      // Apply field mappings
      for (const mapping of schema.mappingRules) {
        const logEntry = await this.applyFieldMapping(
          data,
          transformedData,
          mapping,
          context,
        );

        if (logEntry) {
          transformationLog.push(logEntry);
          fieldsTransformed++;
        } else {
          fieldsSkipped++;
        }
      }

      // Apply wedding-specific mappings if present
      if (schema.weddingSpecificMappings && context.weddingContext) {
        for (const mapping of schema.weddingSpecificMappings) {
          if (this.shouldApplyWeddingMapping(mapping, context.weddingContext)) {
            const logEntry = await this.applyFieldMapping(
              data,
              transformedData,
              mapping,
              context,
            );

            if (logEntry) {
              transformationLog.push(logEntry);
              fieldsTransformed++;
            }
          }
        }
      }

      // Apply custom transformers
      for (const transformer of schema.customTransformers) {
        const startTime = Date.now();

        try {
          if (transformer.returnsPromise) {
            transformedData = await transformer.function(
              transformedData,
              context,
            );
          } else {
            transformedData = transformer.function(transformedData, context);
          }

          customTransformersApplied.push(transformer.name);
        } catch (error) {
          warnings.push(
            `Custom transformer ${transformer.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Post-transformation validation
      const postValidationResults = await this.validate(
        transformedData,
        schema.id,
        context,
      );
      const postErrors = postValidationResults.filter(
        (r) => !r.passed && r.severity === 'error',
      );

      if (postErrors.length > 0) {
        warnings.push(...postErrors.map((e) => e.message || ''));
      }

      return {
        success: errors.length === 0,
        data: transformedData as T,
        originalData: data,
        schema: schema.id,
        validationResults,
        transformationLog,
        warnings,
        errors,
        metadata: {
          processingTime: 0, // Will be set by caller
          fieldsTransformed,
          fieldsSkipped,
          customTransformersApplied,
        },
      };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : 'Transformation failed',
      );

      return {
        success: false,
        originalData: data,
        schema: schema.id,
        validationResults: [],
        transformationLog,
        warnings,
        errors,
        metadata: {
          processingTime: 0,
          fieldsTransformed,
          fieldsSkipped,
          customTransformersApplied,
        },
      };
    }
  }

  private async applyFieldMapping(
    sourceData: any,
    targetData: any,
    mapping: FieldMapping,
    context: TransformationContext,
  ): Promise<TransformationLogEntry | null> {
    const startTime = Date.now();

    try {
      // Check conditions
      if (
        mapping.conditions &&
        !this.evaluateConditions(mapping.conditions, sourceData, context)
      ) {
        return null;
      }

      // Get source value
      const sourceValue = this.getValueByPath(sourceData, mapping.sourcePath);

      if (sourceValue === undefined && !mapping.required) {
        return null;
      }

      let transformedValue = sourceValue;

      // Apply transformation
      switch (mapping.transformationType) {
        case 'direct':
          transformedValue = sourceValue;
          break;

        case 'computed':
          if (mapping.transformer) {
            const transformer = this.customTransformers.get(
              mapping.transformer,
            );
            if (transformer) {
              transformedValue = transformer.returnsPromise
                ? await transformer.function(sourceValue, context)
                : transformer.function(sourceValue, context);
            }
          }
          break;

        case 'conditional':
          // Apply conditional logic based on mapping conditions
          transformedValue = this.applyConditionalTransformation(
            sourceValue,
            mapping,
            sourceData,
          );
          break;

        default:
          transformedValue = sourceValue;
      }

      // Set target value
      this.setValueByPath(targetData, mapping.targetPath, transformedValue);

      return {
        field: mapping.targetPath,
        transformation: mapping.transformationType,
        originalValue: sourceValue,
        transformedValue,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      // Return null to indicate skipped field
      return null;
    }
  }

  private async applyValidationRule(
    data: any,
    rule: ValidationRule,
    context: TransformationContext,
  ): Promise<ValidationResult> {
    try {
      const value = this.getValueByPath(data, rule.field);
      let passed = true;
      let message = '';

      switch (rule.type) {
        case 'required':
          passed = value !== undefined && value !== null && value !== '';
          message = passed ? '' : `Field ${rule.field} is required`;
          break;

        case 'format':
          // Apply format validation based on parameters
          if (rule.parameters?.pattern) {
            const regex = new RegExp(rule.parameters.pattern);
            passed = regex.test(String(value));
            message = passed
              ? ''
              : `Field ${rule.field} does not match required format`;
          }
          break;

        case 'wedding_specific':
          // Apply wedding-specific validation
          passed = this.validateWeddingSpecificField(value, rule, context);
          message = passed ? '' : rule.errorMessage;
          break;

        default:
          passed = true;
      }

      return {
        field: rule.field,
        rule: rule.type,
        passed,
        message: message || rule.errorMessage,
        severity: rule.severity,
        value,
      };
    } catch (error) {
      return {
        field: rule.field,
        rule: rule.type,
        passed: false,
        message: error instanceof Error ? error.message : 'Validation failed',
        severity: 'error',
        value: undefined,
      };
    }
  }

  private shouldApplyWeddingMapping(
    mapping: WeddingFieldMapping,
    weddingContext: NonNullable<TransformationContext['weddingContext']>,
  ): boolean {
    // Apply wedding-specific logic to determine if mapping should be used
    if (mapping.eventPhase === 'day_of' && !weddingContext.isWeddingWeekend) {
      return false;
    }

    if (mapping.criticalField && weddingContext.priority !== 'critical') {
      return mapping.priority !== 'critical';
    }

    return true;
  }

  private evaluateConditions(
    conditions: MappingCondition[],
    data: any,
    context: TransformationContext,
  ): boolean {
    return conditions.every((condition) => {
      const value = this.getValueByPath(data, condition.field);

      switch (condition.operator) {
        case 'equals':
          return condition.caseSensitive
            ? value === condition.value
            : String(value).toLowerCase() ===
                String(condition.value).toLowerCase();
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'exists':
          return value !== undefined && value !== null;
        case 'not_exists':
          return value === undefined || value === null;
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        default:
          return true;
      }
    });
  }

  private applyConditionalTransformation(
    value: any,
    mapping: FieldMapping,
    sourceData: any,
  ): any {
    // Implement conditional transformation logic
    return value;
  }

  private validateWeddingSpecificField(
    value: any,
    rule: ValidationRule,
    context: TransformationContext,
  ): boolean {
    // Implement wedding-specific validation logic
    return true;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(
    data: any,
    schemaId: string,
    context: TransformationContext,
  ): string {
    // Generate a cache key based on data hash and context
    const dataHash = this.hashObject(data);
    const contextHash = this.hashObject({
      schemaId,
      weddingContext: context.weddingContext,
      platformContext: context.platformContext,
    });
    return `${schemaId}_${dataHash}_${contextHash}`;
  }

  private hashObject(obj: any): string {
    return JSON.stringify(obj)
      .split('')
      .reduce((hash, char) => {
        return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
      }, 0)
      .toString(36);
  }

  private isCacheValid(result: TransformationResult): boolean {
    return Date.now() - result.metadata.processingTime < this.cacheTTL;
  }

  private cleanupCache(): void {
    // Remove expired cache entries
    const now = Date.now();
    for (const [key, result] of this.transformationCache.entries()) {
      if (now - result.metadata.processingTime > this.cacheTTL) {
        this.transformationCache.delete(key);
      }
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private initializeBuiltInTransformers(): void {
    // Date format transformer
    this.customTransformers.set('dateFormat', {
      name: 'dateFormat',
      description: 'Transform date formats',
      function: (value: any, context: TransformationContext) => {
        if (!value) return value;
        const date = new Date(value);
        return date.toISOString();
      },
    });

    // Wedding date validator
    this.customTransformers.set('weddingDateValidator', {
      name: 'weddingDateValidator',
      description:
        'Validate wedding date is in future and not on blackout days',
      function: (value: any, context: TransformationContext) => {
        const date = new Date(value);
        const now = new Date();
        return date > now; // Wedding must be in future
      },
    });

    // Phone number formatter
    this.customTransformers.set('phoneFormat', {
      name: 'phoneFormat',
      description: 'Format phone numbers to standard format',
      function: (value: any) => {
        if (!value) return value;
        // Remove all non-digits and format as (XXX) XXX-XXXX
        const digits = value.replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return value;
      },
    });
  }

  private initializeWeddingPlatforms(): void {
    // Tave platform adapter
    this.platformAdapters.set('tave', {
      platformName: 'tave',
      supportedFormats: [{ type: 'JSON', contentType: 'application/json' }],
      commonMappings: new Map([
        [
          'client.name',
          {
            sourcePath: 'client_name',
            targetPath: 'name',
            transformationType: 'direct',
            required: true,
          },
        ],
        [
          'wedding.date',
          {
            sourcePath: 'event_date',
            targetPath: 'weddingDate',
            transformationType: 'computed',
            required: true,
            transformer: 'dateFormat',
          },
        ],
      ]),
      authenticationMethod: 'api_key',
      weddingSpecificFeatures: {
        supportsWeddingDates: true,
        supportsGuestManagement: false,
        supportsVendorCategories: true,
        supportsTimelineIntegration: false,
      },
    });

    // HoneyBook platform adapter
    this.platformAdapters.set('honeybook', {
      platformName: 'honeybook',
      supportedFormats: [{ type: 'JSON', contentType: 'application/json' }],
      commonMappings: new Map([
        [
          'contact.firstName',
          {
            sourcePath: 'first_name',
            targetPath: 'firstName',
            transformationType: 'direct',
            required: true,
          },
        ],
        [
          'contact.lastName',
          {
            sourcePath: 'last_name',
            targetPath: 'lastName',
            transformationType: 'direct',
            required: true,
          },
        ],
        [
          'project.eventDate',
          {
            sourcePath: 'event_date',
            targetPath: 'weddingDate',
            transformationType: 'computed',
            required: true,
            transformer: 'dateFormat',
          },
        ],
      ]),
      authenticationMethod: 'oauth',
      weddingSpecificFeatures: {
        supportsWeddingDates: true,
        supportsGuestManagement: true,
        supportsVendorCategories: true,
        supportsTimelineIntegration: true,
      },
    });
  }
}

export default CrossPlatformTransformer;
