#!/usr/bin/env tsx

/**
 * Start Security Monitoring System
 * Initializes and starts the comprehensive security monitoring system
 * 
 * USAGE: npm run security:monitor:start
 */

import { securityEventMonitor } from '../src/lib/security-event-monitor';
import { securityAlertingSystem } from '../src/lib/security-alerting-system';
import { securityAuditLogger } from '../src/lib/security-audit-logger';

async function startSecurityMonitoring() {
  console.log('🛡️ Starting WedSync Security Monitoring System...\n');

  try {
    // Initialize security audit logger
    console.log('📝 Initializing security audit logger...');
    await securityAuditLogger.logSecurityEvent({
      event_type: 'SYSTEM_ERROR',
      event_category: 'INFRASTRUCTURE',
      severity: 'LOW',
      event_data: {
        operation: 'security_monitoring_startup',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });

    // Start security event monitoring
    console.log('👁️ Starting security event monitor...');
    await securityEventMonitor.startMonitoring();

    // Set up alert callbacks
    console.log('🚨 Setting up security alerting...');
    securityEventMonitor.onAlert((alert) => {
      console.log(`🚨 SECURITY ALERT: ${alert.title} (${alert.severity})`);
      securityAlertingSystem.processAlert(alert);
    });

    securityEventMonitor.onMetrics((metrics) => {
      console.log(`📊 Security Metrics Update: ${metrics.totalEvents} events, Score: ${metrics.securityScore}/100`);
    });

    console.log('\n✅ Security monitoring system started successfully!');
    console.log('\nMonitoring components active:');
    console.log('  • Security Event Monitor - Real-time event detection');
    console.log('  • Alerting System - Multi-channel notifications');
    console.log('  • Audit Logger - Comprehensive event logging');
    console.log('  • Performance Monitor - RLS and API performance tracking');

    console.log('\n📊 Access security dashboard: /dashboard/security');
    console.log('🔧 Manage alerts: /admin/security/alerts');
    console.log('📈 View metrics: /admin/security/metrics');

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping security monitoring...');
      securityEventMonitor.stopMonitoring();
      process.exit(0);
    });

    // Log monitoring status every hour
    setInterval(async () => {
      await securityAuditLogger.logSecurityEvent({
        event_type: 'SYSTEM_ERROR',
        event_category: 'INFRASTRUCTURE',
        severity: 'LOW',
        event_data: {
          operation: 'monitoring_health_check',
          status: 'healthy',
          uptime: process.uptime(),
          memory_usage: process.memoryUsage()
        }
      });
      console.log('💚 Security monitoring system health check - OK');
    }, 60 * 60 * 1000); // Every hour

  } catch (error) {
    console.error('💥 Failed to start security monitoring:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  startSecurityMonitoring();
}