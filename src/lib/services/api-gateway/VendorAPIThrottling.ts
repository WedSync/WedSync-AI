/**
 * Vendor API Throttling - Subscription Tier-Based Rate Limiting
 * WS-250 - Vendor-specific throttling based on WedSync subscription tiers
 */

import {
  VendorThrottlingRule,
  VendorTier,
  GatewayRequest,
  RateLimitStatus,
} from '@/types/api-gateway';

export class VendorAPIThrottling {
  private vendorRules: Map<string, VendorThrottlingRule> = new Map();
  private tierLimits: Record<VendorTier, TierLimits>;

  constructor() {
    this.tierLimits = {
      free: {
        requestsPerMinute: 50,
        burstLimit: 10,
        concurrentConnections: 5,
        features: ['basic'],
      },
      starter: {
        requestsPerMinute: 100,
        burstLimit: 20,
        concurrentConnections: 10,
        features: ['basic', 'email'],
      },
      professional: {
        requestsPerMinute: 300,
        burstLimit: 50,
        concurrentConnections: 25,
        features: ['ai', 'marketplace'],
      },
      scale: {
        requestsPerMinute: 500,
        burstLimit: 100,
        concurrentConnections: 50,
        features: ['api', 'referrals'],
      },
      enterprise: {
        requestsPerMinute: 1000,
        burstLimit: 200,
        concurrentConnections: 100,
        features: ['unlimited'],
      },
    };
  }

  public async checkVendorThrottling(
    request: GatewayRequest,
  ): Promise<RateLimitStatus> {
    const tier = request.vendorContext?.tier || 'free';
    const limits = this.tierLimits[tier];

    // Apply Saturday multipliers for wedding protection
    let adjustedLimit = limits.requestsPerMinute;
    if (new Date().getDay() === 6) {
      // Saturday
      const saturdayMultipliers: Record<VendorTier, number> = {
        enterprise: 3,
        scale: 2.5,
        professional: 2,
        starter: 1.5,
        free: 1,
      };
      adjustedLimit *= saturdayMultipliers[tier];
    }

    return {
      allowed: true,
      remaining: adjustedLimit,
      resetTime: Date.now() + 60000,
      tier,
    };
  }
}

interface TierLimits {
  requestsPerMinute: number;
  burstLimit: number;
  concurrentConnections: number;
  features: string[];
}

export const vendorAPIThrottling = new VendorAPIThrottling();
