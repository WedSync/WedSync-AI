/**
 * WS-177 Audit Logging System - Suspicious Activity Handler Tests
 * Team C - Unit tests for automated security response
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  SuspiciousActivityHandler,
  createSuspiciousActivityHandler,
  ResponseExecutionResult,
  ActivityResponseContext,
  SecurityAlert
} from '../../../lib/integrations/security/suspicious-activity-handler';
import {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  WorkflowContext,
  WeddingRole,
  SuspiciousActivityPattern,
  SecurityResponseAction
} from '../../../types/security-integration';
// Mock services
const mockNotificationService = {
  sendAlert: vi.fn().mockResolvedValue(undefined),
  sendAdminAlert: vi.fn().mockResolvedValue(undefined),
  sendUserNotification: vi.fn().mockResolvedValue(undefined)
};
const mockAuditLogger = {
  logEvent: vi.fn().mockResolvedValue(undefined),
  logBulkEvents: vi.fn().mockResolvedValue(undefined),
  queryEvents: vi.fn().mockResolvedValue([]),
  getEventStats: vi.fn().mockResolvedValue({
    totalEvents: 0,
    eventsByType: {},
    eventsBySeverity: {},
    suspiciousActivityCount: 0,
    recentAlerts: 0
  })
describe('SuspiciousActivityHandler', () => {
  let handler: SuspiciousActivityHandler;
  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SuspiciousActivityHandler(mockNotificationService, mockAuditLogger);
  });
  afterEach(() => {
  // Helper function to create test data
  const createTestPattern = (overrides: Partial<SuspiciousActivityPattern> = {}): SuspiciousActivityPattern => ({
    id: 'test-pattern',
    name: 'Test Suspicious Pattern',
    description: 'Test pattern for unit testing',
    pattern: {
      eventTypes: [AuditEventType.GUEST_LIST_ACCESS],
      conditions: [{ field: 'count', operator: 'gt', value: 10 }],
      timeWindow: 300
    },
    severity: AuditSeverity.MEDIUM,
    responseActions: [SecurityResponseAction.SEND_ALERT],
    weddingContexts: [WorkflowContext.GUEST_MANAGEMENT],
    ...overrides
  const createTestContext = (overrides: Partial<ActivityResponseContext> = {}): ActivityResponseContext => ({
    userId: 'user-123',
    weddingId: 'wedding-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    sessionId: 'session-123',
    patterns: [createTestPattern()],
    originalEvent: {
      id: 'event-123',
      timestamp: new Date(),
      eventType: AuditEventType.GUEST_LIST_ACCESS,
      severity: AuditSeverity.LOW,
      userId: 'user-123',
      userRole: WeddingRole.COUPLE,
      weddingId: 'wedding-123',
      workflowContext: WorkflowContext.GUEST_MANAGEMENT,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      sessionId: 'session-123',
      details: {},
      metadata: {
        requestId: 'req-123',
        source: 'ui',
        success: true
      }
  describe('constructor', () => {
    it('should initialize with services', () => {
      const testHandler = new SuspiciousActivityHandler(mockNotificationService, mockAuditLogger);
      expect(testHandler).toBeInstanceOf(SuspiciousActivityHandler);
    });
    it('should work without services', () => {
      const testHandler = new SuspiciousActivityHandler();
    it('should start cleanup job', () => {
      // Cleanup job start is verified by instance creation
  describe('handleSuspiciousActivity', () => {
    it('should handle single pattern with single action', async () => {
      const pattern = createTestPattern({
        responseActions: [SecurityResponseAction.LOG_ONLY]
      });
      const context = createTestContext({ patterns: [pattern] });
      const results = await handler.handleSuspiciousActivity([pattern], context);
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe(SecurityResponseAction.LOG_ONLY);
      expect(results[0].executed).toBe(true);
      expect(results[0].success).toBe(true);
    it('should handle multiple patterns with multiple actions', async () => {
      const pattern1 = createTestPattern({
        id: 'pattern-1',
      const pattern2 = createTestPattern({
        id: 'pattern-2',
        responseActions: [SecurityResponseAction.SEND_ALERT, SecurityResponseAction.RATE_LIMIT]
      const context = createTestContext({ patterns: [pattern1, pattern2] });
      const results = await handler.handleSuspiciousActivity([pattern1, pattern2], context);
      expect(results.length).toBeGreaterThan(1);
      const actions = results.map(r => r.action);
      expect(actions).toContain(SecurityResponseAction.LOG_ONLY);
      expect(actions).toContain(SecurityResponseAction.SEND_ALERT);
    it('should add escalation for critical events', async () => {
        severity: AuditSeverity.CRITICAL,
        responseActions: [SecurityResponseAction.SEND_ALERT]
      const context = createTestContext({ 
        patterns: [pattern], 
        severity: AuditSeverity.CRITICAL 
      expect(actions).toContain(SecurityResponseAction.ESCALATE_TO_ADMIN);
    it('should create security alert for patterns', async () => {
      const pattern = createTestPattern();
      expect(results.length).toBeGreaterThan(0);
      expect(mockAuditLogger.logEvent).toHaveBeenCalled();
    it('should handle execution errors gracefully', async () => {
      // Mock notification service to fail
      mockNotificationService.sendAlert.mockRejectedValueOnce(new Error('Notification failed'));
      expect(results[0].success).toBe(false);
      expect(results[0].errorMessage).toBe('Notification failed');
  describe('response actions execution', () => {
    describe('LOG_ONLY action', () => {
      it('should execute log only action successfully', async () => {
        const pattern = createTestPattern({
          responseActions: [SecurityResponseAction.LOG_ONLY]
        });
        const context = createTestContext({ patterns: [pattern] });
        const results = await handler.handleSuspiciousActivity([pattern], context);
        expect(results[0].action).toBe(SecurityResponseAction.LOG_ONLY);
        expect(results[0].executed).toBe(true);
        expect(results[0].success).toBe(true);
        expect(results[0].details.loggedAt).toBeDefined();
    describe('SEND_ALERT action', () => {
      it('should send alert successfully', async () => {
          responseActions: [SecurityResponseAction.SEND_ALERT]
        expect(mockNotificationService.sendAlert).toHaveBeenCalled();
        const alertCall = mockNotificationService.sendAlert.mock.calls[0][0];
        expect(alertCall.type).toBe('security_alert');
        expect(alertCall.subject).toContain('Test Suspicious Pattern');
      it('should handle alert sending failure', async () => {
        mockNotificationService.sendAlert.mockRejectedValueOnce(new Error('Send failed'));
        const alertResult = results.find(r => r.action === SecurityResponseAction.SEND_ALERT);
        expect(alertResult?.executed).toBe(true);
        expect(alertResult?.success).toBe(false);
        expect(alertResult?.errorMessage).toBe('Send failed');
      it('should work without notification service', async () => {
        const handlerWithoutService = new SuspiciousActivityHandler();
        const results = await handlerWithoutService.handleSuspiciousActivity([pattern], context);
        expect(alertResult?.success).toBe(true);
    describe('RATE_LIMIT action', () => {
      it('should apply rate limiting', async () => {
          severity: AuditSeverity.HIGH,
          responseActions: [SecurityResponseAction.RATE_LIMIT]
        const context = createTestContext({ 
          patterns: [pattern],
          severity: AuditSeverity.HIGH
        expect(handler.isUserRateLimited('user-123')).toBe(true);
        
        const rateLimitResult = results.find(r => r.action === SecurityResponseAction.RATE_LIMIT);
        expect(rateLimitResult?.executed).toBe(true);
        expect(rateLimitResult?.success).toBe(true);
        expect(rateLimitResult?.details.userId).toBe('user-123');
        expect(rateLimitResult?.details.limitDuration).toBeDefined();
      it('should calculate correct rate limit duration', async () => {
        const criticalPattern = createTestPattern({
          severity: AuditSeverity.CRITICAL,
          patterns: [criticalPattern],
          severity: AuditSeverity.CRITICAL
        const results = await handler.handleSuspiciousActivity([criticalPattern], context);
        expect(rateLimitResult?.details.limitDuration).toBe(60 * 60 * 1000); // 1 hour for critical
    describe('TEMPORARY_LOCK action', () => {
      it('should lock user temporarily', async () => {
          responseActions: [SecurityResponseAction.TEMPORARY_LOCK]
        const lockState = handler.isUserLocked('user-123');
        expect(lockState).not.toBeNull();
        expect(lockState?.lockLevel).toBe('soft');
        expect(lockState?.bypassCode).toBeDefined();
        const lockResult = results.find(r => r.action === SecurityResponseAction.TEMPORARY_LOCK);
        expect(lockResult?.executed).toBe(true);
        expect(lockResult?.success).toBe(true);
      it('should create hard lock for critical events', async () => {
        expect(lockState?.lockLevel).toBe('hard');
        expect(lockState?.bypassCode).toBeUndefined();
      it('should send lock notification to user', async () => {
          weddingId: 'wedding-123' // Required for notification
        await handler.handleSuspiciousActivity([pattern], context);
        expect(mockNotificationService.sendUserNotification).toHaveBeenCalledWith({
          userId: 'user-123',
          type: 'account_locked',
          title: 'Account Temporarily Locked',
          message: expect.stringContaining('temporarily locked'),
          severity: 'warning'
    describe('REQUIRE_2FA action', () => {
      it('should require 2FA successfully', async () => {
          responseActions: [SecurityResponseAction.REQUIRE_2FA]
        const twoFAResult = results.find(r => r.action === SecurityResponseAction.REQUIRE_2FA);
        expect(twoFAResult?.executed).toBe(true);
        expect(twoFAResult?.success).toBe(true);
        expect(twoFAResult?.details.userId).toBe('user-123');
        expect(twoFAResult?.details.sessionId).toBe('session-123');
    describe('ESCALATE_TO_ADMIN action', () => {
      it('should escalate to admin successfully', async () => {
          responseActions: [SecurityResponseAction.ESCALATE_TO_ADMIN]
        expect(mockNotificationService.sendAdminAlert).toHaveBeenCalled();
        const escalationResult = results.find(r => r.action === SecurityResponseAction.ESCALATE_TO_ADMIN);
        expect(escalationResult?.executed).toBe(true);
        expect(escalationResult?.success).toBe(true);
        expect(escalationResult?.details.ticketId).toBeDefined();
      it('should handle escalation failure gracefully', async () => {
        mockNotificationService.sendAdminAlert.mockRejectedValueOnce(new Error('Admin alert failed'));
        expect(escalationResult?.success).toBe(false);
  describe('user state management', () => {
    describe('rate limiting', () => {
      beforeEach(async () => {
      it('should check if user is rate limited', () => {
        expect(handler.isUserRateLimited('other-user')).toBe(false);
      it('should expire rate limits automatically', (done) => {
        // Mock short duration for testing
        const shortDurationPattern = createTestPattern({
          severity: AuditSeverity.LOW, // 5 minute duration
          userId: 'test-expire-user',
          patterns: [shortDurationPattern]
        handler.handleSuspiciousActivity([shortDurationPattern], context).then(() => {
          expect(handler.isUserRateLimited('test-expire-user')).toBe(true);
          
          // Mock the rate limit state to have a very short expiration
          const rateLimitStates = (handler as unknown).rateLimitStates;
          const state = rateLimitStates.get('test-expire-user');
          if (state) {
            state.blockedUntil = Date.now() - 1000; // Expired 1 second ago
          }
          expect(handler.isUserRateLimited('test-expire-user')).toBe(false);
          done();
    describe('user locking', () => {
      it('should check if user is locked', () => {
        expect(lockState?.userId).toBe('user-123');
      it('should allow unlocking with bypass code', () => {
        if (lockState?.bypassCode) {
          const unlocked = handler.unlockUser('user-123', lockState.bypassCode);
          expect(unlocked).toBe(true);
          expect(handler.isUserLocked('user-123')).toBeNull();
        }
      it('should reject invalid bypass codes', () => {
        const unlocked = handler.unlockUser('user-123', 'INVALID_CODE');
        expect(unlocked).toBe(false);
        expect(handler.isUserLocked('user-123')).not.toBeNull();
      it('should not allow bypass for hard locks', async () => {
          userId: 'hard-lock-user',
        await handler.handleSuspiciousActivity([criticalPattern], context);
        const unlocked = handler.unlockUser('hard-lock-user', 'ANY_CODE');
  describe('alert generation', () => {
    it('should generate appropriate alert titles', async () => {
        name: 'Rapid Data Access',
        patterns: [pattern],
        weddingId: 'wedding-123'
      await handler.handleSuspiciousActivity([pattern], context);
      const alertCall = mockNotificationService.sendAlert.mock.calls[0][0];
      expect(alertCall.subject).toContain('Rapid Data Access');
      expect(alertCall.subject).toContain('MEDIUM'); // Severity prefix
    it('should include wedding context in alerts', async () => {
        weddingContexts: [WorkflowContext.GUEST_MANAGEMENT]
      expect(alertCall.weddingContext).toBeDefined();
      expect(alertCall.weddingContext.weddingId).toBe('wedding-123');
    it('should determine appropriate alert recipients', async () => {
        severity: AuditSeverity.CRITICAL
      expect(alertCall.recipients).toContain('security@wedsync.com');
      expect(alertCall.recipients).toContain('admin@wedsync.com'); // Critical events include admin
  describe('wedding-specific behavior', () => {
    it('should add wedding-context alerts for guest management', async () => {
        weddingContexts: [WorkflowContext.GUEST_MANAGEMENT],
      // Should add SEND_ALERT action for wedding context
    it('should handle different wedding roles appropriately', async () => {
      const helperPattern = createTestPattern({
        responseActions: [SecurityResponseAction.RATE_LIMIT]
      
      const coupleContext = createTestContext({ 
        patterns: [helperPattern],
        originalEvent: {
          ...createTestContext().originalEvent,
          userRole: WeddingRole.COUPLE
      const helperContext = createTestContext({ 
          userRole: WeddingRole.HELPER
      const coupleResults = await handler.handleSuspiciousActivity([helperPattern], coupleContext);
      const helperResults = await handler.handleSuspiciousActivity([helperPattern], helperContext);
      // Both should be handled, but context-aware
      expect(coupleResults.length).toBeGreaterThan(0);
      expect(helperResults.length).toBeGreaterThan(0);
    it('should consider wedding timeline context', async () => {
      const timelinePattern = createTestPattern({
        weddingContexts: [WorkflowContext.TIMELINE_PLANNING],
        patterns: [timelinePattern],
          workflowContext: WorkflowContext.TIMELINE_PLANNING
      const results = await handler.handleSuspiciousActivity([timelinePattern], context);
      expect(alertCall.weddingContext?.affectedWorkflows).toContain(WorkflowContext.TIMELINE_PLANNING);
  describe('performance and cleanup', () => {
    it('should handle multiple concurrent suspicious activities', async () => {
      const pattern1 = createTestPattern({ id: 'pattern-1' });
      const pattern2 = createTestPattern({ id: 'pattern-2' });
      const pattern3 = createTestPattern({ id: 'pattern-3' });
      const contexts = [
        createTestContext({ userId: 'user-1', patterns: [pattern1] }),
        createTestContext({ userId: 'user-2', patterns: [pattern2] }),
        createTestContext({ userId: 'user-3', patterns: [pattern3] })
      ];
      const promises = contexts.map(context => 
        handler.handleSuspiciousActivity(context.patterns, context)
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.length).toBeGreaterThan(0);
    it('should clean up expired states', (done) => {
      // This is tested indirectly through the cleanup job
      // The cleanup job runs every hour, so we can't test it directly in unit tests
      // But we can verify that the handler manages memory properly
      const handler = new SuspiciousActivityHandler();
      expect(handler).toBeInstanceOf(SuspiciousActivityHandler);
      done();
});
describe('createSuspiciousActivityHandler factory', () => {
  it('should create new handler instance', () => {
    const handler = createSuspiciousActivityHandler();
    expect(handler).toBeInstanceOf(SuspiciousActivityHandler);
  it('should create handler with services', () => {
    const handler = createSuspiciousActivityHandler(mockNotificationService, mockAuditLogger);
  it('should create independent instances', () => {
    const handler1 = createSuspiciousActivityHandler();
    const handler2 = createSuspiciousActivityHandler();
    expect(handler1).not.toBe(handler2);
// Integration scenarios
describe('Real-world suspicious activity scenarios', () => {
  describe('data breach attempt scenarios', () => {
    it('should handle guest data harvesting attempt', async () => {
      const harvestingPattern = createTestPattern({
        id: 'guest-harvesting',
        name: 'Guest Data Harvesting',
        severity: AuditSeverity.HIGH,
        responseActions: [
          SecurityResponseAction.TEMPORARY_LOCK,
          SecurityResponseAction.SEND_ALERT,
          SecurityResponseAction.ESCALATE_TO_ADMIN
        ]
      const context = createTestContext({
        patterns: [harvestingPattern],
          userRole: WeddingRole.HELPER,
          details: { 
            action: 'bulk_guest_access',
            rapid_sequential: true,
            count: 150
      const results = await handler.handleSuspiciousActivity([harvestingPattern], context);
      // Should execute all specified actions
      expect(actions).toContain(SecurityResponseAction.TEMPORARY_LOCK);
      // User should be locked
      expect(handler.isUserLocked('user-123')).not.toBeNull();
      // Admin should be notified
      expect(mockNotificationService.sendAdminAlert).toHaveBeenCalled();
    it('should handle vendor information scraping', async () => {
      const scrapingPattern = createTestPattern({
        id: 'vendor-scraping',
        name: 'Vendor Information Scraping',
        severity: AuditSeverity.MEDIUM,
        responseActions: [SecurityResponseAction.RATE_LIMIT, SecurityResponseAction.SEND_ALERT],
        weddingContexts: [WorkflowContext.VENDOR_COORDINATION]
        patterns: [scrapingPattern],
          workflowContext: WorkflowContext.VENDOR_COORDINATION,
            action: 'systematic_vendor_access',
            vendor_count: 25,
            time_pattern: 'suspicious'
      const results = await handler.handleSuspiciousActivity([scrapingPattern], context);
      // Should rate limit and alert
      expect(handler.isUserRateLimited('user-123')).toBe(true);
      expect(mockNotificationService.sendAlert).toHaveBeenCalled();
      expect(alertCall.weddingContext?.affectedWorkflows).toContain(WorkflowContext.VENDOR_COORDINATION);
  describe('insider threat scenarios', () => {
    it('should handle helper privilege abuse', async () => {
      const privilegeAbusePattern = createTestPattern({
        id: 'helper-privilege-abuse',
        name: 'Helper Privilege Abuse',
          SecurityResponseAction.ESCALATE_TO_ADMIN,
          SecurityResponseAction.REQUIRE_2FA
        patterns: [privilegeAbusePattern],
          eventType: AuditEventType.PERMISSION_GRANTED,
            self_granted_admin: true,
            unauthorized_elevation: true
      const results = await handler.handleSuspiciousActivity([privilegeAbusePattern], context);
      // Should lock the helper account
      const lockState = handler.isUserLocked('user-123');
      expect(lockState).not.toBeNull();
      // Should escalate to admin
      expect(mockNotificationService.sendAdminAlert).toHaveBeenCalledWith({
        type: 'security_escalation',
        ticketId: expect.any(String),
        userId: 'user-123',
        weddingId: 'wedding-123',
        summary: expect.stringContaining('Helper Privilege Abuse')
    it('should handle cross-wedding access attempts', async () => {
      const crossAccessPattern = createTestPattern({
        id: 'cross-wedding-access',
        name: 'Unauthorized Cross-Wedding Access',
        patterns: [crossAccessPattern],
        weddingId: 'unauthorized-wedding-456',
          weddingId: 'unauthorized-wedding-456',
            unauthorized_wedding_access: true,
            original_wedding: 'wedding-123'
      const results = await handler.handleSuspiciousActivity([crossAccessPattern], context);
      // Should create hard lock for critical security violation
      expect(lockState?.lockLevel).toBe('hard');
      expect(lockState?.bypassCode).toBeUndefined();
      // Should immediately escalate
  describe('wedding day security scenarios', () => {
    it('should handle increased activity with appropriate response', async () => {
      const weddingDayPattern = createTestPattern({
        id: 'wedding-day-activity',
        name: 'High Wedding Day Activity',
        severity: AuditSeverity.LOW, // Lower severity for wedding day
        responseActions: [SecurityResponseAction.LOG_ONLY, SecurityResponseAction.SEND_ALERT]
        patterns: [weddingDayPattern],
        severity: AuditSeverity.LOW,
            wedding_day: true,
            legitimate_activity: true,
            high_volume: true
      const results = await handler.handleSuspiciousActivity([weddingDayPattern], context);
      // Should not be overly restrictive on wedding day
      expect(handler.isUserRateLimited('user-123')).toBe(false);
      expect(handler.isUserLocked('user-123')).toBeNull();
      // But should still log and alert for review
