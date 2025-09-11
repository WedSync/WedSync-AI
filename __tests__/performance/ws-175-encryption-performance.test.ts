/**
 * WS-175 Advanced Data Encryption - Performance Validation Tests
 * Comprehensive performance testing for encryption infrastructure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'node:perf_hooks';
import { EncryptionCache, createWeddingOptimizedCache } from '../../src/lib/performance/encryption/encryption-cache';
import { BulkEncryptionOptimizer } from '../../src/lib/performance/encryption/bulk-encryption-optimizer';
import { PerformanceMonitor } from '../../src/lib/performance/encryption/performance-monitor';
import { getWeddingSecurityConfig } from '../../src/config/security/security-config';
import type {
  EncryptionField,
  BulkEncryptionRequest,
  EncryptionLevel,
  WeddingDataEncryption,
  EncryptedGuestData,
} from '../../src/types/encryption-performance';

describe('WS-175 Encryption Performance Requirements', () => {
  let encryptionCache: EncryptionCache;
  let bulkOptimizer: BulkEncryptionOptimizer;
  let performanceMonitor: PerformanceMonitor;
  
  beforeEach(() => {
    encryptionCache = createWeddingOptimizedCache();
    bulkOptimizer = new BulkEncryptionOptimizer();
    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(() => {
    encryptionCache?.clear();
    performanceMonitor?.clearMetrics();
  });

  describe('Wedding Performance Requirements', () => {
    it('should encrypt single guest record in <10ms', async () => {
      // Arrange: Create realistic guest data
      const guestData = JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        dietaryRestrictions: ['vegetarian', 'no nuts'],
        accessibilityNeeds: 'wheelchair access',
        tablePreferences: 'family table',
        rsvpStatus: 'attending',
        plusOne: {
          name: 'Jane Doe',
          dietaryRestrictions: []
        }
      });

      const guestBuffer = Buffer.from(guestData, 'utf8');
      const metadata = {
        algorithm: 'aes-256-gcm',
        keyVersion: '1.0.0',
        encryptionTime: new Date(),
        integrityHash: 'hash123',
        compressionUsed: false,
      };

      // Act: Encrypt guest data and measure performance
      const startTime = performance.now();
      await encryptionCache.set('guest-001', guestBuffer, metadata);
      const endTime = performance.now();

      const encryptionTime = endTime - startTime;

      // Assert: Performance requirement <10ms
      expect(encryptionTime).toBeLessThan(10);
      console.log(`✅ Single guest encryption: ${encryptionTime.toFixed(2)}ms`);
    });

    it('should handle 500+ guest records within performance targets', async () => {
      // Arrange: Create 500+ guest records for a large wedding
      const guestRecords: EncryptionField[] = [];
      for (let i = 1; i <= 520; i++) {
        const guestData = {
          guestId: `guest-${i.toString().padStart(3, '0')}`,
          name: `Guest ${i}`,
          email: `guest${i}@wedding.com`,
          phone: `+1-555-${(1000 + i).toString()}`,
          tableNumber: Math.floor(i / 8) + 1,
          dietaryRestrictions: i % 4 === 0 ? ['vegetarian'] : [],
          rsvpStatus: i % 10 === 0 ? 'declined' : 'attending'
        };

        guestRecords.push({
          fieldId: `guest-${i}`,
          fieldName: 'guest_data',
          value: JSON.stringify(guestData),
          encryptionLevel: 'standard' as EncryptionLevel,
          metadata: {
            algorithm: 'aes-256-gcm',
            keyVersion: '1.0.0',
            encryptionTime: new Date(),
            integrityHash: `hash-${i}`,
          }
        });
      }

      const bulkRequest: BulkEncryptionRequest = {
        fields: guestRecords,
        batchSize: 50,
        useWorkers: true,
        priority: 'high',
      };

      // Act: Process bulk encryption
      const startTime = performance.now();
      const result = await bulkOptimizer.encryptBatch(bulkRequest);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTimePerGuest = totalTime / 520;

      // Assert: Performance requirements
      expect(result.results).toHaveLength(520);
      expect(result.errors).toHaveLength(0);
      expect(avgTimePerGuest).toBeLessThan(10); // <10ms per guest
      expect(totalTime).toBeLessThan(5200); // <5.2 seconds total (10ms * 520)
      expect(result.metrics.successRate).toBe(1); // 100% success rate

      console.log(`✅ Bulk encryption: ${totalTime.toFixed(2)}ms total, ${avgTimePerGuest.toFixed(2)}ms per guest`);
      console.log(`✅ Success rate: ${(result.metrics.successRate * 100).toFixed(1)}%`);
    });

    it('should maintain cache performance with high hit rates', async () => {
      // Arrange: Simulate repeated access to wedding vendor data
      const vendorKeys = ['photographer', 'caterer', 'venue', 'florist', 'dj'];
      const vendorData = vendorKeys.map(vendor => ({
        key: vendor,
        data: Buffer.from(JSON.stringify({
          name: `${vendor} Company`,
          contact: `contact@${vendor}.com`,
          pricing: 'confidential pricing data',
          contractTerms: 'sensitive contract information'
        }))
      }));

      // Populate cache
      for (const vendor of vendorData) {
        await encryptionCache.set(vendor.key, vendor.data, {
          algorithm: 'aes-256-gcm',
          keyVersion: '1.0.0',
          encryptionTime: new Date(),
          integrityHash: 'hash123',
        });
      }

      // Act: Simulate high-frequency access
      const accessTimes: number[] = [];
      for (let i = 0; i < 100; i++) {
        const vendorKey = vendorKeys[i % vendorKeys.length];
        const start = performance.now();
        const result = await encryptionCache.get(vendorKey);
        const end = performance.now();
        
        accessTimes.push(end - start);
        expect(result).not.toBeNull();
      }

      // Assert: Cache performance requirements
      const avgAccessTime = accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length;
      const metrics = encryptionCache.getMetrics();

      expect(metrics.hitRate).toBeGreaterThan(0.95); // >95% hit rate
      expect(avgAccessTime).toBeLessThan(1); // <1ms average access time
      expect(metrics.totalEntries).toBe(5);

      console.log(`✅ Cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
      console.log(`✅ Average access time: ${avgAccessTime.toFixed(2)}ms`);
    });

    it('should meet wedding-specific security requirements', () => {
      // Act: Get wedding-optimized security configuration
      const securityConfig = getWeddingSecurityConfig();

      // Assert: Wedding-specific requirements
      expect(securityConfig.encryption.defaultAlgorithm).toBe('aes-256-gcm');
      expect(securityConfig.encryption.keyDerivationIterations).toBeGreaterThanOrEqual(200000);
      expect(securityConfig.performance.timeoutMs).toBeLessThanOrEqual(8000); // 8 seconds max
      expect(securityConfig.performance.emergencyShutdownThresholds.responseTimeThresholdMs).toBeLessThanOrEqual(1500);
      expect(securityConfig.cache.maxCacheLifetimeMs).toBeLessThanOrEqual(20 * 60 * 1000); // 20 minutes
      expect(securityConfig.compliance.gdprCompliance).toBe(true);
      expect(securityConfig.compliance.dataRetentionDays).toBe(365); // 1 year for wedding data

      console.log('✅ Wedding security configuration validated');
    });

    it('should handle concurrent encryption operations efficiently', async () => {
      // Arrange: Create concurrent encryption requests
      const concurrentOperations = 10;
      const guestsPerOperation = 50;
      const operations: Promise<any>[] = [];

      // Act: Start concurrent bulk encryptions
      const startTime = performance.now();
      
      for (let op = 0; op < concurrentOperations; op++) {
        const fields: EncryptionField[] = [];
        for (let i = 0; i < guestsPerOperation; i++) {
          const guestId = `op${op}-guest${i}`;
          fields.push({
            fieldId: guestId,
            fieldName: 'guest_data',
            value: JSON.stringify({ name: `Guest ${op}-${i}`, table: i % 10 + 1 }),
            encryptionLevel: 'standard' as EncryptionLevel,
            metadata: {
              algorithm: 'aes-256-gcm',
              keyVersion: '1.0.0',
              encryptionTime: new Date(),
              integrityHash: `hash-${guestId}`,
            }
          });
        }

        const request: BulkEncryptionRequest = {
          fields,
          batchSize: 25,
          useWorkers: true,
          priority: 'normal',
        };

        operations.push(bulkOptimizer.encryptBatch(request));
      }

      // Wait for all operations to complete
      const results = await Promise.all(operations);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const totalGuests = concurrentOperations * guestsPerOperation;
      const avgTimePerGuest = totalTime / totalGuests;

      // Assert: Concurrent performance requirements
      expect(results).toHaveLength(concurrentOperations);
      results.forEach(result => {
        expect(result.results).toHaveLength(guestsPerOperation);
        expect(result.metrics.successRate).toBe(1);
      });
      
      expect(avgTimePerGuest).toBeLessThan(15); // Allow slightly higher for concurrent ops
      expect(totalTime).toBeLessThan(10000); // <10 seconds total

      console.log(`✅ Concurrent operations: ${totalTime.toFixed(2)}ms for ${totalGuests} guests`);
      console.log(`✅ Average time per guest: ${avgTimePerGuest.toFixed(2)}ms`);
    });

    it('should monitor performance and generate alerts appropriately', async () => {
      // Arrange: Configure performance thresholds
      const thresholds = [{
        operation: 'encrypt' as const,
        maxDurationMs: 8,
        maxMemoryUsageMB: 100,
        minThroughputBytesPerSec: 1000000, // 1MB/sec
        alertOnViolation: true
      }];

      performanceMonitor.configureThresholds(thresholds);

      // Act: Record metrics that should trigger alerts
      const slowMetrics = {
        operation: 'encrypt' as const,
        operationId: 'test-op-1',
        duration: 15, // Exceeds threshold
        inputSize: 1024,
        outputSize: 1024,
        throughput: 68267, // Below threshold  
        timestamp: new Date(),
        cacheHit: false,
      };

      performanceMonitor.recordMetrics(slowMetrics);

      // Check for alerts
      const alerts = performanceMonitor.checkThresholds();
      
      // Assert: Appropriate alerts generated
      expect(alerts).toHaveLength(2); // Duration and throughput violations
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].operation).toBe('encrypt');

      console.log(`✅ Performance monitoring: ${alerts.length} alerts generated`);
    });
  });

  describe('Wedding Data Encryption Scenarios', () => {
    it('should encrypt complete wedding dataset efficiently', async () => {
      // Arrange: Create comprehensive wedding data
      const weddingData: WeddingDataEncryption = {
        weddingId: 'wedding-2024-001',
        guestRecords: [],
        vendorInformation: [],
        sensitiveNotes: [],
        totalRecords: 0,
        encryptionLevel: 'high',
        performanceRequirements: {
          maxEncryptionLatencyMs: 10,
          batchSizeOptimization: true,
          cacheGuestData: true,
          priorityOperations: ['encrypt', 'bulk_encrypt'],
          peakUsagePatterns: [{
            description: 'Guest RSVP updates',
            expectedOperationsPerSecond: 50,
            durationMinutes: 30,
            criticalityLevel: 'high'
          }]
        }
      };

      // Create guest records
      for (let i = 1; i <= 300; i++) {
        const guestData: EncryptedGuestData = {
          guestId: `guest-${i}`,
          personalInfo: Buffer.from(JSON.stringify({
            name: `Guest ${i}`,
            age: 25 + (i % 50),
            relationship: i <= 50 ? 'family' : i <= 150 ? 'friends' : 'colleagues'
          })),
          dietaryRestrictions: Buffer.from(JSON.stringify(
            i % 5 === 0 ? ['vegetarian'] : i % 7 === 0 ? ['gluten-free'] : []
          )),
          contactInfo: Buffer.from(JSON.stringify({
            email: `guest${i}@example.com`,
            phone: `+1-555-${(1000 + i).toString()}`
          })),
          accessibilityNeeds: Buffer.from(JSON.stringify(
            i % 20 === 0 ? ['wheelchair', 'dietary'] : []
          )),
          encryptionMetadata: {
            algorithm: 'aes-256-gcm',
            keyVersion: '1.0.0',
            encryptionTime: new Date(),
            integrityHash: `guest-hash-${i}`,
          }
        };
        weddingData.guestRecords.push(guestData);
      }

      weddingData.totalRecords = weddingData.guestRecords.length;

      // Act: Process wedding dataset
      const startTime = performance.now();
      
      // Simulate processing all guest records
      let processedCount = 0;
      const batchSize = 50;
      
      for (let i = 0; i < weddingData.guestRecords.length; i += batchSize) {
        const batch = weddingData.guestRecords.slice(i, i + batchSize);
        
        const fields: EncryptionField[] = batch.map(guest => ({
          fieldId: guest.guestId,
          fieldName: 'complete_guest_data',
          value: Buffer.concat([
            guest.personalInfo,
            guest.dietaryRestrictions,
            guest.contactInfo,
            guest.accessibilityNeeds
          ]),
          encryptionLevel: weddingData.encryptionLevel,
          metadata: guest.encryptionMetadata
        }));

        const request: BulkEncryptionRequest = {
          fields,
          batchSize: 25,
          useWorkers: true,
          priority: 'high',
        };

        const result = await bulkOptimizer.encryptBatch(request);
        processedCount += result.results.length;
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerRecord = totalTime / processedCount;

      // Assert: Wedding dataset performance
      expect(processedCount).toBe(300);
      expect(avgTimePerRecord).toBeLessThan(weddingData.performanceRequirements.maxEncryptionLatencyMs);
      expect(totalTime).toBeLessThan(3000); // <3 seconds for complete dataset

      console.log(`✅ Wedding dataset: ${processedCount} records in ${totalTime.toFixed(2)}ms`);
      console.log(`✅ Average per record: ${avgTimePerRecord.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should maintain acceptable memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process large dataset
      const largeFields: EncryptionField[] = [];
      for (let i = 0; i < 1000; i++) {
        largeFields.push({
          fieldId: `large-field-${i}`,
          fieldName: 'large_data',
          value: Buffer.alloc(10240, 'test-data'), // 10KB per field
          encryptionLevel: 'standard',
          metadata: {
            algorithm: 'aes-256-gcm',
            keyVersion: '1.0.0',
            encryptionTime: new Date(),
            integrityHash: `hash-${i}`,
          }
        });
      }

      const request: BulkEncryptionRequest = {
        fields: largeFields,
        batchSize: 100,
        useWorkers: true,
        priority: 'normal',
      };

      await bulkOptimizer.encryptBatch(request);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      // Should not consume excessive memory
      expect(memoryIncrease).toBeLessThan(100); // <100MB increase

      console.log(`✅ Memory usage increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });
});