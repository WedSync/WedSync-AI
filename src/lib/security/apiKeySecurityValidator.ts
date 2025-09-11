// apiKeySecurityValidator.ts
// WS-072: API Key Security Validation
// Comprehensive security testing and validation for API key system

import * as crypto from 'crypto';

export interface SecurityValidationResult {
  passed: boolean;
  issues: SecurityIssue[];
  score: number; // 0-100
  recommendations: string[];
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact: string;
  remediation: string;
}

export class APIKeySecurityValidator {
  /**
   * Validate API key strength and security
   */
  validateAPIKey(key: string): SecurityValidationResult {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    // Check key format
    if (!key.startsWith('ws_')) {
      issues.push({
        severity: 'medium',
        category: 'Format',
        description: 'API key does not follow expected format',
        impact: 'Makes key easily identifiable and potentially guessable',
        remediation: 'Ensure all API keys start with "ws_" prefix',
      });
    }

    // Check key length
    if (key.length < 40) {
      issues.push({
        severity: 'high',
        category: 'Entropy',
        description: 'API key is too short',
        impact: 'Increases risk of brute force attacks',
        remediation:
          'Use keys with at least 32 bytes of entropy (40+ characters)',
      });
    }

    // Check entropy
    const entropy = this.calculateEntropy(key);
    if (entropy < 5.0) {
      issues.push({
        severity: 'critical',
        category: 'Entropy',
        description: 'API key has low entropy',
        impact: 'Key may be predictable or guessable',
        remediation:
          'Generate keys using cryptographically secure random functions',
      });
    }

    // Check for common patterns
    if (this.hasCommonPatterns(key)) {
      issues.push({
        severity: 'medium',
        category: 'Pattern',
        description: 'API key contains common patterns',
        impact: 'May indicate predictable generation',
        remediation: 'Use true random generation without patterns',
      });
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('API key meets security standards');
    } else {
      recommendations.push('Regenerate API key with secure random generator');
      recommendations.push('Implement key rotation policy');
      recommendations.push('Monitor key usage for anomalies');
    }

    const score = this.calculateSecurityScore(issues);

    return {
      passed:
        issues.filter((i) => i.severity === 'critical' || i.severity === 'high')
          .length === 0,
      issues,
      score,
      recommendations,
    };
  }

  /**
   * Validate API key configuration
   */
  validateKeyConfiguration(config: {
    scopes: string[];
    rateLimitPerMinute: number;
    rateLimitPerHour: number;
    rateLimitPerDay: number;
    allowedIps?: string[];
    allowedOrigins?: string[];
    expiresAt?: Date;
  }): SecurityValidationResult {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    // Check scope configuration
    if (config.scopes.includes('admin:all')) {
      issues.push({
        severity: 'high',
        category: 'Permissions',
        description: 'API key has admin privileges',
        impact: 'Potential for privilege escalation and data access',
        remediation:
          'Use principle of least privilege - grant only necessary scopes',
      });
    }

    if (config.scopes.length > 10) {
      issues.push({
        severity: 'medium',
        category: 'Permissions',
        description: 'API key has too many scopes',
        impact: 'Increases attack surface if key is compromised',
        remediation: 'Limit scopes to only what is needed for the integration',
      });
    }

    // Check rate limits
    if (config.rateLimitPerMinute > 1000) {
      issues.push({
        severity: 'medium',
        category: 'Rate Limiting',
        description: 'Rate limit per minute is very high',
        impact: 'Potential for abuse and resource exhaustion',
        remediation: 'Set appropriate rate limits based on expected usage',
      });
    }

    if (config.rateLimitPerDay > 100000) {
      issues.push({
        severity: 'low',
        category: 'Rate Limiting',
        description: 'Daily rate limit is very high',
        impact: 'May indicate overly permissive configuration',
        remediation: 'Review and adjust daily limits based on business needs',
      });
    }

    // Check IP restrictions
    if (!config.allowedIps || config.allowedIps.length === 0) {
      recommendations.push(
        'Consider implementing IP whitelisting for additional security',
      );
    } else {
      // Validate IP formats
      for (const ip of config.allowedIps) {
        if (!this.isValidIP(ip)) {
          issues.push({
            severity: 'medium',
            category: 'Configuration',
            description: `Invalid IP address: ${ip}`,
            impact: 'May not provide intended access control',
            remediation: 'Ensure all IP addresses are in valid format',
          });
        }
      }
    }

    // Check expiration
    if (!config.expiresAt) {
      recommendations.push(
        'Set an expiration date for API keys to limit exposure window',
      );
    } else {
      const daysUntilExpiry = Math.ceil(
        (config.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilExpiry > 365) {
        issues.push({
          severity: 'low',
          category: 'Lifecycle',
          description: 'API key has very long expiration',
          impact: 'Extended exposure window if key is compromised',
          remediation:
            'Consider shorter expiration periods with regular rotation',
        });
      }
    }

    const score = this.calculateSecurityScore(issues);

    return {
      passed:
        issues.filter((i) => i.severity === 'critical' || i.severity === 'high')
          .length === 0,
      issues,
      score,
      recommendations,
    };
  }

  /**
   * Validate API usage patterns for anomalies
   */
  validateUsagePatterns(usage: {
    requestsPerHour: number[];
    errorRate: number;
    uniqueIPs: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    timePattern: Array<{ hour: number; requests: number }>;
  }): SecurityValidationResult {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    // Check for unusual spikes
    const avgRequests =
      usage.requestsPerHour.reduce((a, b) => a + b, 0) /
      usage.requestsPerHour.length;
    const maxRequests = Math.max(...usage.requestsPerHour);

    if (maxRequests > avgRequests * 10) {
      issues.push({
        severity: 'medium',
        category: 'Usage Pattern',
        description: 'Unusual spike in API usage detected',
        impact: 'May indicate automated abuse or security breach',
        remediation:
          'Investigate unusual traffic patterns and consider implementing alerts',
      });
    }

    // Check error rate
    if (usage.errorRate > 20) {
      issues.push({
        severity: 'medium',
        category: 'Error Pattern',
        description: 'High error rate detected',
        impact: 'May indicate probing attempts or misconfigured client',
        remediation: 'Review error logs and client configuration',
      });
    }

    // Check IP diversity
    if (usage.uniqueIPs > 50) {
      issues.push({
        severity: 'low',
        category: 'Access Pattern',
        description: 'API key used from many different IP addresses',
        impact: 'May indicate shared or compromised credentials',
        remediation:
          'Consider implementing IP restrictions or monitoring alerts',
      });
    }

    // Check endpoint concentration
    const totalRequests = usage.topEndpoints.reduce(
      (sum, ep) => sum + ep.count,
      0,
    );
    const topEndpointPercentage =
      (usage.topEndpoints[0]?.count / totalRequests) * 100;

    if (topEndpointPercentage > 90) {
      recommendations.push(
        'API usage is highly concentrated on one endpoint - consider specialized scopes',
      );
    }

    // Check time patterns (24/7 usage might be suspicious)
    const activeHours = usage.timePattern.filter(
      (tp) => tp.requests > 0,
    ).length;
    if (activeHours === 24) {
      issues.push({
        severity: 'low',
        category: 'Usage Pattern',
        description: 'API key used 24/7 without breaks',
        impact: 'May indicate automated or bot activity',
        remediation:
          'Verify that continuous usage is expected for this integration',
      });
    }

    const score = this.calculateSecurityScore(issues);

    return {
      passed:
        issues.filter((i) => i.severity === 'critical' || i.severity === 'high')
          .length === 0,
      issues,
      score,
      recommendations,
    };
  }

  /**
   * Comprehensive security audit
   */
  async performSecurityAudit(apiKeyId: string): Promise<{
    overall: SecurityValidationResult;
    keyStrength: SecurityValidationResult;
    configuration: SecurityValidationResult;
    usagePatterns: SecurityValidationResult;
  }> {
    // This would integrate with the actual API key service
    // For now, returning mock results for demonstration

    const keyStrength = this.validateAPIKey(
      'ws_mock_key_for_testing_' + crypto.randomBytes(16).toString('base64url'),
    );

    const configuration = this.validateKeyConfiguration({
      scopes: ['read:clients', 'write:forms'],
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
      allowedIps: ['192.168.1.1'],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    const usagePatterns = this.validateUsagePatterns({
      requestsPerHour: [10, 12, 8, 15, 20, 18, 14, 16, 22, 19, 17, 13],
      errorRate: 5.2,
      uniqueIPs: 3,
      topEndpoints: [
        { endpoint: '/v1/clients', count: 150 },
        { endpoint: '/v1/forms/123/responses', count: 45 },
      ],
      timePattern: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        requests:
          i >= 8 && i <= 18
            ? Math.floor(Math.random() * 20) + 5
            : Math.floor(Math.random() * 5),
      })),
    });

    // Calculate overall score
    const allIssues = [
      ...keyStrength.issues,
      ...configuration.issues,
      ...usagePatterns.issues,
    ];

    const overall: SecurityValidationResult = {
      passed:
        allIssues.filter(
          (i) => i.severity === 'critical' || i.severity === 'high',
        ).length === 0,
      issues: allIssues,
      score: Math.min(
        keyStrength.score,
        configuration.score,
        usagePatterns.score,
      ),
      recommendations: [
        ...keyStrength.recommendations,
        ...configuration.recommendations,
        ...usagePatterns.recommendations,
        'Implement regular security audits',
        'Monitor for suspicious activity patterns',
        'Rotate API keys regularly',
      ],
    };

    return {
      overall,
      keyStrength,
      configuration,
      usagePatterns,
    };
  }

  private calculateEntropy(str: string): number {
    const charCounts = new Map<string, number>();

    for (const char of str) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    let entropy = 0;
    const length = str.length;

    // Use forEach for downlevelIteration compatibility
    charCounts.forEach((count) => {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    });

    return entropy;
  }

  private hasCommonPatterns(key: string): boolean {
    const patterns = [
      /(.)\1{3,}/, // Repeated characters
      /123456/, // Sequential numbers
      /abcdef/, // Sequential letters
      /(.{1,3})\1{2,}/, // Repeated short sequences
    ];

    return patterns.some((pattern) => pattern.test(key));
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }
}

export const apiKeySecurityValidator = new APIKeySecurityValidator();
