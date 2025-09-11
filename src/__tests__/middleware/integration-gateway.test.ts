import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntegrationGateway } from '../../middleware/integration-gateway';
import Redis from 'ioredis';

// Mock Redis
vi.mock('ioredis');
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  hset: vi.fn(),
  hgetall: vi.fn(),
  hincrby: vi.fn(),
  hget: vi.fn(),
  lrem: vi.fn(),
  disconnect: vi.fn()
};
// Mock fetch
global.fetch = vi.fn();
describe('IntegrationGateway', () => {
  let gateway: IntegrationGateway;
  beforeEach(() => {
    vi.clearAllMocks();
    (Redis as unknown).mockImplementation(() => mockRedis);
    gateway = new IntegrationGateway();
  });
  afterEach(async () => {
    await gateway.disconnect();
  describe('Constructor and Initialization', () => {
    it('should initialize with default service configurations', () => {
      expect(gateway).toBeInstanceOf(IntegrationGateway);
    });
    it('should set up circuit breakers for all services', () => {
      // Circuit breakers are set up internally - we verify by checking service health
      expect(gateway.getServiceHealth('stripe_payments')).toBeDefined();
  describe('Request Routing', () => {
    beforeEach(() => {
      // Mock rate limiting to allow requests
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      
      // Mock successful fetch response
      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'test-payment', status: 'succeeded' }),
        headers: new Headers({ 'content-type': 'application/json' })
      });
    it('should route request successfully to Stripe payments', async () => {
      const response = await gateway.routeRequest(
        'stripe_payments',
        '/v1/payments',
        {
          method: 'POST',
          body: JSON.stringify({ amount: 1000 })
        },
        { requestId: 'test-request', clientId: 'test-client' }
      );
      expect(response).toEqual({
        id: 'test-payment',
        object: undefined,
        status: 'succeeded',
        amount: undefined,
        currency: undefined,
        metadata: undefined,
        created: undefined,
        createdAt: expect.any(String),
        provider: 'stripe'
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/payments',
        expect.objectContaining({
          body: JSON.stringify({ amount: 1000 }),
          headers: expect.any(Headers)
        })
    it('should handle rate limiting correctly', async () => {
      // Mock rate limit exceeded
      mockRedis.incr.mockResolvedValue(101); // Exceeds limit of 100
      await expect(
        gateway.routeRequest(
          'stripe_payments',
          '/v1/payments',
          { method: 'GET' },
          { requestId: 'test-request', clientId: 'test-client' }
        )
      ).rejects.toThrow('Rate limit exceeded');
      expect(global.fetch).not.toHaveBeenCalled();
    it('should throw error for unknown service', async () => {
          'unknown_service',
          '/test',
      ).rejects.toThrow('Service configuration not found: unknown_service');
    it('should add correct authentication headers for different auth types', async () => {
      // Test API key authentication (email service)
      await gateway.routeRequest(
        'email_service',
        '/emails',
        { method: 'POST' },
        expect.stringContaining('/emails'),
      // Verify Authorization header was set
      const lastCall = (global.fetch as unknown).mock.calls[0][1];
      const authHeader = lastCall.headers.get('Authorization');
      expect(authHeader).toMatch(/^Bearer/);
  describe('Circuit Breaker Functionality', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      // Mock failing fetch requests
      (global.fetch as unknown).mockRejectedValue(new Error('Service unavailable'));
      mockRedis.incr.mockResolvedValue(1); // Allow through rate limiting
      // Make multiple requests to trigger circuit breaker
      const requests = Array(6).fill(null).map(() =>
          'email_service',
          { requestId: `test-${Math.random()}`, clientId: 'test-client' }
        ).catch(() => {}) // Ignore errors for this test
      await Promise.all(requests);
      // Circuit breaker should now be open
      const healthMetrics = await gateway.getServiceHealth('email_service');
      expect(healthMetrics?.status).toBe('down');
  describe('Response Normalization', () => {
    it('should normalize Stripe responses correctly', async () => {
      const stripeResponse = {
        id: 'pi_test123',
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        created: 1234567890,
        metadata: { wedding_id: 'wed_123' }
      };
        json: () => Promise.resolve(stripeResponse),
        '/v1/payment_intents/pi_test123',
        { method: 'GET' },
        metadata: { wedding_id: 'wed_123' },
        createdAt: '2009-02-13T23:31:30.000Z',
    it('should normalize email service responses correctly', async () => {
      const emailResponse = {
        id: 'email_123',
        status: 'delivered',
        to: 'bride@example.com',
        subject: 'Wedding Confirmation',
        created_at: '2025-01-20T10:00:00Z'
        json: () => Promise.resolve(emailResponse),
        '/emails/email_123',
        recipient: 'bride@example.com',
        createdAt: '2025-01-20T10:00:00Z',
        provider: 'resend'
  describe('Health Metrics', () => {
    it('should track service health metrics', async () => {
      const healthMetrics = await gateway.getServiceHealth('stripe_payments');
      expect(healthMetrics).toEqual({
        serviceId: 'stripe_payments',
        status: 'healthy',
        responseTime: expect.any(Number),
        errorRate: expect.any(Number),
        lastCheck: expect.any(Date),
        consecutiveFailures: 0
    it('should return all services health status', async () => {
      const allHealth = await gateway.getAllServicesHealth();
      expect(Array.isArray(allHealth)).toBe(true);
      expect(allHealth.length).toBeGreaterThan(0);
      allHealth.forEach(health => {
        expect(health).toHaveProperty('serviceId');
        expect(health).toHaveProperty('status');
        expect(['healthy', 'degraded', 'down']).toContain(health.status);
  describe('Metrics Recording', () => {
    it('should record success metrics', async () => {
        json: () => Promise.resolve({ success: true }),
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue('1');
        '/test',
      // Verify metrics were recorded
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        expect.stringContaining('metrics:email_service:'),
        'success_count',
        1
        'total_requests',
    it('should record error metrics on failure', async () => {
      (global.fetch as unknown).mockRejectedValue(new Error('Network error'));
      ).rejects.toThrow();
      // Verify error metrics were recorded
        'error_count',
  describe('Performance Requirements', () => {
    it('should handle requests within performance thresholds', async () => {
      const startTime = Date.now();
      const duration = Date.now() - startTime;
      // Should complete within reasonable time (less than 1 second for mock)
      expect(duration).toBeLessThan(1000);
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map((_, i) =>
          `/test/${i}`,
          { requestId: `test-${i}`, clientId: 'test-client' }
      const results = await Promise.all(concurrentRequests);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('provider', 'resend');
      // All requests should complete reasonably quickly
      expect(duration).toBeLessThan(2000);
  describe('Wedding-Specific Context', () => {
    it('should handle wedding-related metadata in requests', async () => {
      const weddingPaymentRequest = {
        method: 'POST',
        body: JSON.stringify({
          amount: 500000, // $5000 for wedding photography
          currency: 'usd',
          metadata: {
            wedding_id: 'wed_12345',
            supplier_id: 'sup_photo_789',
            service_type: 'photography',
            payment_type: 'deposit'
          }
        json: () => Promise.resolve({
          id: 'pi_wedding_payment',
          status: 'succeeded',
          amount: 500000,
        }),
        '/v1/payment_intents',
        weddingPaymentRequest,
        { 
          requestId: 'wedding-payment-req', 
          clientId: 'photographer-client' 
        }
      expect(response.metadata).toEqual({
        wedding_id: 'wed_12345',
        supplier_id: 'sup_photo_789',
        service_type: 'photography',
        payment_type: 'deposit'
});
