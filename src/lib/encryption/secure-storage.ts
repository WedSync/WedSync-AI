/**
 * WS-175 Advanced Data Encryption - Secure Storage Service
 * Team B - Round 1 Implementation
 *
 * Encrypted field storage abstraction layer
 * Provides interface for storing/retrieving encrypted data with GDPR compliance
 */

import {
  EncryptionResult,
  EncryptionContext,
  EncryptedField,
  FieldType,
  SecureStorageService,
  GDPRComplianceRecord,
} from '../../types/encryption';
import { createClient } from '../supabase/server';
import { FieldEncryption } from './field-encryption';
import { SecurityAuditLogger } from './audit-logger';
import * as crypto from 'crypto';

export class SecureStorage implements SecureStorageService {
  private supabase;
  private auditLogger: SecurityAuditLogger;
  private encryption: typeof FieldEncryption;

  // Mapping of field types to database column names
  private static readonly FIELD_MAPPING: Record<FieldType, string> = {
    email: 'encrypted_email',
    phone: 'encrypted_phone',
    notes: 'encrypted_notes',
    address: 'encrypted_address',
    dietary_requirements: 'encrypted_dietary',
    contact_info: 'encrypted_contact',
    personal_details: 'encrypted_personal',
  };

  constructor() {
    this.supabase = createClient();
    this.auditLogger = new SecurityAuditLogger();
    this.encryption = FieldEncryption;
  }

  /**
   * Stores encrypted data for a specific field
   * Automatically handles encryption and GDPR compliance logging
   */
  async store(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: EncryptionResult,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate inputs
      this.validateStoreInputs(tableName, recordId, fieldName, encryptedData);

      // Get field type from field name
      const fieldType = this.getFieldTypeFromName(fieldName);
      const columnName = SecureStorage.FIELD_MAPPING[fieldType];

      if (!columnName) {
        throw new Error(`Unsupported field type for encryption: ${fieldType}`);
      }

      // Prepare the encrypted field data
      const encryptedField: EncryptedField = {
        data: encryptedData,
        context: {
          userId: 'system', // TODO: Get from current session
          fieldType,
          tableName,
          recordId,
        },
        createdAt: new Date(),
        accessCount: 0,
      };

      // Store in database
      const { error } = await this.supabase
        .from(tableName)
        .update({ [columnName]: encryptedField })
        .eq('id', recordId);

      if (error) {
        throw new Error(`Failed to store encrypted data: ${error.message}`);
      }

      // Log GDPR compliance record
      await this.createGDPRRecord(encryptedField);

      // Audit the storage operation
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'FIELD_ENCRYPTED',
        userId: encryptedField.context.userId,
        fieldType,
        keyId: encryptedData.keyId,
        success: true,
        timestamp: new Date(),
        metadata: {
          tableName,
          recordId,
          fieldName,
          duration: Date.now() - startTime,
        },
      });
    } catch (error) {
      // Audit the failed storage
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'FIELD_ENCRYPTION_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tableName,
          recordId,
          fieldName,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Retrieves encrypted data for a specific field
   * Updates access tracking for audit compliance
   */
  async retrieve(
    tableName: string,
    recordId: string,
    fieldName: string,
  ): Promise<EncryptionResult | null> {
    const startTime = Date.now();

    try {
      // Validate inputs
      this.validateRetrieveInputs(tableName, recordId, fieldName);

      // Get field type and column mapping
      const fieldType = this.getFieldTypeFromName(fieldName);
      const columnName = SecureStorage.FIELD_MAPPING[fieldType];

      if (!columnName) {
        throw new Error(`Unsupported field type for decryption: ${fieldType}`);
      }

      // Retrieve from database
      const { data, error } = await this.supabase
        .from(tableName)
        .select(columnName)
        .eq('id', recordId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw new Error(`Failed to retrieve encrypted data: ${error.message}`);
      }

      const encryptedField = data?.[columnName] as EncryptedField | null;

      if (!encryptedField) {
        return null;
      }

      // Update access tracking
      await this.updateAccessTracking(
        tableName,
        recordId,
        columnName,
        encryptedField,
      );

      // Audit the retrieval
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'FIELD_DECRYPTED',
        userId: encryptedField.context.userId,
        fieldType,
        keyId: encryptedField.data.keyId,
        success: true,
        timestamp: new Date(),
        metadata: {
          tableName,
          recordId,
          fieldName,
          duration: Date.now() - startTime,
          accessCount: encryptedField.accessCount + 1,
        },
      });

      return encryptedField.data;
    } catch (error) {
      // Audit the failed retrieval
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'FIELD_DECRYPTION_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tableName,
          recordId,
          fieldName,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Updates encrypted data for a specific field
   * Maintains audit trail for GDPR compliance
   */
  async update(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: EncryptionResult,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate inputs
      this.validateStoreInputs(tableName, recordId, fieldName, encryptedData);

      // Retrieve existing data for audit trail
      const existingData = await this.retrieve(tableName, recordId, fieldName);

      // Store the updated data
      await this.store(tableName, recordId, fieldName, encryptedData);

      // Audit the update operation
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'FIELD_UPDATED',
        userId: 'system',
        fieldType: this.getFieldTypeFromName(fieldName),
        keyId: encryptedData.keyId,
        success: true,
        timestamp: new Date(),
        metadata: {
          tableName,
          recordId,
          fieldName,
          oldKeyId: existingData?.keyId,
          duration: Date.now() - startTime,
        },
      });
    } catch (error) {
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'FIELD_UPDATE_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tableName,
          recordId,
          fieldName,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Deletes encrypted data for GDPR "right to be forgotten"
   */
  async delete(
    tableName: string,
    recordId: string,
    fieldName?: string,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (fieldName) {
        // Delete specific field
        const fieldType = this.getFieldTypeFromName(fieldName);
        const columnName = SecureStorage.FIELD_MAPPING[fieldType];

        const { error } = await this.supabase
          .from(tableName)
          .update({ [columnName]: null })
          .eq('id', recordId);

        if (error) {
          throw new Error(`Failed to delete encrypted field: ${error.message}`);
        }

        // Remove GDPR compliance record
        await this.deleteGDPRRecord(recordId, fieldType);

        // Audit the deletion
        await this.auditLogger.log({
          id: crypto.randomUUID(),
          action: 'GDPR_DATA_DELETION',
          userId: 'system',
          fieldType,
          success: true,
          timestamp: new Date(),
          metadata: {
            tableName,
            recordId,
            fieldName,
            duration: Date.now() - startTime,
          },
        });
      } else {
        // Delete all encrypted fields for the record
        const updateData: Record<string, null> = {};
        Object.values(SecureStorage.FIELD_MAPPING).forEach((column) => {
          updateData[column] = null;
        });

        const { error } = await this.supabase
          .from(tableName)
          .update(updateData)
          .eq('id', recordId);

        if (error) {
          throw new Error(
            `Failed to delete all encrypted fields: ${error.message}`,
          );
        }

        // Remove all GDPR compliance records for this record
        await this.deleteAllGDPRRecords(recordId);

        // Audit the bulk deletion
        await this.auditLogger.log({
          id: crypto.randomUUID(),
          action: 'GDPR_BULK_DATA_DELETION',
          userId: 'system',
          success: true,
          timestamp: new Date(),
          metadata: {
            tableName,
            recordId,
            fieldsDeleted: Object.keys(SecureStorage.FIELD_MAPPING).length,
            duration: Date.now() - startTime,
          },
        });
      }
    } catch (error) {
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'GDPR_DATA_DELETION_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          tableName,
          recordId,
          fieldName,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Bulk storage operation for performance
   */
  async bulkStore(
    operations: Array<{
      tableName: string;
      recordId: string;
      fieldName: string;
      encryptedData: EncryptionResult;
    }>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (operations.length === 0) return;

      // Group operations by table for efficiency
      const operationsByTable = new Map<string, typeof operations>();

      for (const op of operations) {
        if (!operationsByTable.has(op.tableName)) {
          operationsByTable.set(op.tableName, []);
        }
        operationsByTable.get(op.tableName)!.push(op);
      }

      // Execute operations by table
      for (const [tableName, tableOps] of Array.from(operationsByTable)) {
        for (const op of tableOps) {
          await this.store(
            op.tableName,
            op.recordId,
            op.fieldName,
            op.encryptedData,
          );
        }
      }

      // Audit the bulk operation
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'BULK_ENCRYPTION_COMPLETED',
        userId: 'system',
        success: true,
        timestamp: new Date(),
        metadata: {
          operationsCount: operations.length,
          tablesAffected: operationsByTable.size,
          duration: Date.now() - startTime,
        },
      });
    } catch (error) {
      await this.auditLogger.log({
        id: crypto.randomUUID(),
        action: 'BULK_ENCRYPTION_FAILED',
        userId: 'system',
        success: false,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          operationsCount: operations.length,
          duration: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Search encrypted fields based on criteria
   * Used for GDPR compliance reporting and data audits
   */
  async search(criteria: {
    tableName?: string;
    fieldType?: FieldType;
    userId?: string;
    dateRange?: { from: Date; to: Date };
  }): Promise<EncryptedField[]> {
    try {
      // This is a simplified implementation
      // Real implementation would query across all tables with encrypted fields
      const results: EncryptedField[] = [];

      // For now, we'll search the user_profiles table as an example
      if (!criteria.tableName || criteria.tableName === 'user_profiles') {
        const query = this.supabase
          .from('user_profiles')
          .select(
            'id, encrypted_email, encrypted_phone, encrypted_notes, created_at',
          );

        const { data, error } = await query;

        if (error) {
          throw new Error(`Search failed: ${error.message}`);
        }

        if (data) {
          for (const row of data) {
            // Check each encrypted field
            for (const [fieldType, columnName] of Object.entries(
              SecureStorage.FIELD_MAPPING,
            )) {
              const encryptedField = row[columnName] as EncryptedField | null;

              if (
                encryptedField &&
                this.matchesCriteria(encryptedField, criteria)
              ) {
                results.push(encryptedField);
              }
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Search operation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateStoreInputs(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: EncryptionResult,
  ): void {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Invalid table name');
    }

    if (!recordId || typeof recordId !== 'string') {
      throw new Error('Invalid record ID');
    }

    if (!fieldName || typeof fieldName !== 'string') {
      throw new Error('Invalid field name');
    }

    const fieldEncryption = new FieldEncryption();
    if (!fieldEncryption.validateEncryptedData(encryptedData)) {
      throw new Error('Invalid encrypted data');
    }
  }

  private validateRetrieveInputs(
    tableName: string,
    recordId: string,
    fieldName: string,
  ): void {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Invalid table name');
    }

    if (!recordId || typeof recordId !== 'string') {
      throw new Error('Invalid record ID');
    }

    if (!fieldName || typeof fieldName !== 'string') {
      throw new Error('Invalid field name');
    }
  }

  private getFieldTypeFromName(fieldName: string): FieldType {
    // Map field names to types
    const typeMapping: Record<string, FieldType> = {
      email: 'email',
      phone: 'phone',
      notes: 'notes',
      address: 'address',
      dietary: 'dietary_requirements',
      contact: 'contact_info',
      personal: 'personal_details',
    };

    return typeMapping[fieldName] || 'personal_details';
  }

  private async updateAccessTracking(
    tableName: string,
    recordId: string,
    columnName: string,
    encryptedField: EncryptedField,
  ): Promise<void> {
    try {
      const updatedField: EncryptedField = {
        ...encryptedField,
        lastAccessedAt: new Date(),
        accessCount: encryptedField.accessCount + 1,
      };

      await this.supabase
        .from(tableName)
        .update({ [columnName]: updatedField })
        .eq('id', recordId);
    } catch (error) {
      // Don't throw on access tracking failure
      console.error('Failed to update access tracking:', error);
    }
  }

  private async createGDPRRecord(
    encryptedField: EncryptedField,
  ): Promise<void> {
    try {
      const gdprRecord: GDPRComplianceRecord = {
        dataSubjectId:
          encryptedField.context.recordId || encryptedField.context.userId,
        fieldType: encryptedField.context.fieldType,
        encryptionKeyId: encryptedField.data.keyId,
        legalBasis: 'consent', // Default to consent, should be configurable
        consentTimestamp: new Date(),
        retentionPeriod: 2555, // 7 years in days (default retention period)
        processingPurpose: 'Wedding planning services',
      };

      await this.supabase.from('gdpr_compliance').insert({
        id: crypto.randomUUID(),
        data_subject_id: gdprRecord.dataSubjectId,
        field_type: gdprRecord.fieldType,
        encryption_key_id: gdprRecord.encryptionKeyId,
        legal_basis: gdprRecord.legalBasis,
        consent_timestamp: gdprRecord.consentTimestamp?.toISOString(),
        retention_period: gdprRecord.retentionPeriod,
        processing_purpose: gdprRecord.processingPurpose,
      });
    } catch (error) {
      console.error('Failed to create GDPR compliance record:', error);
    }
  }

  private async deleteGDPRRecord(
    recordId: string,
    fieldType: FieldType,
  ): Promise<void> {
    try {
      await this.supabase
        .from('gdpr_compliance')
        .delete()
        .eq('data_subject_id', recordId)
        .eq('field_type', fieldType);
    } catch (error) {
      console.error('Failed to delete GDPR compliance record:', error);
    }
  }

  private async deleteAllGDPRRecords(recordId: string): Promise<void> {
    try {
      await this.supabase
        .from('gdpr_compliance')
        .delete()
        .eq('data_subject_id', recordId);
    } catch (error) {
      console.error('Failed to delete all GDPR compliance records:', error);
    }
  }

  private matchesCriteria(
    field: EncryptedField,
    criteria: {
      tableName?: string;
      fieldType?: FieldType;
      userId?: string;
      dateRange?: { from: Date; to: Date };
    },
  ): boolean {
    if (criteria.fieldType && field.context.fieldType !== criteria.fieldType) {
      return false;
    }

    if (criteria.userId && field.context.userId !== criteria.userId) {
      return false;
    }

    if (criteria.dateRange) {
      const createdAt = field.createdAt;
      if (
        createdAt < criteria.dateRange.from ||
        createdAt > criteria.dateRange.to
      ) {
        return false;
      }
    }

    return true;
  }
}
