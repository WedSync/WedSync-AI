/**
 * Guest Import Processing Pipeline - WS-151
 * Team C - Batch 13: Background job processing, data transformation, rollback mechanisms
 *
 * Features:
 * - Background job processing for large imports
 * - Data transformation and mapping
 * - Rollback mechanisms for failed imports
 * - Import status tracking and reporting
 * - Integration with existing queue processor
 * - Real-time progress updates
 */

import { createClient } from '@/lib/supabase/server';
import { getQueueProcessor } from '@/lib/journey-engine/queue-processor';
import {
  guestValidator,
  GuestData,
  ValidationResult,
} from '@/lib/validation/guest-validation';
import {
  guestImportService,
  ImportProgress,
  ImportError,
} from '@/lib/upload/guest-import';

export interface GuestImportJob {
  id: string;
  type: 'guest_import_process' | 'guest_import_rollback';
  importId: string;
  clientId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  data: GuestImportJobData;
  progress: number;
  totalRows: number;
  processedRows: number;
  validRows: number;
  errorRows: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface GuestImportJobData {
  importId: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  uploadUrl: string;
  validationRules?: GuestValidationRules;
  transformationRules?: DataTransformationRules;
  rollbackReason?: string;
}

export interface GuestValidationRules {
  requireEmail: boolean;
  requirePhone: boolean;
  requireName: boolean;
  allowDuplicates: boolean;
  validateAddresses: boolean;
  normalizePhones: boolean;
  strictMode: boolean;
}

export interface DataTransformationRules {
  normalizeNames: boolean;
  formatPhones: boolean;
  standardizeDietary: boolean;
  assignDefaultTable: string | null;
  autoAssignTables: boolean;
  setDefaultRsvpStatus: 'pending' | 'attending' | 'not_attending' | 'tentative';
}

export interface ImportJobResult {
  success: boolean;
  importId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  skippedRows: number;
  duplicatesFound: number;
  processingTime: number;
  errors: ImportError[];
  warnings: ImportError[];
  rollbackAvailable: boolean;
}

export interface RollbackJobResult {
  success: boolean;
  importId: string;
  deletedRows: number;
  restoredState: boolean;
  rollbackTime: number;
  errors: string[];
}

export class GuestImportProcessor {
  private readonly supabase = createClient();
  private readonly queueProcessor = getQueueProcessor();

  // Default validation and transformation rules
  private readonly defaultValidationRules: GuestValidationRules = {
    requireEmail: false,
    requirePhone: false,
    requireName: true,
    allowDuplicates: false,
    validateAddresses: true,
    normalizePhones: true,
    strictMode: false,
  };

  private readonly defaultTransformationRules: DataTransformationRules = {
    normalizeNames: true,
    formatPhones: true,
    standardizeDietary: true,
    assignDefaultTable: null,
    autoAssignTables: false,
    setDefaultRsvpStatus: 'pending',
  };

  /**
   * Queue a guest import job for background processing
   */
  async queueImportJob(
    importId: string,
    clientId: string,
    options?: {
      priority?: 'critical' | 'high' | 'medium' | 'low';
      validationRules?: Partial<GuestValidationRules>;
      transformationRules?: Partial<DataTransformationRules>;
    },
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      // Get import record
      const { data: importRecord } = await this.supabase
        .from('guest_imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (!importRecord) {
        return { success: false, error: 'Import record not found' };
      }

      // Create job data
      const jobData: GuestImportJobData = {
        importId,
        clientId,
        fileName: importRecord.file_name,
        fileSize: importRecord.file_size,
        uploadUrl: importRecord.upload_url,
        validationRules: {
          ...this.defaultValidationRules,
          ...(options?.validationRules || {}),
        },
        transformationRules: {
          ...this.defaultTransformationRules,
          ...(options?.transformationRules || {}),
        },
      };

      // Create job record
      const jobId = `guest_import_${importId}_${Date.now()}`;
      const job: Partial<GuestImportJob> = {
        id: jobId,
        type: 'guest_import_process',
        importId,
        clientId,
        status: 'queued',
        priority: options?.priority || 'medium',
        data: jobData,
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        validRows: 0,
        errorRows: 0,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Store job record
      const { error: jobError } = await this.supabase
        .from('guest_import_jobs')
        .insert(job);

      if (jobError) {
        console.error('Failed to create job record:', jobError);
        return { success: false, error: jobError.message };
      }

      // Queue for processing with existing queue processor
      await this.scheduleJobExecution(jobId, new Date());

      return { success: true, jobId };
    } catch (error) {
      console.error('Failed to queue import job:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a guest import job
   */
  async processImportJob(jobId: string): Promise<ImportJobResult> {
    const startTime = Date.now();
    let job: GuestImportJob | null = null;

    try {
      // Get job record
      const { data: jobData } = await this.supabase
        .from('guest_import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      job = jobData;
      if (!job) {
        throw new Error('Job record not found');
      }

      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', {
        startedAt: new Date(),
      });

      // Download and parse file
      const { data: fileData, error: downloadError } =
        await this.supabase.storage
          .from('guest-uploads')
          .download(job.data.uploadUrl);

      if (downloadError) {
        throw new Error(`File download failed: ${downloadError.message}`);
      }

      // Parse file content based on type
      const fileBuffer = await fileData.arrayBuffer();
      const guestData = await this.parseImportFile(
        fileBuffer,
        job.data.fileName,
      );

      // Update job with total rows
      await this.updateJobProgress(jobId, { totalRows: guestData.length });

      // Apply data transformations
      const transformedData = await this.applyDataTransformations(
        guestData,
        job.data.transformationRules!,
        jobId,
      );

      // Validate guest data
      const validation = await guestValidator.validateGuestBatch(
        transformedData,
        job.clientId,
        !job.data.validationRules!.allowDuplicates,
      );

      // Update progress
      await this.updateJobProgress(jobId, {
        processedRows: validation.statistics.totalRows,
        validRows: validation.statistics.validRows,
        errorRows: validation.statistics.rowsWithErrors,
        progress: 70,
      });

      // Filter valid guests for insertion
      const validGuests = transformedData.filter((guest, index) => {
        const hasErrors = validation.errors.some(
          (error) => error.row === guest.row_number,
        );
        return !hasErrors;
      });

      // Insert valid guests into database
      let insertedCount = 0;
      if (validGuests.length > 0) {
        const insertResult = await this.insertGuestsToDatabase(
          validGuests,
          job.clientId,
          job.importId,
          jobId,
        );
        insertedCount = insertResult.insertedCount;
      }

      const processingTime = Date.now() - startTime;

      // Create result
      const result: ImportJobResult = {
        success: validation.errors.length === 0,
        importId: job.importId,
        totalRows: guestData.length,
        validRows: insertedCount,
        errorRows: validation.statistics.rowsWithErrors,
        skippedRows:
          guestData.length -
          insertedCount -
          validation.statistics.rowsWithErrors,
        duplicatesFound: validation.duplicates.length,
        processingTime,
        errors: validation.errors,
        warnings: validation.warnings,
        rollbackAvailable: insertedCount > 0,
      };

      // Update job completion
      await this.updateJobStatus(jobId, 'completed', {
        completedAt: new Date(),
        progress: 100,
        validRows: insertedCount,
        errorRows: validation.statistics.rowsWithErrors,
      });

      // Update import record
      await this.supabase
        .from('guest_imports')
        .update({
          status: 'completed',
          processed_rows: validation.statistics.totalRows,
          valid_rows: insertedCount,
          error_rows: validation.statistics.rowsWithErrors,
          errors: validation.errors,
          warnings: validation.warnings,
          completed_at: new Date(),
        })
        .eq('id', job.importId);

      return result;
    } catch (error) {
      console.error(`Import job ${jobId} failed:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';
      const processingTime = Date.now() - startTime;

      // Update job as failed
      if (job) {
        await this.updateJobStatus(jobId, 'failed', {
          failedAt: new Date(),
          error: errorMessage,
        });

        // Update import record as failed
        await this.supabase
          .from('guest_imports')
          .update({
            status: 'failed',
            errors: [
              {
                row: 0,
                field: 'processing',
                message: errorMessage,
                severity: 'error',
                code: 'PROCESSING_FAILED',
              },
            ],
            updated_at: new Date(),
          })
          .eq('id', job.importId);
      }

      return {
        success: false,
        importId: job?.importId || '',
        totalRows: job?.totalRows || 0,
        validRows: 0,
        errorRows: job?.totalRows || 0,
        skippedRows: 0,
        duplicatesFound: 0,
        processingTime,
        errors: [
          {
            row: 0,
            field: 'processing',
            message: errorMessage,
            severity: 'error',
            code: 'PROCESSING_FAILED',
          },
        ],
        warnings: [],
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Queue a rollback job for a completed import
   */
  async queueRollbackJob(
    importId: string,
    reason: string,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'high',
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      // Check if import exists and has imported guests
      const { data: importRecord } = await this.supabase
        .from('guest_imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (!importRecord) {
        return { success: false, error: 'Import record not found' };
      }

      if (
        importRecord.status !== 'completed' ||
        importRecord.valid_rows === 0
      ) {
        return {
          success: false,
          error: 'No guests to rollback for this import',
        };
      }

      // Create rollback job
      const jobId = `guest_rollback_${importId}_${Date.now()}`;
      const jobData: GuestImportJobData = {
        ...importRecord,
        rollbackReason: reason,
      };

      const job: Partial<GuestImportJob> = {
        id: jobId,
        type: 'guest_import_rollback',
        importId,
        clientId: importRecord.client_id,
        status: 'queued',
        priority,
        data: jobData,
        progress: 0,
        totalRows: importRecord.valid_rows,
        processedRows: 0,
        validRows: 0,
        errorRows: 0,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 2,
      };

      // Store job record
      const { error: jobError } = await this.supabase
        .from('guest_import_jobs')
        .insert(job);

      if (jobError) {
        return { success: false, error: jobError.message };
      }

      // Schedule for immediate execution
      await this.scheduleJobExecution(jobId, new Date());

      return { success: true, jobId };
    } catch (error) {
      console.error('Failed to queue rollback job:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a rollback job
   */
  async processRollbackJob(jobId: string): Promise<RollbackJobResult> {
    const startTime = Date.now();
    let job: GuestImportJob | null = null;

    try {
      // Get job record
      const { data: jobData } = await this.supabase
        .from('guest_import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      job = jobData;
      if (!job) {
        throw new Error('Rollback job record not found');
      }

      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', {
        startedAt: new Date(),
      });

      // Delete all guests imported with this import ID
      const { data: deletedGuests, error: deleteError } = await this.supabase
        .from('guests')
        .delete()
        .eq('import_id', job.importId)
        .select('id');

      if (deleteError) {
        throw new Error(`Failed to delete guests: ${deleteError.message}`);
      }

      const deletedCount = deletedGuests?.length || 0;

      // Update import record status
      await this.supabase
        .from('guest_imports')
        .update({
          status: 'rolled_back',
          valid_rows: 0,
          rollback_reason: job.data.rollbackReason,
          rolled_back_at: new Date(),
          updated_at: new Date(),
        })
        .eq('id', job.importId);

      const rollbackTime = Date.now() - startTime;

      // Create result
      const result: RollbackJobResult = {
        success: true,
        importId: job.importId,
        deletedRows: deletedCount,
        restoredState: true,
        rollbackTime,
        errors: [],
      };

      // Update job completion
      await this.updateJobStatus(jobId, 'completed', {
        completedAt: new Date(),
        progress: 100,
        processedRows: deletedCount,
      });

      return result;
    } catch (error) {
      console.error(`Rollback job ${jobId} failed:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown rollback error';
      const rollbackTime = Date.now() - startTime;

      // Update job as failed
      if (job) {
        await this.updateJobStatus(jobId, 'failed', {
          failedAt: new Date(),
          error: errorMessage,
        });
      }

      return {
        success: false,
        importId: job?.importId || '',
        deletedRows: 0,
        restoredState: false,
        rollbackTime,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Parse import file content
   */
  private async parseImportFile(
    fileBuffer: ArrayBuffer,
    fileName: string,
  ): Promise<GuestData[]> {
    // Reuse the parsing logic from guest-import.ts
    return guestImportService['parseFileContent'](fileBuffer, fileName);
  }

  /**
   * Apply data transformations based on rules
   */
  private async applyDataTransformations(
    guestData: GuestData[],
    rules: DataTransformationRules,
    jobId: string,
  ): Promise<GuestData[]> {
    const transformedData = [...guestData];
    let processedCount = 0;

    for (const guest of transformedData) {
      // Normalize names
      if (rules.normalizeNames) {
        if (guest.first_name) {
          guest.first_name = this.normalizeName(guest.first_name);
        }
        if (guest.last_name) {
          guest.last_name = this.normalizeName(guest.last_name);
        }
        if (guest.plus_one_name) {
          guest.plus_one_name = this.normalizeName(guest.plus_one_name);
        }
      }

      // Format phone numbers
      if (rules.formatPhones && guest.phone) {
        guest.phone = this.formatPhoneNumber(guest.phone);
      }

      // Standardize dietary requirements
      if (rules.standardizeDietary && guest.dietary_requirements) {
        guest.dietary_requirements = this.standardizeDietary(
          guest.dietary_requirements,
        );
      }

      // Set default RSVP status
      if (!guest.rsvp_status) {
        guest.rsvp_status = rules.setDefaultRsvpStatus;
      }

      // Assign default table
      if (rules.assignDefaultTable && !guest.table_assignment) {
        guest.table_assignment = rules.assignDefaultTable;
      }

      // Auto-assign tables
      if (rules.autoAssignTables && !guest.table_assignment) {
        guest.table_assignment = this.autoAssignTable(
          processedCount,
          transformedData.length,
        );
      }

      processedCount++;

      // Update progress every 50 rows
      if (processedCount % 50 === 0) {
        const progress = Math.min(
          30 + (processedCount / transformedData.length) * 30,
          60,
        );
        await this.updateJobProgress(jobId, { progress });
      }
    }

    return transformedData;
  }

  /**
   * Insert valid guests into database
   */
  private async insertGuestsToDatabase(
    validGuests: GuestData[],
    clientId: string,
    importId: string,
    jobId: string,
  ): Promise<{ insertedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let insertedCount = 0;

    try {
      // Prepare guest records for insertion
      const guestRecords = validGuests.map((guest) => ({
        client_id: clientId,
        import_id: importId,
        first_name: guest.first_name,
        last_name: guest.last_name,
        email: guest.email,
        phone: guest.phone,
        dietary_requirements: guest.dietary_requirements,
        plus_one: guest.plus_one || false,
        plus_one_name: guest.plus_one_name,
        rsvp_status: guest.rsvp_status || 'pending',
        table_assignment: guest.table_assignment,
        notes: guest.notes,
        address: guest.address,
        city: guest.city,
        state: guest.state,
        zip_code: guest.zip_code,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Insert in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < guestRecords.length; i += batchSize) {
        const batch = guestRecords.slice(i, i + batchSize);

        const { data, error } = await this.supabase
          .from('guests')
          .insert(batch)
          .select('id');

        if (error) {
          errors.push(
            `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`,
          );
        } else {
          insertedCount += data?.length || batch.length;
        }

        // Update progress
        const progress =
          70 +
          (Math.min(i + batchSize, guestRecords.length) / guestRecords.length) *
            25;
        await this.updateJobProgress(jobId, {
          progress,
          processedRows: Math.min(i + batchSize, guestRecords.length),
          validRows: insertedCount,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown insertion error';
      errors.push(errorMessage);
    }

    return { insertedCount, errors };
  }

  /**
   * Helper methods for data transformation
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  private standardizeDietary(dietary: string): string {
    const lower = dietary.toLowerCase();
    const standardMap: Record<string, string> = {
      veg: 'Vegetarian',
      vegetarian: 'Vegetarian',
      vegan: 'Vegan',
      'gluten free': 'Gluten-Free',
      'gluten-free': 'Gluten-Free',
      'dairy free': 'Dairy-Free',
      'dairy-free': 'Dairy-Free',
      'nut allergy': 'Nut Allergy',
      shellfish: 'Shellfish Allergy',
      kosher: 'Kosher',
      halal: 'Halal',
    };

    for (const [key, value] of Object.entries(standardMap)) {
      if (lower.includes(key)) {
        return value;
      }
    }

    return dietary.trim();
  }

  private autoAssignTable(guestIndex: number, totalGuests: number): string {
    const guestsPerTable = 8;
    const tableNumber = Math.floor(guestIndex / guestsPerTable) + 1;
    return `Table ${tableNumber}`;
  }

  /**
   * Job management helper methods
   */
  private async scheduleJobExecution(
    jobId: string,
    scheduledFor: Date,
  ): Promise<void> {
    await this.supabase.from('journey_schedules').insert({
      id: `import_job_${jobId}`,
      instance_id: null,
      action_type: 'guest_import_process',
      action_data: { jobId },
      scheduled_for: scheduledFor.toISOString(),
      priority: 5,
      status: 'pending',
      created_at: new Date(),
    });
  }

  private async updateJobStatus(
    jobId: string,
    status: GuestImportJob['status'],
    updates: Partial<GuestImportJob> = {},
  ): Promise<void> {
    await this.supabase
      .from('guest_import_jobs')
      .update({
        status,
        ...updates,
        updated_at: new Date(),
      })
      .eq('id', jobId);
  }

  private async updateJobProgress(
    jobId: string,
    progress: Partial<
      Pick<
        GuestImportJob,
        'progress' | 'totalRows' | 'processedRows' | 'validRows' | 'errorRows'
      >
    >,
  ): Promise<void> {
    await this.supabase
      .from('guest_import_jobs')
      .update({
        ...progress,
        updated_at: new Date(),
      })
      .eq('id', jobId);
  }

  /**
   * Public API methods
   */
  async getJobStatus(jobId: string): Promise<GuestImportJob | null> {
    const { data } = await this.supabase
      .from('guest_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    return data;
  }

  async getImportJobs(clientId: string): Promise<GuestImportJob[]> {
    const { data } = await this.supabase
      .from('guest_import_jobs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  async cancelJob(
    jobId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: job } = await this.supabase
        .from('guest_import_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      if (job.status === 'processing') {
        return {
          success: false,
          error: 'Cannot cancel job that is currently processing',
        };
      }

      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        return { success: false, error: 'Job is already completed' };
      }

      await this.updateJobStatus(jobId, 'cancelled');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const guestImportProcessor = new GuestImportProcessor();
