/**
 * WS-155: Alert System Components Unit Tests
 * Testing individual components and functions in isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { AutomatedHealthMonitor } from '@/lib/monitoring/ws-155-automated-health-monitor';
import { WeddingContextAlertManager } from '@/lib/monitoring/ws-155-wedding-context-alert-manager';
import { ServiceIntegrationHub } from '@/lib/monitoring/ws-155-service-integration-hub';
import { AdminSecurityController } from '@/lib/monitoring/ws-155-admin-security-controller';
// Mock external dependencies
vi.mock('@supabase/supabase-js');
vi.mock('@/lib/monitoring/healthChecks');
vi.mock('@/lib/monitoring/alerts');
vi.mock('@/lib/alerts/channels/MultiChannelOrchestrator');
describe('WS-155: Component Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('AutomatedHealthMonitor', () => {
    let monitor: AutomatedHealthMonitor;
    beforeEach(() => {
      monitor = new AutomatedHealthMonitor();
    });
    afterEach(async () => {
      if (monitor.isRunning()) {
        await monitor.stop();
      }
    it('should initialize with correct default configuration', () => {
      expect(monitor.isRunning()).toBe(false);
      expect(monitor.getConfiguration()).toEqual({
        intervalMinutes: 5,
        enabledChecks: ['database', 'api', 'storage', 'memory', 'cpu', 'rls'],
        alertThresholds: {
          responseTime: 1000,
          errorRate: 0.05,
          cpuUsage: 0.8,
          memoryUsage: 0.8,
          storageUsage: 0.9
        },
        retryAttempts: 3,
        retryDelayMs: 1000
      });
    it('should validate configuration on start', async () => {
      const invalidConfig = {
        intervalMinutes: 0, // Invalid: must be > 0
        enabledChecks: [], // Invalid: must have at least one check
          responseTime: -1 // Invalid: must be positive
        }
      };
      await expect(monitor.start(invalidConfig)).rejects.toThrow('Invalid configuration');
    it('should start monitoring with custom configuration', async () => {
      const customConfig = {
        intervalMinutes: 2,
        enabledChecks: ['database', 'api'],
          responseTime: 500,
          errorRate: 0.02
      await monitor.start(customConfig);
      expect(monitor.isRunning()).toBe(true);
      expect(monitor.getConfiguration()).toEqual(expect.objectContaining(customConfig));
    it('should run health checks according to interval', async () => {
      const healthCheckSpy = vi.spyOn(monitor as any, 'runHealthCheck');
      
      await monitor.start({
        intervalMinutes: 0.01, // 0.6 seconds for testing
        enabledChecks: ['database']
      // Wait for multiple intervals
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(healthCheckSpy).toHaveBeenCalledTimes(3);
    it('should handle health check failures gracefully', async () => {
      // Mock health check to throw error
      vi.spyOn(monitor as any, 'checkDatabaseHealth').mockRejectedValue(new Error('Database unreachable'));
      const result = await monitor.runHealthCheck();
      expect(result.overallHealth).toBe('critical');
      expect(result.checks.database.status).toBe('failed');
      expect(result.checks.database.error).toBe('Database unreachable');
    it('should calculate overall health correctly', () => {
      const testCases = [
        {
          checks: {
            database: { status: 'healthy', responseTime: 50 },
            api: { status: 'healthy', responseTime: 100 }
          },
          expected: 'healthy'
            api: { status: 'degraded', responseTime: 800 }
          expected: 'degraded'
            database: { status: 'failed', error: 'Connection failed' },
          expected: 'critical'
      ];
      for (const testCase of testCases) {
        const result = (monitor as unknown).calculateOverallHealth(testCase.checks);
        expect(result).toBe(testCase.expected);
    it('should trigger alerts when thresholds are exceeded', async () => {
      const alertSpy = vi.fn();
      monitor.on('healthAlert', alertSpy);
      // Mock health check with threshold breach
      vi.spyOn(monitor as any, 'runHealthCheck').mockResolvedValue({
        overallHealth: 'critical',
        timestamp: new Date(),
        checks: {
          database: { status: 'failed', responseTime: 5000, error: 'Timeout' }
      await monitor.processHealthCheck();
      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'critical',
        type: 'system_health',
        title: expect.stringContaining('Critical System Health')
      }));
    it('should implement circuit breaker for failed health checks', async () => {
      // Mock consecutive failures
      const mockHealthCheck = vi.spyOn(monitor as any, 'runHealthCheck')
        .mockRejectedValue(new Error('System failure'));
      await monitor.start({ intervalMinutes: 0.01, enabledChecks: ['database'] });
      // Wait for circuit breaker to trip
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect((monitor as unknown).circuitBreakerState).toBe('open');
      expect(mockHealthCheck).toHaveBeenCalledTimes(3); // Should stop after max retries
  describe('WeddingContextAlertManager', () => {
    let manager: WeddingContextAlertManager;
      manager = new WeddingContextAlertManager();
    it('should enhance alerts with wedding context', async () => {
      const baseAlert = {
        id: 'test_alert',
        severity: 'medium' as const,
        type: 'vendor_communication',
        title: 'Vendor Response Delay',
        description: 'Photographer has not responded in 24 hours'
      const weddingContext = {
        weddingId: 'wedding_123',
        eventDate: '2024-06-15',
        timeToWedding: 3, // 3 days
        criticalVendors: ['photographer', 'venue'],
        weddingPhase: 'final_week' as const
      const enhanced = await manager.enhanceWithWeddingContext(baseAlert, weddingContext);
      expect(enhanced.severity).toBe('high'); // Escalated due to final week + critical vendor
      expect(enhanced.weddingContext).toEqual(weddingContext);
      expect(enhanced.priority).toBe('high');
      expect(enhanced.escalationChannels).toContain('sms');
      expect(enhanced.title).toContain('URGENT');
    it('should calculate correct wedding phase', () => {
        { daysToWedding: 90, expected: 'planning' },
        { daysToWedding: 30, expected: 'preparation' },
        { daysToWedding: 7, expected: 'final_week' },
        { daysToWedding: 1, expected: 'final_day' },
        { daysToWedding: 0, expected: 'wedding_day' }
        const phase = manager.calculateWeddingPhase(testCase.daysToWedding);
        expect(phase).toBe(testCase.expected);
    it('should determine critical vendors correctly', () => {
      const testVendors = [
        { type: 'photographer', phase: 'wedding_day', expected: true },
        { type: 'venue', phase: 'wedding_day', expected: true },
        { type: 'catering', phase: 'wedding_day', expected: true },
        { type: 'flowers', phase: 'final_week', expected: true },
        { type: 'music', phase: 'planning', expected: false },
        { type: 'decorations', phase: 'preparation', expected: false }
      for (const vendor of testVendors) {
        const isCritical = manager.isVendorCriticalForPhase(vendor.type, vendor.phase as unknown);
        expect(isCritical).toBe(vendor.expected);
    it('should scale alert urgency based on wedding timeline', () => {
        id: 'test',
        type: 'vendor_issue',
        title: 'Vendor Issue'
      const urgencyTests = [
        { days: 30, expectedSeverity: 'medium', expectedChannels: ['email', 'slack'] },
        { days: 7, expectedSeverity: 'high', expectedChannels: ['email', 'slack', 'sms'] },
        { days: 1, expectedSeverity: 'critical', expectedChannels: ['sms', 'phone', 'slack'] },
        { days: 0, expectedSeverity: 'emergency', expectedChannels: ['phone', 'sms', 'slack', 'email'] }
      for (const test of urgencyTests) {
        const weddingContext = {
          weddingId: 'test',
          eventDate: new Date(Date.now() + test.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          timeToWedding: test.days
        };
        const scaled = manager.scaleAlertUrgency(baseAlert, weddingContext);
        expect(scaled.severity).toBe(test.expectedSeverity);
        expect(scaled.recommendedChannels).toEqual(test.expectedChannels);
    it('should handle multiple wedding contexts for same alert', async () => {
      const alert = {
        id: 'multi_wedding',
        type: 'payment_system',
        title: 'Payment Processing Delayed'
      const contexts = [
        { weddingId: 'wedding_1', timeToWedding: 30 },
        { weddingId: 'wedding_2', timeToWedding: 1 }, // Critical timing
        { weddingId: 'wedding_3', timeToWedding: 7 }
      const processedAlerts = await manager.processMultiWeddingAlert(alert, contexts);
      expect(processedAlerts).toHaveLength(3);
      // Wedding happening in 1 day should have highest priority
      const criticalAlert = processedAlerts.find(a => a.weddingContext?.weddingId === 'wedding_2');
      expect(criticalAlert?.severity).toBe('critical');
      expect(criticalAlert?.priority).toBe('immediate');
  describe('ServiceIntegrationHub', () => {
    let hub: ServiceIntegrationHub;
      hub = new ServiceIntegrationHub();
      await hub.shutdown();
    it('should initialize with all required systems', async () => {
      await hub.initialize();
      const systems = hub.getRegisteredSystems();
      const requiredSystems = [
        'healthChecks',
        'alertManager',
        'multiChannelOrchestrator',
        'notificationEngine',
        'webhookManager',
        'slackNotifications',
        'securityAlertingSystem'
      for (const system of requiredSystems) {
        expect(systems).toContain(system);
    it('should track system health status', async () => {
      // Update system status
      await hub.updateSystemStatus('slack', {
        status: 'failed',
        lastCheck: new Date(),
        error: 'API unreachable'
      const status = await hub.getSystemStatus('slack');
      expect(status.status).toBe('failed');
      expect(status.error).toBe('API unreachable');
    it('should route alerts based on system availability', async () => {
      // Mark Slack as down
      await hub.updateSystemStatus('slack', { status: 'failed', lastCheck: new Date() });
        id: 'routing_test',
        severity: 'high' as const,
        type: 'system_alert',
        title: 'Test Alert',
        preferredChannels: ['slack', 'email', 'sms']
      const routingResult = await hub.routeAlert(alert);
      expect(routingResult.actualChannels).not.toContain('slack');
      expect(routingResult.actualChannels).toContain('email');
      expect(routingResult.failedChannels).toContain('slack');
    it('should provide unified metrics across all systems', async () => {
      const metrics = await hub.getAggregatedMetrics({ timeRange: '1h' });
      expect(metrics).toHaveProperty('alertsSent');
      expect(metrics).toHaveProperty('healthCheckResults');
      expect(metrics).toHaveProperty('webhooksProcessed');
      expect(metrics).toHaveProperty('systemResponseTimes');
      expect(metrics.systemResponseTimes.average).toBeLessThan(100); // Performance requirement
    it('should handle system failures gracefully', async () => {
      // Simulate multiple system failures
      const failedSystems = ['slack', 'webhook', 'sms'];
      for (const system of failedSystems) {
        await hub.updateSystemStatus(system, { status: 'failed', lastCheck: new Date() });
        id: 'failure_test',
        severity: 'critical' as const,
        type: 'system_critical',
        title: 'Critical System Alert',
        preferredChannels: ['slack', 'webhook', 'sms', 'email']
      const result = await hub.sendAlert(alert);
      expect(result.success).toBe(true); // Should succeed with fallback
      expect(result.deliveredChannels).toContain('email'); // Email should work
      expect(result.failedChannels).toEqual(expect.arrayContaining(failedSystems));
    it('should implement circuit breaker pattern', async () => {
      // Simulate repeated failures for a system
      const systemName = 'slack';
      for (let i = 0; i < 5; i++) {
        await hub.recordSystemFailure(systemName, new Error(`Failure ${i + 1}`));
      const circuitState = hub.getCircuitBreakerState(systemName);
      expect(circuitState).toBe('open');
      // Should not attempt to use system when circuit is open
        id: 'circuit_test',
        type: 'test',
        title: 'Test',
        preferredChannels: ['slack']
      expect(result.failedChannels).toContain('slack');
  describe('AdminSecurityController', () => {
    let controller: AdminSecurityController;
      controller = new AdminSecurityController();
    it('should generate valid HMAC signatures', () => {
      const payload = 'test payload';
      const secret = 'test_secret';
      const signature = controller.generateHMAC(payload, secret);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    it('should verify HMAC signatures correctly', async () => {
      const payload = JSON.stringify({ action: 'test', timestamp: Date.now() });
      const secret = 'test_secret_key';
      const validSignature = controller.generateHMAC(payload, secret);
      const invalidSignature = 'invalid_signature';
      const validResult = await controller.verifyAdminRequest(payload, validSignature);
      const invalidResult = await controller.verifyAdminRequest(payload, invalidSignature);
      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('Invalid HMAC signature');
    it('should implement rate limiting', async () => {
      const clientIp = '192.168.1.100';
      const adminRequest = { action: 'get_metrics', timestamp: Date.now() };
      // First request should succeed
      const firstResult = await controller.handleAdminRequest(adminRequest, clientIp);
      expect(firstResult.success).toBe(true);
      // Rapid subsequent requests should be limited
      const rapidRequests = Array.from({ length: 15 }, () =>
        controller.handleAdminRequest(adminRequest, clientIp)
      );
      const results = await Promise.all(rapidRequests);
      const rateLimitedCount = results.filter(r => 
        !r.success && r.error?.includes('rate limit')
      ).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    it('should validate admin request timestamps', async () => {
      const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const futureTimestamp = Date.now() + (10 * 60 * 1000); // 10 minutes in future
      const validTimestamp = Date.now();
      const oldRequest = { action: 'test', timestamp: oldTimestamp };
      const futureRequest = { action: 'test', timestamp: futureTimestamp };
      const validRequest = { action: 'test', timestamp: validTimestamp };
      const oldResult = await controller.validateRequestTimestamp(oldRequest);
      const futureResult = await controller.validateRequestTimestamp(futureRequest);
      const validResult = await controller.validateRequestTimestamp(validRequest);
      expect(oldResult.valid).toBe(false);
      expect(futureResult.valid).toBe(false);
    it('should audit log all admin requests', async () => {
      const auditSpy = vi.spyOn(controller as any, 'logAdminRequest');
      const adminRequest = {
        action: 'force_health_check',
        timestamp: Date.now(),
        metadata: { source: 'admin_dashboard' }
      await controller.handleAdminRequest(adminRequest, '10.0.0.1');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'force_health_check',
          clientIp: '10.0.0.1',
          timestamp: expect.any(Date),
          success: expect.any(Boolean)
        })
    it('should implement admin privilege levels', async () => {
      const adminLevels = [
        { level: 'viewer', action: 'get_metrics', expected: true },
        { level: 'viewer', action: 'force_health_check', expected: false },
        { level: 'operator', action: 'force_health_check', expected: true },
        { level: 'operator', action: 'system_shutdown', expected: false },
        { level: 'admin', action: 'system_shutdown', expected: true }
      for (const test of adminLevels) {
        const hasPermission = controller.checkAdminPermission(test.level as any, test.action);
        expect(hasPermission).toBe(test.expected);
  describe('Performance Requirements', () => {
    it('should meet sub-100ms alert processing requirement', async () => {
      const hub = new ServiceIntegrationHub();
      const startTime = process.hrtime.bigint();
      await hub.sendUrgentAlert({
        id: 'perf_test',
        type: 'performance_test',
        title: 'Performance Test Alert'
      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1000000;
      expect(processingTimeMs).toBeLessThan(100);
    it('should handle high concurrency without performance degradation', async () => {
      const concurrentAlerts = 50;
      const alerts = Array.from({ length: concurrentAlerts }, (_, i) => ({
        id: `concurrent_test_${i}`,
        type: 'concurrent_test',
        title: `Concurrent Test Alert ${i}`
      const startTime = Date.now();
      const results = await Promise.all(
        alerts.map(alert => hub.sendAlert(alert))
      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const averageTimePerAlert = totalTime / concurrentAlerts;
      expect(successCount).toBe(concurrentAlerts);
      expect(averageTimePerAlert).toBeLessThan(50); // Should handle concurrent loads efficiently
});
