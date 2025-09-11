import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  generateSecureToken,
  encryptData,
  decryptData,
} from '@/lib/crypto-utils';
import { auditPayment } from '@/lib/security-audit-logger';
import { stripeConnectService } from './stripeConnectService';

export interface KYCDocument {
  id: string;
  type:
    | 'passport'
    | 'driving_license'
    | 'id_card'
    | 'business_license'
    | 'tax_form';
  file_name: string;
  file_size: number;
  mime_type: string;
  encrypted_url: string;
  upload_date: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'processing';
  verification_notes?: string;
}

export interface KYCVerificationSession {
  id: string;
  application_id: string;
  session_type:
    | 'identity_verification'
    | 'document_upload'
    | 'tax_form_collection';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
  verification_url?: string;
  return_url: string;
  expires_at: string;
  documents: KYCDocument[];
  verification_data: Record<string, any>;
}

export interface ComplianceData {
  aml_check_status: 'pending' | 'passed' | 'failed';
  sanctions_check_status: 'pending' | 'passed' | 'failed';
  pep_check_status: 'pending' | 'passed' | 'failed';
  risk_score: number;
  compliance_flags: string[];
  last_checked: string;
}

export class KYCVerificationService {
  private static readonly DOCUMENT_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
    encryptionAlgorithm: 'AES-256-GCM',
  };

  private static readonly VERIFICATION_CONFIG = {
    sessionExpiration: 24 * 60 * 60 * 1000, // 24 hours
    maxRetryAttempts: 3,
    requiredDocuments: {
      identity: ['passport', 'driving_license', 'id_card'],
      business: ['business_license'],
      tax: ['tax_form'],
    },
  };

  // Create Identity Verification Session
  async createVerificationSession(
    applicationId: string,
    sessionType: KYCVerificationSession['session_type'],
    returnUrl?: string,
  ): Promise<KYCVerificationSession> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Get application details
      const { data: application, error } = await supabase
        .from('marketplace_creator_applications')
        .select('id, supplier_id, stripe_connect_account_id')
        .eq('id', applicationId)
        .single();

      if (error || !application) {
        throw new Error('Application not found');
      }

      const sessionId = generateSecureToken(32);
      const expiresAt = new Date(
        Date.now() +
          KYCVerificationService.VERIFICATION_CONFIG.sessionExpiration,
      );

      let verificationUrl: string | undefined;

      // For identity verification, create Stripe Identity session
      if (
        sessionType === 'identity_verification' &&
        application.stripe_connect_account_id
      ) {
        const stripeSession =
          await stripeConnectService.createIdentityVerificationSession(
            application.stripe_connect_account_id,
            returnUrl,
          );
        verificationUrl = stripeSession.verification_url;
      }

      // Create KYC session record
      const { data: session, error: sessionError } = await supabase
        .from('marketplace_kyc_sessions')
        .insert({
          id: sessionId,
          creator_application_id: applicationId,
          supplier_id: application.supplier_id,
          session_type: sessionType,
          status: 'pending',
          verification_url: verificationUrl,
          return_url:
            returnUrl ||
            `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/kyc-complete`,
          expires_at: expiresAt.toISOString(),
          verification_data: {},
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error('Failed to create verification session');
      }

      // Log session creation
      await this.logVerificationActivity(applicationId, 'session_created', {
        session_id: sessionId,
        session_type: sessionType,
      });

      return {
        id: session.id,
        application_id: applicationId,
        session_type: sessionType,
        status: 'pending',
        verification_url: verificationUrl,
        return_url: session.return_url,
        expires_at: session.expires_at,
        documents: [],
        verification_data: session.verification_data,
      };
    } catch (error) {
      console.error('Failed to create verification session:', error);
      throw new Error('Failed to create verification session');
    }
  }

  // Upload and Process Documents
  async uploadDocument(
    sessionId: string,
    documentType: KYCDocument['type'],
    file: File,
  ): Promise<KYCDocument> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Validate file
      this.validateDocument(file);

      // Get session details
      const { data: session, error } = await supabase
        .from('marketplace_kyc_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        throw new Error('Verification session not found');
      }

      // Check session expiration
      if (new Date() > new Date(session.expires_at)) {
        throw new Error('Verification session has expired');
      }

      // Generate document ID and encryption key
      const documentId = generateSecureToken(32);
      const encryptionKey = generateSecureToken(32);

      // Convert file to buffer for encryption
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Encrypt document
      const encryptedBuffer = await encryptData(buffer, encryptionKey);

      // Generate secure file path
      const fileName = `kyc-docs/${session.supplier_id}/${documentId}.encrypted`;

      // Upload encrypted file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('secure-documents')
        .upload(fileName, encryptedBuffer, {
          contentType: 'application/octet-stream',
          cacheControl: 'no-cache',
        });

      if (uploadError) {
        throw new Error('Failed to upload document');
      }

      // Store document metadata with encrypted key
      const { data: document, error: docError } = await supabase
        .from('marketplace_kyc_documents')
        .insert({
          id: documentId,
          kyc_session_id: sessionId,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          encrypted_url: uploadData.path,
          encryption_key: await encryptData(
            encryptionKey,
            process.env.MASTER_ENCRYPTION_KEY!,
          ),
          verification_status: 'pending',
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) {
        // Clean up uploaded file on error
        await supabase.storage.from('secure-documents').remove([fileName]);
        throw new Error('Failed to save document metadata');
      }

      // Update session status
      await supabase
        .from('marketplace_kyc_sessions')
        .update({
          status: 'in_progress',
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Log document upload
      await this.logVerificationActivity(
        session.creator_application_id,
        'document_uploaded',
        {
          session_id: sessionId,
          document_id: documentId,
          document_type: documentType,
          file_size: file.size,
        },
      );

      // Start document verification process
      await this.initiateDocumentVerification(documentId);

      return {
        id: documentId,
        type: documentType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        encrypted_url: uploadData.path,
        upload_date: new Date().toISOString(),
        verification_status: 'pending',
      };
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  // Validate Document Requirements
  private validateDocument(file: File): void {
    // Check file size
    if (file.size > KYCVerificationService.DOCUMENT_CONFIG.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${KYCVerificationService.DOCUMENT_CONFIG.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check file type
    if (
      !KYCVerificationService.DOCUMENT_CONFIG.allowedMimeTypes.includes(
        file.type,
      )
    ) {
      throw new Error(
        `File type ${file.type} is not allowed. Allowed types: ${KYCVerificationService.DOCUMENT_CONFIG.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check for potentially malicious files
    const suspiciousExtensions = ['.exe', '.bat', '.sh', '.ps1', '.vbs'];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf('.'));

    if (suspiciousExtensions.includes(fileExtension)) {
      throw new Error('File type not allowed for security reasons');
    }
  }

  // Initiate Document Verification Process
  private async initiateDocumentVerification(
    documentId: string,
  ): Promise<void> {
    // In a real implementation, this would integrate with a third-party
    // identity verification service like Jumio, Onfido, or similar

    // For now, we'll simulate the verification process
    setTimeout(async () => {
      await this.processDocumentVerification(documentId);
    }, 5000); // Simulate 5-second processing delay
  }

  // Process Document Verification Results
  private async processDocumentVerification(documentId: string): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Simulate document verification logic
      // In production, this would be called by webhook from verification service

      const verificationResult =
        await this.simulateDocumentVerification(documentId);

      // Update document verification status
      await supabase
        .from('marketplace_kyc_documents')
        .update({
          verification_status: verificationResult.status,
          verification_notes: verificationResult.notes,
          verified_at:
            verificationResult.status === 'verified'
              ? new Date().toISOString()
              : null,
        })
        .eq('id', documentId);

      // Check if all required documents are verified
      const { data: document } = await supabase
        .from('marketplace_kyc_documents')
        .select('kyc_session_id')
        .eq('id', documentId)
        .single();

      if (document && verificationResult.status === 'verified') {
        await this.checkSessionCompletion(document.kyc_session_id);
      }
    } catch (error) {
      console.error('Failed to process document verification:', error);
    }
  }

  // Simulate Document Verification (replace with real integration)
  private async simulateDocumentVerification(documentId: string): Promise<{
    status: 'verified' | 'rejected';
    notes: string;
  }> {
    // Simulate verification decision (90% pass rate for testing)
    const verified = Math.random() > 0.1;

    return {
      status: verified ? 'verified' : 'rejected',
      notes: verified
        ? 'Document verified successfully'
        : 'Document quality insufficient or information unclear',
    };
  }

  // Check Session Completion Status
  private async checkSessionCompletion(sessionId: string): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Get all documents for this session
      const { data: documents, error } = await supabase
        .from('marketplace_kyc_documents')
        .select('document_type, verification_status')
        .eq('kyc_session_id', sessionId);

      if (error || !documents) {
        return;
      }

      // Check if all required documents are verified
      const verifiedDocuments = documents.filter(
        (doc) => doc.verification_status === 'verified',
      );
      const hasIdentityDocument = verifiedDocuments.some((doc) =>
        KYCVerificationService.VERIFICATION_CONFIG.requiredDocuments.identity.includes(
          doc.document_type,
        ),
      );

      // For basic verification, we just need one identity document
      const isComplete = hasIdentityDocument;

      if (isComplete) {
        // Update session status
        await supabase
          .from('marketplace_kyc_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        // Get application ID and update onboarding progress
        const { data: session } = await supabase
          .from('marketplace_kyc_sessions')
          .select('creator_application_id')
          .eq('id', sessionId)
          .single();

        if (session) {
          await this.updateOnboardingProgress(session.creator_application_id);
        }
      }
    } catch (error) {
      console.error('Failed to check session completion:', error);
    }
  }

  // Update Onboarding Progress
  private async updateOnboardingProgress(applicationId: string): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Update verification step as completed
      await supabase.from('marketplace_onboarding_progress').upsert(
        {
          creator_application_id: applicationId,
          step_name: 'kyc_verification',
          status: 'completed',
          completed_at: new Date().toISOString(),
          step_data: {
            verification_completed: true,
            verified_at: new Date().toISOString(),
          },
        },
        {
          onConflict: 'creator_application_id,step_name',
        },
      );

      // Log completion
      await this.logVerificationActivity(applicationId, 'kyc_completed', {
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update onboarding progress:', error);
    }
  }

  // Get Verification Session Status
  async getVerificationStatus(
    sessionId: string,
  ): Promise<KYCVerificationSession> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      const { data: session, error } = await supabase
        .from('marketplace_kyc_sessions')
        .select(
          `
          *,
          marketplace_kyc_documents (
            id,
            document_type,
            file_name,
            file_size,
            mime_type,
            verification_status,
            verification_notes,
            uploaded_at
          )
        `,
        )
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        throw new Error('Verification session not found');
      }

      return {
        id: session.id,
        application_id: session.creator_application_id,
        session_type: session.session_type,
        status: session.status,
        verification_url: session.verification_url,
        return_url: session.return_url,
        expires_at: session.expires_at,
        documents: session.marketplace_kyc_documents.map((doc: any) => ({
          id: doc.id,
          type: doc.document_type,
          file_name: doc.file_name,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          encrypted_url: doc.encrypted_url,
          upload_date: doc.uploaded_at,
          verification_status: doc.verification_status,
          verification_notes: doc.verification_notes,
        })),
        verification_data: session.verification_data,
      };
    } catch (error) {
      console.error('Failed to get verification status:', error);
      throw error;
    }
  }

  // Anti-Money Laundering (AML) Check
  async performAMLCheck(
    applicationId: string,
    personalData: {
      full_name: string;
      date_of_birth: string;
      address: string;
      country: string;
    },
  ): Promise<ComplianceData> {
    // In production, this would integrate with AML screening services
    // For now, we simulate the check

    const riskScore = Math.random() * 100;
    const complianceFlags: string[] = [];

    // Simulate compliance checks
    if (riskScore > 80) {
      complianceFlags.push('high_risk_country');
    }
    if (personalData.full_name.toLowerCase().includes('test')) {
      complianceFlags.push('test_account');
    }

    const complianceData: ComplianceData = {
      aml_check_status: riskScore < 70 ? 'passed' : 'failed',
      sanctions_check_status: 'passed',
      pep_check_status: 'passed',
      risk_score: riskScore,
      compliance_flags: complianceFlags,
      last_checked: new Date().toISOString(),
    };

    // Log compliance check
    await this.logVerificationActivity(applicationId, 'compliance_check', {
      risk_score: riskScore,
      compliance_status: complianceData.aml_check_status,
      flags: complianceFlags,
    });

    return complianceData;
  }

  // Retry Failed Verification
  async retryVerification(sessionId: string): Promise<boolean> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Get current attempt count
      const { data: session, error } = await supabase
        .from('marketplace_kyc_sessions')
        .select('retry_attempts, status')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        throw new Error('Verification session not found');
      }

      const currentAttempts = session.retry_attempts || 0;

      if (
        currentAttempts >=
        KYCVerificationService.VERIFICATION_CONFIG.maxRetryAttempts
      ) {
        throw new Error('Maximum retry attempts exceeded');
      }

      // Update session for retry
      await supabase
        .from('marketplace_kyc_sessions')
        .update({
          status: 'pending',
          retry_attempts: currentAttempts + 1,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return true;
    } catch (error) {
      console.error('Failed to retry verification:', error);
      return false;
    }
  }

  // Log Verification Activities
  private async logVerificationActivity(
    applicationId: string,
    activity: string,
    data: any,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      await supabase.from('marketplace_creator_communications').insert({
        creator_application_id: applicationId,
        communication_type: 'verification_log',
        subject: `KYC Activity: ${activity}`,
        message_content: JSON.stringify({
          activity,
          data,
          timestamp: new Date().toISOString(),
        }),
        template_used: 'verification_log',
      });
    } catch (error) {
      console.error('Failed to log verification activity:', error);
    }
  }
}

// Export singleton instance
export const kycVerificationService = new KYCVerificationService();
