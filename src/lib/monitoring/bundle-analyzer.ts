/**
 * Bundle Analyzer for WS-151
 * Tracking monitoring impact on bundle size and performance
 */

import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface BundleChunk {
  name: string;
  size: number;
  gzipSize: number;
  modules: string[];
}

interface MonitoringBundleSize {
  sentry: number;
  logRocket: number;
  webVitals: number;
  total: number;
  percentage: number;
}

interface BundleReport {
  totalSize: number;
  gzippedSize: number;
  chunkSizes: BundleChunk[];
  monitoringImpact: {
    sentrySize: number;
    logRocketSize: number;
    webVitalsSize: number;
    totalOverhead: number;
    percentageOfTotal: number;
  };
  recommendations: {
    type: 'warning' | 'info' | 'critical';
    message: string;
    impact: 'high' | 'medium' | 'low';
  }[];
  timestamp: string;
  buildId: string;
}

interface PerformanceRecommendation {
  type:
    | 'bundle_size'
    | 'monitoring_overhead'
    | 'code_splitting'
    | 'lazy_loading';
  message: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  implementation?: string;
}

export class BundleAnalyzerService {
  private static instance: BundleAnalyzerService;
  private buildDir: string;
  private projectRoot: string;

  private constructor() {
    this.projectRoot = process.cwd();
    this.buildDir = path.join(this.projectRoot, '.next');
  }

  static getInstance(): BundleAnalyzerService {
    if (!BundleAnalyzerService.instance) {
      BundleAnalyzerService.instance = new BundleAnalyzerService();
    }
    return BundleAnalyzerService.instance;
  }

  /**
   * Generate comprehensive bundle analysis report
   */
  async generateBundleReport(): Promise<BundleReport> {
    console.log('Generating bundle analysis report...');

    const buildId = await this.getBuildId();
    const startTime = Date.now();

    try {
      // Analyze build output
      const chunks = await this.analyzeBuildChunks();
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      const gzippedSize = chunks.reduce(
        (sum, chunk) => sum + chunk.gzipSize,
        0,
      );

      // Analyze monitoring impact
      const monitoringImpact = await this.analyzeMonitoringImpact(chunks);

      // Generate recommendations
      const recommendations = await this.generateRecommendations({
        totalSize,
        monitoringImpact,
        chunks,
      });

      const report: BundleReport = {
        totalSize,
        gzippedSize,
        chunkSizes: chunks,
        monitoringImpact: {
          sentrySize: monitoringImpact.sentry,
          logRocketSize: monitoringImpact.logRocket,
          webVitalsSize: monitoringImpact.webVitals,
          totalOverhead: monitoringImpact.total,
          percentageOfTotal: (monitoringImpact.total / totalSize) * 100,
        },
        recommendations,
        timestamp: new Date().toISOString(),
        buildId,
      };

      console.log('Bundle report generated:', {
        buildId,
        totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
        monitoringOverhead: `${(monitoringImpact.total / 1024).toFixed(2)}KB`,
        percentage: `${report.monitoringImpact.percentageOfTotal.toFixed(2)}%`,
        duration: Date.now() - startTime,
      });

      return report;
    } catch (error) {
      console.error('Failed to generate bundle report:', error);
      throw error;
    }
  }

  /**
   * Get monitoring bundle size impact
   */
  async getMonitoringBundleSize(): Promise<MonitoringBundleSize> {
    const chunks = await this.analyzeBuildChunks();
    const monitoringLibs = this.identifyMonitoringLibraries(chunks);

    const sentry = monitoringLibs
      .filter(
        (lib) =>
          lib.name.includes('sentry') ||
          lib.modules.some((m) => m.includes('@sentry')),
      )
      .reduce((sum, lib) => sum + lib.size, 0);

    const logRocket = monitoringLibs
      .filter(
        (lib) =>
          lib.name.includes('logrocket') ||
          lib.modules.some((m) => m.includes('logrocket')),
      )
      .reduce((sum, lib) => sum + lib.size, 0);

    const webVitals = monitoringLibs
      .filter(
        (lib) =>
          lib.name.includes('web-vitals') ||
          lib.modules.some((m) => m.includes('web-vitals')),
      )
      .reduce((sum, lib) => sum + lib.size, 0);

    const total = sentry + logRocket + webVitals;
    const totalBundleSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

    return {
      sentry,
      logRocket,
      webVitals,
      total,
      percentage: totalBundleSize > 0 ? (total / totalBundleSize) * 100 : 0,
    };
  }

  /**
   * Generate performance recommendations
   */
  async getPerformanceRecommendations(): Promise<PerformanceRecommendation[]> {
    const monitoringSize = await this.getMonitoringBundleSize();
    const chunks = await this.analyzeBuildChunks();
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

    const recommendations: PerformanceRecommendation[] = [];

    // Check monitoring overhead
    if (monitoringSize.percentage > 5) {
      recommendations.push({
        type: 'monitoring_overhead',
        message: `Monitoring libraries account for ${monitoringSize.percentage.toFixed(1)}% of bundle size (${(monitoringSize.total / 1024).toFixed(2)}KB)`,
        impact: 'high',
        priority: 1,
        implementation:
          'Consider lazy loading monitoring libraries or reducing sampling rates further',
      });
    } else if (monitoringSize.percentage > 2) {
      recommendations.push({
        type: 'monitoring_overhead',
        message: `Monitoring overhead is ${monitoringSize.percentage.toFixed(1)}% - consider optimization`,
        impact: 'medium',
        priority: 3,
      });
    }

    // Check total bundle size
    if (totalSize > 1024 * 1024) {
      // > 1MB
      recommendations.push({
        type: 'bundle_size',
        message: `Total bundle size is ${(totalSize / 1024 / 1024).toFixed(2)}MB - consider code splitting`,
        impact: 'high',
        priority: 2,
        implementation:
          'Implement dynamic imports and route-based code splitting',
      });
    }

    // Check for large chunks
    const largeChunks = chunks.filter((chunk) => chunk.size > 500 * 1024); // > 500KB
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code_splitting',
        message: `Found ${largeChunks.length} large chunks (>500KB) that could be split`,
        impact: 'medium',
        priority: 4,
        implementation: 'Break down large chunks using dynamic imports',
      });
    }

    // Wedding day specific recommendations
    if (process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true') {
      recommendations.push({
        type: 'lazy_loading',
        message:
          'Wedding day mode: Consider lazy loading non-critical monitoring features',
        impact: 'high',
        priority: 1,
        implementation:
          'Load LogRocket and advanced Sentry features only after initial page load',
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Analyze build chunks from Next.js build
   */
  private async analyzeBuildChunks(): Promise<BundleChunk[]> {
    const chunks: BundleChunk[] = [];

    try {
      // Try to read Next.js build manifest
      const manifestPath = path.join(this.buildDir, 'build-manifest.json');
      const buildManifest = await this.readJsonFile(manifestPath);

      if (buildManifest && buildManifest.pages) {
        for (const [page, files] of Object.entries(buildManifest.pages)) {
          const pageFiles = files as string[];
          for (const file of pageFiles) {
            const filePath = path.join(this.buildDir, 'static', file);
            const size = await this.getFileSize(filePath);
            const gzipSize = await this.getGzipSize(filePath);

            chunks.push({
              name: `${page}/${file}`,
              size,
              gzipSize,
              modules: [], // Would need webpack stats for detailed module info
            });
          }
        }
      }

      // Analyze static chunks
      const staticPath = path.join(this.buildDir, 'static', 'chunks');
      const chunkFiles = await this.getJsFiles(staticPath);

      for (const file of chunkFiles) {
        const filePath = path.join(staticPath, file);
        const size = await this.getFileSize(filePath);
        const gzipSize = await this.getGzipSize(filePath);

        chunks.push({
          name: `chunks/${file}`,
          size,
          gzipSize,
          modules: await this.extractModulesFromChunk(filePath),
        });
      }
    } catch (error) {
      console.warn('Could not analyze build chunks:', error);

      // Fallback: estimate from known monitoring libraries
      chunks.push({
        name: 'monitoring-estimated',
        size: 80 * 1024, // ~80KB estimated
        gzipSize: 25 * 1024, // ~25KB gzipped
        modules: ['@sentry/nextjs', 'logrocket', 'web-vitals'],
      });
    }

    return chunks;
  }

  /**
   * Analyze monitoring impact on bundle
   */
  private async analyzeMonitoringImpact(
    chunks: BundleChunk[],
  ): Promise<MonitoringBundleSize> {
    const monitoringChunks = this.identifyMonitoringLibraries(chunks);

    const sentry = monitoringChunks
      .filter((chunk) => this.isMonitoringLibrary(chunk, 'sentry'))
      .reduce((sum, chunk) => sum + chunk.size, 0);

    const logRocket = monitoringChunks
      .filter((chunk) => this.isMonitoringLibrary(chunk, 'logrocket'))
      .reduce((sum, chunk) => sum + chunk.size, 0);

    const webVitals = monitoringChunks
      .filter((chunk) => this.isMonitoringLibrary(chunk, 'web-vitals'))
      .reduce((sum, chunk) => sum + chunk.size, 0);

    const total = sentry + logRocket + webVitals;
    const totalBundleSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

    return {
      sentry,
      logRocket,
      webVitals,
      total,
      percentage: totalBundleSize > 0 ? (total / totalBundleSize) * 100 : 0,
    };
  }

  /**
   * Generate recommendations based on bundle analysis
   */
  private async generateRecommendations(data: {
    totalSize: number;
    monitoringImpact: MonitoringBundleSize;
    chunks: BundleChunk[];
  }): Promise<BundleReport['recommendations']> {
    const recommendations: BundleReport['recommendations'] = [];

    // Monitoring overhead recommendations
    if (data.monitoringImpact.percentage > 5) {
      recommendations.push({
        type: 'critical',
        message: `Monitoring libraries are ${data.monitoringImpact.percentage.toFixed(1)}% of total bundle - exceeds 5% threshold`,
        impact: 'high',
      });
    } else if (data.monitoringImpact.percentage > 2) {
      recommendations.push({
        type: 'warning',
        message: `Monitoring overhead is ${data.monitoringImpact.percentage.toFixed(1)}% - consider lazy loading`,
        impact: 'medium',
      });
    } else {
      recommendations.push({
        type: 'info',
        message: `Monitoring overhead is ${data.monitoringImpact.percentage.toFixed(1)}% - within acceptable range`,
        impact: 'low',
      });
    }

    // Bundle size recommendations
    if (data.totalSize > 2 * 1024 * 1024) {
      // > 2MB
      recommendations.push({
        type: 'critical',
        message: `Total bundle size is ${(data.totalSize / 1024 / 1024).toFixed(2)}MB - implement aggressive code splitting`,
        impact: 'high',
      });
    } else if (data.totalSize > 1024 * 1024) {
      // > 1MB
      recommendations.push({
        type: 'warning',
        message: `Bundle size is ${(data.totalSize / 1024 / 1024).toFixed(2)}MB - consider code splitting`,
        impact: 'medium',
      });
    }

    // Wedding day specific recommendations
    if (process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true') {
      recommendations.push({
        type: 'info',
        message:
          'Wedding day mode active - monitoring is optimized for minimal performance impact',
        impact: 'low',
      });
    }

    return recommendations;
  }

  /**
   * Identify monitoring libraries in chunks
   */
  private identifyMonitoringLibraries(chunks: BundleChunk[]): BundleChunk[] {
    const monitoringPatterns = [
      'sentry',
      'logrocket',
      'web-vitals',
      'monitoring',
      'analytics',
    ];

    return chunks.filter((chunk) => {
      const chunkName = chunk.name.toLowerCase();
      const hasMonitoringModule = chunk.modules.some((module) =>
        monitoringPatterns.some((pattern) =>
          module.toLowerCase().includes(pattern),
        ),
      );

      return (
        monitoringPatterns.some((pattern) => chunkName.includes(pattern)) ||
        hasMonitoringModule
      );
    });
  }

  /**
   * Check if chunk contains specific monitoring library
   */
  private isMonitoringLibrary(chunk: BundleChunk, library: string): boolean {
    const chunkName = chunk.name.toLowerCase();
    const hasLibraryInName = chunkName.includes(library.toLowerCase());
    const hasLibraryInModules = chunk.modules.some((module) =>
      module.toLowerCase().includes(library.toLowerCase()),
    );

    return hasLibraryInName || hasLibraryInModules;
  }

  /**
   * Get current build ID
   */
  private async getBuildId(): string {
    try {
      const buildIdPath = path.join(this.buildDir, 'BUILD_ID');
      const buildId = await fs.readFile(buildIdPath, 'utf8');
      return buildId.trim();
    } catch {
      return `build_${Date.now()}`;
    }
  }

  /**
   * Helper methods
   */
  private async readJsonFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async getGzipSize(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`gzip -c "${filePath}" | wc -c`);
      return parseInt(stdout.trim(), 10);
    } catch {
      // Estimate gzip as ~30% of original size
      const originalSize = await this.getFileSize(filePath);
      return Math.floor(originalSize * 0.3);
    }
  }

  private async getJsFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      return files.filter((file) => file.endsWith('.js'));
    } catch {
      return [];
    }
  }

  private async extractModulesFromChunk(filePath: string): Promise<string[]> {
    try {
      // This would require parsing the webpack chunk
      // For now, return empty array - would need more sophisticated analysis
      return [];
    } catch {
      return [];
    }
  }
}

// Export singleton instance and convenience functions
export const bundleAnalyzer = BundleAnalyzerService.getInstance();

export const generateBundleReport = () => {
  return bundleAnalyzer.generateBundleReport();
};

export const getMonitoringBundleSize = () => {
  return bundleAnalyzer.getMonitoringBundleSize();
};

export const getPerformanceRecommendations = () => {
  return bundleAnalyzer.getPerformanceRecommendations();
};
