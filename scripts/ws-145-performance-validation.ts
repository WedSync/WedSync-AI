/**
 * WS-145: Performance Validation Script
 * Validates bundle sizes and performance metrics against targets
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PERFORMANCE_TARGETS, BUNDLE_TARGETS } from '../src/lib/monitoring/performance-monitor';

interface BundleStats {
  namedChunkGroups: Record<string, any>;
  assets: Array<{
    name: string;
    size: number;
  }>;
  chunks: Array<{
    id: string;
    names: string[];
    size: number;
    modules: any[];
  }>;
}

interface ValidationResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  summary: {
    bundleSize: {
      main: number;
      vendor: number;
      total: number;
    };
    compliance: {
      bundleTargetsMet: boolean;
      performanceTargetsConfigured: boolean;
    };
  };
}

class PerformanceValidator {
  private bundleStatsPath: string;
  private nextOutputPath: string;

  constructor() {
    this.bundleStatsPath = path.join(process.cwd(), 'bundle-stats.json');
    this.nextOutputPath = path.join(process.cwd(), '.next');
  }

  async validateBundleSizes(): Promise<{
    passed: boolean;
    violations: string[];
    warnings: string[];
    summary: any;
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let bundleSummary: any = {
      main: 0,
      vendor: 0,
      forms: 0,
      dashboard: 0,
      total: 0
    };

    try {
      // Check if Next.js build output exists
      const buildExists = await fs.access(this.nextOutputPath).then(() => true).catch(() => false);
      if (!buildExists) {
        violations.push('Next.js build output not found. Run `npm run build` first.');
        return { passed: false, violations, warnings, summary: bundleSummary };
      }

      // Try to read webpack bundle stats if available
      let bundleStats: BundleStats | null = null;
      try {
        const statsContent = await fs.readFile(this.bundleStatsPath, 'utf-8');
        bundleStats = JSON.parse(statsContent);
      } catch (error) {
        warnings.push('Bundle stats file not found. Run `npm run analyze` to generate detailed stats.');
      }

      // Analyze .next build output
      const staticPath = path.join(this.nextOutputPath, 'static', 'chunks');
      const staticExists = await fs.access(staticPath).then(() => true).catch(() => false);
      
      if (staticExists) {
        const chunkFiles = await fs.readdir(staticPath);
        
        let totalSize = 0;
        let mainSize = 0;
        let vendorSize = 0;
        let formsSize = 0;
        let dashboardSize = 0;

        for (const file of chunkFiles) {
          if (!file.endsWith('.js')) continue;
          
          const filePath = path.join(staticPath, file);
          const stats = await fs.stat(filePath);
          const size = stats.size;
          totalSize += size;

          // Categorize chunks based on naming patterns
          if (file.includes('main') || file.includes('pages/_app')) {
            mainSize += size;
          } else if (file.includes('framework') || file.includes('vendor')) {
            vendorSize += size;
          } else if (file.includes('forms')) {
            formsSize += size;
          } else if (file.includes('dashboard')) {
            dashboardSize += size;
          } else if (file.includes('webpack') || file.includes('commons')) {
            vendorSize += size; // Categorize common chunks as vendor
          }
        }

        bundleSummary = {
          main: mainSize,
          vendor: vendorSize,
          forms: formsSize,
          dashboard: dashboardSize,
          total: totalSize
        };

        // Validate against targets
        if (mainSize > BUNDLE_TARGETS.main) {
          violations.push(`Main bundle size (${Math.round(mainSize / 1024)}KB) exceeds target (${Math.round(BUNDLE_TARGETS.main / 1024)}KB)`);
        }

        if (vendorSize > BUNDLE_TARGETS.vendor) {
          violations.push(`Vendor bundle size (${Math.round(vendorSize / 1024)}KB) exceeds target (${Math.round(BUNDLE_TARGETS.vendor / 1024)}KB)`);
        }

        if (formsSize > BUNDLE_TARGETS.forms && formsSize > 0) {
          violations.push(`Forms bundle size (${Math.round(formsSize / 1024)}KB) exceeds target (${Math.round(BUNDLE_TARGETS.forms / 1024)}KB)`);
        }

        if (dashboardSize > BUNDLE_TARGETS.dashboard && dashboardSize > 0) {
          violations.push(`Dashboard bundle size (${Math.round(dashboardSize / 1024)}KB) exceeds target (${Math.round(BUNDLE_TARGETS.dashboard / 1024)}KB)`);
        }

        if (totalSize > BUNDLE_TARGETS.total) {
          violations.push(`Total bundle size (${Math.round(totalSize / 1024)}KB) exceeds target (${Math.round(BUNDLE_TARGETS.total / 1024)}KB)`);
        }

        // Warnings for chunks approaching limits
        const warningThreshold = 0.8; // 80% of limit
        
        if (mainSize > BUNDLE_TARGETS.main * warningThreshold && mainSize <= BUNDLE_TARGETS.main) {
          warnings.push(`Main bundle approaching limit: ${Math.round(mainSize / 1024)}KB / ${Math.round(BUNDLE_TARGETS.main / 1024)}KB`);
        }

        if (vendorSize > BUNDLE_TARGETS.vendor * warningThreshold && vendorSize <= BUNDLE_TARGETS.vendor) {
          warnings.push(`Vendor bundle approaching limit: ${Math.round(vendorSize / 1024)}KB / ${Math.round(BUNDLE_TARGETS.vendor / 1024)}KB`);
        }

      } else {
        violations.push('Static chunks directory not found in Next.js build output');
      }

    } catch (error) {
      violations.push(`Error validating bundle sizes: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      summary: bundleSummary
    };
  }

  async validatePerformanceConfiguration(): Promise<{
    passed: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if performance monitoring service exists
      const performanceMonitorPath = path.join(process.cwd(), 'src', 'lib', 'monitoring', 'performance-monitor.ts');
      const performanceMonitorExists = await fs.access(performanceMonitorPath).then(() => true).catch(() => false);
      
      if (!performanceMonitorExists) {
        violations.push('Performance monitor service not found');
      } else {
        const content = await fs.readFile(performanceMonitorPath, 'utf-8');
        
        // Check if Core Web Vitals are configured
        const hasLCP = content.includes('onLCP');
        const hasFID = content.includes('onFID');
        const hasCLS = content.includes('onCLS');
        
        if (!hasLCP || !hasFID || !hasCLS) {
          violations.push('Core Web Vitals monitoring not properly configured');
        }
        
        // Check if performance targets are defined
        const hasTargets = content.includes('PERFORMANCE_TARGETS');
        if (!hasTargets) {
          warnings.push('Performance targets not found in monitoring service');
        }
      }

      // Check if API endpoints exist
      const apiEndpoints = [
        'src/app/api/analytics/performance/route.ts',
        'src/app/api/analytics/performance/session/route.ts',
        'src/app/api/alerts/performance/route.ts'
      ];

      for (const endpoint of apiEndpoints) {
        const endpointPath = path.join(process.cwd(), endpoint);
        const exists = await fs.access(endpointPath).then(() => true).catch(() => false);
        if (!exists) {
          violations.push(`Performance API endpoint missing: ${endpoint}`);
        }
      }

      // Check Lighthouse CI configuration
      const lighthouseConfigPath = path.join(process.cwd(), 'lighthouserc.js');
      const lighthouseConfigExists = await fs.access(lighthouseConfigPath).then(() => true).catch(() => false);
      
      if (!lighthouseConfigExists) {
        violations.push('Lighthouse CI configuration not found');
      }

      // Check Next.js configuration for performance budgets
      const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
      const nextConfigExists = await fs.access(nextConfigPath).then(() => true).catch(() => false);
      
      if (!nextConfigExists) {
        violations.push('Next.js configuration not found');
      } else {
        const content = await fs.readFile(nextConfigPath, 'utf-8');
        
        const hasPerformanceBudgets = content.includes('performance') && content.includes('maxAssetSize');
        if (!hasPerformanceBudgets) {
          violations.push('Performance budgets not configured in Next.js');
        }
        
        const hasBundleAnalyzer = content.includes('BundleAnalyzerPlugin') || content.includes('@next/bundle-analyzer');
        if (!hasBundleAnalyzer) {
          warnings.push('Bundle analyzer not configured');
        }
      }

    } catch (error) {
      violations.push(`Error validating performance configuration: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }

  async run(): Promise<ValidationResult> {
    console.log('🚀 WS-145: Performance Validation Starting...\n');

    const bundleValidation = await this.validateBundleSizes();
    const configValidation = await this.validatePerformanceConfiguration();

    const allViolations = [...bundleValidation.violations, ...configValidation.violations];
    const allWarnings = [...bundleValidation.warnings, ...configValidation.warnings];

    const result: ValidationResult = {
      passed: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
      summary: {
        bundleSize: bundleValidation.summary,
        compliance: {
          bundleTargetsMet: bundleValidation.passed,
          performanceTargetsConfigured: configValidation.passed
        }
      }
    };

    // Print results
    console.log('📊 Bundle Size Analysis:');
    console.log(`  Main Bundle: ${Math.round(result.summary.bundleSize.main / 1024)}KB (limit: ${Math.round(BUNDLE_TARGETS.main / 1024)}KB)`);
    console.log(`  Vendor Bundle: ${Math.round(result.summary.bundleSize.vendor / 1024)}KB (limit: ${Math.round(BUNDLE_TARGETS.vendor / 1024)}KB)`);
    console.log(`  Total Bundle: ${Math.round(result.summary.bundleSize.total / 1024)}KB (limit: ${Math.round(BUNDLE_TARGETS.total / 1024)}KB)`);
    console.log('');

    if (allWarnings.length > 0) {
      console.log('⚠️  Warnings:');
      allWarnings.forEach(warning => console.log(`  - ${warning}`));
      console.log('');
    }

    if (allViolations.length > 0) {
      console.log('❌ Violations:');
      allViolations.forEach(violation => console.log(`  - ${violation}`));
      console.log('');
      console.log('Performance validation FAILED. Please address the violations above.');
      process.exit(1);
    } else {
      console.log('✅ Performance validation PASSED!');
      console.log('All bundle sizes are within targets and configuration is correct.');
    }

    return result;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.run().catch((error) => {
    console.error('Performance validation failed:', error);
    process.exit(1);
  });
}

export { PerformanceValidator };