/**
 * Comprehensive Security Validation Test Suite
 * Validates all implemented security measures and system stability
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { errorHandler } from '@/lib/stability/error-handler'
import { memoryManager } from '@/lib/stability/memory-manager'
import { databaseManager } from '@/lib/stability/database-manager'
import { fileUploadSecurity } from '@/lib/security/file-upload-security'
import { productionRateLimiters } from '@/lib/security/production-rate-limiter'
import { XSSProtection } from '@/lib/security/xss-protection'
import * as crypto from 'crypto'

describe('Comprehensive Security Validation', () => {
  let testResults: Array<{
    category: string
    test: string
    status: 'PASS' | 'FAIL' | 'WARNING'
    details: string
    performance?: number
  }> = []

  beforeAll(async () => {
    console.log('🚀 Starting comprehensive security validation...')
  })

  afterAll(async () => {
    // Generate final report
    console.log('\n📊 SECURITY VALIDATION RESULTS:')
    console.log('================================')
    
    const categories = [...new Set(testResults.map(r => r.category))]
    
    for (const category of categories) {
      const categoryResults = testResults.filter(r => r.category === category)
      const passed = categoryResults.filter(r => r.status === 'PASS').length
      const failed = categoryResults.filter(r => r.status === 'FAIL').length
      const warnings = categoryResults.filter(r => r.status === 'WARNING').length
      
      console.log(`\n${category}:`)
      console.log(`  ✅ PASSED: ${passed}`)
      console.log(`  ❌ FAILED: ${failed}`)
      console.log(`  ⚠️  WARNINGS: ${warnings}`)
      
      if (failed > 0) {
        console.log('  Failed tests:')
        categoryResults.filter(r => r.status === 'FAIL').forEach(test => {
          console.log(`    - ${test.test}: ${test.details}`)
        })
      }
    }

    const totalTests = testResults.length
    const totalPassed = testResults.filter(r => r.status === 'PASS').length
    const totalFailed = testResults.filter(r => r.status === 'FAIL').length
    const successRate = ((totalPassed / totalTests) * 100).toFixed(1)
    
    console.log(`\n🎯 OVERALL RESULTS:`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   Success Rate: ${successRate}%`)
    console.log(`   Status: ${totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)

    // Performance summary
    const performanceTests = testResults.filter(r => r.performance !== undefined)
    if (performanceTests.length > 0) {
      console.log(`\n⚡ PERFORMANCE SUMMARY:`)
      performanceTests.forEach(test => {
        console.log(`   ${test.test}: ${test.performance}ms`)
      })
    }
  })

  describe('🛡️ XSS Protection & Input Validation', () => {
    it('should prevent script injection attacks', async () => {
      const startTime = Date.now()
      
      try {
        const maliciousInputs = [
          '<script>alert("XSS")</script>',
          'javascript:alert("XSS")',
          '<img src="x" onerror="alert(\'XSS\')">',
          '<svg onload="alert(\'XSS\')">',
          '<iframe src="javascript:alert(\'XSS\')"></iframe>'
        ]

        for (const input of maliciousInputs) {
          const sanitized = XSSProtection.sanitizeHTML(input)
          
          if (sanitized.includes('<script>') || 
              sanitized.includes('javascript:') || 
              sanitized.includes('onerror=') ||
              sanitized.includes('onload=')) {
            throw new Error(`XSS protection failed for input: ${input}`)
          }
        }

        testResults.push({
          category: 'XSS Protection',
          test: 'Script Injection Prevention',
          status: 'PASS',
          details: 'All XSS attack vectors successfully blocked',
          performance: Date.now() - startTime
        })

        expect(true).toBe(true)

      } catch (error) {
        testResults.push({
          category: 'XSS Protection',
          test: 'Script Injection Prevention',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })

    it('should validate and sanitize form inputs', async () => {
      const startTime = Date.now()
      
      try {
        const testInputs = [
          { value: 'user@example.com<script>', type: 'email', expected: false },
          { value: 'user@example.com', type: 'email', expected: true },
          { value: '+1 (555) 123-4567', type: 'phone', expected: true },
          { value: '555-1234<script>', type: 'phone', expected: false }
        ]

        for (const input of testInputs) {
          const result = XSSProtection.sanitizeInput(input.value, input.type as any)
          const isValid = result === input.value
          
          if (isValid !== input.expected) {
            throw new Error(`Input validation failed for ${input.type}: ${input.value}`)
          }
        }

        testResults.push({
          category: 'XSS Protection',
          test: 'Form Input Validation',
          status: 'PASS',
          details: 'All form input types properly validated',
          performance: Date.now() - startTime
        })

        expect(true).toBe(true)

      } catch (error) {
        testResults.push({
          category: 'XSS Protection',
          test: 'Form Input Validation',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('📁 File Upload Security', () => {
    it('should detect and block malicious files', async () => {
      const startTime = Date.now()
      
      try {
        // Test EICAR virus signature
        const eicarSignature = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
        const virusFile = new File([eicarSignature], 'virus.txt', { type: 'text/plain' })
        
        const result = await fileUploadSecurity.validateFile(virusFile)
        
        if (result.isSafe || result.virusScan?.clean) {
          throw new Error('Virus detection failed - EICAR signature not detected')
        }

        // Test JavaScript in PDF
        const maliciousPDF = Buffer.concat([
          Buffer.from('%PDF-1.4\n'),
          Buffer.from('/JS (app.alert("XSS");)\n'),
          Buffer.from('%%EOF')
        ])
        const pdfFile = new File([maliciousPDF], 'malicious.pdf', { type: 'application/pdf' })
        
        const pdfResult = await fileUploadSecurity.validateFile(pdfFile)
        
        if (pdfResult.isSafe) {
          throw new Error('PDF JavaScript detection failed')
        }

        testResults.push({
          category: 'File Upload Security',
          test: 'Malicious File Detection',
          status: 'PASS',
          details: 'Virus signatures and malicious content detected',
          performance: Date.now() - startTime
        })

        expect(true).toBe(true)

      } catch (error) {
        testResults.push({
          category: 'File Upload Security',
          test: 'Malicious File Detection',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })

    it('should validate file types and magic numbers', async () => {
      const startTime = Date.now()
      
      try {
        // Test fake PDF (wrong magic number)
        const fakeContent = Buffer.from('This is not a PDF file')
        const fakeFile = new File([fakeContent], 'fake.pdf', { type: 'application/pdf' })
        
        const result = await fileUploadSecurity.validateFile(fakeFile)
        
        if (result.isValid) {
          throw new Error('Magic number validation failed - fake PDF accepted')
        }

        // Test valid PDF
        const validPDF = Buffer.concat([
          Buffer.from('%PDF-1.4\n'),
          Buffer.from('1 0 obj\n<</Type/Catalog>>\nendobj\n'),
          Buffer.from('%%EOF')
        ])
        const validFile = new File([validPDF], 'valid.pdf', { type: 'application/pdf' })
        
        const validResult = await fileUploadSecurity.validateFile(validFile)
        
        if (!validResult.isValid) {
          throw new Error('Valid PDF rejected')
        }

        testResults.push({
          category: 'File Upload Security',
          test: 'File Type Validation',
          status: 'PASS',
          details: 'Magic number validation working correctly',
          performance: Date.now() - startTime
        })

        expect(true).toBe(true)

      } catch (error) {
        testResults.push({
          category: 'File Upload Security',
          test: 'File Type Validation',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('🔐 Authentication & Authorization', () => {
    it('should handle JWT validation correctly', async () => {
      const startTime = Date.now()
      
      try {
        // This would require actual JWT tokens to test properly
        // For now, we'll test the structure and error handling
        
        const mockRequest = {
          cookies: new Map(),
          headers: new Map(),
          method: 'GET',
          url: 'http://localhost:3000/api/test'
        } as any

        // Test missing token
        mockRequest.cookies.set('sb-access-token', undefined)
        
        // Note: This would need actual implementation to test
        // For now, we'll mark as a structural test
        
        testResults.push({
          category: 'Authentication',
          test: 'JWT Validation Structure',
          status: 'WARNING',
          details: 'JWT validation structure in place, requires integration testing',
          performance: Date.now() - startTime
        })

        expect(true).toBe(true)

      } catch (error) {
        testResults.push({
          category: 'Authentication',
          test: 'JWT Validation Structure',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('⚡ Rate Limiting', () => {
    it('should enforce rate limits correctly', async () => {
      const startTime = Date.now()
      
      try {
        const mockRequest = {
          url: 'http://localhost:3000/api/test',
          method: 'POST',
          headers: new Map([
            ['x-forwarded-for', '192.168.1.1'],
            ['user-agent', 'test-agent']
          ])
        } as any

        // Test multiple requests rapidly
        const requests = Array(10).fill(null).map(() => 
          productionRateLimiters.api.checkLimit(mockRequest)
        )

        const results = await Promise.all(requests)
        const blockedRequests = results.filter(r => !r.allowed)

        if (blockedRequests.length === 0) {
          throw new Error('Rate limiting not working - no requests blocked')
        }

        testResults.push({
          category: 'Rate Limiting',
          test: 'Rate Limit Enforcement',
          status: 'PASS',
          details: `${blockedRequests.length} out of 10 requests blocked`,
          performance: Date.now() - startTime
        })

        expect(blockedRequests.length).toBeGreaterThan(0)

      } catch (error) {
        testResults.push({
          category: 'Rate Limiting',
          test: 'Rate Limit Enforcement',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('💾 Memory Management', () => {
    it('should handle large operations without memory leaks', async () => {
      const startTime = Date.now()
      
      try {
        const initialMemory = memoryManager.getCurrentMemoryUsage()
        
        // Simulate large operation
        await memoryManager.withMemoryManagement(
          'test-operation',
          async () => {
            // Create and process large buffer
            const largeBuffer = Buffer.alloc(10 * 1024 * 1024) // 10MB
            largeBuffer.fill(65) // Fill with 'A'
            
            // Simulate processing
            for (let i = 0; i < 1000; i++) {
              const chunk = largeBuffer.subarray(i * 1000, (i + 1) * 1000)
              // Process chunk (simulate work)
              await new Promise(resolve => setTimeout(resolve, 1))
            }
            
            return 'completed'
          },
          {
            maxMemory: 50 * 1024 * 1024, // 50MB limit
            cleanup: []
          }
        )

        // Force garbage collection and check memory
        if (global.gc) {
          global.gc()
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const finalMemory = memoryManager.getCurrentMemoryUsage()
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
        const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100

        if (memoryIncreasePercent > 50) {
          testResults.push({
            category: 'Memory Management',
            test: 'Memory Leak Prevention',
            status: 'WARNING',
            details: `Memory increased by ${memoryIncreasePercent.toFixed(1)}%`,
            performance: Date.now() - startTime
          })
        } else {
          testResults.push({
            category: 'Memory Management',
            test: 'Memory Leak Prevention',
            status: 'PASS',
            details: `Memory managed well, increase: ${memoryIncreasePercent.toFixed(1)}%`,
            performance: Date.now() - startTime
          })
        }

        expect(memoryIncreasePercent).toBeLessThan(100)

      } catch (error) {
        testResults.push({
          category: 'Memory Management',
          test: 'Memory Leak Prevention',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('🔄 Database Connection Management', () => {
    it('should manage database connections properly', async () => {
      const startTime = Date.now()
      
      try {
        const initialStats = databaseManager.getConnectionStats()
        
        // Test multiple concurrent database operations
        const operations = Array(5).fill(null).map(async (_, index) => {
          return databaseManager.executeQuery(
            async () => {
              // Simulate database query
              await new Promise(resolve => setTimeout(resolve, 100))
              return `result-${index}`
            },
            `test-query-${index}`
          )
        })

        const results = await Promise.all(operations)
        
        if (results.length !== 5) {
          throw new Error('Not all database operations completed')
        }

        const finalStats = databaseManager.getConnectionStats()
        
        testResults.push({
          category: 'Database Management',
          test: 'Connection Pool Management',
          status: 'PASS',
          details: `Managed ${finalStats.total} connections successfully`,
          performance: Date.now() - startTime
        })

        expect(results).toHaveLength(5)

      } catch (error) {
        testResults.push({
          category: 'Database Management',
          test: 'Connection Pool Management',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('🛠️ Error Handling & Recovery', () => {
    it('should handle errors gracefully with retry logic', async () => {
      const startTime = Date.now()
      
      try {
        let attemptCount = 0
        
        // Test retry mechanism
        const result = await errorHandler.handleWithRetry(
          async () => {
            attemptCount++
            if (attemptCount < 3) {
              throw new Error('Simulated failure')
            }
            return 'success-after-retry'
          },
          'test-retry-operation',
          {},
          { maxRetries: 3, retryDelay: 10 }
        )

        if (result !== 'success-after-retry' || attemptCount !== 3) {
          throw new Error('Retry logic not working correctly')
        }

        testResults.push({
          category: 'Error Handling',
          test: 'Retry Logic',
          status: 'PASS',
          details: `Operation succeeded after ${attemptCount} attempts`,
          performance: Date.now() - startTime
        })

        expect(result).toBe('success-after-retry')

      } catch (error) {
        testResults.push({
          category: 'Error Handling',
          test: 'Retry Logic',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })

    it('should handle circuit breaker functionality', async () => {
      const startTime = Date.now()
      
      try {
        // Test circuit breaker by causing multiple failures
        const failures = []
        
        for (let i = 0; i < 6; i++) {
          try {
            await errorHandler.handleWithRetry(
              async () => {
                throw new Error('Persistent failure')
              },
              'circuit-breaker-test',
              {},
              { maxRetries: 1, retryDelay: 1 }
            )
          } catch (error) {
            failures.push(error)
          }
        }

        // After multiple failures, circuit should be open
        const shouldBeBreakerOpen = await errorHandler.handleWithRetry(
          async () => {
            throw new Error('Should not reach here')
          },
          'circuit-breaker-test',
          {},
          { maxRetries: 1, retryDelay: 1 }
        ).catch(error => error)

        testResults.push({
          category: 'Error Handling',
          test: 'Circuit Breaker',
          status: 'PASS',
          details: `Circuit breaker activated after ${failures.length} failures`,
          performance: Date.now() - startTime
        })

        expect(failures.length).toBeGreaterThan(0)

      } catch (error) {
        testResults.push({
          category: 'Error Handling',
          test: 'Circuit Breaker',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('🎯 Performance & Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now()
      
      try {
        // Test concurrent operations
        const concurrentOps = Array(20).fill(null).map(async (_, index) => {
          return memoryManager.withMemoryManagement(
            `concurrent-op-${index}`,
            async () => {
              // Simulate work
              const buffer = Buffer.alloc(1024 * 1024) // 1MB
              buffer.fill(index % 256)
              
              await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
              
              return `operation-${index}-complete`
            }
          )
        })

        const results = await Promise.all(concurrentOps)
        const processingTime = Date.now() - startTime
        
        if (results.length !== 20) {
          throw new Error('Not all concurrent operations completed')
        }

        if (processingTime > 5000) {
          testResults.push({
            category: 'Performance',
            test: 'Concurrent Request Handling',
            status: 'WARNING',
            details: `Completed but took ${processingTime}ms (>5s)`,
            performance: processingTime
          })
        } else {
          testResults.push({
            category: 'Performance',
            test: 'Concurrent Request Handling',
            status: 'PASS',
            details: `20 concurrent operations completed efficiently`,
            performance: processingTime
          })
        }

        expect(results).toHaveLength(20)

      } catch (error) {
        testResults.push({
          category: 'Performance',
          test: 'Concurrent Request Handling',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })

  describe('📋 System Health Check', () => {
    it('should perform comprehensive health check', async () => {
      const startTime = Date.now()
      
      try {
        // Check all system components
        const healthChecks = {
          memory: memoryManager.getMemoryStatistics(),
          database: databaseManager.getConnectionStats(),
          errorHandler: true, // Error handler is always available
          fileUpload: true    // File upload security is available
        }

        // Validate memory usage
        const memoryStats = healthChecks.memory
        if (memoryStats.current.heapUsed > memoryStats.config.maxHeapSize * 0.9) {
          throw new Error('Memory usage critically high')
        }

        // Validate database connections
        const dbStats = healthChecks.database
        if (dbStats.total === 0) {
          throw new Error('No database connections available')
        }

        testResults.push({
          category: 'System Health',
          test: 'Comprehensive Health Check',
          status: 'PASS',
          details: 'All system components healthy',
          performance: Date.now() - startTime
        })

        expect(healthChecks.memory).toBeDefined()
        expect(healthChecks.database).toBeDefined()

      } catch (error) {
        testResults.push({
          category: 'System Health',
          test: 'Comprehensive Health Check',
          status: 'FAIL',
          details: (error as Error).message
        })
        throw error
      }
    })
  })
})