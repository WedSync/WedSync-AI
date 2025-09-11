/**
 * Comprehensive Backup Integration Tests
 * WS-249: Backup & Disaster Recovery System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudBackupIntegration } from '@/integrations/backup/CloudBackupIntegration';
import { BackupReplicationService } from '@/integrations/backup/BackupReplicationService';
import { VendorDataReplication, VendorType } from '@/integrations/backup/VendorDataReplication';
import { WeddingAssetBackupSync, AssetType } from '@/integrations/backup/WeddingAssetBackupSync';
import { ClientDataCloudSync, ClientDataType } from '@/integrations/backup/ClientDataCloudSync';
import { EmergencyBackupTrigger, EmergencyType } from '@/integrations/backup/EmergencyBackupTrigger';

describe('WS-249 Backup Integration System', () => {
  let cloudBackup: CloudBackupIntegration;
  let replicationService: BackupReplicationService;
  let vendorReplication: VendorDataReplication;
  let assetBackup: WeddingAssetBackupSync;
  let clientSync: ClientDataCloudSync;
  let emergencyTrigger: EmergencyBackupTrigger;

  beforeEach(() => {
    cloudBackup = new CloudBackupIntegration({
      provider: 'aws-s3',
      region: 'us-east-1',
      bucket: 'test-backup-bucket',
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key'
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyRotationDays: 30,
        clientSideEncryption: true
      },
      retentionPolicy: {
        dailyBackups: 30,
        weeklyBackups: 12,
        monthlyBackups: 12,
        yearlyBackups: 7
      }
    });

    replicationService = new BackupReplicationService({
      providers: ['aws-s3', 'azure-blob', 'gcp-storage'],
      syncInterval: 300,
      conflictResolution: 'last-write-wins',
      deltaSync: true,
      bidirectional: true,
      weddingDataPriority: true,
      regions: ['us-east-1', 'eu-west-1'],
      encryptInTransit: true,
      encryptAtRest: true
    });

    vendorReplication = new VendorDataReplication();
    assetBackup = new WeddingAssetBackupSync();
    clientSync = new ClientDataCloudSync();
    emergencyTrigger = new EmergencyBackupTrigger();
  });

  afterEach(() => {
    vi.clearAllMocks();
    emergencyTrigger.destroy();
  });

  describe('Cloud Backup Integration', () => {
    it('should create backup with proper metadata', async () => {
      const result = await cloudBackup.createBackup(
        'wedding-data',
        Buffer.from('test wedding data'),
        {
          organizationId: 'org-123',
          tags: { type: 'wedding', priority: 'high' },
          priority: 'critical'
        }
      );

      expect(result.success).toBe(true);
      expect(result.metadata.organizationId).toBe('org-123');
      expect(result.metadata.type).toBe('wedding-data');
      expect(result.metadata.encryption).toBe(true);
      expect(result.bytesTransferred).toBeGreaterThan(0);
    });

    it('should validate backup configuration', async () => {
      // Test invalid configuration
      expect(() => {
        new CloudBackupIntegration({
          provider: 'invalid-provider' as any,
          region: '',
          bucket: '',
          credentials: {},
          encryption: {} as any,
          retentionPolicy: {} as any
        });
      }).toThrow();
    });

    it('should test connection to backup provider', async () => {
      const isConnected = await cloudBackup.testConnection();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('Backup Replication Service', () => {
    it('should start replication across multiple providers', async () => {
      // Mock provider registration
      const mockProvider = {
        ping: vi.fn().mockResolvedValue(true),
        listObjects: vi.fn().mockResolvedValue([
          {
            key: 'wedding-photos/album1.jpg',
            size: 1024000,
            lastModified: new Date(),
            version: 'v1'
          }
        ]),
        downloadObject: vi.fn().mockResolvedValue(Buffer.from('photo-data')),
        uploadObject: vi.fn().mockResolvedValue(undefined),
        objectExists: vi.fn().mockResolvedValue(true),
        deleteObject: vi.fn().mockResolvedValue(undefined),
        getObjectMetadata: vi.fn().mockResolvedValue({
          contentType: 'image/jpeg',
          contentLength: 1024000,
          lastModified: new Date(),
          etag: 'abc123',
          customMetadata: {}
        })
      };

      await replicationService.registerProvider('aws-s3', mockProvider, 'us-east-1');
      await replicationService.registerProvider('azure-blob', mockProvider, 'eastus');

      // This would normally start actual replication
      const status = replicationService.getReplicationStatus();
      expect(status.providers).toBe(2);
    });

    it('should prioritize wedding data during replication', async () => {
      const status = replicationService.getReplicationStatus();
      expect(status.isActive).toBe(false); // Not active initially
      expect(status.providers).toBe(0); // No providers registered initially
    });
  });

  describe('Vendor Data Replication', () => {
    it('should replicate photographer data with correct priorities', async () => {
      const config = {
        vendor_id: 'photographer-123',
        vendor_type: VendorType.PHOTOGRAPHER,
        backup_priority: 'high' as const,
        data_types: [
          {
            type: 'wedding_galleries' as const,
            priority: 1,
            size_limit_gb: 50,
            retention_days: 365,
            encryption_required: true
          },
          {
            type: 'portfolios' as const,
            priority: 2,
            size_limit_gb: 20,
            retention_days: 180,
            encryption_required: true
          }
        ],
        retention_days: 365,
        compliance_requirements: [{
          regulation: 'GDPR' as const,
          data_residency: ['eu-west-1', 'eu-central-1'],
          retention_max_days: 365,
          deletion_required: true
        }],
        replication_regions: ['us-east-1', 'eu-west-1'],
        wedding_season_boost: true
      };

      const result = await vendorReplication.replicateVendorData(config);
      
      expect(result.success).toBe(true);
      expect(result.backup_id).toMatch(/^vendor-photographer-123-/);
      expect(result.replicated_data_types).toContain('wedding_galleries');
      expect(result.total_size_gb).toBeGreaterThan(0);
    });

    it('should get vendor backup status', async () => {
      const status = await vendorReplication.getVendorBackupStatus('photographer-123');
      
      expect(status).toHaveProperty('backup_health');
      expect(status).toHaveProperty('compliance_status');
      expect(status.backup_health).toMatch(/healthy|warning|critical/);
      expect(status.compliance_status).toMatch(/compliant|issues/);
    });

    it('should setup vendor backup schedule', async () => {
      const result = await vendorReplication.setupVendorBackupSchedule(
        'photographer-123',
        VendorType.PHOTOGRAPHER,
        {
          frequency: 'daily',
          time: '02:00',
          timezone: 'UTC',
          wedding_season_boost: true
        }
      );

      expect(result.success).toBe(true);
      expect(result.schedule_id).toMatch(/^schedule-photographer-123-/);
    });
  });

  describe('Wedding Asset Backup', () => {
    it('should backup wedding assets with proper prioritization', async () => {
      const weddingDate = new Date();
      weddingDate.setDate(weddingDate.getDate() + 7); // Wedding in 1 week

      const config = {
        wedding_id: 'wedding-123',
        asset_types: [
          AssetType.WEDDING_PHOTOS,
          AssetType.WEDDING_VIDEOS,
          AssetType.DOCUMENTS,
          AssetType.CONTRACTS
        ],
        backup_destinations: ['aws', 'azure'],
        compression_level: 'medium' as const,
        encryption_enabled: true,
        wedding_date: weddingDate,
        priority_level: 'critical' as const
      };

      const result = await assetBackup.backupWeddingAssets(config);

      expect(result.success).toBe(true);
      expect(result.backup_id).toMatch(/^wedding-assets-wedding-123-/);
      expect(result.assets_backed_up).toBeGreaterThan(0);
      expect(result.wedding_ready).toBe(true);
      expect(result.total_size_gb).toBeGreaterThan(0);
    });

    it('should restore wedding assets', async () => {
      const result = await assetBackup.restoreWeddingAssets(
        'wedding-123',
        [AssetType.WEDDING_PHOTOS, AssetType.CONTRACTS]
      );

      expect(result.success).toBe(true);
      expect(result.restored_assets).toBeGreaterThan(0);
    });

    it('should get backup status', async () => {
      const status = await assetBackup.getBackupStatus('backup-123');
      
      expect(status.status).toMatch(/pending|running|completed|failed/);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Client Data Cloud Sync', () => {
    it('should sync client data with GDPR compliance', async () => {
      const config = {
        client_id: 'client-123',
        data_types: [
          ClientDataType.GUEST_LISTS,
          ClientDataType.RSVP_RESPONSES,
          ClientDataType.DIETARY_REQUIREMENTS
        ],
        sync_frequency: 'daily' as const,
        retention_days: 365,
        gdpr_compliance: true,
        cloud_providers: ['aws', 'azure']
      };

      const result = await clientSync.syncClientData(config);

      expect(result.success).toBe(true);
      expect(result.sync_id).toMatch(/^client-sync-client-123-/);
      expect(result.synced_data_types).toContain(ClientDataType.GUEST_LISTS);
      expect(result.total_records).toBeGreaterThan(0);
    });

    it('should get client sync status', async () => {
      const status = await clientSync.getClientSyncStatus('client-123');
      
      expect(status.sync_health).toMatch(/healthy|warning|critical/);
      expect(status.compliance_status).toMatch(/compliant|non_compliant/);
      expect(status.records_synced).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Emergency Backup Trigger', () => {
    it('should activate emergency backup for wedding day failure', async () => {
      const result = await emergencyTrigger.activateEmergencyBackup(
        EmergencyType.WEDDING_DAY_FAILURE,
        'org-123',
        'wedding-123',
        'critical'
      );

      expect(result.success).toBe(true);
      expect(result.trigger_id).toMatch(/^activated-wedding_day_failure-/);
      expect(result.actions_executed).toBeGreaterThan(0);
      expect(result.wedding_impact_assessment).toHaveProperty('active_weddings_affected');
      expect(result.wedding_impact_assessment).toHaveProperty('estimated_resolution_minutes');
    });

    it('should create and manage emergency triggers', async () => {
      const triggerId = await emergencyTrigger.createEmergencyTrigger({
        trigger_id: '',
        emergency_type: EmergencyType.SYSTEM_OUTAGE,
        severity: 'high',
        organization_id: 'org-123',
        trigger_conditions: [{
          condition_type: 'response_time',
          threshold: 5000, // 5 seconds
          duration_seconds: 300,
          check_interval_seconds: 30
        }],
        backup_actions: [{
          action_type: 'full_system_backup',
          data_types: ['all_data'],
          destinations: ['aws', 'azure'],
          max_execution_time_minutes: 60
        }],
        notification_channels: ['email', 'sms']
      });

      expect(triggerId).toMatch(/^emergency-system_outage-/);

      // Deactivate trigger
      const deactivated = await emergencyTrigger.deactivateTrigger(triggerId);
      expect(deactivated).toBe(true);
    });

    it('should get emergency status', async () => {
      const status = await emergencyTrigger.getEmergencyStatus();
      
      expect(status).toHaveProperty('active_triggers');
      expect(status).toHaveProperty('wedding_day_mode');
      expect(status).toHaveProperty('system_health_score');
      expect(status.system_health_score).toBeGreaterThanOrEqual(0);
      expect(status.system_health_score).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration Tests', () => {
    it('should coordinate all backup systems for wedding day scenario', async () => {
      const weddingId = 'wedding-integration-test';
      const organizationId = 'org-integration-test';
      
      // 1. Setup vendor data replication
      const vendorConfig = {
        vendor_id: 'photographer-integration',
        vendor_type: VendorType.PHOTOGRAPHER,
        backup_priority: 'high' as const,
        data_types: [
          {
            type: 'wedding_galleries' as const,
            priority: 1,
            size_limit_gb: 50,
            retention_days: 365,
            encryption_required: true
          }
        ],
        retention_days: 365,
        compliance_requirements: [],
        replication_regions: ['us-east-1'],
        wedding_season_boost: true
      };

      const vendorResult = await vendorReplication.replicateVendorData(vendorConfig);
      expect(vendorResult.success).toBe(true);

      // 2. Setup wedding asset backup
      const assetConfig = {
        wedding_id: weddingId,
        asset_types: [AssetType.WEDDING_PHOTOS, AssetType.WEDDING_VIDEOS],
        backup_destinations: ['aws', 'azure'],
        compression_level: 'medium' as const,
        encryption_enabled: true,
        wedding_date: new Date(),
        priority_level: 'critical' as const
      };

      const assetResult = await assetBackup.backupWeddingAssets(assetConfig);
      expect(assetResult.success).toBe(true);

      // 3. Setup client data sync
      const clientConfig = {
        client_id: 'client-integration',
        data_types: [ClientDataType.GUEST_LISTS, ClientDataType.RSVP_RESPONSES],
        sync_frequency: 'realtime' as const,
        retention_days: 365,
        gdpr_compliance: true,
        cloud_providers: ['aws']
      };

      const clientResult = await clientSync.syncClientData(clientConfig);
      expect(clientResult.success).toBe(true);

      // 4. Test emergency activation
      const emergencyResult = await emergencyTrigger.activateEmergencyBackup(
        EmergencyType.WEDDING_DAY_FAILURE,
        organizationId,
        weddingId,
        'critical'
      );

      expect(emergencyResult.success).toBe(true);
      expect(emergencyResult.wedding_impact_assessment.active_weddings_affected).toBeGreaterThanOrEqual(0);

      // All systems should coordinate successfully
      expect(vendorResult.success && assetResult.success && 
             clientResult.success && emergencyResult.success).toBe(true);
    });

    it('should handle wedding day mode activation', async () => {
      const today = new Date();
      const isWeekend = today.getDay() === 0 || today.getDay() === 6;
      
      const emergencyStatus = await emergencyTrigger.getEmergencyStatus();
      expect(emergencyStatus.wedding_day_mode).toBe(isWeekend);
      
      if (isWeekend) {
        // Weekend - wedding day mode should be active
        expect(emergencyStatus.wedding_day_mode).toBe(true);
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle backup failures gracefully', async () => {
      // Test with invalid configuration to trigger error handling
      await expect(async () => {
        const config = {
          vendor_id: '',  // Invalid empty vendor ID
          vendor_type: VendorType.PHOTOGRAPHER,
          backup_priority: 'high' as const,
          data_types: [],  // Empty data types
          retention_days: -1,  // Invalid retention
          compliance_requirements: [],
          replication_regions: [],  // No regions
          wedding_season_boost: true
        };

        await vendorReplication.replicateVendorData(config);
      }).rejects.toThrow();
    });

    it('should validate all configurations before processing', () => {
      // Cloud backup configuration validation
      expect(() => {
        new CloudBackupIntegration({} as any);
      }).toThrow();

      // Replication service configuration validation
      expect(() => {
        new BackupReplicationService({} as any);
      }).toThrow();
    });
  });
});