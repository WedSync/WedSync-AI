/**
 * Guest List Import Infrastructure - WS-151
 * Team C - Batch 13: Secure file upload, CSV/Excel parsing, progress tracking
 *
 * Features:
 * - Handle file uploads up to 10MB
 * - Process CSV/Excel files with 1000+ rows
 * - Background processing with job queues
 * - Progress tracking and error reporting
 * - Data transformation and rollback mechanisms
 */

import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { validateFile, parseCSVContent } from '../validation/guest-validation';

export interface GuestImportFile {
  id: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadUrl?: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  processedRows: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdAt: Date;
  updatedAt: Date;
  errors?: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  value?: any;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ImportProgress {
  importId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep: string;
  processedRows: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  startedAt?: Date;
  completedAt?: Date;
  errors: ImportError[];
  warnings: ImportError[];
}

export interface GuestRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  dietary_requirements?: string;
  plus_one?: boolean;
  plus_one_name?: string;
  rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'tentative';
  table_assignment?: string;
  notes?: string;
  row_number: number;
}

export class GuestImportService {
  private readonly supabase = createClient();
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain',
  ];
  private readonly allowedExtensions = ['.csv', '.xlsx', '.xls'];

  /**
   * Validate and prepare file for upload
   */
  async validateFileUpload(
    file: File,
    clientId: string,
  ): Promise<{ valid: boolean; errors: string[]; importId?: string }> {
    const errors: string[] = [];

    // Validate file size
    if (file.size > this.maxFileSize) {
      errors.push(
        `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`,
      );
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedExtensions.includes(fileExtension)) {
      errors.push(
        `File type '${fileExtension}' is not supported. Please upload CSV or Excel files.`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.type) && file.type !== '') {
      errors.push(`MIME type '${file.type}' is not allowed`);
    }

    // Validate file name
    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }

    // Check for suspicious file content patterns
    if (
      file.name.includes('..') ||
      file.name.includes('/') ||
      file.name.includes('\\')
    ) {
      errors.push('File name contains invalid characters');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Create import record
    const importId = `guest_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { error } = await this.supabase.from('guest_imports').insert({
        id: importId,
        client_id: clientId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        status: 'uploading',
        processed_rows: 0,
        total_rows: 0,
        valid_rows: 0,
        error_rows: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      if (error) {
        console.error('Failed to create import record:', error);
        errors.push('Failed to initialize import process');
        return { valid: false, errors };
      }

      return { valid: true, errors: [], importId };
    } catch (error) {
      console.error('Database error during import validation:', error);
      errors.push('Database error occurred');
      return { valid: false, errors };
    }
  }

  /**
   * Upload file to Supabase Storage with progress tracking
   */
  async uploadFile(
    file: File,
    importId: string,
    onProgress?: (progress: number) => void,
  ): Promise<{ success: boolean; error?: string; uploadUrl?: string }> {
    try {
      // Generate unique file path
      const fileName = `guest-imports/${importId}/${file.name}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('guest-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        await this.updateImportStatus(importId, 'failed', {
          errors: [
            {
              row: 0,
              message: `Upload failed: ${error.message}`,
              severity: 'error',
              code: 'UPLOAD_FAILED',
            },
          ],
        });
        return { success: false, error: error.message };
      }

      // Update import record with upload URL
      const uploadUrl = data.path;
      await this.supabase
        .from('guest_imports')
        .update({
          upload_url: uploadUrl,
          status: 'uploaded',
          updated_at: new Date(),
        })
        .eq('id', importId);

      onProgress?.(100);

      return { success: true, uploadUrl };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown upload error';
      await this.updateImportStatus(importId, 'failed', {
        errors: [
          {
            row: 0,
            message: `Upload error: ${errorMessage}`,
            severity: 'error',
            code: 'UPLOAD_ERROR',
          },
        ],
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process uploaded file and extract guest data
   */
  async processImportFile(importId: string): Promise<ImportProgress> {
    const progress: ImportProgress = {
      importId,
      status: 'processing',
      progress: 0,
      currentStep: 'Initializing',
      processedRows: 0,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      startedAt: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      await this.updateImportStatus(importId, 'processing', { progress: 5 });
      progress.progress = 5;
      progress.currentStep = 'Reading file';

      // Get import record
      const { data: importRecord } = await this.supabase
        .from('guest_imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (!importRecord || !importRecord.upload_url) {
        throw new Error('Import record or upload URL not found');
      }

      // Download file from storage
      const { data: fileData, error: downloadError } =
        await this.supabase.storage
          .from('guest-uploads')
          .download(importRecord.upload_url);

      if (downloadError) {
        throw new Error(`File download failed: ${downloadError.message}`);
      }

      progress.progress = 15;
      progress.currentStep = 'Parsing file content';
      await this.updateProgressStatus(importId, progress);

      // Parse file content
      const fileBuffer = await fileData.arrayBuffer();
      const guestData = await this.parseFileContent(
        fileBuffer,
        importRecord.file_name,
      );

      progress.totalRows = guestData.length;
      progress.progress = 30;
      progress.currentStep = 'Validating guest data';
      await this.updateProgressStatus(importId, progress);

      // Validate each guest record
      const validatedData = await this.validateGuestData(
        guestData,
        progress,
        importId,
      );

      progress.validRows = validatedData.valid.length;
      progress.errorRows = validatedData.invalid.length;
      progress.processedRows =
        validatedData.valid.length + validatedData.invalid.length;
      progress.errors = validatedData.errors;
      progress.warnings = validatedData.warnings;
      progress.progress = 70;
      progress.currentStep = 'Saving valid guest records';
      await this.updateProgressStatus(importId, progress);

      // Save valid guest records to database
      if (validatedData.valid.length > 0) {
        const { error: insertError } = await this.supabase
          .from('guests')
          .insert(
            validatedData.valid.map((guest) => ({
              client_id: importRecord.client_id,
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
              created_at: new Date(),
              updated_at: new Date(),
            })),
          );

        if (insertError) {
          throw new Error(
            `Failed to save guest records: ${insertError.message}`,
          );
        }
      }

      progress.progress = 100;
      progress.currentStep = 'Completed';
      progress.status =
        validatedData.errors.length > 0 ? 'completed' : 'completed';
      progress.completedAt = new Date();

      await this.updateImportStatus(importId, 'completed', {
        processedRows: progress.processedRows,
        validRows: progress.validRows,
        errorRows: progress.errorRows,
        errors: progress.errors,
        warnings: progress.warnings,
      });

      return progress;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';
      progress.status = 'failed';
      progress.errors.push({
        row: 0,
        message: errorMessage,
        severity: 'error',
        code: 'PROCESSING_ERROR',
      });

      await this.updateImportStatus(importId, 'failed', {
        errors: progress.errors,
      });

      return progress;
    }
  }

  /**
   * Parse file content (CSV or Excel)
   */
  private async parseFileContent(
    fileBuffer: ArrayBuffer,
    fileName: string,
  ): Promise<GuestRow[]> {
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      // Parse Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      // Convert to guest rows with headers
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      return dataRows.map((row, index) => {
        const guestRow: GuestRow = { row_number: index + 2 };

        row.forEach((cell, cellIndex) => {
          const header = headers[cellIndex]?.toLowerCase().trim();
          if (!header || cell === undefined || cell === null || cell === '')
            return;

          // Map headers to guest fields
          switch (header) {
            case 'first name':
            case 'first_name':
            case 'firstname':
            case 'fname':
              guestRow.first_name = String(cell).trim();
              break;
            case 'last name':
            case 'last_name':
            case 'lastname':
            case 'lname':
            case 'surname':
              guestRow.last_name = String(cell).trim();
              break;
            case 'email':
            case 'email address':
            case 'email_address':
              guestRow.email = String(cell).trim().toLowerCase();
              break;
            case 'phone':
            case 'phone number':
            case 'phone_number':
            case 'mobile':
            case 'cell':
              guestRow.phone = String(cell).trim();
              break;
            case 'dietary requirements':
            case 'dietary_requirements':
            case 'dietary':
            case 'allergies':
            case 'special dietary needs':
              guestRow.dietary_requirements = String(cell).trim();
              break;
            case 'plus one':
            case 'plus_one':
            case '+1':
            case 'bring guest':
              guestRow.plus_one = this.parseBoolean(cell);
              break;
            case 'plus one name':
            case 'plus_one_name':
            case '+1 name':
            case 'guest name':
              guestRow.plus_one_name = String(cell).trim();
              break;
            case 'rsvp':
            case 'rsvp status':
            case 'rsvp_status':
            case 'attendance':
              guestRow.rsvp_status = this.parseRsvpStatus(String(cell).trim());
              break;
            case 'table':
            case 'table assignment':
            case 'table_assignment':
            case 'table number':
              guestRow.table_assignment = String(cell).trim();
              break;
            case 'notes':
            case 'comments':
            case 'special notes':
            case 'remarks':
              guestRow.notes = String(cell).trim();
              break;
          }
        });

        return guestRow;
      });
    } else {
      // Parse CSV file
      const csvText = new TextDecoder().decode(fileBuffer);
      return parseCSVContent(csvText);
    }
  }

  /**
   * Validate guest data and separate valid/invalid records
   */
  private async validateGuestData(
    guestData: GuestRow[],
    progress: ImportProgress,
    importId: string,
  ): Promise<{
    valid: GuestRow[];
    invalid: GuestRow[];
    errors: ImportError[];
    warnings: ImportError[];
  }> {
    const valid: GuestRow[] = [];
    const invalid: GuestRow[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    let processedCount = 0;

    for (const guest of guestData) {
      const guestErrors: ImportError[] = [];
      const guestWarnings: ImportError[] = [];

      // Validate required fields
      if (!guest.first_name && !guest.last_name && !guest.email) {
        guestErrors.push({
          row: guest.row_number,
          field: 'required',
          message: 'At least first name, last name, or email must be provided',
          severity: 'error',
          code: 'MISSING_REQUIRED_FIELD',
        });
      }

      // Validate email format
      if (guest.email && !this.isValidEmail(guest.email)) {
        guestErrors.push({
          row: guest.row_number,
          field: 'email',
          value: guest.email,
          message: 'Invalid email format',
          severity: 'error',
          code: 'INVALID_EMAIL',
        });
      }

      // Validate phone format
      if (guest.phone && !this.isValidPhone(guest.phone)) {
        guestWarnings.push({
          row: guest.row_number,
          field: 'phone',
          value: guest.phone,
          message: 'Phone number format may be invalid',
          severity: 'warning',
          code: 'INVALID_PHONE_FORMAT',
        });
      }

      // Validate RSVP status
      if (
        guest.rsvp_status &&
        !['pending', 'attending', 'not_attending', 'tentative'].includes(
          guest.rsvp_status,
        )
      ) {
        guestWarnings.push({
          row: guest.row_number,
          field: 'rsvp_status',
          value: guest.rsvp_status,
          message: 'Invalid RSVP status, defaulting to pending',
          severity: 'warning',
          code: 'INVALID_RSVP_STATUS',
        });
        guest.rsvp_status = 'pending';
      }

      // Add to appropriate array
      if (guestErrors.length === 0) {
        valid.push(guest);
      } else {
        invalid.push(guest);
        errors.push(...guestErrors);
      }

      warnings.push(...guestWarnings);

      // Update progress every 50 rows
      processedCount++;
      if (processedCount % 50 === 0) {
        const currentProgress = Math.min(
          30 + (processedCount / guestData.length) * 40,
          70,
        );
        progress.progress = currentProgress;
        progress.processedRows = processedCount;
        await this.updateProgressStatus(importId, progress);
      }
    }

    return { valid, invalid, errors, warnings };
  }

  /**
   * Utility functions
   */
  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase().trim();
    return ['true', '1', 'yes', 'y', 'on'].includes(str);
  }

  private parseRsvpStatus(
    value: string,
  ): 'pending' | 'attending' | 'not_attending' | 'tentative' {
    const lower = value.toLowerCase();
    if (lower.includes('attend') && !lower.includes('not')) return 'attending';
    if (lower.includes('not') || lower.includes('decline'))
      return 'not_attending';
    if (lower.includes('tentative') || lower.includes('maybe'))
      return 'tentative';
    return 'pending';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    return (
      /^[\+]?[\d]+$/.test(cleaned) &&
      cleaned.length >= 10 &&
      cleaned.length <= 15
    );
  }

  /**
   * Update import status in database
   */
  private async updateImportStatus(
    importId: string,
    status: string,
    updates: Partial<{
      progress: number;
      processedRows: number;
      validRows: number;
      errorRows: number;
      errors: ImportError[];
      warnings: ImportError[];
    }> = {},
  ): Promise<void> {
    try {
      await this.supabase
        .from('guest_imports')
        .update({
          status,
          ...updates,
          updated_at: new Date(),
        })
        .eq('id', importId);
    } catch (error) {
      console.error('Failed to update import status:', error);
    }
  }

  /**
   * Update progress status with full progress object
   */
  private async updateProgressStatus(
    importId: string,
    progress: ImportProgress,
  ): Promise<void> {
    await this.updateImportStatus(importId, progress.status, {
      progress: progress.progress,
      processedRows: progress.processedRows,
      validRows: progress.validRows,
      errorRows: progress.errorRows,
    });
  }

  /**
   * Get import progress
   */
  async getImportProgress(importId: string): Promise<ImportProgress | null> {
    try {
      const { data } = await this.supabase
        .from('guest_imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (!data) return null;

      return {
        importId: data.id,
        status: data.status,
        progress: data.progress || 0,
        currentStep: this.getStepFromStatus(data.status),
        processedRows: data.processed_rows || 0,
        totalRows: data.total_rows || 0,
        validRows: data.valid_rows || 0,
        errorRows: data.error_rows || 0,
        startedAt: data.created_at ? new Date(data.created_at) : undefined,
        completedAt: data.completed_at
          ? new Date(data.completed_at)
          : undefined,
        errors: data.errors || [],
        warnings: data.warnings || [],
      };
    } catch (error) {
      console.error('Failed to get import progress:', error);
      return null;
    }
  }

  private getStepFromStatus(status: string): string {
    switch (status) {
      case 'uploading':
        return 'Uploading file';
      case 'uploaded':
        return 'File uploaded';
      case 'processing':
        return 'Processing data';
      case 'completed':
        return 'Import completed';
      case 'failed':
        return 'Import failed';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Rollback import - delete all imported guests
   */
  async rollbackImport(
    importId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete all guests imported with this import ID
      const { error: deleteError } = await this.supabase
        .from('guests')
        .delete()
        .eq('import_id', importId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // Update import status to indicate rollback
      await this.supabase
        .from('guest_imports')
        .update({
          status: 'rolled_back',
          updated_at: new Date(),
        })
        .eq('id', importId);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown rollback error';
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const guestImportService = new GuestImportService();
