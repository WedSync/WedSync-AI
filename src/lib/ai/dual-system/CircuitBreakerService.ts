/**
 * WS-239: Circuit Breaker Service - Team B Round 1
 * Provides circuit breaker pattern for AI service reliability
 * Handles automatic failover and recovery for wedding industry reliability
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logging/Logger';

export type ProviderType = 'platform' | 'client';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time in ms before attempting recovery
  successThreshold: number; // Number of successes needed to close circuit
  monitoringWindow: number; // Time window for failure counting
}

export interface CircuitStatus {
  state: CircuitState;
  failureCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

/**
 * Circuit Breaker Service for AI reliability
 * Implements circuit breaker pattern with wedding industry context
 */
export class CircuitBreakerService {
  private logger: Logger;
  private supabase;

  // Default configuration - wedding industry optimized
  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 3, // Open after 3 consecutive failures
    recoveryTimeout: 60000, // 1 minute before attempting recovery
    successThreshold: 2, // Need 2 successes to close circuit
    monitoringWindow: 300000, // 5 minute failure window
  };

  // Enhanced config for peak wedding season (Friday-Sunday)
  private readonly PEAK_SEASON_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 2, // More sensitive during weddings
    recoveryTimeout: 30000, // Faster recovery attempts
    successThreshold: 1, // Close circuit faster
    monitoringWindow: 180000, // Shorter monitoring window
  };

  constructor() {
    this.logger = new Logger('CircuitBreakerService');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Check circuit breaker status before making AI request
   */
  async checkStatus(
    providerType: ProviderType,
    supplierId?: string,
  ): Promise<CircuitStatus> {
    try {
      const circuitId = this.getCircuitId(providerType, supplierId);

      // Get current circuit state from database
      const { data, error } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('*')
        .eq('provider_type', providerType)
        .eq('supplier_id', supplierId || null)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found is OK
        this.logger.error('Failed to fetch circuit state', {
          circuitId,
          error,
        });
        // Default to closed circuit on database error
        return { state: 'CLOSED', failureCount: 0 };
      }

      if (!data) {
        // Initialize new circuit breaker
        await this.initializeCircuit(providerType, supplierId);
        return { state: 'CLOSED', failureCount: 0 };
      }

      const state = data.circuit_state as CircuitState;
      const failureCount = data.failure_count;
      const lastFailureTime = data.last_failure_time
        ? new Date(data.last_failure_time)
        : undefined;
      const lastSuccessTime = data.last_success_time
        ? new Date(data.last_success_time)
        : undefined;
      const nextAttemptTime = data.next_attempt_time
        ? new Date(data.next_attempt_time)
        : undefined;

      // Check if we should transition states
      const newState = await this.evaluateStateTransition(
        state,
        failureCount,
        lastFailureTime,
        nextAttemptTime,
        providerType,
        supplierId,
      );

      if (newState !== state) {
        await this.updateCircuitState(
          providerType,
          supplierId,
          newState,
          failureCount,
        );
        return {
          state: newState,
          failureCount,
          lastFailureTime,
          lastSuccessTime,
          nextAttemptTime,
        };
      }

      return {
        state,
        failureCount,
        lastFailureTime,
        lastSuccessTime,
        nextAttemptTime,
      };
    } catch (error) {
      this.logger.error('Circuit status check failed', {
        providerType,
        supplierId,
        error,
      });
      // Fail safe - return closed circuit
      return { state: 'CLOSED', failureCount: 0 };
    }
  }

  /**
   * Record successful AI request
   */
  async recordSuccess(
    providerType: ProviderType,
    supplierId?: string,
  ): Promise<void> {
    try {
      const circuitId = this.getCircuitId(providerType, supplierId);

      this.logger.debug('Recording success', { circuitId });

      const { data: current } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('circuit_state, failure_count')
        .eq('provider_type', providerType)
        .eq('supplier_id', supplierId || null)
        .single();

      if (!current) {
        await this.initializeCircuit(providerType, supplierId);
        return;
      }

      const currentState = current.circuit_state as CircuitState;
      const config = this.getConfig();

      // Handle success based on current state
      let newState = currentState;
      let newFailureCount = current.failure_count;

      if (currentState === 'HALF_OPEN') {
        // In half-open state, success moves us toward closed
        // Need successThreshold successes to close
        if (newFailureCount <= 1) {
          // Assuming we track "failures since last success"
          newState = 'CLOSED';
          newFailureCount = 0;
          this.logger.info('Circuit breaker closed after successful recovery', {
            circuitId,
          });
        }
      } else if (currentState === 'OPEN') {
        // This shouldn't happen (we shouldn't get requests when open)
        this.logger.warn(
          'Success recorded on open circuit - this indicates bypass',
          { circuitId },
        );
      }

      // Update state
      await this.supabase
        .from('ai_circuit_breaker_state')
        .update({
          circuit_state: newState,
          failure_count: newState === 'CLOSED' ? 0 : newFailureCount,
          last_success_time: new Date().toISOString(),
          next_attempt_time: null, // Clear next attempt time on success
          updated_at: new Date().toISOString(),
        })
        .eq('provider_type', providerType)
        .eq('supplier_id', supplierId || null);
    } catch (error) {
      this.logger.error('Failed to record success', {
        providerType,
        supplierId,
        error,
      });
    }
  }

  /**
   * Record failed AI request
   */
  async recordFailure(
    providerType: ProviderType,
    supplierId?: string,
  ): Promise<void> {
    try {
      const circuitId = this.getCircuitId(providerType, supplierId);
      const config = this.getConfig();

      this.logger.warn('Recording failure', { circuitId });

      const { data: current } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('*')
        .eq('provider_type', providerType)
        .eq('supplier_id', supplierId || null)
        .single();

      if (!current) {
        await this.initializeCircuit(providerType, supplierId);
        // Record failure on newly initialized circuit
        await this.recordFailure(providerType, supplierId);
        return;
      }

      const currentState = current.circuit_state as CircuitState;
      const failureCount = current.failure_count + 1;

      let newState = currentState;
      let nextAttemptTime: Date | null = null;

      // Determine if we should open the circuit
      if (
        currentState === 'CLOSED' &&
        failureCount >= config.failureThreshold
      ) {
        newState = 'OPEN';
        nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);

        this.logger.error('Circuit breaker opened due to failures', {
          circuitId,
          failureCount,
          threshold: config.failureThreshold,
          nextAttemptTime,
        });

        // Send alert for wedding suppliers during peak season
        await this.sendFailureAlert(providerType, supplierId, failureCount);
      } else if (currentState === 'HALF_OPEN') {
        // Failure in half-open state goes back to open
        newState = 'OPEN';
        nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);

        this.logger.warn(
          'Circuit breaker returned to open state after half-open failure',
          {
            circuitId,
            nextAttemptTime,
          },
        );
      }

      // Update circuit state
      await this.supabase
        .from('ai_circuit_breaker_state')
        .update({
          circuit_state: newState,
          failure_count: failureCount,
          last_failure_time: new Date().toISOString(),
          next_attempt_time: nextAttemptTime?.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_type', providerType)
        .eq('supplier_id', supplierId || null);
    } catch (error) {
      this.logger.error('Failed to record failure', {
        providerType,
        supplierId,
        error,
      });
    }
  }

  /**
   * Force reset circuit breaker (admin/emergency use)
   */
  async resetCircuit(
    providerType: ProviderType,
    supplierId?: string,
  ): Promise<void> {
    try {
      const circuitId = this.getCircuitId(providerType, supplierId);

      this.logger.info('Manually resetting circuit breaker', { circuitId });

      await this.supabase
        .from('ai_circuit_breaker_state')
        .update({
          circuit_state: 'CLOSED',
          failure_count: 0,
          last_failure_time: null,
          next_attempt_time: null,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_type', providerType)
        .eq('supplier_id', supplierId || null);
    } catch (error) {
      this.logger.error('Failed to reset circuit', {
        providerType,
        supplierId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get health status of all circuit breakers
   */
  async getHealthStatus(): Promise<{
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
    details: Array<{
      providerType: ProviderType;
      supplierId?: string;
      state: CircuitState;
      failureCount: number;
      lastFailure?: Date;
    }>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_circuit_breaker_state')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const total = data.length;
      const closed = data.filter((d) => d.circuit_state === 'CLOSED').length;
      const open = data.filter((d) => d.circuit_state === 'OPEN').length;
      const halfOpen = data.filter(
        (d) => d.circuit_state === 'HALF_OPEN',
      ).length;

      const details = data.map((d) => ({
        providerType: d.provider_type as ProviderType,
        supplierId: d.supplier_id || undefined,
        state: d.circuit_state as CircuitState,
        failureCount: d.failure_count,
        lastFailure: d.last_failure_time
          ? new Date(d.last_failure_time)
          : undefined,
      }));

      return { total, closed, open, halfOpen, details };
    } catch (error) {
      this.logger.error('Failed to get health status', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async initializeCircuit(
    providerType: ProviderType,
    supplierId?: string,
  ): Promise<void> {
    try {
      await this.supabase.from('ai_circuit_breaker_state').insert({
        provider_type: providerType,
        supplier_id: supplierId || null,
        circuit_state: 'CLOSED',
        failure_count: 0,
        last_success_time: new Date().toISOString(),
      });

      this.logger.debug('Initialized circuit breaker', {
        providerType,
        supplierId: supplierId || 'global',
      });
    } catch (error) {
      // Ignore unique constraint violations (concurrent initialization)
      if (!error.message.includes('duplicate key value')) {
        throw error;
      }
    }
  }

  private async evaluateStateTransition(
    currentState: CircuitState,
    failureCount: number,
    lastFailureTime?: Date,
    nextAttemptTime?: Date,
    providerType?: ProviderType,
    supplierId?: string,
  ): Promise<CircuitState> {
    const now = new Date();

    switch (currentState) {
      case 'OPEN':
        // Check if recovery timeout has passed
        if (nextAttemptTime && now >= nextAttemptTime) {
          this.logger.info('Transitioning circuit from OPEN to HALF_OPEN', {
            providerType,
            supplierId,
          });
          return 'HALF_OPEN';
        }
        return 'OPEN';

      case 'HALF_OPEN':
        // Half-open state is managed by success/failure recording
        return 'HALF_OPEN';

      case 'CLOSED':
        // Check if we should clear old failures (outside monitoring window)
        const config = this.getConfig();
        if (
          lastFailureTime &&
          now.getTime() - lastFailureTime.getTime() > config.monitoringWindow
        ) {
          // Reset failure count if failures are old
          await this.supabase
            .from('ai_circuit_breaker_state')
            .update({
              failure_count: 0,
              updated_at: now.toISOString(),
            })
            .eq('provider_type', providerType)
            .eq('supplier_id', supplierId || null);
        }
        return 'CLOSED';

      default:
        return 'CLOSED';
    }
  }

  private async updateCircuitState(
    providerType: ProviderType,
    supplierId: string | undefined,
    newState: CircuitState,
    failureCount: number,
  ): Promise<void> {
    await this.supabase
      .from('ai_circuit_breaker_state')
      .update({
        circuit_state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_type', providerType)
      .eq('supplier_id', supplierId || null);
  }

  private getCircuitId(
    providerType: ProviderType,
    supplierId?: string,
  ): string {
    return supplierId
      ? `${providerType}-${supplierId}`
      : `${providerType}-global`;
  }

  private getConfig(): CircuitBreakerConfig {
    // Check if it's peak wedding season (Friday-Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isPeakSeason = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri-Sun

    return isPeakSeason ? this.PEAK_SEASON_CONFIG : this.DEFAULT_CONFIG;
  }

  private async sendFailureAlert(
    providerType: ProviderType,
    supplierId: string | undefined,
    failureCount: number,
  ): Promise<void> {
    try {
      // Wedding industry context - this is critical during peak season
      const now = new Date();
      const isPeakSeason = [5, 6, 0].includes(now.getDay()); // Fri-Sun

      const alertLevel = isPeakSeason ? 'CRITICAL' : 'WARNING';
      const message = `AI service ${providerType} circuit breaker opened (${failureCount} failures)${
        supplierId ? ` for supplier ${supplierId}` : ' globally'
      }. ${isPeakSeason ? 'WEDDING SEASON - IMMEDIATE ACTION REQUIRED' : 'Service degraded'}`;

      this.logger.error('Circuit breaker failure alert', {
        level: alertLevel,
        providerType,
        supplierId,
        failureCount,
        isPeakSeason,
        message,
      });

      // In production, would integrate with notification service
      // (Slack, PagerDuty, SMS alerts to ops team)
    } catch (error) {
      this.logger.error('Failed to send failure alert', { error });
    }
  }
}

export const circuitBreakerService = new CircuitBreakerService();
