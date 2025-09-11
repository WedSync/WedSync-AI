/**
 * WS-175 Advanced Data Encryption - Security Audit Logger
 * Team B - Round 1 Implementation
 *
 * Security audit logging for encryption operations
 * GDPR compliance and threat detection
 */

import { SecurityAuditEvent } from '../../types/encryption';
import { createClient } from '../supabase/server';

export class SecurityAuditLogger {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Log a security audit event to the database
   * Following GDPR Article 30 - Records of processing activities
   */
  async log(event: SecurityAuditEvent): Promise<void> {
    try {
      // Sanitize sensitive data before logging
      const sanitizedEvent = this.sanitizeEvent(event);

      // Insert audit event into database
      const { error } = await this.supabase.from('encryption_audit').insert({
        id: sanitizedEvent.id,
        action: sanitizedEvent.action,
        user_id: sanitizedEvent.userId,
        field_type: sanitizedEvent.fieldType,
        key_id: sanitizedEvent.keyId,
        success: sanitizedEvent.success,
        timestamp: sanitizedEvent.timestamp.toISOString(),
        ip_address: sanitizedEvent.ipAddress,
        user_agent: sanitizedEvent.userAgent
          ? this.sanitizeUserAgent(sanitizedEvent.userAgent)
          : undefined,
        error_message: sanitizedEvent.errorMessage
          ? this.sanitizeErrorMessage(sanitizedEvent.errorMessage)
          : undefined,
        metadata: sanitizedEvent.metadata,
      });

      if (error) {
        // Log to console as fallback, but don't throw to avoid breaking encryption operations
        console.error('Failed to log security audit event:', {
          eventId: event.id,
          action: event.action,
          userId: event.userId,
          error: error.message,
        });

        // Could also send to external monitoring service here
        await this.sendToExternalMonitoring(sanitizedEvent, error);
      }
    } catch (error) {
      // Fallback logging - critical for security compliance
      console.error('Critical: Security audit logging failed:', {
        eventId: event.id,
        action: event.action,
        userId: event.userId,
        timestamp: event.timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Don't throw to avoid breaking encryption operations
    }
  }

  /**
   * Log multiple events in batch for performance
   */
  async logBatch(events: SecurityAuditEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const sanitizedEvents = events.map((event) => ({
        id: event.id,
        action: event.action,
        user_id: event.userId,
        field_type: event.fieldType,
        key_id: event.keyId,
        success: event.success,
        timestamp: event.timestamp.toISOString(),
        ip_address: event.ipAddress,
        user_agent: event.userAgent
          ? this.sanitizeUserAgent(event.userAgent)
          : undefined,
        error_message: event.errorMessage
          ? this.sanitizeErrorMessage(event.errorMessage)
          : undefined,
        metadata: event.metadata,
      }));

      const { error } = await this.supabase
        .from('encryption_audit')
        .insert(sanitizedEvents);

      if (error) {
        console.error('Failed to log batch security audit events:', {
          eventsCount: events.length,
          error: error.message,
        });

        // Fallback to individual logging
        for (const event of events) {
          await this.log(event);
        }
      }
    } catch (error) {
      console.error('Critical: Batch security audit logging failed:', {
        eventsCount: events.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Query audit events for compliance reporting
   */
  async queryEvents(criteria: {
    userId?: string;
    action?: string;
    dateRange?: { from: Date; to: Date };
    success?: boolean;
    limit?: number;
  }): Promise<SecurityAuditEvent[]> {
    try {
      let query = this.supabase.from('encryption_audit').select('*');

      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }

      if (criteria.action) {
        query = query.eq('action', criteria.action);
      }

      if (criteria.success !== undefined) {
        query = query.eq('success', criteria.success);
      }

      if (criteria.dateRange) {
        query = query
          .gte('timestamp', criteria.dateRange.from.toISOString())
          .lte('timestamp', criteria.dateRange.to.toISOString());
      }

      if (criteria.limit) {
        query = query.limit(criteria.limit);
      }

      query = query.order('timestamp', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to query audit events: ${error.message}`);
      }

      return (data || []).map((row) => ({
        id: row.id,
        action: row.action,
        userId: row.user_id,
        fieldType: row.field_type,
        keyId: row.key_id,
        success: row.success,
        timestamp: new Date(row.timestamp),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        errorMessage: row.error_message,
        metadata: row.metadata,
      }));
    } catch (error) {
      console.error('Failed to query security audit events:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics for compliance dashboards
   */
  async getAuditStatistics(dateRange: { from: Date; to: Date }): Promise<{
    totalEvents: number;
    successfulOperations: number;
    failedOperations: number;
    encryptionEvents: number;
    decryptionEvents: number;
    keyRotationEvents: number;
    gdprEvents: number;
    suspiciousActivity: number;
  }> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_encryption_audit_statistics',
        {
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString(),
        },
      );

      if (error) {
        throw new Error(`Failed to get audit statistics: ${error.message}`);
      }

      return (
        data || {
          totalEvents: 0,
          successfulOperations: 0,
          failedOperations: 0,
          encryptionEvents: 0,
          decryptionEvents: 0,
          keyRotationEvents: 0,
          gdprEvents: 0,
          suspiciousActivity: 0,
        }
      );
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(): Promise<
    Array<{
      userId: string;
      pattern: string;
      risk: 'low' | 'medium' | 'high';
      description: string;
      lastSeen: Date;
    }>
  > {
    try {
      // Query for suspicious patterns in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const events = await this.queryEvents({
        dateRange: { from: yesterday, to: new Date() },
        limit: 10000,
      });

      const suspiciousPatterns = [];
      const userActivity = new Map<string, SecurityAuditEvent[]>();

      // Group events by user
      for (const event of events) {
        if (!userActivity.has(event.userId)) {
          userActivity.set(event.userId, []);
        }
        userActivity.get(event.userId)!.push(event);
      }

      // Analyze patterns for each user
      for (const [userId, userEvents] of Array.from(userActivity)) {
        // Pattern 1: High failure rate
        const failedEvents = userEvents.filter((e) => !e.success);
        if (
          failedEvents.length > 10 &&
          failedEvents.length / userEvents.length > 0.5
        ) {
          suspiciousPatterns.push({
            userId,
            pattern: 'HIGH_FAILURE_RATE',
            risk: 'high' as const,
            description: `${failedEvents.length} failed operations out of ${userEvents.length} total`,
            lastSeen: new Date(
              Math.max(...failedEvents.map((e) => e.timestamp.getTime())),
            ),
          });
        }

        // Pattern 2: Bulk decryption activity
        const decryptionEvents = userEvents.filter(
          (e) => e.action === 'FIELD_DECRYPTED',
        );
        if (decryptionEvents.length > 100) {
          suspiciousPatterns.push({
            userId,
            pattern: 'BULK_DECRYPTION',
            risk: 'medium' as const,
            description: `${decryptionEvents.length} decryption operations in 24 hours`,
            lastSeen: new Date(
              Math.max(...decryptionEvents.map((e) => e.timestamp.getTime())),
            ),
          });
        }

        // Pattern 3: Unusual hours access
        const nightTimeEvents = userEvents.filter((e) => {
          const hour = e.timestamp.getHours();
          return hour < 6 || hour > 22; // Between 10 PM and 6 AM
        });
        if (nightTimeEvents.length > 5) {
          suspiciousPatterns.push({
            userId,
            pattern: 'OFF_HOURS_ACCESS',
            risk: 'low' as const,
            description: `${nightTimeEvents.length} operations during off hours`,
            lastSeen: new Date(
              Math.max(...nightTimeEvents.map((e) => e.timestamp.getTime())),
            ),
          });
        }
      }

      return suspiciousPatterns;
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
      return [];
    }
  }

  // Private helper methods

  private sanitizeEvent(event: SecurityAuditEvent): SecurityAuditEvent {
    return {
      ...event,
      // Remove any PII from metadata
      metadata: event.metadata
        ? this.sanitizeMetadata(event.metadata)
        : undefined,
    };
  }

  private sanitizeMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized = { ...metadata };

    // Remove potential PII fields
    const piiFields = [
      'email',
      'phone',
      'ssn',
      'creditCard',
      'password',
      'token',
    ];
    for (const field of piiFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeUserAgent(userAgent: string): string {
    // Keep general browser info but remove detailed version info
    return userAgent.substring(0, 200).replace(/[\d.]+/g, 'x.x');
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive data from error messages
    return message
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL_REDACTED]',
      )
      .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD_REDACTED]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]')
      .substring(0, 500); // Limit length
  }

  private async sendToExternalMonitoring(
    event: SecurityAuditEvent,
    error: any,
  ): Promise<void> {
    // Placeholder for external monitoring integration
    // Could integrate with DataDog, Sentry, etc.
    try {
      // Example: Send critical security events to external monitoring
      if (event.action.includes('UNAUTHORIZED') || !event.success) {
        // External monitoring service call would go here
        console.warn('Security event requires external monitoring:', {
          eventId: event.id,
          action: event.action,
          timestamp: event.timestamp,
        });
      }
    } catch {
      // Silently fail external monitoring to not impact core functionality
    }
  }
}
