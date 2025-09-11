/**
 * Document Storage Service
 * Extends Round 1 security patterns for business document management
 * WS-068: Wedding Business Compliance Hub
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import crypto from 'crypto';
import path from 'path';
import {
  fileUploadSecurity,
  FileUploadSecurity,
  FileValidationResult,
} from '@/lib/security/file-upload-security';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import type {
  BusinessDocument,
  DocumentWithCategory,
  DocumentCategory,
  DocumentUploadRequest,
  DocumentUploadProgress,
  DocumentLibraryFilters,
  DocumentLibraryResponse,
  CreateSharingLinkRequest,
  CreateSharingLinkResponse,
  DocumentSharingLink,
  ComplianceDashboardData,
  ExpiringDocument,
  DocumentStatistics,
  DocumentAccessControl,
  DocumentComplianceAlert,
  ComplianceStatus,
  SecurityLevel,
  DocumentFormData,
} from '@/types/documents';

export class DocumentStorageService {
  private supabase = createClientComponentClient();
  private fileUploadSecurity: FileUploadSecurity;

  constructor() {
    this.fileUploadSecurity = new FileUploadSecurity({
      allowedTypes: ['pdf', 'image', 'document'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFilesPerUser: 200,
      maxFilesPerDay: 100,
      requireAuthentication: true,
      requireCSRF: true,
      allowedDirectories: ['/documents'],
      quarantineDirectory: '/quarantine',
      encryptFiles: true,
      autoDeleteAfter: 8760, // 1 year in hours
    });
  }

  /**
   * Upload and validate a business document
   */
  async uploadDocument(
    request: DocumentUploadRequest,
    userId: string,
    onProgress?: (progress: DocumentUploadProgress) => void,
  ): Promise<BusinessDocument> {
    const startTime = Date.now();
    let uploadProgress: DocumentUploadProgress = {
      uploadId: '',
      filename: request.file.name,
      progress: 0,
      status: 'uploading',
      fileSize: request.file.size,
    };

    try {
      // Generate upload ID
      const uploadId = `doc_${Date.now()}_${crypto.randomUUID()}`;
      uploadProgress.uploadId = uploadId;
      onProgress?.(uploadProgress);

      // 1. Validate file security
      uploadProgress.status = 'validating';
      uploadProgress.progress = 10;
      onProgress?.(uploadProgress);

      const validation = await this.fileUploadSecurity.validateFile(
        request.file,
        userId,
      );
      if (!validation.isValid || !validation.isSafe) {
        throw new Error(
          `File validation failed: ${validation.issues.join(', ')}`,
        );
      }

      uploadProgress.virusScanStatus = validation.virusScan?.clean
        ? 'clean'
        : 'infected';
      uploadProgress.progress = 25;
      onProgress?.(uploadProgress);

      // 2. Check user limits and permissions
      await this.validateUserLimits(userId);

      // 3. Sanitize filename and generate storage path
      const sanitizedFilename = this.fileUploadSecurity.sanitizeFilename(
        request.file.name,
      );
      const storagePath = this.generateStoragePath(
        sanitizedFilename,
        userId,
        request.category_id,
      );

      uploadProgress.progress = 40;
      onProgress?.(uploadProgress);

      // 4. Upload file to Supabase Storage
      uploadProgress.status = 'processing';
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from('business-documents')
          .upload(storagePath, request.file, {
            cacheControl: '3600',
            upsert: false,
          });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      uploadProgress.progress = 70;
      onProgress?.(uploadProgress);

      // 5. Create document record in database
      const documentData: Partial<BusinessDocument> = {
        user_id: userId,
        category_id: request.category_id,
        original_filename: request.file.name,
        stored_filename: sanitizedFilename,
        file_path: uploadData.path,
        mime_type: request.file.type,
        file_size: request.file.size,
        file_hash: validation.metadata.hash,
        title: request.title,
        description: request.description,
        tags: request.tags || [],
        issued_date: request.issued_date,
        expiry_date: request.expiry_date,
        expiry_warning_days: request.expiry_warning_days || 30,
        is_compliance_required: request.is_compliance_required || false,
        security_level: request.security_level || 'standard',
        virus_scan_status: validation.virusScan?.clean ? 'clean' : 'pending',
        virus_scan_date: new Date().toISOString(),
        status: 'active',
        version: 1,
      };

      const { data: document, error: dbError } = await this.supabase
        .from('business_documents')
        .insert(documentData)
        .select('*')
        .single();

      if (dbError) {
        // Clean up uploaded file on database error
        await this.supabase.storage
          .from('business-documents')
          .remove([storagePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      uploadProgress.progress = 90;
      onProgress?.(uploadProgress);

      // 6. Set up compliance alerts if expiry date is provided
      if (request.expiry_date) {
        await this.setupComplianceAlerts(
          document.id,
          userId,
          parseISO(request.expiry_date),
        );
      }

      // 7. Log successful upload
      metrics.incrementCounter('document.upload.success', 1, {
        category: request.category_id,
        security_level: request.security_level || 'standard',
        file_type: this.getFileTypeFromMime(request.file.type),
        user_id: userId,
      });

      metrics.recordHistogram(
        'document.upload.duration',
        Date.now() - startTime,
      );

      uploadProgress.status = 'completed';
      uploadProgress.progress = 100;
      onProgress?.(uploadProgress);

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        filename: request.file.name,
        fileSize: request.file.size,
        category: request.category_id,
        userId,
      });

      return document as BusinessDocument;
    } catch (error) {
      uploadProgress.status = 'failed';
      uploadProgress.error =
        error instanceof Error ? error.message : 'Upload failed';
      onProgress?.(uploadProgress);

      metrics.incrementCounter('document.upload.error', 1, {
        error_type: error instanceof Error ? error.name : 'unknown',
        user_id: userId,
      });

      logger.error('Document upload failed', error as Error, {
        filename: request.file.name,
        userId,
      });

      throw error;
    }
  }

  /**
   * Get document library with filters and pagination
   */
  async getDocumentLibrary(
    userId: string,
    filters: DocumentLibraryFilters = {},
  ): Promise<DocumentLibraryResponse> {
    try {
      const {
        category_ids,
        tags,
        compliance_status,
        expiry_date_from,
        expiry_date_to,
        search,
        security_level,
        sort_by = 'created_at',
        sort_order = 'desc',
        page = 1,
        limit = 20,
      } = filters;

      // Build query with filters
      let query = this.supabase
        .from('documents_with_categories')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (category_ids?.length) {
        query = query.in('category_id', category_ids);
      }

      if (compliance_status?.length) {
        query = query.in('compliance_status', compliance_status);
      }

      if (security_level?.length) {
        query = query.in('security_level', security_level);
      }

      if (expiry_date_from) {
        query = query.gte('expiry_date', expiry_date_from);
      }

      if (expiry_date_to) {
        query = query.lte('expiry_date', expiry_date_to);
      }

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,original_filename.ilike.%${search}%`,
        );
      }

      if (tags?.length) {
        query = query.overlaps('tags', tags);
      }

      // Apply sorting and pagination
      query = query
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      const { data: documents, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      // Get statistics and categories
      const [statistics, categories] = await Promise.all([
        this.getDocumentStatistics(userId),
        this.getDocumentCategories(),
      ]);

      return {
        documents: documents as DocumentWithCategory[],
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > page * limit,
        statistics,
        categories,
      };
    } catch (error) {
      logger.error('Failed to get document library', error as Error, {
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(
    userId: string,
  ): Promise<ComplianceDashboardData> {
    try {
      // Get overview statistics
      const { data: stats } = await this.supabase
        .from('document_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      const statistics = stats || {
        total_documents: 0,
        expired_documents: 0,
        expiring_documents: 0,
        documents_with_expiry: 0,
      };

      const compliance_rate =
        statistics.documents_with_expiry > 0
          ? ((statistics.documents_with_expiry - statistics.expired_documents) /
              statistics.documents_with_expiry) *
            100
          : 100;

      // Get expiring documents
      const { data: expiringDocs } = await this.supabase
        .from('expiring_documents')
        .select('*')
        .eq('user_id', userId)
        .order('days_until_expiry', { ascending: true })
        .limit(10);

      // Get category breakdown
      const { data: categoryBreakdown } = await this.supabase
        .from('business_documents')
        .select(
          `
          category_id,
          document_categories!inner(display_name, icon, color),
          compliance_status
        `,
        )
        .eq('user_id', userId)
        .eq('status', 'active');

      // Process category statistics
      const categoryMap = new Map();
      categoryBreakdown?.forEach((doc) => {
        const key = doc.category_id;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            category: doc.document_categories,
            document_count: 0,
            expired_count: 0,
            expiring_count: 0,
            compliance_rate: 0,
          });
        }

        const stats = categoryMap.get(key);
        stats.document_count++;
        if (doc.compliance_status === 'expired') stats.expired_count++;
        if (doc.compliance_status === 'expiring') stats.expiring_count++;
      });

      // Calculate compliance rates
      const categories = Array.from(categoryMap.values()).map((cat) => ({
        ...cat,
        compliance_rate:
          cat.document_count > 0
            ? ((cat.document_count - cat.expired_count) / cat.document_count) *
              100
            : 100,
      }));

      // Get recent uploads
      const { data: recentUploads } = await this.supabase
        .from('documents_with_categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get active alerts
      const { data: alerts } = await this.supabase
        .from('document_compliance_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('next_trigger_at', { ascending: true })
        .limit(10);

      return {
        overview: {
          total_documents: statistics.total_documents,
          expired_documents: statistics.expired_documents,
          expiring_soon: statistics.expiring_documents,
          compliance_rate: Math.round(compliance_rate),
        },
        expiring_documents: (expiringDocs as ExpiringDocument[]) || [],
        categories,
        recent_uploads: (recentUploads as DocumentWithCategory[]) || [],
        alerts: (alerts as DocumentComplianceAlert[]) || [],
      };
    } catch (error) {
      logger.error('Failed to get compliance dashboard', error as Error, {
        userId,
      });
      throw error;
    }
  }

  /**
   * Create secure sharing link
   */
  async createSharingLink(
    request: CreateSharingLinkRequest,
    userId: string,
  ): Promise<CreateSharingLinkResponse> {
    try {
      // Verify document ownership
      const { data: document, error: docError } = await this.supabase
        .from('business_documents')
        .select('*')
        .eq('id', request.document_id)
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        throw new Error('Document not found or access denied');
      }

      // Generate secure token
      const linkToken = crypto.randomBytes(32).toString('hex');

      // Calculate expiry time
      const expiresAt = request.expires_in_hours
        ? addDays(
            new Date(),
            Math.ceil(request.expires_in_hours / 24),
          ).toISOString()
        : undefined;

      // Hash password if provided
      const passwordHash = request.password
        ? crypto.createHash('sha256').update(request.password).digest('hex')
        : undefined;

      // Create sharing link record
      const linkData = {
        document_id: request.document_id,
        created_by: userId,
        link_token: linkToken,
        link_type: request.link_type,
        password_hash: passwordHash,
        require_email: request.require_email || false,
        allowed_emails: request.allowed_emails || [],
        max_uses: request.max_uses,
        expires_at: expiresAt,
        is_active: true,
      };

      const { data: link, error: linkError } = await this.supabase
        .from('document_sharing_links')
        .insert(linkData)
        .select('*')
        .single();

      if (linkError) {
        throw new Error(`Failed to create sharing link: ${linkError.message}`);
      }

      // Generate share URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.com';
      const shareUrl = `${baseUrl}/share/${linkToken}`;

      logger.info('Document sharing link created', {
        linkId: link.id,
        documentId: request.document_id,
        linkType: request.link_type,
        expiresAt,
        userId,
      });

      return {
        link: link as DocumentSharingLink,
        share_url: shareUrl,
      };
    } catch (error) {
      logger.error('Failed to create sharing link', error as Error, {
        request,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update document expiry tracking
   */
  async updateExpiryTracking(
    documentId: string,
    userId: string,
    expiryDate: string,
    warningDays: number = 30,
  ): Promise<void> {
    try {
      // Update document
      const { error } = await this.supabase
        .from('business_documents')
        .update({
          expiry_date: expiryDate,
          expiry_warning_days: warningDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update expiry tracking: ${error.message}`);
      }

      // Update or create compliance alerts
      await this.setupComplianceAlerts(
        documentId,
        userId,
        parseISO(expiryDate),
      );

      logger.info('Document expiry tracking updated', {
        documentId,
        expiryDate,
        warningDays,
        userId,
      });
    } catch (error) {
      logger.error('Failed to update expiry tracking', error as Error, {
        documentId,
        expiryDate,
        warningDays,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete document and clean up storage
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      // Get document for cleanup
      const { data: document, error: docError } = await this.supabase
        .from('business_documents')
        .select('file_path')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        throw new Error('Document not found or access denied');
      }

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('business-documents')
        .remove([document.file_path]);

      if (storageError) {
        logger.warn('Failed to delete file from storage', {
          error: storageError,
          documentId,
        });
      }

      // Delete from database (cascades to related tables)
      const { error: deleteError } = await this.supabase
        .from('business_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete document: ${deleteError.message}`);
      }

      logger.info('Document deleted successfully', { documentId, userId });
    } catch (error) {
      logger.error('Failed to delete document', error as Error, {
        documentId,
        userId,
      });
      throw error;
    }
  }

  // Private helper methods

  private async validateUserLimits(userId: string): Promise<void> {
    const { data: stats } = await this.supabase
      .from('document_statistics')
      .select('total_documents, total_storage_used')
      .eq('user_id', userId)
      .single();

    if (stats?.total_documents >= 200) {
      throw new Error('Document limit exceeded. Please upgrade your plan.');
    }

    if (stats?.total_storage_used >= 5 * 1024 * 1024 * 1024) {
      // 5GB
      throw new Error('Storage limit exceeded. Please upgrade your plan.');
    }
  }

  private generateStoragePath(
    filename: string,
    userId: string,
    categoryId: string,
  ): string {
    const datePath = format(new Date(), 'yyyy/MM/dd');
    const userHash = crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, 8);
    return `${datePath}/${userHash}/${categoryId}/${filename}`;
  }

  private async setupComplianceAlerts(
    documentId: string,
    userId: string,
    expiryDate: Date,
  ): Promise<void> {
    try {
      // Delete existing alerts
      await this.supabase
        .from('document_compliance_alerts')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId);

      // Create expiry warning alert
      const warningDate = addDays(expiryDate, -30);
      const alertData = {
        document_id: documentId,
        user_id: userId,
        alert_type: 'expiry_warning',
        trigger_days_before: 30,
        is_active: true,
        next_trigger_at: warningDate.toISOString(),
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
      };

      await this.supabase.from('document_compliance_alerts').insert(alertData);
    } catch (error) {
      logger.warn('Failed to setup compliance alerts', { error, documentId });
    }
  }

  private async getDocumentStatistics(
    userId: string,
  ): Promise<DocumentStatistics> {
    const { data } = await this.supabase
      .from('document_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();

    return (
      data || {
        user_id: userId,
        total_documents: 0,
        documents_with_expiry: 0,
        expired_documents: 0,
        expiring_documents: 0,
        total_storage_used: 0,
        last_upload_date: undefined,
      }
    );
  }

  private async getDocumentCategories(): Promise<DocumentCategory[]> {
    const { data } = await this.supabase
      .from('document_categories')
      .select('*')
      .order('sort_order');

    return data || [];
  }

  private getFileTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word'))
      return 'document';
    return 'other';
  }

  /**
   * Calculate compliance status based on expiry date
   */
  private calculateComplianceStatus(
    expiryDate: string | null,
  ): ComplianceStatus {
    if (!expiryDate) return 'valid';

    const expiry = parseISO(expiryDate);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiry, now);

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'valid';
  }
}

// Export singleton instance
export const documentStorageService = new DocumentStorageService();
