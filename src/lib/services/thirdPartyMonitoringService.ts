/**
 * Third-Party Service Monitoring Service - Team C Implementation
 * Comprehensive monitoring for AI services, external APIs, and integrations
 * Includes health checks, performance tracking, cost monitoring, and alerting
 */

import { createClient } from '@/lib/supabase/server';
import PDFAnalysisNotificationService from './pdfAnalysisNotificationService';

// Core monitoring types
interface ServiceDefinition {
  id: string;
  name: string;
  type: ServiceType;
  category: ServiceCategory;
  endpoint?: string;
  healthCheckUrl?: string;
  credentials: ServiceCredentials;
  configuration: ServiceConfiguration;
  monitoring: MonitoringConfig;
  costModel: CostModel;
  dependencies: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

type ServiceType =
  | 'ai_service'
  | 'api_gateway'
  | 'database'
  | 'cdn'
  | 'email_service'
  | 'sms_service'
  | 'storage'
  | 'authentication'
  | 'payment'
  | 'analytics'
  | 'monitoring';

type ServiceCategory =
  | 'core'
  | 'ai_ml'
  | 'communication'
  | 'storage'
  | 'payment'
  | 'analytics'
  | 'infrastructure';

interface ServiceCredentials {
  apiKey?: string;
  secretKey?: string;
  accessToken?: string;
  refreshToken?: string;
  certificatePath?: string;
  username?: string;
  password?: string;
  connectionString?: string;
}

interface ServiceConfiguration {
  timeout: number;
  retries: number;
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
  };
}

interface MonitoringConfig {
  healthCheckInterval: number; // milliseconds
  performanceTracking: boolean;
  costTracking: boolean;
  alerting: AlertingConfig;
  metrics: string[];
}

interface AlertingConfig {
  enabled: boolean;
  channels: ('email' | 'slack' | 'sms' | 'webhook')[];
  thresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    availability: number; // percentage
    dailyCost: number; // dollars
  };
  escalation: {
    enabled: boolean;
    levels: EscalationLevel[];
  };
}

interface EscalationLevel {
  delay: number; // minutes
  channels: string[];
  severity: 'warning' | 'error' | 'critical';
}

interface CostModel {
  type:
    | 'per_request'
    | 'per_token'
    | 'per_mb'
    | 'per_minute'
    | 'flat_rate'
    | 'tiered';
  rates: CostRate[];
  currency: string;
  billing: {
    cycle: 'hourly' | 'daily' | 'monthly' | 'yearly';
    freeQuota?: number;
    overage?: number;
  };
}

interface CostRate {
  tier?: string;
  unit: string;
  rate: number;
  threshold?: number;
}

// Health check and performance types
interface HealthCheckResult {
  serviceId: string;
  serviceName: string;
  timestamp: Date;
  status: HealthStatus;
  responseTime: number;
  details: HealthDetails;
  metrics: ServiceMetrics;
}

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface HealthDetails {
  endpoint: string;
  statusCode?: number;
  error?: string;
  version?: string;
  region?: string;
  lastSuccessfulCheck?: Date;
  consecutiveFailures: number;
}

interface ServiceMetrics {
  availability: number; // percentage over last 24h
  averageResponseTime: number; // ms over last hour
  requestCount: number; // last hour
  errorCount: number; // last hour
  errorRate: number; // percentage
  throughput: number; // requests per second
}

// Cost tracking types
interface CostTrackingData {
  serviceId: string;
  timestamp: Date;
  cost: number;
  currency: string;
  usage: UsageMetrics;
  period: {
    start: Date;
    end: Date;
  };
}

interface UsageMetrics {
  requests?: number;
  tokens?: number;
  dataProcessed?: number; // bytes
  duration?: number; // milliseconds
  [key: string]: number | undefined;
}

interface CostReport {
  totalCost: number;
  period: { start: Date; end: Date };
  breakdown: ServiceCostBreakdown[];
  trends: CostTrend[];
  optimizationSuggestions: OptimizationSuggestion[];
  projections: CostProjection[];
}

interface ServiceCostBreakdown {
  serviceId: string;
  serviceName: string;
  cost: number;
  usage: UsageMetrics;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface CostTrend {
  period: string;
  cost: number;
  change: number; // percentage
}

interface OptimizationSuggestion {
  type: 'provider_switch' | 'tier_change' | 'usage_optimization' | 'caching';
  serviceId: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

interface CostProjection {
  period: 'week' | 'month' | 'quarter';
  projectedCost: number;
  confidence: number; // percentage
  factors: string[];
}

// Alert types
interface Alert {
  id: string;
  serviceId: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  escalated: boolean;
}

type AlertType =
  | 'health_check_failed'
  | 'high_response_time'
  | 'high_error_rate'
  | 'low_availability'
  | 'cost_threshold_exceeded'
  | 'service_quota_exceeded'
  | 'dependency_failure'
  | 'security_issue';

// Main monitoring service
export class ThirdPartyMonitoringService {
  private readonly healthCheckers: Map<string, HealthChecker> = new Map();
  private readonly performanceTracker: PerformanceTracker;
  private readonly costTracker: CostTracker;
  private readonly alertManager: AlertManager;
  private readonly supabase = createClient();
  private readonly notificationService: PDFAnalysisNotificationService;
  private readonly services: Map<string, ServiceDefinition> = new Map();

  constructor() {
    this.performanceTracker = new PerformanceTracker();
    this.costTracker = new CostTracker();
    this.alertManager = new AlertManager();
    this.notificationService = new PDFAnalysisNotificationService();

    this.initializeServices();
    this.setupMonitoring();
  }

  private initializeServices(): void {
    // OpenAI GPT-4 Vision Service
    this.services.set('openai', {
      id: 'openai',
      name: 'OpenAI GPT-4 Vision',
      type: 'ai_service',
      category: 'ai_ml',
      endpoint: 'https://api.openai.com/v1',
      healthCheckUrl: 'https://api.openai.com/v1/models',
      credentials: {
        apiKey: process.env.OPENAI_API_KEY,
      },
      configuration: {
        timeout: 30000,
        retries: 3,
        rateLimit: {
          requests: 3500,
          window: 60000, // 1 minute
        },
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
      monitoring: {
        healthCheckInterval: 60000, // 1 minute
        performanceTracking: true,
        costTracking: true,
        alerting: {
          enabled: true,
          channels: ['email', 'slack'],
          thresholds: {
            responseTime: 10000, // 10 seconds
            errorRate: 5, // 5%
            availability: 99, // 99%
            dailyCost: 100, // $100
          },
          escalation: {
            enabled: true,
            levels: [
              { delay: 5, channels: ['slack'], severity: 'warning' },
              { delay: 15, channels: ['email', 'slack'], severity: 'error' },
              {
                delay: 30,
                channels: ['sms', 'email', 'slack'],
                severity: 'critical',
              },
            ],
          },
        },
        metrics: [
          'response_time',
          'token_usage',
          'cost_per_request',
          'error_rate',
        ],
      },
      costModel: {
        type: 'per_token',
        rates: [
          { unit: 'input_token', rate: 0.00001, tier: 'input' }, // $0.01 per 1K tokens
          { unit: 'output_token', rate: 0.00003, tier: 'output' }, // $0.03 per 1K tokens
        ],
        currency: 'USD',
        billing: {
          cycle: 'monthly',
        },
      },
      dependencies: [],
      criticality: 'critical',
    });

    // Google Cloud Vision Service
    this.services.set('google-vision', {
      id: 'google-vision',
      name: 'Google Cloud Vision API',
      type: 'ai_service',
      category: 'ai_ml',
      endpoint: 'https://vision.googleapis.com/v1',
      healthCheckUrl: 'https://vision.googleapis.com/v1/operations',
      credentials: {
        certificatePath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      },
      configuration: {
        timeout: 20000,
        retries: 3,
        rateLimit: {
          requests: 600,
          window: 60000, // 1 minute
        },
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
      monitoring: {
        healthCheckInterval: 120000, // 2 minutes
        performanceTracking: true,
        costTracking: true,
        alerting: {
          enabled: true,
          channels: ['email', 'slack'],
          thresholds: {
            responseTime: 8000,
            errorRate: 3,
            availability: 99.5,
            dailyCost: 50,
          },
          escalation: { enabled: false, levels: [] },
        },
        metrics: ['response_time', 'image_count', 'cost_per_image', 'accuracy'],
      },
      costModel: {
        type: 'per_request',
        rates: [
          { unit: 'detection', rate: 0.0015 }, // $1.50 per 1000 detections
        ],
        currency: 'USD',
        billing: {
          cycle: 'monthly',
          freeQuota: 1000,
        },
      },
      dependencies: [],
      criticality: 'high',
    });

    // AWS Textract Service
    this.services.set('aws-textract', {
      id: 'aws-textract',
      name: 'AWS Textract',
      type: 'ai_service',
      category: 'ai_ml',
      endpoint: 'https://textract.us-east-1.amazonaws.com',
      credentials: {
        accessToken: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      configuration: {
        timeout: 25000,
        retries: 3,
        rateLimit: {
          requests: 100,
          window: 60000,
        },
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
      monitoring: {
        healthCheckInterval: 180000, // 3 minutes
        performanceTracking: true,
        costTracking: true,
        alerting: {
          enabled: true,
          channels: ['email'],
          thresholds: {
            responseTime: 12000,
            errorRate: 4,
            availability: 99,
            dailyCost: 30,
          },
          escalation: { enabled: false, levels: [] },
        },
        metrics: ['response_time', 'pages_processed', 'cost_per_page'],
      },
      costModel: {
        type: 'per_request',
        rates: [
          { unit: 'page', rate: 0.002 }, // $0.002 per page
        ],
        currency: 'USD',
        billing: {
          cycle: 'monthly',
          freeQuota: 1000,
        },
      },
      dependencies: [],
      criticality: 'medium',
    });

    // Supabase Database
    this.services.set('supabase-db', {
      id: 'supabase-db',
      name: 'Supabase PostgreSQL',
      type: 'database',
      category: 'infrastructure',
      endpoint: process.env.NEXT_PUBLIC_SUPABASE_URL,
      credentials: {
        apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      configuration: {
        timeout: 5000,
        retries: 2,
        rateLimit: {
          requests: 1000,
          window: 60000,
        },
        circuitBreaker: {
          enabled: true,
          threshold: 10,
          timeout: 30000,
        },
      },
      monitoring: {
        healthCheckInterval: 30000, // 30 seconds
        performanceTracking: true,
        costTracking: true,
        alerting: {
          enabled: true,
          channels: ['email', 'slack', 'sms'],
          thresholds: {
            responseTime: 2000,
            errorRate: 1,
            availability: 99.9,
            dailyCost: 20,
          },
          escalation: {
            enabled: true,
            levels: [
              { delay: 2, channels: ['slack'], severity: 'warning' },
              { delay: 5, channels: ['email', 'slack'], severity: 'error' },
              {
                delay: 10,
                channels: ['sms', 'email', 'slack'],
                severity: 'critical',
              },
            ],
          },
        },
        metrics: [
          'response_time',
          'connections',
          'query_performance',
          'storage_usage',
        ],
      },
      costModel: {
        type: 'tiered',
        rates: [
          { tier: 'free', unit: 'database_size', rate: 0, threshold: 500 }, // 500MB free
          { tier: 'pro', unit: 'database_size', rate: 0.0001 }, // $0.0001 per MB
        ],
        currency: 'USD',
        billing: {
          cycle: 'monthly',
        },
      },
      dependencies: [],
      criticality: 'critical',
    });

    // Resend Email Service
    this.services.set('resend', {
      id: 'resend',
      name: 'Resend Email Service',
      type: 'email_service',
      category: 'communication',
      endpoint: 'https://api.resend.com',
      credentials: {
        apiKey: process.env.RESEND_API_KEY,
      },
      configuration: {
        timeout: 10000,
        retries: 3,
        rateLimit: {
          requests: 100,
          window: 60000,
        },
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
      },
      monitoring: {
        healthCheckInterval: 300000, // 5 minutes
        performanceTracking: true,
        costTracking: true,
        alerting: {
          enabled: true,
          channels: ['slack'],
          thresholds: {
            responseTime: 5000,
            errorRate: 2,
            availability: 99.5,
            dailyCost: 10,
          },
          escalation: { enabled: false, levels: [] },
        },
        metrics: [
          'response_time',
          'emails_sent',
          'delivery_rate',
          'bounce_rate',
        ],
      },
      costModel: {
        type: 'per_request',
        rates: [
          { unit: 'email', rate: 0.0001 }, // $0.0001 per email
        ],
        currency: 'USD',
        billing: {
          cycle: 'monthly',
          freeQuota: 3000,
        },
      },
      dependencies: [],
      criticality: 'high',
    });
  }

  private setupMonitoring(): void {
    // Initialize health checkers for each service
    for (const [serviceId, service] of this.services) {
      this.healthCheckers.set(serviceId, new HealthChecker(service));
    }

    // Start monitoring loops
    this.startHealthCheckLoop();
    this.startCostTrackingLoop();
    this.startPerformanceTrackingLoop();
    this.startAlertProcessingLoop();
  }

  async monitorAIServiceHealth(): Promise<ServiceHealthReport> {
    const aiServices = Array.from(this.services.values()).filter(
      (service) => service.category === 'ai_ml',
    );

    const healthChecks = await Promise.allSettled(
      aiServices.map((service) => this.checkServiceHealth(service.id)),
    );

    const serviceResults = healthChecks.map((result, index) => {
      const service = aiServices[index];
      return {
        serviceId: service.id,
        serviceName: service.name,
        status:
          result.status === 'fulfilled' ? result.value.status : 'unhealthy',
        responseTime:
          result.status === 'fulfilled' ? result.value.responseTime : null,
        error: result.status === 'rejected' ? result.reason.message : null,
        lastCheck: new Date(),
      };
    });

    const overallHealth = this.calculateOverallHealth(serviceResults);

    return {
      timestamp: new Date(),
      services: serviceResults,
      overallHealth,
      summary: {
        totalServices: aiServices.length,
        healthyServices: serviceResults.filter((s) => s.status === 'healthy')
          .length,
        degradedServices: serviceResults.filter((s) => s.status === 'degraded')
          .length,
        unhealthyServices: serviceResults.filter(
          (s) => s.status === 'unhealthy',
        ).length,
      },
    };
  }

  async trackProcessingCosts(): Promise<CostReport> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const costs = await this.costTracker.getCosts({
      startDate,
      endDate,
      groupBy: ['service', 'request_type'],
    });

    const breakdown = await this.generateCostBreakdown(costs);
    const trends = await this.calculateCostTrends(costs);
    const optimizations = await this.generateOptimizationSuggestions(costs);
    const projections = await this.generateCostProjections(costs);

    return {
      totalCost: costs.reduce((sum, cost) => sum + cost.cost, 0),
      period: { start: startDate, end: endDate },
      breakdown,
      trends,
      optimizationSuggestions: optimizations,
      projections,
    };
  }

  async setupCostAlerts(): Promise<void> {
    const alerts = [
      {
        id: 'daily-cost-threshold',
        metric: 'daily_cost',
        threshold: 100, // $100 per day
        services: ['openai', 'google-vision', 'aws-textract'],
        action: 'email_admin',
      },
      {
        id: 'service-failure-rate',
        metric: 'service_failure_rate',
        threshold: 0.05, // 5% failure rate
        services: Array.from(this.services.keys()),
        action: 'switch_provider',
      },
      {
        id: 'processing-time',
        metric: 'processing_time',
        threshold: 300000, // 5 minutes
        services: ['openai', 'google-vision'],
        action: 'scale_resources',
      },
      {
        id: 'quota-exhaustion',
        metric: 'quota_usage',
        threshold: 0.9, // 90% of quota
        services: Array.from(this.services.keys()),
        action: 'notify_team',
      },
    ];

    for (const alert of alerts) {
      await this.setupAlert(alert);
    }
  }

  private async checkServiceHealth(
    serviceId: string,
  ): Promise<HealthCheckResult> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const checker = this.healthCheckers.get(serviceId);
    if (!checker) {
      throw new Error(`Health checker for ${serviceId} not initialized`);
    }

    const result = await checker.performHealthCheck();

    // Store result in database
    await this.storeHealthCheckResult(result);

    // Check if alerts should be triggered
    await this.checkAlertThresholds(result);

    return result;
  }

  private calculateOverallHealth(serviceResults: any[]): HealthStatus {
    const criticalServices = serviceResults.filter((s) => {
      const service = this.services.get(s.serviceId);
      return service?.criticality === 'critical';
    });

    // If any critical service is unhealthy, overall health is degraded/unhealthy
    if (criticalServices.some((s) => s.status === 'unhealthy')) {
      return 'unhealthy';
    }

    if (criticalServices.some((s) => s.status === 'degraded')) {
      return 'degraded';
    }

    // Check overall service health
    const healthyCount = serviceResults.filter(
      (s) => s.status === 'healthy',
    ).length;
    const totalCount = serviceResults.length;
    const healthyPercentage = (healthyCount / totalCount) * 100;

    if (healthyPercentage >= 95) return 'healthy';
    if (healthyPercentage >= 80) return 'degraded';
    return 'unhealthy';
  }

  private async generateCostBreakdown(
    costs: CostTrackingData[],
  ): Promise<ServiceCostBreakdown[]> {
    const serviceGroups = costs.reduce(
      (groups, cost) => {
        if (!groups[cost.serviceId]) {
          groups[cost.serviceId] = [];
        }
        groups[cost.serviceId].push(cost);
        return groups;
      },
      {} as Record<string, CostTrackingData[]>,
    );

    const totalCost = costs.reduce((sum, cost) => sum + cost.cost, 0);

    return Object.entries(serviceGroups).map(([serviceId, serviceCosts]) => {
      const service = this.services.get(serviceId);
      const serviceTotalCost = serviceCosts.reduce(
        (sum, cost) => sum + cost.cost,
        0,
      );
      const previousPeriodCost = 0; // TODO: Implement historical cost lookup

      return {
        serviceId,
        serviceName: service?.name || serviceId,
        cost: serviceTotalCost,
        usage: this.aggregateUsageMetrics(serviceCosts),
        percentage: (serviceTotalCost / totalCost) * 100,
        trend: this.calculateTrend(serviceTotalCost, previousPeriodCost),
      };
    });
  }

  private calculateTrend(
    current: number,
    previous: number,
  ): 'up' | 'down' | 'stable' {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private aggregateUsageMetrics(costs: CostTrackingData[]): UsageMetrics {
    return costs.reduce((aggregated, cost) => {
      Object.entries(cost.usage).forEach(([key, value]) => {
        if (typeof value === 'number') {
          aggregated[key] = (aggregated[key] || 0) + value;
        }
      });
      return aggregated;
    }, {} as UsageMetrics);
  }

  private async calculateCostTrends(
    costs: CostTrackingData[],
  ): Promise<CostTrend[]> {
    // Group costs by day for trend analysis
    const dailyGroups = costs.reduce(
      (groups, cost) => {
        const day = cost.timestamp.toISOString().split('T')[0];
        if (!groups[day]) groups[day] = 0;
        groups[day] += cost.cost;
        return groups;
      },
      {} as Record<string, number>,
    );

    return Object.entries(dailyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, cost], index, array) => {
        const previousCost = index > 0 ? array[index - 1][1] : 0;
        const change =
          previousCost > 0 ? ((cost - previousCost) / previousCost) * 100 : 0;

        return { period, cost, change };
      });
  }

  private async generateOptimizationSuggestions(
    costs: CostTrackingData[],
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze high-cost services for optimization opportunities
    const serviceBreakdown = await this.generateCostBreakdown(costs);
    const highCostServices = serviceBreakdown
      .filter((service) => service.cost > 10) // $10+ daily cost
      .sort((a, b) => b.cost - a.cost);

    for (const service of highCostServices) {
      const serviceConfig = this.services.get(service.serviceId);
      if (!serviceConfig) continue;

      // Suggest provider alternatives for AI services
      if (serviceConfig.category === 'ai_ml' && service.cost > 50) {
        suggestions.push({
          type: 'provider_switch',
          serviceId: service.serviceId,
          description: `Consider switching to a more cost-effective AI provider. Current cost: $${service.cost}/day`,
          potentialSavings: service.cost * 0.3, // Estimate 30% savings
          effort: 'medium',
          impact: 'high',
        });
      }

      // Suggest caching for high-volume services
      if (service.usage.requests && service.usage.requests > 1000) {
        suggestions.push({
          type: 'caching',
          serviceId: service.serviceId,
          description: `Implement response caching to reduce API calls. Current: ${service.usage.requests} requests/day`,
          potentialSavings: service.cost * 0.2, // Estimate 20% savings
          effort: 'low',
          impact: 'medium',
        });
      }
    }

    return suggestions;
  }

  private async generateCostProjections(
    costs: CostTrackingData[],
  ): Promise<CostProjection[]> {
    const currentDailyCost = costs.reduce((sum, cost) => sum + cost.cost, 0);

    return [
      {
        period: 'week',
        projectedCost: currentDailyCost * 7,
        confidence: 85,
        factors: ['current_usage_rate', 'weekly_patterns'],
      },
      {
        period: 'month',
        projectedCost: currentDailyCost * 30 * 1.1, // 10% growth factor
        confidence: 75,
        factors: ['seasonal_variations', 'business_growth', 'usage_patterns'],
      },
      {
        period: 'quarter',
        projectedCost: currentDailyCost * 90 * 1.25, // 25% growth factor
        confidence: 60,
        factors: ['business_expansion', 'feature_releases', 'market_changes'],
      },
    ];
  }

  private startHealthCheckLoop(): void {
    setInterval(async () => {
      for (const [serviceId, service] of this.services) {
        if (service.monitoring.healthCheckInterval > 0) {
          try {
            await this.checkServiceHealth(serviceId);
          } catch (error) {
            console.error(`Health check failed for ${serviceId}:`, error);
          }
        }
      }
    }, 60000); // Run every minute, but each service has its own interval
  }

  private startCostTrackingLoop(): void {
    setInterval(async () => {
      try {
        await this.costTracker.collectCosts();
      } catch (error) {
        console.error('Cost tracking failed:', error);
      }
    }, 300000); // Every 5 minutes
  }

  private startPerformanceTrackingLoop(): void {
    setInterval(async () => {
      try {
        await this.performanceTracker.collectMetrics();
      } catch (error) {
        console.error('Performance tracking failed:', error);
      }
    }, 60000); // Every minute
  }

  private startAlertProcessingLoop(): void {
    setInterval(async () => {
      try {
        await this.alertManager.processAlerts();
      } catch (error) {
        console.error('Alert processing failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async storeHealthCheckResult(
    result: HealthCheckResult,
  ): Promise<void> {
    await this.supabase.from('service_health_checks').insert({
      service_id: result.serviceId,
      status: result.status,
      response_time: result.responseTime,
      details: result.details,
      metrics: result.metrics,
      timestamp: result.timestamp.toISOString(),
    });
  }

  private async checkAlertThresholds(result: HealthCheckResult): Promise<void> {
    const service = this.services.get(result.serviceId);
    if (!service?.monitoring.alerting.enabled) return;

    const thresholds = service.monitoring.alerting.thresholds;
    const alerts: Alert[] = [];

    // Check response time threshold
    if (result.responseTime > thresholds.responseTime) {
      alerts.push({
        id: `${result.serviceId}-response-time-${Date.now()}`,
        serviceId: result.serviceId,
        type: 'high_response_time',
        severity: 'warning',
        message: `${service.name} response time (${result.responseTime}ms) exceeds threshold (${thresholds.responseTime}ms)`,
        details: {
          responseTime: result.responseTime,
          threshold: thresholds.responseTime,
        },
        timestamp: new Date(),
        acknowledged: false,
        resolved: false,
        escalated: false,
      });
    }

    // Check availability threshold
    if (result.metrics.availability < thresholds.availability) {
      alerts.push({
        id: `${result.serviceId}-availability-${Date.now()}`,
        serviceId: result.serviceId,
        type: 'low_availability',
        severity: 'error',
        message: `${service.name} availability (${result.metrics.availability}%) below threshold (${thresholds.availability}%)`,
        details: {
          availability: result.metrics.availability,
          threshold: thresholds.availability,
        },
        timestamp: new Date(),
        acknowledged: false,
        resolved: false,
        escalated: false,
      });
    }

    // Check error rate threshold
    if (result.metrics.errorRate > thresholds.errorRate) {
      alerts.push({
        id: `${result.serviceId}-error-rate-${Date.now()}`,
        serviceId: result.serviceId,
        type: 'high_error_rate',
        severity: 'warning',
        message: `${service.name} error rate (${result.metrics.errorRate}%) exceeds threshold (${thresholds.errorRate}%)`,
        details: {
          errorRate: result.metrics.errorRate,
          threshold: thresholds.errorRate,
        },
        timestamp: new Date(),
        acknowledged: false,
        resolved: false,
        escalated: false,
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.alertManager.createAlert(alert);
    }
  }

  private async setupAlert(alertConfig: any): Promise<void> {
    await this.supabase.from('alert_configurations').upsert({
      id: alertConfig.id,
      metric: alertConfig.metric,
      threshold: alertConfig.threshold,
      services: alertConfig.services,
      action: alertConfig.action,
      enabled: true,
      created_at: new Date().toISOString(),
    });
  }
}

// Supporting classes
class HealthChecker {
  constructor(private service: ServiceDefinition) {}

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let status: HealthStatus = 'unknown';
    let details: HealthDetails = {
      endpoint: this.service.endpoint || '',
      consecutiveFailures: await this.getConsecutiveFailures(),
    };

    try {
      if (this.service.healthCheckUrl) {
        const response = await this.makeHealthCheckRequest();
        status = this.determineHealthStatus(response);
        details.statusCode = response.status;
        details.version = response.headers.get('x-version') || undefined;
      } else {
        // Fallback health check based on service type
        status = await this.performServiceSpecificCheck();
      }
    } catch (error) {
      status = 'unhealthy';
      details.error = error.message;
      await this.incrementConsecutiveFailures();
    }

    const responseTime = Date.now() - startTime;
    const metrics = await this.collectServiceMetrics();

    return {
      serviceId: this.service.id,
      serviceName: this.service.name,
      timestamp: new Date(),
      status,
      responseTime,
      details,
      metrics,
    };
  }

  private async makeHealthCheckRequest(): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.service.configuration.timeout,
    );

    try {
      const headers: Record<string, string> = {};

      if (this.service.credentials.apiKey) {
        headers['Authorization'] = `Bearer ${this.service.credentials.apiKey}`;
      }

      const response = await fetch(this.service.healthCheckUrl!, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private determineHealthStatus(response: Response): HealthStatus {
    if (response.status >= 200 && response.status < 300) {
      return 'healthy';
    } else if (response.status >= 500) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  private async performServiceSpecificCheck(): Promise<HealthStatus> {
    // Implement service-specific health checks
    switch (this.service.type) {
      case 'database':
        return await this.checkDatabaseHealth();
      case 'ai_service':
        return await this.checkAIServiceHealth();
      default:
        return 'unknown';
    }
  }

  private async checkDatabaseHealth(): Promise<HealthStatus> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('health_check')
        .select('count')
        .limit(1);
      return error ? 'unhealthy' : 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  private async checkAIServiceHealth(): Promise<HealthStatus> {
    // Simple connectivity test for AI services
    return 'healthy'; // Placeholder - would implement actual checks
  }

  private async collectServiceMetrics(): Promise<ServiceMetrics> {
    // Collect service-specific metrics
    return {
      availability: await this.calculateAvailability(),
      averageResponseTime: await this.getAverageResponseTime(),
      requestCount: await this.getRequestCount(),
      errorCount: await this.getErrorCount(),
      errorRate: await this.calculateErrorRate(),
      throughput: await this.calculateThroughput(),
    };
  }

  private async calculateAvailability(): Promise<number> {
    // Calculate availability over last 24 hours
    return 99.5; // Placeholder
  }

  private async getAverageResponseTime(): Promise<number> {
    // Get average response time over last hour
    return 150; // Placeholder
  }

  private async getRequestCount(): Promise<number> {
    // Get request count for last hour
    return 100; // Placeholder
  }

  private async getErrorCount(): Promise<number> {
    // Get error count for last hour
    return 2; // Placeholder
  }

  private async calculateErrorRate(): Promise<number> {
    const requests = await this.getRequestCount();
    const errors = await this.getErrorCount();
    return requests > 0 ? (errors / requests) * 100 : 0;
  }

  private async calculateThroughput(): Promise<number> {
    // Requests per second
    const requests = await this.getRequestCount();
    return requests / 3600; // Convert hourly to per second
  }

  private async getConsecutiveFailures(): Promise<number> {
    // Get consecutive failures from database
    return 0; // Placeholder
  }

  private async incrementConsecutiveFailures(): Promise<void> {
    // Increment failure counter in database
  }
}

class PerformanceTracker {
  async collectMetrics(): Promise<void> {
    // Collect performance metrics for all services
  }
}

class CostTracker {
  async getCosts(options: {
    startDate: Date;
    endDate: Date;
    groupBy: string[];
  }): Promise<CostTrackingData[]> {
    // Get cost data from database
    return []; // Placeholder
  }

  async collectCosts(): Promise<void> {
    // Collect current cost information
  }
}

class AlertManager {
  async processAlerts(): Promise<void> {
    // Process pending alerts
  }

  async createAlert(alert: Alert): Promise<void> {
    // Create and send alert
  }
}

// Interface definitions
interface ServiceHealthReport {
  timestamp: Date;
  services: any[];
  overallHealth: HealthStatus;
  summary: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
  };
}

export default ThirdPartyMonitoringService;
