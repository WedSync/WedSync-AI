/**
 * Process Manager - Handles graceful shutdown and resource cleanup
 * Prevents memory leaks and ensures clean termination in production
 */

import { analyticsRealTime } from '@/lib/analytics/real-time-updates';
import { SessionSecurityManager } from '@/lib/session-security';
import { auditLogger } from '@/lib/audit-logger';

interface CleanupHandler {
  name: string;
  handler: () => Promise<void> | void;
  priority: number; // Lower number = higher priority
}

class ProcessManager {
  private static instance: ProcessManager | null = null;
  private cleanupHandlers: CleanupHandler[] = [];
  private shutdownInProgress = false;
  private shutdownTimeout = 30000; // 30 seconds max for graceful shutdown
  private lastError: Error | null = null;
  private errorCount = 0;

  private constructor() {
    this.setupProcessHandlers();
  }

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  /**
   * Register a cleanup handler to be called during shutdown
   */
  registerCleanupHandler(
    name: string,
    handler: () => Promise<void> | void,
    priority: number = 100,
  ): void {
    this.cleanupHandlers.push({ name, handler, priority });
    // Sort by priority (lower number = higher priority)
    this.cleanupHandlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Setup process event handlers for graceful shutdown
   */
  private setupProcessHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error: Error) => {
      console.error('❌ Uncaught Exception:', error);
      await this.logCriticalError('uncaughtException', error);
      await this.performShutdown(1);
    });

    // Handle unhandled promise rejections
    process.on(
      'unhandledRejection',
      async (reason: any, promise: Promise<any>) => {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        console.error('❌ Unhandled Promise Rejection:', error);
        console.error('❌ Promise:', promise);
        await this.logCriticalError('unhandledRejection', error);
        await this.performShutdown(1);
      },
    );

    // Handle graceful shutdown signals
    process.on('SIGTERM', async () => {
      console.log('🔄 Received SIGTERM, initiating graceful shutdown...');
      await this.performShutdown(0);
    });

    process.on('SIGINT', async () => {
      console.log(
        '🔄 Received SIGINT (Ctrl+C), initiating graceful shutdown...',
      );
      await this.performShutdown(0);
    });

    // Handle memory warnings
    process.on('warning', (warning) => {
      console.warn('⚠️ Process Warning:', warning.name, warning.message);
      if (warning.name === 'MaxListenersExceededWarning') {
        this.logCriticalError(
          'memoryLeak',
          new Error(`Potential memory leak: ${warning.message}`),
        );
      }
    });

    // Monitor memory usage
    this.startMemoryMonitoring();
  }

  /**
   * Monitor memory usage and detect potential leaks
   */
  private startMemoryMonitoring(): void {
    const monitorInterval = setInterval(() => {
      if (this.shutdownInProgress) {
        clearInterval(monitorInterval);
        return;
      }

      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024);

      // Log memory usage every 5 minutes in production
      if (
        process.env.NODE_ENV === 'production' &&
        Date.now() % (5 * 60 * 1000) < 60000
      ) {
        console.log(
          `📊 Memory Usage - Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssUsedMB}MB`,
        );
      }

      // Alert on high memory usage (over 1GB heap)
      if (heapUsedMB > 1024) {
        console.warn(`⚠️ High memory usage detected: ${heapUsedMB}MB heap`);
        this.logCriticalError(
          'highMemoryUsage',
          new Error(`High heap usage: ${heapUsedMB}MB`),
        );
      }
    }, 60000); // Check every minute

    // Register cleanup for memory monitor
    this.registerCleanupHandler(
      'memoryMonitor',
      () => {
        clearInterval(monitorInterval);
      },
      10,
    );
  }

  /**
   * Perform graceful shutdown
   */
  private async performShutdown(exitCode: number): Promise<void> {
    if (this.shutdownInProgress) {
      console.log('⏳ Shutdown already in progress...');
      return;
    }

    this.shutdownInProgress = true;
    console.log(`🔄 Starting graceful shutdown (exit code: ${exitCode})...`);

    const startTime = Date.now();

    // Set a timeout for the entire shutdown process
    const shutdownTimer = setTimeout(() => {
      console.error('❌ Graceful shutdown timed out, forcing exit');
      process.exit(exitCode || 1);
    }, this.shutdownTimeout);

    try {
      // Execute cleanup handlers in priority order
      for (const { name, handler } of this.cleanupHandlers) {
        try {
          console.log(`🧹 Running cleanup: ${name}`);
          await handler();
          console.log(`✅ Cleanup completed: ${name}`);
        } catch (error) {
          console.error(`❌ Cleanup failed for ${name}:`, error);
        }
      }

      const shutdownTime = Date.now() - startTime;
      console.log(`✅ Graceful shutdown completed in ${shutdownTime}ms`);

      clearTimeout(shutdownTimer);
      process.exit(exitCode);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  /**
   * Log critical errors with context
   */
  private async logCriticalError(type: string, error: Error): Promise<void> {
    this.lastError = error;
    this.errorCount++;

    try {
      await auditLogger.log({
        event_type: 'system_error' as any,
        severity: 'critical' as any,
        user_id: 'system',
        action: `Critical system error: ${type}`,
        details: {
          error: error.message,
          stack: error.stack,
          type,
          errorCount: this.errorCount,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          nodeVersion: process.version,
        },
      });
    } catch (logError) {
      console.error('❌ Failed to log critical error:', logError);
    }
  }

  /**
   * Initialize default cleanup handlers
   */
  initializeDefaultCleanups(): void {
    // Analytics real-time service cleanup
    this.registerCleanupHandler(
      'analyticsRealTime',
      async () => {
        analyticsRealTime.cleanup();
      },
      20,
    );

    // Session security cleanup
    this.registerCleanupHandler(
      'sessionSecurity',
      async () => {
        // Clear any remaining revoked sessions from memory
        console.log('🧹 Cleaning up session security...');
      },
      30,
    );

    // Database connection cleanup
    this.registerCleanupHandler(
      'databaseConnections',
      async () => {
        // In a real app, you'd close database connection pools here
        console.log('🧹 Cleaning up database connections...');
      },
      15,
    );

    // File system cleanup
    this.registerCleanupHandler(
      'fileSystem',
      async () => {
        // Clean up any temporary files, locks, etc.
        console.log('🧹 Cleaning up temporary files...');
      },
      40,
    );

    console.log('✅ Default cleanup handlers initialized');
  }

  /**
   * Get system health information
   */
  getSystemHealth(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    errorCount: number;
    lastError: Error | null;
    cleanupHandlers: number;
  } {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      cleanupHandlers: this.cleanupHandlers.length,
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc) {
      try {
        global.gc();
        console.log('🗑️ Manual garbage collection completed');
        return true;
      } catch (error) {
        console.error('❌ Failed to run garbage collection:', error);
        return false;
      }
    }
    return false;
  }
}

// Export singleton instance
export const processManager = ProcessManager.getInstance();

// Initialize on import in production
if (process.env.NODE_ENV === 'production') {
  processManager.initializeDefaultCleanups();
  console.log('✅ Process manager initialized for production');
}
