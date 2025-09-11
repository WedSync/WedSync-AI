import { Logger } from '@/lib/logging/Logger';
import { EventEmitter } from 'events';

export interface BusinessVerificationRequest {
  companyName: string;
  registrationNumber?: string;
  country: string;
  postcode?: string;
  address?: string;
}

export interface BusinessVerificationResult {
  isValid: boolean;
  companyData: {
    name: string;
    registrationNumber: string;
    status: string;
    incorporationDate: string;
    address: string;
    directors?: Array<{
      name: string;
      appointedDate: string;
      resignedDate?: string;
    }>;
  };
  taxCompliance: {
    isCompliant: boolean;
    vatNumber?: string;
    taxStatus: string;
  };
  confidence: number;
  verificationDate: Date;
  expiryDate: Date;
}

export interface InsurancePolicyRequest {
  policyNumber: string;
  providerName: string;
  policyType: string;
  coverageAmount: number;
  effectiveDate: string;
  expiryDate: string;
}

export interface InsuranceValidationResult {
  isValid: boolean;
  policyData: {
    policyNumber: string;
    providerName: string;
    policyType: string;
    coverageAmount: number;
    effectiveDate: Date;
    expiryDate: Date;
    status: 'active' | 'expired' | 'cancelled' | 'suspended';
  };
  coverageDetails: {
    publicLiability: number;
    professionalIndemnity: number;
    productLiability?: number;
    employersLiability?: number;
  };
  confidence: number;
  verificationDate: Date;
  warnings: string[];
}

export interface ExternalService {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
  isEnabled: boolean;
}

export interface ServiceError {
  service: string;
  code: string;
  message: string;
  retryable: boolean;
  timestamp: Date;
}

export interface FailureHandling {
  shouldRetry: boolean;
  retryAfter: number;
  useBackupService: boolean;
  backupServiceId?: string;
  logLevel: 'info' | 'warn' | 'error' | 'critical';
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: Date | null = null;
  private isOpen: boolean = false;

  constructor(
    private threshold: number,
    private timeout: number,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (this.shouldAttemptReset()) {
        this.isOpen = false;
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime.getTime() > this.timeout
    );
  }

  private onSuccess(): void {
    this.failures = 0;
    this.isOpen = false;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.threshold) {
      this.isOpen = true;
    }
  }

  get state(): { isOpen: boolean; failures: number } {
    return { isOpen: this.isOpen, failures: this.failures };
  }
}

export class ExternalServiceConnector extends EventEmitter {
  private logger: Logger;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private serviceConfigs: Map<string, ExternalService>;

  constructor() {
    super();
    this.logger = new Logger('ExternalServiceConnector');
    this.circuitBreakers = new Map();
    this.serviceConfigs = new Map();
    this.initializeServices();
  }

  async verifyBusinessRegistration(
    businessData: BusinessVerificationRequest,
  ): Promise<BusinessVerificationResult> {
    try {
      this.logger.info('Starting business registration verification', {
        businessData,
      });

      // Primary service: Companies House (UK)
      if (
        businessData.country.toLowerCase() === 'uk' ||
        businessData.country.toLowerCase() === 'united kingdom'
      ) {
        return await this.verifyUKBusinessRegistration(businessData);
      }

      // International business registry APIs
      return await this.verifyInternationalBusinessRegistration(businessData);
    } catch (error) {
      this.logger.error('Business registration verification failed', error);
      await this.handleServiceFailure(
        'business_registration',
        error as ServiceError,
      );
      throw error;
    }
  }

  async validateInsurancePolicy(
    policyData: InsurancePolicyRequest,
  ): Promise<InsuranceValidationResult> {
    try {
      this.logger.info('Starting insurance policy validation', { policyData });

      const circuitBreaker = this.getOrCreateCircuitBreaker('insurance_api');

      const result = await circuitBreaker.execute(async () => {
        return await this.callInsuranceAPI(policyData);
      });

      this.emit('insurance_validated', { policyData, result });
      return result;
    } catch (error) {
      this.logger.error('Insurance policy validation failed', error);
      await this.handleServiceFailure('insurance_api', error as ServiceError);
      throw error;
    }
  }

  private async verifyUKBusinessRegistration(
    businessData: BusinessVerificationRequest,
  ): Promise<BusinessVerificationResult> {
    const circuitBreaker = this.getOrCreateCircuitBreaker('companies_house');

    return await circuitBreaker.execute(async () => {
      // Companies House API call
      const companyData = await this.callCompaniesHouseAPI(businessData);

      // Tax compliance check via HMRC API
      const taxData = await this.callHMRCAPI(companyData.registrationNumber);

      return {
        isValid: companyData.isValid && taxData.isCompliant,
        companyData: {
          name: companyData.name,
          registrationNumber: companyData.registrationNumber,
          status: companyData.status,
          incorporationDate: companyData.incorporationDate,
          address: companyData.address,
          directors: companyData.directors,
        },
        taxCompliance: {
          isCompliant: taxData.isCompliant,
          vatNumber: taxData.vatNumber,
          taxStatus: taxData.status,
        },
        confidence: this.calculateConfidence(companyData, taxData),
        verificationDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };
    });
  }

  private async verifyInternationalBusinessRegistration(
    businessData: BusinessVerificationRequest,
  ): Promise<BusinessVerificationResult> {
    // Implementation for international business registries
    // This would integrate with various country-specific APIs
    throw new Error('International business registration not implemented yet');
  }

  private async callCompaniesHouseAPI(
    businessData: BusinessVerificationRequest,
  ): Promise<any> {
    const service = this.serviceConfigs.get('companies_house');
    if (!service || !service.isEnabled) {
      throw new Error('Companies House service not available');
    }

    const response = await fetch(
      `${service.baseUrl}/company/${businessData.registrationNumber}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(service.apiKey + ':').toString('base64')}`,
          Accept: 'application/json',
        },
        timeout: service.timeout,
      },
    );

    if (!response.ok) {
      throw new Error(`Companies House API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      isValid: true,
      name: data.company_name,
      registrationNumber: data.company_number,
      status: data.company_status,
      incorporationDate: data.date_of_creation,
      address: `${data.registered_office_address.address_line_1}, ${data.registered_office_address.locality}, ${data.registered_office_address.postal_code}`,
      directors: data.officers?.active_directors || [],
    };
  }

  private async callHMRCAPI(registrationNumber: string): Promise<any> {
    // Mock HMRC API call - in real implementation, this would call HMRC APIs
    return {
      isCompliant: true,
      vatNumber: `GB${registrationNumber}`,
      status: 'active',
    };
  }

  private async callInsuranceAPI(
    policyData: InsurancePolicyRequest,
  ): Promise<InsuranceValidationResult> {
    const service = this.serviceConfigs.get('insurance_api');
    if (!service || !service.isEnabled) {
      throw new Error('Insurance API service not available');
    }

    // Mock insurance API call - in real implementation, this would integrate with various insurance providers
    const response = await fetch(`${service.baseUrl}/validate-policy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${service.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policy_number: policyData.policyNumber,
        provider: policyData.providerName,
      }),
      timeout: service.timeout,
    });

    if (!response.ok) {
      throw new Error(`Insurance API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      isValid: data.is_valid,
      policyData: {
        policyNumber: data.policy_number,
        providerName: data.provider_name,
        policyType: data.policy_type,
        coverageAmount: data.coverage_amount,
        effectiveDate: new Date(data.effective_date),
        expiryDate: new Date(data.expiry_date),
        status: data.status,
      },
      coverageDetails: {
        publicLiability: data.coverage_details.public_liability,
        professionalIndemnity: data.coverage_details.professional_indemnity,
        productLiability: data.coverage_details.product_liability,
        employersLiability: data.coverage_details.employers_liability,
      },
      confidence: data.confidence_score,
      verificationDate: new Date(),
      warnings: data.warnings || [],
    };
  }

  private async handleServiceFailure(
    service: string,
    error: ServiceError,
  ): Promise<FailureHandling> {
    try {
      this.logger.warn('Handling service failure', { service, error });

      const handling: FailureHandling = {
        shouldRetry: this.shouldRetry(error),
        retryAfter: this.calculateRetryDelay(error),
        useBackupService: this.hasBackupService(service),
        logLevel: this.determineLogLevel(error),
      };

      if (handling.useBackupService) {
        handling.backupServiceId = this.getBackupServiceId(service);
      }

      // Emit failure event for monitoring
      this.emit('service_failure', {
        service,
        error,
        handling,
        timestamp: new Date(),
      });

      // Check if circuit breaker should open
      const circuitBreaker = this.getOrCreateCircuitBreaker(service);
      if (
        circuitBreaker.state.failures >=
          this.serviceConfigs.get(service)?.circuitBreakerThreshold ??
        5
      ) {
        this.emit('circuit_breaker_open', { service, timestamp: new Date() });
      }

      return handling;
    } catch (handlingError) {
      this.logger.error('Failed to handle service failure', handlingError);
      throw handlingError;
    }
  }

  private shouldRetry(error: ServiceError): boolean {
    // Don't retry client errors (4xx)
    if (error.code.startsWith('4')) return false;

    // Retry server errors (5xx) and network errors
    return error.retryable !== false;
  }

  private calculateRetryDelay(error: ServiceError): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const baseDelay = 1000;
    const attempt = parseInt(error.code) || 1;
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
  }

  private hasBackupService(service: string): boolean {
    const backupServices = {
      companies_house: 'duedil_api',
      insurance_api: 'insurance_backup_api',
      professional_board: 'professional_backup_api',
    };

    return Object.prototype.hasOwnProperty.call(backupServices, service);
  }

  private getBackupServiceId(service: string): string {
    const backupServices = {
      companies_house: 'duedil_api',
      insurance_api: 'insurance_backup_api',
      professional_board: 'professional_backup_api',
    };

    return backupServices[service as keyof typeof backupServices] || '';
  }

  private determineLogLevel(
    error: ServiceError,
  ): 'info' | 'warn' | 'error' | 'critical' {
    if (error.code.startsWith('5')) return 'critical';
    if (error.code.startsWith('4')) return 'warn';
    return 'error';
  }

  private calculateConfidence(companyData: any, taxData: any): number {
    let confidence = 0;

    // Company data validation
    if (companyData.status === 'active') confidence += 40;
    if (companyData.directors && companyData.directors.length > 0)
      confidence += 20;
    if (companyData.incorporationDate) confidence += 10;

    // Tax compliance
    if (taxData.isCompliant) confidence += 30;

    return Math.min(confidence, 100);
  }

  private getOrCreateCircuitBreaker(serviceId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceId)) {
      const service = this.serviceConfigs.get(serviceId);
      const threshold = service?.circuitBreakerThreshold || 5;
      const timeout = 60000; // 1 minute

      this.circuitBreakers.set(
        serviceId,
        new CircuitBreaker(threshold, timeout),
      );
    }

    return this.circuitBreakers.get(serviceId)!;
  }

  private initializeServices(): void {
    // Initialize service configurations
    this.serviceConfigs.set('companies_house', {
      id: 'companies_house',
      name: 'Companies House API',
      baseUrl: 'https://api.company-information.service.gov.uk',
      apiKey: process.env.COMPANIES_HOUSE_API_KEY || '',
      timeout: 30000,
      retryAttempts: 3,
      circuitBreakerThreshold: 5,
      isEnabled: true,
    });

    this.serviceConfigs.set('insurance_api', {
      id: 'insurance_api',
      name: 'Insurance Validation API',
      baseUrl: 'https://api.insurancevalidator.com',
      apiKey: process.env.INSURANCE_API_KEY || '',
      timeout: 20000,
      retryAttempts: 2,
      circuitBreakerThreshold: 3,
      isEnabled: true,
    });

    // Add more service configurations as needed
  }

  async getServiceHealth(
    serviceId: string,
  ): Promise<{ healthy: boolean; latency: number; lastCheck: Date }> {
    const service = this.serviceConfigs.get(serviceId);
    if (!service) {
      throw new Error('Service not found');
    }

    const startTime = Date.now();
    try {
      const response = await fetch(`${service.baseUrl}/health`, {
        timeout: 5000,
      });

      return {
        healthy: response.ok,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }
}
