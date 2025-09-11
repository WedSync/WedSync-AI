#!/usr/bin/env tsx
/**
 * PDF Security Test Script
 * Tests the enhanced PDF security features
 */

import { createClient } from '@supabase/supabase-js';
import { EnhancedPDFValidator } from '../src/lib/ocr/enhanced-pdf-validator';
import { SecureFileStorage } from '../src/lib/secure-file-storage';
import { AuditLogger } from '../src/lib/audit-logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Buffer } from 'buffer';

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const validator = new EnhancedPDFValidator({
  scanForVirus: true,
  enableDeepScan: true,
});

const storage = new SecureFileStorage({
  encryptionEnabled: true,
});

const logger = AuditLogger.getInstance();

// Test data
const TEST_USER_ID = 'test-user-123';
const TEST_ORG_ID = 'test-org-456';
const TEST_EMAIL = 'test@example.com';

// Test cases
const testCases = [
  {
    name: 'Clean PDF',
    createBuffer: () => Buffer.from('%PDF-1.4\nClean content'),
    expectedValid: true,
    expectedSafe: true,
    expectedThreat: 'none',
  },
  {
    name: 'EICAR Test Virus',
    createBuffer: () => {
      const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      return Buffer.from(`%PDF-1.4\n${eicar}`);
    },
    expectedValid: false,
    expectedSafe: false,
    expectedThreat: 'critical',
  },
  {
    name: 'JavaScript Injection',
    createBuffer: () => Buffer.from(
      '%PDF-1.4\n/JavaScript << /JS (eval(unescape("%61%6c%65%72%74%28%31%29"))) >>'
    ),
    expectedValid: false,
    expectedSafe: false,
    expectedThreat: 'critical',
  },
  {
    name: 'Embedded Executable',
    createBuffer: () => Buffer.from(
      '%PDF-1.4\n/EmbeddedFile << /F (malware.exe) /Type /Filespec >>'
    ),
    expectedValid: false,
    expectedSafe: true, // Just medium threat
    expectedThreat: 'medium',
  },
  {
    name: 'Wrong Magic Bytes (Disguised EXE)',
    createBuffer: () => Buffer.from('MZ\x90\x00\x03'), // EXE header
    expectedValid: false,
    expectedSafe: false,
    expectedThreat: 'high',
  },
];

async function runSecurityTests() {
  console.log('🔒 PDF Security Test Suite');
  console.log('=' .repeat(50));
  
  let passedTests = 0;
  let failedTests = 0;
  const testResults: any[] = [];
  
  for (const testCase of testCases) {
    console.log(`\n📄 Testing: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    try {
      const buffer = testCase.createBuffer();
      const filename = `${testCase.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      
      // Run validation
      const startTime = Date.now();
      const result = await validator.validate(buffer, filename);
      const processingTime = Date.now() - startTime;
      
      // Check results
      const validMatch = result.isValid === testCase.expectedValid;
      const safeMatch = result.isSafe === testCase.expectedSafe;
      const threatMatch = result.threatLevel === testCase.expectedThreat;
      
      const passed = validMatch && safeMatch && threatMatch;
      
      if (passed) {
        console.log('✅ PASSED');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        failedTests++;
      }
      
      console.log(`  Valid: ${result.isValid} (expected: ${testCase.expectedValid}) ${validMatch ? '✓' : '✗'}`);
      console.log(`  Safe: ${result.isSafe} (expected: ${testCase.expectedSafe}) ${safeMatch ? '✓' : '✗'}`);
      console.log(`  Threat: ${result.threatLevel} (expected: ${testCase.expectedThreat}) ${threatMatch ? '✓' : '✗'}`);
      console.log(`  Processing Time: ${processingTime}ms`);
      
      if (result.virusScanResult) {
        console.log(`  Virus Scan: ${result.virusScanResult.clean ? 'Clean' : 'Infected'}`);
        if (!result.virusScanResult.clean) {
          console.log(`    Threats: ${result.virusScanResult.threats.join(', ')}`);
        }
      }
      
      if (result.issues.length > 0) {
        console.log(`  Issues:`);
        result.issues.forEach(issue => console.log(`    - ${issue}`));
      }
      
      testResults.push({
        name: testCase.name,
        passed,
        processingTime,
        result,
      });
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      failedTests++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('-'.repeat(40));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);
  
  // Test encryption
  console.log('\n🔐 Testing Encryption');
  console.log('-'.repeat(40));
  
  const testData = Buffer.from('Sensitive PDF content for encryption test');
  const encrypted = storage['encryptFile'](testData);
  const decrypted = storage['decryptFile'](
    encrypted.encryptedData,
    encrypted.iv,
    encrypted.authTag
  );
  
  if (decrypted.equals(testData)) {
    console.log('✅ Encryption/Decryption successful');
  } else {
    console.log('❌ Encryption/Decryption failed');
  }
  
  console.log(`  Original size: ${testData.length} bytes`);
  console.log(`  Encrypted size: ${encrypted.encryptedData.length} bytes`);
  console.log(`  Algorithm: ${encrypted.algorithm}`);
  
  // Test audit logging
  console.log('\n📝 Testing Audit Logging');
  console.log('-'.repeat(40));
  
  await logger.logSecurityThreat(
    'Test threat detection',
    TEST_USER_ID,
    { test: true, timestamp: new Date().toISOString() }
  );
  
  console.log('✅ Audit log entry created');
  
  // Test suspicious pattern detection
  console.log('\n🔍 Testing Suspicious Pattern Detection');
  console.log('-'.repeat(40));
  
  const patterns = await logger.detectSuspiciousPatterns(TEST_ORG_ID, 60);
  
  console.log(`  Failed uploads: ${patterns.multipleFailedUploads}`);
  console.log(`  Rate limit violations: ${patterns.rateLimitViolations}`);
  console.log(`  Cross-org attempts: ${patterns.crossOrgAttempts}`);
  console.log(`  Malware detections: ${patterns.malwareDetections}`);
  
  // Generate security report
  console.log('\n📄 Generating Security Report');
  console.log('-'.repeat(40));
  
  const report = {
    timestamp: new Date().toISOString(),
    testsRun: testCases.length,
    passed: passedTests,
    failed: failedTests,
    successRate: `${((passedTests / testCases.length) * 100).toFixed(1)}%`,
    encryptionEnabled: true,
    auditLoggingEnabled: true,
    testResults,
    performance: {
      averageProcessingTime: testResults.reduce((sum, r) => sum + r.processingTime, 0) / testResults.length,
      maxProcessingTime: Math.max(...testResults.map(r => r.processingTime)),
      minProcessingTime: Math.min(...testResults.map(r => r.processingTime)),
    },
  };
  
  const reportPath = path.join(process.cwd(), 'pdf-security-test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Report saved to: ${reportPath}`);
  
  console.log('\n✨ Security test suite completed!');
  
  // Cleanup
  logger.stopFlushInterval();
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runSecurityTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});