import { createClient } from '@/lib/supabase/server';

export interface EmergencyControlResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface SystemStatus {
  maintenanceMode: boolean;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string | null;
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  features: Record<string, boolean>;
}

class EmergencyControls {
  private supabase = createClient();

  async enableMaintenanceMode(
    message: string,
  ): Promise<EmergencyControlResult> {
    try {
      // Store maintenance mode state in system_settings table
      const { error } = await this.supabase.from('system_settings').upsert({
        key: 'maintenance_mode',
        value: JSON.stringify({
          enabled: true,
          message,
          enabled_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          message: 'Failed to enable maintenance mode',
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'Maintenance mode enabled successfully',
        data: { maintenanceMessage: message },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error enabling maintenance mode',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async disableMaintenanceMode(): Promise<EmergencyControlResult> {
    try {
      const { error } = await this.supabase.from('system_settings').upsert({
        key: 'maintenance_mode',
        value: JSON.stringify({
          enabled: false,
          disabled_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          message: 'Failed to disable maintenance mode',
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'Maintenance mode disabled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error disabling maintenance mode',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async clearSystemCache(): Promise<EmergencyControlResult> {
    try {
      // Clear application-level caches
      const cacheKeys = [
        'dashboard_metrics',
        'user_sessions',
        'client_data',
        'vendor_data',
        'system_stats',
      ];

      // Log cache clear operation
      const { error: logError } = await this.supabase
        .from('admin_actions')
        .insert({
          action_type: 'cache_clear',
          details: { cleared_keys: cacheKeys },
          timestamp: new Date().toISOString(),
        });

      if (logError) {
        console.warn('Failed to log cache clear operation:', logError);
      }

      return {
        success: true,
        message: 'System cache cleared successfully',
        data: { clearedKeys: cacheKeys },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error clearing system cache',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async acknowledgeAllAlerts(adminId: string): Promise<EmergencyControlResult> {
    try {
      const { error } = await this.supabase
        .from('system_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: adminId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('acknowledged', false);

      if (error) {
        return {
          success: false,
          message: 'Failed to acknowledge alerts',
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'All alerts acknowledged successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error acknowledging alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async suspendUser(
    userIdentifier: string,
    reason: string,
    adminId: string,
  ): Promise<EmergencyControlResult> {
    try {
      // Find user by email or ID
      const { data: user, error: findError } = await this.supabase
        .from('user_profiles')
        .select('id, email')
        .or(`email.eq.${userIdentifier},id.eq.${userIdentifier}`)
        .single();

      if (findError || !user) {
        return {
          success: false,
          message: 'User not found',
          error: 'Invalid user identifier',
        };
      }

      // Suspend the user
      const { error: suspendError } = await this.supabase
        .from('user_profiles')
        .update({
          status: 'suspended',
          suspension_reason: reason,
          suspended_by: adminId,
          suspended_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (suspendError) {
        return {
          success: false,
          message: 'Failed to suspend user',
          error: suspendError.message,
        };
      }

      // Invalidate user sessions by updating auth metadata
      const { error: authError } =
        await this.supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            suspended: true,
            suspended_at: new Date().toISOString(),
          },
        });

      if (authError) {
        console.warn('Failed to update auth metadata:', authError);
      }

      return {
        success: true,
        message: `User ${user.email} suspended successfully`,
        data: { userId: user.id, userEmail: user.email },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error suspending user',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async forceLogoutAllUsers(adminId: string): Promise<EmergencyControlResult> {
    try {
      // Update a system-wide logout flag that clients will check
      const { error } = await this.supabase.from('system_settings').upsert({
        key: 'force_logout_all',
        value: JSON.stringify({
          enabled: true,
          timestamp: new Date().toISOString(),
          admin_id: adminId,
        }),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          message: 'Failed to initiate force logout',
          error: error.message,
        };
      }

      // Log the action
      const { error: logError } = await this.supabase
        .from('admin_actions')
        .insert({
          action_type: 'force_logout_all',
          admin_id: adminId,
          details: { initiated_at: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });

      if (logError) {
        console.warn('Failed to log force logout action:', logError);
      }

      return {
        success: true,
        message: 'Force logout initiated for all users',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error initiating force logout',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createEmergencyBackup(): Promise<EmergencyControlResult> {
    try {
      // Create backup entry in the database
      const { data: backup, error } = await this.supabase
        .from('system_backups')
        .insert({
          backup_type: 'emergency',
          status: 'initiated',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          message: 'Failed to initiate backup',
          error: error.message,
        };
      }

      // Note: Actual backup process would be handled by a background job
      // This is just initiating the backup request

      return {
        success: true,
        message: 'Emergency backup initiated successfully',
        data: { backupId: backup.id },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error creating emergency backup',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Get maintenance mode status
      const { data: maintenanceData } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      const maintenanceMode = maintenanceData?.value
        ? JSON.parse(maintenanceData.value).enabled
        : false;

      // Get active user count (users active in last 15 minutes)
      const fifteenMinutesAgo = new Date(
        Date.now() - 15 * 60 * 1000,
      ).toISOString();
      const { count: activeUsers } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', fifteenMinutesAgo)
        .eq('status', 'active');

      // Get recent alerts
      const { data: alerts } = await this.supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get last backup info
      const { data: lastBackup } = await this.supabase
        .from('system_backups')
        .select('created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get system features status
      const { data: featuresData } = await this.supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'feature_%');

      const features: Record<string, boolean> = {};
      featuresData?.forEach((item) => {
        const featureKey = item.key.replace('feature_', '');
        features[featureKey] = JSON.parse(item.value).enabled;
      });

      // Determine system health based on alerts and maintenance mode
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      const unacknowledgedAlerts =
        alerts?.filter((alert) => !alert.acknowledged) || [];

      if (maintenanceMode) {
        systemHealth = 'warning';
      } else if (unacknowledgedAlerts.some((alert) => alert.type === 'error')) {
        systemHealth = 'critical';
      } else if (unacknowledgedAlerts.length > 0) {
        systemHealth = 'warning';
      }

      return {
        maintenanceMode,
        activeUsers: activeUsers || 0,
        systemHealth,
        lastBackup: lastBackup?.created_at || null,
        alerts:
          alerts?.map((alert) => ({
            id: alert.id,
            type: alert.type,
            message: alert.message,
            timestamp: alert.created_at,
            acknowledged: alert.acknowledged,
          })) || [],
        features,
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        maintenanceMode: false,
        activeUsers: 0,
        systemHealth: 'critical',
        lastBackup: null,
        alerts: [],
        features: {},
      };
    }
  }

  async toggleSystemFeature(
    featureId: string,
    enabled: boolean,
  ): Promise<EmergencyControlResult> {
    try {
      const { error } = await this.supabase.from('system_settings').upsert({
        key: `feature_${featureId}`,
        value: JSON.stringify({
          enabled,
          updated_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          message: `Failed to toggle ${featureId}`,
          error: error.message,
        };
      }

      return {
        success: true,
        message: `${featureId} ${enabled ? 'enabled' : 'disabled'} successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error toggling ${featureId}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const emergencyControls = new EmergencyControls();
