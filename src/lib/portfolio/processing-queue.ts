// WS-186: Image Processing Queue - Team B Round 1
// Background job processing system for image optimization and AI analysis

import { createClient } from '@supabase/supabase-js';
import { portfolioImageProcessor } from './image-processing';
import { weddingAIAnalyzer } from './ai-analysis';

export interface QueueJob {
  id: string;
  type: 'image_processing' | 'ai_analysis' | 'optimization' | 'cleanup';
  priority: number;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  error?: string;
}

export class ImageProcessingQueue {
  private supabase;
  private processing = false;
  private maxConcurrentJobs = 3;
  private activeJobs = 0;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Add image processing job to queue
   */
  async addImageProcessingJob(
    data: {
      supplierId: string;
      uploadJobId: string;
      originalFileName: string;
      filePath: string;
      category: string;
      enableWatermark?: boolean;
      watermarkPosition?: string;
    },
    priority: number = 5,
  ): Promise<string> {
    const { data: job, error } = await this.supabase
      .from('portfolio_processing_queue')
      .insert({
        job_type: 'image_processing',
        priority,
        data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to queue image processing job: ${error.message}`);
    }

    return job.id;
  }

  /**
   * Add AI analysis job to queue
   */
  async addAIAnalysisJob(
    data: {
      imageId: string;
      imageUrl: string;
      category: string;
      supplierId: string;
      originalFilename: string;
    },
    priority: number = 5,
  ): Promise<string> {
    const { data: job, error } = await this.supabase
      .from('portfolio_processing_queue')
      .insert({
        job_type: 'ai_analysis',
        priority,
        data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to queue AI analysis job: ${error.message}`);
    }

    return job.id;
  }

  /**
   * Start processing queue (should be run by background worker)
   */
  async startProcessing(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    console.log('Starting image processing queue...');

    try {
      while (this.processing) {
        if (this.activeJobs < this.maxConcurrentJobs) {
          await this.processNextJob();
        }

        // Small delay to prevent tight loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Stop processing queue
   */
  stopProcessing(): void {
    this.processing = false;
    console.log('Stopping image processing queue...');
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    const { data: jobs, error } = await this.supabase
      .from('portfolio_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !jobs || jobs.length === 0) {
      return;
    }

    const job = jobs[0];
    this.activeJobs++;

    try {
      await this.executeJob(job);
    } catch (error) {
      console.error(`Job execution failed: ${job.id}`, error);
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: any): Promise<void> {
    // Mark job as processing
    await this.supabase
      .from('portfolio_processing_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq('id', job.id);

    try {
      switch (job.job_type) {
        case 'image_processing':
          await this.executeImageProcessingJob(job);
          break;
        case 'ai_analysis':
          await this.executeAIAnalysisJob(job);
          break;
        case 'optimization':
          await this.executeOptimizationJob(job);
          break;
        case 'cleanup':
          await this.executeCleanupJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark job as completed
      await this.supabase
        .from('portfolio_processing_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    } catch (error) {
      console.error(`Job failed: ${job.id}`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const shouldRetry = job.attempts < job.max_attempts;

      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000; // 2s, 4s, 8s, etc.
        const retryAt = new Date(Date.now() + delay);

        await this.supabase
          .from('portfolio_processing_queue')
          .update({
            status: 'pending',
            scheduled_for: retryAt.toISOString(),
            error_message: errorMessage,
          })
          .eq('id', job.id);
      } else {
        // Mark as failed
        await this.supabase
          .from('portfolio_processing_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', job.id);
      }
    }
  }

  /**
   * Execute image processing job
   */
  private async executeImageProcessingJob(job: any): Promise<void> {
    const { data } = job;

    const result = await portfolioImageProcessor.processImage({
      supplierId: data.supplierId,
      uploadJobId: data.uploadJobId,
      originalFileName: data.originalFileName,
      filePath: data.filePath,
      category: data.category,
      enableWatermark: data.enableWatermark,
      watermarkPosition: data.watermarkPosition,
    });

    // Queue AI analysis job for the processed image
    if (data.enableAIProcessing !== false) {
      await this.addAIAnalysisJob({
        imageId: result.id,
        imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio-images/${result.versions.large.path}`,
        category: data.category,
        supplierId: data.supplierId,
        originalFilename: data.originalFileName,
      });
    }
  }

  /**
   * Execute AI analysis job
   */
  private async executeAIAnalysisJob(job: any): Promise<void> {
    const { data } = job;

    await weddingAIAnalyzer.analyzeImage({
      imageId: data.imageId,
      imageUrl: data.imageUrl,
      category: data.category,
      supplierId: data.supplierId,
      originalFilename: data.originalFilename,
    });
  }

  /**
   * Execute optimization job
   */
  private async executeOptimizationJob(job: any): Promise<void> {
    // Implement image optimization logic
    console.log('Executing optimization job:', job.id);
  }

  /**
   * Execute cleanup job
   */
  private async executeCleanupJob(job: any): Promise<void> {
    // Implement cleanup logic
    await portfolioImageProcessor.cleanupOrphanedFiles(
      job.data.olderThanHours || 24,
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data: stats, error } = await this.supabase
      .from('portfolio_processing_queue')
      .select('status')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ); // Last 24 hours

    if (error || !stats) {
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }

    return stats.reduce(
      (acc, item) => {
        acc[item.status as keyof typeof acc]++;
        return acc;
      },
      { pending: 0, processing: 0, completed: 0, failed: 0 },
    );
  }

  /**
   * Cancel pending jobs for a specific supplier
   */
  async cancelSupplierJobs(supplierId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('portfolio_processing_queue')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .like('data->supplierId', `%${supplierId}%`);

    if (error) {
      throw new Error(`Failed to cancel jobs: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
    );

    const { count, error } = await this.supabase
      .from('portfolio_processing_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup old jobs: ${error.message}`);
    }

    return count || 0;
  }
}

// Export singleton instance
export const imageProcessingQueue = new ImageProcessingQueue();

// Convenience functions
export async function queueImageProcessing(
  data: {
    supplierId: string;
    uploadJobId: string;
    originalFileName: string;
    filePath: string;
    category: string;
    enableWatermark?: boolean;
    watermarkPosition?: string;
  },
  priority: number = 5,
): Promise<string> {
  return imageProcessingQueue.addImageProcessingJob(data, priority);
}

export async function queueAIAnalysis(
  data: {
    imageId: string;
    imageUrl: string;
    category: string;
    supplierId: string;
    originalFilename: string;
  },
  priority: number = 5,
): Promise<string> {
  return imageProcessingQueue.addAIAnalysisJob(data, priority);
}
