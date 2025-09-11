/**
 * NotificationService - Stub implementation
 * This is a basic stub to resolve build errors.
 * Full implementation to be added during notification system development.
 */

interface BackupConfiguration {
  id: string;
  organization_id: string;
  name: string;
  is_wedding_critical: boolean;
}

interface BackupExecution {
  id: string;
  backup_config_id: string;
  execution_status: string;
}

export class NotificationService {
  async sendBackupNotification(
    config: BackupConfiguration,
    execution: BackupExecution,
    type: 'success' | 'failure',
    data?: any,
  ): Promise<void> {
    // Stub implementation - logs notification instead of sending
    const message =
      type === 'success'
        ? `Backup completed successfully for ${config.name}`
        : `Backup failed for ${config.name}`;

    console.log(
      `NotificationService: ${message} (Execution ID: ${execution.id})`,
    );

    if (config.is_wedding_critical && type === 'failure') {
      console.error('CRITICAL: Wedding-critical backup failed!', {
        configId: config.id,
        executionId: execution.id,
        error: data,
      });
    }
  }

  async sendAlert(
    organizationId: string,
    alertType: string,
    message: string,
    channels?: Array<'email' | 'sms' | 'webhook'>,
  ): Promise<void> {
    // Stub implementation - logs alert
    console.log(`Alert [${alertType}] for org ${organizationId}: ${message}`);

    if (channels) {
      console.log(`Notification channels: ${channels.join(', ')}`);
    }
  }
}
