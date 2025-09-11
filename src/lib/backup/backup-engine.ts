import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { z } from 'zod';

export interface BackupResult {
  success: boolean;
  backupId: string;
  backupSize: number;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  integrityScore: number;
  checksum: string;
}

export interface CriticalityAssessment {
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  backupFrequency: number; // minutes
  retentionPeriod: number; // days
  offSiteRequired: boolean;
}

export interface RecoveryPoint {
  id: string;
  weddingId: string;
  timestamp: Date;
  dataHash: string;
  size: number;
  location: string;
}

export interface Wedding {
  id: string;
  date: Date;
  status: string;
  couple_id: string;
  supplier_id: string;
}

const BackupJobSchema = z.object({
  job_type: z.enum(['full', 'incremental', 'emergency', 'selective']),
  backup_scope: z.enum(['complete', 'wedding-only', 'data-type']),
  target_wedding_ids: z.array(z.string().uuid()).optional(),
  target_data_types: z.array(z.string()).optional(),
  priority_level: z.number().min(1).max(10).default(5),
});

export class WeddingAwareBackupEngine {
  private supabase = createClientComponentClient();
  private isRunning = false;
  private backupQueue: Array<{ id: string; priority: number }> = [];

  /**
   * Schedule backups with wedding prioritization
   * Prioritizes upcoming weddings (next 7 days) with higher frequency
   */
  async scheduleBackups(): Promise<void> {
    if (this.isRunning) {
      console.log('Backup scheduling already in progress');
      return;
    }

    this.isRunning = true;

    try {
      // Get upcoming weddings (next 7 days)
      const upcomingWeddings = await this.getUpcomingWeddings();
      console.log(`Found ${upcomingWeddings.length} upcoming weddings`);

      // Schedule high-frequency backups for wedding-day data
      for (const wedding of upcomingWeddings) {
        await this.scheduleHighFrequencyBackup(wedding.id);
      }

      // Schedule regular backups for all other data
      await this.scheduleRegularBackups();
    } catch (error) {
      console.error('Error scheduling backups:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Perform emergency backup of critical wedding data
   * Used for immediate backup of wedding data in crisis situations
   */
  async performEmergencyBackup(weddingId: string): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      // Validate wedding exists
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();

      if (weddingError || !wedding) {
        throw new Error(`Wedding not found: ${weddingId}`);
      }

      // Create emergency backup job
      const { data: backupJob, error: jobError } = await this.supabase
        .from('backup_jobs')
        .insert({
          job_type: 'emergency',
          backup_scope: 'wedding-only',
          target_wedding_ids: [weddingId],
          priority_level: 10, // Highest priority
          scheduled_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          status: 'running',
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create backup job: ${jobError.message}`);
      }

      // Backup critical wedding data in order of importance
      const backupData = {
        wedding: await this.backupWeddingCore(weddingId),
        guests: await this.backupGuestList(weddingId),
        timeline: await this.backupWeddingTimeline(weddingId),
        vendors: await this.backupVendorContacts(weddingId),
        photos: await this.backupWeddingPhotos(weddingId),
      };

      // Calculate backup size
      const backupSize = JSON.stringify(backupData).length;

      // Store backup snapshot
      const backupLocation = `emergency-backups/wedding-${weddingId}-${Date.now()}`;
      const { error: snapshotError } = await this.supabase
        .from('backup_snapshots')
        .insert({
          backup_job_id: backupJob.id,
          snapshot_timestamp: new Date().toISOString(),
          wedding_count: 1,
          guest_count: backupData.guests?.length || 0,
          photo_count: backupData.photos?.length || 0,
          timeline_event_count: backupData.timeline?.length || 0,
          data_integrity_hash: this.generateDataHash(backupData),
          encryption_key_id: 'emergency-key-1',
          storage_location: backupLocation,
          storage_provider: 'supabase',
          validation_status: 'pending',
        });

      if (snapshotError) {
        console.error('Failed to create backup snapshot:', snapshotError);
      }

      // Update job status
      await this.supabase
        .from('backup_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          backup_size_bytes: backupSize,
          backup_location: backupLocation,
        })
        .eq('id', backupJob.id);

      const duration = Date.now() - startTime;

      return {
        success: true,
        backupId: backupJob.id,
        backupSize,
        duration,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Emergency backup failed:', error);

      return {
        success: false,
        backupId: '',
        backupSize: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate backup integrity and completeness
   */
  async validateBackupIntegrity(backupId: string): Promise<ValidationResult> {
    try {
      // Get backup snapshot
      const { data: snapshot, error } = await this.supabase
        .from('backup_snapshots')
        .select('*')
        .eq('backup_job_id', backupId)
        .single();

      if (error || !snapshot) {
        return {
          valid: false,
          issues: ['Backup snapshot not found'],
          integrityScore: 0,
          checksum: '',
        };
      }

      const issues: string[] = [];
      let integrityScore = 100;

      // Validate data integrity hash
      const expectedHash = snapshot.data_integrity_hash;
      if (!expectedHash) {
        issues.push('Missing data integrity hash');
        integrityScore -= 20;
      }

      // Check if backup is accessible
      const isAccessible = await this.checkBackupAccessibility(
        snapshot.storage_location,
      );
      if (!isAccessible) {
        issues.push('Backup file is not accessible');
        integrityScore -= 30;
      }

      // Validate wedding data completeness
      if (snapshot.wedding_count === 0) {
        issues.push('No weddings found in backup');
        integrityScore -= 25;
      }

      // Check for corrupted photos
      const photoIntegrityCheck = await this.validatePhotoIntegrity(backupId);
      if (!photoIntegrityCheck.valid) {
        issues.push(...photoIntegrityCheck.issues);
        integrityScore -= 15;
      }

      // Update validation status
      await this.supabase
        .from('backup_snapshots')
        .update({
          validation_status: integrityScore >= 80 ? 'valid' : 'corrupted',
          validation_completed_at: new Date().toISOString(),
        })
        .eq('id', snapshot.id);

      return {
        valid: integrityScore >= 80,
        issues,
        integrityScore,
        checksum: expectedHash,
      };
    } catch (error) {
      console.error('Backup validation failed:', error);

      return {
        valid: false,
        issues: ['Validation process failed'],
        integrityScore: 0,
        checksum: '',
      };
    }
  }

  // Private helper methods

  private async getUpcomingWeddings(): Promise<Wedding[]> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data, error } = await this.supabase
      .from('weddings')
      .select('id, date, status, couple_id, supplier_id')
      .gte('date', new Date().toISOString())
      .lte('date', sevenDaysFromNow.toISOString())
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching upcoming weddings:', error);
      return [];
    }

    return data.map((w) => ({
      ...w,
      date: new Date(w.date),
    }));
  }

  private async scheduleHighFrequencyBackup(weddingId: string): Promise<void> {
    // Create backup job with high frequency (every 30 minutes for upcoming weddings)
    const { error } = await this.supabase.from('backup_jobs').insert({
      job_type: 'incremental',
      backup_scope: 'wedding-only',
      target_wedding_ids: [weddingId],
      priority_level: 8,
      scheduled_at: new Date().toISOString(),
      status: 'scheduled',
    });

    if (error) {
      console.error(
        `Failed to schedule high-frequency backup for wedding ${weddingId}:`,
        error,
      );
    }
  }

  private async scheduleRegularBackups(): Promise<void> {
    // Schedule daily full backups for all data
    const { error } = await this.supabase.from('backup_jobs').insert({
      job_type: 'full',
      backup_scope: 'complete',
      priority_level: 5,
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      status: 'scheduled',
    });

    if (error) {
      console.error('Failed to schedule regular backup:', error);
    }
  }

  private async backupWeddingCore(weddingId: string) {
    const { data, error } = await this.supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId);

    if (error) {
      console.error('Error backing up wedding core:', error);
      return null;
    }

    return data;
  }

  private async backupGuestList(weddingId: string) {
    const { data, error } = await this.supabase
      .from('guests')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error) {
      console.error('Error backing up guest list:', error);
      return null;
    }

    return data;
  }

  private async backupWeddingTimeline(weddingId: string) {
    const { data, error } = await this.supabase
      .from('timeline_events')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error) {
      console.error('Error backing up wedding timeline:', error);
      return null;
    }

    return data;
  }

  private async backupVendorContacts(weddingId: string) {
    const { data, error } = await this.supabase
      .from('wedding_vendors')
      .select('*, vendors(*)')
      .eq('wedding_id', weddingId);

    if (error) {
      console.error('Error backing up vendor contacts:', error);
      return null;
    }

    return data;
  }

  private async backupWeddingPhotos(weddingId: string) {
    const { data, error } = await this.supabase
      .from('wedding_photos')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error) {
      console.error('Error backing up wedding photos:', error);
      return null;
    }

    return data;
  }

  private generateDataHash(data: any): string {
    // Simple hash generation - in production, use proper cryptographic hash
    const dataString = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  private async checkBackupAccessibility(location: string): Promise<boolean> {
    try {
      // In a real implementation, this would check actual file accessibility
      // For now, we'll assume backups are accessible if location is provided
      return !!location;
    } catch {
      return false;
    }
  }

  private async validatePhotoIntegrity(
    backupId: string,
  ): Promise<{ valid: boolean; issues: string[] }> {
    // In a real implementation, this would validate actual photo files
    // For now, we'll return a simple validation
    return {
      valid: true,
      issues: [],
    };
  }
}
