import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('🏁 Cross-Browser Timeline Testing Teardown...');
  
  const testResultsDir = path.join(process.cwd(), 'test-results', 'cross-browser');
  const stateFile = path.join(testResultsDir, 'compatibility-state.json');
  
  try {
    // Load final state
    if (fs.existsSync(stateFile)) {
      const finalState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      finalState.endTime = new Date().toISOString();
      finalState.duration = new Date(finalState.endTime).getTime() - new Date(finalState.startTime).getTime();
      
      // Generate final compatibility report
      const report = generateCompatibilityReport(finalState, testResultsDir);
      
      // Save final report
      const reportFile = path.join(testResultsDir, 'final-compatibility-report.json');
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      // Generate HTML report
      const htmlReport = generateHtmlReport(report);
      const htmlFile = path.join(testResultsDir, 'compatibility-report.html');
      fs.writeFileSync(htmlFile, htmlReport);
      
      console.log('📊 Final compatibility report generated');
      console.log(`📄 HTML report: ${htmlFile}`);
      console.log(`📋 JSON report: ${reportFile}`);
      
      // Print summary to console
      printTestSummary(report);
    }
  } catch (error) {
    console.error('Error generating final report:', error);
  }
  
  console.log('✅ Cross-browser testing teardown complete!');
}

function generateCompatibilityReport(state: any, resultsDir: string) {
  const report = {
    ...state,
    summary: {
      totalBrowsers: Object.keys(state.browsers).length,
      availableBrowsers: Object.values(state.browsers).filter((b: any) => b.installed).length,
      testFeatures: Object.keys(state.features).length
    },
    browserSupport: {} as any,
    recommendations: [] as string[],
    issues: [] as any[]
  };
  
  // Analyze browser support
  Object.entries(state.browsers).forEach(([browserName, browserInfo]: [string, any]) => {
    report.browserSupport[browserName] = {
      installed: browserInfo.installed,
      version: browserInfo.version,
      compatibility: browserInfo.installed ? 'supported' : 'not-available',
      features: browserInfo.features || []
    };
    
    if (!browserInfo.installed) {
      report.issues.push({
        type: 'browser-unavailable',
        browser: browserName,
        message: `${browserName} is not available for testing`
      });
    }
  });
  
  // Generate recommendations
  const availableBrowsers = Object.values(state.browsers).filter((b: any) => b.installed).length;
  
  if (availableBrowsers < 3) {
    report.recommendations.push('Install all three browsers (Chrome, Firefox, Safari) for comprehensive testing');
  }
  
  if (availableBrowsers === 3) {
    report.recommendations.push('All major browsers available - ensure regular testing across all platforms');
  }
  
  report.recommendations.push('Consider adding Edge browser testing for Windows compatibility');
  report.recommendations.push('Test on real mobile devices in addition to browser emulation');
  report.recommendations.push('Monitor browser-specific performance metrics');
  
  return report;
}

function generateHtmlReport(report: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Browser Compatibility Report - WedSync Timeline</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 30px; 
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .card { 
            background: white; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .browser-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .browser-card { 
            border: 2px solid #e1e5e9; 
            border-radius: 8px; 
            padding: 20px;
            transition: all 0.3s ease;
        }
        .browser-card.supported { border-color: #28a745; background: #f8fff9; }
        .browser-card.not-available { border-color: #dc3545; background: #fff8f8; }
        .status-badge { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-supported { background: #d4edda; color: #155724; }
        .status-unavailable { background: #f8d7da; color: #721c24; }
        .recommendations { background: #e7f3ff; border-left: 4px solid #0066cc; }
        .issues { background: #fff3cd; border-left: 4px solid #ffc107; }
        .metric { text-align: center; margin: 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .metric-label { font-size: 0.9em; color: #666; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌐 Cross-Browser Compatibility Report</h1>
        <p>WedSync Timeline Testing - Generated ${new Date().toLocaleDateString()}</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 20px;">
            <div class="metric">
                <div class="metric-value">${report.summary.availableBrowsers}/${report.summary.totalBrowsers}</div>
                <div class="metric-label">Browsers Available</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.testFeatures}</div>
                <div class="metric-label">Features Tested</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(report.duration / 1000)}s</div>
                <div class="metric-label">Test Duration</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>Browser Support Matrix</h2>
        <div class="browser-grid">
            ${Object.entries(report.browserSupport).map(([browserName, info]: [string, any]) => `
                <div class="browser-card ${info.compatibility}">
                    <h3>${browserName.charAt(0).toUpperCase() + browserName.slice(1)}</h3>
                    <span class="status-badge status-${info.compatibility === 'supported' ? 'supported' : 'unavailable'}">
                        ${info.compatibility}
                    </span>
                    <p><strong>Version:</strong> ${info.version || 'N/A'}</p>
                    <p><strong>Features:</strong> ${info.features.length} tested</p>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="card">
        <h2>Test Environment</h2>
        <ul>
            <li><strong>Platform:</strong> ${report.testEnvironment.platform}</li>
            <li><strong>Architecture:</strong> ${report.testEnvironment.architecture}</li>
            <li><strong>Node Version:</strong> ${report.testEnvironment.nodeVersion}</li>
            <li><strong>Test Duration:</strong> ${Math.round(report.duration / 1000)} seconds</li>
        </ul>
    </div>

    ${report.recommendations.length > 0 ? `
    <div class="card recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${report.issues.length > 0 ? `
    <div class="card issues">
        <h2>⚠️ Issues Found</h2>
        <ul>
            ${report.issues.map(issue => `<li><strong>${issue.type}:</strong> ${issue.message}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="card">
        <h2>Feature Testing Status</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${Object.entries(report.features).map(([featureName, featureInfo]: [string, any]) => `
                <div style="text-align: center; padding: 15px; border: 1px solid #e1e5e9; border-radius: 5px;">
                    <h4>${featureName}</h4>
                    <span class="status-badge ${featureInfo.tested ? 'status-supported' : 'status-unavailable'}">
                        ${featureInfo.tested ? 'Tested' : 'Pending'}
                    </span>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="card">
        <small>Generated on ${new Date().toISOString()}</small>
    </div>
</body>
</html>`;
}

function printTestSummary(report: any) {
  console.log('\n🌐 CROSS-BROWSER COMPATIBILITY SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`📊 Browser Support: ${report.summary.availableBrowsers}/${report.summary.totalBrowsers} browsers available`);
  console.log(`⏱️  Test Duration: ${Math.round(report.duration / 1000)} seconds`);
  console.log(`🧪 Features Tested: ${report.summary.testFeatures}`);
  
  console.log('\n🔍 Browser Status:');
  Object.entries(report.browserSupport).forEach(([browserName, info]: [string, any]) => {
    const status = info.compatibility === 'supported' ? '✅' : '❌';
    console.log(`  ${status} ${browserName}: ${info.version || 'Not Available'}`);
  });
  
  if (report.issues.length > 0) {
    console.log('\n⚠️ Issues:');
    report.issues.forEach(issue => {
      console.log(`  • ${issue.message}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Top Recommendations:');
    report.recommendations.slice(0, 3).forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  console.log('═══════════════════════════════════════════════\n');
}

export default globalTeardown;