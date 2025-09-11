import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('♿ Accessibility Testing Teardown...');
  
  const testResultsDir = path.join(process.cwd(), 'test-results', 'accessibility');
  const stateFile = path.join(testResultsDir, 'accessibility-state.json');
  const reportsDir = path.join(testResultsDir, 'reports');
  
  try {
    // Load final state
    if (fs.existsSync(stateFile)) {
      const finalState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      finalState.endTime = new Date().toISOString();
      finalState.duration = new Date(finalState.endTime).getTime() - new Date(finalState.startTime).getTime();
      
      // Generate comprehensive accessibility report
      const report = await generateAccessibilityReport(finalState, testResultsDir);
      
      // Save final report
      const reportFile = path.join(reportsDir, 'final-accessibility-report.json');
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      // Generate WCAG compliance report
      const wcagReport = await generateWCAGComplianceReport(report);
      const wcagReportFile = path.join(reportsDir, 'wcag-compliance-report.json');
      fs.writeFileSync(wcagReportFile, JSON.stringify(wcagReport, null, 2));
      
      // Generate HTML accessibility report
      const htmlReport = generateAccessibilityHtmlReport(report, wcagReport);
      const htmlFile = path.join(reportsDir, 'accessibility-report.html');
      fs.writeFileSync(htmlFile, htmlReport);
      
      // Generate executive summary
      const execSummary = generateExecutiveSummary(report, wcagReport);
      const execSummaryFile = path.join(reportsDir, 'accessibility-executive-summary.md');
      fs.writeFileSync(execSummaryFile, execSummary);
      
      console.log('📊 Accessibility reports generated:');
      console.log(`  📄 HTML report: ${htmlFile}`);
      console.log(`  📋 JSON report: ${reportFile}`);
      console.log(`  ✅ WCAG compliance: ${wcagReportFile}`);
      console.log(`  📝 Executive summary: ${execSummaryFile}`);
      
      // Print summary to console
      printAccessibilitySummary(report, wcagReport);
    }
  } catch (error) {
    console.error('Error generating accessibility reports:', error);
  }
  
  console.log('✅ Accessibility testing teardown complete!');
}

async function generateAccessibilityReport(state: any, resultsDir: string) {
  const report = {
    ...state,
    summary: {
      wcagLevel: state.wcagLevel,
      totalFeatures: Object.keys(state.features).length,
      testedFeatures: Object.values(state.features).filter((f: any) => f.tested).length,
      passedFeatures: Object.values(state.features).filter((f: any) => f.tested && f.passed).length,
      totalViolations: state.violations.length,
      criticalViolations: state.violations.filter((v: any) => v.impact === 'critical').length,
      seriousViolations: state.violations.filter((v: any) => v.impact === 'serious').length
    },
    complianceScore: 0,
    recommendations: state.recommendations,
    testCoverage: {} as any
  };
  
  // Calculate compliance score
  const testedFeatures = Object.values(state.features).filter((f: any) => f.tested).length;
  const passedFeatures = Object.values(state.features).filter((f: any) => f.tested && f.passed).length;
  
  if (testedFeatures > 0) {
    report.complianceScore = (passedFeatures / testedFeatures) * 100;
  }
  
  // Analyze test coverage
  report.testCoverage = {
    keyboardNavigation: calculateFeatureCoverage(state.features.keyboardNavigation),
    ariaCompliance: calculateFeatureCoverage(state.features.ariaCompliance),
    colorContrast: calculateFeatureCoverage(state.features.colorContrast),
    focusManagement: calculateFeatureCoverage(state.features.focusManagement),
    screenReaderSupport: calculateFeatureCoverage(state.features.screenReaderSupport),
    alternativeInteractions: calculateFeatureCoverage(state.features.alternativeInteractions)
  };
  
  return report;
}

async function generateWCAGComplianceReport(report: any) {
  // Load WCAG checklist
  const testResultsDir = path.join(process.cwd(), 'test-results', 'accessibility');
  const checklistPath = path.join(testResultsDir, 'reports', 'wcag-checklist.json');
  
  let wcagChecklist = {};
  if (fs.existsSync(checklistPath)) {
    wcagChecklist = JSON.parse(fs.readFileSync(checklistPath, 'utf-8'));
  }
  
  const complianceReport = {
    wcagLevel: 'AA',
    overallCompliance: report.complianceScore,
    principleCompliance: {
      'Perceivable': { score: 0, tested: 0, passed: 0, criteria: [] },
      'Operable': { score: 0, tested: 0, passed: 0, criteria: [] },
      'Understandable': { score: 0, tested: 0, passed: 0, criteria: [] },
      'Robust': { score: 0, tested: 0, passed: 0, criteria: [] }
    },
    levelCompliance: {
      'A': { score: 0, tested: 0, passed: 0 },
      'AA': { score: 0, tested: 0, passed: 0 },
      'AAA': { score: 0, tested: 0, passed: 0 }
    },
    detailedResults: wcagChecklist,
    criticalIssues: report.violations.filter((v: any) => v.impact === 'critical'),
    recommendations: generateWCAGRecommendations(report)
  };
  
  return complianceReport;
}

function calculateFeatureCoverage(feature: any) {
  return {
    tested: feature.tested,
    passed: feature.passed,
    coverage: feature.tested ? (feature.passed ? 100 : 0) : 0,
    details: feature.details || []
  };
}

function generateWCAGRecommendations(report: any) {
  const recommendations = [];
  
  // Critical violations
  if (report.summary.criticalViolations > 0) {
    recommendations.push({
      priority: 'Critical',
      category: 'WCAG Violations',
      message: `Address ${report.summary.criticalViolations} critical accessibility violations immediately`,
      details: 'Critical violations prevent users with disabilities from accessing core functionality'
    });
  }
  
  // Keyboard navigation
  if (!report.features.keyboardNavigation?.passed) {
    recommendations.push({
      priority: 'High',
      category: 'Keyboard Navigation',
      message: 'Implement comprehensive keyboard navigation for all interactive elements',
      details: 'Ensure all drag-drop functionality has keyboard alternatives'
    });
  }
  
  // ARIA compliance
  if (!report.features.ariaCompliance?.passed) {
    recommendations.push({
      priority: 'High',
      category: 'ARIA Implementation',
      message: 'Improve ARIA labels and roles for better screen reader support',
      details: 'Add proper aria-labels, roles, and live regions for dynamic content'
    });
  }
  
  // Color contrast
  if (!report.features.colorContrast?.passed) {
    recommendations.push({
      priority: 'Medium',
      category: 'Visual Design',
      message: 'Improve color contrast to meet WCAG AA standards',
      details: 'Ensure 4.5:1 contrast ratio for normal text and 3:1 for large text'
    });
  }
  
  // Focus management
  if (!report.features.focusManagement?.passed) {
    recommendations.push({
      priority: 'Medium',
      category: 'Focus Management',
      message: 'Implement proper focus management for dynamic content',
      details: 'Maintain focus order and visibility during drag-drop operations'
    });
  }
  
  return recommendations;
}

function generateAccessibilityHtmlReport(report: any, wcagReport: any): string {
  const complianceColor = report.complianceScore >= 90 ? '#28a745' : 
                         report.complianceScore >= 75 ? '#ffc107' : '#dc3545';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Testing Report - WedSync Timeline</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f8f9fa;
        }
        .header { 
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white; 
            padding: 30px; 
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .card { 
            background: white; 
            padding: 25px; 
            margin: 20px 0; 
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .compliance-score {
            font-size: 3em;
            font-weight: bold;
            color: ${complianceColor};
            text-align: center;
            margin: 20px 0;
        }
        .feature-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .feature-card { 
            border: 2px solid #e9ecef;
            border-radius: 8px; 
            padding: 20px;
            text-align: center;
        }
        .feature-card.passed { border-color: #28a745; background: #f8fff9; }
        .feature-card.failed { border-color: #dc3545; background: #fff8f8; }
        .feature-card.not-tested { border-color: #6c757d; background: #f8f9fa; }
        .status-badge { 
            display: inline-block; 
            padding: 6px 12px; 
            border-radius: 20px; 
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-not-tested { background: #e2e3e5; color: #383d41; }
        .wcag-section { margin: 20px 0; }
        .wcag-principle { 
            background: #e9ecef; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px;
        }
        .violation-list { background: #fff3cd; border-left: 4px solid #ffc107; }
        .recommendations { background: #d1ecf1; border-left: 4px solid #0dcaf0; }
        .metric { display: inline-block; margin: 0 20px; text-align: center; }
        .metric-value { font-size: 1.5em; font-weight: bold; color: #6f42c1; }
        .metric-label { font-size: 0.9em; color: #6c757d; }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: ${complianceColor};
            width: ${report.complianceScore}%;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>♿ Accessibility Testing Report</h1>
        <p>WedSync Timeline WCAG 2.1 AA Compliance - ${new Date().toLocaleDateString()}</p>
        <div style="display: flex; justify-content: space-around; margin-top: 20px;">
            <div class="metric">
                <div class="metric-value">${report.complianceScore.toFixed(1)}%</div>
                <div class="metric-label">Overall Compliance</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.passedFeatures}/${report.summary.testedFeatures}</div>
                <div class="metric-label">Features Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.totalViolations}</div>
                <div class="metric-label">Total Violations</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>Compliance Score</h2>
        <div class="compliance-score">${report.complianceScore.toFixed(1)}%</div>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <p style="text-align: center; margin-top: 15px;">
            ${report.complianceScore >= 90 ? '🎉 Excellent accessibility compliance!' :
              report.complianceScore >= 75 ? '⚠️ Good compliance, some improvements needed' :
              '❌ Significant accessibility issues need attention'}
        </p>
    </div>

    <div class="card">
        <h2>Feature Testing Results</h2>
        <div class="feature-grid">
            ${Object.entries(report.testCoverage).map(([featureName, coverage]: [string, any]) => `
                <div class="feature-card ${coverage.passed ? 'passed' : coverage.tested ? 'failed' : 'not-tested'}">
                    <h3>${featureName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
                    <span class="status-badge status-${coverage.passed ? 'passed' : coverage.tested ? 'failed' : 'not-tested'}">
                        ${coverage.passed ? 'Passed' : coverage.tested ? 'Failed' : 'Not Tested'}
                    </span>
                    <p>Coverage: ${coverage.coverage}%</p>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="card">
        <h2>WCAG 2.1 Compliance Breakdown</h2>
        <div class="wcag-section">
            ${Object.entries(wcagReport.principleCompliance).map(([principle, data]: [string, any]) => `
                <div class="wcag-principle">
                    <h3>${principle}</h3>
                    <p>Score: ${data.score}% (${data.passed}/${data.tested} criteria passed)</p>
                </div>
            `).join('')}
        </div>
    </div>

    ${report.violations.length > 0 ? `
    <div class="card violation-list">
        <h2>⚠️ Accessibility Violations</h2>
        <div style="display: grid; gap: 15px;">
            ${report.violations.slice(0, 5).map((violation: any) => `
                <div style="border: 1px solid #ffc107; padding: 15px; border-radius: 5px;">
                    <h4>${violation.id || 'Violation'}</h4>
                    <p><strong>Impact:</strong> ${violation.impact || 'Unknown'}</p>
                    <p><strong>Description:</strong> ${violation.description || 'No description available'}</p>
                </div>
            `).join('')}
            ${report.violations.length > 5 ? `<p>... and ${report.violations.length - 5} more violations</p>` : ''}
        </div>
    </div>
    ` : ''}

    ${wcagReport.recommendations.length > 0 ? `
    <div class="card recommendations">
        <h2>💡 Recommendations</h2>
        <div style="display: grid; gap: 15px;">
            ${wcagReport.recommendations.map((rec: any) => `
                <div style="border-left: 4px solid #0dcaf0; padding-left: 15px;">
                    <h4>[${rec.priority}] ${rec.category}</h4>
                    <p><strong>${rec.message}</strong></p>
                    <p>${rec.details}</p>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="card">
        <h2>Test Environment</h2>
        <ul>
            <li><strong>WCAG Level:</strong> ${report.wcagLevel}</li>
            <li><strong>Test Duration:</strong> ${Math.round(report.duration / 1000)} seconds</li>
            <li><strong>Total Features:</strong> ${report.summary.totalFeatures}</li>
            <li><strong>Features Tested:</strong> ${report.summary.testedFeatures}</li>
        </ul>
    </div>

    <div class="card">
        <small>Generated on ${new Date().toISOString()}</small><br>
        <small>Report covers WCAG 2.1 Level AA compliance for timeline drag-drop interface</small>
    </div>
</body>
</html>`;
}

function generateExecutiveSummary(report: any, wcagReport: any): string {
  return `# WedSync Timeline Accessibility Testing Summary

## Executive Overview
- **Overall Compliance Score**: ${report.complianceScore.toFixed(1)}%
- **WCAG Level**: ${report.wcagLevel}
- **Test Date**: ${new Date().toISOString()}
- **Features Tested**: ${report.summary.testedFeatures}/${report.summary.totalFeatures}

## Key Findings

### ✅ Strengths
${Object.entries(report.testCoverage)
  .filter(([_, coverage]: [string, any]) => coverage.passed)
  .map(([feature, _]) => `- ${feature.replace(/([A-Z])/g, ' $1')} implementation meets accessibility standards`)
  .join('\n')}

### ⚠️ Areas for Improvement
${wcagReport.recommendations
  .filter((rec: any) => rec.priority === 'Critical' || rec.priority === 'High')
  .map((rec: any) => `- **${rec.category}**: ${rec.message}`)
  .join('\n')}

## Compliance Breakdown
- **Critical Violations**: ${report.summary.criticalViolations}
- **Serious Violations**: ${report.summary.seriousViolations}
- **Total Violations**: ${report.summary.totalViolations}

## Priority Actions
1. ${wcagReport.recommendations[0]?.message || 'Continue maintaining current accessibility standards'}
2. ${wcagReport.recommendations[1]?.message || 'Conduct regular accessibility audits'}
3. ${wcagReport.recommendations[2]?.message || 'Test with real assistive technologies'}

## Timeline Feature Accessibility Status
| Feature | Status | Notes |
|---------|--------|-------|
${Object.entries(report.testCoverage)
  .map(([feature, coverage]: [string, any]) => 
    `| ${feature.replace(/([A-Z])/g, ' $1')} | ${coverage.passed ? '✅ Pass' : coverage.tested ? '❌ Fail' : '⏳ Not Tested'} | ${coverage.coverage}% coverage |`)
  .join('\n')}

## Next Steps
- Address critical and high-priority violations
- Implement comprehensive keyboard navigation for drag-drop
- Add proper ARIA labels and live regions
- Test with real screen readers and assistive technologies
- Schedule regular accessibility audits

---
*Generated by WedSync Accessibility Testing Suite*
`;
}

function printAccessibilitySummary(report: any, wcagReport: any) {
  console.log('\n♿ ACCESSIBILITY TESTING SUMMARY');
  console.log('══════════════════════════════════════════════════════════');
  
  const complianceEmoji = report.complianceScore >= 90 ? '🎉' : 
                         report.complianceScore >= 75 ? '⚠️' : '❌';
  
  console.log(`${complianceEmoji} Overall Compliance: ${report.complianceScore.toFixed(1)}%`);
  console.log(`📊 Features: ${report.summary.passedFeatures}/${report.summary.testedFeatures} passed`);
  console.log(`🚨 Violations: ${report.summary.totalViolations} (${report.summary.criticalViolations} critical)`);
  console.log(`⏱️  Duration: ${Math.round(report.duration / 1000)} seconds`);
  
  console.log('\n🔍 Feature Results:');
  Object.entries(report.testCoverage).forEach(([feature, coverage]: [string, any]) => {
    const status = coverage.passed ? '✅' : coverage.tested ? '❌' : '⏳';
    const name = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`  ${status} ${name}: ${coverage.coverage}%`);
  });
  
  if (wcagReport.recommendations.length > 0) {
    console.log('\n💡 Top Recommendations:');
    wcagReport.recommendations.slice(0, 3).forEach((rec: any, i: number) => {
      console.log(`  ${i + 1}. [${rec.priority}] ${rec.message}`);
    });
  }
  
  console.log('══════════════════════════════════════════════════════════\n');
}

export default globalTeardown;