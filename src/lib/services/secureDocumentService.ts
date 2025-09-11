import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  generateSecureToken,
  encryptData,
  decryptData,
} from '@/lib/crypto-utils';
import { auditPayment } from '@/lib/security-audit-logger';

export interface SecureDocument {
  id: string;
  document_type:
    | 'tax_form'
    | 'business_license'
    | 'portfolio_sample'
    | 'kyc_document'
    | 'banking_info';
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  encrypted_path: string;
  encryption_key_hash: string;
  upload_date: string;
  retention_date: string;
  access_level: 'creator_only' | 'admin_review' | 'compliance_archive';
  status: 'uploaded' | 'processed' | 'archived' | 'deleted';
  metadata: Record<string, any>;
}

export interface DocumentAccess {
  document_id: string;
  accessed_by: string;
  access_type: 'view' | 'download' | 'modify' | 'delete';
  access_date: string;
  ip_address?: string;
  user_agent?: string;
}

export interface TaxFormData {
  form_type: 'W9' | 'W8BEN' | 'W8BENE';
  tax_id: string;
  full_name: string;
  business_name?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  certification_date: string;
  signature_data: string; // Base64 encoded signature
}

export class SecureDocumentService {
  private static readonly DOCUMENT_CONFIG = {
    maxFileSize: 25 * 1024 * 1024, // 25MB for tax forms and portfolios
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in milliseconds
    encryptionAlgorithm: 'AES-256-GCM',
    allowedMimeTypes: {
      tax_form: ['application/pdf', 'image/jpeg', 'image/png'],
      business_license: ['application/pdf', 'image/jpeg', 'image/png'],
      portfolio_sample: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
      kyc_document: ['application/pdf', 'image/jpeg', 'image/png'],
      banking_info: ['application/pdf', 'image/jpeg', 'image/png'],
    },
  };

  // Upload Secure Document with Encryption
  async uploadDocument(
    applicationId: string,
    documentType: SecureDocument['document_type'],
    file: File,
    metadata: Record<string, any> = {},
  ): Promise<SecureDocument> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Validate document
      await this.validateDocument(file, documentType);

      // Get application details
      const { data: application, error } = await supabase
        .from('marketplace_creator_applications')
        .select('supplier_id')
        .eq('id', applicationId)
        .single();

      if (error || !application) {
        throw new Error('Application not found');
      }

      // Generate document ID and encryption keys
      const documentId = generateSecureToken(32);
      const encryptionKey = generateSecureToken(32);
      const keyHash = await this.hashEncryptionKey(encryptionKey);

      // Convert file to buffer for encryption
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Encrypt document content
      const encryptedBuffer = await encryptData(buffer, encryptionKey);

      // Generate secure file path with timestamp
      const timestamp = Date.now();
      const extension = this.getFileExtension(file.name);
      const securePath = `secure-docs/${application.supplier_id}/${documentType}/${timestamp}_${documentId}.enc`;

      // Upload encrypted file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('secure-documents')
        .upload(securePath, encryptedBuffer, {
          contentType: 'application/octet-stream',
          cacheControl: 'no-cache, no-store, max-age=0',
          metadata: {
            document_type: documentType,
            original_name: file.name,
            encrypted: 'true',
            created_at: new Date().toISOString(),
          },
        });

      if (uploadError) {
        throw new Error(`Failed to upload document: ${uploadError.message}`);
      }

      // Calculate retention date (7 years for compliance)
      const retentionDate = new Date(
        Date.now() + SecureDocumentService.DOCUMENT_CONFIG.retentionPeriod,
      );

      // Store document metadata with encrypted key reference
      const { data: document, error: docError } = await supabase
        .from('secure_documents')
        .insert({
          id: documentId,
          creator_application_id: applicationId,
          supplier_id: application.supplier_id,
          document_type: documentType,
          file_name: `${timestamp}_${documentId}.enc`,
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          encrypted_path: uploadData.path,
          encryption_key_hash: keyHash,
          upload_date: new Date().toISOString(),
          retention_date: retentionDate.toISOString(),
          access_level: this.getAccessLevel(documentType),
          status: 'uploaded',
          metadata: {
            ...metadata,
            upload_ip: await this.getClientIP(),
            user_agent: await this.getClientUserAgent(),
            checksum: await this.calculateChecksum(buffer),
            file_extension: extension,
          },
        })
        .select()
        .single();

      if (docError) {
        // Clean up uploaded file on error
        await supabase.storage.from('secure-documents').remove([securePath]);
        throw new Error(
          `Failed to save document metadata: ${docError.message}`,
        );
      }

      // Store encryption key securely (separate from document metadata)
      await this.storeEncryptionKey(documentId, encryptionKey);

      // Log document access
      await this.logDocumentAccess(
        documentId,
        application.supplier_id,
        'upload',
      );

      // Process document based on type
      await this.processDocumentByType(documentId, documentType, buffer);

      return {
        id: document.id,
        document_type: document.document_type,
        file_name: document.file_name,
        original_name: document.original_name,
        file_size: document.file_size,
        mime_type: document.mime_type,
        encrypted_path: document.encrypted_path,
        encryption_key_hash: document.encryption_key_hash,
        upload_date: document.upload_date,
        retention_date: document.retention_date,
        access_level: document.access_level,
        status: document.status,
        metadata: document.metadata,
      };
    } catch (error) {
      console.error('Failed to upload secure document:', error);
      throw error;
    }
  }

  // Validate Document Security Requirements
  private async validateDocument(
    file: File,
    documentType: string,
  ): Promise<void> {
    // Check file size
    if (file.size > SecureDocumentService.DOCUMENT_CONFIG.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${SecureDocumentService.DOCUMENT_CONFIG.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check file type
    const allowedTypes =
      SecureDocumentService.DOCUMENT_CONFIG.allowedMimeTypes[
        documentType as keyof typeof SecureDocumentService.DOCUMENT_CONFIG.allowedMimeTypes
      ];
    if (!allowedTypes || !allowedTypes.includes(file.type)) {
      throw new Error(
        `File type ${file.type} is not allowed for ${documentType}. Allowed types: ${allowedTypes?.join(', ')}`,
      );
    }

    // Enhanced security checks
    await this.performSecurityScan(file);
  }

  // Perform Security Scan on Document
  private async performSecurityScan(file: File): Promise<void> {
    // Check for suspicious file characteristics
    const suspiciousExtensions = [
      '.exe',
      '.bat',
      '.sh',
      '.ps1',
      '.vbs',
      '.js',
      '.html',
      '.php',
    ];
    const fileName = file.name.toLowerCase();

    for (const ext of suspiciousExtensions) {
      if (fileName.includes(ext)) {
        throw new Error(
          'File contains suspicious content and cannot be uploaded',
        );
      }
    }

    // Check for double extensions
    const extensionMatches = fileName.match(/\.[^.]+/g);
    if (extensionMatches && extensionMatches.length > 1) {
      throw new Error('Files with multiple extensions are not allowed');
    }

    // Size anomaly detection
    if (file.size === 0) {
      throw new Error('Empty files are not allowed');
    }

    // In production, you would integrate with a malware scanning service here
    // For now, we'll do basic validation

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check for common malicious file signatures
    const signatures = [
      Buffer.from([0x4d, 0x5a]), // PE executable
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF executable
    ];

    for (const signature of signatures) {
      if (buffer.subarray(0, signature.length).equals(signature)) {
        throw new Error('File type not allowed for security reasons');
      }
    }
  }

  // Retrieve Secure Document with Decryption
  async getDocument(
    documentId: string,
    userId: string,
  ): Promise<{
    document: SecureDocument;
    content: Buffer;
  }> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Get document metadata and verify access
      const { data: document, error } = await supabase
        .from('secure_documents')
        .select('*, marketplace_creator_applications(supplier_id)')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        throw new Error('Document not found');
      }

      // Verify user has access to this document
      await this.verifyDocumentAccess(documentId, userId);

      // Retrieve encryption key
      const encryptionKey = await this.retrieveEncryptionKey(documentId);
      if (!encryptionKey) {
        throw new Error('Document encryption key not found');
      }

      // Download encrypted file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('secure-documents')
        .download(document.encrypted_path);

      if (downloadError || !fileData) {
        throw new Error('Failed to download document');
      }

      // Convert to buffer and decrypt
      const encryptedBuffer = Buffer.from(await fileData.arrayBuffer());
      const decryptedBuffer = await decryptData(encryptedBuffer, encryptionKey);

      // Verify document integrity
      const storedChecksum = document.metadata?.checksum;
      if (storedChecksum) {
        const currentChecksum = await this.calculateChecksum(decryptedBuffer);
        if (storedChecksum !== currentChecksum) {
          throw new Error('Document integrity check failed');
        }
      }

      // Log document access
      await this.logDocumentAccess(documentId, userId, 'view');

      return {
        document: {
          id: document.id,
          document_type: document.document_type,
          file_name: document.file_name,
          original_name: document.original_name,
          file_size: document.file_size,
          mime_type: document.mime_type,
          encrypted_path: document.encrypted_path,
          encryption_key_hash: document.encryption_key_hash,
          upload_date: document.upload_date,
          retention_date: document.retention_date,
          access_level: document.access_level,
          status: document.status,
          metadata: document.metadata,
        },
        content: decryptedBuffer,
      };
    } catch (error) {
      console.error('Failed to retrieve secure document:', error);
      throw error;
    }
  }

  // Process Tax Form Submission
  async processTaxForm(
    applicationId: string,
    formData: TaxFormData,
    signedFormFile: File,
  ): Promise<SecureDocument> {
    try {
      // Validate tax form data
      await this.validateTaxForm(formData);

      // Upload the signed form document
      const document = await this.uploadDocument(
        applicationId,
        'tax_form',
        signedFormFile,
        {
          form_type: formData.form_type,
          tax_id_hash: await this.hashSensitiveData(formData.tax_id),
          full_name: formData.full_name,
          business_name: formData.business_name,
          certification_date: formData.certification_date,
          processed_date: new Date().toISOString(),
        },
      );

      // Store form data separately with additional encryption
      await this.storeTaxFormData(document.id, formData);

      // Update application progress
      await this.updateTaxCompletionStatus(applicationId, formData.form_type);

      return document;
    } catch (error) {
      console.error('Failed to process tax form:', error);
      throw error;
    }
  }

  // Validate Tax Form Requirements
  private async validateTaxForm(formData: TaxFormData): Promise<void> {
    const requiredFields = [
      'form_type',
      'tax_id',
      'full_name',
      'address',
      'certification_date',
      'signature_data',
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof TaxFormData]) {
        throw new Error(`Required field ${field} is missing`);
      }
    }

    // Validate tax ID format based on form type
    if (formData.form_type === 'W9' && !this.isValidSSNOrEIN(formData.tax_id)) {
      throw new Error('Invalid SSN or EIN format for W-9 form');
    }

    // Validate address completeness
    if (
      !formData.address.line1 ||
      !formData.address.city ||
      !formData.address.country
    ) {
      throw new Error('Complete address is required');
    }

    // Validate signature data
    if (!this.isValidSignature(formData.signature_data)) {
      throw new Error('Valid signature is required');
    }
  }

  // Store Tax Form Data with Additional Encryption
  private async storeTaxFormData(
    documentId: string,
    formData: TaxFormData,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Encrypt sensitive tax data
      const encryptionKey = generateSecureToken(32);
      const encryptedTaxData = await encryptData(
        JSON.stringify(formData),
        encryptionKey,
      );

      // Store encrypted tax form data
      await supabase.from('secure_tax_forms').insert({
        document_id: documentId,
        form_type: formData.form_type,
        encrypted_data: encryptedTaxData,
        encryption_key_hash: await this.hashEncryptionKey(encryptionKey),
        created_at: new Date().toISOString(),
        retention_date: new Date(
          Date.now() + SecureDocumentService.DOCUMENT_CONFIG.retentionPeriod,
        ).toISOString(),
      });

      // Store encryption key separately
      await this.storeEncryptionKey(`tax_${documentId}`, encryptionKey);
    } catch (error) {
      console.error('Failed to store tax form data:', error);
      throw error;
    }
  }

  // Utility Methods
  private getAccessLevel(documentType: string): SecureDocument['access_level'] {
    switch (documentType) {
      case 'tax_form':
      case 'banking_info':
        return 'compliance_archive';
      case 'business_license':
      case 'kyc_document':
        return 'admin_review';
      case 'portfolio_sample':
      default:
        return 'creator_only';
    }
  }

  private getFileExtension(fileName: string): string {
    return fileName.slice(fileName.lastIndexOf('.'));
  }

  private async calculateChecksum(buffer: Buffer): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async hashEncryptionKey(key: string): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private async hashSensitiveData(data: string): Promise<string> {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(data + process.env.HASH_SALT!)
      .digest('hex');
  }

  private isValidSSNOrEIN(taxId: string): boolean {
    // SSN format: XXX-XX-XXXX or XXXXXXXXX
    const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
    // EIN format: XX-XXXXXXX
    const einPattern = /^\d{2}-?\d{7}$/;

    return ssnPattern.test(taxId) || einPattern.test(taxId);
  }

  private isValidSignature(signatureData: string): boolean {
    // Basic validation for base64 signature data
    try {
      const buffer = Buffer.from(signatureData, 'base64');
      return buffer.length > 100; // Minimum signature data size
    } catch {
      return false;
    }
  }

  private async getClientIP(): Promise<string> {
    // This would be extracted from request headers in a real implementation
    return '127.0.0.1'; // Placeholder
  }

  private async getClientUserAgent(): Promise<string> {
    // This would be extracted from request headers in a real implementation
    return 'WedSync-Creator-Portal'; // Placeholder
  }

  // Encryption Key Management
  private async storeEncryptionKey(
    documentId: string,
    key: string,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Encrypt the key with master key before storing
      const masterKey = process.env.MASTER_ENCRYPTION_KEY!;
      const encryptedKey = await encryptData(key, masterKey);

      await supabase.from('document_encryption_keys').insert({
        document_id: documentId,
        encrypted_key: encryptedKey,
        key_hash: await this.hashEncryptionKey(key),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store encryption key:', error);
      throw error;
    }
  }

  private async retrieveEncryptionKey(
    documentId: string,
  ): Promise<string | null> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      const { data: keyRecord, error } = await supabase
        .from('document_encryption_keys')
        .select('encrypted_key')
        .eq('document_id', documentId)
        .single();

      if (error || !keyRecord) {
        return null;
      }

      // Decrypt the key using master key
      const masterKey = process.env.MASTER_ENCRYPTION_KEY!;
      return await decryptData(keyRecord.encrypted_key, masterKey);
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error);
      return null;
    }
  }

  // Document Access Control
  private async verifyDocumentAccess(
    documentId: string,
    userId: string,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Check if user has access to the document
      const { data: access, error } = await supabase
        .from('secure_documents')
        .select(
          'supplier_id, access_level, marketplace_creator_applications(supplier_id)',
        )
        .eq('id', documentId)
        .single();

      if (error || !access) {
        throw new Error('Document not found');
      }

      // Verify user owns the document or has admin access
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id, role')
        .eq('user_id', userId)
        .single();

      // Check if user is the document owner or has admin privileges
      const hasAccess =
        access.supplier_id === userId ||
        (userProfile && ['ADMIN', 'OWNER'].includes(userProfile.role));

      if (!hasAccess) {
        throw new Error('Insufficient permissions to access this document');
      }
    } catch (error) {
      console.error('Document access verification failed:', error);
      throw error;
    }
  }

  // Document Access Logging
  private async logDocumentAccess(
    documentId: string,
    userId: string,
    accessType: DocumentAccess['access_type'],
    additionalData?: Record<string, any>,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      await supabase.from('document_access_logs').insert({
        document_id: documentId,
        accessed_by: userId,
        access_type: accessType,
        access_date: new Date().toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: await this.getClientUserAgent(),
        additional_data: additionalData || {},
      });
    } catch (error) {
      console.error('Failed to log document access:', error);
    }
  }

  // Process Documents by Type
  private async processDocumentByType(
    documentId: string,
    documentType: string,
    content: Buffer,
  ): Promise<void> {
    switch (documentType) {
      case 'tax_form':
        await this.processTaxDocument(documentId, content);
        break;
      case 'business_license':
        await this.processBusinessLicense(documentId, content);
        break;
      case 'portfolio_sample':
        await this.processPortfolioSample(documentId, content);
        break;
      default:
        // No special processing required
        break;
    }
  }

  private async processTaxDocument(
    documentId: string,
    content: Buffer,
  ): Promise<void> {
    // In production, this would integrate with OCR services to extract tax information
    // For now, we'll just mark it as processed
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase
      .from('secure_documents')
      .update({
        status: 'processed',
        metadata: {
          processing_date: new Date().toISOString(),
          processing_type: 'tax_form_validation',
        },
      })
      .eq('id', documentId);
  }

  private async processBusinessLicense(
    documentId: string,
    content: Buffer,
  ): Promise<void> {
    // Business license validation logic would go here
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase
      .from('secure_documents')
      .update({
        status: 'processed',
        metadata: {
          processing_date: new Date().toISOString(),
          processing_type: 'business_license_verification',
        },
      })
      .eq('id', documentId);
  }

  private async processPortfolioSample(
    documentId: string,
    content: Buffer,
  ): Promise<void> {
    // Portfolio quality assessment logic would go here
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase
      .from('secure_documents')
      .update({
        status: 'processed',
        metadata: {
          processing_date: new Date().toISOString(),
          processing_type: 'portfolio_quality_check',
        },
      })
      .eq('id', documentId);
  }

  private async updateTaxCompletionStatus(
    applicationId: string,
    formType: string,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      await supabase
        .from('marketplace_creator_applications')
        .update({
          tax_information_complete: true,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      // Update onboarding progress
      await supabase.from('marketplace_onboarding_progress').upsert(
        {
          creator_application_id: applicationId,
          step_name: 'tax_forms',
          status: 'completed',
          completed_at: new Date().toISOString(),
          step_data: {
            form_type: formType,
            completed_date: new Date().toISOString(),
          },
        },
        {
          onConflict: 'creator_application_id,step_name',
        },
      );
    } catch (error) {
      console.error('Failed to update tax completion status:', error);
    }
  }
}

// Export singleton instance
export const secureDocumentService = new SecureDocumentService();
