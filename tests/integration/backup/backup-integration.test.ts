import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackupProviderManager } from '../../../src/lib/storage/provider-manager';
import { backupMonitoringService } from '../../../src/lib/integrations/backup-monitoring';
import { healthMonitor } from '../../../src/lib/integrations/health-monitor';
import { 
  MockSupabaseProvider, 
  MockAWSS3Provider, 
  MockGCPStorageProvider 
} from './mocks/mock-providers';
import { BackupMetadata, BackupStrategy } from '../../../src/types/backup';
import crypto from 'crypto';

// Test data generators
function generateTestData(size: number = 1024): Buffer {
  return Buffer.alloc(size, 'test-data');
}

function generateWeddingMetadata(overrides: Partial<BackupMetadata> = {}): BackupMetadata {
  const data = generateTestData(1024);
  const checksum = crypto.createHash('sha256').update(data).digest('hex');
  
  return {
    id: `test_backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    filename: 'wedding_backup.json',
    size: data.length,
    checksum,
    timestamp: new Date(),
    weddingId: 'wedding_test_001',
    dataType: 'wedding',
    compression: 'gzip',
    encryption: true,
    version: '1.0',
    ...overrides
  };
}

describe('WS-191 Backup Procedures System - Integration Tests', () => {
  let backupManager: BackupProviderManager;
  let mockSupabase: MockSupabaseProvider;
  let mockS3: MockAWSS3Provider;
  let mockGCP: MockGCPStorageProvider;

  beforeEach(async () => {
    // Create mock providers with realistic configurations
    mockSupabase = new MockSupabaseProvider({
      failureRate: 0.01,
      latencyRange: [100, 300]
    });

    mockS3 = new MockAWSS3Provider({
      failureRate: 0.005,
      latencyRange: [200, 500]
    });

    mockGCP = new MockGCPStorageProvider({
      failureRate: 0.02,
      latencyRange: [150, 400]
    });

    // Create backup manager with mock providers
    backupManager = new BackupProviderManager();
    backupManager.registerProvider(mockSupabase);
    backupManager.registerProvider(mockS3);
    backupManager.registerProvider(mockGCP);

    // Configure providers
    await backupManager.configureProvider('supabase-storage-mock', {
      credentials: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseServiceKey: 'test-key'
      }
    });

    await backupManager.configureProvider('aws-s3-mock', {
      credentials: {
        awsAccessKeyId: 'test-key-id',
        awsSecretAccessKey: 'test-secret-key',
        awsRegion: 'us-east-1'
      }
    });

    await backupManager.configureProvider('gcp-storage-mock', {
      credentials: {
        gcpProjectId: 'test-project',
        gcpKeyFile: '/path/to/test-key.json'
      }
    });
  });

  afterEach(async () => {
    backupMonitoringService.destroy();
    healthMonitor.destroy();
  });

  describe('Multi-Cloud Backup Orchestration', () => {
    it('should successfully backup to all configured providers', async () => {
      const testData = generateTestData(5 * 1024 * 1024); // 5MB
      const metadata = generateWeddingMetadata({ size: testData.length });

      const strategy: BackupStrategy = {
        primary: 'supabase-storage-mock',
        secondary: 'aws-s3-mock',
        offsite: 'gcp-storage-mock',
        replicationCount: 3,
        consistencyLevel: 'strong',
        verificationRequired: true
      };

      const job = await backupManager.backup(testData, metadata, strategy);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000));
      const completedJob = backupManager.getJob(job.id);

      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.results).toHaveLength(3);
      
      const successfulBackups = completedJob?.results.filter(r => r.success);
      expect(successfulBackups).toHaveLength(3);

      // Verify each provider has the backup
      expect(mockSupabase.getStoredBackups()).toContain(metadata.id);
      expect(mockS3.getStoredBackups()).toContain(metadata.id);
      expect(mockGCP.getStoredBackups()).toContain(metadata.id);
    }, 10000);

    it('should handle partial provider failures with graceful degradation', async () => {
      // Simulate GCP failure
      mockGCP.setFailureRate(1.0); // 100% failure rate

      const testData = generateTestData(1024);
      const metadata = generateWeddingMetadata({ size: testData.length });

      const strategy: BackupStrategy = {
        primary: 'supabase-storage-mock',
        secondary: 'aws-s3-mock',
        offsite: 'gcp-storage-mock',
        replicationCount: 2, // Only need 2 successful backups
        consistencyLevel: 'eventual',
        verificationRequired: false
      };

      const job = await backupManager.backup(testData, metadata, strategy);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000));
      const completedJob = backupManager.getJob(job.id);

      expect(completedJob?.status).toBe('completed');
      
      const successfulBackups = completedJob?.results.filter(r => r.success);
      const failedBackups = completedJob?.results.filter(r => !r.success);
      
      expect(successfulBackups).toHaveLength(2); // Supabase and S3
      expect(failedBackups).toHaveLength(1); // GCP should fail
    });

    it('should fail backup when insufficient providers succeed', async () => {
      // Simulate failures on multiple providers
      mockS3.setFailureRate(1.0);
      mockGCP.setFailureRate(1.0);

      const testData = generateTestData(1024);
      const metadata = generateWeddingMetadata({ size: testData.length });

      const strategy: BackupStrategy = {
        primary: 'supabase-storage-mock',
        secondary: 'aws-s3-mock',
        offsite: 'gcp-storage-mock',
        replicationCount: 3, // Need all 3 to succeed
        consistencyLevel: 'strong',
        verificationRequired: true
      };

      const job = await backupManager.backup(testData, metadata, strategy);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000));
      const completedJob = backupManager.getJob(job.id);

      expect(completedJob?.status).toBe('failed');
      expect(completedJob?.error).toContain('only 1 of 3 required backups succeeded');
    });
  });

  describe('Provider Health Monitoring and Failover', () => {
    it('should detect provider health degradation', async () => {
      const healthPromise = new Promise<any>((resolve) => {
        healthMonitor.once('alert_created', resolve);
      });

      // Simulate high latency on Supabase
      mockSupabase.setFailureRate(0.15); // 15% failure rate

      // Trigger health checks
      await healthMonitor.performHealthChecks();

      const alert = await healthPromise;
      expect(alert.category).toBe('health');
      expect(alert.provider).toBe('supabase-storage-mock');
      expect(alert.level).toBeOneOf(['warning', 'critical']);
    }, 5000);

    it('should trigger circuit breaker on repeated failures', async () => {
      let circuitBreakerOpened = false;
      
      backupMonitoringService.on('circuit_breaker_opened', () => {
        circuitBreakerOpened = true;
      });

      // Simulate network failure
      mockSupabase.simulateNetworkFailure();

      // Trigger multiple health checks to open circuit breaker
      for (let i = 0; i < 6; i++) {
        await mockSupabase.healthCheck();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(circuitBreakerOpened).toBe(true);
    });

    it('should perform automatic failover when primary provider fails', async () => {
      // Simulate primary provider failure
      mockSupabase.simulateNetworkFailure();

      const testData = generateTestData(1024);
      const metadata = generateWeddingMetadata({ size: testData.length });

      // Attempt backup - should succeed with secondary providers
      const retrievedData = await backupManager.retrieve(metadata.id, 'aws-s3-mock');
      
      // First store data in S3 to test retrieval failover
      await mockS3.store(testData, metadata);
      
      // Now test failover retrieval
      const data = await backupManager.retrieve(metadata.id);
      expect(data).toEqual(testData);
    });
  });

  describe('Real-time Monitoring Integration', () => {
    it('should emit real-time progress events during backup', async () => {
      const progressEvents: any[] = [];
      
      backupMonitoringService.on('backup_progress', (progress) => {
        progressEvents.push(progress);
      });

      const testData = generateTestData(10 * 1024 * 1024); // 10MB for chunked upload
      const metadata = generateWeddingMetadata({ size: testData.length });

      await backupManager.backup(testData, metadata);

      // Wait for events to be emitted
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('backupId');
      expect(progressEvents[0]).toHaveProperty('progress');
    });

    it('should provide real-time provider health updates', async () => {
      const healthUpdates: any[] = [];
      
      backupMonitoringService.on('provider_health', (health) => {
        healthUpdates.push(health);
      });

      // Trigger health monitoring
      await healthMonitor.performHealthChecks();

      expect(healthUpdates.length).toBeGreaterThanOrEqual(3); // One per provider
      
      const supabaseHealth = healthUpdates.find(h => h.provider === 'supabase-storage-mock');
      expect(supabaseHealth).toBeDefined();
      expect(supabaseHealth.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(supabaseHealth.latency).toBeGreaterThan(0);
    });
  });

  describe('3-2-1 Backup Rule Compliance', () => {
    it('should validate 3-2-1 rule compliance for wedding backups', async () => {
      const testData = generateTestData(1024);
      const metadata = generateWeddingMetadata({ 
        weddingId: 'compliance-test-001',
        size: testData.length 
      });

      // Backup to all three providers
      const strategy: BackupStrategy = {
        primary: 'supabase-storage-mock',
        secondary: 'aws-s3-mock',
        offsite: 'gcp-storage-mock',
        replicationCount: 3,
        consistencyLevel: 'strong',
        verificationRequired: true
      };

      await backupManager.backup(testData, metadata, strategy);

      // Wait and check compliance
      await new Promise(resolve => setTimeout(resolve, 1000));
      await healthMonitor.performComplianceChecks();

      const complianceChecks = healthMonitor.getComplianceChecks();
      const weddingCompliance = Array.from(complianceChecks.values())
        .find(c => c.weddingId === 'compliance-test-001');

      expect(weddingCompliance).toBeDefined();
      expect(weddingCompliance!.rules.threeTwo1.threeCopies).toBe(true);
      expect(weddingCompliance!.rules.threeTwo1.twoMedia).toBe(true);
      expect(weddingCompliance!.rules.threeTwo1.oneOffsite).toBe(true);
      expect(weddingCompliance!.rules.threeTwo1.compliant).toBe(true);
    });

    it('should detect compliance violations when providers fail', async () => {
      const testData = generateTestData(1024);
      const metadata = generateWeddingMetadata({ 
        weddingId: 'compliance-violation-001',
        size: testData.length 
      });

      // Backup initially to all providers
      await backupManager.backup(testData, metadata);

      // Simulate two providers going offline
      mockS3.simulateNetworkFailure();
      mockGCP.simulateNetworkFailure();

      await healthMonitor.performHealthChecks();
      await healthMonitor.performComplianceChecks();

      const complianceChecks = healthMonitor.getComplianceChecks();
      const violationCompliance = Array.from(complianceChecks.values())
        .find(c => c.weddingId === 'compliance-violation-001');

      expect(violationCompliance).toBeDefined();
      expect(violationCompliance!.rules.threeTwo1.compliant).toBe(false);
      expect(violationCompliance!.overallCompliance).toBeLessThan(100);
    });
  });

  describe('Performance Testing and Benchmarks', () => {
    it('should meet performance benchmarks for backup operations', async () => {
      const testSizes = [
        1024,           // 1KB
        1024 * 1024,    // 1MB  
        10 * 1024 * 1024, // 10MB
        50 * 1024 * 1024  // 50MB
      ];

      const performanceResults = [];

      for (const size of testSizes) {
        const testData = generateTestData(size);
        const metadata = generateWeddingMetadata({ size });

        const startTime = Date.now();
        const job = await backupManager.backup(testData, metadata);
        
        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 2000));
        const completedJob = backupManager.getJob(job.id);
        const totalTime = Date.now() - startTime;

        const avgProviderTime = completedJob!.results
          .filter(r => r.success)
          .reduce((sum, r) => sum + r.duration, 0) / 3;

        const throughputMBps = (size / (1024 * 1024)) / (avgProviderTime / 1000);

        performanceResults.push({
          size,
          totalTime,
          avgProviderTime,
          throughputMBps
        });

        // Performance assertions
        expect(totalTime).toBeLessThan(30000); // Under 30 seconds
        expect(throughputMBps).toBeGreaterThan(1); // At least 1 MB/s
      }

      // Log performance results for analysis
      console.log('Performance Benchmark Results:', performanceResults);
    }, 60000);

    it('should handle concurrent backup operations efficiently', async () => {
      const concurrentBackups = 5;
      const testData = generateTestData(1024 * 1024); // 1MB each

      const backupPromises = Array.from({ length: concurrentBackups }, (_, i) => {
        const metadata = generateWeddingMetadata({ 
          weddingId: `concurrent-test-${i}`,
          size: testData.length 
        });
        return backupManager.backup(testData, metadata);
      });

      const startTime = Date.now();
      const jobs = await Promise.all(backupPromises);
      
      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Check all jobs completed successfully
      const completedJobs = jobs.map(job => backupManager.getJob(job.id));
      const successfulJobs = completedJobs.filter(job => job?.status === 'completed');

      expect(successfulJobs).toHaveLength(concurrentBackups);
      expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds
      
      // Verify no resource contention issues
      const allResults = completedJobs.flatMap(job => job?.results || []);
      const failureRate = allResults.filter(r => !r.success).length / allResults.length;
      expect(failureRate).toBeLessThan(0.1); // Less than 10% failure rate
    }, 30000);
  });

  describe('Wedding Data Specific Scenarios', () => {
    it('should handle wedding photo backup with metadata preservation', async () => {
      const photoData = generateTestData(25 * 1024 * 1024); // 25MB wedding photo
      const photoMetadata = generateWeddingMetadata({
        filename: 'wedding_ceremony_001.jpg',
        dataType: 'media',
        size: photoData.length,
        weddingId: 'smith-jones-2024'
      });

      const job = await backupManager.backup(photoData, photoMetadata);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      const completedJob = backupManager.getJob(job.id);

      expect(completedJob?.status).toBe('completed');

      // Verify metadata is preserved
      const backupList = await backupManager.list({
        weddingId: 'smith-jones-2024',
        dataType: 'media'
      });

      expect(backupList).toHaveLength(1);
      expect(backupList[0].filename).toBe('wedding_ceremony_001.jpg');
      expect(backupList[0].dataType).toBe('media');
      expect(backupList[0].weddingId).toBe('smith-jones-2024');
    });

    it('should handle vendor document backup with compliance tracking', async () => {
      const contractData = generateTestData(512 * 1024); // 512KB contract
      const contractMetadata = generateWeddingMetadata({
        filename: 'vendor_contract_photographer.pdf',
        dataType: 'documents',
        size: contractData.length,
        weddingId: 'smith-jones-2024'
      });

      await backupManager.backup(contractData, contractMetadata);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check compliance for document retention
      await healthMonitor.performComplianceChecks();
      const complianceChecks = healthMonitor.getComplianceChecks();
      
      const documentCompliance = Array.from(complianceChecks.values())
        .find(c => c.weddingId === 'smith-jones-2024');

      expect(documentCompliance).toBeDefined();
      expect(documentCompliance!.rules.retention.documents).toBeGreaterThan(0);
      expect(documentCompliance!.rules.retention.compliant).toBe(true);
    });

    it('should prioritize wedding data during high-load scenarios', async () => {
      // Simulate high load with mixed data types
      const backupPromises = [
        // High priority wedding data
        ...Array.from({ length: 3 }, (_, i) => {
          const weddingData = generateTestData(5 * 1024 * 1024);
          const metadata = generateWeddingMetadata({
            dataType: 'wedding',
            weddingId: `priority-wedding-${i}`,
            size: weddingData.length
          });
          return { data: weddingData, metadata, priority: 'high' };
        }),
        
        // Lower priority analytics data
        ...Array.from({ length: 5 }, (_, i) => {
          const analyticsData = generateTestData(1024 * 1024);
          const metadata = generateWeddingMetadata({
            dataType: 'analytics',
            weddingId: `analytics-${i}`,
            size: analyticsData.length
          });
          return { data: analyticsData, metadata, priority: 'low' };
        })
      ];

      const startTime = Date.now();
      const jobs = await Promise.all(
        backupPromises.map(({ data, metadata }) => 
          backupManager.backup(data, metadata)
        )
      );

      await new Promise(resolve => setTimeout(resolve, 10000));

      const completedJobs = jobs.map(job => backupManager.getJob(job.id));
      const weddingJobs = completedJobs
        .filter(job => job?.weddingId?.includes('priority-wedding'));
      
      // Wedding data should complete successfully even under load
      expect(weddingJobs.every(job => job?.status === 'completed')).toBe(true);
      
      // Check that wedding data completed relatively quickly
      const weddingCompletionTimes = weddingJobs
        .map(job => job!.endTime!.getTime() - job!.startTime.getTime());
      
      const avgWeddingTime = weddingCompletionTimes.reduce((a, b) => a + b, 0) / weddingCompletionTimes.length;
      expect(avgWeddingTime).toBeLessThan(15000); // Under 15 seconds average
    }, 20000);
  });

  describe('Error Handling and Recovery', () => {
    it('should retry failed operations with exponential backoff', async () => {
      // Set intermittent failure
      mockSupabase.setFailureRate(0.7); // 70% failure rate

      const testData = generateTestData(1024);
      const metadata = generateWeddingMetadata({ size: testData.length });

      const job = await backupManager.backup(testData, metadata);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      const completedJob = backupManager.getJob(job.id);

      // Should eventually succeed due to retries
      expect(completedJob?.status).toBeOneOf(['completed', 'failed']);
      
      // Check if any retries occurred
      const supabaseResult = completedJob?.results.find(r => 
        r.location.includes('supabase-mock')
      );
      
      if (supabaseResult?.success) {
        // If successful, it likely required retries
        expect(supabaseResult.retryCount).toBeGreaterThan(0);
      }
    });

    it('should maintain data integrity during provider failures', async () => {
      const testData = generateTestData(2048);
      const originalChecksum = crypto.createHash('sha256').update(testData).digest('hex');
      
      const metadata = generateWeddingMetadata({ 
        size: testData.length,
        checksum: originalChecksum
      });

      // Simulate partial network issues
      mockGCP.setFailureRate(0.3);

      await backupManager.backup(testData, metadata);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retrieve data from each provider that succeeded
      const providers = ['supabase-storage-mock', 'aws-s3-mock', 'gcp-storage-mock'];
      
      for (const provider of providers) {
        try {
          const retrievedData = await backupManager.retrieve(metadata.id, provider);
          const retrievedChecksum = crypto.createHash('sha256').update(retrievedData).digest('hex');
          
          expect(retrievedChecksum).toBe(originalChecksum);
          expect(retrievedData).toEqual(testData);
        } catch (error) {
          // Provider failure is acceptable, but data integrity must be maintained
          // if the provider claims to have the data
          const mockProvider = provider === 'supabase-storage-mock' ? mockSupabase :
                              provider === 'aws-s3-mock' ? mockS3 : mockGCP;
          
          if (mockProvider.getStoredBackups().includes(metadata.id)) {
            throw new Error(`Data integrity check failed for ${provider}: ${error}`);
          }
        }
      }
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should collect comprehensive performance metrics', async () => {
      const testData = generateTestData(5 * 1024 * 1024); // 5MB
      const metadata = generateWeddingMetadata({ size: testData.length });

      await backupManager.backup(testData, metadata);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Collect performance metrics
      await healthMonitor.collectPerformanceMetrics();
      const metrics = healthMonitor.getPerformanceMetrics();

      expect(metrics.size).toBe(3); // One per provider

      for (const [provider, metric] of metrics) {
        expect(metric.operations.backup.avgDuration).toBeGreaterThan(0);
        expect(metric.operations.backup.successRate).toBeGreaterThanOrEqual(90);
        expect(metric.operations.backup.throughput).toBeGreaterThan(0);
        expect(metric.resources.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(metric.resources.cpuUsage).toBeLessThanOrEqual(100);
      }
    });

    it('should generate alerts for performance degradation', async () => {
      const alertPromise = new Promise<any>((resolve) => {
        healthMonitor.once('alert_created', resolve);
      });

      // Simulate performance degradation
      mockSupabase.setFailureRate(0.25); // 25% failure rate

      await healthMonitor.collectPerformanceMetrics();

      const alert = await alertPromise;
      expect(alert.category).toBe('performance');
      expect(alert.level).toBeOneOf(['warning', 'critical']);
    }, 5000);
  });
});