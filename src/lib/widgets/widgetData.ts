'use client';

import { defaultWeddingStats } from '@/components/widgets/QuickStats';
import { defaultRecentActivities } from '@/components/widgets/RecentActivity';

// Data interfaces
export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  location?: string;
  attendees?: number;
  status: 'upcoming' | 'in-progress' | 'completed' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UrgentTask {
  id: string;
  title: string;
  dueDate: string;
  overdueDays?: number;
  assignee?: string;
  client?: string;
  priority: 'high' | 'urgent' | 'critical';
  category: 'vendor' | 'client' | 'planning' | 'documentation' | 'follow-up';
}

export interface Stat {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  target?: number;
}

export interface Activity {
  id: string;
  type:
    | 'message'
    | 'task'
    | 'meeting'
    | 'document'
    | 'email'
    | 'call'
    | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  client?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'completed' | 'pending' | 'in-progress' | 'overdue';
}

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 300000): void {
    // default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Data providers with offline support
export class WidgetDataManager {
  private cache = new DataCache();
  private isOffline = false;

  constructor() {
    this.setupOfflineDetection();
  }

  private setupOfflineDetection() {
    if (typeof window !== 'undefined') {
      this.isOffline = !navigator.onLine;

      window.addEventListener('online', () => {
        this.isOffline = false;
        this.onConnectionChange(true);
      });

      window.addEventListener('offline', () => {
        this.isOffline = true;
        this.onConnectionChange(false);
      });
    }
  }

  private onConnectionChange(isOnline: boolean) {
    if (isOnline) {
      // Refresh critical data when coming back online
      this.cache.clear();
    }
  }

  // Generic data fetcher with offline support
  private async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    fallbackData: T,
    ttl: number = 300000,
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get<T>(key);
    if (cached) return cached;

    // If offline, return fallback data
    if (this.isOffline) {
      return fallbackData;
    }

    try {
      const data = await fetcher();
      this.cache.set(key, data, ttl);

      // Store in localStorage for offline access
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `widget_cache_${key}`,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          }),
        );
      }

      return data;
    } catch (error) {
      console.warn(`Failed to fetch ${key}:`, error);

      // Try to get from localStorage as fallback
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`widget_cache_${key}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            return parsed.data;
          } catch {
            // Ignore parse errors
          }
        }
      }

      return fallbackData;
    }
  }

  // Schedule data
  async getTodaySchedule(): Promise<ScheduleItem[]> {
    const fallbackData: ScheduleItem[] = [
      {
        id: '1',
        title: 'Client consultation - Sarah & Mike',
        time: '10:00 AM',
        location: 'Office',
        attendees: 2,
        status: 'upcoming',
        priority: 'high',
      },
      {
        id: '2',
        title: 'Venue walkthrough',
        time: '2:00 PM',
        location: 'Grand Ballroom',
        attendees: 4,
        status: 'upcoming',
        priority: 'medium',
      },
      {
        id: '3',
        title: 'Vendor coordination call',
        time: '4:30 PM',
        status: 'upcoming',
        priority: 'high',
      },
    ];

    return this.fetchWithCache(
      'today_schedule',
      async () => {
        // In a real app, this would be an API call
        const response = await fetch('/api/schedule/today');
        if (!response.ok) throw new Error('Failed to fetch schedule');
        return response.json();
      },
      fallbackData,
      60000, // 1 minute cache
    );
  }

  // Urgent tasks data
  async getUrgentTasks(): Promise<UrgentTask[]> {
    const fallbackData: UrgentTask[] = [
      {
        id: '1',
        title: 'Finalize menu selection with caterer',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        priority: 'critical',
        category: 'vendor',
        client: 'Sarah & Mike',
        assignee: 'Emma Wilson',
      },
      {
        id: '2',
        title: 'Confirm photographer availability',
        dueDate: new Date().toISOString(), // Today
        priority: 'urgent',
        category: 'vendor',
        client: 'Lisa & David',
      },
      {
        id: '3',
        title: 'Send timeline to venue coordinator',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        priority: 'high',
        category: 'planning',
        client: 'Anna & Tom',
      },
    ];

    return this.fetchWithCache(
      'urgent_tasks',
      async () => {
        const response = await fetch('/api/tasks/urgent');
        if (!response.ok) throw new Error('Failed to fetch urgent tasks');
        return response.json();
      },
      fallbackData,
      30000, // 30 seconds cache
    );
  }

  // Quick stats data
  async getQuickStats(): Promise<Stat[]> {
    return this.fetchWithCache(
      'quick_stats',
      async () => {
        const response = await fetch('/api/analytics/quick-stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
      },
      defaultWeddingStats,
      300000, // 5 minutes cache
    );
  }

  // Recent activity data
  async getRecentActivity(): Promise<Activity[]> {
    return this.fetchWithCache(
      'recent_activity',
      async () => {
        const response = await fetch('/api/activity/recent');
        if (!response.ok) throw new Error('Failed to fetch activity');
        return response.json();
      },
      defaultRecentActivities,
      15000, // 15 seconds cache
    );
  }

  // Weather data (for outdoor weddings)
  async getWeatherData(weddingDate: string, location?: string) {
    const fallbackData = {
      dailyForecast: [],
      hourlyForecast: [],
    };

    return this.fetchWithCache(
      `weather_${weddingDate}_${location || 'default'}`,
      async () => {
        const params = new URLSearchParams({
          date: weddingDate,
          ...(location && { location }),
        });

        const response = await fetch(`/api/weather?${params}`);
        if (!response.ok) throw new Error('Failed to fetch weather');
        return response.json();
      },
      fallbackData,
      1800000, // 30 minutes cache
    );
  }

  // Vendor status data
  async getVendorStatus() {
    const fallbackData = {
      confirmed: 8,
      pending: 3,
      issues: 1,
    };

    return this.fetchWithCache(
      'vendor_status',
      async () => {
        const response = await fetch('/api/vendors/status');
        if (!response.ok) throw new Error('Failed to fetch vendor status');
        return response.json();
      },
      fallbackData,
      300000, // 5 minutes cache
    );
  }

  // Performance monitoring
  getPerformanceMetrics() {
    const performance = window.performance;

    return {
      cacheHits: Array.from(this.cache['cache'].keys()).length,
      isOffline: this.isOffline,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      memoryUsage: (performance as any).memory
        ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
          }
        : null,
    };
  }

  // Cache management methods
  clearCache() {
    this.cache.clear();
  }

  preloadData() {
    // Preload critical data
    Promise.all([
      this.getTodaySchedule(),
      this.getUrgentTasks(),
      this.getQuickStats(),
      this.getRecentActivity(),
    ]).catch((error) => {
      console.warn('Failed to preload some widget data:', error);
    });
  }

  // Real-time updates simulation
  enableRealTimeUpdates(callback: (type: string, data: any) => void) {
    if (this.isOffline) return;

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(async () => {
      try {
        // Force refresh urgent tasks as they change frequently
        this.cache.set('urgent_tasks', null, 0); // Expire immediately
        const urgentTasks = await this.getUrgentTasks();
        callback('urgent_tasks', urgentTasks);

        // Refresh activity every minute
        if (Math.random() > 0.5) {
          this.cache.set('recent_activity', null, 0);
          const activity = await this.getRecentActivity();
          callback('recent_activity', activity);
        }
      } catch (error) {
        console.warn('Real-time update failed:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }
}

// Singleton instance
export const widgetDataManager = new WidgetDataManager();

// React hook for widget data
export function useWidgetData() {
  return {
    getTodaySchedule:
      widgetDataManager.getTodaySchedule.bind(widgetDataManager),
    getUrgentTasks: widgetDataManager.getUrgentTasks.bind(widgetDataManager),
    getQuickStats: widgetDataManager.getQuickStats.bind(widgetDataManager),
    getRecentActivity:
      widgetDataManager.getRecentActivity.bind(widgetDataManager),
    getWeatherData: widgetDataManager.getWeatherData.bind(widgetDataManager),
    getVendorStatus: widgetDataManager.getVendorStatus.bind(widgetDataManager),
    clearCache: widgetDataManager.clearCache.bind(widgetDataManager),
    preloadData: widgetDataManager.preloadData.bind(widgetDataManager),
    enableRealTimeUpdates:
      widgetDataManager.enableRealTimeUpdates.bind(widgetDataManager),
    getPerformanceMetrics:
      widgetDataManager.getPerformanceMetrics.bind(widgetDataManager),
  };
}
