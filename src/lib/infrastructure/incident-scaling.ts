import { createClient } from '@supabase/supabase-js';

export interface ScalingEvent {
  id: string;
  incident_id: string;
  trigger_type: 'load' | 'severity' | 'manual';
  scaling_action: 'scale_up' | 'scale_down' | 'failover';
  resource_type: 'compute' | 'database' | 'storage' | 'network';
  target_capacity: number;
  current_capacity: number;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  venue_id: string;
  metadata: Record<string, any>;
}

export interface ScalingRule {
  id: string;
  name: string;
  trigger_metric:
    | 'cpu_usage'
    | 'memory_usage'
    | 'response_time'
    | 'incident_severity'
    | 'concurrent_users';
  threshold_value: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  scaling_action: ScalingEvent['scaling_action'];
  resource_type: ScalingEvent['resource_type'];
  scale_factor: number;
  cooldown_period: number; // seconds
  is_active: boolean;
  priority: number;
}

export interface InfrastructureMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  response_time: number;
  concurrent_users: number;
  database_connections: number;
  error_rate: number;
  timestamp: Date;
}

export class IncidentScalingManager {
  private supabase;
  private scalingRules: ScalingRule[] = [];
  private activeScalingEvents: Map<string, ScalingEvent> = new Map();
  private lastMetrics: InfrastructureMetrics | null = null;
  private scalingCooldowns: Map<string, Date> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    this.scalingRules = [
      // Critical incident auto-scaling
      {
        id: 'critical-incident-compute',
        name: 'Critical Incident Compute Scale-Up',
        trigger_metric: 'incident_severity',
        threshold_value: 4, // Critical = 4
        comparison: 'equals',
        scaling_action: 'scale_up',
        resource_type: 'compute',
        scale_factor: 2.0,
        cooldown_period: 300, // 5 minutes
        is_active: true,
        priority: 1,
      },
      // High load auto-scaling
      {
        id: 'high-cpu-scale-up',
        name: 'High CPU Usage Scale-Up',
        trigger_metric: 'cpu_usage',
        threshold_value: 80,
        comparison: 'greater_than',
        scaling_action: 'scale_up',
        resource_type: 'compute',
        scale_factor: 1.5,
        cooldown_period: 180, // 3 minutes
        is_active: true,
        priority: 2,
      },
      // Response time degradation
      {
        id: 'slow-response-scale-up',
        name: 'Slow Response Time Scale-Up',
        trigger_metric: 'response_time',
        threshold_value: 2000, // 2 seconds
        comparison: 'greater_than',
        scaling_action: 'scale_up',
        resource_type: 'compute',
        scale_factor: 1.3,
        cooldown_period: 120, // 2 minutes
        is_active: true,
        priority: 3,
      },
      // Database scaling for heavy incident reporting
      {
        id: 'high-db-connections',
        name: 'High Database Connection Scale-Up',
        trigger_metric: 'concurrent_users',
        threshold_value: 500,
        comparison: 'greater_than',
        scaling_action: 'scale_up',
        resource_type: 'database',
        scale_factor: 1.5,
        cooldown_period: 600, // 10 minutes
        is_active: true,
        priority: 2,
      },
      // Scale down during low usage
      {
        id: 'low-cpu-scale-down',
        name: 'Low CPU Usage Scale-Down',
        trigger_metric: 'cpu_usage',
        threshold_value: 20,
        comparison: 'less_than',
        scaling_action: 'scale_down',
        resource_type: 'compute',
        scale_factor: 0.8,
        cooldown_period: 900, // 15 minutes
        is_active: true,
        priority: 5,
      },
    ];
  }

  /**
   * Evaluates current metrics and triggers scaling if rules are met
   */
  async evaluateScalingRules(
    metrics: InfrastructureMetrics,
    incidentSeverity?: number,
    venueId?: string,
  ): Promise<ScalingEvent[]> {
    this.lastMetrics = metrics;
    const triggeredEvents: ScalingEvent[] = [];

    // Sort rules by priority
    const sortedRules = [...this.scalingRules].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const rule of sortedRules) {
      if (!rule.is_active) continue;

      // Check cooldown period
      const cooldownKey = `${rule.id}_${rule.resource_type}`;
      const lastScaling = this.scalingCooldowns.get(cooldownKey);
      if (
        lastScaling &&
        Date.now() - lastScaling.getTime() < rule.cooldown_period * 1000
      ) {
        continue;
      }

      let metricValue: number;
      switch (rule.trigger_metric) {
        case 'cpu_usage':
          metricValue = metrics.cpu_usage;
          break;
        case 'memory_usage':
          metricValue = metrics.memory_usage;
          break;
        case 'response_time':
          metricValue = metrics.response_time;
          break;
        case 'concurrent_users':
          metricValue = metrics.concurrent_users;
          break;
        case 'incident_severity':
          metricValue = incidentSeverity || 0;
          break;
        default:
          continue;
      }

      // Check if rule threshold is met
      const thresholdMet = this.evaluateThreshold(
        metricValue,
        rule.threshold_value,
        rule.comparison,
      );

      if (thresholdMet) {
        const scalingEvent = await this.createScalingEvent(
          rule,
          metrics,
          venueId,
        );
        triggeredEvents.push(scalingEvent);

        // Set cooldown
        this.scalingCooldowns.set(cooldownKey, new Date());
      }
    }

    return triggeredEvents;
  }

  private evaluateThreshold(
    value: number,
    threshold: number,
    comparison: string,
  ): boolean {
    switch (comparison) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      default:
        return false;
    }
  }

  private async createScalingEvent(
    rule: ScalingRule,
    metrics: InfrastructureMetrics,
    venueId?: string,
  ): Promise<ScalingEvent> {
    const currentCapacity = await this.getCurrentCapacity(rule.resource_type);
    const targetCapacity = Math.floor(currentCapacity * rule.scale_factor);

    const scalingEvent: ScalingEvent = {
      id: `scaling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incident_id: `auto_scaling_${rule.id}`,
      trigger_type: 'load',
      scaling_action: rule.scaling_action,
      resource_type: rule.resource_type,
      target_capacity: targetCapacity,
      current_capacity: currentCapacity,
      timestamp: new Date(),
      status: 'pending',
      venue_id: venueId || 'global',
      metadata: {
        rule_id: rule.id,
        rule_name: rule.name,
        trigger_metric: rule.trigger_metric,
        metric_value: this.getMetricValue(metrics, rule.trigger_metric),
        threshold_value: rule.threshold_value,
        scale_factor: rule.scale_factor,
      },
    };

    // Store the scaling event
    this.activeScalingEvents.set(scalingEvent.id, scalingEvent);

    // Execute scaling action
    await this.executeScalingAction(scalingEvent);

    return scalingEvent;
  }

  private getMetricValue(
    metrics: InfrastructureMetrics,
    metric: string,
  ): number {
    switch (metric) {
      case 'cpu_usage':
        return metrics.cpu_usage;
      case 'memory_usage':
        return metrics.memory_usage;
      case 'response_time':
        return metrics.response_time;
      case 'concurrent_users':
        return metrics.concurrent_users;
      default:
        return 0;
    }
  }

  /**
   * Executes the actual scaling action (would integrate with cloud provider APIs)
   */
  private async executeScalingAction(event: ScalingEvent): Promise<void> {
    try {
      event.status = 'in_progress';

      // Simulate scaling action (in production, this would call AWS/GCP/Azure APIs)
      console.log(
        `Executing scaling action: ${event.scaling_action} for ${event.resource_type}`,
      );
      console.log(
        `Scaling from ${event.current_capacity} to ${event.target_capacity}`,
      );

      // Wedding-specific scaling considerations
      if (event.venue_id !== 'global') {
        await this.notifyVenueOfScaling(event);
      }

      // Simulate API calls based on resource type
      switch (event.resource_type) {
        case 'compute':
          await this.scaleComputeResources(event);
          break;
        case 'database':
          await this.scaleDatabaseResources(event);
          break;
        case 'storage':
          await this.scaleStorageResources(event);
          break;
        case 'network':
          await this.scaleNetworkResources(event);
          break;
      }

      event.status = 'completed';
      console.log(`Scaling completed successfully: ${event.id}`);
    } catch (error) {
      event.status = 'failed';
      console.error(`Scaling failed: ${event.id}`, error);

      // Implement retry logic for failed scaling
      await this.handleScalingFailure(event, error);
    }
  }

  private async scaleComputeResources(event: ScalingEvent): Promise<void> {
    // Simulate compute scaling (e.g., AWS Auto Scaling, Kubernetes HPA)
    const delay = Math.random() * 2000 + 1000; // 1-3 second delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Log scaling action
    console.log(
      `Compute scaling: ${event.current_capacity} → ${event.target_capacity} instances`,
    );

    // In production, this would call:
    // - AWS Auto Scaling Groups
    // - Kubernetes Horizontal Pod Autoscaler
    // - Docker Swarm scaling
    // - Serverless function concurrency limits
  }

  private async scaleDatabaseResources(event: ScalingEvent): Promise<void> {
    // Simulate database scaling
    const delay = Math.random() * 5000 + 2000; // 2-7 second delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    console.log(
      `Database scaling: ${event.current_capacity} → ${event.target_capacity} connections`,
    );

    // In production, this would call:
    // - AWS RDS scaling
    // - Supabase connection pool adjustments
    // - PostgreSQL connection limits
    // - Read replica provisioning
  }

  private async scaleStorageResources(event: ScalingEvent): Promise<void> {
    // Simulate storage scaling
    const delay = Math.random() * 3000 + 1000; // 1-4 second delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    console.log(
      `Storage scaling: ${event.current_capacity} → ${event.target_capacity} GB`,
    );
  }

  private async scaleNetworkResources(event: ScalingEvent): Promise<void> {
    // Simulate network scaling
    const delay = Math.random() * 2000 + 500; // 0.5-2.5 second delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    console.log(
      `Network scaling: ${event.current_capacity} → ${event.target_capacity} Mbps`,
    );
  }

  private async getCurrentCapacity(resourceType: string): Promise<number> {
    // Mock current capacity - in production, this would query actual infrastructure
    switch (resourceType) {
      case 'compute':
        return 4; // instances
      case 'database':
        return 100; // connections
      case 'storage':
        return 500; // GB
      case 'network':
        return 1000; // Mbps
      default:
        return 1;
    }
  }

  private async notifyVenueOfScaling(event: ScalingEvent): Promise<void> {
    try {
      // Notify venue security team of infrastructure scaling during incidents
      const notification = {
        venue_id: event.venue_id,
        type: 'infrastructure_scaling',
        title: 'System Scaling in Progress',
        message: `Infrastructure is automatically scaling ${event.scaling_action} to handle increased load during incident response.`,
        metadata: {
          resource_type: event.resource_type,
          scaling_event_id: event.id,
        },
      };

      // In production, send via push notification, email, or SMS
      console.log('Venue notification sent:', notification);
    } catch (error) {
      console.error('Failed to notify venue of scaling:', error);
    }
  }

  private async handleScalingFailure(
    event: ScalingEvent,
    error: any,
  ): Promise<void> {
    console.error(`Scaling failure handled for event ${event.id}:`, error);

    // Implement retry logic
    const retryCount = event.metadata.retry_count || 0;
    if (retryCount < 3) {
      event.metadata.retry_count = retryCount + 1;
      event.status = 'pending';

      // Retry after delay
      setTimeout(
        () => {
          this.executeScalingAction(event);
        },
        Math.pow(2, retryCount) * 1000,
      ); // Exponential backoff
    }
  }

  /**
   * Manual scaling trigger for emergency situations
   */
  async triggerEmergencyScaling(
    venueId: string,
    resourceType: ScalingEvent['resource_type'],
    scaleFactor: number,
  ): Promise<ScalingEvent> {
    const currentCapacity = await this.getCurrentCapacity(resourceType);
    const targetCapacity = Math.floor(currentCapacity * scaleFactor);

    const emergencyEvent: ScalingEvent = {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incident_id: 'manual_emergency',
      trigger_type: 'manual',
      scaling_action: scaleFactor > 1 ? 'scale_up' : 'scale_down',
      resource_type: resourceType,
      target_capacity: targetCapacity,
      current_capacity: currentCapacity,
      timestamp: new Date(),
      status: 'pending',
      venue_id: venueId,
      metadata: {
        emergency_trigger: true,
        scale_factor: scaleFactor,
        triggered_by: 'emergency_response_system',
      },
    };

    await this.executeScalingAction(emergencyEvent);
    return emergencyEvent;
  }

  /**
   * Get current scaling status and metrics
   */
  getScalingStatus(): {
    activeEvents: ScalingEvent[];
    lastMetrics: InfrastructureMetrics | null;
    activeRules: ScalingRule[];
  } {
    return {
      activeEvents: Array.from(this.activeScalingEvents.values()),
      lastMetrics: this.lastMetrics,
      activeRules: this.scalingRules.filter((rule) => rule.is_active),
    };
  }

  /**
   * Update scaling rules (for admin configuration)
   */
  updateScalingRule(ruleId: string, updates: Partial<ScalingRule>): boolean {
    const ruleIndex = this.scalingRules.findIndex((rule) => rule.id === ruleId);
    if (ruleIndex === -1) return false;

    this.scalingRules[ruleIndex] = {
      ...this.scalingRules[ruleIndex],
      ...updates,
    };
    return true;
  }

  /**
   * Add new scaling rule
   */
  addScalingRule(rule: Omit<ScalingRule, 'id'>): ScalingRule {
    const newRule: ScalingRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.scalingRules.push(newRule);
    return newRule;
  }
}

// Factory function for creating scaling manager
export function createIncidentScalingManager(): IncidentScalingManager {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return new IncidentScalingManager(supabaseUrl, supabaseKey);
}

// Webhook handler for external monitoring systems
export async function handleScalingWebhook(webhookData: {
  metric: string;
  value: number;
  venue_id?: string;
  incident_severity?: number;
}): Promise<ScalingEvent[]> {
  const manager = createIncidentScalingManager();

  // Convert webhook data to metrics format
  const metrics: InfrastructureMetrics = {
    cpu_usage: webhookData.metric === 'cpu' ? webhookData.value : 0,
    memory_usage: webhookData.metric === 'memory' ? webhookData.value : 0,
    disk_usage: 0,
    network_io: 0,
    response_time:
      webhookData.metric === 'response_time' ? webhookData.value : 0,
    concurrent_users: webhookData.metric === 'users' ? webhookData.value : 0,
    database_connections: 0,
    error_rate: 0,
    timestamp: new Date(),
  };

  return await manager.evaluateScalingRules(
    metrics,
    webhookData.incident_severity,
    webhookData.venue_id,
  );
}
