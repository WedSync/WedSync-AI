import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';
import { Redis } from 'ioredis';

export interface ReferralCode {
  id: string;
  supplier_id: string;
  code: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
}

export interface ReferralConversion {
  id: string;
  referral_code: string;
  referred_user_id: string;
  conversion_type:
    | 'signup_started'
    | 'account_created'
    | 'premium_upgrade'
    | 'first_booking';
  conversion_value?: number;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AttributionData {
  totalReferrals: number;
  successfulConversions: number;
  conversionRate: number;
  totalRevenue: number;
  averageOrderValue: number;
  topConvertingChannels: Array<{
    channel: string;
    conversions: number;
    revenue: number;
  }>;
}

export interface FraudDetectionResult {
  isValid: boolean;
  riskScore: number;
  flaggedReasons: string[];
  recommendation: 'allow' | 'review' | 'block';
}

export class ReferralTrackingService {
  private supabase: ReturnType<typeof createClient>;
  private redis: Redis | null = null;
  private readonly FRAUD_THRESHOLD = 0.7;
  private readonly MAX_REFERRALS_PER_DAY = 10;
  private readonly MIN_TIME_BETWEEN_REFERRALS = 300000; // 5 minutes

  constructor(supabaseClient?: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient || createClient();

    // Initialize Redis for rate limiting and fraud detection
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  /**
   * Generate a unique referral code for a supplier
   */
  async generateReferralCode(
    supplierId: string,
    customCode?: string,
  ): Promise<string> {
    try {
      // Check if supplier already has an active code
      const { data: existingCode } = await this.supabase
        .from('referral_codes')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .single();

      if (existingCode && !customCode) {
        return existingCode.code;
      }

      // Generate new code
      const code = customCode || this.generateUniqueCode(supplierId);

      // Validate code uniqueness
      const { data: existing } = await this.supabase
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (existing) {
        throw new Error('Referral code already exists');
      }

      // Create new referral code
      const { data, error } = await this.supabase
        .from('referral_codes')
        .insert({
          supplier_id: supplierId,
          code,
          is_active: true,
          usage_count: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return code;
    } catch (error) {
      console.error('Error generating referral code:', error);
      throw new Error('Failed to generate referral code');
    }
  }

  /**
   * Track a conversion event
   */
  async trackConversion(
    code: string,
    conversionType: ReferralConversion['conversion_type'],
    referredUserId: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Validate referral code exists and is active
      const { data: referralCode } = await this.supabase
        .from('referral_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (!referralCode) {
        throw new Error('Invalid or inactive referral code');
      }

      // Fraud detection
      const fraudResult = await this.validateReferral(
        code,
        ipAddress || '',
        userAgent || '',
      );
      if (!fraudResult.isValid && fraudResult.recommendation === 'block') {
        throw new Error('Referral blocked due to suspicious activity');
      }

      // Check for duplicate conversions
      const { data: existingConversion } = await this.supabase
        .from('referral_conversions')
        .select('id')
        .eq('referral_code', code)
        .eq('referred_user_id', referredUserId)
        .eq('conversion_type', conversionType)
        .single();

      if (existingConversion) {
        return; // Already tracked this conversion
      }

      // Create conversion record
      const { error } = await this.supabase
        .from('referral_conversions')
        .insert({
          referral_code: code,
          referred_user_id: referredUserId,
          conversion_type: conversionType,
          metadata,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update referral code usage count
      await this.supabase
        .from('referral_codes')
        .update({
          usage_count: referralCode.usage_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referralCode.id);

      // Update gamification points
      await this.updateGamificationPoints(
        referralCode.supplier_id,
        conversionType,
      );
    } catch (error) {
      console.error('Error tracking conversion:', error);
      throw error;
    }
  }

  /**
   * Get attribution metrics for a supplier
   */
  async getAttributionMetrics(supplierId: string): Promise<AttributionData> {
    try {
      const { data: conversions } = await this.supabase
        .from('referral_conversions')
        .select(
          `
          *,
          referral_codes!inner(supplier_id)
        `,
        )
        .eq('referral_codes.supplier_id', supplierId);

      if (!conversions || conversions.length === 0) {
        return {
          totalReferrals: 0,
          successfulConversions: 0,
          conversionRate: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          topConvertingChannels: [],
        };
      }

      const totalConversions = conversions.length;
      const premiumUpgrades = conversions.filter(
        (c) => c.conversion_type === 'premium_upgrade',
      );
      const totalRevenue = premiumUpgrades.reduce((sum, conversion) => {
        return sum + (conversion.conversion_value || 0);
      }, 0);

      // Calculate channel performance (simplified - would need more metadata)
      const channelMap = new Map<
        string,
        { conversions: number; revenue: number }
      >();
      conversions.forEach((conversion) => {
        const channel = conversion.metadata?.channel || 'direct';
        const existing = channelMap.get(channel) || {
          conversions: 0,
          revenue: 0,
        };
        channelMap.set(channel, {
          conversions: existing.conversions + 1,
          revenue: existing.revenue + (conversion.conversion_value || 0),
        });
      });

      const topConvertingChannels = Array.from(channelMap.entries())
        .map(([channel, data]) => ({ channel, ...data }))
        .sort((a, b) => b.conversions - a.conversions);

      return {
        totalReferrals: totalConversions,
        successfulConversions: totalConversions,
        conversionRate: 1.0, // All tracked conversions are successful by definition
        totalRevenue,
        averageOrderValue: totalRevenue / Math.max(premiumUpgrades.length, 1),
        topConvertingChannels,
      };
    } catch (error) {
      console.error('Error getting attribution metrics:', error);
      throw error;
    }
  }

  /**
   * Validate referral for fraud detection
   */
  async validateReferral(
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<FraudDetectionResult> {
    const result: FraudDetectionResult = {
      isValid: true,
      riskScore: 0,
      flaggedReasons: [],
      recommendation: 'allow',
    };

    try {
      // Check rate limiting
      if (this.redis) {
        const key = `referral_rate_limit:${ipAddress}`;
        const count = await this.redis.incr(key);
        if (count === 1) {
          await this.redis.expire(key, 86400); // 24 hours
        }

        if (count > this.MAX_REFERRALS_PER_DAY) {
          result.riskScore += 0.5;
          result.flaggedReasons.push('Exceeded daily referral limit from IP');
        }
      }

      // Check for suspicious patterns
      const recentConversions = await this.supabase
        .from('referral_conversions')
        .select('*')
        .eq('ip_address', ipAddress)
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('created_at', { ascending: false });

      if (recentConversions.data && recentConversions.data.length > 5) {
        result.riskScore += 0.3;
        result.flaggedReasons.push(
          'Multiple conversions from same IP in 24 hours',
        );
      }

      // Check for bot-like user agents
      if (this.isSuspiciousUserAgent(userAgent)) {
        result.riskScore += 0.4;
        result.flaggedReasons.push('Suspicious user agent pattern');
      }

      // Determine final recommendation
      if (result.riskScore >= this.FRAUD_THRESHOLD) {
        result.isValid = false;
        result.recommendation = result.riskScore >= 0.9 ? 'block' : 'review';
      }
    } catch (error) {
      console.error('Error in fraud validation:', error);
      // On error, allow the referral but flag for review
      result.recommendation = 'review';
      result.flaggedReasons.push('Fraud detection system error');
    }

    return result;
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(
    category?: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all' = 'monthly',
  ): Promise<
    Array<{
      supplier_id: string;
      supplier_name: string;
      points: number;
      referral_count: number;
      conversion_count: number;
      rank: number;
    }>
  > {
    try {
      let dateFilter = '';
      const now = new Date();

      switch (timeframe) {
        case 'daily':
          dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'weekly':
          const weekStart = new Date(now.setDate(now.getDate() - 7));
          dateFilter = weekStart.toISOString();
          break;
        case 'monthly':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = monthStart.toISOString();
          break;
        default:
          dateFilter = '1900-01-01T00:00:00.000Z';
      }

      const { data } = await this.supabase
        .from('gamification_metrics')
        .select(
          `
          supplier_id,
          points,
          user_profiles!inner(
            organization_name
          )
        `,
        )
        .gte('updated_at', dateFilter)
        .order('points', { ascending: false })
        .limit(100);

      if (!data) return [];

      return data.map((item, index) => ({
        supplier_id: item.supplier_id,
        supplier_name:
          (item.user_profiles as any)?.organization_name || 'Unknown',
        points: item.points,
        referral_count: 0, // Would need to join with referral data
        conversion_count: 0, // Would need to join with conversion data
        rank: index + 1,
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private generateUniqueCode(supplierId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const supplierHash = supplierId.substring(0, 4);
    return `${supplierHash.toUpperCase()}${timestamp}${random}`.toUpperCase();
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /postman/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private async updateGamificationPoints(
    supplierId: string,
    conversionType: string,
  ): Promise<void> {
    const pointsMap = {
      signup_started: 50,
      account_created: 100,
      premium_upgrade: 500,
      first_booking: 1000,
    };

    const points = pointsMap[conversionType as keyof typeof pointsMap] || 0;

    if (points > 0) {
      await this.supabase.from('gamification_metrics').upsert(
        {
          supplier_id: supplierId,
          points: points,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'supplier_id',
        },
      );
    }
  }
}

export default ReferralTrackingService;
