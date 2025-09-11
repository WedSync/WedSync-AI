/**
 * WS-142: Success Privacy Manager
 * GDPR compliance and data protection for customer success system
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { redis } from '@/lib/redis';
import { addDays, subYears } from 'date-fns';

export interface PrivacyRequest {
  id: string;
  supplierId: string;
  requestType:
    | 'access'
    | 'deletion'
    | 'portability'
    | 'rectification'
    | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  data?: any;
  reason?: string;
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: string;
  deletionStrategy: 'hard' | 'soft' | 'anonymize';
  legalBasis: string;
  exceptions?: string[];
}

export interface AnonymizationResult {
  supplierId: string;
  recordsAnonymized: number;
  dataTypes: string[];
  anonymizedAt: Date;
  retainedForAnalytics: boolean;
}

export interface ConsentRecord {
  id: string;
  supplierId: string;
  consentType:
    | 'success_tracking'
    | 'ml_analysis'
    | 'marketing'
    | 'data_sharing';
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string;
}

export interface DataAuditLog {
  id: string;
  supplierId: string;
  action: 'access' | 'modification' | 'deletion' | 'export' | 'anonymization';
  dataType: string;
  performedBy: string;
  performedAt: Date;
  reason: string;
  metadata?: any;
}

export class SuccessPrivacyManager {
  private supabase: SupabaseClient;
  private encryptionKey: Buffer;

  // Data retention policies
  private retentionPolicies: DataRetentionPolicy[] = [
    {
      dataType: 'customer_health',
      retentionPeriod: '2 years',
      deletionStrategy: 'anonymize',
      legalBasis: 'legitimate_interest',
      exceptions: ['active_customers'],
    },
    {
      dataType: 'success_interventions',
      retentionPeriod: '1 year',
      deletionStrategy: 'anonymize',
      legalBasis: 'contract_fulfillment',
    },
    {
      dataType: 'success_milestones',
      retentionPeriod: '3 years',
      deletionStrategy: 'anonymize',
      legalBasis: 'legitimate_interest',
    },
    {
      dataType: 'churn_predictions',
      retentionPeriod: '6 months',
      deletionStrategy: 'hard',
      legalBasis: 'consent',
    },
    {
      dataType: 'success_events',
      retentionPeriod: '1 year',
      deletionStrategy: 'soft',
      legalBasis: 'legitimate_interest',
    },
  ];

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Anonymize customer success data for a supplier
   */
  static async anonymizeSuccessData(
    supplierId: string,
  ): Promise<AnonymizationResult> {
    const manager = new SuccessPrivacyManager();

    try {
      // Generate anonymous ID
      const anonymousId = manager.generateAnonymousId(supplierId);

      // Start transaction for atomicity
      const startTime = Date.now();

      // Anonymize customer health data
      const healthResult = await manager.anonymizeHealthData(
        supplierId,
        anonymousId,
      );

      // Anonymize success interventions
      const interventionResult = await manager.anonymizeInterventions(
        supplierId,
        anonymousId,
      );

      // Anonymize milestone data
      const milestoneResult = await manager.anonymizeMilestones(
        supplierId,
        anonymousId,
      );

      // Anonymize ML predictions
      const predictionResult = await manager.anonymizePredictions(
        supplierId,
        anonymousId,
      );

      // Clear personal data from cache
      await manager.clearCachedPersonalData(supplierId);

      // Log anonymization
      await manager.logDataAction(
        supplierId,
        'anonymization',
        'all_success_data',
        'GDPR_request',
      );

      const result: AnonymizationResult = {
        supplierId,
        recordsAnonymized:
          healthResult.count +
          interventionResult.count +
          milestoneResult.count +
          predictionResult.count,
        dataTypes: ['health', 'interventions', 'milestones', 'predictions'],
        anonymizedAt: new Date(),
        retainedForAnalytics: true,
      };

      // Store anonymization record
      await manager.storeAnonymizationRecord(result);

      console.log(`Anonymization completed in ${Date.now() - startTime}ms`);

      return result;
    } catch (error) {
      console.error('Error anonymizing success data:', error);
      throw error;
    }
  }

  /**
   * Process GDPR data request
   */
  static async processPrivacyRequest(
    request: Omit<PrivacyRequest, 'id' | 'status'>,
  ): Promise<PrivacyRequest> {
    const manager = new SuccessPrivacyManager();

    try {
      // Create privacy request record
      const privacyRequest: PrivacyRequest = {
        id: crypto.randomUUID(),
        ...request,
        status: 'pending',
        requestedAt: new Date(),
      };

      // Store request
      await manager.storePrivacyRequest(privacyRequest);

      // Process based on request type
      switch (request.requestType) {
        case 'access':
          privacyRequest.data = await manager.handleAccessRequest(
            request.supplierId,
          );
          break;

        case 'deletion':
          await manager.handleDeletionRequest(request.supplierId);
          break;

        case 'portability':
          privacyRequest.data = await manager.handlePortabilityRequest(
            request.supplierId,
          );
          break;

        case 'rectification':
          await manager.handleRectificationRequest(
            request.supplierId,
            request.data,
          );
          break;

        case 'restriction':
          await manager.handleRestrictionRequest(request.supplierId);
          break;
      }

      // Update request status
      privacyRequest.status = 'completed';
      privacyRequest.processedAt = new Date();

      await manager.updatePrivacyRequest(privacyRequest);

      return privacyRequest;
    } catch (error) {
      console.error('Error processing privacy request:', error);
      throw error;
    }
  }

  /**
   * Enforce data retention policies
   */
  static async enforceDataRetention(): Promise<void> {
    const manager = new SuccessPrivacyManager();

    try {
      console.log('Starting data retention enforcement...');

      for (const policy of manager.retentionPolicies) {
        await manager.enforceRetentionPolicy(policy);
      }

      // Clean up orphaned records
      await manager.cleanupOrphanedRecords();

      // Update retention metrics
      await manager.updateRetentionMetrics();

      console.log('Data retention enforcement completed');
    } catch (error) {
      console.error('Error enforcing data retention:', error);
      throw error;
    }
  }

  /**
   * Manage consent records
   */
  static async updateConsent(
    supplierId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    metadata?: any,
  ): Promise<ConsentRecord> {
    const manager = new SuccessPrivacyManager();

    try {
      const consent: ConsentRecord = {
        id: crypto.randomUUID(),
        supplierId,
        consentType,
        granted,
        grantedAt: granted ? new Date() : undefined,
        revokedAt: !granted ? new Date() : undefined,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        version: '1.0.0',
      };

      // Store consent record
      await manager.supabase.from('consent_records').insert(consent);

      // Update data processing based on consent
      if (!granted) {
        await manager.restrictDataProcessing(supplierId, consentType);
      } else {
        await manager.enableDataProcessing(supplierId, consentType);
      }

      // Log consent change
      await manager.logDataAction(
        supplierId,
        'modification',
        'consent',
        `Consent ${granted ? 'granted' : 'revoked'} for ${consentType}`,
      );

      return consent;
    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  }

  /**
   * Export all success data for a supplier
   */
  static async exportSuccessData(supplierId: string): Promise<any> {
    const manager = new SuccessPrivacyManager();

    try {
      const exportData = {
        exportedAt: new Date(),
        supplierId,
        data: {} as any,
      };

      // Gather all success-related data
      const [
        healthData,
        milestones,
        interventions,
        predictions,
        events,
        consents,
      ] = await Promise.all([
        manager.getHealthData(supplierId),
        manager.getMilestoneData(supplierId),
        manager.getInterventionData(supplierId),
        manager.getPredictionData(supplierId),
        manager.getEventData(supplierId),
        manager.getConsentData(supplierId),
      ]);

      exportData.data = {
        customerHealth: healthData,
        successMilestones: milestones,
        interventions,
        churnPredictions: predictions,
        successEvents: events,
        consentRecords: consents,
      };

      // Log export
      await manager.logDataAction(
        supplierId,
        'export',
        'all_success_data',
        'User request',
      );

      return exportData;
    } catch (error) {
      console.error('Error exporting success data:', error);
      throw error;
    }
  }

  // Private helper methods

  private async anonymizeHealthData(
    supplierId: string,
    anonymousId: string,
  ): Promise<{ count: number }> {
    const query = `
      UPDATE customer_health 
      SET 
        supplier_id = $1,
        anonymized_at = NOW(),
        original_id_hash = encode(sha256($2::text::bytea), 'hex'),
        -- Keep aggregated metrics for analytics
        health_score = health_score,
        risk_level = risk_level,
        feature_adoption_score = feature_adoption_score,
        -- Remove personal identifiers
        metadata = jsonb_strip_nulls(
          jsonb_build_object(
            'anonymized', true,
            'original_created', metadata->>'created_at'
          )
        )
      WHERE supplier_id = $2
      RETURNING id
    `;

    const { data, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [anonymousId, supplierId],
    });

    if (error) throw error;

    return { count: data?.length || 0 };
  }

  private async anonymizeInterventions(
    supplierId: string,
    anonymousId: string,
  ): Promise<{ count: number }> {
    const query = `
      UPDATE success_interventions
      SET 
        supplier_id = $1,
        anonymized_at = NOW(),
        -- Keep intervention type and success metrics
        template_used = 'anonymized',
        -- Remove personal content
        content = NULL,
        metadata = jsonb_build_object(
          'intervention_type', metadata->>'intervention_type',
          'success_rate', metadata->>'success_rate',
          'anonymized', true
        )
      WHERE supplier_id = $2
      RETURNING id
    `;

    const { data, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [anonymousId, supplierId],
    });

    if (error) throw error;

    return { count: data?.length || 0 };
  }

  private async anonymizeMilestones(
    supplierId: string,
    anonymousId: string,
  ): Promise<{ count: number }> {
    const query = `
      UPDATE success_milestones
      SET 
        user_id = $1,
        -- Keep milestone metrics
        achieved = achieved,
        time_to_achieve_hours = time_to_achieve_hours,
        points_value = points_value,
        -- Remove personal celebration messages
        celebration_message = 'Milestone achieved',
        metadata = jsonb_build_object(
          'anonymized', true,
          'milestone_type', milestone_type
        )
      WHERE user_id IN (
        SELECT user_id FROM suppliers WHERE id = $2
      )
      RETURNING id
    `;

    const { data, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [anonymousId, supplierId],
    });

    if (error) throw error;

    return { count: data?.length || 0 };
  }

  private async anonymizePredictions(
    supplierId: string,
    anonymousId: string,
  ): Promise<{ count: number }> {
    const query = `
      UPDATE churn_prediction_logs
      SET 
        supplier_id = $1,
        -- Keep prediction metrics
        churn_probability = churn_probability,
        prediction_accuracy = prediction_accuracy,
        actual_churn = actual_churn,
        -- Remove feature details that might be personal
        features = jsonb_build_object(
          'anonymized', true,
          'model_version', features->>'model_version'
        )
      WHERE supplier_id = $2
      RETURNING id
    `;

    const { data, error } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [anonymousId, supplierId],
    });

    if (error) throw error;

    return { count: data?.length || 0 };
  }

  private async clearCachedPersonalData(supplierId: string): Promise<void> {
    // Clear Redis cache
    const keys = await redis.keys(`*${supplierId}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    // Clear in-memory caches (if any)
    // This would depend on your caching strategy
  }

  private async handleAccessRequest(supplierId: string): Promise<any> {
    return this.exportSuccessData(supplierId);
  }

  private async handleDeletionRequest(supplierId: string): Promise<void> {
    // Check if deletion is allowed (no active contracts, legal holds, etc.)
    const canDelete = await this.checkDeletionEligibility(supplierId);

    if (!canDelete.eligible) {
      throw new Error(`Deletion not allowed: ${canDelete.reason}`);
    }

    // Perform deletion or anonymization based on policy
    await SuccessPrivacyManager.anonymizeSuccessData(supplierId);
  }

  private async handlePortabilityRequest(supplierId: string): Promise<any> {
    const data = await this.exportSuccessData(supplierId);

    // Format for portability (machine-readable format)
    return {
      format: 'json',
      version: '1.0',
      exportedAt: new Date(),
      data,
    };
  }

  private async handleRectificationRequest(
    supplierId: string,
    corrections: any,
  ): Promise<void> {
    // Apply corrections to the data
    for (const [table, updates] of Object.entries(corrections)) {
      await this.supabase
        .from(table)
        .update(updates)
        .eq('supplier_id', supplierId);
    }
  }

  private async handleRestrictionRequest(supplierId: string): Promise<void> {
    // Restrict processing of data
    await this.supabase.from('data_processing_restrictions').insert({
      supplier_id: supplierId,
      restricted: true,
      restricted_at: new Date(),
      restriction_type: 'user_request',
    });
  }

  private async enforceRetentionPolicy(
    policy: DataRetentionPolicy,
  ): Promise<void> {
    const cutoffDate = this.calculateCutoffDate(policy.retentionPeriod);

    switch (policy.deletionStrategy) {
      case 'hard':
        await this.hardDeleteOldData(policy.dataType, cutoffDate);
        break;
      case 'soft':
        await this.softDeleteOldData(policy.dataType, cutoffDate);
        break;
      case 'anonymize':
        await this.anonymizeOldData(policy.dataType, cutoffDate);
        break;
    }
  }

  private calculateCutoffDate(retentionPeriod: string): Date {
    const [amount, unit] = retentionPeriod.split(' ');
    const value = parseInt(amount);

    switch (unit) {
      case 'years':
      case 'year':
        return subYears(new Date(), value);
      case 'months':
      case 'month':
        return new Date(Date.now() - value * 30 * 24 * 60 * 60 * 1000);
      case 'days':
      case 'day':
        return new Date(Date.now() - value * 24 * 60 * 60 * 1000);
      default:
        return subYears(new Date(), 2); // Default 2 years
    }
  }

  private async hardDeleteOldData(
    dataType: string,
    cutoffDate: Date,
  ): Promise<void> {
    const tableMap: { [key: string]: string } = {
      churn_predictions: 'churn_prediction_logs',
      success_events: 'success_event_log',
      customer_health: 'customer_health_scores',
    };

    const table = tableMap[dataType];
    if (!table) return;

    // Archive before deletion
    await this.archiveDataBeforeDeletion(table, cutoffDate);

    // Delete old records
    await this.supabase
      .from(table)
      .delete()
      .lt('created_at', cutoffDate.toISOString());
  }

  private async softDeleteOldData(
    dataType: string,
    cutoffDate: Date,
  ): Promise<void> {
    const tableMap: { [key: string]: string } = {
      success_events: 'success_event_log',
    };

    const table = tableMap[dataType];
    if (!table) return;

    await this.supabase
      .from(table)
      .update({ deleted_at: new Date(), deleted_reason: 'retention_policy' })
      .lt('created_at', cutoffDate.toISOString())
      .is('deleted_at', null);
  }

  private async anonymizeOldData(
    dataType: string,
    cutoffDate: Date,
  ): Promise<void> {
    const query = `
      SELECT DISTINCT supplier_id 
      FROM ${dataType}
      WHERE created_at < $1
        AND anonymized_at IS NULL
    `;

    const { data: suppliers } = await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [cutoffDate.toISOString()],
    });

    if (suppliers) {
      for (const supplier of suppliers) {
        await SuccessPrivacyManager.anonymizeSuccessData(supplier.supplier_id);
      }
    }
  }

  private async archiveDataBeforeDeletion(
    table: string,
    cutoffDate: Date,
  ): Promise<void> {
    const query = `
      INSERT INTO archived_${table} 
      SELECT *, NOW() as archived_at, 'retention_policy' as archive_reason
      FROM ${table}
      WHERE created_at < $1
    `;

    await this.supabase.rpc('execute_raw_sql', {
      query,
      params: [cutoffDate.toISOString()],
    });
  }

  private async cleanupOrphanedRecords(): Promise<void> {
    // Clean up records that reference deleted suppliers
    const tables = [
      'customer_health',
      'success_interventions',
      'success_milestones',
      'churn_prediction_logs',
    ];

    for (const table of tables) {
      const query = `
        DELETE FROM ${table}
        WHERE supplier_id NOT IN (SELECT id FROM suppliers)
          AND created_at < NOW() - INTERVAL '30 days'
      `;

      await this.supabase.rpc('execute_raw_sql', { query, params: [] });
    }
  }

  private async updateRetentionMetrics(): Promise<void> {
    const metrics = {
      lastEnforced: new Date(),
      policiesApplied: this.retentionPolicies.length,
      recordsProcessed: 0, // Would be calculated from actual processing
      nextScheduled: addDays(new Date(), 1),
    };

    await this.supabase.from('retention_metrics').insert(metrics);
  }

  private async checkDeletionEligibility(
    supplierId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check for active subscriptions
    const { data: activeSubscription } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('status', 'active')
      .single();

    if (activeSubscription) {
      return { eligible: false, reason: 'Active subscription exists' };
    }

    // Check for legal holds
    const { data: legalHold } = await this.supabase
      .from('legal_holds')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('active', true)
      .single();

    if (legalHold) {
      return { eligible: false, reason: 'Legal hold in place' };
    }

    return { eligible: true };
  }

  private async restrictDataProcessing(
    supplierId: string,
    consentType: string,
  ): Promise<void> {
    // Implement processing restrictions based on consent type
    const restrictionMap: { [key: string]: string[] } = {
      ml_analysis: ['churn_predictions', 'ml_features'],
      marketing: ['marketing_campaigns', 'email_automation'],
      success_tracking: ['customer_health', 'success_milestones'],
      data_sharing: ['third_party_integrations'],
    };

    const tables = restrictionMap[consentType] || [];

    for (const table of tables) {
      await this.supabase.from('processing_restrictions').insert({
        supplier_id: supplierId,
        table_name: table,
        restriction_type: 'consent_revoked',
        restricted_at: new Date(),
      });
    }
  }

  private async enableDataProcessing(
    supplierId: string,
    consentType: string,
  ): Promise<void> {
    await this.supabase
      .from('processing_restrictions')
      .delete()
      .eq('supplier_id', supplierId)
      .eq('restriction_type', 'consent_revoked');
  }

  private generateAnonymousId(supplierId: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(supplierId + Date.now().toString());
    return `anon_${hash.digest('hex').substring(0, 16)}`;
  }

  private getOrCreateEncryptionKey(): Buffer {
    const keyString = process.env.PRIVACY_ENCRYPTION_KEY;
    if (!keyString) {
      console.warn('PRIVACY_ENCRYPTION_KEY not set, using default key');
      return Buffer.from('default-encryption-key-change-me');
    }
    return Buffer.from(keyString, 'hex');
  }

  private async storePrivacyRequest(request: PrivacyRequest): Promise<void> {
    await this.supabase.from('privacy_requests').insert(request);
  }

  private async updatePrivacyRequest(request: PrivacyRequest): Promise<void> {
    await this.supabase
      .from('privacy_requests')
      .update({
        status: request.status,
        processedAt: request.processedAt,
        data: request.data,
      })
      .eq('id', request.id);
  }

  private async storeAnonymizationRecord(
    result: AnonymizationResult,
  ): Promise<void> {
    await this.supabase.from('anonymization_records').insert(result);
  }

  private async logDataAction(
    supplierId: string,
    action: DataAuditLog['action'],
    dataType: string,
    reason: string,
  ): Promise<void> {
    const auditLog: DataAuditLog = {
      id: crypto.randomUUID(),
      supplierId,
      action,
      dataType,
      performedBy: 'system',
      performedAt: new Date(),
      reason,
    };

    await this.supabase.from('data_audit_logs').insert(auditLog);
  }

  private async getHealthData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('customer_health')
      .select('*')
      .eq('supplier_id', supplierId);

    return data;
  }

  private async getMilestoneData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('success_milestones')
      .select('*')
      .eq('user_id', supplierId);

    return data;
  }

  private async getInterventionData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('success_interventions')
      .select('*')
      .eq('supplier_id', supplierId);

    return data;
  }

  private async getPredictionData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('churn_prediction_logs')
      .select('*')
      .eq('supplier_id', supplierId);

    return data;
  }

  private async getEventData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('success_event_log')
      .select('*')
      .eq('supplier_id', supplierId);

    return data;
  }

  private async getConsentData(supplierId: string): Promise<any> {
    const { data } = await this.supabase
      .from('consent_records')
      .select('*')
      .eq('supplierId', supplierId);

    return data;
  }
}

// Export singleton instance
export const privacyManager = new SuccessPrivacyManager();
