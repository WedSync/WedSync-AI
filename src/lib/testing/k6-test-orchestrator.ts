/**
 * WS-180 Performance Testing Framework - K6 Test Orchestrator
 * Team B - Round 1 Implementation
 *
 * Manages k6 test script generation, execution, and results processing
 * with wedding-specific scenarios and realistic user behavior patterns.
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFile, mkdir, unlink, access } from 'fs/promises';
import { join, dirname } from 'path';
import { createClient } from '@/lib/supabase/server';
import type { PerformanceTestResults } from './performance-monitor';

export interface TestConfiguration {
  testType: 'load' | 'stress' | 'spike' | 'endurance' | 'volume' | 'smoke';
  testScenario: string;
  userType: 'couple' | 'supplier' | 'admin' | 'guest' | 'anonymous';
  weddingSizeCategory: 'small' | 'medium' | 'large' | 'xl';
  environment: 'development' | 'staging' | 'production';

  // Test execution parameters
  duration: string; // e.g., '5m', '1h'
  virtualUsers: number;
  rampUpTime?: string; // e.g., '2m'
  thresholds: Record<string, string[]>;

  // Wedding-specific configuration
  weddingSeasonLoad: boolean;
  peakTrafficMultiplier: number;

  // Authentication
  apiBaseUrl: string;
  authToken?: string;

  // Custom options
  customOptions?: Record<string, any>;
}

export interface K6TestResults {
  testId: string;
  success: boolean;
  metrics: {
    http_req_duration: {
      avg: number;
      med: number;
      min: number;
      max: number;
      p90: number;
      p95: number;
      p99: number;
    };
    http_req_failed: number;
    http_reqs: number;
    iterations: number;
    vus: number;
    vus_max: number;
    [key: string]: any;
  };
  duration: number;
  rawOutput: string;
  errors: string[];
}

export interface TestScriptTemplate {
  name: string;
  description: string;
  userType: string;
  weddingContext: string;
  endpoints: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    payload?: any;
    headers?: Record<string, string>;
    expectedStatus: number;
    tags: Record<string, string>;
  }[];
  thinkTime: number; // seconds between requests
  setupScript?: string;
  teardownScript?: string;
}

/**
 * K6 Test Orchestrator for wedding-specific performance testing
 */
export class K6TestOrchestrator {
  private supabase;
  private readonly scriptsPath: string;
  private readonly resultsPath: string;
  private runningTests: Map<string, ChildProcess> = new Map();

  // Wedding-specific test scenario templates
  private readonly testScenarios: Record<string, TestScriptTemplate> = {
    guest_list_import: {
      name: 'Guest List Import Flow',
      description:
        'Tests bulk guest data import and processing during planning phase',
      userType: 'couple',
      weddingContext: 'Pre-wedding planning phase with large guest lists',
      endpoints: [
        {
          path: '/api/guests/import',
          method: 'POST',
          payload: { guests: '${GUEST_DATA}' },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'guest_import', phase: 'bulk_upload' },
        },
        {
          path: '/api/guests/validate',
          method: 'POST',
          payload: { importId: '${IMPORT_ID}' },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'guest_import', phase: 'validation' },
        },
        {
          path: '/api/guests',
          method: 'GET',
          expectedStatus: 200,
          tags: { scenario: 'guest_import', phase: 'list_view' },
        },
      ],
      thinkTime: 2,
    },

    photo_upload: {
      name: 'Wedding Photo Upload Flow',
      description:
        'Tests photo upload during event documentation with large files',
      userType: 'couple',
      weddingContext: 'Post-wedding photo sharing and album creation',
      endpoints: [
        {
          path: '/api/photos/upload',
          method: 'POST',
          payload: { photo: '${PHOTO_DATA}', albumId: '${ALBUM_ID}' },
          headers: { 'Content-Type': 'multipart/form-data' },
          expectedStatus: 201,
          tags: { scenario: 'photo_upload', type: 'single_upload' },
        },
        {
          path: '/api/photos/batch-upload',
          method: 'POST',
          payload: { photos: '${BATCH_PHOTOS}' },
          headers: { 'Content-Type': 'multipart/form-data' },
          expectedStatus: 202,
          tags: { scenario: 'photo_upload', type: 'batch_upload' },
        },
        {
          path: '/api/photos/albums/${ALBUM_ID}',
          method: 'GET',
          expectedStatus: 200,
          tags: { scenario: 'photo_upload', phase: 'album_view' },
        },
      ],
      thinkTime: 5,
    },

    rsvp_collection: {
      name: 'RSVP Collection Flow',
      description: 'Tests guest RSVP submission during deadline periods',
      userType: 'guest',
      weddingContext: 'Peak RSVP submission period before deadline',
      endpoints: [
        {
          path: '/api/rsvp/${INVITE_TOKEN}',
          method: 'GET',
          expectedStatus: 200,
          tags: { scenario: 'rsvp', phase: 'form_load' },
        },
        {
          path: '/api/rsvp/${INVITE_TOKEN}',
          method: 'POST',
          payload: {
            attending: '${ATTENDING}',
            dietary_restrictions: '${DIETARY}',
            plus_ones: '${PLUS_ONES}',
          },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'rsvp', phase: 'submission' },
        },
        {
          path: '/api/rsvp/${INVITE_TOKEN}/confirmation',
          method: 'GET',
          expectedStatus: 200,
          tags: { scenario: 'rsvp', phase: 'confirmation' },
        },
      ],
      thinkTime: 15, // Guests take time to fill out forms
    },

    supplier_search: {
      name: 'Supplier Search and Discovery',
      description:
        'Tests supplier search functionality during vendor selection',
      userType: 'couple',
      weddingContext:
        'Vendor selection phase with location and criteria filtering',
      endpoints: [
        {
          path: '/api/suppliers/search',
          method: 'POST',
          payload: {
            category: '${CATEGORY}',
            location: '${LOCATION}',
            budget_range: '${BUDGET}',
            date: '${WEDDING_DATE}',
          },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'supplier_search', phase: 'search' },
        },
        {
          path: '/api/suppliers/${SUPPLIER_ID}',
          method: 'GET',
          expectedStatus: 200,
          tags: { scenario: 'supplier_search', phase: 'detail_view' },
        },
        {
          path: '/api/suppliers/${SUPPLIER_ID}/availability',
          method: 'POST',
          payload: { date: '${WEDDING_DATE}' },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'supplier_search', phase: 'availability_check' },
        },
      ],
      thinkTime: 10,
    },

    realtime_notifications: {
      name: 'Real-time Notification System',
      description: 'Tests real-time updates and notification delivery',
      userType: 'supplier',
      weddingContext: 'Live coordination during wedding day',
      endpoints: [
        {
          path: '/api/notifications/subscribe',
          method: 'POST',
          payload: { channels: ['wedding_updates', 'task_assignments'] },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'notifications', phase: 'subscribe' },
        },
        {
          path: '/api/notifications/poll',
          method: 'GET',
          expectedStatus: 200,
          tags: { scenario: 'notifications', phase: 'poll' },
        },
        {
          path: '/api/tasks/update-status',
          method: 'POST',
          payload: { taskId: '${TASK_ID}', status: 'completed' },
          headers: { 'Content-Type': 'application/json' },
          expectedStatus: 200,
          tags: { scenario: 'notifications', phase: 'status_update' },
        },
      ],
      thinkTime: 1, // Fast-paced real-time scenarios
    },
  };

  constructor() {
    this.supabase = createClient();
    this.scriptsPath = join(process.cwd(), 'temp', 'k6-scripts');
    this.resultsPath = join(process.cwd(), 'temp', 'k6-results');
  }

  /**
   * Generates a k6 test script based on configuration and wedding scenario
   */
  async generateK6Script(config: TestConfiguration): Promise<string> {
    try {
      await mkdir(this.scriptsPath, { recursive: true });

      const template = this.testScenarios[config.testScenario];
      if (!template) {
        throw new Error(`Unknown test scenario: ${config.testScenario}`);
      }

      // Generate k6 script with TypeScript-style syntax
      const script = this.buildK6Script(config, template);

      const scriptPath = join(
        this.scriptsPath,
        `${config.testScenario}_${Date.now()}.js`,
      );
      await writeFile(scriptPath, script, 'utf8');

      console.log(`Generated k6 script: ${scriptPath}`);
      return scriptPath;
    } catch (error) {
      console.error('Error generating k6 script:', error);
      throw new Error(`Failed to generate k6 script: ${error}`);
    }
  }

  /**
   * Executes a k6 test with progress monitoring
   */
  async executeK6Test(
    scriptPath: string,
    config: TestConfiguration,
    testId: string,
  ): Promise<K6TestResults> {
    try {
      await mkdir(this.resultsPath, { recursive: true });

      const outputPath = join(this.resultsPath, `${testId}_results.json`);

      // Build k6 command with options
      const k6Args = [
        'run',
        '--out',
        `json=${outputPath}`,
        '--summary-trend-stats',
        'avg,min,med,max,p(90),p(95),p(99)',
        '--summary-time-unit',
        'ms',
        scriptPath,
      ];

      // Add environment variables
      const env = {
        ...process.env,
        API_BASE_URL: config.apiBaseUrl,
        AUTH_TOKEN: config.authToken || '',
        WEDDING_SEASON: config.weddingSeasonLoad.toString(),
        PEAK_MULTIPLIER: config.peakTrafficMultiplier.toString(),
      };

      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';

        // Start k6 process
        const k6Process = spawn('k6', k6Args, {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Store running process for potential cancellation
        this.runningTests.set(testId, k6Process);

        k6Process.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          stdout += output;
          console.log(`k6 [${testId}]:`, output.trim());

          // Update test status in database with progress
          this.updateTestProgress(testId, output);
        });

        k6Process.stderr.on('data', (data: Buffer) => {
          const error = data.toString();
          stderr += error;
          console.error(`k6 Error [${testId}]:`, error.trim());
        });

        k6Process.on('close', async (code) => {
          this.runningTests.delete(testId);
          const duration = Date.now() - startTime;

          try {
            if (code === 0) {
              // Parse results from JSON output
              const results = await this.parseK6Results(
                outputPath,
                testId,
                duration,
                stdout,
                stderr,
              );

              // Clean up temporary files
              await this.cleanupTempFiles(scriptPath, outputPath);

              resolve(results);
            } else {
              reject(
                new Error(`k6 test failed with exit code ${code}: ${stderr}`),
              );
            }
          } catch (error) {
            reject(error);
          }
        });

        k6Process.on('error', (error) => {
          this.runningTests.delete(testId);
          reject(new Error(`Failed to start k6: ${error.message}`));
        });

        // Timeout handling
        setTimeout(
          () => {
            if (this.runningTests.has(testId)) {
              k6Process.kill('SIGTERM');
              this.runningTests.delete(testId);
              reject(new Error(`Test ${testId} timed out`));
            }
          },
          30 * 60 * 1000,
        ); // 30 minute timeout
      });
    } catch (error) {
      console.error('Error executing k6 test:', error);
      throw new Error(`Failed to execute k6 test: ${error}`);
    }
  }

  /**
   * Cancels a running k6 test
   */
  async cancelTest(testId: string): Promise<boolean> {
    const process = this.runningTests.get(testId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      this.runningTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * Builds the k6 test script with wedding-specific scenarios
   */
  private buildK6Script(
    config: TestConfiguration,
    template: TestScriptTemplate,
  ): string {
    // Apply wedding season load multiplier
    const adjustedVUs = Math.floor(
      config.virtualUsers *
        (config.weddingSeasonLoad ? config.peakTrafficMultiplier : 1),
    );

    const script = `
// k6 Performance Test Script - ${template.name}
// Generated for WedSync WS-180 Performance Testing Framework
// Test Type: ${config.testType}
// Scenario: ${config.testScenario}
// Wedding Context: ${template.weddingContext}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for wedding-specific tracking
const weddingApiErrors = new Rate('wedding_api_errors');
const weddingResponseTime = new Trend('wedding_response_time');
const guestOperationTime = new Trend('guest_operation_duration');
const photoUploadTime = new Trend('photo_upload_duration');

// Test configuration
export const options = {
  ${this.generateK6Options(config, adjustedVUs)},
  
  // Wedding-specific thresholds
  thresholds: {
    http_req_duration: ['p(95)<${this.getThresholdForScenario(config.testScenario, 'p95')}'],
    http_req_failed: ['rate<${this.getThresholdForScenario(config.testScenario, 'error_rate')}'],
    http_reqs: ['rate>${this.getThresholdForScenario(config.testScenario, 'throughput')}'],
    wedding_api_errors: ['rate<0.02'], // 2% error rate for wedding APIs
    wedding_response_time: ['p(99)<${this.getThresholdForScenario(config.testScenario, 'p99')}'],
    ...${JSON.stringify(config.thresholds)}
  }
};

// Global test data for wedding scenarios
const API_BASE_URL = __ENV.API_BASE_URL || '${config.apiBaseUrl}';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const WEDDING_SEASON = __ENV.WEDDING_SEASON === 'true';

// Wedding-specific test data generators
${this.generateTestDataGenerators(template)}

// Setup function - runs once before all VUs
export function setup() {
  console.log('Setting up ${template.name} performance test...');
  console.log('Wedding Season Load:', WEDDING_SEASON);
  console.log('Virtual Users:', ${adjustedVUs});
  console.log('Test Duration:', '${config.duration}');
  
  ${template.setupScript || ''}
  
  return {
    baseUrl: API_BASE_URL,
    authToken: AUTH_TOKEN,
    weddingSeason: WEDDING_SEASON
  };
}

// Main test function - runs for each VU iteration
export default function(data) {
  const baseUrl = data.baseUrl;
  const headers = {
    'Authorization': \`Bearer \${data.authToken}\`,
    'Content-Type': 'application/json',
    'User-Agent': 'k6-wedding-performance-test/1.0'
  };

  ${this.generateTestSteps(template)}
  
  // Wedding-appropriate think time based on user behavior
  sleep(${template.thinkTime} * (WEDDING_SEASON ? 1.2 : 0.8)); // Longer during peak season
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  console.log('Cleaning up ${template.name} performance test...');
  ${template.teardownScript || ''}
}

${this.generateHelperFunctions(template)}
`;

    return script;
  }

  /**
   * Generates k6 options based on test configuration
   */
  private generateK6Options(
    config: TestConfiguration,
    adjustedVUs: number,
  ): string {
    switch (config.testType) {
      case 'load':
        return `
  scenarios: {
    wedding_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '${config.rampUpTime || '2m'}', target: ${Math.floor(adjustedVUs * 0.5)} },
        { duration: '${config.duration}', target: ${adjustedVUs} },
        { duration: '${config.rampUpTime || '2m'}', target: 0 }
      ]
    }
  }`;

      case 'stress':
        return `
  scenarios: {
    wedding_stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: ${adjustedVUs} },
        { duration: '5m', target: ${adjustedVUs} },
        { duration: '2m', target: ${Math.floor(adjustedVUs * 1.5)} },
        { duration: '5m', target: ${Math.floor(adjustedVUs * 1.5)} },
        { duration: '2m', target: ${Math.floor(adjustedVUs * 2)} },
        { duration: '5m', target: ${Math.floor(adjustedVUs * 2)} },
        { duration: '10m', target: 0 }
      ]
    }
  }`;

      case 'spike':
        return `
  scenarios: {
    wedding_spike_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: ${Math.floor(adjustedVUs * 0.2)} },
        { duration: '1m', target: ${adjustedVUs * 3} }, // Sudden spike
        { duration: '30s', target: ${Math.floor(adjustedVUs * 0.2)} },
        { duration: '1m', target: 0 }
      ]
    }
  }`;

      case 'endurance':
        return `
  scenarios: {
    wedding_endurance_test: {
      executor: 'constant-vus',
      vus: ${adjustedVUs},
      duration: '${config.duration}'
    }
  }`;

      case 'smoke':
        return `
  scenarios: {
    wedding_smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '${config.duration}'
    }
  }`;

      default:
        return `
  vus: ${adjustedVUs},
  duration: '${config.duration}'`;
    }
  }

  /**
   * Generates test data generators for wedding scenarios
   */
  private generateTestDataGenerators(template: TestScriptTemplate): string {
    return `
// Wedding-specific test data generators
function generateGuestData() {
  const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson'];
  return names.map((name, i) => ({
    name: name,
    email: \`guest\${i}@example.com\`,
    phone: \`555-000\${String(i).padStart(4, '0')}\`,
    attending: Math.random() > 0.3,
    dietary_restrictions: Math.random() > 0.8 ? 'Vegetarian' : null,
    plus_ones: Math.random() > 0.6 ? 1 : 0
  }));
}

function generatePhotoData() {
  // Simulate photo upload data (base64 would be too large for k6)
  return {
    filename: \`wedding_photo_\${Date.now()}.jpg\`,
    size: Math.floor(Math.random() * 5000000) + 1000000, // 1-5MB
    type: 'image/jpeg'
  };
}

function getRandomWeddingDate() {
  const dates = [
    '2025-06-15', '2025-09-20', '2025-05-10', '2025-10-05', '2025-08-14'
  ];
  return dates[Math.floor(Math.random() * dates.length)];
}

function getRandomSupplierCategory() {
  const categories = ['photographer', 'caterer', 'venue', 'florist', 'dj', 'videographer'];
  return categories[Math.floor(Math.random() * categories.length)];
}
`;
  }

  /**
   * Generates test steps based on template endpoints
   */
  private generateTestSteps(template: TestScriptTemplate): string {
    return template.endpoints
      .map(
        (endpoint, index) => `
  // Step ${index + 1}: ${endpoint.tags.phase || endpoint.method + ' ' + endpoint.path}
  {
    const url = \`\${baseUrl}${endpoint.path.replace(/\$\{([^}]+)\}/g, '${$1}')}\`;
    ${this.generateRequestData(endpoint)}
    
    const response = http.${endpoint.method.toLowerCase()}(url, payload, { headers: { ...headers, ...customHeaders } });
    
    const success = check(response, {
      'status is ${endpoint.expectedStatus}': (r) => r.status === ${endpoint.expectedStatus},
      'response time < 5s': (r) => r.timings.duration < 5000,
      'response has body': (r) => r.body.length > 0
    });
    
    // Record custom metrics
    weddingApiErrors.add(!success);
    weddingResponseTime.add(response.timings.duration);
    
    ${this.generateScenarioSpecificChecks(template.name, endpoint)}
    
    if (!success) {
      console.error(\`Request failed: \${url} - Status: \${response.status}\`);
    }
  }`,
      )
      .join('\n');
  }

  /**
   * Generates request data for each endpoint
   */
  private generateRequestData(endpoint: any): string {
    if (endpoint.method === 'GET') {
      return `
    const payload = null;
    const customHeaders = {};`;
    }

    const payloadStr = JSON.stringify(endpoint.payload || {})
      .replace(/"\$\{([^}]+)\}"/g, '${$1}')
      .replace(/"\$\{([^}]+)\}"/g, '${$1}');

    return `
    const payload = JSON.stringify(${payloadStr});
    const customHeaders = ${JSON.stringify(endpoint.headers || {})};`;
  }

  /**
   * Generates scenario-specific performance checks
   */
  private generateScenarioSpecificChecks(
    scenarioName: string,
    endpoint: any,
  ): string {
    if (
      scenarioName.includes('Photo Upload') &&
      endpoint.path.includes('photo')
    ) {
      return `
    // Photo upload specific metrics
    photoUploadTime.add(response.timings.duration);
    check(response, {
      'photo upload time < 10s': (r) => r.timings.duration < 10000
    });`;
    }

    if (
      scenarioName.includes('Guest List') &&
      endpoint.path.includes('guest')
    ) {
      return `
    // Guest operation specific metrics
    guestOperationTime.add(response.timings.duration);
    check(response, {
      'guest operation time < 3s': (r) => r.timings.duration < 3000
    });`;
    }

    return '';
  }

  /**
   * Generates helper functions for the k6 script
   */
  private generateHelperFunctions(template: TestScriptTemplate): string {
    return `
// Helper functions for ${template.name}
function logTestProgress(phase, duration) {
  console.log(\`[WEDDING TEST] \${phase} completed in \${duration}ms\`);
}

function handleApiError(response, context) {
  if (response.status >= 400) {
    console.error(\`API Error in \${context}: \${response.status} - \${response.body}\`);
    return false;
  }
  return true;
}

// Wedding-specific validation helpers
function validateWeddingResponse(response, expectedFields) {
  if (!response.json) return false;
  
  const data = response.json();
  return expectedFields.every(field => data.hasOwnProperty(field));
}
`;
  }

  /**
   * Gets performance threshold for specific scenario and metric
   */
  private getThresholdForScenario(scenario: string, metric: string): string {
    const thresholds = {
      guest_list_import: {
        p95: '3000',
        p99: '5000',
        error_rate: '0.01',
        throughput: '20',
      },
      photo_upload: {
        p95: '6000',
        p99: '10000',
        error_rate: '0.02',
        throughput: '10',
      },
      rsvp_collection: {
        p95: '1500',
        p99: '2500',
        error_rate: '0.005',
        throughput: '50',
      },
      supplier_search: {
        p95: '2500',
        p99: '4000',
        error_rate: '0.01',
        throughput: '30',
      },
      realtime_notifications: {
        p95: '500',
        p99: '1000',
        error_rate: '0.005',
        throughput: '100',
      },
    };

    return (
      thresholds[scenario as keyof typeof thresholds]?.[
        metric as keyof (typeof thresholds)[keyof typeof thresholds]
      ] || '3000'
    );
  }

  /**
   * Parses k6 JSON results into structured format
   */
  private async parseK6Results(
    outputPath: string,
    testId: string,
    duration: number,
    stdout: string,
    stderr: string,
  ): Promise<K6TestResults> {
    try {
      // Check if results file exists
      await access(outputPath);

      // For now, parse from stdout summary since k6 JSON output can be large
      const metrics = this.extractMetricsFromOutput(stdout);

      return {
        testId,
        success: true,
        metrics,
        duration,
        rawOutput: stdout,
        errors: stderr ? [stderr] : [],
      };
    } catch (error) {
      console.error('Error parsing k6 results:', error);
      return {
        testId,
        success: false,
        metrics: {
          http_req_duration: {
            avg: 0,
            med: 0,
            min: 0,
            max: 0,
            p90: 0,
            p95: 0,
            p99: 0,
          },
          http_req_failed: 0,
          http_reqs: 0,
          iterations: 0,
          vus: 0,
          vus_max: 0,
        },
        duration,
        rawOutput: stdout,
        errors: [`Failed to parse results: ${error}`],
      };
    }
  }

  /**
   * Extracts metrics from k6 stdout output
   */
  private extractMetricsFromOutput(output: string): K6TestResults['metrics'] {
    const metrics: K6TestResults['metrics'] = {
      http_req_duration: {
        avg: 0,
        med: 0,
        min: 0,
        max: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      },
      http_req_failed: 0,
      http_reqs: 0,
      iterations: 0,
      vus: 0,
      vus_max: 0,
    };

    try {
      // Parse http_req_duration metrics
      const durationMatch = output.match(
        /http_req_duration[.\s]*avg=([\d.]+).*med=([\d.]+).*min=([\d.]+).*max=([\d.]+).*p\(90\)=([\d.]+).*p\(95\)=([\d.]+).*p\(99\)=([\d.]+)/,
      );
      if (durationMatch) {
        metrics.http_req_duration = {
          avg: parseFloat(durationMatch[1]),
          med: parseFloat(durationMatch[2]),
          min: parseFloat(durationMatch[3]),
          max: parseFloat(durationMatch[4]),
          p90: parseFloat(durationMatch[5]),
          p95: parseFloat(durationMatch[6]),
          p99: parseFloat(durationMatch[7]),
        };
      }

      // Parse other metrics
      const failedMatch = output.match(/http_req_failed[.\s]*(\d+\.?\d*)%/);
      if (failedMatch) {
        metrics.http_req_failed = parseFloat(failedMatch[1]) / 100;
      }

      const reqsMatch = output.match(/http_reqs[.\s]*(\d+)/);
      if (reqsMatch) {
        metrics.http_reqs = parseInt(reqsMatch[1]);
      }

      const iterationsMatch = output.match(/iterations[.\s]*(\d+)/);
      if (iterationsMatch) {
        metrics.iterations = parseInt(iterationsMatch[1]);
      }

      const vusMatch = output.match(/vus[.\s]*(\d+)/);
      if (vusMatch) {
        metrics.vus = parseInt(vusMatch[1]);
      }

      const vusMaxMatch = output.match(/vus_max[.\s]*(\d+)/);
      if (vusMaxMatch) {
        metrics.vus_max = parseInt(vusMaxMatch[1]);
      }
    } catch (error) {
      console.error('Error extracting metrics from output:', error);
    }

    return metrics;
  }

  /**
   * Updates test progress in database
   */
  private async updateTestProgress(
    testId: string,
    output: string,
  ): Promise<void> {
    try {
      // Parse progress indicators from k6 output
      let progress = 0;
      let currentPhase = 'Running';

      if (output.includes('setup()')) {
        progress = 10;
        currentPhase = 'Setup phase';
      } else if (output.includes('running')) {
        progress = 50;
        currentPhase = 'Load test execution';
      } else if (output.includes('teardown()')) {
        progress = 90;
        currentPhase = 'Cleanup phase';
      }

      await this.supabase
        .from('performance_test_runs')
        .update({
          status: 'running',
          notes: `Progress: ${progress}% - ${currentPhase}`,
        })
        .eq('id', testId);
    } catch (error) {
      console.error('Error updating test progress:', error);
    }
  }

  /**
   * Cleans up temporary files after test completion
   */
  private async cleanupTempFiles(...filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await unlink(filePath);
      } catch (error) {
        console.warn(`Could not clean up file ${filePath}:`, error);
      }
    }
  }
}

// Export singleton instance
export const k6TestOrchestrator = new K6TestOrchestrator();
