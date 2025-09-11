/**
 * Data Mapper for Encryption Integration
 * Handles field-level encryption mapping for WedSync data structures
 *
 * @fileoverview Provides field mapping functionality for encrypted data operations
 * @version 1.0.0
 * @since 2025-01-20
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import type {
  EncryptedField,
  EncryptionMetadata,
  FieldEncryptionConfig,
} from '../../../types/encryption-integration';

/**
 * Wedding data types supported by the encryption system
 */
export type WeddingDataType = 'guest' | 'vendor' | 'payment' | 'timeline';

/**
 * Configuration for field encryption mapping
 */
export interface FieldMappingConfig {
  /** Fields that require encryption */
  encryptedFields: string[];
  /** Fields that should be hashed for searchability */
  searchableFields: string[];
  /** Metadata fields for tracking encryption status */
  metadataFields: string[];
  /** Data validation schema */
  schema?: z.ZodSchema<any>;
}

/**
 * Result of field mapping operation
 */
export interface MappingResult<T = any> {
  /** Successfully mapped data */
  data: T;
  /** Encryption metadata */
  metadata: EncryptionMetadata;
  /** Any validation errors */
  errors?: string[];
  /** Fields that were encrypted */
  encryptedFields: string[];
}

/**
 * Field mapping validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Missing required fields */
  missingFields: string[];
  /** Invalid field types */
  invalidTypes: string[];
}

/**
 * Wedding-specific encryption configurations
 */
const WEDDING_ENCRYPTION_CONFIGS: Record<WeddingDataType, FieldMappingConfig> =
  {
    guest: {
      encryptedFields: [
        'email',
        'phone',
        'address',
        'dietary_restrictions',
        'notes',
      ],
      searchableFields: ['first_name', 'last_name', 'email'],
      metadataFields: [
        'encryption_schema_version',
        'encrypted_at',
        'last_access',
      ],
      schema: z.object({
        id: z.string().uuid(),
        first_name: z.string().min(1).max(100),
        last_name: z.string().min(1).max(100),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        dietary_restrictions: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
    vendor: {
      encryptedFields: [
        'contact_email',
        'contact_phone',
        'business_address',
        'tax_id',
        'bank_details',
        'notes',
      ],
      searchableFields: ['business_name', 'contact_name', 'contact_email'],
      metadataFields: [
        'encryption_schema_version',
        'encrypted_at',
        'compliance_flags',
      ],
      schema: z.object({
        id: z.string().uuid(),
        business_name: z.string().min(1).max(200),
        contact_name: z.string().min(1).max(100),
        contact_email: z.string().email(),
        contact_phone: z.string().optional(),
        business_address: z.string().optional(),
        tax_id: z.string().optional(),
        bank_details: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
    payment: {
      encryptedFields: [
        'card_number',
        'cvv',
        'account_number',
        'routing_number',
        'billing_address',
      ],
      searchableFields: ['payment_method', 'last_four_digits'],
      metadataFields: [
        'encryption_schema_version',
        'encrypted_at',
        'pci_compliance_flags',
      ],
      schema: z.object({
        id: z.string().uuid(),
        payment_method: z.enum(['card', 'bank_transfer', 'check', 'cash']),
        amount: z.number().positive(),
        currency: z.string().length(3),
        card_number: z.string().optional(),
        cvv: z.string().optional(),
        account_number: z.string().optional(),
        routing_number: z.string().optional(),
        billing_address: z.string().optional(),
      }),
    },
    timeline: {
      encryptedFields: [
        'private_notes',
        'vendor_contact_info',
        'location_details',
      ],
      searchableFields: ['title', 'category'],
      metadataFields: ['encryption_schema_version', 'encrypted_at'],
      schema: z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200),
        category: z.string().min(1).max(50),
        scheduled_date: z.string().datetime(),
        private_notes: z.string().optional(),
        vendor_contact_info: z.string().optional(),
        location_details: z.string().optional(),
      }),
    },
  };

/**
 * Creates a searchable hash for encrypted fields
 * @param value - The value to hash
 * @param salt - Optional salt for the hash
 * @returns Searchable hash string
 */
function createSearchableHash(value: string, salt?: string): string {
  const hashInput = salt ? `${value}:${salt}` : value;
  return createHash('sha256')
    .update(hashInput.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

/**
 * Maps plain data fields to encrypted format
 * @param data - Plain data object
 * @param config - Encryption configuration
 * @param encryptionFn - Function to encrypt field values
 * @returns Mapped data with encrypted fields
 */
export async function mapFieldsToEncrypted<T extends Record<string, any>>(
  data: T,
  config: FieldMappingConfig,
  encryptionFn: (value: string) => Promise<EncryptedField>,
): Promise<MappingResult<T>> {
  try {
    const result: any = { ...data };
    const encryptedFields: string[] = [];
    const errors: string[] = [];

    // Validate input data if schema provided
    if (config.schema) {
      try {
        config.schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(
            ...error.issues.map(
              (e) => `Validation error: ${e.path.join('.')}: ${e.message}`,
            ),
          );
        }
      }
    }

    // Encrypt specified fields
    for (const fieldName of config.encryptedFields) {
      const fieldValue = data[fieldName];

      if (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue !== ''
      ) {
        try {
          const encrypted = await encryptionFn(String(fieldValue));
          result[fieldName] = encrypted;
          encryptedFields.push(fieldName);

          // Create searchable hash for searchable fields
          if (config.searchableFields.includes(fieldName)) {
            const hashFieldName = `${fieldName}_search_hash`;
            result[hashFieldName] = createSearchableHash(String(fieldValue));
          }
        } catch (error) {
          errors.push(
            `Failed to encrypt field '${fieldName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    // Add encryption metadata
    const metadata: EncryptionMetadata = {
      legal_basis: 'legitimate_interests',
      retention_days: 2555, // 7 years for wedding data
      deletion_allowed: true,
      processing_purpose: 'Wedding planning and coordination services',
      location_restrictions: ['EU', 'US'],
      access_log: [
        {
          accessed_at: new Date().toISOString(),
          accessed_by: 'system',
          access_purpose: 'data_encryption',
        },
      ],
    };

    // Add metadata fields to result
    for (const metaField of config.metadataFields) {
      if (metaField === 'encryption_schema_version') {
        result[metaField] = 1;
      } else if (metaField === 'encrypted_at') {
        result[metaField] = new Date().toISOString();
      } else if (metaField === 'last_access') {
        result[metaField] = new Date().toISOString();
      } else if (metaField === 'compliance_flags') {
        result[metaField] = ['GDPR_COMPLIANT', 'ENCRYPTED'];
      } else if (metaField === 'pci_compliance_flags') {
        result[metaField] = ['PCI_DSS_COMPLIANT', 'ENCRYPTED'];
      }
    }

    return {
      data: result,
      metadata,
      errors: errors.length > 0 ? errors : undefined,
      encryptedFields,
    };
  } catch (error) {
    throw new Error(
      `Field encryption mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Maps encrypted fields back to plain data format
 * @param data - Data with encrypted fields
 * @param config - Encryption configuration
 * @param decryptionFn - Function to decrypt field values
 * @returns Mapped data with decrypted fields
 */
export async function mapEncryptedToFields<T extends Record<string, any>>(
  data: T,
  config: FieldMappingConfig,
  decryptionFn: (encryptedField: EncryptedField) => Promise<string>,
): Promise<MappingResult<T>> {
  try {
    const result: any = { ...data };
    const decryptedFields: string[] = [];
    const errors: string[] = [];

    // Decrypt specified fields
    for (const fieldName of config.encryptedFields) {
      const encryptedValue = data[fieldName];

      if (
        encryptedValue &&
        typeof encryptedValue === 'object' &&
        'encrypted_value' in encryptedValue
      ) {
        try {
          const decrypted = await decryptionFn(
            encryptedValue as EncryptedField,
          );
          result[fieldName] = decrypted;
          decryptedFields.push(fieldName);

          // Remove search hash fields from result
          const hashFieldName = `${fieldName}_search_hash`;
          if (result[hashFieldName]) {
            delete result[hashFieldName];
          }
        } catch (error) {
          errors.push(
            `Failed to decrypt field '${fieldName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    // Remove metadata fields from result
    for (const metaField of config.metadataFields) {
      delete result[metaField];
    }

    // Validate decrypted data if schema provided
    if (config.schema) {
      try {
        config.schema.parse(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(
            ...error.issues.map(
              (e) =>
                `Validation error after decryption: ${e.path.join('.')}: ${e.message}`,
            ),
          );
        }
      }
    }

    const metadata: EncryptionMetadata = {
      legal_basis: 'legitimate_interests',
      retention_days: 2555,
      deletion_allowed: true,
      processing_purpose: 'Wedding planning and coordination services',
      access_log: [
        {
          accessed_at: new Date().toISOString(),
          accessed_by: 'system',
          access_purpose: 'data_decryption',
        },
      ],
    };

    return {
      data: result,
      metadata,
      errors: errors.length > 0 ? errors : undefined,
      encryptedFields: decryptedFields,
    };
  } catch (error) {
    throw new Error(
      `Field decryption mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Gets encryption configuration for a specific data type
 * @param dataType - Type of wedding data
 * @returns Encryption configuration
 */
export function getEncryptionConfig(
  dataType: WeddingDataType,
): FieldMappingConfig {
  const config = WEDDING_ENCRYPTION_CONFIGS[dataType];
  if (!config) {
    throw new Error(
      `No encryption configuration found for data type: ${dataType}`,
    );
  }
  return config;
}

/**
 * Validates field mapping integrity
 * @param data - Data to validate
 * @param config - Encryption configuration
 * @param isEncrypted - Whether data should be in encrypted format
 * @returns Validation result
 */
export function validateFieldMapping(
  data: Record<string, any>,
  config: FieldMappingConfig,
  isEncrypted: boolean = false,
): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const invalidTypes: string[] = [];

  try {
    // Check required fields
    if (config.schema) {
      try {
        config.schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          for (const issue of error.issues) {
            if (issue.code === z.ZodIssueCode.invalid_type) {
              invalidTypes.push(
                `${issue.path.join('.')}: expected ${issue.expected}, got ${(issue as any).received || 'unknown'}`,
              );
            } else if (issue.code === z.ZodIssueCode.too_small) {
              missingFields.push(issue.path.join('.'));
            } else {
              errors.push(`${issue.path.join('.')}: ${issue.message}`);
            }
          }
        }
      }
    }

    // Validate encryption fields
    for (const fieldName of config.encryptedFields) {
      const fieldValue = data[fieldName];

      if (isEncrypted) {
        // Check if encrypted fields have correct structure
        if (fieldValue && typeof fieldValue === 'object') {
          if (
            !('encrypted_value' in fieldValue) ||
            !('iv' in fieldValue) ||
            !('auth_tag' in fieldValue)
          ) {
            errors.push(
              `Encrypted field '${fieldName}' missing required properties (encrypted_value, iv, auth_tag)`,
            );
          }
        }

        // Check for search hash fields
        if (config.searchableFields.includes(fieldName)) {
          const hashFieldName = `${fieldName}_search_hash`;
          if (!data[hashFieldName]) {
            errors.push(
              `Missing search hash for searchable field '${fieldName}'`,
            );
          }
        }
      } else {
        // Check if plain fields are not encrypted objects
        if (
          fieldValue &&
          typeof fieldValue === 'object' &&
          'encrypted_value' in fieldValue
        ) {
          errors.push(
            `Field '${fieldName}' appears to be encrypted but should be plain text`,
          );
        }
      }
    }

    // Validate metadata fields for encrypted data
    if (isEncrypted) {
      for (const metaField of config.metadataFields) {
        if (!data[metaField]) {
          missingFields.push(metaField);
        }
      }
    }

    return {
      isValid:
        errors.length === 0 &&
        missingFields.length === 0 &&
        invalidTypes.length === 0,
      errors,
      missingFields,
      invalidTypes,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      missingFields: [],
      invalidTypes: [],
    };
  }
}

/**
 * Factory function to create field mappers for specific data types
 * @param dataType - Type of wedding data
 * @param encryptionFn - Function to encrypt values
 * @param decryptionFn - Function to decrypt values
 * @returns Field mapper object with encryption/decryption methods
 */
export function createFieldMapper(
  dataType: WeddingDataType,
  encryptionFn: (value: string) => Promise<EncryptedField>,
  decryptionFn: (encryptedField: EncryptedField) => Promise<string>,
) {
  const config = getEncryptionConfig(dataType);

  return {
    /**
     * Encrypts data fields according to configuration
     */
    encrypt: async <T extends Record<string, any>>(
      data: T,
    ): Promise<MappingResult<T>> => {
      return mapFieldsToEncrypted(data, config, encryptionFn);
    },

    /**
     * Decrypts data fields according to configuration
     */
    decrypt: async <T extends Record<string, any>>(
      data: T,
    ): Promise<MappingResult<T>> => {
      return mapEncryptedToFields(data, config, decryptionFn);
    },

    /**
     * Validates data structure
     */
    validate: (
      data: Record<string, any>,
      isEncrypted: boolean = false,
    ): ValidationResult => {
      return validateFieldMapping(data, config, isEncrypted);
    },

    /**
     * Gets configuration for this data type
     */
    getConfig: (): FieldMappingConfig => config,

    /**
     * Creates searchable hash for a field value
     */
    createSearchHash: (value: string, salt?: string): string => {
      return createSearchableHash(value, salt);
    },

    /**
     * Checks if a field should be encrypted
     */
    shouldEncrypt: (fieldName: string): boolean => {
      return config.encryptedFields.includes(fieldName);
    },

    /**
     * Checks if a field should have a search hash
     */
    isSearchable: (fieldName: string): boolean => {
      return config.searchableFields.includes(fieldName);
    },
  };
}

/**
 * Utility function to create field mapping configuration
 * @param encryptedFields - Fields that should be encrypted
 * @param searchableFields - Fields that should have search hashes
 * @param metadataFields - Metadata fields to include
 * @param schema - Optional validation schema
 * @returns Field mapping configuration
 */
export function createFieldMappingConfig(
  encryptedFields: string[],
  searchableFields: string[] = [],
  metadataFields: string[] = ['encryption_schema_version', 'encrypted_at'],
  schema?: z.ZodSchema<any>,
): FieldMappingConfig {
  return {
    encryptedFields,
    searchableFields,
    metadataFields,
    schema,
  };
}

/**
 * Default export with common configurations and utilities
 */
export default {
  mapFieldsToEncrypted,
  mapEncryptedToFields,
  getEncryptionConfig,
  validateFieldMapping,
  createFieldMapper,
  createFieldMappingConfig,
  WEDDING_ENCRYPTION_CONFIGS,
};
