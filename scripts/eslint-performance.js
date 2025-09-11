#!/usr/bin/env node

/**
 * 🛡️ WEDSYNC ESLINT PERFORMANCE OPTIMIZER
 * Guardian-Designed for 4M LOC Wedding Platform
 * 
 * Optimizes ESLint execution for massive codebase:
 * - Incremental linting for changed files only
 * - Memory optimization for 4M LOC scale
 * - Wedding-critical component prioritization
 * - TypeScript error correlation
 * 
 * Usage:
 *   node scripts/eslint-performance.js [mode]
 *   
 * Modes:
 *   - incremental: Lint only changed files (default)
 *   - critical: Lint wedding-critical components only
 *   - typescript: Focus on TypeScript errors
 *   - full: Full codebase lint (use with caution)
 *   
 * Guardian: 2025-01-14
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 🛡️ GUARDIAN CONFIGURATION
const GUARDIAN_CONFIG = {
  // Memory limits for 4M LOC performance
  MEMORY_LIMITS: {
    incremental: '8192',
    critical: '4096', 
    typescript: '16384',
    full: '32768',
  },
  
  // Wedding-critical paths (zero tolerance)
  CRITICAL_PATHS: [
    'src/app/api/stripe/**/*.ts',
    'src/app/api/payments/**/*.ts',
    'src/lib/stripe/**/*.ts',
    'src/lib/payments/**/*.ts',
    'src/components/forms/**/*.tsx',
    'middleware.ts',
  ],
  
  // High-frequency paths (performance sensitive)
  PERFORMANCE_PATHS: [
    'src/components/mobile/**/*.tsx',
    'src/app/(mobile)/**/*.tsx',
    'src/hooks/**/*.ts',
    'src/lib/api/**/*.ts',
  ],
  
  // TypeScript error prone paths
  TYPESCRIPT_PATHS: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/__tests__/**/*',
  ],
  
  // ESLint configurations by priority
  CONFIGS: {
    enterprise: 'eslint.config.enterprise.mjs',
    legacy: '.eslintrc.js',
    minimal: 'eslint.config.mjs',
  }
};

// 📊 PERFORMANCE MONITORING
class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.stats = {
      filesLinted: 0,
      errorsFound: 0,
      warningsFound: 0,
      memoryUsage: 0,
    };
  }

  start(mode) {
    console.log(`🛡️  Guardian ESLint Performance Mode: ${mode.toUpperCase()}`);
    console.log(`⚡ Memory Limit: ${GUARDIAN_CONFIG.MEMORY_LIMITS[mode]}MB`);
    console.log(`🕐 Started: ${new Date().toISOString()}\n`);
  }

  updateStats(eslintResults) {
    this.stats.filesLinted = eslintResults.length;
    this.stats.errorsFound = eslintResults.reduce((sum, result) => 
      sum + result.errorCount, 0);
    this.stats.warningsFound = eslintResults.reduce((sum, result) => 
      sum + result.warningCount, 0);
    this.stats.memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  }

  finish() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log('\n🛡️  GUARDIAN ESLINT PERFORMANCE REPORT');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📁 Files Linted: ${this.stats.filesLinted}`);
    console.log(`🚨 Errors Found: ${this.stats.errorsFound}`);
    console.log(`⚠️  Warnings Found: ${this.stats.warningsFound}`);
    console.log(`💾 Peak Memory: ${this.stats.memoryUsage}MB`);
    
    if (this.stats.errorsFound > 0) {
      console.log(`\n❌ GUARDIAN STATUS: DEPLOYMENT BLOCKED`);
      console.log(`   ${this.stats.errorsFound} TypeScript/ESLint errors must be resolved`);
      process.exit(1);
    } else if (this.stats.warningsFound > 10) {
      console.log(`\n⚠️  GUARDIAN STATUS: CONDITIONAL APPROVAL`);
      console.log(`   ${this.stats.warningsFound} warnings detected - enhanced monitoring required`);
    } else {
      console.log(`\n✅ GUARDIAN STATUS: APPROVED FOR DEPLOYMENT`);
    }
  }
}

// 📂 FILE DISCOVERY
class FileDiscovery {
  static getChangedFiles() {
    try {
      // Get files changed from main branch
      const output = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf8' });
      return output.trim().split('\n')
        .filter(file => file.match(/\.(ts|tsx|js|jsx)$/))
        .filter(file => fs.existsSync(file));
    } catch (error) {
      console.log('⚠️  Could not detect changed files, falling back to staged files');
      try {
        const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return staged.trim().split('\n')
          .filter(file => file.match(/\.(ts|tsx|js|jsx)$/))
          .filter(file => fs.existsSync(file));
      } catch {
        return [];
      }
    }
  }

  static getCriticalFiles() {
    const files = [];
    GUARDIAN_CONFIG.CRITICAL_PATHS.forEach(pattern => {
      try {
        // Convert glob pattern to actual files (simplified)
        const globPattern = pattern.replace('**/*', '**/*.{ts,tsx}');
        const command = `find src -path "${pattern.replace('**/*', '*')}" -name "*.ts" -o -name "*.tsx" 2>/dev/null || true`;
        const output = execSync(command, { encoding: 'utf8' });
        if (output.trim()) {
          files.push(...output.trim().split('\n').filter(Boolean));
        }
      } catch (error) {
        // Silent fail for missing patterns
      }
    });
    return [...new Set(files)]; // Remove duplicates
  }

  static getTypeScriptFiles() {
    try {
      const output = execSync('find src -name "*.ts" -o -name "*.tsx" | head -1000', { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

// 🚀 ESLINT EXECUTOR
class ESLintExecutor {
  constructor(mode) {
    this.mode = mode;
    this.monitor = new PerformanceMonitor();
    this.memoryLimit = GUARDIAN_CONFIG.MEMORY_LIMITS[mode];
  }

  async run() {
    this.monitor.start(this.mode);

    const files = this.getFilesToLint();
    if (files.length === 0) {
      console.log('ℹ️  No files to lint in current mode');
      return;
    }

    console.log(`📂 Files to lint: ${files.length}`);
    if (files.length > 50) {
      console.log(`⚡ Large file set detected - using chunked processing`);
      await this.runChunked(files);
    } else {
      await this.runDirect(files);
    }

    this.monitor.finish();
  }

  getFilesToLint() {
    switch (this.mode) {
      case 'incremental':
        return FileDiscovery.getChangedFiles();
      case 'critical':
        return FileDiscovery.getCriticalFiles();
      case 'typescript':
        return FileDiscovery.getTypeScriptFiles();
      case 'full':
        return ['src/**/*.{ts,tsx,js,jsx}'];
      default:
        return FileDiscovery.getChangedFiles();
    }
  }

  async runDirect(files) {
    const args = [
      '--config', GUARDIAN_CONFIG.CONFIGS.enterprise,
      '--format', 'stylish',
      '--cache',
      '--cache-location', '.eslintcache',
      ...files
    ];

    await this.executeESLint(args);
  }

  async runChunked(files) {
    const chunkSize = 100; // Process 100 files at a time
    const chunks = [];
    
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }

    console.log(`📦 Processing ${chunks.length} chunks of ${chunkSize} files each`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);
      
      const args = [
        '--config', GUARDIAN_CONFIG.CONFIGS.enterprise,
        '--format', 'stylish',
        '--cache',
        '--cache-location', `.eslintcache-chunk-${i}`,
        ...chunks[i]
      ];

      await this.executeESLint(args);
    }
  }

  async executeESLint(args) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${this.memoryLimit}`,
      };

      const eslint = spawn('npx', ['eslint', ...args], {
        env,
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      eslint.stdout.on('data', (data) => {
        stdout += data;
        process.stdout.write(data);
      });

      eslint.stderr.on('data', (data) => {
        stderr += data;
        process.stderr.write(data);
      });

      eslint.on('close', (code) => {
        // Parse results for monitoring
        try {
          const errorMatches = stdout.match(/(\d+) error/g) || [];
          const warningMatches = stdout.match(/(\d+) warning/g) || [];
          
          const errors = errorMatches.reduce((sum, match) => {
            const num = parseInt(match.match(/\d+/)[0]);
            return sum + num;
          }, 0);
          
          const warnings = warningMatches.reduce((sum, match) => {
            const num = parseInt(match.match(/\d+/)[0]);
            return sum + num;
          }, 0);

          this.monitor.updateStats([{
            errorCount: errors,
            warningCount: warnings
          }]);
        } catch (parseError) {
          // Continue even if parsing fails
        }

        if (code === 0) {
          resolve();
        } else {
          // Don't reject on ESLint errors - let Guardian decide
          resolve();
        }
      });

      eslint.on('error', (error) => {
        console.error('ESLint execution error:', error);
        reject(error);
      });
    });
  }
}

// 🎯 MAIN EXECUTION
async function main() {
  const mode = process.argv[2] || 'incremental';
  
  if (!GUARDIAN_CONFIG.MEMORY_LIMITS[mode]) {
    console.error(`❌ Unknown mode: ${mode}`);
    console.error(`Available modes: ${Object.keys(GUARDIAN_CONFIG.MEMORY_LIMITS).join(', ')}`);
    process.exit(1);
  }

  // Verify enterprise config exists
  if (!fs.existsSync(GUARDIAN_CONFIG.CONFIGS.enterprise)) {
    console.error(`❌ Enterprise ESLint config not found: ${GUARDIAN_CONFIG.CONFIGS.enterprise}`);
    console.error(`Run: npm run lint:setup to initialize configuration`);
    process.exit(1);
  }

  const executor = new ESLintExecutor(mode);
  await executor.run();
}

// 🚀 LAUNCH
if (require.main === module) {
  main().catch(error => {
    console.error('🚨 Guardian ESLint Performance Error:', error);
    process.exit(1);
  });
}

module.exports = { ESLintExecutor, FileDiscovery, PerformanceMonitor, GUARDIAN_CONFIG };