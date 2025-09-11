/**
 * Comprehensive Unit Tests for WS-101 Alert System
 * Tests all core functionality including multi-channel notifications,
 * wedding-critical escalation, and TCPA compliance
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AlertManager, Alert, AlertSeverity, AlertStatus } from '@/lib/monitoring/alerts';
import { MultiChannelOrchestrator } from '@/lib/alerts/channels/MultiChannelOrchestrator';
import { SlackChannel } from '@/lib/alerts/channels/SlackChannel';
import { SMSChannel } from '@/lib/alerts/channels/SMSChannel';
import { EmailChannel } from '@/lib/alerts/channels/EmailChannel';
import { TCPACompliantNotifications } from '@/lib/alerts/slack/TCPACompliantNotifications';
// Mock external dependencies
vi.mock('@/lib/services/sms-service');
vi.mock('@slack/bolt');
vi.mock('@sendgrid/mail');
describe('Alert System Core', () => {
  let alertManager: AlertManager;
  let orchestrator: MultiChannelOrchestrator;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Initialize fresh instances
    alertManager = new AlertManager();
    orchestrator = new MultiChannelOrchestrator();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  describe('AlertManager', () => {
    it('should create alerts with proper metadata', () => {
      const alert = alertManager.createAlert({
        type: 'system',
        severity: AlertSeverity.HIGH,
        title: 'Test Alert',
        description: 'Test description',
        source: 'test-service',
        weddingContext: {
          weddingId: 'wedding-123',
          weddingDate: new Date('2025-06-15'),
          venue: 'Test Venue',
          guestCount: 150,
          criticalityLevel: 'high'
        }
      });
      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe(AlertSeverity.HIGH);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
      expect(alert.weddingContext).toBeDefined();
      expect(alert.timestamp).toBeInstanceOf(Date);
    });
    it('should escalate wedding-critical alerts immediately', () => {
        type: 'wedding_emergency',
        severity: AlertSeverity.WEDDING_EMERGENCY,
        title: 'Vendor No-Show Detected',
        description: 'Critical vendor has not arrived',
        source: 'vendor-tracking',
          weddingId: 'wedding-456',
          weddingDate: new Date(),
          venue: 'Critical Wedding Venue',
          guestCount: 200,
          criticalityLevel: 'critical'
      expect(alert.escalationLevel).toBeGreaterThan(0);
      expect(alert.channels).toContain('slack');
      expect(alert.channels).toContain('sms');
      expect(alert.channels).toContain('email');
    it('should acknowledge alerts correctly', () => {
        severity: AlertSeverity.MEDIUM,
        title: 'System Alert',
        description: 'Test alert',
        source: 'test'
      const acknowledged = alertManager.acknowledgeAlert(alert.id, 'test-user');
      
      expect(acknowledged).toBe(true);
      expect(alert.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(alert.acknowledgedBy).toBe('test-user');
      expect(alert.acknowledgedAt).toBeInstanceOf(Date);
    it('should resolve alerts with proper tracking', () => {
        type: 'performance',
        severity: AlertSeverity.LOW,
        title: 'Performance Alert',
        source: 'monitoring'
      alertManager.acknowledgeAlert(alert.id, 'test-user');
      const resolved = alertManager.resolveAlert(alert.id, 'resolver-user');
      expect(resolved).toBe(true);
      expect(alert.status).toBe(AlertStatus.RESOLVED);
      expect(alert.resolvedBy).toBe('resolver-user');
      expect(alert.resolvedAt).toBeInstanceOf(Date);
    it('should calculate metrics correctly', () => {
      // Create various alerts
      alertManager.createAlert({
        title: 'Alert 1',
        description: 'Test',
        title: 'Alert 2',
      const stats = alertManager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.critical).toBe(1);
      expect(stats.weddingEmergencies).toBe(1);
  describe('MultiChannelOrchestrator', () => {
    let mockSlackChannel: Mock;
    let mockSMSChannel: Mock;
    let mockEmailChannel: Mock;
    beforeEach(() => {
      mockSlackChannel = vi.fn().mockResolvedValue({ success: true });
      mockSMSChannel = vi.fn().mockResolvedValue({ success: true });
      mockEmailChannel = vi.fn().mockResolvedValue({ success: true });
      // Mock channel implementations
      vi.mocked(SlackChannel.prototype.sendAlert = mockSlackChannel);
      vi.mocked(SMSChannel.prototype.sendAlert = mockSMSChannel);
      vi.mocked(EmailChannel.prototype.sendAlert = mockEmailChannel);
    it('should route alerts to appropriate channels', async () => {
        title: 'High Priority Alert',
        description: 'Requires multi-channel notification',
      await orchestrator.routeAlert(alert);
      expect(mockSlackChannel).toHaveBeenCalled();
      expect(mockSMSChannel).toHaveBeenCalled();
      expect(mockEmailChannel).toHaveBeenCalled();
    it('should handle channel failures with fallback', async () => {
      // Simulate Slack failure
      mockSlackChannel.mockRejectedValue(new Error('Slack API Error'));
        title: 'Critical Wedding Alert',
        description: 'Must be delivered despite failures',
        source: 'wedding-monitor'
      // Slack should have been attempted but failed
      // Fallback channels should still work
    it('should implement sub-100ms failover for wedding alerts', async () => {
      const startTime = Date.now();
      // Simulate slow Slack response
      mockSlackChannel.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: false }), 150))
      );
        title: 'Time-Critical Wedding Alert',
        description: 'Requires immediate failover',
        source: 'wedding-timeline'
      const totalTime = Date.now() - startTime;
      // Should have failed over to other channels quickly
      expect(totalTime).toBeLessThan(200); // Allow some buffer
    it('should track channel health metrics', async () => {
        title: 'Health Test Alert',
        description: 'Testing channel health',
        source: 'health-check'
      const healthMetrics = orchestrator.getChannelHealth();
      expect(healthMetrics.slack).toBeDefined();
      expect(healthMetrics.sms).toBeDefined();
      expect(healthMetrics.email).toBeDefined();
      expect(healthMetrics.slack.successRate).toBeGreaterThan(0);
  describe('TCPA Compliance', () => {
    let tcpaService: TCPACompliantNotifications;
      tcpaService = new TCPACompliantNotifications();
    it('should enforce TCPA consent for SMS notifications', async () => {
      const mockUser = {
        id: 'user-123',
        phoneNumber: '+1234567890',
        smsConsentGiven: false,
        smsOptOutTimestamp: null
      };
      const canSendSMS = await tcpaService.canSendSMS(mockUser.id);
      expect(canSendSMS).toBe(false);
    it('should allow emergency wedding SMS despite opt-out', async () => {
        id: 'user-456',
        smsOptOutTimestamp: new Date()
        title: 'Wedding Day Emergency',
        description: 'Critical vendor issue',
        source: 'wedding-day-monitor'
      const canSendEmergency = await tcpaService.canSendEmergencySMS(mockUser.id, alert);
      expect(canSendEmergency).toBe(true);
    it('should log all SMS consent decisions for audit', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
        id: 'user-789',
        smsConsentGiven: true,
      await tcpaService.canSendSMS(mockUser.id);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TCPA consent check')
  describe('Wedding-Specific Features', () => {
    it('should apply wedding-critical thresholds', () => {
        title: 'Vendor Delay',
        description: 'Photographer is 10 minutes late',
        source: 'vendor-tracker',
          weddingId: 'wedding-emergency-test',
          venue: 'Test Wedding Venue',
          guestCount: 100,
      expect(alert.escalationLevel).toBe(2); // Auto-escalated
      expect(alert.priority).toBe('urgent');
    it('should handle timeline deviation alerts', () => {
        type: 'timeline_critical',
        title: 'Timeline Deviation Detected',
        description: 'Ceremony is 15 minutes behind schedule',
        source: 'timeline-monitor',
        metadata: {
          deviationMinutes: 15,
          affectedEvents: ['ceremony', 'photos', 'reception'],
          autoRecoveryOptions: ['extend-cocktail-hour', 'skip-outfit-change']
      expect(alert.metadata.deviationMinutes).toBe(15);
      expect(alert.metadata.affectedEvents).toContain('ceremony');
      expect(alert.metadata.autoRecoveryOptions).toBeDefined();
    it('should prioritize wedding day alerts over system alerts', () => {
      const systemAlert = alertManager.createAlert({
        description: 'High system alert',
      const weddingAlert = alertManager.createAlert({
        title: 'Wedding Alert',
        description: 'Medium wedding alert',
        source: 'wedding',
          weddingId: 'priority-test',
          guestCount: 75,
      const prioritizedAlerts = alertManager.getAlerts({ 
        sortBy: 'priority' 
      expect(prioritizedAlerts[0].id).toBe(weddingAlert.id);
  describe('Performance & Scalability', () => {
    it('should handle high-frequency alerts without degradation', async () => {
      const alertPromises = [];
      // Create 100 alerts rapidly
      for (let i = 0; i < 100; i++) {
        const promise = Promise.resolve(alertManager.createAlert({
          type: 'system',
          severity: AlertSeverity.LOW,
          title: `Load Test Alert ${i}`,
          description: `Performance test alert ${i}`,
          source: 'load-test'
        }));
        alertPromises.push(promise);
      }
      await Promise.all(alertPromises);
      expect(stats.total).toBe(100);
      expect(totalTime).toBeLessThan(1000); // Should complete under 1 second
    it('should maintain sub-100ms response time for alert creation', () => {
      const measurements = [];
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        
        alertManager.createAlert({
          type: 'performance',
          severity: AlertSeverity.MEDIUM,
          title: `Performance Test ${i}`,
          description: 'Response time test',
          source: 'perf-test'
        });
        const end = performance.now();
        measurements.push(end - start);
      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);
      expect(averageTime).toBeLessThan(50); // Average under 50ms
      expect(maxTime).toBeLessThan(100); // No individual alert over 100ms
  describe('Integration Points', () => {
    it('should integrate with existing monitoring system', () => {
      // Mock existing monitoring integration
      const mockMonitoringHook = vi.fn();
      alertManager.onAlertCreated(mockMonitoringHook);
        title: 'Integration Test',
        description: 'Testing monitoring integration',
        source: 'integration-test'
      expect(mockMonitoringHook).toHaveBeenCalled();
    it('should export metrics to existing dashboard', () => {
      // Create some test data
        type: 'system', severity: AlertSeverity.HIGH,
        title: 'Metric Test 1', description: 'Test', source: 'test'
        type: 'wedding_emergency', severity: AlertSeverity.WEDDING_EMERGENCY,
        title: 'Metric Test 2', description: 'Test', source: 'test'
      const metricsExport = alertManager.exportMetrics();
      expect(metricsExport).toHaveProperty('alertCounts');
      expect(metricsExport).toHaveProperty('severityDistribution');
      expect(metricsExport).toHaveProperty('channelHealth');
      expect(metricsExport.alertCounts.total).toBe(2);
});
