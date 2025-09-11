/**
 * WS-190 Incident Response System - Core Automated Response Engine
 * Team B Implementation - Backend/API Focus
 *
 * CRITICAL: This system handles P1 incidents affecting millions of wedding users
 * Must achieve <5min P1 containment, <60s detection, <72hr GDPR compliance
 */

import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import * as crypto from 'crypto';

// Types from database
type SecurityIncident =
  Database['public']['Tables']['security_incidents']['Row'];
type SecurityAlert = Database['public']['Tables']['security_alerts']['Row'];
type ContainmentAction =
  Database['public']['Tables']['containment_actions']['Row'];
type ThreatDetectionRule =
  Database['public']['Tables']['threat_detection_rules']['Row'];

// Validation schemas
const SecurityAlertSchema = z.object({
  sourceSystem: z.string(),
  alertType: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(10),
  description: z.string().min(20),
  rawData: z.record(z.any()).default({}),
  potentialWeddingImpact: z.boolean().default(false),
});

const CreateIncidentSchema = z.object({
  incidentType: z.enum([
    'security_breach',
    'data_leak',
    'system_failure',
    'unauthorized_access',
    'malware_detected',
    'phishing_attempt',
    'insider_threat',
    'ddos_attack',
    'api_abuse',
    'authentication_bypass',
    'privilege_escalation',
    'data_corruption',
    'service_disruption',
  ]),
  severity: z.enum(['P1', 'P2', 'P3', 'P4']),
  title: z.string().min(10).max(255),
  description: z.string().min(50),
  affectedSystems: z.array(z.string()).min(1),
  weddingIds: z.array(z.string().uuid()).default([]),
  venueIds: z.array(z.string().uuid()).default([]),
  vendorIds: z.array(z.string().uuid()).default([]),
  guestDataAffected: z.boolean().default(false),
  photosAffected: z.boolean().default(false),
  paymentDataAffected: z.boolean().default(false),
  evidenceData: z.record(z.any()).default({}),
  forensicsRequired: z.boolean().default(false),
  autoContainmentEnabled: z.boolean().default(true),
});

interface IncidentResponse {
  incident: SecurityIncident;
  containmentActions: ContainmentAction[];
  timelineEntries: any[];
  complianceRequired: boolean;
  emergencyResponse: boolean;
  weddingImpactAssessment: WeddingImpactAssessment;
}

interface WeddingImpactAssessment {
  impactLevel: 'none' | 'minimal' | 'moderate' | 'significant' | 'critical';
  weddingsAffected: number;
  guestsImpacted: number;
  vendorsInvolved: number;
  isSaturday: boolean;
  requiresGuestCommunication: boolean;
  requiresVendorCoordination: boolean;
  reputationRisk: 'low' | 'medium' | 'high' | 'severe';
}

interface ContainmentPlan {
  actions: Array<{
    type: string;
    name: string;
    config: Record<string, any>;
    priority: number;
    weddingSafe: boolean;
    estimatedDuration: number;
  }>;
  totalEstimatedTime: number;
  weddingDaySafe: boolean;
  requiresManualApproval: boolean;
}

export class IncidentResponseSystem {
  private supabase;
  private organizationId: string;

  constructor(organizationId: string) {
    this.supabase = createClient();
    this.organizationId = organizationId;
  }

  /**
   * 1. AUTOMATED SECURITY ALERT PROCESSING
   * Processes incoming security alerts and automatically creates incidents
   */
  async processSecurityAlert(
    alertData: z.infer<typeof SecurityAlertSchema>,
  ): Promise<{
    alert: SecurityAlert;
    incidentCreated?: SecurityIncident;
    autoContained?: boolean;
  }> {
    const startTime = Date.now();

    try {
      // Validate alert data
      const validated = SecurityAlertSchema.parse(alertData);

      // Create alert record
      const { data: alert, error: alertError } = await this.supabase
        .from('security_alerts')
        .insert({
          organization_id: this.organizationId,
          source_system: validated.sourceSystem,
          alert_type: validated.alertType,
          severity: validated.severity,
          title: validated.title,
          description: validated.description,
          raw_data: validated.rawData,
          potential_wedding_impact: validated.potentialWeddingImpact,
          processing_status: 'processing',
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // Evaluate against threat detection rules
      const shouldCreateIncident = await this.evaluateThreatRules(alert);

      let incident: SecurityIncident | undefined;
      let autoContained = false;

      if (shouldCreateIncident) {
        // Auto-create incident
        incident = await this.createIncidentFromAlert(alert);

        // Execute automated containment for P1 incidents
        if (incident.severity === 'P1' && incident.auto_containment_enabled) {
          autoContained = await this.executeEmergencyContainment(incident.id);
        }

        // Update alert status
        await this.supabase
          .from('security_alerts')
          .update({
            processing_status: 'incident_created',
            incident_created_id: incident.id,
            processed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime,
          })
          .eq('id', alert.id);
      } else {
        // Mark as false positive
        await this.supabase
          .from('security_alerts')
          .update({
            processing_status: 'false_positive',
            processed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime,
          })
          .eq('id', alert.id);
      }

      return {
        alert,
        incidentCreated: incident,
        autoContained,
      };
    } catch (error) {
      console.error('Alert processing failed:', error);
      throw new Error(
        `Alert processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 2. MANUAL INCIDENT CREATION
   * Creates incidents manually with full validation and automated response
   */
  async createIncident(
    incidentData: z.infer<typeof CreateIncidentSchema>,
    createdBy: string,
  ): Promise<IncidentResponse> {
    const validated = CreateIncidentSchema.parse(incidentData);

    // Assess wedding impact
    const weddingImpact = await this.assessWeddingImpact(validated);

    // Create incident record
    const { data: incident, error } = await this.supabase
      .from('security_incidents')
      .insert({
        organization_id: this.organizationId,
        incident_type: validated.incidentType,
        severity: validated.severity,
        title: validated.title,
        description: validated.description,
        affected_systems: validated.affectedSystems,
        wedding_ids: validated.weddingIds,
        venue_ids: validated.venueIds,
        vendor_ids: validated.vendorIds,
        guest_data_affected: validated.guestDataAffected,
        photos_affected: validated.photosAffected,
        payment_data_affected: validated.paymentDataAffected,
        evidence_data: validated.evidenceData,
        forensics_required: validated.forensicsRequired,
        auto_containment_enabled: validated.autoContainmentEnabled,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial timeline entry
    await this.addTimelineEntry(incident.id, {
      phase: 'detection',
      actionTaken: 'Incident created and classified',
      automatedAction: false,
      success: true,
      weddingImpact: weddingImpact.impactLevel,
      executedByUser: createdBy,
    });

    // Execute automated response workflow
    const containmentActions = await this.executeAutomatedResponse(
      incident,
      weddingImpact,
    );

    // Get all timeline entries
    const { data: timelineEntries } = await this.supabase
      .from('incident_timeline')
      .select('*')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: true });

    return {
      incident,
      containmentActions: containmentActions || [],
      timelineEntries: timelineEntries || [],
      complianceRequired:
        validated.guestDataAffected || validated.paymentDataAffected,
      emergencyResponse: validated.severity === 'P1',
      weddingImpactAssessment: weddingImpact,
    };
  }

  /**
   * 3. P1 EMERGENCY CONTAINMENT (Must complete within 5 minutes)
   */
  private async executeEmergencyContainment(
    incidentId: string,
  ): Promise<boolean> {
    const containmentStartTime = Date.now();

    try {
      console.log(
        `🚨 EMERGENCY: P1 containment initiated for incident ${incidentId}`,
      );

      // Get incident details
      const { data: incident } = await this.supabase
        .from('security_incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (!incident) throw new Error('Incident not found');

      // Generate emergency containment plan
      const containmentPlan =
        await this.generateEmergencyContainmentPlan(incident);

      // Check wedding day safety
      const isWeddingDay = new Date().getDay() === 6; // Saturday
      if (isWeddingDay && !containmentPlan.weddingDaySafe) {
        await this.escalateToHuman(
          incidentId,
          'Wedding day safety check failed',
        );
        return false;
      }

      // Execute containment actions in parallel for speed
      const actionResults = await Promise.allSettled(
        containmentPlan.actions
          .filter((action) => action.priority <= 3) // Only execute critical actions automatically
          .map((action) => this.executeContainmentAction(incidentId, action)),
      );

      const successfulActions = actionResults.filter(
        (result) => result.status === 'fulfilled',
      ).length;
      const totalActions = actionResults.length;
      const containmentSuccess =
        successfulActions >= Math.ceil(totalActions * 0.8); // 80% success rate

      // Record containment results
      await this.addTimelineEntry(incidentId, {
        phase: 'containment',
        actionTaken: `Emergency automated containment executed: ${successfulActions}/${totalActions} actions successful`,
        automatedAction: true,
        success: containmentSuccess,
        evidencePreserved: {
          containmentPlan,
          actionResults: actionResults.map((result) => ({
            status: result.status,
            value: result.status === 'fulfilled' ? result.value : null,
            reason: result.status === 'rejected' ? result.reason : null,
          })),
          containmentDurationMs: Date.now() - containmentStartTime,
        },
        weddingImpact: isWeddingDay ? 'significant' : 'minimal',
      });

      // Update incident status if containment successful
      if (containmentSuccess) {
        await this.supabase
          .from('security_incidents')
          .update({
            status: 'contained',
            auto_containment_executed: true,
            auto_containment_success: true,
          })
          .eq('id', incidentId);
      } else {
        await this.escalateToHuman(
          incidentId,
          'Automated containment partially failed',
        );
      }

      const containmentTime = Date.now() - containmentStartTime;
      console.log(
        `⚡ P1 containment completed in ${containmentTime}ms - Success: ${containmentSuccess}`,
      );

      return containmentSuccess;
    } catch (error) {
      console.error(
        `❌ P1 containment failed for incident ${incidentId}:`,
        error,
      );

      await this.addTimelineEntry(incidentId, {
        phase: 'containment',
        actionTaken: `Emergency containment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        automatedAction: true,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.escalateToHuman(
        incidentId,
        'Emergency containment system failure',
      );
      return false;
    }
  }

  /**
   * 4. THREAT RULE EVALUATION
   */
  private async evaluateThreatRules(alert: SecurityAlert): Promise<boolean> {
    const { data: rules } = await this.supabase
      .from('threat_detection_rules')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('enabled', true);

    if (!rules || rules.length === 0) return false;

    const isWeddingDay = new Date().getDay() === 6;

    for (const rule of rules) {
      try {
        const criteria = rule.detection_criteria as Record<string, any>;
        let ruleMatches = false;

        // Basic alert type matching
        if (
          criteria.alert_types &&
          criteria.alert_types.includes(alert.alert_type)
        ) {
          ruleMatches = true;
        }

        // Severity threshold matching
        if (criteria.min_severity) {
          const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
          const alertSeverity =
            severityLevels[alert.severity as keyof typeof severityLevels] || 0;
          const minSeverity =
            severityLevels[
              criteria.min_severity as keyof typeof severityLevels
            ] || 0;

          if (alertSeverity >= minSeverity) {
            ruleMatches = true;
          }
        }

        // Wedding context matching
        if (rule.wedding_context_aware && alert.potential_wedding_impact) {
          ruleMatches = true;
        }

        // Saturday sensitivity
        if (rule.saturday_sensitivity && isWeddingDay) {
          ruleMatches = true;
        }

        // Data type specific rules
        if (rule.guest_data_focus && this.detectsGuestDataThreat(alert)) {
          ruleMatches = true;
        }

        if (rule.payment_data_focus && this.detectsPaymentDataThreat(alert)) {
          ruleMatches = true;
        }

        if (
          rule.photo_access_monitoring &&
          this.detectsPhotoAccessThreat(alert)
        ) {
          ruleMatches = true;
        }

        if (ruleMatches && rule.auto_create_incident) {
          // Update rule usage statistics
          await this.supabase
            .from('threat_detection_rules')
            .update({
              last_triggered: new Date().toISOString(),
              trigger_count: rule.trigger_count + 1,
            })
            .eq('id', rule.id);

          return true;
        }
      } catch (error) {
        // GUARDIAN FIX: Never expose sensitive security data in production logs
        if (process.env.NODE_ENV === 'development') {
          console.error(`Rule evaluation failed for rule ${rule.id}:`, error);
        }

        // Log to secure monitoring system instead
        await this.logSecurityError({
          ruleId: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          context: 'rule_evaluation_failure',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          weddingDayRisk: 'low',
        });

        continue;
      }
    }

    return false;
  }

  /**
   * 5. WEDDING IMPACT ASSESSMENT
   */
  private async assessWeddingImpact(
    incidentData: z.infer<typeof CreateIncidentSchema>,
  ): Promise<WeddingImpactAssessment> {
    const isWeddingDay = new Date().getDay() === 6;

    // Query affected weddings
    const weddingsAffected = incidentData.weddingIds.length;
    let guestsImpacted = 0;
    let vendorsInvolved = incidentData.vendorIds.length;

    if (weddingsAffected > 0) {
      // Get guest count for affected weddings
      const { data: weddingGuests } = await this.supabase
        .from('wedding_guests')
        .select('id')
        .in('wedding_id', incidentData.weddingIds);

      guestsImpacted = weddingGuests?.length || 0;
    }

    // Calculate impact level
    let impactLevel: WeddingImpactAssessment['impactLevel'] = 'none';

    if (incidentData.severity === 'P1' || isWeddingDay) {
      impactLevel = 'critical';
    } else if (
      incidentData.paymentDataAffected ||
      incidentData.photosAffected
    ) {
      impactLevel = 'significant';
    } else if (incidentData.guestDataAffected || weddingsAffected > 0) {
      impactLevel = 'moderate';
    } else if (guestsImpacted > 0 || vendorsInvolved > 0) {
      impactLevel = 'minimal';
    }

    // Determine reputation risk
    let reputationRisk: WeddingImpactAssessment['reputationRisk'] = 'low';

    if (isWeddingDay && incidentData.severity === 'P1') {
      reputationRisk = 'severe';
    } else if (
      incidentData.photosAffected ||
      incidentData.paymentDataAffected
    ) {
      reputationRisk = 'high';
    } else if (guestsImpacted > 100) {
      reputationRisk = 'medium';
    }

    return {
      impactLevel,
      weddingsAffected,
      guestsImpacted,
      vendorsInvolved,
      isSaturday: isWeddingDay,
      requiresGuestCommunication:
        impactLevel === 'significant' || impactLevel === 'critical',
      requiresVendorCoordination:
        vendorsInvolved > 0 || impactLevel === 'critical',
      reputationRisk,
    };
  }

  /**
   * 6. CONTAINMENT PLAN GENERATION
   */
  private async generateEmergencyContainmentPlan(
    incident: SecurityIncident,
  ): Promise<ContainmentPlan> {
    const actions = [];
    const isWeddingDay = new Date().getDay() === 6;

    // Standard P1 containment actions
    switch (incident.incident_type) {
      case 'security_breach':
      case 'unauthorized_access':
        actions.push(
          {
            type: 'isolate_system',
            name: 'Isolate Affected Systems',
            config: {
              systems: incident.affected_systems,
              mode: 'network_isolation',
            },
            priority: 1,
            weddingSafe: true,
            estimatedDuration: 60, // seconds
          },
          {
            type: 'rotate_credentials',
            name: 'Emergency Credential Rotation',
            config: { scope: 'affected_systems', force: true },
            priority: 2,
            weddingSafe: true,
            estimatedDuration: 120,
          },
        );
        break;

      case 'ddos_attack':
        actions.push(
          {
            type: 'activate_waf_rules',
            name: 'Activate DDoS Protection',
            config: { mode: 'aggressive', auto_ban: true },
            priority: 1,
            weddingSafe: true,
            estimatedDuration: 30,
          },
          {
            type: 'enable_rate_limiting',
            name: 'Emergency Rate Limiting',
            config: { requests_per_minute: 10, scope: 'global' },
            priority: 1,
            weddingSafe: false, // May impact user experience
            estimatedDuration: 15,
          },
        );
        break;

      case 'data_leak':
        actions.push(
          {
            type: 'backup_data',
            name: 'Emergency Data Backup',
            config: { priority: 'high', exclude_compromised: true },
            priority: 1,
            weddingSafe: true,
            estimatedDuration: 180,
          },
          {
            type: 'isolate_system',
            name: 'Isolate Data Sources',
            config: { systems: incident.affected_systems, mode: 'read_only' },
            priority: 2,
            weddingSafe: true,
            estimatedDuration: 90,
          },
        );
        break;

      default:
        actions.push({
          type: 'notify_stakeholders',
          name: 'Emergency Notification',
          config: { urgency: 'immediate', include_executives: true },
          priority: 1,
          weddingSafe: true,
          estimatedDuration: 60,
        });
    }

    // Wedding-specific considerations
    if (incident.guest_data_affected || incident.photos_affected) {
      actions.push({
        type: 'notify_stakeholders',
        name: 'Guest Data Incident Notification',
        config: {
          recipients: ['dpo', 'privacy_officer', 'customer_service'],
          template: 'guest_data_incident',
          include_couples: true,
        },
        priority: 2,
        weddingSafe: true,
        estimatedDuration: 120,
      });
    }

    if (isWeddingDay) {
      actions.push({
        type: 'escalate_to_soc',
        name: 'Saturday Emergency Escalation',
        config: {
          severity: 'weekend_emergency',
          notify_on_call: true,
          max_response_time: 300, // 5 minutes
        },
        priority: 1,
        weddingSafe: true,
        estimatedDuration: 60,
      });
    }

    const totalEstimatedTime = actions.reduce(
      (sum, action) => sum + action.estimatedDuration,
      0,
    );
    const weddingDaySafe = isWeddingDay
      ? actions.every((action) => action.weddingSafe)
      : true;
    const requiresManualApproval = totalEstimatedTime > 300 || !weddingDaySafe; // >5 minutes or not wedding safe

    return {
      actions,
      totalEstimatedTime,
      weddingDaySafe,
      requiresManualApproval,
    };
  }

  /**
   * 7. CONTAINMENT ACTION EXECUTION
   */
  private async executeContainmentAction(
    incidentId: string,
    action: ContainmentPlan['actions'][0],
  ): Promise<ContainmentAction> {
    const startTime = Date.now();

    // Create containment action record
    const { data: containmentAction, error } = await this.supabase
      .from('containment_actions')
      .insert({
        incident_id: incidentId,
        action_type: action.type,
        action_name: action.name,
        action_config: action.config,
        execution_status: 'executing',
        started_at: new Date().toISOString(),
        wedding_day_safe: action.weddingSafe,
      })
      .select()
      .single();

    if (error) throw error;

    try {
      // Execute the actual containment action
      const result = await this.performContainmentAction(action);

      // Update success status
      await this.supabase
        .from('containment_actions')
        .update({
          execution_status: 'completed',
          completed_at: new Date().toISOString(),
          success: result.success,
          execution_log: result.log,
          after_state: result.afterState,
        })
        .eq('id', containmentAction.id);

      return { ...containmentAction, success: result.success };
    } catch (actionError) {
      // Update failure status
      await this.supabase
        .from('containment_actions')
        .update({
          execution_status: 'failed',
          completed_at: new Date().toISOString(),
          success: false,
          error_message:
            actionError instanceof Error
              ? actionError.message
              : 'Unknown error',
        })
        .eq('id', containmentAction.id);

      throw actionError;
    }
  }

  /**
   * 8. HELPER METHODS
   */

  private async createIncidentFromAlert(
    alert: SecurityAlert,
  ): Promise<SecurityIncident> {
    const severityMapping = {
      low: 'P4' as const,
      medium: 'P3' as const,
      high: 'P2' as const,
      critical: 'P1' as const,
    };

    const { data: incident, error } = await this.supabase
      .from('security_incidents')
      .insert({
        organization_id: this.organizationId,
        incident_type: this.mapAlertTypeToIncidentType(alert.alert_type),
        severity:
          severityMapping[alert.severity as keyof typeof severityMapping],
        title: alert.title,
        description: alert.description,
        affected_systems: [alert.source_system],
        evidence_data: alert.raw_data,
        guest_data_affected: alert.potential_wedding_impact,
        created_by: 'system', // System-created
      })
      .select()
      .single();

    if (error) throw error;
    return incident;
  }

  private mapAlertTypeToIncidentType(
    alertType: string,
  ): SecurityIncident['incident_type'] {
    const mapping: Record<string, SecurityIncident['incident_type']> = {
      breach: 'security_breach',
      access: 'unauthorized_access',
      malware: 'malware_detected',
      ddos: 'ddos_attack',
      phishing: 'phishing_attempt',
      insider: 'insider_threat',
      api_abuse: 'api_abuse',
      auth_bypass: 'authentication_bypass',
      privilege_escalation: 'privilege_escalation',
      corruption: 'data_corruption',
      outage: 'service_disruption',
    };

    return mapping[alertType] || 'security_breach';
  }

  private detectsGuestDataThreat(alert: SecurityAlert): boolean {
    const guestDataIndicators = [
      'guest',
      'attendee',
      'invitation',
      'dietary',
      'seating',
    ];
    const description = alert.description.toLowerCase();
    return guestDataIndicators.some((indicator) =>
      description.includes(indicator),
    );
  }

  private detectsPaymentDataThreat(alert: SecurityAlert): boolean {
    const paymentIndicators = [
      'payment',
      'card',
      'transaction',
      'billing',
      'invoice',
      'stripe',
    ];
    const description = alert.description.toLowerCase();
    return paymentIndicators.some((indicator) =>
      description.includes(indicator),
    );
  }

  private detectsPhotoAccessThreat(alert: SecurityAlert): boolean {
    const photoIndicators = [
      'photo',
      'image',
      'gallery',
      'download',
      'media',
      'file',
    ];
    const description = alert.description.toLowerCase();
    return photoIndicators.some((indicator) => description.includes(indicator));
  }

  private async performContainmentAction(
    action: ContainmentPlan['actions'][0],
  ): Promise<{
    success: boolean;
    log: Record<string, any>;
    afterState: Record<string, any>;
  }> {
    // This would integrate with actual security systems
    // For now, returning mock successful execution
    await new Promise((resolve) =>
      setTimeout(resolve, action.estimatedDuration * 10),
    ); // Simulate execution time (10x faster for demo)

    return {
      success: true,
      log: {
        action: action.name,
        config: action.config,
        executedAt: new Date().toISOString(),
        duration: action.estimatedDuration,
      },
      afterState: {
        systemStatus: 'contained',
        threats: 'mitigated',
      },
    };
  }

  private async executeAutomatedResponse(
    incident: SecurityIncident,
    weddingImpact: WeddingImpactAssessment,
  ): Promise<ContainmentAction[]> {
    if (incident.severity === 'P1' && incident.auto_containment_enabled) {
      await this.executeEmergencyContainment(incident.id);
    }

    // Get all containment actions for this incident
    const { data: actions } = await this.supabase
      .from('containment_actions')
      .select('*')
      .eq('incident_id', incident.id);

    return actions || [];
  }

  private async addTimelineEntry(
    incidentId: string,
    entry: {
      phase: string;
      actionTaken: string;
      automatedAction: boolean;
      success: boolean;
      weddingImpact?: string;
      executedByUser?: string;
      evidencePreserved?: Record<string, any>;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.supabase.from('incident_timeline').insert({
      incident_id: incidentId,
      phase: entry.phase,
      action_taken: entry.actionTaken,
      automated_action: entry.automatedAction,
      success: entry.success,
      wedding_impact: entry.weddingImpact || null,
      executed_by_user: entry.executedByUser || null,
      evidence_preserved: entry.evidencePreserved || {},
      error_message: entry.errorMessage || null,
    });
  }

  private async escalateToHuman(
    incidentId: string,
    reason: string,
  ): Promise<void> {
    await this.addTimelineEntry(incidentId, {
      phase: 'escalation',
      actionTaken: `Escalated to human intervention: ${reason}`,
      automatedAction: true,
      success: true,
    });

    // Update incident status
    await this.supabase
      .from('security_incidents')
      .update({
        status: 'investigating',
        stakeholders_notified: true,
      })
      .eq('id', incidentId);
  }

  /**
   * 9. PUBLIC API METHODS
   */

  async getIncidentById(incidentId: string): Promise<SecurityIncident | null> {
    const { data: incident } = await this.supabase
      .from('security_incidents')
      .select('*')
      .eq('id', incidentId)
      .eq('organization_id', this.organizationId)
      .single();

    return incident;
  }

  async listActiveIncidents(): Promise<SecurityIncident[]> {
    const { data: incidents } = await this.supabase
      .from('security_incidents')
      .select('*')
      .eq('organization_id', this.organizationId)
      .not('status', 'in', '(resolved,closed)')
      .order('detected_at', { ascending: false });

    return incidents || [];
  }

  async getIncidentTimeline(incidentId: string): Promise<any[]> {
    const { data: timeline } = await this.supabase
      .from('incident_timeline')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    return timeline || [];
  }

  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    updatedBy: string,
    notes?: string,
  ): Promise<void> {
    await this.supabase
      .from('security_incidents')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId)
      .eq('organization_id', this.organizationId);

    await this.addTimelineEntry(incidentId, {
      phase: status === 'resolved' ? 'resolution' : 'investigation',
      actionTaken: `Status updated to ${status}${notes ? `: ${notes}` : ''}`,
      automatedAction: false,
      success: true,
      executedByUser: updatedBy,
    });
  }
}

export default IncidentResponseSystem;
