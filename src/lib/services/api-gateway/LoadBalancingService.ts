/**
 * Load Balancing Service - Advanced Load Balancing Algorithms
 * WS-250 - Dynamic load balancing with wedding industry optimizations
 */

import {
  BackendServer,
  LoadBalancingStrategy,
  LoadBalancerConfig,
  GatewayRequest,
  WeddingContext,
  VendorTier,
  SeasonalConfig,
} from '@/types/api-gateway';

export class LoadBalancingService {
  private servers: Map<string, BackendServer> = new Map();
  private serverGroups: Map<string, string[]> = new Map(); // group -> server IDs
  private loadBalancerConfig: LoadBalancerConfig;
  private currentRoundRobinIndex = 0;
  private consistentHashRing: Map<number, string> = new Map();
  private requestCounts: Map<string, number> = new Map();

  // Wedding-specific configurations
  private readonly WEDDING_SEASON_MONTHS = [5, 6, 7, 8, 9]; // May through September
  private readonly SATURDAY_TRAFFIC_MULTIPLIER = 3;
  private readonly TIER_PRIORITY_WEIGHTS: Record<VendorTier, number> = {
    enterprise: 100,
    scale: 80,
    professional: 60,
    starter: 40,
    free: 20,
  };

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.loadBalancerConfig = {
      strategy: 'round-robin',
      healthCheckInterval: 30000,
      maxRetries: 3,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      weddingSeasonAdjustments: true,
      ...config,
    };

    this.initializeServerGroups();
    this.startLoadMonitoring();
  }

  /**
   * Select the best backend server based on strategy and context
   */
  public async selectServer(
    request: GatewayRequest,
    availableServers: BackendServer[],
    strategy?: LoadBalancingStrategy,
  ): Promise<BackendServer> {
    if (availableServers.length === 0) {
      throw new Error('No available servers for load balancing');
    }

    const selectedStrategy =
      strategy || this.determineOptimalStrategy(request, availableServers);

    console.log(
      `[LoadBalancingService] Using strategy: ${selectedStrategy} for ${request.method} ${request.path}`,
    );

    switch (selectedStrategy) {
      case 'round-robin':
        return this.roundRobinSelection(availableServers, request);

      case 'least-connections':
        return this.leastConnectionsSelection(availableServers, request);

      case 'weighted-round-robin':
        return this.weightedRoundRobinSelection(availableServers, request);

      case 'ip-hash':
        return this.ipHashSelection(availableServers, request);

      case 'least-response-time':
        return this.leastResponseTimeSelection(availableServers, request);

      case 'wedding-priority':
        return this.weddingPrioritySelection(availableServers, request);

      default:
        return this.roundRobinSelection(availableServers, request);
    }
  }

  /**
   * Register a backend server
   */
  public registerServer(server: BackendServer): void {
    this.servers.set(server.id, server);
    this.updateConsistentHashRing();
    this.requestCounts.set(server.id, 0);

    // Add to appropriate server groups
    this.addToServerGroups(server);

    console.log(
      `[LoadBalancingService] Registered server: ${server.id} (Region: ${server.region})`,
    );
  }

  /**
   * Remove a server from load balancing
   */
  public removeServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      this.servers.delete(serverId);
      this.removeFromServerGroups(serverId);
      this.updateConsistentHashRing();
      this.requestCounts.delete(serverId);

      console.log(`[LoadBalancingService] Removed server: ${serverId}`);
    }
  }

  /**
   * Update server health metrics
   */
  public updateServerMetrics(
    serverId: string,
    metrics: Partial<BackendServer>,
  ): void {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server, metrics);

      // Update request count if provided
      if (metrics.currentConnections !== undefined) {
        this.requestCounts.set(serverId, metrics.currentConnections);
      }
    }
  }

  /**
   * Get load balancing statistics
   */
  public getLoadBalancingStats(): LoadBalancingStats {
    const servers = Array.from(this.servers.values());

    return {
      totalServers: servers.length,
      healthyServers: servers.filter((s) => s.status === 'healthy').length,
      averageLoad: this.calculateAverageLoad(servers),
      peakLoad: this.calculatePeakLoad(servers),
      distributionEfficiency: this.calculateDistributionEfficiency(),
      weddingOptimizationActive: this.isWeddingOptimizationActive(),
      serverGroups: Object.fromEntries(this.serverGroups.entries()),
    };
  }

  /**
   * Get recommended server capacity for current demand
   */
  public getCapacityRecommendation(): CapacityRecommendation {
    const currentLoad = this.getCurrentSystemLoad();
    const isWeddingSeason = this.isWeddingSeason();
    const isSaturday = this.isSaturday();

    let recommendedCapacity = Math.ceil(currentLoad * 1.2); // 20% buffer

    if (isWeddingSeason) {
      recommendedCapacity *= 1.5; // 50% more during wedding season
    }

    if (isSaturday) {
      recommendedCapacity *= this.SATURDAY_TRAFFIC_MULTIPLIER;
    }

    return {
      currentCapacity: this.servers.size,
      recommendedCapacity,
      utilizationRate: currentLoad / this.servers.size,
      needsScaling: recommendedCapacity > this.servers.size,
      scalingUrgency: this.calculateScalingUrgency(currentLoad),
      weddingContextActive: isWeddingSeason || isSaturday,
    };
  }

  // ========================================
  // Load Balancing Strategies
  // ========================================

  private roundRobinSelection(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    // Apply wedding context weighting
    const weightedServers = this.applyWeddingWeighting(servers, request);

    this.currentRoundRobinIndex =
      (this.currentRoundRobinIndex + 1) % weightedServers.length;
    const selectedServer = weightedServers[this.currentRoundRobinIndex];

    this.incrementRequestCount(selectedServer.id);
    return selectedServer;
  }

  private leastConnectionsSelection(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    const weddingAdjustedServers = this.applyWeddingWeighting(servers, request);

    const selectedServer = weddingAdjustedServers.reduce((best, current) => {
      const currentAdjustedConnections = this.getAdjustedConnectionCount(
        current,
        request,
      );
      const bestAdjustedConnections = this.getAdjustedConnectionCount(
        best,
        request,
      );

      return currentAdjustedConnections < bestAdjustedConnections
        ? current
        : best;
    });

    this.incrementRequestCount(selectedServer.id);
    return selectedServer;
  }

  private weightedRoundRobinSelection(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    const weightedPool: BackendServer[] = [];

    servers.forEach((server) => {
      const baseWeight = server.weight || 1;
      const weddingMultiplier = this.getWeddingWeightMultiplier(
        server,
        request,
      );
      const finalWeight = Math.floor(baseWeight * weddingMultiplier);

      // Add server to pool multiple times based on weight
      for (let i = 0; i < finalWeight; i++) {
        weightedPool.push(server);
      }
    });

    if (weightedPool.length === 0) {
      return servers[0]; // Fallback
    }

    this.currentRoundRobinIndex =
      (this.currentRoundRobinIndex + 1) % weightedPool.length;
    const selectedServer = weightedPool[this.currentRoundRobinIndex];

    this.incrementRequestCount(selectedServer.id);
    return selectedServer;
  }

  private ipHashSelection(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    const hash = this.hashString(request.ip);
    const serverIndex = hash % servers.length;
    const selectedServer = servers[serverIndex];

    this.incrementRequestCount(selectedServer.id);
    return selectedServer;
  }

  private leastResponseTimeSelection(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    const weddingAdjustedServers = this.applyWeddingWeighting(servers, request);

    const selectedServer = weddingAdjustedServers.reduce((fastest, current) => {
      const currentResponseTime = this.getAdjustedResponseTime(
        current,
        request,
      );
      const fastestResponseTime = this.getAdjustedResponseTime(
        fastest,
        request,
      );

      return currentResponseTime < fastestResponseTime ? current : fastest;
    });

    this.incrementRequestCount(selectedServer.id);
    return selectedServer;
  }

  private weddingPrioritySelection(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    // Special wedding-optimized selection algorithm
    const weddingOptimizedServers = servers.filter(
      (s) =>
        s.capabilities.includes('wedding-optimized') ||
        s.capabilities.includes('high-availability'),
    );

    const targetServers =
      weddingOptimizedServers.length > 0 ? weddingOptimizedServers : servers;

    // Score servers based on wedding-specific criteria
    const scoredServers = targetServers.map((server) => ({
      server,
      score: this.calculateWeddingScore(server, request),
    }));

    // Sort by score (highest first) and select the best
    scoredServers.sort((a, b) => b.score - a.score);
    const selectedServer = scoredServers[0].server;

    this.incrementRequestCount(selectedServer.id);
    return selectedServer;
  }

  // ========================================
  // Wedding-Specific Optimization Methods
  // ========================================

  private determineOptimalStrategy(
    request: GatewayRequest,
    servers: BackendServer[],
  ): LoadBalancingStrategy {
    // Wedding day protection - use most reliable strategy
    if (this.isSaturday() && request.weddingContext?.isWeddingCritical) {
      return 'wedding-priority';
    }

    // High-tier vendors get better response times
    if (
      request.vendorContext?.tier === 'enterprise' ||
      request.vendorContext?.tier === 'scale'
    ) {
      return 'least-response-time';
    }

    // Peak wedding season optimization
    if (this.isWeddingSeason()) {
      return 'least-connections'; // Better for high traffic
    }

    // Session affinity for certain endpoints
    if (
      request.path.includes('/client-portal') ||
      request.path.includes('/dashboard')
    ) {
      return 'ip-hash';
    }

    // Default strategy
    return this.loadBalancerConfig.strategy;
  }

  private applyWeddingWeighting(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer[] {
    if (!request.weddingContext && !this.isWeddingOptimizationActive()) {
      return servers;
    }

    return servers
      .map((server) => ({
        server,
        weight: this.getWeddingWeightMultiplier(server, request),
      }))
      .filter((item) => item.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .map((item) => item.server);
  }

  private getWeddingWeightMultiplier(
    server: BackendServer,
    request: GatewayRequest,
  ): number {
    let multiplier = 1;

    // Wedding-optimized servers get priority
    if (server.capabilities.includes('wedding-optimized')) {
      multiplier *= 2;
    }

    // High availability servers are preferred on Saturdays
    if (
      this.isSaturday() &&
      server.capabilities.includes('high-availability')
    ) {
      multiplier *= 1.5;
    }

    // Health score adjustment
    multiplier *= server.healthScore / 100;

    // Vendor tier priority
    if (request.vendorContext?.tier) {
      const tierWeight = this.TIER_PRIORITY_WEIGHTS[request.vendorContext.tier];
      multiplier *= 1 + tierWeight / 100;
    }

    // Regional preference during peak hours
    if (server.region === 'primary' && this.isPeakHour()) {
      multiplier *= 1.3;
    }

    return Math.max(0.1, multiplier); // Minimum weight
  }

  private calculateWeddingScore(
    server: BackendServer,
    request: GatewayRequest,
  ): number {
    let score = server.healthScore || 50; // Base health score

    // Wedding optimization bonuses
    if (server.capabilities.includes('wedding-optimized')) score += 20;
    if (server.capabilities.includes('high-availability')) score += 15;
    if (server.capabilities.includes('real-time')) score += 10;

    // Performance bonuses
    score += Math.max(0, 50 - server.responseTime); // Lower response time = higher score
    score += Math.max(0, 20 - server.currentConnections); // Lower connections = higher score

    // Regional proximity bonus
    if (server.region === 'primary') score += 10;

    // Vendor tier matching
    if (request.vendorContext?.tier) {
      const tierBonus =
        this.TIER_PRIORITY_WEIGHTS[request.vendorContext.tier] / 5;
      score += tierBonus;
    }

    // Saturday protection bonus
    if (this.isSaturday() && request.weddingContext?.saturdayProtection) {
      score += 25;
    }

    return Math.max(0, score);
  }

  private getAdjustedConnectionCount(
    server: BackendServer,
    request: GatewayRequest,
  ): number {
    let connections = server.currentConnections;

    // Adjust for wedding context
    if (request.weddingContext?.isWeddingCritical && this.isSaturday()) {
      connections *= 0.8; // Prefer servers with wedding-critical traffic
    }

    return connections;
  }

  private getAdjustedResponseTime(
    server: BackendServer,
    request: GatewayRequest,
  ): number {
    let responseTime = server.responseTime;

    // Wedding priority adjustment
    if (server.capabilities.includes('wedding-optimized')) {
      responseTime *= 0.9;
    }

    // Health score adjustment
    responseTime *= (200 - server.healthScore) / 100;

    return responseTime;
  }

  // ========================================
  // Utility Methods
  // ========================================

  private isWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return this.WEDDING_SEASON_MONTHS.includes(currentMonth);
  }

  private isSaturday(): boolean {
    return new Date().getDay() === 6;
  }

  private isPeakHour(): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17; // 9 AM to 5 PM
  }

  private isWeddingOptimizationActive(): boolean {
    return (
      this.isWeddingSeason() ||
      this.isSaturday() ||
      this.loadBalancerConfig.weddingSeasonAdjustments
    );
  }

  private initializeServerGroups(): void {
    this.serverGroups.set('wedding-optimized', []);
    this.serverGroups.set('high-availability', []);
    this.serverGroups.set('standard', []);
    this.serverGroups.set('development', []);
  }

  private addToServerGroups(server: BackendServer): void {
    // Add server to appropriate groups based on capabilities
    if (server.capabilities.includes('wedding-optimized')) {
      this.serverGroups.get('wedding-optimized')?.push(server.id);
    } else if (server.capabilities.includes('high-availability')) {
      this.serverGroups.get('high-availability')?.push(server.id);
    } else {
      this.serverGroups.get('standard')?.push(server.id);
    }
  }

  private removeFromServerGroups(serverId: string): void {
    this.serverGroups.forEach((serverIds, groupName) => {
      const index = serverIds.indexOf(serverId);
      if (index > -1) {
        serverIds.splice(index, 1);
      }
    });
  }

  private updateConsistentHashRing(): void {
    this.consistentHashRing.clear();

    const virtualNodes = 150; // Virtual nodes per server
    Array.from(this.servers.keys()).forEach((serverId) => {
      for (let i = 0; i < virtualNodes; i++) {
        const hash = this.hashString(`${serverId}-${i}`);
        this.consistentHashRing.set(hash, serverId);
      }
    });
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private incrementRequestCount(serverId: string): void {
    const current = this.requestCounts.get(serverId) || 0;
    this.requestCounts.set(serverId, current + 1);
  }

  private calculateAverageLoad(servers: BackendServer[]): number {
    if (servers.length === 0) return 0;

    const totalConnections = servers.reduce(
      (sum, server) => sum + server.currentConnections,
      0,
    );
    return totalConnections / servers.length;
  }

  private calculatePeakLoad(servers: BackendServer[]): number {
    return Math.max(...servers.map((s) => s.currentConnections), 0);
  }

  private calculateDistributionEfficiency(): number {
    const requestCounts = Array.from(this.requestCounts.values());
    if (requestCounts.length === 0) return 1;

    const mean =
      requestCounts.reduce((sum, count) => sum + count, 0) /
      requestCounts.length;
    const variance =
      requestCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
      requestCounts.length;

    // Lower variance = better distribution efficiency
    return Math.max(0, 1 - variance / Math.max(mean, 1));
  }

  private getCurrentSystemLoad(): number {
    const servers = Array.from(this.servers.values());
    return servers.reduce(
      (total, server) => total + server.currentConnections,
      0,
    );
  }

  private calculateScalingUrgency(
    currentLoad: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const utilizationRate = currentLoad / this.servers.size;

    if (utilizationRate > 0.9) return 'critical';
    if (utilizationRate > 0.75) return 'high';
    if (utilizationRate > 0.6) return 'medium';
    return 'low';
  }

  private startLoadMonitoring(): void {
    // Monitor load every minute
    setInterval(() => {
      this.monitorSystemLoad();
    }, 60000);
  }

  private monitorSystemLoad(): void {
    const stats = this.getLoadBalancingStats();
    const capacity = this.getCapacityRecommendation();

    // Log important metrics
    console.log(
      `[LoadBalancingService] System Load - Healthy: ${stats.healthyServers}/${stats.totalServers}, Avg Load: ${stats.averageLoad.toFixed(2)}, Efficiency: ${(stats.distributionEfficiency * 100).toFixed(1)}%`,
    );

    // Alert if scaling needed
    if (capacity.needsScaling && capacity.scalingUrgency === 'critical') {
      console.warn(
        `[LoadBalancingService] CRITICAL: System needs immediate scaling! Current: ${capacity.currentCapacity}, Recommended: ${capacity.recommendedCapacity}`,
      );
    }
  }
}

// Supporting interfaces
interface LoadBalancingStats {
  totalServers: number;
  healthyServers: number;
  averageLoad: number;
  peakLoad: number;
  distributionEfficiency: number;
  weddingOptimizationActive: boolean;
  serverGroups: Record<string, string[]>;
}

interface CapacityRecommendation {
  currentCapacity: number;
  recommendedCapacity: number;
  utilizationRate: number;
  needsScaling: boolean;
  scalingUrgency: 'low' | 'medium' | 'high' | 'critical';
  weddingContextActive: boolean;
}

// Singleton instance
export const loadBalancingService = new LoadBalancingService();
