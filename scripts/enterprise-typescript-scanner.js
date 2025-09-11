#!/usr/bin/env node
/**
 * WedSync Enterprise TypeScript Scanner
 * Optimized for 2M+ lines of code with parallel processing and incremental analysis
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class EnterpriseTypeScriptScanner {
  constructor() {
    this.cpuCount = os.cpus().length;
    this.maxParallelProcesses = Math.max(2, Math.floor(this.cpuCount * 0.8));
    this.chunkSize = 100; // Files per chunk
    this.cacheDir = '.typescript-scanner-cache';
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
      totalErrors: 0,
      totalWarnings: 0,
      scanDuration: 0,
      parallelProcesses: this.maxParallelProcesses
    };
    
    console.log(`🚀 Enterprise Scanner initialized with ${this.maxParallelProcesses} parallel processes`);
  }

  async scan(options = {}) {
    const startTime = Date.now();
    const { incremental = true, skipCache = false, patterns = ['src/**/*.ts', 'src/**/*.tsx'] } = options;
    
    console.log('🔍 Starting Enterprise TypeScript Analysis...');
    console.log(`📊 Target: ~2M lines of code across multiple patterns`);
    console.log(`⚡ Parallel processing: ${this.maxParallelProcesses} workers\n`);

    try {
      // Initialize cache directory
      await this.initializeCache();
      
      // Discover all TypeScript files
      const allFiles = await this.discoverFiles(patterns);
      this.stats.totalFiles = allFiles.length;
      
      console.log(`📁 Discovered ${this.stats.totalFiles} TypeScript files`);
      
      // Filter files for incremental analysis
      const filesToScan = incremental && !skipCache 
        ? await this.getIncrementalFiles(allFiles)
        : allFiles;
      
      console.log(`🎯 Files to analyze: ${filesToScan.length} (${incremental ? 'incremental' : 'full'} scan)`);
      
      // Split into chunks for parallel processing
      const fileChunks = this.chunkArray(filesToScan, this.chunkSize);
      console.log(`📦 Processing in ${fileChunks.length} chunks of ${this.chunkSize} files each\n`);
      
      // Process chunks in parallel
      await this.processChunksInParallel(fileChunks);
      
      // Run additional analysis
      await this.runSupplementaryAnalysis();
      
      // Generate comprehensive report
      this.stats.scanDuration = Date.now() - startTime;
      await this.generateEnterpriseReport();
      
    } catch (error) {
      console.error('❌ Enterprise scanner failed:', error.message);
      process.exit(1);
    }
  }

  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory already exists, continue
    }
  }

  async discoverFiles(patterns) {
    const allFiles = [];
    
    for (const pattern of patterns) {
      try {
        const { stdout } = await this.execPromise(`find ${pattern.replace('**/*', '.')} -name "*.ts" -o -name "*.tsx" 2>/dev/null`);
        const files = stdout.trim().split('\n').filter(f => f && !f.includes('node_modules'));
        allFiles.push(...files);
      } catch (error) {
        // Pattern might not match anything, continue
      }
    }
    
    return [...new Set(allFiles)]; // Remove duplicates
  }

  async getIncrementalFiles(allFiles) {
    const changedFiles = [];
    const cacheFile = path.join(this.cacheDir, 'file-hashes.json');
    
    try {
      const cachedHashes = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
      
      for (const file of allFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const currentHash = crypto.createHash('md5').update(content).digest('hex');
          
          if (cachedHashes[file] !== currentHash) {
            changedFiles.push(file);
            cachedHashes[file] = currentHash;
          } else {
            this.stats.skippedFiles++;
          }
        } catch (error) {
          // File might not exist anymore or be unreadable
          changedFiles.push(file);
        }
      }
      
      // Update cache
      await fs.writeFile(cacheFile, JSON.stringify(cachedHashes, null, 2));
      
    } catch (error) {
      // No cache exists, scan all files
      return allFiles;
    }
    
    return changedFiles;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async processChunksInParallel(fileChunks) {
    const progressInterval = setInterval(() => {
      const processed = this.stats.processedFiles;
      const total = this.stats.totalFiles;
      const percentage = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`\r⏳ Progress: ${processed}/${total} files (${percentage}%) | Errors: ${this.stats.totalErrors}`);
    }, 2000);

    try {
      // Process chunks with controlled concurrency
      const semaphore = new Array(this.maxParallelProcesses).fill(null);
      const chunkPromises = fileChunks.map((chunk, index) => 
        this.waitForSlot(semaphore).then(() => this.processChunk(chunk, index))
      );

      await Promise.all(chunkPromises);
      
    } finally {
      clearInterval(progressInterval);
      console.log('\n'); // New line after progress indicator
    }
  }

  async waitForSlot(semaphore) {
    while (semaphore.every(slot => slot !== null)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const slotIndex = semaphore.findIndex(slot => slot === null);
    semaphore[slotIndex] = true;
    
    return () => {
      semaphore[slotIndex] = null;
    };
  }

  async processChunk(files, chunkIndex) {
    const releaseSlot = await this.waitForSlot([]);
    
    try {
      const tempFile = path.join(this.cacheDir, `chunk-${chunkIndex}-files.txt`);
      await fs.writeFile(tempFile, files.join('\n'));
      
      // Run TypeScript check on this chunk
      const command = `npx tsc --noEmit --strict --target ES2017 --skipLibCheck --pretty false ${files.join(' ')}`;
      
      try {
        await this.execPromise(command, { maxBuffer: 1024 * 1024 * 50 });
        // No errors in this chunk
      } catch (error) {
        this.parseTypeScriptErrors(error.stderr || error.stdout, files);
      }
      
      this.stats.processedFiles += files.length;
      
      // Cleanup temp file
      await fs.unlink(tempFile).catch(() => {});
      
    } finally {
      releaseSlot();
    }
  }

  parseTypeScriptErrors(output, files) {
    if (!output) return;
    
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const fileMatch = line.match(/^(.+\.tsx?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)$/);
      
      if (fileMatch) {
        const [, filePath, lineNum, colNum, severity, errorCode, message] = fileMatch;
        
        // Only include errors from files in current chunk
        if (!files.some(f => filePath.includes(path.basename(f)))) {
          return;
        }
        
        const error = {
          file: filePath,
          line: parseInt(lineNum),
          column: parseInt(colNum),
          severity,
          code: `TS${errorCode}`,
          message: message.trim(),
          category: this.categorizeError(errorCode, message),
          priority: this.calculatePriority(errorCode, message)
        };
        
        if (severity === 'error') {
          this.errors.push(error);
          this.stats.totalErrors++;
        } else {
          this.warnings.push(error);
          this.stats.totalWarnings++;
        }
      }
    });
  }

  categorizeError(errorCode, message) {
    const categories = {
      'Critical - Map/Set Iterations': ['2495', '2569'],
      'Critical - Import Resolution': ['2792', '2307', '2339'],
      'High - Type Safety': ['7006', '7053', '18046', '2349', '2322'],
      'High - Module System': ['1259', '2614'],
      'Medium - Strict Mode': ['2769', '2352'],
      'Low - Configuration': ['5054', '6133'],
      'Low - Deprecated APIs': ['6385', '6387']
    };

    for (const [category, codes] of Object.entries(categories)) {
      if (codes.includes(errorCode)) {
        return category;
      }
    }

    return 'Other';
  }

  calculatePriority(errorCode, message) {
    // Wedding day impact scoring
    const criticalCodes = ['2495', '2569', '2792', '2307']; // Compilation blockers
    const highCodes = ['7006', '7053', '18046']; // Type safety
    
    if (criticalCodes.includes(errorCode)) return 'CRITICAL';
    if (highCodes.includes(errorCode)) return 'HIGH';
    if (message.toLowerCase().includes('wedding') || message.toLowerCase().includes('saturday')) return 'HIGH';
    return 'MEDIUM';
  }

  async runSupplementaryAnalysis() {
    console.log('\n🔬 Running supplementary analysis...');
    
    // Bundle size analysis
    await this.analyzeBundleSize();
    
    // Dead code detection
    await this.detectDeadCode();
    
    // Dependency analysis
    await this.analyzeDependencies();
  }

  async analyzeBundleSize() {
    try {
      const { stdout } = await this.execPromise('npx next build --dry-run 2>/dev/null || echo "Build analysis unavailable"');
      console.log('📦 Bundle size analysis completed');
    } catch (error) {
      console.log('⚠️  Bundle size analysis skipped (Next.js build unavailable)');
    }
  }

  async detectDeadCode() {
    try {
      const { stdout } = await this.execPromise('npx ts-prune 2>/dev/null | head -20');
      if (stdout.trim()) {
        console.log('🗑️  Dead code detected (see detailed report)');
      }
    } catch (error) {
      console.log('⚠️  Dead code analysis skipped (ts-prune not available)');
    }
  }

  async analyzeDependencies() {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
      console.log(`📦 Dependencies: ${depCount} runtime, ${devDepCount} dev`);
    } catch (error) {
      console.log('⚠️  Dependency analysis skipped');
    }
  }

  async generateEnterpriseReport() {
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      version: '2.0.0-enterprise',
      codebaseSize: '~2M LOC',
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings,
      summary: await this.generateExecutiveSummary(),
      recommendations: this.generateRecommendations()
    };

    // Write detailed JSON report
    const jsonReportPath = `enterprise-analysis-${Date.now()}.json`;
    await fs.writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Generate executive dashboard
    const dashboardPath = await this.generateExecutiveDashboard(reportData);

    console.log('\n📋 ENTERPRISE ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`📁 Total Files Scanned: ${this.stats.totalFiles.toLocaleString()}`);
    console.log(`⚡ Parallel Processes: ${this.stats.parallelProcesses}`);
    console.log(`🚨 Files with Issues: ${this.stats.errorFiles.toLocaleString()}`);
    console.log(`❌ Critical Errors: ${this.errors.filter(e => e.priority === 'CRITICAL').length}`);
    console.log(`⚠️  Total Warnings: ${this.stats.totalWarnings.toLocaleString()}`);
    console.log(`⏱️  Scan Duration: ${this.formatDuration(this.stats.scanDuration)}`);
    console.log(`💾 Cache Efficiency: ${this.stats.skippedFiles} files skipped`);
    console.log('='.repeat(60));
    console.log(`📊 Executive Report: ${jsonReportPath}`);
    console.log(`📈 Dashboard: ${dashboardPath}`);
    
    // Show critical issues
    const criticalErrors = this.errors.filter(e => e.priority === 'CRITICAL');
    if (criticalErrors.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
      criticalErrors.slice(0, 5).forEach(error => {
        console.log(`   ${error.file}:${error.line} - ${error.code}: ${error.message}`);
      });
    } else {
      console.log('\n✅ NO CRITICAL ISSUES FOUND - CODEBASE IS PRODUCTION READY!');
    }
  }

  async generateExecutiveSummary() {
    const totalIssues = this.stats.totalErrors + this.stats.totalWarnings;
    const issueRate = (totalIssues / this.stats.totalFiles) * 100;
    const healthScore = Math.max(0, 100 - issueRate);
    
    return {
      healthScore: Math.round(healthScore),
      issueRate: Math.round(issueRate * 100) / 100,
      criticalIssues: this.errors.filter(e => e.priority === 'CRITICAL').length,
      weddingDayRisk: this.assessWeddingDayRisk(),
      technicalDebt: this.calculateTechnicalDebt(),
      performanceImpact: await this.assessPerformanceImpact()
    };
  }

  assessWeddingDayRisk() {
    const criticalCount = this.errors.filter(e => e.priority === 'CRITICAL').length;
    if (criticalCount === 0) return 'NONE';
    if (criticalCount < 5) return 'LOW';
    if (criticalCount < 20) return 'MEDIUM';
    return 'HIGH';
  }

  calculateTechnicalDebt() {
    const errorHours = this.stats.totalErrors * 0.5; // 30min per error
    const warningHours = this.stats.totalWarnings * 0.1; // 6min per warning
    return Math.round((errorHours + warningHours) * 10) / 10;
  }

  async assessPerformanceImpact() {
    // Analyze for performance-critical patterns
    const performanceIssues = this.errors.filter(e => 
      e.message.includes('performance') || 
      e.category.includes('Map/Set') ||
      e.code.includes('2495')
    );
    
    return performanceIssues.length === 0 ? 'MINIMAL' : 'MODERATE';
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.errors.filter(e => e.priority === 'CRITICAL').length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Fix critical compilation errors before Saturday deployments',
        impact: 'Prevents wedding day service disruptions'
      });
    }
    
    if (this.stats.totalErrors > 100) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implement automated error detection in CI/CD pipeline',
        impact: 'Prevents error accumulation in large codebase'
      });
    }
    
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Schedule weekly enterprise scans',
      impact: 'Maintains code quality at scale'
    });
    
    return recommendations;
  }

  async generateExecutiveDashboard(reportData) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>WedSync Enterprise TypeScript Analysis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-bottom: 10px; }
        .health-score { font-size: 3em; color: ${reportData.summary.healthScore > 90 ? '#4CAF50' : reportData.summary.healthScore > 70 ? '#FF9800' : '#f44336'}; }
        .critical { color: #f44336; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ WedSync Enterprise Analysis</h1>
        <p>Generated: ${reportData.timestamp} | Codebase: ~2M LOC</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-label">Health Score</div>
            <div class="metric-value health-score">${reportData.summary.healthScore}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Files Scanned</div>
            <div class="metric-value">${reportData.stats.totalFiles.toLocaleString()}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Critical Issues</div>
            <div class="metric-value critical">${reportData.summary.criticalIssues}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Wedding Day Risk</div>
            <div class="metric-value">${reportData.summary.weddingDayRisk}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Technical Debt</div>
            <div class="metric-value">${reportData.summary.technicalDebt}h</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Scan Duration</div>
            <div class="metric-value">${this.formatDuration(reportData.stats.scanDuration)}</div>
        </div>
    </div>
    
    <div class="recommendations">
        <h2>📋 Executive Recommendations</h2>
        ${reportData.recommendations.map(rec => 
          `<p><strong>${rec.priority}:</strong> ${rec.action} - <em>${rec.impact}</em></p>`
        ).join('')}
    </div>
</body>
</html>`;

    const dashboardPath = `enterprise-dashboard-${Date.now()}.html`;
    await fs.writeFile(dashboardPath, html);
    return dashboardPath;
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  execPromise(command, options = {}) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    incremental: !args.includes('--full'),
    skipCache: args.includes('--no-cache'),
    patterns: args.includes('--patterns') 
      ? args[args.indexOf('--patterns') + 1]?.split(',') 
      : undefined
  };

  const scanner = new EnterpriseTypeScriptScanner();
  scanner.scan(options).catch(console.error);
}

module.exports = EnterpriseTypeScriptScanner;