import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
export interface EmergencySecurityConfig {
  weddingDayProtection: boolean;
  autoLockdownThreshold: number;
  emergencyContactsEnabled: boolean;
  backupSystemsActive: boolean;
  criticalServicesOnly: boolean;
}

export interface SecurityThreat {
  id: string;
  type: 'ddos' | 'intrusion' | 'data_breach' | 'api_abuse' | 'system_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  active: boolean;
  description: string;
  affectedSystems: string[];
  mitigationSteps: string[];
}

export interface WeddingDayProtocol {
  isWeddingDay: boolean;
  weddingCount: number;
  criticalVendors: string[];
  emergencyContacts: string[];
  backupProcedures: string[];
}

export class EmergencySecurityManager {
  private supabase = createClientComponentClient();
  private config: EmergencySecurityConfig;
  private activeThreats: SecurityThreat[] = [];
  constructor(config: EmergencySecurityConfig) {
    this.config = config;
  }

  /**
   * Check if today is a wedding day and activate protection protocols
   */
  async checkWeddingDayStatus(): Promise<WeddingDayProtocol> {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      // Check for weddings today and tomorrow (Saturday is critical)
      const { data: weddings } = await this.supabase
        .from('weddings')
        .select('id, wedding_date, photographer_id, vendor_ids')
        .gte('wedding_date', today.toISOString().split('T')[0])
        .lte('wedding_date', tomorrow.toISOString().split('T')[0]);
      const isWeddingDay = (weddings?.length || 0) > 0 || today.getDay() === 6; // Saturday
      const weddingCount = weddings?.length || 0;
      // Get critical vendors for today's weddings
      const criticalVendors =
        weddings?.reduce((vendors: string[], wedding) => {
          if (wedding.photographer_id) vendors.push(wedding.photographer_id);
          if (wedding.vendor_ids) vendors.push(...wedding.vendor_ids);
          return vendors;
        }, []) || [];
      return {
        isWeddingDay,
        weddingCount,
        criticalVendors,
        emergencyContacts: await this.getEmergencyContacts(),
        backupProcedures: this.getWeddingDayBackupProcedures(),
      };
    } catch (error) {
      console.error('Failed to check wedding day status:', error);
      // Err on the side of caution - assume it's a wedding day
      return {
        isWeddingDay: true,
        weddingCount: 0,
        criticalVendors: [],
        emergencyContacts: [],
        backupProcedures: this.getWeddingDayBackupProcedures(),
      };
    }
  }

  /**
   * Analyze system for security threats
   */
  async analyzeSecurityThreats(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    try {
      // Check for unusual API activity
      const apiThreats = await this.checkAPIThreats();
      threats.push(...apiThreats);
      // Check for authentication anomalies
      const authThreats = await this.checkAuthenticationThreats();
      threats.push(...authThreats);
      // Check for system performance issues
      const performanceThreats = await this.checkPerformanceThreats();
      threats.push(...performanceThreats);
      // Check for data integrity issues
      const dataThreats = await this.checkDataIntegrityThreats();
      threats.push(...dataThreats);
      this.activeThreats = threats.filter((threat) => threat.active);
      // Auto-lockdown if critical threats detected
      if (this.shouldTriggerAutoLockdown(threats)) {
        await this.triggerAutoLockdown(threats);
      }

      return threats;
    } catch (error) {
      console.error('Security threat analysis failed:', error);
      return [];
    }
  }

  private async checkAPIThreats(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    try {
      // Check rate limiting violations
      const response = await fetch('/api/admin/security/api-threats');
      const apiData = await response.json();
      if (apiData.rateLimitViolations > 100) {
        threats.push({
          id: `api_abuse_${Date.now()}`,
          type: 'api_abuse',
          severity: apiData.rateLimitViolations > 1000 ? 'critical' : 'high',
          source: 'API Gateway',
          timestamp: new Date(),
          active: true,
          description: `Excessive rate limit violations detected: ${apiData.rateLimitViolations}`,
          affectedSystems: ['API Gateway', 'Authentication'],
          mitigationSteps: [
            'Enable emergency rate limiting',
            'Block suspicious IP addresses',
            'Activate DDoS protection',
          ],
        });
      }

      if (apiData.errorRate > 0.1) {
        // 10% error rate
        threats.push({
          id: `api_errors_${Date.now()}`,
          type: 'system_failure',
          severity: 'medium',
          source: 'API Monitoring',
          timestamp: new Date(),
          active: true,
          description: `High API error rate detected: ${(apiData.errorRate * 100).toFixed(1)}%`,
          affectedSystems: ['API Gateway', 'Database'],
          mitigationSteps: [
            'Check database connectivity',
            'Restart affected services',
            'Enable graceful degradation',
          ],
        });
      }
    } catch (error) {
      console.error('Failed to check API threats:', error);
    }

    return threats;
  }

  private async checkAuthenticationThreats(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    try {
      const response = await fetch('/api/admin/security/auth-threats');
      const authData = await response.json();
      if (authData.failedLoginAttempts > 50) {
        threats.push({
          id: `brute_force_${Date.now()}`,
          type: 'intrusion',
          severity: authData.failedLoginAttempts > 200 ? 'critical' : 'high',
          source: 'Authentication System',
          timestamp: new Date(),
          active: true,
          description: `Potential brute force attack: ${authData.failedLoginAttempts} failed attempts`,
          affectedSystems: ['Authentication', 'User Accounts'],
          mitigationSteps: [
            'Enable account lockouts',
            'Activate CAPTCHA protection',
            'Block suspicious IP ranges',
          ],
        });
      }
    } catch (error) {
      console.error('Failed to check authentication threats:', error);
    }

    return threats;
  }

  private async checkPerformanceThreats(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    try {
      const response = await fetch('/api/admin/security/performance-threats');
      const perfData = await response.json();
      if (perfData.responseTime > 5000) {
        // 5 seconds
        threats.push({
          id: `slow_response_${Date.now()}`,
          type: 'system_failure',
          severity: 'high',
          source: 'Performance Monitor',
          timestamp: new Date(),
          active: true,
          description: `System responding slowly: ${perfData.responseTime}ms average`,
          affectedSystems: ['Web Application', 'Database'],
          mitigationSteps: [
            'Check server resources',
            'Optimize database queries',
            'Enable caching systems',
          ],
        });
      }

      if (perfData.memoryUsage > 0.9) {
        // 90% memory usage
        threats.push({
          id: `memory_usage_${Date.now()}`,
          type: 'system_failure',
          severity: 'medium',
          source: 'System Monitor',
          timestamp: new Date(),
          active: true,
          description: `High memory usage detected: ${(perfData.memoryUsage * 100).toFixed(1)}%`,
          affectedSystems: ['Application Server'],
          mitigationSteps: [
            'Restart application services',
            'Clear application caches',
            'Scale server resources',
          ],
        });
      }
    } catch (error) {
      console.error('Failed to check performance threats:', error);
    }

    return threats;
  }

  private async checkDataIntegrityThreats(): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    try {
      // Check for unusual data patterns
      const { data: recentChanges } = await this.supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
        .order('created_at', { ascending: false })
        .limit(100);
      if (recentChanges && recentChanges.length > 50) {
        threats.push({
          id: `data_anomaly_${Date.now()}`,
          type: 'data_breach',
          severity: 'medium',
          source: 'Data Monitor',
          timestamp: new Date(),
          active: true,
          description: `Unusual data activity detected: ${recentChanges.length} changes in 1 minute`,
          affectedSystems: ['Database', 'Audit System'],
          mitigationSteps: [
            'Review recent data changes',
            'Check user permissions',
            'Enable enhanced monitoring',
          ],
        });
      }
    } catch (error) {
      console.error('Failed to check data integrity threats:', error);
    }

    return threats;
  }

  private shouldTriggerAutoLockdown(threats: SecurityThreat[]): boolean {
    const criticalThreats = threats.filter(
      (t) => t.severity === 'critical' && t.active,
    );
    const highThreats = threats.filter(
      (t) => t.severity === 'high' && t.active,
    );
    return (
      criticalThreats.length > 0 ||
      highThreats.length >= this.config.autoLockdownThreshold ||
      (this.config.weddingDayProtection && threats.length > 2)
    );
  }

  private async triggerAutoLockdown(threats: SecurityThreat[]): Promise<void> {
    try {
      const response = await fetch('/api/admin/security/auto-lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Auto-lockdown triggered by security threats',
          threats: threats.map((t) => t.id),
          timestamp: new Date().toISOString(),
        }),
      });
      if (response.ok) {
        await this.notifyEmergencyContacts(threats);
      }
    } catch (error) {
      console.error('Failed to trigger auto-lockdown:', error);
    }
  }

  private async notifyEmergencyContacts(
    threats: SecurityThreat[],
  ): Promise<void> {
    if (!this.config.emergencyContactsEnabled) return;
    try {
      await fetch('/api/admin/security/emergency-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto_lockdown',
          threats,
          timestamp: new Date().toISOString(),
          severity: 'critical',
        }),
      });
    } catch (error) {
      console.error('Failed to notify emergency contacts:', error);
    }
  }

  private async getEmergencyContacts(): Promise<string[]> {
    try {
      const { data: contacts } = await this.supabase
        .from('emergency_contacts')
        .select('contact_info')
        .eq('active', true);
      return contacts?.map((c) => c.contact_info) || [];
    } catch (error) {
      console.error('Failed to get emergency contacts:', error);
      return [];
    }
  }

  private getWeddingDayBackupProcedures(): string[] {
    return [
      'Activate backup data centers',
      'Enable emergency-only API endpoints',
      'Prioritize wedding-critical operations',
      'Increase monitoring frequency',
      'Prepare manual fallback procedures',
      'Alert on-call emergency team',
      'Enable enhanced logging',
      'Activate DDoS protection',
    ];
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    activeThreatsCount: number;
    weddingDayProtection: boolean;
    lastScanTime: Date;
  } {
    const criticalThreats = this.activeThreats.filter(
      (t) => t.severity === 'critical',
    ).length;
    const highThreats = this.activeThreats.filter(
      (t) => t.severity === 'high',
    ).length;
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalThreats > 0) {
      threatLevel = 'critical';
    } else if (highThreats > 2) {
      threatLevel = 'high';
    } else if (this.activeThreats.length > 3) {
      threatLevel = 'medium';
    }

    return {
      threatLevel,
      activeThreatsCount: this.activeThreats.length,
      weddingDayProtection: this.config.weddingDayProtection,
      lastScanTime: new Date(),
    };
  }
}

// Default emergency security configuration
export const DEFAULT_EMERGENCY_CONFIG: EmergencySecurityConfig = {
  weddingDayProtection: true,
  autoLockdownThreshold: 3, // 3 high-severity threats trigger lockdown
  emergencyContactsEnabled: true,
  backupSystemsActive: true,
  criticalServicesOnly: false,
};
// Create singleton instance
export const emergencySecurityManager = new EmergencySecurityManager(
  DEFAULT_EMERGENCY_CONFIG,
);
