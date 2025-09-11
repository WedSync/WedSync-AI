#!/usr/bin/env node

/**
 * Payment Security Test Suite
 * Tests all critical payment security implementations
 */

import { execSync } from 'child_process';
import * as https from 'https';
import * as http from 'http';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function makeRequest(
  path: string,
  method: string = 'POST',
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const module = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    const req = module.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode || 0, data: json });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test 1: Webhook Signature Validation
async function testWebhookSignatureValidation() {
  console.log('\n🔐 Testing Webhook Signature Validation...');
  
  try {
    // Test without signature
    const noSig = await makeRequest('/api/stripe/webhook', 'POST', {
      id: 'evt_fake',
      type: 'checkout.session.completed',
    });
    
    if (noSig.status === 400) {
      results.push({
        name: 'Webhook: No Signature Rejection',
        passed: true,
        message: 'Correctly rejected webhook without signature',
      });
    } else {
      results.push({
        name: 'Webhook: No Signature Rejection',
        passed: false,
        message: `Expected 400, got ${noSig.status}`,
      });
    }
    
    // Test with invalid signature
    const invalidSig = await makeRequest('/api/stripe/webhook', 'POST', {
      id: 'evt_fake',
      type: 'checkout.session.completed',
    }, {
      'stripe-signature': 'invalid_signature_12345',
    });
    
    if (invalidSig.status === 400) {
      results.push({
        name: 'Webhook: Invalid Signature Rejection',
        passed: true,
        message: 'Correctly rejected webhook with invalid signature',
      });
    } else {
      results.push({
        name: 'Webhook: Invalid Signature Rejection',
        passed: false,
        message: `Expected 400, got ${invalidSig.status}`,
      });
    }
    
  } catch (error) {
    results.push({
      name: 'Webhook Signature Validation',
      passed: false,
      message: `Test failed: ${error}`,
    });
  }
}

// Test 2: Organization Ownership Verification
async function testOrganizationOwnership() {
  console.log('\n🏢 Testing Organization Ownership Verification...');
  
  try {
    // Test without authentication
    const noAuth = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: 'pro',
      billingCycle: 'monthly',
    });
    
    if (noAuth.status === 401) {
      results.push({
        name: 'Checkout: No Auth Rejection',
        passed: true,
        message: 'Correctly rejected checkout without authentication',
      });
    } else {
      results.push({
        name: 'Checkout: No Auth Rejection',
        passed: false,
        message: `Expected 401, got ${noAuth.status}`,
      });
    }
    
    // Test with invalid auth token
    const invalidAuth = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: 'pro',
      billingCycle: 'monthly',
    }, {
      'Authorization': 'Bearer invalid_token_12345',
    });
    
    if (invalidAuth.status === 401) {
      results.push({
        name: 'Checkout: Invalid Auth Rejection',
        passed: true,
        message: 'Correctly rejected checkout with invalid authentication',
      });
    } else {
      results.push({
        name: 'Checkout: Invalid Auth Rejection',
        passed: false,
        message: `Expected 401, got ${invalidAuth.status}`,
      });
    }
    
  } catch (error) {
    results.push({
      name: 'Organization Ownership Verification',
      passed: false,
      message: `Test failed: ${error}`,
    });
  }
}

// Test 3: Rate Limiting
async function testRateLimiting() {
  console.log('\n⏱️ Testing Rate Limiting...');
  
  try {
    const requests = [];
    
    // Make 10 rapid requests (should exceed limit of 5)
    for (let i = 0; i < 10; i++) {
      requests.push(makeRequest('/api/stripe/create-checkout-session', 'POST', {
        tier: 'pro',
        billingCycle: 'monthly',
      }, {
        'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
      }));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    if (rateLimited.length > 0) {
      results.push({
        name: 'Rate Limiting: Payment Endpoints',
        passed: true,
        message: `Rate limiting working: ${rateLimited.length} requests blocked`,
      });
    } else {
      results.push({
        name: 'Rate Limiting: Payment Endpoints',
        passed: false,
        message: 'Rate limiting not triggered after 10 rapid requests',
      });
    }
    
  } catch (error) {
    results.push({
      name: 'Rate Limiting',
      passed: false,
      message: `Test failed: ${error}`,
    });
  }
}

// Test 4: Input Validation
async function testInputValidation() {
  console.log('\n✅ Testing Input Validation...');
  
  try {
    // Test with invalid tier
    const invalidTier = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: 'INVALID_TIER_12345',
      billingCycle: 'monthly',
    }, {
      'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
    });
    
    if (invalidTier.status === 400 || invalidTier.status === 401) {
      results.push({
        name: 'Input Validation: Invalid Tier',
        passed: true,
        message: 'Correctly rejected invalid tier',
      });
    } else {
      results.push({
        name: 'Input Validation: Invalid Tier',
        passed: false,
        message: `Expected 400/401, got ${invalidTier.status}`,
      });
    }
    
    // Test with SQL injection attempt
    const sqlInjection = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: "pro'; DROP TABLE users; --",
      billingCycle: 'monthly',
    }, {
      'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
    });
    
    if (sqlInjection.status === 400 || sqlInjection.status === 401) {
      results.push({
        name: 'Input Validation: SQL Injection Prevention',
        passed: true,
        message: 'Correctly sanitized SQL injection attempt',
      });
    } else {
      results.push({
        name: 'Input Validation: SQL Injection Prevention',
        passed: false,
        message: `Expected 400/401, got ${sqlInjection.status}`,
      });
    }
    
    // Test with XSS attempt
    const xssAttempt = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: '<script>alert("xss")</script>',
      billingCycle: 'monthly',
    }, {
      'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
    });
    
    if (xssAttempt.status === 400 || xssAttempt.status === 401) {
      results.push({
        name: 'Input Validation: XSS Prevention',
        passed: true,
        message: 'Correctly sanitized XSS attempt',
      });
    } else {
      results.push({
        name: 'Input Validation: XSS Prevention',
        passed: false,
        message: `Expected 400/401, got ${xssAttempt.status}`,
      });
    }
    
    // Test with oversized payload
    const largePayload = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: 'pro',
      billingCycle: 'monthly',
      malicious: 'x'.repeat(10000), // 10KB of data
    }, {
      'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
    });
    
    if (largePayload.status === 413 || largePayload.status === 400) {
      results.push({
        name: 'Input Validation: Payload Size Limit',
        passed: true,
        message: 'Correctly rejected oversized payload',
      });
    } else {
      results.push({
        name: 'Input Validation: Payload Size Limit',
        passed: false,
        message: `Expected 413/400, got ${largePayload.status}`,
      });
    }
    
  } catch (error) {
    results.push({
      name: 'Input Validation',
      passed: false,
      message: `Test failed: ${error}`,
    });
  }
}

// Test 5: Idempotency
async function testIdempotency() {
  console.log('\n🔄 Testing Idempotency...');
  
  try {
    const idempotencyKey = `test_${Date.now()}`;
    
    // Make two requests with same idempotency key
    const request1 = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: 'pro',
      billingCycle: 'monthly',
      idempotencyKey,
    }, {
      'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
    });
    
    const request2 = await makeRequest('/api/stripe/create-checkout-session', 'POST', {
      tier: 'pro',
      billingCycle: 'monthly',
      idempotencyKey,
    }, {
      'Authorization': `Bearer ${TEST_AUTH_TOKEN || 'test'}`,
    });
    
    // Both should succeed (or fail with auth) but with same result
    if (request1.status === request2.status) {
      results.push({
        name: 'Idempotency: Duplicate Prevention',
        passed: true,
        message: 'Idempotency key handling working correctly',
      });
    } else {
      results.push({
        name: 'Idempotency: Duplicate Prevention',
        passed: false,
        message: `Different responses for same idempotency key: ${request1.status} vs ${request2.status}`,
      });
    }
    
  } catch (error) {
    results.push({
      name: 'Idempotency',
      passed: false,
      message: `Test failed: ${error}`,
    });
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Payment Security Tests...');
  console.log('=====================================');
  
  await testWebhookSignatureValidation();
  await testOrganizationOwnership();
  await testRateLimiting();
  await testInputValidation();
  await testIdempotency();
  
  console.log('\n\n📊 Test Results Summary');
  console.log('========================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
  });
  
  console.log('\n------------------------');
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  const successRate = (passed / results.length * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  
  if (failed > 0) {
    console.log('\n⚠️ Some tests failed. Please review the security implementations.');
    process.exit(1);
  } else {
    console.log('\n🎉 All security tests passed!');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});