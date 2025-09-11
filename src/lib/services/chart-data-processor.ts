/**
 * Chart Data Processing Service
 * Handles complex data transformations and optimizations for progress charts
 * SECURITY: All data sanitized and validated before processing
 */

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
  aggregation: 'day' | 'week' | 'month';
  smoothing?: boolean;
  fillGaps?: boolean;
  maxDataPoints?: number;
  colorScheme?: 'default' | 'wedding' | 'status' | 'priority';
}

export interface DataPoint {
  x: string | number;
  y: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ProcessedChartData {
  data: DataPoint[];
  config: ChartConfig;
  summary: {
    totalPoints: number;
    dateRange: { start: string; end: string };
    trends: {
      direction: 'up' | 'down' | 'stable';
      percentage: number;
      significance: 'low' | 'medium' | 'high';
    };
  };
  optimizations: {
    dataReduction: number;
    interpolatedPoints: number;
    smoothingApplied: boolean;
  };
}

export interface TaskData {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  completed_at?: string;
  due_date?: string;
  category: string;
  wedding_id: string;
  estimated_hours?: number;
  actual_hours?: number;
}

class ChartDataProcessor {
  private static readonly MAX_CHART_POINTS = 1000;
  private static readonly TREND_WINDOW = 7; // Days for trend calculation

  // Wedding industry color schemes
  private static readonly COLOR_SCHEMES = {
    default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
    wedding: ['#fda4af', '#c084fc', '#a78bfa', '#34d399', '#fbbf24', '#fb7185'],
    status: {
      pending: '#fbbf24',
      in_progress: '#3b82f6',
      completed: '#10b981',
      overdue: '#ef4444',
    },
    priority: {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444',
    },
  };

  /**
   * Process task data into optimized chart format
   */
  static processTaskData(
    tasks: TaskData[],
    config: ChartConfig,
    dateRange: { start: string; end: string },
  ): ProcessedChartData {
    const startTime = performance.now();

    try {
      // Validate and sanitize input data
      const sanitizedTasks = this.sanitizeTaskData(tasks);
      const validatedConfig = this.validateChartConfig(config);

      // Generate base data points
      let dataPoints = this.generateDataPoints(
        sanitizedTasks,
        validatedConfig,
        dateRange,
      );

      // Apply data optimizations
      const originalCount = dataPoints.length;

      // 1. Handle gaps in data
      if (validatedConfig.fillGaps) {
        dataPoints = this.fillDataGaps(
          dataPoints,
          validatedConfig.aggregation,
          dateRange,
        );
      }

      // 2. Apply smoothing if requested
      if (validatedConfig.smoothing) {
        dataPoints = this.applySmoothingFilter(dataPoints);
      }

      // 3. Reduce data points if too many
      const maxPoints = validatedConfig.maxDataPoints || this.MAX_CHART_POINTS;
      const reductionApplied = dataPoints.length > maxPoints;
      if (reductionApplied) {
        dataPoints = this.reduceDataPoints(dataPoints, maxPoints);
      }

      // 4. Apply color scheme
      dataPoints = this.applyColorScheme(
        dataPoints,
        validatedConfig.colorScheme || 'default',
      );

      // Calculate trend analysis
      const trends = this.calculateTrends(dataPoints);

      // Generate summary statistics
      const summary = this.generateSummary(dataPoints, dateRange, trends);

      const processingTime = performance.now() - startTime;
      console.log(`Chart data processed in ${processingTime.toFixed(2)}ms`);

      return {
        data: dataPoints,
        config: validatedConfig,
        summary,
        optimizations: {
          dataReduction: reductionApplied
            ? ((originalCount - dataPoints.length) / originalCount) * 100
            : 0,
          interpolatedPoints: validatedConfig.fillGaps
            ? this.countInterpolatedPoints(dataPoints)
            : 0,
          smoothingApplied: validatedConfig.smoothing || false,
        },
      };
    } catch (error) {
      console.error('Chart data processing error:', error);
      throw new Error(
        `Failed to process chart data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private static sanitizeTaskData(tasks: TaskData[]): TaskData[] {
    return tasks
      .filter((task) => {
        // Basic validation - ensure required fields exist
        return (
          task.id &&
          task.status &&
          task.created_at &&
          ['pending', 'in_progress', 'completed', 'overdue'].includes(
            task.status,
          ) &&
          ['low', 'medium', 'high', 'critical'].includes(task.priority)
        );
      })
      .map((task) => ({
        ...task,
        // Sanitize string fields to prevent injection
        category: task.category.replace(/[<>'"\\]/g, '').trim(),
        id: task.id.trim(),
        wedding_id: task.wedding_id.trim(),
      }));
  }

  private static validateChartConfig(config: ChartConfig): ChartConfig {
    return {
      type: ['line', 'bar', 'pie', 'area', 'scatter', 'heatmap'].includes(
        config.type,
      )
        ? config.type
        : 'line',
      aggregation: ['day', 'week', 'month'].includes(config.aggregation)
        ? config.aggregation
        : 'day',
      smoothing: config.smoothing || false,
      fillGaps: config.fillGaps || false,
      maxDataPoints: Math.min(
        config.maxDataPoints || this.MAX_CHART_POINTS,
        this.MAX_CHART_POINTS,
      ),
      colorScheme: config.colorScheme || 'default',
    };
  }

  private static generateDataPoints(
    tasks: TaskData[],
    config: ChartConfig,
    dateRange: { start: string; end: string },
  ): DataPoint[] {
    const points: DataPoint[] = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Group tasks by time period
    const timeGroups = this.groupTasksByTime(
      tasks,
      config.aggregation,
      startDate,
      endDate,
    );

    // Generate data points for each time period
    for (const [timeKey, groupTasks] of Object.entries(timeGroups)) {
      switch (config.type) {
        case 'line':
        case 'area':
          // Completion rate over time
          const completedCount = groupTasks.filter(
            (t) => t.status === 'completed',
          ).length;
          const totalCount = groupTasks.length;
          points.push({
            x: timeKey,
            y: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
            category: 'completion_rate',
            metadata: { completed: completedCount, total: totalCount },
          });
          break;

        case 'bar':
          // Task count by status
          const statusCounts = groupTasks.reduce(
            (acc, task) => {
              acc[task.status] = (acc[task.status] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          Object.entries(statusCounts).forEach(([status, count]) => {
            points.push({
              x: timeKey,
              y: count,
              category: status,
              metadata: { status, timeKey },
            });
          });
          break;

        case 'pie':
          // Overall distribution
          const priorityCounts = groupTasks.reduce(
            (acc, task) => {
              acc[task.priority] = (acc[task.priority] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          Object.entries(priorityCounts).forEach(([priority, count]) => {
            points.push({
              x: priority,
              y: count,
              category: 'priority',
              metadata: { priority },
            });
          });
          break;

        case 'scatter':
          // Estimated vs actual hours
          groupTasks.forEach((task) => {
            if (task.estimated_hours && task.actual_hours) {
              points.push({
                x: task.estimated_hours,
                y: task.actual_hours,
                category: task.priority,
                metadata: { taskId: task.id, status: task.status },
              });
            }
          });
          break;

        case 'heatmap':
          // Task density by day of week and hour
          groupTasks.forEach((task) => {
            const date = new Date(task.created_at);
            const dayOfWeek = date.getDay();
            const hour = date.getHours();
            points.push({
              x: dayOfWeek,
              y: hour,
              category: 'density',
              metadata: { count: 1, date: timeKey },
            });
          });
          break;
      }
    }

    return points;
  }

  private static groupTasksByTime(
    tasks: TaskData[],
    aggregation: string,
    startDate: Date,
    endDate: Date,
  ): Record<string, TaskData[]> {
    const groups: Record<string, TaskData[]> = {};

    // Initialize all time periods in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = this.getTimeKey(current, aggregation);
      if (!groups[key]) {
        groups[key] = [];
      }

      // Increment based on aggregation
      switch (aggregation) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    // Group tasks into time periods
    tasks.forEach((task) => {
      const taskDate = new Date(task.created_at);
      if (taskDate >= startDate && taskDate <= endDate) {
        const key = this.getTimeKey(taskDate, aggregation);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(task);
      }
    });

    return groups;
  }

  private static getTimeKey(date: Date, aggregation: string): string {
    switch (aggregation) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private static fillDataGaps(
    points: DataPoint[],
    aggregation: string,
    dateRange: { start: string; end: string },
  ): DataPoint[] {
    if (points.length === 0) return points;

    const sortedPoints = [...points].sort(
      (a, b) =>
        new Date(a.x as string).getTime() - new Date(b.x as string).getTime(),
    );

    const filledPoints: DataPoint[] = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    let current = new Date(startDate);

    while (current <= endDate) {
      const timeKey = this.getTimeKey(current, aggregation);
      const existingPoint = sortedPoints.find((p) => p.x === timeKey);

      if (existingPoint) {
        filledPoints.push(existingPoint);
      } else {
        // Interpolate missing data point
        const interpolatedValue = this.interpolateValue(sortedPoints, timeKey);
        filledPoints.push({
          x: timeKey,
          y: interpolatedValue,
          category: 'interpolated',
          metadata: { interpolated: true },
        });
      }

      // Increment date
      switch (aggregation) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return filledPoints;
  }

  private static interpolateValue(
    points: DataPoint[],
    targetKey: string,
  ): number {
    const targetDate = new Date(targetKey);

    // Find closest points before and after
    const beforePoints = points
      .filter((p) => new Date(p.x as string) < targetDate)
      .sort(
        (a, b) =>
          new Date(b.x as string).getTime() - new Date(a.x as string).getTime(),
      );

    const afterPoints = points
      .filter((p) => new Date(p.x as string) > targetDate)
      .sort(
        (a, b) =>
          new Date(a.x as string).getTime() - new Date(b.x as string).getTime(),
      );

    if (beforePoints.length === 0 && afterPoints.length === 0) {
      return 0;
    }

    if (beforePoints.length === 0) {
      return afterPoints[0].y;
    }

    if (afterPoints.length === 0) {
      return beforePoints[0].y;
    }

    // Linear interpolation
    const beforePoint = beforePoints[0];
    const afterPoint = afterPoints[0];

    const beforeTime = new Date(beforePoint.x as string).getTime();
    const afterTime = new Date(afterPoint.x as string).getTime();
    const targetTime = targetDate.getTime();

    const ratio = (targetTime - beforeTime) / (afterTime - beforeTime);

    return beforePoint.y + (afterPoint.y - beforePoint.y) * ratio;
  }

  private static applySmoothingFilter(points: DataPoint[]): DataPoint[] {
    if (points.length < 3) return points;

    const smoothedPoints = [...points];

    // Apply moving average smoothing (window size = 3)
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1].y;
      const current = points[i].y;
      const next = points[i + 1].y;

      smoothedPoints[i] = {
        ...points[i],
        y: (prev + current + next) / 3,
        metadata: { ...points[i].metadata, smoothed: true },
      };
    }

    return smoothedPoints;
  }

  private static reduceDataPoints(
    points: DataPoint[],
    maxPoints: number,
  ): DataPoint[] {
    if (points.length <= maxPoints) return points;

    // Use intelligent sampling to preserve important points
    const step = Math.ceil(points.length / maxPoints);
    const reducedPoints: DataPoint[] = [];

    for (let i = 0; i < points.length; i += step) {
      reducedPoints.push(points[i]);
    }

    // Always include the last point
    if (reducedPoints[reducedPoints.length - 1] !== points[points.length - 1]) {
      reducedPoints.push(points[points.length - 1]);
    }

    return reducedPoints;
  }

  private static applyColorScheme(
    points: DataPoint[],
    scheme: string,
  ): DataPoint[] {
    const colors =
      this.COLOR_SCHEMES[scheme as keyof typeof this.COLOR_SCHEMES] ||
      this.COLOR_SCHEMES.default;

    return points.map((point, index) => ({
      ...point,
      metadata: {
        ...point.metadata,
        color: Array.isArray(colors)
          ? colors[index % colors.length]
          : (colors as any)[point.category as string] || colors[0 as any],
      },
    }));
  }

  private static calculateTrends(points: DataPoint[]): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    significance: 'low' | 'medium' | 'high';
  } {
    if (points.length < 2) {
      return { direction: 'stable', percentage: 0, significance: 'low' };
    }

    const recentPoints = points.slice(-this.TREND_WINDOW);
    const earlierPoints = points.slice(
      -this.TREND_WINDOW * 2,
      -this.TREND_WINDOW,
    );

    if (earlierPoints.length === 0) {
      return { direction: 'stable', percentage: 0, significance: 'low' };
    }

    const recentAvg =
      recentPoints.reduce((sum, p) => sum + p.y, 0) / recentPoints.length;
    const earlierAvg =
      earlierPoints.reduce((sum, p) => sum + p.y, 0) / earlierPoints.length;

    const changePercent =
      earlierAvg !== 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    const absChange = Math.abs(changePercent);

    return {
      direction:
        changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable',
      percentage: Math.round(changePercent * 100) / 100,
      significance: absChange > 20 ? 'high' : absChange > 10 ? 'medium' : 'low',
    };
  }

  private static generateSummary(
    points: DataPoint[],
    dateRange: { start: string; end: string },
    trends: any,
  ) {
    return {
      totalPoints: points.length,
      dateRange,
      trends,
    };
  }

  private static countInterpolatedPoints(points: DataPoint[]): number {
    return points.filter((p) => p.metadata?.interpolated).length;
  }

  /**
   * Generate wedding-specific chart configurations
   */
  static getWeddingChartConfig(
    chartType: string,
    weddingDate?: string,
  ): ChartConfig {
    const daysToWedding = weddingDate
      ? Math.ceil(
          (new Date(weddingDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    // Adjust aggregation based on time to wedding
    let aggregation: 'day' | 'week' | 'month' = 'day';
    if (daysToWedding > 365) {
      aggregation = 'month';
    } else if (daysToWedding > 60) {
      aggregation = 'week';
    }

    return {
      type: chartType as any,
      aggregation,
      smoothing: true,
      fillGaps: true,
      maxDataPoints: 500,
      colorScheme: 'wedding',
    };
  }
}

export { ChartDataProcessor };
