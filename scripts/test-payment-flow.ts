#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

console.log('🧪 Payment System Test Suite\n');
console.log('=' .repeat(50));
console.log(`📍 Testing against: ${BASE_URL}`);
console.log('=' .repeat(50) + '\n');

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string;
  details?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  url: string,
  options: RequestInit = {}
): Promise<TestResult> {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => null);
    
    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      return {
        name,
        status: 'passed',
        message: `Status ${response.status}`,
        details: data
      };
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   Error: ${data?.error || response.statusText}`);
      return {
        name,
        status: 'failed',
        message: `Status ${response.status}: ${data?.error || response.statusText}`,
        details: data
      };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    return {
      name,
      status: 'failed',
      message: `Request failed: ${error}`,
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Payment API Tests\n');

  // Test 1: Health check
  results.push(await testEndpoint(
    'API Health Check',
    `${BASE_URL}/api/health`,
    { method: 'GET' }
  ));

  // Test 2: Create checkout session without auth (should fail)
  results.push(await testEndpoint(
    'Checkout Session - No Auth (Should Fail)',
    `${BASE_URL}/api/stripe/create-checkout-session`,
    {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'price_test_professional',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/pricing`
      })
    }
  ));

  // Test 3: Create checkout session with invalid price
  results.push(await testEndpoint(
    'Checkout Session - Invalid Price',
    `${BASE_URL}/api/stripe/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_token'
      },
      body: JSON.stringify({
        priceId: 'invalid_price_id',
        successUrl: `${BASE_URL}/success`,
        cancelUrl: `${BASE_URL}/pricing`
      })
    }
  ));

  // Test 4: Webhook signature validation
  results.push(await testEndpoint(
    'Webhook - Invalid Signature (Should Fail)',
    `${BASE_URL}/api/stripe/webhook`,
    {
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid_signature'
      },
      body: JSON.stringify({
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: { object: {} }
      })
    }
  ));

  // Test 5: Rate limiting test
  console.log('\n🔥 Testing Rate Limiting (5 requests)...');
  const rateLimitResults = [];
  for (let i = 0; i < 5; i++) {
    const result = await testEndpoint(
      `Rate Limit Test ${i + 1}`,
      `${BASE_URL}/api/stripe/create-checkout-session`,
      {
        method: 'POST',
        body: JSON.stringify({ priceId: 'test' })
      }
    );
    rateLimitResults.push(result.status);
  }
  
  const rateLimited = rateLimitResults.some(s => s === 'failed');
  results.push({
    name: 'Rate Limiting',
    status: rateLimited ? 'passed' : 'failed',
    message: rateLimited ? 'Rate limiting is working' : 'Rate limiting not detected',
    details: rateLimitResults
  });

  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50) + '\n');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  results.forEach((result, i) => {
    const icon = result.status === 'passed' ? '✅' : 
                 result.status === 'failed' ? '❌' : '⏭️';
    console.log(`${i + 1}. ${icon} ${result.name}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
  });

  console.log('\n' + '-' .repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('-' .repeat(50) + '\n');

  // Performance test
  console.log('⚡ Performance Test\n');
  const perfStart = Date.now();
  await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId: 'test' })
  }).catch(() => {});
  const perfTime = Date.now() - perfStart;
  
  console.log(`Response time: ${perfTime}ms`);
  console.log(`Target: < 500ms`);
  console.log(`Status: ${perfTime < 500 ? '✅ PASS' : '❌ FAIL'}`);

  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      skipped,
      performanceMs: perfTime
    }
  };

  // Save report
  const fs = await import('fs/promises');
  const reportPath = resolve(process.cwd(), 'PAYMENT-TEST-RESULTS.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📝 Test report saved to: ${reportPath}`);
}

runTests().catch(console.error);