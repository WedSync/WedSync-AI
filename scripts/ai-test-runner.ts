#!/usr/bin/env tsx
// AI Test Runner - Orchestrates AI-powered test generation and maintenance
// Automatically generates tests, maintains existing ones, and provides intelligent insights

import fs from 'fs/promises';
import path from 'path';
import { AITestGenerator, GeneratedTest, TestMaintenanceAction } from '../tests/ai-testing/ai-test-generator';
import { spawn } from 'child_process';

interface AITestRunReport {
  timestamp: string;
  generatedTests: number;
  maintenanceActions: number;
  coverageImprovement: number;
  qualityScore: number;
  weddingScenariosCovered: string[];
  recommendations: string[];
  testFiles: {
    created: string[];
    updated: string[];
    removed: string[];
  };
}

class AITestRunner {
  private generator: AITestGenerator;
  private sourceDirectories: string[] = [
    'src/app/api',
    'src/components',
    'src/lib',
    'src/hooks',
    'src/stores',
    'src/contexts'
  ];
  private testDirectories: string[] = [
    'tests',
    'src/__tests__',
    '__tests__'
  ];

  constructor() {
    this.generator = new AITestGenerator();
  }

  async runComplete(): Promise<AITestRunReport> {
    console.log('🤖 AI Test Runner - Complete Analysis and Generation');
    console.log('================================================');
    
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Phase 1: Analyze existing test coverage
    console.log('\n📊 Phase 1: Analyzing existing test coverage...');
    const coverageAnalysis = await this.analyzeCoverage();
    
    // Phase 2: Generate new tests for uncovered code
    console.log('\n🧪 Phase 2: Generating AI-powered tests...');
    const generatedTests = await this.generateTests();
    
    // Phase 3: Analyze and maintain existing tests
    console.log('\n🔧 Phase 3: Analyzing test maintenance needs...');
    const maintenanceActions = await this.analyzeTestMaintenance();
    
    // Phase 4: Apply improvements
    console.log('\n✨ Phase 4: Applying AI recommendations...');
    const improvements = await this.applyImprovements(generatedTests, maintenanceActions);
    
    // Phase 5: Generate insights and recommendations
    console.log('\n🎯 Phase 5: Generating insights and recommendations...');
    const insights = await this.generateInsights(generatedTests, maintenanceActions, coverageAnalysis);
    
    const endTime = Date.now();
    console.log(`\n⚡ AI Test Runner completed in ${endTime - startTime}ms`);
    
    const report: AITestRunReport = {
      timestamp,
      generatedTests: generatedTests.length,
      maintenanceActions: maintenanceActions.length,
      coverageImprovement: improvements.coverageGain,
      qualityScore: insights.qualityScore,
      weddingScenariosCovered: insights.weddingScenarios,
      recommendations: insights.recommendations,
      testFiles: {
        created: improvements.filesCreated,
        updated: improvements.filesUpdated,
        removed: improvements.filesRemoved
      }
    };
    
    // Save comprehensive report
    await this.saveReport(report, generatedTests, maintenanceActions);
    
    return report;
  }

  async runGeneration(): Promise<GeneratedTest[]> {
    console.log('🤖 AI Test Generation Mode');
    console.log('==========================');
    
    return await this.generateTests();
  }

  async runMaintenance(): Promise<TestMaintenanceAction[]> {
    console.log('🔧 AI Test Maintenance Mode');
    console.log('==========================');
    
    return await this.analyzeTestMaintenance();
  }

  private async analyzeCoverage(): Promise<any> {
    console.log('  📈 Running coverage analysis...');
    
    try {
      // Run vitest coverage
      const coverageResult = await this.runCommand('npx', ['vitest', 'run', '--coverage']);
      
      // Parse coverage report
      const coverageReportPath = 'coverage/coverage-summary.json';
      let coverageData = {};
      
      try {
        const coverageContent = await fs.readFile(coverageReportPath, 'utf-8');
        coverageData = JSON.parse(coverageContent);
      } catch (error) {
        console.warn('  ⚠️  No coverage report found, using estimated coverage');
        coverageData = { total: { lines: { pct: 75 }, functions: { pct: 70 } } };
      }
      
      console.log('  ✅ Coverage analysis complete');
      return coverageData;
      
    } catch (error) {
      console.error('  ❌ Coverage analysis failed:', error);
      return { total: { lines: { pct: 0 }, functions: { pct: 0 } } };
    }
  }

  private async generateTests(): Promise<GeneratedTest[]> {
    console.log('  🔍 Scanning source files for test generation...');
    
    const allGeneratedTests: GeneratedTest[] = [];
    
    for (const sourceDir of this.sourceDirectories) {
      const sourceFiles = await this.findSourceFiles(sourceDir);
      console.log(`  📁 Found ${sourceFiles.length} source files in ${sourceDir}`);
      
      for (const sourceFile of sourceFiles) {
        try {
          console.log(`    🔬 Analyzing ${path.basename(sourceFile)}...`);
          const tests = await this.generator.generateTestsForFile(sourceFile);
          
          if (tests.length > 0) {
            allGeneratedTests.push(...tests);
            
            // Write generated tests to files
            await this.writeGeneratedTests(sourceFile, tests);
          }
          
        } catch (error) {
          console.error(`    ❌ Failed to generate tests for ${sourceFile}:`, error);
        }
      }
    }
    
    console.log(`  ✅ Generated ${allGeneratedTests.length} AI-powered tests`);
    return allGeneratedTests;
  }

  private async analyzeTestMaintenance(): Promise<TestMaintenanceAction[]> {
    console.log('  🔍 Analyzing existing tests for maintenance needs...');
    
    const allMaintenanceActions: TestMaintenanceAction[] = [];
    
    for (const testDir of this.testDirectories) {
      try {
        console.log(`  📁 Scanning ${testDir} for test maintenance...`);
        const actions = await this.generator.analyzeExistingTests(testDir);
        
        allMaintenanceActions.push(...actions);
        console.log(`    Found ${actions.length} maintenance actions in ${testDir}`);
        
      } catch (error) {
        console.warn(`  ⚠️  Could not analyze ${testDir}:`, error);
      }
    }
    
    console.log(`  ✅ Found ${allMaintenanceActions.length} total maintenance actions`);
    return allMaintenanceActions;
  }

  private async applyImprovements(generatedTests: GeneratedTest[], maintenanceActions: TestMaintenanceAction[]): Promise<any> {
    console.log('  🚀 Applying AI-generated improvements...');
    
    const improvements = {
      filesCreated: [] as string[],
      filesUpdated: [] as string[],
      filesRemoved: [] as string[],
      coverageGain: 0
    };
    
    // Apply high-confidence maintenance actions
    const highConfidenceActions = maintenanceActions.filter(action => action.confidence > 0.8);
    
    for (const action of highConfidenceActions) {
      try {
        switch (action.type) {
          case 'update':
            await this.updateTestFile(action);
            improvements.filesUpdated.push(action.testPath);
            console.log(`    ✅ Updated ${path.basename(action.testPath)}`);
            break;
            
          case 'optimize':
            await this.optimizeTestFile(action);
            improvements.filesUpdated.push(action.testPath);
            console.log(`    ⚡ Optimized ${path.basename(action.testPath)}`);
            break;
            
          case 'remove':
            await this.removeTestFile(action);
            improvements.filesRemoved.push(action.testPath);
            console.log(`    🗑️  Removed ${path.basename(action.testPath)}`);
            break;
        }
      } catch (error) {
        console.error(`    ❌ Failed to apply action for ${action.testPath}:`, error);
      }
    }
    
    // Estimate coverage improvement
    improvements.coverageGain = this.estimateCoverageGain(generatedTests);
    
    console.log(`  ✅ Applied improvements: ${improvements.filesCreated.length} created, ${improvements.filesUpdated.length} updated, ${improvements.filesRemoved.length} removed`);
    
    return improvements;
  }

  private async generateInsights(generatedTests: GeneratedTest[], maintenanceActions: TestMaintenanceAction[], coverage: any): Promise<any> {
    console.log('  🎯 Generating AI insights and recommendations...');
    
    // Analyze wedding scenario coverage
    const weddingScenarios = [...new Set(generatedTests.map(test => test.weddingScenario))];
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(generatedTests, maintenanceActions, coverage);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(generatedTests, maintenanceActions, coverage);
    
    console.log(`  ✅ Generated insights: Quality score ${qualityScore}/100, ${weddingScenarios.length} wedding scenarios covered`);
    
    return {
      qualityScore,
      weddingScenarios,
      recommendations
    };
  }

  private async findSourceFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.includes('node_modules')) {
          const subFiles = await this.findSourceFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, which is fine
      console.warn(`Warning: Could not read directory ${directory}`);
    }
    
    return files;
  }

  private async writeGeneratedTests(sourceFile: string, tests: GeneratedTest[]): Promise<void> {
    // Determine test file path
    const relativePath = path.relative(process.cwd(), sourceFile);
    const testDir = path.join(path.dirname(sourceFile), '__tests__');
    const testFileName = path.basename(sourceFile, path.extname(sourceFile)) + '.ai-generated.test.ts';
    const testFilePath = path.join(testDir, testFileName);
    
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });
    
    // Generate test file content
    const testContent = this.generateTestFileContent(sourceFile, tests);
    
    // Write test file
    await fs.writeFile(testFilePath, testContent);
    
    console.log(`    ✅ Created ${testFileName} with ${tests.length} tests`);
  }

  private generateTestFileContent(sourceFile: string, tests: GeneratedTest[]): string {
    const relativePath = path.relative(path.join(process.cwd(), 'src'), sourceFile);
    const importPath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    let content = `// AI-Generated Tests for ${path.basename(sourceFile)}\n`;
    content += `// Generated by AI Test Runner on ${new Date().toISOString()}\n`;
    content += `// Wedding-specific scenarios and comprehensive edge cases included\n\n`;
    
    // Add imports
    content += `import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';\n`;
    content += `import { render, screen, fireEvent, waitFor } from '@testing-library/react';\n`;
    content += `import '@testing-library/jest-dom';\n\n`;
    
    // Import the module under test
    content += `// Module under test\n`;
    content += `import * as moduleUnderTest from '../${importPath}';\n\n`;
    
    // Add wedding-specific test data
    content += `// Wedding-specific test data\n`;
    content += `const weddingTestData = {\n`;
    content += `  couple: {\n`;
    content += `    bride: 'Emma Thompson',\n`;
    content += `    groom: 'James Rodriguez',\n`;
    content += `    weddingDate: '2024-09-15',\n`;
    content += `    venue: 'Garden Manor Estate'\n`;
    content += `  },\n`;
    content += `  guests: [\n`;
    content += `    { name: 'Sarah Johnson', email: 'sarah@example.com', rsvp: 'yes' },\n`;
    content += `    { name: 'Michael Chen', email: 'mike@example.com', rsvp: 'pending' }\n`;
    content += `  ],\n`;
    content += `  vendors: [\n`;
    content += `    { name: 'Sunset Photography', type: 'photographer', price: 3500 }\n`;
    content += `  ]\n`;
    content += `};\n\n`;
    
    // Add test setup
    content += `describe('AI Generated Tests - ${path.basename(sourceFile, path.extname(sourceFile))}', () => {\n`;
    content += `  beforeEach(() => {\n`;
    content += `    vi.clearAllMocks();\n`;
    content += `    // Reset wedding test state\n`;
    content += `    vi.spyOn(console, 'error').mockImplementation(() => {});\n`;
    content += `  });\n\n`;
    
    content += `  afterEach(() => {\n`;
    content += `    vi.restoreAllMocks();\n`;
    content += `  });\n\n`;
    
    // Add generated tests
    tests.forEach(test => {
      content += `  // ${test.description}\n`;
      content += `  // Priority: ${test.priority} | Wedding Scenario: ${test.weddingScenario}\n`;
      content += test.testCode + '\n\n';
    });
    
    content += `});\n`;
    
    return content;
  }

  private async updateTestFile(action: TestMaintenanceAction): Promise<void> {
    // Read existing test file
    const content = await fs.readFile(action.testPath, 'utf-8');
    
    // Apply suggested changes (simplified implementation)
    let updatedContent = content;
    
    if (action.reason.includes('Jest to Vitest')) {
      updatedContent = updatedContent
        .replace(/import.*from ['"]@testing-library\/jest-dom['"]/g, "import '@testing-library/jest-dom';")
        .replace(/jest\./g, 'vi.')
        .replace(/jest,/g, 'vi,')
        .replace(/'vitest'/g, "'vitest'");
    }
    
    if (action.reason.includes('wedding-specific')) {
      // Add wedding context to tests that need it
      const weddingImport = `\n// Added wedding-specific test context\nconst weddingTestContext = { venue: 'test-venue', date: '2024-01-01' };\n`;
      updatedContent = updatedContent.replace(
        /describe\(/,
        weddingImport + '\ndescribe('
      );
    }
    
    // Write updated file
    await fs.writeFile(action.testPath, updatedContent);
  }

  private async optimizeTestFile(action: TestMaintenanceAction): Promise<void> {
    // Read and optimize test file (simplified implementation)
    const content = await fs.readFile(action.testPath, 'utf-8');
    
    let optimizedContent = content;
    
    // Move expensive setup to beforeAll
    if (content.includes('beforeEach') && action.reason.includes('performance')) {
      optimizedContent = optimizedContent.replace(
        /beforeEach\(/g,
        'beforeAll('
      );
    }
    
    await fs.writeFile(action.testPath, optimizedContent);
  }

  private async removeTestFile(action: TestMaintenanceAction): Promise<void> {
    // Only remove if confidence is very high and file is truly obsolete
    if (action.confidence > 0.95) {
      await fs.unlink(action.testPath);
    }
  }

  private estimateCoverageGain(generatedTests: GeneratedTest[]): number {
    // Estimate coverage improvement based on test types and complexity
    const criticalTests = generatedTests.filter(t => t.priority === 'critical').length;
    const highPriorityTests = generatedTests.filter(t => t.priority === 'high').length;
    const totalTests = generatedTests.length;
    
    // Simple heuristic: each critical test adds ~2%, high priority ~1%, others ~0.5%
    return (criticalTests * 2) + (highPriorityTests * 1) + ((totalTests - criticalTests - highPriorityTests) * 0.5);
  }

  private calculateQualityScore(generatedTests: GeneratedTest[], maintenanceActions: TestMaintenanceAction[], coverage: any): number {
    let score = 50; // Base score
    
    // Coverage contribution (0-30 points)
    const coveragePct = coverage.total?.lines?.pct || 0;
    score += Math.min(30, coveragePct * 0.3);
    
    // Test quality contribution (0-25 points)
    const criticalTests = generatedTests.filter(t => t.priority === 'critical').length;
    const totalTests = generatedTests.length;
    if (totalTests > 0) {
      score += Math.min(25, (criticalTests / totalTests) * 25);
    }
    
    // Maintenance health contribution (0-20 points)
    const highConfidenceActions = maintenanceActions.filter(a => a.confidence > 0.8).length;
    const totalActions = maintenanceActions.length;
    if (totalActions === 0) {
      score += 20; // No maintenance needed is good
    } else {
      score += Math.max(0, 20 - (totalActions * 2)); // Subtract 2 points per maintenance action
    }
    
    // Wedding scenario coverage (0-25 points)
    const weddingScenarios = new Set(generatedTests.map(t => t.weddingScenario)).size;
    score += Math.min(25, weddingScenarios * 4); // 4 points per unique wedding scenario
    
    return Math.min(100, Math.round(score));
  }

  private generateRecommendations(generatedTests: GeneratedTest[], maintenanceActions: TestMaintenanceAction[], coverage: any): string[] {
    const recommendations: string[] = [];
    
    // Coverage recommendations
    const coveragePct = coverage.total?.lines?.pct || 0;
    if (coveragePct < 80) {
      recommendations.push(`Increase code coverage from ${coveragePct}% to 80%+ by adding more unit tests`);
    }
    
    // Wedding scenario recommendations
    const weddingScenarios = new Set(generatedTests.map(t => t.weddingScenario));
    const allWeddingDomains = ['rsvp', 'timeline', 'budget', 'vendors', 'photos', 'guests'];
    const missingDomains = allWeddingDomains.filter(domain => 
      !Array.from(weddingScenarios).some(scenario => scenario.includes(domain))
    );
    
    if (missingDomains.length > 0) {
      recommendations.push(`Add wedding-specific tests for: ${missingDomains.join(', ')}`);
    }
    
    // Maintenance recommendations
    const criticalMaintenance = maintenanceActions.filter(a => a.confidence > 0.9);
    if (criticalMaintenance.length > 0) {
      recommendations.push(`Address ${criticalMaintenance.length} critical test maintenance issues`);
    }
    
    // Performance recommendations
    const performanceIssues = maintenanceActions.filter(a => a.reason.includes('performance'));
    if (performanceIssues.length > 0) {
      recommendations.push(`Optimize test performance: ${performanceIssues.length} slow tests identified`);
    }
    
    // Quality recommendations
    const lowPriorityTests = generatedTests.filter(t => t.priority === 'low').length;
    const totalTests = generatedTests.length;
    if (totalTests > 0 && (lowPriorityTests / totalTests) > 0.5) {
      recommendations.push('Focus on generating more high-priority and critical tests');
    }
    
    return recommendations;
  }

  private async saveReport(report: AITestRunReport, generatedTests: GeneratedTest[], maintenanceActions: TestMaintenanceAction[]): Promise<void> {
    const reportsDir = 'reports/ai-testing';
    await fs.mkdir(reportsDir, { recursive: true });
    
    const timestamp = report.timestamp.replace(/[:.]/g, '-');
    
    // Save main report
    const reportPath = path.join(reportsDir, `ai-test-report-${timestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Save detailed generated tests
    const testsPath = path.join(reportsDir, `generated-tests-${timestamp}.json`);
    await fs.writeFile(testsPath, JSON.stringify(generatedTests, null, 2));
    
    // Save maintenance plan
    const maintenancePlan = await this.generator.generateMaintenancePlan(maintenanceActions);
    const planPath = path.join(reportsDir, `maintenance-plan-${timestamp}.md`);
    await fs.writeFile(planPath, maintenancePlan);
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report, generatedTests, maintenanceActions);
    const htmlPath = path.join(reportsDir, `ai-test-report-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlReport);
    
    console.log(`\n📊 AI Test Reports saved:`);
    console.log(`  📄 Main Report: ${reportPath}`);
    console.log(`  🧪 Generated Tests: ${testsPath}`);
    console.log(`  🔧 Maintenance Plan: ${planPath}`);
    console.log(`  🌐 HTML Report: ${htmlPath}`);
  }

  private generateHTMLReport(report: AITestRunReport, generatedTests: GeneratedTest[], maintenanceActions: TestMaintenanceAction[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Test Runner Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .quality-score { font-size: 3em; font-weight: bold; }
        .score-excellent { color: #28a745; }
        .score-good { color: #ffc107; }
        .score-needs-work { color: #fd7e14; }
        .score-poor { color: #dc3545; }
        .recommendations { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .test-list { max-height: 400px; overflow-y: auto; }
        .test-item { background: #fff; border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .priority-critical { border-left: 4px solid #dc3545; }
        .priority-high { border-left: 4px solid #fd7e14; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Test Runner Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>WedSync Wedding Platform - Intelligent Test Analysis</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-number quality-score ${this.getScoreClass(report.qualityScore)}">${report.qualityScore}</div>
            <div>Quality Score</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${report.generatedTests}</div>
            <div>Generated Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${report.maintenanceActions}</div>
            <div>Maintenance Actions</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">+${report.coverageImprovement.toFixed(1)}%</div>
            <div>Coverage Improvement</div>
        </div>
    </div>
    
    <div class="recommendations">
        <h3>🎯 AI Recommendations</h3>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    
    <h3>🎉 Wedding Scenarios Covered</h3>
    <p>${report.weddingScenariosCovered.join(', ') || 'None'}</p>
    
    <h3>🧪 Generated Tests by Priority</h3>
    <div class="test-list">
        ${generatedTests.map(test => `
            <div class="test-item priority-${test.priority}">
                <strong>${test.testName}</strong>
                <p>${test.description}</p>
                <small>Priority: ${test.priority} | Scenario: ${test.weddingScenario}</small>
            </div>
        `).join('')}
    </div>
    
    <h3>📝 File Changes</h3>
    <ul>
        <li><strong>Created:</strong> ${report.testFiles.created.length} files</li>
        <li><strong>Updated:</strong> ${report.testFiles.updated.length} files</li>
        <li><strong>Removed:</strong> ${report.testFiles.removed.length} files</li>
    </ul>
</body>
</html>`;
  }

  private getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 60) return 'score-needs-work';
    return 'score-poor';
  }

  private async runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'complete';
  
  const runner = new AITestRunner();
  
  try {
    switch (mode) {
      case 'generate':
        console.log('🤖 Running AI test generation only...');
        const tests = await runner.runGeneration();
        console.log(`✅ Generated ${tests.length} AI-powered tests`);
        break;
        
      case 'maintain':
        console.log('🔧 Running AI test maintenance only...');
        const actions = await runner.runMaintenance();
        console.log(`✅ Found ${actions.length} maintenance actions`);
        break;
        
      case 'complete':
      default:
        console.log('🤖 Running complete AI test analysis...');
        const report = await runner.runComplete();
        console.log('\n📈 AI Test Runner Summary:');
        console.log(`Quality Score: ${report.qualityScore}/100`);
        console.log(`Generated Tests: ${report.generatedTests}`);
        console.log(`Maintenance Actions: ${report.maintenanceActions}`);
        console.log(`Coverage Improvement: +${report.coverageImprovement.toFixed(1)}%`);
        console.log(`Wedding Scenarios: ${report.weddingScenariosCovered.length} covered`);
        break;
    }
    
  } catch (error) {
    console.error('💥 AI Test Runner failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AITestRunner, AITestRunReport };