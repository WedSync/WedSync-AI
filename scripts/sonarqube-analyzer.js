#!/usr/bin/env node
/**
 * SonarQube Results Analyzer for WedSync
 * Connects to cloud SonarQube instance and analyzes wedding platform results
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const fs = require('fs').promises;

class SonarQubeAnalyzer {
  constructor() {
    this.baseUrl = process.env.SONAR_HOST_URL || 'https://sonarcloud.io';
    this.token = process.env.SONAR_TOKEN;
    this.projectKey = process.env.SONAR_PROJECT_KEY || 'wedsync';
    this.organization = process.env.SONAR_ORGANIZATION;
    
    if (!this.token) {
      console.error('❌ SONAR_TOKEN environment variable required');
      console.log('\n🔑 How to get your SonarCloud token:');
      console.log('1. Go to https://sonarcloud.io');
      console.log('2. Log in to your account'); 
      console.log('3. Click your avatar → My Account → Security tab');
      console.log('4. Generate a new token (name: "WedSync Analysis")');
      console.log('5. Copy the token and add to .env.local:');
      console.log('   SONAR_TOKEN=your_actual_token_here');
      console.log('\n📊 Your project configuration:');
      console.log(`   Project Key: ${this.projectKey}`);
      console.log(`   Organization: ${this.organization || 'Not set'}`);
      console.log(`   Host: ${this.baseUrl}`);
      console.log('\n📁 Token should be added to: .env.local');
      process.exit(1);
    }
  }

  async analyzeResults() {
    console.log('🔍 Connecting to SonarQube Cloud...');
    console.log(`📡 Instance: ${this.baseUrl}`);
    console.log(`🎯 Project: ${this.projectKey}`);
    
    try {
      // First, try to list available projects to find the correct key
      console.log('\n📋 Searching for your projects...');
      const projects = await this.apiCall('/api/components/search', {
        qualifiers: 'TRK',
        organization: this.organization
      });
      
      console.log(`\n🔍 Found ${projects.components.length} projects in organization '${this.organization}':`);
      projects.components.forEach(project => {
        console.log(`  📁 ${project.key} - ${project.name}`);
      });
      
      // Try to find a project that matches or contains 'wedsync'
      const matchingProject = projects.components.find(p => 
        p.key.toLowerCase().includes('wedsync') || 
        p.name.toLowerCase().includes('wedsync')
      );
      
      if (matchingProject) {
        console.log(`\n✅ Using project: ${matchingProject.key} (${matchingProject.name})`);
        this.projectKey = matchingProject.key;
      } else {
        console.log(`\n❓ No project matching 'wedsync' found. Using first project: ${projects.components[0].key}`);
        this.projectKey = projects.components[0].key;
      }

      // Get project overview
      const projectInfo = await this.apiCall('/api/components/show', {
        component: this.projectKey
      });
      
      // Get quality gate status
      const qualityGate = await this.apiCall('/api/qualitygates/project_status', {
        projectKey: this.projectKey
      });
      
      // Get issues breakdown
      const issues = await this.getIssuesAnalysis();
      
      // Get measures (metrics)
      const measures = await this.getMeasures();
      
      // Get code coverage
      const coverage = await this.getCoverageData();
      
      // Generate comprehensive report
      const report = await this.generateWeddingPlatformReport({
        projectInfo,
        qualityGate,
        issues,
        measures,
        coverage
      });
      
      await this.saveReport(report);
      this.displayExecutiveSummary(report);
      
    } catch (error) {
      console.error('❌ Failed to analyze SonarQube results:', error.message);
      process.exit(1);
    }
  }

  async apiCall(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}?${queryString}`;
      
      const options = {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        }
      };
      
      https.get(url, options, (response) => {
        let data = '';
        
        response.on('data', chunk => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse JSON: ${error.message}`));
            }
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${data}`));
          }
        });
        
      }).on('error', reject);
    });
  }

  async getIssuesAnalysis() {
    console.log('🔍 Analyzing issues breakdown...');
    
    const [bugs, vulnerabilities, codeSmells, hotspots] = await Promise.all([
      this.apiCall('/api/issues/search', {
        componentKeys: this.projectKey,
        types: 'BUG',
        ps: 500
      }),
      this.apiCall('/api/issues/search', {
        componentKeys: this.projectKey,
        types: 'VULNERABILITY',
        ps: 500
      }),
      this.apiCall('/api/issues/search', {
        componentKeys: this.projectKey,
        types: 'CODE_SMELL',
        ps: 500
      }),
      this.apiCall('/api/hotspots/search', {
        projectKey: this.projectKey,
        ps: 500
      }).catch(() => ({ hotspots: [] })) // Hotspots might not be available
    ]);

    return {
      bugs: this.categorizeIssues(bugs.issues || []),
      vulnerabilities: this.categorizeIssues(vulnerabilities.issues || []),
      codeSmells: this.categorizeIssues(codeSmells.issues || []),
      hotspots: hotspots.hotspots || [],
      totals: {
        bugs: bugs.total || 0,
        vulnerabilities: vulnerabilities.total || 0,
        codeSmells: codeSmells.total || 0,
        hotspots: (hotspots.hotspots || []).length
      }
    };
  }

  categorizeIssues(issues) {
    const categorized = {
      critical: [],
      major: [],
      minor: [],
      info: [],
      weddingRelated: [],
      typeScript: [],
      performance: [],
      security: []
    };

    issues.forEach(issue => {
      // Categorize by severity
      const severity = issue.severity?.toLowerCase() || 'info';
      if (categorized[severity]) {
        categorized[severity].push(issue);
      }

      // Wedding-specific categorization
      const message = (issue.message || '').toLowerCase();
      const file = (issue.component || '').toLowerCase();
      
      if (message.includes('wedding') || message.includes('couple') || 
          message.includes('venue') || message.includes('supplier')) {
        categorized.weddingRelated.push(issue);
      }
      
      if (message.includes('typescript') || message.includes('type') || 
          file.includes('.ts') || file.includes('.tsx')) {
        categorized.typeScript.push(issue);
      }
      
      if (message.includes('performance') || message.includes('slow') ||
          message.includes('memory') || message.includes('cache')) {
        categorized.performance.push(issue);
      }
      
      if (message.includes('security') || message.includes('auth') ||
          message.includes('sanitiz') || message.includes('inject')) {
        categorized.security.push(issue);
      }
    });

    return categorized;
  }

  async getMeasures() {
    console.log('📊 Retrieving code metrics...');
    
    const response = await this.apiCall('/api/measures/component', {
      component: this.projectKey,
      metricKeys: [
        'ncloc', 'lines', 'files',
        'bugs', 'vulnerabilities', 'code_smells',
        'coverage', 'line_coverage', 'branch_coverage',
        'duplicated_lines_density',
        'complexity', 'cognitive_complexity',
        'technical_debt', 'sqale_debt_ratio',
        'reliability_rating', 'security_rating', 'sqale_rating'
      ].join(',')
    });

    const measures = {};
    (response.component?.measures || []).forEach(measure => {
      measures[measure.metric] = {
        value: measure.value,
        bestValue: measure.bestValue,
        periods: measure.periods || []
      };
    });

    return measures;
  }

  async getCoverageData() {
    console.log('🧪 Analyzing test coverage...');
    
    try {
      const coverage = await this.apiCall('/api/measures/component_tree', {
        component: this.projectKey,
        metricKeys: 'coverage,line_coverage,branch_coverage',
        qualifiers: 'FIL',
        ps: 100,
        s: 'metric',
        metricSort: 'coverage',
        asc: 'false'
      });

      return {
        components: coverage.components || [],
        summary: {
          totalFiles: (coverage.components || []).length,
          averageCoverage: this.calculateAverageCoverage(coverage.components || [])
        }
      };
    } catch (error) {
      console.log('⚠️ Coverage data not available');
      return { components: [], summary: { totalFiles: 0, averageCoverage: 0 } };
    }
  }

  calculateAverageCoverage(components) {
    if (!components.length) return 0;
    
    const totalCoverage = components.reduce((sum, comp) => {
      const coverage = comp.measures?.find(m => m.metric === 'coverage');
      return sum + (parseFloat(coverage?.value || 0));
    }, 0);
    
    return Math.round(totalCoverage / components.length * 100) / 100;
  }

  async generateWeddingPlatformReport(data) {
    const { projectInfo, qualityGate, issues, measures, coverage } = data;
    
    const report = {
      timestamp: new Date().toISOString(),
      project: {
        name: projectInfo.component?.name || this.projectKey,
        key: this.projectKey,
        organization: this.organization
      },
      qualityGate: {
        status: qualityGate.projectStatus?.status || 'UNKNOWN',
        conditions: qualityGate.projectStatus?.conditions || []
      },
      summary: {
        linesOfCode: parseInt(measures.ncloc?.value || 0),
        totalFiles: parseInt(measures.files?.value || 0),
        totalLines: parseInt(measures.lines?.value || 0)
      },
      issues: {
        total: issues.totals.bugs + issues.totals.vulnerabilities + issues.totals.codeSmells,
        breakdown: issues.totals,
        weddingRelated: issues.bugs.weddingRelated.length + 
                       issues.vulnerabilities.weddingRelated.length + 
                       issues.codeSmells.weddingRelated.length,
        typeScriptIssues: issues.bugs.typeScript.length + 
                         issues.vulnerabilities.typeScript.length + 
                         issues.codeSmells.typeScript.length
      },
      ratings: {
        reliability: measures.reliability_rating?.value || 'A',
        security: measures.security_rating?.value || 'A',
        maintainability: measures.sqale_rating?.value || 'A'
      },
      coverage: {
        overall: parseFloat(measures.coverage?.value || 0),
        lines: parseFloat(measures.line_coverage?.value || 0),
        branches: parseFloat(measures.branch_coverage?.value || 0)
      },
      technicalDebt: {
        total: measures.technical_debt?.value || '0min',
        ratio: parseFloat(measures.sqale_debt_ratio?.value || 0),
        complexity: parseInt(measures.complexity?.value || 0),
        cognitiveComplexity: parseInt(measures.cognitive_complexity?.value || 0)
      },
      weddingDayAssessment: this.assessWeddingDayImpact(issues, measures),
      recommendations: this.generateRecommendations(issues, measures, qualityGate)
    };

    return report;
  }

  assessWeddingDayImpact(issues, measures) {
    const criticalBugs = issues.bugs.critical.length;
    const criticalVulns = issues.vulnerabilities.critical.length;
    const performanceIssues = issues.bugs.performance.length + issues.codeSmells.performance.length;
    const weddingIssues = issues.bugs.weddingRelated.length + 
                         issues.vulnerabilities.weddingRelated.length;
    
    let riskLevel = 'LOW';
    let riskFactors = [];
    
    if (criticalBugs > 0 || criticalVulns > 0) {
      riskLevel = 'CRITICAL';
      riskFactors.push(`${criticalBugs + criticalVulns} critical issues found`);
    }
    
    if (performanceIssues > 5) {
      riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
      riskFactors.push(`${performanceIssues} performance-related issues`);
    }
    
    if (weddingIssues > 0) {
      riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
      riskFactors.push(`${weddingIssues} wedding-specific issues`);
    }

    const coverage = parseFloat(measures.coverage?.value || 0);
    if (coverage < 70) {
      riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
      riskFactors.push(`Low test coverage: ${coverage}%`);
    }

    return {
      riskLevel,
      riskFactors,
      readyForProduction: riskLevel !== 'CRITICAL',
      saturdayDeploymentSafe: riskLevel === 'LOW' || riskLevel === 'MEDIUM'
    };
  }

  generateRecommendations(issues, measures, qualityGate) {
    const recommendations = [];

    // Quality Gate failures
    if (qualityGate.projectStatus?.status === 'ERROR') {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Quality Gate',
        action: 'Fix quality gate failures before production deployment',
        impact: 'Blocks production release'
      });
    }

    // Critical bugs
    const criticalBugs = issues.bugs.critical.length + issues.vulnerabilities.critical.length;
    if (criticalBugs > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Bug Fixes',
        action: `Fix ${criticalBugs} critical bugs and vulnerabilities`,
        impact: 'Prevents wedding day service disruptions'
      });
    }

    // Coverage improvement
    const coverage = parseFloat(measures.coverage?.value || 0);
    if (coverage < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Test Coverage',
        action: `Increase test coverage from ${coverage}% to 80%+`,
        impact: 'Reduces production risk and improves reliability'
      });
    }

    // Technical debt
    const debtRatio = parseFloat(measures.sqale_debt_ratio?.value || 0);
    if (debtRatio > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Technical Debt',
        action: `Reduce technical debt ratio from ${debtRatio}% to under 5%`,
        impact: 'Improves maintainability and development velocity'
      });
    }

    // Code smells
    if (issues.totals.codeSmells > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Code Quality',
        action: `Address ${issues.totals.codeSmells} code smells`,
        impact: 'Improves code maintainability and readability'
      });
    }

    return recommendations;
  }

  async saveReport(report) {
    const timestamp = Date.now();
    const jsonFile = `sonarqube-analysis-${timestamp}.json`;
    const htmlFile = `sonarqube-dashboard-${timestamp}.html`;
    
    // Save JSON report
    await fs.writeFile(jsonFile, JSON.stringify(report, null, 2));
    
    // Generate HTML dashboard
    const html = this.generateHTMLDashboard(report);
    await fs.writeFile(htmlFile, html);
    
    console.log(`📊 Report saved: ${jsonFile}`);
    console.log(`📈 Dashboard saved: ${htmlFile}`);
  }

  displayExecutiveSummary(report) {
    console.log('\n📋 SONARQUBE ANALYSIS SUMMARY');
    console.log('='.repeat(50));
    console.log(`🏢 Project: ${report.project.name}`);
    console.log(`📏 Lines of Code: ${report.summary.linesOfCode.toLocaleString()}`);
    console.log(`📁 Total Files: ${report.summary.totalFiles.toLocaleString()}`);
    console.log(`🚦 Quality Gate: ${report.qualityGate.status}`);
    console.log('='.repeat(50));
    
    console.log('\n🎯 ISSUES BREAKDOWN:');
    console.log(`🐛 Bugs: ${report.issues.breakdown.bugs}`);
    console.log(`🔓 Vulnerabilities: ${report.issues.breakdown.vulnerabilities}`);
    console.log(`🧹 Code Smells: ${report.issues.breakdown.codeSmells}`);
    console.log(`🔥 Security Hotspots: ${report.issues.breakdown.hotspots}`);
    
    console.log('\n📊 QUALITY RATINGS:');
    console.log(`🔧 Reliability: ${report.ratings.reliability}`);
    console.log(`🔒 Security: ${report.ratings.security}`);
    console.log(`🧽 Maintainability: ${report.ratings.maintainability}`);
    
    console.log('\n🧪 TEST COVERAGE:');
    console.log(`📈 Overall: ${report.coverage.overall}%`);
    console.log(`📄 Lines: ${report.coverage.lines}%`);
    console.log(`🌳 Branches: ${report.coverage.branches}%`);
    
    console.log('\n💰 TECHNICAL DEBT:');
    console.log(`⏰ Total: ${report.technicalDebt.total}`);
    console.log(`📊 Debt Ratio: ${report.technicalDebt.ratio}%`);
    
    console.log('\n🎂 WEDDING DAY ASSESSMENT:');
    console.log(`🚨 Risk Level: ${report.weddingDayAssessment.riskLevel}`);
    console.log(`🚀 Production Ready: ${report.weddingDayAssessment.readyForProduction ? 'YES' : 'NO'}`);
    console.log(`💒 Saturday Safe: ${report.weddingDayAssessment.saturdayDeploymentSafe ? 'YES' : 'NO'}`);
    
    if (report.weddingDayAssessment.riskFactors.length > 0) {
      console.log('\n⚠️ RISK FACTORS:');
      report.weddingDayAssessment.riskFactors.forEach(factor => {
        console.log(`   • ${factor}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n📋 TOP RECOMMENDATIONS:');
      report.recommendations.slice(0, 5).forEach(rec => {
        console.log(`   ${rec.priority}: ${rec.action}`);
      });
    }
  }

  generateHTMLDashboard(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>WedSync SonarQube Analysis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-bottom: 10px; }
        .quality-gate { font-size: 1.5em; color: ${report.qualityGate.status === 'OK' ? '#4CAF50' : '#f44336'}; }
        .risk-level { font-size: 2em; color: ${report.weddingDayAssessment.riskLevel === 'LOW' ? '#4CAF50' : report.weddingDayAssessment.riskLevel === 'MEDIUM' ? '#FF9800' : '#f44336'}; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .critical { color: #f44336; }
        .high { color: #FF9800; }
        .medium { color: #2196F3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ WedSync SonarQube Analysis</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Project: ${report.project.name} | Quality Gate: <span class="quality-gate">${report.qualityGate.status}</span></p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-label">Lines of Code</div>
            <div class="metric-value">${report.summary.linesOfCode.toLocaleString()}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Total Issues</div>
            <div class="metric-value">${report.issues.total}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Test Coverage</div>
            <div class="metric-value">${report.coverage.overall}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Wedding Day Risk</div>
            <div class="metric-value risk-level">${report.weddingDayAssessment.riskLevel}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Technical Debt</div>
            <div class="metric-value">${report.technicalDebt.ratio}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Security Rating</div>
            <div class="metric-value">${report.ratings.security}</div>
        </div>
    </div>
    
    <div class="recommendations">
        <h2>📋 Priority Recommendations</h2>
        ${report.recommendations.map(rec => 
          `<p><span class="${rec.priority.toLowerCase()}">${rec.priority}</span>: <strong>${rec.category}</strong> - ${rec.action}</p>`
        ).join('')}
    </div>
    
    <div class="recommendations">
        <h2>🎂 Wedding Day Assessment</h2>
        <p><strong>Production Ready:</strong> ${report.weddingDayAssessment.readyForProduction ? '✅ YES' : '❌ NO'}</p>
        <p><strong>Saturday Deployment Safe:</strong> ${report.weddingDayAssessment.saturdayDeploymentSafe ? '✅ YES' : '❌ NO'}</p>
        ${report.weddingDayAssessment.riskFactors.length > 0 ? 
          `<p><strong>Risk Factors:</strong></p><ul>${report.weddingDayAssessment.riskFactors.map(f => `<li>${f}</li>`).join('')}</ul>` : 
          '<p>✅ No significant risk factors identified</p>'
        }
    </div>
</body>
</html>`;
  }
}

// CLI Interface
if (require.main === module) {
  const analyzer = new SonarQubeAnalyzer();
  analyzer.analyzeResults().catch(console.error);
}

module.exports = SonarQubeAnalyzer;