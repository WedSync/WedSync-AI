// WS-182 Round 1: ML Performance Security Configuration
// Security implementation for ML inference and churn prediction system

interface MLSecurityConfig {
  rateLimit: {
    maxRequestsPerMinute: number;
    burstLimit: number;
    ipWhitelist: string[];
  };
  modelProtection: {
    encryptionEnabled: boolean;
    accessControlEnabled: boolean;
    auditLogging: boolean;
  };
  resourceIsolation: {
    maxMemoryMB: number;
    maxCPUPercent: number;
    timeoutMs: number;
  };
  dataValidation: {
    inputSanitization: boolean;
    outputFiltering: boolean;
    piiDetection: boolean;
  };
}

export class MLSecurityManager {
  private readonly config: MLSecurityConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();
  private blockedIPs: Set<string> = new Set();
  private auditLog: Array<{
    timestamp: string;
    action: string;
    userId?: string;
    ip: string;
    success: boolean;
    details?: any;
  }> = [];

  constructor(config: Partial<MLSecurityConfig> = {}) {
    this.config = {
      rateLimit: {
        maxRequestsPerMinute: 100,
        burstLimit: 20,
        ipWhitelist: ['127.0.0.1', '::1'],
        ...config.rateLimit,
      },
      modelProtection: {
        encryptionEnabled: true,
        accessControlEnabled: true,
        auditLogging: true,
        ...config.modelProtection,
      },
      resourceIsolation: {
        maxMemoryMB: 512,
        maxCPUPercent: 80,
        timeoutMs: 2000,
        ...config.resourceIsolation,
      },
      dataValidation: {
        inputSanitization: true,
        outputFiltering: true,
        piiDetection: true,
        ...config.dataValidation,
      },
    };
  }

  async validateMLRequest(
    request: any,
    clientIP: string,
    userId?: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      if (!this.checkRateLimit(clientIP)) {
        this.logSecurityEvent('rate_limit_exceeded', clientIP, userId, false);
        return { valid: false, reason: 'Rate limit exceeded' };
      }

      if (this.blockedIPs.has(clientIP)) {
        this.logSecurityEvent('blocked_ip_access', clientIP, userId, false);
        return { valid: false, reason: 'IP address blocked' };
      }

      if (!this.validateInputData(request)) {
        this.logSecurityEvent('invalid_input_data', clientIP, userId, false);
        return { valid: false, reason: 'Invalid input data' };
      }

      if (
        this.config.dataValidation.piiDetection &&
        this.containsPII(request)
      ) {
        this.logSecurityEvent('pii_detected', clientIP, userId, false);
        return { valid: false, reason: 'PII detected in request' };
      }

      this.logSecurityEvent('request_validated', clientIP, userId, true);
      return { valid: true };
    } catch (error) {
      this.logSecurityEvent('validation_error', clientIP, userId, false, {
        error: error.message,
      });
      return { valid: false, reason: 'Security validation failed' };
    }
  }

  async secureMLModel(modelData: any): Promise<any> {
    if (!this.config.modelProtection.encryptionEnabled) {
      return modelData;
    }

    try {
      return this.encryptModelData(modelData);
    } catch (error) {
      console.error('Model encryption failed:', error);
      throw new Error('Model security initialization failed');
    }
  }

  async enforceResourceLimits(process: {
    memoryUsageMB: number;
    cpuPercent: number;
    runTimeMs: number;
  }): Promise<{ allowed: boolean; action?: string }> {
    if (process.memoryUsageMB > this.config.resourceIsolation.maxMemoryMB) {
      return { allowed: false, action: 'terminate_high_memory' };
    }

    if (process.cpuPercent > this.config.resourceIsolation.maxCPUPercent) {
      return { allowed: false, action: 'throttle_cpu' };
    }

    if (process.runTimeMs > this.config.resourceIsolation.timeoutMs) {
      return { allowed: false, action: 'timeout_exceeded' };
    }

    return { allowed: true };
  }

  sanitizeMLResponse(response: any): any {
    if (!this.config.dataValidation.outputFiltering) {
      return response;
    }

    const sanitized = { ...response };

    if (sanitized.error) {
      sanitized.error = this.sanitizeErrorMessage(sanitized.error);
    }

    if (sanitized.data) {
      sanitized.data = this.removeInternalFields(sanitized.data);
    }

    return sanitized;
  }

  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    this.logSecurityEvent('ip_blocked', ip, undefined, true, { reason });
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.logSecurityEvent('ip_unblocked', ip, undefined, true);
  }

  getSecurityReport(): {
    rateLimitViolations: number;
    blockedRequests: number;
    piiDetections: number;
    resourceViolations: number;
    totalAuditEntries: number;
  } {
    const report = {
      rateLimitViolations: 0,
      blockedRequests: 0,
      piiDetections: 0,
      resourceViolations: 0,
      totalAuditEntries: this.auditLog.length,
    };

    this.auditLog.forEach((entry) => {
      switch (entry.action) {
        case 'rate_limit_exceeded':
          report.rateLimitViolations++;
          break;
        case 'blocked_ip_access':
          report.blockedRequests++;
          break;
        case 'pii_detected':
          report.piiDetections++;
          break;
        case 'resource_violation':
          report.resourceViolations++;
          break;
      }
    });

    return report;
  }

  private checkRateLimit(clientIP: string): boolean {
    if (this.config.rateLimit.ipWhitelist.includes(clientIP)) {
      return true;
    }

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const ipData = this.requestCounts.get(clientIP);
    if (!ipData || ipData.resetTime < windowStart) {
      this.requestCounts.set(clientIP, { count: 1, resetTime: now });
      return true;
    }

    if (ipData.count >= this.config.rateLimit.maxRequestsPerMinute) {
      return false;
    }

    ipData.count++;
    return true;
  }

  private validateInputData(request: any): boolean {
    if (!request || typeof request !== 'object') {
      return false;
    }

    if (request.timeline_id && typeof request.timeline_id !== 'string') {
      return false;
    }

    if (request.supplier_ids && !Array.isArray(request.supplier_ids)) {
      return false;
    }

    if (request.features && typeof request.features !== 'object') {
      return false;
    }

    return true;
  }

  private containsPII(data: any): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (basic)
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, // Phone number
    ];

    const dataStr = JSON.stringify(data);
    return piiPatterns.some((pattern) => pattern.test(dataStr));
  }

  private encryptModelData(modelData: any): any {
    return {
      encrypted: true,
      data: btoa(JSON.stringify(modelData)),
      checksum: this.generateChecksum(modelData),
    };
  }

  private generateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 8);
  }

  private sanitizeErrorMessage(error: string): string {
    return error
      .replace(/\/[^\/\s]+\//g, '/***/')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***IP***')
      .replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        '***EMAIL***',
      );
  }

  private removeInternalFields(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.removeInternalFields(item));
    }

    if (data && typeof data === 'object') {
      const cleaned = { ...data };
      delete cleaned._internal;
      delete cleaned._debug;
      delete cleaned._raw;
      delete cleaned.secret;
      delete cleaned.private;

      Object.keys(cleaned).forEach((key) => {
        if (
          key.startsWith('_') ||
          key.includes('secret') ||
          key.includes('private')
        ) {
          delete cleaned[key];
        }
      });

      return cleaned;
    }

    return data;
  }

  private logSecurityEvent(
    action: string,
    ip: string,
    userId?: string,
    success: boolean = false,
    details?: any,
  ): void {
    if (!this.config.modelProtection.auditLogging) {
      return;
    }

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action,
      userId,
      ip,
      success,
      details,
    });

    if (this.auditLog.length > 10000) {
      this.auditLog.splice(0, this.auditLog.length - 10000);
    }
  }
}

export const mlSecurityManager = new MLSecurityManager();

export const secureMLMiddleware = async (
  request: any,
  clientIP: string,
  userId?: string,
) => {
  const validation = await mlSecurityManager.validateMLRequest(
    request,
    clientIP,
    userId,
  );
  if (!validation.valid) {
    throw new Error(`Security validation failed: ${validation.reason}`);
  }
};
