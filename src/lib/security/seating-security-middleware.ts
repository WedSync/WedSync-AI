// WS-154 Seating Security Middleware
// Integration layer between components and security validation

import { z } from 'zod';
import { DOMPurify } from 'isomorphic-dompurify';
import { rateLimit } from '@/lib/ratelimit/seating-rate-limiter';
import {
  seatingArrangementSchema,
  guestAssignmentSchema,
  tableCreateSchema,
  tableUpdateSchema,
  sanitizeGuestName,
  sanitizeTableName,
} from '@/lib/validations/seating-security';
import type { Guest, Table, Position } from '@/types/seating';

// Security context for operations
interface SecurityContext {
  userId: string;
  coupleId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Security validation results
interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

// Rate limiting identifiers
type RateLimitType =
  | 'guest_assignment'
  | 'table_creation'
  | 'table_update'
  | 'bulk_operation'
  | 'export_operation';

/**
 * Security middleware for seating operations
 * Validates, sanitizes, and rate-limits all seating-related actions
 */
export class SeatingSecurityMiddleware {
  private context: SecurityContext;

  constructor(context: SecurityContext) {
    this.context = context;
  }

  /**
   * Secure guest assignment with validation and rate limiting
   */
  async assignGuest(
    guestId: string,
    tableId: string,
    currentGuests: Guest[],
    currentTables: Table[],
  ): Promise<ValidationResult> {
    try {
      // Rate limiting
      const rateLimitKey = `guest_assignment:${this.context.userId}`;
      const isAllowed = await rateLimit(rateLimitKey, 'guest_assignment');

      if (!isAllowed) {
        return {
          success: false,
          errors: [
            'Rate limit exceeded. Please slow down your assignment operations.',
          ],
        };
      }

      // Input validation
      const validation = guestAssignmentSchema.safeParse({
        guestId: this.sanitizeId(guestId),
        tableId: this.sanitizeId(tableId),
        coupleId: this.context.coupleId,
      });

      if (!validation.success) {
        return {
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        };
      }

      // Business logic validation
      const guest = currentGuests.find((g) => g.id === guestId);
      const table = currentTables.find((t) => t.id === tableId);

      if (!guest) {
        return {
          success: false,
          errors: ['Guest not found or access denied.'],
        };
      }

      if (!table) {
        return {
          success: false,
          errors: ['Table not found or access denied.'],
        };
      }

      // Check table capacity
      const currentTableGuests = currentGuests.filter(
        (g) => g.assignedTableId === tableId,
      );
      if (currentTableGuests.length >= table.capacity) {
        return {
          success: false,
          errors: ['Table is at full capacity.'],
        };
      }

      // Security warnings
      const warnings: string[] = [];

      // Check for suspicious rapid assignments
      if (guest.assignedTableId && guest.assignedTableId !== tableId) {
        warnings.push('Guest is being moved between tables rapidly.');
      }

      return {
        success: true,
        data: validation.data,
        warnings,
      };
    } catch (error) {
      console.error('Guest assignment security validation failed:', error);
      return {
        success: false,
        errors: ['Security validation failed. Please try again.'],
      };
    }
  }

  /**
   * Secure table creation with validation and sanitization
   */
  async createTable(tableData: {
    name: string;
    capacity: number;
    shape: Table['shape'];
    position: Position;
    notes?: string;
  }): Promise<ValidationResult> {
    try {
      // Rate limiting
      const rateLimitKey = `table_creation:${this.context.userId}`;
      const isAllowed = await rateLimit(rateLimitKey, 'table_creation');

      if (!isAllowed) {
        return {
          success: false,
          errors: ['Rate limit exceeded. Please slow down table creation.'],
        };
      }

      // Sanitize inputs
      const sanitizedData = {
        name: sanitizeTableName(tableData.name),
        capacity: Math.max(1, Math.min(20, Math.floor(tableData.capacity))),
        shape: tableData.shape,
        position: {
          x: Math.max(0, Math.min(2000, Math.floor(tableData.position.x))),
          y: Math.max(0, Math.min(2000, Math.floor(tableData.position.y))),
        },
        notes: tableData.notes ? this.sanitizeText(tableData.notes) : undefined,
        coupleId: this.context.coupleId,
      };

      // Validation
      const validation = tableCreateSchema.safeParse(sanitizedData);

      if (!validation.success) {
        return {
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        };
      }

      return {
        success: true,
        data: validation.data,
      };
    } catch (error) {
      console.error('Table creation security validation failed:', error);
      return {
        success: false,
        errors: ['Security validation failed. Please try again.'],
      };
    }
  }

  /**
   * Secure table update with validation and sanitization
   */
  async updateTable(
    tableId: string,
    updates: Partial<Table>,
    currentTables: Table[],
  ): Promise<ValidationResult> {
    try {
      // Rate limiting
      const rateLimitKey = `table_update:${this.context.userId}`;
      const isAllowed = await rateLimit(rateLimitKey, 'table_update');

      if (!isAllowed) {
        return {
          success: false,
          errors: ['Rate limit exceeded. Please slow down table updates.'],
        };
      }

      // Verify table ownership/access
      const table = currentTables.find((t) => t.id === tableId);
      if (!table) {
        return {
          success: false,
          errors: ['Table not found or access denied.'],
        };
      }

      // Sanitize updates
      const sanitizedUpdates: any = {};

      if (updates.name !== undefined) {
        sanitizedUpdates.name = sanitizeTableName(updates.name);
      }

      if (updates.capacity !== undefined) {
        sanitizedUpdates.capacity = Math.max(
          1,
          Math.min(20, Math.floor(updates.capacity)),
        );
      }

      if (updates.position !== undefined) {
        sanitizedUpdates.position = {
          x: Math.max(0, Math.min(2000, Math.floor(updates.position.x))),
          y: Math.max(0, Math.min(2000, Math.floor(updates.position.y))),
        };
      }

      if (updates.notes !== undefined) {
        sanitizedUpdates.notes = this.sanitizeText(updates.notes);
      }

      // Add required fields for validation
      sanitizedUpdates.id = this.sanitizeId(tableId);
      sanitizedUpdates.coupleId = this.context.coupleId;

      // Validation
      const validation = tableUpdateSchema.safeParse(sanitizedUpdates);

      if (!validation.success) {
        return {
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        };
      }

      return {
        success: true,
        data: validation.data,
      };
    } catch (error) {
      console.error('Table update security validation failed:', error);
      return {
        success: false,
        errors: ['Security validation failed. Please try again.'],
      };
    }
  }

  /**
   * Secure bulk operations with enhanced rate limiting
   */
  async validateBulkOperation(
    operationType: 'bulk_assign' | 'bulk_unassign' | 'import_layout',
    operationCount: number,
  ): Promise<ValidationResult> {
    try {
      // Enhanced rate limiting for bulk operations
      const rateLimitKey = `bulk_operation:${this.context.userId}`;
      const isAllowed = await rateLimit(rateLimitKey, 'bulk_operation');

      if (!isAllowed) {
        return {
          success: false,
          errors: [
            'Rate limit exceeded. Bulk operations are limited to prevent abuse.',
          ],
        };
      }

      // Validate operation size
      const MAX_BULK_SIZE = 100;
      if (operationCount > MAX_BULK_SIZE) {
        return {
          success: false,
          errors: [
            `Bulk operation too large. Maximum ${MAX_BULK_SIZE} operations allowed.`,
          ],
        };
      }

      // Log bulk operation attempt
      console.log('Bulk operation attempted:', {
        userId: this.context.userId,
        coupleId: this.context.coupleId,
        operationType,
        operationCount,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Bulk operation security validation failed:', error);
      return {
        success: false,
        errors: ['Security validation failed. Please try again.'],
      };
    }
  }

  /**
   * Secure export operations with access logging
   */
  async validateExportOperation(
    exportType: 'layout' | 'assignments' | 'full_arrangement',
  ): Promise<ValidationResult> {
    try {
      // Rate limiting for export operations
      const rateLimitKey = `export_operation:${this.context.userId}`;
      const isAllowed = await rateLimit(rateLimitKey, 'export_operation');

      if (!isAllowed) {
        return {
          success: false,
          errors: ['Rate limit exceeded. Export operations are limited.'],
        };
      }

      // Log export attempt for audit trail
      console.log('Export operation attempted:', {
        userId: this.context.userId,
        coupleId: this.context.coupleId,
        exportType,
        timestamp: new Date().toISOString(),
        ipAddress: this.context.ipAddress,
        userAgent: this.context.userAgent,
      });

      return { success: true };
    } catch (error) {
      console.error('Export operation security validation failed:', error);
      return {
        success: false,
        errors: ['Security validation failed. Please try again.'],
      };
    }
  }

  /**
   * Sanitize text inputs to prevent XSS
   */
  private sanitizeText(input: string): string {
    // Remove any HTML tags and suspicious content
    const cleaned = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Limit length to prevent abuse
    return cleaned.slice(0, 500);
  }

  /**
   * Sanitize ID inputs
   */
  private sanitizeId(id: string): string {
    // Only allow alphanumeric, hyphens, and underscores
    return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  }

  /**
   * Validate arrangement ownership
   */
  async validateArrangementAccess(
    arrangementId: string,
  ): Promise<ValidationResult> {
    try {
      // This would typically check database permissions
      // For now, we'll do basic validation

      const sanitizedId = this.sanitizeId(arrangementId);

      if (!sanitizedId || sanitizedId.length < 1) {
        return {
          success: false,
          errors: ['Invalid arrangement identifier.'],
        };
      }

      // Log access attempt
      console.log('Arrangement access attempted:', {
        userId: this.context.userId,
        coupleId: this.context.coupleId,
        arrangementId: sanitizedId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: { arrangementId: sanitizedId },
      };
    } catch (error) {
      console.error('Arrangement access validation failed:', error);
      return {
        success: false,
        errors: ['Access validation failed. Please try again.'],
      };
    }
  }
}

/**
 * Factory function to create security middleware with context
 */
export function createSeatingSecurityMiddleware(
  context: SecurityContext,
): SeatingSecurityMiddleware {
  return new SeatingSecurityMiddleware(context);
}

/**
 * Hook for React components to use security middleware
 */
export function useSeatingSecurityMiddleware(context: SecurityContext) {
  return createSeatingSecurityMiddleware(context);
}
