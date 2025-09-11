#!/usr/bin/env node

/**
 * WedSync Dependency Conflict Detection Tool
 * Analyzes package.json and identifies specific conflicts causing build failures
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${'='.repeat(60)}`, 'blue');
    log(`📋 ${title}`, 'blue');
    log(`${'='.repeat(60)}`, 'blue');
}

class ConflictDetector {
    constructor() {
        this.packageJsonPath = path.join(process.cwd(), 'package.json');
        this.packageLockPath = path.join(process.cwd(), 'package-lock.json');
        this.conflicts = [];
        this.recommendations = [];
        
        // Known problematic versions that cause WedSync to fail
        this.knownConflicts = {
            'eslint': {
                current: '0.6.2',
                required: '^8.0.0',
                impact: 'Critical - prevents Next.js from starting',
                fix: 'npm install eslint@^8.57.0 --save-dev --legacy-peer-deps'
            },
            '@vitest/coverage-v8': {
                current: '0.34.6',
                peerDep: 'vitest@>=0.32.0',
                actualVitest: '0.12.6',
                impact: 'High - blocks npm install',
                fix: 'npm install vitest@^0.34.6 --save-dev --legacy-peer-deps'
            },
            'vitest': {
                current: '0.12.6',
                required: '>=0.32.0',
                impact: 'High - peer dependency mismatch',
                fix: 'Update to compatible version'
            },
            '@sentry/nextjs': {
                version: '^7.11.1',
                status: 'invalid',
                impact: 'Medium - instrumentation fails',
                fix: 'npm uninstall @sentry/nextjs && npm install @sentry/nextjs@^8.0.0'
            }
        };
        
        // Memory-intensive packages that cause build failures
        this.memoryIntensive = [
            '@next/bundle-analyzer',
            'webpack-bundle-analyzer', 
            'typescript',
            '@typescript-eslint/parser',
            'next'
        ];
        
        // Packages with known security vulnerabilities
        this.vulnerablePackages = [
            'request@2.88.2',
            'axios@0.18.1',
            'xmldom@0.1.19',
            'har-validator@5.1.5'
        ];
    }

    async analyze() {
        logSection('WedSync Dependency Conflict Analysis');
        log(`🕐 Started at: ${new Date().toLocaleString()}`, 'cyan');
        
        try {
            await this.loadPackageJson();
            await this.checkKnownConflicts();
            await this.analyzeMemoryUsage();
            await this.checkSecurityVulnerabilities();
            await this.analyzePeerDependencies();
            await this.checkPackageLockConsistency();
            await this.generateReport();
        } catch (error) {
            log(`❌ Analysis failed: ${error.message}`, 'red');
            process.exit(1);
        }
    }

    async loadPackageJson() {
        if (!fs.existsSync(this.packageJsonPath)) {
            throw new Error('package.json not found');
        }
        
        this.packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
        
        const depCount = Object.keys(this.packageJson.dependencies || {}).length;
        const devDepCount = Object.keys(this.packageJson.devDependencies || {}).length;
        
        log(`📦 Total dependencies: ${depCount + devDepCount} (${depCount} prod, ${devDepCount} dev)`, 'cyan');
        
        if (depCount + devDepCount > 300) {
            this.conflicts.push({
                type: 'complexity',
                severity: 'high',
                message: `Excessive dependency count: ${depCount + devDepCount}`,
                impact: 'Increases build instability and memory usage',
                fix: 'Consider dependency reduction or splitting into micro-services'
            });
        }
    }

    async checkKnownConflicts() {
        logSection('Known Conflict Detection');
        
        const allDeps = {
            ...this.packageJson.dependencies,
            ...this.packageJson.devDependencies
        };
        
        for (const [pkg, conflict] of Object.entries(this.knownConflicts)) {
            if (allDeps[pkg]) {
                const installedVersion = allDeps[pkg];
                log(`🔍 Checking ${pkg}: ${installedVersion}`, 'yellow');
                
                if (conflict.current && installedVersion.includes(conflict.current)) {
                    this.conflicts.push({
                        type: 'version_conflict',
                        severity: 'critical',
                        package: pkg,
                        current: installedVersion,
                        required: conflict.required,
                        message: `${pkg} version conflict`,
                        impact: conflict.impact,
                        fix: conflict.fix
                    });
                    
                    log(`❌ CONFLICT: ${pkg} ${installedVersion} (needs ${conflict.required})`, 'red');
                } else {
                    log(`✅ ${pkg} version appears acceptable`, 'green');
                }
            }
        }
    }

    async analyzeMemoryUsage() {
        logSection('Memory Usage Analysis');
        
        // Check package.json scripts for memory allocations
        const scripts = this.packageJson.scripts || {};
        
        for (const [script, command] of Object.entries(scripts)) {
            if (command.includes('max-old-space-size')) {
                const memoryMatch = command.match(/max-old-space-size=(\d+)/);
                if (memoryMatch) {
                    const memoryMB = parseInt(memoryMatch[1]);
                    if (memoryMB > 8192) { // More than 8GB
                        this.conflicts.push({
                            type: 'memory_intensive',
                            severity: 'high',
                            script: script,
                            memory: `${memoryMB}MB`,
                            message: `Script "${script}" requires excessive memory: ${memoryMB}MB`,
                            impact: 'May cause Docker container OOM kills',
                            fix: `Reduce memory allocation or increase Docker memory limits`
                        });
                        
                        log(`⚠️  High memory script: ${script} (${memoryMB}MB)`, 'yellow');
                    }
                }
            }
        }
        
        // Analyze memory-intensive packages
        const allDeps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
        const presentMemoryIntensive = this.memoryIntensive.filter(pkg => allDeps[pkg]);
        
        if (presentMemoryIntensive.length > 0) {
            log(`📊 Memory-intensive packages found: ${presentMemoryIntensive.join(', ')}`, 'cyan');
            this.recommendations.push({
                type: 'optimization',
                message: 'Consider lazy-loading or removing unused memory-intensive packages',
                packages: presentMemoryIntensive
            });
        }
    }

    async checkSecurityVulnerabilities() {
        logSection('Security Vulnerability Check');
        
        const allDeps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
        
        for (const vulnPkg of this.vulnerablePackages) {
            const [pkgName, version] = vulnPkg.split('@');
            if (allDeps[pkgName] && allDeps[pkgName].includes(version)) {
                this.conflicts.push({
                    type: 'security',
                    severity: 'medium',
                    package: pkgName,
                    version: allDeps[pkgName],
                    message: `Vulnerable package: ${vulnPkg}`,
                    impact: 'Security risk and deprecated functionality',
                    fix: `npm update ${pkgName} or find alternative package`
                });
                
                log(`🚨 Security vulnerability: ${pkgName}@${allDeps[pkgName]}`, 'red');
            }
        }
        
        // Run npm audit if available
        try {
            const auditResult = execSync('npm audit --audit-level high --json', { 
                encoding: 'utf8',
                timeout: 30000 
            });
            const audit = JSON.parse(auditResult);
            
            if (audit.metadata && audit.metadata.vulnerabilities) {
                const vulnCount = audit.metadata.vulnerabilities.high + audit.metadata.vulnerabilities.critical;
                if (vulnCount > 0) {
                    log(`🚨 npm audit found ${vulnCount} high/critical vulnerabilities`, 'red');
                    this.recommendations.push({
                        type: 'security',
                        message: 'Run "npm audit fix" to resolve security vulnerabilities',
                        count: vulnCount
                    });
                }
            }
        } catch (error) {
            log(`⚠️  Could not run npm audit: ${error.message.split('\n')[0]}`, 'yellow');
        }
    }

    async analyzePeerDependencies() {
        logSection('Peer Dependency Analysis');
        
        try {
            const result = execSync('npm ls --depth=0 --json', { 
                encoding: 'utf8',
                timeout: 30000 
            });
            const tree = JSON.parse(result);
            
            if (tree.problems && tree.problems.length > 0) {
                log(`⚠️  Found ${tree.problems.length} dependency problems:`, 'yellow');
                
                tree.problems.forEach(problem => {
                    log(`   • ${problem}`, 'yellow');
                    
                    if (problem.includes('peer dep missing') || problem.includes('UNMET PEER DEPENDENCY')) {
                        this.conflicts.push({
                            type: 'peer_dependency',
                            severity: 'medium',
                            message: problem,
                            impact: 'May cause runtime errors or build failures',
                            fix: 'Install missing peer dependencies or use --legacy-peer-deps'
                        });
                    }
                });
            } else {
                log('✅ No peer dependency conflicts detected', 'green');
            }
        } catch (error) {
            log(`⚠️  Could not analyze peer dependencies: ${error.message.split('\n')[0]}`, 'yellow');
        }
    }

    async checkPackageLockConsistency() {
        logSection('Package Lock Consistency');
        
        if (!fs.existsSync(this.packageLockPath)) {
            this.conflicts.push({
                type: 'consistency',
                severity: 'high',
                message: 'package-lock.json is missing',
                impact: 'Inconsistent dependency resolution across environments',
                fix: 'Run "npm install" to generate package-lock.json and commit it'
            });
            
            log('❌ package-lock.json is missing', 'red');
            return;
        }
        
        const packageLock = JSON.parse(fs.readFileSync(this.packageLockPath, 'utf8'));
        
        // Check if package-lock is up to date
        const packageStats = fs.statSync(this.packageJsonPath);
        const lockStats = fs.statSync(this.packageLockPath);
        
        if (packageStats.mtime > lockStats.mtime) {
            this.conflicts.push({
                type: 'consistency',
                severity: 'medium',
                message: 'package-lock.json is older than package.json',
                impact: 'Dependencies may not match intended versions',
                fix: 'Run "npm install" to update package-lock.json'
            });
            
            log('⚠️  package-lock.json is outdated', 'yellow');
        } else {
            log('✅ package-lock.json is up to date', 'green');
        }
    }

    async generateReport() {
        logSection('Analysis Summary & Recommendations');
        
        // Sort conflicts by severity
        const criticalConflicts = this.conflicts.filter(c => c.severity === 'critical');
        const highConflicts = this.conflicts.filter(c => c.severity === 'high');
        const mediumConflicts = this.conflicts.filter(c => c.severity === 'medium');
        
        log(`📊 Analysis Results:`, 'blue');
        log(`   Critical Issues: ${criticalConflicts.length}`, criticalConflicts.length > 0 ? 'red' : 'green');
        log(`   High Priority:   ${highConflicts.length}`, highConflicts.length > 0 ? 'yellow' : 'green');
        log(`   Medium Priority: ${mediumConflicts.length}`, mediumConflicts.length > 0 ? 'yellow' : 'green');
        
        if (criticalConflicts.length > 0) {
            log(`\n🚨 CRITICAL ISSUES (Fix these first):`, 'red');
            criticalConflicts.forEach((conflict, i) => {
                log(`\n${i + 1}. ${conflict.message}`, 'red');
                log(`   Impact: ${conflict.impact}`, 'yellow');
                log(`   Fix: ${conflict.fix}`, 'green');
            });
        }
        
        if (highConflicts.length > 0) {
            log(`\n⚠️  HIGH PRIORITY ISSUES:`, 'yellow');
            highConflicts.forEach((conflict, i) => {
                log(`\n${i + 1}. ${conflict.message}`, 'yellow');
                log(`   Impact: ${conflict.impact}`, 'cyan');
                log(`   Fix: ${conflict.fix}`, 'green');
            });
        }
        
        // Generate quick fix script
        this.generateQuickFixScript();
        
        // Overall health score
        const totalIssues = this.conflicts.length;
        const criticalWeight = criticalConflicts.length * 10;
        const highWeight = highConflicts.length * 5;
        const mediumWeight = mediumConflicts.length * 2;
        const healthScore = Math.max(0, 100 - criticalWeight - highWeight - mediumWeight);
        
        log(`\n🎯 WedSync Health Score: ${healthScore}/100`, healthScore > 80 ? 'green' : healthScore > 50 ? 'yellow' : 'red');
        
        if (healthScore < 70) {
            log(`\n🏥 RECOMMENDED IMMEDIATE ACTIONS:`, 'blue');
            log(`1. Run the generated quick-fix script: ./monitoring/scripts/quick-fix.sh`, 'white');
            log(`2. Use Docker with locked dependencies: docker-compose -f docker-compose.monitor.yml up`, 'white');
            log(`3. Monitor stability with: open http://localhost:8080`, 'white');
        }
        
        // Save detailed report
        const reportPath = `dependency-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            healthScore,
            conflicts: this.conflicts,
            recommendations: this.recommendations,
            packageInfo: {
                dependencies: Object.keys(this.packageJson.dependencies || {}).length,
                devDependencies: Object.keys(this.packageJson.devDependencies || {}).length
            }
        }, null, 2));
        
        log(`\n📄 Detailed report saved: ${reportPath}`, 'cyan');
    }

    generateQuickFixScript() {
        const fixes = this.conflicts
            .filter(c => c.fix && c.severity === 'critical')
            .map(c => c.fix);
        
        if (fixes.length === 0) return;
        
        const scriptPath = './monitoring/scripts/quick-fix.sh';
        const scriptContent = `#!/bin/bash

# Auto-generated WedSync Quick Fix Script
# Generated: ${new Date().toISOString()}

echo "🔧 Applying critical fixes for WedSync..."

set -e

${fixes.map(fix => `echo "Executing: ${fix}"\n${fix}`).join('\n\n')}

echo "✅ Quick fixes applied. Try starting WedSync with:"
echo "   docker-compose -f docker-compose.monitor.yml up"
`;

        fs.writeFileSync(scriptPath, scriptContent);
        fs.chmodSync(scriptPath, '755');
        
        log(`\n🔧 Quick fix script generated: ${scriptPath}`, 'green');
        log(`   Run with: ./monitoring/scripts/quick-fix.sh`, 'white');
    }
}

// Run analysis
const detector = new ConflictDetector();
detector.analyze().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
});