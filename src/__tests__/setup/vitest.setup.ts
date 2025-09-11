/**
 * Global Vitest Setup for WedSync Test Suite
 * Ensures consistent browser API mocking across all tests
 */

import { beforeEach, afterEach } from 'vitest';
import { setupBrowserMocks, resetBrowserMocks } from './browser-api-mocks';
import { ensureTestEnvironment } from './test-environment';

// Global test environment setup
beforeEach(() => {
  ensureTestEnvironment();
  setupBrowserMocks();
  resetBrowserMocks();
});

afterEach(() => {
  resetBrowserMocks();
});
