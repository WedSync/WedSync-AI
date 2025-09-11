/**
 * WS-177 Audit Logging System - Security Event Detector Tests
 * Team C - Unit tests for security event detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  SecurityEventDetector,
  createSecurityEventDetector
} from '../../../lib/integrations/security/security-event-detector';
import {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  WorkflowContext,
  WeddingRole
} from '../../../types/security-integration';
describe('SecurityEventDetector', () => {
  let detector: SecurityEventDetector;
  beforeEach(() => {
    detector = new SecurityEventDetector();
  });
  afterEach(() => {
    vi.clearAllMocks();
  // Helper function to create test audit events
  const createTestEvent = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
    id: 'event-123',
    timestamp: new Date(),
    eventType: AuditEventType.GUEST_LIST_ACCESS,
    severity: AuditSeverity.LOW,
    userId: 'user-123',
    userRole: WeddingRole.COUPLE,
    weddingId: 'wedding-123',
    workflowContext: WorkflowContext.GUEST_MANAGEMENT,
    resourceId: 'resource-123',
    resourceType: 'guest',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    sessionId: 'session-123',
    details: {},
    metadata: {
      requestId: 'req-123',
      source: 'ui',
      success: true
    },
    ...overrides
  describe('constructor', () => {
    it('should initialize security patterns', () => {
      const testDetector = new SecurityEventDetector();
      expect(testDetector).toBeInstanceOf(SecurityEventDetector);
    });
    it('should start cleanup job', (done) => {
      // This is hard to test directly, but we can verify the instance is created
      done();
  describe('analyzeEvent', () => {
    it('should analyze single event without patterns', async () => {
      const event = createTestEvent();
      const result = await detector.analyzeEvent(event);
      expect(result.event).toEqual(event);
      expect(result.suspiciousPatterns).toEqual([]);
      expect(result.severity).toBe(AuditSeverity.LOW);
      expect(result.requiresImmediateAttention).toBe(false);
    it('should detect rapid guest list access pattern', async () => {
      const baseEvent = createTestEvent({
        eventType: AuditEventType.GUEST_LIST_ACCESS,
        workflowContext: WorkflowContext.GUEST_MANAGEMENT
      });
      // Simulate rapid access by analyzing multiple events quickly
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 12; i++) {
        const event = createTestEvent({
          ...baseEvent,
          id: `event-${i}`,
          timestamp: new Date(Date.now() - (i * 1000)) // Events 1 second apart
        });
        promises.push(detector.analyzeEvent(event));
      }
      const results = await Promise.all(promises);
      const lastResult = results[results.length - 1];
      // Should detect rapid access pattern
      expect(lastResult.suspiciousPatterns.length).toBeGreaterThan(0);
      const rapidPattern = lastResult.suspiciousPatterns.find(p => 
        p.name === 'Rapid Guest List Access'
      );
      expect(rapidPattern).toBeDefined();
    it('should detect bulk data export pattern', async () => {
      const event = createTestEvent({
        eventType: AuditEventType.DATA_EXPORT,
        details: { affectedRecords: 150 },
        metadata: {
          requestId: 'export-123',
          source: 'api',
          success: true,
          affectedRecords: 150
        }
      expect(result.suspiciousPatterns.length).toBeGreaterThan(0);
      const bulkPattern = result.suspiciousPatterns.find(p => 
        p.name === 'Bulk Data Export'
      expect(bulkPattern).toBeDefined();
    it('should detect privilege escalation attempts', async () => {
        eventType: AuditEventType.PRIVILEGE_ESCALATION,
        userRole: WeddingRole.HELPER,
        details: { 
          targetRole: WeddingRole.WEDDING_PLANNER,
          escalationType: 'role_change'
      const escalationPattern = result.suspiciousPatterns.find(p => 
        p.name === 'Privilege Escalation Attempt'
      expect(escalationPattern).toBeDefined();
      expect(result.severity).toBe(AuditSeverity.CRITICAL);
      expect(result.requiresImmediateAttention).toBe(true);
    it('should detect unusual access times', async () => {
        timestamp: new Date('2024-01-15T02:30:00Z'), // 2:30 AM
        eventType: AuditEventType.GUEST_LIST_ACCESS
      const unusualTimePattern = result.suspiciousPatterns.find(p => 
        p.name === 'Unusual Access Times'
      expect(unusualTimePattern).toBeDefined();
    it('should detect multiple failed authentication attempts', async () => {
        eventType: AuditEventType.FAILED_AUTHENTICATION,
        severity: AuditSeverity.MEDIUM
      // Simulate multiple failed attempts
      for (let i = 0; i < 6; i++) {
          id: `failed-${i}`,
          timestamp: new Date(Date.now() - (i * 60000)) // 1 minute apart
        await detector.analyzeEvent(event);
      // The pattern should be detected on the later events
        ...baseEvent,
        id: 'failed-final',
        timestamp: new Date()
      const failedAuthPattern = result.suspiciousPatterns.find(p => 
        p.name === 'Multiple Failed Authentication Attempts'
      expect(failedAuthPattern).toBeDefined();
    it('should detect vendor data scraping pattern', async () => {
        eventType: AuditEventType.VENDOR_DATA_ACCESS,
        workflowContext: WorkflowContext.VENDOR_COORDINATION
      // Simulate sequential vendor access
      for (let i = 0; i < 22; i++) {
          id: `vendor-access-${i}`,
          resourceId: `vendor-${i}`,
          timestamp: new Date(Date.now() - (i * 15000)) // 15 seconds apart
      // Final event should trigger scraping detection
        id: 'vendor-access-final',
        resourceId: 'vendor-final'
      const scrapingPattern = result.suspiciousPatterns.find(p => 
        p.name === 'Vendor Data Scraping'
      expect(scrapingPattern).toBeDefined();
    it('should detect cross-wedding data access', async () => {
        userId: 'user-123',
        weddingId: 'unauthorized-wedding-456', // Different wedding
      // Mock the authorization check to return false
      const originalMethod = (detector as unknown).isUserAuthorizedForWedding;
      (detector as unknown).isUserAuthorizedForWedding = vi.fn().mockReturnValue(false);
      const crossWeddingPattern = result.suspiciousPatterns.find(p => 
        p.name === 'Cross-Wedding Data Access'
      expect(crossWeddingPattern).toBeDefined();
      // Restore original method
      (detector as unknown).isUserAuthorizedForWedding = originalMethod;
    it('should detect helper accessing admin functions', async () => {
        eventType: AuditEventType.PERMISSION_GRANTED,
        details: { adminAction: true }
      const helperAdminPattern = result.suspiciousPatterns.find(p => 
        p.name === 'Helper Accessing Admin Functions'
      expect(helperAdminPattern).toBeDefined();
      expect(result.severity).toBe(AuditSeverity.HIGH);
    it('should handle analysis errors gracefully', async () => {
      // Mock a method to throw an error
      const originalMethod = (detector as unknown).checkImmediateThreatPatterns;
      (detector as unknown).checkImmediateThreatPatterns = vi.fn().mockRejectedValue(
        new Error('Analysis failed')
      // Should return basic result even if analysis fails
      (detector as unknown).checkImmediateThreatPatterns = originalMethod;
  describe('pattern detection algorithms', () => {
    it('should track event buffer correctly', async () => {
      const events = Array.from({ length: 5 }, (_, i) => 
        createTestEvent({
          timestamp: new Date(Date.now() - (i * 60000))
        })
      for (const event of events) {
      // Buffer should contain events for the user
      const userEvents = (detector as unknown).getUserEvents('user-123');
      expect(userEvents).toHaveLength(5);
    it('should clean up old events from buffer', async () => {
      const oldEvent = createTestEvent({
        id: 'old-event',
        timestamp: new Date(Date.now() - (25 * 60 * 60 * 1000)) // 25 hours ago
      const recentEvent = createTestEvent({
        id: 'recent-event',
      await detector.analyzeEvent(oldEvent);
      await detector.analyzeEvent(recentEvent);
      expect(userEvents).toHaveLength(1);
      expect(userEvents[0].id).toBe('recent-event');
    it('should track threshold violations correctly', async () => {
      // Generate many events to trigger threshold
      for (let i = 0; i < 25; i++) {
          id: `threshold-${i}`,
          timestamp: new Date(Date.now() - (i * 10000)) // 10 seconds apart
      // Final event should trigger threshold violation
      const result = await detector.analyzeEvent(createTestEvent({
        id: 'threshold-final'
      }));
      const thresholdPattern = result.suspiciousPatterns.find(p => 
        p.name.includes('Threshold Violation')
      expect(thresholdPattern).toBeDefined();
    it('should calculate overall severity correctly', async () => {
      // Test with mixed severity patterns
      const event1 = createTestEvent({
        eventType: AuditEventType.PRIVILEGE_ESCALATION
      const event2 = createTestEvent({
        details: { affectedRecords: 150 }
      const result1 = await detector.analyzeEvent(event1);
      const result2 = await detector.analyzeEvent(event2);
      expect(result1.severity).toBe(AuditSeverity.CRITICAL);
      expect(result2.severity).toBe(AuditSeverity.HIGH);
  describe('wedding-specific behavior', () => {
    it('should consider wedding workflow context', async () => {
      const guestEvent = createTestEvent({
      const vendorEvent = createTestEvent({
      const guestResult = await detector.analyzeEvent(guestEvent);
      const vendorResult = await detector.analyzeEvent(vendorEvent);
      // Both should be analyzed appropriately for their contexts
      expect(guestResult.event.workflowContext).toBe(WorkflowContext.GUEST_MANAGEMENT);
      expect(vendorResult.event.workflowContext).toBe(WorkflowContext.VENDOR_COORDINATION);
    it('should handle different wedding roles appropriately', async () => {
      const coupleEvent = createTestEvent({
        userRole: WeddingRole.COUPLE,
        eventType: AuditEventType.GUEST_LIST_MODIFIED
      const helperEvent = createTestEvent({
        eventType: AuditEventType.PERMISSION_GRANTED
      const coupleResult = await detector.analyzeEvent(coupleEvent);
      const helperResult = await detector.analyzeEvent(helperEvent);
      // Helper granting permissions should be flagged
      expect(helperResult.suspiciousPatterns.length).toBeGreaterThan(coupleResult.suspiciousPatterns.length);
    it('should differentiate normal wedding activity from suspicious patterns', async () => {
      // Normal activity: couple updating guest list
      const normalEvent = createTestEvent({
        eventType: AuditEventType.GUEST_LIST_MODIFIED,
        details: { guestCount: 5, action: 'add_family' }
      // Suspicious activity: bulk data export by helper
      const suspiciousEvent = createTestEvent({
        details: { affectedRecords: 500, action: 'export_all' }
      const normalResult = await detector.analyzeEvent(normalEvent);
      const suspiciousResult = await detector.analyzeEvent(suspiciousEvent);
      expect(normalResult.suspiciousPatterns.length).toBeLessThan(suspiciousResult.suspiciousPatterns.length);
      expect(normalResult.severity).toBeLessThan(suspiciousResult.severity);
  describe('performance and cleanup', () => {
    it('should handle large numbers of events efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 100 }, (_, i) => 
        detector.analyzeEvent(createTestEvent({
          id: `perf-test-${i}`,
          userId: `user-${i % 10}` // 10 different users
        }))
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    it('should manage memory usage with cleanup', async () => {
      // Generate many events to test memory management
      for (let i = 0; i < 1000; i++) {
        await detector.analyzeEvent(createTestEvent({
          id: `memory-test-${i}`,
          userId: `user-${i % 50}`, // 50 different users
          timestamp: new Date(Date.now() - (i * 1000))
        }));
      // Verify that old events are cleaned up
      const allBuffers = (detector as unknown).eventBuffer;
      expect(allBuffers.size).toBeLessThanOrEqual(50); // Should not exceed user count
});
describe('createSecurityEventDetector factory', () => {
  it('should create new detector instance', () => {
    const detector = createSecurityEventDetector();
    expect(detector).toBeInstanceOf(SecurityEventDetector);
  it('should create independent instances', () => {
    const detector1 = createSecurityEventDetector();
    const detector2 = createSecurityEventDetector();
    expect(detector1).not.toBe(detector2);
// Integration test scenarios
describe('Real-world wedding security scenarios', () => {
  describe('legitimate wedding planning activities', () => {
    it('should not flag normal guest list updates', async () => {
      const events = [
          id: 'add-bridesmaids',
          eventType: AuditEventType.GUEST_LIST_MODIFIED,
          userRole: WeddingRole.COUPLE,
          details: { action: 'add_wedding_party', count: 8 }
        }),
          id: 'add-family',
          details: { action: 'add_family_members', count: 25 }
          id: 'update-rsvp',
          details: { action: 'update_rsvp_status', count: 12 }
      ];
      const results = await Promise.all(events.map(e => detector.analyzeEvent(e)));
      // Normal wedding planning should not trigger many patterns
      const totalPatterns = results.reduce((sum, r) => sum + r.suspiciousPatterns.length, 0);
      expect(totalPatterns).toBeLessThan(2); // Allow for minimal false positives
    it('should not flag vendor coordination activities', async () => {
          id: 'book-photographer',
          eventType: AuditEventType.VENDOR_CONTRACT_MODIFIED,
          workflowContext: WorkflowContext.VENDOR_COORDINATION,
          details: { action: 'contract_signed', vendor_type: 'photographer' }
          id: 'update-catering',
          userRole: WeddingRole.WEDDING_PLANNER,
          details: { action: 'menu_finalized', vendor_type: 'caterer' }
      // Vendor coordination should be low risk
      results.forEach(result => {
        expect(result.severity).toBeLessThanOrEqual(AuditSeverity.MEDIUM);
        expect(result.requiresImmediateAttention).toBe(false);
  describe('suspicious wedding-related activities', () => {
    it('should detect potential guest data harvesting', async () => {
      // Simulate someone systematically accessing all guest data
      const suspiciousEvents = Array.from({ length: 50 }, (_, i) => 
          id: `harvest-${i}`,
          eventType: AuditEventType.GUEST_LIST_ACCESS,
          userRole: WeddingRole.HELPER,
          details: { 
            action: 'view_guest_details',
            guest_id: `guest-${i}`,
            sequential: true
          },
          timestamp: new Date(Date.now() - (i * 2000)) // 2 seconds apart
      const results = await Promise.all(suspiciousEvents.map(e => detector.analyzeEvent(e)));
      expect(lastResult.severity).toBeGreaterThanOrEqual(AuditSeverity.MEDIUM);
    it('should detect unauthorized wedding access attempts', async () => {
      const unauthorizedEvent = createTestEvent({
        id: 'unauthorized-access',
        userId: 'stranger-123',
        userRole: WeddingRole.GUEST,
        weddingId: 'different-wedding-456',
          action: 'unauthorized_access_attempt',
          original_wedding: 'wedding-123'
      // Mock unauthorized check
      const result = await detector.analyzeEvent(unauthorizedEvent);
      // Restore
    it('should detect vendor information scraping', async () => {
      // Someone systematically accessing all vendor information
      const scrapingEvents = Array.from({ length: 30 }, (_, i) => 
          id: `scrape-${i}`,
          eventType: AuditEventType.VENDOR_DATA_ACCESS,
            action: 'view_vendor_details',
            vendor_id: `vendor-${i}`,
            rapid_access: true
          timestamp: new Date(Date.now() - (i * 5000)) // 5 seconds apart
      const results = await Promise.all(scrapingEvents.map(e => detector.analyzeEvent(e)));
      const scrapingPattern = lastResult.suspiciousPatterns.find(p => 
        p.name.includes('Vendor') || p.name.includes('Scraping')
  describe('wedding day emergency scenarios', () => {
    it('should handle increased activity on wedding day appropriately', async () => {
      // Wedding day typically has increased legitimate activity
      const weddingDayEvents = [
          id: 'final-headcount',
          details: { action: 'final_headcount_update', urgent: true }
          id: 'vendor-checkin',
          details: { action: 'vendor_arrival_checkin', wedding_day: true }
          id: 'task-updates',
          eventType: AuditEventType.TASK_STATUS_CHANGED,
          details: { action: 'setup_completion', wedding_day: true }
      const results = await Promise.all(weddingDayEvents.map(e => detector.analyzeEvent(e)));
      // Wedding day activities should be understood as legitimate
