/**
 * WS-130: Global Playwright Setup for AI Photography Features
 * Handles test data preparation, mocks, and environment setup
 */

import { chromium, FullConfig } from '@playwright/test';
import { PhotoAiService } from '../../lib/ml/photo-ai-service';
import { PerformanceOptimizer } from '../../lib/ai/photography/performance-optimizer';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up AI Photography E2E tests...');

  // Launch browser for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app to ensure it's running
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
    await page.goto(baseURL);
    console.log('✅ Application is running');

    // Setup test data in database
    await setupTestData(page);

    // Initialize AI services
    await initializeAiServices();

    // Create test image fixtures
    await createTestImageFixtures();

    // Setup mock API responses
    await setupMockApiResponses();

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup test data in database
 */
async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');

  // Create test user and organization
  await page.evaluate(() => {
    // This would typically use API calls or direct DB operations
    window.localStorage.setItem(
      'test-user',
      JSON.stringify({
        id: 'test-user-1',
        email: 'test@wedsync.com',
        organizationId: 'test-org-1',
      }),
    );
  });

  // Create test photographer data
  const testPhotographers = [
    {
      id: 'photographer-1',
      name: 'John Smith Photography',
      style: 'romantic',
      location: 'New York',
      priceRange: '2000-5000',
      portfolio: [
        {
          id: 'photo-1',
          url: '/test-images/romantic-1.jpg',
          style: 'romantic',
        },
        {
          id: 'photo-2',
          url: '/test-images/romantic-2.jpg',
          style: 'romantic',
        },
      ],
    },
    {
      id: 'photographer-2',
      name: 'Modern Lens Studio',
      style: 'modern',
      location: 'Los Angeles',
      priceRange: '3000-7000',
      portfolio: [
        { id: 'photo-3', url: '/test-images/modern-1.jpg', style: 'modern' },
        { id: 'photo-4', url: '/test-images/modern-2.jpg', style: 'modern' },
      ],
    },
  ];

  await page.evaluate((photographers) => {
    window.localStorage.setItem(
      'test-photographers',
      JSON.stringify(photographers),
    );
  }, testPhotographers);

  console.log('✅ Test data setup completed');
}

/**
 * Initialize AI services with test configurations
 */
async function initializeAiServices() {
  console.log('🤖 Initializing AI services...');

  // Initialize performance optimizer with test settings
  const testConfig = {
    maxConcurrentJobs: 2,
    batchSize: 3,
    imageResizeThreshold: 1024 * 1024, // 1MB for tests
    cacheMaxSize: 10 * 1024 * 1024, // 10MB cache
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    timeoutMs: 10000, // 10 seconds for tests
  };

  // This would initialize the services in test mode
  process.env.OPENAI_TEST_MODE = 'true';
  process.env.AI_PHOTOGRAPHY_TEST_MODE = 'true';

  console.log('✅ AI services initialized');
}

/**
 * Create test image fixtures
 */
async function createTestImageFixtures() {
  console.log('🖼️ Creating test image fixtures...');

  const fs = require('fs');
  const path = require('path');

  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');

  // Create fixtures directory if it doesn't exist
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create placeholder test images (in a real implementation, these would be actual test images)
  const testImages = [
    'test-wedding.jpg',
    'preference-1.jpg',
    'preference-2.jpg',
    'romantic-1.jpg',
    'romantic-2.jpg',
    'modern-1.jpg',
    'modern-2.jpg',
  ];

  for (let i = 0; i < 10; i++) {
    testImages.push(`large-image-${i}.jpg`);
  }

  testImages.forEach((imageName) => {
    const imagePath = path.join(fixturesDir, imageName);
    if (!fs.existsSync(imagePath)) {
      // Create a minimal test image (1x1 pixel PNG)
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x3f, 0x6d, 0x22, 0x17, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(imagePath, minimalPng);
    }
  });

  console.log('✅ Test image fixtures created');
}

/**
 * Setup mock API responses for consistent testing
 */
async function setupMockApiResponses() {
  console.log('🔧 Setting up mock API responses...');

  // Store default mock responses in a global file for tests to use
  const mockResponses = {
    colorAnalysis: {
      dominantColors: ['#8B4513', '#F5F5DC', '#228B22'],
      harmony: 'complementary',
      mood: 'warm',
      confidence: 0.95,
    },
    styleMatching: {
      matches: [
        {
          id: 'photographer-1',
          name: 'John Smith Photography',
          compatibility: 0.92,
          reasons: ['Color palette alignment', 'Style consistency'],
        },
      ],
      styleAnalysis: {
        primary: 'romantic',
        secondary: 'natural',
        confidence: 0.88,
      },
    },
    moodBoardRecommendations: {
      recommendations: [
        {
          photoId: 'recommended-1',
          reason: 'Complements existing color palette',
          confidence: 0.87,
        },
      ],
      coherenceScore: 0.91,
    },
    performanceMetrics: {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 2500,
      memoryUsage: {
        current: 250,
        peak: 400,
        available: 1024,
      },
      cacheStats: {
        hits: 15,
        misses: 5,
        hitRate: 0.75,
        size: 5242880,
      },
    },
  };

  const fs = require('fs');
  const path = require('path');

  const mockPath = path.join(process.cwd(), 'tests', 'mock-responses.json');
  fs.writeFileSync(mockPath, JSON.stringify(mockResponses, null, 2));

  console.log('✅ Mock API responses configured');
}

export default globalSetup;
