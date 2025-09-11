import { 
  BackupProvider, 
  BackupMetadata, 
  BackupResult, 
  BackupListFilters, 
  ProviderHealth, 
  StorageQuota, 
  ProviderConfig 
} from '../../../../src/types/backup';

interface MockConfig {
  failureRate?: number;
  latencyRange?: [number, number];
  networkFailures?: boolean;
  circuitBreakerEnabled?: boolean;
  storageQuota?: StorageQuota;
}

export class MockSupabaseProvider implements BackupProvider {
  public readonly name = 'supabase-storage-mock';
  public readonly type = 'supabase' as const;
  public readonly priority = 1;

  private config: MockConfig = {};
  private configured = false;
  private storage = new Map<string, Buffer>();
  private metadata = new Map<string, BackupMetadata>();
  private failureCount = 0;

  constructor(config: MockConfig = {}) {
    this.config = {
      failureRate: 0.02, // 2% failure rate
      latencyRange: [100, 500], // 100-500ms
      networkFailures: false,
      circuitBreakerEnabled: true,
      storageQuota: {
        used: 0,
        available: 100 * 1024 * 1024 * 1024, // 100GB
        total: 100 * 1024 * 1024 * 1024,
        unit: 'bytes'
      },
      ...config
    };
  }

  async configure(config: ProviderConfig): Promise<void> {
    await this.simulateLatency();
    if (this.shouldFail()) {
      throw new Error('Mock Supabase configuration failed');
    }
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async store(data: Buffer, metadata: BackupMetadata): Promise<BackupResult> {
    const startTime = Date.now();
    
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return {
        success: false,
        backupId: metadata.id,
        location: `supabase-mock://${metadata.id}`,
        size: data.length,
        duration: Date.now() - startTime,
        error: 'Mock storage failure'
      };
    }

    // Simulate chunked upload for large files
    if (data.length > 50 * 1024 * 1024) {
      await this.simulateChunkedUpload(data.length);
    }

    this.storage.set(metadata.id, data);
    this.metadata.set(metadata.id, metadata);
    this.config.storageQuota!.used += data.length;

    return {
      success: true,
      backupId: metadata.id,
      location: `supabase-mock://${metadata.id}`,
      size: data.length,
      duration: Date.now() - startTime
    };
  }

  async retrieve(backupId: string): Promise<Buffer> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      throw new Error('Mock retrieval failure');
    }

    const data = this.storage.get(backupId);
    if (!data) {
      throw new Error('Backup not found');
    }

    return data;
  }

  async verify(backupId: string): Promise<boolean> {
    await this.simulateLatency();
    return this.storage.has(backupId) && !this.shouldFail();
  }

  async delete(backupId: string): Promise<boolean> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return false;
    }

    const metadata = this.metadata.get(backupId);
    if (metadata) {
      this.config.storageQuota!.used -= metadata.size;
    }

    return this.storage.delete(backupId) && this.metadata.delete(backupId);
  }

  async list(filters?: BackupListFilters): Promise<BackupMetadata[]> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return [];
    }

    let results = Array.from(this.metadata.values());

    if (filters?.weddingId) {
      results = results.filter(m => m.weddingId === filters.weddingId);
    }

    if (filters?.dataType) {
      results = results.filter(m => m.dataType === filters.dataType);
    }

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    await this.simulateLatency();

    const latency = Date.now() - startTime;
    const isHealthy = !this.shouldFail();

    if (!isHealthy) {
      this.failureCount++;
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency,
      errorRate: this.failureCount / 10,
      lastCheck: new Date(),
      details: {
        configured: this.configured,
        storageUsed: this.config.storageQuota!.used,
        failureCount: this.failureCount
      }
    };
  }

  async getQuota(): Promise<StorageQuota> {
    await this.simulateLatency();
    return { ...this.config.storageQuota! };
  }

  // Mock-specific methods
  simulateNetworkFailure(): void {
    this.config.networkFailures = true;
  }

  restoreNetwork(): void {
    this.config.networkFailures = false;
  }

  setFailureRate(rate: number): void {
    this.config.failureRate = rate;
  }

  getStoredBackups(): string[] {
    return Array.from(this.storage.keys());
  }

  private async simulateLatency(): Promise<void> {
    const [min, max] = this.config.latencyRange!;
    const latency = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  private shouldFail(): boolean {
    if (this.config.networkFailures) {
      return true;
    }
    return Math.random() < this.config.failureRate!;
  }

  private async simulateChunkedUpload(size: number): Promise<void> {
    const chunks = Math.ceil(size / (10 * 1024 * 1024)); // 10MB chunks
    for (let i = 0; i < chunks; i++) {
      await this.simulateLatency();
      if (this.shouldFail()) {
        throw new Error(`Chunked upload failed at chunk ${i}`);
      }
    }
  }
}

export class MockAWSS3Provider implements BackupProvider {
  public readonly name = 'aws-s3-mock';
  public readonly type = 'aws-s3' as const;
  public readonly priority = 2;

  private config: MockConfig = {};
  private configured = false;
  private storage = new Map<string, Buffer>();
  private metadata = new Map<string, BackupMetadata>();
  private failureCount = 0;
  private multipartUploads = new Map<string, Buffer[]>();

  constructor(config: MockConfig = {}) {
    this.config = {
      failureRate: 0.01, // 1% failure rate
      latencyRange: [200, 800], // 200-800ms
      networkFailures: false,
      circuitBreakerEnabled: true,
      storageQuota: {
        used: 0,
        available: Number.MAX_SAFE_INTEGER,
        total: Number.MAX_SAFE_INTEGER,
        unit: 'bytes'
      },
      ...config
    };
  }

  async configure(config: ProviderConfig): Promise<void> {
    await this.simulateLatency();
    if (this.shouldFail()) {
      throw new Error('Mock AWS S3 configuration failed');
    }
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async store(data: Buffer, metadata: BackupMetadata): Promise<BackupResult> {
    const startTime = Date.now();
    
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return {
        success: false,
        backupId: metadata.id,
        location: `s3-mock://${metadata.id}`,
        size: data.length,
        duration: Date.now() - startTime,
        error: 'Mock S3 storage failure'
      };
    }

    // Simulate multipart upload for large files
    if (data.length > 100 * 1024 * 1024) {
      await this.simulateMultipartUpload(data, metadata.id);
    }

    this.storage.set(metadata.id, data);
    this.metadata.set(metadata.id, metadata);
    this.config.storageQuota!.used += data.length;

    return {
      success: true,
      backupId: metadata.id,
      location: `s3-mock://${metadata.id}`,
      size: data.length,
      duration: Date.now() - startTime
    };
  }

  async retrieve(backupId: string): Promise<Buffer> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      throw new Error('Mock S3 retrieval failure');
    }

    const data = this.storage.get(backupId);
    if (!data) {
      throw new Error('Backup not found in S3 mock');
    }

    return data;
  }

  async verify(backupId: string): Promise<boolean> {
    await this.simulateLatency();
    return this.storage.has(backupId) && !this.shouldFail();
  }

  async delete(backupId: string): Promise<boolean> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return false;
    }

    const metadata = this.metadata.get(backupId);
    if (metadata) {
      this.config.storageQuota!.used -= metadata.size;
    }

    return this.storage.delete(backupId) && this.metadata.delete(backupId);
  }

  async list(filters?: BackupListFilters): Promise<BackupMetadata[]> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return [];
    }

    let results = Array.from(this.metadata.values());

    if (filters?.weddingId) {
      results = results.filter(m => m.weddingId === filters.weddingId);
    }

    return results.slice(0, filters?.limit || 100);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    await this.simulateLatency();

    const latency = Date.now() - startTime;
    const isHealthy = !this.shouldFail();

    if (!isHealthy) {
      this.failureCount++;
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }

    return {
      status: isHealthy ? 'healthy' : latency > 5000 ? 'unhealthy' : 'degraded',
      latency,
      errorRate: this.failureCount / 10,
      lastCheck: new Date(),
      details: {
        configured: this.configured,
        multipartUploads: this.multipartUploads.size,
        failureCount: this.failureCount
      }
    };
  }

  async getQuota(): Promise<StorageQuota> {
    await this.simulateLatency();
    return { ...this.config.storageQuota! };
  }

  // Mock-specific methods
  simulateNetworkFailure(): void {
    this.config.networkFailures = true;
  }

  restoreNetwork(): void {
    this.config.networkFailures = false;
  }

  setFailureRate(rate: number): void {
    this.config.failureRate = rate;
  }

  getStoredBackups(): string[] {
    return Array.from(this.storage.keys());
  }

  private async simulateLatency(): Promise<void> {
    const [min, max] = this.config.latencyRange!;
    const latency = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  private shouldFail(): boolean {
    if (this.config.networkFailures) {
      return true;
    }
    return Math.random() < this.config.failureRate!;
  }

  private async simulateMultipartUpload(data: Buffer, key: string): Promise<void> {
    const partSize = 50 * 1024 * 1024; // 50MB parts
    const parts: Buffer[] = [];
    
    for (let offset = 0; offset < data.length; offset += partSize) {
      await this.simulateLatency();
      if (this.shouldFail()) {
        throw new Error(`Multipart upload failed for part ${parts.length + 1}`);
      }
      
      const part = data.subarray(offset, Math.min(offset + partSize, data.length));
      parts.push(part);
    }
    
    this.multipartUploads.set(key, parts);
  }
}

export class MockGCPStorageProvider implements BackupProvider {
  public readonly name = 'gcp-storage-mock';
  public readonly type = 'gcp-storage' as const;
  public readonly priority = 3;

  private config: MockConfig = {};
  private configured = false;
  private storage = new Map<string, Buffer>();
  private metadata = new Map<string, BackupMetadata>();
  private failureCount = 0;
  private resumableUploads = new Map<string, { progress: number; totalSize: number }>();

  constructor(config: MockConfig = {}) {
    this.config = {
      failureRate: 0.03, // 3% failure rate (highest of the three)
      latencyRange: [150, 600], // 150-600ms
      networkFailures: false,
      circuitBreakerEnabled: true,
      storageQuota: {
        used: 0,
        available: Number.MAX_SAFE_INTEGER,
        total: Number.MAX_SAFE_INTEGER,
        unit: 'bytes'
      },
      ...config
    };
  }

  async configure(config: ProviderConfig): Promise<void> {
    await this.simulateLatency();
    if (this.shouldFail()) {
      throw new Error('Mock GCP Storage configuration failed');
    }
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async store(data: Buffer, metadata: BackupMetadata): Promise<BackupResult> {
    const startTime = Date.now();
    
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return {
        success: false,
        backupId: metadata.id,
        location: `gs-mock://${metadata.id}`,
        size: data.length,
        duration: Date.now() - startTime,
        error: 'Mock GCP Storage failure'
      };
    }

    // Simulate resumable upload for large files
    if (data.length > 10 * 1024 * 1024) {
      await this.simulateResumableUpload(data, metadata.id);
    }

    this.storage.set(metadata.id, data);
    this.metadata.set(metadata.id, metadata);
    this.config.storageQuota!.used += data.length;

    return {
      success: true,
      backupId: metadata.id,
      location: `gs-mock://${metadata.id}`,
      size: data.length,
      duration: Date.now() - startTime
    };
  }

  async retrieve(backupId: string): Promise<Buffer> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      throw new Error('Mock GCP retrieval failure');
    }

    const data = this.storage.get(backupId);
    if (!data) {
      throw new Error('Backup not found in GCP mock');
    }

    return data;
  }

  async verify(backupId: string): Promise<boolean> {
    await this.simulateLatency();
    return this.storage.has(backupId) && !this.shouldFail();
  }

  async delete(backupId: string): Promise<boolean> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return false;
    }

    const metadata = this.metadata.get(backupId);
    if (metadata) {
      this.config.storageQuota!.used -= metadata.size;
    }

    this.resumableUploads.delete(backupId);
    return this.storage.delete(backupId) && this.metadata.delete(backupId);
  }

  async list(filters?: BackupListFilters): Promise<BackupMetadata[]> {
    await this.simulateLatency();
    
    if (this.shouldFail()) {
      return [];
    }

    let results = Array.from(this.metadata.values());

    if (filters?.weddingId) {
      results = results.filter(m => m.weddingId === filters.weddingId);
    }

    return results.slice(0, filters?.limit || 100);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    await this.simulateLatency();

    const latency = Date.now() - startTime;
    const isHealthy = !this.shouldFail();

    if (!isHealthy) {
      this.failureCount++;
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency,
      errorRate: this.failureCount / 10,
      lastCheck: new Date(),
      details: {
        configured: this.configured,
        resumableUploads: this.resumableUploads.size,
        failureCount: this.failureCount
      }
    };
  }

  async getQuota(): Promise<StorageQuota> {
    await this.simulateLatency();
    return { ...this.config.storageQuota! };
  }

  // Mock-specific methods
  simulateNetworkFailure(): void {
    this.config.networkFailures = true;
  }

  restoreNetwork(): void {
    this.config.networkFailures = false;
  }

  setFailureRate(rate: number): void {
    this.config.failureRate = rate;
  }

  getStoredBackups(): string[] {
    return Array.from(this.storage.keys());
  }

  private async simulateLatency(): Promise<void> {
    const [min, max] = this.config.latencyRange!;
    const latency = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  private shouldFail(): boolean {
    if (this.config.networkFailures) {
      return true;
    }
    return Math.random() < this.config.failureRate!;
  }

  private async simulateResumableUpload(data: Buffer, key: string): Promise<void> {
    const chunkSize = 1024 * 1024; // 1MB chunks for resumable upload
    const totalChunks = Math.ceil(data.length / chunkSize);
    
    this.resumableUploads.set(key, { progress: 0, totalSize: data.length });
    
    for (let i = 0; i < totalChunks; i++) {
      await this.simulateLatency();
      if (this.shouldFail()) {
        throw new Error(`Resumable upload failed at chunk ${i + 1}/${totalChunks}`);
      }
      
      const uploadState = this.resumableUploads.get(key)!;
      uploadState.progress = Math.min(data.length, (i + 1) * chunkSize);
    }
    
    this.resumableUploads.delete(key);
  }
}