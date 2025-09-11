// Advanced Threat Detection System for WS-147
import { supabase } from '../supabase/server';

export interface ActivityData {
  timestamp: string;
  sessionDuration: number;
  actionSequence: string[];
  clickPatterns: any;
  typingMetrics?: {
    speed: number;
  };
  mousePatterns: any;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  deviceFingerprint: string;
  browserInfo?: {
    version: string;
  };
  screenResolution?: string;
  clientsAccessed?: string[];
  dataVolumeBytes: number;
  featuresUsed: string[];
}

export interface BehaviorFeatures {
  loginTime: any;
  sessionDuration: number;
  timeBetweenActions: number[];
  location: {
    country?: string;
    region?: string;
    city?: string;
    isNewLocation: boolean;
  };
  device: {
    fingerprint: string;
    isNewDevice: boolean;
    browserVersion?: string;
    screenResolution?: string;
  };
  actions: {
    actionSequence: string[];
    clickPatterns: any;
    typingSpeed?: number;
    mouseMovementPatterns: any;
  };
  businessActivity: {
    clientsAccessed: number;
    dataVolumeAccessed: number;
    featureUsage: string[];
    unusualDataAccess: boolean;
  };
}

export interface UserBehaviorHistory {
  authHistory: any[];
  devices: any[];
  securityEvents: any[];
  locations: any[];
  patterns: any;
}

export interface BehaviorAnalysis {
  userId: string;
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suspiciousFactors: string[];
  recommendedActions: string[];
  confidence: number;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  actions: string[];
}

export interface UserSecurityProfile {
  mfa_enabled: boolean;
  password_changed_at?: string;
}

export class SecurityMonitoringService {
  static async logSecurityEvent(
    userId: string | null,
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    eventData: any,
    req?: Request,
  ): Promise<void> {
    const ipAddress = req?.headers.get('x-forwarded-for') || '';
    const userAgent = req?.headers.get('user-agent') || '';
    const deviceFingerprint = req ? this.generateDeviceFingerprint(req) : null;

    try {
      await supabase.from('security_audit_log').insert({
        user_id: userId,
        event_type: eventType,
        event_severity: severity,
        event_data: eventData,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
        created_at: new Date().toISOString(),
      });

      // Trigger alerts for high/critical events
      if (severity === 'high' || severity === 'critical') {
        await this.triggerSecurityAlert(eventType, eventData, severity);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static async detectSuspiciousActivity(
    userId: string,
    activityData: any,
  ): Promise<{ suspicious: boolean; reasons: string[]; severity: string }> {
    const reasons: string[] = [];
    let severity = 'low';

    try {
      // Check for rapid login attempts
      const recentAttempts = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 60000).toISOString());

      if (recentAttempts.data && recentAttempts.data.length > 10) {
        reasons.push('Rapid authentication attempts detected');
        severity = 'high';
      }

      // Check for multiple country logins
      const locationChecks = await supabase
        .from('user_devices')
        .select('location_data')
        .eq('user_id', userId)
        .gte('last_seen', new Date(Date.now() - 3600000).toISOString());

      if (locationChecks.data) {
        const countries = new Set(
          locationChecks.data
            .filter((d) => d.location_data?.country)
            .map((d) => d.location_data.country),
        );

        if (countries.size > 2) {
          reasons.push('Multiple country access detected');
          severity = 'critical';
        }
      }

      // Check for unusual data volume access
      if (activityData.dataVolumeBytes > 100 * 1024 * 1024) {
        // 100MB
        reasons.push('Unusual large data access detected');
        severity = severity === 'low' ? 'medium' : severity;
      }

      // Check for rapid sequential actions
      if (
        activityData.actionSequence &&
        activityData.actionSequence.length > 50
      ) {
        reasons.push('Rapid sequential actions detected');
        severity = severity === 'low' ? 'medium' : severity;
      }
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
      severity,
    };
  }

  static async generateRiskScore(userId: string): Promise<number> {
    let riskScore = 0;

    try {
      // Recent failed logins
      const failedLogins = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('success', false)
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      riskScore += Math.min((failedLogins.data?.length || 0) * 5, 25);

      // MFA status
      const securityProfile = await supabase
        .from('user_security_profiles')
        .select('mfa_enabled, password_changed_at')
        .eq('user_id', userId)
        .single();

      if (!securityProfile.data?.mfa_enabled) {
        riskScore += 30;
      }

      // Password age
      const passwordAge = securityProfile.data?.password_changed_at;
      if (passwordAge) {
        const daysSinceChange =
          (Date.now() - new Date(passwordAge).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceChange > 90) {
          riskScore += 20;
        }
      }

      // Recent security events
      const recentSecurityEvents = await supabase
        .from('security_audit_log')
        .select('event_severity')
        .eq('user_id', userId)
        .gte(
          'created_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      const criticalEvents =
        recentSecurityEvents.data?.filter(
          (e) => e.event_severity === 'critical',
        ).length || 0;
      const highEvents =
        recentSecurityEvents.data?.filter((e) => e.event_severity === 'high')
          .length || 0;

      riskScore += criticalEvents * 15 + highEvents * 10;
    } catch (error) {
      console.error('Error generating risk score:', error);
      return 50; // Default moderate risk if calculation fails
    }

    return Math.min(riskScore, 100);
  }

  private static generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const acceptEncoding = req.headers.get('accept-encoding') || '';

    // Create a basic device fingerprint
    return Buffer.from(
      `${userAgent}:${acceptLanguage}:${acceptEncoding}`,
    ).toString('base64');
  }

  private static async triggerSecurityAlert(
    eventType: string,
    eventData: any,
    severity: string,
  ): Promise<void> {
    try {
      // Integration with existing alert system
      const alertManager = await import('../alerts/alertManager');

      await alertManager.default.sendAlert({
        type: 'security_threat',
        severity,
        title: `Security Event: ${eventType}`,
        message: `Security event detected with severity ${severity}`,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to trigger security alert:', error);
    }
  }
}
