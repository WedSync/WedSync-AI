/**
 * WS-222: Custom Domains System - SSL Certificate Load Tester
 * Team D - Performance Optimization & Mobile Optimization
 *
 * Advanced SSL certificate load testing and performance validation
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

interface SSLTestConfig {
  domain: string;
  maxConcurrentConnections: number;
  testDurationMs: number;
  connectionTimeoutMs: number;
  rampUpTimeMs: number;
  targetTPS: number; // Transactions per second
  mobileProfile?: MobileTestProfile;
}

interface MobileTestProfile {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: '2g' | '3g' | '4g' | '5g' | 'wifi';
  batteryOptimized: boolean;
  lowMemoryMode: boolean;
}

interface SSLTestResult {
  domain: string;
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  averageHandshakeTime: number;
  medianHandshakeTime: number;
  p95HandshakeTime: number;
  p99HandshakeTime: number;
  maxHandshakeTime: number;
  minHandshakeTime: number;
  throughput: number; // TPS achieved
  errorRate: number;
  certificateDetails: SSLCertificateInfo;
  performanceGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  mobileOptimization: number; // Score 0-100
  recommendations: string[];
  testStarted: Date;
  testCompleted: Date;
  rawMetrics: ConnectionMetric[];
}

interface ConnectionMetric {
  connectionId: string;
  startTime: Date;
  endTime: Date;
  handshakeTime: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  certificateChainLength: number;
  tlsVersion: string;
  cipherSuite: string;
  keyExchangeGroup?: string;
}

interface SSLCertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  signatureAlgorithm: string;
  keySize: number;
  keyType: 'RSA' | 'ECDSA' | 'EdDSA';
  chainLength: number;
  isWildcard: boolean;
  san: string[]; // Subject Alternative Names
  ocspStapling: boolean;
  hsts: boolean;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

class SSLLoadTester extends EventEmitter {
  private activeTests: Map<string, AbortController>;
  private testResults: Map<string, SSLTestResult>;

  constructor() {
    super();
    this.activeTests = new Map();
    this.testResults = new Map();
  }

  /**
   * Run comprehensive SSL load test
   */
  async runSSLLoadTest(config: SSLTestConfig): Promise<SSLTestResult> {
    const testId = `${config.domain}-${Date.now()}`;
    const abortController = new AbortController();
    this.activeTests.set(testId, abortController);

    try {
      const testResult: SSLTestResult = {
        domain: config.domain,
        totalConnections: 0,
        successfulConnections: 0,
        failedConnections: 0,
        averageHandshakeTime: 0,
        medianHandshakeTime: 0,
        p95HandshakeTime: 0,
        p99HandshakeTime: 0,
        maxHandshakeTime: 0,
        minHandshakeTime: Infinity,
        throughput: 0,
        errorRate: 0,
        certificateDetails: {} as SSLCertificateInfo,
        performanceGrade: 'F',
        mobileOptimization: 0,
        recommendations: [],
        testStarted: new Date(),
        testCompleted: new Date(),
        rawMetrics: [],
      };

      // Phase 1: Certificate Analysis
      this.emit('test-phase', {
        testId,
        phase: 'certificate-analysis',
        progress: 0,
      });
      testResult.certificateDetails = await this.analyzeCertificate(
        config.domain,
      );

      // Phase 2: Ramp-up Testing
      this.emit('test-phase', { testId, phase: 'ramp-up', progress: 25 });
      const rampUpResults = await this.performRampUpTest(
        config,
        abortController.signal,
      );
      testResult.rawMetrics.push(...rampUpResults);

      // Phase 3: Sustained Load Testing
      this.emit('test-phase', {
        testId,
        phase: 'sustained-load',
        progress: 50,
      });
      const loadResults = await this.performSustainedLoadTest(
        config,
        abortController.signal,
      );
      testResult.rawMetrics.push(...loadResults);

      // Phase 4: Spike Testing
      this.emit('test-phase', { testId, phase: 'spike-test', progress: 75 });
      const spikeResults = await this.performSpikeTest(
        config,
        abortController.signal,
      );
      testResult.rawMetrics.push(...spikeResults);

      // Phase 5: Analysis and Grading
      this.emit('test-phase', { testId, phase: 'analysis', progress: 90 });
      this.calculateTestMetrics(testResult);
      this.gradePerformance(testResult);
      this.generateMobileRecommendations(testResult, config.mobileProfile);

      testResult.testCompleted = new Date();
      this.testResults.set(testId, testResult);

      this.emit('test-complete', { testId, result: testResult });
      return testResult;
    } catch (error) {
      this.emit('test-error', {
        testId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * Run mobile-optimized SSL test
   */
  async runMobileSSLTest(
    domain: string,
    profile: MobileTestProfile,
  ): Promise<SSLTestResult> {
    const config: SSLTestConfig = {
      domain,
      maxConcurrentConnections: this.getMobileMaxConnections(profile),
      testDurationMs: profile.batteryOptimized ? 30000 : 60000, // Shorter test for battery optimization
      connectionTimeoutMs: this.getMobileTimeout(profile),
      rampUpTimeMs: 10000,
      targetTPS: this.getMobileTargetTPS(profile),
      mobileProfile: profile,
    };

    return this.runSSLLoadTest(config);
  }

  /**
   * Batch test multiple domains
   */
  async runBatchSSLTest(
    domains: string[],
    baseConfig: Omit<SSLTestConfig, 'domain'>,
  ): Promise<Map<string, SSLTestResult>> {
    const results = new Map<string, SSLTestResult>();

    // Process domains in batches to avoid overwhelming the system
    const batchSize = baseConfig.mobileProfile ? 2 : 5;

    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const batchPromises = batch.map((domain) => {
        const config: SSLTestConfig = { ...baseConfig, domain };
        return this.runSSLLoadTest(config).then((result) => ({
          domain,
          result,
        }));
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((settled) => {
          if (settled.status === 'fulfilled') {
            results.set(settled.value.domain, settled.value.result);
          }
        });
      } catch (error) {
        console.error('Batch SSL test error:', error);
      }

      // Delay between batches for mobile optimization
      if (i + batchSize < domains.length && baseConfig.mobileProfile) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Get test result by test ID
   */
  getTestResult(testId: string): SSLTestResult | null {
    return this.testResults.get(testId) || null;
  }

  /**
   * Cancel active test
   */
  cancelTest(testId: string): boolean {
    const controller = this.activeTests.get(testId);
    if (controller) {
      controller.abort();
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * Get summary of all test results
   */
  getTestSummary(): {
    totalTests: number;
    averageGrade: string;
    mobileOptimizationScore: number;
    commonIssues: string[];
  } {
    const results = Array.from(this.testResults.values());

    if (results.length === 0) {
      return {
        totalTests: 0,
        averageGrade: 'N/A',
        mobileOptimizationScore: 0,
        commonIssues: [],
      };
    }

    const gradeValues: Record<string, number> = {
      'A+': 100,
      A: 90,
      B: 80,
      C: 70,
      D: 60,
      F: 0,
    };

    const avgGradeValue =
      results.reduce(
        (sum, result) => sum + gradeValues[result.performanceGrade],
        0,
      ) / results.length;

    const avgGrade =
      Object.keys(gradeValues).find(
        (grade) => gradeValues[grade] <= avgGradeValue,
      ) || 'F';

    const avgMobileScore =
      results.reduce((sum, result) => sum + result.mobileOptimization, 0) /
      results.length;

    // Collect common issues
    const allRecommendations = results.flatMap(
      (result) => result.recommendations,
    );
    const issueCount = new Map<string, number>();

    allRecommendations.forEach((rec) => {
      issueCount.set(rec, (issueCount.get(rec) || 0) + 1);
    });

    const commonIssues = Array.from(issueCount.entries())
      .filter(([_, count]) => count >= Math.ceil(results.length / 3))
      .map(([issue, _]) => issue)
      .slice(0, 5);

    return {
      totalTests: results.length,
      averageGrade: avgGrade,
      mobileOptimizationScore: Math.round(avgMobileScore),
      commonIssues,
    };
  }

  // Private methods

  private async analyzeCertificate(
    domain: string,
  ): Promise<SSLCertificateInfo> {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const options = {
        hostname: domain,
        port: 443,
        method: 'HEAD',
        timeout: 10000,
        rejectUnauthorized: false, // We want to analyze even invalid certs
      };

      const req = https.request(options, (res: any) => {
        const cert = res.connection.getPeerCertificate(true);
        const socket = res.connection;

        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error('No certificate found'));
          return;
        }

        try {
          const certInfo: SSLCertificateInfo = {
            subject: cert.subject.CN || cert.subject.O || 'Unknown',
            issuer: cert.issuer.CN || cert.issuer.O || 'Unknown',
            validFrom: new Date(cert.valid_from),
            validTo: new Date(cert.valid_to),
            serialNumber: cert.serialNumber,
            signatureAlgorithm: cert.sigalg,
            keySize: cert.bits || 0,
            keyType: this.determineKeyType(cert),
            chainLength: this.calculateChainLength(cert),
            isWildcard: cert.subject.CN?.startsWith('*.') || false,
            san: cert.subjectaltname
              ? cert.subjectaltname
                  .split(', ')
                  .map((s: string) => s.replace('DNS:', ''))
              : [],
            ocspStapling: this.checkOCSPStapling(socket),
            hsts: false, // Will be checked separately
            grade: 'C', // Will be calculated
          };

          // Check HSTS
          const hstsHeader = res.headers['strict-transport-security'];
          certInfo.hsts = !!hstsHeader;

          resolve(certInfo);
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Certificate analysis timeout'));
      });

      req.end();
    });
  }

  private async performRampUpTest(
    config: SSLTestConfig,
    signal: AbortSignal,
  ): Promise<ConnectionMetric[]> {
    const metrics: ConnectionMetric[] = [];
    const rampUpSteps = 10;
    const stepDuration = config.rampUpTimeMs / rampUpSteps;
    const connectionsPerStep = Math.ceil(
      config.maxConcurrentConnections / rampUpSteps,
    );

    for (let step = 1; step <= rampUpSteps && !signal.aborted; step++) {
      const connectionsThisStep = Math.min(
        connectionsPerStep,
        config.maxConcurrentConnections,
      );
      const stepMetrics = await this.performConnections(
        config.domain,
        connectionsThisStep,
        config.connectionTimeoutMs,
        signal,
      );

      metrics.push(...stepMetrics);

      if (step < rampUpSteps) {
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }
    }

    return metrics;
  }

  private async performSustainedLoadTest(
    config: SSLTestConfig,
    signal: AbortSignal,
  ): Promise<ConnectionMetric[]> {
    const metrics: ConnectionMetric[] = [];
    const testStartTime = Date.now();
    const connectionsPerBatch = Math.ceil(config.targetTPS);
    const batchInterval = 1000; // 1 second

    while (
      Date.now() - testStartTime < config.testDurationMs &&
      !signal.aborted
    ) {
      const batchStartTime = Date.now();

      const batchMetrics = await this.performConnections(
        config.domain,
        connectionsPerBatch,
        config.connectionTimeoutMs,
        signal,
      );

      metrics.push(...batchMetrics);

      // Maintain target TPS
      const elapsed = Date.now() - batchStartTime;
      const remainingTime = batchInterval - elapsed;

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }
    }

    return metrics;
  }

  private async performSpikeTest(
    config: SSLTestConfig,
    signal: AbortSignal,
  ): Promise<ConnectionMetric[]> {
    const spikeConnections = config.maxConcurrentConnections * 2; // Double the normal load
    return this.performConnections(
      config.domain,
      spikeConnections,
      config.connectionTimeoutMs,
      signal,
    );
  }

  private async performConnections(
    domain: string,
    count: number,
    timeout: number,
    signal: AbortSignal,
  ): Promise<ConnectionMetric[]> {
    const promises: Promise<ConnectionMetric>[] = [];

    for (let i = 0; i < count; i++) {
      if (signal.aborted) break;

      promises.push(this.performSingleConnection(domain, timeout, signal));
    }

    const results = await Promise.allSettled(promises);
    return results
      .filter(
        (result): result is PromiseFulfilledResult<ConnectionMetric> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);
  }

  private performSingleConnection(
    domain: string,
    timeout: number,
    signal: AbortSignal,
  ): Promise<ConnectionMetric> {
    return new Promise((resolve) => {
      const connectionId = crypto.randomUUID();
      const startTime = new Date();
      const https = require('https');

      if (signal.aborted) {
        resolve({
          connectionId,
          startTime,
          endTime: new Date(),
          handshakeTime: 0,
          success: false,
          errorCode: 'ABORTED',
          certificateChainLength: 0,
          tlsVersion: '',
          cipherSuite: '',
        });
        return;
      }

      const options = {
        hostname: domain,
        port: 443,
        method: 'HEAD',
        timeout,
      };

      const req = https.request(options, (res: any) => {
        const endTime = new Date();
        const handshakeTime = endTime.getTime() - startTime.getTime();
        const socket = res.connection;

        const metric: ConnectionMetric = {
          connectionId,
          startTime,
          endTime,
          handshakeTime,
          success: true,
          certificateChainLength: this.getCertificateChainLength(socket),
          tlsVersion: socket.getProtocol() || 'unknown',
          cipherSuite: socket.getCipher()?.name || 'unknown',
          keyExchangeGroup: socket.getEphemeralKeyInfo()?.name,
        };

        resolve(metric);
      });

      req.on('error', (error: Error) => {
        resolve({
          connectionId,
          startTime,
          endTime: new Date(),
          handshakeTime: 0,
          success: false,
          errorCode: error.name,
          errorMessage: error.message,
          certificateChainLength: 0,
          tlsVersion: '',
          cipherSuite: '',
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          connectionId,
          startTime,
          endTime: new Date(),
          handshakeTime: timeout,
          success: false,
          errorCode: 'TIMEOUT',
          certificateChainLength: 0,
          tlsVersion: '',
          cipherSuite: '',
        });
      });

      req.end();
    });
  }

  private calculateTestMetrics(result: SSLTestResult): void {
    const successfulMetrics = result.rawMetrics.filter((m) => m.success);
    const handshakeTimes = successfulMetrics
      .map((m) => m.handshakeTime)
      .sort((a, b) => a - b);

    result.totalConnections = result.rawMetrics.length;
    result.successfulConnections = successfulMetrics.length;
    result.failedConnections =
      result.totalConnections - result.successfulConnections;
    result.errorRate =
      result.totalConnections > 0
        ? result.failedConnections / result.totalConnections
        : 0;

    if (handshakeTimes.length > 0) {
      result.averageHandshakeTime =
        handshakeTimes.reduce((sum, time) => sum + time, 0) /
        handshakeTimes.length;
      result.medianHandshakeTime =
        handshakeTimes[Math.floor(handshakeTimes.length / 2)];
      result.p95HandshakeTime =
        handshakeTimes[Math.floor(handshakeTimes.length * 0.95)];
      result.p99HandshakeTime =
        handshakeTimes[Math.floor(handshakeTimes.length * 0.99)];
      result.maxHandshakeTime = Math.max(...handshakeTimes);
      result.minHandshakeTime = Math.min(...handshakeTimes);
    }

    const testDurationSeconds =
      (result.testCompleted.getTime() - result.testStarted.getTime()) / 1000;
    result.throughput =
      testDurationSeconds > 0
        ? result.successfulConnections / testDurationSeconds
        : 0;
  }

  private gradePerformance(result: SSLTestResult): void {
    let score = 100;

    // Handshake time penalties
    if (result.averageHandshakeTime > 2000) score -= 30;
    else if (result.averageHandshakeTime > 1500) score -= 20;
    else if (result.averageHandshakeTime > 1000) score -= 10;

    // Error rate penalties
    if (result.errorRate > 0.05) score -= 40;
    else if (result.errorRate > 0.02) score -= 20;
    else if (result.errorRate > 0.01) score -= 10;

    // Certificate penalties
    if (!result.certificateDetails.hsts) score -= 5;
    if (!result.certificateDetails.ocspStapling) score -= 5;
    if (result.certificateDetails.keySize < 2048) score -= 15;

    // Performance consistency penalties
    const consistencyRatio = result.maxHandshakeTime / result.minHandshakeTime;
    if (consistencyRatio > 5) score -= 15;
    else if (consistencyRatio > 3) score -= 10;

    if (score >= 90) result.performanceGrade = score >= 95 ? 'A+' : 'A';
    else if (score >= 80) result.performanceGrade = 'B';
    else if (score >= 70) result.performanceGrade = 'C';
    else if (score >= 60) result.performanceGrade = 'D';
    else result.performanceGrade = 'F';
  }

  private generateMobileRecommendations(
    result: SSLTestResult,
    profile?: MobileTestProfile,
  ): void {
    const recommendations: string[] = [];
    let mobileScore = 100;

    // Mobile-specific recommendations
    if (profile) {
      if (result.averageHandshakeTime > 1500) {
        recommendations.push('Optimize SSL handshake for mobile networks');
        mobileScore -= 20;
      }

      if (result.certificateDetails.keySize > 2048) {
        recommendations.push(
          'Consider ECDSA certificates for better mobile performance',
        );
        mobileScore -= 10;
      }

      if (!result.certificateDetails.ocspStapling) {
        recommendations.push(
          'Enable OCSP stapling to reduce mobile certificate validation time',
        );
        mobileScore -= 15;
      }

      if (profile.connectionType === '2g' || profile.connectionType === '3g') {
        if (result.p95HandshakeTime > 3000) {
          recommendations.push(
            'SSL performance critical for slow mobile networks',
          );
          mobileScore -= 25;
        }
      }
    }

    // General recommendations
    if (result.errorRate > 0.01) {
      recommendations.push(
        'Reduce SSL connection errors for better mobile reliability',
      );
      mobileScore -= 20;
    }

    if (!result.certificateDetails.hsts) {
      recommendations.push('Enable HSTS for enhanced mobile security');
      mobileScore -= 10;
    }

    result.mobileOptimization = Math.max(0, mobileScore);
    result.recommendations = recommendations;
  }

  // Helper methods
  private determineKeyType(cert: any): 'RSA' | 'ECDSA' | 'EdDSA' {
    const sigalg = cert.sigalg?.toLowerCase() || '';
    if (sigalg.includes('ecdsa')) return 'ECDSA';
    if (sigalg.includes('ed25519') || sigalg.includes('ed448')) return 'EdDSA';
    return 'RSA';
  }

  private calculateChainLength(cert: any): number {
    let length = 1;
    let current = cert;
    while (current.issuerCertificate && current.issuerCertificate !== current) {
      length++;
      current = current.issuerCertificate;
    }
    return length;
  }

  private getCertificateChainLength(socket: any): number {
    try {
      const cert = socket.getPeerCertificate(true);
      return this.calculateChainLength(cert);
    } catch {
      return 0;
    }
  }

  private checkOCSPStapling(socket: any): boolean {
    try {
      return socket.getOCSPResponse() !== null;
    } catch {
      return false;
    }
  }

  private getMobileMaxConnections(profile: MobileTestProfile): number {
    switch (profile.connectionType) {
      case '2g':
        return 2;
      case '3g':
        return 5;
      case '4g':
        return 10;
      case '5g':
        return 20;
      case 'wifi':
        return 25;
      default:
        return 10;
    }
  }

  private getMobileTimeout(profile: MobileTestProfile): number {
    switch (profile.connectionType) {
      case '2g':
        return 15000; // 15 seconds
      case '3g':
        return 10000; // 10 seconds
      case '4g':
        return 8000; // 8 seconds
      case '5g':
        return 5000; // 5 seconds
      case 'wifi':
        return 5000; // 5 seconds
      default:
        return 8000;
    }
  }

  private getMobileTargetTPS(profile: MobileTestProfile): number {
    switch (profile.connectionType) {
      case '2g':
        return 1;
      case '3g':
        return 2;
      case '4g':
        return 5;
      case '5g':
        return 10;
      case 'wifi':
        return 10;
      default:
        return 5;
    }
  }
}

export default SSLLoadTester;
export type {
  SSLTestConfig,
  SSLTestResult,
  ConnectionMetric,
  SSLCertificateInfo,
  MobileTestProfile,
};
