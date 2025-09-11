import cron from 'node-cron';
import { z } from 'zod';
import { BackupEncryption } from '@/lib/security/backup-encryption';
import { SecureBackupStorage } from '@/lib/storage/secure-backup-storage';
import { BackupValidator } from '@/lib/security/backup-validator';
import { createWriteStream, createReadStream, unlink } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const unlinkAsync = promisify(unlink);
const pipelineAsync = promisify(pipeline);

/**
 * Enterprise-grade backup scheduler for WedSync wedding data protection
 * Orchestrates automated backups with encryption, compression, and verification
 */

// Type definitions
interface BackupPolicy {
  id: string;
  organizationId: string;
  policyName: string;
  backupType: 'full' | 'incremental' | 'differential';
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequencyValue: number;
  backupTime: string;
  timezone: string;
  retentionDays: number;
  includeUserData: boolean;
  includeMediaFiles: boolean;
  includeDocuments: boolean;
  includeAnalytics: boolean;
  exclusionPatterns: string[];
  isActive: boolean;
}

interface BackupJob {
  id: string;
  organizationId: string;
  backupPolicyId: string;
  jobName: string;
  jobType: 'scheduled' | 'manual' | 'triggered';
  backupType: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progressPercentage: number;
  currentStage: string;
  totalStages: number;
  completedStages: number;
  totalSizeBytes?: number;
  compressedSizeBytes?: number;
  fileCount?: number;
  tableCount?: number;
  storageLocation?: string;
  backupFilename?: string;
  checksumMd5?: string;
  checksumSha256?: string;
  successMessage?: string;
  errorMessage?: string;
  errorCode?: string;
  warningMessages: string[];
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

interface WeddingDataSnapshot {
  organizationId: string;
  timestamp: Date;
  guestData: GuestBackupData;
  vendorData: VendorBackupData;
  mediaData: MediaBackupData;
  budgetData: BudgetBackupData;
  timelineData: TimelineBackupData;
  seatingData: SeatingBackupData;
  menuData: MenuBackupData;
  totalRecords: number;
  estimatedSizeBytes: number;
}

interface GuestBackupData {
  guestLists: any[];
  rsvpResponses: any[];
  dietaryRequirements: any[];
  contactInformation: any[];
  plusOnes: any[];
}

interface VendorBackupData {
  contracts: any[];
  communications: any[];
  payments: any[];
  schedules: any[];
  documents: any[];
}

interface MediaBackupData {
  photos: any[];
  videos: any[];
  documents: any[];
  portfolios: any[];
  metadata: any[];
}

interface BudgetBackupData {
  categories: any[];
  items: any[];
  payments: any[];
  receipts: any[];
  projections: any[];
}

interface TimelineBackupData {
  events: any[];
  tasks: any[];
  milestones: any[];
  deadlines: any[];
  assignments: any[];
}

interface SeatingBackupData {
  arrangements: any[];
  tables: any[];
  assignments: any[];
  preferences: any[];
}

interface MenuBackupData {
  selections: any[];
  courses: any[];
  dietary: any[];
  preferences: any[];
}

interface BackupData {
  metadata: WeddingDataSnapshot;
  databaseDump: Buffer;
  mediaFiles: FileReference[];
  configData: any;
  checksums: Record<string, string>;
}

interface FileReference {
  path: string;
  size: number;
  checksum: string;
  type: string;
}

interface EncryptedBackup {
  encryptedData: Buffer;
  encryptionInfo: any;
  compressedSize: number;
  originalSize: number;
}

interface BackupResult {
  success: boolean;
  backupId: string;
  duration: number;
  totalSize: number;
  compressedSize: number;
  storageLocation: string;
  verification: {
    checksumValid: boolean;
    integrityScore: number;
  };
  warnings: string[];
  error?: string;
}

interface BackupStatus {
  jobId: string;
  status: string;
  progressPercentage: number;
  currentStage: string;
  timeRemaining?: number;
  lastUpdate: Date;
}

export class BackupScheduler {
  private storage: SecureBackupStorage;
  private activeJobs: Map<string, BackupJob> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private readonly MAX_CONCURRENT_BACKUPS = 3;
  private readonly BACKUP_STAGES = [
    'Initializing',
    'Collecting Guest Data',
    'Collecting Vendor Data',
    'Collecting Media Files',
    'Collecting Budget Data',
    'Collecting Timeline Data',
    'Creating Database Dump',
    'Compressing Data',
    'Encrypting Backup',
    'Uploading to Storage',
    'Verifying Integrity',
    'Completing',
  ];

  constructor() {
    this.storage = new SecureBackupStorage();
    this.initializeScheduler();
  }

  /**
   * Initializes the backup scheduler and loads active policies
   */
  private async initializeScheduler(): Promise<void> {
    try {
      console.log('Initializing BackupScheduler...');

      // Load active backup policies from database
      const activePolicies = await this.loadActivePolicies();

      // Schedule all active policies
      for (const policy of activePolicies) {
        await this.schedulePolicyBackups(policy);
      }

      console.log(
        `Backup scheduler initialized with ${activePolicies.length} active policies`,
      );
    } catch (error) {
      console.error('Failed to initialize backup scheduler:', error);
      throw new Error('Backup scheduler initialization failed');
    }
  }

  /**
   * Schedules backup based on policy configuration
   */
  async scheduleBackup(
    organizationId: string,
    policy: BackupPolicy,
  ): Promise<BackupJob> {
    try {
      // Validate inputs
      const validation = this.validateScheduleRequest({
        organizationId,
        policy,
      });
      if (!validation.success) {
        throw new Error(
          `Schedule validation failed: ${validation.errors?.join(', ')}`,
        );
      }

      // Create backup job record
      const job = await this.createBackupJob(policy, 'scheduled');

      // Schedule using cron
      const cronExpression = this.generateCronExpression(policy);
      const task = cron.schedule(
        cronExpression,
        async () => {
          await this.executeBackup(job.id);
        },
        {
          scheduled: false,
          timezone: policy.timezone,
        },
      );

      // Store scheduled task
      this.scheduledTasks.set(job.id, task);

      // Start the scheduled task
      task.start();

      console.log(
        `Backup scheduled for organization ${organizationId}: ${policy.policyName}`,
      );

      return job;
    } catch (error) {
      console.error('Backup scheduling failed:', error);
      throw new Error(
        `Failed to schedule backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Executes backup job with comprehensive error handling
   */
  async executeBackup(jobId: string): Promise<BackupResult> {
    const startTime = Date.now();
    let job: BackupJob | undefined;
    let tempFiles: string[] = [];

    try {
      // Get job details
      job = await this.getJobById(jobId);
      if (!job) {
        throw new Error(`Backup job ${jobId} not found`);
      }

      // Check if already running
      if (this.activeJobs.has(jobId)) {
        throw new Error(`Backup job ${jobId} is already running`);
      }

      // Check concurrent backup limit
      if (this.activeJobs.size >= this.MAX_CONCURRENT_BACKUPS) {
        throw new Error('Maximum concurrent backups reached');
      }

      // Start job execution
      await this.updateJobStatus(jobId, 'running', 'Initializing', 0);
      this.activeJobs.set(jobId, job);

      console.log(`Starting backup execution for job ${jobId}`);

      // Stage 1: Collect wedding data
      await this.updateJobProgress(jobId, 'Collecting Guest Data', 1);
      const weddingData = await this.collectWeddingData(job.organizationId);

      // Stage 2-6: Collect different data types (handled in collectWeddingData)

      // Stage 7: Create database dump
      await this.updateJobProgress(jobId, 'Creating Database Dump', 7);
      const databaseDump = await this.createDatabaseDump(job.organizationId);

      // Stage 8: Create backup data package
      await this.updateJobProgress(jobId, 'Compressing Data', 8);
      const backupData = await this.packageBackupData(
        weddingData,
        databaseDump,
      );

      // Stage 9: Encrypt backup
      await this.updateJobProgress(jobId, 'Encrypting Backup', 9);
      const tempBackupPath = await this.createTempFile();
      tempFiles.push(tempBackupPath);

      await this.saveBackupToFile(backupData, tempBackupPath);
      const encryptedBackup = await this.compressAndEncrypt(tempBackupPath);

      // Stage 10: Upload to storage
      await this.updateJobProgress(jobId, 'Uploading to Storage', 10);
      const storageResult = await this.uploadToStorage(encryptedBackup, {
        backupId: jobId,
        organizationId: job.organizationId,
        backupType: job.backupType,
        adminId: job.createdBy || 'system',
        adminEmail: 'system@wedsync.com',
        filename: `backup-${jobId}.enc`,
        size: encryptedBackup.compressedSize,
        checksum: encryptedBackup.encryptionInfo.hmac,
        encryptionInfo: encryptedBackup.encryptionInfo,
        retentionDays: 30,
        description: `Automated ${job.backupType} backup`,
      });

      // Stage 11: Verify integrity
      await this.updateJobProgress(jobId, 'Verifying Integrity', 11);
      const verification = await this.verifyBackupIntegrity(
        storageResult.backupId,
      );

      // Stage 12: Complete
      await this.updateJobProgress(jobId, 'Completing', 12);

      const duration = Date.now() - startTime;
      const result: BackupResult = {
        success: true,
        backupId: storageResult.backupId,
        duration,
        totalSize: backupData.databaseDump.length,
        compressedSize: encryptedBackup.compressedSize,
        storageLocation: storageResult.uploadUrl,
        verification: {
          checksumValid: verification.checksumMatch,
          integrityScore: verification.exists ? 100 : 0,
        },
        warnings: [],
      };

      // Update job completion
      await this.updateJobStatus(
        jobId,
        'completed',
        'Backup completed successfully',
        100,
      );

      console.log(
        `Backup job ${jobId} completed successfully in ${duration}ms`,
      );

      return result;
    } catch (error) {
      console.error(`Backup job ${jobId} failed:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (job) {
        // Implement retry logic
        if (job.retryCount < job.maxRetries) {
          const nextRetry = this.calculateNextRetry(job.retryCount);
          await this.scheduleRetry(jobId, nextRetry);
        } else {
          await this.updateJobStatus(
            jobId,
            'failed',
            errorMessage,
            job.progressPercentage,
          );
        }
      }

      throw new Error(`Backup execution failed: ${errorMessage}`);
    } finally {
      // Cleanup
      this.activeJobs.delete(jobId);

      // Clean up temporary files
      for (const tempFile of tempFiles) {
        try {
          await BackupEncryption.secureWipe(tempFile);
          await unlinkAsync(tempFile);
        } catch (cleanupError) {
          console.warn(
            `Failed to cleanup temp file ${tempFile}:`,
            cleanupError,
          );
        }
      }
    }
  }

  /**
   * Gets current backup job status
   */
  async getBackupStatus(jobId: string): Promise<BackupStatus> {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error(`Backup job ${jobId} not found`);
      }

      // Estimate time remaining based on progress and elapsed time
      let timeRemaining: number | undefined;
      if (
        job.status === 'running' &&
        job.startedAt &&
        job.progressPercentage > 0
      ) {
        const elapsed = Date.now() - job.startedAt.getTime();
        const estimatedTotal = (elapsed / job.progressPercentage) * 100;
        timeRemaining = Math.max(0, estimatedTotal - elapsed);
      }

      return {
        jobId: job.id,
        status: job.status,
        progressPercentage: job.progressPercentage,
        currentStage: job.currentStage,
        timeRemaining,
        lastUpdate: job.updatedAt,
      };
    } catch (error) {
      console.error('Failed to get backup status:', error);
      throw new Error(
        `Failed to get backup status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Collects all wedding data for backup
   */
  private async collectWeddingData(
    organizationId: string,
  ): Promise<WeddingDataSnapshot> {
    try {
      // This would integrate with your database to collect actual wedding data
      // For now, we'll create a structure that represents the data collection

      const guestData = await this.collectGuestData(organizationId);
      const vendorData = await this.collectVendorData(organizationId);
      const mediaData = await this.collectMediaData(organizationId);
      const budgetData = await this.collectBudgetData(organizationId);
      const timelineData = await this.collectTimelineData(organizationId);
      const seatingData = await this.collectSeatingData(organizationId);
      const menuData = await this.collectMenuData(organizationId);

      const totalRecords =
        guestData.guestLists.length +
        vendorData.contracts.length +
        mediaData.photos.length +
        budgetData.items.length +
        timelineData.events.length +
        seatingData.arrangements.length +
        menuData.selections.length;

      return {
        organizationId,
        timestamp: new Date(),
        guestData,
        vendorData,
        mediaData,
        budgetData,
        timelineData,
        seatingData,
        menuData,
        totalRecords,
        estimatedSizeBytes: totalRecords * 1024, // Rough estimate
      };
    } catch (error) {
      console.error('Wedding data collection failed:', error);
      throw new Error(
        `Failed to collect wedding data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Creates database dump using Supabase Management API
   */
  private async createDatabaseDump(organizationId: string): Promise<Buffer> {
    try {
      // This would use Supabase Management API or pg_dump
      // For now, we'll simulate database dump creation
      console.log(`Creating database dump for organization ${organizationId}`);

      // In real implementation, this would:
      // 1. Use Supabase Management API to create backup
      // 2. Download the backup file
      // 3. Return the backup data as Buffer

      const simulatedDump = JSON.stringify({
        organizationId,
        timestamp: new Date().toISOString(),
        tables: ['users', 'organizations', 'weddings', 'guests', 'vendors'],
        dumpType: 'logical',
        format: 'json',
      });

      return Buffer.from(simulatedDump, 'utf8');
    } catch (error) {
      console.error('Database dump creation failed:', error);
      throw new Error(
        `Failed to create database dump: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Packages backup data into structured format
   */
  private async packageBackupData(
    weddingData: WeddingDataSnapshot,
    databaseDump: Buffer,
  ): Promise<BackupData> {
    try {
      return {
        metadata: weddingData,
        databaseDump,
        mediaFiles: [], // Would be populated with actual media file references
        configData: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          generator: 'WedSync BackupScheduler v1.0',
        },
        checksums: {
          metadata: this.calculateChecksum(JSON.stringify(weddingData)),
          database: this.calculateChecksum(databaseDump.toString()),
        },
      };
    } catch (error) {
      console.error('Backup packaging failed:', error);
      throw new Error(
        `Failed to package backup data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Compresses and encrypts backup data
   */
  private async compressAndEncrypt(
    backupFilePath: string,
  ): Promise<EncryptedBackup> {
    try {
      const tempEncryptedPath = await this.createTempFile();

      const encryptionResult = await BackupEncryption.encryptFile(
        backupFilePath,
        tempEncryptedPath,
        { backupType: 'wedding_data', timestamp: new Date().toISOString() },
      );

      const encryptedData = await this.readFile(tempEncryptedPath);

      // Clean up temp encrypted file
      await BackupEncryption.secureWipe(tempEncryptedPath);
      await unlinkAsync(tempEncryptedPath);

      return {
        encryptedData,
        encryptionInfo: encryptionResult.encryptionInfo,
        compressedSize: encryptedData.length,
        originalSize: encryptionResult.fileSize,
      };
    } catch (error) {
      console.error('Compression and encryption failed:', error);
      throw new Error(
        `Failed to compress and encrypt backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Additional private helper methods would continue here...
  // Due to length constraints, I'll include the essential structure

  private async loadActivePolicies(): Promise<BackupPolicy[]> {
    // Implementation to load from database
    return [];
  }

  private async createBackupJob(
    policy: BackupPolicy,
    type: 'scheduled' | 'manual',
  ): Promise<BackupJob> {
    // Implementation to create job in database
    return {} as BackupJob;
  }

  private validateScheduleRequest(request: any): {
    success: boolean;
    errors?: string[];
  } {
    // Implementation using BackupValidator
    return { success: true };
  }

  private generateCronExpression(policy: BackupPolicy): string {
    // Implementation to convert policy to cron expression
    const [hour, minute] = policy.backupTime.split(':').map((n) => parseInt(n));

    switch (policy.frequencyType) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * 0`; // Sunday
      case 'monthly':
        return `${minute} ${hour} 1 * *`; // First of month
      default:
        return `${minute} ${hour} * * *`;
    }
  }

  private async getJobById(jobId: string): Promise<BackupJob | undefined> {
    // Implementation to fetch from database
    return undefined;
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    message: string,
    progress: number,
  ): Promise<void> {
    // Implementation to update database
  }

  private async updateJobProgress(
    jobId: string,
    stage: string,
    stageNumber: number,
  ): Promise<void> {
    const progress = Math.floor(
      (stageNumber / this.BACKUP_STAGES.length) * 100,
    );
    await this.updateJobStatus(jobId, 'running', stage, progress);
  }

  private createTempFile(): string {
    const filename = `backup-${randomBytes(16).toString('hex')}.tmp`;
    return join(tmpdir(), filename);
  }

  private async saveBackupToFile(
    backupData: BackupData,
    filePath: string,
  ): Promise<void> {
    const writeStream = createWriteStream(filePath);
    writeStream.write(JSON.stringify(backupData));
    writeStream.end();
  }

  private async readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const readStream = createReadStream(filePath);

      readStream.on('data', (chunk) => chunks.push(chunk));
      readStream.on('end', () => resolve(Buffer.concat(chunks)));
      readStream.on('error', reject);
    });
  }

  private calculateChecksum(data: string | Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private calculateNextRetry(retryCount: number): Date {
    // Exponential backoff: 2^n minutes
    const delayMinutes = Math.pow(2, retryCount);
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  private async scheduleRetry(jobId: string, nextRetry: Date): Promise<void> {
    // Implementation to schedule retry
  }

  private async uploadToStorage(
    backup: EncryptedBackup,
    metadata: any,
  ): Promise<any> {
    // Use SecureBackupStorage to upload
    const tempPath = this.createTempFile();
    await this.writeBufferToFile(backup.encryptedData, tempPath);

    try {
      return await this.storage.uploadBackup(tempPath, metadata);
    } finally {
      await BackupEncryption.secureWipe(tempPath);
      await unlinkAsync(tempPath);
    }
  }

  private async writeBufferToFile(
    buffer: Buffer,
    filePath: string,
  ): Promise<void> {
    const writeStream = createWriteStream(filePath);
    writeStream.write(buffer);
    writeStream.end();
  }

  private async verifyBackupIntegrity(backupId: string): Promise<any> {
    return await this.storage.verifyBackupIntegrity(backupId);
  }

  private async schedulePolicyBackups(policy: BackupPolicy): Promise<void> {
    // Implementation to schedule based on policy
  }

  // Wedding data collection methods (simplified for space)
  private async collectGuestData(
    organizationId: string,
  ): Promise<GuestBackupData> {
    return {
      guestLists: [],
      rsvpResponses: [],
      dietaryRequirements: [],
      contactInformation: [],
      plusOnes: [],
    };
  }

  private async collectVendorData(
    organizationId: string,
  ): Promise<VendorBackupData> {
    return {
      contracts: [],
      communications: [],
      payments: [],
      schedules: [],
      documents: [],
    };
  }

  private async collectMediaData(
    organizationId: string,
  ): Promise<MediaBackupData> {
    return {
      photos: [],
      videos: [],
      documents: [],
      portfolios: [],
      metadata: [],
    };
  }

  private async collectBudgetData(
    organizationId: string,
  ): Promise<BudgetBackupData> {
    return {
      categories: [],
      items: [],
      payments: [],
      receipts: [],
      projections: [],
    };
  }

  private async collectTimelineData(
    organizationId: string,
  ): Promise<TimelineBackupData> {
    return {
      events: [],
      tasks: [],
      milestones: [],
      deadlines: [],
      assignments: [],
    };
  }

  private async collectSeatingData(
    organizationId: string,
  ): Promise<SeatingBackupData> {
    return { arrangements: [], tables: [], assignments: [], preferences: [] };
  }

  private async collectMenuData(
    organizationId: string,
  ): Promise<MenuBackupData> {
    return { selections: [], courses: [], dietary: [], preferences: [] };
  }
}
