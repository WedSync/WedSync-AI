/**
 * MobileSecurityManager - Comprehensive security management for mobile analytics
 *
 * Features:
 * - Centralized security policy enforcement
 * - Multi-layered authentication and authorization
 * - Real-time threat detection and mitigation
 * - Device-specific security adaptations
 * - Security event logging and monitoring
 * - Compliance with mobile security standards
 * - Integration with biometric authentication
 * - Secure data handling and encryption
 */

import {
  MobileSecurityConfig,
  SecureAnalyticsSession,
  MobileAnalyticsError,
} from '@/types/mobile-analytics';

interface SecurityPolicy {
  name: string;
  enabled: boolean;
  level: 'strict' | 'moderate' | 'permissive';
  rules: SecurityRule[];
}

interface SecurityRule {
  id: string;
  type: 'authentication' | 'encryption' | 'network' | 'storage' | 'biometric';
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'encrypt' | 'audit';
  priority: number;
}

interface SecurityThreat {
  id: string;
  type:
    | 'brute_force'
    | 'injection'
    | 'session_hijack'
    | 'data_breach'
    | 'network_attack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: Date;
  source: string;
  description: string;
  mitigated: boolean;
  mitigation?: string;
}

interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  event:
    | 'auth_attempt'
    | 'data_access'
    | 'encryption'
    | 'threat_detected'
    | 'policy_violation';
  userId?: string;
  deviceId: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

interface DeviceFingerprint {
  id: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  touchSupport: boolean;
  cookiesEnabled: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  webgl: boolean;
  canvas: string; // Canvas fingerprint hash
  audio: string; // Audio context fingerprint
}

export class MobileSecurityManager {
  private config: MobileSecurityConfig;
  private currentSession: SecureAnalyticsSession | null = null;
  private securityPolicies: SecurityPolicy[] = [];
  private threatDetectors: Map<string, (data: any) => SecurityThreat | null> =
    new Map();
  private auditLogs: SecurityAuditLog[] = [];
  private deviceFingerprint: DeviceFingerprint | null = null;

  // Security monitoring
  private authAttempts: Map<string, { count: number; lastAttempt: Date }> =
    new Map();
  private sessionTokens: Map<
    string,
    { token: string; expires: Date; refreshToken?: string }
  > = new Map();
  private encryptionKeys: Map<string, CryptoKey> = new Map();

  // Biometric integration
  private biometricService: any = null; // Will be injected
  private biometricEnabled: boolean = false;

  // Network security
  private trustedDomains: Set<string> = new Set();
  private blockedDomains: Set<string> = new Set();

  constructor(config: MobileSecurityConfig) {
    this.config = {
      encryptLocalData: true,
      biometricAuth: false,
      sessionTimeout: 30,
      allowScreenshots: false,
      allowBackground: true,
      requirePasscode: false,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize security manager
   */
  private async initialize(): Promise<void> {
    try {
      // Generate device fingerprint
      await this.generateDeviceFingerprint();

      // Load security policies
      await this.loadSecurityPolicies();

      // Initialize threat detectors
      this.initializeThreatDetectors();

      // Set up network security
      this.setupNetworkSecurity();

      // Initialize biometric authentication if available
      await this.initializeBiometricAuth();

      // Start security monitoring
      this.startSecurityMonitoring();

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('[SecurityManager] Initialization failed:', error);
    }
  }

  /**
   * Create secure analytics session
   */
  async createSecureSession(
    vendorId: string,
    credentials?: any,
  ): Promise<SecureAnalyticsSession> {
    const sessionId = crypto.randomUUID();
    const deviceId = this.deviceFingerprint?.id || 'unknown';

    // Validate credentials if provided
    if (credentials && !(await this.validateCredentials(credentials))) {
      this.logSecurityEvent(
        'auth_attempt',
        {
          vendorId,
          deviceId,
          success: false,
          reason: 'Invalid credentials',
        },
        'high',
      );

      throw new Error('Authentication failed');
    }

    // Check for brute force attempts
    if (this.detectBruteForceAttempt(vendorId)) {
      this.logSecurityEvent(
        'threat_detected',
        {
          type: 'brute_force',
          vendorId,
          deviceId,
        },
        'high',
      );

      throw new Error('Too many failed attempts - account temporarily locked');
    }

    // Generate session tokens
    const sessionToken = await this.generateSessionToken();
    const refreshToken = await this.generateRefreshToken();

    // Create session
    const session: SecureAnalyticsSession = {
      id: sessionId,
      vendorId,
      startTime: new Date(),
      lastActivity: new Date(),
      isAuthenticated: true,
      permissions: await this.getVendorPermissions(vendorId),
      deviceFingerprint: deviceId,
    };

    // Store session securely
    this.currentSession = session;
    this.sessionTokens.set(sessionId, {
      token: sessionToken,
      expires: new Date(Date.now() + this.config.sessionTimeout * 60 * 1000),
      refreshToken,
    });

    // Log successful authentication
    this.logSecurityEvent(
      'auth_attempt',
      {
        vendorId,
        deviceId,
        sessionId,
        success: true,
      },
      'low',
    );

    return session;
  }

  /**
   * Validate secure session
   */
  async validateSession(sessionId: string, token: string): Promise<boolean> {
    const storedToken = this.sessionTokens.get(sessionId);

    if (!storedToken) {
      this.logSecurityEvent(
        'auth_attempt',
        {
          sessionId,
          success: false,
          reason: 'Session not found',
        },
        'medium',
      );
      return false;
    }

    if (storedToken.expires < new Date()) {
      this.sessionTokens.delete(sessionId);
      this.logSecurityEvent(
        'auth_attempt',
        {
          sessionId,
          success: false,
          reason: 'Session expired',
        },
        'medium',
      );
      return false;
    }

    if (storedToken.token !== token) {
      this.logSecurityEvent(
        'threat_detected',
        {
          type: 'session_hijack',
          sessionId,
          providedToken: token.substring(0, 10) + '...',
        },
        'high',
      );
      return false;
    }

    // Update session activity
    if (this.currentSession?.id === sessionId) {
      this.currentSession.lastActivity = new Date();
    }

    return true;
  }

  /**
   * Refresh session token
   */
  async refreshSessionToken(
    sessionId: string,
    refreshToken: string,
  ): Promise<string | null> {
    const storedToken = this.sessionTokens.get(sessionId);

    if (!storedToken || storedToken.refreshToken !== refreshToken) {
      this.logSecurityEvent(
        'threat_detected',
        {
          type: 'session_hijack',
          sessionId,
          action: 'refresh_token_invalid',
        },
        'high',
      );
      return null;
    }

    // Generate new tokens
    const newSessionToken = await this.generateSessionToken();
    const newRefreshToken = await this.generateRefreshToken();

    // Update stored tokens
    this.sessionTokens.set(sessionId, {
      token: newSessionToken,
      expires: new Date(Date.now() + this.config.sessionTimeout * 60 * 1000),
      refreshToken: newRefreshToken,
    });

    return newSessionToken;
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(
    data: string,
    keyId: string = 'default',
  ): Promise<{ encrypted: string; iv: string; keyId: string }> {
    if (!this.config.encryptLocalData) {
      return { encrypted: data, iv: '', keyId: '' };
    }

    try {
      let key = this.encryptionKeys.get(keyId);

      if (!key) {
        key = await this.generateEncryptionKey();
        this.encryptionKeys.set(keyId, key);
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(data);

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData,
      );

      const encrypted = btoa(
        String.fromCharCode(...new Uint8Array(encryptedBuffer)),
      );
      const ivString = btoa(String.fromCharCode(...iv));

      return { encrypted, iv: ivString, keyId };
    } catch (error) {
      console.error('[SecurityManager] Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(
    encrypted: string,
    iv: string,
    keyId: string,
  ): Promise<string> {
    if (!this.config.encryptLocalData || !keyId) {
      return encrypted;
    }

    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error('Encryption key not found');
      }

      const encryptedBuffer = Uint8Array.from(atob(encrypted), (c) =>
        c.charCodeAt(0),
      );
      const ivBuffer = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        encryptedBuffer,
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('[SecurityManager] Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    if (!this.biometricEnabled || !this.biometricService) {
      return false;
    }

    try {
      const result = await this.biometricService.authenticate({
        reason: 'Authenticate to access analytics data',
        subtitle: 'Use your biometric to verify your identity',
        fallbackTitle: 'Use Passcode',
      });

      if (result.success) {
        this.logSecurityEvent(
          'auth_attempt',
          {
            method: 'biometric',
            success: true,
            deviceId: this.deviceFingerprint?.id,
          },
          'low',
        );
        return true;
      } else {
        this.logSecurityEvent(
          'auth_attempt',
          {
            method: 'biometric',
            success: false,
            error: result.error,
            deviceId: this.deviceFingerprint?.id,
          },
          'medium',
        );
        return false;
      }
    } catch (error) {
      console.error(
        '[SecurityManager] Biometric authentication failed:',
        error,
      );
      return false;
    }
  }

  /**
   * Validate network request security
   */
  async validateNetworkRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<boolean> {
    const urlObj = new URL(url);

    // Check against blocked domains
    if (this.blockedDomains.has(urlObj.hostname)) {
      this.logSecurityEvent(
        'threat_detected',
        {
          type: 'network_attack',
          url,
          reason: 'Blocked domain',
        },
        'high',
      );
      return false;
    }

    // Ensure HTTPS for sensitive data
    if (
      urlObj.protocol !== 'https:' &&
      !urlObj.hostname.includes('localhost')
    ) {
      this.logSecurityEvent(
        'policy_violation',
        {
          url,
          reason: 'Non-HTTPS request',
        },
        'medium',
      );
      return false;
    }

    // Validate request headers
    const headers = (options.headers as Record<string, string>) || {};

    // Check for injection attempts in headers
    for (const [key, value] of Object.entries(headers)) {
      if (this.detectInjectionAttempt(value)) {
        this.logSecurityEvent(
          'threat_detected',
          {
            type: 'injection',
            header: key,
            value: value.substring(0, 50) + '...',
          },
          'high',
        );
        return false;
      }
    }

    // Validate request body
    if (options.body && typeof options.body === 'string') {
      if (this.detectInjectionAttempt(options.body)) {
        this.logSecurityEvent(
          'threat_detected',
          {
            type: 'injection',
            location: 'request_body',
          },
          'high',
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Handle application going to background
   */
  handleAppBackground(): void {
    if (!this.config.allowBackground) {
      // Clear sensitive data from memory
      this.clearSensitiveData();

      // Invalidate current session
      if (this.currentSession) {
        this.logSecurityEvent(
          'data_access',
          {
            action: 'app_backgrounded',
            sessionCleared: true,
          },
          'medium',
        );
      }
    }

    // Always clear clipboard and form data
    this.clearClipboard();
    this.clearFormData();
  }

  /**
   * Handle application returning to foreground
   */
  async handleAppForeground(): Promise<void> {
    if (!this.config.allowBackground && this.currentSession) {
      // Require re-authentication
      if (this.config.biometricAuth) {
        const biometricSuccess = await this.authenticateWithBiometrics();
        if (!biometricSuccess) {
          await this.invalidateSession();
          throw new Error('Re-authentication required');
        }
      }
    }
  }

  /**
   * Secure deep link handling
   */
  async handleDeepLink(
    url: string,
  ): Promise<{ valid: boolean; sanitized?: string; error?: string }> {
    try {
      const urlObj = new URL(url);

      // Validate URL structure
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'wedsync:') {
        return { valid: false, error: 'Invalid protocol' };
      }

      // Check for malicious parameters
      const params = new URLSearchParams(urlObj.search);
      for (const [key, value] of params.entries()) {
        if (this.detectInjectionAttempt(value)) {
          this.logSecurityEvent(
            'threat_detected',
            {
              type: 'injection',
              source: 'deep_link',
              parameter: key,
            },
            'high',
          );
          return { valid: false, error: 'Malicious parameter detected' };
        }
      }

      // Sanitize URL
      const sanitizedUrl = this.sanitizeUrl(url);

      this.logSecurityEvent(
        'data_access',
        {
          action: 'deep_link_handled',
          url: sanitizedUrl,
        },
        'low',
      );

      return { valid: true, sanitized: sanitizedUrl };
    } catch (error) {
      console.error('[SecurityManager] Deep link validation failed:', error);
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Generate device fingerprint
   */
  private async generateDeviceFingerprint(): Promise<void> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprinting', 2, 2);
      const canvasFingerprint = canvas.toDataURL();

      // Audio context fingerprint
      let audioFingerprint = '';
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const analyser = audioContext.createAnalyser();
        oscillator.connect(analyser);
        oscillator.start(0);
        audioFingerprint = analyser.frequencyBinCount.toString();
        oscillator.stop();
        audioContext.close();
      } catch (e) {
        audioFingerprint = 'unavailable';
      }

      this.deviceFingerprint = {
        id: await this.hashString(
          navigator.userAgent +
            screen.width +
            screen.height +
            navigator.language +
            Intl.DateTimeFormat().resolvedOptions().timeZone +
            canvasFingerprint,
        ),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        touchSupport: 'ontouchstart' in window,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        webgl: !!document.createElement('canvas').getContext('webgl'),
        canvas: await this.hashString(canvasFingerprint),
        audio: audioFingerprint,
      };
    } catch (error) {
      console.error('[SecurityManager] Fingerprint generation failed:', error);
      this.deviceFingerprint = {
        id: 'unknown',
        userAgent: navigator.userAgent || 'unknown',
        screenResolution: 'unknown',
        timezone: 'unknown',
        language: navigator.language || 'unknown',
        platform: navigator.platform || 'unknown',
        touchSupport: false,
        cookiesEnabled: false,
        localStorage: false,
        sessionStorage: false,
        webgl: false,
        canvas: 'unknown',
        audio: 'unknown',
      };
    }
  }

  /**
   * Load security policies
   */
  private async loadSecurityPolicies(): Promise<void> {
    // Default security policies
    const defaultPolicies: SecurityPolicy[] = [
      {
        name: 'Authentication Policy',
        enabled: true,
        level: 'strict',
        rules: [
          {
            id: 'require_auth',
            type: 'authentication',
            condition: 'data_access',
            action: 'deny',
            priority: 1,
          },
          {
            id: 'session_timeout',
            type: 'authentication',
            condition: 'session_age > 30min',
            action: 'deny',
            priority: 2,
          },
        ],
      },
      {
        name: 'Data Protection Policy',
        enabled: true,
        level: 'strict',
        rules: [
          {
            id: 'encrypt_storage',
            type: 'encryption',
            condition: 'local_storage',
            action: 'encrypt',
            priority: 1,
          },
          {
            id: 'secure_transmission',
            type: 'network',
            condition: 'api_request',
            action: 'encrypt',
            priority: 1,
          },
        ],
      },
    ];

    this.securityPolicies = defaultPolicies;

    // Try to load custom policies from storage
    try {
      const stored = localStorage.getItem('security-policies');
      if (stored) {
        const customPolicies = JSON.parse(stored);
        this.securityPolicies = [...this.securityPolicies, ...customPolicies];
      }
    } catch (error) {
      console.warn('[SecurityManager] Failed to load custom policies:', error);
    }
  }

  /**
   * Initialize threat detectors
   */
  private initializeThreatDetectors(): void {
    // Brute force detector
    this.threatDetectors.set('brute_force', (data: any) => {
      const attempts = this.authAttempts.get(data.vendorId);
      if (attempts && attempts.count > 5) {
        return {
          id: crypto.randomUUID(),
          type: 'brute_force',
          severity: 'high',
          detected: new Date(),
          source: data.vendorId,
          description: `Excessive login attempts: ${attempts.count}`,
          mitigated: false,
        };
      }
      return null;
    });

    // Injection detector
    this.threatDetectors.set('injection', (data: any) => {
      if (this.detectInjectionAttempt(data.input)) {
        return {
          id: crypto.randomUUID(),
          type: 'injection',
          severity: 'high',
          detected: new Date(),
          source: data.source || 'unknown',
          description: 'Potential injection attack detected',
          mitigated: false,
        };
      }
      return null;
    });
  }

  /**
   * Initialize biometric authentication
   */
  private async initializeBiometricAuth(): Promise<void> {
    if (!this.config.biometricAuth) return;

    try {
      // Check for WebAuthn support
      if (window.PublicKeyCredential && window.navigator.credentials) {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          this.biometricEnabled = true;
          console.log('[SecurityManager] Biometric authentication available');
        }
      }
    } catch (error) {
      console.warn(
        '[SecurityManager] Biometric authentication not available:',
        error,
      );
    }
  }

  /**
   * Set up network security
   */
  private setupNetworkSecurity(): void {
    // Add trusted domains
    this.trustedDomains.add('wedsync.com');
    this.trustedDomains.add('api.wedsync.com');
    this.trustedDomains.add('localhost');

    // Add known malicious domains (example)
    this.blockedDomains.add('malicious-site.com');
    this.blockedDomains.add('phishing-attempt.net');
  }

  /**
   * Start security monitoring
   */
  private startSecurityMonitoring(): void {
    // Monitor for suspicious activity
    setInterval(() => {
      this.checkForThreats();
    }, 30000); // Every 30 seconds

    // Clean up old logs
    setInterval(() => {
      this.cleanupAuditLogs();
    }, 300000); // Every 5 minutes

    // Session timeout check
    setInterval(() => {
      this.checkSessionTimeouts();
    }, 60000); // Every minute
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppBackground();
      } else {
        this.handleAppForeground();
      }
    });

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.clearSensitiveData();
    });

    // Copy prevention (if screenshots disabled)
    if (!this.config.allowScreenshots) {
      document.addEventListener('copy', (e) => {
        e.preventDefault();
        this.logSecurityEvent(
          'policy_violation',
          {
            action: 'copy_prevented',
          },
          'medium',
        );
      });
    }
  }

  /**
   * Generate session token
   */
  private async generateSessionToken(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(): Promise<string> {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Generate encryption key
   */
  private async generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Hash string using SHA-256
   */
  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Detect injection attempts
   */
  private detectInjectionAttempt(input: string): boolean {
    const injectionPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /'.*?\s+(or|and|union|select|insert|update|delete|drop)\s+.*?'/gi,
    ];

    return injectionPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Detect brute force attempts
   */
  private detectBruteForceAttempt(vendorId: string): boolean {
    const attempts = this.authAttempts.get(vendorId);

    if (!attempts) {
      this.authAttempts.set(vendorId, { count: 1, lastAttempt: new Date() });
      return false;
    }

    const timeDiff = Date.now() - attempts.lastAttempt.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes) {
      // Reset counter after 5 minutes
      this.authAttempts.set(vendorId, { count: 1, lastAttempt: new Date() });
      return false;
    }

    attempts.count++;
    attempts.lastAttempt = new Date();

    return attempts.count > 5;
  }

  /**
   * Validate credentials
   */
  private async validateCredentials(credentials: any): Promise<boolean> {
    // This would integrate with your actual authentication system
    // For now, return true if credentials are provided
    return !!credentials;
  }

  /**
   * Get vendor permissions
   */
  private async getVendorPermissions(vendorId: string): Promise<string[]> {
    // This would fetch actual permissions from your system
    return ['analytics:read', 'vendors:read', 'performance:read'];
  }

  /**
   * Clear sensitive data
   */
  private clearSensitiveData(): void {
    // Clear session tokens from memory (keep in encrypted storage only)
    this.sessionTokens.clear();

    // Clear encryption keys (they'll be regenerated as needed)
    this.encryptionKeys.clear();

    // Clear current session from memory
    this.currentSession = null;
  }

  /**
   * Clear clipboard
   */
  private clearClipboard(): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('').catch(() => {
        // Clipboard access denied, ignore
      });
    }
  }

  /**
   * Clear form data
   */
  private clearFormData(): void {
    // Clear all form inputs
    const inputs = document.querySelectorAll(
      'input[type="password"], input[type="text"]',
    );
    inputs.forEach((input: any) => {
      if (input.autocomplete !== 'off') {
        input.value = '';
      }
    });
  }

  /**
   * Sanitize URL
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove potentially dangerous parameters
      const params = new URLSearchParams(urlObj.search);
      const dangerousParams = ['script', 'eval', 'javascript', 'vbscript'];

      for (const param of dangerousParams) {
        params.delete(param);
      }

      urlObj.search = params.toString();
      return urlObj.toString();
    } catch (error) {
      return url; // Return original if parsing fails
    }
  }

  /**
   * Check for threats
   */
  private checkForThreats(): void {
    // This would run all threat detectors
    // For now, just check auth attempts
    for (const [vendorId, attempts] of this.authAttempts.entries()) {
      const threat = this.threatDetectors.get('brute_force')?.({ vendorId });
      if (threat) {
        this.handleThreat(threat);
      }
    }
  }

  /**
   * Handle detected threat
   */
  private handleThreat(threat: SecurityThreat): void {
    console.warn('[SecurityManager] Threat detected:', threat);

    // Log the threat
    this.logSecurityEvent(
      'threat_detected',
      {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        source: threat.source,
      },
      threat.severity === 'critical' ? 'high' : 'medium',
    );

    // Take appropriate action based on threat type
    switch (threat.type) {
      case 'brute_force':
        // Lock account temporarily
        this.authAttempts.set(threat.source, {
          count: 10, // High count to keep locked
          lastAttempt: new Date(),
        });
        break;

      case 'injection':
        // Block the request/input
        break;

      case 'session_hijack':
        // Invalidate all sessions for the user
        this.invalidateAllSessions();
        break;
    }
  }

  /**
   * Check session timeouts
   */
  private checkSessionTimeouts(): void {
    const now = new Date();

    for (const [sessionId, token] of this.sessionTokens.entries()) {
      if (token.expires < now) {
        this.sessionTokens.delete(sessionId);

        if (this.currentSession?.id === sessionId) {
          this.currentSession = null;
        }

        this.logSecurityEvent(
          'auth_attempt',
          {
            sessionId,
            action: 'session_expired',
          },
          'low',
        );
      }
    }
  }

  /**
   * Clean up old audit logs
   */
  private cleanupAuditLogs(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = new Date(Date.now() - maxAge);

    this.auditLogs = this.auditLogs.filter((log) => log.timestamp > cutoff);
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    event: SecurityAuditLog['event'],
    details: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high',
  ): void {
    const logEntry: SecurityAuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      event,
      userId: this.currentSession?.vendorId,
      deviceId: this.deviceFingerprint?.id || 'unknown',
      details,
      riskLevel,
    };

    this.auditLogs.push(logEntry);

    // Log high-risk events to console
    if (riskLevel === 'high') {
      console.warn('[SecurityManager] High-risk security event:', logEntry);
    }
  }

  /**
   * Invalidate current session
   */
  async invalidateSession(): Promise<void> {
    if (this.currentSession) {
      this.sessionTokens.delete(this.currentSession.id);
      this.currentSession = null;

      this.logSecurityEvent(
        'auth_attempt',
        {
          action: 'session_invalidated',
        },
        'medium',
      );
    }
  }

  /**
   * Invalidate all sessions
   */
  private invalidateAllSessions(): void {
    this.sessionTokens.clear();
    this.currentSession = null;

    this.logSecurityEvent(
      'auth_attempt',
      {
        action: 'all_sessions_invalidated',
      },
      'high',
    );
  }

  /**
   * Get current session
   */
  getCurrentSession(): SecureAnalyticsSession | null {
    return this.currentSession;
  }

  /**
   * Get security audit logs
   */
  getAuditLogs(limit: number = 100): SecurityAuditLog[] {
    return this.auditLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get device fingerprint
   */
  getDeviceFingerprint(): DeviceFingerprint | null {
    return this.deviceFingerprint;
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<MobileSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.logSecurityEvent(
      'policy_violation',
      {
        action: 'config_updated',
        changes: Object.keys(newConfig),
      },
      'medium',
    );
  }

  /**
   * Destroy security manager
   */
  destroy(): void {
    this.clearSensitiveData();
    this.sessionTokens.clear();
    this.encryptionKeys.clear();
    this.auditLogs = [];
    this.authAttempts.clear();
    this.threatDetectors.clear();
    this.currentSession = null;
  }
}
