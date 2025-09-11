import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const subscriptionService = new SubscriptionService(supabase, stripe);

export interface FeatureGate {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  required_plan: string;
  usage_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentPlan?: string;
  requiredPlan?: string;
  currentUsage?: number;
  usageLimit?: number;
  usagePercentage?: number;
}

export interface PlanHierarchy {
  [key: string]: number;
}

// Plan hierarchy for upgrade path determination - Enhanced for WS-131
const PLAN_HIERARCHY: PlanHierarchy = {
  free: 0,
  starter: 1,
  professional: 2,
  premium: 3,
  enterprise: 4,
};

export class FeatureGateService {
  /**
   * Check if user has access to a specific feature
   */
  static async checkFeatureAccess(
    userId: string,
    featureKey: string,
    currentUsage?: number,
  ): Promise<FeatureAccessResult> {
    try {
      // Get feature gate configuration
      const featureGate = await this.getFeatureGate(featureKey);
      if (!featureGate) {
        // Feature not gated, allow access
        return { hasAccess: true };
      }

      if (!featureGate.is_active) {
        return {
          hasAccess: false,
          reason: 'Feature is currently disabled',
        };
      }

      // Get user's subscription
      const subscription =
        await subscriptionService.getUserSubscription(userId);

      if (!subscription || subscription.status !== 'active') {
        // No active subscription - check if feature requires paid plan
        if (featureGate.required_plan !== 'free') {
          return {
            hasAccess: false,
            reason: 'Feature requires an active subscription',
            upgradeRequired: true,
            currentPlan: 'free',
            requiredPlan: featureGate.required_plan,
          };
        }
      }

      // Get current user's plan
      const currentPlan = subscription
        ? await subscriptionService.getPlan(subscription.plan_id)
        : await subscriptionService.getPlanByName('free');

      if (!currentPlan) {
        return {
          hasAccess: false,
          reason: 'Unable to determine user plan',
        };
      }

      // Check plan level access
      const userPlanLevel =
        PLAN_HIERARCHY[currentPlan.name.toLowerCase()] ?? -1;
      const requiredPlanLevel =
        PLAN_HIERARCHY[featureGate.required_plan.toLowerCase()] ?? 0;

      if (userPlanLevel < requiredPlanLevel) {
        return {
          hasAccess: false,
          reason: `Feature requires ${featureGate.required_plan} plan or higher`,
          upgradeRequired: true,
          currentPlan: currentPlan.name.toLowerCase(),
          requiredPlan: featureGate.required_plan,
        };
      }

      // Check usage limits if applicable
      if (featureGate.usage_limit !== null && featureGate.usage_limit > 0) {
        let actualUsage = currentUsage;

        // If no usage provided, try to get it from usage metrics
        if (actualUsage === undefined) {
          actualUsage = await this.getCurrentUsageForFeature(
            userId,
            featureKey,
          );
        }

        if (
          actualUsage !== undefined &&
          actualUsage >= featureGate.usage_limit
        ) {
          const nextPlan = this.getNextPlanTier(currentPlan.name.toLowerCase());
          return {
            hasAccess: false,
            reason: `Usage limit exceeded: ${actualUsage}/${featureGate.usage_limit}`,
            upgradeRequired: nextPlan !== currentPlan.name.toLowerCase(),
            currentPlan: currentPlan.name.toLowerCase(),
            requiredPlan: nextPlan,
            currentUsage: actualUsage,
            usageLimit: featureGate.usage_limit,
            usagePercentage: Math.round(
              (actualUsage / featureGate.usage_limit) * 100,
            ),
          };
        }

        // Return usage information even when access is granted
        if (actualUsage !== undefined) {
          return {
            hasAccess: true,
            currentPlan: currentPlan.name.toLowerCase(),
            currentUsage: actualUsage,
            usageLimit: featureGate.usage_limit,
            usagePercentage: Math.round(
              (actualUsage / featureGate.usage_limit) * 100,
            ),
          };
        }
      }

      return {
        hasAccess: true,
        currentPlan: currentPlan.name.toLowerCase(),
      };
    } catch (error) {
      console.error('Error checking feature access:', error);
      return {
        hasAccess: false,
        reason: 'Error checking feature access',
      };
    }
  }

  /**
   * Check multiple features at once
   */
  static async checkMultipleFeatures(
    userId: string,
    features: Array<{ featureKey: string; currentUsage?: number }>,
  ): Promise<Record<string, FeatureAccessResult>> {
    const results: Record<string, FeatureAccessResult> = {};

    await Promise.all(
      features.map(async ({ featureKey, currentUsage }) => {
        results[featureKey] = await this.checkFeatureAccess(
          userId,
          featureKey,
          currentUsage,
        );
      }),
    );

    return results;
  }

  /**
   * Get user's plan limits for all features - Enhanced for WS-131 AI services
   */
  static async getUserPlanLimits(userId: string): Promise<{
    plan: string;
    limits: {
      clients: number;
      vendors: number;
      journeys: number;
      storage_gb: number;
      team_members: number;
      api_requests: number;
      email_sends: number;
      sms_sends: number;
      // AI service limits
      ai_photo_processing: number;
      ai_music_recommendations: number;
      ai_floral_suggestions: number;
      ai_faq_extraction: number;
      ai_chatbot_interactions: number;
    };
    usage: {
      clients: number;
      vendors: number;
      journeys: number;
      storage_gb: number;
      team_members: number;
      monthly_api_requests: number;
      email_sends: number;
      sms_sends: number;
      // AI service usage
      ai_photo_processing: number;
      ai_music_recommendations: number;
      ai_floral_suggestions: number;
      ai_faq_extraction: number;
      ai_chatbot_interactions: number;
    };
  } | null> {
    try {
      const subscription =
        await subscriptionService.getUserSubscription(userId);
      const usage = await subscriptionService.getUserUsage(userId);

      let plan;
      if (subscription) {
        plan = await subscriptionService.getPlan(subscription.plan_id);
      } else {
        plan = await subscriptionService.getPlanByName('free');
      }

      if (!plan) {
        return null;
      }

      return {
        plan: plan.name.toLowerCase(),
        limits: {
          ...plan.limits,
          // AI service limits based on plan tier
          ai_photo_processing: this.getAIServiceLimit(
            plan.name.toLowerCase(),
            'photo_processing',
          ),
          ai_music_recommendations: this.getAIServiceLimit(
            plan.name.toLowerCase(),
            'music_recommendations',
          ),
          ai_floral_suggestions: this.getAIServiceLimit(
            plan.name.toLowerCase(),
            'floral_suggestions',
          ),
          ai_faq_extraction: this.getAIServiceLimit(
            plan.name.toLowerCase(),
            'faq_extraction',
          ),
          ai_chatbot_interactions: this.getAIServiceLimit(
            plan.name.toLowerCase(),
            'chatbot_interactions',
          ),
        },
        usage: {
          clients: usage?.clients_count || 0,
          vendors: usage?.vendors_count || 0,
          journeys: usage?.journeys_count || 0,
          storage_gb: usage?.storage_used_gb || 0,
          team_members: usage?.team_members_count || 0,
          monthly_api_requests: usage?.monthly_api_requests || 0,
          email_sends: usage?.email_sends_count || 0,
          sms_sends: usage?.sms_sends_count || 0,
          // AI service usage
          ai_photo_processing: usage?.ai_photo_processing_count || 0,
          ai_music_recommendations: usage?.ai_music_recommendations_count || 0,
          ai_floral_suggestions: usage?.ai_floral_suggestions_count || 0,
          ai_faq_extraction: usage?.ai_faq_extractions_count || 0,
          ai_chatbot_interactions: usage?.chatbot_interactions_count || 0,
        },
      };
    } catch (error) {
      console.error('Error getting user plan limits:', error);
      return null;
    }
  }

  /**
   * Get recommended upgrade plan for a feature
   */
  static async getRecommendedUpgrade(
    userId: string,
    featureKey: string,
  ): Promise<{
    currentPlan: string;
    recommendedPlan: string;
    reason: string;
    benefits: string[];
  } | null> {
    try {
      const featureGate = await this.getFeatureGate(featureKey);
      if (!featureGate) {
        return null;
      }

      const subscription =
        await subscriptionService.getUserSubscription(userId);
      const currentPlan = subscription
        ? await subscriptionService.getPlan(subscription.plan_id)
        : await subscriptionService.getPlanByName('free');

      if (!currentPlan) {
        return null;
      }

      const requiredPlan = await subscriptionService.getPlanByName(
        featureGate.required_plan,
      );
      if (!requiredPlan) {
        return null;
      }

      const currentPlanLevel =
        PLAN_HIERARCHY[currentPlan.name.toLowerCase()] ?? -1;
      const requiredPlanLevel =
        PLAN_HIERARCHY[featureGate.required_plan.toLowerCase()] ?? 0;

      if (currentPlanLevel >= requiredPlanLevel) {
        return null; // User already has required plan or higher
      }

      return {
        currentPlan: currentPlan.name.toLowerCase(),
        recommendedPlan: requiredPlan.name.toLowerCase(),
        reason: `To access ${featureGate.feature_name}`,
        benefits: requiredPlan.features,
      };
    } catch (error) {
      console.error('Error getting recommended upgrade:', error);
      return null;
    }
  }

  /**
   * Get all feature gates for a plan
   */
  static async getPlanFeatures(planName: string): Promise<FeatureGate[]> {
    try {
      const { data, error } = await supabase
        .from('feature_gates')
        .select('*')
        .eq('is_active', true)
        .lte('required_plan', planName)
        .order('feature_key');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting plan features:', error);
      return [];
    }
  }

  /**
   * Check if user can perform an action that would increase usage
   */
  static async canIncreaseUsage(
    userId: string,
    featureKey: string,
    increment: number = 1,
  ): Promise<FeatureAccessResult> {
    try {
      const currentUsage = await this.getCurrentUsageForFeature(
        userId,
        featureKey,
      );
      if (currentUsage === undefined) {
        // If we can't determine current usage, allow the action
        return { hasAccess: true };
      }

      return this.checkFeatureAccess(
        userId,
        featureKey,
        currentUsage + increment,
      );
    } catch (error) {
      console.error('Error checking usage increase:', error);
      return {
        hasAccess: false,
        reason: 'Error checking usage limits',
      };
    }
  }

  /**
   * Get feature gate configuration by key
   */
  private static async getFeatureGate(
    featureKey: string,
  ): Promise<FeatureGate | null> {
    try {
      const { data, error } = await supabase
        .from('feature_gates')
        .select('*')
        .eq('feature_key', featureKey)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting feature gate:', error);
      return null;
    }
  }

  /**
   * Get current usage for a specific feature
   */
  private static async getCurrentUsageForFeature(
    userId: string,
    featureKey: string,
  ): Promise<number | undefined> {
    try {
      const usage = await subscriptionService.getUserUsage(userId);
      if (!usage) {
        return 0;
      }

      // Map feature keys to usage metrics - Enhanced for WS-131 AI services
      const featureUsageMap: Record<string, number> = {
        // Core platform features
        'clients:basic': usage.clients_count,
        'clients:advanced': usage.clients_count,
        'clients:unlimited': usage.clients_count,
        'vendors:basic': usage.vendors_count,
        'vendors:unlimited': usage.vendors_count,
        'journeys:basic': usage.journeys_count,
        'journeys:standard': usage.journeys_count,
        'journeys:advanced': usage.journeys_count,
        'team:basic': usage.team_members_count,
        'team:starter': usage.team_members_count,
        'team:professional': usage.team_members_count,
        'team:premium': usage.team_members_count,
        'team:enterprise': usage.team_members_count,
        'storage:basic': usage.storage_used_gb,
        'storage:starter': usage.storage_used_gb,
        'storage:professional': usage.storage_used_gb,
        'storage:premium': usage.storage_used_gb,
        'storage:unlimited': usage.storage_used_gb,
        'api:basic': usage.monthly_api_requests,
        'api:starter': usage.monthly_api_requests,
        'api:professional': usage.monthly_api_requests,
        'api:premium': usage.monthly_api_requests,
        'api:unlimited': usage.monthly_api_requests,
        'communications:basic': usage.email_sends_count,
        'communications:starter':
          usage.email_sends_count + usage.sms_sends_count,
        'communications:professional':
          usage.email_sends_count + usage.sms_sends_count,
        'communications:premium':
          usage.email_sends_count + usage.sms_sends_count,
        'communications:unlimited':
          usage.email_sends_count + usage.sms_sends_count,

        // AI Services - WS-131 Integration Points for Teams A, B, C
        'ai:photo_processing': usage.ai_photo_processing_count || 0,
        'ai:photo_unlimited': usage.ai_photo_processing_count || 0,
        'ai:music_recommendations': usage.ai_music_recommendations_count || 0,
        'ai:music_unlimited': usage.ai_music_recommendations_count || 0,
        'ai:floral_suggestions': usage.ai_floral_suggestions_count || 0,
        'ai:floral_unlimited': usage.ai_floral_suggestions_count || 0,
        'ai:faq_extraction': usage.ai_faq_extractions_count || 0,
        'ai:chatbot': usage.chatbot_interactions_count || 0,
        'ai:chatbot_unlimited': usage.chatbot_interactions_count || 0,
        'ai:basic':
          (usage.ai_photo_processing_count || 0) +
          (usage.ai_music_recommendations_count || 0) +
          (usage.ai_floral_suggestions_count || 0) +
          (usage.ai_faq_extractions_count || 0) +
          (usage.chatbot_interactions_count || 0),
      };

      return featureUsageMap[featureKey];
    } catch (error) {
      console.error('Error getting current usage:', error);
      return undefined;
    }
  }

  /**
   * Get next plan tier for upgrade recommendations - Enhanced for WS-131
   */
  private static getNextPlanTier(currentPlan: string): string {
    const planProgression: Record<string, string> = {
      free: 'starter',
      starter: 'professional',
      professional: 'premium',
      premium: 'enterprise',
      enterprise: 'enterprise',
    };

    return planProgression[currentPlan] || 'starter';
  }

  /**
   * Get AI service limits based on plan tier - WS-131 Integration
   */
  private static getAIServiceLimit(planTier: string, service: string): number {
    // AI service limits per plan - matches WS-131 pricing structure
    const aiLimits: Record<string, Record<string, number>> = {
      starter: {
        photo_processing: 0, // No AI access on starter
        music_recommendations: 0,
        floral_suggestions: 0,
        faq_extraction: 0,
        chatbot_interactions: 0,
      },
      professional: {
        photo_processing: 100, // Professional limits
        music_recommendations: 50,
        floral_suggestions: 50,
        faq_extraction: 20,
        chatbot_interactions: 500,
      },
      premium: {
        photo_processing: -1, // Unlimited for premium
        music_recommendations: -1,
        floral_suggestions: -1,
        faq_extraction: 100, // Higher limit for FAQ
        chatbot_interactions: 2000, // Higher chatbot limit
      },
      enterprise: {
        photo_processing: -1, // Unlimited for enterprise
        music_recommendations: -1,
        floral_suggestions: -1,
        faq_extraction: -1, // Unlimited FAQ
        chatbot_interactions: -1, // Unlimited chatbot
      },
    };

    return aiLimits[planTier]?.[service] || 0;
  }
}

/**
 * Middleware helper for route protection
 */
export async function requireFeature(
  request: NextRequest,
  userId: string,
  featureKey: string,
  currentUsage?: number,
): Promise<{
  allowed: boolean;
  response?: Response;
}> {
  const accessCheck = await FeatureGateService.checkFeatureAccess(
    userId,
    featureKey,
    currentUsage,
  );

  if (!accessCheck.hasAccess) {
    const featureGate = await FeatureGateService['getFeatureGate'](featureKey);

    const response = new Response(
      JSON.stringify({
        error: 'Feature access denied',
        code: 'FEATURE_ACCESS_DENIED',
        reason: accessCheck.reason,
        upgradeRequired: accessCheck.upgradeRequired,
        currentPlan: accessCheck.currentPlan,
        requiredPlan: accessCheck.requiredPlan,
        featureName: featureGate?.feature_name,
        featureDescription: featureGate?.description,
        currentUsage: accessCheck.currentUsage,
        usageLimit: accessCheck.usageLimit,
        usagePercentage: accessCheck.usagePercentage,
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Feature-Gate': featureKey,
          'X-Upgrade-Required': accessCheck.upgradeRequired ? 'true' : 'false',
          'X-Current-Plan': accessCheck.currentPlan || 'unknown',
          'X-Required-Plan': accessCheck.requiredPlan || 'unknown',
        },
      },
    );

    return { allowed: false, response };
  }

  return { allowed: true };
}

/**
 * Higher-order function for API route protection
 */
export function withFeatureGate(
  featureKey: string,
  options?: {
    checkUsageIncrease?: boolean;
    increment?: number;
  },
) {
  return function <T extends Function>(handler: T): T {
    return (async (request: NextRequest, ...args: any[]) => {
      // Extract user ID from request (implement based on your auth system)
      const userId = await getUserIdFromRequest(request);

      if (!userId) {
        return new Response(
          JSON.stringify({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      let gateCheck;
      if (options?.checkUsageIncrease) {
        gateCheck = await FeatureGateService.canIncreaseUsage(
          userId,
          featureKey,
          options.increment || 1,
        );
      } else {
        gateCheck = await FeatureGateService.checkFeatureAccess(
          userId,
          featureKey,
        );
      }

      if (!gateCheck.hasAccess) {
        const featureGate =
          await FeatureGateService['getFeatureGate'](featureKey);

        return new Response(
          JSON.stringify({
            error: 'Feature access denied',
            code: 'FEATURE_ACCESS_DENIED',
            reason: gateCheck.reason,
            upgradeRequired: gateCheck.upgradeRequired,
            currentPlan: gateCheck.currentPlan,
            requiredPlan: gateCheck.requiredPlan,
            featureName: featureGate?.feature_name,
            currentUsage: gateCheck.currentUsage,
            usageLimit: gateCheck.usageLimit,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'X-Feature-Gate': featureKey,
              'X-Upgrade-Required': gateCheck.upgradeRequired
                ? 'true'
                : 'false',
            },
          },
        );
      }

      // Add user and plan info to request for downstream usage
      request.headers.set('X-User-ID', userId);
      request.headers.set('X-User-Plan', gateCheck.currentPlan || 'free');

      return handler(request, ...args);
    }) as unknown as T;
  };
}

/**
 * React hook helper for client-side feature checking
 */
export interface UseFeatureGateResult {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  currentPlan: string | null;
  requiredPlan: string | null;
  upgradeRequired: boolean;
  currentUsage?: number;
  usageLimit?: number;
  usagePercentage?: number;
}

/**
 * Extract user ID from request (implement based on your auth system)
 */
async function getUserIdFromRequest(
  request: NextRequest,
): Promise<string | null> {
  try {
    // Check for API key in header
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      const userId = await validateApiKeyAndGetUser(apiKey);
      if (userId) return userId;
    }

    // Check for JWT token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userId = await validateJWTAndGetUser(token);
      if (userId) return userId;
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get('supabase-auth-token');
    if (sessionCookie) {
      const userId = await validateSessionAndGetUser(sessionCookie.value);
      if (userId) return userId;
    }

    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Validate API key and return user ID
 */
async function validateApiKeyAndGetUser(
  apiKey: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id, is_active, expires_at')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Check if key is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data.user_id;
  } catch {
    return null;
  }
}

/**
 * Validate JWT token and return user ID
 */
async function validateJWTAndGetUser(token: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) return null;

    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Validate session cookie and return user ID
 */
async function validateSessionAndGetUser(
  sessionToken: string,
): Promise<string | null> {
  try {
    // Implement session validation logic based on your setup
    // This is a placeholder implementation
    return null;
  } catch {
    return null;
  }
}
