/**
 * Encryption Middleware for WedSync API Routes
 * Provides automatic field-level encryption/decryption for API requests and responses
 *
 * @fileoverview Middleware for transparent field encryption in API routes
 * @version 1.0.0
 * @since 2025-01-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import type {
  EncryptionMiddlewareOptions,
  EncryptedField,
  EncryptionAuditConfig,
  EncryptionErrorStrategy,
} from '../../../types/encryption-integration';
import {
  createFieldMapper,
  getEncryptionConfig,
  type WeddingDataType,
  type MappingResult,
} from './data-mapper';

/**
 * Encryption operation result for audit logging
 */
interface EncryptionOperationResult {
  operation: 'encrypt' | 'decrypt';
  success: boolean;
  field_count: number;
  duration_ms: number;
  error?: string;
  user_id?: string;
  ip_address?: string;
}

/**
 * Circuit breaker for encryption service failures
 */
class EncryptionCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold = 5, timeout = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  canExecute(): boolean {
    if (this.failures < this.threshold) {
      return true;
    }

    if (Date.now() - this.lastFailureTime > this.timeout) {
      this.failures = 0;
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

/**
 * Rate limiter for encryption operations
 */
class EncryptionRateLimiter {
  private operations = new Map<string, number[]>();

  async checkRateLimit(
    identifier: string,
    maxOperations: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const userOperations = this.operations.get(identifier) || [];
    const validOperations = userOperations.filter((time) => time > windowStart);

    if (validOperations.length >= maxOperations) {
      return { allowed: false, remaining: 0 };
    }

    validOperations.push(now);
    this.operations.set(identifier, validOperations);

    return {
      allowed: true,
      remaining: maxOperations - validOperations.length,
    };
  }
}

/**
 * Global instances
 */
const circuitBreaker = new EncryptionCircuitBreaker();
const rateLimiter = new EncryptionRateLimiter();

/**
 * Mock encryption service - Replace with actual Team B implementation
 */
const mockEncryptionService = {
  async encrypt(value: string): Promise<EncryptedField> {
    // This will be replaced by Team B's actual FieldEncryption service
    return {
      encrypted_value: Buffer.from(value).toString('base64'),
      algorithm: 'AES-256-GCM',
      iv: 'mock-iv-123',
      auth_tag: 'mock-tag-456',
      encrypted_at: new Date().toISOString(),
      schema_version: 1,
      field_id: `field-${Date.now()}`,
    };
  },

  async decrypt(encryptedField: EncryptedField): Promise<string> {
    // This will be replaced by Team B's actual FieldEncryption service
    return Buffer.from(encryptedField.encrypted_value, 'base64').toString();
  },
};

/**
 * Audit logger for encryption operations
 */
async function auditEncryptionOperation(
  result: EncryptionOperationResult,
  config: EncryptionAuditConfig,
): Promise<void> {
  if (!config.enabled) return;

  try {
    const auditRecord = {
      timestamp: new Date().toISOString(),
      operation: result.operation,
      success: result.success,
      field_count: result.field_count,
      duration_ms: result.duration_ms,
      user_id: result.user_id,
      ip_address: result.ip_address,
      error: result.error,
    };

    // Log to console (replace with actual audit logging service)
    console.log('[ENCRYPTION_AUDIT]', JSON.stringify(auditRecord));

    // Store in database/file/external service based on config
    if (config.storage_location === 'database') {
      // TODO: Store in audit table
    } else if (config.storage_location === 'file') {
      // TODO: Store in audit log file
    } else if (config.storage_location === 'external') {
      // TODO: Send to external audit service
    }
  } catch (error) {
    console.error('Failed to log encryption audit:', error);
  }
}

/**
 * Gets client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Encrypts fields in request data
 */
async function encryptRequestFields(
  data: any,
  dataType: WeddingDataType,
  options: EncryptionMiddlewareOptions,
  request: NextRequest,
): Promise<{ data: any; result: EncryptionOperationResult }> {
  const startTime = Date.now();
  let encryptedFieldCount = 0;
  let error: string | undefined;

  try {
    if (!circuitBreaker.canExecute()) {
      throw new Error('Encryption service circuit breaker is open');
    }

    const fieldMapper = createFieldMapper(
      dataType,
      mockEncryptionService.encrypt,
      mockEncryptionService.decrypt,
    );

    const mappingResult = await fieldMapper.encrypt(data);
    encryptedFieldCount = mappingResult.encryptedFields.length;

    if (mappingResult.errors && mappingResult.errors.length > 0) {
      if (options.error_handling === 'fail_fast') {
        throw new Error(
          `Encryption errors: ${mappingResult.errors.join(', ')}`,
        );
      } else if (options.error_handling === 'skip_field') {
        console.warn('Encryption warnings:', mappingResult.errors);
      }
    }

    circuitBreaker.recordSuccess();

    return {
      data: mappingResult.data,
      result: {
        operation: 'encrypt',
        success: true,
        field_count: encryptedFieldCount,
        duration_ms: Date.now() - startTime,
        ip_address: getClientIP(request),
      },
    };
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown encryption error';
    circuitBreaker.recordFailure();

    if (options.error_handling === 'use_fallback') {
      // Return original data as fallback
      return {
        data,
        result: {
          operation: 'encrypt',
          success: false,
          field_count: 0,
          duration_ms: Date.now() - startTime,
          error,
          ip_address: getClientIP(request),
        },
      };
    }

    throw new Error(`Field encryption failed: ${error}`);
  }
}

/**
 * Decrypts fields in response data
 */
async function decryptResponseFields(
  data: any,
  dataType: WeddingDataType,
  options: EncryptionMiddlewareOptions,
  request: NextRequest,
): Promise<{ data: any; result: EncryptionOperationResult }> {
  const startTime = Date.now();
  let decryptedFieldCount = 0;
  let error: string | undefined;

  try {
    if (!circuitBreaker.canExecute()) {
      throw new Error('Encryption service circuit breaker is open');
    }

    const fieldMapper = createFieldMapper(
      dataType,
      mockEncryptionService.encrypt,
      mockEncryptionService.decrypt,
    );

    const mappingResult = await fieldMapper.decrypt(data);
    decryptedFieldCount = mappingResult.encryptedFields.length;

    if (mappingResult.errors && mappingResult.errors.length > 0) {
      if (options.error_handling === 'fail_fast') {
        throw new Error(
          `Decryption errors: ${mappingResult.errors.join(', ')}`,
        );
      } else if (options.error_handling === 'skip_field') {
        console.warn('Decryption warnings:', mappingResult.errors);
      }
    }

    circuitBreaker.recordSuccess();

    return {
      data: mappingResult.data,
      result: {
        operation: 'decrypt',
        success: true,
        field_count: decryptedFieldCount,
        duration_ms: Date.now() - startTime,
        ip_address: getClientIP(request),
      },
    };
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown decryption error';
    circuitBreaker.recordFailure();

    if (options.error_handling === 'use_fallback') {
      // Return original data as fallback
      return {
        data,
        result: {
          operation: 'decrypt',
          success: false,
          field_count: 0,
          duration_ms: Date.now() - startTime,
          error,
          ip_address: getClientIP(request),
        },
      };
    }

    throw new Error(`Field decryption failed: ${error}`);
  }
}

/**
 * Higher-order middleware function for encryption
 */
export function withEncryption(
  dataType: WeddingDataType,
  options: Partial<EncryptionMiddlewareOptions> = {},
) {
  const defaultOptions: EncryptionMiddlewareOptions = {
    encrypt_on_write: [],
    decrypt_on_read: [],
    enable_logging: true,
    error_handling: 'fail_fast',
    performance_monitoring: {
      track_timing: true,
      track_memory: false,
      slow_operation_threshold: 1000,
      sample_rate: 1.0,
    },
    rate_limiting: {
      operations_per_minute: 100,
      burst_limit: 20,
      scope: 'per_user',
    },
  };

  const config = { ...defaultOptions, ...options };

  return function encryptionMiddleware(
    handler: (request: NextRequest) => Promise<NextResponse>,
  ) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const startTime = Date.now();
      let userId: string | undefined;

      try {
        // Authentication check
        const session = await getServerSession();
        userId = (session?.user as any)?.id || session?.user?.email;

        if (
          !session &&
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
        ) {
          return NextResponse.json(
            { error: 'Authentication required for data modification' },
            { status: 401 },
          );
        }

        // Rate limiting
        if (config.rate_limiting) {
          const identifier =
            config.rate_limiting.scope === 'per_user'
              ? userId || getClientIP(request)
              : config.rate_limiting.scope === 'per_ip'
                ? getClientIP(request)
                : 'global';

          const rateLimitResult = await rateLimiter.checkRateLimit(
            identifier,
            config.rate_limiting.operations_per_minute,
            60000, // 1 minute window
          );

          if (!rateLimitResult.allowed) {
            return NextResponse.json(
              { error: 'Rate limit exceeded for encryption operations' },
              { status: 429 },
            );
          }
        }

        // Process request data encryption
        let requestData: any;
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
          try {
            requestData = await request.json();

            if (config.encrypt_on_write.length > 0) {
              const { data: encryptedData, result: encryptResult } =
                await encryptRequestFields(
                  requestData,
                  dataType,
                  config,
                  request,
                );

              requestData = encryptedData;

              // Audit encryption operation
              if (config.enable_logging) {
                await auditEncryptionOperation(
                  { ...encryptResult, user_id: userId },
                  {
                    enabled: true,
                    log_events: ['encrypt'],
                    retention_days: 90,
                    encrypt_audit_logs: false,
                    storage_location: 'database',
                  },
                );
              }
            }

            // Create new request with encrypted data
            const newRequest = new NextRequest(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(requestData),
            });

            Object.defineProperty(newRequest, 'json', {
              value: async () => requestData,
            });

            request = newRequest;
          } catch (error) {
            if (config.error_handling === 'fail_fast') {
              return NextResponse.json(
                { error: 'Failed to process request data' },
                { status: 400 },
              );
            }
            console.error('Request encryption error:', error);
          }
        }

        // Call the original handler
        const response = await handler(request);

        // Process response data decryption
        if (
          config.decrypt_on_read.length > 0 &&
          response.headers.get('content-type')?.includes('application/json')
        ) {
          try {
            const responseData = await response.json();

            const { data: decryptedData, result: decryptResult } =
              await decryptResponseFields(
                responseData,
                dataType,
                config,
                request,
              );

            // Audit decryption operation
            if (config.enable_logging) {
              await auditEncryptionOperation(
                { ...decryptResult, user_id: userId },
                {
                  enabled: true,
                  log_events: ['decrypt'],
                  retention_days: 90,
                  encrypt_audit_logs: false,
                  storage_location: 'database',
                },
              );
            }

            return NextResponse.json(decryptedData, {
              status: response.status,
              headers: response.headers,
            });
          } catch (error) {
            if (config.error_handling === 'fail_fast') {
              return NextResponse.json(
                { error: 'Failed to process response data' },
                { status: 500 },
              );
            }
            console.error('Response decryption error:', error);
          }
        }

        // Performance monitoring
        if (config.performance_monitoring.track_timing) {
          const duration = Date.now() - startTime;
          if (
            duration > config.performance_monitoring.slow_operation_threshold
          ) {
            console.warn(
              `Slow encryption operation: ${duration}ms for ${request.url}`,
            );
          }
        }

        return response;
      } catch (error) {
        console.error('Encryption middleware error:', error);

        return NextResponse.json(
          {
            error: 'Internal server error',
            message:
              process.env.NODE_ENV === 'development'
                ? error instanceof Error
                  ? error.message
                  : 'Unknown error'
                : 'Operation failed',
          },
          { status: 500 },
        );
      }
    };
  };
}

/**
 * Factory function to create route-specific encryption middleware
 */
export function createEncryptionMiddleware(
  dataType: WeddingDataType,
  fieldsToEncrypt: string[],
  fieldsToDecrypt: string[] = [],
  options: Partial<EncryptionMiddlewareOptions> = {},
): (
  handler: (request: NextRequest) => Promise<NextResponse>,
) => (request: NextRequest) => Promise<NextResponse> {
  return withEncryption(dataType, {
    ...options,
    encrypt_on_write: fieldsToEncrypt,
    decrypt_on_read: fieldsToDecrypt,
  });
}

/**
 * Pre-configured middleware for common wedding data types
 */
export const encryptionMiddleware = {
  guest: (options?: Partial<EncryptionMiddlewareOptions>) =>
    withEncryption('guest', {
      encrypt_on_write: [
        'email',
        'phone',
        'address',
        'dietary_restrictions',
        'notes',
      ],
      decrypt_on_read: [
        'email',
        'phone',
        'address',
        'dietary_restrictions',
        'notes',
      ],
      ...options,
    }),

  vendor: (options?: Partial<EncryptionMiddlewareOptions>) =>
    withEncryption('vendor', {
      encrypt_on_write: [
        'contact_email',
        'contact_phone',
        'business_address',
        'tax_id',
        'bank_details',
        'notes',
      ],
      decrypt_on_read: [
        'contact_email',
        'contact_phone',
        'business_address',
        'tax_id',
        'bank_details',
        'notes',
      ],
      ...options,
    }),

  payment: (options?: Partial<EncryptionMiddlewareOptions>) =>
    withEncryption('payment', {
      encrypt_on_write: [
        'card_number',
        'cvv',
        'account_number',
        'routing_number',
        'billing_address',
      ],
      decrypt_on_read: [], // Never decrypt payment details in responses for security
      ...options,
    }),

  timeline: (options?: Partial<EncryptionMiddlewareOptions>) =>
    withEncryption('timeline', {
      encrypt_on_write: [
        'private_notes',
        'vendor_contact_info',
        'location_details',
      ],
      decrypt_on_read: [
        'private_notes',
        'vendor_contact_info',
        'location_details',
      ],
      ...options,
    }),
};

/**
 * Default export
 */
export default {
  withEncryption,
  createEncryptionMiddleware,
  encryptionMiddleware,
};
