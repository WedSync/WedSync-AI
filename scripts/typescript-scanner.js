#!/usr/bin/env node
/**
 * WedSync TypeScript Error Scanner
 * Comprehensive TypeScript analysis tool for wedding platform
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class TypeScriptScanner {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalFiles: 0,
      errorFiles: 0,
      totalErrors: 0,
      totalWarnings: 0,
      scanDuration: 0
    };
  }

  async scan() {
    const startTime = Date.now();
    console.log('🔍 Starting WedSync TypeScript Analysis...\n');

    try {
      // Count total TypeScript files
      await this.countFiles();
      
      // Run TypeScript compiler check
      await this.runTypeScriptCheck();
      
      // Run ESLint analysis (if available)
      await this.runESLintCheck();
      
      // Generate comprehensive report
      this.stats.scanDuration = Date.now() - startTime;
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Scanner failed:', error.message);
      process.exit(1);
    }
  }

  async countFiles() {
    return new Promise((resolve, reject) => {
      exec('find src -name "*.ts" -o -name "*.tsx" | wc -l', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        this.stats.totalFiles = parseInt(stdout.trim());
        console.log(`📁 Found ${this.stats.totalFiles} TypeScript files\n`);
        resolve();
      });
    });
  }

  async runTypeScriptCheck() {
    console.log('🔬 Running TypeScript compiler analysis...');
    
    return new Promise((resolve) => {
      const command = 'npx tsc --noEmit --strict --target ES2017 --skipLibCheck --pretty false';
      
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error || stderr) {
          this.parseTypeScriptErrors(stderr || stdout);
        } else {
          console.log('✅ No TypeScript compiler errors found!');
        }
        resolve();
      });
    });
  }

  parseTypeScriptErrors(output) {
    const lines = output.split('\n').filter(line => line.trim());
    let currentFile = '';
    
    lines.forEach(line => {
      // Match file paths with line numbers
      const fileMatch = line.match(/^(.+\.tsx?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)$/);
      
      if (fileMatch) {
        const [, filePath, lineNum, colNum, severity, errorCode, message] = fileMatch;
        
        const error = {
          file: filePath,
          line: parseInt(lineNum),
          column: parseInt(colNum),
          severity,
          code: `TS${errorCode}`,
          message: message.trim(),
          category: this.categorizeError(errorCode, message)
        };
        
        if (severity === 'error') {
          this.errors.push(error);
        } else {
          this.warnings.push(error);
        }
      }
    });

    this.stats.totalErrors = this.errors.length;
    this.stats.totalWarnings = this.warnings.length;
    this.stats.errorFiles = new Set([...this.errors, ...this.warnings].map(e => e.file)).size;
    
    console.log(`📊 TypeScript Analysis: ${this.stats.totalErrors} errors, ${this.stats.totalWarnings} warnings\n`);
  }

  categorizeError(errorCode, message) {
    const categories = {
      'Map/Set Iterations': ['2495', '2569'], // downlevelIteration errors
      'Import Resolution': ['2792', '2307'],
      'Type Safety': ['7006', '7053', '18046', '2349', '2322'],
      'Module System': ['1259', '2614'],
      'Strict Mode': ['2769', '2352'],
      'Configuration': ['5054', '6133']
    };

    for (const [category, codes] of Object.entries(categories)) {
      if (codes.includes(errorCode)) {
        return category;
      }
    }

    return 'Other';
  }

  async runESLintCheck() {
    console.log('🔍 Running ESLint analysis...');
    
    return new Promise((resolve) => {
      exec('npx eslint src --ext .ts,.tsx --format json', (error, stdout) => {
        if (stdout) {
          try {
            const results = JSON.parse(stdout);
            this.parseESLintResults(results);
          } catch (e) {
            console.log('⚠️  ESLint not configured or available');
          }
        }
        resolve();
      });
    });
  }

  parseESLintResults(results) {
    let eslintErrors = 0;
    let eslintWarnings = 0;

    results.forEach(file => {
      eslintErrors += file.errorCount;
      eslintWarnings += file.warningCount;
    });

    console.log(`📊 ESLint Analysis: ${eslintErrors} errors, ${eslintWarnings} warnings\n`);
  }

  async generateReport() {
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings,
      summary: this.generateSummary()
    };

    // Write detailed JSON report
    const jsonReportPath = `typescript-analysis-${Date.now()}.json`;
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Generate human-readable report
    const textReport = this.generateTextReport();
    const textReportPath = `typescript-analysis-${Date.now()}.txt`;
    fs.writeFileSync(textReportPath, textReport);

    console.log('📋 ANALYSIS COMPLETE');
    console.log('='.repeat(50));
    console.log(`📁 Total Files Scanned: ${this.stats.totalFiles}`);
    console.log(`🚨 Files with Issues: ${this.stats.errorFiles}`);
    console.log(`❌ Total Errors: ${this.stats.totalErrors}`);
    console.log(`⚠️  Total Warnings: ${this.stats.totalWarnings}`);
    console.log(`⏱️  Scan Duration: ${this.stats.scanDuration}ms`);
    console.log('='.repeat(50));
    console.log(`📊 Detailed Report: ${jsonReportPath}`);
    console.log(`📝 Text Report: ${textReportPath}`);
    
    if (this.stats.totalErrors > 0) {
      console.log('\n🎯 TOP ERROR CATEGORIES:');
      this.printErrorCategories();
    }

    if (this.errors.length > 0) {
      console.log('\n🔥 CRITICAL ERRORS (First 10):');
      this.errors.slice(0, 10).forEach(error => {
        console.log(`   ${error.file}:${error.line} - ${error.code}: ${error.message}`);
      });
    }
  }

  generateSummary() {
    const errorsByCategory = {};
    this.errors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    });

    return {
      errorsByCategory,
      mostProblematicFiles: this.getMostProblematicFiles(),
      healthScore: this.calculateHealthScore()
    };
  }

  getMostProblematicFiles() {
    const fileErrorCounts = {};
    [...this.errors, ...this.warnings].forEach(issue => {
      fileErrorCounts[issue.file] = (fileErrorCounts[issue.file] || 0) + 1;
    });

    return Object.entries(fileErrorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([file, count]) => ({ file, issues: count }));
  }

  calculateHealthScore() {
    if (this.stats.totalFiles === 0) return 100;
    
    const errorPenalty = (this.stats.totalErrors * 2);
    const warningPenalty = this.stats.totalWarnings;
    const maxPossiblePenalty = this.stats.totalFiles * 10;
    
    const score = Math.max(0, 100 - ((errorPenalty + warningPenalty) / maxPossiblePenalty) * 100);
    return Math.round(score);
  }

  printErrorCategories() {
    const categories = {};
    this.errors.forEach(error => {
      categories[error.category] = (categories[error.category] || 0) + 1;
    });

    Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count} errors`);
      });
  }

  generateTextReport() {
    return `
WedSync TypeScript Analysis Report
Generated: ${new Date().toISOString()}

SUMMARY
=======
Total Files: ${this.stats.totalFiles}
Files with Issues: ${this.stats.errorFiles}
Total Errors: ${this.stats.totalErrors}
Total Warnings: ${this.stats.totalWarnings}
Health Score: ${this.generateSummary().healthScore}/100
Scan Duration: ${this.stats.scanDuration}ms

CRITICAL ERRORS
===============
${this.errors.map(e => `${e.file}:${e.line}:${e.column} - ${e.code}: ${e.message}`).join('\n')}

WARNINGS
========
${this.warnings.map(w => `${w.file}:${w.line}:${w.column} - ${w.code}: ${w.message}`).join('\n')}

MOST PROBLEMATIC FILES
=====================
${this.getMostProblematicFiles().map(f => `${f.file}: ${f.issues} issues`).join('\n')}
`;
  }
}

// Run the scanner
if (require.main === module) {
  const scanner = new TypeScriptScanner();
  scanner.scan().catch(console.error);
}

module.exports = TypeScriptScanner;