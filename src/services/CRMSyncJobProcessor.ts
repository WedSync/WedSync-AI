import { createClient } from '@supabase/supabase-js';
import type { CRMSyncJob, CRMIntegration } from '@/types/crm';

// Stub implementation to prevent build errors
// TODO: Implement full CRM sync functionality when Redis/BullMQ dependencies are resolved

export class CRMSyncJobProcessor {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async queueSyncJob(syncJob: CRMSyncJob): Promise<void> {
    console.log('CRM Sync Job queued (stub implementation):', syncJob.id);

    // Update job status in database without queue processing
    await this.updateSyncJobStatus(syncJob.id, 'pending');

    // For now, immediately mark as completed with a note
    setTimeout(async () => {
      await this.updateSyncJobStatus(syncJob.id, 'failed', {
        error_details: {
          message: 'CRM sync functionality not yet implemented',
          note: 'This feature requires Redis/BullMQ setup',
          timestamp: new Date().toISOString(),
        },
      });
    }, 1000);
  }

  async getSyncProgress(jobId: string): Promise<any> {
    // Fallback to database only
    const { data } = await this.supabase
      .from('crm_sync_jobs')
      .select('progress_percent, records_processed, records_total, updated_at')
      .eq('id', jobId)
      .single();

    return (
      data || {
        progress_percent: 0,
        records_processed: 0,
        records_total: 0,
        updated_at: new Date().toISOString(),
      }
    );
  }

  async logAuditEvent(
    userId: string,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    // Simple audit logging to database
    await this.supabase.from('audit_logs').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      created_at: new Date().toISOString(),
    });
  }

  private async updateSyncJobStatus(
    jobId: string,
    status: string,
    additionalData?: any,
  ): Promise<void> {
    await this.supabase
      .from('crm_sync_jobs')
      .update({
        job_status: status,
        ...additionalData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  async shutdown(): Promise<void> {
    console.log('CRM Sync Job Processor shutdown (stub)');
  }
}

export default CRMSyncJobProcessor;
