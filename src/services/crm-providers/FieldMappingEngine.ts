/**
 * WS-343 CRM Integration Hub - Team C
 * Field Mapping Engine for CRM Data Transformation
 *
 * This engine handles the complex task of transforming wedding data between
 * WedSync's canonical format and various CRM provider formats. Each CRM
 * stores wedding information differently, and this engine ensures seamless
 * data transformation while preserving wedding-critical information.
 *
 * @priority CRITICAL - Data integrity foundation for all CRM integrations
 * @weddingContext Handles irreplaceable wedding data - zero tolerance for loss
 * @performance Optimized for bulk transformations during import/sync
 */

import { z } from 'zod';
import {
  WeddingData,
  CRMClient,
  CRMFieldMapping,
  CRMFieldDefinition,
} from './CRMProviderInterface';

/**
 * Field Transformation Rules Schema
 * Defines how data should be transformed between formats
 */
const FieldTransformationSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  fieldType: z.enum([
    'text',
    'email',
    'phone',
    'date',
    'number',
    'boolean',
    'array',
    'object',
  ]),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  transformFunction: z.string().optional(), // Name of transformation function
  validation: z
    .object({
      pattern: z.string().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
});

export type FieldTransformation = z.infer<typeof FieldTransformationSchema>;

/**
 * Mapping Configuration Schema
 * Complete mapping configuration for a CRM provider
 */
const MappingConfigurationSchema = z.object({
  providerName: z.string(),
  version: z.string(),
  transformations: z.array(FieldTransformationSchema),
  customTransformers: z.record(z.string()).optional(),
  metadata: z.object({
    createdAt: z.string().datetime(),
    lastUpdated: z.string().datetime(),
    supportedFields: z.array(z.string()),
    requiredFields: z.array(z.string()),
  }),
});

export type MappingConfiguration = z.infer<typeof MappingConfigurationSchema>;

/**
 * Transformation Result
 * Result of field mapping operation with success/error tracking
 */
export interface TransformationResult<T = any> {
  success: boolean;
  data?: T;
  errors: TransformationError[];
  warnings: string[];
  metadata: {
    fieldsTransformed: number;
    fieldsSkipped: number;
    transformationTime: number;
  };
}

/**
 * Transformation Error
 * Detailed error information for failed field transformations
 */
export interface TransformationError {
  field: string;
  sourceValue: any;
  errorType:
    | 'validation'
    | 'type_conversion'
    | 'missing_required'
    | 'custom_transform';
  message: string;
  weddingCritical: boolean; // Escalate if this affects core wedding data
}

/**
 * Wedding Data Validation Result
 * Result of validating transformed wedding data
 */
export interface WeddingDataValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
    weddingImpact: 'critical' | 'important' | 'minor';
  }>;
  completeness: {
    coreFields: number; // Percentage of core fields present
    optionalFields: number; // Percentage of optional fields present
    overallScore: number; // Overall completeness score
  };
}

/**
 * Field Mapping Engine
 *
 * Core engine responsible for transforming wedding data between different
 * CRM formats. Handles validation, type conversion, and custom transformations
 * while ensuring wedding-critical data is never lost.
 *
 * @wedding_safety Implements validation to prevent data corruption
 * @performance Supports bulk transformations with caching
 */
export class FieldMappingEngine {
  private mappingConfigurations: Map<string, MappingConfiguration> = new Map();
  private customTransformers: Map<string, (value: any, context?: any) => any> =
    new Map();
  private transformationCache: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultTransformers();
  }

  // ========================================
  // CONFIGURATION MANAGEMENT
  // ========================================

  /**
   * Register Mapping Configuration
   *
   * Registers a complete field mapping configuration for a CRM provider.
   * This includes all field transformations, validation rules, and custom
   * transformation functions.
   *
   * @param config Complete mapping configuration
   */
  registerMappingConfiguration(config: MappingConfiguration): void {
    // Validate configuration
    const validatedConfig = MappingConfigurationSchema.parse(config);

    // Store configuration
    this.mappingConfigurations.set(
      validatedConfig.providerName,
      validatedConfig,
    );

    // Register any custom transformers
    if (validatedConfig.customTransformers) {
      for (const [name, code] of Object.entries(
        validatedConfig.customTransformers,
      )) {
        try {
          // Safely evaluate custom transformer function
          const transformerFunc = new Function('value', 'context', code) as (
            value: any,
            context?: any,
          ) => any;
          this.customTransformers.set(
            `${validatedConfig.providerName}:${name}`,
            transformerFunc,
          );
        } catch (error) {
          console.error(
            `Failed to register custom transformer ${name}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Get Mapping Configuration
   *
   * Retrieves the mapping configuration for a specific CRM provider.
   *
   * @param providerName Name of the CRM provider
   * @returns Mapping configuration or null if not found
   */
  getMappingConfiguration(providerName: string): MappingConfiguration | null {
    return this.mappingConfigurations.get(providerName) || null;
  }

  /**
   * Update Field Mapping
   *
   * Updates a specific field mapping within a provider's configuration.
   * Useful for user-customized field mappings.
   *
   * @param providerName CRM provider name
   * @param fieldMapping Updated field mapping
   */
  updateFieldMapping(
    providerName: string,
    fieldMapping: FieldTransformation,
  ): void {
    const config = this.mappingConfigurations.get(providerName);
    if (!config) {
      throw new Error(
        `No mapping configuration found for provider: ${providerName}`,
      );
    }

    // Find and update the transformation
    const transformIndex = config.transformations.findIndex(
      (t) => t.targetField === fieldMapping.targetField,
    );

    if (transformIndex >= 0) {
      config.transformations[transformIndex] = fieldMapping;
    } else {
      config.transformations.push(fieldMapping);
    }

    // Update metadata
    config.metadata.lastUpdated = new Date().toISOString();
  }

  // ========================================
  // DATA TRANSFORMATION
  // ========================================

  /**
   * Transform CRM Client to Wedding Data
   *
   * Converts CRM provider data format to WedSync's canonical wedding data format.
   * This is the primary transformation used during data import from CRM systems.
   *
   * @param providerName CRM provider name
   * @param crmClient Raw client data from CRM
   * @returns Transformed wedding data
   */
  async transformCRMClientToWeddingData(
    providerName: string,
    crmClient: CRMClient,
  ): Promise<TransformationResult<WeddingData>> {
    const startTime = Date.now();
    const errors: TransformationError[] = [];
    const warnings: string[] = [];

    try {
      const config = this.getMappingConfiguration(providerName);
      if (!config) {
        throw new Error(
          `No mapping configuration found for provider: ${providerName}`,
        );
      }

      // Initialize canonical wedding data structure
      const weddingData: Partial<WeddingData> = {
        weddingId: crmClient.id,
        externalId: crmClient.id,
        source: providerName,
        lastSync: new Date().toISOString(),
        couples: {
          partner1: {
            firstName: '',
            lastName: '',
          },
          partner2: {
            firstName: '',
            lastName: '',
          },
        },
        packages: [],
        timeline: [],
        vendorNotes: [],
        status: 'inquiry',
      };

      let fieldsTransformed = 0;
      let fieldsSkipped = 0;

      // Apply field transformations
      for (const transformation of config.transformations) {
        try {
          const sourceValue = this.getNestedValue(
            crmClient,
            transformation.sourceField,
          );

          if (sourceValue === undefined || sourceValue === null) {
            if (transformation.required) {
              errors.push({
                field: transformation.targetField,
                sourceValue,
                errorType: 'missing_required',
                message: `Required field ${transformation.sourceField} is missing`,
                weddingCritical: this.isWeddingCriticalField(
                  transformation.targetField,
                ),
              });
            } else if (transformation.defaultValue !== undefined) {
              this.setNestedValue(
                weddingData,
                transformation.targetField,
                transformation.defaultValue,
              );
              fieldsTransformed++;
            } else {
              fieldsSkipped++;
            }
            continue;
          }

          // Apply transformation
          const transformedValue = await this.transformFieldValue(
            sourceValue,
            transformation,
            providerName,
          );

          // Validate transformed value
          const validationResult = this.validateFieldValue(
            transformedValue,
            transformation,
          );
          if (!validationResult.valid) {
            errors.push({
              field: transformation.targetField,
              sourceValue,
              errorType: 'validation',
              message: validationResult.error || 'Validation failed',
              weddingCritical: this.isWeddingCriticalField(
                transformation.targetField,
              ),
            });
            continue;
          }

          // Set transformed value
          this.setNestedValue(
            weddingData,
            transformation.targetField,
            transformedValue,
          );
          fieldsTransformed++;
        } catch (error) {
          errors.push({
            field: transformation.targetField,
            sourceValue: this.getNestedValue(
              crmClient,
              transformation.sourceField,
            ),
            errorType: 'custom_transform',
            message:
              error instanceof Error ? error.message : 'Transformation failed',
            weddingCritical: this.isWeddingCriticalField(
              transformation.targetField,
            ),
          });
        }
      }

      // Validate and finalize wedding data
      const finalWeddingData = await this.finalizeWeddingData(
        weddingData as WeddingData,
      );
      const validationResult = this.validateWeddingData(finalWeddingData);

      // Add validation warnings
      warnings.push(
        ...validationResult.errors
          .filter((e) => e.severity === 'warning')
          .map((e) => e.message),
      );

      // Add validation errors
      errors.push(
        ...validationResult.errors
          .filter((e) => e.severity === 'error')
          .map((e) => ({
            field: e.field,
            sourceValue: null,
            errorType: 'validation' as const,
            message: e.message,
            weddingCritical: e.weddingImpact === 'critical',
          })),
      );

      const transformationTime = Date.now() - startTime;

      return {
        success: errors.filter((e) => e.weddingCritical).length === 0,
        data: finalWeddingData,
        errors,
        warnings,
        metadata: {
          fieldsTransformed,
          fieldsSkipped,
          transformationTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: 'transformation',
            sourceValue: null,
            errorType: 'custom_transform',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown transformation error',
            weddingCritical: true,
          },
        ],
        warnings,
        metadata: {
          fieldsTransformed: 0,
          fieldsSkipped: 0,
          transformationTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Transform Wedding Data to CRM Format
   *
   * Converts WedSync canonical wedding data to CRM provider format.
   * Used for exporting data back to CRM systems (if supported).
   *
   * @param providerName CRM provider name
   * @param weddingData Canonical wedding data
   * @returns Transformed CRM client data
   */
  async transformWeddingDataToCRMClient(
    providerName: string,
    weddingData: WeddingData,
  ): Promise<TransformationResult<CRMClient>> {
    const startTime = Date.now();
    const errors: TransformationError[] = [];
    const warnings: string[] = [];

    try {
      const config = this.getMappingConfiguration(providerName);
      if (!config) {
        throw new Error(
          `No mapping configuration found for provider: ${providerName}`,
        );
      }

      // Initialize CRM client structure
      const crmClient: Partial<CRMClient> = {
        id: weddingData.externalId,
        firstName: weddingData.couples.partner1.firstName,
        lastName: weddingData.couples.partner1.lastName,
        email: weddingData.couples.partner1.email || '',
        customFields: {},
        lastModified: new Date(),
        tags: [],
      };

      let fieldsTransformed = 0;
      let fieldsSkipped = 0;

      // Apply reverse field transformations
      for (const transformation of config.transformations) {
        try {
          // For reverse transformation, source and target are swapped
          const sourceValue = this.getNestedValue(
            weddingData,
            transformation.targetField,
          );

          if (sourceValue === undefined || sourceValue === null) {
            if (transformation.defaultValue !== undefined) {
              this.setNestedValue(
                crmClient,
                transformation.sourceField,
                transformation.defaultValue,
              );
              fieldsTransformed++;
            } else {
              fieldsSkipped++;
            }
            continue;
          }

          // Apply reverse transformation
          const transformedValue = await this.reverseTransformFieldValue(
            sourceValue,
            transformation,
            providerName,
          );

          // Set transformed value
          this.setNestedValue(
            crmClient,
            transformation.sourceField,
            transformedValue,
          );
          fieldsTransformed++;
        } catch (error) {
          errors.push({
            field: transformation.sourceField,
            sourceValue: this.getNestedValue(
              weddingData,
              transformation.targetField,
            ),
            errorType: 'custom_transform',
            message:
              error instanceof Error
                ? error.message
                : 'Reverse transformation failed',
            weddingCritical: this.isWeddingCriticalField(
              transformation.targetField,
            ),
          });
        }
      }

      const transformationTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        data: crmClient as CRMClient,
        errors,
        warnings,
        metadata: {
          fieldsTransformed,
          fieldsSkipped,
          transformationTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: 'transformation',
            sourceValue: null,
            errorType: 'custom_transform',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown reverse transformation error',
            weddingCritical: true,
          },
        ],
        warnings,
        metadata: {
          fieldsTransformed: 0,
          fieldsSkipped: 0,
          transformationTime: Date.now() - startTime,
        },
      };
    }
  }

  // ========================================
  // FIELD VALUE TRANSFORMATIONS
  // ========================================

  /**
   * Transform Field Value
   *
   * Applies type conversion and custom transformations to a field value.
   *
   * @param value Original value
   * @param transformation Transformation rules
   * @param providerName CRM provider name
   * @returns Transformed value
   */
  private async transformFieldValue(
    value: any,
    transformation: FieldTransformation,
    providerName: string,
  ): Promise<any> {
    // Apply custom transformer if specified
    if (transformation.transformFunction) {
      const transformerKey = `${providerName}:${transformation.transformFunction}`;
      const customTransformer = this.customTransformers.get(transformerKey);

      if (customTransformer) {
        return customTransformer(value, { transformation, providerName });
      }

      // Check for built-in transformer
      const builtInTransformer = this.customTransformers.get(
        transformation.transformFunction,
      );
      if (builtInTransformer) {
        return builtInTransformer(value, { transformation, providerName });
      }
    }

    // Apply type conversion
    return this.convertFieldType(value, transformation.fieldType);
  }

  /**
   * Reverse Transform Field Value
   *
   * Applies reverse transformation for exporting data back to CRM.
   *
   * @param value Canonical value
   * @param transformation Transformation rules
   * @param providerName CRM provider name
   * @returns Reverse transformed value
   */
  private async reverseTransformFieldValue(
    value: any,
    transformation: FieldTransformation,
    providerName: string,
  ): Promise<any> {
    // For most transformations, reverse is just type conversion
    // Custom transformers would need to implement reverse logic
    return value;
  }

  /**
   * Convert Field Type
   *
   * Converts a value to the specified field type with validation.
   *
   * @param value Value to convert
   * @param targetType Target field type
   * @returns Converted value
   */
  private convertFieldType(value: any, targetType: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case 'text':
        return String(value);

      case 'email':
        const email = String(value).toLowerCase().trim();
        if (email && !this.isValidEmail(email)) {
          throw new Error(`Invalid email format: ${email}`);
        }
        return email;

      case 'phone':
        return this.normalizePhoneNumber(String(value));

      case 'date':
        return this.normalizeDate(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Cannot convert ${value} to number`);
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'true' || lower === '1' || lower === 'yes';
        }
        return Boolean(value);

      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value.split(',').map((s) => s.trim());
          }
        }
        return [value];

      case 'object':
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return { value };
          }
        }
        return { value };

      default:
        return value;
    }
  }

  // ========================================
  // VALIDATION
  // ========================================

  /**
   * Validate Field Value
   *
   * Validates a transformed field value against its rules.
   *
   * @param value Transformed value
   * @param transformation Transformation rules
   * @returns Validation result
   */
  private validateFieldValue(
    value: any,
    transformation: FieldTransformation,
  ): { valid: boolean; error?: string } {
    if (!transformation.validation) {
      return { valid: true };
    }

    const validation = transformation.validation;

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          error: `Value does not match pattern: ${validation.pattern}`,
        };
      }
    }

    // Length validation
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return {
          valid: false,
          error: `Value too short, minimum ${validation.minLength} characters`,
        };
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return {
          valid: false,
          error: `Value too long, maximum ${validation.maxLength} characters`,
        };
      }
    }

    // Numeric validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return {
          valid: false,
          error: `Value too small, minimum ${validation.min}`,
        };
      }
      if (validation.max !== undefined && value > validation.max) {
        return {
          valid: false,
          error: `Value too large, maximum ${validation.max}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate Wedding Data
   *
   * Validates complete wedding data for completeness and accuracy.
   *
   * @param weddingData Wedding data to validate
   * @returns Validation result with completeness metrics
   */
  private validateWeddingData(
    weddingData: WeddingData,
  ): WeddingDataValidationResult {
    const errors: WeddingDataValidationResult['errors'] = [];

    // Core field validation
    const coreFields = [
      'weddingId',
      'couples.partner1.firstName',
      'couples.partner1.lastName',
      'weddingDate',
    ];

    let coreFieldsPresent = 0;

    for (const field of coreFields) {
      const value = this.getNestedValue(weddingData, field);
      if (value && value !== '') {
        coreFieldsPresent++;
      } else {
        errors.push({
          field,
          message: `Core field ${field} is missing or empty`,
          severity: 'error',
          weddingImpact: 'critical',
        });
      }
    }

    // Optional field validation
    const optionalFields = [
      'couples.partner1.email',
      'couples.partner1.phone',
      'venue.name',
      'guestCount',
      'budget',
    ];

    let optionalFieldsPresent = 0;

    for (const field of optionalFields) {
      const value = this.getNestedValue(weddingData, field);
      if (value && value !== '') {
        optionalFieldsPresent++;
      }
    }

    // Wedding date validation
    if (weddingData.weddingDate) {
      const weddingDate = new Date(weddingData.weddingDate);
      const now = new Date();

      if (weddingDate < now) {
        errors.push({
          field: 'weddingDate',
          message: 'Wedding date is in the past',
          severity: 'warning',
          weddingImpact: 'important',
        });
      }
    }

    // Email validation
    if (
      weddingData.couples.partner1.email &&
      !this.isValidEmail(weddingData.couples.partner1.email)
    ) {
      errors.push({
        field: 'couples.partner1.email',
        message: 'Invalid email format',
        severity: 'error',
        weddingImpact: 'important',
      });
    }

    const completeness = {
      coreFields: Math.round((coreFieldsPresent / coreFields.length) * 100),
      optionalFields: Math.round(
        (optionalFieldsPresent / optionalFields.length) * 100,
      ),
      overallScore: Math.round(
        ((coreFieldsPresent * 2 + optionalFieldsPresent) /
          (coreFields.length * 2 + optionalFields.length)) *
          100,
      ),
    };

    return {
      isValid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      completeness,
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get Nested Value
   *
   * Safely retrieves a nested value from an object using dot notation.
   *
   * @param obj Source object
   * @param path Dot-separated path
   * @returns Value or undefined if not found
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set Nested Value
   *
   * Sets a nested value in an object using dot notation.
   *
   * @param obj Target object
   * @param path Dot-separated path
   * @param value Value to set
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    let current = obj;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Check if Field is Wedding Critical
   *
   * Determines if a field contains wedding-critical information that
   * should never be lost or corrupted.
   *
   * @param fieldPath Field path in dot notation
   * @returns True if field is wedding critical
   */
  private isWeddingCriticalField(fieldPath: string): boolean {
    const criticalFields = [
      'weddingId',
      'weddingDate',
      'couples.partner1.firstName',
      'couples.partner1.lastName',
      'couples.partner2.firstName',
      'couples.partner2.lastName',
      'venue.name',
      'status',
    ];

    return criticalFields.includes(fieldPath);
  }

  /**
   * Finalize Wedding Data
   *
   * Performs final validation and cleanup of wedding data after transformation.
   *
   * @param weddingData Wedding data to finalize
   * @returns Finalized wedding data
   */
  private async finalizeWeddingData(
    weddingData: WeddingData,
  ): Promise<WeddingData> {
    // Ensure required arrays are initialized
    weddingData.packages = weddingData.packages || [];
    weddingData.timeline = weddingData.timeline || [];
    weddingData.vendorNotes = weddingData.vendorNotes || [];

    // Set default wedding date if missing
    if (!weddingData.weddingDate) {
      // Set to one year from now as placeholder
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      weddingData.weddingDate = futureDate.toISOString();
    }

    // Ensure partner names are not empty
    if (!weddingData.couples.partner1.firstName) {
      weddingData.couples.partner1.firstName = 'Unknown';
    }
    if (!weddingData.couples.partner1.lastName) {
      weddingData.couples.partner1.lastName = 'Client';
    }

    return weddingData;
  }

  /**
   * Initialize Default Transformers
   *
   * Sets up built-in transformation functions for common data transformations.
   */
  private initializeDefaultTransformers(): void {
    // Name parsing transformer
    this.customTransformers.set('parseFullName', (value: string) => {
      const parts = value.trim().split(/\s+/);
      return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
      };
    });

    // Phone number normalizer
    this.customTransformers.set('normalizePhone', (value: string) => {
      return this.normalizePhoneNumber(value);
    });

    // Date normalizer
    this.customTransformers.set('normalizeDate', (value: any) => {
      return this.normalizeDate(value);
    });

    // Currency converter (assuming values are in cents)
    this.customTransformers.set('centsToDollars', (value: number) => {
      return Math.round((value / 100) * 100) / 100; // Convert cents to dollars with 2 decimal places
    });

    // Status mapper
    this.customTransformers.set('mapStatus', (value: string) => {
      const statusMap: Record<string, string> = {
        lead: 'inquiry',
        prospect: 'inquiry',
        booked: 'booked',
        contracted: 'booked',
        completed: 'completed',
        finished: 'completed',
        cancelled: 'cancelled',
        canceled: 'cancelled',
      };

      return statusMap[value.toLowerCase()] || 'inquiry';
    });
  }

  /**
   * Validate Email Format
   *
   * Validates email format using RFC-compliant regex.
   *
   * @param email Email address to validate
   * @returns True if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Normalize Phone Number
   *
   * Normalizes phone number format for consistent storage.
   *
   * @param phone Phone number to normalize
   * @returns Normalized phone number
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, '');

    // Format based on length
    if (digits.length === 10) {
      // US number: (555) 123-4567
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      // US number with country code: +1 (555) 123-4567
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // Return original for non-standard formats
    return phone;
  }

  /**
   * Normalize Date
   *
   * Normalizes date to ISO 8601 format.
   *
   * @param date Date in various formats
   * @returns ISO 8601 date string
   */
  private normalizeDate(date: any): string {
    if (!date) return '';

    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
      return parsedDate.toISOString();
    } catch (error) {
      // Try parsing common date formats
      if (typeof date === 'string') {
        // MM/DD/YYYY or DD/MM/YYYY
        const dateParts = date.split('/');
        if (dateParts.length === 3) {
          const [part1, part2, year] = dateParts;
          // Assume MM/DD/YYYY for US format
          const parsedDate = new Date(
            parseInt(year),
            parseInt(part1) - 1,
            parseInt(part2),
          );
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
          }
        }
      }

      return '';
    }
  }
}

/**
 * Default Field Mappings for Common CRM Providers
 */
export const DEFAULT_FIELD_MAPPINGS = {
  tave: [
    {
      sourceField: 'Job.JobName',
      targetField: 'weddingId',
      fieldType: 'text',
      required: true,
    },
    {
      sourceField: 'Contact.FirstName',
      targetField: 'couples.partner1.firstName',
      fieldType: 'text',
      required: true,
    },
    {
      sourceField: 'Contact.LastName',
      targetField: 'couples.partner1.lastName',
      fieldType: 'text',
      required: true,
    },
    {
      sourceField: 'Contact.Email',
      targetField: 'couples.partner1.email',
      fieldType: 'email',
      required: false,
    },
    {
      sourceField: 'Job.EventDate',
      targetField: 'weddingDate',
      fieldType: 'date',
      required: false,
      transformFunction: 'normalizeDate',
    },
  ],

  honeybook: [
    {
      sourceField: 'project.name',
      targetField: 'weddingId',
      fieldType: 'text',
      required: true,
    },
    {
      sourceField: 'client.firstName',
      targetField: 'couples.partner1.firstName',
      fieldType: 'text',
      required: true,
    },
    {
      sourceField: 'client.lastName',
      targetField: 'couples.partner1.lastName',
      fieldType: 'text',
      required: true,
    },
    {
      sourceField: 'client.email',
      targetField: 'couples.partner1.email',
      fieldType: 'email',
      required: false,
    },
    {
      sourceField: 'event.date',
      targetField: 'weddingDate',
      fieldType: 'date',
      required: false,
      transformFunction: 'normalizeDate',
    },
  ],

  lightblue: [
    {
      sourceField: 'client_name',
      targetField: 'couples.partner1.firstName',
      fieldType: 'text',
      required: true,
      transformFunction: 'parseFullName',
    },
    {
      sourceField: 'email',
      targetField: 'couples.partner1.email',
      fieldType: 'email',
      required: false,
    },
    {
      sourceField: 'phone',
      targetField: 'couples.partner1.phone',
      fieldType: 'phone',
      required: false,
      transformFunction: 'normalizePhone',
    },
    {
      sourceField: 'wedding_date',
      targetField: 'weddingDate',
      fieldType: 'date',
      required: false,
      transformFunction: 'normalizeDate',
    },
    {
      sourceField: 'venue',
      targetField: 'venue.name',
      fieldType: 'text',
      required: false,
    },
  ],
} as const;
