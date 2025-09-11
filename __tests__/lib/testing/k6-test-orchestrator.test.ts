/**
 * WS-180 Performance Testing Framework - K6 Test Orchestrator Tests
 * Team B - Round 1 Implementation
 * 
 * Test suite for K6 test script generation and orchestration
 */

import { K6TestOrchestrator, TestConfiguration } from '@/lib/testing/k6-test-orchestrator';
import { writeFile, mkdir, unlink, access } from 'fs/promises';
import { spawn } from 'child_process';

// Mock file system operations
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('@/lib/supabase/server');

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockAccess = access as jest.MockedFunction<typeof access>;
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock EventEmitter for child process
class MockChildProcess extends require('events').EventEmitter {
  stdout = new (require('events').EventEmitter)();
  stderr = new (require('events').EventEmitter)();
  killed = false;
  
  kill(signal?: string) {
    this.killed = true;
    return true;
  }
}

describe('K6TestOrchestrator', () => {
  let orchestrator: K6TestOrchestrator;
  
  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new K6TestOrchestrator();
    
    // Default mock implementations
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);
  });

  describe('generateK6Script', () => {
    const mockConfig: TestConfiguration = {
      testType: 'load',
      testScenario: 'guest_list_import',
      userType: 'couple',
      weddingSizeCategory: 'medium',
      environment: 'staging',
      duration: '5m',
      virtualUsers: 50,
      rampUpTime: '2m',
      thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.01']
      },
      weddingSeasonLoad: true,
      peakTrafficMultiplier: 1.3,
      apiBaseUrl: 'https://staging-api.wedsync.com'
    };

    it('should generate k6 script for guest list import scenario', async () => {
      const scriptPath = await orchestrator.generateK6Script(mockConfig);
      
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('k6-scripts'), 
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('guest_list_import'),
        expect.stringContaining('k6 Performance Test Script - Guest List Import Flow'),
        'utf8'
      );
      expect(scriptPath).toContain('guest_list_import');
    });

    it('should apply wedding season load multiplier', async () => {
      await orchestrator.generateK6Script(mockConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      
      // Check that virtual users were adjusted for peak season
      const adjustedVUs = Math.floor(50 * 1.3); // 65 VUs
      expect(scriptContent).toContain(`target: ${adjustedVUs}`);
    });

    it('should generate different scenarios based on test type', async () => {
      const stressConfig = { ...mockConfig, testType: 'stress' as const };
      await orchestrator.generateK6Script(stressConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      expect(scriptContent).toContain('wedding_stress_test');
      expect(scriptContent).toContain('ramping-vus');
    });

    it('should include wedding-specific test data generators', async () => {
      await orchestrator.generateK6Script(mockConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      expect(scriptContent).toContain('generateGuestData');
      expect(scriptContent).toContain('getRandomWeddingDate');
      expect(scriptContent).toContain('getRandomSupplierCategory');
    });

    it('should include proper thresholds in script', async () => {
      await orchestrator.generateK6Script(mockConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      expect(scriptContent).toContain('p(95)<3000');
      expect(scriptContent).toContain('rate<0.01');
      expect(scriptContent).toContain('wedding_api_errors');
    });

    it('should handle photo upload scenario with appropriate settings', async () => {
      const photoConfig = { 
        ...mockConfig, 
        testScenario: 'photo_upload',
        userType: 'couple' as const
      };
      
      await orchestrator.generateK6Script(photoConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      expect(scriptContent).toContain('Wedding Photo Upload Flow');
      expect(scriptContent).toContain('photoUploadTime');
      expect(scriptContent).toContain('/api/photos/upload');
      expect(scriptContent).toContain('multipart/form-data');
    });

    it('should handle RSVP collection scenario with guest user type', async () => {
      const rsvpConfig = { 
        ...mockConfig, 
        testScenario: 'rsvp_collection',
        userType: 'guest' as const
      };
      
      await orchestrator.generateK6Script(rsvpConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      expect(scriptContent).toContain('RSVP Collection Flow');
      expect(scriptContent).toContain('/api/rsvp/');
      expect(scriptContent).toContain('sleep(15'); // Longer think time for forms
    });

    it('should generate spike test configuration', async () => {
      const spikeConfig = { ...mockConfig, testType: 'spike' as const };
      await orchestrator.generateK6Script(spikeConfig);
      
      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      expect(scriptContent).toContain('wedding_spike_test');
      expect(scriptContent).toContain('target: 150'); // 3x spike from 50 base users
    });

    it('should throw error for unknown test scenario', async () => {
      const invalidConfig = { 
        ...mockConfig, 
        testScenario: 'unknown_scenario' 
      };
      
      await expect(orchestrator.generateK6Script(invalidConfig))
        .rejects.toThrow('Unknown test scenario: unknown_scenario');
    });
  });

  describe('executeK6Test', () => {
    let mockChildProcess: MockChildProcess;

    beforeEach(() => {
      mockChildProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChildProcess as any);
    });

    it('should execute k6 test and parse results', async () => {
      const config: TestConfiguration = {
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '2m',
        virtualUsers: 10,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com'
      };

      const testId = 'test-123';
      const scriptPath = '/tmp/test-script.js';

      // Mock k6 output with metrics
      const mockOutput = `
        ✓ status is 200
        http_req_duration..........: avg=1200ms med=1100ms min=200ms max=5000ms p(90)=2000ms p(95)=2500ms p(99)=4000ms
        http_req_failed............: 0.50% ✓ 5  ✗ 995
        http_reqs..................: 1000  16.66/s
        iterations.................: 500   8.33/s
        vus........................: 10    min=1   max=10
        vus_max....................: 10    min=1   max=10
      `;

      // Execute the test asynchronously
      const testPromise = orchestrator.executeK6Test(scriptPath, config, testId);

      // Simulate k6 process events
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from(mockOutput));
        mockChildProcess.emit('close', 0); // Success exit code
      }, 10);

      const results = await testPromise;

      expect(results.success).toBe(true);
      expect(results.testId).toBe(testId);
      expect(results.metrics.http_req_duration.avg).toBe(1200);
      expect(results.metrics.http_req_duration.p95).toBe(2500);
      expect(results.metrics.http_req_failed).toBe(0.005); // 0.50% converted to decimal
      expect(results.metrics.http_reqs).toBe(1000);

      // Verify k6 was called with correct arguments
      expect(mockSpawn).toHaveBeenCalledWith('k6', 
        expect.arrayContaining([
          'run',
          '--out',
          expect.stringMatching(/json=.*test-123_results\.json/),
          '--summary-trend-stats',
          'avg,min,med,max,p(90),p(95),p(99)',
          '--summary-time-unit',
          'ms',
          scriptPath
        ]),
        expect.objectContaining({
          env: expect.objectContaining({
            API_BASE_URL: 'https://staging-api.wedsync.com',
            WEDDING_SEASON: 'false',
            PEAK_MULTIPLIER: '1'
          })
        })
      );
    });

    it('should handle k6 execution failure', async () => {
      const config: TestConfiguration = {
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '1m',
        virtualUsers: 5,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com'
      };

      const testPromise = orchestrator.executeK6Test('/tmp/test.js', config, 'test-fail');

      // Simulate k6 failure
      setTimeout(() => {
        mockChildProcess.stderr.emit('data', Buffer.from('k6 execution failed'));
        mockChildProcess.emit('close', 1); // Failure exit code
      }, 10);

      await expect(testPromise).rejects.toThrow('k6 test failed with exit code 1');
    });

    it('should handle process spawn error', async () => {
      const config: TestConfiguration = {
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '1m',
        virtualUsers: 5,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com'
      };

      const testPromise = orchestrator.executeK6Test('/tmp/test.js', config, 'test-error');

      // Simulate spawn error
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Command not found'));
      }, 10);

      await expect(testPromise).rejects.toThrow('Failed to start k6');
    });

    it('should timeout long-running tests', async () => {
      const config: TestConfiguration = {
        testType: 'endurance',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '60m', // Long test
        virtualUsers: 5,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com'
      };

      // Mock timers to speed up timeout test
      jest.useFakeTimers();

      const testPromise = orchestrator.executeK6Test('/tmp/test.js', config, 'test-timeout');

      // Fast-forward past timeout
      jest.advanceTimersByTime(30 * 60 * 1000 + 1000); // 30 minutes + 1 second

      await expect(testPromise).rejects.toThrow('timed out');

      jest.useRealTimers();
    });
  });

  describe('cancelTest', () => {
    it('should cancel running test', async () => {
      const mockChildProcess = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChildProcess as any);

      // Start a test
      const config: TestConfiguration = {
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '10m',
        virtualUsers: 50,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com'
      };

      const testId = 'test-cancel';
      orchestrator.executeK6Test('/tmp/test.js', config, testId);

      // Cancel the test
      const cancelled = await orchestrator.cancelTest(testId);

      expect(cancelled).toBe(true);
      expect(mockChildProcess.killed).toBe(true);
    });

    it('should return false for non-existent test', async () => {
      const cancelled = await orchestrator.cancelTest('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('wedding-specific scenario generation', () => {
    it('should generate supplier search scenario correctly', async () => {
      const supplierConfig: TestConfiguration = {
        testType: 'load',
        testScenario: 'supplier_search',
        userType: 'couple',
        weddingSizeCategory: 'large',
        environment: 'production',
        duration: '5m',
        virtualUsers: 30,
        thresholds: {},
        weddingSeasonLoad: true,
        peakTrafficMultiplier: 1.4,
        apiBaseUrl: 'https://api.wedsync.com'
      };

      await orchestrator.generateK6Script(supplierConfig);

      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      
      expect(scriptContent).toContain('Supplier Search and Discovery');
      expect(scriptContent).toContain('/api/suppliers/search');
      expect(scriptContent).toContain('/api/suppliers/${SUPPLIER_ID}');
      expect(scriptContent).toContain('/api/suppliers/${SUPPLIER_ID}/availability');
      expect(scriptContent).toContain('sleep(10'); // 10 second think time for supplier search
      
      // Check wedding season adjustment
      const adjustedVUs = Math.floor(30 * 1.4); // 42 VUs
      expect(scriptContent).toContain(`target: ${adjustedVUs}`);
    });

    it('should generate real-time notifications scenario', async () => {
      const notificationConfig: TestConfiguration = {
        testType: 'load',
        testScenario: 'realtime_notifications',
        userType: 'supplier',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '3m',
        virtualUsers: 100,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com'
      };

      await orchestrator.generateK6Script(notificationConfig);

      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      
      expect(scriptContent).toContain('Real-time Notification System');
      expect(scriptContent).toContain('/api/notifications/subscribe');
      expect(scriptContent).toContain('/api/notifications/poll');
      expect(scriptContent).toContain('/api/tasks/update-status');
      expect(scriptContent).toContain('sleep(1'); // 1 second think time for real-time
    });

    it('should include wedding-specific headers and authentication', async () => {
      const config: TestConfiguration = {
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        duration: '2m',
        virtualUsers: 10,
        thresholds: {},
        weddingSeasonLoad: false,
        peakTrafficMultiplier: 1.0,
        apiBaseUrl: 'https://staging-api.wedsync.com',
        authToken: 'test-auth-token'
      };

      await orchestrator.generateK6Script(config);

      const scriptContent = mockWriteFile.mock.calls[0][1] as string;
      
      expect(scriptContent).toContain("'Authorization': `Bearer ${data.authToken}`");
      expect(scriptContent).toContain("'User-Agent': 'k6-wedding-performance-test/1.0'");
      expect(scriptContent).toContain('AUTH_TOKEN');
    });
  });
});