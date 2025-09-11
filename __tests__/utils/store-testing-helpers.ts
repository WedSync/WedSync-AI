/**
 * WS-187 App Store Preparation - Testing Utility Functions
 * Team E - Round 1 - Shared testing utilities for app store testing framework
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

// Types for testing utilities
export interface StoreCredentials {
  microsoftStore: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
  };
  googlePlay: {
    serviceAccountEmail: string;
    privateKeyId: string;
    privateKey: string;
  };
  appleAppStore: {
    keyId: string;
    issuerId: string;
    privateKey: string;
  };
}

export interface AssetRequirements {
  size: string;
  format: string;
  platform: 'android' | 'ios' | 'windows';
}

export interface ComplianceResult {
  compliant: boolean;
  violations: string[];
  complianceScore: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  success: boolean;
}

/**
 * Store Compliance Testing Utilities
 */
export class StoreComplianceHelpers {
  /**
   * Validates PWA manifest.json structure against Microsoft Store requirements
   */
  static validatePWAManifest(manifestPath: string): ComplianceResult {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const violations: string[] = [];

      // Required fields validation
      if (!manifest.name) violations.push('Missing required field: name');
      if (!manifest.short_name) violations.push('Missing required field: short_name');
      if (manifest.start_url !== '/') violations.push('start_url must be "/"');
      
      // Display mode validation
      const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui'];
      if (!validDisplayModes.includes(manifest.display)) {
        violations.push(`Invalid display mode. Must be one of: ${validDisplayModes.join(', ')}`);
      }

      // Color validation
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      if (!hexColorRegex.test(manifest.theme_color)) {
        violations.push('theme_color must be valid hex color (#RRGGBB)');
      }
      if (!hexColorRegex.test(manifest.background_color)) {
        violations.push('background_color must be valid hex color (#RRGGBB)');
      }

      // Icon requirements
      const requiredSizes = ['44x44', '150x150', '310x310'];
      requiredSizes.forEach(size => {
        const icon = manifest.icons?.find((icon: any) => icon.sizes === size);
        if (!icon) violations.push(`Missing required icon size: ${size}`);
        else if (icon.type !== 'image/png') violations.push(`Icon ${size} must be PNG format`);
      });

      return {
        compliant: violations.length === 0,
        violations,
        complianceScore: violations.length === 0 ? 1.0 : Math.max(0, 1 - (violations.length / 10))
      };
    } catch (error) {
      return {
        compliant: false,
        violations: [`Failed to parse manifest: ${error}`],
        complianceScore: 0
      };
    }
  }

  /**
   * Validates app metadata against Apple App Store character limits
   */
  static validateAppStoreMetadata(metadata: {
    appName: string;
    subtitle?: string;
    description: string;
    keywords: string;
  }): ComplianceResult {
    const violations: string[] = [];

    // Character limit validations
    if (metadata.appName.length > 30) {
      violations.push(`App name exceeds 30 character limit (${metadata.appName.length} characters)`);
    }
    
    if (metadata.subtitle && metadata.subtitle.length > 30) {
      violations.push(`Subtitle exceeds 30 character limit (${metadata.subtitle.length} characters)`);
    }
    
    if (metadata.description.length > 4000) {
      violations.push(`Description exceeds 4000 character limit (${metadata.description.length} characters)`);
    }
    
    if (metadata.keywords.length > 100) {
      violations.push(`Keywords exceed 100 character limit (${metadata.keywords.length} characters)`);
    }

    // Content validation
    const prohibitedTerms = ['gambling', 'adult', 'violence', 'hate'];
    prohibitedTerms.forEach(term => {
      if (metadata.description.toLowerCase().includes(term)) {
        violations.push(`Description contains prohibited term: ${term}`);
      }
    });

    return {
      compliant: violations.length === 0,
      violations,
      complianceScore: violations.length === 0 ? 1.0 : Math.max(0, 1 - (violations.length / 5))
    };
  }

  /**
   * Validates asset dimensions and formats for cross-platform compliance
   */
  static validateAssetRequirements(assets: Array<{
    name: string;
    width: number;
    height: number;
    format: string;
    platform: string;
  }>): ComplianceResult {
    const violations: string[] = [];
    
    const requirements: { [key: string]: AssetRequirements[] } = {
      android: [
        { size: '48x48', format: 'png', platform: 'android' },
        { size: '72x72', format: 'png', platform: 'android' },
        { size: '96x96', format: 'png', platform: 'android' },
        { size: '144x144', format: 'png', platform: 'android' },
        { size: '192x192', format: 'png', platform: 'android' }
      ],
      ios: [
        { size: '57x57', format: 'png', platform: 'ios' },
        { size: '120x120', format: 'png', platform: 'ios' },
        { size: '152x152', format: 'png', platform: 'ios' },
        { size: '180x180', format: 'png', platform: 'ios' }
      ],
      windows: [
        { size: '44x44', format: 'png', platform: 'windows' },
        { size: '150x150', format: 'png', platform: 'windows' },
        { size: '310x310', format: 'png', platform: 'windows' }
      ]
    };

    // Check each platform's requirements
    Object.entries(requirements).forEach(([platform, platformRequirements]) => {
      const platformAssets = assets.filter(asset => asset.platform === platform);
      
      platformRequirements.forEach(req => {
        const [width, height] = req.size.split('x').map(Number);
        const matchingAsset = platformAssets.find(asset => 
          asset.width === width && asset.height === height
        );
        
        if (!matchingAsset) {
          violations.push(`Missing ${platform} asset: ${req.size}`);
        } else if (matchingAsset.format.toLowerCase() !== req.format) {
          violations.push(`Incorrect format for ${platform} ${req.size}: expected ${req.format}, got ${matchingAsset.format}`);
        }
      });
    });

    return {
      compliant: violations.length === 0,
      violations,
      complianceScore: violations.length === 0 ? 1.0 : Math.max(0, 1 - (violations.length / 15))
    };
  }

  /**
   * Validates screenshot dimensions for app store requirements
   */
  static validateScreenshotDimensions(screenshots: Array<{
    width: number;
    height: number;
    device: string;
  }>): ComplianceResult {
    const violations: string[] = [];
    
    const validDimensions = {
      'iPhone 12 Pro Max': { width: 1242, height: 2688 },
      'iPhone 12 Pro': { width: 1170, height: 2532 },
      'iPhone 11': { width: 828, height: 1792 },
      'iPad Pro 12.9"': { width: 2048, height: 2732 },
      'iPad Pro 11"': { width: 1668, height: 2388 }
    };

    screenshots.forEach((screenshot, index) => {
      const validDimension = validDimensions[screenshot.device as keyof typeof validDimensions];
      
      if (!validDimension) {
        violations.push(`Unknown device type: ${screenshot.device}`);
        return;
      }

      if (screenshot.width !== validDimension.width || screenshot.height !== validDimension.height) {
        violations.push(
          `Screenshot ${index + 1} for ${screenshot.device}: ` +
          `expected ${validDimension.width}x${validDimension.height}, ` +
          `got ${screenshot.width}x${screenshot.height}`
        );
      }
    });

    return {
      compliant: violations.length === 0,
      violations,
      complianceScore: violations.length === 0 ? 1.0 : Math.max(0, 1 - (violations.length / screenshots.length))
    };
  }
}

/**
 * Security Testing Utilities
 */
export class SecurityTestHelpers {
  /**
   * Encrypts credentials using AES-256-GCM
   */
  static encryptCredential(credential: string, key?: Buffer): {
    encrypted: string;
    iv: string;
    tag: string;
    key: string;
  } {
    const encryptionKey = key || randomBytes(32);
    const iv = randomBytes(16);
    const cipher = require('crypto').createCipher('aes-256-gcm', encryptionKey);
    cipher.setAAD(Buffer.from('app-store-credentials'));
    
    let encrypted = cipher.update(credential, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      key: encryptionKey.toString('hex')
    };
  }

  /**
   * Decrypts credentials using AES-256-GCM
   */
  static decryptCredential(
    encrypted: string,
    key: string,
    iv: string,
    tag: string
  ): string {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');
    
    const decipher = require('crypto').createDecipher('aes-256-gcm', keyBuffer);
    decipher.setAAD(Buffer.from('app-store-credentials'));
    decipher.setAuthTag(tagBuffer);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generates HMAC-SHA256 signature for webhook validation
   */
  static generateWebhookSignature(payload: any, secret: string): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Verifies webhook signature with timing-safe comparison
   */
  static verifyWebhookSignature(
    payload: any,
    signature: string,
    secret: string,
    timestampHeader?: string,
    tolerance: number = 300 // 5 minutes
  ): { valid: boolean; reason?: string } {
    try {
      // Check timestamp if provided (replay attack prevention)
      if (timestampHeader) {
        const timestamp = parseInt(timestampHeader, 10);
        const now = Math.floor(Date.now() / 1000);
        
        if (Math.abs(now - timestamp) > tolerance) {
          return { valid: false, reason: 'Timestamp outside tolerance window' };
        }
      }

      const expectedSignature = this.generateWebhookSignature(payload, secret);
      
      // Timing-safe comparison
      if (signature.length !== expectedSignature.length) {
        return { valid: false, reason: 'Signature length mismatch' };
      }

      let result = 0;
      for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
      }

      return {
        valid: result === 0,
        reason: result !== 0 ? 'Signature mismatch' : undefined
      };
    } catch (error) {
      return { valid: false, reason: `Verification error: ${error}` };
    }
  }

  /**
   * Sanitizes metadata to prevent information leakage
   */
  static sanitizeMetadata(rawMetadata: any): any {
    const sensitiveKeys = [
      'password', 'secret', 'key', 'token', 'internal', 'debug',
      'email', 'phone', 'ssn', 'taxId', 'bankAccount', 'creditCard',
      'serverUrl', 'dbConnection', 'apiKey'
    ];

    const sanitized: any = {};

    const sanitizeValue = (key: string, value: any): any => {
      if (value === null || value === undefined) return value;

      // Check if key contains sensitive information
      const isSensitiveKey = sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (isSensitiveKey) {
        return undefined; // Remove sensitive data
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        const nestedSanitized: any = {};
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          const sanitizedNested = sanitizeValue(nestedKey, nestedValue);
          if (sanitizedNested !== undefined) {
            nestedSanitized[nestedKey] = sanitizedNested;
          }
        });
        return Object.keys(nestedSanitized).length > 0 ? nestedSanitized : undefined;
      }

      if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(`${key}_${index}`, item))
                   .filter(item => item !== undefined);
      }

      // Additional content sanitization for strings
      if (typeof value === 'string') {
        // Remove potential sensitive patterns
        return value.replace(/(?:password|secret|key|token)[:=]\s*[\w-]+/gi, '[REDACTED]')
                   .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
                   .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN_REDACTED]');
      }

      return value;
    };

    Object.entries(rawMetadata).forEach(([key, value]) => {
      const sanitizedValue = sanitizeValue(key, value);
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    });

    return sanitized;
  }

  /**
   * Generates audit log hash for tamper-proof logging
   */
  static generateAuditHash(
    event: any,
    previousHash: string = '',
    includeTimestamp: boolean = true
  ): string {
    const timestamp = includeTimestamp ? Date.now().toString() : '';
    const eventString = JSON.stringify(event) + previousHash + timestamp;
    return createHash('sha256').update(eventString).digest('hex');
  }

  /**
   * Validates audit log chain integrity
   */
  static validateAuditChain(events: Array<{
    event: any;
    hash: string;
    previousHash?: string;
  }>): { valid: boolean; brokenAt?: number; reason?: string } {
    if (events.length === 0) return { valid: true };

    let previousHash = '';

    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i];
      const expectedHash = this.generateAuditHash(currentEvent.event, previousHash);

      if (currentEvent.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Hash mismatch at event ${i}: expected ${expectedHash}, got ${currentEvent.hash}`
        };
      }

      previousHash = currentEvent.hash;
    }

    return { valid: true };
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestHelpers {
  /**
   * Measures function execution time and memory usage
   */
  static async measurePerformance<T>(
    fn: () => Promise<T> | T,
    options: {
      name?: string;
      iterations?: number;
      warmupIterations?: number;
    } = {}
  ): Promise<{
    result: T;
    avgExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    memoryUsage: {
      heapUsedBefore: number;
      heapUsedAfter: number;
      heapUsedDelta: number;
    };
    iterations: number;
  }> {
    const { iterations = 1, warmupIterations = 0, name = 'unnamed' } = options;

    // Warmup iterations
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    const executionTimes: number[] = [];
    const memoryBefore = process.memoryUsage();
    let result: T;

    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      result = await fn();
      const endTime = process.hrtime.bigint();
      
      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      executionTimes.push(executionTime);
    }

    const memoryAfter = process.memoryUsage();

    return {
      result: result!,
      avgExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      memoryUsage: {
        heapUsedBefore: memoryBefore.heapUsed,
        heapUsedAfter: memoryAfter.heapUsed,
        heapUsedDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      },
      iterations
    };
  }

  /**
   * Simulates concurrent load on a function
   */
  static async simulateConcurrentLoad<T>(
    fn: () => Promise<T> | T,
    options: {
      concurrency: number;
      duration?: number; // in milliseconds
      totalRequests?: number;
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errors: Array<{ error: any; timestamp: number }>;
  }> {
    const { concurrency, duration, totalRequests } = options;
    const results: Array<{ success: boolean; responseTime: number; error?: any }> = [];
    const errors: Array<{ error: any; timestamp: number }> = [];
    const startTime = Date.now();

    const executeRequest = async (): Promise<void> => {
      const requestStart = Date.now();
      try {
        await fn();
        const responseTime = Date.now() - requestStart;
        results.push({ success: true, responseTime });
      } catch (error) {
        const responseTime = Date.now() - requestStart;
        results.push({ success: false, responseTime, error });
        errors.push({ error, timestamp: Date.now() });
      }
    };

    if (totalRequests) {
      // Fixed number of requests
      const promises: Promise<void>[] = [];
      for (let i = 0; i < totalRequests; i += concurrency) {
        const batch = Math.min(concurrency, totalRequests - i);
        const batchPromises = Array(batch).fill(0).map(() => executeRequest());
        promises.push(...batchPromises);
        await Promise.all(batchPromises);
      }
    } else if (duration) {
      // Time-based load testing
      const workers: Promise<void>[] = [];
      
      for (let i = 0; i < concurrency; i++) {
        workers.push(
          (async () => {
            while (Date.now() - startTime < duration) {
              await executeRequest();
            }
          })()
        );
      }
      
      await Promise.all(workers);
    }

    const totalTime = Date.now() - startTime;
    const responseTimes = results.map(r => r.responseTime);
    const successfulResults = results.filter(r => r.success);

    return {
      totalRequests: results.length,
      successfulRequests: successfulResults.length,
      failedRequests: results.length - successfulResults.length,
      avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: (results.length / totalTime) * 1000,
      errors
    };
  }

  /**
   * Monitors memory usage during execution
   */
  static async monitorMemoryUsage<T>(
    fn: () => Promise<T> | T,
    options: {
      sampleInterval?: number; // milliseconds
      memoryThreshold?: number; // bytes
    } = {}
  ): Promise<{
    result: T;
    memorySnapshots: Array<{
      timestamp: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    }>;
    peakMemoryUsage: number;
    memoryLeakDetected: boolean;
    thresholdExceeded: boolean;
  }> {
    const { sampleInterval = 100, memoryThreshold = 500 * 1024 * 1024 } = options; // 500MB default
    const memorySnapshots: Array<{
      timestamp: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    }> = [];

    let monitoring = true;
    let peakMemoryUsage = 0;

    // Start memory monitoring
    const monitoringPromise = (async () => {
      while (monitoring) {
        const usage = process.memoryUsage();
        const snapshot = {
          timestamp: Date.now(),
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external
        };
        
        memorySnapshots.push(snapshot);
        peakMemoryUsage = Math.max(peakMemoryUsage, usage.heapUsed);
        
        await new Promise(resolve => setTimeout(resolve, sampleInterval));
      }
    })();

    const baselineMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      monitoring = false;
      await monitoringPromise;

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryLeakDetected = (finalMemory - baselineMemory) > (50 * 1024 * 1024); // 50MB leak threshold
      const thresholdExceeded = peakMemoryUsage > memoryThreshold;

      return {
        result,
        memorySnapshots,
        peakMemoryUsage,
        memoryLeakDetected,
        thresholdExceeded
      };
    } catch (error) {
      monitoring = false;
      throw error;
    }
  }
}

/**
 * Visual Testing Utilities
 */
export class VisualTestHelpers {
  /**
   * Generates test data for visual regression testing
   */
  static generateMockWeddingData(options: {
    businessName?: string;
    portfolioSize?: 'small' | 'medium' | 'large';
    includeVideos?: boolean;
  } = {}): any {
    const {
      businessName = 'Elegant Moments Photography',
      portfolioSize = 'medium',
      includeVideos = false
    } = options;

    const portfolioSizes = {
      small: { images: 10, videos: 1 },
      medium: { images: 50, videos: 3 },
      large: { images: 200, videos: 8 }
    };

    const size = portfolioSizes[portfolioSize];

    return {
      businessInfo: {
        name: businessName,
        tagline: 'Capturing Your Perfect Day',
        category: 'Photography & Video',
        website: 'https://elegantmoments.com',
        email: 'contact@elegantmoments.com'
      },
      portfolio: {
        images: Array.from({ length: size.images }, (_, i) => ({
          id: `img-${i + 1}`,
          name: `wedding-photo-${i + 1}.jpg`,
          size: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
          dimensions: { width: 1920, height: 1080 },
          category: ['ceremony', 'reception', 'portrait', 'detail'][Math.floor(Math.random() * 4)]
        })),
        videos: includeVideos ? Array.from({ length: size.videos }, (_, i) => ({
          id: `vid-${i + 1}`,
          name: `wedding-video-${i + 1}.mp4`,
          size: Math.floor(Math.random() * 100000000) + 50000000, // 50-150MB
          duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
          dimensions: { width: 1920, height: 1080 }
        })) : []
      },
      appStoreAssets: {
        icons: [
          { size: '44x44', platform: 'windows' },
          { size: '120x120', platform: 'ios' },
          { size: '192x192', platform: 'android' }
        ],
        screenshots: [
          { width: 1242, height: 2688, device: 'iPhone 12 Pro Max' },
          { width: 2048, height: 2732, device: 'iPad Pro 12.9"' }
        ]
      }
    };
  }

  /**
   * Device viewport configurations for responsive testing
   */
  static getDeviceViewports(): Array<{
    name: string;
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  }> {
    return [
      {
        name: 'iPhone SE',
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      },
      {
        name: 'iPhone 12 Pro',
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      },
      {
        name: 'iPhone 14 Pro Max',
        width: 428,
        height: 926,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      },
      {
        name: 'iPad',
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      },
      {
        name: 'iPad Pro',
        width: 1024,
        height: 1366,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      },
      {
        name: 'Pixel 7',
        width: 412,
        height: 915,
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true
      },
      {
        name: 'Desktop 1920x1080',
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false
      }
    ];
  }

  /**
   * Screenshot comparison utilities
   */
  static async waitForStableScreenshot(
    page: any,
    options: {
      stabilityTime?: number;
      maxWaitTime?: number;
      threshold?: number;
    } = {}
  ): Promise<void> {
    const { stabilityTime = 1000, maxWaitTime = 10000, threshold = 0.01 } = options;
    const startTime = Date.now();
    let lastScreenshot = await page.screenshot();
    let stableTime = 0;

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentScreenshot = await page.screenshot();
      
      // Simple comparison - in real implementation, you'd use image comparison libraries
      const same = lastScreenshot.length === currentScreenshot.length;
      
      if (same) {
        stableTime += 100;
        if (stableTime >= stabilityTime) {
          return; // Screenshot is stable
        }
      } else {
        stableTime = 0;
        lastScreenshot = currentScreenshot;
      }
    }
    
    throw new Error(`Screenshot did not stabilize within ${maxWaitTime}ms`);
  }
}

/**
 * Mock Data Generators
 */
export class MockDataHelpers {
  /**
   * Generates mock store API responses
   */
  static generateMockStoreResponse(
    store: 'microsoft' | 'google' | 'apple',
    operation: 'submit' | 'status' | 'approve' | 'reject',
    success: boolean = true
  ): any {
    const baseResponse = {
      timestamp: Date.now(),
      requestId: `req-${randomBytes(8).toString('hex')}`,
      success
    };

    switch (store) {
      case 'microsoft':
        return {
          ...baseResponse,
          store: 'microsoft-store',
          submissionId: success ? `ms-sub-${randomBytes(6).toString('hex')}` : null,
          status: success ? (operation === 'approve' ? 'approved' : 'submitted') : 'rejected',
          reviewNotes: success ? null : 'Manifest validation failed',
          estimatedReviewTime: '1-3 business days'
        };

      case 'google':
        return {
          ...baseResponse,
          store: 'google-play',
          packageName: 'com.wedsync.app',
          versionCode: 1,
          status: success ? (operation === 'approve' ? 'published' : 'under_review') : 'rejected',
          rolloutPercentage: operation === 'approve' ? 100 : null,
          reviewNotes: success ? null : 'Privacy policy URL not accessible'
        };

      case 'apple':
        return {
          ...baseResponse,
          store: 'apple-appstore',
          bundleId: 'com.wedsync.wedding',
          buildVersion: '1.0.0',
          status: success ? (operation === 'approve' ? 'ready_for_sale' : 'waiting_for_review') : 'rejected',
          reviewNotes: success ? null : 'Screenshot dimensions do not meet requirements',
          releaseType: 'manual'
        };

      default:
        throw new Error(`Unsupported store: ${store}`);
    }
  }

  /**
   * Generates mock webhook payloads
   */
  static generateMockWebhook(
    store: 'microsoft' | 'google' | 'apple',
    event: string,
    secret: string
  ): { payload: any; signature: string; headers: Record<string, string> } {
    const payload = {
      store,
      event,
      timestamp: Date.now(),
      data: this.generateMockStoreResponse(store, 'approve')
    };

    const signature = SecurityTestHelpers.generateWebhookSignature(payload, secret);
    
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': `${store}-webhook/1.0`,
      'x-timestamp': Math.floor(Date.now() / 1000).toString()
    };

    // Store-specific signature headers
    switch (store) {
      case 'microsoft':
        headers['x-ms-signature'] = `sha256=${signature}`;
        break;
      case 'google':
        headers['x-goog-signature'] = signature;
        break;
      case 'apple':
        headers['x-apple-signature'] = signature;
        break;
    }

    return { payload, signature, headers };
  }
}

/**
 * Test Environment Utilities
 */
export class TestEnvironmentHelpers {
  /**
   * Sets up test environment variables
   */
  static setupTestEnvironment(): void {
    process.env.NODE_ENV = 'test';
    process.env.TEST_STORE_API_KEY = 'test-key-' + randomBytes(8).toString('hex');
    process.env.TEST_WEBHOOK_SECRET = 'test-secret-' + randomBytes(16).toString('hex');
    process.env.TEST_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  }

  /**
   * Cleans up test environment
   */
  static cleanupTestEnvironment(): void {
    delete process.env.TEST_STORE_API_KEY;
    delete process.env.TEST_WEBHOOK_SECRET;
    delete process.env.TEST_ENCRYPTION_KEY;
  }

  /**
   * Creates temporary test files
   */
  static createTestFixtures(baseDir: string): {
    manifestPath: string;
    iconPath: string;
    screenshotPath: string;
    cleanup: () => void;
  } {
    const fs = require('fs');
    const path = require('path');

    const fixtureDir = path.join(baseDir, 'fixtures');
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }

    const manifestPath = path.join(fixtureDir, 'test-manifest.json');
    const iconPath = path.join(fixtureDir, 'test-icon.png');
    const screenshotPath = path.join(fixtureDir, 'test-screenshot.png');

    // Create test manifest
    const testManifest = {
      name: 'WedSync Test App',
      short_name: 'WedSync',
      start_url: '/',
      display: 'standalone',
      theme_color: '#000000',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }
      ]
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(testManifest, null, 2));
    fs.writeFileSync(iconPath, 'fake-png-data'); // Mock PNG data
    fs.writeFileSync(screenshotPath, 'fake-screenshot-data'); // Mock screenshot data

    const cleanup = () => {
      if (fs.existsSync(fixtureDir)) {
        fs.rmSync(fixtureDir, { recursive: true, force: true });
      }
    };

    return { manifestPath, iconPath, screenshotPath, cleanup };
  }
}