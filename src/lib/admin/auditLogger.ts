import { createClient } from '@/lib/supabase/server';

export interface AdminAuditEntry {
  adminId: string;
  adminEmail: string;
  action: string;
  status: 'success' | 'failed' | 'error';
  details: Record<string, any>;
  timestamp: string;
  clientIP: string;
  requiresMFA: boolean;
  userAgent?: string;
}

export interface AuditQueryOptions {
  adminId?: string;
  action?: string;
  status?: 'success' | 'failed' | 'error';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

class AdminAuditLogger {
  private supabase = createClient();

  async logAction(entry: AdminAuditEntry): Promise<void> {
    try {
      const auditEntry = {
        admin_id: entry.adminId,
        admin_email: entry.adminEmail,
        action: entry.action,
        status: entry.status,
        details: entry.details,
        timestamp: entry.timestamp,
        client_ip: entry.clientIP,
        requires_mfa: entry.requiresMFA,
        user_agent: entry.userAgent || null,
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('admin_audit_log')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to log admin audit entry:', error);
        // Fallback to console logging if database fails
        console.warn(
          'AUDIT LOG (DB FAILED):',
          JSON.stringify(auditEntry, null, 2),
        );
      }
    } catch (error) {
      console.error('Error in audit logger:', error);
      // Fallback logging
      console.warn('AUDIT LOG (ERROR):', JSON.stringify(entry, null, 2));
    }
  }

  async getAuditEntries(
    options: AuditQueryOptions = {},
  ): Promise<AdminAuditEntry[]> {
    try {
      let query = this.supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.adminId) {
        query = query.eq('admin_id', options.adminId);
      }
      if (options.action) {
        query = query.eq('action', options.action);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.startDate) {
        query = query.gte('timestamp', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('timestamp', options.endDate);
      }

      // Apply pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch audit entries:', error);
        return [];
      }

      return (
        data?.map((entry) => ({
          adminId: entry.admin_id,
          adminEmail: entry.admin_email,
          action: entry.action,
          status: entry.status,
          details: entry.details || {},
          timestamp: entry.timestamp,
          clientIP: entry.client_ip,
          requiresMFA: entry.requires_mfa,
          userAgent: entry.user_agent,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching audit entries:', error);
      return [];
    }
  }

  async getAuditSummary(days: number = 7): Promise<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    mfaRequiredActions: number;
    topActions: Array<{ action: string; count: number }>;
    topAdmins: Array<{ adminEmail: string; count: number }>;
  }> {
    try {
      const startDate = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Get total counts
      const { count: totalActions } = await this.supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', startDate);

      const { count: successfulActions } = await this.supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .gte('timestamp', startDate);

      const { count: failedActions } = await this.supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .in('status', ['failed', 'error'])
        .gte('timestamp', startDate);

      const { count: mfaRequiredActions } = await this.supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('requires_mfa', true)
        .gte('timestamp', startDate);

      // Get top actions - this would need a more complex query in a real implementation
      // For now, we'll get recent actions and aggregate manually
      const { data: recentActions } = await this.supabase
        .from('admin_audit_log')
        .select('action')
        .gte('timestamp', startDate)
        .limit(1000);

      const actionCounts: Record<string, number> = {};
      recentActions?.forEach((entry) => {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      });

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      // Get top admins
      const { data: recentAdmins } = await this.supabase
        .from('admin_audit_log')
        .select('admin_email')
        .gte('timestamp', startDate)
        .limit(1000);

      const adminCounts: Record<string, number> = {};
      recentAdmins?.forEach((entry) => {
        adminCounts[entry.admin_email] =
          (adminCounts[entry.admin_email] || 0) + 1;
      });

      const topAdmins = Object.entries(adminCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([adminEmail, count]) => ({ adminEmail, count }));

      return {
        totalActions: totalActions || 0,
        successfulActions: successfulActions || 0,
        failedActions: failedActions || 0,
        mfaRequiredActions: mfaRequiredActions || 0,
        topActions,
        topAdmins,
      };
    } catch (error) {
      console.error('Error getting audit summary:', error);
      return {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        mfaRequiredActions: 0,
        topActions: [],
        topAdmins: [],
      };
    }
  }

  async createAuditAlert(
    message: string,
    type: 'security' | 'suspicious' | 'violation',
    details: Record<string, any> = {},
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('system_alerts').insert({
        type: 'error',
        category: 'audit',
        message,
        details: {
          audit_type: type,
          ...details,
        },
        acknowledged: false,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to create audit alert:', error);
      }
    } catch (error) {
      console.error('Error creating audit alert:', error);
    }
  }

  async logSecurityViolation(
    adminId: string,
    adminEmail: string,
    violation: string,
    details: Record<string, any>,
    clientIP: string,
  ): Promise<void> {
    await this.logAction({
      adminId,
      adminEmail,
      action: 'security_violation',
      status: 'failed',
      details: {
        violation,
        ...details,
      },
      timestamp: new Date().toISOString(),
      clientIP,
      requiresMFA: false,
    });

    await this.createAuditAlert(
      `Security violation detected: ${violation}`,
      'violation',
      {
        admin_id: adminId,
        admin_email: adminEmail,
        client_ip: clientIP,
        violation_details: details,
      },
    );
  }

  async logMfaFailure(
    adminId: string,
    adminEmail: string,
    action: string,
    clientIP: string,
    attempts: number = 1,
  ): Promise<void> {
    await this.logAction({
      adminId,
      adminEmail,
      action: 'mfa_failure',
      status: 'failed',
      details: {
        attempted_action: action,
        failure_count: attempts,
      },
      timestamp: new Date().toISOString(),
      clientIP,
      requiresMFA: true,
    });

    if (attempts >= 3) {
      await this.createAuditAlert(
        `Multiple MFA failures detected for admin ${adminEmail}`,
        'security',
        {
          admin_id: adminId,
          admin_email: adminEmail,
          client_ip: clientIP,
          failure_count: attempts,
        },
      );
    }
  }

  async cleanupOldEntries(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(
        Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error } = await this.supabase
        .from('admin_audit_log')
        .delete()
        .lt('created_at', cutoffDate);

      if (error) {
        console.error('Failed to cleanup old audit entries:', error);
      } else {
        console.log(`Cleaned up audit entries older than ${daysToKeep} days`);
      }
    } catch (error) {
      console.error('Error cleaning up audit entries:', error);
    }
  }
}

export const adminAuditLogger = new AdminAuditLogger();
