/**
 * MobileSecurityPolicies - Enterprise Security Policy Enforcement
 *
 * Defines and enforces mobile security policies for WedSync's enterprise SSO system
 * with wedding industry-specific security requirements.
 *
 * Wedding Industry Context:
 * - Wedding data contains highly sensitive personal and financial information
 * - Saturday operations must maintain high availability with security
 * - Emergency access protocols for critical wedding day situations
 * - Multi-vendor team coordination with role-based security
 *
 * @author WedSync Security Team
 * @version 2.0.0
 */

// Types and Interfaces
interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  description: string;
  active: boolean;
  enforcementLevel: 'advisory' | 'warning' | 'blocking';
  weddingDayOverrides: boolean;
  applicableRoles: string[];
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  lastUpdated: Date;
}

interface PolicyCondition {
  type:
    | 'device_encryption'
    | 'screen_lock'
    | 'app_version'
    | 'network_security'
    | 'location'
    | 'time_based'
    | 'biometric'
    | 'certificate';
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_contains'
    | 'exists'
    | 'not_exists';
  value: any;
  weddingDayRelaxed: boolean;
}

interface PolicyAction {
  type:
    | 'allow'
    | 'deny'
    | 'require_approval'
    | 'log_event'
    | 'escalate'
    | 'limit_access';
  parameters: Record<string, any>;
  priority: number;
}

interface PolicyViolation {
  id: string;
  policyId: string;
  userId: string;
  deviceId: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolutionMethod?: string;
  weddingDayContext: boolean;
}

interface PolicyEvaluationContext {
  userId: string;
  deviceId: string;
  userRole: string;
  organizationId: string;
  weddingContext?: {
    weddingId: string;
    isWeddingDay: boolean;
    venueId: string;
    teamRole: string;
  };
  deviceInfo: {
    platform: string;
    version: string;
    encrypted: boolean;
    jailbroken: boolean;
    screenLockEnabled: boolean;
    biometricEnabled: boolean;
    location?: { latitude: number; longitude: number };
  };
  networkInfo: {
    connectionType: string;
    secureConnection: boolean;
    vpnActive: boolean;
  };
  applicationInfo: {
    version: string;
    lastUpdated: Date;
    certificateValid: boolean;
  };
}

interface PolicyEvaluationResult {
  allowed: boolean;
  violations: PolicyViolation[];
  requiredActions: string[];
  warningMessages: string[];
  enforcementLevel: 'advisory' | 'warning' | 'blocking';
  bypassAvailable: boolean;
  weddingDayOverrideApplied: boolean;
}

// Wedding Industry Security Policies
const WEDDING_INDUSTRY_POLICIES = {
  // Data Protection Policies
  GDPR_COMPLIANCE: {
    encryptionRequired: true,
    dataRetentionDays: 2555, // 7 years for wedding contracts
    anonymizationRequired: false, // Wedding data often needs to be identifiable
    rightToErasure: true,
    portabilitySupported: true,
  },

  // Payment Security (Wedding payments are high-value)
  PCI_COMPLIANCE: {
    encryptedTransmissions: true,
    tokenizationRequired: true,
    auditLoggingRequired: true,
    minimumTlsVersion: '1.3',
  },

  // Wedding Day Operations
  SATURDAY_AVAILABILITY: {
    allowReducedSecurity: true,
    emergencyBypassEnabled: true,
    enhancedLogging: true,
    prioritySupport: true,
  },
} as const;

class MobileSecurityPolicies {
  private policies: Map<string, SecurityPolicy> = new Map();
  private violations: Map<string, PolicyViolation> = new Map();
  private secureStorage: IDBDatabase | null = null;
  private evaluationCache: Map<
    string,
    { result: PolicyEvaluationResult; timestamp: Date }
  > = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializePolicies();
    this.initializeSecureStorage();
  }

  /**
   * Initialize default security policies
   */
  private async initializePolicies(): Promise<void> {
    try {
      // Device Security Policy
      const deviceSecurityPolicy: SecurityPolicy = {
        id: 'device-security-001',
        name: 'Mobile Device Security Requirements',
        version: '2.0.0',
        description:
          'Enforces minimum security requirements for mobile devices accessing wedding data',
        active: true,
        enforcementLevel: 'blocking',
        weddingDayOverrides: true,
        applicableRoles: ['all'],
        conditions: [
          {
            type: 'device_encryption',
            operator: 'equals',
            value: true,
            weddingDayRelaxed: false, // Never relaxed due to data sensitivity
          },
          {
            type: 'screen_lock',
            operator: 'equals',
            value: true,
            weddingDayRelaxed: true,
          },
          {
            type: 'app_version',
            operator: 'greater_than',
            value: '2.0.0',
            weddingDayRelaxed: true,
          },
        ],
        actions: [
          {
            type: 'deny',
            parameters: {
              message: 'Device does not meet security requirements',
            },
            priority: 1,
          },
          {
            type: 'log_event',
            parameters: { severity: 'high' },
            priority: 2,
          },
        ],
        lastUpdated: new Date(),
      };

      // Network Security Policy
      const networkSecurityPolicy: SecurityPolicy = {
        id: 'network-security-001',
        name: 'Network Security Requirements',
        version: '1.0.0',
        description:
          'Ensures secure network connections for wedding data transmission',
        active: true,
        enforcementLevel: 'warning',
        weddingDayOverrides: true,
        applicableRoles: ['all'],
        conditions: [
          {
            type: 'network_security',
            operator: 'equals',
            value: true,
            weddingDayRelaxed: true,
          },
          {
            type: 'certificate',
            operator: 'exists',
            value: true,
            weddingDayRelaxed: false,
          },
        ],
        actions: [
          {
            type: 'require_approval',
            parameters: { approverRole: 'coordinator' },
            priority: 1,
          },
          {
            type: 'log_event',
            parameters: { severity: 'medium' },
            priority: 2,
          },
        ],
        lastUpdated: new Date(),
      };

      // Wedding Day Emergency Access Policy
      const emergencyAccessPolicy: SecurityPolicy = {
        id: 'emergency-access-001',
        name: 'Wedding Day Emergency Access',
        version: '1.0.0',
        description: 'Special access controls for wedding day emergencies',
        active: true,
        enforcementLevel: 'advisory',
        weddingDayOverrides: true,
        applicableRoles: ['coordinator', 'photographer', 'vendor'],
        conditions: [
          {
            type: 'time_based',
            operator: 'equals',
            value: 'wedding_day',
            weddingDayRelaxed: false,
          },
        ],
        actions: [
          {
            type: 'allow',
            parameters: {
              message: 'Emergency access granted for wedding day operations',
              auditRequired: true,
            },
            priority: 1,
          },
          {
            type: 'log_event',
            parameters: { severity: 'high', emergency: true },
            priority: 2,
          },
        ],
        lastUpdated: new Date(),
      };

      // Biometric Authentication Policy
      const biometricPolicy: SecurityPolicy = {
        id: 'biometric-001',
        name: 'Biometric Authentication Requirements',
        version: '1.0.0',
        description:
          'Encourages biometric authentication for enhanced security',
        active: true,
        enforcementLevel: 'advisory',
        weddingDayOverrides: false,
        applicableRoles: ['coordinator', 'photographer'],
        conditions: [
          {
            type: 'biometric',
            operator: 'equals',
            value: true,
            weddingDayRelaxed: false,
          },
        ],
        actions: [
          {
            type: 'log_event',
            parameters: {
              severity: 'low',
              message: 'Consider enabling biometric authentication',
            },
            priority: 1,
          },
        ],
        lastUpdated: new Date(),
      };

      // Store policies
      this.policies.set(deviceSecurityPolicy.id, deviceSecurityPolicy);
      this.policies.set(networkSecurityPolicy.id, networkSecurityPolicy);
      this.policies.set(emergencyAccessPolicy.id, emergencyAccessPolicy);
      this.policies.set(biometricPolicy.id, biometricPolicy);

      console.log(`🔐 Initialized ${this.policies.size} security policies`);
    } catch (error) {
      console.error('Failed to initialize security policies:', error);
      throw error;
    }
  }

  /**
   * Initialize secure storage
   */
  private async initializeSecureStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncSecurityPolicies', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.secureStorage = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Policies store
        if (!db.objectStoreNames.contains('policies')) {
          const policyStore = db.createObjectStore('policies', {
            keyPath: 'id',
          });
          policyStore.createIndex('active', 'active', { unique: false });
          policyStore.createIndex('enforcementLevel', 'enforcementLevel', {
            unique: false,
          });
        }

        // Violations store
        if (!db.objectStoreNames.contains('violations')) {
          const violationStore = db.createObjectStore('violations', {
            keyPath: 'id',
          });
          violationStore.createIndex('policyId', 'policyId', { unique: false });
          violationStore.createIndex('userId', 'userId', { unique: false });
          violationStore.createIndex('severity', 'severity', { unique: false });
          violationStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
          violationStore.createIndex('resolved', 'resolved', { unique: false });
        }

        // Policy evaluation logs
        if (!db.objectStoreNames.contains('evaluation_logs')) {
          const logStore = db.createObjectStore('evaluation_logs', {
            keyPath: 'id',
            autoIncrement: true,
          });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('userId', 'userId', { unique: false });
          logStore.createIndex('result', 'result', { unique: false });
        }
      };
    });
  }

  /**
   * Evaluate policies against current context
   */
  public async evaluatePolicies(
    context: PolicyEvaluationContext,
  ): Promise<PolicyEvaluationResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(context);
      const cached = this.evaluationCache.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp.getTime() < this.cacheExpiryMs
      ) {
        return cached.result;
      }

      const result: PolicyEvaluationResult = {
        allowed: true,
        violations: [],
        requiredActions: [],
        warningMessages: [],
        enforcementLevel: 'advisory',
        bypassAvailable: false,
        weddingDayOverrideApplied: false,
      };

      const isWeddingDay =
        context.weddingContext?.isWeddingDay || this.isWeddingDay();

      // Evaluate each active policy
      for (const policy of this.policies.values()) {
        if (!policy.active) continue;

        // Check if policy applies to this role
        if (
          policy.applicableRoles.length > 0 &&
          !policy.applicableRoles.includes('all') &&
          !policy.applicableRoles.includes(context.userRole)
        ) {
          continue;
        }

        const policyResult = await this.evaluatePolicy(
          policy,
          context,
          isWeddingDay,
        );

        if (!policyResult.compliant) {
          result.violations.push(...policyResult.violations);

          // Determine enforcement action
          const highestSeverity = this.getHighestSeverity(
            policyResult.violations,
          );

          if (
            policy.enforcementLevel === 'blocking' &&
            highestSeverity === 'critical'
          ) {
            result.allowed = false;
            result.enforcementLevel = 'blocking';
          } else if (policy.enforcementLevel === 'warning') {
            result.enforcementLevel = 'warning';
            result.warningMessages.push(`Policy violation: ${policy.name}`);
          }

          // Check for wedding day overrides
          if (isWeddingDay && policy.weddingDayOverrides) {
            if (
              policyResult.violations.every((v) =>
                this.canOverrideForWeddingDay(v, policy),
              )
            ) {
              result.weddingDayOverrideApplied = true;
              result.bypassAvailable = true;
              result.warningMessages.push(
                `Wedding day override available for: ${policy.name}`,
              );
            }
          }
        }
      }

      // Wedding day special handling
      if (isWeddingDay && result.violations.length > 0) {
        result.bypassAvailable = true;
        result.requiredActions.push(
          'Contact wedding coordinator for emergency access',
        );
      }

      // Cache result
      this.evaluationCache.set(cacheKey, {
        result,
        timestamp: new Date(),
      });

      // Log evaluation
      await this.logPolicyEvaluation(context, result);

      return result;
    } catch (error) {
      console.error('Policy evaluation failed:', error);

      // Fail securely - deny access on evaluation error
      return {
        allowed: false,
        violations: [],
        requiredActions: ['Contact system administrator'],
        warningMessages: ['Policy evaluation error'],
        enforcementLevel: 'blocking',
        bypassAvailable: false,
        weddingDayOverrideApplied: false,
      };
    }
  }

  /**
   * Evaluate individual policy
   */
  private async evaluatePolicy(
    policy: SecurityPolicy,
    context: PolicyEvaluationContext,
    isWeddingDay: boolean,
  ): Promise<{ compliant: boolean; violations: PolicyViolation[] }> {
    const violations: PolicyViolation[] = [];
    let compliant = true;

    for (const condition of policy.conditions) {
      const conditionResult = await this.evaluateCondition(
        condition,
        context,
        isWeddingDay,
      );

      if (!conditionResult.met) {
        compliant = false;

        const violation: PolicyViolation = {
          id: await this.generateViolationId(),
          policyId: policy.id,
          userId: context.userId,
          deviceId: context.deviceId,
          violationType: condition.type,
          severity: this.determineSeverity(condition, policy),
          description: `Policy condition not met: ${condition.type} ${condition.operator} ${condition.value}`,
          timestamp: new Date(),
          resolved: false,
          weddingDayContext: isWeddingDay,
        };

        violations.push(violation);
        this.violations.set(violation.id, violation);

        // Store violation in IndexedDB
        await this.storeViolation(violation);
      }
    }

    return { compliant, violations };
  }

  /**
   * Evaluate policy condition
   */
  private async evaluateCondition(
    condition: PolicyCondition,
    context: PolicyEvaluationContext,
    isWeddingDay: boolean,
  ): Promise<{ met: boolean; actualValue?: any }> {
    let actualValue: any;

    // Get actual value based on condition type
    switch (condition.type) {
      case 'device_encryption':
        actualValue = context.deviceInfo.encrypted;
        break;

      case 'screen_lock':
        actualValue = context.deviceInfo.screenLockEnabled;
        break;

      case 'app_version':
        actualValue = context.applicationInfo.version;
        break;

      case 'network_security':
        actualValue = context.networkInfo.secureConnection;
        break;

      case 'location':
        actualValue = context.deviceInfo.location;
        break;

      case 'time_based':
        if (condition.value === 'wedding_day') {
          actualValue = isWeddingDay;
        } else {
          actualValue = new Date().getHours();
        }
        break;

      case 'biometric':
        actualValue = context.deviceInfo.biometricEnabled;
        break;

      case 'certificate':
        actualValue = context.applicationInfo.certificateValid;
        break;

      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return { met: false };
    }

    // Apply wedding day relaxation if applicable
    if (isWeddingDay && condition.weddingDayRelaxed) {
      return { met: true, actualValue }; // Auto-pass relaxed conditions on wedding day
    }

    // Evaluate condition based on operator
    const met = this.evaluateOperator(
      condition.operator,
      actualValue,
      condition.value,
    );

    return { met, actualValue };
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(
    operator: PolicyCondition['operator'],
    actualValue: any,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'greater_than':
        return actualValue > expectedValue;
      case 'less_than':
        return actualValue < expectedValue;
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(actualValue).includes(String(expectedValue));
      case 'exists':
        return actualValue != null && actualValue !== undefined;
      case 'not_exists':
        return actualValue == null || actualValue === undefined;
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Determine violation severity
   */
  private determineSeverity(
    condition: PolicyCondition,
    policy: SecurityPolicy,
  ): PolicyViolation['severity'] {
    // Critical for encryption and certificate issues
    if (
      condition.type === 'device_encryption' ||
      condition.type === 'certificate'
    ) {
      return 'critical';
    }

    // High for blocking policies
    if (policy.enforcementLevel === 'blocking') {
      return 'high';
    }

    // Medium for warning policies
    if (policy.enforcementLevel === 'warning') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get highest severity from violations
   */
  private getHighestSeverity(
    violations: PolicyViolation[],
  ): PolicyViolation['severity'] {
    if (violations.some((v) => v.severity === 'critical')) return 'critical';
    if (violations.some((v) => v.severity === 'high')) return 'high';
    if (violations.some((v) => v.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Check if violation can be overridden for wedding day
   */
  private canOverrideForWeddingDay(
    violation: PolicyViolation,
    policy: SecurityPolicy,
  ): boolean {
    // Never override critical security issues
    if (
      violation.severity === 'critical' &&
      violation.violationType === 'device_encryption'
    ) {
      return false;
    }

    if (
      violation.severity === 'critical' &&
      violation.violationType === 'certificate'
    ) {
      return false;
    }

    // Other violations can potentially be overridden
    return policy.weddingDayOverrides;
  }

  /**
   * Check if today is a wedding day
   */
  private isWeddingDay(): boolean {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Saturday is primary wedding day, Friday/Sunday also common
    return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  }

  /**
   * Request policy bypass for wedding day emergency
   */
  public async requestWeddingDayBypass(
    userId: string,
    weddingId: string,
    reason: string,
    approverUserId?: string,
  ): Promise<{ approved: boolean; bypassToken?: string; message: string }> {
    try {
      if (!this.isWeddingDay()) {
        return {
          approved: false,
          message: 'Wedding day bypass is only available on wedding days',
        };
      }

      // Generate bypass token
      const bypassToken = await this.generateBypassToken(userId, weddingId);

      // Log bypass request
      await this.logPolicyEvaluation(
        {
          userId,
          deviceId: 'bypass-request',
          userRole: 'emergency',
          organizationId: 'wedding-emergency',
          deviceInfo: {
            platform: 'bypass',
            version: '1.0.0',
            encrypted: true,
            jailbroken: false,
            screenLockEnabled: true,
            biometricEnabled: false,
          },
          networkInfo: {
            connectionType: 'emergency',
            secureConnection: true,
            vpnActive: false,
          },
          applicationInfo: {
            version: '1.0.0',
            lastUpdated: new Date(),
            certificateValid: true,
          },
        },
        {
          allowed: true,
          violations: [],
          requiredActions: [],
          warningMessages: [],
          enforcementLevel: 'advisory',
          bypassAvailable: true,
          weddingDayOverrideApplied: true,
        },
      );

      return {
        approved: true,
        bypassToken,
        message: 'Wedding day emergency bypass approved',
      };
    } catch (error) {
      console.error('Failed to request wedding day bypass:', error);
      return {
        approved: false,
        message: 'Bypass request failed',
      };
    }
  }

  /**
   * Add custom policy
   */
  public async addPolicy(
    policy: Omit<SecurityPolicy, 'lastUpdated'>,
  ): Promise<boolean> {
    try {
      const fullPolicy: SecurityPolicy = {
        ...policy,
        lastUpdated: new Date(),
      };

      this.policies.set(policy.id, fullPolicy);

      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['policies'],
          'readwrite',
        );
        const store = transaction.objectStore('policies');
        await store.put(fullPolicy);
      }

      console.log(`📋 Added security policy: ${policy.name}`);
      return true;
    } catch (error) {
      console.error('Failed to add policy:', error);
      return false;
    }
  }

  /**
   * Update existing policy
   */
  public async updatePolicy(
    policyId: string,
    updates: Partial<SecurityPolicy>,
  ): Promise<boolean> {
    try {
      const existingPolicy = this.policies.get(policyId);
      if (!existingPolicy) {
        return false;
      }

      const updatedPolicy: SecurityPolicy = {
        ...existingPolicy,
        ...updates,
        lastUpdated: new Date(),
      };

      this.policies.set(policyId, updatedPolicy);

      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['policies'],
          'readwrite',
        );
        const store = transaction.objectStore('policies');
        await store.put(updatedPolicy);
      }

      console.log(`📋 Updated security policy: ${updatedPolicy.name}`);
      return true;
    } catch (error) {
      console.error('Failed to update policy:', error);
      return false;
    }
  }

  /**
   * Get policy by ID
   */
  public getPolicy(policyId: string): SecurityPolicy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * Get all active policies
   */
  public getActivePolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values()).filter((policy) => policy.active);
  }

  /**
   * Get violation history
   */
  public getViolations(userId?: string, resolved?: boolean): PolicyViolation[] {
    let violations = Array.from(this.violations.values());

    if (userId) {
      violations = violations.filter((v) => v.userId === userId);
    }

    if (resolved !== undefined) {
      violations = violations.filter((v) => v.resolved === resolved);
    }

    return violations.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Mark violation as resolved
   */
  public async resolveViolation(
    violationId: string,
    resolutionMethod: string,
  ): Promise<boolean> {
    try {
      const violation = this.violations.get(violationId);
      if (!violation) {
        return false;
      }

      violation.resolved = true;
      violation.resolutionMethod = resolutionMethod;

      this.violations.set(violationId, violation);

      if (this.secureStorage) {
        const transaction = this.secureStorage.transaction(
          ['violations'],
          'readwrite',
        );
        const store = transaction.objectStore('violations');
        await store.put(violation);
      }

      return true;
    } catch (error) {
      console.error('Failed to resolve violation:', error);
      return false;
    }
  }

  /**
   * Generate cache key for evaluation context
   */
  private generateCacheKey(context: PolicyEvaluationContext): string {
    const keyData = [
      context.userId,
      context.deviceId,
      context.userRole,
      JSON.stringify(context.deviceInfo),
      JSON.stringify(context.networkInfo),
      JSON.stringify(context.applicationInfo),
      context.weddingContext?.weddingId || 'no-wedding',
    ].join('|');

    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `policy_eval_${hash.toString(36)}`;
  }

  /**
   * Generate unique violation ID
   */
  private async generateViolationId(): Promise<string> {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `violation_${hex}`;
  }

  /**
   * Generate bypass token
   */
  private async generateBypassToken(
    userId: string,
    weddingId: string,
  ): Promise<string> {
    const data = [
      'wedding_bypass',
      userId,
      weddingId,
      Date.now().toString(),
    ].join('|');

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(data),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `wedsync_bypass_${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Store violation in IndexedDB
   */
  private async storeViolation(violation: PolicyViolation): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const transaction = this.secureStorage.transaction(
        ['violations'],
        'readwrite',
      );
      const store = transaction.objectStore('violations');
      await store.put(violation);
    } catch (error) {
      console.error('Failed to store violation:', error);
    }
  }

  /**
   * Log policy evaluation
   */
  private async logPolicyEvaluation(
    context: PolicyEvaluationContext,
    result: PolicyEvaluationResult,
  ): Promise<void> {
    if (!this.secureStorage) return;

    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: context.userId,
        deviceId: context.deviceId,
        userRole: context.userRole,
        result: result.allowed ? 'allowed' : 'denied',
        violationCount: result.violations.length,
        enforcementLevel: result.enforcementLevel,
        weddingDayOverride: result.weddingDayOverrideApplied,
        weddingContext: context.weddingContext,
      };

      const transaction = this.secureStorage.transaction(
        ['evaluation_logs'],
        'readwrite',
      );
      const store = transaction.objectStore('evaluation_logs');
      await store.add(logEntry);
    } catch (error) {
      console.error('Failed to log policy evaluation:', error);
    }
  }

  /**
   * Get policy statistics
   */
  public getPolicyStats(): {
    totalPolicies: number;
    activePolicies: number;
    totalViolations: number;
    unresolvedViolations: number;
    weddingDayBypassesUsed: number;
  } {
    const violations = Array.from(this.violations.values());

    return {
      totalPolicies: this.policies.size,
      activePolicies: Array.from(this.policies.values()).filter((p) => p.active)
        .length,
      totalViolations: violations.length,
      unresolvedViolations: violations.filter((v) => !v.resolved).length,
      weddingDayBypassesUsed: violations.filter((v) => v.weddingDayContext)
        .length,
    };
  }

  /**
   * Cleanup expired cache entries
   */
  public cleanupCache(): void {
    const now = Date.now();

    for (const [key, cached] of this.evaluationCache.entries()) {
      if (now - cached.timestamp.getTime() >= this.cacheExpiryMs) {
        this.evaluationCache.delete(key);
      }
    }
  }

  /**
   * Shutdown and cleanup
   */
  public async shutdown(): Promise<void> {
    try {
      this.policies.clear();
      this.violations.clear();
      this.evaluationCache.clear();

      if (this.secureStorage) {
        this.secureStorage.close();
        this.secureStorage = null;
      }

      console.log('📋 MobileSecurityPolicies shutdown complete');
    } catch (error) {
      console.error('Error during security policies shutdown:', error);
    }
  }
}

export default MobileSecurityPolicies;
export type {
  SecurityPolicy,
  PolicyCondition,
  PolicyAction,
  PolicyViolation,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
};
