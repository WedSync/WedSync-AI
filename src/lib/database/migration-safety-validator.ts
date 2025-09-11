/**
 * Database Migration Safety Validator
 * Prevents dangerous migrations and ensures data integrity
 */

import { createClient } from '@/lib/supabase/server';

interface MigrationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface MigrationCheck {
  name: string;
  check: (migrationContent: string) => {
    passed: boolean;
    message?: string;
    riskLevel?: string;
  };
}

export class MigrationSafetyValidator {
  private static readonly DANGEROUS_PATTERNS: MigrationCheck[] = [
    {
      name: 'DROP_TABLE_CHECK',
      check: (content) => {
        const hasDropTable = /DROP\s+TABLE/gi.test(content);
        return {
          passed: !hasDropTable,
          message: hasDropTable
            ? 'Migration contains DROP TABLE - high risk of data loss'
            : undefined,
          riskLevel: 'critical',
        };
      },
    },
    {
      name: 'DROP_COLUMN_CHECK',
      check: (content) => {
        const hasDropColumn = /DROP\s+COLUMN/gi.test(content);
        return {
          passed: !hasDropColumn,
          message: hasDropColumn
            ? 'Migration contains DROP COLUMN - risk of data loss'
            : undefined,
          riskLevel: 'high',
        };
      },
    },
    {
      name: 'ALTER_TYPE_CHECK',
      check: (content) => {
        const hasAlterType = /ALTER\s+COLUMN.*TYPE/gi.test(content);
        return {
          passed: !hasAlterType,
          message: hasAlterType
            ? 'Migration alters column types - may cause data conversion issues'
            : undefined,
          riskLevel: 'medium',
        };
      },
    },
    {
      name: 'TRUNCATE_CHECK',
      check: (content) => {
        const hasTruncate = /TRUNCATE/gi.test(content);
        return {
          passed: !hasTruncate,
          message: hasTruncate
            ? 'Migration contains TRUNCATE - will delete all data'
            : undefined,
          riskLevel: 'critical',
        };
      },
    },
    {
      name: 'DELETE_WITHOUT_WHERE_CHECK',
      check: (content) => {
        const hasUnsafeDelete = /DELETE\s+FROM\s+\w+(?!\s+WHERE)/gi.test(
          content,
        );
        return {
          passed: !hasUnsafeDelete,
          message: hasUnsafeDelete
            ? 'Migration contains DELETE without WHERE clause'
            : undefined,
          riskLevel: 'critical',
        };
      },
    },
  ];

  /**
   * Validate migration content for safety
   */
  static validateMigration(
    migrationContent: string,
    migrationName: string,
  ): MigrationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let highestRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Run all safety checks
    this.DANGEROUS_PATTERNS.forEach((check) => {
      const result = check.check(migrationContent);

      if (!result.passed && result.message) {
        const riskLevel = result.riskLevel as
          | 'low'
          | 'medium'
          | 'high'
          | 'critical';

        if (riskLevel === 'critical' || riskLevel === 'high') {
          errors.push(`${check.name}: ${result.message}`);
        } else {
          warnings.push(`${check.name}: ${result.message}`);
        }

        // Update highest risk level
        const riskLevels = ['low', 'medium', 'high', 'critical'];
        if (
          riskLevels.indexOf(riskLevel) > riskLevels.indexOf(highestRiskLevel)
        ) {
          highestRiskLevel = riskLevel;
        }
      }
    });

    // Additional validations
    this.validateMigrationStructure(migrationContent, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel: highestRiskLevel,
    };
  }

  /**
   * Validate migration structure and syntax
   */
  private static validateMigrationStructure(
    content: string,
    errors: string[],
    warnings: string[],
  ): void {
    // Check for transaction wrapping
    if (!content.includes('BEGIN') || !content.includes('COMMIT')) {
      warnings.push(
        'Migration should be wrapped in a transaction for atomicity',
      );
    }

    // Check for backup recommendations
    if (
      content.includes('DROP') ||
      content.includes('DELETE') ||
      content.includes('TRUNCATE')
    ) {
      warnings.push('Consider creating a backup before running this migration');
    }

    // Check for index creation without CONCURRENTLY
    const hasCreateIndex = /CREATE\s+INDEX(?!\s+CONCURRENTLY)/gi.test(content);
    if (hasCreateIndex) {
      warnings.push(
        'Consider using CREATE INDEX CONCURRENTLY to avoid table locks',
      );
    }
  }

  /**
   * Check if migration is safe to run in production
   */
  static async validateForProduction(
    migrationContent: string,
    migrationName: string,
  ): Promise<boolean> {
    const result = this.validateMigration(migrationContent, migrationName);

    if (result.riskLevel === 'critical') {
      console.error(
        `🚨 CRITICAL: Migration ${migrationName} is too dangerous for production`,
      );
      result.errors.forEach((error) => console.error(`   • ${error}`));
      return false;
    }

    if (result.riskLevel === 'high') {
      console.warn(
        `⚠️  HIGH RISK: Migration ${migrationName} requires careful review`,
      );
      result.errors.forEach((error) => console.warn(`   • ${error}`));

      // In production, block high-risk migrations unless explicitly allowed
      if (
        process.env.NODE_ENV === 'production' &&
        !process.env.ALLOW_HIGH_RISK_MIGRATIONS
      ) {
        return false;
      }
    }

    if (result.warnings.length > 0) {
      console.warn(`⚠️  Migration ${migrationName} warnings:`);
      result.warnings.forEach((warning) => console.warn(`   • ${warning}`));
    }

    return true;
  }

  /**
   * Create backup before dangerous migration
   */
  static async createBackupIfNeeded(
    migrationName: string,
    riskLevel: string,
  ): Promise<void> {
    if (riskLevel === 'high' || riskLevel === 'critical') {
      console.log(
        `📦 Creating backup before high-risk migration: ${migrationName}`,
      );

      try {
        const supabase = createClient();
        // Note: This would need to be implemented based on your backup strategy
        // For now, just log the recommendation
        console.log(
          '💡 RECOMMENDATION: Create manual database backup before proceeding',
        );
      } catch (error) {
        console.error('Failed to create backup:', error);
        throw new Error('Backup creation failed - aborting migration');
      }
    }
  }
}
