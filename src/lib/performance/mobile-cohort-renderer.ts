export interface ScreenDimensions {
  width: number;
  height: number;
  devicePixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface CohortData {
  id: string;
  timestamp: Date;
  value: number;
  category: string;
  metadata: Record<string, any>;
}

export interface MobileOptimizedHeatmap {
  renderData: ProcessedCohortData[];
  touchZones: TouchZone[];
  renderingStrategy: RenderingStrategy;
  performanceMetrics: RenderingPerformanceMetrics;
  interactionHandlers: InteractionHandler[];
}

export interface ProcessedCohortData {
  x: number;
  y: number;
  value: number;
  normalizedValue: number;
  color: string;
  touchRadius: number;
  label: string;
}

export interface TouchZone {
  x: number;
  y: number;
  width: number;
  height: number;
  minTouchSize: number;
  data: CohortData;
  interactive: boolean;
}

export interface RenderingStrategy {
  type: 'canvas' | 'svg' | 'webgl' | 'hybrid';
  useWebWorker: boolean;
  progressiveRendering: boolean;
  levelOfDetail: boolean;
  compressionLevel: number;
}

export interface RenderingPerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  batteryImpact: 'low' | 'medium' | 'high';
}

export interface InteractionHandler {
  event: 'tap' | 'pinch' | 'pan' | 'longPress';
  handler: (event: TouchEvent, data: CohortData) => void;
  throttleMs: number;
}

export interface NetworkSpeed {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
}

export interface CohortVisualization {
  type: 'heatmap' | 'line' | 'bar' | 'pie';
  data: CohortData[];
  configuration: VisualizationConfig;
  interactionConfig: InteractionConfig;
}

export interface VisualizationConfig {
  responsive: boolean;
  animated: boolean;
  interactive: boolean;
  accessibility: AccessibilityConfig;
  performance: PerformanceConfig;
}

export interface InteractionConfig {
  touchTargetSize: number;
  gestureSupport: string[];
  hapticFeedback: boolean;
  voiceOver: boolean;
}

export interface AccessibilityConfig {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  colorBlind: boolean;
}

export interface PerformanceConfig {
  maxDataPoints: number;
  renderingThreshold: number;
  memoryLimit: number;
  fpsTarget: number;
}

export interface NetworkOptimizedVisualization {
  compressedData: Uint8Array;
  metadata: CompressionMetadata;
  fallbackData: CohortData[];
  streamingEnabled: boolean;
  estimatedLoadTime: number;
}

export interface CompressionMetadata {
  algorithm: 'gzip' | 'brotli' | 'custom';
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface CohortVisualizationElement {
  id: string;
  type: string;
  bounds: DOMRect;
  data: CohortData;
  interactive: boolean;
  touchTargets: TouchTarget[];
}

export interface TouchTarget {
  x: number;
  y: number;
  radius: number;
  priority: number;
}

export class MobileCohortRenderer {
  private canvasContext: CanvasRenderingContext2D | null = null;
  private webWorker: Worker | null = null;
  private touchManager: TouchManager;
  private performanceMonitor: MobilePerformanceMonitor;
  private networkAdapter: NetworkAdapter;

  constructor() {
    this.touchManager = new TouchManager();
    this.performanceMonitor = new MobilePerformanceMonitor();
    this.networkAdapter = new NetworkAdapter();
  }

  async renderMobileHeatmap(
    cohortData: CohortData[],
    screenDimensions: ScreenDimensions,
  ): Promise<MobileOptimizedHeatmap> {
    const startTime = performance.now();

    try {
      // Optimize data for mobile rendering
      const processedData = await this.processDataForMobile(
        cohortData,
        screenDimensions,
      );

      // Calculate optimal touch zones
      const touchZones = this.calculateTouchZones(
        processedData,
        screenDimensions,
      );

      // Determine rendering strategy based on device capabilities
      const renderingStrategy = this.determineRenderingStrategy(
        cohortData.length,
        screenDimensions,
      );

      // Create interaction handlers optimized for mobile
      const interactionHandlers =
        this.createMobileInteractionHandlers(touchZones);

      // Monitor performance during rendering
      const performanceMetrics = await this.measureRenderingPerformance(
        startTime,
        renderingStrategy,
      );

      return {
        renderData: processedData,
        touchZones,
        renderingStrategy,
        performanceMetrics,
        interactionHandlers,
      };
    } catch (error) {
      console.error('Mobile heatmap rendering failed:', error);
      throw new Error(`Failed to render mobile heatmap: ${error.message}`);
    }
  }

  async optimizeForNetworkConditions(
    cohortVisualization: CohortVisualization,
    networkSpeed: NetworkSpeed,
  ): Promise<NetworkOptimizedVisualization> {
    try {
      // Determine optimization level based on network speed
      const optimizationLevel = this.getOptimizationLevel(networkSpeed);

      // Compress data based on network conditions
      const compressionResult = await this.compressVisualizationData(
        cohortVisualization.data,
        optimizationLevel,
      );

      // Create fallback data for poor connections
      const fallbackData = this.createFallbackData(
        cohortVisualization.data,
        optimizationLevel,
      );

      // Estimate load time based on network conditions
      const estimatedLoadTime = this.estimateLoadTime(
        compressionResult.compressedData.length,
        networkSpeed,
      );

      return {
        compressedData: compressionResult.compressedData,
        metadata: compressionResult.metadata,
        fallbackData,
        streamingEnabled: networkSpeed.effectiveType === '4g',
        estimatedLoadTime,
      };
    } catch (error) {
      console.error('Network optimization failed:', error);
      throw new Error(
        `Failed to optimize for network conditions: ${error.message}`,
      );
    }
  }

  private async handleTouchInteractions(
    touchEvent: TouchEvent,
    cohortElement: CohortVisualizationElement,
  ): Promise<void> {
    const touch = touchEvent.touches[0];
    const elementBounds = cohortElement.bounds;

    // Check if touch is within element bounds
    const isWithinBounds = this.isPointInBounds(
      { x: touch.clientX, y: touch.clientY },
      elementBounds,
    );

    if (!isWithinBounds) return;

    try {
      // Find the closest touch target
      const closestTarget = this.findClosestTouchTarget(
        { x: touch.clientX, y: touch.clientY },
        cohortElement.touchTargets,
      );

      if (!closestTarget) return;

      // Handle different touch gestures
      switch (touchEvent.type) {
        case 'touchstart':
          await this.handleTouchStart(touch, cohortElement);
          break;
        case 'touchmove':
          await this.handleTouchMove(touch, cohortElement);
          break;
        case 'touchend':
          await this.handleTouchEnd(touch, cohortElement);
          break;
      }

      // Provide haptic feedback if supported
      if ('vibrate' in navigator && cohortElement.interactive) {
        navigator.vibrate(50); // Short vibration
      }
    } catch (error) {
      console.error('Touch interaction handling failed:', error);
    }
  }

  private async processDataForMobile(
    data: CohortData[],
    screenDimensions: ScreenDimensions,
  ): Promise<ProcessedCohortData[]> {
    const maxDataPoints = this.calculateMaxDataPoints(screenDimensions);

    // Sample data if too large for mobile
    const sampledData =
      data.length > maxDataPoints ? this.sampleData(data, maxDataPoints) : data;

    // Process each data point for mobile optimization
    return sampledData.map((item, index) => {
      const position = this.calculatePosition(
        item,
        index,
        sampledData.length,
        screenDimensions,
      );
      const normalizedValue = this.normalizeValue(item.value, sampledData);

      return {
        x: position.x,
        y: position.y,
        value: item.value,
        normalizedValue,
        color: this.getColorForValue(normalizedValue),
        touchRadius: this.calculateTouchRadius(screenDimensions),
        label: this.formatLabel(item),
      };
    });
  }

  private calculateTouchZones(
    processedData: ProcessedCohortData[],
    screenDimensions: ScreenDimensions,
  ): TouchZone[] {
    const minTouchSize = Math.max(44, screenDimensions.width * 0.05); // 44px minimum or 5% of screen width

    return processedData.map((dataPoint) => ({
      x: dataPoint.x - minTouchSize / 2,
      y: dataPoint.y - minTouchSize / 2,
      width: minTouchSize,
      height: minTouchSize,
      minTouchSize,
      data: {
        id: `${dataPoint.x}_${dataPoint.y}`,
        timestamp: new Date(),
        value: dataPoint.value,
        category: 'processed',
        metadata: { normalizedValue: dataPoint.normalizedValue },
      },
      interactive: true,
    }));
  }

  private determineRenderingStrategy(
    dataPointCount: number,
    screenDimensions: ScreenDimensions,
  ): RenderingStrategy {
    const deviceCapability = this.assessDeviceCapability(screenDimensions);

    let strategy: RenderingStrategy = {
      type: 'canvas',
      useWebWorker: false,
      progressiveRendering: false,
      levelOfDetail: false,
      compressionLevel: 0,
    };

    if (dataPointCount > 10000) {
      strategy.type = 'webgl';
      strategy.useWebWorker = true;
      strategy.progressiveRendering = true;
      strategy.levelOfDetail = true;
      strategy.compressionLevel = 0.8;
    } else if (dataPointCount > 1000) {
      strategy.type = 'canvas';
      strategy.useWebWorker = deviceCapability === 'high';
      strategy.progressiveRendering = true;
      strategy.compressionLevel = 0.5;
    } else {
      strategy.type = 'svg';
      strategy.compressionLevel = 0.2;
    }

    return strategy;
  }

  private createMobileInteractionHandlers(
    touchZones: TouchZone[],
  ): InteractionHandler[] {
    return [
      {
        event: 'tap',
        handler: this.handleTap.bind(this),
        throttleMs: 100,
      },
      {
        event: 'pinch',
        handler: this.handlePinch.bind(this),
        throttleMs: 16, // 60fps
      },
      {
        event: 'pan',
        handler: this.handlePan.bind(this),
        throttleMs: 16, // 60fps
      },
      {
        event: 'longPress',
        handler: this.handleLongPress.bind(this),
        throttleMs: 500,
      },
    ];
  }

  private async measureRenderingPerformance(
    startTime: number,
    strategy: RenderingStrategy,
  ): Promise<RenderingPerformanceMetrics> {
    const renderTime = performance.now() - startTime;
    const memoryUsage = this.estimateMemoryUsage(strategy);
    const frameRate = this.calculateFrameRate();
    const batteryImpact = this.assessBatteryImpact(strategy);

    return {
      renderTime,
      memoryUsage,
      frameRate,
      batteryImpact,
    };
  }

  private getOptimizationLevel(networkSpeed: NetworkSpeed): number {
    switch (networkSpeed.effectiveType) {
      case '4g':
        return 0.2; // Light optimization
      case '3g':
        return 0.5; // Medium optimization
      case '2g':
        return 0.8; // Heavy optimization
      case 'slow-2g':
        return 0.9; // Maximum optimization
      default:
        return 0.5;
    }
  }

  private async compressVisualizationData(
    data: CohortData[],
    compressionLevel: number,
  ): Promise<{ compressedData: Uint8Array; metadata: CompressionMetadata }> {
    const originalData = JSON.stringify(data);
    const originalSize = new Blob([originalData]).size;

    // Simple compression simulation (in real implementation, use actual compression)
    const compressionRatio = 1 - compressionLevel;
    const compressedSize = Math.floor(originalSize * compressionRatio);
    const compressedData = new Uint8Array(compressedSize);

    const metadata: CompressionMetadata = {
      algorithm: compressionLevel > 0.7 ? 'brotli' : 'gzip',
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
    };

    return { compressedData, metadata };
  }

  private createFallbackData(
    data: CohortData[],
    optimizationLevel: number,
  ): CohortData[] {
    const fallbackSize = Math.max(
      10,
      Math.floor(data.length * (1 - optimizationLevel)),
    );
    return this.sampleData(data, fallbackSize);
  }

  private estimateLoadTime(
    dataSize: number,
    networkSpeed: NetworkSpeed,
  ): number {
    // Estimate based on network speed (in seconds)
    const bytesPerSecond = (networkSpeed.downlink * 1000000) / 8; // Convert Mbps to bytes/s
    return (dataSize / bytesPerSecond) * 1000; // Convert to milliseconds
  }

  // Utility methods
  private calculateMaxDataPoints(screenDimensions: ScreenDimensions): number {
    const pixelCount = screenDimensions.width * screenDimensions.height;
    return Math.min(10000, Math.floor(pixelCount / 100)); // Max 10k points, or 1 point per 100 pixels
  }

  private sampleData(data: CohortData[], targetSize: number): CohortData[] {
    if (data.length <= targetSize) return data;

    const step = Math.floor(data.length / targetSize);
    return data.filter((_, index) => index % step === 0).slice(0, targetSize);
  }

  private calculatePosition(
    item: CohortData,
    index: number,
    totalItems: number,
    screenDimensions: ScreenDimensions,
  ): { x: number; y: number } {
    // Simple grid layout - can be enhanced with more sophisticated positioning
    const cols = Math.ceil(Math.sqrt(totalItems));
    const rows = Math.ceil(totalItems / cols);

    const col = index % cols;
    const row = Math.floor(index / cols);

    const cellWidth = screenDimensions.viewportWidth / cols;
    const cellHeight = screenDimensions.viewportHeight / rows;

    return {
      x: col * cellWidth + cellWidth / 2,
      y: row * cellHeight + cellHeight / 2,
    };
  }

  private normalizeValue(value: number, allData: CohortData[]): number {
    const values = allData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return max > min ? (value - min) / (max - min) : 0.5;
  }

  private getColorForValue(normalizedValue: number): string {
    // Color interpolation from blue (low) to red (high)
    const hue = (1 - normalizedValue) * 240; // Blue=240, Red=0
    return `hsl(${hue}, 70%, 50%)`;
  }

  private calculateTouchRadius(screenDimensions: ScreenDimensions): number {
    return Math.max(22, screenDimensions.width * 0.025); // 22px minimum or 2.5% of screen width
  }

  private formatLabel(item: CohortData): string {
    return `${item.category}: ${item.value.toFixed(2)}`;
  }

  private assessDeviceCapability(
    screenDimensions: ScreenDimensions,
  ): 'low' | 'medium' | 'high' {
    const pixelCount = screenDimensions.width * screenDimensions.height;
    const devicePixelRatio = screenDimensions.devicePixelRatio;

    if (pixelCount > 2000000 && devicePixelRatio > 2) return 'high';
    if (pixelCount > 1000000) return 'medium';
    return 'low';
  }

  private isPointInBounds(
    point: { x: number; y: number },
    bounds: DOMRect,
  ): boolean {
    return (
      point.x >= bounds.left &&
      point.x <= bounds.right &&
      point.y >= bounds.top &&
      point.y <= bounds.bottom
    );
  }

  private findClosestTouchTarget(
    point: { x: number; y: number },
    touchTargets: TouchTarget[],
  ): TouchTarget | null {
    let closestTarget: TouchTarget | null = null;
    let minDistance = Infinity;

    for (const target of touchTargets) {
      const distance = Math.sqrt(
        Math.pow(point.x - target.x, 2) + Math.pow(point.y - target.y, 2),
      );

      if (distance <= target.radius && distance < minDistance) {
        minDistance = distance;
        closestTarget = target;
      }
    }

    return closestTarget;
  }

  private estimateMemoryUsage(strategy: RenderingStrategy): number {
    // Rough memory estimation in MB
    let baseMemory = 5; // Base memory usage

    if (strategy.type === 'webgl') baseMemory += 10;
    if (strategy.useWebWorker) baseMemory += 5;
    if (strategy.progressiveRendering) baseMemory += 3;

    return baseMemory;
  }

  private calculateFrameRate(): number {
    // Mock frame rate calculation - in real implementation, measure actual FPS
    return 60;
  }

  private assessBatteryImpact(
    strategy: RenderingStrategy,
  ): 'low' | 'medium' | 'high' {
    if (strategy.type === 'webgl' && strategy.useWebWorker) return 'high';
    if (strategy.type === 'canvas' && strategy.progressiveRendering)
      return 'medium';
    return 'low';
  }

  // Event handlers
  private async handleTap(event: TouchEvent, data: CohortData): Promise<void> {
    console.log('Tap interaction:', data);
  }

  private async handlePinch(
    event: TouchEvent,
    data: CohortData,
  ): Promise<void> {
    console.log('Pinch interaction:', data);
  }

  private async handlePan(event: TouchEvent, data: CohortData): Promise<void> {
    console.log('Pan interaction:', data);
  }

  private async handleLongPress(
    event: TouchEvent,
    data: CohortData,
  ): Promise<void> {
    console.log('Long press interaction:', data);
  }

  private async handleTouchStart(
    touch: Touch,
    element: CohortVisualizationElement,
  ): Promise<void> {
    console.log('Touch start:', element.id);
  }

  private async handleTouchMove(
    touch: Touch,
    element: CohortVisualizationElement,
  ): Promise<void> {
    console.log('Touch move:', element.id);
  }

  private async handleTouchEnd(
    touch: Touch,
    element: CohortVisualizationElement,
  ): Promise<void> {
    console.log('Touch end:', element.id);
  }
}

// Supporting classes (simplified implementations)
class TouchManager {
  // Touch management implementation
}

class MobilePerformanceMonitor {
  // Performance monitoring implementation
}

class NetworkAdapter {
  // Network adaptation implementation
}

export default MobileCohortRenderer;
