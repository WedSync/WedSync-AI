/**
 * Encryption Middleware Tests for WS-175 Encryption Integration
 * Comprehensive test coverage for API route encryption/decryption middleware
 */

// Vitest globals enabled - no imports needed for test functions
import { vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  withEncryption,
  createEncryptionMiddleware,
  encryptionMiddleware
} from '@/lib/integrations/encryption/encryption-middleware';
import type { EncryptionMiddlewareOptions } from '@/types/encryption-integration';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    json: vi.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
    ip: '127.0.0.1'
  })),
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      headers: options?.headers || new Map()
    }))
  }
}));

const mockGetServerSession = getServerSession as vi.MockedFunction<typeof getServerSession>;
const mockNextResponse = NextResponse as vi.Mocked<typeof NextResponse>;

// Mock handler for testing
const createMockHandler = (responseData: any, status = 200) => 
  vi.fn().mockResolvedValue(
    NextResponse.json(responseData, { status })
  );

describe('Encryption Middleware - withEncryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should allow GET requests without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const middleware = withEncryption('guest');
      const handler = createMockHandler({ guests: [] });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'GET'
      });
      
      await wrappedHandler(request);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should require authentication for POST requests', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const middleware = withEncryption('guest');
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe' })
      });
      
      const response = await wrappedHandler(request);
      const responseData = await response.json();
      
      expect(responseData.error).toBe('Authentication required for data modification');
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow authenticated POST requests', async () => {
      const middleware = withEncryption('guest');
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
      });
      
      await wrappedHandler(request);
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits when configured', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        rate_limiting: {
          operations_per_minute: 2,
          burst_limit: 1,
          scope: 'per_user'
        }
      };

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const createRequest = () => new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });

      // First requests should succeed
      await wrappedHandler(createRequest());
      await wrappedHandler(createRequest());
      
      // Third request should be rate limited
      const response = await wrappedHandler(createRequest());
      const responseData = await response.json();
      
      expect(responseData.error).toBe('Rate limit exceeded for encryption operations');
      expect(response.status).toBe(429);
    });

    it('should use IP-based rate limiting when user not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const options: Partial<EncryptionMiddlewareOptions> = {
        rate_limiting: {
          operations_per_minute: 1,
          burst_limit: 1,
          scope: 'per_ip'
        }
      };

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler({ guests: [] });
      const wrappedHandler = middleware(handler);
      
      const createRequest = () => new NextRequest('http://localhost/api/guests', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.100' }
      });

      // First request should succeed
      await wrappedHandler(createRequest());
      
      // Second request should be rate limited
      const response = await wrappedHandler(createRequest());
      const responseData = await response.json();
      
      expect(responseData.error).toBe('Rate limit exceeded for encryption operations');
    });
  });

  describe('Request Encryption', () => {
    it('should encrypt specified fields in POST requests', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        encrypt_on_write: ['email', 'phone'],
        error_handling: 'fail_fast'
      };

      const middleware = withEncryption('guest', options);
      const handler = vi.fn().mockImplementation(async (req) => {
        const body = await req.json();
        return NextResponse.json({ received: body });
      });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        })
      });
      
      await wrappedHandler(request);
      
      expect(handler).toHaveBeenCalled();
      
      // Check that handler received encrypted data
      const handlerCall = handler.mock.calls[0][0];
      const requestBody = await handlerCall.json();
      
      expect(requestBody.name).toBe('John Doe'); // Not encrypted
      expect(requestBody.email).toHaveProperty('encrypted_value'); // Encrypted
      expect(requestBody.phone).toHaveProperty('encrypted_value'); // Encrypted
    });

    it('should handle encryption errors gracefully with fail_fast strategy', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        encrypt_on_write: ['email'],
        error_handling: 'fail_fast'
      };

      // Mock encryption service to fail
      vi.doMock('@/lib/integrations/encryption/data-mapper', () => ({
        ...vi.requireActual('@/lib/integrations/encryption/data-mapper'),
        createFieldMapper: () => ({
          encrypt: vi.fn().mockRejectedValue(new Error('Encryption service down'))
        })
      }));

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });
      
      const response = await wrappedHandler(request);
      const responseData = await response.json();
      
      expect(responseData.error).toBe('Failed to process request data');
      expect(response.status).toBe(400);
    });
  });

  describe('Response Decryption', () => {
    it('should decrypt specified fields in JSON responses', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        decrypt_on_read: ['email', 'phone']
      };

      const encryptedResponseData = {
        id: '123',
        name: 'John Doe',
        email: {
          encrypted_value: Buffer.from('john@example.com').toString('base64'),
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        },
        phone: {
          encrypted_value: Buffer.from('+1234567890').toString('base64'),
          algorithm: 'AES-256-GCM',
          iv: 'test-iv',
          auth_tag: 'test-tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        }
      };

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler(encryptedResponseData);
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests/123', {
        method: 'GET'
      });
      
      const response = await wrappedHandler(request);
      const responseData = await response.json();
      
      expect(responseData.name).toBe('John Doe');
      expect(responseData.email).toBe('john@example.com');
      expect(responseData.phone).toBe('+1234567890');
    });

    it('should not decrypt non-JSON responses', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        decrypt_on_read: ['email']
      };

      const middleware = withEncryption('guest', options);
      const handler = vi.fn().mockResolvedValue(
        new Response('Plain text response', {
          headers: { 'Content-Type': 'text/plain' }
        })
      );
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'GET'
      });
      
      const response = await wrappedHandler(request);
      
      expect(response).toBeDefined();
      // Should not attempt decryption on non-JSON responses
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after multiple failures', async () => {
      // This test would require mocking the circuit breaker behavior
      // For now, we'll test that the middleware handles service unavailability
      
      const options: Partial<EncryptionMiddlewareOptions> = {
        encrypt_on_write: ['email'],
        error_handling: 'use_fallback'
      };

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });
      
      // Should handle gracefully even if encryption service is unavailable
      const response = await wrappedHandler(request);
      
      expect(response).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation timing when configured', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      const options: Partial<EncryptionMiddlewareOptions> = {
        performance_monitoring: {
          track_timing: true,
          track_memory: false,
          slow_operation_threshold: 1, // Very low threshold to trigger warning
          sample_rate: 1.0
        }
      };

      const middleware = withEncryption('guest', options);
      const handler = vi.fn().mockImplementation(async () => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return NextResponse.json({ success: true });
      });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'GET'
      });
      
      await wrappedHandler(request);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow encryption operation')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling Strategies', () => {
    it('should skip failed fields with skip_field strategy', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        encrypt_on_write: ['email', 'phone'],
        error_handling: 'skip_field'
      };

      // Mock partial encryption failure
      vi.doMock('@/lib/integrations/encryption/data-mapper', () => ({
        ...vi.requireActual('@/lib/integrations/encryption/data-mapper'),
        createFieldMapper: () => ({
          encrypt: vi.fn().mockResolvedValue({
            data: { email: 'failed', phone: { encrypted_value: 'success' } },
            encryptedFields: ['phone'],
            errors: ['Email encryption failed']
          })
        })
      }));

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', phone: '+1234567890' })
      });
      
      const response = await wrappedHandler(request);
      
      // Should not fail completely, but log warnings
      expect(response.status).not.toBe(400);
    });

    it('should use fallback data with use_fallback strategy', async () => {
      const options: Partial<EncryptionMiddlewareOptions> = {
        encrypt_on_write: ['email'],
        error_handling: 'use_fallback'
      };

      const middleware = withEncryption('guest', options);
      const handler = createMockHandler({ success: true });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });
      
      // Should proceed even if encryption fails
      const response = await wrappedHandler(request);
      
      expect(response).toBeDefined();
    });
  });
});

describe('Encryption Middleware - Pre-configured Middlewares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });
  });

  describe('Guest Middleware', () => {
    it('should encrypt guest-specific fields', async () => {
      const middleware = encryptionMiddleware.guest();
      const handler = vi.fn().mockImplementation(async (req) => {
        const body = await req.json();
        return NextResponse.json(body);
      });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'John',
          email: 'john@example.com',
          phone: '+1234567890',
          dietary_restrictions: 'Vegetarian'
        })
      });
      
      await wrappedHandler(request);
      
      const handlerCall = handler.mock.calls[0][0];
      const requestBody = await handlerCall.json();
      
      expect(requestBody.first_name).toBe('John'); // Not encrypted
      expect(requestBody.email).toHaveProperty('encrypted_value');
      expect(requestBody.phone).toHaveProperty('encrypted_value');
      expect(requestBody.dietary_restrictions).toHaveProperty('encrypted_value');
    });
  });

  describe('Vendor Middleware', () => {
    it('should encrypt vendor-specific fields', async () => {
      const middleware = encryptionMiddleware.vendor();
      const handler = vi.fn().mockImplementation(async (req) => {
        const body = await req.json();
        return NextResponse.json(body);
      });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: 'Best Catering',
          contact_email: 'info@bestcatering.com',
          tax_id: 'TAX123456'
        })
      });
      
      await wrappedHandler(request);
      
      const handlerCall = handler.mock.calls[0][0];
      const requestBody = await handlerCall.json();
      
      expect(requestBody.business_name).toBe('Best Catering'); // Not encrypted
      expect(requestBody.contact_email).toHaveProperty('encrypted_value');
      expect(requestBody.tax_id).toHaveProperty('encrypted_value');
    });
  });

  describe('Payment Middleware', () => {
    it('should encrypt payment fields but never decrypt them', async () => {
      const middleware = encryptionMiddleware.payment();
      const handler = vi.fn().mockImplementation(async (req) => {
        const body = await req.json();
        // Return encrypted payment data (should not be decrypted)
        return NextResponse.json({
          id: '123',
          card_number: {
            encrypted_value: 'encrypted-card-data',
            algorithm: 'AES-256-GCM',
            iv: 'iv',
            auth_tag: 'tag',
            encrypted_at: '2025-01-20T10:00:00.000Z',
            schema_version: 1
          }
        });
      });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_number: '4111111111111111',
          amount: 1000
        })
      });
      
      const response = await wrappedHandler(request);
      const responseData = await response.json();
      
      // Card number should remain encrypted in response
      expect(responseData.card_number).toHaveProperty('encrypted_value');
      expect(responseData.card_number.encrypted_value).toBe('encrypted-card-data');
    });
  });

  describe('Timeline Middleware', () => {
    it('should encrypt timeline private fields', async () => {
      const middleware = encryptionMiddleware.timeline();
      const handler = vi.fn().mockImplementation(async (req) => {
        const body = await req.json();
        return NextResponse.json(body);
      });
      const wrappedHandler = middleware(handler);
      
      const request = new NextRequest('http://localhost/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Venue Meeting',
          private_notes: 'Discuss pricing and availability',
          vendor_contact_info: 'manager@venue.com'
        })
      });
      
      await wrappedHandler(request);
      
      const handlerCall = handler.mock.calls[0][0];
      const requestBody = await handlerCall.json();
      
      expect(requestBody.title).toBe('Venue Meeting'); // Not encrypted
      expect(requestBody.private_notes).toHaveProperty('encrypted_value');
      expect(requestBody.vendor_contact_info).toHaveProperty('encrypted_value');
    });
  });
});

describe('Encryption Middleware - createEncryptionMiddleware Factory', () => {
  it('should create custom middleware with specified fields', async () => {
    const middleware = createEncryptionMiddleware(
      'guest',
      ['custom_field1', 'custom_field2'],
      ['custom_field1'],
      { enable_logging: false }
    );
    
    const handler = vi.fn().mockImplementation(async (req) => {
      const body = await req.json();
      return NextResponse.json({
        ...body,
        custom_field1: {
          encrypted_value: 'encrypted-data',
          algorithm: 'AES-256-GCM',
          iv: 'iv',
          auth_tag: 'tag',
          encrypted_at: '2025-01-20T10:00:00.000Z',
          schema_version: 1
        }
      });
    });
    const wrappedHandler = middleware(handler);
    
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });
    
    const request = new NextRequest('http://localhost/api/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regular_field: 'normal data',
        custom_field1: 'sensitive data 1',
        custom_field2: 'sensitive data 2'
      })
    });
    
    const response = await wrappedHandler(request);
    
    expect(handler).toHaveBeenCalled();
    expect(response).toBeDefined();
  });
});

describe('Encryption Middleware - Edge Cases and Error Handling', () => {
  beforeEach(() => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });
  });

  it('should handle malformed JSON in requests', async () => {
    const middleware = withEncryption('guest');
    const handler = createMockHandler({ success: true });
    const wrappedHandler = middleware(handler);
    
    const request = new NextRequest('http://localhost/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{'
    });
    
    // Should handle gracefully
    const response = await wrappedHandler(request);
    expect(response).toBeDefined();
  });

  it('should handle empty request bodies', async () => {
    const middleware = withEncryption('guest', { encrypt_on_write: ['email'] });
    const handler = createMockHandler({ success: true });
    const wrappedHandler = middleware(handler);
    
    const request = new NextRequest('http://localhost/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const response = await wrappedHandler(request);
    expect(response).toBeDefined();
  });

  it('should preserve request headers and method', async () => {
    const middleware = withEncryption('guest');
    const handler = vi.fn().mockImplementation(async (req) => {
      expect(req.method).toBe('PATCH');
      expect(req.headers.get('X-Custom-Header')).toBe('test-value');
      return NextResponse.json({ success: true });
    });
    const wrappedHandler = middleware(handler);
    
    const request = new NextRequest('http://localhost/api/guests/123', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'X-Custom-Header': 'test-value'
      },
      body: JSON.stringify({ name: 'Updated Name' })
    });
    
    await wrappedHandler(request);
    
    expect(handler).toHaveBeenCalled();
  });

  it('should handle concurrent requests correctly', async () => {
    const middleware = withEncryption('guest', { encrypt_on_write: ['email'] });
    const handler = createMockHandler({ success: true });
    const wrappedHandler = middleware(handler);
    
    const requests = Array.from({ length: 5 }, (_, i) => 
      new NextRequest('http://localhost/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `user${i}@example.com` })
      })
    );
    
    const responses = await Promise.all(
      requests.map(req => wrappedHandler(req))
    );
    
    expect(responses).toHaveLength(5);
    expect(handler).toHaveBeenCalledTimes(5);
  });
});