/**
 * WedSync CMS Media Performance Benchmarking
 * Optimized for wedding vendor workflows
 */

export interface MediaBenchmarkResult {
  uploadTime: number;
  optimizationTime: number;
  totalTime: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  memoryUsage: number;
  deviceType: 'desktop' | 'tablet' | 'mobile';
}

export interface WeddingScenario {
  name: string;
  imageCount: number;
  averageSize: number; // MB
  expectedTime: number; // seconds
}

export class MediaPerformanceBenchmark {
  private memoryBaseline: number = 0;
  private performanceEntries: PerformanceEntry[] = [];

  // Wedding-specific scenarios
  static readonly SCENARIOS: Record<string, WeddingScenario> = {
    singlePortfolio: {
      name: 'Single Portfolio Image',
      imageCount: 1,
      averageSize: 5, // 5MB
      expectedTime: 3,
    },
    weddingGallery: {
      name: 'Wedding Gallery Upload',
      imageCount: 50,
      averageSize: 4,
      expectedTime: 45, // ~1s per image
    },
    quickPreview: {
      name: 'Quick Preview Upload',
      imageCount: 5,
      averageSize: 2,
      expectedTime: 8,
    },
    venueShowcase: {
      name: 'Venue Showcase',
      imageCount: 20,
      averageSize: 6,
      expectedTime: 30,
    },
  };

  constructor() {
    this.initializeMemoryBaseline();
  }

  async benchmarkImageUpload(
    file: File,
    scenario: string = 'singlePortfolio',
  ): Promise<MediaBenchmarkResult> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();

    performance.mark('upload-start');

    try {
      // Simulate image optimization pipeline
      const optimizedFile = await this.optimizeImage(file);

      performance.mark('optimization-complete');

      // Upload to storage
      await this.uploadToStorage(optimizedFile);

      performance.mark('upload-complete');

      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      // Calculate metrics
      const uploadTime = this.getTimeFromMarks(
        'upload-start',
        'upload-complete',
      );
      const optimizationTime = this.getTimeFromMarks(
        'upload-start',
        'optimization-complete',
      );

      return {
        uploadTime,
        optimizationTime,
        totalTime: endTime - startTime,
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
        compressionRatio: (file.size - optimizedFile.size) / file.size,
        memoryUsage: memoryAfter - memoryBefore,
        deviceType: this.detectDeviceType(),
      };
    } finally {
      performance.clearMarks();
    }
  }

  async benchmarkBatchUpload(
    files: File[],
    scenario: keyof typeof MediaPerformanceBenchmark.SCENARIOS,
  ): Promise<MediaBenchmarkResult[]> {
    const results: MediaBenchmarkResult[] = [];
    const expectedScenario = MediaPerformanceBenchmark.SCENARIOS[scenario];

    console.log(`Starting ${expectedScenario.name} benchmark...`);
    const batchStart = performance.now();

    // Test concurrent uploads (wedding scenario)
    const concurrentUploads = files.map(async (file, index) => {
      const result = await this.benchmarkImageUpload(file, scenario);
      console.log(
        `Image ${index + 1}/${files.length}: ${result.totalTime.toFixed(0)}ms`,
      );
      return result;
    });

    const batchResults = await Promise.all(concurrentUploads);
    const batchEnd = performance.now();

    // Analyze batch performance
    const totalTime = batchEnd - batchStart;
    const averageTime =
      batchResults.reduce((sum, r) => sum + r.totalTime, 0) /
      batchResults.length;
    const maxTime = Math.max(...batchResults.map((r) => r.totalTime));

    console.log(`Batch completed in ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Average per image: ${averageTime.toFixed(0)}ms`);
    console.log(`Slowest image: ${maxTime.toFixed(0)}ms`);

    // Verify against expectations
    if (totalTime / 1000 > expectedScenario.expectedTime) {
      console.warn(
        `⚠️ Batch exceeded expected time: ${(totalTime / 1000).toFixed(2)}s > ${expectedScenario.expectedTime}s`,
      );
    }

    return batchResults;
  }

  async optimizeImage(file: File): Promise<File> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        // Calculate optimal dimensions (max 1920px width for web)
        const maxWidth = 1920;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);

        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            const optimizedFile = new File([blob!], file.name, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/webp',
          0.85,
        ); // 85% quality for optimal size/quality ratio
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private async uploadToStorage(file: File): Promise<void> {
    // Simulate upload with actual network delay
    const uploadTime = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise((resolve) => setTimeout(resolve, uploadTime));
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getTimeFromMarks(startMark: string, endMark: string): number {
    const measure = performance.measure(
      `${startMark}-to-${endMark}`,
      startMark,
      endMark,
    );
    return measure.duration;
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private initializeMemoryBaseline(): void {
    this.memoryBaseline = this.getMemoryUsage();
  }

  // Wedding-specific performance tests
  async runWeddingDayStressTest(): Promise<void> {
    console.log('🎉 Starting Wedding Day Stress Test...');

    // Simulate high load scenario (multiple vendors uploading simultaneously)
    const testFiles = await this.generateTestFiles(25); // 25 x 5MB = 125MB total

    const stressStart = performance.now();
    await this.benchmarkBatchUpload(testFiles, 'weddingGallery');
    const stressEnd = performance.now();

    const totalTime = (stressEnd - stressStart) / 1000;
    console.log(
      `Wedding Day Stress Test completed in ${totalTime.toFixed(2)}s`,
    );

    // Wedding day requirements: <2 minutes for typical gallery
    if (totalTime > 120) {
      console.error('❌ Wedding Day performance requirement FAILED');
    } else {
      console.log('✅ Wedding Day performance requirement PASSED');
    }
  }

  private async generateTestFiles(count: number): Promise<File[]> {
    const files: File[] = [];

    // Create canvas-based test images
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < count; i++) {
      // Generate different colored rectangles to simulate real images
      ctx.fillStyle = `hsl(${i * 15}, 70%, 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add some detail to increase file size
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText(`Test Image ${i + 1}`, 50, 100);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });

      files.push(
        new File([blob], `test-image-${i + 1}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        }),
      );
    }

    return files;
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: MediaBenchmarkResult[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(metric: MediaBenchmarkResult): void {
    this.metrics.push(metric);

    // Auto-alert on poor performance
    if (metric.totalTime > 5000) {
      // >5s
      console.warn(
        `⚠️ Slow upload detected: ${(metric.totalTime / 1000).toFixed(2)}s`,
      );
    }

    // Memory usage alert
    if (metric.memoryUsage > 50 * 1024 * 1024) {
      // >50MB
      console.warn(
        `⚠️ High memory usage: ${(metric.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      );
    }
  }

  getAveragePerformance(): { avgTime: number; avgMemory: number } {
    if (this.metrics.length === 0) return { avgTime: 0, avgMemory: 0 };

    const avgTime =
      this.metrics.reduce((sum, m) => sum + m.totalTime, 0) /
      this.metrics.length;
    const avgMemory =
      this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) /
      this.metrics.length;

    return { avgTime, avgMemory };
  }

  generateReport(): string {
    const { avgTime, avgMemory } = this.getAveragePerformance();
    const deviceBreakdown = this.getDeviceBreakdown();

    return `
📊 WedSync CMS Performance Report
================================
Total uploads: ${this.metrics.length}
Average time: ${(avgTime / 1000).toFixed(2)}s
Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB

Device Performance:
- Desktop: ${deviceBreakdown.desktop} uploads
- Tablet: ${deviceBreakdown.tablet} uploads  
- Mobile: ${deviceBreakdown.mobile} uploads

${this.getPerformanceGrade()}
    `;
  }

  private getDeviceBreakdown() {
    return this.metrics.reduce(
      (acc, metric) => {
        acc[metric.deviceType]++;
        return acc;
      },
      { desktop: 0, tablet: 0, mobile: 0 },
    );
  }

  private getPerformanceGrade(): string {
    const { avgTime } = this.getAveragePerformance();

    if (avgTime < 2000) return '🟢 Excellent Performance (A+)';
    if (avgTime < 3000) return '🟡 Good Performance (B)';
    if (avgTime < 5000) return '🟠 Acceptable Performance (C)';
    return '🔴 Poor Performance (D) - Optimization needed';
  }
}
