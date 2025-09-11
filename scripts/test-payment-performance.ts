#!/usr/bin/env tsx

// Performance testing for payment system
import { performance } from 'perf_hooks';

const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`
};

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pass: boolean;
  threshold: number;
}

const metrics: PerformanceMetric[] = [];

function startTimer(name: string, threshold: number): number {
  const startTime = performance.now();
  metrics.push({ name, startTime, threshold, pass: false });
  return startTime;
}

function endTimer(name: string, startTime: number): void {
  const endTime = performance.now();
  const duration = endTime - startTime;
  const metric = metrics.find(m => m.name === name && m.startTime === startTime);
  
  if (metric) {
    metric.endTime = endTime;
    metric.duration = duration;
    metric.pass = duration <= metric.threshold;
  }
}

console.log(colors.bold(colors.cyan('\n⚡ Payment System Performance Test\n')));
console.log('━'.repeat(60));

// Test 1: Feature Gate Checks (should be instant)
console.log(colors.cyan('\n📊 Test 1: Feature Gate Performance\n'));

async function testFeatureGates() {
  const { canUsePdfImport, canUseAiChatbot, canUseApiAccess, canCreateForm } = await import('../src/lib/stripe-config');
  
  // Test PDF import check performance
  const pdfStart = startTimer('PDF Import Check', 1); // Should complete in 1ms
  for (let i = 0; i < 1000; i++) {
    canUsePdfImport('STARTER');
  }
  endTimer('PDF Import Check', pdfStart);
  
  // Test AI chatbot check performance
  const aiStart = startTimer('AI Chatbot Check', 1);
  for (let i = 0; i < 1000; i++) {
    canUseAiChatbot('PROFESSIONAL');
  }
  endTimer('AI Chatbot Check', aiStart);
  
  // Test API access check performance
  const apiStart = startTimer('API Access Check', 1);
  for (let i = 0; i < 1000; i++) {
    canUseApiAccess('SCALE');
  }
  endTimer('API Access Check', apiStart);
  
  // Test form creation check performance
  const formStart = startTimer('Form Creation Check', 1);
  for (let i = 0; i < 1000; i++) {
    canCreateForm('FREE', 0);
  }
  endTimer('Form Creation Check', formStart);
}

// Test 2: Tier Mapping Performance
console.log(colors.cyan('\n🔄 Test 2: Tier Mapping Performance\n'));

async function testTierMapping() {
  const { mapLegacyTier, getUpgradePath } = await import('../src/lib/stripe-config');
  
  // Test legacy tier mapping
  const mapStart = startTimer('Legacy Tier Mapping (10k ops)', 10); // 10ms for 10k operations
  for (let i = 0; i < 10000; i++) {
    mapLegacyTier('PRO');
    mapLegacyTier('BUSINESS');
    mapLegacyTier('professional');
  }
  endTimer('Legacy Tier Mapping (10k ops)', mapStart);
  
  // Test upgrade path calculation
  const upgradeStart = startTimer('Upgrade Path Calculation (1k ops)', 5);
  for (let i = 0; i < 1000; i++) {
    getUpgradePath('FREE', 'pdfImport');
    getUpgradePath('STARTER', 'aiChatbot');
  }
  endTimer('Upgrade Path Calculation (1k ops)', upgradeStart);
}

// Test 3: Price Formatting Performance
console.log(colors.cyan('\n💰 Test 3: Price Formatting Performance\n'));

async function testPriceFormatting() {
  const { formatPrice, SUBSCRIPTION_TIERS } = await import('../src/lib/stripe-config');
  
  const formatStart = startTimer('Price Formatting (5k ops)', 5);
  for (let i = 0; i < 5000; i++) {
    formatPrice(SUBSCRIPTION_TIERS.STARTER.monthlyPrice, 'monthly');
    formatPrice(SUBSCRIPTION_TIERS.PROFESSIONAL.annualPrice, 'annual');
  }
  endTimer('Price Formatting (5k ops)', formatStart);
}

// Test 4: Trial Status Calculations
console.log(colors.cyan('\n⏱️ Test 4: Trial Status Performance\n'));

async function testTrialCalculations() {
  const { checkTrialStatus, createTrialUser } = await import('../src/lib/stripe-config');
  
  // Test trial creation
  const createStart = startTimer('Trial User Creation (1k ops)', 10);
  for (let i = 0; i < 1000; i++) {
    createTrialUser(`user${i}@test.com`);
  }
  endTimer('Trial User Creation (1k ops)', createStart);
  
  // Test trial status checking
  const checkStart = startTimer('Trial Status Check (5k ops)', 10);
  const testDate = new Date();
  for (let i = 0; i < 5000; i++) {
    checkTrialStatus(testDate);
  }
  endTimer('Trial Status Check (5k ops)', checkStart);
}

// Test 5: Critical Path Performance (simulated checkout flow)
console.log(colors.cyan('\n🚀 Test 5: Critical Path Performance\n'));

async function testCriticalPath() {
  const { 
    SUBSCRIPTION_TIERS, 
    canCreateForm, 
    getUpgradePath,
    formatPrice,
    mapLegacyTier
  } = await import('../src/lib/stripe-config');
  
  const criticalStart = startTimer('Full Checkout Flow Simulation', 50); // 50ms budget
  
  // Simulate a complete checkout flow
  for (let i = 0; i < 100; i++) {
    // 1. User hits form limit
    const canCreate = canCreateForm('FREE', 1);
    
    // 2. Get upgrade suggestion
    const upgrade = getUpgradePath('FREE', 'moreForms');
    
    // 3. Map tier names
    const tier = mapLegacyTier('starter');
    
    // 4. Get pricing information
    const price = formatPrice(SUBSCRIPTION_TIERS[tier].monthlyPrice, 'monthly');
    
    // 5. Check all features for new tier
    const features = {
      forms: SUBSCRIPTION_TIERS[tier].features.forms,
      pdf: SUBSCRIPTION_TIERS[tier].features.pdfImport,
      ai: SUBSCRIPTION_TIERS[tier].features.aiChatbot
    };
  }
  
  endTimer('Full Checkout Flow Simulation', criticalStart);
}

// Test 6: Memory Usage
console.log(colors.cyan('\n💾 Test 6: Memory Usage\n'));

async function testMemoryUsage() {
  const memStart = process.memoryUsage();
  
  // Import all modules
  const modules = await import('../src/lib/stripe-config');
  
  // Create many tier checks
  const results = [];
  for (let i = 0; i < 10000; i++) {
    results.push({
      tier: i % 2 === 0 ? 'FREE' : 'PROFESSIONAL',
      features: {
        pdf: modules.canUsePdfImport(i % 2 === 0 ? 'FREE' : 'PROFESSIONAL'),
        ai: modules.canUseAiChatbot(i % 2 === 0 ? 'FREE' : 'PROFESSIONAL')
      }
    });
  }
  
  const memEnd = process.memoryUsage();
  const memUsed = (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024;
  
  const memMetric = {
    name: 'Memory Usage (10k operations)',
    startTime: 0,
    threshold: 10, // 10MB threshold
    pass: memUsed < 10,
    duration: memUsed
  };
  metrics.push(memMetric);
  
  if (memMetric.pass) {
    console.log(colors.green(`✓ Memory Usage: ${memUsed.toFixed(2)}MB (< 10MB threshold)`));
  } else {
    console.log(colors.red(`✗ Memory Usage: ${memUsed.toFixed(2)}MB (> 10MB threshold)`));
  }
}

// Run all tests
async function runPerformanceTests() {
  await testFeatureGates();
  await testTierMapping();
  await testPriceFormatting();
  await testTrialCalculations();
  await testCriticalPath();
  await testMemoryUsage();
  
  // Display results
  console.log('\n' + '━'.repeat(60));
  console.log(colors.bold(colors.cyan('\n📊 Performance Test Results\n')));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const metric of metrics) {
    if (metric.duration !== undefined) {
      const duration = metric.name === 'Memory Usage (10k operations)' 
        ? `${metric.duration.toFixed(2)}MB`
        : `${metric.duration.toFixed(2)}ms`;
      
      if (metric.pass) {
        console.log(colors.green(`✓ ${metric.name}: ${duration} (threshold: ${metric.threshold}${metric.name.includes('Memory') ? 'MB' : 'ms'})`));
        passCount++;
      } else {
        console.log(colors.red(`✗ ${metric.name}: ${duration} (threshold: ${metric.threshold}${metric.name.includes('Memory') ? 'MB' : 'ms'})`));
        failCount++;
      }
    }
  }
  
  // Calculate performance score
  const totalTests = passCount + failCount;
  const performanceScore = Math.round((passCount / totalTests) * 100);
  
  console.log('\n' + '━'.repeat(60));
  console.log(colors.bold('\nPerformance Summary:'));
  console.log(colors.green(`✓ Passed: ${passCount}`));
  console.log(colors.red(`✗ Failed: ${failCount}`));
  console.log(colors.bold(`📈 Performance Score: ${performanceScore}%`));
  
  // Performance benchmarks
  console.log(colors.cyan('\n📋 Performance Benchmarks:'));
  console.log('• Feature checks: < 1ms per 1000 operations');
  console.log('• Tier mapping: < 10ms per 10000 operations');
  console.log('• Price formatting: < 5ms per 5000 operations');
  console.log('• Trial calculations: < 10ms per 5000 operations');
  console.log('• Full checkout flow: < 50ms per 100 simulations');
  console.log('• Memory usage: < 10MB for 10000 operations');
  
  if (performanceScore >= 90) {
    console.log(colors.bold(colors.green('\n✅ PERFORMANCE: EXCELLENT\n')));
    console.log(colors.green('Payment system meets all performance requirements!'));
  } else if (performanceScore >= 70) {
    console.log(colors.bold(colors.yellow('\n⚠️ PERFORMANCE: ACCEPTABLE\n')));
    console.log(colors.yellow('Some optimizations recommended.'));
  } else {
    console.log(colors.bold(colors.red('\n❌ PERFORMANCE: NEEDS IMPROVEMENT\n')));
    console.log(colors.red('Critical performance issues detected.'));
  }
  
  process.exit(failCount > 0 ? 1 : 0);
}

// Execute tests
runPerformanceTests().catch(error => {
  console.error(colors.red('Performance test failed:'), error);
  process.exit(1);
});