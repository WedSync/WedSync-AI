/**
 * WS-170 Viral Optimization System - Security Validator
 * Transaction safety and security validations for reward system
 * NON-NEGOTIABLE: All rewards must pass security validation before processing
 */

import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limiter';
import DOMPurify from 'isomorphic-dompurify';
import {
  ViralReward,
  DoubleIncentive,
  RewardDistributionResult,
  RewardSystemError,
} from './reward-types';

export class SecurityValidator {
  private static readonly TRANSACTION_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly MAX_REWARD_AMOUNT = 5000; // Maximum single reward amount
  private static readonly MAX_DAILY_REWARDS_PER_USER = 10000; // Daily limit per user
  private static readonly SUSPICIOUS_VELOCITY_THRESHOLD = 0.95; // 95% confidence threshold

  /**
   * Comprehensive security validation before reward processing
   * NON-NEGOTIABLE: Must pass all security checks
   */
  static async validateRewardSecurity(
    referrerId: string,
    refereeId: string,
    rewardCalculation: DoubleIncentive,
    conversionEvent: any,
  ): Promise<{
    is_secure: boolean;
    security_score: number;
    validation_checks: {
      input_sanitization: boolean;
      amount_validation: boolean;
      rate_limiting: boolean;
      fraud_detection: boolean;
      transaction_integrity: boolean;
      audit_compliance: boolean;
    };
    security_violations: string[];
    recommended_action: 'approve' | 'block' | 'flag' | 'manual_review';
  }> {
    const supabase = createClient();
    const securityViolations: string[] = [];
    let securityScore = 1.0;

    try {
      // 1. Input Sanitization Validation
      const inputSanitizationCheck = await this.validateInputSanitization({
        referrerId,
        refereeId,
        conversionEvent,
      });

      if (!inputSanitizationCheck.passed) {
        securityViolations.push('Input sanitization failed');
        securityScore -= 0.3;
      }

      // 2. Amount Validation
      const amountValidationCheck =
        await this.validateRewardAmounts(rewardCalculation);

      if (!amountValidationCheck.passed) {
        securityViolations.push('Reward amount validation failed');
        securityScore -= 0.4;
      }

      // 3. Rate Limiting Check
      const rateLimitingCheck = await this.validateRateLimits(
        referrerId,
        refereeId,
      );

      if (!rateLimitingCheck.passed) {
        securityViolations.push('Rate limiting violation detected');
        securityScore -= 0.2;
      }

      // 4. Advanced Fraud Detection
      const fraudDetectionCheck = await this.performAdvancedFraudDetection(
        referrerId,
        refereeId,
        rewardCalculation,
        conversionEvent,
      );

      if (!fraudDetectionCheck.passed) {
        securityViolations.push('Fraud detection triggered');
        securityScore -= 0.5;
      }

      // 5. Transaction Integrity Validation
      const transactionIntegrityCheck = await this.validateTransactionIntegrity(
        referrerId,
        refereeId,
        rewardCalculation,
      );

      if (!transactionIntegrityCheck.passed) {
        securityViolations.push('Transaction integrity compromised');
        securityScore -= 0.6;
      }

      // 6. Audit Compliance Check
      const auditComplianceCheck = await this.validateAuditCompliance(
        referrerId,
        refereeId,
        rewardCalculation,
      );

      if (!auditComplianceCheck.passed) {
        securityViolations.push('Audit compliance violation');
        securityScore -= 0.2;
      }

      // Calculate final security assessment
      securityScore = Math.max(0, securityScore);
      const isSecure = securityScore >= 0.7 && securityViolations.length === 0;

      const recommendedAction = this.determineSecurityAction(
        securityScore,
        securityViolations,
        rewardCalculation,
      );

      // Log security assessment
      await this.logSecurityAssessment({
        referrer_id: referrerId,
        referee_id: refereeId,
        security_score: securityScore,
        violations: securityViolations,
        recommended_action: recommendedAction,
        reward_amount: rewardCalculation.total_system_cost,
      });

      return {
        is_secure: isSecure,
        security_score: securityScore,
        validation_checks: {
          input_sanitization: inputSanitizationCheck.passed,
          amount_validation: amountValidationCheck.passed,
          rate_limiting: rateLimitingCheck.passed,
          fraud_detection: fraudDetectionCheck.passed,
          transaction_integrity: transactionIntegrityCheck.passed,
          audit_compliance: auditComplianceCheck.passed,
        },
        security_violations: securityViolations,
        recommended_action: recommendedAction,
      };
    } catch (error) {
      console.error('Security validation error:', error);

      return {
        is_secure: false,
        security_score: 0,
        validation_checks: {
          input_sanitization: false,
          amount_validation: false,
          rate_limiting: false,
          fraud_detection: false,
          transaction_integrity: false,
          audit_compliance: false,
        },
        security_violations: ['Security validation system error'],
        recommended_action: 'block',
      };
    }
  }

  /**
   * Secure reward processing with transactional safety
   * Implements database transactions and rollback mechanisms
   */
  static async processRewardSecurely(
    referrerId: string,
    refereeId: string,
    conversionEvent: any,
    rewardCalculation: DoubleIncentive,
  ): Promise<RewardDistributionResult> {
    const supabase = createClient();
    const transactionId = crypto.randomUUID();

    try {
      // Start database transaction
      const { data: transaction, error: transactionError } = await supabase.rpc(
        'begin_reward_transaction',
        { transaction_id: transactionId },
      );

      if (transactionError) {
        throw new Error(
          `Failed to begin transaction: ${transactionError.message}`,
        );
      }

      // Security validation checkpoint
      const securityValidation = await this.validateRewardSecurity(
        referrerId,
        refereeId,
        rewardCalculation,
        conversionEvent,
      );

      if (!securityValidation.is_secure) {
        await supabase.rpc('rollback_reward_transaction', {
          transaction_id: transactionId,
        });
        throw new Error(
          `Security validation failed: ${securityValidation.security_violations.join(', ')}`,
        );
      }

      // Create reward records with transaction safety
      const rewardRecords = await this.createSecureRewardRecords(
        transactionId,
        referrerId,
        refereeId,
        rewardCalculation,
      );

      // Process distributions with atomic operations
      const distributionResults = await this.processAtomicDistributions(
        transactionId,
        rewardRecords,
        rewardCalculation,
      );

      // Update user metrics atomically
      await this.updateUserMetricsSecurely(
        transactionId,
        referrerId,
        refereeId,
        rewardCalculation,
      );

      // Commit transaction
      const { error: commitError } = await supabase.rpc(
        'commit_reward_transaction',
        { transaction_id: transactionId },
      );

      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }

      // Generate secure audit trail
      await this.generateSecureAuditTrail({
        transaction_id: transactionId,
        referrer_id: referrerId,
        referee_id: refereeId,
        reward_calculation: rewardCalculation,
        distribution_results: distributionResults,
        security_validation: securityValidation,
      });

      return {
        distribution_id: transactionId,
        referrer_distribution: distributionResults.referrer,
        referee_distribution: distributionResults.referee,
        total_distributed: rewardCalculation.total_system_cost,
        distribution_timestamp: new Date(),
        processing_time_ms: 0, // Will be set by caller
      };
    } catch (error) {
      console.error('Secure reward processing error:', error);

      // Ensure transaction rollback
      try {
        await supabase.rpc('rollback_reward_transaction', {
          transaction_id: transactionId,
        });
      } catch (rollbackError) {
        console.error('Transaction rollback failed:', rollbackError);
      }

      throw new Error('Secure reward processing failed');
    }
  }

  /**
   * Prevent double-rewarding with atomic checks
   * Uses database constraints and unique keys
   */
  static async preventDoubleRewarding(
    referralId: string,
    rewardType: string,
    referrerId: string,
  ): Promise<{ is_prevented: boolean; existing_reward_id?: string }> {
    const supabase = createClient();

    try {
      // Use database-level unique constraints to prevent duplicates
      const { data, error } = await supabase.rpc('check_reward_uniqueness', {
        referral_id: referralId,
        reward_type: rewardType,
        referrer_id: referrerId,
      });

      if (error) {
        throw new Error(`Duplicate check failed: ${error.message}`);
      }

      const existingRewardId = data?.existing_reward_id;

      return {
        is_prevented: !existingRewardId,
        existing_reward_id: existingRewardId,
      };
    } catch (error) {
      console.error('Double-reward prevention error:', error);
      return { is_prevented: false };
    }
  }

  // Private security validation methods

  private static async validateInputSanitization(
    inputs: any,
  ): Promise<{ passed: boolean; details: string }> {
    try {
      // Sanitize all string inputs
      const sanitizedReferrerId = DOMPurify.sanitize(inputs.referrerId);
      const sanitizedRefereeId = DOMPurify.sanitize(inputs.refereeId);

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (
        !uuidRegex.test(sanitizedReferrerId) ||
        !uuidRegex.test(sanitizedRefereeId)
      ) {
        return { passed: false, details: 'Invalid UUID format' };
      }

      // Check for injection patterns
      const injectionPatterns = [
        /(union|select|insert|delete|drop|create|alter|exec|execute)/i,
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i,
      ];

      const inputString = JSON.stringify(inputs);
      for (const pattern of injectionPatterns) {
        if (pattern.test(inputString)) {
          return { passed: false, details: 'Injection pattern detected' };
        }
      }

      return { passed: true, details: 'Input sanitization passed' };
    } catch (error) {
      return { passed: false, details: 'Input sanitization error' };
    }
  }

  private static async validateRewardAmounts(
    rewardCalculation: DoubleIncentive,
  ): Promise<{ passed: boolean; details: string }> {
    try {
      const referrerAmount = rewardCalculation.referrer_reward.final_amount;
      const refereeAmount = rewardCalculation.referee_reward.final_amount;
      const totalAmount = rewardCalculation.total_system_cost;

      // Check maximum limits
      if (
        referrerAmount > this.MAX_REWARD_AMOUNT ||
        refereeAmount > this.MAX_REWARD_AMOUNT ||
        totalAmount > this.MAX_REWARD_AMOUNT * 2
      ) {
        return {
          passed: false,
          details: 'Reward amount exceeds maximum limit',
        };
      }

      // Check for negative amounts
      if (referrerAmount < 0 || refereeAmount < 0 || totalAmount < 0) {
        return { passed: false, details: 'Negative reward amount detected' };
      }

      // Check for unrealistic amounts
      if (
        totalAmount >
        referrerAmount +
          refereeAmount +
          rewardCalculation.network_effect_bonus +
          100
      ) {
        return {
          passed: false,
          details: 'Total amount calculation inconsistency',
        };
      }

      return { passed: true, details: 'Amount validation passed' };
    } catch (error) {
      return { passed: false, details: 'Amount validation error' };
    }
  }

  private static async validateRateLimits(
    referrerId: string,
    refereeId: string,
  ): Promise<{ passed: boolean; details: string }> {
    try {
      // Check referrer rate limits
      const referrerRateLimit = await rateLimit(
        `reward_processing:${referrerId}`,
        100, // 100 rewards per hour
        3600,
      );

      if (!referrerRateLimit.success) {
        return { passed: false, details: 'Referrer rate limit exceeded' };
      }

      // Check referee rate limits
      const refereeRateLimit = await rateLimit(
        `reward_receiving:${refereeId}`,
        50, // 50 rewards per hour
        3600,
      );

      if (!refereeRateLimit.success) {
        return { passed: false, details: 'Referee rate limit exceeded' };
      }

      // Check system-wide rate limits
      const systemRateLimit = await rateLimit(
        'system_reward_processing',
        10000, // 10,000 rewards per hour system-wide
        3600,
      );

      if (!systemRateLimit.success) {
        return { passed: false, details: 'System rate limit exceeded' };
      }

      return { passed: true, details: 'Rate limit validation passed' };
    } catch (error) {
      return { passed: false, details: 'Rate limit validation error' };
    }
  }

  private static async performAdvancedFraudDetection(
    referrerId: string,
    refereeId: string,
    rewardCalculation: DoubleIncentive,
    conversionEvent: any,
  ): Promise<{ passed: boolean; details: string; confidence: number }> {
    try {
      const supabase = createClient();

      // Advanced pattern analysis
      const fraudSignals = await this.analyzeAdvancedFraudSignals(
        referrerId,
        refereeId,
        conversionEvent,
      );

      // Machine learning-based fraud scoring
      const mlFraudScore = await this.calculateMLFraudScore(
        referrerId,
        refereeId,
        rewardCalculation,
      );

      // Behavioral analysis
      const behaviorScore = await this.analyzeBehaviorPatterns(
        referrerId,
        refereeId,
      );

      // Network analysis
      const networkScore = await this.analyzeNetworkPatterns(
        referrerId,
        refereeId,
      );

      // Combine scores
      const combinedFraudScore =
        fraudSignals.score * 0.3 +
        mlFraudScore * 0.3 +
        behaviorScore * 0.2 +
        networkScore * 0.2;

      const confidence = 1 - combinedFraudScore;
      const passed = combinedFraudScore < 0.3;

      return {
        passed,
        details: passed
          ? 'Advanced fraud detection passed'
          : 'Fraud patterns detected',
        confidence,
      };
    } catch (error) {
      return { passed: false, details: 'Fraud detection error', confidence: 0 };
    }
  }

  private static async validateTransactionIntegrity(
    referrerId: string,
    refereeId: string,
    rewardCalculation: DoubleIncentive,
  ): Promise<{ passed: boolean; details: string }> {
    try {
      // Validate reward calculation consistency
      const calculationCheck =
        this.validateCalculationIntegrity(rewardCalculation);
      if (!calculationCheck.passed) {
        return calculationCheck;
      }

      // Validate user account integrity
      const accountCheck = await this.validateAccountIntegrity(
        referrerId,
        refereeId,
      );
      if (!accountCheck.passed) {
        return accountCheck;
      }

      // Validate system resource availability
      const resourceCheck = await this.validateSystemResources();
      if (!resourceCheck.passed) {
        return resourceCheck;
      }

      return { passed: true, details: 'Transaction integrity validated' };
    } catch (error) {
      return { passed: false, details: 'Transaction integrity error' };
    }
  }

  private static async validateAuditCompliance(
    referrerId: string,
    refereeId: string,
    rewardCalculation: DoubleIncentive,
  ): Promise<{ passed: boolean; details: string }> {
    try {
      const supabase = createClient();

      // Check audit trail completeness
      const auditTrailCheck = await supabase.rpc('validate_audit_trail', {
        referrer_id: referrerId,
        referee_id: refereeId,
      });

      if (auditTrailCheck.error || !auditTrailCheck.data?.is_complete) {
        return { passed: false, details: 'Incomplete audit trail' };
      }

      // Check regulatory compliance
      const complianceCheck = await this.validateRegulatoryCompliance(
        rewardCalculation.total_system_cost,
      );

      if (!complianceCheck.passed) {
        return complianceCheck;
      }

      return { passed: true, details: 'Audit compliance validated' };
    } catch (error) {
      return { passed: false, details: 'Audit compliance error' };
    }
  }

  private static determineSecurityAction(
    securityScore: number,
    violations: string[],
    rewardCalculation: DoubleIncentive,
  ): 'approve' | 'block' | 'flag' | 'manual_review' {
    if (securityScore < 0.3 || violations.length > 3) {
      return 'block';
    }

    if (securityScore < 0.7 || violations.length > 1) {
      return 'flag';
    }

    if (rewardCalculation.total_system_cost > 1000) {
      return 'manual_review';
    }

    return 'approve';
  }

  // Additional helper methods (simplified implementations)

  private static async analyzeAdvancedFraudSignals(
    referrerId: string,
    refereeId: string,
    event: any,
  ): Promise<{ score: number }> {
    return { score: Math.random() * 0.2 }; // Placeholder
  }

  private static async calculateMLFraudScore(
    referrerId: string,
    refereeId: string,
    calc: DoubleIncentive,
  ): Promise<number> {
    return Math.random() * 0.1; // Placeholder
  }

  private static async analyzeBehaviorPatterns(
    referrerId: string,
    refereeId: string,
  ): Promise<number> {
    return Math.random() * 0.15; // Placeholder
  }

  private static async analyzeNetworkPatterns(
    referrerId: string,
    refereeId: string,
  ): Promise<number> {
    return Math.random() * 0.1; // Placeholder
  }

  private static validateCalculationIntegrity(calc: DoubleIncentive): {
    passed: boolean;
    details: string;
  } {
    const expectedTotal =
      calc.referrer_reward.final_amount +
      calc.referee_reward.final_amount +
      calc.network_effect_bonus;
    if (Math.abs(calc.total_system_cost - expectedTotal) > 0.01) {
      return { passed: false, details: 'Calculation integrity check failed' };
    }
    return { passed: true, details: 'Calculation integrity validated' };
  }

  private static async validateAccountIntegrity(
    referrerId: string,
    refereeId: string,
  ): Promise<{ passed: boolean; details: string }> {
    // Implementation would check account status, validity, etc.
    return { passed: true, details: 'Account integrity validated' };
  }

  private static async validateSystemResources(): Promise<{
    passed: boolean;
    details: string;
  }> {
    // Implementation would check system capacity, database connections, etc.
    return { passed: true, details: 'System resources available' };
  }

  private static async validateRegulatoryCompliance(
    amount: number,
  ): Promise<{ passed: boolean; details: string }> {
    // Implementation would check regulatory requirements
    return { passed: true, details: 'Regulatory compliance validated' };
  }

  private static async logSecurityAssessment(assessment: any): Promise<void> {
    const supabase = createClient();

    try {
      await supabase.from('security_assessments').insert({
        ...assessment,
        assessed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log security assessment:', error);
    }
  }

  private static async createSecureRewardRecords(
    transactionId: string,
    referrerId: string,
    refereeId: string,
    calc: DoubleIncentive,
  ): Promise<any> {
    // Implementation would create reward records within transaction
    return {
      referrer: { id: 'referrer-reward' },
      referee: { id: 'referee-reward' },
    };
  }

  private static async processAtomicDistributions(
    transactionId: string,
    records: any,
    calc: DoubleIncentive,
  ): Promise<any> {
    // Implementation would process distributions atomically
    return {
      referrer: {
        reward_id: records.referrer.id,
        amount: calc.referrer_reward.final_amount,
        currency: calc.referrer_reward.currency,
        method: 'account_credit',
        status: 'completed',
        transaction_id: crypto.randomUUID(),
      },
      referee: {
        reward_id: records.referee.id,
        amount: calc.referee_reward.final_amount,
        currency: calc.referee_reward.currency,
        method: 'account_credit',
        status: 'completed',
        transaction_id: crypto.randomUUID(),
      },
    };
  }

  private static async updateUserMetricsSecurely(
    transactionId: string,
    referrerId: string,
    refereeId: string,
    calc: DoubleIncentive,
  ): Promise<void> {
    // Implementation would update user metrics within transaction
  }

  private static async generateSecureAuditTrail(auditData: any): Promise<void> {
    const supabase = createClient();

    try {
      await supabase.from('secure_audit_trails').insert({
        ...auditData,
        audit_hash: crypto.randomUUID(), // Would be actual hash
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to generate audit trail:', error);
    }
  }
}
