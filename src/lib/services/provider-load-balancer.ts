// WS-155: Provider Load Balancing Service
import { createClient } from '@/lib/supabase/server';
import { DeliveryRateEnhancer } from './delivery-rate-enhancer';

interface Provider {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  priority: number;
  weight: number;
  capacity: number;
  currentLoad: number;
  rateLimit: {
    requests: number;
    period: number; // in seconds
  };
  costPerMessage: number;
  features: string[];
  isActive: boolean;
}

interface LoadBalancerConfig {
  algorithm:
    | 'round-robin'
    | 'weighted'
    | 'least-connections'
    | 'response-time'
    | 'cost-optimized';
  healthCheckInterval: number;
  failoverEnabled: boolean;
  stickySession: boolean;
  maxProviderLoad: number; // percentage
}

interface ProviderMetrics {
  providerId: string;
  messagesProcessed: number;
  successRate: number;
  averageLatency: number;
  errorRate: number;
  cost: number;
  lastUsed: Date;
}

export class ProviderLoadBalancer {
  private providers: Map<string, Provider>;
  private providerMetrics: Map<string, ProviderMetrics>;
  private config: LoadBalancerConfig;
  private roundRobinIndexes: Map<string, number>;
  private deliveryEnhancer: DeliveryRateEnhancer;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private rateLimitTracking: Map<string, any>;

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.providers = new Map();
    this.providerMetrics = new Map();
    this.roundRobinIndexes = new Map();
    this.deliveryEnhancer = new DeliveryRateEnhancer();
    this.rateLimitTracking = new Map();

    this.config = {
      algorithm: config?.algorithm || 'weighted',
      healthCheckInterval: config?.healthCheckInterval || 30000, // 30 seconds
      failoverEnabled: config?.failoverEnabled ?? true,
      stickySession: config?.stickySession ?? false,
      maxProviderLoad: config?.maxProviderLoad || 80, // 80% max load
    };

    this.initializeProviders();
    this.startHealthChecks();
  }

  private async initializeProviders() {
    // Email providers
    this.registerProvider({
      id: 'sendgrid-primary',
      name: 'SendGrid Primary',
      type: 'email',
      priority: 1,
      weight: 50,
      capacity: 10000,
      currentLoad: 0,
      rateLimit: { requests: 100, period: 1 },
      costPerMessage: 0.0008,
      features: ['templates', 'tracking', 'analytics'],
      isActive: true,
    });

    this.registerProvider({
      id: 'resend-primary',
      name: 'Resend Primary',
      type: 'email',
      priority: 2,
      weight: 30,
      capacity: 5000,
      currentLoad: 0,
      rateLimit: { requests: 50, period: 1 },
      costPerMessage: 0.001,
      features: ['templates', 'tracking'],
      isActive: true,
    });

    this.registerProvider({
      id: 'mailgun-backup',
      name: 'Mailgun Backup',
      type: 'email',
      priority: 3,
      weight: 20,
      capacity: 3000,
      currentLoad: 0,
      rateLimit: { requests: 30, period: 1 },
      costPerMessage: 0.0012,
      features: ['templates'],
      isActive: true,
    });

    // SMS providers
    this.registerProvider({
      id: 'twilio-primary',
      name: 'Twilio Primary',
      type: 'sms',
      priority: 1,
      weight: 60,
      capacity: 5000,
      currentLoad: 0,
      rateLimit: { requests: 50, period: 1 },
      costPerMessage: 0.0075,
      features: ['mms', 'international'],
      isActive: true,
    });

    this.registerProvider({
      id: 'vonage-backup',
      name: 'Vonage Backup',
      type: 'sms',
      priority: 2,
      weight: 40,
      capacity: 3000,
      currentLoad: 0,
      rateLimit: { requests: 30, period: 1 },
      costPerMessage: 0.008,
      features: ['international'],
      isActive: true,
    });
  }

  private registerProvider(provider: Provider) {
    this.providers.set(provider.id, provider);

    this.providerMetrics.set(provider.id, {
      providerId: provider.id,
      messagesProcessed: 0,
      successRate: 100,
      averageLatency: 0,
      errorRate: 0,
      cost: 0,
      lastUsed: new Date(),
    });

    this.rateLimitTracking.set(provider.id, {
      tokens: provider.rateLimit.requests,
      lastRefill: Date.now(),
    });
  }

  public async selectProvider(
    messageType: 'email' | 'sms' | 'push',
    messageSize: number = 1,
    recipientId?: string,
    features?: string[],
  ): Promise<string | null> {
    // Get eligible providers
    const eligibleProviders = this.getEligibleProviders(messageType, features);

    if (eligibleProviders.length === 0) {
      console.error(`No eligible providers for ${messageType}`);
      return null;
    }

    // Check for sticky session
    if (this.config.stickySession && recipientId) {
      const stickyProvider = await this.getStickyProvider(
        recipientId,
        messageType,
      );
      if (stickyProvider && this.isProviderAvailable(stickyProvider)) {
        return stickyProvider;
      }
    }

    // Select based on algorithm
    let selectedProvider: string | null = null;

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedProvider = this.selectRoundRobin(eligibleProviders);
        break;

      case 'weighted':
        selectedProvider = this.selectWeighted(eligibleProviders);
        break;

      case 'least-connections':
        selectedProvider = this.selectLeastConnections(eligibleProviders);
        break;

      case 'response-time':
        selectedProvider = this.selectByResponseTime(eligibleProviders);
        break;

      case 'cost-optimized':
        selectedProvider = this.selectByCost(eligibleProviders, messageSize);
        break;

      default:
        selectedProvider = this.selectWeighted(eligibleProviders);
    }

    // Update provider load
    if (selectedProvider) {
      const provider = this.providers.get(selectedProvider);
      if (provider) {
        provider.currentLoad += messageSize;

        // Store sticky session if enabled
        if (this.config.stickySession && recipientId) {
          await this.storeStickySession(
            recipientId,
            messageType,
            selectedProvider,
          );
        }
      }
    }

    return selectedProvider;
  }

  private getEligibleProviders(
    messageType: 'email' | 'sms' | 'push',
    requiredFeatures?: string[],
  ): Provider[] {
    const eligible: Provider[] = [];

    for (const [, provider] of this.providers) {
      if (
        provider.type === messageType &&
        provider.isActive &&
        this.isProviderHealthy(provider.id) &&
        this.hasCapacity(provider) &&
        this.checkRateLimit(provider.id) &&
        this.hasRequiredFeatures(provider, requiredFeatures)
      ) {
        eligible.push(provider);
      }
    }

    // Sort by priority
    return eligible.sort((a, b) => a.priority - b.priority);
  }

  private isProviderHealthy(providerId: string): boolean {
    const metrics = this.providerMetrics.get(providerId);

    if (!metrics) return false;

    // Provider is healthy if success rate > 90% and error rate < 5%
    return metrics.successRate > 90 && metrics.errorRate < 5;
  }

  private hasCapacity(provider: Provider): boolean {
    const loadPercentage = (provider.currentLoad / provider.capacity) * 100;
    return loadPercentage < this.config.maxProviderLoad;
  }

  private checkRateLimit(providerId: string): boolean {
    const tracking = this.rateLimitTracking.get(providerId);
    const provider = this.providers.get(providerId);

    if (!tracking || !provider) return false;

    // Refill tokens if needed
    const now = Date.now();
    const timeSinceRefill = (now - tracking.lastRefill) / 1000;

    if (timeSinceRefill >= provider.rateLimit.period) {
      tracking.tokens = provider.rateLimit.requests;
      tracking.lastRefill = now;
    }

    return tracking.tokens > 0;
  }

  private hasRequiredFeatures(
    provider: Provider,
    required?: string[],
  ): boolean {
    if (!required || required.length === 0) return true;

    return required.every((feature) => provider.features.includes(feature));
  }

  private selectRoundRobin(providers: Provider[]): string | null {
    const type = providers[0].type;
    let index = this.roundRobinIndexes.get(type) || 0;

    const provider = providers[index % providers.length];

    // Update index for next selection
    this.roundRobinIndexes.set(type, (index + 1) % providers.length);

    return provider.id;
  }

  private selectWeighted(providers: Provider[]): string | null {
    const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);

    if (totalWeight === 0) {
      return providers[0]?.id || null;
    }

    let random = Math.random() * totalWeight;

    for (const provider of providers) {
      random -= provider.weight;
      if (random <= 0) {
        return provider.id;
      }
    }

    return providers[providers.length - 1].id;
  }

  private selectLeastConnections(providers: Provider[]): string | null {
    let minLoad = Infinity;
    let selectedProvider: Provider | null = null;

    for (const provider of providers) {
      const loadPercentage = (provider.currentLoad / provider.capacity) * 100;

      if (loadPercentage < minLoad) {
        minLoad = loadPercentage;
        selectedProvider = provider;
      }
    }

    return selectedProvider?.id || null;
  }

  private selectByResponseTime(providers: Provider[]): string | null {
    let minLatency = Infinity;
    let selectedProvider: Provider | null = null;

    for (const provider of providers) {
      const metrics = this.providerMetrics.get(provider.id);

      if (metrics && metrics.averageLatency < minLatency) {
        minLatency = metrics.averageLatency;
        selectedProvider = provider;
      }
    }

    return selectedProvider?.id || providers[0]?.id || null;
  }

  private selectByCost(
    providers: Provider[],
    messageSize: number,
  ): string | null {
    let minCost = Infinity;
    let selectedProvider: Provider | null = null;

    for (const provider of providers) {
      const cost = provider.costPerMessage * messageSize;

      if (cost < minCost) {
        minCost = cost;
        selectedProvider = provider;
      }
    }

    return selectedProvider?.id || null;
  }

  private isProviderAvailable(providerId: string): boolean {
    const provider = this.providers.get(providerId);

    if (!provider || !provider.isActive) return false;

    return (
      this.hasCapacity(provider) &&
      this.checkRateLimit(providerId) &&
      this.isProviderHealthy(providerId)
    );
  }

  private async getStickyProvider(
    recipientId: string,
    messageType: string,
  ): Promise<string | null> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('sticky_sessions')
      .select('provider_id')
      .eq('recipient_id', recipientId)
      .eq('message_type', messageType)
      .single();

    return data?.provider_id || null;
  }

  private async storeStickySession(
    recipientId: string,
    messageType: string,
    providerId: string,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('sticky_sessions').upsert({
      recipient_id: recipientId,
      message_type: messageType,
      provider_id: providerId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    });
  }

  public async sendMessage(
    message: any,
    messageType: 'email' | 'sms' | 'push',
  ): Promise<any> {
    const providerId = await this.selectProvider(
      messageType,
      1,
      message.recipientId,
    );

    if (!providerId) {
      throw new Error(`No provider available for ${messageType}`);
    }

    const startTime = Date.now();

    try {
      // Send using selected provider
      const result = await this.sendWithProvider(message, providerId);

      // Update metrics
      await this.updateProviderMetrics(
        providerId,
        true,
        Date.now() - startTime,
      );

      // Consume rate limit token
      this.consumeRateLimit(providerId);

      return result;
    } catch (error) {
      // Update metrics for failure
      await this.updateProviderMetrics(
        providerId,
        false,
        Date.now() - startTime,
      );

      // Try failover if enabled
      if (this.config.failoverEnabled) {
        return await this.attemptFailover(message, messageType, [providerId]);
      }

      throw error;
    } finally {
      // Reduce load
      const provider = this.providers.get(providerId);
      if (provider) {
        provider.currentLoad = Math.max(0, provider.currentLoad - 1);
      }
    }
  }

  private async sendWithProvider(
    message: any,
    providerId: string,
  ): Promise<any> {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Route to appropriate provider API
    switch (providerId) {
      case 'sendgrid-primary':
        return await this.sendViaSendGrid(message);
      case 'resend-primary':
        return await this.sendViaResend(message);
      case 'mailgun-backup':
        return await this.sendViaMailgun(message);
      case 'twilio-primary':
        return await this.sendViaTwilio(message);
      case 'vonage-backup':
        return await this.sendViaVonage(message);
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }

  // Provider-specific sending methods (simplified)
  private async sendViaSendGrid(message: any): Promise<any> {
    // Simulate SendGrid API call
    return { success: true, messageId: `sg-${Date.now()}` };
  }

  private async sendViaResend(message: any): Promise<any> {
    // Simulate Resend API call
    return { success: true, messageId: `rs-${Date.now()}` };
  }

  private async sendViaMailgun(message: any): Promise<any> {
    // Simulate Mailgun API call
    return { success: true, messageId: `mg-${Date.now()}` };
  }

  private async sendViaTwilio(message: any): Promise<any> {
    // Simulate Twilio API call
    return { success: true, messageId: `tw-${Date.now()}` };
  }

  private async sendViaVonage(message: any): Promise<any> {
    // Simulate Vonage API call
    return { success: true, messageId: `vg-${Date.now()}` };
  }

  private async attemptFailover(
    message: any,
    messageType: 'email' | 'sms' | 'push',
    excludedProviders: string[],
  ): Promise<any> {
    const providers = this.getEligibleProviders(messageType).filter(
      (p) => !excludedProviders.includes(p.id),
    );

    for (const provider of providers) {
      try {
        const result = await this.sendWithProvider(message, provider.id);

        // Update metrics for successful failover
        await this.updateProviderMetrics(provider.id, true, 0);

        return result;
      } catch (error) {
        excludedProviders.push(provider.id);
        continue;
      }
    }

    throw new Error('All providers failed');
  }

  private consumeRateLimit(providerId: string) {
    const tracking = this.rateLimitTracking.get(providerId);

    if (tracking && tracking.tokens > 0) {
      tracking.tokens--;
    }
  }

  private async updateProviderMetrics(
    providerId: string,
    success: boolean,
    latency: number,
  ): Promise<void> {
    const metrics = this.providerMetrics.get(providerId);
    const provider = this.providers.get(providerId);

    if (!metrics || !provider) return;

    metrics.messagesProcessed++;
    metrics.lastUsed = new Date();

    // Update success rate (moving average)
    const alpha = 0.1;
    const currentSuccess = success ? 100 : 0;
    metrics.successRate =
      alpha * currentSuccess + (1 - alpha) * metrics.successRate;

    // Update error rate
    if (!success) {
      metrics.errorRate = alpha * 100 + (1 - alpha) * metrics.errorRate;
    } else {
      metrics.errorRate = (1 - alpha) * metrics.errorRate;
    }

    // Update latency (moving average)
    metrics.averageLatency =
      alpha * latency + (1 - alpha) * metrics.averageLatency;

    // Update cost
    metrics.cost += provider.costPerMessage;

    // Store metrics in database
    const supabase = await createClient();

    await supabase.from('provider_metrics').insert({
      provider_id: providerId,
      success,
      latency,
      cost: provider.costPerMessage,
      timestamp: new Date().toISOString(),
    });
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks() {
    for (const [providerId, provider] of this.providers) {
      try {
        const isHealthy = await this.checkProviderHealth(providerId);

        if (!isHealthy && provider.isActive) {
          console.warn(`Provider ${providerId} failed health check`);
          provider.isActive = false;
        } else if (isHealthy && !provider.isActive) {
          console.info(`Provider ${providerId} recovered`);
          provider.isActive = true;
        }
      } catch (error) {
        console.error(`Health check failed for ${providerId}:`, error);
      }
    }
  }

  private async checkProviderHealth(providerId: string): Promise<boolean> {
    // Implement provider-specific health check
    // This would ping the provider's API endpoint
    return Math.random() > 0.05; // 95% health check success rate
  }

  public getProviderStatus(): any {
    const status: any = {};

    for (const [id, provider] of this.providers) {
      const metrics = this.providerMetrics.get(id);
      const loadPercentage = (provider.currentLoad / provider.capacity) * 100;

      status[id] = {
        ...provider,
        metrics,
        loadPercentage,
        isHealthy: this.isProviderHealthy(id),
      };
    }

    return status;
  }

  public cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
