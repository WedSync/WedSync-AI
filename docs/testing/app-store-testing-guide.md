# WS-187 App Store Preparation Testing Guide
## Comprehensive Testing Framework Documentation

### Overview
This guide provides complete documentation for the WS-187 App Store Preparation testing framework. The testing suite ensures reliable, secure, and compliant app store submission processes for wedding professionals using WedSync.

## Table of Contents
1. [Testing Strategy](#testing-strategy)
2. [Test Suite Architecture](#test-suite-architecture) 
3. [Store Compliance Testing](#store-compliance-testing)
4. [Visual Regression Testing](#visual-regression-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Test Execution](#test-execution)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)
10. [Quality Gates](#quality-gates)

## Testing Strategy

### Core Objectives
- **Compliance Validation**: Ensure all generated assets and submissions meet Microsoft Store, Google Play, and Apple App Store requirements
- **Performance Assurance**: Validate asset generation and submission workflows meet sub-3-second performance targets
- **Security Protection**: Verify credential encryption, data protection, and audit logging throughout the submission process
- **Visual Consistency**: Ensure generated assets display correctly across all platforms and device types
- **Enterprise Reliability**: Provide wedding professionals with confidence in their app store presence

### Testing Pyramid
```
┌─────────────────────────────────────┐
│         E2E Tests (10%)             │ ← Visual regression, full workflows
├─────────────────────────────────────┤
│      Integration Tests (30%)        │ ← Store APIs, security, compliance  
├─────────────────────────────────────┤
│        Unit Tests (60%)             │ ← Asset generation, validation logic
└─────────────────────────────────────┘
```

### Quality Metrics
- **Test Coverage**: >85% code coverage for app store preparation modules
- **Performance Benchmarks**: Asset generation <3s, submission workflow <30s
- **Security Validation**: 100% credential encryption, webhook signature verification
- **Compliance Rate**: 100% store requirement validation across all platforms

## Test Suite Architecture

### Directory Structure
```
__tests__/
├── integrations/app-store/
│   └── store-compliance.test.ts        # Store requirement validation
├── visual/
│   └── app-store-assets.spec.ts        # Playwright visual testing
├── performance/
│   └── app-store-workflows.test.ts     # Performance and load testing
├── security/
│   └── app-store-security.test.ts      # Security and compliance testing
└── utils/
    └── store-testing-helpers.ts        # Shared testing utilities
```

### Test Framework Stack
- **Jest**: Unit and integration testing framework
- **Playwright**: Visual regression and E2E testing
- **Supertest**: API endpoint testing
- **Node.js Performance API**: Performance measurement
- **Crypto Module**: Security validation testing

## Store Compliance Testing

### Microsoft Store PWA Requirements
Location: `__tests__/integrations/app-store/store-compliance.test.ts`

#### Manifest Validation
```typescript
// Validates PWA manifest.json structure
test('validates PWA manifest.json structure', async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  
  expect(manifest.name).toBeDefined();
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBeOneOf(['standalone', 'fullscreen', 'minimal-ui']);
  expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
});
```

#### Service Worker Validation
- Verifies service worker registration
- Tests offline functionality requirements
- Validates cache management

### Google Play Console Policy Compliance
#### Privacy Policy Validation
```typescript
test('validates privacy policy presence', async () => {
  const response = await fetch('/api/legal/privacy-policy');
  expect(response.status).toBe(200);
  
  const content = await response.text();
  expect(content).toContain('privacy policy');
  expect(content).toContain('data collection');
});
```

#### Content Rating Compliance
- Validates content appropriateness for wedding professionals
- Ensures no prohibited content types
- Verifies age rating compliance

### Apple App Store Connect Guidelines
#### Screenshot Dimension Requirements
```typescript
const iPhoneScreenshots = [
  { width: 1242, height: 2688 }, // iPhone 12 Pro Max
  { width: 1170, height: 2532 }, // iPhone 12 Pro
  { width: 828, height: 1792 }   // iPhone 11
];
```

#### Metadata Character Limits
- App name: ≤30 characters
- Subtitle: ≤30 characters  
- Description: ≤4000 characters
- Keywords: ≤100 characters

### Cross-Platform Asset Validation
#### Icon Requirements
```typescript
const requiredIcons = [
  // Android: 48x48, 72x72, 96x96, 144x144, 192x192
  // iOS: 57x57, 120x120, 152x152, 180x180
  // Windows: 44x44, 150x150, 310x310
];
```

## Visual Regression Testing

### Playwright Configuration
Location: `__tests__/visual/app-store-assets.spec.ts`

#### Device Matrix Testing
```typescript
const mobileDevices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12 Pro', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 428, height: 926 },
  { name: 'Pixel 7', width: 412, height: 915 }
];
```

#### Screenshot Comparison
- **Threshold**: 0.2 (20% tolerance for minor rendering differences)
- **Animation Handling**: Disabled during screenshots
- **Full Page**: Enabled for submission interface testing
- **Cross-Browser**: Chrome, Firefox, Safari, Edge validation

#### Visual Test Categories
1. **Asset Generation Testing**: Icon, splash screen, promotional asset generation
2. **Submission Interface Testing**: Microsoft Store, Google Play, Apple App Store forms
3. **Mobile Responsiveness**: Touch interface and viewport adaptation
4. **Error State Visualization**: Upload errors, compliance failures, network issues

### Screenshot Management
```bash
# Update visual baselines
npx playwright test __tests__/visual/ --update-snapshots

# Compare across browsers
npx playwright test __tests__/visual/ --project=chromium,firefox,webkit
```

## Performance Testing

### Asset Processing Performance
Location: `__tests__/performance/app-store-workflows.test.ts`

#### Concurrent Asset Generation
```typescript
test('validates concurrent asset generation performance', async () => {
  const concurrentTasks = 5;
  const portfolioSizes = ['small', 'medium', 'large'];
  
  // Performance requirements:
  // - Individual asset generation: <3 seconds
  // - Concurrent processing: <15 seconds total
  // - Memory usage: <500MB increase
});
```

#### Performance Benchmarks
- **Asset Generation**: Individual assets <3 seconds
- **Large Portfolio Processing**: 200 images + 5 videos <30 seconds  
- **Memory Optimization**: <500MB peak usage during processing
- **CPU Efficiency**: <80% CPU utilization during intensive operations

### API Performance Testing
#### Rate Limiting with Backoff
```typescript
// Store API rate limits:
// Microsoft Store: 100 req/hour, 20 burst
// Google Play: 50 req/hour, 15 burst  
// Apple App Store: 30 req/hour, 10 burst
```

#### Connection Pooling
- **Max Connections**: 10 concurrent connections
- **Connection Reuse**: >70% reuse rate
- **Average Response Time**: <300ms with pooling

### User Experience Performance
#### UI Responsiveness During Background Processing
```typescript
const uiInteractions = [
  { action: 'button-click', expectedResponseTime: 100 },
  { action: 'form-input', expectedResponseTime: 50 },
  { action: 'modal-open', expectedResponseTime: 150 }
];
```

- **UI Response Time**: All interactions <300ms maximum
- **Background Processing**: Non-blocking asset generation
- **Progress Indicators**: >80% accuracy in time estimates

## Security Testing

### Credential Security
Location: `__tests__/security/app-store-security.test.ts`

#### API Key Encryption
```typescript
// AES-256 encryption for all store credentials
const encryptionKey = randomBytes(32); // 256-bit key
const iv = randomBytes(16); // 128-bit IV

// Key rotation testing every 60-120 days
```

#### OAuth Token Management
- **Token Validation**: JWT structure and expiry checking
- **Automatic Refresh**: <5 minutes before expiry
- **Secure Storage**: Encrypted at rest, secure transmission

### Data Protection Testing
#### Asset Encryption During Transmission
```typescript
// Wedding asset protection:
// - AES-256-GCM encryption
// - SHA-256 integrity verification
// - Secure key management
```

#### Webhook Signature Verification
```typescript
const generateWebhookSignature = (payload, secret) => {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
};

// HMAC-SHA256 signature validation
// 5-minute timestamp window to prevent replay attacks
```

### GDPR Compliance Testing
#### Data Processing Consent
```typescript
const gdprCompliance = {
  lawfulBasisRequired: true,
  consentRequired: true,
  dataMinimization: true,
  rightToErasure: true,
  dataPortability: true
};
```

#### Privacy Policy Validation
- **Consent Management**: Granular consent with withdrawal mechanism
- **Data Retention**: 24-month maximum retention period
- **User Rights**: Access, rectification, erasure, portability implementation

## Test Execution

### Running Individual Test Suites

#### Store Compliance Tests
```bash
# Run compliance validation
npm test __tests__/integrations/app-store/

# Expected output:
✓ Microsoft Store PWA Requirements
✓ Google Play Console Policy Compliance  
✓ Apple App Store Connect Guidelines
✓ Cross-Platform Asset Validation
```

#### Visual Regression Tests  
```bash
# Run visual tests
npx playwright test __tests__/visual/app-store-assets.spec.ts

# Update baselines
npx playwright test __tests__/visual/ --update-snapshots
```

#### Performance Tests
```bash
# Run performance benchmarks
npm test __tests__/performance/app-store-workflows.test.ts

# Performance report generated at: test-results/performance-report.html
```

#### Security Tests
```bash
# Run security validation
npm test __tests__/security/app-store-security.test.ts

# Security scan report generated at: test-results/security-scan.html
```

### Comprehensive Test Run
```bash
# Run all app store preparation tests
npm test __tests__/integrations/app-store/ __tests__/visual/ __tests__/performance/ __tests__/security/

# Generate coverage report
npm run test:coverage -- --collectCoverageFrom="src/**/*app-store*"
```

### Test Configuration
#### Jest Configuration (jest.config.js)
```javascript
{
  testTimeout: 30000, // 30 seconds for AI service tests
  testMatch: [
    '<rootDir>/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
}
```

#### Playwright Configuration (playwright.config.ts)
```javascript
{
  testDir: '__tests__/visual/',
  timeout: 30000,
  expect: {
    toHaveScreenshot: { threshold: 0.2, animations: 'disabled' }
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] }
  ]
}
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: App Store Testing Pipeline

on:
  push:
    branches: [main, develop]
    paths: ['src/**/*app-store*', '__tests__/**/*app-store*']
  pull_request:
    branches: [main]

jobs:
  app-store-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run compliance tests
        run: npm test __tests__/integrations/app-store/
        
      - name: Run performance tests  
        run: npm test __tests__/performance/app-store-workflows.test.ts
        
      - name: Run security tests
        run: npm test __tests__/security/app-store-security.test.ts
        
      - name: Install Playwright
        run: npx playwright install
        
      - name: Run visual regression tests
        run: npx playwright test __tests__/visual/app-store-assets.spec.ts
        
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: app-store-test-results
          path: |
            test-results/
            playwright-report/
```

### Quality Gates
#### Pre-Deployment Checks
```bash
#!/bin/bash
# Pre-deployment validation script

echo "🚀 WS-187 App Store Preparation - Pre-deployment Validation"

# 1. Compliance validation
echo "📋 Running store compliance tests..."
npm test __tests__/integrations/app-store/ || exit 1

# 2. Performance benchmarks
echo "⚡ Validating performance benchmarks..."
npm test __tests__/performance/app-store-workflows.test.ts || exit 1

# 3. Security validation
echo "🔒 Running security tests..."
npm test __tests__/security/app-store-security.test.ts || exit 1

# 4. Visual regression check
echo "👁️ Checking visual regression..."
npx playwright test __tests__/visual/app-store-assets.spec.ts || exit 1

# 5. Type checking
echo "🔍 Type checking..."
npm run typecheck || exit 1

echo "✅ All pre-deployment checks passed!"
```

### Deployment Pipeline Integration
```yaml
deploy:
  needs: app-store-tests
  if: success()
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to staging
      run: |
        echo "Deploying app store preparation system..."
        # Deployment commands here
    
    - name: Post-deployment smoke tests
      run: |
        # Quick smoke tests to verify deployment
        curl -f https://staging.wedsync.com/api/app-store/health || exit 1
```

## Troubleshooting

### Common Test Failures

#### Store Compliance Test Failures
```bash
# Issue: Manifest validation failed
# Solution: Check manifest.json structure
cat public/manifest.json | jq '.'

# Issue: Privacy policy not accessible
# Solution: Verify API route exists
curl http://localhost:3000/api/legal/privacy-policy
```

#### Visual Regression Test Failures
```bash
# Issue: Screenshot differences detected
# Solution: Update baselines if changes are intentional
npx playwright test __tests__/visual/ --update-snapshots

# Issue: Cross-browser inconsistencies
# Solution: Check CSS compatibility
npx playwright test --project=firefox --headed
```

#### Performance Test Failures
```bash
# Issue: Asset generation timeout
# Solution: Check system resources and optimize
npm test __tests__/performance/ -- --verbose

# Issue: Memory usage exceeded
# Solution: Review asset processing batch sizes
node --max-old-space-size=4096 npm test
```

#### Security Test Failures
```bash
# Issue: Credential encryption failed
# Solution: Verify crypto module availability
node -e "console.log(require('crypto').constants)"

# Issue: Webhook signature validation failed  
# Solution: Check HMAC secret configuration
echo $WEBHOOK_SECRET | wc -c # Should be >20 characters
```

### Debug Configuration
#### Enable Verbose Logging
```bash
# Debug Jest tests
DEBUG=* npm test __tests__/integrations/app-store/

# Debug Playwright tests
DEBUG=pw:api npx playwright test __tests__/visual/
```

#### Performance Profiling
```bash
# Profile Node.js performance
node --prof npm test __tests__/performance/
node --prof-process isolate-*.log > perf-analysis.txt
```

### Test Data Management
#### Mock Data Setup
```typescript
// Test fixtures location: __tests__/fixtures/
export const mockWeddingPortfolio = {
  id: 'portfolio-12345',
  images: [
    { name: 'ceremony-1.jpg', size: 1024000, format: 'jpeg' },
    { name: 'reception-1.jpg', size: 1536000, format: 'jpeg' }
  ],
  businessInfo: {
    name: 'Elegant Moments Photography',
    category: 'Photography & Video'
  }
};
```

#### Environment Configuration
```bash
# Test environment variables
export TEST_STORE_API_KEY="test-key-12345"
export TEST_WEBHOOK_SECRET="test-secret-67890"
export NODE_ENV="test"
```

## Quality Gates

### Pre-Commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm test __tests__/integrations/app-store/",
      "pre-push": "npm run test:app-store"
    }
  }
}
```

### Coverage Requirements
- **Overall Coverage**: >85% for app store preparation modules
- **Branch Coverage**: >80% for compliance validation logic
- **Function Coverage**: >90% for security functions
- **Line Coverage**: >85% for asset generation code

### Performance SLAs
- **Asset Generation**: 95th percentile <3 seconds
- **Submission Workflow**: 95th percentile <30 seconds  
- **UI Responsiveness**: 99th percentile <300ms
- **API Response Time**: 95th percentile <2 seconds

### Security Requirements
- **Credential Protection**: 100% encryption coverage
- **Data Sanitization**: 100% PII removal validation
- **Audit Logging**: 100% security event coverage
- **Compliance Validation**: 100% store requirement checks

---

## Support and Maintenance

### Test Maintenance Schedule
- **Weekly**: Visual regression baseline updates
- **Monthly**: Performance benchmark reviews
- **Quarterly**: Security test updates and vulnerability scans
- **Per Store Update**: Compliance requirement validation updates

### Contact Information
- **Technical Lead**: Development Team Lead
- **Security Contact**: Security Team Lead  
- **QA Contact**: QA Team Lead
- **Documentation**: [Internal Wiki Link]

### Version History
- **v1.0.0**: Initial testing framework implementation
- **v1.1.0**: Added cross-browser visual testing
- **v1.2.0**: Enhanced security testing coverage
- **v2.0.0**: Complete testing suite with CI/CD integration

---

*This document is part of the WS-187 App Store Preparation testing framework. For technical support, contact the development team.*