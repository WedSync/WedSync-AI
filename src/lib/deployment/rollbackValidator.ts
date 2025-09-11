// WS-098 Rollback Validator - Post-Rollback Verification System
// Validates rollback success and ensures data integrity

import { createClient } from '@/lib/supabase/client';

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface SystemValidation {
  gitState: ValidationResult;
  systemHealth: ValidationResult;
  databaseIntegrity: ValidationResult;
  weddingData: ValidationResult;
  criticalEndpoints: ValidationResult;
  overallSuccess: boolean;
}

export class RollbackValidator {
  private supabase = createClient();
  private readonly HEALTH_THRESHOLD = 80; // Require 80% health for success
  private readonly ENDPOINT_TIMEOUT = 5000; // 5 second timeout

  /**
   * Validate Git state matches target commit
   */
  async validateGitState(targetCommit: string): Promise<ValidationResult> {
    try {
      // In production, this would check the actual deployed commit
      // via deployment API or git commands
      const response = await fetch('/api/deployment/current');

      if (!response.ok) {
        return {
          success: false,
          message: 'Failed to retrieve current deployment info',
        };
      }

      const data = await response.json();
      const currentCommit = data.commit || data.sha;

      if (currentCommit === targetCommit) {
        return {
          success: true,
          message: `Git state verified: ${targetCommit}`,
          details: { currentCommit, targetCommit },
        };
      } else {
        return {
          success: false,
          message: `Git state mismatch: expected ${targetCommit}, got ${currentCommit}`,
          details: { currentCommit, targetCommit },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Git validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate system health after rollback
   */
  async validateSystemHealth(): Promise<ValidationResult> {
    try {
      const healthChecks = [
        { name: 'API', url: '/api/health' },
        { name: 'Auth', url: '/api/auth/health' },
        { name: 'Database', url: '/api/health/database' },
      ];

      const results = await Promise.all(
        healthChecks.map(async (check) => {
          try {
            const response = await fetch(check.url, {
              signal: AbortSignal.timeout(this.ENDPOINT_TIMEOUT),
            });
            return {
              name: check.name,
              success: response.ok,
              status: response.status,
            };
          } catch (error) {
            return {
              name: check.name,
              success: false,
              error: error instanceof Error ? error.message : 'Failed',
            };
          }
        }),
      );

      const successCount = results.filter((r) => r.success).length;
      const healthPercentage = (successCount / results.length) * 100;

      if (healthPercentage >= this.HEALTH_THRESHOLD) {
        return {
          success: true,
          message: `System health validated: ${healthPercentage}% healthy`,
          details: results,
        };
      } else {
        return {
          success: false,
          message: `System health below threshold: ${healthPercentage}% (required: ${this.HEALTH_THRESHOLD}%)`,
          details: results,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Health validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate database integrity
   */
  async validateDatabaseIntegrity(): Promise<ValidationResult> {
    try {
      // Check critical tables exist and are accessible
      const criticalTables = [
        'clients',
        'guest_lists',
        'rsvp_responses',
        'wedding_timelines',
        'vendors',
        'user_profiles',
      ];

      const tableChecks = await Promise.all(
        criticalTables.map(async (table) => {
          try {
            const { count, error } = await this.supabase
              .from(table)
              .select('*', { count: 'exact', head: true });

            return {
              table,
              exists: !error,
              accessible: !error,
              error: error?.message,
            };
          } catch (error) {
            return {
              table,
              exists: false,
              accessible: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }),
      );

      const failedTables = tableChecks.filter((t) => !t.accessible);

      if (failedTables.length === 0) {
        // Check foreign key constraints
        const { data: constraints, error: constraintError } =
          await this.supabase.rpc('verify_database_integrity');

        if (constraintError) {
          return {
            success: false,
            message: `Database constraint check failed: ${constraintError.message}`,
            details: { tableChecks, constraintError },
          };
        }

        return {
          success: true,
          message: 'Database integrity verified - all tables accessible',
          details: { tableChecks, constraints },
        };
      } else {
        return {
          success: false,
          message: `Database integrity check failed: ${failedTables.length} tables inaccessible`,
          details: { failedTables, tableChecks },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate wedding data preservation
   */
  async validateWeddingData(): Promise<ValidationResult> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check today's weddings are still accessible
      const { data: todayWeddings, error: weddingError } = await this.supabase
        .from('clients')
        .select('id, name, wedding_date, status')
        .eq('wedding_date', today)
        .in('status', ['active', 'confirmed']);

      if (weddingError) {
        return {
          success: false,
          message: `Failed to verify wedding data: ${weddingError.message}`,
        };
      }

      // Check recent wedding modifications
      const { data: recentModifications, error: modError } = await this.supabase
        .from('clients')
        .select('id, name, updated_at')
        .gte(
          'updated_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('updated_at', { ascending: false })
        .limit(10);

      if (modError) {
        return {
          success: false,
          message: `Failed to verify recent modifications: ${modError.message}`,
        };
      }

      // Check RSVP data integrity for today's weddings
      if (todayWeddings && todayWeddings.length > 0) {
        const clientIds = todayWeddings.map((w) => w.id);

        const { count: rsvpCount, error: rsvpError } = await this.supabase
          .from('rsvp_responses')
          .select('*', { count: 'exact', head: true })
          .in('client_id', clientIds);

        if (rsvpError) {
          return {
            success: false,
            message: `Failed to verify RSVP data: ${rsvpError.message}`,
          };
        }

        return {
          success: true,
          message: `Wedding data validated: ${todayWeddings.length} weddings, ${rsvpCount || 0} RSVPs preserved`,
          details: {
            todayWeddings: todayWeddings.length,
            recentModifications: recentModifications?.length || 0,
            rsvpCount: rsvpCount || 0,
          },
        };
      }

      return {
        success: true,
        message: 'Wedding data validation passed - no active weddings today',
        details: {
          todayWeddings: 0,
          recentModifications: recentModifications?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Wedding data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate critical endpoints are operational
   */
  async validateCriticalEndpoints(): Promise<ValidationResult> {
    try {
      const criticalEndpoints = [
        { name: 'Client Creation', url: '/api/clients', method: 'HEAD' },
        { name: 'RSVP Submission', url: '/api/rsvp', method: 'HEAD' },
        { name: 'Guest Management', url: '/api/guests', method: 'HEAD' },
        {
          name: 'Timeline Access',
          url: '/api/wedding-timelines',
          method: 'HEAD',
        },
        { name: 'Vendor Portal', url: '/api/vendors', method: 'HEAD' },
        { name: 'Authentication', url: '/api/auth/session', method: 'GET' },
      ];

      const endpointResults = await Promise.all(
        criticalEndpoints.map(async (endpoint) => {
          const startTime = Date.now();
          try {
            const response = await fetch(endpoint.url, {
              method: endpoint.method,
              signal: AbortSignal.timeout(this.ENDPOINT_TIMEOUT),
            });

            const responseTime = Date.now() - startTime;

            return {
              name: endpoint.name,
              success: response.ok || response.status === 405, // 405 is ok for HEAD requests
              status: response.status,
              responseTime,
            };
          } catch (error) {
            return {
              name: endpoint.name,
              success: false,
              error: error instanceof Error ? error.message : 'Failed',
              responseTime: Date.now() - startTime,
            };
          }
        }),
      );

      const failedEndpoints = endpointResults.filter((e) => !e.success);
      const avgResponseTime =
        endpointResults.reduce((sum, e) => sum + (e.responseTime || 0), 0) /
        endpointResults.length;

      if (failedEndpoints.length === 0) {
        return {
          success: true,
          message: `All critical endpoints operational (avg response: ${Math.round(avgResponseTime)}ms)`,
          details: endpointResults,
        };
      } else if (failedEndpoints.length <= 1) {
        return {
          success: true,
          message: `Critical endpoints mostly operational (${failedEndpoints.length} degraded)`,
          details: { failedEndpoints, allResults: endpointResults },
        };
      } else {
        return {
          success: false,
          message: `Critical endpoints validation failed: ${failedEndpoints.length} endpoints down`,
          details: { failedEndpoints, allResults: endpointResults },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Endpoint validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Perform complete rollback validation
   */
  async performCompleteValidation(
    targetCommit: string,
  ): Promise<SystemValidation> {
    console.log('🔍 Performing complete rollback validation...');

    const [
      gitState,
      systemHealth,
      databaseIntegrity,
      weddingData,
      criticalEndpoints,
    ] = await Promise.all([
      this.validateGitState(targetCommit),
      this.validateSystemHealth(),
      this.validateDatabaseIntegrity(),
      this.validateWeddingData(),
      this.validateCriticalEndpoints(),
    ]);

    const overallSuccess =
      gitState.success &&
      systemHealth.success &&
      databaseIntegrity.success &&
      weddingData.success &&
      criticalEndpoints.success;

    const validation: SystemValidation = {
      gitState,
      systemHealth,
      databaseIntegrity,
      weddingData,
      criticalEndpoints,
      overallSuccess,
    };

    // Log validation results
    console.log('Validation Results:');
    console.log(
      `  Git State: ${gitState.success ? '✅' : '❌'} ${gitState.message}`,
    );
    console.log(
      `  System Health: ${systemHealth.success ? '✅' : '❌'} ${systemHealth.message}`,
    );
    console.log(
      `  Database: ${databaseIntegrity.success ? '✅' : '❌'} ${databaseIntegrity.message}`,
    );
    console.log(
      `  Wedding Data: ${weddingData.success ? '✅' : '❌'} ${weddingData.message}`,
    );
    console.log(
      `  Endpoints: ${criticalEndpoints.success ? '✅' : '❌'} ${criticalEndpoints.message}`,
    );
    console.log(`  Overall: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);

    // Store validation results in audit log
    await this.logValidationResults(validation);

    return validation;
  }

  /**
   * Log validation results to audit system
   */
  private async logValidationResults(
    validation: SystemValidation,
  ): Promise<void> {
    try {
      await this.supabase.from('rollback_audit_log').insert({
        action_type: 'ROLLBACK_VALIDATION',
        description: validation.overallSuccess
          ? 'Rollback validation passed'
          : 'Rollback validation failed',
        metadata: {
          validation,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log validation results:', error);
    }
  }
}

// Export singleton for global access
export const rollbackValidator = new RollbackValidator();
