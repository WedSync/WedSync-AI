#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import chalk from 'chalk';
import ora from 'ora';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
const TEST_EMAIL = 'payment-test@wedsync.com';
const TEST_PASSWORD = 'TestPayment123!';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

// Test results tracking
interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

// Helper function to log test results
function logTest(name: string, status: 'pass' | 'fail', details?: string, error?: string) {
  testResults.push({ name, status, details, error });
  
  if (status === 'pass') {
    console.log(chalk.green('✓'), chalk.white(name), details ? chalk.gray(`(${details})`) : '');
  } else {
    console.log(chalk.red('✗'), chalk.white(name), error ? chalk.red(error) : '');
  }
}

// Test Suite 1: Stripe Configuration
async function testStripeConfiguration() {
  console.log(chalk.cyan('\n📋 Testing Stripe Configuration\n'));
  
  const spinner = ora('Verifying Stripe API connection...').start();
  
  try {
    // Test 1: Verify Stripe connection
    const account = await stripe.accounts.retrieve();
    spinner.succeed('Stripe API connected');
    logTest('Stripe API Connection', 'pass', account.id);
    
    // Test 2: Verify webhook endpoint exists
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    const ourWebhook = webhooks.data.find(wh => 
      wh.url.includes('api/stripe/webhook')
    );
    
    if (ourWebhook) {
      logTest('Webhook Endpoint Configured', 'pass', ourWebhook.url);
    } else {
      logTest('Webhook Endpoint Configured', 'fail', '', 'No webhook endpoint found');
    }
    
    // Test 3: Verify price IDs exist
    const priceIds = [
      { name: 'STARTER Monthly', id: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID },
      { name: 'STARTER Annual', id: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID },
      { name: 'PROFESSIONAL Monthly', id: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID },
      { name: 'PROFESSIONAL Annual', id: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID },
      { name: 'SCALE Monthly', id: process.env.STRIPE_SCALE_MONTHLY_PRICE_ID },
      { name: 'SCALE Annual', id: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID },
      { name: 'ENTERPRISE Monthly', id: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID },
      { name: 'ENTERPRISE Annual', id: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID },
    ];
    
    for (const priceInfo of priceIds) {
      if (!priceInfo.id) {
        logTest(`Price ID: ${priceInfo.name}`, 'fail', '', 'Not configured in environment');
        continue;
      }
      
      try {
        const price = await stripe.prices.retrieve(priceInfo.id);
        const amountInGBP = price.unit_amount ? price.unit_amount / 100 : 0;
        logTest(`Price ID: ${priceInfo.name}`, 'pass', `£${amountInGBP} ${price.currency.toUpperCase()}`);
      } catch (error) {
        logTest(`Price ID: ${priceInfo.name}`, 'fail', '', 'Invalid price ID');
      }
    }
    
    // Test 4: Verify GBP currency
    const testPriceId = process.env.STRIPE_STARTER_MONTHLY_PRICE_ID;
    if (testPriceId) {
      const price = await stripe.prices.retrieve(testPriceId);
      if (price.currency === 'gbp') {
        logTest('Currency Configuration', 'pass', 'GBP confirmed');
      } else {
        logTest('Currency Configuration', 'fail', '', `Expected GBP, got ${price.currency.toUpperCase()}`);
      }
    }
    
  } catch (error) {
    spinner.fail('Stripe configuration test failed');
    logTest('Stripe Configuration', 'fail', '', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Test Suite 2: Database Tables
async function testDatabaseTables() {
  console.log(chalk.cyan('\n📊 Testing Database Tables\n'));
  
  const tables = [
    'organizations',
    'user_profiles',
    'subscription_history',
    'payment_history',
    'payment_methods',
    'invoices',
    'webhook_events'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        logTest(`Table: ${table}`, 'fail', '', error.message);
      } else {
        logTest(`Table: ${table}`, 'pass', 'Accessible');
      }
    } catch (error) {
      logTest(`Table: ${table}`, 'fail', '', 'Table does not exist');
    }
  }
}

// Test Suite 3: Feature Gates
async function testFeatureGates() {
  console.log(chalk.cyan('\n🔒 Testing Feature Gates\n'));
  
  // Import feature gate functions
  const { canUsePdfImport, canUseAiChatbot, canUseApiAccess, canCreateForm } = await import('../src/lib/stripe-config');
  
  // Test feature gates for each tier
  const tierTests = [
    { tier: 'FREE', pdfImport: false, aiChatbot: false, apiAccess: false },
    { tier: 'STARTER', pdfImport: true, aiChatbot: false, apiAccess: false },
    { tier: 'PROFESSIONAL', pdfImport: true, aiChatbot: true, apiAccess: false },
    { tier: 'SCALE', pdfImport: true, aiChatbot: true, apiAccess: true },
    { tier: 'ENTERPRISE', pdfImport: true, aiChatbot: true, apiAccess: true },
  ];
  
  for (const test of tierTests) {
    const tier = test.tier as any;
    
    // Test PDF Import
    const pdfResult = canUsePdfImport(tier);
    if (pdfResult === test.pdfImport) {
      logTest(`${tier}: PDF Import`, 'pass', pdfResult ? 'Enabled' : 'Disabled');
    } else {
      logTest(`${tier}: PDF Import`, 'fail', '', `Expected ${test.pdfImport}, got ${pdfResult}`);
    }
    
    // Test AI Chatbot
    const aiResult = canUseAiChatbot(tier);
    if (aiResult === test.aiChatbot) {
      logTest(`${tier}: AI Chatbot`, 'pass', aiResult ? 'Enabled' : 'Disabled');
    } else {
      logTest(`${tier}: AI Chatbot`, 'fail', '', `Expected ${test.aiChatbot}, got ${aiResult}`);
    }
    
    // Test API Access
    const apiResult = canUseApiAccess(tier);
    if (apiResult === test.apiAccess) {
      logTest(`${tier}: API Access`, 'pass', apiResult ? 'Enabled' : 'Disabled');
    } else {
      logTest(`${tier}: API Access`, 'fail', '', `Expected ${test.apiAccess}, got ${apiResult}`);
    }
  }
  
  // Test form limits
  const formLimitTests = [
    { tier: 'FREE', currentCount: 0, canCreate: true },
    { tier: 'FREE', currentCount: 1, canCreate: false },
    { tier: 'STARTER', currentCount: 100, canCreate: true },
  ];
  
  for (const test of formLimitTests) {
    const tier = test.tier as any;
    const result = canCreateForm(tier, test.currentCount);
    
    if (result === test.canCreate) {
      logTest(`${tier}: Form Creation (${test.currentCount} forms)`, 'pass', result ? 'Allowed' : 'Blocked');
    } else {
      logTest(`${tier}: Form Creation (${test.currentCount} forms)`, 'fail', '', `Expected ${test.canCreate}, got ${result}`);
    }
  }
}

// Test Suite 4: Trial Functionality
async function testTrialFunctionality() {
  console.log(chalk.cyan('\n⏰ Testing 30-Day Trial\n'));
  
  const { createTrialUser, checkTrialStatus } = await import('../src/lib/stripe-config');
  
  // Test creating trial user
  const trialUser = createTrialUser('trial@test.com');
  
  if (trialUser.trial_tier === 'PROFESSIONAL' && trialUser.trial_active === true) {
    logTest('Create Trial User', 'pass', 'Professional tier for 30 days');
  } else {
    logTest('Create Trial User', 'fail', '', 'Incorrect trial configuration');
  }
  
  // Test trial status check
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 15);
  const activeStatus = checkTrialStatus(futureDate);
  
  if (activeStatus.isActive && activeStatus.daysRemaining === 15) {
    logTest('Active Trial Status', 'pass', '15 days remaining');
  } else {
    logTest('Active Trial Status', 'fail', '', `Expected 15 days, got ${activeStatus.daysRemaining}`);
  }
  
  // Test expired trial
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  const expiredStatus = checkTrialStatus(pastDate);
  
  if (!expiredStatus.isActive && expiredStatus.daysRemaining === 0) {
    logTest('Expired Trial Status', 'pass', 'Trial expired');
  } else {
    logTest('Expired Trial Status', 'fail', '', 'Trial should be expired');
  }
}

// Test Suite 5: Pricing Display
async function testPricingDisplay() {
  console.log(chalk.cyan('\n💷 Testing GBP Pricing Display\n'));
  
  const { SUBSCRIPTION_TIERS, formatPrice } = await import('../src/lib/stripe-config');
  
  // Test each tier's pricing
  const expectedPrices = [
    { tier: 'FREE', monthly: 'Free', annual: 'Free' },
    { tier: 'STARTER', monthly: '£19/mo', annual: '£16/mo' },
    { tier: 'PROFESSIONAL', monthly: '£49/mo', annual: '£41/mo' },
    { tier: 'SCALE', monthly: '£79/mo', annual: '£66/mo' },
    { tier: 'ENTERPRISE', monthly: '£149/mo', annual: '£124/mo' },
  ];
  
  for (const expected of expectedPrices) {
    const tier = SUBSCRIPTION_TIERS[expected.tier as keyof typeof SUBSCRIPTION_TIERS];
    
    // Test monthly pricing
    const monthlyFormatted = formatPrice(tier.monthlyPrice, 'monthly');
    if (monthlyFormatted === expected.monthly) {
      logTest(`${expected.tier}: Monthly Price`, 'pass', monthlyFormatted);
    } else {
      logTest(`${expected.tier}: Monthly Price`, 'fail', '', `Expected ${expected.monthly}, got ${monthlyFormatted}`);
    }
    
    // Test annual pricing
    const annualFormatted = formatPrice(tier.annualPrice, 'annual');
    if (annualFormatted === expected.annual) {
      logTest(`${expected.tier}: Annual Price`, 'pass', annualFormatted);
    } else {
      logTest(`${expected.tier}: Annual Price`, 'fail', '', `Expected ${expected.annual}, got ${annualFormatted}`);
    }
  }
}

// Test Suite 6: Upgrade Path Logic
async function testUpgradePaths() {
  console.log(chalk.cyan('\n📈 Testing Upgrade Path Logic\n'));
  
  const { getUpgradePath } = await import('../src/lib/stripe-config');
  
  const upgradeTests = [
    { current: 'FREE', feature: 'pdfImport', expected: 'STARTER', price: '£19/month' },
    { current: 'STARTER', feature: 'aiChatbot', expected: 'PROFESSIONAL', price: '£49/month' },
    { current: 'PROFESSIONAL', feature: 'apiAccess', expected: 'SCALE', price: '£79/month' },
    { current: 'SCALE', feature: 'whiteLabel', expected: 'ENTERPRISE', price: '£149/month' },
    { current: 'ENTERPRISE', feature: 'anything', expected: null, price: null },
  ];
  
  for (const test of upgradeTests) {
    const result = getUpgradePath(test.current as any, test.feature);
    
    if (test.expected === null) {
      if (result === null) {
        logTest(`${test.current} → ${test.feature}`, 'pass', 'Already at highest tier');
      } else {
        logTest(`${test.current} → ${test.feature}`, 'fail', '', 'Should return null for highest tier');
      }
    } else {
      if (result && result.suggestedTier === test.expected && result.price === test.price) {
        logTest(`${test.current} → ${test.feature}`, 'pass', `Upgrade to ${test.expected} (${test.price})`);
      } else {
        logTest(`${test.current} → ${test.feature}`, 'fail', '', `Expected ${test.expected}, got ${result?.suggestedTier}`);
      }
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.bold.magenta('\n🚀 WedSync Payment System Comprehensive Test Suite\n'));
  console.log(chalk.gray('━'.repeat(60)));
  
  // Run all test suites
  await testStripeConfiguration();
  await testDatabaseTables();
  await testFeatureGates();
  await testTrialFunctionality();
  await testPricingDisplay();
  await testUpgradePaths();
  
  // Generate test report
  console.log(chalk.gray('\n' + '━'.repeat(60)));
  console.log(chalk.bold.cyan('\n📊 Test Results Summary\n'));
  
  const passedTests = testResults.filter(t => t.status === 'pass').length;
  const failedTests = testResults.filter(t => t.status === 'fail').length;
  const totalTests = testResults.length;
  const passRate = Math.round((passedTests / totalTests) * 100);
  
  console.log(chalk.green(`✓ Passed: ${passedTests}`));
  console.log(chalk.red(`✗ Failed: ${failedTests}`));
  console.log(chalk.white(`📋 Total: ${totalTests}`));
  console.log(chalk.bold(`🎯 Pass Rate: ${passRate}%`));
  
  // List failed tests for easy debugging
  if (failedTests > 0) {
    console.log(chalk.red('\n❌ Failed Tests:\n'));
    testResults
      .filter(t => t.status === 'fail')
      .forEach(t => {
        console.log(chalk.red(`  - ${t.name}: ${t.error || 'No error details'}`));
      });
  }
  
  // Overall verdict
  console.log(chalk.gray('\n' + '━'.repeat(60)));
  if (passRate >= 95) {
    console.log(chalk.bold.green('\n✅ PAYMENT SYSTEM: PRODUCTION READY\n'));
  } else if (passRate >= 80) {
    console.log(chalk.bold.yellow('\n⚠️  PAYMENT SYSTEM: NEEDS ATTENTION\n'));
  } else {
    console.log(chalk.bold.red('\n❌ PAYMENT SYSTEM: NOT READY\n'));
  }
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('\n❌ Test suite failed:'), error);
  process.exit(1);
});