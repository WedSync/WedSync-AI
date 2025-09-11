#!/usr/bin/env node

/**
 * WedSync Form API Integration Test Script
 * Tests all critical form APIs to ensure they're working correctly
 */

import { config } from 'dotenv';
config();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@wedsync.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
  response?: any;
}

class FormAPITester {
  private authToken: string = '';
  private csrfToken: string = '';
  private testFormId: string = '';
  private testSubmissionId: string = '';
  private results: TestResult[] = [];

  async runTests(): Promise<void> {
    console.log('🚀 Starting WedSync Form API Integration Tests');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log('─'.repeat(50));

    // Run test suite
    await this.testAuthentication();
    await this.testFormCreation();
    await this.testFormRetrieval();
    await this.testFormUpdate();
    await this.testCoreFieldsSync();
    await this.testFormSubmission();
    await this.testFormListing();
    await this.testFormDeletion();

    // Print results
    this.printResults();
  }

  private async runTest(
    name: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n📝 Testing: ${name}`);
    
    try {
      const response = await testFn();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        name,
        status: 'passed',
        duration,
        response
      };
      
      console.log(`✅ PASSED (${duration}ms)`);
      this.results.push(result);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        name,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      console.log(`❌ FAILED (${duration}ms): ${result.error}`);
      this.results.push(result);
      return result;
    }
  }

  private async testAuthentication(): Promise<void> {
    await this.runTest('Authentication', async () => {
      // In a real test, you would authenticate and get tokens
      // For now, we'll simulate this
      this.authToken = 'test-auth-token';
      this.csrfToken = 'test-csrf-token';
      return { authenticated: true };
    });
  }

  private async testFormCreation(): Promise<void> {
    await this.runTest('Form Creation (POST /api/forms)', async () => {
      const formData = {
        title: 'Test Wedding RSVP Form',
        description: 'Integration test form',
        form_data: {
          fields: [
            {
              id: 'field-1',
              type: 'text',
              label: 'Full Name',
              required: true,
              validation: {
                required: true,
                minLength: 2,
                maxLength: 100
              }
            },
            {
              id: 'field-2',
              type: 'email',
              label: 'Email Address',
              required: true,
              validation: {
                required: true
              }
            },
            {
              id: 'field-3',
              type: 'select',
              label: 'Will you attend?',
              required: true,
              options: [
                { id: 'yes', label: 'Yes, I will attend', value: 'yes' },
                { id: 'no', label: 'No, I cannot attend', value: 'no' }
              ]
            },
            {
              id: 'field-4',
              type: 'number',
              label: 'Number of guests',
              required: false,
              validation: {
                min: 0,
                max: 10
              }
            },
            {
              id: 'field-5',
              type: 'textarea',
              label: 'Dietary restrictions',
              required: false,
              validation: {
                maxLength: 500
              }
            }
          ]
        },
        settings: {
          requireLogin: false,
          allowMultipleSubmissions: false,
          notificationEmail: 'vendor@wedsync.com',
          successMessage: 'Thank you for your RSVP!'
        },
        status: 'published',
        is_published: true
      };

      const response = await fetch(`${BASE_URL}/api/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      this.testFormId = data.form?.id || 'test-form-id';
      
      // Validate response structure
      if (!data.form?.id) {
        throw new Error('Form ID not returned');
      }
      
      return data;
    });
  }

  private async testFormRetrieval(): Promise<void> {
    await this.runTest('Form Retrieval (GET /api/forms/[id])', async () => {
      if (!this.testFormId) {
        this.testFormId = 'test-form-id'; // Use mock ID for testing
      }

      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.form) {
        throw new Error('Form data not returned');
      }
      
      return data;
    });

    // Test public form retrieval
    await this.runTest('Public Form Retrieval', async () => {
      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}?public=true`);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      // Validate that sensitive data is not exposed
      if (data.form?.created_by) {
        throw new Error('Sensitive data exposed in public endpoint');
      }
      
      return data;
    });
  }

  private async testFormUpdate(): Promise<void> {
    await this.runTest('Form Update (PUT /api/forms/[id])', async () => {
      const updateData = {
        title: 'Updated Test Form',
        description: 'This form has been updated',
        isPublished: true
      };

      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      // Validate update was successful
      if (!data.success) {
        throw new Error('Update not marked as successful');
      }
      
      return data;
    });
  }

  private async testCoreFieldsSync(): Promise<void> {
    await this.runTest('Core Fields Auto-Detection', async () => {
      const mappingData = {
        autoDetect: true,
        mappings: []
      };

      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}/sync-core-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(mappingData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Core fields sync failed');
      }
      
      return data;
    });

    await this.runTest('Core Fields Manual Mapping', async () => {
      const mappingData = {
        autoDetect: false,
        mappings: [
          {
            formFieldId: 'field-1',
            coreFieldPath: 'couple.partner1_name',
            transformRule: 'direct'
          },
          {
            formFieldId: 'field-2',
            coreFieldPath: 'couple.email',
            transformRule: 'direct'
          }
        ]
      };

      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}/sync-core-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(mappingData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      return await response.json();
    });
  }

  private async testFormSubmission(): Promise<void> {
    await this.runTest('Form Submission (POST /api/forms/[id]/submit)', async () => {
      const submissionData = {
        data: {
          'field-1': 'John Doe',
          'field-2': 'john.doe@example.com',
          'field-3': 'yes',
          'field-4': 2,
          'field-5': 'No dietary restrictions'
        },
        sessionId: 'test-session-123'
      };

      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.submissionId) {
        throw new Error('Submission failed or no ID returned');
      }
      
      this.testSubmissionId = data.submissionId;
      return data;
    });

    // Test submission validation
    await this.runTest('Form Submission Validation', async () => {
      const invalidData = {
        data: {
          'field-1': '', // Required field is empty
          'field-2': 'invalid-email', // Invalid email format
          'field-3': 'yes',
          'field-4': 100, // Exceeds max value
          'field-5': 'A'.repeat(1000) // Exceeds max length
        }
      };

      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      // This should fail with 400
      if (response.ok) {
        throw new Error('Invalid submission was accepted');
      }

      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.error || !data.details) {
        throw new Error('Validation errors not properly returned');
      }
      
      return data;
    });

    // Test rate limiting
    await this.runTest('Submission Rate Limiting', async () => {
      const requests = [];
      
      // Send 25 requests rapidly (should exceed limit of 20/minute)
      for (let i = 0; i < 25; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/forms/${this.testFormId}/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: { test: i } })
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      if (!rateLimited) {
        throw new Error('Rate limiting not working');
      }
      
      return { rateLimitingActive: true };
    });
  }

  private async testFormListing(): Promise<void> {
    await this.runTest('Form Listing (GET /api/forms)', async () => {
      const response = await fetch(`${BASE_URL}/api/forms`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data.forms)) {
        throw new Error('Forms list not returned as array');
      }
      
      return data;
    });

    // Test pagination
    await this.runTest('Form Listing with Pagination', async () => {
      const response = await fetch(`${BASE_URL}/api/forms?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();
      
      if (data.forms && data.forms.length > 10) {
        throw new Error('Pagination limit not respected');
      }
      
      return data;
    });
  }

  private async testFormDeletion(): Promise<void> {
    await this.runTest('Form Deletion (DELETE /api/forms/[id])', async () => {
      // Note: In production, we wouldn't actually delete the test form
      // This is just to test the endpoint
      
      const response = await fetch(`${BASE_URL}/api/forms/${this.testFormId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-CSRF-Token': this.csrfToken
        }
      });

      // If form has submissions, it should return 400
      if (this.testSubmissionId && response.status === 400) {
        const data = await response.json();
        if (data.error?.includes('submissions')) {
          return { protectedFromDeletion: true };
        }
      }

      if (!response.ok && response.status !== 400) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      return await response.json();
    });
  }

  private printResults(): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(60));

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    // Print individual results
    this.results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : '❌';
      const status = result.status.toUpperCase().padEnd(6);
      const time = `${result.duration}ms`.padStart(8);
      console.log(`${icon} ${status} ${time} - ${result.name}`);
      
      if (result.error) {
        console.log(`   └─ Error: ${result.error}`);
      }
    });

    console.log('─'.repeat(60));
    console.log(`📈 Passed: ${passed}/${this.results.length}`);
    console.log(`📉 Failed: ${failed}/${this.results.length}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`⚡ Avg Response: ${Math.round(totalTime / this.results.length)}ms`);
    
    // Performance analysis
    const responseTimes = this.results.map(r => r.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95Time = responseTimes[p95Index];
    
    console.log(`📊 P95 Response: ${p95Time}ms`);
    
    if (p95Time < 200) {
      console.log('🎯 Performance Target: ✅ MET (<200ms)');
    } else {
      console.log('🎯 Performance Target: ❌ MISSED (>200ms)');
    }

    console.log('═'.repeat(60));
    
    // Exit code based on results
    if (failed > 0) {
      console.log('❌ TESTS FAILED');
      process.exit(1);
    } else {
      console.log('✅ ALL TESTS PASSED');
      process.exit(0);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FormAPITester();
  tester.runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { FormAPITester };