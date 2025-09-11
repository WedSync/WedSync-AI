import { TodaySchedule } from '@/components/widgets/TodaySchedule';
import { UrgentTasks } from '@/components/widgets/UrgentTasks';
import { QuickStats } from '@/components/widgets/QuickStats';
import { RecentActivity } from '@/components/widgets/RecentActivity';
import { WeatherForecastWidget } from '@/components/weather/WeatherForecastWidget';

export interface WidgetConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  category: 'schedule' | 'tasks' | 'stats' | 'activity' | 'weather' | 'vendor';
  priority: number;
  minHeight: number;
  supportsCompact: boolean;
  permissions: string[];
  defaultProps: any;
  mobileOptimized: boolean;
  offlineCapable: boolean;
  refreshInterval?: number; // in milliseconds
  description: string;
}

export const WIDGET_CATEGORIES = {
  schedule: {
    label: 'Schedule & Calendar',
    icon: 'Calendar',
    color: 'blue',
  },
  tasks: {
    label: 'Tasks & To-Do',
    icon: 'CheckSquare',
    color: 'green',
  },
  stats: {
    label: 'Analytics & Stats',
    icon: 'BarChart',
    color: 'purple',
  },
  activity: {
    label: 'Recent Activity',
    icon: 'Activity',
    color: 'orange',
  },
  weather: {
    label: 'Weather & Events',
    icon: 'Cloud',
    color: 'cyan',
  },
  vendor: {
    label: 'Vendor Management',
    icon: 'Users',
    color: 'pink',
  },
} as const;

export const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'today-schedule',
    title: "Today's Schedule",
    component: TodaySchedule,
    category: 'schedule',
    priority: 1,
    minHeight: 200,
    supportsCompact: true,
    permissions: ['read:schedule'],
    defaultProps: {
      items: [],
    },
    mobileOptimized: true,
    offlineCapable: true,
    refreshInterval: 60000, // 1 minute
    description: "View and manage today's wedding coordination schedule",
  },
  {
    id: 'urgent-tasks',
    title: 'Urgent Tasks',
    component: UrgentTasks,
    category: 'tasks',
    priority: 2,
    minHeight: 180,
    supportsCompact: true,
    permissions: ['read:tasks'],
    defaultProps: {
      tasks: [],
    },
    mobileOptimized: true,
    offlineCapable: true,
    refreshInterval: 30000, // 30 seconds
    description:
      'Track overdue and high-priority tasks requiring immediate attention',
  },
  {
    id: 'quick-stats',
    title: 'Quick Stats',
    component: QuickStats,
    category: 'stats',
    priority: 3,
    minHeight: 160,
    supportsCompact: true,
    permissions: ['read:analytics'],
    defaultProps: {
      stats: [],
    },
    mobileOptimized: true,
    offlineCapable: true,
    refreshInterval: 300000, // 5 minutes
    description: 'Key business metrics and performance indicators at a glance',
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    component: RecentActivity,
    category: 'activity',
    priority: 4,
    minHeight: 220,
    supportsCompact: true,
    permissions: ['read:activity'],
    defaultProps: {
      activities: [],
      maxItems: 10,
    },
    mobileOptimized: true,
    offlineCapable: false,
    refreshInterval: 15000, // 15 seconds
    description:
      'Latest updates and activities from your wedding coordination workflow',
  },
  {
    id: 'weather-forecast',
    title: 'Weather Forecast',
    component: WeatherForecastWidget,
    category: 'weather',
    priority: 5,
    minHeight: 300,
    supportsCompact: false,
    permissions: ['read:weather'],
    defaultProps: {
      dailyForecast: [],
      hourlyForecast: [],
      weddingDate: new Date().toISOString(),
    },
    mobileOptimized: true,
    offlineCapable: true,
    refreshInterval: 1800000, // 30 minutes
    description: 'Weather forecasts for upcoming outdoor weddings and events',
  },
];

export interface UserWidgetPreferences {
  userId: string;
  enabledWidgets: string[];
  widgetOrder: string[];
  compactMode: boolean;
  autoRefresh: boolean;
  layout: 'grid' | 'list';
  customSettings: Record<string, any>;
}

export const DEFAULT_USER_PREFERENCES: Omit<UserWidgetPreferences, 'userId'> = {
  enabledWidgets: [
    'today-schedule',
    'urgent-tasks',
    'quick-stats',
    'recent-activity',
  ],
  widgetOrder: [
    'today-schedule',
    'urgent-tasks',
    'quick-stats',
    'recent-activity',
  ],
  compactMode: true,
  autoRefresh: true,
  layout: 'grid',
  customSettings: {},
};

export class WidgetConfigManager {
  private configs: Map<string, WidgetConfig> = new Map();
  private userPreferences: Map<string, UserWidgetPreferences> = new Map();

  constructor(configs: WidgetConfig[] = DEFAULT_WIDGET_CONFIGS) {
    this.loadConfigs(configs);
  }

  private loadConfigs(configs: WidgetConfig[]) {
    configs.forEach((config) => {
      this.configs.set(config.id, config);
    });
  }

  // Config management
  getConfig(widgetId: string): WidgetConfig | undefined {
    return this.configs.get(widgetId);
  }

  getAllConfigs(): WidgetConfig[] {
    return Array.from(this.configs.values());
  }

  getConfigsByCategory(category: WidgetConfig['category']): WidgetConfig[] {
    return this.getAllConfigs().filter(
      (config) => config.category === category,
    );
  }

  registerWidget(config: WidgetConfig): void {
    this.configs.set(config.id, config);
  }

  unregisterWidget(widgetId: string): boolean {
    return this.configs.delete(widgetId);
  }

  // User preferences
  getUserPreferences(userId: string): UserWidgetPreferences {
    return (
      this.userPreferences.get(userId) || {
        userId,
        ...DEFAULT_USER_PREFERENCES,
      }
    );
  }

  updateUserPreferences(
    userId: string,
    preferences: Partial<UserWidgetPreferences>,
  ): void {
    const current = this.getUserPreferences(userId);
    this.userPreferences.set(userId, { ...current, ...preferences });
  }

  // Widget filtering and sorting
  getEnabledWidgets(userId: string): WidgetConfig[] {
    const preferences = this.getUserPreferences(userId);
    const enabledConfigs = preferences.enabledWidgets
      .map((id) => this.getConfig(id))
      .filter((config): config is WidgetConfig => config !== undefined);

    // Sort by user preference order, then by priority
    return enabledConfigs.sort((a, b) => {
      const aIndex = preferences.widgetOrder.indexOf(a.id);
      const bIndex = preferences.widgetOrder.indexOf(b.id);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return a.priority - b.priority;
    });
  }

  // Permission checking
  checkWidgetPermissions(widgetId: string, userPermissions: string[]): boolean {
    const config = this.getConfig(widgetId);
    if (!config) return false;

    return config.permissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  // Mobile optimization
  getMobileOptimizedWidgets(userId: string): WidgetConfig[] {
    return this.getEnabledWidgets(userId).filter(
      (config) => config.mobileOptimized,
    );
  }

  getOfflineCapableWidgets(userId: string): WidgetConfig[] {
    return this.getEnabledWidgets(userId).filter(
      (config) => config.offlineCapable,
    );
  }

  // Widget data and props
  getWidgetWithProps(
    widgetId: string,
    customProps: any = {},
  ): {
    config: WidgetConfig;
    props: any;
  } | null {
    const config = this.getConfig(widgetId);
    if (!config) return null;

    return {
      config,
      props: { ...config.defaultProps, ...customProps },
    };
  }

  // Performance utilities
  getRefreshInterval(widgetId: string): number | undefined {
    return this.getConfig(widgetId)?.refreshInterval;
  }

  shouldAutoRefresh(widgetId: string, userId: string): boolean {
    const preferences = this.getUserPreferences(userId);
    const config = this.getConfig(widgetId);

    return preferences.autoRefresh && config?.refreshInterval !== undefined;
  }
}

// Singleton instance
export const widgetConfigManager = new WidgetConfigManager();

// Hook for React components
export function useWidgetConfig() {
  return {
    getConfig: widgetConfigManager.getConfig.bind(widgetConfigManager),
    getAllConfigs: widgetConfigManager.getAllConfigs.bind(widgetConfigManager),
    getConfigsByCategory:
      widgetConfigManager.getConfigsByCategory.bind(widgetConfigManager),
    getUserPreferences:
      widgetConfigManager.getUserPreferences.bind(widgetConfigManager),
    updateUserPreferences:
      widgetConfigManager.updateUserPreferences.bind(widgetConfigManager),
    getEnabledWidgets:
      widgetConfigManager.getEnabledWidgets.bind(widgetConfigManager),
    checkWidgetPermissions:
      widgetConfigManager.checkWidgetPermissions.bind(widgetConfigManager),
  };
}
