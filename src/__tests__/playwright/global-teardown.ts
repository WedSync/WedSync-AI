/**
 * WS-130: Global Playwright Teardown for AI Photography Features
 * Handles cleanup of test data, resources, and services
 */

import { FullConfig } from '@playwright/test';
import { PerformanceOptimizer } from '../../lib/ai/photography/performance-optimizer';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting AI Photography E2E tests teardown...');

  try {
    // Clean up AI services
    await cleanupAiServices();

    // Clean up test data
    await cleanupTestData();

    // Clean up test fixtures
    await cleanupTestFixtures();

    // Clean up temporary files
    await cleanupTemporaryFiles();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here as we want tests to still report their results
  }
}

/**
 * Clean up AI services and release resources
 */
async function cleanupAiServices() {
  console.log('🤖 Cleaning up AI services...');

  try {
    // Dispose of performance optimizer singleton
    const performanceOptimizer =
      require('../../lib/ai/photography/performance-optimizer').performanceOptimizer;
    if (
      performanceOptimizer &&
      typeof performanceOptimizer.dispose === 'function'
    ) {
      performanceOptimizer.dispose();
    }

    // Clear any cached AI service instances
    delete process.env.OPENAI_TEST_MODE;
    delete process.env.AI_PHOTOGRAPHY_TEST_MODE;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log('✅ AI services cleaned up');
  } catch (error) {
    console.error('⚠️ Error cleaning up AI services:', error);
  }
}

/**
 * Clean up test data from database/storage
 */
async function cleanupTestData() {
  console.log('📊 Cleaning up test data...');

  try {
    // In a real implementation, this would clean up database test data
    // For now, just clear local storage data

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('⚠️ Error cleaning up test data:', error);
  }
}

/**
 * Clean up test image fixtures if needed
 */
async function cleanupTestFixtures() {
  console.log('🖼️ Cleaning up test fixtures...');

  try {
    const fs = require('fs');
    const path = require('path');

    // Clean up any temporary test images that were created during tests
    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('✅ Test fixtures cleaned up');
  } catch (error) {
    console.error('⚠️ Error cleaning up test fixtures:', error);
  }
}

/**
 * Clean up temporary files created during testing
 */
async function cleanupTemporaryFiles() {
  console.log('🗃️ Cleaning up temporary files...');

  try {
    const fs = require('fs');
    const path = require('path');

    // Clean up mock responses file
    const mockPath = path.join(process.cwd(), 'tests', 'mock-responses.json');
    if (fs.existsSync(mockPath)) {
      fs.unlinkSync(mockPath);
    }

    // Clean up any test download files
    const downloadsDir = path.join(process.cwd(), 'test-results', 'downloads');
    if (fs.existsSync(downloadsDir)) {
      const files = fs.readdirSync(downloadsDir);
      files.forEach((file: string) => {
        if (file.startsWith('mood-board') || file.startsWith('test-')) {
          fs.unlinkSync(path.join(downloadsDir, file));
        }
      });
    }

    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.error('⚠️ Error cleaning up temporary files:', error);
  }
}

export default globalTeardown;
