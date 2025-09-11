import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  generateSecureToken,
  encryptData,
  decryptData,
} from '@/lib/crypto-utils';

export interface GovernmentIDVerificationRequest {
  document_type: 'passport' | 'driving_license' | 'national_id';
  document_number: string;
  country_code: string;
  date_of_birth: string;
  full_name: string;
  document_front_image: string; // Base64 encoded
  document_back_image?: string; // Base64 encoded
  selfie_image: string; // Base64 encoded
}

export interface GovernmentIDVerificationResponse {
  verification_id: string;
  status: 'pending' | 'verified' | 'rejected' | 'requires_manual_review';
  confidence_score: number;
  extracted_data: {
    full_name: string;
    date_of_birth: string;
    document_number: string;
    expiry_date: string;
    nationality: string;
  };
  verification_checks: {
    document_authenticity: boolean;
    face_match: boolean;
    data_consistency: boolean;
    document_quality: boolean;
  };
  failure_reasons?: string[];
}

export interface BankAccountVerificationRequest {
  account_number: string;
  routing_number: string;
  account_holder_name: string;
  bank_name: string;
  country_code: string;
  currency: string;
}

export interface BankAccountVerificationResponse {
  verification_id: string;
  status: 'verified' | 'invalid' | 'requires_manual_review';
  bank_details: {
    bank_name: string;
    bank_code: string;
    branch_name?: string;
    account_type: string;
  };
  account_holder_match: boolean;
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: string[];
  };
}

export interface BusinessRegistrationVerificationRequest {
  business_name: string;
  registration_number: string;
  country_code: string;
  registration_date: string;
  business_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface BusinessRegistrationVerificationResponse {
  verification_id: string;
  status: 'verified' | 'not_found' | 'inactive' | 'requires_manual_review';
  business_details: {
    legal_name: string;
    registration_number: string;
    status: string;
    incorporation_date: string;
    business_type: string;
    registered_address: any;
  };
  compliance_status: {
    active: boolean;
    good_standing: boolean;
    tax_compliant: boolean;
  };
}

export interface AntiFraudScreeningRequest {
  full_name: string;
  date_of_birth: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  email: string;
  phone?: string;
  ip_address: string;
  device_fingerprint?: string;
}

export interface AntiFraudScreeningResponse {
  screening_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  screening_results: {
    identity_verification: boolean;
    address_verification: boolean;
    phone_verification: boolean;
    email_verification: boolean;
    device_risk_assessment: boolean;
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
  recommendations: string[];
}

export class ExternalServiceIntegration {
  private static readonly SERVICE_CONFIG = {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    baseUrls: {
      governmentId:
        process.env.GOVERNMENT_ID_VERIFICATION_URL || 'https://api.jumio.com',
      bankVerification:
        process.env.BANK_VERIFICATION_URL || 'https://api.plaid.com',
      businessRegistry:
        process.env.BUSINESS_REGISTRY_URL || 'https://api.opencorporates.com',
      fraudScreening: process.env.FRAUD_SCREENING_URL || 'https://api.sift.com',
    },
    apiKeys: {
      governmentId: process.env.GOVERNMENT_ID_API_KEY || '',
      bankVerification: process.env.BANK_VERIFICATION_API_KEY || '',
      businessRegistry: process.env.BUSINESS_REGISTRY_API_KEY || '',
      fraudScreening: process.env.FRAUD_SCREENING_API_KEY || '',
    },
  };

  // Government ID Verification Service Integration
  async verifyGovernmentID(
    applicationId: string,
    request: GovernmentIDVerificationRequest,
  ): Promise<GovernmentIDVerificationResponse> {
    try {
      // For production, integrate with services like Jumio, Onfido, or Veriff
      // For now, we simulate the verification process

      const verificationId = generateSecureToken(32);

      // Simulate API call with proper error handling
      const simulatedResponse =
        await this.simulateGovernmentIDVerification(request);

      // Log verification attempt
      await this.logExternalServiceCall(
        applicationId,
        'government_id_verification',
        verificationId,
        request,
        simulatedResponse,
      );

      return {
        verification_id: verificationId,
        ...simulatedResponse,
      };
    } catch (error) {
      console.error('Government ID verification failed:', error);
      throw new Error(
        'Identity verification service is temporarily unavailable',
      );
    }
  }

  // Bank Account Verification Service Integration
  async verifyBankAccount(
    applicationId: string,
    request: BankAccountVerificationRequest,
  ): Promise<BankAccountVerificationResponse> {
    try {
      // For production, integrate with services like Plaid, Yodlee, or TrueLayer

      const verificationId = generateSecureToken(32);
      const simulatedResponse =
        await this.simulateBankAccountVerification(request);

      // Log verification attempt
      await this.logExternalServiceCall(
        applicationId,
        'bank_account_verification',
        verificationId,
        request,
        simulatedResponse,
      );

      return {
        verification_id: verificationId,
        ...simulatedResponse,
      };
    } catch (error) {
      console.error('Bank account verification failed:', error);
      throw new Error('Bank verification service is temporarily unavailable');
    }
  }

  // Business Registration Verification
  async verifyBusinessRegistration(
    applicationId: string,
    request: BusinessRegistrationVerificationRequest,
  ): Promise<BusinessRegistrationVerificationResponse> {
    try {
      // For production, integrate with OpenCorporates, Companies House API, etc.

      const verificationId = generateSecureToken(32);
      const simulatedResponse =
        await this.simulateBusinessRegistrationVerification(request);

      // Log verification attempt
      await this.logExternalServiceCall(
        applicationId,
        'business_registration_verification',
        verificationId,
        request,
        simulatedResponse,
      );

      return {
        verification_id: verificationId,
        ...simulatedResponse,
      };
    } catch (error) {
      console.error('Business registration verification failed:', error);
      throw new Error(
        'Business verification service is temporarily unavailable',
      );
    }
  }

  // Anti-Fraud Screening
  async performAntiFraudScreening(
    applicationId: string,
    request: AntiFraudScreeningRequest,
  ): Promise<AntiFraudScreeningResponse> {
    try {
      // For production, integrate with services like Sift, Kount, or DataVisor

      const screeningId = generateSecureToken(32);
      const simulatedResponse = await this.simulateAntiFraudScreening(request);

      // Log screening attempt
      await this.logExternalServiceCall(
        applicationId,
        'anti_fraud_screening',
        screeningId,
        request,
        simulatedResponse,
      );

      return {
        screening_id: screeningId,
        ...simulatedResponse,
      };
    } catch (error) {
      console.error('Anti-fraud screening failed:', error);
      throw new Error('Fraud screening service is temporarily unavailable');
    }
  }

  // Comprehensive Creator Verification
  async performComprehensiveVerification(
    applicationId: string,
    verificationData: {
      government_id: GovernmentIDVerificationRequest;
      bank_account?: BankAccountVerificationRequest;
      business_registration?: BusinessRegistrationVerificationRequest;
      fraud_screening: AntiFraudScreeningRequest;
    },
  ): Promise<{
    verification_session_id: string;
    overall_status: 'verified' | 'requires_manual_review' | 'rejected';
    verification_results: {
      government_id: GovernmentIDVerificationResponse;
      bank_account?: BankAccountVerificationResponse;
      business_registration?: BusinessRegistrationVerificationResponse;
      fraud_screening: AntiFraudScreeningResponse;
    };
    risk_assessment: {
      overall_risk_score: number;
      risk_level: 'low' | 'medium' | 'high' | 'critical';
      approval_recommendation: 'approve' | 'manual_review' | 'reject';
    };
  }> {
    try {
      const sessionId = generateSecureToken(32);
      const results: any = {};

      // Perform all verifications in parallel for efficiency
      const verificationPromises = [
        this.verifyGovernmentID(applicationId, verificationData.government_id),
        this.performAntiFraudScreening(
          applicationId,
          verificationData.fraud_screening,
        ),
      ];

      if (verificationData.bank_account) {
        verificationPromises.push(
          this.verifyBankAccount(applicationId, verificationData.bank_account),
        );
      }

      if (verificationData.business_registration) {
        verificationPromises.push(
          this.verifyBusinessRegistration(
            applicationId,
            verificationData.business_registration,
          ),
        );
      }

      // Execute all verifications
      const [govIdResult, fraudResult, bankResult, businessResult] =
        await Promise.all(verificationPromises);

      results.government_id = govIdResult;
      results.fraud_screening = fraudResult;
      if (bankResult) results.bank_account = bankResult;
      if (businessResult) results.business_registration = businessResult;

      // Calculate overall risk assessment
      const riskAssessment = this.calculateOverallRisk(results);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(
        results,
        riskAssessment,
      );

      // Store comprehensive verification results
      await this.storeComprehensiveResults(applicationId, sessionId, {
        results,
        risk_assessment: riskAssessment,
        overall_status: overallStatus,
      });

      return {
        verification_session_id: sessionId,
        overall_status: overallStatus,
        verification_results: results,
        risk_assessment: riskAssessment,
      };
    } catch (error) {
      console.error('Comprehensive verification failed:', error);
      throw new Error('Verification services are temporarily unavailable');
    }
  }

  // Simulation Methods (Replace with real integrations in production)

  private async simulateGovernmentIDVerification(
    request: GovernmentIDVerificationRequest,
  ): Promise<Omit<GovernmentIDVerificationResponse, 'verification_id'>> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate verification result (85% pass rate for testing)
    const passed = Math.random() > 0.15;
    const confidenceScore = passed
      ? 85 + Math.random() * 14
      : 30 + Math.random() * 40;

    return {
      status: passed ? 'verified' : 'rejected',
      confidence_score: Math.round(confidenceScore),
      extracted_data: {
        full_name: request.full_name,
        date_of_birth: request.date_of_birth,
        document_number: request.document_number,
        expiry_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        nationality: request.country_code,
      },
      verification_checks: {
        document_authenticity: passed,
        face_match: passed && Math.random() > 0.1,
        data_consistency: passed,
        document_quality: Math.random() > 0.2,
      },
      failure_reasons: passed
        ? undefined
        : ['Document quality insufficient', 'Face match failed'],
    };
  }

  private async simulateBankAccountVerification(
    request: BankAccountVerificationRequest,
  ): Promise<Omit<BankAccountVerificationResponse, 'verification_id'>> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const verified = Math.random() > 0.1; // 90% success rate

    return {
      status: verified ? 'verified' : 'invalid',
      bank_details: {
        bank_name: request.bank_name,
        bank_code: request.routing_number,
        account_type: 'checking',
      },
      account_holder_match: verified,
      risk_assessment: {
        risk_level: verified ? 'low' : 'high',
        risk_factors: verified
          ? []
          : ['Account holder name mismatch', 'High risk bank'],
      },
    };
  }

  private async simulateBusinessRegistrationVerification(
    request: BusinessRegistrationVerificationRequest,
  ): Promise<
    Omit<BusinessRegistrationVerificationResponse, 'verification_id'>
  > {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const found = Math.random() > 0.2; // 80% found rate

    return {
      status: found ? 'verified' : 'not_found',
      business_details: {
        legal_name: request.business_name,
        registration_number: request.registration_number,
        status: found ? 'active' : 'unknown',
        incorporation_date: request.registration_date,
        business_type: 'Limited Company',
        registered_address: request.business_address,
      },
      compliance_status: {
        active: found,
        good_standing: found,
        tax_compliant: found,
      },
    };
  }

  private async simulateAntiFraudScreening(
    request: AntiFraudScreeningRequest,
  ): Promise<Omit<AntiFraudScreeningResponse, 'screening_id'>> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const riskScore = Math.random() * 100;
    const riskLevel =
      riskScore < 30
        ? 'low'
        : riskScore < 60
          ? 'medium'
          : riskScore < 85
            ? 'high'
            : 'critical';

    return {
      risk_score: Math.round(riskScore),
      risk_level,
      screening_results: {
        identity_verification: riskScore < 70,
        address_verification: riskScore < 75,
        phone_verification: riskScore < 80,
        email_verification: riskScore < 65,
        device_risk_assessment: riskScore < 85,
      },
      alerts:
        riskLevel === 'high' || riskLevel === 'critical'
          ? [
              {
                type: 'suspicious_activity',
                severity: 'warning',
                message: 'Multiple applications from same IP address',
              },
            ]
          : [],
      recommendations:
        riskScore > 70
          ? ['Manual review recommended', 'Request additional documentation']
          : [],
    };
  }

  // Risk Assessment and Decision Logic

  private calculateOverallRisk(results: any): {
    overall_risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    approval_recommendation: 'approve' | 'manual_review' | 'reject';
  } {
    let totalRisk = 0;
    let riskFactors = 0;

    // Government ID verification risk
    if (
      results.government_id.status === 'verified' &&
      results.government_id.confidence_score > 80
    ) {
      totalRisk += 10; // Low risk
    } else if (results.government_id.status === 'requires_manual_review') {
      totalRisk += 50; // Medium risk
    } else {
      totalRisk += 90; // High risk
    }
    riskFactors++;

    // Fraud screening risk
    if (results.fraud_screening) {
      totalRisk += results.fraud_screening.risk_score;
      riskFactors++;
    }

    // Bank account risk
    if (results.bank_account) {
      if (
        results.bank_account.status === 'verified' &&
        results.bank_account.account_holder_match
      ) {
        totalRisk += 5; // Low risk
      } else {
        totalRisk += 60; // Medium-high risk
      }
      riskFactors++;
    }

    // Business registration risk
    if (results.business_registration) {
      if (
        results.business_registration.status === 'verified' &&
        results.business_registration.compliance_status.active
      ) {
        totalRisk += 10; // Low risk
      } else {
        totalRisk += 70; // High risk
      }
      riskFactors++;
    }

    const averageRisk = totalRisk / riskFactors;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    let recommendation: 'approve' | 'manual_review' | 'reject';

    if (averageRisk < 30) {
      riskLevel = 'low';
      recommendation = 'approve';
    } else if (averageRisk < 60) {
      riskLevel = 'medium';
      recommendation = 'approve';
    } else if (averageRisk < 80) {
      riskLevel = 'high';
      recommendation = 'manual_review';
    } else {
      riskLevel = 'critical';
      recommendation = 'reject';
    }

    return {
      overall_risk_score: Math.round(averageRisk),
      risk_level: riskLevel,
      approval_recommendation: recommendation,
    };
  }

  private determineOverallStatus(
    results: any,
    riskAssessment: any,
  ): 'verified' | 'requires_manual_review' | 'rejected' {
    // Check critical failures
    if (results.government_id.status === 'rejected') {
      return 'rejected';
    }

    if (riskAssessment.approval_recommendation === 'reject') {
      return 'rejected';
    }

    if (riskAssessment.approval_recommendation === 'manual_review') {
      return 'requires_manual_review';
    }

    // Check if all verifications passed
    const allPassed =
      results.government_id.status === 'verified' &&
      (results.fraud_screening.risk_level === 'low' ||
        results.fraud_screening.risk_level === 'medium') &&
      (!results.bank_account || results.bank_account.status === 'verified') &&
      (!results.business_registration ||
        results.business_registration.status === 'verified');

    return allPassed ? 'verified' : 'requires_manual_review';
  }

  // Utility Methods

  private async logExternalServiceCall(
    applicationId: string,
    serviceType: string,
    verificationId: string,
    request: any,
    response: any,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Remove sensitive data before logging
      const sanitizedRequest = this.sanitizeForLogging(request);
      const sanitizedResponse = this.sanitizeForLogging(response);

      await supabase.from('external_service_logs').insert({
        application_id: applicationId,
        service_type: serviceType,
        verification_id: verificationId,
        request_data: sanitizedRequest,
        response_data: sanitizedResponse,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log external service call:', error);
    }
  }

  private sanitizeForLogging(data: any): any {
    const sensitiveFields = [
      'document_front_image',
      'document_back_image',
      'selfie_image',
      'account_number',
      'routing_number',
      'api_key',
      'token',
    ];

    const sanitized = { ...data };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private async storeComprehensiveResults(
    applicationId: string,
    sessionId: string,
    results: any,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      await supabase.from('comprehensive_verification_sessions').insert({
        session_id: sessionId,
        application_id: applicationId,
        verification_results: results.results,
        risk_assessment: results.risk_assessment,
        overall_status: results.overall_status,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store comprehensive results:', error);
    }
  }

  // Health Check for External Services
  async checkServiceHealth(): Promise<{
    government_id: boolean;
    bank_verification: boolean;
    business_registry: boolean;
    fraud_screening: boolean;
  }> {
    // In production, implement actual health checks for each service
    return {
      government_id: true,
      bank_verification: true,
      business_registry: true,
      fraud_screening: true,
    };
  }
}

// Export singleton instance
export const externalServiceIntegration = new ExternalServiceIntegration();
