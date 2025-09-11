/**
 * WS-145: Production Bundle Analysis & Size Enforcement System
 * Team A - Batch 12 - Round 3 - Advanced Bundle Optimization
 */

import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface BundleTarget {
  main: number;
  vendor: number;
  forms: number;
  dashboard: number;
  total: number;
}

interface BundleAnalysisResult {
  sizes: {
    main: number;
    vendor: number;
    forms: number;
    dashboard: number;
    total: number;
  };
  gzippedSizes: {
    main: number;
    vendor: number;
    forms: number;
    dashboard: number;
    total: number;
  };
  violations: BundleViolation[];
  recommendations: BundleRecommendation[];
  performance: {
    loadTime: number;
    parseTime: number;
    compressionRatio: number;
  };
  metadata: {
    buildId: string;
    timestamp: string;
    environment: string;
    commit?: string;
  };
}

interface BundleViolation {
  type: 'size_exceeded' | 'parse_time' | 'compression_ratio';
  severity: 'warning' | 'error' | 'critical';
  target: keyof BundleTarget;
  actual: number;
  expected: number;
  impact: 'high' | 'medium' | 'low';
  message: string;
}

interface BundleRecommendation {
  type:
    | 'code_splitting'
    | 'lazy_loading'
    | 'tree_shaking'
    | 'compression'
    | 'caching';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementation: string;
  expectedSavings: number; // bytes
  effort: 'low' | 'medium' | 'high';
}

interface ChunkAnalysis {
  name: string;
  size: number;
  gzipSize: number;
  parsetime: number;
  modules: string[];
  dependencies: string[];
  isEntrypoint: boolean;
  isDynamic: boolean;
  isOptimized: boolean;
}

export class WS145BundleAnalyzer {
  private static instance: WS145BundleAnalyzer;

  // Production Bundle Targets (bytes)
  private readonly BUNDLE_TARGETS: BundleTarget = {
    main: 200000, // 200KB main bundle
    vendor: 300000, // 300KB vendor bundle
    forms: 150000, // 150KB forms bundle
    dashboard: 180000, // 180KB dashboard bundle
    total: 800000, // 800KB total limit
  };

  // Performance Thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    maxParseTime: 50, // 50ms parse time
    minCompressionRatio: 3, // 3:1 compression ratio
    maxLoadTime: 1000, // 1s load time
  };

  private buildDir: string;
  private projectRoot: string;

  private constructor() {
    this.projectRoot = process.cwd();
    this.buildDir = path.join(this.projectRoot, '.next');
  }

  static getInstance(): WS145BundleAnalyzer {
    if (!WS145BundleAnalyzer.instance) {
      WS145BundleAnalyzer.instance = new WS145BundleAnalyzer();
    }
    return WS145BundleAnalyzer.instance;
  }

  /**
   * Comprehensive bundle analysis for WS-145 production requirements
   */
  async analyzeProductionBundle(): Promise<BundleAnalysisResult> {
    console.log('🔍 Starting WS-145 Production Bundle Analysis...');

    const startTime = Date.now();

    try {
      // Analyze all chunks
      const chunks = await this.analyzeAllChunks();

      // Categorize bundles
      const categorizedSizes = this.categorizeBundleSizes(chunks);
      const gzippedSizes = await this.calculateGzippedSizes(chunks);

      // Check for violations
      const violations = this.checkBundleViolations(categorizedSizes);

      // Generate recommendations
      const recommendations = await this.generateOptimizationRecommendations(
        chunks,
        violations,
      );

      // Calculate performance metrics
      const performance = await this.calculatePerformanceMetrics(chunks);

      // Generate metadata
      const metadata = await this.generateMetadata();

      const analysisTime = Date.now() - startTime;

      const result: BundleAnalysisResult = {
        sizes: categorizedSizes,
        gzippedSizes,
        violations,
        recommendations,
        performance,
        metadata,
      };

      console.log('✅ Bundle analysis completed', {
        analysisTime: `${analysisTime}ms`,
        totalSize: `${Math.round(categorizedSizes.total / 1024)}KB`,
        violations: violations.length,
        recommendations: recommendations.length,
      });

      // Store analysis results
      await this.storeAnalysisResults(result);

      return result;
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw new Error(`Bundle analysis failed: ${error.message}`);
    }
  }

  /**
   * Enforce bundle size limits and fail if exceeded
   */
  async enforceBundleLimits(): Promise<{
    passed: boolean;
    violations: BundleViolation[];
  }> {
    const analysis = await this.analyzeProductionBundle();
    const criticalViolations = analysis.violations.filter(
      (v) => v.severity === 'critical' || v.severity === 'error',
    );

    if (criticalViolations.length > 0) {
      console.error('❌ Bundle size enforcement failed:');
      criticalViolations.forEach((violation) => {
        console.error(
          `  ${violation.target}: ${Math.round(violation.actual / 1024)}KB > ${Math.round(violation.expected / 1024)}KB`,
        );
      });

      return { passed: false, violations: criticalViolations };
    }

    console.log('✅ Bundle size enforcement passed');
    return { passed: true, violations: [] };
  }

  /**
   * Generate detailed optimization report
   */
  async generateOptimizationReport(): Promise<string> {
    const analysis = await this.analyzeProductionBundle();

    let report = `# WS-145 Bundle Optimization Report\n\n`;
    report += `Generated: ${new Date(analysis.metadata.timestamp).toLocaleString()}\n`;
    report += `Build ID: ${analysis.metadata.buildId}\n\n`;

    // Bundle Sizes
    report += `## Bundle Sizes\n\n`;
    report += `| Bundle | Size | Gzipped | Target | Status |\n`;
    report += `|--------|------|---------|--------|---------|\n`;

    for (const [bundle, size] of Object.entries(analysis.sizes)) {
      if (bundle === 'total') continue;
      const target = this.BUNDLE_TARGETS[bundle as keyof BundleTarget];
      const gzipped =
        analysis.gzippedSizes[bundle as keyof typeof analysis.gzippedSizes];
      const status = size <= target ? '✅' : '❌';

      report += `| ${bundle} | ${Math.round(size / 1024)}KB | ${Math.round(gzipped / 1024)}KB | ${Math.round(target / 1024)}KB | ${status} |\n`;
    }

    report += `| **Total** | **${Math.round(analysis.sizes.total / 1024)}KB** | **${Math.round(analysis.gzippedSizes.total / 1024)}KB** | **${Math.round(this.BUNDLE_TARGETS.total / 1024)}KB** | **${analysis.sizes.total <= this.BUNDLE_TARGETS.total ? '✅' : '❌'}** |\n\n`;

    // Violations
    if (analysis.violations.length > 0) {
      report += `## ⚠️ Bundle Violations (${analysis.violations.length})\n\n`;
      analysis.violations.forEach((violation) => {
        const severity =
          violation.severity === 'critical'
            ? '🚨'
            : violation.severity === 'error'
              ? '❌'
              : '⚠️';
        report += `${severity} **${violation.target}**: ${violation.message}\n`;
        report += `  - Actual: ${Math.round(violation.actual / 1024)}KB\n`;
        report += `  - Expected: ${Math.round(violation.expected / 1024)}KB\n`;
        report += `  - Impact: ${violation.impact}\n\n`;
      });
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += `## 💡 Optimization Recommendations\n\n`;

      const highPriority = analysis.recommendations.filter(
        (r) => r.priority === 'high',
      );
      const mediumPriority = analysis.recommendations.filter(
        (r) => r.priority === 'medium',
      );
      const lowPriority = analysis.recommendations.filter(
        (r) => r.priority === 'low',
      );

      if (highPriority.length > 0) {
        report += `### 🔴 High Priority\n\n`;
        highPriority.forEach((rec) => {
          report += `**${rec.type}** (${Math.round(rec.expectedSavings / 1024)}KB savings)\n`;
          report += `- ${rec.description}\n`;
          report += `- Implementation: ${rec.implementation}\n`;
          report += `- Effort: ${rec.effort}\n\n`;
        });
      }

      if (mediumPriority.length > 0) {
        report += `### 🟡 Medium Priority\n\n`;
        mediumPriority.forEach((rec) => {
          report += `**${rec.type}** (${Math.round(rec.expectedSavings / 1024)}KB savings)\n`;
          report += `- ${rec.description}\n\n`;
        });
      }

      if (lowPriority.length > 0) {
        report += `### 🟢 Low Priority\n\n`;
        lowPriority.forEach((rec) => {
          report += `**${rec.type}** (${Math.round(rec.expectedSavings / 1024)}KB savings)\n`;
          report += `- ${rec.description}\n\n`;
        });
      }
    }

    // Performance Metrics
    report += `## 📊 Performance Metrics\n\n`;
    report += `- Load Time: ${analysis.performance.loadTime}ms (target: <${this.PERFORMANCE_THRESHOLDS.maxLoadTime}ms)\n`;
    report += `- Parse Time: ${analysis.performance.parseTime}ms (target: <${this.PERFORMANCE_THRESHOLDS.maxParseTime}ms)\n`;
    report += `- Compression Ratio: ${analysis.performance.compressionRatio.toFixed(1)}:1 (target: >${this.PERFORMANCE_THRESHOLDS.minCompressionRatio}:1)\n\n`;

    // Next Steps
    report += `## 🚀 Next Steps\n\n`;
    if (analysis.violations.length > 0) {
      report += `1. Address ${analysis.violations.filter((v) => v.severity === 'critical').length} critical violations\n`;
      report += `2. Implement high-priority optimization recommendations\n`;
      report += `3. Re-run bundle analysis to verify improvements\n\n`;
    } else {
      report += `✅ All bundle targets met! Consider medium/low priority optimizations for further improvements.\n\n`;
    }

    return report;
  }

  /**
   * Analyze all webpack chunks
   */
  private async analyzeAllChunks(): Promise<ChunkAnalysis[]> {
    const chunks: ChunkAnalysis[] = [];

    try {
      // Read webpack stats if available
      const statsPath = path.join(this.buildDir, 'webpack-stats.json');
      const webpackStats = await this.readJsonFile(statsPath);

      if (webpackStats && webpackStats.chunks) {
        for (const chunk of webpackStats.chunks) {
          const analysis = await this.analyzeWebpackChunk(chunk);
          chunks.push(analysis);
        }
      } else {
        // Fallback: analyze static files
        chunks.push(...(await this.analyzeStaticFiles()));
      }
    } catch (error) {
      console.warn(
        'Could not analyze webpack chunks, using fallback method:',
        error.message,
      );
      chunks.push(...(await this.analyzeStaticFiles()));
    }

    return chunks;
  }

  /**
   * Analyze static files as fallback
   */
  private async analyzeStaticFiles(): Promise<ChunkAnalysis[]> {
    const chunks: ChunkAnalysis[] = [];

    try {
      const staticPath = path.join(this.buildDir, 'static', 'chunks');
      const files = await fs.readdir(staticPath);
      const jsFiles = files.filter((f) => f.endsWith('.js'));

      for (const file of jsFiles) {
        const filePath = path.join(staticPath, file);
        const size = await this.getFileSize(filePath);
        const gzipSize = await this.getGzipSize(filePath);

        chunks.push({
          name: file,
          size,
          gzipSize,
          parsetime: await this.estimateParseTime(size),
          modules: [],
          dependencies: [],
          isEntrypoint: file.includes('main') || file.includes('pages/_app'),
          isDynamic: file.includes('chunk'),
          isOptimized: size < 100000, // Consider < 100KB as optimized
        });
      }
    } catch (error) {
      console.warn('Could not analyze static files:', error);
    }

    return chunks;
  }

  /**
   * Analyze individual webpack chunk
   */
  private async analyzeWebpackChunk(chunk: any): Promise<ChunkAnalysis> {
    const totalSize = chunk.size || 0;
    const modules = chunk.modules || [];

    return {
      name: chunk.names?.[0] || `chunk-${chunk.id}`,
      size: totalSize,
      gzipSize: Math.floor(totalSize * 0.3), // Estimate
      parsetime: await this.estimateParseTime(totalSize),
      modules: modules.map((m: any) => m.name || m.identifier).filter(Boolean),
      dependencies: this.extractDependencies(modules),
      isEntrypoint: chunk.entry || false,
      isDynamic: chunk.reason?.includes('dynamic') || false,
      isOptimized: totalSize < 200000 && modules.length < 50,
    };
  }

  /**
   * Categorize bundle sizes by type
   */
  private categorizeBundleSizes(
    chunks: ChunkAnalysis[],
  ): BundleAnalysisResult['sizes'] {
    let main = 0,
      vendor = 0,
      forms = 0,
      dashboard = 0;

    for (const chunk of chunks) {
      const size = chunk.size;
      const name = chunk.name.toLowerCase();

      if (name.includes('main') || chunk.isEntrypoint) {
        main += size;
      } else if (name.includes('vendor') || name.includes('node_modules')) {
        vendor += size;
      } else if (
        name.includes('form') ||
        chunk.modules.some((m) => m.includes('/forms/'))
      ) {
        forms += size;
      } else if (
        name.includes('dashboard') ||
        chunk.modules.some((m) => m.includes('/dashboard/'))
      ) {
        dashboard += size;
      } else {
        // Default to main bundle
        main += size;
      }
    }

    return {
      main,
      vendor,
      forms,
      dashboard,
      total: main + vendor + forms + dashboard,
    };
  }

  /**
   * Calculate gzipped sizes
   */
  private async calculateGzippedSizes(
    chunks: ChunkAnalysis[],
  ): Promise<BundleAnalysisResult['gzippedSizes']> {
    const totalGzipped = chunks.reduce((sum, chunk) => sum + chunk.gzipSize, 0);

    // Estimate gzipped sizes by category (simplified)
    const ratio = 0.3; // ~30% compression

    return {
      main: Math.floor(
        chunks
          .filter((c) => c.isEntrypoint)
          .reduce((sum, c) => sum + c.size, 0) * ratio,
      ),
      vendor: Math.floor(
        chunks
          .filter((c) => c.name.includes('vendor'))
          .reduce((sum, c) => sum + c.size, 0) * ratio,
      ),
      forms: Math.floor(
        chunks
          .filter((c) => c.name.includes('form'))
          .reduce((sum, c) => sum + c.size, 0) * ratio,
      ),
      dashboard: Math.floor(
        chunks
          .filter((c) => c.name.includes('dashboard'))
          .reduce((sum, c) => sum + c.size, 0) * ratio,
      ),
      total: totalGzipped,
    };
  }

  /**
   * Check for bundle size violations
   */
  private checkBundleViolations(
    sizes: BundleAnalysisResult['sizes'],
  ): BundleViolation[] {
    const violations: BundleViolation[] = [];

    // Check individual bundle limits
    for (const [bundle, size] of Object.entries(sizes)) {
      if (bundle === 'total') continue;

      const target = this.BUNDLE_TARGETS[bundle as keyof BundleTarget];
      const exceedsLimit = size > target;
      const severityLevel =
        size > target * 1.5
          ? 'critical'
          : size > target * 1.2
            ? 'error'
            : 'warning';

      if (exceedsLimit) {
        violations.push({
          type: 'size_exceeded',
          severity: severityLevel,
          target: bundle as keyof BundleTarget,
          actual: size,
          expected: target,
          impact:
            severityLevel === 'critical'
              ? 'high'
              : severityLevel === 'error'
                ? 'medium'
                : 'low',
          message: `${bundle} bundle size ${Math.round(size / 1024)}KB exceeds target ${Math.round(target / 1024)}KB`,
        });
      }
    }

    // Check total bundle limit
    if (sizes.total > this.BUNDLE_TARGETS.total) {
      violations.push({
        type: 'size_exceeded',
        severity: 'critical',
        target: 'total',
        actual: sizes.total,
        expected: this.BUNDLE_TARGETS.total,
        impact: 'high',
        message: `Total bundle size ${Math.round(sizes.total / 1024)}KB exceeds ${Math.round(this.BUNDLE_TARGETS.total / 1024)}KB limit`,
      });
    }

    return violations;
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(
    chunks: ChunkAnalysis[],
    violations: BundleViolation[],
  ): Promise<BundleRecommendation[]> {
    const recommendations: BundleRecommendation[] = [];

    // Large chunk recommendations
    const largeChunks = chunks.filter((c) => c.size > 500000); // > 500KB
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code_splitting',
        priority: 'high',
        description: `Found ${largeChunks.length} large chunks that should be split`,
        implementation:
          'Use dynamic imports and Next.js automatic code splitting',
        expectedSavings: largeChunks.reduce(
          (sum, c) => sum + Math.floor(c.size * 0.3),
          0,
        ),
        effort: 'medium',
      });
    }

    // Vendor bundle optimization
    const vendorSize = chunks
      .filter((c) => c.name.includes('vendor'))
      .reduce((sum, c) => sum + c.size, 0);
    if (vendorSize > this.BUNDLE_TARGETS.vendor) {
      recommendations.push({
        type: 'tree_shaking',
        priority: 'high',
        description:
          'Vendor bundle is oversized - enable tree shaking for unused exports',
        implementation:
          'Review package.json dependencies and use ES modules where possible',
        expectedSavings: Math.floor(vendorSize * 0.2), // Estimate 20% savings
        effort: 'medium',
      });
    }

    // Compression recommendations
    const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
    const totalGzipped = chunks.reduce((sum, c) => sum + c.gzipSize, 0);
    const compressionRatio = totalSize / totalGzipped;

    if (compressionRatio < this.PERFORMANCE_THRESHOLDS.minCompressionRatio) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        description: `Compression ratio ${compressionRatio.toFixed(1)}:1 is below optimal 3:1`,
        implementation:
          'Enable Brotli compression and optimize repeated code patterns',
        expectedSavings: Math.floor(totalSize * 0.15),
        effort: 'low',
      });
    }

    // Lazy loading recommendations
    const nonCriticalChunks = chunks.filter(
      (c) => !c.isEntrypoint && !c.isDynamic,
    );
    if (nonCriticalChunks.length > 0) {
      recommendations.push({
        type: 'lazy_loading',
        priority: 'medium',
        description: `${nonCriticalChunks.length} chunks could be lazy loaded`,
        implementation:
          'Convert static imports to dynamic imports for non-critical features',
        expectedSavings: Math.floor(
          nonCriticalChunks.reduce((sum, c) => sum + c.size, 0) * 0.8,
        ),
        effort: 'high',
      });
    }

    // Critical violations get priority
    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical',
    );
    if (criticalViolations.length > 0) {
      recommendations.unshift({
        type: 'code_splitting',
        priority: 'high',
        description:
          'Critical bundle size violations detected - immediate action required',
        implementation:
          'Implement aggressive code splitting and remove unused dependencies',
        expectedSavings: criticalViolations.reduce(
          (sum, v) => sum + (v.actual - v.expected),
          0,
        ),
        effort: 'high',
      });
    }

    // Sort by priority and expected savings
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.expectedSavings - a.expectedSavings;
    });
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(
    chunks: ChunkAnalysis[],
  ): Promise<BundleAnalysisResult['performance']> {
    const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
    const totalGzipped = chunks.reduce((sum, c) => sum + c.gzipSize, 0);

    return {
      loadTime: this.estimateLoadTime(totalGzipped),
      parseTime: chunks.reduce((sum, c) => sum + c.parsetime, 0),
      compressionRatio: totalSize / totalGzipped,
    };
  }

  /**
   * Generate metadata
   */
  private async generateMetadata(): Promise<BundleAnalysisResult['metadata']> {
    const buildId = await this.getBuildId();
    const commit = await this.getGitCommit();

    return {
      buildId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      commit,
    };
  }

  /**
   * Store analysis results
   */
  private async storeAnalysisResults(
    result: BundleAnalysisResult,
  ): Promise<void> {
    try {
      const outputPath = path.join(this.buildDir, 'bundle-analysis.json');
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2));

      console.log(`📊 Bundle analysis saved to ${outputPath}`);

      // Also create a summary report
      const report = await this.generateOptimizationReport();
      const reportPath = path.join(this.buildDir, 'bundle-report.md');
      await fs.writeFile(reportPath, report);

      console.log(`📄 Bundle report saved to ${reportPath}`);
    } catch (error) {
      console.warn('Could not save analysis results:', error);
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
      // Estimate as 30% of original
      const originalSize = await this.getFileSize(filePath);
      return Math.floor(originalSize * 0.3);
    }
  }

  private async getBuildId(): string {
    try {
      const buildIdPath = path.join(this.buildDir, 'BUILD_ID');
      const buildId = await fs.readFile(buildIdPath, 'utf8');
      return buildId.trim();
    } catch {
      return `build_${Date.now()}`;
    }
  }

  private async getGitCommit(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD');
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  private async estimateParseTime(size: number): Promise<number> {
    // Rough estimate: 1KB = ~0.1ms parse time on average hardware
    return Math.floor(size / 10000);
  }

  private estimateLoadTime(gzippedSize: number): number {
    // Estimate load time based on typical 3G speed (1.6 Mbps)
    const speedBytesPerMs = 1600000 / 8000; // 200 bytes per ms
    return Math.ceil(gzippedSize / speedBytesPerMs);
  }

  private extractDependencies(modules: any[]): string[] {
    const deps = new Set<string>();

    for (const module of modules) {
      const moduleName = module.name || module.identifier || '';
      if (moduleName.includes('node_modules/')) {
        const match = moduleName.match(/node_modules\/([^\/]+)/);
        if (match) {
          deps.add(match[1]);
        }
      }
    }

    return Array.from(deps);
  }
}

// Export singleton instance
export const ws145BundleAnalyzer = WS145BundleAnalyzer.getInstance();

// Convenience functions
export const analyzeProductionBundle = () =>
  ws145BundleAnalyzer.analyzeProductionBundle();
export const enforceBundleLimits = () =>
  ws145BundleAnalyzer.enforceBundleLimits();
export const generateOptimizationReport = () =>
  ws145BundleAnalyzer.generateOptimizationReport();
