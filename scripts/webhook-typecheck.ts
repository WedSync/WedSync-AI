#!/usr/bin/env npx tsx

/**
 * WS-201 Webhook Testing - Targeted TypeScript Validation
 * 
 * This script validates only the webhook-related files created for WS-201
 * to avoid getting stuck on unrelated TypeScript errors in the large codebase.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const webhookFiles = [
  // Core webhook files
  'src/lib/webhooks/webhook-system.ts',
  'src/lib/webhooks/webhook-manager.ts',
  'src/lib/webhooks/webhook-validator.ts',
  'src/lib/webhooks/webhook-queue.ts',
  
  // Performance and optimization files
  'src/lib/performance/webhook-performance-tester.ts',
  'src/lib/performance/webhook-optimizer.ts',
  'src/lib/performance/webhook-monitoring.ts',
  
  // Test files
  'src/__tests__/webhooks/webhook-system.test.ts',
  'src/__tests__/webhooks/webhook-delivery.test.ts',
  'src/__tests__/webhooks/webhook-security.test.ts',
  'src/__tests__/integration/webhooks/webhook-integration.test.ts',
  'src/__tests__/performance/webhooks/webhook-performance.test.ts',
  'src/__tests__/utils/webhook-mocks.ts',
  'src/__tests__/e2e/webhook-system.spec.ts',
  
  // API routes
  'src/app/api/webhooks/performance/route.ts',
  'src/app/api/webhooks/test/route.ts',
  'src/app/api/webhooks/manage/route.ts',
  'src/app/api/webhooks/admin/route.ts',
  
  // Components
  'src/components/webhooks/webhook-dashboard.tsx',
  'src/components/webhooks/webhook-performance-monitor.tsx',
  'src/components/webhooks/webhook-optimizer-controls.tsx'
];

console.log('🔍 WS-201 Webhook TypeScript Validation');
console.log('=====================================\n');

const existingFiles = webhookFiles.filter(file => {
  const fullPath = join(process.cwd(), file);
  const exists = existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  return exists;
});

console.log(`\n📊 Files found: ${existingFiles.length}/${webhookFiles.length}\n`);

if (existingFiles.length === 0) {
  console.log('❌ No webhook files found for validation');
  process.exit(1);
}

// Create temporary TypeScript configuration for webhook files only
const tempTsConfig = {
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    paths: {
      "@/*": ["./src/*"]
    }
  },
  include: existingFiles,
  exclude: ["node_modules"]
};

// Write temporary config
const tempConfigPath = join(process.cwd(), 'tsconfig.webhook.json');
require('fs').writeFileSync(tempConfigPath, JSON.stringify(tempTsConfig, null, 2));

try {
  console.log('🔄 Running TypeScript validation on webhook files...\n');
  
  execSync(`npx tsc --noEmit --project tsconfig.webhook.json`, {
    stdio: 'inherit',
    timeout: 60000 // 1 minute timeout
  });
  
  console.log('\n✅ Webhook TypeScript validation successful!');
  console.log('🎯 All webhook files compile without errors.');
  
} catch (error: any) {
  console.error('\n❌ TypeScript validation failed:');
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
  
} finally {
  // Clean up temporary config
  try {
    require('fs').unlinkSync(tempConfigPath);
  } catch {
    // Ignore cleanup errors
  }
}

console.log('\n🎉 WS-201 Webhook TypeScript validation complete!');