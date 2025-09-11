/**
 * Chart Configuration System for WS-224 Progress Charts
 * Comprehensive chart styling, behavior, and wedding industry-specific configurations
 */

// Chart type definitions
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'gauge';
export type DataSource =
  | 'clients'
  | 'forms'
  | 'payments'
  | 'tasks'
  | 'journeys'
  | 'custom';
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
export type MetricCategory =
  | 'wedding_progress'
  | 'client_engagement'
  | 'business_health'
  | 'performance'
  | 'custom';

// Color schemes for wedding industry
export const WEDDING_COLOR_SCHEMES = {
  // Classic Wedding Colors
  classic: {
    primary: '#f8fafc',
    secondary: '#e2e8f0',
    accent: '#f472b6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient: ['#f472b6', '#ec4899', '#db2777'],
  },

  // Romantic Pink & Gold
  romantic: {
    primary: '#fdf2f8',
    secondary: '#fce7f3',
    accent: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4'],
  },

  // Elegant Navy & Gold
  elegant: {
    primary: '#1e3a8a',
    secondary: '#3730a3',
    accent: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient: ['#1e3a8a', '#3730a3', '#4338ca', '#6366f1'],
  },

  // Garden Wedding Green
  garden: {
    primary: '#065f46',
    secondary: '#059669',
    accent: '#f472b6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient: ['#065f46', '#059669', '#10b981', '#34d399'],
  },

  // Beach Wedding Blues
  beach: {
    primary: '#0c4a6e',
    secondary: '#0284c7',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient: ['#0c4a6e', '#0284c7', '#0ea5e9', '#38bdf8'],
  },
};

// Default chart configurations by type
export const DEFAULT_CHART_CONFIGS: Record<ChartType, any> = {
  line: {
    strokeWidth: 2,
    dot: { r: 4, strokeWidth: 2 },
    activeDot: { r: 6, strokeWidth: 2 },
    grid: { strokeDasharray: '3 3' },
    animationDuration: 1000,
    connectNulls: false,
  },

  area: {
    strokeWidth: 2,
    fillOpacity: 0.3,
    dot: false,
    activeDot: { r: 6, strokeWidth: 2 },
    grid: { strokeDasharray: '3 3' },
    animationDuration: 1000,
  },

  bar: {
    barSize: 'auto',
    radius: [2, 2, 0, 0],
    animationDuration: 1000,
    grid: { strokeDasharray: '3 3' },
  },

  pie: {
    innerRadius: 0,
    outerRadius: '80%',
    paddingAngle: 2,
    animationDuration: 1000,
    labelLine: false,
  },

  donut: {
    innerRadius: '40%',
    outerRadius: '80%',
    paddingAngle: 2,
    animationDuration: 1000,
    labelLine: false,
  },

  gauge: {
    startAngle: 180,
    endAngle: 0,
    innerRadius: '70%',
    outerRadius: '90%',
    animationDuration: 1500,
    showValue: true,
  },
};

// Responsive breakpoints for charts
export const CHART_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  large: 1280,
};

// Chart size presets
export const CHART_SIZES = {
  small: {
    width: 300,
    height: 200,
    margin: { top: 10, right: 20, bottom: 10, left: 10 },
  },
  medium: {
    width: 400,
    height: 300,
    margin: { top: 20, right: 30, bottom: 20, left: 20 },
  },
  large: {
    width: 600,
    height: 400,
    margin: { top: 30, right: 40, bottom: 30, left: 30 },
  },
  fullWidth: {
    width: '100%',
    height: 300,
    margin: { top: 20, right: 30, bottom: 20, left: 20 },
  },
};

// Wedding industry-specific metric definitions
export const WEDDING_METRICS = {
  // Wedding Progress Metrics
  wedding_progress: {
    completed_tasks: {
      label: 'Completed Tasks',
      description: 'Tasks completed for upcoming weddings',
      unit: 'tasks',
      target: 100,
      chartTypes: ['gauge', 'bar', 'line'],
      priority: 'high',
    },
    timeline_progress: {
      label: 'Timeline Progress',
      description: 'Overall wedding timeline completion percentage',
      unit: '%',
      target: 100,
      chartTypes: ['gauge', 'line'],
      priority: 'high',
    },
    vendor_confirmations: {
      label: 'Vendor Confirmations',
      description: 'Confirmed vendors vs total needed',
      unit: 'vendors',
      target: null,
      chartTypes: ['donut', 'bar'],
      priority: 'medium',
    },
    budget_utilization: {
      label: 'Budget Utilization',
      description: 'Wedding budget spent vs allocated',
      unit: '%',
      target: 90,
      chartTypes: ['gauge', 'line'],
      priority: 'high',
    },
  },

  // Client Engagement Metrics
  client_engagement: {
    form_submissions: {
      label: 'Form Submissions',
      description: 'Client form submissions over time',
      unit: 'submissions',
      target: null,
      chartTypes: ['line', 'bar', 'area'],
      priority: 'medium',
    },
    response_time: {
      label: 'Response Time',
      description: 'Average response time to client inquiries',
      unit: 'hours',
      target: 24,
      chartTypes: ['line', 'gauge'],
      priority: 'high',
    },
    client_satisfaction: {
      label: 'Client Satisfaction',
      description: 'Client satisfaction scores and ratings',
      unit: 'score',
      target: 4.5,
      chartTypes: ['gauge', 'line'],
      priority: 'high',
    },
    meeting_attendance: {
      label: 'Meeting Attendance',
      description: 'Client meeting attendance rate',
      unit: '%',
      target: 90,
      chartTypes: ['gauge', 'bar'],
      priority: 'medium',
    },
  },

  // Business Health Metrics
  business_health: {
    revenue_growth: {
      label: 'Revenue Growth',
      description: 'Monthly revenue growth rate',
      unit: '%',
      target: 10,
      chartTypes: ['line', 'area', 'bar'],
      priority: 'high',
    },
    conversion_rate: {
      label: 'Conversion Rate',
      description: 'Inquiry to booking conversion rate',
      unit: '%',
      target: 25,
      chartTypes: ['gauge', 'line'],
      priority: 'high',
    },
    client_retention: {
      label: 'Client Retention',
      description: 'Repeat client and referral rate',
      unit: '%',
      target: 60,
      chartTypes: ['gauge', 'donut'],
      priority: 'medium',
    },
    booking_pipeline: {
      label: 'Booking Pipeline',
      description: 'Future bookings and pipeline health',
      unit: 'bookings',
      target: null,
      chartTypes: ['line', 'bar'],
      priority: 'high',
    },
  },
};

// Chart animation presets
export const CHART_ANIMATIONS = {
  entrance: {
    duration: 1000,
    easing: 'ease-out',
    delay: 0,
  },
  update: {
    duration: 500,
    easing: 'ease-in-out',
    delay: 0,
  },
  exit: {
    duration: 300,
    easing: 'ease-in',
    delay: 0,
  },
};

// Accessibility configurations
export const ACCESSIBILITY_CONFIG = {
  colorBlindFriendly: {
    // High contrast colors for accessibility
    primary: '#0066cc',
    secondary: '#ff6600',
    success: '#228b22',
    warning: '#ffa500',
    danger: '#dc143c',
  },

  // ARIA labels and descriptions
  ariaLabels: {
    chart: 'Progress chart showing {metric} over {timeRange}',
    dataPoint: 'Data point: {value} {unit} on {date}',
    trend: 'Trend: {direction} by {percentage}%',
    legend: 'Chart legend showing data series',
  },
};

// Performance optimization settings
export const PERFORMANCE_CONFIG = {
  // Data point limits for different chart types
  maxDataPoints: {
    line: 500,
    area: 500,
    bar: 100,
    pie: 20,
    donut: 20,
    gauge: 1,
  },

  // Throttle settings for real-time updates
  updateThrottling: {
    realtime: 1000, // 1 second
    periodic: 30000, // 30 seconds
    onDemand: 0,
  },

  // Caching settings
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 50, // Maximum cached charts
  },
};

// Wedding day special configurations
export const WEDDING_DAY_CONFIG = {
  // High-priority mode for wedding days
  priorityMode: {
    refreshInterval: 60, // 1 minute updates
    alertThresholds: {
      task_completion: 95, // Alert if below 95%
      vendor_confirmations: 100, // Must be 100%
      timeline_adherence: 90, // Alert if behind schedule
    },
    notifications: {
      enabled: true,
      channels: ['email', 'sms', 'push'],
      priority: 'high',
    },
  },

  // Special styling for wedding day
  styling: {
    border: '2px solid #f59e0b', // Golden border
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    priority_indicator: true,
  },
};

// Export configuration builder
export class ChartConfigBuilder {
  private config: any = {};

  constructor(chartType: ChartType, dataSource: DataSource) {
    this.config = {
      chartType,
      dataSource,
      ...DEFAULT_CHART_CONFIGS[chartType],
      colors: WEDDING_COLOR_SCHEMES.classic,
      size: CHART_SIZES.medium,
      animations: CHART_ANIMATIONS,
      accessibility: ACCESSIBILITY_CONFIG,
      performance: PERFORMANCE_CONFIG,
    };
  }

  setColorScheme(scheme: keyof typeof WEDDING_COLOR_SCHEMES) {
    this.config.colors = WEDDING_COLOR_SCHEMES[scheme];
    return this;
  }

  setSize(size: keyof typeof CHART_SIZES) {
    this.config.size = CHART_SIZES[size];
    return this;
  }

  setTimeRange(range: TimeRange) {
    this.config.timeRange = range;
    return this;
  }

  enableWeddingDayMode() {
    this.config.weddingDayMode = true;
    this.config.weddingDay = WEDDING_DAY_CONFIG;
    return this;
  }

  setMetrics(metrics: string[]) {
    this.config.metrics = metrics;
    return this;
  }

  enableRealTime(interval: number = 300) {
    this.config.realTime = {
      enabled: true,
      refreshInterval: interval,
    };
    return this;
  }

  setAccessibility(options: Partial<typeof ACCESSIBILITY_CONFIG>) {
    this.config.accessibility = { ...this.config.accessibility, ...options };
    return this;
  }

  build() {
    return { ...this.config };
  }
}

// Utility functions
export const getMetricDefinition = (
  category: MetricCategory,
  metricName: string,
) => {
  return WEDDING_METRICS[category]?.[metricName] || null;
};

export const getRecommendedChartType = (
  metricName: string,
  dataPoints: number,
): ChartType => {
  // Find metric definition
  for (const category of Object.keys(WEDDING_METRICS) as MetricCategory[]) {
    const metric = WEDDING_METRICS[category][metricName];
    if (metric) {
      // Return first recommended chart type based on data points
      if (dataPoints === 1) return 'gauge';
      if (dataPoints <= 10) return 'bar';
      if (metric.chartTypes.includes('line')) return 'line';
      return metric.chartTypes[0] as ChartType;
    }
  }

  // Fallback logic
  if (dataPoints === 1) return 'gauge';
  if (dataPoints <= 10) return 'bar';
  return 'line';
};

export const validateChartConfig = (config: any): string[] => {
  const errors: string[] = [];

  if (
    !config.chartType ||
    !Object.keys(DEFAULT_CHART_CONFIGS).includes(config.chartType)
  ) {
    errors.push('Invalid or missing chart type');
  }

  if (!config.dataSource) {
    errors.push('Data source is required');
  }

  if (config.metrics && !Array.isArray(config.metrics)) {
    errors.push('Metrics must be an array');
  }

  return errors;
};

export default ChartConfigBuilder;
