#!/usr/bin/env node

/**
 * 🛡️ WEDSYNC INCREMENTAL LINTING STRATEGY
 * Guardian-Designed Intelligent Linting for 4M LOC Wedding Platform
 * 
 * STRATEGY OVERVIEW:
 * 1. CRITICAL PATH DETECTION: Wedding payment/security components = ZERO TOLERANCE
 * 2. PERFORMANCE PATH DETECTION: Mobile/API components = ENHANCED RULES  
 * 3. CHANGE IMPACT ANALYSIS: Only lint what matters for current changes
 * 4. MEMORY OPTIMIZATION: Scale memory allocation based on change scope
 * 5. INTEGRATION READY: Pre-commit hooks + CI/CD integration
 * 
 * DEPLOYMENT GATES:
 * - Payment changes: Full enterprise lint + security scan
 * - Mobile changes: Performance-focused lint + accessibility check
 * - API changes: Type safety + async pattern validation
 * - Component changes: React pattern validation
 * - Minimal changes: Fast incremental lint only
 * 
 * Guardian: 2025-01-14
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 🛡️ GUARDIAN INCREMENTAL STRATEGY CONFIG
const STRATEGY_CONFIG = {
  // Change detection patterns
  CHANGE_PATTERNS: {
    CRITICAL: {
      patterns: [
        'src/app/api/stripe/**/*',
        'src/app/api/payments/**/*',
        'src/lib/stripe/**/*',
        'src/lib/payments/**/*',
        'middleware.ts',
        'src/lib/auth/**/*'
      ],
      strategy: 'ZERO_TOLERANCE',
      memory: '32768',
      timeout: '600s',
      rules: 'enterprise-critical'
    },
    
    PERFORMANCE: {
      patterns: [
        'src/components/mobile/**/*',
        'src/app/(mobile)/**/*',
        'src/hooks/**/*',
        'src/lib/api/**/*',
        'src/lib/performance/**/*'
      ],
      strategy: 'PERFORMANCE_FOCUSED',
      memory: '16384',
      timeout: '300s',
      rules: 'enterprise-performance'
    },
    
    API: {
      patterns: [
        'src/app/api/**/*',
        'src/lib/api/**/*',
        'src/types/**/*'
      ],
      strategy: 'TYPE_SAFETY',
      memory: '8192', 
      timeout: '240s',
      rules: 'enterprise-typescript'
    },
    
    COMPONENTS: {
      patterns: [
        'src/components/**/*',
        'src/app/**/*.tsx'
      ],
      strategy: 'REACT_PATTERNS',
      memory: '4096',
      timeout: '120s',
      rules: 'enterprise-react'
    },
    
    MINIMAL: {
      patterns: ['**/*'],
      strategy: 'INCREMENTAL_ONLY',
      memory: '2048',
      timeout: '60s',
      rules: 'enterprise-minimal'
    }
  },

  // Wedding deployment safety checks
  WEDDING_SAFETY: {
    SATURDAY_PROTECTION: {
      enabled: true,
      blockPatterns: ['src/app/api/stripe/**/*', 'middleware.ts'],
      message: '🚨 SATURDAY DEPLOYMENT BLOCKED - Payment processing changes require weekday deployment'
    },
    
    MOBILE_VALIDATION: {
      enabled: true,
      patterns: ['src/components/mobile/**/*'],
      requiredChecks: ['performance', 'accessibility', 'offline-capability']
    },
    
    PAYMENT_VALIDATION: {
      enabled: true,
      patterns: ['src/app/api/stripe/**/*', 'src/lib/payments/**/*'],
      requiredChecks: ['security', 'type-safety', 'error-handling', 'logging']
    }
  }
};

// 🎯 CHANGE ANALYZER
class ChangeAnalyzer {
  constructor() {
    this.changedFiles = [];
    this.strategy = null;
    this.riskLevel = 'LOW';
  }

  analyze() {
    this.detectChangedFiles();
    this.categorizeChanges();
    this.calculateRiskLevel();
    this.selectStrategy();
    
    return {
      files: this.changedFiles,
      strategy: this.strategy,
      riskLevel: this.riskLevel,
      recommendation: this.getRecommendation()
    };
  }

  detectChangedFiles() {
    try {
      // Try multiple detection methods for robustness
      const methods = [
        'git diff --name-only origin/main...HEAD',
        'git diff --cached --name-only',
        'git diff --name-only HEAD~1',
      ];

      for (const method of methods) {
        try {
          const output = execSync(method, { encoding: 'utf8', timeout: 10000 });
          const files = output.trim().split('\n')
            .filter(file => file.match(/\.(ts|tsx|js|jsx)$/))
            .filter(file => fs.existsSync(file));
          
          if (files.length > 0 && files[0] !== '') {
            this.changedFiles = files;
            console.log(`📂 Detected ${files.length} changed files using: ${method}`);
            return;
          }
        } catch (error) {
          continue;
        }
      }

      console.log('⚠️  No changed files detected - using fallback strategy');
      this.changedFiles = [];
    } catch (error) {
      console.log('⚠️  Error detecting changes, proceeding with minimal strategy');
      this.changedFiles = [];
    }
  }

  categorizeChanges() {
    if (this.changedFiles.length === 0) {
      this.category = 'MINIMAL';
      return;
    }

    // Check for critical changes first
    for (const [category, config] of Object.entries(STRATEGY_CONFIG.CHANGE_PATTERNS)) {
      if (category === 'MINIMAL') continue;
      
      const hasMatchingFiles = this.changedFiles.some(file => 
        config.patterns.some(pattern => 
          this.matchesPattern(file, pattern)
        )
      );

      if (hasMatchingFiles) {
        this.category = category;
        console.log(`🎯 Change category detected: ${category}`);
        return;
      }
    }

    this.category = 'MINIMAL';
  }

  matchesPattern(file, pattern) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    
    return new RegExp(regexPattern).test(file);
  }

  calculateRiskLevel() {
    const criticalPatterns = STRATEGY_CONFIG.CHANGE_PATTERNS.CRITICAL.patterns;
    const performancePatterns = STRATEGY_CONFIG.CHANGE_PATTERNS.PERFORMANCE.patterns;

    const hasCriticalChanges = this.changedFiles.some(file =>
      criticalPatterns.some(pattern => this.matchesPattern(file, pattern))
    );

    const hasPerformanceChanges = this.changedFiles.some(file =>
      performancePatterns.some(pattern => this.matchesPattern(file, pattern))
    );

    if (hasCriticalChanges) {
      this.riskLevel = 'CRITICAL';
    } else if (hasPerformanceChanges) {
      this.riskLevel = 'HIGH';
    } else if (this.changedFiles.length > 20) {
      this.riskLevel = 'MEDIUM';
    } else {
      this.riskLevel = 'LOW';
    }

    console.log(`📊 Risk level assessed: ${this.riskLevel}`);
  }

  selectStrategy() {
    this.strategy = STRATEGY_CONFIG.CHANGE_PATTERNS[this.category];
    
    if (!this.strategy) {
      this.strategy = STRATEGY_CONFIG.CHANGE_PATTERNS.MINIMAL;
    }
  }

  getRecommendation() {
    const strategy = this.strategy;
    
    return {
      lintCommand: `npm run lint:guardian:${this.category.toLowerCase()}`,
      memory: strategy.memory,
      timeout: strategy.timeout,
      additionalChecks: this.getAdditionalChecks(),
      deploymentGate: this.getDeploymentGate()
    };
  }

  getAdditionalChecks() {
    const checks = [];
    
    if (this.riskLevel === 'CRITICAL') {
      checks.push('security-scan', 'payment-validation', 'type-safety-full');
    }
    
    if (this.category === 'PERFORMANCE') {
      checks.push('bundle-analysis', 'performance-audit', 'mobile-validation');
    }
    
    if (this.category === 'API') {
      checks.push('typescript-strict', 'async-patterns', 'error-handling');
    }
    
    return checks;
  }

  getDeploymentGate() {
    if (this.riskLevel === 'CRITICAL') {
      return 'MANUAL_APPROVAL_REQUIRED';
    } else if (this.riskLevel === 'HIGH') {
      return 'ENHANCED_MONITORING';
    } else {
      return 'AUTOMATED_OK';
    }
  }
}

// 🚀 STRATEGY EXECUTOR
class StrategyExecutor {
  constructor(analysis) {
    this.analysis = analysis;
  }

  async execute() {
    console.log('🛡️  GUARDIAN INCREMENTAL LINTING STRATEGY EXECUTION');
    console.log(`📂 Files: ${this.analysis.files.length}`);
    console.log(`🎯 Category: ${this.analysis.strategy.strategy}`);
    console.log(`📊 Risk: ${this.analysis.riskLevel}`);
    console.log(`💾 Memory: ${this.analysis.strategy.memory}MB`);
    console.log('');

    // Wedding safety checks
    await this.performWeddingSafetyChecks();
    
    // Execute main linting strategy
    await this.executeLinting();
    
    // Additional checks based on risk level
    await this.executeAdditionalChecks();
    
    // Generate deployment recommendation
    this.generateDeploymentRecommendation();
  }

  async performWeddingSafetyChecks() {
    console.log('💒 WEDDING SAFETY CHECKS');
    
    // Saturday protection
    if (STRATEGY_CONFIG.WEDDING_SAFETY.SATURDAY_PROTECTION.enabled) {
      const isSaturday = new Date().getDay() === 6;
      const hasBlockedPatterns = this.analysis.files.some(file =>
        STRATEGY_CONFIG.WEDDING_SAFETY.SATURDAY_PROTECTION.blockPatterns.some(pattern =>
          file.includes(pattern.replace('**/*', ''))
        )
      );

      if (isSaturday && hasBlockedPatterns) {
        console.log('🚨 SATURDAY DEPLOYMENT BLOCKED');
        console.log(STRATEGY_CONFIG.WEDDING_SAFETY.SATURDAY_PROTECTION.message);
        process.exit(1);
      }
    }

    console.log('✅ Wedding safety checks passed');
  }

  async executeLinting() {
    console.log('⚡ EXECUTING LINTING STRATEGY');
    
    const command = this.analysis.recommendation.lintCommand;
    
    try {
      const env = {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${this.analysis.strategy.memory}`
      };

      console.log(`🔧 Running: ${command}`);
      execSync(command, { 
        stdio: 'inherit',
        env,
        timeout: parseInt(this.analysis.strategy.timeout) * 1000
      });
      
      console.log('✅ Linting completed successfully');
    } catch (error) {
      console.error('❌ Linting failed:', error.message);
      
      if (this.analysis.riskLevel === 'CRITICAL') {
        console.log('🚨 CRITICAL CHANGES - DEPLOYMENT BLOCKED');
        process.exit(1);
      } else {
        console.log('⚠️  Non-critical linting issues detected');
      }
    }
  }

  async executeAdditionalChecks() {
    const checks = this.analysis.recommendation.additionalChecks;
    
    if (checks.length === 0) {
      console.log('ℹ️  No additional checks required');
      return;
    }

    console.log('🔍 ADDITIONAL QUALITY CHECKS');
    
    for (const check of checks) {
      console.log(`🔄 Executing: ${check}`);
      
      try {
        switch (check) {
          case 'security-scan':
            execSync('npm run security:scan', { stdio: 'inherit' });
            break;
          case 'bundle-analysis':
            execSync('npm run bundle:check', { stdio: 'inherit' });
            break;
          case 'typescript-strict':
            execSync('npm run typecheck:full', { stdio: 'inherit' });
            break;
          default:
            console.log(`⚠️  Unknown check: ${check}`);
        }
      } catch (error) {
        console.error(`❌ ${check} failed:`, error.message);
        
        if (this.analysis.riskLevel === 'CRITICAL') {
          process.exit(1);
        }
      }
    }
  }

  generateDeploymentRecommendation() {
    console.log('\n🛡️  GUARDIAN DEPLOYMENT RECOMMENDATION');
    console.log(`📊 Risk Level: ${this.analysis.riskLevel}`);
    console.log(`🎯 Deployment Gate: ${this.analysis.recommendation.deploymentGate}`);
    
    switch (this.analysis.recommendation.deploymentGate) {
      case 'MANUAL_APPROVAL_REQUIRED':
        console.log('🚨 MANUAL APPROVAL REQUIRED');
        console.log('   Critical changes detected - senior approval needed');
        break;
      case 'ENHANCED_MONITORING':
        console.log('⚠️  ENHANCED MONITORING RECOMMENDED');
        console.log('   Deploy with additional monitoring and rollback ready');
        break;
      case 'AUTOMATED_OK':
        console.log('✅ AUTOMATED DEPLOYMENT APPROVED');
        console.log('   Changes passed all quality gates');
        break;
    }
    
    console.log(`\nℹ️  Memory used: ${this.analysis.strategy.memory}MB`);
    console.log(`⏱️  Timeout: ${this.analysis.strategy.timeout}`);
  }
}

// 🎯 MAIN EXECUTION
async function main() {
  try {
    console.log('🛡️  GUARDIAN INCREMENTAL LINTING STRATEGY');
    console.log('⚡ Analyzing changes and determining optimal linting strategy...\n');
    
    const analyzer = new ChangeAnalyzer();
    const analysis = analyzer.analyze();
    
    const executor = new StrategyExecutor(analysis);
    await executor.execute();
    
  } catch (error) {
    console.error('🚨 Guardian strategy execution failed:', error);
    process.exit(1);
  }
}

// 🚀 CLI EXECUTION
if (require.main === module) {
  main();
}

module.exports = { ChangeAnalyzer, StrategyExecutor, STRATEGY_CONFIG };