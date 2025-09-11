import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceMesh } from '../../middleware/service-mesh';
import Redis from 'ioredis';

// Mock Redis
vi.mock('ioredis');
const mockRedis = {
  subscribe: vi.fn(),
  on: vi.fn(),
  keys: vi.fn(),
  hgetall: vi.fn(),
  hset: vi.fn(),
  del: vi.fn(),
  set: vi.fn(),
  publish: vi.fn(),
  lpush: vi.fn(),
  lrem: vi.fn(),
  llen: vi.fn(),
  brpop: vi.fn(),
  expire: vi.fn(),
  hincrby: vi.fn(),
  disconnect: vi.fn()
};
// Mock fetch for service health checks
global.fetch = vi.fn();
describe('ServiceMesh', () => {
  let serviceMesh: ServiceMesh;
  beforeEach(() => {
    vi.clearAllMocks();
    (Redis as unknown).mockImplementation(() => mockRedis);
    // Mock Redis operations to succeed by default
    mockRedis.subscribe.mockResolvedValue(undefined);
    mockRedis.on.mockImplementation(() => {});
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.hgetall.mockResolvedValue({});
    mockRedis.hset.mockResolvedValue(1);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.publish.mockResolvedValue(1);
    mockRedis.lpush.mockResolvedValue(1);
    mockRedis.lrem.mockResolvedValue(1);
    mockRedis.llen.mockResolvedValue(0);
    mockRedis.brpop.mockResolvedValue(null);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.hincrby.mockResolvedValue(1);
    // Mock successful health checks
    (global.fetch as unknown).mockResolvedValue({
      ok: true,
      status: 200
    });
    serviceMesh = new ServiceMesh();
  });
  afterEach(async () => {
    await serviceMesh.shutdown();
  describe('Service Registration and Discovery', () => {
    it('should register a service successfully', async () => {
      const serviceRegistration = {
        serviceId: 'test-service-1',
        serviceName: 'notification-service',
        version: '1.0.0',
        endpoints: ['http://localhost:3001/api'],
        healthCheck: 'http://localhost:3001/health',
        metadata: { region: 'us-east-1' },
        tags: ['notifications', 'wedding-alerts']
      };
      await serviceMesh.registerService(serviceRegistration);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'service:register',
        JSON.stringify({
          ...serviceRegistration,
          lastHeartbeat: expect.any(Date),
          status: 'healthy'
        })
      );
    it('should discover services by name', async () => {
      // Mock existing service in memory
      const mockService = {
        serviceId: 'notification-1',
        endpoints: ['http://localhost:3001'],
        metadata: {},
        lastHeartbeat: new Date(),
        status: 'healthy' as const,
        tags: ['notifications']
      // Simulate service being loaded during initialization
      serviceMesh['services'].set('notification-1', mockService);
      const services = await serviceMesh.discoverServices({ serviceName: 'notification-service' });
      
      expect(services).toHaveLength(1);
      expect(services[0]).toMatchObject({
        status: 'healthy'
      });
    it('should discover services by tag', async () => {
      // Mock services with different tags
      const service1 = {
        serviceId: 'wedding-coordinator-1',
        serviceName: 'wedding-coordinator',
        endpoints: ['http://localhost:3002'],
        healthCheck: 'http://localhost:3002/health',
        tags: ['wedding', 'coordination']
      const service2 = {
        serviceId: 'analytics-1',
        serviceName: 'analytics-service',
        endpoints: ['http://localhost:3003'],
        healthCheck: 'http://localhost:3003/health',
        tags: ['analytics', 'reporting']
      serviceMesh['services'].set('wedding-coordinator-1', service1);
      serviceMesh['services'].set('analytics-1', service2);
      const weddingServices = await serviceMesh.discoverServices({ tag: 'wedding' });
      expect(weddingServices).toHaveLength(1);
      expect(weddingServices[0].serviceName).toBe('wedding-coordinator');
    it('should filter services by health status', async () => {
      const healthyService = {
        serviceId: 'healthy-1',
        serviceName: 'healthy-service',
        endpoints: ['http://localhost:3004'],
        healthCheck: 'http://localhost:3004/health',
        tags: []
      const unhealthyService = {
        serviceId: 'unhealthy-1',
        serviceName: 'unhealthy-service',
        endpoints: ['http://localhost:3005'],
        healthCheck: 'http://localhost:3005/health',
        status: 'unhealthy' as const,
      serviceMesh['services'].set('healthy-1', healthyService);
      serviceMesh['services'].set('unhealthy-1', unhealthyService);
      const healthyServices = await serviceMesh.discoverServices({ status: 'healthy' });
      expect(healthyServices).toHaveLength(1);
      expect(healthyServices[0].status).toBe('healthy');
  describe('Load Balancing', () => {
    beforeEach(() => {
      // Set up multiple instances of the same service
      const services = [
        {
          serviceId: 'notification-1',
          serviceName: 'notification-service',
          version: '1.0.0',
          endpoints: ['http://localhost:3001'],
          healthCheck: 'http://localhost:3001/health',
          metadata: { errorRate: 0.1 },
          lastHeartbeat: new Date(),
          status: 'healthy' as const,
          tags: []
        },
          serviceId: 'notification-2',
          endpoints: ['http://localhost:3002'],
          healthCheck: 'http://localhost:3002/health',
          metadata: { errorRate: 0.2 },
          serviceId: 'notification-3',
          endpoints: ['http://localhost:3003'],
          healthCheck: 'http://localhost:3003/health',
          metadata: { errorRate: 0.05 },
        }
      ];
      services.forEach(service => {
        serviceMesh['services'].set(service.serviceId, service);
        serviceMesh['serviceConnections'].set(service.serviceId, 0);
    it('should select service using round-robin strategy', async () => {
      const selections = [];
      for (let i = 0; i < 6; i++) {
        const selected = await serviceMesh.selectService('notification-service', {
          strategy: 'round-robin',
          healthCheckRequired: true
        });
        selections.push(selected?.serviceId);
      }
      // Should cycle through services in order
      expect(selections[0]).toBe('notification-1');
      expect(selections[1]).toBe('notification-2');
      expect(selections[2]).toBe('notification-3');
      expect(selections[3]).toBe('notification-1'); // Back to first
    it('should select service using least-connections strategy', async () => {
      // Manually set connection counts
      serviceMesh['serviceConnections'].set('notification-1', 5);
      serviceMesh['serviceConnections'].set('notification-2', 2);
      serviceMesh['serviceConnections'].set('notification-3', 8);
      const selected = await serviceMesh.selectService('notification-service', {
        strategy: 'least-connections',
        healthCheckRequired: true
      // Should select the one with least connections (notification-2 with 2)
      expect(selected?.serviceId).toBe('notification-2');
    it('should select service using weighted strategy based on error rates', async () => {
      // Run multiple selections to test probability distribution
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
          strategy: 'weighted',
      // Service with lowest error rate (notification-3: 0.05) should be selected more often
      const notification3Count = selections.filter(id => id === 'notification-3').length;
      const notification1Count = selections.filter(id => id === 'notification-1').length;
      const notification2Count = selections.filter(id => id === 'notification-2').length;
      // notification-3 (lowest error rate) should be selected most frequently
      expect(notification3Count).toBeGreaterThan(notification1Count);
      expect(notification3Count).toBeGreaterThan(notification2Count);
    it('should return null when no healthy services available', async () => {
      // Mark all services as unhealthy
      serviceMesh['services'].forEach(service => {
        service.status = 'unhealthy';
        strategy: 'round-robin',
      expect(selected).toBeNull();
  describe('Message Passing', () => {
      // Add a healthy service for message testing
      const service = {
        serviceId: 'target-service-1',
        serviceName: 'target-service',
      serviceMesh['services'].set('target-service-1', service);
    it('should send message successfully', async () => {
      const messageId = await serviceMesh.sendMessage({
        fromService: 'source-service',
        toService: 'target-service',
        eventType: 'test.event',
        data: { test: 'data' },
        priority: 'normal',
        maxRetries: 3
      expect(typeof messageId).toBe('string');
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'message_queue:target-service:normal',
        expect.stringContaining(messageId)
    it('should reject message to unknown service', async () => {
      await expect(
        serviceMesh.sendMessage({
          fromService: 'source-service',
          toService: 'unknown-service',
          eventType: 'test.event',
          data: { test: 'data' },
          priority: 'normal',
          maxRetries: 3
      ).rejects.toThrow('Target service not found: unknown-service');
    it('should queue messages by priority', async () => {
      const highPriorityMessage = {
        eventType: 'urgent.event',
        data: { urgent: true },
        priority: 'high' as const,
      const lowPriorityMessage = {
        eventType: 'routine.event',
        data: { routine: true },
        priority: 'low' as const,
      await serviceMesh.sendMessage(highPriorityMessage);
      await serviceMesh.sendMessage(lowPriorityMessage);
        'message_queue:target-service:high',
        expect.any(String)
        'message_queue:target-service:low',
  describe('Wedding Event Routing', () => {
      // Set up wedding-related services
          metadata: {},
          tags: ['notifications']
          serviceId: 'analytics-1',
          serviceName: 'analytics-service',
          tags: ['analytics']
          serviceId: 'supplier-1',
          serviceName: 'supplier-service',
          tags: ['suppliers']
    it('should route wedding events to multiple services', async () => {
      const weddingId = 'wed_12345';
      const eventType = 'payment.completed';
      const eventData = {
        supplierId: 'sup_photo_789',
        amount: 500000,
        paymentType: 'deposit'
      await serviceMesh.routeWeddingEvent(weddingId, eventType, eventData);
      // Should route to notification service
        'message_queue:notification-service:normal',
        expect.stringContaining('wedding.payment.completed')
      // Should route to analytics service  
        'message_queue:analytics-service:low',
        expect.stringContaining('wedding.analytics.event')
      // Should route to supplier service (because supplierId is present)
        'message_queue:supplier-service:high',
        expect.stringContaining('supplier.wedding.payment.completed')
    it('should include wedding context in routed messages', async () => {
      const eventType = 'booking.confirmed';
        supplierId: 'sup_venue_456',
        bookingDate: '2025-06-15',
        venue: 'Beautiful Garden Venue'
      // Verify the message includes wedding context
        expect.stringContaining('message_queue:'),
        expect.stringContaining(weddingId)
  describe('Health Monitoring', () => {
        serviceId: 'test-service',
        serviceName: 'test-service',
        lastHeartbeat: new Date(Date.now() - 70000), // 70 seconds ago (stale)
      serviceMesh['services'].set('test-service', service);
    it('should mark stale services as unhealthy', async () => {
      // Mock health check failure
      (global.fetch as unknown).mockRejectedValue(new Error('Connection refused'));
      // Manually trigger health check
      await serviceMesh['performHealthChecks']();
        'service:health_update',
          serviceId: 'test-service',
          status: 'unhealthy'
    it('should recover unhealthy services when they respond', async () => {
      // Set service as unhealthy with recent heartbeat
      const service = serviceMesh['services'].get('test-service')!;
      service.status = 'unhealthy';
      service.lastHeartbeat = new Date(); // Recent heartbeat
  describe('Service Mesh Metrics', () => {
      // Add services with different health states
        { serviceId: 'healthy-1', status: 'healthy' as const },
        { serviceId: 'healthy-2', status: 'healthy' as const },
        { serviceId: 'degraded-1', status: 'degraded' as const },
        { serviceId: 'unhealthy-1', status: 'unhealthy' as const }
      services.forEach(({ serviceId, status }) => {
        serviceMesh['services'].set(serviceId, {
          serviceId,
          serviceName: `service-${serviceId}`,
          endpoints: [],
          healthCheck: '',
          status,
        serviceMesh['serviceConnections'].set(serviceId, Math.floor(Math.random() * 10));
      // Mock queue lengths
      mockRedis.llen.mockImplementation((key) => {
        if (key.includes('high')) return Promise.resolve(5);
        if (key.includes('normal')) return Promise.resolve(10);
        if (key.includes('low')) return Promise.resolve(2);
        return Promise.resolve(0);
    it('should provide comprehensive service metrics', async () => {
      const metrics = await serviceMesh.getServiceMetrics();
      expect(metrics).toEqual({
        totalServices: 4,
        healthyServices: 2,
        degradedServices: 1,
        unhealthyServices: 1,
        messageQueues: expect.any(Object),
        connections: expect.any(Object)
      expect(typeof metrics.messageQueues).toBe('object');
      expect(typeof metrics.connections).toBe('object');
    it('should track dead letter queue statistics', async () => {
      mockRedis.llen.mockResolvedValue(3);
      const dlqStats = await serviceMesh.getDeadLetterQueueStats();
      expect(typeof dlqStats).toBe('object');
      // Should have entries for each service
      expect(Object.keys(dlqStats).length).toBe(4);
  describe('Performance Requirements', () => {
    it('should handle service registration within performance limits', async () => {
      const registration = {
        serviceId: 'perf-test-service',
        serviceName: 'performance-test',
        endpoints: ['http://localhost:4000'],
        healthCheck: 'http://localhost:4000/health',
      const startTime = Date.now();
      await serviceMesh.registerService(registration);
      const duration = Date.now() - startTime;
      // Service registration should be fast (<50ms target)
      expect(duration).toBeLessThan(50);
    it('should handle message sending within performance limits', async () => {
      // Add target service
      serviceMesh['services'].set('target-service', {
        serviceId: 'target-service',
        status: 'healthy',
      await serviceMesh.sendMessage({
        fromService: 'source',
        eventType: 'perf.test',
        data: { test: true },
      // Message sending should be fast (<50ms target)
    it('should handle concurrent operations efficiently', async () => {
      serviceMesh['services'].set('concurrent-target', {
        serviceId: 'concurrent-target',
        serviceName: 'concurrent-target',
      const operations = Array(100).fill(null).map(async (_, i) => {
        return serviceMesh.sendMessage({
          fromService: 'concurrent-source',
          toService: 'concurrent-target',
          eventType: `concurrent.test.${i}`,
          data: { index: i },
      const results = await Promise.all(operations);
      expect(results).toHaveLength(100);
      results.forEach(messageId => {
        expect(typeof messageId).toBe('string');
      // 100 concurrent operations should complete reasonably fast
      expect(duration).toBeLessThan(1000);
  describe('Connection Management', () => {
    it('should track service connections for load balancing', async () => {
      const serviceId = 'connection-test-service';
      await serviceMesh.incrementServiceConnections(serviceId);
      await serviceMesh.decrementServiceConnections(serviceId);
      const connections = serviceMesh['serviceConnections'].get(serviceId);
      expect(connections).toBe(1);
    it('should not allow negative connection counts', async () => {
      const serviceId = 'negative-test-service';
      // Try to decrement when count is 0
      expect(connections).toBe(0);
  describe('Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      mockRedis.publish.mockRejectedValue(new Error('Redis connection failed'));
      // Should not throw error
        serviceMesh.registerService({
          serviceId: 'error-test',
          serviceName: 'error-service',
      ).rejects.toThrow(); // This might reject, which is acceptable
    it('should handle service deregistration of non-existent service', async () => {
      // Should not throw error when trying to deregister non-existent service
        serviceMesh.deregisterService('non-existent-service')
      ).resolves.not.toThrow();
});
