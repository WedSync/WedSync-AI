import { createServerClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { auditLog } from '@/lib/middleware/audit';

// PCI DSS Compliance Implementation for WedSync Financial System
export enum PCIDSSRequirement {
  SECURE_NETWORK = 'secure_network', // Requirement 1-2
  PROTECT_CARDHOLDER_DATA = 'protect_data', // Requirement 3-4
  VULNERABILITY_MANAGEMENT = 'vulnerability', // Requirement 5-6
  ACCESS_CONTROL = 'access_control', // Requirement 7-8
  NETWORK_MONITORING = 'monitoring', // Requirement 9-10
  SECURITY_POLICY = 'security_policy', // Requirement 11-12
}

export enum PaymentCardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  JCB = 'jcb',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  AUTHORIZATION = 'authorization',
  VOID = 'void',
  CAPTURE = 'capture',
}

export interface PCICardholderData {
  primary_account_number?: string; // PAN - Must be protected
  cardholder_name?: string;
  expiration_date?: string;
  service_code?: string;
}

export interface PCISensitiveData {
  full_magnetic_stripe?: string; // Prohibited after authorization
  cav2_cvc2_cvv2?: string; // Prohibited after authorization
  pin_block?: string; // Prohibited after authorization
}

export interface PCIAuditEvent {
  event_id: string;
  user_id?: string;
  event_type: string;
  resource_accessed: string;
  access_result: 'success' | 'failure';
  timestamp: Date;
  source_ip: string;
  user_agent?: string;
  session_id?: string;
  additional_info?: any;
}

export class PCIDSSComplianceHandler {
  private static instance: PCIDSSComplianceHandler;
  private supabase = createServerClient();
  private encryptionKey = process.env.PCI_ENCRYPTION_KEY || '';
  private tokenizationKey = process.env.PCI_TOKENIZATION_KEY || '';

  public static getInstance(): PCIDSSComplianceHandler {
    if (!PCIDSSComplianceHandler.instance) {
      PCIDSSComplianceHandler.instance = new PCIDSSComplianceHandler();
    }
    return PCIDSSComplianceHandler.instance;
  }

  // PCI DSS Requirement 3: Protect stored cardholder data
  async tokenizeCardNumber(pan: string): Promise<string> {
    try {
      if (!this.isValidPAN(pan)) {
        throw new Error('Invalid Primary Account Number format');
      }

      // Generate a random token
      const token = crypto.randomBytes(16).toString('hex');

      // Store the mapping securely (this would be in a separate, highly secured environment)
      const encryptedPAN = this.encryptPAN(pan);

      await this.storeTokenMapping(token, encryptedPAN);

      // Log tokenization event
      await this.logPCIEvent({
        event_type: 'PAN_TOKENIZATION',
        resource_accessed: 'cardholder_data',
        access_result: 'success',
        additional_info: {
          token_prefix: token.substring(0, 4),
          last_four_digits: pan.slice(-4),
          requirement: 'PCI DSS 3.4 - Tokenization',
        },
      });

      return token;
    } catch (error) {
      await this.logPCIEvent({
        event_type: 'PAN_TOKENIZATION_FAILED',
        resource_accessed: 'cardholder_data',
        access_result: 'failure',
        additional_info: {
          error_message: error.message,
          requirement: 'PCI DSS 3.4 - Tokenization',
        },
      });
      throw error;
    }
  }

  async detokenizeCardNumber(token: string): Promise<string> {
    try {
      if (!(await this.isValidToken(token))) {
        throw new Error('Invalid or expired token');
      }

      const encryptedPAN = await this.retrieveTokenMapping(token);
      if (!encryptedPAN) {
        throw new Error('Token not found or expired');
      }

      const pan = this.decryptPAN(encryptedPAN);

      // Log detokenization event (high security event)
      await this.logPCIEvent({
        event_type: 'PAN_DETOKENIZATION',
        resource_accessed: 'cardholder_data',
        access_result: 'success',
        additional_info: {
          token_prefix: token.substring(0, 4),
          last_four_digits: pan.slice(-4),
          requirement: 'PCI DSS 3.4 - Detokenization',
          security_level: 'critical',
        },
      });

      return pan;
    } catch (error) {
      await this.logPCIEvent({
        event_type: 'PAN_DETOKENIZATION_FAILED',
        resource_accessed: 'cardholder_data',
        access_result: 'failure',
        additional_info: {
          token_prefix: token.substring(0, 4),
          error_message: error.message,
          requirement: 'PCI DSS 3.4 - Detokenization',
        },
      });
      throw error;
    }
  }

  // PCI DSS Requirement 3: Mask PAN when displaying
  maskPAN(pan: string): string {
    if (!pan || pan.length < 8) return '****';

    // Show only first 6 and last 4 digits (PCI DSS compliant masking)
    const firstSix = pan.substring(0, 6);
    const lastFour = pan.slice(-4);
    const maskLength = Math.max(0, pan.length - 10);
    const mask = '*'.repeat(maskLength);

    return `${firstSix}${mask}${lastFour}`;
  }

  // PCI DSS Requirement 4: Encrypt transmission of cardholder data
  async encryptForTransmission(data: PCICardholderData): Promise<string> {
    try {
      const sanitizedData = this.sanitizeCardholderData(data);

      // Use strong encryption (AES-256)
      const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
      let encrypted = cipher.update(
        JSON.stringify(sanitizedData),
        'utf8',
        'hex',
      );
      encrypted += cipher.final('hex');

      // Log encryption event
      await this.logPCIEvent({
        event_type: 'DATA_ENCRYPTION_TRANSMISSION',
        resource_accessed: 'cardholder_data',
        access_result: 'success',
        additional_info: {
          data_size: JSON.stringify(sanitizedData).length,
          encryption_algorithm: 'AES-256-GCM',
          requirement: 'PCI DSS 4.1 - Encrypt transmission',
        },
      });

      return encrypted;
    } catch (error) {
      await this.logPCIEvent({
        event_type: 'DATA_ENCRYPTION_FAILED',
        resource_accessed: 'cardholder_data',
        access_result: 'failure',
        additional_info: {
          error_message: error.message,
          requirement: 'PCI DSS 4.1 - Encrypt transmission',
        },
      });
      throw error;
    }
  }

  // PCI DSS Requirement 7: Restrict access to cardholder data by business need-to-know
  async validateFinancialDataAccess(
    userId: string,
    operation: string,
    resourceId?: string,
  ): Promise<boolean> {
    try {
      // Check if user has appropriate role for financial data access
      const hasPermission = await this.checkFinancialPermissions(
        userId,
        operation,
      );

      if (!hasPermission) {
        await this.logPCIEvent({
          user_id: userId,
          event_type: 'UNAUTHORIZED_FINANCIAL_ACCESS',
          resource_accessed: resourceId || 'financial_data',
          access_result: 'failure',
          additional_info: {
            attempted_operation: operation,
            denial_reason: 'Insufficient permissions',
            requirement: 'PCI DSS 7.1 - Access control',
          },
        });
        return false;
      }

      // Log successful access
      await this.logPCIEvent({
        user_id: userId,
        event_type: 'AUTHORIZED_FINANCIAL_ACCESS',
        resource_accessed: resourceId || 'financial_data',
        access_result: 'success',
        additional_info: {
          operation: operation,
          requirement: 'PCI DSS 7.1 - Access control',
        },
      });

      return true;
    } catch (error) {
      await this.logPCIEvent({
        user_id: userId,
        event_type: 'FINANCIAL_ACCESS_ERROR',
        resource_accessed: resourceId || 'financial_data',
        access_result: 'failure',
        additional_info: {
          error_message: error.message,
          attempted_operation: operation,
          requirement: 'PCI DSS 7.1 - Access control',
        },
      });
      return false;
    }
  }

  // PCI DSS Requirement 8: Identify and authenticate access to system components
  async logAuthenticationEvent(
    userId: string,
    authResult: 'success' | 'failure',
    method: string,
    request: NextRequest,
  ): Promise<void> {
    await this.logPCIEvent({
      user_id: userId,
      event_type: 'AUTHENTICATION_ATTEMPT',
      resource_accessed: 'authentication_system',
      access_result: authResult,
      source_ip: this.getClientIP(request),
      user_agent: request.headers.get('user-agent') || undefined,
      additional_info: {
        authentication_method: method,
        requirement: 'PCI DSS 8.2 - Authentication',
      },
    });
  }

  // PCI DSS Requirement 10: Track and monitor all access to network resources and cardholder data
  private async logPCIEvent(eventData: Partial<PCIAuditEvent>): Promise<void> {
    try {
      const event: PCIAuditEvent = {
        event_id: crypto.randomUUID(),
        user_id: eventData.user_id,
        event_type: eventData.event_type || 'UNKNOWN',
        resource_accessed: eventData.resource_accessed || 'unknown',
        access_result: eventData.access_result || 'failure',
        timestamp: new Date(),
        source_ip: eventData.source_ip || 'unknown',
        user_agent: eventData.user_agent,
        session_id: eventData.session_id,
        additional_info: eventData.additional_info,
      };

      // Store in PCI-compliant audit log
      const { error } = await this.supabase.from('pci_audit_logs').insert([
        {
          event_id: event.event_id,
          user_id: event.user_id,
          event_type: event.event_type,
          resource_accessed: event.resource_accessed,
          access_result: event.access_result,
          timestamp: event.timestamp.toISOString(),
          source_ip: event.source_ip,
          user_agent: event.user_agent,
          session_id: event.session_id,
          additional_info: event.additional_info,
          log_integrity_hash: this.generateLogIntegrityHash(event),
        },
      ]);

      if (error) {
        console.error('Failed to log PCI event:', error);
      }

      // Also log to general audit system
      await auditLog.logEvent({
        user_id: event.user_id,
        action: event.event_type,
        resource_type: event.resource_accessed,
        metadata: {
          pci_compliance: true,
          access_result: event.access_result,
          ...event.additional_info,
        },
        timestamp: event.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Critical: Failed to log PCI audit event:', error);
    }
  }

  // PCI DSS Requirement 11: Regularly test security systems and processes
  async performSecurityScan(
    scanType: 'vulnerability' | 'penetration' | 'code_review',
  ): Promise<any> {
    try {
      const scanId = crypto.randomUUID();
      const scanResults = await this.executeScan(scanType, scanId);

      // Log security scan
      await this.logPCIEvent({
        event_type: 'SECURITY_SCAN_PERFORMED',
        resource_accessed: 'security_infrastructure',
        access_result: 'success',
        additional_info: {
          scan_id: scanId,
          scan_type: scanType,
          findings_count: scanResults.findings?.length || 0,
          risk_level: scanResults.risk_level,
          requirement: 'PCI DSS 11.2 - Security testing',
        },
      });

      return {
        scan_id: scanId,
        scan_type: scanType,
        completed_at: new Date().toISOString(),
        results: scanResults,
        next_scan_due: this.calculateNextScanDate(scanType),
      };
    } catch (error) {
      await this.logPCIEvent({
        event_type: 'SECURITY_SCAN_FAILED',
        resource_accessed: 'security_infrastructure',
        access_result: 'failure',
        additional_info: {
          scan_type: scanType,
          error_message: error.message,
          requirement: 'PCI DSS 11.2 - Security testing',
        },
      });
      throw error;
    }
  }

  // Financial transaction processing with PCI DSS compliance
  async processSecureTransaction(transactionData: {
    amount: number;
    currency: string;
    payment_method_token: string;
    transaction_type: TransactionType;
    merchant_id: string;
    user_id: string;
  }): Promise<any> {
    try {
      // Validate transaction data
      const validation = await this.validateTransactionData(transactionData);
      if (!validation.valid) {
        throw new Error(
          `Transaction validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Log transaction start
      await this.logPCIEvent({
        user_id: transactionData.user_id,
        event_type: 'TRANSACTION_INITIATED',
        resource_accessed: 'payment_processing',
        access_result: 'success',
        additional_info: {
          transaction_type: transactionData.transaction_type,
          amount: transactionData.amount,
          currency: transactionData.currency,
          merchant_id: transactionData.merchant_id,
          requirement: 'PCI DSS 12.1 - Transaction processing',
        },
      });

      // Process transaction securely
      const result = await this.executeSecureTransaction(transactionData);

      // Log transaction completion
      await this.logPCIEvent({
        user_id: transactionData.user_id,
        event_type: 'TRANSACTION_COMPLETED',
        resource_accessed: 'payment_processing',
        access_result: result.success ? 'success' : 'failure',
        additional_info: {
          transaction_id: result.transaction_id,
          status: result.status,
          amount: transactionData.amount,
          requirement: 'PCI DSS 12.1 - Transaction processing',
        },
      });

      return result;
    } catch (error) {
      await this.logPCIEvent({
        user_id: transactionData.user_id,
        event_type: 'TRANSACTION_FAILED',
        resource_accessed: 'payment_processing',
        access_result: 'failure',
        additional_info: {
          error_message: error.message,
          transaction_type: transactionData.transaction_type,
          requirement: 'PCI DSS 12.1 - Transaction processing',
        },
      });
      throw error;
    }
  }

  // Data retention and secure disposal (PCI DSS Requirement 3.1)
  async enforceCardDataRetention(): Promise<void> {
    try {
      // PCI DSS requires deletion of cardholder data when no longer needed
      const retentionPolicies = await this.getCardDataRetentionPolicies();

      let totalPurged = 0;
      for (const policy of retentionPolicies) {
        const purgedCount = await this.purgeExpiredCardData(policy);
        totalPurged += purgedCount;
      }

      // Log retention enforcement
      await this.logPCIEvent({
        event_type: 'CARD_DATA_RETENTION_ENFORCED',
        resource_accessed: 'cardholder_data',
        access_result: 'success',
        additional_info: {
          policies_processed: retentionPolicies.length,
          records_purged: totalPurged,
          requirement: 'PCI DSS 3.1 - Data retention',
        },
      });
    } catch (error) {
      await this.logPCIEvent({
        event_type: 'CARD_DATA_RETENTION_FAILED',
        resource_accessed: 'cardholder_data',
        access_result: 'failure',
        additional_info: {
          error_message: error.message,
          requirement: 'PCI DSS 3.1 - Data retention',
        },
      });
      throw error;
    }
  }

  // Utility Methods

  private isValidPAN(pan: string): boolean {
    // Remove spaces and hyphens
    const cleanPAN = pan.replace(/[\s-]/g, '');

    // Check if it's all digits and correct length
    if (!/^\d{13,19}$/.test(cleanPAN)) {
      return false;
    }

    // Luhn algorithm validation
    return this.luhnCheck(cleanPAN);
  }

  private luhnCheck(pan: string): boolean {
    let sum = 0;
    let alternate = false;

    for (let i = pan.length - 1; i >= 0; i--) {
      let n = parseInt(pan.charAt(i), 10);

      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }

      sum += n;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  }

  private encryptPAN(pan: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.tokenizationKey);
    let encrypted = cipher.update(pan, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptPAN(encryptedPAN: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.tokenizationKey);
    let decrypted = decipher.update(encryptedPAN, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async storeTokenMapping(
    token: string,
    encryptedPAN: string,
  ): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24); // Token expires in 24 hours

    const { error } = await this.supabase.from('pci_token_vault').insert([
      {
        token,
        encrypted_pan: encryptedPAN,
        created_at: new Date().toISOString(),
        expires_at: expiryDate.toISOString(),
        usage_count: 0,
        max_usage: 1, // Single use token
      },
    ]);

    if (error) throw error;
  }

  private async retrieveTokenMapping(token: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('pci_token_vault')
      .select('encrypted_pan, usage_count, max_usage')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Update usage count
    if (data.usage_count >= data.max_usage) {
      return null; // Token exhausted
    }

    await this.supabase
      .from('pci_token_vault')
      .update({ usage_count: data.usage_count + 1 })
      .eq('token', token);

    return data.encrypted_pan;
  }

  private async isValidToken(token: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('pci_token_vault')
      .select('usage_count, max_usage')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    return !error && data && data.usage_count < data.max_usage;
  }

  private sanitizeCardholderData(data: PCICardholderData): PCICardholderData {
    const sanitized: PCICardholderData = {};

    if (data.primary_account_number) {
      // Remove any formatting characters
      sanitized.primary_account_number = data.primary_account_number.replace(
        /[\s-]/g,
        '',
      );
    }

    if (data.cardholder_name) {
      // Normalize cardholder name
      sanitized.cardholder_name = data.cardholder_name.trim().toUpperCase();
    }

    if (data.expiration_date) {
      // Normalize expiration date format
      sanitized.expiration_date = data.expiration_date.replace(/\D/g, '');
    }

    return sanitized;
  }

  private async checkFinancialPermissions(
    userId: string,
    operation: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('check_user_permission', {
      user_id: userId,
      permission_name: `finance_${operation}`,
    });

    return !error && data;
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return realIP || cfConnectingIP || 'unknown';
  }

  private generateLogIntegrityHash(event: PCIAuditEvent): string {
    const data = `${event.event_id}${event.timestamp.toISOString()}${event.event_type}${event.user_id || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async executeScan(scanType: string, scanId: string): Promise<any> {
    // Mock security scan - in production this would integrate with actual security tools
    return {
      scan_id: scanId,
      findings: [],
      risk_level: 'low',
      recommendations: [],
    };
  }

  private calculateNextScanDate(scanType: string): string {
    const nextScan = new Date();

    switch (scanType) {
      case 'vulnerability':
        nextScan.setMonth(nextScan.getMonth() + 3); // Quarterly
        break;
      case 'penetration':
        nextScan.setFullYear(nextScan.getFullYear() + 1); // Annually
        break;
      case 'code_review':
        nextScan.setMonth(nextScan.getMonth() + 6); // Bi-annually
        break;
    }

    return nextScan.toISOString();
  }

  private async validateTransactionData(
    data: any,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors = [];

    if (!data.amount || data.amount <= 0) {
      errors.push('Invalid transaction amount');
    }

    if (!data.payment_method_token) {
      errors.push('Payment method token required');
    }

    if (!data.user_id) {
      errors.push('User ID required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async executeSecureTransaction(data: any): Promise<any> {
    // Mock transaction processing - in production this would integrate with payment processor
    return {
      success: true,
      transaction_id: crypto.randomUUID(),
      status: 'completed',
      processed_at: new Date().toISOString(),
    };
  }

  private async getCardDataRetentionPolicies(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('data_retention_policies')
      .select('*')
      .in('data_type', [
        'payment_cards',
        'transaction_data',
        'cardholder_data',
      ]);

    return data || [];
  }

  private async purgeExpiredCardData(policy: any): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

    const { data, error } = await this.supabase
      .from(policy.data_type)
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw error;

    return data?.length || 0;
  }
}

export const pciDSSHandler = PCIDSSComplianceHandler.getInstance();
