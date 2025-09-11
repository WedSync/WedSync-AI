/**
 * Advanced Connection Monitor for Offline/Online Transitions
 * WS-172 Round 3: Sophisticated connectivity detection and handling
 */

import {
  offlineErrorHandler,
  ErrorTypes,
  ErrorSeverity,
} from './offline-error-handler';

export interface ConnectionState {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  saveData: boolean;
  timestamp: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

export interface ConnectionEvent {
  type: 'online' | 'offline' | 'quality-change' | 'type-change';
  previousState: ConnectionState | null;
  currentState: ConnectionState;
  timestamp: string;
  duration?: number; // Time since last state change
}

export type ConnectionEventListener = (event: ConnectionEvent) => void;

export class ConnectionMonitor {
  private currentState: ConnectionState | null = null;
  private listeners: ConnectionEventListener[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private connectivityTests: NodeJS.Timeout[] = [];
  private stateChangeHistory: ConnectionEvent[] = [];
  private isMonitoring = false;

  // Configuration
  private config = {
    monitorInterval: 5000, // Check every 5 seconds
    connectivityTestInterval: 30000, // Test actual connectivity every 30 seconds
    qualityTestInterval: 60000, // Test connection quality every minute
    maxHistoryLength: 50, // Keep last 50 state changes
    testEndpoints: [
      '/api/health',
      '/api/ping',
      'https://httpbin.org/status/200',
    ],
    timeouts: {
      connectivityTest: 10000, // 10 second timeout for connectivity tests
      qualityTest: 5000, // 5 second timeout for quality tests
    },
  };

  constructor() {
    this.initializeState();
    this.setupEventListeners();
  }

  // Initialize connection state
  private async initializeState(): Promise<void> {
    try {
      const initialState = await this.getCurrentConnectionState();
      this.currentState = initialState;

      console.log('Connection monitor initialized:', initialState);
    } catch (error) {
      console.error('Failed to initialize connection state:', error);

      // Fallback to basic state
      this.currentState = {
        isOnline: navigator.onLine,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false,
        timestamp: new Date().toISOString(),
        quality: navigator.onLine ? 'good' : 'offline',
      };
    }
  }

  // Get current connection state
  private async getCurrentConnectionState(): Promise<ConnectionState> {
    const navigator = window.navigator as any;
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    const baseState = {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
      timestamp: new Date().toISOString(),
      quality: 'unknown' as ConnectionState['quality'],
    };

    // Enhance with actual connectivity and quality tests
    if (baseState.isOnline) {
      const connectivityResult = await this.testActualConnectivity();
      const qualityResult = await this.testConnectionQuality();

      baseState.isOnline = connectivityResult.isConnected;
      baseState.quality = this.calculateConnectionQuality(
        baseState,
        qualityResult,
      );
    } else {
      baseState.quality = 'offline';
    }

    return baseState;
  }

  // Test actual connectivity beyond navigator.onLine
  private async testActualConnectivity(
    timeout = this.config.timeouts.connectivityTest,
  ): Promise<{
    isConnected: boolean;
    latency: number;
    endpoint: string | null;
  }> {
    const testPromises = this.config.testEndpoints.map(async (endpoint) => {
      const startTime = performance.now();

      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(timeout),
        });

        const latency = performance.now() - startTime;

        return {
          isConnected: true,
          latency,
          endpoint,
          success: true,
        };
      } catch (error) {
        return {
          isConnected: false,
          latency: timeout,
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    try {
      // Race all connectivity tests, return first successful one
      const results = await Promise.allSettled(testPromises);
      const successfulResult = results
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter(Boolean)
        .find((result) => result!.success);

      if (successfulResult) {
        return {
          isConnected: true,
          latency: successfulResult.latency,
          endpoint: successfulResult.endpoint,
        };
      }

      // All tests failed
      return {
        isConnected: false,
        latency: timeout,
        endpoint: null,
      };
    } catch (error) {
      console.error('Connectivity test failed:', error);
      return {
        isConnected: false,
        latency: timeout,
        endpoint: null,
      };
    }
  }

  // Test connection quality with multiple metrics
  private async testConnectionQuality(samples = 3): Promise<{
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    successRate: number;
    downloadSpeed: number; // Mbps estimate
  }> {
    const testResults: Array<{
      latency: number;
      success: boolean;
      downloadSize: number;
    }> = [];

    for (let i = 0; i < samples; i++) {
      try {
        const startTime = performance.now();

        // Test with a small file to measure download speed
        const response = await fetch('/api/ping?size=1kb', {
          method: 'GET',
          cache: 'no-cache',
          signal: AbortSignal.timeout(this.config.timeouts.qualityTest),
        });

        if (response.ok) {
          const data = await response.blob();
          const endTime = performance.now();
          const latency = endTime - startTime;

          testResults.push({
            latency,
            success: true,
            downloadSize: data.size,
          });
        } else {
          testResults.push({
            latency: this.config.timeouts.qualityTest,
            success: false,
            downloadSize: 0,
          });
        }
      } catch (error) {
        testResults.push({
          latency: this.config.timeouts.qualityTest,
          success: false,
          downloadSize: 0,
        });
      }

      // Small delay between tests
      if (i < samples - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const successfulTests = testResults.filter((result) => result.success);
    const latencies = successfulTests.map((result) => result.latency);

    return {
      averageLatency:
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      successRate:
        testResults.length > 0
          ? successfulTests.length / testResults.length
          : 0,
      downloadSpeed:
        successfulTests.length > 0
          ? this.estimateDownloadSpeed(successfulTests)
          : 0,
    };
  }

  // Estimate download speed from test results
  private estimateDownloadSpeed(
    results: Array<{ latency: number; downloadSize: number }>,
  ): number {
    if (results.length === 0) return 0;

    const totalBytes = results.reduce(
      (sum, result) => sum + result.downloadSize,
      0,
    );
    const totalTime =
      results.reduce((sum, result) => sum + result.latency, 0) / 1000; // Convert to seconds

    if (totalTime === 0) return 0;

    // Convert to Mbps
    const bytesPerSecond = totalBytes / totalTime;
    const bitsPerSecond = bytesPerSecond * 8;
    return bitsPerSecond / (1024 * 1024);
  }

  // Calculate overall connection quality
  private calculateConnectionQuality(
    state: Omit<ConnectionState, 'quality'>,
    qualityTest: {
      averageLatency: number;
      successRate: number;
      downloadSpeed: number;
    },
  ): ConnectionState['quality'] {
    if (!state.isOnline) return 'offline';

    const { averageLatency, successRate, downloadSpeed } = qualityTest;

    // Score based on multiple factors (0-100)
    let score = 0;

    // Latency scoring (40% of total score)
    if (averageLatency <= 50) score += 40;
    else if (averageLatency <= 150) score += 30;
    else if (averageLatency <= 300) score += 20;
    else if (averageLatency <= 600) score += 10;

    // Success rate scoring (30% of total score)
    score += successRate * 30;

    // Download speed scoring (20% of total score)
    if (downloadSpeed >= 10) score += 20;
    else if (downloadSpeed >= 5) score += 15;
    else if (downloadSpeed >= 1) score += 10;
    else if (downloadSpeed >= 0.5) score += 5;

    // Connection type bonus/penalty (10% of total score)
    switch (state.effectiveType) {
      case '4g':
        score += 10;
        break;
      case '3g':
        score += 5;
        break;
      case '2g':
        score += 2;
        break;
      case 'slow-2g':
        score += 0;
        break;
    }

    // Classify quality based on score
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'offline';
  }

  // Start monitoring
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Connection monitoring is already active');
      return;
    }

    this.isMonitoring = true;

    // Regular state monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.checkStateChange();
    }, this.config.monitorInterval);

    // Periodic connectivity tests
    const connectivityTestTimer = setInterval(async () => {
      if (this.currentState?.isOnline) {
        await this.performConnectivityTest();
      }
    }, this.config.connectivityTestInterval);

    // Periodic quality tests
    const qualityTestTimer = setInterval(async () => {
      if (this.currentState?.isOnline && this.currentState.quality !== 'poor') {
        await this.performQualityTest();
      }
    }, this.config.qualityTestInterval);

    this.connectivityTests.push(connectivityTestTimer, qualityTestTimer);

    console.log('Connection monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.connectivityTests.forEach((timer) => clearInterval(timer));
    this.connectivityTests = [];

    console.log('Connection monitoring stopped');
  }

  // Check for state changes
  private async checkStateChange(): Promise<void> {
    try {
      const newState = await this.getCurrentConnectionState();
      const previousState = this.currentState;

      if (!previousState || this.hasStateChanged(previousState, newState)) {
        await this.handleStateChange(previousState, newState);
      }
    } catch (error) {
      console.error('Error checking connection state:', error);

      await offlineErrorHandler.handleError({
        type: ErrorTypes.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Failed to check connection state',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  // Determine if state has changed significantly
  private hasStateChanged(
    oldState: ConnectionState,
    newState: ConnectionState,
  ): boolean {
    return (
      oldState.isOnline !== newState.isOnline ||
      oldState.connectionType !== newState.connectionType ||
      oldState.effectiveType !== newState.effectiveType ||
      oldState.quality !== newState.quality ||
      Math.abs(oldState.downlink - newState.downlink) > 1 || // Significant bandwidth change
      Math.abs(oldState.rtt - newState.rtt) > 50 // Significant latency change
    );
  }

  // Handle state change
  private async handleStateChange(
    previousState: ConnectionState | null,
    newState: ConnectionState,
  ): Promise<void> {
    const eventType = this.determineEventType(previousState, newState);
    const duration = previousState
      ? Date.now() - new Date(previousState.timestamp).getTime()
      : 0;

    const event: ConnectionEvent = {
      type: eventType,
      previousState,
      currentState: newState,
      timestamp: new Date().toISOString(),
      duration,
    };

    // Update current state
    this.currentState = newState;

    // Add to history
    this.stateChangeHistory.push(event);
    if (this.stateChangeHistory.length > this.config.maxHistoryLength) {
      this.stateChangeHistory.shift();
    }

    // Log significant changes
    console.log(`Connection ${eventType}:`, {
      from: previousState?.quality || 'unknown',
      to: newState.quality,
      duration: duration ? `${Math.round(duration / 1000)}s` : 'initial',
    });

    // Handle error conditions
    if (eventType === 'offline') {
      await offlineErrorHandler.handleError({
        type: ErrorTypes.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network connection lost',
        details: { previousState, newState, duration },
        context: { operation: 'connection_monitor' },
      });
    } else if (newState.quality === 'poor') {
      await offlineErrorHandler.handleError({
        type: ErrorTypes.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Poor connection quality detected',
        details: {
          quality: newState.quality,
          rtt: newState.rtt,
          downlink: newState.downlink,
        },
      });
    }

    // Notify listeners
    this.notifyListeners(event);
  }

  // Determine event type based on state changes
  private determineEventType(
    previousState: ConnectionState | null,
    newState: ConnectionState,
  ): ConnectionEvent['type'] {
    if (!previousState) return 'online'; // Initial state

    if (previousState.isOnline && !newState.isOnline) return 'offline';
    if (!previousState.isOnline && newState.isOnline) return 'online';
    if (previousState.connectionType !== newState.connectionType)
      return 'type-change';
    if (previousState.quality !== newState.quality) return 'quality-change';

    return 'quality-change'; // Default for other changes
  }

  // Perform dedicated connectivity test
  private async performConnectivityTest(): Promise<void> {
    try {
      const result = await this.testActualConnectivity();

      if (!result.isConnected && this.currentState?.isOnline) {
        // Connection appears lost despite navigator.onLine being true
        await this.handleStateChange(this.currentState, {
          ...this.currentState,
          isOnline: false,
          quality: 'offline',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Connectivity test failed:', error);
    }
  }

  // Perform dedicated quality test
  private async performQualityTest(): Promise<void> {
    try {
      if (!this.currentState?.isOnline) return;

      const qualityResult = await this.testConnectionQuality();
      const newQuality = this.calculateConnectionQuality(
        this.currentState,
        qualityResult,
      );

      if (newQuality !== this.currentState.quality) {
        await this.handleStateChange(this.currentState, {
          ...this.currentState,
          quality: newQuality,
          rtt: qualityResult.averageLatency,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Quality test failed:', error);
    }
  }

  // Public API methods
  getCurrentState(): ConnectionState | null {
    return this.currentState;
  }

  getConnectionHistory(limit?: number): ConnectionEvent[] {
    return limit
      ? this.stateChangeHistory.slice(-limit)
      : [...this.stateChangeHistory];
  }

  isConnectionStable(windowMinutes = 5): boolean {
    const windowMs = windowMinutes * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;

    const recentEvents = this.stateChangeHistory.filter(
      (event) => new Date(event.timestamp).getTime() > cutoffTime,
    );

    // Connection is stable if there were no offline events in the window
    return !recentEvents.some((event) => event.type === 'offline');
  }

  getAverageQuality(windowMinutes = 15): ConnectionState['quality'] {
    const windowMs = windowMinutes * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;

    const recentEvents = this.stateChangeHistory.filter(
      (event) => new Date(event.timestamp).getTime() > cutoffTime,
    );

    if (recentEvents.length === 0) {
      return this.currentState?.quality || 'unknown';
    }

    // Calculate quality score average
    const qualityScores = recentEvents.map((event) => {
      switch (event.currentState.quality) {
        case 'excellent':
          return 5;
        case 'good':
          return 4;
        case 'fair':
          return 3;
        case 'poor':
          return 2;
        case 'offline':
          return 0;
        default:
          return 2;
      }
    });

    const averageScore =
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    if (averageScore >= 4.5) return 'excellent';
    if (averageScore >= 3.5) return 'good';
    if (averageScore >= 2.5) return 'fair';
    if (averageScore >= 1) return 'poor';
    return 'offline';
  }

  // Event listener management
  addEventListener(listener: ConnectionEventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: ConnectionEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(event: ConnectionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in connection event listener:', error);
      }
    });
  }

  // Setup native event listeners
  private setupEventListeners(): void {
    // Basic online/offline events
    window.addEventListener('online', () => {
      console.log('Browser online event detected');
      this.checkStateChange();
    });

    window.addEventListener('offline', () => {
      console.log('Browser offline event detected');
      this.checkStateChange();
    });

    // Connection change events (if supported)
    const navigator = window.navigator as any;
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => {
        console.log('Network connection changed');
        this.checkStateChange();
      });
    }

    // Page visibility changes (for aggressive testing when tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isMonitoring) {
        setTimeout(() => this.checkStateChange(), 1000);
      }
    });
  }

  // Cleanup
  cleanup(): void {
    this.stopMonitoring();
    this.listeners = [];
    this.stateChangeHistory = [];
    this.currentState = null;

    console.log('Connection monitor cleanup completed');
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitor();

// Start monitoring by default
connectionMonitor.startMonitoring();

// Utility functions
export const ConnectionUtils = {
  isHighQualityConnection: (state: ConnectionState): boolean => {
    return state.isOnline && ['excellent', 'good'].includes(state.quality);
  },

  isLowBandwidthConnection: (state: ConnectionState): boolean => {
    return (
      state.isOnline &&
      (state.saveData ||
        state.effectiveType === 'slow-2g' ||
        state.effectiveType === '2g' ||
        state.downlink < 1)
    );
  },

  shouldReduceActivity: (state: ConnectionState): boolean => {
    return (
      !state.isOnline ||
      state.quality === 'poor' ||
      state.saveData ||
      ConnectionUtils.isLowBandwidthConnection(state)
    );
  },

  getRecommendedSyncInterval: (state: ConnectionState): number => {
    if (!state.isOnline) return 0; // No sync when offline

    switch (state.quality) {
      case 'excellent':
        return 5000; // 5 seconds
      case 'good':
        return 10000; // 10 seconds
      case 'fair':
        return 30000; // 30 seconds
      case 'poor':
        return 60000; // 1 minute
      default:
        return 30000;
    }
  },
};
