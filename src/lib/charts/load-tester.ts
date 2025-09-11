'use client';

interface LoadTestConfig {
  concurrentUsers: number;
  testDuration: number; // in milliseconds
  rampUpTime: number; // time to reach full load
  chartTypes: ('line' | 'bar' | 'area' | 'pie')[];
  dataSizes: ('small' | 'medium' | 'large' | 'xlarge')[];
  deviceTypes: ('mobile' | 'tablet' | 'desktop')[];
  operations: LoadTestOperation[];
}

interface LoadTestOperation {
  name: string;
  weight: number; // Probability weight (0-1)
  operation: () => Promise<LoadTestResult>;
}

interface LoadTestResult {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  dataPoints?: number;
  deviceType?: string;
  chartType?: string;
}

interface LoadTestSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  percentile95ResponseTime: number;
  percentile99ResponseTime: number;
  operationsPerSecond: number;
  errorRate: number;
  slowestOperations: LoadTestResult[];
  fastestOperations: LoadTestResult[];
  operationBreakdown: Record<
    string,
    {
      count: number;
      averageTime: number;
      errorCount: number;
    }
  >;
  deviceTypeBreakdown: Record<
    string,
    {
      count: number;
      averageTime: number;
    }
  >;
  memoryUsage: {
    start: number;
    peak: number;
    end: number;
  };
}

class ChartLoadTester {
  private results: LoadTestResult[] = [];
  private isRunning = false;
  private startMemory = 0;
  private peakMemory = 0;

  constructor() {
    // Monitor memory usage during tests
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in window.performance
    ) {
      setInterval(() => {
        const memory = (window.performance as any).memory;
        const currentMemory = memory.usedJSHeapSize;
        if (currentMemory > this.peakMemory) {
          this.peakMemory = currentMemory;
        }
      }, 1000);
    }
  }

  private generateSampleData(
    size: 'small' | 'medium' | 'large' | 'xlarge',
  ): any[] {
    const sizeMap = {
      small: 10,
      medium: 100,
      large: 1000,
      xlarge: 10000,
    };

    const dataPoints = sizeMap[size];
    const data = [];

    for (let i = 0; i < dataPoints; i++) {
      data.push({
        x: i,
        date: new Date(
          Date.now() - (dataPoints - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        value: Math.random() * 1000 + 500,
        category: `Category ${i % 10}`,
        vendor: `Vendor ${i % 20}`,
        revenue: Math.random() * 5000 + 1000,
        bookings: Math.floor(Math.random() * 50) + 1,
        rating: Math.random() * 5 + 1,
      });
    }

    return data;
  }

  private async simulateChartRender(
    chartType: 'line' | 'bar' | 'area' | 'pie',
    dataSize: 'small' | 'medium' | 'large' | 'xlarge',
    deviceType: 'mobile' | 'tablet' | 'desktop',
  ): Promise<LoadTestResult> {
    const startTime = performance.now();
    const operationName = `render-${chartType}-${dataSize}-${deviceType}`;

    try {
      const data = this.generateSampleData(dataSize);

      // Simulate different processing times based on chart type and device
      const baseTime = {
        line: 50,
        bar: 75,
        area: 100,
        pie: 125,
      }[chartType];

      const deviceMultiplier = {
        mobile: 2.5,
        tablet: 1.5,
        desktop: 1.0,
      }[deviceType];

      const dataSizeMultiplier = {
        small: 1,
        medium: 2,
        large: 5,
        xlarge: 15,
      }[dataSize];

      // Simulate processing time with some randomness
      const processingTime =
        baseTime *
        deviceMultiplier *
        dataSizeMultiplier *
        (0.8 + Math.random() * 0.4);

      await new Promise((resolve) => setTimeout(resolve, processingTime));

      // Simulate DOM operations
      if (typeof window !== 'undefined') {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = `<div style="width: 100%; height: 300px;">Chart rendered with ${data.length} points</div>`;
        document.body.appendChild(testDiv);

        // Clean up immediately
        setTimeout(() => {
          document.body.removeChild(testDiv);
        }, 10);
      }

      const endTime = performance.now();

      return {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: true,
        dataPoints: data.length,
        deviceType,
        chartType,
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceType,
        chartType,
      };
    }
  }

  private async simulateDataFetch(
    endpoint: string,
    dataSize: 'small' | 'medium' | 'large' | 'xlarge',
  ): Promise<LoadTestResult> {
    const startTime = performance.now();
    const operationName = `fetch-${endpoint}-${dataSize}`;

    try {
      // Simulate network delay
      const networkDelay = Math.random() * 200 + 50; // 50-250ms
      await new Promise((resolve) => setTimeout(resolve, networkDelay));

      const data = this.generateSampleData(dataSize);

      // Simulate JSON parsing time
      const jsonString = JSON.stringify(data);
      JSON.parse(jsonString);

      const endTime = performance.now();

      return {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: true,
        dataPoints: data.length,
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async simulateUserInteraction(
    interactionType: 'zoom' | 'pan' | 'hover' | 'click' | 'filter',
    chartType: 'line' | 'bar' | 'area' | 'pie',
    deviceType: 'mobile' | 'tablet' | 'desktop',
  ): Promise<LoadTestResult> {
    const startTime = performance.now();
    const operationName = `interaction-${interactionType}-${chartType}-${deviceType}`;

    try {
      // Simulate interaction processing time
      const baseTime = {
        zoom: 20,
        pan: 15,
        hover: 5,
        click: 10,
        filter: 50,
      }[interactionType];

      const deviceMultiplier = {
        mobile: 1.5,
        tablet: 1.2,
        desktop: 1.0,
      }[deviceType];

      const processingTime =
        baseTime * deviceMultiplier * (0.8 + Math.random() * 0.4);

      await new Promise((resolve) => setTimeout(resolve, processingTime));

      const endTime = performance.now();

      return {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: true,
        deviceType,
        chartType,
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceType,
        chartType,
      };
    }
  }

  private createDefaultOperations(config: LoadTestConfig): LoadTestOperation[] {
    const operations: LoadTestOperation[] = [];

    // Chart rendering operations
    for (const chartType of config.chartTypes) {
      for (const dataSize of config.dataSizes) {
        for (const deviceType of config.deviceTypes) {
          operations.push({
            name: `render-${chartType}-${dataSize}-${deviceType}`,
            weight: 0.4, // 40% of operations are chart renders
            operation: () =>
              this.simulateChartRender(chartType, dataSize, deviceType),
          });
        }
      }
    }

    // Data fetch operations
    const endpoints = ['analytics', 'metrics', 'trends', 'reports'];
    for (const endpoint of endpoints) {
      for (const dataSize of config.dataSizes) {
        operations.push({
          name: `fetch-${endpoint}-${dataSize}`,
          weight: 0.3, // 30% of operations are data fetches
          operation: () => this.simulateDataFetch(endpoint, dataSize),
        });
      }
    }

    // User interactions
    const interactions = ['zoom', 'pan', 'hover', 'click', 'filter'] as const;
    for (const interaction of interactions) {
      for (const chartType of config.chartTypes) {
        for (const deviceType of config.deviceTypes) {
          operations.push({
            name: `interaction-${interaction}-${chartType}-${deviceType}`,
            weight: 0.3, // 30% of operations are user interactions
            operation: () =>
              this.simulateUserInteraction(interaction, chartType, deviceType),
          });
        }
      }
    }

    return operations;
  }

  private selectRandomOperation(
    operations: LoadTestOperation[],
  ): LoadTestOperation {
    const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const operation of operations) {
      currentWeight += operation.weight;
      if (random <= currentWeight) {
        return operation;
      }
    }

    return operations[operations.length - 1];
  }

  public async runLoadTest(config: LoadTestConfig): Promise<LoadTestSummary> {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }

    this.isRunning = true;
    this.results = [];

    // Initialize memory tracking
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in window.performance
    ) {
      const memory = (window.performance as any).memory;
      this.startMemory = memory.usedJSHeapSize;
      this.peakMemory = this.startMemory;
    }

    const operations =
      config.operations.length > 0
        ? config.operations
        : this.createDefaultOperations(config);

    try {
      // Ramp up phase
      const rampUpOperations: Promise<LoadTestResult>[] = [];
      const rampUpInterval = config.rampUpTime / config.concurrentUsers;

      for (let i = 0; i < config.concurrentUsers; i++) {
        setTimeout(() => {
          this.runUserSimulation(
            operations,
            config.testDuration - i * rampUpInterval,
          ).then((results) => {
            this.results.push(...results);
          });
        }, i * rampUpInterval);
      }

      // Wait for test completion
      await new Promise((resolve) => {
        setTimeout(resolve, config.testDuration + config.rampUpTime + 1000);
      });

      return this.generateSummary();
    } finally {
      this.isRunning = false;
    }
  }

  private async runUserSimulation(
    operations: LoadTestOperation[],
    duration: number,
  ): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      const operation = this.selectRandomOperation(operations);
      try {
        const result = await operation.operation();
        results.push(result);
      } catch (error) {
        results.push({
          operationName: operation.name,
          startTime: performance.now(),
          endTime: performance.now(),
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Random think time between operations
      const thinkTime = Math.random() * 1000 + 100; // 100ms - 1.1s
      await new Promise((resolve) => setTimeout(resolve, thinkTime));
    }

    return results;
  }

  private generateSummary(): LoadTestSummary {
    const successfulResults = this.results.filter((r) => r.success);
    const failedResults = this.results.filter((r) => !r.success);

    const durations = successfulResults
      .map((r) => r.duration)
      .sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    const percentile95Index = Math.floor(durations.length * 0.95);
    const percentile99Index = Math.floor(durations.length * 0.99);

    const operationBreakdown: Record<
      string,
      { count: number; averageTime: number; errorCount: number }
    > = {};
    const deviceTypeBreakdown: Record<
      string,
      { count: number; averageTime: number }
    > = {};

    // Calculate operation breakdown
    for (const result of this.results) {
      if (!operationBreakdown[result.operationName]) {
        operationBreakdown[result.operationName] = {
          count: 0,
          averageTime: 0,
          errorCount: 0,
        };
      }
      operationBreakdown[result.operationName].count++;
      if (result.success) {
        operationBreakdown[result.operationName].averageTime += result.duration;
      } else {
        operationBreakdown[result.operationName].errorCount++;
      }
    }

    // Calculate averages for operations
    for (const [name, data] of Object.entries(operationBreakdown)) {
      const successCount = data.count - data.errorCount;
      data.averageTime = successCount > 0 ? data.averageTime / successCount : 0;
    }

    // Calculate device type breakdown
    for (const result of successfulResults) {
      if (result.deviceType) {
        if (!deviceTypeBreakdown[result.deviceType]) {
          deviceTypeBreakdown[result.deviceType] = { count: 0, averageTime: 0 };
        }
        deviceTypeBreakdown[result.deviceType].count++;
        deviceTypeBreakdown[result.deviceType].averageTime += result.duration;
      }
    }

    // Calculate averages for device types
    for (const [device, data] of Object.entries(deviceTypeBreakdown)) {
      data.averageTime = data.count > 0 ? data.averageTime / data.count : 0;
    }

    const endMemory =
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in window.performance
        ? (window.performance as any).memory.usedJSHeapSize
        : 0;

    return {
      totalOperations: this.results.length,
      successfulOperations: successfulResults.length,
      failedOperations: failedResults.length,
      averageResponseTime:
        successfulResults.length > 0
          ? totalDuration / successfulResults.length
          : 0,
      percentile95ResponseTime: durations[percentile95Index] || 0,
      percentile99ResponseTime: durations[percentile99Index] || 0,
      operationsPerSecond: 0, // Calculate based on actual test duration
      errorRate: (failedResults.length / this.results.length) * 100,
      slowestOperations: successfulResults
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      fastestOperations: successfulResults
        .sort((a, b) => a.duration - b.duration)
        .slice(0, 10),
      operationBreakdown,
      deviceTypeBreakdown,
      memoryUsage: {
        start: this.startMemory,
        peak: this.peakMemory,
        end: endMemory,
      },
    };
  }

  public getResults(): LoadTestResult[] {
    return [...this.results];
  }

  public isTestRunning(): boolean {
    return this.isRunning;
  }

  public clearResults(): void {
    if (!this.isRunning) {
      this.results = [];
    }
  }
}

// Predefined load test configurations
export const LOAD_TEST_CONFIGS = {
  light: {
    concurrentUsers: 10,
    testDuration: 30000, // 30 seconds
    rampUpTime: 5000, // 5 seconds
    chartTypes: ['line', 'bar'],
    dataSizes: ['small', 'medium'],
    deviceTypes: ['desktop', 'tablet'],
    operations: [],
  } as LoadTestConfig,

  moderate: {
    concurrentUsers: 25,
    testDuration: 60000, // 1 minute
    rampUpTime: 10000, // 10 seconds
    chartTypes: ['line', 'bar', 'area'],
    dataSizes: ['small', 'medium', 'large'],
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    operations: [],
  } as LoadTestConfig,

  heavy: {
    concurrentUsers: 50,
    testDuration: 120000, // 2 minutes
    rampUpTime: 20000, // 20 seconds
    chartTypes: ['line', 'bar', 'area', 'pie'],
    dataSizes: ['medium', 'large', 'xlarge'],
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    operations: [],
  } as LoadTestConfig,

  weddingPeak: {
    concurrentUsers: 100,
    testDuration: 300000, // 5 minutes
    rampUpTime: 30000, // 30 seconds
    chartTypes: ['line', 'bar', 'area', 'pie'],
    dataSizes: ['small', 'medium', 'large', 'xlarge'],
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    operations: [],
  } as LoadTestConfig,
};

// Global instance
const chartLoadTester = new ChartLoadTester();

// React hook for load testing
export const useChartLoadTester = () => {
  return {
    runLoadTest: (config: LoadTestConfig) =>
      chartLoadTester.runLoadTest(config),
    isTestRunning: () => chartLoadTester.isTestRunning(),
    getResults: () => chartLoadTester.getResults(),
    clearResults: () => chartLoadTester.clearResults(),
  };
};

export { ChartLoadTester, chartLoadTester };
export type {
  LoadTestConfig,
  LoadTestOperation,
  LoadTestResult,
  LoadTestSummary,
};
