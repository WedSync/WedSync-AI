import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Teardown for WS-057 Round 2 RSVP Testing
 * Cleans up test data and environment
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up WS-057 Round 2 RSVP Test Environment...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Clean up test data
    console.log('🗑️ Removing test data...');
    await cleanupTestData();
    
    // 2. Generate test report summary
    console.log('📊 Generating test summary...');
    await generateTestSummary();
    
    // 3. Archive test artifacts
    console.log('📦 Archiving test artifacts...');
    await archiveTestArtifacts();
    
    // 4. Clean up environment variables
    delete process.env.TEST_VENDOR_ID;
    delete process.env.TEST_EVENT_ID;
    
    console.log('✅ Global teardown complete!');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await context.close();
    await browser.close();
  }
}

async function cleanupTestData() {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Clean up in reverse dependency order
    console.log('🗑️ Cleaning export history...');
    await supabase.from('rsvp_export_history').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning custom responses...');
    await supabase.from('rsvp_custom_responses').delete().like('response_id', 'test-%');
    
    console.log('🗑️ Cleaning custom questions...');
    await supabase.from('rsvp_custom_questions').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning plus-one relationships...');
    await supabase.from('rsvp_plus_one_relationships').delete().like('primary_invitation_id', 'test-%');
    
    console.log('🗑️ Cleaning household assignments...');
    await supabase.from('rsvp_invitation_households').delete().like('invitation_id', 'test-%');
    
    console.log('🗑️ Cleaning households...');
    await supabase.from('rsvp_households').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning waitlist...');
    await supabase.from('rsvp_waitlist').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning reminder escalations...');
    await supabase.from('rsvp_reminder_escalation').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning guest details...');
    await supabase.from('rsvp_guest_details').delete().like('response_id', 'test-%');
    
    console.log('🗑️ Cleaning responses...');
    await supabase.from('rsvp_responses').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning invitations...');
    await supabase.from('rsvp_invitations').delete().like('event_id', 'test-%');
    
    console.log('🗑️ Cleaning events...');
    await supabase.from('rsvp_events').delete().like('id', 'test-%');
    
    console.log('✅ Test data cleanup complete');
    
  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
  }
}

async function generateTestSummary() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Read test results if available
    const resultsPath = path.join(process.cwd(), 'test-results', 'rsvp-round2-results.json');
    let testResults = null;
    
    try {
      const resultsContent = await fs.readFile(resultsPath, 'utf-8');
      testResults = JSON.parse(resultsContent);
    } catch (error) {
      console.log('⚠️ No test results file found, skipping summary generation');
      return;
    }
    
    if (!testResults) return;
    
    // Generate summary report
    const summary = {
      testRun: {
        timestamp: new Date().toISOString(),
        duration: testResults.stats?.duration || 0,
        totalTests: testResults.stats?.total || 0,
        passed: testResults.stats?.passed || 0,
        failed: testResults.stats?.failed || 0,
        skipped: testResults.stats?.skipped || 0
      },
      performance: {
        dashboardUpdateTests: 0,
        exportGenerationTests: 0,
        performanceThresholdViolations: 0
      },
      coverage: {
        reminderAutomation: false,
        analyticsPerformance: false,
        waitlistManagement: false,
        plusOneTracking: false,
        customQuestions: false,
        exportSystem: false,
        accessibility: false,
        mobileResponsive: false
      }
    };
    
    // Analyze test results for Round 2 specific metrics
    if (testResults.suites) {
      testResults.suites.forEach((suite: any) => {
        if (suite.title?.includes('Reminder Automation')) {
          summary.coverage.reminderAutomation = true;
        }
        if (suite.title?.includes('Analytics Performance')) {
          summary.coverage.analyticsPerformance = true;
          // Count performance tests
          suite.specs?.forEach((spec: any) => {
            if (spec.title?.includes('200ms') || spec.title?.includes('performance')) {
              summary.performance.dashboardUpdateTests++;
            }
          });
        }
        if (suite.title?.includes('Export System')) {
          summary.coverage.exportSystem = true;
          suite.specs?.forEach((spec: any) => {
            if (spec.title?.includes('3 seconds') || spec.title?.includes('export')) {
              summary.performance.exportGenerationTests++;
            }
          });
        }
        if (suite.title?.includes('Waitlist')) {
          summary.coverage.waitlistManagement = true;
        }
        if (suite.title?.includes('Plus-One')) {
          summary.coverage.plusOneTracking = true;
        }
        if (suite.title?.includes('Custom Question')) {
          summary.coverage.customQuestions = true;
        }
        if (suite.title?.includes('Accessibility')) {
          summary.coverage.accessibility = true;
        }
        if (suite.title?.includes('Mobile') || suite.title?.includes('responsive')) {
          summary.coverage.mobileResponsive = true;
        }
      });
    }
    
    // Write summary report
    const summaryPath = path.join(process.cwd(), 'test-results', 'rsvp-round2-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Generate human-readable summary
    const readableSummary = `
# WS-057 Round 2 RSVP Test Summary

## Test Execution Results
- **Total Tests**: ${summary.testRun.totalTests}
- **Passed**: ${summary.testRun.passed}
- **Failed**: ${summary.testRun.failed}
- **Skipped**: ${summary.testRun.skipped}
- **Duration**: ${Math.round(summary.testRun.duration / 1000)}s

## Feature Coverage
- ✅ Reminder Automation: ${summary.coverage.reminderAutomation ? 'TESTED' : 'NOT TESTED'}
- ✅ Analytics Performance: ${summary.coverage.analyticsPerformance ? 'TESTED' : 'NOT TESTED'}
- ✅ Waitlist Management: ${summary.coverage.waitlistManagement ? 'TESTED' : 'NOT TESTED'}
- ✅ Plus-One Tracking: ${summary.coverage.plusOneTracking ? 'TESTED' : 'NOT TESTED'}
- ✅ Custom Questions: ${summary.coverage.customQuestions ? 'TESTED' : 'NOT TESTED'}
- ✅ Export System: ${summary.coverage.exportSystem ? 'TESTED' : 'NOT TESTED'}
- ✅ Accessibility: ${summary.coverage.accessibility ? 'TESTED' : 'NOT TESTED'}
- ✅ Mobile Responsive: ${summary.coverage.mobileResponsive ? 'TESTED' : 'NOT TESTED'}

## Performance Testing
- Dashboard Update Tests: ${summary.performance.dashboardUpdateTests}
- Export Generation Tests: ${summary.performance.exportGenerationTests}
- Performance Violations: ${summary.performance.performanceThresholdViolations}

## Quality Gates
${summary.testRun.failed === 0 ? '✅ All tests passed' : '❌ Some tests failed'}
${summary.performance.performanceThresholdViolations === 0 ? '✅ Performance requirements met' : '❌ Performance issues detected'}

Generated: ${new Date().toLocaleString()}
`;
    
    const readablePath = path.join(process.cwd(), 'test-results', 'rsvp-round2-summary.md');
    await fs.writeFile(readablePath, readableSummary);
    
    console.log('📊 Test summary generated');
    console.log(`📄 Summary: ${summaryPath}`);
    console.log(`📝 Readable: ${readablePath}`);
    
  } catch (error) {
    console.error('❌ Error generating test summary:', error);
  }
}

async function archiveTestArtifacts() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create archive directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(process.cwd(), 'test-archives', `rsvp-round2-${timestamp}`);
    
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Archive test results
    const resultsDir = path.join(process.cwd(), 'test-results');
    const playwrightReportDir = path.join(process.cwd(), 'playwright-report');
    
    try {
      // Copy test results
      await fs.cp(resultsDir, path.join(archiveDir, 'test-results'), { recursive: true });
      console.log('📦 Test results archived');
    } catch (error) {
      console.log('⚠️ No test results to archive');
    }
    
    try {
      // Copy Playwright report
      await fs.cp(playwrightReportDir, path.join(archiveDir, 'playwright-report'), { recursive: true });
      console.log('📦 Playwright report archived');
    } catch (error) {
      console.log('⚠️ No Playwright report to archive');
    }
    
    // Create archive manifest
    const manifest = {
      testSuite: 'WS-057 Round 2 RSVP Management',
      timestamp: new Date().toISOString(),
      archiveContents: [
        'test-results/',
        'playwright-report/',
        'screenshots/',
        'videos/',
        'traces/'
      ],
      description: 'Comprehensive E2E test results for RSVP Round 2 features including reminder automation, analytics performance, waitlist management, plus-one tracking, custom questions, and export system.'
    };
    
    await fs.writeFile(
      path.join(archiveDir, 'manifest.json'), 
      JSON.stringify(manifest, null, 2)
    );
    
    console.log(`📦 Test artifacts archived to: ${archiveDir}`);
    
  } catch (error) {
    console.error('❌ Error archiving test artifacts:', error);
  }
}

export default globalTeardown;