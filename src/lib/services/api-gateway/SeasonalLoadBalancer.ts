/**
 * Seasonal Load Balancer - Wedding Season Traffic Management
 * WS-250 - Peak season (May-September) traffic optimization
 */

import {
  BackendServer,
  LoadBalancingStrategy,
  GatewayRequest,
  WeddingSeason,
} from '@/types/api-gateway';

export class SeasonalLoadBalancer {
  private weddingSeasons: WeddingSeason[] = [
    {
      name: 'Peak Season',
      startMonth: 5,
      endMonth: 9,
      trafficMultiplier: 2.5,
      additionalServers: 3,
      specialHandling: true,
    },
    {
      name: 'Holiday Season',
      startMonth: 11,
      endMonth: 12,
      trafficMultiplier: 1.8,
      additionalServers: 2,
      specialHandling: true,
    },
  ];

  public isSeasonalOptimizationActive(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    return this.weddingSeasons.some(
      (season) =>
        currentMonth >= season.startMonth && currentMonth <= season.endMonth,
    );
  }

  public getCurrentSeasonMultiplier(): number {
    const currentMonth = new Date().getMonth() + 1;
    const activeSeason = this.weddingSeasons.find(
      (season) =>
        currentMonth >= season.startMonth && currentMonth <= season.endMonth,
    );
    return activeSeason?.trafficMultiplier || 1.0;
  }

  public async selectSeasonalServer(
    servers: BackendServer[],
    request: GatewayRequest,
  ): Promise<BackendServer> {
    const multiplier = this.getCurrentSeasonMultiplier();

    // Prioritize high-capacity servers during peak season
    if (multiplier > 1.5) {
      const highCapacityServers = servers.filter(
        (s) =>
          s.capabilities.includes('high-capacity') ||
          s.capabilities.includes('wedding-optimized'),
      );

      if (highCapacityServers.length > 0) {
        return highCapacityServers.reduce((best, current) =>
          current.healthScore > best.healthScore ? current : best,
        );
      }
    }

    return servers[0]; // Fallback to first available server
  }
}

export const seasonalLoadBalancer = new SeasonalLoadBalancer();
