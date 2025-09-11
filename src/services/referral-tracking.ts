/**
 * WS-344 Team B - Supplier Referral & Gamification System
 * ReferralTrackingService - Core business logic for referral management
 * SECURITY: Comprehensive fraud prevention and validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { qrGeneratorService } from './qr-generator';
import {
  SupplierReferralRecord,
  ReferralLeaderboardRecord,
  FraudDetectionData,
  AuditLogEntry,
  CreateReferralLinkRequest,
  TrackConversionRequest,
  ReferralStatsQuery,
  LeaderboardQuery,
} from '../lib/validation/referral-schemas';

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class ReferralError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error | unknown,
  ) {
    super(message);
    this.name = 'ReferralError';
  }
}

export class FraudError extends ReferralError {
  constructor(
    message: string,
    public fraudType: string,
    cause?: Error | unknown,
  ) {
    super(message, 'FRAUD_DETECTED', cause);
    this.fraudType = fraudType;
  }
}

export class ValidationError extends ReferralError {
  constructor(message: string, cause?: Error | unknown) {
    super(message, 'VALIDATION_ERROR', cause);
  }
}

export class DatabaseError extends ReferralError {
  constructor(message: string, cause?: Error | unknown) {
    super(message, 'DATABASE_ERROR', cause);
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface ReferralStats {
  totalReferrals: number;
  activeTrials: number;
  paidConversions: number;
  conversionRate: number;
  monthsEarned: number;
  recentActivity: Array<{
    id: string;
    stage: string;
    referredEmail: string;
    createdAt: string;
    convertedAt?: string;
  }>;
}

export interface CurrentRankings {
  overallRank?: number;
  categoryRank?: number;
  geographicRank?: number;
  rankChange?: number;
  trend?: 'rising' | 'falling' | 'stable';
}

export interface MilestoneAchievement {
  title: string;
  description: string;
  rewardType: string;
  milestoneType: string;
}

export interface LeaderboardEntry {
  rank: number;
  supplierId: string;
  businessName: string;
  logoUrl?: string;
  businessLocation?: string;
  businessCategory?: string;
  paidConversions: number;
  conversionRate: number;
  monthsEarned: number;
  rankChange: number;
  trend: 'rising' | 'falling' | 'stable';
  badges?: string[];
}

export interface CreateReferralLinkResult {
  referralCode: string;
  customLink: string;
  qrCodeUrl?: string;
}

export interface TrackConversionResult {
  success: boolean;
  rewardEarned: boolean;
  milestoneAchieved?: MilestoneAchievement;
}

// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================

export class ReferralTrackingService {
  private readonly db: SupabaseClient;

  // Fraud prevention constants
  private static readonly MAX_REFERRALS_PER_IP_PER_DAY = 10;
  private static readonly MAX_REFERRALS_PER_USER_PER_HOUR = 5;
  private static readonly ATTRIBUTION_WINDOW_DAYS = 30;
  private static readonly MIN_TIME_BETWEEN_REFERRALS_MS = 60000; // 1 minute
  private static readonly SUSPICIOUS_USER_AGENT_PATTERNS = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /headless/i,
  ];

  constructor() {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  // =============================================================================
  // REFERRAL LINK CREATION
  // =============================================================================

  async createReferralLink(
    supplierId: string,
    requestData: CreateReferralLinkRequest,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      userId: string;
    },
  ): Promise<CreateReferralLinkResult> {
    try {
      // Rate limiting check
      await this.checkRateLimit(
        supplierId,
        'create_referral',
        metadata.ipAddress,
      );

      // Fraud prevention checks
      await this.performFraudChecks({
        supplierId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Generate unique referral code
      const referralCode = await this.generateUniqueReferralCode();

      // Build custom link with UTM parameters
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.com';
      const customLink = this.buildCustomLink(
        baseUrl,
        referralCode,
        requestData,
      );

      // Create referral record
      const referralData = {
        referrer_id: supplierId,
        referred_email: '', // Will be filled when conversion happens
        referral_code: referralCode,
        custom_link: customLink,
        source: requestData.source,
        stage: 'link_created' as const,
        utm_source: requestData.utmSource,
        utm_medium: requestData.utmMedium,
        utm_campaign: requestData.utmCampaign,
        custom_message: requestData.customMessage,
        ip_address: metadata.ipAddress,
        user_agent: metadata.userAgent,
        device_fingerprint: this.generateDeviceFingerprint(
          metadata.userAgent,
          metadata.ipAddress,
        ),
        primary_referrer: true,
        attribution_window: ReferralTrackingService.ATTRIBUTION_WINDOW_DAYS,
      };

      const { data: referral, error: insertError } = await this.db
        .from('supplier_referrals')
        .insert(referralData)
        .select()
        .single();

      if (insertError) {
        throw new DatabaseError('Failed to create referral link', insertError);
      }

      // Generate QR code if requested
      let qrCodeUrl: string | undefined;
      if (requestData.generateQR) {
        try {
          const qrResult = await qrGeneratorService.generateReferralQR(
            customLink,
            supplierId,
          );
          if (qrResult.success && qrResult.qrCodeUrl) {
            qrCodeUrl = qrResult.qrCodeUrl;

            // Update referral record with QR code URL
            await this.db
              .from('supplier_referrals')
              .update({ qr_code_url: qrCodeUrl })
              .eq('id', referral.id);
          }
        } catch (qrError) {
          // QR generation failure shouldn't fail the entire operation
          await this.auditLog({
            eventType: 'referral_created',
            referralId: referral.id,
            supplierId,
            eventData: { error: qrError },
            severity: 'medium',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          });
        }
      }

      // Log successful creation
      await this.auditLog({
        eventType: 'referral_created',
        referralId: referral.id,
        supplierId,
        eventData: {
          referralCode,
          source: requestData.source,
          hasQR: !!qrCodeUrl,
        },
        severity: 'low',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      return {
        referralCode,
        customLink,
        qrCodeUrl,
      };
    } catch (error) {
      await this.handleError('create_referral_link_failed', error, {
        supplierId,
        requestData,
        ...metadata,
      });
      throw error;
    }
  }

  // =============================================================================
  // CONVERSION TRACKING
  // =============================================================================

  async trackConversion(
    requestData: TrackConversionRequest,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<TrackConversionResult> {
    try {
      // Find referral record
      const { data: referral, error: findError } = await this.db
        .from('supplier_referrals')
        .select('*')
        .eq('referral_code', requestData.referralCode)
        .single();

      if (findError || !referral) {
        throw new ValidationError(
          `Invalid referral code: ${requestData.referralCode}`,
        );
      }

      // Fraud prevention checks
      await this.validateConversion(referral, requestData, metadata);

      // Check attribution window
      const daysSinceCreated =
        (Date.now() - new Date(referral.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreated > referral.attribution_window) {
        throw new ValidationError('Attribution window expired');
      }

      // Prevent stage regression
      if (
        this.getStageOrder(requestData.stage) <=
        this.getStageOrder(referral.stage)
      ) {
        throw new ValidationError('Cannot move to earlier stage');
      }

      // Prepare stage update data
      const updates: any = {
        stage: requestData.stage,
        source_details: requestData.sourceDetails,
        updated_at: new Date().toISOString(),
      };

      // Add timestamp for stage
      const stageTimestamp = new Date().toISOString();
      switch (requestData.stage) {
        case 'link_clicked':
          updates.clicked_at = stageTimestamp;
          break;
        case 'signup_started':
          updates.signed_up_at = stageTimestamp;
          if (requestData.referredId)
            updates.referred_id = requestData.referredId;
          break;
        case 'trial_active':
          updates.trial_started_at = stageTimestamp;
          break;
        case 'first_payment':
          updates.converted_at = stageTimestamp;
          updates.referrer_reward = '1_month_free';
          if (requestData.referredId)
            updates.referred_id = requestData.referredId;
          break;
        case 'reward_issued':
          updates.reward_issued_at = stageTimestamp;
          break;
      }

      // Update referral record
      const { error: updateError } = await this.db
        .from('supplier_referrals')
        .update(updates)
        .eq('id', referral.id);

      if (updateError) {
        throw new DatabaseError('Failed to update referral stage', updateError);
      }

      // Process rewards and milestones if conversion
      let rewardEarned = false;
      let milestoneAchieved: MilestoneAchievement | undefined;

      if (requestData.stage === 'first_payment') {
        rewardEarned = await this.processReferralReward(
          referral.referrer_id,
          referral.id,
        );
        milestoneAchieved = await this.checkMilestoneAchievements(
          referral.referrer_id,
        );

        // Update leaderboard asynchronously (don't wait)
        this.updateLeaderboards(referral.referrer_id).catch((error) => {
          console.error('Leaderboard update failed:', error);
        });
      }

      // Log conversion tracking
      await this.auditLog({
        eventType: 'conversion_tracked',
        referralId: referral.id,
        supplierId: referral.referrer_id,
        eventData: {
          stage: requestData.stage,
          referredId: requestData.referredId,
          rewardEarned,
          milestoneAchieved: !!milestoneAchieved,
        },
        severity: 'low',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      return {
        success: true,
        rewardEarned,
        milestoneAchieved,
      };
    } catch (error) {
      await this.handleError('track_conversion_failed', error, {
        requestData,
        ...metadata,
      });
      throw error;
    }
  }

  // =============================================================================
  // STATS RETRIEVAL
  // =============================================================================

  async getReferralStats(
    supplierId: string,
    query: ReferralStatsQuery,
  ): Promise<{ stats: ReferralStats; rankings: CurrentRankings }> {
    try {
      // Build date filter based on period
      const dateFilter = this.buildDateFilter(query.period);

      // Get referral statistics
      const { data: referralData, error: referralError } = await this.db
        .from('supplier_referrals')
        .select('*')
        .eq('referrer_id', supplierId)
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);

      if (referralError) {
        throw new DatabaseError(
          'Failed to fetch referral stats',
          referralError,
        );
      }

      const referrals = referralData || [];

      // Calculate statistics
      const totalReferrals = referrals.length;
      const activeTrials = referrals.filter(
        (r) => r.stage === 'trial_active',
      ).length;
      const paidConversions = referrals.filter(
        (r) => r.stage === 'first_payment' || r.stage === 'reward_issued',
      ).length;
      const conversionRate =
        totalReferrals > 0 ? (paidConversions / totalReferrals) * 100 : 0;
      const monthsEarned = paidConversions; // 1 month per conversion

      // Get recent activity (last 10)
      const recentActivity = referrals
        .filter((r) => r.stage !== 'link_created')
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 10)
        .map((r) => ({
          id: r.id,
          stage: r.stage,
          referredEmail: r.referred_email || 'pending@signup.com',
          createdAt: r.created_at,
          convertedAt: r.converted_at,
        }));

      // Get current rankings
      const { data: leaderboardData, error: leaderboardError } = await this.db
        .from('referral_leaderboard')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('period_type', query.period)
        .single();

      const rankings: CurrentRankings = leaderboardData
        ? {
            overallRank: leaderboardData.overall_rank,
            categoryRank: leaderboardData.category_rank,
            geographicRank: leaderboardData.geographic_rank,
            rankChange: leaderboardData.rank_change,
            trend: leaderboardData.trend,
          }
        : {};

      return {
        stats: {
          totalReferrals,
          activeTrials,
          paidConversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          monthsEarned,
          recentActivity,
        },
        rankings,
      };
    } catch (error) {
      await this.handleError('get_referral_stats_failed', error, {
        supplierId,
        query,
      });
      throw error;
    }
  }

  // =============================================================================
  // LEADERBOARD RETRIEVAL
  // =============================================================================

  async getLeaderboard(query: LeaderboardQuery): Promise<{
    entries: LeaderboardEntry[];
    totalEntries: number;
    currentPage: number;
    totalPages: number;
    lastUpdated: string;
  }> {
    try {
      // Build base query
      let dbQuery = this.db
        .from('referral_leaderboard')
        .select(
          `
          *,
          organizations (
            id,
            business_name,
            logo_url,
            business_location,
            business_category
          )
        `,
        )
        .eq('period_type', query.period)
        .order('paid_conversions', { ascending: false })
        .range(query.offset, query.offset + query.limit - 1);

      // Apply filters
      if (query.category) {
        dbQuery = dbQuery.eq('organizations.business_category', query.category);
      }

      if (query.location) {
        dbQuery = dbQuery.ilike(
          'organizations.business_location',
          `%${query.location}%`,
        );
      }

      const { data: leaderboardData, error: leaderboardError } = await dbQuery;

      if (leaderboardError) {
        throw new DatabaseError(
          'Failed to fetch leaderboard',
          leaderboardError,
        );
      }

      // Get total count for pagination
      let countQuery = this.db
        .from('referral_leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('period_type', query.period);

      if (query.category) {
        countQuery = countQuery.eq(
          'organizations.business_category',
          query.category,
        );
      }

      if (query.location) {
        countQuery = countQuery.ilike(
          'organizations.business_location',
          `%${query.location}%`,
        );
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new DatabaseError(
          'Failed to count leaderboard entries',
          countError,
        );
      }

      // Format entries
      const entries: LeaderboardEntry[] = (leaderboardData || []).map(
        (entry, index) => ({
          rank: query.offset + index + 1,
          supplierId: entry.supplier_id,
          businessName:
            entry.organizations?.business_name || 'Unknown Business',
          logoUrl: entry.organizations?.logo_url,
          businessLocation: entry.organizations?.business_location,
          businessCategory: entry.organizations?.business_category,
          paidConversions: entry.paid_conversions,
          conversionRate: entry.conversion_rate,
          monthsEarned: entry.months_earned,
          rankChange: entry.rank_change,
          trend: entry.trend,
          badges: entry.badges_earned,
        }),
      );

      const totalEntries = count || 0;
      const currentPage = Math.floor(query.offset / query.limit) + 1;
      const totalPages = Math.ceil(totalEntries / query.limit);

      return {
        entries,
        totalEntries,
        currentPage,
        totalPages,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      await this.handleError('get_leaderboard_failed', error, { query });
      throw error;
    }
  }

  // =============================================================================
  // FRAUD PREVENTION METHODS
  // =============================================================================

  private async performFraudChecks(data: {
    supplierId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkIPRateLimit(data.ipAddress),
      this.checkUserAgentSuspicious(data.userAgent),
      this.checkSupplierRateLimit(data.supplierId),
    ]);

    const failures = checks
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, index }) => ({
        check: ['ip_rate_limit', 'user_agent', 'supplier_rate_limit'][index],
        reason: result.status === 'rejected' ? result.reason : undefined,
      }));

    if (failures.length > 0) {
      const primaryFailure = failures[0];
      throw new FraudError(
        primaryFailure.reason?.message || 'Fraud check failed',
        primaryFailure.check,
        failures,
      );
    }
  }

  private async checkIPRateLimit(ipAddress?: string): Promise<void> {
    if (!ipAddress) return;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentReferrals, error } = await this.db
      .from('supplier_referrals')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('created_at', oneDayAgo);

    if (error) throw new DatabaseError('Failed to check IP rate limit', error);

    if (
      (recentReferrals?.length || 0) >=
      ReferralTrackingService.MAX_REFERRALS_PER_IP_PER_DAY
    ) {
      throw new FraudError(
        'Too many referrals from this IP address',
        'ip_rate_limit_exceeded',
      );
    }
  }

  private async checkUserAgentSuspicious(userAgent?: string): Promise<void> {
    if (!userAgent) return;

    const isSuspicious =
      ReferralTrackingService.SUSPICIOUS_USER_AGENT_PATTERNS.some((pattern) =>
        pattern.test(userAgent),
      );

    if (isSuspicious) {
      throw new FraudError('Suspicious user agent detected', 'bot_detected', {
        userAgent,
      });
    }
  }

  private async checkSupplierRateLimit(supplierId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentReferrals, error } = await this.db
      .from('supplier_referrals')
      .select('id')
      .eq('referrer_id', supplierId)
      .gte('created_at', oneHourAgo);

    if (error)
      throw new DatabaseError('Failed to check supplier rate limit', error);

    if (
      (recentReferrals?.length || 0) >=
      ReferralTrackingService.MAX_REFERRALS_PER_USER_PER_HOUR
    ) {
      throw new FraudError(
        'Too many referrals from this supplier',
        'supplier_rate_limit_exceeded',
      );
    }
  }

  private async validateConversion(
    referral: Record<string, unknown>,
    requestData: TrackConversionRequest,
    metadata: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // Prevent self-referral
    if (
      requestData.referredId &&
      requestData.referredId === referral.referrer_id
    ) {
      throw new FraudError('Self-referral detected', 'self_referral', {
        referrerId: referral.referrer_id,
        referredId: requestData.referredId,
      });
    }

    // Check for duplicate emails in other referrals
    if (requestData.stage === 'signup_started' && referral.referred_email) {
      const { data: duplicates } = await this.db
        .from('supplier_referrals')
        .select('id, referrer_id')
        .eq('referred_email', referral.referred_email)
        .neq('id', referral.id)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        throw new FraudError(
          'Email already used in another referral',
          'duplicate_email',
        );
      }
    }
  }

  // =============================================================================
  // REWARD PROCESSING
  // =============================================================================

  private async processReferralReward(
    referrerId: string,
    referralId: string,
  ): Promise<boolean> {
    try {
      // Create reward record
      const { data: reward, error: rewardError } = await this.db
        .from('referral_rewards')
        .insert({
          referral_id: referralId,
          supplier_id: referrerId,
          reward_type: '1_month_free',
          reward_value_months: 1,
          reward_description: 'One month free service for successful referral',
          status: 'issued',
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 year
          validation_checks: ['conversion_verified', 'fraud_checks_passed'],
        })
        .select()
        .single();

      if (rewardError) {
        throw new DatabaseError('Failed to create reward record', rewardError);
      }

      // Log reward issuance
      await this.auditLog({
        eventType: 'reward_issued',
        referralId,
        supplierId: referrerId,
        eventData: { rewardId: reward.id, rewardType: '1_month_free' },
        severity: 'low',
      });

      return true;
    } catch (error) {
      await this.handleError('process_reward_failed', error, {
        referrerId,
        referralId,
      });
      return false;
    }
  }

  private async checkMilestoneAchievements(
    supplierId: string,
  ): Promise<MilestoneAchievement | undefined> {
    try {
      // Get supplier's total conversions
      const { data: conversions, error } = await this.db
        .from('supplier_referrals')
        .select('id')
        .eq('referrer_id', supplierId)
        .in('stage', ['first_payment', 'reward_issued']);

      if (error) throw new DatabaseError('Failed to check conversions', error);

      const conversionCount = conversions?.length || 0;
      const milestoneTargets = [1, 5, 10, 25, 50, 100];
      const achievedMilestone = milestoneTargets.find(
        (target) => conversionCount === target,
      );

      if (achievedMilestone) {
        // Get milestone definition
        const { data: milestone } = await this.db
          .from('referral_milestones')
          .select('*')
          .eq('milestone_type', this.getMilestoneType(achievedMilestone))
          .eq('is_active', true)
          .single();

        if (milestone) {
          // Check if already achieved
          const { data: existing } = await this.db
            .from('referral_milestone_achievements')
            .select('id')
            .eq('supplier_id', supplierId)
            .eq('milestone_id', milestone.id)
            .single();

          if (!existing) {
            // Record achievement
            await this.db.from('referral_milestone_achievements').insert({
              supplier_id: supplierId,
              milestone_id: milestone.id,
              achievement_data: { conversions_at_achievement: conversionCount },
              reward_issued: false,
            });

            return {
              title: milestone.title,
              description: milestone.description,
              rewardType: milestone.reward_type,
              milestoneType: milestone.milestone_type,
            };
          }
        }
      }

      return undefined;
    } catch (error) {
      await this.handleError('check_milestones_failed', error, { supplierId });
      return undefined;
    }
  }

  // =============================================================================
  // LEADERBOARD UPDATES
  // =============================================================================

  private async updateLeaderboards(supplierId: string): Promise<void> {
    try {
      // Call the database function to recalculate leaderboards
      const periods = [
        'all_time',
        'this_year',
        'this_quarter',
        'this_month',
        'this_week',
      ];

      await Promise.all(
        periods.map((period) =>
          this.db.rpc('calculate_referral_leaderboard', {
            period_filter: period,
          }),
        ),
      );
    } catch (error) {
      // Don't throw - leaderboard updates are not critical
      console.error('Leaderboard update failed:', error);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async generateUniqueReferralCode(
    attempts: number = 0,
  ): Promise<string> {
    if (attempts >= 5) {
      throw new Error(
        'Failed to generate unique referral code after 5 attempts',
      );
    }

    const code = Math.random().toString(36).substr(2, 8).toUpperCase();

    // Check if code already exists
    const { data: existing } = await this.db
      .from('supplier_referrals')
      .select('id')
      .eq('referral_code', code)
      .single();

    if (existing) {
      return this.generateUniqueReferralCode(attempts + 1);
    }

    return code;
  }

  private buildCustomLink(
    baseUrl: string,
    referralCode: string,
    requestData: CreateReferralLinkRequest,
  ): string {
    const url = new URL(`${baseUrl}/join/${referralCode}`);

    if (requestData.utmSource)
      url.searchParams.set('utm_source', requestData.utmSource);
    if (requestData.utmMedium)
      url.searchParams.set('utm_medium', requestData.utmMedium);
    if (requestData.utmCampaign)
      url.searchParams.set('utm_campaign', requestData.utmCampaign);

    return url.toString();
  }

  private generateDeviceFingerprint(
    userAgent?: string,
    ipAddress?: string,
  ): string {
    const components = [userAgent, ipAddress, Date.now().toString()].filter(
      Boolean,
    );
    return Buffer.from(components.join('|')).toString('base64').slice(0, 32);
  }

  private getStageOrder(stage: string): number {
    const order = {
      link_created: 1,
      link_clicked: 2,
      signup_started: 3,
      trial_active: 4,
      first_payment: 5,
      reward_issued: 6,
    };
    return order[stage as keyof typeof order] || 0;
  }

  private buildDateFilter(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;

    switch (period) {
      case 'this_week':
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay(),
        );
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default: // all_time
        start = new Date('2020-01-01');
    }

    return { start: start.toISOString(), end };
  }

  private getMilestoneType(conversionCount: number): string {
    switch (conversionCount) {
      case 1:
        return 'first_conversion';
      case 5:
        return 'milestone_5';
      case 10:
        return 'milestone_10';
      case 25:
        return 'milestone_25';
      case 50:
        return 'milestone_50';
      case 100:
        return 'milestone_100';
      default:
        return 'unknown';
    }
  }

  private async checkRateLimit(
    supplierId: string,
    operation: string,
    ipAddress?: string,
  ): Promise<void> {
    // Implement rate limiting logic
    // For now, basic implementation - in production would use Redis
    const key = `${operation}:${supplierId}:${ipAddress || 'unknown'}`;
    const window = 60 * 1000; // 1 minute
    const limit = 5;

    // This would be implemented with a proper rate limiter in production
    // For now, we rely on the database constraints and fraud checks
  }

  private async auditLog(
    entry: Omit<AuditLogEntry, 'requestHeaders'>,
  ): Promise<void> {
    try {
      await this.db.from('referral_audit_log').insert({
        event_type: entry.eventType,
        referral_id: entry.referralId,
        supplier_id: entry.supplierId,
        event_data: entry.eventData,
        severity: entry.severity,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        requires_review:
          entry.severity === 'high' || entry.severity === 'critical',
      });
    } catch (error) {
      // Don't throw errors from audit logging
      console.error('Audit logging failed:', error);
    }
  }

  private async handleError(
    event: string,
    error: Error | unknown,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    await this.auditLog({
      eventType: 'suspicious_activity',
      eventData: {
        event,
        error: errorMessage,
        metadata,
      },
      severity: error instanceof FraudError ? 'high' : 'medium',
    });

    console.error(`[ReferralTracking] ${event}:`, {
      timestamp: new Date().toISOString(),
      error: errorMessage,
      metadata,
      service: 'referral-tracking',
    });
  }
}

// Export singleton instance
export const referralTrackingService = new ReferralTrackingService();
