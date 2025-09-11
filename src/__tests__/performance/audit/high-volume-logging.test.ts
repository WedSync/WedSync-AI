import { performance } from 'perf_hooks';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { SecurityAuditLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security/audit-logger';
import { adminAuditLogger } from '@/lib/admin/auditLogger';
import { TamperProofAuditLogger } from '@/lib/compliance/audit/tamper-proof-logging';

// Mock Supabase for performance testing
vi.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));
vi.mock('@/lib/supabase/server', () => ({
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis()
};
describe('High-Volume Audit Logging Performance Tests', () => {
  let securityLogger: SecurityAuditLogger;
  let tamperProofLogger: TamperProofAuditLogger;
  beforeEach(() => {
    securityLogger = SecurityAuditLogger.getInstance();
    tamperProofLogger = new TamperProofAuditLogger();
    
    // Reset mocks and optimize for performance
    vi.clearAllMocks();
    // Mock successful database operations with minimal delay
    mockSupabaseClient.from.mockImplementation(() => ({
      insert: vi.fn().mockImplementation(() => {
        // Simulate minimal database latency
        return new Promise(resolve => 
          setImmediate(() => resolve({ error: null }))
        );
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    }));
  });
  afterEach(() => {
    // Clean up any pending operations
    vi.runOnlyPendingTimers();
  describe('SecurityAuditLogger Performance', () => {
    test('should handle 1000+ events per second', async () => {
      const eventCount = 1000;
      const maxDurationMs = 1000; // 1 second max for 1000 events
      const events: Promise<void>[] = [];
      console.log(`Starting performance test: ${eventCount} events...`);
      const startTime = performance.now();
      // Generate concurrent audit events
      for (let i = 0; i < eventCount; i++) {
        const eventPromise = securityLogger.logEvent({
          event_type: SecurityEventType.LOGIN_SUCCESS,
          severity: SecurityEventSeverity.LOW,
          user_id: `user${i}`,
          ip_address: `192.168.1.${i % 255}`,
          description: `Performance test event ${i}`
        });
        events.push(eventPromise);
      }
      // Wait for all events to complete
      await Promise.all(events);
      const endTime = performance.now();
      const duration = endTime - startTime;
      const eventsPerSecond = (eventCount / duration) * 1000;
      
      console.log(`Performance Results:`);
      console.log(`- Total events: ${eventCount}`);
      console.log(`- Duration: ${duration.toFixed(2)}ms`);
      console.log(`- Events per second: ${eventsPerSecond.toFixed(2)}`);
      console.log(`- Average event time: ${(duration / eventCount).toFixed(4)}ms`);
      // Performance assertions
      expect(duration).toBeLessThan(maxDurationMs);
      expect(eventsPerSecond).toBeGreaterThan(1000);
      // Verify all database calls were made
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(eventCount);
    });
    test('should maintain performance with mixed event types', async () => {
      const eventCount = 2000;
      const eventTypes = [
        SecurityEventType.LOGIN_SUCCESS,
        SecurityEventType.LOGIN_FAILED,
        SecurityEventType.MFA_VERIFIED,
        SecurityEventType.DATA_ACCESS,
        SecurityEventType.PERMISSION_DENIED
      ];
        const eventType = eventTypes[i % eventTypes.length];
        const severity = i % 3 === 0 ? SecurityEventSeverity.HIGH : SecurityEventSeverity.LOW;
        
          event_type: eventType,
          severity: severity,
          description: `Mixed event test ${i}`,
          metadata: {
            test_id: i,
            batch: Math.floor(i / 100),
            timestamp: Date.now()
          }
      console.log(`Mixed Events Performance:`);
    test('should handle burst traffic patterns', async () => {
      const burstSize = 500;
      const burstCount = 5;
      const burstIntervalMs = 100;
      const allBurstTimes: number[] = [];
      for (let burst = 0; burst < burstCount; burst++) {
        const events: Promise<void>[] = [];
        const burstStartTime = performance.now();
        // Generate burst of events
        for (let i = 0; i < burstSize; i++) {
          const eventPromise = securityLogger.logEvent({
            event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: SecurityEventSeverity.CRITICAL,
            user_id: `burst_user${burst}_${i}`,
            description: `Burst ${burst} event ${i}`
          });
          events.push(eventPromise);
        }
        await Promise.all(events);
        const burstEndTime = performance.now();
        const burstDuration = burstEndTime - burstStartTime;
        allBurstTimes.push(burstDuration);
        console.log(`Burst ${burst}: ${burstSize} events in ${burstDuration.toFixed(2)}ms (${((burstSize / burstDuration) * 1000).toFixed(2)} events/sec)`);
        // Short pause between bursts
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, burstIntervalMs));
      const avgBurstTime = allBurstTimes.reduce((sum, time) => sum + time, 0) / allBurstTimes.length;
      const avgEventsPerSecond = (burstSize / avgBurstTime) * 1000;
      console.log(`Average burst performance: ${avgEventsPerSecond.toFixed(2)} events/sec`);
      expect(avgEventsPerSecond).toBeGreaterThan(1000);
      expect(allBurstTimes.every(time => time < 500)).toBe(true); // Each burst under 500ms
  describe('AdminAuditLogger Performance', () => {
    test('should handle concurrent admin actions', async () => {
      const actionCount = 1500;
      const actions: Promise<void>[] = [];
      for (let i = 0; i < actionCount; i++) {
        const actionPromise = adminAuditLogger.logAction({
          adminId: `admin${i % 10}`,
          adminEmail: `admin${i % 10}@example.com`,
          action: `performance_action_${i}`,
          status: i % 10 === 0 ? 'failed' : 'success',
          details: { test_id: i, batch_size: actionCount },
          timestamp: new Date().toISOString(),
          clientIP: `10.0.${Math.floor(i / 255)}.${i % 255}`,
          requiresMFA: i % 5 === 0,
          userAgent: 'Performance Test Agent'
        actions.push(actionPromise);
      await Promise.all(actions);
      const actionsPerSecond = (actionCount / duration) * 1000;
      console.log(`Admin Logger Performance:`);
      console.log(`- Actions per second: ${actionsPerSecond.toFixed(2)}`);
      expect(actionsPerSecond).toBeGreaterThan(1000);
    test('should handle security violation logging under load', async () => {
      const violationCount = 800;
      const violations: Promise<void>[] = [];
      for (let i = 0; i < violationCount; i++) {
        const violationPromise = adminAuditLogger.logSecurityViolation(
          `admin${i % 5}`,
          `admin${i % 5}@example.com`,
          'unauthorized_access',
          { 
            resource: `/admin/endpoint/${i}`,
            attempt_count: i % 10 + 1,
            severity: 'high'
          },
          `203.0.113.${i % 255}`
        violations.push(violationPromise);
      await Promise.all(violations);
      const violationsPerSecond = (violationCount / duration) * 1000;
      console.log(`Security Violations Performance:`);
      console.log(`- Violations per second: ${violationsPerSecond.toFixed(2)}`);
      expect(violationsPerSecond).toBeGreaterThan(500); // Lower threshold for complex operations
  describe('TamperProofAuditLogger Performance', () => {
    test('should handle high-volume tamper-proof logging', async () => {
      const eventCount = 750; // Slightly lower due to cryptographic overhead
      const events: Promise<any>[] = [];
        const eventPromise = tamperProofLogger.logPrivacyEvent({
          action: `privacy_action_${i}`,
          userId: `user${i}`,
          requestType: 'GDPR_ACCESS',
          requestId: `req${i}`,
            performance_test: true,
            data_types: ['personal_data', 'contact_info']
      console.log(`Tamper-Proof Logger Performance:`);
      // Lower threshold due to cryptographic operations
      expect(eventsPerSecond).toBeGreaterThan(500);
    test('should handle data breach logging performance', async () => {
      const breachCount = 100; // Data breaches are less frequent but more complex
      const breaches: Promise<void>[] = [];
      for (let i = 0; i < breachCount; i++) {
        const breachPromise = tamperProofLogger.logDataBreach({
          severity: i % 3 === 0 ? 'critical' : 'high',
          affectedUsers: Math.floor(Math.random() * 1000) + 100,
          dataTypes: ['personal_data', 'financial_data', 'contact_info'],
          discoveryMethod: 'automated_scan',
          containmentMeasures: ['access_revoked', 'systems_isolated', 'patches_applied'],
          notificationRequired: i % 2 === 0,
            incident_severity: 'performance_test'
        breaches.push(breachPromise);
      await Promise.all(breaches);
      const breachesPerSecond = (breachCount / duration) * 1000;
      console.log(`Data Breach Logging Performance:`);
      console.log(`- Breaches per second: ${breachesPerSecond.toFixed(2)}`);
      // Much lower threshold due to complex processing
      expect(breachesPerSecond).toBeGreaterThan(50);
  describe('Memory and Resource Management', () => {
    test('should not cause memory leaks during sustained load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const cycleCount = 10;
      const eventsPerCycle = 200;
      console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        for (let i = 0; i < eventsPerCycle; i++) {
            event_type: SecurityEventType.DATA_ACCESS,
            severity: SecurityEventSeverity.LOW,
            user_id: `cycle${cycle}_user${i}`,
            description: `Memory test cycle ${cycle} event ${i}`
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        const currentMemory = process.memoryUsage().heapUsed;
        console.log(`Cycle ${cycle} memory: ${(currentMemory / 1024 / 1024).toFixed(2)} MB`);
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      console.log(`Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)} MB`);
      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryGrowthMB).toBeLessThan(50);
    test('should handle concurrent database connections efficiently', async () => {
      const connectionCount = 50;
      const eventsPerConnection = 20;
      const allConnections: Promise<void>[] = [];
      // Simulate multiple concurrent connections
      for (let conn = 0; conn < connectionCount; conn++) {
        const connectionPromise = (async () => {
          const events: Promise<void>[] = [];
          
          for (let i = 0; i < eventsPerConnection; i++) {
            const eventPromise = securityLogger.logEvent({
              event_type: SecurityEventType.SESSION_CREATED,
              severity: SecurityEventSeverity.LOW,
              user_id: `conn${conn}_user${i}`,
              description: `Connection ${conn} event ${i}`,
              metadata: { connection_id: conn }
            });
            events.push(eventPromise);
          await Promise.all(events);
        })();
        allConnections.push(connectionPromise);
      await Promise.all(allConnections);
      const totalEvents = connectionCount * eventsPerConnection;
      const eventsPerSecond = (totalEvents / duration) * 1000;
      console.log(`Concurrent Connections Performance:`);
      console.log(`- Total events: ${totalEvents}`);
      console.log(`- Concurrent connections: ${connectionCount}`);
      expect(eventsPerSecond).toBeGreaterThan(800);
  describe('Stress Testing', () => {
    test('should survive extreme load conditions', async () => {
      const extremeEventCount = 5000;
      const batchSize = 100;
      const batches = Math.ceil(extremeEventCount / batchSize);
      console.log(`Starting extreme load test: ${extremeEventCount} events in ${batches} batches...`);
      let completedEvents = 0;
      // Process in batches to avoid overwhelming the system
      for (let batch = 0; batch < batches; batch++) {
        const batchEvents: Promise<void>[] = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, extremeEventCount);
        for (let i = batchStart; i < batchEnd; i++) {
            event_type: SecurityEventType.LOGIN_SUCCESS,
            user_id: `extreme_user${i}`,
            description: `Extreme load test event ${i}`,
            metadata: {
              batch_number: batch,
              event_in_batch: i - batchStart,
              total_events: extremeEventCount
            }
          batchEvents.push(eventPromise);
        await Promise.all(batchEvents);
        completedEvents += batchEvents.length;
        if (batch % 10 === 0) {
          console.log(`Completed ${completedEvents}/${extremeEventCount} events (${((completedEvents / extremeEventCount) * 100).toFixed(1)}%)`);
      const eventsPerSecond = (extremeEventCount / duration) * 1000;
      console.log(`Extreme Load Test Results:`);
      console.log(`- Total events: ${extremeEventCount}`);
      console.log(`- Duration: ${(duration / 1000).toFixed(2)} seconds`);
      expect(completedEvents).toBe(extremeEventCount);
      expect(eventsPerSecond).toBeGreaterThan(500); // Lower threshold for extreme conditions
});
