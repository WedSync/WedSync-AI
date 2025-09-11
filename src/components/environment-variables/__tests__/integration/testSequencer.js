/**
 * Custom Test Sequencer for Integration Tests
 * Ensures tests run in optimal order for performance and reliability
 */

const Sequencer = require('@jest/test-sequencer').default;

class IntegrationTestSequencer extends Sequencer {
  sort(tests) {
    // Define test execution order based on dependencies and performance
    const testOrder = [
      'realtime-integration.test.tsx',    // Core real-time functionality first
      'deployment-sync-integration.test.tsx', // Sync functionality second
      'mobile-integration.test.tsx'       // Mobile-specific tests last (most complex)
    ];

    // Sort tests based on predefined order
    const sortedTests = tests.sort((testA, testB) => {
      const getTestPriority = (testPath) => {
        const filename = testPath.split('/').pop();
        const index = testOrder.findIndex(orderFile => filename.includes(orderFile));
        return index === -1 ? 999 : index;
      };

      const priorityA = getTestPriority(testA.path);
      const priorityB = getTestPriority(testB.path);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });

    console.log('Integration test execution order:');
    sortedTests.forEach((test, index) => {
      const filename = test.path.split('/').pop();
      console.log(`  ${index + 1}. ${filename}`);
    });

    return sortedTests;
  }

  allFailedTests(tests) {
    // Run failed tests first on retry
    const failed = tests.filter(test => test.numFailingTests > 0);
    const passed = tests.filter(test => test.numFailingTests === 0);
    
    return [...failed, ...passed];
  }
}

module.exports = IntegrationTestSequencer;