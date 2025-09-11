/**
 * Tests for API Error Handler
 */

import { ApiException } from '../../../src/lib/api/error-handler';

describe('ApiException', () => {
  describe('Static Factory Methods', () => {
    it('should create validation error', () => {
      const error = ApiException.validation('Invalid input data', {
        field: 'email',
        value: 'invalid-email'
      });

      expect(error.name).toBe('ApiException');
      expect(error.message).toBe('Invalid input data');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({
        field: 'email',
        value: 'invalid-email'
      });
      expect(error.isPublic).toBe(true);
    });

    it('should create authentication error', () => {
      const error = ApiException.unauthorized('Authentication required');

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
      expect(error.isPublic).toBe(true);
    });

    it('should create forbidden error', () => {
      const error = ApiException.forbidden('Access denied');

      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.isPublic).toBe(true);
    });

    it('should create not found error', () => {
      const error = ApiException.notFound('Resource not found', {
        resourceType: 'user',
        id: '123'
      });

      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.context).toEqual({
        resourceType: 'user',
        id: '123'
      });
      expect(error.isPublic).toBe(true);
    });

    it('should create rate limit error', () => {
      const resetTime = new Date();
      const error = ApiException.rateLimit('Rate limit exceeded', {
        resetTime: resetTime.toISOString(),
        limit: 100
      });

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.context).toEqual({
        resetTime: resetTime.toISOString(),
        limit: 100
      });
      expect(error.isPublic).toBe(true);
    });

    it('should create internal error', () => {
      const error = ApiException.internal('Database connection failed', {
        database: 'postgres',
        error: 'Connection timeout'
      });

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.context).toEqual({
        database: 'postgres',
        error: 'Connection timeout'
      });
      expect(error.isPublic).toBe(false);
      expect(error.originalMessage).toBe('Database connection failed');
    });

    it('should create conflict error', () => {
      const error = ApiException.conflict('Email already exists', {
        email: 'test@example.com'
      });

      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.context).toEqual({
        email: 'test@example.com'
      });
      expect(error.isPublic).toBe(true);
    });

    it('should create service unavailable error', () => {
      const error = ApiException.serviceUnavailable('External API down', {
        service: 'spotify',
        retryAfter: 300
      });

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('External API down');
      expect(error.context).toEqual({
        service: 'spotify',
        retryAfter: 300
      });
      expect(error.isPublic).toBe(true);
    });
  });

  describe('Error Response Format', () => {
    it('should format public error for API response', () => {
      const error = ApiException.validation('Invalid email format', {
        field: 'email',
        received: 'invalid-email'
      });

      const response = error.toResponse();

      expect(response).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          context: {
            field: 'email',
            received: 'invalid-email'
          }
        }
      });
    });

    it('should format internal error for API response', () => {
      const error = ApiException.internal('Database query failed', {
        query: 'SELECT * FROM users',
        error: 'Connection lost'
      });

      const response = error.toResponse();

      expect(response).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          // Context should not be included for internal errors
          context: undefined
        }
      });
    });

    it('should include request ID if provided', () => {
      const error = ApiException.validation('Invalid data');
      error.requestId = 'req-123';

      const response = error.toResponse();

      expect(response.error.requestId).toBe('req-123');
    });
  });

  describe('Error Inheritance', () => {
    it('should be instance of Error', () => {
      const error = ApiException.validation('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiException);
    });

    it('should maintain stack trace', () => {
      const error = ApiException.validation('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiException');
    });
  });

  describe('Error Context Handling', () => {
    it('should handle undefined context gracefully', () => {
      const error = ApiException.validation('Test error');

      expect(error.context).toBeUndefined();

      const response = error.toResponse();
      expect(response.error.context).toBeUndefined();
    });

    it('should handle complex context objects', () => {
      const complexContext = {
        user: { id: '123', email: 'test@example.com' },
        request: { method: 'POST', path: '/api/test' },
        timestamp: new Date().toISOString(),
        nested: { deep: { value: 'test' } }
      };

      const error = ApiException.validation('Complex error', complexContext);

      expect(error.context).toEqual(complexContext);

      const response = error.toResponse();
      expect(response.error.context).toEqual(complexContext);
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive internal context in public errors', () => {
      const sensitiveContext = {
        apiKey: 'secret-key-123',
        password: 'user-password',
        token: 'jwt-token-here'
      };

      const error = ApiException.internal('Internal failure', sensitiveContext);

      const response = error.toResponse();

      // Internal error context should not be exposed
      expect(response.error.context).toBeUndefined();
      expect(response.error.message).toBe('Internal server error');
      expect(response.error.message).not.toContain('secret-key-123');
    });

    it('should safely expose validation context', () => {
      const validationContext = {
        field: 'email',
        rule: 'format',
        received: 'invalid-email'
      };

      const error = ApiException.validation('Invalid email', validationContext);

      const response = error.toResponse();

      // Validation context should be exposed as it helps users fix their input
      expect(response.error.context).toEqual(validationContext);
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should map error types to correct HTTP status codes', () => {
      const testCases = [
        { method: 'validation', expectedStatus: 400 },
        { method: 'unauthorized', expectedStatus: 401 },
        { method: 'forbidden', expectedStatus: 403 },
        { method: 'notFound', expectedStatus: 404 },
        { method: 'conflict', expectedStatus: 409 },
        { method: 'rateLimit', expectedStatus: 429 },
        { method: 'internal', expectedStatus: 500 },
        { method: 'serviceUnavailable', expectedStatus: 503 }
      ];

      testCases.forEach(({ method, expectedStatus }) => {
        const error = (ApiException as any)[method]('Test message');
        expect(error.statusCode).toBe(expectedStatus);
      });
    });
  });

  describe('Error Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = ApiException.validation('Test error', { field: 'test' });
      error.requestId = 'req-123';

      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('ApiException');
      expect(parsed.message).toBe('Test error');
      expect(parsed.code).toBe('VALIDATION_ERROR');
      expect(parsed.statusCode).toBe(400);
      expect(parsed.context).toEqual({ field: 'test' });
      expect(parsed.requestId).toBe('req-123');
    });

    it('should handle circular references in context', () => {
      const circularContext: any = { self: null };
      circularContext.self = circularContext;

      // Should not throw when creating error with circular reference
      expect(() => {
        ApiException.validation('Circular test', circularContext);
      }).not.toThrow();
    });
  });
});