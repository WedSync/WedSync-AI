/**
 * WS-170 Viral Optimization System - Eligibility Validator
 * Advanced fraud prevention and eligibility validation for viral reward system
 * SECURITY: Multi-layer fraud detection and validation
 */

import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limiter';
import {
  EligibilityValidationResult,
  ViralReward,
  ViralRewardTier,
  RewardSystemError,
} from './reward-types';

export class EligibilityValidator {
  private static readonly FRAUD_RISK_THRESHOLD = 0.7; // Above this threshold requires manual review
  private static readonly MIN_ACCOUNT_AGE_DAYS = 7; // Minimum account age for rewards
  private static readonly MAX_REFERRALS_PER_DAY = 10; // Maximum referrals per user per day
  private static readonly MAX_REFERRALS_PER_IP = 5; // Maximum referrals from same IP per day
  private static readonly CIRCULAR_REFERRAL_DEPTH = 5; // How deep to check for circular referrals
  private static readonly BEHAVIOR_ANALYSIS_WINDOW_DAYS = 30; // Window for behavior analysis

  /**
   * Comprehensive eligibility validation with fraud prevention
   * Performance target: <200ms for validation
   */
  static async validateViralEligibility(
    referrerId: string,
    refereeId: string,
    referralType: string,
    conversionValue?: number,
    requestMetadata?: any,
  ): Promise<EligibilityValidationResult> {
    const startTime = Date.now();
    const supabase = createClient();

    try {
      // Rate limit validation requests
      const rateLimitKey = `eligibility_validation:${referrerId}`;
      const rateLimitResult = await rateLimit(rateLimitKey, 20, 60); // 20 validations per minute

      if (!rateLimitResult.success) {
        return this.createFailureResult('Rate limit exceeded', 0.0, 'deny', [
          'Rate limit: Too many validation requests',
        ]);
      }

      // Parallel validation checks
      const [
        accountAgeCheck,
        activityPatternCheck,
        deviceUniquenessCheck,
        geographicConsistencyCheck,
        behavioralAnalysisCheck,
        circularReferralCheck,
      ] = await Promise.all([
        this.validateAccountAge(referrerId, refereeId),
        this.validateActivityPattern(referrerId, refereeId),
        this.validateDeviceUniqueness(referrerId, refereeId, requestMetadata),
        this.validateGeographicConsistency(
          referrerId,
          refereeId,
          requestMetadata,
        ),
        this.performBehavioralAnalysis(referrerId, refereeId),
        this.checkCircularReferrals(referrerId, refereeId),
      ]);

      // Calculate fraud risk score
      const fraudRiskScore = this.calculateFraudRiskScore({
        accountAgeCheck,
        activityPatternCheck,
        deviceUniquenessCheck,
        geographicConsistencyCheck,
        behavioralAnalysisCheck,
        circularReferralCheck,
      });

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore({
        accountAgeCheck,
        activityPatternCheck,
        deviceUniquenessCheck,
        geographicConsistencyCheck,
        behavioralAnalysisCheck,
        circularReferralCheck,
      });

      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(
        fraudRiskScore,
        confidenceScore,
        referralType,
        conversionValue,
      );

      // Generate validation notes
      const validationNotes = this.generateValidationNotes({
        accountAgeCheck,
        activityPatternCheck,
        deviceUniquenessCheck,
        geographicConsistencyCheck,
        behavioralAnalysisCheck,
        circularReferralCheck,
        fraudRiskScore,
        confidenceScore,
      });

      // Log validation for audit trail
      await this.logValidationAttempt(
        referrerId,
        refereeId,
        fraudRiskScore,
        confidenceScore,
        recommendedAction,
        validationNotes,
      );

      const processingTime = Date.now() - startTime;
      if (processingTime > 200) {
        console.warn(
          `Eligibility validation took ${processingTime}ms - may need optimization`,
        );
      }

      return {
        is_eligible: recommendedAction === 'approve',
        confidence_score: confidenceScore,
        validation_factors: {
          account_age_check: accountAgeCheck.passed,
          activity_pattern_check: activityPatternCheck.passed,
          device_uniqueness_check: deviceUniquenessCheck.passed,
          geographic_consistency_check: geographicConsistencyCheck.passed,
          behavioral_analysis_check: behavioralAnalysisCheck.passed,
          circular_referral_check: circularReferralCheck.passed,
        },
        fraud_risk_score: fraudRiskScore,
        recommended_action: recommendedAction,
        validation_notes: validationNotes,
      };
    } catch (error) {
      console.error('Eligibility validation error:', error);
      return this.createFailureResult(
        'Validation system error',
        0.0,
        'flag_for_investigation',
        ['System error during validation - requires manual review'],
      );
    }
  }

  /**
   * Validate reward legitimacy before processing
   */
  static async validateRewardLegitimacy(
    referralId: string,
    rewardType: string,
    amount: number,
  ): Promise<{ isValid: boolean; reason?: string }> {
    const supabase = createClient();

    try {
      // Check if referral exists and is valid
      const referralQuery = `
        SELECT 
          rc.*,
          rr_existing.id as existing_reward_id
        FROM referral_conversions rc
        LEFT JOIN referral_rewards rr_existing ON rr_existing.referrer_id = rc.referrer_id 
          AND rr_existing.referee_id = rc.referee_id
          AND rr_existing.referral_type = $2
        WHERE rc.id = $1
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: referralQuery,
        query_params: [referralId, rewardType],
      });

      if (result.error || !result.data?.[0]) {
        return { isValid: false, reason: 'Referral not found or invalid' };
      }

      const referral = result.data[0];

      // Check if reward already exists
      if (referral.existing_reward_id) {
        return {
          isValid: false,
          reason: 'Reward already processed for this referral',
        };
      }

      // Validate referral status
      if (referral.status !== 'completed') {
        return { isValid: false, reason: 'Referral not completed' };
      }

      // Check conversion recency (prevent old conversions from being rewarded)
      const conversionDate = new Date(referral.converted_at);
      const daysSinceConversion =
        (Date.now() - conversionDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceConversion > 30) {
        return {
          isValid: false,
          reason: 'Conversion too old for reward processing',
        };
      }

      // Validate amount reasonableness
      const maxRewardForType = this.getMaxRewardForType(rewardType);
      if (amount > maxRewardForType) {
        return {
          isValid: false,
          reason: 'Reward amount exceeds maximum allowed',
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Reward legitimacy validation error:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Check for duplicate reward attempts
   */
  static async checkExistingReward(
    referralId: string,
    rewardType: string,
  ): Promise<boolean> {
    const supabase = createClient();

    try {
      const result = await supabase
        .from('viral_rewards')
        .select('id')
        .eq('referral_id', referralId)
        .eq('reward_type', rewardType)
        .limit(1);

      return (result.data || []).length > 0;
    } catch (error) {
      console.error('Existing reward check error:', error);
      return false; // Assume no existing reward on error (safer for user)
    }
  }

  /**
   * Advanced fraud pattern detection
   */
  static async detectFraudPatterns(
    referrerId: string,
    refereeId: string,
    timeWindowHours: number = 24,
  ): Promise<{
    detected: boolean;
    patterns: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const supabase = createClient();
    const detectedPatterns: string[] = [];

    try {
      // Check for rapid-fire referrals
      const rapidReferralCheck = await this.checkRapidReferrals(
        referrerId,
        timeWindowHours,
      );
      if (rapidReferralCheck.detected) {
        detectedPatterns.push('Rapid referral pattern detected');
      }

      // Check for IP address clustering
      const ipClusteringCheck = await this.checkIpClustering(
        referrerId,
        refereeId,
      );
      if (ipClusteringCheck.detected) {
        detectedPatterns.push('IP address clustering detected');
      }

      // Check for device fingerprint similarities
      const deviceSimilarityCheck = await this.checkDeviceSimilarity(
        referrerId,
        refereeId,
      );
      if (deviceSimilarityCheck.detected) {
        detectedPatterns.push('Device fingerprint similarity detected');
      }

      // Check for behavioral pattern anomalies
      const behaviorAnomalyCheck = await this.checkBehaviorAnomalies(
        referrerId,
        refereeId,
      );
      if (behaviorAnomalyCheck.detected) {
        detectedPatterns.push('Behavioral pattern anomalies detected');
      }

      // Check for network-based fraud (users referring each other in circles)
      const networkFraudCheck = await this.checkNetworkFraud(
        referrerId,
        refereeId,
      );
      if (networkFraudCheck.detected) {
        detectedPatterns.push('Network-based fraud detected');
      }

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (detectedPatterns.length >= 3) severity = 'critical';
      else if (detectedPatterns.length >= 2) severity = 'high';
      else if (detectedPatterns.length >= 1) severity = 'medium';

      return {
        detected: detectedPatterns.length > 0,
        patterns: detectedPatterns,
        severity,
      };
    } catch (error) {
      console.error('Fraud pattern detection error:', error);
      return {
        detected: false,
        patterns: ['Error during fraud detection'],
        severity: 'medium',
      };
    }
  }

  // Private validation methods

  private static async validateAccountAge(
    referrerId: string,
    refereeId: string,
  ): Promise<{ passed: boolean; details: string }> {
    const supabase = createClient();

    try {
      const query = `
        SELECT 
          u1.id, u1.created_at as referrer_created,
          u2.id, u2.created_at as referee_created
        FROM user_profiles u1, user_profiles u2
        WHERE u1.id = $1 AND u2.id = $2
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: query,
        query_params: [referrerId, refereeId],
      });

      if (result.error || !result.data?.[0]) {
        return { passed: false, details: 'Unable to verify account ages' };
      }

      const data = result.data[0];
      const referrerAge =
        (Date.now() - new Date(data.referrer_created).getTime()) /
        (1000 * 60 * 60 * 24);
      const refereeAge =
        (Date.now() - new Date(data.referee_created).getTime()) /
        (1000 * 60 * 60 * 24);

      if (referrerAge < this.MIN_ACCOUNT_AGE_DAYS) {
        return {
          passed: false,
          details: `Referrer account too new (${Math.round(referrerAge)} days)`,
        };
      }

      // Referee can be new, but not TOO new (to prevent instant fake signups)
      if (refereeAge < 1) {
        return {
          passed: false,
          details: 'Referee account too new (less than 1 day)',
        };
      }

      return {
        passed: true,
        details: `Account ages acceptable (referrer: ${Math.round(referrerAge)} days, referee: ${Math.round(refereeAge)} days)`,
      };
    } catch (error) {
      console.error('Account age validation error:', error);
      return { passed: false, details: 'Account age validation failed' };
    }
  }

  private static async validateActivityPattern(
    referrerId: string,
    refereeId: string,
  ): Promise<{ passed: boolean; details: string }> {
    const supabase = createClient();

    try {
      // Check referral rate for referrer
      const referralRateQuery = `
        SELECT COUNT(*) as recent_referrals
        FROM referral_conversions
        WHERE referrer_id = $1 
          AND created_at > NOW() - INTERVAL '1 day'
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: referralRateQuery,
        query_params: [referrerId],
      });

      if (result.error) {
        return { passed: false, details: 'Unable to check activity pattern' };
      }

      const recentReferrals = result.data?.[0]?.recent_referrals || 0;

      if (recentReferrals > this.MAX_REFERRALS_PER_DAY) {
        return {
          passed: false,
          details: `Too many referrals in 24 hours (${recentReferrals})`,
        };
      }

      return {
        passed: true,
        details: `Activity pattern normal (${recentReferrals} referrals today)`,
      };
    } catch (error) {
      console.error('Activity pattern validation error:', error);
      return { passed: false, details: 'Activity pattern validation failed' };
    }
  }

  private static async validateDeviceUniqueness(
    referrerId: string,
    refereeId: string,
    requestMetadata?: any,
  ): Promise<{ passed: boolean; details: string }> {
    if (!requestMetadata?.deviceFingerprint) {
      return { passed: true, details: 'Device fingerprint not available' };
    }

    const supabase = createClient();

    try {
      // Check if the same device was used for multiple referrals
      const deviceQuery = `
        SELECT COUNT(DISTINCT referrer_id) as unique_referrers
        FROM referral_activity_logs
        WHERE device_fingerprint = $1 
          AND created_at > NOW() - INTERVAL '7 days'
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: deviceQuery,
        query_params: [requestMetadata.deviceFingerprint],
      });

      if (result.error) {
        return { passed: false, details: 'Unable to check device uniqueness' };
      }

      const uniqueReferrers = result.data?.[0]?.unique_referrers || 0;

      if (uniqueReferrers > 3) {
        return {
          passed: false,
          details: `Device used by multiple referrers (${uniqueReferrers})`,
        };
      }

      return {
        passed: true,
        details: `Device fingerprint acceptable (${uniqueReferrers} referrers)`,
      };
    } catch (error) {
      console.error('Device uniqueness validation error:', error);
      return { passed: false, details: 'Device uniqueness validation failed' };
    }
  }

  private static async validateGeographicConsistency(
    referrerId: string,
    refereeId: string,
    requestMetadata?: any,
  ): Promise<{ passed: boolean; details: string }> {
    if (!requestMetadata?.ipAddress) {
      return { passed: true, details: 'Geographic data not available' };
    }

    const supabase = createClient();

    try {
      // Check for IP address clustering (multiple referrals from same IP)
      const ipQuery = `
        SELECT COUNT(*) as referrals_from_ip
        FROM referral_activity_logs
        WHERE ip_address = $1 
          AND created_at > NOW() - INTERVAL '1 day'
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: ipQuery,
        query_params: [requestMetadata.ipAddress],
      });

      if (result.error) {
        return {
          passed: false,
          details: 'Unable to check geographic consistency',
        };
      }

      const referralsFromIp = result.data?.[0]?.referrals_from_ip || 0;

      if (referralsFromIp > this.MAX_REFERRALS_PER_IP) {
        return {
          passed: false,
          details: `Too many referrals from same IP (${referralsFromIp})`,
        };
      }

      return {
        passed: true,
        details: `Geographic pattern acceptable (${referralsFromIp} from IP)`,
      };
    } catch (error) {
      console.error('Geographic consistency validation error:', error);
      return {
        passed: false,
        details: 'Geographic consistency validation failed',
      };
    }
  }

  private static async performBehavioralAnalysis(
    referrerId: string,
    refereeId: string,
  ): Promise<{ passed: boolean; details: string }> {
    const supabase = createClient();

    try {
      // Analyze user behavior patterns
      const behaviorQuery = `
        SELECT 
          up1.last_active_at as referrer_last_active,
          up2.last_active_at as referee_last_active,
          up1.total_logins as referrer_logins,
          up2.total_logins as referee_logins,
          up1.feature_usage_score as referrer_usage,
          up2.feature_usage_score as referee_usage
        FROM user_profiles up1, user_profiles up2
        WHERE up1.id = $1 AND up2.id = $2
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: behaviorQuery,
        query_params: [referrerId, refereeId],
      });

      if (result.error || !result.data?.[0]) {
        return {
          passed: false,
          details: 'Unable to analyze behavior patterns',
        };
      }

      const data = result.data[0];

      // Check for suspicious patterns
      const referrerActive =
        data.referrer_last_active &&
        Date.now() - new Date(data.referrer_last_active).getTime() <
          7 * 24 * 60 * 60 * 1000;

      const referrerEngaged =
        (data.referrer_logins || 0) > 3 && (data.referrer_usage || 0) > 0.3;

      if (!referrerActive || !referrerEngaged) {
        return {
          passed: false,
          details: 'Referrer shows inactive or disengaged behavior pattern',
        };
      }

      return { passed: true, details: 'Behavioral patterns appear normal' };
    } catch (error) {
      console.error('Behavioral analysis error:', error);
      return { passed: false, details: 'Behavioral analysis failed' };
    }
  }

  private static async checkCircularReferrals(
    referrerId: string,
    refereeId: string,
  ): Promise<{ passed: boolean; details: string }> {
    const supabase = createClient();

    try {
      // Check if referrer and referee have circular relationship
      const circularQuery = `
        WITH RECURSIVE referral_chain AS (
          SELECT referrer_id, referee_id, 1 as depth
          FROM referral_conversions
          WHERE referee_id = $1
          
          UNION ALL
          
          SELECT rc.referrer_id, rc.referee_id, rch.depth + 1
          FROM referral_conversions rc
          INNER JOIN referral_chain rch ON rc.referee_id = rch.referrer_id
          WHERE rch.depth < $3
        )
        SELECT COUNT(*) as circular_count
        FROM referral_chain
        WHERE referrer_id = $2
      `;

      const result = await supabase.rpc('execute_query', {
        query_sql: circularQuery,
        query_params: [referrerId, refereeId, this.CIRCULAR_REFERRAL_DEPTH],
      });

      if (result.error) {
        return { passed: false, details: 'Unable to check circular referrals' };
      }

      const circularCount = result.data?.[0]?.circular_count || 0;

      if (circularCount > 0) {
        return { passed: false, details: 'Circular referral pattern detected' };
      }

      return { passed: true, details: 'No circular referral patterns found' };
    } catch (error) {
      console.error('Circular referral check error:', error);
      return { passed: false, details: 'Circular referral check failed' };
    }
  }

  // Fraud risk calculation and helper methods

  private static calculateFraudRiskScore(validationResults: any): number {
    let riskScore = 0;

    // Weight each validation factor
    if (!validationResults.accountAgeCheck.passed) riskScore += 0.25;
    if (!validationResults.activityPatternCheck.passed) riskScore += 0.2;
    if (!validationResults.deviceUniquenessCheck.passed) riskScore += 0.15;
    if (!validationResults.geographicConsistencyCheck.passed) riskScore += 0.15;
    if (!validationResults.behavioralAnalysisCheck.passed) riskScore += 0.15;
    if (!validationResults.circularReferralCheck.passed) riskScore += 0.1;

    return Math.min(riskScore, 1.0); // Cap at 100%
  }

  private static calculateConfidenceScore(validationResults: any): number {
    let passedChecks = 0;
    const totalChecks = 6;

    if (validationResults.accountAgeCheck.passed) passedChecks++;
    if (validationResults.activityPatternCheck.passed) passedChecks++;
    if (validationResults.deviceUniquenessCheck.passed) passedChecks++;
    if (validationResults.geographicConsistencyCheck.passed) passedChecks++;
    if (validationResults.behavioralAnalysisCheck.passed) passedChecks++;
    if (validationResults.circularReferralCheck.passed) passedChecks++;

    return passedChecks / totalChecks;
  }

  private static determineRecommendedAction(
    fraudRiskScore: number,
    confidenceScore: number,
    referralType: string,
    conversionValue?: number,
  ): 'approve' | 'manual_review' | 'deny' | 'flag_for_investigation' {
    // High fraud risk - deny immediately
    if (fraudRiskScore > 0.8) {
      return 'deny';
    }

    // Medium-high fraud risk - flag for investigation
    if (fraudRiskScore > this.FRAUD_RISK_THRESHOLD) {
      return 'flag_for_investigation';
    }

    // Low confidence with moderate risk - manual review
    if (confidenceScore < 0.6 && fraudRiskScore > 0.3) {
      return 'manual_review';
    }

    // High-value conversions require manual review even with low risk
    if (conversionValue && conversionValue > 1000 && fraudRiskScore > 0.2) {
      return 'manual_review';
    }

    // Low risk and high confidence - approve
    return 'approve';
  }

  private static generateValidationNotes(validationData: any): string[] {
    const notes: string[] = [];

    notes.push(
      `Fraud risk: ${(validationData.fraudRiskScore * 100).toFixed(1)}%`,
    );
    notes.push(
      `Confidence: ${(validationData.confidenceScore * 100).toFixed(1)}%`,
    );

    if (!validationData.accountAgeCheck.passed) {
      notes.push(`⚠️ ${validationData.accountAgeCheck.details}`);
    }

    if (!validationData.activityPatternCheck.passed) {
      notes.push(`⚠️ ${validationData.activityPatternCheck.details}`);
    }

    if (!validationData.deviceUniquenessCheck.passed) {
      notes.push(`⚠️ ${validationData.deviceUniquenessCheck.details}`);
    }

    if (!validationData.geographicConsistencyCheck.passed) {
      notes.push(`⚠️ ${validationData.geographicConsistencyCheck.details}`);
    }

    if (!validationData.behavioralAnalysisCheck.passed) {
      notes.push(`⚠️ ${validationData.behavioralAnalysisCheck.details}`);
    }

    if (!validationData.circularReferralCheck.passed) {
      notes.push(`⚠️ ${validationData.circularReferralCheck.details}`);
    }

    return notes;
  }

  private static async logValidationAttempt(
    referrerId: string,
    refereeId: string,
    fraudRiskScore: number,
    confidenceScore: number,
    recommendedAction: string,
    validationNotes: string[],
  ): Promise<void> {
    const supabase = createClient();

    try {
      await supabase.from('reward_validation_logs').insert({
        referrer_id: referrerId,
        referee_id: refereeId,
        fraud_risk_score: fraudRiskScore,
        confidence_score: confidenceScore,
        recommended_action: recommendedAction,
        validation_notes: validationNotes,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log validation attempt:', error);
    }
  }

  private static createFailureResult(
    reason: string,
    confidenceScore: number,
    recommendedAction: 'deny' | 'manual_review' | 'flag_for_investigation',
    validationNotes: string[],
  ): EligibilityValidationResult {
    return {
      is_eligible: false,
      confidence_score: confidenceScore,
      validation_factors: {
        account_age_check: false,
        activity_pattern_check: false,
        device_uniqueness_check: false,
        geographic_consistency_check: false,
        behavioral_analysis_check: false,
        circular_referral_check: false,
      },
      fraud_risk_score: 1.0,
      recommended_action: recommendedAction,
      validation_notes: validationNotes,
    };
  }

  private static getMaxRewardForType(rewardType: string): number {
    switch (rewardType) {
      case 'signup':
        return 200;
      case 'subscription':
        return 500;
      case 'revenue_share':
        return 1000;
      case 'milestone':
        return 2000;
      case 'viral_bonus':
        return 300;
      default:
        return 100;
    }
  }

  // Additional fraud detection methods (simplified implementations)

  private static async checkRapidReferrals(
    referrerId: string,
    timeWindowHours: number,
  ): Promise<{ detected: boolean }> {
    // Implementation would check for unusually high referral velocity
    return { detected: false }; // Placeholder
  }

  private static async checkIpClustering(
    referrerId: string,
    refereeId: string,
  ): Promise<{ detected: boolean }> {
    // Implementation would check for IP address patterns
    return { detected: false }; // Placeholder
  }

  private static async checkDeviceSimilarity(
    referrerId: string,
    refereeId: string,
  ): Promise<{ detected: boolean }> {
    // Implementation would compare device fingerprints
    return { detected: false }; // Placeholder
  }

  private static async checkBehaviorAnomalies(
    referrerId: string,
    refereeId: string,
  ): Promise<{ detected: boolean }> {
    // Implementation would analyze behavioral patterns
    return { detected: false }; // Placeholder
  }

  private static async checkNetworkFraud(
    referrerId: string,
    refereeId: string,
  ): Promise<{ detected: boolean }> {
    // Implementation would check for network-based fraud
    return { detected: false }; // Placeholder
  }
}
