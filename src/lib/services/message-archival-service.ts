/**
 * WS-155: Message Archival Service
 * Team E - Round 2
 * Intelligent message archiving and retention management
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Message = Database['public']['Tables']['messages']['Row'];
type ArchivePolicy = Database['public']['Tables']['archive_policies']['Row'];
type ArchiveJob = Database['public']['Tables']['archive_jobs']['Row'];

export interface ArchiveConfig {
  retentionDays: number;
  compressAfterDays?: number;
  deleteAfterDays?: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

export interface ArchiveStats {
  totalMessages: number;
  archivedMessages: number;
  compressedMessages: number;
  totalSize: number;
  compressedSize: number;
  oldestMessage: Date | null;
  newestMessage: Date | null;
}

export interface ArchiveJobResult {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  messagesProcessed: number;
  messagesArchived: number;
  messagesDeleted: number;
  errorCount: number;
  startedAt?: Date;
  completedAt?: Date;
  errors?: string[];
}

class MessageArchivalService {
  private supabase = createClient();
  private compressionWorker: Worker | null = null;

  constructor() {
    this.initializeCompressionWorker();
  }

  /**
   * Initialize Web Worker for compression tasks
   */
  private initializeCompressionWorker() {
    if (typeof window !== 'undefined' && window.Worker) {
      // Worker code will be created separately
      // For now, compression will be handled server-side
    }
  }

  /**
   * Create or update archive policy
   */
  async createArchivePolicy(
    organizationId: string,
    config: ArchiveConfig,
    policyName: string = 'default',
  ): Promise<ArchivePolicy> {
    try {
      const { data, error } = await this.supabase
        .from('archive_policies')
        .upsert({
          organization_id: organizationId,
          policy_name: policyName,
          policy_type: 'age_based',
          retention_days: config.retentionDays,
          compress_after_days: config.compressAfterDays || 90,
          delete_after_days: config.deleteAfterDays,
          conditions: {
            compress: config.compressionEnabled ?? true,
            encrypt: config.encryptionEnabled ?? false,
          },
          is_active: true,
          next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create archive policy:', error);
      throw new Error('Failed to create archive policy');
    }
  }

  /**
   * Archive messages based on policy
   */
  async archiveMessagesByPolicy(
    organizationId: string,
    policyId?: string,
  ): Promise<ArchiveJobResult> {
    try {
      // Create archive job
      const { data: job, error: jobError } = await this.supabase
        .from('archive_jobs')
        .insert({
          organization_id: organizationId,
          job_type: 'policy_archive',
          status: 'running',
          started_at: new Date().toISOString(),
          job_metadata: { policy_id: policyId },
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Get active policy
      const policy = await this.getActivePolicy(organizationId, policyId);
      if (!policy) {
        throw new Error('No active archive policy found');
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      // Archive messages in batches
      const result = await this.batchArchiveMessages(
        organizationId,
        cutoffDate,
        job.id,
        policy,
      );

      // Update job status
      await this.supabase
        .from('archive_jobs')
        .update({
          status: result.errorCount > 0 ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          messages_processed: result.messagesProcessed,
          messages_archived: result.messagesArchived,
          messages_deleted: result.messagesDeleted,
          error_count: result.errorCount,
        })
        .eq('id', job.id);

      return {
        jobId: job.id,
        ...result,
      };
    } catch (error) {
      console.error('Archive job failed:', error);
      throw new Error('Failed to archive messages');
    }
  }

  /**
   * Archive messages in batches
   */
  private async batchArchiveMessages(
    organizationId: string,
    cutoffDate: Date,
    jobId: string,
    policy: ArchivePolicy,
  ): Promise<ArchiveJobResult> {
    const batchSize = 1000;
    let offset = 0;
    let totalProcessed = 0;
    let totalArchived = 0;
    let totalDeleted = 0;
    let errorCount = 0;
    const errors: string[] = [];

    while (true) {
      try {
        // Get batch of messages to archive
        const { data: messages, error } = await this.supabase
          .from('messages')
          .select('*')
          .eq('organization_id', organizationId)
          .lt('created_at', cutoffDate.toISOString())
          .is('archived_at', null)
          .order('created_at', { ascending: true })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (!messages || messages.length === 0) break;

        totalProcessed += messages.length;

        // Archive each message
        for (const message of messages) {
          try {
            await this.archiveSingleMessage(message, policy);
            totalArchived++;
          } catch (err) {
            errorCount++;
            errors.push(`Failed to archive message ${message.id}: ${err}`);
          }
        }

        // Check if we should delete old archives
        if (policy.delete_after_days) {
          const deleteCount = await this.deleteOldArchives(
            organizationId,
            policy.delete_after_days,
          );
          totalDeleted += deleteCount;
        }

        // Update job progress
        await this.supabase
          .from('archive_jobs')
          .update({
            messages_processed: totalProcessed,
            messages_archived: totalArchived,
            messages_deleted: totalDeleted,
            error_count: errorCount,
            job_metadata: {
              last_batch_offset: offset,
              errors: errors.slice(-10), // Keep last 10 errors
            },
          })
          .eq('id', jobId);

        if (messages.length < batchSize) break;
        offset += batchSize;

        // Add small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Batch archive failed:', error);
        errorCount++;
        errors.push(`Batch failed at offset ${offset}: ${error}`);
        break;
      }
    }

    return {
      jobId,
      status: errorCount > 0 ? 'failed' : 'completed',
      messagesProcessed: totalProcessed,
      messagesArchived: totalArchived,
      messagesDeleted: totalDeleted,
      errorCount,
      errors,
    };
  }

  /**
   * Archive a single message
   */
  private async archiveSingleMessage(
    message: Message,
    policy: ArchivePolicy,
  ): Promise<void> {
    const shouldCompress =
      policy.compress_after_days &&
      message.created_at &&
      new Date(message.created_at) <
        new Date(Date.now() - policy.compress_after_days * 24 * 60 * 60 * 1000);

    let compressedData = null;
    let compressedSize = null;
    let originalSize = null;

    if (shouldCompress && policy.conditions?.compress) {
      const result = await this.compressMessage(message);
      compressedData = result.compressed;
      compressedSize = result.compressedSize;
      originalSize = result.originalSize;
    }

    // Insert into archive table
    const { error } = await this.supabase.from('messages_archive').insert({
      ...message,
      archived_at: new Date().toISOString(),
      archive_reason: 'policy',
      retention_until: policy.delete_after_days
        ? new Date(
            Date.now() + policy.delete_after_days * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null,
      is_compressed: shouldCompress,
      compressed_size_bytes: compressedSize,
      original_size_bytes: originalSize,
      checksum: await this.calculateChecksum(JSON.stringify(message)),
    });

    if (error) throw error;

    // Mark original message as archived
    await this.supabase
      .from('messages')
      .update({
        archived_at: new Date().toISOString(),
        metadata: {
          ...((message.metadata as object) || {}),
          archived: true,
          archive_location: 'messages_archive',
        },
      })
      .eq('id', message.id);
  }

  /**
   * Compress message data
   */
  private async compressMessage(message: Message): Promise<{
    compressed: string;
    originalSize: number;
    compressedSize: number;
  }> {
    const originalData = JSON.stringify(message);
    const originalSize = new Blob([originalData]).size;

    // Use CompressionStream API if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([originalData]).stream();
      const compressedStream = stream.pipeThrough(
        new CompressionStream('gzip'),
      );
      const compressedBlob = await new Response(compressedStream).blob();
      const compressedData = await compressedBlob.text();

      return {
        compressed: compressedData,
        originalSize,
        compressedSize: compressedBlob.size,
      };
    }

    // Fallback: Base64 encode (no compression)
    return {
      compressed: btoa(originalData),
      originalSize,
      compressedSize: originalSize,
    };
  }

  /**
   * Restore archived messages
   */
  async restoreArchivedMessages(
    messageIds: string[],
  ): Promise<{ restored: number; failed: number }> {
    let restored = 0;
    let failed = 0;

    for (const messageId of messageIds) {
      try {
        // Get archived message
        const { data: archived, error: fetchError } = await this.supabase
          .from('messages_archive')
          .select('*')
          .eq('id', messageId)
          .single();

        if (fetchError || !archived) {
          failed++;
          continue;
        }

        // Decompress if needed
        let messageData = archived;
        if (archived.is_compressed && archived.compressed_data) {
          messageData = await this.decompressMessage(archived.compressed_data);
        }

        // Restore to messages table
        const { error: restoreError } = await this.supabase
          .from('messages')
          .upsert({
            ...messageData,
            archived_at: null,
            metadata: {
              ...((messageData.metadata as object) || {}),
              restored_from_archive: true,
              restored_at: new Date().toISOString(),
            },
          });

        if (restoreError) {
          failed++;
          continue;
        }

        // Remove from archive
        await this.supabase
          .from('messages_archive')
          .delete()
          .eq('id', messageId);

        restored++;
      } catch (error) {
        console.error(`Failed to restore message ${messageId}:`, error);
        failed++;
      }
    }

    return { restored, failed };
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(organizationId: string): Promise<ArchiveStats> {
    try {
      // Get message counts
      const { data: stats, error } = await this.supabase.rpc(
        'get_archive_statistics',
        { p_organization_id: organizationId },
      );

      if (error) throw error;

      return {
        totalMessages: stats?.total_messages || 0,
        archivedMessages: stats?.archived_messages || 0,
        compressedMessages: stats?.compressed_messages || 0,
        totalSize: stats?.total_size || 0,
        compressedSize: stats?.compressed_size || 0,
        oldestMessage: stats?.oldest_message
          ? new Date(stats.oldest_message)
          : null,
        newestMessage: stats?.newest_message
          ? new Date(stats.newest_message)
          : null,
      };
    } catch (error) {
      console.error('Failed to get archive stats:', error);
      throw new Error('Failed to get archive statistics');
    }
  }

  /**
   * Search archived messages
   */
  async searchArchives(
    organizationId: string,
    query: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<any[]> {
    try {
      let queryBuilder = this.supabase
        .from('messages_archive')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`subject.ilike.%${query}%,content.ilike.%${query}%`);

      if (dateRange) {
        queryBuilder = queryBuilder
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Archive search failed:', error);
      throw new Error('Failed to search archives');
    }
  }

  /**
   * Delete old archives
   */
  private async deleteOldArchives(
    organizationId: string,
    deleteAfterDays: number,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - deleteAfterDays);

    const { data, error } = await this.supabase
      .from('messages_archive')
      .delete()
      .eq('organization_id', organizationId)
      .lt('archived_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Failed to delete old archives:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get active archive policy
   */
  private async getActivePolicy(
    organizationId: string,
    policyId?: string,
  ): Promise<ArchivePolicy | null> {
    let query = this.supabase
      .from('archive_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (policyId) {
      query = query.eq('id', policyId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Failed to get archive policy:', error);
      return null;
    }

    return data;
  }

  /**
   * Calculate checksum for data integrity
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Decompress message data
   */
  private async decompressMessage(compressedData: string): Promise<any> {
    // Reverse of compression logic
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([compressedData]).stream();
      const decompressedStream = stream.pipeThrough(
        new DecompressionStream('gzip'),
      );
      const decompressedBlob = await new Response(decompressedStream).blob();
      const decompressedText = await decompressedBlob.text();
      return JSON.parse(decompressedText);
    }

    // Fallback: Base64 decode
    return JSON.parse(atob(compressedData));
  }

  /**
   * Get archive jobs history
   */
  async getArchiveJobs(
    organizationId: string,
    limit: number = 10,
  ): Promise<ArchiveJob[]> {
    const { data, error } = await this.supabase
      .from('archive_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get archive jobs:', error);
      return [];
    }

    return data || [];
  }
}

export const messageArchivalService = new MessageArchivalService();
