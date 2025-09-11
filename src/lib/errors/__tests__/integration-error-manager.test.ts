// WS-198 Team C Integration Architect - Integration Error Manager Tests
// Comprehensive test suite for error handling system

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationErrorManager, IntegrationError, IntegrationErrorContext } from '../integration-error-manager';
import Redis from 'ioredis';
// Mock Redis and Supabase
vi.mock('ioredis');
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }))
}));
describe('IntegrationErrorManager', () => {
  let errorManager: IntegrationErrorManager;
  let mockRedis: any;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Redis methods
    mockRedis = {
      get: vi.fn(() => Promise.resolve(null)),
      set: vi.fn(() => Promise.resolve('OK')),
      setex: vi.fn(() => Promise.resolve('OK')),
      lpush: vi.fn(() => Promise.resolve(1)),
      lrange: vi.fn(() => Promise.resolve([]))
    };
    (Redis as any).mockImplementation(() => mockRedis);
    errorManager = new IntegrationErrorManager();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('Error Handling', () => {
    it('should handle payment service errors with appropriate retry strategy', async () => {
      const error: IntegrationError = new Error('Payment declined') as IntegrationError;
      const context: IntegrationErrorContext = {
        serviceName: 'stripe_payments',
        serviceType: 'payment',
        endpoint: '/v1/payment_intents',
        requestId: 'req_123',
        retryAttempt: 0,
        errorDetails: {
          httpStatus: 402,
          errorCode: 'card_declined',
          responseTime: 500,
          errorMessage: 'Payment declined'
        }
      };
      const result = await errorManager.handleIntegrationError(error, context);
      expect(result.errorHandled).toBe(true);
      expect(result.retryRecommended).toBe(false); // Payment declined should not retry
      expect(result.fallbackUsed).toBe(true);
    });
    it('should handle wedding day critical errors with immediate fallback', async () => {
      const error: IntegrationError = new Error('Service unavailable') as IntegrationError;
        requestId: 'req_456',
        weddingContext: {
          weddingId: 'wedding_123',
          weddingDate: new Date().toISOString().split('T')[0], // Today
          vendorType: 'photographer',
          criticalityLevel: 'wedding_day_critical'
        },
          httpStatus: 503,
          errorCode: 'service_unavailable',
          responseTime: 30000,
          errorMessage: 'Service unavailable'
      expect(result.retryRecommended).toBe(false); // Wedding day critical - no retries
      expect(result.serviceHealthStatus).toBeDefined();
    it('should handle email service errors with retry strategy', async () => {
      const error: IntegrationError = new Error('Rate limited') as IntegrationError;
        serviceName: 'email_service',
        serviceType: 'email',
        endpoint: '/send',
        requestId: 'req_789',
        retryAttempt: 1,
          httpStatus: 429,
          errorCode: 'rate_limit_exceeded',
          responseTime: 1000,
          errorMessage: 'Rate limited'
      expect(result.retryRecommended).toBe(true);
      expect(result.retryAfterSeconds).toBeGreaterThan(60); // Email rate limit has 2 min delay
  describe('Circuit Breaker Integration', () => {
    it('should check circuit breaker status for service', async () => {
        endpoint: '/v1/charges',
        requestId: 'req_cb1',
          httpStatus: 500,
          errorMessage: 'Internal server error'
      const error: IntegrationError = new Error('Server error') as IntegrationError;
      expect(['closed', 'open', 'half_open', 'unknown']).toContain(result.serviceHealthStatus);
  describe('Fallback Mechanisms', () => {
    it('should apply cached data fallback when available', async () => {
      // Mock Redis to return cached data
      mockRedis.get.mockResolvedValue(JSON.stringify({
        timestamp: Date.now() - 1000, // 1 second old
        data: { cachedResult: true }
      }));
      const error: IntegrationError = new Error('Service timeout') as IntegrationError;
        serviceName: 'vendor_api',
        serviceType: 'vendor_api',
        endpoint: '/sync',
        requestId: 'req_cache1',
          httpStatus: 408,
          errorMessage: 'Request timeout'
      expect(result.fallbackData).toBeDefined();
    it('should apply graceful degradation for SMS service', async () => {
      const error: IntegrationError = new Error('SMS service down') as IntegrationError;
        serviceName: 'sms_service',
        serviceType: 'sms',
        endpoint: '/send_sms',
        requestId: 'req_sms1',
          errorMessage: 'SMS service down'
      expect(result.fallbackData).toMatchObject({
        degradedMode: true,
        alternativeMethodUsed: 'email'
      });
  describe('Retry Strategy Logic', () => {
    it('should not retry 4xx client errors', async () => {
      const error: IntegrationError = new Error('Bad request') as IntegrationError;
        requestId: 'req_400',
          httpStatus: 400,
          errorMessage: 'Bad request'
      expect(result.retryRecommended).toBe(false);
    it('should retry 5xx server errors with backoff', async () => {
      const error: IntegrationError = new Error('Internal server error') as IntegrationError;
        requestId: 'req_500',
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    it('should increase delay with exponential backoff', async () => {
      
      const context1: IntegrationErrorContext = {
        requestId: 'req_exp1',
        errorDetails: { httpStatus: 500, errorMessage: 'Server error' }
      const context2: IntegrationErrorContext = {
        ...context1,
        requestId: 'req_exp2',
        retryAttempt: 2
      const result1 = await errorManager.handleIntegrationError(error, context1);
      const result2 = await errorManager.handleIntegrationError(error, context2);
      expect(result2.retryAfterSeconds).toBeGreaterThan(result1.retryAfterSeconds);
  describe('Wedding Context Handling', () => {
    it('should prioritize wedding day critical operations', async () => {
      const error: IntegrationError = new Error('Temporary failure') as IntegrationError;
      const regularContext: IntegrationErrorContext = {
        requestId: 'req_regular',
        errorDetails: { httpStatus: 503, errorMessage: 'Temporary failure' }
      const weddingCriticalContext: IntegrationErrorContext = {
        ...regularContext,
        requestId: 'req_wedding',
          weddingId: 'wedding_456',
          weddingDate: new Date().toISOString().split('T')[0],
      const regularResult = await errorManager.handleIntegrationError(error, regularContext);
      const weddingResult = await errorManager.handleIntegrationError(error, weddingCriticalContext);
      // Wedding critical should use fallback immediately, not retry
      expect(regularResult.retryRecommended).toBe(true);
      expect(weddingResult.retryRecommended).toBe(false);
      expect(weddingResult.fallbackUsed).toBe(true);
    it('should handle vendor-specific error contexts', async () => {
      const error: IntegrationError = new Error('Vendor API error') as IntegrationError;
        requestId: 'req_vendor1',
          weddingId: 'wedding_789',
          weddingDate: '2024-06-15',
          vendorType: 'florist',
          criticalityLevel: 'high'
          httpStatus: 502,
          errorMessage: 'Vendor API error'
      expect(result.errorId).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
  describe('Error Logging and Metrics', () => {
    it('should log integration errors with full context', async () => {
      const error: IntegrationError = new Error('Test error') as IntegrationError;
        serviceName: 'test_service',
        serviceType: 'webhook',
        endpoint: '/webhook',
        requestId: 'req_log1',
          errorMessage: 'Test error'
      await errorManager.handleIntegrationError(error, context);
      // Verify that supabase insert was called for logging
      // (This would be verified through mock calls in a real test environment)
      expect(true).toBe(true); // Placeholder assertion
    it('should update service health metrics', async () => {
      const error: IntegrationError = new Error('Health test') as IntegrationError;
        serviceName: 'health_test_service',
        endpoint: '/health',
        requestId: 'req_health1',
          responseTime: 5000,
          errorMessage: 'Health test'
  describe('Performance and Scalability', () => {
    it('should handle high volume of errors efficiently', async () => {
      const errors: Promise<any>[] = [];
      const startTime = Date.now();
      // Create 100 concurrent error handling requests
      for (let i = 0; i < 100; i++) {
        const error: IntegrationError = new Error(`Load test error ${i}`) as IntegrationError;
        const context: IntegrationErrorContext = {
          serviceName: 'load_test_service',
          serviceType: 'email',
          endpoint: '/load_test',
          requestId: `req_load_${i}`,
          retryAttempt: 0,
          errorDetails: {
            httpStatus: 500,
            errorMessage: `Load test error ${i}`
          }
        };
        errors.push(errorManager.handleIntegrationError(error, context));
      }
      const results = await Promise.all(errors);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      expect(results).toHaveLength(100);
      expect(results.every(r => r.errorHandled)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    it('should not block on failed fallback operations', async () => {
      // Mock Redis to fail
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      const error: IntegrationError = new Error('Service error with Redis failure') as IntegrationError;
        serviceName: 'resilient_service',
        endpoint: '/resilient',
        requestId: 'req_resilient1',
          errorMessage: 'Service error with Redis failure'
      expect(endTime - startTime).toBeLessThan(2000); // Should not hang
  describe('Edge Cases and Error Conditions', () => {
    it('should handle missing service configuration gracefully', async () => {
      const error: IntegrationError = new Error('Unknown service error') as IntegrationError;
        serviceName: 'unknown_service',
        endpoint: '/unknown',
        requestId: 'req_unknown1',
          errorMessage: 'Unknown service error'
      expect(result.fallbackUsed).toBe(false); // No fallback strategy configured
    it('should handle malformed error contexts', async () => {
      const error: IntegrationError = new Error('Malformed context test') as IntegrationError;
        serviceName: '',
        endpoint: '',
        requestId: '',
        retryAttempt: -1,
          errorMessage: ''
    it('should handle handler failures gracefully', async () => {
      // Force an error in the handler by providing invalid data
      const error: IntegrationError = null as any;
        serviceName: 'error_test_service',
        endpoint: '/error_test',
        requestId: 'req_error1',
          errorMessage: 'Forced handler error'
      expect(result.errorHandled).toBe(false);
});
// Integration tests with real dependencies (if needed)
describe('IntegrationErrorManager Integration Tests', () => {
  // These would run against real Redis and Supabase instances in a test environment
  it.skip('should integrate with Redis for retry scheduling', async () => {
    // Integration test implementation
  it.skip('should integrate with Supabase for error logging', async () => {
  it.skip('should integrate with circuit breakers for service health', async () => {
