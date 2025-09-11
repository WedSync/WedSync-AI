import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Wedding day safety schemas
const EmergencyOverrideSchema = z.object({
  override_reason: z.string().min(10).max(500),
  emergency_contact_id: z.string().uuid(),
  severity_level: z.enum(['P0', 'P1', 'P2']),
  estimated_duration_minutes: z.number().min(1).max(480), // Max 8 hours
  rollback_plan: z.string().min(20).max(1000),
  stakeholder_notification: z.boolean().default(true),
});

const WeddingSafetyConfigSchema = z.object({
  saturday_read_only: z.boolean().default(true),
  friday_deployment_cutoff_hour: z.number().min(0).max(23).default(18), // 6 PM
  sunday_resume_hour: z.number().min(0).max(23).default(10), // 10 AM
  emergency_override_enabled: z.boolean().default(true),
  enhanced_monitoring_enabled: z.boolean().default(true),
  auto_rollback_threshold_minutes: z.number().min(5).max(60).default(15),
});

interface WeddingSafetyConfig {
  saturday_read_only: boolean;
  friday_deployment_cutoff_hour: number;
  sunday_resume_hour: number;
  emergency_override_enabled: boolean;
  enhanced_monitoring_enabled: boolean;
  auto_rollback_threshold_minutes: number;
}

interface EmergencyOverride {
  override_reason: string;
  emergency_contact_id: string;
  severity_level: 'P0' | 'P1' | 'P2';
  estimated_duration_minutes: number;
  rollback_plan: string;
  stakeholder_notification: boolean;
}

interface WeddingDayStatus {
  is_wedding_day: boolean;
  is_wedding_season: boolean;
  read_only_active: boolean;
  emergency_override_active: boolean;
  active_weddings_count: number;
  system_health_score: number;
  last_health_check: Date;
  next_maintenance_window: Date | null;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  is_primary: boolean;
  availability_status: 'available' | 'busy' | 'unavailable';
  response_time_minutes: number;
}

interface WeddingCriticalVariable {
  variable_id: string;
  variable_key: string;
  criticality_level: 'ESSENTIAL' | 'IMPORTANT' | 'STANDARD';
  wedding_systems: string[];
  change_window_restriction: boolean;
  requires_emergency_override: boolean;
}

export class WeddingDaySafetyService {
  private supabase = createClient();

  /**
   * Check if current time is in wedding day protection window
   */
  async isWeddingDayProtectionActive(
    organizationId: string,
  ): Promise<WeddingDayStatus> {
    try {
      // Get wedding safety configuration
      const { data: config } = await this.supabase
        .from('wedding_safety_config')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      const safetyConfig = config || this.getDefaultSafetyConfig();

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentHour = now.getHours();

      // Check if it's wedding day (Saturday)
      const isSaturday = dayOfWeek === 6;

      // Check if it's Friday after deployment cutoff
      const isFridayAfterCutoff =
        dayOfWeek === 5 &&
        currentHour >= safetyConfig.friday_deployment_cutoff_hour;

      // Check if it's Sunday before resume time
      const isSundayBeforeResume =
        dayOfWeek === 0 && currentHour < safetyConfig.sunday_resume_hour;

      const isWeddingDay =
        isSaturday || isFridayAfterCutoff || isSundayBeforeResume;

      // Check for active weddings today
      const todayString = now.toISOString().split('T')[0];
      const { data: activeWeddings } = await this.supabase
        .from('weddings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('wedding_date', todayString);

      // Check if it's wedding season (higher activity periods)
      const isWeddingSeason = await this.isWeddingSeason(now);

      // Get current system health
      const systemHealthScore =
        await this.calculateSystemHealthScore(organizationId);

      // Check for active emergency overrides
      const { data: activeOverrides } = await this.supabase
        .from('emergency_overrides')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .gte('expires_at', now.toISOString());

      const emergencyOverrideActive = (activeOverrides?.length || 0) > 0;

      // Get next maintenance window
      const { data: nextMaintenance } = await this.supabase
        .from('maintenance_windows')
        .select('scheduled_start')
        .eq('organization_id', organizationId)
        .gte('scheduled_start', now.toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(1)
        .single();

      return {
        is_wedding_day: isWeddingDay,
        is_wedding_season: isWeddingSeason,
        read_only_active:
          safetyConfig.saturday_read_only &&
          isWeddingDay &&
          !emergencyOverrideActive,
        emergency_override_active: emergencyOverrideActive,
        active_weddings_count: activeWeddings?.length || 0,
        system_health_score: systemHealthScore,
        last_health_check: now,
        next_maintenance_window: nextMaintenance
          ? new Date(nextMaintenance.scheduled_start)
          : null,
      };
    } catch (error) {
      console.error('Error checking wedding day protection status:', error);
      throw new Error('Failed to check wedding day protection status');
    }
  }

  /**
   * Enable emergency override for critical situations
   */
  async enableEmergencyOverride(
    organizationId: string,
    userId: string,
    override: EmergencyOverride,
  ): Promise<{
    success: boolean;
    override_id: string;
    expires_at: Date;
    notifications_sent: string[];
  }> {
    try {
      const validatedOverride = EmergencyOverrideSchema.parse(override);

      // Verify user has emergency override permissions
      const hasPermission = await this.verifyEmergencyOverridePermission(
        organizationId,
        userId,
      );
      if (!hasPermission) {
        throw new Error('User does not have emergency override permissions');
      }

      // Verify emergency contact
      const { data: emergencyContact } = await this.supabase
        .from('emergency_contacts')
        .select('*')
        .eq('id', validatedOverride.emergency_contact_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (!emergencyContact) {
        throw new Error('Invalid or inactive emergency contact');
      }

      // Calculate override expiration
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() +
          validatedOverride.estimated_duration_minutes * 60 * 1000,
      );
      const overrideId = `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create emergency override record
      const { error: insertError } = await this.supabase
        .from('emergency_overrides')
        .insert({
          override_id: overrideId,
          organization_id: organizationId,
          user_id: userId,
          emergency_contact_id: validatedOverride.emergency_contact_id,
          severity_level: validatedOverride.severity_level,
          override_reason: validatedOverride.override_reason,
          estimated_duration_minutes:
            validatedOverride.estimated_duration_minutes,
          rollback_plan: validatedOverride.rollback_plan,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          stakeholder_notification: validatedOverride.stakeholder_notification,
        });

      if (insertError) {
        throw new Error(
          `Failed to create emergency override: ${insertError.message}`,
        );
      }

      // Send notifications
      const notificationsSent = await this.sendEmergencyOverrideNotifications(
        organizationId,
        overrideId,
        validatedOverride,
        emergencyContact,
        expiresAt,
      );

      // Log emergency override event
      await this.logEmergencyEvent(organizationId, {
        event_type: 'emergency_override_enabled',
        severity: validatedOverride.severity_level,
        user_id: userId,
        override_id: overrideId,
        reason: validatedOverride.override_reason,
        expires_at: expiresAt,
      });

      // Enable enhanced monitoring during override
      await this.enableEnhancedMonitoring(organizationId, overrideId);

      return {
        success: true,
        override_id: overrideId,
        expires_at: expiresAt,
        notifications_sent: notificationsSent,
      };
    } catch (error) {
      console.error('Error enabling emergency override:', error);
      throw new Error('Failed to enable emergency override');
    }
  }

  /**
   * Validate if a change can be made during wedding day
   */
  async validateWeddingDayChange(
    organizationId: string,
    changeType: 'variable_update' | 'deployment' | 'configuration',
    resourceIds: string[],
  ): Promise<{
    allowed: boolean;
    requires_override: boolean;
    blocked_resources: string[];
    wedding_critical_resources: string[];
    validation_messages: string[];
  }> {
    try {
      const weddingStatus =
        await this.isWeddingDayProtectionActive(organizationId);

      // If not wedding day, allow all changes
      if (!weddingStatus.is_wedding_day) {
        return {
          allowed: true,
          requires_override: false,
          blocked_resources: [],
          wedding_critical_resources: [],
          validation_messages: [
            'Change allowed - not during wedding day protection window',
          ],
        };
      }

      // If emergency override is active, allow changes with additional logging
      if (weddingStatus.emergency_override_active) {
        return {
          allowed: true,
          requires_override: false,
          blocked_resources: [],
          wedding_critical_resources: [],
          validation_messages: ['Change allowed - emergency override active'],
        };
      }

      // Check for wedding-critical resources
      const { data: weddingCriticalVars } = await this.supabase
        .from('wedding_critical_variables')
        .select('*')
        .eq('organization_id', organizationId)
        .in('variable_id', resourceIds);

      const criticalResourceIds =
        weddingCriticalVars?.map((wcv) => wcv.variable_id) || [];
      const blockedResources = criticalResourceIds.filter((id) => {
        const critical = weddingCriticalVars?.find(
          (wcv) => wcv.variable_id === id,
        );
        return critical?.change_window_restriction === true;
      });

      const requiresOverride = blockedResources.length > 0;
      const allowed =
        !weddingStatus.read_only_active ||
        (requiresOverride && weddingStatus.emergency_override_active);

      const validationMessages: string[] = [];

      if (weddingStatus.read_only_active) {
        validationMessages.push('Wedding day read-only mode is active');
      }

      if (requiresOverride) {
        validationMessages.push(
          'This change affects wedding-critical systems and requires emergency override',
        );
      }

      if (criticalResourceIds.length > 0) {
        validationMessages.push(
          `${criticalResourceIds.length} wedding-critical resources involved`,
        );
      }

      return {
        allowed,
        requires_override: requiresOverride,
        blocked_resources: blockedResources,
        wedding_critical_resources: criticalResourceIds,
        validation_messages: validationMessages,
      };
    } catch (error) {
      console.error('Error validating wedding day change:', error);
      return {
        allowed: false,
        requires_override: true,
        blocked_resources: resourceIds,
        wedding_critical_resources: [],
        validation_messages: [
          'Validation failed - defaulting to blocked for safety',
        ],
      };
    }
  }

  /**
   * Get available emergency contacts with current status
   */
  async getEmergencyContacts(
    organizationId: string,
  ): Promise<EmergencyContact[]> {
    try {
      const { data: contacts } = await this.supabase
        .from('emergency_contacts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('response_time_minutes', { ascending: true });

      return (contacts || []).map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role,
        phone: contact.phone,
        email: contact.email,
        is_primary: contact.is_primary,
        availability_status: contact.availability_status || 'available',
        response_time_minutes: contact.response_time_minutes || 15,
      }));
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      throw new Error('Failed to get emergency contacts');
    }
  }

  /**
   * Enable enhanced monitoring during wedding day or emergency situations
   */
  async enableEnhancedMonitoring(
    organizationId: string,
    triggerId?: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('enhanced_monitoring_sessions')
        .insert({
          organization_id: organizationId,
          trigger_id: triggerId,
          trigger_type: triggerId?.startsWith('override_')
            ? 'emergency_override'
            : 'wedding_day',
          monitoring_level: 'ENHANCED',
          check_interval_seconds: 30, // Every 30 seconds during enhanced monitoring
          alert_threshold_multiplier: 0.5, // Lower thresholds (more sensitive)
          enabled: true,
          auto_disable_at: new Date(
            Date.now() + 12 * 60 * 60 * 1000,
          ).toISOString(), // Auto-disable after 12 hours
        });

      if (error) {
        console.error('Failed to enable enhanced monitoring:', error);
        throw new Error('Failed to enable enhanced monitoring');
      }

      // Update monitoring configuration
      await this.supabase.from('monitoring_config').upsert({
        organization_id: organizationId,
        enhanced_mode: true,
        wedding_day_mode: true,
        real_time_alerts: true,
        escalation_enabled: true,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error enabling enhanced monitoring:', error);
      throw new Error('Failed to enable enhanced monitoring');
    }
  }

  /**
   * Perform instant rollback to last known good configuration
   */
  async performEmergencyRollback(
    organizationId: string,
    userId: string,
    environmentId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    rollback_id: string;
    variables_restored: number;
    rollback_timestamp: Date;
  }> {
    try {
      // Find last known good configuration (within last 24 hours, successful deployment)
      const { data: lastGoodSnapshot } = await this.supabase
        .from('configuration_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('environment_id', environmentId)
        .eq('status', 'successful')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastGoodSnapshot) {
        throw new Error(
          'No recent good configuration found for emergency rollback',
        );
      }

      const rollbackId = `emergency_rollback_${Date.now()}`;
      const rollbackTimestamp = new Date();

      // Execute rollback
      const configurationData = JSON.parse(lastGoodSnapshot.configuration_data);
      let restoredCount = 0;

      for (const varConfig of configurationData.variables) {
        try {
          await this.supabase.from('environment_values').upsert({
            environment_id: environmentId,
            variable_id: varConfig.variable_id,
            value: varConfig.value,
            is_encrypted: varConfig.is_encrypted,
            updated_by: userId,
            updated_at: rollbackTimestamp.toISOString(),
          });

          restoredCount++;
        } catch (error) {
          console.error(
            `Failed to restore variable ${varConfig.variable_id}:`,
            error,
          );
        }
      }

      // Log emergency rollback
      await this.logEmergencyEvent(organizationId, {
        event_type: 'emergency_rollback',
        severity: 'P0',
        user_id: userId,
        rollback_id: rollbackId,
        environment_id: environmentId,
        reason: reason,
        variables_restored: restoredCount,
        snapshot_id: lastGoodSnapshot.id,
      });

      // Send immediate notifications
      await this.sendEmergencyRollbackNotifications(organizationId, {
        rollbackId,
        environmentId,
        reason,
        variablesRestored: restoredCount,
        userId,
      });

      return {
        success: true,
        rollback_id: rollbackId,
        variables_restored: restoredCount,
        rollback_timestamp: rollbackTimestamp,
      };
    } catch (error) {
      console.error('Emergency rollback failed:', error);
      throw new Error('Emergency rollback failed');
    }
  }

  // Helper methods
  private getDefaultSafetyConfig(): WeddingSafetyConfig {
    return {
      saturday_read_only: true,
      friday_deployment_cutoff_hour: 18,
      sunday_resume_hour: 10,
      emergency_override_enabled: true,
      enhanced_monitoring_enabled: true,
      auto_rollback_threshold_minutes: 15,
    };
  }

  private async isWeddingSeason(date: Date): Promise<boolean> {
    // Wedding season typically: May-October in Northern Hemisphere
    const month = date.getMonth() + 1; // 0-based to 1-based
    return month >= 5 && month <= 10;
  }

  private async calculateSystemHealthScore(
    organizationId: string,
  ): Promise<number> {
    try {
      // Get recent health metrics
      const { data: healthMetrics } = await this.supabase
        .from('system_health_metrics')
        .select('status')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      if (!healthMetrics || healthMetrics.length === 0) {
        return 50; // Unknown state
      }

      const healthyCount = healthMetrics.filter(
        (hm) => hm.status === 'healthy',
      ).length;
      return Math.round((healthyCount / healthMetrics.length) * 100);
    } catch (error) {
      console.error('Error calculating system health score:', error);
      return 0;
    }
  }

  private async verifyEmergencyOverridePermission(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data: userRole } = await this.supabase
        .from('user_organization_roles')
        .select('role, permissions')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single();

      if (!userRole) {
        return false;
      }

      // Admin and wedding day emergency roles can override
      return (
        ['ADMIN', 'WEDDING_DAY_EMERGENCY'].includes(userRole.role) ||
        userRole.permissions?.includes('emergency_override')
      );
    } catch (error) {
      console.error('Error verifying emergency override permission:', error);
      return false;
    }
  }

  private async sendEmergencyOverrideNotifications(
    organizationId: string,
    overrideId: string,
    override: EmergencyOverride,
    emergencyContact: any,
    expiresAt: Date,
  ): Promise<string[]> {
    try {
      const notificationsSent: string[] = [];

      // Would integrate with AlertManager for actual notifications
      console.log('Emergency override notification:', {
        overrideId,
        severity: override.severity_level,
        reason: override.override_reason,
        contact: emergencyContact.name,
        expiresAt,
      });

      notificationsSent.push('emergency_contact_sms');
      notificationsSent.push('team_slack_channel');

      if (override.stakeholder_notification) {
        notificationsSent.push('stakeholder_email');
      }

      return notificationsSent;
    } catch (error) {
      console.error('Failed to send emergency override notifications:', error);
      return [];
    }
  }

  private async sendEmergencyRollbackNotifications(
    organizationId: string,
    details: any,
  ): Promise<void> {
    try {
      console.log('Emergency rollback notification:', details);
      // Would integrate with AlertManager for actual notifications
    } catch (error) {
      console.error('Failed to send emergency rollback notifications:', error);
    }
  }

  private async logEmergencyEvent(
    organizationId: string,
    event: any,
  ): Promise<void> {
    try {
      await this.supabase.from('emergency_events').insert({
        organization_id: organizationId,
        event_type: event.event_type,
        severity: event.severity,
        user_id: event.user_id,
        event_data: {
          override_id: event.override_id,
          rollback_id: event.rollback_id,
          environment_id: event.environment_id,
          reason: event.reason,
          variables_restored: event.variables_restored,
          snapshot_id: event.snapshot_id,
          expires_at: event.expires_at,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log emergency event:', error);
    }
  }
}
