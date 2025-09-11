/**
 * Data Validation and Consistency Systems for Progress Charts
 * WS-224 Progress Charts System - Validation Layer
 */

import { z } from 'zod';

// Chart configuration validation schemas
export const ChartConfigSchema = z.object({
  chart_name: z
    .string()
    .min(1, 'Chart name is required')
    .max(100, 'Chart name too long'),
  chart_type: z.enum(['line', 'bar', 'pie', 'area', 'donut', 'gauge'], {
    errorMap: () => ({ message: 'Invalid chart type' }),
  }),
  data_source: z.enum(
    ['clients', 'forms', 'payments', 'tasks', 'journeys', 'custom'],
    {
      errorMap: () => ({ message: 'Invalid data source' }),
    },
  ),
  metrics: z
    .array(
      z.object({
        name: z.string().min(1),
        label: z.string().min(1),
        unit: z.string().optional(),
        target: z.number().positive().optional(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
      }),
    )
    .min(1, 'At least one metric is required'),
  filters: z.record(z.any()).optional(),
  time_range: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  refresh_interval: z.number().int().min(60).max(3600).default(300), // 1 minute to 1 hour
  display_options: z
    .object({
      width: z.number().int().min(200).max(2000).optional(),
      height: z.number().int().min(150).max(1500).optional(),
      position_x: z.number().int().min(0).optional(),
      position_y: z.number().int().min(0).optional(),
      color_scheme: z.string().optional(),
      show_legend: z.boolean().default(true),
      show_grid: z.boolean().default(true),
      show_tooltips: z.boolean().default(true),
    })
    .optional(),
  is_shared: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

// Progress metric validation schema
export const ProgressMetricSchema = z.object({
  metric_name: z
    .string()
    .min(1, 'Metric name is required')
    .max(100, 'Metric name too long'),
  metric_category: z.enum(
    [
      'wedding_progress',
      'client_engagement',
      'business_health',
      'performance',
      'custom',
    ],
    {
      errorMap: () => ({ message: 'Invalid metric category' }),
    },
  ),
  current_value: z.number().finite('Current value must be a valid number'),
  target_value: z.number().positive().optional(),
  unit: z.string().max(20, 'Unit too long').default('count'),
  calculation_config: z.record(z.any()).optional(),
  alert_thresholds: z
    .object({
      warning_threshold: z.number().optional(),
      critical_threshold: z.number().optional(),
      target_threshold: z.number().optional(),
    })
    .optional(),
});

// Progress snapshot validation schema
export const ProgressSnapshotSchema = z.object({
  metric_name: z.string().min(1, 'Metric name is required'),
  metric_category: z.string().min(1, 'Metric category is required'),
  metric_value: z.number().finite('Metric value must be a valid number'),
  metric_delta: z.number().finite().optional(),
  metric_percentage: z.number().finite().optional(),
  dimensions: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  snapshot_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// Chart subscription validation schema
export const ChartSubscriptionSchema = z.object({
  chart_config_id: z.string().uuid('Invalid chart config ID'),
  connection_id: z.string().min(1, 'Connection ID is required'),
  subscription_type: z
    .enum(['realtime', 'periodic', 'on_demand'])
    .default('realtime'),
});

// Data consistency validation functions
export class ProgressDataValidator {
  /**
   * Validate chart configuration data
   */
  static validateChartConfig(data: any): z.infer<typeof ChartConfigSchema> {
    const result = ChartConfigSchema.safeParse(data);

    if (!result.success) {
      throw new ValidationError(
        'Invalid chart configuration',
        result.error.errors,
      );
    }

    // Additional business logic validations
    this.validateChartBusinessRules(result.data);

    return result.data;
  }

  /**
   * Validate progress metric data
   */
  static validateProgressMetric(
    data: any,
  ): z.infer<typeof ProgressMetricSchema> {
    const result = ProgressMetricSchema.safeParse(data);

    if (!result.success) {
      throw new ValidationError('Invalid progress metric', result.error.errors);
    }

    // Additional business logic validations
    this.validateMetricBusinessRules(result.data);

    return result.data;
  }

  /**
   * Validate progress snapshot data
   */
  static validateProgressSnapshot(
    data: any,
  ): z.infer<typeof ProgressSnapshotSchema> {
    const result = ProgressSnapshotSchema.safeParse(data);

    if (!result.success) {
      throw new ValidationError(
        'Invalid progress snapshot',
        result.error.errors,
      );
    }

    // Additional business logic validations
    this.validateSnapshotBusinessRules(result.data);

    return result.data;
  }

  /**
   * Validate chart subscription data
   */
  static validateChartSubscription(
    data: any,
  ): z.infer<typeof ChartSubscriptionSchema> {
    const result = ChartSubscriptionSchema.safeParse(data);

    if (!result.success) {
      throw new ValidationError(
        'Invalid chart subscription',
        result.error.errors,
      );
    }

    return result.data;
  }

  /**
   * Business rule validations for chart configuration
   */
  private static validateChartBusinessRules(
    data: z.infer<typeof ChartConfigSchema>,
  ): void {
    // Validate chart type and data source compatibility
    const incompatibleCombinations: Record<string, string[]> = {
      gauge: ['clients', 'forms'], // Gauge works better with single metrics
      pie: ['custom'], // Pie charts need categorical data
      donut: ['custom'], // Donut charts need categorical data
    };

    const incompatible = incompatibleCombinations[data.chart_type];
    if (incompatible && incompatible.includes(data.data_source)) {
      throw new ValidationError(
        `Chart type '${data.chart_type}' is not compatible with data source '${data.data_source}'`,
      );
    }

    // Validate metric count for chart types
    const maxMetrics: Record<string, number> = {
      pie: 10,
      donut: 10,
      gauge: 1,
    };

    const maxAllowed = maxMetrics[data.chart_type];
    if (maxAllowed && data.metrics.length > maxAllowed) {
      throw new ValidationError(
        `Chart type '${data.chart_type}' supports maximum ${maxAllowed} metrics, ${data.metrics.length} provided`,
      );
    }

    // Validate refresh interval for wedding day mode
    if (
      data.chart_name.toLowerCase().includes('wedding') &&
      data.refresh_interval > 300
    ) {
      throw new ValidationError(
        'Wedding day charts must have refresh interval ≤ 5 minutes (300 seconds)',
      );
    }

    // Validate display options
    if (data.display_options) {
      const { width, height } = data.display_options;

      // Minimum size requirements for readability
      if (width && width < 200) {
        throw new ValidationError('Chart width must be at least 200 pixels');
      }

      if (height && height < 150) {
        throw new ValidationError('Chart height must be at least 150 pixels');
      }

      // Maximum size limits for performance
      if (width && width > 2000) {
        throw new ValidationError('Chart width cannot exceed 2000 pixels');
      }

      if (height && height > 1500) {
        throw new ValidationError('Chart height cannot exceed 1500 pixels');
      }
    }
  }

  /**
   * Business rule validations for progress metrics
   */
  private static validateMetricBusinessRules(
    data: z.infer<typeof ProgressMetricSchema>,
  ): void {
    // Validate target value against current value for specific categories
    if (data.target_value && data.current_value > data.target_value) {
      const allowedOverTarget = ['business_health']; // Some metrics can exceed targets

      if (!allowedOverTarget.includes(data.metric_category)) {
        console.warn(
          `Metric '${data.metric_name}' current value (${data.current_value}) exceeds target (${data.target_value})`,
        );
      }
    }

    // Validate percentage metrics
    if (data.unit === '%' || data.unit === 'percentage') {
      if (data.current_value < 0 || data.current_value > 100) {
        throw new ValidationError(
          'Percentage values must be between 0 and 100',
        );
      }

      if (
        data.target_value &&
        (data.target_value < 0 || data.target_value > 100)
      ) {
        throw new ValidationError(
          'Target percentage values must be between 0 and 100',
        );
      }
    }

    // Validate currency metrics
    if (data.unit === '£' || data.unit === 'GBP' || data.unit === 'currency') {
      if (data.current_value < 0) {
        throw new ValidationError('Currency values cannot be negative');
      }
    }

    // Validate wedding-specific metrics
    if (data.metric_category === 'wedding_progress') {
      const weddingMetrics = [
        'completed_tasks',
        'timeline_progress',
        'vendor_confirmations',
        'budget_utilization',
      ];

      if (!weddingMetrics.some((metric) => data.metric_name.includes(metric))) {
        console.warn(`Unknown wedding progress metric: ${data.metric_name}`);
      }

      // Wedding metrics should have targets
      if (!data.target_value) {
        console.warn(
          `Wedding progress metric '${data.metric_name}' should have a target value`,
        );
      }
    }

    // Validate alert thresholds
    if (data.alert_thresholds) {
      const { warning_threshold, critical_threshold, target_threshold } =
        data.alert_thresholds;

      if (
        warning_threshold &&
        critical_threshold &&
        warning_threshold <= critical_threshold
      ) {
        throw new ValidationError(
          'Warning threshold must be greater than critical threshold',
        );
      }

      if (
        target_threshold &&
        data.target_value &&
        target_threshold !== data.target_value
      ) {
        console.warn(
          `Target threshold (${target_threshold}) differs from target value (${data.target_value})`,
        );
      }
    }
  }

  /**
   * Business rule validations for progress snapshots
   */
  private static validateSnapshotBusinessRules(
    data: z.infer<typeof ProgressSnapshotSchema>,
  ): void {
    // Validate snapshot date is not in the future
    const snapshotDate = new Date(data.snapshot_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (snapshotDate > today) {
      throw new ValidationError('Snapshot date cannot be in the future');
    }

    // Validate snapshot date is not too old (more than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    if (snapshotDate < twoYearsAgo) {
      throw new ValidationError(
        'Snapshot date cannot be more than 2 years old',
      );
    }

    // Validate metric value ranges based on category
    if (
      data.metric_category === 'percentage' &&
      (data.metric_value < 0 || data.metric_value > 100)
    ) {
      throw new ValidationError(
        'Percentage snapshot values must be between 0 and 100',
      );
    }

    // Validate delta consistency
    if (
      data.metric_delta !== undefined &&
      data.metric_percentage !== undefined
    ) {
      // If both delta and percentage are provided, they should be consistent
      const expectedPercentage =
        data.metric_value > 0
          ? (data.metric_delta / (data.metric_value - data.metric_delta)) * 100
          : 0;
      const tolerance = 0.1; // 0.1% tolerance

      if (Math.abs(data.metric_percentage - expectedPercentage) > tolerance) {
        console.warn(
          `Inconsistent delta and percentage in snapshot: delta=${data.metric_delta}, percentage=${data.metric_percentage}, expected=${expectedPercentage}`,
        );
      }
    }
  }

  /**
   * Validate batch operations for consistency
   */
  static validateBatchOperation<T>(
    items: T[],
    validationFn: (item: T) => T,
  ): T[] {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Batch operation requires non-empty array');
    }

    if (items.length > 100) {
      throw new ValidationError('Batch operation limited to 100 items maximum');
    }

    const validatedItems: T[] = [];
    const errors: string[] = [];

    items.forEach((item, index) => {
      try {
        const validated = validationFn(item);
        validatedItems.push(validated);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(`Item ${index + 1}: ${error.message}`);
        } else {
          errors.push(`Item ${index + 1}: Validation failed`);
        }
      }
    });

    if (errors.length > 0) {
      throw new ValidationError(
        `Batch validation failed:\n${errors.join('\n')}`,
      );
    }

    return validatedItems;
  }

  /**
   * Validate data consistency across related records
   */
  static validateDataConsistency(data: {
    metrics?: any[];
    snapshots?: any[];
    configs?: any[];
  }): void {
    // Validate metric names consistency
    if (data.metrics && data.snapshots) {
      const metricNames = new Set(data.metrics.map((m) => m.metric_name));
      const snapshotNames = new Set(data.snapshots.map((s) => s.metric_name));

      const orphanedSnapshots = [...snapshotNames].filter(
        (name) => !metricNames.has(name),
      );
      if (orphanedSnapshots.length > 0) {
        console.warn(
          `Orphaned snapshots found for metrics: ${orphanedSnapshots.join(', ')}`,
        );
      }
    }

    // Validate chart configuration references valid metrics
    if (data.configs && data.metrics) {
      const availableMetrics = new Set(data.metrics.map((m) => m.metric_name));

      data.configs.forEach((config, index) => {
        if (config.metrics) {
          const invalidMetrics = config.metrics
            .map((m: any) => m.name)
            .filter((name: string) => !availableMetrics.has(name));

          if (invalidMetrics.length > 0) {
            console.warn(
              `Chart config ${index + 1} references non-existent metrics: ${invalidMetrics.join(', ')}`,
            );
          }
        }
      });
    }

    // Validate temporal consistency
    if (data.snapshots) {
      const sortedSnapshots = [...data.snapshots].sort(
        (a, b) =>
          new Date(a.snapshot_date).getTime() -
          new Date(b.snapshot_date).getTime(),
      );

      for (let i = 1; i < sortedSnapshots.length; i++) {
        const current = sortedSnapshots[i];
        const previous = sortedSnapshots[i - 1];

        if (current.metric_name === previous.metric_name) {
          const actualDelta = current.metric_value - previous.metric_value;
          const reportedDelta = current.metric_delta || 0;
          const tolerance = Math.abs(current.metric_value * 0.01); // 1% tolerance

          if (Math.abs(actualDelta - reportedDelta) > tolerance) {
            console.warn(
              `Temporal inconsistency in metric '${current.metric_name}': ` +
                `actual delta=${actualDelta}, reported delta=${reportedDelta}`,
            );
          }
        }
      }
    }
  }
}

// Custom validation error class
export class ValidationError extends Error {
  public readonly errors?: any[];

  constructor(message: string, errors?: any[]) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Utility functions for validation
export const ValidationUtils = {
  /**
   * Sanitize metric name for database storage
   */
  sanitizeMetricName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  },

  /**
   * Validate color hex codes
   */
  isValidColorHex(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  },

  /**
   * Validate date range
   */
  validateDateRange(start: string, end: string): boolean {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return (
      startDate <= endDate &&
      !isNaN(startDate.getTime()) &&
      !isNaN(endDate.getTime())
    );
  },

  /**
   * Check if value is within acceptable range
   */
  isWithinRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  },

  /**
   * Validate wedding date constraints
   */
  validateWeddingDate(date: string): boolean {
    const weddingDate = new Date(date);
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 2);

    // Wedding dates should be in the future but not more than 2 years away
    return weddingDate >= today && weddingDate <= oneYearFromNow;
  },
};

export default ProgressDataValidator;
