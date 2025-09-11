#!/usr/bin/env npx tsx
/**
 * WS-194 Deployment Validation Script
 * Pre-deployment health checks and wedding safety validation
 * Team B - Backend/API Focus
 */

import { validateDeployment, generateValidationReport } from '../src/lib/environment/deployment-validator';
import { runComplianceAssessment, generateComplianceReport } from '../src/lib/environment/compliance-checker';
import { validateWeddingEnvironment, generateWeddingValidationReport } from '../src/lib/environment/config-validator';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface ValidationOptions {
  environment: string;
  outputFormat: 'console' | 'json' | 'report' | 'all';
  outputFile?: string;
  skipCompliance: boolean;
  skipWeddingChecks: boolean;
  failOnWarnings: boolean;
  verbose: boolean;
}

class DeploymentValidationScript {
  private options: ValidationOptions;
  private results: any = {};

  constructor(options: ValidationOptions) {
    this.options = options;
  }

  /**
   * Main validation execution
   */
  async execute(): Promise<void> {
    try {
      console.log('🚀 WedSync Deployment Validation');
      console.log('================================');
      console.log(`Environment: ${this.options.environment}`);
      console.log(`Output Format: ${this.options.outputFormat}`);
      console.log(`Skip Compliance: ${this.options.skipCompliance}`);
      console.log(`Skip Wedding Checks: ${this.options.skipWeddingChecks}`);
      console.log('');

      // Environment configuration validation
      console.log('⚙️  Validating environment configuration...');
      const envResult = await this.validateEnvironmentConfig();
      this.results.environment = envResult;

      // Deployment health checks
      console.log('🏥 Running deployment health checks...');
      const deploymentResult = await this.validateDeploymentHealth();
      this.results.deployment = deploymentResult;

      // Compliance assessment
      if (!this.options.skipCompliance) {
        console.log('📋 Running compliance assessment...');
        const complianceResult = await this.validateCompliance();
        this.results.compliance = complianceResult;
      }

      // Wedding-specific checks
      if (!this.options.skipWeddingChecks) {
        console.log('🏰 Running wedding-specific checks...');
        await this.validateWeddingSpecificRequirements();
      }

      // Generate overall assessment
      const assessment = this.generateOverallAssessment();
      this.results.overall = assessment;

      // Output results
      await this.outputResults();

      // Exit with appropriate code
      this.exitWithStatus();

    } catch (error) {
      console.error('\n❌ Deployment validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironmentConfig(): Promise<any> {
    try {
      const result = await validateWeddingEnvironment();
      
      if (this.options.verbose) {
        console.log(`   Configuration Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
        console.log(`   Saturday Protection: ${result.saturdayProtection ? '✅ Active' : '❌ Disabled'}`);
        console.log(`   Peak Season Ready: ${result.peakSeasonReady ? '✅ Ready' : '⚠️ Not Ready'}`);
        console.log(`   Errors: ${result.errors.length}`);
        console.log(`   Warnings: ${result.warnings.length}`);
      }

      return {
        isValid: result.isValid,
        saturdayProtection: result.saturdayProtection,
        peakSeasonReady: result.peakSeasonReady,
        weddingCompliance: result.weddingCompliance,
        errors: result.errors.length,
        warnings: result.warnings.length,
        details: result,
        report: generateWeddingValidationReport(result)
      };

    } catch (error) {
      console.error('   ❌ Environment validation failed');
      throw error;
    }
  }

  /**
   * Validate deployment health
   */
  private async validateDeploymentHealth(): Promise<any> {
    try {
      const result = await validateDeployment(this.options.environment);
      
      if (this.options.verbose) {
        console.log(`   Overall Status: ${this.getStatusEmoji(result.overall)} ${result.overall.toUpperCase()}`);
        console.log(`   Score: ${result.score}/100`);
        console.log(`   Critical Issues: ${result.criticalIssues}`);
        console.log(`   Warnings: ${result.warnings}`);
        console.log(`   Wedding Compatible: ${result.weddingDayCompatible ? '✅ Yes' : '❌ No'}`);
        console.log(`   Deployment Blocked: ${result.deploymentBlocked ? '🚫 Yes' : '✅ No'}`);
      }

      return {
        overall: result.overall,
        score: result.score,
        criticalIssues: result.criticalIssues,
        warnings: result.warnings,
        weddingDayCompatible: result.weddingDayCompatible,
        peakSeasonReady: result.peakSeasonReady,
        deploymentBlocked: result.deploymentBlocked,
        blockingReasons: result.blockingReasons,
        checksByType: this.groupChecksByType(result.checks),
        details: result,
        report: generateValidationReport(result)
      };

    } catch (error) {
      console.error('   ❌ Deployment health check failed');
      throw error;
    }
  }

  /**
   * Validate compliance
   */
  private async validateCompliance(): Promise<any> {
    try {
      const result = await runComplianceAssessment(this.options.environment);
      
      if (this.options.verbose) {
        console.log(`   Overall Score: ${result.overall.score}/100`);
        console.log(`   Status: ${this.getStatusEmoji(result.overall.status)} ${result.overall.status.toUpperCase()}`);
        console.log(`   Critical Issues: ${result.overall.criticalIssues}`);
        console.log(`   Wedding Data Protection: ${result.weddingDataProtectionScore}/100`);
        console.log(`   Payment Security: ${result.paymentSecurityScore}/100`);
      }

      return {
        overall: result.overall,
        weddingDataProtectionScore: result.weddingDataProtectionScore,
        paymentSecurityScore: result.paymentSecurityScore,
        byFramework: result.byFramework,
        details: result,
        report: generateComplianceReport(result)
      };

    } catch (error) {
      console.error('   ❌ Compliance assessment failed');
      throw error;
    }
  }

  /**
   * Validate wedding-specific requirements
   */
  private async validateWeddingSpecificRequirements(): Promise<void> {
    try {
      const today = new Date();
      const isSaturday = today.getDay() === 6;
      const isWeddingSeason = this.isWeddingSeason();
      
      console.log(`   Today is Saturday: ${isSaturday ? '⚠️ YES' : '✅ NO'}`);
      console.log(`   Wedding Season: ${isWeddingSeason ? '🎪 YES' : '✅ NO'}`);

      // Check wedding day restrictions
      if (isSaturday) {
        const saturdayProtection = process.env.SATURDAY_DEPLOYMENT_BLOCK === 'true';
        if (!saturdayProtection) {
          console.log('   🚨 WARNING: Saturday deployment protection is disabled!');
          this.results.weddingWarnings = this.results.weddingWarnings || [];
          this.results.weddingWarnings.push('Saturday deployment protection disabled');
        }
      }

      // Check peak season readiness
      if (isWeddingSeason) {
        const capacityLimit = parseInt(process.env.WEDDING_CAPACITY_LIMIT || '0');
        const hasImageCDN = !!process.env.WEDDING_IMAGE_CDN_URL;
        
        if (capacityLimit < 5000) {
          console.log(`   ⚠️ Capacity limit (${capacityLimit}) may be insufficient for peak season`);
        }
        
        if (!hasImageCDN) {
          console.log('   ⚠️ Wedding image CDN not configured for peak season');
        }
      }

      // Check critical wedding environment variables
      const criticalWeddingVars = [
        'WEDDING_DATA_ENCRYPTION_KEY',
        'GDPR_COMPLIANCE_MODE',
        'DATA_RETENTION_DAYS'
      ];

      for (const varName of criticalWeddingVars) {
        if (!process.env[varName]) {
          console.log(`   ❌ Missing critical wedding variable: ${varName}`);
          this.results.weddingErrors = this.results.weddingErrors || [];
          this.results.weddingErrors.push(`Missing ${varName}`);
        }
      }

      console.log('   ✅ Wedding-specific validation completed');

    } catch (error) {
      console.error('   ❌ Wedding-specific validation failed');
      throw error;
    }
  }

  /**
   * Generate overall assessment
   */
  private generateOverallAssessment(): any {
    const assessment = {
      ready: true,
      score: 100,
      issues: [] as string[],
      warnings: [] as string[],
      blockers: [] as string[]
    };

    // Environment issues
    if (this.results.environment && !this.results.environment.isValid) {
      assessment.ready = false;
      assessment.issues.push('Environment configuration invalid');
      assessment.score -= 30;
    }

    // Deployment issues
    if (this.results.deployment) {
      if (this.results.deployment.overall === 'blocked') {
        assessment.ready = false;
        assessment.blockers.push(...this.results.deployment.blockingReasons);
        assessment.score -= 50;
      } else if (this.results.deployment.overall === 'warning') {
        assessment.warnings.push('Deployment has warnings');
        assessment.score -= 10;
      }
    }

    // Compliance issues
    if (this.results.compliance && !this.options.skipCompliance) {
      if (this.results.compliance.overall.status === 'non_compliant') {
        assessment.ready = false;
        assessment.issues.push('Compliance requirements not met');
        assessment.score -= 40;
      } else if (this.results.compliance.overall.status === 'partial') {
        assessment.warnings.push('Partial compliance issues');
        assessment.score -= 15;
      }
    }

    // Wedding-specific issues
    if (this.results.weddingErrors?.length > 0) {
      assessment.ready = false;
      assessment.issues.push(...this.results.weddingErrors);
      assessment.score -= 20;
    }

    if (this.results.weddingWarnings?.length > 0) {
      assessment.warnings.push(...this.results.weddingWarnings);
      assessment.score -= 5;
    }

    // Fail on warnings if requested
    if (this.options.failOnWarnings && assessment.warnings.length > 0) {
      assessment.ready = false;
      assessment.issues.push('Failing due to warnings (--fail-on-warnings)');
    }

    assessment.score = Math.max(0, assessment.score);

    return assessment;
  }

  /**
   * Output results in requested format
   */
  private async outputResults(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      switch (this.options.outputFormat) {
        case 'console':
          this.outputToConsole();
          break;
        
        case 'json':
          const jsonOutput = {
            timestamp,
            environment: this.options.environment,
            ...this.results
          };
          
          if (this.options.outputFile) {
            writeFileSync(this.options.outputFile, JSON.stringify(jsonOutput, null, 2));
            console.log(`📄 JSON results saved to: ${this.options.outputFile}`);
          } else {
            console.log('\n📋 JSON Results:');
            console.log(JSON.stringify(jsonOutput, null, 2));
          }
          break;
        
        case 'report':
          this.outputReportFormat();
          break;
        
        case 'all':
          this.outputToConsole();
          console.log('\n' + '='.repeat(80));
          this.outputReportFormat();
          break;
      }
    } catch (error) {
      console.error('❌ Failed to output results:', error);
    }
  }

  /**
   * Output results to console
   */
  private outputToConsole(): void {
    const assessment = this.results.overall;
    
    console.log('\n📊 DEPLOYMENT VALIDATION SUMMARY');
    console.log('================================');
    console.log(`Overall Status: ${assessment.ready ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`Overall Score: ${assessment.score}/100`);
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    if (assessment.blockers.length > 0) {
      console.log('\n🚫 BLOCKING ISSUES:');
      for (const blocker of assessment.blockers) {
        console.log(`  • ${blocker}`);
      }
    }

    if (assessment.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      for (const issue of assessment.issues) {
        console.log(`  • ${issue}`);
      }
    }

    if (assessment.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      for (const warning of assessment.warnings) {
        console.log(`  • ${warning}`);
      }
    }

    // Component status
    console.log('\n🔍 COMPONENT STATUS:');
    if (this.results.environment) {
      console.log(`  Environment Config: ${this.results.environment.isValid ? '✅' : '❌'} (${this.results.environment.errors} errors, ${this.results.environment.warnings} warnings)`);
    }
    
    if (this.results.deployment) {
      console.log(`  Deployment Health: ${this.getStatusEmoji(this.results.deployment.overall)} ${this.results.deployment.overall.toUpperCase()} (${this.results.deployment.score}/100)`);
    }
    
    if (this.results.compliance) {
      console.log(`  Compliance: ${this.getStatusEmoji(this.results.compliance.overall.status)} ${this.results.compliance.overall.status.toUpperCase()} (${this.results.compliance.overall.score}/100)`);
    }
  }

  /**
   * Output detailed report format
   */
  private outputReportFormat(): void {
    console.log('\n📋 DETAILED VALIDATION REPORT');
    console.log('============================');
    
    if (this.results.environment?.report) {
      console.log(this.results.environment.report);
    }
    
    if (this.results.deployment?.report) {
      console.log('\n' + this.results.deployment.report);
    }
    
    if (this.results.compliance?.report) {
      console.log('\n' + this.results.compliance.report);
    }
  }

  /**
   * Exit with appropriate status code
   */
  private exitWithStatus(): void {
    const assessment = this.results.overall;
    
    if (assessment.ready) {
      console.log('\n🎉 VALIDATION PASSED - Deployment is ready!');
      process.exit(0);
    } else {
      console.log('\n💥 VALIDATION FAILED - Fix issues before deploying!');
      process.exit(1);
    }
  }

  /**
   * Helper methods
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'ready':
      case 'compliant': 
        return '✅';
      case 'warning':
      case 'partial': 
        return '⚠️';
      case 'blocked':
      case 'non_compliant': 
        return '❌';
      default: 
        return '❓';
    }
  }

  private groupChecksByType(checks: any[]): Record<string, any> {
    return checks.reduce((groups, check) => {
      const type = check.type;
      if (!groups[type]) {
        groups[type] = { passed: 0, failed: 0, total: 0 };
      }
      groups[type].total++;
      if (check.status === 'pass') {
        groups[type].passed++;
      } else {
        groups[type].failed++;
      }
      return groups;
    }, {});
  }

  private isWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    const weddingSeasonMonths = [5, 6, 7, 8, 9, 10]; // May through October
    return weddingSeasonMonths.includes(currentMonth);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: ValidationOptions = {
    environment: getArgValue(args, '--environment') || 'production',
    outputFormat: (getArgValue(args, '--format') as any) || 'console',
    outputFile: getArgValue(args, '--output'),
    skipCompliance: args.includes('--skip-compliance'),
    skipWeddingChecks: args.includes('--skip-wedding-checks'),
    failOnWarnings: args.includes('--fail-on-warnings'),
    verbose: args.includes('--verbose')
  };

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const script = new DeploymentValidationScript(options);
  await script.execute();
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

function showHelp() {
  console.log(`
🚀 WedSync Deployment Validation Tool

Usage: npx tsx scripts/validate-deployment.ts [options]

Options:
  --environment ENV         Target environment (default: production)
  --format FORMAT          Output format: console, json, report, all (default: console)
  --output FILE            Save results to file (for json format)
  --skip-compliance        Skip compliance checks
  --skip-wedding-checks    Skip wedding-specific checks
  --fail-on-warnings       Fail validation on warnings
  --verbose                Verbose output
  --help, -h               Show this help

Examples:
  # Basic validation
  npx tsx scripts/validate-deployment.ts

  # Staging environment validation
  npx tsx scripts/validate-deployment.ts --environment staging

  # Generate JSON report
  npx tsx scripts/validate-deployment.ts --format json --output validation-report.json

  # Comprehensive report
  npx tsx scripts/validate-deployment.ts --format all --verbose

  # Quick check without compliance
  npx tsx scripts/validate-deployment.ts --skip-compliance --skip-wedding-checks

Validation Components:
  🔧 Environment Configuration - Validates all environment variables
  🏥 Deployment Health - Checks system health and connectivity
  📋 Compliance Assessment - GDPR, PCI DSS, SOC2, wedding industry compliance
  🏰 Wedding-Specific Checks - Saturday protection, peak season readiness

Exit Codes:
  0 - Validation passed, deployment ready
  1 - Validation failed, fix issues before deploying
  `);
}

if (require.main === module) {
  main().catch(console.error);
}

export { DeploymentValidationScript };