// Notification Worker System
// Central export point for all notification processing workers

export { NotificationQueueWorker } from './NotificationQueueWorker';
export { NotificationAnalyticsWorker } from './NotificationAnalyticsWorker';
export { NotificationWorkerCoordinator } from './NotificationWorkerCoordinator';

// Worker management utilities
export type WorkerType = 'queue' | 'analytics' | 'coordinator';

export interface WorkerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  workers: {
    queue: {
      concurrency: Record<string, number>;
      maxRetries: number;
      retryDelay: number;
    };
    analytics: {
      batchSize: number;
      batchTimeout: number;
    };
  };
}

export const defaultWorkerConfig: WorkerConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  workers: {
    queue: {
      concurrency: {
        email: 10,
        sms: 15,
        push: 20,
        voice: 5,
        webhook: 8,
        in_app: 25,
        emergency: 20,
        batch: 5,
        retry: 10,
        dead_letter: 2,
      },
      maxRetries: 5,
      retryDelay: 1000,
    },
    analytics: {
      batchSize: 100,
      batchTimeout: 30000,
    },
  },
};

// Helper function to create and start all workers
export async function startNotificationSystem(
  config?: Partial<WorkerConfig>,
): Promise<NotificationWorkerCoordinator> {
  const coordinator = new NotificationWorkerCoordinator();
  await coordinator.start();
  return coordinator;
}

// Helper function for graceful shutdown
export async function shutdownNotificationSystem(
  coordinator: NotificationWorkerCoordinator,
): Promise<void> {
  await coordinator.shutdown();
}

// Health check utilities
export interface SystemStatus {
  healthy: boolean;
  workers: Record<WorkerType, boolean>;
  redis: boolean;
  uptime: number;
}

export async function checkSystemHealth(
  coordinator: NotificationWorkerCoordinator,
): Promise<SystemStatus> {
  const health = await coordinator.getSystemHealth();

  return {
    healthy: health.overall === 'healthy',
    workers: {
      queue:
        health.workers.find((w) => w.name === 'queue')?.status === 'healthy' ||
        false,
      analytics:
        health.workers.find((w) => w.name === 'analytics')?.status ===
          'healthy' || false,
      coordinator: health.overall !== 'down',
    } as Record<WorkerType, boolean>,
    redis: health.redis,
    uptime: Date.now() - new Date(health.lastHealthCheck).getTime(),
  };
}

// Export types for external use
export type {
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

// Wedding-specific worker utilities
export class WeddingWorkerUtils {
  static getEmergencyPriority(): 'emergency' {
    return 'emergency';
  }

  static getWeddingDayChannels(): string[] {
    return ['voice', 'sms', 'push', 'in_app', 'email'];
  }

  static calculateWeddingUrgency(
    weddingDate: string,
  ): 'emergency' | 'high' | 'medium' | 'low' {
    const wedding = new Date(weddingDate);
    const now = new Date();
    const daysUntilWedding = Math.ceil(
      (wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding === 0) return 'emergency'; // Wedding day
    if (daysUntilWedding <= 1) return 'high'; // Day before
    if (daysUntilWedding <= 7) return 'high'; // Week before
    if (daysUntilWedding <= 30) return 'medium'; // Month before
    return 'low'; // More than month
  }

  static isWeddingDay(weddingDate: string): boolean {
    const wedding = new Date(weddingDate);
    const now = new Date();
    return wedding.toDateString() === now.toDateString();
  }

  static getWeekendRestrictions(): {
    allowDeployments: boolean;
    emergencyOnly: boolean;
  } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    return {
      allowDeployments: dayOfWeek !== 6, // No deployments on Saturday
      emergencyOnly: dayOfWeek === 6, // Saturday is emergency-only
    };
  }
}

// Monitoring and alerts
export interface WorkerAlert {
  type: 'error' | 'warning' | 'info';
  worker: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class WorkerMonitoring {
  private static alerts: WorkerAlert[] = [];

  static addAlert(alert: Omit<WorkerAlert, 'timestamp'>): void {
    this.alerts.push({
      ...alert,
      timestamp: new Date(),
    });

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log critical alerts
    if (alert.type === 'error') {
      console.error(
        `🚨 Worker Alert [${alert.worker}]: ${alert.message}`,
        alert.metadata,
      );
    } else if (alert.type === 'warning') {
      console.warn(
        `⚠️ Worker Alert [${alert.worker}]: ${alert.message}`,
        alert.metadata,
      );
    }
  }

  static getAlerts(filter?: {
    type?: 'error' | 'warning' | 'info';
    worker?: string;
    since?: Date;
  }): WorkerAlert[] {
    let filtered = this.alerts;

    if (filter?.type) {
      filtered = filtered.filter((a) => a.type === filter.type);
    }

    if (filter?.worker) {
      filtered = filtered.filter((a) => a.worker === filter.worker);
    }

    if (filter?.since) {
      filtered = filtered.filter((a) => a.timestamp >= filter.since!);
    }

    return filtered;
  }

  static clearAlerts(): void {
    this.alerts = [];
  }
}

// Performance utilities
export class WorkerPerformance {
  static measureExecutionTime<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve, reject) => {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        resolve({ result, duration });
      } catch (error) {
        reject(error);
      }
    });
  }

  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>();

    return {
      isAllowed: (key: string): boolean => {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!requests.has(key)) {
          requests.set(key, [now]);
          return true;
        }

        const keyRequests = requests
          .get(key)!
          .filter((time) => time > windowStart);

        if (keyRequests.length < maxRequests) {
          keyRequests.push(now);
          requests.set(key, keyRequests);
          return true;
        }

        return false;
      },
      reset: (key?: string): void => {
        if (key) {
          requests.delete(key);
        } else {
          requests.clear();
        }
      },
    };
  }
}

console.log('📦 Notification Workers module loaded successfully');
