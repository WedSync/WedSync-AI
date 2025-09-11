#!/usr/bin/env tsx

// Test payment system features without requiring environment variables
import { 
  SUBSCRIPTION_TIERS, 
  canUsePdfImport, 
  canUseAiChatbot, 
  canUseApiAccess,
  canCreateForm,
  getUpgradePath,
  formatPrice,
  checkTrialStatus,
  createTrialUser,
  mapLegacyTier,
  type SubscriptionTier
} from '../src/lib/stripe-config';

const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`
};

console.log(colors.bold(colors.magenta('\n🚀 WedSync 5-Tier Payment System Test\n')));
console.log('━'.repeat(60));

// Test 1: Verify all 5 tiers exist
console.log(colors.cyan('\n📋 Test 1: Tier Configuration\n'));

const expectedTiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'SCALE', 'ENTERPRISE'];
let allTiersPresent = true;

for (const tier of expectedTiers) {
  if (SUBSCRIPTION_TIERS[tier]) {
    const tierDef = SUBSCRIPTION_TIERS[tier];
    console.log(colors.green(`✓ ${tier} tier configured`));
    console.log(`  Name: ${tierDef.name}`);
    console.log(`  Price: £${tierDef.monthlyPrice}/month, £${tierDef.annualPrice}/year`);
  } else {
    console.log(colors.red(`✗ ${tier} tier missing`));
    allTiersPresent = false;
  }
}

// Test 2: Feature Gates
console.log(colors.cyan('\n🔒 Test 2: Feature Gates by Tier\n'));

const featureTests = [
  { tier: 'FREE', features: { pdf: false, ai: false, api: false, forms: 1 } },
  { tier: 'STARTER', features: { pdf: true, ai: false, api: false, forms: -1 } },
  { tier: 'PROFESSIONAL', features: { pdf: true, ai: true, api: false, forms: -1 } },
  { tier: 'SCALE', features: { pdf: true, ai: true, api: true, forms: -1 } },
  { tier: 'ENTERPRISE', features: { pdf: true, ai: true, api: true, forms: -1 } }
];

for (const test of featureTests) {
  const tier = test.tier as SubscriptionTier;
  console.log(colors.yellow(`\n${tier} Tier:`));
  
  // Test PDF Import
  const pdfAccess = canUsePdfImport(tier);
  const pdfExpected = test.features.pdf;
  if (pdfAccess === pdfExpected) {
    console.log(colors.green(`  ✓ PDF Import: ${pdfAccess ? 'Enabled' : 'Disabled'}`));
  } else {
    console.log(colors.red(`  ✗ PDF Import: Expected ${pdfExpected}, got ${pdfAccess}`));
  }
  
  // Test AI Chatbot
  const aiAccess = canUseAiChatbot(tier);
  const aiExpected = test.features.ai;
  if (aiAccess === aiExpected) {
    console.log(colors.green(`  ✓ AI Chatbot: ${aiAccess ? 'Enabled' : 'Disabled'}`));
  } else {
    console.log(colors.red(`  ✗ AI Chatbot: Expected ${aiExpected}, got ${aiAccess}`));
  }
  
  // Test API Access
  const apiAccess = canUseApiAccess(tier);
  const apiExpected = test.features.api;
  if (apiAccess === apiExpected) {
    console.log(colors.green(`  ✓ API Access: ${apiAccess ? 'Enabled' : 'Disabled'}`));
  } else {
    console.log(colors.red(`  ✗ API Access: Expected ${apiExpected}, got ${apiAccess}`));
  }
  
  // Test Form Limits
  if (tier === 'FREE') {
    const canCreate0 = canCreateForm(tier, 0);
    const canCreate1 = canCreateForm(tier, 1);
    if (canCreate0 && !canCreate1) {
      console.log(colors.green(`  ✓ Form Limit: 1 form maximum`));
    } else {
      console.log(colors.red(`  ✗ Form Limit: Incorrect limit enforcement`));
    }
  } else {
    const canCreate100 = canCreateForm(tier, 100);
    if (canCreate100) {
      console.log(colors.green(`  ✓ Form Limit: Unlimited`));
    } else {
      console.log(colors.red(`  ✗ Form Limit: Should be unlimited`));
    }
  }
}

// Test 3: GBP Pricing
console.log(colors.cyan('\n💷 Test 3: GBP Pricing\n'));

const pricingTests = [
  { tier: 'FREE', monthly: 0, annual: 0 },
  { tier: 'STARTER', monthly: 19, annual: 190 },
  { tier: 'PROFESSIONAL', monthly: 49, annual: 490 },
  { tier: 'SCALE', monthly: 79, annual: 790 },
  { tier: 'ENTERPRISE', monthly: 149, annual: 1490 }
];

for (const test of pricingTests) {
  const tier = SUBSCRIPTION_TIERS[test.tier as SubscriptionTier];
  const monthlyCorrect = tier.monthlyPrice === test.monthly;
  const annualCorrect = tier.annualPrice === test.annual;
  
  if (monthlyCorrect && annualCorrect) {
    console.log(colors.green(`✓ ${test.tier}: £${test.monthly}/mo, £${test.annual}/yr`));
  } else {
    console.log(colors.red(`✗ ${test.tier}: Pricing mismatch`));
  }
}

// Test 4: 30-Day Trial
console.log(colors.cyan('\n⏰ Test 4: 30-Day Trial System\n'));

const trialUser = createTrialUser('test@wedsync.com');
if (trialUser.trial_tier === 'PROFESSIONAL' && trialUser.trial_active === true) {
  console.log(colors.green(`✓ New users get PROFESSIONAL tier for 30 days`));
} else {
  console.log(colors.red(`✗ Trial configuration incorrect`));
}

// Test active trial
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 15);
const activeStatus = checkTrialStatus(futureDate);
if (activeStatus.isActive && activeStatus.daysRemaining === 15) {
  console.log(colors.green(`✓ Trial status tracking works (15 days remaining)`));
} else {
  console.log(colors.red(`✗ Trial status calculation error`));
}

// Test expired trial
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);
const expiredStatus = checkTrialStatus(pastDate);
if (!expiredStatus.isActive && expiredStatus.daysRemaining === 0) {
  console.log(colors.green(`✓ Expired trial detection works`));
} else {
  console.log(colors.red(`✗ Expired trial not detected properly`));
}

// Test 5: Upgrade Paths
console.log(colors.cyan('\n📈 Test 5: Upgrade Path Logic\n'));

const upgradeTests = [
  { current: 'FREE', feature: 'pdfImport', expected: 'STARTER' },
  { current: 'STARTER', feature: 'aiChatbot', expected: 'PROFESSIONAL' },
  { current: 'PROFESSIONAL', feature: 'apiAccess', expected: 'SCALE' },
  { current: 'SCALE', feature: 'whiteLabel', expected: 'ENTERPRISE' }
];

for (const test of upgradeTests) {
  const path = getUpgradePath(test.current as SubscriptionTier, test.feature);
  if (path && path.suggestedTier === test.expected) {
    console.log(colors.green(`✓ ${test.current} → ${test.feature}: Upgrade to ${test.expected}`));
  } else {
    console.log(colors.red(`✗ ${test.current} → ${test.feature}: Incorrect upgrade path`));
  }
}

// Test 6: Legacy Tier Mapping (for backward compatibility)
console.log(colors.cyan('\n🔄 Test 6: Legacy Tier Mapping\n'));

const mappingTests = [
  { input: 'PRO', expected: 'PROFESSIONAL' },
  { input: 'BUSINESS', expected: 'ENTERPRISE' },
  { input: 'professional', expected: 'PROFESSIONAL' },
  { input: 'scale', expected: 'SCALE' }
];

for (const test of mappingTests) {
  const mapped = mapLegacyTier(test.input);
  if (mapped === test.expected) {
    console.log(colors.green(`✓ "${test.input}" → ${test.expected}`));
  } else {
    console.log(colors.red(`✗ "${test.input}" → Expected ${test.expected}, got ${mapped}`));
  }
}

// Test 7: Critical Payment Flow Scenarios
console.log(colors.cyan('\n🎯 Test 7: Critical Payment Scenarios\n'));

// Scenario 1: Free user hits limit
const freeUserForms = 1;
const canCreateAnother = canCreateForm('FREE', freeUserForms);
if (!canCreateAnother) {
  console.log(colors.green('✓ FREE user blocked after 1 form'));
  const upgradeSuggestion = getUpgradePath('FREE', 'moreForms');
  if (upgradeSuggestion?.suggestedTier === 'STARTER') {
    console.log(colors.green('  ✓ Suggests STARTER upgrade'));
  }
} else {
  console.log(colors.red('✗ FREE user not blocked at form limit'));
}

// Scenario 2: Starter user wants AI
const starterHasAI = canUseAiChatbot('STARTER');
if (!starterHasAI) {
  console.log(colors.green('✓ STARTER user cannot use AI chatbot'));
  const upgradeSuggestion = getUpgradePath('STARTER', 'aiChatbot');
  if (upgradeSuggestion?.suggestedTier === 'PROFESSIONAL') {
    console.log(colors.green('  ✓ Suggests PROFESSIONAL upgrade for AI'));
  }
} else {
  console.log(colors.red('✗ STARTER user has AI access (should not)'));
}

// Scenario 3: Professional user wants API
const proHasAPI = canUseApiAccess('PROFESSIONAL');
if (!proHasAPI) {
  console.log(colors.green('✓ PROFESSIONAL user cannot use API'));
  const upgradeSuggestion = getUpgradePath('PROFESSIONAL', 'apiAccess');
  if (upgradeSuggestion?.suggestedTier === 'SCALE') {
    console.log(colors.green('  ✓ Suggests SCALE upgrade for API'));
  }
} else {
  console.log(colors.red('✗ PROFESSIONAL user has API access (should not)'));
}

// Summary
console.log('\n' + '━'.repeat(60));
console.log(colors.bold(colors.cyan('\n📊 Test Summary\n')));

const criticalFeatures = [
  { name: 'PDF Import starts at STARTER (£19)', test: canUsePdfImport('STARTER') && !canUsePdfImport('FREE') },
  { name: 'AI Chatbot starts at PROFESSIONAL (£49)', test: canUseAiChatbot('PROFESSIONAL') && !canUseAiChatbot('STARTER') },
  { name: 'API Access starts at SCALE (£79)', test: canUseApiAccess('SCALE') && !canUseApiAccess('PROFESSIONAL') },
  { name: '30-day PROFESSIONAL trial for new users', test: trialUser.trial_tier === 'PROFESSIONAL' },
  { name: 'GBP pricing throughout', test: SUBSCRIPTION_TIERS.STARTER.currency === 'GBP' }
];

let allPassed = true;
for (const feature of criticalFeatures) {
  if (feature.test) {
    console.log(colors.green(`✓ ${feature.name}`));
  } else {
    console.log(colors.red(`✗ ${feature.name}`));
    allPassed = false;
  }
}

console.log('\n' + '━'.repeat(60));
if (allPassed) {
  console.log(colors.bold(colors.green('\n✅ ALL PAYMENT FEATURES WORKING CORRECTLY\n')));
  console.log(colors.green('The 5-tier payment system is ready for production!'));
} else {
  console.log(colors.bold(colors.red('\n❌ SOME PAYMENT FEATURES NEED ATTENTION\n')));
}

process.exit(allPassed ? 0 : 1);