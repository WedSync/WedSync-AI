import { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import path from 'path';
import fs from 'fs';

interface AccessibilityTestResult {
  testName: string;
  wcagCriteria: string[];
  passed: boolean;
  violations: any[];
  duration: number;
  featureTested: string;
  complianceLevel: 'A' | 'AA' | 'AAA';
}

class AccessibilityReporter implements Reporter {
  private accessibilityResults: AccessibilityTestResult[] = [];
  private startTime: number = 0;
  private outputDir: string;
  private wcagViolations: any[] = [];

  constructor(options: { outputFile?: string } = {}) {
    this.outputDir = options.outputFile || path.join(process.cwd(), 'test-results', 'accessibility', 'reports');
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    console.log('♿ Starting Accessibility Testing with WCAG 2.1 AA Compliance...');
    console.log(`📁 Accessibility reports will be saved to: ${this.outputDir}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const testName = test.title;
    const featureTested = this.extractFeatureName(testName);
    const wcagCriteria = this.extractWCAGCriteria(testName);
    
    // Extract violations from test result attachments or errors
    let violations: any[] = [];
    if (result.attachments) {
      violations = result.attachments
        .filter(attachment => attachment.name.includes('violations') || attachment.name.includes('axe'))
        .map(attachment => {
          try {
            return JSON.parse(attachment.body?.toString() || '[]');
          } catch {
            return [];
          }
        })
        .flat();
    }
    
    const accessibilityResult: AccessibilityTestResult = {
      testName,
      wcagCriteria,
      passed: result.status === 'passed',
      violations,
      duration: result.duration,
      featureTested,
      complianceLevel: this.determineComplianceLevel(wcagCriteria)
    };
    
    this.accessibilityResults.push(accessibilityResult);
    
    // Track violations for overall reporting
    this.wcagViolations.push(...violations);
  }

  onEnd(result: FullResult) {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const report = this.generateAccessibilityReport(totalDuration, result);
    
    // Save detailed accessibility report
    const reportPath = path.join(this.outputDir, 'accessibility-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate VPAT (Voluntary Product Accessibility Template)
    const vpatReport = this.generateVPATReport(report);
    const vpatPath = path.join(this.outputDir, 'vpat-report.json');
    fs.writeFileSync(vpatPath, JSON.stringify(vpatReport, null, 2));
    
    // Generate accessibility summary for CI
    const ciSummary = this.generateCISummary(report);
    const ciSummaryPath = path.join(this.outputDir, 'accessibility-ci-summary.txt');
    fs.writeFileSync(ciSummaryPath, ciSummary);
    
    // Update accessibility state
    this.updateAccessibilityState(report);
    
    // Print console summary
    this.printAccessibilityConsoleSummary(report);
    
    console.log(`♿ Accessibility report saved to: ${reportPath}`);
    console.log(`📄 VPAT report saved to: ${vpatPath}`);
    console.log(`🔄 CI summary saved to: ${ciSummaryPath}`);
  }

  private extractFeatureName(testName: string): string {
    if (testName.includes('keyboard')) return 'keyboardNavigation';
    if (testName.includes('aria') || testName.includes('ARIA')) return 'ariaCompliance';
    if (testName.includes('contrast') || testName.includes('color')) return 'colorContrast';
    if (testName.includes('focus')) return 'focusManagement';
    if (testName.includes('screen reader')) return 'screenReaderSupport';
    if (testName.includes('alternative') || testName.includes('interaction')) return 'alternativeInteractions';
    return 'general';
  }

  private extractWCAGCriteria(testName: string): string[] {
    const criteria: string[] = [];
    
    // Map common test patterns to WCAG criteria
    if (testName.includes('keyboard')) {
      criteria.push('2.1.1'); // Keyboard accessible
    }
    if (testName.includes('focus')) {
      criteria.push('2.4.3', '2.4.7'); // Focus Order, Focus Visible
    }
    if (testName.includes('aria') || testName.includes('label')) {
      criteria.push('4.1.2', '1.3.1'); // Name Role Value, Info and Relationships
    }
    if (testName.includes('contrast') || testName.includes('color')) {
      criteria.push('1.4.3', '1.4.11'); // Contrast (Minimum), Non-text Contrast
    }
    if (testName.includes('screen reader') || testName.includes('live')) {
      criteria.push('4.1.3'); // Status Messages
    }
    if (testName.includes('drag') || testName.includes('pointer')) {
      criteria.push('2.5.1', '2.5.2'); // Pointer Gestures, Pointer Cancellation
    }
    if (testName.includes('motion') || testName.includes('reduced')) {
      criteria.push('2.3.3'); // Animation from Interactions
    }
    if (testName.includes('viewport') || testName.includes('responsive')) {
      criteria.push('1.4.10'); // Reflow
    }
    
    return criteria;
  }

  private determineComplianceLevel(criteria: string[]): 'A' | 'AA' | 'AAA' {
    // Simplified mapping - in reality would need full WCAG reference
    const aaCriteria = ['1.4.3', '1.4.11', '2.4.6', '2.4.7', '1.4.10', '1.4.12', '1.4.13', '4.1.3'];
    const hasAACriteria = criteria.some(c => aaCriteria.includes(c));
    
    return hasAACriteria ? 'AA' : 'A';
  }

  private generateAccessibilityReport(totalDuration: number, result: FullResult) {
    const passedTests = this.accessibilityResults.filter(r => r.passed);
    const failedTests = this.accessibilityResults.filter(r => r.passed === false);
    
    // Group by feature
    const featureResults = this.accessibilityResults.reduce((acc, result) => {
      if (!acc[result.featureTested]) {
        acc[result.featureTested] = { tested: 0, passed: 0, failed: 0, violations: [] };
      }
      acc[result.featureTested].tested++;
      if (result.passed) {
        acc[result.featureTested].passed++;
      } else {
        acc[result.featureTested].failed++;
        acc[result.featureTested].violations.push(...result.violations);
      }
      return acc;
    }, {} as any);
    
    // Calculate compliance scores
    const overallCompliance = this.accessibilityResults.length > 0 
      ? (passedTests.length / this.accessibilityResults.length) * 100 
      : 0;
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalDuration,
        wcagLevel: 'AA',
        testFramework: 'Playwright + axe-core'
      },
      summary: {
        totalTests: this.accessibilityResults.length,
        passedTests: passedTests.length,
        failedTests: failedTests.length,
        overallCompliance: Math.round(overallCompliance * 100) / 100,
        totalViolations: this.wcagViolations.length,
        criticalViolations: this.wcagViolations.filter(v => v.impact === 'critical').length,
        seriousViolations: this.wcagViolations.filter(v => v.impact === 'serious').length
      },
      featureResults,
      wcagCompliance: this.analyzeWCAGCompliance(),
      violations: this.categorizeViolations(),
      recommendations: this.generateRecommendations(featureResults),
      testResults: this.accessibilityResults
    };
    
    return report;
  }

  private analyzeWCAGCompliance() {
    const compliance = {
      level: {
        A: { total: 0, passed: 0, percentage: 0 },
        AA: { total: 0, passed: 0, percentage: 0 },
        AAA: { total: 0, passed: 0, percentage: 0 }
      },
      principles: {
        Perceivable: { criteria: [], passed: 0, total: 0 },
        Operable: { criteria: [], passed: 0, total: 0 },
        Understandable: { criteria: [], passed: 0, total: 0 },
        Robust: { criteria: [], passed: 0, total: 0 }
      }
    };
    
    this.accessibilityResults.forEach(result => {
      compliance.level[result.complianceLevel].total++;
      if (result.passed) {
        compliance.level[result.complianceLevel].passed++;
      }
      
      // Map criteria to principles (simplified)
      result.wcagCriteria.forEach(criteria => {
        const principle = this.mapCriteriaToPrinciple(criteria);
        if (principle) {
          compliance.principles[principle].total++;
          if (result.passed) {
            compliance.principles[principle].passed++;
          }
        }
      });
    });
    
    // Calculate percentages
    Object.keys(compliance.level).forEach(level => {
      const levelData = compliance.level[level as keyof typeof compliance.level];
      if (levelData.total > 0) {
        levelData.percentage = Math.round((levelData.passed / levelData.total) * 100);
      }
    });
    
    return compliance;
  }

  private mapCriteriaToPrinciple(criteria: string): keyof typeof this.analyzeWCAGCompliance.prototype.principles | null {
    const firstDigit = criteria.charAt(0);
    switch (firstDigit) {
      case '1': return 'Perceivable';
      case '2': return 'Operable';
      case '3': return 'Understandable';
      case '4': return 'Robust';
      default: return null;
    }
  }

  private categorizeViolations() {
    const categories = {
      critical: this.wcagViolations.filter(v => v.impact === 'critical'),
      serious: this.wcagViolations.filter(v => v.impact === 'serious'),
      moderate: this.wcagViolations.filter(v => v.impact === 'moderate'),
      minor: this.wcagViolations.filter(v => v.impact === 'minor')
    };
    
    return {
      ...categories,
      summary: {
        critical: categories.critical.length,
        serious: categories.serious.length,
        moderate: categories.moderate.length,
        minor: categories.minor.length
      }
    };
  }

  private generateRecommendations(featureResults: any) {
    const recommendations = [];
    
    Object.entries(featureResults).forEach(([feature, results]: [string, any]) => {
      if (results.failed > 0) {
        recommendations.push({
          feature,
          priority: results.violations.some((v: any) => v.impact === 'critical') ? 'Critical' : 'High',
          issue: `${results.failed} out of ${results.tested} tests failed for ${feature}`,
          suggestion: this.getFeatureRecommendation(feature),
          violations: results.violations.length
        });
      }
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
  }

  private getFeatureRecommendation(feature: string): string {
    const recommendations: Record<string, string> = {
      keyboardNavigation: 'Implement comprehensive keyboard navigation with proper tab order and keyboard shortcuts for all drag-drop operations',
      ariaCompliance: 'Add proper ARIA labels, roles, and live regions. Ensure all interactive elements have accessible names',
      colorContrast: 'Increase color contrast ratios to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)',
      focusManagement: 'Implement visible focus indicators and maintain proper focus order during dynamic content changes',
      screenReaderSupport: 'Add live regions for status updates and ensure all content is properly announced to screen readers',
      alternativeInteractions: 'Provide alternative methods for drag-drop operations, such as keyboard controls or context menus'
    };
    
    return recommendations[feature] || 'Review and improve accessibility implementation for this feature';
  }

  private generateVPATReport(report: any) {
    return {
      productName: 'WedSync Timeline Interface',
      version: '1.0',
      reportDate: new Date().toISOString(),
      evaluationMethods: ['Automated Testing (axe-core)', 'Manual Testing'],
      supportLevel: {
        supports: report.summary.passedTests,
        partiallySupports: 0, // Would need more detailed analysis
        doesNotSupport: report.summary.failedTests,
        notApplicable: 0
      },
      wcag21Compliance: report.wcagCompliance,
      notes: 'This VPAT covers the drag-drop timeline interface functionality of WedSync',
      contactInformation: 'accessibility@wedsync.com'
    };
  }

  private generateCISummary(report: any): string {
    return `ACCESSIBILITY TEST SUMMARY
==========================
Overall Compliance: ${report.summary.overallCompliance}%
Passed Tests: ${report.summary.passedTests}/${report.summary.totalTests}
Critical Violations: ${report.summary.criticalViolations}
Serious Violations: ${report.summary.seriousViolations}
Status: ${report.summary.criticalViolations === 0 ? 'PASS' : 'FAIL'}
`;
  }

  private updateAccessibilityState(report: any) {
    const stateFile = path.join(process.cwd(), 'test-results', 'accessibility', 'accessibility-state.json');
    
    if (fs.existsSync(stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        
        // Update feature test results
        Object.entries(report.featureResults).forEach(([feature, results]: [string, any]) => {
          if (state.features[feature]) {
            state.features[feature].tested = true;
            state.features[feature].passed = results.failed === 0;
            state.features[feature].details = results.violations || [];
          }
        });
        
        // Update violations
        state.violations = report.violations.critical.concat(report.violations.serious);
        
        // Update recommendations
        state.recommendations = report.recommendations.map((r: any) => r.suggestion);
        
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      } catch (error) {
        console.warn('Could not update accessibility state:', error);
      }
    }
  }

  private printAccessibilityConsoleSummary(report: any) {
    console.log('\n♿ ACCESSIBILITY TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    const complianceColor = report.summary.overallCompliance >= 90 ? '🟢' : 
                           report.summary.overallCompliance >= 75 ? '🟡' : '🔴';
    
    console.log(`${complianceColor} Overall Compliance: ${report.summary.overallCompliance}%`);
    console.log(`📊 Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
    console.log(`🚨 Violations: ${report.summary.totalViolations} (${report.summary.criticalViolations} critical, ${report.summary.seriousViolations} serious)`);
    
    console.log('\n🎯 WCAG 2.1 Compliance by Level:');
    Object.entries(report.wcagCompliance.level).forEach(([level, data]: [string, any]) => {
      if (data.total > 0) {
        const emoji = data.percentage >= 90 ? '✅' : data.percentage >= 75 ? '⚠️' : '❌';
        console.log(`  ${emoji} Level ${level}: ${data.percentage}% (${data.passed}/${data.total})`);
      }
    });
    
    console.log('\n🔍 Feature Results:');
    Object.entries(report.featureResults).forEach(([feature, results]: [string, any]) => {
      const status = results.failed === 0 ? '✅' : '❌';
      const name = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`  ${status} ${name}: ${results.passed}/${results.tested} passed`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec: any, i: number) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.feature}: ${rec.suggestion.substring(0, 80)}...`);
      });
    }
    
    const status = report.summary.criticalViolations === 0 ? '✅ ACCESSIBILITY TESTS PASSED' : '❌ ACCESSIBILITY TESTS FAILED';
    console.log(`\n${status}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

export default AccessibilityReporter;