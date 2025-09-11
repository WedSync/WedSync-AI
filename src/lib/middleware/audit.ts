import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export interface AuditEvent {
  event_type: string;
  resource_type: string;
  resource_id?: string;
  user_id?: string;
  supplier_id?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Audit logging service for tracking sensitive operations
 */
export class AuditLogger {
  private supabase = createClient();

  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      const auditRecord = {
        id: crypto.randomUUID(),
        event_type: event.event_type,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        user_id: event.user_id,
        supplier_id: event.supplier_id,
        changes: event.changes ? JSON.stringify(event.changes) : null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        timestamp: new Date().toISOString(),
      };

      await this.supabase.from('audit_logs').insert(auditRecord);

      // Also log to application logs
      logger.info('Audit event logged', {
        event_type: event.event_type,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        user_id: event.user_id,
        supplier_id: event.supplier_id,
      });
    } catch (error) {
      logger.error('Failed to log audit event', {
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Log review campaign events
   */
  async logCampaignEvent(
    eventType: 'created' | 'updated' | 'activated' | 'paused' | 'deleted',
    campaignId: string,
    userId: string,
    supplierId: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: `campaign_${eventType}`,
      resource_type: 'review_campaign',
      resource_id: campaignId,
      user_id: userId,
      supplier_id: supplierId,
      changes,
      metadata,
    });
  }

  /**
   * Log review request events
   */
  async logRequestEvent(
    eventType: 'created' | 'sent' | 'opened' | 'completed' | 'expired',
    requestId: string,
    campaignId: string,
    userId?: string,
    supplierId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: `request_${eventType}`,
      resource_type: 'review_request',
      resource_id: requestId,
      user_id: userId,
      supplier_id: supplierId,
      metadata: {
        ...metadata,
        campaign_id: campaignId,
      },
    });
  }

  /**
   * Log review submission events
   */
  async logReviewEvent(
    eventType: 'submitted' | 'moderated' | 'published' | 'responded',
    reviewId: string,
    requestId: string,
    platform: string,
    userId?: string,
    supplierId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: `review_${eventType}`,
      resource_type: 'collected_review',
      resource_id: reviewId,
      user_id: userId,
      supplier_id: supplierId,
      metadata: {
        ...metadata,
        request_id: requestId,
        platform,
      },
    });
  }

  /**
   * Log platform integration events
   */
  async logPlatformEvent(
    eventType:
      | 'connected'
      | 'disconnected'
      | 'sync_started'
      | 'sync_completed'
      | 'sync_failed',
    platform: string,
    supplierId: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: `platform_${eventType}`,
      resource_type: 'platform_integration',
      resource_id: `${supplierId}_${platform}`,
      user_id: userId,
      supplier_id: supplierId,
      metadata: {
        ...metadata,
        platform,
      },
    });
  }

  /**
   * Log email events
   */
  async logEmailEvent(
    eventType:
      | 'sent'
      | 'delivered'
      | 'opened'
      | 'clicked'
      | 'bounced'
      | 'failed',
    emailType: string,
    recipientEmail: string,
    supplierId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: `email_${eventType}`,
      resource_type: 'email',
      resource_id: recipientEmail,
      supplier_id: supplierId,
      metadata: {
        ...metadata,
        email_type: emailType,
      },
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType:
      | 'auth_failed'
      | 'rate_limited'
      | 'csrf_blocked'
      | 'suspicious_activity',
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      event_type: `security_${eventType}`,
      resource_type: 'security',
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    });
  }

  /**
   * Get audit logs for a resource
   */
  async getResourceAuditLog(
    resourceType: string,
    resourceId: string,
    limit: number = 50,
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch audit logs', { error: error.message });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to fetch audit logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLog(userId: string, limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch user audit logs', {
          error: error.message,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to fetch user audit logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get audit logs for a supplier
   */
  async getSupplierAuditLog(
    supplierId: string,
    limit: number = 100,
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch supplier audit logs', {
          error: error.message,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to fetch supplier audit logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
