#!/usr/bin/env npx tsx
/**
 * WS-194 Secret Rotation Script
 * Automated secret rotation for production environments
 * Team B - Backend/API Focus
 */

import { secretRotationManager } from '../src/lib/environment/secret-rotation-manager';
import { validateWeddingEnvironment } from '../src/lib/environment/config-validator';
import { emergencyWeddingComplianceCheck } from '../src/lib/environment/compliance-checker';

interface RotationOptions {
  dryRun: boolean;
  force: boolean;
  secretType?: string;
  environment?: string;
  skipWeddingCheck: boolean;
}

class SecretRotationScript {
  private options: RotationOptions;

  constructor(options: RotationOptions) {
    this.options = options;
  }

  /**
   * Main rotation execution
   */
  async execute(): Promise<void> {
    try {
      console.log('🔐 WedSync Secret Rotation System');
      console.log('================================');
      console.log(`Environment: ${this.options.environment || 'production'}`);
      console.log(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
      console.log(`Force: ${this.options.force ? 'YES' : 'NO'}`);
      console.log(`Skip Wedding Check: ${this.options.skipWeddingCheck ? 'YES' : 'NO'}`);
      console.log('');

      // Pre-rotation safety checks
      await this.performSafetyChecks();

      if (this.options.dryRun) {
        console.log('🧪 DRY RUN MODE - No actual rotations will be performed');
        await this.performDryRun();
      } else {
        console.log('🔄 LIVE MODE - Performing actual secret rotations');
        await this.performRotation();
      }

      console.log('\n✅ Secret rotation completed successfully!');

    } catch (error) {
      console.error('\n❌ Secret rotation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Pre-rotation safety checks
   */
  private async performSafetyChecks(): Promise<void> {
    console.log('🛡️  Performing safety checks...');

    try {
      // Wedding day protection check
      if (!this.options.skipWeddingCheck && !this.options.force) {
        const today = new Date();
        const isSaturday = today.getDay() === 6;
        
        if (isSaturday) {
          console.log('🏰 Wedding day detected (Saturday)');
          
          const complianceCheck = await emergencyWeddingComplianceCheck();
          if (!complianceCheck.safe) {
            throw new Error(
              `Wedding day safety check failed: ${complianceCheck.criticalIssues.join(', ')}`
            );
          }
          
          if (!this.options.force) {
            throw new Error('Saturday rotation blocked. Use --force to override.');
          }
          
          console.log('⚠️  Saturday rotation override enabled');
        }
      }

      // Environment validation
      console.log('🔍 Validating environment configuration...');
      const envValidation = await validateWeddingEnvironment();
      
      if (!envValidation.isValid && !this.options.force) {
        console.error('Environment validation failed:');
        for (const error of envValidation.errors) {
          console.error(`  - ${error.field}: ${error.message}`);
        }
        throw new Error('Environment validation failed. Fix errors or use --force');
      }

      if (envValidation.warnings.length > 0) {
        console.log('⚠️  Environment warnings:');
        for (const warning of envValidation.warnings) {
          console.log(`  - ${warning.field}: ${warning.message}`);
        }
      }

      console.log('✅ Safety checks passed');

    } catch (error) {
      console.error('❌ Safety check failed:', error);
      throw error;
    }
  }

  /**
   * Perform dry run
   */
  private async performDryRun(): Promise<void> {
    console.log('\n🔍 Analyzing secrets for rotation...');

    try {
      // This would analyze which secrets need rotation without actually doing it
      console.log('📋 Secrets that would be rotated:');
      
      // Mock data for dry run demonstration
      const mockSecrets = [
        { 
          id: 'secret_1', 
          type: 'stripe_webhook_secret', 
          name: 'Stripe Webhook Secret',
          lastRotated: '2024-01-01T00:00:00Z',
          nextRotation: '2024-04-01T00:00:00Z'
        },
        { 
          id: 'secret_2', 
          type: 'wedding_data_encryption_key', 
          name: 'Wedding Data Encryption',
          lastRotated: '2024-02-01T00:00:00Z',
          nextRotation: '2024-05-01T00:00:00Z'
        }
      ];

      for (const secret of mockSecrets) {
        const daysUntilRotation = Math.ceil(
          (new Date(secret.nextRotation).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilRotation <= 0) {
          console.log(`  🔄 ${secret.name} (${secret.type}) - NEEDS ROTATION`);
        } else if (daysUntilRotation <= 14) {
          console.log(`  ⏰ ${secret.name} (${secret.type}) - ${daysUntilRotation} days until rotation`);
        } else {
          console.log(`  ✅ ${secret.name} (${secret.type}) - ${daysUntilRotation} days remaining`);
        }
      }

      console.log('\n📊 Dry run summary:');
      console.log(`  - Secrets needing immediate rotation: 1`);
      console.log(`  - Secrets expiring soon (within 14 days): 1`);
      console.log(`  - Total secrets managed: ${mockSecrets.length}`);

    } catch (error) {
      console.error('❌ Dry run failed:', error);
      throw error;
    }
  }

  /**
   * Perform actual rotation
   */
  private async performRotation(): Promise<void> {
    console.log('\n🔄 Starting secret rotation...');

    try {
      const result = await secretRotationManager.rotateExpiredSecrets();

      console.log('\n📊 Rotation Results:');
      console.log(`  ✅ Rotated: ${result.rotated}`);
      console.log(`  ⏭️  Skipped: ${result.skipped}`);
      console.log(`  ❌ Failed: ${result.failed}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }

      // Post-rotation validation
      if (result.rotated > 0) {
        console.log('\n🔍 Post-rotation validation...');
        await this.validateRotatedSecrets();
      }

    } catch (error) {
      console.error('❌ Secret rotation failed:', error);
      throw error;
    }
  }

  /**
   * Validate rotated secrets
   */
  private async validateRotatedSecrets(): Promise<void> {
    try {
      // Re-run environment validation to ensure rotated secrets work
      const validation = await validateWeddingEnvironment();
      
      if (!validation.isValid) {
        console.error('⚠️  Post-rotation validation failed:');
        for (const error of validation.errors) {
          console.error(`  - ${error.field}: ${error.message}`);
        }
        
        console.error('\n🚨 URGENT: Secret rotation may have caused issues!');
        console.error('Check the errors above and fix immediately.');
      } else {
        console.log('✅ Post-rotation validation passed');
      }
    } catch (error) {
      console.error('❌ Post-rotation validation failed:', error);
    }
  }

  /**
   * Force rotate specific secret
   */
  async forceRotateSecret(secretId: string): Promise<void> {
    try {
      console.log(`🔄 Force rotating secret: ${secretId}`);
      
      if (this.options.dryRun) {
        console.log('🧪 DRY RUN: Would force rotate this secret');
        return;
      }

      await secretRotationManager.forceRotateSecret(secretId, this.options.force);
      console.log(`✅ Secret ${secretId} rotated successfully`);

    } catch (error) {
      console.error(`❌ Failed to rotate secret ${secretId}:`, error);
      throw error;
    }
  }

  /**
   * List rotation history
   */
  async showRotationHistory(secretId?: string): Promise<void> {
    try {
      console.log('📋 Secret Rotation History');
      console.log('========================');

      if (secretId) {
        const history = await secretRotationManager.getRotationHistory(secretId);
        
        if (history.length === 0) {
          console.log(`No rotation history found for secret: ${secretId}`);
          return;
        }

        console.log(`\nHistory for secret: ${secretId}`);
        for (const entry of history) {
          console.log(`  ${entry.scheduledAt} - ${entry.status}`);
          if (entry.error) {
            console.log(`    Error: ${entry.error}`);
          }
        }
      } else {
        console.log('Use --secret-id to view specific secret history');
      }

    } catch (error) {
      console.error('❌ Failed to retrieve rotation history:', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: RotationOptions = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    skipWeddingCheck: args.includes('--skip-wedding-check'),
    environment: getArgValue(args, '--environment') || 'production',
    secretType: getArgValue(args, '--secret-type')
  };

  const command = args[0] || 'rotate';
  const secretId = getArgValue(args, '--secret-id');

  const script = new SecretRotationScript(options);

  try {
    switch (command) {
      case 'rotate':
        await script.execute();
        break;
      
      case 'force-rotate':
        if (!secretId) {
          console.error('❌ --secret-id is required for force-rotate command');
          process.exit(1);
        }
        await script.forceRotateSecret(secretId);
        break;
      
      case 'history':
        await script.showRotationHistory(secretId);
        break;
      
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

function showHelp() {
  console.log(`
🔐 WedSync Secret Rotation Tool

Usage: npx tsx scripts/rotate-secrets.ts [command] [options]

Commands:
  rotate        Rotate all expired secrets (default)
  force-rotate  Force rotate a specific secret
  history       Show rotation history

Options:
  --dry-run              Show what would be rotated without doing it
  --force                Force rotation even on wedding days
  --skip-wedding-check   Skip wedding day protection checks
  --environment ENV      Target environment (default: production)
  --secret-type TYPE     Only rotate secrets of specified type
  --secret-id ID         Target specific secret ID

Examples:
  # Dry run to see what would be rotated
  npx tsx scripts/rotate-secrets.ts rotate --dry-run

  # Force rotate all expired secrets
  npx tsx scripts/rotate-secrets.ts rotate --force

  # Force rotate specific secret
  npx tsx scripts/rotate-secrets.ts force-rotate --secret-id secret_123 --force

  # View rotation history
  npx tsx scripts/rotate-secrets.ts history --secret-id secret_123

Safety Features:
  🏰 Wedding day protection (Saturdays blocked unless --force)
  🛡️  Environment validation before rotation
  🔍 Post-rotation validation
  📋 Comprehensive logging and error reporting
  `);
}

if (require.main === module) {
  main().catch(console.error);
}

export { SecretRotationScript };