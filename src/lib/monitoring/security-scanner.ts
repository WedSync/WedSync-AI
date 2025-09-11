/**
 * Security Scanner Integration for WS-151
 * Snyk security scanning automation and vulnerability management
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface SecurityScanOptions {
  type: 'dependencies' | 'code' | 'container' | 'iac';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  json?: boolean;
  monitor?: boolean;
}

interface Vulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  package: string;
  version: string;
  vulnerableVersions: string;
  patchedIn?: string;
  description: string;
  cvssScore?: number;
  cve?: string[];
  exploit?: string;
  publicationTime: string;
  disclosureTime?: string;
  patches?: any[];
}

interface SecurityScanResult {
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timestamp: string;
  scanType: string;
  projectPath: string;
  status: 'pass' | 'fail';
  metadata?: {
    scanDuration: number;
    packageManager: string;
    totalDependencies: number;
  };
}

interface SecurityReport {
  status: 'pass' | 'fail';
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  totalVulns: number;
  recommendations: string[];
  compliance: {
    score: number;
    frameworks: string[];
  };
  timestamp: string;
  reportId: string;
}

export class SecurityScannerService {
  private static instance: SecurityScannerService;
  private projectRoot: string;
  private snykToken?: string;

  private constructor() {
    this.projectRoot = process.cwd();
    this.snykToken = process.env.SNYK_TOKEN;
  }

  static getInstance(): SecurityScannerService {
    if (!SecurityScannerService.instance) {
      SecurityScannerService.instance = new SecurityScannerService();
    }
    return SecurityScannerService.instance;
  }

  /**
   * Run comprehensive security scan
   */
  async runSecurityScan(
    options: SecurityScanOptions,
  ): Promise<SecurityScanResult> {
    const startTime = Date.now();

    console.log('Starting security scan:', options);

    try {
      // Validate Snyk token
      if (!this.snykToken) {
        throw new Error('SNYK_TOKEN environment variable is required');
      }

      let scanResult: any;

      switch (options.type) {
        case 'dependencies':
          scanResult = await this.scanDependencies(options);
          break;
        case 'code':
          scanResult = await this.scanCode(options);
          break;
        case 'container':
          scanResult = await this.scanContainer(options);
          break;
        case 'iac':
          scanResult = await this.scanInfrastructure(options);
          break;
        default:
          throw new Error(`Unsupported scan type: ${options.type}`);
      }

      const scanDuration = Date.now() - startTime;

      const result: SecurityScanResult = {
        vulnerabilities: this.parseVulnerabilities(scanResult),
        summary: this.createSummary(scanResult),
        timestamp: new Date().toISOString(),
        scanType: options.type,
        projectPath: this.projectRoot,
        status: this.determineStatus(scanResult, options.severity),
        metadata: {
          scanDuration,
          packageManager: await this.detectPackageManager(),
          totalDependencies: await this.countDependencies(),
        },
      };

      // Monitor in production if requested
      if (options.monitor && process.env.NODE_ENV === 'production') {
        await this.monitorProject(options.type);
      }

      console.log('Security scan completed:', {
        type: options.type,
        status: result.status,
        vulnerabilities: result.summary.total,
        duration: scanDuration,
      });

      return result;
    } catch (error) {
      console.error('Security scan failed:', error);
      throw error;
    }
  }

  /**
   * Scan dependencies for vulnerabilities
   */
  private async scanDependencies(options: SecurityScanOptions): Promise<any> {
    const severityFlag = options.severity
      ? `--severity-threshold=${options.severity}`
      : '';
    const jsonFlag = options.json !== false ? '--json' : '';

    const command = `npx snyk test ${severityFlag} ${jsonFlag}`;

    try {
      const { stdout } = await execAsync(command, {
        cwd: this.projectRoot,
        env: { ...process.env, SNYK_TOKEN: this.snykToken },
      });

      return options.json !== false ? JSON.parse(stdout) : stdout;
    } catch (error: any) {
      // Snyk exits with non-zero status when vulnerabilities are found
      if (error.stdout) {
        return options.json !== false ? JSON.parse(error.stdout) : error.stdout;
      }
      throw error;
    }
  }

  /**
   * Scan code for vulnerabilities
   */
  private async scanCode(options: SecurityScanOptions): Promise<any> {
    const severityFlag = options.severity
      ? `--severity-threshold=${options.severity}`
      : '';
    const jsonFlag = options.json !== false ? '--json' : '';

    const command = `npx snyk code test ${severityFlag} ${jsonFlag}`;

    try {
      const { stdout } = await execAsync(command, {
        cwd: this.projectRoot,
        env: { ...process.env, SNYK_TOKEN: this.snykToken },
      });

      return options.json !== false ? JSON.parse(stdout) : stdout;
    } catch (error: any) {
      if (error.stdout) {
        return options.json !== false ? JSON.parse(error.stdout) : error.stdout;
      }
      throw error;
    }
  }

  /**
   * Scan container for vulnerabilities (if Docker is available)
   */
  private async scanContainer(options: SecurityScanOptions): Promise<any> {
    // Check if Dockerfile exists
    const dockerfilePath = path.join(this.projectRoot, 'Dockerfile');

    try {
      await fs.access(dockerfilePath);
    } catch {
      throw new Error('Dockerfile not found - container scan not available');
    }

    const severityFlag = options.severity
      ? `--severity-threshold=${options.severity}`
      : '';
    const jsonFlag = options.json !== false ? '--json' : '';

    const command = `npx snyk container test . ${severityFlag} ${jsonFlag}`;

    try {
      const { stdout } = await execAsync(command, {
        cwd: this.projectRoot,
        env: { ...process.env, SNYK_TOKEN: this.snykToken },
      });

      return options.json !== false ? JSON.parse(stdout) : stdout;
    } catch (error: any) {
      if (error.stdout) {
        return options.json !== false ? JSON.parse(error.stdout) : error.stdout;
      }
      throw error;
    }
  }

  /**
   * Scan Infrastructure as Code for vulnerabilities
   */
  private async scanInfrastructure(options: SecurityScanOptions): Promise<any> {
    const severityFlag = options.severity
      ? `--severity-threshold=${options.severity}`
      : '';
    const jsonFlag = options.json !== false ? '--json' : '';

    const command = `npx snyk iac test ${severityFlag} ${jsonFlag}`;

    try {
      const { stdout } = await execAsync(command, {
        cwd: this.projectRoot,
        env: { ...process.env, SNYK_TOKEN: this.snykToken },
      });

      return options.json !== false ? JSON.parse(stdout) : stdout;
    } catch (error: any) {
      if (error.stdout) {
        return options.json !== false ? JSON.parse(error.stdout) : error.stdout;
      }
      throw error;
    }
  }

  /**
   * Parse vulnerabilities from Snyk output
   */
  private parseVulnerabilities(scanResult: any): Vulnerability[] {
    if (typeof scanResult === 'string') {
      // Parse text output
      return this.parseTextVulnerabilities(scanResult);
    }

    if (
      scanResult.vulnerabilities &&
      Array.isArray(scanResult.vulnerabilities)
    ) {
      return scanResult.vulnerabilities.map((vuln: any) => ({
        id: vuln.id,
        title: vuln.title,
        severity: vuln.severity,
        package: vuln.package,
        version: vuln.version,
        vulnerableVersions: vuln.vulnerableVersions,
        patchedIn: vuln.patchedIn,
        description: vuln.description,
        cvssScore: vuln.cvssScore,
        cve: vuln.identifiers?.CVE || [],
        exploit: vuln.exploit,
        publicationTime: vuln.publicationTime,
        disclosureTime: vuln.disclosureTime,
        patches: vuln.patches || [],
      }));
    }

    return [];
  }

  /**
   * Parse text-based vulnerability output
   */
  private parseTextVulnerabilities(output: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Simple regex-based parsing for text output
    const vulnRegex = /✗\s+(.+?)\s+\[(.+?)\]\s+in\s+(.+?)@(.+?)$/gm;
    let match;

    while ((match = vulnRegex.exec(output)) !== null) {
      vulnerabilities.push({
        id: `text-${Date.now()}-${vulnerabilities.length}`,
        title: match[1],
        severity: match[2].toLowerCase() as any,
        package: match[3],
        version: match[4],
        vulnerableVersions: match[4],
        description: match[1],
        publicationTime: new Date().toISOString(),
      });
    }

    return vulnerabilities;
  }

  /**
   * Create vulnerability summary
   */
  private createSummary(scanResult: any): SecurityScanResult['summary'] {
    const vulnerabilities = this.parseVulnerabilities(scanResult);

    const summary = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    vulnerabilities.forEach((vuln) => {
      switch (vuln.severity) {
        case 'critical':
          summary.critical++;
          break;
        case 'high':
          summary.high++;
          break;
        case 'medium':
          summary.medium++;
          break;
        case 'low':
          summary.low++;
          break;
      }
    });

    return summary;
  }

  /**
   * Determine scan status based on severity threshold
   */
  private determineStatus(
    scanResult: any,
    severityThreshold?: string,
  ): 'pass' | 'fail' {
    const summary = this.createSummary(scanResult);

    if (!severityThreshold) {
      return summary.total === 0 ? 'pass' : 'fail';
    }

    switch (severityThreshold) {
      case 'critical':
        return summary.critical === 0 ? 'pass' : 'fail';
      case 'high':
        return summary.critical === 0 && summary.high === 0 ? 'pass' : 'fail';
      case 'medium':
        return summary.critical === 0 &&
          summary.high === 0 &&
          summary.medium === 0
          ? 'pass'
          : 'fail';
      default:
        return summary.total === 0 ? 'pass' : 'fail';
    }
  }

  /**
   * Monitor project continuously
   */
  private async monitorProject(scanType: string): Promise<void> {
    const command = `npx snyk monitor`;

    try {
      await execAsync(command, {
        cwd: this.projectRoot,
        env: { ...process.env, SNYK_TOKEN: this.snykToken },
      });

      console.log(`${scanType} monitoring enabled for project`);
    } catch (error) {
      console.warn(`Failed to enable monitoring for ${scanType}:`, error);
    }
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(): Promise<SecurityReport> {
    console.log('Generating comprehensive security report...');

    const reportId = `security_report_${Date.now()}`;
    const startTime = Date.now();

    try {
      // Run all scan types
      const [depScan, codeScan] = await Promise.allSettled([
        this.runSecurityScan({ type: 'dependencies', severity: 'medium' }),
        this.runSecurityScan({ type: 'code', severity: 'medium' }),
      ]);

      let totalVulns = 0;
      let criticalVulns = 0;
      let highVulns = 0;
      let mediumVulns = 0;
      let lowVulns = 0;

      // Aggregate results
      [depScan, codeScan].forEach((result) => {
        if (result.status === 'fulfilled') {
          const summary = result.value.summary;
          totalVulns += summary.total;
          criticalVulns += summary.critical;
          highVulns += summary.high;
          mediumVulns += summary.medium;
          lowVulns += summary.low;
        }
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        criticalVulns,
        highVulns,
        mediumVulns,
        lowVulns,
        totalVulns,
      });

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore({
        criticalVulns,
        highVulns,
        mediumVulns,
        totalVulns,
      });

      const report: SecurityReport = {
        status: criticalVulns === 0 && highVulns === 0 ? 'pass' : 'fail',
        criticalVulns,
        highVulns,
        mediumVulns,
        lowVulns,
        totalVulns,
        recommendations,
        compliance: {
          score: complianceScore,
          frameworks: ['OWASP Top 10', 'NIST Cybersecurity Framework'],
        },
        timestamp: new Date().toISOString(),
        reportId,
      };

      console.log('Security report generated:', {
        reportId,
        status: report.status,
        totalVulns,
        complianceScore,
        duration: Date.now() - startTime,
      });

      return report;
    } catch (error) {
      console.error('Failed to generate security report:', error);
      throw error;
    }
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(vulns: any): string[] {
    const recommendations: string[] = [];

    if (vulns.criticalVulns > 0) {
      recommendations.push(
        `URGENT: Address ${vulns.criticalVulns} critical vulnerabilities immediately`,
      );
      recommendations.push(
        'Consider blocking deployments until critical issues are resolved',
      );
    }

    if (vulns.highVulns > 0) {
      recommendations.push(
        `Address ${vulns.highVulns} high-severity vulnerabilities within 24 hours`,
      );
    }

    if (vulns.mediumVulns > 5) {
      recommendations.push(
        'Plan remediation for medium-severity vulnerabilities',
      );
      recommendations.push('Consider updating dependency management practices');
    }

    if (vulns.totalVulns === 0) {
      recommendations.push('Excellent! No vulnerabilities found');
      recommendations.push(
        'Continue regular security scans to maintain security posture',
      );
    }

    // General recommendations
    recommendations.push(
      'Enable Snyk monitoring for continuous vulnerability detection',
    );
    recommendations.push('Set up automated security checks in CI/CD pipeline');
    recommendations.push('Review and update dependencies regularly');

    return recommendations;
  }

  /**
   * Calculate compliance score based on vulnerability profile
   */
  private calculateComplianceScore(vulns: any): number {
    let score = 100;

    score -= vulns.criticalVulns * 30;
    score -= vulns.highVulns * 15;
    score -= vulns.mediumVulns * 5;
    score -= vulns.lowVulns * 1;

    return Math.max(0, score);
  }

  /**
   * Detect package manager
   */
  private async detectPackageManager(): Promise<string> {
    const packageManagers = [
      { file: 'package-lock.json', manager: 'npm' },
      { file: 'yarn.lock', manager: 'yarn' },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    ];

    for (const pm of packageManagers) {
      try {
        await fs.access(path.join(this.projectRoot, pm.file));
        return pm.manager;
      } catch {
        continue;
      }
    }

    return 'unknown';
  }

  /**
   * Count total dependencies
   */
  private async countDependencies(): Promise<number> {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8'),
      );

      const deps = Object.keys(packageJson.dependencies || {}).length;
      const devDeps = Object.keys(packageJson.devDependencies || {}).length;

      return deps + devDeps;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance and convenience functions
export const securityScanner = SecurityScannerService.getInstance();

export const runSecurityScan = (options: SecurityScanOptions) => {
  return securityScanner.runSecurityScan(options);
};

export const generateSecurityReport = () => {
  return securityScanner.generateSecurityReport();
};
