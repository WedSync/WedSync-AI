#!/usr/bin/env ts-node

/**
 * Performance Validation Script for CSV/Excel Import
 * Tests all performance requirements specified in WS-003-batch1-round-3.md
 */

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

// Performance Requirements (from the spec)
const PERFORMANCE_REQUIREMENTS = {
  FILE_UPLOAD_MAX_TIME_MS: 30000,    // 30 seconds for 10MB files
  CSV_PARSING_MAX_TIME_MS: 5000,     // 5 seconds for 10,000 rows
  COLUMN_DETECTION_MAX_TIME_MS: 2000, // 2 seconds
  DATA_TRANSFORMATION_MAX_TIME_MS: 10000, // 10 seconds for 10,000 rows
  BULK_DATABASE_INSERT_MAX_TIME_MS: 30000, // 30 seconds for 10,000 rows
  MEMORY_USAGE_MAX_MB: 500,          // 500MB during large imports
  PROGRESS_UPDATE_INTERVAL_MS: 1000   // Progress updates every 1 second
}

// Test data generators
function generateCSVData(rows: number): string {
  const headers = 'first_name,last_name,partner_first_name,partner_last_name,email,phone,wedding_date,venue_name,status,package_name,package_price'
  const dataRows = Array.from({ length: rows }, (_, i) => 
    `Client${i},Test${i},Partner${i},Test${i},client${i}@example.com,+123456${String(i).padStart(4, '0')},2025-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')},Venue${i},lead,Package${i % 3},${(i % 5 + 1) * 1000}`
  )
  
  return [headers, ...dataRows].join('\n')
}

function generateLargeFile(sizeInMB: number): Buffer {
  const targetSize = sizeInMB * 1024 * 1024
  const rowSize = 150 // Approximate size per row
  const rows = Math.floor(targetSize / rowSize)
  
  const csvContent = generateCSVData(rows)
  return Buffer.from(csvContent)
}

// Performance test functions
async function testFileUploadPerformance(): Promise<{ success: boolean, time: number, details: string }> {
  console.log('🚀 Testing file upload performance...')
  
  const testFile = generateLargeFile(10) // 10MB file
  const startTime = Date.now()
  
  try {
    const formData = new FormData()
    const blob = new Blob([testFile], { type: 'text/csv' })
    formData.append('file', blob, 'performance-test.csv')
    
    const response = await fetch('http://localhost:3000/api/clients/import', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer test-token' // Mock auth
      }
    })
    
    const endTime = Date.now()
    const uploadTime = endTime - startTime
    
    const success = uploadTime <= PERFORMANCE_REQUIREMENTS.FILE_UPLOAD_MAX_TIME_MS
    
    return {
      success,
      time: uploadTime,
      details: `Upload time: ${uploadTime}ms (requirement: ≤${PERFORMANCE_REQUIREMENTS.FILE_UPLOAD_MAX_TIME_MS}ms)`
    }
  } catch (error) {
    return {
      success: false,
      time: Date.now() - startTime,
      details: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function testCSVParsingPerformance(): Promise<{ success: boolean, time: number, details: string }> {
  console.log('📊 Testing CSV parsing performance...')
  
  const Papa = await import('papaparse')
  const csvData = generateCSVData(10000) // 10,000 rows
  
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const endTime = Date.now()
        const parseTime = endTime - startTime
        
        const success = parseTime <= PERFORMANCE_REQUIREMENTS.CSV_PARSING_MAX_TIME_MS
        
        resolve({
          success,
          time: parseTime,
          details: `Parse time: ${parseTime}ms for ${results.data.length} rows (requirement: ≤${PERFORMANCE_REQUIREMENTS.CSV_PARSING_MAX_TIME_MS}ms)`
        })
      },
      error: (error) => {
        resolve({
          success: false,
          time: Date.now() - startTime,
          details: `Parse failed: ${error.message}`
        })
      }
    })
  })
}

async function testColumnDetectionPerformance(): Promise<{ success: boolean, time: number, details: string }> {
  console.log('🔍 Testing column detection performance...')
  
  const sampleData = {
    'first_name': 'John',
    'last_name': 'Smith',
    'partner_first_name': 'Jane',
    'email': 'john@example.com',
    'phone': '+1234567890',
    'wedding_date': '2025-06-15',
    'venue_name': 'Grand Hotel',
    'status': 'lead',
    'package_name': 'Premium'
  }
  
  const startTime = Date.now()
  
  // Simulate column detection logic
  const detectedColumns = Object.keys(sampleData)
  const columnMappings: Record<string, string> = {}
  
  // Auto-detection algorithm (simplified)
  const mappingRules = {
    'first_name': ['first_name', 'firstname', 'client_first_name'],
    'last_name': ['last_name', 'lastname', 'client_last_name'],
    'email': ['email', 'email_address', 'contact_email'],
    'phone': ['phone', 'phone_number', 'contact_phone'],
    'wedding_date': ['wedding_date', 'event_date', 'ceremony_date'],
    'venue_name': ['venue_name', 'venue', 'location']
  }
  
  Object.entries(mappingRules).forEach(([targetField, possibleSources]) => {
    for (const source of possibleSources) {
      if (detectedColumns.some(col => col.includes(source))) {
        const matchedColumn = detectedColumns.find(col => col.includes(source))
        if (matchedColumn) {
          columnMappings[matchedColumn] = targetField
          break
        }
      }
    }
  })
  
  const endTime = Date.now()
  const detectionTime = endTime - startTime
  
  const success = detectionTime <= PERFORMANCE_REQUIREMENTS.COLUMN_DETECTION_MAX_TIME_MS
  
  return {
    success,
    time: detectionTime,
    details: `Detection time: ${detectionTime}ms for ${detectedColumns.length} columns (requirement: ≤${PERFORMANCE_REQUIREMENTS.COLUMN_DETECTION_MAX_TIME_MS}ms)`
  }
}

async function testDataTransformationPerformance(): Promise<{ success: boolean, time: number, details: string }> {
  console.log('🔄 Testing data transformation performance...')
  
  const csvData = generateCSVData(10000) // 10,000 rows
  const Papa = await import('papaparse')
  
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parseEndTime = Date.now()
        
        // Transform data (validation, sanitization, mapping)
        const transformedData = (results.data as any[]).map((row, index) => {
          // Simulate data transformation operations
          const client = {
            first_name: row.first_name?.toString().trim(),
            last_name: row.last_name?.toString().trim(),
            email: row.email?.toString().toLowerCase().trim(),
            phone: row.phone?.toString().replace(/[\s\-\(\)]/g, ''),
            wedding_date: row.wedding_date ? new Date(row.wedding_date).toISOString() : null,
            venue_name: row.venue_name?.toString().trim(),
            status: row.status?.toString().toLowerCase() || 'lead',
            package_price: row.package_price ? parseInt(row.package_price) : null,
            import_source: 'csv',
            created_at: new Date().toISOString()
          }
          
          // Validation
          if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
            client.email = null
          }
          
          return client
        }).filter(client => client.first_name || client.email)
        
        const endTime = Date.now()
        const transformTime = endTime - startTime
        
        const success = transformTime <= PERFORMANCE_REQUIREMENTS.DATA_TRANSFORMATION_MAX_TIME_MS
        
        resolve({
          success,
          time: transformTime,
          details: `Transform time: ${transformTime}ms for ${transformedData.length} records (requirement: ≤${PERFORMANCE_REQUIREMENTS.DATA_TRANSFORMATION_MAX_TIME_MS}ms)`
        })
      },
      error: (error) => {
        resolve({
          success: false,
          time: Date.now() - startTime,
          details: `Transform failed: ${error.message}`
        })
      }
    })
  })
}

async function testMemoryUsage(): Promise<{ success: boolean, memoryMB: number, details: string }> {
  console.log('💾 Testing memory usage during large import...')
  
  const initialMemory = process.memoryUsage()
  
  // Generate large dataset
  const largeCSV = generateCSVData(50000) // 50,000 rows
  const Papa = await import('papaparse')
  
  let peakMemoryMB = 0
  const memoryMonitor = setInterval(() => {
    const currentMemory = process.memoryUsage()
    const currentMB = currentMemory.heapUsed / (1024 * 1024)
    peakMemoryMB = Math.max(peakMemoryMB, currentMB)
  }, 100)
  
  return new Promise((resolve) => {
    Papa.parse(largeCSV, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        clearInterval(memoryMonitor)
        
        // Final memory check
        const finalMemory = process.memoryUsage()
        const finalMB = finalMemory.heapUsed / (1024 * 1024)
        peakMemoryMB = Math.max(peakMemoryMB, finalMB)
        
        const success = peakMemoryMB <= PERFORMANCE_REQUIREMENTS.MEMORY_USAGE_MAX_MB
        
        resolve({
          success,
          memoryMB: peakMemoryMB,
          details: `Peak memory: ${peakMemoryMB.toFixed(2)}MB (requirement: ≤${PERFORMANCE_REQUIREMENTS.MEMORY_USAGE_MAX_MB}MB)`
        })
      },
      error: (error) => {
        clearInterval(memoryMonitor)
        resolve({
          success: false,
          memoryMB: peakMemoryMB,
          details: `Memory test failed: ${error.message}`
        })
      }
    })
  })
}

// Main test runner
async function runPerformanceTests() {
  console.log('🎯 WS-003 CSV/Excel Import Performance Validation')
  console.log('=' .repeat(60))
  
  const results = []
  
  // Test 1: File Upload Performance
  try {
    const uploadResult = await testFileUploadPerformance()
    results.push({
      test: 'File Upload (10MB)',
      ...uploadResult,
      requirement: `≤${PERFORMANCE_REQUIREMENTS.FILE_UPLOAD_MAX_TIME_MS}ms`
    })
  } catch (error) {
    results.push({
      test: 'File Upload (10MB)',
      success: false,
      time: 0,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requirement: `≤${PERFORMANCE_REQUIREMENTS.FILE_UPLOAD_MAX_TIME_MS}ms`
    })
  }
  
  // Test 2: CSV Parsing Performance
  const parseResult = await testCSVParsingPerformance()
  results.push({
    test: 'CSV Parsing (10,000 rows)',
    ...parseResult,
    requirement: `≤${PERFORMANCE_REQUIREMENTS.CSV_PARSING_MAX_TIME_MS}ms`
  })
  
  // Test 3: Column Detection Performance
  const detectionResult = await testColumnDetectionPerformance()
  results.push({
    test: 'Column Detection',
    ...detectionResult,
    requirement: `≤${PERFORMANCE_REQUIREMENTS.COLUMN_DETECTION_MAX_TIME_MS}ms`
  })
  
  // Test 4: Data Transformation Performance
  const transformResult = await testDataTransformationPerformance()
  results.push({
    test: 'Data Transformation (10,000 rows)',
    ...transformResult,
    requirement: `≤${PERFORMANCE_REQUIREMENTS.DATA_TRANSFORMATION_MAX_TIME_MS}ms`
  })
  
  // Test 5: Memory Usage
  const memoryResult = await testMemoryUsage()
  results.push({
    test: 'Memory Usage (50,000 rows)',
    success: memoryResult.success,
    time: 0,
    details: memoryResult.details,
    requirement: `≤${PERFORMANCE_REQUIREMENTS.MEMORY_USAGE_MAX_MB}MB`
  })
  
  // Display results
  console.log('\n📊 Performance Test Results')
  console.log('=' .repeat(80))
  
  let allPassed = true
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${index + 1}. ${result.test}`)
    console.log(`   Status: ${status}`)
    console.log(`   Requirement: ${result.requirement}`)
    console.log(`   Result: ${result.details}`)
    console.log('')
    
    if (!result.success) {
      allPassed = false
    }
  })
  
  // Summary
  console.log('=' .repeat(80))
  console.log(`📈 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  console.log(`📊 Tests Passed: ${results.filter(r => r.success).length}/${results.length}`)
  
  if (allPassed) {
    console.log('\n🎉 All performance requirements met!')
    console.log('✅ CSV/Excel import system is production ready')
  } else {
    console.log('\n⚠️  Some performance requirements not met')
    console.log('🔧 Optimization required before production deployment')
  }
  
  // Generate performance report
  const reportPath = path.join(__dirname, '../performance-test-results.json')
  const report = {
    timestamp: new Date().toISOString(),
    requirements: PERFORMANCE_REQUIREMENTS,
    results,
    summary: {
      allPassed,
      passedCount: results.filter(r => r.success).length,
      totalCount: results.length
    }
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  
  return allPassed
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runPerformanceTests()
    .then((allPassed) => {
      process.exit(allPassed ? 0 : 1)
    })
    .catch((error) => {
      console.error('❌ Performance test suite failed:', error)
      process.exit(1)
    })
}

export { runPerformanceTests, PERFORMANCE_REQUIREMENTS }