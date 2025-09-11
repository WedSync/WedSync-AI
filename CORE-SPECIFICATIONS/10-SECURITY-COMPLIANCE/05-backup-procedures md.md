# 05-backup-procedures.md

# Backup Procedures

## Overview

Comprehensive backup and disaster recovery strategy for WedSync/WedMe ensuring business continuity, data protection, and rapid recovery from any failure scenario.

## Backup Architecture

### 1. Backup Strategy Overview

```yaml
# 3-2-1 Backup Rule Implementation
backup_strategy:
  copies: 3  # Three total copies of data
  media_types: 2  # Two different storage media
  offsite: 1  # One offsite backup

  components:
    primary:
      location: Supabase PostgreSQL (AWS)
      type: Live production database

    secondary:
      location: Automated Supabase backups
      type: Point-in-time recovery
      retention: 30 days

    tertiary:
      location: External cloud storage (S3/GCS)
      type: Encrypted snapshots
      retention: 90 days

    archive:
      location: Cold storage (Glacier)
      type: Long-term archive
      retention: 7 years

```

### 2. Database Backup Procedures

```sql
-- Continuous archiving with WAL (Write-Ahead Logging)
-- Supabase handles this automatically, but understanding is important

-- Manual backup procedure for critical operations
CREATE OR REPLACE FUNCTION create_manual_backup(
  p_reason TEXT,
  p_created_by UUID
) RETURNS TEXT AS $$
DECLARE
  v_backup_id TEXT;
  v_timestamp TEXT;
BEGIN
  v_timestamp := TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
  v_backup_id := 'manual_' || v_timestamp || '_' || encode(gen_random_bytes(4), 'hex');

  -- Log backup initiation
  INSERT INTO backup_log (
    backup_id,
    backup_type,
    reason,
    created_by,
    started_at,
    status
  ) VALUES (
    v_backup_id,
    'manual',
    p_reason,
    p_created_by,
    NOW(),
    'in_progress'
  );

  -- Trigger backup (platform-specific command)
  PERFORM pg_backup_start(v_backup_id, true);

  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- Backup verification
CREATE TABLE backup_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id TEXT NOT NULL,
  verification_type TEXT, -- checksum, restore_test, integrity_check
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN,
  details JSONB,
  verified_by UUID
);

```

### 3. Application-Level Backup System

```tsx
// Comprehensive backup orchestrator
class BackupOrchestrator {
  private backupProviders: BackupProvider[] = [
    new SupabaseBackupProvider(),
    new S3BackupProvider(),
    new GCSBackupProvider(),
    new AzureBackupProvider()
  ];

  async performBackup(type: BackupType): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const timestamp = new Date();

    try {
      // Start backup transaction
      await this.startBackupTransaction(backupId);

      // Backup different components
      const results = await Promise.all([
        this.backupDatabase(backupId),
        this.backupFileStorage(backupId),
        this.backupConfigurations(backupId),
        this.backupSecrets(backupId)
      ]);

      // Verify backup integrity
      await this.verifyBackup(backupId, results);

      // Replicate to multiple locations
      await this.replicateBackup(backupId, results);

      // Update backup catalog
      await this.updateBackupCatalog(backupId, results);

      // Send notification
      await this.notifyBackupComplete(backupId);

      return {
        backupId,
        timestamp,
        success: true,
        components: results
      };
    } catch (error) {
      await this.handleBackupFailure(backupId, error);
      throw error;
    }
  }

  private async backupDatabase(backupId: string): Promise<ComponentBackup> {
    // Create database snapshot
    const snapshot = await this.createDatabaseSnapshot();

    // Export critical tables
    const exports = await Promise.all([
      this.exportTable('users', backupId),
      this.exportTable('suppliers', backupId),
      this.exportTable('forms', backupId),
      this.exportTable('client_data', backupId),
      this.exportTable('audit_logs', backupId)
    ]);

    // Encrypt backup
    const encrypted = await this.encryptBackup(exports);

    // Store with metadata
    return {
      component: 'database',
      snapshotId: snapshot.id,
      size: encrypted.size,
      checksum: this.calculateChecksum(encrypted),
      location: await this.storeBackup(encrypted, backupId)
    };
  }
}

```

### 4. Incremental Backup Strategy

```tsx
// Incremental backup for efficiency
class IncrementalBackup {
  async performIncremental(): Promise<void> {
    const lastBackup = await this.getLastBackupTimestamp();
    const changes = await this.getChangesSince(lastBackup);

    if (changes.length === 0) {
      console.log('No changes since last backup');
      return;
    }

    // Backup only changed data
    const incrementalBackup = {
      baseBackupId: lastBackup.backupId,
      timestamp: new Date(),
      changes: await this.backupChanges(changes),
      deletions: await this.trackDeletions(lastBackup)
    };

    // Store incremental backup
    await this.storeIncrementalBackup(incrementalBackup);

    // Update backup chain
    await this.updateBackupChain(incrementalBackup);
  }

  private async getChangesSince(
    timestamp: Date
  ): Promise<ChangedRecord[]> {
    const query = `
      SELECT table_name, record_id, operation, changed_at
      FROM change_tracking
      WHERE changed_at > $1
      ORDER BY changed_at ASC
    `;

    return await db.query(query, [timestamp]);
  }
}

```

### 5. File Storage Backup

```tsx
// File and document backup
class FileBackupService {
  async backupFiles(backupId: string): Promise<FileBackupResult> {
    const files = await this.getFilesToBackup();
    const chunks = this.chunkFiles(files, 100); // Process in batches

    const results = [];
    for (const chunk of chunks) {
      const backed = await Promise.all(
        chunk.map(file => this.backupFile(file, backupId))
      );
      results.push(...backed);
    }

    return {
      totalFiles: files.length,
      backedUp: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success),
      totalSize: this.calculateTotalSize(results),
      manifest: await this.createManifest(results, backupId)
    };
  }

  private async backupFile(
    file: FileMetadata,
    backupId: string
  ): Promise<FileBackupRecord> {
    try {
      // Get file from storage
      const content = await this.storage.getFile(file.path);

      // Encrypt if sensitive
      const processed = file.sensitive
        ? await this.encrypt(content)
        : content;

      // Calculate checksum
      const checksum = this.calculateChecksum(processed);

      // Store in backup location
      const backupPath = `backups/${backupId}/files/${file.id}`;
      await this.backupStorage.putFile(backupPath, processed);

      return {
        fileId: file.id,
        originalPath: file.path,
        backupPath,
        checksum,
        size: processed.length,
        success: true
      };
    } catch (error) {
      return {
        fileId: file.id,
        success: false,
        error: error.message
      };
    }
  }
}

```

### 6. Configuration & Secrets Backup

```tsx
// Backup configuration and secrets
class ConfigurationBackup {
  async backupConfigurations(backupId: string): Promise<void> {
    const configs = {
      // Application configuration
      appConfig: {
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        features: await this.getFeatureFlags(),
        settings: await this.getApplicationSettings()
      },

      // Database configuration
      dbConfig: {
        schema_version: await this.getSchemaVersion(),
        migrations: await this.getMigrationHistory(),
        indexes: await this.getIndexDefinitions()
      },

      // Integration configuration
      integrations: {
        oauth_providers: await this.getOAuthConfigs(),
        api_integrations: await this.getAPIConfigs(),
        webhook_endpoints: await this.getWebhookConfigs()
      }
    };

    // Encrypt sensitive configuration
    const encrypted = await this.encryptSensitive(configs);

    // Store configuration backup
    await this.storeConfigBackup(encrypted, backupId);
  }

  async backupSecrets(backupId: string): Promise<void> {
    // Note: Secrets should be backed up separately with higher security
    const secrets = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV,
      // Reference to secrets in secure vault, not actual values
      secretRefs: {
        database_url: 'vault://database/connection_string',
        jwt_secret: 'vault://auth/jwt_secret',
        encryption_keys: 'vault://encryption/keys',
        api_keys: 'vault://integrations/api_keys'
      }
    };

    // Store secret references (not actual secrets)
    await this.storeSecretRefs(secrets, backupId);
  }
}

```

### 7. Automated Backup Scheduling

```tsx
// Backup scheduler
class BackupScheduler {
  private schedules = [
    {
      name: 'hourly_incremental',
      cron: '0 * * * *',
      type: 'incremental',
      retention: '24 hours'
    },
    {
      name: 'daily_full',
      cron: '0 2 * * *',
      type: 'full',
      retention: '7 days'
    },
    {
      name: 'weekly_full',
      cron: '0 3 * * 0',
      type: 'full',
      retention: '4 weeks'
    },
    {
      name: 'monthly_archive',
      cron: '0 4 1 * *',
      type: 'archive',
      retention: '12 months'
    }
  ];

  async initializeSchedules(): Promise<void> {
    for (const schedule of this.schedules) {
      cron.schedule(schedule.cron, async () => {
        await this.executeBackup(schedule);
      });
    }
  }

  private async executeBackup(schedule: BackupSchedule): Promise<void> {
    const startTime = Date.now();

    try {
      // Pre-backup checks
      await this.preBackupChecks();

      // Execute backup
      const result = await this.backupOrchestrator.performBackup(
        schedule.type
      );

      // Post-backup validation
      await this.postBackupValidation(result);

      // Clean old backups
      await this.cleanOldBackups(schedule.retention);

      // Log success
      await this.logBackupSuccess(schedule, result, Date.now() - startTime);
    } catch (error) {
      await this.handleBackupFailure(schedule, error);

      // Retry logic
      if (schedule.retryCount < 3) {
        await this.retryBackup(schedule);
      } else {
        await this.escalateBackupFailure(schedule, error);
      }
    }
  }
}

```

### 8. Disaster Recovery Procedures

```tsx
// Disaster recovery orchestration
class DisasterRecovery {
  async performRecovery(
    backupId: string,
    recoveryType: RecoveryType
  ): Promise<RecoveryResult> {
    const recoveryId = this.generateRecoveryId();

    try {
      // Validate backup availability
      await this.validateBackup(backupId);

      // Create recovery environment
      const environment = await this.createRecoveryEnvironment();

      // Restore in correct order
      const steps = [
        () => this.restoreInfrastructure(backupId, environment),
        () => this.restoreDatabase(backupId, environment),
        () => this.restoreFiles(backupId, environment),
        () => this.restoreConfiguration(backupId, environment),
        () => this.validateRestoration(environment),
        () => this.switchTraffic(environment)
      ];

      const results = [];
      for (const step of steps) {
        const result = await this.executeRecoveryStep(step, recoveryId);
        results.push(result);

        if (!result.success && result.critical) {
          throw new Error(`Critical recovery step failed: ${result.step}`);
        }
      }

      return {
        recoveryId,
        success: true,
        environment,
        steps: results,
        duration: this.calculateDuration(results)
      };
    } catch (error) {
      await this.handleRecoveryFailure(recoveryId, error);
      throw error;
    }
  }

  async performPointInTimeRecovery(
    targetTime: Date
  ): Promise<RecoveryResult> {
    // Find appropriate backup
    const backup = await this.findBackupForTime(targetTime);

    // Apply WAL logs to reach target time
    const logs = await this.getWALLogsSince(backup.timestamp, targetTime);

    // Restore base backup
    await this.restoreDatabase(backup.id, 'recovery');

    // Apply incremental changes
    for (const log of logs) {
      await this.applyWALLog(log);
    }

    // Validate recovery point
    await this.validateRecoveryPoint(targetTime);

    return {
      recoveredTo: targetTime,
      dataLoss: this.calculateDataLoss(targetTime),
      success: true
    };
  }
}

```

### 9. Backup Testing & Validation

```sql
-- Backup testing procedures
CREATE TABLE backup_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id TEXT NOT NULL,
  test_type TEXT NOT NULL, -- restore_test, integrity_check, spot_check
  test_environment TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN,
  errors JSONB,
  data_verified JSONB,
  tested_by UUID,
  notes TEXT
);

-- Automated backup testing
CREATE OR REPLACE FUNCTION test_backup_restoration(
  p_backup_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_test_id UUID;
  v_success BOOLEAN := TRUE;
BEGIN
  -- Create test record
  INSERT INTO backup_tests (backup_id, test_type, test_environment)
  VALUES (p_backup_id, 'restore_test', 'isolated')
  RETURNING id INTO v_test_id;

  -- Perform test restoration
  BEGIN
    -- Restore to test environment
    PERFORM restore_backup_to_test(p_backup_id);

    -- Verify data integrity
    PERFORM verify_restored_data();

    -- Test critical functions
    PERFORM test_critical_functions();

  EXCEPTION WHEN OTHERS THEN
    v_success := FALSE;

    UPDATE backup_tests
    SET errors = jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    )
    WHERE id = v_test_id;
  END;

  -- Update test record
  UPDATE backup_tests
  SET
    completed_at = NOW(),
    success = v_success
  WHERE id = v_test_id;

  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

```

### 10. Monitoring & Alerting

```tsx
// Backup monitoring system
class BackupMonitor {
  async monitorBackupHealth(): Promise<HealthReport> {
    const checks = await Promise.all([
      this.checkLastBackupTime(),
      this.checkBackupSizes(),
      this.checkBackupIntegrity(),
      this.checkReplicationStatus(),
      this.checkStorageCapacity(),
      this.checkRestoreCapability()
    ]);

    const issues = checks.filter(c => !c.healthy);

    if (issues.length > 0) {
      await this.sendAlert({
        severity: this.calculateSeverity(issues),
        issues,
        recommendations: this.getRecommendations(issues)
      });
    }

    return {
      healthy: issues.length === 0,
      checks,
      lastCheck: new Date()
    };
  }

  private async checkLastBackupTime(): Promise<HealthCheck> {
    const lastBackup = await this.getLastSuccessfulBackup();
    const hoursSince = this.hoursSince(lastBackup.timestamp);

    return {
      name: 'last_backup_time',
      healthy: hoursSince < 24,
      value: hoursSince,
      message: hoursSince > 24
        ? `No successful backup in ${hoursSince} hours`
        : 'Backups are current'
    };
  }
}

```

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

```yaml
recovery_objectives:
  critical_systems:
    rpo: 1 hour    # Maximum data loss
    rto: 2 hours   # Maximum downtime

  standard_systems:
    rpo: 4 hours
    rto: 8 hours

  non_critical:
    rpo: 24 hours
    rto: 48 hours

  data_categories:
    financial_data:
      rpo: 15 minutes
      rto: 1 hour

    user_data:
      rpo: 1 hour
      rto: 4 hours

    analytics_data:
      rpo: 24 hours
      rto: 72 hours

```

## Implementation Checklist

- [ ]  Configure Supabase automatic backups
- [ ]  Set up external backup storage (S3/GCS)
- [ ]  Implement backup orchestrator
- [ ]  Create backup scheduling system
- [ ]  Set up incremental backup process
- [ ]  Configure file storage backups
- [ ]  Implement configuration backup
- [ ]  Create disaster recovery procedures
- [ ]  Set up backup testing automation
- [ ]  Configure monitoring and alerting
- [ ]  Document recovery procedures
- [ ]  Train team on recovery process
- [ ]  Regular recovery drills (quarterly)
- [ ]  Backup verification testing
- [ ]  Update runbooks regularly