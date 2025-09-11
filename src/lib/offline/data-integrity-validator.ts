/**
 * WS-144: Data Integrity Validation System
 * Ensures no data loss during sync operations
 *
 * Features:
 * - Checksum validation for data integrity
 * - Transaction rollback on failures
 * - Data verification before and after sync
 * - Automatic recovery from corruption
 * - Audit trail for all operations
 */

import { offlineDB } from '@/lib/database/offline-database';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import * as crypto from 'crypto';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface IntegrityCheck {
  id: string;
  entityType: string;
  entityId: string;
  checksum: string;
  version: number;
  timestamp: number;
  status: 'valid' | 'invalid' | 'recovered';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  repaired: boolean;
  details: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  value?: any;
  expectedType?: string;
}

export interface DataSnapshot {
  id: string;
  timestamp: number;
  data: any;
  checksum: string;
  metadata: {
    entityType: string;
    entityId: string;
    operation: string;
    userId?: string;
  };
}

export interface RecoveryStrategy {
  type: 'rollback' | 'merge' | 'restore' | 'manual';
  source: 'local' | 'server' | 'backup';
  confidence: number; // 0-100
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  weddingDate: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const vendorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category: z.string(),
  email: z.string().email(),
  phone: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  price: z.number().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const guestSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  rsvpStatus: z.enum(['pending', 'accepted', 'declined', 'maybe']),
  dietaryRestrictions: z.array(z.string()).optional(),
  tableNumber: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const schemas: Record<string, z.ZodSchema> = {
  clients: clientSchema,
  vendors: vendorSchema,
  guests: guestSchema,
};

// =====================================================
// DATA INTEGRITY VALIDATOR
// =====================================================

export class DataIntegrityValidator {
  private static instance: DataIntegrityValidator;
  private integrityChecks: Map<string, IntegrityCheck> = new Map();
  private snapshots: Map<string, DataSnapshot[]> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();
  private auditLog: Array<{
    timestamp: number;
    operation: string;
    entityType: string;
    entityId: string;
    result: 'success' | 'failure' | 'warning';
    details?: any;
  }> = [];

  public static getInstance(): DataIntegrityValidator {
    if (!DataIntegrityValidator.instance) {
      DataIntegrityValidator.instance = new DataIntegrityValidator();
    }
    return DataIntegrityValidator.instance;
  }

  // =====================================================
  // VALIDATION OPERATIONS
  // =====================================================

  async validateEntity(
    entityType: string,
    entityId: string,
    data: any,
  ): Promise<ValidationResult> {
    const cacheKey = `${entityType}:${entityId}`;

    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      if (Date.now() - (cached.details.timestamp || 0) < 60000) {
        // 1 minute cache
        return cached;
      }
    }

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      repaired: false,
      details: {
        timestamp: Date.now(),
        entityType,
        entityId,
      },
    };

    // Schema validation
    if (schemas[entityType]) {
      const schemaResult = await this.validateSchema(data, schemas[entityType]);
      result.errors.push(...schemaResult.errors);
      result.isValid = result.isValid && schemaResult.isValid;
    }

    // Checksum validation
    const checksumResult = await this.validateChecksum(
      entityType,
      entityId,
      data,
    );
    if (!checksumResult.isValid) {
      result.errors.push({
        field: 'checksum',
        message: 'Data integrity check failed',
        severity: 'critical',
      });
      result.isValid = false;
    }

    // Referential integrity
    const refResult = await this.validateReferences(entityType, data);
    result.errors.push(...refResult.errors);
    result.warnings.push(...refResult.warnings);

    // Business rules validation
    const rulesResult = await this.validateBusinessRules(entityType, data);
    result.errors.push(...rulesResult.errors);
    result.warnings.push(...rulesResult.warnings);

    // Attempt auto-repair if validation failed
    if (!result.isValid && this.canAutoRepair(result.errors)) {
      const repaired = await this.attemptAutoRepair(
        entityType,
        entityId,
        data,
        result.errors,
      );
      if (repaired) {
        result.repaired = true;
        result.details.repairedFields = repaired.fields;
      }
    }

    // Cache result
    this.validationCache.set(cacheKey, result);

    // Log audit
    await this.logAudit({
      timestamp: Date.now(),
      operation: 'validate',
      entityType,
      entityId,
      result: result.isValid
        ? 'success'
        : result.repaired
          ? 'warning'
          : 'failure',
      details: result,
    });

    return result;
  }

  private async validateSchema(
    data: any,
    schema: z.ZodSchema,
  ): Promise<{ isValid: boolean; errors: ValidationError[] }> {
    try {
      schema.parse(data);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          severity: this.getSeverity(err.code),
          value: err.input,
          expectedType: err.expected,
        }));
        return { isValid: false, errors };
      }
      return {
        isValid: false,
        errors: [
          {
            field: 'unknown',
            message: 'Schema validation failed',
            severity: 'high',
          },
        ],
      };
    }
  }

  private getSeverity(code: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (code) {
      case 'invalid_type':
      case 'invalid_literal':
        return 'critical';
      case 'invalid_union':
      case 'invalid_enum_value':
        return 'high';
      case 'too_small':
      case 'too_big':
        return 'medium';
      default:
        return 'low';
    }
  }

  // =====================================================
  // CHECKSUM OPERATIONS
  // =====================================================

  async calculateChecksum(data: any): Promise<string> {
    const normalized = this.normalizeData(data);
    const json = JSON.stringify(normalized);

    // Use Web Crypto API for browser compatibility
    if (
      typeof window !== 'undefined' &&
      window.crypto &&
      window.crypto.subtle
    ) {
      const encoder = new TextEncoder();
      const data = encoder.encode(json);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for Node.js environment
      return crypto.createHash('sha256').update(json).digest('hex');
    }
  }

  private normalizeData(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.normalizeData(item)).sort();
    }

    if (data && typeof data === 'object') {
      const sorted: any = {};
      Object.keys(data)
        .sort()
        .forEach((key) => {
          // Skip metadata fields
          if (!['_checksum', '_version', '_synced'].includes(key)) {
            sorted[key] = this.normalizeData(data[key]);
          }
        });
      return sorted;
    }

    return data;
  }

  async validateChecksum(
    entityType: string,
    entityId: string,
    data: any,
  ): Promise<{ isValid: boolean; expected?: string; actual?: string }> {
    const key = `${entityType}:${entityId}`;
    const storedCheck = this.integrityChecks.get(key);

    if (!storedCheck) {
      // First time, create checksum
      const checksum = await this.calculateChecksum(data);
      this.integrityChecks.set(key, {
        id: key,
        entityType,
        entityId,
        checksum,
        version: 1,
        timestamp: Date.now(),
        status: 'valid',
      });
      return { isValid: true };
    }

    const currentChecksum = await this.calculateChecksum(data);

    if (currentChecksum === storedCheck.checksum) {
      return { isValid: true };
    }

    // Checksum mismatch - could be legitimate update or corruption
    const isLegitimate = await this.verifyLegitimateChange(
      entityType,
      entityId,
      data,
    );

    if (isLegitimate) {
      // Update checksum
      storedCheck.checksum = currentChecksum;
      storedCheck.version++;
      storedCheck.timestamp = Date.now();
      return { isValid: true };
    }

    return {
      isValid: false,
      expected: storedCheck.checksum,
      actual: currentChecksum,
    };
  }

  private async verifyLegitimateChange(
    entityType: string,
    entityId: string,
    data: any,
  ): Promise<boolean> {
    // Check if there's a recent update timestamp
    if (data.updatedAt) {
      const lastCheck = this.integrityChecks.get(`${entityType}:${entityId}`);
      if (lastCheck) {
        const dataTime = new Date(data.updatedAt).getTime();
        return dataTime > lastCheck.timestamp;
      }
    }

    // Check audit log for recent operations
    const recentOps = this.auditLog.filter(
      (entry) =>
        entry.entityType === entityType &&
        entry.entityId === entityId &&
        Date.now() - entry.timestamp < 60000, // Within last minute
    );

    return recentOps.length > 0;
  }

  // =====================================================
  // REFERENTIAL INTEGRITY
  // =====================================================

  private async validateReferences(
    entityType: string,
    data: any,
  ): Promise<{ errors: ValidationError[]; warnings: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    switch (entityType) {
      case 'vendors':
        if (data.clientId) {
          const clientExists = await this.checkEntityExists(
            'clients',
            data.clientId,
          );
          if (!clientExists) {
            errors.push({
              field: 'clientId',
              message: `Referenced client ${data.clientId} does not exist`,
              severity: 'high',
              value: data.clientId,
            });
          }
        }
        break;

      case 'guests':
        if (data.weddingId) {
          const weddingExists = await this.checkEntityExists(
            'weddings',
            data.weddingId,
          );
          if (!weddingExists) {
            errors.push({
              field: 'weddingId',
              message: `Referenced wedding ${data.weddingId} does not exist`,
              severity: 'high',
              value: data.weddingId,
            });
          }
        }

        if (data.tableId && data.tableId !== null) {
          const tableExists = await this.checkEntityExists(
            'tables',
            data.tableId,
          );
          if (!tableExists) {
            warnings.push(`Referenced table ${data.tableId} does not exist`);
          }
        }
        break;
    }

    return { errors, warnings };
  }

  private async checkEntityExists(
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    try {
      const entity = await offlineDB.getFromIndexedDB(entityType, entityId);
      return !!entity;
    } catch {
      return false;
    }
  }

  // =====================================================
  // BUSINESS RULES VALIDATION
  // =====================================================

  private async validateBusinessRules(
    entityType: string,
    data: any,
  ): Promise<{ errors: ValidationError[]; warnings: string[] }> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    switch (entityType) {
      case 'guests':
        // Check for duplicate guests
        if (data.email) {
          const duplicates = await this.findDuplicates(
            'guests',
            'email',
            data.email,
            data.id,
          );
          if (duplicates.length > 0) {
            warnings.push(`Guest with email ${data.email} already exists`);
          }
        }

        // Validate table assignment
        if (data.tableNumber && data.rsvpStatus === 'declined') {
          errors.push({
            field: 'tableNumber',
            message: 'Declined guests should not have table assignments',
            severity: 'medium',
            value: data.tableNumber,
          });
        }
        break;

      case 'vendors':
        // Validate pricing
        if (data.status === 'confirmed' && !data.price) {
          warnings.push('Confirmed vendor should have a price set');
        }

        // Check for conflicting bookings
        if (data.eventDate && data.status === 'confirmed') {
          const conflicts = await this.checkVendorConflicts(data);
          if (conflicts.length > 0) {
            errors.push({
              field: 'eventDate',
              message: 'Vendor has conflicting bookings',
              severity: 'high',
              value: data.eventDate,
            });
          }
        }
        break;
    }

    return { errors, warnings };
  }

  private async findDuplicates(
    entityType: string,
    field: string,
    value: any,
    excludeId?: string,
  ): Promise<any[]> {
    const allEntities = await offlineDB.getAllFromStore(entityType);
    return allEntities.filter(
      (entity: any) => entity[field] === value && entity.id !== excludeId,
    );
  }

  private async checkVendorConflicts(vendor: any): Promise<any[]> {
    const allVendors = await offlineDB.getAllFromStore('vendors');
    return allVendors.filter(
      (v: any) =>
        v.id !== vendor.id &&
        v.category === vendor.category &&
        v.eventDate === vendor.eventDate &&
        v.status === 'confirmed',
    );
  }

  // =====================================================
  // AUTO-REPAIR OPERATIONS
  // =====================================================

  private canAutoRepair(errors: ValidationError[]): boolean {
    // Only auto-repair non-critical errors
    return (
      errors.every((e) => e.severity !== 'critical') &&
      errors.some((e) => ['medium', 'low'].includes(e.severity))
    );
  }

  private async attemptAutoRepair(
    entityType: string,
    entityId: string,
    data: any,
    errors: ValidationError[],
  ): Promise<{ success: boolean; fields: string[] } | null> {
    const repairedFields: string[] = [];
    let repaired = { ...data };

    for (const error of errors) {
      if (error.severity === 'critical') continue;

      switch (error.field) {
        case 'updatedAt':
        case 'createdAt':
          // Fix timestamp format
          repaired[error.field] = new Date().toISOString();
          repairedFields.push(error.field);
          break;

        case 'status':
          // Reset to default status
          repaired.status = this.getDefaultStatus(entityType);
          repairedFields.push('status');
          break;

        case 'tableNumber':
          // Remove invalid table assignment
          if (repaired.rsvpStatus === 'declined') {
            delete repaired.tableNumber;
            repairedFields.push('tableNumber');
          }
          break;
      }
    }

    if (repairedFields.length > 0) {
      // Save repaired data
      await offlineDB.saveToIndexedDB({
        storeName: entityType,
        data: repaired,
        id: entityId,
      });

      // Create snapshot for rollback
      await this.createSnapshot(entityType, entityId, data, 'pre-repair');

      return { success: true, fields: repairedFields };
    }

    return null;
  }

  private getDefaultStatus(entityType: string): string {
    const defaults: Record<string, string> = {
      clients: 'active',
      vendors: 'pending',
      guests: 'pending',
    };
    return defaults[entityType] || 'active';
  }

  // =====================================================
  // SNAPSHOT & RECOVERY
  // =====================================================

  async createSnapshot(
    entityType: string,
    entityId: string,
    data: any,
    operation: string,
  ): Promise<string> {
    const snapshot: DataSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      checksum: await this.calculateChecksum(data),
      metadata: {
        entityType,
        entityId,
        operation,
      },
    };

    const key = `${entityType}:${entityId}`;
    const existing = this.snapshots.get(key) || [];
    existing.push(snapshot);

    // Keep only last 10 snapshots per entity
    if (existing.length > 10) {
      existing.shift();
    }

    this.snapshots.set(key, existing);

    // Store in IndexedDB
    await offlineDB.saveToIndexedDB({
      storeName: 'data_snapshots',
      data: snapshot,
      id: snapshot.id,
    });

    return snapshot.id;
  }

  async recoverFromSnapshot(
    entityType: string,
    entityId: string,
    snapshotId?: string,
  ): Promise<boolean> {
    const key = `${entityType}:${entityId}`;
    const snapshots = this.snapshots.get(key) || [];

    let snapshot: DataSnapshot | undefined;

    if (snapshotId) {
      snapshot = snapshots.find((s) => s.id === snapshotId);
    } else {
      // Use most recent valid snapshot
      snapshot = snapshots.reverse().find(async (s) => {
        const checksum = await this.calculateChecksum(s.data);
        return checksum === s.checksum;
      });
    }

    if (!snapshot) {
      console.error(`[DataIntegrity] No valid snapshot found for ${key}`);
      return false;
    }

    try {
      // Restore data
      await offlineDB.saveToIndexedDB({
        storeName: entityType,
        data: snapshot.data,
        id: entityId,
      });

      // Update integrity check
      this.integrityChecks.set(key, {
        id: key,
        entityType,
        entityId,
        checksum: snapshot.checksum,
        version: (this.integrityChecks.get(key)?.version || 0) + 1,
        timestamp: Date.now(),
        status: 'recovered',
      });

      await this.logAudit({
        timestamp: Date.now(),
        operation: 'recover',
        entityType,
        entityId,
        result: 'success',
        details: { snapshotId: snapshot.id },
      });

      return true;
    } catch (error) {
      console.error('[DataIntegrity] Recovery failed:', error);
      return false;
    }
  }

  // =====================================================
  // SYNC VALIDATION
  // =====================================================

  async validateSyncOperation(
    operation: 'push' | 'pull',
    entityType: string,
    localData: any,
    remoteData: any,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      repaired: false,
      details: {
        operation,
        entityType,
        timestamp: Date.now(),
      },
    };

    // Create snapshots before sync
    if (localData) {
      await this.createSnapshot(
        entityType,
        localData.id,
        localData,
        `pre-${operation}`,
      );
    }

    // Validate both datasets
    if (localData) {
      const localValidation = await this.validateEntity(
        entityType,
        localData.id,
        localData,
      );
      if (!localValidation.isValid) {
        result.errors.push(
          ...localValidation.errors.map((e) => ({
            ...e,
            field: `local.${e.field}`,
          })),
        );
        result.isValid = false;
      }
    }

    if (remoteData) {
      const remoteValidation = await this.validateEntity(
        entityType,
        remoteData.id,
        remoteData,
      );
      if (!remoteValidation.isValid) {
        result.errors.push(
          ...remoteValidation.errors.map((e) => ({
            ...e,
            field: `remote.${e.field}`,
          })),
        );
        result.isValid = false;
      }
    }

    // Check for data loss
    if (localData && remoteData) {
      const dataLoss = this.detectDataLoss(localData, remoteData);
      if (dataLoss.length > 0) {
        result.warnings.push(
          ...dataLoss.map((field) => `Potential data loss in field: ${field}`),
        );
      }
    }

    return result;
  }

  private detectDataLoss(localData: any, remoteData: any): string[] {
    const lostFields: string[] = [];

    const checkFields = (local: any, remote: any, path = ''): void => {
      for (const key in local) {
        const fullPath = path ? `${path}.${key}` : key;

        if (
          !(key in remote) &&
          local[key] !== null &&
          local[key] !== undefined
        ) {
          lostFields.push(fullPath);
        } else if (typeof local[key] === 'object' && local[key] !== null) {
          if (typeof remote[key] === 'object' && remote[key] !== null) {
            checkFields(local[key], remote[key], fullPath);
          }
        }
      }
    };

    checkFields(localData, remoteData);
    return lostFields;
  }

  // =====================================================
  // AUDIT & MONITORING
  // =====================================================

  private async logAudit(entry: any): Promise<void> {
    this.auditLog.push(entry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Store in IndexedDB
    await offlineDB.saveToIndexedDB({
      storeName: 'integrity_audit',
      data: entry,
      id: `audit_${entry.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  async getAuditLog(filter?: {
    entityType?: string;
    entityId?: string;
    operation?: string;
    result?: 'success' | 'failure' | 'warning';
    startTime?: number;
    endTime?: number;
  }): Promise<any[]> {
    let logs = [...this.auditLog];

    if (filter) {
      if (filter.entityType) {
        logs = logs.filter((l) => l.entityType === filter.entityType);
      }
      if (filter.entityId) {
        logs = logs.filter((l) => l.entityId === filter.entityId);
      }
      if (filter.operation) {
        logs = logs.filter((l) => l.operation === filter.operation);
      }
      if (filter.result) {
        logs = logs.filter((l) => l.result === filter.result);
      }
      if (filter.startTime) {
        logs = logs.filter((l) => l.timestamp >= filter.startTime);
      }
      if (filter.endTime) {
        logs = logs.filter((l) => l.timestamp <= filter.endTime);
      }
    }

    return logs;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  async validateDatabase(): Promise<{
    totalEntities: number;
    validEntities: number;
    invalidEntities: number;
    repairedEntities: number;
    errors: Array<{
      entityType: string;
      entityId: string;
      errors: ValidationError[];
    }>;
  }> {
    const results = {
      totalEntities: 0,
      validEntities: 0,
      invalidEntities: 0,
      repairedEntities: 0,
      errors: [] as Array<{
        entityType: string;
        entityId: string;
        errors: ValidationError[];
      }>,
    };

    const entityTypes = ['clients', 'vendors', 'guests'];

    for (const entityType of entityTypes) {
      const entities = await offlineDB.getAllFromStore(entityType);

      for (const entity of entities) {
        results.totalEntities++;

        const validation = await this.validateEntity(
          entityType,
          entity.id,
          entity,
        );

        if (validation.isValid) {
          results.validEntities++;
        } else {
          results.invalidEntities++;

          if (validation.repaired) {
            results.repairedEntities++;
          } else {
            results.errors.push({
              entityType,
              entityId: entity.id,
              errors: validation.errors,
            });
          }
        }
      }
    }

    return results;
  }

  async clearCache(): Promise<void> {
    this.validationCache.clear();
  }

  async exportIntegrityReport(): Promise<string> {
    const report = {
      timestamp: new Date().toISOString(),
      integrityChecks: Array.from(this.integrityChecks.values()),
      recentAudit: this.auditLog.slice(-100),
      statistics: await this.validateDatabase(),
    };

    return JSON.stringify(report, null, 2);
  }
}

// Export singleton instance
export const dataIntegrityValidator = DataIntegrityValidator.getInstance();
