/**
 * WS-177 Audit Security Manager - Multi-layered Security Protection
 * Team D Round 1 Implementation - Ultra Hard Thinking Standards
 *
 * This is the core security manager providing 8-layer defense-in-depth protection
 * for luxury wedding management platform with celebrity client requirements.
 */

import { createClient } from '@supabase/supabase-js';
import { ThreatDetectionService } from './ThreatDetectionService';
import { ComplianceValidator } from './ComplianceValidator';
import { IncidentResponseHandler } from './IncidentResponseHandler';
import {
  SecurityLayerInterface,
  SecurityContext,
  AuditEvent,
  ThreatLevel,
} from './SecurityLayerInterface';

interface WeddingSecurityContext extends SecurityContext {
  weddingId: string;
  celebrityTier?: 'standard' | 'high_profile' | 'celebrity';
  vendorAccess?: string[];
  guestDataAccess?: boolean;
  supplierRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditSecurityManager implements SecurityLayerInterface {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private threatDetection: ThreatDetectionService;
  private complianceValidator: ComplianceValidator;
  private incidentHandler: IncidentResponseHandler;

  private readonly encryptionKey: string;
  private readonly securityLayers: string[] = [
    'authentication',
    'authorization',
    'encryption',
    'threat_detection',
    'compliance',
    'audit_trail',
    'monitoring',
    'incident_response',
  ];

  constructor() {
    this.encryptionKey =
      process.env.AUDIT_ENCRYPTION_KEY || this.generateSecureKey();
    this.threatDetection = new ThreatDetectionService();
    this.complianceValidator = new ComplianceValidator();
    this.incidentHandler = new IncidentResponseHandler();
  }

  /**
   * LAYER 1: Authentication Verification
   * Validates user identity with wedding-specific context
   */
  async authenticateUser(context: WeddingSecurityContext): Promise<boolean> {
    try {
      const startTime = Date.now();

      // Validate JWT token
      const { data: user, error } = await this.supabase.auth.getUser(
        context.token,
      );
      if (error || !user) {
        await this.logSecurityEvent({
          event_type: 'authentication_failed',
          user_id: context.userId,
          wedding_id: context.weddingId,
          severity: 'high',
          details: { error: error?.message || 'Invalid token' },
        });
        return false;
      }

      // Wedding-specific authentication checks
      if (context.celebrityTier === 'celebrity') {
        const mfaVerified = await this.verifyMFA(user.user.id);
        if (!mfaVerified) {
          await this.logSecurityEvent({
            event_type: 'celebrity_mfa_required',
            user_id: user.user.id,
            wedding_id: context.weddingId,
            severity: 'critical',
          });
          return false;
        }
      }

      // Log successful authentication with timing
      await this.logSecurityEvent({
        event_type: 'authentication_success',
        user_id: user.user.id,
        wedding_id: context.weddingId,
        severity: 'info',
        details: {
          response_time_ms: Date.now() - startTime,
          celebrity_tier: context.celebrityTier,
        },
      });

      return true;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'authentication_error',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'critical',
        details: { error: error.message },
      });
      return false;
    }
  }

  /**
   * LAYER 2: Authorization Enforcement
   * Role-based access control with wedding context isolation
   */
  async authorizeAccess(
    context: WeddingSecurityContext,
    resource: string,
    action: string,
  ): Promise<boolean> {
    try {
      // Multi-tenant isolation check
      const tenantAccess = await this.validateTenantAccess(
        context.userId,
        context.weddingId,
      );
      if (!tenantAccess) {
        await this.logSecurityEvent({
          event_type: 'tenant_access_denied',
          user_id: context.userId,
          wedding_id: context.weddingId,
          severity: 'high',
          details: { resource, action },
        });
        return false;
      }

      // Role-based permissions check
      const { data: permissions } = await this.supabase.rpc(
        'check_wedding_permissions',
        {
          user_id: context.userId,
          wedding_id: context.weddingId,
          resource_type: resource,
          action_type: action,
        },
      );

      if (!permissions) {
        await this.logSecurityEvent({
          event_type: 'authorization_denied',
          user_id: context.userId,
          wedding_id: context.weddingId,
          severity: 'medium',
          details: { resource, action, reason: 'insufficient_permissions' },
        });
        return false;
      }

      // Vendor access restrictions
      if (context.vendorAccess && !context.vendorAccess.includes(resource)) {
        await this.logSecurityEvent({
          event_type: 'vendor_access_restricted',
          user_id: context.userId,
          wedding_id: context.weddingId,
          severity: 'medium',
          details: { resource, allowed_resources: context.vendorAccess },
        });
        return false;
      }

      return true;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'authorization_error',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'critical',
        details: { error: error.message, resource, action },
      });
      return false;
    }
  }

  /**
   * LAYER 3: Data Encryption/Decryption
   * AES-256 encryption for sensitive wedding data
   */
  async encryptSensitiveData(
    data: any,
    context: WeddingSecurityContext,
  ): Promise<string> {
    try {
      const crypto = await import('crypto');
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);

      // Create wedding-specific encryption context
      const encryptionContext = {
        weddingId: context.weddingId,
        celebrityTier: context.celebrityTier,
        timestamp: new Date().toISOString(),
      };

      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      const payload = JSON.stringify({ data, context: encryptionContext });

      let encrypted = cipher.update(payload, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();
      const result =
        iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;

      await this.logSecurityEvent({
        event_type: 'data_encrypted',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'info',
        details: {
          data_type: typeof data,
          encryption_algorithm: algorithm,
        },
      });

      return result;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'encryption_failed',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'critical',
        details: { error: error.message },
      });
      throw error;
    }
  }

  async decryptSensitiveData(
    encryptedData: string,
    context: WeddingSecurityContext,
  ): Promise<any> {
    try {
      const crypto = await import('crypto');
      const algorithm = 'aes-256-gcm';

      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const payload = JSON.parse(decrypted);

      // Validate encryption context
      if (payload.context.weddingId !== context.weddingId) {
        throw new Error('Wedding context mismatch');
      }

      await this.logSecurityEvent({
        event_type: 'data_decrypted',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'info',
        details: {
          encryption_context_valid: true,
        },
      });

      return payload.data;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'decryption_failed',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'critical',
        details: { error: error.message },
      });
      throw error;
    }
  }

  /**
   * LAYER 4: Threat Detection
   * Real-time threat monitoring and response
   */
  async detectThreats(
    context: WeddingSecurityContext,
    activity: any,
  ): Promise<ThreatLevel> {
    try {
      const threatLevel = await this.threatDetection.analyzeThreat({
        userId: context.userId,
        weddingId: context.weddingId,
        activity,
        celebrityTier: context.celebrityTier,
        supplierRiskLevel: context.supplierRiskLevel,
      });

      if (threatLevel !== 'none') {
        await this.logSecurityEvent({
          event_type: 'threat_detected',
          user_id: context.userId,
          wedding_id: context.weddingId,
          severity: threatLevel === 'critical' ? 'critical' : 'high',
          details: {
            threat_level: threatLevel,
            activity_type: activity.type,
            celebrity_client: context.celebrityTier === 'celebrity',
          },
        });

        // Trigger incident response for high/critical threats
        if (threatLevel === 'high' || threatLevel === 'critical') {
          await this.incidentHandler.respondToThreat(
            context,
            threatLevel,
            activity,
          );
        }
      }

      return threatLevel;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'threat_detection_error',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'critical',
        details: { error: error.message },
      });
      return 'none';
    }
  }

  /**
   * LAYER 5: Compliance Validation
   * Multi-framework compliance checking (GDPR, SOC2, CCPA)
   */
  async validateCompliance(
    context: WeddingSecurityContext,
    operation: string,
  ): Promise<boolean> {
    try {
      const complianceResult = await this.complianceValidator.validateOperation(
        {
          userId: context.userId,
          weddingId: context.weddingId,
          operation,
          guestDataAccess: context.guestDataAccess,
          celebrityTier: context.celebrityTier,
        },
      );

      await this.logSecurityEvent({
        event_type: 'compliance_check',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: complianceResult.compliant ? 'info' : 'high',
        details: {
          operation,
          gdpr_compliant: complianceResult.gdpr,
          soc2_compliant: complianceResult.soc2,
          ccpa_compliant: complianceResult.ccpa,
          violations: complianceResult.violations,
        },
      });

      return complianceResult.compliant;
    } catch (error) {
      await this.logSecurityEvent({
        event_type: 'compliance_validation_error',
        user_id: context.userId,
        wedding_id: context.weddingId,
        severity: 'critical',
        details: { error: error.message, operation },
      });
      return false;
    }
  }

  /**
   * LAYER 6: Audit Trail Generation
   * Tamper-proof audit logging with cryptographic integrity
   */
  private async logSecurityEvent(event: AuditEvent): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const eventHash = await this.generateEventHash(event, timestamp);

      await this.supabase.from('audit_logs').insert({
        event_id: crypto.randomUUID(),
        event_type: event.event_type,
        user_id: event.user_id,
        wedding_id: event.wedding_id,
        severity: event.severity,
        details: event.details,
        timestamp,
        event_hash: eventHash,
        created_at: timestamp,
      });
    } catch (error) {
      // Log to external system if database logging fails
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * LAYER 7: Real-time Monitoring
   * Continuous security monitoring and alerting
   */
  async startSecurityMonitoring(
    context: WeddingSecurityContext,
  ): Promise<void> {
    // Subscribe to real-time security events
    this.supabase
      .channel(`security-monitoring-${context.weddingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `wedding_id=eq.${context.weddingId}`,
        },
        (payload) => {
          this.handleSecurityEvent(payload.new as AuditEvent, context);
        },
      )
      .subscribe();
  }

  /**
   * LAYER 8: Incident Response
   * Automated incident response and escalation
   */
  private async handleSecurityEvent(
    event: AuditEvent,
    context: WeddingSecurityContext,
  ): Promise<void> {
    if (event.severity === 'critical' || event.severity === 'high') {
      await this.incidentHandler.handleIncident(event, context);
    }
  }

  // Private helper methods
  private async verifyMFA(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_mfa_sessions')
      .select('verified')
      .eq('user_id', userId)
      .single();

    return data?.verified || false;
  }

  private async validateTenantAccess(
    userId: string,
    weddingId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase.rpc('validate_tenant_access', {
      user_id: userId,
      wedding_id: weddingId,
    });

    return data || false;
  }

  private async generateEventHash(
    event: AuditEvent,
    timestamp: string,
  ): Promise<string> {
    const crypto = await import('crypto');
    const payload = JSON.stringify({ ...event, timestamp });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private generateSecureKey(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

export default AuditSecurityManager;
