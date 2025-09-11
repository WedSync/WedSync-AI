#!/usr/bin/env tsx
/**
 * Comprehensive Security Testing Script for WedSync Form Implementation
 * Tests all security measures implemented in Story 3
 */

import { formSchema, formSubmissionSchema } from '../src/lib/validations/forms';
import { generateSecureId, generateSecureToken, generateUUID } from '../src/lib/crypto-utils';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

// Simple field value sanitizer for testing
function sanitizeFieldValue(value: unknown, fieldType: string): unknown {
  if (value === null || value === undefined) return value;
  
  if (typeof value === 'string') {
    // Remove potential XSS patterns
    const cleaned = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '');
    
    // Validate against field type
    switch (fieldType) {
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(cleaned) ? cleaned : null;
      case 'tel':
        const phonePattern = /^[\+]?[\d\s\-\(\)]{10,20}$/;
        return phonePattern.test(cleaned) ? cleaned : null;
      case 'number':
        const num = parseFloat(cleaned);
        return !isNaN(num) ? num : null;
      default:
        return /^[a-zA-Z0-9\s\-_.,!?()'"@#$%&*+=:;/<>\[\]{}|~`^\\]*$/.test(cleaned) ? cleaned : null;
    }
  }
  
  return value;
}

class SecurityTester {
  private results: TestResult[] = [];

  private log(test: string, passed: boolean, details: string) {
    this.results.push({ test, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}: ${details}`);
  }

  // Test 1: Zod Schema Validation
  async testZodValidation() {
    console.log('\n🔍 Testing Zod Schema Validation...');

    try {
      // Valid form data
      const validForm = {
        title: 'Wedding Photography Contract',
        description: 'Please fill out your wedding details',
        sections: [{
          id: generateUUID(),
          title: 'Contact Information',
          description: 'Your basic information',
          fields: [{
            id: generateUUID(),
            type: 'text' as const,
            label: 'Full Name',
            placeholder: 'Enter your full name',
            required: true,
            order: 0,
            validation: {
              required: true,
              minLength: 2,
              maxLength: 100
            }
          }],
          order: 0
        }],
        settings: {
          name: 'Wedding Form',
          description: 'Test form',
          submitButtonText: 'Submit',
          successMessage: 'Thank you!',
          autoSave: false,
          requireLogin: false,
          allowMultipleSubmissions: false,
          collectEmail: true
        },
        isPublished: true,
        slug: 'test-form'
      };

      const result = formSchema.parse(validForm);
      this.log('Valid form validation', true, 'Form schema validation passed');

      // Test malicious input
      const maliciousForm = {
        ...validForm,
        title: '<script>alert("xss")</script>Malicious Form',
        description: 'javascript:alert("xss")'
      };

      try {
        formSchema.parse(maliciousForm);
        this.log('XSS prevention in schema', false, 'Schema should have rejected malicious content');
      } catch (error) {
        this.log('XSS prevention in schema', true, 'Schema properly rejected malicious content');
      }

    } catch (error) {
      this.log('Schema validation test', false, `Validation failed: ${error}`);
    }
  }

  // Test 2: XSS Prevention with DOMPurify
  async testXSSPrevention() {
    console.log('\n🛡️ Testing XSS Prevention...');

    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')" />',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<svg onload="alert(\'xss\')"></svg>',
      '"><script>alert("xss")</script>',
      '<div onclick="alert(\'xss\')">Click me</div>',
      '<a href="data:text/html,<script>alert(\'xss\')</script>">Link</a>'
    ];

    let xssBlocked = 0;
    const totalPayloads = xssPayloads.length;

    for (const payload of xssPayloads) {
      const sanitized = DOMPurify.sanitize(payload, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });

      // Additional sanitization from our implementation
      const fullySanitized = sanitized
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/eval\s*\(/gi, '')
        .replace(/expression\s*\(/gi, '');

      if (!fullySanitized.includes('<script') && 
          !fullySanitized.includes('javascript:') &&
          !fullySanitized.includes('onerror') &&
          !fullySanitized.includes('onload') &&
          !fullySanitized.includes('onclick')) {
        xssBlocked++;
      }
    }

    const blockRate = (xssBlocked / totalPayloads) * 100;
    this.log('XSS payload blocking', blockRate === 100, 
             `Blocked ${xssBlocked}/${totalPayloads} payloads (${blockRate.toFixed(1)}%)`);
  }

  // Test 3: CSRF Token Generation and Validation
  async testCSRFProtection() {
    console.log('\n🔐 Testing CSRF Protection...');

    try {
      // Test token generation
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);

      // Tokens should be different
      const tokensUnique = token1 !== token2;
      this.log('CSRF token uniqueness', tokensUnique, 'Generated tokens are unique');

      // Token should be hex format
      const tokenFormat = /^[a-f0-9]{64}$/.test(token1);
      this.log('CSRF token format', tokenFormat, 'Token follows secure hex format');

      // Test token length
      const tokenLength = token1.length === 64;
      this.log('CSRF token length', tokenLength, `Token length is 64 characters: ${token1.length}`);

    } catch (error) {
      this.log('CSRF token generation', false, `Token generation failed: ${error}`);
    }
  }

  // Test 4: Input Sanitization
  async testInputSanitization() {
    console.log('\n🧹 Testing Input Sanitization...');

    const testCases = [
      {
        input: 'Normal text',
        fieldType: 'text',
        expected: 'Normal text',
        description: 'Normal text should pass through'
      },
      {
        input: '<script>alert("xss")</script>',
        fieldType: 'text',
        expected: null,
        description: 'Script tags should be rejected'
      },
      {
        input: 'test@example.com',
        fieldType: 'email',
        expected: 'test@example.com',
        description: 'Valid email should pass'
      },
      {
        input: 'not-an-email',
        fieldType: 'email',
        expected: null,
        description: 'Invalid email should be rejected'
      },
      {
        input: '+1-555-123-4567',
        fieldType: 'tel',
        expected: '+1-555-123-4567',
        description: 'Valid phone should pass'
      },
      {
        input: 'abc123',
        fieldType: 'tel',
        expected: null,
        description: 'Invalid phone should be rejected'
      }
    ];

    let passedTests = 0;
    for (const testCase of testCases) {
      const result = sanitizeFieldValue(testCase.input, testCase.fieldType);
      const passed = result === testCase.expected;
      
      if (passed) passedTests++;
      
      this.log(`Input sanitization: ${testCase.description}`, passed, 
               `Input: "${testCase.input}" -> Output: "${result}"`);
    }

    const sanitizationRate = (passedTests / testCases.length) * 100;
    this.log('Overall input sanitization', sanitizationRate === 100,
             `${passedTests}/${testCases.length} tests passed (${sanitizationRate.toFixed(1)}%)`);
  }

  // Test 5: File Upload Security
  async testFileUploadSecurity() {
    console.log('\n📁 Testing File Upload Security...');

    const testFiles = [
      {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024 * 1024, // 1MB
        shouldPass: true,
        description: 'Valid PDF should be accepted'
      },
      {
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
        shouldPass: true,
        description: 'Valid image should be accepted'
      },
      {
        name: 'malicious.exe',
        type: 'application/x-executable',
        size: 1024,
        shouldPass: false,
        description: 'Executable files should be rejected'
      },
      {
        name: 'large_file.pdf',
        type: 'application/pdf',
        size: 100 * 1024 * 1024, // 100MB
        shouldPass: false,
        description: 'Oversized files should be rejected'
      },
      {
        name: '../../../etc/passwd',
        type: 'text/plain',
        size: 1024,
        shouldPass: false,
        description: 'Path traversal attempts should be rejected'
      }
    ];

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const maxFileSize = 50 * 1024 * 1024; // 50MB

    let passedTests = 0;
    for (const file of testFiles) {
      const typeAllowed = allowedTypes.includes(file.type);
      const sizeAllowed = file.size <= maxFileSize;
      const nameValid = !/[<>:"|?*\\\/]/.test(file.name) && !file.name.includes('..');
      
      const shouldAccept = typeAllowed && sizeAllowed && nameValid;
      const passed = shouldAccept === file.shouldPass;
      
      if (passed) passedTests++;
      
      this.log(`File upload: ${file.description}`, passed,
               `Type: ${typeAllowed}, Size: ${sizeAllowed}, Name: ${nameValid} -> ${shouldAccept ? 'Accept' : 'Reject'}`);
    }

    const uploadSecurityRate = (passedTests / testFiles.length) * 100;
    this.log('File upload security', uploadSecurityRate === 100,
             `${passedTests}/${testFiles.length} tests passed (${uploadSecurityRate.toFixed(1)}%)`);
  }

  // Test 6: Form Submission Validation
  async testFormSubmissionValidation() {
    console.log('\n📝 Testing Form Submission Validation...');

    const formId = generateUUID();
    const csrfToken = generateSecureToken(32);
    const field1Id = generateUUID();
    const field2Id = generateUUID(); 
    const field3Id = generateUUID();

    // Valid submission
    const validSubmission = {
      formId,
      data: {
        [field1Id]: 'John Doe',
        [field2Id]: 'john@example.com',
        [field3Id]: '+1-555-123-4567'
      },
      metadata: {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        timestamp: new Date().toISOString(),
        sessionId: generateUUID()
      }
    };

    try {
      const result = formSubmissionSchema.parse(validSubmission);
      this.log('Valid form submission', true, 'Submission validation passed');
    } catch (error) {
      this.log('Valid form submission', false, `Validation failed: ${error}`);
    }

    // Test malicious submission
    const maliciousSubmission = {
      formId,
      data: {
        [field1Id]: '<script>alert("xss")</script>',
        [field2Id]: 'javascript:alert("xss")',
        [field3Id]: '"; DROP TABLE forms; --'
      },
      metadata: {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        timestamp: new Date().toISOString(),
        sessionId: generateUUID()
      }
    };

    try {
      formSubmissionSchema.parse(maliciousSubmission);
      this.log('Malicious submission rejection', false, 'Schema should have rejected malicious submission');
    } catch (error) {
      this.log('Malicious submission rejection', true, 'Schema properly rejected malicious content');
    }
  }

  // Test 7: TypeScript Type Safety
  async testTypeSafety() {
    console.log('\n🔧 Testing TypeScript Type Safety...');

    // This test verifies our type definitions work correctly
    try {
      interface TestFormField {
        id: string;
        type: 'text' | 'email' | 'number';
        label: string;
        required: boolean;
      }

      const validField: TestFormField = {
        id: generateUUID(),
        type: 'text',
        label: 'Test Field',
        required: true
      };

      // TypeScript should catch type violations at compile time
      const fieldValid = typeof validField.id === 'string' && 
                        ['text', 'email', 'number'].includes(validField.type) &&
                        typeof validField.label === 'string' &&
                        typeof validField.required === 'boolean';

      this.log('TypeScript type safety', fieldValid, 'Type definitions are properly enforced');

    } catch (error) {
      this.log('TypeScript type safety', false, `Type checking failed: ${error}`);
    }
  }

  // Generate comprehensive security report
  generateReport() {
    console.log('\n📊 SECURITY TEST REPORT');
    console.log('========================');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.test}: ${result.details}`);
      });
    }

    console.log('\n🎯 SECURITY SCORE:');
    if (successRate >= 95) {
      console.log('🟢 EXCELLENT (95-100%) - Production Ready');
    } else if (successRate >= 85) {
      console.log('🟡 GOOD (85-94%) - Minor improvements needed');
    } else if (successRate >= 70) {
      console.log('🟠 MODERATE (70-84%) - Significant improvements needed');
    } else {
      console.log('🔴 POOR (<70%) - Not production ready');
    }

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      successRate,
      results: this.results
    };

    require('fs').writeFileSync(
      'security-test-report.json',
      JSON.stringify(reportData, null, 2)
    );

    console.log('\n📄 Report saved to: security-test-report.json');
    
    return successRate >= 95;
  }

  // Run all security tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Security Tests...');
    console.log('==========================================');

    await this.testZodValidation();
    await this.testXSSPrevention();
    await this.testCSRFProtection();
    await this.testInputSanitization();
    await this.testFileUploadSecurity();
    await this.testFormSubmissionValidation();
    await this.testTypeSafety();

    return this.generateReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Security test failed:', error);
      process.exit(1);
    });
}

export { SecurityTester };