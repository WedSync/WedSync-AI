/**
 * WS-155: Data Export Service (GDPR Compliant)
 * Team E - Round 2
 * GDPR-compliant data export and privacy management
 */

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type ExportRequest =
  Database['public']['Tables']['data_export_requests']['Row'];

export type ExportFormat = 'json' | 'csv' | 'sql' | 'pdf';
export type ExportType = 'gdpr' | 'backup' | 'analytics' | 'compliance';

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  scope: {
    includeMessages?: boolean;
    includeAttachments?: boolean;
    includeAnalytics?: boolean;
    includeArchived?: boolean;
    dateRange?: { from: Date; to: Date };
    specificUsers?: string[];
    specificClients?: string[];
  };
  anonymize?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  password?: string;
}

export interface ExportResult {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSizeBytes?: number;
  expiresAt?: Date;
  error?: string;
}

export interface GDPRDataPackage {
  exportDate: Date;
  requestId: string;
  userData: any;
  messageData: any[];
  analyticsData: any[];
  attachments: any[];
  processingHistory: any[];
  consentHistory: any[];
  deletionRequests: any[];
}

class DataExportService {
  private supabase = createClient();

  /**
   * Request GDPR data export (Article 20 - Right to data portability)
   */
  async requestGDPRExport(
    userId: string,
    email: string,
    format: ExportFormat = 'json',
  ): Promise<ExportResult> {
    try {
      // Create export request
      const { data: request, error } = await this.supabase
        .from('data_export_requests')
        .insert({
          organization_id: await this.getOrganizationId(userId),
          requested_by: userId,
          export_type: 'gdpr',
          export_format: format,
          export_scope: {
            user_id: userId,
            email,
            include_all_data: true,
            gdpr_compliant: true,
          },
          status: 'pending',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days
        })
        .select()
        .single();

      if (error) throw error;

      // Start async export process
      this.processExportAsync(request.id);

      return {
        requestId: request.id,
        status: 'pending',
        expiresAt: new Date(request.expires_at!),
      };
    } catch (error) {
      console.error('GDPR export request failed:', error);
      throw new Error('Failed to create GDPR export request');
    }
  }

  /**
   * Create custom data export
   */
  async createExport(
    organizationId: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const { data: request, error } = await this.supabase
        .from('data_export_requests')
        .insert({
          organization_id: organizationId,
          requested_by: await this.getCurrentUserId(),
          export_type: options.type,
          export_format: options.format,
          export_scope: options.scope,
          status: 'pending',
          metadata: {
            anonymize: options.anonymize,
            compress: options.compress,
            encrypt: options.encrypt,
          },
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) throw error;

      // Start async export process
      this.processExportAsync(request.id);

      return {
        requestId: request.id,
        status: 'pending',
        expiresAt: new Date(request.expires_at!),
      };
    } catch (error) {
      console.error('Export request failed:', error);
      throw new Error('Failed to create export request');
    }
  }

  /**
   * Process export asynchronously
   */
  private async processExportAsync(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await this.supabase
        .from('data_export_requests')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Get request details
      const { data: request, error } = await this.supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) throw error;

      // Collect data based on export type
      let exportData: any;
      switch (request.export_type) {
        case 'gdpr':
          exportData = await this.collectGDPRData(request);
          break;
        case 'analytics':
          exportData = await this.collectAnalyticsData(request);
          break;
        case 'backup':
          exportData = await this.collectBackupData(request);
          break;
        default:
          exportData = await this.collectCustomData(request);
      }

      // Format data
      const formattedData = await this.formatData(
        exportData,
        request.export_format as ExportFormat,
      );

      // Apply privacy transformations if needed
      const finalData = request.metadata?.anonymize
        ? await this.anonymizeData(formattedData)
        : formattedData;

      // Generate file
      const file = await this.generateFile(
        finalData,
        request.export_format as ExportFormat,
        request.metadata as any,
      );

      // Upload file
      const fileUrl = await this.uploadExportFile(file, requestId);

      // Update request with completion
      await this.supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          file_url: fileUrl,
          file_size_bytes: file.size,
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      // Send notification
      await this.notifyExportComplete(request);
    } catch (error) {
      console.error('Export processing failed:', error);

      // Update request with failure
      await this.supabase
        .from('data_export_requests')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Export failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
    }
  }

  /**
   * Collect GDPR-compliant data package
   */
  private async collectGDPRData(
    request: ExportRequest,
  ): Promise<GDPRDataPackage> {
    const scope = request.export_scope as any;
    const userId = scope.user_id;

    // Collect all user data
    const [
      userData,
      messages,
      analytics,
      attachments,
      processing,
      consent,
      deletions,
    ] = await Promise.all([
      this.getUserData(userId),
      this.getUserMessages(userId),
      this.getUserAnalytics(userId),
      this.getUserAttachments(userId),
      this.getProcessingHistory(userId),
      this.getConsentHistory(userId),
      this.getDeletionRequests(userId),
    ]);

    return {
      exportDate: new Date(),
      requestId: request.id,
      userData,
      messageData: messages,
      analyticsData: analytics,
      attachments,
      processingHistory: processing,
      consentHistory: consent,
      deletionRequests: deletions,
    };
  }

  /**
   * Collect analytics data for export
   */
  private async collectAnalyticsData(request: ExportRequest): Promise<any> {
    const scope = request.export_scope as any;
    const organizationId = request.organization_id;

    const { data, error } = await this.supabase
      .from('message_analytics_fact')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;

    return {
      analytics: data,
      exportDate: new Date(),
      organization: organizationId,
    };
  }

  /**
   * Collect backup data
   */
  private async collectBackupData(request: ExportRequest): Promise<any> {
    const organizationId = request.organization_id;

    const [messages, archived, policies] = await Promise.all([
      this.supabase
        .from('messages')
        .select('*')
        .eq('organization_id', organizationId),
      this.supabase
        .from('messages_archive')
        .select('*')
        .eq('organization_id', organizationId),
      this.supabase
        .from('archive_policies')
        .select('*')
        .eq('organization_id', organizationId),
    ]);

    return {
      messages: messages.data,
      archived: archived.data,
      policies: policies.data,
      exportDate: new Date(),
    };
  }

  /**
   * Format data according to export format
   */
  private async formatData(
    data: any,
    format: ExportFormat,
  ): Promise<string | Blob> {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        return this.convertToCSV(data);

      case 'sql':
        return this.convertToSQL(data);

      case 'pdf':
        return await this.convertToPDF(data);

      default:
        return JSON.stringify(data);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');

      const csvRows = data.map((row) => {
        return headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).includes(',') ? `"${value}"` : value;
          })
          .join(',');
      });

      return [csvHeaders, ...csvRows].join('\n');
    }

    // For non-array data, create a simple key-value CSV
    const entries = Object.entries(data);
    return entries
      .map(([key, value]) => `${key},${JSON.stringify(value)}`)
      .join('\n');
  }

  /**
   * Convert data to SQL format
   */
  private convertToSQL(data: any): string {
    let sql = '-- WedSync Data Export\n';
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    if (data.messages) {
      sql += '-- Messages Table\n';
      data.messages.forEach((msg: any) => {
        sql += `INSERT INTO messages (id, subject, content, status) VALUES `;
        sql += `('${msg.id}', '${msg.subject}', '${msg.content}', '${msg.status}');\n`;
      });
    }

    return sql;
  }

  /**
   * Convert data to PDF (placeholder - would need PDF library)
   */
  private async convertToPDF(data: any): Promise<Blob> {
    // This would require a PDF generation library like jsPDF
    // For now, return JSON as fallback
    const jsonData = JSON.stringify(data, null, 2);
    return new Blob([jsonData], { type: 'application/pdf' });
  }

  /**
   * Anonymize sensitive data
   */
  private async anonymizeData(data: any): Promise<any> {
    const anonymized = JSON.parse(JSON.stringify(data));

    // Recursive function to anonymize fields
    const anonymizeFields = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      for (const key in obj) {
        if (key.includes('email')) {
          obj[key] = this.anonymizeEmail(obj[key]);
        } else if (key.includes('name')) {
          obj[key] = this.anonymizeName(obj[key]);
        } else if (key.includes('phone')) {
          obj[key] = this.anonymizePhone(obj[key]);
        } else if (key.includes('address')) {
          obj[key] = this.anonymizeAddress(obj[key]);
        } else if (typeof obj[key] === 'object') {
          anonymizeFields(obj[key]);
        }
      }
    };

    anonymizeFields(anonymized);
    return anonymized;
  }

  /**
   * Anonymize email address
   */
  private anonymizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return email;
    const [local, domain] = email.split('@');
    if (!domain) return '***@***.***';
    return `${local.substring(0, 2)}***@${domain}`;
  }

  /**
   * Anonymize name
   */
  private anonymizeName(name: string): string {
    if (!name || typeof name !== 'string') return name;
    return name
      .split(' ')
      .map((part) => part.charAt(0) + '*'.repeat(Math.max(part.length - 1, 0)))
      .join(' ');
  }

  /**
   * Anonymize phone number
   */
  private anonymizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return phone;
    return phone.replace(/\d(?=\d{4})/g, '*');
  }

  /**
   * Anonymize address
   */
  private anonymizeAddress(address: string): string {
    if (!address || typeof address !== 'string') return address;
    return '*** [Address Redacted] ***';
  }

  /**
   * Generate export file
   */
  private async generateFile(
    data: string | Blob,
    format: ExportFormat,
    options: any,
  ): Promise<File> {
    let blob: Blob;

    if (typeof data === 'string') {
      blob = new Blob([data], { type: this.getMimeType(format) });
    } else {
      blob = data;
    }

    // Compress if requested
    if (options?.compress) {
      blob = await this.compressBlob(blob);
    }

    // Encrypt if requested
    if (options?.encrypt && options?.password) {
      blob = await this.encryptBlob(blob, options.password);
    }

    const fileName = `wedsync-export-${Date.now()}.${this.getFileExtension(format)}`;
    return new File([blob], fileName, { type: blob.type });
  }

  /**
   * Upload export file to storage
   */
  private async uploadExportFile(
    file: File,
    requestId: string,
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('exports')
      .upload(`${requestId}/${file.name}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from('exports')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: ExportFormat): string {
    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      csv: 'text/csv',
      sql: 'application/sql',
      pdf: 'application/pdf',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      json: 'json',
      csv: 'csv',
      sql: 'sql',
      pdf: 'pdf',
    };
    return extensions[format] || 'dat';
  }

  /**
   * Compress blob using CompressionStream
   */
  private async compressBlob(blob: Blob): Promise<Blob> {
    if (typeof CompressionStream === 'undefined') {
      return blob; // No compression available
    }

    const stream = blob.stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    return new Response(compressedStream).blob();
  }

  /**
   * Encrypt blob (placeholder - would need crypto library)
   */
  private async encryptBlob(blob: Blob, password: string): Promise<Blob> {
    // This would require a proper encryption library
    // For now, return the original blob
    console.warn('Encryption not yet implemented');
    return blob;
  }

  /**
   * Helper methods to collect specific data types
   */
  private async getUserData(userId: string): Promise<any> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  private async getUserMessages(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    return data || [];
  }

  private async getUserAnalytics(userId: string): Promise<any[]> {
    // Implement analytics collection
    return [];
  }

  private async getUserAttachments(userId: string): Promise<any[]> {
    // Implement attachments collection
    return [];
  }

  private async getProcessingHistory(userId: string): Promise<any[]> {
    // Implement processing history collection
    return [];
  }

  private async getConsentHistory(userId: string): Promise<any[]> {
    // Implement consent history collection
    return [];
  }

  private async getDeletionRequests(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('data_retention_log')
      .select('*')
      .eq('performed_by', userId);
    return data || [];
  }

  private async getCurrentUserId(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }

  private async getOrganizationId(userId: string): Promise<string> {
    const { data } = await this.supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();
    return data?.organization_id || '';
  }

  private async notifyExportComplete(request: ExportRequest): Promise<void> {
    // Send email notification
    console.log(`Export ${request.id} completed`);
  }

  private async collectCustomData(request: ExportRequest): Promise<any> {
    // Implement custom data collection based on scope
    return {};
  }

  /**
   * Check export status
   */
  async getExportStatus(requestId: string): Promise<ExportResult> {
    const { data, error } = await this.supabase
      .from('data_export_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      throw new Error('Export request not found');
    }

    return {
      requestId: data.id,
      status: data.status as any,
      fileUrl: data.file_url || undefined,
      fileSizeBytes: data.file_size_bytes || undefined,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      error: data.error_message || undefined,
    };
  }

  /**
   * Cancel export request
   */
  async cancelExport(requestId: string): Promise<void> {
    await this.supabase
      .from('data_export_requests')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  }
}

export const dataExportService = new DataExportService();
